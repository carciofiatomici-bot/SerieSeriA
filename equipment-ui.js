//
// ====================================================================
// EQUIPMENT-UI.JS - UI Equipaggiamento Giocatori
// ====================================================================
//
// Gestisce il modal per equipaggiare/rimuovere oggetti dai giocatori
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

    // Context corrente
    currentContext: null,
    currentPlayerId: null,
    currentPlayerName: null,

    /**
     * Mostra il modal di equipaggiamento per un giocatore
     */
    showEquipmentModal(playerId, playerName, context) {
        this.currentContext = context;
        this.currentPlayerId = playerId;
        this.currentPlayerName = playerName;

        // Rimuovi modal esistente
        document.getElementById('equipment-modal')?.remove();

        const { currentTeamData } = context;
        const player = currentTeamData?.players?.find(p => p.id === playerId);
        const inventory = currentTeamData?.inventory?.items || [];
        const equipment = player?.equipment || {};

        const modal = document.createElement('div');
        modal.id = 'equipment-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-emerald-500 shadow-2xl">
                <!-- Header -->
                <div class="bg-gradient-to-r from-emerald-700 to-teal-600 p-4 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <span>🎒</span> Equipaggiamento di ${playerName}
                    </h2>
                    <button onclick="document.getElementById('equipment-modal').remove()"
                            class="text-white hover:text-red-300 text-2xl font-bold">&times;</button>
                </div>

                <!-- Content -->
                <div class="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                    <!-- Slots -->
                    <div class="space-y-4">
                        ${this.SLOTS.map(slot => this.renderSlot(slot, equipment[slot], inventory)).join('')}
                    </div>

                    <!-- Messaggio -->
                    <div id="equipment-message" class="mt-4 hidden"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Click fuori per chiudere
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    /**
     * Renderizza uno slot
     */
    renderSlot(slot, equippedItem, inventory) {
        // Filtra oggetti disponibili per questo slot (non equipaggiati ad altri)
        const availableItems = inventory.filter(item =>
            item.type === slot && (!item.equippedTo || item.equippedTo === this.currentPlayerId)
        );

        const hasEquipped = equippedItem !== null && equippedItem !== undefined;

        return `
            <div class="p-4 bg-gray-800 rounded-lg border ${hasEquipped ? 'border-emerald-500' : 'border-gray-600'}">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <span class="text-2xl">${this.SLOT_ICONS[slot]}</span>
                        ${this.SLOT_LABELS[slot]}
                    </h3>
                    ${hasEquipped ? `
                        <button onclick="window.EquipmentUI.unequipItem('${slot}')"
                                class="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded transition">
                            Rimuovi
                        </button>
                    ` : ''}
                </div>

                ${hasEquipped ? `
                    <!-- Oggetto Equipaggiato -->
                    <div class="bg-emerald-900/30 border border-emerald-500 rounded-lg p-3">
                        <p class="text-white font-semibold">${equippedItem.name}</p>
                        <p class="text-xs text-emerald-300">+${equippedItem.bonus} in ${this.PHASE_LABELS[equippedItem.phase]}</p>
                    </div>
                ` : `
                    <!-- Selezione Oggetto -->
                    ${availableItems.length > 0 ? `
                        <div class="space-y-2">
                            ${availableItems.map(item => `
                                <div class="flex justify-between items-center p-2 bg-gray-700 rounded border border-gray-600 hover:border-emerald-500 transition">
                                    <div>
                                        <p class="text-white text-sm">${item.name}</p>
                                        <p class="text-xs text-gray-400">+${item.bonus} in ${this.PHASE_LABELS[item.phase]}</p>
                                    </div>
                                    <button onclick="window.EquipmentUI.equipItem('${slot}', '${item.id}')"
                                            class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded transition">
                                        Equipaggia
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-gray-500 text-sm text-center py-2">
                            Nessun ${this.SLOT_LABELS[slot].toLowerCase()} disponibile nell'inventario
                        </p>
                    `}
                `}
            </div>
        `;
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

            // Trova l'oggetto nell'inventario
            const itemIndex = inventory.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) throw new Error('Oggetto non trovato nell\'inventario');

            const item = inventory.items[itemIndex];

            // Se era equipaggiato ad un altro giocatore, rimuovilo
            if (item.equippedTo && item.equippedTo !== this.currentPlayerId) {
                const oldPlayerIndex = players.findIndex(p => p.id === item.equippedTo);
                if (oldPlayerIndex !== -1 && players[oldPlayerIndex].equipment) {
                    players[oldPlayerIndex].equipment[slot] = null;
                }
            }

            // Trova il giocatore e aggiorna il suo equipment
            const playerIndex = players.findIndex(p => p.id === this.currentPlayerId);
            if (playerIndex === -1) throw new Error('Giocatore non trovato');

            // Se lo slot era già occupato, libera l'oggetto precedente
            const currentEquipment = players[playerIndex].equipment || {};
            if (currentEquipment[slot]) {
                const oldItemId = currentEquipment[slot].id;
                const oldItemIndex = inventory.items.findIndex(i => i.id === oldItemId);
                if (oldItemIndex !== -1) {
                    inventory.items[oldItemIndex].equippedTo = null;
                }
            }

            // Aggiorna equipaggiamento giocatore
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

            // Aggiorna inventario
            inventory.items[itemIndex].equippedTo = this.currentPlayerId;

            // Salva
            await updateDoc(teamDocRef, {
                players: players,
                inventory: inventory
            });

            // Mostra successo
            if (messageEl) {
                messageEl.className = 'mt-4 bg-green-900 border border-green-500 text-green-200 p-3 rounded-lg';
                messageEl.textContent = `${item.name} equipaggiato con successo!`;
                messageEl.classList.remove('hidden');
            }

            // Ricarica dati e aggiorna modal
            await loadTeamDataFromFirestore();
            this.refreshModal();

            // Aggiorna dashboard
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

        } catch (error) {
            console.error('[EquipmentUI] Errore equipaggiamento:', error);
            if (messageEl) {
                messageEl.className = 'mt-4 bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg';
                messageEl.textContent = `Errore: ${error.message}`;
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

            // Trova il giocatore
            const playerIndex = players.findIndex(p => p.id === this.currentPlayerId);
            if (playerIndex === -1) throw new Error('Giocatore non trovato');

            const currentEquipment = players[playerIndex].equipment || {};
            const equippedItem = currentEquipment[slot];

            if (!equippedItem) throw new Error('Nessun oggetto equipaggiato in questo slot');

            // Rimuovi da equipment
            players[playerIndex].equipment = {
                ...currentEquipment,
                [slot]: null
            };

            // Aggiorna inventario
            const itemIndex = inventory.items.findIndex(i => i.id === equippedItem.id);
            if (itemIndex !== -1) {
                inventory.items[itemIndex].equippedTo = null;
            }

            // Salva
            await updateDoc(teamDocRef, {
                players: players,
                inventory: inventory
            });

            // Mostra successo
            if (messageEl) {
                messageEl.className = 'mt-4 bg-green-900 border border-green-500 text-green-200 p-3 rounded-lg';
                messageEl.textContent = `${equippedItem.name} rimosso!`;
                messageEl.classList.remove('hidden');
            }

            // Ricarica dati e aggiorna modal
            await loadTeamDataFromFirestore();
            this.refreshModal();

            // Aggiorna dashboard
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

        } catch (error) {
            console.error('[EquipmentUI] Errore rimozione:', error);
            if (messageEl) {
                messageEl.className = 'mt-4 bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg';
                messageEl.textContent = `Errore: ${error.message}`;
                messageEl.classList.remove('hidden');
            }
        }
    },

    /**
     * Aggiorna il modal con i dati aggiornati
     */
    refreshModal() {
        if (!this.currentContext || !this.currentPlayerId) return;

        const { currentTeamData } = this.currentContext;
        const player = currentTeamData?.players?.find(p => p.id === this.currentPlayerId);
        const inventory = currentTeamData?.inventory?.items || [];
        const equipment = player?.equipment || {};

        const modal = document.getElementById('equipment-modal');
        if (!modal) return;

        // Aggiorna solo il contenuto degli slot
        const content = modal.querySelector('.space-y-4');
        if (content) {
            content.innerHTML = this.SLOTS.map(slot => this.renderSlot(slot, equipment[slot], inventory)).join('');
        }
    }
};

console.log("Modulo EquipmentUI caricato.");
