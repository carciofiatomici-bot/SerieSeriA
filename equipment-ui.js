//
// ====================================================================
// EQUIPMENT-UI.JS - UI Equipaggiamento Giocatori (Premium Card Design)
// ====================================================================
//

window.EquipmentUI = {

    // Costanti
    SLOTS: ['cappello', 'maglia', 'guanti', 'parastinchi', 'scarpini'],
    SLOT_ICONS: {
        'cappello': '🧢',
        'maglia': '👕',
        'guanti': '🧤',
        'parastinchi': '🦵',
        'scarpini': '👟'
    },
    SLOT_LABELS: {
        'cappello': 'Cappello',
        'maglia': 'Maglia',
        'guanti': 'Guanti',
        'parastinchi': 'Parastinchi',
        'scarpini': 'Scarpini'
    },
    PHASE_LABELS: {
        'costruzione': 'Costruzione',
        'attacco': 'Attacco',
        'difesa': 'Difesa',
        'portiere': 'Portiere',
        'tiro': 'Tiro',
        'tutte': 'Tutte'
    },
    PHASE_COLORS: {
        'costruzione': { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' },
        'attacco': { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
        'difesa': { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
        'portiere': { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
        'tiro': { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
        'tutte': { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' }
    },

    // Context corrente
    currentContext: null,
    currentPlayerId: null,
    currentPlayerName: null,
    stylesInjected: false,

    /**
     * Inietta stili custom
     */
    injectStyles() {
        if (this.stylesInjected) return;

        const style = document.createElement('style');
        style.id = 'equipment-styles';
        style.textContent = `
            /* Equipment Modal Premium Design */
            #equipment-modal .eq-card {
                background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
                position: relative;
            }
            #equipment-modal .eq-card::before {
                content: '';
                position: absolute;
                inset: -2px;
                background: linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%);
                border-radius: inherit;
                z-index: -1;
                opacity: 0.8;
            }

            /* Slot Card */
            #equipment-modal .slot-card {
                background: rgba(30, 41, 59, 0.6);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255,255,255,0.1);
                transition: all 0.3s ease;
            }
            #equipment-modal .slot-card:hover {
                border-color: rgba(16, 185, 129, 0.5);
            }
            #equipment-modal .slot-card.equipped {
                border-color: rgba(16, 185, 129, 0.6);
                box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
            }

            /* Slot Icon */
            #equipment-modal .slot-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
            }

            /* Item Hover */
            #equipment-modal .item-option {
                transition: all 0.2s ease;
            }
            #equipment-modal .item-option:hover {
                background: rgba(16, 185, 129, 0.15);
                border-color: rgba(16, 185, 129, 0.5);
            }

            /* Animations */
            #equipment-modal .animate-in {
                animation: eqSlideIn 0.3s ease-out forwards;
                opacity: 0;
            }
            @keyframes eqSlideIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            #equipment-modal .stagger-1 { animation-delay: 0.05s; }
            #equipment-modal .stagger-2 { animation-delay: 0.1s; }
            #equipment-modal .stagger-3 { animation-delay: 0.15s; }
            #equipment-modal .stagger-4 { animation-delay: 0.2s; }
            #equipment-modal .stagger-5 { animation-delay: 0.25s; }

            /* Mobile */
            @media (max-width: 640px) {
                #equipment-modal .eq-card {
                    margin: 0;
                    border-radius: 0;
                    max-height: 100vh;
                    height: 100%;
                }
                #equipment-modal .eq-card::before {
                    border-radius: 0;
                }
            }
        `;
        document.head.appendChild(style);
        this.stylesInjected = true;
    },

    /**
     * Mostra il modal di equipaggiamento per un giocatore
     */
    showEquipmentModal(playerId, playerName, context) {
        this.injectStyles();
        this.currentContext = context;
        this.currentPlayerId = playerId;
        this.currentPlayerName = playerName;

        document.getElementById('equipment-modal')?.remove();

        const { currentTeamData } = context;
        const player = currentTeamData?.players?.find(p => p.id === playerId);
        const inventory = currentTeamData?.inventory?.items || [];
        const equipment = player?.equipment || {};

        const modal = document.createElement('div');
        modal.id = 'equipment-modal';
        modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center';

        const equippedCount = this.SLOTS.filter(s => equipment[s]).length;

        modal.innerHTML = `
            <div class="eq-card rounded-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-hidden sm:m-4 flex flex-col">
                <!-- Header -->
                <div class="sticky top-0 z-10 px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-emerald-500/30 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <span class="text-xl">🎒</span>
                        </div>
                        <div>
                            <h2 class="text-lg font-bold text-white">${playerName}</h2>
                            <p class="text-xs text-emerald-400">${equippedCount}/${this.SLOTS.length} slot equipaggiati</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('equipment-modal').remove()"
                            class="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all text-xl font-bold">✕</button>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
                    ${this.SLOTS.map((slot, i) => this.renderSlot(slot, equipment[slot], inventory, i)).join('')}
                </div>

                <!-- Message -->
                <div id="equipment-message" class="hidden px-4 py-3"></div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    /**
     * Renderizza uno slot con design premium
     */
    renderSlot(slot, equippedItem, inventory, index) {
        const availableItems = inventory.filter(item =>
            item.type === slot && (!item.equippedTo || item.equippedTo === this.currentPlayerId)
        );

        const hasEquipped = equippedItem !== null && equippedItem !== undefined;
        const phaseColor = hasEquipped ? (this.PHASE_COLORS[equippedItem.phase] || this.PHASE_COLORS['tutte']) : null;

        return `
            <div class="slot-card ${hasEquipped ? 'equipped' : ''} rounded-xl p-3 animate-in stagger-${index + 1}">
                <div class="flex items-center gap-3 mb-2">
                    <div class="slot-icon">
                        <span>${this.SLOT_ICONS[slot]}</span>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-sm font-bold text-white">${this.SLOT_LABELS[slot]}</h3>
                        ${hasEquipped ? `
                            <p class="text-xs ${phaseColor.text}">${equippedItem.name}</p>
                        ` : `
                            <p class="text-xs text-slate-500">Nessun oggetto</p>
                        `}
                    </div>
                    ${hasEquipped ? `
                        <button onclick="window.EquipmentUI.unequipItem('${slot}')"
                                class="px-2 py-1 text-xs font-medium rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition">
                            Rimuovi
                        </button>
                    ` : ''}
                </div>

                ${hasEquipped ? `
                    <!-- Equipped Item Card -->
                    <div class="flex items-center gap-3 p-2 rounded-lg ${phaseColor.bg} border ${phaseColor.border}">
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <span class="text-lg font-black ${phaseColor.text}">+${equippedItem.bonus}</span>
                                <span class="text-xs text-slate-400">in ${this.PHASE_LABELS[equippedItem.phase]}</span>
                            </div>
                        </div>
                        <div class="w-8 h-8 rounded-lg ${phaseColor.bg} flex items-center justify-center">
                            <span class="text-sm">${this.getPhaseIcon(equippedItem.phase)}</span>
                        </div>
                    </div>
                ` : `
                    <!-- Available Items -->
                    ${availableItems.length > 0 ? `
                        <div class="space-y-1.5 mt-2">
                            ${availableItems.map(item => {
                                const itemColor = this.PHASE_COLORS[item.phase] || this.PHASE_COLORS['tutte'];
                                return `
                                    <div class="item-option flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                                        <div class="flex items-center gap-2">
                                            <span class="text-sm">${this.getPhaseIcon(item.phase)}</span>
                                            <div>
                                                <p class="text-sm text-white font-medium">${item.name}</p>
                                                <p class="text-xs ${itemColor.text}">+${item.bonus} ${this.PHASE_LABELS[item.phase]}</p>
                                            </div>
                                        </div>
                                        <button onclick="window.EquipmentUI.equipItem('${slot}', '${item.id}')"
                                                class="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition">
                                            Equipa
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-3 text-slate-500 text-xs">
                            Nessun ${this.SLOT_LABELS[slot].toLowerCase()} in inventario
                        </div>
                    `}
                `}
            </div>
        `;
    },

    /**
     * Ottieni icona per fase
     */
    getPhaseIcon(phase) {
        const icons = {
            'costruzione': '🔨',
            'attacco': '⚔️',
            'difesa': '🛡️',
            'portiere': '🧤',
            'tiro': '🎯',
            'tutte': '✨'
        };
        return icons[phase] || '✨';
    },

    /**
     * Equipaggia un oggetto
     */
    async equipItem(slot, itemId) {
        if (!this.currentContext || !this.currentPlayerId) return;

        const { db, firestoreTools, currentTeamId, TEAMS_COLLECTION_PATH, loadTeamDataFromFirestore } = this.currentContext;
        const messageEl = document.getElementById('equipment-message');

        try {
            const { doc, getDoc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) throw new Error('Squadra non trovata');

            const teamData = teamDoc.data();
            const players = teamData.players || [];
            const inventory = teamData.inventory || { items: [] };

            const itemIndex = inventory.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) throw new Error('Oggetto non trovato');

            const item = inventory.items[itemIndex];

            if (item.equippedTo && item.equippedTo !== this.currentPlayerId) {
                const oldPlayerIndex = players.findIndex(p => p.id === item.equippedTo);
                if (oldPlayerIndex !== -1 && players[oldPlayerIndex].equipment) {
                    players[oldPlayerIndex].equipment[slot] = null;
                }
            }

            const playerIndex = players.findIndex(p => p.id === this.currentPlayerId);
            if (playerIndex === -1) throw new Error('Giocatore non trovato');

            const currentEquipment = players[playerIndex].equipment || {};
            if (currentEquipment[slot]) {
                const oldItemId = currentEquipment[slot].id;
                const oldItemIndex = inventory.items.findIndex(i => i.id === oldItemId);
                if (oldItemIndex !== -1) {
                    inventory.items[oldItemIndex].equippedTo = null;
                }
            }

            players[playerIndex].equipment = {
                ...currentEquipment,
                [slot]: {
                    id: item.id,
                    name: item.name,
                    bonus: item.bonus,
                    phase: item.phase,
                    applyTo: item.applyTo
                }
            };

            inventory.items[itemIndex].equippedTo = this.currentPlayerId;

            await updateDoc(teamDocRef, {
                players: players,
                inventory: inventory
            });

            if (messageEl) {
                messageEl.className = 'px-4 py-3 bg-emerald-500/20 border-t border-emerald-500/30 text-emerald-400 text-sm text-center';
                messageEl.innerHTML = `<span class="font-medium">✓ ${item.name} equipaggiato!</span>`;
                messageEl.classList.remove('hidden');
                setTimeout(() => messageEl.classList.add('hidden'), 2000);
            }

            const mode = localStorage.getItem('fanta_squadra_mode') || 'rosa';
            await loadTeamDataFromFirestore(currentTeamId, mode);
            this.refreshModal();
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

        } catch (error) {
            console.error('[EquipmentUI] Errore:', error);
            if (messageEl) {
                messageEl.className = 'px-4 py-3 bg-red-500/20 border-t border-red-500/30 text-red-400 text-sm text-center';
                messageEl.innerHTML = `<span class="font-medium">✕ ${error.message}</span>`;
                messageEl.classList.remove('hidden');
            }
        }
    },

    /**
     * Rimuove un oggetto equipaggiato
     */
    async unequipItem(slot) {
        if (!this.currentContext || !this.currentPlayerId) return;

        const { db, firestoreTools, currentTeamId, TEAMS_COLLECTION_PATH, loadTeamDataFromFirestore } = this.currentContext;
        const messageEl = document.getElementById('equipment-message');

        try {
            const { doc, getDoc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) throw new Error('Squadra non trovata');

            const teamData = teamDoc.data();
            const players = teamData.players || [];
            const inventory = teamData.inventory || { items: [] };

            const playerIndex = players.findIndex(p => p.id === this.currentPlayerId);
            if (playerIndex === -1) throw new Error('Giocatore non trovato');

            const currentEquipment = players[playerIndex].equipment || {};
            const equippedItem = currentEquipment[slot];

            if (!equippedItem) throw new Error('Slot vuoto');

            players[playerIndex].equipment = {
                ...currentEquipment,
                [slot]: null
            };

            const itemIndex = inventory.items.findIndex(i => i.id === equippedItem.id);
            if (itemIndex !== -1) {
                inventory.items[itemIndex].equippedTo = null;
            }

            await updateDoc(teamDocRef, {
                players: players,
                inventory: inventory
            });

            if (messageEl) {
                messageEl.className = 'px-4 py-3 bg-slate-500/20 border-t border-slate-500/30 text-slate-400 text-sm text-center';
                messageEl.innerHTML = `<span class="font-medium">✓ ${equippedItem.name} rimosso</span>`;
                messageEl.classList.remove('hidden');
                setTimeout(() => messageEl.classList.add('hidden'), 2000);
            }

            const mode = localStorage.getItem('fanta_squadra_mode') || 'rosa';
            await loadTeamDataFromFirestore(currentTeamId, mode);
            this.refreshModal();
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

        } catch (error) {
            console.error('[EquipmentUI] Errore:', error);
            if (messageEl) {
                messageEl.className = 'px-4 py-3 bg-red-500/20 border-t border-red-500/30 text-red-400 text-sm text-center';
                messageEl.innerHTML = `<span class="font-medium">✕ ${error.message}</span>`;
                messageEl.classList.remove('hidden');
            }
        }
    },

    /**
     * Aggiorna il modal
     */
    refreshModal() {
        if (!this.currentContext || !this.currentPlayerId) return;

        const { currentTeamData } = this.currentContext;
        const player = currentTeamData?.players?.find(p => p.id === this.currentPlayerId);
        const inventory = currentTeamData?.inventory?.items || [];
        const equipment = player?.equipment || {};

        const modal = document.getElementById('equipment-modal');
        if (!modal) return;

        const content = modal.querySelector('.overflow-y-auto.overscroll-contain');
        if (content) {
            content.innerHTML = this.SLOTS.map((slot, i) => this.renderSlot(slot, equipment[slot], inventory, i)).join('');
        }

        // Update header count
        const equippedCount = this.SLOTS.filter(s => equipment[s]).length;
        const countEl = modal.querySelector('.text-emerald-400');
        if (countEl) {
            countEl.textContent = `${equippedCount}/${this.SLOTS.length} slot equipaggiati`;
        }
    }
};

console.log("Modulo EquipmentUI caricato (Premium Card Design).");
