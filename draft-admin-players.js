//
// ====================================================================
// DRAFT-ADMIN-PLAYERS.JS - Gestione CRUD Giocatori (Admin)
// ====================================================================
//

window.DraftAdminPlayers = {

    /**
     * Carica e renderizza la lista dei giocatori nel Draft.
     * @param {Object} context - Contesto con riferimenti
     */
    async loadDraftPlayers(context) {
        const { db, firestoreTools, paths } = context;
        const { collection, getDocs } = firestoreTools;
        const playersListContainer = document.getElementById('draft-players-list');
        if (!playersListContainer) return;

        playersListContainer.innerHTML = '<p class="text-center text-yellow-400">Caricamento giocatori...</p>';

        try {
            const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);
            const querySnapshot = await getDocs(playersCollectionRef);

            if (querySnapshot.empty) {
                playersListContainer.innerHTML = '<p class="text-center text-gray-400">Nessun calciatore presente nel Draft.</p>';
                return;
            }

            let playersHtml = '';
            querySnapshot.forEach(doc => {
                const player = doc.data();
                const playerId = doc.id;

                const isDrafted = player.isDrafted || false;
                const statusClass = isDrafted ? 'bg-red-700' : 'bg-green-700';
                const teamName = player.teamId ? player.teamId : '';
                const statusText = isDrafted ? `Venduto a: ${teamName}` : 'Disponibile';
                const playerType = player.type || 'N/A';

                playersHtml += `
                    <div class="player-item flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-yellow-500 transition duration-150">
                        <!-- Dati Giocatore -->
                        <div class="w-full sm:w-auto mb-2 sm:mb-0">
                            <p class="text-lg font-bold text-white">${player.name} <span class="text-yellow-400">(${player.role} - ${playerType})</span></p>
                            <p class="text-sm text-gray-400">Età: ${player.age} | Livello: ${player.levelRange[0]}-${player.levelRange[1]} | Costo: ${player.cost} CS</p>
                        </div>

                        <!-- Stato e Azioni -->
                        <div class="flex items-center space-x-3 w-full sm:w-auto">
                            <span class="text-xs font-semibold px-2 py-1 rounded-full ${statusClass} text-white">${statusText}</span>

                            <button data-player-id="${playerId}" data-action="delete"
                                    class="delete-player-btn bg-red-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-red-700 transition duration-150 transform hover:scale-105">
                                Elimina
                            </button>
                        </div>
                    </div>
                `;
            });

            playersListContainer.innerHTML = playersHtml;
            playersListContainer.addEventListener('click', (e) => this.handlePlayerAction(e, context));

        } catch (error) {
            console.error("Errore nel caricamento dei giocatori Draft:", error);
            playersListContainer.innerHTML = `<p class="text-center text-red-500">Errore di caricamento: ${error.message}</p>`;
        }
    },

    /**
     * Gestisce le azioni sui giocatori (es. eliminazione).
     * @param {Event} event
     * @param {Object} context - Contesto con riferimenti
     */
    async handlePlayerAction(event, context) {
        const { db, firestoreTools, paths } = context;
        const { displayMessage } = window.DraftUtils;
        const target = event.target;

        // Gestisce il click sul pulsante Elimina
        if (target.dataset.action === 'delete') {
            target.textContent = 'CONFERMA?';
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-delete';
            return;
        }

        // Gestisce la conferma dell'eliminazione
        if (target.dataset.action === 'confirm-delete') {
            const playerIdToDelete = target.dataset.playerId;
            const { doc, deleteDoc } = firestoreTools;

            target.textContent = 'Eliminazione...';
            target.disabled = true;

            try {
                const playerDocRef = doc(db, paths.DRAFT_PLAYERS_COLLECTION_PATH, playerIdToDelete);
                await deleteDoc(playerDocRef);

                target.closest('.player-item').remove();
                this.loadDraftPlayers(context);

                displayMessage('Giocatore eliminato con successo!', 'success', 'player-creation-message');

            } catch (error) {
                console.error(`Errore durante l'eliminazione del giocatore ${playerIdToDelete}:`, error);
                displayMessage(`Errore durante l'eliminazione: ${error.message}`, 'error', 'player-creation-message');
            }
        }
    },

    /**
     * Gestisce l'apertura/chiusura del Draft e aggiorna Firestore.
     * @param {Event} event
     * @param {Object} context - Contesto con riferimenti
     */
    async handleToggleDraft(event, context) {
        const { db, firestoreTools, paths } = context;
        const { displayMessage } = window.DraftUtils;
        const { CONFIG_DOC_ID } = window.DraftConstants;
        const target = event.target;
        const { doc, setDoc } = firestoreTools;
        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        const currentlyOpen = target.dataset.isOpen === 'true';
        const newState = !currentlyOpen;

        target.textContent = 'Aggiornamento...';
        target.disabled = true;
        displayMessage('Aggiornamento stato Draft in corso...', 'info', 'draft-toggle-message');

        try {
            await setDoc(configDocRef, { isDraftOpen: newState }, { merge: true });

            displayMessage(`Stato Draft aggiornato: ${newState ? 'APERTO' : 'CHIUSO'}`, 'success', 'draft-toggle-message');

            // Aggiorna l'UI del pulsante
            target.dataset.isOpen = newState;
            target.textContent = newState ? 'CHIUDI Draft' : 'APRI Draft';

            const statusBox = target.closest('div');
            const statusText = document.getElementById('draft-status-text');

            statusText.textContent = newState ? 'DRAFT APERTO' : 'DRAFT CHIUSO';
            statusBox.classList.remove(newState ? 'border-red-500' : 'border-green-500', newState ? 'bg-red-900' : 'bg-green-900');
            statusBox.classList.add(newState ? 'border-green-500' : 'border-red-500', newState ? 'bg-green-900' : 'bg-red-900');
            target.classList.remove(newState ? 'bg-green-600' : 'bg-red-600', newState ? 'hover:bg-green-700' : 'hover:bg-red-700');
            target.classList.add(newState ? 'bg-red-600' : 'bg-green-600', newState ? 'hover:bg-red-700' : 'hover:bg-green-700');

        } catch (error) {
            console.error("Errore nell'aggiornamento dello stato Draft:", error);
            displayMessage(`Errore durante l'aggiornamento: ${error.message}`, 'error', 'draft-toggle-message');
        } finally {
            target.disabled = false;
        }
    },

    /**
     * Gestisce la creazione e validazione del nuovo calciatore.
     * @param {Object} context - Contesto con riferimenti
     */
    async handleCreatePlayer(context) {
        const { db, firestoreTools, paths } = context;
        const { displayMessage } = window.DraftUtils;

        displayMessage('', 'success', 'player-creation-message');

        // 1. Raccogli i valori
        const name = document.getElementById('player-name').value.trim();
        const role = document.getElementById('player-role').value;
        const type = document.getElementById('player-type').value;
        const age = parseInt(document.getElementById('player-age').value);
        const levelMin = parseInt(document.getElementById('player-level-min').value);
        const levelMax = parseInt(document.getElementById('player-level-max').value);
        const cost = parseInt(document.getElementById('player-cost').value);

        // Validazione
        if (!name || !role || !type || isNaN(age) || isNaN(levelMin) || isNaN(levelMax) || isNaN(cost) ||
            age < 15 || age > 50 || levelMin < 1 || levelMin > 20 || levelMax < 1 || levelMax > 20 ||
            levelMin > levelMax || cost < 1) {
            displayMessage("Errore: controlla che tutti i campi (incluso Tipologia) siano compilati e validi (Età 15-50, Livello 1-20, LivMin <= LivMax, Costo >= 1).", 'error', 'player-creation-message');
            return;
        }

        // 2. Crea l'oggetto calciatore
        const newPlayer = {
            name,
            role,
            type,
            age,
            levelRange: [levelMin, levelMax],
            cost,
            isDrafted: false,
            teamId: null,
            creationDate: new Date().toISOString()
        };

        // 3. Salvataggio su Firestore
        try {
            const { collection, addDoc } = firestoreTools;
            const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);
            await addDoc(playersCollectionRef, newPlayer);

            displayMessage(`Calciatore ${name} aggiunto al Draft con successo!`, 'success', 'player-creation-message');

            // Aggiorna la lista dopo l'aggiunta
            this.loadDraftPlayers(context);

        } catch (error) {
            console.error("Errore nel salvataggio del calciatore:", error);
            displayMessage(`Errore di salvataggio: ${error.message}`, 'error', 'player-creation-message');
        }

        // Pulisci i campi
        document.getElementById('player-name').value = '';
        document.getElementById('player-role').value = '';
        document.getElementById('player-type').value = '';
        document.getElementById('player-age').value = '';
        document.getElementById('player-level-min').value = '';
        document.getElementById('player-level-max').value = '';
        document.getElementById('player-cost').value = '';
    },

    /**
     * Genera e riempie i campi del modulo con dati casuali (tranne il Nome).
     */
    handleRandomPlayer() {
        const { displayMessage, getRandomInt } = window.DraftUtils;
        const { ROLES, TYPES } = window.DraftConstants;

        displayMessage("", 'success', 'player-creation-message');

        // 1. Genera valori casuali
        const randomRole = ROLES[getRandomInt(0, ROLES.length - 1)];
        const randomType = TYPES[getRandomInt(0, TYPES.length - 1)];
        const randomAge = getRandomInt(18, 35);

        const randomLevelMax = getRandomInt(10, 20);
        const randomLevelMin = getRandomInt(1, randomLevelMax);

        const randomCost = getRandomInt(20, 150);

        // 2. Inserisci i valori nei campi
        document.getElementById('player-role').value = randomRole;
        document.getElementById('player-type').value = randomType;
        document.getElementById('player-age').value = randomAge;
        document.getElementById('player-level-min').value = randomLevelMin;
        document.getElementById('player-level-max').value = randomLevelMax;
        document.getElementById('player-cost').value = randomCost;

        displayMessage("Campi riempiti con valori casuali. Inserisci il Nome e aggiungi al Draft.", 'info', 'player-creation-message');
    }
};

console.log("Modulo Draft-Admin-Players caricato.");
