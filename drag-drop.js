//
// ====================================================================
// DRAG-DROP.JS - Sistema Drag & Drop Migliorato
// ====================================================================
//
// Gestisce:
// - Formazione con drag visuale
// - Riordino rosa
// - Touch-friendly per mobile
//

window.DragDropManager = {
    // Stato
    isDragging: false,
    draggedElement: null,
    draggedData: null,
    ghostElement: null,
    touchStartPos: null,
    longPressTimer: null,

    // Configurazione
    config: {
        longPressDuration: 500, // ms per attivare drag su mobile
        ghostOpacity: 0.8,
        dropZoneHighlight: 'ring-4 ring-green-500 ring-opacity-50',
        invalidDropHighlight: 'ring-4 ring-red-500 ring-opacity-50'
    },

    /**
     * Inizializza il sistema
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('dragDrop')) {
            console.log("Drag & Drop disabilitato");
            return;
        }

        this.setupGlobalListeners();
        console.log("Drag & Drop Manager inizializzato");
    },

    /**
     * Setup listeners globali
     */
    setupGlobalListeners() {
        // Listener per cambio feature flag
        document.addEventListener('featureFlagChanged', (e) => {
            if (e.detail?.flagId === 'dragDrop') {
                if (e.detail.enabled) {
                    this.init();
                }
            }
        });

        // Previeni comportamenti default durante drag
        document.addEventListener('dragover', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        });
    },

    // ========================================
    // FORMAZIONE DRAG & DROP
    // ========================================

    /**
     * Inizializza drag & drop per la formazione
     * @param {HTMLElement} container - Container della formazione
     * @param {Object} options - Opzioni configurazione
     */
    initFormationDrag(container, options = {}) {
        if (!container) return;

        const {
            onFormationChange = () => {},
            titolari = [],
            panchina = [],
            formation = '1-3-3-1'
        } = options;

        this.formationContainer = container;
        this.onFormationChange = onFormationChange;

        // Crea UI formazione
        this.renderFormationUI(container, titolari, panchina, formation);
    },

    /**
     * Renderizza UI formazione con drag & drop
     */
    renderFormationUI(container, titolari, panchina, formation) {
        container.innerHTML = `
            <div class="formation-drag-container">
                <!-- Campo -->
                <div class="relative bg-gradient-to-b from-green-700 to-green-800 rounded-xl p-4 mb-4 min-h-[300px]" id="formation-field">
                    <div class="absolute inset-0 opacity-20">
                        <div class="absolute top-1/2 left-0 right-0 h-0.5 bg-white"></div>
                        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white rounded-full"></div>
                    </div>

                    <!-- Zone di drop per ruoli -->
                    <div class="grid grid-cols-4 gap-2 relative z-10 h-full min-h-[280px]">
                        <!-- Portiere -->
                        <div class="flex flex-col items-center justify-center">
                            <div class="drop-zone role-zone" data-role="P" data-max="1">
                                <p class="text-xs text-white/60 mb-2">PORTIERE</p>
                                <div class="formation-slots" id="slot-P"></div>
                            </div>
                        </div>

                        <!-- Difensori -->
                        <div class="flex flex-col items-center justify-center">
                            <div class="drop-zone role-zone" data-role="D" data-max="4">
                                <p class="text-xs text-white/60 mb-2">DIFESA</p>
                                <div class="formation-slots" id="slot-D"></div>
                            </div>
                        </div>

                        <!-- Centrocampisti -->
                        <div class="flex flex-col items-center justify-center">
                            <div class="drop-zone role-zone" data-role="C" data-max="4">
                                <p class="text-xs text-white/60 mb-2">CENTROCAMPO</p>
                                <div class="formation-slots" id="slot-C"></div>
                            </div>
                        </div>

                        <!-- Attaccanti -->
                        <div class="flex flex-col items-center justify-center">
                            <div class="drop-zone role-zone" data-role="A" data-max="4">
                                <p class="text-xs text-white/60 mb-2">ATTACCO</p>
                                <div class="formation-slots" id="slot-A"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Panchina -->
                <div class="bg-gray-700 rounded-xl p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-white font-semibold flex items-center gap-2">
                            <span>🪑</span> Panchina
                        </h4>
                        <span class="text-xs text-gray-400" id="bench-count">0 giocatori</span>
                    </div>
                    <div class="drop-zone bench-zone min-h-[80px] bg-gray-800 rounded-lg p-2" id="bench-zone">
                        <div class="flex flex-wrap gap-2" id="bench-players"></div>
                    </div>
                </div>
            </div>

            <style>
                .drop-zone {
                    min-height: 60px;
                    border: 2px dashed transparent;
                    border-radius: 8px;
                    padding: 8px;
                    transition: all 0.2s ease;
                }
                .drop-zone.drag-over {
                    border-color: #22c55e;
                    background: rgba(34, 197, 94, 0.1);
                }
                .drop-zone.invalid-drop {
                    border-color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }
                .player-card-draggable {
                    cursor: grab;
                    user-select: none;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .player-card-draggable:active {
                    cursor: grabbing;
                }
                .player-card-draggable.dragging {
                    opacity: 0.5;
                    transform: scale(0.95);
                }
                .player-card-draggable:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                .formation-slots {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    align-items: center;
                }
                .ghost-element {
                    position: fixed;
                    pointer-events: none;
                    z-index: 9999;
                    opacity: 0.9;
                    transform: rotate(3deg) scale(1.05);
                }
            </style>
        `;

        // Popola slot con titolari
        titolari.forEach(player => {
            const slot = document.getElementById(`slot-${player.role}`);
            if (slot) {
                slot.appendChild(this.createPlayerCard(player, true));
            }
        });

        // Popola panchina
        const benchContainer = document.getElementById('bench-players');
        panchina.forEach(player => {
            benchContainer.appendChild(this.createPlayerCard(player, false));
        });

        this.updateBenchCount();

        // Setup drag & drop
        this.setupFormationDragListeners();
    },

    /**
     * Crea card giocatore trascinabile
     */
    createPlayerCard(player, isStarter) {
        const card = document.createElement('div');
        card.className = `
            player-card-draggable
            bg-gray-800 border-2 border-gray-600 rounded-lg p-2
            flex items-center gap-2 min-w-[120px]
            ${isStarter ? 'border-green-500' : ''}
        `.replace(/\s+/g, ' ').trim();

        card.draggable = true;
        card.dataset.playerId = player.id;
        card.dataset.playerRole = player.role;
        card.dataset.playerName = player.name;
        card.dataset.isStarter = isStarter;

        const roleColors = {
            'P': 'bg-yellow-500',
            'D': 'bg-blue-500',
            'C': 'bg-green-500',
            'A': 'bg-red-500'
        };

        card.innerHTML = `
            <div class="drag-handle text-gray-500 cursor-grab">⋮⋮</div>
            <span class="w-6 h-6 ${roleColors[player.role] || 'bg-gray-500'} rounded text-white text-xs font-bold flex items-center justify-center">
                ${player.role}
            </span>
            <span class="text-white text-sm font-medium truncate flex-1">${player.name}</span>
            <span class="text-xs text-gray-400">Lv.${player.level || 1}</span>
        `;

        return card;
    },

    /**
     * Setup listeners per drag & drop formazione
     */
    setupFormationDragListeners() {
        const container = this.formationContainer;
        if (!container) return;

        // Drag start
        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('player-card-draggable')) {
                this.handleDragStart(e);
            }
        });

        // Drag end
        container.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });

        // Drop zones
        container.querySelectorAll('.drop-zone').forEach(zone => {
            zone.addEventListener('dragover', (e) => this.handleDragOver(e, zone));
            zone.addEventListener('dragleave', (e) => this.handleDragLeave(e, zone));
            zone.addEventListener('drop', (e) => this.handleDrop(e, zone));
        });

        // Touch support
        this.setupTouchListeners(container);
    },

    /**
     * Handle drag start
     */
    handleDragStart(e) {
        this.isDragging = true;
        this.draggedElement = e.target;
        this.draggedData = {
            playerId: e.target.dataset.playerId,
            playerRole: e.target.dataset.playerRole,
            playerName: e.target.dataset.playerName,
            isStarter: e.target.dataset.isStarter === 'true'
        };

        e.target.classList.add('dragging');

        // Set drag image
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedData));

        // Vibrazione su mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    },

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        this.isDragging = false;
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        this.draggedElement = null;
        this.draggedData = null;

        // Rimuovi highlight da tutte le zone
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over', 'invalid-drop');
        });
    },

    /**
     * Handle drag over
     */
    handleDragOver(e, zone) {
        e.preventDefault();

        if (!this.draggedData) return;

        const targetRole = zone.dataset.role;
        const playerRole = this.draggedData.playerRole;

        // Verifica se il drop e' valido
        const isValidDrop = this.isValidDrop(zone, playerRole);

        zone.classList.remove('drag-over', 'invalid-drop');
        zone.classList.add(isValidDrop ? 'drag-over' : 'invalid-drop');

        e.dataTransfer.dropEffect = isValidDrop ? 'move' : 'none';
    },

    /**
     * Handle drag leave
     */
    handleDragLeave(e, zone) {
        zone.classList.remove('drag-over', 'invalid-drop');
    },

    /**
     * Handle drop
     */
    handleDrop(e, zone) {
        e.preventDefault();

        zone.classList.remove('drag-over', 'invalid-drop');

        if (!this.draggedData || !this.draggedElement) {
            return;
        }

        const targetRole = zone.dataset.role;
        const playerRole = this.draggedData.playerRole;

        // Verifica validita'
        if (!this.isValidDrop(zone, playerRole)) {
            if (window.Toast) {
                window.Toast.error(`${this.draggedData.playerName} non puo' giocare in questa posizione`);
            }
            return;
        }

        // Salva la posizione originale del giocatore trascinato
        const originalParent = this.draggedElement.parentElement;
        const originalZone = originalParent?.closest('.role-zone, .bench-zone');
        const wasInBench = originalParent?.id === 'bench-players' || originalZone?.classList.contains('bench-zone');
        const wasInField = originalZone?.classList.contains('role-zone');

        // Determina destinazione
        const isBenchZone = zone.classList.contains('bench-zone');
        const isRoleZone = zone.classList.contains('role-zone');

        if (isBenchZone) {
            // Sposta in panchina
            const benchPlayers = document.getElementById('bench-players');

            // SCAMBIO: se stiamo droppando su un giocatore in panchina, scambia
            const dropTarget = e.target?.closest('.player-card-draggable');
            if (dropTarget && dropTarget !== this.draggedElement) {
                // Scambia posizioni
                if (wasInField && originalParent) {
                    // Il giocatore della panchina va nel campo
                    dropTarget.dataset.isStarter = 'true';
                    dropTarget.classList.add('border-green-500');
                    originalParent.appendChild(dropTarget);
                } else if (wasInBench) {
                    // Scambio panchina-panchina: basta scambiare posizioni DOM
                    const dropTargetParent = dropTarget.parentElement;
                    dropTargetParent.insertBefore(this.draggedElement, dropTarget);
                }
            }

            this.draggedElement.dataset.isStarter = 'false';
            this.draggedElement.classList.remove('border-green-500');
            benchPlayers.appendChild(this.draggedElement);

        } else if (isRoleZone) {
            // Sposta nel ruolo
            const slot = zone.querySelector('.formation-slots');
            if (slot) {
                // SCAMBIO: se c'e' gia' un giocatore nello slot, scambia
                const existingPlayer = slot.querySelector('.player-card-draggable');
                if (existingPlayer && existingPlayer !== this.draggedElement) {
                    // Sposta il giocatore esistente nella posizione originale
                    if (wasInBench) {
                        // Il giocatore del campo va in panchina
                        const benchPlayers = document.getElementById('bench-players');
                        existingPlayer.dataset.isStarter = 'false';
                        existingPlayer.classList.remove('border-green-500');
                        benchPlayers.appendChild(existingPlayer);
                    } else if (wasInField && originalParent) {
                        // Scambio campo-campo
                        existingPlayer.dataset.isStarter = 'true';
                        originalParent.appendChild(existingPlayer);
                    } else {
                        // Dalla rosa libera - il giocatore del campo va nella rosa libera
                        const rosaContainer = document.getElementById('full-squad-list') || document.getElementById('bench-players');
                        if (rosaContainer) {
                            existingPlayer.dataset.isStarter = 'false';
                            existingPlayer.classList.remove('border-green-500');
                            rosaContainer.appendChild(existingPlayer);
                        }
                    }
                }

                this.draggedElement.dataset.isStarter = 'true';
                this.draggedElement.classList.add('border-green-500');
                slot.appendChild(this.draggedElement);
            }
        }

        this.updateBenchCount();

        // Notifica cambio formazione
        this.notifyFormationChange();

        // Feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
        }
    },

    /**
     * Verifica se il drop e' valido
     */
    isValidDrop(zone, playerRole) {
        // La panchina accetta tutti
        if (zone.classList.contains('bench-zone')) {
            return true;
        }

        // Verifica ruolo
        const targetRole = zone.dataset.role;
        if (targetRole && targetRole !== playerRole) {
            return false;
        }

        // Verifica max giocatori
        const maxPlayers = parseInt(zone.dataset.max) || 99;
        const currentPlayers = zone.querySelectorAll('.player-card-draggable').length;

        // Se stiamo spostando dalla stessa zona, non contare
        const isSameZone = this.draggedElement?.parentElement?.parentElement === zone;
        if (!isSameZone && currentPlayers >= maxPlayers) {
            return false;
        }

        return true;
    },

    /**
     * Aggiorna conteggio panchina
     */
    updateBenchCount() {
        const benchPlayers = document.getElementById('bench-players');
        const countEl = document.getElementById('bench-count');

        if (benchPlayers && countEl) {
            const count = benchPlayers.querySelectorAll('.player-card-draggable').length;
            countEl.textContent = `${count} giocator${count === 1 ? 'e' : 'i'}`;
        }
    },

    /**
     * Notifica cambio formazione
     */
    notifyFormationChange() {
        const titolari = [];
        const panchina = [];

        // Raccogli titolari per ruolo
        ['P', 'D', 'C', 'A'].forEach(role => {
            const slot = document.getElementById(`slot-${role}`);
            if (slot) {
                slot.querySelectorAll('.player-card-draggable').forEach(card => {
                    titolari.push({
                        id: card.dataset.playerId,
                        role: card.dataset.playerRole,
                        name: card.dataset.playerName
                    });
                });
            }
        });

        // Raccogli panchina
        const benchContainer = document.getElementById('bench-players');
        if (benchContainer) {
            benchContainer.querySelectorAll('.player-card-draggable').forEach(card => {
                panchina.push({
                    id: card.dataset.playerId,
                    role: card.dataset.playerRole,
                    name: card.dataset.playerName
                });
            });
        }

        // Callback
        if (this.onFormationChange) {
            this.onFormationChange({ titolari, panchina });
        }

        // Evento globale
        document.dispatchEvent(new CustomEvent('formationChanged', {
            detail: { titolari, panchina }
        }));
    },

    // ========================================
    // RIORDINO ROSA
    // ========================================

    /**
     * Inizializza riordino rosa
     * @param {HTMLElement} listContainer - Container lista giocatori
     * @param {Function} onReorder - Callback quando l'ordine cambia
     */
    initRosterReorder(listContainer, onReorder = () => {}) {
        if (!listContainer) return;

        this.rosterContainer = listContainer;
        this.onRosterReorder = onReorder;

        // Aggiungi classe e handle a ogni item
        listContainer.querySelectorAll('[data-player-id]').forEach(item => {
            this.makeReorderable(item);
        });

        // Setup listeners
        this.setupRosterDragListeners();
    },

    /**
     * Rende un elemento riordinabile
     */
    makeReorderable(element) {
        element.draggable = true;
        element.classList.add('reorderable-item');

        // Aggiungi handle se non esiste
        if (!element.querySelector('.reorder-handle')) {
            const handle = document.createElement('div');
            handle.className = 'reorder-handle cursor-grab text-gray-500 hover:text-gray-300 mr-2';
            handle.innerHTML = '⋮⋮';
            element.insertBefore(handle, element.firstChild);
        }
    },

    /**
     * Setup listeners per riordino
     */
    setupRosterDragListeners() {
        const container = this.rosterContainer;
        if (!container) return;

        let draggedItem = null;
        let placeholder = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('reorderable-item')) {
                draggedItem = e.target;
                draggedItem.classList.add('opacity-50');

                // Crea placeholder
                placeholder = document.createElement('div');
                placeholder.className = 'h-12 bg-green-500/20 border-2 border-dashed border-green-500 rounded-lg my-1';
            }
        });

        container.addEventListener('dragend', (e) => {
            if (draggedItem) {
                draggedItem.classList.remove('opacity-50');
                draggedItem = null;
            }
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
            placeholder = null;
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedItem) return;

            const afterElement = this.getDragAfterElement(container, e.clientY);

            if (afterElement == null) {
                container.appendChild(placeholder);
            } else {
                container.insertBefore(placeholder, afterElement);
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedItem || !placeholder) return;

            placeholder.parentNode.insertBefore(draggedItem, placeholder);

            // Notifica riordino
            this.notifyRosterReorder();
        });
    },

    /**
     * Trova elemento dopo il punto di drop
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.reorderable-item:not(.opacity-50)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * Notifica riordino rosa
     */
    notifyRosterReorder() {
        const container = this.rosterContainer;
        if (!container) return;

        const orderedIds = [];
        container.querySelectorAll('[data-player-id]').forEach(item => {
            orderedIds.push(item.dataset.playerId);
        });

        if (this.onRosterReorder) {
            this.onRosterReorder(orderedIds);
        }

        document.dispatchEvent(new CustomEvent('rosterReordered', {
            detail: { orderedIds }
        }));
    },

    // ========================================
    // TOUCH SUPPORT
    // ========================================

    /**
     * Setup listeners touch per mobile
     */
    setupTouchListeners(container) {
        if (!container) return;

        container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        container.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
    },

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        const target = e.target.closest('.player-card-draggable, .reorderable-item');
        if (!target) return;

        this.touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };

        // Long press per attivare drag
        this.longPressTimer = setTimeout(() => {
            this.startTouchDrag(target, e.touches[0]);
        }, this.config.longPressDuration);
    },

    /**
     * Avvia drag da touch
     */
    startTouchDrag(element, touch) {
        this.isDragging = true;
        this.draggedElement = element;
        this.draggedData = {
            playerId: element.dataset.playerId,
            playerRole: element.dataset.playerRole,
            playerName: element.dataset.playerName,
            isStarter: element.dataset.isStarter === 'true'
        };

        element.classList.add('dragging');

        // Crea ghost element
        this.createGhostElement(element, touch);

        // Vibrazione feedback
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    },

    /**
     * Crea elemento ghost per touch drag
     */
    createGhostElement(element, touch) {
        this.ghostElement = element.cloneNode(true);
        this.ghostElement.classList.add('ghost-element');
        this.ghostElement.style.width = element.offsetWidth + 'px';

        this.updateGhostPosition(touch.clientX, touch.clientY);

        document.body.appendChild(this.ghostElement);
    },

    /**
     * Aggiorna posizione ghost
     */
    updateGhostPosition(x, y) {
        if (!this.ghostElement) return;

        this.ghostElement.style.left = (x - this.ghostElement.offsetWidth / 2) + 'px';
        this.ghostElement.style.top = (y - 20) + 'px';
    },

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        // Cancella long press se si muove troppo
        if (this.longPressTimer && this.touchStartPos) {
            const dx = e.touches[0].clientX - this.touchStartPos.x;
            const dy = e.touches[0].clientY - this.touchStartPos.y;

            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }

        if (!this.isDragging || !this.ghostElement) return;

        e.preventDefault();

        // Aggiorna posizione ghost
        this.updateGhostPosition(e.touches[0].clientX, e.touches[0].clientY);

        // Trova drop zone sotto il tocco
        const elementBelow = document.elementFromPoint(
            e.touches[0].clientX,
            e.touches[0].clientY
        );

        const dropZone = elementBelow?.closest('.drop-zone');

        // Aggiorna highlight
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over', 'invalid-drop');
        });

        if (dropZone && this.draggedData) {
            const isValid = this.isValidDrop(dropZone, this.draggedData.playerRole);
            dropZone.classList.add(isValid ? 'drag-over' : 'invalid-drop');
        }
    },

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        // Cancella long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (!this.isDragging) return;

        // Trova drop zone
        const touch = e.changedTouches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = elementBelow?.closest('.drop-zone');

        if (dropZone) {
            // Simula drop
            this.handleDrop({ preventDefault: () => {} }, dropZone);
        }

        // Cleanup
        this.handleDragEnd(e);

        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }

        this.touchStartPos = null;
    },

    // ========================================
    // UTILITIES
    // ========================================

    /**
     * Distruggi manager
     */
    destroy() {
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedData = null;

        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }

        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
    }
};

// Auto-init quando feature flags sono pronti
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.FeatureFlags?.isEnabled('dragDrop')) {
            window.DragDropManager.init();
        }
    }, 1000);
});

console.log("Modulo DragDropManager caricato.");
