/**
 * ====================================================================
 * PRIVATE-LEAGUES-SIMULATE.JS - Simulazione Automatica Leghe Private
 * ====================================================================
 * Eseguito da GitHub Actions ogni ora per controllare le leghe
 * che hanno superato le 24h dall'ultima simulazione
 */

const admin = require('firebase-admin');

// ============ CONFIGURAZIONE ============

const DRY_RUN = process.argv.includes('--dry-run');
const SIMULATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 ore

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

// ============ COSTANTI SIMULAZIONE ============

const ROLE_STATS = {
    P: { potenza: 0.6, tecnica: 0.8, velocita: 0.5 },
    D: { potenza: 0.9, tecnica: 0.6, velocita: 0.7 },
    C: { potenza: 0.7, tecnica: 0.9, velocita: 0.8 },
    A: { potenza: 0.8, tecnica: 0.8, velocita: 0.9 }
};

// ============ SIMULAZIONE ============

function calculatePlayerStrength(player, formModifier = 0) {
    const level = player.level || player.currentLevel || 1;
    const role = player.role || 'C';
    const type = player.type || 'Tecnica';

    const roleMultiplier = ROLE_STATS[role] || ROLE_STATS.C;
    const baseStrength = level * 10;

    let typeBonus = 0;
    if (type === 'Potenza') typeBonus = baseStrength * roleMultiplier.potenza * 0.1;
    else if (type === 'Tecnica') typeBonus = baseStrength * roleMultiplier.tecnica * 0.1;
    else if (type === 'Velocita') typeBonus = baseStrength * roleMultiplier.velocita * 0.1;

    const formMultiplier = 1 + (formModifier * 0.1);
    return (baseStrength + typeBonus) * formMultiplier;
}

function calculateTeamStrength(teamData) {
    const formation = teamData.formation?.titolari || [];
    const players = teamData.players || [];
    const formStatus = teamData.playersFormStatus || {};

    let totalStrength = 0;

    for (const playerId of formation) {
        const player = players.find(p => p.id === playerId);
        if (player) {
            const formMod = formStatus[playerId]?.mod || 0;
            totalStrength += calculatePlayerStrength(player, formMod);
        }
    }

    // Bonus capitano
    if (teamData.iconaId) {
        const icona = players.find(p => p.id === teamData.iconaId);
        if (icona) {
            totalStrength += calculatePlayerStrength(icona) * 0.5;
        }
    }

    // Bonus modulo
    const moduloBonus = {
        '1-2-2': 1.0,
        '1-1-2-1': 1.02,
        '1-3-1': 1.01,
        '1-1-3': 1.03
    };
    const modulo = teamData.formation?.modulo || '1-2-2';
    totalStrength *= moduloBonus[modulo] || 1.0;

    return totalStrength;
}

function simulateMatch(homeTeam, awayTeam) {
    const homeStrength = calculateTeamStrength(homeTeam);
    const awayStrength = calculateTeamStrength(awayTeam);

    const adjustedHomeStrength = homeStrength * 1.1; // Bonus casa

    const totalStrength = adjustedHomeStrength + awayStrength;
    const homeProb = adjustedHomeStrength / totalStrength;
    const awayProb = awayStrength / totalStrength;

    let homeGoals = 0;
    let awayGoals = 0;

    for (let i = 0; i < 10; i++) {
        const roll = Math.random();
        if (roll < homeProb * 0.3) homeGoals++;
        else if (roll > 1 - awayProb * 0.3) awayGoals++;
    }

    homeGoals = Math.min(homeGoals, 5);
    awayGoals = Math.min(awayGoals, 5);

    return { homeGoals, awayGoals };
}

// ============ LEGHE PRIVATE ============

/**
 * Trova le leghe private che necessitano simulazione
 */
async function findLeaguesNeedingSimulation(db, appId) {
    const leaguesRef = db.collection(`artifacts/${appId}/public/data/privateLeagues`);
    const snapshot = await leaguesRef.where('status', '==', 'active').get();

    const now = Date.now();
    const leaguesToSimulate = [];

    snapshot.forEach(doc => {
        const league = { id: doc.id, ...doc.data() };

        // Verifica se e passato abbastanza tempo
        let referenceTime;
        if (league.lastSimulationTime) {
            referenceTime = new Date(league.lastSimulationTime).getTime();
        } else if (league.startedAt) {
            referenceTime = new Date(league.startedAt).getTime();
        } else {
            return; // Lega non iniziata
        }

        const timeSinceLastSim = now - referenceTime;
        if (timeSinceLastSim >= SIMULATION_COOLDOWN_MS) {
            leaguesToSimulate.push({
                league,
                timeSinceLastSim,
                hoursOverdue: Math.floor((timeSinceLastSim - SIMULATION_COOLDOWN_MS) / (60 * 60 * 1000))
            });
        }
    });

    return leaguesToSimulate;
}

