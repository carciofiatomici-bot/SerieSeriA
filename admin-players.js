//
// ====================================================================
// MODULO ADMIN-PLAYERS.JS V3.0 - UI Separata Positive/Negative
// ====================================================================
//

window.AdminPlayers = {
    
    // MAPPA ARRAY per compatibilità con handleRandomPlayer
    ROLE_ABILITIES_MAP: {
        'P': ['Pugno di ferro', 'Uscita Kamikaze', 'Teletrasporto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Parata con i piedi', 'Lancio lungo', 'Mani di burro', 'Respinta Timida', 'Fuori dai pali'],
        'D': ['Muro', 'Contrasto Durissimo', 'Antifurto', 'Guardia', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Tiro dalla distanza', 'Deviazione', 'Falloso', 'Insicuro', 'Fuori Posizione'],
        'C': ['Regista', 'Motore', 'Tocco Di Velluto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Tiro dalla distanza', 'Cross', 'Mago del pallone', 'Impreciso', 'Ingabbiato', 'Fuori Posizione'],
        'A': ['Bomber', 'Doppio Scatto', 'Pivot', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Rientro Rapido', 'Tiro Fulmineo', 'Piedi a banana', 'Eccesso di sicurezza', 'Fuori Posizione'],
        ALL_ABILITIES: [
            'Pugno di ferro', 'Uscita Kamikaze', 'Teletrasporto', 'Parata con i piedi', 'Lancio lungo', 'Mani di burro', 'Respinta Timida', 'Fuori dai pali',
            'Muro', 'Contrasto Durissimo', 'Antifurto', 'Guardia', 'Tiro dalla distanza', 'Deviazione', 'Falloso', 'Insicuro', 'Fuori Posizione',
            'Regista', 'Motore', 'Tocco Di Velluto', 'Cross', 'Mago del pallone', 'Impreciso', 'Ingabbiato',
            'Bomber', 'Doppio Scatto', 'Pivot', 'Rientro Rapido', 'Tiro Fulmineo', 'Piedi a banana', 'Eccesso di sicurezza',
            'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Icona'
        ]
    },

    // MAPPA SEPARATA per UI
    ROLE_ABILITIES_SEPARATED: {
        'P': {
            positive: ['Pugno di ferro', 'Uscita Kamikaze', 'Teletrasporto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Parata con i piedi', 'Lancio lungo'],
            negative: ['Mani di burro', 'Respinta Timida', 'Fuori dai pali']
        },
        'D': {
            positive: ['Muro', 'Contrasto Durissimo', 'Antifurto', 'Guardia', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Tiro dalla distanza', 'Deviazione'],
            negative: ['Falloso', 'Insicuro', 'Fuori Posizione']
        },
        'C': {
            positive: ['Regista', 'Motore', 'Tocco Di Velluto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Tiro dalla distanza', 'Cross', 'Mago del pallone'],
            negative: ['Impreciso', 'Ingabbiato', 'Fuori Posizione']
        },
        'A': {
            positive: ['Bomber', 'Doppio Scatto', 'Pivot', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Rientro Rapido', 'Tiro Fulmineo'],
            negative: ['Piedi a banana', 'Eccesso di sicurezza', 'Fuori Posizione']
        }
    },

    calculateCost(levelMax, abilitiesCount = 0) {
        return 100 + (10 * levelMax) + (50 * abilitiesCount);
    },

    updateCostDisplay() {
        const levelMaxInput = document.getElementById('player-level-max');
        const costDisplayInput = document.getElementById('player-cost-display');
        if (!levelMaxInput || !costDisplayInput) return;
        const levelMaxVal = parseInt(levelMaxInput.value) || 0;
        const abilitiesCount = document.querySelectorAll('#abilities-checklist input[name="player-ability"]:checked').length;
        const newCost = this.calculateCost(levelMaxVal, abilitiesCount);
        costDisplayInput.value = `Costo: ${newCost} CS`;
        costDisplayInput.dataset.calculatedCost = newCost;
    },
    
    updateAbilitiesChecklist() {
        const roleSelect = document.getElementById('player-role');
        const checklistContainer = document.getElementById('abilities-checklist');
        const selectedRole = roleSelect.value;

        if (!checklistContainer) return;

        if (!selectedRole || !this.ROLE_ABILITIES_SEPARATED[selectedRole]) {
            checklistContainer.innerHTML = '<p class="text-yellow-400 col-span-4">Seleziona un ruolo per visualizzare le abilità disponibili.</p>';
            return;
        }

        const roleAbilities = this.ROLE_ABILITIES_SEPARATED[selectedRole];
        
        let checklistHtml = '<div class="space-y-4">';
        
        checklistHtml += '<div class="bg-gray-900 p-3 rounded-lg border border-green-500">';
        checklistHtml += '<h4 class="text-green-400 font-bold mb-2">✅ Abilità Positive (Max 3)</h4>';
        checklistHtml += '<div class="grid grid-cols-2 gap-2">';
        
        roleAbilities.positive.forEach(ability => {
            checklistHtml += `
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="ability-${ability.replace(/\s/g, '-')}" 
                           name="player-ability" value="${ability}" 
                           class="form-checkbox h-4 w-4 text-green-500 bg-gray-600 border-gray-500 rounded focus:ring-green-400 ability-positive">
                    <label for="ability-${ability.replace(/\s/g, '-')}" class="text-gray-300 text-sm">
                        ${ability}
                    </label>
                </div>
            `;
        });
        
        checklistHtml += '</div></div>';
        
        checklistHtml += '<div class="bg-gray-900 p-3 rounded-lg border border-red-500 mt-3">';
        checklistHtml += '<h4 class="text-red-400 font-bold mb-2">❌ Abilità Negative (Max 1)</h4>';
        checklistHtml += '<p class="text-xs text-yellow-300 mb-2">⚠️ Attenzione: effetti dannosi!</p>';
        checklistHtml += '<div class="grid grid-cols-2 gap-2">';
        
        roleAbilities.negative.forEach(ability => {
            checklistHtml += `
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="ability-${ability.replace(/\s/g, '-')}" 
                           name="player-ability" value="${ability}" 
                           class="form-checkbox h-4 w-4 text-red-500 bg-gray-600 border-gray-500 rounded focus:ring-red-400 ability-negative">
                    <label for="ability-${ability.replace(/\s/g, '-')}" class="text-gray-300 text-sm">
                        ${ability}
                    </label>
                </div>
            `;
        });
        
        checklistHtml += '</div></div></div>';

        checklistContainer.innerHTML = checklistHtml;
        
        checklistContainer.removeEventListener('change', this.handleAbilitiesLimit);
        checklistContainer.addEventListener('change', this.handleAbilitiesLimit.bind(this));
    
        this.updateCostDisplay();
    },

    handleAbilitiesLimit(event) {
        const positiveChecked = document.querySelectorAll('#abilities-checklist .ability-positive:checked');
        const negativeChecked = document.querySelectorAll('#abilities-checklist .ability-negative:checked');
        
        if (event.target.classList.contains('ability-positive') && positiveChecked.length > 3) {
            event.target.checked = false;
            const msgElement = document.getElementById('player-creation-message');
            if (msgElement) {
                msgElement.textContent = '❌ Massimo 3 abilità positive!';
                msgElement.classList.add('text-red-400');
                setTimeout(() => { msgElement.textContent = ''; }, 2000);
            }
            return;
        }
        
        if (event.target.classList.contains('ability-negative') && negativeChecked.length > 1) {
            event.target.checked = false;
            const msgElement = document.getElementById('player-creation-message');
            if (msgElement) {
                msgElement.textContent = '❌ Massimo 1 abilità negativa!';
                msgElement.classList.add('text-red-400');
                setTimeout(() => { msgElement.textContent = ''; }, 2000);
            }
            return;
        }
        
        this.updateCostDisplay();
    },
    handleRandomPlayer() {
        const getRandomInt = window.getRandomInt;
        const getRandomType = window.getRandomType || (() => 'Potenza');
        
        const msgElement = document.getElementById('player-creation-message');
        if (msgElement) {
            msgElement.textContent = '';
        }
        
        const roles = ['P', 'D', 'C', 'A'];
        const types = ['Potenza', 'Tecnica', 'Velocita'];
        
        const randomRole = roles[getRandomInt(0, roles.length - 1)];
        const randomType = types[getRandomInt(0, types.length - 1)];
        const randomAge = getRandomInt(18, 35);
        
        const randomLevelMax = getRandomInt(10, 20);
const randomLevelMin = getRandomInt(1, randomLevelMax);
const availableAbilities = this.ROLE_ABILITIES_MAP[randomRole];
const numAbilities = getRandomInt(0, 3);
const randomAbilities = [];
const calculatedCost = this.calculateCost(randomLevelMax, numAbilities);
        const shuffledAbilities = availableAbilities.sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < Math.min(numAbilities, shuffledAbilities.length); i++) {
             randomAbilities.push(shuffledAbilities[i]);
        }

        document.getElementById('player-role').value = randomRole;
        document.getElementById('player-type').value = randomType;
        document.getElementById('player-age').value = randomAge;
        document.getElementById('player-level-min').value = randomLevelMin;
        document.getElementById('player-level-max').value = randomLevelMax;
        
        const costDisplayInput = document.getElementById('player-cost-display');
        if (costDisplayInput) {
            costDisplayInput.value = `Costo: ${calculatedCost} CS`;
            costDisplayInput.dataset.calculatedCost = calculatedCost;
        }
        
        this.updateAbilitiesChecklist();
        
        randomAbilities.forEach(ability => {
            const checkbox = document.getElementById(`ability-${ability.replace(/\s/g, '-')}`);
            if (checkbox) checkbox.checked = true;
        });

        if (msgElement) {
            msgElement.textContent = "Campi riempiti con valori casuali. Inserisci il Nome e aggiungi.";
            msgElement.classList.remove('text-red-400');
            msgElement.classList.add('text-yellow-400');
        }
    },

    /**
     * Crea un nuovo giocatore
     */
    async handleCreatePlayer(DRAFT_PLAYERS_COLLECTION_PATH, MARKET_PLAYERS_COLLECTION_PATH, reloadCallbacks) {
        const msgId = 'player-creation-message';
        const msgElement = document.getElementById(msgId);
        if (msgElement) msgElement.textContent = '';
        
        const targetCollection = document.getElementById('target-collection').value;
        const name = document.getElementById('player-name').value.trim();
        const role = document.getElementById('player-role').value;
        const type = document.getElementById('player-type').value;
        const age = parseInt(document.getElementById('player-age').value);
        const levelMin = parseInt(document.getElementById('player-level-min').value);
        const levelMax = parseInt(document.getElementById('player-level-max').value);
        
        const costDisplayInput = document.getElementById('player-cost-display');
        const selectedAbilities = Array.from(document.querySelectorAll('#abilities-checklist input[name="player-ability"]:checked')).map(cb => cb.value);
        const abilitiesCount = selectedAbilities.length;
        const cost = this.calculateCost(levelMax, abilitiesCount);
        const allowedAbilities = this.ROLE_ABILITIES_MAP[role] || [];

        if (!name || !role || !type || isNaN(age) || isNaN(levelMin) || isNaN(levelMax) || isNaN(cost) || 
            age < 15 || age > 50 || levelMin < 1 || levelMin > 20 || levelMax < 1 || levelMax > 20 || 
            levelMin > levelMax || cost < 1) {
             if (msgElement) {
                 msgElement.textContent = "Errore: controlla che tutti i campi base siano compilati e validi.";
                 msgElement.classList.add('text-red-400');
             }
             return;
        }

        const invalidAbilities = selectedAbilities.filter(ability => !allowedAbilities.includes(ability));
        if (invalidAbilities.length > 0) {
            if (msgElement) {
                msgElement.textContent = `Errore: L'abilitÃƒÂ /le abilitÃƒÂ  ${invalidAbilities.join(', ')} non Ã¨/sono valide per il ruolo di ${role}.`;
                msgElement.classList.add('text-red-400');
            }
            return;
        }
        
        if (selectedAbilities.length > 3) {
             if (msgElement) {
                 msgElement.textContent = 'Errore: non puoi selezionare piÃ¹ di 3 abilitÃƒÂ .';
                 msgElement.classList.add('text-red-400');
             }
             return;
        }

        const newPlayer = {
            name, role, age, levelRange: [levelMin, levelMax], cost, type,
            abilities: selectedAbilities,
            isDrafted: false, teamId: null, creationDate: new Date().toISOString()
        };
        
        try {
            const { collection, addDoc } = window.firestoreTools;
            const db = window.db;
            const collectionPath = targetCollection === 'draft' ? DRAFT_PLAYERS_COLLECTION_PATH : MARKET_PLAYERS_COLLECTION_PATH;
            const playersCollectionRef = collection(db, collectionPath);
            await addDoc(playersCollectionRef, newPlayer);
            
            if (msgElement) {
                msgElement.textContent = `Calciatore ${name} aggiunto al ${targetCollection.toUpperCase()} con successo!`;
                msgElement.classList.remove('text-red-400');
                msgElement.classList.add('text-green-500');
            }
            
            if (targetCollection === 'draft' && reloadCallbacks.draft) {
                 reloadCallbacks.draft();
            } else if (reloadCallbacks.market) {
                 reloadCallbacks.market();
            }

        } catch (error) {
            console.error("Errore nel salvataggio del calciatore:", error);
            if (msgElement) {
                msgElement.textContent = `Errore di salvataggio: ${error.message}`;
                msgElement.classList.add('text-red-400');
            }
        }

        document.getElementById('player-name').value = '';
        document.getElementById('player-role').value = ''; 
        this.updateAbilitiesChecklist();
    },

    /**
     * Carica i giocatori disponibili del Draft
     */
    async loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH) {
        // Uso le funzioni esposte globalmente
        // FIX: Destrutturazione difensiva e controllo esplicito delle funzioni Firebase.
        const firestoreTools = window.firestoreTools || {};
        const { collection, getDocs, query, where } = firestoreTools; 
        const db = window.db;
        const playersListContainer = document.getElementById('draft-players-list');
        if (!playersListContainer) return;

        playersListContainer.innerHTML = '<p class="text-center text-yellow-400">Caricamento Draft...</p>';

        try {
            // VERIFICA CRITICA: Controlla se le funzioni essenziali esistono
            if (typeof query !== 'function' || typeof where !== 'function') {
                 // Questo errore forzerÃƒÂ  l'esecuzione del fallback.
                 throw new Error("Funzioni Firestore 'query' o 'where' non caricate correttamente.");
            }
            
            const playersCollectionRef = collection(db, DRAFT_PLAYERS_COLLECTION_PATH);
            
            // FILTRARE: Mostra SOLO i giocatori NON acquistati (isDrafted: false)
            // Uso query(collectionRef, where)
            const q = query(playersCollectionRef, where('isDrafted', '==', false));
            
            const querySnapshot = await getDocs(q);
            
            const playersHtml = querySnapshot.docs.map(doc => {
                const player = doc.data();
                const playerId = doc.id;
                // Questi giocatori dovrebbero essere sempre disponibili per la visualizzazione Admin
                const status = `<span class="text-green-400">Disponibile</span>`; 
                const playerType = player.type || 'N/A';
                const abilitiesList = player.abilities && player.abilities.length > 0 ? player.abilities.join(', ') : 'Nessuna';
                
                return `
                    <div data-player-id="${playerId}" class="player-item flex justify-between items-center p-2 bg-gray-600 rounded-lg text-white">
                        <div>
                            <p class="font-semibold">${player.name} (${player.role})</p>
                            <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | Tipo: ${playerType} | Costo: ${player.cost} CS</p>
                            <p class="text-xs text-yellow-300">AbilitÃƒÂ : ${abilitiesList}</p>
                            <p class="text-xs text-gray-500">${status}</p>
                        </div>
                        <button data-player-id="${playerId}" data-action="delete"
                                class="bg-red-600 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-700 transition duration-150">
                            Elimina
                        </button>
                    </div>
                `;
            }).join('');
            
            playersListContainer.innerHTML = playersHtml || '<p class="text-center text-gray-400">Nessun giocatore Draft disponibile.</p>';

        } catch (error) {
            console.error("Errore nel caricamento Draft (tentativo con where fallito):", error);
            // Se la query con where fallisce (indice mancante, o 'where is not a function' per fallback)
            this.loadDraftPlayersFallback(DRAFT_PLAYERS_COLLECTION_PATH, playersListContainer);
        }
    },
    
    /**
     * Caricamento fallback/completo del Draft (inclusi i venduti)
     */
    async loadDraftPlayersFallback(DRAFT_PLAYERS_COLLECTION_PATH, playersListContainer) {
         const { collection, getDocs } = window.firestoreTools;
         const db = window.db;
         const playersCollectionRef = collection(db, DRAFT_PLAYERS_COLLECTION_PATH);
         const querySnapshot = await getDocs(playersCollectionRef);
         
         const playersHtml = querySnapshot.docs.map(doc => {
             const player = doc.data();
             const playerId = doc.id;
             const status = player.isDrafted ? `<span class="text-red-400">Venduto a ${player.teamId}</span>` : `<span class="text-green-400">Disponibile</span>`; 
             const playerType = player.type || 'N/A';
             const abilitiesList = player.abilities && player.abilities.length > 0 ? player.abilities.join(', ') : 'Nessuna';
             
             return `
                 <div data-player-id="${playerId}" class="player-item flex justify-between items-center p-2 ${player.isDrafted ? 'bg-red-900/50' : 'bg-gray-600'} rounded-lg text-white">
                     <div>
                         <p class="font-semibold">${player.name} (${player.role})</p>
                         <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | Tipo: ${playerType} | Costo: ${player.cost} CS</p>
                         <p class="text-xs text-yellow-300">AbilitÃƒÂ : ${abilitiesList}</p>
                         <p class="text-xs text-gray-500">${status} (FALLBACK: Indice mancante)</p>
                     </div>
                     <button data-player-id="${playerId}" data-action="delete"
                             class="bg-red-600 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-700 transition duration-150">
                         Elimina
                     </button>
                 </div>
             `;
         }).join('');
         
         playersListContainer.innerHTML = playersHtml || '<p class="text-center text-red-400">Errore: Indice mancante o collezione vuota. Controlla la console.</p>';
    },


    /**
     * Carica i giocatori disponibili del Mercato
     */
    async loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH) {
        // Uso le funzioni esposte globalmente
        // FIX: Destrutturazione difensiva e controllo esplicito delle funzioni Firebase.
        const firestoreTools = window.firestoreTools || {};
        const { collection, getDocs, query, where } = firestoreTools; 
        const db = window.db;
        const playersListContainer = document.getElementById('market-players-list');
        if (!playersListContainer) return;

        playersListContainer.innerHTML = '<p class="text-center text-blue-400">Caricamento Mercato...</p>';

        try {
            // VERIFICA CRITICA: Controlla se le funzioni essenziali esistono
            if (typeof query !== 'function' || typeof where !== 'function') {
                 // Questo errore forzerÃƒÂ  l'esecuzione del fallback.
                 throw new Error("Funzioni Firestore 'query' o 'where' non caricate correttamente.");
            }
            
            const playersCollectionRef = collection(db, MARKET_PLAYERS_COLLECTION_PATH);
            
            // FILTRARE: Mostra SOLO i giocatori NON acquistati (isDrafted: false)
            // Uso query(collectionRef, where)
            const q = query(playersCollectionRef, where('isDrafted', '==', false));
            
            const querySnapshot = await getDocs(q);

            const playersHtml = querySnapshot.docs.map(doc => {
                const player = doc.data();
                const playerId = doc.id;
                const status = `<span class="text-green-400">Disponibile</span>`; 
                const playerType = player.type || 'N/A';
                const abilitiesList = player.abilities && player.abilities.length > 0 ? player.abilities.join(', ') : 'Nessuna';
                
                return `
                    <div data-player-id="${playerId}" class="player-item flex justify-between items-center p-2 bg-gray-600 rounded-lg text-white">
                        <div>
                            <p class="font-semibold">${player.name} (${player.role})</p>
                            <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | Tipo: ${playerType} | Costo: ${player.cost} CS</p>
                            <p class="text-xs text-yellow-300">AbilitÃƒÂ : ${abilitiesList}</p>
                            <p class="text-xs text-gray-500">${status}</p>
                        </div>
                        <button data-player-id="${playerId}" data-action="delete"
                                class="bg-red-600 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-700 transition duration-150">
                            Elimina
                        </button>
                    </div>
                `;
            }).join('');
            
            playersListContainer.innerHTML = playersHtml || '<p class="text-center text-gray-400">Nessun giocatore Mercato disponibile.</p>';

        } catch (error) {
            console.error("Errore nel caricamento Mercato (tentativo con where fallito):", error);
            // Se la query con where fallisce, mostra tutti come fallback
            this.loadMarketPlayersFallback(MARKET_PLAYERS_COLLECTION_PATH, playersListContainer);
        }
    },

    /**
     * Caricamento fallback/completo del Mercato (inclusi i venduti)
     */
    async loadMarketPlayersFallback(MARKET_PLAYERS_COLLECTION_PATH, playersListContainer) {
         const { collection, getDocs } = window.firestoreTools;
         const db = window.db;
         const playersCollectionRef = collection(db, MARKET_PLAYERS_COLLECTION_PATH);
         const querySnapshot = await getDocs(playersCollectionRef);
         
         const playersHtml = querySnapshot.docs.map(doc => {
             const player = doc.data();
             const playerId = doc.id;
             const status = player.isDrafted ? `<span class="text-red-400">Venduto a ${player.teamId}</span>` : `<span class="text-green-400">Disponibile</span>`; 
             const playerType = player.type || 'N/A';
             const abilitiesList = player.abilities && player.abilities.length > 0 ? player.abilities.join(', ') : 'Nessuna';
             
             return `
                 <div data-player-id="${playerId}" class="player-item flex justify-between items-center p-2 ${player.isDrafted ? 'bg-red-900/50' : 'bg-gray-600'} rounded-lg text-white">
                     <div>
                         <p class="font-semibold">${player.name} (${player.role})</p>
                         <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | Tipo: ${playerType} | Costo: ${player.cost} CS</p>
                         <p class="text-xs text-yellow-300">AbilitÃƒÂ : ${abilitiesList}</p>
                         <p class="text-xs text-gray-500">${status} (FALLBACK: Indice mancante)</p>
                     </div>
                     <button data-player-id="${playerId}" data-action="delete"
                             class="bg-red-600 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-700 transition duration-150">
                         Elimina
                     </button>
                 </div>
             `;
         }).join('');
         
         playersListContainer.innerHTML = playersHtml || '<p class="text-center text-red-400">Errore: Indice mancante o collezione vuota. Controlla la console.</p>';
    }
};
// Auto init listeners for live cost display
setTimeout(() => { try { window.AdminPlayers.initCostListeners(); } catch(e){} }, 0);
