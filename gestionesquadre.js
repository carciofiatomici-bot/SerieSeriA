//
// ====================================================================================
// GESTIONESQUADRE.JS - Orchestratore Gestione Rosa e Formazione
// ====================================================================================
//
// Questo modulo funge da orchestratore per i sotto-moduli:
// - gestionesquadre-constants.js (costanti)
// - gestionesquadre-utils.js (utility)
// - gestionesquadre-rosa.js (gestione rosa)
// - gestionesquadre-formazione.js (gestione formazione)
// - gestionesquadre-icona.js (sostituzione icona)
//

document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti ai contenitori DOM
    const squadraContent = document.getElementById('squadra-content');
    const squadraToolsContainer = document.getElementById('squadra-tools-container');
    const squadraBackButton = document.getElementById('squadra-back-button');
    const appContent = document.getElementById('app-content');
    const squadraMainTitle = document.getElementById('squadra-main-title');
    const squadraSubtitle = document.getElementById('squadra-subtitle');

    // Variabili di stato
    let db;
    let firestoreTools;
    let currentTeamId = null;
    let currentTeamData = null;

    // Percorsi collezioni Firestore
    let TEAMS_COLLECTION_PATH;
    let DRAFT_PLAYERS_COLLECTION_PATH;
    let MARKET_PLAYERS_COLLECTION_PATH;

    /**
     * Costruisce e restituisce il contesto per i sotto-moduli
     */
    const buildContext = () => ({
        // DOM
        squadraContent,
        squadraToolsContainer,
        squadraBackButton,
        appContent,
        squadraMainTitle,
        squadraSubtitle,
        // Stato
        db,
        firestoreTools,
        currentTeamId,
        currentTeamData,
        // Percorsi Firestore
        TEAMS_COLLECTION_PATH,
        DRAFT_PLAYERS_COLLECTION_PATH,
        MARKET_PLAYERS_COLLECTION_PATH,
        // Funzioni
        loadTeamDataFromFirestore
    });

    /**
     * Funzione principale per inizializzare il pannello squadra
     */
    const initializeSquadraPanel = (event) => {
        if (!event.detail || !event.detail.teamId) {
            console.error("ID Squadra non fornito per la gestione.");
            return;
        }

        // Inizializzazione servizi globali
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;

        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        DRAFT_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/draftPlayers`;
        MARKET_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/marketPlayers`;

        currentTeamId = event.detail.teamId;
        const mode = event.detail.mode;

        // Traccia la sotto-modalita per la persistenza
        localStorage.setItem('fanta_squadra_mode', mode);

        // Ricarica forzata da Firestore
        loadTeamDataFromFirestore(currentTeamId, mode);
    };

    /**
     * Carica i dati della squadra da Firestore
     */
    const loadTeamDataFromFirestore = async (teamId, mode) => {
        const { doc, getDoc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

        squadraToolsContainer.innerHTML = `<p class="text-center text-yellow-400">Sincronizzazione dati squadra...</p>`;

        // SECURITY CHECK: Verifica che l'utente possa accedere a questa squadra
        const loggedInTeamId = window.InterfacciaCore?.currentTeamId;
        const isAdmin = await window.checkCurrentTeamIsAdmin();
        // *** SICUREZZA: localStorage puo essere manipolato da DevTools ***
        // Verifica PRIMA che l'utente sia admin (da Firestore), poi controlla localStorage
        const isAdminViewingTeam = isAdmin && localStorage.getItem('fanta_admin_viewing_team') === teamId;

        if (teamId !== loggedInTeamId && !isAdmin && !isAdminViewingTeam) {
            console.error('[GestioneSquadre] Accesso negato: tentativo di accedere a squadra non propria.');
            squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Accesso negato: non puoi visualizzare questa squadra.</p>`;
            return;
        }

        try {
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) {
                squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Squadra non trovata.</p>`;
                return;
            }

            // Aggiorna il dato globale
            window.InterfacciaCore.currentTeamData = teamDoc.data();
            currentTeamData = teamDoc.data();

            // Applica EXP dal nuovo campo playersExp ai giocatori
            if (window.PlayerExp?.applyExpFromFirestore) {
                window.PlayerExp.applyExpFromFirestore(window.InterfacciaCore.currentTeamData);
                window.PlayerExp.applyExpFromFirestore(currentTeamData);
            }

            // Procedi con il rendering
            loadTeamDataAndRender(mode);

        } catch (error) {
            console.error("Errore nella sincronizzazione dati squadra:", error);
            squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore di sincronizzazione: ${error.message}</p>`;
        }
    };

    /**
     * Prepara i dati della squadra e li renderizza
     */
    const loadTeamDataAndRender = async (mode) => {
        const { doc, updateDoc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
        const { applyFormForDisplay } = window.GestioneSquadreUtils;

        let teamData = currentTeamData;

        try {
            // Clona l'array players per evitare modifiche indesiderate
            let playersForRendering = JSON.parse(JSON.stringify(teamData.players));

            // IMPORTANTE: Applica EXP da playersExp ai giocatori clonati
            // Questo garantisce che l'EXP sia sempre aggiornata da Firebase
            const playersExp = teamData.playersExp || {};
            let expAppliedCount = 0;
            if (Object.keys(playersExp).length > 0) {
                playersForRendering = playersForRendering.map(player => {
                    if (!player) return player;
                    const playerId = player.id || player.visitorId;
                    const expData = playersExp[playerId];
                    if (expData) {
                        player.exp = expData.exp || 0;
                        player.level = expData.level || player.level || 1;
                        player.expToNextLevel = expData.expToNextLevel || 0;
                        player.totalMatchesPlayed = expData.totalMatchesPlayed || 0;
                        expAppliedCount++;
                    }
                    return player;
                });
                console.log(`[GestioneSquadre] EXP caricata da Firebase per ${expAppliedCount}/${playersForRendering.length} giocatori`);
            }

            // Variabile per la mappa delle forme (usata in modalità formazione)
            let formsToSave = null;

            // Logica forma (sia rosa che formazione)
            // Le forme vengono generate e salvate per entrambe le modalita
            // per garantire che i colori siano sempre aggiornati
            const persistedForms = new Map(Object.entries(teamData.playersFormStatus || {}));
            formsToSave = new Map(persistedForms);

            // Applica le forme ai giocatori
            playersForRendering = playersForRendering.map(player => {
                return applyFormForDisplay(player, formsToSave);
            });

            // Salva le forme generate se necessario (nuovi giocatori o forme mancanti)
            if (formsToSave.size > persistedForms.size || Object.keys(teamData.playersFormStatus || {}).length === 0) {
                const savedFormsObject = Object.fromEntries(formsToSave);

                await updateDoc(teamDocRef, {
                    playersFormStatus: savedFormsObject
                });

                window.InterfacciaCore.currentTeamData.playersFormStatus = savedFormsObject;
                currentTeamData.playersFormStatus = savedFormsObject;
                console.log("[GestioneSquadre] Forma giocatore salvata/aggiornata in Firestore.");
            }

            // Aggiorna teamData.players con le forme per la visualizzazione rosa
            teamData.players = playersForRendering;

            // Logica aggiuntiva solo per modalita formazione
            if (mode === 'formazione') {
                // Aggiorna titolari e panchina con i dati di forma
                const updateFormationWithForm = (list) => list.map(p => {
                    return playersForRendering.find(rp => rp.id === p.id) || p;
                });

                const validPlayersInFormation = (list) => list.filter(p => playersForRendering.some(rp => rp.id === p.id));

                teamData.formation.titolari = updateFormationWithForm(validPlayersInFormation(teamData.formation.titolari));
                teamData.formation.panchina = updateFormationWithForm(validPlayersInFormation(teamData.formation.panchina));
            }

            // Aggiorna il contesto globale per i sotto-moduli
            window.GestioneSquadreContext = buildContext();

            // Aggiungi formsMap al contesto (per entrambe le modalita)
            if (formsToSave) {
                window.GestioneSquadreContext.formsMap = formsToSave;
            }

            // Renderizza in base alla modalita
            const context = window.GestioneSquadreContext;

            if (mode === 'rosa') {
                window.GestioneSquadreRosa.render(teamData, context);
            } else if (mode === 'formazione') {
                window.GestioneSquadreFormazione.render(teamData, context);
            } else if (mode === 'icona-swap') {
                window.GestioneSquadreIcona.render(teamData, context);
            }

        } catch (error) {
            console.error("Errore nel caricamento dei dati della squadra:", error);
            squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore di caricamento dati: ${error.message}</p>`;
        }
    };

    // Gestione navigazione - torna alla dashboard
    squadraBackButton.addEventListener('click', () => {
        if (window.showScreen && appContent) {
            localStorage.removeItem('fanta_last_screen');
            window.showScreen(appContent);
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
        }
    });

    // Ascolta l'evento di caricamento del pannello squadra
    document.addEventListener('squadraPanelLoaded', initializeSquadraPanel);

    // Ascolta l'evento dashboardNeedsUpdate per aggiornare i dati in tempo reale
    // Questo permette di aggiornare i colori della forma dei giocatori senza ricaricare la pagina
    document.addEventListener('dashboardNeedsUpdate', () => {
        // Verifica se siamo nella pagina squadra (rosa o formazione)
        if (currentTeamId && squadraContent && !squadraContent.classList.contains('hidden')) {
            const mode = localStorage.getItem('fanta_squadra_mode') || 'rosa';
            console.log('[GestioneSquadre] dashboardNeedsUpdate - Ricarico dati per aggiornare colori forma');
            loadTeamDataFromFirestore(currentTeamId, mode);
        }
    });

    // Espone globalmente la funzione per il caricamento squadra (usato da CSS per icona-swap)
    window.GestioneSquadre = window.GestioneSquadre || {};
    window.GestioneSquadre.loadTeamDataFromFirestore = loadTeamDataFromFirestore;

    // Espone i riferimenti ai caricamenti delle liste Admin
    window.loadDraftPlayersAdmin = window.loadDraftPlayersAdmin || (() => console.log('loadDraftPlayersAdmin non disponibile.'));
    window.loadMarketPlayersAdmin = window.loadMarketPlayersAdmin || (() => console.log('loadMarketPlayersAdmin non disponibile.'));

});

console.log("Modulo gestionesquadre.js (Orchestratore) caricato.");
