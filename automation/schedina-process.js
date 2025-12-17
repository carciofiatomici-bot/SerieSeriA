/**
 * ====================================================================
 * SCHEDINA-PROCESS.JS - Script di Automazione Calcolo Risultati Schedina
 * ====================================================================
 * Eseguito da GitHub Actions ogni giorno alle 21:30 (1 ora dopo simulazione)
 * Calcola i risultati delle schedine e assegna i premi
 */

const admin = require('firebase-admin');

// ============ CONFIGURAZIONE ============

const DRY_RUN = process.argv.includes('--dry-run');

// Inizializza Firebase Admin SDK
function initializeFirebase() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson || !projectId) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT e FIREBASE_PROJECT_ID sono richiesti');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
    });

    console.log(`[Firebase] Inizializzato per progetto: ${projectId}`);
    return admin.firestore();
}

// ============ SCHEDINA ============

/**
 * Configurazione default schedina
 */
function getDefaultConfig() {
    return {
        enabled: true,
        baseRewardPerCorrect: 5,
        perfectBonusReward: 50,
        minCorrectToWin: 0,
        closingMinutesBeforeSimulation: 60
    };
}

/**
 * Carica configurazione schedina da Firestore
 */
async function loadSchedinaConfig(db, appId) {
    const configRef = db.collection(`artifacts/${appId}/public/data/config`).doc('schedinaConfig');
    const configDoc = await configRef.get();

    if (configDoc.exists) {
        return { ...getDefaultConfig(), ...configDoc.data() };
    }
    return getDefaultConfig();
}

/**
 * Verifica se la feature schedina e abilitata
 */
async function isSchedinaEnabled(db, appId) {
    const flagsRef = db.collection(`artifacts/${appId}/public/data/config`).doc('featureFlags');
    const flagsDoc = await flagsRef.get();

    if (flagsDoc.exists) {
        const flags = flagsDoc.data().flags || {};
        return flags.schedina?.enabled || false;
    }
    return false;
}

/**
 * Converte un risultato in simbolo 1/X/2
 */
function getResultSymbol(result) {
    if (!result) return null;
    const parts = result.split('-');
    if (parts.length !== 2) return null;

    const home = parseInt(parts[0]);
    const away = parseInt(parts[1]);

    if (home > away) return '1';
    if (home < away) return '2';
    return 'X';
}

/**
 * Trova l'ultima giornata giocata
 */
async function findLastPlayedRound(db, appId) {
    const scheduleRef = db.collection(`artifacts/${appId}/public/data/schedule`).doc('championship');
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
        console.log('[Schedina] Nessun calendario campionato trovato');
        return null;
    }

    const schedule = scheduleDoc.data();
    const matchdays = schedule.matchdays || [];

    // Trova l'ultima giornata con partite giocate
    let lastPlayedRound = null;
    for (let i = matchdays.length - 1; i >= 0; i--) {
        const matchday = matchdays[i];
        const playedMatches = matchday.matches?.filter(m => m.played);
        if (playedMatches && playedMatches.length > 0) {
            lastPlayedRound = {
                roundNumber: matchday.matchdayNumber,
                matches: matchday.matches
            };
            break;
        }
    }

    return lastPlayedRound;
}

/**
 * Calcola i risultati delle schedine per una giornata
 */
async function calculateResults(db, appId, roundNumber, matches, config) {
    console.log(`[Schedina] Calcolo risultati per giornata ${roundNumber}...`);

    // Mappa risultati reali
    const actualResults = {};
    for (const match of matches) {
        if (match.played) {
            const result = `${match.homeScore}-${match.awayScore}`;
            // Usa gli ID delle squadre come chiave
            const key = `${match.homeTeamId}_${match.awayTeamId}`;
            actualResults[key] = {
                result: result,
                symbol: getResultSymbol(result)
            };
        }
    }

    console.log(`[Schedina] Risultati reali mappati: ${Object.keys(actualResults).length} partite`);

    // Carica tutte le squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    const participantsResults = [];

    for (const teamDoc of teamsSnapshot.docs) {
        const teamId = teamDoc.id;

        // Carica schedina della squadra
        const predRef = db.collection(`artifacts/${appId}/public/data/schedine/${teamId}`).doc(`giornata_${roundNumber}`);
        const predDoc = await predRef.get();

        if (!predDoc.exists) continue;

        const predData = predDoc.data();
        if (predData.status === 'calculated') {
            console.log(`  [${teamId}] Gia calcolata, skip`);
            continue;
        }

        // Calcola risultati
        let correctCount = 0;
        const updatedPredictions = predData.predictions.map(pred => {
            const key = `${pred.homeId}_${pred.awayId}`;
            const actual = actualResults[key];

            const isCorrect = actual && pred.prediction === actual.symbol;
            if (isCorrect) correctCount++;

            return {
                ...pred,
                actualResult: actual?.result || null,
                isCorrect
            };
        });

        const isPerfect = correctCount === predData.predictions.length;
        const meetsThreshold = correctCount >= config.minCorrectToWin;
        const baseReward = meetsThreshold ? correctCount * config.baseRewardPerCorrect : 0;
        const bonusReward = (meetsThreshold && isPerfect) ? config.perfectBonusReward : 0;
        const totalReward = baseReward + bonusReward;

        console.log(`  [${predData.teamName}] ${correctCount}/${predData.predictions.length} corretti = ${totalReward} CS${isPerfect ? ' (PERFETTA!)' : ''}`);

        if (!DRY_RUN) {
            // Aggiorna documento
            await predRef.update({
                status: 'calculated',
                predictions: updatedPredictions,
                results: {
                    totalMatches: predData.predictions.length,
                    correctPredictions: correctCount,
                    isPerfect,
                    meetsThreshold,
                    baseReward,
                    bonusReward,
                    totalReward,
                    rewarded: false,
                    rewardedAt: null
                }
            });
        }

        participantsResults.push({
            teamId,
            teamName: predData.teamName,
            correctPredictions: correctCount,
            totalReward,
            isPerfect
        });
    }

    return participantsResults;
}

