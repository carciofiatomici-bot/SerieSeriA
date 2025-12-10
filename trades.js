//
// ====================================================================
// TRADES.JS - Sistema Scambi Giocatori
// ====================================================================
//

window.Trades = {
    // UI Elements
    panel: null,
    isOpen: false,

    // Dati scambi
    trades: [],
    pendingTrades: [],

    /**
     * Inizializza il sistema scambi
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('trades')) {
            console.log("Sistema Scambi disabilitato");
            return;
        }

        this.createPanel();
        this.loadTrades();
        this.setupListeners();

        console.log("Sistema Scambi inizializzato");
    },

    /**
     * Crea il pannello scambi
     */
    createPanel() {
        // Rimuovi se esiste
        const existing = document.getElementById('trades-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'trades-panel';
        this.panel.className = `
            fixed inset-0 z-[9999] bg-black bg-opacity-80
            flex items-center justify-center
            hidden
        `.replace(/\s+/g, ' ').trim();

        this.panel.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-600 w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
                <!-- Header -->
                <div class="p-4 bg-gray-700 border-b border-gray-600 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <span>🔄</span>
                        <span>Mercato Scambi</span>
                    </h2>
                    <button id="close-trades-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-gray-600">
                    <button class="trade-tab active flex-1 py-3 text-center bg-purple-600 text-white font-semibold" data-tab="incoming">
                        📥 Ricevute <span id="incoming-count" class="ml-1 px-2 py-0.5 bg-red-500 rounded-full text-xs hidden">0</span>
                    </button>
                    <button class="trade-tab flex-1 py-3 text-center bg-gray-700 text-gray-300 hover:bg-gray-600" data-tab="outgoing">
                        📤 Inviate
                    </button>
                    <button class="trade-tab flex-1 py-3 text-center bg-gray-700 text-gray-300 hover:bg-gray-600" data-tab="new">
                        ➕ Nuova Proposta
                    </button>
                </div>

                <!-- Content -->
                <div id="trades-content" class="p-4 overflow-y-auto max-h-[calc(90vh-160px)]">
                    <!-- Contenuto dinamico -->
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);

        // Event listeners
        document.getElementById('close-trades-panel').addEventListener('click', () => this.close());
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) this.close();
        });

        // Tab switching
        this.panel.querySelectorAll('.trade-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.panel.querySelectorAll('.trade-tab').forEach(t => {
                    t.classList.remove('active', 'bg-purple-600');
                    t.classList.add('bg-gray-700', 'text-gray-300');
                });
                tab.classList.add('active', 'bg-purple-600');
                tab.classList.remove('bg-gray-700', 'text-gray-300');

                this.renderTab(tab.dataset.tab);
            });
        });
    },

    /**
     * Apri pannello
     */
    openPanel() {
        if (!window.FeatureFlags?.isEnabled('trades')) {
            if (window.Toast) window.Toast.info("Sistema scambi non disponibile");
            return;
        }

        if (!this.panel) this.createPanel();
        this.panel.classList.remove('hidden');
        this.isOpen = true;
        this.loadTrades();
        this.renderTab('incoming');
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
     * Carica scambi
     */
    async loadTrades() {
        // Carica da localStorage per demo
        const saved = localStorage.getItem('fanta_trades');
        if (saved) {
            this.trades = JSON.parse(saved);
        } else {
            // Demo trades
            this.trades = this.generateDemoTrades();
            this.saveTrades();
        }

        // Carica da Firestore se disponibile
        await this.fetchFromFirestore();

        this.updateBadge();
    },

    /**
     * Genera scambi demo
     */
    generateDemoTrades() {
        const myTeamId = window.InterfacciaCore?.currentTeamId || 'my_team';
        return [
            {
                id: 'trade_1',
                fromTeamId: 'team_alpha',
                fromTeamName: 'Squadra Alpha',
                toTeamId: myTeamId,
                toTeamName: 'La Mia Squadra',
                offeredPlayers: [{ name: 'Mario Rossi', role: 'C', level: 18 }],
                requestedPlayers: [{ name: 'Luigi Verdi', role: 'A', level: 20 }],
                credits: 5,
                status: 'pending',
                timestamp: Date.now() - 3600000,
                message: 'Ti propongo questo scambio vantaggioso!'
            },
            {
                id: 'trade_2',
                fromTeamId: myTeamId,
                fromTeamName: 'La Mia Squadra',
                toTeamId: 'team_beta',
                toTeamName: 'FC Beta',
                offeredPlayers: [{ name: 'Andrea Bianchi', role: 'D', level: 15 }],
                requestedPlayers: [{ name: 'Paolo Neri', role: 'D', level: 17 }],
                credits: -3,
                status: 'pending',
                timestamp: Date.now() - 7200000,
                message: ''
            }
        ];
    },

    /**
     * Fetch da Firestore
     */
    async fetchFromFirestore() {
        if (!window.db || !window.firestoreTools) return;

        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (!myTeamId) return;

        try {
            const { collection, query, where, getDocs, or } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const tradesPath = `artifacts/${appId}/public/data/trades`;

            // Query per scambi dove sono coinvolto
            const q = query(
                collection(window.db, tradesPath),
                or(
                    where('fromTeamId', '==', myTeamId),
                    where('toTeamId', '==', myTeamId)
                )
            );

            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const existing = this.trades.find(t => t.id === doc.id);
                if (!existing) {
                    this.trades.push({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toMillis?.() || Date.now()
                    });
                }
            });
        } catch (error) {
            console.warn("Errore caricamento scambi:", error);
        }
    },

    /**
     * Salva scambi
     */
    saveTrades() {
        localStorage.setItem('fanta_trades', JSON.stringify(this.trades));
    },

    /**
     * Aggiorna badge notifiche
     */
    updateBadge() {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const pending = this.trades.filter(t =>
            t.toTeamId === myTeamId && t.status === 'pending'
        ).length;

        const badge = document.getElementById('incoming-count');
        if (badge) {
            if (pending > 0) {
                badge.textContent = pending;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    /**
     * Renderizza tab
     */
    renderTab(tabName) {
        const content = document.getElementById('trades-content');
        if (!content) return;

        switch (tabName) {
            case 'incoming':
                this.renderIncoming(content);
                break;
            case 'outgoing':
                this.renderOutgoing(content);
                break;
            case 'new':
                this.renderNewTrade(content);
                break;
        }
    },

    /**
     * Renderizza scambi ricevuti
     */
    renderIncoming(container) {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const incoming = this.trades.filter(t => t.toTeamId === myTeamId);

        if (incoming.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-5xl mb-4">📭</div>
                    <p class="text-gray-400">Nessuna proposta di scambio ricevuta</p>
                </div>
            `;
            return;
        }

        container.innerHTML = incoming.map(trade => this.renderTradeCard(trade, 'incoming')).join('');

        // Aggiungi event listeners
        container.querySelectorAll('[data-accept]').forEach(btn => {
            btn.addEventListener('click', () => this.acceptTrade(btn.dataset.accept));
        });
        container.querySelectorAll('[data-reject]').forEach(btn => {
            btn.addEventListener('click', () => this.rejectTrade(btn.dataset.reject));
        });
    },

    /**
     * Renderizza scambi inviati
     */
    renderOutgoing(container) {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const outgoing = this.trades.filter(t => t.fromTeamId === myTeamId);

        if (outgoing.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-5xl mb-4">📤</div>
                    <p class="text-gray-400">Nessuna proposta inviata</p>
                    <button onclick="window.Trades.renderTab('new')" class="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white">
                        Crea Nuova Proposta
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = outgoing.map(trade => this.renderTradeCard(trade, 'outgoing')).join('');

        // Aggiungi event listeners per cancellazione
        container.querySelectorAll('[data-cancel]').forEach(btn => {
            btn.addEventListener('click', () => this.cancelTrade(btn.dataset.cancel));
        });
    },

    /**
     * Renderizza card scambio
     */
    renderTradeCard(trade, type) {
        const isPending = trade.status === 'pending';
        const statusColors = {
            pending: 'yellow',
            accepted: 'green',
            rejected: 'red',
            cancelled: 'gray'
        };
        const statusLabels = {
            pending: 'In Attesa',
            accepted: 'Accettato',
            rejected: 'Rifiutato',
            cancelled: 'Annullato'
        };

        return `
            <div class="bg-gray-700 rounded-xl p-4 mb-4 border-l-4 border-${statusColors[trade.status]}-500">
                <!-- Header -->
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <span class="text-gray-400 text-sm">${type === 'incoming' ? 'Da' : 'A'}:</span>
                        <span class="text-white font-semibold ml-2">${type === 'incoming' ? trade.fromTeamName : trade.toTeamName}</span>
                    </div>
                    <span class="px-2 py-1 bg-${statusColors[trade.status]}-600 rounded text-xs text-white">
                        ${statusLabels[trade.status]}
                    </span>
                </div>

                <!-- Contenuto scambio -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <!-- Giocatori offerti -->
                    <div class="bg-gray-800 rounded-lg p-3">
                        <p class="text-xs text-green-400 font-semibold mb-2">📥 ${type === 'incoming' ? 'Ricevi' : 'Offri'}</p>
                        ${trade.offeredPlayers.map(p => `
                            <div class="flex items-center gap-2 text-sm">
                                <span class="px-1 bg-gray-600 rounded text-xs">${p.role}</span>
                                <span class="text-white">${p.name}</span>
                                <span class="text-gray-400 text-xs">Lv.${p.level}</span>
                            </div>
                        `).join('')}
                        ${trade.credits > 0 ? `<p class="text-yellow-400 text-sm mt-1">+${trade.credits} crediti</p>` : ''}
                    </div>

                    <!-- Giocatori richiesti -->
                    <div class="bg-gray-800 rounded-lg p-3">
                        <p class="text-xs text-red-400 font-semibold mb-2">📤 ${type === 'incoming' ? 'Cedi' : 'Richiedi'}</p>
                        ${trade.requestedPlayers.map(p => `
                            <div class="flex items-center gap-2 text-sm">
                                <span class="px-1 bg-gray-600 rounded text-xs">${p.role}</span>
                                <span class="text-white">${p.name}</span>
                                <span class="text-gray-400 text-xs">Lv.${p.level}</span>
                            </div>
                        `).join('')}
                        ${trade.credits < 0 ? `<p class="text-yellow-400 text-sm mt-1">${trade.credits} crediti</p>` : ''}
                    </div>
                </div>

                ${trade.message ? `<p class="text-gray-400 text-sm italic mb-3">"${trade.message}"</p>` : ''}

                <!-- Azioni -->
                ${isPending ? `
                    <div class="flex gap-2 justify-end">
                        ${type === 'incoming' ? `
                            <button data-reject="${trade.id}" class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm">
                                ❌ Rifiuta
                            </button>
                            <button data-accept="${trade.id}" class="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm">
                                ✅ Accetta
                            </button>
                        ` : `
                            <button data-cancel="${trade.id}" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-sm">
                                🗑️ Annulla
                            </button>
                        `}
                    </div>
                ` : ''}

                <!-- Footer -->
                <p class="text-gray-500 text-xs mt-3">${this.formatDate(trade.timestamp)}</p>
            </div>
        `;
    },

    /**
     * Renderizza form nuova proposta
     */
    renderNewTrade(container) {
        container.innerHTML = `
            <div class="space-y-4">
                <p class="text-gray-400">Seleziona la squadra con cui vuoi proporre uno scambio:</p>

                <!-- Selezione squadra -->
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Squadra destinataria</label>
                    <select id="trade-target-team" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        <option value="">-- Seleziona squadra --</option>
                    </select>
                </div>

                <!-- Giocatori da offrire -->
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Giocatori da offrire (dalla tua rosa)</label>
                    <div id="trade-offer-players" class="bg-gray-700 rounded-lg p-3 min-h-[60px]">
                        <p class="text-gray-500 text-sm">Seleziona prima una squadra</p>
                    </div>
                </div>

                <!-- Giocatori da richiedere -->
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Giocatori da richiedere</label>
                    <div id="trade-request-players" class="bg-gray-700 rounded-lg p-3 min-h-[60px]">
                        <p class="text-gray-500 text-sm">Seleziona prima una squadra</p>
                    </div>
                </div>

                <!-- Crediti -->
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Crediti da aggiungere/richiedere</label>
                    <input type="number" id="trade-credits" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        value="0" min="-50" max="50">
                    <p class="text-xs text-gray-500 mt-1">Positivo = offri crediti, Negativo = richiedi crediti</p>
                </div>

                <!-- Messaggio -->
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Messaggio (opzionale)</label>
                    <textarea id="trade-message" rows="2" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
                        placeholder="Aggiungi un messaggio alla proposta..." maxlength="200"></textarea>
                </div>

                <!-- Bottone invio -->
                <button id="send-trade" class="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold">
                    📤 Invia Proposta
                </button>
            </div>
        `;

        // Carica squadre
        this.loadTeamsForTrade();

        // Event listener invio
        document.getElementById('send-trade').addEventListener('click', () => this.createTrade());
    },

    /**
     * Carica squadre per il dropdown
     */
    async loadTeamsForTrade() {
        const select = document.getElementById('trade-target-team');
        if (!select) return;

        const myTeamId = window.InterfacciaCore?.currentTeamId;

        // Carica squadre da Firestore o usa demo
        let teams = [];

        if (window.db && window.firestoreTools) {
            try {
                const { collection, getDocs } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                const teamsPath = `artifacts/${appId}/public/data/teams`;

                const snapshot = await getDocs(collection(window.db, teamsPath));
                snapshot.docs.forEach(doc => {
                    if (doc.id !== myTeamId) {
                        teams.push({ id: doc.id, name: doc.data().name || doc.id });
                    }
                });
            } catch (error) {
                console.warn("Errore caricamento squadre:", error);
            }
        }

        // Se nessuna squadra, usa demo
        if (teams.length === 0) {
            teams = [
                { id: 'team_alpha', name: 'Squadra Alpha' },
                { id: 'team_beta', name: 'FC Beta' },
                { id: 'team_gamma', name: 'Gamma United' }
            ];
        }

        select.innerHTML = '<option value="">-- Seleziona squadra --</option>' +
            teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

        // Listener cambio squadra
        select.addEventListener('change', () => this.onTeamSelected(select.value));
    },

    /**
     * Handler selezione squadra
     */
    onTeamSelected(teamId) {
        // Per demo, mostra placeholder
        const offerDiv = document.getElementById('trade-offer-players');
        const requestDiv = document.getElementById('trade-request-players');

        if (!teamId) {
            offerDiv.innerHTML = '<p class="text-gray-500 text-sm">Seleziona prima una squadra</p>';
            requestDiv.innerHTML = '<p class="text-gray-500 text-sm">Seleziona prima una squadra</p>';
            return;
        }

        // Demo: mostra checkbox con giocatori fittizi
        offerDiv.innerHTML = `
            <div class="space-y-2">
                <label class="flex items-center gap-2">
                    <input type="checkbox" name="offer" value="p1" class="rounded bg-gray-600">
                    <span class="text-white text-sm">Mario Rossi (C) Lv.18</span>
                </label>
                <label class="flex items-center gap-2">
                    <input type="checkbox" name="offer" value="p2" class="rounded bg-gray-600">
                    <span class="text-white text-sm">Luigi Verdi (A) Lv.20</span>
                </label>
            </div>
        `;

        requestDiv.innerHTML = `
            <div class="space-y-2">
                <label class="flex items-center gap-2">
                    <input type="checkbox" name="request" value="p3" class="rounded bg-gray-600">
                    <span class="text-white text-sm">Paolo Neri (D) Lv.17</span>
                </label>
                <label class="flex items-center gap-2">
                    <input type="checkbox" name="request" value="p4" class="rounded bg-gray-600">
                    <span class="text-white text-sm">Andrea Bianchi (C) Lv.19</span>
                </label>
            </div>
        `;
    },

    /**
     * Crea nuova proposta
     */
    async createTrade() {
        const targetTeam = document.getElementById('trade-target-team').value;
        const credits = parseInt(document.getElementById('trade-credits').value) || 0;
        const message = document.getElementById('trade-message').value.trim();

        if (!targetTeam) {
            if (window.Toast) window.Toast.warning("Seleziona una squadra");
            return;
        }

        // Demo: crea scambio fittizio
        const trade = {
            id: `trade_${Date.now()}`,
            fromTeamId: window.InterfacciaCore?.currentTeamId || 'my_team',
            fromTeamName: window.InterfacciaCore?.getCurrentTeam?.()?.name || 'La Mia Squadra',
            toTeamId: targetTeam,
            toTeamName: document.getElementById('trade-target-team').selectedOptions[0].text,
            offeredPlayers: [{ name: 'Giocatore Demo', role: 'C', level: 15 }],
            requestedPlayers: [{ name: 'Giocatore Richiesto', role: 'A', level: 18 }],
            credits: credits,
            status: 'pending',
            timestamp: Date.now(),
            message: message
        };

        this.trades.push(trade);
        this.saveTrades();

        if (window.Toast) window.Toast.success("Proposta inviata!");

        // Vai alla tab inviate
        this.panel.querySelector('[data-tab="outgoing"]').click();
    },

    /**
     * Accetta scambio
     */
    async acceptTrade(tradeId) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;

        if (window.ConfirmDialog) {
            const confirmed = await window.ConfirmDialog.show({
                title: 'Accetta Scambio',
                message: 'Sei sicuro di voler accettare questo scambio?',
                confirmText: 'Accetta',
                confirmClass: 'bg-green-600 hover:bg-green-500'
            });
            if (!confirmed) return;
        }

        trade.status = 'accepted';
        this.saveTrades();
        this.renderTab('incoming');

        if (window.Toast) window.Toast.success("Scambio accettato!");
        if (window.Notifications) {
            window.Notifications.notify.system('Scambio completato', `Hai completato uno scambio con ${trade.fromTeamName}`);
        }
    },

    /**
     * Rifiuta scambio
     */
    async rejectTrade(tradeId) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;

        trade.status = 'rejected';
        this.saveTrades();
        this.renderTab('incoming');

        if (window.Toast) window.Toast.info("Scambio rifiutato");
    },

    /**
     * Annulla scambio
     */
    async cancelTrade(tradeId) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;

        trade.status = 'cancelled';
        this.saveTrades();
        this.renderTab('outgoing');

        if (window.Toast) window.Toast.info("Proposta annullata");
    },

    /**
     * Formatta data
     */
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString('it-IT', {
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

console.log("Modulo Trades caricato.");
