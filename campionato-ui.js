//
// ====================================================================
// MODULO CAMPIONATO-UI.JS (Rendering Interfaccia)
// ====================================================================
//

window.ChampionshipUI = {

    /**
     * Renderizza l'anteprima del calendario (prime 6 giornate).
     */
    renderSchedulePreview(schedule, numTeams) {
        const DEFAULT_LOGO_URL = "https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg";
        
        if (!schedule || schedule.length === 0) {
            return `<p class="text-gray-400 text-center">Nessun calendario generato. Clicca il pulsante sopra.</p>`;
        }
        
        const getLogoHtmlSafe = window.getLogoHtml || ((id) => `<img src="${DEFAULT_LOGO_URL}" alt="Logo" class="w-6 h-6 rounded-full border border-gray-500 inline-block align-middle mr-2">`);
        
        let previewHtml = `<p class="text-white font-semibold mb-3">Riepilogo Calendario Attuale (${schedule.length} Giornate):</p>`;

        const roundsToShow = schedule.slice(0, 6);
        const nextRound = schedule.find(round => round.matches.some(match => match.result === null));
        
        if (roundsToShow.length === 0) {
             return `<p class="text-gray-400 text-center">Nessun calendario generato. Clicca il pulsante sopra.</p>`;
        }

        roundsToShow.forEach(roundData => {
            const isPlayed = roundData.matches.every(match => match.result !== null); 
            const roundColor = isPlayed ? 'text-green-300' : 'text-yellow-300';
            const roundBg = roundData.matches.length > 0 && roundData.matches[0].type === 'Ritorno' ? 'bg-indigo-700' : 'bg-gray-600';

            previewHtml += `
                <div class="mb-2 p-2 rounded-md ${roundBg}">
                    <p class="font-bold text-sm ${roundColor}">Giornata ${roundData.round} (${roundData.matches[0]?.type || 'N/A'}) - ${isPlayed ? 'GIOCATA' : 'DA GIOCARE'}</p>
                </div>
            `;
        });
        
        if (schedule.length > 6) {
             previewHtml += `<p class="text-center text-gray-400 mt-2">... e ${schedule.length - 6} altre giornate...</p>`;
        }
        
        if (nextRound && !nextRound.matches.every(match => match.result !== null)) {
             previewHtml += `<p class="text-center text-yellow-300 font-semibold mt-4">Prossima simulazione: Giornata ${nextRound.round}</p>`;
        }

        return previewHtml;
    },

    /**
     * Renderizza l'interfaccia completa di simulazione partita per partita.
     */
    renderFullScheduleSimulation(schedule, allTeams, callbacks) {
        const scheduleContainer = document.getElementById('schedule-display-container');
        if (!scheduleContainer) return;
        
        const DEFAULT_LOGO_URL = "https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg";
        const getLogoHtml = window.getLogoHtml || ((teamId) => `<img src="${DEFAULT_LOGO_URL}" alt="Logo" class="w-6 h-6 rounded-full border border-gray-500 inline-block align-middle mr-2">`);
        
        const nextRound = schedule.find(round => 
            round.matches.some(match => match.result === null)
        );
        
        const currentRoundNumber = nextRound ? nextRound.round : (schedule.length > 0 ? schedule[schedule.length - 1].round : 1);
        
        let fullScheduleHtml = `
            <div class="p-4 bg-gray-700 rounded-lg border border-teal-600 mb-4">
                <h4 class="text-2xl font-bold text-teal-400 mb-4">Simulazione Partita per Partita</h4>
                <p class="text-gray-300 mb-4">Partite della Giornata ${currentRoundNumber}. Simula singolarmente o tutta la giornata.</p>
                
                <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <button id="btn-simulate-full-round" 
                            class="flex-1 bg-yellow-600 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-yellow-500 transition duration-150 transform hover:scale-[1.01]"
                            ${!nextRound ? 'disabled' : ''}
                            data-round-index="${nextRound ? schedule.indexOf(nextRound) : -1}">
                        Simula Tutta la Giornata ${currentRoundNumber}
                    </button>
                    <button id="btn-back-to-dashboard" class="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition">
                        â† Torna alla Dashboard Campionato
                    </button>
                </div>
            </div>
            <div id="full-schedule-list" class="space-y-4 max-h-[70vh] overflow-y-auto">
        `;
        
        schedule.forEach((roundData, roundIndex) => {
            if (nextRound) {
                if (roundData.round !== currentRoundNumber) return;
            } else {
                 if (roundData.round !== currentRoundNumber) return;
            }

            const isRoundPlayed = roundData.matches.every(match => match.result !== null);
            
            fullScheduleHtml += `
                <div class="p-3 rounded-lg border ${isRoundPlayed ? 'border-green-700 bg-gray-900' : 'border-yellow-600 bg-gray-800'}">
                    <h5 class="text-xl font-extrabold ${isRoundPlayed ? 'text-green-400' : 'text-yellow-400'} mb-3">
                        GIORNATA ${roundData.round} (${roundData.matches[0]?.type || 'N/A'})
                    </h5>
                    <div class="space-y-3">
            `;
            
            roundData.matches.forEach((match, matchIndex) => {
                const isMatchPlayed = match.result !== null;
                const matchStatusClass = isMatchPlayed ? 'bg-gray-700' : 'bg-red-700';
                
                fullScheduleHtml += `
                    <div class="flex flex-col sm:flex-row justify-between items-center p-3 rounded-lg border border-gray-600 ${matchStatusClass}">
                        
                        <div class="w-full sm:w-1/3 flex items-center justify-start text-white font-semibold">
                            ${getLogoHtml(match.homeId)} <span class="ml-2">${match.homeName}</span>
                        </div>

                        <div class="w-full sm:w-1/3 text-center my-2 sm:my-0">
                            ${isMatchPlayed 
                                ? `<span class="text-xl font-extrabold text-white">${match.result}</span>`
                                : `<span class="text-lg text-gray-300">VS</span>`
                            }
                        </div>
                        
                        <div class="w-full sm:w-1/3 flex items-center justify-end text-white font-semibold">
                            <span class="mr-2">${match.awayName}</span> ${getLogoHtml(match.awayId)}
                        </div>

                        <div class="w-full sm:w-auto mt-2 sm:mt-0">
                            <button data-round-index="${roundIndex}" 
                                    data-match-index="${matchIndex}"
                                    data-action="simulate-single"
                                    class="w-full sm:w-auto px-4 py-2 rounded-lg font-bold transition duration-150 shadow-md
                                    ${isMatchPlayed ? 'bg-gray-500 cursor-not-allowed' : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'}"
                                    ${isMatchPlayed ? 'disabled' : ''}>
                                ${isMatchPlayed ? 'Giocata' : 'Simula Partita'}
                            </button>
                        </div>
                    </div>
                `;
            });
            
            fullScheduleHtml += `</div></div>`;
        });
        
        fullScheduleHtml += `</div>`;
        
        scheduleContainer.innerHTML = fullScheduleHtml;
        
        // Aggiungi listener per simulazione singola
        const fullScheduleList = document.getElementById('full-schedule-list');
        if (fullScheduleList && callbacks.onSimulateSingle) {
            fullScheduleList.addEventListener('click', (e) => {
                 const target = e.target;
                 if (target.dataset.action === 'simulate-single') {
                     const roundIndex = parseInt(target.dataset.roundIndex);
                     const matchIndex = parseInt(target.dataset.matchIndex);
                     callbacks.onSimulateSingle(roundIndex, matchIndex, schedule, allTeams, target);
                 }
            });
        }
        
        // Listener per simulazione giornata completa
        const btnSimulateFullRound = document.getElementById('btn-simulate-full-round');
        if (btnSimulateFullRound && !btnSimulateFullRound.disabled && callbacks.onSimulateRound) {
            btnSimulateFullRound.addEventListener('click', () => {
                const roundIndex = parseInt(btnSimulateFullRound.dataset.roundIndex);
                if (roundIndex !== -1) {
                    callbacks.onSimulateRound(roundIndex, schedule, allTeams, btnSimulateFullRound);
                }
            });
        }
        
        // Listener per tornare alla dashboard
        const btnBackToDashboard = document.getElementById('btn-back-to-dashboard');
        if (btnBackToDashboard && callbacks.onBackToDashboard) {
            btnBackToDashboard.addEventListener('click', callbacks.onBackToDashboard);
        }
    }
};