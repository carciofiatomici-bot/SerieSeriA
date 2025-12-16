//
// ====================================================================
// CONFIG-LISTENER.JS - Listener Condiviso per Config Firestore
// ====================================================================
//
// OTTIMIZZAZIONE: Un solo listener onSnapshot per config/settings
// invece di 4 listener separati (draft-status-box, draft-user-ui,
// interfaccia-dashboard, mercato).
//
// Risparmio: ~600 reads/giorno (4 reads -> 1 read per ogni modifica)
//

window.ConfigListener = {
    // Stato interno
    _unsubscribe: null,
    _subscribers: new Map(),  // Map<id, {callback, filter}>
    _cachedConfig: null,
    _isStarted: false,
    _subscriberIdCounter: 0,

    /**
     * Registra un subscriber per ricevere aggiornamenti del config
     * @param {Function} callback - Funzione chiamata con (configData) ad ogni update
     * @param {Object} options - Opzioni: { filter: 'all' | 'draftOnly' | 'marketOnly' }
     * @returns {string} subscriberId - ID per unsubscribe
     */
    subscribe(callback, options = {}) {
        const id = `config_sub_${++this._subscriberIdCounter}`;

        this._subscribers.set(id, {
            callback: callback,
            filter: options.filter || 'all'
        });

        console.log(`[ConfigListener] Nuovo subscriber: ${id} (totale: ${this._subscribers.size})`);

        // Se abbiamo gia' dati in cache, notifica subito
        if (this._cachedConfig) {
            try {
                callback(this._cachedConfig);
            } catch (e) {
                console.error(`[ConfigListener] Errore callback iniziale ${id}:`, e);
            }
        }

        // Avvia listener se non ancora attivo
        if (!this._isStarted) {
            this.start();
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
            console.log(`[ConfigListener] Rimosso subscriber: ${subscriberId} (rimasti: ${this._subscribers.size})`);

            // Se non ci sono piu' subscriber, ferma il listener
            if (this._subscribers.size === 0) {
                this.stop();
            }
        }
    },

    /**
     * Avvia il listener real-time sul documento config/settings
     */
    start() {
        if (this._isStarted) {
            console.log('[ConfigListener] Gia avviato');
            return;
        }

        if (!window.db || !window.firestoreTools) {
            console.warn('[ConfigListener] Firestore non disponibile');
            return;
        }

        try {
            const { doc, onSnapshot } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const CONFIG_PATH = `artifacts/${appId}/public/data/config`;
            const configDocRef = doc(window.db, CONFIG_PATH, 'settings');

            this._unsubscribe = onSnapshot(configDocRef, (snapshot) => {
                if (!snapshot.exists()) {
                    console.warn('[ConfigListener] Config document non esiste');
                    return;
                }

                const newConfig = snapshot.data();
                const oldConfig = this._cachedConfig;
                this._cachedConfig = newConfig;

                // Notifica tutti i subscriber
                this._notifySubscribers(newConfig, oldConfig);

            }, (error) => {
                console.error('[ConfigListener] Errore listener:', error);
            });

            this._isStarted = true;
            console.log('[ConfigListener] Listener avviato');

        } catch (error) {
            console.error('[ConfigListener] Errore avvio:', error);
        }
    },

    /**
     * Ferma il listener
     */
    stop() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        this._isStarted = false;
        console.log('[ConfigListener] Listener fermato');
    },

    /**
     * Notifica tutti i subscriber
     */
    _notifySubscribers(newConfig, oldConfig) {
        for (const [id, subscriber] of this._subscribers.entries()) {
            try {
                // Applica filtro se specificato
                if (subscriber.filter === 'draftOnly') {
                    // Notifica solo se draft-related fields sono cambiati
                    if (this._hasDraftChanged(newConfig, oldConfig)) {
                        subscriber.callback(newConfig);
                    }
                } else if (subscriber.filter === 'marketOnly') {
                    // Notifica solo se market-related fields sono cambiati
                    if (this._hasMarketChanged(newConfig, oldConfig)) {
                        subscriber.callback(newConfig);
                    }
                } else {
                    // Notifica sempre
                    subscriber.callback(newConfig);
                }
            } catch (e) {
                console.error(`[ConfigListener] Errore notifica ${id}:`, e);
            }
        }
    },

    /**
     * Controlla se i campi draft sono cambiati
     */
    _hasDraftChanged(newConfig, oldConfig) {
        if (!oldConfig) return true;

        // Confronta campi rilevanti per il draft
        const newDraft = JSON.stringify({
            isDraftOpen: newConfig.isDraftOpen,
            draftTurns: newConfig.draftTurns
        });
        const oldDraft = JSON.stringify({
            isDraftOpen: oldConfig.isDraftOpen,
            draftTurns: oldConfig.draftTurns
        });

        return newDraft !== oldDraft;
    },

    /**
     * Controlla se i campi market sono cambiati
     */
    _hasMarketChanged(newConfig, oldConfig) {
        if (!oldConfig) return true;

        return newConfig.isMarketOpen !== oldConfig.isMarketOpen;
    },

    /**
     * Ottieni config dalla cache (senza query Firestore)
     * @returns {Object|null}
     */
    getConfig() {
        return this._cachedConfig;
    },

    /**
     * Forza un refresh del config
     */
    async refresh() {
        if (!window.db || !window.firestoreTools) return null;

        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const CONFIG_PATH = `artifacts/${appId}/public/data/config`;
            const configDocRef = doc(window.db, CONFIG_PATH, 'settings');

            const snapshot = await getDoc(configDocRef);
            if (snapshot.exists()) {
                this._cachedConfig = snapshot.data();
                return this._cachedConfig;
            }
        } catch (error) {
            console.error('[ConfigListener] Errore refresh:', error);
        }
        return null;
    },

    /**
     * Cleanup - da chiamare al logout
     */
    cleanup() {
        this.stop();
        this._subscribers.clear();
        this._cachedConfig = null;
        this._subscriberIdCounter = 0;
    }
};

console.log('[ConfigListener] Modulo caricato');
