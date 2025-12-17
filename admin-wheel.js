//
// ====================================================================
// ADMIN-WHEEL.JS - Configurazione Ruota della Fortuna
// ====================================================================
//

window.AdminWheel = {

    /**
     * Renderizza il pannello configurazione ruota
     */
    renderWheelConfigPanel(container) {
        if (!container) return;

        const config = window.Wheel?.getConfig() || {};
        const prizes = config.prizes || [];

        container.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h3 class="text-lg font-bold text-yellow-400 mb-4">Configurazione Ruota</h3>

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Costo Giro (CSS)</label>
                            <input type="number" id="wheel-cost" value="${config.costPerSpin || 5}"
                                   class="w-full p-2 rounded bg-gray-700 text-white">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Giri Gratis Giornalieri</label>
                            <input type="number" id="wheel-free-spins" value="${config.freeSpinsPerDay || 1}"
                                   class="w-full p-2 rounded bg-gray-700 text-white">
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="wheel-enabled" ${config.enabled !== false ? 'checked' : ''}
                                   class="form-checkbox h-5 w-5 text-yellow-500">
                            <span class="text-white">Ruota Abilitata</span>
                        </label>
                    </div>
                </div>

                <div class="bg-gray-800 p-4 rounded-lg">
                    <h3 class="text-lg font-bold text-yellow-400 mb-4">Premi</h3>
                    <div id="wheel-prizes-list" class="space-y-2 max-h-64 overflow-y-auto">
                        ${prizes.map((prize, index) => this.renderPrizeRow(prize, index)).join('')}
                    </div>
                    <button id="btn-add-prize" class="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                        + Aggiungi Premio
                    </button>
                </div>

                <div class="flex justify-end space-x-3">
                    <button id="btn-reset-wheel-config" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">
                        Reset Default
                    </button>
                    <button id="btn-save-wheel-config" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-bold">
                        Salva Configurazione
                    </button>
                </div>

                <p id="wheel-config-message" class="text-center text-sm"></p>
            </div>
        `;
    },

    /**
     * Renderizza una riga premio
     */
    renderPrizeRow(prize, index) {
        const typeOptions = ['CS', 'CSS', 'EXP', 'OBJECT', 'NOTHING'].map(type =>
            `<option value="${type}" ${prize.type === type ? 'selected' : ''}>${type}</option>`
        ).join('');

        return `
            <div class="prize-row flex items-center space-x-2 bg-gray-700 p-2 rounded" data-index="${index}">
                <input type="text" placeholder="Nome" value="${prize.name || ''}"
                       class="prize-name flex-1 p-1 rounded bg-gray-600 text-white text-sm">
                <select class="prize-type p-1 rounded bg-gray-600 text-white text-sm">
                    ${typeOptions}
                </select>
                <input type="number" placeholder="Valore" value="${prize.value || 0}"
                       class="prize-value w-20 p-1 rounded bg-gray-600 text-white text-sm">
                <input type="number" placeholder="Prob %" value="${prize.probability || 10}"
                       class="prize-prob w-16 p-1 rounded bg-gray-600 text-white text-sm" step="0.1">
                <input type="text" placeholder="Colore" value="${prize.color || '#666'}"
                       class="prize-color w-20 p-1 rounded bg-gray-600 text-white text-sm">
                <button class="btn-remove-prize px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs">X</button>
            </div>
        `;
    },

    /**
     * Setup listeners per il pannello ruota
     */
    setupListeners() {
        const container = document.getElementById('wheel-config-container');
        if (!container) return;

        // Salva configurazione
        document.getElementById('btn-save-wheel-config')?.addEventListener('click', async () => {
            await this.saveConfig();
        });

        // Reset default
        document.getElementById('btn-reset-wheel-config')?.addEventListener('click', async () => {
            if (confirm('Vuoi resettare la configurazione della ruota ai valori di default?')) {
                await this.resetConfig();
            }
        });

        // Aggiungi premio
        document.getElementById('btn-add-prize')?.addEventListener('click', () => {
            this.addPrizeRow();
        });

        // Rimuovi premio (delegazione eventi)
        document.getElementById('wheel-prizes-list')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-prize')) {
                e.target.closest('.prize-row').remove();
            }
        });
    },

    /**
     * Aggiunge una nuova riga premio
     */
    addPrizeRow() {
        const list = document.getElementById('wheel-prizes-list');
        if (!list) return;

        const index = list.children.length;
        const newPrize = { name: 'Nuovo Premio', type: 'CS', value: 10, probability: 10, color: '#666' };

        const div = document.createElement('div');
        div.innerHTML = this.renderPrizeRow(newPrize, index);
        list.appendChild(div.firstElementChild);
    },

    /**
     * Raccoglie i dati del form
     */
    collectFormData() {
        const costInput = document.getElementById('wheel-cost');
        const freeSpinsInput = document.getElementById('wheel-free-spins');
        const enabledCheckbox = document.getElementById('wheel-enabled');
        const prizeRows = document.querySelectorAll('.prize-row');

        const prizes = [];
        prizeRows.forEach(row => {
            prizes.push({
                name: row.querySelector('.prize-name').value,
                type: row.querySelector('.prize-type').value,
                value: parseInt(row.querySelector('.prize-value').value) || 0,
                probability: parseFloat(row.querySelector('.prize-prob').value) || 0,
                color: row.querySelector('.prize-color').value || '#666'
            });
        });

        return {
            enabled: enabledCheckbox?.checked ?? true,
            costPerSpin: parseInt(costInput?.value) || 5,
            freeSpinsPerDay: parseInt(freeSpinsInput?.value) || 1,
            prizes: prizes
        };
    },

    /**
     * Salva la configurazione
     */
    async saveConfig() {
        const msgEl = document.getElementById('wheel-config-message');
        const btn = document.getElementById('btn-save-wheel-config');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Salvataggio...';
        }

        try {
            const config = this.collectFormData();

            // Valida probabilita (devono sommare a 100)
            const totalProb = config.prizes.reduce((sum, p) => sum + p.probability, 0);
            if (Math.abs(totalProb - 100) > 0.1) {
                throw new Error(`Le probabilita devono sommare a 100% (attuale: ${totalProb.toFixed(1)}%)`);
            }

            if (window.Wheel?.saveConfig) {
                await window.Wheel.saveConfig(config);
            } else {
                throw new Error('Modulo Wheel non disponibile');
            }

            if (msgEl) {
                msgEl.textContent = 'Configurazione salvata con successo!';
                msgEl.className = 'text-center text-sm text-green-400';
            }

        } catch (error) {
            console.error('[AdminWheel] Errore salvataggio:', error);
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
        const msgEl = document.getElementById('wheel-config-message');

        try {
            if (window.Wheel?.resetConfig) {
                await window.Wheel.resetConfig();
            }

            // Ricarica il pannello
            const container = document.getElementById('wheel-config-container');
            if (container) {
                this.renderWheelConfigPanel(container);
                this.setupListeners();
            }

            if (msgEl) {
                msgEl.textContent = 'Configurazione resettata ai valori di default!';
                msgEl.className = 'text-center text-sm text-green-400';
            }

        } catch (error) {
            console.error('[AdminWheel] Errore reset:', error);
            if (msgEl) {
                msgEl.textContent = `Errore: ${error.message}`;
                msgEl.className = 'text-center text-sm text-red-400';
            }
        }
    }
};

console.log('Modulo admin-wheel.js caricato.');
