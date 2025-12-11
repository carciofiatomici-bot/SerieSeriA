//
// ====================================================================
// LAZY-LOADER.JS - Caricamento Lazy dei Moduli JS
// ====================================================================
// Carica i moduli pesanti solo quando necessario per migliorare
// le performance iniziali dell'applicazione
//

window.LazyLoader = {
    // Moduli gia' caricati
    loaded: {},

    // Stato di caricamento in corso
    loading: {},

    // Definizione dei moduli e le loro dipendenze
    modules: {
        // Moduli Admin (pesanti, solo per admin)
        'admin': {
            scripts: ['admin.js', 'admin-ui.js'],
            dependencies: []
        },
        'admin-teams': {
            scripts: ['admin-teams.js'],
            dependencies: ['admin']
        },
        'admin-players': {
            scripts: ['admin-players.js'],
            dependencies: ['admin']
        },

        // Moduli Simulazione
        'simulazione': {
            scripts: ['simulazione.js'],
            dependencies: []
        },
        'match-replay': {
            scripts: ['match-replay-simple.js'],
            dependencies: ['simulazione']
        },

        // Moduli Campionato
        'campionato': {
            scripts: ['campionato-main.js', 'campionato-ui.js'],
            dependencies: ['simulazione']
        },

        // Moduli Coppa
        'coppa': {
            scripts: ['coppa-main.js'],
            dependencies: ['simulazione']
        },

        // Moduli Abilita'
        'abilities': {
            scripts: ['abilities-encyclopedia.js', 'abilities-encyclopedia-ui.js'],
            dependencies: []
        },

        // Moduli Statistiche
        'player-stats': {
            scripts: ['player-stats.js', 'player-stats-ui.js'],
            dependencies: []
        },

        // Moduli Draft
        'draft': {
            scripts: ['draft.js', 'draft-user-ui.js'],
            dependencies: []
        },

        // Moduli Mercato
        'mercato': {
            scripts: ['mercato.js'],
            dependencies: []
        },

        // Moduli Training
        'training': {
            scripts: ['training.js'],
            dependencies: ['simulazione']
        },

        // Moduli Sfide
        'challenges': {
            scripts: ['challenges.js'],
            dependencies: ['simulazione']
        }
    },

    /**
     * Carica un modulo con le sue dipendenze
     * @param {string} moduleName - Nome del modulo da caricare
     * @returns {Promise<boolean>} - true se caricato con successo
     */
    async load(moduleName) {
        // Se gia' caricato, ritorna subito
        if (this.loaded[moduleName]) {
            console.log(`LazyLoader: modulo '${moduleName}' gia' caricato`);
            return true;
        }

        // Se gia' in caricamento, attendi
        if (this.loading[moduleName]) {
            console.log(`LazyLoader: attendo caricamento '${moduleName}' in corso...`);
            return this.loading[moduleName];
        }

        const moduleConfig = this.modules[moduleName];
        if (!moduleConfig) {
            console.warn(`LazyLoader: modulo '${moduleName}' non trovato`);
            return false;
        }

        // Crea la promise di caricamento
        this.loading[moduleName] = this._loadModule(moduleName, moduleConfig);

        try {
            await this.loading[moduleName];
            this.loaded[moduleName] = true;
            delete this.loading[moduleName];
            console.log(`LazyLoader: modulo '${moduleName}' caricato con successo`);
            return true;
        } catch (error) {
            console.error(`LazyLoader: errore caricamento '${moduleName}'`, error);
            delete this.loading[moduleName];
            return false;
        }
    },

    /**
     * Logica interna di caricamento
     */
    async _loadModule(moduleName, config) {
        // Prima carica le dipendenze
        if (config.dependencies && config.dependencies.length > 0) {
            console.log(`LazyLoader: caricamento dipendenze per '${moduleName}':`, config.dependencies);
            for (const dep of config.dependencies) {
                await this.load(dep);
            }
        }

        // Poi carica gli script del modulo
        for (const script of config.scripts) {
            await this._loadScript(script);
        }
    },

    /**
     * Carica un singolo script
     * @param {string} scriptName - Nome del file JS
     * @returns {Promise}
     */
    _loadScript(scriptName) {
        return new Promise((resolve, reject) => {
            // Verifica se lo script e' gia' presente
            const existing = document.querySelector(`script[src="${scriptName}"]`);
            if (existing) {
                console.log(`LazyLoader: script '${scriptName}' gia' presente`);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = scriptName;
            script.async = true;

            script.onload = () => {
                console.log(`LazyLoader: script '${scriptName}' caricato`);
                resolve();
            };

            script.onerror = () => {
                reject(new Error(`Errore caricamento script: ${scriptName}`));
            };

            document.body.appendChild(script);
        });
    },

    /**
     * Precarica un modulo in background (senza bloccare)
     * @param {string} moduleName - Nome del modulo
     */
    preload(moduleName) {
        // Usa requestIdleCallback se disponibile, altrimenti setTimeout
        const scheduleLoad = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));

        scheduleLoad(() => {
            this.load(moduleName).catch(() => {
                // Ignora errori di preload silenziosamente
            });
        });
    },

    /**
     * Precarica multipli moduli
     * @param {string[]} moduleNames - Array di nomi moduli
     */
    preloadMultiple(moduleNames) {
        moduleNames.forEach(name => this.preload(name));
    },

    /**
     * Mostra uno spinner durante il caricamento
     * @param {string} containerId - ID del container dove mostrare lo spinner
     * @returns {Function} - Funzione per rimuovere lo spinner
     */
    showLoadingSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return () => {};

        const spinner = document.createElement('div');
        spinner.id = 'lazy-loading-spinner';
        spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
        spinner.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg shadow-xl text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto"></div>
                <p class="text-white mt-4">Caricamento modulo...</p>
            </div>
        `;

        document.body.appendChild(spinner);

        return () => {
            spinner.remove();
        };
    },

    /**
     * Carica un modulo con spinner
     * @param {string} moduleName - Nome del modulo
     * @param {string} containerId - ID container per spinner (opzionale)
     * @returns {Promise<boolean>}
     */
    async loadWithSpinner(moduleName, containerId = null) {
        const removeSpinner = containerId ? this.showLoadingSpinner(containerId) : () => {};

        try {
            const result = await this.load(moduleName);
            return result;
        } finally {
            removeSpinner();
        }
    },

    /**
     * Verifica se un modulo e' caricato
     * @param {string} moduleName - Nome del modulo
     * @returns {boolean}
     */
    isLoaded(moduleName) {
        return !!this.loaded[moduleName];
    },

    /**
     * Ottieni lista moduli caricati
     * @returns {string[]}
     */
    getLoadedModules() {
        return Object.keys(this.loaded);
    },

    /**
     * Wrapper per eseguire codice solo dopo che un modulo e' caricato
     * @param {string} moduleName - Nome del modulo richiesto
     * @param {Function} callback - Funzione da eseguire
     */
    async whenLoaded(moduleName, callback) {
        await this.load(moduleName);
        return callback();
    }
};

console.log("Modulo LazyLoader caricato.");
