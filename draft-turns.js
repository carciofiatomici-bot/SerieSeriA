//
// ====================================================================
// DRAFT-TURNS.JS - Sistema Draft a Turni
// ====================================================================
//
// Gestisce:
// - Generazione ordine draft (basato su classifica o media rosa)
// - Gestione turni e timeout con timer di 1 ora
// - Passaggio automatico al prossimo utente
// - Notifiche in-app e push quando tocca a un utente
// - Sistema 3 strikes: dopo 3 scadenze, escluso dal round corrente
//

window.DraftTurns = {

    // Timer per il controllo del timeout
    turnCheckInterval: null,

    // Lock per prevenire chiamate concorrenti a advanceToNextTurn
    _advanceTurnLock: false,

    // Context salvato per il timer
    _savedContext: null,

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
     * @param {boolean} timerEnabled - Se true, attiva il timer di 1 ora per turno
     */
    async startDraftTurns(context, timerEnabled = true) {
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
                timeoutStrikes: 0 // Contatore scadenze timer
            }));

            // Round 2: ordine inverso
            const round2Order = [...round1Order].reverse().map(t => ({
                ...t,
                hasDrafted: false,
                timeoutStrikes: 0
            }));

            const draftTurnsData = {
                isActive: true,
                timerEnabled: timerEnabled, // Flag per attivare/disattivare il timer
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

            console.log("Draft a turni avviato con successo! Timer:", timerEnabled ? "ATTIVO" : "DISATTIVO");

            // Salva il context e avvia il controllo timeout se timer abilitato
            this._savedContext = context;
            if (timerEnabled) {
                this.startTurnCheck(context);
            }

            // Invia notifica al primo giocatore
            this.sendTurnNotification(round1Order[0].teamId, round1Order[0].teamName);

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
     * Mette in pausa il draft a turni.
     * Blocca il countdown e impedisce il drafting.
     * @param {Object} context - Contesto con db e firestoreTools
     */
    async pauseDraftTurns(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc } = firestoreTools;
        const { CONFIG_DOC_ID } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) {
                return { success: false, message: 'Configurazione non trovata.' };
            }

            const config = configDoc.data();
            const draftTurns = config.draftTurns;

            if (!draftTurns || !draftTurns.isActive) {
                return { success: false, message: 'Draft non attivo.' };
            }

            if (draftTurns.isPaused) {
                return { success: false, message: 'Draft gia in pausa.' };
            }

            await setDoc(configDocRef, {
                draftTurns: {
                    ...draftTurns,
                    isPaused: true,
                    pausedAt: Date.now()
                }
            }, { merge: true });

            // Ferma il timer di controllo timeout
            this.stopTurnCheck();

            console.log("Draft a turni messo in pausa.");
            return { success: true, message: 'Draft messo in pausa.' };

        } catch (error) {
            console.error("Errore nel mettere in pausa il draft:", error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Riprende il draft a turni dalla pausa.
     * Ricalcola il turnStartTime per preservare il tempo rimanente.
     * @param {Object} context - Contesto con db e firestoreTools
     */
    async resumeDraftTurns(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc } = firestoreTools;
        const { CONFIG_DOC_ID } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) {
                return { success: false, message: 'Configurazione non trovata.' };
            }

            const config = configDoc.data();
            const draftTurns = config.draftTurns;

            if (!draftTurns || !draftTurns.isActive) {
                return { success: false, message: 'Draft non attivo.' };
            }

            if (!draftTurns.isPaused) {
                return { success: false, message: 'Draft non in pausa.' };
            }

            // Calcola il nuovo turnStartTime
            // Il tempo trascorso in pausa viene "aggiunto" al turnStartTime
            // per preservare il tempo rimanente
            const pauseDuration = Date.now() - draftTurns.pausedAt;
            const newTurnStartTime = draftTurns.turnStartTime + pauseDuration;

            await setDoc(configDocRef, {
                draftTurns: {
                    ...draftTurns,
                    isPaused: false,
                    pausedAt: null,
                    turnStartTime: newTurnStartTime
                }
            }, { merge: true });

            // Riavvia il timer di controllo timeout
            this.startTurnCheck(context);

            console.log("Draft a turni ripreso.");
            return { success: true, message: 'Draft ripreso.' };

        } catch (error) {
            console.error("Errore nel riprendere il draft:", error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Passa al prossimo turno dopo che un utente ha draftato o e' scaduto il tempo.
     * @param {Object} context - Contesto
     * @param {boolean} hasDrafted - Se l'utente ha draftato
     */
    async advanceToNextTurn(context, hasDrafted = true) {
        // Lock per prevenire chiamate concorrenti
        if (this._advanceTurnLock) {
            console.log("advanceToNextTurn: chiamata bloccata (lock attivo)");
            return;
        }
        this._advanceTurnLock = true;

        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc } = firestoreTools;
        const { CONFIG_DOC_ID, DRAFT_MAX_TIMEOUT_STRIKES, DRAFT_TOTAL_ROUNDS } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) return;

            const config = configDoc.data();
            const draftTurns = config.draftTurns;

            if (!draftTurns || !draftTurns.isActive) return;

            const currentRound = draftTurns.currentRound;
            const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
            // DEEP COPY per evitare mutazioni accidentali degli oggetti originali
            const currentOrder = draftTurns[orderKey].map(t => ({ ...t }));
            let currentIndex = draftTurns.currentTurnIndex;

            const currentTeam = currentOrder[currentIndex];

            // Aggiorna lo stato del team corrente
            if (hasDrafted) {
                // Guard: se il team corrente ha gia' draftato, qualcun altro ha gia' avanzato il turno
                if (currentTeam.hasDrafted) {
                    console.log(`Guard: Team ${currentTeam.teamName} ha gia' draftato in questo round, skip avanzamento.`);
                    return;
                }
                currentTeam.hasDrafted = true;
                // Reset strikes quando drafta con successo
                currentTeam.timeoutStrikes = 0;
            } else {
                // Timeout: incrementa strikes
                currentTeam.timeoutStrikes = (currentTeam.timeoutStrikes || 0) + 1;
                console.log(`[TIMEOUT] Team ${currentTeam.teamName} - Strike ${currentTeam.timeoutStrikes}/${DRAFT_MAX_TIMEOUT_STRIKES}`);

                if (currentTeam.timeoutStrikes >= DRAFT_MAX_TIMEOUT_STRIKES) {
                    // 3 strikes: escluso dal round corrente, rientrera' nel prossimo
                    currentTeam.hasDrafted = true; // Segna come "completato" per questo round
                    currentTeam.excludedFromRound = true; // Flag per indicare esclusione
                    console.log(`[ESCLUSO] Team ${currentTeam.teamName} ha raggiunto ${DRAFT_MAX_TIMEOUT_STRIKES} scadenze. Escluso dal round ${currentRound}.`);

                    // Notifica l'utente dell'esclusione
                    this.sendExclusionNotification(currentTeam.teamId, currentTeam.teamName, currentRound);
                } else {
                    // Non ancora 3 strikes: sposta in fondo alla lista
                    const skippedTeam = currentOrder.splice(currentIndex, 1)[0];
                    currentOrder.push(skippedTeam);
                    // Non incrementare currentIndex perche' abbiamo rimosso l'elemento corrente
                    currentIndex--;

                    console.log(`[SPOSTATO] Team ${skippedTeam.teamName} spostato in fondo alla lista (Strike ${skippedTeam.timeoutStrikes})`);
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
                    const nextOrder = draftTurns[nextOrderKey].map(t => ({ ...t }));

                    // Reset hasDrafted e timeoutStrikes per il nuovo round
                    nextOrder.forEach(t => {
                        t.hasDrafted = false;
                        t.timeoutStrikes = 0;
                        t.excludedFromRound = false;
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

                    // Notifica il primo giocatore del nuovo round
                    this.sendTurnNotification(nextOrder[0].teamId, nextOrder[0].teamName);

                } else {
                    // Draft completato
                    await this.stopDraftTurns(context);
                    console.log("Draft completato! Tutti i round sono stati eseguiti.");
                }

            } else {
                // Continua con il prossimo team
                const nextTeam = currentOrder[nextIndex];

                await setDoc(configDocRef, {
                    draftTurns: {
                        ...draftTurns,
                        [orderKey]: currentOrder,
                        currentTurnIndex: nextIndex,
                        currentTeamId: nextTeam.teamId,
                        turnStartTime: Date.now()
                    }
                }, { merge: true });

                console.log(`Turno passato a: ${nextTeam.teamName}`);

                // Notifica il prossimo giocatore
                this.sendTurnNotification(nextTeam.teamId, nextTeam.teamName);
            }

        } catch (error) {
            console.error("Errore nel passaggio al turno successivo:", error);
        } finally {
            // Rilascia il lock
            this._advanceTurnLock = false;
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

            if (!draftTurns || !draftTurns.isActive) {
                // Draft non attivo, ferma il timer
                this.stopTurnCheck();
                return;
            }

            // Skip se il timer e' esplicitamente disabilitato (default: attivo per retrocompatibilita)
            if (draftTurns.timerEnabled === false) {
                console.log("Timeout check: timer disabilitato, skip.");
                return;
            }

            // Skip se il draft e' in pausa
            if (draftTurns.isPaused) {
                console.log("Timeout check: draft in pausa, skip.");
                return;
            }

            const turnStartTime = draftTurns.turnStartTime;
            const elapsed = Date.now() - turnStartTime;
            const timeRemaining = DRAFT_TURN_TIMEOUT_MS - elapsed;

            // Log ogni 5 minuti circa (ogni 10 check da 30 secondi)
            if (Math.floor(elapsed / 300000) !== Math.floor((elapsed - 30000) / 300000)) {
                const currentRound = draftTurns.currentRound;
                const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
                const currentTeam = draftTurns[orderKey]?.[draftTurns.currentTurnIndex];
                console.log(`[Timer] Turno di ${currentTeam?.teamName || 'N/A'} - Tempo rimanente: ${Math.floor(timeRemaining / 60000)} minuti`);
            }

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

                console.log(`[TIMEOUT] Tempo scaduto per ${currentOrder[currentIndex]?.teamName}!`);
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
        const { DRAFT_TIMEOUT_CHECK_INTERVAL_MS } = window.DraftConstants;

        // Ferma eventuali timer precedenti
        this.stopTurnCheck();

        // Salva il context
        this._savedContext = context;

        console.log(`[Timer] Avvio controllo timeout ogni ${DRAFT_TIMEOUT_CHECK_INTERVAL_MS / 1000} secondi`);

        // Controlla subito una volta
        this.checkTurnTimeout(context);

        // Poi controlla periodicamente
        this.turnCheckInterval = setInterval(() => {
            this.checkTurnTimeout(context);
        }, DRAFT_TIMEOUT_CHECK_INTERVAL_MS);
    },

    /**
     * Ferma il controllo periodico del timeout.
     */
    stopTurnCheck() {
        if (this.turnCheckInterval) {
            clearInterval(this.turnCheckInterval);
            this.turnCheckInterval = null;
            console.log("[Timer] Controllo timeout fermato");
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
     * Forza l'avanzamento al turno successivo (solo admin).
     * Salta il team corrente senza verifiche.
     * @param {Object} context - Contesto con db e firestoreTools
     * @returns {Promise<Object>} - { success, message }
     */
    async forceAdvanceTurn(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc } = firestoreTools;
        const { CONFIG_DOC_ID, DRAFT_TOTAL_ROUNDS } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) {
                return { success: false, message: 'Configurazione non trovata.' };
            }

            const config = configDoc.data();
            const draftTurns = config.draftTurns;

            if (!draftTurns || !draftTurns.isActive) {
                return { success: false, message: 'Draft a turni non attivo.' };
            }

            const currentRound = draftTurns.currentRound;
            const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
            // DEEP COPY per evitare mutazioni accidentali degli oggetti originali
            const currentOrder = draftTurns[orderKey].map(t => ({ ...t }));
            const currentIndex = draftTurns.currentTurnIndex;
            const currentTeamName = currentOrder[currentIndex]?.teamName || 'Sconosciuto';

            // Marca il team corrente come "ha draftato" (skip forzato)
            currentOrder[currentIndex].hasDrafted = true;

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
                    const nextOrder = [...draftTurns[nextOrderKey]];

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

                    return {
                        success: true,
                        message: `Round ${currentRound} completato. Inizia Round ${nextRound}. Team ${currentTeamName} saltato.`
                    };

                } else {
                    // Draft completato
                    await this.stopDraftTurns(context);
                    return {
                        success: true,
                        message: `Draft completato! Tutti i round sono stati eseguiti. Team ${currentTeamName} saltato.`
                    };
                }

            } else {
                // Continua con il prossimo team
                const nextTeamName = currentOrder[nextIndex]?.teamName || 'Sconosciuto';

                await setDoc(configDocRef, {
                    draftTurns: {
                        ...draftTurns,
                        [orderKey]: currentOrder,
                        currentTurnIndex: nextIndex,
                        currentTeamId: currentOrder[nextIndex].teamId,
                        turnStartTime: Date.now()
                    }
                }, { merge: true });

                return {
                    success: true,
                    message: `Turno forzato: ${currentTeamName} saltato. Ora tocca a ${nextTeamName}.`
                };
            }

        } catch (error) {
            console.error("Errore nel forzare avanzamento turno:", error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Salta direttamente a una squadra specifica (anche se ha gia' draftato).
     * Resetta lo stato hasDrafted della squadra selezionata e di tutte quelle successive.
     * @param {Object} context - Contesto con db e firestoreTools
     * @param {string} targetTeamId - ID della squadra a cui saltare
     * @returns {Promise<Object>} - { success, message }
     */
    async jumpToTeam(context, targetTeamId) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc } = firestoreTools;
        const { CONFIG_DOC_ID } = window.DraftConstants;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) {
                return { success: false, message: 'Configurazione non trovata.' };
            }

            const config = configDoc.data();
            const draftTurns = config.draftTurns;

            if (!draftTurns || !draftTurns.isActive) {
                return { success: false, message: 'Draft a turni non attivo.' };
            }

            const currentRound = draftTurns.currentRound;
            const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
            // DEEP COPY per evitare mutazioni accidentali
            const currentOrder = draftTurns[orderKey].map(t => ({ ...t }));

            // Trova l'indice della squadra target
            const targetIndex = currentOrder.findIndex(t => t.teamId === targetTeamId);

            if (targetIndex === -1) {
                return { success: false, message: 'Squadra non trovata nell\'ordine del draft.' };
            }

            const targetTeamName = currentOrder[targetIndex].teamName;

            // Resetta lo stato hasDrafted della squadra target e di tutte quelle successive
            for (let i = targetIndex; i < currentOrder.length; i++) {
                currentOrder[i].hasDrafted = false;
                currentOrder[i].attempts = 0;
            }

            // Aggiorna Firestore con il nuovo stato
            await setDoc(configDocRef, {
                draftTurns: {
                    ...draftTurns,
                    [orderKey]: currentOrder,
                    currentTurnIndex: targetIndex,
                    currentTeamId: targetTeamId,
                    turnStartTime: Date.now()
                }
            }, { merge: true });

            console.log(`Draft: turno passato a ${targetTeamName} (index ${targetIndex})`);

            return {
                success: true,
                message: `Turno passato a ${targetTeamName}. Il draft riprende da questa squadra.`
            };

        } catch (error) {
            console.error("Errore nel saltare alla squadra:", error);
            return { success: false, message: error.message };
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

        // Se il draft e' in pausa, ritorna stato pausa
        if (draftState.isPaused) {
            return {
                draftActive: true,
                isPaused: true,
                pausedAt: draftState.pausedAt,
                currentRound: draftState.currentRound,
                totalRounds: draftState.totalRounds
            };
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
            turnStartTime,
            position,
            totalTeams: currentOrder.filter(t => !t.hasDrafted).length,
            currentRound,
            totalRounds: draftState.totalRounds,
            timerEnabled: draftState.timerEnabled !== false, // default true per retrocompatibilita
            currentTeamName: currentOrder.find(t => t.teamId === currentTeamId)?.teamName || 'Sconosciuto'
        };
    },

    // ====================================================================
    // SISTEMA NOTIFICHE
    // ====================================================================

    /**
     * Invia notifica quando tocca a un utente draftare.
     * Usa sia notifiche in-app che push notification del browser.
     * @param {string} teamId - ID della squadra
     * @param {string} teamName - Nome della squadra
     */
    sendTurnNotification(teamId, teamName) {
        console.log(`[Notifica] Invio notifica turno a ${teamName} (${teamId})`);

        // 1. Notifica in-app tramite sistema Notifications
        if (window.Notifications && window.Notifications.notify) {
            window.Notifications.notify.draftTurn(teamName);
        }

        // 2. Dispatch evento custom per aggiornare UI in tempo reale
        document.dispatchEvent(new CustomEvent('draftTurnStarted', {
            detail: { teamId, teamName }
        }));

        // 3. Push notification del browser (se l'utente e' quello corrente)
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (currentTeamId === teamId) {
            this.sendBrowserPushNotification(
                'E\' il tuo turno nel Draft!',
                `Tocca a te scegliere un giocatore. Hai 1 ora di tempo.`,
                'draft'
            );
        }
    },

    /**
     * Invia notifica quando un utente viene escluso dal round per troppi timeout.
     * @param {string} teamId - ID della squadra
     * @param {string} teamName - Nome della squadra
     * @param {number} round - Numero del round
     */
    sendExclusionNotification(teamId, teamName, round) {
        console.log(`[Notifica] ${teamName} escluso dal round ${round}`);

        // Notifica in-app
        if (window.Notifications && window.Notifications.add) {
            window.Notifications.add({
                type: 'draft_turn',
                title: 'Escluso dal Draft',
                message: `Hai fatto scadere il timer 3 volte. Sei stato escluso dal Round ${round}. Rientrerai nel prossimo round.`,
                action: null
            });
        }

        // Push notification se e' l'utente corrente
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (currentTeamId === teamId) {
            this.sendBrowserPushNotification(
                'Escluso dal Draft',
                `Hai fatto scadere il timer 3 volte. Rientrerai nel prossimo round.`,
                'warning'
            );
        }
    },

    /**
     * Invia push notification del browser.
     * Richiede il permesso all'utente se non ancora concesso.
     * @param {string} title - Titolo della notifica
     * @param {string} body - Corpo della notifica
     * @param {string} tag - Tag per raggruppare notifiche simili
     */
    async sendBrowserPushNotification(title, body, tag = 'draft') {
        // Verifica supporto
        if (!('Notification' in window)) {
            console.log("[Push] Browser non supporta le notifiche");
            return;
        }

        // Verifica/richiedi permesso
        let permission = Notification.permission;

        if (permission === 'default') {
            // Richiedi permesso
            permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
            console.log("[Push] Permesso notifiche non concesso");
            return;
        }

        // Invia la notifica
        try {
            const notification = new Notification(title, {
                body: body,
                icon: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/serie%20sera%20256.png',
                tag: tag,
                requireInteraction: true, // Rimane visibile finche' l'utente non interagisce
                vibrate: [200, 100, 200] // Vibrazione su mobile
            });

            // Click sulla notifica porta alla pagina draft
            notification.onclick = () => {
                window.focus();
                const draftContent = document.getElementById('draft-content');
                if (draftContent && window.showScreen) {
                    window.showScreen(draftContent);
                }
                notification.close();
            };

            console.log("[Push] Notifica inviata:", title);

        } catch (error) {
            console.error("[Push] Errore invio notifica:", error);
        }
    },

    /**
     * Richiede il permesso per le push notification.
     * Chiamare quando l'utente accede al draft per la prima volta.
     */
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }
};

console.log("Modulo Draft-Turns caricato.");
