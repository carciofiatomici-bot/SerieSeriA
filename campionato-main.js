//
// ====================================================================
// MODULO CAMPIONATO-MAIN.JS (Orchestrazione Principale)
// ====================================================================
//

window.ChampionshipMain = {

    /**
     * Resetta i modificatori di forma dei giocatori su Firestore dopo la simulazione.
     * @param {string} teamId - ID della squadra da aggiornare.
     */
    async resetPlayersFormStatus(teamId) {
        const { doc, updateDoc, deleteField } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        
        try {
             const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
             await updateDoc(teamDocRef, {
                // Cancella il campo playersFormStatus
                playersFormStatus: deleteField()
             });
             console.log(`Forma resettata per squadra ${teamId}.`);
        } catch(error) {
             console.error(`Errore nel reset della forma per squadra ${teamId}:`, error);
        }
    },


    /**
     * Simula una singola partita del calendario e aggiorna Firestore/UI.
     * INCLUDE: Sistema crediti per gol e vittoria
     */
    async simulateSingleMatch(roundIndex, matchIndex, schedule, allTeams, button, renderCallback) {
        // FIX: Rendi la disabilitazione del pulsante condizionale
        if (button) {
            button.disabled = true;
            button.textContent = 'Simulazione...';
        }
        
        const { doc, getDoc, setDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        
        const SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
        const LEADERBOARD_COLLECTION_PATH = `artifacts/${appId}/public/data/leaderboard`;
        const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        const SCHEDULE_DOC_ID = 'full_schedule';
        const LEADERBOARD_DOC_ID = 'standings';
        
        let match = schedule[roundIndex].matches[matchIndex];

        try {
            // 1. Carica classifica
            const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);
            const leaderboardDoc = await getDoc(leaderboardDocRef);
            let standings = leaderboardDoc.exists() ? leaderboardDoc.data().standings : [];
            const standingsMap = new Map(standings.map(s => [s.teamId, s]));

            // 2. Carica dati squadre (FETCH FRESCO per includere playersFormStatus)
            const homeTeamDoc = await getDoc(doc(db, TEAMS_COLLECTION_PATH, match.homeId));
            const awayTeamDoc = await getDoc(doc(db, TEAMS_COLLECTION_PATH, match.awayId));
            
            // UTILIZZA I DATI FRESCHI DEL DOC
            const homeTeamData = homeTeamDoc.exists() ? homeTeamDoc.data() : null;
            const awayTeamData = awayTeamDoc.exists() ? awayTeamDoc.data() : null;
            
            if (!homeTeamData || !awayTeamData) {
                throw new Error(`Dati squadra mancanti per ${match.homeName} o ${match.awayName}.`);
            }
            
            // 3. Simula partita
            const { homeGoals, awayGoals } = window.ChampionshipSimulation.runSimulation(homeTeamData, awayTeamData);
                
                // REPLAY: Mostra replay della partita
                if (window.MatchReplaySimple) {
                    await window.MatchReplaySimple.playFromResult(
                        { name: homeTeamData.teamName, id: match.homeId },
                        { name: awayTeamData.teamName, id: match.awayId },
                        homeGoals,
                        awayGoals
                    );
                }
            const resultString = `${homeGoals}-${awayGoals}`;
            match.result = resultString;
            
            // 4. Aggiorna statistiche classifica
            const initializeTeamStats = (teamId, teamName) => ({
                teamId, teamName, points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0
            });
            
            const homeTeamName = allTeams.find(t => t.id === match.homeId)?.name || match.homeId;
            const awayTeamName = allTeams.find(t => t.id === match.awayId)?.name || match.awayId;
            
            let homeStats = standingsMap.get(match.homeId) || initializeTeamStats(match.homeId, homeTeamName);
            let awayStats = standingsMap.get(match.awayId) || initializeTeamStats(match.awayId, awayTeamName);
            
            const updatedStats = window.ChampionshipSimulation.updateStandingsStats(homeStats, awayStats, homeGoals, awayGoals);
            homeStats = updatedStats.homeStats;
            awayStats = updatedStats.awayStats;
            
            standingsMap.set(match.homeId, homeStats);
            standingsMap.set(match.awayId, awayStats);
            
            // 5. Applica i crediti per gol e vittoria
            await window.ChampionshipRewards.applyMatchRewards(
                homeGoals, awayGoals, 
                homeTeamData, awayTeamData, 
                match.homeId, match.awayId
            );
            
            // 6. Resetta lo stato della forma dopo la simulazione per la prossima giornata
            await this.resetPlayersFormStatus(match.homeId);
            await this.resetPlayersFormStatus(match.awayId);
            
            const updatedStandings = Array.from(standingsMap.values()).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const diffA = a.goalsFor - a.goalsAgainst;
                const diffB = b.goalsFor - b.goalsAgainst;
                if (diffB !== diffA) return diffB - diffA;
                return b.goalsFor - a.goalsFor;
            });
            
            // 7. Salva su Firestore
            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            await setDoc(scheduleDocRef, { matches: schedule }, { merge: true });
            await setDoc(leaderboardDocRef, { standings: updatedStandings, lastUpdated: new Date().toISOString() });

            // 8. Ricarica UI
            if (renderCallback) {
                const reloadedScheduleDoc = await getDoc(scheduleDocRef);
                const reloadedSchedule = reloadedScheduleDoc.exists() ? reloadedScheduleDoc.data().matches : [];
                renderCallback(reloadedSchedule, allTeams);
            }

        } catch (error) {
            console.error("Errore durante la simulazione singola:", error);
            // FIX: Riabilita il pulsante solo se esiste
            if (button) {
                button.disabled = false;
                button.textContent = 'Riprova Simula';
            }
            throw error;
        }
    },

    /**
     * Simula un'intera giornata.
     * INCLUDE: Sistema crediti per gol e vittoria
     */
    async simulateCurrentRound(roundIndex, schedule, allTeams, button, renderCallback) {
        // FIX: Rendi la disabilitazione del pulsante condizionale
        if (button) {
            button.disabled = true;
            button.textContent = 'Simulazione Giornata in corso...';
        }
        
        const { doc, getDoc, setDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        
        const SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
        const LEADERBOARD_COLLECTION_PATH = `artifacts/${appId}/public/data/leaderboard`;
        const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        const SCHEDULE_DOC_ID = 'full_schedule';
        const LEADERBOARD_DOC_ID = 'standings';
        
        let round = schedule[roundIndex];
        let matchesToSimulate = round.matches.filter(match => match.result === null);
        
        // Raccoglie tutti gli ID delle squadre coinvolte nella giornata per il reset finale
        const teamsInRound = new Set();

        if (matchesToSimulate.length === 0) {
            if (renderCallback) {
                const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
                const reloadedScheduleDoc = await getDoc(scheduleDocRef);
                const reloadedSchedule = reloadedScheduleDoc.exists() ? reloadedScheduleDoc.data().matches : [];
                renderCallback(reloadedSchedule, allTeams);
            }
            // FIX: Riabilita il pulsante solo se esiste
            if (button) {
                button.disabled = false;
                button.textContent = `Simula Tutta la Giornata ${round.round}`;
            }
            return;
        }

        try {
            const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);
            const leaderboardDoc = await getDoc(leaderboardDocRef);
            let standings = leaderboardDoc.exists() ? leaderboardDoc.data().standings : [];
            const standingsMap = new Map(standings.map(s => [s.teamId, s]));

            for (const match of matchesToSimulate) {
                teamsInRound.add(match.homeId);
                teamsInRound.add(match.awayId);

                // FETCH FRESCO per includere playersFormStatus
                const [homeTeamDoc, awayTeamDoc] = await Promise.all([
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, match.homeId)),
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, match.awayId))
                ]);
                
                const homeTeamData = homeTeamDoc.exists() ? homeTeamDoc.data() : null;
                const awayTeamData = awayTeamDoc.exists() ? awayTeamDoc.data() : null;
                
                if (!homeTeamData || !awayTeamData) {
                    console.warn(`Dati squadra mancanti per il match ${match.homeName} vs ${match.awayName}. Salto.`);
                    continue;
                }

                const { homeGoals, awayGoals } = window.ChampionshipSimulation.runSimulation(homeTeamData, awayTeamData);
                
                // REPLAY: Mostra replay della partita
                if (window.MatchReplaySimple) {
                    await window.MatchReplaySimple.playFromResult(
                        { name: homeTeamData.teamName, id: match.homeId },
                        { name: awayTeamData.teamName, id: match.awayId },
                        homeGoals,
                        awayGoals
                    );
                }
                const resultString = `${homeGoals}-${awayGoals}`;
                
                const matchIndexInRound = round.matches.findIndex(m => m.homeId === match.homeId && m.awayId === match.awayId && m.result === null);
                if (matchIndexInRound !== -1) {
                    round.matches[matchIndexInRound].result = resultString;
                }
                
                const initializeTeamStats = (teamId, teamName) => ({
                    teamId, teamName, points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0
                });
                
                const homeTeamName = allTeams.find(t => t.id === match.homeId)?.name || match.homeId;
                const awayTeamName = allTeams.find(t => t.id === match.awayId)?.name || match.awayId;

                let homeStats = standingsMap.get(match.homeId) || initializeTeamStats(match.homeId, homeTeamName);
                let awayStats = standingsMap.get(match.awayId) || initializeTeamStats(match.awayId, awayTeamName);
                
                const updatedStats = window.ChampionshipSimulation.updateStandingsStats(homeStats, awayStats, homeGoals, awayGoals);
                homeStats = updatedStats.homeStats;
                awayStats = updatedStats.awayStats;

                standingsMap.set(match.homeId, homeStats);
                standingsMap.set(match.awayId, awayStats);
                
                // NUOVO: Applica i crediti
                await window.ChampionshipRewards.applyMatchRewards(
                    homeGoals, awayGoals, 
                    homeTeamData, awayTeamData, 
                    match.homeId, match.awayId
                );
            }
            
            // 6. Resetta lo stato della forma dopo la simulazione per TUTTE le squadre coinvolte
            const resetPromises = Array.from(teamsInRound).map(teamId => this.resetPlayersFormStatus(teamId));
            await Promise.all(resetPromises);
            
            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            await setDoc(scheduleDocRef, { matches: schedule }, { merge: true });

            const updatedStandings = Array.from(standingsMap.values()).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const diffA = a.goalsFor - a.goalsAgainst;
                const diffB = b.goalsFor - b.goalsAgainst;
                if (diffB !== diffA) return diffB - diffA;
                return b.goalsFor - a.goalsFor;
            });
            
            await setDoc(leaderboardDocRef, { standings: updatedStandings, lastUpdated: new Date().toISOString() });

            if (renderCallback) {
                const reloadedScheduleDoc = await getDoc(scheduleDocRef);
                const reloadedSchedule = reloadedScheduleDoc.exists() ? reloadedScheduleDoc.data().matches : [];
                renderCallback(reloadedSchedule, allTeams);
            }

        } catch (error) {
            console.error("Errore durante la simulazione completa della giornata:", error);
            // FIX: Riabilita il pulsante solo se esiste
            if (button) {
                button.disabled = false;
                button.textContent = `Simula Tutta la Giornata ${round.round}`;
            }
            throw error;
        }
    }
};