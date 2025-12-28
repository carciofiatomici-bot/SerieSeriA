//
// ====================================================================
// LISTENER-MANAGER.JS - Gestione Ottimizzata Listener Firestore
// ====================================================================
//
// Centralizza la gestione dei listener per:
// - Evitare listener duplicati
// - Disattivare listener non necessari
// - Ridurre il consumo di quota Firestore
//

window.ListenerManager = {

    // Registry dei listener attivi
    listeners: new Map(),

    // Configurazione
    config: {
        // Listener da disattivare quando l'utente e' inattivo
        pauseOnInactive: true,
        inactiveTimeout: 5 * 60 * 1000, // 5 minuti di inattivita'
    },

    // Stato
    state: {
        isActive: true,
        lastActivity: Date.now(),
        pausedListeners: []
    },

    /**
     * Registra un nuovo listener
     */
    register(name, unsubscribeFn, options = {}) {
        // Se esiste gia', prima disiscriviti
        if (this.listeners.has(name)) {
            this.unregister(name);
        }

        this.listeners.set(name, {
            unsubscribe: unsubscribeFn,
            createdAt: Date.now(),
            priority: options.priority || 'normal', // 'critical', 'normal', 'low'
            pausable: options.pausable !== false, // default true
            screen: options.screen || null // schermata associata
        });

        console.log(`[ListenerManager] Registrato: ${name} (tot: ${this.listeners.size})`);
    },

    /**
     * Rimuovi e disiscriviti da un listener
     */
    unregister(name) {
        const listener = this.listeners.get(name);
        if (listener) {
            try {
                listener.unsubscribe();
            } catch (e) {
                console.warn(`[ListenerManager] Errore unsubscribe ${name}:`, e);
            }
            this.listeners.delete(name);
            console.log(`[ListenerManager] Rimosso: ${name} (tot: ${this.listeners.size})`);
        }
    },

    /**
     * Rimuovi tutti i listener di una schermata
     */
    unregisterScreen(screen) {
        for (const [name, listener] of this.listeners.entries()) {
            if (listener.screen === screen) {
                this.unregister(name);
            }
        }
    },

    /**
     * Rimuovi tutti i listener con priorita' bassa
     */
    unregisterLowPriority() {
        for (const [name, listener] of this.listeners.entries()) {
            if (listener.priority === 'low') {
                this.unregister(name);
            }
        }
    },

    /**
     * Rimuovi tutti i listener (logout o cleanup)
     */
    unregisterAll() {
        for (const [name] of this.listeners.entries()) {
            this.unregister(name);
        }
        console.log(`[ListenerManager] Tutti i listener rimossi`);
    },

    /**
     * Pausa listener non critici (quando utente inattivo)
     */
    pauseNonCritical() {
        if (!this.config.pauseOnInactive) return;

        for (const [name, listener] of this.listeners.entries()) {
            if (listener.pausable && listener.priority !== 'critical') {
                try {
                    listener.unsubscribe();
                    this.state.pausedListeners.push({ name, listener });
                    this.listeners.delete(name);
                } catch (e) {}
            }
        }

        if (this.state.pausedListeners.length > 0) {
            console.log(`[ListenerManager] Pausati ${this.state.pausedListeners.length} listener per inattivita'`);
        }
    },

    /**
     * Riprendi listener pausati
     */
    resumePaused() {
        // I listener devono essere ricreati dalle rispettive funzioni
        // Qui resettiamo solo lo stato
        this.state.pausedListeners = [];
        this.state.isActive = true;
        console.log(`[ListenerManager] Listener riattivati`);
    },

    /**
     * Registra attivita' utente
     */
    recordActivity() {
        this.state.lastActivity = Date.now();

        if (!this.state.isActive) {
            this.state.isActive = true;
            // Trigger evento per ricaricare listener
            window.dispatchEvent(new CustomEvent('userReactivated'));
        }
    },

    /**
     * Controlla inattivita'
     */
    checkInactivity() {
        if (!this.config.pauseOnInactive) return;

        const inactive = Date.now() - this.state.lastActivity > this.config.inactiveTimeout;

        if (inactive && this.state.isActive) {
            this.state.isActive = false;
            this.pauseNonCritical();
        }
    },

    /**
     * Ottieni statistiche
     */
    getStats() {
        const byPriority = { critical: 0, normal: 0, low: 0 };
        const byScreen = {};

        for (const [name, listener] of this.listeners.entries()) {
            byPriority[listener.priority] = (byPriority[listener.priority] || 0) + 1;
            const screen = listener.screen || 'global';
            byScreen[screen] = (byScreen[screen] || 0) + 1;
        }

        return {
            total: this.listeners.size,
            byPriority,
            byScreen,
            paused: this.state.pausedListeners.length,
            isActive: this.state.isActive
        };
    },

    /**
     * Log statistiche
     */
    logStats() {
        const stats = this.getStats();
        console.log(`[ListenerManager] Active: ${stats.total}, Paused: ${stats.paused}, User Active: ${stats.isActive}`);
        console.log(`[ListenerManager] By Priority:`, stats.byPriority);
    },

    /**
     * Inizializza tracking attivita'
     */
    init() {
        // Eventi attivita' utente
        ['click', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.recordActivity(), { passive: true });
        });

        // Controlla inattivita' ogni minuto
        this._inactivityInterval = setInterval(() => this.checkInactivity(), 60 * 1000);

        // Cleanup on logout
        document.addEventListener('userLoggedOut', () => {
            if (this._inactivityInterval) {
                clearInterval(this._inactivityInterval);
                this._inactivityInterval = null;
            }
        });

        // Pausa quando tab non visibile
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseNonCritical();
            } else {
                this.recordActivity();
                window.dispatchEvent(new CustomEvent('userReactivated'));
            }
        });

        console.log("[ListenerManager] Inizializzato");
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.ListenerManager.init();
});

console.log("Modulo ListenerManager caricato.");
