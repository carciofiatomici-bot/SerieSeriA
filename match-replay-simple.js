//
// ====================================================================
// MATCH-REPLAY-SIMPLE.JS - Replay Semplificato (Senza Modifica Simulazione)
// ====================================================================
//
// Questa versione mostra un replay basato solo sul risultato finale
// senza richiedere modifiche a simulazione.js
//

window.MatchReplaySimple = {
    
    isPlaying: false,
    currentSpeed: 1,
    
    /**
     * Genera e mostra replay basato sul risultato della partita
     */
    async playFromResult(homeTeam, awayTeam, homeGoals, awayGoals) {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.show();
        
        // Intro
        await this.showIntro(homeTeam, awayTeam);
        
        // Simula le azioni basandoci sui goal
        const totalGoals = homeGoals + awayGoals;
        
        for (let i = 0; i < totalGoals; i++) {
            const isHomeGoal = i < homeGoals;
            const teamScoring = isHomeGoal ? homeTeam : awayTeam;
            const teamDefending = isHomeGoal ? awayTeam : homeTeam;
            
            // Genera azione casuale realistica
            await this.showGoalSequence(teamScoring, teamDefending, i + 1);
            
            await this.wait(500 / this.currentSpeed);
        }
        
        // Mostra parate (partite senza goal o con pochi goal)
        if (totalGoals < 6) {
            const saves = 6 - totalGoals;
            for (let i = 0; i < Math.min(saves, 2); i++) {
                const randomTeam = Math.random() > 0.5 ? homeTeam : awayTeam;
                const randomOpponent = randomTeam === homeTeam ? awayTeam : homeTeam;
                await this.showSaveSequence(randomTeam, randomOpponent);
                await this.wait(500 / this.currentSpeed);
            }
        }
        
        // Risultato finale
        await this.showFinalScore(homeTeam, awayTeam, { home: homeGoals, away: awayGoals });
        
        // STATS: Track statistiche partita
        if (window.PlayerStats) {
            await this.trackMatchStats(homeTeam, awayTeam, homeGoals, awayGoals);
        }
        
        this.isPlaying = false;
    },
    
    /**
     * Mostra sequenza goal (3 fasi)
     */
    async showGoalSequence(attackTeam, defendTeam, goalNumber) {
        // Fase 1: Costruzione
        await this.showPhaseOne(attackTeam, defendTeam, true);
        await this.wait(1500 / this.currentSpeed);
        
        // Fase 2: Attacco
        await this.showPhaseTwo(attackTeam, defendTeam, true);
        await this.wait(1500 / this.currentSpeed);
        
        // Fase 3: Goal!
        await this.showPhaseThree(attackTeam, defendTeam, true, goalNumber);
        await this.wait(2000 / this.currentSpeed);
    },
    
    /**
     * Mostra sequenza parata
     */
    async showSaveSequence(attackTeam, defendTeam) {
        await this.showPhaseOne(attackTeam, defendTeam, true);
        await this.wait(1200 / this.currentSpeed);
        
        await this.showPhaseTwo(attackTeam, defendTeam, true);
        await this.wait(1200 / this.currentSpeed);
        
        await this.showPhaseThree(attackTeam, defendTeam, false, 0);
        await this.wait(1500 / this.currentSpeed);
    },
    
    /**
     * Fase 1: Costruzione
     */
    async showPhaseOne(attackTeam, defendTeam, success) {
        const dice1 = Math.floor(Math.random() * 20) + 1;
        const dice2 = Math.floor(Math.random() * 20) + 1;
        
        const hasSpecial = Math.random() < 0.1;
        const specialType = Math.random() > 0.5 ? 'regista' : 'antifurto';
        
        let content = `
            <div class="replay-action bg-gray-800 border-4 ${success ? 'border-green-500' : 'border-red-500'} rounded-lg p-6 animate-slide-in">
                <div class="text-center">
                    <div class="text-5xl mb-4">⚽</div>
                    <h3 class="text-2xl font-bold text-yellow-400 mb-4">FASE COSTRUZIONE</h3>
                    
                    <p class="text-lg text-white mb-4">
                        ${attackTeam.name} costruisce l'azione...
                    </p>
        `;
        
        if (hasSpecial && specialType === 'regista' && success) {
            content += `
                <div class="bg-purple-900 border-2 border-purple-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-purple-300">
                        🎯 REGISTA! Salta la costruzione!
                    </p>
                </div>
            `;
        } else if (hasSpecial && specialType === 'antifurto' && !success) {
            content += `
                <div class="bg-red-900 border-2 border-red-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-red-300">
                        🛡️ ANTIFURTO! Palla intercettata!
                    </p>
                </div>
            `;
        } else {
            content += `
                <div class="flex justify-center gap-8 mb-4">
                    <div class="text-center">
                        <p class="text-sm text-gray-400">Attacco</p>
                        <p class="text-3xl font-bold text-green-400">🎲 ${dice1}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-400">Difesa</p>
                        <p class="text-3xl font-bold text-red-400">🎲 ${dice2}</p>
                    </div>
                </div>
            `;
        }
        
        content += `
                    <div class="text-2xl font-bold ${success ? 'text-green-400' : 'text-red-400'}">
                        ${success ? '✅ COSTRUZIONE RIUSCITA!' : '❌ COSTRUZIONE FALLITA!'}
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(content);
    },
    
    /**
     * Fase 2: Attacco
     */
    async showPhaseTwo(attackTeam, defendTeam, success) {
        const attackPower = Math.floor(Math.random() * 10) + 15;
        const defensePower = Math.floor(Math.random() * 8) + 10;
        
        const hasMuro = Math.random() < 0.1;
        
        let content = `
            <div class="replay-action bg-gray-800 border-4 ${success ? 'border-green-500' : 'border-red-500'} rounded-lg p-6 animate-slide-in">
                <div class="text-center">
                    <div class="text-5xl mb-4">⚡</div>
                    <h3 class="text-2xl font-bold text-orange-400 mb-4">FASE ATTACCO</h3>
                    
                    <p class="text-lg text-white mb-4">
                        ${attackTeam.name} punta la porta!
                    </p>
        `;
        
        if (hasMuro) {
            content += `
                <div class="bg-blue-900 border-2 border-blue-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-blue-300">
                        🧱 MURO! Difesa raddoppiata!
                    </p>
                </div>
            `;
        }
        
        content += `
                    <div class="bg-gray-900 border-2 border-yellow-500 p-4 rounded-lg mb-4">
                        <div class="flex justify-center gap-8">
                            <div class="text-center">
                                <p class="text-sm text-gray-400">Forza Attacco</p>
                                <p class="text-4xl font-bold text-green-400">${attackPower}</p>
                            </div>
                            <div class="text-2xl font-bold text-white self-center">VS</div>
                            <div class="text-center">
                                <p class="text-sm text-gray-400">Forza Difesa</p>
                                <p class="text-4xl font-bold text-red-400">${defensePower}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-2xl font-bold ${success ? 'text-green-400' : 'text-red-400'}">
                        ${success ? `✅ DIFESA SUPERATA! (+${attackPower - defensePower})` : '❌ ATTACCO RESPINTO!'}
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(content);
    },
    
    /**
     * Fase 3: Tiro
     */
    async showPhaseThree(attackTeam, defendTeam, isGoal, goalNumber) {
        const shotPower = Math.floor(Math.random() * 8) + 10;
        const savePower = Math.floor(Math.random() * 6) + 5;
        
        const hasBomber = Math.random() < 0.15;
        
        let content = `
            <div class="replay-action bg-gray-800 border-4 ${isGoal ? 'border-yellow-500' : 'border-blue-500'} rounded-lg p-6 animate-slide-in">
                <div class="text-center">
                    <div class="text-5xl mb-4">🥅</div>
                    <h3 class="text-2xl font-bold text-red-400 mb-4">FASE TIRO</h3>
                    
                    <p class="text-lg text-white mb-4">
                        ${attackTeam.name} tira in porta!
                    </p>
        `;
        
        if (hasBomber && isGoal) {
            content += `
                <div class="bg-red-900 border-2 border-red-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-red-300">
                        💥 BOMBER! Tiro potenziato!
                    </p>
                </div>
            `;
        }
        
        content += `
                    <div class="bg-gray-900 border-2 border-purple-500 p-4 rounded-lg mb-4">
                        <div class="flex justify-center gap-8">
                            <div class="text-center">
                                <p class="text-sm text-gray-400">⚽ Potenza Tiro</p>
                                <p class="text-4xl font-bold text-yellow-400">${shotPower}</p>
                            </div>
                            <div class="text-2xl font-bold text-white self-center">VS</div>
                            <div class="text-center">
                                <p class="text-sm text-gray-400">🧤 ${defendTeam.name}</p>
                                <p class="text-4xl font-bold text-blue-400">${savePower}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-4xl font-bold ${isGoal ? 'text-yellow-400' : 'text-blue-400'} animate-bounce">
                        ${isGoal ? `⚽ GOOOOOL ${goalNumber}! 🎉🎉🎉` : `🧤 PARATA! ${defendTeam.name} salva!`}
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(content);
        
        if (isGoal) {
            await this.celebrateGoal();
        }
    },
    
    /**
     * Mostra intro
     */
    async showIntro(homeTeam, awayTeam) {
        const content = `
            <div class="replay-intro text-center animate-fade-in">
                <h2 class="text-4xl font-bold text-white mb-6">⚽ PARTITA IN CORSO</h2>
                <div class="flex items-center justify-center gap-8">
                    <div class="text-center">
                        ${this.getTeamLogo(homeTeam)}
                        <h3 class="text-2xl font-bold text-green-400 mt-2">${homeTeam.name}</h3>
                    </div>
                    <div class="text-5xl font-bold text-yellow-400">VS</div>
                    <div class="text-center">
                        ${this.getTeamLogo(awayTeam)}
                        <h3 class="text-2xl font-bold text-blue-400 mt-2">${awayTeam.name}</h3>
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(content);
        await this.wait(2000 / this.currentSpeed);
    },
    
    /**
     * Mostra risultato finale
     */
    async showFinalScore(homeTeam, awayTeam, score) {
        const winner = score.home > score.away ? homeTeam.name : 
                      score.away > score.home ? awayTeam.name : null;
        
        const content = `
            <div class="replay-final text-center animate-fade-in">
                <h2 class="text-3xl font-bold text-yellow-400 mb-6">RISULTATO FINALE</h2>
                <div class="flex items-center justify-center gap-12 mb-6">
                    <div class="text-center">
                        <h3 class="text-xl font-bold text-white mb-2">${homeTeam.name}</h3>
                        <div class="text-6xl font-bold ${score.home > score.away ? 'text-green-400' : 'text-gray-400'}">${score.home}</div>
                    </div>
                    <div class="text-4xl font-bold text-gray-400">-</div>
                    <div class="text-center">
                        <h3 class="text-xl font-bold text-white mb-2">${awayTeam.name}</h3>
                        <div class="text-6xl font-bold ${score.away > score.home ? 'text-green-400' : 'text-gray-400'}">${score.away}</div>
                    </div>
                </div>
                
                ${winner ? `<p class="text-2xl font-bold text-yellow-400 mb-4">🏆 Vince ${winner}!</p>` : '<p class="text-2xl font-bold text-gray-400 mb-4">Pareggio</p>'}
                
                <button id="replay-close" class="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                    Continua ✓
                </button>
            </div>
        `;
        
        this.updateContent(content);
        
        document.getElementById('replay-close')?.addEventListener('click', () => {
            this.hide();
        });
    },
    
    /**
     * Celebra goal
     */
    async celebrateGoal() {
        // Confetti opzionale
        if (window.confetti) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        await this.wait(1000 / this.currentSpeed);
    },
    
    /**
     * Helper functions
     */
    show() {
        const container = document.getElementById('match-replay-overlay');
        container?.classList.remove('hidden');
    },
    
    hide() {
        const container = document.getElementById('match-replay-overlay');
        container?.classList.add('hidden');
        this.isPlaying = false;
    },
    
    updateContent(html) {
        const contentEl = document.getElementById('replay-content');
        if (contentEl) {
            contentEl.innerHTML = html;
        }
    },
    
    getTeamLogo(team) {
        return window.getLogoHtml ? window.getLogoHtml(team.id) : 
            '<div class="w-16 h-16 bg-gray-700 rounded-full mx-auto"></div>';
    },
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    changeSpeed() {
        this.currentSpeed = this.currentSpeed === 1 ? 2 : this.currentSpeed === 2 ? 3 : 1;
        const btn = document.getElementById('replay-speed-btn');
        if (btn) {
            btn.textContent = `Velocità: ${this.currentSpeed}x`;
        }
    },
    
    /**
     * Traccia statistiche della partita
     */
    async trackMatchStats(homeTeam, awayTeam, homeGoals, awayGoals) {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            
            const homeTeamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams/${homeTeam.id}`));
            const awayTeamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams/${awayTeam.id}`));
            
            if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) return;
            
            const homeData = homeTeamDoc.data();
            const awayData = awayTeamDoc.data();
            
            // Track titolari home
            for (const player of homeData.formation?.titolari || []) {
                const matchData = {
                    playerName: player.name,
                    role: player.role,
                    isStarting: true,
                    goalsScored: player.role === 'A' ? Math.floor(Math.random() * (homeGoals + 1)) : 0,
                    assists: Math.random() < 0.3 ? 1 : 0,
                    goalsConceded: player.role === 'P' ? awayGoals : undefined,
                    saves: player.role === 'P' ? Math.floor(Math.random() * 3) : undefined,
                    constructionSuccess: Math.random() < 0.6,
                    constructionAttempt: true,
                    attackSuccess: Math.random() < 0.5,
                    attackAttempt: true,
                    contribution: 3 + Math.random() * 7,
                    form: player.currentLevel ? (player.currentLevel - player.level) : 0,
                    abilitiesActivated: this.randomAbilities(player.abilities),
                    isMVP: false
                };
                
                await window.PlayerStats.updateMatchStats(homeTeam.id, player.id, matchData);
            }
            
            // Track titolari away
            for (const player of awayData.formation?.titolari || []) {
                const matchData = {
                    playerName: player.name,
                    role: player.role,
                    isStarting: true,
                    goalsScored: player.role === 'A' ? Math.floor(Math.random() * (awayGoals + 1)) : 0,
                    assists: Math.random() < 0.3 ? 1 : 0,
                    goalsConceded: player.role === 'P' ? homeGoals : undefined,
                    saves: player.role === 'P' ? Math.floor(Math.random() * 3) : undefined,
                    constructionSuccess: Math.random() < 0.6,
                    constructionAttempt: true,
                    attackSuccess: Math.random() < 0.5,
                    attackAttempt: true,
                    contribution: 3 + Math.random() * 7,
                    form: player.currentLevel ? (player.currentLevel - player.level) : 0,
                    abilitiesActivated: this.randomAbilities(player.abilities),
                    isMVP: false
                };
                
                await window.PlayerStats.updateMatchStats(awayTeam.id, player.id, matchData);
            }
            
            console.log("✅ Statistiche partita tracciate");
            
        } catch (error) {
            console.error("Errore tracking statistiche:", error);
        }
    },
    
    /**
     * Genera abilità attivate casuali
     */
    randomAbilities(playerAbilities) {
        if (!playerAbilities || playerAbilities.length === 0) return [];
        
        const activated = [];
        for (const ability of playerAbilities) {
            if (Math.random() < 0.1) {
                activated.push(ability);
            }
        }
        return activated;
    }
};

console.log("✅ Match Replay Simple caricato.");
