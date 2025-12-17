//
// ====================================================================
// ADMIN-SCHEDINA.JS - Configurazione Schedina Pronostici
// ====================================================================
//

window.AdminSchedina = {

    /**
     * Renderizza il pannello configurazione schedina
     */
    async renderConfigPanel(container) {
        if (!container) return;

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
                        Salva Configurazione
                    </button>
                    <button id="btn-calculate-schedina-results"
                            class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 py-2 rounded-lg">
                        Calcola Risultati Ultima Giornata
                    </button>
                    <button id="btn-apply-schedina-rewards"
                            class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-lg">
                        Assegna Premi
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
        this.setupListeners(container);
    },

    /**
     * Setup event listeners per il pannello
     */
    setupListeners(container) {
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
    }
};

console.log('Modulo admin-schedina.js caricato.');
