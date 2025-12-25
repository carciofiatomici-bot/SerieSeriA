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
     * Renderizza l'interfaccia utente (Mobile-First)
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

        // Conteggi per tipo
        const countByType = {
            all: history.length,
            campionato: history.filter(m => m.type === 'campionato').length,
            coppa: history.filter(m => m.type === 'coppa').length,
            sfida: history.filter(m => m.type === 'sfida').length,
            sfida_realtime: history.filter(m => m.type === 'sfida_realtime').length,
            allenamento: history.filter(m => m.type === 'allenamento').length
        };

        container.innerHTML = `
            <div class="pb-24">

                <!-- Header Sticky Mobile-First -->
                <div class="sticky top-0 z-30 bg-gradient-to-b from-slate-900 via-slate-900/98 to-transparent pb-3 pt-2 -mx-3 px-3">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">🏛️</span>
                            <h2 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">HALL OF FAME</h2>
                        </div>
                        <div class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-800/80 border border-gray-700">
                            <span class="text-cyan-400 text-sm font-bold">${stats.winRate}%</span>
                            <span class="text-[9px] text-gray-500">WIN</span>
                        </div>
                    </div>
                </div>

                <!-- Bacheca Trofei (Compatta) -->
                <div class="mb-3">
                    <div class="flex gap-2">
                        <!-- Campionato -->
                        <div class="flex-1 bg-gradient-to-br from-yellow-900/40 to-gray-900/60 border border-yellow-500/40 rounded-xl p-2 text-center relative overflow-hidden">
                            <div class="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500/10 rounded-full blur-lg"></div>
                            <span class="text-2xl drop-shadow-lg">🏅</span>
                            <p class="text-xl font-black text-yellow-400">${trophyData.campionatiVinti}</p>
                            <p class="text-[8px] text-gray-400 uppercase tracking-wider">Serie</p>
                        </div>
                        <!-- Coppa -->
                        <div class="flex-1 bg-gradient-to-br from-amber-900/40 to-gray-900/60 border border-amber-500/40 rounded-xl p-2 text-center relative overflow-hidden">
                            <div class="absolute -top-2 -right-2 w-8 h-8 bg-amber-500/10 rounded-full blur-lg"></div>
                            <span class="text-2xl drop-shadow-lg">🏆</span>
                            <p class="text-xl font-black text-amber-400">${trophyData.coppeSerieVinte}</p>
                            <p class="text-[8px] text-gray-400 uppercase tracking-wider">Coppa</p>
                        </div>
                        <!-- Supercoppa -->
                        <div class="flex-1 bg-gradient-to-br from-orange-900/40 to-gray-900/60 border border-orange-500/40 rounded-xl p-2 text-center relative overflow-hidden">
                            <div class="absolute -top-2 -right-2 w-8 h-8 bg-orange-500/10 rounded-full blur-lg"></div>
                            <span class="text-2xl drop-shadow-lg">⭐</span>
                            <p class="text-xl font-black text-orange-400">${trophyData.supercoppeSerieVinte}</p>
                            <p class="text-[8px] text-gray-400 uppercase tracking-wider">Super</p>
                        </div>
                    </div>
                </div>

                <!-- Stats Compatte -->
                <div class="mb-3 bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-xl p-3 border border-gray-700/50">
                    <div class="flex justify-between items-center gap-2">
                        <!-- Vittorie -->
                        <div class="flex-1 text-center">
                            <p class="text-lg font-black text-green-400">${stats.wins}</p>
                            <p class="text-[9px] text-gray-500">V</p>
                        </div>
                        <div class="w-px h-8 bg-gray-700"></div>
                        <!-- Pareggi -->
                        <div class="flex-1 text-center">
                            <p class="text-lg font-black text-yellow-400">${stats.draws}</p>
                            <p class="text-[9px] text-gray-500">P</p>
                        </div>
                        <div class="w-px h-8 bg-gray-700"></div>
                        <!-- Sconfitte -->
                        <div class="flex-1 text-center">
                            <p class="text-lg font-black text-red-400">${stats.losses}</p>
                            <p class="text-[9px] text-gray-500">S</p>
                        </div>
                        <div class="w-px h-8 bg-gray-700"></div>
                        <!-- Gol -->
                        <div class="flex-1 text-center">
                            <p class="text-lg font-black text-white">${stats.goalsScored}</p>
                            <p class="text-[9px] text-gray-500">GF</p>
                        </div>
                        <div class="w-px h-8 bg-gray-700"></div>
                        <!-- Gol Subiti -->
                        <div class="flex-1 text-center">
                            <p class="text-lg font-black text-gray-400">${stats.goalsConceded}</p>
                            <p class="text-[9px] text-gray-500">GS</p>
                        </div>
                        <div class="w-px h-8 bg-gray-700"></div>
                        <!-- Diff -->
                        <div class="flex-1 text-center">
                            <p class="text-lg font-black ${stats.goalDifference >= 0 ? 'text-green-400' : 'text-red-400'}">${stats.goalDifference > 0 ? '+' : ''}${stats.goalDifference}</p>
                            <p class="text-[9px] text-gray-500">DR</p>
                        </div>
                    </div>
                </div>

                <!-- Filtri (Scroll orizzontale) -->
                <div class="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1">
                    <button class="filter-btn flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'all' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}" data-filter="all">
                        Tutte <span class="text-[10px] opacity-70">${countByType.all}</span>
                    </button>
                    <button class="filter-btn flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'campionato' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}" data-filter="campionato">
                        🏅 Serie <span class="text-[10px] opacity-70">${countByType.campionato}</span>
                    </button>
                    <button class="filter-btn flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'coppa' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}" data-filter="coppa">
                        🏆 Coppa <span class="text-[10px] opacity-70">${countByType.coppa}</span>
                    </button>
                    <button class="filter-btn flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'sfida' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}" data-filter="sfida">
                        ⚔️ Sfide <span class="text-[10px] opacity-70">${countByType.sfida}</span>
                    </button>
                    <button class="filter-btn flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'sfida_realtime' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}" data-filter="sfida_realtime">
                        🎲 Live <span class="text-[10px] opacity-70">${countByType.sfida_realtime}</span>
                    </button>
                    <button class="filter-btn flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'allenamento' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}" data-filter="allenamento">
                        ⚽ Train <span class="text-[10px] opacity-70">${countByType.allenamento}</span>
                    </button>
                </div>

                <!-- Lista Partite -->
                <div class="space-y-2" id="match-history-list">
                    ${filteredHistory.length === 0 ? `
                        <div class="text-center py-8">
                            <p class="text-4xl mb-3">📭</p>
                            <p class="text-gray-400 font-semibold">Nessuna partita</p>
                            <p class="text-[10px] text-gray-500 mt-1">Le partite giocate appariranno qui</p>
                        </div>
                    ` : filteredHistory.slice(0, 30).map(match => this.renderMatchCard(match)).join('')}
                    ${filteredHistory.length > 30 ? `
                        <div class="text-center py-3">
                            <p class="text-[10px] text-gray-500">Mostrando 30 di ${filteredHistory.length} partite</p>
                        </div>
                    ` : ''}
                </div>

            </div>
        `;

        // Salva storico per accesso da event listener
        this.currentHistory = history;

        // Event listeners per i filtri
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.closest('.filter-btn').dataset.filter;
                this.renderUI(container, history);
            });
        });

        // Event listeners per bottoni telecronaca
        container.querySelectorAll('.btn-telecronaca').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = e.target.closest('.btn-telecronaca').dataset.matchId;
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
     * Renderizza una card partita (Mobile-First)
     */
    renderMatchCard(match) {
        const typeIcon = this.TYPE_ICONS[match.type] || '⚽';

        const myTeamName = match.isHome ? match.homeTeam.name : match.awayTeam.name;
        const opponentName = match.isHome ? match.awayTeam.name : match.homeTeam.name;
        const myScore = match.isHome ? match.homeScore : match.awayScore;
        const opponentScore = match.isHome ? match.awayScore : match.homeScore;

        // Colori e stili per risultato
        const resultStyles = {
            win: { bg: 'from-green-900/30', border: 'border-green-500/50', scoreBg: 'bg-green-500', icon: '✓' },
            loss: { bg: 'from-red-900/30', border: 'border-red-500/50', scoreBg: 'bg-red-500', icon: '✗' },
            draw: { bg: 'from-yellow-900/30', border: 'border-yellow-500/50', scoreBg: 'bg-yellow-500', icon: '=' }
        };
        const style = resultStyles[match.result] || resultStyles.draw;

        // Info aggiuntive per sfide con scommessa
        let betBadge = '';
        if ((match.type === 'sfida' || match.type === 'sfida_realtime') && match.betAmount > 0) {
            const creditsChange = match.result === 'win' ? `+${match.creditsWon || match.betAmount}` :
                                  match.result === 'loss' ? `-${match.betAmount}` : '0';
            const creditsColor = match.result === 'win' ? 'bg-green-900/50 text-green-400' :
                                 match.result === 'loss' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400';
            betBadge = `<span class="text-[9px] ${creditsColor} px-1.5 py-0.5 rounded-full font-bold">${creditsChange} CS</span>`;
        }

        // Info partita abbandonata
        let abandonedBadge = '';
        if (match.abandoned) {
            abandonedBadge = `<span class="text-[9px] bg-orange-900/50 text-orange-400 px-1.5 py-0.5 rounded-full">ABB</span>`;
        }

        // Formatta data compatta
        const date = new Date(match.date);
        const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        // Bottone Telecronaca (solo se esiste matchLog)
        const hasMatchLog = match.details?.matchLog && Array.isArray(match.details.matchLog) && match.details.matchLog.length > 0;
        const telecronacaBtn = hasMatchLog ? `
            <button class="btn-telecronaca mt-2 w-full bg-cyan-900/50 hover:bg-cyan-800/60 text-cyan-400 text-[10px] font-bold py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1"
                    data-match-id="${match.id}">
                <span>📺</span> Telecronaca
            </button>
        ` : '';

        // Marcatori compatti
        const scorersLine = match.details?.scorers?.length > 0 ? `
            <div class="mt-1.5 flex items-center gap-1 text-[10px] text-gray-500">
                <span>⚽</span>
                <span class="truncate">${match.details.scorers.slice(0, 3).map(s => typeof s === 'string' ? s : s.name).join(', ')}${match.details.scorers.length > 3 ? '...' : ''}</span>
            </div>
        ` : '';

        return `
            <div class="bg-gradient-to-br ${style.bg} to-gray-900/80 rounded-xl p-2.5 border ${style.border} transition-all active:scale-[0.99]">
                <!-- Header: tipo + data + badges -->
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-base">${typeIcon}</span>
                        <span class="text-[10px] text-gray-500">${dateStr} ${timeStr}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        ${abandonedBadge}
                        ${betBadge}
                    </div>
                </div>

                <!-- Risultato: VS style compatto -->
                <div class="flex items-center justify-between">
                    <!-- Mia squadra -->
                    <div class="flex-1 min-w-0">
                        <p class="text-white text-sm font-bold truncate">${myTeamName}</p>
                    </div>

                    <!-- Score centrale -->
                    <div class="flex items-center gap-1 mx-2">
                        <span class="text-white font-black text-lg">${myScore}</span>
                        <span class="text-gray-600 text-xs">-</span>
                        <span class="text-gray-400 font-black text-lg">${opponentScore}</span>
                        <span class="w-5 h-5 ${style.scoreBg} rounded-full flex items-center justify-center text-[10px] text-white font-bold ml-1">${style.icon}</span>
                    </div>

                    <!-- Avversario -->
                    <div class="flex-1 min-w-0 text-right">
                        <p class="text-gray-400 text-sm font-semibold truncate">${opponentName}</p>
                    </div>
                </div>

                ${scorersLine}
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
            // Supporta sia stringhe (vecchio formato) che oggetti (nuovo formato)
            if (typeof line === 'object' && line !== null) {
                // Nuovo formato: oggetto con type, teamName, scorer, etc.
                if (line.type === 'goal') {
                    const assistText = line.assist ? ` su assist di ${line.assist}` : '';
                    const scoreText = line.homeScore !== undefined ? ` (${line.homeScore}-${line.awayScore})` : '';
                    return `<p class="text-green-400 font-bold">${line.minute}' - ⚽ GOL! ${line.scorer} (${line.teamName})${assistText}${scoreText}</p>`;
                } else if (line.description) {
                    return `<p class="text-gray-400">${line.description}</p>`;
                } else {
                    return `<p class="text-gray-400">${JSON.stringify(line)}</p>`;
                }
            }

            // Vecchio formato: stringa
            if (typeof line !== 'string') return '';

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

    /**
     * Mostra il modal della telecronaca COMPLETA (tutte le 50 occasioni)
     * @param {Array} matchEvents - Array di eventi completi dalla simulazione
     * @param {string} homeTeam - Nome squadra casa
     * @param {string} awayTeam - Nome squadra ospite
     * @param {number} homeScore - Gol squadra casa
     * @param {number} awayScore - Gol squadra ospite
     */
    showTelecronacaCompletaModal(matchEvents, homeTeam, awayTeam, homeScore, awayScore) {
        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('telecronaca-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'telecronaca-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4';

        // Genera HTML per ogni occasione
        const eventsHtml = matchEvents.map((event, idx) => {
            // Supporta sia vecchio formato (result: 'goal') che nuovo (isGoal: true)
            const isGoal = event.isGoal === true || event.result === 'goal';
            // Supporta sia vecchio formato (side: 'home') che nuovo (team: 'home')
            const isHome = event.side === 'home' || event.team === 'home';
            const teamColor = isHome ? 'text-blue-400' : 'text-red-400';
            const bgColor = isGoal ? 'bg-green-900 bg-opacity-30 border-green-500' : 'bg-gray-800 border-gray-600';

            // Formatta minuto
            const minute = event.minute || (idx + 1);

            // Fasi della partita
            let phasesHtml = '';

            // Supporta sia il vecchio formato (phases come oggetto) che il nuovo (phases come array)
            if (Array.isArray(event.phases)) {
                // Nuovo formato: array di oggetti {phase, success, player, description}
                event.phases.forEach(p => {
                    const resultIcon = p.success ? '✅' : '❌';
                    const resultClass = p.success ? 'text-green-400' : 'text-red-400';
                    const phaseColor = p.phase === 'costruzione' ? 'text-cyan-400' :
                                       p.phase === 'attacco' ? 'text-yellow-400' : 'text-orange-400';
                    const phaseName = p.phase.charAt(0).toUpperCase() + p.phase.slice(1);
                    phasesHtml += `
                        <div class="pl-4 text-xs">
                            <span class="${phaseColor}">${phaseName}:</span>
                            <span class="${resultClass}">${resultIcon}</span>
                            <span class="text-gray-400 ml-1">${p.player || ''}</span>
                        </div>
                    `;
                });
            } else if (event.phases && typeof event.phases === 'object') {
                // Vecchio formato: oggetto con construction, attack, shot
                const construction = event.phases.construction;
                if (construction && !construction.skipped) {
                    const resultIcon = construction.result === 'success' || construction.result === 'lucky' ? '✅' : '❌';
                    const resultClass = construction.result === 'success' || construction.result === 'lucky' ? 'text-green-400' : 'text-red-400';
                    phasesHtml += `
                        <div class="pl-4 text-xs">
                            <span class="text-cyan-400">Costruzione:</span>
                            <span class="${resultClass}">${resultIcon} ${construction.result === 'lucky' ? 'Fortuna!' : construction.result}</span>
                            ${construction.totals ? `<span class="text-gray-500 ml-2">(${construction.totals.attacker?.toFixed(1) || '?'} vs ${construction.totals.defender?.toFixed(1) || '?'})</span>` : ''}
                        </div>
                    `;
                } else if (construction?.skipped) {
                    phasesHtml += `<div class="pl-4 text-xs text-gray-500">Costruzione: Saltata (${construction.reason})</div>`;
                }

                const attack = event.phases.attack;
                if (attack && !attack.interrupted) {
                    const resultIcon = attack.result === 'success' || attack.result === 'lucky' ? '✅' : '❌';
                    const resultClass = attack.result === 'success' || attack.result === 'lucky' ? 'text-green-400' : 'text-red-400';
                    phasesHtml += `
                        <div class="pl-4 text-xs">
                            <span class="text-yellow-400">Attacco:</span>
                            <span class="${resultClass}">${resultIcon} ${attack.result === 'lucky' ? 'Fortuna!' : attack.result}</span>
                            ${attack.totals ? `<span class="text-gray-500 ml-2">(${attack.totals.attacker?.toFixed(1) || '?'} vs ${attack.totals.defender?.toFixed(1) || '?'})</span>` : ''}
                        </div>
                    `;
                } else if (attack?.interrupted) {
                    phasesHtml += `<div class="pl-4 text-xs text-gray-500">Attacco: Interrotto</div>`;
                }

                const shot = event.phases.shot;
                if (shot) {
                    const resultIcon = isGoal ? '⚽' : '🧤';
                    const resultClass = isGoal ? 'text-green-400 font-bold' : 'text-red-400';
                    const shotResult = isGoal ? 'GOL!' : 'Parato';
                    phasesHtml += `
                        <div class="pl-4 text-xs">
                            <span class="text-orange-400">Tiro:</span>
                            <span class="${resultClass}">${resultIcon} ${shotResult}</span>
                            ${shot.totalGoalkeeper ? `<span class="text-gray-500 ml-2">(Portiere: ${shot.totalGoalkeeper.toFixed(1)})</span>` : ''}
                        </div>
                    `;
                }
            }

            // Abilita attivate
            let abilitiesHtml = '';
            if (event.abilities && event.abilities.length > 0) {
                abilitiesHtml = `<div class="pl-4 text-xs text-purple-400">✨ ${event.abilities.join(', ')}</div>`;
            }

            return `
                <div class="border-l-2 ${bgColor} pl-3 py-2 mb-2 rounded-r">
                    <div class="flex items-center gap-2">
                        <span class="text-white font-bold">${minute}'</span>
                        <span class="${teamColor} font-semibold">${event.teamName || event.attackingTeam || (isHome ? homeTeam : awayTeam)}</span>
                        ${isGoal ? '<span class="text-green-400 font-bold">⚽ GOL!</span>' : '<span class="text-gray-400">Occasione</span>'}
                    </div>
                    ${phasesHtml}
                    ${abilitiesHtml}
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="bg-gray-900 rounded-lg border-2 border-purple-500 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                <div class="p-4 bg-gradient-to-r from-purple-800 to-purple-600 flex justify-between items-center">
                    <div>
                        <h3 class="text-xl font-bold text-white">📺 Telecronaca Completa</h3>
                        <p class="text-purple-200 text-sm">${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}</p>
                        <p class="text-purple-300 text-xs">${matchEvents.length} azioni totali</p>
                    </div>
                    <button id="close-telecronaca-modal" class="text-white hover:text-purple-200 text-2xl">&times;</button>
                </div>
                <div class="p-4 overflow-y-auto flex-1">
                    ${eventsHtml}
                </div>
                <div class="p-3 bg-gray-800 text-center">
                    <button id="close-telecronaca-btn" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition">
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
