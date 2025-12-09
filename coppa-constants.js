//
// ====================================================================
// COPPA-CONSTANTS.JS - Costanti e Configurazioni CoppaSeriA
// ====================================================================
//

window.CoppaConstants = {

    // Nome della competizione
    COMPETITION_NAME: 'CoppaSeriA',

    // Documento Firestore per il tabellone coppa
    COPPA_SCHEDULE_DOC_ID: 'coppa_schedule',

    // Premi
    REWARDS: {
        WINNER_CSS: 1,           // 1 CSS al vincitore
        PLACES_2_3_4_CS: 100,    // 100 CS ai posti 2, 3, 4
        MATCH_WIN_CS: 25,        // 25 CS per vittoria partita
        GOAL_CS: 1               // 1 CS per gol
    },

    // Risultato bye (vittoria a tavolino)
    BYE_RESULT: {
        GOALS_FOR: 3,
        GOALS_AGAINST: 0,
        RESULT_STRING: '3-0 (Bye)'
    },

    // Nomi dei turni in base al numero di squadre rimaste
    ROUND_NAMES: {
        2: 'Finale',
        4: 'Semifinali',
        8: 'Quarti di Finale',
        16: 'Ottavi di Finale',
        32: 'Sedicesimi di Finale',
        64: 'Trentaduesimi di Finale'
    },

    // Turni con partita secca (quarti in poi)
    SINGLE_MATCH_ROUNDS: ['Quarti di Finale', 'Semifinali', 'Finale'],

    // Turni con andata/ritorno (fino agli ottavi inclusi)
    TWO_LEG_ROUNDS: ['Trentaduesimi di Finale', 'Sedicesimi di Finale', 'Ottavi di Finale', 'Turno Preliminare'],

    /**
     * Determina il nome del turno in base al numero di squadre
     * @param {number} teamsRemaining - Numero di squadre nel turno
     * @param {number} totalTeams - Numero totale di squadre iniziali
     * @returns {string} Nome del turno
     */
    getRoundName(teamsRemaining, totalTeams) {
        if (this.ROUND_NAMES[teamsRemaining]) {
            return this.ROUND_NAMES[teamsRemaining];
        }
        // Per numeri non standard, usa "Turno Preliminare X"
        return `Turno Preliminare`;
    },

    /**
     * Verifica se un turno e a partita secca
     * @param {string} roundName - Nome del turno
     * @returns {boolean}
     */
    isSingleMatchRound(roundName) {
        return this.SINGLE_MATCH_ROUNDS.includes(roundName);
    },

    /**
     * Verifica se un turno e andata/ritorno
     * @param {string} roundName - Nome del turno
     * @returns {boolean}
     */
    isTwoLegRound(roundName) {
        return !this.isSingleMatchRound(roundName);
    },

    /**
     * Calcola la prossima potenza di 2 >= n
     * @param {number} n - Numero di squadre
     * @returns {number}
     */
    nextPowerOf2(n) {
        let power = 1;
        while (power < n) {
            power *= 2;
        }
        return power;
    },

    /**
     * Calcola il numero di bye necessari
     * @param {number} numTeams - Numero di squadre iscritte
     * @returns {number}
     */
    calculateByes(numTeams) {
        const nextPow2 = this.nextPowerOf2(numTeams);
        return nextPow2 - numTeams;
    }
};

console.log("Modulo Coppa-Constants caricato.");