/**
 * Trova la prossima giornata da simulare per una lega
 */
function findNextMatchday(league) {
    const schedule = league.schedule || [];

    for (let i = 0; i < schedule.length; i++) {
        const matchday = schedule[i];
        const hasUnplayedMatches = matchday.matches?.some(m => !m.played);

        if (hasUnplayedMatches) {
            return { matchdayIndex: i, matchday };
        }
    }

    return null;
}

/**
 * Simula una giornata di una lega privata
 */
async function simulateLeagueMatchday(db, appId, league, teamsMap) {
    const nextMatch = findNextMatchday(league);
    if (!nextMatch) {
        console.log(`  [${league.name}] Tutte le giornate giocate`);
        return { simulated: false, completed: true };
    }

    const { matchdayIndex, matchday } = nextMatch;
    console.log(`  [${league.name}] Simulazione Giornata ${matchday.matchdayNumber || matchdayIndex + 1}`);

    // Simula ogni partita
    for (const match of matchday.matches) {
        if (match.played) continue;

        const homeTeam = teamsMap[match.homeTeamId];
        const awayTeam = teamsMap[match.awayTeamId];

        if (!homeTeam || !awayTeam) {
            console.log(`    Partita saltata: squadra mancante`);
            continue;
        }

        const result = simulateMatch(homeTeam, awayTeam);

        match.homeScore = result.homeGoals;
        match.awayScore = result.awayGoals;
        match.played = true;
        match.playedAt = new Date().toISOString();

        console.log(`    ${homeTeam.teamName} ${result.homeGoals} - ${result.awayGoals} ${awayTeam.teamName}`);

        // Invia notifiche
        if (!DRY_RUN) {
            await sendMatchNotifications(db, appId, homeTeam, awayTeam, result.homeGoals, result.awayGoals, `Lega: ${league.name}`);
        }
    }

    // Aggiorna classifica della lega
    updateLeagueStandings(league);

    // Verifica se la lega e completata
    const allMatchesPlayed = league.schedule.every(md =>
        md.matches.every(m => m.played)
    );

    if (allMatchesPlayed) {
        league.status = 'completed';
        league.completedAt = new Date().toISOString();

        // Determina vincitore
        if (league.standings && league.standings.length > 0) {
            league.winner = {
                teamId: league.standings[0].teamId,
                teamName: league.standings[0].teamName
            };
        }

        console.log(`  [${league.name}] COMPLETATA! Vincitore: ${league.winner?.teamName || 'N/A'}`);
    }

    // Aggiorna timestamp ultima simulazione
    league.lastSimulationTime = new Date().toISOString();

    return { simulated: true, completed: allMatchesPlayed };
}

/**
 * Aggiorna la classifica di una lega
 */
function updateLeagueStandings(league) {
    const standings = {};

    // Inizializza standings per tutti i partecipanti
    for (const participant of league.participants || []) {
        standings[participant.teamId] = {
            teamId: participant.teamId,
            teamName: participant.teamName,
            points: 0,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0
        };
    }

    // Calcola statistiche dalle partite giocate
    for (const matchday of league.schedule || []) {
        for (const match of matchday.matches || []) {
            if (!match.played) continue;

            const homeId = match.homeTeamId;
            const awayId = match.awayTeamId;

            if (!standings[homeId] || !standings[awayId]) continue;

            standings[homeId].played++;
            standings[awayId].played++;
            standings[homeId].goalsFor += match.homeScore || 0;
            standings[homeId].goalsAgainst += match.awayScore || 0;
            standings[awayId].goalsFor += match.awayScore || 0;
            standings[awayId].goalsAgainst += match.homeScore || 0;

            if (match.homeScore > match.awayScore) {
                standings[homeId].points += 3;
                standings[homeId].won++;
                standings[awayId].lost++;
            } else if (match.homeScore < match.awayScore) {
                standings[awayId].points += 3;
                standings[awayId].won++;
                standings[homeId].lost++;
            } else {
                standings[homeId].points += 1;
                standings[awayId].points += 1;
                standings[homeId].drawn++;
                standings[awayId].drawn++;
            }
        }
    }

    // Ordina classifica
    league.standings = Object.values(standings).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const diffA = a.goalsFor - a.goalsAgainst;
        const diffB = b.goalsFor - b.goalsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.goalsFor - a.goalsFor;
    });
}

