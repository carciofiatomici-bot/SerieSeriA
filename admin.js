//
// ====================================================================
// ADMIN.JS - Versione Modularizzata (Usa i moduli esterni)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    const adminContent = document.getElementById('admin-content');
    const adminDashboardContainer = document.getElementById('admin-dashboard-container');
    const adminLogoutButton = document.getElementById('admin-logout-button');
    const championshipContent = document.getElementById('championship-content');
    const playerManagementContent = document.getElementById('player-management-content'); 
    const playerManagementToolsContainer = document.getElementById('player-management-tools-container'); 
    const teamManagementContent = document.getElementById('team-management-content'); 
    const teamManagementToolsContainer = document.getElementById('team-management-tools-container'); 
    
    const leaderboardContent = document.getElementById('leaderboard-content');
    const scheduleContent = document.getElementById('schedule-content');

    let db;
    let firestoreTools;
    let TEAMS_COLLECTION_PATH;
    let DRAFT_PLAYERS_COLLECTION_PATH; 
    let MARKET_PLAYERS_COLLECTION_PATH; 
    let CHAMPIONSHIP_CONFIG_PATH; 
    
    const CONFIG_DOC_ID = 'settings';

    const displayMessage = (message, type, elementId) => {
        const msgElement = document.getElementById(elementId);
        if (!msgElement) return;
        msgElement.textContent = message;
        msgElement.classList.remove('text-red-400', 'text-green-500', 'text-yellow-400');
        if (type === 'error') msgElement.classList.add('text-red-400');
        else if (type === 'success') msgElement.classList.add('text-green-500');
        else if (type === 'info') msgElement.classList.add('text-yellow-400');
    };

    /**
     * Inizializza il pannello admin
     */
    const initializeAdminPanel = () => {
        // Usa le variabili globali caricate da interfaccia.js/index.html
        if (typeof window.db === 'undefined' || typeof window.firestoreTools === 'undefined') {
            console.error("Servizi Firebase non disponibili per il pannello Admin.");
            return;
        }
        
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;
        
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        DRAFT_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/draftPlayers`;
        MARKET_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/marketPlayers`;
        CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;

        console.log(`Pannello Admin inizializzato.`);
        
        if (document.getElementById('player-management-back-button')) {
            document.getElementById('player-management-back-button').addEventListener('click', () => {
                 window.showScreen(adminContent);
            });
        }
        if (document.getElementById('team-management-back-button')) {
             document.getElementById('team-management-back-button').addEventListener('click', () => {
                 window.showScreen(adminContent);
            });
        }

        renderAdminDashboardLayout();
        adminLogoutButton.addEventListener('click', handleAdminLogout);
    };

    /**
     * Renderizza la dashboard principale
     */
    const renderAdminDashboardLayout = async () => {
        const { doc, getDoc, collection, getDocs } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        const configData = configDoc.exists() ? configDoc.data() : {};
        
        const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
        const allTeams = teamsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));

        await window.AdminUI.renderAdminDashboard(adminDashboardContainer, configData, allTeams);
        setupAdminDashboardEvents();
    };
    
    /**
     * Cabla gli eventi della dashboard
     */
    const setupAdminDashboardEvents = () => {
        const btnChampionshipSettings = document.getElementById('btn-championship-settings');
        if (btnChampionshipSettings) btnChampionshipSettings.addEventListener('click', () => {
             if (window.showScreen) {
                 window.showScreen(championshipContent);
                 document.dispatchEvent(new CustomEvent('championshipPanelLoaded'));
             }
        });
        
        const btnPlayerManagement = document.getElementById('btn-player-management');
        if (btnPlayerManagement) btnPlayerManagement.addEventListener('click', renderPlayerManagementPanel); 

        const btnTeamManagement = document.getElementById('btn-team-management');
        if (btnTeamManagement) btnTeamManagement.addEventListener('click', renderTeamManagementPanel);
        
        const btnAdminLeaderboard = document.getElementById('btn-admin-leaderboard');
        if (btnAdminLeaderboard) {
            btnAdminLeaderboard.addEventListener('click', () => {
                 window.showScreen(leaderboardContent);
                 if (window.loadLeaderboard) window.InterfacciaDashboard && window.InterfacciaDashboard.loadLeaderboard && window.InterfacciaDashboard.loadLeaderboard();
                 document.getElementById('leaderboard-back-button').onclick = () => window.showScreen(adminContent);
            });
        }
        
        const btnAdminSchedule = document.getElementById('btn-admin-schedule');
        if (btnAdminSchedule) {
            btnAdminSchedule.addEventListener('click', () => {
                 window.showScreen(scheduleContent);
                 if (window.loadSchedule) window.loadSchedule();
                 document.getElementById('schedule-back-button').onclick = () => window.showScreen(adminContent);
            });
        }
        
        const btnSyncData = document.getElementById('btn-sync-data');
        if (btnSyncData) btnSyncData.addEventListener('click', () => {
             displayMessage("Sincronizzazione dati in corso... (Mock)", 'info', 'toggle-status-message');
             setTimeout(() => displayMessage("Dati sincronizzati.", 'success', 'toggle-status-message'), 1500);
        });
    };

    /**
     * Renderizza pannello gestione giocatori
     */
    const renderPlayerManagementPanel = async () => {
        window.showScreen(playerManagementContent);
        
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        let draftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;
        let marketOpen = configDoc.exists() ? (configDoc.data().isMarketOpen || false) : false;
        
        window.AdminUI.renderPlayerManagementPanel(playerManagementToolsContainer, draftOpen, marketOpen);
        setupPlayerManagementEvents();
        
        // =================================================================
        // FIX SINCRONIZZAZIONE (Risolve 'where is not a function')
        // Controlliamo esplicitamente se 'where' è una funzione in firestoreTools.
        if (window.firestoreTools && typeof window.firestoreTools.where === 'function') {
            window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
            window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
        } else {
             // Fallback: Tentiamo un caricamento ritardato o avvisiamo l'Admin
             console.warn("Firestore Query/Where non disponibili. Riprovo a caricare i giocatori tra 500ms.");
             // Mostra un messaggio visibile all'admin
             document.getElementById('draft-players-list').innerHTML = '<p class="text-center text-red-400">Errore sincronizzazione Firebase, ricarico la lista...</p>';
             document.getElementById('market-players-list').innerHTML = '<p class="text-center text-red-400">Errore sincronizzazione Firebase, ricarico la lista...</p>';

             setTimeout(() => {
                // Riprovo a caricare i giocatori dopo un breve timeout
                if (window.firestoreTools && typeof window.firestoreTools.where === 'function') {
                    window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
                    window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
                } else {
                     document.getElementById('draft-players-list').innerHTML = '<p class="text-center text-red-400">Errore sincronizzazione critico. Controlla index.html.</p>';
                     document.getElementById('market-players-list').innerHTML = '<p class="text-center text-red-400">Errore sincronizzazione critico. Controlla index.html.</p>';
                }
             }, 500); 
        }
        // =================================================================
    };

    /**
     * Cabla eventi gestione giocatori
     */
    const setupPlayerManagementEvents = () => {
        const roleSelect = document.getElementById('player-role');
        if (roleSelect) {
             roleSelect.addEventListener('change', () => window.AdminPlayers.updateAbilitiesChecklist());
        }
        
        const btnToggleDraft = document.getElementById('btn-toggle-draft');
        if (btnToggleDraft) btnToggleDraft.addEventListener('click', handleToggleState);
        
        const btnToggleMarket = document.getElementById('btn-toggle-market');
        if (btnToggleMarket) btnToggleMarket.addEventListener('click', handleToggleState);
        
        const btnRandomPlayer = document.getElementById('btn-random-player');
        if (btnRandomPlayer) btnRandomPlayer.addEventListener('click', () => window.AdminPlayers.handleRandomPlayer());
        
        const btnCreatePlayer = document.getElementById('btn-create-player');
        if (btnCreatePlayer) btnCreatePlayer.addEventListener('click', () => {
            window.AdminPlayers.handleCreatePlayer(
                DRAFT_PLAYERS_COLLECTION_PATH, 
                MARKET_PLAYERS_COLLECTION_PATH,
                {
                    draft: () => window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH),
                    market: () => window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH)
                }
            );
        });
        
        const levelMaxInput = document.getElementById('player-level-max');
        const costDisplayInput = document.getElementById('player-cost-display');

        const updateCostDisplay = () => {
            const levelMax = parseInt(levelMaxInput.value);
            const validLevel = isNaN(levelMax) || levelMax < 1 || levelMax > 20 ? 1 : levelMax;
            const calculatedCost = window.AdminPlayers.calculateCost(validLevel);
            costDisplayInput.value = `Costo: ${calculatedCost} CS`;
            costDisplayInput.dataset.calculatedCost = calculatedCost; 
        };

        if (levelMaxInput) {
            levelMaxInput.addEventListener('input', updateCostDisplay);
            const levelMinInput = document.getElementById('player-level-min');
            if(levelMinInput) levelMinInput.addEventListener('input', updateCostDisplay);
            updateCostDisplay(); 
        }

        const draftList = document.getElementById('draft-players-list');
        const marketList = document.getElementById('market-players-list');

        if (draftList) draftList.addEventListener('click', (e) => handlePlayerAction(e, DRAFT_PLAYERS_COLLECTION_PATH));
        if (marketList) marketList.addEventListener('click', (e) => handlePlayerAction(e, MARKET_PLAYERS_COLLECTION_PATH));
        
        const clearButtonsContainer = playerManagementToolsContainer.querySelector('.grid.grid-cols-2.gap-6.mb-4');
        if (clearButtonsContainer) {
             clearButtonsContainer.addEventListener('click', handleClearCollectionWrapper);
        }
        
        window.AdminPlayers.updateAbilitiesChecklist(); 
    };

    /**
     * Toggle draft/market state
     */
    const handleToggleState = async (event) => {
        const target = event.target;
        const stateType = target.dataset.type;
        const key = stateType === 'draft' ? 'isDraftOpen' : 'isMarketOpen';
        const statusTextId = stateType === 'draft' ? 'draft-status-text' : 'market-status-text';
        
        const { doc, setDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        const currentlyOpen = target.dataset.isOpen === 'true';
        const newState = !currentlyOpen;
        
        target.textContent = 'Aggiornamento...';
        target.disabled = true;
        displayMessage(`Aggiornamento stato ${stateType}...`, 'info', 'toggle-status-message');

        try {
            await setDoc(configDocRef, { [key]: newState, isSeasonOver: false }, { merge: true });
            
            displayMessage(`Stato ${stateType} aggiornato: ${newState ? 'APERTO' : 'CHIUSO'}`, 'success', 'toggle-status-message');
            
            target.dataset.isOpen = newState;
            target.textContent = newState ? `CHIUDI ${stateType}` : `APRI ${stateType}`;
            
            const statusBox = target.closest('div');
            const statusText = document.getElementById(statusTextId);

            statusText.textContent = newState ? 'APERTO' : 'CHIUSO';
            statusBox.classList.remove(newState ? 'border-red-500' : 'border-green-500', newState ? 'bg-red-900' : 'bg-green-900');
            statusBox.classList.add(newState ? 'border-green-500' : 'border-red-500', newState ? 'bg-green-900' : 'bg-red-900');
            target.classList.remove(newState ? 'bg-green-600' : 'bg-red-600', newState ? 'hover:bg-green-700' : 'hover:bg-red-700');
            target.classList.add(newState ? 'bg-red-600' : 'bg-green-600', newState ? 'hover:bg-red-700' : 'hover:bg-green-700');
            
            const summaryText = document.getElementById(`${stateType}-status-text-summary`);
            if (summaryText) summaryText.textContent = newState ? 'APERTO' : 'CHIUSO';

        } catch (error) {
            console.error(`Errore nell'aggiornamento dello stato ${stateType}:`, error);
            displayMessage(`Errore durante l'aggiornamento: ${error.message}`, 'error', 'toggle-status-message');
        } finally {
            target.disabled = false;
        }
    };

    const handlePlayerAction = async (event, collectionPath) => {
        const target = event.target;
        
        if (target.dataset.action === 'delete') {
            target.textContent = 'CONFERMA?';
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-delete';
            return;
        }

        if (target.dataset.action === 'confirm-delete') {
            const playerIdToDelete = target.dataset.playerId;
            const collectionName = collectionPath.includes('market') ? 'Mercato' : 'Draft';
            const { doc, deleteDoc } = firestoreTools;

            target.textContent = 'Eliminazione...';
            target.disabled = true;

            try {
                const playerDocRef = doc(db, collectionPath, playerIdToDelete);
                await deleteDoc(playerDocRef);

                target.closest('.player-item').remove();
                displayMessage(`Giocatore eliminato dal ${collectionName}!`, 'success', 'player-creation-message');
                
                if (collectionPath === DRAFT_PLAYERS_COLLECTION_PATH) {
                     window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
                } else {
                     window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
                }

            } catch (error) {
                console.error(`Errore durante l'eliminazione del giocatore ${playerIdToDelete} dal ${collectionName}:`, error);
                displayMessage(`Errore durante l'eliminazione dal ${collectionName}: ${error.message}`, 'error', 'player-creation-message');
            }
        }
    };

    const handleClearCollectionWrapper = (event) => {
        const target = event.target.closest('[data-action="clear-collection"]');
        if (!target) return;
        
        const targetCollection = target.dataset.target;
        let path, collectionName, loadFunction;

        if (targetCollection === 'draft') {
            path = DRAFT_PLAYERS_COLLECTION_PATH;
            collectionName = 'DRAFT';
            loadFunction = () => window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
        } else if (targetCollection === 'market') {
            path = MARKET_PLAYERS_COLLECTION_PATH;
            collectionName = 'MERCATO';
            loadFunction = () => window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
        } else {
            return;
        }

        handleClearCollection(path, collectionName, loadFunction);
    };

    const handleClearCollection = async (collectionPath, collectionName, loadFunction) => {
        const msgId = 'player-creation-message';
        const confirmation = prompt(`ATTENZIONE: Stai per eliminare TUTTI i giocatori dalla collezione ${collectionName}. Questa azione è IRREVERSIBILE.\n\nDigita il nome della collezione per confermare:`);
        
        if (!confirmation || confirmation.toUpperCase() !== collectionName.toUpperCase()) {
            displayMessage(`Cancellazione ${collectionName} annullata.`, 'info', msgId);
            return;
        }

        displayMessage(`Eliminazione di tutti i giocatori in ${collectionName} in corso...`, 'info', msgId);

        try {
            const { collection, getDocs, deleteDoc } = firestoreTools;
            const q = collection(db, collectionPath);
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                displayMessage(`Collezione ${collectionName} giÃ  vuota.`, 'success', msgId);
                return;
            }

            const deletePromises = [];
            snapshot.forEach(doc => {
                deletePromises.push(deleteDoc(doc.ref));
            });

            await Promise.all(deletePromises);

            displayMessage(`Cancellati con successo ${snapshot.size} giocatori da ${collectionName}.`, 'success', msgId);
            loadFunction();

        } catch (error) {
            console.error(`Errore durante l'eliminazione di massa da ${collectionName}:`, error);
            displayMessage(`Errore critico nella cancellazione di ${collectionName}: ${error.message}`, 'error', msgId);
        }
    };

    /**
     * Renderizza pannello gestione squadre
     */
    const renderTeamManagementPanel = async () => {
        window.showScreen(teamManagementContent);
        window.AdminUI.renderTeamManagementPanel(teamManagementToolsContainer);
        
        window.AdminTeams.teamsListContainer = document.getElementById('teams-list-container-management');
        
        document.getElementById('btn-refresh-teams-management').addEventListener('click', () => {
            window.AdminTeams.loadTeams(TEAMS_COLLECTION_PATH);
        });
        
        if (window.AdminTeams.teamsListContainer) {
            window.AdminTeams.teamsListContainer.addEventListener('click', (e) => {
                window.AdminTeams.handleTeamAction(e, TEAMS_COLLECTION_PATH, () => {
                    window.AdminTeams.loadTeams(TEAMS_COLLECTION_PATH);
                });
            });
        }
        
        window.AdminTeams.loadTeams(TEAMS_COLLECTION_PATH);
    };

    const handleAdminLogout = () => {
        console.log("Logout Admin effettuato.");
        if (window.handleLogout) window.handleLogout();
    };

    document.addEventListener('adminLoggedIn', initializeAdminPanel);
    
    window.loadDraftPlayersAdmin = () => window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
    window.loadMarketPlayersAdmin = () => window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
});