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
            const safeMsg = window.escapeHtml ? window.escapeHtml(error.message) : error.message;
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${safeMsg}</p>`;
        }
    },

    /**
     * Renderizza la schermata Campionato (Mobile-First)
     */
    renderCampionatoScreen(container, nextMatch, standings, scheduleData, currentTeamId, teamsData = {}) {
        let html = '';

        // Aggiorna position badge nell'header
        const myPosition = standings.findIndex(t => t.teamId === currentTeamId) + 1;
        const myTeamStanding = standings.find(t => t.teamId === currentTeamId);
        const positionBadge = document.getElementById('campionato-position-badge');
        if (positionBadge && myPosition > 0) {
            const positionColor = myPosition <= 3 ? 'text-yellow-400' : myPosition <= 6 ? 'text-emerald-400' : 'text-gray-400';
            const badgeBg = myPosition <= 3 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-emerald-500/20 border-emerald-500/50';
            positionBadge.className = `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badgeBg} border`;
            positionBadge.innerHTML = `<span class="${positionColor}">${myPosition}° • ${myTeamStanding?.points || 0} pt</span>`;
        }

        // SEZIONE 1: Prossima Partita (Card compatta stile broadcast)
        if (nextMatch) {
            const isHome = nextMatch.homeId === currentTeamId;
            const statusText = isHome ? 'CASA' : 'TRASFERTA';
            const statusColor = isHome ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40';

            const getLogoUrl = (teamId) => {
                return window.InterfacciaCore?.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
            };

            const getFormationLevel = (teamId) => {
                const teamData = teamsData[teamId];
                if (!teamData) return '?';
                const formationPlayers = window.getFormationPlayers?.(teamData) || [];
                if (formationPlayers.length === 0) return '?';
                return window.calculateAverageLevel?.(formationPlayers)?.toFixed(1) || '?';
            };

            const homeLvl = getFormationLevel(nextMatch.homeId);
            const awayLvl = getFormationLevel(nextMatch.awayId);

            html += `
                <div class="next-match-card relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-emerald-500/30 shadow-xl">
                    <!-- Header con giornata e status -->
                    <div class="flex items-center justify-between px-4 py-2 bg-black/30">
                        <span class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Giornata ${nextMatch.round}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full border ${statusColor} font-bold uppercase">${statusText}</span>
                    </div>

                    <!-- Match Preview -->
                    <div class="px-4 py-4">
                        <div class="flex items-center justify-between">
                            <!-- Home Team -->
                            <div class="flex-1 flex flex-col items-center">
                                <div class="relative">
                                    <img src="${getLogoUrl(nextMatch.homeId)}" alt="" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${nextMatch.homeId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                    ${nextMatch.homeId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px]">⭐</div>' : ''}
                                </div>
                                <p class="mt-2 text-xs sm:text-sm font-bold text-center truncate max-w-[80px] sm:max-w-[100px] ${nextMatch.homeId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${nextMatch.homeName}</p>
                                <span class="mt-1 text-[10px] px-2 py-0.5 bg-gray-700/60 rounded-full text-cyan-400 font-semibold">Lv ${homeLvl}</span>
                            </div>

                            <!-- VS Divider -->
                            <div class="flex-shrink-0 px-3">
                                <div class="relative">
                                    <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/40 flex items-center justify-center">
                                        <span class="text-lg sm:text-xl font-black text-emerald-400">VS</span>
                                    </div>
                                    <div class="absolute inset-0 rounded-full animate-ping bg-emerald-500/10"></div>
                                </div>
                            </div>

                            <!-- Away Team -->
                            <div class="flex-1 flex flex-col items-center">
                                <div class="relative">
                                    <img src="${getLogoUrl(nextMatch.awayId)}" alt="" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${nextMatch.awayId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                    ${nextMatch.awayId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px]">⭐</div>' : ''}
                                </div>
                                <p class="mt-2 text-xs sm:text-sm font-bold text-center truncate max-w-[80px] sm:max-w-[100px] ${nextMatch.awayId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${nextMatch.awayName}</p>
                                <span class="mt-1 text-[10px] px-2 py-0.5 bg-gray-700/60 rounded-full text-cyan-400 font-semibold">Lv ${awayLvl}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-600/5 border border-emerald-500/30 p-4 text-center">
                    <span class="text-2xl">🏁</span>
                    <p class="text-emerald-400 font-bold mt-2">Campionato concluso!</p>
                    <p class="text-gray-500 text-xs mt-1">Tutte le partite sono state giocate</p>
                </div>
            `;
        }

        // SEZIONE 2: Mini Classifica (scrollabile orizzontalmente)
        html += `
            <div class="standings-section">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-bold text-gray-400 flex items-center gap-1.5">
                        <span>📊</span> Classifica
                    </h3>
                    <button onclick="window.UserCompetitions.toggleAccordion('full-standings')" class="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        <span id="full-standings-btn-text">Espandi</span> <span id="full-standings-icon">▼</span>
                    </button>
                </div>

                <!-- Mini Standings Scroll -->
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        `;

        if (standings.length === 0) {
            html += `<p class="text-gray-500 text-sm py-4 text-center w-full">Classifica non disponibile</p>`;
        } else {
            standings.slice(0, 4).forEach((team, index) => {
                const isCurrentTeam = team.teamId === currentTeamId;
                const position = index + 1;
                const posClass = position === 1 ? 'from-yellow-500/30 to-yellow-600/20 border-yellow-500/50' :
                                 position === 2 ? 'from-gray-400/20 to-gray-500/10 border-gray-400/40' :
                                 position === 3 ? 'from-amber-600/20 to-amber-700/10 border-amber-600/40' :
                                 'from-gray-800/60 to-gray-900/60 border-gray-700/40';
                const teamBorder = isCurrentTeam ? 'ring-2 ring-yellow-400/60' : '';

                html += `
                    <div class="flex-shrink-0 w-20 bg-gradient-to-br ${posClass} border rounded-xl p-2 text-center ${teamBorder}">
                        <div class="text-lg font-black ${position <= 3 ? 'text-yellow-400' : 'text-gray-400'}">${position}</div>
                        <p class="text-[10px] text-white font-semibold truncate mt-0.5">${team.teamName}</p>
                        <p class="text-xs text-emerald-400 font-bold mt-1">${team.points || 0} pt</p>
                    </div>
                `;
            });
        }

        html += `
                </div>

                <!-- Full Standings (hidden by default) -->
                <div id="full-standings" class="hidden mt-3">
                    <div class="bg-gray-800/60 rounded-xl overflow-hidden border border-gray-700/50">
                        <div class="overflow-x-auto">
                            <table class="w-full text-xs min-w-[320px]">
                                <thead class="bg-gray-900/80">
                                    <tr>
                                        <th class="py-2 px-2 text-left text-gray-500">#</th>
                                        <th class="py-2 px-2 text-left text-gray-500">Squadra</th>
                                        <th class="py-2 px-2 text-center text-gray-500">Pt</th>
                                        <th class="py-2 px-2 text-center text-gray-500">V</th>
                                        <th class="py-2 px-2 text-center text-gray-500">P</th>
                                        <th class="py-2 px-2 text-center text-gray-500">S</th>
                                        <th class="py-2 px-2 text-center text-gray-500">DR</th>
                                    </tr>
                                </thead>
                                <tbody>
        `;

        standings.forEach((team, index) => {
            const isCurrentTeam = team.teamId === currentTeamId;
            const rowClass = isCurrentTeam ? 'bg-yellow-500/10' : '';
            const textClass = isCurrentTeam ? 'text-yellow-400 font-bold' : 'text-white';
            const goalDiff = (team.goalsFor || 0) - (team.goalsAgainst || 0);
            const diffColor = goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-gray-500';

            html += `
                <tr class="${rowClass} border-t border-gray-700/30">
                    <td class="py-2 px-2 ${textClass}">${index + 1}</td>
                    <td class="py-2 px-2 ${textClass} truncate max-w-[100px]">${team.teamName}</td>
                    <td class="py-2 px-2 text-center font-bold text-emerald-400">${team.points || 0}</td>
                    <td class="py-2 px-2 text-center text-green-400">${team.wins || 0}</td>
                    <td class="py-2 px-2 text-center text-yellow-400">${team.draws || 0}</td>
                    <td class="py-2 px-2 text-center text-red-400">${team.losses || 0}</td>
                    <td class="py-2 px-2 text-center ${diffColor}">${goalDiff >= 0 ? '+' : ''}${goalDiff}</td>
                </tr>
            `;
        });

        html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // SEZIONE 3: Calendario (compatto, accordion)
        const playedRounds = scheduleData.filter(r => r.matches.every(m => m.result !== null)).length;
        const totalRounds = scheduleData.length;

        html += `
            <div class="calendar-section bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden">
                <div class="flex items-center justify-between px-3 py-2 bg-gray-900/50 cursor-pointer"
                     onclick="window.UserCompetitions.toggleAccordion('calendario-accordion')">
                    <div class="flex items-center gap-2">
                        <span class="text-sm">📅</span>
                        <span class="text-sm font-bold text-gray-300">Calendario</span>
                        <span class="text-[10px] px-2 py-0.5 bg-gray-700 rounded-full text-gray-400">${playedRounds}/${totalRounds}</span>
                    </div>
                    <span id="calendario-accordion-icon" class="text-gray-500 text-xs transition-transform">▼</span>
                </div>
                <div id="calendario-accordion" class="hidden">
        `;

        if (scheduleData.length === 0) {
            html += `<p class="text-gray-500 text-sm py-4 text-center">Calendario non disponibile</p>`;
        } else {
            const sortedSchedule = [...scheduleData].sort((a, b) => {
                const aComplete = a.matches.every(m => m.result !== null);
                const bComplete = b.matches.every(m => m.result !== null);
                if (aComplete === bComplete) return a.round - b.round;
                return aComplete ? 1 : -1;
            });

            html += `<div class="max-h-72 overflow-y-auto divide-y divide-gray-700/30">`;

            sortedSchedule.forEach((round) => {
                const roundComplete = round.matches.every(m => m.result !== null);
                const hasMyMatch = round.matches.some(m => m.homeId === currentTeamId || m.awayId === currentTeamId);
                const myMatch = round.matches.find(m => m.homeId === currentTeamId || m.awayId === currentTeamId);

                html += `
                    <div class="calendar-round">
                        <button class="calendar-round-header w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-700/30 transition"
                                data-round="${round.round}">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] ${roundComplete ? 'text-emerald-400' : 'text-yellow-400'}">${roundComplete ? '✓' : '○'}</span>
                                <span class="text-xs font-semibold text-gray-300">G${round.round}</span>
                                ${hasMyMatch && myMatch ? `
                                    <span class="text-[10px] text-gray-500">|</span>
                                    <span class="text-[10px] ${myMatch.result ? 'text-gray-400' : 'text-yellow-400'} truncate max-w-[120px]">
                                        ${myMatch.result || 'Da giocare'}
                                    </span>
                                ` : ''}
                            </div>
                            <span class="calendar-round-arrow text-gray-500 text-[10px] transition-transform">▼</span>
                        </button>
                        <div class="calendar-round-content hidden bg-gray-900/30 px-3 py-2 space-y-1">
                `;

                round.matches.forEach(match => {
                    const isMyMatch = match.homeId === currentTeamId || match.awayId === currentTeamId;

                    html += `
                        <div class="flex items-center justify-between text-[11px] py-1 ${isMyMatch ? 'bg-yellow-500/10 -mx-1 px-1 rounded' : ''}">
                            <span class="flex-1 truncate ${match.homeId === currentTeamId ? 'text-yellow-400 font-bold' : 'text-gray-300'}">${match.homeName}</span>
                            <span class="px-2 ${match.result ? 'text-white font-bold' : 'text-gray-600'}">${match.result || 'vs'}</span>
                            <span class="flex-1 truncate text-right ${match.awayId === currentTeamId ? 'text-yellow-400 font-bold' : 'text-gray-300'}">${match.awayName}</span>
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

        // SEZIONE 4: Ultima Partita Giocata (Mobile-First)
        const lastPlayedMatch = this.findLastPlayedMatch(scheduleData, currentTeamId);
        if (lastPlayedMatch) {
            const isHome = lastPlayedMatch.homeId === currentTeamId;
            const resultParts = (lastPlayedMatch.result || '').split('-');
            const myGoals = isHome ? (parseInt(resultParts[0]) || 0) : (parseInt(resultParts[1]) || 0);
            const opponentGoals = isHome ? (parseInt(resultParts[1]) || 0) : (parseInt(resultParts[0]) || 0);
            const resultType = myGoals > opponentGoals ? 'win' : myGoals < opponentGoals ? 'loss' : 'draw';

            // Colori e stili basati sul risultato
            const resultStyles = {
                win: {
                    gradient: 'from-emerald-900/60 via-emerald-800/40 to-gray-900/80',
                    border: 'border-emerald-500/50',
                    badge: 'bg-emerald-500/30 border-emerald-400/60 text-emerald-400',
                    icon: '🏆',
                    text: 'VITTORIA'
                },
                loss: {
                    gradient: 'from-red-900/60 via-red-800/40 to-gray-900/80',
                    border: 'border-red-500/50',
                    badge: 'bg-red-500/30 border-red-400/60 text-red-400',
                    icon: '💔',
                    text: 'SCONFITTA'
                },
                draw: {
                    gradient: 'from-amber-900/60 via-amber-800/40 to-gray-900/80',
                    border: 'border-amber-500/50',
                    badge: 'bg-amber-500/30 border-amber-400/60 text-amber-400',
                    icon: '🤝',
                    text: 'PAREGGIO'
                }
            };
            const style = resultStyles[resultType];

            const getLogoUrl = (teamId) => {
                return window.InterfacciaCore?.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
            };

            // resultParts già definito sopra
            const homeGoals = parseInt(resultParts[0]) || 0;
            const awayGoals = parseInt(resultParts[1]) || 0;

            html += `
                <div class="last-match-card relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient} ${style.border} border shadow-xl">
                    <!-- Header con giornata e risultato badge -->
                    <div class="flex items-center justify-between px-4 py-2 bg-black/30">
                        <span class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Giornata ${lastPlayedMatch.round}</span>
                        <span class="text-[10px] px-2.5 py-0.5 rounded-full border ${style.badge} font-bold uppercase flex items-center gap-1">
                            <span>${style.icon}</span> ${style.text}
                        </span>
                    </div>

                    <!-- Match Result Display -->
                    <div class="px-4 py-4">
                        <div class="flex items-center justify-between">
                            <!-- Home Team -->
                            <div class="flex-1 flex flex-col items-center">
                                <div class="relative">
                                    <img src="${getLogoUrl(lastPlayedMatch.homeId)}" alt="" class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 ${lastPlayedMatch.homeId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                    ${lastPlayedMatch.homeId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px]">⭐</div>' : ''}
                                </div>
                                <p class="mt-1.5 text-[10px] sm:text-xs font-bold text-center truncate max-w-[70px] sm:max-w-[90px] ${lastPlayedMatch.homeId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${lastPlayedMatch.homeName}</p>
                            </div>

                            <!-- Score Display -->
                            <div class="flex-shrink-0 px-2">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-2xl sm:text-3xl font-black ${homeGoals > awayGoals ? 'text-emerald-400' : homeGoals < awayGoals ? 'text-gray-400' : 'text-amber-400'}">${homeGoals}</span>
                                    <span class="text-lg text-gray-500 font-bold">-</span>
                                    <span class="text-2xl sm:text-3xl font-black ${awayGoals > homeGoals ? 'text-emerald-400' : awayGoals < homeGoals ? 'text-gray-400' : 'text-amber-400'}">${awayGoals}</span>
                                </div>
                            </div>

                            <!-- Away Team -->
                            <div class="flex-1 flex flex-col items-center">
                                <div class="relative">
                                    <img src="${getLogoUrl(lastPlayedMatch.awayId)}" alt="" class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 ${lastPlayedMatch.awayId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                    ${lastPlayedMatch.awayId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px]">⭐</div>' : ''}
                                </div>
                                <p class="mt-1.5 text-[10px] sm:text-xs font-bold text-center truncate max-w-[70px] sm:max-w-[90px] ${lastPlayedMatch.awayId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${lastPlayedMatch.awayName}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="px-4 pb-4 flex gap-2">
                        <button id="btn-campionato-telecronaca"
                                class="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white text-[11px] sm:text-xs py-2.5 px-3 rounded-xl transition-all shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-1.5 font-semibold"
                                data-home-name="${lastPlayedMatch.homeName}"
                                data-away-name="${lastPlayedMatch.awayName}"
                                data-home-id="${lastPlayedMatch.homeId}"
                                data-away-id="${lastPlayedMatch.awayId}"
                                data-round="${lastPlayedMatch.round}"
                                data-result="${lastPlayedMatch.result}"
                                data-type="highlights">
                            <span class="text-sm">📺</span> Highlights
                        </button>
                        <button id="btn-campionato-telecronaca-completa"
                                class="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-[11px] sm:text-xs py-2.5 px-3 rounded-xl transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-1.5 font-semibold"
                                data-home-name="${lastPlayedMatch.homeName}"
                                data-away-name="${lastPlayedMatch.awayName}"
                                data-home-id="${lastPlayedMatch.homeId}"
                                data-away-id="${lastPlayedMatch.awayId}"
                                data-round="${lastPlayedMatch.round}"
                                data-result="${lastPlayedMatch.result}"
                                data-type="full">
                            <span class="text-sm">📋</span> Completa
                        </button>
                    </div>
                </div>
            `;
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

            // Listener per bottone telecronaca campionato (azioni salienti)
            const btnTelecronaca = document.getElementById('btn-campionato-telecronaca');
            if (btnTelecronaca) {
                btnTelecronaca.addEventListener('click', async () => {
                    await this.showLastMatchTelecronaca('campionato', btnTelecronaca.dataset, 'highlights');
                });
            }

            // Listener per bottone telecronaca completa
            const btnTelecronacaCompleta = document.getElementById('btn-campionato-telecronaca-completa');
            if (btnTelecronacaCompleta) {
                btnTelecronacaCompleta.addEventListener('click', async () => {
                    await this.showLastMatchTelecronaca('campionato', btnTelecronacaCompleta.dataset, 'full');
                });
            }
        }, 100);
    },

    /**
     * Mostra la telecronaca dell'ultima partita
     * Prima cerca nello schedule (sempre disponibile), poi fallback su matchHistory
     * @param {string} matchType - Tipo partita (campionato, coppa, etc.)
     * @param {Object} matchData - Dati della partita dal dataset del bottone
     * @param {string} telecronacaType - 'highlights' per azioni salienti, 'full' per completa
     */
    async showLastMatchTelecronaca(matchType, matchData, telecronacaType = 'highlights') {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) {
            if (window.Toast) window.Toast.error('Errore: squadra non trovata');
            return;
        }

        try {
            let matchLog = null;
            let matchEvents = null;
            let homeName = matchData?.homeName || '';
            let awayName = matchData?.awayName || '';
            let homeScore = 0;
            let awayScore = 0;

            // Prima prova a cercare nello schedule (indipendente dal flag matchHistory)
            if (matchType === 'campionato' && matchData?.round && matchData?.homeId && matchData?.awayId) {
                const { doc, getDoc } = window.firestoreTools;
                const appId = window.firestoreTools.appId;
                const scheduleDocRef = doc(window.db, `artifacts/${appId}/public/data/schedule`, 'full_schedule');
                const scheduleDoc = await getDoc(scheduleDocRef);

                if (scheduleDoc.exists()) {
                    const schedule = scheduleDoc.data().matches || [];
                    const roundIndex = parseInt(matchData.round) - 1;

                    if (schedule[roundIndex]) {
                        const matchInSchedule = schedule[roundIndex].matches.find(
                            m => m.homeId === matchData.homeId && m.awayId === matchData.awayId
                        );

                        if (matchInSchedule) {
                            const [hg, ag] = (matchInSchedule.result || '0-0').split('-').map(Number);
                            homeScore = hg;
                            awayScore = ag;

                            // Carica matchLog (azioni salienti)
                            if (matchInSchedule.matchLog && matchInSchedule.matchLog.length > 0) {
                                matchLog = matchInSchedule.matchLog;
                            }

                            // Carica matchEvents (telecronaca completa)
                            if (matchInSchedule.matchEvents && matchInSchedule.matchEvents.length > 0) {
                                matchEvents = matchInSchedule.matchEvents;
                            }
                        }
                    }
                }
            }

            // Fallback: cerca nello storico partite (se matchHistory e' attivo)
            if (!matchLog && !matchEvents && window.MatchHistory) {
                const history = await window.MatchHistory.loadHistory(currentTeamId);
                const lastMatch = history.find(m => m.type === matchType);

                if (lastMatch?.details) {
                    if (lastMatch.details.matchLog && lastMatch.details.matchLog.length > 0) {
                        matchLog = lastMatch.details.matchLog;
                    }
                    if (lastMatch.details.matchEvents && lastMatch.details.matchEvents.length > 0) {
                        matchEvents = lastMatch.details.matchEvents;
                    }
                    homeName = lastMatch.homeTeam?.name || homeName;
                    awayName = lastMatch.awayTeam?.name || awayName;
                    homeScore = lastMatch.homeScore || 0;
                    awayScore = lastMatch.awayScore || 0;
                }
            }

            // Mostra la telecronaca appropriata
            if (telecronacaType === 'full') {
                // Telecronaca completa
                if (!matchEvents || matchEvents.length === 0) {
                    if (window.Toast) window.Toast.info('Telecronaca completa non disponibile per questa partita');
                    return;
                }
                window.MatchHistory.showTelecronacaCompletaModal(
                    matchEvents,
                    homeName,
                    awayName,
                    homeScore,
                    awayScore
                );
            } else {
                // Highlights - preferisci matchEvents (tutte le occasioni), fallback su matchLog (solo gol)
                const eventsData = (matchEvents && matchEvents.length > 0) ? matchEvents : matchLog;
                if (!eventsData || eventsData.length === 0) {
                    if (window.Toast) window.Toast.info('Telecronaca non disponibile per questa partita');
                    return;
                }
                window.MatchHistory.showTelecronacaModal(
                    eventsData,
                    homeName,
                    awayName,
                    homeScore,
                    awayScore
                );
            }

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
            const safeMsg = window.escapeHtml ? window.escapeHtml(error.message) : error.message;
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${safeMsg}</p>`;
        }
    },

    /**
     * Renderizza la schermata Coppa (Mobile-First)
     */
    renderCoppaScreen(container, bracket, currentTeamId, teamsData = {}) {
        let html = '';

        // Verifica se l'utente partecipa (solo se bracket esiste)
        const teamMatches = bracket ? window.CoppaSchedule.getTeamMatches(bracket, currentTeamId) : [];
        const hasBye = bracket ? window.CoppaSchedule.teamHasBye(bracket, currentTeamId) : false;
        const isParticipating = teamMatches.length > 0 || hasBye;

        // Aggiorna status badge nell'header
        const statusBadge = document.getElementById('coppa-status-badge');
        if (statusBadge) {
            let statusText = '--';
            let badgeClass = 'bg-purple-500/20 border-purple-500/50';
            let textClass = 'text-purple-400';

            if (!bracket) {
                statusText = 'Non iniziata';
                badgeClass = 'bg-gray-500/20 border-gray-500/50';
                textClass = 'text-gray-400';
            } else if (!isParticipating) {
                statusText = 'Non iscritto';
                badgeClass = 'bg-gray-500/20 border-gray-500/50';
                textClass = 'text-gray-400';
            } else if (bracket.winner?.teamId === currentTeamId) {
                statusText = '🏆 Vincitore!';
                badgeClass = 'bg-yellow-500/20 border-yellow-500/50';
                textClass = 'text-yellow-400';
            } else {
                const lastMatch = teamMatches[teamMatches.length - 1];
                const eliminated = lastMatch && lastMatch.winner && lastMatch.winner.teamId !== currentTeamId;
                if (eliminated) {
                    statusText = 'Eliminato';
                    badgeClass = 'bg-red-500/20 border-red-500/50';
                    textClass = 'text-red-400';
                } else if (hasBye) {
                    statusText = 'BYE';
                    badgeClass = 'bg-emerald-500/20 border-emerald-500/50';
                    textClass = 'text-emerald-400';
                } else {
                    statusText = 'In gara';
                    badgeClass = 'bg-emerald-500/20 border-emerald-500/50';
                    textClass = 'text-emerald-400';
                }
            }

            statusBadge.className = `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badgeClass} border`;
            statusBadge.innerHTML = `<span class="${textClass}">${statusText}</span>`;
        }

        // Funzione per ottenere URL logo
        const getLogoUrl = (teamId) => {
            return window.InterfacciaCore?.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
        };

        // Calcola livello medio formazione per ogni squadra
        const getFormationLevel = (teamId) => {
            const teamData = teamsData[teamId];
            if (!teamData) return '?';
            const formationPlayers = window.getFormationPlayers?.(teamData) || [];
            if (formationPlayers.length === 0) return '?';
            return window.calculateAverageLevel?.(formationPlayers)?.toFixed(1) || '?';
        };

        // SEZIONE 1: Prossima Partita Coppa (Card stile broadcast)
        if (!bracket) {
            // Coppa non ancora iniziata
            html += `
                <div class="rounded-2xl bg-gradient-to-br from-gray-800/60 to-gray-900/80 border border-purple-500/30 p-5 text-center">
                    <span class="text-4xl mb-3 block">⏳</span>
                    <p class="text-gray-300 font-semibold">La coppa non e ancora iniziata</p>
                    <p class="text-gray-500 text-xs mt-1">Attendi che l'admin generi il tabellone</p>
                </div>
            `;
        } else if (!isParticipating) {
            html += `
                <div class="rounded-2xl bg-gradient-to-br from-gray-800/60 to-gray-900/80 border border-gray-600/30 p-5 text-center">
                    <span class="text-4xl mb-3 block">🚫</span>
                    <p class="text-gray-400 font-semibold">Non sei iscritto alla CoppaSeriA</p>
                </div>
            `;
        } else if (hasBye) {
            html += `
                <div class="rounded-2xl bg-gradient-to-br from-emerald-900/40 to-gray-900/80 border border-emerald-500/40 p-5 text-center">
                    <span class="text-4xl mb-3 block">✨</span>
                    <p class="text-emerald-400 font-bold text-lg">Hai un BYE!</p>
                    <p class="text-gray-400 text-sm mt-1">Passi direttamente al turno successivo</p>
                </div>
            `;
        } else {
            // Trova prossima partita da giocare
            const nextCupMatch = teamMatches.find(m => !m.winner);

            if (nextCupMatch) {
                const isHome = nextCupMatch.homeTeam?.teamId === currentTeamId;
                const statusText = isHome ? 'CASA' : 'TRASFERTA';
                const statusColor = isHome ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40';

                const homeTeamId = nextCupMatch.homeTeam?.teamId;
                const awayTeamId = nextCupMatch.awayTeam?.teamId;
                const homeLvl = getFormationLevel(homeTeamId);
                const awayLvl = getFormationLevel(awayTeamId);

                html += `
                    <div class="next-match-card relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 via-gray-800/90 to-gray-900/90 border border-purple-500/30 shadow-xl">
                        <!-- Header con round e status -->
                        <div class="flex items-center justify-between px-4 py-2 bg-black/30">
                            <span class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">${nextCupMatch.roundName} ${nextCupMatch.isSingleMatch ? '• Secca' : '• A/R'}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full border ${statusColor} font-bold uppercase">${statusText}</span>
                        </div>

                        <!-- Match Preview -->
                        <div class="px-4 py-4">
                            <div class="flex items-center justify-between">
                                <!-- Home Team -->
                                <div class="flex-1 flex flex-col items-center">
                                    <div class="relative">
                                        <img src="${getLogoUrl(homeTeamId)}" alt="" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${homeTeamId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                        ${homeTeamId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px]">⭐</div>' : ''}
                                    </div>
                                    <p class="mt-2 text-xs sm:text-sm font-bold text-center truncate max-w-[80px] sm:max-w-[100px] ${homeTeamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${nextCupMatch.homeTeam?.teamName || 'TBD'}</p>
                                    <span class="mt-1 text-[10px] px-2 py-0.5 bg-gray-700/60 rounded-full text-cyan-400 font-semibold">Lv ${homeLvl}</span>
                                </div>

                                <!-- VS Divider -->
                                <div class="flex-shrink-0 px-3">
                                    <div class="relative">
                                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-fuchsia-600/20 border border-purple-500/40 flex items-center justify-center">
                                            <span class="text-lg sm:text-xl font-black text-purple-400">VS</span>
                                        </div>
                                        <div class="absolute inset-0 rounded-full animate-ping bg-purple-500/10"></div>
                                    </div>
                                </div>

                                <!-- Away Team -->
                                <div class="flex-1 flex flex-col items-center">
                                    <div class="relative">
                                        <img src="${getLogoUrl(awayTeamId)}" alt="" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${awayTeamId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                        ${awayTeamId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px]">⭐</div>' : ''}
                                    </div>
                                    <p class="mt-2 text-xs sm:text-sm font-bold text-center truncate max-w-[80px] sm:max-w-[100px] ${awayTeamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${nextCupMatch.awayTeam?.teamName || 'TBD'}</p>
                                    <span class="mt-1 text-[10px] px-2 py-0.5 bg-gray-700/60 rounded-full text-cyan-400 font-semibold">Lv ${awayLvl}</span>
                                </div>
                            </div>
                        </div>

                        ${!nextCupMatch.isSingleMatch && nextCupMatch.leg1Result ? `
                            <div class="px-4 pb-3">
                                <div class="text-center text-[11px] px-3 py-1.5 bg-purple-900/40 rounded-lg border border-purple-500/30">
                                    <span class="text-gray-400">Andata:</span> <span class="text-white font-bold">${nextCupMatch.leg1Result}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                // Verifico se eliminato o passato
                const lastMatch = teamMatches[teamMatches.length - 1];
                const eliminated = lastMatch && lastMatch.winner && lastMatch.winner.teamId !== currentTeamId;

                if (eliminated) {
                    html += `
                        <div class="rounded-2xl bg-gradient-to-br from-red-900/40 to-gray-900/80 border border-red-500/40 p-5 text-center">
                            <span class="text-4xl mb-3 block">💔</span>
                            <p class="text-red-400 font-bold text-lg">Eliminato</p>
                            <p class="text-gray-400 text-sm mt-1">Turno: ${lastMatch.roundName}</p>
                        </div>
                    `;
                } else if (bracket.winner && bracket.winner.teamId === currentTeamId) {
                    html += `
                        <div class="rounded-2xl bg-gradient-to-br from-yellow-900/50 via-amber-800/30 to-gray-900/80 border border-yellow-500/50 p-6 text-center shadow-xl shadow-yellow-900/20">
                            <span class="text-5xl mb-3 block">🏆</span>
                            <p class="text-yellow-400 font-black text-xl">HAI VINTO LA COPPA!</p>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="rounded-2xl bg-gradient-to-br from-emerald-900/40 to-gray-900/80 border border-emerald-500/40 p-5 text-center">
                            <span class="text-4xl mb-3 block">⏳</span>
                            <p class="text-emerald-400 font-bold">Ancora in corsa!</p>
                            <p class="text-gray-400 text-sm mt-1">Attendi il prossimo turno</p>
                        </div>
                    `;
                }
            }
        }

        // SEZIONE 2: Tabellone Completo (accordion compatto stile mobile)
        let completedRounds = 0;
        let totalRounds = 0;
        if (bracket && bracket.rounds) {
            totalRounds = bracket.rounds.length;
            completedRounds = bracket.rounds.filter(r => r.matches.every(m => m.winner !== null && m.winner !== undefined)).length;
        }

        html += `
            <div class="bracket-section bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden">
                <div class="flex items-center justify-between px-3 py-2 bg-gray-900/50 cursor-pointer"
                     onclick="window.UserCompetitions.toggleAccordion('coppa-tabellone-content')">
                    <div class="flex items-center gap-2">
                        <span class="text-sm">📋</span>
                        <span class="text-sm font-bold text-gray-300">Tabellone</span>
                        <span class="text-[10px] px-2 py-0.5 bg-gray-700 rounded-full text-gray-400">${completedRounds}/${totalRounds}</span>
                    </div>
                    <span id="coppa-tabellone-content-icon" class="text-gray-500 text-xs transition-transform">▼</span>
                </div>
                <div id="coppa-tabellone-content" class="hidden">
        `;

        // Vincitore se presente (in alto)
        if (bracket && bracket.winner) {
            html += `
                <div class="mx-3 mt-3 p-2.5 bg-gradient-to-r from-yellow-900/40 to-amber-800/30 rounded-lg border border-yellow-500/40 text-center">
                    <p class="text-yellow-400 font-bold text-sm flex items-center justify-center gap-1.5">
                        <span>🏆</span> ${bracket.winner.teamName}
                    </p>
                </div>
            `;
        }

        // Renderizza ogni round con accordion (collassabile)
        html += `<div class="max-h-72 overflow-y-auto divide-y divide-gray-700/30">`;

        if (bracket && bracket.rounds && bracket.rounds.length > 0) {
            // Ordina i round: prima quelli da giocare, poi quelli completati
            const sortedRounds = [...bracket.rounds].sort((a, b) => {
                const aComplete = a.matches.every(m => m.winner !== null && m.winner !== undefined);
                const bComplete = b.matches.every(m => m.winner !== null && m.winner !== undefined);
                if (aComplete === bComplete) return a.roundNumber - b.roundNumber;
                return aComplete ? 1 : -1;
            });

            sortedRounds.forEach((round, index) => {
                const roundComplete = round.matches.every(m => m.winner !== null && m.winner !== undefined);
                const hasMyMatch = round.matches.some(m =>
                    m.homeTeam?.teamId === currentTeamId || m.awayTeam?.teamId === currentTeamId
                );
                const accordionId = `coppa-round-${index}`;

                html += `
                    <div class="coppa-round">
                        <button class="coppa-round-header w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-700/30 transition"
                                data-accordion="${accordionId}" aria-expanded="false">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] ${roundComplete ? 'text-emerald-400' : 'text-purple-400'}">${roundComplete ? '✓' : '○'}</span>
                                <span class="text-xs font-semibold text-gray-300">${round.roundName}</span>
                                ${hasMyMatch ? '<span class="text-[10px] text-yellow-400">⭐</span>' : ''}
                            </div>
                            <span class="coppa-round-arrow text-gray-500 text-[10px] transition-transform">▼</span>
                        </button>
                        <div id="${accordionId}" class="coppa-round-content hidden bg-gray-900/30 px-3 py-2 space-y-1">
                `;

                round.matches.forEach(match => {
                    const homeName = match.homeTeam?.teamName || 'BYE';
                    const awayName = match.awayTeam?.teamName || 'BYE';
                    const homeId = match.homeTeam?.teamId;
                    const awayId = match.awayTeam?.teamId;
                    const isMyMatch = homeId === currentTeamId || awayId === currentTeamId;

                    // Determina il vincitore per evidenziazione
                    const homeIsWinner = match.winner && match.winner.teamId === homeId;
                    const awayIsWinner = match.winner && match.winner.teamId === awayId;

                    // Risultato compatto
                    let resultDisplay = 'vs';
                    if (match.leg1Result && match.leg2Result) {
                        resultDisplay = `${match.leg1Result} / ${match.leg2Result}`;
                    } else if (match.leg1Result) {
                        resultDisplay = match.leg1Result;
                    } else if (match.result) {
                        resultDisplay = match.result;
                    }

                    html += `
                        <div class="flex items-center justify-between text-[11px] py-1 ${isMyMatch ? 'bg-purple-500/10 -mx-1 px-1 rounded' : ''}">
                            <span class="flex-1 truncate ${homeId === currentTeamId ? 'text-yellow-400 font-bold' : homeIsWinner ? 'text-emerald-400 font-semibold' : awayIsWinner ? 'text-gray-500' : 'text-gray-300'}">${homeName}</span>
                            <span class="px-2 ${match.winner ? 'text-white font-bold' : 'text-gray-600'}">${resultDisplay}</span>
                            <span class="flex-1 truncate text-right ${awayId === currentTeamId ? 'text-yellow-400 font-bold' : awayIsWinner ? 'text-emerald-400 font-semibold' : homeIsWinner ? 'text-gray-500' : 'text-gray-300'}">${awayName}</span>
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
                <div class="p-4 text-center">
                    <p class="text-gray-500 text-sm">Tabellone non ancora disponibile</p>
                </div>
            `;
        }

        html += `</div>`; // chiude coppa-accordion
        html += `</div>`; // chiude coppa-tabellone-content
        html += `</div>`; // chiude box principale tabellone

        // SEZIONE 3: Ultima Partita Giocata in Coppa (Mobile-First)
        const lastCupMatch = this.findLastPlayedCupMatch(bracket, currentTeamId);
        if (lastCupMatch) {
            const myTeamWon = lastCupMatch.winner?.teamId === currentTeamId;

            // Stili basati sul risultato
            const resultStyles = myTeamWon ? {
                gradient: 'from-emerald-900/60 via-emerald-800/40 to-gray-900/80',
                border: 'border-emerald-500/50',
                badge: 'bg-emerald-500/30 border-emerald-400/60 text-emerald-400',
                icon: '🎉',
                text: 'PASSATO'
            } : {
                gradient: 'from-red-900/60 via-red-800/40 to-gray-900/80',
                border: 'border-red-500/50',
                badge: 'bg-red-500/30 border-red-400/60 text-red-400',
                icon: '💔',
                text: 'ELIMINATO'
            };

            // Costruisci stringa risultato
            let leg1Score = lastCupMatch.leg1Result || '';
            let leg2Score = lastCupMatch.leg2Result || '';

            const homeTeamId = lastCupMatch.homeTeam?.teamId;
            const awayTeamId = lastCupMatch.awayTeam?.teamId;

            html += `
                <div class="last-match-card relative overflow-hidden rounded-2xl bg-gradient-to-br ${resultStyles.gradient} ${resultStyles.border} border shadow-xl">
                    <!-- Header con round e risultato badge -->
                    <div class="flex items-center justify-between px-4 py-2 bg-black/30">
                        <span class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">${lastCupMatch.roundName}</span>
                        <span class="text-[10px] px-2.5 py-0.5 rounded-full border ${resultStyles.badge} font-bold uppercase flex items-center gap-1">
                            <span>${resultStyles.icon}</span> ${resultStyles.text}
                        </span>
                    </div>

                    <!-- Match Result Display -->
                    <div class="px-4 py-4">
                        <div class="flex items-center justify-between">
                            <!-- Home Team -->
                            <div class="flex-1 flex flex-col items-center">
                                <div class="relative">
                                    <img src="${getLogoUrl(homeTeamId)}" alt="" class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 ${homeTeamId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                    ${homeTeamId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px]">⭐</div>' : ''}
                                </div>
                                <p class="mt-1.5 text-[10px] sm:text-xs font-bold text-center truncate max-w-[70px] sm:max-w-[90px] ${homeTeamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${lastCupMatch.homeTeam?.teamName || 'TBD'}</p>
                            </div>

                            <!-- Score Display -->
                            <div class="flex-shrink-0 px-2 text-center">
                                ${leg2Score ? `
                                    <div class="text-[10px] text-gray-500 mb-1">Andata</div>
                                    <div class="text-lg font-bold text-gray-400 mb-1">${leg1Score}</div>
                                    <div class="text-[10px] text-gray-500 mb-1">Ritorno</div>
                                    <div class="text-xl font-black text-white">${leg2Score}</div>
                                ` : `
                                    <div class="text-2xl sm:text-3xl font-black text-white">${leg1Score || 'vs'}</div>
                                `}
                            </div>

                            <!-- Away Team -->
                            <div class="flex-1 flex flex-col items-center">
                                <div class="relative">
                                    <img src="${getLogoUrl(awayTeamId)}" alt="" class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 ${awayTeamId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                    ${awayTeamId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px]">⭐</div>' : ''}
                                </div>
                                <p class="mt-1.5 text-[10px] sm:text-xs font-bold text-center truncate max-w-[70px] sm:max-w-[90px] ${awayTeamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${lastCupMatch.awayTeam?.teamName || 'TBD'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="px-4 pb-4 flex gap-2">
                        <button id="btn-coppa-telecronaca"
                                class="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white text-[11px] sm:text-xs py-2.5 px-3 rounded-xl transition-all shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-1.5 font-semibold">
                            <span class="text-sm">📺</span> Highlights
                        </button>
                        <button id="btn-coppa-telecronaca-completa"
                                class="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-[11px] sm:text-xs py-2.5 px-3 rounded-xl transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-1.5 font-semibold">
                            <span class="text-sm">📋</span> Completa
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

            // Listener per bottone telecronaca coppa (azioni salienti)
            const btnCoppaTelecronaca = document.getElementById('btn-coppa-telecronaca');
            if (btnCoppaTelecronaca) {
                btnCoppaTelecronaca.addEventListener('click', async () => {
                    await this.showLastMatchTelecronaca('coppa', {}, 'highlights');
                });
            }

            // Listener per bottone telecronaca coppa completa
            const btnCoppaTelecronacaCompleta = document.getElementById('btn-coppa-telecronaca-completa');
            if (btnCoppaTelecronacaCompleta) {
                btnCoppaTelecronacaCompleta.addEventListener('click', async () => {
                    await this.showLastMatchTelecronaca('coppa', {}, 'full');
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
            const safeMsg = window.escapeHtml ? window.escapeHtml(error.message) : error.message;
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${safeMsg}</p>`;
        }
    },

    /**
     * Renderizza la schermata Supercoppa (Mobile-First)
     */
    renderSupercoppScreen(container, bracket, currentTeamId, teamsData = {}) {
        let html = '';

        // Funzione per ottenere URL logo
        const getLogoUrl = (teamId) => {
            return window.InterfacciaCore?.teamLogosMap?.[teamId] || window.InterfacciaConstants?.DEFAULT_LOGO_URL || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
        };

        // Calcola livello medio formazione per ogni squadra
        const getFormationLevel = (teamId) => {
            const teamData = teamsData[teamId];
            if (!teamData) return '?';
            const formationPlayers = window.getFormationPlayers?.(teamData) || [];
            if (formationPlayers.length === 0) return '?';
            return window.calculateAverageLevel?.(formationPlayers)?.toFixed(1) || '?';
        };

        const isParticipant = bracket ? (bracket.homeTeam?.teamId === currentTeamId || bracket.awayTeam?.teamId === currentTeamId) : false;
        const isCompleted = bracket?.isCompleted || false;
        const isWinner = bracket?.winner?.teamId === currentTeamId;
        const isLoser = isCompleted && isParticipant && !isWinner;

        const homeTeamId = bracket?.homeTeam?.teamId;
        const awayTeamId = bracket?.awayTeam?.teamId;
        const homeLvl = getFormationLevel(homeTeamId);
        const awayLvl = getFormationLevel(awayTeamId);

        // Aggiorna status badge nell'header
        const statusBadge = document.getElementById('supercoppa-status-badge');
        if (statusBadge) {
            let statusText = '--';
            let badgeClass = 'bg-yellow-500/20 border-yellow-500/50';
            let textClass = 'text-yellow-400';

            if (!bracket) {
                statusText = 'Non in programma';
                badgeClass = 'bg-gray-500/20 border-gray-500/50';
                textClass = 'text-gray-400';
            } else if (!isParticipant) {
                statusText = 'Spettatore';
                badgeClass = 'bg-gray-500/20 border-gray-500/50';
                textClass = 'text-gray-400';
            } else if (isWinner) {
                statusText = '🏆 Vincitore!';
                badgeClass = 'bg-yellow-500/20 border-yellow-500/50';
                textClass = 'text-yellow-400';
            } else if (isLoser) {
                statusText = 'Sconfitto';
                badgeClass = 'bg-red-500/20 border-red-500/50';
                textClass = 'text-red-400';
            } else {
                statusText = 'Finalista';
                badgeClass = 'bg-amber-500/20 border-amber-500/50';
                textClass = 'text-amber-400';
            }

            statusBadge.className = `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badgeClass} border`;
            statusBadge.innerHTML = `<span class="${textClass}">${statusText}</span>`;
        }

        // SEZIONE UNICA: La Partita (Card stile broadcast)
        if (!bracket) {
            // Supercoppa non ancora in programma
            html += `
                <div class="rounded-2xl bg-gradient-to-br from-gray-800/60 to-gray-900/80 border border-yellow-500/30 p-6 text-center">
                    <span class="text-5xl mb-4 block">⏳</span>
                    <p class="text-gray-300 font-semibold text-lg">Supercoppa non in programma</p>
                    <p class="text-gray-500 text-sm mt-2">Verra creata dopo il termine del campionato e della coppa</p>
                </div>
            `;
        } else {
            // Card partita stile broadcast
            const matchStatus = isCompleted ? (isWinner ? 'VITTORIA' : isLoser ? 'SCONFITTA' : 'CONCLUSA') : 'IN PROGRAMMA';
            const statusStyle = isCompleted
                ? (isWinner
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : isLoser
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/40')
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';

            // Gradiente card basato su stato
            const cardGradient = isCompleted
                ? (isWinner
                    ? 'from-yellow-900/50 via-amber-800/30 to-gray-900/80 border-yellow-500/50'
                    : isLoser
                        ? 'from-red-900/40 via-gray-800/60 to-gray-900/80 border-red-500/40'
                        : 'from-gray-800/60 via-gray-800/80 to-gray-900/90 border-gray-600/50')
                : 'from-amber-900/40 via-orange-800/30 to-gray-900/80 border-orange-500/40';

            html += `
                <div class="supercoppa-match-card relative overflow-hidden rounded-2xl bg-gradient-to-br ${cardGradient} border shadow-xl">
                    <!-- Header con tipo partita e status -->
                    <div class="flex items-center justify-between px-4 py-2 bg-black/30">
                        <span class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Partita Secca</span>
                        ${isParticipant ? `<span class="text-[10px] px-2.5 py-0.5 rounded-full border ${statusStyle} font-bold uppercase">${matchStatus}</span>` : ''}
                    </div>

                    <!-- Match Display -->
                    <div class="px-4 py-5">
                        <div class="flex items-center justify-between">
                            <!-- Home Team (Campione) -->
                            <div class="flex-1 flex flex-col items-center">
                                <div class="relative">
                                    <img src="${getLogoUrl(homeTeamId)}" alt="" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${homeTeamId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                    ${homeTeamId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px]">⭐</div>' : ''}
                                </div>
                                <span class="mt-1.5 text-[9px] px-2 py-0.5 bg-emerald-900/50 rounded-full text-emerald-400 font-semibold">${bracket.homeTeam?.qualification || 'Campione'}</span>
                                <p class="mt-1 text-xs sm:text-sm font-bold text-center truncate max-w-[80px] sm:max-w-[100px] ${homeTeamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${bracket.homeTeam?.teamName || 'TBD'}</p>
                                <span class="mt-1 text-[10px] px-2 py-0.5 bg-gray-700/60 rounded-full text-cyan-400 font-semibold">Lv ${homeLvl}</span>
                            </div>

                            <!-- VS / Risultato -->
                            <div class="flex-shrink-0 px-3 text-center">
                                ${bracket.result ? `
                                    <div class="text-2xl sm:text-3xl font-black text-yellow-400">${bracket.result}</div>
                                    ${bracket.penalties ? `<div class="text-[10px] text-gray-400 mt-1">(d.c.r.)</div>` : ''}
                                ` : `
                                    <div class="relative">
                                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-500/40 flex items-center justify-center">
                                            <span class="text-lg sm:text-xl font-black text-yellow-400">VS</span>
                                        </div>
                                        <div class="absolute inset-0 rounded-full animate-ping bg-yellow-500/10"></div>
                                    </div>
                                `}
                            </div>

                            <!-- Away Team (Vincitore Coppa) -->
                            <div class="flex-1 flex flex-col items-center">
                                <div class="relative">
                                    <img src="${getLogoUrl(awayTeamId)}" alt="" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${awayTeamId === currentTeamId ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'} object-cover">
                                    ${awayTeamId === currentTeamId ? '<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px]">⭐</div>' : ''}
                                </div>
                                <span class="mt-1.5 text-[9px] px-2 py-0.5 bg-purple-900/50 rounded-full text-purple-400 font-semibold">${bracket.awayTeam?.qualification || 'Coppa'}</span>
                                <p class="mt-1 text-xs sm:text-sm font-bold text-center truncate max-w-[80px] sm:max-w-[100px] ${awayTeamId === currentTeamId ? 'text-yellow-400' : 'text-white'}">${bracket.awayTeam?.teamName || 'TBD'}</p>
                                <span class="mt-1 text-[10px] px-2 py-0.5 bg-gray-700/60 rounded-full text-cyan-400 font-semibold">Lv ${awayLvl}</span>
                            </div>
                        </div>
                    </div>

                    ${bracket.winner ? `
                        <!-- Vincitore e Bottoni -->
                        <div class="px-4 pb-4">
                            <div class="text-center mb-3 py-2 bg-gradient-to-r from-yellow-900/40 to-amber-800/30 rounded-lg border border-yellow-500/40">
                                <p class="text-yellow-400 font-bold text-sm flex items-center justify-center gap-1.5">
                                    <span>🏆</span> ${bracket.winner.teamName}
                                </p>
                                <p class="text-gray-500 text-[10px] mt-0.5">Premio: 1 CSS</p>
                            </div>
                            <div class="flex gap-2">
                                <button id="btn-supercoppa-telecronaca"
                                        class="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white text-[11px] sm:text-xs py-2.5 px-3 rounded-xl transition-all shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-1.5 font-semibold">
                                    <span class="text-sm">📺</span> Highlights
                                </button>
                                <button id="btn-supercoppa-telecronaca-completa"
                                        class="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-[11px] sm:text-xs py-2.5 px-3 rounded-xl transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-1.5 font-semibold">
                                    <span class="text-sm">📋</span> Completa
                                </button>
                            </div>
                        </div>
                    ` : `
                        <!-- In attesa -->
                        <div class="px-4 pb-4">
                            <div class="text-center py-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                                <p class="text-yellow-400 text-sm font-semibold flex items-center justify-center gap-1.5">
                                    <span class="animate-pulse">⏳</span> In attesa di essere giocata
                                </p>
                            </div>
                        </div>
                    `}
                </div>
            `;

            // Info aggiuntiva se non partecipante
            if (!isParticipant) {
                html += `
                    <div class="rounded-xl bg-gray-800/40 border border-gray-700/50 p-3 text-center">
                        <p class="text-gray-500 text-xs">Solo il Campione e il Vincitore della Coppa si sfidano</p>
                    </div>
                `;
            }
        }

        container.innerHTML = html;

        // Listener per bottone telecronaca supercoppa (visibile a tutti)
        setTimeout(() => {
            const btnSupercoppaTelecronaca = document.getElementById('btn-supercoppa-telecronaca');
            if (btnSupercoppaTelecronaca && bracket) {
                btnSupercoppaTelecronaca.addEventListener('click', async () => {
                    await this.showSupercoppaTelecronaca(bracket, 'highlights');
                });
            }

            const btnSupercoppaTelecronacaCompleta = document.getElementById('btn-supercoppa-telecronaca-completa');
            if (btnSupercoppaTelecronacaCompleta && bracket) {
                btnSupercoppaTelecronacaCompleta.addEventListener('click', async () => {
                    await this.showSupercoppaTelecronaca(bracket, 'full');
                });
            }
        }, 100);
    },

    /**
     * Mostra la telecronaca della supercoppa (visibile a tutti gli utenti)
     * @param {Object} bracket - Dati bracket supercoppa
     * @param {string} telecronacaType - 'highlights' o 'full'
     */
    async showSupercoppaTelecronaca(bracket, telecronacaType = 'highlights') {
        if (!bracket?.winner || !bracket.homeTeam?.teamId || !bracket.awayTeam?.teamId) {
            if (window.Toast) window.Toast.info('Telecronaca non ancora disponibile');
            return;
        }

        try {
            // Prova a caricare lo storico dal vincitore
            let matchLog = null;
            let matchEvents = null;
            let homeScore = 0;
            let awayScore = 0;

            const winnerId = bracket.winner.teamId;
            const history = await window.MatchHistory.loadHistory(winnerId);
            const supercoppMatch = history.find(m => m.type === 'supercoppa');

            if (supercoppMatch?.details) {
                if (supercoppMatch.details.matchLog) {
                    matchLog = supercoppMatch.details.matchLog;
                }
                if (supercoppMatch.details.matchEvents) {
                    matchEvents = supercoppMatch.details.matchEvents;
                }
                homeScore = supercoppMatch.homeScore;
                awayScore = supercoppMatch.awayScore;
            }

            // Mostra la telecronaca appropriata
            if (telecronacaType === 'full') {
                if (!matchEvents || matchEvents.length === 0) {
                    if (window.Toast) window.Toast.info('Telecronaca completa non disponibile per questa partita');
                    return;
                }
                window.MatchHistory.showTelecronacaCompletaModal(
                    matchEvents,
                    bracket.homeTeam.teamName,
                    bracket.awayTeam.teamName,
                    homeScore,
                    awayScore
                );
            } else {
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
            }

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

        // Bottone Classifica Campionato
        const btnLeaderboard = document.getElementById('btn-view-leaderboard');
        if (btnLeaderboard) {
            btnLeaderboard.addEventListener('click', () => {
                window.showScreen(document.getElementById('campionato-leaderboard-content'));
                this.loadLeaderboardScreen();
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

        // Bottone Tabellone Coppa
        const btnCupBracket = document.getElementById('btn-view-cup-bracket');
        if (btnCupBracket) {
            btnCupBracket.addEventListener('click', () => {
                window.showScreen(document.getElementById('cup-bracket-content'));
                this.loadCupBracketScreen();
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

    },

    /**
     * Toggle accordion per classifica e calendario
     */
    toggleAccordion(accordionId) {
        const content = document.getElementById(accordionId);
        const icon = document.getElementById(`${accordionId}-icon`);
        const btnText = document.getElementById(`${accordionId}-btn-text`);

        if (content) {
            const isHidden = content.classList.contains('hidden');

            if (isHidden) {
                content.classList.remove('hidden');
                if (icon) icon.textContent = '▲';
                if (btnText) btnText.textContent = 'Riduci';
            } else {
                content.classList.add('hidden');
                if (icon) icon.textContent = '▼';
                if (btnText) btnText.textContent = 'Espandi';
            }
        }
    },

    /**
     * Carica la schermata Classifica Campionato
     */
    async loadLeaderboardScreen() {
        const container = document.getElementById('campionato-leaderboard-table-container');
        if (!container) return;

        const currentTeamId = window.InterfacciaCore?.currentTeamId;

        container.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
                <p class="text-gray-400">Caricamento classifica...</p>
            </div>
        `;

        try {
            // Carica classifica
            const leaderboardData = await window.LeaderboardListener?.getLeaderboard();
            const standings = leaderboardData?.standings || [];

            if (standings.length === 0) {
                container.innerHTML = `<p class="text-center text-gray-400 py-4">Nessuna classifica disponibile</p>`;
                return;
            }

            // Carica dati squadre per livello medio
            const { collection, getDocs } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

            let teamsData = {};
            try {
                const teamsSnap = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
                teamsSnap.forEach(doc => {
                    teamsData[doc.id] = doc.data();
                });
            } catch (e) {
                console.warn('[Leaderboard] Impossibile caricare dati squadre:', e);
            }

            // Genera tabella classifica
            let tableHtml = `
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
                const position = index + 1;
                const isCurrentTeam = team.teamId === currentTeamId;
                const rowBg = isCurrentTeam ? 'bg-yellow-900 bg-opacity-50' : (index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800');
                const textColor = isCurrentTeam ? 'text-yellow-400 font-bold' : 'text-white';

                // Calcola livello medio rosa
                const teamData = teamsData[team.teamId];
                let avgLevel = '-';
                if (teamData?.players) {
                    const players = teamData.players;
                    if (players.length > 0) {
                        const totalLevel = players.reduce((sum, p) => sum + (p.level || 1), 0);
                        avgLevel = (totalLevel / players.length).toFixed(1);
                    }
                }

                const gd = (team.goalsFor || 0) - (team.goalsAgainst || 0);
                const gdText = gd >= 0 ? `+${gd}` : gd;
                const gdColor = gd > 0 ? 'text-green-400' : (gd < 0 ? 'text-red-400' : 'text-gray-400');

                tableHtml += `
                    <tr class="${rowBg}">
                        <td class="py-2 px-3 ${textColor}">${position}</td>
                        <td class="py-2 px-2 text-center text-cyan-400 text-xs font-semibold">${avgLevel}</td>
                        <td class="py-2 px-3 ${textColor}">${this._escapeHtml(team.teamName || 'Squadra')}</td>
                        <td class="py-2 px-3 text-center font-bold ${textColor}">${team.points || 0}</td>
                        <td class="py-2 px-3 text-center text-gray-400">${team.played || 0}</td>
                        <td class="py-2 px-3 text-center text-green-400">${team.wins || 0}</td>
                        <td class="py-2 px-3 text-center text-yellow-400">${team.draws || 0}</td>
                        <td class="py-2 px-3 text-center text-red-400">${team.losses || 0}</td>
                        <td class="py-2 px-3 text-center ${gdColor}">${gdText}</td>
                    </tr>
                `;
            });

            tableHtml += `
                    </tbody>
                </table>
            `;

            container.innerHTML = tableHtml;

        } catch (error) {
            console.error('[Leaderboard] Errore:', error);
            container.innerHTML = `<p class="text-center text-red-400 py-4">Errore nel caricamento della classifica</p>`;
        }
    },

    /**
     * Carica la schermata Tabellone Coppa
     */
    async loadCupBracketScreen() {
        const container = document.getElementById('cup-bracket-table-container');
        if (!container) return;

        const currentTeamId = window.InterfacciaCore?.currentTeamId;

        // Loading state con nuovo design
        container.innerHTML = `
            <div class="cup-bracket-loading">
                <div class="cup-bracket-spinner"></div>
                <p class="cup-bracket-loading-text">Caricamento tabellone...</p>
            </div>
        `;

        try {
            // Carica bracket coppa
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const COPPA_SCHEDULE_DOC_ID = window.CoppaConstants?.COPPA_SCHEDULE_DOC_ID || 'coppa_schedule';
            const cupDocRef = doc(db, `artifacts/${appId}/public/data/schedule`, COPPA_SCHEDULE_DOC_ID);

            const cupDoc = await getDoc(cupDocRef);

            if (!cupDoc.exists()) {
                container.innerHTML = `
                    <div class="cup-bracket-empty">
                        <div class="cup-bracket-empty-icon">🏆</div>
                        <p>Tabellone non ancora generato</p>
                    </div>
                `;
                return;
            }

            const cupData = cupDoc.data();
            const rounds = cupData.rounds || [];

            if (rounds.length === 0) {
                container.innerHTML = `
                    <div class="cup-bracket-empty">
                        <div class="cup-bracket-empty-icon">📋</div>
                        <p>Nessun turno disponibile</p>
                    </div>
                `;
                return;
            }

            // HTML per il tabellone con nuovo design
            let html = '';

            // Mostra vincitore se coppa completata
            if (cupData.status === 'completed' && cupData.winner) {
                html += `
                    <div class="cup-winner-banner">
                        <div class="cup-winner-content">
                            <p class="cup-winner-label">Vincitore CoppaSeriA</p>
                            <p class="cup-winner-name">🏆 ${this._escapeHtml(cupData.winner.teamName)}</p>
                        </div>
                    </div>
                `;
            }

            html += `<div class="cup-rounds-container">`;

            // Genera ogni round con card design
            rounds.forEach((round, roundIndex) => {
                const isCompleted = round.status === 'completed';
                const hasUserMatch = round.matches?.some(m =>
                    m.homeTeam?.teamId === currentTeamId || m.awayTeam?.teamId === currentTeamId
                );

                html += `
                    <div class="cup-round-card ${hasUserMatch ? 'has-user-match' : ''}">
                        <button class="cup-round-header" data-accordion="cup-bracket-round-${roundIndex}" aria-expanded="false">
                            <div class="cup-round-info">
                                <div class="cup-round-status ${isCompleted ? 'completed' : 'pending'}">
                                    ${isCompleted ? '✓' : '⏳'}
                                </div>
                                <span class="cup-round-name">${round.roundName || `Turno ${roundIndex + 1}`}</span>
                                ${hasUserMatch ? '<span class="cup-round-user-badge">Tua partita</span>' : ''}
                            </div>
                            <div class="cup-round-arrow">▼</div>
                        </button>
                        <div id="cup-bracket-round-${roundIndex}" class="cup-round-matches hidden">
                `;

                // Genera ogni match del round con card design
                if (round.matches) {
                    round.matches.forEach(match => {
                        const homeName = match.homeTeam?.teamName || 'TBD';
                        const awayName = match.awayTeam?.teamName || 'TBD';
                        const isUserMatch = match.homeTeam?.teamId === currentTeamId || match.awayTeam?.teamId === currentTeamId;
                        const isHomeUser = match.homeTeam?.teamId === currentTeamId;
                        const isAwayUser = match.awayTeam?.teamId === currentTeamId;

                        // Funzione helper per parsare risultato stringa "X-Y" o "X-Y (dts)" ecc
                        const parseResult = (resultStr) => {
                            if (!resultStr) return null;
                            const resultMatch = String(resultStr).match(/^(\d+)-(\d+)/);
                            if (resultMatch) {
                                return { home: parseInt(resultMatch[1]), away: parseInt(resultMatch[2]) };
                            }
                            return null;
                        };

                        const leg1 = parseResult(match.leg1Result);
                        const leg2 = parseResult(match.leg2Result);

                        let homeWon = false;
                        let awayWon = false;
                        let aggHome = 0;
                        let aggAway = 0;

                        if (match.winner) {
                            homeWon = match.winner.teamId === match.homeTeam?.teamId;
                            awayWon = !homeWon;

                            if (leg1 && leg2) {
                                aggHome = leg1.home + leg2.away;
                                aggAway = leg1.away + leg2.home;
                            } else if (leg1) {
                                aggHome = leg1.home;
                                aggAway = leg1.away;
                            } else {
                                aggHome = match.aggregateHome || 0;
                                aggAway = match.aggregateAway || 0;
                            }
                        }

                        html += `
                            <div class="cup-match-card ${isUserMatch ? 'user-match' : ''}">
                                <div class="cup-match-teams">
                        `;

                        if (match.winner || leg1) {
                            // Partita con risultato
                            const homeScore = leg2 ? leg2.home : (leg1 ? leg1.home : aggHome);
                            const awayScore = leg2 ? leg2.away : (leg1 ? leg1.away : aggAway);

                            html += `
                                <div class="cup-match-team ${homeWon ? 'winner' : (awayWon ? 'loser' : '')}">
                                    <span class="cup-team-name ${homeWon ? 'winner' : (awayWon ? 'loser' : '')} ${isHomeUser ? 'is-user' : ''}">${this._escapeHtml(homeName)}</span>
                                    <span class="cup-team-score ${homeWon ? 'winner' : (awayWon ? 'loser' : '')}">${homeScore}</span>
                                </div>
                                <div class="cup-match-team ${awayWon ? 'winner' : (homeWon ? 'loser' : '')}">
                                    <span class="cup-team-name ${awayWon ? 'winner' : (homeWon ? 'loser' : '')} ${isAwayUser ? 'is-user' : ''}">${this._escapeHtml(awayName)}</span>
                                    <span class="cup-team-score ${awayWon ? 'winner' : (homeWon ? 'loser' : '')}">${awayScore}</span>
                                </div>
                            `;

                            // Mostra aggregato se ci sono due leg
                            if (leg1 && leg2 && match.winner) {
                                html += `
                                    <div class="cup-match-aggregate">
                                        <span class="cup-match-aggregate-label">Agg:</span>
                                        <span class="cup-match-aggregate-score">${aggHome} - ${aggAway}</span>
                                    </div>
                                `;
                            }
                        } else {
                            // Partita non ancora giocata
                            html += `
                                <div class="cup-match-team">
                                    <span class="cup-team-name ${isHomeUser ? 'is-user' : ''}">${this._escapeHtml(homeName)}</span>
                                </div>
                                <div class="cup-match-vs">
                                    <div class="cup-match-vs-icon">VS</div>
                                </div>
                                <div class="cup-match-team">
                                    <span class="cup-team-name ${isAwayUser ? 'is-user' : ''}">${this._escapeHtml(awayName)}</span>
                                </div>
                            `;
                        }

                        html += `
                                </div>
                            </div>
                        `;
                    });
                }

                html += `
                        </div>
                    </div>
                `;
            });

            html += `</div>`;

            container.innerHTML = html;

            // Aggiungi listener per accordion
            this.initCupBracketAccordions();

        } catch (error) {
            console.error('[CupBracket] Errore:', error);
            container.innerHTML = `
                <div class="cup-bracket-empty">
                    <div class="cup-bracket-empty-icon">⚠️</div>
                    <p class="text-red-400">Errore nel caricamento del tabellone</p>
                </div>
            `;
        }
    },

    /**
     * Inizializza gli accordion del tabellone coppa
     */
    initCupBracketAccordions() {
        const headers = document.querySelectorAll('.cup-rounds-container .cup-round-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const targetId = header.getAttribute('data-accordion');
                const content = document.getElementById(targetId);
                const arrow = header.querySelector('.cup-round-arrow');

                if (content) {
                    const isHidden = content.classList.contains('hidden');
                    content.classList.toggle('hidden');
                    if (arrow) {
                        arrow.style.transform = isHidden ? 'rotate(180deg)' : '';
                    }
                    header.setAttribute('aria-expanded', isHidden);
                }
            });
        });
    },

    /**
     * Escape HTML per sicurezza
     */
    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

console.log("Modulo User-Competitions caricato.");
