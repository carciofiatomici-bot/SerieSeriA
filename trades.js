//
// ====================================================================
// TRADES.JS - Sistema Scambi Giocatori Completo
// ====================================================================
// Flusso: Ricevuti -> Seleziona Squadra -> Rosa Avversaria ->
//         Rosa Propria -> Offerta CS -> Conferma
//

window.Trades = {
    // UI Elements
    panel: null,
    isOpen: false,

    // Stato corrente del flusso
    currentStep: 'received', // received, selectTeam, targetRoster, myRoster, confirmCS
    selectedTargetTeam: null,
    selectedTargetPlayer: null,
    selectedOfferPlayer: null,
    offeredCS: 0,

    // Dati scambi
    trades: [],

    // Cache squadre e rose
    teamsCache: [],
    targetRosterCache: [],

    /**
     * Inizializza il sistema scambi
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('trades')) {
            console.log('[Trades] Sistema Scambi disabilitato');
            return;
        }

        this.createPanel();
        this.setupListeners();
        console.log('[Trades] Sistema Scambi inizializzato');
    },

    /**
     * Crea il pannello scambi
     */
    createPanel() {
        const existing = document.getElementById('trades-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'trades-panel';
        this.panel.className = 'fixed inset-0 z-[9999] bg-black bg-opacity-80 flex items-center justify-center hidden';

        this.panel.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl border-2 border-purple-600 w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
                <!-- Header -->
                <div id="trades-header" class="p-4 bg-gray-700 border-b border-gray-600 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <button id="trades-back-btn" class="text-gray-400 hover:text-white text-xl hidden">&larr;</button>
                        <h2 id="trades-title" class="text-xl font-bold text-white flex items-center gap-2">
                            <span>🔄</span>
                            <span>Scambi Ricevuti</span>
                        </h2>
                    </div>
                    <button id="close-trades-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <!-- Breadcrumb -->
                <div id="trades-breadcrumb" class="px-4 py-2 bg-gray-750 border-b border-gray-600 text-sm text-gray-400 hidden">
                    <span class="text-purple-400">Ricevuti</span>
                </div>

                <!-- Content -->
                <div id="trades-content" class="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <!-- Contenuto dinamico -->
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);

        // Event listeners
        document.getElementById('close-trades-panel').addEventListener('click', () => this.close());
        document.getElementById('trades-back-btn').addEventListener('click', () => this.goBack());
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) this.close();
        });
    },

    /**
     * Apri pannello
     */
    async openPanel() {
        if (!window.FeatureFlags?.isEnabled('trades')) {
            if (window.Toast) window.Toast.info('Sistema scambi non disponibile');
            return;
        }

        if (!this.panel) this.createPanel();
        this.panel.classList.remove('hidden');
        this.isOpen = true;

        // Reset stato
        this.currentStep = 'received';
        this.selectedTargetTeam = null;
        this.selectedTargetPlayer = null;
        this.selectedOfferPlayer = null;
        this.offeredCS = 0;

        await this.loadTrades();
        this.renderStep();
    },

    /**
     * Chiudi pannello
     */
    close() {
        if (this.panel) {
            this.panel.classList.add('hidden');
        }
        this.isOpen = false;
    },

    /**
     * Torna indietro
     */
    goBack() {
        switch (this.currentStep) {
            case 'selectTeam':
                this.currentStep = 'received';
                break;
            case 'targetRoster':
                this.currentStep = 'selectTeam';
                this.selectedTargetTeam = null;
                break;
            case 'myRoster':
                this.currentStep = 'targetRoster';
                this.selectedTargetPlayer = null;
                break;
            case 'confirmCS':
                this.currentStep = 'myRoster';
                this.selectedOfferPlayer = null;
                break;
        }
        this.renderStep();
    },

    /**
     * Renderizza lo step corrente
     */
    renderStep() {
        const content = document.getElementById('trades-content');
        const title = document.getElementById('trades-title');
        const backBtn = document.getElementById('trades-back-btn');
        const breadcrumb = document.getElementById('trades-breadcrumb');

        if (!content) return;

        // Aggiorna UI header
        backBtn.classList.toggle('hidden', this.currentStep === 'received');
        breadcrumb.classList.toggle('hidden', this.currentStep === 'received');

        switch (this.currentStep) {
            case 'received':
                title.innerHTML = '<span>🔄</span><span>Scambi Ricevuti</span>';
                this.renderReceivedTrades(content);
                break;
            case 'selectTeam':
                title.innerHTML = '<span>👥</span><span>Seleziona Squadra</span>';
                breadcrumb.innerHTML = '<span class="text-gray-500">Ricevuti</span> → <span class="text-purple-400">Seleziona Squadra</span>';
                this.renderTeamSelection(content);
                break;
            case 'targetRoster':
                title.innerHTML = `<span>⚽</span><span>Rosa di ${this.selectedTargetTeam?.teamName || 'Squadra'}</span>`;
                breadcrumb.innerHTML = '<span class="text-gray-500">Ricevuti → Squadra</span> → <span class="text-purple-400">Seleziona Giocatore</span>';
                this.renderTargetRoster(content);
                break;
            case 'myRoster':
                title.innerHTML = '<span>🎁</span><span>Scegli Giocatore da Offrire</span>';
                breadcrumb.innerHTML = '<span class="text-gray-500">Ricevuti → Squadra → Giocatore</span> → <span class="text-purple-400">Tua Offerta</span>';
                this.renderMyRoster(content);
                break;
            case 'confirmCS':
                title.innerHTML = '<span>💰</span><span>Aggiungi Crediti Seri</span>';
                breadcrumb.innerHTML = '<span class="text-gray-500">Ricevuti → Squadra → Giocatore → Offerta</span> → <span class="text-purple-400">Crediti</span>';
                this.renderCSConfirmation(content);
                break;
        }
    },

    // ========================================
    // STEP 1: SCAMBI RICEVUTI
    // ========================================

    /**
     * Carica scambi da Firestore
     */
    async loadTrades() {
        if (!window.db || !window.firestoreTools) {
            this.trades = [];
            return;
        }

        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (!myTeamId) return;

        try {
            const { collection, query, where, getDocs, orderBy } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const tradesPath = `artifacts/${appId}/public/data/trades`;

            // Query per scambi ricevuti (pending)
            const q = query(
                collection(window.db, tradesPath),
                where('toTeamId', '==', myTeamId),
                where('status', '==', 'pending')
            );

            const snapshot = await getDocs(q);
            this.trades = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toMillis?.() || Date.now()
            }));

            // Ordina per timestamp decrescente
            this.trades.sort((a, b) => b.timestamp - a.timestamp);

        } catch (error) {
            console.error('[Trades] Errore caricamento:', error);
            this.trades = [];
        }
    },

    /**
     * Renderizza scambi ricevuti + bottone Proponi
     */
    renderReceivedTrades(container) {
        const myTeamId = window.InterfacciaCore?.currentTeamId;

        let html = `
            <!-- Bottone Proponi Scambio -->
            <div class="mb-6">
                <button id="btn-propose-trade" class="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 transition transform hover:scale-[1.02]">
                    <span class="text-2xl">➕</span>
                    <span>Proponi Scambio</span>
                </button>
            </div>

            <h3 class="text-lg font-bold text-gray-300 mb-4 border-b border-gray-600 pb-2">📥 Proposte Ricevute</h3>
        `;

        if (this.trades.length === 0) {
            html += `
                <div class="text-center py-12">
                    <div class="text-5xl mb-4">📭</div>
                    <p class="text-gray-400">Nessuna proposta di scambio ricevuta</p>
                    <p class="text-gray-500 text-sm mt-2">Quando qualcuno ti proporra uno scambio, apparira qui</p>
                </div>
            `;
        } else {
            html += this.trades.map(trade => this.renderTradeCard(trade)).join('');
        }

        container.innerHTML = html;

        // Event listener bottone proponi
        document.getElementById('btn-propose-trade').addEventListener('click', () => {
            this.currentStep = 'selectTeam';
            this.renderStep();
        });

        // Event listeners accetta/rifiuta
        container.querySelectorAll('[data-accept]').forEach(btn => {
            btn.addEventListener('click', () => this.acceptTrade(btn.dataset.accept));
        });
        container.querySelectorAll('[data-reject]').forEach(btn => {
            btn.addEventListener('click', () => this.rejectTrade(btn.dataset.reject));
        });
    },

    /**
     * Renderizza card singolo scambio
     */
    renderTradeCard(trade) {
        const offeredPlayer = trade.offeredPlayer || {};
        const requestedPlayer = trade.requestedPlayer || {};

        return `
            <div class="bg-gray-700 rounded-xl p-4 mb-4 border-l-4 border-purple-500">
                <!-- Header -->
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <span class="text-gray-400 text-sm">Da:</span>
                        <span class="text-white font-semibold ml-2">${window.escapeHtml(trade.fromTeamName)}</span>
                    </div>
                    <span class="text-gray-500 text-xs">${this.formatDate(trade.timestamp)}</span>
                </div>

                <!-- Contenuto scambio -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <!-- Giocatore offerto (ricevi) -->
                    <div class="bg-gray-800 rounded-lg p-3 border border-green-600">
                        <p class="text-xs text-green-400 font-semibold mb-2">📥 Ricevi</p>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-1 bg-green-700 rounded text-xs text-white">${offeredPlayer.role || '?'}</span>
                            <div>
                                <p class="text-white font-medium">${window.escapeHtml(offeredPlayer.name || 'Giocatore')}</p>
                                <p class="text-gray-400 text-xs">Lv.${offeredPlayer.level || '?'} - ${offeredPlayer.type || '?'}</p>
                            </div>
                        </div>
                        ${trade.offeredCS > 0 ? `<p class="text-yellow-400 text-sm mt-2">+${trade.offeredCS} CS</p>` : ''}
                    </div>

                    <!-- Giocatore richiesto (cedi) -->
                    <div class="bg-gray-800 rounded-lg p-3 border border-red-600">
                        <p class="text-xs text-red-400 font-semibold mb-2">📤 Cedi</p>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-1 bg-red-700 rounded text-xs text-white">${requestedPlayer.role || '?'}</span>
                            <div>
                                <p class="text-white font-medium">${window.escapeHtml(requestedPlayer.name || 'Giocatore')}</p>
                                <p class="text-gray-400 text-xs">Lv.${requestedPlayer.level || '?'} - ${requestedPlayer.type || '?'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Azioni -->
                <div class="flex gap-2 justify-end">
                    <button data-reject="${trade.id}" class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-semibold transition">
                        ❌ Rifiuta
                    </button>
                    <button data-accept="${trade.id}" class="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-semibold transition">
                        ✅ Accetta
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================
    // STEP 2: SELEZIONE SQUADRA
    // ========================================

    /**
     * Renderizza lista squadre
     */
    async renderTeamSelection(container) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin text-4xl mb-4">⚽</div>
                <p class="text-gray-400">Caricamento squadre...</p>
            </div>
        `;

        await this.loadTeams();

        if (this.teamsCache.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-5xl mb-4">😢</div>
                    <p class="text-gray-400">Nessuna altra squadra disponibile</p>
                </div>
            `;
            return;
        }

        let html = `
            <p class="text-gray-400 mb-4">Seleziona la squadra con cui vuoi proporre uno scambio:</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        `;

        for (const team of this.teamsCache) {
            const logoUrl = team.logoUrl || window.InterfacciaConstants?.DEFAULT_LOGO_URL || '';
            html += `
                <button class="team-select-btn bg-gray-700 hover:bg-gray-600 rounded-xl p-4 flex items-center gap-4 transition border-2 border-transparent hover:border-purple-500"
                        data-team-id="${team.id}">
                    <img src="${window.escapeHtml(logoUrl)}" alt="" class="w-12 h-12 rounded-full border-2 border-gray-500 object-cover">
                    <div class="text-left">
                        <p class="text-white font-semibold">${window.escapeHtml(team.teamName)}</p>
                        <p class="text-gray-400 text-sm">${team.playersCount || 0} giocatori</p>
                    </div>
                </button>
            `;
        }

        html += '</div>';
        container.innerHTML = html;

        // Event listeners
        container.querySelectorAll('.team-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const teamId = btn.dataset.teamId;
                this.selectedTargetTeam = this.teamsCache.find(t => t.id === teamId);
                this.currentStep = 'targetRoster';
                this.renderStep();
            });
        });
    },

    /**
     * Carica lista squadre da Firestore
     */
    async loadTeams() {
        if (!window.db || !window.firestoreTools) {
            this.teamsCache = [];
            return;
        }

        const myTeamId = window.InterfacciaCore?.currentTeamId;

        try {
            const { collection, getDocs } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamsPath = `artifacts/${appId}/public/data/teams`;

            const snapshot = await getDocs(collection(window.db, teamsPath));
            this.teamsCache = [];

            snapshot.docs.forEach(doc => {
                // Escludi la propria squadra e l'account admin puro
                if (doc.id !== myTeamId) {
                    const data = doc.data();
                    // Escludi solo l'account admin puro "serieseria"
                    // Le squadre con isAdmin=true sono squadre normali con accesso admin
                    if (data.teamName?.toLowerCase() !== 'serieseria') {
                        this.teamsCache.push({
                            id: doc.id,
                            teamName: data.teamName || doc.id,
                            logoUrl: data.logoUrl,
                            playersCount: (data.players || []).length,
                            players: data.players || []
                        });
                    }
                }
            });

            // Ordina alfabeticamente
            this.teamsCache.sort((a, b) => a.teamName.localeCompare(b.teamName));

        } catch (error) {
            console.error('[Trades] Errore caricamento squadre:', error);
            this.teamsCache = [];
        }
    },

    // ========================================
    // STEP 3: ROSA SQUADRA TARGET
    // ========================================

    /**
     * Renderizza rosa della squadra selezionata
     */
    renderTargetRoster(container) {
        if (!this.selectedTargetTeam) {
            this.currentStep = 'selectTeam';
            this.renderStep();
            return;
        }

        const players = this.selectedTargetTeam.players || [];

        if (players.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-5xl mb-4">👻</div>
                    <p class="text-gray-400">Questa squadra non ha giocatori</p>
                </div>
            `;
            return;
        }

        // Escludi l'Icona dallo scambio
        const tradablePlayers = players.filter(p => !(p.abilities && p.abilities.includes('Icona')));

        let html = `
            <p class="text-gray-400 mb-4">Seleziona il giocatore che vuoi richiedere:</p>
            <div class="space-y-2">
        `;

        for (const player of tradablePlayers) {
            const abilitiesStr = (player.abilities || []).join(', ') || 'Nessuna';
            html += `
                <div class="bg-gray-700 rounded-lg p-3 flex items-center justify-between hover:bg-gray-650 transition">
                    <div class="flex items-center gap-3">
                        <span class="px-2 py-1 bg-${this.getRoleColor(player.role)}-600 rounded text-xs text-white font-bold">${player.role || '?'}</span>
                        <div>
                            <p class="text-white font-medium">${window.escapeHtml(player.name)}</p>
                            <p class="text-gray-400 text-xs">Lv.${player.level || 1} - ${player.type || 'N/A'}</p>
                            <p class="text-purple-400 text-xs">${abilitiesStr}</p>
                        </div>
                    </div>
                    <button class="request-player-btn px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-semibold transition"
                            data-player-id="${player.id}">
                        Richiedi
                    </button>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;

        // Event listeners
        container.querySelectorAll('.request-player-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const playerId = btn.dataset.playerId;
                this.selectedTargetPlayer = tradablePlayers.find(p => p.id === playerId);
                this.currentStep = 'myRoster';
                this.renderStep();
            });
        });
    },

    // ========================================
    // STEP 4: LA MIA ROSA (OFFERTA)
    // ========================================

    /**
     * Renderizza la propria rosa per selezionare l'offerta
     */
    renderMyRoster(container) {
        const currentTeamData = window.InterfacciaCore?.currentTeamData;
        const myPlayers = currentTeamData?.players || [];

        if (myPlayers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-5xl mb-4">👻</div>
                    <p class="text-gray-400">Non hai giocatori da offrire</p>
                </div>
            `;
            return;
        }

        // Escludi l'Icona dallo scambio
        const tradablePlayers = myPlayers.filter(p => !(p.abilities && p.abilities.includes('Icona')));

        let html = `
            <div class="bg-gray-700 rounded-lg p-3 mb-4">
                <p class="text-sm text-gray-400">Stai richiedendo:</p>
                <p class="text-white font-semibold">${window.escapeHtml(this.selectedTargetPlayer?.name || 'Giocatore')}
                    <span class="text-gray-400">(${this.selectedTargetPlayer?.role || '?'} Lv.${this.selectedTargetPlayer?.level || '?'})</span>
                </p>
                <p class="text-gray-500 text-xs">da ${window.escapeHtml(this.selectedTargetTeam?.teamName || 'Squadra')}</p>
            </div>

            <p class="text-gray-400 mb-4">Seleziona quale tuo giocatore vuoi offrire in cambio:</p>
            <div class="space-y-2">
        `;

        for (const player of tradablePlayers) {
            const abilitiesStr = (player.abilities || []).join(', ') || 'Nessuna';
            html += `
                <div class="bg-gray-700 rounded-lg p-3 flex items-center justify-between hover:bg-gray-650 transition">
                    <div class="flex items-center gap-3">
                        <span class="px-2 py-1 bg-${this.getRoleColor(player.role)}-600 rounded text-xs text-white font-bold">${player.role || '?'}</span>
                        <div>
                            <p class="text-white font-medium">${window.escapeHtml(player.name)}</p>
                            <p class="text-gray-400 text-xs">Lv.${player.level || 1} - ${player.type || 'N/A'}</p>
                            <p class="text-purple-400 text-xs">${abilitiesStr}</p>
                        </div>
                    </div>
                    <button class="offer-player-btn px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-semibold transition"
                            data-player-id="${player.id}">
                        Offri
                    </button>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;

        // Event listeners
        container.querySelectorAll('.offer-player-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const playerId = btn.dataset.playerId;
                this.selectedOfferPlayer = tradablePlayers.find(p => p.id === playerId);
                this.currentStep = 'confirmCS';
                this.renderStep();
            });
        });
    },

    // ========================================
    // STEP 5: CONFERMA CS
    // ========================================

    /**
     * Renderizza conferma con input CS
     */
    renderCSConfirmation(container) {
        const currentTeamData = window.InterfacciaCore?.currentTeamData;
        const maxBudget = currentTeamData?.budget || 0;

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Riepilogo scambio -->
                <div class="bg-gray-700 rounded-xl p-4">
                    <h4 class="text-lg font-bold text-white mb-4 text-center">Riepilogo Scambio</h4>

                    <div class="grid grid-cols-2 gap-4">
                        <!-- Offri -->
                        <div class="bg-gray-800 rounded-lg p-3 border border-green-600">
                            <p class="text-xs text-green-400 font-semibold mb-2 text-center">📤 OFFRI</p>
                            <div class="text-center">
                                <span class="px-2 py-1 bg-green-700 rounded text-xs text-white">${this.selectedOfferPlayer?.role || '?'}</span>
                                <p class="text-white font-medium mt-2">${window.escapeHtml(this.selectedOfferPlayer?.name || 'Giocatore')}</p>
                                <p class="text-gray-400 text-xs">Lv.${this.selectedOfferPlayer?.level || '?'}</p>
                            </div>
                        </div>

                        <!-- Richiedi -->
                        <div class="bg-gray-800 rounded-lg p-3 border border-red-600">
                            <p class="text-xs text-red-400 font-semibold mb-2 text-center">📥 RICHIEDI</p>
                            <div class="text-center">
                                <span class="px-2 py-1 bg-red-700 rounded text-xs text-white">${this.selectedTargetPlayer?.role || '?'}</span>
                                <p class="text-white font-medium mt-2">${window.escapeHtml(this.selectedTargetPlayer?.name || 'Giocatore')}</p>
                                <p class="text-gray-400 text-xs">Lv.${this.selectedTargetPlayer?.level || '?'}</p>
                            </div>
                        </div>
                    </div>

                    <p class="text-center text-gray-500 text-sm mt-3">
                        A: <span class="text-white">${window.escapeHtml(this.selectedTargetTeam?.teamName || 'Squadra')}</span>
                    </p>
                </div>

                <!-- Input CS -->
                <div class="bg-gray-700 rounded-xl p-4">
                    <h4 class="text-md font-bold text-yellow-400 mb-3">💰 Vuoi offrire dei Crediti Seri?</h4>
                    <p class="text-gray-400 text-sm mb-3">Il tuo budget attuale: <span class="text-yellow-400 font-bold">${maxBudget} CS</span></p>

                    <div class="flex items-center gap-4">
                        <input type="range" id="cs-slider" min="0" max="${maxBudget}" value="0"
                               class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer">
                        <div class="flex items-center gap-2">
                            <input type="number" id="cs-input" min="0" max="${maxBudget}" value="0"
                                   class="w-20 px-3 py-2 bg-gray-800 border border-yellow-600 rounded-lg text-white text-center">
                            <span class="text-yellow-400">CS</span>
                        </div>
                    </div>
                    <p class="text-gray-500 text-xs mt-2">Trascina o inserisci manualmente l'importo (0 = nessun CS)</p>
                </div>

                <!-- Bottone conferma -->
                <button id="btn-confirm-trade" class="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold text-lg transition transform hover:scale-[1.02]">
                    📤 Invia Proposta di Scambio
                </button>
            </div>
        `;

        // Sincronizza slider e input
        const slider = document.getElementById('cs-slider');
        const input = document.getElementById('cs-input');

        slider.addEventListener('input', () => {
            input.value = slider.value;
            this.offeredCS = parseInt(slider.value);
        });

        input.addEventListener('input', () => {
            let val = parseInt(input.value) || 0;
            if (val < 0) val = 0;
            if (val > maxBudget) val = maxBudget;
            input.value = val;
            slider.value = val;
            this.offeredCS = val;
        });

        // Bottone conferma
        document.getElementById('btn-confirm-trade').addEventListener('click', () => this.submitTrade());
    },

    // ========================================
    // INVIO PROPOSTA
    // ========================================

    /**
     * Invia la proposta di scambio
     */
    async submitTrade() {
        // Validazioni
        if (!this.selectedTargetTeam || !this.selectedTargetPlayer || !this.selectedOfferPlayer) {
            if (window.Toast) window.Toast.error('Dati scambio incompleti');
            return;
        }

        const currentTeamData = window.InterfacciaCore?.currentTeamData;
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const myTeamName = currentTeamData?.teamName || 'Squadra';

        // Verifica budget
        if (this.offeredCS > (currentTeamData?.budget || 0)) {
            if (window.Toast) window.Toast.error('Budget insufficiente');
            return;
        }

        // Conferma
        if (window.ConfirmDialog) {
            const confirmed = await window.ConfirmDialog.confirm(
                'Conferma Proposta',
                `Vuoi inviare questa proposta di scambio a ${this.selectedTargetTeam.teamName}?`,
                { confirmText: 'Invia', cancelText: 'Annulla', type: 'info' }
            );
            if (!confirmed) return;
        }

        // Crea oggetto trade
        const trade = {
            fromTeamId: myTeamId,
            fromTeamName: myTeamName,
            toTeamId: this.selectedTargetTeam.id,
            toTeamName: this.selectedTargetTeam.teamName,
            offeredPlayer: {
                id: this.selectedOfferPlayer.id,
                name: this.selectedOfferPlayer.name,
                role: this.selectedOfferPlayer.role,
                level: this.selectedOfferPlayer.level,
                type: this.selectedOfferPlayer.type,
                abilities: this.selectedOfferPlayer.abilities || []
            },
            requestedPlayer: {
                id: this.selectedTargetPlayer.id,
                name: this.selectedTargetPlayer.name,
                role: this.selectedTargetPlayer.role,
                level: this.selectedTargetPlayer.level,
                type: this.selectedTargetPlayer.type,
                abilities: this.selectedTargetPlayer.abilities || []
            },
            offeredCS: this.offeredCS,
            status: 'pending',
            timestamp: new Date()
        };

        // Salva su Firestore
        try {
            if (window.db && window.firestoreTools) {
                const { collection, addDoc, Timestamp } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                const tradesPath = `artifacts/${appId}/public/data/trades`;

                trade.timestamp = Timestamp.now();
                await addDoc(collection(window.db, tradesPath), trade);

                // Invia notifica al destinatario
                await this.sendTradeNotification(trade);

                if (window.Toast) window.Toast.success('Proposta di scambio inviata!');
            } else {
                // Fallback localStorage per demo
                trade.id = `trade_${Date.now()}`;
                trade.timestamp = Date.now();
                const savedTrades = JSON.parse(localStorage.getItem('fanta_trades') || '[]');
                savedTrades.push(trade);
                localStorage.setItem('fanta_trades', JSON.stringify(savedTrades));
                if (window.Toast) window.Toast.success('Proposta salvata (demo mode)');
            }

            // Reset e torna alla lista
            this.currentStep = 'received';
            this.selectedTargetTeam = null;
            this.selectedTargetPlayer = null;
            this.selectedOfferPlayer = null;
            this.offeredCS = 0;
            await this.loadTrades();
            this.renderStep();

        } catch (error) {
            console.error('[Trades] Errore invio proposta:', error);
            if (window.Toast) window.Toast.error('Errore durante l\'invio della proposta');
        }
    },

    /**
     * Invia notifica al destinatario dello scambio
     */
    async sendTradeNotification(trade) {
        // Notifica in-app se il sistema notifiche e' attivo
        if (window.Notifications && window.Notifications.notify) {
            // Questa notifica viene aggiunta localmente, idealmente si dovrebbe
            // salvare anche in Firestore per il destinatario
            console.log('[Trades] Notifica inviata a:', trade.toTeamId);
        }

        // Salva notifica in Firestore per il destinatario
        if (window.db && window.firestoreTools) {
            try {
                const { collection, addDoc, Timestamp } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                const notificationsPath = `artifacts/${appId}/public/data/notifications`;

                await addDoc(collection(window.db, notificationsPath), {
                    targetTeamId: trade.toTeamId,  // Campo corretto per il sistema notifiche
                    type: 'trade_request',
                    title: 'Proposta di scambio',
                    message: `${trade.fromTeamName} ti propone uno scambio per ${trade.requestedPlayer.name}`,
                    read: false,
                    timestamp: Timestamp.now(),
                    action: { type: 'openTrades' },  // Azione per aprire il pannello scambi
                    data: {
                        tradeFromTeam: trade.fromTeamId,
                        tradeFromTeamName: trade.fromTeamName,
                        requestedPlayerName: trade.requestedPlayer.name,
                        offeredPlayerName: trade.offeredPlayer?.name
                    }
                });
                console.log('[Trades] Notifica scambio inviata a:', trade.toTeamId);
            } catch (error) {
                console.warn('[Trades] Errore invio notifica:', error);
            }
        }
    },

    // ========================================
    // ACCETTA / RIFIUTA
    // ========================================

    /**
     * Accetta uno scambio
     */
    async acceptTrade(tradeId) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;

        // Conferma
        if (window.ConfirmDialog) {
            const confirmed = await window.ConfirmDialog.confirm(
                'Accetta Scambio',
                `Vuoi accettare lo scambio con ${trade.fromTeamName}?\n\nRiceverai: ${trade.offeredPlayer?.name}\nCederai: ${trade.requestedPlayer?.name}${trade.offeredCS > 0 ? `\n+${trade.offeredCS} CS` : ''}`,
                { confirmText: 'Accetta', cancelText: 'Annulla', type: 'warning' }
            );
            if (!confirmed) return;
        }

        try {
            // Esegui lo scambio
            await this.executeTrade(trade);

            // Aggiorna stato in Firestore
            if (window.db && window.firestoreTools) {
                const { doc, updateDoc } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                const tradesPath = `artifacts/${appId}/public/data/trades`;

                await updateDoc(doc(window.db, tradesPath, tradeId), {
                    status: 'accepted',
                    acceptedAt: window.firestoreTools.Timestamp.now()
                });
            }

            // Notifica mittente
            await this.notifyTradeResult(trade, 'accepted');

            if (window.Toast) window.Toast.success('Scambio completato!');

            // Ricarica
            await this.loadTrades();
            this.renderStep();

            // Aggiorna dashboard
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

        } catch (error) {
            console.error('[Trades] Errore accettazione:', error);
            if (window.Toast) window.Toast.error('Errore durante lo scambio');
        }
    },

    /**
     * Esegue lo scambio effettivo (sposta giocatori e CS)
     */
    async executeTrade(trade) {
        if (!window.db || !window.firestoreTools) {
            console.warn('[Trades] Firestore non disponibile per eseguire lo scambio');
            return;
        }

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const teamsPath = `artifacts/${appId}/public/data/teams`;

        // Carica entrambe le squadre
        const fromTeamRef = doc(window.db, teamsPath, trade.fromTeamId);
        const toTeamRef = doc(window.db, teamsPath, trade.toTeamId);

        const [fromTeamSnap, toTeamSnap] = await Promise.all([
            getDoc(fromTeamRef),
            getDoc(toTeamRef)
        ]);

        if (!fromTeamSnap.exists() || !toTeamSnap.exists()) {
            throw new Error('Squadra non trovata');
        }

        const fromTeamData = fromTeamSnap.data();
        const toTeamData = toTeamSnap.data();

        // Trova e rimuovi giocatori dalle rose
        const fromPlayers = [...(fromTeamData.players || [])];
        const toPlayers = [...(toTeamData.players || [])];

        const offeredPlayerIndex = fromPlayers.findIndex(p => p.id === trade.offeredPlayer.id);
        const requestedPlayerIndex = toPlayers.findIndex(p => p.id === trade.requestedPlayer.id);

        if (offeredPlayerIndex === -1 || requestedPlayerIndex === -1) {
            throw new Error('Giocatore non trovato nella rosa');
        }

        // Scambia giocatori
        const offeredPlayer = fromPlayers.splice(offeredPlayerIndex, 1)[0];
        const requestedPlayer = toPlayers.splice(requestedPlayerIndex, 1)[0];

        fromPlayers.push(requestedPlayer);
        toPlayers.push(offeredPlayer);

        // Calcola nuovi budget
        const fromBudget = (fromTeamData.budget || 0) - (trade.offeredCS || 0);
        const toBudget = (toTeamData.budget || 0) + (trade.offeredCS || 0);

        // Aggiorna entrambe le squadre
        await Promise.all([
            updateDoc(fromTeamRef, { players: fromPlayers, budget: fromBudget }),
            updateDoc(toTeamRef, { players: toPlayers, budget: toBudget })
        ]);

        // Aggiorna dati locali se siamo il destinatario
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (myTeamId === trade.toTeamId && window.InterfacciaCore?.currentTeamData) {
            window.InterfacciaCore.currentTeamData.players = toPlayers;
            window.InterfacciaCore.currentTeamData.budget = toBudget;
        }

        console.log('[Trades] Scambio eseguito con successo');
    },

    /**
     * Rifiuta uno scambio
     */
    async rejectTrade(tradeId) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;

        try {
            // Aggiorna stato in Firestore
            if (window.db && window.firestoreTools) {
                const { doc, updateDoc } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                const tradesPath = `artifacts/${appId}/public/data/trades`;

                await updateDoc(doc(window.db, tradesPath, tradeId), {
                    status: 'rejected',
                    rejectedAt: window.firestoreTools.Timestamp.now()
                });
            }

            // Notifica mittente
            await this.notifyTradeResult(trade, 'rejected');

            if (window.Toast) window.Toast.info('Scambio rifiutato');

            // Ricarica
            await this.loadTrades();
            this.renderStep();

        } catch (error) {
            console.error('[Trades] Errore rifiuto:', error);
            if (window.Toast) window.Toast.error('Errore durante il rifiuto');
        }
    },

    /**
     * Notifica il mittente del risultato
     */
    async notifyTradeResult(trade, result) {
        if (!window.db || !window.firestoreTools) return;

        try {
            const { collection, addDoc, Timestamp } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const notificationsPath = `artifacts/${appId}/public/data/notifications`;

            const title = result === 'accepted' ? 'Scambio accettato!' : 'Scambio rifiutato';
            const message = result === 'accepted'
                ? `${trade.toTeamName} ha accettato il tuo scambio per ${trade.requestedPlayer?.name}`
                : `${trade.toTeamName} ha rifiutato il tuo scambio per ${trade.requestedPlayer?.name}`;

            await addDoc(collection(window.db, notificationsPath), {
                teamId: trade.fromTeamId,
                type: result === 'accepted' ? 'system' : 'system',
                title: title,
                message: message,
                read: false,
                timestamp: Timestamp.now()
            });
        } catch (error) {
            console.warn('[Trades] Errore invio notifica risultato:', error);
        }
    },

    // ========================================
    // UTILITIES
    // ========================================

    /**
     * Colore per ruolo
     */
    getRoleColor(role) {
        const colors = { P: 'yellow', D: 'blue', C: 'green', A: 'red' };
        return colors[role] || 'gray';
    },

    /**
     * Formatta data
     */
    formatDate(timestamp) {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        return date.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Setup listeners
     */
    setupListeners() {
        document.addEventListener('featureFlagChanged', (e) => {
            if (e.detail?.flagId === 'trades') {
                if (e.detail.enabled) {
                    this.init();
                } else {
                    this.destroy();
                }
            }
        });
    },

    /**
     * Distruggi modulo
     */
    destroy() {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }
};

// Init quando feature flags sono pronti
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.FeatureFlags?.isEnabled('trades')) {
            window.Trades.init();
        }
    }, 1000);
});

console.log('Modulo Trades caricato.');
