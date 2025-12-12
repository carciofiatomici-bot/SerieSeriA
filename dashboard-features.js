//
// ====================================================================
// DASHBOARD-FEATURES.JS - Gestione Bottoni Feature nella Dashboard
// ====================================================================
// Gestisce la visibilita' e i listener dei bottoni feature-flag nella dashboard
//

window.DashboardFeatures = {
    /**
     * Inizializza i bottoni feature nella dashboard
     */
    init() {
        this.updateFeatureButtons();
        this.setupListeners();
        this.setupFlagChangeListener();
        console.log("Dashboard Features inizializzato");
    },

    /**
     * Aggiorna la visibilita' di tutti i bottoni feature
     */
    updateFeatureButtons() {
        // Bottone Sfida - sempre visibile, mostra messaggio se flag disattivo
        // (gestito nel click listener in interfaccia-navigation.js)

        // Bottone Allenamento - sempre visibile, mostra messaggio se flag disattivo
        // (gestito nel click listener qui sotto)

        // Widget Crediti Super Seri
        this.updateCSSWidget();

        // Bottone Stadio
        this.updateStadiumButton();

        // Aggiorna il layout della griglia in base ai bottoni visibili
        this.updateGridLayout();
    },

    /**
     * Aggiorna il widget CSS nella dashboard
     */
    async updateCSSWidget() {
        if (window.CreditiSuperSeriUI) {
            await window.CreditiSuperSeriUI.initDashboardWidget();
        }
    },

    /**
     * Aggiorna la visibilita' del bottone Stadio
     */
    updateStadiumButton() {
        const btnStadium = document.getElementById('btn-stadium');
        if (btnStadium) {
            const isEnabled = window.FeatureFlags?.isEnabled?.('stadium') || false;
            if (isEnabled) {
                btnStadium.classList.remove('hidden');
                btnStadium.classList.add('flex');
            } else {
                btnStadium.classList.add('hidden');
                btnStadium.classList.remove('flex');
            }
        }
    },

    /**
     * Aggiorna il layout della griglia bottoni
     */
    updateGridLayout() {
        const container = document.getElementById('draft-mercato-container');
        if (!container) return;

        const grid = container.querySelector('.grid');
        if (!grid) return;

        // Conta bottoni visibili
        const visibleButtons = Array.from(grid.children).filter(
            btn => !btn.classList.contains('hidden')
        ).length;

        // Aggiorna classi griglia
        grid.classList.remove('grid-cols-2', 'grid-cols-3', 'grid-cols-4');

        if (visibleButtons <= 2) {
            grid.classList.add('grid-cols-2');
        } else if (visibleButtons <= 3) {
            grid.classList.add('grid-cols-3');
        } else {
            grid.classList.add('grid-cols-4');
        }
    },

    /**
     * Setup listener per i bottoni
     */
    setupListeners() {
        // Bottone Allenamento
        const btnTraining = document.getElementById('btn-training');
        if (btnTraining) {
            btnTraining.addEventListener('click', () => {
                // Verifica se l'allenamento e' abilitato
                if (!window.FeatureFlags?.isEnabled('training')) {
                    if (window.Toast) window.Toast.info("Allenamento non disponibile");
                    return;
                }
                if (window.Training) {
                    window.Training.openPanel();
                } else {
                    if (window.Toast) window.Toast.error("Sistema Allenamento non disponibile");
                }
            });
        }

        // Bottone Hall of Fame (Storico Partite)
        const btnHallOfFame = document.getElementById('btn-hall-of-fame');
        const matchHistoryContent = document.getElementById('match-history-content');
        const matchHistoryBackButton = document.getElementById('match-history-back-button');
        const appContent = document.getElementById('app-content');

        if (btnHallOfFame) {
            btnHallOfFame.addEventListener('click', () => {
                // Verifica se lo storico e' abilitato
                if (!window.FeatureFlags?.isEnabled('matchHistory')) {
                    if (window.Toast) window.Toast.info("Hall of Fame non disponibile");
                    return;
                }
                if (window.MatchHistory && matchHistoryContent) {
                    window.showScreen(matchHistoryContent);
                    window.MatchHistory.render();
                } else {
                    if (window.Toast) window.Toast.error("Hall of Fame non disponibile");
                }
            });
        }

        if (matchHistoryBackButton && appContent) {
            matchHistoryBackButton.addEventListener('click', () => {
                window.showScreen(appContent);
            });
        }

        // Bottone Scambi
        const btnTrades = document.getElementById('btn-trades');
        if (btnTrades) {
            btnTrades.addEventListener('click', () => {
                // Verifica se gli scambi sono abilitati
                if (!window.FeatureFlags?.isEnabled('trades')) {
                    // Mostra alert temporaneo
                    this.showTemporaryAlert('Scambi Momentaneamente Non Disponibili');
                    return;
                }
                if (window.Trades) {
                    window.Trades.openPanel();
                } else {
                    if (window.Toast) window.Toast.error("Sistema Scambi non disponibile");
                }
            });
        }

        // Nota: il bottone Sfida e' gia' gestito in interfaccia-navigation.js

        // Bottone Stadio
        const btnStadium = document.getElementById('btn-stadium');
        const stadiumContent = document.getElementById('stadium-content');

        if (btnStadium) {
            btnStadium.addEventListener('click', async () => {
                // Verifica se lo stadio e' abilitato
                if (!window.FeatureFlags?.isEnabled('stadium')) {
                    if (window.Toast) window.Toast.info("Stadio non disponibile");
                    return;
                }

                if (window.StadiumUI && stadiumContent) {
                    // Recupera dati team corrente
                    const teamId = window.InterfacciaCore?.currentTeamId;
                    const teamData = window.InterfacciaCore?.currentTeamData;

                    if (!teamId || !teamData) {
                        if (window.Toast) window.Toast.error("Dati squadra non disponibili");
                        return;
                    }

                    window.showScreen(stadiumContent);
                    await window.StadiumUI.init(teamId, teamData);
                } else {
                    if (window.Toast) window.Toast.error("Sistema Stadio non disponibile");
                }
            });
        }
    },

    /**
     * Mostra un alert temporaneo che scompare dopo 2 secondi
     * @param {string} message - Messaggio da mostrare
     */
    showTemporaryAlert(message) {
        // Rimuovi alert precedente se esiste
        const existingAlert = document.getElementById('temporary-alert');
        if (existingAlert) existingAlert.remove();

        // Crea l'alert
        const alert = document.createElement('div');
        alert.id = 'temporary-alert';
        alert.className = `
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
            z-[9999] px-6 py-4 bg-red-600 text-white font-bold text-lg
            rounded-xl shadow-2xl border-2 border-red-400
            animate-pulse
        `.replace(/\s+/g, ' ').trim();
        alert.textContent = message;

        document.body.appendChild(alert);

        // Rimuovi dopo 2 secondi
        setTimeout(() => {
            alert.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => alert.remove(), 300);
        }, 2000);
    },

    /**
     * Ascolta i cambiamenti dei feature flags
     */
    setupFlagChangeListener() {
        document.addEventListener('featureFlagChanged', (e) => {
            const { flagId, enabled } = e.detail || {};

            console.log(`Feature flag cambiato: ${flagId} = ${enabled}`);

            switch (flagId) {
                case 'challenges':
                    // Inizializza/distruggi sistema sfide
                    if (enabled && window.Challenges) {
                        window.Challenges.init();
                    } else if (!enabled && window.Challenges) {
                        window.Challenges.destroy?.();
                    }
                    break;

                case 'training':
                    // Inizializza/distruggi sistema allenamento
                    if (enabled && window.Training) {
                        window.Training.init();
                    } else if (!enabled && window.Training) {
                        window.Training.destroy?.();
                    }
                    break;

                case 'creditiSuperSeri':
                    // Aggiorna widget CSS
                    this.updateCSSWidget();
                    break;

                case 'notifications':
                    // Inizializza/distruggi notifiche
                    if (enabled && window.Notifications) {
                        window.Notifications.init();
                    } else if (!enabled && window.Notifications) {
                        window.Notifications.destroy?.();
                    }
                    break;

                case 'chat':
                    // Inizializza/distruggi chat
                    if (enabled && window.Chat) {
                        window.Chat.init();
                    } else if (!enabled && window.Chat) {
                        window.Chat.destroy?.();
                    }
                    break;

                case 'achievements':
                    // Inizializza/distruggi achievements
                    if (enabled && window.Achievements) {
                        window.Achievements.init?.();
                    } else if (!enabled && window.Achievements) {
                        window.Achievements.destroy?.();
                    }
                    break;

                case 'dragDrop':
                    // Inizializza/distruggi drag & drop
                    if (enabled && window.DragDropManager) {
                        window.DragDropManager.init();
                    } else if (!enabled && window.DragDropManager) {
                        window.DragDropManager.destroy?.();
                    }
                    break;

                case 'matchAnimations':
                case 'matchHighlights':
                    // Questi non richiedono init/destroy, sono usati on-demand
                    break;

                case 'stadium':
                    // Aggiorna visibilita' bottone stadio
                    this.updateStadiumButton();
                    break;
            }

            // Mostra toast di conferma
            if (window.Toast) {
                const flagName = window.FeatureFlags?.flags[flagId]?.name || flagId;
                if (enabled) {
                    window.Toast.success(`${flagName} attivato`);
                } else {
                    window.Toast.info(`${flagName} disattivato`);
                }
            }

            // Aggiorna layout griglia
            this.updateGridLayout();
        });
    },

    /**
     * Toggle visibilita' di un bottone
     */
    toggleButton(buttonId, show) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            if (show) {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
        }
    }
};

// Inizializza quando la dashboard e' pronta
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che FeatureFlags sia pronto
    const checkAndInit = () => {
        if (window.FeatureFlags && window.db) {
            // Aspetta un po' per assicurarsi che i flag siano caricati
            setTimeout(() => {
                window.DashboardFeatures.init();
            }, 1500);
        } else {
            setTimeout(checkAndInit, 500);
        }
    };
    checkAndInit();
});

console.log("Modulo DashboardFeatures caricato.");
