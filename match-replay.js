//
// ====================================================================
// MATCH-REPLAY.JS - Sistema Replay Partite (Versione Semplificata)
// ====================================================================
//

window.MatchReplay = {
    
    isPlaying: false,
    currentSpeed: 1, // 1x, 2x, 3x
    
    /**
     * Avvia il replay di una partita
     */
    async play(homeTeam, awayTeam, actions, finalScore) {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.show();
        
        // Intro
        await this.showIntro(homeTeam, awayTeam);
        
        // Gioca tutte le azioni
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            await this.showAction(action, homeTeam, awayTeam);
            
            // Pausa tra azioni (basata su velocità)
            await this.wait(1500 / this.currentSpeed);
        }
        
        // Risultato finale
        await this.showFinalScore(homeTeam, awayTeam, finalScore);
        
        this.isPlaying = false;
    },
    
    /**
     * Mostra intro partita
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
     * Mostra singola azione
     */
    async showAction(action, homeTeam, awayTeam) {
        let content = '';
        let colorClass = 'border-gray-500';
        
        switch(action.type) {
            case 'construction':
                content = this.renderConstruction(action, homeTeam, awayTeam);
                colorClass = action.success ? 'border-green-500' : 'border-red-500';
                break;
                
            case 'attack':
                content = this.renderAttack(action, homeTeam, awayTeam);
                colorClass = action.success ? 'border-green-500' : 'border-red-500';
                break;
                
            case 'shot':
                content = this.renderShot(action, homeTeam, awayTeam);
                colorClass = action.isGoal ? 'border-yellow-500' : 'border-blue-500';
                break;
        }
        
        const wrapper = `
            <div class="replay-action bg-gray-800 border-4 ${colorClass} rounded-lg p-6 animate-slide-in">
                ${content}
            </div>
        `;
        
        this.updateContent(wrapper);
        
        // Se è goal, celebra
        if (action.type === 'shot' && action.isGoal) {
            await this.celebrateGoal();
        }
    },
    
    /**
     * Render fase costruzione
     */
    renderConstruction(action, homeTeam, awayTeam) {
        let html = `
            <div class="text-center">
                <div class="text-5xl mb-4">${action.icon}</div>
                <h3 class="text-2xl font-bold text-yellow-400 mb-4">${action.title}</h3>
                
                <p class="text-lg text-white mb-4">
                    ${action.players[0]} passa a ${action.players[1]}
                </p>
        `;
        
        // Abilità speciali
        if (action.special.includes('regista')) {
            html += `
                <div class="bg-purple-900 border-2 border-purple-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-purple-300">
                        🎯 REGISTA! Salta la costruzione!
                    </p>
                </div>
            `;
        }
        
        if (action.special.includes('antifurto')) {
            html += `
                <div class="bg-red-900 border-2 border-red-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-red-300">
                        🛡️ ANTIFURTO! Palla intercettata!
                    </p>
                </div>
            `;
        }
        
        // Dadi
        html += `
                <div class="flex justify-center gap-8 mb-4">
                    <div class="text-center">
                        <p class="text-sm text-gray-400">Attacco</p>
                        <p class="text-3xl font-bold text-green-400">🎲 ${action.rolls.attack}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-400">Difesa</p>
                        <p class="text-3xl font-bold text-red-400">🎲 ${action.rolls.defense}</p>
                    </div>
                </div>
                
                <div class="text-2xl font-bold ${action.success ? 'text-green-400' : 'text-red-400'}">
                    ${action.success ? '✅ COSTRUZIONE RIUSCITA!' : '❌ COSTRUZIONE FALLITA!'}
                </div>
            </div>
        `;
        
        return html;
    },
    
    /**
     * Render fase attacco
     */
    renderAttack(action, homeTeam, awayTeam) {
        let html = `
            <div class="text-center">
                <div class="text-5xl mb-4">${action.icon}</div>
                <h3 class="text-2xl font-bold text-orange-400 mb-4">${action.title}</h3>
                
                <p class="text-lg text-white mb-4">
                    ${action.attackerName} punta la porta!
                </p>
        `;
        
        // Abilità speciali
        if (action.special.includes('muro')) {
            html += `
                <div class="bg-blue-900 border-2 border-blue-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-blue-300">
                        🧱 MURO! Difesa raddoppiata!
                    </p>
                </div>
            `;
        }
        
        // Forze in campo
        html += `
                <div class="bg-gray-900 border-2 border-yellow-500 p-4 rounded-lg mb-4">
                    <div class="flex justify-center gap-8">
                        <div class="text-center">
                            <p class="text-sm text-gray-400">Forza Attacco</p>
                            <p class="text-4xl font-bold text-green-400">${action.attackPower}</p>
                        </div>
                        <div class="text-2xl font-bold text-white self-center">VS</div>
                        <div class="text-center">
                            <p class="text-sm text-gray-400">Forza Difesa</p>
                            <p class="text-4xl font-bold text-red-400">${action.defensePower}</p>
                        </div>
                    </div>
                </div>
                
                <div class="text-2xl font-bold ${action.success ? 'text-green-400' : 'text-red-400'}">
                    ${action.success 
                        ? `✅ DIFESA SUPERATA! (+${action.bonus} al tiro)` 
                        : '❌ ATTACCO RESPINTO!'}
                </div>
            </div>
        `;
        
        return html;
    },
    
    /**
     * Render fase tiro
     */
    renderShot(action, homeTeam, awayTeam) {
        let html = `
            <div class="text-center">
                <div class="text-5xl mb-4">${action.icon}</div>
                <h3 class="text-2xl font-bold text-red-400 mb-4">${action.title}</h3>
                
                <p class="text-lg text-white mb-4">
                    ${action.strikerName} tira in porta!
                </p>
        `;
        
        // Bomber
        if (action.special.includes('bomber')) {
            html += `
                <div class="bg-red-900 border-2 border-red-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-red-300">
                        💥 BOMBER! Tiro potenziato!
                    </p>
                </div>
            `;
        }
        
        // Kamikaze
        if (action.special.includes('kamikaze')) {
            html += `
                <div class="bg-orange-900 border-2 border-orange-500 p-3 rounded-lg mb-4 animate-pulse">
                    <p class="text-xl font-bold text-orange-300">
                        🤯 USCITA KAMIKAZE! Tutto o niente!
                    </p>
                </div>
            `;
        }
        
        // Duello
        html += `
                <div class="bg-gray-900 border-2 border-purple-500 p-4 rounded-lg mb-4">
                    <div class="flex justify-center gap-8">
                        <div class="text-center">
                            <p class="text-sm text-gray-400">⚽ Potenza Tiro</p>
                            <p class="text-4xl font-bold text-yellow-400">${action.shotPower}</p>
                        </div>
                        <div class="text-2xl font-bold text-white self-center">VS</div>
                        <div class="text-center">
                            <p class="text-sm text-gray-400">🧤 ${action.goalkeeperName}</p>
                            <p class="text-4xl font-bold text-blue-400">${action.savePower}</p>
                        </div>
                    </div>
                </div>
                
                <div class="text-4xl font-bold ${action.isGoal ? 'text-yellow-400' : 'text-blue-400'} animate-bounce">
                    ${action.isGoal 
                        ? '⚽ GOOOOOOOOL! 🎉🎉🎉' 
                        : `🧤 PARATA! ${action.goalkeeperName} salva!`}
                </div>
            </div>
        `;
        
        return html;
    },
    
    /**
     * Celebra un goal
     */
    async celebrateGoal() {
        // Suono goal (se audio abilitato)
        this.playSound('goal');
        
        // Confetti animation (opzionale)
        if (window.confetti) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        
        await this.wait(2000 / this.currentSpeed);
    },
    
    /**
     * Mostra risultato finale
     */
    async showFinalScore(homeTeam, awayTeam, score) {
        const content = `
            <div class="replay-final text-center animate-fade-in">
                <h2 class="text-3xl font-bold text-yellow-400 mb-6">RISULTATO FINALE</h2>
                <div class="flex items-center justify-center gap-12">
                    <div class="text-center">
                        <h3 class="text-xl font-bold text-white mb-2">${homeTeam.name}</h3>
                        <div class="text-6xl font-bold text-green-400">${score.home}</div>
                    </div>
                    <div class="text-4xl font-bold text-gray-400">-</div>
                    <div class="text-center">
                        <h3 class="text-xl font-bold text-white mb-2">${awayTeam.name}</h3>
                        <div class="text-6xl font-bold text-blue-400">${score.away}</div>
                    </div>
                </div>
                
                <button id="replay-close" class="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                    Continua ✓
                </button>
            </div>
        `;
        
        this.updateContent(content);
        
        // Listener chiusura
        document.getElementById('replay-close')?.addEventListener('click', () => {
            this.hide();
        });
        
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
            '<div class="w-16 h-16 bg-gray-700 rounded-full"></div>';
    },
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    playSound(type) {
        // Opzionale: suoni
        // new Audio(`/sounds/${type}.mp3`).play().catch(() => {});
    },
    
    /**
     * Cambia velocità
     */
    changeSpeed() {
        this.currentSpeed = this.currentSpeed === 1 ? 2 : this.currentSpeed === 2 ? 3 : 1;
        
        const btn = document.getElementById('replay-speed-btn');
        if (btn) {
            btn.textContent = `Velocità: ${this.currentSpeed}x`;
        }
    }
};

console.log("✅ Match Replay caricato.");
