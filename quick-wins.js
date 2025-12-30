//
// ====================================================================
// MODULO QUICK-WINS.JS - Miglioramenti UX Rapidi
// ====================================================================
// Questo file contiene tutte le funzioni per i Quick Wins
// Da caricare DOPO interfaccia-dashboard.js
//

window.QuickWins = {

    // Dati ultima partita per click handler
    lastMatchData: null,

    /**
     * Apre gli highlights dell'ultima partita
     */
    openLastMatchHighlights() {
        const match = this.lastMatchData;
        if (!match) {
            if (window.Toast) window.Toast.info("Nessuna partita disponibile");
            return;
        }

        // Prepara i dati
        const homeTeam = match.homeTeam || { id: 'home', name: 'Casa' };
        const awayTeam = match.awayTeam || { id: 'away', name: 'Trasferta' };
        const homeScore = match.homeScore ?? 0;
        const awayScore = match.awayScore ?? 0;

        // Verifica se animazioni complete sono disponibili
        const fullAnimEnabled = window.FeatureFlags?.isEnabled('matchAnimations');
        const highlightsEnabled = window.FeatureFlags?.isEnabled('matchHighlights');

        if ((fullAnimEnabled || highlightsEnabled) && window.MatchAnimations) {
            // Usa MatchAnimations se uno dei flag e' abilitato
            window.MatchAnimations.open({
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                result: `${homeScore}-${awayScore}`,
                score: `${homeScore}-${awayScore}`,
                highlightsOnly: true
            });
        } else if (window.MatchReplaySimple) {
            // Fallback: usa MatchReplaySimple che genera replay dal risultato
            window.MatchReplaySimple.playFromResult(homeTeam, awayTeam, homeScore, awayScore);
        } else if (window.MatchHistory?.show) {
            // Ultimo fallback: mostra storico partite
            window.MatchHistory.show();
        } else if (window.Toast) {
            window.Toast.info("Replay non disponibile");
        }
    },

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
     * QUICK WIN 2: Preview ultima partita (carica da matchHistory)
     * A stagione terminata mostra il risultato della Supercoppa se disponibile
     */
    async showLastMatchPreview() {
        const lastMatchEl = document.getElementById('last-match-preview');
        const currentTeamId = window.InterfacciaCore?.currentTeamId;

        console.log('[QuickWins] showLastMatchPreview - elemento:', !!lastMatchEl, 'teamId:', currentTeamId);

        if (!lastMatchEl || !currentTeamId) {
            console.log('[QuickWins] showLastMatchPreview - mancano dati, esco');
            return;
        }

        // Verifica se la stagione e' terminata e mostra Supercoppa
        try {
            const { doc, getDoc, appId } = window.firestoreTools;
            const configRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'settings');
            const configDoc = await getDoc(configRef);
            const config = configDoc.exists() ? configDoc.data() : {};

            if (config.isSeasonOver) {
                // Prima prova a caricare la Supercoppa dal documento
                let supercoppa = window.Supercoppa ? await window.Supercoppa.loadSupercoppa() : null;

                // Se non esiste il documento ma abbiamo il risultato salvato nel config, usalo
                if (!supercoppa && config.lastSupercoppaResult) {
                    supercoppa = config.lastSupercoppaResult;
                }

                if (supercoppa?.isCompleted && supercoppa?.winner) {
                    // Mostra risultato Supercoppa
                    const homeScore = supercoppa.homeScore ?? 0;
                    const awayScore = supercoppa.awayScore ?? 0;
                    const isUserHome = supercoppa.homeTeam?.teamId === currentTeamId;
                    const isUserAway = supercoppa.awayTeam?.teamId === currentTeamId;
                    const userParticipated = isUserHome || isUserAway;

                    let resultText, scoreColor;
                    if (userParticipated) {
                        const myGoals = isUserHome ? homeScore : awayScore;
                        const theirGoals = isUserHome ? awayScore : homeScore;
                        const won = supercoppa.winner.teamId === currentTeamId;
                        resultText = won ? 'Vittoria Supercoppa!' : 'Finale Supercoppa';
                        scoreColor = won ? 'text-yellow-400' : 'text-gray-400';
                    } else {
                        resultText = 'Supercoppa';
                        scoreColor = 'text-yellow-400';
                    }

                    this.lastMatchData = {
                        homeTeam: { id: supercoppa.homeTeam?.teamId, name: supercoppa.homeTeam?.teamName },
                        awayTeam: { id: supercoppa.awayTeam?.teamId, name: supercoppa.awayTeam?.teamName },
                        homeScore,
                        awayScore,
                        type: 'supercoppa'
                    };

                    lastMatchEl.innerHTML = `
                        <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 transition-colors rounded-lg -m-2 p-2">
                            <div class="text-3xl">⭐</div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold ${scoreColor} truncate">${resultText}</p>
                                <p class="text-xs text-gray-300 truncate">${supercoppa.homeTeam?.teamName} vs ${supercoppa.awayTeam?.teamName}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-extrabold ${scoreColor}">${homeScore} - ${awayScore}</p>
                            </div>
                            <div class="text-gray-500">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            </div>
                        </div>
                    `;
                    lastMatchEl.classList.remove('hidden');
                    lastMatchEl.onclick = () => this.openLastMatchHighlights();
                    return;
                }
            }
        } catch (err) {
            console.warn('[QuickWins] Errore verifica Supercoppa:', err);
        }

        // Verifica se MatchHistory è disponibile
        if (!window.MatchHistory?.loadHistory) {
            console.log('[QuickWins] MatchHistory non disponibile');
            lastMatchEl.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="text-3xl">⚽</div>
                    <div class="flex-1">
                        <p class="text-xs text-gray-400">Ultima Partita</p>
                        <p class="text-sm text-white font-semibold">Nessuna partita giocata</p>
                    </div>
                </div>
            `;
            lastMatchEl.classList.remove('hidden');
            return;
        }

        try {
            // Carica lo storico partite
            const history = await window.MatchHistory.loadHistory(currentTeamId);
            console.log('[QuickWins] Storico caricato:', history?.length || 0, 'partite');

            if (!history || history.length === 0) {
                lastMatchEl.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="text-3xl">⚽</div>
                        <div class="flex-1">
                            <p class="text-xs text-gray-400">Ultima Partita</p>
                            <p class="text-sm text-white font-semibold">Nessuna partita giocata</p>
                        </div>
                    </div>
                `;
                lastMatchEl.classList.remove('hidden');
                return;
            }

            // Prendi l'ultima partita (la prima nell'array, ordinate per data decrescente)
            const lastMatch = history[0];

            const homeScore = lastMatch.homeScore ?? 0;
            const awayScore = lastMatch.awayScore ?? 0;
            const isHome = lastMatch.homeTeam?.id === currentTeamId;

            const myGoals = isHome ? homeScore : awayScore;
            const theirGoals = isHome ? awayScore : homeScore;
            const opponent = isHome ? lastMatch.awayTeam?.name : lastMatch.homeTeam?.name;

            const won = myGoals > theirGoals;
            const draw = myGoals === theirGoals;

            let resultText = won ? 'Vittoria!' : (draw ? 'Pareggio' : 'Sconfitta');
            let scoreColor = won ? 'text-green-400' : (draw ? 'text-yellow-400' : 'text-red-400');

            // Icona tipo partita (usata come emoji principale)
            const typeIcon = window.MatchHistory?.TYPE_ICONS?.[lastMatch.type] || '⚽';

            // Salva dati partita per il click handler
            this.lastMatchData = lastMatch;

            lastMatchEl.innerHTML = `
                <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 transition-colors rounded-lg -m-2 p-2">
                    <!-- Icona competizione -->
                    <div class="text-3xl">${typeIcon}</div>

                    <!-- Info partita -->
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold ${scoreColor} truncate">${resultText}</p>
                        <p class="text-xs text-gray-300 truncate">vs ${opponent || 'Avversario'}</p>
                    </div>

                    <!-- Punteggio -->
                    <div class="text-right">
                        <p class="text-2xl font-extrabold ${scoreColor}">${myGoals} - ${theirGoals}</p>
                    </div>

                    <!-- Freccia per indicare clickable -->
                    <div class="text-gray-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </div>
                </div>
            `;
            lastMatchEl.classList.remove('hidden');

            // Aggiungi click handler per aprire highlights
            lastMatchEl.onclick = () => this.openLastMatchHighlights();

        } catch (error) {
            console.error("Errore caricamento ultima partita:", error);
            // Mostra comunque il box con messaggio di fallback
            lastMatchEl.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="text-3xl">⚽</div>
                    <div class="flex-1">
                        <p class="text-xs text-gray-400">Ultima Partita</p>
                        <p class="text-sm text-white font-semibold">Nessuna partita giocata</p>
                    </div>
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

// Inizializza anche al caricamento della pagina (dopo che Firebase è pronto)
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che l'utente sia loggato e i dati caricati
    setTimeout(() => {
        if (window.InterfacciaCore?.currentTeamId) {
            console.log('[QuickWins] Inizializzazione al DOMContentLoaded');
            window.QuickWins.initializeAll();
        }
    }, 2000);
});

// Ascolta anche l'evento di login completato
document.addEventListener('userLoggedIn', () => {
    setTimeout(() => {
        console.log('[QuickWins] Inizializzazione dopo login');
        window.QuickWins.initializeAll();
    }, 1000);
});

// Sincronizza con aggiornamenti partite (emesso da NextMatchAlert)
document.addEventListener('matchDataUpdated', () => {
    console.log('[QuickWins] matchDataUpdated - aggiorno ultima partita');
    window.QuickWins.showLastMatchPreview();
});

console.log("✅ Modulo quick-wins.js caricato.");
