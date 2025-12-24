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
        this.setupFlagsLoadedListener();
        this.initHamburgerMenu();
        this.updateRisorseBox();
        console.log("Dashboard Features inizializzato");
    },

    /**
     * Ascolta quando i feature flags sono completamente caricati
     * Risolve il problema PWA dove i bottoni non si mostrano al primo caricamento
     */
    setupFlagsLoadedListener() {
        document.addEventListener('featureFlagsLoaded', () => {
            console.log("Feature Flags caricati, aggiorno bottoni dashboard");
            this.updateFeatureButtons();
        });
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

        // Bottone Leghe Private
        this.updatePrivateLeaguesButton();

        // Box Sponsorship (Media + Sponsor)
        this.updateSponsorshipBoxes();

        // Box Ruota della Fortuna
        this.updateDailyWheelBox();

        // Box Risorse unificato
        this.updateRisorseBox();

        // Aggiorna visibilita' admin nel menu
        this.updateAdminMenuVisibility();

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
        const btnHallOfFame = document.getElementById('btn-hall-of-fame');
        if (btnStadium && btnHallOfFame) {
            const isEnabled = window.FeatureFlags?.isEnabled?.('stadium') || false;
            if (isEnabled) {
                // Entrambi visibili
                btnStadium.classList.remove('hidden');
                btnHallOfFame.classList.remove('col-span-2');
            } else {
                // Solo Hall of Fame visibile, occupa entrambe le colonne
                btnStadium.classList.add('hidden');
                btnHallOfFame.classList.add('col-span-2');
            }
        }
    },

    /**
     * Aggiorna la visibilita' del bottone Leghe Private
     */
    updatePrivateLeaguesButton() {
        const privateLeaguesBox = document.getElementById('private-leagues-box');
        if (privateLeaguesBox) {
            const isEnabled = window.FeatureFlags?.isEnabled?.('privateLeagues') || false;
            if (isEnabled) {
                privateLeaguesBox.classList.remove('hidden');
            } else {
                privateLeaguesBox.classList.add('hidden');
            }
        }
    },

    /**
     * Aggiorna la visibilita' del box Ruota della Fortuna
     */
    updateDailyWheelBox() {
        const wheelBox = document.getElementById('daily-wheel-box');
        const badge = document.getElementById('daily-wheel-badge');
        if (!wheelBox) return;

        const isEnabled = window.FeatureFlags?.isEnabled?.('dailyWheel') || false;
        const teamData = window.InterfacciaCore?.currentTeamData;
        const canSpin = window.DailyWheel?.canSpinToday(teamData) || false;

        // Mostra se feature attiva
        if (isEnabled) {
            wheelBox.classList.remove('hidden');
            if (canSpin) {
                wheelBox.title = 'Gira la Ruota della Fortuna!';
                if (badge) badge.classList.remove('hidden');
            } else {
                // Calcola tempo fino a mezzanotte
                const now = new Date();
                const midnight = new Date(now);
                midnight.setHours(24, 0, 0, 0);
                const diff = midnight - now;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                wheelBox.title = `Prossimo giro tra ${hours}h ${minutes}m`;
                if (badge) badge.classList.add('hidden');
            }
        } else {
            wheelBox.classList.add('hidden');
        }
    },

    /**
     * Aggiorna la visibilita' dei box Sponsorship (Media + Sponsor nella riga logo)
     */
    updateSponsorshipBoxes() {
        const mediaBox = document.getElementById('media-box');
        const sponsorBox = document.getElementById('sponsor-box');
        const isEnabled = window.FeatureFlags?.isEnabled?.('sponsors') || false;

        // Mostra/nascondi i box nella riga del logo
        if (mediaBox) {
            if (isEnabled) {
                mediaBox.classList.remove('hidden');
            } else {
                mediaBox.classList.add('hidden');
            }
        }

        if (sponsorBox) {
            if (isEnabled) {
                sponsorBox.classList.remove('hidden');
            } else {
                sponsorBox.classList.add('hidden');
            }
        }

        // Aggiorna lo stato/immagini dei box
        if (isEnabled) {
            this.updateSponsorshipStatus();
        }
    },

    /**
     * Aggiorna le immagini nei box Media/Sponsor nella riga logo
     */
    async updateSponsorshipStatus() {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId || !window.SponsorSystem) return;

        try {
            // Aggiorna immagine Media
            const mediaImage = document.getElementById('media-image');
            const teamMedia = await window.SponsorSystem.getTeamMedia(teamId);

            if (mediaImage) {
                if (teamMedia && teamMedia.image) {
                    mediaImage.src = window.SponsorSystem.getMediaImageUrl(teamMedia.image);
                    mediaImage.title = teamMedia.name;
                } else {
                    mediaImage.src = 'https://placehold.co/128x128/831843/f9a8d4?text=📺';
                    mediaImage.title = 'Media Partner - Clicca per scegliere';
                }
            }

            // Aggiorna immagine Sponsor
            const sponsorImage = document.getElementById('sponsor-image');
            const teamSponsor = await window.SponsorSystem.getTeamSponsor(teamId);

            if (sponsorImage) {
                if (teamSponsor && teamSponsor.image) {
                    sponsorImage.src = window.SponsorSystem.getSponsorImageUrl(teamSponsor.image);
                    sponsorImage.title = teamSponsor.name;
                } else {
                    sponsorImage.src = 'https://placehold.co/128x128/78350f/fcd34d?text=🤝';
                    sponsorImage.title = 'Sponsor - Clicca per scegliere';
                }
            }
        } catch (error) {
            console.error('Errore aggiornamento status sponsorship:', error);
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

        if (btnHallOfFame) {
            btnHallOfFame.addEventListener('click', async () => {
                // Verifica se lo storico e' abilitato
                if (!window.FeatureFlags?.isEnabled('matchHistory')) {
                    if (window.Toast) window.Toast.info("Hall of Fame non disponibile");
                    return;
                }

                // Verifica se il Museo del Club e' costruito
                const teamData = window.InterfacciaCore?.currentTeamData;
                if (teamData && window.Stadium) {
                    const museumLevel = window.Stadium.getStructureLevel('museum', teamData.stadium);
                    if (museumLevel <= 0) {
                        if (window.Toast) {
                            window.Toast.info("Costruisci il Museo del Club nello Stadio per sbloccare la Hall of Fame!");
                        }
                        return;
                    }
                }

                if (window.MatchHistory && matchHistoryContent) {
                    window.showScreen(matchHistoryContent);
                    window.MatchHistory.render();
                } else {
                    if (window.Toast) window.Toast.error("Hall of Fame non disponibile");
                }
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

        // Box Media (nella riga logo)
        const mediaBox = document.getElementById('media-box');
        if (mediaBox) {
            mediaBox.addEventListener('click', () => {
                if (!window.FeatureFlags?.isEnabled('sponsors')) {
                    if (window.Toast) window.Toast.info("Sistema Sponsorship non disponibile");
                    return;
                }
                if (window.SponsorSystem) {
                    const teamId = window.InterfacciaCore?.currentTeamId;
                    if (teamId) {
                        window.SponsorSystem.openMediaPanel(teamId);
                    } else {
                        if (window.Toast) window.Toast.error("Seleziona una squadra");
                    }
                }
            });
        }

        // Box Sponsor (nella riga logo)
        const sponsorBox = document.getElementById('sponsor-box');
        if (sponsorBox) {
            sponsorBox.addEventListener('click', () => {
                if (!window.FeatureFlags?.isEnabled('sponsors')) {
                    if (window.Toast) window.Toast.info("Sistema Sponsorship non disponibile");
                    return;
                }
                if (window.SponsorSystem) {
                    const teamId = window.InterfacciaCore?.currentTeamId;
                    if (teamId) {
                        window.SponsorSystem.openSponsorPanel(teamId);
                    } else {
                        if (window.Toast) window.Toast.error("Seleziona una squadra");
                    }
                }
            });
        }

        // Box Ruota della Fortuna (nella riga logo)
        const wheelBox = document.getElementById('daily-wheel-box');
        if (wheelBox) {
            wheelBox.addEventListener('click', () => {
                if (!window.FeatureFlags?.isEnabled('dailyWheel')) {
                    if (window.Toast) window.Toast.info("Ruota della Fortuna non disponibile");
                    return;
                }
                const teamId = window.InterfacciaCore?.currentTeamId;
                const teamData = window.InterfacciaCore?.currentTeamData;
                if (teamId && teamData) {
                    if (window.DailyWheelUI) {
                        window.DailyWheelUI.showWheelPopup({ currentTeamId: teamId, teamData: teamData });
                    }
                } else {
                    if (window.Toast) window.Toast.error("Seleziona una squadra");
                }
            });
        }

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

                    // Salva schermata per persistenza al refresh
                    window.InterfacciaNavigation?.saveLastScreen?.(stadiumContent.id);
                    window.showScreen(stadiumContent);
                    await window.StadiumUI.init(teamId, teamData);
                } else {
                    if (window.Toast) window.Toast.error("Sistema Stadio non disponibile");
                }
            });
        }

        // Bottone Leghe Private
        const btnPrivateLeagues = document.getElementById('btn-private-leagues');
        const privateLeaguesContent = document.getElementById('private-leagues-content');
        const privateLeaguesBackButton = document.getElementById('private-leagues-back-button');
        // appContent già dichiarato sopra

        if (btnPrivateLeagues) {
            btnPrivateLeagues.addEventListener('click', async () => {
                if (window.PrivateLeaguesUI && privateLeaguesContent) {
                    const teamId = window.InterfacciaCore?.currentTeamId;
                    const teamData = window.InterfacciaCore?.currentTeamData;

                    if (!teamId || !teamData) {
                        if (window.Toast) window.Toast.error("Dati squadra non disponibili");
                        return;
                    }

                    // Salva schermata per persistenza al refresh
                    window.InterfacciaNavigation?.saveLastScreen?.(privateLeaguesContent.id);
                    window.showScreen(privateLeaguesContent);
                    await window.PrivateLeaguesUI.init(teamId, teamData);
                } else {
                    if (window.Toast) window.Toast.error("Sistema Leghe Private non disponibile");
                }
            });
        }

        if (privateLeaguesBackButton && appContent) {
            privateLeaguesBackButton.addEventListener('click', () => {
                window.showScreen(appContent);
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

                case 'sponsors':
                    // Aggiorna visibilita' box sponsorship
                    this.updateSponsorshipBoxes();
                    // Inizializza sistema sponsor se attivato
                    if (enabled && window.SponsorSystem) {
                        window.SponsorSystem.init();
                    }
                    break;

                case 'privateLeagues':
                    // Aggiorna visibilita' bottone leghe private
                    this.updatePrivateLeaguesButton();
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
    },

    // ========================================
    // MENU HAMBURGER
    // ========================================

    /**
     * Inizializza il menu hamburger nella dashboard
     */
    initHamburgerMenu() {
        const menuBtn = document.getElementById('dashboard-menu-btn');
        const dropdown = document.getElementById('dashboard-menu-dropdown');

        if (!menuBtn || !dropdown) return;

        // Sposta dropdown nel body per evitare problemi di overflow
        document.body.appendChild(dropdown);

        // Toggle menu con posizionamento fixed
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');

            if (isHidden) {
                // Calcola posizione del bottone
                const rect = menuBtn.getBoundingClientRect();
                // Posiziona il dropdown sotto il bottone
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '9999';
                dropdown.classList.remove('hidden');
            } else {
                dropdown.classList.add('hidden');
            }
        });

        // Chiudi menu cliccando fuori
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== menuBtn) {
                dropdown.classList.add('hidden');
            }
        });

        // Chiudi menu su scroll
        window.addEventListener('scroll', () => {
            dropdown.classList.add('hidden');
        }, true);

        // Setup azioni menu
        this.setupMenuActions();

        // Mostra pannello admin se squadra admin
        this.updateAdminMenuVisibility();
    },

    /**
     * Setup azioni dei bottoni menu
     */
    setupMenuActions() {
        const dropdown = document.getElementById('dashboard-menu-dropdown');

        // Tutorial
        document.getElementById('menu-tutorial')?.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
            window.Tutorial?.start();
        });

        // Changelog
        document.getElementById('menu-changelog')?.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
            window.Changelog?.showPlayers();
        });

        // Cambia Password
        document.getElementById('menu-password')?.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
            const modal = document.getElementById('change-password-modal');
            if (modal) modal.classList.remove('hidden');
        });

        // Colore Squadra - apre il color picker
        document.getElementById('menu-color-picker')?.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
            const colorPicker = document.getElementById('team-color-picker');
            if (colorPicker) {
                // Trigger click sul color picker per aprirlo
                colorPicker.click();
            }
        });

        // Pannello Admin
        document.getElementById('menu-admin-panel')?.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
            const adminContent = document.getElementById('admin-content');
            if (adminContent) {
                window.showScreen(adminContent);
                // Emetti evento per inizializzare il pannello admin
                document.dispatchEvent(new CustomEvent('adminLoggedIn'));
            }
        });

        // Homepage (senza logout) - mantiene la sessione attiva
        document.getElementById('menu-homepage')?.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
            const loginBox = document.getElementById('login-box');
            if (loginBox && window.InterfacciaAuth) {
                // Usa showLoginWithRememberedSession per mantenere la sessione
                window.InterfacciaAuth.showLoginWithRememberedSession({ loginBox });
            }
        });

        // Logout
        document.getElementById('menu-logout')?.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
            const loginBox = document.getElementById('login-box');
            if (loginBox) window.showScreen(loginBox);
        });

        // Elimina Squadra
        document.getElementById('menu-delete-team')?.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
            // Trigger il click sul bottone nascosto originale
            document.getElementById('btn-delete-team')?.click();
        });
    },

    /**
     * Aggiorna visibilita' opzione admin nel menu e nel tab bottom navigation
     */
    updateAdminMenuVisibility() {
        const menuAdminPanel = document.getElementById('menu-admin-panel');
        const dashboardTabAdmin = document.getElementById('dashboard-tab-admin');

        const teamData = window.InterfacciaCore?.currentTeamData;
        const teamName = teamData?.name;
        const isAdmin = window.isTeamAdmin?.(teamName, teamData) || false;

        if (isAdmin) {
            menuAdminPanel?.classList.remove('hidden');
            dashboardTabAdmin?.classList.remove('hidden');
        } else {
            menuAdminPanel?.classList.add('hidden');
            dashboardTabAdmin?.classList.add('hidden');
        }
    },

    // ========================================
    // BOX RISORSE
    // ========================================

    /**
     * Aggiorna il box risorse unificato (Negozio, CS, CSS, Album, Ruota)
     */
    async updateRisorseBox() {
        const teamData = window.InterfacciaCore?.currentTeamData;
        const teamId = window.InterfacciaCore?.currentTeamId;

        // Aggiorna Negozio CSS
        const negozioBox = document.getElementById('risorse-negozio');
        if (negozioBox && window.FeatureFlags?.isEnabled('creditiSuperSeri')) {
            negozioBox.classList.remove('hidden');
            negozioBox.classList.add('flex');

            // Click per aprire negozio
            negozioBox.onclick = async () => {
                if (window.CreditiSuperSeriUI && teamId) {
                    const rosa = teamData?.players || [];
                    const saldo = await window.CreditiSuperSeri?.getSaldo(teamId) || 0;
                    window.CreditiSuperSeriUI.openPotenziamentoPanel(rosa, saldo);
                }
            };
        } else if (negozioBox) {
            negozioBox.classList.add('hidden');
            negozioBox.classList.remove('flex');
        }

        // Aggiorna CS
        const csEl = document.getElementById('risorse-cs');
        if (csEl && teamData) {
            const cs = teamData.budget || 0;
            csEl.textContent = cs.toLocaleString('it-IT');
        }

        // Aggiorna CSS
        const cssEl = document.getElementById('risorse-css');
        if (cssEl && teamData) {
            const css = teamData.creditiSuperSeri || 0;
            cssEl.textContent = css;
        }

        // Aggiorna Album Figurine
        const pacchettiBox = document.getElementById('risorse-pacchetti');
        const pacchettiCount = document.getElementById('risorse-pacchetti-count');

        if (pacchettiBox && window.FeatureFlags?.isEnabled('figurine')) {
            pacchettiBox.classList.remove('hidden');
            pacchettiBox.classList.add('flex');

            // Verifica se pacchetto gratis disponibile - aggiunge indicatore visivo
            const albumFreeAlert = document.getElementById('album-free-alert');
            if (teamId && window.FigurineSystem) {
                try {
                    const canOpen = await window.FigurineSystem.canOpenFreePackByTeamId(teamId);
                    if (canOpen) {
                        // Mostra pallino rosso alert
                        if (albumFreeAlert) albumFreeAlert.classList.remove('hidden');
                    } else {
                        // Nascondi pallino
                        if (albumFreeAlert) albumFreeAlert.classList.add('hidden');
                    }
                } catch (e) {
                    // Ignora errori, nascondi alert
                    if (albumFreeAlert) albumFreeAlert.classList.add('hidden');
                }
            } else {
                if (albumFreeAlert) albumFreeAlert.classList.add('hidden');
            }

            // Click per aprire album
            pacchettiBox.onclick = () => {
                if (window.FigurineUI) window.FigurineUI.open();
            };
        } else if (pacchettiBox) {
            pacchettiBox.classList.add('hidden');
            pacchettiBox.classList.remove('flex');
            // Nascondi anche l'alert
            const albumFreeAlert = document.getElementById('album-free-alert');
            if (albumFreeAlert) albumFreeAlert.classList.add('hidden');
        }

        // Aggiorna Ruota della Fortuna
        const ruotaBox = document.getElementById('risorse-ruota');
        const ruotaStatus = document.getElementById('risorse-ruota-status');

        if (ruotaBox && window.FeatureFlags?.isEnabled('dailyWheel')) {
            ruotaBox.classList.remove('hidden');
            ruotaBox.classList.add('flex');

            // Verifica se puo girare - aggiunge indicatore visivo
            const wheelAlert = document.getElementById('wheel-available-alert');
            const canSpin = window.DailyWheel?.canSpinToday(teamData) || false;
            if (canSpin) {
                // Mostra pallino verde alert
                if (wheelAlert) wheelAlert.classList.remove('hidden');
            } else {
                // Nascondi pallino
                if (wheelAlert) wheelAlert.classList.add('hidden');
            }

            // Click per aprire ruota
            ruotaBox.onclick = () => {
                if (teamId && teamData && window.DailyWheelUI) {
                    window.DailyWheelUI.showWheelPopup({ currentTeamId: teamId, teamData: teamData });
                }
            };
        } else if (ruotaBox) {
            ruotaBox.classList.add('hidden');
            ruotaBox.classList.remove('flex');
            // Nascondi anche l'alert
            const wheelAlert = document.getElementById('wheel-available-alert');
            if (wheelAlert) wheelAlert.classList.add('hidden');
        }

        // Gestisci visibilità separatori
        const separatorStart = document.getElementById('risorse-separator-start');
        const separator = document.getElementById('risorse-separator');
        const separatorEnd = document.getElementById('risorse-separator-end');

        const albumVisible = pacchettiBox && !pacchettiBox.classList.contains('hidden');
        const ruotaVisible = ruotaBox && !ruotaBox.classList.contains('hidden');

        // Separatore iniziale: visibile se album è visibile
        if (separatorStart) {
            if (albumVisible) {
                separatorStart.classList.remove('hidden');
            } else {
                separatorStart.classList.add('hidden');
            }
        }

        // Separatore centrale: visibile solo se entrambi sono visibili
        if (separator) {
            if (albumVisible && ruotaVisible) {
                separator.classList.remove('hidden');
            } else {
                separator.classList.add('hidden');
            }
        }

        // Separatore finale: visibile se ruota è visibile, oppure se solo album è visibile
        if (separatorEnd) {
            if (ruotaVisible || (albumVisible && !ruotaVisible)) {
                separatorEnd.classList.remove('hidden');
            } else {
                separatorEnd.classList.add('hidden');
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
