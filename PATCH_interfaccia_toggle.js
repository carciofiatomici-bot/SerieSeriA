//
// ====================================================================
// PATCH PER interfaccia.js - Inizializzazione Toggle Campionato
// ====================================================================
//
// ISTRUZIONI:
// 1. Apri il file interfaccia.js
// 2. Cerca la riga 178 circa: window.InterfacciaTeam.initializeTeamListeners(elements);
// 3. Aggiungi la riga seguente DOPO quella riga
//
// ====================================================================

// TROVA QUESTO BLOCCO (circa riga 170-183):
/*
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
*/

// SOSTITUISCI CON QUESTO:

    // Auth (Gate, Login, Logout)
    window.InterfacciaAuth.initializeAuthListeners(elements);
    
    // Navigazione
    window.InterfacciaNavigation.initializeNavigationListeners(elements);
    window.InterfacciaNavigation.initializePublicNavigationListeners(elements);
    
    // Team (Logo, Eliminazione)
    window.InterfacciaTeam.initializeTeamListeners(elements);
    
    // NUOVO: Dashboard (Toggle Partecipazione Campionato)
    window.InterfacciaDashboard.initializeChampionshipParticipationToggle();
    
    // Gestisce l'evento personalizzato per l'aggiornamento della dashboard
    document.addEventListener('dashboardNeedsUpdate', () => {
        window.InterfacciaDashboard.reloadTeamDataAndUpdateUI(elements);
    });

// ====================================================================
// FINE PATCH
// ====================================================================
