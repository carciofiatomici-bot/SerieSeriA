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
        { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
        // Sud America
        { code: 'BR', name: 'Brasile', flag: '🇧🇷' },
        { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
        { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
        { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
        { code: 'CL', name: 'Cile', flag: '🇨🇱' },
        { code: 'PE', name: 'Peru', flag: '🇵🇪' },
        { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
        { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
        { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
        { code: 'BO', name: 'Bolivia', flag: '🇧🇴' }
    ],

    // ====================================================================
    // MAPPA ABILITA' PER RUOLO (solo abilità implementate nell'enciclopedia)
    // ====================================================================
    ROLE_ABILITIES_MAP: {
        'P': {
            positive: ['Pugno di ferro', 'Uscita Kamikaze', 'Teletrasporto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Parata con i piedi', 'Lancio lungo', 'Presa Sicura', 'Muro Psicologico', 'Miracolo', 'Freddezza'],
            negative: ['Mani di burro', 'Respinta Timida', 'Fuori dai pali', 'Lento a carburare', 'Soggetto a infortuni']
        },
        'D': {
            positive: ['Muro', 'Contrasto Durissimo', 'Antifurto', 'Guardia', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Deviazione', 'Svaligiatore', 'Spazzata', 'Adattabile', 'Salvataggio sulla Linea', 'Freddezza'],
            negative: ['Falloso', 'Insicuro', 'Fuori Posizione', 'Lento a carburare', 'Soggetto a infortuni']
        },
        'C': {
            positive: ['Tuttocampista', 'Regista', 'Motore', 'Tocco Di Velluto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Lancio lungo', 'Cross', 'Mago del pallone', 'Passaggio Corto', 'Visione di Gioco', 'Freddezza'],
            negative: ['Egoista', 'Impreciso', 'Ingabbiato', 'Lento a carburare', 'Soggetto a infortuni']
        },
        'A': {
            positive: ['Opportunista', 'Bomber', 'Doppio Scatto', 'Pivot', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Rientro Rapido', 'Tiro Fulmineo', 'Tiro a Giro', 'Immarcabile', 'Freddezza'],
            negative: ['Piedi a banana', 'Eccesso di sicurezza', 'Egoista', 'Lento a carburare', 'Soggetto a infortuni']
        }
    },

    // ====================================================================
    // SISTEMA DRAFT A TURNI
    // ====================================================================

    // Tempo massimo per draftare (1 ora in millisecondi)
    DRAFT_TURN_TIMEOUT_MS: 60 * 60 * 1000,

    // Tempo per chi ruba il turno (10 minuti in millisecondi)
    DRAFT_STEAL_TIMEOUT_MS: 10 * 60 * 1000,

    // Numero massimo di furti subiti prima di assegnazione automatica giocatore
    // Dopo 5 furti viene assegnato un giocatore random dal costo piu' basso
    DRAFT_MAX_STEAL_STRIKES: 5,

    // Numero massimo di timeout prima di esclusione dal round (alias per retrocompatibilita')
    // Dopo 3 timeout il team viene spostato in fondo e poi escluso
    DRAFT_MAX_TIMEOUT_STRIKES: 3,

    // Numero di turni totali del draft
    DRAFT_TOTAL_ROUNDS: 2,

    // Intervallo di controllo timeout (ogni 30 secondi)
    DRAFT_TIMEOUT_CHECK_INTERVAL_MS: 30 * 1000,

    // ====================================================================
    // PAUSA NOTTURNA DRAFT
    // ====================================================================
    // Il timer del draft si ferma durante le ore notturne (00:00 - 08:00)

    // Ora inizio pausa notturna (00:00 = 0)
    DRAFT_NIGHT_PAUSE_START_HOUR: 0,

    // Ora fine pausa notturna (08:00 = 8)
    DRAFT_NIGHT_PAUSE_END_HOUR: 8,

    // Abilita/disabilita pausa notturna
    DRAFT_NIGHT_PAUSE_ENABLED: true,

    /**
     * Verifica se siamo in orario di pausa notturna
     * @param {Date} [date] - Data da verificare (default: now)
     * @returns {boolean} - true se siamo in pausa notturna
     */
    isNightPauseActive(date = new Date()) {
        if (!this.DRAFT_NIGHT_PAUSE_ENABLED) return false;

        const hour = date.getHours() + date.getMinutes() / 60;

        // Se la pausa attraversa la mezzanotte (es. 22:30 - 09:00)
        if (this.DRAFT_NIGHT_PAUSE_START_HOUR > this.DRAFT_NIGHT_PAUSE_END_HOUR) {
            return hour >= this.DRAFT_NIGHT_PAUSE_START_HOUR || hour < this.DRAFT_NIGHT_PAUSE_END_HOUR;
        }
        // Se la pausa e' nello stesso giorno (es. 00:00 - 08:00)
        return hour >= this.DRAFT_NIGHT_PAUSE_START_HOUR && hour < this.DRAFT_NIGHT_PAUSE_END_HOUR;
    },

    /**
     * Calcola i millisecondi di pausa notturna trascorsi da un timestamp
     * @param {number} startTimestamp - Timestamp di inizio (ms)
     * @param {number} [endTimestamp] - Timestamp di fine (default: now)
     * @returns {number} - Millisecondi totali di pausa notturna nel periodo
     */
    getNightPauseMs(startTimestamp, endTimestamp = Date.now()) {
        if (!this.DRAFT_NIGHT_PAUSE_ENABLED) return 0;

        let pauseMs = 0;
        const crossesMidnight = this.DRAFT_NIGHT_PAUSE_START_HOUR > this.DRAFT_NIGHT_PAUSE_END_HOUR;

        // Itera giorno per giorno
        let currentDay = new Date(startTimestamp);
        currentDay.setHours(0, 0, 0, 0);

        const endDatePlusOne = new Date(endTimestamp);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

        while (currentDay <= endDatePlusOne) {
            let pauseStart, pauseEnd;

            if (crossesMidnight) {
                // Pausa attraversa mezzanotte (es. 22:30 - 09:00)
                // La pausa inizia il giorno corrente e finisce il giorno dopo
                pauseStart = new Date(currentDay);
                pauseStart.setHours(Math.floor(this.DRAFT_NIGHT_PAUSE_START_HOUR));
                pauseStart.setMinutes((this.DRAFT_NIGHT_PAUSE_START_HOUR % 1) * 60);
                pauseStart.setSeconds(0, 0);

                pauseEnd = new Date(currentDay);
                pauseEnd.setDate(pauseEnd.getDate() + 1);
                pauseEnd.setHours(Math.floor(this.DRAFT_NIGHT_PAUSE_END_HOUR));
                pauseEnd.setMinutes((this.DRAFT_NIGHT_PAUSE_END_HOUR % 1) * 60);
                pauseEnd.setSeconds(0, 0);
            } else {
                // Pausa nello stesso giorno (es. 00:00 - 08:00)
                pauseStart = new Date(currentDay);
                pauseStart.setHours(Math.floor(this.DRAFT_NIGHT_PAUSE_START_HOUR));
                pauseStart.setMinutes((this.DRAFT_NIGHT_PAUSE_START_HOUR % 1) * 60);
                pauseStart.setSeconds(0, 0);

                pauseEnd = new Date(currentDay);
                pauseEnd.setHours(Math.floor(this.DRAFT_NIGHT_PAUSE_END_HOUR));
                pauseEnd.setMinutes((this.DRAFT_NIGHT_PAUSE_END_HOUR % 1) * 60);
                pauseEnd.setSeconds(0, 0);
            }

            // Calcola sovrapposizione con il periodo richiesto
            const overlapStart = Math.max(startTimestamp, pauseStart.getTime());
            const overlapEnd = Math.min(endTimestamp, pauseEnd.getTime());

            if (overlapEnd > overlapStart) {
                pauseMs += overlapEnd - overlapStart;
            }

            // Passa al giorno successivo
            currentDay.setDate(currentDay.getDate() + 1);
        }

        return pauseMs;
    },

    /**
     * Calcola il tempo effettivo trascorso (escludendo le pause notturne)
     * @param {number} startTimestamp - Timestamp di inizio turno
     * @returns {number} - Millisecondi effettivi trascorsi
     */
    getEffectiveElapsedTime(startTimestamp) {
        const totalElapsed = Date.now() - startTimestamp;
        const pauseMs = this.getNightPauseMs(startTimestamp);
        return Math.max(0, totalElapsed - pauseMs);
    },

    /**
     * Calcola il tempo rimanente considerando la pausa notturna
     * @param {number} startTimestamp - Timestamp di inizio turno
     * @param {number} timeout - Timeout totale in ms
     * @returns {number} - Millisecondi rimanenti
     */
    getEffectiveTimeRemaining(startTimestamp, timeout) {
        const effectiveElapsed = this.getEffectiveElapsedTime(startTimestamp);
        return Math.max(0, timeout - effectiveElapsed);
    },

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
