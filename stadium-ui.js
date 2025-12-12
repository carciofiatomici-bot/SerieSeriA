//
// ====================================================================
// MODULO STADIUM-UI.JS - Interfaccia Grafica Stadio
// ====================================================================
//
// Renderizza la visualizzazione dello stadio con campo da calcio
// e strutture costruibili/costruite.
//

window.StadiumUI = {

    // Container ID
    CONTAINER_ID: 'stadium-content',

    // Stato UI
    _teamId: null,
    _teamData: null,
    _stadiumData: null,

    /**
     * Inizializza e renderizza il pannello stadio
     * @param {string} teamId - ID della squadra
     * @param {Object} teamData - Dati completi della squadra
     */
    async init(teamId, teamData) {
        this._teamId = teamId;
        this._teamData = teamData;

        // Carica dati stadio
        this._stadiumData = await window.Stadium.loadStadium(teamId);

        // Renderizza
        this.render();
    },

    /**
     * Renderizza l'intero pannello stadio
     */
    render() {
        const container = document.getElementById(this.CONTAINER_ID);
        if (!container) {
            console.error('[StadiumUI] Container non trovato:', this.CONTAINER_ID);
            return;
        }

        const stats = window.Stadium.getStats(this._stadiumData);
        const teamName = this._teamData?.teamName || 'La tua squadra';

        container.innerHTML = `
            <div class="p-4 md:p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold text-green-400 flex items-center gap-3">
                            <span class="text-4xl">🏟️</span>
                            Stadio di ${this.escapeHtml(teamName)}
                        </h2>
                        <p class="text-gray-400 mt-1">Costruisci strutture per ottenere bonus nelle partite in casa</p>
                    </div>
                    <button id="btn-back-from-stadium" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">
                        <i class="fas fa-arrow-left mr-2"></i> Torna alla Dashboard
                    </button>
                </div>

                <!-- Box Allenatore (centrato) -->
                ${this.renderCoachBox()}

                <!-- Stats Bar -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-gray-400 text-sm">Strutture Costruite</p>
                        <p class="text-2xl font-bold text-white">${stats.built} / ${stats.total}</p>
                        <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                            <div class="bg-green-500 h-2 rounded-full transition-all" style="width: ${stats.percentage}%"></div>
                        </div>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-green-600">
                        <p class="text-gray-400 text-sm">Bonus Casa Attuale</p>
                        <p class="text-2xl font-bold text-green-400">+${stats.bonus.toFixed(2)}</p>
                        <p class="text-xs text-gray-500 mt-1">Max: +${stats.maxBonus.toFixed(2)}</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-gray-400 text-sm">Budget Disponibile</p>
                        <p class="text-2xl font-bold text-yellow-400">${this._teamData?.budget || 0} CS</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-gray-400 text-sm">Costo Completamento</p>
                        <p class="text-2xl font-bold text-orange-400">${window.Stadium.getRemainingCost(this._stadiumData)} CS</p>
                    </div>
                </div>

                <!-- Campo da Calcio con Strutture -->
                <div class="bg-gray-900 rounded-xl p-4 md:p-6 border-2 border-gray-700">
                    ${this.renderStadiumField()}
                </div>

                <!-- Legenda + Bonus Casa -->
                <div class="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <!-- Legenda a sinistra -->
                        <div>
                            <h4 class="text-lg font-bold text-gray-300 mb-3">Legenda</h4>
                            <div class="flex flex-wrap gap-4 text-sm">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded bg-green-600 border-2 border-green-400 flex items-center justify-center text-xs">✓</div>
                                    <span class="text-gray-400">Costruito</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center text-xs">+</div>
                                    <span class="text-gray-400">Disponibile</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded bg-gray-800 border-2 border-red-900 flex items-center justify-center text-xs opacity-50">🔒</div>
                                    <span class="text-gray-400">Bloccato</span>
                                </div>
                            </div>
                        </div>
                        <!-- Bonus Casa a destra -->
                        <div class="bg-gray-900 rounded-lg px-5 py-3 border-2 border-green-500 text-center">
                            <p class="text-xs text-gray-400 mb-1">Bonus Casa Totale</p>
                            <p class="text-2xl font-bold text-green-400" id="total-bonus-display">+${(this._stadiumData?.totalBonus || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <!-- Messaggio feedback -->
                <p id="stadium-message" class="text-center mt-4 text-sm"></p>
            </div>

            <!-- Modal Conferma Acquisto -->
            <div id="stadium-confirm-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg w-full max-w-md mx-4 border-2 border-green-500">
                    <div class="bg-gradient-to-r from-green-700 to-green-500 p-4 rounded-t-lg">
                        <h3 class="text-xl font-bold text-white" id="modal-structure-title">Conferma Costruzione</h3>
                    </div>
                    <div class="p-6">
                        <div id="modal-structure-info" class="mb-4"></div>
                        <div class="flex gap-4">
                            <button id="btn-confirm-build" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition">
                                Costruisci
                            </button>
                            <button id="btn-cancel-build" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">
                                Annulla
                            </button>
                        </div>
                        <p id="modal-error-message" class="text-center mt-3 text-sm text-red-400"></p>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    /**
     * Renderizza il box allenatore centrato
     */
    renderCoachBox() {
        const coach = this._teamData?.coach;
        if (!coach) {
            return '';
        }

        const coachName = coach.name || 'Sconosciuto';
        const coachLevel = coach.level || 1;

        return `
            <div class="flex justify-center mb-6">
                <div class="p-4 bg-gray-800 rounded-lg border-2 border-orange-500 text-center shadow-lg">
                    <p class="text-sm text-gray-400 font-semibold">Allenatore:</p>
                    <p class="text-xl font-extrabold text-orange-400 mt-1">${this.escapeHtml(coachName)}</p>
                    <p class="text-xs text-gray-500">Livello: ${coachLevel}</p>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza il campo da calcio con tutti gli slot
     */
    renderStadiumField() {
        const built = this._stadiumData?.built || [];

        // Helper per creare uno slot struttura
        const createSlot = (structureId) => {
            const structure = window.Stadium.STRUCTURES[structureId];
            if (!structure) return '';

            const isBuilt = built.includes(structureId);
            const canBuildResult = window.Stadium.canBuild(structureId, this._stadiumData);
            const isLocked = !isBuilt && !canBuildResult.canBuild;

            let slotClass, content, title;

            if (isBuilt) {
                slotClass = 'bg-green-700 border-green-400 cursor-default';
                content = `<span class="text-2xl">${structure.icon}</span>`;
                title = `${structure.name} (Costruito) - +${structure.bonus} bonus`;
            } else if (isLocked) {
                slotClass = 'bg-gray-800 border-red-900 opacity-50 cursor-not-allowed';
                content = `<span class="text-lg">🔒</span>`;
                title = `${structure.name} - ${canBuildResult.reason}`;
            } else {
                slotClass = 'bg-gray-700 border-dashed border-gray-500 hover:border-green-400 hover:bg-gray-600 cursor-pointer';
                content = `<span class="text-xl opacity-50">${structure.icon}</span>`;
                title = `${structure.name} - ${structure.cost} CS (+${structure.bonus} bonus)`;
            }

            return `
                <div class="structure-slot w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 ${slotClass}
                            flex flex-col items-center justify-center transition-all"
                     data-structure-id="${structureId}"
                     data-is-built="${isBuilt}"
                     data-is-locked="${isLocked}"
                     title="${title}">
                    ${content}
                    <span class="text-xs text-gray-300 mt-1 hidden md:block">${isBuilt ? '+' + structure.bonus : ''}</span>
                </div>
            `;
        };

        return `
            <div class="stadium-layout relative">
                <!-- Layout Stadio: Vista dall'alto, campo orizzontale -->

                <!-- Riga superiore: Tabellone Ovest - Faro NW - Tribuna Nord - Faro NE - Tabellone Est -->
                <div class="flex justify-center items-center gap-2 mb-2">
                    ${createSlot('scoreboard_west')}
                    ${createSlot('light_nw')}
                    <div class="flex-1 max-w-md">
                        ${createSlot('tribune_north')}
                    </div>
                    ${createSlot('light_ne')}
                    ${createSlot('scoreboard_east')}
                </div>

                <!-- Area Media Nord -->
                <div class="flex justify-center mb-2">
                    ${createSlot('media_north')}
                </div>

                <!-- Campo centrale con porte e panchine -->
                <div class="flex items-center justify-center gap-2 my-4">
                    <!-- Tribuna Ovest (porta) -->
                    <div class="flex flex-col items-center gap-2">
                        ${createSlot('tribune_west')}
                    </div>

                    <!-- Campo da gioco -->
                    <div class="relative bg-green-800 rounded-lg border-4 border-white w-full max-w-2xl aspect-[2/1] mx-2">
                        <!-- Linee del campo -->
                        <div class="absolute inset-0 flex items-center justify-center">
                            <!-- Linea centrale -->
                            <div class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white opacity-60"></div>
                            <!-- Cerchio centrale -->
                            <div class="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-white opacity-60"></div>
                        </div>

                        <!-- Porta sinistra -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-4 md:w-6 h-16 md:h-24 border-2 border-white border-l-0 opacity-80"></div>
                        <!-- Area piccola sinistra -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-8 md:w-12 h-24 md:h-32 border-2 border-white border-l-0 opacity-60"></div>

                        <!-- Porta destra -->
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 md:w-6 h-16 md:h-24 border-2 border-white border-r-0 opacity-80"></div>
                        <!-- Area piccola destra -->
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-8 md:w-12 h-24 md:h-32 border-2 border-white border-r-0 opacity-60"></div>

                        <!-- Panchine a bordo campo -->
                        <div class="absolute bottom-2 left-1/4 transform -translate-x-1/2">
                            ${createSlot('bench_left')}
                        </div>
                        <div class="absolute bottom-2 right-1/4 transform translate-x-1/2">
                            ${createSlot('bench_right')}
                        </div>
                    </div>

                    <!-- Tribuna Est (porta) -->
                    <div class="flex flex-col items-center gap-2">
                        ${createSlot('tribune_east')}
                    </div>
                </div>

                <!-- Area Media Sud -->
                <div class="flex justify-center mt-2">
                    ${createSlot('media_south')}
                </div>

                <!-- Riga inferiore: Faro SW - Tribuna Sud - Faro SE -->
                <div class="flex justify-center items-center gap-2 mt-2">
                    <div class="w-16 h-16 md:w-20 md:h-20"></div> <!-- Spacer -->
                    ${createSlot('light_sw')}
                    <div class="flex-1 max-w-md">
                        ${createSlot('tribune_south')}
                    </div>
                    ${createSlot('light_se')}
                    <div class="w-16 h-16 md:w-20 md:h-20"></div> <!-- Spacer -->
                </div>

            </div>
        `;
    },

    /**
     * Attacca gli event listener
     */
    attachEventListeners() {
        // Torna alla dashboard
        const btnBack = document.getElementById('btn-back-from-stadium');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                if (window.showScreen) {
                    window.showScreen(document.getElementById('gestione-content'));
                }
            });
        }

        // Click sugli slot struttura
        const slots = document.querySelectorAll('.structure-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                const structureId = slot.dataset.structureId;
                const isBuilt = slot.dataset.isBuilt === 'true';
                const isLocked = slot.dataset.isLocked === 'true';

                if (isBuilt || isLocked) return;

                this.showBuildConfirmModal(structureId);
            });
        });

        // Modal conferma
        const btnConfirm = document.getElementById('btn-confirm-build');
        const btnCancel = document.getElementById('btn-cancel-build');
        const modal = document.getElementById('stadium-confirm-modal');

        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                modal?.classList.add('hidden');
            });
        }

        if (btnConfirm) {
            btnConfirm.addEventListener('click', async () => {
                await this.handleBuildConfirm();
            });
        }

        // Click fuori dal modal per chiudere
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    },

    /**
     * Mostra il modal di conferma costruzione
     * @param {string} structureId - ID struttura
     */
    showBuildConfirmModal(structureId) {
        const structure = window.Stadium.STRUCTURES[structureId];
        if (!structure) return;

        const modal = document.getElementById('stadium-confirm-modal');
        const title = document.getElementById('modal-structure-title');
        const info = document.getElementById('modal-structure-info');
        const errorMsg = document.getElementById('modal-error-message');

        title.textContent = `Costruisci ${structure.name}`;

        const budget = this._teamData?.budget || 0;
        const canAfford = budget >= structure.cost;

        info.innerHTML = `
            <div class="text-center mb-4">
                <span class="text-5xl">${structure.icon}</span>
            </div>
            <div class="bg-gray-800 rounded-lg p-4 space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Struttura:</span>
                    <span class="text-white font-bold">${structure.name}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Descrizione:</span>
                    <span class="text-gray-300 text-sm">${structure.description}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Costo:</span>
                    <span class="${canAfford ? 'text-yellow-400' : 'text-red-400'} font-bold">${structure.cost} CS</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Bonus Casa:</span>
                    <span class="text-green-400 font-bold">+${structure.bonus}</span>
                </div>
                <div class="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span class="text-gray-400">Il tuo budget:</span>
                    <span class="${canAfford ? 'text-green-400' : 'text-red-400'} font-bold">${budget} CS</span>
                </div>
            </div>
        `;

        if (!canAfford) {
            errorMsg.textContent = 'Fondi insufficienti!';
        } else {
            errorMsg.textContent = '';
        }

        // Salva l'ID per il confirm
        modal.dataset.structureId = structureId;

        modal.classList.remove('hidden');
    },

    /**
     * Gestisce la conferma di costruzione
     */
    async handleBuildConfirm() {
        const modal = document.getElementById('stadium-confirm-modal');
        const structureId = modal?.dataset.structureId;
        const btnConfirm = document.getElementById('btn-confirm-build');
        const errorMsg = document.getElementById('modal-error-message');

        if (!structureId) return;

        btnConfirm.disabled = true;
        btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Costruendo...';

        const result = await window.Stadium.buildStructure(
            this._teamId,
            structureId,
            this._teamData?.budget || 0
        );

        if (result.success) {
            // Aggiorna dati locali
            this._stadiumData = window.Stadium._currentStadium;
            this._teamData.budget -= result.costPaid;

            // Mostra messaggio successo
            this.showMessage(`${result.structure.name} costruito! Bonus casa: +${result.newBonus.toFixed(2)}`, 'success');

            // Chiudi modal e re-render
            modal.classList.add('hidden');
            this.render();

        } else {
            errorMsg.textContent = result.error;
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = 'Costruisci';
        }
    },

    /**
     * Mostra un messaggio di feedback
     */
    showMessage(text, type = 'info') {
        const msgEl = document.getElementById('stadium-message');
        if (!msgEl) return;

        const colors = {
            success: 'text-green-400',
            error: 'text-red-400',
            info: 'text-blue-400',
            warning: 'text-yellow-400'
        };

        msgEl.textContent = text;
        msgEl.className = `text-center mt-4 text-sm ${colors[type] || colors.info}`;

        setTimeout(() => {
            msgEl.textContent = '';
        }, 4000);
    },

    /**
     * Escape HTML per prevenire XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

console.log("Modulo stadium-ui.js caricato.");
