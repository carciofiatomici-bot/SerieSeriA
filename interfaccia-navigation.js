//
// ====================================================================
// MODULO INTERFACCIA-NAVIGATION.JS (Navigazione e Routing)
// ====================================================================
//

window.InterfacciaNavigation = {
    
    /**
     * Salva l'ID della schermata corrente in localStorage.
     * @param {string} screenId - L'ID del container (es. 'app-content', 'squadra-content').
     */
    saveLastScreen(screenId) {
        if (screenId && screenId !== 'login-box' && screenId !== 'gate-box' && screenId !== 'coach-selection-box' && screenId !== 'captain-selection-box') {
            localStorage.setItem('fanta_last_screen', screenId);
        } else if (screenId === 'app-content') {
            // La Dashboard è il punto di partenza, lo salviamo
            localStorage.setItem('fanta_last_screen', screenId);
        }
    },

    /**
     * Inizializza i listener di navigazione per la dashboard utente.
     */
    initializeNavigationListeners(elements) {
        const currentTeamId = () => window.InterfacciaCore.currentTeamId;
        const self = this;
        
        // Funzione helper per la navigazione e il tracciamento
        const navigateAndTrack = (screenElement, mode, dispatchEventName) => {
            if (window.showScreen) {
                // 1. Salva la destinazione
                self.saveLastScreen(screenElement.id);
                // 2. Mostra la schermata
                window.showScreen(screenElement);
                // 3. Lancia l'evento specifico per il caricamento del contenuto
                if (dispatchEventName) {
                     document.dispatchEvent(new CustomEvent(dispatchEventName, { 
                        detail: { mode: mode, teamId: currentTeamId() } 
                    }));
                }
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
        
        // Classifica dalla Dashboard
        if (elements.btnDashboardLeaderboard) {
            elements.btnDashboardLeaderboard.addEventListener('click', () => {
                self.saveLastScreen(elements.leaderboardContent.id);
                window.showScreen(elements.leaderboardContent);
                window.InterfacciaDashboard.loadLeaderboard();
            });
        }
        
        // Calendario dalla Dashboard
        if (elements.btnDashboardSchedule) {
            elements.btnDashboardSchedule.addEventListener('click', () => {
                self.saveLastScreen(elements.scheduleContent.id);
                window.showScreen(elements.scheduleContent);
                window.InterfacciaDashboard.loadSchedule();
            });
        }
        
        // Listener per la Dashboard stessa (per coerenza)
        if (elements.appContent) {
            document.getElementById('user-logout-button')?.addEventListener('click', () => self.saveLastScreen(elements.loginBox.id));
        }
    },

    /**
     * Inizializza i listener di navigazione pubblica (login page).
     */
    initializePublicNavigationListeners(elements) {
        const currentTeamId = () => window.InterfacciaCore.currentTeamId;
        const self = this;
        
        // Classifica (Login Page)
        if (elements.btnLeaderboard) {
            elements.btnLeaderboard.addEventListener('click', () => {
                self.saveLastScreen(elements.leaderboardContent.id);
                window.showScreen(elements.leaderboardContent);
                window.InterfacciaDashboard.loadLeaderboard();
            });
        }
        
        // Calendario (Login Page)
        if (elements.btnSchedule) {
            elements.btnSchedule.addEventListener('click', () => {
                self.saveLastScreen(elements.scheduleContent.id);
                window.showScreen(elements.scheduleContent);
                window.InterfacciaDashboard.loadSchedule();
            });
        }
        
        // Ritorno dalla Classifica
        if (elements.leaderboardBackButton) {
            elements.leaderboardBackButton.addEventListener('click', () => {
                // Resetta la schermata salvata, torneremo al punto di ingresso predefinito
                localStorage.removeItem('fanta_last_screen'); 
                this.handleBackNavigation(elements);
            });
        }
        
        // Ritorno dal Calendario
        if (elements.scheduleBackButton) {
            elements.scheduleBackButton.addEventListener('click', () => {
                // Resetta la schermata salvata, torneremo al punto di ingresso predefinito
                localStorage.removeItem('fanta_last_screen');
                this.handleBackNavigation(elements);
            });
        }
    },

    /**
     * Gestisce la navigazione di ritorno in base al contesto (Admin/User/Login).
     */
    handleBackNavigation(elements) {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        const userType = localStorage.getItem('fanta_session_type');
        
        // Cancella lo stato dell'ultima schermata salvata quando si torna indietro.
        localStorage.removeItem('fanta_last_screen'); 
        
        if (currentTeamId && userType === 'admin') {
            window.showScreen(elements.adminContent);
        } else if (currentTeamId) {
            window.showScreen(elements.appContent);
        } else {
            window.showScreen(elements.loginBox);
        }
    }
};

console.log("✅ Modulo interfaccia-navigation.js caricato.");