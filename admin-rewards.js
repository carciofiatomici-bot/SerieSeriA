//
// ====================================================================
// MODULO ADMIN-REWARDS.JS (Gestione Reward CS/CSS/EXP)
// ====================================================================
//
// Permette di visualizzare e modificare i reward dell'app
// salvando le configurazioni in Firestore.
//

window.AdminRewards = {

    // ====================================================================
    // VALORI DEFAULT
    // ====================================================================
    DEFAULT_CONFIG: {
        // Reward CS - Partite
        rewardGoalCS: 5,
        rewardVittoriaCS: 25,

        // Reward CS - Fine Stagione Campionato
        rewardTop3CS: 150,
        rewardUltimi3CS: 200,
        rewardAltriCS: 100,

        // Reward CS - Coppa
        rewardCoppa234CS: 100,

        // Reward CSS - Competizioni
        rewardCampionatoCSS: 1,
        rewardCoppaCSS: 1,
        rewardSupercoppaCSS: 1,

        // Reward EXP - Giocatori
        expPartitaTitolare: 50,
        expPartitaPanchina: 10,
        expGoal: 30,
        expAssist: 20,
        expCleanSheetGK: 40,
        expCleanSheetDEF: 25,
        expVittoria: 20,
        expPareggio: 10,

        // Reward EXP - Allenatore
        expCoachVittoria: 100,

        // Reward EXP - Allenamento Minigioco
        expTrainingField: 40,   // EXP per successo (D, C, A)
        expTrainingGK: 20       // EXP per successo (P)
    },

    // Cache della configurazione corrente
    _config: null,

    // ====================================================================
    // GETTER CONFIGURAZIONE
    // ====================================================================

    getConfig() {
        return this._config || this.DEFAULT_CONFIG;
    },

    get(key) {
        const config = this.getConfig();
        return config[key] !== undefined ? config[key] : this.DEFAULT_CONFIG[key];
    },

    // ====================================================================
    // LOAD / SAVE FIRESTORE
    // ====================================================================

    async loadConfig() {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const configPath = `artifacts/${appId}/public/data/config`;

            const rewardsDocRef = doc(window.db, configPath, 'rewards');
            const rewardsDoc = await getDoc(rewardsDocRef);

            if (rewardsDoc.exists()) {
                const data = rewardsDoc.data();
                this._config = { ...this.DEFAULT_CONFIG, ...data };
                console.log('[AdminRewards] Configurazione caricata da Firestore');
            } else {
                this._config = { ...this.DEFAULT_CONFIG };
                console.log('[AdminRewards] Configurazione non trovata, uso default');
            }

            window.RewardsConfig = this._config;

            // Aggiorna la tabella premi nella homepage
            this.updateRewardsDisplay();

            return this._config;

        } catch (error) {
            console.error('[AdminRewards] Errore caricamento config:', error);
            this._config = { ...this.DEFAULT_CONFIG };
            window.RewardsConfig = this._config;
            this.updateRewardsDisplay();
            return this._config;
        }
    },

    async saveConfig(newConfig) {
        try {
            const { doc, setDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const configPath = `artifacts/${appId}/public/data/config`;

            const configToSave = {
                ...newConfig,
                lastUpdated: new Date().toISOString(),
                updatedBy: window.InterfacciaCore?.currentTeamId || 'admin'
            };

            const rewardsDocRef = doc(window.db, configPath, 'rewards');
            await setDoc(rewardsDocRef, configToSave);

            this._config = configToSave;
            window.RewardsConfig = this._config;

            // Aggiorna la tabella premi nella homepage
            this.updateRewardsDisplay();

            console.log('[AdminRewards] Configurazione salvata su Firestore');
            return true;

        } catch (error) {
            console.error('[AdminRewards] Errore salvataggio config:', error);
            return false;
        }
    },

    async resetToDefault() {
        return await this.saveConfig({ ...this.DEFAULT_CONFIG });
    },

    // ====================================================================
    // UI PANNELLO ADMIN
    // ====================================================================

    renderPanel(container) {
        if (!container) return;

        const config = this.getConfig();

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-emerald-400">Configurazione Reward</h3>
                    <div class="space-x-2">
                        <button id="btn-reset-rewards" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition">
                            Ripristina Default
                        </button>
                        <button id="btn-save-rewards" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition">
                            Salva Modifiche
                        </button>
                    </div>
                </div>

                <!-- Messaggio -->
                <div id="rewards-message" class="hidden p-3 rounded-lg text-center"></div>

                <!-- Sezione: Reward CS Partite -->
                <div class="bg-gray-700 p-4 rounded-lg border border-emerald-500">
                    <h4 class="text-lg font-bold text-emerald-400 mb-3">Reward CS - Partite</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Crediti guadagnati durante le partite di Campionato e Coppa
                    </p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">CS per Goal</label>
                            <input type="number" id="reward-rewardGoalCS" value="${config.rewardGoalCS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-emerald-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">CS per Vittoria</label>
                            <input type="number" id="reward-rewardVittoriaCS" value="${config.rewardVittoriaCS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-emerald-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Reward CS Fine Stagione -->
                <div class="bg-gray-700 p-4 rounded-lg border border-teal-500">
                    <h4 class="text-lg font-bold text-teal-400 mb-3">Reward CS - Fine Stagione</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Premi per posizione in classifica e coppa
                    </p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Top 3 Classifica</label>
                            <input type="number" id="reward-rewardTop3CS" value="${config.rewardTop3CS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-teal-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Ultimi 3 Classifica</label>
                            <input type="number" id="reward-rewardUltimi3CS" value="${config.rewardUltimi3CS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-teal-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Altre Posizioni</label>
                            <input type="number" id="reward-rewardAltriCS" value="${config.rewardAltriCS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-teal-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Coppa 2-3-4 posto</label>
                            <input type="number" id="reward-rewardCoppa234CS" value="${config.rewardCoppa234CS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-teal-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Reward CSS Competizioni -->
                <div class="bg-gray-700 p-4 rounded-lg border border-amber-500">
                    <h4 class="text-lg font-bold text-amber-400 mb-3">Reward CSS - Vincitori Competizioni</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Crediti Super Seri per i vincitori delle competizioni
                    </p>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Campionato</label>
                            <input type="number" id="reward-rewardCampionatoCSS" value="${config.rewardCampionatoCSS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Coppa</label>
                            <input type="number" id="reward-rewardCoppaCSS" value="${config.rewardCoppaCSS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Supercoppa</label>
                            <input type="number" id="reward-rewardSupercoppaCSS" value="${config.rewardSupercoppaCSS}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Reward EXP Giocatori -->
                <div class="bg-gray-700 p-4 rounded-lg border border-indigo-500">
                    <h4 class="text-lg font-bold text-indigo-400 mb-3">Reward EXP - Giocatori</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Esperienza guadagnata dai giocatori durante le partite
                    </p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Partita Titolare</label>
                            <input type="number" id="reward-expPartitaTitolare" value="${config.expPartitaTitolare}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Partita Panchina</label>
                            <input type="number" id="reward-expPartitaPanchina" value="${config.expPartitaPanchina}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Goal Segnato</label>
                            <input type="number" id="reward-expGoal" value="${config.expGoal}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Assist</label>
                            <input type="number" id="reward-expAssist" value="${config.expAssist}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Clean Sheet (P)</label>
                            <input type="number" id="reward-expCleanSheetGK" value="${config.expCleanSheetGK}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Clean Sheet (D)</label>
                            <input type="number" id="reward-expCleanSheetDEF" value="${config.expCleanSheetDEF}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Vittoria</label>
                            <input type="number" id="reward-expVittoria" value="${config.expVittoria}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Pareggio</label>
                            <input type="number" id="reward-expPareggio" value="${config.expPareggio}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-indigo-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Reward EXP Allenatore -->
                <div class="bg-gray-700 p-4 rounded-lg border border-pink-500">
                    <h4 class="text-lg font-bold text-pink-400 mb-3">Reward EXP - Allenatore</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Esperienza guadagnata dall'allenatore
                    </p>
                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">EXP per Vittoria</label>
                            <input type="number" id="reward-expCoachVittoria" value="${config.expCoachVittoria}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-pink-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Reward EXP Allenamento Minigioco -->
                <div class="bg-gray-700 p-4 rounded-lg border border-purple-500">
                    <h4 class="text-lg font-bold text-purple-400 mb-3">Reward EXP - Allenamento Minigioco</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Esperienza guadagnata tramite il minigioco di allenamento (per successo)
                    </p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">EXP Giocatori Campo (D, C, A)</label>
                            <input type="number" id="reward-expTrainingField" value="${config.expTrainingField}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">EXP Portiere (P)</label>
                            <input type="number" id="reward-expTrainingGK" value="${config.expTrainingGK}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500">
                        </div>
                    </div>
                </div>

                <!-- Info ultimo aggiornamento -->
                ${config.lastUpdated ? `
                    <p class="text-xs text-gray-500 text-right">
                        Ultimo aggiornamento: ${new Date(config.lastUpdated).toLocaleString('it-IT')}
                    </p>
                ` : ''}
            </div>
        `;

        this.attachEventListeners(container);
    },

    attachEventListeners(container) {
        const saveBtn = container.querySelector('#btn-save-rewards');
        const resetBtn = container.querySelector('#btn-reset-rewards');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSave(container));
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset(container));
        }
    },

    collectFormValues() {
        const fields = [
            'rewardGoalCS', 'rewardVittoriaCS',
            'rewardTop3CS', 'rewardUltimi3CS', 'rewardAltriCS', 'rewardCoppa234CS',
            'rewardCampionatoCSS', 'rewardCoppaCSS', 'rewardSupercoppaCSS',
            'expPartitaTitolare', 'expPartitaPanchina', 'expGoal', 'expAssist',
            'expCleanSheetGK', 'expCleanSheetDEF', 'expVittoria', 'expPareggio',
            'expCoachVittoria',
            'expTrainingField', 'expTrainingGK'
        ];

        const config = {};

        // Raccogli i campi numerici
        fields.forEach(field => {
            const input = document.getElementById(`reward-${field}`);
            if (input) {
                config[field] = parseInt(input.value, 10) || 0;
            }
        });

        return config;
    },

    showMessage(container, message, type = 'success') {
        const msgEl = container.querySelector('#rewards-message');
        if (!msgEl) return;

        msgEl.textContent = message;
        msgEl.className = `p-3 rounded-lg text-center ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
        msgEl.classList.remove('hidden');

        setTimeout(() => {
            msgEl.classList.add('hidden');
        }, 3000);
    },

    async handleSave(container) {
        const newConfig = this.collectFormValues();
        const success = await this.saveConfig(newConfig);

        if (success) {
            this.showMessage(container, 'Configurazione salvata con successo!', 'success');
        } else {
            this.showMessage(container, 'Errore nel salvataggio. Riprova.', 'error');
        }
    },

    async handleReset(container) {
        if (!confirm('Sei sicuro di voler ripristinare tutti i valori default?')) {
            return;
        }

        const success = await this.resetToDefault();

        if (success) {
            this.renderPanel(container);
            this.showMessage(container, 'Valori default ripristinati!', 'success');
        } else {
            this.showMessage(container, 'Errore nel ripristino. Riprova.', 'error');
        }
    },

    // ====================================================================
    // AGGIORNAMENTO UI TABELLA PREMI
    // ====================================================================

    /**
     * Aggiorna i valori nella tabella premi della homepage
     * Chiamato quando la configurazione viene caricata o modificata
     */
    updateRewardsDisplay() {
        const config = this._config || window.RewardsConfig || this.DEFAULT_CONFIG;

        // Campionato
        const campCss = document.getElementById('reward-camp-css');
        const campWin = document.getElementById('reward-camp-win');
        const campGoal = document.getElementById('reward-camp-goal');
        const campTop3 = document.getElementById('reward-camp-top3');
        const campLast3 = document.getElementById('reward-camp-last3');

        if (campCss) campCss.textContent = `${config.rewardCampionatoCSS || 1} CSS`;
        if (campWin) campWin.textContent = `${config.rewardVittoriaCS || 25} CS`;
        if (campGoal) campGoal.textContent = `${config.rewardGoalCS || 5} CS`;
        if (campTop3) campTop3.textContent = `${config.rewardTop3CS || 150} CS`;
        if (campLast3) campLast3.textContent = `${config.rewardUltimi3CS || 200} CS`;

        // Coppa
        const coppaCss = document.getElementById('reward-coppa-css');
        const coppaWin = document.getElementById('reward-coppa-win');
        const coppaGoal = document.getElementById('reward-coppa-goal');
        const coppa234 = document.getElementById('reward-coppa-234');

        if (coppaCss) coppaCss.textContent = `${config.rewardCoppaCSS || 1} CSS`;
        if (coppaWin) coppaWin.textContent = `${config.rewardVittoriaCS || 25} CS`;
        if (coppaGoal) coppaGoal.textContent = `${config.rewardGoalCS || 5} CS`;
        if (coppa234) coppa234.textContent = `${config.rewardCoppa234CS || 100} CS`;

        // Supercoppa
        const superCss = document.getElementById('reward-super-css');
        if (superCss) superCss.textContent = `${config.rewardSupercoppaCSS || 1} CSS`;

        console.log('[AdminRewards] Tabella premi aggiornata');
    },

    // ====================================================================
    // INIZIALIZZAZIONE
    // ====================================================================

    async init() {
        await this.loadConfig();
        console.log('[AdminRewards] Modulo inizializzato');
    }
};

// Esponi globalmente la configurazione per accesso rapido
window.RewardsConfig = window.AdminRewards.DEFAULT_CONFIG;

console.log("Modulo admin-rewards.js caricato.");
