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

    // Nazionalità disponibili con bandiere emoji
    NATIONALITIES: [
        // Europa Occidentale
        { code: 'IT', name: 'Italia', flag: '🇮🇹' },
        { code: 'ES', name: 'Spagna', flag: '🇪🇸' },
        { code: 'FR', name: 'Francia', flag: '🇫🇷' },
        { code: 'DE', name: 'Germania', flag: '🇩🇪' },
        { code: 'GB', name: 'Inghilterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
        { code: 'PT', name: 'Portogallo', flag: '🇵🇹' },
        { code: 'NL', name: 'Olanda', flag: '🇳🇱' },
        { code: 'BE', name: 'Belgio', flag: '🇧🇪' },
        { code: 'AT', name: 'Austria', flag: '🇦🇹' },
        { code: 'CH', name: 'Svizzera', flag: '🇨🇭' },
        // Europa Settentrionale
        { code: 'SE', name: 'Svezia', flag: '🇸🇪' },
        { code: 'NO', name: 'Norvegia', flag: '🇳🇴' },
        { code: 'DK', name: 'Danimarca', flag: '🇩🇰' },
        { code: 'FI', name: 'Finlandia', flag: '🇫🇮' },
        { code: 'IS', name: 'Islanda', flag: '🇮🇸' },
        { code: 'IE', name: 'Irlanda', flag: '🇮🇪' },
        { code: 'SC', name: 'Scozia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
        { code: 'WA', name: 'Galles', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
        // Europa Orientale
        { code: 'PL', name: 'Polonia', flag: '🇵🇱' },
        { code: 'CZ', name: 'Repubblica Ceca', flag: '🇨🇿' },
        { code: 'SK', name: 'Slovacchia', flag: '🇸🇰' },
        { code: 'HU', name: 'Ungheria', flag: '🇭🇺' },
        { code: 'RO', name: 'Romania', flag: '🇷🇴' },
        { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
        { code: 'UA', name: 'Ucraina', flag: '🇺🇦' },
        { code: 'RU', name: 'Russia', flag: '🇷🇺' },
        // Europa Meridionale/Balcani
        { code: 'HR', name: 'Croazia', flag: '🇭🇷' },
        { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
        { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
        { code: 'BA', name: 'Bosnia', flag: '🇧🇦' },
        { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
        { code: 'MK', name: 'Macedonia del Nord', flag: '🇲🇰' },
        { code: 'AL', name: 'Albania', flag: '🇦🇱' },
        { code: 'GR', name: 'Grecia', flag: '🇬🇷' },
        { code: 'TR', name: 'Turchia', flag: '🇹🇷' },
        { code: 'CY', name: 'Cipro', flag: '🇨🇾' },
        // Altri Europa
        { code: 'LU', name: 'Lussemburgo', flag: '🇱🇺' },
        { code: 'MT', name: 'Malta', flag: '🇲🇹' },
        { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
        { code: 'LV', name: 'Lettonia', flag: '🇱🇻' },
        { code: 'LT', name: 'Lituania', flag: '🇱🇹' },
        // Africa
        { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
        { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
        { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
        { code: 'CI', name: 'Costa d\'Avorio', flag: '🇨🇮' },
        { code: 'CM', name: 'Camerun', flag: '🇨🇲' },
        { code: 'EG', name: 'Egitto', flag: '🇪🇬' },
        { code: 'MA', name: 'Marocco', flag: '🇲🇦' },
        { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
        { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
        { code: 'ZA', name: 'Sudafrica', flag: '🇿🇦' },
        { code: 'ML', name: 'Mali', flag: '🇲🇱' },
        { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
        { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
        { code: 'CD', name: 'RD Congo', flag: '🇨🇩' },
        { code: 'KE', name: 'Kenya', flag: '🇰🇪' }
    ],

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
