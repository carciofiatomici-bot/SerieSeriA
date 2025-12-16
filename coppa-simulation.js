//
// ====================================================================
// COPPA-SIMULATION.JS - Simulazione Partite Coppa e Rigori
// ====================================================================
//

window.CoppaSimulation = {

    /**
     * Simula una partita di coppa (riutilizza il motore del campionato)
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @returns {Object} Risultato {homeGoals, awayGoals}
     */
    runMatch(homeTeamData, awayTeamData) {
        // Riutilizza il motore di simulazione del campionato
        return window.ChampionshipSimulation.runSimulation(homeTeamData, awayTeamData);
    },

    /**
     * Simula una partita di coppa con log e matchEvents
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @returns {Object} Risultato {homeGoals, awayGoals, log, simpleLog, matchEvents}
     */
    runMatchWithLog(homeTeamData, awayTeamData) {
        // Riutilizza il motore di simulazione del campionato con log
        return window.ChampionshipSimulation.runSimulationWithLog(homeTeamData, awayTeamData);
    },

    /**
     * Simula i rigori tra due squadre
     * Usa il livello del portiere vs livello degli attaccanti
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @returns {Object} {homeGoals, awayGoals, shootout: [{shooter, keeper, scored}]}
     */
    simulatePenaltyShootout(homeTeamData, awayTeamData) {
        const homeTeam = window.ChampionshipSimulation.prepareTeamForSimulation(homeTeamData);
        const awayTeam = window.ChampionshipSimulation.prepareTeamForSimulation(awayTeamData);

        // Portieri
        const homeKeeper = homeTeam.P[0] || { currentLevel: 1, name: 'Portiere Casa' };
        const awayKeeper = awayTeam.P[0] || { currentLevel: 1, name: 'Portiere Ospite' };

        // Attaccanti (tutti i giocatori di movimento ordinati per livello)
        const getShooters = (team) => {
            const allPlayers = [...(team.D || []), ...(team.C || []), ...(team.A || [])];
            return allPlayers.sort((a, b) => (b.currentLevel || 1) - (a.currentLevel || 1));
        };

        const homeShooters = getShooters(homeTeam);
        const awayShooters = getShooters(awayTeam);

        let homeGoals = 0;
        let awayGoals = 0;
        const shootoutLog = [];

        // Serie iniziale di 5 rigori
        for (let i = 0; i < 5; i++) {
            // Rigore casa
            const homeShooter = homeShooters[i % homeShooters.length] || { currentLevel: 1, name: 'Tiratore' };
            const homeScored = this.simulateSinglePenalty(homeShooter, awayKeeper);
            if (homeScored) homeGoals++;
            shootoutLog.push({
                team: 'home',
                shooter: homeShooter.name,
                keeper: awayKeeper.name,
                scored: homeScored
            });

            // Rigore ospite
            const awayShooter = awayShooters[i % awayShooters.length] || { currentLevel: 1, name: 'Tiratore' };
            const awayScored = this.simulateSinglePenalty(awayShooter, homeKeeper);
            if (awayScored) awayGoals++;
            shootoutLog.push({
                team: 'away',
                shooter: awayShooter.name,
                keeper: homeKeeper.name,
                scored: awayScored
            });

            // Verifica se c'e gia un vincitore (impossibile recuperare)
            const remainingKicks = 5 - i - 1;
            if (Math.abs(homeGoals - awayGoals) > remainingKicks * 2) {
                break;
            }
        }

        // Sudden death se ancora pari
        let suddenDeathRound = 0;
        while (homeGoals === awayGoals && suddenDeathRound < 20) {
            const shooterIndex = 5 + suddenDeathRound;

            // Rigore casa
            const homeShooter = homeShooters[shooterIndex % homeShooters.length] || { currentLevel: 1, name: 'Tiratore' };
            const homeScored = this.simulateSinglePenalty(homeShooter, awayKeeper);
            if (homeScored) homeGoals++;
            shootoutLog.push({
                team: 'home',
                shooter: homeShooter.name,
                keeper: awayKeeper.name,
                scored: homeScored,
                suddenDeath: true
            });

            // Rigore ospite
            const awayShooter = awayShooters[shooterIndex % awayShooters.length] || { currentLevel: 1, name: 'Tiratore' };
            const awayScored = this.simulateSinglePenalty(awayShooter, homeKeeper);
            if (awayScored) awayGoals++;
            shootoutLog.push({
                team: 'away',
                shooter: awayShooter.name,
                keeper: homeKeeper.name,
                scored: awayScored,
                suddenDeath: true
            });

            // In sudden death, se uno segna e l'altro no, finisce
            if (homeScored !== awayScored) {
                break;
            }

            suddenDeathRound++;
        }

        return {
            homeGoals,
            awayGoals,
            winner: homeGoals > awayGoals ? 'home' : 'away',
            shootout: shootoutLog
        };
    },

    /**
     * Simula un singolo rigore
     * Probabilita di segnare basata su livello tiratore vs livello portiere
     * @param {Object} shooter - Giocatore che tira
     * @param {Object} keeper - Portiere
     * @returns {boolean} True se gol
     */
    simulateSinglePenalty(shooter, keeper) {
        const shooterLevel = shooter.currentLevel || shooter.level || 1;
        const keeperLevel = keeper.currentLevel || keeper.level || 1;

        // Formula: probabilita base 70%, modificata dalla differenza di livello
        // Ogni livello di differenza modifica del 3%
        const levelDiff = shooterLevel - keeperLevel;
        const baseProb = 0.70;
        const modifier = levelDiff * 0.03;

        // Probabilita finale tra 40% e 95%
        const finalProb = Math.max(0.40, Math.min(0.95, baseProb + modifier));

        return Math.random() < finalProb;
    },

    /**
     * Simula una partita di coppa completa (gestisce anche i rigori se necessario)
     * @param {Object} match - Oggetto match dal tabellone
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @param {boolean} isSingleMatch - Se e partita secca
     * @param {string} legType - 'leg1' o 'leg2' (per andata/ritorno)
     * @param {boolean} withLog - Se true, include log e matchEvents
     * @returns {Object} Risultato completo
     */
    async simulateCupMatch(match, homeTeamData, awayTeamData, isSingleMatch, legType = 'leg1', withLog = false) {
        const result = withLog
            ? this.runMatchWithLog(homeTeamData, awayTeamData)
            : this.runMatch(homeTeamData, awayTeamData);

        const matchResult = {
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            resultString: `${result.homeGoals}-${result.awayGoals}`,
            penalties: null,
            winner: null,
            log: result.log || null,
            simpleLog: result.simpleLog || null,
            matchEvents: result.matchEvents || null
        };

        // SICUREZZA: Per turni andata/ritorno, leg1 non deve MAI determinare un vincitore
        if (!isSingleMatch && legType === 'leg1') {
            console.log('[CoppaSimulation] Leg1 di turno andata/ritorno - nessun vincitore determinato');
            return matchResult; // Ritorna senza vincitore
        }

        if (isSingleMatch) {
            // Partita secca - se pareggio, rigori
            if (result.homeGoals === result.awayGoals) {
                const penaltyResult = this.simulatePenaltyShootout(homeTeamData, awayTeamData);
                matchResult.penalties = penaltyResult;
                matchResult.winner = penaltyResult.winner === 'home' ? match.homeTeam : match.awayTeam;
                matchResult.resultString = `${result.homeGoals}-${result.awayGoals} (d.c.r. ${penaltyResult.homeGoals}-${penaltyResult.awayGoals})`;
            } else {
                matchResult.winner = result.homeGoals > result.awayGoals ? match.homeTeam : match.awayTeam;
            }
        } else {
            // Andata/Ritorno - il vincitore viene determinato dopo la seconda gamba
            if (legType === 'leg2') {
                // Calcola aggregato
                const leg1 = match.leg1Result ? match.leg1Result.split('-').map(Number) : [0, 0];
                const totalHome = leg1[0] + result.awayGoals; // Home ha giocato in casa all'andata
                const totalAway = leg1[1] + result.homeGoals; // Away gioca in casa al ritorno

                if (totalHome === totalAway) {
                    // Pareggio aggregato - gol in trasferta
                    const awayGoalsHome = leg1[1]; // Gol di away all'andata (trasferta)
                    const awayGoalsAway = result.awayGoals; // Gol di home al ritorno (trasferta)

                    if (awayGoalsHome === awayGoalsAway) {
                        // Ancora pari - rigori
                        const penaltyResult = this.simulatePenaltyShootout(awayTeamData, homeTeamData);
                        matchResult.penalties = penaltyResult;
                        matchResult.winner = penaltyResult.winner === 'home' ? match.awayTeam : match.homeTeam;
                        matchResult.resultString += ` (d.c.r. ${penaltyResult.homeGoals}-${penaltyResult.awayGoals})`;
                    } else {
                        matchResult.winner = awayGoalsHome > awayGoalsAway ? match.awayTeam : match.homeTeam;
                    }
                } else {
                    matchResult.winner = totalHome > totalAway ? match.homeTeam : match.awayTeam;
                }

                matchResult.aggregateHome = totalHome;
                matchResult.aggregateAway = totalAway;
            }
        }

        return matchResult;
    },

    /**
     * Genera il log replay per una partita di rigori
     * @param {Object} penaltyResult - Risultato rigori
     * @returns {Array} Log per replay
     */
    generatePenaltyReplayLog(penaltyResult) {
        const log = [];

        log.push({
            type: 'phase',
            message: 'CALCI DI RIGORE',
            icon: '⚽'
        });

        penaltyResult.shootout.forEach((kick, index) => {
            const teamName = kick.team === 'home' ? 'Casa' : 'Ospite';
            const resultIcon = kick.scored ? '⚽ GOL!' : '❌ PARATO!';
            const suddenDeathText = kick.suddenDeath ? ' [Sudden Death]' : '';

            log.push({
                type: kick.scored ? 'goal' : 'save',
                team: kick.team,
                message: `${teamName}: ${kick.shooter} vs ${kick.keeper} - ${resultIcon}${suddenDeathText}`
            });
        });

        log.push({
            type: 'result',
            message: `Rigori: ${penaltyResult.homeGoals}-${penaltyResult.awayGoals}`,
            winner: penaltyResult.winner
        });

        return log;
    }
};

console.log("Modulo Coppa-Simulation caricato.");
