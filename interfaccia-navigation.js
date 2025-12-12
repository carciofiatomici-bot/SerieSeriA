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
        // Schermate che NON devono essere salvate per il ripristino
        // (richiedono contesto specifico o sono temporanee)
        const excludedScreens = [
            'login-box',
            'gate-box',
            'coach-selection-box',
            'captain-selection-box',
            'draft-content',      // Richiede teamId e mode specifici
            'mercato-content'     // Richiede teamId specifico
        ];

        if (screenId && !excludedScreens.includes(screenId)) {
            localStorage.setItem('fanta_last_screen', screenId);
        } else if (screenId === 'app-content') {
            // La Dashboard e il punto di partenza, lo salviamo
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

        // Toggle partecipazione Draft
        this.initDraftParticipationToggle();
        
        // Mercato Utente
        if (elements.btnMercatoUtente) {
            elements.btnMercatoUtente.addEventListener('click', () => {
                const mercatoContentRef = document.getElementById('mercato-content');
                if (mercatoContentRef) {
                    navigateAndTrack(mercatoContentRef, null, 'mercatoPanelLoaded');
                }
            });
        }

        // Sfida un'altra squadra
        if (elements.btnChallenge) {
            elements.btnChallenge.addEventListener('click', () => {
                // Verifica se le sfide sono abilitate
                if (!window.FeatureFlags?.isEnabled('challenges')) {
                    if (window.Toast) window.Toast.info("Sfide non aperte");
                    return;
                }
                if (window.Challenges) {
                    window.Challenges.showChallengeModal();
                } else {
                    if (window.Toast) window.Toast.error("Sistema sfide non disponibile");
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
        
        // Campionato dalla Dashboard (NUOVO)
        if (elements.btnDashboardChampionship) {
            elements.btnDashboardChampionship.addEventListener('click', async () => {
                const userChampionshipContent = document.getElementById('user-championship-content');
                const userChampionshipBackButton = document.getElementById('user-championship-back-button');
                
                if (userChampionshipContent && userChampionshipBackButton) {
                    self.saveLastScreen(userChampionshipContent.id);
                    window.showScreen(userChampionshipContent);
                    
                    // Carica il campionato
                    if (window.UserChampionship) {
                        await window.UserChampionship.loadUserChampionship();
                    }
                    
                    // Listener per tornare indietro
                    userChampionshipBackButton.onclick = () => {
                        self.saveLastScreen(elements.appContent.id);
                        window.showScreen(elements.appContent);
                    };
                }
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
    },

    /**
     * Inizializza il toggle di partecipazione al Draft
     */
    initDraftParticipationToggle() {
        const toggle = document.getElementById('draft-participation-toggle');
        const toggleContainer = document.getElementById('draft-toggle-container');

        if (!toggle || !toggleContainer) return;

        // Previeni la propagazione del click al bottone genitore
        toggleContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Gestione cambio stato toggle
        toggle.addEventListener('change', async (e) => {
            e.stopPropagation();
            await this.handleDraftToggle(e.target.checked);
        });

        // Carica lo stato iniziale
        this.loadDraftParticipationState();
    },

    /**
     * Carica lo stato di partecipazione al Draft da Firestore
     */
    async loadDraftParticipationState() {
        const toggle = document.getElementById('draft-participation-toggle');
        if (!toggle) return;

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            const { doc, getDoc } = window.firestoreTools;
            const teamDocRef = doc(window.db, window.TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                const isEnabled = teamData.draft_enabled === true;
                toggle.checked = isEnabled;
                this.updateToggleTooltip(isEnabled);
            }
        } catch (error) {
            console.error('[DraftToggle] Errore caricamento stato:', error);
        }
    },

    /**
     * Gestisce il cambio di stato del toggle Draft
     * @param {boolean} enabled - Nuovo stato
     */
    async handleDraftToggle(enabled) {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) {
            if (window.Toast) window.Toast.error('Nessuna squadra selezionata');
            return;
        }

        const toggle = document.getElementById('draft-participation-toggle');

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const teamDocRef = doc(window.db, window.TEAMS_COLLECTION_PATH, teamId);

            await updateDoc(teamDocRef, {
                draft_enabled: enabled
            });

            // Aggiorna anche i dati locali
            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.draft_enabled = enabled;
            }

            this.updateToggleTooltip(enabled);

            if (window.Toast) {
                if (enabled) {
                    window.Toast.success('Partecipazione al Draft attivata');
                } else {
                    window.Toast.info('Partecipazione al Draft disattivata');
                }
            }

            console.log(`[DraftToggle] draft_enabled = ${enabled}`);

        } catch (error) {
            console.error('[DraftToggle] Errore salvataggio:', error);
            if (window.Toast) window.Toast.error('Errore nel salvare la preferenza');
            // Ripristina lo stato precedente
            if (toggle) toggle.checked = !enabled;
        }
    },

    /**
     * Aggiorna il tooltip del toggle
     * @param {boolean} enabled - Stato attuale
     */
    updateToggleTooltip(enabled) {
        const container = document.getElementById('draft-toggle-container');
        if (container) {
            container.title = enabled
                ? 'Stai partecipando al Draft (clicca per disattivare)'
                : 'Non stai partecipando al Draft (clicca per attivare)';
        }
    }
};

console.log("[OK] Modulo interfaccia-navigation.js caricato.");