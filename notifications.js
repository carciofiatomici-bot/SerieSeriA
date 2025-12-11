//
// ====================================================================
// NOTIFICATIONS.JS - Sistema Notifiche In-App
// ====================================================================
//

window.Notifications = {
    // Container notifiche
    container: null,
    bellButton: null,
    dropdown: null,

    // Notifiche correnti
    notifications: [],
    unreadCount: 0,

    // Configurazione
    config: {
        maxNotifications: 50,
        persistDays: 7
    },

    // Tipi di notifica
    types: {
        draft_turn: { icon: '📋', color: 'yellow', priority: 'high' },
        match_result: { icon: '⚽', color: 'green', priority: 'medium' },
        market_player: { icon: '💰', color: 'blue', priority: 'low' },
        trade_request: { icon: '🔄', color: 'purple', priority: 'high' },
        achievement: { icon: '🏆', color: 'amber', priority: 'medium' },
        system: { icon: '⚙️', color: 'gray', priority: 'low' },
        chat: { icon: '💬', color: 'cyan', priority: 'medium' },
        challenge: { icon: '⚔️', color: 'orange', priority: 'high' }
    },

    /**
     * Inizializza il sistema notifiche
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('notifications')) {
            console.log("Notifiche disabilitate");
            return;
        }

        this.createUI();
        this.loadNotifications();
        this.setupListeners();
        this.startPolling();

        console.log("Sistema Notifiche inizializzato");
    },

    /**
     * Crea l'UI della campanella
     */
    createUI() {
        // Rimuovi se esiste già
        const existing = document.getElementById('notifications-bell');
        if (existing) existing.remove();

        // Crea bottone campanella
        this.bellButton = document.createElement('button');
        this.bellButton.id = 'notifications-bell';
        this.bellButton.className = `
            fixed top-4 right-4 z-[9998] w-12 h-12
            bg-gray-800 hover:bg-gray-700
            rounded-full shadow-lg border-2 border-gray-600
            flex items-center justify-center
            transition-all duration-200 hover:scale-110
        `.replace(/\s+/g, ' ').trim();

        this.bellButton.innerHTML = `
            <span class="text-xl">🔔</span>
            <span id="notification-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full items-center justify-center hidden">0</span>
        `;

        // Crea dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.id = 'notifications-dropdown';
        this.dropdown.className = `
            fixed top-20 right-4 z-[9997] w-80 max-h-96
            bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-600
            overflow-hidden hidden
        `.replace(/\s+/g, ' ').trim();

        this.dropdown.innerHTML = `
            <div class="p-3 bg-gray-700 border-b border-gray-600 flex justify-between items-center">
                <h3 class="font-bold text-white">Notifiche</h3>
                <button id="mark-all-read" class="text-xs text-blue-400 hover:text-blue-300">Segna tutte lette</button>
            </div>
            <div id="notifications-list" class="overflow-y-auto max-h-72">
                <p class="text-center text-gray-400 py-8">Nessuna notifica</p>
            </div>
        `;

        document.body.appendChild(this.bellButton);
        document.body.appendChild(this.dropdown);

        // Event listeners
        this.bellButton.addEventListener('click', () => this.toggleDropdown());
        document.getElementById('mark-all-read').addEventListener('click', () => this.markAllRead());

        // Chiudi dropdown cliccando fuori
        document.addEventListener('click', (e) => {
            if (!this.bellButton.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
    },

    /**
     * Carica notifiche da localStorage e Firestore
     */
    async loadNotifications() {
        // Carica da localStorage
        const saved = localStorage.getItem('fanta_notifications');
        if (saved) {
            try {
                this.notifications = JSON.parse(saved);
                // Filtra notifiche vecchie
                const cutoff = Date.now() - (this.config.persistDays * 24 * 60 * 60 * 1000);
                this.notifications = this.notifications.filter(n => n.timestamp > cutoff);
            } catch (e) {
                this.notifications = [];
            }
        }

        // Carica da Firestore (notifiche server-side)
        await this.fetchServerNotifications();

        this.updateUI();
    },

    /**
     * Recupera notifiche dal server
     */
    async fetchServerNotifications() {
        if (!window.db || !window.firestoreTools) return;

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            const { collection, query, where, getDocs, orderBy, limit } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const notifPath = `artifacts/${appId}/public/data/notifications`;

            const q = query(
                collection(window.db, notifPath),
                where('targetTeamId', 'in', [teamId, 'all']),
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const existing = this.notifications.find(n => n.id === doc.id);
                if (!existing) {
                    this.notifications.unshift({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toMillis?.() || Date.now()
                    });
                }
            });

            this.saveToLocalStorage();
        } catch (error) {
            console.warn("Errore caricamento notifiche server:", error);
        }
    },

    /**
     * Salva notifiche in localStorage
     */
    saveToLocalStorage() {
        // Mantieni solo le ultime N
        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.config.maxNotifications);
        }
        localStorage.setItem('fanta_notifications', JSON.stringify(this.notifications));
    },

    /**
     * Aggiunge una notifica locale
     */
    add(notification) {
        if (!window.FeatureFlags?.isEnabled('notifications')) return;

        const notif = {
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false,
            ...notification
        };

        this.notifications.unshift(notif);
        this.saveToLocalStorage();
        this.updateUI();

        // Mostra anche toast se priorità alta
        const typeConfig = this.types[notification.type] || this.types.system;
        if (typeConfig.priority === 'high' && window.Toast) {
            window.Toast.info(`${typeConfig.icon} ${notification.title}`);
        }

        return notif.id;
    },

    /**
     * Notifiche predefinite
     */
    notify: {
        draftTurn(teamName) {
            window.Notifications.add({
                type: 'draft_turn',
                title: 'E\' il tuo turno!',
                message: `Tocca a te scegliere nel draft!`,
                action: { type: 'navigate', target: 'draft-content' }
            });
        },

        matchResult(opponent, result, won) {
            window.Notifications.add({
                type: 'match_result',
                title: won ? 'Vittoria!' : (result.includes('-') && result.split('-')[0] === result.split('-')[1] ? 'Pareggio' : 'Sconfitta'),
                message: `Risultato vs ${opponent}: ${result}`,
                action: { type: 'navigate', target: 'user-campionato-content' }
            });
        },

        newMarketPlayer(playerName, role) {
            window.Notifications.add({
                type: 'market_player',
                title: 'Nuovo nel mercato!',
                message: `${playerName} (${role}) e' disponibile`,
                action: { type: 'navigate', target: 'mercato-content' }
            });
        },

        tradeRequest(fromTeam, playerOffered) {
            window.Notifications.add({
                type: 'trade_request',
                title: 'Proposta di scambio',
                message: `${fromTeam} ti propone uno scambio`,
                action: { type: 'openTrades' }
            });
        },

        achievement(title, description) {
            window.Notifications.add({
                type: 'achievement',
                title: `🏆 ${title}`,
                message: description,
                action: { type: 'openAchievements' }
            });
        },

        system(title, message) {
            window.Notifications.add({
                type: 'system',
                title: title,
                message: message
            });
        },

        marketOpened() {
            window.Notifications.add({
                type: 'market_player',
                title: 'Mercato Aperto!',
                message: 'Il mercato e\' stato aperto, puoi acquistare nuovi giocatori!',
                action: { type: 'navigate', target: 'mercato-content' }
            });
        },

        marketClosed() {
            window.Notifications.add({
                type: 'market_player',
                title: 'Mercato Chiuso',
                message: 'Il mercato e\' stato chiuso. Attendi la prossima apertura.',
                action: null
            });
        },

        draftOpened() {
            window.Notifications.add({
                type: 'draft_turn',
                title: 'Draft Aperto!',
                message: 'Il draft e\' stato aperto, preparati a scegliere!',
                action: { type: 'navigate', target: 'draft-content' }
            });
        },

        draftClosed() {
            window.Notifications.add({
                type: 'draft_turn',
                title: 'Draft Chiuso',
                message: 'Il draft e\' terminato. Buona fortuna con la tua rosa!',
                action: null
            });
        },

        challengeReceived(fromTeam, betAmount) {
            window.Notifications.add({
                type: 'challenge',
                title: 'Nuova Sfida!',
                message: betAmount > 0 ? `${fromTeam} ti sfida con ${betAmount} CS in palio!` : `${fromTeam} ti ha sfidato!`,
                action: { type: 'navigate', target: 'app-content' }
            });
        }
    },

    /**
     * Aggiorna l'UI
     */
    updateUI() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;

        // Aggiorna badge
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
                badge.classList.remove('hidden');
                badge.classList.add('flex');
                // Animazione shake
                this.bellButton.classList.add('animate-bounce');
                setTimeout(() => this.bellButton.classList.remove('animate-bounce'), 1000);
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
            }
        }

        // Aggiorna lista
        this.renderList();
    },

    /**
     * Renderizza la lista notifiche
     */
    renderList() {
        const list = document.getElementById('notifications-list');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = '<p class="text-center text-gray-400 py-8">Nessuna notifica</p>';
            return;
        }

        list.innerHTML = this.notifications.map(notif => {
            const typeConfig = this.types[notif.type] || this.types.system;
            const timeAgo = this.getTimeAgo(notif.timestamp);
            const unreadClass = notif.read ? '' : 'bg-gray-700';

            return `
                <div class="p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${unreadClass}"
                     onclick="window.Notifications.handleClick('${notif.id}')">
                    <div class="flex gap-3">
                        <span class="text-xl">${typeConfig.icon}</span>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-white text-sm ${notif.read ? 'opacity-70' : ''}">${notif.title}</p>
                            <p class="text-gray-400 text-xs truncate">${notif.message}</p>
                            <p class="text-gray-500 text-xs mt-1">${timeAgo}</p>
                        </div>
                        ${!notif.read ? '<div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Gestisce click su notifica
     */
    handleClick(notifId) {
        const notif = this.notifications.find(n => n.id === notifId);
        if (!notif) return;

        // Segna come letta
        notif.read = true;
        this.saveToLocalStorage();
        this.updateUI();

        // Esegui azione
        if (notif.action) {
            this.executeAction(notif.action);
        }

        this.closeDropdown();
    },

    /**
     * Esegue azione della notifica
     */
    executeAction(action) {
        switch (action.type) {
            case 'navigate':
                const el = document.getElementById(action.target);
                if (el && window.showScreen) {
                    window.showScreen(el);
                }
                break;
            case 'openTrades':
                if (window.Trades) window.Trades.openPanel();
                break;
            case 'openAchievements':
                if (window.Achievements) window.Achievements.openPanel();
                break;
            case 'url':
                window.open(action.url, '_blank');
                break;
        }
    },

    /**
     * Formatta tempo fa
     */
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Ora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min fa`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} ore fa`;
        return `${Math.floor(seconds / 86400)} giorni fa`;
    },

    /**
     * Toggle dropdown
     */
    toggleDropdown() {
        this.dropdown.classList.toggle('hidden');
    },

    /**
     * Chiudi dropdown
     */
    closeDropdown() {
        this.dropdown.classList.add('hidden');
    },

    /**
     * Segna tutte come lette
     */
    markAllRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveToLocalStorage();
        this.updateUI();
    },

    /**
     * Pulisci tutte le notifiche
     */
    clearAll() {
        this.notifications = [];
        this.saveToLocalStorage();
        this.updateUI();
    },

    /**
     * Setup event listeners
     */
    setupListeners() {
        // Ascolta eventi di gioco
        document.addEventListener('draftTurnStarted', (e) => {
            if (e.detail?.teamId === window.InterfacciaCore?.currentTeamId) {
                this.notify.draftTurn();
            }
        });

        document.addEventListener('matchSimulated', (e) => {
            const { homeTeam, awayTeam, result } = e.detail || {};
            const myTeamId = window.InterfacciaCore?.currentTeamId;
            if (homeTeam?.id === myTeamId || awayTeam?.id === myTeamId) {
                const opponent = homeTeam?.id === myTeamId ? awayTeam?.name : homeTeam?.name;
                const won = homeTeam?.id === myTeamId ?
                    parseInt(result?.split('-')[0]) > parseInt(result?.split('-')[1]) :
                    parseInt(result?.split('-')[1]) > parseInt(result?.split('-')[0]);
                this.notify.matchResult(opponent, result, won);
            }
        });

        // Ascolta cambio feature flag
        document.addEventListener('featureFlagChanged', (e) => {
            if (e.detail?.flagId === 'notifications') {
                if (e.detail.enabled) {
                    this.init();
                } else {
                    this.destroy();
                }
            }
        });

        // Ascolta apertura/chiusura mercato
        document.addEventListener('marketStatusChanged', (e) => {
            if (e.detail?.isOpen) {
                this.notify.marketOpened();
            } else {
                this.notify.marketClosed();
            }
        });

        // Ascolta apertura/chiusura draft
        document.addEventListener('draftStatusChanged', (e) => {
            if (e.detail?.isOpen) {
                this.notify.draftOpened();
            } else {
                this.notify.draftClosed();
            }
        });

        // Ascolta sfide ricevute
        document.addEventListener('challengeReceived', (e) => {
            if (e.detail) {
                this.notify.challengeReceived(e.detail.fromTeam, e.detail.betAmount || 0);
            }
        });
    },

    /**
     * Polling per nuove notifiche
     */
    startPolling() {
        // Poll ogni 2 minuti
        this.pollingInterval = setInterval(() => {
            this.fetchServerNotifications().then(() => this.updateUI());
        }, 120000);
    },

    /**
     * Distruggi sistema notifiche
     */
    destroy() {
        if (this.bellButton) this.bellButton.remove();
        if (this.dropdown) this.dropdown.remove();
        if (this.pollingInterval) clearInterval(this.pollingInterval);
    }
};

// Init quando feature flags sono pronti
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.FeatureFlags?.isEnabled('notifications')) {
            window.Notifications.init();
        }
    }, 1000);
});

console.log("Modulo Notifications caricato.");
