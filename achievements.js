//
// ====================================================================
// ACHIEVEMENTS.JS - Sistema Achievements e Trofei
// ====================================================================
//

window.Achievements = {
    // UI Elements
    panel: null,
    isOpen: false,

    // Helper per localStorage sicuro (evita crash su quota exceeded)
    _safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('[Achievements] localStorage.setItem fallito:', e.message);
        }
    },

    // Achievements sbloccati
    unlockedAchievements: [],

    // Definizione achievements
    definitions: {
        // Progressione
        first_match: {
            id: 'first_match',
            name: 'Prima Partita',
            description: 'Gioca la tua prima partita di campionato',
            icon: '🎮',
            category: 'progressione',
            cssReward: 1
        },
        first_win: {
            id: 'first_win',
            name: 'Prima Vittoria',
            description: 'Vinci la tua prima partita',
            icon: '🏆',
            category: 'progressione',
            cssReward: 1
        },
        ten_matches: {
            id: 'ten_matches',
            name: 'Veterano',
            description: 'Gioca 10 partite di campionato',
            icon: '⭐',
            category: 'progressione',
            cssReward: 1
        },
        full_season: {
            id: 'full_season',
            name: 'Maratoneta',
            description: 'Completa un\'intera stagione',
            icon: '🏅',
            category: 'progressione',
            cssReward: 1
        },

        // Vittorie
        winning_streak_3: {
            id: 'winning_streak_3',
            name: 'In Serie',
            description: 'Vinci 3 partite consecutive',
            icon: '🔥',
            category: 'vittorie',
            cssReward: 1
        },
        winning_streak_5: {
            id: 'winning_streak_5',
            name: 'Inarrestabile',
            description: 'Vinci 5 partite consecutive',
            icon: '💫',
            category: 'vittorie',
            cssReward: 1
        },
        clean_sheet: {
            id: 'clean_sheet',
            name: 'Porta Inviolata',
            description: 'Vinci senza subire gol',
            icon: '🧤',
            category: 'vittorie',
            cssReward: 1
        },
        big_win: {
            id: 'big_win',
            name: 'Goleada',
            description: 'Vinci con 3 o piu\' gol di scarto',
            icon: '💥',
            category: 'vittorie',
            cssReward: 1
        },

        // Gol e Statistiche
        first_goal: {
            id: 'first_goal',
            name: 'Primo Gol',
            description: 'Segna il tuo primo gol',
            icon: '⚽',
            category: 'gol',
            cssReward: 1
        },
        ten_goals: {
            id: 'ten_goals',
            name: 'Bomber',
            description: 'Segna 10 gol in totale',
            icon: '🎯',
            category: 'gol',
            cssReward: 1
        },
        hat_trick: {
            id: 'hat_trick',
            name: 'Tripletta',
            description: 'Un giocatore segna 3 gol in una partita',
            icon: '👑',
            category: 'gol',
            cssReward: 1
        },
        top_scorer: {
            id: 'top_scorer',
            name: 'Capocannoniere',
            description: 'Diventa capocannoniere della lega',
            icon: '🥇',
            category: 'gol',
            cssReward: 1
        },

        // Rosa e Mercato
        full_squad: {
            id: 'full_squad',
            name: 'Rosa Completa',
            description: 'Completa la tua rosa di 12 giocatori',
            icon: '👥',
            category: 'rosa',
            cssReward: 1
        },
        first_purchase: {
            id: 'first_purchase',
            name: 'Primo Acquisto',
            description: 'Acquista il tuo primo giocatore dal mercato',
            icon: '💰',
            category: 'rosa',
            cssReward: 1
        },
        market_master: {
            id: 'market_master',
            name: 'Re del Mercato',
            description: 'Completa 5 acquisti dal mercato',
            icon: '🤑',
            category: 'rosa',
            cssReward: 1
        },
        high_level: {
            id: 'high_level',
            name: 'Squadra d\'Elite',
            description: 'Avere un giocatore di livello 25+',
            icon: '💎',
            category: 'rosa',
            cssReward: 1
        },

        // Classifica
        top_3: {
            id: 'top_3',
            name: 'Sul Podio',
            description: 'Raggiungi il podio in classifica',
            icon: '🏆',
            category: 'classifica',
            cssReward: 1
        },
        champion: {
            id: 'champion',
            name: 'Campione',
            description: 'Vinci il campionato',
            icon: '🏆',
            category: 'classifica',
            cssReward: 1
        },
        comeback_king: {
            id: 'comeback_king',
            name: 'Re della Rimonta',
            description: 'Vinci una partita dopo essere stato in svantaggio',
            icon: '👊',
            category: 'classifica',
            cssReward: 1
        },

        // Speciali
        draft_perfect: {
            id: 'draft_perfect',
            name: 'Draft Perfetto',
            description: 'Completa un draft in tempo record',
            icon: '⚡',
            category: 'speciali',
            cssReward: 1
        },
        loyal_fan: {
            id: 'loyal_fan',
            name: 'Tifoso Fedele',
            description: 'Accedi all\'app per 7 giorni consecutivi',
            icon: '❤️',
            category: 'speciali',
            cssReward: 1
        },
        collector: {
            id: 'collector',
            name: 'Collezionista',
            description: 'Sblocca 10 achievements',
            icon: '🎖️',
            category: 'speciali',
            cssReward: 1
        }
    },

    /**
     * Inizializza il sistema achievements
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('achievements')) {
            console.log("Achievements disabilitati");
            return;
        }

        this.loadAchievements();
        this.createPanel();
        this.setupListeners();

        console.log("Sistema Achievements inizializzato");
    },

    /**
     * Crea il pannello achievements
     */
    createPanel() {
        // Rimuovi se esiste
        const existing = document.getElementById('achievements-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'achievements-panel';
        this.panel.className = `
            fixed inset-0 z-[9999] bg-black bg-opacity-80
            flex items-center justify-center
            hidden
        `.replace(/\s+/g, ' ').trim();

        this.panel.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl border-2 border-amber-500 w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
                <!-- Header -->
                <div class="p-4 bg-gradient-to-r from-amber-600 to-yellow-500 flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                        <span>🏆</span>
                        <span>Achievements</span>
                    </h2>
                    <div class="flex items-center gap-4">
                        <div class="text-white">
                            <span class="text-2xl font-bold" id="total-css">0</span>
                            <span class="text-sm opacity-80">CSS</span>
                        </div>
                        <button id="close-achievements-panel" class="text-white hover:text-amber-200 text-2xl">&times;</button>
                    </div>
                </div>

                <!-- Stats -->
                <div class="p-4 bg-gray-700 border-b border-gray-600 flex justify-around">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-amber-400" id="unlocked-count">0</div>
                        <div class="text-xs text-gray-400">Sbloccati</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-gray-400" id="total-count">0</div>
                        <div class="text-xs text-gray-400">Totali</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-400" id="completion-percent">0%</div>
                        <div class="text-xs text-gray-400">Completamento</div>
                    </div>
                </div>

                <!-- Filtri categoria -->
                <div class="flex gap-2 p-4 overflow-x-auto border-b border-gray-600">
                    <button class="achievement-filter active px-3 py-1 bg-amber-600 rounded-full text-white text-sm" data-category="all">Tutti</button>
                    <button class="achievement-filter px-3 py-1 bg-gray-700 rounded-full text-gray-300 text-sm hover:bg-gray-600" data-category="progressione">Progressione</button>
                    <button class="achievement-filter px-3 py-1 bg-gray-700 rounded-full text-gray-300 text-sm hover:bg-gray-600" data-category="vittorie">Vittorie</button>
                    <button class="achievement-filter px-3 py-1 bg-gray-700 rounded-full text-gray-300 text-sm hover:bg-gray-600" data-category="gol">Gol</button>
                    <button class="achievement-filter px-3 py-1 bg-gray-700 rounded-full text-gray-300 text-sm hover:bg-gray-600" data-category="rosa">Rosa</button>
                    <button class="achievement-filter px-3 py-1 bg-gray-700 rounded-full text-gray-300 text-sm hover:bg-gray-600" data-category="classifica">Classifica</button>
                    <button class="achievement-filter px-3 py-1 bg-gray-700 rounded-full text-gray-300 text-sm hover:bg-gray-600" data-category="speciali">Speciali</button>
                </div>

                <!-- Lista achievements -->
                <div id="achievements-list" class="p-4 overflow-y-auto max-h-[calc(90vh-280px)] grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- Contenuto dinamico -->
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);

        // Event listeners
        const closeBtn = document.getElementById('close-achievements-panel');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) this.close();
        });

        // Filtri
        this.panel.querySelectorAll('.achievement-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                this.panel.querySelectorAll('.achievement-filter').forEach(b => {
                    b.classList.remove('active', 'bg-amber-600');
                    b.classList.add('bg-gray-700', 'text-gray-300');
                });
                btn.classList.add('active', 'bg-amber-600');
                btn.classList.remove('bg-gray-700', 'text-gray-300');

                this.renderAchievements(btn.dataset.category);
            });
        });
    },

    /**
     * Apri pannello
     */
    openPanel() {
        if (!window.FeatureFlags?.isEnabled('achievements')) {
            if (window.Toast) window.Toast.info("Achievements non disponibili");
            return;
        }

        if (!this.panel) this.createPanel();
        this.panel.classList.remove('hidden');
        this.isOpen = true;
        this.updateStats();
        this.renderAchievements('all');
    },

    /**
     * Chiudi pannello
     */
    close() {
        if (this.panel) {
            this.panel.classList.add('hidden');
        }
        this.isOpen = false;
    },

    /**
     * Carica achievements sbloccati
     */
    loadAchievements() {
        const saved = localStorage.getItem('fanta_achievements');
        if (saved) {
            try {
                this.unlockedAchievements = JSON.parse(saved);
            } catch (e) {
                console.warn('[Achievements] Dati localStorage corrotti, reset:', e);
                localStorage.removeItem('fanta_achievements');
                this.unlockedAchievements = [];
            }
        } else {
            // Demo: sblocca alcuni achievements
            this.unlockedAchievements = [
                { id: 'first_match', unlockedAt: Date.now() - 86400000 * 5 },
                { id: 'first_win', unlockedAt: Date.now() - 86400000 * 4 },
                { id: 'first_goal', unlockedAt: Date.now() - 86400000 * 4 },
                { id: 'first_purchase', unlockedAt: Date.now() - 86400000 * 3 }
            ];
            this.saveAchievements();
        }
    },

    /**
     * Salva achievements
     */
    saveAchievements() {
        localStorage.setItem('fanta_achievements', JSON.stringify(this.unlockedAchievements));
    },

    /**
     * Aggiorna statistiche header
     */
    updateStats() {
        const total = Object.keys(this.definitions).length;
        const unlocked = this.unlockedAchievements.length;
        const css = this.getTotalCSS();
        const percent = Math.round((unlocked / total) * 100);

        document.getElementById('total-css').textContent = css;
        document.getElementById('unlocked-count').textContent = unlocked;
        document.getElementById('total-count').textContent = total;
        document.getElementById('completion-percent').textContent = percent + '%';
    },

    /**
     * Calcola CSS totali
     */
    getTotalCSS() {
        return this.unlockedAchievements.reduce((sum, ua) => {
            const def = this.definitions[ua.id];
            return sum + (def?.cssReward || def?.points || 0);
        }, 0);
    },

    /**
     * Renderizza lista achievements
     */
    renderAchievements(category = 'all') {
        const list = document.getElementById('achievements-list');
        if (!list) return;

        let achievements = Object.values(this.definitions);

        if (category !== 'all') {
            achievements = achievements.filter(a => a.category === category);
        }

        // Ordina: sbloccati prima
        achievements.sort((a, b) => {
            const aUnlocked = this.isUnlocked(a.id);
            const bUnlocked = this.isUnlocked(b.id);
            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;
            return 0;
        });

        list.innerHTML = achievements.map(achievement => this.renderAchievementCard(achievement)).join('');
    },

    /**
     * Renderizza card achievement
     */
    renderAchievementCard(achievement) {
        const unlocked = this.isUnlocked(achievement.id);
        const unlockedData = this.getUnlockedData(achievement.id);

        return `
            <div class="bg-gray-700 rounded-xl p-4 ${unlocked ? 'border-2 border-amber-500' : 'opacity-60'}">
                <div class="flex items-center gap-3">
                    <div class="text-4xl ${unlocked ? '' : 'grayscale'}">
                        ${achievement.icon}
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold ${unlocked ? 'text-amber-400' : 'text-gray-400'}">
                            ${achievement.name}
                        </h4>
                        <p class="text-gray-400 text-sm">${achievement.description}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-xs px-2 py-0.5 bg-gray-600 rounded">${achievement.category}</span>
                            <span class="text-xs text-amber-400">+${achievement.cssReward || achievement.points || 0} CSS</span>
                        </div>
                    </div>
                    ${unlocked ? `
                        <div class="text-center">
                            <div class="text-green-400 text-xl">✓</div>
                            <div class="text-xs text-gray-500">${this.formatDate(unlockedData.unlockedAt)}</div>
                        </div>
                    ` : `
                        <div class="text-gray-500">
                            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Controlla se achievement sbloccato
     */
    isUnlocked(achievementId) {
        return this.unlockedAchievements.some(a => a.id === achievementId);
    },

    /**
     * Ottieni dati achievement sbloccato
     */
    getUnlockedData(achievementId) {
        return this.unlockedAchievements.find(a => a.id === achievementId);
    },

    /**
     * Sblocca un achievement
     */
    unlock(achievementId) {
        if (!window.FeatureFlags?.isEnabled('achievements')) return false;

        if (this.isUnlocked(achievementId)) return false;

        const achievement = this.definitions[achievementId];
        if (!achievement) return false;

        this.unlockedAchievements.push({
            id: achievementId,
            unlockedAt: Date.now()
        });

        this.saveAchievements();

        // Mostra notifica
        if (window.Toast) {
            window.Toast.success(`${achievement.icon} Achievement sbloccato: ${achievement.name}`);
        }

        if (window.Notifications) {
            window.Notifications.notify.achievement(achievement.name, achievement.description);
        }

        // Controlla achievement collezionista
        if (this.unlockedAchievements.length >= 10 && !this.isUnlocked('collector')) {
            setTimeout(() => this.unlock('collector'), 1000);
        }

        return true;
    },

    /**
     * Controlla e sblocca achievements in base a eventi
     */
    check: {
        matchPlayed() {
            const stored = parseInt(localStorage.getItem('fanta_matches_played') || '0');
            const matches = (isNaN(stored) ? 0 : stored) + 1;
            window.Achievements._safeSetItem('fanta_matches_played', matches);

            window.Achievements.unlock('first_match');
            if (matches >= 10) window.Achievements.unlock('ten_matches');
        },

        matchWon(goalsScored, goalsConceded) {
            window.Achievements.unlock('first_win');

            // Porta inviolata
            if (goalsConceded === 0) {
                window.Achievements.unlock('clean_sheet');
            }

            // Goleada
            if (goalsScored - goalsConceded >= 3) {
                window.Achievements.unlock('big_win');
            }

            // Winning streak
            const storedStreak = parseInt(localStorage.getItem('fanta_win_streak') || '0');
            const streak = (isNaN(storedStreak) ? 0 : storedStreak) + 1;
            window.Achievements._safeSetItem('fanta_win_streak', streak);

            if (streak >= 3) window.Achievements.unlock('winning_streak_3');
            if (streak >= 5) window.Achievements.unlock('winning_streak_5');
        },

        matchLost() {
            window.Achievements._safeSetItem('fanta_win_streak', '0');
        },

        goalScored(count = 1) {
            window.Achievements.unlock('first_goal');

            const storedGoals = parseInt(localStorage.getItem('fanta_total_goals') || '0');
            const totalGoals = (isNaN(storedGoals) ? 0 : storedGoals) + count;
            window.Achievements._safeSetItem('fanta_total_goals', totalGoals);

            if (totalGoals >= 10) window.Achievements.unlock('ten_goals');

            if (count >= 3) window.Achievements.unlock('hat_trick');
        },

        playerPurchased() {
            window.Achievements.unlock('first_purchase');

            const storedPurchases = parseInt(localStorage.getItem('fanta_purchases') || '0');
            const purchases = (isNaN(storedPurchases) ? 0 : storedPurchases) + 1;
            window.Achievements._safeSetItem('fanta_purchases', purchases);

            if (purchases >= 5) window.Achievements.unlock('market_master');
        },

        squadComplete() {
            window.Achievements.unlock('full_squad');
        },

        highLevelPlayer(level) {
            if (level >= 25) window.Achievements.unlock('high_level');
        },

        leaderboardPosition(position) {
            if (position <= 3) window.Achievements.unlock('top_3');
            if (position === 1) window.Achievements.unlock('champion');
        },

        dailyLogin() {
            const lastLogin = localStorage.getItem('fanta_last_login');
            const today = new Date().toDateString();

            if (lastLogin !== today) {
                window.Achievements._safeSetItem('fanta_last_login', today);

                const storedLoginStreak = parseInt(localStorage.getItem('fanta_login_streak') || '0');
                const streak = (isNaN(storedLoginStreak) ? 0 : storedLoginStreak) + 1;
                window.Achievements._safeSetItem('fanta_login_streak', streak);

                if (streak >= 7) window.Achievements.unlock('loyal_fan');
            }
        }
    },

    /**
     * Formatta data
     */
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit'
        });
    },

    /**
     * Setup listeners
     */
    setupListeners() {
        document.addEventListener('featureFlagChanged', (e) => {
            if (e.detail?.flagId === 'achievements') {
                if (e.detail.enabled) {
                    this.init();
                } else {
                    this.destroy();
                }
            }
        });

        // Ascolta eventi di gioco per sbloccare achievements
        document.addEventListener('matchSimulated', (e) => {
            this.check.matchPlayed();
            const myTeamId = window.InterfacciaCore?.currentTeamId;
            const { homeTeam, awayTeam, result } = e.detail || {};

            if (result) {
                const [homeGoals, awayGoals] = result.split('-').map(Number);
                const isHome = homeTeam?.id === myTeamId;
                const myGoals = isHome ? homeGoals : awayGoals;
                const theirGoals = isHome ? awayGoals : homeGoals;

                if (myGoals > theirGoals) {
                    this.check.matchWon(myGoals, theirGoals);
                } else if (myGoals < theirGoals) {
                    this.check.matchLost();
                }

                if (myGoals > 0) {
                    this.check.goalScored(myGoals);
                }
            }
        });

        // Login giornaliero
        this.check.dailyLogin();
    },

    /**
     * Distruggi modulo
     */
    destroy() {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }
};

// Init quando feature flags sono pronti
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.FeatureFlags?.isEnabled('achievements')) {
            window.Achievements.init();
        }
    }, 1000);
});

console.log("Modulo Achievements caricato.");
