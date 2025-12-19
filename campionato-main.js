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
     * Aggiunge XP alla formazione usata in una partita
     * Include bonus dalla variante figurina icona selezionata
     * @param {string} teamId - ID della squadra
     * @param {string} modulo - Modulo usato (es. '1-1-2-1')
     */
    async addFormationXp(teamId, modulo) {
        if (!teamId || !modulo) return;

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        const BASE_XP_PER_MATCH = window.GestioneSquadreConstants?.FORMATION_MODIFIERS?.XP_PER_MATCH || 25;

        try {
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) return;

            const teamData = teamDoc.data();

            // Applica bonus XP dalla variante figurina icona
            const iconaVariant = teamData.iconaVariant || 'normale';
            const variantBonus = window.FigurineSystem?.getVariantBonuses(iconaVariant)?.xpBonus || 0;
            const XP_PER_MATCH = Math.round(BASE_XP_PER_MATCH * (1 + variantBonus / 100));

            const formationXp = teamData.formationXp || {};
            const currentXp = formationXp[modulo] || 0;
            const newXp = currentXp + XP_PER_MATCH;

            formationXp[modulo] = newXp;
            await updateDoc(teamDocRef, { formationXp });

            const bonusText = variantBonus > 0 ? ` (+${variantBonus}% da variante ${iconaVariant})` : '';
            console.log(`[FormationXP] Squadra ${teamId}: ${modulo} +${XP_PER_MATCH} XP${bonusText} (totale: ${newXp})`);
        } catch (error) {
            console.error(`[FormationXP] Errore aggiunta XP per squadra ${teamId}:`, error);
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
            // 1. Carica classifica (usando LeaderboardListener per cache condivisa)
            const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);
            const leaderboardData = await window.LeaderboardListener.getLeaderboard();
            let standings = leaderboardData?.standings || [];
            const standingsMap = new Map(standings.map(s => [s.teamId, s]));

            // 2. Carica dati squadre (FETCH FRESCO per includere playersFormStatus)
            const homeTeamDoc = await getDoc(doc(db, TEAMS_COLLECTION_PATH, match.homeId));
            const awayTeamDoc = await getDoc(doc(db, TEAMS_COLLECTION_PATH, match.awayId));
            
            // UTILIZZA I DATI FRESCHI DEL DOC (aggiungi ID per PlayerSeasonStats)
            const homeTeamData = homeTeamDoc.exists() ? { ...homeTeamDoc.data(), id: match.homeId } : null;
            const awayTeamData = awayTeamDoc.exists() ? { ...awayTeamDoc.data(), id: match.awayId } : null;
            
            if (!homeTeamData || !awayTeamData) {
                throw new Error(`Dati squadra mancanti per ${match.homeName} o ${match.awayName}.`);
            }
            
            // 3. Simula partita
            const { homeGoals, awayGoals } = window.ChampionshipSimulation.runSimulation(homeTeamData, awayTeamData);

            // 3.5. Registra statistiche stagionali (goal, assist, clean sheets)
            if (window.PlayerSeasonStats) {
                await window.PlayerSeasonStats.recordMatchStats(homeTeamData, awayTeamData, homeGoals, awayGoals);
            }

            // 3.5b. Registra statistiche avanzate giocatori (se feature attiva)
            if (window.FeatureFlags?.isEnabled('playerStats') && window.PlayerStats) {
                await window.PlayerStats.recordTeamMatchStats(match.homeId, homeTeamData, {
                    opponentId: match.awayId,
                    opponentName: awayTeamData.teamName,
                    goalsFor: homeGoals,
                    goalsAgainst: awayGoals,
                    isHome: true,
                    matchType: 'campionato'
                });
                await window.PlayerStats.recordTeamMatchStats(match.awayId, awayTeamData, {
                    opponentId: match.homeId,
                    opponentName: homeTeamData.teamName,
                    goalsFor: awayGoals,
                    goalsAgainst: homeGoals,
                    isHome: false,
                    matchType: 'campionato'
                });
            }

            // 3.6. Processa EXP giocatori
            if (window.PlayerExp) {
                const homeExpResults = window.PlayerExp.processMatchExp(homeTeamData, { homeGoals, awayGoals, isHome: true });
                const awayExpResults = window.PlayerExp.processMatchExp(awayTeamData, { homeGoals, awayGoals, isHome: false });

                // Salva EXP aggiornata su Firestore
                const { updateDoc, doc, appId } = window.firestoreTools;
                const teamsPath = `artifacts/${appId}/public/data/teams`;

                // Salva rosa home team con EXP aggiornata
                if (homeTeamData.rosa && homeExpResults.length > 0) {
                    await updateDoc(doc(window.db, teamsPath, match.homeId), {
                        rosa: homeTeamData.rosa,
                        coach: homeTeamData.coach || null
                    });
                }

                // Salva rosa away team con EXP aggiornata
                if (awayTeamData.rosa && awayExpResults.length > 0) {
                    await updateDoc(doc(window.db, teamsPath, match.awayId), {
                        rosa: awayTeamData.rosa,
                        coach: awayTeamData.coach || null
                    });
                }

                // Mostra notifiche level-up
                if (window.PlayerExpUI) {
                    const allLevelUps = [...homeExpResults, ...awayExpResults].filter(r => r.leveledUp);
                    if (allLevelUps.length > 0) {
                        window.PlayerExpUI.showMultipleLevelUpModal(allLevelUps);
                    }
                }
            }

            // REPLAY: Mostra replay SOLO se non e admin E flag attivo
                const isAdmin = window.InterfacciaCore?.currentTeamId === 'admin';
                const replayEnabled = window.FeatureFlags?.isEnabled('matchReplay') !== false;
                if (window.MatchReplaySimple && !isAdmin && replayEnabled) {
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

            // 5.5 Applica bonus sponsor (se feature attiva)
            if (window.FeatureFlags?.isEnabled('sponsors') && window.SponsorSystem) {
                const standings = Array.from(standingsMap.values()).sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
                });

                // Bonus per squadra di casa
                await window.SponsorSystem.processSingleMatchBonus(match.homeId, {
                    won: homeGoals > awayGoals,
                    drew: homeGoals === awayGoals,
                    lost: homeGoals < awayGoals,
                    goalsScored: homeGoals,
                    matchday: roundIndex + 1
                }, standings);

                // Bonus per squadra ospite
                await window.SponsorSystem.processSingleMatchBonus(match.awayId, {
                    won: awayGoals > homeGoals,
                    drew: homeGoals === awayGoals,
                    lost: awayGoals < homeGoals,
                    goalsScored: awayGoals,
                    matchday: roundIndex + 1
                }, standings);
            }

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

            // Invalida cache LeaderboardListener dopo salvataggio
            window.LeaderboardListener.invalidateCache();

            // 8. Dispatch evento matchSimulated per notifiche push
            document.dispatchEvent(new CustomEvent('matchSimulated', {
                detail: {
                    homeTeam: { id: match.homeId, name: homeTeamName },
                    awayTeam: { id: match.awayId, name: awayTeamName },
                    result: resultString,
                    type: 'Campionato'
                }
            }));

            // 9. Ricarica UI
            if (renderCallback) {
                const reloadedScheduleDoc = await getDoc(scheduleDocRef);
                const reloadedSchedule = reloadedScheduleDoc.exists() ? reloadedScheduleDoc.data().matches : [];
                renderCallback(reloadedSchedule, allTeams);
            }

            // 10. Sincronizza con automazione (avanza tipo simulazione)
            if (window.AutomazioneSimulazioni?.advanceSimulationType) {
                await window.AutomazioneSimulazioni.advanceSimulationType('campionato');
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
            // Carica classifica (usando LeaderboardListener per cache condivisa)
            const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);
            const leaderboardData = await window.LeaderboardListener.getLeaderboard();
            let standings = leaderboardData?.standings || [];
            const standingsMap = new Map(standings.map(s => [s.teamId, s]));

            for (const match of matchesToSimulate) {
                teamsInRound.add(match.homeId);
                teamsInRound.add(match.awayId);

                // FETCH FRESCO per includere playersFormStatus
                const [homeTeamDoc, awayTeamDoc] = await Promise.all([
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, match.homeId)),
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, match.awayId))
                ]);
                
                // Aggiungi ID per PlayerSeasonStats
                const homeTeamData = homeTeamDoc.exists() ? { ...homeTeamDoc.data(), id: match.homeId } : null;
                const awayTeamData = awayTeamDoc.exists() ? { ...awayTeamDoc.data(), id: match.awayId } : null;

                if (!homeTeamData || !awayTeamData) {
                    console.warn(`Dati squadra mancanti per il match ${match.homeName} vs ${match.awayName}. Salto.`);
                    continue;
                }

                // Espandi formazione per avere nomi giocatori (per telecronaca)
                const expandFormation = window.GestioneSquadreUtils?.expandFormationFromRosa;
                if (expandFormation) {
                    homeTeamData.formation.titolari = expandFormation(homeTeamData.formation.titolari || [], homeTeamData.players || []);
                    awayTeamData.formation.titolari = expandFormation(awayTeamData.formation.titolari || [], awayTeamData.players || []);
                }

                const { homeGoals, awayGoals } = window.ChampionshipSimulation.runSimulation(homeTeamData, awayTeamData);

                // Genera log telecronaca (indipendente dalla simulazione principale)
                let matchLog = null;
                if (window.SimulazioneNuoveRegole) {
                    const logResult = window.SimulazioneNuoveRegole.runSimulationWithLog(homeTeamData, awayTeamData);
                    matchLog = logResult.log;
                }

                // Registra statistiche stagionali (goal, assist, clean sheets)
                if (window.PlayerSeasonStats) {
                    await window.PlayerSeasonStats.recordMatchStats(homeTeamData, awayTeamData, homeGoals, awayGoals);
                }

                // Registra statistiche avanzate giocatori (se feature attiva)
                if (window.FeatureFlags?.isEnabled('playerStats') && window.PlayerStats) {
                    await window.PlayerStats.recordTeamMatchStats(match.homeId, homeTeamData, {
                        opponentId: match.awayId,
                        opponentName: awayTeamData.teamName,
                        goalsFor: homeGoals,
                        goalsAgainst: awayGoals,
                        isHome: true,
                        matchType: 'campionato'
                    });
                    await window.PlayerStats.recordTeamMatchStats(match.awayId, awayTeamData, {
                        opponentId: match.homeId,
                        opponentName: homeTeamData.teamName,
                        goalsFor: awayGoals,
                        goalsAgainst: homeGoals,
                        isHome: false,
                        matchType: 'campionato'
                    });
                }

                // Processa EXP giocatori
                if (window.PlayerExp) {
                    const homeExpResults = window.PlayerExp.processMatchExp(homeTeamData, { homeGoals, awayGoals, isHome: true });
                    const awayExpResults = window.PlayerExp.processMatchExp(awayTeamData, { homeGoals, awayGoals, isHome: false });

                    // Salva EXP aggiornata su Firestore
                    const { updateDoc, doc, appId } = window.firestoreTools;
                    const teamsPath = `artifacts/${appId}/public/data/teams`;

                    if (homeTeamData.rosa && homeExpResults.length > 0) {
                        await updateDoc(doc(window.db, teamsPath, match.homeId), {
                            rosa: homeTeamData.rosa,
                            coach: homeTeamData.coach || null
                        });
                    }
                    if (awayTeamData.rosa && awayExpResults.length > 0) {
                        await updateDoc(doc(window.db, teamsPath, match.awayId), {
                            rosa: awayTeamData.rosa,
                            coach: awayTeamData.coach || null
                        });
                    }

                    // Mostra notifiche level-up
                    if (window.PlayerExpUI) {
                        const allLevelUps = [...homeExpResults, ...awayExpResults].filter(r => r.leveledUp);
                        if (allLevelUps.length > 0) {
                            window.PlayerExpUI.showMultipleLevelUpModal(allLevelUps);
                        }
                    }
                }

                // Processa XP formazione (se feature attiva)
                if (window.FeatureFlags?.isEnabled('formationXp')) {
                    await this.addFormationXp(match.homeId, homeTeamData.formation?.modulo);
                    await this.addFormationXp(match.awayId, awayTeamData.formation?.modulo);
                }

                // REPLAY: Mostra replay SOLO se non e admin E flag attivo
                const isAdmin = window.InterfacciaCore?.currentTeamId === 'admin';
                const replayEnabled = window.FeatureFlags?.isEnabled('matchReplay') !== false;
                if (window.MatchReplaySimple && !isAdmin && replayEnabled) {
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

                // Applica bonus sponsor (se feature attiva)
                if (window.FeatureFlags?.isEnabled('sponsors') && window.SponsorSystem) {
                    const currentStandings = Array.from(standingsMap.values()).sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
                    });

                    await window.SponsorSystem.processSingleMatchBonus(match.homeId, {
                        won: homeGoals > awayGoals,
                        drew: homeGoals === awayGoals,
                        lost: homeGoals < awayGoals,
                        goalsScored: homeGoals,
                        matchday: round.round
                    }, currentStandings);

                    await window.SponsorSystem.processSingleMatchBonus(match.awayId, {
                        won: awayGoals > homeGoals,
                        drew: homeGoals === awayGoals,
                        lost: awayGoals < homeGoals,
                        goalsScored: awayGoals,
                        matchday: round.round
                    }, currentStandings);
                }

                // Salva nello storico partite per entrambe le squadre
                if (window.MatchHistory) {
                    // Salva per squadra di casa
                    await window.MatchHistory.saveMatch(match.homeId, {
                        type: 'campionato',
                        homeTeam: {
                            id: match.homeId,
                            name: homeTeamData.teamName,
                            logoUrl: homeTeamData.logoUrl || ''
                        },
                        awayTeam: {
                            id: match.awayId,
                            name: awayTeamData.teamName,
                            logoUrl: awayTeamData.logoUrl || ''
                        },
                        homeScore: homeGoals,
                        awayScore: awayGoals,
                        isHome: true,
                        details: matchLog ? { matchLog } : null
                    });

                    // Salva per squadra ospite
                    await window.MatchHistory.saveMatch(match.awayId, {
                        type: 'campionato',
                        homeTeam: {
                            id: match.homeId,
                            name: homeTeamData.teamName,
                            logoUrl: homeTeamData.logoUrl || ''
                        },
                        awayTeam: {
                            id: match.awayId,
                            name: awayTeamData.teamName,
                            logoUrl: awayTeamData.logoUrl || ''
                        },
                        homeScore: homeGoals,
                        awayScore: awayGoals,
                        isHome: false,
                        details: matchLog ? { matchLog } : null
                    });
                }

                // Dispatch evento matchSimulated per notifiche push
                document.dispatchEvent(new CustomEvent('matchSimulated', {
                    detail: {
                        homeTeam: { id: match.homeId, name: homeTeamName },
                        awayTeam: { id: match.awayId, name: awayTeamName },
                        result: resultString,
                        type: 'Campionato'
                    }
                }));
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

            // Invalida cache LeaderboardListener dopo salvataggio
            window.LeaderboardListener.invalidateCache();

            if (renderCallback) {
                const reloadedScheduleDoc = await getDoc(scheduleDocRef);
                const reloadedSchedule = reloadedScheduleDoc.exists() ? reloadedScheduleDoc.data().matches : [];
                renderCallback(reloadedSchedule, allTeams);
            }

            // Sincronizza con automazione (avanza tipo simulazione)
            if (window.AutomazioneSimulazioni?.advanceSimulationType) {
                await window.AutomazioneSimulazioni.advanceSimulationType('campionato');
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
