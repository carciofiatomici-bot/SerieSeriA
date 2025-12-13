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
     * Genera l'HTML della barra filtri per il Mercato
     */
    const renderMarketFiltersBar = () => {
        return `
            <div class="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-sm font-bold text-blue-400 flex items-center gap-2">
                        <span>🔍</span> Filtri
                    </h4>
                    <button id="btn-reset-market-filters" class="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition">
                        Resetta
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- Filtro Ruolo -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Ruolo</label>
                        <div class="flex gap-1 flex-wrap">
                            <button class="filter-market-role-btn px-2 py-1 text-xs rounded ${marketFilters.role === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="all">Tutti</button>
                            <button class="filter-market-role-btn px-2 py-1 text-xs rounded ${marketFilters.role === 'P' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="P">P</button>
                            <button class="filter-market-role-btn px-2 py-1 text-xs rounded ${marketFilters.role === 'D' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="D">D</button>
                            <button class="filter-market-role-btn px-2 py-1 text-xs rounded ${marketFilters.role === 'C' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="C">C</button>
                            <button class="filter-market-role-btn px-2 py-1 text-xs rounded ${marketFilters.role === 'A' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-role="A">A</button>
                        </div>
                    </div>

                    <!-- Filtro Tipo -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Tipo</label>
                        <div class="flex gap-1 flex-wrap">
                            <button class="filter-market-type-btn px-2 py-1 text-xs rounded ${marketFilters.type === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-type="all">Tutti</button>
                            <button class="filter-market-type-btn px-2 py-1 text-xs rounded ${marketFilters.type === 'Potenza' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-type="Potenza">Potenza</button>
                            <button class="filter-market-type-btn px-2 py-1 text-xs rounded ${marketFilters.type === 'Tecnica' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-type="Tecnica">Tecnica</button>
                            <button class="filter-market-type-btn px-2 py-1 text-xs rounded ${marketFilters.type === 'Velocita' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-type="Velocita">Velocita</button>
                        </div>
                    </div>

                    <!-- Filtro Costo -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Costo (CS)</label>
                        <div class="flex gap-2 items-center">
                            <input type="number" id="filter-market-min-cost" placeholder="Min" value="${marketFilters.minCost || ''}"
                                   class="w-20 px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
                            <span class="text-gray-500">-</span>
                            <input type="number" id="filter-market-max-cost" placeholder="Max" value="${marketFilters.maxCost || ''}"
                                   class="w-20 px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
                        </div>
                    </div>

                    <!-- Ordinamento -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Ordina per</label>
                        <select id="filter-market-sort" class="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
                            <option value="cost_asc" ${marketFilters.sortBy === 'cost_asc' ? 'selected' : ''}>Costo (crescente)</option>
                            <option value="cost_desc" ${marketFilters.sortBy === 'cost_desc' ? 'selected' : ''}>Costo (decrescente)</option>
                            <option value="level_desc" ${marketFilters.sortBy === 'level_desc' ? 'selected' : ''}>Livello (decrescente)</option>
                            <option value="name" ${marketFilters.sortBy === 'name' ? 'selected' : ''}>Nome (A-Z)</option>
                        </select>
                    </div>
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

        listContainer.innerHTML = filteredPlayers.length > 0
            ? filteredPlayers.map(player => {
                const playerLevel = player.level || (player.levelRange ? player.levelRange[0] : 1);
                const isAffordable = budgetRimanente >= player.cost;
                const canBuy = isAffordable;

                const buttonClass = canBuy ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-gray-500 text-gray-300 cursor-not-allowed';
                let buttonText = isAffordable ? `Acquista (${player.cost} CS)` : `Costo ${player.cost} CS (No Budget)`;

                // Mostra abilita se presenti
                const abilitiesText = player.abilities && player.abilities.length > 0
                    ? `<p class="text-xs text-purple-300 mt-1">Abilita: ${player.abilities.join(', ')}</p>`
                    : '';

                // Colore tipo
                const typeColor = player.type === 'Potenza' ? 'text-red-400' :
                                  player.type === 'Tecnica' ? 'text-blue-400' :
                                  player.type === 'Velocita' ? 'text-green-400' : 'text-gray-400';

                return `
                    <div class="flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-700 rounded-lg border border-blue-500">
                        <div>
                            <p class="text-white font-semibold">${player.name} (${player.role}, ${player.age} anni) <span class="${typeColor}">(${player.type || 'N/A'})</span></p>
                            <p class="text-sm text-blue-300">Livello: ${playerLevel}</p>
                            ${abilitiesText}
                        </div>
                        <button data-player-id="${player.id}"
                                data-player-cost="${player.cost}"
                                data-player-level="${playerLevel}"
                                data-player-name="${player.name}"
                                data-player-role="${player.role}"
                                data-player-age="${player.age}"
                                data-player-type="${player.type}"
                                data-action="buy-market"
                                ${canBuy ? '' : 'disabled'}
                                class="text-sm px-4 py-2 rounded-lg font-bold transition duration-150 mt-2 sm:mt-0 ${buttonClass}">
                            ${buttonText}
                        </button>
                    </div>
                `;
            }).join('')
            : '<p class="text-center text-gray-400 font-semibold">Nessun calciatore trovato con i filtri selezionati.</p>';

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


            // 2. Renderizza il layout base
            const showObjectsTab = window.FeatureFlags?.isEnabled('marketObjects');

            mercatoToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-800 rounded-lg border-2 border-blue-500 shadow-xl space-y-4">
                    <p class="text-center text-2xl font-extrabold text-white">
                        Budget: <span class="text-yellow-400">${budgetRimanente} CS</span>
                    </p>
                    <p class="text-center text-lg font-bold text-gray-300">
                        Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                    </p>
                    <div id="mercato-status-box" class="p-4 rounded-lg text-center font-extrabold text-xl"></div>
                    <p id="user-mercato-message" class="text-center text-red-400"></p>
                </div>

                ${showObjectsTab ? `
                <!-- Tab Selector -->
                <div id="market-tabs" class="mt-4 flex border-b border-gray-600">
                    <button id="tab-market-players" onclick="window.MercatoObjects?.switchTab('players')"
                            class="flex-1 py-3 px-4 text-center font-bold ${activeMarketTab === 'players' ? 'bg-blue-600 text-white border-b-2 border-blue-400' : 'bg-gray-800 text-gray-400 hover:text-white'}">
                        ⚽ Giocatori
                    </button>
                    <button id="tab-market-objects" onclick="window.MercatoObjects?.switchTab('objects')"
                            class="flex-1 py-3 px-4 text-center font-bold ${activeMarketTab === 'objects' ? 'bg-emerald-600 text-white border-b-2 border-emerald-400' : 'bg-gray-800 text-gray-400 hover:text-white'}">
                        🎒 Oggetti
                    </button>
                </div>
                ` : ''}

                <!-- Container Giocatori -->
                <div id="market-players-container" class="${activeMarketTab !== 'players' && showObjectsTab ? 'hidden' : ''}">
                    <div id="available-market-players-list" class="mt-6 space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-800 rounded-lg">
                        <p class="text-gray-500 text-center">Caricamento giocatori...</p>
                    </div>
                </div>

                <!-- Container Oggetti (solo se feature flag attivo) -->
                ${showObjectsTab ? `
                <div id="market-objects-container" class="${activeMarketTab !== 'objects' ? 'hidden' : ''} mt-6">
                    <div id="available-market-objects-list" class="space-y-3 p-4 bg-gray-800 rounded-lg">
                        <p class="text-gray-500 text-center">Caricamento oggetti...</p>
                    </div>
                </div>
                ` : ''}
            `;

            const statusBox = document.getElementById('mercato-status-box');
            const playersListContainer = document.getElementById('available-market-players-list');

            if (!isMarketOpen || isCooldownActive || isRosaFull) {

                 statusBox.textContent = mainMessage;
                 statusBox.classList.add('border-red-500', 'bg-red-900', 'text-red-400');
                 playersListContainer.innerHTML = secondaryMessageHtml;

                 if (isCooldownActive) {
                     // Avvia il cronometro
                     startAcquisitionCountdown(lastAcquisitionTimestamp);
                 }

                 // Carica comunque gli oggetti se il feature flag è attivo
                 if (showObjectsTab) {
                     await loadMarketObjects(budgetRimanente, teamData);
                 }
                 return;
            }

            statusBox.textContent = 'MERCATO APERTO!';
            statusBox.classList.add('border-green-500', 'bg-green-900', 'text-green-400');


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
                <div id="market-filters-container" class="mt-4">
                    ${renderMarketFiltersBar()}
                </div>

                <!-- Conteggio risultati -->
                <div class="flex justify-between items-center mt-2 px-2">
                    <p id="market-filtered-count" class="text-sm text-gray-400">${filteredPlayers.length} giocatori trovati</p>
                </div>
            `);

            // Renderizza la lista dei giocatori
            if (filteredPlayers.length > 0) {
                 playersListContainer.innerHTML = filteredPlayers.map(player => {
                    // Nel mercato i giocatori hanno level fisso (non range)
                    const playerLevel = player.level || (player.levelRange ? player.levelRange[0] : 1);
                    const isAffordable = budgetRimanente >= player.cost;
                    const canBuy = isAffordable && !disableAcquisition;

                    const buttonClass = canBuy ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-gray-500 text-gray-300 cursor-not-allowed';
                    let buttonText;

                    if (!isAffordable) {
                        buttonText = `Costo ${player.cost} CS (No Budget)`;
                    } else {
                         buttonText = `Acquista (${player.cost} CS)`;
                    }

                    // Mostra abilita se presenti
                    const abilitiesText = player.abilities && player.abilities.length > 0
                        ? `<p class="text-xs text-purple-300 mt-1">Abilita: ${player.abilities.join(', ')}</p>`
                        : '';

                    // Colore tipo
                    const typeColor = player.type === 'Potenza' ? 'text-red-400' :
                                      player.type === 'Tecnica' ? 'text-blue-400' :
                                      player.type === 'Velocita' ? 'text-green-400' : 'text-gray-400';

                    return `
                        <div class="flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-700 rounded-lg border border-blue-500">
                            <div>
                                <p class="text-white font-semibold">${player.name} (${player.role}, ${player.age} anni) <span class="${typeColor}">(${player.type || 'N/A'})</span></p>
                                <p class="text-sm text-blue-300">Livello: ${playerLevel}</p>
                                ${abilitiesText}
                            </div>
                            <button data-player-id="${player.id}"
                                    data-player-cost="${player.cost}"
                                    data-player-level="${playerLevel}"
                                    data-player-name="${player.name}"
                                    data-player-role="${player.role}"
                                    data-player-age="${player.age}"
                                    data-player-type="${player.type}"
                                    data-action="buy-market"
                                    ${canBuy ? '' : 'disabled'}
                                    class="text-sm px-4 py-2 rounded-lg font-bold transition duration-150 mt-2 sm:mt-0 ${buttonClass}">
                                ${buttonText}
                            </button>
                        </div>
                    `;
                 }).join('');

                 // Setup listeners filtri
                 setupMarketFilterListeners();

                 // Event listener per l'acquisto
                 if (!playersListContainer._hasClickListener) {
                     playersListContainer.addEventListener('click', handleUserMercatoAction);
                     playersListContainer._hasClickListener = true;
                 }
            } else {
                 playersListContainer.innerHTML = '<p class="text-center text-gray-400 font-semibold">Nessun calciatore trovato con i filtri selezionati.</p>';
                 // Setup listeners filtri comunque
                 setupMarketFilterListeners();
            }

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

                    // Recupera le abilita del giocatore dal mercato
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

                    if (currentBudget < playerCost) {
                        throw new Error("Crediti Seri insufficienti.");
                    }

                    // Nel mercato il level e' gia fisso, non serve generarlo
                    const finalLevel = playerLevel;

                    const playerForSquad = {
                        id: playerId,
                        name: playerName,
                        role: playerRole,
                        age: playerAge,
                        cost: playerCost,
                        level: finalLevel,
                        type: playerType,
                        abilities: playerAbilities,
                        isCaptain: false
                    };

                    const acquisitionTime = new Date().getTime();

                    // AGGIORNAMENTI ATOMICI nella transazione
                    transaction.update(teamDocRef, {
                        budget: currentBudget - playerCost,
                        players: [...currentPlayers, playerForSquad],
                        [MARKET_COOLDOWN_KEY]: acquisitionTime,
                    });

                    transaction.update(marketDocRef, {
                        isDrafted: true,
                        teamId: currentTeamId,
                    });

                    return { finalLevel, newBudget: currentBudget - playerCost };
                });

                const { finalLevel, newBudget } = result;

                displayMessage(`Acquisto Riuscito! ${playerName} (Lv.${finalLevel}) e' nella tua rosa dal Mercato. Budget: ${newBudget} CS.`, 'success');

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
