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

    // Listener Firestore
    _unsubscribe: null,
    _lastServerFetch: 0,
    _serverNotificationsLoaded: false,

    // Configurazione
    config: {
        maxNotifications: 50,
        persistDays: 7,
        cacheDurationMs: 5 * 60 * 1000, // 5 minuti di cache
        lazyLoad: true // Carica da server solo al click
    },

    // Tipi di notifica
    types: {
        draft_turn: { icon: '📋', color: 'yellow', priority: 'high' },
        draft_steal: { icon: '🏴‍☠️', color: 'red', priority: 'high' },
        match_result: { icon: '⚽', color: 'green', priority: 'medium' },
        market_player: { icon: '💰', color: 'blue', priority: 'low' },
        trade_request: { icon: '🔄', color: 'purple', priority: 'high' },
        achievement: { icon: '🏆', color: 'amber', priority: 'medium' },
        system: { icon: '⚙️', color: 'gray', priority: 'low' },
        chat: { icon: '💬', color: 'cyan', priority: 'medium' },
        challenge: { icon: '⚔️', color: 'orange', priority: 'high' },
        out_of_position: { icon: '⚠️', color: 'orange', priority: 'medium' },
        credits_received: { icon: '💎', color: 'emerald', priority: 'high' },
        league_invite: { icon: '👥', color: 'purple', priority: 'high' }
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

        // Richiedi permesso push dopo un breve delay
        this.requestPushPermission();

        console.log("Sistema Notifiche inizializzato");
    },

    /**
     * Richiede il permesso per le notifiche push del browser
     */
    async requestPushPermission() {
        if (!('Notification' in window)) {
            console.log('[Push] Browser non supporta notifiche');
            return;
        }

        if (Notification.permission === 'default') {
            // Richiedi dopo un breve delay per non essere invasivi
            setTimeout(async () => {
                const permission = await Notification.requestPermission();
                console.log('[Push] Permesso notifiche:', permission);
            }, 5000);
        }
    },

    /**
     * Invia una notifica push del browser
     * @param {string} title - Titolo della notifica
     * @param {string} body - Corpo del messaggio
     * @param {string} tag - Tag per deduplicazione (evita notifiche duplicate)
     */
    async sendBrowserPush(title, body, tag) {
        // Verifica supporto
        if (!('Notification' in window)) {
            console.log('[Push] Browser non supporta notifiche');
            return;
        }

        // Richiedi permesso se necessario
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
        }

        if (Notification.permission !== 'granted') return;

        // Crea notifica
        try {
            const notification = new Notification(title, {
                body: body,
                icon: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/logo.png',
                badge: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/logo.png',
                tag: tag,  // Evita duplicati dello stesso tipo
                requireInteraction: false,
                vibrate: [200, 100, 200]
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            console.log('[Push] Notifica inviata:', title);
        } catch (error) {
            console.warn('[Push] Errore invio notifica:', error);
        }
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
                <div class="flex gap-2">
                    <button id="mark-all-read" class="text-xs text-blue-400 hover:text-blue-300">Segna lette</button>
                    <button id="clear-all-notifs" class="text-xs text-red-400 hover:text-red-300">Elimina tutte</button>
                </div>
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
        document.getElementById('clear-all-notifs').addEventListener('click', () => this.clearAll());

        // Chiudi dropdown cliccando fuori
        document.addEventListener('click', (e) => {
            if (!this.bellButton.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
    },

    /**
     * Carica notifiche da localStorage (e opzionalmente Firestore)
     */
    async loadNotifications() {
        // Carica da localStorage
        const saved = localStorage.getItem('fanta_notifications');
        const lastFetch = parseInt(localStorage.getItem('fanta_notifications_fetch') || '0');

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

        this._lastServerFetch = lastFetch;

        // Se lazyLoad e' attivo, NON caricare da server all'avvio
        // Le notifiche server verranno caricate al primo click sulla campanella
        if (!this.config.lazyLoad) {
            // Carica da Firestore solo se cache scaduta
            const cacheExpired = Date.now() - lastFetch > this.config.cacheDurationMs;
            if (cacheExpired) {
                await this.fetchServerNotifications();
            }
        }

        this.updateUI();
    },

    /**
     * Recupera notifiche dal server (con cache check)
     */
    async fetchServerNotifications(forceRefresh = false) {
        if (!window.db || !window.firestoreTools) return;

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        // Controlla se la cache e' ancora valida
        const cacheExpired = Date.now() - this._lastServerFetch > this.config.cacheDurationMs;
        if (!forceRefresh && !cacheExpired && this._serverNotificationsLoaded) {
            console.log('[Notifiche] Usando cache locale (valida per altri ' +
                Math.round((this.config.cacheDurationMs - (Date.now() - this._lastServerFetch)) / 1000) + 's)');
            return;
        }

        try {
            const { collection, query, where, getDocs, orderBy, limit } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const notifPath = `artifacts/${appId}/public/data/notifications`;

            // Query semplificata: solo per questo team (evita 'in' che richiede indice)
            const q = query(
                collection(window.db, notifPath),
                where('targetTeamId', '==', teamId),
                orderBy('timestamp', 'desc'),
                limit(15)
            );

            const snapshot = await getDocs(q);
            let newCount = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const existing = this.notifications.find(n => n.id === doc.id);
                if (!existing) {
                    this.notifications.unshift({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toMillis?.() || Date.now()
                    });
                    newCount++;
                }
            });

            // Aggiorna timestamp fetch
            this._lastServerFetch = Date.now();
            this._serverNotificationsLoaded = true;
            localStorage.setItem('fanta_notifications_fetch', this._lastServerFetch.toString());

            if (newCount > 0) {
                console.log(`[Notifiche] Caricate ${newCount} nuove notifiche dal server`);
            }

            this.saveToLocalStorage();
        } catch (error) {
            console.warn("Errore caricamento notifiche server:", error);
        }
    },

    /**
     * Avvia listener realtime per nuove notifiche (usa meno letture del polling)
     */
    startRealtimeListener() {
        if (this._unsubscribe) return; // Gia' attivo

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId || !window.db || !window.firestoreTools) return;

        try {
            const { collection, query, where, orderBy, limit, onSnapshot } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const notifPath = `artifacts/${appId}/public/data/notifications`;

            const q = query(
                collection(window.db, notifPath),
                where('targetTeamId', '==', teamId),
                orderBy('timestamp', 'desc'),
                limit(10)
            );

            this._unsubscribe = onSnapshot(q, (snapshot) => {
                let newCount = 0;
                const newNotifications = [];

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const doc = change.doc;
                        const data = doc.data();
                        const existing = this.notifications.find(n => n.id === doc.id);
                        if (!existing) {
                            const notif = {
                                id: doc.id,
                                ...data,
                                timestamp: data.timestamp?.toMillis?.() || Date.now()
                            };
                            this.notifications.unshift(notif);
                            newNotifications.push(notif);
                            newCount++;
                        }
                    }
                });

                if (newCount > 0) {
                    this.saveToLocalStorage();
                    this.updateUI();

                    // Invia push browser per notifiche high priority
                    newNotifications.forEach(notif => {
                        const typeConfig = this.types[notif.type] || this.types.system;
                        if (typeConfig.priority === 'high') {
                            this.sendBrowserPush(
                                `${typeConfig.icon} ${notif.title}`,
                                notif.message,
                                notif.type
                            );
                        }
                    });
                }
            }, (error) => {
                console.warn('[Notifiche] Errore listener:', error);
            });

            console.log('[Notifiche] Listener realtime avviato');
        } catch (error) {
            console.warn('[Notifiche] Impossibile avviare listener:', error);
        }
    },

    /**
     * Ferma listener realtime
     */
    stopRealtimeListener() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
            console.log('[Notifiche] Listener realtime fermato');
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
        const typeConfig = this.types[notification.type] || this.types.system;

        // Se le notifiche sono disabilitate, mostra almeno un Toast per le notifiche importanti
        if (!window.FeatureFlags?.isEnabled('notifications')) {
            if (window.Toast && (typeConfig.priority === 'high' || typeConfig.priority === 'medium')) {
                window.Toast.info(`${typeConfig.icon} ${notification.title}: ${notification.message}`);
            }
            return;
        }

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
        },

        outOfPosition(playersCount, playerNames) {
            window.Notifications.add({
                type: 'out_of_position',
                title: 'Giocatori Fuori Ruolo!',
                message: playersCount === 1
                    ? `${playerNames[0]} sta giocando fuori ruolo (-15% livello)`
                    : `${playersCount} giocatori fuori ruolo: ${playerNames.join(', ')} (-15% livello)`,
                action: { type: 'navigate', target: 'gestione-content' }
            });
        },

        draftTurnSteal(teamName, timeRemaining) {
            window.Notifications.add({
                type: 'draft_steal',
                title: 'Puoi Rubare il Turno!',
                message: `${teamName} non ha ancora draftato. Puoi rubare il suo turno!`,
                action: { type: 'navigate', target: 'draft-content' }
            });
        },

        creditsReceived(amount, motivo) {
            window.Notifications.add({
                type: 'credits_received',
                title: `+${amount} Crediti Super Seri!`,
                message: motivo || 'Hai ricevuto dei crediti',
                action: { type: 'navigate', target: 'gestione-content' }
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

            // Bottoni azione per sfide
            let actionButtons = '';
            if (notif.type === 'challenge' && notif.challengeId && !notif.responded) {
                actionButtons = `
                    <div class="flex gap-2 mt-2">
                        <button onclick="event.stopPropagation(); window.Notifications.acceptChallenge('${notif.id}', '${notif.challengeId}')"
                                class="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            ✅ Accetta
                        </button>
                        <button onclick="event.stopPropagation(); window.Notifications.declineChallenge('${notif.id}', '${notif.challengeId}')"
                                class="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            ❌ Rifiuta
                        </button>
                    </div>
                `;
            }

            // Bottoni azione per inviti lega privata
            if (notif.type === 'league_invite' && notif.leagueId && !notif.responded) {
                actionButtons = `
                    <div class="flex gap-2 mt-2">
                        <button onclick="event.stopPropagation(); window.Notifications.acceptLeagueInvite('${notif.id}', '${notif.leagueId}', '${notif.inviteCode}')"
                                class="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            ✅ Accetta
                        </button>
                        <button onclick="event.stopPropagation(); window.Notifications.declineLeagueInvite('${notif.id}')"
                                class="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            ❌ Rifiuta
                        </button>
                    </div>
                `;
            }

            return `
                <div class="p-3 border-b border-gray-700 hover:bg-gray-700 ${unreadClass} group relative">
                    <div class="flex gap-3 cursor-pointer" onclick="window.Notifications.handleClick('${notif.id}')">
                        <span class="text-xl">${typeConfig.icon}</span>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-white text-sm ${notif.read ? 'opacity-70' : ''}">${notif.title}</p>
                            <p class="text-gray-400 text-xs truncate">${notif.message}</p>
                            <p class="text-gray-500 text-xs mt-1">${timeAgo}</p>
                            ${actionButtons}
                        </div>
                        ${!notif.read ? '<div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>' : ''}
                    </div>
                    <button onclick="event.stopPropagation(); window.Notifications.deleteNotification('${notif.id}')"
                            class="absolute top-2 right-2 w-6 h-6 bg-gray-600 hover:bg-red-600 text-gray-300 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs"
                            title="Elimina notifica">
                        ✕
                    </button>
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
    async toggleDropdown() {
        const wasHidden = this.dropdown.classList.contains('hidden');
        this.dropdown.classList.toggle('hidden');

        // Lazy load: carica notifiche server al primo click
        if (wasHidden && this.config.lazyLoad && !this._serverNotificationsLoaded) {
            await this.fetchServerNotifications();
            this.updateUI();
            // Dopo il primo caricamento, avvia il listener realtime
            this.startRealtimeListener();
        }
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
     * Elimina una singola notifica
     */
    deleteNotification(notifId) {
        this.notifications = this.notifications.filter(n => n.id !== notifId);
        this.saveToLocalStorage();
        this.updateUI();
    },

    /**
     * Accetta sfida dalla notifica
     */
    async acceptChallenge(notifId, challengeId) {
        // Marca la notifica come risposta
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.responded = true;
            notif.read = true;
            this.saveToLocalStorage();
        }

        // Chiudi dropdown notifiche
        this.closeDropdown();

        // Carica i dati della sfida e accettala tramite Challenges
        if (window.Challenges) {
            try {
                const { doc, getDoc } = window.firestoreTools;
                const challengesPath = window.Challenges.getChallengesPath();
                const challengeDoc = await getDoc(doc(window.db, challengesPath, challengeId));

                if (challengeDoc.exists()) {
                    const challenge = { id: challengeDoc.id, ...challengeDoc.data() };
                    await window.Challenges.acceptChallenge(challenge);
                } else {
                    if (window.Toast) window.Toast.error('Sfida non trovata o scaduta');
                }
            } catch (error) {
                console.error('Errore accettazione sfida:', error);
                if (window.Toast) window.Toast.error('Errore nell\'accettare la sfida');
            }
        }

        this.updateUI();
    },

    /**
     * Rifiuta sfida dalla notifica
     */
    async declineChallenge(notifId, challengeId) {
        // Marca la notifica come risposta
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.responded = true;
            notif.read = true;
            this.saveToLocalStorage();
        }

        // Rifiuta tramite Challenges
        if (window.Challenges) {
            try {
                const { doc, getDoc } = window.firestoreTools;
                const challengesPath = window.Challenges.getChallengesPath();
                const challengeDoc = await getDoc(doc(window.db, challengesPath, challengeId));

                if (challengeDoc.exists()) {
                    const challenge = { id: challengeDoc.id, ...challengeDoc.data() };
                    await window.Challenges.declineChallenge(challenge);
                }
            } catch (error) {
                console.error('Errore rifiuto sfida:', error);
            }
        }

        this.updateUI();
    },

    /**
     * Accetta invito lega privata dalla notifica
     */
    async acceptLeagueInvite(notifId, leagueId, inviteCode) {
        // Marca la notifica come risposta
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.responded = true;
            notif.read = true;
            this.saveToLocalStorage();
        }

        // Chiudi dropdown notifiche
        this.closeDropdown();

        // Accetta invito tramite PrivateLeagues
        if (window.PrivateLeagues) {
            try {
                const teamId = window.InterfacciaCore?.currentTeamId;
                const teamName = window.InterfacciaCore?.currentTeamData?.teamName;

                if (!teamId || !teamName) {
                    if (window.Toast) window.Toast.error('Dati squadra non disponibili');
                    return;
                }

                const result = await window.PrivateLeagues.joinLeague(inviteCode, teamId, teamName);

                if (result.success) {
                    if (result.leagueStarted) {
                        if (window.Toast) window.Toast.success('Invito accettato! Lega al completo, campionato iniziato!');
                    } else {
                        if (window.Toast) window.Toast.success('Invito accettato! Ti sei unito alla lega.');
                    }
                } else {
                    if (window.Toast) window.Toast.error(result.error || 'Errore nell\'accettare l\'invito');
                }
            } catch (error) {
                console.error('Errore accettazione invito lega:', error);
                if (window.Toast) window.Toast.error('Errore nell\'accettare l\'invito');
            }
        }

        this.updateUI();
    },

    /**
     * Rifiuta invito lega privata dalla notifica
     */
    async declineLeagueInvite(notifId) {
        // Marca la notifica come risposta
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.responded = true;
            notif.read = true;
            this.saveToLocalStorage();
        }

        if (window.Toast) window.Toast.info('Invito rifiutato');
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
            const { homeTeam, awayTeam, result, type } = e.detail || {};
            const myTeamId = window.InterfacciaCore?.currentTeamId;
            if (homeTeam?.id === myTeamId || awayTeam?.id === myTeamId) {
                const opponent = homeTeam?.id === myTeamId ? awayTeam?.name : homeTeam?.name;
                const [homeScore, awayScore] = (result || '0-0').split('-').map(s => parseInt(s));
                const myScore = homeTeam?.id === myTeamId ? homeScore : awayScore;
                const oppScore = homeTeam?.id === myTeamId ? awayScore : homeScore;
                const won = myScore > oppScore;
                const draw = myScore === oppScore;

                // Notifica in-app
                this.notify.matchResult(opponent, result, won);

                // Push browser
                const matchType = type || 'Partita';
                const title = won ? '⚽ Vittoria!' : (draw ? '⚽ Pareggio' : '⚽ Sconfitta');
                const body = `${matchType}: ${result} vs ${opponent}`;
                this.sendBrowserPush(title, body, 'match_result');
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
     * Polling per nuove notifiche (fallback se listener non disponibile)
     * Con lazyLoad attivo, il polling parte solo dopo il primo click
     */
    startPolling() {
        // Se lazyLoad e' attivo, non avviare polling automatico
        // Il listener verra' avviato al primo click sulla campanella
        if (this.config.lazyLoad) {
            console.log('[Notifiche] LazyLoad attivo - polling disabilitato, listener partira al primo click');
            return;
        }

        // Poll ogni 5 minuti (invece di 2) per risparmiare letture
        this.pollingInterval = setInterval(() => {
            this.fetchServerNotifications().then(() => this.updateUI());
        }, 300000); // 5 minuti
    },

    /**
     * Distruggi sistema notifiche
     */
    destroy() {
        this.stopRealtimeListener();
        if (this.bellButton) this.bellButton.remove();
        if (this.dropdown) this.dropdown.remove();
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this._serverNotificationsLoaded = false;
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
