/**
 * ====================================================================
 * DRAFT-CHECK.JS - Controllo Automatico Timer Draft
 * ====================================================================
 * Eseguito da GitHub Actions ogni 10 minuti
 * Controlla i timeout del draft e gestisce:
 * - Turni scaduti -> setta "rubabile"
 * - Turni rubabili scaduti -> assegnazione automatica
 */

const admin = require('firebase-admin');

// ============ COSTANTI (stesse di draft-constants.js) ============

const DRAFT_TURN_TIMEOUT_MS = 60 * 60 * 1000;        // 1 ora
const DRAFT_STEAL_TIMEOUT_MS = 10 * 60 * 1000;       // 10 minuti
const DRAFT_MAX_STEAL_STRIKES = 5;
const DRAFT_TOTAL_ROUNDS = 2;
const DRAFT_SKIP_TURN_BONUS_CS = 150;
const DRAFT_NIGHT_PAUSE_START_HOUR = 0;              // 00:00
const DRAFT_NIGHT_PAUSE_END_HOUR = 8;                // 08:00
const CONFIG_DOC_ID = 'settings';

// ============ INIZIALIZZAZIONE ============

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

// ============ UTILITY PAUSA NOTTURNA ============

/**
 * Verifica se siamo in pausa notturna (00:00 - 08:00)
 */
function isNightPauseActive() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= DRAFT_NIGHT_PAUSE_START_HOUR && hour < DRAFT_NIGHT_PAUSE_END_HOUR;
}

/**
 * Calcola i millisecondi di pausa notturna trascorsi
 */
function getNightPauseMs(startTimestamp, endTimestamp = Date.now()) {
    let pauseMs = 0;

    let currentDay = new Date(startTimestamp);
    currentDay.setHours(0, 0, 0, 0);

    const endDatePlusOne = new Date(endTimestamp);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

    while (currentDay <= endDatePlusOne) {
        const pauseStart = new Date(currentDay);
        pauseStart.setHours(DRAFT_NIGHT_PAUSE_START_HOUR, 0, 0, 0);

        const pauseEnd = new Date(currentDay);
        pauseEnd.setHours(DRAFT_NIGHT_PAUSE_END_HOUR, 0, 0, 0);

        const overlapStart = Math.max(startTimestamp, pauseStart.getTime());
        const overlapEnd = Math.min(endTimestamp, pauseEnd.getTime());

        if (overlapEnd > overlapStart) {
            pauseMs += overlapEnd - overlapStart;
        }

        currentDay.setDate(currentDay.getDate() + 1);
    }

    return pauseMs;
}

/**
 * Calcola il tempo effettivo trascorso (escludendo pause notturne)
 */
function getEffectiveElapsedTime(startTimestamp) {
    const totalElapsed = Date.now() - startTimestamp;
    const pauseMs = getNightPauseMs(startTimestamp);
    return Math.max(0, totalElapsed - pauseMs);
}

/**
 * Verifica se siamo nella finestra oraria consentita (9:00 - 22:30)
 */
function isWithinAllowedTimeWindow() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    const startTime = 9 * 60;      // 9:00
    const endTime = 22 * 60 + 30;  // 22:30

    return currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
}

// ============ ASSEGNAZIONE AUTOMATICA ============

/**
 * Assegna un giocatore random dal costo piu basso
 */
