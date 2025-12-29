//
// ====================================================================
// PLAYER-STATS.JS - Sistema Statistiche Giocatori Dettagliate
// ====================================================================
//

window.PlayerStats = {
    
    /**
     * Inizializza le statistiche per un giocatore
     */
    initPlayerStats(playerId, playerName, role) {
        return {
            playerId: playerId || 'unknown',
            playerName: playerName || 'Giocatore',
            role: role || 'C',
            matchesPlayed: 0,
            matchesStarting: 0, // Partite da titolare
            matchesBench: 0, // Partite in panchina
            
            // Statistiche goal/assist
            goalsScored: 0,
            assists: 0, // Calcolato dalle fasi
            
            // Statistiche difensive
            cleanSheets: 0, // Solo portieri - partite senza gol subiti
            saves: 0, // Solo portieri - parate effettuate
            interceptions: 0, // Difensori - intercettazioni
            
            // Statistiche costruzione/attacco
            successfulPasses: 0, // Fasi costruzione riuscite
            failedPasses: 0, // Fasi costruzione fallite
            successfulAttacks: 0, // Fasi attacco riuscite
            failedAttacks: 0, // Fasi attacco fallite
            
            // Performance media
            avgPerformance: 0, // Media contributo per partita (0-10)
            totalContribution: 0, // Somma contributi
            
            // MVP
            mvpCount: 0, // Quante volte MVP della partita
            
            // Abilità attivazioni
            abilityActivations: {
                regista: 0,
                antifurto: 0,
                bomber: 0,
                muro: 0,
                kamikaze: 0,
                motore: 0,
                pivot: 0,
                guardia: 0,
                bandiera: 0,
                toccoVelluto: 0,
                doppioScatto: 0,
                teletrasporto: 0,
                contrastoDurissimo: 0,
                punDiFerro: 0,
                fortunato: 0,
                caos: 0
            },
            
            // Forma
            bestForm: 0, // Miglior forma raggiunta
            worstForm: 0, // Peggior forma raggiunta
            currentForm: 0, // Forma attuale
            
            // Streak
            currentStreak: 0, // Goal consecutivi (attaccanti)
            bestStreak: 0,
            
            // Date
            lastUpdated: Date.now(),
            seasonStart: Date.now()
        };
    },
    
    /**
     * Aggiorna statistiche dopo una partita
     */
    async updateMatchStats(teamId, playerId, matchData) {
        const { doc, getDoc, setDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        
        const statsPath = `artifacts/${appId}/public/data/teams/${teamId}/playerStats/${playerId}`;
        const statsRef = doc(db, statsPath);
        
        try {
            // Carica stats esistenti o inizializza
            const statsDoc = await getDoc(statsRef);
            let stats = statsDoc.exists() ? statsDoc.data() : 
                        this.initPlayerStats(playerId, matchData.playerName, matchData.role);
            
            // Aggiorna contatori base
            stats.matchesPlayed++;
            if (matchData.isStarting) {
                stats.matchesStarting++;
            } else {
                stats.matchesBench++;
            }
            
            // Aggiorna goal
            if (matchData.goalsScored) {
                stats.goalsScored += matchData.goalsScored;
                
                // Streak goal (solo attaccanti)
                if (matchData.role === 'A') {
                    stats.currentStreak = matchData.goalsScored > 0 ? 
                        stats.currentStreak + 1 : 0;
                    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
                }
            }
            
            // Assist
            if (matchData.assists) {
                stats.assists += matchData.assists;
            }
            
            // Clean sheet (portieri)
            if (matchData.role === 'P' && matchData.goalsConceded === 0) {
                stats.cleanSheets++;
            }
            
            // Parate (portieri)
            if (matchData.saves) {
                stats.saves += matchData.saves;
            }
            
            // Costruzione
            if (matchData.constructionSuccess) {
                stats.successfulPasses++;
            } else if (matchData.constructionAttempt) {
                stats.failedPasses++;
            }
            
            // Attacco
            if (matchData.attackSuccess) {
                stats.successfulAttacks++;
            } else if (matchData.attackAttempt) {
                stats.failedAttacks++;
            }
            
            // Abilità attivazioni
            if (matchData.abilitiesActivated) {
                for (const ability of matchData.abilitiesActivated) {
                    const key = this.normalizeAbilityKey(ability);
                    if (stats.abilityActivations[key] !== undefined) {
                        stats.abilityActivations[key]++;
                    }
                }
            }
            
            // Performance media
            if (matchData.contribution !== undefined) {
                stats.totalContribution += matchData.contribution;
                stats.avgPerformance = stats.totalContribution / stats.matchesPlayed;
            }
            
            // MVP
            if (matchData.isMVP) {
                stats.mvpCount++;
            }
            
            // Forma
            if (matchData.form !== undefined) {
                stats.currentForm = matchData.form;
                stats.bestForm = Math.max(stats.bestForm, matchData.form);
                stats.worstForm = Math.min(stats.worstForm, matchData.form);
            }
            
            // Timestamp
            stats.lastUpdated = Date.now();
            
            // Salva
            await setDoc(statsRef, stats);
            
            return stats;
            
        } catch (error) {
            console.error(`Errore update stats giocatore ${playerId}:`, error);
            throw error;
        }
    },
    
    /**
     * Recupera statistiche giocatore
     */
    async getPlayerStats(teamId, playerId) {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        
        const statsPath = `artifacts/${appId}/public/data/teams/${teamId}/playerStats/${playerId}`;
        const statsRef = doc(db, statsPath);
        
        try {
            const statsDoc = await getDoc(statsRef);
            return statsDoc.exists() ? statsDoc.data() : null;
        } catch (error) {
            console.error(`Errore get stats giocatore ${playerId}:`, error);
            return null;
        }
    },
    
    /**
     * Recupera statistiche di tutta la rosa
     */
    async getTeamStats(teamId, playerIds) {
        const promises = playerIds.map(id => this.getPlayerStats(teamId, id));
        const allStats = await Promise.all(promises);
        return allStats.filter(Boolean); // Rimuove null
    },
    
    /**
     * Mostra statistiche giocatore in UI
     */
    renderPlayerStatsCard(stats) {
        if (!stats) {
            return '<p class="text-gray-400">Statistiche non disponibili</p>';
        }
        
        const successRate = stats.successfulPasses + stats.failedPasses > 0 ?
            ((stats.successfulPasses / (stats.successfulPasses + stats.failedPasses)) * 100).toFixed(1) :
            0;
        
        const attackRate = stats.successfulAttacks + stats.failedAttacks > 0 ?
            ((stats.successfulAttacks / (stats.successfulAttacks + stats.failedAttacks)) * 100).toFixed(1) :
            0;
        
        // Top abilità attivate
        const topAbilities = Object.entries(stats.abilityActivations)
            .filter(([k, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        return `
            <div class="player-stats-card bg-gray-800 rounded-lg p-4 border-2 border-gray-600">
                
                <!-- Header -->
                <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-600">
                    <div>
                        <h3 class="text-xl font-bold text-white">${stats.playerName}</h3>
                        <p class="text-sm text-gray-400">${this.getRoleLabel(stats.role)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold text-yellow-400">${stats.avgPerformance.toFixed(1)}</p>
                        <p class="text-xs text-gray-400">Media</p>
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-3 mb-4">
                    
                    <!-- Partite -->
                    <div class="stat-box bg-gray-900 p-3 rounded">
                        <p class="text-xs text-gray-400 mb-1">Partite</p>
                        <p class="text-2xl font-bold text-white">${stats.matchesPlayed}</p>
                        <p class="text-xs text-gray-500">${stats.matchesStarting} da titolare</p>
                    </div>
                    
                    <!-- Goal (se attaccante) -->
                    ${stats.role === 'A' ? `
                    <div class="stat-box bg-gray-900 p-3 rounded">
                        <p class="text-xs text-gray-400 mb-1">⚽ Goal</p>
                        <p class="text-2xl font-bold text-green-400">${stats.goalsScored}</p>
                        <p class="text-xs text-gray-500">Streak: ${stats.currentStreak}</p>
                    </div>
                    ` : ''}
                    
                    <!-- Clean Sheet (se portiere) -->
                    ${stats.role === 'P' ? `
                    <div class="stat-box bg-gray-900 p-3 rounded">
                        <p class="text-xs text-gray-400 mb-1">🧤 Clean Sheet</p>
                        <p class="text-2xl font-bold text-blue-400">${stats.cleanSheets}</p>
                        <p class="text-xs text-gray-500">${stats.saves} parate</p>
                    </div>
                    ` : ''}
                    
                    <!-- Assist -->
                    ${stats.role !== 'P' ? `
                    <div class="stat-box bg-gray-900 p-3 rounded">
                        <p class="text-xs text-gray-400 mb-1">🎯 Assist</p>
                        <p class="text-2xl font-bold text-blue-400">${stats.assists}</p>
                        <p class="text-xs text-gray-500">Costruzioni: ${successRate}%</p>
                    </div>
                    ` : ''}
                    
                    <!-- MVP -->
                    <div class="stat-box bg-gray-900 p-3 rounded">
                        <p class="text-xs text-gray-400 mb-1">🏆 MVP</p>
                        <p class="text-2xl font-bold text-purple-400">${stats.mvpCount}</p>
                        <p class="text-xs text-gray-500">${((stats.mvpCount / Math.max(stats.matchesPlayed, 1)) * 100).toFixed(0)}% partite</p>
                    </div>
                    
                    <!-- Forma -->
                    <div class="stat-box bg-gray-900 p-3 rounded">
                        <p class="text-xs text-gray-400 mb-1">📊 Forma</p>
                        <p class="text-2xl font-bold ${this.getFormColor(stats.currentForm)}">${this.getFormLabel(stats.currentForm)}</p>
                        <p class="text-xs text-gray-500">Best: ${stats.bestForm}</p>
                    </div>
                    
                </div>
                
                <!-- Abilità Attivate -->
                ${topAbilities.length > 0 ? `
                <div class="abilities-stats mb-4 bg-gray-900 p-3 rounded">
                    <h4 class="text-sm font-bold text-yellow-400 mb-2">⚡ Abilità Più Usate</h4>
                    ${topAbilities.map(([ability, count]) => `
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-300">${this.getAbilityLabel(ability)}</span>
                            <span class="text-yellow-400 font-bold">${count}x</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                <!-- Performance Bar -->
                <div class="performance-bar">
                    <p class="text-xs text-gray-400 mb-2">Performance Generale</p>
                    <div class="w-full bg-gray-700 rounded-full h-3">
                        <div class="h-3 rounded-full ${this.getPerformanceColor(stats.avgPerformance)}" 
                             style="width: ${Math.min((stats.avgPerformance / 10) * 100, 100)}%"></div>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                        ${stats.avgPerformance < 3 ? 'Scarso' : 
                          stats.avgPerformance < 5 ? 'Sufficiente' : 
                          stats.avgPerformance < 7 ? 'Buono' : 
                          stats.avgPerformance < 9 ? 'Ottimo' : 'Eccellente'}
                    </p>
                </div>
                
            </div>
        `;
    },
    
    /**
     * Mostra classifica statistiche
     */
    renderStatsLeaderboard(allStats, category) {
        let sorted = [];
        let title = '';
        let icon = '';
        
        switch(category) {
            case 'goals':
                sorted = [...allStats].sort((a, b) => b.goalsScored - a.goalsScored).slice(0, 10);
                title = '⚽ Top Marcatori';
                break;
            case 'assists':
                sorted = [...allStats].sort((a, b) => b.assists - a.assists).slice(0, 10);
                title = '🎯 Top Assist';
                break;
            case 'mvp':
                sorted = [...allStats].sort((a, b) => b.mvpCount - a.mvpCount).slice(0, 10);
                title = '🏆 Top MVP';
                break;
            case 'performance':
                sorted = [...allStats].sort((a, b) => b.avgPerformance - a.avgPerformance).slice(0, 10);
                title = '📊 Top Performance';
                break;
            case 'cleansheet':
                sorted = [...allStats]
                    .filter(s => s.role === 'P')
                    .sort((a, b) => b.cleanSheets - a.cleanSheets)
                    .slice(0, 10);
                title = '🧤 Top Portieri';
                break;
        }
        
        if (sorted.length === 0) {
            return `<p class="text-gray-400 text-center">Nessun dato disponibile</p>`;
        }
        
        return `
            <div class="stats-leaderboard bg-gray-800 rounded-lg p-4">
                <h3 class="text-xl font-bold text-yellow-400 mb-4">${title}</h3>
                <div class="space-y-2">
                    ${sorted.map((stats, index) => {
                        let value = '';
                        switch(category) {
                            case 'goals': value = stats.goalsScored; break;
                            case 'assists': value = stats.assists; break;
                            case 'mvp': value = stats.mvpCount; break;
                            case 'performance': value = stats.avgPerformance.toFixed(1); break;
                            case 'cleansheet': value = stats.cleanSheets; break;
                        }
                        
                        return `
                            <div class="flex items-center justify-between p-2 bg-gray-900 rounded ${index < 3 ? 'border-2 border-yellow-500' : ''}">
                                <div class="flex items-center gap-3">
                                    <span class="text-2xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-600' : 'text-gray-500'}">
                                        ${index + 1}
                                    </span>
                                    <div>
                                        <p class="font-bold text-white">${stats.playerName}</p>
                                        <p class="text-xs text-gray-400">${this.getRoleLabel(stats.role)}</p>
                                    </div>
                                </div>
                                <span class="text-2xl font-bold text-green-400">${value}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },
    
    /**
     * Helper functions
     */
    normalizeAbilityKey(ability) {
        const map = {
            'Regista': 'regista',
            'Antifurto': 'antifurto',
            'Bomber': 'bomber',
            'Muro': 'muro',
            'Uscita Kamikaze': 'kamikaze',
            'Motore': 'motore',
            'Pivot': 'pivot',
            'Guardia': 'guardia',
            'Bandiera del club': 'bandiera',
            'Tocco Di Velluto': 'toccoVelluto',
            'Doppio: Scatto': 'doppioScatto',
            'Teletrasporto': 'teletrasporto',
            'Contrasto Durissimo': 'contrastoDurissimo',
            'Pugno di ferro': 'punDiFerro',
            'Fortunato': 'fortunato',
            'Effetto Caos': 'caos'
        };
        return map[ability] || ability.toLowerCase().replace(/[^a-z]/g, '');
    },
    
    getRoleLabel(role) {
        const labels = {
            'P': 'Portiere',
            'D': 'Difensore',
            'C': 'Centrocampista',
            'A': 'Attaccante'
        };
        return labels[role] || role;
    },
    
    getFormColor(form) {
        if (form >= 2) return 'text-green-400';
        if (form >= 1) return 'text-blue-400';
        if (form <= -2) return 'text-red-400';
        if (form <= -1) return 'text-orange-400';
        return 'text-gray-400';
    },
    
    getFormLabel(form) {
        if (form >= 2) return '🔥 Ottima';
        if (form >= 1) return '👍 Buona';
        if (form === 0) return '😐 Normale';
        if (form >= -1) return '👎 Calo';
        return '❄️ Pessima';
    },
    
    getPerformanceColor(avg) {
        if (avg >= 7) return 'bg-green-500';
        if (avg >= 5) return 'bg-blue-500';
        if (avg >= 3) return 'bg-yellow-500';
        return 'bg-red-500';
    },
    
    getAbilityLabel(key) {
        const labels = {
            regista: '🎯 Regista',
            antifurto: '🛡️ Antifurto',
            bomber: '💥 Bomber',
            muro: '🧱 Muro',
            kamikaze: '🤯 Kamikaze',
            motore: '⚙️ Motore',
            pivot: '🔄 Pivot',
            guardia: '🛡️ Guardia',
            bandiera: '🚩 Bandiera',
            toccoVelluto: '✨ Tocco Velluto',
            doppioScatto: '⚡ Doppio Scatto',
            teletrasporto: '🌀 Teletrasporto',
            contrastoDurissimo: '💪 Contrasto Durissimo',
            punDiFerro: '🥊 Pugno Ferro',
            fortunato: '🍀 Fortunato',
            caos: '🎲 Effetto Caos'
        };
        return labels[key] || key;
    },

    // ====================================================================
    // METODO PER REGISTRARE STATS DI SQUADRA DOPO PARTITA
    // ====================================================================

    /**
     * Registra statistiche per tutti i giocatori di una squadra dopo una partita.
     * @param {string} teamId - ID squadra
     * @param {Object} teamData - Dati squadra (con formation.titolari)
     * @param {Object} matchInfo - Info partita { opponentId, opponentName, goalsFor, goalsAgainst, isHome, matchType }
     */
    async recordTeamMatchStats(teamId, teamData, matchInfo) {
        const { doc, getDoc, setDoc, writeBatch } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const titolari = teamData.formation?.titolari || [];
        const panchina = teamData.formation?.panchina || [];

        if (titolari.length === 0) {
            console.warn('[PlayerStats] Nessun titolare, skip registrazione stats');
            return;
        }

        // Determina risultato
        const goalsFor = matchInfo.goalsFor;
        const goalsAgainst = matchInfo.goalsAgainst;
        const outcome = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw';
        const cleanSheet = goalsAgainst === 0;

        // Assegna gol e assist usando logica pesata (come PlayerSeasonStats)
        const goalAssignments = this.assignGoalsAndAssists(titolari, goalsFor, teamData.teamName, teamId);

        // Crea batch per ottimizzare scritture
        const batch = writeBatch(db);
        const statsBasePath = `artifacts/${appId}/public/data/teams/${teamId}/playerStats`;

        // Calcola rating base per risultato
        const baseRating = outcome === 'win' ? 6.5 : outcome === 'draw' ? 6.0 : 5.5;

        for (const player of titolari) {
            // Skip giocatori senza ID valido
            if (!player || !player.id) {
                console.warn('[PlayerStats] Giocatore senza ID, skip');
                continue;
            }

            const playerId = player.id || `unknown_${Date.now()}`;
            const playerName = player.name || 'Giocatore';
            const playerRole = player.role || 'C';

            const statsPath = `${statsBasePath}/${playerId}`;
            const statsRef = doc(db, statsPath);

            // Carica stats esistenti
            const statsDoc = await getDoc(statsRef);
            let stats = statsDoc.exists() ? statsDoc.data() : this.initPlayerStats(playerId, playerName, playerRole);

            // Aggiungi matchHistory se non esiste
            if (!stats.matchHistory) {
                stats.matchHistory = [];
            }

            // Trova gol/assist assegnati a questo giocatore
            const playerGoals = goalAssignments.filter(g => g.scorerId === playerId).length;
            const playerAssists = goalAssignments.filter(g => g.assisterId === playerId).length;

            // Calcola rating individuale
            let playerRating = baseRating;
            playerRating += playerGoals * 1.0;  // +1 per gol
            playerRating += playerAssists * 0.5; // +0.5 per assist
            if (playerRole === 'P' && cleanSheet) playerRating += 1.0; // +1 per clean sheet
            playerRating = Math.max(4.0, Math.min(10.0, playerRating + (Math.random() - 0.5))); // Variazione

            // Aggiorna stats cumulative
            stats.matchesPlayed = (stats.matchesPlayed || 0) + 1;
            stats.matchesStarting = (stats.matchesStarting || 0) + 1;
            stats.goalsScored = (stats.goalsScored || 0) + playerGoals;
            stats.assists = (stats.assists || 0) + playerAssists;

            if (playerRole === 'P') {
                if (cleanSheet) stats.cleanSheets = (stats.cleanSheets || 0) + 1;
                // Stima parate: gol subiti +2 random se non clean sheet
                if (!cleanSheet) stats.saves = (stats.saves || 0) + goalsAgainst + Math.floor(Math.random() * 3);
            }

            // Performance media
            stats.totalContribution = (stats.totalContribution || 0) + playerRating;
            stats.avgPerformance = stats.totalContribution / stats.matchesPlayed;

            // Determina MVP (il giocatore con rating piu alto)
            // Per ora semplificato: chi ha fatto piu gol e' MVP
            const isMVP = playerGoals > 0 && playerGoals === Math.max(...goalAssignments.map(g =>
                goalAssignments.filter(x => x.scorerId === g.scorerId).length));
            if (isMVP) stats.mvpCount = (stats.mvpCount || 0) + 1;

            // Aggiungi a storico partite (max 30)
            const matchRecord = {
                matchId: `${matchInfo.matchType || 'match'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                date: new Date().toISOString(),
                type: matchInfo.matchType || 'campionato',
                opponent: {
                    id: matchInfo.opponentId || 'unknown',
                    name: matchInfo.opponentName || 'Avversario'
                },
                result: {
                    goalsFor: goalsFor || 0,
                    goalsAgainst: goalsAgainst || 0,
                    isHome: matchInfo.isHome || false,
                    outcome: outcome || 'draw'
                },
                performance: {
                    isStarting: true,
                    rating: parseFloat(playerRating.toFixed(1)),
                    goalsScored: playerGoals || 0,
                    assists: playerAssists || 0,
                    isMVP: isMVP || false
                }
            };
            // Aggiungi cleanSheet solo per portieri
            if (playerRole === 'P') {
                matchRecord.performance.cleanSheet = cleanSheet || false;
            }

            stats.matchHistory.unshift(matchRecord);
            if (stats.matchHistory.length > 30) {
                stats.matchHistory = stats.matchHistory.slice(0, 30);
            }

            stats.lastUpdated = Date.now();

            batch.set(statsRef, stats);
        }

        // Registra anche i panchinari (con stats ridotte)
        for (const player of panchina) {
            // Skip giocatori senza ID valido
            if (!player || !player.id) {
                console.warn('[PlayerStats] Panchinaro senza ID, skip');
                continue;
            }

            const playerId = player.id || `unknown_${Date.now()}`;
            const playerName = player.name || 'Giocatore';
            const playerRole = player.role || 'C';

            const statsPath = `${statsBasePath}/${playerId}`;
            const statsRef = doc(db, statsPath);

            const statsDoc = await getDoc(statsRef);
            let stats = statsDoc.exists() ? statsDoc.data() : this.initPlayerStats(playerId, playerName, playerRole);

            if (!stats.matchHistory) stats.matchHistory = [];

            stats.matchesPlayed = (stats.matchesPlayed || 0) + 1;
            stats.matchesBench = (stats.matchesBench || 0) + 1;
            stats.lastUpdated = Date.now();

            batch.set(statsRef, stats);
        }

        try {
            await batch.commit();
            console.log(`[PlayerStats] Stats registrate per ${titolari.length} titolari + ${panchina.length} panchinari`);
        } catch (error) {
            console.error('[PlayerStats] Errore batch commit:', error);
        }
    },

    /**
     * Assegna gol e assist ai giocatori con probabilita pesate.
     * @returns {Array} Array di { scorerId, scorerName, assisterId, assisterName }
     */
    assignGoalsAndAssists(titolari, numGoals, teamName, teamId) {
        const assignments = [];

        const attaccanti = titolari.filter(p => p.role === 'A');
        const centrocampisti = titolari.filter(p => p.role === 'C');
        const difensori = titolari.filter(p => p.role === 'D');
        const portieri = titolari.filter(p => p.role === 'P');

        for (let i = 0; i < numGoals; i++) {
            let scorer = null;
            let assister = null;

            // Selezione marcatore: 70% A, 25% C, 4% D, 1% P
            const scorerRoll = Math.random() * 100;
            if (scorerRoll < 70 && attaccanti.length > 0) {
                scorer = attaccanti[Math.floor(Math.random() * attaccanti.length)];
            } else if (scorerRoll < 95 && centrocampisti.length > 0) {
                scorer = centrocampisti[Math.floor(Math.random() * centrocampisti.length)];
            } else if (scorerRoll < 99 && difensori.length > 0) {
                scorer = difensori[Math.floor(Math.random() * difensori.length)];
            } else if (portieri.length > 0) {
                scorer = portieri[Math.floor(Math.random() * portieri.length)];
            } else {
                scorer = titolari[Math.floor(Math.random() * titolari.length)];
            }

            // Selezione assistman: 60% C, 30% A, 10% D (mai P, mai stesso del scorer)
            const possibleAssisters = titolari.filter(p => p.id !== scorer?.id && p.role !== 'P');
            if (possibleAssisters.length > 0 && Math.random() > 0.2) { // 80% ha assist
                const assisterRoll = Math.random() * 100;
                const cList = possibleAssisters.filter(p => p.role === 'C');
                const aList = possibleAssisters.filter(p => p.role === 'A');
                const dList = possibleAssisters.filter(p => p.role === 'D');

                if (assisterRoll < 60 && cList.length > 0) {
                    assister = cList[Math.floor(Math.random() * cList.length)];
                } else if (assisterRoll < 90 && aList.length > 0) {
                    assister = aList[Math.floor(Math.random() * aList.length)];
                } else if (dList.length > 0) {
                    assister = dList[Math.floor(Math.random() * dList.length)];
                }
            }

            if (scorer) {
                assignments.push({
                    scorerId: scorer.id,
                    scorerName: scorer.name,
                    assisterId: assister?.id || null,
                    assisterName: assister?.name || null
                });
            }
        }

        return assignments;
    },

    // ====================================================================
    // NUOVO: STATISTICHE REALI DA MATCH EVENTS
    // ====================================================================

    /**
     * Seleziona un giocatore in base alle probabilità per ruolo.
     * @param {Array} players - Array di giocatori disponibili
     * @param {Object} weights - Pesi per ruolo { D: 0.25, C: 0.70, A: 0.05 }
     * @returns {Object|null} - Giocatore selezionato
     */
    selectPlayerByWeight(players, weights) {
        if (!players || players.length === 0) return null;

        // Raggruppa giocatori per ruolo
        const byRole = { D: [], C: [], A: [], P: [] };
        players.forEach(p => {
            const role = p.role || 'C';
            if (byRole[role]) byRole[role].push(p);
        });

        // Calcola pesi effettivi (solo per ruoli presenti)
        const availableRoles = [];
        let totalWeight = 0;
        for (const [role, weight] of Object.entries(weights)) {
            if (byRole[role] && byRole[role].length > 0) {
                availableRoles.push({ role, weight, players: byRole[role] });
                totalWeight += weight;
            }
        }

        if (availableRoles.length === 0) return null;

        // Normalizza pesi e seleziona ruolo
        const roll = Math.random() * totalWeight;
        let cumulative = 0;
        let selectedRole = availableRoles[0];

        for (const entry of availableRoles) {
            cumulative += entry.weight;
            if (roll <= cumulative) {
                selectedRole = entry;
                break;
            }
        }

        // Seleziona un giocatore random dal ruolo scelto
        const rolePlayers = selectedRole.players;
        return rolePlayers[Math.floor(Math.random() * rolePlayers.length)];
    },

    /**
     * Estrae statistiche REALI dai matchEvents della simulazione.
     * Usa probabilità pesate per ruolo come da regolamento:
     * - COSTRUZIONE (attacco): D 25%, C 70%, A 5%
     * - ATTACCO (difesa per contrasto): D 50%, C 45%, A 5%
     * - TIRO (marcatore): A 75%, C 15%, D 5%
     *
     * @param {Array} matchEvents - Array di eventi dalle occasioni
     * @param {string} teamId - ID della squadra per cui estrarre le stats
     * @param {string} teamName - Nome della squadra
     * @returns {Object} - { goals, assists, interceptions, saves, passesSuccessful, passesFailed }
     */
    extractStatsFromEvents(matchEvents, teamId, teamName) {
        const stats = {
            goals: [],           // [{playerId, playerName}]
            assists: [],         // [{playerId, playerName}]
            interceptions: [],   // [{playerId, playerName}] - contrasti riusciti (blocchi)
            saves: [],           // [{playerId, playerName}] - parate
            passesSuccessful: [],// [{playerId, playerName}] - passaggi riusciti (costruzione)
            passesFailed: []     // [{playerId, playerName}] - passaggi falliti (costruzione)
        };

        if (!matchEvents || matchEvents.length === 0) return stats;

        matchEvents.forEach(event => {
            // Determina se la squadra sta attaccando
            const isTeamAttacking = event.teamName === teamName ||
                                   event.attackingTeam === teamName;
            const isTeamDefending = !isTeamAttacking;

            // ===== NUOVO FORMATO (simulate.js automation): phases è un array =====
            if (Array.isArray(event.phases)) {
                event.phases.forEach(phase => {
                    const playerName = phase.player || 'Giocatore';

                    if (isTeamAttacking) {
                        // Squadra attacca
                        if (phase.phase === 'costruzione') {
                            if (phase.success) {
                                stats.passesSuccessful.push({ playerName, playerRole: 'C' });
                            } else {
                                stats.passesFailed.push({ playerName, playerRole: 'C' });
                            }
                        }
                    } else {
                        // Squadra difende - se l'attacco fallisce, è un blocco
                        if ((phase.phase === 'attacco' || phase.phase === 'costruzione') && !phase.success) {
                            // Prova a ottenere il nome del difensore dalla fase
                            const defenderName = phase.defender || 'Difensore';
                            stats.interceptions.push({ playerName: defenderName, playerRole: 'D' });
                        }
                    }
                });

                // Gol e assist dal nuovo formato
                if (event.isGoal && isTeamAttacking) {
                    const scorerName = event.scorer || 'Attaccante';
                    stats.goals.push({ playerName: scorerName, playerRole: 'A' });

                    // Assist se presente
                    if (event.assist) {
                        stats.assists.push({ playerName: event.assist, playerRole: 'C' });
                    }
                }

                // Parata se non gol e squadra difende
                if (!event.isGoal && isTeamDefending && event.phases.some(p => p.phase === 'tiro')) {
                    stats.saves.push({ playerName: 'Portiere', playerRole: 'P' });
                }

                return; // Finito con il nuovo formato
            }

            // ===== VECCHIO FORMATO (client simulation): phases è un oggetto =====
            const construction = event.phases?.construction;
            if (construction && !construction.skipped) {
                if (isTeamAttacking) {
                    const attackers = construction.players?.attacker || [];
                    if (attackers.length > 0) {
                        const player = this.selectPlayerByWeight(attackers, { D: 0.25, C: 0.70, A: 0.05 });
                        if (player) {
                            if (construction.result === 'success' || construction.result === 'lucky') {
                                stats.passesSuccessful.push({ playerName: player.name, playerRole: player.role });
                            } else if (construction.result === 'fail') {
                                stats.passesFailed.push({ playerName: player.name, playerRole: player.role });
                            }
                        }
                    }
                }
            }

            const attack = event.phases?.attack;
            if (attack && !attack.interrupted) {
                if (isTeamDefending) {
                    if (attack.result === 'fail') {
                        const defenders = attack.players?.defender || [];
                        if (defenders.length > 0) {
                            const player = this.selectPlayerByWeight(defenders, { D: 0.50, C: 0.45, A: 0.05 });
                            if (player) {
                                stats.interceptions.push({ playerName: player.name, playerRole: player.role });
                            }
                        }
                    }
                }
            }

            const shot = event.phases?.shot;
            if (shot) {
                if (isTeamAttacking && event.result === 'goal') {
                    const attackers = attack?.players?.attacker || [];
                    const scorer = this.selectPlayerByWeight(attackers, { A: 0.75, C: 0.15, D: 0.05 });

                    if (scorer) {
                        stats.goals.push({ playerName: scorer.name, playerRole: scorer.role });

                        const potentialAssisters = attackers.filter(p => p.name !== scorer.name);
                        if (potentialAssisters.length > 0) {
                            const assister = this.selectPlayerByWeight(potentialAssisters, { C: 0.45, A: 0.50, D: 0.05 });
                            if (assister) {
                                stats.assists.push({ playerName: assister.name, playerRole: assister.role });
                            }
                        }
                    }
                }

                // PARATA: solo se la squadra difende e il portiere para
                if (isTeamDefending && shot.goalkeeper) {
                    const saveResults = ['save', 'draw_save', 'miracolo_save'];
                    if (saveResults.includes(shot.result)) {
                        stats.saves.push({
                            playerName: shot.goalkeeper.name,
                            playerRole: 'P'
                        });
                    }
                }
            }
        });

        return stats;
    },

    /**
     * Registra statistiche per una squadra usando i dati REALI dai matchEvents.
     * Sostituisce/integra recordTeamMatchStats per usare dati reali.
     *
     * @param {string} teamId - ID squadra
     * @param {Object} teamData - Dati squadra (con formation.titolari e players)
     * @param {Object} matchInfo - { opponentId, opponentName, goalsFor, goalsAgainst, isHome, matchType }
     * @param {Array} matchEvents - Array di eventi dalla simulazione
     */
    async recordMatchStatsFromEvents(teamId, teamData, matchInfo, matchEvents) {
        const { doc, getDoc, setDoc, writeBatch } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const titolari = teamData.formation?.titolari || [];
        const panchina = teamData.formation?.panchina || [];
        const teamName = teamData.teamName || 'Squadra';

        if (titolari.length === 0) {
            console.warn('[PlayerStats] Nessun titolare, skip registrazione stats');
            return;
        }

        // Estrai statistiche reali dai matchEvents
        const realStats = this.extractStatsFromEvents(matchEvents, teamId, teamName);
        console.log(`[PlayerStats] Stats reali estratte per ${teamName}:`, {
            goals: realStats.goals.length,
            assists: realStats.assists.length,
            interceptions: realStats.interceptions.length,
            saves: realStats.saves.length,
            passesSuccessful: realStats.passesSuccessful.length,
            passesFailed: realStats.passesFailed.length
        });

        // Determina risultato
        const goalsFor = matchInfo.goalsFor;
        const goalsAgainst = matchInfo.goalsAgainst;
        const outcome = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw';
        const cleanSheet = goalsAgainst === 0;

        // Crea batch per ottimizzare scritture
        const batch = writeBatch(db);
        const statsBasePath = `artifacts/${appId}/public/data/teams/${teamId}/playerStats`;

        // Calcola rating base per risultato
        const baseRating = outcome === 'win' ? 6.5 : outcome === 'draw' ? 6.0 : 5.5;

        // Mappa per contare stats per giocatore
        const playerStatsMap = new Map();

        // Conta goal per giocatore
        realStats.goals.forEach(g => {
            const key = g.playerName;
            if (!playerStatsMap.has(key)) playerStatsMap.set(key, { goals: 0, assists: 0, interceptions: 0, saves: 0, passesOk: 0, passesFail: 0 });
            playerStatsMap.get(key).goals++;
        });

        // Conta assist per giocatore
        realStats.assists.forEach(a => {
            const key = a.playerName;
            if (!playerStatsMap.has(key)) playerStatsMap.set(key, { goals: 0, assists: 0, interceptions: 0, saves: 0, passesOk: 0, passesFail: 0 });
            playerStatsMap.get(key).assists++;
        });

        // Conta contrasti per giocatore
        realStats.interceptions.forEach(i => {
            const key = i.playerName;
            if (!playerStatsMap.has(key)) playerStatsMap.set(key, { goals: 0, assists: 0, interceptions: 0, saves: 0, passesOk: 0, passesFail: 0 });
            playerStatsMap.get(key).interceptions++;
        });

        // Conta parate per giocatore
        realStats.saves.forEach(s => {
            const key = s.playerName;
            if (!playerStatsMap.has(key)) playerStatsMap.set(key, { goals: 0, assists: 0, interceptions: 0, saves: 0, passesOk: 0, passesFail: 0 });
            playerStatsMap.get(key).saves++;
        });

        // Conta passaggi riusciti
        realStats.passesSuccessful.forEach(p => {
            const key = p.playerName;
            if (!playerStatsMap.has(key)) playerStatsMap.set(key, { goals: 0, assists: 0, interceptions: 0, saves: 0, passesOk: 0, passesFail: 0 });
            playerStatsMap.get(key).passesOk++;
        });

        // Conta passaggi falliti
        realStats.passesFailed.forEach(p => {
            const key = p.playerName;
            if (!playerStatsMap.has(key)) playerStatsMap.set(key, { goals: 0, assists: 0, interceptions: 0, saves: 0, passesOk: 0, passesFail: 0 });
            playerStatsMap.get(key).passesFail++;
        });

        // Processa ogni titolare
        for (const player of titolari) {
            if (!player || !player.id) continue;

            const playerId = player.id;
            const playerName = player.name || 'Giocatore';
            const playerRole = player.role || 'C';

            const statsPath = `${statsBasePath}/${playerId}`;
            const statsRef = doc(db, statsPath);

            // Carica stats esistenti
            const statsDoc = await getDoc(statsRef);
            let stats = statsDoc.exists() ? statsDoc.data() : this.initPlayerStats(playerId, playerName, playerRole);

            if (!stats.matchHistory) stats.matchHistory = [];

            // Ottieni stats reali per questo giocatore
            const playerRealStats = playerStatsMap.get(playerName) || { goals: 0, assists: 0, interceptions: 0, saves: 0, passesOk: 0, passesFail: 0 };

            // Calcola rating individuale basato su azioni reali
            let playerRating = baseRating;
            playerRating += playerRealStats.goals * 1.0;        // +1 per gol
            playerRating += playerRealStats.assists * 0.5;      // +0.5 per assist
            playerRating += playerRealStats.interceptions * 0.3; // +0.3 per contrasto
            playerRating += playerRealStats.saves * 0.4;        // +0.4 per parata
            playerRating += playerRealStats.passesOk * 0.1;     // +0.1 per passaggio riuscito
            playerRating -= playerRealStats.passesFail * 0.1;   // -0.1 per passaggio fallito
            if (playerRole === 'P' && cleanSheet) playerRating += 1.0;
            playerRating = Math.max(4.0, Math.min(10.0, playerRating + (Math.random() - 0.5) * 0.5));

            // Aggiorna stats cumulative
            stats.matchesPlayed = (stats.matchesPlayed || 0) + 1;
            stats.matchesStarting = (stats.matchesStarting || 0) + 1;
            stats.goalsScored = (stats.goalsScored || 0) + playerRealStats.goals;
            stats.assists = (stats.assists || 0) + playerRealStats.assists;
            stats.interceptions = (stats.interceptions || 0) + playerRealStats.interceptions;
            stats.successfulPasses = (stats.successfulPasses || 0) + playerRealStats.passesOk;
            stats.failedPasses = (stats.failedPasses || 0) + playerRealStats.passesFail;

            if (playerRole === 'P') {
                stats.saves = (stats.saves || 0) + playerRealStats.saves;
                if (cleanSheet) stats.cleanSheets = (stats.cleanSheets || 0) + 1;
            }

            // Performance media
            stats.totalContribution = (stats.totalContribution || 0) + playerRating;
            stats.avgPerformance = stats.totalContribution / stats.matchesPlayed;

            // MVP: chi ha il rating più alto nella partita
            const isMVP = playerRealStats.goals >= 2 || (playerRealStats.goals >= 1 && playerRealStats.assists >= 1);
            if (isMVP) stats.mvpCount = (stats.mvpCount || 0) + 1;

            // Aggiungi a storico partite
            const matchRecord = {
                matchId: `${matchInfo.matchType || 'match'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                date: new Date().toISOString(),
                type: matchInfo.matchType || 'campionato',
                opponent: {
                    id: matchInfo.opponentId || 'unknown',
                    name: matchInfo.opponentName || 'Avversario'
                },
                result: {
                    goalsFor: goalsFor || 0,
                    goalsAgainst: goalsAgainst || 0,
                    isHome: matchInfo.isHome || false,
                    outcome: outcome || 'draw'
                },
                performance: {
                    isStarting: true,
                    rating: parseFloat(playerRating.toFixed(1)),
                    goalsScored: playerRealStats.goals,
                    assists: playerRealStats.assists,
                    interceptions: playerRealStats.interceptions,
                    saves: playerRealStats.saves,
                    passesSuccessful: playerRealStats.passesOk,
                    passesFailed: playerRealStats.passesFail,
                    isMVP: isMVP
                }
            };

            if (playerRole === 'P') {
                matchRecord.performance.cleanSheet = cleanSheet;
            }

            stats.matchHistory.unshift(matchRecord);
            if (stats.matchHistory.length > 30) {
                stats.matchHistory = stats.matchHistory.slice(0, 30);
            }

            stats.lastUpdated = Date.now();
            batch.set(statsRef, stats);
        }

        // Registra anche i panchinari
        for (const player of panchina) {
            if (!player || !player.id) continue;

            const playerId = player.id;
            const playerName = player.name || 'Giocatore';
            const playerRole = player.role || 'C';

            const statsPath = `${statsBasePath}/${playerId}`;
            const statsRef = doc(db, statsPath);

            const statsDoc = await getDoc(statsRef);
            let stats = statsDoc.exists() ? statsDoc.data() : this.initPlayerStats(playerId, playerName, playerRole);

            if (!stats.matchHistory) stats.matchHistory = [];

            stats.matchesPlayed = (stats.matchesPlayed || 0) + 1;
            stats.matchesBench = (stats.matchesBench || 0) + 1;
            stats.lastUpdated = Date.now();

            batch.set(statsRef, stats);
        }

        try {
            await batch.commit();
            console.log(`[PlayerStats] Stats REALI registrate per ${titolari.length} titolari + ${panchina.length} panchinari di ${teamName}`);
        } catch (error) {
            console.error('[PlayerStats] Errore batch commit:', error);
        }
    },

    // ====================================================================
    // ADMIN: RESET STATISTICHE AVANZATE
    // ====================================================================

    /**
     * Resetta tutte le statistiche avanzate di tutte le squadre.
     * ATTENZIONE: Questa operazione è irreversibile!
     * @returns {Object} - { teamsReset, playersReset }
     */
    async resetAllAdvancedStats() {
        const { collection, getDocs, doc, deleteDoc, writeBatch } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const teamsPath = `artifacts/${appId}/public/data/teams`;
        const teamsSnapshot = await getDocs(collection(db, teamsPath));

        let teamsReset = 0;
        let playersReset = 0;

        for (const teamDoc of teamsSnapshot.docs) {
            const teamId = teamDoc.id;
            const playerStatsPath = `${teamsPath}/${teamId}/playerStats`;

            try {
                const playerStatsSnapshot = await getDocs(collection(db, playerStatsPath));

                if (playerStatsSnapshot.docs.length > 0) {
                    const batch = writeBatch(db);
                    let batchCount = 0;

                    for (const playerStatDoc of playerStatsSnapshot.docs) {
                        batch.delete(playerStatDoc.ref);
                        playersReset++;
                        batchCount++;

                        // Firestore batch limit è 500
                        if (batchCount >= 450) {
                            await batch.commit();
                            batchCount = 0;
                        }
                    }

                    if (batchCount > 0) {
                        await batch.commit();
                    }

                    teamsReset++;
                    console.log(`[PlayerStats] Reset stats per squadra ${teamId}: ${playerStatsSnapshot.docs.length} giocatori`);
                }
            } catch (error) {
                console.error(`[PlayerStats] Errore reset stats per squadra ${teamId}:`, error);
            }
        }

        console.log(`[PlayerStats] Reset completato: ${teamsReset} squadre, ${playersReset} giocatori`);
        return { teamsReset, playersReset };
    }
};

console.log("Player Stats caricato.");
