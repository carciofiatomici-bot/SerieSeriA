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
                        ${Object.keys(MODULI).map(mod => `<option value="${mod}" ${teamData.formation.modulo === mod ? 'selected' : ''}>${mod}</option>`).join('')}
                    </select>
                    <p id="module-description" class="text-sm text-gray-400">${MODULI[teamData.formation.modulo].description}</p>

                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2 pt-4">Legenda Tipologie (Type)</h3>
                    <div class="p-3 bg-gray-700 rounded-lg border border-gray-600 shadow-inner">
                         ${legendHtml}
                    </div>

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

        return `
            <div data-role="${role}" id="${slotId}" class="slot-target w-full text-center rounded-lg shadow-inner-dark transition duration-150 cursor-pointer relative
                        ${bgColor} ${textColor}
                        ${playerWithForm ? 'player-card' : 'empty-slot'} z-10 p-1"
                 ondragover="event.preventDefault();"
                 ondrop="window.GestioneSquadreFormazione.handleDrop(event, '${role}')"
                 ${draggableAttr}
                 ondragstart="window.handleDragStart(event)"
                 title="${playerWithForm ? playerName : ''}">
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

                return `
                    <div draggable="true" data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}"
                         class="player-card p-2 bg-gray-600 text-white rounded-lg shadow cursor-grab hover:bg-gray-500 transition duration-100 z-10"
                         ondragstart="window.handleDragStart(event)"
                         ondragend="window.handleDragEnd(event)">
                        ${iconaBadge}${player.name} (${player.role}) (Liv: ${player.level || player.currentLevel || 1})${abilitiesSummary}
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

        } catch (error) {
            console.error("Errore nel salvataggio:", error);
            displayMessage('formation-message', `Errore di salvataggio: ${error.message}`, 'error');
        } finally {
            saveButton.textContent = 'Salva Formazione';
            saveButton.disabled = false;
        }
    }
};

console.log("Modulo GestioneSquadre-Formazione caricato.");