async function assignRandomCheapestPlayer(db, appId, teamId) {
    const teamsPath = `artifacts/${appId}/public/data/teams`;
    const draftPlayersPath = `artifacts/${appId}/public/data/draftPlayers`;

    try {
        // Carica dati squadra
        const teamDoc = await db.collection(teamsPath).doc(teamId).get();
        if (!teamDoc.exists) {
            return { success: false, message: 'Squadra non trovata' };
        }

        const teamData = teamDoc.data();
        const currentPlayers = teamData.players || [];
        const budget = teamData.budget || 0;

        // Carica giocatori disponibili
        const playersSnapshot = await db.collection(draftPlayersPath)
            .where('isDrafted', '==', false)
            .get();

        if (playersSnapshot.empty) {
            return { success: false, message: 'Nessun giocatore disponibile' };
        }

        // Calcola costi e filtra per budget
        const players = [];
        playersSnapshot.forEach(doc => {
            const data = doc.data();
            const levelMin = data.levelRange?.[0] || 1;
            // Costo semplificato: livello base
            const cost = data.cost || levelMin;
            players.push({ id: doc.id, ...data, calculatedCost: cost });
        });

        const affordablePlayers = players.filter(p => p.calculatedCost <= budget);

        if (affordablePlayers.length === 0) {
            return {
                success: false,
                insufficientBudget: true,
                message: 'Budget insufficiente'
            };
        }

        // Trova il costo minimo
        let minCost = Infinity;
        affordablePlayers.forEach(p => {
            if (p.calculatedCost < minCost) minCost = p.calculatedCost;
        });

        // Scegli random tra i piu economici
        const cheapestPlayers = affordablePlayers.filter(p => p.calculatedCost === minCost);
        const selected = cheapestPlayers[Math.floor(Math.random() * cheapestPlayers.length)];

        // Determina livello
        const levelMin = selected.levelRange?.[0] || 1;
        const levelMax = selected.levelRange?.[1] || levelMin;
        const finalLevel = Math.floor(Math.random() * (levelMax - levelMin + 1)) + levelMin;
        const finalCost = selected.cost || minCost;

        // Crea giocatore per la rosa
        const newPlayer = {
            id: selected.id,
            name: selected.name,
            role: selected.role,
            age: selected.age,
            type: selected.type,
            level: finalLevel,
            abilities: selected.abilities || [],
            nationality: selected.nationality || 'IT',
            draftedAt: new Date().toISOString(),
            autoAssigned: true
        };

        // Aggiorna squadra
        await db.collection(teamsPath).doc(teamId).update({
            players: [...currentPlayers, newPlayer],
            budget: Math.max(0, budget - finalCost)
        });

        // Marca giocatore come draftato
        await db.collection(draftPlayersPath).doc(selected.id).update({
            isDrafted: true,
            draftedBy: teamId,
            draftedAt: new Date().toISOString()
        });

        return {
            success: true,
            playerName: selected.name,
            playerId: selected.id,
            cost: finalCost
        };

    } catch (error) {
        console.error('[AssignRandom] Errore:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Invia notifica a una squadra
 */
async function sendNotification(db, appId, teamId, title, message, type = 'draft_turn') {
    const notifPath = `artifacts/${appId}/public/data/notifications`;

    await db.collection(notifPath).add({
        type: type,
        title: title,
        message: message,
        targetTeamId: teamId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false
    });

    console.log(`  [Notifica] ${teamId}: ${title}`);
}

// ============ CONTROLLO TIMEOUT ============

/**
 * Gestisce l'assegnazione automatica o lo skip del turno
 */
async function handleAutoAssignOrSkip(db, appId, draftTurns, currentOrder, currentIndex, orderKey) {
    const teamsPath = `artifacts/${appId}/public/data/teams`;
    const configPath = `artifacts/${appId}/public/data/config`;
    const configRef = db.collection(configPath).doc(CONFIG_DOC_ID);

    const currentTeam = currentOrder[currentIndex];
    const teamId = currentTeam.teamId;
    const teamName = currentTeam.teamName;
    const currentRound = draftTurns.currentRound;

    console.log(`[AutoAssign] Gestione automatica per ${teamName}`);

    // Prova ad assegnare giocatore
    const assignResult = await assignRandomCheapestPlayer(db, appId, teamId);

    if (assignResult.success) {
        console.log(`  [OK] ${assignResult.playerName} assegnato a ${teamName}`);
        await sendNotification(db, appId, teamId,
            'Giocatore Assegnato Automaticamente',
            `Ti e stato assegnato ${assignResult.playerName} perche il tempo e scaduto.`
        );
        currentTeam.hasDrafted = true;
        currentTeam.autoAssigned = true;
    } else if (assignResult.insufficientBudget) {
        console.log(`  [SKIP] ${teamName} - budget insufficiente`);

        // Assegna bonus CS
        const teamDoc = await db.collection(teamsPath).doc(teamId).get();
        if (teamDoc.exists) {
            const newBudget = (teamDoc.data().budget || 0) + DRAFT_SKIP_TURN_BONUS_CS;
            await db.collection(teamsPath).doc(teamId).update({ budget: newBudget });
        }

        await sendNotification(db, appId, teamId,
            'Turno Saltato - Budget Insufficiente',
            `Non hai budget per nessun giocatore. Hai ricevuto ${DRAFT_SKIP_TURN_BONUS_CS} CS.`
        );
        currentTeam.hasDrafted = true;
        currentTeam.skippedTurn = true;
    } else {
        console.log(`  [ERRORE] ${teamName} - ${assignResult.message}`);
        currentTeam.hasDrafted = true;
        currentTeam.skippedTurn = true;
    }

    // Trova prossimo team
    let nextIndex = currentIndex + 1;
    while (nextIndex < currentOrder.length && currentOrder[nextIndex].hasDrafted) {
        nextIndex++;
    }

    // Controlla se round finito
    if (nextIndex >= currentOrder.length || currentOrder.every(t => t.hasDrafted)) {
        if (currentRound < DRAFT_TOTAL_ROUNDS) {
            // Passa al round successivo
            const nextRound = currentRound + 1;
            const nextOrderKey = nextRound === 1 ? 'round1Order' : 'round2Order';
            const nextOrder = draftTurns[nextOrderKey].map(t => ({
                ...t,
                hasDrafted: false,
                timeoutStrikes: 0,
                stealStrikes: 0
            }));

            await configRef.set({
                draftTurns: {
                    ...draftTurns,
                    [orderKey]: currentOrder,
                    [nextOrderKey]: nextOrder,
                    currentRound: nextRound,
                    currentTurnIndex: 0,
                    currentTeamId: nextOrder[0].teamId,
                    turnStartTime: Date.now(),
                    turnExpired: false,
                    isStolenTurn: false
                }
            }, { merge: true });

            console.log(`[Round] Round ${currentRound} completato. Inizia Round ${nextRound}`);
            await sendNotification(db, appId, nextOrder[0].teamId,
                'E il tuo turno nel Draft!',
                'Tocca a te scegliere un giocatore. Hai 1 ora di tempo.'
            );
        } else {
            // Draft completato
            await configRef.set({
                isDraftOpen: false,
                draftTurns: {
                    ...draftTurns,
                    [orderKey]: currentOrder,
                    isActive: false,
                    completedAt: new Date().toISOString()
                }
            }, { merge: true });

            console.log('[Draft] Draft completato!');
        }
    } else {
        // Passa al prossimo team
        const nextTeam = currentOrder[nextIndex];

        await configRef.set({
            draftTurns: {
                ...draftTurns,
                [orderKey]: currentOrder,
                currentTurnIndex: nextIndex,
                currentTeamId: nextTeam.teamId,
                turnStartTime: Date.now(),
                turnExpired: false,
                isStolenTurn: false
            }
        }, { merge: true });

        console.log(`[Turno] Passato a: ${nextTeam.teamName}`);
        await sendNotification(db, appId, nextTeam.teamId,
            'E il tuo turno nel Draft!',
            'Tocca a te scegliere un giocatore. Hai 1 ora di tempo.'
        );
    }
}

/**
 * Controlla e gestisce i timeout del draft
 */
async function checkDraftTimeout(db, appId) {
    const configPath = `artifacts/${appId}/public/data/config`;
    const configRef = db.collection(configPath).doc(CONFIG_DOC_ID);

    console.log('\n[Draft Check] Controllo timeout draft...');

    // Carica configurazione
    const configDoc = await configRef.get();
    if (!configDoc.exists) {
        console.log('[Draft Check] Nessuna configurazione trovata');
        return false;
    }

    const config = configDoc.data();
    const draftTurns = config.draftTurns;

    // Verifica se draft attivo
    if (!draftTurns || !draftTurns.isActive) {
        console.log('[Draft Check] Draft non attivo');
        return false;
    }

    // Verifica se in pausa
    if (draftTurns.isPaused) {
        console.log('[Draft Check] Draft in pausa');
        return false;
    }

    // Verifica pausa notturna
    if (isNightPauseActive()) {
        console.log('[Draft Check] Pausa notturna attiva (00:00-08:00)');
        return false;
    }

    // Converti turnStartTime
    let turnStartTime = draftTurns.turnStartTime;
    if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
        turnStartTime = turnStartTime.toMillis();
    }

    const currentRound = draftTurns.currentRound;
    const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
    const currentOrder = draftTurns[orderKey].map(t => ({ ...t }));
    const currentIndex = draftTurns.currentTurnIndex;
    const currentTeam = currentOrder[currentIndex];

    if (!currentTeam) {
        console.log('[Draft Check] Team corrente non trovato');
        return false;
    }

    // Verifica se ha gia draftato
    if (currentTeam.hasDrafted) {
        console.log(`[Draft Check] ${currentTeam.teamName} ha gia draftato`);
        return false;
    }

    // Calcola tempo effettivo trascorso
    const effectiveElapsed = getEffectiveElapsedTime(turnStartTime);
    const isStolenTurn = draftTurns.isStolenTurn || false;
    const currentTimeout = isStolenTurn ? DRAFT_STEAL_TIMEOUT_MS : DRAFT_TURN_TIMEOUT_MS;
    const timeRemaining = currentTimeout - effectiveElapsed;

    console.log(`[Draft Check] Turno di ${currentTeam.teamName}`);
    console.log(`  Tempo trascorso: ${Math.floor(effectiveElapsed / 60000)} min`);
    console.log(`  Tempo rimanente: ${Math.floor(timeRemaining / 60000)} min`);
    console.log(`  Turno rubato: ${isStolenTurn}`);
    console.log(`  Turno scaduto flag: ${draftTurns.turnExpired || false}`);

    // Controlla timeout
    if (effectiveElapsed >= currentTimeout) {
        // Se turno rubato scade, torna rubabile
        if (isStolenTurn) {
            console.log(`[TIMEOUT FURTO] Il ladro ${currentTeam.teamName} non ha draftato!`);
            await configRef.update({
                'draftTurns.isStolenTurn': false,
                'draftTurns.turnExpired': true,
                'draftTurns.turnStartTime': Date.now(),
                'draftTurns.turnExpiredAt': Date.now()
            });
            return true;
        }

        // Timer principale scaduto
        if (!draftTurns.turnExpired) {
            console.log(`[TIMEOUT] Tempo scaduto per ${currentTeam.teamName}! Turno rubabile.`);

            // Controlla se e l'ultimo
            const remainingPlayers = currentOrder.filter(t => !t.hasDrafted);
            if (remainingPlayers.length === 1) {
                if (isWithinAllowedTimeWindow()) {
                    await handleAutoAssignOrSkip(db, appId, draftTurns, currentOrder, currentIndex, orderKey);
                } else {
                    console.log('[NOTTE] Fuori finestra oraria, assegnazione sospesa');
                }
                return true;
            }

            // Setta turno rubabile
            await configRef.update({
                'draftTurns.turnExpired': true,
                'draftTurns.turnExpiredAt': Date.now()
            });

            // Notifica altri che possono rubare
            for (const team of currentOrder) {
                if (team.teamId !== currentTeam.teamId && !team.hasDrafted) {
                    await sendNotification(db, appId, team.teamId,
                        'Puoi Rubare il Turno!',
                        `${currentTeam.teamName} non ha scelto in tempo. Ruba il suo turno!`,
                        'draft_steal'
                    );
                }
            }

            return true;
        } else {
            // Turno gia scaduto - controlla timer secondario (1 ora per rubare)
            let turnExpiredAt = draftTurns.turnExpiredAt;
            if (turnExpiredAt && typeof turnExpiredAt.toMillis === 'function') {
                turnExpiredAt = turnExpiredAt.toMillis();
            }

            if (turnExpiredAt) {
                const elapsedSinceExpired = Date.now() - turnExpiredAt;

                if (elapsedSinceExpired >= DRAFT_TURN_TIMEOUT_MS) {
                    console.log(`[TIMEOUT FURTO] Nessuno ha rubato il turno di ${currentTeam.teamName}`);

                    if (isWithinAllowedTimeWindow()) {
                        await handleAutoAssignOrSkip(db, appId, draftTurns, currentOrder, currentIndex, orderKey);
                    } else {
                        console.log('[NOTTE] Fuori finestra oraria (9:00-22:30), assegnazione sospesa');
                    }
                    return true;
                }
            }
        }
    }

    console.log('[Draft Check] Nessuna azione necessaria');
    return false;
}

// ============ MAIN ============

async function main() {
    console.log('====================================');
    console.log('Serie SeriA - Draft Check');
    console.log(`Data: ${new Date().toISOString()}`);
    console.log('====================================');

    const appId = process.env.APP_ID;
    if (!appId) {
        throw new Error('APP_ID e richiesto');
    }

    const db = initializeFirebase();

    const actionTaken = await checkDraftTimeout(db, appId);

    console.log('\n====================================');
    console.log(`Draft Check completato! Azione: ${actionTaken ? 'SI' : 'NO'}`);
    console.log('====================================');
}

main().catch(error => {
    console.error('ERRORE:', error);
    process.exit(1);
});
