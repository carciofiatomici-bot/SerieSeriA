//
// ====================================================================
// COPPA-MAIN.JS - Orchestratore CoppaSeriA
// ====================================================================
//

window.CoppaMain = {

    /**
     * Genera il calendario della coppa (chiamato dall'admin)
     */
    async generateCupSchedule() {
        try {
            // Verifica se la coppa e' in corso (ci sono partite giocate)
            const existingBracket = await window.CoppaSchedule.loadCupSchedule();
            if (existingBracket && existingBracket.rounds) {
                const playedMatches = existingBracket.rounds.reduce((count, round) => {
                    return count + (round.matches?.filter(m =>
                        m.leg1Result || m.leg2Result || m.result
                    ).length || 0);
                }, 0);

                if (playedMatches > 0) {
                    throw new Error(`Impossibile generare un nuovo calendario: la coppa e' in corso (${playedMatches} partite giocate). Termina o resetta prima la coppa attuale.`);
                }
            }

            // Ottieni le squadre iscritte alla coppa
            const participants = await window.CoppaSchedule.getCupParticipants();

            if (participants.length < 2) {
                throw new Error('Servono almeno 2 squadre iscritte alla CoppaSeriA.');
            }

            // Genera e salva il tabellone
            const bracket = await window.CoppaSchedule.generateAndSaveCupSchedule(participants);

            // Aggiorna config per indicare che la coppa e in corso
            await this.updateCupConfig({ isCupOver: false, cupWinner: null });

            console.log(`CoppaSeriA generata con ${participants.length} squadre.`);

            return bracket;

        } catch (error) {
            console.error('Errore generazione calendario coppa:', error);
            throw error;
        }
    },

    /**
     * Simula una singola partita di coppa
     * @param {number} roundIndex - Indice del turno
     * @param {number} matchIndex - Indice del match
     * @param {string} legType - 'leg1' o 'leg2'
     */
    async simulateMatch(roundIndex, matchIndex, legType) {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        // Carica il tabellone
        let bracket = await window.CoppaSchedule.loadCupSchedule();
        if (!bracket) {
            throw new Error('Nessun tabellone CoppaSeriA trovato.');
        }

        // VALIDAZIONE: Verifica struttura del bracket
        console.log(`[CoppaMain] simulateMatch: roundIndex=${roundIndex}, matchIndex=${matchIndex}, legType=${legType}`);
        console.log(`[CoppaMain] Bracket ha ${bracket.rounds?.length || 0} round(s)`);

        if (!bracket.rounds || bracket.rounds.length === 0) {
            throw new Error('Il tabellone CoppaSeriA non contiene round validi.');
        }

        // Verifica che i round successivi esistano (per non-finale)
        const round = bracket.rounds[roundIndex];
        if (!round) {
            throw new Error(`Round ${roundIndex} non trovato nel tabellone.`);
        }

        if (round.roundName !== 'Finale' && roundIndex + 1 >= bracket.rounds.length) {
            console.warn(`[CoppaMain] ATTENZIONE: Round "${round.roundName}" non e' la Finale ma non ci sono round successivi!`);
            console.warn(`[CoppaMain] Questo potrebbe causare la terminazione prematura della coppa.`);
        }

        const match = round.matches[matchIndex];

        if (!match.homeTeam || !match.awayTeam) {
            throw new Error('Match non ancora definito (squadre mancanti).');
        }

        // Carica i dati delle squadre
        const homeTeamRef = doc(db, `artifacts/${appId}/public/data/teams`, match.homeTeam.teamId);
        const awayTeamRef = doc(db, `artifacts/${appId}/public/data/teams`, match.awayTeam.teamId);

        const [homeTeamDoc, awayTeamDoc] = await Promise.all([
            getDoc(homeTeamRef),
            getDoc(awayTeamRef)
        ]);

        if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) {
            throw new Error('Dati squadra non trovati.');
        }

        const homeTeamData = homeTeamDoc.data();
        const awayTeamData = awayTeamDoc.data();

        // Espandi formazione per avere nomi giocatori (per telecronaca)
        const expandFormation = window.GestioneSquadreUtils?.expandFormationFromRosa;
        if (expandFormation) {
            homeTeamData.formation.titolari = expandFormation(homeTeamData.formation?.titolari || [], homeTeamData.players || []);
            awayTeamData.formation.titolari = expandFormation(awayTeamData.formation?.titolari || [], awayTeamData.players || []);
        }

        // Per il ritorno, inverti casa/trasferta
        let actualHome = homeTeamData;
        let actualAway = awayTeamData;

        if (legType === 'leg2') {
            actualHome = awayTeamData;
            actualAway = homeTeamData;
        }

        // Genera log telecronaca
        let matchLog = null;
        if (window.SimulazioneNuoveRegole) {
            const logResult = window.SimulazioneNuoveRegole.runSimulationWithLog(actualHome, actualAway);
            matchLog = logResult.log;
        }

        // Aggiungi roundName al match per i controlli di sicurezza
        match.roundName = round.roundName;

        // Simula la partita
        const result = await window.CoppaSimulation.simulateCupMatch(
            match,
            actualHome,
            actualAway,
            round.isSingleMatch,
            legType
        );

        // Registra statistiche stagionali per la coppa
        if (result.resultString && window.PlayerSeasonStats) {
            try {
                const parts = result.resultString.split(' ')[0].split('-');
                const homeGoals = parseInt(parts[0]) || 0;
                const awayGoals = parseInt(parts[1]) || 0;

                // Aggiungi ID alle squadre per PlayerSeasonStats
                const homeWithId = { ...actualHome, id: legType === 'leg2' ? match.awayTeam.teamId : match.homeTeam.teamId };
                const awayWithId = { ...actualAway, id: legType === 'leg2' ? match.homeTeam.teamId : match.awayTeam.teamId };

                await window.PlayerSeasonStats.recordMatchStats(homeWithId, awayWithId, homeGoals, awayGoals, 'coppa');
            } catch (statsError) {
                console.warn('[CoppaMain] Errore registrazione stats coppa:', statsError);
            }
        }

        // Aggiorna il match nel tabellone
        if (legType === 'leg1') {
            match.leg1Result = result.resultString;
        } else {
            match.leg2Result = result.resultString;
        }

        // SEMPRE: Applica i crediti per gol (il bonus vittoria viene assegnato solo se c'e un vincitore)
        await this.applyMatchCredits(match.homeTeam.teamId, match.awayTeam.teamId, result);

        // SEMPRE: Processa XP formazione (se feature attiva)
        if (window.FeatureFlags?.isEnabled('formationXp') && window.ChampionshipMain?.addFormationXp) {
            await window.ChampionshipMain.addFormationXp(match.homeTeam.teamId, homeTeamData.formation?.modulo);
            await window.ChampionshipMain.addFormationXp(match.awayTeam.teamId, awayTeamData.formation?.modulo);
        }

        // SEMPRE: Processa EXP giocatori
        if (window.PlayerExp) {
            const parts = result.resultString.split(' ')[0].split('-');
            const homeGoals = parseInt(parts[0]) || 0;
            const awayGoals = parseInt(parts[1]) || 0;

            const homeExpResults = window.PlayerExp.processMatchExp(homeTeamData, { homeGoals, awayGoals, isHome: true });
            const awayExpResults = window.PlayerExp.processMatchExp(awayTeamData, { homeGoals, awayGoals, isHome: false });

            // Salva EXP aggiornata su Firestore
            const teamsPath = `artifacts/${appId}/public/data/teams`;
            try {
                if (homeTeamData.rosa && homeExpResults.length > 0) {
                    const { updateDoc: updateDocFn } = window.firestoreTools;
                    await updateDocFn(doc(db, teamsPath, match.homeTeam.teamId), {
                        rosa: homeTeamData.rosa,
                        coach: homeTeamData.coach || null
                    });
                }
                if (awayTeamData.rosa && awayExpResults.length > 0) {
                    const { updateDoc: updateDocFn } = window.firestoreTools;
                    await updateDocFn(doc(db, teamsPath, match.awayTeam.teamId), {
                        rosa: awayTeamData.rosa,
                        coach: awayTeamData.coach || null
                    });
                }
            } catch (expSaveError) {
                console.warn('[CoppaMain] Errore salvataggio EXP:', expSaveError);
            }

            // Mostra notifiche level-up
            if (window.PlayerExpUI) {
                const allLevelUps = [...homeExpResults, ...awayExpResults].filter(r => r.leveledUp);
                if (allLevelUps.length > 0) {
                    window.PlayerExpUI.showMultipleLevelUpModal(allLevelUps);
                }
            }
        }

        // Se c'e un vincitore, promuovilo al turno successivo
        if (result.winner) {
            match.winner = result.winner;
            match.aggregateHome = result.aggregateHome || 0;
            match.aggregateAway = result.aggregateAway || 0;

            if (result.penalties) {
                match.penalties = result.penalties;
            }

            // Promuovi il vincitore
            window.CoppaBrackets.promoteWinner(bracket, roundIndex, matchIndex, result.winner);

            // Salva nello storico partite per entrambe le squadre
            if (window.MatchHistory && result.resultString) {
                const parts = result.resultString.split(' ')[0].split('-');
                const homeGoals = parseInt(parts[0]) || 0;
                const awayGoals = parseInt(parts[1]) || 0;

                // Salva per squadra di casa
                await window.MatchHistory.saveMatch(match.homeTeam.teamId, {
                    type: 'coppa',
                    homeTeam: {
                        id: match.homeTeam.teamId,
                        name: match.homeTeam.teamName,
                        logoUrl: homeTeamData.logoUrl || ''
                    },
                    awayTeam: {
                        id: match.awayTeam.teamId,
                        name: match.awayTeam.teamName,
                        logoUrl: awayTeamData.logoUrl || ''
                    },
                    homeScore: homeGoals,
                    awayScore: awayGoals,
                    isHome: true,
                    details: {
                        round: round.roundName,
                        leg: legType,
                        matchLog: matchLog
                    }
                });

                // Salva per squadra ospite
                await window.MatchHistory.saveMatch(match.awayTeam.teamId, {
                    type: 'coppa',
                    homeTeam: {
                        id: match.homeTeam.teamId,
                        name: match.homeTeam.teamName,
                        logoUrl: homeTeamData.logoUrl || ''
                    },
                    awayTeam: {
                        id: match.awayTeam.teamId,
                        name: match.awayTeam.teamName,
                        logoUrl: awayTeamData.logoUrl || ''
                    },
                    homeScore: homeGoals,
                    awayScore: awayGoals,
                    isHome: false,
                    details: {
                        round: round.roundName,
                        leg: legType,
                        matchLog: matchLog
                    }
                });

                // Dispatch evento matchSimulated per notifiche push
                document.dispatchEvent(new CustomEvent('matchSimulated', {
                    detail: {
                        homeTeam: { id: match.homeTeam.teamId, name: match.homeTeam.teamName },
                        awayTeam: { id: match.awayTeam.teamId, name: match.awayTeam.teamName },
                        result: `${homeGoals}-${awayGoals}`,
                        type: 'Coppa'
                    }
                }));
            }
        }

        // Verifica se il turno e completato
        if (window.CoppaSchedule.isRoundCompleted(round)) {
            round.status = 'completed';
        }

        // Verifica se la coppa e completata
        if (bracket.winner) {
            bracket.status = 'completed';

            // Trova i semifinalisti perdenti (3° e 4° posto)
            const semifinalRound = bracket.rounds.find(r => r.roundName === 'Semifinali');
            if (semifinalRound) {
                const losers = semifinalRound.matches
                    .filter(m => m.winner)
                    .map(m => m.winner.teamId === m.homeTeam.teamId ? m.awayTeam : m.homeTeam);

                if (losers.length >= 2) {
                    bracket.thirdPlace = losers[0];
                    bracket.fourthPlace = losers[1];
                }
            }

            // Trova il finalista perdente (2° posto)
            const finalRound = bracket.rounds.find(r => r.roundName === 'Finale');
            if (finalRound && finalRound.matches[0]) {
                const finalMatch = finalRound.matches[0];
                bracket.runnerUp = finalMatch.winner.teamId === finalMatch.homeTeam.teamId
                    ? finalMatch.awayTeam
                    : finalMatch.homeTeam;
            }
        }

        // Resetta la forma dei giocatori delle squadre coinvolte
        await this.resetPlayersForm([match.homeTeam.teamId, match.awayTeam.teamId]);

        // Salva il tabellone aggiornato
        await window.CoppaSchedule.updateCupSchedule(bracket);

        // Ricarica l'UI se disponibile
        if (window.CoppaAdminPanel && window.CoppaAdminPanel.refresh) {
            window.CoppaAdminPanel.refresh();
        }

        // Sincronizza con automazione (avanza tipo simulazione)
        if (window.AutomazioneSimulazioni?.advanceSimulationType) {
            await window.AutomazioneSimulazioni.advanceSimulationType('coppa');
        }

        return result;
    },

    /**
     * Applica i crediti per gol e vittoria partita coppa
     */
    async applyMatchCredits(homeTeamId, awayTeamId, result) {
        // CHECK: Se i reward sono disabilitati, ritorna senza assegnare crediti
        if (window.AdminRewards?.areRewardsDisabled()) {
            console.log('[CoppaMain] Reward DISABILITATI - nessun CS assegnato');
            return { homeCredits: 0, awayCredits: 0 };
        }

        const { appId, doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const { REWARDS } = window.CoppaConstants;

        // Estrai i gol dal risultato
        let homeGoals = 0;
        let awayGoals = 0;

        if (result.resultString) {
            const parts = result.resultString.split(' ')[0].split('-');
            homeGoals = parseInt(parts[0]) || 0;
            awayGoals = parseInt(parts[1]) || 0;
        }

        // Calcola crediti: 1 CS per gol + 25 CS per vittoria
        let homeCredits = homeGoals * REWARDS.GOAL_CS;
        let awayCredits = awayGoals * REWARDS.GOAL_CS;

        // Bonus vittoria (chi passa il turno)
        if (result.winner) {
            if (result.winner.teamId === homeTeamId) {
                homeCredits += REWARDS.MATCH_WIN_CS;
            } else if (result.winner.teamId === awayTeamId) {
                awayCredits += REWARDS.MATCH_WIN_CS;
            }
        }

        // Applica crediti a home team
        if (homeCredits > 0) {
            const homeRef = doc(db, `artifacts/${appId}/public/data/teams`, homeTeamId);
            const homeDoc = await getDoc(homeRef);
            if (homeDoc.exists()) {
                await updateDoc(homeRef, {
                    budget: (homeDoc.data().budget || 0) + homeCredits
                });
            }
        }

        // Applica crediti a away team
        if (awayCredits > 0) {
            const awayRef = doc(db, `artifacts/${appId}/public/data/teams`, awayTeamId);
            const awayDoc = await getDoc(awayRef);
            if (awayDoc.exists()) {
                await updateDoc(awayRef, {
                    budget: (awayDoc.data().budget || 0) + awayCredits
                });
            }
        }
    },

    /**
     * Resetta la forma dei giocatori dopo una partita
     */
    async resetPlayersForm(teamIds) {
        const { appId, doc, updateDoc } = window.firestoreTools;
        const db = window.db;

        for (const teamId of teamIds) {
            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
            await updateDoc(teamRef, {
                playersFormStatus: {}
            });
        }
    },

    /**
     * Applica i premi finali della coppa
     */
    async applyCupRewards() {
        // CHECK: Se i reward sono disabilitati, ritorna senza assegnare premi
        if (window.AdminRewards?.areRewardsDisabled()) {
            console.log('[CoppaMain] Reward DISABILITATI - nessun premio coppa assegnato');
            return;
        }

        const bracket = await window.CoppaSchedule.loadCupSchedule();

        if (!bracket || bracket.status !== 'completed') {
            throw new Error('La CoppaSeriA non e ancora completata.');
        }

        const { REWARDS } = window.CoppaConstants;
        const { appId, doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;

        // Vincitore: 1 CSS (solo se sistema CSS abilitato)
        if (bracket.winner) {
            const cssEnabled = window.CreditiSuperSeri ? await window.CreditiSuperSeri.isEnabled() : false;
            if (cssEnabled) {
                const winnerRef = doc(db, `artifacts/${appId}/public/data/teams`, bracket.winner.teamId);
                const winnerDoc = await getDoc(winnerRef);
                if (winnerDoc.exists()) {
                    await updateDoc(winnerRef, {
                        creditiSuperSeri: (winnerDoc.data().creditiSuperSeri || 0) + REWARDS.WINNER_CSS
                    });
                    console.log(`Premio CSS vincitore assegnato a ${bracket.winner.teamName}`);
                }
            } else {
                console.log(`Sistema CSS disabilitato - premio CSS non assegnato a ${bracket.winner.teamName}`);
            }
        }

        // 2°, 3°, 4° posto: 150 CS
        const placeholders = [bracket.runnerUp, bracket.thirdPlace, bracket.fourthPlace];

        for (const team of placeholders) {
            if (team) {
                const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, team.teamId);
                const teamDoc = await getDoc(teamRef);
                if (teamDoc.exists()) {
                    await updateDoc(teamRef, {
                        budget: (teamDoc.data().budget || 0) + REWARDS.PLACES_2_3_4_CS
                    });
                    console.log(`Premio CS (${REWARDS.PLACES_2_3_4_CS}) assegnato a ${team.teamName}`);
                }
            }
        }

        // Aggiorna config
        await this.updateCupConfig({
            isCupOver: true,
            cupWinner: bracket.winner ? bracket.winner.teamId : null
        });

        return {
            winner: bracket.winner,
            runnerUp: bracket.runnerUp,
            thirdPlace: bracket.thirdPlace,
            fourthPlace: bracket.fourthPlace
        };
    },

    /**
     * Termina la coppa senza premi (solo reset)
     */
    async terminateCupWithoutRewards() {
        await window.CoppaSchedule.deleteCupSchedule();
        await this.updateCupConfig({ isCupOver: true, cupWinner: null });
    },

    /**
     * Aggiorna la configurazione della coppa
     */
    async updateCupConfig(updates) {
        const { appId, doc, setDoc, getDoc } = window.firestoreTools;
        const db = window.db;

        const configRef = doc(db, `artifacts/${appId}/public/data/config`, 'settings');
        const configDoc = await getDoc(configRef);

        const currentConfig = configDoc.exists() ? configDoc.data() : {};

        await setDoc(configRef, {
            ...currentConfig,
            ...updates
        });
    },

    /**
     * Verifica se la coppa e terminata
     */
    async isCupOver() {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        const configRef = doc(db, `artifacts/${appId}/public/data/config`, 'settings');
        const configDoc = await getDoc(configRef);

        if (!configDoc.exists()) return true;

        return configDoc.data().isCupOver !== false;
    },

    /**
     * Ottiene il vincitore della coppa
     */
    async getCupWinner() {
        const bracket = await window.CoppaSchedule.loadCupSchedule();
        return bracket ? bracket.winner : null;
    },

    /**
     * Toggle iscrizione coppa per una squadra
     */
    async toggleCupParticipation(teamId, participating) {
        const { appId, doc, updateDoc } = window.firestoreTools;
        const db = window.db;

        const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        await updateDoc(teamRef, {
            isCupParticipating: participating
        });

        console.log(`Squadra ${teamId} ${participating ? 'iscritta' : 'ritirata'} dalla CoppaSeriA.`);
    },

    /**
     * Simula tutte le partite di un turno specifico (andata o ritorno)
     * @param {number} roundIndex - Indice del turno
     * @param {string} legType - 'leg1' o 'leg2'
     * @returns {Promise<Array>} Risultati delle partite simulate
     */
    async simulateRound(roundIndex, legType) {
        const bracket = await window.CoppaSchedule.loadCupSchedule();
        if (!bracket) {
            throw new Error('Nessun tabellone CoppaSeriA trovato.');
        }

        const round = bracket.rounds[roundIndex];
        if (!round) {
            throw new Error('Turno non valido.');
        }

        const results = [];

        for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex++) {
            const match = round.matches[matchIndex];

            // Salta partite gia giocate, bye, o senza squadre
            if (!match.homeTeam || !match.awayTeam) continue;
            if (match.isBye) continue;

            // Controlla se questa leg e gia stata giocata
            if (legType === 'leg1' && match.leg1Result) continue;
            if (legType === 'leg2' && match.leg2Result) continue;
            if (match.winner) continue;

            try {
                const result = await this.simulateMatch(roundIndex, matchIndex, legType);
                results.push({
                    matchIndex,
                    homeTeam: match.homeTeam.teamName,
                    awayTeam: match.awayTeam.teamName,
                    result: result.resultString,
                    winner: result.winner ? result.winner.teamName : null
                });
            } catch (error) {
                console.error(`Errore simulazione match ${matchIndex}:`, error);
            }
        }

        return results;
    },

    /**
     * Simula tutte le partite rimanenti del turno corrente
     * @returns {Promise<Object>} {roundName, legType, results}
     */
    async simulateCurrentRound() {
        const bracket = await window.CoppaSchedule.loadCupSchedule();
        if (!bracket) {
            throw new Error('Nessun tabellone CoppaSeriA trovato.');
        }

        // Trova il prossimo match da giocare
        const nextMatch = window.CoppaSchedule.findNextMatch(bracket);
        if (!nextMatch) {
            throw new Error('Tutte le partite sono state giocate.');
        }

        const { roundIndex, round, legType } = nextMatch;
        const results = await this.simulateRound(roundIndex, legType);

        return {
            roundIndex,
            roundName: round.roundName,
            legType,
            isSingleMatch: round.isSingleMatch,
            results
        };
    },

    /**
     * Ottiene informazioni sul turno corrente
     * @returns {Promise<Object>} Info sul turno corrente
     */
    async getCurrentRoundInfo() {
        const bracket = await window.CoppaSchedule.loadCupSchedule();
        if (!bracket) {
            return null;
        }

        const nextMatch = window.CoppaSchedule.findNextMatch(bracket);
        if (!nextMatch) {
            // Coppa completata
            return {
                isCompleted: true,
                winner: bracket.winner,
                runnerUp: bracket.runnerUp,
                thirdPlace: bracket.thirdPlace,
                fourthPlace: bracket.fourthPlace
            };
        }

        const { round, roundIndex, legType } = nextMatch;

        // Conta partite da giocare in questo turno/leg
        let pendingMatches = 0;
        let totalMatches = 0;

        round.matches.forEach(match => {
            if (!match.homeTeam || !match.awayTeam || match.isBye) return;
            totalMatches++;

            if (round.isSingleMatch) {
                if (!match.leg1Result) pendingMatches++;
            } else {
                if (legType === 'leg1' && !match.leg1Result) pendingMatches++;
                else if (legType === 'leg2' && !match.leg2Result) pendingMatches++;
            }
        });

        return {
            isCompleted: false,
            roundIndex,
            roundName: round.roundName,
            isSingleMatch: round.isSingleMatch,
            legType,
            pendingMatches,
            totalMatches,
            bracket
        };
    }
};

console.log("Modulo Coppa-Main caricato.");
