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

    // ID delle notifiche eliminate (per non ricaricarle dal server)
    _deletedIds: new Set(),

    // Configurazione
    config: {
        maxNotifications: 5,          // Max 5 notifiche alla volta
        persistDays: 3,               // Elimina dopo 3 giorni
        cacheDurationMs: 5 * 60 * 1000, // 5 minuti di cache
        lazyLoad: true // Carica da server solo al click
    },

    // Tipi di notifica (6 tipi attivi)
    types: {
        draft_turn: { icon: '📋', color: 'yellow', priority: 'high' },
        draft_steal: { icon: '🏴‍☠️', color: 'red', priority: 'high' },
        trade_request: { icon: '🔄', color: 'purple', priority: 'high' },
        challenge: { icon: '⚔️', color: 'orange', priority: 'high' },
        minigame_challenge: { icon: '🎮', color: 'indigo', priority: 'high' },
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
        this.loadNotifications().catch(error => console.error('[Notifiche] Errore caricamento:', error));
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
                try {
                    const permission = await Notification.requestPermission();
                    console.log('[Push] Permesso notifiche:', permission);
                } catch (error) {
                    console.warn('[Push] Errore richiesta permesso:', error);
                }
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

        // Crea bottone campanella (trasparente, solo emoji visibile)
        this.bellButton = document.createElement('button');
        this.bellButton.id = 'notifications-bell';
        this.bellButton.className = `
            fixed z-[9998] w-10 h-10
            bg-transparent
            flex items-center justify-center
            transition-all duration-200 hover:scale-110
        `.replace(/\s+/g, ' ').trim();
        this.bellButton.style.bottom = '52px';
        this.bellButton.style.right = '0px';

        this.bellButton.innerHTML = `
            <span class="text-xl">🔔</span>
            <span id="notification-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full items-center justify-center hidden">0</span>
        `;

        // Crea dropdown (si apre verso l'alto, sopra la tab bar)
        this.dropdown = document.createElement('div');
        this.dropdown.id = 'notifications-dropdown';
        this.dropdown.className = `
            fixed z-[9997] w-80 max-h-96
            bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-600
            overflow-hidden hidden
        `.replace(/\s+/g, ' ').trim();
        this.dropdown.style.bottom = '100px';
        this.dropdown.style.right = '0px';

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
     * Ottiene la chiave localStorage specifica per la squadra corrente
     */
    getStorageKey(suffix = '') {
        const teamId = window.InterfacciaCore?.currentTeamId || 'unknown';
        return `fanta_notifications_${teamId}${suffix}`;
    },

    /**
     * Carica notifiche da localStorage (e opzionalmente Firestore)
     */
    async loadNotifications() {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) {
            console.log('[Notifiche] Nessuna squadra selezionata, skip caricamento');
            this.notifications = [];
            this.updateUI();
            return;
        }

        // Carica da localStorage con chiave specifica per squadra
        const saved = localStorage.getItem(this.getStorageKey());
        const lastFetch = parseInt(localStorage.getItem(this.getStorageKey('_fetch')) || '0');

        // Carica ID delle notifiche eliminate (specifiche per squadra)
        const deletedIds = localStorage.getItem(this.getStorageKey('_deleted'));
        if (deletedIds) {
            try {
                this._deletedIds = new Set(JSON.parse(deletedIds));
            } catch (e) {
                this._deletedIds = new Set();
            }
        } else {
            this._deletedIds = new Set();
        }

        if (saved) {
            try {
                this.notifications = JSON.parse(saved);
                // Filtra notifiche vecchie (oltre 3 giorni)
                const cutoff = Date.now() - (this.config.persistDays * 24 * 60 * 60 * 1000);
                const beforeCount = this.notifications.length;
                this.notifications = this.notifications.filter(n => {
                    // Rimuovi se troppo vecchia
                    if (n.timestamp < cutoff) return false;
                    // Rimuovi se già risposta (per sfide/inviti)
                    if (n.responded) return false;
                    return true;
                });
                // Limita a max notifiche
                if (this.notifications.length > this.config.maxNotifications) {
                    this.notifications = this.notifications.slice(0, this.config.maxNotifications);
                }
                if (beforeCount !== this.notifications.length) {
                    console.log(`[Notifiche] Pulite ${beforeCount - this.notifications.length} notifiche vecchie/risposte`);
                    this.saveToLocalStorage();
                }
            } catch (e) {
                this.notifications = [];
            }
        } else {
            this.notifications = [];
        }

        this._lastServerFetch = lastFetch;
        this._serverNotificationsLoaded = false; // Reset per nuova squadra

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

            let snapshot;
            try {
                // Query con ordinamento (richiede indice Firestore)
                const q = query(
                    collection(window.db, notifPath),
                    where('targetTeamId', '==', teamId),
                    orderBy('timestamp', 'desc'),
                    limit(15)
                );
                snapshot = await getDocs(q);
            } catch (indexError) {
                // Fallback: query senza ordinamento se indice mancante
                console.warn('[Notifiche] Indice mancante, usando query semplice:', indexError.message);
                const qSimple = query(
                    collection(window.db, notifPath),
                    where('targetTeamId', '==', teamId)
                );
                snapshot = await getDocs(qSimple);
            }
            let newCount = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const existing = this.notifications.find(n => n.id === doc.id);
                // Salta notifiche gia presenti, eliminate, o gia risposte (per inviti lega)
                if (!existing && !this._deletedIds.has(doc.id) && !data.responded) {
                    this.notifications.unshift({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toMillis?.() || Date.now()
                    });
                    newCount++;
                }
            });

            // Aggiorna timestamp fetch (specifico per squadra)
            this._lastServerFetch = Date.now();
            this._serverNotificationsLoaded = true;
            localStorage.setItem(this.getStorageKey('_fetch'), this._lastServerFetch.toString());

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

            // Prova con ordinamento, fallback a query semplice se indice mancante
            let q;
            try {
                q = query(
                    collection(window.db, notifPath),
                    where('targetTeamId', '==', teamId),
                    orderBy('timestamp', 'desc'),
                    limit(10)
                );
            } catch (e) {
                console.warn('[Notifiche] Listener: usando query senza ordinamento');
                q = query(
                    collection(window.db, notifPath),
                    where('targetTeamId', '==', teamId)
                );
            }

            this._unsubscribe = onSnapshot(q, (snapshot) => {
                let newCount = 0;
                const newNotifications = [];

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const doc = change.doc;
                        const data = doc.data();
                        const existing = this.notifications.find(n => n.id === doc.id);
                        // Salta notifiche gia presenti, eliminate, o gia risposte
                        if (!existing && !this._deletedIds.has(doc.id) && !data.responded) {
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
                        const typeConfig = this.types[notif.type] || { icon: '📢', color: 'gray', priority: 'low' };
                        if (typeConfig.priority === 'high') {
                            this.sendBrowserPush(
                                `${typeConfig.icon} ${notif.title}`,
                                notif.message,
                                notif.type
                            ).catch(err => console.warn('[Push] Errore invio:', err));
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
     * Salva notifiche in localStorage (specifico per squadra)
     */
    saveToLocalStorage() {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return; // Non salvare se non c'è squadra

        // Mantieni solo le ultime N
        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.config.maxNotifications);
        }
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.notifications));
    },

    /**
     * Salva gli ID delle notifiche eliminate (specifico per squadra)
     */
    saveDeletedIds() {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;
        localStorage.setItem(this.getStorageKey('_deleted'), JSON.stringify([...this._deletedIds]));
    },

    /**
     * Aggiunge una notifica locale
     */
    add(notification) {
        const typeConfig = this.types[notification.type] || { icon: '📢', color: 'gray', priority: 'low' };

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

        // Mantieni solo le ultime 5 notifiche
        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.config.maxNotifications);
        }

        this.saveToLocalStorage();
        this.updateUI();

        // Mostra anche toast se priorità alta
        if (typeConfig.priority === 'high' && window.Toast) {
            window.Toast.info(`${typeConfig.icon} ${notification.title}`);
        }

        return notif.id;
    },

    /**
     * Notifiche predefinite (solo 4 tipi attivi)
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

        tradeRequest(fromTeam, playerOffered) {
            window.Notifications.add({
                type: 'trade_request',
                title: 'Proposta di scambio',
                message: `${fromTeam} ti propone uno scambio`,
                action: { type: 'openTrades' }
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

        draftTurnSteal(teamName, timeRemaining) {
            window.Notifications.add({
                type: 'draft_steal',
                title: 'Puoi Rubare il Turno!',
                message: `${teamName} non ha ancora draftato. Puoi rubare il suo turno!`,
                action: { type: 'navigate', target: 'draft-content' }
            });
        },

        minigameChallengeReceived(fromTeam, challengeId, myRole) {
            const roleText = myRole === 'attacker' ? 'Attaccante' : 'Difensore';
            window.Notifications.add({
                type: 'minigame_challenge',
                title: 'Sfida Tattica!',
                message: `${fromTeam} ti sfida! Sarai ${roleText}`,
                minigameChallengeId: challengeId,
                action: { type: 'openMinigameChallenge', challengeId: challengeId }
            });
        }
        // league_invite è gestito via notifiche server, non serve helper locale
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
            const typeConfig = this.types[notif.type] || { icon: '📢', color: 'gray', priority: 'low' };
            const timeAgo = this.getTimeAgo(notif.timestamp);
            const unreadClass = notif.read ? '' : 'bg-gray-700';

            // Bottoni azione per sfide
            let actionButtons = '';
            if (notif.type === 'challenge' && notif.challengeId && !notif.responded) {
                // Escape IDs per prevenire XSS in onclick
                const safeNotifId = (notif.id || '').replace(/'/g, "\\'");
                const safeChallengeId = (notif.challengeId || '').replace(/'/g, "\\'");
                actionButtons = `
                    <div class="flex gap-2 mt-2">
                        <button onclick="event.stopPropagation(); window.Notifications.acceptChallenge('${safeNotifId}', '${safeChallengeId}')"
                                class="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            ✅ Accetta
                        </button>
                        <button onclick="event.stopPropagation(); window.Notifications.declineChallenge('${safeNotifId}', '${safeChallengeId}')"
                                class="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            ❌ Rifiuta
                        </button>
                    </div>
                `;
            }

            // Bottoni azione per inviti lega privata
            if (notif.type === 'league_invite' && notif.leagueId && !notif.responded) {
                // Escape IDs per prevenire XSS in onclick
                const safeNotifId = (notif.id || '').replace(/'/g, "\\'");
                const safeLeagueId = (notif.leagueId || '').replace(/'/g, "\\'");
                const safeInviteCode = (notif.inviteCode || '').replace(/'/g, "\\'");
                actionButtons = `
                    <div class="flex gap-2 mt-2">
                        <button onclick="event.stopPropagation(); window.Notifications.acceptLeagueInvite('${safeNotifId}', '${safeLeagueId}', '${safeInviteCode}')"
                                class="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            ✅ Accetta
                        </button>
                        <button onclick="event.stopPropagation(); window.Notifications.declineLeagueInvite('${safeNotifId}')"
                                class="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            ❌ Rifiuta
                        </button>
                    </div>
                `;
            }

            // Bottoni azione per sfide tattiche (minigame)
            if (notif.type === 'minigame_challenge' && notif.minigameChallengeId && !notif.responded) {
                actionButtons = `
                    <div class="flex gap-2 mt-2">
                        <button onclick="event.stopPropagation(); window.Notifications.acceptMinigameChallenge('${notif.id}', '${notif.minigameChallengeId}')"
                                class="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 px-2 rounded transition">
                            🎮 Accetta
                        </button>
                        <button onclick="event.stopPropagation(); window.Notifications.declineMinigameChallenge('${notif.id}', '${notif.minigameChallengeId}')"
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
            try {
                await this.fetchServerNotifications();
                this.updateUI();
                // Dopo il primo caricamento, avvia il listener realtime
                this.startRealtimeListener();
            } catch (error) {
                console.warn('[Notifiche] Errore caricamento dropdown:', error);
            }
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
        // Aggiungi tutti gli ID alla lista eliminati per non ricaricarli dal server
        this.notifications.forEach(n => this._deletedIds.add(n.id));
        this.saveDeletedIds();
        this.notifications = [];
        this.saveToLocalStorage();
        this.updateUI();
    },

    /**
     * Elimina una singola notifica
     */
    deleteNotification(notifId) {
        // Aggiungi l'ID alla lista eliminati per non ricaricarlo dal server
        this._deletedIds.add(notifId);
        this.saveDeletedIds();
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
        // Marca la notifica come risposta (locale + Firestore)
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.responded = true;
            notif.read = true;
            this.saveToLocalStorage();

            // Aggiorna anche su Firestore per evitare che riappaia
            try {
                const { doc, updateDoc } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                await updateDoc(doc(window.db, `artifacts/${appId}/public/data/notifications`, notifId), {
                    responded: true,
                    read: true
                });
            } catch (e) {
                console.warn('[Notifiche] Errore aggiornamento notifica su Firestore:', e);
            }
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
        // Marca la notifica come risposta (locale + Firestore)
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.responded = true;
            notif.read = true;
            this.saveToLocalStorage();

            // Aggiorna anche su Firestore per evitare che riappaia
            try {
                const { doc, updateDoc } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                await updateDoc(doc(window.db, `artifacts/${appId}/public/data/notifications`, notifId), {
                    responded: true,
                    read: true
                });
            } catch (e) {
                console.warn('[Notifiche] Errore aggiornamento notifica su Firestore:', e);
            }
        }

        if (window.Toast) window.Toast.info('Invito rifiutato');
        this.updateUI();
    },

    /**
     * Accetta sfida tattica (minigame) dalla notifica
     */
    async acceptMinigameChallenge(notifId, challengeId) {
        // Marca la notifica come risposta
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.responded = true;
            notif.read = true;
            this.saveToLocalStorage();
        }

        // Chiudi dropdown notifiche
        this.closeDropdown();

        // Accetta tramite SfideMultiplayer
        if (window.SfideMultiplayer) {
            try {
                const { doc, getDoc } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                const challengePath = `artifacts/${appId}/public/data/minigame-challenges`;
                const challengeDoc = await getDoc(doc(window.db, challengePath, challengeId));

                if (challengeDoc.exists()) {
                    const challenge = { id: challengeDoc.id, ...challengeDoc.data() };

                    // Verifica che la sfida sia ancora pending
                    if (challenge.status !== 'pending') {
                        if (window.Toast) window.Toast.warning('Questa sfida non e\' piu\' disponibile');
                        this.updateUI();
                        return;
                    }

                    // Accetta la sfida (il metodo e' interno a SfideMultiplayer, dobbiamo usarlo)
                    // Chiamiamo direttamente la logica di accettazione
                    const { updateDoc, Timestamp } = window.firestoreTools;

                    // Inizializza stato di gioco
                    const initialGameState = this._createMinigameInitialState(challenge);

                    await updateDoc(doc(window.db, challengePath, challengeId), {
                        status: 'in_progress',
                        acceptedAt: Timestamp.now(),
                        gameState: initialGameState
                    });

                    if (window.Toast) window.Toast.success("Sfida accettata! Partita in corso...");

                    // Avvia il minigame
                    if (window.SfideMinigame) {
                        const myTeamId = window.InterfacciaCore?.currentTeamId;
                        const myRole = challenge.attackerId === myTeamId ? 'attacker' : 'defender';

                        window.SfideMinigame.open({
                            testMode: false,
                            multiplayer: true,
                            challengeId: challengeId,
                            myRole: myRole,
                            gameState: initialGameState,
                            onMove: (move) => this._syncMinigameMove(challengeId, move),
                            onComplete: (result) => this._handleMinigameComplete(challengeId, result)
                        });
                    }
                } else {
                    if (window.Toast) window.Toast.error('Sfida non trovata o scaduta');
                }
            } catch (error) {
                console.error('Errore accettazione sfida minigame:', error);
                if (window.Toast) window.Toast.error('Errore nell\'accettare la sfida');
            }
        } else {
            if (window.Toast) window.Toast.error('Sistema sfide tattiche non disponibile');
        }

        this.updateUI();
    },

    /**
     * Rifiuta sfida tattica (minigame) dalla notifica
     */
    async declineMinigameChallenge(notifId, challengeId) {
        // Marca la notifica come risposta
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.responded = true;
            notif.read = true;
            this.saveToLocalStorage();
        }

        // Rifiuta la sfida su Firestore
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const challengePath = `artifacts/${appId}/public/data/minigame-challenges`;

            await updateDoc(doc(window.db, challengePath, challengeId), {
                status: 'declined'
            });

            if (window.Toast) window.Toast.info('Sfida rifiutata');
        } catch (error) {
            console.error('Errore rifiuto sfida minigame:', error);
        }

        this.updateUI();
    },

    /**
     * Helper: crea stato iniziale per minigame
     */
    _createMinigameInitialState(challenge) {
        const GRID_W = 13;
        const GRID_H = 9;
        const centerY = Math.floor(GRID_H / 2);

        // Genera giocatori per entrambe le squadre
        const attackerPlayers = this._generateMinigamePlayers(
            challenge.attackerId === challenge.challengerId
                ? challenge.challengerFormation
                : challenge.challengedFormation,
            'A', GRID_W, GRID_H
        );

        const defenderPlayers = this._generateMinigamePlayers(
            challenge.defenderId === challenge.challengerId
                ? challenge.challengerFormation
                : challenge.challengedFormation,
            'B', GRID_W, GRID_H
        );

        const attackerPivot = attackerPlayers.find(p => p.name === 'PIV') || attackerPlayers[attackerPlayers.length - 1];

        return {
            players: [...attackerPlayers, ...defenderPlayers],
            scoreA: 0,
            scoreB: 0,
            currentTurn: challenge.attackerId,
            movesLeft: 3,
            ballCarrierId: attackerPivot.id,
            ballPosition: null,
            lastMoveAt: Date.now(),
            isGameOver: false,
            winner: null
        };
    },

    /**
     * Helper: genera giocatori per minigame
     */
    _generateMinigamePlayers(formation, team, GRID_W, GRID_H) {
        const players = [];
        const isLeft = team === 'A';
        const centerY = Math.floor(GRID_H / 2);

        const titolari = formation?.slice(0, 5) || [];

        const rolePositions = {
            'A': {
                'P': { x: 0, y: centerY, name: 'GK', mod: 8, isGK: true },
                'D': { x: 3, y: centerY, name: 'FIX', mod: 6, isGK: false },
                'C': [
                    { x: 4, y: 1, name: 'ALA', mod: 5, isGK: false },
                    { x: 4, y: GRID_H - 2, name: 'ALA', mod: 5, isGK: false }
                ],
                'A': { x: 5, y: centerY, name: 'PIV', mod: 7, isGK: false }
            },
            'B': {
                'P': { x: GRID_W - 1, y: centerY, name: 'GK', mod: 8, isGK: true },
                'D': { x: GRID_W - 4, y: centerY, name: 'FIX', mod: 6, isGK: false },
                'C': [
                    { x: GRID_W - 5, y: 1, name: 'ALA', mod: 5, isGK: false },
                    { x: GRID_W - 5, y: GRID_H - 2, name: 'ALA', mod: 5, isGK: false }
                ],
                'A': { x: GRID_W - 6, y: centerY, name: 'PIV', mod: 7, isGK: false }
            }
        };

        let cIndex = 0;
        let playerIndex = 1;

        titolari.forEach(p => {
            const role = p.ruolo || p.assignedPosition || 'C';
            const pos = rolePositions[team][role];

            let playerPos;
            if (Array.isArray(pos)) {
                playerPos = pos[cIndex % pos.length];
                cIndex++;
            } else {
                playerPos = pos;
            }

            if (!playerPos) {
                playerPos = rolePositions[team]['C'][0];
            }

            const level = p.level || p.currentLevel || p.livello || 5;
            const mod = Math.min(10, 5 + Math.floor(level / 6));

            players.push({
                id: `${team}${playerIndex}`,
                team: team,
                name: playerPos.name,
                playerName: p.name || 'Giocatore',
                x: playerPos.x,
                y: playerPos.y,
                mod: mod,
                isGK: playerPos.isGK,
                defenseMode: null,
                defenseCells: []
            });

            playerIndex++;
        });

        // Riempi fino a 5 giocatori
        while (players.length < 5) {
            const defaultPos = rolePositions[team]['C'][players.length % 2];
            players.push({
                id: `${team}${players.length + 1}`,
                team: team,
                name: 'ALA',
                playerName: 'Riserva',
                x: defaultPos.x + (players.length % 2),
                y: defaultPos.y,
                mod: 5,
                isGK: false,
                defenseMode: null,
                defenseCells: []
            });
        }

        return players;
    },

    /**
     * Helper: sincronizza mossa minigame
     */
    async _syncMinigameMove(challengeId, gameState) {
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const challengePath = `artifacts/${appId}/public/data/minigame-challenges`;

            await updateDoc(doc(window.db, challengePath, challengeId), {
                gameState: gameState,
                'gameState.lastMoveAt': Date.now()
            });
        } catch (error) {
            console.error('[Notifiche] Errore sync mossa minigame:', error);
        }
    },

    /**
     * Helper: gestisce fine partita minigame
     */
    async _handleMinigameComplete(challengeId, result) {
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const challengePath = `artifacts/${appId}/public/data/minigame-challenges`;

            await updateDoc(doc(window.db, challengePath, challengeId), {
                status: 'completed',
                result: {
                    scoreA: result.scoreA,
                    scoreB: result.scoreB,
                    winner: result.winner
                }
            });
        } catch (error) {
            console.error('[Notifiche] Errore completamento minigame:', error);
        }
    },

    /**
     * Setup event listeners (solo per i 4 tipi attivi)
     */
    setupListeners() {
        // Ascolta turno draft
        document.addEventListener('draftTurnStarted', (e) => {
            if (e.detail?.teamId === window.InterfacciaCore?.currentTeamId) {
                this.notify.draftTurn();
            }
        });

        // Ascolta sfide ricevute
        document.addEventListener('challengeReceived', (e) => {
            if (e.detail) {
                this.notify.challengeReceived(e.detail.fromTeam, e.detail.betAmount || 0);
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

        // Ascolta cambio squadra
        document.addEventListener('teamChanged', () => {
            console.log('[Notifiche] Cambio squadra rilevato, ricarico notifiche');
            this.stopRealtimeListener();
            this._serverNotificationsLoaded = false;
            this.loadNotifications();
        });
    },

    /**
     * Ricarica notifiche per la squadra corrente (chiamare dopo cambio squadra)
     */
    reloadForCurrentTeam() {
        console.log('[Notifiche] Ricarico notifiche per nuova squadra');
        this.stopRealtimeListener();
        this._serverNotificationsLoaded = false;
        this._deletedIds = new Set();
        this.notifications = [];
        this.loadNotifications();
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
            this.fetchServerNotifications()
                .then(() => this.updateUI())
                .catch(error => console.error('[Notifiche] Errore polling:', error));
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
