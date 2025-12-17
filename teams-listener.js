//
// ====================================================================
// TEAMS-LISTENER.JS - Listener Condiviso per Squadre Firestore
// ====================================================================
//
// OTTIMIZZAZIONE: Un solo listener/cache per le squadre
// invece di letture multiple da vari moduli (draft, mercato,
// admin, gestionesquadre, ecc.)
//
// Risparmio stimato: ~200-300 reads/giorno
//

window.TeamsListener = {
    // Stato interno
    _unsubscribe: null,
    _subscribers: new Map(),
    _cachedTeams: null,  // Map<teamId, teamData>
    _cachedTeamsList: null, // Array per compatibilita
    _isStarted: false,
    _subscriberIdCounter: 0,
    _lastFetchTime: 0,
    _minFetchInterval: 30 * 1000, // Minimo 30 secondi tra fetch

    /**
     * Ottiene il path della collection teams
     */
    _getTeamsPath() {
        const appId = window.firestoreTools?.appId || 'default-app-id';
        return `artifacts/${appId}/public/data/teams`;
    },

    /**
     * Registra un subscriber per ricevere aggiornamenti delle squadre
     * @param {Function} callback - Funzione chiamata con (teamsMap, teamsList) ad ogni update
     * @param {Object} options - Opzioni: { useRealtime: false }
     * @returns {string} subscriberId - ID per unsubscribe
     */
    subscribe(callback, options = {}) {
        const id = `teams_sub_${++this._subscriberIdCounter}`;

        this._subscribers.set(id, {
            callback: callback,
            useRealtime: options.useRealtime || false
        });

        console.log(`[TeamsListener] Nuovo subscriber: ${id} (totale: ${this._subscribers.size})`);

        // Se abbiamo dati in cache, notifica subito
        if (this._cachedTeams) {
            try {
                callback(this._cachedTeams, this._cachedTeamsList);
            } catch (e) {
                console.error(`[TeamsListener] Errore callback iniziale ${id}:`, e);
            }
        }

        // Se qualcuno richiede realtime e non e' attivo, avvialo
        if (options.useRealtime && !this._isStarted) {
            this.startRealtime();
        }

        return id;
    },

    /**
     * Rimuove un subscriber
     * @param {string} subscriberId
     */
    unsubscribe(subscriberId) {
        if (this._subscribers.has(subscriberId)) {
            this._subscribers.delete(subscriberId);
            console.log(`[TeamsListener] Rimosso subscriber: ${subscriberId} (rimasti: ${this._subscribers.size})`);

            // Se non ci sono piu' subscriber realtime, ferma il listener
            const hasRealtimeSubscribers = Array.from(this._subscribers.values())
                .some(sub => sub.useRealtime);

            if (!hasRealtimeSubscribers && this._isStarted) {
                this.stopRealtime();
            }
        }
    },

    /**
     * Avvia il listener real-time sulle squadre
     * Usare solo se necessario (es. schermata admin squadre)
     */
    startRealtime() {
        if (this._isStarted) {
            console.log('[TeamsListener] Realtime gia avviato');
            return;
        }

        if (!window.db || !window.firestoreTools) {
            console.warn('[TeamsListener] Firestore non disponibile');
            return;
        }

        try {
            const { collection, onSnapshot } = window.firestoreTools;
            const teamsPath = this._getTeamsPath();
            const teamsRef = collection(window.db, teamsPath);

            this._unsubscribe = onSnapshot(teamsRef, (snapshot) => {
                const teamsMap = new Map();
                const teamsList = [];

                snapshot.forEach(doc => {
                    const teamData = { id: doc.id, ...doc.data() };
                    teamsMap.set(doc.id, teamData);
                    teamsList.push(teamData);
                });

                this._cachedTeams = teamsMap;
                this._cachedTeamsList = teamsList;
                this._lastFetchTime = Date.now();

                console.log(`[TeamsListener] Realtime update: ${teamsList.length} squadre`);

                // Notifica tutti i subscriber
                this._notifySubscribers(teamsMap, teamsList);

            }, (error) => {
                console.error('[TeamsListener] Errore listener:', error);
            });

            this._isStarted = true;
            console.log('[TeamsListener] Realtime listener avviato');

        } catch (error) {
            console.error('[TeamsListener] Errore avvio realtime:', error);
        }
    },

    /**
     * Ferma il listener realtime
     */
    stopRealtime() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        this._isStarted = false;
        console.log('[TeamsListener] Realtime listener fermato');
    },

    /**
     * Notifica tutti i subscriber
     */
    _notifySubscribers(teamsMap, teamsList) {
        for (const [id, subscriber] of this._subscribers.entries()) {
            try {
                subscriber.callback(teamsMap, teamsList);
            } catch (e) {
                console.error(`[TeamsListener] Errore notifica ${id}:`, e);
            }
        }
    },

    /**
     * Ottieni tutte le squadre (con cache intelligente)
     * @param {boolean} forceRefresh - Se true, forza il refresh da Firestore
     * @returns {Promise<Array>} Lista squadre
     */
    async getTeams(forceRefresh = false) {
        // Se abbiamo cache valida e non forzato, restituisci cache
        const now = Date.now();
        const cacheAge = now - this._lastFetchTime;
        const cacheTTL = window.FirestoreCache?.TTL?.TEAM_LIST || 10 * 60 * 1000;

        if (!forceRefresh && this._cachedTeamsList && cacheAge < cacheTTL) {
            console.log('[TeamsListener] Cache HIT - squadre dalla cache');
            return this._cachedTeamsList;
        }

        // Throttle: evita fetch troppo frequenti
        if (!forceRefresh && cacheAge < this._minFetchInterval) {
            console.log('[TeamsListener] Throttled - troppo presto per nuovo fetch');
            return this._cachedTeamsList || [];
        }

        // Fetch da Firestore
        return await this.refresh();
    },

    /**
     * Ottieni una singola squadra per ID (con cache)
     * @param {string} teamId - ID della squadra
     * @param {boolean} forceRefresh - Se true, forza il refresh
     * @returns {Promise<Object|null>} Dati squadra
     */
    async getTeam(teamId, forceRefresh = false) {
        // Prima prova dalla cache
        if (!forceRefresh && this._cachedTeams?.has(teamId)) {
            console.log(`[TeamsListener] Cache HIT - squadra ${teamId}`);
            return this._cachedTeams.get(teamId);
        }

        // Se non in cache, carica tutte le squadre
        await this.getTeams(forceRefresh);

        return this._cachedTeams?.get(teamId) || null;
    },

    /**
     * Ottieni il nome di una squadra per ID (molto usato)
     * @param {string} teamId - ID della squadra
     * @returns {Promise<string>} Nome squadra o teamId se non trovato
     */
    async getTeamName(teamId) {
        const team = await this.getTeam(teamId);
        return team?.teamName || teamId;
    },

    /**
     * Forza un refresh delle squadre da Firestore
     * @returns {Promise<Array>}
     */
    async refresh() {
        if (!window.db || !window.firestoreTools) {
            console.warn('[TeamsListener] Firestore non disponibile');
            return [];
        }

        try {
            const { collection, getDocs } = window.firestoreTools;
            const teamsPath = this._getTeamsPath();
            const teamsRef = collection(window.db, teamsPath);

            console.log('[TeamsListener] Fetching squadre da Firestore...');
            const snapshot = await getDocs(teamsRef);

            const teamsMap = new Map();
            const teamsList = [];

            snapshot.forEach(doc => {
                const teamData = { id: doc.id, ...doc.data() };
                teamsMap.set(doc.id, teamData);
                teamsList.push(teamData);
            });

            this._cachedTeams = teamsMap;
            this._cachedTeamsList = teamsList;
            this._lastFetchTime = Date.now();

            console.log(`[TeamsListener] Caricato ${teamsList.length} squadre`);

            // Notifica subscriber se ci sono
            if (this._subscribers.size > 0) {
                this._notifySubscribers(teamsMap, teamsList);
            }

            return teamsList;

        } catch (error) {
            console.error('[TeamsListener] Errore refresh:', error);
            return this._cachedTeamsList || [];
        }
    },

    /**
     * Ottieni squadre dalla cache senza fetch
     * @returns {Array}
     */
    getCached() {
        return this._cachedTeamsList || [];
    },

    /**
     * Ottieni mappa squadre dalla cache
     * @returns {Map}
     */
    getCachedMap() {
        return this._cachedTeams || new Map();
    },

    /**
     * Verifica se la cache e' valida
     * @returns {boolean}
     */
    hasCachedData() {
        return this._cachedTeams !== null && this._cachedTeams.size > 0;
    },

    /**
     * Invalida la cache (forza refresh al prossimo getTeams)
     */
    invalidateCache() {
        this._lastFetchTime = 0;
        console.log('[TeamsListener] Cache invalidata');
    },

    /**
     * Aggiorna una singola squadra nella cache (dopo scrittura)
     * @param {string} teamId - ID squadra
     * @param {Object} teamData - Nuovi dati squadra
     */
    updateCachedTeam(teamId, teamData) {
        if (!this._cachedTeams) {
            this._cachedTeams = new Map();
            this._cachedTeamsList = [];
        }

        const fullTeamData = { id: teamId, ...teamData };

        // Aggiorna mappa
        this._cachedTeams.set(teamId, fullTeamData);

        // Aggiorna lista
        const index = this._cachedTeamsList.findIndex(t => t.id === teamId);
        if (index >= 0) {
            this._cachedTeamsList[index] = fullTeamData;
        } else {
            this._cachedTeamsList.push(fullTeamData);
        }

        console.log(`[TeamsListener] Squadra ${teamId} aggiornata nella cache`);
    },

    /**
     * Rimuove una squadra dalla cache
     * @param {string} teamId - ID squadra
     */
    removeCachedTeam(teamId) {
        if (this._cachedTeams) {
            this._cachedTeams.delete(teamId);
        }
        if (this._cachedTeamsList) {
            this._cachedTeamsList = this._cachedTeamsList.filter(t => t.id !== teamId);
        }
        console.log(`[TeamsListener] Squadra ${teamId} rimossa dalla cache`);
    },

    /**
     * Cleanup - da chiamare al logout o cambio schermata
     */
    cleanup() {
        this.stopRealtime();
        this._subscribers.clear();
        this._cachedTeams = null;
        this._cachedTeamsList = null;
        this._lastFetchTime = 0;
        this._subscriberIdCounter = 0;
        console.log('[TeamsListener] Cleanup completato');
    },

    /**
     * Statistiche per debug
     */
    getStats() {
        return {
            subscribers: this._subscribers.size,
            isRealtime: this._isStarted,
            teamsCount: this._cachedTeams?.size || 0,
            hasCachedData: this._cachedTeams !== null,
            cacheAge: this._lastFetchTime ? Math.round((Date.now() - this._lastFetchTime) / 1000) + 's' : 'N/A'
        };
    },

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Cerca squadre per nome (case-insensitive)
     * @param {string} query - Stringa di ricerca
     * @returns {Array} Squadre corrispondenti
     */
    searchByName(query) {
        if (!this._cachedTeamsList || !query) return [];

        const lowerQuery = query.toLowerCase();
        return this._cachedTeamsList.filter(team =>
            team.teamName?.toLowerCase().includes(lowerQuery)
        );
    },

    /**
     * Ottieni squadre ordinate per posizione classifica
     * @returns {Array}
     */
    getTeamsSortedByRank() {
        if (!this._cachedTeamsList) return [];

        return [...this._cachedTeamsList].sort((a, b) => {
            const rankA = a.leaguePosition || 999;
            const rankB = b.leaguePosition || 999;
            return rankA - rankB;
        });
    },

    /**
     * Ottieni squadre partecipanti alla coppa
     * @returns {Array}
     */
    getCupParticipants() {
        if (!this._cachedTeamsList) return [];

        return this._cachedTeamsList.filter(team => team.isCupParticipating === true);
    },

    /**
     * Costruisci mappa ID -> Nome per lookup veloci
     * @returns {Object} { teamId: teamName, ... }
     */
    getTeamNamesMap() {
        const map = {};
        if (this._cachedTeams) {
            for (const [id, team] of this._cachedTeams) {
                map[id] = team.teamName || id;
            }
        }
        return map;
    }
};

console.log('[TeamsListener] Modulo caricato');
