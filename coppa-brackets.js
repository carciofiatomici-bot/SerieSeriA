//
// ====================================================================
// COPPA-BRACKETS.JS - Generazione Tabellone e Gestione Bye
// ====================================================================
//

window.CoppaBrackets = {

    /**
     * Genera il tabellone della coppa con bye per le squadre meglio piazzate
     * @param {Array} teams - Array di squadre iscritte alla coppa [{teamId, teamName, leaguePosition}]
     * @returns {Object} Struttura del tabellone
     */
    generateBracket(teams) {
        const { nextPowerOf2, calculateByes, getRoundName, BYE_RESULT } = window.CoppaConstants;

        const numTeams = teams.length;
        if (numTeams < 2) {
            throw new Error('Servono almeno 2 squadre per generare il tabellone della coppa.');
        }

        const numByes = calculateByes(numTeams);
        const bracketSize = nextPowerOf2(numTeams);

        // Ordina le squadre per posizione in classifica (le migliori prima)
        const sortedTeams = [...teams].sort((a, b) => (a.leaguePosition || 999) - (b.leaguePosition || 999));

        // Le squadre con bye sono le prime N in classifica
        const teamsWithBye = sortedTeams.slice(0, numByes);
        const teamsWithoutBye = sortedTeams.slice(numByes);

        // Mescola le squadre senza bye per il sorteggio
        const shuffledTeams = this.shuffleArray([...teamsWithoutBye]);

        // Genera gli accoppiamenti del primo turno
        const firstRoundMatches = [];
        for (let i = 0; i < shuffledTeams.length; i += 2) {
            if (i + 1 < shuffledTeams.length) {
                firstRoundMatches.push({
                    matchId: this.generateMatchId(),
                    homeTeam: shuffledTeams[i],
                    awayTeam: shuffledTeams[i + 1],
                    leg1Result: null,      // Risultato andata
                    leg2Result: null,      // Risultato ritorno (se applicabile)
                    aggregateHome: 0,
                    aggregateAway: 0,
                    winner: null,
                    isBye: false
                });
            }
        }

        // Determina il nome del primo turno
        const teamsInFirstRound = shuffledTeams.length;
        const firstRoundName = this.determineRoundName(teamsInFirstRound + teamsWithBye.length);

        // Genera la struttura completa del tabellone
        const bracket = {
            totalTeams: numTeams,
            bracketSize: bracketSize,
            numByes: numByes,
            teamsWithBye: teamsWithBye.map(t => ({
                teamId: t.teamId,
                teamName: t.teamName,
                leaguePosition: t.leaguePosition
            })),
            rounds: [],
            generationDate: new Date().toISOString(),
            status: 'in_progress', // in_progress, completed
            winner: null,
            runnerUp: null,
            thirdPlace: null,
            fourthPlace: null
        };

        // Primo turno (con le squadre che giocano)
        if (firstRoundMatches.length > 0) {
            bracket.rounds.push({
                roundNumber: 1,
                roundName: firstRoundName,
                isSingleMatch: window.CoppaConstants.isSingleMatchRound(firstRoundName),
                matches: firstRoundMatches,
                status: 'pending' // pending, in_progress, completed
            });
        }

        // Genera i turni successivi (vuoti, da popolare man mano)
        let remainingTeams = bracketSize / 2;
        let roundNumber = 2;

        console.log(`[CoppaBrackets] Generazione round successivi. bracketSize=${bracketSize}, remainingTeams iniziale=${remainingTeams}`);

        while (remainingTeams >= 2) {
            const roundName = this.determineRoundName(remainingTeams);
            const numMatches = remainingTeams / 2;
            const isSingleMatch = window.CoppaConstants.isSingleMatchRound(roundName);

            console.log(`[CoppaBrackets] Generando round: ${roundName} (${numMatches} match, isSingleMatch=${isSingleMatch})`);

            const emptyMatches = [];
            for (let i = 0; i < numMatches; i++) {
                emptyMatches.push({
                    matchId: this.generateMatchId(),
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
                roundNumber: roundNumber,
                roundName: roundName,
                isSingleMatch: isSingleMatch,
                matches: emptyMatches,
                status: 'pending'
            });

            remainingTeams /= 2;
            roundNumber++;
        }

        console.log(`[CoppaBrackets] Bracket generato con ${bracket.rounds.length} round totali:`);
        bracket.rounds.forEach((r, i) => {
            console.log(`  - Round ${i}: ${r.roundName} (${r.matches.length} match)`);
        });

        // Inserisci le squadre con bye nel secondo turno
        if (numByes > 0 && bracket.rounds.length > 1) {
            this.insertByeTeams(bracket, teamsWithBye);
        }

        return bracket;
    },

    /**
     * Inserisce le squadre con bye nel turno appropriato
     * NOTA: I bye vanno nel slot "awayTeam" perche i vincitori del primo turno
     * vengono promossi nello slot "homeTeam" (per match con indice pari)
     */
    insertByeTeams(bracket, teamsWithBye) {
        // Le squadre con bye entrano nel turno successivo al primo
        const secondRound = bracket.rounds[1];
        if (!secondRound) return;

        // Strategia: i bye vanno nello slot awayTeam dei primi N match
        // I vincitori del primo turno andranno nello slot homeTeam corrispondente
        let byeIndex = 0;
        for (let i = 0; i < secondRound.matches.length && byeIndex < teamsWithBye.length; i++) {
            const match = secondRound.matches[i];
            // Assegna la squadra con bye come "away" per evitare conflitti con promoteWinner
            if (!match.awayTeam) {
                match.awayTeam = teamsWithBye[byeIndex];
                match.awayTeamFromBye = true;
                byeIndex++;
            } else if (!match.homeTeam && byeIndex < teamsWithBye.length) {
                match.homeTeam = teamsWithBye[byeIndex];
                match.homeTeamFromBye = true;
                byeIndex++;
            }
        }

        console.log(`[CoppaBrackets] Inseriti ${byeIndex} bye teams nel round ${secondRound.roundName}`);
    },

    /**
     * Determina il nome del turno in base al numero di squadre
     */
    determineRoundName(teamsInRound) {
        const { ROUND_NAMES } = window.CoppaConstants;

        if (ROUND_NAMES[teamsInRound]) {
            return ROUND_NAMES[teamsInRound];
        }

        // Per numeri non standard
        if (teamsInRound > 64) return 'Turno Preliminare';
        if (teamsInRound > 32) return 'Trentaduesimi di Finale';
        if (teamsInRound > 16) return 'Sedicesimi di Finale';
        if (teamsInRound > 8) return 'Ottavi di Finale';

        return 'Turno Preliminare';
    },

    /**
     * Promuove il vincitore di un match al turno successivo
     * @param {Object} bracket - Struttura del tabellone
     * @param {number} roundIndex - Indice del turno corrente
     * @param {number} matchIndex - Indice del match nel turno
     * @param {Object} winner - Squadra vincitrice
     */
    promoteWinner(bracket, roundIndex, matchIndex, winner) {
        const currentRound = bracket.rounds[roundIndex];
        const nextRoundIndex = roundIndex + 1;

        console.log(`[CoppaBrackets] promoteWinner: round=${currentRound?.roundName}, roundIndex=${roundIndex}, matchIndex=${matchIndex}, rounds.length=${bracket.rounds.length}`);

        // SICUREZZA: Verifica che il bracket abbia una struttura valida
        if (!bracket.rounds || bracket.rounds.length === 0) {
            console.error('[CoppaBrackets] ERRORE: bracket.rounds non valido!');
            return;
        }

        // Verifica se questo e' davvero l'ultimo round (la Finale)
        const isActuallyFinal = currentRound?.roundName === 'Finale';

        if (nextRoundIndex >= bracket.rounds.length) {
            if (isActuallyFinal) {
                // E' la finale, il vincitore e il campione
                console.log(`[CoppaBrackets] Finale completata! Vincitore: ${winner?.teamName}`);
                bracket.winner = winner;
                bracket.status = 'completed';
            } else {
                // ERRORE: Non dovrebbe finire qui se non e' la finale!
                console.error(`[CoppaBrackets] ERRORE: Tentativo di terminare la coppa dal round "${currentRound?.roundName}" (index ${roundIndex}). Rounds disponibili: ${bracket.rounds.length}`);
                console.error('[CoppaBrackets] Questo indica un problema nella generazione del bracket. I round mancanti verranno rigenerati.');

                // RECUPERO: Genera i round mancanti dinamicamente
                this.regenerateMissingRounds(bracket, roundIndex, winner);
            }
            return;
        }

        const nextRound = bracket.rounds[nextRoundIndex];

        // CALCOLO MAPPING: Gestione speciale per round con bye
        // Se il round successivo ha squadre con bye (awayTeamFromBye), i vincitori
        // vanno 1:1 nello slot homeTeam dei match corrispondenti
        const hasByeTeamsInNextRound = nextRound.matches.some(m => m.awayTeamFromBye || m.homeTeamFromBye);

        let nextMatchIndex;
        let targetSlot; // 'home' o 'away'

        if (hasByeTeamsInNextRound && roundIndex === 0) {
            // Primo turno -> Round con bye: mapping 1:1
            // Ogni vincitore va nel match corrispondente, slot home (i bye sono in away)
            nextMatchIndex = matchIndex;
            targetSlot = 'home';
            console.log(`[CoppaBrackets] Mapping 1:1 (bye round): match ${matchIndex} -> match ${nextMatchIndex}, ${targetSlot}`);
        } else {
            // Mapping standard: matchIndex/2, slot basato su pari/dispari
            nextMatchIndex = Math.floor(matchIndex / 2);
            targetSlot = (matchIndex % 2 === 0) ? 'home' : 'away';
            console.log(`[CoppaBrackets] Mapping standard: match ${matchIndex} -> match ${nextMatchIndex}, ${targetSlot}`);
        }

        const nextMatch = nextRound.matches[nextMatchIndex];

        if (!nextMatch) {
            console.error(`[CoppaBrackets] ERRORE: Match ${nextMatchIndex} non trovato nel round ${nextRound?.roundName}`);
            return;
        }

        console.log(`[CoppaBrackets] Promuovo ${winner?.teamName} al round ${nextRound.roundName}, match ${nextMatchIndex} (${targetSlot})`);

        // Assegna il vincitore allo slot appropriato
        if (targetSlot === 'home') {
            nextMatch.homeTeam = winner;
        } else {
            nextMatch.awayTeam = winner;
        }
    },

    /**
     * Rigenera i round mancanti se il bracket e' corrotto
     * @param {Object} bracket - Struttura del tabellone
     * @param {number} currentRoundIndex - Indice del round corrente
     * @param {Object} winner - Vincitore del match corrente da promuovere
     */
    regenerateMissingRounds(bracket, currentRoundIndex, winner) {
        const { ROUND_NAMES } = window.CoppaConstants;

        // Calcola quante squadre rimangono dopo questo round
        const currentRound = bracket.rounds[currentRoundIndex];
        const matchesInCurrentRound = currentRound.matches.filter(m => !m.isBye && m.homeTeam && m.awayTeam).length;
        let teamsRemaining = matchesInCurrentRound; // Numero di vincitori

        console.log(`[CoppaBrackets] Rigenerazione round mancanti. Squadre rimanenti: ${teamsRemaining}`);

        // Genera i round fino alla finale
        while (teamsRemaining >= 2) {
            const roundName = this.determineRoundName(teamsRemaining);
            const numMatches = teamsRemaining / 2;

            const emptyMatches = [];
            for (let i = 0; i < numMatches; i++) {
                emptyMatches.push({
                    matchId: this.generateMatchId(),
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
                isSingleMatch: window.CoppaConstants.isSingleMatchRound(roundName),
                matches: emptyMatches,
                status: 'pending'
            });

            console.log(`[CoppaBrackets] Aggiunto round: ${roundName} con ${numMatches} match`);

            teamsRemaining /= 2;
        }

        // Ora promuovi il vincitore al prossimo round
        const nextRoundIndex = currentRoundIndex + 1;
        if (nextRoundIndex < bracket.rounds.length) {
            const nextRound = bracket.rounds[nextRoundIndex];
            const nextMatch = nextRound.matches[0]; // Primo match del nuovo round
            if (nextMatch) {
                nextMatch.homeTeam = winner;
                console.log(`[CoppaBrackets] Vincitore ${winner?.teamName} assegnato al round ${nextRound.roundName}`);
            }
        }
    },

    /**
     * Calcola il vincitore di un match (considerando andata/ritorno o partita secca)
     * @param {Object} match - Oggetto match
     * @param {boolean} isSingleMatch - Se e partita secca
     * @returns {Object|null} Vincitore o null se pareggio (per rigori)
     */
    determineMatchWinner(match, isSingleMatch) {
        if (isSingleMatch) {
            // Partita secca
            if (!match.leg1Result) return null;

            const [home, away] = match.leg1Result.split('-').map(Number);
            if (home > away) return match.homeTeam;
            if (away > home) return match.awayTeam;
            return null; // Pareggio - servono rigori
        } else {
            // Andata/Ritorno
            if (!match.leg1Result || !match.leg2Result) return null;

            const [home1, away1] = match.leg1Result.split('-').map(Number);
            const [home2, away2] = match.leg2Result.split('-').map(Number);

            // Calcola aggregato (home gioca in casa all'andata, away gioca in casa al ritorno)
            const totalHome = home1 + away2; // Gol fatti da home
            const totalAway = away1 + home2; // Gol fatti da away

            match.aggregateHome = totalHome;
            match.aggregateAway = totalAway;

            if (totalHome > totalAway) return match.homeTeam;
            if (totalAway > totalHome) return match.awayTeam;

            // Pareggio - gol in trasferta
            const awayGoalsHome = away1; // Gol di away in trasferta (andata)
            const awayGoalsAway = away2; // Gol di home in trasferta (ritorno)

            if (awayGoalsHome > awayGoalsAway) return match.awayTeam;
            if (awayGoalsAway > awayGoalsHome) return match.homeTeam;

            return null; // Serve supplementari/rigori
        }
    },

    /**
     * Genera un ID univoco per il match
     */
    generateMatchId() {
        return 'match_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Mescola un array (Fisher-Yates shuffle)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    /**
     * Registra i piazzamenti finali (2, 3, 4 posto)
     */
    recordFinalPlacements(bracket, finalist, semifinalists) {
        // Il perdente della finale e il secondo
        bracket.runnerUp = finalist;

        // I perdenti delle semifinali sono terzo e quarto
        // (non c'e finale 3-4 posto, quindi entrambi sono considerati 3-4)
        if (semifinalists && semifinalists.length >= 2) {
            bracket.thirdPlace = semifinalists[0];
            bracket.fourthPlace = semifinalists[1];
        }
    }
};

console.log("Modulo Coppa-Brackets caricato.");
