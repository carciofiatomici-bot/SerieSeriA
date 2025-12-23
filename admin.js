
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
    const featureFlagsContent = document.getElementById('feature-flags-content');
    const featureFlagsToolsContainer = document.getElementById('feature-flags-tools-container');

    // leaderboardContent e scheduleContent rimossi - ora si usa user-campionato-content

    let db;
    let firestoreTools;
    let TEAMS_COLLECTION_PATH;
    let DRAFT_PLAYERS_COLLECTION_PATH;
    let MARKET_PLAYERS_COLLECTION_PATH;
    let CHAMPIONSHIP_CONFIG_PATH;
    let SCHEDULE_COLLECTION_PATH;
    let LEADERBOARD_COLLECTION_PATH;
    let CONFIG_COLLECTION_PATH;

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
     * Renderizza il pannello di configurazione della Ruota della Fortuna
     */
    const renderWheelConfigPanel = async (container) => {
        if (!window.DailyWheel) {
            container.innerHTML = '<p class="text-red-400">Modulo DailyWheel non caricato</p>';
            return;
        }

        // Carica config da Firestore prima di mostrare il pannello (forza reload)
        container.innerHTML = '<p class="text-gray-400">Caricamento configurazione...</p>';
        await window.DailyWheel.loadConfig(true);

        const prizes = window.DailyWheel.PRIZES;
        const objects = window.DailyWheel.RANDOM_OBJECTS;
        console.log('[Admin] Config ruota caricata:', { prizes: prizes.length, objects: objects.length });

        container.innerHTML = `
            <div class="space-y-4">
                <p class="text-sm text-gray-400 mb-4">Configura i premi della Ruota della Fortuna e le loro probabilita.</p>

                <!-- Premi attuali -->
                <div class="space-y-2">
                    <h4 class="text-orange-300 font-bold">Premi Attuali</h4>
                    <div id="wheel-prizes-list" class="space-y-2">
                        ${prizes.map((prize, index) => `
                            <div class="flex items-center gap-2 p-2 bg-gray-700 rounded-lg" data-prize-index="${index}">
                                <span class="text-xl">${prize.icon}</span>
                                <input type="text" class="prize-label flex-1 bg-gray-600 text-white px-2 py-1 rounded text-sm" value="${prize.label}" data-field="label">
                                <select class="prize-type bg-gray-600 text-white px-2 py-1 rounded text-sm" data-field="type">
                                    <option value="cs" ${prize.type === 'cs' ? 'selected' : ''}>CS</option>
                                    <option value="css" ${prize.type === 'css' ? 'selected' : ''}>CSS</option>
                                    <option value="object" ${prize.type === 'object' ? 'selected' : ''}>Oggetto</option>
                                </select>
                                <input type="number" class="prize-value w-16 bg-gray-600 text-white px-2 py-1 rounded text-sm" value="${prize.value || 0}" data-field="value" placeholder="Valore" ${prize.type === 'object' ? 'disabled' : ''}>
                                <input type="number" class="prize-prob w-16 bg-gray-600 text-white px-2 py-1 rounded text-sm" value="${prize.probability}" data-field="probability" placeholder="Prob%">
                                <input type="text" class="prize-color w-20 bg-gray-600 text-white px-2 py-1 rounded text-sm" value="${prize.color}" data-field="color" placeholder="#hex">
                                <button class="btn-remove-prize text-red-400 hover:text-red-300 px-2" data-index="${index}">✖</button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Totale probabilita -->
                <div class="p-2 bg-gray-700 rounded-lg">
                    <p class="text-sm text-gray-300">
                        Totale Probabilita: <span id="total-probability" class="font-bold ${prizes.reduce((sum, p) => sum + p.probability, 0) === 100 ? 'text-green-400' : 'text-yellow-400'}">${prizes.reduce((sum, p) => sum + p.probability, 0)}%</span>
                        <span class="text-xs text-gray-500">(consigliato: 100%)</span>
                    </p>
                </div>

                <!-- Aggiungi premio -->
                <div class="p-3 bg-gray-700/50 rounded-lg border border-dashed border-gray-500">
                    <h4 class="text-orange-300 font-bold mb-2">Aggiungi Nuovo Premio</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        <input type="text" id="new-prize-label" class="bg-gray-600 text-white px-2 py-1 rounded text-sm" placeholder="Nome">
                        <select id="new-prize-type" class="bg-gray-600 text-white px-2 py-1 rounded text-sm">
                            <option value="cs">CS</option>
                            <option value="css">CSS</option>
                            <option value="object">Oggetto</option>
                        </select>
                        <input type="number" id="new-prize-value" class="bg-gray-600 text-white px-2 py-1 rounded text-sm" placeholder="Valore">
                        <input type="number" id="new-prize-prob" class="bg-gray-600 text-white px-2 py-1 rounded text-sm" placeholder="Prob%">
                        <input type="text" id="new-prize-color" class="bg-gray-600 text-white px-2 py-1 rounded text-sm" placeholder="#colore">
                        <button id="btn-add-prize" class="bg-green-600 text-white font-bold px-3 py-1 rounded text-sm hover:bg-green-500">+ Aggiungi</button>
                    </div>
                </div>

                <!-- Oggetti casuali -->
                <div class="space-y-2">
                    <h4 class="text-orange-300 font-bold">Oggetti Casuali (per premio "Oggetto")</h4>
                    <div id="wheel-objects-list" class="space-y-2">
                        ${objects.map((obj, index) => `
                            <div class="flex items-center gap-2 p-2 bg-gray-700 rounded-lg" data-object-index="${index}">
                                <input type="text" class="object-name flex-1 bg-gray-600 text-white px-2 py-1 rounded text-sm" value="${obj.name}" data-field="name">
                                <select class="object-slot bg-gray-600 text-white px-2 py-1 rounded text-sm" data-field="slot">
                                    <option value="scarpini" ${obj.slot === 'scarpini' ? 'selected' : ''}>Scarpini</option>
                                    <option value="guanti" ${obj.slot === 'guanti' ? 'selected' : ''}>Guanti</option>
                                    <option value="maglia" ${obj.slot === 'maglia' ? 'selected' : ''}>Maglia</option>
                                    <option value="parastinchi" ${obj.slot === 'parastinchi' ? 'selected' : ''}>Parastinchi</option>
                                    <option value="cappello" ${obj.slot === 'cappello' ? 'selected' : ''}>Cappello</option>
                                </select>
                                <select class="object-rarity bg-gray-600 text-white px-2 py-1 rounded text-sm" data-field="rarity">
                                    <option value="comune" ${obj.rarity === 'comune' ? 'selected' : ''}>Comune</option>
                                    <option value="raro" ${obj.rarity === 'raro' ? 'selected' : ''}>Raro</option>
                                    <option value="epico" ${obj.rarity === 'epico' ? 'selected' : ''}>Epico</option>
                                    <option value="leggendario" ${obj.rarity === 'leggendario' ? 'selected' : ''}>Leggendario</option>
                                </select>
                                <button class="btn-remove-object text-red-400 hover:text-red-300 px-2" data-index="${index}">✖</button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Aggiungi oggetto -->
                <div class="p-3 bg-gray-700/50 rounded-lg border border-dashed border-gray-500">
                    <h4 class="text-orange-300 font-bold mb-2">Aggiungi Nuovo Oggetto</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <input type="text" id="new-object-name" class="bg-gray-600 text-white px-2 py-1 rounded text-sm" placeholder="Nome oggetto">
                        <select id="new-object-slot" class="bg-gray-600 text-white px-2 py-1 rounded text-sm">
                            <option value="scarpini">Scarpini</option>
                            <option value="guanti">Guanti</option>
                            <option value="maglia">Maglia</option>
                            <option value="parastinchi">Parastinchi</option>
                            <option value="cappello">Cappello</option>
                        </select>
                        <select id="new-object-stat" class="bg-gray-600 text-white px-2 py-1 rounded text-sm">
                            <option value="velocita">Velocita</option>
                            <option value="difesa">Difesa</option>
                            <option value="attacco">Attacco</option>
                            <option value="fortuna">Fortuna</option>
                            <option value="resistenza">Resistenza</option>
                            <option value="morale">Morale</option>
                        </select>
                        <select id="new-object-rarity" class="bg-gray-600 text-white px-2 py-1 rounded text-sm">
                            <option value="comune">Comune</option>
                            <option value="raro">Raro</option>
                            <option value="epico">Epico</option>
                            <option value="leggendario">Leggendario</option>
                        </select>
                        <button id="btn-add-object" class="bg-green-600 text-white font-bold px-3 py-1 rounded text-sm hover:bg-green-500">+ Aggiungi</button>
                    </div>
                </div>

                <!-- Bottoni azioni -->
                <div class="flex gap-2 mt-4">
                    <button id="btn-save-wheel-config" class="flex-1 bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-500">
                        💾 Salva Configurazione
                    </button>
                    <button id="btn-reset-wheel-config" class="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">
                        🔄 Reset Default
                    </button>
                </div>

                <p id="wheel-config-message" class="text-center text-sm mt-2"></p>
            </div>
        `;

        // Event listeners
        setupWheelConfigListeners(container);
    };

    /**
     * Setup event listeners per il pannello configurazione ruota
     */
    const setupWheelConfigListeners = (container) => {
        // Bottone aggiungi premio
        const btnAddPrize = container.querySelector('#btn-add-prize');
        if (btnAddPrize) {
            btnAddPrize.addEventListener('click', () => {
                const label = container.querySelector('#new-prize-label').value.trim();
                const type = container.querySelector('#new-prize-type').value;
                const value = parseInt(container.querySelector('#new-prize-value').value) || 0;
                const prob = parseInt(container.querySelector('#new-prize-prob').value) || 0;
                const color = container.querySelector('#new-prize-color').value.trim() || '#666666';

                if (!label || prob <= 0) {
                    displayMessage('Inserisci nome e probabilita validi', 'error', 'wheel-config-message');
                    return;
                }

                const icons = { cs: '💰', css: '⭐', object: '🎁' };
                const newPrize = {
                    id: `prize_${Date.now()}`,
                    label,
                    type,
                    value: type === 'object' ? null : value,
                    probability: prob,
                    color,
                    icon: icons[type] || '🎁'
                };

                window.DailyWheel.PRIZES.push(newPrize);
                renderWheelConfigPanel(container);
                displayMessage('Premio aggiunto (non salvato)', 'info', 'wheel-config-message');
            });
        }

        // Bottoni rimuovi premio
        container.querySelectorAll('.btn-remove-prize').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                if (window.DailyWheel.PRIZES.length > 1) {
                    window.DailyWheel.PRIZES.splice(index, 1);
                    renderWheelConfigPanel(container);
                    displayMessage('Premio rimosso (non salvato)', 'info', 'wheel-config-message');
                } else {
                    displayMessage('Devi avere almeno un premio', 'error', 'wheel-config-message');
                }
            });
        });

        // Bottoni rimuovi oggetto
        container.querySelectorAll('.btn-remove-object').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                if (window.DailyWheel.RANDOM_OBJECTS.length > 1) {
                    window.DailyWheel.RANDOM_OBJECTS.splice(index, 1);
                    renderWheelConfigPanel(container);
                    displayMessage('Oggetto rimosso (non salvato)', 'info', 'wheel-config-message');
                } else {
                    displayMessage('Devi avere almeno un oggetto', 'error', 'wheel-config-message');
                }
            });
        });

        // Bottone aggiungi oggetto
        const btnAddObject = container.querySelector('#btn-add-object');
        if (btnAddObject) {
            btnAddObject.addEventListener('click', () => {
                const name = container.querySelector('#new-object-name').value.trim();
                const slot = container.querySelector('#new-object-slot').value;
                const stat = container.querySelector('#new-object-stat').value;
                const rarity = container.querySelector('#new-object-rarity').value;

                if (!name) {
                    displayMessage('Inserisci il nome dell\'oggetto', 'error', 'wheel-config-message');
                    return;
                }

                // Valore bonus in base alla rarita
                const bonusValues = { comune: 1, raro: 2, epico: 3, leggendario: 5 };
                const bonusValue = bonusValues[rarity] || 1;

                const newObject = {
                    name,
                    slot,
                    bonus: { stat, value: bonusValue },
                    rarity
                };

                window.DailyWheel.RANDOM_OBJECTS.push(newObject);
                renderWheelConfigPanel(container);
                displayMessage('Oggetto aggiunto (non salvato)', 'info', 'wheel-config-message');
            });
        }

        // Bottone salva configurazione
        const btnSave = container.querySelector('#btn-save-wheel-config');
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                // Raccogli i valori aggiornati dai campi PREMI
                const prizeRows = container.querySelectorAll('[data-prize-index]');
                const updatedPrizes = [];

                prizeRows.forEach((row, index) => {
                    const originalPrize = window.DailyWheel.PRIZES[index];
                    updatedPrizes.push({
                        id: originalPrize.id,
                        label: row.querySelector('.prize-label').value,
                        type: row.querySelector('.prize-type').value,
                        value: row.querySelector('.prize-type').value === 'object' ? null : parseInt(row.querySelector('.prize-value').value) || 0,
                        probability: parseInt(row.querySelector('.prize-prob').value) || 0,
                        color: row.querySelector('.prize-color').value,
                        icon: originalPrize.icon
                    });
                });

                // Raccogli i valori aggiornati dai campi OGGETTI
                const objectRows = container.querySelectorAll('[data-object-index]');
                const updatedObjects = [];

                objectRows.forEach((row, index) => {
                    const originalObject = window.DailyWheel.RANDOM_OBJECTS[index];
                    const name = row.querySelector('.object-name').value;
                    const slot = row.querySelector('.object-slot').value;
                    const rarity = row.querySelector('.object-rarity').value;

                    updatedObjects.push({
                        name,
                        slot,
                        bonus: originalObject?.bonus || { stat: 'velocita', value: 1 },
                        rarity
                    });
                });

                // Aggiorna gli array globali
                window.DailyWheel.PRIZES.length = 0;
                window.DailyWheel.PRIZES.push(...updatedPrizes);

                window.DailyWheel.RANDOM_OBJECTS.length = 0;
                window.DailyWheel.RANDOM_OBJECTS.push(...updatedObjects);

                // Salva su Firestore nella configurazione
                try {
                    const { doc, updateDoc, setDoc, getDoc } = window.firestoreTools;
                    const appId = window.firestoreTools.appId;
                    const configPath = `artifacts/${appId}/public/data/config`;
                    const configDocRef = doc(window.db, configPath, 'wheelConfig');

                    await setDoc(configDocRef, {
                        prizes: updatedPrizes,
                        objects: updatedObjects,
                        updatedAt: new Date().toISOString()
                    });

                    displayMessage('Configurazione salvata!', 'success', 'wheel-config-message');
                    console.log('[Admin] Config ruota salvata:', { prizes: updatedPrizes.length, objects: updatedObjects.length });
                } catch (error) {
                    console.error('Errore salvataggio config ruota:', error);
                    displayMessage('Errore nel salvataggio: ' + error.message, 'error', 'wheel-config-message');
                }
            });
        }

        // Bottone reset default
        const btnReset = container.querySelector('#btn-reset-wheel-config');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (!confirm('Vuoi ripristinare i premi di default?')) return;

                // Ripristina valori default
                window.DailyWheel.PRIZES.length = 0;
                window.DailyWheel.PRIZES.push(
                    { id: 'cs5', label: '5 CS', type: 'cs', value: 5, probability: 30, color: '#4ade80', icon: '💰' },
                    { id: 'cs10', label: '10 CS', type: 'cs', value: 10, probability: 25, color: '#22c55e', icon: '💰' },
                    { id: 'cs25', label: '25 CS', type: 'cs', value: 25, probability: 20, color: '#3b82f6', icon: '💎' },
                    { id: 'cs50', label: '50 CS', type: 'cs', value: 50, probability: 15, color: '#8b5cf6', icon: '💎' },
                    { id: 'css1', label: '1 CSS', type: 'css', value: 1, probability: 8, color: '#fbbf24', icon: '⭐' },
                    { id: 'object', label: 'Oggetto', type: 'object', value: null, probability: 2, color: '#ef4444', icon: '🎁' }
                );

                renderWheelConfigPanel(container);
                displayMessage('Ripristinati valori di default', 'info', 'wheel-config-message');
            });
        }
    };

    /**
     * Renderizza il pannello di configurazione della Schedina Pronostici
     */
    const renderSchedinaConfigPanel = async (container) => {
        if (!window.Schedina) {
            container.innerHTML = '<p class="text-red-400">Modulo Schedina non caricato</p>';
            return;
        }

        container.innerHTML = '<p class="text-gray-400">Caricamento configurazione...</p>';
        const config = await window.Schedina.loadConfig();

        container.innerHTML = `
            <div class="space-y-4">
                <p class="text-sm text-gray-400 mb-4">Configura i premi per la Schedina Pronostici. I premi vengono assegnati dopo la simulazione della giornata.</p>

                <p id="schedina-config-message" class="text-sm mb-2"></p>

                <!-- Impostazioni principali -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="p-4 bg-gray-700 rounded-lg">
                        <label class="block text-green-300 font-bold mb-2">CS per Pronostico Corretto</label>
                        <input type="number" id="schedina-base-reward" value="${config.baseRewardPerCorrect || 5}"
                               class="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500" min="0">
                        <p class="text-xs text-gray-400 mt-1">Crediti assegnati per ogni pronostico azzeccato</p>
                    </div>
                    <div class="p-4 bg-gray-700 rounded-lg">
                        <label class="block text-green-300 font-bold mb-2">Bonus Schedina Perfetta</label>
                        <input type="number" id="schedina-perfect-bonus" value="${config.perfectBonusReward || 50}"
                               class="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500" min="0">
                        <p class="text-xs text-gray-400 mt-1">Bonus extra se indovina tutti i pronostici</p>
                    </div>
                    <div class="p-4 bg-gray-700 rounded-lg">
                        <label class="block text-green-300 font-bold mb-2">Minimo Corretti per Vincere</label>
                        <input type="number" id="schedina-min-correct" value="${config.minCorrectToWin || 0}"
                               class="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500" min="0">
                        <p class="text-xs text-gray-400 mt-1">0 = premi sempre, altrimenti serve indovinare almeno X partite</p>
                    </div>
                    <div class="p-4 bg-gray-700 rounded-lg">
                        <label class="block text-green-300 font-bold mb-2">Chiusura (minuti prima simulazione)</label>
                        <input type="number" id="schedina-closing-minutes" value="${config.closingMinutesBeforeSimulation || 60}"
                               class="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500" min="0">
                        <p class="text-xs text-gray-400 mt-1">I pronostici si chiudono X minuti prima della simulazione</p>
                    </div>
                </div>

                <!-- Bottoni azione -->
                <div class="flex flex-wrap gap-3 pt-4 border-t border-gray-600">
                    <button id="btn-save-schedina-config"
                            class="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-lg">
                        💾 Salva Configurazione
                    </button>
                    <button id="btn-calculate-schedina-results"
                            class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 py-2 rounded-lg">
                        📊 Calcola Risultati Ultima Giornata
                    </button>
                    <button id="btn-apply-schedina-rewards"
                            class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-lg">
                        🎁 Assegna Premi
                    </button>
                </div>

                <!-- Info -->
                <div class="p-3 bg-gray-700/50 rounded-lg border border-gray-600 mt-4">
                    <p class="text-xs text-gray-400">
                        <strong>Nota:</strong> Il calcolo risultati e l'assegnazione premi avvengono automaticamente dopo ogni simulazione di giornata.
                        Usa i bottoni sopra solo per operazioni manuali o correzioni.
                    </p>
                </div>
            </div>
        `;

        // Event listeners
        setupSchedinaConfigListeners(container);
    };

    /**
     * Setup event listeners per il pannello configurazione schedina
     */
    const setupSchedinaConfigListeners = (container) => {
        // Salva configurazione
        const btnSave = container.querySelector('#btn-save-schedina-config');
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                const newConfig = {
                    baseRewardPerCorrect: parseInt(container.querySelector('#schedina-base-reward').value) || 5,
                    perfectBonusReward: parseInt(container.querySelector('#schedina-perfect-bonus').value) || 50,
                    minCorrectToWin: parseInt(container.querySelector('#schedina-min-correct').value) || 0,
                    closingMinutesBeforeSimulation: parseInt(container.querySelector('#schedina-closing-minutes').value) || 60
                };

                const success = await window.Schedina.saveConfig(newConfig);
                const msgEl = container.querySelector('#schedina-config-message');
                if (success) {
                    msgEl.textContent = 'Configurazione salvata!';
                    msgEl.className = 'text-sm mb-2 text-green-400';
                } else {
                    msgEl.textContent = 'Errore nel salvataggio';
                    msgEl.className = 'text-sm mb-2 text-red-400';
                }

                setTimeout(() => { msgEl.textContent = ''; }, 3000);
            });
        }

        // Calcola risultati
        const btnCalculate = container.querySelector('#btn-calculate-schedina-results');
        if (btnCalculate) {
            btnCalculate.addEventListener('click', async () => {
                const msgEl = container.querySelector('#schedina-config-message');
                msgEl.textContent = 'Calcolo risultati in corso...';
                msgEl.className = 'text-sm mb-2 text-yellow-400';

                try {
                    // Trova l'ultima giornata giocata
                    const schedule = await window.ScheduleListener?.getSchedule();
                    if (!schedule?.matches) throw new Error('Schedule non disponibile');

                    // Trova l'ultima giornata con risultati
                    let lastPlayedRound = null;
                    for (let i = schedule.matches.length - 1; i >= 0; i--) {
                        const round = schedule.matches[i];
                        const playedMatches = round.matches.filter(m => m.result);
                        if (playedMatches.length > 0) {
                            lastPlayedRound = round.round;
                            break;
                        }
                    }

                    if (!lastPlayedRound) throw new Error('Nessuna giornata giocata trovata');

                    const result = await window.Schedina.calculateResults(lastPlayedRound);
                    if (result.success) {
                        msgEl.textContent = 'Risultati calcolati per giornata ' + lastPlayedRound + ' (' + (result.participants?.length || 0) + ' partecipanti)';
                        msgEl.className = 'text-sm mb-2 text-green-400';
                    } else {
                        throw new Error(result.error || 'Errore calcolo');
                    }
                } catch (error) {
                    msgEl.textContent = 'Errore: ' + error.message;
                    msgEl.className = 'text-sm mb-2 text-red-400';
                }
            });
        }

        // Assegna premi
        const btnRewards = container.querySelector('#btn-apply-schedina-rewards');
        if (btnRewards) {
            btnRewards.addEventListener('click', async () => {
                const msgEl = container.querySelector('#schedina-config-message');
                msgEl.textContent = 'Assegnazione premi in corso...';
                msgEl.className = 'text-sm mb-2 text-yellow-400';

                try {
                    // Trova l'ultima giornata
                    const schedule = await window.ScheduleListener?.getSchedule();
                    if (!schedule?.matches) throw new Error('Schedule non disponibile');

                    let lastPlayedRound = null;
                    for (let i = schedule.matches.length - 1; i >= 0; i--) {
                        const round = schedule.matches[i];
                        if (round.matches.some(m => m.result)) {
                            lastPlayedRound = round.round;
                            break;
                        }
                    }

                    if (!lastPlayedRound) throw new Error('Nessuna giornata trovata');

                    const result = await window.Schedina.applyRewards(lastPlayedRound);
                    msgEl.textContent = 'Premi assegnati a ' + result.rewarded + ' squadre (giornata ' + lastPlayedRound + ')';
                    msgEl.className = 'text-sm mb-2 text-green-400';
                } catch (error) {
                    msgEl.textContent = 'Errore: ' + error.message;
                    msgEl.className = 'text-sm mb-2 text-red-400';
                }
            });
        }
    };

    /**
     * Inizializza il pannello admin
     */
    const initializeAdminPanel = async () => {
        // SECURITY CHECK: Verifica che l'utente abbia effettivamente i permessi admin
        const isAdmin = await window.checkCurrentTeamIsAdmin();
        if (!isAdmin) {
            console.error("[Admin] Accesso negato: utente non autorizzato.");
            // Reindirizza al login
            const loginBox = document.getElementById('login-box');
            if (loginBox && window.showScreen) {
                window.showScreen(loginBox);
            }
            return;
        }

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
        SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
        LEADERBOARD_COLLECTION_PATH = `artifacts/${appId}/public/data/leaderboard`;
        CONFIG_COLLECTION_PATH = `artifacts/${appId}/public/data/config`;

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
        if (document.getElementById('feature-flags-back-button')) {
            document.getElementById('feature-flags-back-button').addEventListener('click', () => {
                window.showScreen(adminContent);
            });
        }

        renderAdminDashboardLayout();
        adminLogoutButton.addEventListener('click', handleAdminLogout);

        // Event listener per bottone "Torna alla Dashboard" (per squadre admin non serieseria)
        const returnDashboardBtn = document.getElementById('btn-return-to-team-dashboard');
        if (returnDashboardBtn) {
            returnDashboardBtn.addEventListener('click', async () => {
                const teamId = window.adminTeamAccessingPanel?.teamId;
                window.adminTeamAccessingPanel = null;

                // Nascondi il bottone
                const returnContainer = document.getElementById('admin-return-dashboard-container');
                if (returnContainer) returnContainer.classList.add('hidden');

                if (teamId) {
                    try {
                        const { doc, getDoc } = firestoreTools;
                        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                        const teamDoc = await getDoc(teamDocRef);

                        if (teamDoc.exists()) {
                            const teamData = teamDoc.data();
                            window.InterfacciaCore.currentTeamData = teamData;
                            window.InterfacciaCore.currentTeamId = teamId;

                            if (window.InterfacciaDashboard && window.elements) {
                                window.InterfacciaDashboard.updateTeamUI(
                                    teamData.teamName,
                                    teamId,
                                    teamData.logoUrl,
                                    false,
                                    window.elements
                                );
                            }

                            const appContent = document.getElementById('app-content');
                            if (appContent && window.showScreen) {
                                window.showScreen(appContent);
                            }
                        }
                    } catch (error) {
                        console.error('[Admin] Errore ritorno a dashboard:', error);
                        if (window.Toast) {
                            window.Toast.error('Errore nel ritorno alla dashboard');
                        }
                    }
                }
            });
        }
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

        // Prendi sempre una reference fresca al container (potrebbe essere stato ricreato)
        const container = document.getElementById('admin-dashboard-container') || adminDashboardContainer;
        if (!container) {
            console.error('[Admin] Container admin-dashboard-container non trovato');
            return;
        }

        await window.AdminUI.renderAdminDashboard(container, configData, allTeams);
        setupAdminDashboardEvents();
    };

    // Esponi la funzione per poterla chiamare da altri moduli (es. admin-data-sync)
    window.renderAdminDashboardLayout = renderAdminDashboardLayout;

    /**
     * Cabla gli eventi della dashboard
     */
    const setupAdminDashboardEvents = () => {
        // Toggle menu Gestione Lega
        const btnToggleLeague = document.getElementById('btn-toggle-league-management');
        const leagueContent = document.getElementById('league-management-content');
        const leagueChevron = document.getElementById('league-management-chevron');

        if (btnToggleLeague && leagueContent) {
            btnToggleLeague.addEventListener('click', () => {
                const isHidden = leagueContent.classList.contains('hidden');
                if (isHidden) {
                    leagueContent.classList.remove('hidden');
                    leagueChevron?.classList.add('rotate-180');
                } else {
                    leagueContent.classList.add('hidden');
                    leagueChevron?.classList.remove('rotate-180');
                }
            });
        }

        // Toggle menu Utilita Admin
        const btnToggleAdminUtils = document.getElementById('btn-toggle-admin-utils');
        const adminUtilsContent = document.getElementById('admin-utils-content');
        const adminUtilsChevron = document.getElementById('admin-utils-chevron');

        if (btnToggleAdminUtils && adminUtilsContent) {
            btnToggleAdminUtils.addEventListener('click', () => {
                const isHidden = adminUtilsContent.classList.contains('hidden');
                if (isHidden) {
                    adminUtilsContent.classList.remove('hidden');
                    adminUtilsChevron?.classList.add('rotate-180');
                } else {
                    adminUtilsContent.classList.add('hidden');
                    adminUtilsChevron?.classList.remove('rotate-180');
                }
            });
        }

        // Toggle menu Configurazioni
        const btnToggleConfigs = document.getElementById('btn-toggle-configs');
        const configsContent = document.getElementById('configs-content');
        const configsChevron = document.getElementById('configs-chevron');

        if (btnToggleConfigs && configsContent) {
            btnToggleConfigs.addEventListener('click', () => {
                const isHidden = configsContent.classList.contains('hidden');
                if (isHidden) {
                    configsContent.classList.remove('hidden');
                    configsChevron?.classList.add('rotate-180');
                } else {
                    configsContent.classList.add('hidden');
                    configsChevron?.classList.remove('rotate-180');
                }
            });
        }

        // Toggle menu Gestione Dati
        const btnToggleDataMgmt = document.getElementById('btn-toggle-data-management');
        const dataMgmtContent = document.getElementById('data-management-content');
        const dataMgmtChevron = document.getElementById('data-management-chevron');

        if (btnToggleDataMgmt && dataMgmtContent) {
            btnToggleDataMgmt.addEventListener('click', () => {
                const isHidden = dataMgmtContent.classList.contains('hidden');
                if (isHidden) {
                    dataMgmtContent.classList.remove('hidden');
                    dataMgmtChevron?.classList.add('rotate-180');
                } else {
                    dataMgmtContent.classList.add('hidden');
                    dataMgmtChevron?.classList.remove('rotate-180');
                }
            });
        }

        // Carica pannello automazione quando si apre Gestione Competizioni
        let automationLoaded = false;
        if (btnToggleLeague && leagueContent) {
            const origListener = btnToggleLeague.onclick;
            btnToggleLeague.addEventListener('click', () => {
                if (!automationLoaded && !leagueContent.classList.contains('hidden')) {
                    loadAutomationPanel();
                    automationLoaded = true;
                }
            });
        }

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

        const btnFeatureFlags = document.getElementById('btn-feature-flags');
        if (btnFeatureFlags) btnFeatureFlags.addEventListener('click', renderFeatureFlagsPanel);

        // Toggle classifica accordion
        const btnToggleStandings = document.getElementById('btn-toggle-standings');
        if (btnToggleStandings) {
            btnToggleStandings.addEventListener('click', () => {
                const content = document.getElementById('serieseria-standings-content');
                const chevron = document.getElementById('standings-chevron');
                if (content && chevron) {
                    content.classList.toggle('hidden');
                    chevron.classList.toggle('rotate-180');
                }
            });
        }

        // Simula giornata campionato
        const btnSimulateRound = document.getElementById('btn-simulate-championship-round');
        if (btnSimulateRound) {
            btnSimulateRound.addEventListener('click', async () => {
                try {
                    btnSimulateRound.disabled = true;
                    btnSimulateRound.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Simulando...';

                    // Usa il sistema di automazione per simulare
                    if (window.AutomazioneSimulazioni) {
                        const result = await window.AutomazioneSimulazioni.simulateChampionshipRound();
                        if (result.success) {
                            displayMessage(`Giornata ${result.round} simulata!`, 'success', 'toggle-status-message');
                            // Ricarica dati
                            await loadSerieSeriaStatus();
                            await loadSerieSeriaStandings();
                            await loadSerieSeriaNextRound();
                        } else {
                            displayMessage(result.reason || 'Errore simulazione', 'error', 'toggle-status-message');
                        }
                    } else {
                        displayMessage('Modulo simulazione non disponibile', 'error', 'toggle-status-message');
                    }
                } catch (error) {
                    console.error('Errore simulazione giornata:', error);
                    displayMessage('Errore: ' + error.message, 'error', 'toggle-status-message');
                } finally {
                    btnSimulateRound.disabled = false;
                    btnSimulateRound.innerHTML = '<i class="fas fa-play mr-1"></i> Simula Giornata';
                }
            });
        }
        
        // Avvia Stagione (genera calendari + attiva automazione)
        const btnAvviaStagione = document.getElementById('btn-avvia-stagione');
        if (btnAvviaStagione) {
            btnAvviaStagione.addEventListener('click', handleAvviaStagione);
        }

        // Test Simulazione Partita
        setupTestSimulationListeners();

        // Creazione Oggetti
        setupCreateObjectsListener();

        // Test Simulazione Nuove Regole
        setupTestSimulationNewRulesListeners();

        // Fix Abilita Icone
        const btnFixIcone = document.getElementById('btn-fix-icone-ability');
        if (btnFixIcone) {
            btnFixIcone.addEventListener('click', handleFixIconeAbility);
        }

        // Reset Hall of Fame Stats
        const btnResetHoF = document.getElementById('btn-reset-hall-of-fame');
        if (btnResetHoF) {
            btnResetHoF.addEventListener('click', handleResetHallOfFame);
        }

        // Test Challenge Minigame (Allenamento)
        const btnTestChallengeMinigame = document.getElementById('btn-test-challenge-minigame');
        if (btnTestChallengeMinigame) {
            btnTestChallengeMinigame.addEventListener('click', () => {
                if (window.ChallengeMinigame) {
                    window.ChallengeMinigame.open({ testMode: true });
                } else {
                    window.Toast?.error("Minigioco non disponibile");
                }
            });
        }

        // Test Sfide Minigame (Sfide)
        const btnTestSfideMinigame = document.getElementById('btn-test-sfide-minigame');
        if (btnTestSfideMinigame) {
            btnTestSfideMinigame.addEventListener('click', () => {
                if (window.SfideMinigame) {
                    window.SfideMinigame.open({ testMode: true });
                } else {
                    window.Toast?.error("Minigioco Sfide non disponibile");
                }
            });
        }

        // Aggiungi +1 Contratto a tutti i giocatori
        const btnAddContractsAll = document.getElementById('btn-add-contracts-all');
        if (btnAddContractsAll) {
            btnAddContractsAll.addEventListener('click', handleAddContractsAll);
        }

        // Set Livello Icone
        const btnSetIconeLevel = document.getElementById('btn-set-icone-level');
        if (btnSetIconeLevel) {
            btnSetIconeLevel.addEventListener('click', handleSetIconeLevel);
        }

        // Rimuovi -1 Contratto a tutti i giocatori
        const btnRemoveContractsAll = document.getElementById('btn-remove-contracts-all');
        if (btnRemoveContractsAll) {
            btnRemoveContractsAll.addEventListener('click', handleRemoveContractsAll);
        }

        // Reset tutti i contratti a 1
        const btnResetContractsAll = document.getElementById('btn-reset-contracts-all');
        if (btnResetContractsAll) {
            btnResetContractsAll.addEventListener('click', handleResetContractsAll);
        }

        // Reset Timer Figurine
        const btnResetFigurineTimer = document.getElementById('btn-reset-figurine-timer');
        if (btnResetFigurineTimer) {
            btnResetFigurineTimer.addEventListener('click', handleResetFigurineTimer);
        }

        // Sincronizzazione Dati
        const btnDataSync = document.getElementById('btn-data-sync');
        if (btnDataSync) {
            btnDataSync.addEventListener('click', () => {
                window.AdminDataSync?.showSyncPanel();
            });
        }

        // Bottone Emergenza - Annulla Campionato e Coppa
        const btnEmergencyCancel = document.getElementById('btn-emergency-cancel-competitions');
        if (btnEmergencyCancel) {
            btnEmergencyCancel.addEventListener('click', handleEmergencyCancelCompetitions);
        }

        // Configurazione Formule Costi
        const btnFormulasConfig = document.getElementById('btn-formulas-config');
        const formulasPanelContainer = document.getElementById('formulas-panel-container');
        const formulasPanelContent = document.getElementById('formulas-panel-content');
        const btnCloseFormulasPanel = document.getElementById('btn-close-formulas-panel');
        let formulasLoaded = false;

        if (btnFormulasConfig && formulasPanelContainer) {
            btnFormulasConfig.addEventListener('click', async () => {
                formulasPanelContainer.classList.remove('hidden');

                // Carica configurazione e renderizza pannello solo la prima volta
                if (!formulasLoaded && window.AdminFormulas) {
                    await window.AdminFormulas.loadConfig();
                    window.AdminFormulas.renderPanel(formulasPanelContent);
                    formulasLoaded = true;
                }
            });
        }

        if (btnCloseFormulasPanel && formulasPanelContainer) {
            btnCloseFormulasPanel.addEventListener('click', () => {
                formulasPanelContainer.classList.add('hidden');
            });
        }

        // Configurazione Reward
        const btnRewardsConfig = document.getElementById('btn-rewards-config');
        const rewardsPanelContainer = document.getElementById('rewards-panel-container');
        const rewardsPanelContent = document.getElementById('rewards-panel-content');
        const btnCloseRewardsPanel = document.getElementById('btn-close-rewards-panel');
        let rewardsLoaded = false;

        if (btnRewardsConfig && rewardsPanelContainer) {
            btnRewardsConfig.addEventListener('click', async () => {
                rewardsPanelContainer.classList.remove('hidden');

                // Carica configurazione e renderizza pannello solo la prima volta
                if (!rewardsLoaded && window.AdminRewards) {
                    await window.AdminRewards.loadConfig();
                    window.AdminRewards.renderPanel(rewardsPanelContent);
                    rewardsLoaded = true;
                }
            });
        }

        if (btnCloseRewardsPanel && rewardsPanelContainer) {
            btnCloseRewardsPanel.addEventListener('click', () => {
                rewardsPanelContainer.classList.add('hidden');
            });
        }

        // Configurazione Sponsor
        const btnSponsorsConfig = document.getElementById('btn-sponsors-config');
        const sponsorsPanelContainer = document.getElementById('sponsors-panel-container');
        const sponsorsPanelContent = document.getElementById('sponsors-panel-content');
        const btnCloseSponsorsPanel = document.getElementById('btn-close-sponsors-panel');
        let sponsorsLoaded = false;

        if (btnSponsorsConfig && sponsorsPanelContainer) {
            btnSponsorsConfig.addEventListener('click', async () => {
                sponsorsPanelContainer.classList.remove('hidden');

                // Carica configurazione e renderizza pannello solo la prima volta
                if (!sponsorsLoaded && window.AdminSponsors) {
                    await window.AdminSponsors.loadConfig();
                    window.AdminSponsors.renderPanel(sponsorsPanelContent);
                    sponsorsLoaded = true;
                }
            });
        }

        if (btnCloseSponsorsPanel && sponsorsPanelContainer) {
            btnCloseSponsorsPanel.addEventListener('click', () => {
                sponsorsPanelContainer.classList.add('hidden');
            });
        }

        // Configurazione Media
        const btnMediaConfig = document.getElementById('btn-media-config');
        const mediaPanelContainer = document.getElementById('media-panel-container');
        const mediaPanelContent = document.getElementById('media-panel-content');
        const btnCloseMediaPanel = document.getElementById('btn-close-media-panel');
        let mediaLoaded = false;

        if (btnMediaConfig && mediaPanelContainer) {
            btnMediaConfig.addEventListener('click', async () => {
                mediaPanelContainer.classList.remove('hidden');

                // Carica configurazione e renderizza pannello solo la prima volta
                if (!mediaLoaded && window.AdminMedia) {
                    await window.AdminMedia.loadConfig();
                    window.AdminMedia.renderPanel(mediaPanelContent);
                    mediaLoaded = true;
                }
            });
        }

        if (btnCloseMediaPanel && mediaPanelContainer) {
            btnCloseMediaPanel.addEventListener('click', () => {
                mediaPanelContainer.classList.add('hidden');
            });
        }

        // Configurazione Ruota della Fortuna
        const btnWheelConfig = document.getElementById('btn-wheel-config');
        const wheelPanelContainer = document.getElementById('wheel-panel-container');
        const wheelPanelContent = document.getElementById('wheel-panel-content');
        const btnCloseWheelPanel = document.getElementById('btn-close-wheel-panel');

        if (btnWheelConfig && wheelPanelContainer) {
            btnWheelConfig.addEventListener('click', () => {
                wheelPanelContainer.classList.remove('hidden');
                renderWheelConfigPanel(wheelPanelContent);
            });
        }

        if (btnCloseWheelPanel && wheelPanelContainer) {
            btnCloseWheelPanel.addEventListener('click', () => {
                wheelPanelContainer.classList.add('hidden');
            });
        }

        // Configurazione Schedina Pronostici
        const btnSchedinaConfig = document.getElementById('btn-schedina-config');
        const schedinaContainer = document.getElementById('schedina-panel-container');
        const schedinaContent = document.getElementById('schedina-panel-content');
        const btnCloseSchedinaPanel = document.getElementById('btn-close-schedina-panel');

        if (btnSchedinaConfig && schedinaContainer) {
            btnSchedinaConfig.addEventListener('click', () => {
                schedinaContainer.classList.remove('hidden');
                if (window.AdminSchedina) {
                    window.AdminSchedina.renderConfigPanel(schedinaContent);
                } else {
                    renderSchedinaConfigPanel(schedinaContent);
                }
            });
        }

        if (btnCloseSchedinaPanel && schedinaContainer) {
            btnCloseSchedinaPanel.addEventListener('click', () => {
                schedinaContainer.classList.add('hidden');
            });
        }

        // Configurazione Figurine
        const btnFigurineConfig = document.getElementById('btn-figurine-config');
        const figurinePanelContainer = document.getElementById('figurine-panel-container');
        const figurinePanelContent = document.getElementById('figurine-panel-content');
        const btnCloseFigurinePanel = document.getElementById('btn-close-figurine-panel');

        if (btnFigurineConfig && figurinePanelContainer) {
            btnFigurineConfig.addEventListener('click', () => {
                figurinePanelContainer.classList.remove('hidden');
                if (window.AdminFigurine) {
                    window.AdminFigurine.renderConfigPanel(figurinePanelContent);
                }
            });
        }

        if (btnCloseFigurinePanel && figurinePanelContainer) {
            btnCloseFigurinePanel.addEventListener('click', () => {
                figurinePanelContainer.classList.add('hidden');
            });
        }

        // Gestione Rarita Figurine
        const btnFigurineRarity = document.getElementById('btn-figurine-rarity');
        const rarityPanelContainer = document.getElementById('figurine-rarity-container');
        const btnCloseRarityPanel = document.getElementById('btn-close-rarity-panel');

        if (btnFigurineRarity) {
            btnFigurineRarity.addEventListener('click', () => {
                if (window.AdminFigurine) {
                    window.AdminFigurine.openRarityPanel();
                }
            });
        }

        if (btnCloseRarityPanel && rarityPanelContainer) {
            btnCloseRarityPanel.addEventListener('click', () => {
                rarityPanelContainer.classList.add('hidden');
            });
        }

        // Accesso rapido Dashboard squadre
        const btnDashboardMucche = document.getElementById('btn-dashboard-mucche');
        if (btnDashboardMucche) {
            btnDashboardMucche.addEventListener('click', () => goToTeamDashboardByName('MuccheMannare'));
        }

        const btnDashboardSchalke = document.getElementById('btn-dashboard-schalke');
        if (btnDashboardSchalke) {
            btnDashboardSchalke.addEventListener('click', () => goToTeamDashboardByName('Schalke104'));
        }

        // Toggle Crediti Super Seri
        const btnToggleCSS = document.getElementById('btn-toggle-css');
        if (btnToggleCSS) {
            btnToggleCSS.addEventListener('click', handleToggleCSS);
        }

        // Bottoni CoppaSeriA
        const btnGenerateCupSchedule = document.getElementById('btn-generate-cup-schedule');
        if (btnGenerateCupSchedule) {
            btnGenerateCupSchedule.addEventListener('click', handleGenerateCupSchedule);
        }

        const btnViewCupBracket = document.getElementById('btn-view-cup-bracket');
        if (btnViewCupBracket) {
            btnViewCupBracket.addEventListener('click', handleViewCupBracket);
        }

        // Bottone genera calendario SerieSeriA
        const btnGenerateChampionshipSchedule = document.getElementById('btn-generate-championship-schedule');
        if (btnGenerateChampionshipSchedule) {
            btnGenerateChampionshipSchedule.addEventListener('click', () => {
                // Apri il pannello impostazioni campionato per generare il calendario
                if (window.showScreen) {
                    window.showScreen(championshipContent);
                    document.dispatchEvent(new CustomEvent('championshipPanelLoaded'));
                }
            });
        }

        // Carica stato campionato, coppa, supercoppa (automazione si carica solo quando apri il menu)
        loadSerieSeriaStatus();
        loadSerieSeriaStandings();
        loadSerieSeriaNextRound();
        loadCupStatus();
        loadSupercoppPanel();
        // loadAutomationPanel(); // Non caricare automaticamente, si carica al click sul menu
    };

    /**
     * Vai alla dashboard di una squadra cercandola per nome
     * Setta un flag per mostrare il bottone "Torna al Pannello Admin"
     */
    const goToTeamDashboardByName = async (teamName) => {
        try {
            const { collection, getDocs, query, where } = firestoreTools;

            // Cerca la squadra per nome
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
            let foundTeamId = null;

            teamsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.teamName === teamName) {
                    foundTeamId = doc.id;
                }
            });

            if (!foundTeamId) {
                alert(`Squadra "${teamName}" non trovata!`);
                return;
            }

            // Setta il flag per mostrare il bottone "Torna al Pannello Admin"
            window.accessedFromAdminPanel = true;

            // Usa la funzione viewTeamDashboard di AdminTeams
            if (window.AdminTeams && window.AdminTeams.viewTeamDashboard) {
                await window.AdminTeams.viewTeamDashboard(foundTeamId, TEAMS_COLLECTION_PATH);
            } else {
                alert('Modulo AdminTeams non disponibile');
            }

        } catch (error) {
            console.error(`Errore nel caricamento dashboard ${teamName}:`, error);
            alert(`Errore: ${error.message}`);
        }
    };

    /**
     * Fix abilita "Icona" e abilita uniche per tutte le Icone in tutte le squadre
     */
    const handleFixIconeAbility = async () => {
        const btn = document.getElementById('btn-fix-icone-ability');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Fixing...';
        }

        console.log('🔄 Inizio fix abilita icone...');

        // Mappa delle abilita uniche per ogni icona
        const ICONE_ABILITIES = {
            'croc': ['Icona', 'Fatto d\'acciaio'],
            'shik': ['Icona', 'Amici di panchina'],
            'ilcap': ['Icona', 'Calcolo delle probabilita'],
            'simo': ['Icona'],
            'dappi': ['Icona'],
            'blatta': ['Icona', 'Scheggia impazzita'],
            'antony': ['Icona', 'Avanti un altro'],
            'gladio': ['Icona', 'Continua a provare'],
            'amedemo': ['Icona', 'Tiro Dritto'],
            'flavio': ['Icona'],
            'luka': ['Icona', 'Contrasto di gomito'],
            'melio': ['Icona', 'Assist-man'],
            'markf': ['Icona', 'Osservatore'],
            'sandro': ['Icona', 'Relax'],
            'fosco': ['Icona', 'L\'uomo in piu'],
            'cocco': ['Icona', 'Stazionario']
        };

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;

            // Carica tutte le squadre
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
            const teams = teamsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Carica la lista delle Icone disponibili
            const icone = window.ICONE || [];
            const iconeIds = new Set(icone.map(i => i.id));

            let teamsFixed = 0;
            let playersFixed = 0;

            for (const team of teams) {
                if (!team.players || !Array.isArray(team.players)) continue;

                let needsUpdate = false;
                const updatedPlayers = team.players.map(player => {
                    // Verifica se il giocatore e' un'Icona (per ID o iconaId della squadra)
                    // NOTA: isCaptain e' il "capitano nominato" (bonus +1), NON l'Icona
                    const isIcona = iconeIds.has(player.id) || player.id === team.iconaId;

                    if (isIcona) {
                        // Usa le abilita definite nella mappa, o solo ['Icona'] se non trovato
                        const newAbilities = ICONE_ABILITIES[player.id] || ['Icona'];
                        const currentAbilities = Array.isArray(player.abilities) ? player.abilities : [];

                        // Controlla se le abilita sono diverse
                        const currentSorted = [...currentAbilities].sort().join(',');
                        const newSorted = [...newAbilities].sort().join(',');

                        if (currentSorted !== newSorted) {
                            needsUpdate = true;
                            playersFixed++;
                            console.log(`Fix: ${player.name} in ${team.teamName} - abilita: ${currentAbilities.join(', ')} -> ${newAbilities.join(', ')}`);
                            return { ...player, abilities: newAbilities };
                        }
                    }

                    return player;
                });

                if (needsUpdate) {
                    // Aggiorna anche la formazione
                    let updatedFormation = team.formation;
                    if (updatedFormation) {
                        const playersMap = new Map(updatedPlayers.map(p => [p.id, p]));

                        if (updatedFormation.titolari) {
                            updatedFormation.titolari = updatedFormation.titolari.map(t => {
                                const updated = playersMap.get(t.id);
                                return updated ? { ...t, abilities: updated.abilities } : t;
                            });
                        }
                        if (updatedFormation.panchina) {
                            updatedFormation.panchina = updatedFormation.panchina.map(p => {
                                const updated = playersMap.get(p.id);
                                return updated ? { ...p, abilities: updated.abilities } : p;
                            });
                        }
                    }

                    // Salva su Firestore
                    const teamRef = doc(db, TEAMS_COLLECTION_PATH, team.id);
                    await updateDoc(teamRef, {
                        players: updatedPlayers,
                        formation: updatedFormation
                    });

                    teamsFixed++;
                }
            }

            if (playersFixed > 0) {
                console.log(`✅ Fix completato: ${playersFixed} icone aggiornate in ${teamsFixed} squadre`);
                alert(`✅ Aggiornate ${playersFixed} Icone in ${teamsFixed} squadre con abilita uniche!`);
            } else {
                console.log('✅ Tutte le Icone hanno gia le abilita uniche corrette');
                alert('✅ Tutte le Icone hanno gia le abilita uniche corrette');
            }

        } catch (error) {
            console.error('❌ Errore fix icone:', error);
            alert(`❌ Errore: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '👑 Fix Abilita Icone';
        }
    };

    /**
     * Gestisce il reset delle statistiche Hall of Fame
     * Mostra un modal per selezionare quale squadra resettare
     */
    const handleResetHallOfFame = async () => {
        const resultDiv = document.getElementById('reset-hof-result');

        // Carica lista squadre
        try {
            const { collection, getDocs } = firestoreTools;
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
            const teams = teamsSnapshot.docs.map(doc => ({
                id: doc.id,
                teamName: doc.data().teamName || doc.id
            })).filter(t => t.teamName);

            // Crea modal
            const existingModal = document.getElementById('reset-hof-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.id = 'reset-hof-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-gray-900 rounded-lg w-full max-w-md mx-4 border-2 border-red-500">
                    <div class="bg-gradient-to-r from-red-700 to-red-500 p-4 rounded-t-lg flex items-center justify-between">
                        <h2 class="text-xl font-bold text-white">🏛️ Reset Hall of Fame</h2>
                        <button id="btn-close-reset-hof" class="text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
                    </div>

                    <div class="p-6">
                        <p class="text-gray-300 mb-4">Seleziona la squadra di cui vuoi resettare le statistiche:</p>

                        <select id="reset-hof-team-select" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4">
                            <option value="__ALL__">⚠️ TUTTE LE SQUADRE</option>
                            ${teams.map(t => `<option value="${t.id}">${t.teamName}</option>`).join('')}
                        </select>

                        <div class="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3 mb-4">
                            <p class="text-yellow-400 text-sm">⚠️ <strong>Attenzione:</strong> Questa azione cancellera:</p>
                            <ul class="text-yellow-300 text-xs mt-2 space-y-1 list-disc ml-4">
                                <li>Storico partite (matchHistory)</li>
                                <li>Trofei (campionati, coppe, supercoppe)</li>
                                <li>Statistiche giocatori (goal, assist, MVP, ecc.)</li>
                            </ul>
                        </div>

                        <div class="flex gap-4">
                            <button id="btn-confirm-reset-hof" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">
                                Conferma Reset
                            </button>
                            <button id="btn-cancel-reset-hof" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">
                                Annulla
                            </button>
                        </div>

                        <p id="reset-hof-message" class="text-center mt-3 text-sm"></p>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Event listeners
            const closeModal = () => modal.remove();

            document.getElementById('btn-close-reset-hof').addEventListener('click', closeModal);
            document.getElementById('btn-cancel-reset-hof').addEventListener('click', closeModal);

            document.getElementById('btn-confirm-reset-hof').addEventListener('click', async () => {
                const select = document.getElementById('reset-hof-team-select');
                const msgEl = document.getElementById('reset-hof-message');
                const confirmBtn = document.getElementById('btn-confirm-reset-hof');
                const selectedValue = select.value;

                // Conferma extra per reset di TUTTE le squadre
                if (selectedValue === '__ALL__') {
                    const confirmAll = confirm('⚠️ ATTENZIONE!\n\nStai per cancellare TUTTE le statistiche Hall of Fame di TUTTE le squadre.\n\nQuesta azione è IRREVERSIBILE!\n\nSei sicuro di voler procedere?');
                    if (!confirmAll) {
                        return;
                    }
                }

                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Reset in corso...';
                msgEl.textContent = '';
                msgEl.className = 'text-center mt-3 text-sm';

                try {
                    if (selectedValue === '__ALL__') {
                        // Reset TUTTE le squadre
                        const results = await window.resetAllStats();
                        msgEl.textContent = `Reset completato: ${results.hallOfFame} squadre, ${results.playerStats} statistiche giocatori`;
                        msgEl.className = 'text-center mt-3 text-sm text-green-400';
                    } else {
                        // Reset singola squadra
                        const selectedTeam = teams.find(t => t.id === selectedValue);
                        const teamName = selectedTeam?.teamName || selectedValue;

                        // Reset Hall of Fame della squadra
                        await window.resetTeamHallOfFame(teamName);

                        // Reset statistiche giocatori della squadra
                        const { collection: coll, getDocs: gd, doc: d, deleteDoc: dd } = firestoreTools;
                        const playerStatsPath = `${TEAMS_COLLECTION_PATH}/${selectedValue}/playerStats`;
                        try {
                            const playerStatsRef = coll(db, playerStatsPath);
                            const playerStatsSnapshot = await gd(playerStatsRef);
                            let deleted = 0;
                            for (const pDoc of playerStatsSnapshot.docs) {
                                await dd(d(db, playerStatsPath, pDoc.id));
                                deleted++;
                            }
                            msgEl.textContent = `Reset completato per "${teamName}": HoF + ${deleted} stats giocatori`;
                        } catch (e) {
                            msgEl.textContent = `Reset HoF completato per "${teamName}"`;
                        }
                        msgEl.className = 'text-center mt-3 text-sm text-green-400';
                    }

                    // Aggiorna risultato nella pagina admin
                    if (resultDiv) {
                        resultDiv.textContent = 'Reset completato!';
                        resultDiv.className = 'flex items-center justify-center text-sm text-green-400 font-bold';
                        setTimeout(() => {
                            resultDiv.textContent = 'Resetta statistiche di una o tutte le squadre';
                            resultDiv.className = 'flex items-center justify-center text-sm text-gray-400';
                        }, 3000);
                    }

                    // Chiudi modal dopo 2 secondi
                    setTimeout(closeModal, 2000);

                } catch (error) {
                    console.error('Errore reset HoF:', error);
                    msgEl.textContent = `Errore: ${error.message}`;
                    msgEl.className = 'text-center mt-3 text-sm text-red-400';
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = 'Conferma Reset';
                }
            });

        } catch (error) {
            console.error('Errore caricamento squadre per reset HoF:', error);
            if (resultDiv) {
                resultDiv.textContent = `Errore: ${error.message}`;
                resultDiv.className = 'flex items-center justify-center text-sm text-red-400';
            }
        }
    };

    /**
     * Reset dell'XP di tutti i giocatori a 0 mantenendo il livello attuale
     * @param {string} teamsCollectionPath - Path della collection squadre
     */
    const resetAllPlayersExp = async (teamsCollectionPath) => {
        // Conferma
        const confirmed = confirm(
            '🔄 RESET XP GIOCATORI\n\n' +
            'Questa azione resettera l\'XP di TUTTI i giocatori a 0.\n' +
            'Il livello attuale verra mantenuto.\n\n' +
            'Sei sicuro di voler procedere?'
        );

        if (!confirmed) return;

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;

            // Carica tutte le squadre
            const teamsSnapshot = await getDocs(collection(db, teamsCollectionPath));
            let totalPlayers = 0;
            let totalTeams = 0;

            for (const teamDoc of teamsSnapshot.docs) {
                const teamData = teamDoc.data();
                let teamModified = false;
                const updates = {};

                // Reset XP di tutti i giocatori
                if (teamData.players && Array.isArray(teamData.players)) {
                    const updatedPlayers = teamData.players.map(player => {
                        const level = player.level || 1;
                        const expToNext = window.PlayerExp?.expForLevel(level) || Math.floor(100 * Math.pow(level, 1.5) * 1.15);
                        totalPlayers++;
                        return {
                            ...player,
                            exp: 0,
                            expToNextLevel: expToNext
                        };
                    });
                    updates.players = updatedPlayers;
                    teamModified = true;
                }

                // Reset XP del coach se presente
                if (teamData.coach) {
                    const coachLevel = teamData.coach.level || 1;
                    const coachExpToNext = window.PlayerExp?.expForLevel(coachLevel) || Math.floor(100 * Math.pow(coachLevel, 1.5) * 1.15);
                    updates.coach = {
                        ...teamData.coach,
                        exp: 0,
                        expToNextLevel: coachExpToNext
                    };
                    teamModified = true;
                }

                // Reset anche playersExp e coachExp (campi separati)
                updates.playersExp = {};
                updates.coachExp = null;

                // Salva le modifiche
                if (teamModified) {
                    await updateDoc(doc(db, teamsCollectionPath, teamDoc.id), updates);
                    totalTeams++;
                }
            }

            alert(
                `🔄 Reset XP completato!\n\n` +
                `Squadre processate: ${totalTeams}\n` +
                `Giocatori resettati: ${totalPlayers}\n\n` +
                `Tutti i giocatori hanno ora 0 XP con il loro livello invariato.`
            );

            console.log(`[Admin] Reset XP completato: ${totalPlayers} giocatori in ${totalTeams} squadre`);

        } catch (error) {
            console.error('[Admin] Errore reset XP:', error);
            alert(`Errore durante il reset XP: ${error.message}`);
        }
    };

    /**
     * Gestisce l'aggiunta di +1 anno di contratto a tutti i giocatori in squadra
     */
    const handleAddContractsAll = async () => {
        // Conferma
        const confirmed = confirm(
            '📝 AGGIUNGI +1 CONTRATTO\n\n' +
            'Questa azione aggiungera +1 anno di contratto a TUTTI i giocatori che sono attualmente in una squadra.\n\n' +
            'Sei sicuro di voler procedere?'
        );
        if (!confirmed) return;

        const btn = document.getElementById('btn-add-contracts-all');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Aggiornamento...';

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));

            let teamsUpdated = 0;
            let playersUpdated = 0;

            for (const teamDoc of teamsSnapshot.docs) {
                const teamData = teamDoc.data();
                const players = teamData.players || [];

                if (players.length === 0) continue;

                let modified = false;
                const MAX_CONTRACT = window.Contracts?.MAX_CONTRACT_YEARS || 5;

                const updatedPlayers = players.map(player => {
                    // Salta le Icone (non hanno contratti)
                    const isIcona = player.abilities && player.abilities.includes('Icona');
                    if (isIcona) return player;

                    // Salta giocatori base gratuiti (liv 1, costo 0)
                    const isBasePlayer = (player.level || player.currentLevel || 1) === 1 && (player.cost === 0 || !player.cost);
                    if (isBasePlayer) return player;

                    // Aggiungi +1 al contratto (rispetta il limite massimo)
                    const currentContract = player.contract ?? player.contractYears ?? 1;
                    if (currentContract >= MAX_CONTRACT) return player; // Gia al massimo

                    player.contract = currentContract + 1;
                    if (player.contractYears !== undefined) {
                        player.contractYears = currentContract + 1;
                    }

                    // Se aveva un timer di scadenza, rimuovilo
                    if (player.contractExpireTimer) {
                        delete player.contractExpireTimer;
                    }
                    if (player.contractExpiryTimer) {
                        delete player.contractExpiryTimer;
                    }

                    modified = true;
                    playersUpdated++;
                    return player;
                });

                if (modified) {
                    await updateDoc(doc(db, TEAMS_COLLECTION_PATH, teamDoc.id), {
                        players: updatedPlayers
                    });
                    teamsUpdated++;
                }
            }

            alert(`✅ Operazione completata!\n\n${playersUpdated} giocatori aggiornati in ${teamsUpdated} squadre.`);

            if (window.Toast) {
                window.Toast.success(`+1 contratto aggiunto a ${playersUpdated} giocatori`);
            }

        } catch (error) {
            console.error('Errore aggiunta contratti:', error);
            alert(`❌ Errore: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    /**
     * Gestisce il cambio di livello per tutte le Icone
     */
    const handleSetIconeLevel = async () => {
        // Chiedi il nuovo livello
        const newLevelStr = prompt(
            '👑 SET LIVELLO ICONE\n\n' +
            'Inserisci il nuovo livello da assegnare a TUTTE le Icone (1-30):'
        );

        if (!newLevelStr) return;

        const newLevel = parseInt(newLevelStr, 10);
        if (isNaN(newLevel) || newLevel < 1 || newLevel > 30) {
            alert('❌ Livello non valido. Inserisci un numero tra 1 e 30.');
            return;
        }

        // Conferma
        const confirmed = confirm(
            `👑 CONFERMA SET LIVELLO ICONE\n\n` +
            `Stai per impostare il livello di TUTTE le Icone a ${newLevel}.\n\n` +
            `Sei sicuro di voler procedere?`
        );
        if (!confirmed) return;

        const btn = document.getElementById('btn-set-icone-level');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Aggiornamento...';

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));

            let teamsUpdated = 0;
            let iconesUpdated = 0;

            for (const teamDoc of teamsSnapshot.docs) {
                const teamData = teamDoc.data();
                const players = teamData.players || [];

                if (players.length === 0) continue;

                let modified = false;
                const updatedPlayers = players.map(player => {
                    // Trova le Icone
                    const isIcona = player.abilities && player.abilities.includes('Icona');
                    if (!isIcona) return player;

                    // Aggiorna il livello
                    player.level = newLevel;
                    if (player.currentLevel !== undefined) {
                        player.currentLevel = newLevel;
                    }

                    modified = true;
                    iconesUpdated++;
                    return player;
                });

                if (modified) {
                    await updateDoc(doc(db, TEAMS_COLLECTION_PATH, teamDoc.id), {
                        players: updatedPlayers
                    });
                    teamsUpdated++;
                }
            }

            alert(`✅ Operazione completata!\n\n${iconesUpdated} Icone aggiornate a livello ${newLevel} in ${teamsUpdated} squadre.`);

            if (window.Toast) {
                window.Toast.success(`${iconesUpdated} Icone impostate a livello ${newLevel}`);
            }

        } catch (error) {
            console.error('Errore set livello icone:', error);
            alert(`❌ Errore: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    /**
     * Gestisce la rimozione di -1 anno di contratto a tutti i giocatori in squadra
     */
    const handleRemoveContractsAll = async () => {
        // Conferma
        const confirmed = confirm(
            '📝 RIMUOVI -1 CONTRATTO\n\n' +
            'Questa azione rimuovera 1 anno di contratto a TUTTI i giocatori che sono attualmente in una squadra.\n\n' +
            'I giocatori con contratto 0 avranno il timer di scadenza attivato.\n\n' +
            'Sei sicuro di voler procedere?'
        );
        if (!confirmed) return;

        const btn = document.getElementById('btn-remove-contracts-all');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Aggiornamento...';

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));

            let teamsUpdated = 0;
            let playersUpdated = 0;
            let timersStarted = 0;

            const CONTRACT_EXPIRE_TIMER_MS = window.Contracts?.CONTRACT_EXPIRE_TIMER_MS || (48 * 60 * 60 * 1000);

            for (const teamDoc of teamsSnapshot.docs) {
                const teamData = teamDoc.data();
                const players = teamData.players || [];

                if (players.length === 0) continue;

                let modified = false;

                const updatedPlayers = players.map(player => {
                    // Salta le Icone (non hanno contratti)
                    const isIcona = player.abilities && player.abilities.includes('Icona');
                    if (isIcona) return player;

                    // Salta giocatori base gratuiti (liv 1, costo 0)
                    const isBasePlayer = (player.level || player.currentLevel || 1) === 1 && (player.cost === 0 || !player.cost);
                    if (isBasePlayer) return player;

                    // Salta giocatori che hanno gia il timer attivo
                    if (player.contractExpireTimer) return player;

                    // Rimuovi -1 al contratto
                    const currentContract = player.contract ?? 1;
                    const newContract = currentContract - 1;

                    if (newContract <= 0) {
                        // Attiva timer scadenza
                        player.contract = 0;
                        player.contractExpireTimer = Date.now() + CONTRACT_EXPIRE_TIMER_MS;
                        timersStarted++;
                    } else {
                        player.contract = newContract;
                    }

                    modified = true;
                    playersUpdated++;
                    return player;
                });

                if (modified) {
                    await updateDoc(doc(db, TEAMS_COLLECTION_PATH, teamDoc.id), {
                        players: updatedPlayers
                    });
                    teamsUpdated++;
                }
            }

            alert(`✅ Operazione completata!\n\n${playersUpdated} giocatori aggiornati in ${teamsUpdated} squadre.\n${timersStarted} timer di scadenza attivati.`);

            if (window.Toast) {
                window.Toast.success(`-1 contratto rimosso a ${playersUpdated} giocatori`);
            }

        } catch (error) {
            console.error('Errore rimozione contratti:', error);
            alert(`❌ Errore: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    /**
     * Gestisce il reset di tutti i contratti a 1
     */
    const handleResetContractsAll = async () => {
        // Conferma
        const confirmed = confirm(
            '📝 RESET CONTRATTI A 1\n\n' +
            'Questa azione impostera tutti i contratti a 1 anno per TUTTI i giocatori in squadra.\n\n' +
            'I timer di scadenza verranno rimossi.\n\n' +
            'Sei sicuro di voler procedere?'
        );
        if (!confirmed) return;

        const btn = document.getElementById('btn-reset-contracts-all');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Aggiornamento...';

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));

            let teamsUpdated = 0;
            let playersUpdated = 0;

            for (const teamDoc of teamsSnapshot.docs) {
                const teamData = teamDoc.data();
                const players = teamData.players || [];

                if (players.length === 0) continue;

                let modified = false;

                const updatedPlayers = players.map(player => {
                    // Salta le Icone (non hanno contratti)
                    const isIcona = player.abilities && player.abilities.includes('Icona');
                    if (isIcona) return player;

                    // Salta giocatori base gratuiti (liv 1, costo 0)
                    const isBasePlayer = (player.level || player.currentLevel || 1) === 1 && (player.cost === 0 || !player.cost);
                    if (isBasePlayer) return player;

                    // Imposta contratto a 1
                    player.contract = 1;

                    // Rimuovi timer di scadenza se presente
                    if (player.contractExpireTimer) {
                        delete player.contractExpireTimer;
                    }

                    modified = true;
                    playersUpdated++;
                    return player;
                });

                if (modified) {
                    await updateDoc(doc(db, TEAMS_COLLECTION_PATH, teamDoc.id), {
                        players: updatedPlayers
                    });
                    teamsUpdated++;
                }
            }

            alert(`✅ Operazione completata!\n\n${playersUpdated} giocatori impostati a contratto 1 in ${teamsUpdated} squadre.`);

            if (window.Toast) {
                window.Toast.success(`${playersUpdated} contratti resettati a 1`);
            }

        } catch (error) {
            console.error('Errore reset contratti:', error);
            alert(`❌ Errore: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    /**
     * Reset timer pacchetti figurine gratis per tutte le squadre
     */
    const handleResetFigurineTimer = async () => {
        const confirmed = confirm(
            '🃏 RESET TIMER PACCHETTI FIGURINE\n\n' +
            'Questa azione resettera il cooldown dei pacchetti gratis\n' +
            'per TUTTE le squadre che hanno un album figurine.\n\n' +
            'Tutti potranno aprire subito un pacchetto gratis.\n\n' +
            'Sei sicuro di voler procedere?'
        );
        if (!confirmed) return;

        const btn = document.getElementById('btn-reset-figurine-timer');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Reset...';

        try {
            const { collection, getDocs, updateDoc, doc, deleteField } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const FIGURINE_PATH = `artifacts/${appId}/public/data/figurine`;

            const figurineSnapshot = await getDocs(collection(db, FIGURINE_PATH));

            let resetCount = 0;
            for (const figurineDoc of figurineSnapshot.docs) {
                const data = figurineDoc.data();
                if (data.lastFreePack) {
                    await updateDoc(doc(db, FIGURINE_PATH, figurineDoc.id), {
                        lastFreePack: deleteField()
                    });
                    resetCount++;
                }
            }

            alert(`✅ Timer resettato per ${resetCount} squadre!`);

            if (window.Toast) {
                window.Toast.success(`Timer figurine resettato per ${resetCount} squadre`);
            }

        } catch (error) {
            console.error('Errore reset timer figurine:', error);
            alert(`❌ Errore: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    /**
     * Gestisce l'annullamento di emergenza di Campionato e Coppa
     * Cancella calendario, classifica e tabellone coppa SENZA assegnare premi
     */
    const handleEmergencyCancelCompetitions = async () => {
        // Prima conferma
        const confirm1 = confirm(
            '⚠️ EMERGENZA - ANNULLAMENTO COMPETIZIONI\n\n' +
            'Questa azione cancellera:\n' +
            '- Calendario del Campionato\n' +
            '- Classifica del Campionato\n' +
            '- Tabellone della Coppa\n\n' +
            'NESSUN PREMIO VERRA ASSEGNATO!\n\n' +
            'Sei sicuro di voler procedere?'
        );
        if (!confirm1) return;

        // Seconda conferma di sicurezza
        const confirm2 = confirm(
            '🚨 CONFERMA FINALE\n\n' +
            'Stai per ANNULLARE completamente:\n' +
            '- SerieSeriA (Campionato)\n' +
            '- CoppaSeriA\n\n' +
            'Questa azione e IRREVERSIBILE!\n\n' +
            'Digita "ANNULLA" per confermare.'
        );
        if (!confirm2) return;

        const userInput = prompt('Digita "ANNULLA" per confermare l\'operazione:');
        if (userInput !== 'ANNULLA') {
            alert('Operazione annullata. Input non corretto.');
            return;
        }

        const btn = document.getElementById('btn-emergency-cancel-competitions');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Annullamento in corso...';

            const { doc, deleteDoc, setDoc, getDoc } = firestoreTools;

            // 1. Cancella calendario Campionato
            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, 'full_schedule');
            try {
                await deleteDoc(scheduleDocRef);
                console.log('[EMERGENZA] Calendario campionato cancellato');
            } catch (e) {
                console.warn('[EMERGENZA] Errore cancellazione calendario:', e.message);
            }

            // 2. Cancella classifica Campionato
            const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, 'standings');
            try {
                await deleteDoc(leaderboardDocRef);
                console.log('[EMERGENZA] Classifica campionato cancellata');
            } catch (e) {
                console.warn('[EMERGENZA] Errore cancellazione classifica:', e.message);
            }

            // 3. Cancella tabellone Coppa (usando CoppaSchedule se disponibile)
            if (window.CoppaSchedule && window.CoppaSchedule.deleteCupSchedule) {
                try {
                    await window.CoppaSchedule.deleteCupSchedule();
                    console.log('[EMERGENZA] Tabellone coppa cancellato');
                } catch (e) {
                    console.warn('[EMERGENZA] Errore cancellazione tabellone coppa:', e.message);
                }
            } else {
                // Fallback manuale
                const cupDocRef = doc(db, `artifacts/${firestoreTools.appId}/public/data/cup`, 'bracket');
                try {
                    await deleteDoc(cupDocRef);
                    console.log('[EMERGENZA] Tabellone coppa cancellato (fallback)');
                } catch (e) {
                    console.warn('[EMERGENZA] Errore cancellazione tabellone coppa (fallback):', e.message);
                }
            }

            // 4. Aggiorna config per segnalare che le competizioni sono terminate
            const configDocRef = doc(db, CONFIG_COLLECTION_PATH, 'settings');
            try {
                const configDoc = await getDoc(configDocRef);
                const currentConfig = configDoc.exists() ? configDoc.data() : {};
                await setDoc(configDocRef, {
                    ...currentConfig,
                    isCupOver: true,
                    cupWinner: null,
                    isChampionshipOver: true,
                    championshipWinner: null,
                    competitionsCancelledAt: new Date().toISOString(),
                    competitionsCancelledReason: 'emergency'
                });
                console.log('[EMERGENZA] Config aggiornata');
            } catch (e) {
                console.warn('[EMERGENZA] Errore aggiornamento config:', e.message);
            }

            // 5. Disattiva automazione simulazioni se attiva
            if (window.AutoSimulation && window.AutoSimulation.disable) {
                try {
                    await window.AutoSimulation.disable();
                    console.log('[EMERGENZA] Automazione simulazioni disattivata');
                } catch (e) {
                    console.warn('[EMERGENZA] Errore disattivazione automazione:', e.message);
                }
            }

            alert(
                '✅ ANNULLAMENTO COMPLETATO\n\n' +
                'Sono stati cancellati:\n' +
                '- Calendario Campionato\n' +
                '- Classifica Campionato\n' +
                '- Tabellone Coppa\n\n' +
                'Nessun premio e stato assegnato.\n' +
                'Ricarica la pagina per vedere le modifiche.'
            );

            // Ricarica la pagina dopo 1 secondo
            setTimeout(() => location.reload(), 1000);

        } catch (error) {
            console.error('[EMERGENZA] Errore durante annullamento:', error);
            alert('❌ Errore durante l\'annullamento: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    /**
     * Setup listeners per il test di simulazione partita
     */
    const setupTestSimulationListeners = () => {
        const btnTestSimulation = document.getElementById('btn-test-simulation');
        const modal = document.getElementById('test-simulation-modal');
        const btnClose = document.getElementById('btn-close-test-simulation');
        const btnRun = document.getElementById('btn-run-test-simulation');
        const homeSelect = document.getElementById('test-home-team');
        const awaySelect = document.getElementById('test-away-team');
        const resultContainer = document.getElementById('test-simulation-result');
        const scoreDiv = document.getElementById('test-simulation-score');
        const detailsDiv = document.getElementById('test-simulation-details');

        if (!btnTestSimulation || !modal) return;

        // Apri modal e carica squadre
        btnTestSimulation.addEventListener('click', async () => {
            modal.classList.remove('hidden');
            resultContainer.classList.add('hidden');

            // Carica le squadre registrate
            try {
                const { collection, getDocs } = firestoreTools;
                const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
                const teams = teamsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).filter(t => t.teamName); // Solo squadre con nome

                // Popola i dropdown
                const defaultOption = '<option value="">Seleziona squadra...</option>';
                const teamOptions = teams.map(t =>
                    `<option value="${t.id}">${t.teamName}</option>`
                ).join('');

                homeSelect.innerHTML = defaultOption + teamOptions;
                awaySelect.innerHTML = defaultOption + teamOptions;

            } catch (error) {
                console.error('Errore caricamento squadre per test:', error);
                displayMessage('Errore nel caricamento delle squadre', 'error', 'toggle-status-message');
            }
        });

        // Chiudi modal
        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Click fuori dal modal per chiuderlo
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // Esegui simulazione
        btnRun.addEventListener('click', async () => {
            const homeTeamId = homeSelect.value;
            const awayTeamId = awaySelect.value;

            if (!homeTeamId || !awayTeamId) {
                displayMessage('Seleziona entrambe le squadre', 'error', 'toggle-status-message');
                return;
            }

            if (homeTeamId === awayTeamId) {
                displayMessage('Seleziona due squadre diverse', 'error', 'toggle-status-message');
                return;
            }

            btnRun.disabled = true;
            btnRun.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Simulazione...';

            try {
                // Carica i dati completi delle squadre
                const { doc, getDoc } = firestoreTools;
                const [homeDocSnap, awayDocSnap] = await Promise.all([
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, homeTeamId)),
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, awayTeamId))
                ]);

                if (!homeDocSnap.exists() || !awayDocSnap.exists()) {
                    throw new Error('Una delle squadre non esiste');
                }

                const homeTeamData = { id: homeDocSnap.id, ...homeDocSnap.data() };
                const awayTeamData = { id: awayDocSnap.id, ...awayDocSnap.data() };

                // Verifica che le squadre abbiano formazioni
                if (!homeTeamData.formation?.titolari?.length) {
                    throw new Error(`${homeTeamData.teamName} non ha una formazione impostata`);
                }
                if (!awayTeamData.formation?.titolari?.length) {
                    throw new Error(`${awayTeamData.teamName} non ha una formazione impostata`);
                }

                // Esegui la simulazione usando ChampionshipSimulation con highlights E debug
                const result = window.ChampionshipSimulation.runSimulationWithHighlightsAndDebug(homeTeamData, awayTeamData);

                // Mostra risultato
                resultContainer.classList.remove('hidden');
                scoreDiv.textContent = `${homeTeamData.teamName} ${result.homeGoals} - ${result.awayGoals} ${awayTeamData.teamName}`;

                // Popola i log (ora con highlights e debug)
                const simpleLogContent = document.getElementById('test-simulation-simple-log-content');
                const simpleLogContainer = document.getElementById('test-simulation-simple-log');
                const detailedLogContent = document.getElementById('test-simulation-detailed-log-content');
                const detailedLogContainer = document.getElementById('test-simulation-detailed-log');
                const btnSimpleLog = document.getElementById('btn-toggle-simple-log');
                const btnDetailedLog = document.getElementById('btn-toggle-detailed-log');

                // Il log ristretto ora mostra gli Highlights (Azioni Salienti)
                if (simpleLogContent && result.highlightsText) {
                    simpleLogContent.textContent = result.highlightsText;
                }
                // Il log dettagliato ora mostra il Debug Log
                if (detailedLogContent && result.debugText) {
                    detailedLogContent.textContent = result.debugText;
                }

                // Aggiorna i titoli dei bottoni
                if (btnSimpleLog) {
                    btnSimpleLog.innerHTML = '<i class="fas fa-star mr-2"></i>Azioni Salienti';
                }
                if (btnDetailedLog) {
                    btnDetailedLog.innerHTML = '<i class="fas fa-bug mr-2"></i>Debug Log';
                }

                // Reset stato log
                if (simpleLogContainer) simpleLogContainer.classList.add('hidden');
                if (detailedLogContainer) detailedLogContainer.classList.add('hidden');

                // Handler bottone Azioni Salienti
                if (btnSimpleLog) {
                    btnSimpleLog.onclick = () => {
                        const isHidden = simpleLogContainer.classList.contains('hidden');
                        // Chiudi l'altro log se aperto
                        if (isHidden && detailedLogContainer) {
                            detailedLogContainer.classList.add('hidden');
                        }
                        simpleLogContainer.classList.toggle('hidden');
                    };
                }

                // Handler bottone Debug Log
                if (btnDetailedLog) {
                    btnDetailedLog.onclick = () => {
                        const isHidden = detailedLogContainer.classList.contains('hidden');
                        // Chiudi l'altro log se aperto
                        if (isHidden && simpleLogContainer) {
                            simpleLogContainer.classList.add('hidden');
                        }
                        detailedLogContainer.classList.toggle('hidden');
                    };
                }

                // Calcola statistiche formazione
                const getFormationStats = (teamData) => {
                    const titolari = teamData.formation?.titolari || [];
                    const playersFormStatus = teamData.playersFormStatus || {};

                    let totalLevel = 0;
                    const playerDetails = titolari.map(p => {
                        const form = playersFormStatus[p.id];
                        const currentLevel = form?.level || p.level || 1;
                        totalLevel += currentLevel;
                        return {
                            name: p.name,
                            role: p.role,
                            baseLevel: p.level || 1,
                            currentLevel: currentLevel,
                            formMod: form?.mod || 0
                        };
                    });

                    // Ordina per ruolo (P, D, C, A) e poi per livello decrescente
                    const roleOrder = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
                    playerDetails.sort((a, b) => {
                        const roleA = roleOrder[a.role] ?? 4;
                        const roleB = roleOrder[b.role] ?? 4;
                        if (roleA !== roleB) return roleA - roleB;
                        return b.currentLevel - a.currentLevel;
                    });

                    return {
                        avgLevel: titolari.length > 0 ? (totalLevel / titolari.length).toFixed(1) : '?',
                        players: playerDetails
                    };
                };

                const homeStats = getFormationStats(homeTeamData);
                const awayStats = getFormationStats(awayTeamData);

                // Determina vincitore
                let winnerText = '';
                if (result.homeGoals > result.awayGoals) {
                    winnerText = `<span class="text-green-400 font-bold">Vince ${homeTeamData.teamName}!</span>`;
                } else if (result.awayGoals > result.homeGoals) {
                    winnerText = `<span class="text-green-400 font-bold">Vince ${awayTeamData.teamName}!</span>`;
                } else {
                    winnerText = '<span class="text-yellow-400 font-bold">Pareggio!</span>';
                }

                detailsDiv.innerHTML = `
                    <div class="text-center mb-4">${winnerText}</div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-700 p-3 rounded">
                            <p class="font-bold text-blue-400 mb-2">${homeTeamData.teamName}</p>
                            <p class="text-xs">Livello medio: <span class="text-yellow-400 font-bold">${homeStats.avgLevel}</span></p>
                            <p class="text-xs text-gray-400 mt-1">Titolari:</p>
                            <ul class="text-xs mt-1 space-y-1">
                                ${homeStats.players.map(p => `
                                    <li class="flex justify-between">
                                        <span>${p.role} - ${p.name}</span>
                                        <span class="${p.formMod > 0 ? 'text-green-400' : p.formMod < 0 ? 'text-red-400' : 'text-gray-400'}">
                                            Lv.${p.currentLevel} ${p.formMod !== 0 ? `(${p.formMod > 0 ? '+' : ''}${p.formMod})` : ''}
                                        </span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="bg-gray-700 p-3 rounded">
                            <p class="font-bold text-red-400 mb-2">${awayTeamData.teamName}</p>
                            <p class="text-xs">Livello medio: <span class="text-yellow-400 font-bold">${awayStats.avgLevel}</span></p>
                            <p class="text-xs text-gray-400 mt-1">Titolari:</p>
                            <ul class="text-xs mt-1 space-y-1">
                                ${awayStats.players.map(p => `
                                    <li class="flex justify-between">
                                        <span>${p.role} - ${p.name}</span>
                                        <span class="${p.formMod > 0 ? 'text-green-400' : p.formMod < 0 ? 'text-red-400' : 'text-gray-400'}">
                                            Lv.${p.currentLevel} ${p.formMod !== 0 ? `(${p.formMod > 0 ? '+' : ''}${p.formMod})` : ''}
                                        </span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 text-center mt-3">Simulazione basata su 40 occasioni per squadra</p>
                `;

                // Gestione bottoni animazione
                const animationButtonsContainer = document.getElementById('test-simulation-animation-buttons');
                const btnTestReplay = document.getElementById('btn-test-view-replay');
                const btnTestHighlights = document.getElementById('btn-test-view-highlights');

                const fullAnimEnabled = window.FeatureFlags?.isEnabled('matchAnimations');
                const highlightsEnabled = window.FeatureFlags?.isEnabled('matchHighlights');

                if (fullAnimEnabled || highlightsEnabled) {
                    animationButtonsContainer.classList.remove('hidden');

                    // Mostra/nascondi bottoni in base ai flag
                    if (btnTestReplay) {
                        if (fullAnimEnabled) {
                            btnTestReplay.classList.remove('hidden');
                            btnTestReplay.onclick = () => {
                                modal.classList.add('hidden');
                                if (window.MatchAnimations) {
                                    window.MatchAnimations.open({
                                        homeTeam: homeTeamData,
                                        awayTeam: awayTeamData,
                                        result: `${result.homeGoals}-${result.awayGoals}`,
                                        highlightsOnly: false
                                    });
                                }
                            };
                        } else {
                            btnTestReplay.classList.add('hidden');
                        }
                    }

                    if (btnTestHighlights) {
                        if (highlightsEnabled) {
                            btnTestHighlights.classList.remove('hidden');
                            btnTestHighlights.onclick = () => {
                                modal.classList.add('hidden');
                                if (window.MatchAnimations) {
                                    window.MatchAnimations.open({
                                        homeTeam: homeTeamData,
                                        awayTeam: awayTeamData,
                                        result: `${result.homeGoals}-${result.awayGoals}`,
                                        highlightsOnly: true
                                    });
                                }
                            };
                        } else {
                            btnTestHighlights.classList.add('hidden');
                        }
                    }
                } else {
                    animationButtonsContainer.classList.add('hidden');
                }

                // Gestione matchEvents (Espandi Eventi Partita)
                const eventsSection = document.getElementById('test-simulation-events-section');
                const btnExpandEvents = document.getElementById('btn-expand-events-test');
                const eventsContainer = document.getElementById('test-simulation-events-container');

                if (eventsSection && result.matchEvents && result.matchEvents.length > 0) {
                    eventsSection.classList.remove('hidden');

                    if (btnExpandEvents) {
                        btnExpandEvents.onclick = () => {
                            if (eventsContainer.classList.contains('hidden')) {
                                eventsContainer.classList.remove('hidden');
                                if (window.MatchReplaySimple) {
                                    eventsContainer.innerHTML = window.MatchReplaySimple.renderMatchEvents(result.matchEvents);
                                    // Aggiungi listener per expand/collapse occasioni
                                    eventsContainer.querySelectorAll('.occasion-header').forEach(header => {
                                        header.addEventListener('click', () => {
                                            const details = header.nextElementSibling;
                                            if (details) {
                                                details.classList.toggle('hidden');
                                                const arrow = header.querySelector('.arrow');
                                                if (arrow) {
                                                    arrow.textContent = details.classList.contains('hidden') ? '▶' : '▼';
                                                }
                                            }
                                        });
                                    });
                                }
                                btnExpandEvents.innerHTML = '<span>📊</span> Chiudi Eventi Partita';
                            } else {
                                eventsContainer.classList.add('hidden');
                                eventsContainer.innerHTML = '';
                                btnExpandEvents.innerHTML = '<span>📊</span> Espandi Eventi Partita';
                            }
                        };
                    }
                } else if (eventsSection) {
                    eventsSection.classList.add('hidden');
                }

                console.log('Test simulazione completato:', {
                    home: homeTeamData.teamName,
                    away: awayTeamData.teamName,
                    result: result
                });

            } catch (error) {
                console.error('Errore nella simulazione test:', error);
                displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
                resultContainer.classList.add('hidden');
            } finally {
                btnRun.disabled = false;
                btnRun.innerHTML = 'Simula Partita';
            }
        });
    };

    /**
     * Setup listener per creazione oggetti
     */
    const setupCreateObjectsListener = () => {
        const btnCreateObjects = document.getElementById('btn-create-objects');
        if (btnCreateObjects) {
            btnCreateObjects.addEventListener('click', () => {
                if (window.AdminObjects?.showObjectManagerModal) {
                    window.AdminObjects.showObjectManagerModal();
                } else {
                    console.error('[Admin] Modulo AdminObjects non disponibile');
                    displayMessage('Modulo AdminObjects non caricato', 'error', 'toggle-status-message');
                }
            });
        }
    };

    /**
     * Setup listeners per il test di simulazione con nuove regole
     */
    const setupTestSimulationNewRulesListeners = () => {
        const btnTestSimulation = document.getElementById('btn-test-simulation-new-rules');
        const modal = document.getElementById('test-simulation-new-rules-modal');
        const btnClose = document.getElementById('btn-close-test-new-simulation');
        const btnRun = document.getElementById('btn-run-test-new-simulation');
        const homeSelect = document.getElementById('test-new-home-team');
        const awaySelect = document.getElementById('test-new-away-team');
        const resultContainer = document.getElementById('test-new-simulation-result');
        const scoreDiv = document.getElementById('test-new-simulation-score');

        if (!btnTestSimulation || !modal) return;

        // Apri modal e carica squadre
        btnTestSimulation.addEventListener('click', async () => {
            modal.classList.remove('hidden');
            resultContainer.classList.add('hidden');

            try {
                const { collection, getDocs } = firestoreTools;
                const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
                const teams = teamsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).filter(t => t.teamName);

                const defaultOption = '<option value="">Seleziona squadra...</option>';
                const teamOptions = teams.map(t =>
                    `<option value="${t.id}">${t.teamName}</option>`
                ).join('');

                homeSelect.innerHTML = defaultOption + teamOptions;
                awaySelect.innerHTML = defaultOption + teamOptions;

            } catch (error) {
                console.error('Errore caricamento squadre per test nuove regole:', error);
                displayMessage('Errore nel caricamento delle squadre', 'error', 'toggle-status-message');
            }
        });

        // Chiudi modal
        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // Esegui simulazione con nuove regole
        btnRun.addEventListener('click', async () => {
            const homeTeamId = homeSelect.value;
            const awayTeamId = awaySelect.value;

            if (!homeTeamId || !awayTeamId) {
                displayMessage('Seleziona entrambe le squadre', 'error', 'toggle-status-message');
                return;
            }

            if (homeTeamId === awayTeamId) {
                displayMessage('Seleziona due squadre diverse', 'error', 'toggle-status-message');
                return;
            }

            btnRun.disabled = true;
            btnRun.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Simulazione...';

            try {
                const { doc, getDoc } = firestoreTools;
                const [homeDocSnap, awayDocSnap] = await Promise.all([
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, homeTeamId)),
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, awayTeamId))
                ]);

                if (!homeDocSnap.exists() || !awayDocSnap.exists()) {
                    throw new Error('Una delle squadre non esiste');
                }

                const homeTeamData = { id: homeDocSnap.id, ...homeDocSnap.data() };
                const awayTeamData = { id: awayDocSnap.id, ...awayDocSnap.data() };

                if (!homeTeamData.formation?.titolari?.length) {
                    throw new Error(`${homeTeamData.teamName} non ha una formazione impostata`);
                }
                if (!awayTeamData.formation?.titolari?.length) {
                    throw new Error(`${awayTeamData.teamName} non ha una formazione impostata`);
                }

                // Espandi i dati della formazione dalla rosa (recupera name, type, etc.)
                const expandFormation = window.GestioneSquadreUtils?.expandFormationFromRosa;
                if (expandFormation) {
                    homeTeamData.formation.titolari = expandFormation(homeTeamData.formation.titolari, homeTeamData.players || []);
                    homeTeamData.formation.panchina = expandFormation(homeTeamData.formation.panchina || [], homeTeamData.players || []);
                    awayTeamData.formation.titolari = expandFormation(awayTeamData.formation.titolari, awayTeamData.players || []);
                    awayTeamData.formation.panchina = expandFormation(awayTeamData.formation.panchina || [], awayTeamData.players || []);
                }

                // Esegui la simulazione con NUOVE REGOLE
                const result = window.SimulazioneNuoveRegole.runSimulationWithLog(homeTeamData, awayTeamData);

                // Mostra risultato
                resultContainer.classList.remove('hidden');
                scoreDiv.textContent = `${homeTeamData.teamName} ${result.homeGoals} - ${result.awayGoals} ${awayTeamData.teamName}`;

                // Popola i log
                const simpleLogContent = document.getElementById('test-new-simulation-simple-log-content');
                const simpleLogContainer = document.getElementById('test-new-simulation-simple-log');
                const detailedLogContent = document.getElementById('test-new-simulation-detailed-log-content');
                const detailedLogContainer = document.getElementById('test-new-simulation-detailed-log');
                const btnSimpleLog = document.getElementById('btn-toggle-new-simple-log');
                const btnDetailedLog = document.getElementById('btn-toggle-new-detailed-log');

                if (simpleLogContent && result.simpleLog) {
                    simpleLogContent.textContent = result.simpleLog.join('\n');
                }
                if (detailedLogContent && result.log) {
                    detailedLogContent.textContent = result.log.join('\n');
                }

                // Reset stato log
                if (simpleLogContainer) simpleLogContainer.classList.add('hidden');
                if (detailedLogContainer) detailedLogContainer.classList.add('hidden');

                // Handler bottone log ristretto
                if (btnSimpleLog) {
                    btnSimpleLog.onclick = () => {
                        const isHidden = simpleLogContainer.classList.contains('hidden');
                        if (isHidden && detailedLogContainer) {
                            detailedLogContainer.classList.add('hidden');
                        }
                        simpleLogContainer.classList.toggle('hidden');
                    };
                }

                // Handler bottone log dettagliato
                if (btnDetailedLog) {
                    btnDetailedLog.onclick = () => {
                        const isHidden = detailedLogContainer.classList.contains('hidden');
                        if (isHidden && simpleLogContainer) {
                            simpleLogContainer.classList.add('hidden');
                        }
                        detailedLogContainer.classList.toggle('hidden');
                    };
                }

                // Gestione matchEvents (Espandi Eventi Partita) - se disponibili
                const eventsSection = document.getElementById('test-new-simulation-events-section');
                const btnExpandEvents = document.getElementById('btn-expand-events-new-test');
                const eventsContainer = document.getElementById('test-new-simulation-events-container');

                if (eventsSection && result.matchEvents && result.matchEvents.length > 0) {
                    eventsSection.classList.remove('hidden');

                    if (btnExpandEvents) {
                        btnExpandEvents.onclick = () => {
                            if (eventsContainer.classList.contains('hidden')) {
                                eventsContainer.classList.remove('hidden');
                                if (window.MatchReplaySimple) {
                                    eventsContainer.innerHTML = window.MatchReplaySimple.renderMatchEvents(result.matchEvents);
                                    eventsContainer.querySelectorAll('.occasion-header').forEach(header => {
                                        header.addEventListener('click', () => {
                                            const details = header.nextElementSibling;
                                            if (details) {
                                                details.classList.toggle('hidden');
                                                const arrow = header.querySelector('.arrow');
                                                if (arrow) {
                                                    arrow.textContent = details.classList.contains('hidden') ? '▶' : '▼';
                                                }
                                            }
                                        });
                                    });
                                }
                                btnExpandEvents.innerHTML = '<span>📊</span> Chiudi Eventi Partita';
                            } else {
                                eventsContainer.classList.add('hidden');
                                eventsContainer.innerHTML = '';
                                btnExpandEvents.innerHTML = '<span>📊</span> Espandi Eventi Partita';
                            }
                        };
                    }
                } else if (eventsSection) {
                    eventsSection.classList.add('hidden');
                }

                console.log('Test simulazione NUOVE REGOLE completato:', {
                    home: homeTeamData.teamName,
                    away: awayTeamData.teamName,
                    result: result
                });

            } catch (error) {
                console.error('Errore nella simulazione test nuove regole:', error);
                displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
                resultContainer.classList.add('hidden');
            } finally {
                btnRun.disabled = false;
                btnRun.innerHTML = 'Simula Partita';
            }
        });
    };

    /**
     * Carica lo stato del campionato SerieSeriA
     */
    const loadSerieSeriaStatus = async () => {
        const container = document.getElementById('serieseria-status-container');
        if (!container) return;

        try {
            const { doc, getDoc, collection, getDocs } = firestoreTools;
            const appId = firestoreTools.appId;
            const SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
            const SCHEDULE_DOC_ID = 'full_schedule';

            // Carica il calendario
            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            const scheduleDoc = await getDoc(scheduleDocRef);

            // Carica config per stato stagione
            const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);
            const isSeasonOver = configDoc.exists() ? (configDoc.data().isSeasonOver || false) : false;

            // Conta squadre partecipanti
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
            const participatingTeams = teamsSnapshot.docs.filter(doc => doc.data().isParticipating).length;

            if (!scheduleDoc.exists() || !scheduleDoc.data().matches || scheduleDoc.data().matches.length === 0) {
                container.innerHTML = `
                    <div class="text-center">
                        <p class="text-gray-400">Nessun calendario generato.</p>
                        <p class="text-green-400 font-bold mt-2">Squadre iscritte: ${participatingTeams}</p>
                        ${participatingTeams < 2 ? '<p class="text-red-400 text-xs">Servono almeno 2 squadre iscritte.</p>' : ''}
                        ${isSeasonOver ? '<p class="text-yellow-400 text-xs mt-1">Stagione terminata. Pronto per nuova generazione.</p>' : ''}
                    </div>
                `;
            } else {
                const schedule = scheduleDoc.data().matches;
                const totalRounds = schedule.length;

                // Calcola partite giocate
                let playedMatches = 0;
                let totalMatches = 0;
                schedule.forEach(round => {
                    round.matches.forEach(match => {
                        totalMatches++;
                        if (match.result) playedMatches++;
                    });
                });

                const nextRound = schedule.find(round =>
                    round.matches.some(match => match.result === null)
                );
                const isFinished = !nextRound && totalRounds > 0;

                const statusText = isSeasonOver ? 'TERMINATO' : (isFinished ? 'COMPLETATO' : 'IN CORSO');
                const statusColor = isSeasonOver ? 'text-red-400' : (isFinished ? 'text-yellow-400' : 'text-green-400');

                container.innerHTML = `
                    <div class="text-center">
                        <p class="text-gray-400">Stato: <span class="font-bold ${statusColor}">${statusText}</span></p>
                        <p class="text-green-400">Giornate: ${totalRounds} | Partite: ${playedMatches}/${totalMatches}</p>
                        ${nextRound ? `<p class="text-gray-300 mt-2">Prossima giornata: ${nextRound.round}</p>` : ''}
                        ${isFinished && !isSeasonOver ? '<p class="text-yellow-400 text-xs mt-1">Tutte le partite completate. Termina la stagione.</p>' : ''}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Errore caricamento stato SerieSeriA:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore caricamento stato campionato.</p>`;
        }
    };

    /**
     * Carica e mostra la classifica inline nella sezione SerieSeriA
     */
    const loadSerieSeriaStandings = async () => {
        const container = document.getElementById('serieseria-standings-table');
        if (!container) return;

        try {
            const leaderboardData = await window.LeaderboardListener?.getLeaderboard();
            const standings = leaderboardData?.standings || [];

            if (standings.length === 0) {
                container.innerHTML = '<p class="text-gray-400 text-center py-2">Classifica non disponibile.</p>';
                return;
            }

            let html = `
                <table class="w-full">
                    <thead class="bg-gray-800">
                        <tr>
                            <th class="py-1 px-2 text-left text-gray-400">#</th>
                            <th class="py-1 px-2 text-left text-gray-400">Squadra</th>
                            <th class="py-1 px-2 text-center text-gray-400">Pt</th>
                            <th class="py-1 px-2 text-center text-gray-400">V</th>
                            <th class="py-1 px-2 text-center text-gray-400">P</th>
                            <th class="py-1 px-2 text-center text-gray-400">S</th>
                            <th class="py-1 px-2 text-center text-gray-400">GF</th>
                            <th class="py-1 px-2 text-center text-gray-400">GS</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            standings.forEach((team, index) => {
                const pos = index + 1;
                const posColor = pos === 1 ? 'text-yellow-400' : (pos <= 3 ? 'text-green-400' : 'text-gray-300');
                html += `
                    <tr class="border-b border-gray-700 hover:bg-gray-800">
                        <td class="py-1 px-2 ${posColor} font-bold">${pos}</td>
                        <td class="py-1 px-2 text-white">${team.teamName || team.teamId}</td>
                        <td class="py-1 px-2 text-center text-green-400 font-bold">${team.points || 0}</td>
                        <td class="py-1 px-2 text-center text-gray-300">${team.wins || 0}</td>
                        <td class="py-1 px-2 text-center text-gray-300">${team.draws || 0}</td>
                        <td class="py-1 px-2 text-center text-gray-300">${team.losses || 0}</td>
                        <td class="py-1 px-2 text-center text-gray-300">${team.goalsFor || 0}</td>
                        <td class="py-1 px-2 text-center text-gray-300">${team.goalsAgainst || 0}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Errore caricamento classifica:', error);
            container.innerHTML = '<p class="text-red-400 text-center py-2">Errore caricamento.</p>';
        }
    };

    /**
     * Carica e mostra la prossima giornata nella sezione SerieSeriA
     */
    const loadSerieSeriaNextRound = async () => {
        const container = document.getElementById('serieseria-next-matches');
        if (!container) return;

        try {
            const { doc, getDoc } = firestoreTools;
            const appId = firestoreTools.appId;
            const SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;

            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, 'full_schedule');
            const scheduleDoc = await getDoc(scheduleDocRef);

            if (!scheduleDoc.exists() || !scheduleDoc.data().matches) {
                container.innerHTML = '<p class="text-gray-400">Nessun calendario.</p>';
                return;
            }

            const schedule = scheduleDoc.data().matches;
            const nextRound = schedule.find(round =>
                round.matches.some(match => match.result === null)
            );

            if (!nextRound) {
                container.innerHTML = '<p class="text-green-400 font-semibold">Tutte le partite completate!</p>';
                return;
            }

            let html = `<p class="text-yellow-300 font-bold mb-2">Giornata ${nextRound.round}</p>`;
            html += '<div class="space-y-1">';

            nextRound.matches.forEach(match => {
                if (match.result === null) {
                    html += `
                        <div class="flex items-center justify-between bg-gray-800 rounded px-2 py-1">
                            <span class="text-white">${match.homeName}</span>
                            <span class="text-gray-500 mx-2">vs</span>
                            <span class="text-white">${match.awayName}</span>
                        </div>
                    `;
                }
            });

            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Errore caricamento prossima giornata:', error);
            container.innerHTML = '<p class="text-red-400">Errore caricamento.</p>';
        }
    };

    /**
     * Gestisce la generazione del calendario coppa
     */
    const handleGenerateCupSchedule = async () => {
        const btn = document.getElementById('btn-generate-cup-schedule');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generazione...';

        try {
            const bracket = await window.CoppaMain.generateCupSchedule();
            displayMessage(`Calendario CoppaSeriA generato con ${bracket.totalTeams} squadre!`, 'success', 'toggle-status-message');
            loadCupStatus();
        } catch (error) {
            console.error('Errore generazione calendario coppa:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trophy mr-2"></i> Genera Calendario Coppa';
        }
    };

    /**
     * Avvia una nuova stagione: genera calendari campionato e coppa, poi attiva automazione
     */
    async function handleAvviaStagione() {
        const btn = document.getElementById('btn-avvia-stagione');
        if (!btn) return;

        // Conferma dall'utente
        const conferma = confirm(
            '🚀 AVVIA NUOVA STAGIONE\n\n' +
            'Questa azione:\n' +
            '1. Genera il calendario del Campionato\n' +
            '2. Genera il tabellone della Coppa\n' +
            '3. Attiva la simulazione automatica alle 20:30\n\n' +
            'Continuare?'
        );

        if (!conferma) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Avvio in corso...';

        try {
            const steps = [];

            // Step 1: Carica le squadre partecipanti
            displayMessage('Caricamento squadre partecipanti...', 'info', 'toggle-status-message');
            const { collection, getDocs } = firestoreTools;
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
            const allTeams = teamsSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().teamName,
                ...doc.data()
            }));
            const participatingTeams = allTeams.filter(t => t.isParticipating);

            if (participatingTeams.length < 2) {
                throw new Error(`Servono almeno 2 squadre partecipanti. Attualmente: ${participatingTeams.length}`);
            }

            // Step 2: Genera calendario campionato
            displayMessage('Generazione calendario campionato...', 'info', 'toggle-status-message');
            if (window.ChampionshipSchedule) {
                const schedule = window.ChampionshipSchedule.generateRoundRobinSchedule(participatingTeams);
                await window.ChampionshipSchedule.saveScheduleAndInitialize(participatingTeams, schedule);

                // Imposta la data corrente per il countdown auto-sim
                if (window.ChampionshipMain) {
                    await window.ChampionshipMain.updateLastAutoSimulatedDate(Date.now());
                }
                steps.push('Calendario Campionato generato');
            } else {
                throw new Error('Modulo ChampionshipSchedule non disponibile');
            }

            // Step 3: Genera calendario coppa
            displayMessage('Generazione tabellone coppa...', 'info', 'toggle-status-message');
            if (window.CoppaMain) {
                await window.CoppaMain.generateCupSchedule();
                steps.push('Tabellone Coppa generato');
            } else {
                throw new Error('Modulo CoppaMain non disponibile');
            }

            // Step 4: Attiva automazione simulazioni
            displayMessage('Attivazione simulazione automatica...', 'info', 'toggle-status-message');
            if (window.AutomazioneSimulazioni) {
                await window.AutomazioneSimulazioni.enableAutomation();
                steps.push('Automazione attivata (20:30)');
            } else {
                console.warn('Modulo AutomazioneSimulazioni non disponibile');
                steps.push('Automazione: modulo non disponibile');
            }

            // Successo!
            displayMessage(
                `🚀 Stagione avviata con successo!\n${steps.join(' | ')}`,
                'success',
                'toggle-status-message'
            );

            // Aggiorna gli stati nella UI
            loadSerieSeriaStatus();
            loadSerieSeriaStandings();
            loadSerieSeriaNextRound();
            loadCupStatus();

            // Se il pannello automazione e' aperto, aggiornalo
            if (window.loadAutomationPanel) {
                window.loadAutomationPanel();
            }

        } catch (error) {
            console.error('Errore avvio stagione:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '🚀 Avvia Stagione';
        }
    }

    /**
     * Mostra il pannello di simulazione completo della coppa
     */
    const handleViewCupBracket = async () => {
        const bracket = await window.CoppaSchedule.loadCupSchedule();
        const container = document.getElementById('coppa-status-container');

        if (!bracket) {
            container.innerHTML = '<p class="text-yellow-400 text-center">Nessun tabellone generato.</p>';
            return;
        }

        // Usa il nuovo pannello di simulazione completo
        await window.CoppaUI.renderSimulationPanel(bracket, container);
    };

    /**
     * Carica lo stato della coppa
     */
    const loadCupStatus = async () => {
        const container = document.getElementById('coppa-status-container');
        if (!container) return;

        try {
            const bracket = await window.CoppaSchedule.loadCupSchedule();

            if (!bracket) {
                // Conta le squadre iscritte alla coppa
                const participants = await window.CoppaSchedule.getCupParticipants();
                container.innerHTML = `
                    <div class="text-center">
                        <p class="text-gray-400">Nessun tabellone generato.</p>
                        <p class="text-purple-400 font-bold mt-2">Squadre iscritte: ${participants.length}</p>
                        ${participants.length < 2 ? '<p class="text-red-400 text-xs">Servono almeno 2 squadre iscritte.</p>' : ''}
                    </div>
                `;
            } else {
                const statusText = bracket.status === 'completed' ? 'COMPLETATA' : 'IN CORSO';
                const statusColor = bracket.status === 'completed' ? 'text-green-400' : 'text-yellow-400';
                const nextMatch = window.CoppaSchedule.findNextMatch(bracket);

                container.innerHTML = `
                    <div class="text-center">
                        <p class="text-gray-400">Stato: <span class="font-bold ${statusColor}">${statusText}</span></p>
                        <p class="text-purple-400">Squadre: ${bracket.totalTeams} | Bye: ${bracket.numByes}</p>
                        ${bracket.winner ? `<p class="text-yellow-400 font-bold mt-2">Vincitore: ${bracket.winner.teamName}</p>` : ''}
                        ${nextMatch ? `<p class="text-gray-300 mt-2">Prossima: ${nextMatch.match.homeTeam?.teamName || 'TBD'} vs ${nextMatch.match.awayTeam?.teamName || 'TBD'}</p>` : ''}
                    </div>
                `;
            }
        } catch (error) {
            container.innerHTML = `<p class="text-red-400 text-center">Errore caricamento stato coppa.</p>`;
        }
    };

    /**
     * Carica il pannello Supercoppa
     */
    const loadSupercoppPanel = () => {
        const container = document.getElementById('supercoppa-admin-section');
        if (container && window.Supercoppa) {
            window.Supercoppa.renderAdminUI(container);
        }
    };

    /**
     * Carica il pannello Automazione Simulazioni
     */
    const loadAutomationPanel = async () => {
        const container = document.getElementById('automation-status-container');
        if (!container || !window.AutomazioneSimulazioni) {
            if (container) {
                container.innerHTML = '<p class="text-red-400 text-center text-sm">Modulo automazione non disponibile</p>';
            }
            return;
        }

        try {
            const info = await window.AutomazioneSimulazioni.getAutomationInfo();

            const statusColor = info.isEnabled ? 'text-green-400' : 'text-red-400';
            const statusText = info.isEnabled ? 'ATTIVA' : 'DISATTIVA';
            const buttonColor = info.isEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
            const buttonText = info.isEnabled ? 'DISATTIVA' : 'ATTIVA';

            const nextTypeLabels = {
                'coppa_andata': 'Coppa (Andata)',
                'coppa_ritorno': 'Coppa (Ritorno)',
                'campionato': 'Campionato'
            };
            const nextTypeLabel = nextTypeLabels[info.nextSimulationType] || info.nextSimulationType;

            // Verifica se ci sono partite da giocare
            const canEnable = info.hasMatchesToPlay;

            let statusHtml = `
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-bold text-lg text-white">Stato: </span>
                            <span class="font-extrabold ${statusColor}">${statusText}</span>
                        </div>
                        <button id="btn-toggle-automation-state"
                                class="px-6 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${buttonColor} text-white ${!canEnable && !info.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${!canEnable && !info.isEnabled ? 'disabled' : ''}>
                            ${buttonText}
                        </button>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-gray-900 p-3 rounded-lg">
                            <p class="text-xs text-gray-400">Prossima simulazione</p>
                            <p class="text-lg font-bold text-teal-400">${info.isEnabled ? info.timeUntilNextSimulation.formatted : '--:--:--'}</p>
                        </div>
                        <div class="bg-gray-900 p-3 rounded-lg">
                            <p class="text-xs text-gray-400">Prossimo turno</p>
                            <p class="text-lg font-bold text-white">${nextTypeLabel}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-gray-900 p-3 rounded-lg flex items-center">
                            <span class="text-2xl mr-2">${info.hasChampionshipMatches ? '🏆' : '✅'}</span>
                            <div>
                                <p class="text-xs text-gray-400">SerieSeriA</p>
                                <p class="text-sm font-bold ${info.hasChampionshipMatches ? 'text-green-400' : 'text-gray-500'}">${info.hasChampionshipMatches ? 'Partite disponibili' : 'Completato'}</p>
                            </div>
                        </div>
                        <div class="bg-gray-900 p-3 rounded-lg flex items-center">
                            <span class="text-2xl mr-2">${info.hasCupMatches ? '🏆' : '✅'}</span>
                            <div>
                                <p class="text-xs text-gray-400">CoppaSeriA</p>
                                <p class="text-sm font-bold ${info.hasCupMatches ? 'text-purple-400' : 'text-gray-500'}">${info.hasCupMatches ? 'Partite disponibili' : 'Completata'}</p>
                            </div>
                        </div>
                    </div>

                    ${info.simulatedToday ? '<p class="text-center text-sm text-yellow-400">Simulazione di oggi gia effettuata</p>' : ''}

                    ${info.lastSimulationDate ? `<p class="text-xs text-gray-500 text-center">Ultima simulazione: ${new Date(info.lastSimulationDate).toLocaleString('it-IT')}</p>` : ''}

                    ${!canEnable ? '<p class="text-center text-sm text-orange-400">Genera i calendari di Campionato e/o Coppa per abilitare l\'automazione</p>' : ''}
                </div>
            `;

            container.innerHTML = statusHtml;

            // Aggiungi listener al pulsante toggle stato (NON l'accordion!)
            const btnToggleState = document.getElementById('btn-toggle-automation-state');
            if (btnToggleState) {
                btnToggleState.addEventListener('click', async () => {
                    btnToggleState.disabled = true;
                    btnToggleState.textContent = 'Aggiornamento...';

                    try {
                        if (info.isEnabled) {
                            await window.AutomazioneSimulazioni.disableAutomation();
                        } else {
                            await window.AutomazioneSimulazioni.enableAutomation();
                        }
                        // Ricarica il pannello
                        loadAutomationPanel();
                    } catch (error) {
                        console.error('Errore toggle automazione:', error);
                        btnToggle.textContent = 'ERRORE';
                        setTimeout(() => loadAutomationPanel(), 2000);
                    }
                });
            }

            // Aggiorna il countdown ogni secondo se l'automazione e' attiva
            if (info.isEnabled) {
                startAutomationCountdown();
            }

        } catch (error) {
            console.error('Errore caricamento pannello automazione:', error);
            container.innerHTML = '<p class="text-red-400 text-center text-sm">Errore nel caricamento</p>';
        }
    };

    let automationCountdownInterval = null;

    const startAutomationCountdown = () => {
        if (automationCountdownInterval) {
            clearInterval(automationCountdownInterval);
        }

        automationCountdownInterval = setInterval(() => {
            if (window.AutomazioneSimulazioni) {
                const time = window.AutomazioneSimulazioni.getTimeUntilNextSimulation();
                const countdownEl = document.querySelector('#automation-status-container .text-teal-400');
                if (countdownEl) {
                    countdownEl.textContent = time.formatted;
                }
            }
        }, 1000);
    };

    /**
     * Gestisce il toggle del sistema Crediti Super Seri
     */
    const handleToggleCSS = async (event) => {
        const target = event.target;
        const currentlyEnabled = target.dataset.enabled === 'true';
        const newState = !currentlyEnabled;

        target.textContent = 'Aggiornamento...';
        target.disabled = true;

        try {
            if (window.CreditiSuperSeri) {
                const success = await window.CreditiSuperSeri.setEnabled(newState);

                if (success) {
                    // Aggiorna UI
                    target.dataset.enabled = newState;
                    target.textContent = newState ? 'DISABILITA' : 'ABILITA';

                    const statusText = document.getElementById('css-status-text');
                    const section = document.getElementById('css-admin-section');

                    if (statusText) {
                        statusText.textContent = newState ? 'ATTIVO' : 'DISATTIVO';
                        statusText.classList.remove('text-green-400', 'text-red-400');
                        statusText.classList.add(newState ? 'text-green-400' : 'text-red-400');
                    }

                    if (section) {
                        section.classList.remove('border-green-500', 'border-amber-500');
                        section.classList.add(newState ? 'border-green-500' : 'border-amber-500');
                    }

                    target.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-red-600', 'hover:bg-red-700');
                    target.classList.add(newState ? 'bg-red-600' : 'bg-green-600');
                    target.classList.add(newState ? 'hover:bg-red-700' : 'hover:bg-green-700');

                    displayMessage(`Sistema Crediti Super Seri ${newState ? 'ATTIVATO' : 'DISATTIVATO'}`, 'success', 'toggle-status-message');
                } else {
                    displayMessage('Errore durante il toggle CSS', 'error', 'toggle-status-message');
                    target.textContent = currentlyEnabled ? 'DISABILITA' : 'ABILITA';
                }
            } else {
                displayMessage('Modulo CreditiSuperSeri non caricato', 'error', 'toggle-status-message');
                target.textContent = currentlyEnabled ? 'DISABILITA' : 'ABILITA';
            }
        } catch (error) {
            console.error('Errore toggle CSS:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
            target.textContent = currentlyEnabled ? 'DISABILITA' : 'ABILITA';
        } finally {
            target.disabled = false;
        }
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
        
        const toggleDraftCheckbox = document.getElementById('toggle-draft-checkbox');
        if (toggleDraftCheckbox) toggleDraftCheckbox.addEventListener('change', handleToggleState);

        const toggleMarketCheckbox = document.getElementById('toggle-market-checkbox');
        if (toggleMarketCheckbox) toggleMarketCheckbox.addEventListener('change', handleToggleState);

        // Listener per Draft a Turni
        const btnGenerateDraftList = document.getElementById('btn-generate-draft-list');
        if (btnGenerateDraftList) {
            btnGenerateDraftList.addEventListener('click', handleGenerateDraftList);
        }

        const btnStopDraftTurns = document.getElementById('btn-stop-draft-turns');
        if (btnStopDraftTurns) {
            btnStopDraftTurns.addEventListener('click', handleStopDraftTurns);
        }

        // Bottone forza avanzamento turno
        const btnForceAdvanceTurn = document.getElementById('btn-force-advance-turn');
        if (btnForceAdvanceTurn) {
            btnForceAdvanceTurn.addEventListener('click', handleForceAdvanceTurn);
        }

        // Bottone assegna giocatore casuale
        const btnAssignRandomPlayer = document.getElementById('btn-assign-random-player');
        if (btnAssignRandomPlayer) {
            btnAssignRandomPlayer.addEventListener('click', handleAssignRandomPlayer);
        }

        // Toggle pausa draft
        const draftPauseToggle = document.getElementById('draft-pause-toggle');
        if (draftPauseToggle) {
            draftPauseToggle.addEventListener('change', handleDraftPauseToggle);
        }

        // Event delegation per Jump to Team nella lista ordine draft (admin)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="admin-jump-to-team"]');
            if (btn) {
                const teamId = btn.dataset.teamId;
                const teamName = btn.dataset.teamName;
                handleAdminJumpToTeam(teamId, teamName);
            }
        });

        // Bottoni Visualizza Lista Giocatori - Aprono modal separati
        const btnViewDraftPlayers = document.getElementById('btn-view-draft-players');
        if (btnViewDraftPlayers) {
            btnViewDraftPlayers.addEventListener('click', async () => {
                await openPlayersListModal('draft');
            });
        }

        const btnViewMarketPlayers = document.getElementById('btn-view-market-players');
        if (btnViewMarketPlayers) {
            btnViewMarketPlayers.addEventListener('click', async () => {
                await openPlayersListModal('market');
            });
        }

        // Bottone Aggiorna Costi Draft
        const btnUpdateDraftCosts = document.getElementById('btn-update-draft-costs');
        if (btnUpdateDraftCosts) {
            btnUpdateDraftCosts.addEventListener('click', () => {
                handleUpdateDraftCosts();
            });
        }

        // Bottone Aggiorna Costi Mercato
        const btnUpdateMarketCosts = document.getElementById('btn-update-market-costs');
        if (btnUpdateMarketCosts) {
            btnUpdateMarketCosts.addEventListener('click', () => {
                handleUpdateMarketCosts();
            });
        }

        // Bottoni ordinamento per ruolo
        const sortButtons = document.querySelectorAll('.sort-btn');
        sortButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Rimuovi bordo attivo da tutti
                sortButtons.forEach(b => b.classList.remove('border-2', 'border-cyan-400', 'font-bold'));
                // Aggiungi bordo attivo al bottone cliccato
                btn.classList.add('border-2', 'border-cyan-400', 'font-bold');

                const roleFilter = btn.id.replace('btn-sort-', '');
                filterPlayersByRole(roleFilter);
            });
        });

        // Carica lo stato corrente del draft a turni
        loadDraftTurnsStatus();

        // Toggle menu a scomparsa "Crea Giocatore"
        const createPlayerHeader = document.getElementById('create-player-header');
        if (createPlayerHeader) {
            createPlayerHeader.addEventListener('click', () => {
                const content = document.getElementById('create-player-content');
                const icon = document.getElementById('create-player-toggle-icon');
                if (content && icon) {
                    content.classList.toggle('hidden');
                    icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
                }
            });
        }

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
        
        const levelMinInput = document.getElementById('player-level-min');
        const levelMaxInput = document.getElementById('player-level-max');

        // Usa la funzione updateCostDisplay di AdminPlayers
        const updateCostDisplay = () => {
            window.AdminPlayers.updateCostDisplay();
        };

        if (levelMaxInput) {
            levelMaxInput.addEventListener('input', updateCostDisplay);
        }
        if (levelMinInput) {
            levelMinInput.addEventListener('input', updateCostDisplay);
        }
        updateCostDisplay();

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
     * Carica lo stato corrente del draft a turni
     */
    const loadDraftTurnsStatus = async () => {
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        try {
            const configDoc = await getDoc(configDocRef);
            const configData = configDoc.exists() ? configDoc.data() : {};
            const draftTurns = configData.draftTurns;
            const isDraftTurnsActive = draftTurns && draftTurns.isActive;
            const isPaused = draftTurns && draftTurns.isPaused;
            const timerEnabled = draftTurns ? draftTurns.timerEnabled !== false : true; // default true

            const btnGenerate = document.getElementById('btn-generate-draft-list');
            const btnStop = document.getElementById('btn-stop-draft-turns');
            const btnForceAdvance = document.getElementById('btn-force-advance-turn');
            const btnAssignRandom = document.getElementById('btn-assign-random-player');
            const pauseToggleContainer = document.getElementById('draft-pause-toggle-container');
            const pauseToggle = document.getElementById('draft-pause-toggle');
            const pauseIcon = document.getElementById('draft-pause-icon');
            const pauseLabel = document.getElementById('draft-pause-label');
            const pauseSublabel = document.getElementById('draft-pause-sublabel');
            const statusContainer = document.getElementById('draft-turns-status-container');
            const timerOption = document.getElementById('draft-timer-option');

            if (isDraftTurnsActive) {
                // Draft a turni attivo - nascondi opzione timer
                if (timerOption) timerOption.classList.add('hidden');
                if (btnGenerate) btnGenerate.classList.add('hidden');
                if (btnStop) btnStop.classList.remove('hidden');

                // Mostra toggle pausa
                if (pauseToggleContainer) pauseToggleContainer.classList.remove('hidden');

                // Aggiorna stato toggle pausa
                if (pauseToggle) {
                    pauseToggle.checked = isPaused;
                }

                // Aggiorna UI del toggle
                if (isPaused) {
                    if (pauseIcon) pauseIcon.textContent = '⏸️';
                    if (pauseLabel) pauseLabel.textContent = 'Draft in Pausa';
                    if (pauseSublabel) pauseSublabel.textContent = 'Il timer e\' fermo';
                    if (btnForceAdvance) btnForceAdvance.classList.add('hidden');
                    if (btnAssignRandom) btnAssignRandom.classList.add('hidden');
                } else {
                    if (pauseIcon) pauseIcon.textContent = '▶️';
                    if (pauseLabel) pauseLabel.textContent = 'Draft Attivo';
                    if (pauseSublabel) pauseSublabel.textContent = 'Il timer sta scorrendo';
                    if (btnForceAdvance) btnForceAdvance.classList.remove('hidden');
                    if (btnAssignRandom) btnAssignRandom.classList.remove('hidden');
                }

                // Mostra stato corrente
                const currentRound = draftTurns.currentRound;
                const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
                const currentOrder = draftTurns[orderKey] || [];
                const currentTeam = currentOrder.find(t => t.teamId === draftTurns.currentTeamId);
                const remainingTeams = currentOrder.filter(t => !t.hasDrafted).length;

                // Calcola tempo rimanente per il timer
                const { DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants || { DRAFT_TURN_TIMEOUT_MS: 3600000 };
                // Converti turnStartTime se e' un Timestamp Firestore
                let turnStartTime = draftTurns.turnStartTime || Date.now();
                if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
                    turnStartTime = turnStartTime.toMillis();
                }
                const elapsed = Date.now() - turnStartTime;
                const timeRemaining = Math.max(0, DRAFT_TURN_TIMEOUT_MS - elapsed);
                const minutes = Math.floor(timeRemaining / 60000);
                const seconds = Math.floor((timeRemaining % 60000) / 1000);

                const pauseStatusHtml = isPaused
                    ? '<p class="text-orange-400 font-bold text-lg mb-2 animate-pulse">⏸️ IN PAUSA</p>'
                    : '';

                // Timer HTML
                const timerHtml = timerEnabled && !isPaused
                    ? `<div class="mt-2 p-2 bg-cyan-900 border border-cyan-500 rounded-lg">
                           <p class="text-sm text-cyan-300">
                               ⏱️ Timer: <span id="admin-draft-countdown" class="text-white font-bold text-lg">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>
                               <span class="text-xs text-gray-400 ml-2">(1 ora per turno)</span>
                           </p>
                       </div>`
                    : (timerEnabled && isPaused
                        ? `<div class="mt-2 p-2 bg-gray-800 border border-gray-600 rounded-lg">
                               <p class="text-sm text-gray-400">⏱️ Timer: <span class="text-white font-bold">IN PAUSA</span></p>
                           </div>`
                        : `<div class="mt-2 p-2 bg-gray-800 border border-gray-600 rounded-lg">
                               <p class="text-sm text-gray-400">⏱️ Timer: <span class="text-gray-500">DISATTIVATO</span></p>
                           </div>`);

                if (statusContainer) {
                    statusContainer.innerHTML = `
                        <div class="p-3 ${isPaused ? 'bg-orange-900 border-orange-500' : 'bg-purple-900 border-purple-500'} border rounded-lg">
                            ${pauseStatusHtml}
                            <p class="${isPaused ? 'text-orange-300' : 'text-purple-300'} font-bold mb-2">Draft a Turni ${isPaused ? 'SOSPESO' : 'ATTIVO'}</p>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="text-gray-400">Round:</span> <span class="text-white font-bold">${currentRound} / ${draftTurns.totalRounds}</span></div>
                                <div><span class="text-gray-400">Rimanenti:</span> <span class="text-white font-bold">${remainingTeams}</span></div>
                            </div>
                            <p class="text-sm mt-2"><span class="text-gray-400">Turno:</span> <span class="text-yellow-400 font-bold">${currentTeam ? currentTeam.teamName : 'N/A'}</span></p>
                            ${timerHtml}
                            <p class="text-xs text-cyan-400 mt-2">(clicca su una squadra per passare il turno)</p>
                            <div id="admin-draft-order-list" class="mt-2 flex flex-wrap gap-1">
                                ${currentOrder.map((t, i) => `
                                    <button data-action="admin-jump-to-team" data-team-id="${t.teamId}" data-team-name="${t.teamName}"
                                            class="text-xs px-2 py-1 rounded cursor-pointer hover:ring-2 hover:ring-cyan-400 transition
                                            ${t.hasDrafted ? 'bg-gray-600 text-gray-400 line-through' : (t.teamId === draftTurns.currentTeamId ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-700 text-white hover:bg-gray-600')}">${i+1}. ${t.teamName}</button>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    // Avvia countdown se timer attivo e non in pausa
                    if (timerEnabled && !isPaused) {
                        startAdminDraftCountdown(turnStartTime);
                    }
                }
            } else {
                // Draft a turni non attivo - mostra opzione timer
                if (timerOption) timerOption.classList.remove('hidden');
                if (btnGenerate) btnGenerate.classList.remove('hidden');
                if (btnStop) btnStop.classList.add('hidden');
                if (btnForceAdvance) btnForceAdvance.classList.add('hidden');
                if (btnAssignRandom) btnAssignRandom.classList.add('hidden');
                if (pauseToggleContainer) pauseToggleContainer.classList.add('hidden');
                if (statusContainer) statusContainer.innerHTML = '';
            }

        } catch (error) {
            console.error('Errore nel caricamento stato draft a turni:', error);
        }
    };

    // Timer per countdown admin
    let adminCountdownInterval = null;

    /**
     * Avvia il countdown del timer nel pannello admin
     */
    const startAdminDraftCountdown = (turnStartTimeParam) => {
        // Pulisci timer precedente
        if (adminCountdownInterval) {
            clearInterval(adminCountdownInterval);
        }

        // Converti turnStartTime se e' un Timestamp Firestore
        let turnStartTime = turnStartTimeParam;
        if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
            turnStartTime = turnStartTime.toMillis();
        }

        const { DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants || { DRAFT_TURN_TIMEOUT_MS: 3600000 };

        const updateCountdown = () => {
            const countdownEl = document.getElementById('admin-draft-countdown');
            if (!countdownEl) {
                clearInterval(adminCountdownInterval);
                return;
            }

            // Usa getEffectiveTimeRemaining per considerare la pausa notturna
            const timeRemaining = window.DraftConstants?.getEffectiveTimeRemaining
                ? window.DraftConstants.getEffectiveTimeRemaining(turnStartTime, DRAFT_TURN_TIMEOUT_MS)
                : Math.max(0, DRAFT_TURN_TIMEOUT_MS - (Date.now() - turnStartTime));

            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);

            // Controlla se siamo in pausa notturna
            const isNightPause = window.DraftConstants?.isNightPauseActive?.() || false;

            if (isNightPause) {
                countdownEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} 🌙`;
                countdownEl.classList.remove('text-red-400');
                countdownEl.classList.add('text-white');
            } else {
                countdownEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                // Colore rosso se meno di 5 minuti
                if (timeRemaining < 5 * 60 * 1000) {
                    countdownEl.classList.add('text-red-400');
                    countdownEl.classList.remove('text-white');
                }
            }

            // Se scaduto (e non in pausa notturna), ricarica lo stato
            if (timeRemaining <= 0 && !isNightPause) {
                clearInterval(adminCountdownInterval);
                setTimeout(() => loadDraftTurnsStatus(), 2000);
            }
        };

        // Aggiorna subito e poi ogni secondo
        updateCountdown();
        adminCountdownInterval = setInterval(updateCountdown, 1000);
    };

    /**
     * Gestisce la generazione della lista draft
     */
    const handleGenerateDraftList = async () => {
        const btn = document.getElementById('btn-generate-draft-list');
        const timerCheckbox = document.getElementById('draft-timer-enabled');
        const timerEnabled = timerCheckbox ? timerCheckbox.checked : true;

        const timerMessage = timerEnabled
            ? 'Timer ATTIVO: ogni squadra avra 1 ora per scegliere.'
            : 'Timer DISATTIVO: nessun limite di tempo per i turni.';

        if (!confirm(`Vuoi generare la lista del draft?\n\n${timerMessage}\n\nLe squadre potranno draftare a turno.`)) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Generazione in corso...';
        displayMessage('Generazione lista draft in corso...', 'info', 'toggle-status-message');

        try {
            // Prepara il contesto per DraftTurns
            const context = {
                db,
                firestoreTools,
                paths: {
                    TEAMS_COLLECTION_PATH,
                    CHAMPIONSHIP_CONFIG_PATH,
                    LEADERBOARD_COLLECTION_PATH: `artifacts/${firestoreTools.appId}/public/data/leaderboard`
                }
            };

            const result = await window.DraftTurns.startDraftTurns(context, timerEnabled);

            if (result.success) {
                const timerStatus = timerEnabled ? ' (Timer 1h attivo)' : ' (Timer disattivato)';
                displayMessage(`Lista draft generata! Il draft a turni e iniziato${timerStatus}.`, 'success', 'toggle-status-message');
                // Aggiorna lo stato
                loadDraftTurnsStatus();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Errore nella generazione lista draft:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
            btn.disabled = false;
            btn.textContent = 'Genera Lista Draft';
        }
    };

    /**
     * Filtra i giocatori visualizzati per ruolo
     */
    const filterPlayersByRole = (role) => {
        const draftList = document.getElementById('draft-players-list');
        const marketList = document.getElementById('market-players-list');

        const filterList = (listElement) => {
            if (!listElement) return;

            const playerCards = listElement.querySelectorAll('[data-player-role]');
            playerCards.forEach(card => {
                if (role === 'all') {
                    card.classList.remove('hidden');
                } else {
                    const playerRole = card.dataset.playerRole;
                    if (playerRole === role) {
                        card.classList.remove('hidden');
                    } else {
                        card.classList.add('hidden');
                    }
                }
            });
        };

        filterList(draftList);
        filterList(marketList);
    };

    /**
     * Apre il modal con la lista dei giocatori (Draft o Mercato)
     */
    const openPlayersListModal = async (type) => {
        const isDraft = type === 'draft';
        const collectionPath = isDraft ? DRAFT_PLAYERS_COLLECTION_PATH : MARKET_PLAYERS_COLLECTION_PATH;

        try {
            // Carica i giocatori
            const { collection, getDocs } = firestoreTools;
            const playersRef = collection(db, collectionPath);
            const snapshot = await getDocs(playersRef);

            // Ordine ruoli: P, D, C, A
            const roleOrder = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };

            const players = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                const roleA = roleOrder[a.role] ?? 4;
                const roleB = roleOrder[b.role] ?? 4;
                return roleA - roleB;
            });

            // Funzione per gestire la modifica
            const handleEdit = async (playerId, playerType) => {
                const player = players.find(p => p.id === playerId);
                if (!player) return;

                window.AdminUI.renderEditPlayerModal(player, playerType, async (id, updatedData, pType, closeEditModal) => {
                    try {
                        const { doc, updateDoc } = firestoreTools;
                        const playerPath = pType === 'draft' ? DRAFT_PLAYERS_COLLECTION_PATH : MARKET_PLAYERS_COLLECTION_PATH;
                        const playerRef = doc(db, playerPath, id);
                        await updateDoc(playerRef, updatedData);

                        // Aggiorna la card nel modal
                        const playerCard = document.querySelector(`.player-card[data-player-id="${id}"]`);
                        if (playerCard) {
                            // Aggiorna i dati visivamente
                            const nameEl = playerCard.querySelector('.text-lg.font-bold');
                            if (nameEl) {
                                const flag = window.AdminPlayers?.getFlag(updatedData.nationality) || '';
                                nameEl.textContent = `${flag} ${updatedData.name}`;
                            }
                        }

                        closeEditModal();

                        // Mostra messaggio di successo
                        const msgEl = document.getElementById('modal-action-message');
                        if (msgEl) {
                            msgEl.textContent = `Giocatore ${updatedData.name} aggiornato con successo!`;
                            msgEl.className = 'text-center mt-2 text-sm text-green-400';
                            setTimeout(() => { msgEl.textContent = ''; }, 3000);
                        }

                        // Ricarica il modal per mostrare i dati aggiornati
                        document.getElementById('players-list-modal')?.remove();
                        await openPlayersListModal(pType);

                    } catch (error) {
                        console.error('Errore aggiornamento giocatore:', error);
                        const msgEl = document.getElementById('edit-player-message');
                        if (msgEl) {
                            msgEl.textContent = `Errore: ${error.message}`;
                            msgEl.className = 'text-center text-sm text-red-400';
                        }
                    }
                });
            };

            // Funzione per gestire l'eliminazione
            const handleDelete = async (playerId, playerType, buttonEl) => {
                try {
                    const { doc, deleteDoc } = firestoreTools;
                    const playerPath = playerType === 'draft' ? DRAFT_PLAYERS_COLLECTION_PATH : MARKET_PLAYERS_COLLECTION_PATH;
                    const playerRef = doc(db, playerPath, playerId);
                    await deleteDoc(playerRef);

                    // Rimuovi la card dal DOM
                    const playerCard = buttonEl.closest('.player-card');
                    if (playerCard) {
                        playerCard.remove();
                    }

                    // Aggiorna il contatore
                    const countEl = document.getElementById('players-count');
                    const remainingCards = document.querySelectorAll('.player-card').length;
                    if (countEl) {
                        countEl.textContent = `Totale: ${remainingCards} giocatori`;
                    }

                    // Mostra messaggio di successo
                    const msgEl = document.getElementById('modal-action-message');
                    if (msgEl) {
                        msgEl.textContent = 'Giocatore eliminato con successo!';
                        msgEl.className = 'text-center mt-2 text-sm text-green-400';
                        setTimeout(() => { msgEl.textContent = ''; }, 3000);
                    }

                } catch (error) {
                    console.error('Errore eliminazione giocatore:', error);
                    buttonEl.textContent = 'ERRORE';
                    buttonEl.classList.remove('bg-orange-500');
                    buttonEl.classList.add('bg-red-600');
                }
            };

            // Funzione per aggiornare i costi dal modal
            const setupUpdateCostsButton = () => {
                const btnUpdateCosts = document.getElementById('btn-update-costs-modal');
                if (btnUpdateCosts) {
                    btnUpdateCosts.addEventListener('click', async () => {
                        btnUpdateCosts.disabled = true;
                        btnUpdateCosts.textContent = 'Aggiornamento...';
                        const msgEl = document.getElementById('modal-action-message');

                        try {
                            const { collection, getDocs, doc, updateDoc } = firestoreTools;
                            const playersRef = collection(db, collectionPath);
                            const playersSnapshot = await getDocs(playersRef);

                            let updatedCount = 0;
                            for (const playerDoc of playersSnapshot.docs) {
                                const playerData = playerDoc.data();
                                const levelMin = playerData.levelRange?.[0] || playerData.level || 1;
                                const levelMax = playerData.levelRange?.[1] || playerData.level || levelMin;
                                const abilities = playerData.abilities || [];

                                const newCostMin = window.AdminPlayers.calculateCost(levelMin, abilities);
                                const newCostMax = window.AdminPlayers.calculateCost(levelMax, abilities);

                                const playerRef = doc(db, collectionPath, playerDoc.id);
                                await updateDoc(playerRef, {
                                    cost: newCostMax,
                                    costRange: [newCostMin, newCostMax]
                                });
                                updatedCount++;
                            }

                            if (msgEl) {
                                msgEl.textContent = `Aggiornati i costi di ${updatedCount} giocatori!`;
                                msgEl.className = 'text-center mt-2 text-sm text-green-400';
                            }

                            // Ricarica il modal
                            document.getElementById('players-list-modal')?.remove();
                            await openPlayersListModal(type);

                        } catch (error) {
                            console.error('Errore aggiornamento costi:', error);
                            if (msgEl) {
                                msgEl.textContent = `Errore: ${error.message}`;
                                msgEl.className = 'text-center mt-2 text-sm text-red-400';
                            }
                        } finally {
                            btnUpdateCosts.disabled = false;
                            btnUpdateCosts.textContent = '🔄 Aggiorna Costi Tutti';
                        }
                    });
                }
            };

            // Renderizza il modal
            window.AdminUI.renderPlayersListModal(
                document.body,
                type,
                players,
                handleEdit,
                handleDelete,
                () => {
                    // Ricarica le liste inline quando il modal viene chiuso
                    if (isDraft) {
                        window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
                    } else {
                        window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
                    }
                }
            );

            // Setup bottone aggiorna costi
            setupUpdateCostsButton();

        } catch (error) {
            console.error('Errore apertura modal giocatori:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
        }
    };

    /**
     * Aggiorna i costi di tutti i giocatori nel draft usando la nuova formula
     */
    const handleUpdateDraftCosts = async () => {
        const msgEl = document.getElementById('update-draft-costs-message');
        const btn = document.getElementById('btn-update-draft-costs');

        if (!confirm('Vuoi aggiornare i costi di tutti i giocatori nel draft?\nQuesta operazione ricalcolera i costi basandosi sulla nuova formula.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Aggiornamento in corso...';
        if (msgEl) {
            msgEl.textContent = 'Caricamento giocatori...';
            msgEl.className = 'text-center mt-2 text-sm text-yellow-400';
        }

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;
            const playersRef = collection(db, DRAFT_PLAYERS_COLLECTION_PATH);
            const playersSnapshot = await getDocs(playersRef);

            if (playersSnapshot.empty) {
                if (msgEl) {
                    msgEl.textContent = 'Nessun giocatore nel draft da aggiornare.';
                    msgEl.className = 'text-center mt-2 text-sm text-gray-400';
                }
                btn.disabled = false;
                btn.textContent = '🔄 Aggiorna Costi';
                return;
            }

            let updatedCount = 0;
            let errorCount = 0;
            const totalPlayers = playersSnapshot.size;

            for (const playerDoc of playersSnapshot.docs) {
                try {
                    const playerData = playerDoc.data();
                    const playerId = playerDoc.id;

                    const levelMin = playerData.levelMin || playerData.level || 1;
                    const levelMax = playerData.levelMax || playerData.level || levelMin;
                    const abilities = playerData.abilities || [];

                    const newCostMin = window.AdminPlayers.calculateCost(levelMin, abilities);
                    const newCostMax = window.AdminPlayers.calculateCost(levelMax, abilities);

                    const updateData = {
                        cost: newCostMin,
                        costRange: [newCostMin, newCostMax]
                    };

                    const playerRef = doc(db, DRAFT_PLAYERS_COLLECTION_PATH, playerId);
                    await updateDoc(playerRef, updateData);

                    updatedCount++;

                    if (msgEl) {
                        msgEl.textContent = `Aggiornando... ${updatedCount}/${totalPlayers}`;
                    }

                } catch (playerError) {
                    console.error(`Errore aggiornamento giocatore ${playerDoc.id}:`, playerError);
                    errorCount++;
                }
            }

            if (msgEl) {
                if (errorCount > 0) {
                    msgEl.textContent = `Completato: ${updatedCount} aggiornati, ${errorCount} errori.`;
                    msgEl.className = 'text-center mt-2 text-sm text-orange-400';
                } else {
                    msgEl.textContent = `Tutti i ${updatedCount} giocatori aggiornati!`;
                    msgEl.className = 'text-center mt-2 text-sm text-green-400';
                }
            }

            window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
            console.log(`Aggiornamento costi draft completato: ${updatedCount} giocatori`);

        } catch (error) {
            console.error("Errore nell'aggiornamento dei costi draft:", error);
            if (msgEl) {
                msgEl.textContent = `Errore: ${error.message}`;
                msgEl.className = 'text-center mt-2 text-sm text-red-400';
            }
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Aggiorna Costi';
        }
    };

    /**
     * Aggiorna i costi di tutti i giocatori nel mercato usando la nuova formula
     */
    const handleUpdateMarketCosts = async () => {
        const msgEl = document.getElementById('update-market-costs-message');
        const btn = document.getElementById('btn-update-market-costs');

        if (!confirm('Vuoi aggiornare i costi di tutti i giocatori nel mercato?\nQuesta operazione ricalcolera i costi basandosi sulla nuova formula.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Aggiornamento in corso...';
        if (msgEl) {
            msgEl.textContent = 'Caricamento giocatori...';
            msgEl.className = 'text-center mt-2 text-sm text-yellow-400';
        }

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;
            const playersRef = collection(db, MARKET_PLAYERS_COLLECTION_PATH);
            const playersSnapshot = await getDocs(playersRef);

            if (playersSnapshot.empty) {
                if (msgEl) {
                    msgEl.textContent = 'Nessun giocatore nel mercato da aggiornare.';
                    msgEl.className = 'text-center mt-2 text-sm text-gray-400';
                }
                btn.disabled = false;
                btn.textContent = '🔄 Aggiorna Costi';
                return;
            }

            let updatedCount = 0;
            let errorCount = 0;
            const totalPlayers = playersSnapshot.size;

            for (const playerDoc of playersSnapshot.docs) {
                try {
                    const playerData = playerDoc.data();
                    const playerId = playerDoc.id;

                    const level = playerData.level || 1;
                    const abilities = playerData.abilities || [];

                    const newCost = window.AdminPlayers.calculateCost(level, abilities);

                    const playerRef = doc(db, MARKET_PLAYERS_COLLECTION_PATH, playerId);
                    await updateDoc(playerRef, { cost: newCost });

                    updatedCount++;

                    if (msgEl) {
                        msgEl.textContent = `Aggiornando... ${updatedCount}/${totalPlayers}`;
                    }

                } catch (playerError) {
                    console.error(`Errore aggiornamento giocatore ${playerDoc.id}:`, playerError);
                    errorCount++;
                }
            }

            if (msgEl) {
                if (errorCount > 0) {
                    msgEl.textContent = `Completato: ${updatedCount} aggiornati, ${errorCount} errori.`;
                    msgEl.className = 'text-center mt-2 text-sm text-orange-400';
                } else {
                    msgEl.textContent = `Tutti i ${updatedCount} giocatori aggiornati!`;
                    msgEl.className = 'text-center mt-2 text-sm text-green-400';
                }
            }

            window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
            console.log(`Aggiornamento costi mercato completato: ${updatedCount} giocatori`);

        } catch (error) {
            console.error("Errore nell'aggiornamento dei costi mercato:", error);
            if (msgEl) {
                msgEl.textContent = `Errore: ${error.message}`;
                msgEl.className = 'text-center mt-2 text-sm text-red-400';
            }
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Aggiorna Costi';
        }
    };

    /**
     * Gestisce la fermata del draft a turni
     */
    const handleStopDraftTurns = async () => {
        const btn = document.getElementById('btn-stop-draft-turns');

        if (!confirm('Vuoi fermare il draft a turni? Questa azione interrompera il draft in corso.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Fermando...';
        displayMessage('Fermando draft a turni...', 'info', 'toggle-status-message');

        try {
            const context = {
                db,
                firestoreTools,
                paths: {
                    CHAMPIONSHIP_CONFIG_PATH
                }
            };

            const result = await window.DraftTurns.stopDraftTurns(context);

            if (result.success) {
                displayMessage('Draft a turni fermato.', 'success', 'toggle-status-message');
                loadDraftTurnsStatus();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Errore nel fermare il draft:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
            btn.disabled = false;
            btn.textContent = 'Ferma Draft a Turni';
        }
    };

    /**
     * Gestisce l'avanzamento forzato del turno (admin)
     */
    const handleForceAdvanceTurn = async () => {
        const btn = document.getElementById('btn-force-advance-turn');

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Avanzando...';

        try {
            const context = {
                db,
                firestoreTools,
                paths: {
                    CHAMPIONSHIP_CONFIG_PATH
                }
            };

            const result = await window.DraftTurns.forceAdvanceTurn(context);

            if (result.success) {
                displayMessage(result.message, 'success', 'toggle-status-message');
                loadDraftTurnsStatus();
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('Errore avanzamento forzato turno:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '⏭️ Avanza Turno Manualmente';
        }
    };

    /**
     * Gestisce l'assegnazione di un giocatore casuale alla squadra di turno
     */
    const handleAssignRandomPlayer = async () => {
        const btn = document.getElementById('btn-assign-random-player');

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Assegnando...';

        try {
            const { doc, getDoc, getDocs, updateDoc, collection } = firestoreTools;
            const db = window.db;

            // Ottieni stato draft corrente
            const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, 'settings');
            const configDoc = await getDoc(configDocRef);
            const configData = configDoc.exists() ? configDoc.data() : {};
            const draftTurns = configData.draftTurns;

            if (!draftTurns || !draftTurns.isActive) {
                throw new Error('Draft a turni non attivo');
            }

            const currentTeamId = draftTurns.currentTeamId;
            if (!currentTeamId) {
                throw new Error('Nessuna squadra in turno');
            }

            // Ottieni lista giocatori draft disponibili
            const draftPlayersSnapshot = await getDocs(collection(db, DRAFT_PLAYERS_COLLECTION_PATH));
            const availablePlayers = [];
            draftPlayersSnapshot.forEach(doc => {
                const player = doc.data();
                if (!player.draftedBy) {
                    availablePlayers.push({ id: doc.id, ...player });
                }
            });

            if (availablePlayers.length === 0) {
                throw new Error('Nessun giocatore disponibile nel draft');
            }

            // Scegli un giocatore casuale
            const randomPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

            // Ottieni dati squadra
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) {
                throw new Error('Squadra non trovata');
            }

            const teamData = teamDoc.data();
            const currentRoster = teamData.rosa || [];

            // Verifica che la squadra non abbia gia il massimo di giocatori
            const MAX_ROSA = window.InterfacciaConstants?.MAX_ROSA_PLAYERS || 15;
            if (currentRoster.length >= MAX_ROSA) {
                throw new Error(`La squadra ha gia il massimo di ${MAX_ROSA} giocatori`);
            }

            // Verifica budget
            const cost = randomPlayer.costo || 0;
            const budget = teamData.budgetRimanente ?? teamData.budget ?? 0;
            if (cost > budget) {
                throw new Error(`Budget insufficiente (${budget} CS) per giocatore ${randomPlayer.nome} (${cost} CS)`);
            }

            // Assegna il giocatore
            // 1. Aggiorna il giocatore nel draft
            const playerDocRef = doc(db, DRAFT_PLAYERS_COLLECTION_PATH, randomPlayer.id);
            await updateDoc(playerDocRef, {
                draftedBy: currentTeamId,
                draftedAt: new Date().toISOString()
            });

            // 2. Aggiungi alla rosa della squadra
            // Crea oggetto giocatore filtrando i valori undefined
            const newPlayer = {};

            // Campi obbligatori con fallback
            newPlayer.id = randomPlayer.id || `player_${Date.now()}`;
            newPlayer.nome = randomPlayer.nome || randomPlayer.name || 'Giocatore';
            newPlayer.ruolo = randomPlayer.ruolo || randomPlayer.role || 'C';
            newPlayer.tipo = randomPlayer.tipo || randomPlayer.type || 'Tecnica';
            newPlayer.livello = randomPlayer.livello || randomPlayer.level || 1;
            newPlayer.abilities = randomPlayer.abilities || [];
            newPlayer.eta = randomPlayer.eta || randomPlayer.age || 20;
            newPlayer.costo = cost;
            newPlayer.contract = randomPlayer.contract || 3;

            // Campi opzionali - aggiungi solo se definiti
            if (randomPlayer.secretMaxLevel !== undefined && randomPlayer.secretMaxLevel !== null) {
                newPlayer.secretMaxLevel = randomPlayer.secretMaxLevel;
            }

            // Filtra la rosa esistente per rimuovere eventuali undefined
            const cleanRoster = currentRoster.filter(p => p && p.id);

            await updateDoc(teamDocRef, {
                rosa: [...cleanRoster, newPlayer],
                budget: budget - cost
            });

            displayMessage(`Giocatore ${randomPlayer.nome} assegnato a ${teamData.nomeSquadra}!`, 'success', 'toggle-status-message');

            // 3. Avanza al turno successivo
            const context = {
                db,
                firestoreTools,
                paths: {
                    CHAMPIONSHIP_CONFIG_PATH
                }
            };
            await window.DraftTurns.forceAdvanceTurn(context);

            loadDraftTurnsStatus();

        } catch (error) {
            console.error('Errore assegnazione giocatore casuale:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '🎲 Assegna Giocatore Casuale';
        }
    };

    /**
     * Gestisce il salto a una squadra specifica nel draft (admin)
     * @param {string} teamId - ID della squadra
     * @param {string} teamName - Nome della squadra
     */
    const handleAdminJumpToTeam = async (teamId, teamName) => {
        // Chiedi conferma prima di cambiare il turno
        const confirmed = confirm(
            `Vuoi passare il turno a "${teamName}"?\n\n` +
            `ATTENZIONE: Il draft ripartira da questa squadra.\n` +
            `Le squadre successive potranno draftare di nuovo.`
        );

        if (!confirmed) {
            return;
        }

        displayMessage(`Passaggio turno a ${teamName} in corso...`, 'info', 'toggle-status-message');

        try {
            const context = {
                db,
                firestoreTools,
                paths: {
                    CHAMPIONSHIP_CONFIG_PATH
                }
            };

            const result = await window.DraftTurns.jumpToTeam(context, teamId);

            if (result.success) {
                displayMessage(result.message, 'success', 'toggle-status-message');
                loadDraftTurnsStatus();
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('Errore nel passaggio turno:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
        }
    };

    /**
     * Gestisce il toggle pausa/riprendi del draft
     */
    const handleDraftPauseToggle = async (event) => {
        const toggle = event.target;
        const shouldPause = toggle.checked;

        // Disabilita temporaneamente il toggle
        toggle.disabled = true;

        // Aggiorna UI subito per feedback
        const pauseIcon = document.getElementById('draft-pause-icon');
        const pauseLabel = document.getElementById('draft-pause-label');
        const pauseSublabel = document.getElementById('draft-pause-sublabel');

        if (shouldPause) {
            if (pauseIcon) pauseIcon.textContent = '⏳';
            if (pauseLabel) pauseLabel.textContent = 'Mettendo in pausa...';
        } else {
            if (pauseIcon) pauseIcon.textContent = '⏳';
            if (pauseLabel) pauseLabel.textContent = 'Riprendendo...';
        }

        try {
            const context = {
                db,
                firestoreTools,
                paths: {
                    CHAMPIONSHIP_CONFIG_PATH
                }
            };

            let result;
            if (shouldPause) {
                result = await window.DraftTurns.pauseDraftTurns(context);
            } else {
                result = await window.DraftTurns.resumeDraftTurns(context);
            }

            if (result.success) {
                displayMessage(result.message, 'success', 'toggle-status-message');
                loadDraftTurnsStatus();
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('Errore toggle pausa draft:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
            // Ripristina lo stato precedente del toggle in caso di errore
            toggle.checked = !shouldPause;
            loadDraftTurnsStatus();
        } finally {
            toggle.disabled = false;
        }
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

        // Per i checkbox, il nuovo stato e' il valore checked
        const newState = target.checked;

        target.disabled = true;
        displayMessage(`Aggiornamento stato ${stateType}...`, 'info', 'toggle-status-message');

        try {
            await setDoc(configDocRef, { [key]: newState, isSeasonOver: false }, { merge: true });

            displayMessage(`Stato ${stateType} aggiornato: ${newState ? 'APERTO' : 'CHIUSO'}`, 'success', 'toggle-status-message');

            // Aggiorna lo stato visuale
            const statusText = document.getElementById(statusTextId);
            const containerBox = target.closest('.p-4.rounded-lg');

            if (statusText) {
                statusText.textContent = newState ? 'APERTO' : 'CHIUSO';
                statusText.classList.remove(newState ? 'text-red-400' : 'text-green-400');
                statusText.classList.add(newState ? 'text-green-400' : 'text-red-400');
            }

            if (containerBox) {
                containerBox.classList.remove(newState ? 'border-red-500' : 'border-green-500');
                containerBox.classList.add(newState ? 'border-green-500' : 'border-red-500');
            }

            const summaryText = document.getElementById(`${stateType}-status-text-summary`);
            if (summaryText) summaryText.textContent = newState ? 'APERTO' : 'CHIUSO';

            // Se e' il toggle draft, mostra/nascondi la sezione Draft a Turni
            if (stateType === 'draft') {
                const draftTurnsSection = document.getElementById('draft-turns-section');
                if (draftTurnsSection) {
                    if (newState) {
                        draftTurnsSection.classList.remove('hidden');
                        // Aggiorna lo stato dei bottoni
                        loadDraftTurnsStatus();
                    } else {
                        draftTurnsSection.classList.add('hidden');
                    }
                }
            }

        } catch (error) {
            console.error(`Errore nell'aggiornamento dello stato ${stateType}:`, error);
            displayMessage(`Errore durante l'aggiornamento: ${error.message}`, 'error', 'toggle-status-message');
            // Ripristina lo stato del checkbox in caso di errore
            target.checked = !newState;
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
                displayMessage(`Collezione ${collectionName} gia vuota.`, 'success', msgId);
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
     * Assegna crediti (CS o CSS) a tutte le squadre
     */
    const handleAssignCreditsToAll = async (creditType) => {
        const msgElement = document.getElementById('mass-assign-message');
        const isCS = creditType === 'CS';
        const fieldName = isCS ? 'budget' : 'creditiSuperSeri';
        const displayName = isCS ? 'Crediti Seri (CS)' : 'Crediti Super Seri (CSS)';

        const amountStr = prompt(`Inserisci la quantita di ${displayName} da AGGIUNGERE a tutte le squadre:`);

        if (amountStr === null) {
            return; // Annullato
        }

        const amount = parseInt(amountStr);

        if (isNaN(amount) || amount <= 0) {
            if (msgElement) {
                msgElement.textContent = 'Quantita non valida. Inserisci un numero positivo.';
                msgElement.className = 'text-center text-sm mb-3 text-red-400';
            }
            return;
        }

        if (!confirm(`Confermi di voler aggiungere ${amount} ${displayName} a TUTTE le squadre?`)) {
            return;
        }

        if (msgElement) {
            msgElement.textContent = `Assegnazione ${displayName} in corso...`;
            msgElement.className = 'text-center text-sm mb-3 text-yellow-400';
        }

        try {
            const { collection, getDocs, doc, updateDoc, getDoc } = firestoreTools;
            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const querySnapshot = await getDocs(teamsCollectionRef);

            if (querySnapshot.empty) {
                if (msgElement) {
                    msgElement.textContent = 'Nessuna squadra registrata.';
                    msgElement.className = 'text-center text-sm mb-3 text-red-400';
                }
                return;
            }

            let updatedCount = 0;

            for (const teamDocSnap of querySnapshot.docs) {
                const teamData = teamDocSnap.data();

                // Salta solo l'account admin principale (serieseria)
                if (teamData.teamName?.toLowerCase() === 'serieseria') {
                    continue;
                }

                const currentValue = teamData[fieldName] || 0;
                const newValue = currentValue + amount;

                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamDocSnap.id);
                await updateDoc(teamDocRef, { [fieldName]: newValue });

                // Invia notifica alla squadra
                await sendCreditsNotification(teamDocSnap.id, teamData.teamName, amount, creditType);

                updatedCount++;
            }

            if (msgElement) {
                msgElement.textContent = `Assegnati ${amount} ${displayName} a ${updatedCount} squadre!`;
                msgElement.className = 'text-center text-sm mb-3 text-green-400';
            }

            // Ricarica la lista squadre
            window.AdminTeams.loadTeams(TEAMS_COLLECTION_PATH);

        } catch (error) {
            console.error(`Errore nell'assegnazione ${creditType}:`, error);
            if (msgElement) {
                msgElement.textContent = `Errore: ${error.message}`;
                msgElement.className = 'text-center text-sm mb-3 text-red-400';
            }
        }
    };

    // Variabile per tracciare il tipo di credito nel modal singola squadra
    let _assignCreditsSingleType = 'CS';

    /**
     * Apre il modal per assegnare crediti a squadra singola
     */
    const openAssignCreditsSingleModal = async (creditType) => {
        _assignCreditsSingleType = creditType;
        const modal = document.getElementById('assign-credits-single-modal');
        const title = document.getElementById('assign-credits-single-title');
        const teamSelect = document.getElementById('assign-credits-team-select');
        const amountInput = document.getElementById('assign-credits-amount');
        const errorMsg = document.getElementById('assign-single-error');

        if (!modal) return;

        const isCS = creditType === 'CS';
        title.textContent = isCS ? '💰 Assegna Crediti Seri (CS)' : '⭐ Assegna Crediti Super Seri (CSS)';
        amountInput.value = isCS ? 100 : 10;
        errorMsg.textContent = '';

        // Carica squadre
        try {
            const { collection, getDocs } = firestoreTools;
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
            const teams = teamsSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(t => t.teamName && t.teamName.toLowerCase() !== 'serieseria');

            const defaultOption = '<option value="">Seleziona squadra...</option>';
            const teamOptions = teams.map(t =>
                `<option value="${t.id}">${t.teamName}</option>`
            ).join('');

            teamSelect.innerHTML = defaultOption + teamOptions;
        } catch (error) {
            console.error('Errore caricamento squadre:', error);
            errorMsg.textContent = 'Errore nel caricamento delle squadre';
        }

        modal.classList.remove('hidden');
    };

    /**
     * Setup del modal assegna crediti singola squadra
     */
    const setupAssignCreditsSingleModal = () => {
        const modal = document.getElementById('assign-credits-single-modal');
        const btnConfirm = document.getElementById('btn-confirm-assign-single');
        const btnCancel = document.getElementById('btn-cancel-assign-single');

        if (!modal) return;

        btnCancel?.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        btnConfirm?.addEventListener('click', async () => {
            const teamSelect = document.getElementById('assign-credits-team-select');
            const amountInput = document.getElementById('assign-credits-amount');
            const errorMsg = document.getElementById('assign-single-error');
            const singleMsg = document.getElementById('single-assign-message');

            const teamId = teamSelect.value;
            const amount = parseInt(amountInput.value);

            if (!teamId) {
                errorMsg.textContent = 'Seleziona una squadra';
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                errorMsg.textContent = 'Inserisci una quantita valida';
                return;
            }

            btnConfirm.disabled = true;
            btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Assegnazione...';

            const isCS = _assignCreditsSingleType === 'CS';
            const fieldName = isCS ? 'budget' : 'creditiSuperSeri';
            const displayName = isCS ? 'CS' : 'CSS';

            try {
                const { doc, getDoc, updateDoc } = firestoreTools;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                const teamDoc = await getDoc(teamDocRef);

                if (!teamDoc.exists()) {
                    throw new Error('Squadra non trovata');
                }

                const teamData = teamDoc.data();
                const currentValue = teamData[fieldName] || 0;
                const newValue = currentValue + amount;

                await updateDoc(teamDocRef, { [fieldName]: newValue });

                // Invia notifica alla squadra
                await sendCreditsNotification(teamId, teamData.teamName, amount, _assignCreditsSingleType);

                modal.classList.add('hidden');

                if (singleMsg) {
                    singleMsg.textContent = `Assegnati ${amount} ${displayName} a ${teamData.teamName}!`;
                    singleMsg.className = 'text-center text-sm mb-3 text-green-400';
                    setTimeout(() => {
                        singleMsg.textContent = '';
                    }, 5000);
                }

                // Ricarica la lista squadre
                window.AdminTeams.loadTeams(TEAMS_COLLECTION_PATH);

            } catch (error) {
                console.error('Errore assegnazione crediti:', error);
                errorMsg.textContent = `Errore: ${error.message}`;
            } finally {
                btnConfirm.disabled = false;
                btnConfirm.innerHTML = 'Conferma';
            }
        });
    };

    /**
     * Invia una notifica alla squadra per crediti ricevuti
     */
    const sendCreditsNotification = async (teamId, teamName, amount, creditType) => {
        try {
            const { doc, updateDoc, arrayUnion, Timestamp } = firestoreTools;
            const isCS = creditType === 'CS';
            const icon = isCS ? '💰' : '⭐';
            const displayName = isCS ? 'Crediti Seri' : 'Crediti Super Seri';

            const notification = {
                id: `credits_${Date.now()}`,
                type: 'credits_received',
                title: `${icon} ${displayName} Ricevuti!`,
                message: `Hai ricevuto ${amount} ${displayName}!`,
                timestamp: Timestamp.now(),
                read: false
            };

            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
            await updateDoc(teamDocRef, {
                notifications: arrayUnion(notification)
            });

            console.log(`[Notifica] Inviata notifica crediti a ${teamName}`);
        } catch (error) {
            console.error('Errore invio notifica:', error);
            // Non bloccare l'operazione se la notifica fallisce
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

        // Handler Assegna CS a squadra singola
        document.getElementById('btn-assign-cs-single')?.addEventListener('click', () => {
            openAssignCreditsSingleModal('CS');
        });

        // Handler Assegna CSS a squadra singola
        document.getElementById('btn-assign-css-single')?.addEventListener('click', () => {
            openAssignCreditsSingleModal('CSS');
        });

        // Handler Assegna CS a tutte le squadre
        document.getElementById('btn-assign-cs-all').addEventListener('click', () => {
            handleAssignCreditsToAll('CS');
        });

        // Handler Assegna CSS a tutte le squadre
        document.getElementById('btn-assign-css-all').addEventListener('click', () => {
            handleAssignCreditsToAll('CSS');
        });

        // Setup modal assegna crediti singola squadra
        setupAssignCreditsSingleModal();

        // Handler Fix Livelli Tutte le Squadre
        document.getElementById('btn-fix-all-teams-levels').addEventListener('click', () => {
            window.AdminTeams.fixAllTeamsLevels(TEAMS_COLLECTION_PATH);
        });

        // Handler Fix Abilita Icone
        document.getElementById('btn-fix-icone-abilities').addEventListener('click', async () => {
            const msgElement = document.getElementById('fix-all-levels-message');
            const button = document.getElementById('btn-fix-icone-abilities');

            if (!window.updateIconeAbilities) {
                if (msgElement) {
                    msgElement.textContent = 'Funzione updateIconeAbilities non disponibile.';
                    msgElement.className = 'text-center text-sm mb-3 text-red-400';
                }
                return;
            }

            // Conferma
            if (!confirm('Vuoi correggere le abilita delle Icone per tutte le squadre?\n\nQuesto aggiungera le abilita mancanti (es. Tiro Dritto per Amedemo).')) {
                return;
            }

            if (button) {
                button.disabled = true;
                button.textContent = '⏳ Correzione...';
            }
            if (msgElement) {
                msgElement.textContent = 'Correzione abilita Icone in corso...';
                msgElement.className = 'text-center text-sm mb-3 text-yellow-400';
            }

            try {
                await window.updateIconeAbilities();

                if (msgElement) {
                    msgElement.textContent = 'Abilita Icone corrette! Controlla console per dettagli.';
                    msgElement.className = 'text-center text-sm mb-3 text-green-400';
                }
                if (window.Toast) window.Toast.success('Abilita Icone corrette con successo!');
            } catch (error) {
                console.error('Errore correzione abilita:', error);
                if (msgElement) {
                    msgElement.textContent = `Errore: ${error.message}`;
                    msgElement.className = 'text-center text-sm mb-3 text-red-400';
                }
                if (window.Toast) window.Toast.error('Errore durante la correzione');
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = '⚡ Fix Abilita Icone';
                }
            }
        });

        // Handler Reset XP Tutti i Giocatori
        document.getElementById('btn-reset-all-players-exp').addEventListener('click', () => {
            resetAllPlayersExp(TEAMS_COLLECTION_PATH);
        });

        // Handler Repair EXP (normalizza EXP e applica level-up pendenti)
        document.getElementById('btn-repair-all-exp').addEventListener('click', async () => {
            const msgElement = document.getElementById('fix-all-levels-message');
            const button = document.getElementById('btn-repair-all-exp');

            if (!window.PlayerExp?.repairAllTeamsExp) {
                if (msgElement) {
                    msgElement.textContent = 'Modulo PlayerExp non disponibile.';
                    msgElement.className = 'text-center text-sm mb-3 text-red-400';
                }
                return;
            }

            // Conferma
            if (!confirm('Vuoi riparare l\'EXP di tutte le squadre?\n\nQuesto:\n- Applica level-up pendenti\n- Normalizza EXP per giocatori al max\n- Corregge expToNextLevel')) {
                return;
            }

            if (button) {
                button.disabled = true;
                button.textContent = '⏳ Riparazione...';
            }
            if (msgElement) {
                msgElement.textContent = 'Riparazione EXP in corso...';
                msgElement.className = 'text-center text-sm mb-3 text-yellow-400';
            }

            try {
                const result = await window.PlayerExp.repairAllTeamsExp();

                if (msgElement) {
                    if (result.totalFixed > 0) {
                        const detailsHtml = result.details.map(d =>
                            `${d.team}: ${d.fixed} fix`
                        ).join(', ');
                        msgElement.innerHTML = `<span class="text-green-400">✅ Completato!</span><br>
                            <span class="text-white">Giocatori corretti: ${result.totalFixed}</span><br>
                            <span class="text-gray-400 text-xs">${detailsHtml}</span>`;
                        msgElement.className = 'text-center text-sm mb-3';
                    } else {
                        msgElement.textContent = `✅ Nessuna correzione necessaria (${result.teamsProcessed} squadre controllate)`;
                        msgElement.className = 'text-center text-sm mb-3 text-green-400';
                    }
                }
            } catch (error) {
                console.error('[Admin] Errore repair EXP:', error);
                if (msgElement) {
                    msgElement.textContent = `Errore: ${error.message}`;
                    msgElement.className = 'text-center text-sm mb-3 text-red-400';
                }
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = '📊 Repair EXP';
                }
            }
        });

        // Handler Reset Statistiche Avanzate (PlayerStats)
        document.getElementById('btn-reset-advanced-stats')?.addEventListener('click', async () => {
            const msgElement = document.getElementById('fix-all-levels-message');
            const button = document.getElementById('btn-reset-advanced-stats');

            if (!window.PlayerStats?.resetAllAdvancedStats) {
                if (msgElement) {
                    msgElement.textContent = 'Modulo PlayerStats non disponibile.';
                    msgElement.className = 'text-center text-sm mb-3 text-red-400';
                }
                return;
            }

            // Conferma doppia per sicurezza
            if (!confirm('⚠️ ATTENZIONE ⚠️\n\nVuoi CANCELLARE tutte le statistiche avanzate?\n\nQuesto eliminerà:\n- Goal, Assist, Contrasti, Parate\n- Storico partite\n- Performance medie\n\nL\'operazione è IRREVERSIBILE!')) {
                return;
            }

            if (!confirm('Sei SICURO di voler procedere?\n\nTutte le statistiche verranno azzerate.')) {
                return;
            }

            if (button) {
                button.disabled = true;
                button.textContent = '⏳ Reset in corso...';
            }
            if (msgElement) {
                msgElement.textContent = 'Reset statistiche in corso...';
                msgElement.className = 'text-center text-sm mb-3 text-yellow-400';
            }

            try {
                const result = await window.PlayerStats.resetAllAdvancedStats();

                if (msgElement) {
                    msgElement.innerHTML = `<span class="text-green-400">✅ Reset completato!</span><br>
                        <span class="text-white">Squadre: ${result.teamsReset} | Giocatori: ${result.playersReset}</span>`;
                    msgElement.className = 'text-center text-sm mb-3';
                }
            } catch (error) {
                console.error('[Admin] Errore reset statistiche:', error);
                if (msgElement) {
                    msgElement.textContent = `Errore: ${error.message}`;
                    msgElement.className = 'text-center text-sm mb-3 text-red-400';
                }
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = '🗑️ Reset Statistiche Avanzate';
                }
            }
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

    /**
     * Renderizza pannello gestione Feature Flags
     */
    const renderFeatureFlagsPanel = async () => {
        window.showScreen(featureFlagsContent);

        // Precarica config AdminRewards per il toggle
        if (window.AdminRewards && !window.AdminRewards._config) {
            try {
                await window.AdminRewards.loadConfig();
                console.log('[Admin] Config reward precaricata per Flag panel');
            } catch (e) {
                console.warn('[Admin] Errore precaricamento config reward:', e);
            }
        }

        // Renderizza il contenuto tramite AdminFeatureFlags
        if (window.AdminFeatureFlags) {
            await window.AdminFeatureFlags.render('feature-flags-tools-container');
        } else {
            featureFlagsToolsContainer.innerHTML = `
                <p class="text-center text-red-400">Modulo AdminFeatureFlags non disponibile.</p>
            `;
        }
    };

    const handleAdminLogout = () => {
        console.log("Logout Admin effettuato.");
        if (window.handleLogout) window.handleLogout();
    };

    document.addEventListener('adminLoggedIn', initializeAdminPanel);
    
    window.loadDraftPlayersAdmin = () => window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
    window.loadMarketPlayersAdmin = () => window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
});