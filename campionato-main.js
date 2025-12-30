//
// ====================================================================
// MODULO CAMPIONATO-MAIN.JS (Orchestrazione Principale)
// ====================================================================
//

window.ChampionshipMain = {

    // Numero di giornate recenti da mantenere con dati completi (matchLog, matchEvents)
    KEEP_RECENT_ROUNDS: 5,

    /**
     * Pulisce i dati pesanti (matchLog, matchEvents) dallo schedule, mantenendo solo le ultime N giornate.
     * Eseguire dalla console: window.ChampionshipMain.cleanScheduleData()
     */
    async cleanScheduleData() {
        const { doc, getDoc, setDoc, appId } = window.firestoreTools;
        const db = window.db;
        const SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
        const SCHEDULE_DOC_ID = 'full_schedule';

        console.log('[ChampionshipMain] Pulizia dati schedule in corso...');

        try {
            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            const scheduleDoc = await getDoc(scheduleDocRef);

            if (!scheduleDoc.exists()) {
                console.log('[ChampionshipMain] Schedule non trovato');
                return { success: false, reason: 'not_found' };
            }

            const schedule = scheduleDoc.data().matches || [];

            // Trova le ultime N giornate giocate
            const playedRounds = schedule
                .map((round, index) => ({ round, index, hasResults: round.matches.some(m => m.result) }))
                .filter(r => r.hasResults)
                .slice(-this.KEEP_RECENT_ROUNDS)
                .map(r => r.index);

            let cleanedCount = 0;

            // Rimuovi matchLog e matchEvents dalle giornate vecchie
            schedule.forEach((round, roundIndex) => {
                const isRecent = playedRounds.includes(roundIndex);

                round.matches.forEach(match => {
                    if (!isRecent) {
                        // Giornata vecchia: rimuovi dati pesanti
                        if (match.matchLog) {
                            delete match.matchLog;
                            cleanedCount++;
                        }
                        if (match.matchEvents) {
                            delete match.matchEvents;
                            cleanedCount++;
                        }
                    }
                    // Compatta scorers se e' un array di oggetti
                    if (match.scorers && match.scorers.length > 0 && typeof match.scorers[0] === 'object') {
                        match.scorers = match.scorers.map(s => s.name || s);
                    }
                });
            });

            // Salva schedule pulito
            await setDoc(scheduleDocRef, { matches: schedule });

            console.log(`[ChampionshipMain] Pulizia completata! Rimossi ${cleanedCount} campi pesanti. Mantenute ultime ${this.KEEP_RECENT_ROUNDS} giornate.`);
            return { success: true, cleanedCount, keptRounds: playedRounds.length };

        } catch (error) {
            console.error('[ChampionshipMain] Errore pulizia schedule:', error);
            return { success: false, error: error.message };
        }
    },

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

        // Bug #27: Bounds check prima di accedere all'array
        if (!schedule || !schedule[roundIndex] || !schedule[roundIndex].matches || !schedule[roundIndex].matches[matchIndex]) {
            console.error('[ChampionshipMain] Indici partita non validi:', { roundIndex, matchIndex, scheduleLength: schedule?.length });
            if (button) {
                button.disabled = false;
                button.textContent = 'Simula';
            }
            return;
        }

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

            // Applica EXP dai campi playersExp (importante per non perdere progressi)
            if (window.PlayerExp?.applyExpFromFirestore) {
                window.PlayerExp.applyExpFromFirestore(homeTeamData);
                window.PlayerExp.applyExpFromFirestore(awayTeamData);
            }

            // 2.5 Imposta malus debito stipendi per la simulazione
            if (window.Stipendi && window._salaryDebtPenalty) {
                const homeDebtPenalty = window.Stipendi.getDebtPenalty(homeTeamData);
                const awayDebtPenalty = window.Stipendi.getDebtPenalty(awayTeamData);
                window._salaryDebtPenalty = { teamA: homeDebtPenalty, teamB: awayDebtPenalty };
            }

            // 3. Simula partita con highlights
            const simResult = window.ChampionshipSimulation.runSimulationWithHighlights(homeTeamData, awayTeamData);
            const { homeGoals, awayGoals, highlights, highlightsText, scorers, assists, matchEvents } = simResult;

            // 3.5. Registra statistiche stagionali (goal, assist, clean sheets)
            if (window.PlayerSeasonStats) {
                await window.PlayerSeasonStats.recordMatchStats(homeTeamData, awayTeamData, homeGoals, awayGoals);
            }

            // 3.5b. Registra statistiche avanzate giocatori (se feature attiva)
            // NUOVO: Usa matchEvents per statistiche REALI dalla simulazione
            if (window.FeatureFlags?.isEnabled('playerStats') && window.PlayerStats) {
                await window.PlayerStats.recordMatchStatsFromEvents(match.homeId, homeTeamData, {
                    opponentId: match.awayId,
                    opponentName: awayTeamData.teamName,
                    goalsFor: homeGoals,
                    goalsAgainst: awayGoals,
                    isHome: true,
                    matchType: 'campionato'
                }, matchEvents);
                await window.PlayerStats.recordMatchStatsFromEvents(match.awayId, awayTeamData, {
                    opponentId: match.homeId,
                    opponentName: homeTeamData.teamName,
                    goalsFor: awayGoals,
                    goalsAgainst: homeGoals,
                    isHome: false,
                    matchType: 'campionato'
                }, matchEvents);
            }

            // 3.6. Processa EXP giocatori (NUOVO SISTEMA)
            if (window.PlayerExp) {
                // Bug #4 Fix: Estrai playerStats da matchEvents per bonus gol/assist
                const homePlayerStats = window.PlayerExp.extractPlayerStatsFromEvents?.(matchEvents, homeTeamData, true) || {};
                const awayPlayerStats = window.PlayerExp.extractPlayerStatsFromEvents?.(matchEvents, awayTeamData, false) || {};

                const homeExpResults = window.PlayerExp.processMatchExp(homeTeamData, { homeGoals, awayGoals, isHome: true, playerStats: homePlayerStats });
                const awayExpResults = window.PlayerExp.processMatchExp(awayTeamData, { homeGoals, awayGoals, isHome: false, playerStats: awayPlayerStats });

                // NUOVO: Salva EXP in campo separato 'playersExp'
                if (homeExpResults.length > 0) {
                    await window.PlayerExp.saveExpToFirestore(match.homeId, homeExpResults);
                }
                if (awayExpResults.length > 0) {
                    await window.PlayerExp.saveExpToFirestore(match.awayId, awayExpResults);
                }

                // Notifiche level-up rimosse (troppo invasive durante simulazione)
            }

            // Processa XP formazione (se feature attiva)
            if (window.FeatureFlags?.isEnabled('formationXp')) {
                await this.addFormationXp(match.homeId, homeTeamData.formation?.modulo);
                await this.addFormationXp(match.awayId, awayTeamData.formation?.modulo);
            }

            // 3.7. Processa infortuni a fine partita (se feature attiva)
            if (window.Injuries?.isEnabled()) {
                // Decrementa infortuni esistenti per entrambe le squadre
                await window.Injuries.decrementInjuries(match.homeId);
                await window.Injuries.decrementInjuries(match.awayId);

                // Processa nuovi infortuni
                const homePlayers = [...(homeTeamData.formation?.titolari || []), ...(homeTeamData.formation?.panchina || [])];
                const awayPlayers = [...(awayTeamData.formation?.titolari || []), ...(awayTeamData.formation?.panchina || [])];

                const homeInjury = await window.Injuries.processPostMatchInjuries(match.homeId, homePlayers, 'campionato');
                const awayInjury = await window.Injuries.processPostMatchInjuries(match.awayId, awayPlayers, 'campionato');

                if (homeInjury) {
                    console.log(`[Campionato] Infortunio ${homeTeamData.teamName}: ${homeInjury.playerName} (${homeInjury.duration} partite)`);
                }
                if (awayInjury) {
                    console.log(`[Campionato] Infortunio ${awayTeamData.teamName}: ${awayInjury.playerName} (${awayInjury.duration} partite)`);
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
                        awayGoals,
                        matchEvents // Passa eventi reali per mostrare nomi giocatori
                    );
                }
            const resultString = `${homeGoals}-${awayGoals}`;
            match.result = resultString;
            // Salva matchLog e matchEvents per telecronaca (verranno puliti nelle giornate vecchie)
            match.matchLog = highlights || [];
            match.matchEvents = matchEvents || [];
            match.scorers = (scorers || []).map(s => s.name || s);

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

            // 5.7 Pagamento stipendi (se sistema attivo)
            if (window.Stipendi) {
                try {
                    const homeSalaryResult = await window.Stipendi.processSalaryPayment(match.homeId, homeTeamData, roundIndex + 1);
                    const awaySalaryResult = await window.Stipendi.processSalaryPayment(match.awayId, awayTeamData, roundIndex + 1);

                    if (!homeSalaryResult.skipped) {
                        console.log(`[Stipendi] ${homeTeamData.teamName}: ${homeSalaryResult.paid}/${homeSalaryResult.totalSalary} CS`);
                    }
                    if (!awaySalaryResult.skipped) {
                        console.log(`[Stipendi] ${awayTeamData.teamName}: ${awaySalaryResult.paid}/${awaySalaryResult.totalSalary} CS`);
                    }
                } catch (salaryError) {
                    console.error('[Stipendi] Errore pagamento:', salaryError);
                }
            }

            // 6. NUOVO SISTEMA FORMA v2: basato su posizione, risultato e prestazioni
            if (window.FeatureFlags?.isEnabled('playerForm') && window.GestioneSquadreUtils?.updatePlayerFormAfterMatch) {
                // Determina risultato per ogni squadra
                const homeResult = homeGoals > awayGoals ? 'win' : (homeGoals < awayGoals ? 'loss' : 'draw');
                const awayResult = awayGoals > homeGoals ? 'win' : (awayGoals < homeGoals ? 'loss' : 'draw');

                // Estrai statistiche giocatori dai matchEvents
                const homeFormStats = window.GestioneSquadreUtils.extractFormStatsFromEvents(matchEvents, homeTeamData, true);
                const awayFormStats = window.GestioneSquadreUtils.extractFormStatsFromEvents(matchEvents, awayTeamData, false);

                await window.GestioneSquadreUtils.updatePlayerFormAfterMatch(match.homeId, homeTeamData, homeResult, homeFormStats);
                await window.GestioneSquadreUtils.updatePlayerFormAfterMatch(match.awayId, awayTeamData, awayResult, awayFormStats);
            }
            
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

            // Invalida cache ScheduleListener - il realtime listener si aggiornera' automaticamente
            if (window.ScheduleListener) {
                window.ScheduleListener.invalidateCache();
            }

            // Invalida anche FirestoreCache per aggiornamento istantaneo
            if (window.FirestoreCache?.invalidate) {
                window.FirestoreCache.invalidate('schedule', 'full_schedule');
                window.FirestoreCache.invalidate('SCHEDULE', 'full_schedule'); // Retrocompatibilita
                window.FirestoreCache.invalidate('LEADERBOARD', 'standings');
            }

            // Emetti evento per aggiornare dashboard
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

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
        // Usa !match.result per catturare null, undefined e stringa vuota
        let matchesToSimulate = round.matches.filter(match => !match.result);

        console.log(`[ChampionshipMain] Giornata ${round.round}, partite da simulare: ${matchesToSimulate.length}`);
        console.log(`[ChampionshipMain] Partite:`, matchesToSimulate.map(m => `${m.homeName} vs ${m.awayName} (result: ${m.result})`));

        // Raccoglie tutti gli ID delle squadre coinvolte nella giornata per il reset finale
        const teamsInRound = new Set();

        // Raccoglie dati partite per calcolo MVP del Giorno
        const simulatedMatches = [];

        if (matchesToSimulate.length === 0) {
            console.log(`[ChampionshipMain] Nessuna partita da simulare nella giornata ${round.round}`);
            console.log(`[ChampionshipMain] Stato partite:`, round.matches.map(m => `${m.homeName} vs ${m.awayName}: ${m.result}`));
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

                // Applica EXP dai campi playersExp (importante per non perdere progressi)
                if (window.PlayerExp?.applyExpFromFirestore) {
                    window.PlayerExp.applyExpFromFirestore(homeTeamData);
                    window.PlayerExp.applyExpFromFirestore(awayTeamData);
                }

                // Imposta malus debito stipendi per la simulazione
                if (window.Stipendi && window._salaryDebtPenalty) {
                    const homeDebtPenalty = window.Stipendi.getDebtPenalty(homeTeamData);
                    const awayDebtPenalty = window.Stipendi.getDebtPenalty(awayTeamData);
                    window._salaryDebtPenalty = { teamA: homeDebtPenalty, teamB: awayDebtPenalty };
                }

                const simResult = window.ChampionshipSimulation.runSimulationWithHighlights(homeTeamData, awayTeamData);
                const { homeGoals, awayGoals, highlights, highlightsText, scorers, assists, matchEvents } = simResult;

                // Registra statistiche stagionali (goal, assist, clean sheets)
                if (window.PlayerSeasonStats) {
                    await window.PlayerSeasonStats.recordMatchStats(homeTeamData, awayTeamData, homeGoals, awayGoals);
                }

                // Registra statistiche avanzate giocatori (se feature attiva)
                // NUOVO: Usa matchEvents per statistiche REALI dalla simulazione
                if (window.FeatureFlags?.isEnabled('playerStats') && window.PlayerStats) {
                    await window.PlayerStats.recordMatchStatsFromEvents(match.homeId, homeTeamData, {
                        opponentId: match.awayId,
                        opponentName: awayTeamData.teamName,
                        goalsFor: homeGoals,
                        goalsAgainst: awayGoals,
                        isHome: true,
                        matchType: 'campionato'
                    }, matchEvents);
                    await window.PlayerStats.recordMatchStatsFromEvents(match.awayId, awayTeamData, {
                        opponentId: match.homeId,
                        opponentName: homeTeamData.teamName,
                        goalsFor: awayGoals,
                        goalsAgainst: homeGoals,
                        isHome: false,
                        matchType: 'campionato'
                    }, matchEvents);
                }

                // Processa EXP giocatori (NUOVO SISTEMA)
                if (window.PlayerExp) {
                    // Bug #4 Fix: Estrai playerStats da matchEvents per bonus gol/assist
                    const homePlayerStats = window.PlayerExp.extractPlayerStatsFromEvents?.(matchEvents, homeTeamData, true) || {};
                    const awayPlayerStats = window.PlayerExp.extractPlayerStatsFromEvents?.(matchEvents, awayTeamData, false) || {};

                    const homeExpResults = window.PlayerExp.processMatchExp(homeTeamData, { homeGoals, awayGoals, isHome: true, playerStats: homePlayerStats });
                    const awayExpResults = window.PlayerExp.processMatchExp(awayTeamData, { homeGoals, awayGoals, isHome: false, playerStats: awayPlayerStats });

                    // NUOVO: Salva EXP in campo separato 'playersExp'
                    if (homeExpResults.length > 0) {
                        await window.PlayerExp.saveExpToFirestore(match.homeId, homeExpResults);
                    }
                    if (awayExpResults.length > 0) {
                        await window.PlayerExp.saveExpToFirestore(match.awayId, awayExpResults);
                    }

                    // Notifiche level-up rimosse (troppo invasive durante simulazione)
                }

                // Processa XP formazione (se feature attiva)
                if (window.FeatureFlags?.isEnabled('formationXp')) {
                    await this.addFormationXp(match.homeId, homeTeamData.formation?.modulo);
                    await this.addFormationXp(match.awayId, awayTeamData.formation?.modulo);
                }

                // Processa infortuni a fine partita (se feature attiva)
                if (window.Injuries?.isEnabled()) {
                    // Decrementa infortuni esistenti per entrambe le squadre
                    await window.Injuries.decrementInjuries(match.homeId);
                    await window.Injuries.decrementInjuries(match.awayId);

                    // Processa nuovi infortuni
                    const homePlayers = [...(homeTeamData.formation?.titolari || []), ...(homeTeamData.formation?.panchina || [])];
                    const awayPlayers = [...(awayTeamData.formation?.titolari || []), ...(awayTeamData.formation?.panchina || [])];

                    const homeInjury = await window.Injuries.processPostMatchInjuries(match.homeId, homePlayers, 'campionato');
                    const awayInjury = await window.Injuries.processPostMatchInjuries(match.awayId, awayPlayers, 'campionato');

                    if (homeInjury) {
                        console.log(`[Campionato] Infortunio ${homeTeamData.teamName}: ${homeInjury.playerName} (${homeInjury.duration} partite)`);
                    }
                    if (awayInjury) {
                        console.log(`[Campionato] Infortunio ${awayTeamData.teamName}: ${awayInjury.playerName} (${awayInjury.duration} partite)`);
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
                        awayGoals,
                        matchEvents // Passa eventi reali per mostrare nomi giocatori
                    );
                }
                const resultString = `${homeGoals}-${awayGoals}`;

                const matchIndexInRound = round.matches.findIndex(m => m.homeId === match.homeId && m.awayId === match.awayId && !m.result);
                console.log(`[ChampionshipMain] Partita ${match.homeName} vs ${match.awayName}: risultato ${resultString}, index trovato: ${matchIndexInRound}`);
                if (matchIndexInRound !== -1) {
                    round.matches[matchIndexInRound].result = resultString;
                    console.log(`[ChampionshipMain] Risultato salvato in round.matches[${matchIndexInRound}]`);
                    // Salva matchLog e matchEvents per telecronaca (verranno puliti nelle giornate vecchie)
                    round.matches[matchIndexInRound].matchLog = highlights || [];
                    round.matches[matchIndexInRound].matchEvents = matchEvents || [];
                    round.matches[matchIndexInRound].scorers = (scorers || []).map(s => s.name || s);
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

                // Pagamento stipendi (se sistema attivo)
                if (window.Stipendi) {
                    try {
                        await window.Stipendi.processSalaryPayment(match.homeId, homeTeamData, round.round);
                        await window.Stipendi.processSalaryPayment(match.awayId, awayTeamData, round.round);
                    } catch (salaryError) {
                        console.error('[Stipendi] Errore pagamento:', salaryError);
                    }
                }

                // Salva nello storico partite per entrambe le squadre
                if (window.MatchHistory) {
                    // Prepara dettagli con highlights e matchLog per telecronaca
                    const matchDetails = {
                        highlights: highlightsText,
                        matchLog: highlights || [],
                        scorers: scorers || [],
                        assists: assists || []
                    };

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
                        details: matchDetails
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
                        details: matchDetails
                    });
                }

                // NUOVO SISTEMA FORMA v2: basato su posizione, risultato e prestazioni
                if (window.FeatureFlags?.isEnabled('playerForm') && window.GestioneSquadreUtils?.updatePlayerFormAfterMatch) {
                    const homeResult = homeGoals > awayGoals ? 'win' : (homeGoals < awayGoals ? 'loss' : 'draw');
                    const awayResult = awayGoals > homeGoals ? 'win' : (awayGoals < homeGoals ? 'loss' : 'draw');

                    const homeFormStats = window.GestioneSquadreUtils.extractFormStatsFromEvents(matchEvents, homeTeamData, true);
                    const awayFormStats = window.GestioneSquadreUtils.extractFormStatsFromEvents(matchEvents, awayTeamData, false);

                    await window.GestioneSquadreUtils.updatePlayerFormAfterMatch(match.homeId, homeTeamData, homeResult, homeFormStats);
                    await window.GestioneSquadreUtils.updatePlayerFormAfterMatch(match.awayId, awayTeamData, awayResult, awayFormStats);
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

                // Raccoglie dati per MVP del Giorno
                simulatedMatches.push({
                    homeTeamId: match.homeId,
                    awayTeamId: match.awayId,
                    homeTeam: {
                        id: match.homeId,
                        name: homeTeamData.teamName,
                        teamName: homeTeamData.teamName,
                        formation: homeTeamData.formation
                    },
                    awayTeam: {
                        id: match.awayId,
                        name: awayTeamData.teamName,
                        teamName: awayTeamData.teamName,
                        formation: awayTeamData.formation
                    },
                    result: { homeGoals, awayGoals },
                    matchLog: highlights || [],
                    matchEvents: matchEvents || []
                });
            }

            // RIMOSSO: Il reset forme non è più necessario con il nuovo sistema basato su prestazioni
            // Le forme vengono aggiornate (non resettate) dopo ogni partita

            console.log(`[ChampionshipMain] Simulazione completata, salvataggio su Firestore...`);
            console.log(`[ChampionshipMain] Risultati da salvare:`, round.matches.map(m => `${m.homeName} vs ${m.awayName}: ${m.result}`));
            console.log(`[ChampionshipMain] Schedule completo (tutte le giornate):`, schedule.map((r, i) => ({
                giornata: r.round || i+1,
                partiteConRisultato: r.matches.filter(m => m.result).length,
                partiteSenzaRisultato: r.matches.filter(m => !m.result).length
            })));

            // Pulisci dati pesanti dalle giornate vecchie prima di salvare
            const playedRounds = schedule
                .map((r, i) => ({ index: i, hasResults: r.matches.some(m => m.result) }))
                .filter(r => r.hasResults)
                .slice(-this.KEEP_RECENT_ROUNDS)
                .map(r => r.index);

            schedule.forEach((r, i) => {
                if (!playedRounds.includes(i)) {
                    r.matches.forEach(m => {
                        delete m.matchLog;
                        delete m.matchEvents;
                    });
                }
            });

            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            try {
                await setDoc(scheduleDocRef, { matches: schedule }, { merge: true });
                console.log(`[ChampionshipMain] Schedule salvato su Firestore con successo!`);
            } catch (saveError) {
                console.error(`[ChampionshipMain] ERRORE salvataggio Firestore:`, saveError);
                throw saveError;
            }

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

            // Invalida cache ScheduleListener - il realtime listener si aggiornera' automaticamente
            if (window.ScheduleListener) {
                window.ScheduleListener.invalidateCache();
            }

            // Invalida anche FirestoreCache per aggiornamento istantaneo
            if (window.FirestoreCache?.invalidate) {
                window.FirestoreCache.invalidate('schedule', 'full_schedule');
                window.FirestoreCache.invalidate('SCHEDULE', 'full_schedule'); // Retrocompatibilita
                window.FirestoreCache.invalidate('LEADERBOARD', 'standings');
            }

            // Emetti evento per aggiornare tutti i componenti della dashboard
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            if (renderCallback) {
                const reloadedScheduleDoc = await getDoc(scheduleDocRef);
                const reloadedSchedule = reloadedScheduleDoc.exists() ? reloadedScheduleDoc.data().matches : [];
                renderCallback(reloadedSchedule, allTeams);
            }

            // Sincronizza con automazione (avanza tipo simulazione)
            if (window.AutomazioneSimulazioni?.advanceSimulationType) {
                await window.AutomazioneSimulazioni.advanceSimulationType('campionato');
            }

            // Calcola MVP del Giorno (se feature attiva e almeno 2 partite simulate)
            if (window.MvpDelGiorno?.isEnabled() && simulatedMatches.length >= 2) {
                try {
                    const mvp = await window.MvpDelGiorno.calculateAndSaveMvp(simulatedMatches, 'campionato');
                    if (mvp) {
                        console.log(`[Campionato] MVP del Giorno: ${mvp.playerName} (${mvp.teamName}) - Score: ${mvp.score}`);
                    }
                } catch (mvpError) {
                    console.error('[Campionato] Errore calcolo MVP:', mvpError);
                }
            }

            // Riabilita il pulsante dopo il successo
            if (button) {
                button.disabled = false;
                button.textContent = `Simula Tutta la Giornata ${round.round}`;
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

console.log('Modulo campionato-main.js caricato.');
