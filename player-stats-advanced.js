//
// ====================================================================
// PLAYER-STATS-ADVANCED.JS - Statistiche Avanzate Giocatori
// ====================================================================
// Premium Sports Card Design - Mobile First
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

        this.injectStyles();
        this.createPanel();
        console.log("PlayerStatsAdvanced inizializzato");
    },

    /**
     * Inietta stili custom
     */
    injectStyles() {
        if (document.getElementById('player-stats-styles')) return;

        const style = document.createElement('style');
        style.id = 'player-stats-styles';
        style.textContent = `
            /* Premium Card Container */
            #player-stats-panel .stats-card {
                background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
                border: 2px solid transparent;
                background-clip: padding-box;
                position: relative;
            }
            #player-stats-panel .stats-card::before {
                content: '';
                position: absolute;
                inset: -2px;
                background: linear-gradient(135deg, #22c55e 0%, #059669 25%, #0d9488 50%, #0891b2 75%, #22c55e 100%);
                border-radius: inherit;
                z-index: -1;
                animation: borderGlow 3s linear infinite;
                background-size: 300% 300%;
            }
            @keyframes borderGlow {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }

            /* Player Avatar Ring */
            #player-stats-panel .avatar-ring {
                background: conic-gradient(from 0deg, #22c55e, #0d9488, #0891b2, #22c55e);
                padding: 3px;
                animation: ringRotate 4s linear infinite;
            }
            @keyframes ringRotate {
                to { transform: rotate(360deg); }
            }

            /* Stat Hexagon Badge */
            #player-stats-panel .hex-stat {
                clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                background: linear-gradient(180deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.05) 100%);
                border: 1px solid rgba(34,197,94,0.3);
                transition: all 0.3s ease;
            }
            #player-stats-panel .hex-stat:hover {
                background: linear-gradient(180deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0.1) 100%);
                transform: scale(1.05);
            }

            /* Animated Counter */
            #player-stats-panel .stat-value {
                font-variant-numeric: tabular-nums;
                text-shadow: 0 0 20px currentColor;
            }

            /* Match Timeline */
            #player-stats-panel .match-item {
                position: relative;
                padding-left: 1.5rem;
            }
            #player-stats-panel .match-item::before {
                content: '';
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #22c55e;
                box-shadow: 0 0 8px #22c55e;
            }
            #player-stats-panel .match-item::after {
                content: '';
                position: absolute;
                left: 3px;
                top: calc(50% + 10px);
                width: 2px;
                height: calc(100% + 4px);
                background: linear-gradient(to bottom, rgba(34,197,94,0.5), transparent);
            }
            #player-stats-panel .match-item:last-child::after {
                display: none;
            }

            /* Rating Badge */
            #player-stats-panel .rating-badge {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                box-shadow: 0 4px 15px rgba(251,191,36,0.4);
            }

            /* Glassmorphism Cards */
            #player-stats-panel .glass-card {
                background: rgba(30, 41, 59, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
            }

            /* Entrance Animations */
            #player-stats-panel .animate-slide-up {
                animation: slideUp 0.4s ease-out forwards;
                opacity: 0;
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Stagger children */
            #player-stats-panel .stagger-1 { animation-delay: 0.05s; }
            #player-stats-panel .stagger-2 { animation-delay: 0.1s; }
            #player-stats-panel .stagger-3 { animation-delay: 0.15s; }
            #player-stats-panel .stagger-4 { animation-delay: 0.2s; }
            #player-stats-panel .stagger-5 { animation-delay: 0.25s; }

            /* Mobile Optimizations */
            @media (max-width: 640px) {
                #player-stats-panel .stats-card {
                    margin: 0;
                    border-radius: 0;
                    max-height: 100vh;
                    height: 100%;
                }
                #player-stats-panel .stats-card::before {
                    border-radius: 0;
                }
            }

            /* Pulse effect for main stat */
            #player-stats-panel .pulse-glow {
                animation: pulseGlow 2s ease-in-out infinite;
            }
            @keyframes pulseGlow {
                0%, 100% { box-shadow: 0 0 5px rgba(34,197,94,0.5); }
                50% { box-shadow: 0 0 20px rgba(34,197,94,0.8), 0 0 40px rgba(34,197,94,0.4); }
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Crea il pannello statistiche
     */
    createPanel() {
        const existing = document.getElementById('player-stats-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'player-stats-panel';
        this.panel.className = 'fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center hidden';

        this.panel.innerHTML = `
            <div class="stats-card rounded-2xl w-full max-w-md max-h-[92vh] sm:max-h-[85vh] overflow-hidden sm:m-4 flex flex-col">
                <!-- Sticky Header -->
                <div class="sticky top-0 z-10 px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-green-500/20 flex justify-between items-center">
                    <h2 class="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                        <span class="text-green-400">◆</span>
                        <span id="stats-player-name" class="truncate">Statistiche</span>
                    </h2>
                    <button id="close-stats-panel" class="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all text-xl font-bold">✕</button>
                </div>
                <div id="stats-content" class="flex-1 overflow-y-auto overscroll-contain">
                    <!-- Content loads here -->
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
            <div class="flex items-center justify-center py-16">
                <div class="relative">
                    <div class="w-12 h-12 border-3 border-green-500/30 border-t-green-400 rounded-full animate-spin"></div>
                    <div class="absolute inset-2 w-8 h-8 border-2 border-teal-500/30 border-b-teal-400 rounded-full animate-spin" style="animation-direction: reverse;"></div>
                </div>
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
                        matchHistory: data.matchHistory || []
                    };
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
     * Renderizza le statistiche con design premium
     */
    renderStats(player, stats) {
        const content = document.getElementById('stats-content');
        const role = player.role || player.ruolo || 'C';
        const type = player.type || player.tipo || 'Tecnica';
        const level = player.level || player.livello || 15;

        const roleEmoji = { 'P': '🧤', 'D': '🛡️', 'C': '⚙️', 'A': '⚡' }[role] || '⚽';
        const roleName = { 'P': 'POR', 'D': 'DIF', 'C': 'CEN', 'A': 'ATT' }[role] || role;
        const roleNameFull = { 'P': 'Portiere', 'D': 'Difensore', 'C': 'Centrocampista', 'A': 'Attaccante' }[role] || role;

        const typeColors = {
            'Potenza': { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', glow: 'rgba(239,68,68,0.5)' },
            'Tecnica': { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', glow: 'rgba(59,130,246,0.5)' },
            'Velocita': { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', glow: 'rgba(234,179,8,0.5)' }
        };
        const tc = typeColors[type] || typeColors['Tecnica'];

        const rating = stats.avgPerformance > 0 ? stats.avgPerformance.toFixed(1) : '-';
        const ratingNum = stats.avgPerformance || 0;
        const ratingClass = ratingNum >= 7 ? 'from-green-400 to-emerald-500' :
                           ratingNum >= 5 ? 'from-yellow-400 to-amber-500' :
                           ratingNum > 0 ? 'from-red-400 to-rose-500' : 'from-gray-400 to-gray-500';

        content.innerHTML = `
            <div class="p-4 space-y-4">
                <!-- Player Card Header -->
                <div class="animate-slide-up stagger-1 glass-card rounded-xl p-4 relative overflow-hidden">
                    <!-- Background Pattern -->
                    <div class="absolute inset-0 opacity-5">
                        <div class="absolute inset-0" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px);"></div>
                    </div>

                    <div class="relative flex items-center gap-4">
                        <!-- Avatar with animated ring -->
                        <div class="avatar-ring rounded-full flex-shrink-0">
                            <div class="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl">
                                ${roleEmoji}
                            </div>
                        </div>

                        <!-- Player Info -->
                        <div class="flex-1 min-w-0">
                            <h3 class="text-xl font-black text-white tracking-tight truncate">${player.name || 'Giocatore'}</h3>
                            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span class="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300 uppercase tracking-wider">${roleNameFull}</span>
                                <span class="px-2 py-0.5 rounded text-xs font-bold ${tc.bg} ${tc.text} border ${tc.border}">${type}</span>
                                <span class="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">LV.${level}</span>
                            </div>
                        </div>

                        <!-- Rating Badge -->
                        <div class="flex-shrink-0">
                            <div class="rating-badge w-14 h-14 rounded-xl flex flex-col items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
                                <span class="text-xl font-black text-slate-900 leading-none">${rating}</span>
                                <span class="text-[8px] font-bold text-slate-700 uppercase tracking-wider">Media</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Grid - 5 Hexagonal Badges -->
                <div class="animate-slide-up stagger-2">
                    <div class="grid grid-cols-5 gap-2">
                        ${this.renderHexStat('🎮', stats.matchesPlayed, 'Partite', 'text-white')}
                        ${this.renderHexStat('⚽', stats.goalsScored, 'Goal', 'text-green-400')}
                        ${this.renderHexStat('👟', stats.assists, 'Assist', 'text-blue-400')}
                        ${this.renderHexStat('🛡️', stats.blocks, 'Blocchi', 'text-orange-400')}
                        ${this.renderHexStat('⭐', rating, 'Voto', ratingNum >= 7 ? 'text-green-400' : ratingNum >= 5 ? 'text-yellow-400' : 'text-gray-400')}
                    </div>
                </div>

                <!-- Contribution Bar -->
                <div class="animate-slide-up stagger-3 glass-card rounded-xl p-3">
                    <div class="flex items-center justify-between text-xs mb-2">
                        <span class="text-slate-400 font-medium">Contributi Offensivi</span>
                        <span class="text-green-400 font-bold">${stats.goalsScored + stats.assists} G+A</span>
                    </div>
                    <div class="h-2 bg-slate-700 rounded-full overflow-hidden flex">
                        ${stats.matchesPlayed > 0 ? `
                            <div class="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-1000"
                                 style="width: ${Math.min(100, (stats.goalsScored / Math.max(stats.matchesPlayed, 1)) * 100)}%"></div>
                            <div class="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-1000"
                                 style="width: ${Math.min(100 - (stats.goalsScored / Math.max(stats.matchesPlayed, 1)) * 100, (stats.assists / Math.max(stats.matchesPlayed, 1)) * 100)}%"></div>
                        ` : '<div class="w-0"></div>'}
                    </div>
                    <div class="flex justify-between mt-1.5 text-[10px] text-slate-500">
                        <span>⚽ ${(stats.goalsScored / Math.max(stats.matchesPlayed, 1)).toFixed(2)}/partita</span>
                        <span>👟 ${(stats.assists / Math.max(stats.matchesPlayed, 1)).toFixed(2)}/partita</span>
                    </div>
                </div>

                <!-- Match History Timeline -->
                <div class="animate-slide-up stagger-4 glass-card rounded-xl p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-sm font-bold text-white flex items-center gap-2">
                            <span class="text-green-400">▸</span> Ultime Partite
                        </h4>
                        ${stats.matchHistory.length > 0 ? `<span class="text-xs text-slate-500">${Math.min(5, stats.matchHistory.length)} di ${stats.matchHistory.length}</span>` : ''}
                    </div>

                    ${stats.matchHistory.length > 0 ? `
                        <div class="space-y-2">
                            ${stats.matchHistory.slice(0, 5).map((m, i) => {
                                const matchRating = m.performance?.rating || m.rating || 0;
                                const rClass = matchRating >= 7 ? 'bg-green-500' : matchRating >= 5 ? 'bg-yellow-500' : 'bg-red-500';
                                const goals = m.performance?.goalsScored || m.goals || 0;
                                const assists = m.performance?.assists || m.assists || 0;
                                const outcome = m.result?.outcome;
                                const outcomeIcon = outcome === 'win' ? '🏆' : outcome === 'loss' ? '💔' : '🤝';

                                return `
                                    <div class="match-item animate-slide-up stagger-${i + 1}">
                                        <div class="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 ml-2 border-l-2 ${matchRating >= 7 ? 'border-green-500' : matchRating >= 5 ? 'border-yellow-500' : 'border-red-500'}">
                                            <div class="flex items-center gap-2 flex-1 min-w-0">
                                                <span class="text-sm">${outcomeIcon}</span>
                                                <span class="text-slate-300 text-sm truncate">${m.opponent?.name || m.opponent || 'Avversario'}</span>
                                            </div>
                                            <div class="flex items-center gap-2 flex-shrink-0">
                                                ${goals > 0 ? `<span class="text-green-400 text-xs font-bold">⚽${goals}</span>` : ''}
                                                ${assists > 0 ? `<span class="text-blue-400 text-xs font-bold">👟${assists}</span>` : ''}
                                                <div class="w-8 h-6 rounded ${rClass} flex items-center justify-center">
                                                    <span class="text-xs font-black text-white">${matchRating.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-6">
                            <div class="text-3xl mb-2 opacity-30">📋</div>
                            <p class="text-slate-500 text-sm">Nessuna partita registrata</p>
                        </div>
                    `}
                </div>

                <!-- Footer Spacer for mobile -->
                <div class="h-4 sm:hidden"></div>
            </div>
        `;
    },

    /**
     * Renderizza un badge esagonale per le stat
     */
    renderHexStat(icon, value, label, colorClass) {
        return `
            <div class="flex flex-col items-center">
                <div class="hex-stat w-14 h-16 flex flex-col items-center justify-center pulse-glow">
                    <span class="text-sm mb-0.5">${icon}</span>
                    <span class="stat-value text-lg font-black ${colorClass}">${value}</span>
                </div>
                <span class="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-medium">${label}</span>
            </div>
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

console.log("Modulo PlayerStatsAdvanced caricato (Premium Card Design).");
