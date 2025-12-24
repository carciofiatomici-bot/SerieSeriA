//
// ====================================================================
// DRAFT-USER-UI.JS - Rendering Pannello Utente Draft (Mobile-First)
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

    // Cache dei pick recenti
    recentPicksCache: [],

    // Stato espanso/collassato della sezione pick recenti
    recentPicksExpanded: false,

    /**
     * Carica i pick recenti dal draft
     */
    async loadRecentPicks(context, limit = 10) {
        const { db, firestoreTools, paths } = context;
        const { collection, getDocs, query, where, orderBy } = firestoreTools;

        try {
            const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);
            const q = query(
                playersCollectionRef,
                where('isDrafted', '==', true)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return [];
            }

            let teamNamesCache = {};
            if (window.TeamsListener) {
                await window.TeamsListener.getTeams();
                teamNamesCache = window.TeamsListener.getTeamNamesMap();
            }

            const picks = [];
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();

                if (data.draftedBy) {
                    const teamName = teamNamesCache[data.draftedBy] || data.draftedBy;

                    let draftedAtDate = data.draftedAt;
                    if (draftedAtDate && typeof draftedAtDate.toDate === 'function') {
                        draftedAtDate = draftedAtDate.toDate().toISOString();
                    } else if (draftedAtDate && typeof draftedAtDate.toMillis === 'function') {
                        draftedAtDate = new Date(draftedAtDate.toMillis()).toISOString();
                    } else if (!draftedAtDate) {
                        draftedAtDate = new Date().toISOString();
                    }

                    picks.push({
                        id: docSnap.id,
                        name: data.name,
                        role: data.role,
                        type: data.type,
                        level: data.level || data.levelRange?.[0] || '?',
                        draftedBy: data.draftedBy,
                        draftedByName: teamName,
                        draftedAt: draftedAtDate,
                        autoAssigned: data.autoAssigned || false
                    });
                }
            }

            picks.sort((a, b) => {
                const dateA = new Date(a.draftedAt).getTime();
                const dateB = new Date(b.draftedAt).getTime();
                return dateB - dateA;
            });

            this.recentPicksCache = picks.slice(0, limit);
            return this.recentPicksCache;

        } catch (error) {
            console.error('[RecentPicks] Errore caricamento:', error);
            return [];
        }
    },

    /**
     * Renderizza la sezione pick recenti (Mobile-First)
     */
    renderRecentPicksSection(picks, currentTeamId) {
        if (!picks || picks.length === 0) {
            return `
                <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-xl p-3 border border-gray-700/50">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-lg">📋</span>
                        <h4 class="text-sm font-bold text-cyan-400">Pick Effettuati</h4>
                    </div>
                    <p class="text-gray-500 text-xs text-center py-2">Nessun pick ancora effettuato</p>
                </div>
            `;
        }

        const isExpanded = this.recentPicksExpanded;
        const visiblePicks = isExpanded ? picks : picks.slice(0, 3);

        const roleBadge = {
            'P': 'bg-yellow-600 text-yellow-100',
            'D': 'bg-blue-600 text-blue-100',
            'C': 'bg-green-600 text-green-100',
            'A': 'bg-red-600 text-red-100'
        };

        const picksHtml = visiblePicks.map((pick, index) => {
            const isMyPick = pick.draftedBy === currentTeamId;
            const typeColor = pick.type === 'Potenza' ? 'text-red-400' :
                              pick.type === 'Tecnica' ? 'text-blue-400' :
                              pick.type === 'Velocita' ? 'text-green-400' : 'text-gray-400';

            const timeAgo = this.formatTimeAgo(pick.draftedAt);
            const autoTag = pick.autoAssigned ? '<span class="text-[9px] bg-orange-900/50 text-orange-400 px-1 rounded">auto</span>' : '';

            return `
                <div class="flex items-center justify-between py-2 ${index > 0 ? 'border-t border-gray-700/50' : ''} ${isMyPick ? 'bg-green-900/20 -mx-2 px-2 rounded-lg' : ''}">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="text-gray-600 text-[10px] w-4">#${index + 1}</span>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="text-white text-sm font-bold">${pick.name}</span>
                                <span class="text-[9px] px-1.5 py-0.5 rounded font-bold ${roleBadge[pick.role] || 'bg-gray-600 text-gray-300'}">${pick.role}</span>
                                <span class="${typeColor} text-[10px]">${pick.type || ''}</span>
                                ${autoTag}
                            </div>
                            <p class="text-[10px] ${isMyPick ? 'text-green-400' : 'text-gray-500'}">
                                ${isMyPick ? '✓ Tu' : (pick.draftedByName || '?')} • ${timeAgo}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const showMoreBtn = picks.length > 3 ? `
            <button id="btn-toggle-recent-picks" class="w-full mt-2 text-[10px] text-cyan-400 hover:text-cyan-300 transition py-1">
                ${isExpanded ? '▲ Mostra meno' : `▼ Mostra tutti (${picks.length})`}
            </button>
        ` : '';

        return `
            <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-xl p-3 border border-gray-700/50">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">📋</span>
                        <h4 class="text-sm font-bold text-cyan-400">Pick Effettuati</h4>
                        <span class="text-[9px] px-1.5 py-0.5 bg-cyan-900/50 rounded-full text-cyan-400 font-bold">${picks.length}</span>
                    </div>
                    <button id="btn-refresh-recent-picks" class="text-gray-500 hover:text-white text-sm transition" title="Aggiorna">
                        🔄
                    </button>
                </div>
                <div id="recent-picks-list">
                    ${picksHtml}
                </div>
                ${showMoreBtn}
            </div>
        `;
    },

    /**
     * Formatta il tempo trascorso
     */
    formatTimeAgo(dateString) {
        const now = Date.now();
        const date = new Date(dateString).getTime();
        const diffMs = now - date;

        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMs / 3600000);
        const days = Math.floor(diffMs / 86400000);

        if (minutes < 1) return 'adesso';
        if (minutes < 60) return `${minutes}m fa`;
        if (hours < 24) return `${hours}h fa`;
        return `${days}g fa`;
    },

    /**
     * Setup event listeners per la sezione pick recenti
     */
    setupRecentPicksListeners(context) {
        const toggleBtn = document.getElementById('btn-toggle-recent-picks');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.recentPicksExpanded = !this.recentPicksExpanded;
                const container = document.getElementById('recent-picks-container');
                if (container) {
                    container.innerHTML = this.renderRecentPicksSection(this.recentPicksCache, context.currentTeamId);
                    this.setupRecentPicksListeners(context);
                }
            });
        }

        const refreshBtn = document.getElementById('btn-refresh-recent-picks');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.textContent = '⏳';
                await this.loadRecentPicks(context);
                const container = document.getElementById('recent-picks-container');
                if (container) {
                    container.innerHTML = this.renderRecentPicksSection(this.recentPicksCache, context.currentTeamId);
                    this.setupRecentPicksListeners(context);
                }
                refreshBtn.textContent = '🔄';
            });
        }
    },

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
                if (this.filters.role !== 'all' && p.role !== this.filters.role) return false;
                if (this.filters.type !== 'all' && p.type !== this.filters.type) return false;
                const cost = p.cost || 0;
                if (this.filters.minCost !== null && cost < this.filters.minCost) return false;
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
     * Genera l'HTML della barra filtri (Mobile-First)
     */
    renderFiltersBar() {
        return `
            <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-xl p-3 border border-gray-700/50">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🔍</span>
                        <h4 class="text-sm font-bold text-cyan-400">Filtri</h4>
                    </div>
                    <button id="btn-reset-filters" class="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded-lg transition">
                        Reset
                    </button>
                </div>

                <!-- Filtro Ruolo -->
                <div class="mb-3">
                    <p class="text-[10px] text-gray-500 mb-1.5">Ruolo</p>
                    <div class="flex gap-1.5 flex-wrap">
                        <button class="filter-role-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.role === 'all' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}" data-role="all">Tutti</button>
                        <button class="filter-role-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.role === 'P' ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-yellow-400'}" data-role="P">🧤 P</button>
                        <button class="filter-role-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.role === 'D' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-blue-400'}" data-role="D">🛡️ D</button>
                        <button class="filter-role-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.role === 'C' ? 'bg-green-500 text-white' : 'bg-gray-700 text-green-400'}" data-role="C">⚽ C</button>
                        <button class="filter-role-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.role === 'A' ? 'bg-red-500 text-white' : 'bg-gray-700 text-red-400'}" data-role="A">⚡ A</button>
                    </div>
                </div>

                <!-- Filtro Tipo -->
                <div class="mb-3">
                    <p class="text-[10px] text-gray-500 mb-1.5">Tipo</p>
                    <div class="flex gap-1.5 flex-wrap">
                        <button class="filter-type-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.type === 'all' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}" data-type="all">Tutti</button>
                        <button class="filter-type-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.type === 'Potenza' ? 'bg-red-500 text-white' : 'bg-gray-700 text-red-400'}" data-type="Potenza">Potenza</button>
                        <button class="filter-type-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.type === 'Tecnica' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-blue-400'}" data-type="Tecnica">Tecnica</button>
                        <button class="filter-type-btn px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition ${this.filters.type === 'Velocita' ? 'bg-green-500 text-white' : 'bg-gray-700 text-green-400'}" data-type="Velocita">Velocita</button>
                    </div>
                </div>

                <!-- Filtro Costo e Ordinamento -->
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <p class="text-[10px] text-gray-500 mb-1">Costo (CS)</p>
                        <div class="flex gap-1 items-center">
                            <input type="number" id="filter-min-cost" placeholder="Min" value="${this.filters.minCost || ''}"
                                   class="w-full px-2 py-1.5 text-[10px] bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none">
                            <span class="text-gray-600 text-[10px]">-</span>
                            <input type="number" id="filter-max-cost" placeholder="Max" value="${this.filters.maxCost || ''}"
                                   class="w-full px-2 py-1.5 text-[10px] bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none">
                        </div>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-500 mb-1">Ordina</p>
                        <select id="filter-sort" class="w-full px-2 py-1.5 text-[10px] bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none">
                            <option value="cost_asc" ${this.filters.sortBy === 'cost_asc' ? 'selected' : ''}>Costo ↑</option>
                            <option value="cost_desc" ${this.filters.sortBy === 'cost_desc' ? 'selected' : ''}>Costo ↓</option>
                            <option value="level_desc" ${this.filters.sortBy === 'level_desc' ? 'selected' : ''}>Livello ↓</option>
                            <option value="name" ${this.filters.sortBy === 'name' ? 'selected' : ''}>Nome A-Z</option>
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
        document.querySelectorAll('.filter-role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filters.role = e.target.dataset.role;
                this.renderPlayersList(context, budgetRimanente);
            });
        });

        document.querySelectorAll('.filter-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filters.type = e.target.dataset.type;
                this.renderPlayersList(context, budgetRimanente);
            });
        });

        const minCostInput = document.getElementById('filter-min-cost');
        if (minCostInput) {
            minCostInput.addEventListener('change', (e) => {
                this.filters.minCost = e.target.value ? parseInt(e.target.value) : null;
                this.renderPlayersList(context, budgetRimanente);
            });
        }

        const maxCostInput = document.getElementById('filter-max-cost');
        if (maxCostInput) {
            maxCostInput.addEventListener('change', (e) => {
                this.filters.maxCost = e.target.value ? parseInt(e.target.value) : null;
                this.renderPlayersList(context, budgetRimanente);
            });
        }

        const sortSelect = document.getElementById('filter-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sortBy = e.target.value;
                this.renderPlayersList(context, budgetRimanente);
            });
        }

        const resetBtn = document.getElementById('btn-reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
                this.renderPlayersList(context, budgetRimanente);
            });
        }
    },

    /**
     * Renderizza una card giocatore (Mobile-First)
     */
    renderPlayerCard(player, budgetRimanente) {
        const calculatePlayerCost = window.calculatePlayerCost;
        const costMin = calculatePlayerCost ? calculatePlayerCost(player.levelRange[0], player.abilities || []) : player.cost;
        const costMax = calculatePlayerCost ? calculatePlayerCost(player.levelRange[1], player.abilities || []) : player.cost;
        const costDisplay = costMin === costMax ? `${costMin}` : `${costMin}-${costMax}`;

        const isAffordable = budgetRimanente >= costMin;
        const canBuy = isAffordable;

        const typeColors = {
            'Potenza': { bg: 'from-red-900/30', border: 'border-red-500/50', text: 'text-red-400' },
            'Tecnica': { bg: 'from-blue-900/30', border: 'border-blue-500/50', text: 'text-blue-400' },
            'Velocita': { bg: 'from-green-900/30', border: 'border-green-500/50', text: 'text-green-400' }
        };

        const typeStyle = typeColors[player.type] || { bg: 'from-gray-800/60', border: 'border-gray-700/50', text: 'text-gray-400' };

        const roleBadges = {
            'P': 'bg-yellow-600 text-yellow-100',
            'D': 'bg-blue-600 text-blue-100',
            'C': 'bg-green-600 text-green-100',
            'A': 'bg-red-600 text-red-100'
        };

        const abilitiesHtml = player.abilities && player.abilities.length > 0
            ? `<div class="flex flex-wrap gap-1 mt-1.5">${player.abilities.map(a => `<span class="text-[9px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">${a}</span>`).join('')}</div>`
            : '';

        // Potenziale
        let potenzialHtml = '';
        if (player.secretMaxLevel !== undefined) {
            const maxLvl = player.secretMaxLevel;
            let potenziale, potenzialColor;
            if (maxLvl <= 5) { potenziale = 'Dilettante'; potenzialColor = 'text-gray-400 bg-gray-700/50'; }
            else if (maxLvl <= 10) { potenziale = 'Accettabile'; potenzialColor = 'text-white bg-gray-600/50'; }
            else if (maxLvl <= 15) { potenziale = 'Pro'; potenzialColor = 'text-green-400 bg-green-900/50'; }
            else if (maxLvl <= 19) { potenziale = 'Fuoriclasse'; potenzialColor = 'text-blue-400 bg-blue-900/50'; }
            else if (maxLvl <= 24) { potenziale = 'Leggenda'; potenzialColor = 'text-purple-400 bg-purple-900/50'; }
            else { potenziale = 'GOAT'; potenzialColor = 'text-orange-400 bg-orange-900/50'; }
            potenzialHtml = `<span class="text-[9px] ${potenzialColor} px-1.5 py-0.5 rounded font-bold">${potenziale}</span>`;
        }

        return `
            <div class="bg-gradient-to-br ${typeStyle.bg} to-gray-900/80 rounded-xl p-3 border ${typeStyle.border} ${!canBuy ? 'opacity-60' : ''}">
                <!-- Header -->
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-white font-bold text-sm">${player.name}</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded font-bold ${roleBadges[player.role] || 'bg-gray-600 text-gray-300'}">${player.role}</span>
                            <span class="${typeStyle.text} text-[10px] font-semibold">${player.type || ''}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                            <span>Lv. ${player.levelRange[0]}-${player.levelRange[1]}</span>
                            <span>•</span>
                            <span>${player.age} anni</span>
                            ${potenzialHtml}
                        </div>
                        ${abilitiesHtml}
                    </div>
                </div>

                <!-- Footer con prezzo e bottone -->
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                    <div class="text-yellow-400 font-black text-base">${costDisplay} CS</div>
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
                            class="px-4 py-2 text-xs font-bold rounded-xl transition ${canBuy ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 active:scale-95' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}">
                        ${isAffordable ? 'Drafta' : 'No Budget'}
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza solo la lista giocatori
     */
    renderPlayersList(context, budgetRimanente) {
        const listContainer = document.getElementById('available-players-list');
        const filtersContainer = document.getElementById('draft-filters-container');
        if (!listContainer) return;

        if (filtersContainer) {
            filtersContainer.innerHTML = this.renderFiltersBar();
            this.setupFilterListeners(context, budgetRimanente);
        }

        const filteredPlayers = this.filterAndSortPlayers(this.availablePlayersCache);

        listContainer.innerHTML = filteredPlayers.length > 0
            ? filteredPlayers.map(player => this.renderPlayerCard(player, budgetRimanente)).join('')
            : '<p class="text-center text-gray-500 py-8">Nessun giocatore trovato</p>';

        const countEl = document.getElementById('filtered-count');
        if (countEl) {
            countEl.textContent = `${filteredPlayers.length} giocatori`;
        }

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
        }
    },

    /**
     * Avvia il listener real-time per lo stato del Draft
     */
    startConfigListener(context) {
        const { db, firestoreTools, paths } = context;
        const { CONFIG_DOC_ID } = window.DraftConstants;
        const { doc, onSnapshot } = firestoreTools;

        this.stopConfigListener();

        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        this.configUnsubscribe = onSnapshot(configDocRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const configData = snapshot.data();
            const isDraftOpen = configData.isDraftOpen || false;
            const draftTurns = configData.draftTurns || null;

            if (window.DraftTimerSync && draftTurns) {
                window.DraftTimerSync.updateFromFirestore(draftTurns);
            }

            const draftContent = document.getElementById('draft-content');
            if (draftContent && !draftContent.classList.contains('hidden')) {
                this.render(this.savedContext || context);
            }
        }, (error) => {
            console.error("Errore listener config Draft:", error);
        });
    },

    /**
     * Renderizza il pannello utente del Draft (Mobile-First)
     */
    async render(context) {
        this.savedContext = context;

        const { draftToolsContainer, draftBackButton, appContent, db, firestoreTools, paths, currentTeamId } = context;
        const { MAX_ROSA_PLAYERS, CONFIG_DOC_ID } = window.DraftConstants;

        this.clearTurnTimer();

        draftBackButton.textContent = "← Dashboard";
        draftBackButton.className = "w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition mt-4";
        draftBackButton.onclick = () => {
            this.clearTurnTimer();
            this.stopConfigListener();
            window.showScreen(appContent);
        };

        draftToolsContainer.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-10 w-10 border-4 border-yellow-500 border-t-transparent"></div>
            </div>
        `;

        if (!currentTeamId) {
            draftToolsContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-4xl mb-4">❌</p>
                    <p class="text-red-400 font-bold">Errore: ID squadra non trovato</p>
                </div>
            `;
            return;
        }

        if (!this.configUnsubscribe) {
            this.startConfigListener(context);
        }

        const { doc, getDoc, collection, getDocs, query, where } = firestoreTools;
        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        try {
            const configDoc = await getDoc(configDocRef);
            const configData = configDoc.exists() ? configDoc.data() : {};
            const isDraftOpen = configData.isDraftOpen || false;
            const draftTurns = configData.draftTurns || null;
            const isDraftTurnsActive = draftTurns && draftTurns.isActive;

            const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, currentTeamId);
            const teamDoc = await getDoc(teamDocRef);
            const teamData = teamDoc.exists() ? teamDoc.data() : {};
            const budgetRimanente = teamData.budget || 0;
            const currentPlayers = teamData.players || [];

            const getPlayerCountExcludingIcona = window.getPlayerCountExcludingIcona;
            const currentRosaCount = getPlayerCountExcludingIcona(currentPlayers);
            const isRosaFull = currentRosaCount >= MAX_ROSA_PLAYERS;

            let turnInfo = null;
            if (isDraftTurnsActive && window.DraftTurns && window.DraftTurns.checkTeamTurn) {
                try {
                    turnInfo = await window.DraftTurns.checkTeamTurn(context, currentTeamId);

                    const timerEnabled = draftTurns.timerEnabled !== false;
                    if (timerEnabled && !draftTurns.isPaused && !window.DraftTurns.turnCheckInterval) {
                        window.DraftTurns.startTurnCheck(context);
                    }

                    if (window.Notifications?.notify) {
                        const lastTurnNotifKey = `draft_turn_notif_${currentTeamId}_${turnInfo.currentRound}`;
                        const lastStealNotifKey = `draft_steal_notif_${turnInfo.currentTeamId}`;

                        if (turnInfo.isMyTurn && !turnInfo.hasDraftedThisRound) {
                            if (!sessionStorage.getItem(lastTurnNotifKey)) {
                                window.Notifications.notify.draftTurn();
                                sessionStorage.setItem(lastTurnNotifKey, 'true');
                            }
                        } else if (turnInfo.canSteal && turnInfo.currentTeamName) {
                            if (!sessionStorage.getItem(lastStealNotifKey)) {
                                window.Notifications.notify.draftTurnSteal(turnInfo.currentTeamName);
                                sessionStorage.setItem(lastStealNotifKey, 'true');
                            }
                        }
                    }
                } catch (turnError) {
                    console.error("Errore nel controllo turno:", turnError);
                    turnInfo = null;
                }
            }

            if (isDraftOpen && window.DraftStatusBox) {
                await window.DraftStatusBox.init('draft-status-box-container');
            } else {
                const statusBoxContainer = document.getElementById('draft-status-box-container');
                if (statusBoxContainer) {
                    statusBoxContainer.classList.add('hidden');
                    statusBoxContainer.innerHTML = '';
                }
            }

            if (!isDraftOpen) {
                // DRAFT CHIUSO
                draftToolsContainer.innerHTML = `
                    <div class="bg-gradient-to-br from-red-900/30 to-gray-900/80 rounded-xl p-4 border border-red-500/50 text-center">
                        <p class="text-3xl mb-2">🔒</p>
                        <p class="text-xl font-black text-red-400">DRAFT CHIUSO</p>
                        <div class="mt-3 flex justify-center gap-4">
                            <div class="text-center">
                                <p class="text-lg font-bold ${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}/${MAX_ROSA_PLAYERS}</p>
                                <p class="text-[10px] text-gray-500">Rosa</p>
                            </div>
                        </div>
                        <p class="text-gray-400 text-sm mt-3">Attendi che l'Admin apra il Draft.</p>
                    </div>
                `;

            } else if (isDraftTurnsActive) {
                // DRAFT A TURNI ATTIVO
                await this.renderDraftTurnsUI(context, turnInfo, budgetRimanente, currentRosaCount, isRosaFull);

            } else {
                // DRAFT APERTO MA SENZA TURNI
                draftToolsContainer.innerHTML = `
                    <div class="bg-gradient-to-br from-yellow-900/30 to-gray-900/80 rounded-xl p-4 border border-yellow-500/50 text-center">
                        <p class="text-3xl mb-2">⏳</p>
                        <p class="text-xl font-black text-yellow-400">DRAFT APERTO</p>
                        <p class="text-gray-400 text-sm mt-2">In attesa della lista del draft...</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error("Errore nel caricamento Draft Utente:", error);
            draftToolsContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-4xl mb-4">❌</p>
                    <p class="text-red-400 font-bold">Errore caricamento</p>
                    <button onclick="window.DraftUserUI.render(window.DraftUserUI.savedContext)" class="mt-4 px-4 py-2 bg-gray-700 rounded-xl text-white text-sm hover:bg-gray-600 transition">Riprova</button>
                </div>
            `;
        }
    },

    /**
     * Renderizza l'UI per il draft a turni (Mobile-First)
     */
    async renderDraftTurnsUI(context, turnInfo, budgetRimanente, currentRosaCount, isRosaFull) {
        const { draftToolsContainer, db, firestoreTools, paths } = context;
        const { MAX_ROSA_PLAYERS } = window.DraftConstants;
        const { collection, getDocs, query, where } = firestoreTools;

        // DRAFT IN PAUSA
        if (turnInfo.isPaused) {
            draftToolsContainer.innerHTML = `
                <div class="bg-gradient-to-br from-orange-900/30 to-gray-900/80 rounded-xl p-4 border border-orange-500/50 text-center">
                    <p class="text-3xl mb-2 animate-pulse">⏸️</p>
                    <p class="text-xl font-black text-orange-400">DRAFT IN PAUSA</p>
                    <p class="text-gray-400 text-sm mt-1">Round ${turnInfo.currentRound}/${turnInfo.totalRounds}</p>
                    <div class="mt-4 bg-orange-900/30 rounded-xl p-3 border border-orange-700/50">
                        <p class="text-orange-300 text-sm">Il draft e' stato temporaneamente sospeso.</p>
                    </div>
                    <button id="btn-refresh-draft" class="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition">
                        Aggiorna
                    </button>
                </div>
            `;

            this.clearTurnTimer();
            document.getElementById('btn-refresh-draft').addEventListener('click', () => this.render(context));
            return;
        }

        // HAI GIA' DRAFTATO
        if (turnInfo.hasDraftedThisRound) {
            const recentPicks = await this.loadRecentPicks(context, 10);

            draftToolsContainer.innerHTML = `
                <div class="space-y-3">
                    <!-- Status -->
                    <div class="bg-gradient-to-br from-green-900/30 to-gray-900/80 rounded-xl p-4 border border-green-500/50 text-center">
                        <p class="text-3xl mb-2">✅</p>
                        <p class="text-xl font-black text-green-400">HAI DRAFTATO!</p>
                        <p class="text-gray-400 text-sm mt-1">Round ${turnInfo.currentRound}/${turnInfo.totalRounds}</p>
                        <div class="mt-3 bg-gray-800/50 rounded-xl p-2">
                            <p class="text-[10px] text-gray-500">Turno di</p>
                            <p class="text-yellow-400 font-bold text-sm">${turnInfo.currentTeamName}</p>
                        </div>
                    </div>

                    <!-- Pick Recenti -->
                    <div id="recent-picks-container">
                        ${this.renderRecentPicksSection(recentPicks, context.currentTeamId)}
                    </div>

                    <button id="btn-refresh-draft" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition">
                        Aggiorna
                    </button>
                </div>
            `;

            this.setupRecentPicksListeners(context);
            document.getElementById('btn-refresh-draft')?.addEventListener('click', () => this.render(context));
            return;
        }

        // NON E' IL MIO TURNO
        if (!turnInfo.isMyTurn) {
            const timeRemaining = turnInfo.timeRemaining;
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            const canSteal = turnInfo.canSteal;
            const isNightPause = turnInfo.isNightPause;
            const isStolenTurn = turnInfo.isStolenTurn;

            const recentPicks = await this.loadRecentPicks(context, 10);

            draftToolsContainer.innerHTML = `
                <div class="space-y-3">
                    <!-- Status -->
                    <div class="bg-gradient-to-br ${canSteal ? 'from-red-900/30 border-red-500/50' : 'from-yellow-900/30 border-yellow-500/50'} to-gray-900/80 rounded-xl p-4 border text-center">
                        <p class="text-3xl mb-2 ${canSteal ? 'animate-pulse' : ''}">${canSteal ? '⚡' : '⏳'}</p>
                        <p class="text-xl font-black ${canSteal ? 'text-red-400' : 'text-yellow-400'}">
                            ${canSteal ? 'TURNO RUBABILE!' : 'IN ATTESA'}
                        </p>
                        <p class="text-gray-400 text-sm mt-1">Round ${turnInfo.currentRound}/${turnInfo.totalRounds}</p>

                        ${isNightPause ? `
                            <div class="mt-2 bg-indigo-900/30 rounded-xl p-2 border border-indigo-500/50">
                                <p class="text-indigo-300 text-xs flex items-center justify-center gap-1">
                                    🌙 Pausa notturna (00-08)
                                </p>
                            </div>
                        ` : ''}

                        <div class="mt-3 bg-gray-800/50 rounded-xl p-3">
                            <p class="text-[10px] text-gray-500">Turno di ${isStolenTurn ? '(rubato)' : ''}</p>
                            <p class="${canSteal ? 'text-red-400' : 'text-yellow-400'} font-bold">${turnInfo.currentTeamName}</p>
                            ${canSteal ? `
                                <p class="text-red-400 font-bold text-sm mt-1">TEMPO SCADUTO!</p>
                                <p class="text-[10px] text-gray-500">Strikes: ${turnInfo.currentTeamStealStrikes}/5</p>
                            ` : `
                                <p class="text-white font-bold text-lg mt-1">
                                    <span id="draft-turn-countdown" class="${isNightPause ? 'text-indigo-400' : ''}">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>
                                </p>
                            `}
                        </div>

                        ${canSteal ? `
                            <div class="mt-3">
                                <button id="btn-steal-turn" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition animate-pulse">
                                    ⚡ RUBA TURNO ⚡
                                </button>
                                <p class="text-[10px] text-gray-500 mt-1">Avrai 10 min per draftare</p>
                            </div>
                        ` : `
                            <p class="text-[10px] text-gray-500 mt-2">Posizione: ${turnInfo.position + 1}/${turnInfo.totalTeams}</p>
                        `}
                    </div>

                    <!-- Pick Recenti -->
                    <div id="recent-picks-container">
                        ${this.renderRecentPicksSection(recentPicks, context.currentTeamId)}
                    </div>

                    <button id="btn-refresh-draft" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition">
                        Aggiorna
                    </button>
                </div>
            `;

            if (!canSteal) {
                this.startTurnCountdown(context, turnInfo.turnStartTime, turnInfo.currentTimeout);
            }

            document.getElementById('btn-refresh-draft').addEventListener('click', () => this.render(context));

            const stealBtn = document.getElementById('btn-steal-turn');
            if (stealBtn) {
                stealBtn.addEventListener('click', async () => {
                    stealBtn.disabled = true;
                    stealBtn.textContent = 'Rubando...';
                    stealBtn.classList.remove('animate-pulse');

                    const result = await window.DraftTurns.stealTurn(context, context.currentTeamId);

                    if (result.success) {
                        this.render(context);
                    } else {
                        stealBtn.disabled = false;
                        stealBtn.textContent = '⚡ RUBA TURNO ⚡';
                        stealBtn.classList.add('animate-pulse');
                        alert(result.message);
                    }
                });
            }

            this.setupRecentPicksListeners(context);
            return;
        }

        // E' IL MIO TURNO!
        if (isRosaFull) {
            draftToolsContainer.innerHTML = `
                <div class="bg-gradient-to-br from-red-900/30 to-gray-900/80 rounded-xl p-4 border border-red-500/50 text-center">
                    <p class="text-3xl mb-2">⚠️</p>
                    <p class="text-xl font-black text-green-400">E' IL TUO TURNO!</p>
                    <p class="text-lg font-bold text-red-400 mt-1">MA LA ROSA E' PIENA</p>
                    <p class="text-gray-400 text-sm mt-2">Licenzia un giocatore per draftare.</p>
                    <div class="mt-3 bg-red-900/30 rounded-xl p-2">
                        <p class="text-white font-bold">
                            <span id="draft-turn-countdown">--:--</span>
                        </p>
                    </div>
                </div>
            `;
            this.startTurnCountdown(context, turnInfo.turnStartTime);
            return;
        }

        // Carica giocatori disponibili
        const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);
        const q = query(playersCollectionRef, where('isDrafted', '==', false));
        const playersSnapshot = await getDocs(q);

        const availablePlayers = playersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(player => !player.isDrafted);

        this.availablePlayersCache = availablePlayers;

        const timeRemaining = turnInfo.timeRemaining;
        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);
        const filteredPlayers = this.filterAndSortPlayers(availablePlayers);

        draftToolsContainer.innerHTML = `
            <div class="space-y-3">
                <!-- Header Turno -->
                <div class="bg-gradient-to-br from-green-900/40 to-gray-900/80 rounded-xl p-4 border-2 border-green-500/70">
                    <div class="text-center">
                        <p class="text-2xl font-black text-green-400 animate-pulse">E' IL TUO TURNO!</p>
                        <p class="text-gray-400 text-sm">Round ${turnInfo.currentRound}/${turnInfo.totalRounds}</p>
                    </div>

                    <div class="flex justify-center gap-6 mt-3">
                        <div class="text-center">
                            <p class="text-2xl font-black text-yellow-400">${budgetRimanente}</p>
                            <p class="text-[10px] text-gray-500">CS Budget</p>
                        </div>
                        <div class="text-center">
                            <p class="text-2xl font-black text-green-400">${currentRosaCount}/${MAX_ROSA_PLAYERS}</p>
                            <p class="text-[10px] text-gray-500">Rosa</p>
                        </div>
                    </div>

                    <div class="mt-3 bg-yellow-900/30 rounded-xl p-2 border border-yellow-500/50">
                        <p class="text-center text-[10px] text-yellow-400">Tempo rimanente</p>
                        <p class="text-center text-2xl font-black text-white">
                            <span id="draft-turn-countdown">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>
                        </p>
                    </div>
                </div>

                <!-- Filtri -->
                <div id="draft-filters-container">
                    ${this.renderFiltersBar()}
                </div>

                <!-- Conteggio -->
                <div class="flex justify-between items-center px-1">
                    <p id="filtered-count" class="text-[10px] text-gray-500">${filteredPlayers.length} giocatori</p>
                </div>

                <!-- Rinuncia Pick -->
                <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-xl p-3 border border-gray-700/50">
                    <button id="btn-skip-turn" class="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2.5 rounded-xl transition border border-gray-500">
                        ↪ Rinuncia al Pick (+150 CS)
                    </button>
                    <p class="text-[10px] text-gray-500 mt-1 text-center">Salta questo turno</p>
                </div>

                <!-- Lista Giocatori -->
                <div id="available-players-list" class="space-y-2 max-h-[50vh] overflow-y-auto">
                    ${filteredPlayers.length > 0
                        ? filteredPlayers.map(player => this.renderPlayerCard(player, budgetRimanente)).join('')
                        : '<p class="text-center text-gray-500 py-8">Nessun giocatore trovato</p>'
                    }
                </div>

                <p id="user-draft-message" class="text-center text-red-400 text-sm"></p>
            </div>
        `;

        this.startTurnCountdown(context, turnInfo.turnStartTime);
        this.setupFilterListeners(context, budgetRimanente);

        document.getElementById('available-players-list').addEventListener('click', (e) => {
            window.DraftUserActions.handleUserDraftAction(e, context);
        });

        const skipTurnBtn = document.getElementById('btn-skip-turn');
        if (skipTurnBtn) {
            skipTurnBtn.addEventListener('click', async () => {
                const confirmed = confirm('Sei sicuro di voler rinunciare al pick?\n\nRiceverai 150 CS come compensazione.');
                if (!confirmed) return;

                skipTurnBtn.disabled = true;
                skipTurnBtn.textContent = 'Rinuncia...';

                const result = await window.DraftTurns.skipTurn(context, context.currentTeamId);

                if (result.success) {
                    this.render(context);
                } else {
                    skipTurnBtn.disabled = false;
                    skipTurnBtn.textContent = '↪ Rinuncia al Pick (+150 CS)';
                    alert('Errore: ' + result.message);
                }
            });
        }
    },

    /**
     * Avvia il countdown del turno usando DraftTimerSync
     */
    startTurnCountdown(context, turnStartTimeParam, timeout) {
        this.clearTurnTimer();

        const countdownElement = document.getElementById('draft-turn-countdown');
        if (!countdownElement) return;

        if (window.DraftTimerSync) {
            this._timerUnsubscribe = window.DraftTimerSync.subscribe((state) => {
                if (!countdownElement) {
                    this.clearTurnTimer();
                    return;
                }

                countdownElement.textContent = state.formattedTime;
                countdownElement.classList.remove('text-indigo-400', 'text-red-400', 'text-red-500', 'text-white');

                if (state.isNightPause) {
                    countdownElement.classList.add('text-indigo-400');
                } else if (state.isExpired) {
                    countdownElement.classList.add('text-red-500');
                } else if (state.isWarning) {
                    countdownElement.classList.add('text-red-400');
                } else {
                    countdownElement.classList.add('text-white');
                }
            });
        } else {
            this._startLegacyCountdown(context, turnStartTimeParam, timeout);
        }
    },

    /**
     * Fallback: countdown legacy
     */
    _startLegacyCountdown(context, turnStartTimeParam, timeout) {
        let turnStartTime = turnStartTimeParam;
        if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
            turnStartTime = turnStartTime.toMillis();
        }

        this.serverTurnStartTime = turnStartTime;
        const { DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants;
        const currentTimeout = timeout || DRAFT_TURN_TIMEOUT_MS;
        const countdownElement = document.getElementById('draft-turn-countdown');

        const updateCountdown = () => {
            if (!countdownElement) {
                this.clearTurnTimer();
                return;
            }

            const isNightPause = window.DraftConstants.isNightPauseActive();
            const timeRemaining = window.DraftConstants.getEffectiveTimeRemaining(this.serverTurnStartTime, currentTimeout);

            if (timeRemaining <= 0 && !isNightPause) {
                countdownElement.textContent = '00:00';
                countdownElement.classList.add('text-red-500');
                this.clearTurnTimer();
                setTimeout(() => this.render(context), 2000);
                return;
            }

            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            countdownElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (isNightPause) {
                countdownElement.classList.add('text-indigo-400');
                countdownElement.classList.remove('text-red-400', 'text-white');
            } else {
                countdownElement.classList.remove('text-indigo-400');
                const warningThreshold = currentTimeout < DRAFT_TURN_TIMEOUT_MS ? 2 * 60 * 1000 : 5 * 60 * 1000;
                if (timeRemaining < warningThreshold) {
                    countdownElement.classList.add('text-red-400');
                    countdownElement.classList.remove('text-white');
                } else {
                    countdownElement.classList.remove('text-red-400');
                    countdownElement.classList.add('text-white');
                }
            }
        };

        updateCountdown();
        this.turnTimerInterval = setInterval(updateCountdown, 1000);

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
                this.render(context);
                return;
            }

            if (draftTurns.turnStartTime !== this.serverTurnStartTime) {
                this.serverTurnStartTime = draftTurns.turnStartTime;

                if (draftTurns.currentTeamId !== currentTeamId) {
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
        if (this._timerUnsubscribe) {
            this._timerUnsubscribe();
            this._timerUnsubscribe = null;
        }
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
