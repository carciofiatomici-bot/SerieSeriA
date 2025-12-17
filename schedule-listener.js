//
// ====================================================================
// SCHEDULE-LISTENER.JS - Listener Condiviso per Calendario Firestore
// ====================================================================
//
// OTTIMIZZAZIONE: Un solo listener/cache per il calendario
// invece di letture multiple da vari moduli (campionato-main,
// campionato, campionato-schedule, user-competitions, ecc.)
//
// Risparmio stimato: ~300-400 reads/giorno
//

window.ScheduleListener = {
    // Stato interno
    _unsubscribe: null,
    _subscribers: new Map(),
    _cachedSchedule: null,
    _isStarted: false,
    _subscriberIdCounter: 0,
    _lastFetchTime: 0,
    _minFetchInterval: 30 * 1000, // Minimo 30 secondi tra fetch

    // Costanti
    SCHEDULE_DOC_ID: 'full_schedule',

    /**
     * Ottiene il path della collection schedule
     */
    _getSchedulePath() {
        const appId = window.firestoreTools?.appId || 'default-app-id';
        return `artifacts/${appId}/public/data/schedule`;
    },

    /**
     * Registra un subscriber per ricevere aggiornamenti del calendario
     * @param {Function} callback - Funzione chiamata con (scheduleData) ad ogni update
     * @param {Object} options - Opzioni: { useRealtime: false }
     * @returns {string} subscriberId - ID per unsubscribe
     */
    subscribe(callback, options = {}) {
        const id = `schedule_sub_${++this._subscriberIdCounter}`;

        this._subscribers.set(id, {
            callback: callback,
            useRealtime: options.useRealtime || false
        });

        console.log(`[ScheduleListener] Nuovo subscriber: ${id} (totale: ${this._subscribers.size})`);

        // Se abbiamo dati in cache, notifica subito
        if (this._cachedSchedule) {
            try {
                callback(this._cachedSchedule);
            } catch (e) {
                console.error(`[ScheduleListener] Errore callback iniziale ${id}:`, e);
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
            console.log(`[ScheduleListener] Rimosso subscriber: ${subscriberId} (rimasti: ${this._subscribers.size})`);

            // Se non ci sono piu' subscriber realtime, ferma il listener
            const hasRealtimeSubscribers = Array.from(this._subscribers.values())
                .some(sub => sub.useRealtime);

            if (!hasRealtimeSubscribers && this._isStarted) {
                this.stopRealtime();
            }
        }
    },

    /**
     * Avvia il listener real-time sul calendario
     * Usare solo se necessario (es. schermata calendario aperta)
     */
    startRealtime() {
        if (this._isStarted) {
            console.log('[ScheduleListener] Realtime gia avviato');
            return;
        }

        if (!window.db || !window.firestoreTools) {
            console.warn('[ScheduleListener] Firestore non disponibile');
            return;
        }

        try {
            const { doc, onSnapshot } = window.firestoreTools;
            const schedulePath = this._getSchedulePath();
            const scheduleDocRef = doc(window.db, schedulePath, this.SCHEDULE_DOC_ID);

            this._unsubscribe = onSnapshot(scheduleDocRef, (snapshot) => {
                if (!snapshot.exists()) {
                    console.warn('[ScheduleListener] Calendario non esiste');
                    this._cachedSchedule = null;
                    return;
                }

                const newData = snapshot.data();
                this._cachedSchedule = newData;
                this._lastFetchTime = Date.now();

                // Notifica tutti i subscriber
                this._notifySubscribers(newData);

            }, (error) => {
                console.error('[ScheduleListener] Errore listener:', error);
            });

            this._isStarted = true;
            console.log('[ScheduleListener] Realtime listener avviato');

        } catch (error) {
            console.error('[ScheduleListener] Errore avvio realtime:', error);
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
        console.log('[ScheduleListener] Realtime listener fermato');
    },

    /**
     * Notifica tutti i subscriber
     */
    _notifySubscribers(scheduleData) {
        for (const [id, subscriber] of this._subscribers.entries()) {
            try {
                subscriber.callback(scheduleData);
            } catch (e) {
                console.error(`[ScheduleListener] Errore notifica ${id}:`, e);
            }
        }
    },

    /**
     * Ottieni il calendario (con cache intelligente)
     * Questo e' il metodo principale da usare nei moduli
     * @param {boolean} forceRefresh - Se true, forza il refresh da Firestore
     * @returns {Promise<Object|null>} Dati calendario
     */
    async getSchedule(forceRefresh = false) {
        // Se abbiamo cache valida e non forzato, restituisci cache
        const now = Date.now();
        const cacheAge = now - this._lastFetchTime;
        const cacheTTL = window.FirestoreCache?.TTL?.SCHEDULE || 15 * 60 * 1000;

        if (!forceRefresh && this._cachedSchedule && cacheAge < cacheTTL) {
            console.log('[ScheduleListener] Cache HIT - calendario dalla cache');
            return this._cachedSchedule;
        }

        // Throttle: evita fetch troppo frequenti
        if (!forceRefresh && cacheAge < this._minFetchInterval) {
            console.log('[ScheduleListener] Throttled - troppo presto per nuovo fetch');
            return this._cachedSchedule;
        }

        // Fetch da Firestore
        return await this.refresh();
    },

    /**
     * Forza un refresh del calendario da Firestore
     * @returns {Promise<Object|null>}
     */
    async refresh() {
        if (!window.db || !window.firestoreTools) {
            console.warn('[ScheduleListener] Firestore non disponibile');
            return null;
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const schedulePath = this._getSchedulePath();
            const scheduleDocRef = doc(window.db, schedulePath, this.SCHEDULE_DOC_ID);

            console.log('[ScheduleListener] Fetching calendario da Firestore...');
            const snapshot = await getDoc(scheduleDocRef);

            if (snapshot.exists()) {
                this._cachedSchedule = snapshot.data();
                this._lastFetchTime = Date.now();

                // Notifica subscriber se ci sono
                if (this._subscribers.size > 0) {
                    this._notifySubscribers(this._cachedSchedule);
                }

                return this._cachedSchedule;
            } else {
                console.warn('[ScheduleListener] Documento calendario non trovato');
                return null;
            }

        } catch (error) {
            console.error('[ScheduleListener] Errore refresh:', error);
            return this._cachedSchedule; // Ritorna cache se disponibile
        }
    },

    /**
     * Ottieni calendario dalla cache senza fetch
     * @returns {Object|null}
     */
    getCached() {
        return this._cachedSchedule;
    },

    /**
     * Verifica se la cache e' valida
     * @returns {boolean}
     */
    hasCachedData() {
        return this._cachedSchedule !== null;
    },

    /**
     * Invalida la cache (forza refresh al prossimo getSchedule)
     */
    invalidateCache() {
        this._lastFetchTime = 0;
        console.log('[ScheduleListener] Cache invalidata');
    },

    /**
     * Cleanup - da chiamare al logout o cambio schermata
     */
    cleanup() {
        this.stopRealtime();
        this._subscribers.clear();
        this._cachedSchedule = null;
        this._lastFetchTime = 0;
        this._subscriberIdCounter = 0;
        console.log('[ScheduleListener] Cleanup completato');
    },

    /**
     * Statistiche per debug
     */
    getStats() {
        return {
            subscribers: this._subscribers.size,
            isRealtime: this._isStarted,
            hasCachedData: this._cachedSchedule !== null,
            cacheAge: this._lastFetchTime ? Math.round((Date.now() - this._lastFetchTime) / 1000) + 's' : 'N/A'
        };
    },

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Trova la prossima giornata da giocare
     * @returns {Object|null} { roundIndex, round, matches }
     */
    getNextRound() {
        if (!this._cachedSchedule?.matches) return null;

        const schedule = this._cachedSchedule.matches;
        for (let i = 0; i < schedule.length; i++) {
            const round = schedule[i];
            const hasUnplayed = round.matches?.some(m => m.result === null);
            if (hasUnplayed) {
                return {
                    roundIndex: i,
                    round: round,
                    matches: round.matches
                };
            }
        }
        return null; // Tutte le giornate giocate
    },

    /**
     * Trova la giornata corrente (ultima giocata parzialmente o prossima)
     * @returns {Object|null}
     */
    getCurrentRound() {
        if (!this._cachedSchedule?.matches) return null;

        const schedule = this._cachedSchedule.matches;
        for (let i = 0; i < schedule.length; i++) {
            const round = schedule[i];
            const hasUnplayed = round.matches?.some(m => m.result === null);
            if (hasUnplayed) {
                return {
                    roundIndex: i,
                    roundNumber: round.round || i + 1,
                    round: round,
                    matches: round.matches
                };
            }
        }
        // Tutto giocato - ritorna ultima giornata
        if (schedule.length > 0) {
            const lastRound = schedule[schedule.length - 1];
            return {
                roundIndex: schedule.length - 1,
                roundNumber: lastRound.round || schedule.length,
                round: lastRound,
                matches: lastRound.matches
            };
        }
        return null;
    },

    /**
     * Conta le giornate giocate
     * @returns {number}
     */
    getPlayedRoundsCount() {
        if (!this._cachedSchedule?.matches) return 0;

        let count = 0;
        for (const round of this._cachedSchedule.matches) {
            const allPlayed = round.matches?.every(m => m.result !== null);
            if (allPlayed) count++;
            else break;
        }
        return count;
    },

    /**
     * Ottieni tutte le partite di una squadra
     * @param {string} teamId - ID della squadra
     * @returns {Array}
     */
    getTeamMatches(teamId) {
        if (!this._cachedSchedule?.matches) return [];

        const matches = [];
        this._cachedSchedule.matches.forEach((round, roundIndex) => {
            round.matches?.forEach(match => {
                if (match.homeId === teamId || match.awayId === teamId) {
                    matches.push({
                        ...match,
                        roundIndex,
                        roundNumber: round.round || roundIndex + 1,
                        isHome: match.homeId === teamId
                    });
                }
            });
        });
        return matches;
    }
};

console.log('[ScheduleListener] Modulo caricato');
