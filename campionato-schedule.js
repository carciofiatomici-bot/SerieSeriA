//
// ====================================================================
// MODULO CAMPIONATO-SCHEDULE.JS (Generazione Calendario)
// ====================================================================
//

window.ChampionshipSchedule = {

    /**
     * Algoritmo Round-Robin per generare calendario andata/ritorno.
     * @param {Array} teams - Array di squadre partecipanti
     * @returns {Array} Calendario completo con andata e ritorno
     */
    generateRoundRobinSchedule(teams) {
        if (!teams || teams.length < 2) {
            throw new Error("Necessarie almeno 2 squadre per generare il calendario.");
        }
        
        let numTeams = teams.length;
        let teamsList = teams.map(t => t.id);
        let schedule = [];
        
        // Se numero dispari, aggiungi BYE
        const isOdd = numTeams % 2 !== 0;
        if (isOdd) {
            teamsList.push("BYE");
            numTeams++;
        }

        const totalRounds = numTeams - 1;
        
        // Genera andata
        for (let round = 0; round < totalRounds; round++) {
            const roundMatches = [];
            for (let i = 0; i < numTeams / 2; i++) {
                const homeTeamId = teamsList[i];
                const awayTeamId = teamsList[numTeams - 1 - i];
                
                const homeTeamName = teams.find(t => t.id === homeTeamId)?.name || 'BYE';
                const awayTeamName = teams.find(t => t.id === awayTeamId)?.name || 'BYE';

                if (homeTeamId !== "BYE" && awayTeamId !== "BYE") {
                    roundMatches.push({
                        homeId: homeTeamId,
                        awayId: awayTeamId,
                        homeName: homeTeamName,
                        awayName: awayTeamName,
                        round: round + 1,
                        type: 'Andata',
                        result: null 
                    });
                }
            }
            schedule.push({ round: round + 1, matches: roundMatches });

            // Rotazione Round-Robin
            const fixedTeam = teamsList.shift(); 
            const lastTeam = teamsList.pop();   
            teamsList.unshift(lastTeam);       
            teamsList.unshift(fixedTeam);      
        }

        // Genera ritorno (inverti casa/trasferta)
        const returnSchedule = schedule.map(roundData => ({
            round: roundData.round + totalRounds,
            matches: roundData.matches.map(match => ({
                homeId: match.awayId, 
                awayId: match.homeId,
                homeName: match.awayName,
                awayName: match.homeName,
                round: match.round + totalRounds,
                type: 'Ritorno',
                result: null
            }))
        }));
        
        return [...schedule, ...returnSchedule];
    },

    /**
     * Inizializza la classifica a zero per le squadre partecipanti.
     * @param {Array} teams - Squadre partecipanti
     * @returns {Array} Classifica iniziale
     */
    initializeLeaderboard(teams) {
        return teams.map(team => ({
            teamId: team.id,
            teamName: team.name,
            points: 0,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
        }));
    },

    /**
     * Salva il calendario e inizializza la classifica su Firestore.
     * @param {Array} teams - Squadre partecipanti
     * @param {Array} schedule - Calendario generato
     */
    async saveScheduleAndInitialize(teams, schedule) {
        const { doc, setDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        
        const SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
        const LEADERBOARD_COLLECTION_PATH = `artifacts/${appId}/public/data/leaderboard`;
        const CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;
        
        const SCHEDULE_DOC_ID = 'full_schedule';
        const LEADERBOARD_DOC_ID = 'standings';
        const CONFIG_DOC_ID = 'settings';

        const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
        const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        // Salva calendario
        await setDoc(scheduleDocRef, { 
            matches: schedule,
            generationDate: new Date().toISOString(),
            totalRounds: schedule.length,
            numTeams: teams.length
        });
        
        // Inizializza classifica a zero
        const initialStandings = this.initializeLeaderboard(teams);
        await setDoc(leaderboardDocRef, {
            standings: initialStandings,
            lastUpdated: new Date().toISOString()
        });

        // Invalida cache LeaderboardListener dopo inizializzazione
        if (window.LeaderboardListener) {
            window.LeaderboardListener.invalidateCache();
        }

        // Resetta le statistiche stagionali (goal, assist, clean sheets)
        if (window.PlayerSeasonStats) {
            await window.PlayerSeasonStats.resetSeasonStats(teams);
            console.log('ChampionshipSchedule: Statistiche stagionali resettate per nuova stagione.');
        }

        // Imposta stagione IN CORSO
        await setDoc(configDocRef, { isSeasonOver: false }, { merge: true });

        return {
            totalRounds: schedule.length,
            numTeams: teams.length
        };
    }
};