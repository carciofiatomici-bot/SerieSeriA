//
// ====================================================================
// COPPA-QUASI.JS - Coppa Quasi SeriA (Torneo Ultime 3 Classificate)
// ====================================================================
//
// La Coppa Quasi SeriA si gioca tra le ultime 3 squadre classificate:
// - Terzultimo classificato
// - Penultimo classificato
// - Ultimo classificato
//
// Formato: Triangolare (3 partite - ognuno contro tutti)
// Classifica: Punti > Diff gol > Gol fatti
// Premio: 1 CSS + Trofeo Coppa Quasi al vincitore
//
// Si gioca DOPO il campionato ma PRIMA della Supercoppa
//

window.CoppaQuasi = {

    COPPA_QUASI_DOC_ID: 'coppa_quasi_match',

    // Getter dinamico per premio CSS
    get REWARD_CSS() {
        return window.RewardsConfig?.rewardCoppaQuasiCSS || 1;
    },

    /**
     * Verifica se le condizioni per la Coppa Quasi sono soddisfatte
     * (Campionato terminato, almeno 3 squadre in classifica)
     */
    async canCreateCoppaQuasi() {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        const configRef = doc(db, `artifacts/${appId}/public/data/config`, 'settings');
        const configDoc = await getDoc(configRef);

        if (!configDoc.exists()) return { canCreate: false, reason: 'Configurazione non trovata.' };

        const config = configDoc.data();

        // Verifica campionato terminato
        if (!config.isSeasonOver) {
            return { canCreate: false, reason: 'Il campionato non e ancora terminato.' };
        }

        // Verifica che non ci sia gia una Coppa Quasi in corso
        const coppaQuasiBracket = await this.loadCoppaQuasi();
        if (coppaQuasiBracket && !coppaQuasiBracket.isCompleted) {
            return { canCreate: false, reason: 'Una Coppa Quasi SeriA e gia in corso.' };
        }

        // Verifica almeno 3 squadre in classifica
        const leaderboardData = await window.LeaderboardListener.getLeaderboard();
        if (!leaderboardData?.standings || leaderboardData.standings.length < 3) {
            return { canCreate: false, reason: 'Servono almeno 3 squadre in classifica.' };
        }

        return { canCreate: true, reason: null };
    },

    /**
     * Determina i partecipanti alla Coppa Quasi (ultime 3 classificate)
     */
    async getParticipants() {
        const leaderboardData = await window.LeaderboardListener.getLeaderboard();

        if (!leaderboardData?.standings) {
            throw new Error('Classifica campionato non trovata.');
        }

        const standings = leaderboardData.standings;
        if (standings.length < 3) {
            throw new Error('Servono almeno 3 squadre in classifica.');
        }

        const numTeams = standings.length;

        // Ultime 3 squadre
        const terzultimo = standings[numTeams - 3];
        const penultimo = standings[numTeams - 2];
        const ultimo = standings[numTeams - 1];

        return [
            {
                teamId: terzultimo.teamId,
                teamName: terzultimo.teamName,
                position: 'terzultimo',
                positionNumber: numTeams - 2,
                points: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalsDiff: 0,
                played: 0
            },
            {
                teamId: penultimo.teamId,
                teamName: penultimo.teamName,
                position: 'penultimo',
                positionNumber: numTeams - 1,
                points: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalsDiff: 0,
                played: 0
            },
            {
                teamId: ultimo.teamId,
                teamName: ultimo.teamName,
                position: 'ultimo',
                positionNumber: numTeams,
                points: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalsDiff: 0,
                played: 0
            }
        ];
    },

    /**
     * Crea la Coppa Quasi SeriA
     */
    async createCoppaQuasi() {
        const canCreate = await this.canCreateCoppaQuasi();
        if (!canCreate.canCreate) {
            throw new Error(canCreate.reason);
        }

        const participants = await this.getParticipants();

        // Genera le 3 partite del triangolare
        const matches = [
            {
                matchIndex: 0,
                homeTeam: { teamId: participants[0].teamId, teamName: participants[0].teamName },
                awayTeam: { teamId: participants[1].teamId, teamName: participants[1].teamName },
                result: null,
                matchEvents: null,
                scorers: null,
                isCompleted: false
            },
            {
                matchIndex: 1,
                homeTeam: { teamId: participants[1].teamId, teamName: participants[1].teamName },
                awayTeam: { teamId: participants[2].teamId, teamName: participants[2].teamName },
                result: null,
                matchEvents: null,
                scorers: null,
                isCompleted: false
            },
            {
                matchIndex: 2,
                homeTeam: { teamId: participants[2].teamId, teamName: participants[2].teamName },
                awayTeam: { teamId: participants[0].teamId, teamName: participants[0].teamName },
                result: null,
                matchEvents: null,
                scorers: null,
                isCompleted: false
            }
        ];

        const coppaQuasiBracket = {
            matchId: 'coppa_quasi_' + Date.now(),
            participants: participants,
            matches: matches,
            standings: [...participants], // Copia iniziale
            winner: null,
            isCompleted: false,
            creationDate: new Date().toISOString(),
            completionDate: null
        };

        await this.saveCoppaQuasi(coppaQuasiBracket);

        console.log(`Coppa Quasi SeriA creata: ${participants.map(p => p.teamName).join(' vs ')}`);

        return coppaQuasiBracket;
    },

    /**
     * Verifica automaticamente se creare la Coppa Quasi
     * Da chiamare dopo la chiusura del campionato
     */
    async checkAndCreateCoppaQuasi() {
        const status = await this.canCreateCoppaQuasi();
        if (status.canCreate) {
            console.log('[CoppaQuasi] Creazione automatica Coppa Quasi SeriA...');
            try {
                const bracket = await this.createCoppaQuasi();
                console.log(`[CoppaQuasi] Creata con ${bracket.participants.length} partecipanti`);

                if (window.Toast) {
                    window.Toast.success(`Coppa Quasi SeriA creata!`);
                }

                return { created: true, bracket };
            } catch (error) {
                console.error('[CoppaQuasi] Errore creazione automatica:', error);
                return { created: false, error: error.message };
            }
        }
        return { created: false, reason: status.reason };
    },

    /**
     * Simula una singola partita del triangolare
     */
    async simulateMatch(matchIndex) {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        const coppaQuasiBracket = await this.loadCoppaQuasi();
        if (!coppaQuasiBracket) {
            throw new Error('Nessuna Coppa Quasi in programma.');
        }

        if (coppaQuasiBracket.isCompleted) {
            throw new Error('La Coppa Quasi e gia stata completata.');
        }

        const match = coppaQuasiBracket.matches[matchIndex];
        if (!match) {
            throw new Error(`Partita ${matchIndex} non trovata.`);
        }

        if (match.isCompleted) {
            throw new Error(`Partita ${matchIndex} gia giocata.`);
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

        // Applica EXP
        if (window.PlayerExp?.applyExpFromFirestore) {
            window.PlayerExp.applyExpFromFirestore(homeTeamData);
            window.PlayerExp.applyExpFromFirestore(awayTeamData);
        }

        // Simula la partita
        const matchResult = window.CoppaSimulation.runMatchWithHighlights(homeTeamData, awayTeamData);

        // Aggiorna la partita
        match.result = `${matchResult.homeGoals}-${matchResult.awayGoals}`;
        match.matchEvents = matchResult.matchEvents || [];
        match.scorers = matchResult.scorers || [];
        match.isCompleted = true;

        // Aggiorna standings dei partecipanti
        this._updateStandings(coppaQuasiBracket, match, matchResult.homeGoals, matchResult.awayGoals);

        // Registra statistiche
        await this._recordMatchStats(coppaQuasiBracket, match, homeTeamData, awayTeamData, matchResult);

        // Applica crediti partita
        if (window.MatchCredits) {
            const winnerId = matchResult.homeGoals > matchResult.awayGoals ? match.homeTeam.teamId :
                            matchResult.awayGoals > matchResult.homeGoals ? match.awayTeam.teamId : null;
            await window.MatchCredits.applyMatchCredits(
                match.homeTeam.teamId,
                match.awayTeam.teamId,
                matchResult.homeGoals,
                matchResult.awayGoals,
                winnerId,
                { competition: 'coppa_quasi' }
            );
        }

        // Processa EXP giocatori
        await this._processPlayerExp(coppaQuasiBracket, match, homeTeamData, awayTeamData, matchResult);

        // Verifica se tutte le partite sono completate
        const allCompleted = coppaQuasiBracket.matches.every(m => m.isCompleted);
        if (allCompleted) {
            await this._finalizeTournament(coppaQuasiBracket);
        }

        // Salva
        await this.saveCoppaQuasi(coppaQuasiBracket);

        // Salva nello storico
        await this._saveMatchHistory(coppaQuasiBracket, match, homeTeamData, awayTeamData, matchResult);

        console.log(`Coppa Quasi - Partita ${matchIndex + 1}: ${match.homeTeam.teamName} ${match.result} ${match.awayTeam.teamName}`);

        return { match, bracket: coppaQuasiBracket };
    },

    /**
     * Aggiorna la classifica del mini-torneo
     */
    _updateStandings(bracket, match, homeGoals, awayGoals) {
        const homeParticipant = bracket.participants.find(p => p.teamId === match.homeTeam.teamId);
        const awayParticipant = bracket.participants.find(p => p.teamId === match.awayTeam.teamId);

        if (!homeParticipant || !awayParticipant) return;

        // Aggiorna statistiche
        homeParticipant.played++;
        awayParticipant.played++;
        homeParticipant.goalsFor += homeGoals;
        homeParticipant.goalsAgainst += awayGoals;
        awayParticipant.goalsFor += awayGoals;
        awayParticipant.goalsAgainst += homeGoals;

        // Punti
        if (homeGoals > awayGoals) {
            homeParticipant.points += 3;
        } else if (awayGoals > homeGoals) {
            awayParticipant.points += 3;
        } else {
            homeParticipant.points += 1;
            awayParticipant.points += 1;
        }

        // Diff gol
        homeParticipant.goalsDiff = homeParticipant.goalsFor - homeParticipant.goalsAgainst;
        awayParticipant.goalsDiff = awayParticipant.goalsFor - awayParticipant.goalsAgainst;

        // Ricalcola standings ordinati
        bracket.standings = [...bracket.participants].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalsDiff !== a.goalsDiff) return b.goalsDiff - a.goalsDiff;
            return b.goalsFor - a.goalsFor;
        });
    },

    /**
     * Registra statistiche della partita
     */
    async _recordMatchStats(bracket, match, homeTeamData, awayTeamData, matchResult) {
        if (window.PlayerSeasonStats) {
            try {
                const homeWithId = { ...homeTeamData, id: match.homeTeam.teamId };
                const awayWithId = { ...awayTeamData, id: match.awayTeam.teamId };

                await window.PlayerSeasonStats.recordMatchStats(
                    homeWithId,
                    awayWithId,
                    matchResult.homeGoals,
                    matchResult.awayGoals,
                    'coppa_quasi'
                );

                if (window.FeatureFlags?.isEnabled('playerStats') && window.PlayerStats && matchResult.matchEvents) {
                    await window.PlayerStats.recordMatchStatsFromEvents(
                        match.homeTeam.teamId,
                        homeTeamData,
                        {
                            opponentId: match.awayTeam.teamId,
                            opponentName: awayTeamData.teamName,
                            goalsFor: matchResult.homeGoals,
                            goalsAgainst: matchResult.awayGoals,
                            isHome: true,
                            matchType: 'coppa_quasi'
                        },
                        matchResult.matchEvents
                    );
                    await window.PlayerStats.recordMatchStatsFromEvents(
                        match.awayTeam.teamId,
                        awayTeamData,
                        {
                            opponentId: match.homeTeam.teamId,
                            opponentName: homeTeamData.teamName,
                            goalsFor: matchResult.awayGoals,
                            goalsAgainst: matchResult.homeGoals,
                            isHome: false,
                            matchType: 'coppa_quasi'
                        },
                        matchResult.matchEvents
                    );
                }
            } catch (statsError) {
                console.warn('[CoppaQuasi] Errore registrazione stats:', statsError);
            }
        }
    },

    /**
     * Processa EXP giocatori
     */
    async _processPlayerExp(bracket, match, homeTeamData, awayTeamData, matchResult) {
        if (!window.PlayerExp) return;

        const matchEvents = matchResult.matchEvents || [];
        const homePlayerStats = window.PlayerExp.extractPlayerStatsFromEvents?.(matchEvents, homeTeamData, true) || {};
        const awayPlayerStats = window.PlayerExp.extractPlayerStatsFromEvents?.(matchEvents, awayTeamData, false) || {};

        const homeExpResults = window.PlayerExp.processMatchExp(homeTeamData, {
            homeGoals: matchResult.homeGoals,
            awayGoals: matchResult.awayGoals,
            isHome: true,
            playerStats: homePlayerStats
        });
        const awayExpResults = window.PlayerExp.processMatchExp(awayTeamData, {
            homeGoals: matchResult.homeGoals,
            awayGoals: matchResult.awayGoals,
            isHome: false,
            playerStats: awayPlayerStats
        });

        if (homeExpResults.length > 0) {
            await window.PlayerExp.saveExpToFirestore(match.homeTeam.teamId, homeExpResults);
        }
        if (awayExpResults.length > 0) {
            await window.PlayerExp.saveExpToFirestore(match.awayTeam.teamId, awayExpResults);
        }

        if (window.PlayerExpUI) {
            const allLevelUps = [...homeExpResults, ...awayExpResults].filter(r => r.leveledUp);
            if (allLevelUps.length > 0) {
                window.PlayerExpUI.showMultipleLevelUpModal(allLevelUps);
            }
        }
    },

    /**
     * Salva partita nello storico
     */
    async _saveMatchHistory(bracket, match, homeTeamData, awayTeamData, matchResult) {
        if (!window.MatchHistory) return;

        const [homeGoals, awayGoals] = match.result.split('-').map(Number);

        const matchDetails = {
            highlights: matchResult.highlightsText || null,
            matchLog: matchResult.highlights || [],
            matchEvents: matchResult.matchEvents || [],
            scorers: matchResult.scorers || [],
            assists: matchResult.assists || []
        };

        await window.MatchHistory.saveMatch(match.homeTeam.teamId, {
            type: 'coppa_quasi',
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

        await window.MatchHistory.saveMatch(match.awayTeam.teamId, {
            type: 'coppa_quasi',
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

        // Dispatch evento matchSimulated
        document.dispatchEvent(new CustomEvent('matchSimulated', {
            detail: {
                homeTeam: { id: match.homeTeam.teamId, name: match.homeTeam.teamName },
                awayTeam: { id: match.awayTeam.teamId, name: match.awayTeam.teamName },
                result: match.result,
                type: 'Coppa Quasi SeriA'
            }
        }));
    },

    /**
     * Finalizza il torneo quando tutte le partite sono complete
     */
    async _finalizeTournament(bracket) {
        // Il primo in classifica vince
        const winner = bracket.standings[0];

        bracket.winner = {
            teamId: winner.teamId,
            teamName: winner.teamName
        };
        bracket.isCompleted = true;
        bracket.completionDate = new Date().toISOString();

        // Applica premio
        await this.applyReward(winner.teamId);

        // Resetta forma giocatori di tutti i partecipanti
        const teamIds = bracket.participants.map(p => p.teamId);
        await window.CoppaMain?.resetPlayersForm(teamIds);

        console.log(`Coppa Quasi SeriA completata! Vincitore: ${winner.teamName}`);

        if (window.Toast) {
            window.Toast.success(`Coppa Quasi SeriA vinta da ${winner.teamName}!`);
        }
    },

    /**
     * Simula tutte le partite rimanenti
     */
    async simulateAllMatches() {
        const bracket = await this.loadCoppaQuasi();
        if (!bracket) {
            throw new Error('Nessuna Coppa Quasi in programma.');
        }

        if (bracket.isCompleted) {
            throw new Error('La Coppa Quasi e gia stata completata.');
        }

        // Simula le partite non ancora giocate
        for (let i = 0; i < bracket.matches.length; i++) {
            if (!bracket.matches[i].isCompleted) {
                await this.simulateMatch(i);
                // Ricarica bracket aggiornato
                const updatedBracket = await this.loadCoppaQuasi();
                if (updatedBracket.isCompleted) break;
            }
        }

        return await this.loadCoppaQuasi();
    },

    /**
     * Applica il premio CSS e il trofeo al vincitore
     */
    async applyReward(teamId) {
        const { appId, doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;

        const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        const teamDoc = await getDoc(teamRef);

        if (teamDoc.exists()) {
            const teamData = teamDoc.data();
            const currentCSS = teamData.creditiSuperSeri || 0;
            const currentTrophies = teamData.coppeQuasiSerieVinte || 0;

            await updateDoc(teamRef, {
                creditiSuperSeri: currentCSS + this.REWARD_CSS,
                coppeQuasiSerieVinte: currentTrophies + 1
            });
            console.log(`Premio Coppa Quasi (${this.REWARD_CSS} CSS) e trofeo assegnati (totale coppe quasi: ${currentTrophies + 1}).`);
        }
    },

    /**
     * Salva la Coppa Quasi su Firestore
     */
    async saveCoppaQuasi(bracket) {
        const { appId, doc, setDoc } = window.firestoreTools;
        const db = window.db;

        const coppaQuasiRef = doc(db, `artifacts/${appId}/public/data/schedule`, this.COPPA_QUASI_DOC_ID);
        await setDoc(coppaQuasiRef, bracket);
    },

    /**
     * Carica la Coppa Quasi da Firestore
     */
    async loadCoppaQuasi() {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        const coppaQuasiRef = doc(db, `artifacts/${appId}/public/data/schedule`, this.COPPA_QUASI_DOC_ID);
        const coppaQuasiDoc = await getDoc(coppaQuasiRef);

        return coppaQuasiDoc.exists() ? coppaQuasiDoc.data() : null;
    },

    /**
     * Elimina la Coppa Quasi
     */
    async deleteCoppaQuasi() {
        const { appId, doc, deleteDoc } = window.firestoreTools;
        const db = window.db;

        const coppaQuasiRef = doc(db, `artifacts/${appId}/public/data/schedule`, this.COPPA_QUASI_DOC_ID);
        await deleteDoc(coppaQuasiRef);
    },

    /**
     * Renderizza l'UI della Coppa Quasi (Admin)
     */
    renderAdminUI(container) {
        // Usa CoppaQuasiUI se disponibile
        if (window.CoppaQuasiUI?.renderAdminUI) {
            window.CoppaQuasiUI.renderAdminUI(container);
            return;
        }

        // Fallback UI base
        this._renderBasicAdminUI(container);
    },

    /**
     * UI Admin di base (fallback)
     */
    _renderBasicAdminUI(container) {
        this.loadCoppaQuasi().then(bracket => {
            if (!bracket) {
                this.canCreateCoppaQuasi().then(status => {
                    container.innerHTML = `
                        <div class="bg-gradient-to-r from-amber-900 to-orange-900 rounded-lg border-2 border-amber-500 p-4">
                            <h3 class="text-2xl font-bold text-amber-400 mb-4 text-center border-b border-amber-600 pb-2">
                                Coppa Quasi SeriA - Pannello Admin
                            </h3>
                            ${status.canCreate ? `
                                <div class="text-center p-4 bg-black bg-opacity-30 rounded-lg mb-4">
                                    <p class="text-gray-300 mb-3">La Coppa Quasi e pronta per essere creata!</p>
                                    <p class="text-amber-400 text-sm">Torneo triangolare tra le ultime 3 classificate</p>
                                </div>
                                <button id="btn-create-coppa-quasi" class="w-full bg-amber-600 hover:bg-amber-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl transition">
                                    Crea Coppa Quasi SeriA
                                </button>
                            ` : `
                                <div class="text-center p-4 bg-red-900 bg-opacity-50 rounded-lg">
                                    <p class="text-red-400 font-bold">${status.reason}</p>
                                </div>
                            `}
                        </div>
                    `;

                    const createBtn = document.getElementById('btn-create-coppa-quasi');
                    if (createBtn) {
                        createBtn.addEventListener('click', async () => {
                            createBtn.disabled = true;
                            createBtn.innerHTML = '<span class="animate-pulse">Creazione in corso...</span>';
                            try {
                                await this.createCoppaQuasi();
                                this._renderBasicAdminUI(container);
                            } catch (error) {
                                alert('Errore: ' + error.message);
                                createBtn.disabled = false;
                                createBtn.textContent = 'Crea Coppa Quasi SeriA';
                            }
                        });
                    }
                });
            } else {
                this._renderBracketUI(container, bracket);
            }
        }).catch(error => {
            console.error('[CoppaQuasi] Errore caricamento:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore: ${error.message}</p>`;
        });
    },

    /**
     * Renderizza il bracket della Coppa Quasi
     */
    _renderBracketUI(container, bracket) {
        const isCompleted = bracket.isCompleted;
        const matchesHTML = bracket.matches.map((m, i) => `
            <div class="p-3 bg-black bg-opacity-30 rounded-lg ${m.isCompleted ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-600'}">
                <div class="flex justify-between items-center">
                    <span class="text-white font-bold">${m.homeTeam.teamName}</span>
                    <span class="text-amber-400 font-bold px-3">${m.result || 'vs'}</span>
                    <span class="text-white font-bold">${m.awayTeam.teamName}</span>
                </div>
                ${!m.isCompleted && !isCompleted ? `
                    <button class="btn-simulate-match mt-2 w-full bg-amber-600 hover:bg-amber-500 text-gray-900 font-bold py-1 rounded text-sm" data-index="${i}">
                        Simula Partita ${i + 1}
                    </button>
                ` : ''}
            </div>
        `).join('');

        const standingsHTML = bracket.standings.map((p, i) => `
            <tr class="${i === 0 && isCompleted ? 'bg-green-900 bg-opacity-50' : ''}">
                <td class="px-2 py-1 text-center">${i + 1}</td>
                <td class="px-2 py-1">${p.teamName}</td>
                <td class="px-2 py-1 text-center">${p.played}</td>
                <td class="px-2 py-1 text-center font-bold text-amber-400">${p.points}</td>
                <td class="px-2 py-1 text-center">${p.goalsFor}-${p.goalsAgainst}</td>
                <td class="px-2 py-1 text-center">${p.goalsDiff >= 0 ? '+' : ''}${p.goalsDiff}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="bg-gradient-to-r from-amber-900 to-orange-900 rounded-lg border-2 border-amber-500 p-4">
                <h3 class="text-2xl font-bold text-amber-400 mb-4 text-center border-b border-amber-600 pb-2">
                    Coppa Quasi SeriA - ${isCompleted ? 'COMPLETATA' : 'IN CORSO'}
                </h3>

                ${bracket.winner ? `
                    <div class="mb-4 p-3 bg-green-900 bg-opacity-50 rounded-lg text-center">
                        <p class="text-green-400 font-extrabold text-lg">
                            VINCITORE: ${bracket.winner.teamName}
                        </p>
                        <p class="text-green-300 text-sm">Premio: ${this.REWARD_CSS} CSS + Trofeo</p>
                    </div>
                ` : ''}

                <!-- Classifica -->
                <div class="mb-4">
                    <h4 class="text-amber-300 font-bold mb-2">Classifica Triangolare</h4>
                    <table class="w-full text-sm text-white">
                        <thead class="bg-amber-800 bg-opacity-50">
                            <tr>
                                <th class="px-2 py-1">#</th>
                                <th class="px-2 py-1 text-left">Squadra</th>
                                <th class="px-2 py-1">G</th>
                                <th class="px-2 py-1">Pt</th>
                                <th class="px-2 py-1">Gol</th>
                                <th class="px-2 py-1">+/-</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${standingsHTML}
                        </tbody>
                    </table>
                </div>

                <!-- Partite -->
                <div class="space-y-2 mb-4">
                    <h4 class="text-amber-300 font-bold">Partite</h4>
                    ${matchesHTML}
                </div>

                <!-- Bottoni -->
                <div class="space-y-2">
                    ${!isCompleted ? `
                        <button id="btn-simulate-all-coppa-quasi" class="w-full bg-amber-600 hover:bg-amber-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl transition">
                            Simula Tutte le Partite
                        </button>
                    ` : `
                        <button id="btn-delete-coppa-quasi" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg">
                            Elimina Coppa Quasi
                        </button>
                    `}
                </div>
            </div>
        `;

        // Event listeners
        const simulateAllBtn = document.getElementById('btn-simulate-all-coppa-quasi');
        if (simulateAllBtn) {
            simulateAllBtn.addEventListener('click', async () => {
                simulateAllBtn.disabled = true;
                simulateAllBtn.innerHTML = '<span class="animate-pulse">Simulazione in corso...</span>';
                try {
                    const result = await this.simulateAllMatches();
                    alert(`Coppa Quasi completata!\n\nVincitore: ${result.winner.teamName}\nPremio: ${this.REWARD_CSS} CSS + Trofeo`);
                    this._renderBasicAdminUI(container);
                } catch (error) {
                    alert('Errore: ' + error.message);
                    simulateAllBtn.disabled = false;
                    simulateAllBtn.textContent = 'Simula Tutte le Partite';
                }
            });
        }

        const deleteBtn = document.getElementById('btn-delete-coppa-quasi');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Eliminare la Coppa Quasi SeriA?')) {
                    try {
                        await this.deleteCoppaQuasi();
                        this._renderBasicAdminUI(container);
                    } catch (error) {
                        alert('Errore: ' + error.message);
                    }
                }
            });
        }

        // Bottoni singole partite
        document.querySelectorAll('.btn-simulate-match').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.target.dataset.index);
                btn.disabled = true;
                btn.innerHTML = '<span class="animate-pulse">Simulazione...</span>';
                try {
                    await this.simulateMatch(index);
                    this._renderBasicAdminUI(container);
                } catch (error) {
                    alert('Errore: ' + error.message);
                    btn.disabled = false;
                    btn.textContent = `Simula Partita ${index + 1}`;
                }
            });
        });
    },

    /**
     * Renderizza l'UI della Coppa Quasi (Utente)
     */
    async renderUserUI(teamId, container) {
        // Usa CoppaQuasiUI se disponibile
        if (window.CoppaQuasiUI?.renderUserUI) {
            await window.CoppaQuasiUI.renderUserUI(teamId, container);
            return;
        }

        // Fallback UI base
        const bracket = await this.loadCoppaQuasi();

        if (!bracket) {
            container.innerHTML = `
                <div class="p-4 bg-gray-800 rounded-lg">
                    <p class="text-gray-400 text-center">Nessuna Coppa Quasi SeriA in programma.</p>
                </div>
            `;
            return;
        }

        const isParticipant = bracket.participants.some(p => p.teamId === teamId);

        container.innerHTML = `
            <div class="p-4 bg-gray-800 rounded-lg border ${isParticipant ? 'border-amber-500' : 'border-gray-600'}">
                <h3 class="text-xl font-bold text-amber-400 mb-3">Coppa Quasi SeriA</h3>
                ${isParticipant ? `<p class="text-green-400 mb-2">La tua squadra partecipa!</p>` : ''}

                <!-- Classifica -->
                <div class="mb-3">
                    ${bracket.standings.map((p, i) => `
                        <div class="flex justify-between items-center py-1 ${p.teamId === teamId ? 'text-amber-400' : 'text-white'}">
                            <span>${i + 1}. ${p.teamName}</span>
                            <span class="font-bold">${p.points} pt</span>
                        </div>
                    `).join('')}
                </div>

                ${bracket.winner ? `
                    <p class="text-center text-green-400 font-bold">
                        Vincitore: ${bracket.winner.teamName}
                    </p>
                ` : `
                    <p class="text-center text-gray-400 text-sm">Torneo in corso</p>
                `}
            </div>
        `;
    }
};

console.log("Modulo Coppa Quasi SeriA caricato.");
