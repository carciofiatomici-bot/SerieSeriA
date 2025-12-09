//
// ====================================================================
// USER-COMPETITIONS.JS - Schermate Campionato, Coppa, Supercoppa (Utente)
// ====================================================================
//

window.UserCompetitions = {

    // ================================================================
    // SCHERMATA CAMPIONATO
    // ================================================================

    /**
     * Carica e renderizza la schermata Campionato utente
     */
    async loadCampionatoScreen() {
        const container = document.getElementById('user-campionato-container');
        if (!container) return;

        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) {
            container.innerHTML = `<p class="text-red-400 text-center">Errore: Nessuna squadra selezionata</p>`;
            return;
        }

        container.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-500 mx-auto mb-4"></div>
                <p class="text-white">Caricamento dati campionato...</p>
            </div>
        `;

        try {
            const { doc, getDoc, collection, getDocs } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            // Carica calendario
            const schedulePath = `artifacts/${appId}/public/data/schedule/full_schedule`;
            const scheduleRef = doc(db, schedulePath);
            const scheduleSnap = await getDoc(scheduleRef);
            const scheduleData = scheduleSnap.exists() ? scheduleSnap.data().matches : [];

            // Carica classifica
            const leaderboardPath = `artifacts/${appId}/public/data/leaderboard/standings`;
            const leaderboardRef = doc(db, leaderboardPath);
            const leaderboardSnap = await getDoc(leaderboardRef);
            const standings = leaderboardSnap.exists() ? leaderboardSnap.data().standings : [];

            // Trova prossima partita
            let nextMatch = null;
            for (const round of scheduleData) {
                if (!round.matches) continue;
                const match = round.matches.find(m =>
                    m.result === null && (m.homeId === currentTeamId || m.awayId === currentTeamId)
                );
                if (match) {
                    nextMatch = { ...match, round: round.round };
                    break;
                }
            }

            // Renderizza
            this.renderCampionatoScreen(container, nextMatch, standings, scheduleData, currentTeamId);

        } catch (error) {
            console.error('Errore caricamento campionato:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${error.message}</p>`;
        }
    },

    /**
     * Renderizza la schermata Campionato
     */
    renderCampionatoScreen(container, nextMatch, standings, scheduleData, currentTeamId) {
        let html = '';

        // SEZIONE 1: Prossima Partita
        html += `
            <div class="bg-gradient-to-r from-green-900 to-green-800 rounded-lg p-4 border-2 border-green-500 shadow-lg">
                <h3 class="text-xl font-bold text-green-400 mb-3 flex items-center gap-2">
                    <span>⚽</span> Prossima Partita
                </h3>
        `;

        if (nextMatch) {
            const isHome = nextMatch.homeId === currentTeamId;
            const statusText = isHome ? '🏠 IN CASA' : '✈️ TRASFERTA';
            const statusColor = isHome ? 'text-green-400' : 'text-blue-400';

            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4">
                    <p class="text-gray-400 text-sm mb-2">Giornata ${nextMatch.round}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3 flex-1">
                            ${window.getLogoHtml ? window.getLogoHtml(nextMatch.homeId) : ''}
                            <span class="text-white font-bold text-lg ${nextMatch.homeId === currentTeamId ? 'text-yellow-400' : ''}">${nextMatch.homeName}</span>
                        </div>
                        <div class="text-center px-4">
                            <span class="text-2xl font-bold text-gray-400">VS</span>
                        </div>
                        <div class="flex items-center gap-3 flex-1 justify-end">
                            <span class="text-white font-bold text-lg ${nextMatch.awayId === currentTeamId ? 'text-yellow-400' : ''}">${nextMatch.awayName}</span>
                            ${window.getLogoHtml ? window.getLogoHtml(nextMatch.awayId) : ''}
                        </div>
                    </div>
                    <p class="text-center mt-3 ${statusColor} font-bold">${statusText}</p>
                </div>
            `;
        } else {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-green-400 font-bold">✅ Tutte le partite sono state giocate!</p>
                    <p class="text-gray-400 text-sm mt-1">Il campionato e concluso.</p>
                </div>
            `;
        }
        html += `</div>`;

        // SEZIONE 2: Classifica
        html += `
            <div class="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-4 border-2 border-blue-500 shadow-lg">
                <h3 class="text-xl font-bold text-blue-400 mb-3 flex items-center gap-2">
                    <span>📊</span> Classifica
                </h3>
        `;

        if (standings.length === 0) {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-gray-400">Classifica non ancora disponibile.</p>
                </div>
            `;
        } else {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg overflow-hidden">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-800">
                            <tr>
                                <th class="py-2 px-3 text-left text-gray-400">#</th>
                                <th class="py-2 px-3 text-left text-gray-400">Squadra</th>
                                <th class="py-2 px-3 text-center text-gray-400">Pt</th>
                                <th class="py-2 px-3 text-center text-gray-400">G</th>
                                <th class="py-2 px-3 text-center text-gray-400">V</th>
                                <th class="py-2 px-3 text-center text-gray-400">P</th>
                                <th class="py-2 px-3 text-center text-gray-400">S</th>
                                <th class="py-2 px-3 text-center text-gray-400">DR</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            standings.forEach((team, index) => {
                const isCurrentTeam = team.teamId === currentTeamId;
                const rowClass = isCurrentTeam ? 'bg-yellow-900 bg-opacity-50' : (index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800');
                const textClass = isCurrentTeam ? 'text-yellow-400 font-bold' : 'text-white';
                const goalDiff = (team.goalsFor || 0) - (team.goalsAgainst || 0);
                const diffColor = goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-gray-400';

                html += `
                    <tr class="${rowClass}">
                        <td class="py-2 px-3 ${textClass}">${index + 1}</td>
                        <td class="py-2 px-3 ${textClass}">${team.teamName}</td>
                        <td class="py-2 px-3 text-center font-bold ${textClass}">${team.points || 0}</td>
                        <td class="py-2 px-3 text-center text-gray-400">${team.gamesPlayed || 0}</td>
                        <td class="py-2 px-3 text-center text-green-400">${team.wins || 0}</td>
                        <td class="py-2 px-3 text-center text-yellow-400">${team.draws || 0}</td>
                        <td class="py-2 px-3 text-center text-red-400">${team.losses || 0}</td>
                        <td class="py-2 px-3 text-center ${diffColor}">${goalDiff >= 0 ? '+' : ''}${goalDiff}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        html += `</div>`;

        // SEZIONE 3: Calendario
        html += `
            <div class="bg-gradient-to-r from-teal-900 to-teal-800 rounded-lg p-4 border-2 border-teal-500 shadow-lg">
                <h3 class="text-xl font-bold text-teal-400 mb-3 flex items-center gap-2">
                    <span>📅</span> Calendario Completo
                </h3>
        `;

        if (scheduleData.length === 0) {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-gray-400">Calendario non ancora generato.</p>
                </div>
            `;
        } else {
            html += `<div class="max-h-96 overflow-y-auto space-y-3">`;

            scheduleData.forEach(round => {
                const roundComplete = round.matches.every(m => m.result !== null);
                const statusIcon = roundComplete ? '✅' : '⏳';

                html += `
                    <div class="bg-black bg-opacity-30 rounded-lg p-3">
                        <p class="text-teal-300 font-bold mb-2">${statusIcon} Giornata ${round.round}</p>
                        <div class="space-y-1">
                `;

                round.matches.forEach(match => {
                    const isMyMatch = match.homeId === currentTeamId || match.awayId === currentTeamId;
                    const matchBg = isMyMatch ? 'bg-yellow-900 bg-opacity-30' : '';

                    html += `
                        <div class="flex justify-between items-center text-sm p-2 rounded ${matchBg}">
                            <span class="${match.homeId === currentTeamId ? 'text-yellow-400 font-bold' : 'text-white'}">${match.homeName}</span>
                            <span class="text-gray-400 mx-2">
                                ${match.result ? `<span class="text-white font-bold">${match.result}</span>` : 'vs'}
                            </span>
                            <span class="${match.awayId === currentTeamId ? 'text-yellow-400 font-bold' : 'text-white'}">${match.awayName}</span>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }
        html += `</div>`;

        container.innerHTML = html;
    },

    // ================================================================
    // SCHERMATA COPPA
    // ================================================================

    /**
     * Carica e renderizza la schermata Coppa utente
     */
    async loadCoppaScreen() {
        const container = document.getElementById('user-coppa-container');
        if (!container) return;

        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) {
            container.innerHTML = `<p class="text-red-400 text-center">Errore: Nessuna squadra selezionata</p>`;
            return;
        }

        container.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
                <p class="text-white">Caricamento dati coppa...</p>
            </div>
        `;

        try {
            const bracket = await window.CoppaSchedule.loadCupSchedule();
            this.renderCoppaScreen(container, bracket, currentTeamId);
        } catch (error) {
            console.error('Errore caricamento coppa:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${error.message}</p>`;
        }
    },

    /**
     * Renderizza la schermata Coppa
     */
    renderCoppaScreen(container, bracket, currentTeamId) {
        let html = '';

        if (!bracket) {
            html = `
                <div class="bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg p-6 border-2 border-purple-500 text-center">
                    <p class="text-purple-400 text-xl font-bold mb-2">🏆 CoppaSeriA</p>
                    <p class="text-gray-400">La coppa non e ancora iniziata.</p>
                    <p class="text-gray-500 text-sm mt-2">Attendi che l'admin generi il tabellone.</p>
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        // Verifica se l'utente partecipa
        const teamMatches = window.CoppaSchedule.getTeamMatches(bracket, currentTeamId);
        const hasBye = window.CoppaSchedule.teamHasBye(bracket, currentTeamId);
        const isParticipating = teamMatches.length > 0 || hasBye;

        // SEZIONE 1: Prossima Partita Coppa
        html += `
            <div class="bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg p-4 border-2 border-purple-500 shadow-lg">
                <h3 class="text-xl font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <span>⚽</span> La Tua Situazione in Coppa
                </h3>
        `;

        if (!isParticipating) {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-gray-400">Non sei iscritto alla CoppaSeriA.</p>
                </div>
            `;
        } else if (hasBye) {
            html += `
                <div class="bg-green-900 bg-opacity-50 rounded-lg p-4 text-center">
                    <p class="text-green-400 font-bold">✅ Hai un BYE!</p>
                    <p class="text-gray-300 text-sm mt-1">Passi direttamente al turno successivo.</p>
                </div>
            `;
        } else {
            // Trova prossima partita da giocare
            const nextCupMatch = teamMatches.find(m => !m.winner);

            if (nextCupMatch) {
                const isHome = nextCupMatch.homeTeam?.teamId === currentTeamId;
                const opponent = isHome ? nextCupMatch.awayTeam : nextCupMatch.homeTeam;
                const statusText = isHome ? '🏠 IN CASA' : '✈️ TRASFERTA';

                html += `
                    <div class="bg-black bg-opacity-30 rounded-lg p-4">
                        <p class="text-gray-400 text-sm mb-2">${nextCupMatch.roundName} ${nextCupMatch.isSingleMatch ? '(Partita Secca)' : '(Andata/Ritorno)'}</p>
                        <div class="flex items-center justify-center gap-4">
                            <span class="text-yellow-400 font-bold text-lg">Tu</span>
                            <span class="text-gray-400 text-xl">VS</span>
                            <span class="text-white font-bold text-lg">${opponent?.teamName || 'TBD'}</span>
                        </div>
                        <p class="text-center mt-2 text-purple-300">${statusText}</p>
                        ${!nextCupMatch.isSingleMatch && nextCupMatch.leg1Result ? `
                            <p class="text-center mt-2 text-gray-400 text-sm">Andata: ${nextCupMatch.leg1Result}</p>
                        ` : ''}
                    </div>
                `;
            } else {
                // Verifico se eliminato o passato
                const lastMatch = teamMatches[teamMatches.length - 1];
                const eliminated = lastMatch && lastMatch.winner && lastMatch.winner.teamId !== currentTeamId;

                if (eliminated) {
                    html += `
                        <div class="bg-red-900 bg-opacity-50 rounded-lg p-4 text-center">
                            <p class="text-red-400 font-bold">❌ Eliminato</p>
                            <p class="text-gray-300 text-sm mt-1">Sei stato eliminato nel turno: ${lastMatch.roundName}</p>
                        </div>
                    `;
                } else if (bracket.winner && bracket.winner.teamId === currentTeamId) {
                    html += `
                        <div class="bg-yellow-900 bg-opacity-50 rounded-lg p-4 text-center">
                            <p class="text-yellow-400 font-bold text-xl">🏆 HAI VINTO LA COPPA!</p>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="bg-green-900 bg-opacity-50 rounded-lg p-4 text-center">
                            <p class="text-green-400 font-bold">✅ Ancora in corsa!</p>
                            <p class="text-gray-300 text-sm mt-1">Attendi il prossimo turno.</p>
                        </div>
                    `;
                }
            }
        }
        html += `</div>`;

        // SEZIONE 2: Tabellone Compatto
        html += `
            <div class="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-lg p-4 border-2 border-indigo-500 shadow-lg">
                <h3 class="text-xl font-bold text-indigo-400 mb-3 flex items-center gap-2">
                    <span>📋</span> Tabellone
                </h3>
        `;

        // Usa il tabellone compatto esistente
        html += window.CoppaUI.renderCompactBracket(bracket);

        // Vincitore se presente
        if (bracket.winner) {
            html += `
                <div class="mt-4 p-3 bg-yellow-900 bg-opacity-50 rounded-lg text-center">
                    <p class="text-yellow-400 font-bold">🏆 Vincitore: ${bracket.winner.teamName}</p>
                </div>
            `;
        }

        html += `</div>`;

        container.innerHTML = html;
    },

    // ================================================================
    // SCHERMATA SUPERCOPPA
    // ================================================================

    /**
     * Carica e renderizza la schermata Supercoppa utente
     */
    async loadSupercoppScreen() {
        const container = document.getElementById('user-supercoppa-container');
        if (!container) return;

        const currentTeamId = window.InterfacciaCore.currentTeamId;

        container.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-500 mx-auto mb-4"></div>
                <p class="text-white">Caricamento dati supercoppa...</p>
            </div>
        `;

        try {
            const bracket = await window.Supercoppa.loadSupercoppa();
            this.renderSupercoppScreen(container, bracket, currentTeamId);
        } catch (error) {
            console.error('Errore caricamento supercoppa:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${error.message}</p>`;
        }
    },

    /**
     * Renderizza la schermata Supercoppa
     */
    renderSupercoppScreen(container, bracket, currentTeamId) {
        let html = '';

        if (!bracket) {
            html = `
                <div class="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg p-6 border-2 border-yellow-500 text-center">
                    <p class="text-yellow-400 text-xl font-bold mb-2">⭐ Super CoppaSeriA</p>
                    <p class="text-gray-400">La Supercoppa non e ancora in programma.</p>
                    <p class="text-gray-500 text-sm mt-2">Verra creata dopo il termine del campionato e della coppa.</p>
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        const isParticipant = bracket.homeTeam?.teamId === currentTeamId || bracket.awayTeam?.teamId === currentTeamId;
        const isCompleted = bracket.isCompleted;
        const isWinner = bracket.winner?.teamId === currentTeamId;

        html = `
            <div class="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg p-6 border-2 border-yellow-500 shadow-lg">
                <h3 class="text-2xl font-bold text-yellow-400 mb-4 text-center">⭐ Super CoppaSeriA</h3>
        `;

        // Stato partita
        if (isParticipant) {
            html += `
                <div class="mb-4 p-3 ${isWinner ? 'bg-green-900' : 'bg-yellow-800'} bg-opacity-50 rounded-lg text-center">
                    <p class="${isWinner ? 'text-green-400' : 'text-yellow-300'} font-bold">
                        ${isWinner ? '🏆 HAI VINTO LA SUPERCOPPA!' : isCompleted ? '😔 Hai perso la finale' : '⭐ Partecipi alla Supercoppa!'}
                    </p>
                </div>
            `;
        }

        // Card partita
        html += `
            <div class="bg-black bg-opacity-40 rounded-lg p-6">
                <div class="grid grid-cols-3 gap-4 items-center">
                    <!-- Home Team -->
                    <div class="text-center">
                        <p class="text-xs text-yellow-300 mb-1">${bracket.homeTeam?.qualification || ''}</p>
                        <p class="text-xl font-bold ${bracket.homeTeam?.teamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">
                            ${bracket.homeTeam?.teamName || 'TBD'}
                        </p>
                    </div>

                    <!-- Risultato / VS -->
                    <div class="text-center">
                        ${bracket.result ?
                            `<p class="text-3xl font-extrabold text-yellow-400">${bracket.result}</p>
                             ${bracket.penalties ? `<p class="text-xs text-gray-400">(d.c.r.)</p>` : ''}` :
                            `<p class="text-2xl text-gray-400 font-bold">VS</p>
                             <p class="text-xs text-gray-500">Partita Secca</p>`
                        }
                    </div>

                    <!-- Away Team -->
                    <div class="text-center">
                        <p class="text-xs text-yellow-300 mb-1">${bracket.awayTeam?.qualification || ''}</p>
                        <p class="text-xl font-bold ${bracket.awayTeam?.teamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">
                            ${bracket.awayTeam?.teamName || 'TBD'}
                        </p>
                    </div>
                </div>

                ${bracket.winner ? `
                    <div class="mt-4 pt-4 border-t border-gray-700 text-center">
                        <p class="text-green-400 font-extrabold text-lg">
                            🏆 Vincitore: ${bracket.winner.teamName}
                        </p>
                        <p class="text-gray-400 text-sm mt-1">Premio: 1 CSS</p>
                    </div>
                ` : `
                    <div class="mt-4 pt-4 border-t border-gray-700 text-center">
                        <p class="text-yellow-400">⏳ In attesa di essere giocata</p>
                    </div>
                `}
            </div>
        `;

        html += `</div>`;

        container.innerHTML = html;
    },

    // ================================================================
    // INIZIALIZZAZIONE EVENT LISTENERS
    // ================================================================

    /**
     * Inizializza i listener per i bottoni della dashboard
     */
    initializeNavigationListeners() {
        // Bottone Campionato
        const btnCampionato = document.getElementById('btn-user-campionato');
        if (btnCampionato) {
            btnCampionato.addEventListener('click', () => {
                window.showScreen(document.getElementById('user-campionato-content'));
                this.loadCampionatoScreen();
            });
        }

        // Bottone Coppa
        const btnCoppa = document.getElementById('btn-user-coppa');
        if (btnCoppa) {
            btnCoppa.addEventListener('click', () => {
                window.showScreen(document.getElementById('user-coppa-content'));
                this.loadCoppaScreen();
            });
        }

        // Bottone Supercoppa
        const btnSupercoppa = document.getElementById('btn-user-supercoppa');
        if (btnSupercoppa) {
            btnSupercoppa.addEventListener('click', () => {
                window.showScreen(document.getElementById('user-supercoppa-content'));
                this.loadSupercoppScreen();
            });
        }

        // Bottoni Back
        const backButtons = [
            'user-campionato-back-button',
            'user-coppa-back-button',
            'user-supercoppa-back-button'
        ];

        backButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    window.showScreen(document.getElementById('app-content'));
                });
            }
        });
    }
};

console.log("Modulo User-Competitions caricato.");
