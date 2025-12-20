//
// ====================================================================
// MODULO PLAYER-SEASON-STATS-UI.JS (UI Statistiche Stagionali)
// ====================================================================
//
// Visualizza le classifiche dei premi individuali:
// - Capocannoniere (top marcatori)
// - Miglior Assistman
// - Portiere Imbattuto (clean sheets)
//

window.PlayerSeasonStatsUI = {

    /**
     * Toggle per mostrare/nascondere le classifiche complete.
     * @param {string} rankingsId - ID del contenitore delle classifiche
     */
    toggleRankings(rankingsId) {
        const rankings = document.getElementById(rankingsId);
        const icon = document.getElementById('icon-' + rankingsId);

        if (!rankings) return;

        if (rankings.classList.contains('hidden')) {
            rankings.classList.remove('hidden');
            if (icon) {
                icon.textContent = '▲';
                icon.classList.add('rotate-180');
            }
        } else {
            rankings.classList.add('hidden');
            if (icon) {
                icon.textContent = '▼';
                icon.classList.remove('rotate-180');
            }
        }
    },

    // Nomi e icone delle competizioni
    COMPETITION_INFO: {
        campionato: { name: 'Campionato', icon: '🏆', color: 'green' },
        coppa: { name: 'Coppa', icon: '🏅', color: 'purple' },
        supercoppa: { name: 'Supercoppa', icon: '⭐', color: 'yellow' }
    },

    /**
     * Renderizza il pannello completo delle statistiche stagionali.
     * @param {string} containerId - ID del container HTML dove inserire la UI
     * @param {string} competition - Competizione (campionato, coppa, supercoppa)
     */
    async renderStatsPanel(containerId, competition = 'campionato') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('PlayerSeasonStatsUI: Container non trovato:', containerId);
            return;
        }

        const compInfo = this.COMPETITION_INFO[competition] || this.COMPETITION_INFO.campionato;

        container.innerHTML = `
            <div class="text-center p-4">
                <div class="animate-pulse text-gray-400">Caricamento statistiche ${compInfo.name}...</div>
            </div>
        `;

        try {
            const [topScorers, topAssisters, topCleanSheets, summary] = await Promise.all([
                window.PlayerSeasonStats.getTopScorers(10, competition),
                window.PlayerSeasonStats.getTopAssisters(10, competition),
                window.PlayerSeasonStats.getTopCleanSheets(10, competition),
                window.PlayerSeasonStats.getSeasonSummary(competition)
            ]);

            const getLogoHtml = window.getLogoHtml || ((teamId) => '');

            const rankingsId = `season-stats-rankings-${competition}-${Date.now()}`;
            container.innerHTML = `
                <div class="space-y-4">
                    <!-- Riepilogo Stagione (sempre visibile) -->
                    ${this.renderSeasonSummary(summary, competition)}

                    <!-- Toggle Classifiche Complete -->
                    <button id="toggle-${rankingsId}"
                            class="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-between transition-colors"
                            onclick="window.PlayerSeasonStatsUI.toggleRankings('${rankingsId}')">
                        <span class="text-gray-300 font-semibold">📊 Classifiche ${compInfo.name}</span>
                        <span id="icon-${rankingsId}" class="text-gray-400 text-xl transform transition-transform">▼</span>
                    </button>

                    <!-- Classifiche (collassate di default) -->
                    <div id="${rankingsId}" class="hidden">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                            <!-- Capocannoniere -->
                            ${this.renderRankingCard('Capocannoniere', topScorers, 'goals', 'bg-gradient-to-br from-yellow-900 to-amber-800', 'border-yellow-500', getLogoHtml)}

                            <!-- Miglior Assistman -->
                            ${this.renderRankingCard('Miglior Assistman', topAssisters, 'assists', 'bg-gradient-to-br from-blue-900 to-indigo-800', 'border-blue-500', getLogoHtml)}

                            <!-- Portiere Imbattuto -->
                            ${this.renderRankingCard('Portiere Imbattuto', topCleanSheets, 'cleanSheets', 'bg-gradient-to-br from-green-900 to-emerald-800', 'border-green-500', getLogoHtml)}
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('PlayerSeasonStatsUI: Errore caricamento:', error);
            container.innerHTML = `
                <div class="text-center p-4 text-red-400">
                    Errore nel caricamento delle statistiche stagionali.
                </div>
            `;
        }
    },

    /**
     * Resetta le statistiche stagionali (solo admin).
     * @param {string} competition - Competizione (campionato, coppa, supercoppa)
     */
    async resetSeasonStats(competition = 'campionato') {
        const compInfo = this.COMPETITION_INFO[competition] || this.COMPETITION_INFO.campionato;

        if (!confirm(`Sei sicuro di voler resettare le statistiche ${compInfo.name}?\n\nGoal, assist e clean sheets torneranno a 0.`)) {
            return;
        }

        try {
            await window.PlayerSeasonStats.resetSeasonStats([], competition);
            if (window.Toast) {
                window.Toast.success(`Statistiche ${compInfo.name} resettate!`);
            } else {
                alert(`Statistiche ${compInfo.name} resettate!`);
            }
            // Ricarica il pannello
            const container = document.getElementById('season-individual-stats-container');
            if (container) {
                this.renderStatsPanel('season-individual-stats-container', competition);
            }
        } catch (error) {
            console.error('Errore reset stats:', error);
            alert('Errore: ' + error.message);
        }
    },

    renderSeasonSummary(summary, competition = 'campionato') {
        if (!summary) return '';

        const compInfo = this.COMPETITION_INFO[competition] || this.COMPETITION_INFO.campionato;

        const topScorerText = summary.topScorer
            ? `${summary.topScorer.playerName} (${summary.topScorer.goals} gol)`
            : 'Nessuno';

        const topAssisterText = summary.topAssister
            ? `${summary.topAssister.playerName} (${summary.topAssister.assists} assist)`
            : 'Nessuno';

        const topGKText = summary.topCleanSheet
            ? `${summary.topCleanSheet.playerName} (${summary.topCleanSheet.cleanSheets} CS)`
            : 'Nessuno';

        // Mostra pulsante reset solo per admin
        const currentTeamData = window.InterfacciaCore?.currentTeamData;
        const isAdmin = window.isTeamAdmin?.(currentTeamData?.teamName, currentTeamData) || false;
        const resetButtonHtml = isAdmin ? `
            <button onclick="window.PlayerSeasonStatsUI.resetSeasonStats('${competition}')"
                    class="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition"
                    title="Resetta statistiche ${compInfo.name}">
                🔄 Reset
            </button>
        ` : '';

        return `
            <div class="p-4 bg-gradient-to-r from-${compInfo.color}-900 to-${compInfo.color}-800 rounded-lg border-2 border-${compInfo.color}-500 shadow-lg">
                <h3 class="text-xl font-bold text-${compInfo.color}-300 mb-4 flex items-center">
                    <span class="mr-2">${compInfo.icon}</span> Premi ${compInfo.name}
                    ${resetButtonHtml}
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-black bg-opacity-30 rounded-lg p-3 text-center">
                        <p class="text-3xl font-bold text-yellow-400">${summary.totalGoals || 0}</p>
                        <p class="text-xs text-gray-400">Goal Totali</p>
                    </div>
                    <div class="bg-black bg-opacity-30 rounded-lg p-3 text-center">
                        <p class="text-3xl font-bold text-blue-400">${summary.totalAssists || 0}</p>
                        <p class="text-xs text-gray-400">Assist Totali</p>
                    </div>
                    <div class="bg-black bg-opacity-30 rounded-lg p-3 text-center">
                        <p class="text-3xl font-bold text-green-400">${summary.totalCleanSheets || 0}</p>
                        <p class="text-xs text-gray-400">Clean Sheets</p>
                    </div>
                    <div class="bg-black bg-opacity-30 rounded-lg p-3 text-center">
                        <p class="text-3xl font-bold text-white">${summary.totalPlayersWithStats || 0}</p>
                        <p class="text-xs text-gray-400">Giocatori Attivi</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div class="bg-black bg-opacity-20 rounded-lg p-2 text-center">
                        <p class="text-xs text-gray-400">Top Marcatore</p>
                        <p class="text-sm text-yellow-300 font-bold">${topScorerText}</p>
                    </div>
                    <div class="bg-black bg-opacity-20 rounded-lg p-2 text-center">
                        <p class="text-xs text-gray-400">Top Assistman</p>
                        <p class="text-sm text-blue-300 font-bold">${topAssisterText}</p>
                    </div>
                    <div class="bg-black bg-opacity-20 rounded-lg p-2 text-center">
                        <p class="text-xs text-gray-400">Top Portiere</p>
                        <p class="text-sm text-green-300 font-bold">${topGKText}</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza una card di classifica (accordion minimizzato di default).
     */
    renderRankingCard(title, players, statKey, bgClass, borderClass, getLogoHtml) {
        const emoji = statKey === 'goals' ? '⚽' : (statKey === 'assists' ? '🎯' : '🧤');
        const statLabel = statKey === 'goals' ? 'Gol' : (statKey === 'assists' ? 'Assist' : 'CS');
        const accordionId = `ranking-accordion-${statKey}`;

        // Mostra il leader nel titolo quando chiuso
        let leaderText = '';
        if (players && players.length > 0) {
            leaderText = `${players[0].playerName} (${players[0][statKey]})`;
        }

        let rowsHtml = '';

        if (!players || players.length === 0) {
            rowsHtml = `
                <tr>
                    <td colspan="4" class="py-4 text-center text-gray-500 text-sm">
                        Nessun dato disponibile
                    </td>
                </tr>
            `;
        } else {
            players.forEach((player, index) => {
                const position = index + 1;
                const positionClass = position === 1 ? 'text-yellow-400 font-bold' :
                                     position === 2 ? 'text-gray-300 font-semibold' :
                                     position === 3 ? 'text-orange-400 font-semibold' : 'text-gray-400';

                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;

                rowsHtml += `
                    <tr class="border-b border-gray-700 hover:bg-black hover:bg-opacity-20 transition">
                        <td class="py-2 px-2 ${positionClass} text-center">${medal}</td>
                        <td class="py-2 px-2">
                            <div class="flex items-center">
                                ${getLogoHtml(player.teamId)}
                                <span class="text-white text-sm font-medium ml-1">${player.playerName}</span>
                            </div>
                            <span class="text-xs text-gray-500">${player.teamName || ''}</span>
                        </td>
                        <td class="py-2 px-2 text-center">
                            <span class="px-2 py-1 rounded text-xs ${this.getRoleBadgeClass(player.role)}">${player.role}</span>
                        </td>
                        <td class="py-2 px-2 text-center text-xl font-bold text-white">${player[statKey]}</td>
                    </tr>
                `;
            });
        }

        return `
            <div class="${bgClass} rounded-lg border-2 ${borderClass} shadow-lg overflow-hidden">
                <div class="p-3 cursor-pointer select-none hover:bg-black hover:bg-opacity-20 transition"
                     onclick="window.PlayerSeasonStatsUI.toggleAccordion('${accordionId}')">
                    <h4 class="text-lg font-bold text-white flex items-center justify-between">
                        <span class="flex items-center">
                            <span class="mr-2">${emoji}</span> ${title}
                            ${leaderText ? `<span class="ml-2 text-sm font-normal text-gray-400">- ${leaderText}</span>` : ''}
                        </span>
                        <span id="${accordionId}-icon" class="text-gray-400 transition-transform">▼</span>
                    </h4>
                </div>
                <div id="${accordionId}" class="hidden overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-black bg-opacity-30">
                            <tr>
                                <th class="py-2 px-2 text-xs text-gray-400 text-center">#</th>
                                <th class="py-2 px-2 text-xs text-gray-400 text-left">Giocatore</th>
                                <th class="py-2 px-2 text-xs text-gray-400 text-center">Ruolo</th>
                                <th class="py-2 px-2 text-xs text-gray-400 text-center">${statLabel}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    /**
     * Toggle dell'accordion per le classifiche individuali.
     */
    toggleAccordion(accordionId) {
        const content = document.getElementById(accordionId);
        const icon = document.getElementById(`${accordionId}-icon`);

        if (content && icon) {
            const isHidden = content.classList.contains('hidden');

            if (isHidden) {
                content.classList.remove('hidden');
                icon.textContent = '▲';
                icon.style.transform = 'rotate(180deg)';
            } else {
                content.classList.add('hidden');
                icon.textContent = '▼';
                icon.style.transform = 'rotate(0deg)';
            }
        }
    },

    /**
     * Restituisce la classe CSS per il badge del ruolo.
     */
    getRoleBadgeClass(role) {
        switch (role) {
            case 'P': return 'bg-yellow-600 text-yellow-100';
            case 'D': return 'bg-blue-600 text-blue-100';
            case 'C': return 'bg-green-600 text-green-100';
            case 'A': return 'bg-red-600 text-red-100';
            default: return 'bg-gray-600 text-gray-100';
        }
    },

    /**
     * Renderizza un widget compatto delle statistiche per la dashboard.
     * @returns {string} HTML del widget
     */
    async renderCompactWidget() {
        try {
            const summary = await window.PlayerSeasonStats.getSeasonSummary();

            if (!summary || !summary.topScorer) {
                return `
                    <div class="p-3 bg-gray-800 rounded-lg border border-gray-700 text-center">
                        <p class="text-gray-500 text-sm">Nessuna statistica disponibile</p>
                    </div>
                `;
            }

            const topScorerText = summary.topScorer
                ? `${summary.topScorer.playerName} (${summary.topScorer.goals})`
                : '-';
            const topAssisterText = summary.topAssister
                ? `${summary.topAssister.playerName} (${summary.topAssister.assists})`
                : '-';

            return `
                <div class="p-3 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-purple-600">
                    <h5 class="text-sm font-bold text-purple-400 mb-2">🏅 Top Stagione</h5>
                    <div class="space-y-1 text-xs">
                        <div class="flex justify-between">
                            <span class="text-gray-400">⚽ Capocannoniere:</span>
                            <span class="text-yellow-400 font-semibold">${topScorerText}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">🎯 Assistman:</span>
                            <span class="text-blue-400 font-semibold">${topAssisterText}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">📊 Goal totali:</span>
                            <span class="text-white font-semibold">${summary.totalGoals || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('PlayerSeasonStatsUI: Errore widget compatto:', error);
            return '';
        }
    }
};

console.log("PlayerSeasonStatsUI.js caricato - UI statistiche stagionali");
