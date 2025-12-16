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

                // Trova la bandiera per la nazionalità
                const nationality = window.DraftConstants.NATIONALITIES.find(n => n.code === player.nationality);
                const flag = nationality ? nationality.flag : '';

                // Formatta le abilità
                const abilities = player.abilities || [];
                const abilitiesHtml = abilities.length > 0
                    ? `<span class="text-purple-400 text-xs ml-2">[${abilities.join(', ')}]</span>`
                    : '';

                playersHtml += `
                    <div class="player-item flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-yellow-500 transition duration-150">
                        <!-- Dati Giocatore -->
                        <div class="w-full sm:w-auto mb-2 sm:mb-0">
                            <p class="text-lg font-bold text-white">${flag} ${player.name} <span class="text-yellow-400">(${player.role} - ${playerType})</span>${abilitiesHtml}</p>
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

            // Re-renderizza l'intero pannello per mostrare/nascondere la sezione Draft a Turni
            await window.DraftAdminUI.render(context);

        } catch (error) {
            console.error("Errore nell'aggiornamento dello stato Draft:", error);
            displayMessage(`Errore durante l'aggiornamento: ${error.message}`, 'error', 'draft-toggle-message');
            target.disabled = false;
            target.textContent = currentlyOpen ? 'CHIUDI Draft' : 'APRI Draft';
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
        const nationality = document.getElementById('player-nationality').value;
        const role = document.getElementById('player-role').value;
        const type = document.getElementById('player-type').value;
        const age = parseInt(document.getElementById('player-age').value);
        const levelMin = parseInt(document.getElementById('player-level-min').value);
        const levelMax = parseInt(document.getElementById('player-level-max').value);
        const cost = parseInt(document.getElementById('player-cost').value);

        // Raccogli le abilità selezionate
        const abilities = window.DraftAdminUI.getSelectedAbilities();

        // Validazione
        if (!name || !role || !type || !nationality || isNaN(age) || isNaN(levelMin) || isNaN(levelMax) || isNaN(cost) ||
            age < 15 || age > 50 || levelMin < 1 || levelMin > 20 || levelMax < 1 || levelMax > 20 ||
            levelMin > levelMax || cost < 1) {
            displayMessage("Errore: controlla che tutti i campi (incluso Nazionalità e Tipologia) siano compilati e validi (Età 15-50, Livello 1-20, LivMin <= LivMax, Costo >= 1).", 'error', 'player-creation-message');
            return;
        }

        // 2. Crea l'oggetto calciatore
        const newPlayer = {
            name,
            nationality,
            role,
            type,
            age,
            levelRange: [levelMin, levelMax],
            cost,
            abilities: abilities,
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
        document.getElementById('player-nationality').value = '';
        document.getElementById('player-role').value = '';
        document.getElementById('player-type').value = '';
        document.getElementById('player-age').value = '';
        document.getElementById('player-level-min').value = '';
        document.getElementById('player-level-max').value = '';
        document.getElementById('player-cost').value = '';

        // Pulisci le abilità
        window.DraftAdminUI.updateAbilitiesForRole('');
    },

    /**
     * Genera e riempie i campi del modulo con dati casuali (tranne il Nome).
     */
    handleRandomPlayer() {
        const { displayMessage, getRandomInt } = window.DraftUtils;
        const { ROLES, TYPES, NATIONALITIES } = window.DraftConstants;

        displayMessage("", 'success', 'player-creation-message');

        // 1. Genera valori casuali
        const randomRole = ROLES[getRandomInt(0, ROLES.length - 1)];
        const randomType = TYPES[getRandomInt(0, TYPES.length - 1)];
        const randomNationality = NATIONALITIES[getRandomInt(0, NATIONALITIES.length - 1)];
        const randomAge = getRandomInt(18, 35);

        const randomLevelMax = getRandomInt(10, 20);
        const randomLevelMin = getRandomInt(1, randomLevelMax);

        const randomCost = getRandomInt(20, 150);

        // 2. Inserisci i valori nei campi
        document.getElementById('player-nationality').value = randomNationality.code;
        document.getElementById('player-role').value = randomRole;
        document.getElementById('player-type').value = randomType;
        document.getElementById('player-age').value = randomAge;
        document.getElementById('player-level-min').value = randomLevelMin;
        document.getElementById('player-level-max').value = randomLevelMax;
        document.getElementById('player-cost').value = randomCost;

        // 3. Genera abilità casuali per il ruolo selezionato
        window.DraftAdminUI.updateAbilitiesForRole(randomRole);

        // Aspetta che le checkbox siano renderizzate, poi seleziona casualmente
        setTimeout(() => {
            this.selectRandomAbilities(randomRole);
        }, 100);

        displayMessage("Campi riempiti con valori casuali. Inserisci il Nome e aggiungi al Draft.", 'info', 'player-creation-message');
    },

    /**
     * Seleziona abilità casuali per il ruolo dato
     * NUOVA LOGICA: max 1 per rarità (1 Comune, 1 Rara, 1 Epica, 1 Leggendaria)
     * + abilità negative automatiche: Epica +1, Leggendaria +2
     * @param {string} role - Il ruolo del giocatore
     */
    selectRandomAbilities(role) {
        const { getRandomInt } = window.DraftUtils;

        const roleAbilities = window.DraftConstants.ROLE_ABILITIES_MAP?.[role];
        if (!roleAbilities) return;

        const positiveAbilities = roleAbilities.positive || [];
        const negativeAbilities = roleAbilities.negative || [];

        // Raggruppa abilità positive per rarità
        const abilitiesByRarity = {
            'Comune': [],
            'Rara': [],
            'Epica': [],
            'Leggendaria': []
        };

        // Usa AbilitiesEncyclopedia per ottenere la rarità
        for (const abilityName of positiveAbilities) {
            const ability = window.AbilitiesEncyclopedia?.getAbility(abilityName);
            if (ability && abilitiesByRarity[ability.rarity]) {
                abilitiesByRarity[ability.rarity].push(abilityName);
            }
        }

        // Seleziona casualmente: 0 o 1 abilità per ogni rarità
        // Probabilità differenziate: più rare = meno probabili
        const rarityProbabilities = {
            'Comune': 0.6,      // 60%
            'Rara': 0.5,        // 50%
            'Epica': 0.4,       // 40%
            'Leggendaria': 0.3  // 30%
        };

        const selectedPositive = [];
        let autoNegativeCount = 0;

        for (const rarity of ['Comune', 'Rara', 'Epica', 'Leggendaria']) {
            const pool = abilitiesByRarity[rarity];
            const probability = rarityProbabilities[rarity] || 0.5;
            if (pool.length > 0 && Math.random() < probability) {
                const shuffled = [...pool].sort(() => Math.random() - 0.5);
                selectedPositive.push(shuffled[0]);

                // Conta abilità negative automatiche
                if (rarity === 'Epica') autoNegativeCount += 1;
                if (rarity === 'Leggendaria') autoNegativeCount += 2;
            }
        }

        // Seleziona abilità negative automatiche random
        const shuffledNegative = [...negativeAbilities].sort(() => Math.random() - 0.5);
        const selectedNegative = shuffledNegative.slice(0, Math.min(autoNegativeCount, shuffledNegative.length));

        // Debug log
        console.log(`[RandomAbilities] Ruolo: ${role}`);
        console.log(`[RandomAbilities] Selezionate ${selectedPositive.length} positive, ${autoNegativeCount} negative auto`);
        console.log(`[RandomAbilities] Positive: ${selectedPositive.join(', ') || 'nessuna'}`);
        console.log(`[RandomAbilities] Negative da aggiungere: ${selectedNegative.join(', ') || 'nessuna'}`);

        // Deseleziona tutte le checkbox
        document.querySelectorAll('.ability-positive-check').forEach(cb => {
            cb.checked = false;
            cb.disabled = false;
        });
        document.querySelectorAll('.ability-negative-check').forEach(cb => {
            cb.checked = false;
            cb.disabled = false;
        });

        // Seleziona le checkbox corrispondenti
        selectedPositive.forEach(ability => {
            const checkbox = document.querySelector(`.ability-positive-check[value="${ability}"]`);
            if (checkbox) checkbox.checked = true;
        });

        selectedNegative.forEach(ability => {
            const checkbox = document.querySelector(`.ability-negative-check[value="${ability}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Valida la selezione per disabilitare eventuali eccessi
        window.DraftAdminUI.validateAbilitySelection();
    }
};

console.log("Modulo Draft-Admin-Players caricato.");
