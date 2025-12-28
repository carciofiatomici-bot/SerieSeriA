//
// ====================================================================
// GESTIONESQUADRE-FORMAZIONE.JS - Gestione Formazione e Drag & Drop
// ====================================================================
//

window.GestioneSquadreFormazione = {

    // Variabile per tracciare il drag target corrente
    currentDragTarget: null,

    /**
     * Renderizza il pannello di gestione formazione
     * @param {Object} teamData - Dati della squadra
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    render(teamData, context) {
        const { squadraMainTitle, squadraSubtitle, squadraToolsContainer } = context;
        const { MODULI } = window.GestioneSquadreConstants;
        const { displayMessage } = window.GestioneSquadreUtils;

        if (squadraMainTitle) squadraMainTitle.textContent = "Gestione Formazione";
        if (squadraSubtitle) squadraSubtitle.textContent = `Modulo Attuale: ${teamData.formation.modulo} | Trascina i giocatori in campo! (Forma attiva)`;

        // Legenda tipologie con badge system
        const legendHtml = `
            <div class="flex flex-col gap-2 p-2">
                <div class="flex justify-center items-center gap-3 flex-wrap">
                    <div class="flex items-center gap-1">
                        ${window.GestioneSquadreConstants.getTypeBadgeHtml('Potenza', 'sm')}
                        <span class="text-green-400 font-bold">></span>
                        ${window.GestioneSquadreConstants.getTypeBadgeHtml('Tecnica', 'sm')}
                        <span class="text-green-400 font-bold">></span>
                        ${window.GestioneSquadreConstants.getTypeBadgeHtml('Velocita', 'sm')}
                        <span class="text-green-400 font-bold">></span>
                        ${window.GestioneSquadreConstants.getTypeBadgeHtml('Potenza', 'sm')}
                    </div>
                </div>
                <div class="text-center text-xs text-gray-500">Bonus: +5% a +25% | Malus: -5% a -25%</div>
            </div>
        `;

        squadraToolsContainer.innerHTML = `
            <style>
                #field-area {
                    height: 700px;
                    background-image:
                        linear-gradient(to right, #14532d, #052e16),
                        url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="0" y="0" width="100" height="100" fill="%2314532d" /><rect x="0" y="40" width="100" height="20" fill="%23052e16" /><rect x="0" y="80" width="100" height="20" fill="%23052e16" /></svg>');
                    background-size: cover;
                    background-repeat: no-repeat;
                    position: relative;
                    overflow: hidden;
                    border: 4px solid white;
                    border-radius: 8px;
                }
                #field-area::before {
                    content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background-color: white; transform: translateY(-50%); z-index: 0;
                }
                #field-area::after {
                    content: ''; position: absolute; top: 0; left: 50%; bottom: 0; width: 2px; background-color: white; transform: translateX(-50%); z-index: 0;
                }
                #field-area .center-circle {
                    position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; border: 2px solid white; border-radius: 50%; transform: translate(-50%, -50%); z-index: 0;
                }
                #field-area .penalty-area-top, #field-area .penalty-area-bottom {
                    position: absolute; left: 50%; transform: translateX(-50%); width: 80%; height: 100px; border: 2px solid white; border-top: none; border-bottom: none; z-index: 0;
                }
                #field-area .penalty-area-top { top: 0; border-bottom: 2px solid white; }
                #field-area .penalty-area-bottom { bottom: 0; border-top: 2px solid white; }
                .player-card {
                    cursor: grab;
                    color: #1f2937;
                    text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
                }
                .empty-slot { border: 2px dashed #4ade80; }
                #titolari-slots { position: relative; height: 100%; }
                #panchina-slots { display: flex; align-items: center; justify-content: flex-start; gap: 8px; }
                .jersey-container { padding: 0.25rem; width: 96px; height: 96px; }
                .field-position-P { position: absolute; top: 5%; width: 100%; }
                .field-position-D { position: absolute; top: 30%; width: 100%; }
                .field-position-C { position: absolute; top: 55%; width: 100%; }
                .field-position-A { position: absolute; top: 80%; width: 100%; }
                .slot-target {
                    z-index: 10;
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: 6px;
                    box-sizing: border-box;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                }
                .empty-slot.slot-target {
                    border: 2px dashed #4ade80;
                    padding: 0.5rem;
                }
                .jersey-inner {
                    display: grid;
                    grid-template-rows: auto auto 1fr;
                    grid-template-columns: 1fr 1fr;
                    gap: 0;
                    width: 100%;
                    height: 100%;
                    font-size: 0.7rem;
                    line-height: 1;
                    padding: 0.1rem;
                    box-sizing: border-box;
                }
                .jersey-name { grid-column: 1 / 3; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
                .jersey-role { grid-column: 1 / 2; text-align: left; font-size: 0.6rem; color: #374151; font-weight: 600; padding-left: 2px; }
                .jersey-base-level { grid-column: 2 / 3; text-align: right; font-size: 0.6rem; color: #374151; font-weight: 600; padding-right: 2px;}
                .jersey-level-box { grid-column: 1 / 3; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 4px; }
                .level-text { font-size: 1.5rem; line-height: 1; font-weight: 900; }
                .mod-text { font-size: 0.6rem; line-height: 1; font-weight: 700; margin-top: 2px; }
            </style>

            <div id="formation-message" class="text-center mb-4 text-red-400"></div>

            <!-- Bottoni Auto Formazione e Salva Formazione -->
            <div class="grid grid-cols-2 gap-3 mb-4">
                <button id="btn-auto-formation"
                        class="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:from-purple-500 hover:to-pink-400 transition duration-150 transform hover:scale-[1.01] flex items-center justify-center gap-2">
                    <span>🤖</span> Auto Formazione
                </button>
                <button id="btn-save-formation"
                        class="bg-indigo-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-indigo-400 transition duration-150 transform hover:scale-[1.01]">
                    Salva Formazione
                </button>
            </div>

            <!-- Riga superiore: Seleziona Modulo (menu a scomparsa) -->
            <div class="mb-4">
                <div class="bg-gray-800 rounded-lg border border-indigo-500 overflow-hidden">
                    <div id="modulo-header" class="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700 transition-colors">
                        <div class="flex items-center gap-2">
                            <span id="modulo-toggle-icon" class="text-gray-400 transition-transform duration-200">▶</span>
                            <h3 class="text-lg font-bold text-indigo-400">Seleziona Modulo</h3>
                            <span class="text-gray-400 text-sm">(${teamData.formation.modulo})</span>
                        </div>
                        <div class="text-xs text-gray-400">Clicca per espandere</div>
                    </div>
                    <div id="modulo-content" class="hidden p-3 pt-0 border-t border-gray-700">
                        <div class="flex flex-col lg:flex-row gap-4 pt-3">
                            <div class="lg:flex-1">
                                <select id="formation-select" class="w-full p-2 rounded-lg bg-gray-700 text-white border border-indigo-600 text-sm">
                                    ${Object.keys(MODULI).map(mod => {
                                        const m = MODULI[mod];
                                        const rolesStr = ['P', 'D', 'C', 'A'].filter(r => m[r] > 0).map(r => r.repeat(m[r])).join('-');
                                        return `<option value="${mod}" ${teamData.formation.modulo === mod ? 'selected' : ''}>${mod} (${rolesStr})</option>`;
                                    }).join('')}
                                </select>
                                <p id="module-description" class="text-xs text-gray-400 mt-2">${MODULI[teamData.formation.modulo].description}</p>
                            </div>
                            <div class="lg:w-1/3">
                                ${this.renderFormationXpBarCompact(teamData)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Layout principale: Campo + Panchina + Rosa -->
            <div class="flex flex-col gap-4">
                <!-- Campo + Panchina -->
                <div class="space-y-4">
                    <div id="field-area" class="rounded-lg shadow-xl p-4 text-center">
                        <h4 class="text-white font-bold mb-4 z-10 relative">Campo (Titolari) - Modulo: ${teamData.formation.modulo}</h4>
                        <div class="center-circle"></div>
                        <div class="penalty-area-top"></div>
                        <div class="penalty-area-bottom"></div>
                        <div id="titolari-slots" class="h-full"></div>
                    </div>

                    <div id="bench-container" class="bg-gray-800 p-3 rounded-lg border-2 border-indigo-500 h-32">
                        <h4 class="text-indigo-400 font-bold mb-2">Panchina (Max 3 Giocatori)</h4>
                        <div class="flex h-16 gap-2">
                            <div id="panchina-slots" class="flex-1 items-center flex space-x-2"
                                 ondragover="event.preventDefault();"
                                 ondrop="window.GestioneSquadreFormazione.handleDrop(event, 'B')">
                            </div>
                            <!-- Zona rimozione giocatore -->
                            <div id="bench-remove-zone"
                                 class="w-16 h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-500 bg-red-900 bg-opacity-30 text-red-400 text-xs text-center cursor-pointer transition hover:bg-red-800 hover:bg-opacity-50"
                                 ondragover="event.preventDefault(); this.classList.add('bg-red-700', 'bg-opacity-70', 'border-solid');"
                                 ondragleave="this.classList.remove('bg-red-700', 'bg-opacity-70', 'border-solid');"
                                 ondrop="this.classList.remove('bg-red-700', 'bg-opacity-70', 'border-solid'); window.GestioneSquadreFormazione.handleDrop(event, 'ROSALIBERA');"
                                 title="Trascina qui per rimuovere dalla formazione">
                                <span class="text-lg">🗑️</span>
                                <span class="leading-tight">Rimuovi</span>
                            </div>
                        </div>
                    </div>

                    <!-- Rosa Disponibile (sotto la panchina) -->
                    <div class="p-3 bg-gray-800 rounded-lg border border-indigo-500">
                        <h3 class="text-sm font-bold text-indigo-400 border-b border-gray-600 pb-2 mb-2">Rosa Disponibile</h3>
                        <div id="full-squad-list" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 overflow-y-auto max-h-[250px] border border-gray-700 p-2 rounded-lg"
                             ondragover="event.preventDefault();"
                             ondrop="window.GestioneSquadreFormazione.handleDrop(event, 'ROSALIBERA')">
                        </div>
                    </div>

                    <!-- Infermeria -->
                    ${this.renderInjuredPlayersBoxCompact(teamData)}

                    <!-- Tipi a confronto (menu a scomparsa) -->
                    <div class="bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
                        <div id="tipi-header" class="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-700 transition-colors">
                            <div class="flex items-center gap-2">
                                <span id="tipi-toggle-icon" class="text-gray-400 transition-transform duration-200">▶</span>
                                <span class="text-sm font-bold text-gray-300">Tipi a confronto</span>
                            </div>
                        </div>
                        <div id="tipi-content" class="hidden border-t border-gray-700">
                            ${legendHtml}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Popover Click-to-Fill -->
            <div id="click-fill-popover"
                 class="hidden fixed z-[9999] bg-gray-800 border-2 border-green-500 rounded-lg shadow-2xl p-3"
                 style="max-height: 320px; width: 280px;">
                <div class="flex justify-between items-center mb-2 border-b border-gray-600 pb-2">
                    <span id="popover-title" class="text-green-400 font-bold text-sm">Seleziona Giocatore</span>
                    <button id="popover-close" class="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
                </div>
                <div id="popover-players" class="overflow-y-auto" style="max-height: 250px;">
                    <!-- Lista giocatori generata dinamicamente -->
                </div>
            </div>

            <!-- Modal Recupero Forma -->
            <div id="form-recovery-modal"
                 class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
                <div class="bg-gray-800 border-2 border-yellow-500 rounded-lg shadow-2xl p-6 max-w-sm mx-4">
                    <div class="flex justify-between items-center mb-4 border-b border-gray-600 pb-3">
                        <h3 class="text-yellow-400 font-bold text-lg flex items-center gap-2">
                            <span>💪</span> Recupero Forma
                        </h3>
                        <button id="form-recovery-close" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                    <div class="text-center mb-4">
                        <p id="form-recovery-player-name" class="text-white font-bold text-xl mb-2"></p>
                        <p class="text-gray-300 mb-3">
                            Questo giocatore e fuori forma
                            <span id="form-recovery-value" class="text-red-400 font-bold"></span>
                        </p>
                        <p class="text-gray-400 text-sm mb-4">
                            Vuoi riportare la forma a <span class="text-green-400 font-bold">0</span>?
                        </p>
                        <div class="bg-gray-700 rounded-lg p-4 mb-4">
                            <p class="text-gray-400 text-sm mb-1">Costo del recupero:</p>
                            <p id="form-recovery-cost" class="text-yellow-400 font-extrabold text-2xl"></p>
                        </div>
                        <p id="form-recovery-budget" class="text-gray-400 text-sm mb-4"></p>
                    </div>
                    <p id="form-recovery-message" class="text-center text-sm mb-4"></p>
                    <div class="flex gap-3">
                        <button id="btn-form-recovery-cancel"
                                class="flex-1 bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-500 transition">
                            Annulla
                        </button>
                        <button id="btn-form-recovery-pay"
                                class="flex-1 bg-yellow-600 text-white font-bold py-3 rounded-lg hover:bg-yellow-500 transition">
                            💰 Paga e Cura
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Guarigione Istantanea (Infermeria) -->
            <div id="instant-healing-modal"
                 class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
                <div class="bg-gray-800 border-2 border-red-500 rounded-lg shadow-2xl p-6 max-w-sm mx-4">
                    <div class="flex justify-between items-center mb-4 border-b border-gray-600 pb-3">
                        <h3 class="text-red-400 font-bold text-lg flex items-center gap-2">
                            <span>🏥</span> Guarigione Istantanea
                        </h3>
                        <button id="instant-healing-close" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                    <div class="text-center mb-4">
                        <p id="instant-healing-player-name" class="text-white font-bold text-xl mb-2"></p>
                        <p class="text-gray-300 mb-3">
                            Questo giocatore e infortunato
                            <span id="instant-healing-matches" class="text-red-400 font-bold"></span>
                        </p>
                        <p class="text-gray-400 text-sm mb-4">
                            Vuoi riabilitarlo immediatamente?
                        </p>
                        <div class="bg-gray-700 rounded-lg p-4 mb-4">
                            <p class="text-gray-400 text-sm mb-1">Costo della guarigione:</p>
                            <p id="instant-healing-cost" class="text-green-400 font-extrabold text-2xl"></p>
                        </div>
                        <p id="instant-healing-budget" class="text-gray-400 text-sm mb-4"></p>
                    </div>
                    <p id="instant-healing-message" class="text-center text-sm mb-4"></p>
                    <div class="flex gap-3">
                        <button id="btn-instant-healing-cancel"
                                class="flex-1 bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-500 transition">
                            Annulla
                        </button>
                        <button id="btn-instant-healing-pay"
                                class="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-500 transition">
                            💊 Paga e Guarisci
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Info Giocatore (unificato) -->
            <div id="player-info-modal"
                 class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
                <div class="bg-gray-800 border-2 border-blue-500 rounded-lg shadow-2xl p-5 max-w-sm mx-4 w-full">
                    <!-- Header -->
                    <div class="flex justify-between items-center mb-4 border-b border-gray-600 pb-3">
                        <h3 id="player-info-header" class="text-blue-400 font-bold text-lg flex items-center gap-2">
                            <span>📊</span> <span id="player-info-name">Giocatore</span>
                        </h3>
                        <button id="player-info-close" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>

                    <!-- Mini Stats -->
                    <div class="bg-gray-700 rounded-lg p-3 mb-4">
                        <p class="text-gray-400 text-xs mb-2 text-center font-semibold">STATISTICHE STAGIONE</p>
                        <div class="grid grid-cols-4 gap-2 text-center">
                            <div>
                                <p id="player-info-goals" class="text-white font-bold text-lg">-</p>
                                <p class="text-gray-400 text-xs">Gol</p>
                            </div>
                            <div>
                                <p id="player-info-assists" class="text-white font-bold text-lg">-</p>
                                <p class="text-gray-400 text-xs">Assist</p>
                            </div>
                            <div>
                                <p id="player-info-saves" class="text-white font-bold text-lg">-</p>
                                <p class="text-gray-400 text-xs">Parate</p>
                            </div>
                            <div>
                                <p id="player-info-rating" class="text-yellow-400 font-bold text-lg">-</p>
                                <p class="text-gray-400 text-xs">Voto</p>
                            </div>
                        </div>
                    </div>

                    <!-- Sezione Forma -->
                    <div id="player-info-form-section" class="bg-gray-700 rounded-lg p-3 mb-3">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-gray-400 text-xs font-semibold">FORMA</p>
                                <p id="player-info-form-value" class="text-white font-bold">0</p>
                            </div>
                            <button id="btn-player-info-cure-form"
                                    class="hidden bg-yellow-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-500 transition">
                                💪 Cura (<span id="player-info-form-cost">0</span> CS)
                            </button>
                        </div>
                    </div>

                    <!-- Sezione Infortunio -->
                    <div id="player-info-injury-section" class="bg-gray-700 rounded-lg p-3 mb-4">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-gray-400 text-xs font-semibold">INFORTUNIO</p>
                                <p id="player-info-injury-value" class="text-white font-bold">0 partite</p>
                            </div>
                            <button id="btn-player-info-cure-injury"
                                    class="hidden bg-green-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-green-500 transition">
                                🏥 Cura (<span id="player-info-injury-cost">0</span> CS)
                            </button>
                        </div>
                    </div>

                    <!-- Messaggio -->
                    <p id="player-info-message" class="text-center text-sm mb-3"></p>

                    <!-- Budget -->
                    <p id="player-info-budget" class="text-gray-400 text-xs text-center mb-3"></p>

                    <!-- Bottone Rimuovi dal campo -->
                    <button id="btn-player-info-remove"
                            class="hidden w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-500 transition mb-2">
                        🔄 Rimuovi dal campo
                    </button>

                    <!-- Bottone Chiudi -->
                    <button id="btn-player-info-close"
                            class="w-full bg-gray-600 text-white font-bold py-2.5 rounded-lg hover:bg-gray-500 transition">
                        Chiudi
                    </button>
                </div>
            </div>
        `;

        this.attachEventListeners(teamData, context);
        this.renderFieldSlots(teamData, context);
    },

    /**
     * Collega gli event listener per la formazione
     */
    attachEventListeners(teamData, context) {
        const { MODULI } = window.GestioneSquadreConstants;
        const { displayMessage } = window.GestioneSquadreUtils;

        const formationSelect = document.getElementById('formation-select');
        formationSelect.addEventListener('change', (e) => {
            const newModule = e.target.value;
            context.currentTeamData.formation.titolari = [];
            context.currentTeamData.formation.panchina = [];
            context.currentTeamData.formation.modulo = newModule;
            this.renderFieldSlots(context.currentTeamData, context);
            displayMessage('formation-message', `Modulo cambiato in ${newModule}. Rischiera i tuoi giocatori.`, 'info');
            document.getElementById('module-description').textContent = MODULI[newModule].description;
            const fieldHeader = document.querySelector('#field-area h4');
            if (fieldHeader) fieldHeader.textContent = `Campo (Titolari) - Modulo: ${newModule}`;
            // Aggiorna barra XP formazione (se presente)
            this.updateFormationXpBar(context.currentTeamData);
            // Aggiorna label nel header del menu a scomparsa
            const moduloHeader = document.getElementById('modulo-header');
            if (moduloHeader) {
                const labelSpan = moduloHeader.querySelector('.text-gray-400.text-sm');
                if (labelSpan) labelSpan.textContent = `(${newModule})`;
            }
        });

        // Toggle menu modulo a scomparsa
        document.getElementById('modulo-header')?.addEventListener('click', () => {
            const content = document.getElementById('modulo-content');
            const icon = document.getElementById('modulo-toggle-icon');
            if (content && icon) {
                content.classList.toggle('hidden');
                icon.style.transform = content.classList.contains('hidden') ? '' : 'rotate(90deg)';
            }
        });

        document.getElementById('btn-save-formation').addEventListener('click', () => this.handleSaveFormation(context));

        // Bottone Formazione Automatica
        document.getElementById('btn-auto-formation')?.addEventListener('click', () => this.handleAutoFormation(context));

        // Toggle menu Tipi a confronto
        document.getElementById('tipi-header')?.addEventListener('click', () => {
            const content = document.getElementById('tipi-content');
            const icon = document.getElementById('tipi-toggle-icon');
            if (content && icon) {
                content.classList.toggle('hidden');
                icon.style.transform = content.classList.contains('hidden') ? '' : 'rotate(90deg)';
            }
        });

        // Espone globalmente le funzioni drag and drop
        window.handleDragStart = (e) => this.handleDragStart(e);
        window.handleDragEnd = (e) => this.handleDragEnd(e);
        window.handleDrop = (e, role) => this.handleDrop(e, role, context);

        // Setup touch support per mobile
        this.setupTouchSupport(context);

        // Click-to-Fill: Chiudi popover con bottone X
        document.getElementById('popover-close')?.addEventListener('click', () => {
            this.closeClickFillPopover();
        });

        // Click-to-Fill: Chiudi popover con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeClickFillPopover();
                this.closeFormRecoveryModal();
                this.closeInstantHealingModal();
            }
        });

        // Form Recovery: Event listeners per il modal
        document.getElementById('form-recovery-close')?.addEventListener('click', () => {
            this.closeFormRecoveryModal();
        });

        document.getElementById('btn-form-recovery-cancel')?.addEventListener('click', () => {
            this.closeFormRecoveryModal();
        });

        document.getElementById('btn-form-recovery-pay')?.addEventListener('click', () => {
            this.handleFormRecovery(context);
        });

        // Chiudi modal cliccando fuori
        document.getElementById('form-recovery-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'form-recovery-modal') {
                this.closeFormRecoveryModal();
            }
        });

        // Instant Healing: Event listeners per il modal
        document.getElementById('instant-healing-close')?.addEventListener('click', () => {
            this.closeInstantHealingModal();
        });

        document.getElementById('btn-instant-healing-cancel')?.addEventListener('click', () => {
            this.closeInstantHealingModal();
        });

        document.getElementById('btn-instant-healing-pay')?.addEventListener('click', () => {
            this.handleInstantHealing(context);
        });

        // Chiudi modal cliccando fuori
        document.getElementById('instant-healing-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'instant-healing-modal') {
                this.closeInstantHealingModal();
            }
        });

        // Player Info Modal: Event listeners
        document.getElementById('player-info-close')?.addEventListener('click', () => {
            this.closePlayerInfoModal();
        });

        document.getElementById('btn-player-info-close')?.addEventListener('click', () => {
            this.closePlayerInfoModal();
        });

        document.getElementById('btn-player-info-cure-form')?.addEventListener('click', () => {
            this.handlePlayerInfoCureForm(context);
        });

        document.getElementById('btn-player-info-cure-injury')?.addEventListener('click', () => {
            this.handlePlayerInfoCureInjury(context);
        });

        document.getElementById('btn-player-info-remove')?.addEventListener('click', () => {
            this.handlePlayerInfoRemove(context);
        });

        // Chiudi modal cliccando fuori
        document.getElementById('player-info-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'player-info-modal') {
                this.closePlayerInfoModal();
            }
        });
    },

    // ========================================
    // TOUCH SUPPORT PER MOBILE
    // ========================================

    touchState: {
        isDragging: false,
        draggedElement: null,
        draggedPlayerId: null,
        ghostElement: null,
        startX: 0,
        startY: 0,
        longPressTimer: null
    },

    /**
     * Setup touch listeners per mobile
     */
    setupTouchSupport(context) {
        const fieldArea = document.getElementById('field-area');
        const panchinaSlots = document.getElementById('panchina-slots');
        const fullSquadList = document.getElementById('full-squad-list');

        [fieldArea, panchinaSlots, fullSquadList].forEach(container => {
            if (container) {
                container.addEventListener('touchstart', (e) => this.handleTouchStart(e, context), { passive: false });
                container.addEventListener('touchmove', (e) => this.handleTouchMove(e, context), { passive: false });
                container.addEventListener('touchend', (e) => this.handleTouchEnd(e, context));
                container.addEventListener('touchcancel', (e) => this.handleTouchEnd(e, context));
            }
        });
    },

    /**
     * Handle touch start
     */
    handleTouchStart(e, context) {
        const target = e.target.closest('.slot-target[data-id], .player-card[data-id]');
        if (!target || !target.dataset.id) return;

        const touch = e.touches[0];
        this.touchState.startX = touch.clientX;
        this.touchState.startY = touch.clientY;

        // Long press per attivare drag (300ms)
        this.touchState.longPressTimer = setTimeout(() => {
            this.startTouchDrag(target, touch, context);
        }, 300);
    },

    /**
     * Avvia il drag da touch
     */
    startTouchDrag(element, touch, context) {
        this.touchState.isDragging = true;
        this.touchState.draggedElement = element;
        this.touchState.draggedPlayerId = element.dataset.id;

        element.classList.add('opacity-50', 'border-4', 'border-indigo-400');

        // Crea ghost element
        this.createTouchGhost(element, touch);

        // Vibrazione feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    },

    /**
     * Crea ghost element per touch drag
     */
    createTouchGhost(element, touch) {
        const ghost = document.createElement('div');
        ghost.className = 'fixed pointer-events-none z-[9999] bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-bold';
        ghost.style.left = (touch.clientX - 40) + 'px';
        ghost.style.top = (touch.clientY - 20) + 'px';

        // Trova nome giocatore
        const nameEl = element.querySelector('.truncate') || element.querySelector('[class*="font-bold"]');
        ghost.textContent = nameEl?.textContent || 'Giocatore';

        document.body.appendChild(ghost);
        this.touchState.ghostElement = ghost;
    },

    /**
     * Handle touch move
     */
    handleTouchMove(e, context) {
        const touch = e.touches[0];

        // Cancella long press se si muove troppo prima dell'attivazione
        if (this.touchState.longPressTimer) {
            const dx = Math.abs(touch.clientX - this.touchState.startX);
            const dy = Math.abs(touch.clientY - this.touchState.startY);

            if (dx > 10 || dy > 10) {
                clearTimeout(this.touchState.longPressTimer);
                this.touchState.longPressTimer = null;
            }
        }

        if (!this.touchState.isDragging) return;

        e.preventDefault();

        // Aggiorna posizione ghost
        if (this.touchState.ghostElement) {
            this.touchState.ghostElement.style.left = (touch.clientX - 40) + 'px';
            this.touchState.ghostElement.style.top = (touch.clientY - 20) + 'px';
        }

        // Evidenzia drop zone sotto il dito
        this.highlightDropZone(touch.clientX, touch.clientY);
    },

    /**
     * Evidenzia la drop zone sotto il punto touch
     */
    highlightDropZone(x, y) {
        // Rimuovi highlight precedenti
        document.querySelectorAll('.touch-drop-highlight').forEach(el => {
            el.classList.remove('touch-drop-highlight', 'ring-4', 'ring-green-400');
        });

        // Nascondi ghost temporaneamente per trovare elemento sotto
        if (this.touchState.ghostElement) {
            this.touchState.ghostElement.style.display = 'none';
        }

        const elementBelow = document.elementFromPoint(x, y);

        if (this.touchState.ghostElement) {
            this.touchState.ghostElement.style.display = '';
        }

        // Trova drop zone valida
        const dropZone = elementBelow?.closest('.slot-target, #panchina-slots, #full-squad-list');
        if (dropZone) {
            dropZone.classList.add('touch-drop-highlight', 'ring-4', 'ring-green-400');
        }
    },

    /**
     * Handle touch end
     */
    handleTouchEnd(e, context) {
        // Cancella timer long press
        if (this.touchState.longPressTimer) {
            clearTimeout(this.touchState.longPressTimer);
            this.touchState.longPressTimer = null;
        }

        if (!this.touchState.isDragging) return;

        const touch = e.changedTouches[0];

        // Rimuovi highlight
        document.querySelectorAll('.touch-drop-highlight').forEach(el => {
            el.classList.remove('touch-drop-highlight', 'ring-4', 'ring-green-400');
        });

        // Nascondi ghost per trovare drop zone
        if (this.touchState.ghostElement) {
            this.touchState.ghostElement.style.display = 'none';
        }

        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

        // Trova drop zone
        const dropZone = elementBelow?.closest('.slot-target, #panchina-slots, #full-squad-list');

        if (dropZone && this.touchState.draggedPlayerId) {
            // Simula drop
            this.executeTouchDrop(dropZone, context);
        }

        // Cleanup
        this.cleanupTouchDrag();
    },

    /**
     * Esegue il drop da touch
     */
    executeTouchDrop(dropZone, context) {
        const { displayMessage, removePlayerFromPosition } = window.GestioneSquadreUtils;
        const playerId = this.touchState.draggedPlayerId;

        const player = context.currentTeamData.players.find(p => p.id === playerId);
        if (!player) {
            displayMessage('formation-message', 'Errore: Giocatore non trovato.', 'error');
            return;
        }

        // Determina target role prima per verificare infortuni
        let targetRole = dropZone.dataset.role;

        if (dropZone.id === 'panchina-slots' || dropZone.closest('#panchina-slots')) {
            targetRole = 'B';
        } else if (dropZone.id === 'full-squad-list' || dropZone.closest('#full-squad-list')) {
            targetRole = 'ROSALIBERA';
        }

        if (!targetRole) {
            // Prova a trovare il ruolo dal parent
            const parentSlot = dropZone.closest('[data-role]');
            if (parentSlot) {
                targetRole = parentSlot.dataset.role;
            }
        }

        if (!targetRole) {
            displayMessage('formation-message', 'Drop non valido.', 'error');
            return;
        }

        // Blocca giocatori infortunati (solo per campo e panchina, non per ROSALIBERA)
        if (window.Injuries?.isEnabled() && window.Injuries.isPlayerInjured(player)) {
            const remaining = window.Injuries.getRemainingMatches(player);
            if (targetRole !== 'ROSALIBERA') {
                displayMessage('formation-message', `${player.name} e infortunato! Non puo giocare per altre ${remaining} ${remaining === 1 ? 'partita' : 'partite'}.`, 'error');
                return;
            }
        }

        // Gestisci scambio se c'e' un giocatore nello slot
        let playerInSlot = null;
        if (dropZone.dataset.id && dropZone.dataset.id !== playerId) {
            playerInSlot = context.currentTeamData.players.find(p => p.id === dropZone.dataset.id);
        }

        // Rimuovi giocatore dalla posizione attuale
        removePlayerFromPosition(playerId, context.currentTeamData);

        if (targetRole === 'ROSALIBERA') {
            if (playerInSlot) removePlayerFromPosition(playerInSlot.id, context.currentTeamData);
            displayMessage('formation-message', `${player.name} liberato.`, 'success');
            // Re-render dopo rimozione
            this.renderFieldSlots(context.currentTeamData, context);
            return;

        } else if (targetRole === 'B') {
            if (playerInSlot) {
                removePlayerFromPosition(playerInSlot.id, context.currentTeamData);
            } else if (context.currentTeamData.formation.panchina.length >= 3) {
                displayMessage('formation-message', 'Panchina piena (max 3).', 'error');
                this.renderFieldSlots(context.currentTeamData, context);
                return;
            }
            context.currentTeamData.formation.panchina.push(player);
            displayMessage('formation-message', `${player.name} in panchina.`, 'success');

        } else {
            // Campo - verifica ruolo
            if (player.role !== targetRole && targetRole !== 'P' && targetRole !== 'D' && targetRole !== 'C' && targetRole !== 'A') {
                displayMessage('formation-message', 'Posizione non valida.', 'error');
                this.renderFieldSlots(context.currentTeamData, context);
                return;
            }

            if (playerInSlot) {
                removePlayerFromPosition(playerInSlot.id, context.currentTeamData);
                displayMessage('formation-message', `${player.name} scambiato con ${playerInSlot.name}.`, 'info');
            } else {
                displayMessage('formation-message', `${player.name} in campo come ${targetRole}.`, 'success');
            }

            // Salva la posizione assegnata per il calcolo della penalita fuori ruolo
            player.assignedPosition = targetRole;
            context.currentTeamData.formation.titolari.push(player);
        }

        // Re-render
        this.renderFieldSlots(context.currentTeamData, context);
    },

    /**
     * Cleanup dopo touch drag
     */
    cleanupTouchDrag() {
        if (this.touchState.draggedElement) {
            this.touchState.draggedElement.classList.remove('opacity-50', 'border-4', 'border-indigo-400');
        }

        if (this.touchState.ghostElement) {
            this.touchState.ghostElement.remove();
        }

        this.touchState = {
            isDragging: false,
            draggedElement: null,
            draggedPlayerId: null,
            ghostElement: null,
            startX: 0,
            startY: 0,
            longPressTimer: null
        };
    },

    /**
     * Crea lo slot per un giocatore nel campo
     */
    createPlayerSlot(role, index, player, context) {
        const slotId = `${role}-${index}`;
        const playerWithForm = player;

        const playerName = playerWithForm ? playerWithForm.name : `Slot ${role}`;
        const playerRole = playerWithForm ? playerWithForm.role : role;
        const levelText = playerWithForm ? (playerWithForm.currentLevel || playerWithForm.level || 1) : '';
        const baseLevel = playerWithForm ? (playerWithForm.level || playerWithForm.currentLevel || 1) : '';
        const bgColor = playerWithForm ? 'bg-gray-200' : 'bg-gray-700';
        const textColor = playerWithForm ? 'text-gray-900' : 'text-gray-400';

        const draggableAttr = playerWithForm ? `draggable="true" data-id="${playerWithForm.id}" data-role="${playerWithForm.role}" data-cost="${playerWithForm.cost}" ondragend="window.handleDragEnd(event)"` : '';

        let warningHtml = '';
        let tooltipText = '';
        const isOutOfPosition = playerWithForm && role !== 'B' && playerWithForm.role !== role;

        if (isOutOfPosition) {
            tooltipText = `ATTENZIONE: ${playerWithForm.name} e un ${playerWithForm.role} ma gioca come ${role}. L'impatto in partita sara minore.`;
            warningHtml = `
                <span class="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 cursor-help"
                      title="${tooltipText}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600 bg-white rounded-full shadow-lg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </span>
            `;
        }

        const formIconHtml = playerWithForm ?
            `<i class="${playerWithForm.formIcon} mr-1 text-base"></i>` :
            '';

        const modColor = playerWithForm && playerWithForm.formModifier > 0 ? 'text-green-600' : (playerWithForm && playerWithForm.formModifier < 0 ? 'text-red-600' : 'text-gray-600');
        const modText = playerWithForm && playerWithForm.formModifier !== 0 ? `(${playerWithForm.formModifier > 0 ? '+' : ''}${playerWithForm.formModifier})` : '(0)';

        // Badge tipologia (PlayerTypeBadge)
        const playerType = playerWithForm ? (playerWithForm.type || 'N/A') : 'N/A';
        const typeBadgeHtml = playerWithForm ? window.GestioneSquadreConstants.getTypeBadgeHtml(playerType, 'xs') : '';

        const internalLabelColor = 'text-gray-600';

        const playerContent = playerWithForm ?
            `<div class="jersey-inner">
                <span class="jersey-name" title="${playerWithForm.name}">${playerWithForm.name}</span>
                <span class="jersey-role ${internalLabelColor} flex items-center justify-center gap-1">
                    ${playerRole} ${typeBadgeHtml}
                </span>
                <span class="jersey-base-level ${internalLabelColor}">BASE: ${baseLevel}</span>
                <div class="jersey-level-box">
                    <div class="flex items-center">
                        ${formIconHtml}
                        <span class="level-text">${levelText}</span>
                    </div>
                    <span class="mod-text ${modColor}">${modText}</span>
                </div>
            </div>`
            :
            `<span class="font-semibold text-xs select-none">${role}</span>`;

        // Click handler per slot vuoti (Click-to-Fill) o per giocatori (Form Recovery)
        let clickHandler = '';
        let titleText = '';

        if (!playerWithForm) {
            // Slot vuoto: Click-to-Fill
            clickHandler = `onclick="window.GestioneSquadreFormazione.openClickFillPopover(event, '${role}', '${slotId}')"`;
            titleText = 'Clicca per selezionare un giocatore';
        } else {
            // Slot con giocatore: Form Recovery (se forma negativa)
            clickHandler = `onclick="window.GestioneSquadreFormazione.handlePlayerClick(event, '${playerWithForm.id}')"`;
            titleText = playerWithForm.formModifier < 0
                ? `${playerName} - Clicca per recuperare la forma`
                : playerName;
        }

        // Data attribute per la forma del giocatore
        const formDataAttr = playerWithForm ? `data-form-modifier="${playerWithForm.formModifier || 0}"` : '';

        return `
            <div data-role="${role}" id="${slotId}" class="slot-target w-full text-center rounded-lg shadow-inner-dark transition duration-150 cursor-pointer relative
                        ${bgColor} ${textColor}
                        ${playerWithForm ? 'player-card' : 'empty-slot hover:border-green-400 hover:bg-gray-600'} z-10 p-1"
                 ondragover="event.preventDefault();"
                 ondrop="window.GestioneSquadreFormazione.handleDrop(event, '${role}')"
                 ${draggableAttr}
                 ${formDataAttr}
                 ondragstart="window.handleDragStart(event)"
                 ${clickHandler}
                 title="${titleText}">
                ${playerContent}
                ${warningHtml}
            </div>
        `;
    },

    /**
     * Renderizza gli slot del campo
     */
    renderFieldSlots(teamData, context) {
        const { MODULI, ROLES, ROLE_ORDER } = window.GestioneSquadreConstants;
        const { sortPlayersByRole } = window.GestioneSquadreUtils;

        const formationData = teamData.formation;
        const currentModule = MODULI[formationData.modulo];
        const titolariSlots = document.getElementById('titolari-slots');
        const panchinaSlots = document.getElementById('panchina-slots');
        const fullSquadList = document.getElementById('full-squad-list');

        if (!titolariSlots || !panchinaSlots || !fullSquadList || !currentModule) return;

        const allPlayers = teamData.players;
        const usedIds = [...formationData.titolari.map(p => p.id), ...formationData.panchina.map(p => p.id)];
        let availablePlayers = allPlayers.filter(p => !usedIds.includes(p.id));
        availablePlayers = sortPlayersByRole(availablePlayers);

        let titolariToRender = [...formationData.titolari];

        titolariSlots.innerHTML = '';
        panchinaSlots.innerHTML = '';
        fullSquadList.innerHTML = '';

        let fieldHtml = '';

        const getPlayerForRole = (role) => {
            const index = titolariToRender.findIndex(p => p.role === role);
            if (index !== -1) {
                return titolariToRender.splice(index, 1)[0];
            }
            const firstAvailableIndex = titolariToRender.findIndex(p => p.role !== 'P' && p.role !== 'B');
            if (role !== 'P' && firstAvailableIndex !== -1) {
                return titolariToRender.splice(firstAvailableIndex, 1)[0];
            }
            return null;
        };

        // Portiere
        let portiere = null;
        const portiereIndex = titolariToRender.findIndex(p => p.role === 'P');
        if (portiereIndex !== -1) {
            portiere = titolariToRender.splice(portiereIndex, 1)[0];
        }

        fieldHtml += `
            <div class="field-position-P w-full flex justify-center">
                <div class="jersey-container">
                    ${this.createPlayerSlot('P', 0, portiere, context)}
                </div>
            </div>
        `;

        // Linee (D, C, A)
        const rolePositionsY = { 'D': 'field-position-D', 'C': 'field-position-C', 'A': 'field-position-A' };

        ROLES.filter(r => r !== 'P').forEach(role => {
            const slotsCount = currentModule[role];
            if (slotsCount === 0) return;

            fieldHtml += `
                <div class="${rolePositionsY[role]} w-full flex justify-center items-center">
                    <h5 class="absolute left-2 text-white font-bold text-sm z-0">${role} (${slotsCount})</h5>
                    <div class="flex justify-around w-full px-12">
                        ${Array(slotsCount).fill().map((_, index) => {
                            const player = getPlayerForRole(role);
                            return `
                                <div class="jersey-container">
                                    ${this.createPlayerSlot(role, index, player, context)}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        titolariSlots.innerHTML = fieldHtml;

        // Panchina
        panchinaSlots.innerHTML = teamData.formation.panchina.map((player, index) => {
            return `<div class="jersey-container">${this.createPlayerSlot('B', index, player, context)}</div>`;
        }).join('');

        panchinaSlots.innerHTML += Array(3 - teamData.formation.panchina.length).fill().map((_, index) => {
            return `<div class="jersey-container">${this.createPlayerSlot('B', teamData.formation.panchina.length + index, null, context)}</div>`;
        }).join('');

        // Rosa Completa
        if (availablePlayers.length === 0) {
            fullSquadList.innerHTML = '<p class="text-gray-400">Nessun giocatore disponibile (tutti in campo o in panchina).</p>';
        } else {
            fullSquadList.innerHTML = availablePlayers.map(player => {
                const playerWithForm = teamData.players.find(p => p.id === player.id) || player;
                const playerAbilities = (player.abilities || []).filter(a => a !== 'Icona');
                const abilitiesSummary = playerAbilities.length > 0
                    ? ` (${playerAbilities.slice(0, 2).join(', ')}${playerAbilities.length > 2 ? '...' : ''})`
                    : '';
                const isIcona = player.abilities && player.abilities.includes('Icona');
                const iconaBadge = isIcona ? `<span class="text-yellow-400 font-extrabold mr-1">(ICONA)</span>` : '';

                // Controllo infortunio
                const isInjured = window.Injuries?.isEnabled() && window.Injuries.isPlayerInjured(player);
                const injuryBadge = isInjured
                    ? `<span class="bg-red-800 text-red-300 px-1.5 py-0.5 rounded text-xs font-bold ml-1">🏥 ${window.Injuries.getRemainingMatches(player)}</span>`
                    : '';
                const injuredClass = isInjured
                    ? 'bg-red-900/50 text-gray-400 cursor-not-allowed opacity-60 border border-red-700'
                    : 'bg-gray-600 text-white cursor-grab hover:bg-gray-500';
                const draggableAttr = isInjured ? 'draggable="false"' : 'draggable="true"';

                // Indicatore equipaggiamento
                let equipBadge = '';
                if (window.FeatureFlags?.isEnabled('marketObjects')) {
                    const equipment = player.equipment || {};
                    const slots = ['cappello', 'maglia', 'guanti', 'parastinchi', 'scarpini'];
                    const equippedCount = slots.filter(s => equipment[s]).length;
                    if (equippedCount > 0) {
                        equipBadge = `<span class="text-emerald-400 text-xs ml-1" title="${equippedCount} oggetti equipaggiati">🎒${equippedCount}</span>`;
                    }
                }

                // Calcola livello base e corrente per la visualizzazione
                const baseLevel = playerWithForm.level || player.level || 1;
                const currentLevel = playerWithForm.currentLevel || baseLevel;
                const formMod = playerWithForm.formModifier || 0;
                const formModText = formMod !== 0 ? `<span class="${formMod > 0 ? 'text-green-400' : 'text-red-400'}">${formMod > 0 ? '+' : ''}${formMod}</span>` : '';

                // Colore ruolo
                const roleColors = { P: 'text-blue-400', D: 'text-green-400', C: 'text-yellow-400', A: 'text-red-400' };
                const roleColor = roleColors[player.role] || 'text-gray-400';

                return `
                    <div ${draggableAttr} data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}"
                         class="player-card p-1.5 ${injuredClass} rounded text-xs shadow transition duration-100 z-10 relative"
                         ${isInjured ? '' : 'ondragstart="window.handleDragStart(event)" ondragend="window.handleDragEnd(event)"'}
                         ${isInjured ? `title="${player.name} e infortunato per ${window.Injuries.getRemainingMatches(player)} partite"` : ''}>
                        <div class="flex items-center justify-between">
                            <span class="truncate font-semibold">${isIcona ? '⭐' : ''}${player.name}</span>
                            <span class="${roleColor} font-bold">${player.role}</span>
                        </div>
                        <div class="flex items-center justify-between text-[10px] mt-0.5">
                            <span class="text-yellow-300">Lv.${currentLevel} ${formModText}</span>
                            <span class="text-gray-500">${injuryBadge}${equipBadge}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    /**
     * Gestisce l'inizio del drag
     */
    handleDragStart(e) {
        const dragTarget = e.target.closest('.slot-target') || e.target.closest('.player-card');
        if (!dragTarget || !dragTarget.dataset.id) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', dragTarget.dataset.id);
        this.currentDragTarget = dragTarget;
        setTimeout(() => dragTarget.classList.add('opacity-50', 'border-4', 'border-indigo-400'), 0);
    },

    /**
     * Gestisce la fine del drag
     */
    handleDragEnd(e) {
        if (this.currentDragTarget) {
            this.currentDragTarget.classList.remove('opacity-50', 'border-4', 'border-indigo-400');
        }
        this.currentDragTarget = null;
    },

    /**
     * Gestisce il drop
     */
    handleDrop(e, targetRole, context) {
        e.preventDefault();

        // Se context non e definito, usa il contesto globale
        if (!context) {
            context = window.GestioneSquadreContext;
        }

        const { displayMessage, removePlayerFromPosition } = window.GestioneSquadreUtils;
        const droppedId = e.dataTransfer.getData('text/plain');

        if (!droppedId) {
            return displayMessage('formation-message', 'Drop fallito: ID Giocatore non trasferito.', 'error');
        }

        const player = context.currentTeamData.players.find(p => p.id === droppedId);
        if (!player) {
            return displayMessage('formation-message', 'Errore: Giocatore non trovato nella rosa (ID non valido).', 'error');
        }

        // Blocca giocatori infortunati (solo per campo e panchina, non per ROSALIBERA)
        if (window.Injuries?.isEnabled() && window.Injuries.isPlayerInjured(player)) {
            const remaining = window.Injuries.getRemainingMatches(player);
            if (targetRole !== 'ROSALIBERA') {
                return displayMessage('formation-message', `${player.name} e infortunato! Non puo giocare per altre ${remaining} ${remaining === 1 ? 'partita' : 'partite'}.`, 'error');
            }
        }

        let actualDropSlot = e.target.closest('.slot-target') || e.target.closest('#panchina-slots') || e.target.closest('#full-squad-list');

        if (!actualDropSlot) {
            return displayMessage('formation-message', 'Drop non valido.', 'error');
        }

        const finalTargetRole = actualDropSlot.dataset.role || targetRole;

        // Trova la posizione originale del giocatore trascinato PRIMA di rimuoverlo
        let originalPosition = null;
        const wasInTitolari = context.currentTeamData.formation.titolari?.find(p => p.id === droppedId);
        const wasInPanchina = context.currentTeamData.formation.panchina?.find(p => p.id === droppedId);
        if (wasInTitolari) {
            originalPosition = { type: 'titolari', role: wasInTitolari.assignedPosition || player.role };
        } else if (wasInPanchina) {
            originalPosition = { type: 'panchina' };
        }

        let playerInSlotBeforeDrop = null;
        if (actualDropSlot.classList.contains('player-card') || (actualDropSlot.classList.contains('slot-target') && actualDropSlot.dataset.id)) {
            const occupiedPlayerId = actualDropSlot.dataset.id || droppedId;
            if (occupiedPlayerId && occupiedPlayerId !== droppedId) {
                playerInSlotBeforeDrop = context.currentTeamData.players.find(p => p.id === occupiedPlayerId);
            }
        }

        removePlayerFromPosition(player.id, context.currentTeamData);

        if (finalTargetRole === 'ROSALIBERA') {
            if (playerInSlotBeforeDrop) removePlayerFromPosition(playerInSlotBeforeDrop.id, context.currentTeamData);
            displayMessage('formation-message', `${player.name} liberato da campo/panchina.`, 'success');

        } else if (finalTargetRole === 'B') {
            // Se c'è un giocatore nella posizione e il giocatore trascinato veniva dal campo, scambia
            if (playerInSlotBeforeDrop && originalPosition?.type === 'titolari') {
                removePlayerFromPosition(playerInSlotBeforeDrop.id, context.currentTeamData);
                // Metti il giocatore dello slot nella posizione originale del trascinato
                playerInSlotBeforeDrop.assignedPosition = originalPosition.role;
                context.currentTeamData.formation.titolari.push(playerInSlotBeforeDrop);
                displayMessage('formation-message', `Scambio: ${player.name} ↔ ${playerInSlotBeforeDrop.name}`, 'success');
            } else if (playerInSlotBeforeDrop) {
                removePlayerFromPosition(playerInSlotBeforeDrop.id, context.currentTeamData);
                displayMessage('formation-message', `${player.name} in panchina. ${playerInSlotBeforeDrop.name} liberato.`, 'info');
            } else if (context.currentTeamData.formation.panchina.length >= 3) {
                return displayMessage('formation-message', 'La panchina e piena (Max 3). Ridisegna per riprovare.', 'error');
            }

            context.currentTeamData.formation.panchina.push(player);
            if (!playerInSlotBeforeDrop) {
                displayMessage('formation-message', `${player.name} spostato in panchina.`, 'success');
            }

        } else {
            // Slot in campo
            if (playerInSlotBeforeDrop) {
                removePlayerFromPosition(playerInSlotBeforeDrop.id, context.currentTeamData);

                // Se il giocatore trascinato veniva da una posizione (campo o panchina), scambia
                if (originalPosition) {
                    if (originalPosition.type === 'titolari') {
                        // Scambio campo-campo: metti il giocatore dello slot nella posizione originale
                        playerInSlotBeforeDrop.assignedPosition = originalPosition.role;
                        context.currentTeamData.formation.titolari.push(playerInSlotBeforeDrop);
                    } else if (originalPosition.type === 'panchina') {
                        // Scambio panchina-campo: metti il giocatore dello slot in panchina
                        context.currentTeamData.formation.panchina.push(playerInSlotBeforeDrop);
                    }
                    displayMessage('formation-message', `Scambio: ${player.name} ↔ ${playerInSlotBeforeDrop.name}`, 'success');
                } else {
                    displayMessage('formation-message', `${player.name} ha preso il posto di ${playerInSlotBeforeDrop.name}.`, 'info');
                }
            } else {
                displayMessage('formation-message', `${player.name} messo in campo come ${finalTargetRole}.`, 'success');
            }

            // Salva la posizione assegnata per il calcolo della penalita fuori ruolo
            player.assignedPosition = finalTargetRole;
            context.currentTeamData.formation.titolari.push(player);
        }

        this.renderFieldSlots(context.currentTeamData, context);
    },

    /**
     * Salva la formazione su Firestore
     */
    async handleSaveFormation(context) {
        const { db, firestoreTools, TEAMS_COLLECTION_PATH, currentTeamId, currentTeamData } = context;
        const { displayMessage, cleanFormationForSave } = window.GestioneSquadreUtils;

        const saveButton = document.getElementById('btn-save-formation');
        saveButton.textContent = 'Salvataggio...';
        saveButton.disabled = true;
        displayMessage('formation-message', 'Salvataggio formazione in corso...', 'info');

        const { updateDoc, doc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

        const titolari = currentTeamData.formation.titolari;

        const portieriInCampo = titolari.filter(p => p.role === 'P').length;
        if (portieriInCampo !== 1) {
            displayMessage('formation-message', 'Errore: Devi schierare esattamente 1 Portiere in campo.', 'error');
            saveButton.textContent = 'Salva Formazione';
            saveButton.disabled = false;
            return;
        }

        const totalTitolari = titolari.length;
        if (totalTitolari !== 5) {
            displayMessage('formation-message', `Errore: Devi schierare esattamente 5 titolari (hai ${totalTitolari}).`, 'error');
            saveButton.textContent = 'Salva Formazione';
            saveButton.disabled = false;
            return;
        }

        const totalPanchina = currentTeamData.formation.panchina.length;
        if (totalPanchina > 3) {
            displayMessage('formation-message', `Errore: Puoi avere un massimo di 3 giocatori in panchina (hai ${totalPanchina}).`, 'error');
            saveButton.textContent = 'Salva Formazione';
            saveButton.disabled = false;
            return;
        }

        try {
            await updateDoc(teamDocRef, {
                formation: {
                    modulo: currentTeamData.formation.modulo,
                    titolari: cleanFormationForSave(currentTeamData.formation.titolari),
                    panchina: cleanFormationForSave(currentTeamData.formation.panchina)
                }
            });
            displayMessage('formation-message', 'Formazione salvata con successo!', 'success');

            if (window.currentTeamData) {
                window.InterfacciaCore.currentTeamData.formation = {
                    modulo: currentTeamData.formation.modulo,
                    titolari: cleanFormationForSave(currentTeamData.formation.titolari),
                    panchina: cleanFormationForSave(currentTeamData.formation.panchina)
                };
            }

            // Notifica per giocatori fuori ruolo
            const outOfPositionPlayers = currentTeamData.formation.titolari.filter(p =>
                p.assignedPosition && p.assignedPosition !== p.role
            );
            if (outOfPositionPlayers.length > 0 && window.Notifications?.notify?.outOfPosition) {
                const playerNames = outOfPositionPlayers.map(p => p.name);
                window.Notifications.notify.outOfPosition(outOfPositionPlayers.length, playerNames);
            }

            // Aggiorna l'alert sul bottone formazione nella dashboard
            if (window.InterfacciaDashboard?.updateFormationAlert) {
                window.InterfacciaDashboard.updateFormationAlert(window.InterfacciaCore.currentTeamData);
            }

        } catch (error) {
            console.error("Errore nel salvataggio:", error);
            displayMessage('formation-message', `Errore di salvataggio: ${error.message}`, 'error');
        } finally {
            saveButton.textContent = 'Salva Formazione';
            saveButton.disabled = false;
        }
    },

    // ========================================
    // CLICK-TO-FILL SYSTEM
    // ========================================

    // Variabili per tracciare il target del popover
    _popoverTargetRole: null,
    _popoverTargetSlotId: null,

    /**
     * Apre il popover Click-to-Fill per selezionare un giocatore
     * @param {Event} event - Evento click
     * @param {string} targetRole - Ruolo della posizione (P, D, C, A, B)
     * @param {string} slotId - ID dello slot (es: "D-0", "B-1")
     */
    openClickFillPopover(event, targetRole, slotId) {
        event.stopPropagation();

        const popover = document.getElementById('click-fill-popover');
        const playersList = document.getElementById('popover-players');
        const title = document.getElementById('popover-title');

        if (!popover || !playersList || !title) return;

        // Salva target per uso in selectPlayer
        this._popoverTargetRole = targetRole;
        this._popoverTargetSlotId = slotId;

        // Calcola giocatori disponibili
        const context = window.GestioneSquadreContext;
        const teamData = context.currentTeamData;
        const formation = teamData.formation;

        const usedIds = [
            ...formation.titolari.map(p => p.id),
            ...formation.panchina.map(p => p.id)
        ];
        let available = teamData.players.filter(p => !usedIds.includes(p.id));

        // Titolo dinamico
        const roleLabel = { 'P': 'Portiere', 'D': 'Difensore', 'C': 'Centrocampista', 'A': 'Attaccante', 'B': 'Panchina' };
        title.textContent = targetRole === 'B'
            ? 'Aggiungi in Panchina'
            : `Seleziona ${roleLabel[targetRole] || 'Giocatore'}`;

        // Ordina: prima ruolo compatibile, poi altri (per livello)
        if (targetRole !== 'B') {
            available.sort((a, b) => {
                const aMatch = a.role === targetRole ? 0 : 1;
                const bMatch = b.role === targetRole ? 0 : 1;
                if (aMatch !== bMatch) return aMatch - bMatch;
                return (b.level || 1) - (a.level || 1);
            });
        } else {
            // Per panchina ordina per livello
            available.sort((a, b) => (b.level || 1) - (a.level || 1));
        }

        // Genera HTML lista
        const roleColors = {
            'P': 'bg-yellow-600',
            'D': 'bg-blue-600',
            'C': 'bg-green-600',
            'A': 'bg-red-600'
        };

        playersList.innerHTML = available.length === 0
            ? '<p class="text-gray-400 text-center text-sm py-4">Nessun giocatore disponibile</p>'
            : available.map(p => {
                const isInjured = window.Injuries?.isEnabled() && window.Injuries.isPlayerInjured(p);
                const isCompatible = targetRole === 'B' || p.role === targetRole;
                const typeBadge = window.GestioneSquadreConstants.getTypeBadgeHtml(p.type || 'N/A', 'xs');
                const isIcona = p.abilities && p.abilities.includes('Icona');

                // Indicatore equipaggiamento
                let equipBadge = '';
                if (window.FeatureFlags?.isEnabled('marketObjects')) {
                    const equipment = p.equipment || {};
                    const slots = ['cappello', 'maglia', 'guanti', 'parastinchi', 'scarpini'];
                    const equippedCount = slots.filter(s => equipment[s]).length;
                    if (equippedCount > 0) {
                        equipBadge = `<span class="text-emerald-400 text-xs" title="${equippedCount} oggetti">🎒${equippedCount}</span>`;
                    }
                }

                const bgClass = isInjured
                    ? 'bg-red-900/50 opacity-50 cursor-not-allowed'
                    : isCompatible
                        ? 'bg-green-900/30 hover:bg-green-700'
                        : 'bg-gray-700 hover:bg-gray-600';

                const clickAttr = isInjured
                    ? ''
                    : `onclick="window.GestioneSquadreFormazione.selectPlayerFromPopover('${p.id}')"`;

                return `
                    <div class="p-2 rounded cursor-pointer flex items-center gap-2 mb-1 transition ${bgClass}"
                         ${clickAttr}>
                        <span class="text-xs px-1.5 py-0.5 rounded text-white font-bold ${roleColors[p.role] || 'bg-gray-600'}">${p.role}</span>
                        <span class="text-white text-sm flex-1 truncate">${isIcona ? '⭐ ' : ''}${p.name}</span>
                        <span class="text-gray-400 text-xs flex items-center gap-1">
                            ${typeBadge}
                            Lv.${p.level || 1}
                        </span>
                        ${equipBadge}
                        ${isInjured ? '<span class="text-red-400 text-xs" title="Infortunato">🏥</span>' : ''}
                        ${!isCompatible && targetRole !== 'B' ? '<span class="text-yellow-400 text-xs" title="Fuori ruolo">⚠️</span>' : ''}
                    </div>
                `;
            }).join('');

        // Posiziona popover vicino allo slot cliccato
        const slotRect = event.currentTarget.getBoundingClientRect();
        const popoverWidth = 280;
        const popoverHeight = 320;

        let left = slotRect.left + slotRect.width / 2 - popoverWidth / 2;
        let top = slotRect.bottom + 8;

        // Aggiusta se esce dallo schermo
        if (left < 10) left = 10;
        if (left + popoverWidth > window.innerWidth - 10) left = window.innerWidth - popoverWidth - 10;
        if (top + popoverHeight > window.innerHeight - 10) {
            top = slotRect.top - popoverHeight - 8; // Mostra sopra
        }

        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
        popover.classList.remove('hidden');

        // Chiudi cliccando fuori (con delay per evitare chiusura immediata)
        setTimeout(() => {
            document.addEventListener('click', this._closePopoverHandler);
        }, 10);
    },

    /**
     * Handler per chiudere il popover cliccando fuori
     */
    _closePopoverHandler(e) {
        const popover = document.getElementById('click-fill-popover');
        if (popover && !popover.contains(e.target)) {
            window.GestioneSquadreFormazione.closeClickFillPopover();
        }
    },

    /**
     * Chiude il popover Click-to-Fill
     */
    closeClickFillPopover() {
        const popover = document.getElementById('click-fill-popover');
        if (popover) popover.classList.add('hidden');
        document.removeEventListener('click', this._closePopoverHandler);
        this._popoverTargetRole = null;
        this._popoverTargetSlotId = null;
    },

    /**
     * Seleziona un giocatore dal popover e lo assegna allo slot
     * @param {string} playerId - ID del giocatore selezionato
     */
    selectPlayerFromPopover(playerId) {
        const targetRole = this._popoverTargetRole;
        const context = window.GestioneSquadreContext;
        const teamData = context.currentTeamData;
        const player = teamData.players.find(p => p.id === playerId);
        const { displayMessage, removePlayerFromPosition } = window.GestioneSquadreUtils;

        if (!player) {
            this.closeClickFillPopover();
            return;
        }

        // Verifica infortuni
        if (window.Injuries?.isEnabled() && window.Injuries.isPlayerInjured(player)) {
            displayMessage('formation-message',
                `${player.name} e infortunato e non puo giocare!`, 'error');
            this.closeClickFillPopover();
            return;
        }

        // Rimuovi da posizione precedente (se presente)
        removePlayerFromPosition(player.id, teamData);

        // Assegna alla nuova posizione
        if (targetRole === 'B') {
            // Panchina
            if (teamData.formation.panchina.length >= 3) {
                displayMessage('formation-message',
                    'La panchina e piena (Max 3).', 'error');
                this.closeClickFillPopover();
                return;
            }
            teamData.formation.panchina.push(player);
            displayMessage('formation-message',
                `${player.name} aggiunto in panchina.`, 'success');
        } else {
            // Titolare
            player.assignedPosition = targetRole;
            teamData.formation.titolari.push(player);

            const isOutOfPosition = player.role !== targetRole;
            if (isOutOfPosition) {
                displayMessage('formation-message',
                    `${player.name} schierato come ${targetRole} (ruolo originale: ${player.role}).`, 'info');
            } else {
                displayMessage('formation-message',
                    `${player.name} schierato in campo.`, 'success');
            }
        }

        // Chiudi popover e re-render
        this.closeClickFillPopover();
        this.renderFieldSlots(teamData, context);
    },

    // ========================================
    // FORM RECOVERY SYSTEM
    // ========================================

    // Variabili per tracciare il giocatore nel modal di recupero forma
    _formRecoveryPlayerId: null,
    _formRecoveryCost: 0,

    /**
     * Gestisce il click su un giocatore schierato
     * Apre sempre il modal info giocatore con stats, forma e infortunio
     * @param {Event} event - Evento click
     * @param {string} playerId - ID del giocatore
     */
    handlePlayerClick(event, playerId) {
        // Previeni interferenza con drag
        if (this.touchState?.isDragging) return;

        const context = window.GestioneSquadreContext;
        const teamData = context.currentTeamData;

        // Cerca il giocatore tra titolari e panchina (con forma applicata)
        const allFieldPlayers = [
            ...teamData.formation.titolari,
            ...teamData.formation.panchina
        ];

        // Cerca nella mappa delle forme
        const formsMap = context.formsMap;
        const formData = formsMap?.get(playerId);

        // Trova il giocatore
        const player = allFieldPlayers.find(p => p.id === playerId) ||
                       teamData.players.find(p => p.id === playerId);

        if (!player) return;

        // Determina la forma del giocatore
        const formModifier = formData?.mod ?? player.formModifier ?? 0;

        // Apri sempre il modal info giocatore
        this.openPlayerInfoModal(player, formModifier, teamData);
    },

    /**
     * Rimuove un giocatore dalla formazione (campo o panchina) e lo rimette nella rosa disponibile
     * @param {string} playerId - ID del giocatore
     * @param {string} location - 'field' o 'bench'
     */
    removePlayerFromSlot(playerId, location) {
        const context = window.GestioneSquadreContext;
        const teamData = context?.currentTeamData;

        if (!teamData || !playerId) {
            console.warn('[Formazione] Impossibile rimuovere giocatore: dati mancanti');
            return;
        }

        const { removePlayerFromPosition, displayMessage, saveFormation } = window.GestioneSquadreUtils;

        // Rimuovi il giocatore dalla posizione attuale
        removePlayerFromPosition(playerId, teamData);

        // Salva la formazione su Firestore
        const teamId = context.currentTeamId;
        if (teamId) {
            saveFormation(teamId, teamData.formation)
                .then(() => {
                    displayMessage('formation-message', 'Giocatore rimosso dalla formazione', 'success');
                })
                .catch(err => {
                    console.error('[Formazione] Errore salvataggio:', err);
                    displayMessage('formation-message', 'Errore nel salvataggio', 'error');
                });
        }

        // Aggiorna la visualizzazione
        this.renderFieldSlots(teamData, context);
    },

    /**
     * Apre il modal per il recupero forma
     * @param {Object} player - Dati del giocatore
     * @param {number} formModifier - Valore della forma (negativo)
     * @param {Object} teamData - Dati della squadra
     */
    openFormRecoveryModal(player, formModifier, teamData) {
        const modal = document.getElementById('form-recovery-modal');
        if (!modal) return;

        // Calcola il costo: 50 CS per livello di forma negativa
        const cost = Math.abs(formModifier) * 50;

        // Salva i dati per l'elaborazione
        this._formRecoveryPlayerId = player.id;
        this._formRecoveryCost = cost;

        // Aggiorna UI del modal
        document.getElementById('form-recovery-player-name').textContent = player.name;
        document.getElementById('form-recovery-value').textContent = `(${formModifier})`;
        document.getElementById('form-recovery-cost').textContent = `${cost} CS`;

        // Mostra il budget attuale
        const currentBudget = teamData.budget || 0;
        document.getElementById('form-recovery-budget').textContent =
            `Il tuo saldo attuale: ${currentBudget} CS`;

        // Pulisci eventuali messaggi precedenti
        const msgEl = document.getElementById('form-recovery-message');
        if (msgEl) {
            msgEl.textContent = '';
            msgEl.className = 'text-center text-sm mb-4';
        }

        // Abilita/disabilita bottone in base al budget
        const payBtn = document.getElementById('btn-form-recovery-pay');
        if (payBtn) {
            if (currentBudget < cost) {
                payBtn.disabled = true;
                payBtn.classList.add('opacity-50', 'cursor-not-allowed');
                payBtn.classList.remove('hover:bg-yellow-500');
            } else {
                payBtn.disabled = false;
                payBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                payBtn.classList.add('hover:bg-yellow-500');
            }
        }

        // Mostra il modal
        modal.classList.remove('hidden');
    },

    /**
     * Chiude il modal di recupero forma
     */
    closeFormRecoveryModal() {
        const modal = document.getElementById('form-recovery-modal');
        if (modal) modal.classList.add('hidden');

        this._formRecoveryPlayerId = null;
        this._formRecoveryCost = 0;
    },

    /**
     * Gestisce il pagamento e il recupero della forma
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    async handleFormRecovery(context) {
        const { displayMessage } = window.GestioneSquadreUtils;
        const { doc, updateDoc, appId } = window.firestoreTools;
        const db = window.db;

        const playerId = this._formRecoveryPlayerId;
        const cost = this._formRecoveryCost;
        const msgEl = document.getElementById('form-recovery-message');
        const payBtn = document.getElementById('btn-form-recovery-pay');

        if (!playerId || !context?.currentTeamData) {
            this.closeFormRecoveryModal();
            return;
        }

        const teamData = context.currentTeamData;
        const currentBudget = teamData.budget || 0;

        // Verifica fondi
        if (currentBudget < cost) {
            if (msgEl) {
                msgEl.textContent = '❌ Fondi insufficienti!';
                msgEl.className = 'text-center text-sm mb-4 text-red-400';
            }
            return;
        }

        // Disabilita bottone durante elaborazione
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.textContent = '⏳ Elaborazione...';
        }

        try {
            // Trova il giocatore
            const player = teamData.players.find(p => p.id === playerId);
            if (!player) {
                throw new Error('Giocatore non trovato');
            }

            // 1. Sottrai i CS dal budget
            const newBudget = currentBudget - cost;
            teamData.budget = newBudget;

            // 2. Aggiorna la forma del giocatore nella mappa
            const formsMap = context.formsMap;
            if (formsMap && formsMap.has(playerId)) {
                const currentForm = formsMap.get(playerId);
                const baseLevel = player.level || 1;

                // Imposta forma a 0
                formsMap.set(playerId, {
                    mod: 0,
                    icon: 'text-gray-400 fas fa-minus-circle',
                    level: baseLevel // Livello base senza modificatori
                });
            }

            // 3. Aggiorna playersFormStatus per Firestore
            const updatedFormStatus = {};
            if (formsMap) {
                formsMap.forEach((value, key) => {
                    updatedFormStatus[key] = value;
                });
            }

            // 4. Salva su Firestore
            const currentTeamId = window.InterfacciaCore?.currentTeamId;
            if (currentTeamId) {
                const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, currentTeamId);
                await updateDoc(teamDocRef, {
                    budget: newBudget,
                    playersFormStatus: updatedFormStatus
                });
            }

            // 5. Mostra successo
            if (msgEl) {
                msgEl.textContent = `✅ Forma recuperata! -${cost} CS`;
                msgEl.className = 'text-center text-sm mb-4 text-green-400';
            }

            // Aggiorna messaggio principale
            displayMessage('formation-message',
                `${player.name} ha recuperato la forma! (-${cost} CS)`, 'success');

            // Aggiorna budget display immediatamente
            this.updateBudgetDisplay(newBudget);

            // Aggiorna InterfacciaCore per sincronizzare globalmente
            if (window.InterfacciaCore?.setCurrentTeamData) {
                window.InterfacciaCore.setCurrentTeamData(teamData);
            }

            // 6. Chiudi modal e aggiorna UI immediatamente
            this.closeFormRecoveryModal();

            // Re-render completo del pannello per aggiornare la lista giocatori
            if (context.squadraToolsContainer) {
                this.render(teamData, context);
            }

        } catch (error) {
            console.error('Errore nel recupero forma:', error);
            if (msgEl) {
                msgEl.textContent = `❌ Errore: ${error.message}`;
                msgEl.className = 'text-center text-sm mb-4 text-red-400';
            }
        } finally {
            if (payBtn) {
                payBtn.disabled = false;
                payBtn.textContent = '💰 Paga e Cura';
            }
        }
    },

    /**
     * Renderizza la barra XP della formazione corrente (se feature attiva)
     */
    renderFormationXpBar(teamData) {
        // Se il sistema XP formazioni non e abilitato, non mostrare nulla
        if (!window.FeatureFlags?.isEnabled('formationXp')) return '';

        const modifiers = window.GestioneSquadreConstants?.FORMATION_MODIFIERS;
        if (!modifiers) return '';

        const modulo = teamData?.formation?.modulo || '1-1-2-1';
        const formationXp = teamData?.formationXp || {};
        const xp = formationXp[modulo] || 0;
        const level = modifiers.getLevelFromXP(xp);
        const progressPercent = modifiers.getProgressPercent(xp);
        const xpToNext = level >= modifiers.MAX_LEVEL ? 0 : modifiers.XP_PER_LEVEL - (xp % modifiers.XP_PER_LEVEL);
        const bonuses = modifiers.getModifiers(modulo, level);

        // Colori per livello (1-10)
        const levelColors = ['gray', 'green', 'blue', 'purple', 'yellow', 'orange', 'pink', 'cyan', 'red', 'amber'];
        const lvlColor = levelColors[level - 1] || 'amber';
        const barColorClass = `bg-${lvlColor}-500`;
        const textColorClass = `text-${lvlColor}-400`;

        // Descrizione bonus/malus attuali
        const bonusDescriptions = [];
        if (bonuses.fase1 > 0) bonusDescriptions.push(`+${bonuses.fase1.toFixed(1)} Costruzione`);
        if (bonuses.fase1 < 0) bonusDescriptions.push(`${bonuses.fase1.toFixed(1)} Costruzione`);
        if (bonuses.fase2Dif > 0) bonusDescriptions.push(`+${bonuses.fase2Dif.toFixed(1)} Difesa`);
        if (bonuses.fase2Dif < 0) bonusDescriptions.push(`${bonuses.fase2Dif.toFixed(1)} Difesa`);
        if (bonuses.fase3 > 0) bonusDescriptions.push(`+${bonuses.fase3.toFixed(1)} Tiro`);
        if (bonuses.fase3 < 0) bonusDescriptions.push(`${bonuses.fase3.toFixed(1)} Tiro`);

        const bonusText = bonusDescriptions.length > 0
            ? bonusDescriptions.join(' | ')
            : 'Nessun bonus/malus';

        return `
            <div id="formation-xp-bar" class="p-3 bg-gray-800 rounded-lg border border-${lvlColor}-500 mt-3">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-bold ${textColorClass} flex items-center gap-2">
                        <span>📈</span> Esperienza Modulo
                    </h4>
                    <span class="text-xs ${textColorClass} font-bold">Lv. ${level}/${modifiers.MAX_LEVEL}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-3 mb-2">
                    <div class="${barColorClass} h-3 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-400">
                    <span>${xp} XP</span>
                    ${level < modifiers.MAX_LEVEL
                        ? `<span>${xpToNext} XP al prossimo livello</span>`
                        : `<span class="text-yellow-400">LIVELLO MASSIMO!</span>`
                    }
                </div>
                <div class="mt-2 text-xs text-center ${textColorClass}">${bonusText}</div>
            </div>
        `;
    },

    /**
     * Renderizza una versione compatta della barra XP (per inserimento in altri box)
     */
    renderFormationXpBarCompact(teamData) {
        // Se il sistema XP formazioni non e abilitato, non mostrare nulla
        if (!window.FeatureFlags?.isEnabled('formationXp')) return '';

        const modifiers = window.GestioneSquadreConstants?.FORMATION_MODIFIERS;
        if (!modifiers) return '';

        const modulo = teamData?.formation?.modulo || '1-1-2-1';
        const formationXp = teamData?.formationXp || {};
        const xp = formationXp[modulo] || 0;
        const level = modifiers.getLevelFromXP(xp);
        const progressPercent = modifiers.getProgressPercent(xp);
        const bonuses = modifiers.getModifiers(modulo, level);

        // Colori per livello (1-10)
        const levelColors = ['gray', 'green', 'blue', 'purple', 'yellow', 'orange', 'pink', 'cyan', 'red', 'amber'];
        const lvlColor = levelColors[level - 1] || 'amber';
        const barColorClass = `bg-${lvlColor}-500`;
        const textColorClass = `text-${lvlColor}-400`;

        // Bonus compatti
        const bonusParts = [];
        if (bonuses.fase1 !== 0) bonusParts.push(`C:${bonuses.fase1 > 0 ? '+' : ''}${bonuses.fase1.toFixed(1)}`);
        if (bonuses.fase2Dif !== 0) bonusParts.push(`D:${bonuses.fase2Dif > 0 ? '+' : ''}${bonuses.fase2Dif.toFixed(1)}`);
        if (bonuses.fase3 !== 0) bonusParts.push(`T:${bonuses.fase3 > 0 ? '+' : ''}${bonuses.fase3.toFixed(1)}`);
        const bonusText = bonusParts.length > 0 ? bonusParts.join(' ') : '-';

        return `
            <div id="formation-xp-bar" class="mt-3 pt-3 border-t border-gray-600">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs ${textColorClass} font-bold">📈 Lv.${level}</span>
                    <span class="text-[10px] text-gray-400">${xp} XP</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2 mb-1">
                    <div class="${barColorClass} h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
                </div>
                <div class="text-[10px] ${textColorClass} text-center">${bonusText}</div>
            </div>
        `;
    },

    /**
     * Aggiorna dinamicamente la barra XP della formazione (quando cambia modulo)
     */
    updateFormationXpBar(teamData) {
        const existingBar = document.getElementById('formation-xp-bar');
        if (existingBar) {
            existingBar.outerHTML = this.renderFormationXpBarCompact(teamData);
        }
    },

    /**
     * Renderizza il box degli infortunati (se feature attiva)
     */
    renderInjuredPlayersBox(teamData) {
        // Se il sistema infortuni non e abilitato, non mostrare nulla
        if (!window.Injuries?.isEnabled()) return '';

        const injuredPlayers = window.Injuries.getInjuredPlayers(teamData);

        if (injuredPlayers.length === 0) {
            return `
                <div class="p-3 bg-gray-800 rounded-lg border border-gray-600 mt-4">
                    <h4 class="text-sm font-bold text-red-400 flex items-center gap-2 mb-2">
                        <span>🏥</span> Infermeria
                    </h4>
                    <p class="text-gray-500 text-sm text-center">Nessun giocatore infortunato</p>
                </div>
            `;
        }

        const playersHtml = injuredPlayers.map(p => {
            const remaining = p.injury.remainingMatches;
            const playerLevel = p.level || p.currentLevel || 1;
            // Costo: 100 * Giornate rimaste (0 se ha Fatto d'acciaio)
            const hasFattoDAcciaio = p.abilities?.includes("Fatto d'acciaio");
            const healingCost = hasFattoDAcciaio ? 0 : 100 * remaining;

            const roleColors = {
                'P': 'bg-yellow-600 text-yellow-100',
                'D': 'bg-blue-600 text-blue-100',
                'C': 'bg-green-600 text-green-100',
                'A': 'bg-red-600 text-red-100'
            };
            const roleBadge = `<span class="px-1.5 py-0.5 ${roleColors[p.role] || 'bg-gray-600 text-gray-100'} rounded text-xs font-bold">${p.role}</span>`;

            return `
                <div class="flex items-center justify-between py-2 px-3 bg-red-900/30 rounded border border-red-700 mb-1 cursor-pointer hover:bg-red-800/50 transition"
                     onclick="window.GestioneSquadreFormazione.openInstantHealingModal('${p.id}')"
                     title="Clicca per guarire istantaneamente (${healingCost} CS)">
                    <div class="flex items-center gap-2">
                        ${roleBadge}
                        <span class="text-white text-sm">${p.name}</span>
                        <span class="text-gray-400 text-xs">(Liv. ${playerLevel})</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-green-400 text-xs font-bold" title="Costo guarigione">${healingCost} CS</span>
                        <span class="text-red-400 text-xs font-bold">🏥 ${remaining} ${remaining === 1 ? 'partita' : 'partite'}</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="p-3 bg-gray-800 rounded-lg border border-red-500 mt-4">
                <h4 class="text-sm font-bold text-red-400 flex items-center gap-2 mb-2">
                    <span>🏥</span> Infermeria (${injuredPlayers.length})
                </h4>
                <div class="max-h-32 overflow-y-auto">
                    ${playersHtml}
                </div>
                <p class="text-xs text-green-400 mt-2 text-center font-semibold">💊 Clicca su un giocatore per guarirlo istantaneamente</p>
            </div>
        `;
    },

    /**
     * Renderizza il box compatto degli infortunati per la colonna Rosa Disponibile
     */
    renderInjuredPlayersBoxCompact(teamData) {
        // Se il sistema infortuni non e abilitato, non mostrare nulla
        if (!window.Injuries?.isEnabled()) return '';

        const injuredPlayers = window.Injuries.getInjuredPlayers(teamData);

        // Nascondi completamente se non ci sono infortunati
        if (injuredPlayers.length === 0) {
            return '';
        }

        const playersHtml = injuredPlayers.map(p => {
            const remaining = p.injury.remainingMatches;
            // Costo: 100 * Giornate rimaste (0 se ha Fatto d'acciaio)
            const hasFattoDAcciaio = p.abilities?.includes("Fatto d'acciaio");
            const healingCost = hasFattoDAcciaio ? 0 : 100 * remaining;

            const roleColors = {
                'P': 'text-yellow-400',
                'D': 'text-blue-400',
                'C': 'text-green-400',
                'A': 'text-red-400'
            };

            return `
                <div class="flex items-center justify-between py-1 px-1.5 bg-red-900/30 rounded border border-red-700/50 mb-1 cursor-pointer hover:bg-red-800/50 transition text-[10px]"
                     onclick="window.GestioneSquadreFormazione.openInstantHealingModal('${p.id}')"
                     title="Clicca per guarire (${healingCost} CS)">
                    <div class="flex items-center gap-1 truncate">
                        <span class="${roleColors[p.role] || 'text-gray-400'} font-bold">${p.role}</span>
                        <span class="text-white truncate">${p.name}</span>
                    </div>
                    <span class="text-red-400 font-bold whitespace-nowrap">🏥${remaining}</span>
                </div>
            `;
        }).join('');

        return `
            <div id="injured-box-compact" class="mt-3 p-2 bg-gray-700/50 rounded-lg border border-red-500">
                <h4 class="text-xs font-bold text-red-400 flex items-center gap-1 mb-2">
                    <span>🏥</span> Infermeria (${injuredPlayers.length})
                </h4>
                <div class="max-h-24 overflow-y-auto">
                    ${playersHtml}
                </div>
                <p class="text-[9px] text-green-400 mt-1 text-center">💊 Clicca per guarire</p>
            </div>
        `;
    },

    // ========================================
    // INSTANT HEALING SYSTEM (Infermeria)
    // ========================================

    // Variabili per tracciare il giocatore nel modal di guarigione
    _instantHealingPlayerId: null,
    _instantHealingCost: 0,

    /**
     * Apre il modal per la guarigione istantanea
     * @param {string} playerId - ID del giocatore infortunato
     */
    openInstantHealingModal(playerId) {
        const context = window.GestioneSquadreContext;
        const teamData = context?.currentTeamData;

        if (!teamData) return;

        const modal = document.getElementById('instant-healing-modal');
        if (!modal) return;

        // Trova il giocatore
        const player = teamData.players?.find(p => p.id === playerId);
        if (!player || !player.injury) return;

        const playerLevel = player.level || player.currentLevel || 1;
        const remainingMatches = player.injury.remainingMatches;

        // Calcola il costo: 100 * Giornate rimaste (0 se ha Fatto d'acciaio)
        const hasFattoDAcciaio = player.abilities?.includes("Fatto d'acciaio");
        const cost = hasFattoDAcciaio ? 0 : 100 * remainingMatches;

        // Salva i dati per l'elaborazione
        this._instantHealingPlayerId = playerId;
        this._instantHealingCost = cost;

        // Aggiorna UI del modal
        document.getElementById('instant-healing-player-name').textContent = player.name;
        document.getElementById('instant-healing-matches').textContent =
            `(${remainingMatches} ${remainingMatches === 1 ? 'partita' : 'partite'} rimanenti)`;
        document.getElementById('instant-healing-cost').textContent = `${cost} CS`;

        // Mostra il budget attuale
        const currentBudget = teamData.budget || 0;
        document.getElementById('instant-healing-budget').textContent =
            `Il tuo saldo attuale: ${currentBudget} CS`;

        // Pulisci eventuali messaggi precedenti
        const msgEl = document.getElementById('instant-healing-message');
        if (msgEl) {
            msgEl.textContent = '';
            msgEl.className = 'text-center text-sm mb-4';
        }

        // Abilita/disabilita bottone in base al budget
        const payBtn = document.getElementById('btn-instant-healing-pay');
        if (payBtn) {
            if (currentBudget < cost) {
                payBtn.disabled = true;
                payBtn.classList.add('opacity-50', 'cursor-not-allowed');
                payBtn.classList.remove('hover:bg-green-500');
            } else {
                payBtn.disabled = false;
                payBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                payBtn.classList.add('hover:bg-green-500');
            }
        }

        // Mostra il modal
        modal.classList.remove('hidden');
    },

    /**
     * Chiude il modal di guarigione istantanea
     */
    closeInstantHealingModal() {
        const modal = document.getElementById('instant-healing-modal');
        if (modal) modal.classList.add('hidden');

        this._instantHealingPlayerId = null;
        this._instantHealingCost = 0;
    },

    /**
     * Gestisce il pagamento e la guarigione istantanea
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    async handleInstantHealing(context) {
        const { displayMessage } = window.GestioneSquadreUtils;
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;

        const playerId = this._instantHealingPlayerId;
        const cost = this._instantHealingCost;
        const msgEl = document.getElementById('instant-healing-message');
        const payBtn = document.getElementById('btn-instant-healing-pay');

        if (!playerId || !context?.currentTeamData) {
            this.closeInstantHealingModal();
            return;
        }

        const teamData = context.currentTeamData;
        const currentBudget = teamData.budget || 0;

        // Verifica fondi
        if (currentBudget < cost) {
            if (msgEl) {
                msgEl.textContent = '❌ Fondi insufficienti!';
                msgEl.className = 'text-center text-sm mb-4 text-red-400';
            }
            return;
        }

        // Disabilita bottone durante elaborazione
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.textContent = '⏳ Elaborazione...';
        }

        try {
            // Trova il giocatore
            const playerIndex = teamData.players?.findIndex(p => p.id === playerId);
            if (playerIndex === -1) {
                throw new Error('Giocatore non trovato');
            }

            const player = teamData.players[playerIndex];

            // 1. Sottrai i CS dal budget
            const newBudget = currentBudget - cost;
            teamData.budget = newBudget;

            // 2. Rimuovi lo stato di infortunio dal giocatore (in locale)
            const { injury, ...playerWithoutInjury } = player;
            teamData.players[playerIndex] = playerWithoutInjury;

            // 3. Salva su Firestore
            const currentTeamId = window.InterfacciaCore?.currentTeamId;
            if (currentTeamId) {
                const teamDocRef = doc(db, `artifacts/${window.appId}/public/data/teams`, currentTeamId);
                await updateDoc(teamDocRef, {
                    budget: newBudget,
                    players: teamData.players
                });
            }

            // 4. Mostra successo
            if (msgEl) {
                msgEl.textContent = `✅ ${player.name} e guarito! -${cost} CS`;
                msgEl.className = 'text-center text-sm mb-4 text-green-400';
            }

            // Aggiorna messaggio principale
            displayMessage('formation-message',
                `${player.name} e stato guarito e puo tornare in campo! (-${cost} CS)`, 'success');

            // Aggiorna budget display immediatamente
            this.updateBudgetDisplay(newBudget);

            // Aggiorna InterfacciaCore per sincronizzare globalmente
            if (window.InterfacciaCore?.setCurrentTeamData) {
                window.InterfacciaCore.setCurrentTeamData(teamData);
            }

            // 5. Chiudi modal e aggiorna UI immediatamente
            this.closeInstantHealingModal();

            // Re-render del pannello formazione per aggiornare l'infermeria
            if (context.squadraToolsContainer) {
                this.render(teamData, context);
            }

        } catch (error) {
            console.error('Errore nella guarigione istantanea:', error);
            if (msgEl) {
                msgEl.textContent = `❌ Errore: ${error.message}`;
                msgEl.className = 'text-center text-sm mb-4 text-red-400';
            }
        } finally {
            if (payBtn) {
                payBtn.disabled = false;
                payBtn.textContent = '💊 Paga e Guarisci';
            }
        }
    },

    // ========================================
    // PLAYER INFO MODAL SYSTEM (Unificato)
    // ========================================

    // Variabili per il modal info giocatore
    _playerInfoPlayerId: null,
    _playerInfoFormCost: 0,
    _playerInfoInjuryCost: 0,

    /**
     * Apre il modal info giocatore con stats, forma e infortunio
     * @param {Object} player - Dati del giocatore
     * @param {number} formModifier - Modificatore forma
     * @param {Object} teamData - Dati della squadra
     */
    async openPlayerInfoModal(player, formModifier, teamData) {
        const modal = document.getElementById('player-info-modal');
        if (!modal) return;

        this._playerInfoPlayerId = player.id;

        // Aggiorna nome giocatore
        document.getElementById('player-info-name').textContent = `${player.name} (${player.role})`;

        // Carica e mostra statistiche
        await this.loadPlayerInfoStats(player.id, teamData);

        // Sezione FORMA
        const formValue = document.getElementById('player-info-form-value');
        const formBtn = document.getElementById('btn-player-info-cure-form');
        const formCostEl = document.getElementById('player-info-form-cost');

        if (formModifier < 0) {
            formValue.textContent = formModifier.toString();
            formValue.className = 'text-red-400 font-bold';
            // Costo: 50 CS per livello di forma negativa
            const formCost = Math.abs(formModifier) * 50;
            this._playerInfoFormCost = formCost;
            formCostEl.textContent = formCost;
            formBtn.classList.remove('hidden');
        } else {
            formValue.textContent = formModifier >= 0 ? `+${formModifier}` : formModifier.toString();
            formValue.className = formModifier > 0 ? 'text-green-400 font-bold' : 'text-white font-bold';
            formBtn.classList.add('hidden');
            this._playerInfoFormCost = 0;
        }

        // Sezione INFORTUNIO
        const injuryValue = document.getElementById('player-info-injury-value');
        const injuryBtn = document.getElementById('btn-player-info-cure-injury');
        const injuryCostEl = document.getElementById('player-info-injury-cost');

        const isInjured = window.Injuries?.isEnabled() && window.Injuries.isPlayerInjured(player);
        const remainingMatches = isInjured ? window.Injuries.getRemainingMatches(player) : 0;

        injuryValue.textContent = `${remainingMatches} ${remainingMatches === 1 ? 'partita' : 'partite'}`;

        if (isInjured && remainingMatches > 0) {
            injuryValue.className = 'text-red-400 font-bold';
            // Costo: 100 CS per partita (0 se ha Fatto d'acciaio)
            const hasFattoDAcciaio = player.abilities?.includes("Fatto d'acciaio");
            const injuryCost = hasFattoDAcciaio ? 0 : remainingMatches * 100;
            this._playerInfoInjuryCost = injuryCost;
            injuryCostEl.textContent = injuryCost;
            injuryBtn.classList.remove('hidden');
        } else {
            injuryValue.className = 'text-green-400 font-bold';
            injuryBtn.classList.add('hidden');
            this._playerInfoInjuryCost = 0;
        }

        // Mostra budget
        const currentBudget = teamData.budget || 0;
        document.getElementById('player-info-budget').textContent = `Saldo: ${currentBudget} CS`;

        // Pulisci messaggi
        const msgEl = document.getElementById('player-info-message');
        if (msgEl) {
            msgEl.textContent = '';
            msgEl.className = 'text-center text-sm mb-3';
        }

        // Mostra/nascondi bottone rimuovi dal campo
        const removeBtn = document.getElementById('btn-player-info-remove');
        const isInTitolari = teamData.formation?.titolari?.some(p => p.id === player.id);
        const isInPanchina = teamData.formation?.panchina?.some(p => p.id === player.id);
        if (removeBtn) {
            if (isInTitolari || isInPanchina) {
                removeBtn.classList.remove('hidden');
                removeBtn.textContent = isInTitolari ? '🔄 Rimuovi dal campo' : '🔄 Rimuovi dalla panchina';
            } else {
                removeBtn.classList.add('hidden');
            }
        }

        // Mostra modal
        modal.classList.remove('hidden');
    },

    /**
     * Carica le statistiche del giocatore
     */
    async loadPlayerInfoStats(playerId, teamData) {
        const goalsEl = document.getElementById('player-info-goals');
        const assistsEl = document.getElementById('player-info-assists');
        const savesEl = document.getElementById('player-info-saves');
        const ratingEl = document.getElementById('player-info-rating');

        // Reset a loading
        goalsEl.textContent = '...';
        assistsEl.textContent = '...';
        savesEl.textContent = '...';
        ratingEl.textContent = '...';

        try {
            const teamId = window.InterfacciaCore?.currentTeamId;
            if (!teamId || !window.PlayerStats) {
                goalsEl.textContent = '-';
                assistsEl.textContent = '-';
                savesEl.textContent = '-';
                ratingEl.textContent = '-';
                return;
            }

            const stats = await window.PlayerStats.getPlayerStats(teamId, playerId);

            if (stats) {
                goalsEl.textContent = stats.goals || 0;
                assistsEl.textContent = stats.assists || 0;
                savesEl.textContent = stats.saves || 0;
                // Calcola media voto
                const avgRating = stats.matchesPlayed > 0
                    ? (stats.totalContribution / stats.matchesPlayed).toFixed(1)
                    : '-';
                ratingEl.textContent = avgRating;
            } else {
                goalsEl.textContent = '0';
                assistsEl.textContent = '0';
                savesEl.textContent = '0';
                ratingEl.textContent = '-';
            }
        } catch (error) {
            console.error('Errore caricamento stats giocatore:', error);
            goalsEl.textContent = '-';
            assistsEl.textContent = '-';
            savesEl.textContent = '-';
            ratingEl.textContent = '-';
        }
    },

    /**
     * Chiude il modal info giocatore
     */
    closePlayerInfoModal() {
        const modal = document.getElementById('player-info-modal');
        if (modal) modal.classList.add('hidden');

        this._playerInfoPlayerId = null;
        this._playerInfoFormCost = 0;
        this._playerInfoInjuryCost = 0;
    },

    /**
     * Gestisce la cura della forma dal modal info
     */
    async handlePlayerInfoCureForm(context) {
        const { displayMessage } = window.GestioneSquadreUtils;
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;

        const playerId = this._playerInfoPlayerId;
        const cost = this._playerInfoFormCost;
        const msgEl = document.getElementById('player-info-message');

        if (!playerId || !context?.currentTeamData) return;

        const teamData = context.currentTeamData;
        const currentBudget = teamData.budget || 0;

        if (currentBudget < cost) {
            if (msgEl) {
                msgEl.textContent = '❌ Fondi insufficienti!';
                msgEl.className = 'text-center text-sm mb-3 text-red-400';
            }
            return;
        }

        try {
            // Aggiorna budget
            const newBudget = currentBudget - cost;
            teamData.budget = newBudget;

            // Resetta forma a 0
            const player = teamData.players.find(p => p.id === playerId);
            if (player) player.formModifier = 0;

            // Aggiorna playersFormStatus
            if (!teamData.playersFormStatus) teamData.playersFormStatus = {};
            if (teamData.playersFormStatus[playerId]) {
                teamData.playersFormStatus[playerId].mod = 0;
                teamData.playersFormStatus[playerId].level = player?.level || 1;
            }

            // Salva su Firestore
            const currentTeamId = window.InterfacciaCore?.currentTeamId;
            const appId = window.firestoreTools?.appId;
            if (currentTeamId && appId) {
                const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, currentTeamId);

                // Sanitizza players rimuovendo valori undefined
                const sanitizedPlayers = teamData.players.map(p => {
                    const clean = {};
                    for (const [key, value] of Object.entries(p)) {
                        if (value !== undefined) clean[key] = value;
                    }
                    return clean;
                });

                // Sanitizza playersFormStatus
                const sanitizedFormStatus = {};
                if (teamData.playersFormStatus) {
                    for (const [id, status] of Object.entries(teamData.playersFormStatus)) {
                        if (status && typeof status === 'object') {
                            sanitizedFormStatus[id] = {};
                            for (const [key, value] of Object.entries(status)) {
                                if (value !== undefined) sanitizedFormStatus[id][key] = value;
                            }
                        }
                    }
                }

                await updateDoc(teamDocRef, {
                    budget: newBudget,
                    players: sanitizedPlayers,
                    playersFormStatus: sanitizedFormStatus
                });
            }

            if (msgEl) {
                msgEl.textContent = `✅ Forma curata! -${cost} CS`;
                msgEl.className = 'text-center text-sm mb-3 text-green-400';
            }

            // Aggiorna budget nel modal immediatamente
            document.getElementById('player-info-budget').textContent = `Saldo: ${newBudget} CS`;

            // Aggiorna InterfacciaCore per sincronizzare globalmente
            if (window.InterfacciaCore) {
                window.InterfacciaCore.currentTeamData = teamData;
            }

            // Aggiorna header budget se presente
            this.updateBudgetDisplay(newBudget);

            displayMessage('formation-message', `Forma di ${player?.name || 'giocatore'} ripristinata! (-${cost} CS)`, 'success');

            // Renderizza immediatamente per aggiornare la lista giocatori
            this.render(teamData, context);

            // Chiudi modal dopo un breve delay per mostrare il messaggio
            setTimeout(() => {
                this.closePlayerInfoModal();
            }, 800);

        } catch (error) {
            console.error('Errore cura forma:', error);
            if (msgEl) {
                msgEl.textContent = `❌ Errore: ${error.message}`;
                msgEl.className = 'text-center text-sm mb-3 text-red-400';
            }
        }
    },

    /**
     * Gestisce la cura dell'infortunio dal modal info
     */
    async handlePlayerInfoCureInjury(context) {
        const { displayMessage } = window.GestioneSquadreUtils;
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;

        const playerId = this._playerInfoPlayerId;
        const cost = this._playerInfoInjuryCost;
        const msgEl = document.getElementById('player-info-message');

        if (!playerId || !context?.currentTeamData) return;

        const teamData = context.currentTeamData;
        const currentBudget = teamData.budget || 0;

        if (currentBudget < cost) {
            if (msgEl) {
                msgEl.textContent = '❌ Fondi insufficienti!';
                msgEl.className = 'text-center text-sm mb-3 text-red-400';
            }
            return;
        }

        try {
            // Aggiorna budget
            const newBudget = currentBudget - cost;
            teamData.budget = newBudget;

            // Rimuovi infortunio
            const player = teamData.players.find(p => p.id === playerId);
            if (player && player.injury) {
                delete player.injury;
            }

            // Salva su Firestore
            const currentTeamId = window.InterfacciaCore?.currentTeamId;
            const appId = window.firestoreTools?.appId;
            if (currentTeamId && appId) {
                const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, currentTeamId);
                await updateDoc(teamDocRef, {
                    budget: newBudget,
                    players: teamData.players
                });
            }

            if (msgEl) {
                msgEl.textContent = `✅ Infortunio guarito! -${cost} CS`;
                msgEl.className = 'text-center text-sm mb-3 text-green-400';
            }

            // Aggiorna budget nel modal immediatamente
            document.getElementById('player-info-budget').textContent = `Saldo: ${newBudget} CS`;

            // Aggiorna InterfacciaCore per sincronizzare globalmente
            if (window.InterfacciaCore) {
                window.InterfacciaCore.currentTeamData = teamData;
            }

            // Aggiorna header budget se presente
            this.updateBudgetDisplay(newBudget);

            displayMessage('formation-message', `${player?.name || 'Giocatore'} e guarito! (-${cost} CS)`, 'success');

            // Renderizza immediatamente per aggiornare la lista giocatori
            this.render(teamData, context);

            // Chiudi modal dopo un breve delay per mostrare il messaggio
            setTimeout(() => {
                this.closePlayerInfoModal();
            }, 800);

        } catch (error) {
            console.error('Errore guarigione infortunio:', error);
            if (msgEl) {
                msgEl.textContent = `❌ Errore: ${error.message}`;
                msgEl.className = 'text-center text-sm mb-3 text-red-400';
            }
        }
    },

    /**
     * Rimuove il giocatore dal campo/panchina e lo riporta alla rosa disponibile
     */
    handlePlayerInfoRemove(context) {
        const { removePlayerFromPosition } = window.GestioneSquadreUtils;
        const { displayMessage } = window.GestioneSquadreUtils;

        const playerId = this._playerInfoPlayerId;
        if (!playerId || !context?.currentTeamData) return;

        const teamData = context.currentTeamData;
        const player = teamData.players?.find(p => p.id === playerId);
        if (!player) return;

        // Rimuovi dalla posizione corrente
        removePlayerFromPosition(playerId, teamData);

        // Chiudi modal e aggiorna UI
        this.closePlayerInfoModal();
        this.renderFieldSlots(teamData, context);

        displayMessage('formation-message', `${player.name} rimosso e disponibile in rosa.`, 'success');
    },

    /**
     * Aggiorna il display del budget in tutti i punti dell'interfaccia
     * @param {number} newBudget - Nuovo valore del budget
     */
    updateBudgetDisplay(newBudget) {
        // Aggiorna squadra-subtitle se presente (vista rosa)
        const squadraSubtitle = document.getElementById('squadra-subtitle');
        if (squadraSubtitle && squadraSubtitle.textContent.includes('Budget')) {
            const teamData = window.GestioneSquadreContext?.currentTeamData;
            if (teamData) {
                const playerCount = window.getPlayerCountExcludingIcona ?
                    window.getPlayerCountExcludingIcona(teamData.players) :
                    (teamData.players?.length || 0);
                const maxPlayers = window.InterfacciaConstants?.MAX_ROSA_PLAYERS || 12;
                squadraSubtitle.textContent = `Budget Rimanente: ${newBudget} Crediti Seri | Giocatori in rosa: ${playerCount}/${maxPlayers} (+ Icona)`;
            }
        }

        // Aggiorna form-recovery-budget se aperto
        const formRecoveryBudget = document.getElementById('form-recovery-budget');
        if (formRecoveryBudget) {
            formRecoveryBudget.textContent = `Il tuo saldo attuale: ${newBudget} CS`;
        }

        // Aggiorna instant-healing-budget se aperto
        const instantHealingBudget = document.getElementById('instant-healing-budget');
        if (instantHealingBudget) {
            instantHealingBudget.textContent = `Il tuo saldo attuale: ${newBudget} CS`;
        }

        // Emetti evento per altri componenti
        window.dispatchEvent(new CustomEvent('budgetUpdated', { detail: { budget: newBudget } }));
    },

    // ========================================
    // AUTO FORMATION SYSTEM
    // ========================================

    /**
     * Calcola la miglior formazione automatica
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    handleAutoFormation(context) {
        const { displayMessage } = window.GestioneSquadreUtils;

        // Verifica feature flag
        if (!window.FeatureFlags?.isEnabled('autoFormation')) {
            displayMessage('formation-message', '❌ Funzionalita Auto Formazione non attiva.', 'error');
            return;
        }

        const teamData = context.currentTeamData;
        if (!teamData || !teamData.players || teamData.players.length === 0) {
            displayMessage('formation-message', '❌ Nessun giocatore disponibile.', 'error');
            return;
        }

        // Calcola la formazione ottimale
        const optimalFormation = this.calculateOptimalFormation(teamData);

        if (!optimalFormation) {
            displayMessage('formation-message', '❌ Impossibile generare una formazione valida.', 'error');
            return;
        }

        // Applica la formazione
        teamData.formation.titolari = optimalFormation.titolari;
        teamData.formation.panchina = optimalFormation.panchina;
        teamData.formation.modulo = optimalFormation.modulo;

        // Aggiorna il context
        context.currentTeamData = teamData;

        // Aggiorna UI del modulo
        const { MODULI } = window.GestioneSquadreConstants;
        const formationSelect = document.getElementById('formation-select');
        if (formationSelect) {
            formationSelect.value = optimalFormation.modulo;
        }
        const moduleDescription = document.getElementById('module-description');
        if (moduleDescription && MODULI[optimalFormation.modulo]) {
            moduleDescription.textContent = MODULI[optimalFormation.modulo].description;
        }
        const fieldAreaHeader = document.querySelector('#field-area h4');
        if (fieldAreaHeader) {
            fieldAreaHeader.textContent = `Campo (Titolari) - Modulo: ${optimalFormation.modulo}`;
        }

        // Re-render degli slot (non tutto il pannello per evitare listener duplicati)
        this.renderFieldSlots(teamData, context);

        // Aggiorna barra XP formazione
        this.updateFormationXpBar(teamData);

        displayMessage('formation-message', `✅ Formazione ottimale applicata! Modulo: ${optimalFormation.modulo}`, 'success');
    },

    /**
     * Calcola la formazione ottimale considerando livello, tipologia, abilita, infortuni e FORMA
     * @param {Object} teamData - Dati della squadra
     * @returns {Object|null} Formazione ottimale {titolari, panchina, modulo}
     */
    calculateOptimalFormation(teamData) {
        const { MODULI } = window.GestioneSquadreConstants;
        const players = teamData.players || [];

        // Recupera i modificatori di forma salvati
        const playersFormStatus = teamData.playersFormStatus || {};

        // Filtra giocatori disponibili (non infortunati) e arricchisci con forma
        const availablePlayers = players.filter(p => {
            if (window.Injuries?.isEnabled() && window.Injuries.isPlayerInjured(p)) {
                return false;
            }
            return true;
        }).map(p => {
            // Arricchisci il giocatore con il modificatore di forma e livello effettivo
            const formData = playersFormStatus[p.id];
            const formMod = formData?.mod ?? 0;
            const baseLevel = p.level || 1;
            // Calcola livello effettivo (base + forma), clampato tra 1 e 30
            const effectiveLevel = Math.min(30, Math.max(1, baseLevel + formMod));
            return {
                ...p,
                formModifier: formMod,
                effectiveLevel: effectiveLevel
            };
        });

        if (availablePlayers.length < 5) {
            return null; // Non abbastanza giocatori
        }

        // Separa per ruolo
        const byRole = {
            P: availablePlayers.filter(p => p.role === 'P'),
            D: availablePlayers.filter(p => p.role === 'D'),
            C: availablePlayers.filter(p => p.role === 'C'),
            A: availablePlayers.filter(p => p.role === 'A')
        };

        // Calcola punteggio per ogni giocatore (ora include la forma)
        const scoredPlayers = availablePlayers.map(p => ({
            ...p,
            score: this.calculatePlayerScore(p)
        }));

        // Ordina per punteggio (decrescente) all'interno di ogni ruolo
        for (const role of ['P', 'D', 'C', 'A']) {
            byRole[role] = byRole[role]
                .map(p => scoredPlayers.find(sp => sp.id === p.id))
                .filter(p => p)
                .sort((a, b) => b.score - a.score);
        }

        // Trova il miglior modulo basato sui giocatori disponibili
        const bestModulo = this.findBestModulo(byRole, MODULI);

        if (!bestModulo) {
            return null;
        }

        const moduloConfig = MODULI[bestModulo];

        // Verifica che il modulo abbia una configurazione valida
        if (!moduloConfig) {
            return null;
        }

        const titolari = [];

        // Seleziona giocatori per ogni slot del modulo
        const usedIds = new Set();

        // 1. Portiere (sempre 1)
        if (byRole.P.length > 0) {
            const keeper = byRole.P[0];
            keeper.assignedPosition = 'P';
            titolari.push(keeper);
            usedIds.add(keeper.id);
        } else {
            return null; // Nessun portiere
        }

        // 2. Difensori
        const numDef = moduloConfig.D || 0;
        for (let i = 0; i < numDef; i++) {
            const available = byRole.D.filter(p => !usedIds.has(p.id));
            if (available.length > 0) {
                const player = available[0];
                player.assignedPosition = 'D';
                titolari.push(player);
                usedIds.add(player.id);
            }
        }

        // 3. Centrocampisti
        const numMid = moduloConfig.C || 0;
        for (let i = 0; i < numMid; i++) {
            const available = byRole.C.filter(p => !usedIds.has(p.id));
            if (available.length > 0) {
                const player = available[0];
                player.assignedPosition = 'C';
                titolari.push(player);
                usedIds.add(player.id);
            }
        }

        // 4. Attaccanti
        const numFwd = moduloConfig.A || 0;
        for (let i = 0; i < numFwd; i++) {
            const available = byRole.A.filter(p => !usedIds.has(p.id));
            if (available.length > 0) {
                const player = available[0];
                player.assignedPosition = 'A';
                titolari.push(player);
                usedIds.add(player.id);
            }
        }

        // Verifica che abbiamo 5 titolari
        if (titolari.length < 5) {
            // Riempi con altri giocatori disponibili
            const remaining = scoredPlayers.filter(p => !usedIds.has(p.id));
            while (titolari.length < 5 && remaining.length > 0) {
                const next = remaining.shift();
                next.assignedPosition = next.role;
                titolari.push(next);
                usedIds.add(next.id);
            }
        }

        // Panchina: i migliori 3 tra i rimanenti
        const panchina = scoredPlayers
            .filter(p => !usedIds.has(p.id))
            .slice(0, 3);

        return {
            titolari,
            panchina,
            modulo: bestModulo
        };
    },

    /**
     * Calcola il punteggio di un giocatore per la selezione automatica
     * @param {Object} player - Dati del giocatore (con effectiveLevel se disponibile)
     * @returns {number} Punteggio
     */
    calculatePlayerScore(player) {
        let score = 0;

        // Base: usa effectiveLevel (livello + forma) se disponibile, altrimenti livello base
        // Questo garantisce che un giocatore Lv5 con +2 forma (=7 effettivo)
        // abbia punteggio maggiore di un Lv7 con -1 forma (=6 effettivo)
        const level = player.effectiveLevel || player.level || player.currentLevel || 1;
        score += level * 10;

        // Bonus per Icona
        const isIcona = player.abilities && player.abilities.includes('Icona');
        if (isIcona) {
            score += 50;
        }

        // Bonus per abilita positive
        const abilities = player.abilities || [];
        const NEGATIVE_ABILITIES = ['Mani di Pastafrolla', 'Brocco', 'Piedi di Cemento', 'Pettinatura 500e',
            'Gambe molli', 'Testa vuota', 'Piede sbagliato', 'Riflessi lenti', 'Occhio pigro',
            'Permaloso', 'Fumo negli occhi', 'Passo lento', 'Tiratore maldestro'];

        const positiveAbilities = abilities.filter(a => !NEGATIVE_ABILITIES.includes(a) && a !== 'Icona');
        score += positiveAbilities.length * 8;

        // Malus per abilita negative
        const negativeAbilities = abilities.filter(a => NEGATIVE_ABILITIES.includes(a));
        score -= negativeAbilities.length * 5;

        // Bonus per tipologia (varieta nella squadra)
        const typeBonus = { 'Potenza': 2, 'Tecnica': 2, 'Velocita': 2 };
        score += typeBonus[player.type] || 0;

        // Bonus per capitano
        if (player.isCaptain) {
            score += 15;
        }

        return score;
    },

    /**
     * Trova il miglior modulo basato sui giocatori disponibili
     * @param {Object} byRole - Giocatori per ruolo {P, D, C, A}
     * @param {Object} MODULI - Configurazione moduli
     * @returns {string|null} Nome del modulo migliore
     */
    findBestModulo(byRole, MODULI) {
        const counts = {
            P: byRole.P.length,
            D: byRole.D.length,
            C: byRole.C.length,
            A: byRole.A.length
        };

        // Calcola punteggio per ogni modulo
        let bestModulo = null;
        let bestScore = -1;

        for (const [moduloName, moduloConfig] of Object.entries(MODULI)) {
            // Salta moduli senza configurazione valida
            if (!moduloConfig || moduloConfig.P === undefined) {
                continue;
            }

            const required = {
                P: 1,
                D: moduloConfig.D || 0,
                C: moduloConfig.C || 0,
                A: moduloConfig.A || 0
            };

            // Verifica se abbiamo abbastanza giocatori
            const canUse = counts.P >= required.P &&
                           counts.D >= required.D &&
                           counts.C >= required.C &&
                           counts.A >= required.A;

            if (!canUse) continue;

            // Calcola punteggio del modulo (somma dei punteggi dei migliori giocatori)
            let moduloScore = 0;

            // Portiere
            if (byRole.P[0]) moduloScore += byRole.P[0].score;

            // Difensori
            for (let i = 0; i < required.D; i++) {
                if (byRole.D[i]) moduloScore += byRole.D[i].score;
            }

            // Centrocampisti
            for (let i = 0; i < required.C; i++) {
                if (byRole.C[i]) moduloScore += byRole.C[i].score;
            }

            // Attaccanti
            for (let i = 0; i < required.A; i++) {
                if (byRole.A[i]) moduloScore += byRole.A[i].score;
            }

            if (moduloScore > bestScore) {
                bestScore = moduloScore;
                bestModulo = moduloName;
            }
        }

        return bestModulo;
    },

    /**
     * Verifica se la formazione attuale e' ottimale
     * @param {Object} teamData - Dati della squadra
     * @returns {boolean} True se la formazione potrebbe essere migliorata
     */
    canImproveFormation(teamData) {
        if (!window.FeatureFlags?.isEnabled('autoFormation')) {
            return false;
        }

        const currentFormation = teamData.formation;
        if (!currentFormation || !currentFormation.titolari || currentFormation.titolari.length < 5) {
            return true; // Formazione incompleta
        }

        // Calcola formazione ottimale
        const optimal = this.calculateOptimalFormation(teamData);
        if (!optimal) return false;

        // Confronta: se i titolari sono diversi, potrebbe migliorare
        const currentIds = new Set(currentFormation.titolari.map(t => t.id));
        const optimalIds = new Set(optimal.titolari.map(t => t.id));

        // Se ci sono giocatori diversi, puo' migliorare
        for (const id of optimalIds) {
            if (!currentIds.has(id)) {
                return true;
            }
        }

        return false;
    }
};

console.log("Modulo GestioneSquadre-Formazione caricato.");
