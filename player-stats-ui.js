//
// ====================================================================
// PLAYER-STATS-UI.JS - Interfaccia Statistiche in Gestione Squadra
// ====================================================================
//

window.PlayerStatsUI = {
    
    /**
     * Aggiunge tab statistiche alla gestione squadra
     */
    addStatsTab() {
        // Trova il container delle tab
        const tabContainer = document.querySelector('.flex.gap-2.mb-6');
        if (!tabContainer) return;
        
        // Aggiungi bottone Statistiche
        const statsButton = document.createElement('button');
        statsButton.id = 'btn-stats-tab';
        statsButton.className = 'bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700';
        statsButton.textContent = '📊 Statistiche';
        statsButton.onclick = () => this.showStatsView();
        
        tabContainer.appendChild(statsButton);
    },
    
    /**
     * Mostra vista statistiche
     */
    async showStatsView() {
        const squadraToolsContainer = document.getElementById('squadra-tools-container');
        const squadraMainTitle = document.getElementById('squadra-main-title');
        const squadraSubtitle = document.getElementById('squadra-subtitle');
        
        if (!squadraToolsContainer) return;
        
        squadraMainTitle.textContent = "Statistiche Squadra";
        squadraSubtitle.textContent = "Analisi prestazioni giocatori";
        
        squadraToolsContainer.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
                <p class="text-white text-lg">Caricamento statistiche...</p>
            </div>
        `;
        
        try {
            const teamData = window.InterfacciaCore.currentTeamData;
            const teamId = window.InterfacciaCore.currentTeamId;
            
            if (!teamData || !teamId) {
                throw new Error("Dati squadra non disponibili");
            }
            
            // Carica statistiche di tutti i giocatori
            const playerIds = teamData.players.map(p => p.id);
            const allStats = await window.PlayerStats.getTeamStats(teamId, playerIds);
            
            // Filtra solo quelli con almeno 1 partita
            const activeStats = allStats.filter(s => s && s.matchesPlayed > 0);
            
            if (activeStats.length === 0) {
                squadraToolsContainer.innerHTML = `
                    <div class="text-center py-12">
                        <div class="text-6xl mb-4">📊</div>
                        <h3 class="text-2xl font-bold text-white mb-2">Nessuna Statistica Disponibile</h3>
                        <p class="text-gray-400 mb-6">Le statistiche appariranno dopo aver giocato delle partite</p>
                        <button onclick="window.PlayerStatsUI.backToRosa()" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded">
                            Torna alla Rosa
                        </button>
                    </div>
                `;
                return;
            }
            
            // Render vista completa
            this.renderStatsView(teamData, activeStats);
            
        } catch (error) {
            console.error("Errore caricamento statistiche:", error);
            squadraToolsContainer.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-400 text-xl mb-4">❌ Errore caricamento statistiche</p>
                    <p class="text-gray-400 mb-6">${error.message}</p>
                    <button onclick="window.PlayerStatsUI.backToRosa()" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded">
                        Torna alla Rosa
                    </button>
                </div>
            `;
        }
    },
    
    /**
     * Render vista completa statistiche
     */
    renderStatsView(teamData, allStats) {
        const squadraToolsContainer = document.getElementById('squadra-tools-container');
        
        // Statistiche squadra aggregate
        const teamStats = this.calculateTeamStats(allStats);
        
        const html = `
            <div class="stats-view space-y-6">
                
                <!-- Back button -->
                <button onclick="window.PlayerStatsUI.backToRosa()" 
                        class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mb-4">
                    ← Torna alla Rosa
                </button>
                
                <!-- Team Stats Summary -->
                <div class="team-stats-summary bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-6 border-2 border-purple-500">
                    <h2 class="text-2xl font-bold text-white mb-4">📊 Riepilogo Squadra</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="stat-box text-center">
                            <p class="text-3xl font-bold text-green-400">${teamStats.totalGoals}</p>
                            <p class="text-sm text-gray-300">Goal Totali</p>
                        </div>
                        <div class="stat-box text-center">
                            <p class="text-3xl font-bold text-blue-400">${teamStats.totalAssists}</p>
                            <p class="text-sm text-gray-300">Assist Totali</p>
                        </div>
                        <div class="stat-box text-center">
                            <p class="text-3xl font-bold text-purple-400">${teamStats.totalMVPs}</p>
                            <p class="text-sm text-gray-300">MVP Totali</p>
                        </div>
                        <div class="stat-box text-center">
                            <p class="text-3xl font-bold text-yellow-400">${teamStats.avgPerformance.toFixed(1)}</p>
                            <p class="text-sm text-gray-300">Media Squadra</p>
                        </div>
                    </div>
                </div>
                
                <!-- Tabs per classifiche -->
                <div class="stats-tabs">
                    <div class="flex flex-wrap gap-2 mb-4">
                        <button onclick="window.PlayerStatsUI.showLeaderboard('goals')" 
                                class="stats-tab-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                            ⚽ Marcatori
                        </button>
                        <button onclick="window.PlayerStatsUI.showLeaderboard('assists')" 
                                class="stats-tab-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            🎯 Assist
                        </button>
                        <button onclick="window.PlayerStatsUI.showLeaderboard('mvp')" 
                                class="stats-tab-btn bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                            🏆 MVP
                        </button>
                        <button onclick="window.PlayerStatsUI.showLeaderboard('performance')" 
                                class="stats-tab-btn bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                            📊 Performance
                        </button>
                        <button onclick="window.PlayerStatsUI.showLeaderboard('cleansheet')" 
                                class="stats-tab-btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                            🧤 Portieri
                        </button>
                    </div>
                    
                    <!-- Classifica container -->
                    <div id="stats-leaderboard-container">
                        ${window.PlayerStats.renderStatsLeaderboard(allStats, 'goals')}
                    </div>
                </div>
                
                <!-- Lista giocatori con dettagli -->
                <div class="players-stats-list">
                    <h2 class="text-2xl font-bold text-white mb-4">👥 Statistiche Dettagliate</h2>
                    
                    <!-- Filtri -->
                    <div class="mb-4">
                        <select id="stats-role-filter" 
                                onchange="window.PlayerStatsUI.filterByRole(this.value)"
                                class="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600">
                            <option value="all">Tutti i Ruoli</option>
                            <option value="P">Portieri</option>
                            <option value="D">Difensori</option>
                            <option value="C">Centrocampisti</option>
                            <option value="A">Attaccanti</option>
                        </select>
                        
                        <select id="stats-sort" 
                                onchange="window.PlayerStatsUI.sortBy(this.value)"
                                class="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 ml-2">
                            <option value="name">Nome A-Z</option>
                            <option value="performance">Performance (Alta-Bassa)</option>
                            <option value="goals">Goal (Alta-Bassa)</option>
                            <option value="mvp">MVP (Alta-Bassa)</option>
                        </select>
                    </div>
                    
                    <!-- Grid Cards -->
                    <div id="stats-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${allStats.map(stats => window.PlayerStats.renderPlayerStatsCard(stats)).join('')}
                    </div>
                </div>
                
            </div>
        `;
        
        squadraToolsContainer.innerHTML = html;
        
        // Salva stats per filtri
        this._currentStats = allStats;
    },
    
    /**
     * Calcola statistiche aggregate squadra
     */
    calculateTeamStats(allStats) {
        return {
            totalGoals: allStats.reduce((sum, s) => sum + s.goalsScored, 0),
            totalAssists: allStats.reduce((sum, s) => sum + s.assists, 0),
            totalMVPs: allStats.reduce((sum, s) => sum + s.mvpCount, 0),
            avgPerformance: allStats.reduce((sum, s) => sum + s.avgPerformance, 0) / allStats.length
        };
    },
    
    /**
     * Mostra classifica specifica
     */
    showLeaderboard(category) {
        const container = document.getElementById('stats-leaderboard-container');
        if (!container || !this._currentStats) return;
        
        container.innerHTML = window.PlayerStats.renderStatsLeaderboard(this._currentStats, category);
    },
    
    /**
     * Filtra per ruolo
     */
    filterByRole(role) {
        if (!this._currentStats) return;
        
        const filtered = role === 'all' ? 
            this._currentStats : 
            this._currentStats.filter(s => s.role === role);
        
        this.updateCardsGrid(filtered);
    },
    
    /**
     * Ordina per criterio
     */
    sortBy(criterion) {
        if (!this._currentStats) return;
        
        let sorted = [...this._currentStats];
        
        switch(criterion) {
            case 'name':
                sorted.sort((a, b) => a.playerName.localeCompare(b.playerName));
                break;
            case 'performance':
                sorted.sort((a, b) => b.avgPerformance - a.avgPerformance);
                break;
            case 'goals':
                sorted.sort((a, b) => b.goalsScored - a.goalsScored);
                break;
            case 'mvp':
                sorted.sort((a, b) => b.mvpCount - a.mvpCount);
                break;
        }
        
        this.updateCardsGrid(sorted);
    },
    
    /**
     * Aggiorna grid cards
     */
    updateCardsGrid(stats) {
        const grid = document.getElementById('stats-cards-grid');
        if (!grid) return;
        
        grid.innerHTML = stats.map(s => window.PlayerStats.renderPlayerStatsCard(s)).join('');
    },
    
    /**
     * Torna alla rosa
     */
    backToRosa() {
        // Ricarica vista rosa
        if (window.loadTeamDataAndRender) {
            window.loadTeamDataAndRender('rosa');
        }
    }
};

console.log("✅ Player Stats UI caricato.");
