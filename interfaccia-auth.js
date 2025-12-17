//
// ====================================================================
// MODULO INTERFACCIA-AUTH.JS (Gate, Login, Logout, Sessione)
// ====================================================================
//

window.InterfacciaAuth = {
    
    // Costante per la durata della sessione ricordata (1 giorno in millisecondi)
    SESSION_EXPIRY_MS: 24 * 60 * 60 * 1000,

    /**
     * Salva i dati della sessione in localStorage.
     */
    saveSession(teamId, userType, teamName = null, logoUrl = null) {
        try {
            localStorage.setItem('fanta_session_id', teamId);
            localStorage.setItem('fanta_session_type', userType);
            localStorage.setItem('fanta_session_timestamp', Date.now().toString());
            if (teamName) localStorage.setItem('fanta_session_team_name', teamName);
            if (logoUrl) localStorage.setItem('fanta_session_logo_url', logoUrl);
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
            localStorage.removeItem('fanta_session_timestamp');
            localStorage.removeItem('fanta_session_team_name');
            localStorage.removeItem('fanta_session_logo_url');
            localStorage.removeItem('fanta_coach_name');
            localStorage.removeItem('fanta_needs_coach');
            localStorage.removeItem('fanta_needs_icona');
            localStorage.removeItem('fanta_last_screen');
            localStorage.removeItem('fanta_squadra_mode');
        } catch (e) {
            console.error("Impossibile pulire la sessione da localStorage.", e);
        }
    },

    /**
     * Verifica se la sessione ricordata e' ancora valida (non scaduta).
     */
    isSessionValid() {
        const timestamp = localStorage.getItem('fanta_session_timestamp');
        if (!timestamp) return false;

        const elapsed = Date.now() - parseInt(timestamp);
        return elapsed < this.SESSION_EXPIRY_MS;
    },

    /**
     * Ottiene i dati della sessione ricordata.
     */
    getRememberedSession() {
        const teamId = localStorage.getItem('fanta_session_id');
        const userType = localStorage.getItem('fanta_session_type');
        const teamName = localStorage.getItem('fanta_session_team_name');
        const logoUrl = localStorage.getItem('fanta_session_logo_url');

        if (!teamId || !userType) return null;

        // Non ricordare l'admin
        if (userType === 'admin') return null;

        // Verifica scadenza
        if (!this.isSessionValid()) {
            this.clearSession();
            return null;
        }

        return { teamId, userType, teamName, logoUrl };
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
        let lastScreenId = localStorage.getItem('fanta_last_screen');

        // SEMPRE torna alla dashboard su refresh/nuovo avvio
        // (l'utente puo navigare manualmente dopo il caricamento)
        if (lastScreenId && lastScreenId !== 'app-content') {
            console.log('[Session] Refresh/nuovo avvio - reset alla dashboard');
            lastScreenId = null;
            localStorage.removeItem('fanta_last_screen');
        }

        // Pulisci schermate problematiche dal localStorage (richiedono contesto specifico)
        const problematicScreens = ['draft-content', 'mercato-content'];
        if (lastScreenId && problematicScreens.includes(lastScreenId)) {
            localStorage.removeItem('fanta_last_screen');
            lastScreenId = null;
        }

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
            
            // Definisce gli ID dei pannelli Admin validi (con controlli di nullita)
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
            
            // Se la destinazione e un pannello specifico, forzo il ricaricamento del contenuto
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
                    
                    // Priorita 1: Onboarding
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

                    // Priorita 2: Ripristino Schermata salvata
                    // Escludiamo schermate che richiedono contesto specifico
                    const excludedFromRestore = ['draft-content', 'mercato-content'];
                    const savedScreenElement = document.getElementById(lastScreenId);
                    if (lastScreenId && savedScreenElement &&
                        lastScreenId !== elements.adminContent.id &&
                        !excludedFromRestore.includes(lastScreenId)) {
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
                    
                    // Se la destinazione e un pannello utente, lanciamo l'evento di caricamento
                    if (targetScreenId === elements.squadraContent.id) {
                        // Ripristina la sotto-modalita (Rosa o Formazione)
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
                    } else if (targetScreenId === 'stadium-content') {
                        // Ripristina schermata Stadio
                        if (window.StadiumUI) {
                            setTimeout(() => window.StadiumUI.init(teamId, teamData), 500);
                        }
                    } else if (targetScreenId === 'private-leagues-content') {
                        // Ripristina schermata Leghe Private
                        if (window.PrivateLeaguesUI) {
                            setTimeout(() => window.PrivateLeaguesUI.init(teamId, teamData), 500);
                        }
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
     * NOTA: Il gate è stato rimosso - questa funzione ora mostra direttamente il login
     */
    handleGateAccess(elements) {
        // Gate rimosso - vai direttamente al login
        window.showScreen(elements.loginBox);
        if (elements.loginUsernameInput) {
            elements.loginUsernameInput.focus();
        }
    },

    /**
     * Gestisce il login utente/admin.
     */
    async handleLoginAccess(elements) {
        const { doc, getDoc, setDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
        const { ADMIN_USERNAME_LOWER, DEFAULT_LOGO_URL } = window.InterfacciaConstants;
        const INITIAL_SQUAD = window.INITIAL_SQUAD;
        
        const inputTeamName = elements.loginUsernameInput.value.trim();
        const password = elements.loginPasswordInput.value.trim();
        // FIX: Controllo di nullita per window.auth.currentUser
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
            elements.loginMessage.textContent = "Errore: Il Nome Squadra non puo contenere spazi bianchi. Riprova.";
            elements.loginMessage.classList.remove('text-green-500');
            elements.loginMessage.classList.add('text-red-400');
            return;
        }
        
        // Login Admin - verifica se e' un account admin e valida password da Firestore
        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamDocId);
            const teamDoc = await getDoc(teamDocRef);

            // Controlla se l'account esiste ed e' admin
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                const isAdmin = window.isTeamAdmin(teamData.teamName, teamData);

                if (isAdmin) {
                    // Verifica password da Firestore
                    if (teamData.password !== password) {
                        elements.loginMessage.textContent = "Password Amministratore non valida.";
                        elements.loginMessage.classList.remove('text-green-500');
                        elements.loginMessage.classList.add('text-red-400');
                        return;
                    }

                    // DISTINZIONE: "serieseria" va direttamente al pannello admin
                    // Altre squadre admin vanno alla loro dashboard normale
                    const isSerieseria = teamData.teamName?.toLowerCase() === 'serieseria';

                    if (isSerieseria) {
                        // serieseria: account admin puro, va al pannello admin
                        this.saveSession(teamDocId, 'admin', teamData.teamName, teamData.logoUrl);
                        localStorage.setItem('fanta_last_screen', elements.adminContent.id);
                        window.InterfacciaCore.currentTeamData = teamData;

                        elements.loginMessage.textContent = "Accesso Amministratore Riuscito!";
                        setTimeout(() => {
                            window.showScreen(elements.adminContent);
                            window.InterfacciaCore.currentTeamId = teamDocId;
                            document.dispatchEvent(new CustomEvent('adminLoggedIn'));
                        }, 1000);
                        return;
                    }
                    // Altre squadre admin: continua con il login normale per andare alla dashboard
                    // Il bottone "Pannello Admin" sara' visibile nella loro dashboard
                }
            } else if (teamDocId === ADMIN_USERNAME_LOWER) {
                // Account admin principale non esiste ancora - crealo
                const adminTeamData = {
                    teamName: 'serieseria',
                    ownerUserId: 'admin',
                    password: password, // Prima password diventa la password admin
                    budget: 99999,
                    creationDate: new Date().toISOString(),
                    logoUrl: DEFAULT_LOGO_URL,
                    players: [],
                    coach: 'Admin',
                    iconaId: null,
                    formation: { modulo: '1-1-2-1', titolari: [], panchina: [] },
                    isParticipating: false,
                    isAdmin: true // Flag admin esplicito
                };

                await setDoc(teamDocRef, adminTeamData);

                this.saveSession(teamDocId, 'admin', 'serieseria', DEFAULT_LOGO_URL);
                localStorage.setItem('fanta_last_screen', elements.adminContent.id);
                window.InterfacciaCore.currentTeamData = adminTeamData;

                elements.loginMessage.textContent = "Account Admin creato! Accesso Riuscito.";
                setTimeout(() => {
                    window.showScreen(elements.adminContent);
                    window.InterfacciaCore.currentTeamId = teamDocId;
                    document.dispatchEvent(new CustomEvent('adminLoggedIn'));
                }, 1000);
                return;
            }
        } catch (adminCheckError) {
            console.error("Errore durante il check admin:", adminCheckError);
            // Continua con il login normale se il check admin fallisce
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
                    this.saveSession(teamDocId, 'user', teamData.teamName, teamData.logoUrl);
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
                    this.saveSession(teamDocId, 'user', teamData.teamName, teamData.logoUrl);
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

                // VALIDAZIONE: Verifica che il nome squadra non sia gia in uso (case-insensitive)
                const { collection, getDocs } = window.firestoreTools;
                const teamsCollection = collection(window.db, TEAMS_COLLECTION_PATH);
                const allTeamsSnapshot = await getDocs(teamsCollection);

                const normalizedNewName = teamNameForDisplay.toLowerCase().trim();
                const duplicateName = allTeamsSnapshot.docs.find(docSnap => {
                    const existingName = docSnap.data().teamName?.toLowerCase().trim();
                    return existingName === normalizedNewName;
                });

                if (duplicateName) {
                    throw new Error(`Il nome squadra "${teamNameForDisplay}" e gia in uso. Scegli un nome diverso.`);
                }

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

                this.saveSession(teamDocId, 'user', teamNameForDisplay, null);
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

            this.saveSession(teamDocId, 'user', teamNameForDisplay, teamData.logoUrl);
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
     * Gestisce il "Torna al Login" per gli utenti (mantiene la sessione ricordata).
     */
    handleBackToLogin(elements) {
        const { DEFAULT_LOGO_URL, ADMIN_USERNAME_LOWER } = window.InterfacciaConstants;

        // Controlla se l'admin stava visualizzando una squadra
        const adminViewingTeam = localStorage.getItem('fanta_admin_viewing_team');
        const sessionType = localStorage.getItem('fanta_session_type');

        if (adminViewingTeam && sessionType === 'admin') {
            // Admin stava visualizzando una squadra - torna all'admin panel
            console.log("Admin torna al pannello amministrativo.");
            localStorage.removeItem('fanta_admin_viewing_team');

            // Ripristina lo stato admin
            window.InterfacciaCore.currentTeamId = ADMIN_USERNAME_LOWER;
            window.InterfacciaCore.currentTeamData = null;

            // Torna al pannello admin
            const adminContent = document.getElementById('admin-content');
            if (adminContent && window.showScreen) {
                window.showScreen(adminContent);
            }
            return;
        }

        console.log("Utente torna alla schermata di login (sessione mantenuta).");

        // NON cancellare la sessione - mantienila per il "Rientra in Dashboard"
        localStorage.removeItem('fanta_admin_viewing_team');

        // Mostra la pagina di login con la sessione ricordata
        this.showLoginWithRememberedSession(elements);

        if (elements.teamLogoElement) elements.teamLogoElement.src = DEFAULT_LOGO_URL;
    },

    /**
     * Gestisce il logout completo (cancella tutto).
     */
    handleFullLogout(elements) {
        const { DEFAULT_LOGO_URL } = window.InterfacciaConstants;

        console.log("Logout completo effettuato.");

        this.clearSession();
        localStorage.removeItem('fanta_admin_viewing_team');

        // Nascondi sessione ricordata e mostra login normale
        const rememberedBox = document.getElementById('remembered-session-box');
        const normalLoginBox = document.getElementById('normal-login-box');
        if (rememberedBox) rememberedBox.classList.add('hidden');
        if (normalLoginBox) normalLoginBox.classList.remove('hidden');

        elements.loginPasswordInput.value = '';
        elements.loginUsernameInput.value = '';
        window.showScreen(elements.loginBox);
        window.InterfacciaCore.currentTeamId = null;
        window.InterfacciaCore.currentTeamData = null;

        if (elements.teamLogoElement) elements.teamLogoElement.src = DEFAULT_LOGO_URL;

        // Resetta le statistiche nella dashboard
        if (elements.statRosaLevel) elements.statRosaLevel.textContent = 'N/A';
        if (elements.statFormazioneLevel) elements.statFormazioneLevel.textContent = 'N/A';
        if (elements.statRosaCount) elements.statRosaCount.textContent = `(${0} giocatori)`;
    },

    /**
     * Mostra la pagina di login con la sessione ricordata (se valida).
     */
    showLoginWithRememberedSession(elements) {
        const rememberedSession = this.getRememberedSession();
        const rememberedBox = document.getElementById('remembered-session-box');
        const normalLoginBox = document.getElementById('normal-login-box');
        const { DEFAULT_LOGO_URL } = window.InterfacciaConstants;

        if (rememberedSession && rememberedBox && normalLoginBox) {
            // Mostra la sessione ricordata
            const logoImg = document.getElementById('remembered-team-logo');
            const teamNameEl = document.getElementById('remembered-team-name');

            if (logoImg) logoImg.src = window.sanitizeGitHubUrl(rememberedSession.logoUrl) || DEFAULT_LOGO_URL;
            if (teamNameEl) teamNameEl.textContent = rememberedSession.teamName || rememberedSession.teamId;

            rememberedBox.classList.remove('hidden');
            normalLoginBox.classList.add('hidden');
        } else {
            // Nessuna sessione valida, mostra login normale
            if (rememberedBox) rememberedBox.classList.add('hidden');
            if (normalLoginBox) normalLoginBox.classList.remove('hidden');
        }

        window.showScreen(elements.loginBox);
    },

    /**
     * Gestisce il rientro rapido in dashboard dalla sessione ricordata.
     */
    async handleReenterDashboard(elements) {
        const rememberedSession = this.getRememberedSession();

        if (!rememberedSession) {
            console.log("Sessione scaduta o non valida.");
            this.handleFullLogout(elements);
            return;
        }

        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

        try {
            // Carica i dati della squadra da Firestore
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, rememberedSession.teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                console.log("Squadra non trovata. Logout forzato.");
                this.handleFullLogout(elements);
                return;
            }

            const teamData = teamDoc.data();

            // Imposta i dati nel core
            window.InterfacciaCore.currentTeamId = rememberedSession.teamId;
            window.InterfacciaCore.currentTeamData = teamData;

            // Carica i loghi delle squadre
            if (window.fetchAllTeamLogos) {
                await window.fetchAllTeamLogos();
            }

            // Aggiorna la UI della dashboard
            if (window.InterfacciaDashboard) {
                window.InterfacciaDashboard.updateTeamUI(
                    teamData.teamName,
                    rememberedSession.teamId,
                    teamData.logoUrl,
                    false,
                    elements
                );
            }

            // Aggiorna timestamp sessione
            this.saveSession(
                rememberedSession.teamId,
                'user',
                teamData.teamName,
                teamData.logoUrl
            );

            // Mostra la dashboard
            window.showScreen(elements.appContent);

            console.log("Rientro in dashboard completato per:", teamData.teamName);

        } catch (error) {
            console.error("Errore nel rientro dashboard:", error);
            this.handleFullLogout(elements);
        }
    },

    /**
     * Gestisce il logout utente (per compatibilita - ora chiama handleBackToLogin per utenti).
     */
    handleLogout(elements) {
        const sessionType = localStorage.getItem('fanta_session_type');

        // Per l'admin, fai logout completo
        if (sessionType === 'admin') {
            this.handleFullLogout(elements);
        } else {
            // Per gli utenti, torna al login mantenendo la sessione
            this.handleBackToLogin(elements);
        }
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
        
        // Bottone "Torna al Login" nella dashboard utente
        const btnBackToLoginDashboard = document.getElementById('user-back-to-login-button');
        if (btnBackToLoginDashboard) {
            btnBackToLoginDashboard.addEventListener('click', () => self.handleBackToLogin(elements));
        }

        // Bottone "Rientra in Dashboard" dalla sessione ricordata
        const btnReenterDashboard = document.getElementById('btn-reenter-dashboard');
        if (btnReenterDashboard) {
            btnReenterDashboard.addEventListener('click', () => self.handleReenterDashboard(elements));
        }

        // Bottone "Logout Completo" dalla sessione ricordata
        const btnFullLogout = document.getElementById('btn-full-logout');
        if (btnFullLogout) {
            btnFullLogout.addEventListener('click', () => self.handleFullLogout(elements));
        }

        // Esponi handleLogout globalmente (per compatibilita)
        window.handleLogout = () => self.handleLogout(elements);
        window.handleFullLogout = () => self.handleFullLogout(elements);

        // Lista Icone listener
        const btnListaIcone = document.getElementById('btn-lista-icone');
        const listaIconeModal = document.getElementById('lista-icone-modal');
        const btnCloseListaIcone = document.getElementById('btn-close-lista-icone');

        if (btnListaIcone && listaIconeModal) {
            btnListaIcone.addEventListener('click', () => self.showListaIcone());
        }
        if (btnCloseListaIcone && listaIconeModal) {
            btnCloseListaIcone.addEventListener('click', () => self.hideListaIcone());
        }
        // Bottone "Torna al Login"
        const btnBackToLogin = document.getElementById('btn-back-to-login');
        if (btnBackToLogin) {
            btnBackToLogin.addEventListener('click', () => self.hideListaIcone());
        }
        // Chiudi cliccando fuori dal modal
        if (listaIconeModal) {
            listaIconeModal.addEventListener('click', (e) => {
                if (e.target === listaIconeModal) {
                    self.hideListaIcone();
                }
            });
        }

        // Lista Squadre listener
        const btnListaSquadre = document.getElementById('btn-lista-squadre');
        const listaSquadreModal = document.getElementById('lista-squadre-modal');
        const btnCloseListaSquadre = document.getElementById('btn-close-lista-squadre');

        if (btnListaSquadre && listaSquadreModal) {
            btnListaSquadre.addEventListener('click', () => self.showListaSquadre());
        }
        if (btnCloseListaSquadre && listaSquadreModal) {
            btnCloseListaSquadre.addEventListener('click', () => self.hideListaSquadre());
        }
        // Bottone "Torna al Login" per squadre
        const btnBackFromSquadre = document.getElementById('btn-back-from-squadre');
        if (btnBackFromSquadre) {
            btnBackFromSquadre.addEventListener('click', () => self.hideListaSquadre());
        }
        // Chiudi cliccando fuori dal modal squadre
        if (listaSquadreModal) {
            listaSquadreModal.addEventListener('click', (e) => {
                if (e.target === listaSquadreModal) {
                    self.hideListaSquadre();
                }
            });
        }

        // CoppaSeriA listener (dalla homepage)
        const btnCoppaHome = document.getElementById('btn-coppa-home');
        if (btnCoppaHome) {
            btnCoppaHome.addEventListener('click', () => self.showCoppaFromHome(elements));
        }

        // SuperCoppa listener (dalla homepage)
        const btnSupercoppaHome = document.getElementById('btn-supercoppa-home');
        if (btnSupercoppaHome) {
            btnSupercoppaHome.addEventListener('click', () => self.showSupercoppaFromHome(elements));
        }
    },

    /**
     * Mostra il modal con la lista delle Icone disponibili
     */
    showListaIcone() {
        const modal = document.getElementById('lista-icone-modal');
        const container = document.getElementById('lista-icone-container');

        if (!modal || !container) return;

        // Ottieni le icone dal template (escludi Flavio El Ficario)
        const icone = (window.CAPTAIN_CANDIDATES_TEMPLATES || []).filter(i => i.id !== 'flavio');

        // Ordina le icone per ruolo (P, D, C, A)
        const ROLE_ORDER = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
        const iconeOrdinate = [...icone].sort((a, b) => {
            const orderA = ROLE_ORDER[a.role] !== undefined ? ROLE_ORDER[a.role] : 99;
            const orderB = ROLE_ORDER[b.role] !== undefined ? ROLE_ORDER[b.role] : 99;
            return orderA - orderB;
        });

        // Popola il container con card cliccabili
        container.innerHTML = iconeOrdinate.map(icona => {
            // Ottieni tutte le abilita dell'icona
            const abilities = icona.abilities || ['Icona'];
            const uniqueAbility = abilities.find(a => a !== 'Icona') || null;

            return `
                <div class="p-4 bg-gray-700 rounded-lg border-2 border-yellow-600 text-center shadow-lg cursor-pointer hover:bg-gray-600 hover:border-yellow-400 transition-all duration-200"
                     onclick="window.InterfacciaAuth.showIconaDetails('${icona.id}')">
                    <img src="${window.sanitizeGitHubUrl(icona.photoUrl)}"
                         alt="${icona.name}"
                         class="w-24 h-24 rounded-full mx-auto mb-3 object-cover border-4 border-yellow-400">
                    <p class="text-lg font-extrabold text-white">${icona.name} 👑</p>
                    <p class="text-sm text-yellow-400">${icona.role} - ${icona.type}</p>
                    <p class="text-xs text-gray-400">Livello: ${icona.levelRange ? icona.levelRange[0] + '-' + icona.levelRange[1] : icona.level}</p>
                    <div class="mt-2 space-y-1">
                        <p class="text-xs text-amber-400 font-semibold">Icona</p>
                        ${uniqueAbility ? `<p class="text-xs text-amber-300 font-bold">${uniqueAbility}</p>` : ''}
                    </div>
                    <p class="text-xs text-gray-500 mt-2 italic">Clicca per dettagli</p>
                </div>
            `;
        }).join('');

        // Mostra il modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    /**
     * Mostra i dettagli di un'icona specifica con le sue abilita
     */
    showIconaDetails(iconaId) {
        const icone = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
        const icona = icone.find(i => i.id === iconaId);
        if (!icona) return;

        const abilities = icona.abilities || ['Icona'];
        const abilitiesData = window.AbilitiesEncyclopedia?.abilities || {};

        // Costruisci HTML per ogni abilita
        const abilitiesHtml = abilities.map(abilityName => {
            const abilityData = abilitiesData[abilityName];
            if (!abilityData) {
                return `<div class="p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <p class="font-bold text-amber-400">${abilityName}</p>
                    <p class="text-sm text-gray-400">Descrizione non disponibile</p>
                </div>`;
            }

            const isUniqueAbility = abilityData.rarity === 'Unica' && abilityName !== 'Icona';
            const borderColor = isUniqueAbility ? 'border-amber-500' : 'border-yellow-600';
            const bgColor = isUniqueAbility ? 'bg-amber-900/30' : 'bg-gray-700';

            return `
                <div class="p-3 ${bgColor} rounded-lg border ${borderColor}">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xl">${abilityData.icon || '⭐'}</span>
                        <span class="font-bold ${isUniqueAbility ? 'text-amber-300' : 'text-yellow-400'}">${abilityName}</span>
                        ${isUniqueAbility ? '<span class="text-xs bg-amber-600 text-white px-2 py-0.5 rounded">UNICA</span>' : ''}
                    </div>
                    <p class="text-sm text-gray-300 mb-2">${abilityData.description || ''}</p>
                    ${abilityData.effect ? `<p class="text-xs text-green-400"><strong>Effetto:</strong> ${abilityData.effect}</p>` : ''}
                    ${abilityData.activation ? `<p class="text-xs text-blue-400 mt-1"><strong>Attivazione:</strong> ${abilityData.activation}</p>` : ''}
                    ${abilityData.example ? `<p class="text-xs text-gray-400 mt-1 italic">${abilityData.example}</p>` : ''}
                </div>
            `;
        }).join('');

        // Crea e mostra il modal dei dettagli
        const existingModal = document.getElementById('icona-details-modal');
        if (existingModal) existingModal.remove();

        const detailsModal = document.createElement('div');
        detailsModal.id = 'icona-details-modal';
        detailsModal.className = 'fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-[60] overflow-y-auto';
        detailsModal.innerHTML = `
            <div class="bg-gray-800 rounded-xl border-2 border-yellow-500 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-gray-800 p-4 border-b border-yellow-600 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <img src="${window.sanitizeGitHubUrl(icona.photoUrl)}"
                             alt="${icona.name}"
                             class="w-16 h-16 rounded-full object-cover border-3 border-yellow-400">
                        <div>
                            <h3 class="text-xl font-bold text-white">${icona.name} 👑</h3>
                            <p class="text-sm text-yellow-400">${icona.role} - ${icona.type} - Lv. Iniziale: 10</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('icona-details-modal').remove()"
                            class="text-white hover:text-red-400 text-2xl font-bold">✕</button>
                </div>
                <div class="p-4 space-y-3">
                    <h4 class="text-lg font-bold text-yellow-400 mb-3">Abilita</h4>
                    ${abilitiesHtml}
                </div>
            </div>
        `;

        document.body.appendChild(detailsModal);

        // Chiudi cliccando fuori
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                detailsModal.remove();
            }
        });
    },

    /**
     * Nasconde il modal della lista Icone
     */
    hideListaIcone() {
        const modal = document.getElementById('lista-icone-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    /**
     * Mostra il modal con la lista delle Squadre registrate
     */
    async showListaSquadre() {
        const modal = document.getElementById('lista-squadre-modal');
        const container = document.getElementById('lista-squadre-container');

        if (!modal || !container) return;

        // Mostra il modal subito con loading
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        container.innerHTML = '<p class="text-center text-gray-400 col-span-2">Caricamento squadre...</p>';

        try {
            // Verifica che Firestore sia disponibile
            if (!window.db || !window.firestoreTools) {
                throw new Error("Database non disponibile");
            }

            const { collection, getDocs } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const querySnapshot = await getDocs(teamsCollectionRef);

            if (querySnapshot.empty) {
                container.innerHTML = '<p class="text-center text-gray-400 col-span-2">Nessuna squadra registrata.</p>';
                return;
            }

            // Mappa le squadre
            const squadre = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Ordina per nome squadra
            squadre.sort((a, b) => (a.teamName || '').localeCompare(b.teamName || ''));

            // Salva i dati delle squadre per la visualizzazione rosa
            this._squadreCache = squadre;

            // Popola il container
            container.innerHTML = squadre.map((squadra, index) => {
                const teamName = squadra.teamName || 'Squadra Sconosciuta';
                const teamColor = squadra.primaryColor || '#22c55e';
                const players = squadra.players || [];
                const playersCount = players.length;
                // Sanitizza URL per convertire vecchi formati GitHub
                const logoUrl = window.sanitizeGitHubUrl(squadra.logoUrl) || 'https://placehold.co/80x80/374151/9ca3af?text=Logo';

                // Trova l'icona (capitano)
                const icona = players.find(p => p.abilities && p.abilities.includes('Icona'));

                // Cerca il photoUrl corretto: prima dal template ICONE, poi dal giocatore salvato
                let iconaPhoto = 'https://placehold.co/40x40/374151/9ca3af?text=?';
                if (icona) {
                    // Cerca nel template delle icone per avere sempre il link aggiornato
                    const iconaTemplate = (window.CAPTAIN_CANDIDATES_TEMPLATES || []).find(t =>
                        t.id === icona.id || t.name === icona.name
                    );
                    if (iconaTemplate && iconaTemplate.photoUrl) {
                        iconaPhoto = window.sanitizeGitHubUrl(iconaTemplate.photoUrl);
                    } else if (icona.photoUrl) {
                        iconaPhoto = window.sanitizeGitHubUrl(icona.photoUrl);
                    }
                }

                return `
                    <div class="p-4 bg-gray-700 rounded-lg border-2 shadow-lg" style="border-color: ${teamColor};">
                        <div class="flex items-center gap-3 mb-3">
                            <img src="${logoUrl}"
                                 alt="${teamName}"
                                 class="w-12 h-12 rounded-lg object-cover border-2"
                                 style="border-color: ${teamColor};"
                                 onerror="this.src='https://placehold.co/80x80/374151/9ca3af?text=Logo'">
                            <div class="flex-1 min-w-0">
                                <p class="text-base font-extrabold truncate" style="color: ${teamColor};">${teamName}</p>
                                <p class="text-xs text-gray-400">${playersCount} giocatori</p>
                            </div>
                            <img src="${iconaPhoto}"
                                 alt="Icona"
                                 class="w-10 h-10 rounded-full object-cover border-2 border-yellow-400 flex-shrink-0"
                                 onerror="this.src='https://placehold.co/40x40/374151/9ca3af?text=?'">
                        </div>
                        <button onclick="window.InterfacciaAuth.showRosaSquadra(${index})"
                                class="w-full bg-purple-600 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-purple-500 transition duration-150 transform hover:scale-[1.02]">
                            📋 Rosa
                        </button>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error("Errore nel caricamento squadre:", error);
            container.innerHTML = `
                <div class="col-span-2 text-center">
                    <p class="text-red-400 font-bold">Errore nel caricamento</p>
                    <p class="text-gray-400 text-sm">${error.message}</p>
                    <button onclick="window.InterfacciaAuth.showListaSquadre()"
                            class="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition">
                        Riprova
                    </button>
                </div>
            `;
        }
    },

    /**
     * Nasconde il modal della lista Squadre
     */
    hideListaSquadre() {
        const modal = document.getElementById('lista-squadre-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    /**
     * Mostra la rosa di una squadra (sola lettura)
     * @param {number} squadraIndex - Indice della squadra nella cache
     */
    showRosaSquadra(squadraIndex) {
        if (!this._squadreCache || !this._squadreCache[squadraIndex]) {
            console.error("Squadra non trovata nella cache");
            return;
        }

        const squadra = this._squadreCache[squadraIndex];
        const teamName = squadra.teamName || 'Squadra Sconosciuta';
        const teamColor = squadra.primaryColor || '#22c55e';
        const players = squadra.players || [];

        // Ordina i giocatori per ruolo (P, D, C, A) e poi per livello
        const ROLE_ORDER = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
        const sortedPlayers = [...players].sort((a, b) => {
            const orderA = ROLE_ORDER[a.role] !== undefined ? ROLE_ORDER[a.role] : 99;
            const orderB = ROLE_ORDER[b.role] !== undefined ? ROLE_ORDER[b.role] : 99;
            if (orderA !== orderB) return orderA - orderB;
            return (b.level || 0) - (a.level || 0);
        });

        // Crea il contenuto della modale
        const modalHtml = `
            <div id="rosa-squadra-modal" class="fixed inset-0 bg-black bg-opacity-90 flex items-start justify-center p-4 pt-8 z-[60] overflow-y-auto">
                <div class="football-box w-full max-w-2xl mx-auto mb-8">
                    <div class="flex justify-between items-center mb-4 border-b pb-2" style="border-color: ${teamColor};">
                        <h3 class="text-2xl font-bold" style="color: ${teamColor};">📋 Rosa ${teamName}</h3>
                        <button onclick="window.InterfacciaAuth.hideRosaSquadra()" class="text-white hover:text-red-400 text-3xl font-bold">✕</button>
                    </div>
                    <p class="text-gray-400 text-sm mb-4 text-center">${sortedPlayers.length} giocatori in rosa</p>
                    <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        ${sortedPlayers.length === 0 ?
                            '<p class="text-center text-gray-500">Nessun giocatore in rosa</p>' :
                            sortedPlayers.map(player => {
                                const isIcona = player.abilities && player.abilities.includes('Icona');
                                const roleColors = {
                                    'P': 'bg-yellow-600',
                                    'D': 'bg-blue-600',
                                    'C': 'bg-green-600',
                                    'A': 'bg-red-600'
                                };
                                const roleColor = roleColors[player.role] || 'bg-gray-600';

                                // Per le icone, cerca il photoUrl dal template per avere sempre il link aggiornato
                                let photoUrl = window.sanitizeGitHubUrl(player.photoUrl) || 'https://placehold.co/40x40/374151/9ca3af?text=' + (player.name ? player.name.charAt(0) : '?');
                                if (isIcona) {
                                    const iconaTemplate = (window.CAPTAIN_CANDIDATES_TEMPLATES || []).find(t =>
                                        t.id === player.id || t.name === player.name
                                    );
                                    if (iconaTemplate && iconaTemplate.photoUrl) {
                                        photoUrl = window.sanitizeGitHubUrl(iconaTemplate.photoUrl);
                                    }
                                }

                                const abilitiesText = player.abilities && player.abilities.length > 0
                                    ? player.abilities.filter(a => a !== 'Icona').join(', ')
                                    : '';

                                return `
                                    <div class="flex items-center gap-3 p-3 bg-gray-700 rounded-lg ${isIcona ? 'border-2 border-yellow-400' : ''}">
                                        <img src="${photoUrl}"
                                             alt="${player.name}"
                                             class="w-10 h-10 rounded-full object-cover ${isIcona ? 'border-2 border-yellow-400' : ''}"
                                             onerror="this.src='https://placehold.co/40x40/374151/9ca3af?text=?'">
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center gap-2">
                                                <span class="font-bold text-white truncate">${player.name || 'Sconosciuto'}</span>
                                                ${isIcona ? '<span class="text-yellow-400">👑</span>' : ''}
                                            </div>
                                            <p class="text-xs text-gray-400">${player.type || 'N/A'} | Liv. ${player.level || '?'}</p>
                                            ${abilitiesText ? `<p class="text-xs text-green-400 truncate">${abilitiesText}</p>` : ''}
                                        </div>
                                        <span class="${roleColor} text-white text-xs font-bold px-2 py-1 rounded">${player.role || '?'}</span>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                    <button onclick="window.InterfacciaAuth.hideRosaSquadra()"
                            class="mt-4 w-full bg-gray-600 text-white font-bold py-2 rounded-lg hover:bg-gray-500 transition">
                        Chiudi
                    </button>
                </div>
            </div>
        `;

        // Rimuovi modale esistente se presente
        const existingModal = document.getElementById('rosa-squadra-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Aggiungi la modale al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Chiudi cliccando fuori
        const modal = document.getElementById('rosa-squadra-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideRosaSquadra();
                }
            });
        }
    },

    /**
     * Nasconde il modal della rosa squadra
     */
    hideRosaSquadra() {
        const modal = document.getElementById('rosa-squadra-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Mostra il tabellone CoppaSeriA dalla homepage (senza login)
     */
    showCoppaFromHome(elements) {
        const coppaContent = document.getElementById('user-coppa-content');
        if (!coppaContent) {
            console.error("Elemento user-coppa-content non trovato");
            return;
        }

        // Cambia il bottone back per tornare al login
        const backButton = coppaContent.querySelector('button');
        if (backButton) {
            backButton.textContent = '← Torna al Login';
            backButton.onclick = () => {
                if (window.showScreen && elements.loginBox) {
                    window.showScreen(elements.loginBox);
                }
            };
        }

        // Mostra la schermata
        if (window.showScreen) {
            window.showScreen(coppaContent);
        }

        // Carica i dati della coppa (solo visualizzazione tabellone)
        this.loadCoppaTabellone();
    },

    /**
     * Carica il tabellone della CoppaSeriA per visualizzazione pubblica
     */
    async loadCoppaTabellone() {
        const container = document.getElementById('user-coppa-container');
        if (!container) return;

        container.innerHTML = '<p class="text-center text-gray-400">Caricamento tabellone CoppaSeriA...</p>';

        try {
            // Verifica se i moduli necessari sono disponibili
            if (!window.db || !window.firestoreTools) {
                container.innerHTML = '<p class="text-center text-red-400">Servizi Firebase non disponibili. Ricarica la pagina.</p>';
                return;
            }

            const { doc, getDoc, collection, getDocs } = window.firestoreTools;
            const appId = window.firestoreTools.appId;

            if (!appId) {
                container.innerHTML = '<p class="text-center text-red-400">AppId non disponibile.</p>';
                return;
            }

            // Carica lo stato della coppa
            const coppaConfigPath = `artifacts/${appId}/public/data/config`;
            const coppaConfigRef = doc(window.db, coppaConfigPath, 'championship');
            const coppaConfigDoc = await getDoc(coppaConfigRef);
            const configData = coppaConfigDoc.exists() ? coppaConfigDoc.data() : {};
            const coppaState = configData.coppaState || null;

            if (!coppaState || !coppaState.isActive) {
                container.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-purple-500 text-center">
                        <p class="text-2xl font-bold text-purple-400 mb-2">🏆 CoppaSeriA</p>
                        <p class="text-gray-300">La CoppaSeriA non e' ancora iniziata.</p>
                        <p class="text-sm text-gray-400 mt-2">Torna piu' tardi per vedere il tabellone!</p>
                    </div>
                `;
                return;
            }

            // Se CoppaBrackets e' disponibile, usa il suo render
            if (window.CoppaBrackets && window.CoppaBrackets.renderBracket) {
                container.innerHTML = '<div id="coppa-bracket-home" class="mt-4"></div>';
                const bracketContainer = document.getElementById('coppa-bracket-home');
                window.CoppaBrackets.renderBracket(bracketContainer, coppaState.bracket, coppaState.currentRound);
            } else {
                // Fallback: mostra info base
                container.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-purple-500">
                        <p class="text-2xl font-bold text-purple-400 text-center mb-4">🏆 CoppaSeriA</p>
                        <p class="text-center text-gray-300">Turno attuale: <span class="font-bold text-white">${coppaState.currentRound || 'N/A'}</span></p>
                        <p class="text-center text-sm text-gray-400 mt-2">Tabellone dettagliato disponibile nella dashboard.</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error("Errore caricamento tabellone coppa:", error);
            container.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center">
                    <p class="text-red-400 font-bold">Errore nel caricamento</p>
                    <p class="text-sm text-gray-400 mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Mostra il tabellone SuperCoppaSeriA dalla homepage (senza login)
     */
    showSupercoppaFromHome(elements) {
        const supercoppaContent = document.getElementById('user-supercoppa-content');
        if (!supercoppaContent) {
            console.error("Elemento user-supercoppa-content non trovato");
            return;
        }

        // Cambia il bottone back per tornare al login
        const backButton = supercoppaContent.querySelector('button');
        if (backButton) {
            backButton.textContent = '← Torna al Login';
            backButton.onclick = () => {
                if (window.showScreen && elements.loginBox) {
                    window.showScreen(elements.loginBox);
                }
            };
        }

        // Mostra la schermata
        if (window.showScreen) {
            window.showScreen(supercoppaContent);
        }

        // Carica i dati della supercoppa
        this.loadSupercoppaTabellone();
    },

    /**
     * Carica lo stato della SuperCoppaSeriA per visualizzazione pubblica
     */
    async loadSupercoppaTabellone() {
        const container = document.getElementById('user-supercoppa-container');
        if (!container) return;

        container.innerHTML = '<p class="text-center text-gray-400">Caricamento SuperCoppaSeriA...</p>';

        try {
            // Verifica se i moduli necessari sono disponibili
            if (!window.db || !window.firestoreTools) {
                container.innerHTML = '<p class="text-center text-red-400">Servizi Firebase non disponibili. Ricarica la pagina.</p>';
                return;
            }

            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;

            if (!appId) {
                container.innerHTML = '<p class="text-center text-red-400">AppId non disponibile.</p>';
                return;
            }

            // Carica lo stato della supercoppa
            const configPath = `artifacts/${appId}/public/data/config`;
            const configRef = doc(window.db, configPath, 'championship');
            const configDoc = await getDoc(configRef);
            const configData = configDoc.exists() ? configDoc.data() : {};
            const supercoppaState = configData.supercoppaState || null;

            if (!supercoppaState) {
                container.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-yellow-500 text-center">
                        <p class="text-2xl font-bold text-yellow-400 mb-2">⭐ Super CoppaSeriA</p>
                        <p class="text-gray-300">La Super CoppaSeriA non e' ancora iniziata.</p>
                        <p class="text-sm text-gray-400 mt-2">Si disputa tra il vincitore della SerieSeriA e il vincitore della CoppaSeriA!</p>
                    </div>
                `;
                return;
            }

            // Mostra lo stato della supercoppa
            const team1Name = supercoppaState.team1Name || 'Vincitore Campionato';
            const team2Name = supercoppaState.team2Name || 'Vincitore Coppa';
            const isCompleted = supercoppaState.isCompleted || false;
            const winner = supercoppaState.winner || null;
            const score = supercoppaState.score || null;

            let statusHtml = '';
            if (isCompleted && winner) {
                statusHtml = `
                    <div class="p-4 bg-yellow-900/30 rounded-lg border-2 border-yellow-400 text-center">
                        <p class="text-lg text-yellow-400 font-bold mb-2">🏆 VINCITORE 🏆</p>
                        <p class="text-2xl font-extrabold text-white">${winner}</p>
                        ${score ? `<p class="text-gray-300 mt-2">Risultato: ${score}</p>` : ''}
                    </div>
                `;
            } else if (supercoppaState.isScheduled) {
                statusHtml = `
                    <div class="p-4 bg-gray-600 rounded-lg text-center">
                        <p class="text-yellow-400 font-bold">Partita in programma</p>
                        <p class="text-sm text-gray-300 mt-2">La Super CoppaSeriA sara' simulata a breve!</p>
                    </div>
                `;
            } else {
                statusHtml = `
                    <div class="p-4 bg-gray-600 rounded-lg text-center">
                        <p class="text-gray-300">In attesa dei finalisti...</p>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-yellow-500">
                    <p class="text-2xl font-bold text-yellow-400 text-center mb-6">⭐ Super CoppaSeriA ⭐</p>

                    <div class="flex items-center justify-center gap-4 mb-6">
                        <div class="text-center flex-1">
                            <p class="text-xs text-gray-400 mb-1">Campione SerieSeriA</p>
                            <p class="font-bold text-white text-lg">${team1Name}</p>
                        </div>
                        <div class="text-2xl font-bold text-yellow-400">VS</div>
                        <div class="text-center flex-1">
                            <p class="text-xs text-gray-400 mb-1">Vincitore CoppaSeriA</p>
                            <p class="font-bold text-white text-lg">${team2Name}</p>
                        </div>
                    </div>

                    ${statusHtml}
                </div>
            `;

        } catch (error) {
            console.error("Errore caricamento supercoppa:", error);
            container.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center">
                    <p class="text-red-400 font-bold">Errore nel caricamento</p>
                    <p class="text-sm text-gray-400 mt-2">${error.message}</p>
                </div>
            `;
        }
    }
};

console.log("Modulo interfaccia-auth.js caricato.");