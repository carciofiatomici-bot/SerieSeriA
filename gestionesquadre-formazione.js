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
        const { MODULI, TYPE_LEGEND_URL } = window.GestioneSquadreConstants;
        const { displayMessage } = window.GestioneSquadreUtils;

        squadraMainTitle.textContent = "Gestione Formazione";
        squadraSubtitle.textContent = `Modulo Attuale: ${teamData.formation.modulo} | Trascina i giocatori in campo! (Forma attiva)`;

        const legendHtml = `
            <div class="flex justify-center items-center p-2">
                <img src="${TYPE_LEGEND_URL}" alt="Legenda Tipologie" class="w-full h-auto max-w-xs rounded-lg shadow-xl">
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

            <div class="flex flex-col lg:flex-row gap-6">
                <div class="lg:w-1/3 p-4 bg-gray-800 rounded-lg border border-indigo-500 space-y-4">
                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2">Seleziona Modulo</h3>
                    <select id="formation-select" class="w-full p-2 rounded-lg bg-gray-700 text-white border border-indigo-600">
                        ${Object.keys(MODULI).map(mod => {
                            const m = MODULI[mod];
                            const rolesStr = ['P', 'D', 'C', 'A'].filter(r => m[r] > 0).map(r => r.repeat(m[r])).join('-');
                            return `<option value="${mod}" ${teamData.formation.modulo === mod ? 'selected' : ''}>${mod} (${rolesStr})</option>`;
                        }).join('')}
                    </select>
                    <p id="module-description" class="text-sm text-gray-400">${MODULI[teamData.formation.modulo].description}</p>

                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2 pt-4">Legenda Tipologie (Type)</h3>
                    <div class="p-3 bg-gray-700 rounded-lg border border-gray-600 shadow-inner">
                         ${legendHtml}
                    </div>

                    ${this.renderInjuredPlayersBox(teamData)}

                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2 pt-4">Rosa Completa (Disponibili)</h3>
                    <div id="full-squad-list" class="space-y-2 max-h-60 overflow-y-auto min-h-[100px] border border-gray-700 p-2 rounded-lg"
                         ondragover="event.preventDefault();"
                         ondrop="window.GestioneSquadreFormazione.handleDrop(event, 'ROSALIBERA')">
                    </div>
                </div>

                <div class="lg:w-2/3 space-y-4">
                    <div id="field-area" class="rounded-lg shadow-xl p-4 text-center">
                        <h4 class="text-white font-bold mb-4 z-10 relative">Campo (Titolari) - Modulo: ${teamData.formation.modulo}</h4>
                        <div class="center-circle"></div>
                        <div class="penalty-area-top"></div>
                        <div class="penalty-area-bottom"></div>
                        <div id="titolari-slots" class="h-full"></div>
                    </div>

                    <div id="bench-container" class="bg-gray-800 p-3 rounded-lg border-2 border-indigo-500 h-32">
                        <h4 class="text-indigo-400 font-bold mb-2">Panchina (Max 3 Giocatori)</h4>
                        <div id="panchina-slots" class="h-16 items-center flex space-x-2"
                             ondragover="event.preventDefault();"
                             ondrop="window.GestioneSquadreFormazione.handleDrop(event, 'B')">
                        </div>
                    </div>

                    <button id="btn-save-formation"
                            class="w-full bg-indigo-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-indigo-400 transition duration-150 transform hover:scale-[1.01]">
                        Salva Formazione
                    </button>
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
            document.querySelector('#field-area h4').textContent = `Campo (Titolari) - Modulo: ${newModule}`;
        });

        document.getElementById('btn-save-formation').addEventListener('click', () => this.handleSaveFormation(context));

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
        const { TYPE_ICONS } = window.GestioneSquadreConstants;
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

        const playerType = playerWithForm ? (playerWithForm.type || 'N/A') : 'N/A';
        const typeData = TYPE_ICONS[playerType] || TYPE_ICONS['N/A'];
        const typeIconHtml = playerWithForm ? `<i class="${typeData.icon} ${typeData.color} text-xs ml-1"></i>` : '';

        const internalLabelColor = 'text-gray-600';

        const playerContent = playerWithForm ?
            `<div class="jersey-inner">
                <span class="jersey-name" title="${playerWithForm.name}">${playerWithForm.name}</span>
                <span class="jersey-role ${internalLabelColor}">
                    ${playerRole} ${typeIconHtml}
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

                return `
                    <div ${draggableAttr} data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}"
                         class="player-card p-2 ${injuredClass} rounded-lg shadow transition duration-100 z-10"
                         ${isInjured ? '' : 'ondragstart="window.handleDragStart(event)" ondragend="window.handleDragEnd(event)"'}
                         ${isInjured ? `title="${player.name} e infortunato per ${window.Injuries.getRemainingMatches(player)} partite"` : ''}>
                        ${iconaBadge}${player.name} (${player.role}) (Liv: ${player.level || player.currentLevel || 1})${abilitiesSummary}${injuryBadge}
                        <span class="float-right text-xs font-semibold ${playerWithForm.formModifier > 0 ? 'text-green-400' : (playerWithForm.formModifier < 0 ? 'text-red-400' : 'text-gray-400')}">
                            ${playerWithForm.formModifier > 0 ? '+' : ''}${playerWithForm.formModifier || 0}
                        </span>
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
            if (playerInSlotBeforeDrop) {
                removePlayerFromPosition(playerInSlotBeforeDrop.id, context.currentTeamData);
                displayMessage('formation-message', `${player.name} in panchina. ${playerInSlotBeforeDrop.name} liberato.`, 'info');
            } else if (context.currentTeamData.formation.panchina.length >= 3) {
                return displayMessage('formation-message', 'La panchina e piena (Max 3). Ridisegna per riprovare.', 'error');
            }

            context.currentTeamData.formation.panchina.push(player);
            displayMessage('formation-message', `${player.name} spostato in panchina.`, 'success');

        } else {
            if (playerInSlotBeforeDrop) {
                removePlayerFromPosition(playerInSlotBeforeDrop.id, context.currentTeamData);
                displayMessage('formation-message', `${player.name} ha preso il posto di ${playerInSlotBeforeDrop.name}.`, 'info');
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
        const { TYPE_ICONS } = window.GestioneSquadreConstants;
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
                const typeData = TYPE_ICONS[p.type] || TYPE_ICONS['N/A'];
                const isIcona = p.abilities && p.abilities.includes('Icona');

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
                        <span class="text-gray-400 text-xs flex items-center">
                            <i class="${typeData.icon} ${typeData.color} mr-1"></i>
                            Lv.${p.level || 1}
                        </span>
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
     * Se la forma e negativa, apre il modal di recupero
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

        // Se la forma e negativa, apri il modal di recupero
        if (formModifier < 0) {
            this.openFormRecoveryModal(player, formModifier, teamData);
        }
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

        // Calcola il costo: 10 + (5 * valore_assoluto_della_forma)
        const cost = 10 + (5 * Math.abs(formModifier));

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
        const { doc, updateDoc } = window.firestoreTools;
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
            const currentTeamId = window.InterfacciaCore?.getCurrentTeamId();
            if (currentTeamId) {
                const teamDocRef = doc(db, `artifacts/${window.appId}/public/data/teams`, currentTeamId);
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

            // 6. Chiudi modal dopo un breve delay e re-render
            setTimeout(() => {
                this.closeFormRecoveryModal();
                this.renderFieldSlots(teamData, context);

                // Aggiorna anche la UI del budget se visibile altrove
                if (window.InterfacciaCore?.setCurrentTeamData) {
                    window.InterfacciaCore.setCurrentTeamData(teamData);
                }
            }, 1000);

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

        const { TYPE_ICONS } = window.GestioneSquadreConstants;

        const playersHtml = injuredPlayers.map(p => {
            const remaining = p.injury.remainingMatches;
            const playerLevel = p.level || p.currentLevel || 1;
            const healingCost = 10 * playerLevel; // Formula: Costo = 10 * Livello

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

        // Calcola il costo: 10 * Livello_Giocatore
        const cost = 10 * playerLevel;

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
            const currentTeamId = window.InterfacciaCore?.getCurrentTeamId();
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

            // 5. Chiudi modal dopo un breve delay e re-render
            setTimeout(() => {
                this.closeInstantHealingModal();

                // Re-render del pannello formazione per aggiornare l'infermeria
                if (context.squadraToolsContainer) {
                    this.render(teamData, context);
                }

                // Aggiorna anche la UI del budget se visibile altrove
                if (window.InterfacciaCore?.setCurrentTeamData) {
                    window.InterfacciaCore.setCurrentTeamData(teamData);
                }
            }, 1000);

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
    }
};

console.log("Modulo GestioneSquadre-Formazione caricato.");
