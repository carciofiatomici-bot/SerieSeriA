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

        // Applica EXP dai campi playersExp (importante per non perdere progressi)
        if (window.PlayerExp?.applyExpFromFirestore) {
            window.PlayerExp.applyExpFromFirestore(homeTeamData);
            window.PlayerExp.applyExpFromFirestore(awayTeamData);
        }

        // Per il ritorno, inverti casa/trasferta
        let actualHome = homeTeamData;
        let actualAway = awayTeamData;

        if (legType === 'leg2') {
            actualHome = awayTeamData;
            actualAway = homeTeamData;
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

                // Registra statistiche avanzate giocatori (se feature attiva)
                if (window.FeatureFlags?.isEnabled('playerStats') && window.PlayerStats && result.matchEvents) {
                    const homeTeamId = legType === 'leg2' ? match.awayTeam.teamId : match.homeTeam.teamId;
                    const awayTeamId = legType === 'leg2' ? match.homeTeam.teamId : match.awayTeam.teamId;

                    await window.PlayerStats.recordMatchStatsFromEvents(homeTeamId, actualHome, {
                        opponentId: awayTeamId,
                        opponentName: actualAway.teamName,
                        goalsFor: homeGoals,
                        goalsAgainst: awayGoals,
                        isHome: true,
                        matchType: 'coppa'
                    }, result.matchEvents);
                    await window.PlayerStats.recordMatchStatsFromEvents(awayTeamId, actualAway, {
                        opponentId: homeTeamId,
                        opponentName: actualHome.teamName,
                        goalsFor: awayGoals,
                        goalsAgainst: homeGoals,
                        isHome: false,
                        matchType: 'coppa'
                    }, result.matchEvents);
                }
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

        // Estrai i gol dal risultato
        const { homeGoals, awayGoals } = window.MatchCredits.parseResultString(result.resultString);

        // SEMPRE: Applica i crediti per gol (il bonus vittoria viene assegnato solo se c'e un vincitore)
        if (window.MatchCredits) {
            await window.MatchCredits.applyMatchCredits(
                match.homeTeam.teamId,
                match.awayTeam.teamId,
                homeGoals,
                awayGoals,
                result.winner?.teamId,
                { competition: 'coppa' }
            );
        }

        // SEMPRE: Processa XP formazione (se feature attiva)
        if (window.FeatureFlags?.isEnabled('formationXp') && window.ChampionshipMain?.addFormationXp) {
            await window.ChampionshipMain.addFormationXp(match.homeTeam.teamId, homeTeamData.formation?.modulo);
            await window.ChampionshipMain.addFormationXp(match.awayTeam.teamId, awayTeamData.formation?.modulo);
        }

        // SEMPRE: Processa EXP giocatori (NUOVO SISTEMA)
        console.log('[Coppa EXP] Inizio processamento EXP');
        if (window.PlayerExp) {
            console.log('[Coppa EXP] Risultato:', homeGoals, '-', awayGoals);

            const homeExpResults = window.PlayerExp.processMatchExp(homeTeamData, { homeGoals, awayGoals, isHome: true });
            const awayExpResults = window.PlayerExp.processMatchExp(awayTeamData, { homeGoals, awayGoals, isHome: false });
            console.log('[Coppa EXP] Risultati home:', homeExpResults.length, 'away:', awayExpResults.length);

            // NUOVO: Salva EXP in campo separato 'playersExp'
            if (homeExpResults.length > 0) {
                console.log('[Coppa EXP] Salvataggio home team:', match.homeTeam.teamId);
                await window.PlayerExp.saveExpToFirestore(match.homeTeam.teamId, homeExpResults);
            }
            if (awayExpResults.length > 0) {
                console.log('[Coppa EXP] Salvataggio away team:', match.awayTeam.teamId);
                await window.PlayerExp.saveExpToFirestore(match.awayTeam.teamId, awayExpResults);
            }

            // Notifiche level-up rimosse (troppo invasive durante simulazione)
        }

        // SEMPRE: Salva nello storico partite per entrambe le squadre (sia andata che ritorno)
        if (window.MatchHistory && result.resultString) {
            const parts = result.resultString.split(' ')[0].split('-');
            const homeGoals = parseInt(parts[0]) || 0;
            const awayGoals = parseInt(parts[1]) || 0;

            // Salva per squadra di casa
            // Prepara dettagli con highlights e matchLog per telecronaca
            const matchDetails = {
                round: round.roundName,
                leg: legType,
                highlights: result.highlights || null,
                matchLog: result.matchLog || [],
                scorers: result.scorers || [],
                assists: result.assists || []
            };

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
                details: matchDetails
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
                details: matchDetails
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

            // NUOVO: Assegna premi automaticamente alla fine della coppa
            try {
                // Salva prima il bracket con i piazzamenti
                await window.CoppaSchedule.updateCupSchedule(bracket);

                // Poi applica i premi
                const rewardsResult = await this.applyCupRewards();
                console.log('[CoppaMain] Premi coppa assegnati automaticamente:', rewardsResult);

                // Notifica l'utente
                if (window.Toast) {
                    window.Toast.success(`🏆 Premi CoppaSeriA assegnati!\n1° ${bracket.winner.teamName}`);
                }
            } catch (rewardError) {
                console.error('[CoppaMain] Errore assegnazione premi automatica:', rewardError);
                // Non blocchiamo - l'admin puo assegnare manualmente
                if (window.Toast) {
                    window.Toast.warning('Premi non assegnati automaticamente. Usa il bottone manuale.');
                }
            }
        }

        // Resetta la forma dei giocatori delle squadre coinvolte
        await this.resetPlayersForm([match.homeTeam.teamId, match.awayTeam.teamId]);

        // Salva il tabellone aggiornato
        await window.CoppaSchedule.updateCupSchedule(bracket);

        // FIX: Invalida cache per sincronizzare immediatamente i dati
        if (window.FirestoreCache?.invalidate) {
            window.FirestoreCache.invalidate('SCHEDULE', 'coppa_schedule');
        }

        // Invalida anche LeaderboardListener per aggiornamento istantaneo
        if (window.LeaderboardListener?.invalidateCache) {
            window.LeaderboardListener.invalidateCache();
        }

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

    // applyMatchCredits rimossa - ora usa window.MatchCredits.applyMatchCredits()

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
     * @param {boolean} forceReapply - Se true, riapplica i premi anche se gia assegnati
     */
    async applyCupRewards(forceReapply = false) {
        const bracket = await window.CoppaSchedule.loadCupSchedule();

        if (!bracket || bracket.status !== 'completed') {
            throw new Error('La CoppaSeriA non e ancora completata.');
        }

        // Controlla se i premi sono gia stati assegnati
        if (bracket.rewardsApplied && !forceReapply) {
            console.log('[CoppaMain] Premi gia assegnati. Usa forceReapply=true per riassegnare.');
            return {
                alreadyApplied: true,
                winner: bracket.winner,
                runnerUp: bracket.runnerUp,
                thirdPlace: bracket.thirdPlace,
                fourthPlace: bracket.fourthPlace
            };
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

        // Segna i premi come assegnati nel bracket
        bracket.rewardsApplied = true;
        bracket.rewardsAppliedAt = new Date().toISOString();
        await window.CoppaSchedule.updateCupSchedule(bracket);

        // Aggiorna config
        await this.updateCupConfig({
            isCupOver: true,
            cupWinner: bracket.winner ? bracket.winner.teamId : null
        });

        console.log('[CoppaMain] Premi coppa assegnati con successo.');

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
