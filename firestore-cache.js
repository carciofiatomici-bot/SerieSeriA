//
// ====================================================================
// FIRESTORE-CACHE.JS - Sistema Cache per Ridurre Letture Firestore
// ====================================================================
//
// Implementa caching locale per ridurre il numero di letture Firestore
// e evitare di superare la quota gratuita.
//

window.FirestoreCache = {

    // Configurazione TTL (Time To Live) in millisecondi
    TTL: {
        TEAM_DATA: 60 * 1000,           // 1 minuto per dati squadra
        TEAM_LIST: 2 * 60 * 1000,       // 2 minuti per lista squadre
        CONFIG: 5 * 60 * 1000,          // 5 minuti per configurazioni
        PLAYERS: 5 * 60 * 1000,         // 5 minuti per giocatori draft/mercato
        LEADERBOARD: 2 * 60 * 1000,     // 2 minuti per classifica
        SCHEDULE: 5 * 60 * 1000,        // 5 minuti per calendario
        SHORT: 30 * 1000,               // 30 secondi per dati volatili
        VERY_SHORT: 10 * 1000           // 10 secondi per dati molto volatili
    },

    // Storage interno
    cache: new Map(),

    // Statistiche
    stats: {
        hits: 0,
        misses: 0,
        saves: 0
    },

    /**
     * Genera chiave cache
     */
    makeKey(type, id) {
        return `${type}:${id || 'default'}`;
    },

    /**
     * Salva in cache
     */
    set(type, id, data, ttl = null) {
        const key = this.makeKey(type, id);
        const expiry = Date.now() + (ttl || this.TTL.TEAM_DATA);

        this.cache.set(key, {
            data: JSON.parse(JSON.stringify(data)), // Deep clone
            expiry: expiry,
            savedAt: Date.now()
        });

        this.stats.saves++;

        // Salva anche in localStorage per persistenza
        try {
            const storageKey = `fsc_${key}`;
            localStorage.setItem(storageKey, JSON.stringify({
                data: data,
                expiry: expiry
            }));
        } catch (e) {
            // localStorage pieno o non disponibile
        }

        return data;
    },

    /**
     * Recupera da cache
     */
    get(type, id) {
        const key = this.makeKey(type, id);

        // Prima controlla memoria
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() < cached.expiry) {
                this.stats.hits++;
                return cached.data;
            } else {
                this.cache.delete(key);
            }
        }

        // Poi controlla localStorage
        try {
            const storageKey = `fsc_${key}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Date.now() < parsed.expiry) {
                    // Ripristina in memoria
                    this.cache.set(key, {
                        data: parsed.data,
                        expiry: parsed.expiry,
                        savedAt: Date.now()
                    });
                    this.stats.hits++;
                    return parsed.data;
                } else {
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (e) {
            // Errore parsing
        }

        this.stats.misses++;
        return null;
    },

    /**
     * Verifica se esiste in cache (non scaduto)
     */
    has(type, id) {
        return this.get(type, id) !== null;
    },

    /**
     * Invalida cache specifica
     */
    invalidate(type, id) {
        const key = this.makeKey(type, id);
        this.cache.delete(key);

        try {
            localStorage.removeItem(`fsc_${key}`);
        } catch (e) {}
    },

    /**
     * Invalida tutte le cache di un tipo
     */
    invalidateType(type) {
        const prefix = `${type}:`;

        // Memoria
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }

        // localStorage
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`fsc_${prefix}`)) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {}
    },

    /**
     * Pulisci tutta la cache
     */
    clear() {
        this.cache.clear();

        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('fsc_')) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {}

        this.stats = { hits: 0, misses: 0, saves: 0 };
    },

    /**
     * Pulisci cache scadute
     */
    cleanup() {
        const now = Date.now();

        // Memoria
        for (const [key, value] of this.cache.entries()) {
            if (now >= value.expiry) {
                this.cache.delete(key);
            }
        }

        // localStorage
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('fsc_')) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (now >= parsed.expiry) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            }
        } catch (e) {}
    },

    /**
     * Wrapper per getDoc con cache
     */
    async getDoc(docRef, type, id, ttl = null) {
        // Controlla cache
        const cached = this.get(type, id);
        if (cached !== null) {
            console.log(`[Cache] HIT: ${type}:${id}`);
            return { exists: () => true, data: () => cached, id: id, fromCache: true };
        }

        // Fetch da Firestore
        console.log(`[Cache] MISS: ${type}:${id} - fetching from Firestore`);
        const { getDoc } = window.firestoreTools;
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            this.set(type, id, snap.data(), ttl);
        }

        return snap;
    },

    /**
     * Mostra statistiche cache
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : 0;

        return {
            ...this.stats,
            total: total,
            hitRate: `${hitRate}%`,
            cacheSize: this.cache.size
        };
    },

    /**
     * Log statistiche in console
     */
    logStats() {
        const stats = this.getStats();
        console.log(`[Cache Stats] Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${stats.hitRate}, Size: ${stats.cacheSize}`);
    }
};

// Cleanup automatico ogni 5 minuti
setInterval(() => {
    window.FirestoreCache.cleanup();
}, 5 * 60 * 1000);

// Log stats ogni 2 minuti (solo in development)
setInterval(() => {
    if (window.FirestoreCache.stats.hits + window.FirestoreCache.stats.misses > 0) {
        window.FirestoreCache.logStats();
    }
}, 2 * 60 * 1000);

// ====================================================================
// UTILITY DEBOUNCE E THROTTLE
// ====================================================================

/**
 * Debounce: ritarda l'esecuzione fino a quando non smette di essere chiamata
 */
window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle: limita l'esecuzione a una volta ogni X millisecondi
 */
window.throttle = function(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Throttle con trailing call: esegue anche l'ultima chiamata
 */
window.throttleWithTrailing = function(func, limit) {
    let inThrottle;
    let lastArgs;

    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    func.apply(this, lastArgs);
                    lastArgs = null;
                }
            }, limit);
        } else {
            lastArgs = args;
        }
    };
};

console.log("Modulo FirestoreCache caricato.");
