//
// ====================================================================
// CHAT.JS - Sistema Chat Lega
// ====================================================================
//

window.Chat = {
    // Container elementi UI
    panel: null,
    chatButton: null,
    isOpen: false,
    currentChannel: 'global',

    // Messaggi
    messages: [],
    unreadCount: 0,

    // Listener real-time
    unsubscribe: null,

    // Configurazione
    config: {
        maxMessages: 20,           // Ridotto da 50 a 20 per risparmiare Firebase reads
        maxMessageLength: 500,
        inactivityTimeoutMs: 5 * 60 * 1000  // 5 minuti di inattivita' prima di chiudere il listener
    },

    // Timer per inattivita'
    _inactivityTimer: null,
    _listenerPaused: false,

    // Drag state
    _isDragging: false,
    _dragStartX: 0,
    _dragStartY: 0,
    _buttonStartX: 0,
    _buttonStartY: 0,
    _hasMoved: false,

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

        // Ripristina stato nascosto se era stato nascosto
        if (localStorage.getItem('chat_button_hidden') === 'true') {
            this.hideChatButton();
        }

        console.log("Chat inizializzata");
    },

    /**
     * Crea l'interfaccia chat
     */
    createUI() {
        // Rimuovi se esiste
        const existing = document.getElementById('chat-container');
        if (existing) existing.remove();
        const existingButton = document.getElementById('chat-button');
        if (existingButton) existingButton.remove();
        const existingShow = document.getElementById('chat-show-button');
        if (existingShow) existingShow.remove();

        // Carica posizione salvata
        const savedPos = this.loadPosition();

        // Bottone chat flottante (trascinabile)
        this.chatButton = document.createElement('button');
        this.chatButton.id = 'chat-button';
        this.chatButton.className = `
            fixed z-[9997] w-12 h-12
            bg-cyan-600/90 hover:bg-cyan-500
            rounded-full shadow-lg
            flex items-center justify-center
            transition-colors duration-200
            touch-none select-none cursor-grab active:cursor-grabbing
        `.replace(/\s+/g, ' ').trim();
        this.chatButton.style.left = savedPos.x + 'px';
        this.chatButton.style.top = savedPos.y + 'px';
        this.chatButton.innerHTML = `
            <span class="text-xl pointer-events-none">💬</span>
            <span id="chat-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full items-center justify-center hidden pointer-events-none">0</span>
            <span class="absolute -bottom-1 -left-1 w-4 h-4 bg-gray-700 text-white text-[8px] rounded-full flex items-center justify-center pointer-events-none opacity-60">✕</span>
        `;

        // Bottone per mostrare chat (quando nascosta)
        const showButton = document.createElement('button');
        showButton.id = 'chat-show-button';
        showButton.className = `
            fixed bottom-4 left-4 z-[9997] w-8 h-8
            bg-cyan-600/50 hover:bg-cyan-500
            rounded-full shadow-lg
            flex items-center justify-center
            transition-all duration-200 hover:scale-110
            hidden
        `.replace(/\s+/g, ' ').trim();
        showButton.innerHTML = `<span class="text-sm">💬</span>`;
        showButton.addEventListener('click', () => this.showChatButton());

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

        document.body.appendChild(this.chatButton);
        document.body.appendChild(showButton);
        document.body.appendChild(this.panel);

        // Setup drag events
        this.setupDragEvents();

        // Event listeners
        document.getElementById('chat-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('chat-input').addEventListener('input', (e) => {
            document.getElementById('chat-char-count').textContent = e.target.value.length;
        });
    },

    /**
     * Setup eventi drag per il bottone chat
     */
    setupDragEvents() {
        const btn = this.chatButton;
        if (!btn) return;

        // Mouse events
        btn.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', (e) => this.endDrag(e));

        // Touch events
        btn.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onDrag(e), { passive: false });
        document.addEventListener('touchend', (e) => this.endDrag(e));
    },

    /**
     * Inizia trascinamento
     */
    startDrag(e) {
        if (this.isOpen) return; // Non trascinare se chat aperta

        this._isDragging = true;
        this._hasMoved = false;

        const touch = e.touches ? e.touches[0] : e;
        this._dragStartX = touch.clientX;
        this._dragStartY = touch.clientY;

        const rect = this.chatButton.getBoundingClientRect();
        this._buttonStartX = rect.left;
        this._buttonStartY = rect.top;

        this.chatButton.style.transition = 'none';
        e.preventDefault();
    },

    /**
     * Durante trascinamento
     */
    onDrag(e) {
        if (!this._isDragging) return;

        const touch = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - this._dragStartX;
        const deltaY = touch.clientY - this._dragStartY;

        // Considera movimento solo se > 5px
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            this._hasMoved = true;
        }

        let newX = this._buttonStartX + deltaX;
        let newY = this._buttonStartY + deltaY;

        // Limiti schermo
        const btnSize = 48;
        newX = Math.max(0, Math.min(window.innerWidth - btnSize, newX));
        newY = Math.max(0, Math.min(window.innerHeight - btnSize, newY));

        this.chatButton.style.left = newX + 'px';
        this.chatButton.style.top = newY + 'px';

        e.preventDefault();
    },

    /**
     * Fine trascinamento
     */
    endDrag(e) {
        if (!this._isDragging) return;

        this._isDragging = false;
        this.chatButton.style.transition = '';

        // Salva posizione
        const rect = this.chatButton.getBoundingClientRect();

        // Se trascinato fuori dal bordo sinistro, nascondi
        if (rect.left < -20 && this._hasMoved) {
            this.hideChatButton();
            return;
        }

        this.savePosition(rect.left, rect.top);

        // Se non si e' mosso, era un click
        if (!this._hasMoved) {
            this.toggle();
        }
    },

    /**
     * Salva posizione bottone
     */
    savePosition(x, y) {
        localStorage.setItem('chat_button_pos', JSON.stringify({ x, y }));
    },

    /**
     * Carica posizione bottone
     */
    loadPosition() {
        try {
            const saved = localStorage.getItem('chat_button_pos');
            if (saved) {
                const pos = JSON.parse(saved);
                // Verifica che sia dentro lo schermo
                const btnSize = 48;
                pos.x = Math.max(0, Math.min(window.innerWidth - btnSize, pos.x));
                pos.y = Math.max(0, Math.min(window.innerHeight - btnSize, pos.y));
                return pos;
            }
        } catch (e) {}
        // Default: bottom-left
        return { x: 16, y: window.innerHeight - 64 };
    },

    /**
     * Nascondi bottone chat
     */
    hideChatButton() {
        if (this.chatButton) {
            this.chatButton.classList.add('hidden');
        }
        const showBtn = document.getElementById('chat-show-button');
        if (showBtn) {
            showBtn.classList.remove('hidden');
        }
        localStorage.setItem('chat_button_hidden', 'true');
    },

    /**
     * Mostra bottone chat
     */
    showChatButton() {
        if (this.chatButton) {
            this.chatButton.classList.remove('hidden');
        }
        const showBtn = document.getElementById('chat-show-button');
        if (showBtn) {
            showBtn.classList.add('hidden');
        }
        localStorage.removeItem('chat_button_hidden');
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

        // Riavvia listener se era in pausa
        if (this._listenerPaused) {
            this.resumeListener();
        }

        // Reset timer inattivita'
        this.resetInactivityTimer();
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

        // Se admin, usa nome speciale "Presidente Lega"
        // Altrimenti prendi il nome dalla squadra corrente
        let teamName = 'Anonimo';
        if (isAdmin) {
            teamName = 'Presidente Lega';
        } else {
            // Ottieni i dati squadra
            const teamData = window.InterfacciaCore?.currentTeamData;
            const sessionTeamName = localStorage.getItem('fanta_session_team_name');

            // Debug
            console.log("Chat DEBUG - teamData:", teamData);
            console.log("Chat DEBUG - teamData.teamName:", teamData?.teamName);
            console.log("Chat DEBUG - sessionTeamName:", sessionTeamName);
            console.log("Chat DEBUG - teamId:", teamId);

            // Ordine di priorita per ottenere il nome squadra:
            if (teamData && teamData.teamName && teamData.teamName !== '') {
                teamName = teamData.teamName;
            } else if (sessionTeamName && sessionTeamName !== '') {
                teamName = sessionTeamName;
            } else if (teamId && teamId !== 'unknown' && teamId !== '') {
                // teamId e' spesso il nome squadra usato come ID documento
                teamName = teamId;
            }
        }

        console.log("Chat sendMessage - FINAL teamName:", teamName);

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

        // Reset timer inattivita' (l'utente e' attivo)
        this.resetInactivityTimer();

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

            // Query per ultimi 20 messaggi ordinati per timestamp (ridotto da 50 per risparmiare reads)
            const chatCollection = collection(window.db, chatPath);
            const q = query(
                chatCollection,
                orderBy('timestamp', 'desc'),
                limit(this.config.maxMessages)
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

                // Mantieni solo ultimi N messaggi (config.maxMessages)
                const finalMessages = newMessages.slice(-this.config.maxMessages);

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
            author: 'Presidente Lega',
            authorId: 'admin',
            content: 'Benvenuti nella chat della lega! Scrivete qui per comunicare con tutti i manager.',
            timestamp: Date.now(),
            channel: 'global'
        }];
        this.renderMessages();
    },

    /**
     * Reset timer inattivita' - chiamato quando l'utente interagisce con la chat
     */
    resetInactivityTimer() {
        // Cancella timer esistente
        if (this._inactivityTimer) {
            clearTimeout(this._inactivityTimer);
            this._inactivityTimer = null;
        }

        // Imposta nuovo timer solo se la chat e' aperta
        if (this.isOpen) {
            this._inactivityTimer = setTimeout(() => {
                console.log('[Chat] Timeout inattivita - pausa listener per risparmiare risorse');
                this.pauseListener();
            }, this.config.inactivityTimeoutMs);
        }
    },

    /**
     * Pausa il listener real-time per risparmiare risorse Firebase
     */
    pauseListener() {
        if (this.unsubscribe && !this._listenerPaused) {
            this.unsubscribe();
            this.unsubscribe = null;
            this._listenerPaused = true;
            console.log('[Chat] Listener in pausa per inattivita');

            // Mostra messaggio all'utente
            const container = document.getElementById('chat-messages');
            if (container && this.isOpen) {
                const pauseNotice = document.createElement('div');
                pauseNotice.id = 'chat-pause-notice';
                pauseNotice.className = 'text-center py-3 px-4 bg-yellow-600/20 border border-yellow-500/50 rounded-lg mx-2 my-2';
                pauseNotice.innerHTML = `
                    <p class="text-yellow-400 text-sm">Chat in pausa per inattivita'</p>
                    <button onclick="window.Chat.resumeListener()" class="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs rounded">
                        Riattiva Chat
                    </button>
                `;
                container.appendChild(pauseNotice);
                container.scrollTop = container.scrollHeight;
            }
        }
    },

    /**
     * Riprendi il listener real-time
     */
    resumeListener() {
        if (this._listenerPaused) {
            console.log('[Chat] Riattivazione listener...');

            // Rimuovi notice di pausa
            const pauseNotice = document.getElementById('chat-pause-notice');
            if (pauseNotice) pauseNotice.remove();

            // Riavvia listener
            this._listenerPaused = false;
            this.startRealtimeListener();

            // Reset timer
            this.resetInactivityTimer();
        }
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

        // Cancella timer inattivita'
        if (this._inactivityTimer) {
            clearTimeout(this._inactivityTimer);
            this._inactivityTimer = null;
        }

        this._listenerPaused = false;

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
