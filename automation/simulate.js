/**
 * ====================================================================
 * SIMULATE.JS - Script di Automazione Simulazione Partite
 * ====================================================================
 * Eseguito da GitHub Actions ogni giorno alle 20:30
 * Simula le partite del campionato o della coppa in base alla configurazione
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

// ============ COSTANTI ============

const ROLE_STATS = {
    P: { potenza: 0.6, tecnica: 0.8, velocita: 0.5 },
    D: { potenza: 0.9, tecnica: 0.6, velocita: 0.7 },
    C: { potenza: 0.7, tecnica: 0.9, velocita: 0.8 },
    A: { potenza: 0.8, tecnica: 0.8, velocita: 0.9 }
};

const TYPE_ADVANTAGE = {
    Potenza: 'Velocita',
    Velocita: 'Tecnica',
    Tecnica: 'Potenza'
};

// ============ SIMULAZIONE ============

/**
 * Calcola la forza di un giocatore
 */
function calculatePlayerStrength(player, formModifier = 0) {
    const level = player.level || player.currentLevel || 1;
    const role = player.role || 'C';
    const type = player.type || 'Tecnica';

    const roleMultiplier = ROLE_STATS[role] || ROLE_STATS.C;
    const baseStrength = level * 10;

    // Bonus tipo
    let typeBonus = 0;
    if (type === 'Potenza') typeBonus = baseStrength * roleMultiplier.potenza * 0.1;
    else if (type === 'Tecnica') typeBonus = baseStrength * roleMultiplier.tecnica * 0.1;
    else if (type === 'Velocita') typeBonus = baseStrength * roleMultiplier.velocita * 0.1;

    // Applica modificatore forma
    const formMultiplier = 1 + (formModifier * 0.1);

    return (baseStrength + typeBonus) * formMultiplier;
}

/**
 * Calcola la forza totale di una squadra
 */
function calculateTeamStrength(teamData) {
    const formation = teamData.formation?.titolari || [];
    const players = teamData.players || [];
    const formStatus = teamData.playersFormStatus || {};

    let totalStrength = 0;
    let playerCount = 0;

    for (const playerId of formation) {
        const player = players.find(p => p.id === playerId);
        if (player) {
            const formMod = formStatus[playerId]?.mod || 0;
            totalStrength += calculatePlayerStrength(player, formMod);
            playerCount++;
        }
    }

    // Bonus capitano (icona)
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

/**
 * Simula una partita tra due squadre
 * Ritorna { homeGoals, awayGoals }
 */
function simulateMatch(homeTeam, awayTeam) {
    const homeStrength = calculateTeamStrength(homeTeam);
    const awayStrength = calculateTeamStrength(awayTeam);

    // Bonus casa (+10%)
    const adjustedHomeStrength = homeStrength * 1.1;

    // Calcola probabilita gol
    const totalStrength = adjustedHomeStrength + awayStrength;
    const homeProb = adjustedHomeStrength / totalStrength;
    const awayProb = awayStrength / totalStrength;

    // Genera gol (0-5 per squadra, basato su forza relativa)
    let homeGoals = 0;
    let awayGoals = 0;

    // Simula 10 "azioni" di gioco
    for (let i = 0; i < 10; i++) {
        const roll = Math.random();

        if (roll < homeProb * 0.3) {
            homeGoals++;
        } else if (roll > 1 - awayProb * 0.3) {
            awayGoals++;
        }
    }

    // Limita gol massimi
    homeGoals = Math.min(homeGoals, 5);
    awayGoals = Math.min(awayGoals, 5);

    console.log(`  ${homeTeam.teamName} ${homeGoals} - ${awayGoals} ${awayTeam.teamName}`);
    console.log(`    (Forza: ${adjustedHomeStrength.toFixed(0)} vs ${awayStrength.toFixed(0)})`);

    return { homeGoals, awayGoals };
}

// ============ CAMPIONATO ============

/**
 * Trova la prossima giornata da simulare
 */
async function findNextMatchday(db, appId) {
    const scheduleRef = db.collection(`artifacts/${appId}/public/data/schedule`).doc('championship');
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
        console.log('[Campionato] Nessun calendario trovato');
        return null;
    }

    const schedule = scheduleDoc.data();
    const matchdays = schedule.matchdays || [];

    // Trova la prima giornata non completata
    for (let i = 0; i < matchdays.length; i++) {
        const matchday = matchdays[i];
        const hasUnplayedMatches = matchday.matches?.some(m => !m.played);

        if (hasUnplayedMatches) {
            return { matchdayIndex: i, matchday, schedule };
        }
    }

    console.log('[Campionato] Tutte le giornate sono state giocate');
    return null;
}

