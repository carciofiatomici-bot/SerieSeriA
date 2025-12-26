//
// ====================================================================
// PRIVATE-LEAGUES.JS - Sistema Leghe Private (3-6 Squadre)
// ====================================================================
//

window.PrivateLeagues = {
    MIN_TEAMS: 3,
    MAX_TEAMS: 6,
    MAX_ENTRY_FEE: 500,
    SIMULATION_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 ore in millisecondi

    // ================================================================
    // LIMITE: 1 LEGA PER VOLTA (nessun cooldown temporale)
    // ================================================================

    /**
     * Verifica se la squadra e' gia in una lega
     * (Non c'e piu cooldown temporale, solo limite di 1 lega per volta)
     */
    async isTeamInCooldown(teamId) {
        // Nessun cooldown temporale - restituisce sempre false
        // Il controllo "sei gia in una lega" viene fatto in createLeague/joinLeague
        return { inCooldown: false };
    },

    // Distribuzione premi per numero di squadre
    PRIZE_DISTRIBUTIONS: {
        3: [0.50, 0.35, 0.15],                    // 3 squadre
        4: [0.40, 0.30, 0.20, 0.10],              // 4 squadre
        5: [0.35, 0.25, 0.20, 0.12, 0.08],        // 5 squadre
        6: [0.30, 0.25, 0.18, 0.12, 0.10, 0.05]   // 6 squadre
    },

    // Bonus CS per il vincitore (oltre alla distribuzione premi)
    WINNER_BONUS_CS: 50,

    // ================================================================
    // CRUD OPERATIONS
    // ================================================================

    /**
     * Crea una nuova lega privata
     * @param {string} name - Nome della lega
     * @param {string} creatorTeamId - ID della squadra creatrice
     * @param {string} creatorTeamName - Nome della squadra creatrice
     * @param {number} entryFee - Costo d'ingresso (0-500 CS)
     * @param {number} maxTeams - Numero squadre (3-6)
     * @returns {Object} { success, leagueId, inviteCode, error }
     */
    async createLeague(name, creatorTeamId, creatorTeamName, entryFee = 0, maxTeams = 4) {
        try {
            const { doc, setDoc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            // Validazione
            if (!name || name.trim().length < 3) {
                return { success: false, error: 'Nome lega troppo corto (min 3 caratteri)' };
            }

            entryFee = Math.max(0, Math.min(this.MAX_ENTRY_FEE, parseInt(entryFee) || 0));
            maxTeams = Math.max(this.MIN_TEAMS, Math.min(this.MAX_TEAMS, parseInt(maxTeams) || 4));

            // Verifica che la squadra non sia gia in una lega
            const teamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams`, creatorTeamId));
            if (!teamDoc.exists()) {
                return { success: false, error: 'Squadra non trovata' };
            }

            const teamData = teamDoc.data();
            if (teamData.privateLeagueId) {
                return { success: false, error: 'Sei gia in una lega privata' };
            }

            // Verifica CS (budget) sufficienti per pagare la fee
            if (entryFee > 0) {
                const currentCS = teamData.budget || 0;
                if (currentCS < entryFee) {
                    return { success: false, error: `CS insufficienti. Hai ${currentCS}, servono ${entryFee}` };
                }
            }

            // Genera ID e codice invito
            const leagueId = this.generateLeagueId();
            const inviteCode = this.generateInviteCode();

            // Crea documento lega
            const leagueData = {
                leagueId,
                inviteCode,
                name: name.trim(),
                createdAt: new Date().toISOString(),
                createdBy: creatorTeamId,
                entryFee,
                prizePool: entryFee * maxTeams,
                prizesDistributed: false,
                teams: [{
                    teamId: creatorTeamId,
                    teamName: creatorTeamName,
                    joinedAt: new Date().toISOString(),
                    feePaid: entryFee > 0
                }],
                maxTeams: maxTeams,
                status: 'waiting',
                schedule: [],
                standings: [],
                winner: null,
                currentRound: 0,
                lastSimulationTime: null
            };

            const leaguePath = `artifacts/${appId}/public/data/privateLeagues/${leagueId}`;
            await setDoc(doc(db, leaguePath), leagueData);

            // Aggiorna squadra con riferimento alla lega e scala CS (budget)
            const teamUpdate = { privateLeagueId: leagueId };
            if (entryFee > 0) {
                teamUpdate.budget = (teamData.budget || 0) - entryFee;
            }
            await updateDoc(doc(db, `artifacts/${appId}/public/data/teams`, creatorTeamId), teamUpdate);

            console.log(`PrivateLeagues: Lega "${name}" creata con codice ${inviteCode} (${maxTeams} squadre)`);
            return { success: true, leagueId, inviteCode };

        } catch (error) {
            console.error('Errore creazione lega:', error);
            return { success: false, error: 'Errore durante la creazione della lega' };
        }
    },

    /**
     * Unisciti a una lega esistente tramite codice invito
     */
    async joinLeague(inviteCode, teamId, teamName) {
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            // Trova lega con questo codice
            const league = await this.getLeagueByInviteCode(inviteCode);
            if (!league) {
                return { success: false, error: 'Codice invito non valido' };
            }

            // Verifica stato lega
            if (league.status !== 'waiting') {
                return { success: false, error: 'La lega e gia iniziata o completata' };
            }

            // Verifica posti disponibili
            if (league.teams.length >= league.maxTeams) {
                return { success: false, error: 'La lega e al completo' };
            }

            // Verifica che la squadra non sia gia in una lega
            const teamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId));
            if (!teamDoc.exists()) {
                return { success: false, error: 'Squadra non trovata' };
            }

            const teamData = teamDoc.data();
            if (teamData.privateLeagueId) {
                return { success: false, error: 'Sei gia in una lega privata' };
            }

            // Verifica che non sia gia nella lega
            if (league.teams.some(t => t.teamId === teamId)) {
                return { success: false, error: 'Sei gia iscritto a questa lega' };
            }

            // Verifica CS (budget) sufficienti per la fee
            if (league.entryFee > 0) {
                const currentCS = teamData.budget || 0;
                if (currentCS < league.entryFee) {
                    return { success: false, error: `CS insufficienti. Hai ${currentCS}, servono ${league.entryFee}` };
                }
            }

            // Aggiungi squadra alla lega
            const updatedTeams = [...league.teams, {
                teamId,
                teamName,
                joinedAt: new Date().toISOString(),
                feePaid: league.entryFee > 0
            }];

            const leaguePath = `artifacts/${appId}/public/data/privateLeagues/${league.leagueId}`;

            // Se la lega e' completa, avviala automaticamente
            const isComplete = updatedTeams.length >= league.maxTeams;
            const updateData = { teams: updatedTeams };

            if (isComplete) {
                // Genera calendario e classifica
                const schedule = this.generateSchedule(updatedTeams, league.maxTeams);
                const standings = updatedTeams.map(t => ({
                    teamId: t.teamId,
                    teamName: t.teamName,
                    points: 0,
                    played: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goalsFor: 0,
                    goalsAgainst: 0
                }));

                updateData.status = 'in_progress';
                updateData.schedule = schedule;
                updateData.standings = standings;
                updateData.currentRound = 1;
                updateData.lastSimulationTime = null; // Prima simulazione dopo 48h
                updateData.leagueStartedAt = new Date().toISOString();
            }

            await updateDoc(doc(db, leaguePath), updateData);

            // Aggiorna squadra con riferimento alla lega e scala CS (budget)
            const teamUpdate = { privateLeagueId: league.leagueId };
            if (league.entryFee > 0) {
                teamUpdate.budget = (teamData.budget || 0) - league.entryFee;
            }
            await updateDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId), teamUpdate);

            console.log(`PrivateLeagues: ${teamName} si e unito alla lega "${league.name}"${isComplete ? ' - Lega avviata!' : ''}`);
            return { success: true, leagueId: league.leagueId, leagueStarted: isComplete };

        } catch (error) {
            console.error('Errore iscrizione lega:', error);
            return { success: false, error: 'Errore durante l\'iscrizione alla lega' };
        }
    },

    /**
     * Abbandona la lega (i CS vengono rimborsati se status=waiting)
     */
    async leaveLeague(teamId) {
        try {
            const { doc, getDoc, updateDoc, deleteDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            // Trova la lega della squadra
            const league = await this.getTeamLeague(teamId);
            if (!league) {
                return { success: false, error: 'Non sei in nessuna lega' };
            }

            // Non si puo abbandonare una lega in corso
            if (league.status === 'in_progress') {
                return { success: false, error: 'Non puoi abbandonare una lega in corso' };
            }

            // Rimuovi squadra dalla lega
            const updatedTeams = league.teams.filter(t => t.teamId !== teamId);
            const leaguePath = `artifacts/${appId}/public/data/privateLeagues/${league.leagueId}`;

            if (updatedTeams.length === 0) {
                // Se era l'ultimo, elimina la lega
                await deleteDoc(doc(db, leaguePath));
                console.log(`PrivateLeagues: Lega "${league.name}" eliminata (vuota)`);
            } else {
                // Se il creatore abbandona, passa al primo rimasto
                let newCreator = league.createdBy;
                if (league.createdBy === teamId && updatedTeams.length > 0) {
                    newCreator = updatedTeams[0].teamId;
                }
                await updateDoc(doc(db, leaguePath), {
                    teams: updatedTeams,
                    createdBy: newCreator
                });
            }

            // Rimuovi riferimento dalla squadra
            const teamUpdate = { privateLeagueId: null };

            // Rimborso 100% se la lega e ancora in attesa (non partita)
            if (league.status === 'waiting' && league.entryFee > 0) {
                const teamEntry = league.teams.find(t => t.teamId === teamId);
                if (teamEntry && teamEntry.feePaid) {
                    const teamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId));
                    if (teamDoc.exists()) {
                        const currentBudget = teamDoc.data().budget || 0;
                        teamUpdate.budget = currentBudget + league.entryFee;
                        console.log(`PrivateLeagues: Rimborso ${league.entryFee} CS a ${teamId}`);
                    }
                }
            }

            // Nessun cooldown - puoi iniziare subito una nuova lega

            await updateDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId), teamUpdate);

            console.log(`PrivateLeagues: Squadra ${teamId} ha abbandonato la lega "${league.name}"`);
            return { success: true };

        } catch (error) {
            console.error('Errore abbandono lega:', error);
            return { success: false, error: 'Errore durante l\'abbandono della lega' };
        }
    },

    // ================================================================
    // QUERY FUNCTIONS
    // ================================================================

    async getLeagueById(leagueId) {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const leaguePath = `artifacts/${appId}/public/data/privateLeagues/${leagueId}`;
            const leagueDoc = await getDoc(doc(db, leaguePath));

            if (leagueDoc.exists()) {
                return leagueDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Errore recupero lega:', error);
            return null;
        }
    },

    async getLeagueByInviteCode(code) {
        try {
            const { collection, query, where, getDocs } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const leaguesRef = collection(db, `artifacts/${appId}/public/data/privateLeagues`);
            const q = query(leaguesRef, where('inviteCode', '==', code.toUpperCase()));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                return snapshot.docs[0].data();
            }
            return null;
        } catch (error) {
            console.error('Errore ricerca lega:', error);
            return null;
        }
    },

    async getTeamLeague(teamId) {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const teamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId));
            if (!teamDoc.exists()) return null;

            const teamData = teamDoc.data();
            if (!teamData.privateLeagueId) return null;

            return await this.getLeagueById(teamData.privateLeagueId);
        } catch (error) {
            console.error('Errore recupero lega squadra:', error);
            return null;
        }
    },

    // ================================================================
    // SCHEDULE GENERATION (3-6 teams)
    // ================================================================

    /**
     * Genera calendario round-robin per N squadre
     * @param {Array} teams - Array di squadre
     * @param {number} numTeams - Numero totale squadre
     */
    generateSchedule(teams, numTeams) {
        // Per numero dispari, aggiungi BYE
        let teamsList = teams.map(t => ({ teamId: t.teamId, teamName: t.teamName }));
        const hasGhost = numTeams % 2 !== 0;

        if (hasGhost) {
            teamsList.push({ teamId: 'BYE', teamName: 'Riposo' });
        }

        const n = teamsList.length;
        const totalRoundsAndata = n - 1;
        const schedule = [];

        // Genera andata con algoritmo round-robin
        for (let round = 0; round < totalRoundsAndata; round++) {
            const matches = [];

            for (let i = 0; i < n / 2; i++) {
                const home = teamsList[i];
                const away = teamsList[n - 1 - i];

                // Salta le partite con BYE
                if (home.teamId !== 'BYE' && away.teamId !== 'BYE') {
                    matches.push({
                        homeId: home.teamId,
                        awayId: away.teamId,
                        homeName: home.teamName,
                        awayName: away.teamName,
                        result: null
                    });
                }
            }

            schedule.push({
                round: round + 1,
                type: 'Andata',
                matches
            });

            // Rotazione: primo elemento fisso, ruota gli altri
            const first = teamsList[0];
            const rotated = [first];
            rotated.push(teamsList[n - 1]);
            for (let i = 1; i < n - 1; i++) {
                rotated.push(teamsList[i]);
            }
            teamsList = rotated;
        }

        // Genera ritorno (inverti casa/trasferta)
        for (let i = 0; i < totalRoundsAndata; i++) {
            const andataRound = schedule[i];
            schedule.push({
                round: totalRoundsAndata + i + 1,
                type: 'Ritorno',
                matches: andataRound.matches.map(m => ({
                    homeId: m.awayId,
                    awayId: m.homeId,
                    homeName: m.awayName,
                    awayName: m.homeName,
                    result: null
                }))
            });
        }

        return schedule;
    },

    // ================================================================
    // AUTO-SIMULATION (ogni 48H)
    // ================================================================

    /**
     * Controlla se e' il momento di simulare la prossima giornata
     */
    canSimulateNow(league) {
        if (league.status !== 'in_progress') return false;

        const currentRound = league.currentRound || 1;
        const totalRounds = league.schedule.length;

        // Lega gia completata
        if (currentRound > totalRounds) return false;

        // Prima simulazione: 48h dopo l'inizio della lega
        if (!league.lastSimulationTime) {
            const startTime = new Date(league.leagueStartedAt || league.createdAt).getTime();
            const now = Date.now();
            return (now - startTime) >= this.SIMULATION_COOLDOWN_MS;
        }

        // Simulazioni successive: 48h dopo l'ultima
        const lastSim = new Date(league.lastSimulationTime).getTime();
        const now = Date.now();
        return (now - lastSim) >= this.SIMULATION_COOLDOWN_MS;
    },

    /**
     * Calcola il tempo rimanente alla prossima simulazione
     */
    getTimeUntilNextSimulation(league) {
        if (league.status !== 'in_progress') return null;

        const currentRound = league.currentRound || 1;
        const totalRounds = league.schedule.length;
        if (currentRound > totalRounds) return null;

        let referenceTime;
        if (!league.lastSimulationTime) {
            referenceTime = new Date(league.leagueStartedAt || league.createdAt).getTime();
        } else {
            referenceTime = new Date(league.lastSimulationTime).getTime();
        }

        const nextSimTime = referenceTime + this.SIMULATION_COOLDOWN_MS;
        const remaining = nextSimTime - Date.now();

        return Math.max(0, remaining);
    },

    /**
     * Formatta il tempo rimanente in ore:minuti
     */
    formatTimeRemaining(ms) {
        if (ms <= 0) return 'Pronta!';

        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    },

    /**
     * Controlla e simula automaticamente se necessario
     */
    async checkAndAutoSimulate(leagueId) {
        try {
            const league = await this.getLeagueById(leagueId);
            if (!league) return { simulated: false };

            if (!this.canSimulateNow(league)) {
                return { simulated: false, timeRemaining: this.getTimeUntilNextSimulation(league) };
            }

            // Simula la giornata
            const result = await this.simulateRound(leagueId);
            return { simulated: true, ...result };

        } catch (error) {
            console.error('Errore auto-simulazione:', error);
            return { simulated: false, error: error.message };
        }
    },

    /**
     * Simula una giornata (chiamata automaticamente o manualmente)
     */
    async simulateRound(leagueId) {
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const league = await this.getLeagueById(leagueId);
            if (!league) {
                return { success: false, error: 'Lega non trovata' };
            }

            if (league.status !== 'in_progress') {
                return { success: false, error: 'La lega non e in corso' };
            }

            // Trova la prossima giornata da simulare
            const currentRound = league.currentRound || 1;
            const roundData = league.schedule.find(r => r.round === currentRound);

            if (!roundData) {
                return { success: false, error: 'Giornata non trovata' };
            }

            // Verifica che non sia gia simulata
            if (roundData.matches.every(m => m.result !== null)) {
                return { success: false, error: 'Giornata gia simulata' };
            }

            // Simula tutte le partite della giornata
            const results = [];
            for (let i = 0; i < roundData.matches.length; i++) {
                const match = roundData.matches[i];
                if (match.result !== null) continue;

                // Recupera dati squadre
                const homeTeamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams`, match.homeId));
                const awayTeamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams`, match.awayId));

                if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) {
                    console.error(`PrivateLeagues: Squadra non trovata per partita ${match.homeName} vs ${match.awayName}`);
                    continue;
                }

                const homeTeamData = homeTeamDoc.data();
                const awayTeamData = awayTeamDoc.data();

                // Usa il motore di simulazione esistente
                const simResult = window.ChampionshipSimulation.runSimulation(homeTeamData, awayTeamData);

                // Aggiorna risultato nella partita
                match.result = {
                    homeGoals: simResult.homeGoals,
                    awayGoals: simResult.awayGoals
                };

                results.push({
                    homeName: match.homeName,
                    awayName: match.awayName,
                    homeGoals: simResult.homeGoals,
                    awayGoals: simResult.awayGoals
                });

                // Aggiorna classifica
                this.updateStandings(league.standings, match.homeId, match.awayId, simResult.homeGoals, simResult.awayGoals);
            }

            // Determina se la lega e terminata
            const totalRounds = league.schedule.length;
            const isCompleted = currentRound >= totalRounds;

            // Prepara aggiornamento
            const updateData = {
                schedule: league.schedule,
                standings: league.standings,
                currentRound: isCompleted ? currentRound : currentRound + 1,
                lastSimulationTime: new Date().toISOString()
            };

            if (isCompleted) {
                updateData.status = 'completed';
                // Trova il vincitore
                const sortedStandings = [...league.standings].sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
                });
                updateData.winner = {
                    teamId: sortedStandings[0].teamId,
                    teamName: sortedStandings[0].teamName
                };
            }

            // Salva
            const leaguePath = `artifacts/${appId}/public/data/privateLeagues/${leagueId}`;
            await updateDoc(doc(db, leaguePath), updateData);

            // Se completata, distribuisci premi (anche per lega gratuita: bonus vincitore)
            if (isCompleted) {
                await this.distributePrizes(leagueId);
            }

            console.log(`PrivateLeagues: Giornata ${currentRound} simulata per "${league.name}"`);
            return {
                success: true,
                results,
                currentRound,
                isCompleted,
                winner: updateData.winner || null
            };

        } catch (error) {
            console.error('Errore simulazione giornata:', error);
            return { success: false, error: 'Errore durante la simulazione' };
        }
    },

    /**
     * Aggiorna le statistiche di classifica
     */
    updateStandings(standings, homeId, awayId, homeGoals, awayGoals) {
        const homeTeam = standings.find(s => s.teamId === homeId);
        const awayTeam = standings.find(s => s.teamId === awayId);

        if (!homeTeam || !awayTeam) return;

        homeTeam.played++;
        awayTeam.played++;
        homeTeam.goalsFor += homeGoals;
        homeTeam.goalsAgainst += awayGoals;
        awayTeam.goalsFor += awayGoals;
        awayTeam.goalsAgainst += homeGoals;

        if (homeGoals > awayGoals) {
            homeTeam.points += 3;
            homeTeam.wins++;
            awayTeam.losses++;
        } else if (homeGoals < awayGoals) {
            awayTeam.points += 3;
            awayTeam.wins++;
            homeTeam.losses++;
        } else {
            homeTeam.points += 1;
            awayTeam.points += 1;
            homeTeam.draws++;
            awayTeam.draws++;
        }
    },

    // ================================================================
    // PRIZE DISTRIBUTION
    // ================================================================

    async distributePrizes(leagueId) {
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const league = await this.getLeagueById(leagueId);
            if (!league) {
                console.error('PrivateLeagues: Lega non trovata per distribuzione premi');
                return { success: false };
            }

            if (league.prizesDistributed) {
                console.log('PrivateLeagues: Premi gia distribuiti');
                return { success: true, alreadyDistributed: true };
            }

            // Per leghe gratuite: solo bonus vincitore
            const isFreeLeague = league.entryFee === 0;

            const numTeams = league.maxTeams;
            const prizePool = league.entryFee * numTeams;
            const distribution = this.PRIZE_DISTRIBUTIONS[numTeams] || this.PRIZE_DISTRIBUTIONS[4];

            // Ordina classifica
            const sortedStandings = [...league.standings].sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const diffA = a.goalsFor - a.goalsAgainst;
                const diffB = b.goalsFor - b.goalsAgainst;
                return diffB - diffA;
            });

            // Distribuisci premi
            const prizes = [];

            if (isFreeLeague) {
                // Lega gratuita: solo bonus vincitore
                const winner = sortedStandings[0];
                const winnerBonus = this.WINNER_BONUS_CS;

                await this.addCSToTeam(winner.teamId, winnerBonus);

                prizes.push({
                    position: 1,
                    teamId: winner.teamId,
                    teamName: winner.teamName,
                    prize: winnerBonus,
                    winnerBonus: winnerBonus,
                    netGain: winnerBonus
                });

                console.log(`PrivateLeagues: ${winner.teamName} (vincitore lega gratuita) riceve bonus +${winnerBonus} CS`);

                // Aggiungi altri partecipanti senza premi
                for (let i = 1; i < numTeams; i++) {
                    const team = sortedStandings[i];
                    prizes.push({
                        position: i + 1,
                        teamId: team.teamId,
                        teamName: team.teamName,
                        prize: 0,
                        winnerBonus: 0,
                        netGain: 0
                    });
                }
            } else {
                // Lega a pagamento: distribuzione premi + bonus vincitore
                for (let i = 0; i < numTeams; i++) {
                    let prize = Math.floor(prizePool * distribution[i]);
                    const team = sortedStandings[i];

                    // Bonus extra per il vincitore (1° posto)
                    let winnerBonus = 0;
                    if (i === 0) {
                        winnerBonus = this.WINNER_BONUS_CS;
                        prize += winnerBonus;
                    }

                    await this.addCSToTeam(team.teamId, prize);

                    prizes.push({
                        position: i + 1,
                        teamId: team.teamId,
                        teamName: team.teamName,
                        prize,
                        winnerBonus,
                        netGain: prize - league.entryFee
                    });

                    console.log(`PrivateLeagues: ${team.teamName} (${i+1}) riceve ${prize} CS${winnerBonus > 0 ? ` (include bonus vincitore +${winnerBonus})` : ''} (netto: ${prize - league.entryFee})`);
                }
            }

            // Marca come distribuiti
            const leaguePath = `artifacts/${appId}/public/data/privateLeagues/${leagueId}`;
            await updateDoc(doc(db, leaguePath), {
                prizesDistributed: true,
                prizeResults: prizes
            });

            return { success: true, prizes };

        } catch (error) {
            console.error('Errore distribuzione premi:', error);
            return { success: false, error: error.message };
        }
    },

    async addCSToTeam(teamId, amount) {
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
            const teamDoc = await getDoc(teamRef);

            if (!teamDoc.exists()) {
                console.error(`PrivateLeagues: Squadra ${teamId} non trovata`);
                return false;
            }

            // CS = Crediti Seri = budget
            const currentCS = teamDoc.data().budget || 0;
            await updateDoc(teamRef, {
                budget: currentCS + amount
            });

            return true;
        } catch (error) {
            console.error('Errore aggiunta CS:', error);
            return false;
        }
    },

    // ================================================================
    // UTILITY
    // ================================================================

    generateLeagueId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    generateInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // CS = Crediti Seri = budget
    canAffordEntry(teamBudget, entryFee) {
        return (teamBudget || 0) >= (entryFee || 0);
    },

    // ================================================================
    // SISTEMA INVITI
    // ================================================================

    /**
     * Ottiene la lista delle squadre disponibili per l'invito
     * (non in una lega, non in cooldown, non gia invitate)
     */
    async getAvailableTeamsForInvite(leagueId) {
        try {
            const { collection, getDocs, doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            // Ottieni la lega corrente
            const league = await this.getLeagueById(leagueId);
            if (!league) return [];

            // IDs delle squadre gia nella lega
            const teamsInLeague = league.teams.map(t => t.teamId);

            // Ottieni tutte le squadre
            const teamsRef = collection(db, `artifacts/${appId}/public/data/teams`);
            const snapshot = await getDocs(teamsRef);

            const availableTeams = [];

            for (const teamDoc of snapshot.docs) {
                const teamData = teamDoc.data();
                const teamId = teamDoc.id;

                // Salta se gia nella lega
                if (teamsInLeague.includes(teamId)) continue;

                // Salta se gia in un'altra lega
                if (teamData.privateLeagueId) continue;

                // Salta se in cooldown
                if (teamData.privateLeagueCooldownUntil) {
                    const cooldownDate = new Date(teamData.privateLeagueCooldownUntil);
                    if (new Date() < cooldownDate) continue;
                }

                // Salta se non ha abbastanza budget per la fee
                if (league.entryFee > 0 && (teamData.budget || 0) < league.entryFee) continue;

                availableTeams.push({
                    teamId,
                    teamName: teamData.teamName,
                    budget: teamData.budget || 0
                });
            }

            // Ordina per nome
            availableTeams.sort((a, b) => a.teamName.localeCompare(b.teamName));

            return availableTeams;
        } catch (error) {
            console.error('Errore recupero squadre disponibili:', error);
            return [];
        }
    },

    /**
     * Invia un invito a una squadra
     * @param {string} leagueId - ID della lega
     * @param {string} targetTeamId - ID della squadra da invitare
     * @param {string} senderTeamName - Nome della squadra che invia l'invito
     */
    async sendInvitation(leagueId, targetTeamId, senderTeamName) {
        try {
            const league = await this.getLeagueById(leagueId);
            if (!league) {
                return { success: false, error: 'Lega non trovata' };
            }

            if (league.status !== 'waiting') {
                return { success: false, error: 'La lega e gia iniziata' };
            }

            if (league.teams.length >= league.maxTeams) {
                return { success: false, error: 'La lega e al completo' };
            }

            // Verifica che la squadra target sia disponibile
            const availableTeams = await this.getAvailableTeamsForInvite(leagueId);
            const targetTeam = availableTeams.find(t => t.teamId === targetTeamId);

            if (!targetTeam) {
                return { success: false, error: 'Squadra non disponibile per l\'invito' };
            }

            // Salva l'invito su Firestore per persistenza
            await this.saveInviteToFirestore(leagueId, targetTeamId, league, senderTeamName);

            // Salva la notifica su Firestore per il destinatario (non localmente!)
            await this.saveNotificationToFirestore(targetTeamId, {
                type: 'league_invite',
                title: '👥 Invito Lega Privata',
                message: `${senderTeamName} ti invita a "${league.name}"${league.entryFee > 0 ? ` (${league.entryFee} CS)` : ' (Gratis)'}`,
                leagueId: league.leagueId,
                inviteCode: league.inviteCode,
                leagueName: league.name,
                entryFee: league.entryFee
            });

            console.log(`PrivateLeagues: Invito inviato a ${targetTeam.teamName} per la lega "${league.name}"`);
            return { success: true, teamName: targetTeam.teamName };

        } catch (error) {
            console.error('Errore invio invito:', error);
            return { success: false, error: 'Errore nell\'invio dell\'invito' };
        }
    },

    /**
     * Salva l'invito su Firestore nella squadra target
     */
    async saveInviteToFirestore(leagueId, targetTeamId, league, senderTeamName) {
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, targetTeamId);
            const teamDoc = await getDoc(teamRef);

            if (!teamDoc.exists()) return;

            const teamData = teamDoc.data();
            const pendingInvites = teamData.pendingLeagueInvites || [];

            // Verifica se gia invitato a questa lega
            if (pendingInvites.some(inv => inv.leagueId === leagueId)) {
                return; // Gia invitato
            }

            // Aggiungi invito
            pendingInvites.push({
                leagueId,
                inviteCode: league.inviteCode,
                leagueName: league.name,
                entryFee: league.entryFee,
                senderTeamName,
                sentAt: new Date().toISOString()
            });

            await updateDoc(teamRef, { pendingLeagueInvites: pendingInvites });
        } catch (error) {
            console.error('Errore salvataggio invito:', error);
        }
    },

    /**
     * Salva una notifica su Firestore per il destinatario
     * @param {string} targetTeamId - ID della squadra destinataria
     * @param {Object} notificationData - Dati della notifica
     */
    async saveNotificationToFirestore(targetTeamId, notificationData) {
        try {
            const { doc, setDoc, Timestamp } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
            const notifPath = `artifacts/${appId}/public/data/notifications/${notifId}`;

            await setDoc(doc(db, notifPath), {
                ...notificationData,
                targetTeamId: targetTeamId,
                timestamp: Timestamp.now(),
                read: false
            });

            console.log(`PrivateLeagues: Notifica salvata su Firestore per ${targetTeamId}`);
        } catch (error) {
            console.error('Errore salvataggio notifica su Firestore:', error);
        }
    },

    /**
     * Calcola il guadagno/perdita netta per ogni posizione
     */
    calculateNetGains(entryFee, numTeams = 4) {
        const prizePool = entryFee * numTeams;
        const distribution = this.PRIZE_DISTRIBUTIONS[numTeams] || this.PRIZE_DISTRIBUTIONS[4];

        return distribution.map((pct, i) => {
            let prize = Math.floor(prizePool * pct);
            // Aggiungi bonus vincitore al 1° posto
            if (i === 0) {
                prize += this.WINNER_BONUS_CS;
            }
            return {
                position: i + 1,
                prize: prize,
                netGain: prize - entryFee,
                winnerBonus: i === 0 ? this.WINNER_BONUS_CS : 0
            };
        });
    },

    /**
     * Calcola numero totale giornate per N squadre
     */
    getTotalRounds(numTeams) {
        const n = numTeams % 2 === 0 ? numTeams : numTeams + 1;
        return (n - 1) * 2; // Andata + Ritorno
    },

    /**
     * Modifica il numero massimo di squadre della lega
     * (solo se in stato 'waiting' e solo dal creatore)
     * @param {string} leagueId - ID della lega
     * @param {string} requestingTeamId - ID della squadra che richiede la modifica
     * @param {number} newMaxTeams - Nuovo numero massimo squadre (3-6)
     * @returns {Object} { success, error }
     */
    async updateMaxTeams(leagueId, requestingTeamId, newMaxTeams) {
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            // Recupera la lega
            const league = await this.getLeagueById(leagueId);
            if (!league) {
                return { success: false, error: 'Lega non trovata' };
            }

            // Verifica che sia ancora in attesa
            if (league.status !== 'waiting') {
                return { success: false, error: 'Non puoi modificare una lega gia iniziata' };
            }

            // Verifica che sia il creatore
            if (league.createdBy !== requestingTeamId) {
                return { success: false, error: 'Solo il creatore puo modificare la lega' };
            }

            // Valida newMaxTeams
            newMaxTeams = parseInt(newMaxTeams);
            if (isNaN(newMaxTeams) || newMaxTeams < this.MIN_TEAMS || newMaxTeams > this.MAX_TEAMS) {
                return { success: false, error: `Numero squadre deve essere tra ${this.MIN_TEAMS} e ${this.MAX_TEAMS}` };
            }

            // Non puo essere inferiore al numero attuale di squadre iscritte
            const currentTeamCount = league.teams.length;
            if (newMaxTeams < currentTeamCount) {
                return { success: false, error: `Ci sono gia ${currentTeamCount} squadre iscritte` };
            }

            // Se non cambia, esci
            if (newMaxTeams === league.maxTeams) {
                return { success: true, unchanged: true };
            }

            // Aggiorna la lega
            const leaguePath = `artifacts/${appId}/public/data/privateLeagues/${leagueId}`;
            const updateData = {
                maxTeams: newMaxTeams,
                prizePool: league.entryFee * newMaxTeams // Aggiorna anche il montepremi
            };

            await updateDoc(doc(db, leaguePath), updateData);

            console.log(`PrivateLeagues: maxTeams aggiornato da ${league.maxTeams} a ${newMaxTeams} per "${league.name}"`);
            return { success: true, oldMaxTeams: league.maxTeams, newMaxTeams };

        } catch (error) {
            console.error('Errore aggiornamento maxTeams:', error);
            return { success: false, error: 'Errore durante l\'aggiornamento' };
        }
    }
};

console.log("Modulo PrivateLeagues caricato (3-6 squadre, 1 lega per volta, timer 24H).");
