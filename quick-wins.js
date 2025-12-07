//
// ====================================================================
// MODULO QUICK-WINS.JS - Miglioramenti UX Rapidi
// ====================================================================
// Questo file contiene tutte le funzioni per i Quick Wins
// Da caricare DOPO interfaccia-dashboard.js
//

window.QuickWins = {
    
    /**
     * QUICK WIN 1: Countdown cooldown visibile
     */
    startCooldownCountdown() {
        const teamData = window.InterfacciaCore.currentTeamData;
        if (!teamData) return;
        
        const draftCooldownEl = document.getElementById('draft-cooldown-display');
        const marketCooldownEl = document.getElementById('market-cooldown-display');
        
        const updateCooldowns = () => {
            const now = Date.now();
            const cooldownMs = window.InterfacciaConstants.ACQUISITION_COOLDOWN_MS;
            
            // Draft cooldown
            if (draftCooldownEl && teamData.lastDraftAcquisitionTimestamp) {
                const remaining = cooldownMs - (now - teamData.lastDraftAcquisitionTimestamp);
                
                if (remaining > 0) {
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    draftCooldownEl.innerHTML = `
                        <i class="fas fa-clock text-red-400"></i>
                        <span class="text-red-400 font-bold">
                            Prossimo tra: ${minutes}:${seconds.toString().padStart(2, '0')}
                        </span>
                    `;
                    draftCooldownEl.classList.remove('hidden');
                } else {
                    draftCooldownEl.innerHTML = `
                        <i class="fas fa-check-circle text-green-400"></i>
                        <span class="text-green-400 font-bold animate-pulse">
                            ✅ Disponibile Ora!
                        </span>
                    `;
                }
            }
            
            // Market cooldown
            if (marketCooldownEl && teamData.lastMarketAcquisitionTimestamp) {
                const remaining = cooldownMs - (now - teamData.lastMarketAcquisitionTimestamp);
                
                if (remaining > 0) {
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    marketCooldownEl.innerHTML = `
                        <i class="fas fa-clock text-red-400"></i>
                        <span class="text-red-400 font-bold">
                            Prossimo tra: ${minutes}:${seconds.toString().padStart(2, '0')}
                        </span>
                    `;
                    marketCooldownEl.classList.remove('hidden');
                } else {
                    marketCooldownEl.innerHTML = `
                        <i class="fas fa-check-circle text-green-400"></i>
                        <span class="text-green-400 font-bold animate-pulse">
                            ✅ Disponibile Ora!
                        </span>
                    `;
                }
            }
        };
        
        // Aggiorna subito
        updateCooldowns();
        
        // Aggiorna ogni secondo
        if (window.cooldownInterval) {
            clearInterval(window.cooldownInterval);
        }
        window.cooldownInterval = setInterval(updateCooldowns, 1000);
    },
    
    /**
     * QUICK WIN 2: Preview ultima partita
     */
    showLastMatchPreview() {
        const teamData = window.InterfacciaCore.currentTeamData;
        const lastMatchEl = document.getElementById('last-match-preview');
        
        if (!lastMatchEl || !teamData) return;
        
        const lastMatch = teamData.lastMatch || null;
        
        if (lastMatch) {
            const { homeTeam, awayTeam, homeGoals, awayGoals, isHome } = lastMatch;
            const won = (isHome && homeGoals > awayGoals) || (!isHome && awayGoals > homeGoals);
            const draw = homeGoals === awayGoals;
            
            let resultClass = won ? 'border-green-500 bg-green-900/20' : (draw ? 'border-yellow-500 bg-yellow-900/20' : 'border-red-500 bg-red-900/20');
            let resultText = won ? 'Vittoria! 🎉' : (draw ? 'Pareggio 🤝' : 'Sconfitta 😞');
            let resultEmoji = won ? '✅' : (draw ? '⚖️' : '❌');
            
            const myGoals = isHome ? homeGoals : awayGoals;
            const theirGoals = isHome ? awayGoals : homeGoals;
            const opponent = isHome ? awayTeam : homeTeam;
            
            const creditsEarned = myGoals + (won ? 15 : 0);
            
            lastMatchEl.innerHTML = `
                <div class="p-4 bg-gray-800 rounded-lg border-2 ${resultClass} shadow-lg">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex-1">
                            <p class="text-xs text-gray-400">Ultima Partita</p>
                            <p class="text-lg font-bold text-white">${resultText}</p>
                            <p class="text-sm text-gray-300">vs ${opponent}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-3xl font-extrabold ${won ? 'text-green-400' : (draw ? 'text-yellow-400' : 'text-red-400')}">
                                ${myGoals} - ${theirGoals}
                            </p>
                            <p class="text-2xl">${resultEmoji}</p>
                        </div>
                    </div>
                    ${creditsEarned > 0 ? `
                        <div class="mt-2 p-2 bg-green-900/30 rounded border border-green-500">
                            <p class="text-xs text-green-400 text-center">
                                💰 +${creditsEarned} crediti guadagnati!
                            </p>
                        </div>
                    ` : ''}
                </div>
            `;
            lastMatchEl.classList.remove('hidden');
        } else {
            lastMatchEl.innerHTML = `
                <div class="p-4 bg-gray-800 rounded-lg border-2 border-blue-500 shadow-lg">
                    <p class="text-center text-gray-400">
                        <i class="fas fa-futbol text-3xl mb-2 text-blue-400"></i><br>
                        <span class="text-white font-semibold">Nessuna partita giocata</span><br>
                        <span class="text-blue-400 text-sm">Inizia il campionato per vedere i risultati!</span>
                    </p>
                </div>
            `;
            lastMatchEl.classList.remove('hidden');
        }
    },
    
    /**
     * QUICK WIN 3: Conferma acquisti costosi
     */
    confirmExpensivePurchase(playerName, cost, budget) {
        const threshold = 200; // Soglia crediti
        
        if (cost >= threshold) {
            const remaining = budget - cost;
            return confirm(
                `⚠️ ACQUISTO COSTOSO ⚠️\n\n` +
                `Giocatore: ${playerName}\n` +
                `Costo: ${cost} crediti\n` +
                `Budget rimanente: ${remaining} crediti\n\n` +
                `Sei sicuro di voler procedere?`
            );
        }
        
        return true; // Acquisto normale, procedi
    },
    
    /**
     * QUICK WIN 4: Badge giocatori in forma
     */
    addFormaBadge(player, containerElement) {
        // Rimuovi badge esistenti
        const existingBadge = containerElement.querySelector('.forma-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Controlla forma (assumiamo che sia in player.forma o player.currentLevel - player.level)
        const forma = player.forma || 0;
        
        if (forma >= 2) {
            const badge = document.createElement('span');
            badge.className = 'forma-badge inline-flex items-center px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse ml-2';
            badge.innerHTML = '🔥 IN FORMA!';
            containerElement.appendChild(badge);
        } else if (forma <= -2) {
            const badge = document.createElement('span');
            badge.className = 'forma-badge inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full ml-2';
            badge.innerHTML = '❄️ Fuori forma';
            containerElement.appendChild(badge);
        }
    },
    
    /**
     * QUICK WIN 5: Suggerimenti formazione intelligenti
     */
    checkFormationSuggestions() {
        const teamData = window.InterfacciaCore.currentTeamData;
        if (!teamData) return;
        
        const suggestionsEl = document.getElementById('formation-suggestions');
        if (!suggestionsEl) return;
        
        const allPlayers = teamData.players || [];
        const titolari = teamData.formation?.titolari || [];
        const panchina = teamData.formation?.panchina || [];
        
        const suggestions = [];
        
        // Check 1: Giocatore più forte in panchina
        for (const benchPlayer of panchina) {
            for (const starter of titolari) {
                if (benchPlayer.role === starter.role) {
                    const benchLevel = benchPlayer.currentLevel || benchPlayer.level || 1;
                    const starterLevel = starter.currentLevel || starter.level || 1;
                    
                    if (benchLevel > starterLevel + 1) {
                        suggestions.push({
                            type: 'swap',
                            icon: '⚠️',
                            message: `Hai <strong>${benchPlayer.name}</strong> (Lv ${benchLevel}) in panchina, più forte di <strong>${starter.name}</strong> (Lv ${starterLevel})!`,
                            action: 'Cambia formazione'
                        });
                    }
                }
            }
        }
        
        // Check 2: Giocatore in forma eccezionale in panchina
        for (const benchPlayer of panchina) {
            const forma = benchPlayer.forma || 0;
            if (forma >= 2) {
                suggestions.push({
                    type: 'hot',
                    icon: '🔥',
                    message: `<strong>${benchPlayer.name}</strong> è in forma smagliante (+${forma})! Considera di schierarlo.`,
                    action: 'Vedi giocatore'
                });
            }
        }
        
        // Check 3: Modulo sbilanciato
        const moduloConfig = teamData.formation?.modulo || '1-1-2-1';
        const roleCount = { P: 0, D: 0, C: 0, A: 0 };
        titolari.forEach(p => roleCount[p.role]++);
        
        if (roleCount.D === 0 && panchina.some(p => p.role === 'D')) {
            suggestions.push({
                type: 'warning',
                icon: '⚡',
                message: `Non hai difensori in campo! La tua difesa è vulnerabile.`,
                action: 'Aggiusta formazione'
            });
        }
        
        // Mostra suggerimenti
        if (suggestions.length > 0) {
            suggestionsEl.innerHTML = suggestions.map(s => `
                <div class="p-3 bg-${s.type === 'warning' ? 'red' : 'yellow'}-900/30 border border-${s.type === 'warning' ? 'red' : 'yellow'}-500 rounded-lg mb-2">
                    <div class="flex items-start">
                        <span class="text-2xl mr-3">${s.icon}</span>
                        <div class="flex-1">
                            <p class="text-sm text-white">${s.message}</p>
                            <button class="text-xs text-${s.type === 'warning' ? 'red' : 'yellow'}-400 hover:underline mt-1">
                                ${s.action} →
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            suggestionsEl.classList.remove('hidden');
        } else {
            suggestionsEl.innerHTML = `
                <div class="p-3 bg-green-900/30 border border-green-500 rounded-lg text-center">
                    <p class="text-sm text-green-400">
                        ✅ Formazione ottimale! Nessun suggerimento.
                    </p>
                </div>
            `;
            suggestionsEl.classList.remove('hidden');
        }
    },
    
    /**
     * Inizializza tutti i Quick Wins
     */
    initializeAll() {
        // Avvia countdown
        this.startCooldownCountdown();
        
        // Mostra ultima partita
        this.showLastMatchPreview();
        
        // Check suggerimenti formazione
        this.checkFormationSuggestions();
        
        console.log("✅ Quick Wins inizializzati!");
    }
};

// Auto-inizializza quando la dashboard viene aggiornata
document.addEventListener('dashboardNeedsUpdate', () => {
    setTimeout(() => {
        window.QuickWins.initializeAll();
    }, 500);
});

console.log("✅ Modulo quick-wins.js caricato.");
