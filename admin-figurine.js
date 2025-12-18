//
// ====================================================================
// ADMIN-FIGURINE.JS - Configurazione Sistema Figurine
// ====================================================================
// Pannello admin per configurare probabilita, prezzi e cooldown
//

window.AdminFigurine = {

    /**
     * Renderizza il pannello configurazione figurine
     */
    async renderConfigPanel(container) {
        if (!container) return;

        container.innerHTML = '<p class="text-center text-gray-400">Caricamento configurazione...</p>';

        // Carica config fresca da Firestore (forza reload)
        const config = await this.loadConfigFromFirestore();

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Parametri Generali -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-4">Parametri Generali</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Prezzo Pacchetto (CSS)</label>
                            <input type="number" id="figurine-pack-price-css" value="${config.packPriceCSS || 1}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Bonus 2 Figurine (%)</label>
                            <input type="number" id="figurine-bonus-chance" value="${Math.round((config.bonusFigurineChance || 0.05) * 100)}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0" max="100" step="1">
                            <p class="text-xs text-gray-500 mt-1">Base: 1 fig, Bonus: 2 fig</p>
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Cooldown Gratis (ore)</label>
                            <input type="number" id="figurine-cooldown" value="${config.freePackCooldownHours || 8}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Bonus Album Completo (CS)</label>
                            <input type="number" id="figurine-completion-bonus" value="${config.completionBonus || 500}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Bonus Sezione Completa (CS)</label>
                            <input type="number" id="figurine-section-bonus" value="${config.sectionBonus || 50}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Figurine per Scambio</label>
                            <input type="number" id="figurine-trade-count" value="${config.tradeRequiredCount || 3}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="1">
                        </div>
                    </div>
                </div>

                <!-- Probabilita Rarita -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-4">Probabilita Rarita</h4>
                    <p class="text-xs text-gray-400 mb-3">Le probabilita devono sommare a 100%</p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-gray-400 mr-1"></span> Normale (%)
                            </label>
                            <input type="number" id="figurine-prob-normale" value="${config.rarityProbabilities?.normale || 55}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span> Evoluto (%)
                            </label>
                            <input type="number" id="figurine-prob-evoluto" value="${config.rarityProbabilities?.evoluto || 25}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1"></span> Alternative (%)
                            </label>
                            <input type="number" id="figurine-prob-alternative" value="${config.rarityProbabilities?.alternative || 15}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1"></span> Ultimate (%)
                            </label>
                            <input type="number" id="figurine-prob-ultimate" value="${config.rarityProbabilities?.ultimate || 5}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                    </div>
                    <p id="figurine-prob-total" class="text-center mt-3 text-sm font-bold"></p>
                </div>

                <!-- Reward Scambio -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-4">Reward Scambio Duplicati (CS)</h4>
                    <div class="grid grid-cols-4 gap-3">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Normale</label>
                            <input type="number" id="figurine-trade-normale" value="${config.tradeRewards?.normale || 50}"
                                   class="w-full p-2 rounded bg-gray-600 text-white text-sm" min="0">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Evoluto</label>
                            <input type="number" id="figurine-trade-evoluto" value="${config.tradeRewards?.evoluto || 75}"
                                   class="w-full p-2 rounded bg-gray-600 text-white text-sm" min="0">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Alternative</label>
                            <input type="number" id="figurine-trade-alternative" value="${config.tradeRewards?.alternative || 150}"
                                   class="w-full p-2 rounded bg-gray-600 text-white text-sm" min="0">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Ultimate</label>
                            <input type="number" id="figurine-trade-ultimate" value="${config.tradeRewards?.ultimate || 300}"
                                   class="w-full p-2 rounded bg-gray-600 text-white text-sm" min="0">
                        </div>
                    </div>
                </div>

                <!-- Statistiche -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-2">Info Sistema</h4>
                    <div class="text-sm text-gray-400">
                        <p>Icone disponibili: <span class="text-white font-bold">${window.FigurineSystem?.getIconeList()?.length || 0}</span></p>
                        <p>Figurine totali per album completo: <span class="text-white font-bold">${(window.FigurineSystem?.getIconeList()?.length || 0) * 4}</span></p>
                    </div>
                </div>

                <!-- Bottoni -->
                <div class="flex justify-end space-x-3">
                    <button id="btn-reset-figurine-config" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition">
                        Reset Default
                    </button>
                    <button id="btn-save-figurine-config" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition">
                        Salva Configurazione
                    </button>
                </div>

                <p id="figurine-config-message" class="text-center text-sm mt-2"></p>
            </div>
        `;

        // Setup listeners
        this.setupListeners();
        this.updateProbabilityTotal();
    },

    /**
     * Carica config direttamente da Firestore (bypass cache)
     */
    async loadConfigFromFirestore() {
        const defaults = {
            enabled: true,
            packPriceCSS: 1,
            bonusFigurineChance: 0.05,
            freePackCooldownHours: 8,
            completionBonus: 500,
            sectionBonus: 50,
            tradeRequiredCount: 3,
            rarityProbabilities: {
                normale: 55,
                evoluto: 25,
                alternative: 15,
                ultimate: 5
            },
            tradeRewards: {
                normale: 50,
                evoluto: 75,
                alternative: 150,
                ultimate: 300
            }
        };

        try {
            const appId = window.firestoreTools?.appId;
            if (!appId || !window.db) return defaults;

            const { doc, getDoc } = window.firestoreTools;
            const docRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'figurineConfig');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    ...defaults,
                    ...data,
                    rarityProbabilities: {
                        ...defaults.rarityProbabilities,
                        ...(data.rarityProbabilities || {})
                    },
                    tradeRewards: {
                        ...defaults.tradeRewards,
                        ...(data.tradeRewards || {})
                    }
                };
            }
        } catch (error) {
            console.error('[AdminFigurine] Errore caricamento config:', error);
        }

        return defaults;
    },

    /**
     * Setup listeners per il pannello
     */
    setupListeners() {
        // Salva configurazione
        document.getElementById('btn-save-figurine-config')?.addEventListener('click', async () => {
            try {
                await this.saveConfig();
            } catch (error) {
                console.error('[AdminFigurine] Errore salvataggio config:', error);
                window.ErrorHandler?.handle(error, { context: 'save-figurine-config' });
            }
        });

        // Reset default
        document.getElementById('btn-reset-figurine-config')?.addEventListener('click', async () => {
            try {
                if (confirm('Vuoi resettare la configurazione delle figurine ai valori di default?')) {
                    await this.resetConfig();
                }
            } catch (error) {
                console.error('[AdminFigurine] Errore reset config:', error);
                window.ErrorHandler?.handle(error, { context: 'reset-figurine-config' });
            }
        });

        // Aggiorna totale probabilita quando cambiano i valori
        document.querySelectorAll('.prob-input').forEach(input => {
            input.addEventListener('input', () => this.updateProbabilityTotal());
        });
    },

    /**
     * Aggiorna il totale delle probabilita
     */
    updateProbabilityTotal() {
        const normale = parseInt(document.getElementById('figurine-prob-normale')?.value) || 0;
        const evoluto = parseInt(document.getElementById('figurine-prob-evoluto')?.value) || 0;
        const alternative = parseInt(document.getElementById('figurine-prob-alternative')?.value) || 0;
        const ultimate = parseInt(document.getElementById('figurine-prob-ultimate')?.value) || 0;

        const total = normale + evoluto + alternative + ultimate;
        const totalEl = document.getElementById('figurine-prob-total');

        if (totalEl) {
            if (total === 100) {
                totalEl.textContent = `Totale: ${total}% ✓`;
                totalEl.className = 'text-center mt-3 text-sm font-bold text-green-400';
            } else {
                totalEl.textContent = `Totale: ${total}% (deve essere 100%)`;
                totalEl.className = 'text-center mt-3 text-sm font-bold text-red-400';
            }
        }
    },

    /**
     * Raccoglie i dati del form
     */
    collectFormData() {
        return {
            enabled: true,
            packPriceCSS: parseInt(document.getElementById('figurine-pack-price-css')?.value) || 1,
            bonusFigurineChance: (parseInt(document.getElementById('figurine-bonus-chance')?.value) || 5) / 100,
            freePackCooldownHours: parseInt(document.getElementById('figurine-cooldown')?.value) || 8,
            completionBonus: parseInt(document.getElementById('figurine-completion-bonus')?.value) || 500,
            sectionBonus: parseInt(document.getElementById('figurine-section-bonus')?.value) || 50,
            tradeRequiredCount: parseInt(document.getElementById('figurine-trade-count')?.value) || 3,
            rarityProbabilities: {
                normale: parseInt(document.getElementById('figurine-prob-normale')?.value) || 55,
                evoluto: parseInt(document.getElementById('figurine-prob-evoluto')?.value) || 25,
                alternative: parseInt(document.getElementById('figurine-prob-alternative')?.value) || 15,
                ultimate: parseInt(document.getElementById('figurine-prob-ultimate')?.value) || 5
            },
            tradeRewards: {
                normale: parseInt(document.getElementById('figurine-trade-normale')?.value) || 50,
                evoluto: parseInt(document.getElementById('figurine-trade-evoluto')?.value) || 75,
                alternative: parseInt(document.getElementById('figurine-trade-alternative')?.value) || 150,
                ultimate: parseInt(document.getElementById('figurine-trade-ultimate')?.value) || 300
            }
        };
    },

    /**
     * Salva la configurazione su Firestore
     */
    async saveConfig() {
        const msgEl = document.getElementById('figurine-config-message');
        const btn = document.getElementById('btn-save-figurine-config');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Salvataggio...';
        }

        try {
            const formData = this.collectFormData();

            // Valida probabilita
            const { normale, evoluto, alternative, ultimate } = formData.rarityProbabilities;
            const totalProb = normale + evoluto + alternative + ultimate;

            if (totalProb !== 100) {
                throw new Error(`Le probabilita devono sommare a 100% (attuale: ${totalProb}%)`);
            }

            // Salva su Firestore
            const appId = window.firestoreTools?.appId;
            if (!appId || !window.db) {
                throw new Error('Firestore non disponibile');
            }

            const { doc, setDoc } = window.firestoreTools;
            const docRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'figurineConfig');

            await setDoc(docRef, {
                ...formData,
                updatedAt: new Date().toISOString()
            });

            // Aggiorna anche la cache runtime di FigurineSystem
            if (window.FigurineSystem) {
                window.FigurineSystem._config = formData;
                window.FigurineSystem._configLoaded = true;

                // Aggiorna le probabilita in RARITIES
                window.FigurineSystem.RARITIES.normale.probability = normale / 100;
                window.FigurineSystem.RARITIES.evoluto.probability = evoluto / 100;
                window.FigurineSystem.RARITIES.alternative.probability = alternative / 100;
                window.FigurineSystem.RARITIES.ultimate.probability = ultimate / 100;
            }

            if (msgEl) {
                msgEl.textContent = 'Configurazione salvata con successo!';
                msgEl.className = 'text-center text-sm text-green-400';
            }

            console.log('[AdminFigurine] Config salvata:', formData);

        } catch (error) {
            console.error('[AdminFigurine] Errore salvataggio:', error);
            if (msgEl) {
                msgEl.textContent = `Errore: ${error.message}`;
                msgEl.className = 'text-center text-sm text-red-400';
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Salva Configurazione';
            }
        }
    },

    /**
     * Resetta la configurazione ai valori di default
     */
    async resetConfig() {
        const msgEl = document.getElementById('figurine-config-message');
        const btn = document.getElementById('btn-reset-figurine-config');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Reset...';
        }

        try {
            const defaults = {
                enabled: true,
                packPriceCSS: 1,
                bonusFigurineChance: 0.05,
                freePackCooldownHours: 8,
                completionBonus: 500,
                sectionBonus: 50,
                tradeRequiredCount: 3,
                rarityProbabilities: {
                    normale: 55,
                    evoluto: 25,
                    alternative: 15,
                    ultimate: 5
                },
                tradeRewards: {
                    normale: 50,
                    evoluto: 75,
                    alternative: 150,
                    ultimate: 300
                }
            };

            // Salva defaults su Firestore
            const appId = window.firestoreTools?.appId;
            if (appId && window.db) {
                const { doc, setDoc } = window.firestoreTools;
                const docRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'figurineConfig');
                await setDoc(docRef, { ...defaults, updatedAt: new Date().toISOString() });
            }

            // Aggiorna runtime
            if (window.FigurineSystem) {
                window.FigurineSystem._config = defaults;
                window.FigurineSystem._configLoaded = true;
                window.FigurineSystem.RARITIES.normale.probability = 0.55;
                window.FigurineSystem.RARITIES.evoluto.probability = 0.25;
                window.FigurineSystem.RARITIES.alternative.probability = 0.15;
                window.FigurineSystem.RARITIES.ultimate.probability = 0.05;
            }

            // Ricarica pannello
            const container = document.getElementById('figurine-panel-content');
            if (container) {
                await this.renderConfigPanel(container);
            }

            if (msgEl) {
                msgEl.textContent = 'Configurazione resettata ai valori di default!';
                msgEl.className = 'text-center text-sm text-green-400';
            }

        } catch (error) {
            console.error('[AdminFigurine] Errore reset:', error);
            if (msgEl) {
                msgEl.textContent = `Errore: ${error.message}`;
                msgEl.className = 'text-center text-sm text-red-400';
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Reset Default';
            }
        }
    },

    /**
     * Apre il pannello configurazione
     */
    async openPanel() {
        const panel = document.getElementById('figurine-panel-container');
        const content = document.getElementById('figurine-panel-content');

        if (panel && content) {
            panel.classList.remove('hidden');
            await this.renderConfigPanel(content);
        }
    },

    /**
     * Chiude il pannello configurazione
     */
    closePanel() {
        const panel = document.getElementById('figurine-panel-container');
        if (panel) {
            panel.classList.add('hidden');
        }
    }
};

console.log('[AdminFigurine] Modulo caricato.');
