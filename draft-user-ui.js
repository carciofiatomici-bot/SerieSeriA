//
// ====================================================================
// DRAFT-USER-UI.JS - Rendering Pannello Utente Draft
// ====================================================================
//

window.DraftUserUI = {

    // Timer per aggiornare il countdown
    turnTimerInterval: null,

    // Timer per risincronizzare con il server
    serverSyncInterval: null,

    // turnStartTime dal server per calcolo countdown
    serverTurnStartTime: null,

    // Listener real-time per lo stato del Draft
    configUnsubscribe: null,

    // Contesto salvato per il re-render
    savedContext: null,

    // Stato filtri
    filters: {
        role: 'all',
        type: 'all',
        minCost: null,
        maxCost: null,
        sortBy: 'cost_asc'
    },

    // Giocatori disponibili (cache per filtri)
    availablePlayersCache: [],

    /**
     * Resetta i filtri ai valori di default
     */
    resetFilters() {
        this.filters = {
            role: 'all',
            type: 'all',
            minCost: null,
            maxCost: null,
            sortBy: 'cost_asc'
        };
    },

    /**
     * Filtra e ordina i giocatori
     */
    filterAndSortPlayers(players) {
        return players
            .filter(p => {
                // Filtro ruolo
                if (this.filters.role !== 'all' && p.role !== this.filters.role) return false;

                // Filtro tipo
                if (this.filters.type !== 'all' && p.type !== this.filters.type) return false;

                // Filtro costo minimo
                const cost = p.cost || 0;
                if (this.filters.minCost !== null && cost < this.filters.minCost) return false;

                // Filtro costo massimo
                if (this.filters.maxCost !== null && cost > this.filters.maxCost) return false;

                return true;
            })
            .sort((a, b) => {
                switch(this.filters.sortBy) {
                    case 'cost_asc': return (a.cost || 0) - (b.cost || 0);
                    case 'cost_desc': return (b.cost || 0) - (a.cost || 0);
                    case 'level_desc': return (b.levelRange?.[1] || 0) - (a.levelRange?.[1] || 0);
                    case 'name': return (a.name || '').localeCompare(b.name || '');
                    default: return 0;
                }
            });
    },

    /**
     * Genera l'HTML della barra filtri
     */
    renderFiltersBar() {
        return `
            <div class="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-sm font-bold text-cyan-400 flex items-center gap-2">
                        <span>🔍</span> Filtri
                    </h4>
                    <button id="btn-reset-filters" class="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition">
                        Resetta
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- Filtro Ruolo -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Ruolo</label>
                        <div class="flex gap-1 flex-wrap">
                            <button class="filter-role-btn px-2 py-1 text-xs rounded ${this.filters.role === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="all">Tutti</button>
                            <button class="filter-role-btn px-2 py-1 text-xs rounded ${this.filters.role === 'P' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="P">P</button>
                            <button class="filter-role-btn px-2 py-1 text-xs rounded ${this.filters.role === 'D' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="D">D</button>
                            <button class="filter-role-btn px-2 py-1 text-xs rounded ${this.filters.role === 'C' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="C">C</button>
                            <button class="filter-role-btn px-2 py-1 text-xs rounded ${this.filters.role === 'A' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="A">A</button>
                        </div>
                    </div>

                    <!-- Filtro Tipo -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Tipo</label>
                        <div class="flex gap-1 flex-wrap">
                            <button class="filter-type-btn px-2 py-1 text-xs rounded ${this.filters.type === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-type="all">Tutti</button>
                            <button class="filter-type-btn px-2 py-1 text-xs rounded ${this.filters.type === 'Potenza' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-type="Potenza">Potenza</button>
                            <button class="filter-type-btn px-2 py-1 text-xs rounded ${this.filters.type === 'Tecnica' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-type="Tecnica">Tecnica</button>
                            <button class="filter-type-btn px-2 py-1 text-xs rounded ${this.filters.type === 'Velocita' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-type="Velocita">Velocita</button>
                        </div>
                    </div>

                    <!-- Filtro Costo -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Costo (CS)</label>
                        <div class="flex gap-2 items-center">
                            <input type="number" id="filter-min-cost" placeholder="Min" value="${this.filters.minCost || ''}"
                                   class="w-20 px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:outline-none">
                            <span class="text-gray-500">-</span>
                            <input type="number" id="filter-max-cost" placeholder="Max" value="${this.filters.maxCost || ''}"
                                   class="w-20 px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:outline-none">
                        </div>
                    </div>

                    <!-- Ordinamento -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Ordina per</label>
                        <select id="filter-sort" class="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:outline-none">
                            <option value="cost_asc" ${this.filters.sortBy === 'cost_asc' ? 'selected' : ''}>Costo (crescente)</option>
                            <option value="cost_desc" ${this.filters.sortBy === 'cost_desc' ? 'selected' : ''}>Costo (decrescente)</option>
                            <option value="level_desc" ${this.filters.sortBy === 'level_desc' ? 'selected' : ''}>Livello (decrescente)</option>
                            <option value="name" ${this.filters.sortBy === 'name' ? 'selected' : ''}>Nome (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Setup event listeners per i filtri
     */
    setupFilterListeners(context, budgetRimanente) {
        // Filtro ruolo
        document.querySelectorAll('.filter-role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filters.role = e.target.dataset.role;
                this.renderPlayersList(context, budgetRimanente);
            });
        });

        // Filtro tipo
        document.querySelectorAll('.filter-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filters.type = e.target.dataset.type;
                this.renderPlayersList(context, budgetRimanente);
            });
        });

        // Filtro costo min
        const minCostInput = document.getElementById('filter-min-cost');
        if (minCostInput) {
            minCostInput.addEventListener('change', (e) => {
                this.filters.minCost = e.target.value ? parseInt(e.target.value) : null;
                this.renderPlayersList(context, budgetRimanente);
            });
        }

        // Filtro costo max
        const maxCostInput = document.getElementById('filter-max-cost');
        if (maxCostInput) {
            maxCostInput.addEventListener('change', (e) => {
                this.filters.maxCost = e.target.value ? parseInt(e.target.value) : null;
                this.renderPlayersList(context, budgetRimanente);
            });
        }

        // Ordinamento
        const sortSelect = document.getElementById('filter-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sortBy = e.target.value;
                this.renderPlayersList(context, budgetRimanente);
            });
        }

        // Reset filtri
        const resetBtn = document.getElementById('btn-reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
                this.renderPlayersList(context, budgetRimanente);
            });
        }
    },

    /**
     * Renderizza solo la lista giocatori (per aggiornamenti filtri)
     */
    renderPlayersList(context, budgetRimanente) {
        const listContainer = document.getElementById('available-players-list');
        const filtersContainer = document.getElementById('draft-filters-container');
        if (!listContainer) return;

        // Aggiorna UI filtri
        if (filtersContainer) {
            filtersContainer.innerHTML = this.renderFiltersBar();
            this.setupFilterListeners(context, budgetRimanente);
        }

        const filteredPlayers = this.filterAndSortPlayers(this.availablePlayersCache);

        listContainer.innerHTML = filteredPlayers.length > 0
            ? filteredPlayers.map(player => {
                // Calcola il range di costo basato sui livelli min/max
                const calculatePlayerCost = window.calculatePlayerCost;
                const costMin = calculatePlayerCost ? calculatePlayerCost(player.levelRange[0], player.abilities || []) : player.cost;
                const costMax = calculatePlayerCost ? calculatePlayerCost(player.levelRange[1], player.abilities || []) : player.cost;
                const costDisplay = costMin === costMax ? `${costMin}` : `${costMin}-${costMax}`;

                const isAffordable = budgetRimanente >= costMin;
                const canBuy = isAffordable;

                const buttonClass = canBuy ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' : 'bg-gray-500 text-gray-300 cursor-not-allowed';
                const buttonText = isAffordable ? `Drafta (${costDisplay} CS)` : `Costo ${costDisplay} CS (No Budget)`;

                // Mostra abilita se presenti
                const abilitiesText = player.abilities && player.abilities.length > 0
                    ? `<span class="text-purple-300 text-xs ml-2">[${player.abilities.join(', ')}]</span>`
                    : '';

                // Colore tipo
                const typeColor = player.type === 'Potenza' ? 'text-red-400' :
                                  player.type === 'Tecnica' ? 'text-blue-400' :
                                  player.type === 'Velocita' ? 'text-green-400' : 'text-gray-400';

                return `
                    <div class="flex justify-between items-center p-3 bg-gray-600 rounded-lg border border-yellow-500">
                        <div>
                            <p class="text-white font-semibold">${player.name} (${player.role}, ${player.age} anni) <span class="${typeColor}">(${player.type || 'N/A'})</span>${abilitiesText}</p>
                            <p class="text-sm text-yellow-300">Livello: ${player.levelRange[0]}-${player.levelRange[1]} | Costo: ${costDisplay} CS</p>
                        </div>
                        <button data-player-id="${player.id}"
                                data-player-cost="${costMin}"
                                data-player-level-min="${player.levelRange[0]}"
                                data-player-level-max="${player.levelRange[1]}"
                                data-player-name="${player.name}"
                                data-player-role="${player.role}"
                                data-player-age="${player.age}"
                                data-player-type="${player.type}"
                                data-action="buy"
                                ${canBuy ? '' : 'disabled'}
                                class="text-sm px-4 py-2 rounded-lg font-bold transition duration-150 ${buttonClass}">
                            ${buttonText}
                        </button>
                    </div>
                `;
            }).join('')
            : '<p class="text-center text-gray-400 font-semibold">Nessun calciatore trovato con i filtri selezionati.</p>';

        // Mostra conteggio risultati
        const countEl = document.getElementById('filtered-count');
        if (countEl) {
            countEl.textContent = `${filteredPlayers.length} giocatori trovati`;
        }

        // Re-attach event listener per l'acquisto (necessario dopo innerHTML)
        // Usiamo event delegation sul container, quindi il listener originale dovrebbe funzionare
        // Ma per sicurezza, aggiungiamo un listener diretto se non c'e' gia'
        if (!listContainer._hasClickListener) {
            listContainer.addEventListener('click', (e) => {
                window.DraftUserActions.handleUserDraftAction(e, context);
            });
            listContainer._hasClickListener = true;
        }
    },

    /**
     * Ferma il listener real-time
     */
    stopConfigListener() {
        if (this.configUnsubscribe) {
            this.configUnsubscribe();
            this.configUnsubscribe = null;
            console.log("Draft: listener config fermato");
        }
    },

    /**
     * Avvia il listener real-time per lo stato del Draft
     */
    startConfigListener(context) {
        const { db, firestoreTools, paths } = context;
        const { CONFIG_DOC_ID } = window.DraftConstants;
        const { doc, onSnapshot } = firestoreTools;

        // Ferma listener precedente
        this.stopConfigListener();

        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        this.configUnsubscribe = onSnapshot(configDocRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const configData = snapshot.data();
            const isDraftOpen = configData.isDraftOpen || false;

            console.log("Draft real-time update - isDraftOpen:", isDraftOpen);

            // Se siamo ancora nella pagina Draft, aggiorna l'UI
            const draftContent = document.getElementById('draft-content');
            if (draftContent && !draftContent.classList.contains('hidden')) {
                // Re-renderizza il pannello
                this.render(this.savedContext || context);
            }
        }, (error) => {
            console.error("Errore listener config Draft:", error);
        });
    },

    /**
     * Renderizza il pannello utente del Draft
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    async render(context) {
        console.log("DraftUserUI.render() chiamato con context:", context);

        // Salva il contesto per il re-render
        this.savedContext = context;

        const { draftToolsContainer, draftBackButton, appContent, db, firestoreTools, paths, currentTeamId } = context;
        const { MAX_ROSA_PLAYERS, CONFIG_DOC_ID, DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants;
        const { displayMessage } = window.DraftUtils;

        console.log("DraftUserUI - currentTeamId:", currentTeamId, "paths:", paths);

        // Pulisce il timer precedente
        this.clearTurnTimer();

        draftBackButton.textContent = "Torna alla Dashboard";
        draftBackButton.onclick = () => {
            this.clearTurnTimer();
            this.stopConfigListener();
            window.showScreen(appContent);
        };

        draftToolsContainer.innerHTML = `<p class="text-center text-gray-400">Verifica stato mercato...</p>`;

        // Verifica che currentTeamId sia valido
        if (!currentTeamId) {
            draftToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: ID squadra non trovato. Riprova ad accedere dalla dashboard.</p>`;
            console.error("currentTeamId non definito nel contesto Draft utente");
            return;
        }

        // Avvia il listener real-time (solo se non gia' attivo)
        if (!this.configUnsubscribe) {
            this.startConfigListener(context);
        }

        const { doc, getDoc, collection, getDocs, query, where } = firestoreTools;
        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);

        try {
            const configDoc = await getDoc(configDocRef);
            const configData = configDoc.exists() ? configDoc.data() : {};
            const isDraftOpen = configData.isDraftOpen || false;
            const draftTurns = configData.draftTurns || null;
            const isDraftTurnsActive = draftTurns && draftTurns.isActive;

            // Carica i dati della squadra
            const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, currentTeamId);
            const teamDoc = await getDoc(teamDocRef);
            const teamData = teamDoc.exists() ? teamDoc.data() : {};
            const budgetRimanente = teamData.budget || 0;
            const currentPlayers = teamData.players || [];

            // Controllo limite rosa
            const getPlayerCountExcludingIcona = window.getPlayerCountExcludingIcona;
            const currentRosaCount = getPlayerCountExcludingIcona(currentPlayers);
            const isRosaFull = currentRosaCount >= MAX_ROSA_PLAYERS;

            // Se il draft a turni e' attivo, controlla se e' il turno dell'utente
            let turnInfo = null;
            if (isDraftTurnsActive && window.DraftTurns && window.DraftTurns.checkTeamTurn) {
                try {
                    turnInfo = await window.DraftTurns.checkTeamTurn(context, currentTeamId);
                } catch (turnError) {
                    console.error("Errore nel controllo turno:", turnError);
                    turnInfo = null;
                }
            }

            // Determina lo stato da mostrare
            if (!isDraftOpen) {
                // DRAFT CHIUSO
                draftToolsContainer.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 shadow-xl space-y-4">
                        <p class="text-center text-2xl font-extrabold text-red-400">DRAFT CHIUSO</p>
                        <p class="text-center text-lg font-bold text-gray-300">
                             Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                        </p>
                        <p class="text-center text-lg text-gray-300 mt-2">Non e' possibile acquistare giocatori al momento. Attendi che l'Admin apra il Draft.</p>
                    </div>
                `;

            } else if (isDraftTurnsActive) {
                // DRAFT A TURNI ATTIVO
                await this.renderDraftTurnsUI(context, turnInfo, budgetRimanente, currentRosaCount, isRosaFull);

            } else {
                // DRAFT APERTO MA SENZA TURNI (fallback - non dovrebbe succedere con la nuova logica)
                draftToolsContainer.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-yellow-500 shadow-xl space-y-4">
                        <p class="text-center text-2xl font-extrabold text-yellow-400">DRAFT APERTO</p>
                        <p class="text-center text-lg font-bold text-gray-300">
                             Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                        </p>
                        <p class="text-center text-lg text-gray-300 mt-2">In attesa che l'Admin generi la lista del draft...</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error("Errore nel caricamento Draft Utente:", error);
            draftToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore nel caricamento del Draft. Riprova piu' tardi.</p>`;
        }
    },

    /**
     * Renderizza l'UI per il draft a turni
     */
    async renderDraftTurnsUI(context, turnInfo, budgetRimanente, currentRosaCount, isRosaFull) {
        const { draftToolsContainer, db, firestoreTools, paths } = context;
        const { MAX_ROSA_PLAYERS, DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants;
        const { collection, getDocs, query, where } = firestoreTools;

        // Se il draft e' in pausa, mostra UI di pausa
        if (turnInfo.isPaused) {
            draftToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-orange-500 shadow-xl space-y-4">
                    <p class="text-center text-3xl font-extrabold text-orange-400 animate-pulse">⏸️ DRAFT IN PAUSA</p>
                    <p class="text-center text-lg text-gray-300">
                        Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                    </p>
                    <p class="text-center text-lg font-bold text-gray-300">
                         Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                    </p>
                    <div class="mt-4 p-4 bg-orange-900 rounded-lg border border-orange-600">
                        <p class="text-center text-orange-200">
                            Il draft e' stato temporaneamente sospeso dall'admin.
                        </p>
                        <p class="text-center text-orange-300 text-sm mt-2">
                            Attendi la ripresa per continuare a draftare.
                        </p>
                    </div>
                    <button id="btn-refresh-draft" class="w-full mt-4 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500 transition">
                        Aggiorna Stato
                    </button>
                </div>
            `;

            // Ferma eventuali timer
            this.clearTurnTimer();

            // Event listener per il refresh
            document.getElementById('btn-refresh-draft').addEventListener('click', () => {
                this.render(context);
            });

            return;
        }

        if (turnInfo.hasDraftedThisRound) {
            // L'utente ha gia' draftato in questo round
            draftToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-green-500 shadow-xl space-y-4">
                    <p class="text-center text-2xl font-extrabold text-green-400">HAI GIA' DRAFTATO!</p>
                    <p class="text-center text-lg text-gray-300">
                        Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                    </p>
                    <p class="text-center text-lg font-bold text-gray-300">
                         Rosa attuale: <span class="text-green-400">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                    </p>
                    <p class="text-center text-gray-400 mt-2">Attendi il prossimo round o la fine del draft.</p>
                    <div class="mt-4 p-3 bg-gray-800 rounded-lg">
                        <p class="text-sm text-gray-400">Turno corrente: <span class="text-yellow-400 font-bold">${turnInfo.currentTeamName}</span></p>
                    </div>
                </div>
            `;
            return;
        }

        if (!turnInfo.isMyTurn) {
            // Non e' il turno dell'utente
            const timeRemaining = turnInfo.timeRemaining;
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);

            draftToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-yellow-500 shadow-xl space-y-4">
                    <p class="text-center text-2xl font-extrabold text-yellow-400">IN ATTESA DEL TUO TURNO</p>
                    <p class="text-center text-lg text-gray-300">
                        Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                    </p>
                    <p class="text-center text-lg font-bold text-gray-300">
                         Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                    </p>

                    <div class="mt-4 p-4 bg-gray-800 rounded-lg border border-yellow-600">
                        <p class="text-center text-gray-300">Turno corrente:</p>
                        <p class="text-center text-2xl font-bold text-yellow-400">${turnInfo.currentTeamName}</p>
                        <p class="text-center text-sm text-gray-400 mt-2">
                            Tempo rimanente: <span id="draft-turn-countdown" class="text-white font-bold">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>
                        </p>
                    </div>

                    <div class="mt-4 p-3 bg-gray-800 rounded-lg">
                        <p class="text-sm text-gray-400">La tua posizione in coda: <span class="text-cyan-400 font-bold">${turnInfo.position + 1}</span> su ${turnInfo.totalTeams} squadre rimanenti</p>
                    </div>

                    <button id="btn-refresh-draft" class="w-full mt-4 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500 transition">
                        Aggiorna Stato
                    </button>
                </div>
            `;

            // Avvia il countdown con turnStartTime dal server
            this.startTurnCountdown(context, turnInfo.turnStartTime);

            // Event listener per il refresh
            document.getElementById('btn-refresh-draft').addEventListener('click', () => {
                this.render(context);
            });

            return;
        }

        // E' IL TURNO DELL'UTENTE!
        if (isRosaFull) {
            // Rosa piena
            draftToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 shadow-xl space-y-4">
                    <p class="text-center text-2xl font-extrabold text-green-400">E' IL TUO TURNO!</p>
                    <p class="text-center text-xl font-extrabold text-red-400">MA LA ROSA E' PIENA</p>
                    <p class="text-center text-lg text-gray-300">
                        Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                    </p>
                    <p class="text-center text-lg font-bold text-gray-300">
                         Rosa attuale: <span class="text-red-400">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                    </p>
                    <p class="text-center text-gray-300 mt-2">Licenzia un giocatore dalla tua rosa per poter draftare.</p>
                    <div class="mt-4 p-3 bg-red-900 rounded-lg">
                        <p class="text-center text-sm text-red-300">
                            Tempo rimanente: <span id="draft-turn-countdown" class="text-white font-bold">--:--</span>
                        </p>
                    </div>
                </div>
            `;
            this.startTurnCountdown(context, turnInfo.turnStartTime);
            return;
        }

        // Carica i giocatori disponibili
        const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);
        const q = query(playersCollectionRef, where('isDrafted', '==', false));
        const playersSnapshot = await getDocs(q);

        const availablePlayers = playersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(player => !player.isDrafted);

        // Salva nella cache per i filtri
        this.availablePlayersCache = availablePlayers;

        const timeRemaining = turnInfo.timeRemaining;
        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);

        // Conta giocatori filtrati inizialmente
        const filteredPlayers = this.filterAndSortPlayers(availablePlayers);

        draftToolsContainer.innerHTML = `
            <div class="p-6 bg-gray-700 rounded-lg border-2 border-green-500 shadow-xl space-y-4">
                <p class="text-center text-3xl font-extrabold text-green-400 animate-pulse">E' IL TUO TURNO!</p>
                <p class="text-center text-lg text-gray-300">
                    Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                </p>
                <p class="text-center text-2xl font-extrabold text-white">
                    Budget: <span class="text-yellow-400">${budgetRimanente} CS</span>
                </p>
                <p class="text-center text-lg font-bold text-gray-300">
                     Rosa attuale: <span class="text-green-400">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                </p>

                <div class="p-3 bg-yellow-900 rounded-lg border border-yellow-500">
                    <p class="text-center text-sm text-yellow-300">
                        Tempo rimanente: <span id="draft-turn-countdown" class="text-2xl text-white font-bold">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>
                    </p>
                </div>
            </div>

            <!-- Container Filtri -->
            <div id="draft-filters-container" class="mt-4">
                ${this.renderFiltersBar()}
            </div>

            <!-- Conteggio risultati -->
            <div class="flex justify-between items-center mt-2 px-2">
                <p id="filtered-count" class="text-sm text-gray-400">${filteredPlayers.length} giocatori trovati</p>
            </div>

            <!-- Lista giocatori -->
            <div id="available-players-list" class="mt-2 space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-800 rounded-lg">
                ${filteredPlayers.length > 0
                    ? filteredPlayers.map(player => {
                        // Calcola il range di costo basato sui livelli min/max
                        const calculatePlayerCost = window.calculatePlayerCost;
                        const costMin = calculatePlayerCost ? calculatePlayerCost(player.levelRange[0], player.abilities || []) : player.cost;
                        const costMax = calculatePlayerCost ? calculatePlayerCost(player.levelRange[1], player.abilities || []) : player.cost;
                        const costDisplay = costMin === costMax ? `${costMin}` : `${costMin}-${costMax}`;

                        const isAffordable = budgetRimanente >= costMin;
                        const canBuy = isAffordable;

                        const buttonClass = canBuy ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' : 'bg-gray-500 text-gray-300 cursor-not-allowed';
                        const buttonText = isAffordable ? `Drafta (${costDisplay} CS)` : `Costo ${costDisplay} CS (No Budget)`;

                        // Mostra abilita se presenti
                        const abilitiesText = player.abilities && player.abilities.length > 0
                            ? `<span class="text-purple-300 text-xs ml-2">[${player.abilities.join(', ')}]</span>`
                            : '';

                        // Colore tipo
                        const typeColor = player.type === 'Potenza' ? 'text-red-400' :
                                          player.type === 'Tecnica' ? 'text-blue-400' :
                                          player.type === 'Velocita' ? 'text-green-400' : 'text-gray-400';

                        return `
                            <div class="flex justify-between items-center p-3 bg-gray-600 rounded-lg border border-yellow-500">
                                <div>
                                    <p class="text-white font-semibold">${player.name} (${player.role}, ${player.age} anni) <span class="${typeColor}">(${player.type || 'N/A'})</span>${abilitiesText}</p>
                                    <p class="text-sm text-yellow-300">Livello: ${player.levelRange[0]}-${player.levelRange[1]} | Costo: ${costDisplay} CS</p>
                                </div>
                                <button data-player-id="${player.id}"
                                        data-player-cost="${costMin}"
                                        data-player-level-min="${player.levelRange[0]}"
                                        data-player-level-max="${player.levelRange[1]}"
                                        data-player-name="${player.name}"
                                        data-player-role="${player.role}"
                                        data-player-age="${player.age}"
                                        data-player-type="${player.type}"
                                        data-action="buy"
                                        ${canBuy ? '' : 'disabled'}
                                        class="text-sm px-4 py-2 rounded-lg font-bold transition duration-150 ${buttonClass}">
                                    ${buttonText}
                                </button>
                            </div>
                        `;
                    }).join('')
                    : '<p class="text-center text-gray-400 font-semibold">Nessun calciatore trovato con i filtri selezionati.</p>'
                }
            </div>
            <p id="user-draft-message" class="text-center mt-3 text-red-400"></p>
        `;

        // Avvia il countdown con turnStartTime dal server
        this.startTurnCountdown(context, turnInfo.turnStartTime);

        // Setup listeners per i filtri
        this.setupFilterListeners(context, budgetRimanente);

        // Event listener per l'acquisto
        document.getElementById('available-players-list').addEventListener('click', (e) => {
            window.DraftUserActions.handleUserDraftAction(e, context);
        });
    },

    /**
     * Avvia il countdown del turno con sincronizzazione server
     * @param {Object} context - Contesto
     * @param {number} turnStartTime - Timestamp di inizio turno dal server
     */
    startTurnCountdown(context, turnStartTime) {
        this.clearTurnTimer();

        // Salva il turnStartTime dal server
        this.serverTurnStartTime = turnStartTime;
        const { DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants;
        const countdownElement = document.getElementById('draft-turn-countdown');

        const updateCountdown = () => {
            if (!countdownElement) {
                this.clearTurnTimer();
                return;
            }

            // Calcola tempo rimanente basandosi sul turnStartTime del server
            const elapsed = Date.now() - this.serverTurnStartTime;
            const timeRemaining = Math.max(0, DRAFT_TURN_TIMEOUT_MS - elapsed);

            if (timeRemaining <= 0) {
                countdownElement.textContent = '00:00';
                countdownElement.classList.add('text-red-500');
                this.clearTurnTimer();
                // Ricarica per aggiornare lo stato
                setTimeout(() => this.render(context), 2000);
                return;
            }

            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            countdownElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Cambia colore quando mancano meno di 5 minuti
            if (timeRemaining < 5 * 60 * 1000) {
                countdownElement.classList.add('text-red-400');
            } else {
                countdownElement.classList.remove('text-red-400');
            }
        };

        // Aggiorna subito
        updateCountdown();

        // Poi ogni secondo
        this.turnTimerInterval = setInterval(updateCountdown, 1000);

        // Risincronizza con il server ogni 10 secondi
        this.serverSyncInterval = setInterval(async () => {
            await this.syncWithServer(context);
        }, 10000);
    },

    /**
     * Risincronizza il countdown con il server
     */
    async syncWithServer(context) {
        const { db, firestoreTools, paths, currentTeamId } = context;
        const { CONFIG_DOC_ID } = window.DraftConstants;
        const { doc, getDoc } = firestoreTools;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) return;

            const configData = configDoc.data();
            const draftTurns = configData.draftTurns;

            if (!draftTurns || !draftTurns.isActive) {
                // Draft non piu' attivo, ricarica la pagina
                console.log("Sync: Draft non piu' attivo, ricarico...");
                this.render(context);
                return;
            }

            // Verifica se il turno e' cambiato
            if (draftTurns.turnStartTime !== this.serverTurnStartTime) {
                console.log("Sync: turnStartTime cambiato, aggiorno...");
                this.serverTurnStartTime = draftTurns.turnStartTime;

                // Se non e' piu' il mio turno o lo stato e' cambiato, ricarica
                if (draftTurns.currentTeamId !== currentTeamId) {
                    console.log("Sync: Non e' piu' il mio turno, ricarico UI...");
                    this.render(context);
                }
            }

        } catch (error) {
            console.error("Errore sync con server:", error);
        }
    },

    /**
     * Pulisce il timer del turno e il sync
     */
    clearTurnTimer() {
        if (this.turnTimerInterval) {
            clearInterval(this.turnTimerInterval);
            this.turnTimerInterval = null;
        }
        if (this.serverSyncInterval) {
            clearInterval(this.serverSyncInterval);
            this.serverSyncInterval = null;
        }
        this.serverTurnStartTime = null;
    }
};

console.log("Modulo Draft-User-UI caricato.");
