//
// ====================================================================
// ADMIN-FIGURINE.JS - Configurazione Sistema Figurine
// ====================================================================
//

window.AdminFigurine = {

    /**
     * Renderizza il pannello configurazione figurine
     */
    renderConfigPanel(container) {
        if (!container) return;

        const config = window.FigurineSystem?._config || window.FigurineSystem?.getDefaultConfig() || {};
        const rarities = window.FigurineSystem?.RARITIES || {};

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Parametri Generali -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-300 mb-4">Parametri Generali</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Prezzo Pacchetto (CS)</label>
                            <input type="number" id="figurine-pack-price" value="${config.packPrice || 50}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Figurine per Pacchetto</label>
                            <input type="number" id="figurine-per-pack" value="${config.figurinesPerPack || 3}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="1" max="10">
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
                            <input type="number" id="figurine-prob-normale" value="${Math.round((rarities.normale?.probability || 0.55) * 100)}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span> Evoluto (%)
                            </label>
                            <input type="number" id="figurine-prob-evoluto" value="${Math.round((rarities.evoluto?.probability || 0.25) * 100)}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1"></span> Alternative (%)
                            </label>
                            <input type="number" id="figurine-prob-alternative" value="${Math.round((rarities.alternative?.probability || 0.15) * 100)}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0" max="100" step="1">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">
                                <span class="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1"></span> Ultimate (%)
                            </label>
                            <input type="number" id="figurine-prob-ultimate" value="${Math.round((rarities.ultimate?.probability || 0.05) * 100)}"
                                   class="w-full p-2 rounded bg-gray-600 text-white" min="0" max="100" step="1">
                        </div>
                    </div>
                    <p id="figurine-prob-total" class="text-center mt-3 text-sm font-bold"></p>
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
                    <button id="btn-reset-figurine-config" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">
                        Reset Default
                    </button>
                    <button id="btn-save-figurine-config" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold">
                        Salva Configurazione
                    </button>
                </div>

                <p id="figurine-config-message" class="text-center text-sm"></p>
            </div>
        `;

        // Setup listeners
        this.setupListeners();
        this.updateProbabilityTotal();
    },

    /**
     * Setup listeners per il pannello
     */
    setupListeners() {
        // Salva configurazione
        document.getElementById('btn-save-figurine-config')?.addEventListener('click', async () => {
            await this.saveConfig();
        });

        // Reset default
        document.getElementById('btn-reset-figurine-config')?.addEventListener('click', async () => {
            if (confirm('Vuoi resettare la configurazione delle figurine ai valori di default?')) {
                await this.resetConfig();
            }
        });

        // Aggiorna totale probabilita quando cambiano i valori
        ['normale', 'evoluto', 'alternative', 'ultimate'].forEach(rarity => {
            document.getElementById(`figurine-prob-${rarity}`)?.addEventListener('input', () => {
                this.updateProbabilityTotal();
            });
        });
    },

    /**
     * Aggiorna il totale delle probabilita
     */
    updateProbabilityTotal() {
        const normale = parseFloat(document.getElementById('figurine-prob-normale')?.value) || 0;
        const evoluto = parseFloat(document.getElementById('figurine-prob-evoluto')?.value) || 0;
        const alternative = parseFloat(document.getElementById('figurine-prob-alternative')?.value) || 0;
        const ultimate = parseFloat(document.getElementById('figurine-prob-ultimate')?.value) || 0;

        const total = normale + evoluto + alternative + ultimate;
        const totalEl = document.getElementById('figurine-prob-total');

        if (totalEl) {
            if (Math.abs(total - 100) < 0.01) {
                totalEl.textContent = `Totale: ${total}%`;
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
            packPrice: parseInt(document.getElementById('figurine-pack-price')?.value) || 50,
            figurinesPerPack: parseInt(document.getElementById('figurine-per-pack')?.value) || 3,
            freePackCooldownHours: parseInt(document.getElementById('figurine-cooldown')?.value) || 8,
            completionBonus: parseInt(document.getElementById('figurine-completion-bonus')?.value) || 500,
            sectionBonus: parseInt(document.getElementById('figurine-section-bonus')?.value) || 50,
            rarities: {
                normale: (parseFloat(document.getElementById('figurine-prob-normale')?.value) || 55) / 100,
                evoluto: (parseFloat(document.getElementById('figurine-prob-evoluto')?.value) || 25) / 100,
                alternative: (parseFloat(document.getElementById('figurine-prob-alternative')?.value) || 15) / 100,
                ultimate: (parseFloat(document.getElementById('figurine-prob-ultimate')?.value) || 5) / 100
            }
        };
    },

    /**
     * Salva la configurazione
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
            const totalProb = Object.values(formData.rarities).reduce((sum, p) => sum + p, 0);
            if (Math.abs(totalProb - 1) > 0.01) {
                throw new Error(`Le probabilita devono sommare a 100% (attuale: ${(totalProb * 100).toFixed(1)}%)`);
            }

            // Prepara config per Firestore
            const config = {
                enabled: true,
                packPrice: formData.packPrice,
                figurinesPerPack: formData.figurinesPerPack,
                freePackCooldownHours: formData.freePackCooldownHours,
                completionBonus: formData.completionBonus,
                sectionBonus: formData.sectionBonus
            };

            // Salva config principale
            if (window.FigurineSystem?.saveConfig) {
                await window.FigurineSystem.saveConfig(config);
            }

            // Aggiorna le probabilita in runtime (non persistono su Firestore per ora)
            if (window.FigurineSystem?.RARITIES) {
                window.FigurineSystem.RARITIES.normale.probability = formData.rarities.normale;
                window.FigurineSystem.RARITIES.evoluto.probability = formData.rarities.evoluto;
                window.FigurineSystem.RARITIES.alternative.probability = formData.rarities.alternative;
                window.FigurineSystem.RARITIES.ultimate.probability = formData.rarities.ultimate;
            }

            if (msgEl) {
                msgEl.textContent = 'Configurazione salvata con successo!';
                msgEl.className = 'text-center text-sm text-green-400';
            }

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
        const container = document.getElementById('figurine-panel-content');
        if (container) {
            // Resetta le probabilita ai valori originali
            if (window.FigurineSystem?.RARITIES) {
                window.FigurineSystem.RARITIES.normale.probability = 0.55;
                window.FigurineSystem.RARITIES.evoluto.probability = 0.25;
                window.FigurineSystem.RARITIES.alternative.probability = 0.15;
                window.FigurineSystem.RARITIES.ultimate.probability = 0.05;
            }

            // Resetta la config
            if (window.FigurineSystem) {
                window.FigurineSystem._config = window.FigurineSystem.getDefaultConfig();
                window.FigurineSystem._configLoaded = false;
            }

            // Ricarica il pannello
            this.renderConfigPanel(container);

            const msgEl = document.getElementById('figurine-config-message');
            if (msgEl) {
                msgEl.textContent = 'Configurazione resettata ai valori di default!';
                msgEl.className = 'text-center text-sm text-green-400';
            }
        }
    },

    /**
     * Apre il pannello configurazione
     */
    openPanel() {
        const panel = document.getElementById('figurine-panel-container');
        const content = document.getElementById('figurine-panel-content');

        if (panel && content) {
            panel.classList.remove('hidden');
            this.renderConfigPanel(content);
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

console.log('Modulo admin-figurine.js caricato.');
