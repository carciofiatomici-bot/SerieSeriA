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
            try {
                this.matchHistory = JSON.parse(saved);
            } catch (e) {
                console.warn('[Training] Dati localStorage corrotti, reset:', e);
                localStorage.removeItem('fanta_training_history');
                this.matchHistory = [];
            }
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

                <!-- Selezione squadra lega (nascosto di default) -->
                <div id="league-team-selection" class="bg-gray-700 rounded-xl p-4 hidden">
                    <h3 class="font-bold text-white mb-3">🏆 Scegli Squadra della Lega</h3>
                    <select id="league-team-select" class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white">
                        <option value="">Caricamento squadre...</option>
                    </select>
                    <div id="league-team-info" class="hidden mt-3 p-3 bg-gray-800 rounded-lg">
                        <p class="text-sm text-gray-400">Info squadra</p>
                    </div>
                </div>

                <!-- Selezione difficolta' -->
                <div id="difficulty-selection" class="bg-gray-700 rounded-xl p-4">
                    <h3 class="font-bold text-white mb-3">⚙️ Difficolta'</h3>
                    <p id="difficulty-note" class="text-gray-400 text-xs mb-3 hidden">Nota: la difficolta' non si applica alle squadre della lega</p>

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
        let selectedLeagueTeam = null;

        // Elementi UI
        const leagueTeamSelection = document.getElementById('league-team-selection');
        const leagueTeamSelect = document.getElementById('league-team-select');
        const leagueTeamInfo = document.getElementById('league-team-info');
        const difficultySelection = document.getElementById('difficulty-selection');
        const difficultyNote = document.getElementById('difficulty-note');

        // Event listeners tipo avversario
        container.querySelectorAll('.opponent-type').forEach(btn => {
            btn.addEventListener('click', async () => {
                container.querySelectorAll('.opponent-type').forEach(b => {
                    b.classList.remove('bg-green-600', 'ring-2', 'ring-green-400');
                    b.classList.add('bg-gray-600');
                });
                btn.classList.remove('bg-gray-600');
                btn.classList.add('bg-green-600', 'ring-2', 'ring-green-400');
                selectedOpponent = btn.dataset.type;

                // Mostra/nascondi selezione squadra lega
                if (selectedOpponent === 'league') {
                    leagueTeamSelection.classList.remove('hidden');
                    difficultyNote.classList.remove('hidden');
                    // Carica squadre della lega
                    await this.loadLeagueTeams(leagueTeamSelect);
                } else {
                    leagueTeamSelection.classList.add('hidden');
                    difficultyNote.classList.add('hidden');
                    selectedLeagueTeam = null;
                }
            });
        });

        // Event listener selezione squadra lega
        leagueTeamSelect.addEventListener('change', async (e) => {
            const teamId = e.target.value;
            if (teamId) {
                selectedLeagueTeam = await this.loadLeagueTeamData(teamId);
                this.showLeagueTeamInfo(leagueTeamInfo, selectedLeagueTeam);
            } else {
                selectedLeagueTeam = null;
                leagueTeamInfo.classList.add('hidden');
            }
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
            // Verifica selezione squadra lega
            if (selectedOpponent === 'league' && !selectedLeagueTeam) {
                if (window.Toast) window.Toast.warning("Seleziona una squadra della lega");
                return;
            }
            this.startMatch(selectedOpponent, selectedDifficulty, selectedLeagueTeam);
        });

        // Seleziona default
        container.querySelector('.opponent-type[data-type="random"]').click();
    },

    /**
     * Carica le squadre della lega per il dropdown
     */
    async loadLeagueTeams(selectElement) {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const cache = window.FirestoreCache;

        try {
            // Controlla cache prima (stessa cache usata da challenges)
            const cachedTeams = cache?.get('teams_list', 'available');
            if (cachedTeams) {
                console.log("[Training] Usando lista squadre dalla cache");
                const filteredTeams = cachedTeams.filter(t => t.id !== myTeamId);
                if (filteredTeams.length === 0) {
                    selectElement.innerHTML = '<option value="">Nessuna squadra disponibile</option>';
                    return;
                }
                selectElement.innerHTML = '<option value="">Seleziona squadra...</option>' +
                    filteredTeams.map(t => `<option value="${t.id}">${t.teamName}</option>`).join('');
                return;
            }

            const { collection, getDocs } = window.firestoreTools;
            const appId = window.firestoreTools?.appId;
            const teamsPath = `artifacts/${appId}/public/data/teams`;

            console.log("[Training] Caricamento squadre da Firestore...");
            const snapshot = await getDocs(collection(window.db, teamsPath));
            const teams = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Salva tutte le squadre con formazione
                if (data.teamName && data.formation?.titolari?.length) {
                    teams.push({
                        id: doc.id,
                        teamName: data.teamName,
                        formation: data.formation
                    });
                }
            });

            // Salva in cache (TTL 2 minuti)
            if (cache) {
                cache.set('teams_list', 'available', teams, cache.TTL.TEAM_LIST);
            }

            // Filtra la propria squadra
            const filteredTeams = teams.filter(t => t.id !== myTeamId);

            if (filteredTeams.length === 0) {
                selectElement.innerHTML = '<option value="">Nessuna squadra disponibile</option>';
                return;
            }

            selectElement.innerHTML = '<option value="">Seleziona squadra...</option>' +
                filteredTeams.map(t => `<option value="${t.id}">${t.teamName}</option>`).join('');

        } catch (error) {
            console.error("Errore caricamento squadre lega:", error);
            selectElement.innerHTML = '<option value="">Errore caricamento</option>';
        }
    },

    /**
     * Carica i dati completi di una squadra della lega (con cache)
     */
    async loadLeagueTeamData(teamId) {
        const cache = window.FirestoreCache;

        try {
            // Controlla cache prima
            const cachedTeam = cache?.get('team', teamId);
            if (cachedTeam) {
                console.log("[Training] Usando dati squadra dalla cache:", teamId);
                return { id: teamId, ...cachedTeam };
            }

            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools?.appId;
            const teamsPath = `artifacts/${appId}/public/data/teams`;

            console.log("[Training] Caricamento dati squadra da Firestore:", teamId);
            const docSnap = await getDoc(doc(window.db, teamsPath, teamId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Salva in cache (TTL 1 minuto)
                cache?.set('team', teamId, data, cache?.TTL?.TEAM_DATA);
                return { id: docSnap.id, ...data };
            }
            return null;
        } catch (error) {
            console.error("Errore caricamento dati squadra:", error);
            return null;
        }
    },

    /**
     * Mostra info squadra lega selezionata
     */
    showLeagueTeamInfo(infoElement, team) {
        if (!team || !infoElement) {
            if (infoElement) infoElement.classList.add('hidden');
            return;
        }

        const titolari = team.formation?.titolari || [];
        const avgLevel = titolari.length > 0
            ? Math.round(titolari.reduce((sum, p) => sum + (p.level || p.livello || 15), 0) / titolari.length)
            : '?';

        infoElement.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-bold text-white">${team.teamName}</p>
                    <p class="text-xs text-gray-400">${titolari.length} titolari</p>
                </div>
                <div class="text-right">
                    <p class="text-yellow-400 font-bold">Lv. ${avgLevel}</p>
                    <p class="text-xs text-gray-500">media</p>
                </div>
            </div>
        `;
        infoElement.classList.remove('hidden');
    },

    /**
     * Ottiene la formazione corrente (titolari)
     */
    getMyFormation() {
        const teamData = window.InterfacciaCore?.currentTeamData;
        // La formazione e' in formation.titolari
        return teamData?.formation?.titolari || [];
    },

    /**
     * Calcola la media livello della formazione
     */
    getMyAverageLevel() {
        const formation = this.getMyFormation();
        if (formation.length === 0) return 15;

        const totalLevel = formation.reduce((sum, p) => {
            return sum + (p.level || p.livello || 15);
        }, 0);

        return Math.round(totalLevel / formation.length);
    },

    /**
     * Carica preview formazione
     */
    loadFormationPreview() {
        const preview = document.getElementById('training-formation-preview');
        if (!preview) return;

        // Prova a caricare la formazione attuale (titolari)
        const formation = this.getMyFormation();

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

        const avgLevel = this.getMyAverageLevel();

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
                Totale: ${formation.length} giocatori | Media Lv: <span class="text-yellow-400 font-bold">${avgLevel}</span>
            </div>
        `;
    },

    /**
     * Avvia partita di allenamento
     */
    async startMatch(opponentType, difficulty, leagueTeam = null) {
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
        const opponent = this.generateOpponent(opponentType, difficulty, leagueTeam);

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
    generateOpponent(type, difficulty, leagueTeam = null) {
        const levelMod = { easy: -3, normal: 0, hard: 3 }[difficulty];
        // Usa la media della tua squadra come base, non 15 fisso
        const myAvgLevel = this.getMyAverageLevel();

        // Se e' una squadra della lega, usa i suoi dati reali
        if (type === 'league' && leagueTeam) {
            const leagueFormation = leagueTeam.formation?.titolari || [];
            const leagueAvgLevel = leagueFormation.length > 0
                ? Math.round(leagueFormation.reduce((sum, p) => sum + (p.level || p.livello || 15), 0) / leagueFormation.length)
                : 15;

            return {
                name: leagueTeam.teamName,
                type: 'league',
                level: leagueAvgLevel,
                formation: leagueFormation,
                isRealTeam: true,
                teamData: leagueTeam
            };
        }

        // Per specchio, usa la tua formazione
        if (type === 'mirror') {
            const myFormation = this.getMyFormation();
            return {
                name: 'Squadra Specchio',
                type: 'mirror',
                level: myAvgLevel,
                formation: myFormation,
                isRealTeam: false
            };
        }

        // Squadra casuale generata
        const baseLevel = Math.max(1, myAvgLevel + levelMod);
        const names = ['FC Training', 'Sparring Team', 'Test Squad', 'Practice XI', 'Friendly FC'];

        return {
            name: names[Math.floor(Math.random() * names.length)],
            type: 'random',
            level: baseLevel,
            formation: this.generateRandomFormation(baseLevel),
            isRealTeam: false
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
        const formation = this.getMyFormation();

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

            <!-- Bottoni Animazione -->
            <div id="training-animation-buttons" class="hidden mb-4">
                <div class="flex gap-3">
                    <button id="btn-training-replay" class="hidden flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold flex items-center justify-center gap-2">
                        <span>🎬</span> Replay Completo
                    </button>
                    <button id="btn-training-highlights" class="hidden flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white font-semibold flex items-center justify-center gap-2">
                        <span>⭐</span> Solo Highlights
                    </button>
                </div>
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

        // Gestione bottoni animazione
        this.setupAnimationButtons(result, opponent);
    },

    /**
     * Setup bottoni animazione dopo il risultato
     */
    setupAnimationButtons(result, opponent) {
        const animButtonsContainer = document.getElementById('training-animation-buttons');
        const btnReplay = document.getElementById('btn-training-replay');
        const btnHighlights = document.getElementById('btn-training-highlights');

        if (!animButtonsContainer) return;

        const fullAnimEnabled = window.FeatureFlags?.isEnabled('matchAnimations');
        const highlightsEnabled = window.FeatureFlags?.isEnabled('matchHighlights');

        if (fullAnimEnabled || highlightsEnabled) {
            animButtonsContainer.classList.remove('hidden');

            // Prepara i dati per le animazioni
            const teamData = window.InterfacciaCore?.currentTeamData;
            const myTeamData = {
                id: window.InterfacciaCore?.currentTeamId || 'training-my-team',
                teamName: teamData?.teamName || 'La Mia Squadra',
                formation: { titolari: this.getMyFormation() }
            };

            // Se e' una squadra della lega, usa i dati reali
            const opponentData = opponent.isRealTeam && opponent.teamData
                ? {
                    id: opponent.teamData.id,
                    teamName: opponent.teamData.teamName,
                    formation: opponent.teamData.formation
                }
                : {
                    id: 'training-opponent',
                    teamName: opponent.name,
                    formation: { titolari: opponent.formation }
                };

            if (btnReplay) {
                if (fullAnimEnabled) {
                    btnReplay.classList.remove('hidden');
                    btnReplay.onclick = () => {
                        this.close();
                        if (window.MatchAnimations) {
                            window.MatchAnimations.open({
                                homeTeam: myTeamData,
                                awayTeam: opponentData,
                                result: result.score,
                                highlightsOnly: false
                            });
                        }
                    };
                } else {
                    btnReplay.classList.add('hidden');
                }
            }

            if (btnHighlights) {
                if (highlightsEnabled) {
                    btnHighlights.classList.remove('hidden');
                    btnHighlights.onclick = () => {
                        this.close();
                        if (window.MatchAnimations) {
                            window.MatchAnimations.open({
                                homeTeam: myTeamData,
                                awayTeam: opponentData,
                                result: result.score,
                                highlightsOnly: true
                            });
                        }
                    };
                } else {
                    btnHighlights.classList.add('hidden');
                }
            }
        } else {
            animButtonsContainer.classList.add('hidden');
        }
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
                    const resultParts = (match.result || '').split('-');
                    const isDraw = resultParts[0] === resultParts[1];
                    const resultClass = match.won ? 'border-green-500' : isDraw ? 'border-yellow-500' : 'border-red-500';
                    const resultEmoji = match.won ? '✅' : isDraw ? '🟡' : '❌';

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
