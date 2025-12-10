//
// ====================================================================
// PLAYER-STATS-ADVANCED.JS - Statistiche Avanzate Giocatori
// ====================================================================
//

window.PlayerStatsAdvanced = {
    // Container per il pannello
    panel: null,
    isOpen: false,

    // Cache statistiche
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
        this.setupListeners();
        console.log("PlayerStatsAdvanced inizializzato");
    },

    /**
     * Crea il pannello statistiche
     */
    createPanel() {
        // Rimuovi se esiste
        const existing = document.getElementById('player-stats-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'player-stats-panel';
        this.panel.className = `
            fixed inset-0 z-[9999] bg-black bg-opacity-80
            flex items-center justify-center
            hidden
        `.replace(/\s+/g, ' ').trim();

        this.panel.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-600 w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
                <div class="p-4 bg-gray-700 border-b border-gray-600 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <span>📊</span>
                        <span id="stats-player-name">Statistiche Giocatore</span>
                    </h2>
                    <button id="close-stats-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="stats-content" class="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                    <!-- Contenuto dinamico -->
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);

        // Event listener chiusura
        document.getElementById('close-stats-panel').addEventListener('click', () => this.close());
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) this.close();
        });
    },

    /**
     * Setup event listeners
     */
    setupListeners() {
        // Ascolta cambio feature flag
        document.addEventListener('featureFlagChanged', (e) => {
            if (e.detail?.flagId === 'playerStats') {
                if (e.detail.enabled) {
                    this.init();
                } else {
                    this.destroy();
                }
            }
        });
    },

    /**
     * Apre il pannello statistiche per un giocatore
     * @param {Object} player - Dati giocatore
     * @param {string} teamId - ID squadra (opzionale)
     */
    async open(player, teamId = null) {
        if (!window.FeatureFlags?.isEnabled('playerStats')) {
            if (window.Toast) {
                window.Toast.info("Statistiche avanzate non disponibili");
            }
            return;
        }

        if (!this.panel) this.createPanel();

        // Aggiorna titolo
        document.getElementById('stats-player-name').textContent = player.name || 'Giocatore';

        // Mostra loading
        const content = document.getElementById('stats-content');
        content.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
            </div>
        `;

        this.panel.classList.remove('hidden');
        this.isOpen = true;

        // Carica statistiche
        const stats = await this.loadPlayerStats(player, teamId);
        this.renderStats(player, stats);
    },

    /**
     * Chiude il pannello
     */
    close() {
        if (this.panel) {
            this.panel.classList.add('hidden');
        }
        this.isOpen = false;
    },

    /**
     * Carica statistiche giocatore
     */
    async loadPlayerStats(player, teamId) {
        const cacheKey = `${player.id || player.name}_${teamId}`;

        // Controlla cache
        if (this.statsCache.has(cacheKey)) {
            return this.statsCache.get(cacheKey);
        }

        // Genera statistiche simulate (in produzione caricheresti da Firestore)
        const stats = this.generateMockStats(player);

        // Salva in cache
        this.statsCache.set(cacheKey, stats);

        return stats;
    },

    /**
     * Genera statistiche mock per demo
     */
    generateMockStats(player) {
        const level = player.level || player.livello || 15;
        const role = player.role || player.ruolo || 'C';

        // Base stats modificate dal livello
        const levelMod = level / 15;

        // Statistiche per ruolo
        const roleStats = {
            'P': { saves: 0.7, goals: 0.01, assists: 0.02 },
            'D': { saves: 0, goals: 0.05, assists: 0.1 },
            'C': { saves: 0, goals: 0.15, assists: 0.2 },
            'A': { saves: 0, goals: 0.35, assists: 0.15 }
        };

        const rs = roleStats[role] || roleStats['C'];
        const matchesPlayed = Math.floor(Math.random() * 20) + 5;

        return {
            // Statistiche generali
            general: {
                matchesPlayed,
                minutesPlayed: matchesPlayed * (80 + Math.floor(Math.random() * 20)),
                rating: (5 + Math.random() * 4 * levelMod).toFixed(1)
            },

            // Statistiche offensive
            offensive: {
                goals: Math.floor(matchesPlayed * rs.goals * levelMod * (0.5 + Math.random())),
                assists: Math.floor(matchesPlayed * rs.assists * levelMod * (0.5 + Math.random())),
                shots: Math.floor(matchesPlayed * (role === 'A' ? 3 : role === 'C' ? 2 : 0.5) * levelMod),
                shotsOnTarget: Math.floor(matchesPlayed * (role === 'A' ? 1.5 : role === 'C' ? 1 : 0.2) * levelMod),
                keyPasses: Math.floor(matchesPlayed * 1.5 * levelMod)
            },

            // Statistiche difensive
            defensive: {
                tackles: Math.floor(matchesPlayed * (role === 'D' ? 4 : role === 'C' ? 2 : 0.5) * levelMod),
                interceptions: Math.floor(matchesPlayed * (role === 'D' ? 3 : role === 'C' ? 1.5 : 0.3) * levelMod),
                blocks: Math.floor(matchesPlayed * (role === 'D' ? 2 : 0.5) * levelMod),
                clearances: Math.floor(matchesPlayed * (role === 'D' ? 5 : role === 'P' ? 2 : 0.5) * levelMod),
                saves: role === 'P' ? Math.floor(matchesPlayed * 4 * levelMod) : 0
            },

            // Statistiche passaggi
            passing: {
                totalPasses: Math.floor(matchesPlayed * 30 * levelMod),
                passAccuracy: (70 + Math.random() * 20 * levelMod).toFixed(0),
                longPasses: Math.floor(matchesPlayed * 5 * levelMod),
                throughBalls: Math.floor(matchesPlayed * (role === 'C' || role === 'A' ? 2 : 0.5) * levelMod)
            },

            // Statistiche disciplinari
            discipline: {
                yellowCards: Math.floor(matchesPlayed * 0.15),
                redCards: Math.floor(matchesPlayed * 0.02),
                fouls: Math.floor(matchesPlayed * 1.5),
                offsides: role === 'A' ? Math.floor(matchesPlayed * 0.8) : 0
            },

            // Storico prestazioni (ultime 10 partite)
            history: this.generateMatchHistory(10, levelMod)
        };
    },

    /**
     * Genera storico partite
     */
    generateMatchHistory(count, levelMod) {
        const history = [];
        for (let i = 0; i < count; i++) {
            history.push({
                matchday: count - i,
                opponent: `Squadra ${String.fromCharCode(65 + Math.floor(Math.random() * 10))}`,
                rating: (5 + Math.random() * 4 * levelMod).toFixed(1),
                goals: Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0,
                assists: Math.random() > 0.8 ? 1 : 0,
                minutesPlayed: 60 + Math.floor(Math.random() * 30)
            });
        }
        return history;
    },

    /**
     * Renderizza le statistiche
     */
    renderStats(player, stats) {
        const content = document.getElementById('stats-content');
        const role = player.role || player.ruolo || 'C';
        const type = player.type || player.tipo || 'Tecnica';
        const level = player.level || player.livello || 15;

        content.innerHTML = `
            <!-- Header Giocatore -->
            <div class="bg-gray-700 rounded-xl p-4 mb-4 flex items-center gap-4">
                <div class="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center text-3xl">
                    ${this.getRoleEmoji(role)}
                </div>
                <div class="flex-1">
                    <h3 class="text-2xl font-bold text-white">${player.name || 'Giocatore'}</h3>
                    <div class="flex gap-4 mt-2">
                        <span class="px-2 py-1 bg-gray-600 rounded text-sm">${this.getRoleName(role)}</span>
                        <span class="px-2 py-1 bg-${this.getTypeColor(type)}-600 rounded text-sm">${type}</span>
                        <span class="px-2 py-1 bg-green-600 rounded text-sm">Lv. ${level}</span>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-4xl font-bold text-yellow-400">${stats.general.rating}</div>
                    <div class="text-gray-400 text-sm">Media Voto</div>
                </div>
            </div>

            <!-- Tabs Statistiche -->
            <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button class="stats-tab active px-4 py-2 bg-green-600 rounded-lg text-white font-semibold" data-tab="overview">Panoramica</button>
                <button class="stats-tab px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600" data-tab="offensive">Attacco</button>
                <button class="stats-tab px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600" data-tab="defensive">Difesa</button>
                <button class="stats-tab px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600" data-tab="passing">Passaggi</button>
                <button class="stats-tab px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600" data-tab="history">Storico</button>
            </div>

            <!-- Contenuto Tab -->
            <div id="stats-tab-content">
                ${this.renderOverviewTab(stats)}
            </div>
        `;

        // Setup tab listeners
        content.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                content.querySelectorAll('.stats-tab').forEach(t => {
                    t.classList.remove('active', 'bg-green-600');
                    t.classList.add('bg-gray-700', 'text-gray-300');
                });
                tab.classList.add('active', 'bg-green-600');
                tab.classList.remove('bg-gray-700', 'text-gray-300');

                const tabContent = document.getElementById('stats-tab-content');
                switch (tab.dataset.tab) {
                    case 'overview':
                        tabContent.innerHTML = this.renderOverviewTab(stats);
                        break;
                    case 'offensive':
                        tabContent.innerHTML = this.renderOffensiveTab(stats);
                        break;
                    case 'defensive':
                        tabContent.innerHTML = this.renderDefensiveTab(stats);
                        break;
                    case 'passing':
                        tabContent.innerHTML = this.renderPassingTab(stats);
                        break;
                    case 'history':
                        tabContent.innerHTML = this.renderHistoryTab(stats);
                        break;
                }
            });
        });
    },

    /**
     * Tab Panoramica
     */
    renderOverviewTab(stats) {
        return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                ${this.renderStatCard('Partite', stats.general.matchesPlayed, '🎮')}
                ${this.renderStatCard('Minuti', stats.general.minutesPlayed, '⏱️')}
                ${this.renderStatCard('Gol', stats.offensive.goals, '⚽')}
                ${this.renderStatCard('Assist', stats.offensive.assists, '👟')}
            </div>

            <!-- Grafico Andamento -->
            <div class="bg-gray-700 rounded-xl p-4 mb-4">
                <h4 class="font-semibold text-white mb-3">Andamento Voti</h4>
                <div class="flex items-end gap-1 h-32">
                    ${stats.history.map((m, i) => `
                        <div class="flex-1 flex flex-col items-center">
                            <div class="w-full bg-${parseFloat(m.rating) >= 6 ? 'green' : parseFloat(m.rating) >= 5 ? 'yellow' : 'red'}-500 rounded-t"
                                 style="height: ${(parseFloat(m.rating) / 10) * 100}%"
                                 title="G${m.matchday}: ${m.rating}"></div>
                            <span class="text-xs text-gray-400 mt-1">${m.matchday}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Disciplina -->
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-700 rounded-xl p-4">
                    <h4 class="font-semibold text-white mb-3">Disciplina</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Ammonizioni</span>
                            <span class="text-yellow-400 font-bold">${stats.discipline.yellowCards}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Espulsioni</span>
                            <span class="text-red-400 font-bold">${stats.discipline.redCards}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Falli</span>
                            <span class="text-white">${stats.discipline.fouls}</span>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-700 rounded-xl p-4">
                    <h4 class="font-semibold text-white mb-3">Efficienza</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Precisione pass.</span>
                            <span class="text-green-400 font-bold">${stats.passing.passAccuracy}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Tiri in porta</span>
                            <span class="text-white">${stats.offensive.shotsOnTarget}/${stats.offensive.shots}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Tab Attacco
     */
    renderOffensiveTab(stats) {
        const o = stats.offensive;
        return `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                ${this.renderStatCard('Gol', o.goals, '⚽', 'green')}
                ${this.renderStatCard('Assist', o.assists, '👟', 'blue')}
                ${this.renderStatCard('Tiri Totali', o.shots, '🎯')}
                ${this.renderStatCard('Tiri in Porta', o.shotsOnTarget, '🥅')}
                ${this.renderStatCard('Passaggi Chiave', o.keyPasses, '🔑', 'yellow')}
                ${this.renderStatCard('Fuorigioco', stats.discipline.offsides, '🚩', 'red')}
            </div>

            <div class="mt-6 bg-gray-700 rounded-xl p-4">
                <h4 class="font-semibold text-white mb-3">Efficacia Offensiva</h4>
                ${this.renderProgressBar('Conversione Tiri', o.shots > 0 ? Math.round((o.goals / o.shots) * 100) : 0, 'green')}
                ${this.renderProgressBar('Precisione Tiri', o.shots > 0 ? Math.round((o.shotsOnTarget / o.shots) * 100) : 0, 'blue')}
            </div>
        `;
    },

    /**
     * Tab Difesa
     */
    renderDefensiveTab(stats) {
        const d = stats.defensive;
        return `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                ${this.renderStatCard('Contrasti', d.tackles, '🦵', 'orange')}
                ${this.renderStatCard('Intercetti', d.interceptions, '✋', 'blue')}
                ${this.renderStatCard('Blocchi', d.blocks, '🛡️', 'purple')}
                ${this.renderStatCard('Respinte', d.clearances, '🧹', 'cyan')}
                ${d.saves > 0 ? this.renderStatCard('Parate', d.saves, '🧤', 'green') : ''}
            </div>

            <div class="mt-6 bg-gray-700 rounded-xl p-4">
                <h4 class="font-semibold text-white mb-3">Azioni Difensive per Partita</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center">
                        <div class="text-3xl font-bold text-orange-400">
                            ${(d.tackles / stats.general.matchesPlayed).toFixed(1)}
                        </div>
                        <div class="text-gray-400 text-sm">Contrasti/Partita</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-blue-400">
                            ${(d.interceptions / stats.general.matchesPlayed).toFixed(1)}
                        </div>
                        <div class="text-gray-400 text-sm">Intercetti/Partita</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Tab Passaggi
     */
    renderPassingTab(stats) {
        const p = stats.passing;
        return `
            <div class="grid grid-cols-2 md:grid-cols-2 gap-4">
                ${this.renderStatCard('Passaggi Totali', p.totalPasses, '📤')}
                ${this.renderStatCard('Precisione', p.passAccuracy + '%', '🎯', 'green')}
                ${this.renderStatCard('Lanci Lunghi', p.longPasses, '🚀', 'blue')}
                ${this.renderStatCard('Filtranti', p.throughBalls, '🔀', 'purple')}
            </div>

            <div class="mt-6 bg-gray-700 rounded-xl p-4">
                <h4 class="font-semibold text-white mb-3">Distribuzione Passaggi</h4>
                ${this.renderProgressBar('Precisione Passaggi', parseInt(p.passAccuracy), 'green')}
                <div class="mt-4 text-center">
                    <div class="text-3xl font-bold text-white">
                        ${(p.totalPasses / stats.general.matchesPlayed).toFixed(0)}
                    </div>
                    <div class="text-gray-400 text-sm">Passaggi per Partita</div>
                </div>
            </div>
        `;
    },

    /**
     * Tab Storico
     */
    renderHistoryTab(stats) {
        return `
            <div class="space-y-2">
                <div class="grid grid-cols-6 gap-2 text-xs text-gray-400 font-semibold px-2">
                    <span>Giornata</span>
                    <span>Avversario</span>
                    <span class="text-center">Voto</span>
                    <span class="text-center">Gol</span>
                    <span class="text-center">Assist</span>
                    <span class="text-center">Min</span>
                </div>
                ${stats.history.map(m => `
                    <div class="grid grid-cols-6 gap-2 bg-gray-700 rounded-lg p-2 items-center">
                        <span class="font-semibold text-white">G${m.matchday}</span>
                        <span class="text-gray-300 text-sm truncate">${m.opponent}</span>
                        <span class="text-center font-bold ${parseFloat(m.rating) >= 6 ? 'text-green-400' : parseFloat(m.rating) >= 5 ? 'text-yellow-400' : 'text-red-400'}">${m.rating}</span>
                        <span class="text-center ${m.goals > 0 ? 'text-green-400 font-bold' : 'text-gray-500'}">${m.goals || '-'}</span>
                        <span class="text-center ${m.assists > 0 ? 'text-blue-400 font-bold' : 'text-gray-500'}">${m.assists || '-'}</span>
                        <span class="text-center text-gray-400 text-sm">${m.minutesPlayed}'</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Renderizza card statistica
     */
    renderStatCard(label, value, icon, color = 'gray') {
        return `
            <div class="bg-gray-700 rounded-xl p-4 text-center">
                <div class="text-2xl mb-1">${icon}</div>
                <div class="text-2xl font-bold text-${color === 'gray' ? 'white' : color + '-400'}">${value}</div>
                <div class="text-gray-400 text-sm">${label}</div>
            </div>
        `;
    },

    /**
     * Renderizza progress bar
     */
    renderProgressBar(label, value, color = 'green') {
        return `
            <div class="mb-3">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-400">${label}</span>
                    <span class="text-${color}-400 font-bold">${value}%</span>
                </div>
                <div class="w-full bg-gray-600 rounded-full h-2">
                    <div class="bg-${color}-500 h-2 rounded-full" style="width: ${Math.min(100, value)}%"></div>
                </div>
            </div>
        `;
    },

    /**
     * Helper - Emoji ruolo
     */
    getRoleEmoji(role) {
        const emojis = { 'P': '🧤', 'D': '🛡️', 'C': '⚙️', 'A': '⚡' };
        return emojis[role] || '⚽';
    },

    /**
     * Helper - Nome ruolo
     */
    getRoleName(role) {
        const names = { 'P': 'Portiere', 'D': 'Difensore', 'C': 'Centrocampista', 'A': 'Attaccante' };
        return names[role] || role;
    },

    /**
     * Helper - Colore tipo
     */
    getTypeColor(type) {
        const colors = { 'Potenza': 'red', 'Tecnica': 'blue', 'Velocita': 'yellow' };
        return colors[type] || 'gray';
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

console.log("Modulo PlayerStatsAdvanced caricato.");
