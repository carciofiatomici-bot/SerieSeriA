//
// ====================================================================
// MODULO MVP-GIORNO.JS - MVP del Giorno
// ====================================================================
//
// Calcola il miglior giocatore dopo ogni 2 partite simulate.
// Formula: (Gol x 3) + (Assist x 2) + (CleanSheet x 2) + (Parate x 1.5) + (Vittorie x 1.5) + (MediaVoto - 6)
// Parita: Gol -> Assist -> Parate
// Bonus: +5% XP fino al prossimo calcolo
//

window.MvpDelGiorno = {

    // Path Firestore
    getConfigPath() {
        const appId = window.firestoreTools?.appId;
        return `artifacts/${appId}/public/data/config`;
    },

    MVP_DOC_ID: 'mvpDelGiorno',
    HISTORY_DOC_ID: 'mvpHistory',

    // Cache locale per ridurre letture Firestore
    _currentMvp: null,
    _lastFetch: 0,
    CACHE_TTL: 60000, // 1 minuto

    /**
     * Verifica se il sistema MVP e' abilitato
     */
    isEnabled() {
        return window.FeatureFlags?.isEnabled('mvpDelGiorno') || false;
    },

    /**
     * Calcola il punteggio MVP per un giocatore
     * @param {Object} stats - Statistiche del giocatore dalle ultime 2 partite
     * @returns {number} Punteggio MVP
     */
    calculateScore(stats) {
        const goals = stats.goals || 0;
        const assists = stats.assists || 0;
        const cleanSheets = stats.cleanSheets || 0;
        const saves = stats.saves || 0;
        const wins = stats.wins || 0;
        const avgRating = stats.avgRating || 6;

        const score = (goals * 3) +
                      (assists * 2) +
                      (cleanSheets * 2) +
                      (saves * 1.5) +
                      (wins * 1.5) +
                      (avgRating - 6);

        return Math.round(score * 100) / 100; // Arrotonda a 2 decimali
    },

    /**
     * Confronta due giocatori per la parita
     * Ordine: Gol -> Assist -> Parate
     * @returns {number} -1 se a > b, 1 se b > a, 0 se pari
     */
    compareTiebreaker(a, b) {
        // Prima: piu gol
        if ((a.goals || 0) !== (b.goals || 0)) {
            return (b.goals || 0) - (a.goals || 0);
        }
        // Seconda: piu assist
        if ((a.assists || 0) !== (b.assists || 0)) {
            return (b.assists || 0) - (a.assists || 0);
        }
        // Terza: piu parate
        return (b.saves || 0) - (a.saves || 0);
    },

    /**
     * Raccoglie le statistiche delle ultime 2 partite per tutti i giocatori
     * @param {Array} matches - Array delle ultime 2 partite simulate
     * @returns {Object} Mappa playerId -> stats aggregate
     */
    aggregateMatchStats(matches) {
        const playerStats = {};

        for (const match of matches) {
            if (!match || !match.result) continue;

            const homeTeamId = match.homeTeamId || match.homeTeam?.id;
            const awayTeamId = match.awayTeamId || match.awayTeam?.id;
            const homeScore = match.result?.homeGoals || 0;
            const awayScore = match.result?.awayGoals || 0;

            // Determina vincitore
            const homeWon = homeScore > awayScore;
            const awayWon = awayScore > homeScore;

            // Processa giocatori squadra casa
            if (match.homeTeam?.formation?.titolari) {
                this.processTeamPlayers(
                    playerStats,
                    match.homeTeam.formation.titolari,
                    match.homeTeam.teamName || match.homeTeam.name,
                    homeTeamId,
                    homeWon,
                    awayScore === 0, // cleanSheet se non ha subito gol
                    match.result?.homeGoals || 0,
                    match.result?.awayGoals || 0,
                    match.matchLog,
                    'home'
                );
            }

            // Processa giocatori squadra trasferta
            if (match.awayTeam?.formation?.titolari) {
                this.processTeamPlayers(
                    playerStats,
                    match.awayTeam.formation.titolari,
                    match.awayTeam.teamName || match.awayTeam.name,
                    awayTeamId,
                    awayWon,
                    homeScore === 0, // cleanSheet se non ha subito gol
                    match.result?.awayGoals || 0,
                    match.result?.homeGoals || 0,
                    match.matchLog,
                    'away'
                );
            }
        }

        return playerStats;
    },

    /**
     * Processa i giocatori di una squadra e aggiorna le statistiche aggregate
     */
    processTeamPlayers(playerStats, titolari, teamName, teamId, won, cleanSheet, goalsScored, goalsConceded, matchLog, side) {
        for (const player of titolari) {
            if (!player || !player.id) continue;

            if (!playerStats[player.id]) {
                playerStats[player.id] = {
                    playerId: player.id,
                    playerName: player.name,
                    teamId: teamId,
                    teamName: teamName,
                    role: player.role,
                    goals: 0,
                    assists: 0,
                    cleanSheets: 0,
                    saves: 0,
                    wins: 0,
                    matches: 0,
                    totalRating: 0
                };
            }

            const stats = playerStats[player.id];
            stats.matches++;

            // Vittoria
            if (won) {
                stats.wins++;
            }

            // Clean sheet per portieri
            if (player.role === 'P' && cleanSheet) {
                stats.cleanSheets++;
            }

            // Parate per portieri (stima: occasioni avversarie - gol subiti)
            // Il portiere para quando l'avversario non segna
            if (player.role === 'P') {
                // Stima parate: assumiamo che ogni partita abbia ~10 occasioni per squadra
                // Le parate sono occasioni avversarie non convertite in gol
                // Per semplicita: ogni gol subito in meno rispetto alle occasioni conta come parata
                // Usiamo una stima conservativa
                const estimatedSaves = Math.max(0, 5 - goalsConceded); // Stima base
                stats.saves += estimatedSaves;
            }

            // Voto medio (simulato basato su ruolo e risultato)
            let rating = 6;
            if (won) rating += 0.5;
            if (cleanSheet && player.role === 'P') rating += 1;
            if (goalsScored > 0 && player.role === 'A') rating += 0.5;
            stats.totalRating += rating;
        }

        // Assegna gol e assist dai dati della partita (se disponibili nel matchLog)
        this.assignGoalsAndAssists(playerStats, matchLog, teamId, side);
    },

    /**
     * Assegna gol e assist dal matchLog se disponibile
     */
    assignGoalsAndAssists(playerStats, matchLog, teamId, side) {
        if (!matchLog || !Array.isArray(matchLog)) return;

        for (const event of matchLog) {
            // Cerca eventi di gol
            if (event.result === 'goal' || event.phaseResult === 'goal') {
                const isHomeAttacking = event.attackingTeam === 'home' || event.side === 'home';
                const scoringSide = isHomeAttacking ? 'home' : 'away';

                if (scoringSide === side) {
                    // Cerca il giocatore che ha segnato
                    const shooterId = event.shooter?.id || event.scorerId;
                    if (shooterId && playerStats[shooterId]) {
                        playerStats[shooterId].goals++;
                    }

                    // Cerca assistman (se disponibile)
                    const assisterId = event.assister?.id || event.assisterId;
                    if (assisterId && playerStats[assisterId]) {
                        playerStats[assisterId].assists++;
                    }
                }
            }

            // Conta parate effettive per portieri
            if (event.result === 'saved' || event.phaseResult === 'saved') {
                const defendingSide = (event.attackingTeam === 'home') ? 'away' : 'home';
                if (defendingSide === side) {
                    const goalkeeperId = event.goalkeeper?.id;
                    if (goalkeeperId && playerStats[goalkeeperId]) {
                        // Rimuovi la stima e usa parata reale
                        if (!playerStats[goalkeeperId]._realSaves) {
                            playerStats[goalkeeperId]._realSaves = 0;
                            playerStats[goalkeeperId].saves = 0; // Reset stima
                        }
                        playerStats[goalkeeperId].saves++;
                        playerStats[goalkeeperId]._realSaves++;
                    }
                }
            }
        }
    },

    /**
     * Calcola e salva il nuovo MVP del Giorno
     * @param {Array} lastTwoMatches - Le ultime 2 partite simulate
     * @param {string} competition - Competizione (campionato, coppa)
     */
    async calculateAndSaveMvp(lastTwoMatches, competition = 'campionato') {
        if (!this.isEnabled()) {
            console.log('[MVP] Sistema MVP disabilitato');
            return null;
        }

        if (!lastTwoMatches || lastTwoMatches.length < 2) {
            console.log('[MVP] Servono almeno 2 partite per calcolare MVP');
            return null;
        }

        console.log('[MVP] Calcolo MVP del Giorno in corso...');

        // Aggrega statistiche
        const playerStats = this.aggregateMatchStats(lastTwoMatches);

        // Calcola score per ogni giocatore
        const playersWithScore = [];
        for (const playerId of Object.keys(playerStats)) {
            const stats = playerStats[playerId];
            stats.avgRating = stats.matches > 0 ? stats.totalRating / stats.matches : 6;
            stats.score = this.calculateScore(stats);
            playersWithScore.push(stats);
        }

        if (playersWithScore.length === 0) {
            console.log('[MVP] Nessun giocatore trovato nelle partite');
            return null;
        }

        // Ordina per score, poi tiebreaker
        playersWithScore.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return this.compareTiebreaker(a, b);
        });

        const mvp = playersWithScore[0];

        console.log(`[MVP] MVP del Giorno: ${mvp.playerName} (${mvp.teamName}) - Score: ${mvp.score}`);
        console.log(`[MVP] Stats: Gol=${mvp.goals}, Assist=${mvp.assists}, CS=${mvp.cleanSheets}, Parate=${mvp.saves}, Vittorie=${mvp.wins}`);

        // Salva su Firestore
        await this.saveMvp(mvp, competition);

        // Aggiungi allo storico
        await this.addToHistory(mvp, competition);

        // Invalida cache
        this._currentMvp = null;
        this._lastFetch = 0;

        return mvp;
    },

    /**
     * Salva il MVP corrente su Firestore
     */
    async saveMvp(mvp, competition) {
        if (!window.db || !window.firestoreTools) return;

        const { doc, setDoc } = window.firestoreTools;
        const docRef = doc(window.db, this.getConfigPath(), this.MVP_DOC_ID);

        const mvpData = {
            currentMvp: {
                playerId: mvp.playerId,
                playerName: mvp.playerName,
                teamId: mvp.teamId,
                teamName: mvp.teamName,
                role: mvp.role,
                score: mvp.score,
                stats: {
                    goals: mvp.goals,
                    assists: mvp.assists,
                    cleanSheets: mvp.cleanSheets,
                    saves: mvp.saves,
                    wins: mvp.wins,
                    avgRating: mvp.avgRating
                },
                competition: competition,
                calculatedAt: new Date().toISOString()
            },
            bonusActive: true,
            updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, mvpData);
        console.log('[MVP] MVP salvato su Firestore');
    },

    /**
     * Aggiunge il MVP allo storico
     */
    async addToHistory(mvp, competition) {
        if (!window.db || !window.firestoreTools) return;

        const { doc, getDoc, setDoc } = window.firestoreTools;
        const docRef = doc(window.db, this.getConfigPath(), this.HISTORY_DOC_ID);

        try {
            const historyDoc = await getDoc(docRef);
            let history = [];

            if (historyDoc.exists()) {
                history = historyDoc.data().history || [];
            }

            // Aggiungi nuovo MVP
            history.unshift({
                playerId: mvp.playerId,
                playerName: mvp.playerName,
                teamId: mvp.teamId,
                teamName: mvp.teamName,
                role: mvp.role,
                score: mvp.score,
                stats: {
                    goals: mvp.goals,
                    assists: mvp.assists,
                    cleanSheets: mvp.cleanSheets,
                    saves: mvp.saves
                },
                competition: competition,
                date: new Date().toISOString()
            });

            // Mantieni solo gli ultimi 365 record
            if (history.length > 365) {
                history = history.slice(0, 365);
            }

            await setDoc(docRef, { history, updatedAt: new Date().toISOString() });
            console.log('[MVP] Storico aggiornato');

        } catch (error) {
            console.error('[MVP] Errore aggiornamento storico:', error);
        }
    },

    /**
     * Ottiene il MVP corrente
     * @returns {Object|null} MVP corrente o null
     */
    async getCurrentMvp() {
        // Check cache
        if (this._currentMvp && (Date.now() - this._lastFetch) < this.CACHE_TTL) {
            return this._currentMvp;
        }

        if (!window.db || !window.firestoreTools) return null;

        const { doc, getDoc } = window.firestoreTools;
        const docRef = doc(window.db, this.getConfigPath(), this.MVP_DOC_ID);

        try {
            const mvpDoc = await getDoc(docRef);
            if (mvpDoc.exists()) {
                this._currentMvp = mvpDoc.data().currentMvp;
                this._lastFetch = Date.now();
                return this._currentMvp;
            }
        } catch (error) {
            console.error('[MVP] Errore caricamento MVP:', error);
        }

        return null;
    },

    /**
     * Ottiene lo storico MVP
     * @param {number} limit - Numero massimo di record
     * @returns {Array} Array di MVP storici
     */
    async getHistory(limit = 30) {
        if (!window.db || !window.firestoreTools) return [];

        const { doc, getDoc } = window.firestoreTools;
        const docRef = doc(window.db, this.getConfigPath(), this.HISTORY_DOC_ID);

        try {
            const historyDoc = await getDoc(docRef);
            if (historyDoc.exists()) {
                const history = historyDoc.data().history || [];
                return history.slice(0, limit);
            }
        } catch (error) {
            console.error('[MVP] Errore caricamento storico:', error);
        }

        return [];
    },

    /**
     * Verifica se un giocatore e' l'MVP corrente (asincrono)
     * @param {string} playerId - ID del giocatore
     * @returns {boolean}
     */
    async isCurrentMvp(playerId) {
        const mvp = await this.getCurrentMvp();
        return mvp?.playerId === playerId;
    },

    /**
     * Verifica se un giocatore e' l'MVP corrente (sincrono, usa cache)
     * @param {string} playerId - ID del giocatore
     * @returns {boolean}
     */
    isCurrentMvpSync(playerId) {
        if (!this._currentMvp) return false;
        return this._currentMvp.playerId === playerId;
    },

    /**
     * Ottiene il moltiplicatore bonus XP per un giocatore
     * @param {string} playerId - ID del giocatore
     * @returns {number} Moltiplicatore (1.0 normale, 1.05 se MVP)
     */
    async getXpMultiplier(playerId) {
        if (!this.isEnabled()) return 1.0;

        const isMvp = await this.isCurrentMvp(playerId);
        return isMvp ? 1.05 : 1.0;
    },

    /**
     * Listener real-time per aggiornamenti MVP
     */
    _unsubscribe: null,

    startRealtimeListener(callback) {
        if (!window.db || !window.firestoreTools) return;

        if (this._unsubscribe) {
            this._unsubscribe();
        }

        const { doc, onSnapshot } = window.firestoreTools;
        const docRef = doc(window.db, this.getConfigPath(), this.MVP_DOC_ID);

        this._unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                this._currentMvp = docSnap.data().currentMvp;
                this._lastFetch = Date.now();
                if (callback) {
                    callback(this._currentMvp);
                }
            }
        }, (error) => {
            console.warn('[MVP] Errore listener:', error);
        });

        console.log('[MVP] Listener real-time attivo');
    },

    stopRealtimeListener() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
    }
};

console.log("Modulo MvpDelGiorno caricato.");
