//
// ====================================================================
// CHAT.JS - Sistema Chat Lega
// ====================================================================
//

window.Chat = {
    // Container elementi UI
    panel: null,
    isOpen: false,
    currentChannel: 'global',

    // Messaggi
    messages: [],
    unreadCount: 0,

    // Listener real-time
    unsubscribe: null,

    // Configurazione
    config: {
        maxMessages: 100,
        maxMessageLength: 500
    },

    /**
     * Inizializza la chat
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('chat')) {
            console.log("Chat disabilitata");
            return;
        }

        this.createUI();
        this.startRealtimeListener();
        this.setupListeners();

        console.log("Chat inizializzata");
    },

    /**
     * Crea l'interfaccia chat
     */
    createUI() {
        // Rimuovi se esiste
        const existing = document.getElementById('chat-container');
        if (existing) existing.remove();

        // Bottone chat flottante
        const chatButton = document.createElement('button');
        chatButton.id = 'chat-button';
        chatButton.className = `
            fixed bottom-4 left-4 z-[9997] w-14 h-14
            bg-cyan-600 hover:bg-cyan-500
            rounded-full shadow-lg
            flex items-center justify-center
            transition-all duration-200 hover:scale-110
        `.replace(/\s+/g, ' ').trim();
        chatButton.innerHTML = `
            <span class="text-2xl">💬</span>
            <span id="chat-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full items-center justify-center hidden">0</span>
        `;

        // Pannello chat
        this.panel = document.createElement('div');
        this.panel.id = 'chat-container';
        this.panel.className = `
            fixed bottom-20 left-4 z-[9996]
            w-80 md:w-96 h-[500px]
            bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-600
            flex flex-col overflow-hidden
            hidden
        `.replace(/\s+/g, ' ').trim();

        this.panel.innerHTML = `
            <!-- Header -->
            <div class="p-3 bg-gray-700 border-b border-gray-600 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-xl">💬</span>
                    <h3 class="font-bold text-white">Chat Lega</h3>
                </div>
                <span class="text-xs text-gray-400">Chat Globale</span>
            </div>

            <!-- Lista Messaggi -->
            <div id="chat-messages" class="flex-1 overflow-y-auto p-3 space-y-3">
                <p class="text-center text-gray-500 py-4">Nessun messaggio</p>
            </div>

            <!-- Input -->
            <div class="p-3 bg-gray-700 border-t border-gray-600">
                <div class="flex gap-2">
                    <input type="text" id="chat-input"
                        class="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="Scrivi un messaggio..."
                        maxlength="500">
                    <button id="chat-send"
                        class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-semibold">
                        📤
                    </button>
                </div>
                <p class="text-xs text-gray-500 mt-1"><span id="chat-char-count">0</span>/500</p>
            </div>
        `;

        document.body.appendChild(chatButton);
        document.body.appendChild(this.panel);

        // Event listeners
        chatButton.addEventListener('click', () => this.toggle());

        document.getElementById('chat-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('chat-input').addEventListener('input', (e) => {
            document.getElementById('chat-char-count').textContent = e.target.value.length;
        });
    },

    /**
     * Toggle pannello chat
     */
    toggle() {
        if (this.panel.classList.contains('hidden')) {
            this.open();
        } else {
            this.close();
        }
    },

    /**
     * Apri chat
     */
    open() {
        this.panel.classList.remove('hidden');
        this.isOpen = true;
        this.markAsRead();
        document.getElementById('chat-input').focus();
    },

    /**
     * Chiudi chat
     */
    close() {
        this.panel.classList.add('hidden');
        this.isOpen = false;
    },


    /**
     * Renderizza messaggi
     */
    renderMessages() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        if (this.messages.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-4">Nessun messaggio</p>';
            return;
        }

        const myTeamId = window.InterfacciaCore?.currentTeamId;

        container.innerHTML = this.messages.map(msg => {
            const isMe = msg.authorId === myTeamId;
            const isAdmin = msg.authorId === 'admin';
            const time = this.formatTime(msg.timestamp);

            // Colori in base al tipo di utente
            let nameColorClass = 'text-green-400';
            let bubbleColorClass = 'bg-gray-700';

            if (isMe) {
                nameColorClass = 'text-cyan-400';
                bubbleColorClass = 'bg-cyan-600';
            } else if (isAdmin) {
                nameColorClass = 'text-yellow-400';
                bubbleColorClass = 'bg-gradient-to-r from-yellow-600 to-amber-600';
            }

            return `
                <div class="chat-message">
                    <!-- Nome squadra sopra il messaggio -->
                    <p class="text-xs ${isMe ? 'text-right' : 'text-left'} ${nameColorClass} font-semibold mb-1">
                        ${isAdmin ? '👑 ' : ''}${this.escapeHtml(msg.author)}
                    </p>
                    <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                        <div class="max-w-[85%] ${bubbleColorClass} rounded-lg p-2 px-3 ${isAdmin ? 'border border-yellow-500' : ''}">
                            <p class="text-white text-sm break-words">${this.escapeHtml(msg.content)}</p>
                            <p class="text-xs ${isMe ? 'text-cyan-200' : (isAdmin ? 'text-yellow-200' : 'text-gray-400')} text-right mt-1">${time}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Invia messaggio
     */
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();

        if (!content) return;
        if (content.length > this.config.maxMessageLength) {
            if (window.Toast) window.Toast.warning("Messaggio troppo lungo");
            return;
        }

        const teamId = window.InterfacciaCore?.currentTeamId || 'unknown';
        const isAdmin = teamId === 'admin';

        // Se admin, usa nome speciale "Presidente Lega Seria"
        // Altrimenti prendi il nome dalla squadra corrente
        let teamName = 'Anonimo';
        if (isAdmin) {
            teamName = 'Presidente Lega Seria';
        } else {
            // Prova diversi modi per ottenere il nome squadra
            teamName = window.InterfacciaCore?.currentTeamData?.teamName
                    || window.InterfacciaCore?.currentTeamData?.name
                    || window.InterfacciaCore?.getCurrentTeam?.()?.teamName
                    || window.InterfacciaCore?.getCurrentTeam?.()?.name
                    || 'Anonimo';
        }

        console.log("Chat sendMessage - teamId:", teamId, "teamName:", teamName);

        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            author: teamName,
            authorId: teamId,
            content: content,
            timestamp: Date.now(),
            channel: this.currentChannel
        };

        // Aggiungi localmente
        this.messages.push(message);
        this.renderMessages();
        input.value = '';
        document.getElementById('chat-char-count').textContent = '0';

        // Invia a Firestore
        await this.saveToFirestore(message);
    },

    /**
     * Salva messaggio su Firestore
     */
    async saveToFirestore(message) {
        if (!window.db || !window.firestoreTools) {
            console.warn("Firestore non disponibile, messaggio salvato solo localmente");
            return false;
        }

        try {
            const { collection, addDoc, Timestamp } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const chatPath = `artifacts/${appId}/public/data/chat`;

            console.log("Salvataggio messaggio chat su:", chatPath);

            // Usa Timestamp.now() se disponibile, altrimenti Date.now()
            const timestamp = Timestamp?.now?.() || new Date();

            const docRef = await addDoc(collection(window.db, chatPath), {
                author: message.author,
                authorId: message.authorId,
                content: message.content,
                channel: message.channel || 'global',
                timestamp: timestamp
            });

            console.log("Messaggio salvato con ID:", docRef.id);
            return true;
        } catch (error) {
            console.error("Errore salvataggio messaggio:", error);
            if (window.Toast) {
                window.Toast.error("Errore invio messaggio");
            }
            return false;
        }
    },

    /**
     * Formatta timestamp
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) +
                   ' ' + date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        }
    },

    /**
     * Escape HTML per sicurezza
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Segna messaggi come letti
     */
    markAsRead() {
        this.unreadCount = 0;
        const badge = document.getElementById('chat-badge');
        if (badge) {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
        }
    },

    /**
     * Aggiorna badge messaggi non letti
     */
    updateBadge(count) {
        this.unreadCount = count;
        const badge = document.getElementById('chat-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.remove('hidden');
                badge.classList.add('flex');
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
            }
        }
    },

    /**
     * Avvia listener real-time per messaggi
     */
    startRealtimeListener() {
        if (!window.db || !window.firestoreTools) {
            console.warn("Firestore non disponibile per chat real-time");
            this.showWelcomeMessage();
            return;
        }

        try {
            const { collection, query, orderBy, limit, onSnapshot, getDocs } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const chatPath = `artifacts/${appId}/public/data/chat`;

            console.log("Avvio listener chat real-time su:", chatPath);

            // Query per ultimi 50 messaggi ordinati per timestamp
            const chatCollection = collection(window.db, chatPath);
            const q = query(
                chatCollection,
                orderBy('timestamp', 'desc'),
                limit(50)
            );

            // Mostra loading iniziale
            const container = document.getElementById('chat-messages');
            if (container) {
                container.innerHTML = `
                    <div class="flex items-center justify-center py-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent"></div>
                    </div>
                `;
            }

            // Listener real-time con onSnapshot
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                console.log("Chat onSnapshot triggered, docs:", snapshot.docs.length);

                const newMessages = [];

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Filtra solo messaggi global
                    if (data.channel === 'global' || !data.channel) {
                        newMessages.push({
                            id: doc.id,
                            author: data.author || 'Anonimo',
                            authorId: data.authorId || 'unknown',
                            content: data.content || '',
                            channel: data.channel || 'global',
                            timestamp: data.timestamp?.toMillis?.() || data.timestamp || Date.now()
                        });
                    }
                });

                // Ordina per timestamp crescente (piu' vecchi prima)
                newMessages.sort((a, b) => a.timestamp - b.timestamp);

                // Mantieni solo ultimi 50
                const finalMessages = newMessages.slice(-50);

                const previousCount = this.messages.length;
                this.messages = finalMessages;

                // Se non ci sono messaggi, mostra benvenuto
                if (this.messages.length === 0) {
                    this.showWelcomeMessage();
                    return;
                }

                // Aggiorna UI
                this.renderMessages();

                // Se chat chiusa e ci sono nuovi messaggi, aggiorna badge
                if (!this.isOpen && this.messages.length > previousCount && previousCount > 0) {
                    const newCount = this.messages.filter(m =>
                        m.timestamp > (this.lastReadTimestamp || 0) &&
                        m.authorId !== window.InterfacciaCore?.currentTeamId
                    ).length;
                    if (newCount > 0) {
                        this.updateBadge(newCount);
                    }
                }

                console.log(`Chat: ${this.messages.length} messaggi caricati in real-time`);
            }, (error) => {
                console.error("Errore listener chat real-time:", error);
                // Se errore (es. indice mancante), mostra messaggio
                this.showWelcomeMessage();
            });

        } catch (error) {
            console.error("Errore setup listener real-time:", error);
            this.showWelcomeMessage();
        }
    },

    /**
     * Mostra messaggio di benvenuto
     */
    showWelcomeMessage() {
        this.messages = [{
            id: 'welcome',
            author: 'Presidente Lega Seria',
            authorId: 'admin',
            content: 'Benvenuti nella chat della lega! Scrivete qui per comunicare con tutti i manager.',
            timestamp: Date.now(),
            channel: 'global'
        }];
        this.renderMessages();
    },

    /**
     * Setup listeners
     */
    setupListeners() {
        document.addEventListener('featureFlagChanged', (e) => {
            if (e.detail?.flagId === 'chat') {
                if (e.detail.enabled) {
                    this.init();
                } else {
                    this.destroy();
                }
            }
        });
    },

    /**
     * Distruggi chat
     */
    destroy() {
        // Rimuovi listener real-time
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        const button = document.getElementById('chat-button');
        if (button) button.remove();
        if (this.panel) this.panel.remove();
        this.panel = null;
        this.messages = [];
    }
};

// Init quando feature flags sono pronti
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.FeatureFlags?.isEnabled('chat')) {
            window.Chat.init();
        }
    }, 1000);
});

console.log("Modulo Chat caricato.");
