//
// ====================================================================
// MODULO INTERFACCIA.JS (Orchestratore Principale)
// ====================================================================
// Questo file coordina tutti i moduli dell'interfaccia:
// - interfaccia-core.js      (Variabili globali, costanti, helpers)
// - interfaccia-auth.js      (Gate, Login, Logout, Sessione)
// - interfaccia-dashboard.js (Dashboard Utente, Statistiche, Prossima Partita)
// - interfaccia-navigation.js (Navigazione e Routing)
// - interfaccia-onboarding.js (Selezione Coach e Icona)
// - interfaccia-team.js      (Gestione Logo e Eliminazione Squadra)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    // Variabile per tracciare i tentativi di inizializzazione
    let initRetryCount = 0;
    const MAX_INIT_RETRIES = 10;
    
    const attemptInitialization = () => {
        // Verifica che gli oggetti globali Firebase siano disponibili
        if (typeof window.auth === 'undefined' || typeof window.db === 'undefined' || typeof window.firestoreTools === 'undefined' || typeof window.showScreen === 'undefined') {
            if (initRetryCount >= MAX_INIT_RETRIES) {
                console.error("ERRORE CRITICO: Impossibile inizializzare Firebase dopo", MAX_INIT_RETRIES, "tentativi.");
                const gateBox = document.getElementById('gate-box');
                if (gateBox) {
                    gateBox.innerHTML = `
                        <div class="text-center">
                            <h2 class="text-2xl font-bold text-red-400 mb-4">Errore di Inizializzazione</h2>
                            <p class="text-gray-300 mb-4">Impossibile caricare i servizi Firebase.</p>
                            <button onclick="location.reload()" class="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-400">
                                Ricarica Pagina
                            </button>
                        </div>
                    `;
                    gateBox.classList.remove('hidden-on-load');
                }
                return;
            }
            
            initRetryCount++;
            console.warn("Servizi Firebase non pronti, ritento caricamento interfaccia... (tentativo", initRetryCount, "di", MAX_INIT_RETRIES, ")");
            setTimeout(attemptInitialization, 100);
            return;
        }
        
        // Verifica che tutti i moduli siano caricati
        if (!window.InterfacciaCore || !window.InterfacciaAuth || !window.InterfacciaDashboard || 
            !window.InterfacciaNavigation || !window.InterfacciaOnboarding || !window.InterfacciaTeam) {
            if (initRetryCount >= MAX_INIT_RETRIES) {
                console.error("ERRORE CRITICO: Impossibile caricare i moduli dell'interfaccia dopo", MAX_INIT_RETRIES, "tentativi.");
                return;
            }
            
            initRetryCount++;
            console.warn("Moduli interfaccia non ancora caricati, ritento... (tentativo", initRetryCount, "di", MAX_INIT_RETRIES, ")");
            setTimeout(attemptInitialization, 100);
            return;
        }
        
        // Inizializzazione riuscita - continua con il setup
        initializeApplication();
    };
    
    const initializeApplication = () => {
    // --- INIZIALIZZAZIONE VARIABILI GLOBALI ---
    window.InterfacciaCore.auth = window.auth;
    window.InterfacciaCore.db = window.db;
    
    // Assicura che firestoreTools sia disponibile e contenga tutte le funzioni necessarie
    // Le funzioni sono gia state esposte in index.html durante l'inizializzazione di Firebase
    if (!window.firestoreTools) {
        console.error('firestoreTools non e stato inizializzato correttamente');
        return;
    }
    
    // Assicura che le funzioni principali siano disponibili
    const requiredFunctions = ['doc', 'getDoc', 'setDoc', 'addDoc', 'collection', 'query', 'where', 'getDocs', 'deleteDoc', 'updateDoc', 'deleteField'];
    const missingFunctions = requiredFunctions.filter(fn => typeof window.firestoreTools[fn] !== 'function');
    
    if (missingFunctions.length > 0) {
        console.error('Mancano le seguenti funzioni in firestoreTools:', missingFunctions);
        return;
    }
    
    // Condividi firestoreTools con InterfacciaCore
    window.InterfacciaCore.firestoreTools = window.firestoreTools;


    // --- RIFERIMENTI AGLI ELEMENTI DOM ---
    const elements = {
        // Contenitori principali
        gateBox: document.getElementById('gate-box'),
        loginBox: document.getElementById('login-box'),
        appContent: document.getElementById('app-content'),
        adminContent: document.getElementById('admin-content'),
        championshipContent: document.getElementById('championship-content'),
        leaderboardContent: document.getElementById('leaderboard-content'),
        scheduleContent: document.getElementById('schedule-content'),
        squadraContent: document.getElementById('squadra-content'),
        mercatoContent: document.getElementById('mercato-content'),
        coachSelectionBox: document.getElementById('coach-selection-box'),
        captainSelectionBox: document.getElementById('captain-selection-box'),
        playerManagementContent: document.getElementById('player-management-content'), // Aggiunto per Admin Nav
        teamManagementContent: document.getElementById('team-management-content'),     // Aggiunto per Admin Nav

        // Dashboard Utente
        teamDashboardTitle: document.getElementById('team-dashboard-title'),
        teamFirestoreId: document.getElementById('team-firestore-id'),
        userBackToLoginButton: document.getElementById('user-back-to-login-button'),
        btnDeleteTeam: document.getElementById('btn-delete-team'),
        teamLogoElement: document.getElementById('team-logo'),

        // Statistiche
        statRosaLevel: document.getElementById('stat-rosa-level'),
        statFormazioneLevel: document.getElementById('stat-formazione-level'),
        statRosaCount: document.getElementById('stat-rosa-count'),

        // Pulsanti navigazione squadra
        btnGestioneRosa: document.getElementById('btn-gestione-rosa'),
        btnGestioneFormazione: document.getElementById('btn-gestione-formazione'),
        btnDraftUtente: document.getElementById('btn-draft-utente'),
        btnMercatoUtente: document.getElementById('btn-mercato-utente'),
        btnChallenge: document.getElementById('btn-challenge'),
        btnDashboardLeaderboard: document.getElementById('btn-dashboard-leaderboard'),
        btnDashboardSchedule: document.getElementById('btn-dashboard-schedule'),
        btnDashboardChampionship: document.getElementById('btn-dashboard-championship'),

        // Pulsanti pubblici
        btnLeaderboard: document.getElementById('btn-leaderboard'),
        btnSchedule: document.getElementById('btn-schedule'),
        leaderboardBackButton: document.getElementById('leaderboard-back-button'),
        scheduleBackButton: document.getElementById('schedule-back-button'),
        
        // Selezione Allenatore
        coachNameInput: document.getElementById('coach-name-input'),
        btnConfirmCoach: document.getElementById('btn-confirm-coach'),
        coachSelectionMessage: document.getElementById('coach-selection-message'),
        
        // Selezione Capitano/Icona
        captainCandidatesContainer: document.getElementById('captain-candidates-container'),
        btnConfirmCaptain: document.getElementById('btn-confirm-captain'),
        captainSelectionError: document.getElementById('captain-selection-error'),

        // Modale Eliminazione
        deleteTeamModal: document.getElementById('delete-team-modal'),
        btnCancelDelete: document.getElementById('btn-cancel-delete'),
        btnConfirmDeleteFinal: document.getElementById('btn-confirm-delete-final'),
        deleteConfirmationInput: document.getElementById('delete-confirmation-input'),
        deleteMessage: document.getElementById('delete-message'),
        teamNameToDeleteSpan: document.getElementById('team-name-to-delete'),

        // Login Box
        loginUsernameInput: document.getElementById('login-username'),
        loginPasswordInput: document.getElementById('login-password'),
        loginButton: document.getElementById('login-button'),
        loginMessage: document.getElementById('login-message'),

        // Sessione Ricordata
        rememberedSessionBox: document.getElementById('remembered-session-box'),
        rememberedTeamLogo: document.getElementById('remembered-team-logo'),
        rememberedTeamName: document.getElementById('remembered-team-name'),
        btnReenterDashboard: document.getElementById('btn-reenter-dashboard'),
        btnFullLogout: document.getElementById('btn-full-logout'),
        loginFormSection: document.getElementById('login-form-section'),
        
        // Gate Box
        gatePasswordInput: document.getElementById('gate-password'),
        gateButton: document.getElementById('gate-button'),
        gateMessage: document.getElementById('gate-message'),
    };

    // --- INIZIALIZZAZIONE LISTENER ---
    
    // Auth (Gate, Login, Logout)
    window.InterfacciaAuth.initializeAuthListeners(elements);
    
    // Navigazione
    window.InterfacciaNavigation.initializeNavigationListeners(elements);
    window.InterfacciaNavigation.initializePublicNavigationListeners(elements);
    
    // Team (Logo, Eliminazione)
    window.InterfacciaTeam.initializeTeamListeners(elements);
    
    // Championship Participation Toggle
    window.InterfacciaDashboard.initializeChampionshipParticipationToggle();

    // Cup Participation Toggle
    window.InterfacciaDashboard.initializeCupParticipationToggle();

    // User Competitions Navigation (Campionato, Coppa, Supercoppa)
    if (window.UserCompetitions) {
        window.UserCompetitions.initializeNavigationListeners();
    }

    // Gestisce l'evento personalizzato per l'aggiornamento della dashboard
    document.addEventListener('dashboardNeedsUpdate', () => {
        // Solo se la dashboard (app-content) e visibile - evita refresh indesiderati
        const appContent = document.getElementById('app-content');
        if (appContent && !appContent.classList.contains('hidden')) {
            window.InterfacciaDashboard.reloadTeamDataAndUpdateUI(elements);
            // Aggiorna anche gli alert
            window.InterfacciaDashboard.initDraftAlert();
            window.InterfacciaDashboard.initMatchAlert();
            // Ricarica stato toggle draft
            window.InterfacciaNavigation?.loadDraftParticipationState?.();
        }
    });

    // Inizializza gli alert all'avvio e quando cambia schermata
    // Gli alert sono globali quindi vengono mostrati ovunque
    setTimeout(() => {
        window.InterfacciaDashboard.initDraftAlert();
        window.InterfacciaDashboard.initDraftAlertButton();
        window.InterfacciaDashboard.initMatchAlert();
        // Ricarica stato toggle draft dopo che Firebase è pronto
        window.InterfacciaNavigation?.loadDraftParticipationState?.();
    }, 2000); // Ritardo per aspettare che Firebase sia pronto

    // Aggiorna gli alert quando cambia schermata
    document.addEventListener('screenChanged', () => {
        window.InterfacciaDashboard.initDraftAlert();
        window.InterfacciaDashboard.initMatchAlert();
    });

    // --- INIZIALIZZAZIONE APP ---
    const initApp = async () => {
        // Tenta di ripristinare la sessione salvata
        const sessionRestored = await window.InterfacciaAuth.restoreSession(elements);

        if (!sessionRestored) {
            // Nessuna sessione salvata - mostra direttamente il login (gate rimosso)
            if (elements.loginBox) {
                elements.loginBox.classList.remove('hidden-on-load');
                window.showScreen(elements.loginBox);
            }
        }
    };

    setTimeout(initApp, 0);
    
    // Espone gli elementi globalmente per uso futuro (es. ripristino navigazione)
    window.elements = elements;

    console.log("[OK] Interfaccia principale inizializzata.");
    }; // Fine initializeApplication
    
    // Avvia il processo di inizializzazione
    attemptInitialization();
});