//
// ====================================================================
// MODULO ADMIN-FORMULAS.JS (Gestione Formule Costi)
// ====================================================================
//
// Permette di visualizzare e modificare le formule di costo dell'app
// salvando le configurazioni in Firestore.
//

window.AdminFormulas = {

    // ====================================================================
    // VALORI DEFAULT (usati se Firestore non disponibile)
    // ====================================================================
    DEFAULT_CONFIG: {
        // Costo Giocatori (CS)
        baseCostoGiocatore: 100,
        moltiplicatoreLivello: 10,
        moltiplicatoreAbilita: 50,
        penalitaNegativa: 25,

        // Costo Oggetti (CS)
        baseCostoOggetto: 150,
        moltiplicatoreBonusOggetto: 100,

        // Potenziamento (CSS)
        costoBaseIcona: 5,
        maxLevelGiocatore: 20,
        maxLevelIcona: 25,

        // Costo Abilita (CSS)
        costoAbilitaComune: 2,
        costoAbilitaRara: 4,
        costoAbilitaEpica: 6,
        costoAbilitaLeggendaria: 8,

        // Conversione CSS -> CS
        cssToCsRate: 1000,
        costoConversione: 1,

        // Rimozione Abilita (CSS)
        costoBaseRimozionePositiva: 5,
        moltiplicatoreRaritaRimozione: 2,
        costoBaseRimozioneNegativa: 5
    },

    // Cache della configurazione corrente
    _config: null,

    // ====================================================================
    // GETTER CONFIGURAZIONE
    // ====================================================================

    /**
     * Ottiene la configurazione corrente (cached o default)
     * @returns {Object} Configurazione formule
     */
    getConfig() {
        return this._config || this.DEFAULT_CONFIG;
    },

    /**
     * Ottiene un singolo valore dalla configurazione
     * @param {string} key - Chiave del parametro
     * @returns {number} Valore del parametro
     */
    get(key) {
        const config = this.getConfig();
        return config[key] !== undefined ? config[key] : this.DEFAULT_CONFIG[key];
    },

    // ====================================================================
    // LOAD / SAVE FIRESTORE
    // ====================================================================

    /**
     * Carica la configurazione da Firestore
     * @returns {Promise<Object>} Configurazione caricata
     */
    async loadConfig() {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const configPath = `artifacts/${appId}/public/data/config`;

            const formulasDocRef = doc(window.db, configPath, 'formulas');
            const formulasDoc = await getDoc(formulasDocRef);

            if (formulasDoc.exists()) {
                const data = formulasDoc.data();
                // Merge con default per eventuali campi mancanti
                this._config = { ...this.DEFAULT_CONFIG, ...data };
                console.log('[AdminFormulas] Configurazione caricata da Firestore');
            } else {
                // Usa default se non esiste
                this._config = { ...this.DEFAULT_CONFIG };
                console.log('[AdminFormulas] Configurazione non trovata, uso default');
            }

            // Esponi globalmente per le altre funzioni
            window.FormulasConfig = this._config;
            return this._config;

        } catch (error) {
            console.error('[AdminFormulas] Errore caricamento config:', error);
            this._config = { ...this.DEFAULT_CONFIG };
            window.FormulasConfig = this._config;
            return this._config;
        }
    },

    /**
     * Salva la configurazione su Firestore
     * @param {Object} newConfig - Nuova configurazione da salvare
     * @returns {Promise<boolean>} true se salvato con successo
     */
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

            const formulasDocRef = doc(window.db, configPath, 'formulas');
            await setDoc(formulasDocRef, configToSave);

            // Aggiorna cache locale
            this._config = configToSave;
            window.FormulasConfig = this._config;

            console.log('[AdminFormulas] Configurazione salvata su Firestore');
            return true;

        } catch (error) {
            console.error('[AdminFormulas] Errore salvataggio config:', error);
            return false;
        }
    },

    /**
     * Ripristina i valori default e salva su Firestore
     * @returns {Promise<boolean>}
     */
    async resetToDefault() {
        return await this.saveConfig({ ...this.DEFAULT_CONFIG });
    },

    // ====================================================================
    // UI PANNELLO ADMIN
    // ====================================================================

    /**
     * Renderizza il pannello delle formule
     * @param {HTMLElement} container - Container dove renderizzare
     */
    renderPanel(container) {
        if (!container) return;

        const config = this.getConfig();

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-yellow-400">Configurazione Formule Costi</h3>
                    <div class="space-x-2">
                        <button id="btn-reset-formulas" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition">
                            Ripristina Default
                        </button>
                        <button id="btn-save-formulas" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition">
                            Salva Modifiche
                        </button>
                    </div>
                </div>

                <!-- Messaggio -->
                <div id="formulas-message" class="hidden p-3 rounded-lg text-center"></div>

                <!-- Sezione: Costo Giocatori CS -->
                <div class="bg-gray-700 p-4 rounded-lg border border-blue-500">
                    <h4 class="text-lg font-bold text-blue-400 mb-3">Costo Giocatori (CS)</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Formula: <code class="bg-gray-800 px-2 py-1 rounded">COSTO = base + (lv x molt) + (rarita x ab) - (neg x negative)</code>
                    </p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Base</label>
                            <input type="number" id="formula-baseCostoGiocatore" value="${config.baseCostoGiocatore}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Molt. Livello</label>
                            <input type="number" id="formula-moltiplicatoreLivello" value="${config.moltiplicatoreLivello}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Molt. Abilita</label>
                            <input type="number" id="formula-moltiplicatoreAbilita" value="${config.moltiplicatoreAbilita}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Penalita Neg.</label>
                            <input type="number" id="formula-penalitaNegativa" value="${config.penalitaNegativa}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Costo Oggetti CS -->
                <div class="bg-gray-700 p-4 rounded-lg border border-purple-500">
                    <h4 class="text-lg font-bold text-purple-400 mb-3">Costo Oggetti (CS)</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Formula: <code class="bg-gray-800 px-2 py-1 rounded">COSTO = base + (bonus x molt)</code>
                    </p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Base Oggetto</label>
                            <input type="number" id="formula-baseCostoOggetto" value="${config.baseCostoOggetto}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Molt. Bonus</label>
                            <input type="number" id="formula-moltiplicatoreBonusOggetto" value="${config.moltiplicatoreBonusOggetto}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Potenziamento CSS -->
                <div class="bg-gray-700 p-4 rounded-lg border border-yellow-500">
                    <h4 class="text-lg font-bold text-yellow-400 mb-3">Potenziamento Giocatori (CSS)</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Normali: <code class="bg-gray-800 px-2 py-1 rounded">COSTO = livello_raggiunto</code> |
                        Icone: <code class="bg-gray-800 px-2 py-1 rounded">COSTO = base + livello_attuale</code>
                    </p>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Base Icona</label>
                            <input type="number" id="formula-costoBaseIcona" value="${config.costoBaseIcona}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-yellow-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Max Lv Giocatore</label>
                            <input type="number" id="formula-maxLevelGiocatore" value="${config.maxLevelGiocatore}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-yellow-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Max Lv Icona</label>
                            <input type="number" id="formula-maxLevelIcona" value="${config.maxLevelIcona}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-yellow-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Costo Abilita CSS -->
                <div class="bg-gray-700 p-4 rounded-lg border border-green-500">
                    <h4 class="text-lg font-bold text-green-400 mb-3">Costo Abilita (CSS)</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        Costo per assegnare un'abilita a un giocatore
                    </p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Comune</label>
                            <input type="number" id="formula-costoAbilitaComune" value="${config.costoAbilitaComune}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-green-500">
                        </div>
                        <div>
                            <label class="block text-sm text-blue-400 mb-1">Rara</label>
                            <input type="number" id="formula-costoAbilitaRara" value="${config.costoAbilitaRara}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm text-purple-400 mb-1">Epica (+1 neg)</label>
                            <input type="number" id="formula-costoAbilitaEpica" value="${config.costoAbilitaEpica}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm text-yellow-400 mb-1">Leggendaria (+2 neg)</label>
                            <input type="number" id="formula-costoAbilitaLeggendaria" value="${config.costoAbilitaLeggendaria}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-yellow-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Conversione CSS -> CS -->
                <div class="bg-gray-700 p-4 rounded-lg border border-cyan-500">
                    <h4 class="text-lg font-bold text-cyan-400 mb-3">Conversione CSS → CS</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Tasso (1 CSS = X CS)</label>
                            <input type="number" id="formula-cssToCsRate" value="${config.cssToCsRate}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">Costo Conversione (CSS)</label>
                            <input type="number" id="formula-costoConversione" value="${config.costoConversione}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500">
                        </div>
                    </div>
                </div>

                <!-- Sezione: Rimozione Abilita CSS -->
                <div class="bg-gray-700 p-4 rounded-lg border border-red-500">
                    <h4 class="text-lg font-bold text-red-400 mb-3">Rimozione Abilita (CSS)</h4>
                    <p class="text-sm text-gray-400 mb-4">
                        <span class="text-green-400">Positive:</span> <code class="bg-gray-800 px-2 py-1 rounded">base + (molt × rarita)</code> |
                        <span class="text-red-400">Negative:</span> <code class="bg-gray-800 px-2 py-1 rounded">base × (n_rimosse + 1)</code>
                    </p>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm text-green-400 mb-1">Base Rimozione Pos.</label>
                            <input type="number" id="formula-costoBaseRimozionePositiva" value="${config.costoBaseRimozionePositiva || 5}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-red-500">
                        </div>
                        <div>
                            <label class="block text-sm text-green-400 mb-1">Molt. Rarita</label>
                            <input type="number" id="formula-moltiplicatoreRaritaRimozione" value="${config.moltiplicatoreRaritaRimozione || 2}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-red-500">
                        </div>
                        <div>
                            <label class="block text-sm text-red-400 mb-1">Base Rimozione Neg.</label>
                            <input type="number" id="formula-costoBaseRimozioneNegativa" value="${config.costoBaseRimozioneNegativa || 5}"
                                   class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-red-500">
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-3">
                        Esempio Positive: Comune(1)=${(config.costoBaseRimozionePositiva || 5) + (config.moltiplicatoreRaritaRimozione || 2)*1},
                        Rara(1.5)=${(config.costoBaseRimozionePositiva || 5) + Math.round((config.moltiplicatoreRaritaRimozione || 2)*1.5)},
                        Epica(2)=${(config.costoBaseRimozionePositiva || 5) + (config.moltiplicatoreRaritaRimozione || 2)*2},
                        Legg.(2.5)=${(config.costoBaseRimozionePositiva || 5) + Math.round((config.moltiplicatoreRaritaRimozione || 2)*2.5)} CSS
                    </p>
                    <p class="text-xs text-gray-500">
                        Esempio Negative: 1a=${(config.costoBaseRimozioneNegativa || 5)*1},
                        2a=${(config.costoBaseRimozioneNegativa || 5)*2},
                        3a=${(config.costoBaseRimozioneNegativa || 5)*3},
                        4a=${(config.costoBaseRimozioneNegativa || 5)*4} CSS (progressivo)
                    </p>
                </div>

                <!-- Info ultimo aggiornamento -->
                ${config.lastUpdated ? `
                    <p class="text-xs text-gray-500 text-right">
                        Ultimo aggiornamento: ${new Date(config.lastUpdated).toLocaleString('it-IT')}
                    </p>
                ` : ''}
            </div>
        `;

        // Aggiungi event listeners
        this.attachEventListeners(container);
    },

    /**
     * Aggiunge event listeners ai bottoni
     */
    attachEventListeners(container) {
        const saveBtn = container.querySelector('#btn-save-formulas');
        const resetBtn = container.querySelector('#btn-reset-formulas');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSave(container));
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset(container));
        }
    },

    /**
     * Raccoglie i valori dal form
     * @returns {Object} Configurazione dal form
     */
    collectFormValues() {
        const fields = [
            'baseCostoGiocatore', 'moltiplicatoreLivello', 'moltiplicatoreAbilita', 'penalitaNegativa',
            'baseCostoOggetto', 'moltiplicatoreBonusOggetto',
            'costoBaseIcona', 'maxLevelGiocatore', 'maxLevelIcona',
            'costoAbilitaComune', 'costoAbilitaRara', 'costoAbilitaEpica', 'costoAbilitaLeggendaria',
            'cssToCsRate', 'costoConversione',
            'costoBaseRimozionePositiva', 'moltiplicatoreRaritaRimozione', 'costoBaseRimozioneNegativa'
        ];

        const config = {};
        fields.forEach(field => {
            const input = document.getElementById(`formula-${field}`);
            if (input) {
                config[field] = parseInt(input.value, 10) || 0;
            }
        });

        return config;
    },

    /**
     * Mostra un messaggio nel pannello
     */
    showMessage(container, message, type = 'success') {
        const msgEl = container.querySelector('#formulas-message');
        if (!msgEl) return;

        msgEl.textContent = message;
        msgEl.className = `p-3 rounded-lg text-center ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
        msgEl.classList.remove('hidden');

        setTimeout(() => {
            msgEl.classList.add('hidden');
        }, 3000);
    },

    /**
     * Gestisce il salvataggio
     */
    async handleSave(container) {
        const newConfig = this.collectFormValues();
        const success = await this.saveConfig(newConfig);

        if (success) {
            this.showMessage(container, 'Configurazione salvata con successo!', 'success');
        } else {
            this.showMessage(container, 'Errore nel salvataggio. Riprova.', 'error');
        }
    },

    /**
     * Gestisce il reset ai valori default
     */
    async handleReset(container) {
        if (!confirm('Sei sicuro di voler ripristinare tutti i valori default?')) {
            return;
        }

        const success = await this.resetToDefault();

        if (success) {
            // Ricarica il pannello con i nuovi valori
            this.renderPanel(container);
            this.showMessage(container, 'Valori default ripristinati!', 'success');
        } else {
            this.showMessage(container, 'Errore nel ripristino. Riprova.', 'error');
        }
    },

    // ====================================================================
    // INIZIALIZZAZIONE
    // ====================================================================

    /**
     * Inizializza il modulo caricando la configurazione
     */
    async init() {
        await this.loadConfig();
        console.log('[AdminFormulas] Modulo inizializzato');
    }
};

// Esponi globalmente la configurazione per accesso rapido
window.FormulasConfig = window.AdminFormulas.DEFAULT_CONFIG;

console.log("Modulo admin-formulas.js caricato.");
