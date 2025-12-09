//
// ====================================================================
// DRAFT-ADMIN-UI.JS - Rendering Pannello Admin Draft
// ====================================================================
//

window.DraftAdminUI = {

    /**
     * Renderizza il pannello Admin del Draft
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    async render(context) {
        const { draftToolsContainer, draftBackButton, adminContent, db, firestoreTools, paths } = context;
        const { TYPES } = window.DraftConstants;
        const { displayMessage } = window.DraftUtils;

        draftBackButton.textContent = "Torna al Pannello Admin";
        draftBackButton.onclick = () => window.showScreen(adminContent);

        // Inizializzazione per la gestione dello stato Draft
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, window.DraftConstants.CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        const configData = configDoc.exists() ? configDoc.data() : {};
        let draftOpen = configData.isDraftOpen || false;
        const draftTurns = configData.draftTurns || null;
        const isDraftTurnsActive = draftTurns && draftTurns.isActive;

        // Genera HTML per lo stato del draft a turni
        let draftTurnsStatusHtml = '';
        if (isDraftTurnsActive) {
            const currentRound = draftTurns.currentRound;
            const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
            const currentOrder = draftTurns[orderKey] || [];
            const currentTeam = currentOrder.find(t => t.teamId === draftTurns.currentTeamId);
            const remainingTeams = currentOrder.filter(t => !t.hasDrafted).length;

            draftTurnsStatusHtml = `
                <div class="mt-4 p-4 bg-blue-900 border border-blue-500 rounded-lg">
                    <h4 class="text-lg font-bold text-blue-300 mb-2">Draft a Turni ATTIVO</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-400">Round:</span>
                            <span class="text-white font-bold">${currentRound} / ${draftTurns.totalRounds}</span>
                        </div>
                        <div>
                            <span class="text-gray-400">Squadre rimanenti:</span>
                            <span class="text-white font-bold">${remainingTeams}</span>
                        </div>
                        <div class="col-span-2">
                            <span class="text-gray-400">Turno corrente:</span>
                            <span class="text-yellow-400 font-bold">${currentTeam ? currentTeam.teamName : 'N/A'}</span>
                        </div>
                    </div>
                    <div class="mt-3">
                        <p class="text-xs text-gray-400 mb-2">Ordine Round ${currentRound}:</p>
                        <div class="flex flex-wrap gap-1">
                            ${currentOrder.map((t, i) => `
                                <span class="text-xs px-2 py-1 rounded ${t.hasDrafted ? 'bg-gray-600 text-gray-400 line-through' : (t.teamId === draftTurns.currentTeamId ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-700 text-white')}">${i+1}. ${t.teamName}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // Interfaccia Creazione Calciatore con il pulsante Toggle
        draftToolsContainer.innerHTML = `
            <div class="p-6 bg-gray-800 rounded-lg border border-yellow-600 shadow-inner-lg space-y-8">

                <!-- SEZIONE 1: GESTIONE STATO DRAFT -->
                <h3 class="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2">Stato Mercato/Draft</h3>
                <div class="flex items-center justify-between p-4 rounded-lg border ${draftOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span id="draft-status-text" class="font-extrabold text-xl">${draftOpen ? 'DRAFT APERTO' : 'DRAFT CHIUSO'}</span>
                    <button id="btn-toggle-draft"
                            data-is-open="${draftOpen}"
                            class="px-4 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${draftOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                        ${draftOpen ? 'CHIUDI Draft' : 'APRI Draft'}
                    </button>
                </div>

                <!-- SEZIONE DRAFT A TURNI -->
                ${draftOpen ? `
                <div class="p-4 bg-gray-700 rounded-lg border border-yellow-500">
                    <h4 class="text-lg font-bold text-yellow-300 mb-3">Gestione Draft a Turni</h4>
                    ${!isDraftTurnsActive ? `
                    <p class="text-sm text-gray-300 mb-3">Genera la lista del draft per permettere alle squadre di draftare a turno. L'ordine viene calcolato in base alla classifica (o media rosa se non c'e' classifica).</p>
                    <button id="btn-generate-draft-list"
                            class="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-500 transition">
                        Genera Lista Draft
                    </button>
                    ` : `
                    <button id="btn-stop-draft-turns"
                            class="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500 transition">
                        Ferma Draft a Turni
                    </button>
                    `}
                    ${draftTurnsStatusHtml}
                </div>
                ` : ''}

                <p id="draft-toggle-message" class="text-center mt-3 text-red-400"></p>


                <!-- SEZIONE 2: CREAZIONE CALCIATORE -->
                <h3 class="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2 pt-4">Crea Nuovo Calciatore</h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Nome -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-name">Nome</label>
                        <input type="text" id="player-name" placeholder="Es: Barella"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Nazionalità -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-nationality">Nazionalità</label>
                        <select id="player-nationality"
                                class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                            <option value="">Seleziona Nazionalità</option>
                            ${window.DraftConstants.NATIONALITIES.map(n => `<option value="${n.code}">${n.flag} ${n.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Ruolo -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-role">Ruolo</label>
                        <select id="player-role"
                                class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400"
                                onchange="window.DraftAdminUI.updateAbilitiesForRole(this.value)">
                            <option value="">Seleziona Ruolo</option>
                            <option value="P">P (Portiere)</option>
                            <option value="D">D (Difensore)</option>
                            <option value="C">C (Centrocampista)</option>
                            <option value="A">A (Attaccante)</option>
                        </select>
                    </div>

                    <!-- Tipologia (Type) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-type">Tipologia (Type)</label>
                        <select id="player-type"
                                class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                            <option value="">Seleziona Tipo</option>
                            ${TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Età (Range 15-50) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-age">Età (15 - 50)</label>
                        <input type="number" id="player-age" min="15" max="50" placeholder="25"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Liv Minimo (Range 1-20) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-min">Liv Minimo (1 - 20)</label>
                        <input type="number" id="player-level-min" min="1" max="20" placeholder="10"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Liv Massimo (Range 1-20) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-max">Liv Massimo (1 - 20)</label>
                        <input type="number" id="player-level-max" min="1" max="20" placeholder="18"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Costo -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-cost">Costo (Crediti Seri)</label>
                        <input type="number" id="player-cost" min="1" placeholder="50"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>
                </div>

                <!-- Sezione Abilità -->
                <div class="mt-4 p-4 bg-gray-700 rounded-lg border border-purple-500">
                    <h4 class="text-lg font-bold text-purple-400 mb-3">Abilità (Max 3 positive + 2 negative)</h4>
                    <div id="abilities-selection-container">
                        <p class="text-gray-400 text-sm">Seleziona un ruolo per vedere le abilità disponibili</p>
                    </div>
                </div>

                <!-- Pulsanti Azioni -->
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-random-player"
                            class="bg-purple-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150 transform hover:scale-[1.01] mt-4">
                        Crea Giocatore Casuale
                    </button>
                    <button id="btn-create-player"
                            class="bg-green-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-400 transition duration-150 transform hover:scale-[1.01] mt-4">
                        Aggiungi Calciatore al Draft
                    </button>
                </div>

                <p id="player-creation-message" class="text-center mt-3 text-red-400"></p>

                <!-- SEZIONE 3: LISTA CALCIATORI ESISTENTI -->
                <h3 class="text-xl font-bold text-gray-400 border-b border-gray-700 pb-2 mt-8 pt-4">Calciatori Disponibili nel Draft</h3>
                <div id="draft-players-list" class="mt-4 space-y-3">
                     <p class="text-gray-500 text-center">Caricamento in corso...</p>
                </div>

            </div>
        `;

        // Collega gli event listeners
        this.attachEventListeners(context);

        // Carica la lista dei giocatori
        window.DraftAdminPlayers.loadDraftPlayers(context);
    },

    /**
     * Collega gli event listener per il pannello admin
     * @param {Object} context - Contesto con riferimenti
     */
    attachEventListeners(context) {
        document.getElementById('btn-toggle-draft').addEventListener('click', (e) => {
            window.DraftAdminPlayers.handleToggleDraft(e, context);
        });
        document.getElementById('btn-create-player').addEventListener('click', () => {
            window.DraftAdminPlayers.handleCreatePlayer(context);
        });
        document.getElementById('btn-random-player').addEventListener('click', () => {
            window.DraftAdminPlayers.handleRandomPlayer();
        });

        // Event listener per Draft a Turni
        const btnGenerateDraftList = document.getElementById('btn-generate-draft-list');
        if (btnGenerateDraftList) {
            btnGenerateDraftList.addEventListener('click', () => {
                this.handleGenerateDraftList(context);
            });
        }

        const btnStopDraftTurns = document.getElementById('btn-stop-draft-turns');
        if (btnStopDraftTurns) {
            btnStopDraftTurns.addEventListener('click', () => {
                this.handleStopDraftTurns(context);
            });
        }
    },

    /**
     * Gestisce la generazione della lista draft
     * @param {Object} context - Contesto
     */
    async handleGenerateDraftList(context) {
        const { displayMessage } = window.DraftUtils;
        const btn = document.getElementById('btn-generate-draft-list');

        if (!confirm('Vuoi generare la lista del draft? Le squadre potranno draftare a turno.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Generazione in corso...';
        displayMessage('Generazione lista draft in corso...', 'info', 'draft-toggle-message');

        try {
            const result = await window.DraftTurns.startDraftTurns(context);

            if (result.success) {
                displayMessage('Lista draft generata! Il draft a turni e\' iniziato.', 'success', 'draft-toggle-message');
                // Ricarica il pannello per mostrare lo stato aggiornato
                this.render(context);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error("Errore nella generazione lista draft:", error);
            displayMessage(`Errore: ${error.message}`, 'error', 'draft-toggle-message');
            btn.disabled = false;
            btn.textContent = 'Genera Lista Draft';
        }
    },

    /**
     * Gestisce la fermata del draft a turni
     * @param {Object} context - Contesto
     */
    async handleStopDraftTurns(context) {
        const { displayMessage } = window.DraftUtils;
        const btn = document.getElementById('btn-stop-draft-turns');

        if (!confirm('Vuoi fermare il draft a turni? Questa azione interrompera\' il draft in corso.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Fermando...';
        displayMessage('Fermando draft a turni...', 'info', 'draft-toggle-message');

        try {
            const result = await window.DraftTurns.stopDraftTurns(context);

            if (result.success) {
                displayMessage('Draft a turni fermato.', 'success', 'draft-toggle-message');
                // Ricarica il pannello
                this.render(context);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error("Errore nel fermare il draft:", error);
            displayMessage(`Errore: ${error.message}`, 'error', 'draft-toggle-message');
            btn.disabled = false;
            btn.textContent = 'Ferma Draft a Turni';
        }
    },

    /**
     * Aggiorna le abilità disponibili in base al ruolo selezionato
     * @param {string} role - Ruolo selezionato
     */
    updateAbilitiesForRole(role) {
        const container = document.getElementById('abilities-selection-container');
        if (!container) return;

        if (!role) {
            container.innerHTML = '<p class="text-gray-400 text-sm">Seleziona un ruolo per vedere le abilità disponibili</p>';
            return;
        }

        const roleAbilities = window.AdminTeams?.ROLE_ABILITIES_MAP?.[role];
        if (!roleAbilities) {
            container.innerHTML = '<p class="text-red-400 text-sm">Errore: abilità non trovate per questo ruolo</p>';
            return;
        }

        const positiveAbilities = roleAbilities.positive || [];
        const negativeAbilities = roleAbilities.negative || [];

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Abilità Positive -->
                <div>
                    <p class="text-green-400 font-bold mb-2">Positive (Max 3)</p>
                    <div class="space-y-1 max-h-48 overflow-y-auto">
                        ${positiveAbilities.map(ability => {
                            const abilityData = window.AbilitiesEncyclopedia?.getAbility(ability);
                            const icon = abilityData?.icon || '⚡';
                            const rarity = abilityData?.rarity || 'Comune';
                            const rarityColor = rarity === 'Leggendaria' ? 'text-yellow-400' : rarity === 'Epica' ? 'text-purple-400' : rarity === 'Rara' ? 'text-blue-400' : 'text-gray-400';
                            return `
                                <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-600 p-1 rounded">
                                    <input type="checkbox" class="ability-positive-check" value="${ability}" onchange="window.DraftAdminUI.validateAbilitySelection()">
                                    <span>${icon}</span>
                                    <span class="text-white">${ability}</span>
                                    <span class="${rarityColor} text-xs">(${rarity})</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                <!-- Abilità Negative -->
                <div>
                    <p class="text-red-400 font-bold mb-2">Negative (Max 2)</p>
                    <div class="space-y-1 max-h-48 overflow-y-auto">
                        ${negativeAbilities.map(ability => {
                            const abilityData = window.AbilitiesEncyclopedia?.getAbility(ability);
                            const icon = abilityData?.icon || '💀';
                            const rarity = abilityData?.rarity || 'Comune';
                            const rarityColor = rarity === 'Epica' ? 'text-purple-400' : rarity === 'Rara' ? 'text-blue-400' : 'text-gray-400';
                            return `
                                <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-600 p-1 rounded">
                                    <input type="checkbox" class="ability-negative-check" value="${ability}" onchange="window.DraftAdminUI.validateAbilitySelection()">
                                    <span>${icon}</span>
                                    <span class="text-white">${ability}</span>
                                    <span class="${rarityColor} text-xs">(${rarity})</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Valida la selezione delle abilità (max 3 positive, max 2 negative)
     */
    validateAbilitySelection() {
        const positiveChecks = document.querySelectorAll('.ability-positive-check:checked');
        const negativeChecks = document.querySelectorAll('.ability-negative-check:checked');

        // Disabilita le altre positive se già 3 selezionate
        const allPositive = document.querySelectorAll('.ability-positive-check');
        allPositive.forEach(cb => {
            if (!cb.checked) {
                cb.disabled = positiveChecks.length >= 3;
            }
        });

        // Disabilita le altre negative se già 2 selezionate
        const allNegative = document.querySelectorAll('.ability-negative-check');
        allNegative.forEach(cb => {
            if (!cb.checked) {
                cb.disabled = negativeChecks.length >= 2;
            }
        });

        return true;
    },

    /**
     * Ottiene le abilità selezionate
     */
    getSelectedAbilities() {
        const positiveChecks = document.querySelectorAll('.ability-positive-check:checked');
        const negativeChecks = document.querySelectorAll('.ability-negative-check:checked');

        const abilities = [];
        positiveChecks.forEach(cb => abilities.push(cb.value));
        negativeChecks.forEach(cb => abilities.push(cb.value));

        return abilities;
    }
};

console.log("Modulo Draft-Admin-UI caricato.");
