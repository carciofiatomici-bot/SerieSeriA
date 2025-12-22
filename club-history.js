//
// ====================================================================
// CLUB-HISTORY.JS - Sistema Statistiche Storiche del Club
// ====================================================================
// Gestisce le statistiche storiche per il Museo del Club:
// - Record della squadra
// - Statistiche gol
// - Trofei vinti
// - Storico stagioni
// ====================================================================
//

window.ClubHistory = {

    // ==================== STRUTTURA DATI ====================

    /**
     * Struttura dati per la storia del club
     * Salvata in: teams/{teamId} -> clubHistory
     */
    getDefaultHistory() {
        return {
            // Record generali
            records: {
                totalMatches: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                winStreak: 0,           // Vittorie consecutive attuali
                bestWinStreak: 0,       // Record vittorie consecutive
                lossStreak: 0,          // Sconfitte consecutive attuali
                worstLossStreak: 0      // Record sconfitte consecutive
            },

            // Statistiche gol
            goals: {
                scored: 0,
                conceded: 0,
                bestScorer: null,       // { name, goals }
                mostInMatch: 0,         // Gol in una singola partita
                cleanSheets: 0          // Partite senza subire gol
            },

            // Trofei
            trophies: {
                championships: 0,
                cups: 0,
                // Dettaglio trofei con stagione
                list: []  // [{ type: 'championship'|'cup', season: 1, date: '...' }]
            },

            // Storico stagioni
            seasons: [],  // [{ season: 1, position: 3, points: 45, goalsScored: 30, goalsConceded: 15, cupRound: 'Semifinale' }]

            // Ultima modifica
            lastUpdated: null
        };
    },

    // ==================== CARICAMENTO/SALVATAGGIO ====================

    /**
     * Carica la storia del club per una squadra
     * @param {string} teamId - ID della squadra
     * @returns {Object} Dati storici del club
     */
    async loadHistory(teamId) {
        if (!teamId || !window.db || !window.firestoreTools) {
            console.error('[ClubHistory] Parametri mancanti');
            return this.getDefaultHistory();
        }

        const { doc, getDoc, appId } = window.firestoreTools;
        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;

        try {
            const teamDoc = await getDoc(doc(window.db, teamPath));
            if (!teamDoc.exists()) {
                return this.getDefaultHistory();
            }

            const teamData = teamDoc.data();
            return teamData.clubHistory || this.getDefaultHistory();
        } catch (error) {
            console.error('[ClubHistory] Errore caricamento:', error);
            return this.getDefaultHistory();
        }
    },

    /**
     * Salva la storia del club
     * @param {string} teamId - ID della squadra
     * @param {Object} history - Dati storici da salvare
     */
    async saveHistory(teamId, history) {
        if (!teamId || !window.db || !window.firestoreTools) {
            console.error('[ClubHistory] Parametri mancanti per salvataggio');
            return false;
        }

        const { doc, updateDoc, appId } = window.firestoreTools;
        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;

        try {
            history.lastUpdated = new Date().toISOString();
            await updateDoc(doc(window.db, teamPath), {
                clubHistory: history
            });
            console.log(`[ClubHistory] Storia salvata per ${teamId}`);
            return true;
        } catch (error) {
            console.error('[ClubHistory] Errore salvataggio:', error);
            return false;
        }
    },

    // ==================== AGGIORNAMENTO STATISTICHE ====================

    /**
     * Aggiorna le statistiche dopo una partita
     * @param {string} teamId - ID della squadra
     * @param {Object} matchResult - Risultato partita { goalsScored, goalsConceded, isHome }
     */
    async updateAfterMatch(teamId, matchResult) {
        const history = await this.loadHistory(teamId);

        const { goalsScored, goalsConceded } = matchResult;
        const isWin = goalsScored > goalsConceded;
        const isDraw = goalsScored === goalsConceded;
        const isLoss = goalsScored < goalsConceded;

        // Aggiorna record partite
        history.records.totalMatches++;
        if (isWin) {
            history.records.wins++;
            history.records.winStreak++;
            history.records.lossStreak = 0;
            if (history.records.winStreak > history.records.bestWinStreak) {
                history.records.bestWinStreak = history.records.winStreak;
            }
        } else if (isDraw) {
            history.records.draws++;
            history.records.winStreak = 0;
            history.records.lossStreak = 0;
        } else {
            history.records.losses++;
            history.records.lossStreak++;
            history.records.winStreak = 0;
            if (history.records.lossStreak > history.records.worstLossStreak) {
                history.records.worstLossStreak = history.records.lossStreak;
            }
        }

        // Aggiorna statistiche gol
        history.goals.scored += goalsScored;
        history.goals.conceded += goalsConceded;

        if (goalsScored > history.goals.mostInMatch) {
            history.goals.mostInMatch = goalsScored;
        }

        if (goalsConceded === 0) {
            history.goals.cleanSheets++;
        }

        await this.saveHistory(teamId, history);
        return history;
    },

    /**
     * Aggiorna il miglior marcatore
     * @param {string} teamId - ID della squadra
     * @param {string} playerName - Nome del giocatore
     * @param {number} goals - Gol totali del giocatore
     */
    async updateBestScorer(teamId, playerName, goals) {
        const history = await this.loadHistory(teamId);

        if (!history.goals.bestScorer || goals > history.goals.bestScorer.goals) {
            history.goals.bestScorer = { name: playerName, goals: goals };
            await this.saveHistory(teamId, history);
        }

        return history;
    },

    /**
     * Registra un trofeo vinto
     * @param {string} teamId - ID della squadra
     * @param {string} trophyType - 'championship' o 'cup'
     * @param {number} season - Numero stagione
     */
    async addTrophy(teamId, trophyType, season) {
        const history = await this.loadHistory(teamId);

        if (trophyType === 'championship') {
            history.trophies.championships++;
        } else if (trophyType === 'cup') {
            history.trophies.cups++;
        }

        history.trophies.list.push({
            type: trophyType,
            season: season,
            date: new Date().toISOString()
        });

        await this.saveHistory(teamId, history);
        console.log(`[ClubHistory] Trofeo ${trophyType} aggiunto per ${teamId}`);
        return history;
    },

    /**
     * Salva i dati di fine stagione
     * @param {string} teamId - ID della squadra
     * @param {Object} seasonData - Dati stagione { season, position, points, goalsScored, goalsConceded, cupRound }
     */
    async saveSeasonEnd(teamId, seasonData) {
        const history = await this.loadHistory(teamId);

        // Verifica se la stagione esiste gia
        const existingIndex = history.seasons.findIndex(s => s.season === seasonData.season);
        if (existingIndex >= 0) {
            history.seasons[existingIndex] = seasonData;
        } else {
            history.seasons.push(seasonData);
        }

        // Ordina per stagione
        history.seasons.sort((a, b) => b.season - a.season);

        await this.saveHistory(teamId, history);
        console.log(`[ClubHistory] Stagione ${seasonData.season} salvata per ${teamId}`);
        return history;
    },

    // ==================== CALCOLO STATISTICHE ====================

    /**
     * Calcola la percentuale di vittorie
     * @param {Object} history - Dati storici
     * @returns {number} Percentuale vittorie
     */
    getWinPercentage(history) {
        if (!history.records.totalMatches) return 0;
        return Math.round((history.records.wins / history.records.totalMatches) * 100);
    },

    /**
     * Calcola la media gol a partita
     * @param {Object} history - Dati storici
     * @returns {string} Media gol (1 decimale)
     */
    getGoalsPerMatch(history) {
        if (!history.records.totalMatches) return '0.0';
        return (history.goals.scored / history.records.totalMatches).toFixed(1);
    },

    /**
     * Calcola la differenza reti totale
     * @param {Object} history - Dati storici
     * @returns {number} Differenza reti
     */
    getGoalDifference(history) {
        return history.goals.scored - history.goals.conceded;
    },

    // ==================== RENDERING UI ====================

    /**
     * Renderizza la pagina del Museo del Club
     * @param {string} teamId - ID della squadra
     * @returns {string} HTML del museo
     */
    async renderMuseum(teamId) {
        const history = await this.loadHistory(teamId);
        const winPercent = this.getWinPercentage(history);
        const goalsPerMatch = this.getGoalsPerMatch(history);
        const goalDiff = this.getGoalDifference(history);

        return `
            <div class="club-museum p-6 bg-gray-900 rounded-lg">
                <h2 class="text-2xl font-bold text-amber-400 text-center mb-6">
                    <span class="text-3xl mr-2">🏛️</span> Museo del Club
                </h2>

                <!-- Record -->
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">
                        <span class="mr-2">📊</span> Record
                    </h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-white">${history.records.totalMatches}</p>
                            <p class="text-sm text-gray-400">Partite Giocate</p>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-green-400">${history.records.wins}</p>
                            <p class="text-sm text-gray-400">Vittorie</p>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-yellow-400">${history.records.draws}</p>
                            <p class="text-sm text-gray-400">Pareggi</p>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-red-400">${history.records.losses}</p>
                            <p class="text-sm text-gray-400">Sconfitte</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-xl font-bold text-blue-400">${winPercent}%</p>
                            <p class="text-xs text-gray-400">% Vittorie</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-xl font-bold text-green-400">${history.records.bestWinStreak}</p>
                            <p class="text-xs text-gray-400">Record Vittorie Consecutive</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-xl font-bold text-red-400">${history.records.worstLossStreak}</p>
                            <p class="text-xs text-gray-400">Record Sconfitte Consecutive</p>
                        </div>
                    </div>
                </div>

                <!-- Statistiche Gol -->
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">
                        <span class="mr-2">⚽</span> Gol
                    </h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-green-400">${history.goals.scored}</p>
                            <p class="text-sm text-gray-400">Gol Segnati</p>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-red-400">${history.goals.conceded}</p>
                            <p class="text-sm text-gray-400">Gol Subiti</p>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold ${goalDiff >= 0 ? 'text-green-400' : 'text-red-400'}">${goalDiff >= 0 ? '+' : ''}${goalDiff}</p>
                            <p class="text-sm text-gray-400">Differenza Reti</p>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-blue-400">${goalsPerMatch}</p>
                            <p class="text-sm text-gray-400">Media Gol/Partita</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-xl font-bold text-amber-400">${history.goals.mostInMatch}</p>
                            <p class="text-xs text-gray-400">Max Gol in una Partita</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-xl font-bold text-cyan-400">${history.goals.cleanSheets}</p>
                            <p class="text-xs text-gray-400">Clean Sheets</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-xl font-bold text-purple-400">${history.goals.bestScorer ? history.goals.bestScorer.name : '-'}</p>
                            <p class="text-xs text-gray-400">Miglior Marcatore ${history.goals.bestScorer ? `(${history.goals.bestScorer.goals})` : ''}</p>
                        </div>
                    </div>
                </div>

                <!-- Trofei -->
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">
                        <span class="mr-2">🏆</span> Bacheca Trofei
                    </h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-gradient-to-br from-yellow-900 to-yellow-700 p-4 rounded-lg text-center">
                            <p class="text-4xl font-bold text-yellow-300">${history.trophies.championships}</p>
                            <p class="text-sm text-yellow-100">Campionati</p>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-4 rounded-lg text-center">
                            <p class="text-4xl font-bold text-gray-200">${history.trophies.cups}</p>
                            <p class="text-sm text-gray-300">Coppe</p>
                        </div>
                    </div>
                    ${history.trophies.list.length > 0 ? `
                        <div class="bg-gray-800 p-3 rounded-lg">
                            <p class="text-xs text-gray-400 mb-2">Dettaglio:</p>
                            <div class="flex flex-wrap gap-2">
                                ${history.trophies.list.map(t => `
                                    <span class="px-2 py-1 rounded text-xs ${t.type === 'championship' ? 'bg-yellow-800 text-yellow-200' : 'bg-gray-600 text-gray-200'}">
                                        ${t.type === 'championship' ? '🥇' : '🏆'} Stagione ${t.season}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : '<p class="text-gray-500 text-center text-sm">Nessun trofeo ancora vinto</p>'}
                </div>

                <!-- Storico Stagioni -->
                <div>
                    <h3 class="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">
                        <span class="mr-2">📅</span> Storico Stagioni
                    </h3>
                    ${history.seasons.length > 0 ? `
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="text-gray-400 border-b border-gray-700">
                                        <th class="py-2 text-left">Stagione</th>
                                        <th class="py-2 text-center">Pos.</th>
                                        <th class="py-2 text-center">Punti</th>
                                        <th class="py-2 text-center">GF</th>
                                        <th class="py-2 text-center">GS</th>
                                        <th class="py-2 text-center">Coppa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.seasons.map(s => `
                                        <tr class="border-b border-gray-800">
                                            <td class="py-2 text-white">Stagione ${s.season}</td>
                                            <td class="py-2 text-center ${s.position === 1 ? 'text-yellow-400 font-bold' : s.position <= 3 ? 'text-green-400' : 'text-gray-300'}">${s.position}°</td>
                                            <td class="py-2 text-center text-blue-400">${s.points}</td>
                                            <td class="py-2 text-center text-green-400">${s.goalsScored}</td>
                                            <td class="py-2 text-center text-red-400">${s.goalsConceded}</td>
                                            <td class="py-2 text-center text-gray-400">${s.cupRound || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-gray-500 text-center text-sm">Nessuna stagione completata</p>'}
                </div>

                ${!history.records.totalMatches ? `
                    <div class="mt-6 p-4 bg-gray-800 rounded-lg text-center">
                        <p class="text-gray-400">
                            <span class="text-2xl">📝</span><br>
                            Le statistiche verranno registrate automaticamente<br>
                            dopo ogni partita giocata.
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Verifica se il Museo e' sbloccato (richiede struttura costruita)
     * @param {Object} stadiumData - Dati stadio della squadra
     * @returns {boolean} True se il museo e' sbloccato
     */
    isMuseumUnlocked(stadiumData) {
        if (!window.Stadium || !stadiumData) return false;
        const level = window.Stadium.getStructureLevel('museum', stadiumData);
        return level > 0;
    }
};

console.log("Modulo club-history.js caricato.");
