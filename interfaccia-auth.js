//
// ====================================================================
// MODULO INTERFACCIA-AUTH.JS (Gate, Login, Logout, Sessione)
// ====================================================================
//

window.InterfacciaAuth = {
    
    /**
     * Salva i dati della sessione in localStorage.
     */
    saveSession(teamId, userType) {
        try {
            localStorage.setItem('fanta_session_id', teamId);
            localStorage.setItem('fanta_session_type', userType);
        } catch (e) {
            console.error("Impossibile salvare la sessione in localStorage.", e);
        }
    },

    /**
     * Cancella i dati della sessione da localStorage.
     */
    clearSession() {
        try {
            localStorage.removeItem('fanta_session_id');
            localStorage.removeItem('fanta_session_type');
            localStorage.removeItem('fanta_coach_name');
            localStorage.removeItem('fanta_needs_coach');
            localStorage.removeItem('fanta_needs_icona');
            // Aggiunto: Cancella anche l'ultima schermata salvata al logout
            localStorage.removeItem('fanta_last_screen'); 
            localStorage.removeItem('fanta_squadra_mode'); // Pulizia aggiuntiva
        } catch (e) {
            console.error("Impossibile pulire la sessione da localStorage.", e);
        }
    },
    
    /**
     * Carica i dati della sessione salvata e tenta l'accesso diretto.
     */
    async restoreSession(elements) {
        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
        const { ADMIN_USERNAME_LOWER } = window.InterfacciaConstants;
        
        const teamId = localStorage.getItem('fanta_session_id');
        const userType = localStorage.getItem('fanta_session_type');
        const lastScreenId = localStorage.getItem('fanta_last_screen');

        
        if (!teamId || !userType) {
            return false; // Nessuna sessione salvata
        }
        
        const requiresCoachSelection = localStorage.getItem('fanta_needs_coach') === 'true';
        const requiresIconaSelection = localStorage.getItem('fanta_needs_icona') === 'true';

        // Determina la schermata di destinazione predefinita
        let targetScreenId = elements.appContent.id;
        
        // --- LOGICA RIPRISTINO ADMIN (Corretta) ---
        if (userType === 'admin' && teamId === ADMIN_USERNAME_LOWER) {
            window.InterfacciaCore.currentTeamId = teamId;
            
            // Definisce gli ID dei pannelli Admin validi (con controlli di nullitÃ )
            const adminScreens = [
        elements.adminContent?.id,
        elements.championshipContent?.id,
        elements.playerManagementContent?.id,
        elements.teamManagementContent?.id,
    ].filter(Boolean); // Filtra già i valori falsy inclusi null e undefined

            // Reindirizza alla schermata Admin specifica, se salvata e valida
            const savedScreenIsValidAdmin = lastScreenId && 
                document.getElementById(lastScreenId) && 
                adminScreens.includes(lastScreenId);
                
            if (savedScreenIsValidAdmin) {
                targetScreenId = lastScreenId;
            } else {
                targetScreenId = elements.adminContent.id;
            }
            
            const targetElement = document.getElementById(targetScreenId);
            if (targetElement) {
                window.showScreen(targetElement);
            } else {
                // Fallback di sicurezza
                window.showScreen(elements.adminContent);
            }

            document.dispatchEvent(new CustomEvent('adminLoggedIn'));
            
            // Se la destinazione Ã¨ un pannello specifico, forzo il ricaricamento del contenuto
            if (targetScreenId === elements.championshipContent.id) {
                document.dispatchEvent(new CustomEvent('championshipPanelLoaded'));
            } else if (elements.playerManagementContent && targetScreenId === elements.playerManagementContent.id) {
                 // Navigazione complessa Admin (simula il click per ricaricare i dati)
                 const btnPlayerManagement = document.getElementById('btn-player-management');
                 if(btnPlayerManagement) btnPlayerManagement.click();
            }

            // Assicura che l'ultima schermata salvata sia un contenuto Admin valido
            localStorage.setItem('fanta_last_screen', targetScreenId);
            
            console.log(`Sessione Admin ripristinata su: ${targetScreenId}`);
            return true;
        }

        // --- LOGICA RIPRISTINO UTENTE ---
        if (userType === 'user') {
            try {
                const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamId);
                const teamDoc = await getDoc(teamDocRef);

                if (teamDoc.exists()) {
                    const teamData = teamDoc.data();
                    window.InterfacciaCore.currentTeamData = teamData;
                    window.InterfacciaCore.currentTeamId = teamId;
                    await window.fetchAllTeamLogos();
                    
                    // PrioritÃ  1: Onboarding
                    if (requiresCoachSelection && !teamData.coach) {
                        window.showScreen(elements.coachSelectionBox);
                        if (window.InterfacciaOnboarding) {
                            window.InterfacciaOnboarding.initializeCoachSelection(elements);
                        }
                        return true;
                    }

                    if (requiresIconaSelection && !teamData.iconaId) {
                        window.showScreen(elements.captainSelectionBox);
                        if (window.InterfacciaOnboarding) {
                            window.InterfacciaOnboarding.initializeCaptainSelection(elements);
                        }
                        return true;
                    }

                    // PrioritÃ  2: Ripristino Schermata salvata
                    const savedScreenElement = document.getElementById(lastScreenId);
                    if (lastScreenId && savedScreenElement && lastScreenId !== elements.adminContent.id) {
                        targetScreenId = lastScreenId;
                    } else {
                        targetScreenId = elements.appContent.id;
                    }
                    
                    // Aggiorna la dashboard in background
                    if (window.InterfacciaDashboard) {
                        window.InterfacciaDashboard.updateTeamUI(
                            teamData.teamName, 
                            teamDocRef.id, 
                            teamData.logoUrl, 
                            false, 
                            elements
                        );
                    }
                    
                    const targetElement = document.getElementById(targetScreenId);
                    window.showScreen(targetElement || elements.appContent);
                    
                    // Se la destinazione Ã¨ un pannello utente, lanciamo l'evento di caricamento
                    if (targetScreenId === elements.squadraContent.id) {
                        // Ripristina la sotto-modalitÃ  (Rosa o Formazione)
                        const mode = localStorage.getItem('fanta_squadra_mode') || 'rosa';
                         document.dispatchEvent(new CustomEvent('squadraPanelLoaded', { 
                            detail: { mode: mode, teamId: teamId } 
                        }));
                    } else if (targetScreenId === elements.draftContent?.id) {
                         document.dispatchEvent(new CustomEvent('draftPanelLoaded', { 
                            detail: { mode: 'utente', teamId: teamId } 
                        }));
                    } else if (targetScreenId === elements.mercatoContent?.id) {
                         document.dispatchEvent(new CustomEvent('mercatoPanelLoaded', { 
                            detail: { teamId: teamId } 
                        }));
                    }

                    // Assicura che l'ultima schermata salvata sia un contenuto Utente valido
                    localStorage.setItem('fanta_last_screen', targetScreenId);
                    
                    console.log(`Sessione Utente ripristinata su: ${targetScreenId}`);
                    return true;
                }
            } catch (error) {
                console.error("Errore nel ripristino della sessione utente:", error);
                this.clearSession();
                
                // Mostra messaggio all'utente
                if (elements.loginMessage) {
                    elements.loginMessage.textContent = "Sessione scaduta o non valida. Effettua nuovamente l'accesso.";
                    elements.loginMessage.classList.remove('text-green-500');
                    elements.loginMessage.classList.add('text-yellow-400');
                }
                
                return false;
            }
        }
        
        this.clearSession();
        return false;
    },

    /**
     * Gestisce il click sul pulsante Gate.
     */
    handleGateAccess(elements) {
        const { MASTER_PASSWORD } = window.InterfacciaConstants;
        const password = elements.gatePasswordInput.value.trim();
        
        elements.gateMessage.textContent = "";

        if (password === MASTER_PASSWORD) {
            elements.gateMessage.textContent = "Accesso Gate Confermato. Prosegui al Login...";
            elements.gateMessage.classList.remove('text-red-400');
            elements.gateMessage.classList.add('text-green-500');

            setTimeout(() => {
                window.showScreen(elements.loginBox);
                elements.loginUsernameInput.focus();
            }, 1000);

        } else {
            elements.gateMessage.textContent = "Password d'accesso errata. Riprova.";
            elements.gateMessage.classList.remove('text-green-500');
            elements.gateMessage.classList.add('text-red-400');
            elements.gatePasswordInput.value = '';
        }
    },

    /**
     * Gestisce il login utente/admin.
     */
    async handleLoginAccess(elements) {
        const { doc, getDoc, setDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
        const { ADMIN_USERNAME_LOWER, ADMIN_PASSWORD, DEFAULT_LOGO_URL } = window.InterfacciaConstants;
        const INITIAL_SQUAD = window.INITIAL_SQUAD;
        
        const inputTeamName = elements.loginUsernameInput.value.trim();
        const password = elements.loginPasswordInput.value.trim();
        // FIX: Controllo di nullitÃ  per window.auth.currentUser
        const userId = window.auth.currentUser?.uid || 'anon_user';
        
        elements.loginMessage.textContent = "Accesso in corso...";
        elements.loginMessage.classList.remove('text-red-400');
        elements.loginMessage.classList.add('text-green-500');
        
        if (!inputTeamName || !password) {
            elements.loginMessage.textContent = "Inserisci Nome Squadra e Password.";
            elements.loginMessage.classList.remove('text-green-500');
            elements.loginMessage.classList.add('text-red-400');
            return;
        }

        const cleanedTeamName = inputTeamName.replace(/\s/g, '');
        const teamDocId = cleanedTeamName.toLowerCase();

        if (inputTeamName.includes(' ') || inputTeamName !== cleanedTeamName) {
            elements.loginMessage.textContent = "Errore: Il Nome Squadra non puÃ² contenere spazi bianchi. Riprova.";
            elements.loginMessage.classList.remove('text-green-500');
            elements.loginMessage.classList.add('text-red-400');
            return;
        }
        
        // Login Admin
        if (teamDocId === ADMIN_USERNAME_LOWER) {
            if (password !== ADMIN_PASSWORD) {
                elements.loginMessage.textContent = "Password Amministratore non valida.";
                elements.loginMessage.classList.remove('text-green-500');
                elements.loginMessage.classList.add('text-red-400');
                return;
            }
            
            this.saveSession(teamDocId, 'admin');
            localStorage.setItem('fanta_last_screen', elements.adminContent.id); // Salva destinazione Admin

            elements.loginMessage.textContent = "Accesso Amministratore Riuscito!";
            setTimeout(() => {
                window.showScreen(elements.adminContent);
                window.InterfacciaCore.currentTeamId = teamDocId;
                document.dispatchEvent(new CustomEvent('adminLoggedIn'));
            }, 1000);
            return;
        }

        // Login/Registrazione Utente
        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamDocId);
            const teamDoc = await getDoc(teamDocRef);
            
            let isNewTeam = false;
            let teamData = {};
            const teamNameForDisplay = inputTeamName;

            if (teamDoc.exists()) {
                teamData = teamDoc.data();
                
                if (teamData.password !== password) {
                    throw new Error("Password squadra non valida.");
                }
                
                elements.loginMessage.textContent = `Bentornato ${teamNameForDisplay}! Accesso Riuscito.`;
                
                window.InterfacciaCore.currentTeamData = teamData;
                window.InterfacciaCore.currentTeamId = teamDocRef.id;
                await window.fetchAllTeamLogos();

                if (!teamData.coach) {
                    this.saveSession(teamDocId, 'user');
                    localStorage.setItem('fanta_needs_coach', 'true');
                    localStorage.removeItem('fanta_last_screen'); // Resetta lo schermo durante l'onboarding
                    
                    setTimeout(() => {
                        window.showScreen(elements.coachSelectionBox);
                        if (window.InterfacciaOnboarding) {
                            window.InterfacciaOnboarding.initializeCoachSelection(elements);
                        }
                        elements.loginPasswordInput.value = '';
                    }, 1000);
                    return;
                }
                
                if (!teamData.iconaId) {
                    this.saveSession(teamDocId, 'user');
                    localStorage.setItem('fanta_needs_icona', 'true');
                    localStorage.removeItem('fanta_last_screen'); // Resetta lo schermo durante l'onboarding
                    
                    setTimeout(() => {
                        window.showScreen(elements.captainSelectionBox);
                        if (window.InterfacciaOnboarding) {
                            window.InterfacciaOnboarding.initializeCaptainSelection(elements);
                        }
                        elements.loginPasswordInput.value = '';
                    }, 1000);
                    return;
                }

            } else {
                // NUOVA SQUADRA
                isNewTeam = true;
                const initialBudget = 500;
                
                teamData = {
                    teamName: teamNameForDisplay,
                    ownerUserId: userId,
                    password: password,
                    budget: initialBudget,
                    creationDate: new Date().toISOString(),
                    logoUrl: DEFAULT_LOGO_URL,
                    players: INITIAL_SQUAD,
                    coach: null,
                    iconaId: null,
                    formation: {
                        modulo: '1-1-2-1',
                        titolari: INITIAL_SQUAD,
                        panchina: []
                    },
                    isParticipating: false,
                    // COOLDOWN SEPARATI INIZIALIZZATI
                    lastDraftAcquisitionTimestamp: 0, 
                    lastMarketAcquisitionTimestamp: 0,
                };

                await setDoc(teamDocRef, teamData);
                
                this.saveSession(teamDocId, 'user');
                localStorage.setItem('fanta_needs_coach', 'true');
                
                window.InterfacciaCore.currentTeamId = teamDocRef.id;
                window.InterfacciaCore.currentTeamData = teamData;
                
                elements.loginMessage.textContent = `Congratulazioni! Squadra '${teamNameForDisplay}' creata! Scegli il tuo Allenatore...`;
                
                setTimeout(() => {
                    window.showScreen(elements.coachSelectionBox);
                    if (window.InterfacciaOnboarding) {
                        window.InterfacciaOnboarding.initializeCoachSelection(elements);
                    }
                    elements.loginPasswordInput.value = '';
                }, 1000);
                return;
            }

            this.saveSession(teamDocId, 'user');
            localStorage.removeItem('fanta_needs_coach');
            localStorage.removeItem('fanta_needs_icona');
            localStorage.setItem('fanta_last_screen', elements.appContent.id); // Salva Dashboard come default
            
            setTimeout(() => {
                if (window.InterfacciaDashboard) {
                    window.InterfacciaDashboard.updateTeamUI(
                        teamNameForDisplay, 
                        teamDocRef.id, 
                        teamData.logoUrl, 
                        isNewTeam, 
                        elements
                    );
                }
                window.showScreen(elements.appContent);
                elements.loginPasswordInput.value = '';
            }, 1000);
            
        } catch (error) {
            console.error("Errore di accesso/creazione:", error);
            elements.loginMessage.textContent = `Errore: ${error.message}`;
            elements.loginMessage.classList.remove('text-green-500');
            elements.loginMessage.classList.add('text-red-400');
        }
    },

    /**
     * Gestisce il logout utente.
     */
    handleLogout(elements) {
        const { DEFAULT_LOGO_URL } = window.InterfacciaConstants;
        
        console.log("Logout Utente effettuato. Torno alla schermata di login.");
        
        this.clearSession();
        
        elements.loginPasswordInput.value = '';
        window.showScreen(elements.loginBox);
        window.InterfacciaCore.currentTeamId = null;
        window.InterfacciaCore.currentTeamData = null;
        
        if (elements.teamLogoElement) elements.teamLogoElement.src = DEFAULT_LOGO_URL;
        
        // Resetta le statistiche nella dashboard
        if (elements.statRosaLevel) elements.statRosaLevel.textContent = 'N/A';
        if (elements.statFormazioneLevel) elements.statFormazioneLevel.textContent = 'N/A';
        if (elements.statRosaCount) elements.statRosaCount.textContent = `(${0} giocatori)`;
        if (elements.statCoachName) elements.statCoachName.textContent = 'N/A';
        if (elements.statCoachLevel) elements.statCoachLevel.textContent = '1';
    },

    /**
     * Inizializza i listener per Gate e Login.
     */
    initializeAuthListeners(elements) {
        const self = this;
        
        // Gate listeners
        if (elements.gateButton) {
            elements.gateButton.addEventListener('click', () => self.handleGateAccess(elements));
        }
        if (elements.gatePasswordInput) {
            elements.gatePasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') self.handleGateAccess(elements);
            });
        }
        
        // Login listeners
        if (elements.loginButton) {
            elements.loginButton.addEventListener('click', () => self.handleLoginAccess(elements));
        }
        if (elements.loginPasswordInput) {
            elements.loginPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') self.handleLoginAccess(elements);
            });
        }
        if (elements.loginUsernameInput) {
            elements.loginUsernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') self.handleLoginAccess(elements);
            });
        }
        
        // Logout listener
        if (elements.userLogoutButton) {
            elements.userLogoutButton.addEventListener('click', () => self.handleLogout(elements));
        }
        
        // Esponi handleLogout globalmente
        window.handleLogout = () => self.handleLogout(elements);
    }
};

console.log("âœ… Modulo interfaccia-auth.js caricato.");