/**
 * Assegna i premi alle squadre
 */
async function applyRewards(db, appId, roundNumber) {
    console.log(`[Schedina] Assegnazione premi per giornata ${roundNumber}...`);

    // Carica tutte le squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    let rewardedCount = 0;

    for (const teamDoc of teamsSnapshot.docs) {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();

        // Carica schedina della squadra
        const predRef = db.collection(`artifacts/${appId}/public/data/schedine/${teamId}`).doc(`giornata_${roundNumber}`);
        const predDoc = await predRef.get();

        if (!predDoc.exists) continue;

        const predData = predDoc.data();
        if (!predData.results || predData.results.rewarded) continue;
        if (predData.results.totalReward <= 0) continue;

        const reward = predData.results.totalReward;
        const currentBudget = teamData.budget || 0;

        console.log(`  [${teamId}] Assegno ${reward} CS (budget: ${currentBudget} -> ${currentBudget + reward})`);

        if (!DRY_RUN) {
            // Aggiorna budget squadra
            await db.collection(`artifacts/${appId}/public/data/teams`).doc(teamId).update({
                budget: currentBudget + reward
            });

            // Marca come premiato
            await predRef.update({
                'results.rewarded': true,
                'results.rewardedAt': new Date().toISOString()
            });

            // Invia notifica
            const notification = {
                type: 'schedina_reward',
                title: 'Premio Schedina!',
                message: `Hai vinto ${reward} CS con la schedina della giornata ${roundNumber}!`,
                targetTeamId: teamId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
                data: {
                    roundNumber,
                    reward,
                    correctPredictions: predData.results.correctPredictions,
                    totalMatches: predData.results.totalMatches,
                    isPerfect: predData.results.isPerfect
                }
            };
            await db.collection(`artifacts/${appId}/public/data/notifications`).add(notification);
        }

        rewardedCount++;
    }

    return rewardedCount;
}

// ============ MAIN ============

async function main() {
    console.log('====================================');
    console.log('Serie SeriA - Processo Schedina');
    console.log(`Data: ${new Date().toISOString()}`);
    console.log(`Dry Run: ${DRY_RUN}`);
    console.log('====================================\n');

    const appId = process.env.APP_ID;
    if (!appId) {
        throw new Error('APP_ID e richiesto');
    }

    const db = initializeFirebase();

    // Verifica se schedina e abilitata
    const enabled = await isSchedinaEnabled(db, appId);
    if (!enabled) {
        console.log('[Schedina] Feature disabilitata, nessuna azione');
        return;
    }

    // Carica configurazione
    const config = await loadSchedinaConfig(db, appId);
    console.log('[Schedina] Configurazione:');
    console.log(`  - Premio per corretto: ${config.baseRewardPerCorrect} CS`);
    console.log(`  - Bonus perfetta: ${config.perfectBonusReward} CS`);
    console.log(`  - Minimo corretti: ${config.minCorrectToWin}`);

    // Trova ultima giornata giocata
    const lastRound = await findLastPlayedRound(db, appId);
    if (!lastRound) {
        console.log('\n[Schedina] Nessuna giornata giocata trovata');
        return;
    }

    console.log(`\n[Schedina] Ultima giornata giocata: ${lastRound.roundNumber}`);

    // Calcola risultati
    const participants = await calculateResults(db, appId, lastRound.roundNumber, lastRound.matches, config);
    console.log(`\n[Schedina] Partecipanti processati: ${participants.length}`);

    // Assegna premi
    const rewarded = await applyRewards(db, appId, lastRound.roundNumber);
    console.log(`\n[Schedina] Premi assegnati: ${rewarded} squadre`);

    console.log('\n====================================');
    console.log('Processo schedina completato!');
    console.log('====================================');
}

main().catch(error => {
    console.error('ERRORE:', error);
    process.exit(1);
});
