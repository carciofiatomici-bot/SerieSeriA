//
// ====================================================================
// ADMIN-FIGURINE.JS - Configurazione Sistema Figurine Multi-Collezione
// ====================================================================
// Pannello admin per configurare probabilita, prezzi, cooldown e collezioni
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
        const collectionPrices = config.collectionPackPrices || { icone: 1, giocatori_seri: 1, allenatori: 1, illustrazioni: 1 };
        const probs = config.iconeProbabilities || config.rarityProbabilities || { normale: 50, evoluto: 25, alternative: 12, ultimate: 8, fantasy: 5 };

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Parametri Generali -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-4">Parametri Generali</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Cooldown Gratis (ore)</label>
                            <input type="number" id="figurine-cooldown" value="${config.freePackCooldownHours || 4}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Bonus 2 Figurine (%)</label>
                            <input type="number" id="figurine-bonus-chance" value="${Math.round((config.freePackChance2 || config.bonusFigurineChance || 0.01) * 100)}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0" max="100" step="1">
                            <p class="text-xs text-gray-500 mt-1">Pack gratis: 1 (base) o 2 (bonus)</p>
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

                <!-- Prezzi Pacchetti Collezione -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-4">Prezzi Pacchetti per Collezione (CSS)</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">👑 Icone</label>
                            <input type="number" id="figurine-price-icone" value="${collectionPrices.icone || 1}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">⚽ Giocatori Seri</label>
                            <input type="number" id="figurine-price-giocatori" value="${collectionPrices.giocatori_seri || 1}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">📋 Allenatori</label>
                            <input type="number" id="figurine-price-allenatori" value="${collectionPrices.allenatori || 1}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">🎨 Illustrazioni</label>
                            <input type="number" id="figurine-price-illustrazioni" value="${collectionPrices.illustrazioni || 1}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0">
                        </div>
                    </div>
                </div>

                <!-- Probabilita Rarita Icone (5 varianti) -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-4">Probabilita Varianti (Collezione Icone)</h4>
                    <p class="text-xs text-gray-400 mb-3">Le probabilita devono sommare a 100%</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-gray-400 mr-1"></span> Normale (%)
                            </label>
                            <input type="number" id="figurine-prob-normale" value="${probs.normale || 50}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span> Evoluto (%)
                            </label>
                            <input type="number" id="figurine-prob-evoluto" value="${probs.evoluto || 25}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1"></span> Alternative (%)
                            </label>
                            <input type="number" id="figurine-prob-alternative" value="${probs.alternative || 12}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1"></span> Ultimate (%)
                            </label>
                            <input type="number" id="figurine-prob-ultimate" value="${probs.ultimate || 8}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-pink-500 mr-1"></span> Fantasy (%)
                            </label>
                            <input type="number" id="figurine-prob-fantasy" value="${probs.fantasy || 5}"
                                   class="w-full p-2 rounded bg-gray-600 text-white prob-input" min="0" max="100" step="1">
                        </div>
                    </div>
                    <p id="figurine-prob-total" class="text-center mt-3 text-sm font-bold"></p>
                </div>

                <!-- Reward Scambio (5 varianti + base) -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-4">Reward Scambio Duplicati (CS)</h4>
                    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Fantasy</label>
                            <input type="number" id="figurine-trade-fantasy" value="${config.tradeRewards?.fantasy || 300}"
                                   class="w-full p-2 rounded bg-gray-600 text-white text-sm" min="0">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Base</label>
                            <input type="number" id="figurine-trade-base" value="${config.tradeRewards?.base || 25}"
                                   class="w-full p-2 rounded bg-gray-600 text-white text-sm" min="0">
                        </div>
                    </div>
                </div>

                <!-- Statistiche -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-2">Info Sistema</h4>
                    <div class="text-sm text-gray-400 space-y-1">
                        <p>Icone disponibili: <span class="text-white font-bold">${window.FigurineSystem?.getIconeList()?.length || 0}</span></p>
                        <p>Figurine Icone (5 varianti): <span class="text-white font-bold">${(window.FigurineSystem?.getIconeList()?.length || 0) * 5}</span></p>
                        <p>Giocatori Seri: <span class="text-white font-bold">${Object.keys(window.FigurineSystem?.GIOCATORI_SERI_FILES || {}).length}</span></p>
                        <p>Allenatori: <span class="text-white font-bold">${Object.keys(window.FigurineSystem?.ALLENATORI_FILES || {}).length}</span></p>
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
            freePackCooldownHours: 4,
            freePackChance2: 0.01,
            completionBonus: 500,
            sectionBonus: 50,
            tradeRequiredCount: 3,
            collectionPackPrices: {
                icone: 1,
                giocatori_seri: 1,
                allenatori: 1,
                illustrazioni: 1
            },
            iconeProbabilities: {
                normale: 50,
                evoluto: 25,
                alternative: 12,
                ultimate: 8,
                fantasy: 5
            },
            tradeRewards: {
                normale: 50,
                evoluto: 75,
                alternative: 150,
                ultimate: 300,
                fantasy: 300,
                base: 25
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
                    collectionPackPrices: {
                        ...defaults.collectionPackPrices,
                        ...(data.collectionPackPrices || {})
                    },
                    iconeProbabilities: {
                        ...defaults.iconeProbabilities,
                        ...(data.iconeProbabilities || data.rarityProbabilities || {})
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
     * Aggiorna il totale delle probabilita (5 varianti)
     */
    updateProbabilityTotal() {
        const normale = parseInt(document.getElementById('figurine-prob-normale')?.value) || 0;
        const evoluto = parseInt(document.getElementById('figurine-prob-evoluto')?.value) || 0;
        const alternative = parseInt(document.getElementById('figurine-prob-alternative')?.value) || 0;
        const ultimate = parseInt(document.getElementById('figurine-prob-ultimate')?.value) || 0;
        const fantasy = parseInt(document.getElementById('figurine-prob-fantasy')?.value) || 0;

        const total = normale + evoluto + alternative + ultimate + fantasy;
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
            freePackCooldownHours: parseInt(document.getElementById('figurine-cooldown')?.value) || 4,
            freePackChance2: (parseInt(document.getElementById('figurine-bonus-chance')?.value) || 1) / 100,
            completionBonus: parseInt(document.getElementById('figurine-completion-bonus')?.value) || 500,
            sectionBonus: parseInt(document.getElementById('figurine-section-bonus')?.value) || 50,
            tradeRequiredCount: parseInt(document.getElementById('figurine-trade-count')?.value) || 3,
            collectionPackPrices: {
                icone: parseInt(document.getElementById('figurine-price-icone')?.value) || 1,
                giocatori_seri: parseInt(document.getElementById('figurine-price-giocatori')?.value) || 1,
                allenatori: parseInt(document.getElementById('figurine-price-allenatori')?.value) || 1,
                illustrazioni: parseInt(document.getElementById('figurine-price-illustrazioni')?.value) || 1
            },
            iconeProbabilities: {
                normale: parseInt(document.getElementById('figurine-prob-normale')?.value) || 50,
                evoluto: parseInt(document.getElementById('figurine-prob-evoluto')?.value) || 25,
                alternative: parseInt(document.getElementById('figurine-prob-alternative')?.value) || 12,
                ultimate: parseInt(document.getElementById('figurine-prob-ultimate')?.value) || 8,
                fantasy: parseInt(document.getElementById('figurine-prob-fantasy')?.value) || 5
            },
            tradeRewards: {
                normale: parseInt(document.getElementById('figurine-trade-normale')?.value) || 50,
                evoluto: parseInt(document.getElementById('figurine-trade-evoluto')?.value) || 75,
                alternative: parseInt(document.getElementById('figurine-trade-alternative')?.value) || 150,
                ultimate: parseInt(document.getElementById('figurine-trade-ultimate')?.value) || 300,
                fantasy: parseInt(document.getElementById('figurine-trade-fantasy')?.value) || 300,
                base: parseInt(document.getElementById('figurine-trade-base')?.value) || 25
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

            // Valida probabilita (5 varianti)
            const { normale, evoluto, alternative, ultimate, fantasy } = formData.iconeProbabilities;
            const totalProb = normale + evoluto + alternative + ultimate + fantasy;

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

                // Aggiorna le probabilita in ICONE_RARITIES
                window.FigurineSystem.ICONE_RARITIES.normale.probability = normale / 100;
                window.FigurineSystem.ICONE_RARITIES.evoluto.probability = evoluto / 100;
                window.FigurineSystem.ICONE_RARITIES.alternative.probability = alternative / 100;
                window.FigurineSystem.ICONE_RARITIES.ultimate.probability = ultimate / 100;
                window.FigurineSystem.ICONE_RARITIES.fantasy.probability = fantasy / 100;
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
                freePackCooldownHours: 4,
                freePackChance2: 0.01,
                completionBonus: 500,
                sectionBonus: 50,
                tradeRequiredCount: 3,
                collectionPackPrices: {
                    icone: 1,
                    giocatori_seri: 1,
                    allenatori: 1
                },
                iconeProbabilities: {
                    normale: 50,
                    evoluto: 25,
                    alternative: 12,
                    ultimate: 8,
                    fantasy: 5
                },
                tradeRewards: {
                    normale: 50,
                    evoluto: 75,
                    alternative: 150,
                    ultimate: 300,
                    fantasy: 300,
                    base: 25
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
                window.FigurineSystem.ICONE_RARITIES.normale.probability = 0.50;
                window.FigurineSystem.ICONE_RARITIES.evoluto.probability = 0.25;
                window.FigurineSystem.ICONE_RARITIES.alternative.probability = 0.12;
                window.FigurineSystem.ICONE_RARITIES.ultimate.probability = 0.08;
                window.FigurineSystem.ICONE_RARITIES.fantasy.probability = 0.05;
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
