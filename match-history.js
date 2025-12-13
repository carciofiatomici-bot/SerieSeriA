//
// ====================================================================
// MATCH-HISTORY.JS - Storico Partite
// ====================================================================
// Gestisce la visualizzazione e il salvataggio dello storico partite
//

window.MatchHistory = {
    // Limite massimo partite salvate per squadra
    MAX_HISTORY_SIZE: 100,

    // Tipi di partita
    MATCH_TYPES: {
        CAMPIONATO: 'campionato',
        COPPA: 'coppa',
        SFIDA: 'sfida',
        SFIDA_REALTIME: 'sfida_realtime',
        ALLENAMENTO: 'allenamento',
        SUPERCOPPA: 'supercoppa'
    },

    // Icone per tipo partita (coerenti con dashboard)
    TYPE_ICONS: {
        campionato: '🏅',
        coppa: '🏆',
        sfida: '⚔️',
        sfida_realtime: '🎲',
        allenamento: '⚽',
        supercoppa: '⭐'
    },

    // Colori per risultato
    RESULT_COLORS: {
        win: 'text-green-400',
        loss: 'text-red-400',
        draw: 'text-yellow-400'
    },

    /**
     * Salva una partita nello storico della squadra
     * @param {string} teamId - ID della squadra
     * @param {Object} matchData - Dati della partita
     */
    async saveMatch(teamId, matchData) {
        if (!window.FeatureFlags?.isEnabled('matchHistory')) {
            console.log("MatchHistory: flag disabilitato, partita non salvata");
            return false;
        }

        if (!teamId || !matchData) {
            console.error("MatchHistory: dati mancanti per salvare la partita");
            return false;
        }

        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                console.error("MatchHistory: squadra non trovata");
                return false;
            }

            const teamData = teamDoc.data();
            let matchHistory = teamData.matchHistory || [];

            // Crea record partita
            const matchRecord = {
                id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                date: new Date().toISOString(),
                type: matchData.type || 'campionato',

                // Squadre
                homeTeam: {
                    id: matchData.homeTeam?.id || '',
                    name: matchData.homeTeam?.name || 'Sconosciuta',
                    logoUrl: matchData.homeTeam?.logoUrl || ''
                },
                awayTeam: {
                    id: matchData.awayTeam?.id || '',
                    name: matchData.awayTeam?.name || 'Sconosciuta',
                    logoUrl: matchData.awayTeam?.logoUrl || ''
                },

                // Risultato
                homeScore: matchData.homeScore || 0,
                awayScore: matchData.awayScore || 0,
                isHome: matchData.isHome !== undefined ? matchData.isHome : true,

                // Dettagli opzionali
                details: matchData.details || null,

                // Per sfide con scommesse
                betAmount: matchData.betAmount || 0,
                creditsWon: matchData.creditsWon || 0
            };

            // Calcola risultato dal punto di vista della squadra
            const myScore = matchRecord.isHome ? matchRecord.homeScore : matchRecord.awayScore;
            const opponentScore = matchRecord.isHome ? matchRecord.awayScore : matchRecord.homeScore;

            if (myScore > opponentScore) {
                matchRecord.result = 'win';
            } else if (myScore < opponentScore) {
                matchRecord.result = 'loss';
            } else {
                matchRecord.result = 'draw';
            }

            // Aggiungi in cima alla lista (piu recenti prima)
            matchHistory.unshift(matchRecord);

            // Limita la dimensione dello storico
            if (matchHistory.length > this.MAX_HISTORY_SIZE) {
                matchHistory = matchHistory.slice(0, this.MAX_HISTORY_SIZE);
            }

            // Salva su Firestore
            await updateDoc(teamDocRef, { matchHistory });

            console.log(`MatchHistory: partita salvata per ${teamId}`, matchRecord);
            return true;

        } catch (error) {
            console.error("MatchHistory: errore salvataggio partita", error);
            return false;
        }
    },

    /**
     * Carica lo storico partite di una squadra
     * @param {string} teamId - ID della squadra
     * @returns {Array} - Array di partite
     */
    async loadHistory(teamId) {
        if (!teamId) return [];

        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) return [];

            return teamDoc.data().matchHistory || [];

        } catch (error) {
            console.error("MatchHistory: errore caricamento storico", error);
            return [];
        }
    },

    /**
     * Calcola statistiche dallo storico
     * @param {Array} history - Array di partite
     * @param {string} filterType - Tipo da filtrare (opzionale)
     * @returns {Object} - Statistiche
     */
    calculateStats(history, filterType = null) {
        let filtered = history;

        if (filterType && filterType !== 'all') {
            filtered = history.filter(m => m.type === filterType);
        }

        const wins = filtered.filter(m => m.result === 'win').length;
        const losses = filtered.filter(m => m.result === 'loss').length;
        const draws = filtered.filter(m => m.result === 'draw').length;
        const total = filtered.length;

        const goalsScored = filtered.reduce((sum, m) => {
            return sum + (m.isHome ? m.homeScore : m.awayScore);
        }, 0);

        const goalsConceded = filtered.reduce((sum, m) => {
            return sum + (m.isHome ? m.awayScore : m.homeScore);
        }, 0);

        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        return {
            total,
            wins,
            losses,
            draws,
            winRate,
            goalsScored,
            goalsConceded,
            goalDifference: goalsScored - goalsConceded
        };
    },

    /**
     * Formatta la data per la visualizzazione
     * @param {string} dateStr - Data ISO
     * @returns {string} - Data formattata
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Carica i trofei di una squadra
     * @param {string} teamId - ID della squadra
     * @returns {Object} - Trofei
     */
    async loadTrophies(teamId) {
        if (!teamId) return { campionatiVinti: 0, coppeSerieVinte: 0, supercoppeSerieVinte: 0 };

        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) return { campionatiVinti: 0, coppeSerieVinte: 0, supercoppeSerieVinte: 0 };

            const data = teamDoc.data();
            return {
                campionatiVinti: data.campionatiVinti || 0,
                coppeSerieVinte: data.coppeSerieVinte || 0,
                supercoppeSerieVinte: data.supercoppeSerieVinte || 0
            };

        } catch (error) {
            console.error("MatchHistory: errore caricamento trofei", error);
            return { campionatiVinti: 0, coppeSerieVinte: 0, supercoppeSerieVinte: 0 };
        }
    },

    /**
     * Renderizza il pannello storico partite
     */
    async render() {
        const container = document.getElementById('match-history-tools-container');
        if (!container) return;

        // Verifica flag
        if (!window.FeatureFlags?.isEnabled('matchHistory')) {
            container.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center">
                    <p class="text-xl text-red-400 font-bold">Hall of Fame Disabilitata</p>
                    <p class="text-gray-300 mt-2">L'amministratore non ha ancora abilitato questa funzionalita.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `<p class="text-center text-gray-400">Caricamento Hall of Fame...</p>`;

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) {
            container.innerHTML = `<p class="text-center text-red-400">Errore: squadra non trovata</p>`;
            return;
        }

        try {
            // Carica storico e trofei in parallelo
            const [history, trophies] = await Promise.all([
                this.loadHistory(teamId),
                this.loadTrophies(teamId)
            ]);

            // Cache per i trofei (per filtraggio successivo)
            this.cachedTrophies = trophies;

            this.renderUI(container, history, trophies);
        } catch (error) {
            console.error("Errore rendering storico:", error);
            container.innerHTML = `<p class="text-center text-red-400">Errore nel caricamento dello storico</p>`;
        }
    },

    /**
     * Renderizza l'interfaccia utente
     */
    renderUI(container, history, trophies = null) {
        // Stato filtro corrente
        this.currentFilter = this.currentFilter || 'all';

        // Calcola statistiche
        const stats = this.calculateStats(history, this.currentFilter);

        // Filtra partite
        let filteredHistory = history;
        if (this.currentFilter !== 'all') {
            filteredHistory = history.filter(m => m.type === this.currentFilter);
        }

        // Trofei (se non passati, usa valori da cache o 0)
        const trophyData = trophies || this.cachedTrophies || {
            campionatiVinti: 0,
            coppeSerieVinte: 0,
            supercoppeSerieVinte: 0
        };

        container.innerHTML = `
            <!-- Bacheca Trofei -->
            <div class="p-4 bg-gradient-to-r from-yellow-900 to-amber-800 rounded-lg border-2 border-yellow-500 mb-4">
                <h3 class="text-xl font-bold text-yellow-400 mb-3 text-center">🏛️ Bacheca Trofei</h3>
                <div class="grid grid-cols-3 gap-3 text-center">
                    <div class="bg-gray-900 bg-opacity-50 p-3 rounded-lg">
                        <p class="text-3xl mb-1">🏅</p>
                        <p class="text-2xl font-bold text-yellow-400">${trophyData.campionatiVinti}</p>
                        <p class="text-xs text-gray-300">SerieSeriA</p>
                    </div>
                    <div class="bg-gray-900 bg-opacity-50 p-3 rounded-lg">
                        <p class="text-3xl mb-1">🏆</p>
                        <p class="text-2xl font-bold text-amber-400">${trophyData.coppeSerieVinte}</p>
                        <p class="text-xs text-gray-300">CoppaSeriA</p>
                    </div>
                    <div class="bg-gray-900 bg-opacity-50 p-3 rounded-lg">
                        <p class="text-3xl mb-1">⭐</p>
                        <p class="text-2xl font-bold text-orange-400">${trophyData.supercoppeSerieVinte}</p>
                        <p class="text-xs text-gray-300">SuperCoppaSeriA</p>
                    </div>
                </div>
            </div>

            <!-- Header con Statistiche -->
            <div class="p-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg border-2 border-cyan-500 mb-4">
                <h3 class="text-xl font-bold text-cyan-400 mb-3 text-center">Riepilogo Partite</h3>
                <div class="grid grid-cols-4 gap-2 text-center">
                    <div class="bg-gray-900 p-2 rounded">
                        <p class="text-2xl font-bold text-green-400">${stats.wins}</p>
                        <p class="text-xs text-gray-400">Vittorie</p>
                    </div>
                    <div class="bg-gray-900 p-2 rounded">
                        <p class="text-2xl font-bold text-yellow-400">${stats.draws}</p>
                        <p class="text-xs text-gray-400">Pareggi</p>
                    </div>
                    <div class="bg-gray-900 p-2 rounded">
                        <p class="text-2xl font-bold text-red-400">${stats.losses}</p>
                        <p class="text-xs text-gray-400">Sconfitte</p>
                    </div>
                    <div class="bg-gray-900 p-2 rounded">
                        <p class="text-2xl font-bold text-cyan-400">${stats.winRate}%</p>
                        <p class="text-xs text-gray-400">Win Rate</p>
                    </div>
                </div>
                <div class="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                        <span class="text-gray-400">Gol Fatti:</span>
                        <span class="text-green-400 font-bold ml-1">${stats.goalsScored}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Gol Subiti:</span>
                        <span class="text-red-400 font-bold ml-1">${stats.goalsConceded}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Diff. Reti:</span>
                        <span class="${stats.goalDifference >= 0 ? 'text-green-400' : 'text-red-400'} font-bold ml-1">${stats.goalDifference > 0 ? '+' : ''}${stats.goalDifference}</span>
                    </div>
                </div>
            </div>

            <!-- Filtri -->
            <div class="flex flex-wrap gap-2 mb-4 justify-center">
                <button class="filter-btn px-3 py-1 rounded-lg text-sm font-semibold transition ${this.currentFilter === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-filter="all">
                    Tutte (${history.length})
                </button>
                <button class="filter-btn px-3 py-1 rounded-lg text-sm font-semibold transition ${this.currentFilter === 'campionato' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-filter="campionato">
                    🏅 SerieSeriA
                </button>
                <button class="filter-btn px-3 py-1 rounded-lg text-sm font-semibold transition ${this.currentFilter === 'coppa' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-filter="coppa">
                    🏆 CoppaSeriA
                </button>
                <button class="filter-btn px-3 py-1 rounded-lg text-sm font-semibold transition ${this.currentFilter === 'sfida' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-filter="sfida">
                    ⚔️ Sfide
                </button>
                <button class="filter-btn px-3 py-1 rounded-lg text-sm font-semibold transition ${this.currentFilter === 'sfida_realtime' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-filter="sfida_realtime">
                    🎲 Real-Time
                </button>
                <button class="filter-btn px-3 py-1 rounded-lg text-sm font-semibold transition ${this.currentFilter === 'allenamento' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-filter="allenamento">
                    ⚽ Allenamenti
                </button>
            </div>

            <!-- Lista Partite -->
            <div class="space-y-2 max-h-[400px] overflow-y-auto" id="match-history-list">
                ${filteredHistory.length === 0 ? `
                    <div class="p-4 bg-gray-700 rounded-lg text-center">
                        <p class="text-gray-400">Nessuna partita trovata</p>
                        <p class="text-sm text-gray-500 mt-1">Le partite giocate appariranno qui</p>
                    </div>
                ` : filteredHistory.map(match => this.renderMatchCard(match)).join('')}
            </div>
        `;

        // Salva storico per accesso da event listener
        this.currentHistory = history;

        // Event listeners per i filtri
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.renderUI(container, history);
            });
        });

        // Event listeners per bottoni telecronaca
        container.querySelectorAll('.btn-telecronaca').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = e.target.dataset.matchId;
                const match = this.currentHistory.find(m => m.id === matchId);
                if (match && match.details?.matchLog) {
                    this.showTelecronacaModal(
                        match.details.matchLog,
                        match.homeTeam.name,
                        match.awayTeam.name,
                        match.homeScore,
                        match.awayScore
                    );
                }
            });
        });
    },

    /**
     * Renderizza una card partita
     */
    renderMatchCard(match) {
        const typeIcon = this.TYPE_ICONS[match.type] || '⚽';
        const resultColor = this.RESULT_COLORS[match.result] || 'text-gray-400';
        const resultIcon = match.result === 'win' ? '✅' : (match.result === 'loss' ? '❌' : '🟰');

        const myTeamName = match.isHome ? match.homeTeam.name : match.awayTeam.name;
        const opponentName = match.isHome ? match.awayTeam.name : match.homeTeam.name;
        const myScore = match.isHome ? match.homeScore : match.awayScore;
        const opponentScore = match.isHome ? match.awayScore : match.homeScore;

        // Info aggiuntive per sfide con scommessa
        let betInfo = '';
        if ((match.type === 'sfida' || match.type === 'sfida_realtime') && match.betAmount > 0) {
            const creditsChange = match.result === 'win' ? `+${match.creditsWon || match.betAmount}` :
                                  match.result === 'loss' ? `-${match.betAmount}` : '0';
            const creditsColor = match.result === 'win' ? 'text-green-400' :
                                 match.result === 'loss' ? 'text-red-400' : 'text-yellow-400';
            betInfo = `<span class="${creditsColor} text-xs ml-2">(${creditsChange} CS)</span>`;
        }

        // Info partita abbandonata
        let abandonedInfo = '';
        if (match.abandoned) {
            abandonedInfo = `<span class="text-orange-400 text-xs ml-2">(Abbandonata)</span>`;
        }

        // Bottone Telecronaca (solo se esiste matchLog)
        const hasMatchLog = match.details?.matchLog && Array.isArray(match.details.matchLog) && match.details.matchLog.length > 0;
        const telecronacaBtn = hasMatchLog ? `
            <button class="btn-telecronaca mt-2 w-full bg-cyan-700 hover:bg-cyan-600 text-white text-xs py-1 px-2 rounded transition"
                    data-match-id="${match.id}">
                📺 Telecronaca azione per azione
            </button>
        ` : '';

        return `
            <div class="p-3 bg-gray-700 rounded-lg border-l-4 ${match.result === 'win' ? 'border-green-500' : match.result === 'loss' ? 'border-red-500' : 'border-yellow-500'} hover:bg-gray-600 transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${typeIcon}</span>
                        <div>
                            <p class="text-sm text-gray-400">${this.formatDate(match.date)}</p>
                            <p class="font-semibold text-white">
                                ${myTeamName}
                                <span class="${resultColor} font-bold">${myScore} - ${opponentScore}</span>
                                ${opponentName}
                                ${betInfo}${abandonedInfo}
                            </p>
                        </div>
                    </div>
                    <span class="text-2xl">${resultIcon}</span>
                </div>
                ${match.details?.scorers?.length > 0 ? `
                    <p class="text-xs text-gray-400 mt-1">
                        ⚽ Marcatori: ${match.details.scorers.join(', ')}
                    </p>
                ` : ''}
                ${telecronacaBtn}
            </div>
        `;
    },

    /**
     * Mostra il modal della telecronaca
     */
    showTelecronacaModal(matchLog, homeTeam, awayTeam, homeScore, awayScore) {
        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('telecronaca-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'telecronaca-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4';

        const logHtml = matchLog.map(line => {
            // Colora le linee in base al contenuto
            if (line.includes('GOL!') || line.includes('GOAL!')) {
                return `<p class="text-green-400 font-bold">${line}</p>`;
            } else if (line.includes('OCCASIONE')) {
                return `<p class="text-yellow-400 font-semibold">${line}</p>`;
            } else if (line.includes('Fase 1') || line.includes('Fase 2') || line.includes('Fase 3')) {
                return `<p class="text-cyan-400">${line}</p>`;
            } else if (line.includes('ATT:') || line.includes('DEF:')) {
                return `<p class="text-gray-300 text-sm pl-4">${line}</p>`;
            } else if (line.includes('===')) {
                return `<p class="text-white font-bold text-center my-2 border-b border-gray-600 pb-2">${line.replace(/=/g, '')}</p>`;
            } else {
                return `<p class="text-gray-400">${line}</p>`;
            }
        }).join('');

        modal.innerHTML = `
            <div class="bg-gray-900 rounded-lg border-2 border-cyan-500 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div class="p-4 bg-gradient-to-r from-cyan-800 to-cyan-600 flex justify-between items-center">
                    <div>
                        <h3 class="text-xl font-bold text-white">📺 Telecronaca</h3>
                        <p class="text-cyan-200 text-sm">${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}</p>
                    </div>
                    <button id="close-telecronaca-modal" class="text-white hover:text-cyan-200 text-2xl">&times;</button>
                </div>
                <div class="p-4 overflow-y-auto flex-1 space-y-1 font-mono text-xs">
                    ${logHtml}
                </div>
                <div class="p-3 bg-gray-800 text-center">
                    <button id="close-telecronaca-btn" class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition">
                        Chiudi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners per chiudere
        document.getElementById('close-telecronaca-modal').addEventListener('click', () => modal.remove());
        document.getElementById('close-telecronaca-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // Listener real-time per trofei
    trophiesUnsubscribe: null,

    /**
     * Avvia listener real-time per i trofei
     */
    startTrophiesListener(teamId) {
        // Rimuovi listener precedente se esiste
        if (this.trophiesUnsubscribe) {
            this.trophiesUnsubscribe();
            this.trophiesUnsubscribe = null;
        }

        if (!teamId || !window.db || !window.firestoreTools) return;

        try {
            const { doc, onSnapshot } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamId);

            this.trophiesUnsubscribe = onSnapshot(teamDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    const newTrophies = {
                        campionatiVinti: data.campionatiVinti || 0,
                        coppeSerieVinte: data.coppeSerieVinte || 0,
                        supercoppeSerieVinte: data.supercoppeSerieVinte || 0
                    };

                    // Aggiorna cache
                    this.cachedTrophies = newTrophies;

                    // Aggiorna UI se il pannello e' visibile
                    const container = document.getElementById('match-history-tools-container');
                    const panel = document.getElementById('match-history-content');
                    if (container && panel && !panel.classList.contains('hidden')) {
                        // Aggiorna solo la sezione trofei
                        const trophySection = container.querySelector('.grid.grid-cols-3.gap-3');
                        if (trophySection) {
                            const trophyDivs = trophySection.querySelectorAll('.bg-gray-900');
                            if (trophyDivs.length >= 3) {
                                trophyDivs[0].querySelector('.text-2xl').textContent = newTrophies.campionatiVinti;
                                trophyDivs[1].querySelector('.text-2xl').textContent = newTrophies.coppeSerieVinte;
                                trophyDivs[2].querySelector('.text-2xl').textContent = newTrophies.supercoppeSerieVinte;
                            }
                        }
                    }

                    console.log("MatchHistory: trofei aggiornati in real-time", newTrophies);
                }
            }, (error) => {
                console.error("MatchHistory: errore listener trofei", error);
            });

            console.log("MatchHistory: listener trofei avviato per", teamId);

        } catch (error) {
            console.error("MatchHistory: errore avvio listener trofei", error);
        }
    },

    /**
     * Ferma il listener real-time
     */
    stopTrophiesListener() {
        if (this.trophiesUnsubscribe) {
            this.trophiesUnsubscribe();
            this.trophiesUnsubscribe = null;
            console.log("MatchHistory: listener trofei fermato");
        }
    },

    /**
     * Inizializza il modulo
     */
    init() {
        // Ascolta eventi per salvare partite
        document.addEventListener('matchCompleted', (e) => {
            if (e.detail) {
                this.saveMatch(e.detail.teamId, e.detail.matchData);
            }
        });

        // Avvia listener trofei quando l'utente e' loggato
        document.addEventListener('teamLoggedIn', (e) => {
            if (e.detail?.teamId) {
                this.startTrophiesListener(e.detail.teamId);
            }
        });

        // Ferma listener quando l'utente esce
        document.addEventListener('teamLoggedOut', () => {
            this.stopTrophiesListener();
        });

        // Avvia listener se gia' loggato
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (currentTeamId) {
            this.startTrophiesListener(currentTeamId);
        }

        console.log("MatchHistory inizializzato con supporto real-time trofei");
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.MatchHistory.init();
    }, 1000);
});

console.log("Modulo MatchHistory caricato.");
