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
    const adminContent = document.getElementById('admin-content');
    const appContent = document.getElementById('app-content');

    // Variabili di stato
    let db;
    let firestoreTools;
    let currentMode = 'admin';
    let currentTeamId = null;
    let paths = {};

    /**
     * Mostra un messaggio di errore con opzioni per riprovare o tornare indietro.
     * @param {string} errorMessage - Messaggio di errore da mostrare
     * @param {Event} originalEvent - Evento originale per poter riprovare
     */
    const showDraftError = (errorMessage, originalEvent) => {
        console.error("Errore Draft:", errorMessage);

        const backDestination = currentMode === 'admin' ? adminContent : appContent;
        const backLabel = currentMode === 'admin' ? 'Pannello Admin' : 'Dashboard';

        draftToolsContainer.innerHTML = `
            <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 shadow-xl space-y-4">
                <p class="text-center text-2xl font-extrabold text-red-400">Errore nel caricamento del Draft</p>
                <p class="text-center text-gray-300">Si e verificato un problema durante il caricamento.</p>
                <p class="text-center text-sm text-gray-400">Possibili cause: connessione instabile, sessione scaduta.</p>
                <p class="text-center text-xs text-red-300 mt-2">${errorMessage}</p>
                <div class="flex gap-4 mt-6">
                    <button id="btn-draft-retry"
                            class="flex-1 bg-yellow-600 text-white font-bold py-3 rounded-lg hover:bg-yellow-500 transition">
                        Riprova
                    </button>
                    <button id="btn-draft-back-error"
                            class="flex-1 bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-500 transition">
                        Torna a ${backLabel}
                    </button>
                </div>
            </div>
        `;

        // Event listener per riprovare
        const btnRetry = document.getElementById('btn-draft-retry');
        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                draftToolsContainer.innerHTML = '<p class="text-center text-gray-400">Riprovo il caricamento...</p>';
                setTimeout(() => initializeDraftPanel(originalEvent), 500);
            });
        }

        // Event listener per tornare indietro
        const btnBack = document.getElementById('btn-draft-back-error');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                if (window.showScreen && backDestination) {
                    window.showScreen(backDestination);
                }
            });
        }
    };

    /**
     * Funzione principale per inizializzare il pannello Draft in base alla modalità.
     * @param {Event} event - Evento con dettagli sulla modalità
     */
    const initializeDraftPanel = async (event) => {
        // IMPORTANTE: Estrae mode e teamId SUBITO, PRIMA di qualsiasi controllo
        // Cosi se un errore avviene, showDraftError mostrera il bottone corretto
        currentMode = event && event.detail && event.detail.mode === 'utente' ? 'utente' : 'admin';
        currentTeamId = event && event.detail ? event.detail.teamId : null;

        console.log(`Inizializzazione pannello Draft, Modalita: ${currentMode}, TeamId: ${currentTeamId}`);

        // Timeout di sicurezza (15 secondi)
        const LOAD_TIMEOUT_MS = 15000;
        let timeoutId = null;

        try {
            // Pulisce il timer precedente se esiste
            if (window.DraftUtils && window.DraftUtils.clearCooldownInterval) {
                window.DraftUtils.clearCooldownInterval();
            }

            // Verifica che i servizi globali siano disponibili
            if (!window.db) {
                throw new Error("Database non inizializzato");
            }
            if (!window.firestoreTools) {
                throw new Error("Firestore tools non disponibili");
            }
            if (!window.DraftConstants) {
                throw new Error("DraftConstants non caricato");
            }

            // Inizializza servizi globali
            db = window.db;
            firestoreTools = window.firestoreTools;
            const { appId } = firestoreTools;

            if (!appId) {
                throw new Error("AppId non disponibile");
            }

            // Genera i path delle collezioni
            paths = window.DraftConstants.getPaths(appId);

            console.log(`Caricamento pannello Draft, Modalita: ${currentMode}`);

            // Prepara il contesto da passare ai sotto-moduli
            const context = {
                draftContent,
                draftToolsContainer,
                adminContent,
                appContent,
                db,
                firestoreTools,
                paths,
                currentMode,
                currentTeamId
            };

            // Crea una Promise con timeout
            const renderPromise = new Promise(async (resolve, reject) => {
                try {
                    // Renderizza il pannello appropriato
                    if (currentMode === 'admin') {
                        if (!window.DraftAdminUI || !window.DraftAdminUI.render) {
                            throw new Error("DraftAdminUI non disponibile");
                        }
                        await window.DraftAdminUI.render(context);
                    } else {
                        if (!window.DraftUserUI || !window.DraftUserUI.render) {
                            throw new Error("DraftUserUI non disponibile");
                        }
                        await window.DraftUserUI.render(context);
                    }
                    resolve();
                } catch (renderError) {
                    reject(renderError);
                }
            });

            // Timeout Promise
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error("Timeout: il caricamento ha impiegato troppo tempo"));
                }, LOAD_TIMEOUT_MS);
            });

            // Aspetta il primo che completa (render o timeout)
            await Promise.race([renderPromise, timeoutPromise]);

            // Cancella il timeout se il render e' completato
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

        } catch (error) {
            // Cancella il timeout in caso di errore
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Mostra l'errore all'utente con opzioni
            showDraftError(error.message || "Errore sconosciuto", event);
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
