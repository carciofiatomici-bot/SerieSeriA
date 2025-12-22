//
// ====================================================================
// ABILITA-EFFECTS.JS - Sistema Centralizzato Effetti Abilita
// ====================================================================
// Gestisce tutti gli effetti delle abilita dei giocatori durante
// la simulazione delle partite. Separa la logica delle abilita
// dal motore di simulazione principale.
//
// Versione: 1.0.0
// ====================================================================

window.AbilitaEffects = {

    // ====================================================================
    // STATO PARTITA (centralizzato)
    // ====================================================================
    state: {
        // --- Tracking per occasione ---
        currentOccasion: 0,
        nullified: new Set(),           // Abilita nullificate per questa occasione
        contrastoDurissimoUsed: new Set(), // Contrasto Durissimo gia usato
        constructionSkipped: false,     // Fase costruzione saltata (per Distratto)

        // --- Tracking per partita ---
        score: { home: 0, away: 0 },
        totalOccasions: 50,             // Occasioni totali nella partita
        injured: new Set(),             // Giocatori infortunati

        // --- Tracking team ---
        teletrasportoCount: { home: 0, away: 0 },      // Max 5 per partita
        iconaBonusActive: { home: false, away: false }, // 50% determinato a inizio
        uomoInPiuCount: { home: 0, away: 0 },          // Max 5 per partita
        rilancioLaserActive: { home: false, away: false },
        registaDifensivoActive: { home: false, away: false },
        registaSkipBonus: { home: false, away: false },
        skipNextConstruction: false,

        // --- Tracking per giocatore (Map: playerId -> valore) ---
        // Usare getPlayerTracking() e setPlayerTracking() per accedere
        playerData: new Map(),

        /**
         * Reset completo dello stato a inizio partita
         */
        reset() {
            this.currentOccasion = 0;
            this.nullified = new Set();
            this.contrastoDurissimoUsed = new Set();
            this.constructionSkipped = false;

            this.score = { home: 0, away: 0 };
            this.totalOccasions = 50;
            this.injured = new Set();

            this.teletrasportoCount = { home: 0, away: 0 };
            this.iconaBonusActive = { home: false, away: false };
            this.uomoInPiuCount = { home: 0, away: 0 };
            this.rilancioLaserActive = { home: false, away: false };
            this.registaDifensivoActive = { home: false, away: false };
            this.registaSkipBonus = { home: false, away: false };
            this.skipNextConstruction = false;

            this.playerData = new Map();
        },

        /**
         * Reset parziale a inizio occasione
         */
        resetOccasion() {
            this.nullified = new Set();
            this.contrastoDurissimoUsed = new Set();
            this.constructionSkipped = false;
        }
    },

    // ====================================================================
    // GESTIONE TRACKING GIOCATORI
    // ====================================================================

    /**
     * Ottiene il tracking data di un giocatore
     * @param {string} playerId - ID del giocatore
     * @returns {Object} Dati tracking del giocatore
     */
    getPlayerTracking(playerId) {
        if (!this.state.playerData.has(playerId)) {
            this.state.playerData.set(playerId, {
                // Lunatico: -1/0/+1 determinato a inizio partita
                lunaticoMod: 0,
                // Guerriero: occasioni rimanenti con bonus
                guerrieroOccasions: 0,
                // Stazionario: bonus accumulato
                stazionarioBonus: 0,
                // Relax: modificatore dinamico
                relaxMod: 0,
                // Scheggia impazzita: bonus per Fase 2
                scheggiaBonus: 0,
                // Assist-man: assist fatti
                assistManCount: 0,
                // Parata Laser: bonus cumulativo (max 5)
                parataLaserBonus: 0,
                // Continua a provare: bonus per fasi fallite
                continuaProvareBonus: 0,
                // Tiro Dritto: goal segnati
                tiroDrittoGoals: 0,
                // Contrattura Cronica: partecipazioni
                partecipazioni: 0,
                // Saracinesca: attivo dopo goal subito
                saracinescaActive: false,
                // Motore: partecipato a Fase 1
                motoreActive: false,
                // Piantagrane: vittima designata
                piantagraneVictim: null,
                // Forma Smagliante: gia processato
                formaSmaglianteApplied: false
            });
        }
        return this.state.playerData.get(playerId);
    },

    /**
     * Imposta un valore nel tracking di un giocatore
     * @param {string} playerId - ID del giocatore
     * @param {string} key - Chiave da impostare
     * @param {*} value - Valore da impostare
     */
    setPlayerTracking(playerId, key, value) {
        const data = this.getPlayerTracking(playerId);
        data[key] = value;
    },

    // ====================================================================
    // UTILITIES
    // ====================================================================

    /**
     * Roll dado
     */
    rollDice(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Roll percentuale (1-100)
     */
    rollPercentage() {
        return this.rollDice(1, 100);
    },

    /**
     * Check probabilita percentuale
     */
    checkChance(percentage) {
        return this.rollPercentage() <= percentage;
    },

    /**
     * Converte teamKey da simulazione a state key
     */
    getTeamKey(teamKey) {
        return teamKey === 'teamA' ? 'home' : 'away';
    },

    // ====================================================================
    // INIZIALIZZAZIONE PARTITA
    // ====================================================================

    /**
     * Inizializza lo stato per una nuova partita
     * @param {Object} homeTeam - Dati squadra casa
     * @param {Object} awayTeam - Dati squadra ospite
     */
    initMatch(homeTeam, awayTeam) {
        this.state.reset();

        // Inizializza abilita che richiedono setup a inizio partita
        this.initLunatico(homeTeam, 'home');
        this.initLunatico(awayTeam, 'away');
        this.initIconaBonus(homeTeam, awayTeam);
        this.initPiantagrane(homeTeam, 'home');
        this.initPiantagrane(awayTeam, 'away');

        console.log('[AbilitaEffects] Match inizializzato');
    },

    /**
     * Inizializza Lunatico per tutti i giocatori di una squadra
     */
    initLunatico(teamData, teamKey) {
        const players = teamData?.formation?.titolari || [];
        for (const player of players) {
            if (player.abilities?.includes('Lunatico')) {
                const roll = this.rollDice(1, 6);
                let mod = 0;
                if (roll === 1) mod = -1;
                else if (roll === 6) mod = 1;
                this.setPlayerTracking(player.id, 'lunaticoMod', mod);
            }
        }
    },

    /**
     * Inizializza bonus Icona (50% chance per squadra)
     */
    initIconaBonus(homeTeam, awayTeam) {
        // Check se squadra casa ha Icona
        const homePlayers = homeTeam?.formation?.titolari || [];
        const hasHomeIcona = homePlayers.some(p => p.abilities?.includes('Icona'));
        if (hasHomeIcona) {
            this.state.iconaBonusActive.home = this.checkChance(50);
        }

        // Check se squadra ospite ha Icona
        const awayPlayers = awayTeam?.formation?.titolari || [];
        const hasAwayIcona = awayPlayers.some(p => p.abilities?.includes('Icona'));
        if (hasAwayIcona) {
            this.state.iconaBonusActive.away = this.checkChance(50);
        }
    },

    /**
     * Inizializza Piantagrane - sceglie vittima casuale
     */
    initPiantagrane(teamData, teamKey) {
        const players = teamData?.formation?.titolari || [];
        for (const player of players) {
            if (player.abilities?.includes('Piantagrane')) {
                // Scegli un compagno casuale (non se stesso)
                const teammates = players.filter(p => p.id !== player.id);
                if (teammates.length > 0) {
                    const victim = teammates[Math.floor(Math.random() * teammates.length)];
                    this.setPlayerTracking(player.id, 'piantagraneVictim', victim.id);
                }
            }
        }
    },

    // ====================================================================
    // EVENTI PARTITA
    // ====================================================================

    /**
     * Chiamato a inizio di ogni occasione
     */
    onOccasionStart() {
        this.state.currentOccasion++;
        this.state.resetOccasion();
    },

    /**
     * Chiamato dopo un goal
     * @param {Object} scorer - Giocatore che ha segnato
     * @param {string} teamKey - 'home' o 'away'
     */
    onGoal(scorer, teamKey) {
        // Aggiorna punteggio
        this.state.score[teamKey]++;

        // Tiro Dritto: incrementa counter goal
        if (scorer?.id) {
            const data = this.getPlayerTracking(scorer.id);
            data.tiroDrittoGoals++;
        }

        // Parata Laser: resetta bonus del portiere avversario
        const opponentKey = teamKey === 'home' ? 'away' : 'home';
        // (resettiamo tutti i portieri avversari)
        this.state.playerData.forEach((data, playerId) => {
            // Il reset specifico verra fatto quando conosciamo il portiere
        });

        // Guerriero: attiva per il portiere che ha subito
        // (gestito separatamente quando conosciamo il portiere)
    },

    /**
     * Chiamato dopo una parata
     * @param {Object} goalkeeper - Portiere che ha parato
     * @param {string} teamKey - 'home' o 'away'
     */
    onSave(goalkeeper, teamKey) {
        if (!goalkeeper?.id) return;

        const data = this.getPlayerTracking(goalkeeper.id);

        // Parata Laser: incrementa bonus (max 5)
        if (goalkeeper.abilities?.includes('Parata Laser')) {
            data.parataLaserBonus = Math.min(5, data.parataLaserBonus + 1);
        }

        // Rilancio Laser: attiva bonus per prossima Fase 1
        if (goalkeeper.abilities?.includes('Rilancio Laser')) {
            this.state.rilancioLaserActive[teamKey] = true;
        }

        // Regista Difensivo: attiva skip + bonus
        if (goalkeeper.abilities?.includes('Regista Difensivo')) {
            this.state.registaDifensivoActive[teamKey] = true;
        }

        // Presa Sicura: skip prossima costruzione avversaria
        if (goalkeeper.abilities?.includes('Presa Sicura')) {
            this.state.skipNextConstruction = true;
        }
    },

    /**
     * Chiamato quando una fase fallisce
     * @param {Object} player - Giocatore che ha fallito
     * @param {number} phase - Numero fase (1, 2, 3)
     */
    onPhaseFailed(player, phase) {
        if (!player?.id) return;

        // Continua a provare: accumula bonus (+0.5 per fase, max +6)
        if (player.abilities?.includes('Continua a provare')) {
            const data = this.getPlayerTracking(player.id);
            data.continuaProvareBonus = Math.min(6, data.continuaProvareBonus + 0.5);
        }
    },

    // ====================================================================
    // EFFETTI ABILITA - Placeholder per fasi successive
    // ====================================================================

    /**
     * Database effetti abilita
     * Ogni abilita e una funzione che ritorna il modificatore
     *
     * @param {Object} player - Giocatore con l'abilita
     * @param {Object} context - Contesto della fase
     *   - phase: 'construction' | 'attack' | 'shot'
     *   - isAttacking: boolean
     *   - teamKey: 'home' | 'away'
     *   - opponents: Array di giocatori avversari
     *   - hasHomeAdvantage: boolean
     * @returns {number} Modificatore da aggiungere
     */
    effects: {
        // Le abilita verranno migrate qui nelle fasi successive
        // Esempio di struttura:
        // 'Fortunato': function(player, context) {
        //     return this.checkChance(5) ? 3 : 0;
        // }
    },

    /**
     * Calcola il modificatore totale delle abilita per un giocatore
     * @param {Object} player - Giocatore
     * @param {Object} context - Contesto della fase
     * @returns {number} Modificatore totale
     */
    getAbilityModifier(player, context) {
        if (!player?.abilities || player.abilities.length === 0) return 0;

        let totalMod = 0;

        for (const abilityName of player.abilities) {
            const effect = this.effects[abilityName];
            if (effect && typeof effect === 'function') {
                try {
                    const mod = effect.call(this, player, context);
                    if (typeof mod === 'number' && !isNaN(mod)) {
                        totalMod += mod;
                    }
                } catch (err) {
                    console.warn(`[AbilitaEffects] Errore in abilita "${abilityName}":`, err);
                }
            }
        }

        return totalMod;
    },

    // ====================================================================
    // ABILITA SPECIALI (non sono semplici modificatori)
    // ====================================================================

    /**
     * Verifica se la fase deve essere saltata
     * @param {string} phase - 'construction' | 'attack' | 'shot'
     * @param {string} teamKey - 'home' | 'away'
     * @returns {Object} { skip: boolean, reason: string, bonus: number }
     */
    shouldSkipPhase(phase, teamKey) {
        // Presa Sicura: skip costruzione avversaria
        if (phase === 'construction' && this.state.skipNextConstruction) {
            this.state.skipNextConstruction = false;
            return { skip: true, reason: 'Presa Sicura', bonus: 0 };
        }

        // Regista Difensivo: skip costruzione con bonus
        if (phase === 'construction' && this.state.registaDifensivoActive[teamKey]) {
            this.state.registaDifensivoActive[teamKey] = false;
            return { skip: true, reason: 'Regista Difensivo', bonus: 2 };
        }

        return { skip: false };
    },

    /**
     * Verifica se un giocatore puo sostituire quello selezionato
     * (Teletrasporto, L'uomo in piu)
     * @param {string} phase - Fase corrente
     * @param {Object} team - Dati squadra
     * @param {Object} originalPlayer - Giocatore originale
     * @param {Object} context - Contesto
     * @returns {Object|null} Giocatore sostituto o null
     */
    getSubstitutePlayer(phase, team, originalPlayer, context) {
        // Implementazione nelle fasi successive
        return null;
    },

    /**
     * Verifica risultato Fase 3 con abilita speciali
     * (Parata di pugno, Respinta, ecc.)
     * @param {number} difference - Differenza TIRO - PORTIERE
     * @param {Object} shooter - Tiratore
     * @param {Object} goalkeeper - Portiere
     * @returns {Object} { modified: boolean, newDifference: number, reroll: boolean }
     */
    checkPhase3Result(difference, shooter, goalkeeper) {
        // Implementazione nelle fasi successive
        return { modified: false, newDifference: difference, reroll: false };
    }
};

console.log('[OK] Modulo AbilitaEffects caricato (v1.0.0)');
