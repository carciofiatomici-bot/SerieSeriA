//
// ====================================================================
// PLAYER-STATS-ADVANCED.JS - Statistiche Avanzate Giocatori (Semplificato)
// ====================================================================
//
// Mostra solo: Partite, Goal, Assist, Blocchi, Voto
//

window.PlayerStatsAdvanced = {
    panel: null,
    isOpen: false,
    statsCache: new Map(),

    /**
     * Inizializza il modulo
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('playerStats')) {
            console.log("Statistiche Avanzate disabilitate");
            return;
        }

        this.createPanel();
        console.log("PlayerStatsAdvanced inizializzato");
    },

    /**
     * Crea il pannello statistiche
     */
    createPanel() {
        const existing = document.getElementById('player-stats-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'player-stats-panel';
        this.panel.className = 'fixed inset-0 z-[9999] bg-black bg-opacity-80 flex items-center justify-center hidden';

        this.panel.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-600 w-full max-w-md max-h-[90vh] overflow-hidden m-4">
                <div class="p-4 bg-gray-700 border-b border-gray-600 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <span>📊</span>
                        <span id="stats-player-name">Statistiche</span>
                    </h2>
                    <button id="close-stats-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="stats-content" class="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);

        document.getElementById('close-stats-panel').addEventListener('click', () => this.close());
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) this.close();
        });
    },

    /**
     * Apre il pannello statistiche per un giocatore
     */
    async open(player, teamId = null) {
        if (!window.FeatureFlags?.isEnabled('playerStats')) {
            if (window.Toast) window.Toast.info("Statistiche avanzate non disponibili");
            return;
        }

        if (!this.panel) this.createPanel();

        document.getElementById('stats-player-name').textContent = player.name || 'Giocatore';

        const content = document.getElementById('stats-content');
        content.innerHTML = `
            <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
            </div>
        `;

        this.panel.classList.remove('hidden');
        this.isOpen = true;

        const stats = await this.loadPlayerStats(player, teamId);
        this.renderStats(player, stats);
    },

    /**
     * Chiude il pannello
     */
    close() {
        if (this.panel) this.panel.classList.add('hidden');
        this.isOpen = false;
    },

    /**
     * Carica statistiche giocatore da Firestore
     */
    async loadPlayerStats(player, teamId) {
        const cacheKey = `${player.id || player.name}_${teamId}`;

        if (this.statsCache.has(cacheKey)) {
            return this.statsCache.get(cacheKey);
        }

        let stats = null;

        if (teamId && player.id && window.firestoreTools) {
            try {
                const { doc, getDoc } = window.firestoreTools;
                const db = window.db;
                const appId = window.firestoreTools.appId;

                const statsPath = `artifacts/${appId}/public/data/teams/${teamId}/playerStats/${player.id}`;
                const statsDoc = await getDoc(doc(db, statsPath));

                if (statsDoc.exists()) {
                    const data = statsDoc.data();
                    stats = {
                        matchesPlayed: data.matchesPlayed || 0,
                        goalsScored: data.goalsScored || 0,
                        assists: data.assists || 0,
                        blocks: data.blocks || data.interceptions || 0,
                        avgPerformance: data.avgPerformance || 0,
                        // Extra per storico
                        matchHistory: data.matchHistory || []
                    };
                    console.log(`[PlayerStatsAdvanced] Stats caricate per ${player.name}`);
                }
            } catch (error) {
                console.error('[PlayerStatsAdvanced] Errore caricamento:', error);
            }
        }

        if (!stats) {
            stats = {
                matchesPlayed: 0,
                goalsScored: 0,
                assists: 0,
                blocks: 0,
                avgPerformance: 0,
                matchHistory: []
            };
        }

        this.statsCache.set(cacheKey, stats);
        return stats;
    },

    /**
     * Renderizza le statistiche
     */
    renderStats(player, stats) {
        const content = document.getElementById('stats-content');
        const role = player.role || player.ruolo || 'C';
        const type = player.type || player.tipo || 'Tecnica';
        const level = player.level || player.livello || 15;

        const roleEmoji = { 'P': '🧤', 'D': '🛡️', 'C': '⚙️', 'A': '⚡' }[role] || '⚽';
        const roleName = { 'P': 'Portiere', 'D': 'Difensore', 'C': 'Centrocampista', 'A': 'Attaccante' }[role] || role;
        const typeColor = { 'Potenza': 'red', 'Tecnica': 'blue', 'Velocita': 'yellow' }[type] || 'gray';

        const rating = stats.avgPerformance > 0 ? stats.avgPerformance.toFixed(1) : '-';
        const ratingColor = stats.avgPerformance >= 7 ? 'text-green-400' :
                           stats.avgPerformance >= 5 ? 'text-yellow-400' :
                           stats.avgPerformance > 0 ? 'text-red-400' : 'text-gray-400';

        content.innerHTML = `
            <!-- Header Giocatore -->
            <div class="bg-gray-700 rounded-xl p-4 mb-4 flex items-center gap-4">
                <div class="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center text-3xl">
                    ${roleEmoji}
                </div>
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-white">${player.name || 'Giocatore'}</h3>
                    <div class="flex gap-2 mt-2 flex-wrap">
                        <span class="px-2 py-0.5 bg-gray-600 rounded text-xs">${roleName}</span>
                        <span class="px-2 py-0.5 bg-${typeColor}-600 rounded text-xs">${type}</span>
                        <span class="px-2 py-0.5 bg-green-600 rounded text-xs">Lv.${level}</span>
                    </div>
                </div>
            </div>

            <!-- Statistiche Principali -->
            <div class="grid grid-cols-2 gap-3 mb-4">
                <!-- Partite -->
                <div class="bg-gray-700 rounded-xl p-4 text-center">
                    <div class="text-2xl mb-1">🎮</div>
                    <div class="text-3xl font-bold text-white">${stats.matchesPlayed}</div>
                    <div class="text-gray-400 text-sm">Partite</div>
                </div>

                <!-- Voto Medio -->
                <div class="bg-gray-700 rounded-xl p-4 text-center">
                    <div class="text-2xl mb-1">⭐</div>
                    <div class="text-3xl font-bold ${ratingColor}">${rating}</div>
                    <div class="text-gray-400 text-sm">Voto Medio</div>
                </div>

                <!-- Goal -->
                <div class="bg-gray-700 rounded-xl p-4 text-center">
                    <div class="text-2xl mb-1">⚽</div>
                    <div class="text-3xl font-bold text-green-400">${stats.goalsScored}</div>
                    <div class="text-gray-400 text-sm">Goal</div>
                </div>

                <!-- Assist -->
                <div class="bg-gray-700 rounded-xl p-4 text-center">
                    <div class="text-2xl mb-1">👟</div>
                    <div class="text-3xl font-bold text-blue-400">${stats.assists}</div>
                    <div class="text-gray-400 text-sm">Assist</div>
                </div>
            </div>

            <!-- Blocchi (full width) -->
            <div class="bg-gray-700 rounded-xl p-4 text-center mb-4">
                <div class="text-2xl mb-1">🛡️</div>
                <div class="text-3xl font-bold text-orange-400">${stats.blocks}</div>
                <div class="text-gray-400 text-sm">Blocchi</div>
            </div>

            <!-- Ultime Partite -->
            ${stats.matchHistory.length > 0 ? `
                <div class="bg-gray-700 rounded-xl p-4">
                    <h4 class="font-semibold text-white mb-3 text-sm">Ultime Partite</h4>
                    <div class="space-y-2">
                        ${stats.matchHistory.slice(0, 5).map((m, i) => {
                            const matchRating = m.performance?.rating || m.rating || 0;
                            const rClass = matchRating >= 7 ? 'text-green-400' : matchRating >= 5 ? 'text-yellow-400' : 'text-red-400';
                            const goals = m.performance?.goalsScored || m.goals || 0;
                            const assists = m.performance?.assists || m.assists || 0;
                            return `
                                <div class="flex justify-between items-center text-sm bg-gray-800 rounded px-3 py-2">
                                    <span class="text-gray-300 truncate flex-1">${m.opponent?.name || m.opponent || 'Avversario'}</span>
                                    <div class="flex gap-3 items-center">
                                        ${goals > 0 ? `<span class="text-green-400">⚽${goals}</span>` : ''}
                                        ${assists > 0 ? `<span class="text-blue-400">👟${assists}</span>` : ''}
                                        <span class="font-bold ${rClass}">${matchRating.toFixed(1)}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div class="bg-gray-700 rounded-xl p-4 text-center text-gray-400 text-sm">
                    Nessuna partita registrata
                </div>
            `}
        `;
    },

    /**
     * Distruggi modulo
     */
    destroy() {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
        this.statsCache.clear();
    }
};

// Init quando feature flags sono pronti
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.FeatureFlags?.isEnabled('playerStats')) {
            window.PlayerStatsAdvanced.init();
        }
    }, 1000);
});

console.log("Modulo PlayerStatsAdvanced caricato (versione semplificata).");