/**
 * Simula una giornata di campionato
 */
async function simulateChampionshipMatchday(db, appId) {
    console.log('\n[Campionato] Ricerca prossima giornata...');

    const result = await findNextMatchday(db, appId);
    if (!result) return false;

    const { matchdayIndex, matchday, schedule } = result;
    console.log(`[Campionato] Simulazione Giornata ${matchday.matchdayNumber}`);

    // Carica tutte le squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    const teamsMap = {};
    teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Simula ogni partita della giornata
    for (const match of matchday.matches) {
        if (match.played) continue;

        const homeTeam = teamsMap[match.homeTeamId];
        const awayTeam = teamsMap[match.awayTeamId];

        if (!homeTeam || !awayTeam) {
            console.log(`  Partita saltata: squadra mancante (${match.homeTeamId} vs ${match.awayTeamId})`);
            continue;
        }

        const result = simulateMatch(homeTeam, awayTeam);

        // Aggiorna il match
        match.homeScore = result.homeGoals;
        match.awayScore = result.awayGoals;
        match.played = true;
        match.playedAt = new Date().toISOString();
    }

    if (!DRY_RUN) {
        // Salva il calendario aggiornato
        await db.collection(`artifacts/${appId}/public/data/schedule`).doc('championship').set(schedule);
        console.log('[Campionato] Calendario salvato');

        // Aggiorna la classifica
        await updateLeaderboard(db, appId, schedule);

        // Resetta la forma dei giocatori
        await resetPlayersForm(db, appId, teamsMap);
    }

    return true;
}

/**
 * Aggiorna la classifica del campionato
 */
async function updateLeaderboard(db, appId, schedule) {
    const standings = {};

    // Calcola punti e statistiche da tutte le partite giocate
    for (const matchday of schedule.matchdays || []) {
        for (const match of matchday.matches || []) {
            if (!match.played) continue;

            const homeId = match.homeTeamId;
            const awayId = match.awayTeamId;

            // Inizializza se necessario
            if (!standings[homeId]) {
                standings[homeId] = { teamId: homeId, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
            }
            if (!standings[awayId]) {
                standings[awayId] = { teamId: awayId, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
            }

            // Aggiorna statistiche
            standings[homeId].played++;
            standings[awayId].played++;
            standings[homeId].goalsFor += match.homeScore;
            standings[homeId].goalsAgainst += match.awayScore;
            standings[awayId].goalsFor += match.awayScore;
            standings[awayId].goalsAgainst += match.homeScore;

            // Punti
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

    // Ordina per punti, differenza reti, gol fatti
    const sortedStandings = Object.values(standings).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const diffA = a.goalsFor - a.goalsAgainst;
        const diffB = b.goalsFor - b.goalsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.goalsFor - a.goalsFor;
    });

    // Aggiungi nomi squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    const teamsMap = {};
    teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = doc.data();
    });

    sortedStandings.forEach(team => {
        team.teamName = teamsMap[team.teamId]?.teamName || 'Squadra Sconosciuta';
    });

    // Salva classifica
    await db.collection(`artifacts/${appId}/public/data/leaderboard`).doc('standings').set({
        standings: sortedStandings,
        lastUpdated: new Date().toISOString()
    });

    console.log('[Campionato] Classifica aggiornata');
}

// ============ COPPA ============

/**
 * Trova il prossimo match di coppa da simulare
 */
async function findNextCupMatch(db, appId) {
    const scheduleRef = db.collection(`artifacts/${appId}/public/data/schedule`).doc('coppa_schedule');
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
        console.log('[Coppa] Nessun calendario coppa trovato');
        return null;
    }

    const bracket = scheduleDoc.data();

    if (bracket.status === 'completed') {
        console.log('[Coppa] La coppa e gia completata');
        return null;
    }

    // Trova il prossimo match da giocare
    for (let roundIndex = 0; roundIndex < bracket.rounds.length; roundIndex++) {
        const round = bracket.rounds[roundIndex];

        for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex++) {
            const match = round.matches[matchIndex];

            if (!match.homeTeam || !match.awayTeam) continue;
            if (match.isBye) continue;

            // Per turni andata/ritorno
            if (!round.isSingleMatch) {
                if (!match.leg1Result) {
                    return { bracket, roundIndex, matchIndex, round, match, legType: 'leg1' };
                }
                if (!match.leg2Result && !match.winner) {
                    return { bracket, roundIndex, matchIndex, round, match, legType: 'leg2' };
                }
            } else {
                // Partita secca
                if (!match.leg1Result) {
                    return { bracket, roundIndex, matchIndex, round, match, legType: 'leg1' };
                }
            }
        }
    }

    console.log('[Coppa] Tutte le partite sono state giocate');
    return null;
}

