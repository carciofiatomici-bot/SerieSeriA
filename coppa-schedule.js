//
// ====================================================================
// COPPA-SCHEDULE.JS - Gestione Calendario e Salvataggio Coppa
// ====================================================================
//

window.CoppaSchedule = {

    /**
     * Genera e salva il calendario della coppa
     * @param {Array} teams - Squadre iscritte alla coppa con posizione classifica
     * @returns {Object} Tabellone generato
     */
    async generateAndSaveCupSchedule(teams) {
        const { appId, doc, setDoc, getDoc } = window.firestoreTools;
        const db = window.db;
        const { COPPA_SCHEDULE_DOC_ID } = window.CoppaConstants;

        if (teams.length < 2) {
            throw new Error('Servono almeno 2 squadre per generare il calendario della coppa.');
        }

        // Genera il tabellone
        const bracket = window.CoppaBrackets.generateBracket(teams);

        // Salva su Firestore
        const scheduleDocRef = doc(db, `artifacts/${appId}/public/data/schedule`, COPPA_SCHEDULE_DOC_ID);

        await setDoc(scheduleDocRef, {
            ...bracket,
            lastUpdated: new Date().toISOString()
        });

        console.log(`Calendario CoppaSeriA generato con ${teams.length} squadre.`);

        return bracket;
    },

    /**
     * Carica il calendario della coppa da Firestore
     * @returns {Object|null} Tabellone o null se non esiste
     */
    async loadCupSchedule() {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const { COPPA_SCHEDULE_DOC_ID } = window.CoppaConstants;

        const scheduleDocRef = doc(db, `artifacts/${appId}/public/data/schedule`, COPPA_SCHEDULE_DOC_ID);
        const scheduleDoc = await getDoc(scheduleDocRef);

        if (!scheduleDoc.exists()) {
            return null;
        }

        const bracket = scheduleDoc.data();

        // VALIDAZIONE: Verifica integrita' del bracket
        if (bracket && bracket.rounds) {
            console.log(`[CoppaSchedule] Bracket caricato con ${bracket.rounds.length} round(s)`);
            bracket.rounds.forEach((round, idx) => {
                console.log(`  - Round ${idx}: ${round.roundName} (${round.matches?.length || 0} match, isSingleMatch=${round.isSingleMatch})`);
            });

            // Verifica se il bracket ha abbastanza round
            const hasFinale = bracket.rounds.some(r => r.roundName === 'Finale');
            if (!hasFinale && bracket.status !== 'completed') {
                console.warn('[CoppaSchedule] ATTENZIONE: Il bracket non contiene la Finale! Tentativo di riparazione...');

                // Tenta di riparare il bracket generando i round mancanti
                const repaired = await this.repairBracketIfNeeded(bracket);
                if (repaired) {
                    console.log('[CoppaSchedule] Bracket riparato con successo.');
                    return bracket;
                }
            }
        }

        return bracket;
    },

    /**
     * Ripara un bracket corrotto aggiungendo i round mancanti
     * @param {Object} bracket - Il bracket da riparare
     * @returns {boolean} True se riparato con successo
     */
    async repairBracketIfNeeded(bracket) {
        if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
            return false;
        }

        // Calcola quanti round dovrebbero esserci
        const firstRound = bracket.rounds[0];
        const matchesInFirstRound = firstRound.matches?.filter(m => !m.isBye && m.homeTeam && m.awayTeam).length || 0;

        if (matchesInFirstRound === 0) {
            console.warn('[CoppaSchedule] Primo round senza match validi, impossibile riparare.');
            return false;
        }

        // Calcola il numero totale di squadre
        let totalTeams = matchesInFirstRound * 2; // Squadre nel primo round
        if (bracket.teamsWithBye && bracket.teamsWithBye.length > 0) {
            totalTeams += bracket.teamsWithBye.length;
        }

        console.log(`[CoppaSchedule] Riparazione: ${totalTeams} squadre totali, ${bracket.rounds.length} round attuali`);

        // Calcola quanti round servono
        let expectedRounds = 0;
        let teams = totalTeams;
        while (teams >= 2) {
            expectedRounds++;
            teams = Math.ceil(teams / 2);
        }

        console.log(`[CoppaSchedule] Round attesi: ${expectedRounds}, round attuali: ${bracket.rounds.length}`);

        if (bracket.rounds.length >= expectedRounds) {
            console.log('[CoppaSchedule] Il bracket ha gia abbastanza round.');
            return true;
        }

        // Genera i round mancanti
        const { ROUND_NAMES } = window.CoppaConstants;
        let remainingTeams = Math.pow(2, expectedRounds - bracket.rounds.length);

        while (remainingTeams >= 2 && !bracket.rounds.some(r => r.roundName === 'Finale')) {
            const roundName = window.CoppaBrackets.determineRoundName(remainingTeams);
            const numMatches = remainingTeams / 2;
            const isSingleMatch = window.CoppaConstants.isSingleMatchRound(roundName);

            console.log(`[CoppaSchedule] Aggiungendo round mancante: ${roundName} (${numMatches} match)`);

            const emptyMatches = [];
            for (let i = 0; i < numMatches; i++) {
                emptyMatches.push({
                    matchId: window.CoppaBrackets.generateMatchId(),
                    homeTeam: null,
                    awayTeam: null,
                    leg1Result: null,
                    leg2Result: null,
                    aggregateHome: 0,
                    aggregateAway: 0,
                    winner: null,
                    isBye: false
                });
            }

            bracket.rounds.push({
                roundNumber: bracket.rounds.length + 1,
                roundName: roundName,
                isSingleMatch: isSingleMatch,
                matches: emptyMatches,
                status: 'pending'
            });

            remainingTeams /= 2;
        }

        // Salva il bracket riparato
        await this.updateCupSchedule(bracket);
        console.log(`[CoppaSchedule] Bracket salvato con ${bracket.rounds.length} round.`);

        return true;
    },

    /**
     * Aggiorna il tabellone su Firestore
     * @param {Object} bracket - Tabellone aggiornato
     */
    async updateCupSchedule(bracket) {
        const { appId, doc, setDoc } = window.firestoreTools;
        const db = window.db;
        const { COPPA_SCHEDULE_DOC_ID } = window.CoppaConstants;

        const scheduleDocRef = doc(db, `artifacts/${appId}/public/data/schedule`, COPPA_SCHEDULE_DOC_ID);

        await setDoc(scheduleDocRef, {
            ...bracket,
            lastUpdated: new Date().toISOString()
        });
    },

    /**
     * Elimina il calendario della coppa
     */
    async deleteCupSchedule() {
        const { appId, doc, deleteDoc } = window.firestoreTools;
        const db = window.db;
        const { COPPA_SCHEDULE_DOC_ID } = window.CoppaConstants;

        const scheduleDocRef = doc(db, `artifacts/${appId}/public/data/schedule`, COPPA_SCHEDULE_DOC_ID);
        await deleteDoc(scheduleDocRef);
    },

    /**
     * Ottiene le squadre iscritte alla coppa con la loro posizione in classifica
     * @returns {Array} Squadre ordinate per posizione
     */
    async getCupParticipants() {
        const { appId, collection, query, where, getDocs, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        // Carica tutte le squadre iscritte alla coppa
        const teamsRef = collection(db, `artifacts/${appId}/public/data/teams`);
        const cupQuery = query(teamsRef, where('isCupParticipating', '==', true));
        const teamsSnapshot = await getDocs(cupQuery);

        if (teamsSnapshot.empty) {
            return [];
        }

        // Carica la classifica del campionato (usando LeaderboardListener)
        const leaderboardData = await window.LeaderboardListener.getLeaderboard();
        const standings = leaderboardData?.standings || [];

        // Mappa posizioni classifica
        const positionMap = {};
        standings.forEach((team, index) => {
            positionMap[team.teamId] = index + 1;
        });

        // Costruisci array squadre con posizione
        const participants = [];
        teamsSnapshot.forEach(docSnap => {
            const teamData = docSnap.data();
            participants.push({
                teamId: docSnap.id,
                teamName: teamData.teamName,
                leaguePosition: positionMap[docSnap.id] || 999 // 999 se non in classifica
            });
        });

        // Ordina per posizione in classifica
        participants.sort((a, b) => a.leaguePosition - b.leaguePosition);

        return participants;
    },

    /**
     * Trova il prossimo match da giocare nella coppa
     * @param {Object} bracket - Tabellone
     * @returns {Object|null} {roundIndex, matchIndex, match, round}
     */
    findNextMatch(bracket) {
        if (!bracket || !bracket.rounds) return null;

        for (let roundIndex = 0; roundIndex < bracket.rounds.length; roundIndex++) {
            const round = bracket.rounds[roundIndex];

            for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex++) {
                const match = round.matches[matchIndex];

                // Salta se non ci sono entrambe le squadre
                if (!match.homeTeam || !match.awayTeam) continue;

                // Salta se e un bye
                if (match.isBye) continue;

                // Per turni andata/ritorno
                if (!round.isSingleMatch) {
                    if (!match.leg1Result) {
                        return { roundIndex, matchIndex, match, round, legType: 'leg1' };
                    }
                    if (!match.leg2Result && !match.winner) {
                        return { roundIndex, matchIndex, match, round, legType: 'leg2' };
                    }
                } else {
                    // Partita secca
                    if (!match.leg1Result) {
                        return { roundIndex, matchIndex, match, round, legType: 'leg1' };
                    }
                }
            }
        }

        return null; // Tutte le partite giocate
    },

    /**
     * Trova tutte le partite di un turno specifico
     * @param {Object} bracket - Tabellone
     * @param {number} roundIndex - Indice del turno
     * @returns {Array} Matches del turno
     */
    getMatchesForRound(bracket, roundIndex) {
        if (!bracket || !bracket.rounds || roundIndex >= bracket.rounds.length) {
            return [];
        }

        return bracket.rounds[roundIndex].matches.filter(m => m.homeTeam && m.awayTeam && !m.isBye);
    },

    /**
     * Verifica se un turno e completato
     * @param {Object} round - Oggetto turno
     * @returns {boolean}
     */
    isRoundCompleted(round) {
        if (!round || !round.matches) return false;

        return round.matches.every(match => {
            // Bye sono gia "completati"
            if (match.isBye) return true;

            // Se manca una squadra (TBD), il turno NON e completato
            if (!match.homeTeam || !match.awayTeam) return false;

            // Verifica se il match ha un vincitore
            return match.winner !== null;
        });
    },

    /**
     * Verifica se la coppa e completata
     * @param {Object} bracket - Tabellone
     * @returns {boolean}
     */
    isCupCompleted(bracket) {
        return bracket && bracket.status === 'completed' && bracket.winner !== null;
    },

    /**
     * Ottiene le partite di una squadra specifica
     * @param {Object} bracket - Tabellone
     * @param {string} teamId - ID della squadra
     * @returns {Array} Matches della squadra
     */
    getTeamMatches(bracket, teamId) {
        if (!bracket || !bracket.rounds) return [];

        const matches = [];

        bracket.rounds.forEach((round, roundIndex) => {
            round.matches.forEach((match, matchIndex) => {
                const isHome = match.homeTeam && match.homeTeam.teamId === teamId;
                const isAway = match.awayTeam && match.awayTeam.teamId === teamId;

                if (isHome || isAway) {
                    matches.push({
                        ...match,
                        roundIndex,
                        matchIndex,
                        roundName: round.roundName,
                        isSingleMatch: round.isSingleMatch,
                        isHome
                    });
                }
            });
        });

        return matches;
    },

    /**
     * Verifica se una squadra ha un bye
     * @param {Object} bracket - Tabellone
     * @param {string} teamId - ID della squadra
     * @returns {boolean}
     */
    teamHasBye(bracket, teamId) {
        if (!bracket || !bracket.teamsWithBye) return false;

        return bracket.teamsWithBye.some(t => t.teamId === teamId);
    }
};

console.log("Modulo Coppa-Schedule caricato.");
