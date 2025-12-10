//
// ====================================================================
// TRAINING.JS - Modalita' Allenamento (Partite Amichevoli)
// ====================================================================
//

window.Training = {
    // UI Elements
    panel: null,
    isOpen: false,

    // Stato partita
    currentMatch: null,
    matchHistory: [],

    // Configurazione
    config: {
        maxHistoryMatches: 20
    },

    /**
     * Inizializza il sistema allenamento
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('training')) {
            console.log("Modalita' Allenamento disabilitata");
            return;
        }

        this.loadHistory();
        this.createPanel();
        this.setupListeners();

        console.log("Sistema Training inizializzato");
    },

    /**
     * Crea il pannello allenamento
     */
    createPanel() {
        // Rimuovi se esiste
        const existing = document.getElementById('training-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'training-panel';
        this.panel.className = `
            fixed inset-0 z-[9999] bg-black bg-opacity-80
            flex items-center justify-center
            hidden
        `.replace(/\s+/g, ' ').trim();

        this.panel.innerHTML = `
            <div class="bg-gray-800 rounded-2xl shadow-2xl border-2 border-green-500 w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
                <!-- Header -->
                <div class="p-4 bg-gradient-to-r from-green-600 to-emerald-500 flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                        <span>⚽</span>
                        <span>Modalita' Allenamento</span>
                    </h2>
                    <button id="close-training-panel" class="text-white hover:text-green-200 text-2xl">&times;</button>
                </div>

                <!-- Info -->
                <div class="p-4 bg-green-900 bg-opacity-30 border-b border-gray-600">
                    <p class="text-green-300 text-sm">
                        ⚠️ Le partite di allenamento non influenzano classifica, statistiche o crediti.
                        Usa questa modalita' per testare formazioni e strategie!
                    </p>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-gray-600">
                    <button class="training-tab active flex-1 py-3 text-center bg-green-600 text-white font-semibold" data-tab="new">
                        ⚽ Nuova Partita
                    </button>
                    <button class="training-tab flex-1 py-3 text-center bg-gray-700 text-gray-300 hover:bg-gray-600" data-tab="history">
                        📜 Storico
                    </button>
                </div>

                <!-- Content -->
                <div id="training-content" class="p-4 overflow-y-auto max-h-[calc(90vh-220px)]">
                    <!-- Contenuto dinamico -->
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);

        // Event listeners
        document.getElementById('close-training-panel').addEventListener('click', () => this.close());
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) this.close();
        });

        // Tab switching
        this.panel.querySelectorAll('.training-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.panel.querySelectorAll('.training-tab').forEach(t => {
                    t.classList.remove('active', 'bg-green-600');
                    t.classList.add('bg-gray-700', 'text-gray-300');
                });
                tab.classList.add('active', 'bg-green-600');
                tab.classList.remove('bg-gray-700', 'text-gray-300');

                this.renderTab(tab.dataset.tab);
            });
        });
    },

    /**
     * Apri pannello
     */
    openPanel() {
        if (!window.FeatureFlags?.isEnabled('training')) {
            if (window.Toast) window.Toast.info("Allenamento non disponibile");
            return;
        }

        if (!this.panel) this.createPanel();
        this.panel.classList.remove('hidden');
        this.isOpen = true;
        this.renderTab('new');
    },

    /**
     * Chiudi pannello
     */
    close() {
        if (this.panel) {
            this.panel.classList.add('hidden');
        }
        this.isOpen = false;
        this.currentMatch = null;
    },

    /**
     * Carica storico partite
     */
    loadHistory() {
        const saved = localStorage.getItem('fanta_training_history');
        if (saved) {
            this.matchHistory = JSON.parse(saved);
        }
    },

    /**
     * Salva storico
     */
    saveHistory() {
        // Mantieni solo ultime N partite
        if (this.matchHistory.length > this.config.maxHistoryMatches) {
            this.matchHistory = this.matchHistory.slice(-this.config.maxHistoryMatches);
        }
        localStorage.setItem('fanta_training_history', JSON.stringify(this.matchHistory));
    },

    /**
     * Renderizza tab
     */
    renderTab(tabName) {
        const content = document.getElementById('training-content');
        if (!content) return;

        switch (tabName) {
            case 'new':
                this.renderNewMatch(content);
                break;
            case 'history':
                this.renderHistory(content);
                break;
        }
    },

    /**
     * Renderizza form nuova partita
     */
    renderNewMatch(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Selezione avversario -->
                <div class="bg-gray-700 rounded-xl p-4">
                    <h3 class="font-bold text-white mb-3">🎯 Scegli Avversario</h3>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button class="opponent-type p-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-center transition-all" data-type="random">
                            <div class="text-3xl mb-2">🎲</div>
                            <div class="font-semibold text-white">Casuale</div>
                            <div class="text-xs text-gray-400">Squadra generata</div>
                        </button>

                        <button class="opponent-type p-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-center transition-all" data-type="mirror">
                            <div class="text-3xl mb-2">🪞</div>
                            <div class="font-semibold text-white">Specchio</div>
                            <div class="text-xs text-gray-400">Contro te stesso</div>
                        </button>

                        <button class="opponent-type p-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-center transition-all" data-type="league">
                            <div class="text-3xl mb-2">🏆</div>
                            <div class="font-semibold text-white">Lega</div>
                            <div class="text-xs text-gray-400">Squadra della lega</div>
                        </button>
                    </div>
                </div>

                <!-- Selezione difficolta' -->
                <div class="bg-gray-700 rounded-xl p-4">
                    <h3 class="font-bold text-white mb-3">⚙️ Difficolta'</h3>

                    <div class="grid grid-cols-3 gap-3">
                        <button class="difficulty-btn p-3 bg-green-600 rounded-lg text-center" data-difficulty="easy">
                            <div class="font-semibold text-white">Facile</div>
                            <div class="text-xs text-green-200">Lv. -3</div>
                        </button>

                        <button class="difficulty-btn p-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-center" data-difficulty="normal">
                            <div class="font-semibold text-white">Normale</div>
                            <div class="text-xs text-gray-400">Lv. =</div>
                        </button>

                        <button class="difficulty-btn p-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-center" data-difficulty="hard">
                            <div class="font-semibold text-white">Difficile</div>
                            <div class="text-xs text-gray-400">Lv. +3</div>
                        </button>
                    </div>
                </div>

                <!-- Selezione formazione -->
                <div class="bg-gray-700 rounded-xl p-4">
                    <h3 class="font-bold text-white mb-3">📋 La Tua Formazione</h3>
                    <p class="text-gray-400 text-sm mb-3">Verrà utilizzata la formazione attualmente schierata.</p>

                    <div id="training-formation-preview" class="bg-gray-800 rounded-lg p-4">
                        <p class="text-gray-500 text-center">Caricamento formazione...</p>
                    </div>
                </div>

                <!-- Bottone avvia -->
                <button id="start-training-match" class="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 rounded-xl text-white font-bold text-lg shadow-lg transition-all">
                    ⚽ Avvia Partita di Allenamento
                </button>
            </div>
        `;

        // Carica preview formazione
        this.loadFormationPreview();

        // Stato selezioni
        let selectedOpponent = 'random';
        let selectedDifficulty = 'easy';

        // Event listeners tipo avversario
        container.querySelectorAll('.opponent-type').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.opponent-type').forEach(b => {
                    b.classList.remove('bg-green-600', 'ring-2', 'ring-green-400');
                    b.classList.add('bg-gray-600');
                });
                btn.classList.remove('bg-gray-600');
                btn.classList.add('bg-green-600', 'ring-2', 'ring-green-400');
                selectedOpponent = btn.dataset.type;
            });
        });

        // Event listeners difficolta'
        container.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.difficulty-btn').forEach(b => {
                    b.classList.remove('bg-green-600');
                    b.classList.add('bg-gray-600');
                });
                btn.classList.remove('bg-gray-600');
                btn.classList.add('bg-green-600');
                selectedDifficulty = btn.dataset.difficulty;
            });
        });

        // Avvia partita
        document.getElementById('start-training-match').addEventListener('click', () => {
            this.startMatch(selectedOpponent, selectedDifficulty);
        });

        // Seleziona default
        container.querySelector('.opponent-type[data-type="random"]').click();
    },

    /**
     * Carica preview formazione
     */
    loadFormationPreview() {
        const preview = document.getElementById('training-formation-preview');
        if (!preview) return;

        // Prova a caricare la formazione attuale
        const team = window.InterfacciaCore?.getCurrentTeam?.();
        const formation = team?.formation || [];

        if (formation.length === 0) {
            preview.innerHTML = `
                <p class="text-yellow-400 text-center">
                    ⚠️ Nessuna formazione schierata. Vai alla gestione squadra per creare una formazione.
                </p>
            `;
            return;
        }

        // Mostra formazione semplificata
        const roleGroups = { P: [], D: [], C: [], A: [] };
        formation.forEach(p => {
            const role = p.role || p.ruolo || 'C';
            if (roleGroups[role]) {
                roleGroups[role].push(p);
            }
        });

        preview.innerHTML = `
            <div class="grid grid-cols-4 gap-2 text-center">
                ${Object.entries(roleGroups).map(([role, players]) => `
                    <div>
                        <div class="text-xs text-gray-400 mb-1">${this.getRoleName(role)}</div>
                        <div class="text-lg font-bold text-white">${players.length}</div>
                    </div>
                `).join('')}
            </div>
            <div class="mt-3 text-center text-sm text-gray-400">
                Totale: ${formation.length} giocatori
            </div>
        `;
    },

    /**
     * Avvia partita di allenamento
     */
    async startMatch(opponentType, difficulty) {
        const content = document.getElementById('training-content');
        if (!content) return;

        // Mostra loading
        content.innerHTML = `
            <div class="text-center py-12">
                <div class="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
                <p class="text-white text-lg">Simulazione in corso...</p>
                <p class="text-gray-400 text-sm mt-2">Preparazione squadre</p>
            </div>
        `;

        // Simula delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Genera avversario
        const opponent = this.generateOpponent(opponentType, difficulty);

        // Simula partita
        const result = this.simulateMatch(opponent, difficulty);

        // Salva nello storico
        this.matchHistory.push({
            id: `training_${Date.now()}`,
            timestamp: Date.now(),
            opponent: opponent.name,
            opponentType,
            difficulty,
            result: result.score,
            won: result.won,
            events: result.events
        });
        this.saveHistory();

        // Mostra risultato
        this.renderMatchResult(content, result, opponent);
    },

    /**
     * Genera squadra avversaria
     */
    generateOpponent(type, difficulty) {
        const levelMod = { easy: -3, normal: 0, hard: 3 }[difficulty];
        const baseLevel = 15 + levelMod;

        const names = ['FC Training', 'Sparring Team', 'Test Squad', 'Practice XI', 'Friendly FC'];
        const name = type === 'mirror' ? 'Squadra Specchio' :
                     type === 'league' ? 'Squadra Lega' :
                     names[Math.floor(Math.random() * names.length)];

        return {
            name,
            type,
            level: baseLevel,
            formation: this.generateRandomFormation(baseLevel)
        };
    },

    /**
     * Genera formazione casuale
     */
    generateRandomFormation(baseLevel) {
        const roles = ['P', 'D', 'D', 'C', 'C', 'C', 'A', 'A'];
        const types = ['Potenza', 'Tecnica', 'Velocita'];

        return roles.map((role, i) => ({
            name: `Giocatore ${i + 1}`,
            role,
            type: types[Math.floor(Math.random() * types.length)],
            level: baseLevel + Math.floor(Math.random() * 5) - 2
        }));
    },

    /**
     * Simula partita
     */
    simulateMatch(opponent, difficulty) {
        // Logica semplificata di simulazione
        const myStrength = this.calculateTeamStrength();
        const oppStrength = opponent.level * 10;

        const diffMod = { easy: 1.2, normal: 1.0, hard: 0.8 }[difficulty];
        const adjustedStrength = myStrength * diffMod;

        // Calcola gol
        const myGoalChance = adjustedStrength / (adjustedStrength + oppStrength);
        const oppGoalChance = oppStrength / (adjustedStrength + oppStrength);

        let myGoals = 0;
        let oppGoals = 0;
        const events = [];

        // Simula 90 minuti
        for (let minute = 1; minute <= 90; minute += 10) {
            if (Math.random() < myGoalChance * 0.15) {
                myGoals++;
                events.push({ minute, type: 'goal', team: 'home', text: `⚽ Gol! (${minute}')` });
            }
            if (Math.random() < oppGoalChance * 0.15) {
                oppGoals++;
                events.push({ minute, type: 'goal', team: 'away', text: `⚽ Gol avversario (${minute}')` });
            }
        }

        return {
            score: `${myGoals}-${oppGoals}`,
            myGoals,
            oppGoals,
            won: myGoals > oppGoals,
            draw: myGoals === oppGoals,
            events: events.sort((a, b) => a.minute - b.minute)
        };
    },

    /**
     * Calcola forza squadra
     */
    calculateTeamStrength() {
        const team = window.InterfacciaCore?.getCurrentTeam?.();
        const formation = team?.formation || [];

        if (formation.length === 0) return 100;

        const avgLevel = formation.reduce((sum, p) => sum + (p.level || p.livello || 15), 0) / formation.length;
        return avgLevel * 10;
    },

    /**
     * Renderizza risultato partita
     */
    renderMatchResult(container, result, opponent) {
        const resultClass = result.won ? 'text-green-400' : result.draw ? 'text-yellow-400' : 'text-red-400';
        const resultText = result.won ? 'VITTORIA!' : result.draw ? 'PAREGGIO' : 'SCONFITTA';
        const resultEmoji = result.won ? '🎉' : result.draw ? '🤝' : '😔';

        container.innerHTML = `
            <div class="text-center mb-6">
                <div class="text-5xl mb-4">${resultEmoji}</div>
                <h3 class="text-3xl font-bold ${resultClass}">${resultText}</h3>
            </div>

            <!-- Tabellone -->
            <div class="bg-gray-700 rounded-xl p-6 mb-6">
                <div class="grid grid-cols-3 items-center">
                    <div class="text-center">
                        <div class="text-2xl mb-2">🏠</div>
                        <div class="font-bold text-white">La Mia Squadra</div>
                    </div>
                    <div class="text-center">
                        <div class="text-5xl font-bold text-white">${result.score}</div>
                        <div class="text-gray-400 text-sm mt-1">Finale</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl mb-2">⚔️</div>
                        <div class="font-bold text-white">${opponent.name}</div>
                        <div class="text-xs text-gray-400">Lv. ${opponent.level}</div>
                    </div>
                </div>
            </div>

            <!-- Eventi -->
            ${result.events.length > 0 ? `
                <div class="bg-gray-700 rounded-xl p-4 mb-6">
                    <h4 class="font-bold text-white mb-3">📋 Cronaca</h4>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${result.events.map(e => `
                            <div class="flex items-center gap-2 text-sm ${e.team === 'home' ? 'text-green-400' : 'text-red-400'}">
                                <span class="text-gray-400 w-12">${e.minute}'</span>
                                <span>${e.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : `
                <div class="bg-gray-700 rounded-xl p-4 mb-6 text-center text-gray-400">
                    Nessun evento particolare
                </div>
            `}

            <!-- Note -->
            <div class="bg-green-900 bg-opacity-30 rounded-xl p-4 mb-6">
                <p class="text-green-300 text-sm text-center">
                    ℹ️ Questa partita non ha influenzato classifica o statistiche
                </p>
            </div>

            <!-- Azioni -->
            <div class="flex gap-3">
                <button onclick="window.Training.renderTab('new')" class="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-semibold">
                    🔄 Nuova Partita
                </button>
                <button onclick="window.Training.close()" class="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold">
                    ✖️ Chiudi
                </button>
            </div>
        `;
    },

    /**
     * Renderizza storico partite
     */
    renderHistory(container) {
        if (this.matchHistory.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-5xl mb-4">📭</div>
                    <p class="text-gray-400">Nessuna partita di allenamento giocata</p>
                    <button onclick="window.Training.renderTab('new')" class="mt-4 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white">
                        Gioca Ora
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-3">
                ${this.matchHistory.slice().reverse().map(match => {
                    const resultClass = match.won ? 'border-green-500' : match.result.split('-')[0] === match.result.split('-')[1] ? 'border-yellow-500' : 'border-red-500';
                    const resultEmoji = match.won ? '✅' : match.result.split('-')[0] === match.result.split('-')[1] ? '🟡' : '❌';

                    return `
                        <div class="bg-gray-700 rounded-lg p-4 border-l-4 ${resultClass}">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-xl mr-2">${resultEmoji}</span>
                                    <span class="font-bold text-white">${match.result}</span>
                                    <span class="text-gray-400 ml-2">vs ${match.opponent}</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-xs text-gray-400">${this.formatDate(match.timestamp)}</div>
                                    <div class="text-xs text-gray-500">${match.difficulty}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    /**
     * Helper - Nome ruolo
     */
    getRoleName(role) {
        const names = { P: 'POR', D: 'DIF', C: 'CEN', A: 'ATT' };
        return names[role] || role;
    },

    /**
     * Formatta data
     */
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Setup listeners
     */
    setupListeners() {
        document.addEventListener('featureFlagChanged', (e) => {
            if (e.detail?.flagId === 'training') {
                if (e.detail.enabled) {
                    this.init();
                } else {
                    this.destroy();
                }
            }
        });
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
        if (window.FeatureFlags?.isEnabled('training')) {
            window.Training.init();
        }
    }, 1000);
});

console.log("Modulo Training caricato.");
