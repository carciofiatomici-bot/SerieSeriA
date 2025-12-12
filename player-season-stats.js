//
// ====================================================================
// MODULO PLAYER-SEASON-STATS.JS (Statistiche Stagionali Giocatori)
// ====================================================================
//
// Gestisce:
// - Goal segnati (per capocannoniere)
// - Assist effettuati (per miglior assistman)
// - Clean sheets portieri (reti inviolate)
//
// Le statistiche vengono resettate all'inizio di ogni nuova stagione.
//

window.PlayerSeasonStats = {

    // Path Firestore per le statistiche stagionali
    getStatsPath() {
        const appId = window.firestoreTools?.appId;
        return `artifacts/${appId}/public/data/seasonStats`;
    },

    STATS_DOC_ID: 'playerStats',

    /**
     * Inizializza/Resetta le statistiche stagionali.
     * Da chiamare quando si genera un nuovo calendario.
     * @param {Array} teams - Array di squadre partecipanti con i loro giocatori
     */
    async resetSeasonStats(teams = []) {
        const { doc, setDoc } = window.firestoreTools;
        const db = window.db;

        const statsDocRef = doc(db, this.getStatsPath(), this.STATS_DOC_ID);

        // Inizializza struttura vuota - le stats verranno popolate durante le partite
        const initialData = {
            seasonStartDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            stats: {}  // { playerId: { goals, assists, cleanSheets, playerName, teamId, teamName, role } }
        };

        await setDoc(statsDocRef, initialData);
        console.log('PlayerSeasonStats: Statistiche stagionali resettate.');

        return initialData;
    },

    /**
     * Carica le statistiche stagionali correnti da Firestore.
     * @returns {Object} Oggetto con le statistiche
     */
    async loadSeasonStats() {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;

        const statsDocRef = doc(db, this.getStatsPath(), this.STATS_DOC_ID);
        const statsDoc = await getDoc(statsDocRef);

        if (statsDoc.exists()) {
            return statsDoc.data();
        }

        // Se non esiste, inizializza
        return await this.resetSeasonStats();
    },

    /**
     * Registra un goal segnato.
     * @param {Object} scorer - Giocatore che ha segnato { id, name, role, teamId, teamName }
     * @param {Object|null} assister - Giocatore che ha fatto assist (opzionale)
     */
    async recordGoal(scorer, assister = null) {
        const { doc, getDoc, setDoc } = window.firestoreTools;
        const db = window.db;

        const statsDocRef = doc(db, this.getStatsPath(), this.STATS_DOC_ID);
        const statsDoc = await getDoc(statsDocRef);

        let data = statsDoc.exists() ? statsDoc.data() : { stats: {}, seasonStartDate: new Date().toISOString() };

        // Inizializza il giocatore se non esiste
        if (!data.stats[scorer.id]) {
            data.stats[scorer.id] = {
                playerId: scorer.id,
                playerName: scorer.name,
                teamId: scorer.teamId,
                teamName: scorer.teamName,
                role: scorer.role,
                goals: 0,
                assists: 0,
                cleanSheets: 0
            };
        }

        // Incrementa goal
        data.stats[scorer.id].goals++;

        // Registra assist se presente
        if (assister && assister.id !== scorer.id) {
            if (!data.stats[assister.id]) {
                data.stats[assister.id] = {
                    playerId: assister.id,
                    playerName: assister.name,
                    teamId: assister.teamId,
                    teamName: assister.teamName,
                    role: assister.role,
                    goals: 0,
                    assists: 0,
                    cleanSheets: 0
                };
            }
            data.stats[assister.id].assists++;
        }

        data.lastUpdated = new Date().toISOString();

        await setDoc(statsDocRef, data);
    },

    /**
     * Registra un clean sheet per il portiere.
     * @param {Object} goalkeeper - Portiere { id, name, teamId, teamName }
     */
    async recordCleanSheet(goalkeeper) {
        const { doc, getDoc, setDoc } = window.firestoreTools;
        const db = window.db;

        const statsDocRef = doc(db, this.getStatsPath(), this.STATS_DOC_ID);
        const statsDoc = await getDoc(statsDocRef);

        let data = statsDoc.exists() ? statsDoc.data() : { stats: {}, seasonStartDate: new Date().toISOString() };

        if (!data.stats[goalkeeper.id]) {
            data.stats[goalkeeper.id] = {
                playerId: goalkeeper.id,
                playerName: goalkeeper.name,
                teamId: goalkeeper.teamId,
                teamName: goalkeeper.teamName,
                role: 'P',
                goals: 0,
                assists: 0,
                cleanSheets: 0
            };
        }

        data.stats[goalkeeper.id].cleanSheets++;
        data.lastUpdated = new Date().toISOString();

        await setDoc(statsDocRef, data);
    },

    /**
     * Registra le statistiche di una partita completa.
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @param {number} homeGoals - Goal squadra casa
     * @param {number} awayGoals - Goal squadra trasferta
     */
    async recordMatchStats(homeTeamData, awayTeamData, homeGoals, awayGoals) {
        const { doc, getDoc, setDoc } = window.firestoreTools;
        const db = window.db;

        const statsDocRef = doc(db, this.getStatsPath(), this.STATS_DOC_ID);
        const statsDoc = await getDoc(statsDocRef);

        let data = statsDoc.exists() ? statsDoc.data() : { stats: {}, seasonStartDate: new Date().toISOString() };

        // Ottieni i titolari di entrambe le squadre
        const homeTitolari = homeTeamData.formation?.titolari || [];
        const awayTitolari = awayTeamData.formation?.titolari || [];

        // Registra goal squadra casa
        for (let i = 0; i < homeGoals; i++) {
            const { scorer, assister } = this.selectScorerAndAssister(homeTitolari, homeTeamData.teamName, homeTeamData.id || homeTeamData.teamId);
            if (scorer) {
                this.addGoalToStats(data.stats, scorer, assister);
            }
        }

        // Registra goal squadra trasferta
        for (let i = 0; i < awayGoals; i++) {
            const { scorer, assister } = this.selectScorerAndAssister(awayTitolari, awayTeamData.teamName, awayTeamData.id || awayTeamData.teamId);
            if (scorer) {
                this.addGoalToStats(data.stats, scorer, assister);
            }
        }

        // Registra clean sheet portiere casa (se non ha subito goal)
        if (awayGoals === 0) {
            const homeGK = homeTitolari.find(p => p.role === 'P');
            if (homeGK) {
                this.addCleanSheetToStats(data.stats, homeGK, homeTeamData.teamName, homeTeamData.id || homeTeamData.teamId);
            }
        }

        // Registra clean sheet portiere trasferta (se non ha subito goal)
        if (homeGoals === 0) {
            const awayGK = awayTitolari.find(p => p.role === 'P');
            if (awayGK) {
                this.addCleanSheetToStats(data.stats, awayGK, awayTeamData.teamName, awayTeamData.id || awayTeamData.teamId);
            }
        }

        data.lastUpdated = new Date().toISOString();

        await setDoc(statsDocRef, data);

        console.log(`PlayerSeasonStats: Registrate stats partita - Casa: ${homeGoals} gol, Trasferta: ${awayGoals} gol`);
    },

    /**
     * Seleziona casualmente un marcatore e un assistman dalla lista dei titolari.
     * Priorita: Attaccanti per i goal, Centrocampisti per gli assist.
     * @param {Array} titolari - Array dei giocatori titolari
     * @param {string} teamName - Nome della squadra
     * @param {string} teamId - ID della squadra
     * @returns {Object} { scorer, assister }
     */
    selectScorerAndAssister(titolari, teamName, teamId) {
        if (!titolari || titolari.length === 0) {
            return { scorer: null, assister: null };
        }

        const attaccanti = titolari.filter(p => p.role === 'A');
        const centrocampisti = titolari.filter(p => p.role === 'C');
        const difensori = titolari.filter(p => p.role === 'D');
        const portieri = titolari.filter(p => p.role === 'P');

        let scorer = null;
        let assister = null;

        // Selezione marcatore con probabilita pesate
        // 70% attaccante, 25% centrocampista, 4% difensore, 1% portiere
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
            // Fallback: prendi chiunque
            scorer = titolari[Math.floor(Math.random() * titolari.length)];
        }

        // Selezione assistman (diverso dal marcatore)
        // 60% centrocampista, 25% attaccante, 10% difensore, 5% nessun assist
        const assisterRoll = Math.random() * 100;
        const potentialAssisters = titolari.filter(p => p.id !== scorer?.id);

        if (assisterRoll < 5 || potentialAssisters.length === 0) {
            // 5% nessun assist (azione individuale)
            assister = null;
        } else {
            const assistCentrocampisti = potentialAssisters.filter(p => p.role === 'C');
            const assistAttaccanti = potentialAssisters.filter(p => p.role === 'A');
            const assistDifensori = potentialAssisters.filter(p => p.role === 'D');

            if (assisterRoll < 65 && assistCentrocampisti.length > 0) {
                assister = assistCentrocampisti[Math.floor(Math.random() * assistCentrocampisti.length)];
            } else if (assisterRoll < 90 && assistAttaccanti.length > 0) {
                assister = assistAttaccanti[Math.floor(Math.random() * assistAttaccanti.length)];
            } else if (assistDifensori.length > 0) {
                assister = assistDifensori[Math.floor(Math.random() * assistDifensori.length)];
            } else if (potentialAssisters.length > 0) {
                assister = potentialAssisters[Math.floor(Math.random() * potentialAssisters.length)];
            }
        }

        // Aggiungi info squadra
        if (scorer) {
            scorer = { ...scorer, teamName, teamId };
        }
        if (assister) {
            assister = { ...assister, teamName, teamId };
        }

        return { scorer, assister };
    },

    /**
     * Helper: Aggiunge un goal alle statistiche.
     */
    addGoalToStats(stats, scorer, assister) {
        if (!scorer) return;

        if (!stats[scorer.id]) {
            stats[scorer.id] = {
                playerId: scorer.id,
                playerName: scorer.name,
                teamId: scorer.teamId,
                teamName: scorer.teamName,
                role: scorer.role,
                goals: 0,
                assists: 0,
                cleanSheets: 0
            };
        }
        stats[scorer.id].goals++;

        if (assister && assister.id !== scorer.id) {
            if (!stats[assister.id]) {
                stats[assister.id] = {
                    playerId: assister.id,
                    playerName: assister.name,
                    teamId: assister.teamId,
                    teamName: assister.teamName,
                    role: assister.role,
                    goals: 0,
                    assists: 0,
                    cleanSheets: 0
                };
            }
            stats[assister.id].assists++;
        }
    },

    /**
     * Helper: Aggiunge un clean sheet alle statistiche.
     */
    addCleanSheetToStats(stats, goalkeeper, teamName, teamId) {
        if (!goalkeeper) return;

        if (!stats[goalkeeper.id]) {
            stats[goalkeeper.id] = {
                playerId: goalkeeper.id,
                playerName: goalkeeper.name,
                teamId: teamId,
                teamName: teamName,
                role: 'P',
                goals: 0,
                assists: 0,
                cleanSheets: 0
            };
        }
        stats[goalkeeper.id].cleanSheets++;
    },

    // ====================================================================
    // CLASSIFICHE
    // ====================================================================

    /**
     * Ottiene la classifica marcatori (capocannoniere).
     * @param {number} limit - Numero massimo di giocatori da restituire (default: 10)
     * @returns {Array} Classifica ordinata per goal
     */
    async getTopScorers(limit = 10) {
        const data = await this.loadSeasonStats();
        const stats = Object.values(data.stats || {});

        return stats
            .filter(s => s.goals > 0)
            .sort((a, b) => {
                if (b.goals !== a.goals) return b.goals - a.goals;
                // A parita di goal, meno partite giocate e meglio (non abbiamo questo dato, usiamo assists come tiebreaker)
                return b.assists - a.assists;
            })
            .slice(0, limit);
    },

    /**
     * Ottiene la classifica assistman.
     * @param {number} limit - Numero massimo di giocatori da restituire (default: 10)
     * @returns {Array} Classifica ordinata per assist
     */
    async getTopAssisters(limit = 10) {
        const data = await this.loadSeasonStats();
        const stats = Object.values(data.stats || {});

        return stats
            .filter(s => s.assists > 0)
            .sort((a, b) => {
                if (b.assists !== a.assists) return b.assists - a.assists;
                return b.goals - a.goals;
            })
            .slice(0, limit);
    },

    /**
     * Ottiene la classifica portieri imbattuti (clean sheets).
     * @param {number} limit - Numero massimo di portieri da restituire (default: 10)
     * @returns {Array} Classifica ordinata per clean sheets
     */
    async getTopCleanSheets(limit = 10) {
        const data = await this.loadSeasonStats();
        const stats = Object.values(data.stats || {});

        return stats
            .filter(s => s.role === 'P' && s.cleanSheets > 0)
            .sort((a, b) => b.cleanSheets - a.cleanSheets)
            .slice(0, limit);
    },

    /**
     * Ottiene tutte le statistiche di un singolo giocatore.
     * @param {string} playerId - ID del giocatore
     * @returns {Object|null} Statistiche del giocatore o null
     */
    async getPlayerStats(playerId) {
        const data = await this.loadSeasonStats();
        return data.stats?.[playerId] || null;
    },

    /**
     * Ottiene le statistiche di tutti i giocatori di una squadra.
     * @param {string} teamId - ID della squadra
     * @returns {Array} Array di statistiche dei giocatori della squadra
     */
    async getTeamStats(teamId) {
        const data = await this.loadSeasonStats();
        const stats = Object.values(data.stats || {});

        return stats.filter(s => s.teamId === teamId);
    },

    /**
     * Ottiene un riepilogo delle statistiche stagionali.
     * @returns {Object} Riepilogo con totali e top giocatori
     */
    async getSeasonSummary() {
        const data = await this.loadSeasonStats();
        const stats = Object.values(data.stats || {});

        const totalGoals = stats.reduce((sum, s) => sum + (s.goals || 0), 0);
        const totalAssists = stats.reduce((sum, s) => sum + (s.assists || 0), 0);
        const totalCleanSheets = stats.reduce((sum, s) => sum + (s.cleanSheets || 0), 0);

        const topScorer = stats.reduce((top, s) => (s.goals > (top?.goals || 0)) ? s : top, null);
        const topAssister = stats.reduce((top, s) => (s.assists > (top?.assists || 0)) ? s : top, null);
        const topCleanSheet = stats
            .filter(s => s.role === 'P')
            .reduce((top, s) => (s.cleanSheets > (top?.cleanSheets || 0)) ? s : top, null);

        return {
            seasonStartDate: data.seasonStartDate,
            lastUpdated: data.lastUpdated,
            totalGoals,
            totalAssists,
            totalCleanSheets,
            topScorer,
            topAssister,
            topCleanSheet,
            totalPlayersWithStats: stats.length
        };
    }
};

console.log("PlayerSeasonStats.js caricato - Gestione statistiche stagionali (goal, assist, clean sheets)");
