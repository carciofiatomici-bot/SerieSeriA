//
// ====================================================================
// USER-CHAMPIONSHIP.JS - Visualizzazione Partite e Replay (SOLO VISUALIZZAZIONE)
// ====================================================================
//

window.UserChampionship = {
    
    /**
     * Carica e renderizza il pannello campionato per gli utenti (SOLO VISUALIZZAZIONE)
     */
    async loadUserChampionship() {
        const container = document.getElementById('user-championship-tools-container');
        if (!container) return;
        
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-400 text-xl">❌ Errore: Nessuna squadra selezionata</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
                <p class="text-white text-lg">Caricamento partite...</p>
            </div>
        `;
        
        try {
            const { doc, getDoc, collection, getDocs } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            
            // Carica calendario
            const schedulePath = `artifacts/${appId}/public/data/schedule/full_schedule`;
            const scheduleRef = doc(db, schedulePath);
            const scheduleSnap = await getDoc(scheduleRef);
            const scheduleData = scheduleSnap.exists() ? scheduleSnap.data().matches : [];
            
            // Carica squadre per i loghi
            const teamsPath = `artifacts/${appId}/public/data/teams`;
            const teamsRef = collection(db, teamsPath);
            const teamsSnap = await getDocs(teamsRef);
            const allTeams = {};
            teamsSnap.docs.forEach(doc => {
                allTeams[doc.id] = {
                    id: doc.id,
                    name: doc.data().teamName,
                    logo: doc.data().logoUrl
                };
            });
            
            // Filtra partite della squadra corrente
            const myMatches = [];
            scheduleData.forEach(round => {
                round.matches.forEach(match => {
                    if (match.homeId === currentTeamId || match.awayId === currentTeamId) {
                        myMatches.push({
                            ...match,
                            round: round.round,
                            type: round.matches[0].type
                        });
                    }
                });
            });
            
            // Render interfaccia
            this.renderMyMatches(container, myMatches, allTeams, currentTeamId);
            
        } catch (error) {
            console.error("Errore caricamento partite:", error);
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-400 text-xl mb-4">❌ Errore caricamento</p>
                    <p class="text-gray-400">${error.message}</p>
                </div>
            `;
        }
    },
    
    /**
     * Renderizza le partite della squadra
     */
    renderMyMatches(container, matches, allTeams, currentTeamId) {
        if (matches.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">📋</div>
                    <h3 class="text-2xl font-bold text-gray-400 mb-2">Nessuna Partita</h3>
                    <p class="text-gray-300">Il calendario non è ancora stato generato.</p>
                </div>
            `;
            return;
        }
        
        // Separa partite giocate e da giocare
        const playedMatches = matches.filter(m => m.result !== null);
        const upcomingMatches = matches.filter(m => m.result === null);
        
        // Trova prossima partita
        const nextMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null;
        
        // Calcola statistiche
        let wins = 0, draws = 0, losses = 0;
        let goalsFor = 0, goalsAgainst = 0;
        
        playedMatches.forEach(match => {
            const [homeGoals, awayGoals] = match.result.split('-').map(Number);
            const isHome = match.homeId === currentTeamId;
            const myGoals = isHome ? homeGoals : awayGoals;
            const opponentGoals = isHome ? awayGoals : homeGoals;
            
            goalsFor += myGoals;
            goalsAgainst += opponentGoals;
            
            if (myGoals > opponentGoals) wins++;
            else if (myGoals === opponentGoals) draws++;
            else losses++;
        });
        
        container.innerHTML = `
            <!-- Statistiche Generali -->
            <div class="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-6 border-2 border-purple-500 mb-6">
                <h3 class="text-2xl font-bold text-white mb-4">📊 Le Tue Statistiche</h3>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div class="text-center bg-black bg-opacity-30 rounded p-3">
                        <p class="text-3xl font-bold text-blue-400">${playedMatches.length}</p>
                        <p class="text-sm text-gray-300">Partite Giocate</p>
                    </div>
                    <div class="text-center bg-black bg-opacity-30 rounded p-3">
                        <p class="text-3xl font-bold text-green-400">${wins}</p>
                        <p class="text-sm text-gray-300">Vittorie</p>
                    </div>
                    <div class="text-center bg-black bg-opacity-30 rounded p-3">
                        <p class="text-3xl font-bold text-yellow-400">${draws}</p>
                        <p class="text-sm text-gray-300">Pareggi</p>
                    </div>
                    <div class="text-center bg-black bg-opacity-30 rounded p-3">
                        <p class="text-3xl font-bold text-red-400">${losses}</p>
                        <p class="text-sm text-gray-300">Sconfitte</p>
                    </div>
                    <div class="text-center bg-black bg-opacity-30 rounded p-3">
                        <p class="text-3xl font-bold text-purple-400">${goalsFor}-${goalsAgainst}</p>
                        <p class="text-sm text-gray-300">Goal (F-S)</p>
                    </div>
                </div>
            </div>
            
            <!-- Prossima Partita -->
            ${nextMatch ? `
                <div class="bg-gradient-to-r from-orange-900 to-red-900 rounded-lg p-6 border-2 border-orange-500 mb-6">
                    <h3 class="text-2xl font-bold text-white mb-4">⏭️ Prossima Partita</h3>
                    <div class="bg-black bg-opacity-30 rounded-lg p-4">
                        <p class="text-gray-300 text-sm mb-2">Giornata ${nextMatch.round} (${nextMatch.type})</p>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3 flex-1">
                                ${window.getLogoHtml ? window.getLogoHtml(nextMatch.homeId) : ''}
                                <span class="text-white font-bold text-lg">${nextMatch.homeName}</span>
                            </div>
                            <div class="text-center px-4">
                                <span class="text-2xl font-bold text-gray-400">VS</span>
                            </div>
                            <div class="flex items-center gap-3 flex-1 justify-end">
                                <span class="text-white font-bold text-lg">${nextMatch.awayName}</span>
                                ${window.getLogoHtml ? window.getLogoHtml(nextMatch.awayId) : ''}
                            </div>
                        </div>
                        <p class="text-yellow-400 text-center mt-3 font-bold">⏳ In attesa di simulazione dall'admin</p>
                    </div>
                </div>
            ` : ''}
            
            <!-- Partite Giocate -->
            <div class="bg-gray-800 rounded-lg p-6 border-2 border-green-500">
                <h3 class="text-2xl font-bold text-green-400 mb-4">✅ Partite Giocate (${playedMatches.length})</h3>
                
                ${playedMatches.length === 0 ? `
                    <div class="text-center py-8">
                        <p class="text-gray-400 text-lg">Nessuna partita ancora giocata</p>
                        <p class="text-gray-500 text-sm mt-2">Attendi che l'admin simuli la prima giornata</p>
                    </div>
                ` : `
                    <div class="space-y-3 max-h-96 overflow-y-auto">
                        ${playedMatches.reverse().map(match => {
                            const [homeGoals, awayGoals] = match.result.split('-').map(Number);
                            const isHome = match.homeId === currentTeamId;
                            const myGoals = isHome ? homeGoals : awayGoals;
                            const opponentGoals = isHome ? awayGoals : homeGoals;
                            const isWin = myGoals > opponentGoals;
                            const isDraw = myGoals === opponentGoals;
                            const resultColor = isWin ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400';
                            const resultBorder = isWin ? 'border-green-700' : isDraw ? 'border-yellow-700' : 'border-red-700';
                            const resultBg = isWin ? 'bg-green-900' : isDraw ? 'bg-yellow-900' : 'bg-red-900';
                            
                            return `
                                <div class="bg-gray-900 rounded-lg p-4 border-2 ${resultBorder}">
                                    <div class="flex justify-between items-center mb-3">
                                        <span class="text-gray-400 text-sm">Giornata ${match.round} (${match.type})</span>
                                        <span class="${resultBg} ${resultColor} px-3 py-1 rounded font-bold text-sm">
                                            ${isWin ? '✅ Vittoria' : isDraw ? '🟨 Pareggio' : '❌ Sconfitta'}
                                        </span>
                                    </div>
                                    
                                    <div class="flex items-center justify-between mb-3">
                                        <div class="flex items-center gap-2 flex-1">
                                            ${window.getLogoHtml ? window.getLogoHtml(match.homeId) : ''}
                                            <span class="text-white font-bold ${match.homeId === currentTeamId ? 'text-yellow-400' : ''}">${match.homeName}</span>
                                        </div>
                                        <div class="text-center px-4">
                                            <span class="text-3xl font-bold ${resultColor}">${match.result}</span>
                                        </div>
                                        <div class="flex items-center gap-2 flex-1 justify-end">
                                            <span class="text-white font-bold ${match.awayId === currentTeamId ? 'text-yellow-400' : ''}">${match.awayName}</span>
                                            ${window.getLogoHtml ? window.getLogoHtml(match.awayId) : ''}
                                        </div>
                                    </div>
                                    
                                    <button onclick="window.UserChampionship.watchReplay('${match.homeId}', '${match.awayId}', ${homeGoals}, ${awayGoals})"
                                            class="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg transition">
                                        ▶️ Guarda Replay
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
            
            <!-- Link rapidi -->
            <div class="grid grid-cols-2 gap-4 mt-6">
                <button onclick="window.InterfacciaDashboard.loadLeaderboard()" 
                        class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg">
                    📊 Vai alla Classifica
                </button>
                <button onclick="window.InterfacciaDashboard.loadSchedule()" 
                        class="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-lg">
                    📅 Vai al Calendario
                </button>
            </div>
        `;
    },
    
    /**
     * Avvia il replay di una partita
     */
    async watchReplay(homeId, awayId, homeGoals, awayGoals) {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            
            // Carica dati squadre
            const homeRef = doc(db, `artifacts/${appId}/public/data/teams/${homeId}`);
            const awayRef = doc(db, `artifacts/${appId}/public/data/teams/${awayId}`);
            
            const homeSnap = await getDoc(homeRef);
            const awaySnap = await getDoc(awayRef);
            
            if (!homeSnap.exists() || !awaySnap.exists()) {
                alert("Errore: Dati squadre non trovati");
                return;
            }
            
            const homeTeam = {
                id: homeId,
                name: homeSnap.data().teamName,
                ...homeSnap.data()
            };
            
            const awayTeam = {
                id: awayId,
                name: awaySnap.data().teamName,
                ...awaySnap.data()
            };
            
            // Avvia replay
            if (window.MatchReplaySimple) {
                await window.MatchReplaySimple.playFromResult(homeTeam, awayTeam, homeGoals, awayGoals);
            } else {
                alert("Sistema replay non disponibile");
            }
            
        } catch (error) {
            console.error("Errore avvio replay:", error);
            alert(`Errore: ${error.message}`);
        }
    }
};

console.log("✅ User Championship (View Only) caricato.");
