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
     * Simula una partita di coppa con highlights (Azioni Salienti)
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @returns {Object} Risultato {homeGoals, awayGoals, highlights, highlightsText, scorers, assists}
     */
    runMatchWithHighlights(homeTeamData, awayTeamData) {
        // Riutilizza il motore di simulazione del campionato con highlights
        return window.ChampionshipSimulation.runSimulationWithHighlights(homeTeamData, awayTeamData);
    },

    /**
     * Simula i rigori tra due squadre
     * Sistema: 1d20 + modificatore tiratore vs 1d20 + modificatore portiere
     * Include bonus abilita fase 3 (tiro) e abilita portiere
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @returns {Object} {homeGoals, awayGoals, shootout: [{shooter, keeper, scored, details}]}
     */
    simulatePenaltyShootout(homeTeamData, awayTeamData) {
        const homeTeam = window.ChampionshipSimulation.prepareTeamForSimulation(homeTeamData);
        const awayTeam = window.ChampionshipSimulation.prepareTeamForSimulation(awayTeamData);

        // Portieri
        const homeKeeper = homeTeam.P[0] || { currentLevel: 1, name: 'Portiere Casa', abilities: [] };
        const awayKeeper = awayTeam.P[0] || { currentLevel: 1, name: 'Portiere Ospite', abilities: [] };

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
            const homeShooter = homeShooters[i % homeShooters.length] || { currentLevel: 1, name: 'Tiratore', role: 'C', abilities: [] };
            const homeResult = this.simulateSinglePenalty(homeShooter, awayKeeper, homeTeam);
            if (homeResult.scored) homeGoals++;
            shootoutLog.push({
                team: 'home',
                shooter: homeShooter.name,
                keeper: awayKeeper.name,
                scored: homeResult.scored,
                details: `${homeShooter.name}: 1d20(${homeResult.shooterRoll})+${homeResult.shooterMod}=${homeResult.shooterTotal} vs ${awayKeeper.name}: 1d20(${homeResult.keeperRoll})+${homeResult.keeperMod}=${homeResult.keeperTotal}`
            });

            // Rigore ospite
            const awayShooter = awayShooters[i % awayShooters.length] || { currentLevel: 1, name: 'Tiratore', role: 'C', abilities: [] };
            const awayResult = this.simulateSinglePenalty(awayShooter, homeKeeper, awayTeam);
            if (awayResult.scored) awayGoals++;
            shootoutLog.push({
                team: 'away',
                shooter: awayShooter.name,
                keeper: homeKeeper.name,
                scored: awayResult.scored,
                details: `${awayShooter.name}: 1d20(${awayResult.shooterRoll})+${awayResult.shooterMod}=${awayResult.shooterTotal} vs ${homeKeeper.name}: 1d20(${awayResult.keeperRoll})+${awayResult.keeperMod}=${awayResult.keeperTotal}`
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
            const homeShooter = homeShooters[shooterIndex % homeShooters.length] || { currentLevel: 1, name: 'Tiratore', role: 'C', abilities: [] };
            const homeResult = this.simulateSinglePenalty(homeShooter, awayKeeper, homeTeam);
            if (homeResult.scored) homeGoals++;
            shootoutLog.push({
                team: 'home',
                shooter: homeShooter.name,
                keeper: awayKeeper.name,
                scored: homeResult.scored,
                suddenDeath: true,
                details: `${homeShooter.name}: 1d20(${homeResult.shooterRoll})+${homeResult.shooterMod}=${homeResult.shooterTotal} vs ${awayKeeper.name}: 1d20(${homeResult.keeperRoll})+${homeResult.keeperMod}=${homeResult.keeperTotal}`
            });

            // Rigore ospite
            const awayShooter = awayShooters[shooterIndex % awayShooters.length] || { currentLevel: 1, name: 'Tiratore', role: 'C', abilities: [] };
            const awayResult = this.simulateSinglePenalty(awayShooter, homeKeeper, awayTeam);
            if (awayResult.scored) awayGoals++;
            shootoutLog.push({
                team: 'away',
                shooter: awayShooter.name,
                keeper: homeKeeper.name,
                scored: awayResult.scored,
                suddenDeath: true,
                details: `${awayShooter.name}: 1d20(${awayResult.shooterRoll})+${awayResult.shooterMod}=${awayResult.shooterTotal} vs ${homeKeeper.name}: 1d20(${awayResult.keeperRoll})+${awayResult.keeperMod}=${awayResult.keeperTotal}`
            });

            // In sudden death, se uno segna e l'altro no, finisce
            if (homeResult.scored !== awayResult.scored) {
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
     * Simula un singolo rigore con sistema 1d20 + modificatore
     * Include bonus abilita fase 3 (tiro) per il tiratore
     * @param {Object} shooter - Giocatore che tira
     * @param {Object} keeper - Portiere
     * @param {Object} shooterTeam - Squadra del tiratore (per bonus formazione)
     * @returns {Object} {scored: boolean, shooterRoll, keeperRoll, shooterTotal, keeperTotal}
     */
    simulateSinglePenalty(shooter, keeper, shooterTeam = null) {
        // Funzione per tirare 1d20
        const roll1d20 = () => Math.floor(Math.random() * 20) + 1;

        // Calcola modificatore tiratore basato su livello
        const shooterLevel = shooter.currentLevel || shooter.level || 1;
        const shooterMod = window.GameConstants?.getLevelModifier?.(shooterLevel) || (shooterLevel - 1) * 0.5;

        // Calcola modificatore portiere basato su livello
        const keeperLevel = keeper.currentLevel || keeper.level || 1;
        const keeperMod = window.GameConstants?.getLevelModifier?.(keeperLevel) || (keeperLevel - 1) * 0.5;

        // Bonus abilita fase 3 (tiro) per il tiratore
        let shooterAbilityBonus = 0;
        if (shooter.abilities && window.getAbilityBonus) {
            const bonuses = window.getAbilityBonus(shooter);
            shooterAbilityBonus = bonuses.fase3 || 0;
        }

        // Abilita specifiche per rigori:
        // - Specialista Tiro: +1 in fase 3
        if (shooter.abilities?.includes('Specialista Tiro')) {
            shooterAbilityBonus += 1;
        }
        // - Bomber: +1 al tiro (attaccanti)
        if (shooter.abilities?.includes('Bomber') && shooter.role === 'A') {
            shooterAbilityBonus += 1;
        }
        // - Tiro Dritto: +2 se unico attaccante (semplificato per rigori)
        if (shooter.abilities?.includes('Tiro Dritto') && shooter.role === 'A') {
            shooterAbilityBonus += 2;
        }

        // Bonus abilita portiere
        let keeperAbilityBonus = 0;
        if (keeper.abilities && window.getAbilityBonus) {
            const bonuses = window.getAbilityBonus(keeper);
            keeperAbilityBonus = bonuses.portiere || 0;
        }

        // Abilita specifiche portiere per rigori:
        // - Paratutto: +1.5 generico
        if (keeper.abilities?.includes('Paratutto')) {
            keeperAbilityBonus += 1.5;
        }
        // - Riflessi Felini: +1
        if (keeper.abilities?.includes('Riflessi Felini')) {
            keeperAbilityBonus += 1;
        }
        // - Muro: +1
        if (keeper.abilities?.includes('Muro')) {
            keeperAbilityBonus += 1;
        }

        // Tira i dadi
        const shooterRoll = roll1d20();
        const keeperRoll = roll1d20();

        // Calcola totali
        const shooterTotal = shooterRoll + shooterMod + shooterAbilityBonus;
        const keeperTotal = keeperRoll + keeperMod + keeperAbilityBonus;

        // Il tiratore segna se il suo totale e maggiore o uguale
        const scored = shooterTotal >= keeperTotal;

        return {
            scored,
            shooterRoll,
            keeperRoll,
            shooterTotal: Math.round(shooterTotal * 10) / 10,
            keeperTotal: Math.round(keeperTotal * 10) / 10,
            shooterMod: Math.round((shooterMod + shooterAbilityBonus) * 10) / 10,
            keeperMod: Math.round((keeperMod + keeperAbilityBonus) * 10) / 10
        };
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
        // Usa sempre highlights per avere le Azioni Salienti
        const result = this.runMatchWithHighlights(homeTeamData, awayTeamData);

        const matchResult = {
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            resultString: `${result.homeGoals}-${result.awayGoals}`,
            penalties: null,
            winner: null,
            highlights: result.highlightsText || null,
            matchLog: result.highlights || [],
            scorers: result.scorers || [],
            assists: result.assists || [],
            matchEvents: result.matchEvents || null
        };

        // SICUREZZA: Per turni andata/ritorno, leg1 non deve MAI determinare un vincitore
        // Controllo doppio: sia isSingleMatch che verifica esplicita del nome round
        const isTwoLegByName = window.CoppaConstants?.TWO_LEG_ROUNDS?.some(r =>
            match.roundName?.includes(r) || r.includes(match.roundName || '')
        ) || false;

        // Se e' leg1 E (isSingleMatch e' false OPPURE il round e' esplicitamente andata/ritorno)
        if (legType === 'leg1' && (!isSingleMatch || isTwoLegByName)) {
            console.log(`[CoppaSimulation] Leg1 (${match.roundName || 'unknown'}) - nessun vincitore determinato. isSingleMatch=${isSingleMatch}, isTwoLegByName=${isTwoLegByName}`);
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
            const detailsText = kick.details ? ` (${kick.details})` : '';

            log.push({
                type: kick.scored ? 'goal' : 'save',
                team: kick.team,
                message: `${teamName}: ${kick.shooter} vs ${kick.keeper} - ${resultIcon}${suddenDeathText}`,
                details: kick.details || null
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