/**
 * Simula i rigori
 */
function simulatePenalties() {
    let home = 0;
    let away = 0;

    // 5 rigori per squadra
    for (let i = 0; i < 5; i++) {
        if (Math.random() > 0.25) home++;
        if (Math.random() > 0.25) away++;
    }

    // Sudden death se pari
    while (home === away) {
        const homeScores = Math.random() > 0.25;
        const awayScores = Math.random() > 0.25;
        if (homeScores) home++;
        if (awayScores) away++;
        if (homeScores !== awayScores) break;
    }

    return { homeGoals: home, awayGoals: away };
}

/**
 * Simula un turno completo di coppa (tutte le partite del round corrente)
 */
async function simulateCupRound(db, appId) {
    console.log('\n[Coppa] Ricerca prossimo match...');

    const result = await findNextCupMatch(db, appId);
    if (!result) return false;

    const { bracket, roundIndex, round, legType } = result;
    console.log(`[Coppa] Simulazione ${round.roundName} - ${legType === 'leg1' ? 'Andata' : legType === 'leg2' ? 'Ritorno' : 'Partita'}`);

    // Carica tutte le squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    const teamsMap = {};
    teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Simula tutte le partite del round per questo leg
    for (const match of round.matches) {
        if (!match.homeTeam || !match.awayTeam) continue;
        if (match.isBye) continue;
        if (match.winner) continue;

        // Verifica se questa leg e gia giocata
        if (legType === 'leg1' && match.leg1Result) continue;
        if (legType === 'leg2' && match.leg2Result) continue;

        const homeTeam = teamsMap[match.homeTeam.teamId];
        const awayTeam = teamsMap[match.awayTeam.teamId];

        if (!homeTeam || !awayTeam) {
            console.log(`  Match saltato: squadra mancante`);
            continue;
        }

        // Per il ritorno, inverti casa/trasferta
        let actualHome = homeTeam;
        let actualAway = awayTeam;
        if (legType === 'leg2') {
            actualHome = awayTeam;
            actualAway = homeTeam;
        }

        const result = simulateMatch(actualHome, actualAway);

        // Salva risultato
        if (legType === 'leg1') {
            match.leg1Result = `${result.homeGoals}-${result.awayGoals}`;
        } else {
            match.leg2Result = `${result.homeGoals}-${result.awayGoals}`;
        }

        // Determina vincitore se necessario
        if (round.isSingleMatch) {
            // Partita secca
            if (result.homeGoals === result.awayGoals) {
                const penalties = simulatePenalties();
                match.penalties = penalties;
                match.winner = penalties.homeGoals > penalties.awayGoals ? match.homeTeam : match.awayTeam;
                console.log(`    Rigori: ${penalties.homeGoals}-${penalties.awayGoals}`);
            } else {
                match.winner = result.homeGoals > result.awayGoals ? match.homeTeam : match.awayTeam;
            }
        } else if (legType === 'leg2') {
            // Calcola aggregato
            const leg1 = match.leg1Result.split('-').map(Number);
            const totalHome = leg1[0] + result.awayGoals;
            const totalAway = leg1[1] + result.homeGoals;

            match.aggregateHome = totalHome;
            match.aggregateAway = totalAway;

            if (totalHome === totalAway) {
                // Gol in trasferta
                const awayGoalsHome = leg1[1];
                const awayGoalsAway = result.awayGoals;

                if (awayGoalsHome === awayGoalsAway) {
                    // Rigori
                    const penalties = simulatePenalties();
                    match.penalties = penalties;
                    match.winner = penalties.homeGoals > penalties.awayGoals ? match.homeTeam : match.awayTeam;
                    console.log(`    Rigori: ${penalties.homeGoals}-${penalties.awayGoals}`);
                } else {
                    match.winner = awayGoalsHome > awayGoalsAway ? match.awayTeam : match.homeTeam;
                }
            } else {
                match.winner = totalHome > totalAway ? match.homeTeam : match.awayTeam;
            }

            console.log(`    Aggregato: ${totalHome}-${totalAway} - Passa: ${match.winner?.teamName}`);
        }

        // Promuovi vincitore se presente
        if (match.winner) {
            promoteWinner(bracket, roundIndex, round.matches.indexOf(match), match.winner);
        }
    }

    // Verifica se il round e completo
    const roundComplete = round.matches.every(m => m.winner || m.isBye || !m.homeTeam || !m.awayTeam);
    if (roundComplete) {
        round.status = 'completed';
    }

    // Verifica se la coppa e completa
    if (bracket.winner) {
        bracket.status = 'completed';
        console.log(`[Coppa] VINCITORE: ${bracket.winner.teamName}`);
    }

    if (!DRY_RUN) {
        // Salva il bracket aggiornato
        await db.collection(`artifacts/${appId}/public/data/schedule`).doc('coppa_schedule').set({
            ...bracket,
            lastUpdated: new Date().toISOString()
        });
        console.log('[Coppa] Bracket salvato');

        // Resetta forma giocatori
        await resetPlayersForm(db, appId, teamsMap);
    }

    return true;
}

