//
// ====================================================================
// PROACTIVE-NOTIFICATIONS.JS - Sistema Notifiche Proattive
// ====================================================================
// Gestisce notifiche push per eventi imminenti:
// - 1 ora prima scadenza schedina
// - 1 ora prima simulazione partita
// - Quando il draft apre
// - Quando e' il turno dell'utente di draftare (browser push)
// - Quando l'utente puo rubare il turno del draft
// ====================================================================
//

window.ProactiveNotifications = {

    // Timer per i controlli periodici
    _checkInterval: null,
    _checkIntervalMs: 60000, // Controlla ogni minuto

    // Cache per evitare notifiche duplicate
    _notifiedEvents: {},

    /**
     * Inizializza il sistema di notifiche proattive
     */
    init() {
        // Richiedi permesso notifiche
        this.requestNotificationPermission();

        // Avvia controllo periodico
        this.startPeriodicCheck();

        // Ascolta eventi real-time
        this.setupEventListeners();

        console.log('[ProactiveNotifications] Sistema inizializzato');
    },

    /**
     * Richiede permesso per notifiche push
     */
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('[ProactiveNotifications] Browser non supporta notifiche');
            return false;
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return Notification.permission === 'granted';
    },

    /**
     * Invia una notifica push del browser
     */
    async sendBrowserPush(title, body, tag, onClick = null) {
        if (!('Notification' in window)) return;

        if (Notification.permission !== 'granted') {
            const granted = await this.requestNotificationPermission();
            if (!granted) return;
        }

        try {
            const notification = new Notification(title, {
                body: body,
                icon: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/serie%20sera%20256.png',
                badge: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/serie%20sera%20256.png',
                tag: tag,
                requireInteraction: true,
                vibrate: [200, 100, 200]
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
                if (onClick) onClick();
            };

            // Auto-chiudi dopo 30 secondi
            setTimeout(() => notification.close(), 30000);

        } catch (error) {
            console.error('[ProactiveNotifications] Errore invio notifica:', error);
        }
    },

    /**
     * Avvia il controllo periodico degli eventi imminenti
     */
    startPeriodicCheck() {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
        }

        // Esegui subito un check
        this.checkUpcomingEvents();

        // Poi ogni minuto
        this._checkInterval = setInterval(() => {
            this.checkUpcomingEvents();
        }, this._checkIntervalMs);
    },

    /**
     * Ferma il controllo periodico
     */
    stopPeriodicCheck() {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
            this._checkInterval = null;
        }
    },

    /**
     * Controlla tutti gli eventi imminenti
     */
    async checkUpcomingEvents() {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            // Controlla in parallelo
            await Promise.all([
                this.checkSchedinaDeadline(),
                this.checkSimulationTime(),
                this.checkDraftStatus()
            ]);
        } catch (error) {
            console.warn('[ProactiveNotifications] Errore check eventi:', error);
        }
    },

    /**
     * Controlla se la schedina scade entro 1 ora
     * La schedina scade N minuti prima della simulazione (default: 60 min)
     * Simulazione alle 20:30 -> Deadline 19:30
     */
    async checkSchedinaDeadline() {
        if (!window.FeatureFlags?.isEnabled('schedina')) return;
        if (!window.Schedina) return;

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            // Carica config schedina per sapere i minuti di chiusura
            const config = await window.Schedina.loadConfig?.();
            const closingMinutes = config?.closingMinutesBeforeSimulation || 60;

            // Calcola deadline: simulazione (20:30) meno i minuti di chiusura
            const now = new Date();
            const simulationTime = new Date();
            simulationTime.setHours(20, 30, 0, 0);

            // Se siamo gia' passati, considera domani
            if (now > simulationTime) {
                simulationTime.setDate(simulationTime.getDate() + 1);
            }

            // Deadline = simulazione - closingMinutes
            const deadlineTime = new Date(simulationTime.getTime() - (closingMinutes * 60 * 1000));
            const timeUntilDeadline = deadlineTime.getTime() - now.getTime();
            const oneHour = 60 * 60 * 1000;

            // Notifica se manca meno di 1 ora alla deadline
            if (timeUntilDeadline > 0 && timeUntilDeadline <= oneHour) {
                const dateKey = deadlineTime.toDateString();
                const notifKey = `schedina_deadline_${dateKey}`;

                if (!this._notifiedEvents[notifKey]) {
                    this._notifiedEvents[notifKey] = true;

                    const minutes = Math.round(timeUntilDeadline / 60000);
                    const deadlineHour = deadlineTime.getHours();
                    const deadlineMin = deadlineTime.getMinutes().toString().padStart(2, '0');

                    this.sendBrowserPush(
                        'Schedina in scadenza!',
                        `Hai ancora ${minutes} minuti (entro le ${deadlineHour}:${deadlineMin})`,
                        'schedina_deadline',
                        () => window.SchedinaUI?.open()
                    );

                    // Notifica anche in-app
                    if (window.Notifications?.add) {
                        window.Notifications.add({
                            type: 'schedina',
                            title: 'Schedina in Scadenza',
                            message: `Hai ancora ${minutes} minuti per compilare la schedina`,
                            priority: 'high',
                            onClick: () => window.SchedinaUI?.open()
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('[ProactiveNotifications] Errore check schedina:', error);
        }
    },

    /**
     * Controlla se manca 1 ora alla simulazione
     */
    async checkSimulationTime() {
        try {
            const automationState = await window.AutomazioneSimulazioni?.loadAutomationState?.();
            if (!automationState?.isEnabled) return;

            // L'orario di simulazione e' 20:30
            const now = new Date();
            const simulationTime = new Date();
            simulationTime.setHours(20, 30, 0, 0);

            // Se siamo gia' passati, considera domani
            if (now > simulationTime) {
                simulationTime.setDate(simulationTime.getDate() + 1);
            }

            const timeUntilSimulation = simulationTime.getTime() - now.getTime();
            const oneHour = 60 * 60 * 1000;

            // Notifica se manca meno di 1 ora
            if (timeUntilSimulation > 0 && timeUntilSimulation <= oneHour) {
                const dateKey = simulationTime.toDateString();
                const notifKey = `simulation_${dateKey}`;

                if (!this._notifiedEvents[notifKey]) {
                    this._notifiedEvents[notifKey] = true;

                    const minutes = Math.round(timeUntilSimulation / 60000);
                    const nextType = automationState.nextSimulationType || 'campionato';
                    const typeLabel = nextType.includes('coppa') ? 'Coppa' : 'Campionato';

                    this.sendBrowserPush(
                        `Partita tra ${minutes} minuti`,
                        `La simulazione di ${typeLabel} iniziera' alle 20:30`,
                        'simulation_reminder'
                    );

                    // Notifica anche in-app
                    if (window.Notifications?.add) {
                        window.Notifications.add({
                            type: 'match_reminder',
                            title: `Partita tra ${minutes} minuti`,
                            message: `La simulazione di ${typeLabel} iniziera' alle 20:30. Controlla la tua formazione!`,
                            priority: 'high'
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('[ProactiveNotifications] Errore check simulazione:', error);
        }
    },

    /**
     * Controlla lo stato del draft
     */
    async checkDraftStatus() {
        try {
            const configData = await window.ConfigListener?.getConfig?.();
            if (!configData) return;

            const teamId = window.InterfacciaCore?.currentTeamId;
            if (!teamId) return;

            const draftTurns = configData.draftTurns;
            const isDraftOpen = configData.isDraftOpen;
            const isDraftActive = draftTurns && draftTurns.isActive;

            // Notifica apertura draft
            if (isDraftOpen && isDraftActive) {
                const notifKey = `draft_open_${draftTurns.createdAt || 'active'}`;
                if (!this._notifiedEvents[notifKey]) {
                    this._notifiedEvents[notifKey] = true;

                    // Controlla se e' il turno dell'utente
                    const currentRound = draftTurns.currentRound || 1;
                    const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
                    const currentOrder = draftTurns[orderKey] || [];
                    const currentTeamId = draftTurns.currentTeamId;

                    const isMyTurn = currentTeamId === teamId;
                    const canSteal = draftTurns.turnExpired && currentTeamId !== teamId;

                    if (isMyTurn) {
                        // E' il mio turno
                        this.sendBrowserPush(
                            'E\' il tuo turno nel Draft!',
                            'Scegli un giocatore per la tua squadra',
                            'draft_my_turn',
                            () => this.openDraftPanel()
                        );
                    } else if (canSteal) {
                        // Posso rubare
                        const victimTeam = currentOrder.find(t => t.teamId === currentTeamId);
                        const victimName = victimTeam?.teamName || 'un avversario';

                        this.sendBrowserPush(
                            'Puoi rubare il turno!',
                            `${victimName} ha fatto scadere il timer. Ruba il turno!`,
                            'draft_steal_available',
                            () => this.openDraftPanel()
                        );
                    }
                }
            }

            // Reset notifiche quando draft chiuso
            if (!isDraftOpen || !isDraftActive) {
                // Pulisci notifiche draft obsolete
                Object.keys(this._notifiedEvents).forEach(key => {
                    if (key.startsWith('draft_')) {
                        delete this._notifiedEvents[key];
                    }
                });
            }

        } catch (error) {
            console.warn('[ProactiveNotifications] Errore check draft:', error);
        }
    },

    /**
     * Apre il pannello draft
     */
    openDraftPanel() {
        const draftContent = document.getElementById('draft-content');
        if (draftContent && window.showScreen) {
            window.showScreen(draftContent);
            document.dispatchEvent(new CustomEvent('draftPanelLoaded', {
                detail: { mode: 'utente', teamId: window.InterfacciaCore?.currentTeamId }
            }));
        }
    },

    /**
     * Setup listener per eventi real-time
     */
    setupEventListeners() {
        // Quando il draft apre
        document.addEventListener('draftStatusChanged', (e) => {
            if (e.detail?.isOpen) {
                this.sendBrowserPush(
                    'Draft Aperto!',
                    'Il draft e\' iniziato! Entra per scegliere i tuoi giocatori',
                    'draft_opened',
                    () => this.openDraftPanel()
                );
            }
        });

        // Quando e' il mio turno nel draft
        document.addEventListener('draftTurnStarted', (e) => {
            const teamId = window.InterfacciaCore?.currentTeamId;
            if (e.detail?.teamId === teamId) {
                this.sendBrowserPush(
                    'Tocca a te!',
                    'E\' il tuo turno nel draft. Scegli un giocatore!',
                    'draft_your_turn',
                    () => this.openDraftPanel()
                );
            }
        });

        // Quando qualcuno fa scadere il turno (posso rubare)
        document.addEventListener('draftTurnExpired', (e) => {
            const teamId = window.InterfacciaCore?.currentTeamId;
            const victimId = e.detail?.victimTeamId;

            // Non notificare se sono io quello che ha fatto scadere
            if (victimId !== teamId) {
                const victimName = e.detail?.victimTeamName || 'Un avversario';
                this.sendBrowserPush(
                    'Turno rubabile!',
                    `${victimName} ha fatto scadere il timer. Puoi rubare il turno!`,
                    'draft_steal',
                    () => this.openDraftPanel()
                );
            }
        });

        // Risultato partita (gia gestito in notifications.js, ma aggiungo push esplicito)
        document.addEventListener('matchSimulated', (e) => {
            const { homeTeam, awayTeam, result, type } = e.detail || {};
            const myTeamId = window.InterfacciaCore?.currentTeamId;

            if (homeTeam?.id === myTeamId || awayTeam?.id === myTeamId) {
                const [homeScore, awayScore] = (result || '0-0').split('-').map(s => parseInt(s));
                const isHome = homeTeam?.id === myTeamId;
                const myScore = isHome ? homeScore : awayScore;
                const oppScore = isHome ? awayScore : homeScore;
                const opponent = isHome ? awayTeam?.name : homeTeam?.name;

                const won = myScore > oppScore;
                const draw = myScore === oppScore;

                let title, emoji;
                if (won) {
                    title = 'Vittoria!';
                    emoji = '';
                } else if (draw) {
                    title = 'Pareggio';
                    emoji = '';
                } else {
                    title = 'Sconfitta';
                    emoji = '';
                }

                const matchType = type || 'Partita';

                this.sendBrowserPush(
                    `${emoji} ${title}`,
                    `${matchType}: ${result} vs ${opponent}`,
                    'match_result'
                );
            }
        });
    },

    /**
     * Pulisce la cache delle notifiche
     */
    clearNotificationCache() {
        this._notifiedEvents = {};
    },

    /**
     * Ferma il sistema
     */
    destroy() {
        this.stopPeriodicCheck();
        this._notifiedEvents = {};
    }
};

// Inizializza quando la pagina e' pronta
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che l'app sia caricata
    const checkAndInit = () => {
        if (window.InterfacciaCore?.currentTeamId && window.db) {
            window.ProactiveNotifications.init();
        } else {
            setTimeout(checkAndInit, 1000);
        }
    };

    // Avvia dopo 3 secondi per dare tempo all'app di caricare
    setTimeout(checkAndInit, 3000);
});

console.log('[ProactiveNotifications] Modulo caricato');
