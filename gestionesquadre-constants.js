//
// ====================================================================
// GESTIONESQUADRE-CONSTANTS.JS - Costanti e Configurazioni
// ====================================================================
//

window.GestioneSquadreConstants = {

    // Struttura dei moduli e delle posizioni (P, D, C, A) - Ordinati per posizione crescente (D->C->A)
    MODULI: {
        // Difesa massima (4D)
        '1-4-0-0': { P: 1, D: 4, C: 0, A: 0, description: "Bunker mode! 4 Difensori, nessun attacco. Ultra-catenaccio. (4 titolari + Portiere)" },
        // Difesa alta (3D)
        '1-3-1': { P: 1, D: 3, C: 0, A: 1, description: "Modulo difensivo con 3 difensori, 1 Attaccante. (4 titolari + Portiere)" },
        '1-3-1-0': { P: 1, D: 3, C: 1, A: 0, description: "3 Difensori, 1 Centrocampista, nessun attacco. Catenaccio con regia. (4 titolari + Portiere)" },
        // Difesa media (2D)
        '1-2-2-0': { P: 1, D: 2, C: 2, A: 0, description: "Modulo senza punte, 2 Difensori, 2 Centrocampisti. Controllo totale. (4 titolari + Portiere)" },
        '1-2-1-1': { P: 1, D: 2, C: 1, A: 1, description: "Modulo difensivo-equilibrato, 2 Difensori, 1 Centrocampista, 1 Attaccante. (4 titolari + Portiere)" },
        '1-2-2': { P: 1, D: 2, C: 0, A: 2, description: "Tattica ultradifensiva, 2 Difensori, 2 Attaccanti. (4 titolari + Portiere)" },
        // Difesa bassa (1D)
        '1-1-2-1': { P: 1, D: 1, C: 2, A: 1, description: "Modulo equilibrato, 1 Difensore, 2 Centrocampisti, 1 Attaccante. (4 titolari + Portiere)" },
        '1-1-1-2': { P: 1, D: 1, C: 1, A: 2, description: "Modulo offensivo, 1 Difensore, 1 Centrocampista, 2 Attaccanti. (4 titolari + Portiere)" },
        '1-1-3': { P: 1, D: 1, C: 0, A: 3, description: "Modulo ultra-offensivo, 1 Difensore, 3 Attaccanti. (4 titolari + Portiere)" },
        // Senza difesa (0D)
        '1-0-4-0': { P: 1, D: 0, C: 4, A: 0, description: "Centrocampo totale! 4 Centrocampisti, controllo assoluto ma senza finalizzatori. (4 titolari + Portiere)" },
        '1-0-3-1': { P: 1, D: 0, C: 3, A: 1, description: "Modulo senza difesa, 3 Centrocampisti, 1 Attaccante. Dominio centrocampo. (4 titolari + Portiere)" },
        '1-0-2-2': { P: 1, D: 0, C: 2, A: 2, description: "Modulo senza difesa, 2 Centrocampisti, 2 Attaccanti. Rischio totale! (4 titolari + Portiere)" },
        '1-0-1-3': { P: 1, D: 0, C: 1, A: 3, description: "1 Centrocampista, 3 Attaccanti. Tutto in avanti! (4 titolari + Portiere)" },
        '1-0-0-4': { P: 1, D: 0, C: 0, A: 4, description: "All-in offensivo! 4 Attaccanti, nessuna difesa. O segni o prendi gol! (4 titolari + Portiere)" },
    },

    // Ruoli totali
    ROLES: ['P', 'D', 'C', 'A'],

    // Mappa per l'ordinamento dei ruoli
    ROLE_ORDER: { 'P': 0, 'D': 1, 'C': 2, 'A': 3 },

    // Mappa dei badge tipologia (PlayerTypeBadge)
    // Colori: Tecnica=Teal, Velocita=Olive, Potenza=Rust Orange
    TYPE_BADGES: {
        'Potenza': { label: 'POT', bgColor: 'bg-orange-700', textColor: 'text-white' },
        'Tecnica': { label: 'TEC', bgColor: 'bg-teal-700', textColor: 'text-white' },
        'Velocita': { label: 'VEL', bgColor: 'bg-lime-700', textColor: 'text-white' },
        'N/A': { label: '???', bgColor: 'bg-gray-600', textColor: 'text-gray-300' }
    },

    /**
     * PlayerTypeBadge - Genera HTML per un badge tipologia stilizzato
     * @param {string} playerType - Tipo giocatore ('Potenza', 'Tecnica', 'Velocita')
     * @param {string} size - Dimensione: 'sm', 'md', 'lg' (default: 'sm')
     * @returns {string} HTML del badge
     */
    getTypeBadgeHtml(playerType, size = 'sm') {
        const badge = this.TYPE_BADGES[playerType] || this.TYPE_BADGES['N/A'];

        // Dimensioni responsive
        const sizeClasses = {
            'xs': 'text-[8px] px-1 py-0.5',
            'sm': 'text-[10px] px-1.5 py-0.5',
            'md': 'text-xs px-2 py-1',
            'lg': 'text-sm px-2.5 py-1'
        };

        const sizeClass = sizeClasses[size] || sizeClasses['sm'];

        return `<span class="${badge.bgColor} ${badge.textColor} ${sizeClass} font-bold rounded uppercase tracking-wide" title="Tipo: ${playerType}">${badge.label}</span>`;
    },

    // Legacy - Mappa delle icone di tipologia (per retrocompatibilita)
    TYPE_ICONS: {
        'Potenza': { icon: 'fas fa-hand-rock', color: 'text-red-500' },
        'Tecnica': { icon: 'fas fa-brain', color: 'text-blue-500' },
        'Velocita': { icon: 'fas fa-bolt', color: 'text-yellow-500' },
        'N/A': { icon: 'fas fa-question-circle', color: 'text-gray-400' }
    },

    // Costo sostituzione Icona (in CSS - Crediti Super Seri)
    ICONA_REPLACEMENT_COST: 1,

    // ====================================================================
    // SISTEMA BONUS/MALUS FORMAZIONI CON ESPERIENZA
    // ====================================================================
    // Ogni formazione guadagna XP quando viene usata in partita.
    // Livelli: 1-10, ogni livello aumenta i modificatori.
    // Bonus: applicati per ogni ruolo extra oltre il primo
    // Malus: applicati per ogni ruolo completamente assente
    // ====================================================================
    FORMATION_MODIFIERS: {
        // XP System
        XP_PER_MATCH: 25,           // XP guadagnata per partita giocata
        XP_PER_LEVEL: 100,          // XP necessaria per salire di livello
        MAX_LEVEL: 10,              // Livello massimo raggiungibile

        // Valori per livello (da 1 a 10)
        // Level 1: 0.1, Level 2: 0.2, ..., Level 10: 1.0
        BONUS_PER_LEVEL: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        MALUS_PER_LEVEL: [-0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0],

        /**
         * Calcola i bonus/malus per una formazione a un certo livello
         * @param {string} modulo - Es: '1-1-2-1'
         * @param {number} level - Livello formazione (1-10)
         * @returns {Object} { fase1, fase2Dif, fase3 }
         */
        getModifiers(modulo, level = 1) {
            const config = window.GestioneSquadreConstants.MODULI[modulo];
            if (!config) return { fase1: 0, fase2Dif: 0, fase3: 0 };

            // Clamp level
            level = Math.max(1, Math.min(this.MAX_LEVEL, level));
            const bonusValue = this.BONUS_PER_LEVEL[level - 1];
            const malusValue = this.MALUS_PER_LEVEL[level - 1];

            const D = config.D || 0;
            const C = config.C || 0;
            const A = config.A || 0;

            // Fase 1 (Costruzione): bonus da C extra, malus se C = 0
            const fase1 = C > 1 ? (C - 1) * bonusValue : (C === 0 ? malusValue : 0);

            // Fase 2 Difesa: bonus da D extra, malus se D = 0
            const fase2Dif = D > 1 ? (D - 1) * bonusValue : (D === 0 ? malusValue : 0);

            // Fase 3 (Tiro): bonus da A extra, malus se A = 0
            const fase3 = A > 1 ? (A - 1) * bonusValue : (A === 0 ? malusValue : 0);

            return { fase1, fase2Dif, fase3 };
        },

        /**
         * Calcola il livello da XP
         * @param {number} xp - XP accumulata
         * @returns {number} Livello (1-5)
         */
        getLevelFromXP(xp) {
            const level = Math.floor(xp / this.XP_PER_LEVEL) + 1;
            return Math.min(level, this.MAX_LEVEL);
        },

        /**
         * Calcola la percentuale di progresso verso il prossimo livello
         * @param {number} xp - XP accumulata
         * @returns {number} Percentuale (0-100)
         */
        getProgressPercent(xp) {
            const level = this.getLevelFromXP(xp);
            if (level >= this.MAX_LEVEL) return 100;
            const xpInCurrentLevel = xp % this.XP_PER_LEVEL;
            return Math.floor((xpInCurrentLevel / this.XP_PER_LEVEL) * 100);
        }
    }
};

console.log("Modulo GestioneSquadre-Constants caricato.");
