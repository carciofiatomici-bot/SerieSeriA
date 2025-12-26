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
    currentMatchEvents: null, // Cache matchEvents per il replay

    /**
     * Genera e mostra replay basato sul risultato della partita
     * @param {Object} homeTeam - Squadra casa
     * @param {Object} awayTeam - Squadra trasferta
     * @param {number} homeGoals - Gol casa
     * @param {number} awayGoals - Gol trasferta
     * @param {Array} matchEvents - (opzionale) Eventi reali dalla simulazione
     */
    async playFromResult(homeTeam, awayTeam, homeGoals, awayGoals, matchEvents = null) {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.currentMatchEvents = matchEvents;
        this.show();

        // Intro
        await this.showIntro(homeTeam, awayTeam);

        // Se abbiamo matchEvents reali, usa quelli
        if (matchEvents && matchEvents.length > 0) {
            await this.playWithRealEvents(homeTeam, awayTeam, matchEvents);
        } else {
            // Fallback: genera azioni casuali
            const totalGoals = homeGoals + awayGoals;

            for (let i = 0; i < totalGoals; i++) {
                const isHomeGoal = i < homeGoals;
                const teamScoring = isHomeGoal ? homeTeam : awayTeam;
                const teamDefending = isHomeGoal ? awayTeam : homeTeam;

                await this.showGoalSequence(teamScoring, teamDefending, i + 1);
                await this.wait(500 / this.currentSpeed);
            }

            if (totalGoals < 6) {
                const saves = 6 - totalGoals;
                for (let i = 0; i < Math.min(saves, 2); i++) {
                    const randomTeam = Math.random() > 0.5 ? homeTeam : awayTeam;
                    const randomOpponent = randomTeam === homeTeam ? awayTeam : homeTeam;
                    await this.showSaveSequence(randomTeam, randomOpponent);
                    await this.wait(500 / this.currentSpeed);
                }
            }
        }

        // Risultato finale
        await this.showFinalScore(homeTeam, awayTeam, { home: homeGoals, away: awayGoals });

        // STATS: Track statistiche partita
        if (window.PlayerStats) {
            await this.trackMatchStats(homeTeam, awayTeam, homeGoals, awayGoals);
        }

        this.isPlaying = false;
        this.currentMatchEvents = null;
    },

    /**
     * Replay con eventi reali dalla simulazione
     */
    async playWithRealEvents(homeTeam, awayTeam, matchEvents) {
        // Filtra solo gol e occasioni importanti (max 8 per non annoiare)
        const goalEvents = matchEvents.filter(e => e.result === 'goal');
        const failedEvents = matchEvents.filter(e => e.result !== 'goal').slice(0, 3);

        // Mescola gol e occasioni fallite in ordine cronologico
        const eventsToShow = [...goalEvents, ...failedEvents]
            .sort((a, b) => a.occasionNumber - b.occasionNumber)
            .slice(0, 8);

        let goalCount = 0;

        for (const event of eventsToShow) {
            const isHome = event.side === 'home';
            const attackTeam = isHome ? homeTeam : awayTeam;
            const defendTeam = isHome ? awayTeam : homeTeam;
            const isGoal = event.result === 'goal';

            if (isGoal) goalCount++;

            // Mostra le 3 fasi con dati reali
            await this.showPhaseOneReal(attackTeam, defendTeam, event);
            await this.wait(1500 / this.currentSpeed);

            if (!event.phases?.construction?.result || event.phases.construction.result !== 'fail') {
                await this.showPhaseTwoReal(attackTeam, defendTeam, event);
                await this.wait(1500 / this.currentSpeed);

                if (!event.phases?.attack?.result || event.phases.attack.result !== 'fail') {
                    await this.showPhaseThreeReal(attackTeam, defendTeam, event, isGoal ? goalCount : 0);
                    await this.wait(2000 / this.currentSpeed);
                }
            }

            await this.wait(500 / this.currentSpeed);
        }
    },

    /**
     * Fase 1 con dati reali: mostra giocatori coinvolti
     */
    async showPhaseOneReal(attackTeam, defendTeam, event) {
        const phase = event.phases?.construction;
        if (!phase) return this.showPhaseOne(attackTeam, defendTeam, true);

        const success = phase.result === 'success' || phase.result === 'lucky' || phase.skipped;

        // Estrai nomi giocatori
        const attackers = phase.players?.attacker || [];
        const defenders = phase.players?.defender || [];
        const attackerNames = attackers.slice(0, 3).map(p => p.name).join(', ') || 'Centrocampo';
        const defenderNames = defenders.slice(0, 2).map(p => p.name).join(', ') || 'Difesa';

        let content = `
            <div class="replay-action bg-gray-800 border-4 ${success ? 'border-green-500' : 'border-red-500'} rounded-lg p-6 animate-slide-in">
                <div class="text-center">
                    <div class="text-5xl mb-4">⚽</div>
                    <h3 class="text-2xl font-bold text-yellow-400 mb-4">FASE COSTRUZIONE</h3>

                    <p class="text-lg text-white mb-2">
                        <span class="text-green-400 font-bold">${attackTeam.name}</span> costruisce l'azione
                    </p>
        `;

        if (phase.skipped) {
            content += `
                <div class="bg-purple-900 border-2 border-purple-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-purple-300">
                        🎯 ${phase.reason || 'SKIP'}! Azione diretta!
                    </p>
                </div>
            `;
        } else {
            content += `
                <div class="bg-gray-900 p-4 rounded-lg mb-4 space-y-3">
                    <div class="flex justify-between items-center">
                        <div class="text-left">
                            <p class="text-xs text-gray-400">ATTACCANO</p>
                            <p class="text-green-400 font-bold">${attackerNames}</p>
                        </div>
                        <div class="text-3xl">⚔️</div>
                        <div class="text-right">
                            <p class="text-xs text-gray-400">DIFENDONO</p>
                            <p class="text-red-400 font-bold">${defenderNames}</p>
                        </div>
                    </div>
                    <div class="flex justify-center gap-8">
                        <div class="text-center">
                            <p class="text-sm text-gray-400">Attacco</p>
                            <p class="text-3xl font-bold text-green-400">🎲 ${phase.rolls?.attacker || '?'}</p>
                            <p class="text-xs text-gray-500">Tot: ${phase.totals?.attacker?.toFixed(1) || '?'}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-sm text-gray-400">Difesa</p>
                            <p class="text-3xl font-bold text-red-400">🎲 ${phase.rolls?.defender || '?'}</p>
                            <p class="text-xs text-gray-500">Tot: ${phase.totals?.defender?.toFixed(1) || '?'}</p>
                        </div>
                    </div>
                </div>
            `;

            if (!success) {
                content += `
                    <div class="bg-red-900/50 p-3 rounded-lg mb-4">
                        <p class="text-red-300">
                            ❌ <span class="font-bold">${defenderNames}</span> intercetta l'azione!
                        </p>
                    </div>
                `;
            }
        }

        content += `
                    <div class="text-2xl font-bold ${success ? 'text-green-400' : 'text-red-400'}">
                        ${success ? '✅ COSTRUZIONE RIUSCITA!' : '❌ AZIONE FERMATA!'}
                    </div>
                </div>
            </div>
        `;

        this.updateContent(content);
    },

    /**
     * Fase 2 con dati reali: mostra attaccanti vs difensori
     */
    async showPhaseTwoReal(attackTeam, defendTeam, event) {
        const phase = event.phases?.attack;
        if (!phase) return this.showPhaseTwo(attackTeam, defendTeam, true);

        const success = phase.result === 'success' || phase.result === 'lucky';
        const interrupted = phase.interrupted;

        const attackers = phase.players?.attacker || [];
        const defenders = phase.players?.defender || [];
        const attackerNames = attackers.slice(0, 2).map(p => p.name).join(', ') || 'Attacco';
        const defenderNames = defenders.slice(0, 2).map(p => p.name).join(', ') || 'Difesa';

        let content = `
            <div class="replay-action bg-gray-800 border-4 ${success ? 'border-green-500' : 'border-red-500'} rounded-lg p-6 animate-slide-in">
                <div class="text-center">
                    <div class="text-5xl mb-4">⚡</div>
                    <h3 class="text-2xl font-bold text-orange-400 mb-4">FASE ATTACCO</h3>

                    <p class="text-lg text-white mb-2">
                        <span class="text-green-400 font-bold">${attackerNames}</span> punta la porta!
                    </p>
        `;

        if (interrupted) {
            content += `
                <div class="bg-red-900 border-2 border-red-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-red-300">
                        🛡️ ${phase.reason || 'ANTIFURTO'}! <span class="text-white">${defenderNames}</span> ruba palla!
                    </p>
                </div>
            `;
        } else {
            content += `
                <div class="bg-gray-900 p-4 rounded-lg mb-4 space-y-3">
                    <div class="flex justify-between items-center">
                        <div class="text-left">
                            <p class="text-xs text-gray-400">ATTACCANO</p>
                            <p class="text-green-400 font-bold">${attackerNames}</p>
                        </div>
                        <div class="text-3xl">💥</div>
                        <div class="text-right">
                            <p class="text-xs text-gray-400">DIFENDONO</p>
                            <p class="text-red-400 font-bold">${defenderNames}</p>
                        </div>
                    </div>
                    <div class="flex justify-center gap-8">
                        <div class="text-center">
                            <p class="text-sm text-gray-400">Forza Attacco</p>
                            <p class="text-4xl font-bold text-green-400">${phase.totals?.attacker?.toFixed(0) || '?'}</p>
                        </div>
                        <div class="text-2xl font-bold text-white self-center">VS</div>
                        <div class="text-center">
                            <p class="text-sm text-gray-400">Forza Difesa</p>
                            <p class="text-4xl font-bold text-red-400">${phase.totals?.defender?.toFixed(0) || '?'}</p>
                        </div>
                    </div>
                </div>
            `;

            if (!success) {
                content += `
                    <div class="bg-red-900/50 p-3 rounded-lg mb-4">
                        <p class="text-red-300">
                            ❌ <span class="font-bold">${defenderNames}</span> blocca l'attacco!
                        </p>
                    </div>
                `;
            }
        }

        content += `
                    <div class="text-2xl font-bold ${success ? 'text-green-400' : 'text-red-400'}">
                        ${success ? '✅ DIFESA SUPERATA!' : '❌ ATTACCO RESPINTO!'}
                    </div>
                </div>
            </div>
        `;

        this.updateContent(content);
    },

    /**
     * Fase 3 con dati reali: mostra tiratore vs portiere
     */
    async showPhaseThreeReal(attackTeam, defendTeam, event, goalNumber) {
        const phase = event.phases?.shot;
        if (!phase) return this.showPhaseThree(attackTeam, defendTeam, goalNumber > 0, goalNumber);

        const isGoal = ['goal', 'lucky_goal', 'draw_goal'].includes(phase.result);

        // Estrai nomi
        const shooter = phase.shooter || event.phases?.attack?.players?.attacker?.[0]?.name || 'Attaccante';
        const goalkeeper = phase.goalkeeper?.name || phase.goalkeeperName || 'Portiere';

        let content = `
            <div class="replay-action bg-gray-800 border-4 ${isGoal ? 'border-yellow-500' : 'border-blue-500'} rounded-lg p-6 animate-slide-in">
                <div class="text-center">
                    <div class="text-5xl mb-4">🥅</div>
                    <h3 class="text-2xl font-bold text-red-400 mb-4">FASE TIRO</h3>

                    <p class="text-lg text-white mb-4">
                        <span class="text-yellow-400 font-bold">${shooter}</span> tira in porta!
                    </p>

                    <div class="bg-gray-900 border-2 border-purple-500 p-4 rounded-lg mb-4">
                        <div class="flex justify-center gap-8 items-center">
                            <div class="text-center">
                                <p class="text-sm text-gray-400">⚽ Tiro</p>
                                <p class="text-4xl font-bold text-yellow-400">${phase.attackValue?.toFixed(0) || '?'}</p>
                                <p class="text-xs text-green-400">${shooter}</p>
                            </div>
                            <div class="text-2xl font-bold text-white">VS</div>
                            <div class="text-center">
                                <p class="text-sm text-gray-400">🧤 Parata</p>
                                <p class="text-4xl font-bold text-blue-400">${phase.totalGoalkeeper?.toFixed(0) || '?'}</p>
                                <p class="text-xs text-blue-400">${goalkeeper}</p>
                            </div>
                        </div>
                    </div>
        `;

        if (!isGoal) {
            content += `
                <div class="bg-blue-900/50 p-3 rounded-lg mb-4">
                    <p class="text-blue-300">
                        🧤 <span class="font-bold">${goalkeeper}</span> para il tiro di ${shooter}!
                    </p>
                </div>
            `;
        }

        content += `
                    <div class="text-4xl font-bold ${isGoal ? 'text-yellow-400' : 'text-blue-400'} animate-bounce">
                        ${isGoal ? `⚽ GOOOOOL! ${shooter} segna! 🎉` : `🧤 PARATA! ${goalkeeper} salva!`}
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

                <div class="flex gap-4 justify-center mt-6 flex-wrap">
                    ${window.FeatureFlags?.isEnabled('matchAnimations') ? `
                        <button id="replay-animation-full" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center gap-2">
                            <span>🎬</span> Animazione Completa
                        </button>
                    ` : ''}
                    ${window.FeatureFlags?.isEnabled('matchHighlights') ? `
                        <button id="replay-animation-highlights" class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center gap-2">
                            <span>⭐</span> Solo Highlights
                        </button>
                    ` : ''}
                    <button id="replay-close" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                        Continua ✓
                    </button>
                </div>
            </div>
        `;

        this.updateContent(content);

        // Bottone animazione 2D completa
        document.getElementById('replay-animation-full')?.addEventListener('click', () => {
            this.hide();
            if (window.MatchAnimations) {
                window.MatchAnimations.open({
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    result: `${score.home}-${score.away}`,
                    score: `${score.home}-${score.away}`,
                    highlightsOnly: false
                });
            }
        });

        // Bottone solo highlights
        document.getElementById('replay-animation-highlights')?.addEventListener('click', () => {
            this.hide();
            if (window.MatchAnimations) {
                window.MatchAnimations.open({
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    result: `${score.home}-${score.away}`,
                    score: `${score.home}-${score.away}`,
                    highlightsOnly: true
                });
            }
        });

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
    },

    // ====================================================================
    // SEZIONE: Espandi Eventi Partita (matchEvents UI)
    // ====================================================================

    /**
     * Genera HTML per il bottone "Espandi Eventi Partita"
     * @param {string} containerId - ID univoco per il container
     * @returns {string} HTML del bottone
     */
    getExpandEventsButton(containerId = 'match-events-container') {
        return `
            <button id="btn-expand-events-${containerId}"
                    class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 mx-auto mt-4">
                <span>📊</span> Espandi Eventi Partita
            </button>
            <div id="${containerId}" class="match-events-container hidden mt-4 max-h-96 overflow-y-auto"></div>
        `;
    },

    /**
     * Inizializza gli event listener per il bottone espandi eventi
     * @param {Array} matchEvents - Array degli eventi partita
     * @param {string} containerId - ID del container
     */
    initExpandEventsListener(matchEvents, containerId = 'match-events-container') {
        const btn = document.getElementById(`btn-expand-events-${containerId}`);
        const container = document.getElementById(containerId);

        if (!btn || !container) return;

        btn.addEventListener('click', () => {
            if (container.classList.contains('hidden')) {
                container.classList.remove('hidden');
                container.innerHTML = this.renderMatchEvents(matchEvents);
                btn.innerHTML = '<span>📊</span> Chiudi Eventi Partita';

                // Aggiungi listener per expand/collapse occasioni
                container.querySelectorAll('.occasion-header').forEach(header => {
                    header.addEventListener('click', () => {
                        const details = header.nextElementSibling;
                        if (details) {
                            details.classList.toggle('hidden');
                            const arrow = header.querySelector('.arrow');
                            if (arrow) {
                                arrow.textContent = details.classList.contains('hidden') ? '▶' : '▼';
                            }
                        }
                    });
                });
            } else {
                container.classList.add('hidden');
                container.innerHTML = '';
                btn.innerHTML = '<span>📊</span> Espandi Eventi Partita';
            }
        });
    },

    /**
     * Renderizza tutti gli eventi partita
     * @param {Array} matchEvents - Array degli eventi
     * @returns {string} HTML degli eventi
     */
    renderMatchEvents(matchEvents) {
        if (!matchEvents || matchEvents.length === 0) {
            return '<p class="text-gray-500 text-center py-4">Nessun evento disponibile</p>';
        }

        // Raggruppa per squadra attaccante
        const homeEvents = matchEvents.filter(e => e.side === 'home');
        const awayEvents = matchEvents.filter(e => e.side === 'away');

        let html = '<div class="space-y-4">';

        // Eventi squadra casa
        if (homeEvents.length > 0) {
            html += `
                <div class="bg-gray-800 rounded-lg p-3">
                    <h4 class="text-green-400 font-bold mb-2">🏠 Attacco ${homeEvents[0].attackingTeam} (${homeEvents.filter(e => e.result === 'goal').length} gol)</h4>
                    <div class="space-y-2">
                        ${homeEvents.map(e => this.renderOccasionCard(e)).join('')}
                    </div>
                </div>
            `;
        }

        // Eventi squadra trasferta
        if (awayEvents.length > 0) {
            html += `
                <div class="bg-gray-800 rounded-lg p-3">
                    <h4 class="text-blue-400 font-bold mb-2">✈️ Attacco ${awayEvents[0].attackingTeam} (${awayEvents.filter(e => e.result === 'goal').length} gol)</h4>
                    <div class="space-y-2">
                        ${awayEvents.map(e => this.renderOccasionCard(e)).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    /**
     * Renderizza una singola occasione
     * @param {Object} event - Evento occasione
     * @returns {string} HTML dell'occasione
     */
    renderOccasionCard(event) {
        const isGoal = event.result === 'goal';
        const bgColor = isGoal ? 'bg-green-900/30 border-green-600' : 'bg-gray-700/30 border-gray-600';
        const resultIcon = isGoal ? '⚽' : '❌';
        const resultText = isGoal ? 'GOL' : 'Fallito';

        // Determina a che fase si e fermata l'occasione
        let stoppedAt = 'Fase 3 (Tiro)';
        if (event.phases.construction?.result === 'fail') {
            stoppedAt = 'Fase 1 (Costruzione)';
        } else if (event.phases.attack?.result === 'fail' || event.phases.attack?.interrupted) {
            stoppedAt = 'Fase 2 (Attacco)';
        }

        return `
            <div class="border rounded-lg ${bgColor}">
                <div class="occasion-header cursor-pointer p-2 flex items-center justify-between hover:bg-gray-700/50 rounded-t-lg">
                    <span class="text-sm">
                        <span class="arrow text-gray-400">▶</span>
                        <span class="font-bold text-white">Occ. ${event.occasionNumber}</span>
                        <span class="text-gray-400 mx-1">→</span>
                        <span class="${isGoal ? 'text-green-400' : 'text-gray-400'}">${resultIcon} ${resultText}</span>
                        ${!isGoal ? `<span class="text-gray-500 text-xs ml-2">(${stoppedAt})</span>` : ''}
                    </span>
                    ${event.abilities?.length > 0 ? `<span class="text-yellow-400 text-xs">✨ ${event.abilities.length} abilità</span>` : ''}
                </div>
                <div class="occasion-details hidden p-3 border-t border-gray-600 text-xs space-y-2">
                    ${this.renderPhaseDetails(event)}
                </div>
            </div>
        `;
    },

    /**
     * Renderizza i dettagli delle fasi
     * @param {Object} event - Evento occasione
     * @returns {string} HTML dei dettagli fasi
     */
    renderPhaseDetails(event) {
        let html = '';

        // Fase 1: Costruzione
        const p1 = event.phases.construction;
        if (p1) {
            if (p1.skipped) {
                html += `
                    <div class="bg-purple-900/30 p-2 rounded border border-purple-600">
                        <strong class="text-purple-400">Fase 1 - Costruzione:</strong>
                        <span class="text-purple-300">SKIP (${p1.reason})</span>
                    </div>
                `;
            } else {
                const p1Success = p1.result === 'success' || p1.result === 'lucky';
                html += `
                    <div class="bg-gray-900/50 p-2 rounded border ${p1Success ? 'border-green-600' : 'border-red-600'}">
                        <strong class="${p1Success ? 'text-green-400' : 'text-red-400'}">Fase 1 - Costruzione: ${p1.result?.toUpperCase()}</strong>
                        <div class="mt-1 grid grid-cols-2 gap-2 text-gray-300">
                            <div>
                                <span class="text-gray-500">ATT:</span>
                                dado ${p1.rolls?.attacker} + mod ${p1.modifiers?.attacker?.toFixed(1)} + coach ${p1.coach?.attacker?.toFixed(1)} = <strong>${p1.totals?.attacker?.toFixed(1)}</strong>
                            </div>
                            <div>
                                <span class="text-gray-500">DIF:</span>
                                dado ${p1.rolls?.defender} + mod ${p1.modifiers?.defender?.toFixed(1)} + coach ${p1.coach?.defender?.toFixed(1)} = <strong>${p1.totals?.defender?.toFixed(1)}</strong>
                            </div>
                        </div>
                        <div class="text-gray-400 mt-1">
                            Prob: ${p1.successChance}% | Roll: ${p1.roll100}
                            ${p1.result === 'lucky' ? ` | <span class="text-yellow-400">5% Fortuna (${p1.luckyRoll})</span>` : ''}
                        </div>
                    </div>
                `;
            }
        }

        // Fase 2: Attacco
        const p2 = event.phases.attack;
        if (p2) {
            if (p2.interrupted) {
                html += `
                    <div class="bg-red-900/30 p-2 rounded border border-red-600">
                        <strong class="text-red-400">Fase 2 - Attacco:</strong>
                        <span class="text-red-300">INTERROTTO (${p2.reason})</span>
                    </div>
                `;
            } else {
                const p2Success = p2.result === 'success' || p2.result === 'lucky';
                html += `
                    <div class="bg-gray-900/50 p-2 rounded border ${p2Success ? 'border-green-600' : 'border-red-600'}">
                        <strong class="${p2Success ? 'text-green-400' : 'text-red-400'}">Fase 2 - Attacco: ${p2.result?.toUpperCase()}</strong>
                        <div class="mt-1 grid grid-cols-2 gap-2 text-gray-300">
                            <div>
                                <span class="text-gray-500">ATT:</span>
                                dado ${p2.rolls?.attacker} + mod ${p2.modifiers?.attacker?.toFixed(1)} + coach ${p2.coach?.attacker?.toFixed(1)} = <strong>${p2.totals?.attacker?.toFixed(1)}</strong>
                            </div>
                            <div>
                                <span class="text-gray-500">DIF:</span>
                                dado ${p2.rolls?.defender} + mod ${p2.modifiers?.defender?.toFixed(1)} + coach ${p2.coach?.defender?.toFixed(1)} = <strong>${p2.totals?.defender?.toFixed(1)}</strong>
                            </div>
                        </div>
                        <div class="text-gray-400 mt-1">
                            Risultato: ${p2.attackResult?.toFixed(1)} → Finale: ${p2.finalAttackResult?.toFixed(1)}
                            ${p2.result === 'lucky' ? ` | <span class="text-yellow-400">5% Fortuna (${p2.luckyRoll})</span>` : ''}
                        </div>
                    </div>
                `;
            }
        }

        // Fase 3: Tiro
        const p3 = event.phases.shot;
        if (p3) {
            if (p3.noGoalkeeper) {
                html += `
                    <div class="bg-green-900/30 p-2 rounded border border-green-600">
                        <strong class="text-green-400">Fase 3 - Tiro:</strong>
                        <span class="text-green-300">GOL AUTOMATICO (nessun portiere)</span>
                    </div>
                `;
            } else {
                const isGoal = ['goal', 'lucky_goal', 'draw_goal'].includes(p3.result);
                html += `
                    <div class="bg-gray-900/50 p-2 rounded border ${isGoal ? 'border-yellow-600' : 'border-blue-600'}">
                        <strong class="${isGoal ? 'text-yellow-400' : 'text-blue-400'}">Fase 3 - Tiro: ${p3.result?.toUpperCase()}</strong>
                        <div class="mt-1 text-gray-300">
                            <div>
                                <span class="text-gray-500">TIRO:</span>
                                attacco ${p3.attackValue?.toFixed(1)}
                            </div>
                            <div>
                                <span class="text-gray-500">PARATA:</span>
                                dado ${p3.rolls?.goalkeeper} + mod ${p3.modifiers?.goalkeeper?.toFixed(1)} + coach ${p3.coach?.goalkeeper?.toFixed(1)} = <strong>${p3.totalGoalkeeper?.toFixed(1)}</strong>
                                ${p3.kamikazeActive ? ' <span class="text-purple-400">(Kamikaze x2)</span>' : ''}
                            </div>
                        </div>
                        <div class="text-gray-400 mt-1">
                            Differenza: ${p3.saveResult?.toFixed(1)} (soglia: ${p3.saveThreshold})
                            ${p3.result === 'lucky_goal' ? ` | <span class="text-yellow-400">5% Gol fortunato (${p3.luckyRoll})</span>` : ''}
                            ${p3.result === 'miracolo_save' ? ` | <span class="text-purple-400">Miracolo! (${p3.miracoloRoll})</span>` : ''}
                            ${p3.result === 'draw_goal' || p3.result === 'draw_save' ? ` | <span class="text-gray-400">50/50: ${p3.fiftyFiftyRoll} vs ${p3.goalChance}%</span>` : ''}
                        </div>
                    </div>
                `;
            }
        }

        // Abilità attivate
        if (event.abilities?.length > 0) {
            html += `
                <div class="bg-yellow-900/30 p-2 rounded border border-yellow-600">
                    <strong class="text-yellow-400">Abilità attivate:</strong>
                    <span class="text-yellow-300">${event.abilities.join(', ')}</span>
                </div>
            `;
        }

        return html;
    }
};

console.log("✅ Match Replay Simple caricato.");
