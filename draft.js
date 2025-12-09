//
// ====================================================================
// DRAFT.JS - Orchestrator Principale Draft
// ====================================================================
//
// Questo modulo coordina i sotto-moduli del Draft:
// - draft-constants.js: Costanti e configurazioni
// - draft-utils.js: Funzioni helper
// - draft-admin-ui.js: Rendering pannello admin
// - draft-admin-players.js: CRUD giocatori (admin)
// - draft-user-ui.js: Rendering pannello utente
// - draft-user-actions.js: Logica acquisto (utente)
//

document.addEventListener('DOMContentLoaded', () => {
    const draftContent = document.getElementById('draft-content');
    const draftToolsContainer = document.getElementById('draft-tools-container');
    const draftBackButton = document.getElementById('draft-back-button');
    const adminContent = document.getElementById('admin-content');
    const appContent = document.getElementById('app-content');

    // Variabili di stato
    let db;
    let firestoreTools;
    let currentMode = 'admin';
    let currentTeamId = null;
    let paths = {};

    /**
     * Funzione principale per inizializzare il pannello Draft in base alla modalità.
     * @param {Event} event - Evento con dettagli sulla modalità
     */
    const initializeDraftPanel = (event) => {
        // Pulisce il timer precedente se esiste
        window.DraftUtils.clearCooldownInterval();

        // Inizializza servizi globali
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;

        // Genera i path delle collezioni
        paths = window.DraftConstants.getPaths(appId);

        // Imposta la modalità e l'ID della squadra
        currentMode = event.detail && event.detail.mode === 'utente' ? 'utente' : 'admin';
        currentTeamId = event.detail ? event.detail.teamId : null;

        console.log(`Caricamento pannello Draft, Modalità: ${currentMode}`);

        // Prepara il contesto da passare ai sotto-moduli
        const context = {
            draftContent,
            draftToolsContainer,
            draftBackButton,
            adminContent,
            appContent,
            db,
            firestoreTools,
            paths,
            currentMode,
            currentTeamId
        };

        // Renderizza il pannello appropriato
        if (currentMode === 'admin') {
            window.DraftAdminUI.render(context);
        } else {
            window.DraftUserUI.render(context);
        }
    };

    // Ascolta l'evento lanciato da interfaccia.js
    document.addEventListener('draftPanelLoaded', initializeDraftPanel);

    // Espone la funzione di caricamento giocatori Draft per l'uso in altri moduli Admin
    window.loadDraftPlayersAdmin = () => {
        if (paths.DRAFT_PLAYERS_COLLECTION_PATH) {
            const context = {
                db,
                firestoreTools,
                paths
            };
            window.DraftAdminPlayers.loadDraftPlayers(context);
        }
    };
});

console.log("Modulo Draft (Orchestrator) caricato.");
