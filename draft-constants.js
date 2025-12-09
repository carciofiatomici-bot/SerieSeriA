//
// ====================================================================
// DRAFT-CONSTANTS.JS - Costanti e Configurazioni Draft
// ====================================================================
//

window.DraftConstants = {

    // ID documento configurazione
    CONFIG_DOC_ID: 'settings',

    // Massimo giocatori rosa (esclusa Icona)
    MAX_ROSA_PLAYERS: window.InterfacciaConstants?.MAX_ROSA_PLAYERS || 12,

    // Tipologie disponibili
    TYPES: ['Potenza', 'Tecnica', 'Velocita'],

    // Ruoli disponibili
    ROLES: ['P', 'D', 'C', 'A'],

    // ====================================================================
    // SISTEMA DRAFT A TURNI
    // ====================================================================

    // Tempo massimo per draftare (1 ora in millisecondi)
    DRAFT_TURN_TIMEOUT_MS: 60 * 60 * 1000,

    // Numero massimo di tentativi per utente (5 ore totali)
    DRAFT_MAX_ATTEMPTS: 5,

    // Numero di turni totali del draft
    DRAFT_TOTAL_ROUNDS: 2,

    /**
     * Genera i path delle collezioni Firestore
     * @param {string} appId - L'ID dell'applicazione
     * @returns {Object} - Oggetto con i path delle collezioni
     */
    getPaths(appId) {
        return {
            DRAFT_PLAYERS_COLLECTION_PATH: `artifacts/${appId}/public/data/draftPlayers`,
            CHAMPIONSHIP_CONFIG_PATH: `artifacts/${appId}/public/data/config`,
            TEAMS_COLLECTION_PATH: `artifacts/${appId}/public/data/teams`,
            LEADERBOARD_COLLECTION_PATH: `artifacts/${appId}/public/data/leaderboard`
        };
    }
};

console.log("Modulo Draft-Constants caricato.");
