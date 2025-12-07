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
    // Verifica che gli oggetti globali Firebase siano disponibili
    if (typeof window.auth === 'undefined' || typeof window.db === 'undefined' || typeof window.firestoreTools === 'undefined' || typeof window.showScreen === 'undefined') {
        console.warn("Servizi Firebase o showScreen non pronti, ritento caricamento interfaccia...");
        setTimeout(() => document.dispatchEvent(new Event('DOMContentLoaded')), 100);
        return;
    }
    
    // Verifica che tutti i moduli siano caricati
    if (!window.InterfacciaCore || !window.InterfacciaAuth || !window.InterfacciaDashboard || 
        !window.InterfacciaNavigation || !window.InterfacciaOnboarding || !window.InterfacciaTeam) {
        console.warn("Moduli interfaccia non ancora caricati, ritento...");
        setTimeout(() => document.dispatchEvent(new Event('DOMContentLoaded')), 100);
        return;
    }
    
    // --- INIZIALIZZAZIONE VARIABILI GLOBALI ---
    window.InterfacciaCore.auth = window.auth;
    window.InterfacciaCore.db = window.db;
    
    // Assicura che firestoreTools sia disponibile e contenga tutte le funzioni necessarie
    // Le funzioni sono già state esposte in index.html durante l'inizializzazione di Firebase
    if (!window.firestoreTools) {
        console.error('firestoreTools non è stato inizializzato correttamente');
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
        teamWelcomeMessage: document.getElementById('team-welcome-message'),
        teamFirestoreId: document.getElementById('team-firestore-id'),
        userLogoutButton: document.getElementById('user-logout-button'),
        btnDeleteTeam: document.getElementById('btn-delete-team'),
        teamLogoElement: document.getElementById('team-logo'),
        nextMatchPreview: document.getElementById('next-match-preview'),
        
        // Statistiche
        statRosaLevel: document.getElementById('stat-rosa-level'),
        statFormazioneLevel: document.getElementById('stat-formazione-level'),
        statRosaCount: document.getElementById('stat-rosa-level')?.nextElementSibling,
        statCoachName: document.getElementById('stat-coach-name'),
        statCoachLevel: document.getElementById('stat-coach-level'),

        // Pulsanti navigazione squadra
        btnGestioneRosa: document.getElementById('btn-gestione-rosa'),
        btnGestioneFormazione: document.getElementById('btn-gestione-formazione'),
        btnDraftUtente: document.getElementById('btn-draft-utente'),
        btnMercatoUtente: document.getElementById('btn-mercato-utente'),
        btnDashboardLeaderboard: document.getElementById('btn-dashboard-leaderboard'),
        btnDashboardSchedule: document.getElementById('btn-dashboard-schedule'),

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
    
    // Gestisce l'evento personalizzato per l'aggiornamento della dashboard
    document.addEventListener('dashboardNeedsUpdate', () => {
        window.InterfacciaDashboard.reloadTeamDataAndUpdateUI(elements);
    });

    // --- INIZIALIZZAZIONE APP ---
    const initApp = async () => {
        if (elements.gateBox) {
            const sessionRestored = await window.InterfacciaAuth.restoreSession(elements);
            
            if (!sessionRestored) {
                elements.gateBox.classList.remove('hidden-on-load');
                window.showScreen(elements.gateBox);
            }
        }
    };

    setTimeout(initApp, 0);
    
    // Espone gli elementi globalmente per uso futuro (es. ripristino navigazione)
    window.elements = elements;

    console.log("✅ Interfaccia principale inizializzata.");
});