/**
 * Promuove il vincitore al round successivo
 */
function promoteWinner(bracket, roundIndex, matchIndex, winner) {
    const nextRoundIndex = roundIndex + 1;

    if (nextRoundIndex >= bracket.rounds.length) {
        // E la finale
        bracket.winner = winner;
        return;
    }

    const nextRound = bracket.rounds[nextRoundIndex];
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];

    if (!nextMatch) return;

    if (matchIndex % 2 === 0) {
        nextMatch.homeTeam = winner;
    } else {
        nextMatch.awayTeam = winner;
    }
}

// ============ UTILITIES ============

/**
 * Resetta la forma dei giocatori dopo le partite
 */
async function resetPlayersForm(db, appId, teamsMap) {
    const batch = db.batch();

    for (const teamId of Object.keys(teamsMap)) {
        const teamRef = db.collection(`artifacts/${appId}/public/data/teams`).doc(teamId);
        batch.update(teamRef, { playersFormStatus: {} });
    }

    await batch.commit();
    console.log('[Sistema] Forma giocatori resettata');
}

// ============ MAIN ============

async function main() {
    console.log('====================================');
    console.log('Serie SeriA - Simulazione Automatica');
    console.log(`Data: ${new Date().toISOString()}`);
    console.log(`Dry Run: ${DRY_RUN}`);
    console.log('====================================\n');

    const appId = process.env.APP_ID;
    if (!appId) {
        throw new Error('APP_ID e richiesto');
    }

    const db = initializeFirebase();

    // Carica configurazione
    const configRef = db.collection(`artifacts/${appId}/public/data/config`).doc('settings');
    const configDoc = await configRef.get();
    const config = configDoc.exists ? configDoc.data() : {};

    console.log('[Config] Configurazione caricata');
    console.log(`  - Simulazione Coppa prima: ${config.simulateCupFirst ? 'Si' : 'No'}`);
    console.log(`  - Coppa terminata: ${config.isCupOver ? 'Si' : 'No'}`);
    console.log(`  - Campionato terminato: ${config.isChampionshipOver ? 'Si' : 'No'}`);

    let simulatedSomething = false;

    // Determina cosa simulare
    if (config.simulateCupFirst && !config.isCupOver) {
        // Prima la coppa
        simulatedSomething = await simulateCupRound(db, appId);

        if (!simulatedSomething && !config.isChampionshipOver) {
            // Se coppa non ha partite, prova campionato
            simulatedSomething = await simulateChampionshipMatchday(db, appId);
        }
    } else if (!config.isChampionshipOver) {
        // Prima il campionato
        simulatedSomething = await simulateChampionshipMatchday(db, appId);

        if (!simulatedSomething && !config.isCupOver) {
            // Se campionato non ha partite, prova coppa
            simulatedSomething = await simulateCupRound(db, appId);
        }
    } else if (!config.isCupOver) {
        // Solo coppa
        simulatedSomething = await simulateCupRound(db, appId);
    }

    if (!simulatedSomething) {
        console.log('\n[Sistema] Nessuna partita da simulare oggi.');
    }

    console.log('\n====================================');
    console.log('Simulazione completata!');
    console.log('====================================');
}

main().catch(error => {
    console.error('ERRORE:', error);
    process.exit(1);
});
