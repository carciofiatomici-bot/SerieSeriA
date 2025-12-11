//
// ====================================================================
// DRAFT-TURNS.JS - Sistema Draft a Turni
// ====================================================================
//
// Gestisce:
// - Generazione ordine draft (basato su classifica o media rosa)
// - Gestione turni e timeout
// - Passaggio automatico al prossimo utente
//

window.DraftTurns = {

    // Timer per il controllo del timeout
    turnCheckInterval: null,

    /**
     * Genera l'ordine del draft basato sulla classifica o media rosa.
     * Ordine: Ultimo, Primo, Penultimo, Secondo, Terzultimo, Terzo...
     *
     * @param {Object} context - Contesto con db e firestoreTools
     * @returns {Promise<Array>} - Array ordinato di teamId per il turno 1
     */
    async generateDraftOrder(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, collection, getDocs } = firestoreTools;

        try {
            // 1. Carica tutte le squadre
            const teamsCollectionRef = collection(db, paths.TEAMS_COLLECTION_PATH);
            const teamsSnapshot = await getDocs(teamsCollectionRef);

            if (teamsSnapshot.empty) {
                console.log("Nessuna squadra trovata per generare l'ordine draft.");
                return [];
            }

            const teams = [];
            teamsSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                teams.push({
                    id: docSnap.id,
                    name: data.teamName || docSnap.id,
                    players: data.players || []
                });
            });

            // 2. Prova a caricare la classifica
            const leaderboardDocRef = doc(db, paths.LEADERBOARD_COLLECTION_PATH, 'standings');
            const leaderboardDoc = await getDoc(leaderboardDocRef);

            let orderedTeams = [];

            if (leaderboardDoc.exists() && leaderboardDoc.data().standings && leaderboardDoc.data().standings.length > 0) {
                // Usa la classifica esistente
                const standings = leaderboardDoc.data().standings;
                console.log("Generazione ordine draft basata sulla classifica.");

                // Ordina per posizione in classifica (1 = primo, N = ultimo)
                // standings dovrebbe essere gia ordinato, ma verifichiamo
                const standingsMap = {};
                standings.forEach((team, index) => {
                    standingsMap[team.teamId] = index + 1; // posizione 1-based
                });

                // Ordina le squadre per posizione classifica
                orderedTeams = teams
                    .filter(t => standingsMap[t.id] !== undefined)
                    .sort((a, b) => standingsMap[a.id] - standingsMap[b.id]);

                // Aggiungi squadre non in classifica alla fine
                const teamsNotInStandings = teams.filter(t => standingsMap[t.id] === undefined);
                orderedTeams = [...orderedTeams, ...teamsNotInStandings];

            } else {
                // Nessuna classifica: ordina per media livelli rosa
                console.log("Nessuna classifica trovata. Ordine draft basato sulla media rosa.");

                // Calcola media livelli per ogni squadra
                teams.forEach(team => {
                    if (team.players && team.players.length > 0) {
                        const totalLevel = team.players.reduce((sum, p) => sum + (p.level || 1), 0);
                        team.avgLevel = totalLevel / team.players.length;
                    } else {
                        team.avgLevel = 0;
                    }
                });

                // Ordina per media (dalla piu bassa alla piu alta)
                // A parita di media, ordine random
                orderedTeams = teams.sort((a, b) => {
                    if (a.avgLevel === b.avgLevel) {
                        return Math.random() - 0.5; // Random
                    }
                    return a.avgLevel - b.avgLevel; // Crescente
                });
            }

            // 3. Applica ordine "serpentina": Ultimo, Primo, Penultimo, Secondo...
            const serpentineOrder = this.createSerpentineOrder(orderedTeams);

            console.log("Ordine draft generato:", serpentineOrder.map(t => t.name || t.id));

            return serpentineOrder;

        } catch (error) {
            console.error("Errore nella generazione dell'ordine draft:", error);
            return [];
        }
    },

    /**
     * Crea l'ordine serpentina: Ultimo, Primo, Penultimo, Secondo...
     * @param {Array} teams - Array di squadre ordinate per classifica/media
     * @returns {Array} - Array con ordine serpentina
     */
    createSerpentineOrder(teams) {
        if (teams.length === 0) return [];

        const result = [];
        let left = 0;
        let right = teams.length - 1;
        let takeFromEnd = true; // Inizia dall'ultimo

        while (left <= right) {
            if (takeFromEnd) {
                result.push(teams[right]);
                right--;
            } else {
                result.push(teams[left]);
                left++;
            }
            takeFromEnd = !takeFromEnd;
        }

        return result;
    },

    /**
     * Avvia il sistema di draft a turni.
     * Salva la lista e lo stato del draft in Firestore.
     *
     * @param {Object} context - Contesto con db e firestoreTools
     */
    async startDraftTurns(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, setDoc } = firestoreTools;
        const { CONFIG_DOC_ID, DRAFT_TOTAL_ROUNDS } = window.DraftConstants;

        try {
            // Genera l'ordine del draft
            const draftOrder = await this.generateDraftOrder(context);

            if (draftOrder.length === 0) {
                throw new Error("Nessuna squadra disponibile per il draft.");
            }

            // Prepara la lista per entrambi i turni
            const round1Order = draftOrder.map(t => ({
                teamId: t.id,
                teamName: t.name,
                hasDrafted: false,
                attempts: 0
            }));

            // Round 2: ordine inverso
            const round2Order = [...round1Order].reverse().map(t => ({
                ...t,
                hasDrafted: false,
                attempts: 0
            }));

            const draftTurnsData = {
                isActive: true,
                currentRound: 1,
                totalRounds: DRAFT_TOTAL_ROUNDS,
                currentTurnIndex: 0,
                currentTeamId: round1Order[0].teamId,
                turnStartTime: Date.now(),
                round1Order: round1Order,
                round2Order: round2Order,
                startedAt: new Date().toISOString()
            };

            // Salva in Firestore
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            await setDoc(configDocRef, {
                isDraftOpen: true,
                draftTurns: draftTurnsData
            }, { merge: true });

            console.log("Draft a turni avviato con successo!");
            return { success: true, data: draftTurnsData };

        } catch (error) {
            console.error("Errore nell'avvio del draft a turni:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Ferma il draft a turni.
     * @param {Object} context - Contesto con db e firestoreTools
     */
    async stopDraftTurns(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, setDoc } = firestoreTools;
        const { CONFIG_DOC_ID } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            await setDoc(configDocRef, {
                isDraftOpen: false,
                draftTurns: {
                    isActive: false,
                    stoppedAt: new Date().toISOString()
                }
            }, { merge: true });

            // Ferma il timer di controllo
            this.stopTurnCheck();

            console.log("Draft a turni fermato.");
            return { success: true };

        } catch (error) {
            console.error("Errore nel fermare il draft:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Passa al prossimo turno dopo che un utente ha draftato o e' scaduto il tempo.
     * @param {Object} context - Contesto
     * @param {boolean} hasDrafted - Se l'utente ha draftato
     */
    async advanceToNextTurn(context, hasDrafted = true) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc } = firestoreTools;
        const { CONFIG_DOC_ID, DRAFT_MAX_ATTEMPTS, DRAFT_TOTAL_ROUNDS } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) return;

            const config = configDoc.data();
            const draftTurns = config.draftTurns;

            if (!draftTurns || !draftTurns.isActive) return;

            const currentRound = draftTurns.currentRound;
            const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
            const currentOrder = [...draftTurns[orderKey]];
            let currentIndex = draftTurns.currentTurnIndex;

            // Aggiorna lo stato del team corrente
            if (hasDrafted) {
                // Guard: se il team corrente ha gia' draftato, qualcun altro ha gia' avanzato il turno
                if (currentOrder[currentIndex].hasDrafted) {
                    console.log(`Guard: Team ${currentOrder[currentIndex].teamName} ha gia' draftato in questo round, skip avanzamento.`);
                    return;
                }
                currentOrder[currentIndex].hasDrafted = true;
            } else {
                // Timeout: incrementa tentativi
                currentOrder[currentIndex].attempts++;

                if (currentOrder[currentIndex].attempts >= DRAFT_MAX_ATTEMPTS) {
                    // Max tentativi raggiunti, salta questo utente
                    currentOrder[currentIndex].hasDrafted = true; // Segna come "completato"
                    console.log(`Team ${currentOrder[currentIndex].teamName} ha raggiunto il max tentativi.`);
                } else {
                    // Sposta in fondo alla lista
                    const skippedTeam = currentOrder.splice(currentIndex, 1)[0];
                    currentOrder.push(skippedTeam);
                    // Non incrementare currentIndex perche' abbiamo rimosso l'elemento corrente
                    currentIndex--;
                }
            }

            // Trova il prossimo team che non ha ancora draftato
            let nextIndex = currentIndex + 1;
            while (nextIndex < currentOrder.length && currentOrder[nextIndex].hasDrafted) {
                nextIndex++;
            }

            // Controlla se il round corrente e' finito
            if (nextIndex >= currentOrder.length || currentOrder.every(t => t.hasDrafted)) {
                // Round completato
                if (currentRound < DRAFT_TOTAL_ROUNDS) {
                    // Passa al round successivo
                    const nextRound = currentRound + 1;
                    const nextOrderKey = nextRound === 1 ? 'round1Order' : 'round2Order';
                    const nextOrder = draftTurns[nextOrderKey];

                    // Reset hasDrafted per il nuovo round
                    nextOrder.forEach(t => {
                        t.hasDrafted = false;
                        t.attempts = 0;
                    });

                    await setDoc(configDocRef, {
                        draftTurns: {
                            ...draftTurns,
                            [orderKey]: currentOrder,
                            [nextOrderKey]: nextOrder,
                            currentRound: nextRound,
                            currentTurnIndex: 0,
                            currentTeamId: nextOrder[0].teamId,
                            turnStartTime: Date.now()
                        }
                    }, { merge: true });

                    console.log(`Round ${currentRound} completato. Inizia Round ${nextRound}.`);

                } else {
                    // Draft completato
                    await this.stopDraftTurns(context);
                    console.log("Draft completato! Tutti i round sono stati eseguiti.");
                }

            } else {
                // Continua con il prossimo team
                await setDoc(configDocRef, {
                    draftTurns: {
                        ...draftTurns,
                        [orderKey]: currentOrder,
                        currentTurnIndex: nextIndex,
                        currentTeamId: currentOrder[nextIndex].teamId,
                        turnStartTime: Date.now()
                    }
                }, { merge: true });

                console.log(`Turno passato a: ${currentOrder[nextIndex].teamName}`);
            }

        } catch (error) {
            console.error("Errore nel passaggio al turno successivo:", error);
        }
    },

    /**
     * Controlla se il tempo del turno corrente e' scaduto.
     * @param {Object} context - Contesto
     */
    async checkTurnTimeout(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc } = firestoreTools;
        const { CONFIG_DOC_ID, DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) return;

            const config = configDoc.data();
            const draftTurns = config.draftTurns;

            if (!draftTurns || !draftTurns.isActive) return;

            const turnStartTime = draftTurns.turnStartTime;
            const elapsed = Date.now() - turnStartTime;

            if (elapsed >= DRAFT_TURN_TIMEOUT_MS) {
                // Verifica che il team corrente non abbia gia' draftato (race condition check)
                const currentRound = draftTurns.currentRound;
                const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
                const currentOrder = draftTurns[orderKey];
                const currentIndex = draftTurns.currentTurnIndex;

                if (currentOrder[currentIndex] && currentOrder[currentIndex].hasDrafted) {
                    console.log("Timeout check: team corrente ha gia' draftato, skip.");
                    return;
                }

                console.log("Tempo scaduto per il turno corrente!");
                await this.advanceToNextTurn(context, false); // false = non ha draftato
            }

        } catch (error) {
            console.error("Errore nel controllo timeout:", error);
        }
    },

    /**
     * Avvia il controllo periodico del timeout.
     * @param {Object} context - Contesto
     */
    startTurnCheck(context) {
        // Controlla ogni minuto
        this.stopTurnCheck();
        this.turnCheckInterval = setInterval(() => {
            this.checkTurnTimeout(context);
        }, 60 * 1000); // Ogni minuto
    },

    /**
     * Ferma il controllo periodico del timeout.
     */
    stopTurnCheck() {
        if (this.turnCheckInterval) {
            clearInterval(this.turnCheckInterval);
            this.turnCheckInterval = null;
        }
    },

    /**
     * Ottiene lo stato corrente del draft.
     * @param {Object} context - Contesto
     * @returns {Promise<Object|null>} - Stato del draft o null
     */
    async getDraftState(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc } = firestoreTools;
        const { CONFIG_DOC_ID } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) return null;

            const config = configDoc.data();
            return config.draftTurns || null;

        } catch (error) {
            console.error("Errore nel recupero stato draft:", error);
            return null;
        }
    },

    /**
     * Verifica se e' il turno di una specifica squadra.
     * @param {Object} context - Contesto
     * @param {string} teamId - ID della squadra
     * @returns {Promise<Object>} - { isMyTurn, timeRemaining, position, totalTeams, currentRound }
     */
    async checkTeamTurn(context, teamId) {
        const draftState = await this.getDraftState(context);

        if (!draftState || !draftState.isActive) {
            return { isMyTurn: false, draftActive: false };
        }

        const { DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants;
        const currentRound = draftState.currentRound;
        const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
        const currentOrder = draftState[orderKey];
        const currentTeamId = draftState.currentTeamId;
        const turnStartTime = draftState.turnStartTime;

        const isMyTurn = currentTeamId === teamId;
        const timeRemaining = Math.max(0, DRAFT_TURN_TIMEOUT_MS - (Date.now() - turnStartTime));

        // Trova la posizione nella coda
        let position = 0;
        for (let i = 0; i < currentOrder.length; i++) {
            if (currentOrder[i].teamId === teamId) {
                // Conta quanti team prima di questo non hanno ancora draftato
                position = currentOrder.slice(0, i).filter(t => !t.hasDrafted).length;
                break;
            }
        }

        // Controlla se questo team ha gia draftato in questo round
        const teamEntry = currentOrder.find(t => t.teamId === teamId);
        const hasDraftedThisRound = teamEntry ? teamEntry.hasDrafted : false;

        return {
            draftActive: true,
            isMyTurn,
            hasDraftedThisRound,
            timeRemaining,
            position,
            totalTeams: currentOrder.filter(t => !t.hasDrafted).length,
            currentRound,
            totalRounds: draftState.totalRounds,
            currentTeamName: currentOrder.find(t => t.teamId === currentTeamId)?.teamName || 'Sconosciuto'
        };
    }
};

console.log("Modulo Draft-Turns caricato.");
