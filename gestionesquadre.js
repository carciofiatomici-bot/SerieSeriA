//
// ====================================================================================
// CONTENUTO DEL MODULO GESTIONESQUADRE.JS (Logica Gestione Rosa e Formazione)
// ====================================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti ai contenitori
    const squadraContent = document.getElementById('squadra-content');
    const squadraToolsContainer = document.getElementById('squadra-tools-container');
    const squadraBackButton = document.getElementById('squadra-back-button');
    const appContent = document.getElementById('app-content');
    const squadraMainTitle = document.getElementById('squadra-main-title');
    const squadraSubtitle = document.getElementById('squadra-subtitle');

    // Variabili di stato per la squadra corrente
    let db;
    let firestoreTools;
    let currentTeamId = null;
    let currentTeamData = null; // Dati della squadra caricati
    
    // VARIABILI GLOBALI PER IL DRAG
    let currentDragTarget = null; 

    // Costanti per le collezioni
    let TEAMS_COLLECTION_PATH;
    let DRAFT_PLAYERS_COLLECTION_PATH;
    // NUOVA COLLEZIONE: MARKET PLAYERS
    let MARKET_PLAYERS_COLLECTION_PATH; 
    
    const getRandomInt = window.getRandomInt; // Usa il getter globale
    const getRandomType = window.getRandomType || (() => 'Potenza'); // Helper per tipo casuale se non definito

    // Struttura dei moduli e delle posizioni (P, D, C, A)
    const MODULI = {
        '1-2-2': { P: 1, D: 2, C: 0, A: 2, description: "Tattica ultradifensiva, 2 Difensori, 2 Attaccanti. (4 titolari + Portiere)" },
        '1-1-2-1': { P: 1, D: 1, C: 2, A: 1, description: "Modulo equilibrato, 1 Difensore, 2 Centrocampisti, 1 Attaccante. (4 titolari + Portiere)" },
        '1-3-1': { P: 1, D: 3, C: 0, A: 1, description: "Modulo difensivo con 3 difensori, 1 Attaccante. (4 titolari + Portiere)" },
        '1-1-3': { P: 1, D: 1, C: 0, A: 3, description: "Modulo ultra-offensivo, 1 Difensore, 3 Attaccanti. (4 titolari + Portiere)" },
    };
    
    // Ruoli totali
    const ROLES = ['P', 'D', 'C', 'A'];
    
    // Mappa per l'ordinamento dei ruoli (CRITICO PER LA RICHIESTA)
    const ROLE_ORDER = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
    
    // Mappa delle icone di tipologia (DEVE ESSERE COERENTE CON interfaccia.js)
    const TYPE_ICONS = {
        'Potenza': { icon: 'fas fa-hand-rock', color: 'text-red-500' },
        'Tecnica': { icon: 'fas fa-brain', color: 'text-blue-500' },
        'Velocita': { icon: 'fas fa-bolt', color: 'text-yellow-500' },
        'N/A': { icon: 'fas fa-question-circle', color: 'text-gray-400' }
    };
    
    // Definisco l'URL dell'immagine (Regola)
    const TYPE_LEGEND_URL = "https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Logica%20Tipologie.png?raw=true";


    /**
     * Helper per mostrare messaggi di stato.
     */
    const displayMessage = (containerId, message, type) => {
        const msgElement = document.getElementById(containerId);
        if (!msgElement) return;
        msgElement.textContent = message;
        msgElement.classList.remove('text-red-400', 'text-green-500', 'text-yellow-400');
        
        if (type === 'error') {
            msgElement.classList.add('text-red-400');
        } else if (type === 'success') {
            msgElement.classList.add('text-green-500');
        } else if (type === 'info') {
            msgElement.classList.add('text-yellow-400');
        }
    };

    /**
     * Rimuove il giocatore dalla sua posizione corrente (titolari o panchina).
     * @param {string} playerId - ID del giocatore da rimuovere.
     */
    const removePlayerFromPosition = (playerId) => {
        // Rimuove dai titolari
        const initialTitolariLength = currentTeamData.formation.titolari.length;
        currentTeamData.formation.titolari = currentTeamData.formation.titolari.filter(p => p.id !== playerId);
        const removedFromTitolari = initialTitolariLength !== currentTeamData.formation.titolari.length;
        
        // Rimuove dalla panchina
        const initialPanchinaLength = currentTeamData.formation.panchina.length;
        currentTeamData.formation.panchina = currentTeamData.formation.panchina.filter(p => p.id !== playerId);
        const removedFromPanchina = initialPanchinaLength !== currentTeamData.formation.panchina.length;
        
        return removedFromTitolari || removedFromPanchina;
    };


    /**
     * Genera o recupera la forma casuale e la applica al giocatore.
     * @param {Object} player - Oggetto giocatore.
     * @param {Map} formsMap - Mappa delle forme persistenti {playerId: {mod: X, icon: Y, level: Z}}.
     * @returns {Object} Oggetto giocatore con formModifier, formIcon, e currentLevel.
     */
    const applyFormForDisplay = (player, formsMap) => {
        
        const playerId = player.id;

        // 1. RECUPERO: Se la forma è già stata calcolata e salvata, usala
        if (formsMap.has(playerId)) {
            const savedForm = formsMap.get(playerId);
            return {
                ...player,
                formModifier: savedForm.mod,
                formIcon: savedForm.icon,
                currentLevel: savedForm.level
            };
        }
        
        // 2. GENERAZIONE: Genera un modificatore di forma
        let mod; 
        
        const isIcona = player.abilities && player.abilities.includes('Icona');
        if (isIcona) {
             mod = getRandomInt(0, 6); // ICONA: Range [0, +6]
        } else {
             mod = getRandomInt(-3, 3); // ALTRI: Range [-3, +3]
        }

        let icon;
        
        if (mod > 0) {
            icon = 'text-green-500 fas fa-arrow-up';
        } else if (mod < 0) {
            icon = 'text-red-500 fas fa-arrow-down';
        } else {
            icon = 'text-gray-400 fas fa-minus-circle'; // Quadratino grigio
        }

        const currentLevel = Math.max(1, player.level + mod);

        const formState = {
            ...player,
            formModifier: mod,
            formIcon: icon,
            currentLevel: currentLevel 
        };
        
        // 3. SALVATAGGIO NELLA MAPPA IN MEMORIA (formsMap)
        formsMap.set(playerId, {
            mod: mod,
            icon: icon,
            level: currentLevel
        });
        
        return formState;
    };


    /**
     * Funzione principale per inizializzare il pannello squadra in modalità Rosa o Formazione.
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
        // INIZIALIZZA IL PERCORSO MERCATO
        MARKET_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/marketPlayers`; 

        currentTeamId = event.detail.teamId;
        const mode = event.detail.mode;
        
        // ** AGGIUNTO: Traccia la sotto-modalità per la persistenza **
        localStorage.setItem('fanta_squadra_mode', mode);

        // ** FIX PRINCIPALE: Ricarica forzata per ottenere playersFormStatus fresco da Firestore **
        loadTeamDataFromFirestore(currentTeamId, mode);
    };
    
    /**
     * Carica i dati della squadra da Firestore e aggiorna la variabile globale.
     */
    const loadTeamDataFromFirestore = async (teamId, mode) => {
         const { doc, getDoc } = firestoreTools;
         const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
         const squadraToolsContainer = document.getElementById('squadra-tools-container');

         squadraToolsContainer.innerHTML = `<p class="text-center text-yellow-400">Sincronizzazione dati squadra...</p>`;
         
         try {
             const teamDoc = await getDoc(teamDocRef);
             if (!teamDoc.exists()) {
                 squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Squadra non trovata.</p>`;
                 return;
             }
             
             // Aggiorna il dato globale con la versione più fresca
             window.InterfacciaCore.currentTeamData = teamDoc.data();
             currentTeamData = teamDoc.data();
             
             // Ora procedi con il rendering
             loadTeamDataAndRender(mode);
             
         } catch (error) {
            console.error("Errore nella sincronizzazione dati squadra:", error);
            squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore di sincronizzazione: ${error.message}</p>`;
         }
    };


    /**
     * Prepara i dati della squadra e li renderizza.
     */
    const loadTeamDataAndRender = async (mode) => {
        const { doc, updateDoc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
        
        // Usa il dato globale che è stato appena sincronizzato
        let teamData = currentTeamData;

        try {
            
            // ** FIX BUG FORMA: Clona l'array players pulito dal dato Firestore **
            // Usiamo una copia profonda di players per evitare di modificare l'array originale 
            // salvato in currentTeamData (che verrebbe riletto in Rosa e mostrerebbe dati con forma).
            let playersForRendering = JSON.parse(JSON.stringify(teamData.players));
            
            // --- LOGICA FORMA (MODALITÀ FORMAZIONE) ---
            if (mode === 'formazione') {
                const persistedForms = new Map(Object.entries(teamData.playersFormStatus || {}));
                const formsToSave = new Map(persistedForms); // Inizializza con i dati esistenti
                
                // 1. Applica le forme (esistenti o generate) ai giocatori
                playersForRendering = playersForRendering.map(player => {
                    // Nota: formsToSave è passato qui. Se applyFormForDisplay genera una nuova forma, la aggiunge a formsToSave.
                    const playerWithForm = applyFormForDisplay(player, formsToSave); 
                    return playerWithForm;
                });
                
                // 2. Se formsToSave contiene nuovi dati (cioè la forma è stata generata per la prima volta), SALVALI in Firestore
                if (formsToSave.size > persistedForms.size || Object.keys(teamData.playersFormStatus || {}).length === 0) {
                    const savedFormsObject = Object.fromEntries(formsToSave);
                    
                    await updateDoc(teamDocRef, {
                        playersFormStatus: savedFormsObject
                    });
                    // Aggiorna il dato globale locale per riflettere il salvataggio
                    window.InterfacciaCore.currentTeamData.playersFormStatus = savedFormsObject;
                    currentTeamData.playersFormStatus = savedFormsObject;
                    console.log("Forma giocatore salvata/aggiornata in Firestore (persistenza F5 attiva).");
                }
                
                // 3. Aggiorna titolari e panchina con i dati di forma
                const updateFormationWithForm = (list) => list.map(p => {
                    // Cerca il giocatore aggiornato nell'array playersForRendering (che ora include la forma)
                    return playersForRendering.find(rp => rp.id === p.id) || p; 
                });
                
                // Rimuovi giocatori che non sono più in rosa (es. licenziati)
                const validPlayersInFormation = (list) => list.filter(p => playersForRendering.some(rp => rp.id === p.id));
                
                // Aggiorna la struttura della formazione con gli oggetti giocatore che includono la forma
                teamData.formation.titolari = updateFormationWithForm(validPlayersInFormation(teamData.formation.titolari));
                teamData.formation.panchina = updateFormationWithForm(validPlayersInFormation(teamData.formation.panchina));
                
                // Rimpiazza l'array players con l'array playersForRendering che include i dati di forma per il rendering D&D
                teamData.players = playersForRendering;
            }
            // --- FINE LOGICA FORMA ---
            
            // Imposta i dati globali e renderizza
            // currentTeamData = teamData; // Non necessario riassegnare currentTeamData qui se è già aggiornato in FormFirestore
            
            if (mode === 'rosa' || mode === 'icona-swap') {
                renderRosaManagement(teamData);
            } else if (mode === 'formazione') {
                renderFormazioneManagement(teamData);
            }
        } catch (error) {
            console.error("Errore nel caricamento dei dati della squadra:", error);
            squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore di caricamento dati: ${error.message}</p>`;
        }
    };
    
    // -------------------------------------------------------------------
    // MODALITÀ GESTIONE ROSA (CON ORDINAMENTO e ASSEGNAZIONE CAPITANO)
    // -------------------------------------------------------------------
    
    const renderRosaManagement = (teamData) => {
        squadraMainTitle.textContent = "Gestione Rosa";
        squadraSubtitle.textContent = `Budget Rimanente: ${teamData.budget} Crediti Seri | Giocatori in rosa: ${window.getPlayerCountExcludingIcona(teamData.players)}/${window.InterfacciaConstants.MAX_ROSA_PLAYERS} (+ Icona)`;
        
        // --- LOGICA DI ORDINAMENTO (AGGIORNATA per Icona, Ruolo, Livello) ---
        const sortedPlayers = [...teamData.players].sort((a, b) => {
            const isIconaA = a.abilities && a.abilities.includes('Icona');
            const isIconaB = b.abilities && b.abilities.includes('Icona');

            // 1. Icona (Icona A sempre prima di Icona B, se entrambe sono Icona, si passa al ruolo)
            if (isIconaA && !isIconaB) return -1;
            if (!isIconaA && isIconaB) return 1;

            // 2. Ruolo (P, D, C, A)
            const roleComparison = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
            if (roleComparison !== 0) {
                 return roleComparison;
            }
            
            // 3. Livello (dal più alto al più basso)
            return b.level - a.level;
        });
        // --- FINE LOGICA DI ORDINAMENTO ---

        squadraToolsContainer.innerHTML = `
            
            <div class="bg-gray-700 p-6 rounded-lg border border-green-500">
                <h3 class="text-2xl font-bold text-green-400 mb-4">I Tuoi Calciatori (Ordinati per Icona, Ruolo e Livello)</h3>
                <div id="player-list-message" class="text-center mb-4 text-green-500"></div>
                
                <!-- NUOVO PULSANTE SOSTITUISCI ICONA -->
                <button id="btn-replace-icona" 
                        class="w-full bg-orange-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-orange-500 transition duration-150 transform hover:scale-[1.01] mb-4">
                    Sostituisci Icona (Costo: 500 CS)
                </button>

                <div id="player-list" class="space-y-3">
                    ${sortedPlayers.length === 0 
                        ? '<p class="text-gray-400">Nessun calciatore in rosa. Vai al Draft per acquistarne!</p>'
                        : sortedPlayers.map(player => {
                            // Calcoliamo il rimborso solo per i giocatori che hanno avuto un costo > 0
                            const refundCost = player.cost > 0 ? Math.floor(player.cost / 2) : 0;
                            const isCaptain = player.isCaptain; // Usa il flag isCaptain
                            const isIcona = player.abilities && player.abilities.includes('Icona'); // Controlla l'abilità Icona
                            const captainMarker = isCaptain ? ' (CAPITANO)' : '';
                            
                            // Visualizzazione Icona e Avatar
                            let iconaAvatarHtml = '';
                            let iconaMarker = '';

                            if (isIcona) {
                                // Troviamo il giocatore Icona completo dai dati correnti (che includono photoUrl)
                                const iconaData = teamData.players.find(p => p.abilities && p.abilities.includes('Icona') && p.id === player.id) || {};
                                // Assicurati che photoUrl esista o usa un placeholder sicuro
                                const avatarUrl = iconaData.photoUrl && iconaData.photoUrl.includes('http') 
                                                ? iconaData.photoUrl 
                                                : 'https://placehold.co/40x40/facc15/000?text=I'; 

                                iconaAvatarHtml = `
                                    <img src="${avatarUrl}" alt="Avatar Icona" class="w-10 h-10 rounded-full border-2 border-yellow-400 mr-3 object-cover">
                                `;
                                iconaMarker = ' <span class="bg-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full text-xs font-extrabold">ICON A</span>';
                            }

                            const isCaptainClass = isCaptain ? 'text-orange-400 font-extrabold' : 'text-white font-semibold';
                            
                            // Logica Tipologia Icona
                            const playerType = player.type || 'N/A';
                            const typeData = TYPE_ICONS[playerType] || TYPE_ICONS['N/A'];
                            const typeIconHtml = `<i class="${typeData.icon} ${typeData.color} text-lg ml-2" title="Tipo: ${playerType}"></i>`;
                            
                            // Lista Abilità
                            const playerAbilities = (player.abilities || []).filter(a => a !== 'Icona'); // Filtra Icona
                            const abilitiesHtml = playerAbilities.length > 0 
                                ? `<p class="text-xs text-indigo-300 mt-1">Abilità: ${playerAbilities.join(', ')}</p>`
                                : `<p class="text-xs text-gray-500 mt-1">Abilità: Nessuna</p>`;

                            
                            // Pulsante Capitano
                            const captainButton = isCaptain 
                                ? `<button class="bg-gray-500 text-gray-300 text-sm px-4 py-2 rounded-lg cursor-default shadow-md" disabled>Capitano Attuale</button>`
                                : `<button data-player-id="${player.id}" 
                                        data-player-name="${player.name}"
                                        data-action="assign-captain"
                                        class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-150 shadow-md">
                                    Nomina Capitano
                                </button>`;

                            // Bottone Licenziamento
                            const isLicenziabile = !isIcona; // L'Icona non è licenziabile
                            const licenziaButton = `
                                <button data-player-id="${player.id}" 
                                        data-original-cost="${player.cost}"
                                        data-refund-cost="${refundCost}"
                                        data-player-name="${player.name}"
                                        data-action="licenzia"
                                        class="bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition duration-150 shadow-md 
                                        ${isLicenziabile ? 'hover:bg-red-700' : 'opacity-50 cursor-not-allowed'}"
                                        ${isLicenziabile ? '' : 'disabled'}>
                                    Licenzia (Rimborso: ${refundCost} CS)
                                </button>
                            `;


                            return `
                                <div class="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg border border-green-700">
                                    <div class="flex items-center mb-2 sm:mb-0 sm:w-1/2">
                                        ${iconaAvatarHtml} <!-- AVATAR QUI -->
                                        <div>
                                            <span class="${isCaptainClass}">${player.name}${captainMarker}</span> 
                                            ${iconaMarker} <!-- MARKER ICONA -->
                                            <span class="text-yellow-400">(${player.role})</span>
                                            ${typeIconHtml} 
                                            <p class="text-sm text-gray-400">Livello: ${player.level} | Acquistato per: ${player.cost} CS</p>
                                            ${abilitiesHtml} <!-- VISUALIZZAZIONE ABILITÀ -->
                                        </div>
                                    </div>
                                    <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto items-center">
                                        
                                        ${captainButton}
                                        ${licenziaButton}
                                    </div>
                                </div>
                            `;
                          }).join('')
                    }
                </div>
            </div>
        `;
        
        const playerList = document.getElementById('player-list');
        if (playerList) {
            // Delega l'evento a tutte le azioni
            playerList.addEventListener('click', (e) => {
                 const target = e.target;
                 if (target.dataset.action === 'licenzia' || target.dataset.action === 'confirm-licenzia') {
                     handleRosaAction(e);
                 } else if (target.dataset.action === 'assign-captain') {
                     handleCaptainAssignment(target.dataset.playerId, target.dataset.playerName);
                 }
            });
        }
        
        // Cablaggio nuovo pulsante
        document.getElementById('btn-replace-icona').addEventListener('click', () => {
             loadTeamDataFromFirestore(currentTeamId, 'icona-swap');
        });
    };
    
    /**
     * Gestisce l'assegnazione del Capitano a un giocatore esistente.
     */
    const handleCaptainAssignment = async (newCaptainId, newCaptainName) => {
        const msgContainerId = 'player-list-message';
        displayMessage(msgContainerId, `Tentativo di nominare ${newCaptainName} Capitano...`, 'info');

        try {
            const { doc, getDoc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            // 1. Aggiorna la rosa interna: rimuove il flag isCaptain dal vecchio e lo aggiunge al nuovo.
            const updatedPlayers = currentTeamData.players.map(player => {
                 const isNewCaptain = player.id === newCaptainId;
                 return {
                     ...player,
                     isCaptain: isNewCaptain,
                 };
            });
            
            // 2. Aggiorna Firestore
            await updateDoc(teamDocRef, {
                players: updatedPlayers,
                formation: {
                    ...currentTeamData.formation,
                    titolari: currentTeamData.formation.titolari.map(p => ({
                        ...p,
                        isCaptain: p.id === newCaptainId
                    })),
                    panchina: currentTeamData.formation.panchina.map(p => ({
                        ...p,
                        isCaptain: p.id === newCaptainId
                    })),
                }
            });
            
            // 3. Aggiorna i dati globali locali (CRUCIALE)
            window.InterfacciaCore.currentTeamData.players = updatedPlayers; 
            currentTeamData.players = updatedPlayers; // Aggiorna la variabile locale

            
            displayMessage(msgContainerId, `${newCaptainName} è il nuovo Capitano!`, 'success');
            
            // ** FIX BUG NAVIGAZIONE **
            // Invece di lanciare l'evento Dashboard (che reindirizza), carichiamo la vista Rosa fresca
            // e ricarichiamo la Dashboard in background per l'aggiornamento delle statistiche.
            
            // Ricarica solo la vista Rosa con i dati aggiornati
            loadTeamDataFromFirestore(currentTeamId, 'rosa'); 
            
            // Aggiorna la Dashboard in background
            if (window.InterfacciaDashboard && window.InterfacciaCore.currentTeamId) {
                 window.InterfacciaDashboard.reloadTeamDataAndUpdateUI(window.elements);
            }
            // FINE FIX

        } catch (error) {
            console.error("Errore nell'assegnazione del Capitano:", error);
            displayMessage(msgContainerId, `Errore: Impossibile nominare ${newCaptainName} Capitano. ${error.message}`, 'error');
        }
    };
    
    // Ritorna alla Dashboard Utente con aggiornamento
    const handleRosaAction = async (event) => {
        const target = event.target;
        const msgContainerId = 'player-list-message';

        if (!target.dataset.playerId) return;

        const playerId = target.dataset.playerId;
        const playerName = target.dataset.playerName;
        const refundCost = parseInt(target.dataset.refundCost);
        
        if (target.dataset.action === 'licenzia') {
            
            // Prevenire il licenziamento del Capitano o dell'Icona (entrambi controllati dal flag isCaptain/Icona)
            const playerInRosa = currentTeamData.players.find(p => p.id === playerId);
            if (playerInRosa && playerInRosa.isCaptain) {
                 displayMessage(msgContainerId, `ERRORE: Non puoi licenziare il Capitano attuale! Assegna prima un nuovo Capitano.`, 'error');
                 return;
            }
            // Blocco licenziamento ICONA (NUOVA REGOLA)
            if (playerInRosa && playerInRosa.abilities && playerInRosa.abilities.includes('Icona')) {
                 displayMessage(msgContainerId, `ERRORE: Non puoi licenziare l'Icona del club!`, 'error');
                 return;
            }
            
            target.textContent = `CONFERMA? (+${refundCost} CS)`;
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-licenzia';
            return;
        }

        if (target.dataset.action === 'confirm-licenzia') {
            target.textContent = 'Esecuzione...';
            target.disabled = true;
            displayMessage(msgContainerId, `Licenziamento di ${playerName} in corso...`, 'info');

            try {
                const { doc, getDoc, updateDoc, setDoc, deleteDoc, deleteField } = firestoreTools; 
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
                
                // 1. Tenta di determinare l'origine del giocatore
                const draftDocRef = doc(db, DRAFT_PLAYERS_COLLECTION_PATH, playerId);
                const marketDocRef = doc(db, MARKET_PLAYERS_COLLECTION_PATH, playerId);
                
                // Recupera i dati completi del giocatore dalla rosa corrente
                const playerInRosa = currentTeamData.players.find(p => p.id === playerId);
                if (!playerInRosa) {
                    throw new Error("Dati giocatore non trovati nella rosa!");
                }

                // *** INIZIO MODIFICA: FORZATURA ALLA REINTRODUZIONE NEL MERCATO ***
                
                // 2. Controllo origine nel Draft (se esiste, dobbiamo eliminarlo)
                const draftDoc = await getDoc(draftDocRef);
                const marketDoc = await getDoc(marketDocRef);
                
                // Variabile per sapere se dobbiamo agire sul documento Draft
                const wasInDraft = draftDoc.exists();
                const docExistsInMarket = marketDoc.exists(); 
                
                // --- TRANSAZIONE 1: Aggiorna il documento della Squadra ---
                
                const teamDoc = await getDoc(teamDocRef);
                const teamData = teamDoc.data();
                const currentPlayers = teamData.players || [];
                
                const updatedPlayers = currentPlayers.filter(p => p.id !== playerId);
                
                // Rimuovi anche dalla formazione se presente
                const updatedTitolari = teamData.formation.titolari.filter(p => p.id !== playerId);
                const updatedPanchina = teamData.formation.panchina.filter(p => p.id !== playerId);

                // Prepara l'oggetto per rimuovere la forma del giocatore licenziato
                const formStatusUpdate = {};
                if (teamData.playersFormStatus && teamData.playersFormStatus[playerId]) {
                     formStatusUpdate[`playersFormStatus.${playerId}`] = deleteField();
                }

                await updateDoc(teamDocRef, {
                    budget: teamData.budget + refundCost, 
                    players: updatedPlayers,
                    formation: {
                        ...teamData.formation,
                        titolari: updatedTitolari,
                        panchina: updatedPanchina
                    },
                    ...formStatusUpdate // Rimuove la forma salvata
                });
                
                // --- TRANSAZIONE 2: Gestione Mercato (Nuova Regola: TUTTI VANNO QUI) ---
                
                // Costruiamo l'oggetto completo e valido per il setDoc/updateDoc del Mercato
                // Dati base per la reintroduzione
                const finalLevelRange = playerInRosa.levelRange && Array.isArray(playerInRosa.levelRange) ? playerInRosa.levelRange : [playerInRosa.level || 1, playerInRosa.level || 1];
                const finalCost = playerInRosa.cost !== undefined && playerInRosa.cost !== null ? playerInRosa.cost : 0;
                const finalAge = playerInRosa.age !== undefined && playerInRosa.age !== null ? playerInRosa.age : 25;
                const finalRole = playerInRosa.role || 'C';
                const finalName = playerInRosa.name || 'Sconosciuto';
                const finalType = playerInRosa.type || window.getRandomType();
                const finalAbilities = playerInRosa.abilities || []; 

                const playerDocumentData = {
                    name: finalName,
                    role: finalRole,
                    type: finalType,
                    age: finalAge,
                    cost: finalCost,
                    levelRange: finalLevelRange, 
                    abilities: finalAbilities,
                    isDrafted: false, // Ora è disponibile
                    teamId: null,
                    creationDate: new Date().toISOString()
                };

                if (docExistsInMarket) {
                    // Caso A: Il documento esisteva già nel Mercato -> usiamo setDoc con merge 
                    await setDoc(marketDocRef, playerDocumentData, { merge: true });
                } else {
                    // Caso B: Il giocatore non era né nel Draft né nel Mercato (giocatore base) o era solo nel Draft.
                    // Usiamo setDoc sul Mercato per creare il documento con l'ID del giocatore licenziato.
                    await setDoc(marketDocRef, playerDocumentData);
                }
                
                // --- TRANSAZIONE 3: PULIZIA DRAFT (Se il giocatore proveniva dal Draft) ---
                if (wasInDraft) {
                    await deleteDoc(draftDocRef);
                    console.log(`Giocatore ${playerName} rimosso dalla collezione Draft.`);
                }
                
                // *** FINE MODIFICA: FORZATURA ALLA REINTRODUZIONE NEL MERCATO ***
                
                // Ricarica le liste Admin (se l'Admin le sta guardando)
                if (window.loadDraftPlayersAdmin) window.loadDraftPlayersAdmin();
                if (window.loadMarketPlayersAdmin) window.loadMarketPlayersAdmin();

                displayMessage(msgContainerId, `Giocatore ${playerName} licenziato! Rimborsati ${refundCost} CS. Tornato nel Mercato.`, 'success');
                loadTeamDataFromFirestore(currentTeamId, 'rosa'); // Sincronizza i dati e ricarica la vista
                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            } catch (error) {
                console.error("Errore durante il licenziamento:", error);
                displayMessage(msgContainerId, `Errore nel licenziamento di ${playerName}. Messaggio: ${error.message}`, 'error');
                target.disabled = false;
                target.textContent = 'Licenzia (Errore)';
                target.classList.remove('bg-orange-500');
                target.classList.add('bg-red-600');
                target.dataset.action = 'licenzia';
            }
        }
    };

    /**
     * [NUOVA FUNZIONE] Renderizza il pannello per sostituire l'Icona con una nuova.
     */
    const renderIconaReplacementPanel = async (teamData) => {
        const msgContainerId = 'player-list-message';
        const ICONA_COST = 500;
        
        // 1. Verifica Coerenza e Stato Campionato
        // Utilizza una funzione isSeasonOver globale fittizia per evitare errori,
        // ma la logica vera sarà nel modulo campionato.js
        if (window.isSeasonOver) {
             const isOver = await window.isSeasonOver();
             if (!isOver) {
                 displayMessage(msgContainerId, "ERRORE: La sostituzione dell'Icona è consentita SOLO se il campionato è fermo (Pausa/Terminato).", 'error');
                 return;
             }
        }
        if (teamData.budget < ICONA_COST) {
             displayMessage(msgContainerId, `ERRORE: Budget insufficiente. La sostituzione costa ${ICONA_COST} CS. Budget attuale: ${teamData.budget} CS.`, 'error');
             return;
        }

        const currentIcona = teamData.players.find(p => p.abilities && p.abilities.includes('Icona'));
        
        // Dati candidati Icona (usiamo i template globali)
        const candidates = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
        
        // Filtra l'Icona corrente se presente
        const availableIcons = candidates.filter(c => c.name !== currentIcona.name);
        
        squadraToolsContainer.innerHTML = `
            <div class="p-6 bg-gray-800 rounded-lg border border-orange-500 shadow-inner-lg space-y-6">
                <h3 class="text-2xl font-bold text-orange-400 mb-4 border-b border-gray-600 pb-2">
                    Sostituzione Icona (Costo: ${ICONA_COST} CS)
                </h3>
                <p class="text-gray-300">Icona Attuale: <span class="text-yellow-400 font-extrabold">${currentIcona.name} (${currentIcona.role})</span>. Scegli una nuova Icona qui sotto.
                </p>
                <p id="icona-replacement-message" class="text-center text-red-400"></p>

                <div id="icona-candidates-list" class="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                    ${availableIcons.map(icon => `
                        <div data-icon-id="${icon.id}" data-icon-name="${icon.name}"
                             class="icon-select-card p-3 bg-gray-700 rounded-lg border border-gray-600 text-center cursor-pointer hover:bg-indigo-700 transition duration-150 transform hover:scale-[1.03]">
                            <img src="${icon.photoUrl}" alt="Avatar ${icon.name}" class="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-2 border-gray-400">
                            <p class="font-bold text-white">${icon.name}</p>
                            <p class="text-xs text-yellow-400">${icon.role} (${icon.type})</p>
                        </div>
                    `).join('')}
                </div>
                
                <button id="btn-confirm-replace-icona" disabled
                        class="w-full bg-green-600 text-white font-extrabold py-3 rounded-lg opacity-50 cursor-not-allowed transition duration-150">
                    CONFERMA SCAMBIO ICONA
                </button>
                
                <button id="btn-cancel-replace"
                        class="w-full bg-gray-600 text-white font-extrabold py-2 rounded-lg transition duration-150">
                    ← Annulla e Torna alla Gestione Rosa
                </button>
            </div>
        `;

        const iconaCandidatesList = document.getElementById('icona-candidates-list');
        const btnConfirmReplace = document.getElementById('btn-confirm-replace-icona');
        const btnCancel = document.getElementById('btn-cancel-replace');
        const replaceMessage = document.getElementById('icona-replacement-message');
        
        let selectedIconData = null;

        iconaCandidatesList.addEventListener('click', (e) => {
            const card = e.target.closest('.icon-select-card');
            if (!card) return;

            iconaCandidatesList.querySelectorAll('.icon-select-card').forEach(c => {
                c.classList.remove('border-green-400', 'bg-indigo-700');
            });
            
            card.classList.add('border-green-400', 'bg-indigo-700');
            
            selectedIconData = candidates.find(c => c.id === card.dataset.iconId);
            
            btnConfirmReplace.disabled = false;
            btnConfirmReplace.classList.remove('opacity-50', 'cursor-not-allowed');
            btnConfirmReplace.textContent = `CONFERMA SCAMBIO CON ${selectedIconData.name} (500 CS)`;
            displayMessage(`Hai selezionato ${selectedIconData.name}. Pronto per confermare.`, 'info', 'icona-replacement-message');
        });

        btnConfirmReplace.addEventListener('click', () => {
             if (selectedIconData) {
                 confirmAndSwapIcona(teamData, selectedIconData, ICONA_COST);
             }
        });
        
        btnCancel.addEventListener('click', () => loadTeamDataFromFirestore(currentTeamId, 'rosa'));
    };

    /**
     * Esegue la transazione di scambio Icona.
     */
    const confirmAndSwapIcona = async (teamData, newIcona, cost) => {
        const msgId = 'icona-replacement-message';
        const { doc, updateDoc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
        
        const currentIcona = teamData.players.find(p => p.abilities && p.abilities.includes('Icona'));
        
        if (!currentIcona) {
             displayMessage("Errore critico: Icona attuale non trovata.", 'error', msgId);
             return;
        }

        displayMessage("Esecuzione scambio Icona...", 'info', msgId);
        document.getElementById('btn-confirm-replace-icona').disabled = true;

        try {
            // 1. Aggiorna la Rosa (scambia Icona attuale con la nuova)
            const updatedPlayers = teamData.players.map(p => {
                 if (p.id === currentIcona.id) {
                     // Questo slot ora riceve la NUOVA Icona (che usa l'ID del giocatore base sostituito)
                     return { 
                         ...newIcona, 
                         id: currentIcona.id, // Mantiene l'ID del vecchio slot Icona
                         isCaptain: p.isCaptain, // Mantiene il flag Capitano
                         level: newIcona.level, // Livello base 12
                         abilities: ['Icona'] // Assicura che Icona sia l'unica abilità
                     };
                 }
                 return p;
            });

            // 2. Aggiorna Firestore
            await updateDoc(teamDocRef, {
                budget: teamData.budget - cost,
                players: updatedPlayers,
                iconaId: currentIcona.id, // L'ID dell'icona rimane lo stesso (è l'ID del documento-giocatore)
                // Resetta il cooldown per permettere altri acquisti dopo lo swap
                lastAcquisitionTimestamp: new Date().getTime(), 
            });

            displayMessage(`Icona scambiata! ${newIcona.name} è la nuova Icona. Ti sono stati scalati ${cost} CS.`, 'success', msgId);
            
            // 3. Ricarica la vista Rosa
            setTimeout(() => {
                // Sincronizza il dato globale e ricarica la vista
                loadTeamDataFromFirestore(currentTeamId, 'rosa'); 
            }, 1000);

        } catch (error) {
             console.error("Errore durante lo scambio Icona:", error);
             displayMessage(`Scambio fallito: ${error.message}.`, 'error', msgId);
             document.getElementById('btn-confirm-replace-icona').disabled = false;
        }
    };


    // -------------------------------------------------------------------
    // MODALITÀ GESTIONE FORMAZIONE (Drag & Drop Implementato)
    // -------------------------------------------------------------------
    
    const renderFormazioneManagement = (teamData) => {
        squadraMainTitle.textContent = "Gestione Formazione";
        squadraSubtitle.textContent = `Modulo Attuale: ${teamData.formation.modulo} | Trascina i giocatori in campo! (Forma attiva)`;
        
        // Generazione HTML per la Legenda GRAFICA (IMMAGINE)
        const legendHtml = `
            <div class="flex justify-center items-center p-2">
                <img src="${TYPE_LEGEND_URL}" alt="Legenda Tipologie" class="w-full h-auto max-w-xs rounded-lg shadow-xl">
            </div>
        `;

        squadraToolsContainer.innerHTML = `
            <style>
                /* STILI CSS OMAGGIO PER IL CAMPO */
                #field-area {
                    /* ALTEZZA MASSIMA AUMENTATA */
                    height: 700px; 
                    background-image: 
                        linear-gradient(to right, #14532d, #052e16),
                        url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="0" y="0" width="100" height="100" fill="%2314532d" /><rect x="0" y="40" width="100" height="20" fill="%23052e16" /><rect x="0" y="80" width="100" height="20" fill="%23052e16" /></svg>');
                    background-size: cover;
                    background-repeat: no-repeat;
                    position: relative;
                    overflow: hidden;
                    border: 4px solid white;
                    border-radius: 8px;
                }
                #field-area::before {
                    content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background-color: white; transform: translateY(-50%); z-index: 0; 
                }
                #field-area::after {
                    content: ''; position: absolute; top: 0; left: 50%; bottom: 0; width: 2px; background-color: white; transform: translateX(-50%); z-index: 0; 
                }
                #field-area .center-circle {
                    position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; border: 2px solid white; border-radius: 50%; transform: translate(-50%, -50%); z-index: 0; 
                }
                #field-area .penalty-area-top, #field-area .penalty-area-bottom {
                    position: absolute; left: 50%; transform: translateX(-50%); width: 80%; height: 100px; border: 2px solid white; border-top: none; border-bottom: none; z-index: 0; 
                }
                #field-area .penalty-area-top { top: 0; border-bottom: 2px solid white; }
                #field-area .penalty-area-bottom { bottom: 0; border-top: 2px solid white; }

                /* Nuovo Stile per le card giocatore nel campo */
                .player-card { 
                    cursor: grab; 
                    /* Aumento contrasto per il testo */
                    color: #1f2937; 
                    text-shadow: 0 0 2px rgba(255, 255, 255, 0.5); /* Leggera ombra bianca */
                }
                .empty-slot { border: 2px dashed #4ade80; }
                #titolari-slots { position: relative; height: 100%; }
                #panchina-slots { display: flex; align-items: center; justify-content: flex-start; gap: 8px; }
                
                /* Aggiornamento dimensione container per accomodare 96x96px */
                .jersey-container { padding: 0.25rem; width: 96px; height: 96px; } 
                
                /* POSIZIONI RIBILANCIATE SUI 700PX DI ALTEZZA */
                .field-position-P { position: absolute; top: 5%; width: 100%; } /* Più vicino alla porta (sopra) */
                .field-position-D { position: absolute; top: 30%; width: 100%; } /* Più in alto del centro */
                .field-position-C { position: absolute; top: 55%; width: 100%; } /* Centro-basso */
                .field-position-A { position: absolute; top: 80%; width: 100%; } /* Più vicino alla porta (sotto) */
                
                .slot-target { 
                    z-index: 10; 
                    position: relative; 
                    width: 100%; 
                    height: 100%; 
                    border-radius: 6px; 
                    box-sizing: border-box; 
                    line-height: 1; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px; /* Ridotto padding slot-target */
                }
                
                .empty-slot.slot-target { 
                    border: 2px dashed #4ade80; 
                    padding: 0.5rem; 
                }
                
                /* Nuovo layout interno della maglia */
                .jersey-inner { 
                    display: grid; 
                    grid-template-rows: auto auto 1fr;
                    grid-template-columns: 1fr 1fr;
                    gap: 0;
                    width: 100%; 
                    height: 100%; 
                    font-size: 0.7rem; 
                    line-height: 1;
                    padding: 0.1rem;
                    box-sizing: border-box;
                }
                .jersey-name { grid-column: 1 / 3; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
                .jersey-role { grid-column: 1 / 2; text-align: left; font-size: 0.6rem; color: #374151; font-weight: 600; padding-left: 2px; }
                .jersey-base-level { grid-column: 2 / 3; text-align: right; font-size: 0.6rem; color: #374151; font-weight: 600; padding-right: 2px;}
                .jersey-level-box { grid-column: 1 / 3; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 4px; }
                .level-text { font-size: 1.5rem; line-height: 1; font-weight: 900; }
                .mod-text { font-size: 0.6rem; line-height: 1; font-weight: 700; margin-top: 2px; }

                
            </style>
            
            <div id="formation-message" class="text-center mb-4 text-red-400"></div>

            <div class="flex flex-col lg:flex-row gap-6">
                <div class="lg:w-1/3 p-4 bg-gray-800 rounded-lg border border-indigo-500 space-y-4">
                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2">Seleziona Modulo</h3>
                    <select id="formation-select" class="w-full p-2 rounded-lg bg-gray-700 text-white border border-indigo-600">
                        ${Object.keys(MODULI).map(mod => `<option value="${mod}" ${teamData.formation.modulo === mod ? 'selected' : ''}>${mod}</option>`).join('')}
                    </select>
                    <p id="module-description" class="text-sm text-gray-400">${MODULI[teamData.formation.modulo].description}</p>
                    
                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2 pt-4">Legenda Tipologie (Type)</h3>
                    <div class="p-3 bg-gray-700 rounded-lg border border-gray-600 shadow-inner">
                         ${legendHtml}
                    </div>

                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2 pt-4">Rosa Completa (Disponibili)</h3>
                    <div id="full-squad-list" class="space-y-2 max-h-60 overflow-y-auto min-h-[100px] border border-gray-700 p-2 rounded-lg"
                         ondragover="event.preventDefault();"
                         ondrop="window.handleDrop(event, 'ROSALIBERA')">
                    </div>
                </div>
                
                <div class="lg:w-2/3 space-y-4">
                    <div id="field-area" class="rounded-lg shadow-xl p-4 text-center">
                        <h4 class="text-white font-bold mb-4 z-10 relative">Campo (Titolari) - Modulo: ${teamData.formation.modulo}</h4>
                        <div class="center-circle"></div>
                        <div class="penalty-area-top"></div>
                        <div class="penalty-area-bottom"></div>
                        <div id="titolari-slots" class="h-full"></div>
                    </div>
                    
                    <div id="bench-container" class="bg-gray-800 p-3 rounded-lg border-2 border-indigo-500 h-32">
                        <h4 class="text-indigo-400 font-bold mb-2">Panchina (Max 3 Giocatori)</h4>
                        <div id="panchina-slots" class="h-16 items-center flex space-x-2"
                             ondragover="event.preventDefault();"
                             ondrop="window.handleDrop(event, 'B')">
                        </div>
                    </div>
                    
                    <button id="btn-save-formation"
                            class="w-full bg-indigo-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-indigo-400 transition duration-150 transform hover:scale-[1.01]">
                        Salva Formazione
                    </button>
                </div>
            </div>
        `;
        
        const formationSelect = document.getElementById('formation-select');
        formationSelect.addEventListener('change', (e) => {
            const newModule = e.target.value;
            currentTeamData.formation.titolari = [];
            currentTeamData.formation.panchina = [];
            currentTeamData.formation.modulo = newModule;
            // Ridisegna immediatamente e avvisa l'utente
            renderFieldSlots(currentTeamData); 
            displayMessage('formation-message', `Modulo cambiato in ${newModule}. Rischiera i tuoi giocatori.`, 'info');
            document.getElementById('module-description').textContent = MODULI[newModule].description;
            document.querySelector('#field-area h4').textContent = `Campo (Titolari) - Modulo: ${newModule}`;
        });
        
        document.getElementById('btn-save-formation').addEventListener('click', handleSaveFormation);
        renderFieldSlots(teamData); 
    };

    const createPlayerSlot = (role, index, player) => {
        const slotId = `${role}-${index}`;
        
        // Usa i dati con forma se presenti
        const playerWithForm = player;
        
        const playerName = playerWithForm ? playerWithForm.name : `Slot ${role}`;
        const playerRole = playerWithForm ? playerWithForm.role : role; 
        const levelText = playerWithForm ? playerWithForm.currentLevel : ''; 
        const baseLevel = playerWithForm ? playerWithForm.level : '';
        // MODIFICATO: da bg-orange-400 a bg-gray-200 (grigio chiaro/quasi bianco)
        const bgColor = playerWithForm ? 'bg-gray-200' : 'bg-gray-700'; 
        // Testo mantenuto scuro per contrasto
        const textColor = playerWithForm ? 'text-gray-900' : 'text-gray-400';
        
        const draggableAttr = playerWithForm ? `draggable="true" data-id="${playerWithForm.id}" data-role="${playerWithForm.role}" data-cost="${playerWithForm.cost}" ondragend="window.handleDragEnd(event)"` : '';
        
        let warningHtml = '';
        let tooltipText = '';
        const isOutOfPosition = playerWithForm && role !== 'B' && playerWithForm.role !== role;

        if (isOutOfPosition) {
            tooltipText = `ATTENZIONE: ${playerWithForm.name} è un ${playerWithForm.role} ma gioca come ${role}. L'impatto in partita sarà minore.`;
            warningHtml = `
                <span class="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 cursor-help" 
                      title="${tooltipText}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600 bg-white rounded-full shadow-lg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </span>
            `;
        }
        
        // NUOVO: Icona forma
        const formIconHtml = playerWithForm ? 
            `<i class="${playerWithForm.formIcon} mr-1 text-base"></i>` : 
            '';
        
        // NUOVO: Colore del modificatore
        // Mantengo colori contrastanti per le frecce/modificatore
        const modColor = playerWithForm && playerWithForm.formModifier > 0 ? 'text-green-600' : (playerWithForm && playerWithForm.formModifier < 0 ? 'text-red-600' : 'text-gray-600');
        const modText = playerWithForm && playerWithForm.formModifier !== 0 ? `(${playerWithForm.formModifier > 0 ? '+' : ''}${playerWithForm.formModifier})` : '(0)';
        
        // Logica Tipologia Icona (per il tooltip)
        const playerType = playerWithForm ? (playerWithForm.type || 'N/A') : 'N/A';
        const typeData = TYPE_ICONS[playerType] || TYPE_ICONS['N/A'];
        const typeIconHtml = playerWithForm ? `<i class="${typeData.icon} ${typeData.color} text-xs ml-1"></i>` : '';
        
        // Colore scuro per le etichette interne (Ruolo e Livello Base) per contrasto su sfondo chiaro
        const internalLabelColor = 'text-gray-600'; 

        // LOGICA MIGLIORATA PER IL CONTENUTO DEL BOX:
        const playerContent = playerWithForm ? 
            `<div class="jersey-inner">
                <span class="jersey-name" title="${playerWithForm.name}">${playerWithForm.name}</span>
                
                <span class="jersey-role ${internalLabelColor}">
                    ${playerRole} ${typeIconHtml}
                </span>
                <span class="jersey-base-level ${internalLabelColor}">BASE: ${baseLevel}</span>

                <div class="jersey-level-box">
                    <div class="flex items-center">
                        ${formIconHtml} 
                        <span class="level-text">${levelText}</span>
                    </div>
                    <span class="mod-text ${modColor}">${modText}</span>
                </div>
            </div>`
            : 
            `<span class="font-semibold text-xs select-none">${role}</span>`;

        // Modifica: Aumento del padding interno e del box-sizing
        return `
            <div data-role="${role}" id="${slotId}" class="slot-target w-full text-center rounded-lg shadow-inner-dark transition duration-150 cursor-pointer relative
                        ${bgColor} ${textColor}
                        ${playerWithForm ? 'player-card' : 'empty-slot'} z-10 p-1" 
                 ondragover="event.preventDefault();"
                 ondrop="window.handleDrop(event, '${role}')"
                 ${draggableAttr}
                 ondragstart="window.handleDragStart(event)"
                 title="${playerWithForm ? playerName : ''}">
                
                ${playerContent}
                ${warningHtml}
            </div>
        `;
    };

    const renderFieldSlots = (teamData) => {
        const formationData = teamData.formation;
        const currentModule = MODULI[formationData.modulo];
        const titolariSlots = document.getElementById('titolari-slots');
        const panchinaSlots = document.getElementById('panchina-slots');
        const fullSquadList = document.getElementById('full-squad-list');

        if (!titolariSlots || !panchinaSlots || !fullSquadList || !currentModule) return;
        
        const allPlayers = teamData.players;
        
        // Calcola i giocatori in campo/panchina
        const usedIds = [...formationData.titolari.map(p => p.id), ...formationData.panchina.map(p => p.id)];
        
        // Giocatori disponibili (nella rosa ma non in formazione)
        let availablePlayers = allPlayers.filter(p => !usedIds.includes(p.id));
        
        // =======================================================
        // LOGICA: ORDINAMENTO ROSA COMPLETA
        // =======================================================
        availablePlayers.sort((a, b) => {
            // 1. Icona (Icona A sempre prima di Icona B)
            const isIconaA = a.abilities && a.abilities.includes('Icona');
            const isIconaB = b.abilities && b.abilities.includes('Icona');

            if (isIconaA && !isIconaB) return -1;
            if (!isIconaA && isIconaB) return 1;

            // 2. Ruolo (P, D, C, A)
            const roleComparison = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
            if (roleComparison !== 0) {
                 return roleComparison;
            }
            
            // 3. Livello (dal più alto al più basso)
            return b.level - a.level;
        });
        // =======================================================

        
        // Copia dei titolari per il rendering a slot (perché la lista è piatta)
        let titolariToRender = [...formationData.titolari];
        
        titolariSlots.innerHTML = '';
        panchinaSlots.innerHTML = '';
        fullSquadList.innerHTML = '';
        
        // CORREZIONE: Dichiarazione di fieldHtml
        let fieldHtml = ''; 
        
        // Funzione helper per trovare e rimuovere un giocatore dal pool dei titolari
        const getPlayerForRole = (role) => {
            const index = titolariToRender.findIndex(p => p.role === role);
            if (index !== -1) {
                return titolariToRender.splice(index, 1)[0];
            }
            // Se non trova il ruolo primario, cerca il primo giocatore disponibile (fuori ruolo)
            const firstAvailableIndex = titolariToRender.findIndex(p => p.role !== 'P' && p.role !== 'B'); // Evita portieri non assegnati
             if (role !== 'P' && firstAvailableIndex !== -1) {
                return titolariToRender.splice(firstAvailableIndex, 1)[0];
             }
            return null;
        };

        // Portiere (P)
        let portiere = null;
        const portiereIndex = titolariToRender.findIndex(p => p.role === 'P');
        if (portiereIndex !== -1) {
             portiere = titolariToRender.splice(portiereIndex, 1)[0];
        }

        fieldHtml += `
            <div class="field-position-P w-full flex justify-center">
                <div class="jersey-container"> <!-- Dimensione aumentata w-24 h-24 -->
                    ${createPlayerSlot('P', 0, portiere)}
                </div>
            </div>
        `;

        // Linee (D, C, A)
        const rolePositionsY = { 'D': 'field-position-D', 'C': 'field-position-C', 'A': 'field-position-A' };
        
        ROLES.filter(r => r !== 'P').forEach(role => {
            const slotsCount = currentModule[role];
            if (slotsCount === 0) return;

            fieldHtml += `
                <div class="${rolePositionsY[role]} w-full flex justify-center items-center">
                    <h5 class="absolute left-2 text-white font-bold text-sm z-0">${role} (${slotsCount})</h5>
                    
                    <div class="flex justify-around w-full px-12">
                        ${Array(slotsCount).fill().map((_, index) => {
                            const player = getPlayerForRole(role); 
                            return `
                                <div class="jersey-container"> <!-- Dimensione aumentata w-24 h-24 -->
                                    ${createPlayerSlot(role, index, player)}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        titolariSlots.innerHTML = fieldHtml; 
        
        // Panchina (B)
        panchinaSlots.innerHTML = teamData.formation.panchina.map((player, index) => {
            return `<div class="jersey-container">${createPlayerSlot('B', index, player)}</div>`; // Dimensione aumentata w-24 h-24
        }).join('');
        
        panchinaSlots.innerHTML += Array(3 - teamData.formation.panchina.length).fill().map((_, index) => {
            return `<div class="jersey-container">${createPlayerSlot('B', teamData.formation.panchina.length + index, null)}</div>`; // Dimensione aumentata w-24 h-24
        }).join('');

        // Rosa Completa
        if (availablePlayers.length === 0) {
             fullSquadList.innerHTML = '<p class="text-gray-400">Nessun giocatore disponibile (tutti in campo o in panchina).</p>';
        } else {
            fullSquadList.innerHTML = availablePlayers.map(player => {
                // Recupera i dati di forma corretti dalla Form Status Mappa
                // Nota: In modalità Formazione, teamData.players contiene gli oggetti playersForRendering con la forma
                const playerWithForm = teamData.players.find(p => p.id === player.id) || player; 
                
                // Visualizzazione Abilità in Rosa Libera
                const playerAbilities = (player.abilities || []).filter(a => a !== 'Icona');
                const abilitiesSummary = playerAbilities.length > 0 
                    ? ` (${playerAbilities.slice(0, 2).join(', ')}${playerAbilities.length > 2 ? '...' : ''})`
                    : '';
                const isIcona = player.abilities && player.abilities.includes('Icona');
                const iconaBadge = isIcona ? `<span class="text-yellow-400 font-extrabold mr-1">(ICONA)</span>` : '';
                

                return `
                    <div draggable="true" data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}"
                         class="player-card p-2 bg-gray-600 text-white rounded-lg shadow cursor-grab hover:bg-gray-500 transition duration-100 z-10"
                         ondragstart="window.handleDragStart(event)"
                         ondragend="window.handleDragEnd(event)">
                        ${iconaBadge}${player.name} (${player.role}) (Liv: ${player.level})${abilitiesSummary}
                        <!-- Visualizzazione Form in Rosa Libera -->
                        <span class="float-right text-xs font-semibold ${playerWithForm.formModifier > 0 ? 'text-green-400' : (playerWithForm.formModifier < 0 ? 'text-red-400' : 'text-gray-400')}">
                            ${playerWithForm.formModifier > 0 ? '+' : ''}${playerWithForm.formModifier}
                        </span>
                    </div>
                `;
            }).join('');
        }
    };

    const handleDragStart = (e) => {
        const dragTarget = e.target.closest('.slot-target') || e.target.closest('.player-card');
        if (!dragTarget || !dragTarget.dataset.id) {
             e.preventDefault();
             return;
        }
        
        // 1. SALVATAGGIO DELL'ID SU DATA TRANSFER (FIX AFFIDABILE)
        e.dataTransfer.setData('text/plain', dragTarget.dataset.id);
        
        // 2. Solo per il feedback visivo
        currentDragTarget = dragTarget; 
        setTimeout(() => dragTarget.classList.add('opacity-50', 'border-4', 'border-indigo-400'), 0);
    };

    /**
     * Pulisce lo stato globale al termine del drag.
     */
    window.handleDragEnd = (e) => {
        if (currentDragTarget) {
            currentDragTarget.classList.remove('opacity-50', 'border-4', 'border-indigo-400');
        }
        currentDragTarget = null; 
    };


    window.handleDrop = (e, targetRole) => {
        e.preventDefault();
        
        // 1. RECUPERO L'ID DEL GIOCATORE TRASCINATO
        const droppedId = e.dataTransfer.getData('text/plain');
        const formationMessage = document.getElementById('formation-message');
        
        if (!droppedId) {
             return displayMessage('formation-message', 'Drop fallito: ID Giocatore non trasferito.', 'error');
        }
        
        const player = currentTeamData.players.find(p => p.id === droppedId);
        if (!player) {
             return displayMessage('formation-message', 'Errore: Giocatore non trovato nella rosa (ID non valido).', 'error');
        }

        // 2. TROVARE IL TARGET REALE (slot o contenitore)
        let actualDropSlot = e.target.closest('.slot-target') || e.target.closest('#panchina-slots') || e.target.closest('#full-squad-list'); 
        
        if (!actualDropSlot) {
             return displayMessage('formation-message', 'Drop non valido.', 'error');
        }

        const finalTargetRole = actualDropSlot.dataset.role || targetRole;
        
        // 3. Verifica slot occupato nello slot di destinazione (solo se il drop è su uno SLOT)
        let playerInSlotBeforeDrop = null;
        if (actualDropSlot.classList.contains('player-card') || (actualDropSlot.classList.contains('slot-target') && actualDropSlot.dataset.id)) {
            const occupiedPlayerId = actualDropSlot.dataset.id || droppedId; // Se droppo su me stesso, occupato è comunque me stesso.
            
            // Troviamo il giocatore che era nello slot (SE DIVERSO)
            if (occupiedPlayerId && occupiedPlayerId !== droppedId) {
                 playerInSlotBeforeDrop = currentTeamData.players.find(p => p.id === occupiedPlayerId);
            }
        }
        
        // 4. Rimuovi il giocatore trascinato dalla sua posizione corrente (PRIMA DI TUTTO)
        removePlayerFromPosition(player.id);
        
        
        // 5. Logica di Inserimento
        if (finalTargetRole === 'ROSALIBERA') {
            // Drop sul contenitore della rosa libera (equivale a rimetterlo fuori rosa)
            if (playerInSlotBeforeDrop) removePlayerFromPosition(playerInSlotBeforeDrop.id);
            displayMessage('formation-message', `${player.name} liberato da campo/panchina.`, 'success');
            
        } else if (finalTargetRole === 'B') {
            // Drop sulla Panchina
            
            if (playerInSlotBeforeDrop) {
                // Se c'era un giocatore nello slot della panchina, lo rimuoviamo (andranno in ROSALIBERA al prossimo render)
                removePlayerFromPosition(playerInSlotBeforeDrop.id); 
                displayMessage('formation-message', `${player.name} in panchina. ${playerInSlotBeforeDrop.name} liberato.`, 'info');
            } else if (currentTeamData.formation.panchina.length >= 3) {
                 // Se non c'era un giocatore da scambiare e la panchina è piena, non permettere l'aggiunta
                 return displayMessage('formation-message', 'La panchina è piena (Max 3). Ridisegna per riprovare.', 'error');
            }
            
            // Aggiunge il giocatore alla panchina
            currentTeamData.formation.panchina.push(player);
            displayMessage('formation-message', `${player.name} spostato in panchina.`, 'success');
            
        } else {
            // Drop sul Campo (Titolari - P, D, C, A)
            
            // Se lo slot di destinazione era occupato, rimuoviamo l'occupante
            if (playerInSlotBeforeDrop) {
                 removePlayerFromPosition(playerInSlotBeforeDrop.id); // Rimuovi l'occupante
                 displayMessage('formation-message', `${player.name} ha preso il posto di ${playerInSlotBeforeDrop.name}.`, 'info');
            } else {
                 displayMessage('formation-message', `${player.name} messo in campo come ${finalTargetRole}.`, 'success');
            }

            // Inserisce il giocatore trascinato come titolare
            currentTeamData.formation.titolari.push(player);
        }
        
        // 6. Ridisegna l'interfaccia
        renderFieldSlots(currentTeamData);
    };

    const handleSaveFormation = async () => {
        const saveButton = document.getElementById('btn-save-formation');
        saveButton.textContent = 'Salvataggio...';
        saveButton.disabled = true;
        displayMessage('formation-message', 'Salvataggio formazione in corso...', 'info');

        const { updateDoc, doc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
        
        const titolari = currentTeamData.formation.titolari;

        const portieriInCampo = titolari.filter(p => p.role === 'P').length;
        if (portieriInCampo !== 1) {
             displayMessage('formation-message', 'Errore: Devi schierare esattamente 1 Portiere in campo.', 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }
        
        const totalTitolari = titolari.length;
        if (totalTitolari !== 5) {
             displayMessage('formation-message', `Errore: Devi schierare esattamente 5 titolari (hai ${totalTitolari}).`, 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }
        
        const totalPanchina = currentTeamData.formation.panchina.length;
        if (totalPanchina > 3) {
             displayMessage('formation-message', `Errore: Puoi avere un massimo di 3 giocatori in panchina (hai ${totalPanchina}).`, 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }

        try {
            // Aggiorna solo i dati della formazione
            // IMPORTANTE: Salviamo solo l'ID e il Livello Base/Ruolo/etc. senza i dati temporanei di 'formModifier'
            const cleanFormation = (players) => players.map(({ id, name, role, age, cost, level, isCaptain, type, abilities }) => ({ id, name, role, age, cost, level, isCaptain, type, abilities }));

            await updateDoc(teamDocRef, {
                formation: {
                    modulo: currentTeamData.formation.modulo,
                    titolari: cleanFormation(currentTeamData.formation.titolari),
                    panchina: cleanFormation(currentTeamData.formation.panchina)
                }
            });
            displayMessage('formation-message', 'Formazione salvata con successo!', 'success');
            
            // Aggiorna i dati globali della squadra dopo il salvataggio
            if (window.currentTeamData) {
                 // Aggiorna i dati della formazione nel globale, ma usa la versione "pulita"
                 window.InterfacciaCore.currentTeamData.formation = {
                     modulo: currentTeamData.formation.modulo,
                     titolari: cleanFormation(currentTeamData.formation.titolari),
                     panchina: cleanFormation(currentTeamData.formation.panchina)
                 };
            }

        } catch (error) {
            console.error("Errore nel salvataggio:", error);
            displayMessage('formation-message', `Errore di salvataggio: ${error.message}`, 'error');
        } finally {
            saveButton.textContent = 'Salva Formazione';
            saveButton.disabled = false;
        }
    };


    // GESTIONE NAVIGAZIONE
    squadraBackButton.addEventListener('click', () => {
        // Al ritorno alla Dashboard Utente, ricarica la UI per aggiornare le statistiche
        if (window.showScreen && appContent) {
            // Cancella lo stato dell'ultima schermata salvata
            localStorage.removeItem('fanta_last_screen'); 
            window.showScreen(appContent);
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
        }
    });

    // Rende le funzioni DnD globali
    window.handleDragStart = window.handleDragStart || handleDragStart;
    window.handleDrop = window.handleDrop || handleDrop;
    window.handleDragEnd = window.handleDragEnd || handleDragEnd;

    document.addEventListener('squadraPanelLoaded', initializeSquadraPanel);
    
    // Espone i riferimenti ai caricamenti delle liste Admin, utili dopo il licenziamento
    window.loadDraftPlayersAdmin = window.loadDraftPlayersAdmin || (() => console.log('loadDraftPlayersAdmin non disponibile.'));
    window.loadMarketPlayersAdmin = window.loadMarketPlayersAdmin || (() => console.log('loadMarketPlayersAdmin non disponibile.'));

});