// ============ NOTIFICHE ============

async function sendMatchNotification(db, appId, teamId, teamName, opponentName, myScore, oppScore, matchType) {
    const won = myScore > oppScore;
    const draw = myScore === oppScore;

    const notification = {
        type: 'match_result',
        title: won ? 'Vittoria!' : (draw ? 'Pareggio' : 'Sconfitta'),
        message: `${matchType}: ${teamName} ${myScore} - ${oppScore} ${opponentName}`,
        targetTeamId: teamId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        data: { myScore, oppScore, opponent: opponentName, matchType, won, draw }
    };

    const notifRef = db.collection(`artifacts/${appId}/public/data/notifications`).doc();
    await notifRef.set(notification);
}

async function sendMatchNotifications(db, appId, homeTeam, awayTeam, homeGoals, awayGoals, matchType) {
    await Promise.all([
        sendMatchNotification(db, appId, homeTeam.id, homeTeam.teamName, awayTeam.teamName, homeGoals, awayGoals, matchType),
        sendMatchNotification(db, appId, awayTeam.id, awayTeam.teamName, homeTeam.teamName, awayGoals, homeGoals, matchType)
    ]);
}

// ============ MAIN ============

async function main() {
    console.log('==========================================');
    console.log('Serie SeriA - Simulazione Leghe Private');
    console.log(`Data: ${new Date().toISOString()}`);
    console.log(`Dry Run: ${DRY_RUN}`);
    console.log(`Cooldown: 24 ore`);
    console.log('==========================================\n');

    const appId = process.env.APP_ID;
    if (!appId) {
        throw new Error('APP_ID e richiesto');
    }

    const db = initializeFirebase();

    // Trova leghe che necessitano simulazione
    console.log('[Ricerca] Leghe private attive...');
    const leaguesToSimulate = await findLeaguesNeedingSimulation(db, appId);

    if (leaguesToSimulate.length === 0) {
        console.log('[Risultato] Nessuna lega necessita simulazione.');
        console.log('\n==========================================');
        console.log('Completato - Nessuna azione necessaria');
        console.log('==========================================');
        return;
    }

    console.log(`[Trovate] ${leaguesToSimulate.length} leghe da simulare:\n`);

    // Carica tutte le squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    const teamsMap = {};
    teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    let simulatedCount = 0;
    let completedCount = 0;

    // Simula ogni lega
    for (const { league, hoursOverdue } of leaguesToSimulate) {
        console.log(`\n[Lega] ${league.name} (${league.participants?.length || 0} squadre)`);
        console.log(`       Scaduta da ${hoursOverdue} ore`);

        const result = await simulateLeagueMatchday(db, appId, league, teamsMap);

        if (result.simulated) {
            simulatedCount++;

            if (!DRY_RUN) {
                // Salva la lega aggiornata
                await db.collection(`artifacts/${appId}/public/data/privateLeagues`)
                    .doc(league.id)
                    .set(league);
                console.log(`  [Salvato] Lega aggiornata su Firestore`);
            }
        }

        if (result.completed) {
            completedCount++;

            // Distribuisci premi se necessario
            if (!DRY_RUN && league.entryFee > 0) {
                await distributePrizes(db, appId, league, teamsMap);
            }
        }
    }

    console.log('\n==========================================');
    console.log(`Completato!`);
    console.log(`  - Leghe simulate: ${simulatedCount}`);
    console.log(`  - Leghe completate: ${completedCount}`);
    console.log('==========================================');
}

/**
 * Distribuisce i premi di una lega completata
 */
async function distributePrizes(db, appId, league, teamsMap) {
    if (!league.standings || league.standings.length === 0) return;

    const totalPrize = league.entryFee * league.participants.length;
    const prizeDistribution = [0.5, 0.3, 0.2]; // 50%, 30%, 20%

    console.log(`  [Premi] Distribuzione ${totalPrize} CS...`);

    for (let i = 0; i < Math.min(3, league.standings.length); i++) {
        const team = league.standings[i];
        const prize = Math.floor(totalPrize * prizeDistribution[i]);

        if (prize > 0) {
            const teamRef = db.collection(`artifacts/${appId}/public/data/teams`).doc(team.teamId);
            const teamDoc = await teamRef.get();

            if (teamDoc.exists) {
                const currentBudget = teamDoc.data().budget || 0;
                await teamRef.update({ budget: currentBudget + prize });
                console.log(`    ${i + 1}. ${team.teamName}: +${prize} CS`);
            }
        }
    }
}

main().catch(error => {
    console.error('ERRORE:', error);
    process.exit(1);
});
