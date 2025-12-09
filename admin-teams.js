//
// ====================================================================
// MODULO ADMIN-TEAMS.JS V2.0 - UI Migliorata per Editing Giocatori
// ====================================================================
//

window.AdminTeams = {
    teamsListContainer: null,
    modalInstance: null,
    currentEditingTeamId: null,
    currentEditingPlayers: [],
    currentEditingTeamData: null,
    reloadCallback: null,

    // MAPPA COMPLETA abilità€ (46 abilità !)
    ROLE_ABILITIES_MAP: {
        'P': {
            positive: ['Pugno di ferro', 'Uscita Kamikaze', 'Teletrasporto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Parata con i piedi', 'Lancio lungo'],
            negative: ['Mani di burro', 'Respinta Timida', 'Fuori dai pali']
        },
        'D': {
            positive: ['Muro', 'Contrasto Durissimo', 'Antifurto', 'Guardia', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Tiro dalla distanza', 'Deviazione'],
            negative: ['Falloso', 'Insicuro', 'Fuori Posizione']
        },
        'C': {
            positive: ['Regista', 'Motore', 'Tocco Di Velluto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Tiro dalla distanza', 'Cross', 'Mago del pallone'],
            negative: ['Impreciso', 'Ingabbiato', 'Fuori Posizione']
        },
        'A': {
            positive: ['Bomber', 'Doppio Scatto', 'Pivot', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Rientro Rapido', 'Tiro Fulmineo'],
            negative: ['Piedi a banana', 'Eccesso di sicurezza', 'Fuori Posizione']
        }
    },

    /**
     * Carica tutte le squadre e le renderizza
     */
    async loadTeams(TEAMS_COLLECTION_PATH) {
        const { collection, getDocs } = window.firestoreTools;
        const db = window.db;
        
        if (!this.teamsListContainer) return;

        this.teamsListContainer.innerHTML = '<p class="text-center text-gray-400">Caricamento squadre...</p>';

        try {
            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const querySnapshot = await getDocs(teamsCollectionRef);

            if (querySnapshot.empty) {
                this.teamsListContainer.innerHTML = '<p class="text-center text-red-400 font-semibold">Nessuna squadra registrata al momento.</p>';
                return;
            }

            let teamsHtml = '';
            querySnapshot.forEach(doc => {
                const teamData = doc.data();
                const teamId = doc.id;
                const isParticipating = teamData.isParticipating || false;
                
                const date = teamData.creationDate ? new Date(teamData.creationDate).toLocaleDateString('it-IT') : 'N/A';
                const checkboxColorClasses = isParticipating ? 'bg-green-500 border-green-500' : 'bg-gray-700 border-gray-500';

                teamsHtml += `
                    <div class="team-item flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg border border-gray-600 hover:border-blue-500 transition duration-150">
                        <div class="flex items-center space-x-4 mb-2 sm:mb-0">
                            <input type="checkbox" id="participating-${teamId}" data-team-id="${teamId}" data-action="toggle-participation"
                                   class="form-checkbox h-5 w-5 rounded transition duration-150 ease-in-out ${checkboxColorClasses}"
                                   ${isParticipating ? 'checked' : ''}>
                            <label for="participating-${teamId}" class="text-gray-300 font-bold">Partecipa al Campionato</label>
                        </div>

                        <div class="w-full sm:w-auto mb-2 sm:mb-0">
                            <p class="text-lg font-bold text-white">${teamData.teamName}</p>
                            <p class="text-xs text-gray-400">ID: ${teamId}</p>
                            <p class="text-sm text-gray-400">Budget: ${teamData.budget} CS | Rosa: ${teamData.players.length} gioc. | Creazione: ${date}</p>
                            <p class="text-sm text-gray-400">Coach: ${teamData.coach?.name || 'N/A'} (Liv: ${teamData.coach?.level || 0})</p>
                        </div>
                        
                        <div class="flex space-x-2 mt-2 sm:mt-0">
                            <button data-team-id="${teamId}" data-action="edit"
                                    class="bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 transform hover:scale-105">
                                Modifica
                            </button>
                            <button data-team-id="${teamId}" data-action="delete"
                                    class="delete-btn bg-red-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-red-700 transition duration-150 transform hover:scale-105">
                                Elimina
                            </button>
                        </div>
                    </div>
                `;
            });
            
            this.teamsListContainer.innerHTML = teamsHtml;

        } catch (error) {
            console.error("Errore nel caricamento delle squadre:", error);
            this.teamsListContainer.innerHTML = `<p class="text-center text-red-500">Errore di caricamento: ${error.message}</p>`;
        }
    },

    /**
     * Gestisce le azioni sui bottoni delle squadre
     */
    async handleTeamAction(event, TEAMS_COLLECTION_PATH, reloadCallback) {
        const target = event.target;
        const teamId = target.dataset.teamId;
        const action = target.dataset.action;

        if (!teamId || !action) return;

        if (action === 'toggle-participation') {
            this.handleToggleParticipation(teamId, target.checked, target, TEAMS_COLLECTION_PATH);
            return;
        }
        
        if (action === 'delete') {
            target.textContent = 'CONFERMA? (Click di nuovo)';
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-delete';
            return;
        }

        if (action === 'confirm-delete') {
            target.textContent = 'Eliminazione...';
            target.disabled = true;

            try {
                const { doc, deleteDoc } = window.firestoreTools;
                const db = window.db;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                await deleteDoc(teamDocRef);

                target.closest('.team-item').remove();
                if (reloadCallback) reloadCallback();

            } catch (error) {
                console.error(`Errore durante l'eliminazione della squadra ${teamId}:`, error);
                target.textContent = 'Elimina';
                target.classList.remove('bg-orange-500');
                target.classList.add('bg-red-600');
                target.disabled = false;
                target.dataset.action = 'delete';
            }
            return;
        }
        
        if (action === 'edit') {
            this.openEditTeamModal(teamId, TEAMS_COLLECTION_PATH, reloadCallback);
        }
    },

    /**
     * Aggiorna lo stato di partecipazione
     */
    async handleToggleParticipation(teamId, isChecked, checkboxElement, TEAMS_COLLECTION_PATH) {
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        const label = checkboxElement.closest('.team-item').querySelector('label');
        
        checkboxElement.disabled = true;
        label.textContent = 'Salvando...';

        try {
            await updateDoc(teamDocRef, {
                isParticipating: isChecked
            });
            
            if (isChecked) {
                checkboxElement.classList.remove('bg-gray-700', 'border-gray-500');
                checkboxElement.classList.add('bg-green-500', 'border-green-500');
            } else {
                checkboxElement.classList.remove('bg-green-500', 'border-green-500');
                checkboxElement.classList.add('bg-gray-700', 'border-gray-500');
            }
            
            label.textContent = 'Partecipa al Campionato';

        } catch (error) {
            console.error(`Errore nell'aggiornamento partecipazione per ${teamId}:`, error);
            checkboxElement.checked = !isChecked;
            label.textContent = 'Errore di salvataggio!';
        } finally {
            checkboxElement.disabled = false;
        }
    },

    /**
     * Apre la modale per modificare la squadra (NUOVA UI!)
     */
    async openEditTeamModal(teamId, TEAMS_COLLECTION_PATH, reloadCallback) {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        try {
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Squadra non trovata.");

            const teamData = teamDoc.data();
            this.currentEditingTeamId = teamId;
            this.currentEditingPlayers = JSON.parse(JSON.stringify(teamData.players)); // Deep copy
            this.currentEditingTeamData = teamData;
            this.reloadCallback = reloadCallback;
            
            this.renderEditTeamModal(teamId, teamData, TEAMS_COLLECTION_PATH, reloadCallback);
            
        } catch (error) {
            console.error("Errore nel caricamento dei dati per la modifica:", error);
        }
    },

    /**
     * Renderizza la modale di modifica con tabs
     */
    renderEditTeamModal(teamId, teamData, TEAMS_COLLECTION_PATH, reloadCallback) {
        if (this.modalInstance) {
            this.modalInstance.remove();
            this.modalInstance = null;
        }

        const mainElement = document.querySelector('main');

        const modalHtml = `
            <div id="edit-team-modal" class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div class="football-box w-full max-w-6xl max-h-[95vh] overflow-y-auto">
                    <h3 class="text-3xl font-bold text-blue-400 mb-4 border-b border-blue-600 pb-2">✏️ Modifica Squadra: ${teamData.teamName}</h3>
                    <p id="edit-message" class="text-center text-sm mb-4"></p>

                    <!-- Tabs -->
                    <div class="flex space-x-2 mb-4 border-b border-gray-700">
                        <button onclick="window.AdminTeams.switchTab('info')" id="tab-info" 
                                class="px-4 py-2 font-bold bg-blue-600 text-white rounded-t transition">
                            📋 Info Squadra
                        </button>
                        <button onclick="window.AdminTeams.switchTab('players')" id="tab-players" 
                                class="px-4 py-2 font-bold bg-gray-700 text-gray-300 rounded-t hover:bg-gray-600 transition">
                            ⚽ Giocatori (${teamData.players.length})
                        </button>
                    </div>

                    <!-- Tab Content: Info Squadra -->
                    <div id="tab-content-info" class="space-y-4">
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1 font-bold" for="edit-team-name">Nome Squadra</label>
                            <input type="text" id="edit-team-name" value="${teamData.teamName}" minlength="3" maxlength="30"
                                class="p-3 rounded-lg bg-gray-700 border border-blue-600 text-white focus:ring-blue-400">
                        </div>

                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1 font-bold" for="edit-budget">Budget (Crediti Seri)</label>
                            <input type="number" id="edit-budget" value="${teamData.budget}" min="0"
                                class="p-3 rounded-lg bg-gray-700 border border-blue-600 text-white focus:ring-blue-400">
                        </div>
                    </div>

                    <!-- Tab Content: Giocatori -->
                    <div id="tab-content-players" class="hidden">
                        <div class="mb-4 p-4 bg-gray-800 rounded-lg border border-green-500">
                            <button onclick="window.AdminTeams.addNewPlayer()" 
                                    class="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
                                ➕ Aggiungi Nuovo Giocatore
                            </button>
                        </div>

                        <div id="players-list-edit" class="space-y-3">
                            ${this.renderPlayersList()}
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4 pt-6 mt-6 border-t border-gray-700">
                        <button type="button" onclick="window.AdminTeams.closeEditTeamModal()"
                                class="bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-400 transition duration-150">
                            Annulla
                        </button>
                        <button type="button" onclick="window.AdminTeams.saveTeamEdit('${teamId}', '${TEAMS_COLLECTION_PATH}')"
                                class="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-150">
                            💾 Salva Modifiche
                        </button>
                    </div>
                </div>
            </div>
        `;

        mainElement.insertAdjacentHTML('beforeend', modalHtml);
        this.modalInstance = document.getElementById('edit-team-modal');
    },

    /**
     * Switch tra tabs
     */
    switchTab(tab) {
        const tabInfo = document.getElementById('tab-info');
        const tabPlayers = document.getElementById('tab-players');
        const contentInfo = document.getElementById('tab-content-info');
        const contentPlayers = document.getElementById('tab-content-players');
        
        if (tab === 'info') {
            tabInfo.className = 'px-4 py-2 font-bold bg-blue-600 text-white rounded-t transition';
            tabPlayers.className = 'px-4 py-2 font-bold bg-gray-700 text-gray-300 rounded-t hover:bg-gray-600 transition';
            contentInfo.classList.remove('hidden');
            contentPlayers.classList.add('hidden');
        } else {
            tabInfo.className = 'px-4 py-2 font-bold bg-gray-700 text-gray-300 rounded-t hover:bg-gray-600 transition';
            tabPlayers.className = 'px-4 py-2 font-bold bg-blue-600 text-white rounded-t transition';
            contentInfo.classList.add('hidden');
            contentPlayers.classList.remove('hidden');
        }
    },

    /**
     * Renderizza la lista dei giocatori
     */
    renderPlayersList() {
        if (!this.currentEditingPlayers || this.currentEditingPlayers.length === 0) {
            return '<p class="text-center text-gray-400 py-8">Nessun giocatore nella rosa. Clicca "Aggiungi Nuovo Giocatore" per iniziare.</p>';
        }

        return this.currentEditingPlayers.map((player, index) => {
            const abilitiesDisplay = player.abilities && player.abilities.length > 0 
                ? `<p class="text-xs text-purple-400 mt-1">🌟 abilità : ${player.abilities.join(', ')}</p>` 
                : '';
            
            return `
                <div class="p-4 bg-gray-800 rounded-lg border border-gray-600 hover:border-blue-500 transition" data-player-index="${index}">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="text-lg font-bold text-white">${player.name}</p>
                            <p class="text-sm text-gray-400">
                                Ruolo: <span class="text-yellow-400">${player.role}</span> | 
                                Tipo: <span class="text-cyan-400">${player.type}</span> | 
                                EtÃ : <span class="text-gray-300">${player.age}</span> |
                                Livello: <span class="text-green-400">${player.levelMin}-${player.levelMax}</span>
                            </p>
                            ${abilitiesDisplay}
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="window.AdminTeams.editPlayer(${index})" 
                                    class="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition text-sm">
                                ✏️
                            </button>
                            <button onclick="window.AdminTeams.deletePlayer(${index})" 
                                    class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Aggiungi nuovo giocatore
     */
    addNewPlayer() {
        this.openPlayerEditModal(-1); // -1 = nuovo
    },

    /**
     * Modifica giocatore esistente
     */
    editPlayer(index) {
        this.openPlayerEditModal(index);
    },

    /**
     * Elimina giocatore
     */
    deletePlayer(index) {
        if (!confirm(`Eliminare "${this.currentEditingPlayers[index].name}" dalla rosa?`)) return;
        
        this.currentEditingPlayers.splice(index, 1);
        document.getElementById('players-list-edit').innerHTML = this.renderPlayersList();
        
        // Aggiorna contatore nel tab
        document.getElementById('tab-players').innerHTML = `⚽ Giocatori (${this.currentEditingPlayers.length})`;
    },

    /**
     * Apre modal per editare/creare singolo giocatore
     */
    openPlayerEditModal(index) {
        const isNew = index === -1;
        const player = isNew ? {
            name: '',
            role: 'A',
            type: 'Potenza',
            age: 25,
            levelMin: 1,
            levelMax: 10,
            abilities: []
        } : (function() {
            const p = JSON.parse(JSON.stringify(this.currentEditingPlayers[index]));
            if (p.level !== undefined) {
                p.singleLevel = p.level;
            }
            return p;
        }.bind(this))();

        const hasFixedLevel = !isNew && (this.currentEditingPlayers[index].level !== undefined);
        const levelValue = hasFixedLevel ? player.level : (player.levelMin || 1);

        const modalHtml = `
            <div id="player-edit-modal" class="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-[60]">
                <div class="bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 border-2 border-blue-500">
                    <h4 class="text-2xl font-bold text-yellow-400 mb-4">${isNew ? '➕ Nuovo Giocatore' : '✏️ Modifica Giocatore'}</h4>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Nome *</label>
                                <input type="text" id="player-name-input" value="${player.name}" placeholder="Es: Marco Rossi"
                                       class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            </div>
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Età</label>
                                <input type="number" id="player-age-input" value="${player.age}" min="18" max="40"
                                       class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Ruolo *</label>
                                <select id="player-role-input" class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500"
                                        onchange="window.AdminTeams.updateAbilitiesForRole()">
                                    <option value="P" ${player.role === 'P' ? 'selected' : ''}>🧤 Portiere</option>
                                    <option value="D" ${player.role === 'D' ? 'selected' : ''}>🛡️ Difensore</option>
                                    <option value="C" ${player.role === 'C' ? 'selected' : ''}>⚙️ Centrocampista</option>
                                    <option value="A" ${player.role === 'A' ? 'selected' : ''}>⚡ Attaccante</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Tipo</label>
                                <select id="player-type-input" class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                                    <option value="Potenza" ${player.type === 'Potenza' ? 'selected' : ''}>💪 Potenza</option>
                                    <option value="Tecnica" ${player.type === 'Tecnica' ? 'selected' : ''}>🎯 Tecnica</option>
                                    <option value="Velocita" ${player.type === 'Velocita' ? 'selected' : ''}>⚡ Velocità</option>
                                </select>
                            </div>
                        </div>

                        ${hasFixedLevel ? `
                        <div>
                            <label class="text-gray-300 block mb-1 font-bold">Livello *</label>
                            <input type="number" id="player-level-single" value="${levelValue}" min="1" max="30"
                                   class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            <p class="text-xs text-green-400 mt-1">✓ Livello fisso del giocatore in squadra</p>
                        </div>
                        ` : `
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Livello Min *</label>
                                <input type="number" id="player-levelmin-input" value="${player.levelMin || 1}" min="1" max="30"
                                       class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            </div>
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Livello Max *</label>
                                <input type="number" id="player-levelmax-input" value="${player.levelMax || 10}" min="1" max="30"
                                       class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            </div>
                        </div>
                        <p class="text-xs text-yellow-400 -mt-2">⚠ Range per giocatori da assegnare</p>
                        `}

                        <div>
                            <label class="text-gray-300 block mb-2 font-bold">Abilità</label>
                            <p class="text-xs text-yellow-300 mb-2">Max 3 positive + 1 negativa</p>
                            <div id="abilities-selection" class="space-y-3">
                                ${this.renderAbilitiesSelection(player.role, player.abilities || [])}
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
                        <button onclick="window.AdminTeams.closePlayerEditModal()" 
                                class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition font-bold">
                            Annulla
                        </button>
                        <button onclick="window.AdminTeams.savePlayerEdit(${index})" 
                                class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-bold">
                            💾 Salva Giocatore
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * Renderizza selezione abilità 
     */
    renderAbilitiesSelection(role, currentAbilities) {
        const roleAbilities = this.ROLE_ABILITIES_MAP[role];
        if (!roleAbilities) return '<p class="text-gray-400">Nessuna abilità  disponibile</p>';

        let html = '<div class="bg-gray-900 p-3 rounded border border-green-500"><h5 class="text-green-400 font-bold mb-2">✅ abilità  Positive (Max 3)</h5><div class="grid grid-cols-2 gap-2">';
        
        roleAbilities.positive.forEach(ability => {
            const checked = currentAbilities.includes(ability) ? 'checked' : '';
            html += `
                <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800 p-1 rounded">
                    <input type="checkbox" value="${ability}" ${checked} class="ability-positive-check form-checkbox h-4 w-4 text-green-500" 
                           onchange="window.AdminTeams.validateAbilitySelection()">
                    <span class="text-gray-300">${ability}</span>
                </label>
            `;
        });
        
        html += '</div></div>';
        
        html += '<div class="bg-gray-900 p-3 rounded border border-red-500 mt-3"><h5 class="text-red-400 font-bold mb-2">âŒ abilità  Negative (Max 1)</h5>';
        html += '<p class="text-xs text-yellow-300 mb-2">âš ï¸ Attenzione: effetti dannosi!</p><div class="grid grid-cols-2 gap-2">';
        
        roleAbilities.negative.forEach(ability => {
            const checked = currentAbilities.includes(ability) ? 'checked' : '';
            html += `
                <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800 p-1 rounded">
                    <input type="checkbox" value="${ability}" ${checked} class="ability-negative-check form-checkbox h-4 w-4 text-red-500" 
                           onchange="window.AdminTeams.validateAbilitySelection()">
                    <span class="text-gray-300">${ability}</span>
                </label>
            `;
        });
        
        html += '</div></div>';
        
        return html;
    },

    /**
     * Aggiorna abilità  quando cambia ruolo
     */
    updateAbilitiesForRole() {
        const role = document.getElementById('player-role-input').value;
        document.getElementById('abilities-selection').innerHTML = this.renderAbilitiesSelection(role, []);
    },

    /**
     * Valida selezione abilità  (max 3 positive, max 1 negativa)
     */
    validateAbilitySelection() {
        const positiveChecks = document.querySelectorAll('.ability-positive-check:checked');
        const negativeChecks = document.querySelectorAll('.ability-negative-check:checked');
        
        // Limita positive a 3
        if (positiveChecks.length > 3) {
            event.target.checked = false;
            alert('âŒ Massimo 3 abilità  positive!');
            return false;
        }
        
        // Limita negative a 1
        if (negativeChecks.length > 1) {
            event.target.checked = false;
            alert('âŒ Massimo 1 abilità  negativa!');
            return false;
        }
        
        return true;
    },

    /**
     * Salva modifica giocatore
     */
    savePlayerEdit(index) {
        const name = document.getElementById('player-name-input').value.trim();
        const age = parseInt(document.getElementById('player-age-input').value);
        const role = document.getElementById('player-role-input').value;
        const type = document.getElementById('player-type-input').value;
        
        const levelSingleInput = document.getElementById('player-level-single');
        const hasFixedLevel = levelSingleInput !== null;
        
        let level, levelMin, levelMax;
        
        if (hasFixedLevel) {
            level = parseInt(levelSingleInput.value);
            levelMin = level;
            levelMax = level;
        } else {
            levelMin = parseInt(document.getElementById('player-levelmin-input').value);
            levelMax = parseInt(document.getElementById('player-levelmax-input').value);
            level = null;
        }
        
        const positiveAbilities = Array.from(document.querySelectorAll('.ability-positive-check:checked')).map(el => el.value);
        const negativeAbilities = Array.from(document.querySelectorAll('.ability-negative-check:checked')).map(el => el.value);
        const abilities = [...positiveAbilities, ...negativeAbilities];
        
        if (!name) {
            alert('❌ Inserisci un nome!');
            return;
        }
        
        if (!hasFixedLevel && levelMin > levelMax) {
            alert('❌ Livello Min non può essere maggiore di Livello Max!');
            return;
        }
        
        if (hasFixedLevel) {
            if (level < 1 || level > 30) {
                alert('❌ Il livello deve essere tra 1 e 30!');
                return;
            }
        } else {
            if (levelMin < 1 || levelMax > 30) {
                alert('❌ I livelli devono essere tra 1 e 30!');
                return;
            }
        }
        
        const playerData = {
            name,
            age,
            role,
            type,
            abilities,
            id: index === -1 ? `player_${Date.now()}` : (this.currentEditingPlayers[index].id || `player_${Date.now()}`)
        };
        
        if (hasFixedLevel) {
            playerData.level = level;
        } else {
            playerData.levelMin = levelMin;
            playerData.levelMax = levelMax;
        }
        
        if (index === -1) {
            this.currentEditingPlayers.push(playerData);
        } else {
            const originalPlayer = this.currentEditingPlayers[index];
            if (originalPlayer.level !== undefined) {
                playerData.level = level;
                delete playerData.levelMin;
                delete playerData.levelMax;
            }
            this.currentEditingPlayers[index] = playerData;
        }
        
        this.closePlayerEditModal();
        document.getElementById('players-list-edit').innerHTML = this.renderPlayersList();
        document.getElementById('tab-players').innerHTML = `⚽ Giocatori (${this.currentEditingPlayers.length})`;
    },

    /**
     * Chiude modal giocatore
     */
    closePlayerEditModal() {
        const modal = document.getElementById('player-edit-modal');
        if (modal) modal.remove();
    },

    /**
     * Salva modifiche squadra
     */
    async saveTeamEdit(teamId, TEAMS_COLLECTION_PATH) {
        const teamName = document.getElementById('edit-team-name').value.trim();
        const budget = parseInt(document.getElementById('edit-budget').value);
        
        if (!teamName || teamName.length < 3) {
            alert('âŒ Il nome squadra deve avere almeno 3 caratteri!');
            return;
        }
        
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        const msgElement = document.getElementById('edit-message');
        msgElement.textContent = 'â³ Salvataggio in corso...';
        msgElement.className = 'text-center text-sm mb-4 text-yellow-400';
        
        try {
            await updateDoc(teamDocRef, {
                teamName,
                budget,
                players: this.currentEditingPlayers
            });
            
            msgElement.textContent = '✅ Modifiche salvate con successo!';
            msgElement.className = 'text-center text-sm mb-4 text-green-400';
            
            setTimeout(() => {
                this.closeEditTeamModal();
                if (this.reloadCallback) this.reloadCallback();
            }, 1000);
            
        } catch (error) {
            console.error('Errore salvataggio:', error);
            msgElement.textContent = `âŒ Errore: ${error.message}`;
            msgElement.className = 'text-center text-sm mb-4 text-red-400';
        }
    },

    /**
     * Chiude la modale
     */
    closeEditTeamModal() {
        if (this.modalInstance) {
            this.modalInstance.remove();
            this.modalInstance = null;
        }
        this.currentEditingTeamId = null;
        this.currentEditingPlayers = [];
        this.currentEditingTeamData = null;
        this.reloadCallback = null;
    }
};

console.log('✅ AdminTeams V2.0 caricato - UI migliorata con form per giocatori!');
