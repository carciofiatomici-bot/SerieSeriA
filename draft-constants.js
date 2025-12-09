//
// ====================================================================
// DRAFT-CONSTANTS.JS - Costanti e Configurazioni Draft
// ====================================================================
//

window.DraftConstants = {

    // ID documento configurazione
    CONFIG_DOC_ID: 'settings',

    // Costante cooldown: 15 minuti in millisecondi
    ACQUISITION_COOLDOWN_MS: window.InterfacciaConstants?.ACQUISITION_COOLDOWN_MS || (15 * 60 * 1000),

    // Chiave per il timestamp cooldown draft
    DRAFT_COOLDOWN_KEY: window.InterfacciaConstants?.COOLDOWN_DRAFT_KEY || 'lastDraftAcquisitionTimestamp',

    // Massimo giocatori rosa (esclusa Icona)
    MAX_ROSA_PLAYERS: window.InterfacciaConstants?.MAX_ROSA_PLAYERS || 12,

    // Tipologie disponibili
    TYPES: ['Potenza', 'Tecnica', 'Velocita'],

    // Ruoli disponibili
    ROLES: ['P', 'D', 'C', 'A'],

    /**
     * Genera i path delle collezioni Firestore
     * @param {string} appId - L'ID dell'applicazione
     * @returns {Object} - Oggetto con i path delle collezioni
     */
    getPaths(appId) {
        return {
            DRAFT_PLAYERS_COLLECTION_PATH: `artifacts/${appId}/public/data/draftPlayers`,
            CHAMPIONSHIP_CONFIG_PATH: `artifacts/${appId}/public/data/config`,
            TEAMS_COLLECTION_PATH: `artifacts/${appId}/public/data/teams`
        };
    }
};

console.log("Modulo Draft-Constants caricato.");
