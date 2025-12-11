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

            // Carica i dati delle squadre per la prossima partita (livelli medi)
            let teamsData = {};
            if (nextMatch) {
                const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

                // Carica dati squadra casa
                const homeTeamRef = doc(db, TEAMS_COLLECTION_PATH, nextMatch.homeId);
                const homeTeamSnap = await getDoc(homeTeamRef);
                if (homeTeamSnap.exists()) {
                    teamsData[nextMatch.homeId] = homeTeamSnap.data();
                }

                // Carica dati squadra trasferta
                const awayTeamRef = doc(db, TEAMS_COLLECTION_PATH, nextMatch.awayId);
                const awayTeamSnap = await getDoc(awayTeamRef);
                if (awayTeamSnap.exists()) {
                    teamsData[nextMatch.awayId] = awayTeamSnap.data();
                }
            }

            // Renderizza
            this.renderCampionatoScreen(container, nextMatch, standings, scheduleData, currentTeamId, teamsData);

        } catch (error) {
            console.error('Errore caricamento campionato:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${error.message}</p>`;
        }
    },

    /**
     * Renderizza la schermata Campionato
     */
    renderCampionatoScreen(container, nextMatch, standings, scheduleData, currentTeamId, teamsData = {}) {
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

            // Funzione per ottenere logo grande
            const getLargeLogoHtml = (teamId) => {
                const url = window.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
                return `<img src="${url}" alt="Logo" class="w-28 h-28 rounded-full border-4 border-gray-600 shadow-lg object-cover">`;
            };

            // Calcola livello medio formazione per ogni squadra
            const getFormationLevel = (teamId) => {
                const teamData = teamsData[teamId];
                if (!teamData) return '?';
                const formationPlayers = window.getFormationPlayers(teamData);
                if (formationPlayers.length === 0) return '?';
                return window.calculateAverageLevel(formationPlayers).toFixed(1);
            };

            const homeLvl = getFormationLevel(nextMatch.homeId);
            const awayLvl = getFormationLevel(nextMatch.awayId);

            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-6">
                    <p class="text-gray-400 text-sm mb-4 text-center">Giornata ${nextMatch.round}</p>
                    <div class="flex items-center justify-center gap-6">
                        <div class="flex flex-col items-center gap-2">
                            ${getLargeLogoHtml(nextMatch.homeId)}
                            <span class="text-white font-bold text-lg text-center ${nextMatch.homeId === currentTeamId ? 'text-yellow-400' : ''}">${nextMatch.homeName}</span>
                            <span class="text-sm px-3 py-1 bg-gray-700 rounded-full text-cyan-400 font-semibold">Lv. ${homeLvl}</span>
                        </div>
                        <div class="text-center px-4">
                            <span class="text-3xl font-bold text-gray-400">VS</span>
                        </div>
                        <div class="flex flex-col items-center gap-2">
                            ${getLargeLogoHtml(nextMatch.awayId)}
                            <span class="text-white font-bold text-lg text-center ${nextMatch.awayId === currentTeamId ? 'text-yellow-400' : ''}">${nextMatch.awayName}</span>
                            <span class="text-sm px-3 py-1 bg-gray-700 rounded-full text-cyan-400 font-semibold">Lv. ${awayLvl}</span>
                        </div>
                    </div>
                    <p class="text-center mt-4 ${statusColor} font-bold text-lg">${statusText}</p>
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
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const bracket = await window.CoppaSchedule.loadCupSchedule();

            // Carica i dati delle squadre per la prossima partita (livelli medi)
            let teamsData = {};
            if (bracket) {
                const teamMatches = window.CoppaSchedule.getTeamMatches(bracket, currentTeamId);
                const nextCupMatch = teamMatches.find(m => !m.winner);

                if (nextCupMatch && nextCupMatch.homeTeam && nextCupMatch.awayTeam) {
                    const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

                    // Carica dati squadra casa
                    if (nextCupMatch.homeTeam.teamId) {
                        const homeTeamRef = doc(db, TEAMS_COLLECTION_PATH, nextCupMatch.homeTeam.teamId);
                        const homeTeamSnap = await getDoc(homeTeamRef);
                        if (homeTeamSnap.exists()) {
                            teamsData[nextCupMatch.homeTeam.teamId] = homeTeamSnap.data();
                        }
                    }

                    // Carica dati squadra trasferta
                    if (nextCupMatch.awayTeam.teamId) {
                        const awayTeamRef = doc(db, TEAMS_COLLECTION_PATH, nextCupMatch.awayTeam.teamId);
                        const awayTeamSnap = await getDoc(awayTeamRef);
                        if (awayTeamSnap.exists()) {
                            teamsData[nextCupMatch.awayTeam.teamId] = awayTeamSnap.data();
                        }
                    }
                }
            }

            this.renderCoppaScreen(container, bracket, currentTeamId, teamsData);
        } catch (error) {
            console.error('Errore caricamento coppa:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${error.message}</p>`;
        }
    },

    /**
     * Renderizza la schermata Coppa
     */
    renderCoppaScreen(container, bracket, currentTeamId, teamsData = {}) {
        let html = '';

        // Verifica se l'utente partecipa (solo se bracket esiste)
        const teamMatches = bracket ? window.CoppaSchedule.getTeamMatches(bracket, currentTeamId) : [];
        const hasBye = bracket ? window.CoppaSchedule.teamHasBye(bracket, currentTeamId) : false;
        const isParticipating = teamMatches.length > 0 || hasBye;

        // Funzione per ottenere logo grande
        const getLargeLogoHtml = (teamId) => {
            const url = window.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
            return `<img src="${url}" alt="Logo" class="w-28 h-28 rounded-full border-4 border-gray-600 shadow-lg object-cover">`;
        };

        // Calcola livello medio formazione per ogni squadra
        const getFormationLevel = (teamId) => {
            const teamData = teamsData[teamId];
            if (!teamData) return '?';
            const formationPlayers = window.getFormationPlayers(teamData);
            if (formationPlayers.length === 0) return '?';
            return window.calculateAverageLevel(formationPlayers).toFixed(1);
        };

        // SEZIONE 1: Prossima Partita Coppa
        html += `
            <div class="bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg p-4 border-2 border-purple-500 shadow-lg">
                <h3 class="text-xl font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <span>⚽</span> La Tua Situazione in Coppa
                </h3>
        `;

        if (!bracket) {
            // Coppa non ancora iniziata
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-gray-400">La coppa non e ancora iniziata.</p>
                    <p class="text-gray-500 text-sm mt-2">Attendi che l'admin generi il tabellone.</p>
                </div>
            `;
        } else if (!isParticipating) {
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
                const statusText = isHome ? '🏠 IN CASA' : '✈️ TRASFERTA';
                const statusColor = isHome ? 'text-green-400' : 'text-blue-400';

                const homeTeamId = nextCupMatch.homeTeam?.teamId;
                const awayTeamId = nextCupMatch.awayTeam?.teamId;
                const homeLvl = getFormationLevel(homeTeamId);
                const awayLvl = getFormationLevel(awayTeamId);

                html += `
                    <div class="bg-black bg-opacity-30 rounded-lg p-6">
                        <p class="text-gray-400 text-sm mb-4 text-center">${nextCupMatch.roundName} ${nextCupMatch.isSingleMatch ? '(Partita Secca)' : '(Andata/Ritorno)'}</p>
                        <div class="flex items-center justify-center gap-6">
                            <div class="flex flex-col items-center gap-2">
                                ${getLargeLogoHtml(homeTeamId)}
                                <span class="text-white font-bold text-lg text-center ${homeTeamId === currentTeamId ? 'text-yellow-400' : ''}">${nextCupMatch.homeTeam?.teamName || 'TBD'}</span>
                                <span class="text-sm px-3 py-1 bg-gray-700 rounded-full text-cyan-400 font-semibold">Lv. ${homeLvl}</span>
                            </div>
                            <div class="text-center px-4">
                                <span class="text-3xl font-bold text-gray-400">VS</span>
                            </div>
                            <div class="flex flex-col items-center gap-2">
                                ${getLargeLogoHtml(awayTeamId)}
                                <span class="text-white font-bold text-lg text-center ${awayTeamId === currentTeamId ? 'text-yellow-400' : ''}">${nextCupMatch.awayTeam?.teamName || 'TBD'}</span>
                                <span class="text-sm px-3 py-1 bg-gray-700 rounded-full text-cyan-400 font-semibold">Lv. ${awayLvl}</span>
                            </div>
                        </div>
                        <p class="text-center mt-4 ${statusColor} font-bold text-lg">${statusText}</p>
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

        // SEZIONE 2: Tabellone Completo (stile calendario campionato)
        html += `
            <div class="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-lg p-4 border-2 border-indigo-500 shadow-lg">
                <h3 class="text-xl font-bold text-indigo-400 mb-3 flex items-center gap-2">
                    <span>📋</span> Tabellone Completo
                </h3>
        `;

        // Vincitore se presente (in alto)
        if (bracket && bracket.winner) {
            html += `
                <div class="mb-4 p-3 bg-yellow-900 bg-opacity-50 rounded-lg text-center">
                    <p class="text-yellow-400 font-bold text-lg">🏆 Vincitore: ${bracket.winner.teamName}</p>
                </div>
            `;
        }

        // Renderizza ogni round con le partite dettagliate
        html += `<div class="max-h-96 overflow-y-auto space-y-3">`;

        if (bracket && bracket.rounds && bracket.rounds.length > 0) {
            bracket.rounds.forEach(round => {
                // Verifica se il round è completato
                const roundComplete = round.matches.every(m => m.winner !== null && m.winner !== undefined);
                const statusIcon = roundComplete ? '✅' : '⏳';

                html += `
                    <div class="bg-black bg-opacity-30 rounded-lg p-3">
                        <p class="text-indigo-300 font-bold mb-2">${statusIcon} ${round.roundName}</p>
                        <div class="space-y-2">
                `;

                round.matches.forEach(match => {
                    const homeName = match.homeTeam?.teamName || 'BYE';
                    const awayName = match.awayTeam?.teamName || 'BYE';
                    const homeId = match.homeTeam?.teamId;
                    const awayId = match.awayTeam?.teamId;
                    const isMyMatch = homeId === currentTeamId || awayId === currentTeamId;
                    const matchBg = isMyMatch ? 'bg-purple-900 bg-opacity-50' : 'bg-gray-800 bg-opacity-50';

                    // Determina il vincitore per evidenziazione
                    const homeIsWinner = match.winner && match.winner.teamId === homeId;
                    const awayIsWinner = match.winner && match.winner.teamId === awayId;
                    const homeClass = homeIsWinner ? 'text-green-400 font-bold' : (awayIsWinner ? 'text-red-400' : 'text-white');
                    const awayClass = awayIsWinner ? 'text-green-400 font-bold' : (homeIsWinner ? 'text-red-400' : 'text-white');

                    // Risultato
                    let resultDisplay = 'vs';
                    if (match.leg1Result && match.leg2Result) {
                        resultDisplay = `<span class="text-gray-400 text-xs">${match.leg1Result}</span> / <span class="text-white font-bold">${match.leg2Result}</span>`;
                    } else if (match.leg1Result) {
                        resultDisplay = `<span class="text-white font-bold">${match.leg1Result}</span>`;
                    } else if (match.result) {
                        resultDisplay = `<span class="text-white font-bold">${match.result}</span>`;
                    }

                    // Icona per la mia squadra
                    const homeIcon = homeId === currentTeamId ? '⭐ ' : '';
                    const awayIcon = awayId === currentTeamId ? ' ⭐' : '';

                    html += `
                        <div class="flex justify-between items-center text-sm p-2 rounded ${matchBg}">
                            <span class="${homeClass} flex-1 ${homeId === currentTeamId ? 'text-yellow-400' : ''}">${homeIcon}${homeName}</span>
                            <span class="text-gray-400 mx-3 text-center min-w-16">
                                ${resultDisplay}
                            </span>
                            <span class="${awayClass} flex-1 text-right ${awayId === currentTeamId ? 'text-yellow-400' : ''}">${awayName}${awayIcon}</span>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });
        } else {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-gray-400">Tabellone non ancora disponibile.</p>
                </div>
            `;
        }

        html += `</div>`;
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
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const bracket = await window.Supercoppa.loadSupercoppa();

            // Carica i dati delle squadre per la partita (livelli medi)
            let teamsData = {};
            if (bracket && bracket.homeTeam && bracket.awayTeam) {
                const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

                // Carica dati squadra casa
                if (bracket.homeTeam.teamId) {
                    const homeTeamRef = doc(db, TEAMS_COLLECTION_PATH, bracket.homeTeam.teamId);
                    const homeTeamSnap = await getDoc(homeTeamRef);
                    if (homeTeamSnap.exists()) {
                        teamsData[bracket.homeTeam.teamId] = homeTeamSnap.data();
                    }
                }

                // Carica dati squadra trasferta
                if (bracket.awayTeam.teamId) {
                    const awayTeamRef = doc(db, TEAMS_COLLECTION_PATH, bracket.awayTeam.teamId);
                    const awayTeamSnap = await getDoc(awayTeamRef);
                    if (awayTeamSnap.exists()) {
                        teamsData[bracket.awayTeam.teamId] = awayTeamSnap.data();
                    }
                }
            }

            this.renderSupercoppScreen(container, bracket, currentTeamId, teamsData);
        } catch (error) {
            console.error('Errore caricamento supercoppa:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${error.message}</p>`;
        }
    },

    /**
     * Renderizza la schermata Supercoppa
     */
    renderSupercoppScreen(container, bracket, currentTeamId, teamsData = {}) {
        let html = '';

        // Funzione per ottenere logo grande
        const getLargeLogoHtml = (teamId) => {
            const url = window.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
            return `<img src="${url}" alt="Logo" class="w-28 h-28 rounded-full border-4 border-gray-600 shadow-lg object-cover mx-auto">`;
        };

        // Calcola livello medio formazione per ogni squadra
        const getFormationLevel = (teamId) => {
            const teamData = teamsData[teamId];
            if (!teamData) return '?';
            const formationPlayers = window.getFormationPlayers(teamData);
            if (formationPlayers.length === 0) return '?';
            return window.calculateAverageLevel(formationPlayers).toFixed(1);
        };

        const isParticipant = bracket ? (bracket.homeTeam?.teamId === currentTeamId || bracket.awayTeam?.teamId === currentTeamId) : false;
        const isCompleted = bracket?.isCompleted || false;
        const isWinner = bracket?.winner?.teamId === currentTeamId;

        const homeTeamId = bracket?.homeTeam?.teamId;
        const awayTeamId = bracket?.awayTeam?.teamId;
        const homeLvl = getFormationLevel(homeTeamId);
        const awayLvl = getFormationLevel(awayTeamId);

        // SEZIONE 1: La Tua Situazione
        html += `
            <div class="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg p-4 border-2 border-yellow-500 shadow-lg">
                <h3 class="text-xl font-bold text-yellow-400 mb-3 flex items-center gap-2">
                    <span>⭐</span> La Tua Situazione in Supercoppa
                </h3>
        `;

        if (!bracket) {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-gray-400">La Supercoppa non e ancora in programma.</p>
                    <p class="text-gray-500 text-sm mt-2">Verra creata dopo il termine del campionato e della coppa.</p>
                </div>
            `;
        } else if (!isParticipant) {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-gray-400">Non partecipi alla Supercoppa.</p>
                    <p class="text-gray-500 text-sm mt-2">Solo il Campione e il Vincitore della Coppa si sfidano.</p>
                </div>
            `;
        } else if (isWinner) {
            html += `
                <div class="bg-green-900 bg-opacity-50 rounded-lg p-4 text-center">
                    <p class="text-green-400 font-bold text-xl">🏆 HAI VINTO LA SUPERCOPPA!</p>
                </div>
            `;
        } else if (isCompleted) {
            html += `
                <div class="bg-red-900 bg-opacity-50 rounded-lg p-4 text-center">
                    <p class="text-red-400 font-bold">😔 Hai perso la finale</p>
                </div>
            `;
        } else {
            html += `
                <div class="bg-yellow-800 bg-opacity-50 rounded-lg p-4 text-center">
                    <p class="text-yellow-300 font-bold">⭐ Partecipi alla Supercoppa!</p>
                    <p class="text-gray-300 text-sm mt-1">Partita secca contro ${isParticipant && homeTeamId === currentTeamId ? bracket.awayTeam?.teamName : bracket.homeTeam?.teamName}</p>
                </div>
            `;
        }

        html += `</div>`;

        // SEZIONE 2: La Partita
        html += `
            <div class="bg-gradient-to-r from-orange-900 to-amber-900 rounded-lg p-4 border-2 border-orange-500 shadow-lg">
                <h3 class="text-xl font-bold text-orange-400 mb-3 flex items-center gap-2">
                    <span>⚽</span> La Partita
                </h3>
        `;

        if (!bracket) {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                    <p class="text-gray-400">Partita non ancora programmata.</p>
                </div>
            `;
        } else {
            // Card partita con loghi grandi e livelli
            html += `
                <div class="bg-black bg-opacity-40 rounded-lg p-6">
                    <p class="text-gray-400 text-sm mb-4 text-center">Partita Secca</p>
                    <div class="flex items-center justify-center gap-6">
                        <!-- Home Team -->
                        <div class="flex flex-col items-center gap-2">
                            ${getLargeLogoHtml(homeTeamId)}
                            <p class="text-xs text-yellow-300">${bracket.homeTeam?.qualification || ''}</p>
                            <p class="text-lg font-bold text-center ${homeTeamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">
                                ${bracket.homeTeam?.teamName || 'TBD'}
                            </p>
                            <span class="text-sm px-3 py-1 bg-gray-700 rounded-full text-cyan-400 font-semibold">Lv. ${homeLvl}</span>
                        </div>

                        <!-- Risultato / VS -->
                        <div class="text-center px-4">
                            ${bracket.result ?
                            `<p class="text-3xl font-extrabold text-yellow-400">${bracket.result}</p>
                             ${bracket.penalties ? `<p class="text-xs text-gray-400">(d.c.r.)</p>` : ''}` :
                            `<p class="text-3xl text-gray-400 font-bold">VS</p>
                             <p class="text-xs text-gray-500 mt-1">Partita Secca</p>`
                        }
                    </div>

                    <!-- Away Team -->
                    <div class="flex flex-col items-center gap-2">
                        ${getLargeLogoHtml(awayTeamId)}
                        <p class="text-xs text-yellow-300">${bracket.awayTeam?.qualification || ''}</p>
                        <p class="text-lg font-bold text-center ${awayTeamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">
                            ${bracket.awayTeam?.teamName || 'TBD'}
                        </p>
                        <span class="text-sm px-3 py-1 bg-gray-700 rounded-full text-cyan-400 font-semibold">Lv. ${awayLvl}</span>
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
        }

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
