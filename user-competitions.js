//
// ====================================================================
// USER-COMPETITIONS.JS - Schermate Campionato, Coppa, Supercoppa (Utente)
// ====================================================================
//

window.UserCompetitions = {

    // ================================================================
    // HELPER FUNCTIONS
    // ================================================================

    /**
     * Trova l'ultima partita giocata dalla squadra nel campionato
     */
    findLastPlayedMatch(scheduleData, teamId) {
        let lastMatch = null;
        for (const round of scheduleData) {
            if (!round.matches) continue;
            const myMatch = round.matches.find(m =>
                m.result !== null && (m.homeId === teamId || m.awayId === teamId)
            );
            if (myMatch) {
                lastMatch = { ...myMatch, round: round.round };
            }
        }
        return lastMatch;
    },

    /**
     * Trova l'ultima partita giocata dalla squadra in coppa
     */
    findLastPlayedCupMatch(bracket, teamId) {
        if (!bracket || !bracket.rounds) return null;
        let lastMatch = null;
        for (const round of bracket.rounds) {
            if (!round.matches) continue;
            for (const match of round.matches) {
                const isMyMatch = match.homeTeam?.teamId === teamId || match.awayTeam?.teamId === teamId;
                const hasResult = match.leg1Result || match.winner;
                if (isMyMatch && hasResult) {
                    lastMatch = {
                        ...match,
                        roundName: round.roundName,
                        isSingleMatch: round.isSingleMatch
                    };
                }
            }
        }
        return lastMatch;
    },

    // ================================================================
    // SCHERMATA CAMPIONATO
    // ================================================================

    /**
     * Carica e renderizza la schermata Campionato utente
     * Usa cache per ridurre letture Firestore
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
            const cache = window.FirestoreCache;

            // Invalida cache per avere sempre dati aggiornati
            cache?.invalidate?.('schedule', 'full');

            // Carica calendario (sempre fresco)
            const schedulePath = `artifacts/${appId}/public/data/schedule/full_schedule`;
            const scheduleRef = doc(db, schedulePath);
            const scheduleSnap = await getDoc(scheduleRef);
            const scheduleData = scheduleSnap.exists() ? scheduleSnap.data().matches : [];
            cache?.set('schedule', 'full', scheduleData, cache.TTL.SCHEDULE);

            // Carica classifica (usando LeaderboardListener per cache condivisa)
            const leaderboardData = await window.LeaderboardListener.getLeaderboard();
            const standings = leaderboardData?.standings || [];

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

            // Carica i dati di TUTTE le squadre per classifica e prossima partita
            let teamsData = {};
            const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

            // Carica dati di tutte le squadre nella classifica (per mostrare media rosa)
            if (standings.length > 0) {
                const teamIds = standings.map(s => s.teamId);
                await Promise.all(teamIds.map(async (teamId) => {
                    let teamData = cache?.get('team', teamId);
                    if (!teamData) {
                        try {
                            const teamRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                            const teamSnap = await getDoc(teamRef);
                            if (teamSnap.exists()) {
                                teamData = teamSnap.data();
                                cache?.set('team', teamId, teamData, cache.TTL.TEAM_DATA);
                            }
                        } catch (e) {
                            console.warn('Errore caricamento team:', teamId, e);
                        }
                    }
                    if (teamData) teamsData[teamId] = teamData;
                }));
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
                const url = window.InterfacciaCore?.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
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

        // SEZIONE 2: Classifica (accordion minimizzato di default)
        // Trova la posizione della squadra corrente per mostrarla nel titolo
        const myPosition = standings.findIndex(t => t.teamId === currentTeamId) + 1;
        const myTeamStanding = standings.find(t => t.teamId === currentTeamId);
        const positionText = myPosition > 0 ? `${myPosition}° posto - ${myTeamStanding?.points || 0} pt` : '';

        html += `
            <div class="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg border-2 border-blue-500 shadow-lg overflow-hidden">
                <div class="p-3 cursor-pointer select-none hover:bg-black hover:bg-opacity-20 transition"
                     onclick="window.UserCompetitions.toggleAccordion('classifica-accordion')">
                    <h3 class="text-xl font-bold text-blue-400 flex items-center justify-between">
                        <span class="flex items-center gap-2">
                            <span>📊</span> Classifica
                            ${positionText ? `<span class="ml-2 text-sm font-normal text-gray-400">- ${positionText}</span>` : ''}
                        </span>
                        <span id="classifica-accordion-icon" class="text-gray-400 transition-transform">▼</span>
                    </h3>
                </div>
                <div id="classifica-accordion" class="hidden">
        `;

        if (standings.length === 0) {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center mx-3 mb-3">
                    <p class="text-gray-400">Classifica non ancora disponibile.</p>
                </div>
            `;
        } else {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg overflow-x-auto mx-3 mb-3">
                    <table class="w-full text-sm min-w-[400px]">
                        <thead class="bg-gray-800">
                            <tr>
                                <th class="py-2 px-3 text-left text-gray-400">#</th>
                                <th class="py-2 px-2 text-center text-gray-400" title="Media Livello Rosa">Lv</th>
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

                // Calcola media livello rosa
                const teamFullData = teamsData[team.teamId];
                let avgLevel = '-';
                if (teamFullData?.players?.length > 0) {
                    const totalLevel = teamFullData.players.reduce((sum, p) => sum + (p.currentLevel || p.level || 1), 0);
                    avgLevel = (totalLevel / teamFullData.players.length).toFixed(1);
                }

                html += `
                    <tr class="${rowClass}">
                        <td class="py-2 px-3 ${textClass}">${index + 1}</td>
                        <td class="py-2 px-2 text-center text-cyan-400 text-xs font-semibold">${avgLevel}</td>
                        <td class="py-2 px-3 ${textClass}">${team.teamName}</td>
                        <td class="py-2 px-3 text-center font-bold ${textClass}">${team.points || 0}</td>
                        <td class="py-2 px-3 text-center text-gray-400">${team.played || 0}</td>
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
        html += `</div></div>`;

        // SEZIONE 3: Calendario (accordion minimizzato di default)
        // Calcola quante giornate sono state giocate per mostrarle nel titolo
        const playedRounds = scheduleData.filter(r => r.matches.every(m => m.result !== null)).length;
        const totalRounds = scheduleData.length;
        const calendarText = totalRounds > 0 ? `${playedRounds}/${totalRounds} giornate` : '';

        html += `
            <div class="bg-gradient-to-r from-teal-900 to-teal-800 rounded-lg border-2 border-teal-500 shadow-lg overflow-hidden">
                <div class="p-3 cursor-pointer select-none hover:bg-black hover:bg-opacity-20 transition"
                     onclick="window.UserCompetitions.toggleAccordion('calendario-accordion')">
                    <h3 class="text-xl font-bold text-teal-400 flex items-center justify-between">
                        <span class="flex items-center gap-2">
                            <span>📅</span> Calendario Completo
                            ${calendarText ? `<span class="ml-2 text-sm font-normal text-gray-400">- ${calendarText}</span>` : ''}
                        </span>
                        <span id="calendario-accordion-icon" class="text-gray-400 transition-transform">▼</span>
                    </h3>
                </div>
                <div id="calendario-accordion" class="hidden">
        `;

        if (scheduleData.length === 0) {
            html += `
                <div class="bg-black bg-opacity-30 rounded-lg p-4 text-center mx-3 mb-3">
                    <p class="text-gray-400">Calendario non ancora generato.</p>
                </div>
            `;
        } else {
            // Ordina le giornate: prima quelle da giocare, poi quelle completate
            const sortedSchedule = [...scheduleData].sort((a, b) => {
                const aComplete = a.matches.every(m => m.result !== null);
                const bComplete = b.matches.every(m => m.result !== null);
                if (aComplete === bComplete) return a.round - b.round; // Ordine numerico se stesso stato
                return aComplete ? 1 : -1; // Completate in fondo
            });

            html += `<div class="max-h-96 overflow-y-auto space-y-2 mx-3 mb-3" id="calendar-rounds">`;

            sortedSchedule.forEach((round, index) => {
                const roundComplete = round.matches.every(m => m.result !== null);
                const statusIcon = roundComplete ? '✅' : '⏳';
                const hasMyMatch = round.matches.some(m => m.homeId === currentTeamId || m.awayId === currentTeamId);
                // Sempre chiuso di default
                const isOpen = false;

                html += `
                    <div class="bg-black bg-opacity-30 rounded-lg overflow-hidden">
                        <button class="calendar-round-header w-full flex items-center justify-between p-3 hover:bg-black hover:bg-opacity-20 transition cursor-pointer"
                                data-round="${round.round}" aria-expanded="${isOpen}">
                            <span class="text-teal-300 font-bold flex items-center gap-2">
                                ${statusIcon} Giornata ${round.round}
                                ${hasMyMatch ? '<span class="text-yellow-400 text-xs">(tua partita)</span>' : ''}
                            </span>
                            <span class="calendar-round-arrow text-teal-400 transition-transform ${isOpen ? 'rotate-180' : ''}">▼</span>
                        </button>
                        <div class="calendar-round-content ${isOpen ? '' : 'hidden'} px-3 pb-3 space-y-1">
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
        html += `</div></div>`;

        // SEZIONE 4: Ultima Partita Giocata
        const lastPlayedMatch = this.findLastPlayedMatch(scheduleData, currentTeamId);
        if (lastPlayedMatch) {
            const isHome = lastPlayedMatch.homeId === currentTeamId;
            const myGoals = isHome ? parseInt(lastPlayedMatch.result.split('-')[0]) : parseInt(lastPlayedMatch.result.split('-')[1]);
            const opponentGoals = isHome ? parseInt(lastPlayedMatch.result.split('-')[1]) : parseInt(lastPlayedMatch.result.split('-')[0]);
            const resultType = myGoals > opponentGoals ? 'win' : myGoals < opponentGoals ? 'loss' : 'draw';
            const resultColor = resultType === 'win' ? 'from-green-900 to-green-800 border-green-500' : resultType === 'loss' ? 'from-red-900 to-red-800 border-red-500' : 'from-yellow-900 to-yellow-800 border-yellow-500';
            const resultText = resultType === 'win' ? '✅ VITTORIA' : resultType === 'loss' ? '❌ SCONFITTA' : '🤝 PAREGGIO';
            const resultTextColor = resultType === 'win' ? 'text-green-400' : resultType === 'loss' ? 'text-red-400' : 'text-yellow-400';

            html += `
                <div class="bg-gradient-to-r ${resultColor} rounded-lg p-4 border-2 shadow-lg">
                    <h3 class="text-xl font-bold ${resultTextColor} mb-3 flex items-center gap-2">
                        <span>📊</span> Ultima Partita (Giornata ${lastPlayedMatch.round})
                    </h3>
                    <div class="bg-black bg-opacity-30 rounded-lg p-4">
                        <div class="flex items-center justify-center gap-4">
                            <span class="${lastPlayedMatch.homeId === currentTeamId ? 'text-yellow-400 font-bold' : 'text-white'}">${lastPlayedMatch.homeName}</span>
                            <span class="text-2xl font-extrabold text-white">${lastPlayedMatch.result}</span>
                            <span class="${lastPlayedMatch.awayId === currentTeamId ? 'text-yellow-400 font-bold' : 'text-white'}">${lastPlayedMatch.awayName}</span>
                        </div>
                        <p class="text-center mt-2 ${resultTextColor} font-bold">${resultText}</p>
                        <button id="btn-campionato-telecronaca"
                                class="mt-3 w-full bg-cyan-700 hover:bg-cyan-600 text-white text-sm py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                data-home-name="${lastPlayedMatch.homeName}"
                                data-away-name="${lastPlayedMatch.awayName}"
                                data-result="${lastPlayedMatch.result}">
                            📺 Vedi Telecronaca
                        </button>
                    </div>
                </div>
            `
        }

        container.innerHTML = html;

        // Aggiungi listener per accordion dopo il rendering
        setTimeout(() => {
            document.querySelectorAll('.calendar-round-header').forEach(header => {
                header.addEventListener('click', () => {
                    const content = header.nextElementSibling;
                    const arrow = header.querySelector('.calendar-round-arrow');
                    const isExpanded = header.getAttribute('aria-expanded') === 'true';

                    // Toggle stato
                    header.setAttribute('aria-expanded', !isExpanded);
                    content.classList.toggle('hidden');
                    arrow.classList.toggle('rotate-180');
                });
            });

            // Listener per bottone telecronaca campionato
            const btnTelecronaca = document.getElementById('btn-campionato-telecronaca');
            if (btnTelecronaca) {
                btnTelecronaca.addEventListener('click', async () => {
                    await this.showLastMatchTelecronaca('campionato', btnTelecronaca.dataset);
                });
            }
        }, 100);
    },

    /**
     * Mostra la telecronaca dell'ultima partita
     */
    async showLastMatchTelecronaca(matchType, matchData) {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) {
            if (window.Toast) window.Toast.error('Errore: squadra non trovata');
            return;
        }

        try {
            // Carica storico partite
            const history = await window.MatchHistory.loadHistory(currentTeamId);

            // Trova l'ultima partita del tipo specificato
            const lastMatch = history.find(m => m.type === matchType);

            if (!lastMatch) {
                if (window.Toast) window.Toast.info('Nessuna partita trovata nello storico');
                return;
            }

            if (!lastMatch.details?.matchLog || lastMatch.details.matchLog.length === 0) {
                if (window.Toast) window.Toast.info('Telecronaca non disponibile per questa partita');
                return;
            }

            // Mostra telecronaca
            window.MatchHistory.showTelecronacaModal(
                lastMatch.details.matchLog,
                lastMatch.homeTeam.name,
                lastMatch.awayTeam.name,
                lastMatch.homeScore,
                lastMatch.awayScore
            );

        } catch (error) {
            console.error('Errore caricamento telecronaca:', error);
            if (window.Toast) window.Toast.error('Errore nel caricamento della telecronaca');
        }
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
            const url = window.InterfacciaCore?.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
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

        // SEZIONE 2: Tabellone Completo (accordion minimizzato di default)
        // Calcola quanti turni completati
        let completedRounds = 0;
        let totalRounds = 0;
        if (bracket && bracket.rounds) {
            totalRounds = bracket.rounds.length;
            completedRounds = bracket.rounds.filter(r => r.matches.every(m => m.winner !== null && m.winner !== undefined)).length;
        }
        const bracketSummary = bracket ? `${completedRounds}/${totalRounds} turni completati` : 'Non disponibile';

        html += `
            <div class="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-lg p-4 border-2 border-indigo-500 shadow-lg">
                <div class="flex justify-between items-center cursor-pointer" onclick="window.UserCompetitions.toggleAccordion('coppa-tabellone-content')">
                    <h3 class="text-xl font-bold text-indigo-400 flex items-center gap-2">
                        <span>📋</span> Tabellone Completo
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-sm text-indigo-300">${bracketSummary}</span>
                        <span id="coppa-tabellone-content-icon" class="text-indigo-400 text-lg">▼</span>
                    </div>
                </div>
                <div id="coppa-tabellone-content" class="hidden mt-3">
        `;

        // Vincitore se presente (in alto)
        if (bracket && bracket.winner) {
            html += `
                <div class="mb-4 p-3 bg-yellow-900 bg-opacity-50 rounded-lg text-center">
                    <p class="text-yellow-400 font-bold text-lg">🏆 Vincitore: ${bracket.winner.teamName}</p>
                </div>
            `;
        }

        // Renderizza ogni round con accordion (collassabile)
        html += `<div class="max-h-96 overflow-y-auto space-y-2" id="coppa-accordion">`;

        if (bracket && bracket.rounds && bracket.rounds.length > 0) {
            // Ordina i round: prima quelli da giocare, poi quelli completati
            const sortedRounds = [...bracket.rounds].sort((a, b) => {
                const aComplete = a.matches.every(m => m.winner !== null && m.winner !== undefined);
                const bComplete = b.matches.every(m => m.winner !== null && m.winner !== undefined);
                if (aComplete === bComplete) return a.roundNumber - b.roundNumber;
                return aComplete ? 1 : -1; // Completate in fondo
            });

            sortedRounds.forEach((round, index) => {
                // Verifica se il round è completato
                const roundComplete = round.matches.every(m => m.winner !== null && m.winner !== undefined);
                const statusIcon = roundComplete ? '✅' : '⏳';
                const hasMyMatch = round.matches.some(m =>
                    m.homeTeam?.teamId === currentTeamId || m.awayTeam?.teamId === currentTeamId
                );
                const accordionId = `coppa-round-${index}`;

                html += `
                    <div class="bg-black bg-opacity-30 rounded-lg overflow-hidden">
                        <button class="coppa-round-header w-full flex items-center justify-between p-3 hover:bg-black hover:bg-opacity-20 transition cursor-pointer"
                                data-accordion="${accordionId}" aria-expanded="false">
                            <span class="text-indigo-300 font-bold flex items-center gap-2">
                                ${statusIcon} ${round.roundName}
                                ${hasMyMatch ? '<span class="text-yellow-400 text-xs">(tua partita)</span>' : ''}
                            </span>
                            <span class="coppa-round-arrow text-indigo-400 transition-transform">▼</span>
                        </button>
                        <div id="${accordionId}" class="coppa-round-content hidden px-3 pb-3 space-y-2">
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

        html += `</div>`; // chiude coppa-accordion
        html += `</div>`; // chiude coppa-tabellone-content
        html += `</div>`; // chiude box principale tabellone

        // SEZIONE 3: Ultima Partita Giocata in Coppa
        const lastCupMatch = this.findLastPlayedCupMatch(bracket, currentTeamId);
        if (lastCupMatch) {
            const isHome = lastCupMatch.homeTeam?.teamId === currentTeamId;
            const myTeamWon = lastCupMatch.winner?.teamId === currentTeamId;
            const resultColor = myTeamWon ? 'from-green-900 to-green-800 border-green-500' : 'from-red-900 to-red-800 border-red-500';
            const resultText = myTeamWon ? '✅ PASSATO IL TURNO' : '❌ ELIMINATO';
            const resultTextColor = myTeamWon ? 'text-green-400' : 'text-red-400';

            // Costruisci stringa risultato
            let resultStr = lastCupMatch.leg1Result || '';
            if (lastCupMatch.leg2Result) {
                resultStr += ` / ${lastCupMatch.leg2Result}`;
            }

            html += `
                <div class="bg-gradient-to-r ${resultColor} rounded-lg p-4 border-2 shadow-lg">
                    <h3 class="text-xl font-bold ${resultTextColor} mb-3 flex items-center gap-2">
                        <span>📊</span> Ultima Partita (${lastCupMatch.roundName})
                    </h3>
                    <div class="bg-black bg-opacity-30 rounded-lg p-4">
                        <div class="flex items-center justify-center gap-4">
                            <span class="${lastCupMatch.homeTeam?.teamId === currentTeamId ? 'text-yellow-400 font-bold' : 'text-white'}">${lastCupMatch.homeTeam?.teamName || 'TBD'}</span>
                            <span class="text-xl font-extrabold text-white">${resultStr}</span>
                            <span class="${lastCupMatch.awayTeam?.teamId === currentTeamId ? 'text-yellow-400 font-bold' : 'text-white'}">${lastCupMatch.awayTeam?.teamName || 'TBD'}</span>
                        </div>
                        <p class="text-center mt-2 ${resultTextColor} font-bold">${resultText}</p>
                        <button id="btn-coppa-telecronaca"
                                class="mt-3 w-full bg-cyan-700 hover:bg-cyan-600 text-white text-sm py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
                            📺 Vedi Telecronaca
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Aggiungi listener per accordion coppa dopo il rendering
        setTimeout(() => {
            document.querySelectorAll('.coppa-round-header').forEach(header => {
                header.addEventListener('click', () => {
                    const accordionId = header.getAttribute('data-accordion');
                    const content = document.getElementById(accordionId);
                    const arrow = header.querySelector('.coppa-round-arrow');
                    const isExpanded = header.getAttribute('aria-expanded') === 'true';

                    // Toggle stato
                    header.setAttribute('aria-expanded', !isExpanded);
                    content.classList.toggle('hidden');
                    arrow.classList.toggle('rotate-180');
                });
            });

            // Listener per bottone telecronaca coppa
            const btnCoppaTelecronaca = document.getElementById('btn-coppa-telecronaca');
            if (btnCoppaTelecronaca) {
                btnCoppaTelecronaca.addEventListener('click', async () => {
                    await this.showLastMatchTelecronaca('coppa', {});
                });
            }
        }, 100);
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
            const url = window.InterfacciaCore?.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
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
                        <button id="btn-supercoppa-telecronaca"
                                class="mt-3 bg-cyan-700 hover:bg-cyan-600 text-white text-sm py-2 px-4 rounded-lg transition inline-flex items-center gap-2">
                            📺 Vedi Telecronaca
                        </button>
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

        // Listener per bottone telecronaca supercoppa (visibile a tutti)
        setTimeout(() => {
            const btnSupercoppaTelecronaca = document.getElementById('btn-supercoppa-telecronaca');
            if (btnSupercoppaTelecronaca && bracket) {
                btnSupercoppaTelecronaca.addEventListener('click', async () => {
                    await this.showSupercoppaTelecronaca(bracket);
                });
            }
        }, 100);
    },

    /**
     * Mostra la telecronaca della supercoppa (visibile a tutti gli utenti)
     */
    async showSupercoppaTelecronaca(bracket) {
        if (!bracket?.winner || !bracket.homeTeam?.teamId || !bracket.awayTeam?.teamId) {
            if (window.Toast) window.Toast.info('Telecronaca non ancora disponibile');
            return;
        }

        try {
            // Prova a caricare lo storico dal vincitore
            let matchLog = null;
            let homeScore = 0;
            let awayScore = 0;

            const winnerId = bracket.winner.teamId;
            const history = await window.MatchHistory.loadHistory(winnerId);
            const supercoppMatch = history.find(m => m.type === 'supercoppa');

            if (supercoppMatch?.details?.matchLog) {
                matchLog = supercoppMatch.details.matchLog;
                homeScore = supercoppMatch.homeScore;
                awayScore = supercoppMatch.awayScore;
            }

            if (!matchLog || matchLog.length === 0) {
                if (window.Toast) window.Toast.info('Telecronaca non disponibile per questa partita');
                return;
            }

            window.MatchHistory.showTelecronacaModal(
                matchLog,
                bracket.homeTeam.teamName,
                bracket.awayTeam.teamName,
                homeScore,
                awayScore
            );

        } catch (error) {
            console.error('Errore caricamento telecronaca supercoppa:', error);
            if (window.Toast) window.Toast.error('Errore nel caricamento della telecronaca');
        }
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
    },

    /**
     * Toggle accordion per classifica e calendario
     */
    toggleAccordion(accordionId) {
        const content = document.getElementById(accordionId);
        const icon = document.getElementById(`${accordionId}-icon`);

        if (content && icon) {
            const isHidden = content.classList.contains('hidden');

            if (isHidden) {
                content.classList.remove('hidden');
                icon.textContent = '▲';
            } else {
                content.classList.add('hidden');
                icon.textContent = '▼';
            }
        }
    }
};

console.log("Modulo User-Competitions caricato.");
