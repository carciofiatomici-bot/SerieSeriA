//
// ====================================================================
// LEADERBOARD-LISTENER.JS - Listener Condiviso per Classifica Firestore
// ====================================================================
//
// OTTIMIZZAZIONE: Un solo listener/cache per la classifica
// invece di letture multiple da vari moduli (campionato-main,
// campionato, campionato-schedule, user-competitions, draft-turns, ecc.)
//
// Risparmio stimato: ~200-400 reads/giorno
//

window.LeaderboardListener = {
    // Stato interno
    _unsubscribe: null,
    _subscribers: new Map(),
    _cachedLeaderboard: null,
    _isStarted: false,
    _subscriberIdCounter: 0,
    _lastFetchTime: 0,
    _minFetchInterval: 30 * 1000, // Minimo 30 secondi tra fetch

    // Costanti
    LEADERBOARD_DOC_ID: 'standings',

    /**
     * Ottiene il path della collection leaderboard
     */
    _getLeaderboardPath() {
        const appId = window.firestoreTools?.appId || 'default-app-id';
        return `artifacts/${appId}/public/data/leaderboard`;
    },

    /**
     * Registra un subscriber per ricevere aggiornamenti della classifica
     * @param {Function} callback - Funzione chiamata con (leaderboardData) ad ogni update
     * @param {Object} options - Opzioni: { useRealtime: false }
     * @returns {string} subscriberId - ID per unsubscribe
     */
    subscribe(callback, options = {}) {
        const id = `leaderboard_sub_${++this._subscriberIdCounter}`;

        this._subscribers.set(id, {
            callback: callback,
            useRealtime: options.useRealtime || false
        });

        console.log(`[LeaderboardListener] Nuovo subscriber: ${id} (totale: ${this._subscribers.size})`);

        // Se abbiamo dati in cache, notifica subito
        if (this._cachedLeaderboard) {
            try {
                callback(this._cachedLeaderboard);
            } catch (e) {
                console.error(`[LeaderboardListener] Errore callback iniziale ${id}:`, e);
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
            console.log(`[LeaderboardListener] Rimosso subscriber: ${subscriberId} (rimasti: ${this._subscribers.size})`);

            // Se non ci sono piu' subscriber realtime, ferma il listener
            const hasRealtimeSubscribers = Array.from(this._subscribers.values())
                .some(sub => sub.useRealtime);

            if (!hasRealtimeSubscribers && this._isStarted) {
                this.stopRealtime();
            }
        }
    },

    /**
     * Avvia il listener real-time sulla classifica
     * Usare solo se necessario (es. schermata classifica aperta)
     */
    startRealtime() {
        if (this._isStarted) {
            console.log('[LeaderboardListener] Realtime gia avviato');
            return;
        }

        if (!window.db || !window.firestoreTools) {
            console.warn('[LeaderboardListener] Firestore non disponibile');
            return;
        }

        try {
            const { doc, onSnapshot } = window.firestoreTools;
            const leaderboardPath = this._getLeaderboardPath();
            const leaderboardDocRef = doc(window.db, leaderboardPath, this.LEADERBOARD_DOC_ID);

            this._unsubscribe = onSnapshot(leaderboardDocRef, (snapshot) => {
                if (!snapshot.exists()) {
                    console.warn('[LeaderboardListener] Classifica non esiste');
                    this._cachedLeaderboard = null;
                    return;
                }

                const newData = snapshot.data();
                this._cachedLeaderboard = newData;
                this._lastFetchTime = Date.now();

                // Notifica tutti i subscriber
                this._notifySubscribers(newData);

            }, (error) => {
                console.error('[LeaderboardListener] Errore listener:', error);
            });

            this._isStarted = true;
            console.log('[LeaderboardListener] Realtime listener avviato');

        } catch (error) {
            console.error('[LeaderboardListener] Errore avvio realtime:', error);
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
        console.log('[LeaderboardListener] Realtime listener fermato');
    },

    /**
     * Notifica tutti i subscriber
     */
    _notifySubscribers(leaderboardData) {
        for (const [id, subscriber] of this._subscribers.entries()) {
            try {
                subscriber.callback(leaderboardData);
            } catch (e) {
                console.error(`[LeaderboardListener] Errore notifica ${id}:`, e);
            }
        }
    },

    /**
     * Ottieni la classifica (con cache intelligente)
     * Questo e' il metodo principale da usare nei moduli
     * @param {boolean} forceRefresh - Se true, forza il refresh da Firestore
     * @returns {Promise<Object|null>} Dati classifica
     */
    async getLeaderboard(forceRefresh = false) {
        // Se abbiamo cache valida e non forzato, restituisci cache
        const now = Date.now();
        const cacheAge = now - this._lastFetchTime;
        const cacheValid = cacheAge < window.FirestoreCache?.TTL?.LEADERBOARD || 5 * 60 * 1000;

        if (!forceRefresh && this._cachedLeaderboard && cacheValid) {
            console.log('[LeaderboardListener] Cache HIT - classifica dalla cache');
            return this._cachedLeaderboard;
        }

        // Throttle: evita fetch troppo frequenti
        if (!forceRefresh && cacheAge < this._minFetchInterval) {
            console.log('[LeaderboardListener] Throttled - troppo presto per nuovo fetch');
            return this._cachedLeaderboard;
        }

        // Fetch da Firestore
        return await this.refresh();
    },

    /**
     * Forza un refresh della classifica da Firestore
     * @returns {Promise<Object|null>}
     */
    async refresh() {
        if (!window.db || !window.firestoreTools) {
            console.warn('[LeaderboardListener] Firestore non disponibile');
            return null;
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const leaderboardPath = this._getLeaderboardPath();
            const leaderboardDocRef = doc(window.db, leaderboardPath, this.LEADERBOARD_DOC_ID);

            console.log('[LeaderboardListener] Fetching classifica da Firestore...');
            const snapshot = await getDoc(leaderboardDocRef);

            if (snapshot.exists()) {
                this._cachedLeaderboard = snapshot.data();
                this._lastFetchTime = Date.now();

                // Notifica subscriber se ci sono
                if (this._subscribers.size > 0) {
                    this._notifySubscribers(this._cachedLeaderboard);
                }

                return this._cachedLeaderboard;
            } else {
                console.warn('[LeaderboardListener] Documento classifica non trovato');
                return null;
            }

        } catch (error) {
            console.error('[LeaderboardListener] Errore refresh:', error);
            return this._cachedLeaderboard; // Ritorna cache se disponibile
        }
    },

    /**
     * Ottieni classifica dalla cache senza fetch
     * @returns {Object|null}
     */
    getCached() {
        return this._cachedLeaderboard;
    },

    /**
     * Verifica se la cache e' valida
     * @returns {boolean}
     */
    hasCachedData() {
        return this._cachedLeaderboard !== null;
    },

    /**
     * Invalida la cache (forza refresh al prossimo getLeaderboard)
     */
    invalidateCache() {
        this._lastFetchTime = 0;
        console.log('[LeaderboardListener] Cache invalidata');
    },

    /**
     * Cleanup - da chiamare al logout o cambio schermata
     */
    cleanup() {
        this.stopRealtime();
        this._subscribers.clear();
        this._cachedLeaderboard = null;
        this._lastFetchTime = 0;
        this._subscriberIdCounter = 0;
        console.log('[LeaderboardListener] Cleanup completato');
    },

    /**
     * Statistiche per debug
     */
    getStats() {
        return {
            subscribers: this._subscribers.size,
            isRealtime: this._isStarted,
            hasCachedData: this._cachedLeaderboard !== null,
            cacheAge: this._lastFetchTime ? Math.round((Date.now() - this._lastFetchTime) / 1000) + 's' : 'N/A'
        };
    }
};

console.log('[LeaderboardListener] Modulo caricato');
