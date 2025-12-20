//
// ====================================================================
// MODULO MATCH-CREDITS.JS (Utility centralizzata per crediti partita)
// ====================================================================
//
// Gestisce l'assegnazione di Crediti Seri (CS) per gol e vittorie
// nelle competizioni: Campionato, Coppa, Supercoppa
//

window.MatchCredits = {

    // Costanti di default (possono essere sovrascritte da CoppaConstants)
    DEFAULTS: {
        GOAL_CS: 5,
        MATCH_WIN_CS: 25
    },

    /**
     * Applica crediti per gol e vittoria a entrambe le squadre
     * @param {string} homeTeamId - ID squadra casa
     * @param {string} awayTeamId - ID squadra ospite
     * @param {number} homeGoals - Gol squadra casa
     * @param {number} awayGoals - Gol squadra ospite
     * @param {string|null} winnerId - ID del vincitore (null per pareggio)
     * @param {Object} options - Opzioni aggiuntive
     * @param {string} options.competition - Nome competizione per log ('campionato', 'coppa', 'supercoppa')
     * @param {number} options.goalCs - CS per gol (default: 5)
     * @param {number} options.winCs - CS per vittoria (default: 25)
     * @returns {Promise<{homeCredits: number, awayCredits: number}>}
     */
    async applyMatchCredits(homeTeamId, awayTeamId, homeGoals, awayGoals, winnerId, options = {}) {
        const { appId, doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;

        // Usa costanti da CoppaConstants se disponibili, altrimenti defaults
        const goalCs = options.goalCs ?? window.CoppaConstants?.REWARDS?.GOAL_CS ?? this.DEFAULTS.GOAL_CS;
        const winCs = options.winCs ?? window.CoppaConstants?.REWARDS?.MATCH_WIN_CS ?? this.DEFAULTS.MATCH_WIN_CS;
        const competition = options.competition || 'match';

        // Calcola crediti base per gol
        let homeCredits = (homeGoals || 0) * goalCs;
        let awayCredits = (awayGoals || 0) * goalCs;

        // Bonus vittoria
        if (winnerId === homeTeamId) {
            homeCredits += winCs;
        } else if (winnerId === awayTeamId) {
            awayCredits += winCs;
        }
        // Nessun bonus per pareggio (winnerId === null)

        // Applica crediti a home team
        if (homeCredits > 0 && homeTeamId) {
            try {
                const homeRef = doc(db, `artifacts/${appId}/public/data/teams`, homeTeamId);
                const homeDoc = await getDoc(homeRef);
                if (homeDoc.exists()) {
                    await updateDoc(homeRef, {
                        budget: (homeDoc.data().budget || 0) + homeCredits
                    });
                }
            } catch (error) {
                console.error(`[MatchCredits] Errore applicazione crediti home team:`, error);
            }
        }

        // Applica crediti a away team
        if (awayCredits > 0 && awayTeamId) {
            try {
                const awayRef = doc(db, `artifacts/${appId}/public/data/teams`, awayTeamId);
                const awayDoc = await getDoc(awayRef);
                if (awayDoc.exists()) {
                    await updateDoc(awayRef, {
                        budget: (awayDoc.data().budget || 0) + awayCredits
                    });
                }
            } catch (error) {
                console.error(`[MatchCredits] Errore applicazione crediti away team:`, error);
            }
        }

        console.log(`[MatchCredits] ${competition.toUpperCase()} - Crediti assegnati - Casa: ${homeCredits} CS, Ospite: ${awayCredits} CS`);

        return { homeCredits, awayCredits };
    },

    /**
     * Estrae i gol da una stringa risultato (es. "2-1 (d.t.s.)")
     * @param {string} resultString - Stringa del risultato
     * @returns {{homeGoals: number, awayGoals: number}}
     */
    parseResultString(resultString) {
        let homeGoals = 0;
        let awayGoals = 0;

        if (resultString) {
            const parts = resultString.split(' ')[0].split('-');
            homeGoals = parseInt(parts[0]) || 0;
            awayGoals = parseInt(parts[1]) || 0;
        }

        return { homeGoals, awayGoals };
    }
};

console.log("✅ Modulo match-credits.js caricato.");
