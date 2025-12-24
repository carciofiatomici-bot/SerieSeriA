//
// ====================================================================
// CONTENUTO DEL MODULO MERCATO.JS (Logica Acquisto Fuori Lista)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    const mercatoContent = document.getElementById('mercato-content');
    const mercatoToolsContainer = document.getElementById('mercato-tools-container');
    const mercatoBackButton = document.getElementById('mercato-back-button');
    const appContent = document.getElementById('app-content');

    // Variabile per il timer di cooldown
    let cooldownInterval = null;

    // Listener real-time per lo stato del Mercato
    let configUnsubscribe = null;

    // Assicurati che il contenitore tools esista
    if (mercatoContent && !mercatoContent.querySelector('#mercato-tools-container')) {
        mercatoContent.innerHTML += `<div id="mercato-tools-container" class="mt-6"></div>`;
    }

    // Variabili globali
    let db;
    let firestoreTools;
    let currentTeamId = null;

    // Costanti per le collezioni
    const CONFIG_DOC_ID = 'settings';
    let MARKET_PLAYERS_COLLECTION_PATH; // Collezione specifica per il Mercato
    let CHAMPIONSHIP_CONFIG_PATH;
    let TEAMS_COLLECTION_PATH;

    // Stato filtri Mercato
    let marketFilters = {
        role: 'all',
        type: 'all',
        minCost: null,
        maxCost: null,
        sortBy: 'cost_asc'
    };

    // Cache giocatori disponibili
    let availablePlayersCache = [];
    let currentBudgetCache = 0;
    let marketDiscountCache = 0; // Sconto stadio (0.05 = 5%, 0.10 = 10%, 0.15 = 15%)

    // === GIOCATORI BASE GRATUITI ===
    const BASE_PLAYER_NAMES = [
        'Rossi', 'Bianchi', 'Ferrari', 'Russo', 'Romano', 'Gallo', 'Costa', 'Fontana',
        'Conti', 'Esposito', 'Ricci', 'Bruno', 'De Luca', 'Moretti', 'Marino', 'Greco',
        'Barbieri', 'Lombardi', 'Giordano', 'Colombo', 'Mancini', 'Longo', 'Leone', 'Martinelli'
    ];
    const BASE_PLAYER_FIRST_NAMES = [
        'Marco', 'Luca', 'Andrea', 'Giuseppe', 'Giovanni', 'Paolo', 'Antonio', 'Francesco',
        'Alessandro', 'Matteo', 'Lorenzo', 'Davide', 'Simone', 'Fabio', 'Stefano', 'Roberto'
    ];
    const PLAYER_TYPES = ['Potenza', 'Tecnica', 'Velocita'];
    const ROLE_LABELS = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' };
    const ROLE_COLORS = { P: 'blue', D: 'green', C: 'yellow', A: 'red' };

    // === SISTEMA OGGETTI ===
    // Tab attivo: 'players' o 'objects'
    let activeMarketTab = 'players';

    // Cache oggetti disponibili
    let availableObjectsCache = [];

    // Costanti oggetti
    const OBJECT_TYPES = ['cappello', 'maglia', 'guanti', 'parastinchi', 'scarpini'];
    const TYPE_ICONS = {
        'cappello': '🧢',
        'maglia': '👕',
        'guanti': '🧤',
        'parastinchi': '🦵',
        'scarpini': '👟'
    };
    const TYPE_LABELS = {
        'cappello': 'Cappello',
        'maglia': 'Maglia',
        'guanti': 'Guanti',
        'parastinchi': 'Parastinchi',
        'scarpini': 'Scarpini'
    };
    const PHASE_LABELS = {
        'costruzione': 'Costruzione',
        'attacco': 'Attacco',
        'difesa': 'Difesa',
        'portiere': 'Portiere',
        'tiro': 'Tiro',
        'tutte': 'Tutte'
    };
    const APPLY_LABELS = {
        'attack': 'Attacco',
        'defense': 'Difesa',
        'both': 'Entrambi'
    };

    /**
     * Genera un nome casuale per un giocatore base
     */
    const generateBasePlayerName = () => {
        const firstName = BASE_PLAYER_FIRST_NAMES[Math.floor(Math.random() * BASE_PLAYER_FIRST_NAMES.length)];
        const lastName = BASE_PLAYER_NAMES[Math.floor(Math.random() * BASE_PLAYER_NAMES.length)];
        return `${firstName} ${lastName}`;
    };

    /**
     * Genera un tipo casuale per un giocatore base
     */
    const generateBasePlayerType = () => {
        return PLAYER_TYPES[Math.floor(Math.random() * PLAYER_TYPES.length)];
    };

    /**
     * Genera un'eta casuale per un giocatore base (18-25)
     */
    const generateBasePlayerAge = () => {
        return Math.floor(Math.random() * 8) + 18; // 18-25
    };

    /**
     * Renderizza la sezione giocatori base gratuiti
     */
    const renderBasePlayersSection = (isRosaFull, disableAcquisition) => {
        const roles = ['P', 'D', 'C', 'A'];

        return `
            <div class="mt-4 p-4 bg-gray-900 rounded-lg border-2 border-green-500">
                <h3 class="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                    <span>🆓</span> Giocatori Base Gratuiti
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    ${roles.map(role => {
                        const colorClass = ROLE_COLORS[role];
                        const canBuy = !isRosaFull && !disableAcquisition;
                        return `
                            <button data-role="${role}" data-action="buy-base-player"
                                    ${canBuy ? '' : 'disabled'}
                                    class="p-3 rounded-lg font-bold transition duration-150 border-2
                                           ${canBuy
                                               ? `bg-${colorClass}-900/50 border-${colorClass}-500 text-${colorClass}-300 hover:bg-${colorClass}-800`
                                               : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'}">
                                <div class="text-2xl mb-1">${role === 'P' ? '🧤' : role === 'D' ? '🛡️' : role === 'C' ? '⚽' : '👟'}</div>
                                <div class="text-sm">${ROLE_LABELS[role]}</div>
                                <div class="text-xs text-green-400 mt-1">0 CS</div>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    };

    /**
     * Setup event listeners per i bottoni giocatori base
     */
    const setupBasePlayersListeners = () => {
        const basePlayersSection = document.getElementById('base-players-section');
        if (!basePlayersSection) return;

        basePlayersSection.querySelectorAll('[data-action="buy-base-player"]').forEach(btn => {
            btn.addEventListener('click', handleBuyBasePlayer);
        });
    };

    /**
     * Mostra il modal per selezionare la tipologia del giocatore base
     */
    const showTypeSelectionModal = (role, roleName) => {
        return new Promise((resolve, reject) => {
            // Rimuovi modal esistente se presente
            const existingModal = document.getElementById('type-selection-modal');
            if (existingModal) existingModal.remove();

            // Badge per tipologie
            const typeBadges = {
                'Potenza': { bg: 'bg-red-600', text: 'text-white', icon: 'fas fa-hand-rock' },
                'Tecnica': { bg: 'bg-blue-600', text: 'text-white', icon: 'fas fa-brain' },
                'Velocita': { bg: 'bg-yellow-500', text: 'text-gray-900', icon: 'fas fa-bolt' }
            };

            const modal = document.createElement('div');
            modal.id = 'type-selection-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border-2 border-indigo-500 shadow-2xl">
                    <h3 class="text-xl font-bold text-indigo-400 mb-4 text-center">Scegli Tipologia</h3>
                    <p class="text-gray-300 text-sm mb-4 text-center">Seleziona la tipologia per il tuo nuovo <span class="font-bold text-${ROLE_COLORS[role]}-400">${roleName}</span></p>
                    <div class="space-y-3">
                        ${PLAYER_TYPES.map(type => {
                            const badge = typeBadges[type];
                            return `
                                <button data-type="${type}" class="w-full p-4 ${badge.bg} ${badge.text} rounded-lg font-bold text-lg hover:opacity-90 transition flex items-center justify-center gap-3 shadow-lg">
                                    <i class="${badge.icon}"></i>
                                    <span>${type}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <button id="type-modal-cancel" class="w-full mt-4 p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">
                        Annulla
                    </button>
                </div>
            `;

            document.body.appendChild(modal);

            // Event listeners per selezione tipologia
            modal.querySelectorAll('[data-type]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const selectedType = btn.dataset.type;
                    modal.remove();
                    resolve(selectedType);
                });
            });

            // Annulla
            modal.querySelector('#type-modal-cancel').addEventListener('click', () => {
                modal.remove();
                reject(new Error('Operazione annullata'));
            });

            // Click fuori dal modal per chiudere
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    reject(new Error('Operazione annullata'));
                }
            });
        });
    };

    /**
     * Gestisce l'acquisto di un giocatore base gratuito
     */
    const handleBuyBasePlayer = async (event) => {
        const target = event.target.closest('[data-action="buy-base-player"]');
        if (!target || target.disabled) return;

        const role = target.dataset.role;
        const roleName = ROLE_LABELS[role];

        // Mostra modal per selezionare la tipologia
        let selectedType;
        try {
            selectedType = await showTypeSelectionModal(role, roleName);
        } catch (e) {
            // Utente ha annullato
            return;
        }

        displayMessage(`Acquisto ${roleName} Base (${selectedType}) in corso...`, 'info');
        target.disabled = true;

        try {
            const { doc, getDoc, updateDoc, runTransaction } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            const result = await runTransaction(db, async (transaction) => {
                const teamDoc = await transaction.get(teamDocRef);

                if (!teamDoc.exists()) {
                    throw new Error("Squadra non trovata.");
                }

                const teamData = teamDoc.data();
                const currentPlayers = teamData.players || [];

                // Controllo limite rosa
                const currentRosaCount = getPlayerCountExcludingIcona(currentPlayers);
                if (currentRosaCount >= MAX_ROSA_PLAYERS) {
                    throw new Error(`Limite massimo di ${MAX_ROSA_PLAYERS} giocatori raggiunto.`);
                }

                // Genera giocatore base con tipologia selezionata dall'utente
                const playerId = `base_${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const playerName = generateBasePlayerName();
                const playerType = selectedType; // Usa la tipologia scelta dall'utente
                const playerAge = generateBasePlayerAge();

                let playerForSquad = {
                    id: playerId,
                    name: playerName,
                    role: role,
                    age: playerAge,
                    cost: 0,
                    level: 5,
                    type: playerType,
                    abilities: [],
                    isCaptain: false,
                    isBasePlayer: true // Flag per identificare giocatori base
                };

                // Inizializza contratto se sistema contratti attivo
                if (window.Contracts?.isEnabled()) {
                    playerForSquad = window.Contracts.initializeContract(playerForSquad);
                }

                // Genera secretMaxLevel per giocatori base (sistema livello massimo segreto)
                if (window.PlayerExp?.isSubjectToSecretMaxLevel(playerForSquad)) {
                    playerForSquad.secretMaxLevel = window.PlayerExp.generateSecretMaxLevel(5);
                }

                // Aggiorna la squadra (SENZA toccare il cooldown - i giocatori base non hanno cooldown)
                transaction.update(teamDocRef, {
                    players: [...currentPlayers, playerForSquad]
                });

                return { playerName, playerType, role };
            });

            const { playerName, playerType } = result;

            displayMessage(`${playerName} (${roleName} Lv.5, ${playerType}) aggiunto alla rosa!`, 'success');

            // Ricarica il pannello
            renderUserMercatoPanel();
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

        } catch (error) {
            console.error("Errore acquisto giocatore base:", error);
            displayMessage(`Errore: ${error.message}`, 'error');
            target.disabled = false;
        }
    };

    /**
     * Resetta i filtri ai valori di default
     */
    const resetMarketFilters = () => {
        marketFilters = {
            role: 'all',
            type: 'all',
            minCost: null,
            maxCost: null,
            sortBy: 'cost_asc'
        };
    };

    /**
     * Filtra e ordina i giocatori del mercato
     */
    const filterAndSortMarketPlayers = (players) => {
        return players
            .filter(p => {
                // Filtro ruolo
                if (marketFilters.role !== 'all' && p.role !== marketFilters.role) return false;

                // Filtro tipo
                if (marketFilters.type !== 'all' && p.type !== marketFilters.type) return false;

                // Filtro costo minimo
                const cost = p.cost || 0;
                if (marketFilters.minCost !== null && cost < marketFilters.minCost) return false;

                // Filtro costo massimo
                if (marketFilters.maxCost !== null && cost > marketFilters.maxCost) return false;

                return true;
            })
            .sort((a, b) => {
                switch(marketFilters.sortBy) {
                    case 'cost_asc': return (a.cost || 0) - (b.cost || 0);
                    case 'cost_desc': return (b.cost || 0) - (a.cost || 0);
                    case 'level_desc': return (b.level || 0) - (a.level || 0);
                    case 'name': return (a.name || '').localeCompare(b.name || '');
                    default: return 0;
                }
            });
    };

    /**
     * Genera l'HTML della barra filtri per il Mercato (Mobile-First)
     */
    const renderMarketFiltersBar = () => {
        return `
            <div class="mb-3 space-y-2">
                <!-- Filtri Ruolo - Chips orizzontali scrollabili -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <span class="text-[10px] text-gray-500 uppercase tracking-wider flex-shrink-0">Ruolo</span>
                    <div class="flex gap-1.5 flex-shrink-0">
                        <button class="filter-market-role-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.role === 'all' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}" data-role="all">Tutti</button>
                        <button class="filter-market-role-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.role === 'P' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30' : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'}" data-role="P">POR</button>
                        <button class="filter-market-role-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.role === 'D' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-gray-800 text-green-400 hover:bg-gray-700'}" data-role="D">DIF</button>
                        <button class="filter-market-role-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.role === 'C' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-800 text-blue-400 hover:bg-gray-700'}" data-role="C">CEN</button>
                        <button class="filter-market-role-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.role === 'A' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-800 text-red-400 hover:bg-gray-700'}" data-role="A">ATT</button>
                    </div>
                </div>

                <!-- Filtri Tipo - Chips -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <span class="text-[10px] text-gray-500 uppercase tracking-wider flex-shrink-0">Tipo</span>
                    <div class="flex gap-1.5 flex-shrink-0">
                        <button class="filter-market-type-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.type === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}" data-type="all">Tutti</button>
                        <button class="filter-market-type-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.type === 'Potenza' ? 'bg-red-500/90 text-white shadow-lg shadow-red-500/30' : 'bg-gray-800 text-red-400 hover:bg-gray-700'}" data-type="Potenza">💪 POT</button>
                        <button class="filter-market-type-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.type === 'Tecnica' ? 'bg-blue-500/90 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-800 text-blue-400 hover:bg-gray-700'}" data-type="Tecnica">🎯 TEC</button>
                        <button class="filter-market-type-btn px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${marketFilters.type === 'Velocita' ? 'bg-yellow-500/90 text-black shadow-lg shadow-yellow-500/30' : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'}" data-type="Velocita">⚡ VEL</button>
                    </div>
                </div>

                <!-- Row: Sort + Reset -->
                <div class="flex items-center gap-2">
                    <select id="filter-market-sort" class="flex-1 px-3 py-2 text-xs bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none">
                        <option value="cost_asc" ${marketFilters.sortBy === 'cost_asc' ? 'selected' : ''}>💰 Prezzo ↑</option>
                        <option value="cost_desc" ${marketFilters.sortBy === 'cost_desc' ? 'selected' : ''}>💰 Prezzo ↓</option>
                        <option value="level_desc" ${marketFilters.sortBy === 'level_desc' ? 'selected' : ''}>📈 Livello ↓</option>
                        <option value="name" ${marketFilters.sortBy === 'name' ? 'selected' : ''}>🔤 Nome A-Z</option>
                    </select>
                    <button id="btn-reset-market-filters" class="p-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition" title="Resetta filtri">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    </button>
                </div>
            </div>
        `;
    };

    /**
     * Setup event listeners per i filtri del Mercato
     */
    const setupMarketFilterListeners = () => {
        // Filtro ruolo
        document.querySelectorAll('.filter-market-role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                marketFilters.role = e.target.dataset.role;
                renderMarketPlayersList();
            });
        });

        // Filtro tipo
        document.querySelectorAll('.filter-market-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                marketFilters.type = e.target.dataset.type;
                renderMarketPlayersList();
            });
        });

        // Filtro costo min
        const minCostInput = document.getElementById('filter-market-min-cost');
        if (minCostInput) {
            minCostInput.addEventListener('change', (e) => {
                marketFilters.minCost = e.target.value ? parseInt(e.target.value) : null;
                renderMarketPlayersList();
            });
        }

        // Filtro costo max
        const maxCostInput = document.getElementById('filter-market-max-cost');
        if (maxCostInput) {
            maxCostInput.addEventListener('change', (e) => {
                marketFilters.maxCost = e.target.value ? parseInt(e.target.value) : null;
                renderMarketPlayersList();
            });
        }

        // Ordinamento
        const sortSelect = document.getElementById('filter-market-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                marketFilters.sortBy = e.target.value;
                renderMarketPlayersList();
            });
        }

        // Reset filtri
        const resetBtn = document.getElementById('btn-reset-market-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                resetMarketFilters();
                renderMarketPlayersList();
            });
        }
    };

    /**
     * Renderizza solo la lista giocatori del Mercato (per aggiornamenti filtri)
     */
    const renderMarketPlayersList = () => {
        const listContainer = document.getElementById('available-market-players-list');
        const filtersContainer = document.getElementById('market-filters-container');
        if (!listContainer) return;

        // Aggiorna UI filtri
        if (filtersContainer) {
            filtersContainer.innerHTML = renderMarketFiltersBar();
            setupMarketFilterListeners();
        }

        const filteredPlayers = filterAndSortMarketPlayers(availablePlayersCache);
        const budgetRimanente = currentBudgetCache;
        const discount = marketDiscountCache;

        listContainer.innerHTML = filteredPlayers.length > 0
            ? filteredPlayers.map(player => {
                const playerLevel = player.level || (player.levelRange ? player.levelRange[0] : 1);
                const originalCost = player.cost || 0;
                const discountedCost = discount > 0 ? Math.floor(originalCost * (1 - discount)) : originalCost;
                const isAffordable = budgetRimanente >= discountedCost;
                const canBuy = isAffordable;

                // Role colors
                const roleColors = {
                    'P': 'bg-yellow-500 text-black',
                    'D': 'bg-green-500 text-white',
                    'C': 'bg-blue-500 text-white',
                    'A': 'bg-red-500 text-white'
                };
                const roleClass = roleColors[player.role] || 'bg-gray-500 text-white';

                // Type styling
                const typeEmoji = player.type === 'Potenza' ? '💪' : player.type === 'Tecnica' ? '🎯' : player.type === 'Velocita' ? '⚡' : '';
                const typeColor = player.type === 'Potenza' ? 'text-red-400' :
                                  player.type === 'Tecnica' ? 'text-blue-400' :
                                  player.type === 'Velocita' ? 'text-yellow-400' : 'text-gray-400';

                // Abilities
                const abilitiesHtml = player.abilities && player.abilities.length > 0
                    ? `<div class="flex flex-wrap gap-1 mt-1.5">${player.abilities.slice(0,2).map(a => `<span class="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">${a}</span>`).join('')}${player.abilities.length > 2 ? `<span class="text-[10px] text-gray-500">+${player.abilities.length - 2}</span>` : ''}</div>`
                    : '';

                // Price display
                let priceHtml = `<span class="text-green-400 font-bold">${discountedCost.toLocaleString('it-IT')}</span>`;
                if (discount > 0) {
                    priceHtml = `<span class="text-gray-500 line-through text-xs mr-1">${originalCost}</span><span class="text-green-400 font-bold">${discountedCost.toLocaleString('it-IT')}</span>`;
                }

                return `
                    <div class="mercato-player-card bg-gray-800/80 rounded-xl p-3 border border-gray-700/50 hover:border-blue-500/50 transition-all active:scale-[0.99]">
                        <div class="flex items-start gap-3">
                            <div class="flex-shrink-0">
                                <span class="${roleClass} text-xs font-black px-2 py-1 rounded-lg">${player.role}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-white font-bold text-sm truncate">${player.name}</p>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-xs text-gray-400">Lv.${playerLevel}</span>
                                    <span class="text-xs ${typeColor}">${typeEmoji} ${player.type || 'N/A'}</span>
                                    <span class="text-xs text-gray-500">${player.age}y</span>
                                </div>
                                ${abilitiesHtml}
                            </div>
                            <div class="flex-shrink-0 text-right">
                                <p class="text-sm">${priceHtml} <span class="text-[10px] text-gray-500">CS</span></p>
                                <button data-player-id="${player.id}"
                                        data-player-cost="${player.cost}"
                                        data-player-level="${playerLevel}"
                                        data-player-name="${player.name}"
                                        data-player-role="${player.role}"
                                        data-player-age="${player.age}"
                                        data-player-type="${player.type}"
                                        data-action="buy-market"
                                        ${canBuy ? '' : 'disabled'}
                                        class="mt-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${canBuy ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}">
                                    ${canBuy ? 'Acquista' : 'No Budget'}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')
            : '<div class="text-center py-8"><p class="text-gray-500 text-sm">Nessun giocatore trovato</p></div>';

        // Mostra conteggio risultati
        const countEl = document.getElementById('market-filtered-count');
        if (countEl) {
            countEl.textContent = `${filteredPlayers.length} giocatori trovati`;
        }

        // Re-attach event listener per l'acquisto
        if (!listContainer._hasClickListener) {
            listContainer.addEventListener('click', handleUserMercatoAction);
            listContainer._hasClickListener = true;
        }
    };

    /**
     * Ferma il listener real-time
     */
    const stopConfigListener = () => {
        if (configUnsubscribe) {
            configUnsubscribe();
            configUnsubscribe = null;
            console.log("Mercato: listener config fermato");
        }
    };

    /**
     * Avvia il listener real-time per lo stato del Mercato
     */
    const startConfigListener = () => {
        // Ferma listener precedente
        stopConfigListener();

        if (!db || !firestoreTools || !CHAMPIONSHIP_CONFIG_PATH) return;

        const { doc, onSnapshot } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        configUnsubscribe = onSnapshot(configDocRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const configData = snapshot.data();
            const isMarketOpen = configData.isMarketOpen || false;

            console.log("Mercato real-time update - isMarketOpen:", isMarketOpen);

            // Se siamo ancora nella pagina Mercato, aggiorna l'UI
            if (mercatoContent && !mercatoContent.classList.contains('hidden')) {
                // Re-renderizza il pannello
                renderUserMercatoPanel();
            }
        }, (error) => {
            console.error("Errore listener config Mercato:", error);
        });
    };

    // COSTANTE COOLDOWN: 15 minuti in millisecondi
    const ACQUISITION_COOLDOWN_MS = window.InterfacciaConstants?.ACQUISITION_COOLDOWN_MS || (15 * 60 * 1000);
    const MARKET_COOLDOWN_KEY = window.InterfacciaConstants?.COOLDOWN_MARKET_KEY || 'lastMarketAcquisitionTimestamp';


    const getRandomInt = window.getRandomInt;
    const getPlayerCountExcludingIcona = window.getPlayerCountExcludingIcona;
    const MAX_ROSA_PLAYERS = window.InterfacciaConstants?.MAX_ROSA_PLAYERS || 12; // 12 slot normali


    const displayMessage = (message, type, elementId = 'user-mercato-message') => {
        const msgElement = document.getElementById(elementId);
        if (!msgElement) return;
        msgElement.textContent = message;
        msgElement.classList.remove('text-red-400', 'text-green-500', 'text-yellow-400', 'text-gray-400');

        if (type === 'error') {
            msgElement.classList.add('text-red-400');
        } else if (type === 'success') {
            msgElement.classList.add('text-green-500');
        } else if (type === 'info') {
            msgElement.classList.add('text-yellow-400');
        } else {
             msgElement.classList.add('text-gray-400');
        }
    };

    /**
     * Avvia il cronometro per visualizzare il tempo rimanente al cooldown di acquisizione.
     * @param {number} lastAcquisitionTimestamp - Timestamp dell'ultima acquisizione.
     */
    const startAcquisitionCountdown = (lastAcquisitionTimestamp) => {
        const timerElement = document.getElementById('mercato-cooldown-timer');
        if (!timerElement) return;

        if (cooldownInterval) {
            clearInterval(cooldownInterval);
        }

        const updateTimer = () => {
            const currentTime = new Date().getTime();
            const nextAcquisitionTime = lastAcquisitionTimestamp + ACQUISITION_COOLDOWN_MS;
            const remainingTime = nextAcquisitionTime - currentTime;

            if (remainingTime <= 0) {
                clearInterval(cooldownInterval);
                timerElement.classList.remove('text-yellow-300');
                timerElement.classList.add('text-green-400');
                timerElement.innerHTML = `COOLDOWN TERMINATO! Ricarica il Mercato per acquistare.`;

                // Forza il ricaricamento del pannello per aggiornare lo stato e i bottoni
                setTimeout(renderUserMercatoPanel, 1500);
                return;
            }

            const totalSeconds = Math.floor(remainingTime / 1000);
            const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');

            timerElement.innerHTML = `Tempo rimanente: <span class="font-extrabold text-white">${minutes}:${seconds}</span>`;
        };

        updateTimer();
        cooldownInterval = setInterval(updateTimer, 1000);
    };


    /**
     * Funzione principale per inizializzare il pannello Mercato.
     */
    const initializeMercatoPanel = (event) => {
        // Pulisce l'intervallo precedente se esiste
        if (cooldownInterval) clearInterval(cooldownInterval);

        if (!event.detail || !event.detail.teamId) {
            console.error("ID Squadra non fornito per il Mercato.");
            return;
        }

        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;

        // COLLEZIONE MARKET DIVERSA DAL DRAFT
        MARKET_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/marketPlayers`;
        CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

        currentTeamId = event.detail.teamId;

        // Cabla il bottone di ritorno
        if (mercatoBackButton) {
            mercatoBackButton.onclick = () => {
                // Pulisce il timer e il listener quando si esce
                if (cooldownInterval) clearInterval(cooldownInterval);
                stopConfigListener();
                if (window.showScreen && appContent) {
                    window.showScreen(appContent);
                    document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
                }
            };
        }

        // Avvia il listener real-time per lo stato del Mercato
        startConfigListener();

        renderUserMercatoPanel();
    };


    /**
     * Renderizza l'interfaccia di acquisto per l'utente dal Mercato.
     */
    const renderUserMercatoPanel = async () => {

        const { doc, getDoc, collection, getDocs, query, where } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
        const mercatoToolsContainer = document.getElementById('mercato-tools-container');

        // Pulisce il timer all'inizio del rendering
        if (cooldownInterval) clearInterval(cooldownInterval);


        if (!mercatoToolsContainer) return;

        mercatoToolsContainer.innerHTML = `<p class="text-center text-gray-400">Verifica stato Mercato...</p>`;

        try {
            // 1. Carica configurazione e dati squadra
            const [configDoc, teamDoc] = await Promise.all([
                getDoc(configDocRef),
                getDoc(teamDocRef)
            ]);

            // VERIFICA STATO isMarketOpen
            const isMarketOpen = configDoc.exists() ? (configDoc.data().isMarketOpen || false) : false;

            if (!teamDoc.exists()) throw new Error("Dati squadra non trovati.");
            const teamData = teamDoc.data();
            const budgetRimanente = teamData.budget || 0;
            const currentPlayers = teamData.players || [];

            // --- CONTROLLO LIMITE ROSA ---
            const currentRosaCount = getPlayerCountExcludingIcona(currentPlayers);
            const isRosaFull = currentRosaCount >= MAX_ROSA_PLAYERS;

            // --- CONTROLLO COOLDOWN (Usa il timestamp del MERCATO) ---
            const lastAcquisitionTimestamp = teamData[MARKET_COOLDOWN_KEY] || 0;
            const currentTime = new Date().getTime();
            const timeElapsed = currentTime - lastAcquisitionTimestamp;
            const cooldownRemaining = ACQUISITION_COOLDOWN_MS - timeElapsed;
            const isCooldownActive = cooldownRemaining > 0 && lastAcquisitionTimestamp !== 0;


            // --- MESSAGGIO LIMITE ROSA / COOLDOWN ---
            let mainMessage = '';
            let secondaryMessageHtml = '';
            let disableAcquisition = false;

            if (!isMarketOpen) {
                 mainMessage = 'MERCATO CHIUSO.';
                 secondaryMessageHtml = '<p class="text-center text-lg text-gray-300 mt-2">Non e\' possibile acquistare giocatori dal Mercato al momento. Attendi che l\'Admin apra il Mercato.</p>';
                 disableAcquisition = true;
            } else if (isCooldownActive) {
                mainMessage = 'COOLDOWN ATTIVO.';
                secondaryMessageHtml = `<p class="text-center text-lg text-yellow-300 mt-2" id="mercato-cooldown-timer">Caricamento timer...</p>`;
            } else if (isRosaFull) {
                mainMessage = 'ROSA AL COMPLETO.';
                secondaryMessageHtml = `<p class="text-center text-lg text-gray-300 mt-2">Licenzia un giocatore per acquistarne uno nuovo.</p>`;
                disableAcquisition = true;
            }


            // 2. Aggiorna header con budget e rosa
            const budgetDisplay = document.getElementById('mercato-budget-display');
            const rosaDisplay = document.getElementById('mercato-rosa-display');
            const liveStatus = document.getElementById('mercato-live-status');

            if (budgetDisplay) budgetDisplay.textContent = `${budgetRimanente.toLocaleString('it-IT')} CS`;
            if (rosaDisplay) {
                rosaDisplay.textContent = `${currentRosaCount}/${MAX_ROSA_PLAYERS}`;
                rosaDisplay.className = `text-lg font-black ${isRosaFull ? 'text-red-400' : 'text-blue-400'}`;
            }

            // 3. Renderizza il layout base mobile-first
            const showObjectsTab = window.FeatureFlags?.isEnabled('marketObjects');

            mercatoToolsContainer.innerHTML = `
                <p id="user-mercato-message" class="text-center text-red-400 text-sm mb-3 hidden"></p>

                ${showObjectsTab ? `
                <!-- Tab Selector Mobile -->
                <div id="market-tabs" class="flex gap-2 mb-4">
                    <button id="tab-market-players" onclick="window.MercatoObjects?.switchTab('players')"
                            class="flex-1 py-2.5 px-4 text-center font-bold text-sm rounded-xl transition-all ${activeMarketTab === 'players' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-800 text-gray-400 hover:text-white'}">
                        ⚽ Giocatori
                    </button>
                    <button id="tab-market-objects" onclick="window.MercatoObjects?.switchTab('objects')"
                            class="flex-1 py-2.5 px-4 text-center font-bold text-sm rounded-xl transition-all ${activeMarketTab === 'objects' ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-800 text-gray-400 hover:text-white'}">
                        🎒 Oggetti
                    </button>
                </div>
                ` : ''}

                <!-- Container Giocatori -->
                <div id="market-players-container" class="${activeMarketTab !== 'players' && showObjectsTab ? 'hidden' : ''}">
                    <!-- Sezione Giocatori Base Gratuiti -->
                    <div id="base-players-section">
                        ${isMarketOpen ? renderBasePlayersSection(isRosaFull, !isMarketOpen) : ''}
                    </div>

                    <!-- Lista Giocatori Mercato -->
                    <div id="available-market-players-list" class="mt-4 space-y-2">
                        <div class="flex items-center justify-center py-8">
                            <div class="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    </div>
                </div>

                <!-- Container Oggetti -->
                ${showObjectsTab ? `
                <div id="market-objects-container" class="${activeMarketTab !== 'objects' ? 'hidden' : ''} mt-4">
                    <div id="available-market-objects-list" class="space-y-2">
                        <p class="text-gray-500 text-center text-sm py-4">Caricamento oggetti...</p>
                    </div>
                </div>
                ` : ''}
            `;

            const playersListContainer = document.getElementById('available-market-players-list');

            // Aggiorna live status indicator nell'header
            if (liveStatus) {
                if (!isMarketOpen) {
                    liveStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-red-400">Chiuso</span>`;
                    liveStatus.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 border border-red-500/50';
                } else if (isCooldownActive) {
                    liveStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span><span class="text-yellow-400">Cooldown</span>`;
                    liveStatus.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 border border-yellow-500/50';
                } else if (isRosaFull) {
                    liveStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-orange-400">Rosa Piena</span>`;
                    liveStatus.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 border border-orange-500/50';
                } else {
                    liveStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span class="text-green-400">Aperto</span>`;
                    liveStatus.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 border border-green-500/50';
                }
            }

            if (!isMarketOpen || isRosaFull) {
                 // Mercato chiuso o rosa piena - blocca tutto
                 playersListContainer.innerHTML = secondaryMessageHtml;

                 // Carica comunque gli oggetti se il feature flag è attivo
                 if (showObjectsTab) {
                     await loadMarketObjects(budgetRimanente, teamData);
                 }
                 return;
            }

            if (isCooldownActive) {
                 // Cooldown attivo - blocca solo i giocatori del mercato, NON i giocatori base
                 playersListContainer.innerHTML = `<div class="text-center py-6"><p class="text-yellow-300 text-sm" id="mercato-cooldown-timer">Caricamento timer...</p></div>`;

                 // Avvia il cronometro
                 startAcquisitionCountdown(lastAcquisitionTimestamp);

                 // Setup listener per giocatori base (funzionano anche con cooldown!)
                 setupBasePlayersListeners();

                 // Carica comunque gli oggetti se il feature flag è attivo
                 if (showObjectsTab) {
                     await loadMarketObjects(budgetRimanente, teamData);
                 }
                 return;
            }

            // 3. Carica i giocatori disponibili dal Mercato
            const playersCollectionRef = collection(db, MARKET_PLAYERS_COLLECTION_PATH);
            const q = query(playersCollectionRef, where('isDrafted', '==', false));
            const playersSnapshot = await getDocs(q);

            const availablePlayers = playersSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(player => !player.isDrafted);

            // Salva nella cache per i filtri
            availablePlayersCache = availablePlayers;
            currentBudgetCache = budgetRimanente;

            // Calcola sconto stadio (Centro degli Osservatori)
            marketDiscountCache = 0;
            if (window.Stadium && teamData.stadium) {
                marketDiscountCache = window.Stadium.getMarketDiscount(teamData.stadium);
            }

            // Applica filtri iniziali
            const filteredPlayers = filterAndSortMarketPlayers(availablePlayers);

            // 4. Aggiungi container filtri e lista giocatori
            // Rimuovi i container esistenti e ricreali con i filtri
            const existingFiltersContainer = document.getElementById('market-filters-container');
            if (existingFiltersContainer) existingFiltersContainer.remove();
            const existingCountContainer = document.getElementById('market-filtered-count');
            if (existingCountContainer && existingCountContainer.parentElement) {
                existingCountContainer.parentElement.remove();
            }

            // Inserisci filtri prima della lista
            playersListContainer.insertAdjacentHTML('beforebegin', `
                <!-- Container Filtri -->
                <div id="market-filters-container" class="mt-3">
                    ${renderMarketFiltersBar()}
                </div>

                <!-- Conteggio risultati -->
                <div class="flex justify-between items-center mb-2">
                    <p id="market-filtered-count" class="text-xs text-gray-500">${filteredPlayers.length} giocatori</p>
                </div>
            `);

            // Renderizza la lista dei giocatori (Mobile-First Cards)
            const discount = marketDiscountCache;
            if (filteredPlayers.length > 0) {
                 playersListContainer.innerHTML = filteredPlayers.map(player => {
                    const playerLevel = player.level || (player.levelRange ? player.levelRange[0] : 1);
                    const originalCost = player.cost || 0;
                    const discountedCost = discount > 0 ? Math.floor(originalCost * (1 - discount)) : originalCost;
                    const isAffordable = budgetRimanente >= discountedCost;
                    const canBuy = isAffordable && !disableAcquisition;

                    // Role colors
                    const roleColors = {
                        'P': 'bg-yellow-500 text-black',
                        'D': 'bg-green-500 text-white',
                        'C': 'bg-blue-500 text-white',
                        'A': 'bg-red-500 text-white'
                    };
                    const roleClass = roleColors[player.role] || 'bg-gray-500 text-white';

                    // Type styling
                    const typeEmoji = player.type === 'Potenza' ? '💪' : player.type === 'Tecnica' ? '🎯' : player.type === 'Velocita' ? '⚡' : '';
                    const typeColor = player.type === 'Potenza' ? 'text-red-400' :
                                      player.type === 'Tecnica' ? 'text-blue-400' :
                                      player.type === 'Velocita' ? 'text-yellow-400' : 'text-gray-400';

                    // Abilities
                    const abilitiesHtml = player.abilities && player.abilities.length > 0
                        ? `<div class="flex flex-wrap gap-1 mt-1.5">${player.abilities.slice(0,2).map(a => `<span class="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">${a}</span>`).join('')}${player.abilities.length > 2 ? `<span class="text-[10px] text-gray-500">+${player.abilities.length - 2}</span>` : ''}</div>`
                        : '';

                    // Price display
                    let priceHtml = `<span class="text-green-400 font-bold">${discountedCost.toLocaleString('it-IT')}</span>`;
                    if (discount > 0) {
                        priceHtml = `<span class="text-gray-500 line-through text-xs mr-1">${originalCost}</span><span class="text-green-400 font-bold">${discountedCost.toLocaleString('it-IT')}</span>`;
                    }

                    return `
                        <div class="mercato-player-card bg-gray-800/80 rounded-xl p-3 border border-gray-700/50 hover:border-blue-500/50 transition-all active:scale-[0.99]">
                            <div class="flex items-start gap-3">
                                <!-- Role Badge -->
                                <div class="flex-shrink-0">
                                    <span class="${roleClass} text-xs font-black px-2 py-1 rounded-lg">${player.role}</span>
                                </div>

                                <!-- Player Info -->
                                <div class="flex-1 min-w-0">
                                    <p class="text-white font-bold text-sm truncate">${player.name}</p>
                                    <div class="flex items-center gap-2 mt-0.5">
                                        <span class="text-xs text-gray-400">Lv.${playerLevel}</span>
                                        <span class="text-xs ${typeColor}">${typeEmoji} ${player.type || 'N/A'}</span>
                                        <span class="text-xs text-gray-500">${player.age}y</span>
                                    </div>
                                    ${abilitiesHtml}
                                </div>

                                <!-- Price & Buy -->
                                <div class="flex-shrink-0 text-right">
                                    <p class="text-sm">${priceHtml} <span class="text-[10px] text-gray-500">CS</span></p>
                                    <button data-player-id="${player.id}"
                                            data-player-cost="${player.cost}"
                                            data-player-level="${playerLevel}"
                                            data-player-name="${player.name}"
                                            data-player-role="${player.role}"
                                            data-player-age="${player.age}"
                                            data-player-type="${player.type}"
                                            data-action="buy-market"
                                            ${canBuy ? '' : 'disabled'}
                                            class="mt-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${canBuy ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}">
                                        ${canBuy ? 'Acquista' : 'No Budget'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                 }).join('');

                 setupMarketFilterListeners();

                 if (!playersListContainer._hasClickListener) {
                     playersListContainer.addEventListener('click', handleUserMercatoAction);
                     playersListContainer._hasClickListener = true;
                 }
            } else {
                 playersListContainer.innerHTML = '<div class="text-center py-8"><p class="text-gray-500 text-sm">Nessun giocatore trovato</p></div>';
                 setupMarketFilterListeners();
            }

            // Setup event listener per giocatori base
            setupBasePlayersListeners();

            // Carica anche gli oggetti se il feature flag e' attivo
            if (showObjectsTab) {
                await loadMarketObjects(budgetRimanente, teamData);
            }

        } catch (error) {
            console.error("Errore nel caricamento Mercato Utente:", error);
            mercatoToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: ${error.message}</p>`;
        }
    };

    /**
     * Gestisce l'azione di acquisto di un giocatore (Utente) per il Mercato.
     * Nel mercato i giocatori hanno gia un level fisso (non range) e un costo gia calcolato.
     */
    const handleUserMercatoAction = async (event) => {
        const target = event.target;

        if (target.dataset.action === 'buy-market' && !target.disabled) {
            const playerId = target.dataset.playerId;
            const playerCost = parseInt(target.dataset.playerCost);
            const playerLevel = parseInt(target.dataset.playerLevel);

            const playerName = target.dataset.playerName;
            const playerRole = target.dataset.playerRole;
            const playerAge = parseInt(target.dataset.playerAge);
            const playerType = target.dataset.playerType;

            displayMessage(`Acquisto di ${playerName} in corso dal Mercato...`, 'info');
            target.disabled = true;

            try {
                const { doc, getDoc, updateDoc, runTransaction } = firestoreTools;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
                const marketDocRef = doc(db, MARKET_PLAYERS_COLLECTION_PATH, playerId);

                // USA TRANSAZIONE ATOMICA per prevenire acquisti doppi (race condition)
                const result = await runTransaction(db, async (transaction) => {
                    // Leggi entrambi i documenti nella transazione
                    const [teamDoc, playerDoc] = await Promise.all([
                        transaction.get(teamDocRef),
                        transaction.get(marketDocRef)
                    ]);

                    if (!teamDoc.exists()) {
                        throw new Error("Squadra non trovata.");
                    }

                    // VERIFICA ATOMICA: il giocatore deve essere ancora disponibile
                    if (!playerDoc.exists() || playerDoc.data().isDrafted) {
                        throw new Error("Il giocatore non e' disponibile (gia acquistato). Riprova a ricaricare.");
                    }

                    const teamData = teamDoc.data();
                    const playerMarketData = playerDoc.data();
                    const currentBudget = teamData.budget || 0;
                    const currentPlayers = teamData.players || [];

                    // *** SICUREZZA: Usa SEMPRE i dati dal server, MAI dal DOM ***
                    // I valori nel dataset HTML possono essere manipolati da DevTools
                    let serverPlayerCost = playerMarketData.cost || 0;
                    const serverPlayerLevel = playerMarketData.level || 1;

                    // *** SCONTO STADIO: Centro degli Osservatori ***
                    let discountPercent = 0;
                    if (window.Stadium && teamData.stadium) {
                        discountPercent = window.Stadium.getMarketDiscount(teamData.stadium);
                        if (discountPercent > 0) {
                            const discountAmount = Math.floor(serverPlayerCost * discountPercent);
                            serverPlayerCost = serverPlayerCost - discountAmount;
                            console.log(`[Mercato] Sconto stadio applicato: -${Math.round(discountPercent * 100)}% (-${discountAmount} CS)`);
                        }
                    }
                    const serverPlayerName = playerMarketData.name || 'Sconosciuto';
                    const serverPlayerRole = playerMarketData.role || 'C';
                    const serverPlayerAge = playerMarketData.age || 18;
                    const serverPlayerType = playerMarketData.type || 'Potenza';
                    const playerAbilities = playerMarketData.abilities || [];

                    // *** CONTROLLO COOLDOWN MERCATO ***
                    const lastAcquisitionTimestamp = teamData[MARKET_COOLDOWN_KEY] || 0;
                    const currentTime = new Date().getTime();
                    const timeElapsed = currentTime - lastAcquisitionTimestamp;

                    if (lastAcquisitionTimestamp !== 0 && timeElapsed < ACQUISITION_COOLDOWN_MS) {
                        const minutes = Math.ceil((ACQUISITION_COOLDOWN_MS - timeElapsed) / (60 * 1000));
                        throw new Error(`Devi aspettare ${minutes} minuti prima del prossimo acquisto.`);
                    }
                    // --- FINE CONTROLLO COOLDOWN ---

                    // --- CONTROLLO LIMITE ROSA (RE-CHECK) ---
                    const currentRosaCount = getPlayerCountExcludingIcona(currentPlayers);
                    if (currentRosaCount >= MAX_ROSA_PLAYERS) {
                        throw new Error(`Limite massimo di ${MAX_ROSA_PLAYERS} giocatori raggiunto (esclusa Icona).`);
                    }

                    // *** SICUREZZA: Usa il costo dal server per il controllo budget ***
                    if (currentBudget < serverPlayerCost) {
                        throw new Error("Crediti Seri insufficienti.");
                    }

                    // Nel mercato il level e' gia fisso, non serve generarlo
                    const finalLevel = serverPlayerLevel;

                    let playerForSquad = {
                        id: playerId,
                        name: serverPlayerName,
                        role: serverPlayerRole,
                        age: serverPlayerAge,
                        cost: serverPlayerCost,
                        level: finalLevel,
                        type: serverPlayerType,
                        abilities: playerAbilities,
                        isCaptain: false
                    };

                    // Inizializza contratto se sistema contratti attivo
                    if (window.Contracts?.isEnabled()) {
                        playerForSquad = window.Contracts.initializeContract(playerForSquad);
                    }

                    // Genera secretMaxLevel per giocatori normali (sistema livello massimo segreto)
                    if (window.PlayerExp?.isSubjectToSecretMaxLevel(playerForSquad)) {
                        playerForSquad.secretMaxLevel = window.PlayerExp.generateSecretMaxLevel(finalLevel);
                    }

                    const acquisitionTime = new Date().getTime();

                    // AGGIORNAMENTI ATOMICI nella transazione
                    transaction.update(teamDocRef, {
                        budget: currentBudget - serverPlayerCost,
                        players: [...currentPlayers, playerForSquad],
                        [MARKET_COOLDOWN_KEY]: acquisitionTime,
                    });

                    transaction.update(marketDocRef, {
                        isDrafted: true,
                        teamId: currentTeamId,
                    });

                    return { finalLevel, newBudget: currentBudget - serverPlayerCost, playerName: serverPlayerName };
                });

                const { finalLevel, newBudget, playerName: confirmedPlayerName } = result;

                displayMessage(`Acquisto Riuscito! ${confirmedPlayerName} (Lv.${finalLevel}) e' nella tua rosa dal Mercato. Budget: ${newBudget} CS.`, 'success');

                // Ricarica la lista per mostrare che il giocatore non e' piu disponibile
                renderUserMercatoPanel();
                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            } catch (error) {
                console.error("Errore durante l'acquisto dal Mercato:", error);
                displayMessage(`Acquisto Fallito dal Mercato: ${error.message}`, 'error');
                target.disabled = false;
            }
        }
    };


    // ====================================================================
    // SISTEMA MERCATO OGGETTI
    // ====================================================================

    /**
     * Carica e renderizza gli oggetti disponibili nel mercato
     */
    const loadMarketObjects = async (budget, teamData) => {
        const objectsListContainer = document.getElementById('available-market-objects-list');
        if (!objectsListContainer) return;

        try {
            const appId = firestoreTools?.appId;
            if (!appId) throw new Error('AppId non disponibile');

            const { collection, getDocs } = firestoreTools;
            const objectsPath = `artifacts/${appId}/public/data/marketObjects`;
            const objectsRef = collection(db, objectsPath);
            const snapshot = await getDocs(objectsRef);

            const availableObjects = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Filtra solo oggetti disponibili
                if (data.available === true) {
                    availableObjects.push({ id: doc.id, ...data });
                }
            });

            console.log('[Mercato] Oggetti caricati:', availableObjects.length, 'su', snapshot.size, 'totali');

            // Salva nella cache
            availableObjectsCache = availableObjects;

            // Ottieni inventario squadra
            const inventory = teamData?.inventory?.items || [];

            // Renderizza
            renderObjectsMarket(availableObjects, budget, inventory);

        } catch (error) {
            console.error('[Mercato] Errore caricamento oggetti:', error);
            objectsListContainer.innerHTML = `<p class="text-red-400 text-center">Errore: ${error.message}</p>`;
        }
    };

    /**
     * Renderizza la lista degli oggetti nel mercato
     */
    const renderObjectsMarket = (objects, budget, inventory) => {
        const objectsListContainer = document.getElementById('available-market-objects-list');
        if (!objectsListContainer) return;

        let html = '';

        // Box Inventario
        html += `
            <div class="mb-4 p-4 bg-gray-900 rounded-lg border border-emerald-500">
                <h3 class="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
                    <span>📦</span> Il Mio Inventario (${inventory.length} oggetti)
                </h3>
                ${inventory.length > 0 ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        ${inventory.map(item => `
                            <div class="flex justify-between items-center p-2 bg-gray-800 rounded border border-gray-600">
                                <div>
                                    <span class="text-white">${TYPE_ICONS[item.type]} ${item.name}</span>
                                    <span class="text-xs text-gray-400 ml-2">(+${item.bonus} ${PHASE_LABELS[item.phase]})</span>
                                </div>
                                <button onclick="window.MercatoObjects?.sellObject('${item.id}', ${Math.floor(item.purchasePrice / 2)})"
                                        class="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded">
                                    Vendi (${Math.floor(item.purchasePrice / 2)} CS)
                                </button>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-gray-500 text-sm text-center">Nessun oggetto nell\'inventario</p>'}
            </div>
        `;

        // Box Oggetti Disponibili
        html += `
            <div class="p-4 bg-gray-900 rounded-lg border border-blue-500">
                <h3 class="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
                    <span>🛒</span> Oggetti Disponibili (${objects.length})
                </h3>
        `;

        if (objects.length > 0) {
            // Raggruppa per tipo
            const grouped = {};
            OBJECT_TYPES.forEach(type => grouped[type] = []);
            objects.forEach(obj => {
                if (grouped[obj.type]) grouped[obj.type].push(obj);
            });

            for (const type of OBJECT_TYPES) {
                const items = grouped[type];
                if (items.length === 0) continue;

                html += `
                    <div class="mb-4">
                        <h4 class="text-sm font-bold text-gray-300 mb-2">${TYPE_ICONS[type]} ${TYPE_LABELS[type]}</h4>
                        <div class="grid grid-cols-1 gap-2">
                            ${items.map(obj => {
                                const canAfford = budget >= obj.cost;
                                return `
                                    <div class="flex justify-between items-center p-3 bg-gray-800 rounded-lg border ${canAfford ? 'border-emerald-500' : 'border-gray-600'}">
                                        <div>
                                            <p class="text-white font-semibold">${obj.name}</p>
                                            <p class="text-xs text-gray-400">+${obj.bonus} in ${PHASE_LABELS[obj.phase]} (${APPLY_LABELS[obj.applyTo]})</p>
                                        </div>
                                        <button onclick="window.MercatoObjects?.buyObject('${obj.id}')"
                                                ${canAfford ? '' : 'disabled'}
                                                class="text-sm px-4 py-2 rounded-lg font-bold transition ${canAfford ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}">
                                            ${canAfford ? `Acquista (${obj.cost} CS)` : `${obj.cost} CS`}
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        } else {
            html += '<p class="text-gray-500 text-center">Nessun oggetto disponibile nel mercato</p>';
        }

        html += '</div>';
        objectsListContainer.innerHTML = html;
    };

    /**
     * Acquista un oggetto
     */
    const buyObject = async (objectId) => {
        try {
            const appId = firestoreTools?.appId;
            if (!appId) throw new Error('AppId non disponibile');

            const { doc, getDoc, updateDoc, runTransaction, Timestamp } = firestoreTools;
            const objectsPath = `artifacts/${appId}/public/data/marketObjects`;
            const objectDocRef = doc(db, objectsPath, objectId);
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            await runTransaction(db, async (transaction) => {
                const [objectDoc, teamDoc] = await Promise.all([
                    transaction.get(objectDocRef),
                    transaction.get(teamDocRef)
                ]);

                if (!objectDoc.exists() || !objectDoc.data().available) {
                    throw new Error('Oggetto non disponibile');
                }

                const objectData = objectDoc.data();
                const teamData = teamDoc.data();

                if (teamData.budget < objectData.cost) {
                    throw new Error('Budget insufficiente');
                }

                // Aggiorna oggetto
                transaction.update(objectDocRef, {
                    available: false,
                    ownerId: currentTeamId
                });

                // Aggiorna squadra
                const inventory = teamData.inventory || { items: [] };
                const newItem = {
                    id: objectId,
                    name: objectData.name,
                    type: objectData.type,
                    bonus: objectData.bonus,
                    phase: objectData.phase,
                    applyTo: objectData.applyTo,
                    purchasedAt: Timestamp.now(),
                    purchasePrice: objectData.cost,
                    equippedTo: null
                };
                inventory.items.push(newItem);

                transaction.update(teamDocRef, {
                    budget: teamData.budget - objectData.cost,
                    inventory: inventory
                });
            });

            displayMessage(`Oggetto acquistato con successo!`, 'success');
            renderUserMercatoPanel();
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

        } catch (error) {
            console.error('[Mercato] Errore acquisto oggetto:', error);
            displayMessage(`Errore: ${error.message}`, 'error');
        }
    };

    /**
     * Vende un oggetto dall'inventario
     */
    const sellObject = async (objectId, refundAmount) => {
        if (!confirm(`Sei sicuro di voler vendere questo oggetto per ${refundAmount} CS?`)) return;

        try {
            const appId = firestoreTools?.appId;
            if (!appId) throw new Error('AppId non disponibile');

            const { doc, getDoc, updateDoc, runTransaction, Timestamp } = firestoreTools;
            const objectsPath = `artifacts/${appId}/public/data/marketObjects`;
            const objectDocRef = doc(db, objectsPath, objectId);
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            await runTransaction(db, async (transaction) => {
                const [objectDoc, teamDoc] = await Promise.all([
                    transaction.get(objectDocRef),
                    transaction.get(teamDocRef)
                ]);

                const teamData = teamDoc.data();
                const inventory = teamData.inventory || { items: [] };

                // Trova e rimuovi l'oggetto dall'inventario
                const itemIndex = inventory.items.findIndex(i => i.id === objectId);
                if (itemIndex === -1) {
                    throw new Error('Oggetto non trovato nell\'inventario');
                }

                const item = inventory.items[itemIndex];

                // Verifica se e' equipaggiato a un giocatore
                if (item.equippedTo) {
                    // Rimuovi dall'equipaggiamento del giocatore
                    const players = teamData.players || [];
                    const updatedPlayers = players.map(p => {
                        if (p.id === item.equippedTo && p.equipment) {
                            const newEquipment = { ...p.equipment };
                            if (newEquipment[item.type]?.id === objectId) {
                                newEquipment[item.type] = null;
                            }
                            return { ...p, equipment: newEquipment };
                        }
                        return p;
                    });
                    transaction.update(teamDocRef, { players: updatedPlayers });
                }

                // Rimuovi dall'inventario
                inventory.items.splice(itemIndex, 1);

                // Rimetti nel mercato a meta prezzo originale
                if (objectDoc.exists()) {
                    const objData = objectDoc.data();
                    const newCost = Math.floor(objData.originalCost / 2);
                    transaction.update(objectDocRef, {
                        available: true,
                        ownerId: null,
                        cost: newCost
                    });
                }

                // Aggiorna squadra
                transaction.update(teamDocRef, {
                    budget: teamData.budget + refundAmount,
                    inventory: inventory
                });
            });

            displayMessage(`Oggetto venduto per ${refundAmount} CS!`, 'success');
            renderUserMercatoPanel();
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

        } catch (error) {
            console.error('[Mercato] Errore vendita oggetto:', error);
            displayMessage(`Errore: ${error.message}`, 'error');
        }
    };

    /**
     * Switch tra tab giocatori e oggetti
     */
    const switchMarketTab = (tab) => {
        activeMarketTab = tab;

        const playersContainer = document.getElementById('market-players-container');
        const objectsContainer = document.getElementById('market-objects-container');
        const tabPlayers = document.getElementById('tab-market-players');
        const tabObjects = document.getElementById('tab-market-objects');

        if (tab === 'players') {
            playersContainer?.classList.remove('hidden');
            objectsContainer?.classList.add('hidden');
            tabPlayers?.classList.add('bg-blue-600', 'text-white', 'border-b-2', 'border-blue-400');
            tabPlayers?.classList.remove('bg-gray-800', 'text-gray-400');
            tabObjects?.classList.remove('bg-emerald-600', 'text-white', 'border-b-2', 'border-emerald-400');
            tabObjects?.classList.add('bg-gray-800', 'text-gray-400');
        } else {
            playersContainer?.classList.add('hidden');
            objectsContainer?.classList.remove('hidden');
            tabObjects?.classList.add('bg-emerald-600', 'text-white', 'border-b-2', 'border-emerald-400');
            tabObjects?.classList.remove('bg-gray-800', 'text-gray-400');
            tabPlayers?.classList.remove('bg-blue-600', 'text-white', 'border-b-2', 'border-blue-400');
            tabPlayers?.classList.add('bg-gray-800', 'text-gray-400');
        }
    };

    // Esponi funzioni globalmente per onclick
    window.MercatoObjects = {
        switchTab: switchMarketTab,
        buyObject: buyObject,
        sellObject: sellObject
    };

    // GESTIONE NAVIGAZIONE
    // Il bottone di ritorno e' gestito in initializeMercatoPanel



    // Ascolta l'evento lanciato da interfaccia.js
    document.addEventListener('mercatoPanelLoaded', initializeMercatoPanel);

});
