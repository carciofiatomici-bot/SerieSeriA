//
// ====================================================================
// MODULO ADMIN-PLAYERS.JS V3.0 - UI Separata Positive/Negative
// ====================================================================
//

window.AdminPlayers = {

    // Usa la mappa da DraftConstants (solo abilita implementate nell'enciclopedia)
    get ROLE_ABILITIES_SEPARATED() {
        return window.DraftConstants?.ROLE_ABILITIES_MAP || {
            'P': {
                positive: ['Pugno di ferro', 'Uscita Kamikaze', 'Teletrasporto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Parata con i piedi', 'Lancio lungo', 'Presa Sicura', 'Muro Psicologico', 'Miracolo', 'Freddezza'],
                negative: ['Mani di burro', 'Respinta Timida', 'Fuori dai pali', 'Lento a carburare', 'Soggetto a infortuni']
            },
            'D': {
                positive: ['Muro', 'Contrasto Durissimo', 'Antifurto', 'Guardia', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Deviazione', 'Svaligiatore', 'Spazzata', 'Adattabile', 'Salvataggio sulla Linea', 'Freddezza'],
                negative: ['Falloso', 'Insicuro', 'Fuori Posizione', 'Lento a carburare', 'Soggetto a infortuni']
            },
            'C': {
                positive: ['Tuttocampista', 'Regista', 'Motore', 'Tocco Di Velluto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Lancio lungo', 'Cross', 'Mago del pallone', 'Passaggio Corto', 'Visione di Gioco', 'Freddezza'],
                negative: ['Egoista', 'Impreciso', 'Ingabbiato', 'Lento a carburare', 'Soggetto a infortuni']
            },
            'A': {
                positive: ['Opportunista', 'Bomber', 'Doppio Scatto', 'Pivot', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Rientro Rapido', 'Tiro Fulmineo', 'Tiro a Giro', 'Immarcabile', 'Freddezza'],
                negative: ['Piedi a banana', 'Eccesso di sicurezza', 'Egoista', 'Lento a carburare', 'Soggetto a infortuni']
            }
        };
    },

    // Getter per ROLE_ABILITIES_MAP (compatibilita)
    get ROLE_ABILITIES_MAP() {
        const separated = this.ROLE_ABILITIES_SEPARATED;
        const map = {};
        for (const role in separated) {
            map[role] = [...(separated[role].positive || []), ...(separated[role].negative || [])];
        }
        return map;
    },

    calculateCost(level, abilitiesCount = 0) {
        return 100 + (10 * level) + (50 * abilitiesCount);
    },

    /**
     * Calcola il range di costo basato su livello min e max
     */
    calculateCostRange(levelMin, levelMax, abilitiesCount = 0) {
        const costMin = this.calculateCost(levelMin, abilitiesCount);
        const costMax = this.calculateCost(levelMax, abilitiesCount);
        return { costMin, costMax };
    },

    /**
     * Ottiene la bandiera emoji dalla nazionalita
     * @param {string} nationalityCode - Codice nazionalita (es. 'IT')
     * @returns {string} - Bandiera emoji o stringa vuota
     */
    getFlag(nationalityCode) {
        if (!nationalityCode) return '';
        const nationalityData = window.DraftConstants?.NATIONALITIES?.find(n => n.code === nationalityCode);
        return nationalityData ? nationalityData.flag : '';
    },

    /**
     * Formatta il costo per la visualizzazione (range o singolo valore)
     * @param {object} player - Oggetto giocatore
     * @returns {string} - Stringa formattata del costo
     */
    formatCost(player) {
        // Se ha costRange, mostra il range
        if (player.costRange && Array.isArray(player.costRange) && player.costRange.length === 2) {
            const [costMin, costMax] = player.costRange;
            if (costMin === costMax) {
                return `${costMin} CS`;
            }
            return `${costMin}-${costMax} CS`;
        }
        // Fallback al costo singolo
        return `${player.cost || '?'} CS`;
    },

    updateCostDisplay() {
        const levelMinInput = document.getElementById('player-level-min');
        const levelMaxInput = document.getElementById('player-level-max');
        const costDisplayInput = document.getElementById('player-cost-display');
        if (!levelMinInput || !levelMaxInput || !costDisplayInput) return;

        const levelMinVal = parseInt(levelMinInput.value) || 1;
        const levelMaxVal = parseInt(levelMaxInput.value) || 1;
        const abilitiesCount = document.querySelectorAll('#abilities-checklist input[name="player-ability"]:checked').length;

        const { costMin, costMax } = this.calculateCostRange(levelMinVal, levelMaxVal, abilitiesCount);

        if (levelMinVal === levelMaxVal) {
            costDisplayInput.value = `Costo: ${costMin} CS`;
        } else {
            costDisplayInput.value = `Costo: ${costMin} - ${costMax} CS`;
        }

        // Salva entrambi i valori per riferimento
        costDisplayInput.dataset.calculatedCostMin = costMin;
        costDisplayInput.dataset.calculatedCostMax = costMax;
    },

    // Ordine delle rarita (dalla piu rara alla piu comune)
    RARITY_ORDER: {
        'Leggendaria': 1,
        'Epica': 2,
        'Rara': 3,
        'Comune': 4
    },

    // Colori per le rarita
    RARITY_COLORS: {
        'Leggendaria': 'text-yellow-400',
        'Epica': 'text-purple-400',
        'Rara': 'text-blue-400',
        'Comune': 'text-gray-400'
    },

    /**
     * Ordina le abilita per rarita
     */
    sortAbilitiesByRarity(abilities) {
        return abilities.slice().sort((a, b) => {
            const abilityDataA = window.AbilitiesEncyclopedia?.getAbility(a);
            const abilityDataB = window.AbilitiesEncyclopedia?.getAbility(b);
            const rarityA = this.RARITY_ORDER[abilityDataA?.rarity] || 5;
            const rarityB = this.RARITY_ORDER[abilityDataB?.rarity] || 5;
            return rarityA - rarityB;
        });
    },

    /**
     * Ottiene la rarita di un'abilita
     */
    getAbilityRarity(abilityName) {
        const abilityData = window.AbilitiesEncyclopedia?.getAbility(abilityName);
        return abilityData?.rarity || 'Comune';
    },

    updateAbilitiesChecklist() {
        const roleSelect = document.getElementById('player-role');
        const checklistContainer = document.getElementById('abilities-checklist');
        const selectedRole = roleSelect.value;

        if (!checklistContainer) return;

        if (!selectedRole || !this.ROLE_ABILITIES_SEPARATED[selectedRole]) {
            checklistContainer.innerHTML = '<p class="text-yellow-400 col-span-4">Seleziona un ruolo per visualizzare le abilita disponibili.</p>';
            return;
        }

        const roleAbilities = this.ROLE_ABILITIES_SEPARATED[selectedRole];

        // Ordina le abilita per rarita
        const sortedPositive = this.sortAbilitiesByRarity(roleAbilities.positive);
        const sortedNegative = this.sortAbilitiesByRarity(roleAbilities.negative);

        let checklistHtml = '<div class="space-y-4">';

        checklistHtml += '<div class="bg-gray-900 p-3 rounded-lg border border-green-500">';
        checklistHtml += '<h4 class="text-green-400 font-bold mb-2">Abilita Positive (Max 3)</h4>';
        checklistHtml += '<div class="grid grid-cols-2 gap-2">';

        sortedPositive.forEach(ability => {
            const rarity = this.getAbilityRarity(ability);
            const rarityColor = this.RARITY_COLORS[rarity] || 'text-gray-400';
            checklistHtml += `
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="ability-${ability.replace(/\s/g, '-')}"
                           name="player-ability" value="${ability}"
                           class="form-checkbox h-4 w-4 text-green-500 bg-gray-600 border-gray-500 rounded focus:ring-green-400 ability-positive">
                    <label for="ability-${ability.replace(/\s/g, '-')}" class="text-gray-300 text-sm">
                        ${ability} <span class="${rarityColor} text-xs">(${rarity})</span>
                    </label>
                </div>
            `;
        });

        checklistHtml += '</div></div>';

        checklistHtml += '<div class="bg-gray-900 p-3 rounded-lg border border-red-500 mt-3">';
        checklistHtml += '<h4 class="text-red-400 font-bold mb-2">Abilita Negative (Max 2)</h4>';
        checklistHtml += '<p class="text-xs text-yellow-300 mb-2">Attenzione: effetti dannosi!</p>';
        checklistHtml += '<div class="grid grid-cols-2 gap-2">';

        sortedNegative.forEach(ability => {
            const rarity = this.getAbilityRarity(ability);
            const rarityColor = this.RARITY_COLORS[rarity] || 'text-gray-400';
            checklistHtml += `
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="ability-${ability.replace(/\s/g, '-')}"
                           name="player-ability" value="${ability}"
                           class="form-checkbox h-4 w-4 text-red-500 bg-gray-600 border-gray-500 rounded focus:ring-red-400 ability-negative">
                    <label for="ability-${ability.replace(/\s/g, '-')}" class="text-gray-300 text-sm">
                        ${ability} <span class="${rarityColor} text-xs">(${rarity})</span>
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
                msgElement.textContent = 'Massimo 3 abilita positive!';
                msgElement.classList.add('text-red-400');
                setTimeout(() => { msgElement.textContent = ''; }, 2000);
            }
            return;
        }

        if (event.target.classList.contains('ability-negative') && negativeChecked.length > 2) {
            event.target.checked = false;
            const msgElement = document.getElementById('player-creation-message');
            if (msgElement) {
                msgElement.textContent = 'Massimo 2 abilita negative!';
                msgElement.classList.add('text-red-400');
                setTimeout(() => { msgElement.textContent = ''; }, 2000);
            }
            return;
        }

        this.updateCostDisplay();
    },

    handleRandomPlayer() {
        const getRandomInt = window.getRandomInt;

        const msgElement = document.getElementById('player-creation-message');
        if (msgElement) {
            msgElement.textContent = '';
        }

        const roles = ['P', 'D', 'C', 'A'];
        const types = ['Potenza', 'Tecnica', 'Velocita'];
        const nationalities = window.DraftConstants?.NATIONALITIES || [];

        const randomRole = roles[getRandomInt(0, roles.length - 1)];
        const randomType = types[getRandomInt(0, types.length - 1)];
        const randomNationality = nationalities.length > 0 ? nationalities[getRandomInt(0, nationalities.length - 1)] : null;
        const randomAge = getRandomInt(18, 35);

        const randomLevelMax = getRandomInt(10, 20);
        const randomLevelMin = getRandomInt(1, randomLevelMax);

        // Genera abilita casuali (max 3 positive + 2 negative)
        const roleAbilities = this.ROLE_ABILITIES_SEPARATED[randomRole] || { positive: [], negative: [] };
        const numPositive = getRandomInt(0, Math.min(3, roleAbilities.positive.length));
        const numNegative = getRandomInt(0, Math.min(2, roleAbilities.negative.length));

        const shuffledPositive = [...roleAbilities.positive].sort(() => 0.5 - Math.random());
        const shuffledNegative = [...roleAbilities.negative].sort(() => 0.5 - Math.random());

        const selectedPositive = shuffledPositive.slice(0, numPositive);
        const selectedNegative = shuffledNegative.slice(0, numNegative);

        const totalAbilities = numPositive + numNegative;

        // Imposta i valori nei campi
        if (randomNationality) {
            document.getElementById('player-nationality').value = randomNationality.code;
        }
        document.getElementById('player-role').value = randomRole;
        document.getElementById('player-type').value = randomType;
        document.getElementById('player-age').value = randomAge;
        document.getElementById('player-level-min').value = randomLevelMin;
        document.getElementById('player-level-max').value = randomLevelMax;

        // Aggiorna le checkbox delle abilita
        this.updateAbilitiesChecklist();

        // Seleziona le abilita positive
        selectedPositive.forEach(ability => {
            const checkbox = document.getElementById(`ability-${ability.replace(/\s/g, '-')}`);
            if (checkbox) checkbox.checked = true;
        });

        // Seleziona le abilita negative
        selectedNegative.forEach(ability => {
            const checkbox = document.getElementById(`ability-${ability.replace(/\s/g, '-')}`);
            if (checkbox) checkbox.checked = true;
        });

        // Aggiorna il display del costo con il range
        this.updateCostDisplay();

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
        const nationality = document.getElementById('player-nationality')?.value || '';
        const role = document.getElementById('player-role').value;
        const type = document.getElementById('player-type').value;
        const age = parseInt(document.getElementById('player-age').value);
        const levelMin = parseInt(document.getElementById('player-level-min').value);
        const levelMax = parseInt(document.getElementById('player-level-max').value);

        const costDisplayInput = document.getElementById('player-cost-display');
        const selectedAbilities = Array.from(document.querySelectorAll('#abilities-checklist input[name="player-ability"]:checked')).map(cb => cb.value);
        const abilitiesCount = selectedAbilities.length;
        const { costMin, costMax } = this.calculateCostRange(levelMin, levelMax, abilitiesCount);
        const allowedAbilities = this.ROLE_ABILITIES_MAP[role] || [];

        if (!name || !role || !type || !nationality || isNaN(age) || isNaN(levelMin) || isNaN(levelMax) ||
            age < 15 || age > 50 || levelMin < 1 || levelMin > 20 || levelMax < 1 || levelMax > 20 ||
            levelMin > levelMax || costMin < 1) {
             if (msgElement) {
                 msgElement.textContent = "Errore: controlla che tutti i campi (inclusa Nazionalita) siano compilati e validi.";
                 msgElement.classList.add('text-red-400');
             }
             return;
        }

        const invalidAbilities = selectedAbilities.filter(ability => !allowedAbilities.includes(ability));
        if (invalidAbilities.length > 0) {
            if (msgElement) {
                msgElement.textContent = `Errore: L'abilita ${invalidAbilities.join(', ')} non e valida per il ruolo di ${role}.`;
                msgElement.classList.add('text-red-400');
            }
            return;
        }

        if (selectedAbilities.length > 5) {
             if (msgElement) {
                 msgElement.textContent = 'Errore: non puoi selezionare piu di 5 abilita totali.';
                 msgElement.classList.add('text-red-400');
             }
             return;
        }

        const newPlayer = {
            name, nationality, role, age, levelRange: [levelMin, levelMax],
            costRange: [costMin, costMax], // Range di costo basato sui livelli
            cost: costMax, // Costo massimo per compatibilita
            type,
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
        const firestoreTools = window.firestoreTools || {};
        const { collection, getDocs, query, where } = firestoreTools;
        const db = window.db;
        const playersListContainer = document.getElementById('draft-players-list');
        if (!playersListContainer) return;

        playersListContainer.innerHTML = '<p class="text-center text-yellow-400">Caricamento Draft...</p>';

        try {
            if (typeof query !== 'function' || typeof where !== 'function') {
                 throw new Error("Funzioni Firestore 'query' o 'where' non caricate correttamente.");
            }

            const playersCollectionRef = collection(db, DRAFT_PLAYERS_COLLECTION_PATH);
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
                            <p class="font-semibold">${this.getFlag(player.nationality)} ${player.name} (${player.role})</p>
                            <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | Tipo: ${playerType} | Costo: ${this.formatCost(player)}</p>
                            <p class="text-xs text-yellow-300">Abilita: ${abilitiesList}</p>
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
                         <p class="font-semibold">${this.getFlag(player.nationality)} ${player.name} (${player.role})</p>
                         <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | Tipo: ${playerType} | Costo: ${this.formatCost(player)}</p>
                         <p class="text-xs text-yellow-300">Abilita: ${abilitiesList}</p>
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
        const firestoreTools = window.firestoreTools || {};
        const { collection, getDocs, query, where } = firestoreTools;
        const db = window.db;
        const playersListContainer = document.getElementById('market-players-list');
        if (!playersListContainer) return;

        playersListContainer.innerHTML = '<p class="text-center text-blue-400">Caricamento Mercato...</p>';

        try {
            if (typeof query !== 'function' || typeof where !== 'function') {
                 throw new Error("Funzioni Firestore 'query' o 'where' non caricate correttamente.");
            }

            const playersCollectionRef = collection(db, MARKET_PLAYERS_COLLECTION_PATH);
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
                            <p class="font-semibold">${this.getFlag(player.nationality)} ${player.name} (${player.role})</p>
                            <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | Tipo: ${playerType} | Costo: ${this.formatCost(player)}</p>
                            <p class="text-xs text-yellow-300">Abilita: ${abilitiesList}</p>
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
                         <p class="font-semibold">${this.getFlag(player.nationality)} ${player.name} (${player.role})</p>
                         <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | Tipo: ${playerType} | Costo: ${this.formatCost(player)}</p>
                         <p class="text-xs text-yellow-300">Abilita: ${abilitiesList}</p>
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

console.log("Modulo Admin-Players caricato.");
