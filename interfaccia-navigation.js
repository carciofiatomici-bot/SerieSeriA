//
// ====================================================================
// MODULO INTERFACCIA-NAVIGATION.JS (Navigazione e Routing) - INTEGRALE
// ====================================================================
//

window.InterfacciaNavigation = {
    
    /**
     * Salva l'ID della schermata corrente in localStorage.
     * @param {string} screenId - L'ID del container.
     */
    saveLastScreen(screenId) {
        const excludedScreens = [
            'login-box',
            'gate-box',
            'coach-selection-box',
            'captain-selection-box',
            'draft-content',
            'mercato-content'
        ];

        if (screenId && !excludedScreens.includes(screenId)) {
            localStorage.setItem('fanta_last_screen', screenId);
        } else if (screenId === 'app-content') {
            localStorage.setItem('fanta_last_screen', screenId);
        }
    },

    /**
     * Inizializza i listener di navigazione per la dashboard utente.
     */
    initializeNavigationListeners(elements) {
        const currentTeamId = () => window.InterfacciaCore.currentTeamId;
        const self = this;
        
        // --- FIX: Inizializzazione del Menu Hamburger ---
        this.initHamburgerMenu();

        const navigateAndTrack = (screenElement, mode, dispatchEventName) => {
            if (window.showScreen) {
                self.saveLastScreen(screenElement.id);
                window.showScreen(screenElement);
                if (dispatchEventName) {
                     document.dispatchEvent(new CustomEvent(dispatchEventName, { 
                        detail: { mode: mode, teamId: currentTeamId() } 
                    }));
                }
                // Chiude il menu se aperto durante la navigazione
                this.closeMenu();
            }
        };

        // Gestione Rosa
        if (elements.btnGestioneRosa) {
            elements.btnGestioneRosa.addEventListener('click', () => {
                navigateAndTrack(elements.squadraContent, 'rosa', 'squadraPanelLoaded');
            });
        }
        
        // Gestione Formazione
        if (elements.btnGestioneFormazione) {
            elements.btnGestioneFormazione.addEventListener('click', () => {
                navigateAndTrack(elements.squadraContent, 'formazione', 'squadraPanelLoaded');
            });
        }
        
        // Draft Utente
        if (elements.btnDraftUtente) {
            elements.btnDraftUtente.addEventListener('click', () => {
                const draftAdminContent = document.getElementById('draft-content');
                if (draftAdminContent) {
                    navigateAndTrack(draftAdminContent, 'utente', 'draftPanelLoaded');
                }
            });
        }

        // Mercato Utente
        if (elements.btnMercatoUtente) {
            elements.btnMercatoUtente.addEventListener('click', () => {
                const mercatoContentRef = document.getElementById('mercato-content');
                if (mercatoContentRef) {
                    navigateAndTrack(mercatoContentRef, null, 'mercatoPanelLoaded');
                }
            });
        }

        // Sfida
        if (elements.btnChallenge) {
            elements.btnChallenge.addEventListener('click', () => {
                if (!window.FeatureFlags?.isEnabled('challenges')) {
                    if (window.Toast) window.Toast.info("Sfide non ancora attive in questa versione.");
                    return;
                }
                if (window.Challenges) {
                    window.Challenges.showChallengeModal();
                }
                this.closeMenu();
            });
        }

        // Listener per Classifica e Calendario dalla Dashboard
        if (elements.btnDashboardLeaderboard) {
            elements.btnDashboardLeaderboard.addEventListener('click', () => {
                self.saveLastScreen(elements.leaderboardContent.id);
                window.showScreen(elements.leaderboardContent);
                window.InterfacciaDashboard.loadLeaderboard();
                this.closeMenu();
            });
        }
        
        if (elements.btnDashboardSchedule) {
            elements.btnDashboardSchedule.addEventListener('click', () => {
                self.saveLastScreen(elements.scheduleContent.id);
                window.showScreen(elements.scheduleContent);
                window.InterfacciaDashboard.loadSchedule();
                this.closeMenu();
            });
        }

        // Inizializza il toggle partecipazione draft (Logica originale mantenuta)
        this.initDraftParticipationToggle();
    },

    /**
     * --- NUOVA LOGICA: MENU HAMBURGER (⋮) ---
     */
    initHamburgerMenu() {
        const menuBtn = document.getElementById('dashboard-menu-btn');
        const dropdown = document.getElementById('dashboard-menu-dropdown');

        if (!menuBtn || !dropdown) return;

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== menuBtn) {
                dropdown.classList.add('hidden');
            }
        });

        // Collega i bottoni interni al menu
        document.getElementById('menu-logout')?.addEventListener('click', () => {
            window.InterfacciaAuth?.logout();
            this.closeMenu();
        });

        document.getElementById('menu-password')?.addEventListener('click', () => {
            const modal = document.getElementById('change-password-modal');
            if (modal) modal.classList.remove('hidden');
            this.closeMenu();
        });

        document.getElementById('menu-tutorial')?.addEventListener('click', () => {
            window.Tutorial?.start();
            this.closeMenu();
        });

        document.getElementById('menu-changelog')?.addEventListener('click', () => {
            window.Changelog?.showPlayers();
            this.closeMenu();
        });
    },

    closeMenu() {
        document.getElementById('dashboard-menu-dropdown')?.classList.add('hidden');
    },

    /**
     * Inizializza i listener di navigazione pubblica (login page).
     */
    initializePublicNavigationListeners(elements) {
        const self = this;
        
        if (elements.btnLeaderboard) {
            elements.btnLeaderboard.addEventListener('click', () => {
                self.saveLastScreen(elements.leaderboardContent.id);
                window.showScreen(elements.leaderboardContent);
                window.InterfacciaDashboard.loadLeaderboard();
            });
        }
        
        if (elements.btnSchedule) {
            elements.btnSchedule.addEventListener('click', () => {
                self.saveLastScreen(elements.scheduleContent.id);
                window.showScreen(elements.scheduleContent);
                window.InterfacciaDashboard.loadSchedule();
            });
        }
        
        if (elements.leaderboardBackButton) {
            elements.leaderboardBackButton.addEventListener('click', () => {
                localStorage.removeItem('fanta_last_screen'); 
                this.handleBackNavigation(elements);
            });
        }
        
        if (elements.scheduleBackButton) {
            elements.scheduleBackButton.addEventListener('click', () => {
                localStorage.removeItem('fanta_last_screen');
                this.handleBackNavigation(elements);
            });
        }
    },

    /**
     * Gestisce il ritorno alla schermata corretta in base allo stato sessione.
     */
    handleBackNavigation(elements) {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        const userType = localStorage.getItem('fanta_session_type');
        localStorage.removeItem('fanta_last_screen');

        if (currentTeamId && userType === 'admin') {
            window.showScreen(elements.adminContent);
        } else if (currentTeamId) {
            window.showScreen(elements.appContent);
        } else {
            window.showScreen(elements.loginBox);
        }
    },

    /**
     * --- LOGICA ORIGINALE DRAFT (Ripristinata) ---
     */
    initDraftParticipationToggle() {
        const toggle = document.getElementById('draft-participation-toggle');
        const toggleContainer = document.getElementById('draft-toggle-container');

        if (!toggle || !toggleContainer) return;

        toggleContainer.addEventListener('click', (e) => e.stopPropagation());
        toggle.addEventListener('change', async (e) => {
            e.stopPropagation();
            await this.handleDraftToggle(e.target.checked);
        });

        this.loadDraftParticipationState();
    },

    async loadDraftParticipationState() {
        const toggle = document.getElementById('draft-participation-toggle');
        if (!toggle) return;

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            const { doc, getDoc, appId } = window.firestoreTools;
            const teamsPath = `artifacts/${appId}/public/data/teams`;
            const teamDocRef = doc(window.db, teamsPath, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (teamDoc.exists()) {
                const isEnabled = teamDoc.data().draft_enabled === true;
                toggle.checked = isEnabled;
                this.updateToggleTooltip(isEnabled);
            }
        } catch (error) {
            console.error('[DraftToggle] Errore caricamento:', error);
        }
    },

    async handleDraftToggle(enabled) {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            const { doc, updateDoc, appId } = window.firestoreTools;
            const teamsPath = `artifacts/${appId}/public/data/teams`;
            const teamDocRef = doc(window.db, teamsPath, teamId);

            await updateDoc(teamDocRef, { draft_enabled: enabled });

            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.draft_enabled = enabled;
            }

            this.updateToggleTooltip(enabled);

            if (window.Toast) {
                if (enabled) window.Toast.success('Partecipazione al Draft attivata');
                else window.Toast.info('Partecipazione al Draft disattivata');
            }
        } catch (error) {
            console.error('[DraftToggle] Errore salvataggio:', error);
            if (window.Toast) window.Toast.error('Errore nel salvare la preferenza');
            const toggle = document.getElementById('draft-participation-toggle');
            if (toggle) toggle.checked = !enabled;
        }
    },

    updateToggleTooltip(enabled) {
        const container = document.getElementById('draft-toggle-container');
        if (container) {
            container.title = enabled
                ? 'Stai partecipando al Draft (clicca per disattivare)'
                : 'Non stai partecipando al Draft (clicca per attivare)';
        }
    }
};