//
// ====================================================================
// DRAFT-TURNS.JS - Sistema Draft a Turni
// ====================================================================
//
// Gestisce:
// - Generazione ordine draft (basato su classifica o media rosa)
// - Gestione turni e timeout con timer di 1 ora
// - Sistema "Ruba Turno": quando il timer scade, altri utenti possono rubare
// - Notifiche in-app e push quando tocca a un utente
// - Sistema 5 strikes: dopo 5 furti subiti, assegnazione giocatore random
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
                const teamName = data.teamName || docSnap.id;

                // Escludi solo l'account admin puro "serieseria" dal draft
                // Le squadre con isAdmin=true possono comunque partecipare se sono squadre reali
                if (teamName.toLowerCase() === 'serieseria') {
                    console.log(`[Draft] Account admin puro "${teamName}" escluso dall'ordine draft.`);
                    return; // skip this team
                }

                // Includi solo squadre con draft_enabled attivo
                if (data.draft_enabled !== true) {
                    console.log(`[Draft] Squadra "${teamName}" non partecipa al draft (toggle disattivo).`);
                    return; // skip this team
                }

                teams.push({
                    id: docSnap.id,
                    name: teamName,
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

            // PRIMA controlla se tutti hanno gia' draftato (priorita' al passaggio di round)
            const allAlreadyDrafted = currentOrder.every(t => t.hasDrafted);
            if (allAlreadyDrafted) {
                console.log(`[Round Check] Tutti hanno gia' draftato nel round ${currentRound}, procedo con passaggio round.`);
                // Procedi direttamente al passaggio di round (salta la logica di aggiornamento team)
                if (currentRound < DRAFT_TOTAL_ROUNDS) {
                    const nextRound = currentRound + 1;
                    const nextOrderKey = nextRound === 1 ? 'round1Order' : 'round2Order';
                    const nextOrder = draftTurns[nextOrderKey].map(t => ({ ...t }));

                    nextOrder.forEach(t => {
                        t.hasDrafted = false;
                        t.timeoutStrikes = 0;
                        t.excludedFromRound = false;
                    });

                    const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
                    await setDoc(configDocRef, {
                        draftTurns: {
                            ...draftTurns,
                            [orderKey]: currentOrder,
                            [nextOrderKey]: nextOrder,
                            currentRound: nextRound,
                            currentTurnIndex: 0,
                            currentTeamId: nextOrder[0].teamId,
                            turnStartTime: Date.now(),
                            turnExpired: false,
                            isStolenTurn: false
                        }
                    }, { merge: true });

                    console.log(`Round ${currentRound} completato. Inizia Round ${nextRound}.`);
                    this.sendTurnNotification(nextOrder[0].teamId, nextOrder[0].teamName);
                } else {
                    await this.stopDraftTurns(context);
                    console.log("Draft completato! Tutti i round sono stati eseguiti.");
                }
                return;
            }

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
                            turnStartTime: Date.now(),
                            // CRITICO: Reset flag turno rubato per il nuovo round
                            isStolenTurn: false,
                            turnExpired: false,
                            stolenFrom: null,
                            stolenBy: null
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
                        turnStartTime: Date.now(),
                        // CRITICO: Reset flag turno rubato per il nuovo turno (timer torna a 1 ora)
                        isStolenTurn: false,
                        turnExpired: false,
                        stolenFrom: null,
                        stolenBy: null
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
     * Con il nuovo sistema "Ruba Turno", quando il timer scade non si avanza automaticamente,
     * ma si setta un flag che permette agli altri utenti di rubare il turno.
     * @param {Object} context - Contesto
     */
    async checkTurnTimeout(context) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc } = firestoreTools;
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

            // Skip durante la pausa notturna (il timer non scorre)
            if (window.DraftConstants.isNightPauseActive()) {
                console.log("Timeout check: pausa notturna attiva (00:00-08:00), skip.");
                return;
            }

            // Converti turnStartTime se e' un Timestamp Firestore
            let turnStartTime = draftTurns.turnStartTime;
            if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
                turnStartTime = turnStartTime.toMillis();
            }

            // Calcola tempo effettivo trascorso (escludendo pause notturne)
            const effectiveElapsed = window.DraftConstants.getEffectiveElapsedTime(turnStartTime);

            // Usa il timeout appropriato: normale (1h) o furto (10min)
            const { DRAFT_STEAL_TIMEOUT_MS } = window.DraftConstants;
            const currentTimeout = draftTurns.isStolenTurn ? DRAFT_STEAL_TIMEOUT_MS : DRAFT_TURN_TIMEOUT_MS;
            const timeRemaining = currentTimeout - effectiveElapsed;

            // Log ogni 5 minuti circa (ogni 10 check da 30 secondi)
            if (Math.floor(effectiveElapsed / 300000) !== Math.floor((effectiveElapsed - 30000) / 300000)) {
                const currentRound = draftTurns.currentRound;
                const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
                const currentTeam = draftTurns[orderKey]?.[draftTurns.currentTurnIndex];
                console.log(`[Timer] Turno di ${currentTeam?.teamName || 'N/A'} - Tempo rimanente: ${Math.floor(timeRemaining / 60000)} minuti (effettivo)`);
            }

            if (effectiveElapsed >= currentTimeout) {
                // Verifica che il team corrente non abbia gia' draftato (race condition check)
                const currentRound = draftTurns.currentRound;
                const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
                const currentOrder = draftTurns[orderKey];
                const currentIndex = draftTurns.currentTurnIndex;

                if (currentOrder[currentIndex] && currentOrder[currentIndex].hasDrafted) {
                    console.log("Timeout check: team corrente ha gia' draftato, skip.");
                    return;
                }

                const currentTeamName = currentOrder[currentIndex]?.teamName || 'N/A';

                // Se il turno era gia' stato rubato e scade di nuovo, il ladro ha fallito
                // In questo caso il turno torna aperto per essere rubato da qualcun altro
                if (draftTurns.isStolenTurn) {
                    console.log(`[TIMEOUT FURTO] Il ladro ${currentTeamName} non ha draftato in tempo!`);
                    // BUGFIX: Usa updateDoc con dot notation per evitare di sovrascrivere
                    // dati modificati nel frattempo da altri processi
                    const { updateDoc } = firestoreTools;
                    await updateDoc(configDocRef, {
                        'draftTurns.isStolenTurn': false,
                        'draftTurns.turnExpired': true,
                        'draftTurns.turnStartTime': Date.now(),
                        'draftTurns.turnExpiredAt': Date.now()
                    });
                    return;
                }

                // Timer principale scaduto - setta il flag "turnExpired" per permettere il furto
                if (!draftTurns.turnExpired) {
                    console.log(`[TIMEOUT] Tempo scaduto per ${currentTeamName}! Turno disponibile per furto.`);

                    // Controlla se e' l'ultimo giocatore rimasto a dover draftare
                    const remainingPlayers = currentOrder.filter(t => !t.hasDrafted);
                    const isLastPlayer = remainingPlayers.length === 1;

                    if (isLastPlayer) {
                        // E' l'ultimo giocatore - gestisci assegnazione automatica (solo in orario consentito)
                        await this.handleAutoAssignOrSkip(context, currentOrder, currentIndex, currentTeamName, draftTurns, orderKey, configDocRef);
                        return;
                    }

                    // BUGFIX: Usa updateDoc con dot notation per evitare di sovrascrivere
                    // dati modificati nel frattempo da altri processi
                    const { updateDoc } = firestoreTools;
                    await updateDoc(configDocRef, {
                        'draftTurns.turnExpired': true,
                        'draftTurns.turnExpiredAt': Date.now()
                    });

                    // Notifica che il turno e' disponibile per il furto
                    this.sendStealAvailableNotification(currentOrder[currentIndex]?.teamId, currentTeamName);
                } else {
                    // Il turno e' gia' scaduto e rubabile - controlla il timer secondario
                    const turnExpiredAt = draftTurns.turnExpiredAt;
                    if (turnExpiredAt) {
                        // Converti se e' un Timestamp Firestore
                        let expiredAtMs = turnExpiredAt;
                        if (turnExpiredAt && typeof turnExpiredAt.toMillis === 'function') {
                            expiredAtMs = turnExpiredAt.toMillis();
                        }

                        const elapsedSinceExpired = Date.now() - expiredAtMs;
                        const STEAL_WINDOW_TIMEOUT_MS = DRAFT_TURN_TIMEOUT_MS; // 1 ora per rubare

                        if (elapsedSinceExpired >= STEAL_WINDOW_TIMEOUT_MS) {
                            console.log(`[TIMEOUT FURTO] Nessuno ha rubato il turno di ${currentTeamName} entro 1 ora.`);

                            // Controlla se siamo nella finestra oraria consentita (9:00 - 22:30)
                            if (!this.isWithinAllowedTimeWindow()) {
                                console.log(`[NOTTE] Fuori dalla finestra oraria (9:00-22:30). Assegnazione automatica sospesa.`);
                                return;
                            }

                            // Gestisci assegnazione automatica o skip
                            await this.handleAutoAssignOrSkip(context, currentOrder, currentIndex, currentTeamName, draftTurns, orderKey, configDocRef);
                        }
                    }
                }
            }

        } catch (error) {
            console.error("Errore nel controllo timeout:", error);
        }
    },

    /**
     * Controlla se siamo nella finestra oraria consentita per le assegnazioni automatiche.
     * Finestra consentita: 9:00 - 22:30
     * @returns {boolean} - true se siamo nella finestra consentita
     */
    isWithinAllowedTimeWindow() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTimeInMinutes = hours * 60 + minutes;

        const startTime = 9 * 60; // 9:00 = 540 minuti
        const endTime = 22 * 60 + 30; // 22:30 = 1350 minuti

        return currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
    },

    /**
     * Gestisce l'assegnazione automatica o lo skip del turno.
     * Assegna un giocatore random se c'e' budget sufficiente, altrimenti salta il turno.
     * Gestisce anche l'avanzamento al prossimo turno/round internamente.
     * @param {Object} context - Contesto
     * @param {Array} currentOrder - Ordine corrente del draft
     * @param {number} currentIndex - Indice del giocatore corrente
     * @param {string} currentTeamName - Nome della squadra corrente
     * @param {Object} draftTurns - Stato del draft
     * @param {string} orderKey - Chiave dell'ordine (round1Order o round2Order)
     * @param {Object} configDocRef - Riferimento al documento di configurazione
     */
    async handleAutoAssignOrSkip(context, currentOrder, currentIndex, currentTeamName, draftTurns, orderKey, configDocRef) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc, updateDoc } = firestoreTools;
        const { DRAFT_TOTAL_ROUNDS, DRAFT_SKIP_TURN_BONUS_CS } = window.DraftConstants;

        // Controlla se siamo nella finestra oraria consentita
        if (!this.isWithinAllowedTimeWindow()) {
            console.log(`[NOTTE] Fuori dalla finestra oraria (9:00-22:30). Assegnazione automatica sospesa per ${currentTeamName}.`);
            return;
        }

        const teamId = currentOrder[currentIndex].teamId;
        const currentRound = draftTurns.currentRound;

        // Prova ad assegnare un giocatore random
        const assignResult = await this.assignRandomCheapestPlayer(context, teamId);

        if (assignResult.success) {
            // Assegnazione riuscita
            console.log(`[AUTO-ASSEGNATO] ${assignResult.playerName} assegnato a ${currentTeamName}`);
            this.sendAutoAssignNotification(teamId, currentTeamName, assignResult.playerName);

            currentOrder[currentIndex].hasDrafted = true;
            currentOrder[currentIndex].autoAssigned = true;
        } else if (assignResult.insufficientBudget) {
            // Budget insufficiente - salta il turno (rinuncia forzata) e assegna bonus CS
            console.log(`[BUDGET INSUFFICIENTE] ${currentTeamName} non ha budget sufficiente. Turno saltato.`);

            // Assegna bonus CS per il turno saltato
            const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                const newBudget = (teamData.budget || 0) + DRAFT_SKIP_TURN_BONUS_CS;
                await updateDoc(teamDocRef, { budget: newBudget });
                console.log(`[BUDGET INSUFFICIENTE] ${currentTeamName} riceve ${DRAFT_SKIP_TURN_BONUS_CS} CS (nuovo budget: ${newBudget})`);
            }

            this.sendSkipTurnNotification(teamId, currentTeamName, 'budget_insufficient');

            currentOrder[currentIndex].hasDrafted = true;
            currentOrder[currentIndex].skippedTurn = true;
            currentOrder[currentIndex].skipReason = 'budget_insufficient';
        } else {
            // Altro errore - salta comunque il turno e assegna bonus CS
            console.log(`[ERRORE ASSEGNAZIONE] Errore per ${currentTeamName}: ${assignResult.message}. Turno saltato.`);

            // Assegna bonus CS per il turno saltato
            const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                const newBudget = (teamData.budget || 0) + DRAFT_SKIP_TURN_BONUS_CS;
                await updateDoc(teamDocRef, { budget: newBudget });
                console.log(`[ERRORE ASSEGNAZIONE] ${currentTeamName} riceve ${DRAFT_SKIP_TURN_BONUS_CS} CS (nuovo budget: ${newBudget})`);
            }

            this.sendSkipTurnNotification(teamId, currentTeamName, 'error');

            currentOrder[currentIndex].hasDrafted = true;
            currentOrder[currentIndex].skippedTurn = true;
            currentOrder[currentIndex].skipReason = 'error';
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
                    t.skippedTurn = false;
                    t.skipReason = null;
                });

                await setDoc(configDocRef, {
                    draftTurns: {
                        ...draftTurns,
                        [orderKey]: currentOrder,
                        [nextOrderKey]: nextOrder,
                        currentRound: nextRound,
                        currentTurnIndex: 0,
                        currentTeamId: nextOrder[0].teamId,
                        turnStartTime: Date.now(),
                        turnExpired: false,
                        turnExpiredAt: null,
                        isStolenTurn: false,
                        stolenFrom: null,
                        stolenBy: null
                    }
                }, { merge: true });

                console.log(`[AUTO-ASSIGN] Round ${currentRound} completato. Inizia Round ${nextRound}.`);
                this.sendTurnNotification(nextOrder[0].teamId, nextOrder[0].teamName);

            } else {
                // Draft completato - salva prima l'ultimo stato
                await setDoc(configDocRef, {
                    draftTurns: {
                        ...draftTurns,
                        [orderKey]: currentOrder,
                        turnExpired: false,
                        turnExpiredAt: null
                    }
                }, { merge: true });

                await this.stopDraftTurns(context);
                console.log("[AUTO-ASSIGN] Draft completato! Tutti i round sono stati eseguiti.");
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
                    turnStartTime: Date.now(),
                    turnExpired: false,
                    turnExpiredAt: null,
                    isStolenTurn: false,
                    stolenFrom: null,
                    stolenBy: null
                }
            }, { merge: true });

            console.log(`[AUTO-ASSIGN] Turno passato a: ${nextTeam.teamName}`);
            this.sendTurnNotification(nextTeam.teamId, nextTeam.teamName);
        }
    },

    /**
     * Invia una notifica quando il turno viene saltato.
     * @param {string} teamId - ID della squadra
     * @param {string} teamName - Nome della squadra
     * @param {string} reason - Motivo dello skip ('budget_insufficient', 'voluntary', 'error')
     */
    sendSkipTurnNotification(teamId, teamName, reason) {
        const { DRAFT_SKIP_TURN_BONUS_CS } = window.DraftConstants;
        let message = '';
        let title = '';

        switch (reason) {
            case 'budget_insufficient':
                title = 'Turno Saltato - Budget Insufficiente';
                message = `Non hai abbastanza CS per draftare nessun giocatore. Il tuo turno e' stato saltato. Hai ricevuto ${DRAFT_SKIP_TURN_BONUS_CS} CS come compensazione.`;
                break;
            case 'voluntary':
                title = 'Rinuncia al Pick Confermata';
                message = `Hai rinunciato al pick per questo round. Hai ricevuto ${DRAFT_SKIP_TURN_BONUS_CS} CS come compensazione.`;
                break;
            case 'error':
            default:
                title = 'Turno Saltato';
                message = `Il tuo turno e' stato saltato a causa di un errore. Hai ricevuto ${DRAFT_SKIP_TURN_BONUS_CS} CS come compensazione.`;
                break;
        }

        // Notifica in-app
        if (window.Notifications && window.Notifications.add) {
            window.Notifications.add({
                type: 'draft_turn',
                title: title,
                message: message,
                action: null
            });
        }

        // Push notification se e' l'utente corrente
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (currentTeamId === teamId) {
            this.sendBrowserPushNotification(title, message, 'warning');
        }

        console.log(`[Notifica Skip] ${teamName}: ${reason}`);
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
     * Ruba il turno di un altro utente.
     * Usa una TRANSAZIONE Firestore per garantire atomicita' e prevenire race conditions
     * quando due utenti cliccano "Ruba Turno" simultaneamente.
     *
     * REGOLA: Il ladro prende il posto corrente, la vittima va in FONDO alla coda
     * (come ultimo tra quelli che non hanno ancora draftato).
     *
     * @param {Object} context - Contesto con db e firestoreTools
     * @param {string} stealerTeamId - ID della squadra che ruba il turno
     * @returns {Promise<Object>} - { success, message }
     */
    async stealTurn(context, stealerTeamId) {
        const { db, firestoreTools, paths } = context;
        const { doc, runTransaction } = firestoreTools;
        const { CONFIG_DOC_ID, DRAFT_MAX_STEAL_STRIKES } = window.DraftConstants;

        // BLOCCO NOTTURNO: Non permettere il furto durante la pausa notturna (00:00-08:00)
        if (window.DraftConstants.isNightPauseActive()) {
            return {
                success: false,
                message: 'Non puoi rubare il turno durante la pausa notturna (00:00-08:00).'
            };
        }

        // Variabili per notifiche post-transazione
        let stealerTeamName = '';
        let victimTeamId = '';
        let victimTeamName = '';
        let autoAssignNeeded = false;

        try {
            const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

            // Esegui tutto in una transazione atomica
            const result = await runTransaction(db, async (transaction) => {
                const configDoc = await transaction.get(configDocRef);

                if (!configDoc.exists()) {
                    throw new Error('Configurazione non trovata.');
                }

                const config = configDoc.data();
                const draftTurns = config.draftTurns;

                if (!draftTurns || !draftTurns.isActive) {
                    throw new Error('Draft non attivo.');
                }

                // VERIFICA CRITICA: il turno deve essere ancora scaduto
                // Se qualcun altro ha gia' rubato, turnExpired sara' false
                if (!draftTurns.turnExpired) {
                    throw new Error('Turno gia\' rubato da un altro utente! Ricarica la pagina.');
                }

                const currentRound = draftTurns.currentRound;
                const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
                // DEEP COPY per evitare mutazioni
                const currentOrder = draftTurns[orderKey].map(t => ({ ...t }));
                const currentIndex = draftTurns.currentTurnIndex;
                const victimTeam = currentOrder[currentIndex];

                // Salva info per notifiche
                victimTeamId = victimTeam.teamId;
                victimTeamName = victimTeam.teamName;

                // Verifica che il ladro non sia la vittima stessa
                if (victimTeam.teamId === stealerTeamId) {
                    throw new Error('Non puoi rubare il tuo stesso turno!');
                }

                // Trova l'indice del ladro nell'ordine
                const stealerIndex = currentOrder.findIndex(t => t.teamId === stealerTeamId);
                if (stealerIndex === -1) {
                    throw new Error('Squadra non trovata nell\'ordine del draft.');
                }

                // Verifica che il ladro non abbia gia' draftato in questo round
                if (currentOrder[stealerIndex].hasDrafted) {
                    throw new Error('Hai gia\' draftato in questo round.');
                }

                stealerTeamName = currentOrder[stealerIndex].teamName;

                // Incrementa lo strike counter della vittima
                victimTeam.stealStrikes = (victimTeam.stealStrikes || 0) + 1;
                console.log(`[FURTO TRANSAZIONE] ${stealerTeamName} ruba il turno a ${victimTeamName} (Strike ${victimTeam.stealStrikes}/${DRAFT_MAX_STEAL_STRIKES})`);

                // Controlla se la vittima ha raggiunto il limite di strikes
                if (victimTeam.stealStrikes >= DRAFT_MAX_STEAL_STRIKES) {
                    autoAssignNeeded = true;
                    victimTeam.hasDrafted = true;
                    victimTeam.autoAssigned = true;
                    victimTeam.stealStrikes = 0;
                }

                // NUOVA REGOLA: il ladro prende il posto corrente, la vittima va in FONDO alla coda
                const stealerTeam = { ...currentOrder[stealerIndex] };

                // Rimuovi il ladro dalla sua posizione originale
                currentOrder.splice(stealerIndex, 1);

                // Se l'indice corrente e' maggiore dell'indice del ladro, dobbiamo aggiustarlo
                const adjustedCurrentIndex = stealerIndex < currentIndex ? currentIndex - 1 : currentIndex;

                // Metti il ladro nella posizione corrente del turno
                currentOrder[adjustedCurrentIndex] = stealerTeam;

                // Rimuovi la vittima dalla posizione corrente (ora occupata dal ladro)
                // e aggiungila in fondo (solo se non ha gia' draftato per via dei 5 strikes)
                if (!victimTeam.hasDrafted) {
                    // Trova l'ultimo indice dei giocatori che non hanno ancora draftato
                    let lastNonDraftedIndex = currentOrder.length - 1;
                    while (lastNonDraftedIndex >= 0 && currentOrder[lastNonDraftedIndex].hasDrafted) {
                        lastNonDraftedIndex--;
                    }

                    // Inserisci la vittima dopo l'ultimo che non ha draftato
                    // (cioe' prima di quelli che hanno gia' draftato)
                    currentOrder.splice(lastNonDraftedIndex + 1, 0, victimTeam);
                }

                // Aggiorna Firestore ATOMICAMENTE
                transaction.update(configDocRef, {
                    [`draftTurns.${orderKey}`]: currentOrder,
                    'draftTurns.currentTeamId': stealerTeamId,
                    'draftTurns.turnStartTime': Date.now(),
                    'draftTurns.turnExpired': false, // CRITICO: resetta il flag atomicamente
                    'draftTurns.isStolenTurn': true,
                    'draftTurns.stolenFrom': victimTeamId,
                    'draftTurns.stolenBy': stealerTeamId
                });

                return { success: true, victimTeamName };
            });

            // Operazioni post-transazione (notifiche, assegnazione giocatore)
            // Queste non sono critiche per l'atomicita'

            // Se servono 5 strikes, assegna giocatore random
            if (autoAssignNeeded) {
                console.log(`[5 STRIKES] ${victimTeamName} ha subito ${DRAFT_MAX_STEAL_STRIKES} furti. Assegnazione giocatore random...`);
                const assignResult = await this.assignRandomCheapestPlayer(context, victimTeamId);
                if (assignResult.success) {
                    console.log(`[AUTO-ASSEGNATO] ${assignResult.playerName} assegnato a ${victimTeamName}`);
                    this.sendAutoAssignNotification(victimTeamId, victimTeamName, assignResult.playerName);
                }
            }

            // Notifica il ladro che ora e' il suo turno
            this.sendTurnNotification(stealerTeamId, stealerTeamName);

            // Notifica la vittima che il suo turno e' stato rubato
            this.sendStealVictimNotification(victimTeamId, victimTeamName, stealerTeamName);

            return {
                success: true,
                message: `Hai rubato il turno a ${result.victimTeamName}! Hai 10 minuti per draftare.`
            };

        } catch (error) {
            console.error("Errore nel furto del turno:", error);
            // Messaggi user-friendly per errori comuni
            if (error.message.includes('gia\' rubato')) {
                return { success: false, message: 'Qualcun altro ha rubato il turno prima di te! Ricarica la pagina.' };
            }
            return { success: false, message: error.message };
        }
    },

    /**
     * Assegna un giocatore random dal costo piu' basso a una squadra.
     * Usato quando una squadra subisce 5 furti o quando scade il timer secondario.
     * Verifica che la squadra abbia budget sufficiente prima di assegnare.
     * @param {Object} context - Contesto
     * @param {string} teamId - ID della squadra a cui assegnare il giocatore
     * @returns {Promise<Object>} - { success, playerName, playerId, insufficientBudget }
     */
    async assignRandomCheapestPlayer(context, teamId) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc } = firestoreTools;

        try {
            // Carica i dati della squadra PRIMA per verificare il budget
            const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                return { success: false, message: 'Squadra non trovata.' };
            }

            const teamData = teamDoc.data();
            const currentPlayers = teamData.players || [];
            const budget = teamData.budget || 0;

            // Carica i giocatori disponibili
            const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);
            const q = query(playersCollectionRef, where('isDrafted', '==', false));
            const playersSnapshot = await getDocs(q);

            if (playersSnapshot.empty) {
                return { success: false, message: 'Nessun giocatore disponibile.' };
            }

            // Calcola il costo per ogni giocatore e filtra quelli accessibili
            const players = [];
            const calculatePlayerCost = window.calculatePlayerCost;

            playersSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                // Usa il livello minimo per calcolare il costo minimo possibile
                const levelMin = data.levelRange?.[0] || 1;
                let cost;
                if (calculatePlayerCost) {
                    cost = calculatePlayerCost(levelMin, data.abilities || []);
                } else {
                    cost = data.cost || levelMin;
                }
                players.push({ id: docSnap.id, ...data, calculatedCost: cost });
            });

            // Filtra i giocatori che la squadra puo' permettersi
            const affordablePlayers = players.filter(p => p.calculatedCost <= budget);

            // Se nessun giocatore e' accessibile, ritorna insufficientBudget
            if (affordablePlayers.length === 0) {
                console.log(`[BUDGET] Squadra ${teamId} non ha budget sufficiente (${budget} CS) per nessun giocatore.`);
                return {
                    success: false,
                    insufficientBudget: true,
                    message: 'Budget insufficiente per qualsiasi giocatore disponibile.',
                    currentBudget: budget
                };
            }

            // Trova il costo minimo tra quelli accessibili
            let minCost = Infinity;
            affordablePlayers.forEach(p => {
                if (p.calculatedCost < minCost) minCost = p.calculatedCost;
            });

            // Filtra solo i giocatori con il costo minimo
            const cheapestPlayers = affordablePlayers.filter(p => p.calculatedCost === minCost);

            // Scegli un giocatore random tra i piu' economici
            const randomIndex = Math.floor(Math.random() * cheapestPlayers.length);
            const selectedPlayer = cheapestPlayers[randomIndex];

            // Determina il livello (random nel range)
            const levelMin = selectedPlayer.levelRange?.[0] || 1;
            const levelMax = selectedPlayer.levelRange?.[1] || levelMin;
            const finalLevel = Math.floor(Math.random() * (levelMax - levelMin + 1)) + levelMin;

            // Calcola il costo effettivo con il livello finale
            const finalCost = calculatePlayerCost ? calculatePlayerCost(finalLevel, selectedPlayer.abilities || []) : selectedPlayer.cost || minCost;

            // Verifica di nuovo che il budget sia sufficiente (con il livello finale)
            if (finalCost > budget) {
                // Se il costo finale e' troppo alto, usa il livello minimo
                const safeLevel = levelMin;
                const safeCost = calculatePlayerCost ? calculatePlayerCost(safeLevel, selectedPlayer.abilities || []) : selectedPlayer.cost || minCost;

                if (safeCost > budget) {
                    return {
                        success: false,
                        insufficientBudget: true,
                        message: 'Budget insufficiente anche per il livello minimo.',
                        currentBudget: budget
                    };
                }
            }

            // Crea il giocatore per la rosa
            const newPlayer = {
                id: selectedPlayer.id,
                name: selectedPlayer.name,
                role: selectedPlayer.role,
                age: selectedPlayer.age,
                type: selectedPlayer.type,
                level: finalLevel,
                abilities: selectedPlayer.abilities || [],
                nationality: selectedPlayer.nationality || 'IT',
                draftedAt: new Date().toISOString(),
                autoAssigned: true // Flag per indicare assegnazione automatica
            };

            // Aggiorna la squadra
            await setDoc(teamDocRef, {
                players: [...currentPlayers, newPlayer],
                budget: Math.max(0, budget - finalCost)
            }, { merge: true });

            // Marca il giocatore come draftato
            const playerDocRef = doc(db, paths.DRAFT_PLAYERS_COLLECTION_PATH, selectedPlayer.id);
            await updateDoc(playerDocRef, {
                isDrafted: true,
                draftedBy: teamId,
                draftedAt: new Date().toISOString()
            });

            return {
                success: true,
                playerName: selectedPlayer.name,
                playerId: selectedPlayer.id,
                cost: finalCost
            };

        } catch (error) {
            console.error("Errore nell'assegnazione automatica:", error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Rinuncia volontaria al pick del turno corrente.
     * L'utente decide di non draftare nessun giocatore in questo turno.
     * Riceve un bonus di 150 CS come compensazione.
     * @param {Object} context - Contesto con db e firestoreTools
     * @param {string} teamId - ID della squadra che rinuncia
     * @returns {Promise<Object>} - { success, message }
     */
    async skipTurn(context, teamId) {
        const { db, firestoreTools, paths } = context;
        const { doc, getDoc, setDoc, updateDoc } = firestoreTools;
        const { CONFIG_DOC_ID, DRAFT_TOTAL_ROUNDS, DRAFT_SKIP_TURN_BONUS_CS } = window.DraftConstants;

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

            // Verifica che sia il turno dell'utente
            if (draftTurns.currentTeamId !== teamId) {
                return { success: false, message: 'Non e\' il tuo turno!' };
            }

            const currentRound = draftTurns.currentRound;
            const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
            const currentOrder = draftTurns[orderKey].map(t => ({ ...t }));
            const currentIndex = draftTurns.currentTurnIndex;
            const currentTeam = currentOrder[currentIndex];

            // Marca come "ha draftato" (con flag skip)
            currentTeam.hasDrafted = true;
            currentTeam.skippedTurn = true;
            currentTeam.skipReason = 'voluntary';
            currentTeam.timeoutStrikes = 0; // Reset strikes per rinuncia volontaria

            console.log(`[RINUNCIA] ${currentTeam.teamName} ha rinunciato al pick nel round ${currentRound}`);

            // Assegna bonus CS per la rinuncia
            const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                const newBudget = (teamData.budget || 0) + DRAFT_SKIP_TURN_BONUS_CS;
                await updateDoc(teamDocRef, { budget: newBudget });
                console.log(`[RINUNCIA] ${currentTeam.teamName} riceve ${DRAFT_SKIP_TURN_BONUS_CS} CS (nuovo budget: ${newBudget})`);
            }

            // Invia notifica
            this.sendSkipTurnNotification(teamId, currentTeam.teamName, 'voluntary');

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
                        t.skippedTurn = false;
                        t.skipReason = null;
                    });

                    await setDoc(configDocRef, {
                        draftTurns: {
                            ...draftTurns,
                            [orderKey]: currentOrder,
                            [nextOrderKey]: nextOrder,
                            currentRound: nextRound,
                            currentTurnIndex: 0,
                            currentTeamId: nextOrder[0].teamId,
                            turnStartTime: Date.now(),
                            isStolenTurn: false,
                            turnExpired: false,
                            turnExpiredAt: null,
                            stolenFrom: null,
                            stolenBy: null
                        }
                    }, { merge: true });

                    console.log(`[RINUNCIA] Round ${currentRound} completato. Inizia Round ${nextRound}.`);
                    this.sendTurnNotification(nextOrder[0].teamId, nextOrder[0].teamName);

                } else {
                    // Draft completato - salva prima l'ultimo stato
                    await setDoc(configDocRef, {
                        draftTurns: {
                            ...draftTurns,
                            [orderKey]: currentOrder
                        }
                    }, { merge: true });

                    await this.stopDraftTurns(context);
                    console.log("[RINUNCIA] Draft completato! Tutti i round sono stati eseguiti.");
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
                        turnStartTime: Date.now(),
                        isStolenTurn: false,
                        turnExpired: false,
                        turnExpiredAt: null,
                        stolenFrom: null,
                        stolenBy: null
                    }
                }, { merge: true });

                console.log(`[RINUNCIA] Turno passato a: ${nextTeam.teamName}`);
                this.sendTurnNotification(nextTeam.teamId, nextTeam.teamName);
            }

            return {
                success: true,
                message: `Hai rinunciato al pick per questo round. Hai ricevuto ${DRAFT_SKIP_TURN_BONUS_CS} CS come compensazione.`
            };

        } catch (error) {
            console.error("Errore nella rinuncia al turno:", error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Verifica se e' il turno di una specifica squadra.
     * @param {Object} context - Contesto
     * @param {string} teamId - ID della squadra
     * @returns {Promise<Object>} - { isMyTurn, timeRemaining, position, totalTeams, currentRound, canSteal, ... }
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

        const { DRAFT_TURN_TIMEOUT_MS, DRAFT_STEAL_TIMEOUT_MS } = window.DraftConstants;
        const currentRound = draftState.currentRound;
        const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
        const currentOrder = draftState[orderKey];
        const currentTeamId = draftState.currentTeamId;
        // Converti turnStartTime se e' un Timestamp Firestore
        let turnStartTime = draftState.turnStartTime;
        if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
            turnStartTime = turnStartTime.toMillis();
        }
        const turnExpired = draftState.turnExpired || false;
        const isStolenTurn = draftState.isStolenTurn || false;

        const isMyTurn = currentTeamId === teamId;

        // Usa il timeout appropriato: normale (1h) o furto (10min)
        const currentTimeout = isStolenTurn ? DRAFT_STEAL_TIMEOUT_MS : DRAFT_TURN_TIMEOUT_MS;

        // Calcola tempo rimanente considerando la pausa notturna
        const isNightPause = window.DraftConstants.isNightPauseActive();
        const timeRemaining = window.DraftConstants.getEffectiveTimeRemaining(turnStartTime, currentTimeout);

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

        // Controlla se il team corrente puo' rubare il turno
        // Puo' rubare se: il turno e' scaduto, non e' il suo turno, e non ha ancora draftato
        const canSteal = turnExpired && !isMyTurn && !hasDraftedThisRound;

        // Conta gli strikes (furti subiti) del team corrente nel turno
        const currentTeamEntry = currentOrder.find(t => t.teamId === currentTeamId);
        const currentTeamStealStrikes = currentTeamEntry?.stealStrikes || 0;

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
            currentTeamName: currentOrder.find(t => t.teamId === currentTeamId)?.teamName || 'Sconosciuto',
            currentTeamId: currentTeamId,
            // Nuovi campi per il sistema "Ruba Turno"
            turnExpired,
            canSteal,
            isStolenTurn,
            currentTimeout, // 1h o 10min a seconda se e' turno rubato
            stealStrikes: teamEntry?.stealStrikes || 0,
            currentTeamStealStrikes,
            // Pausa notturna
            isNightPause,
            nightPauseStart: window.DraftConstants.DRAFT_NIGHT_PAUSE_START_HOUR,
            nightPauseEnd: window.DraftConstants.DRAFT_NIGHT_PAUSE_END_HOUR
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
    },

    /**
     * Notifica che un turno e' disponibile per essere rubato.
     * @param {string} victimTeamId - ID della squadra che ha fatto scadere il tempo
     * @param {string} victimTeamName - Nome della squadra
     */
    sendStealAvailableNotification(victimTeamId, victimTeamName) {
        console.log(`[Notifica] Turno di ${victimTeamName} disponibile per furto!`);

        // Dispatch evento custom per aggiornare UI
        document.dispatchEvent(new CustomEvent('draftTurnExpired', {
            detail: { victimTeamId, victimTeamName }
        }));

        // Notifica in-app
        if (window.Notifications && window.Notifications.add) {
            window.Notifications.add({
                type: 'draft_steal',
                title: 'Puoi Rubare il Turno!',
                message: `Il turno di ${victimTeamName} e' scaduto! Puoi rubarlo cliccando "Ruba Turno".`,
                action: { type: 'navigate', target: 'draft-content' }
            });
        }

        // Push browser notification (solo se l'utente corrente non e' la vittima)
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (currentTeamId && currentTeamId !== victimTeamId && currentTeamId !== 'admin') {
            this.sendBrowserPushNotification(
                '🏴‍☠️ Puoi rubare il turno!',
                `${victimTeamName} non ha scelto in tempo. Ruba il suo turno!`,
                'draft_steal'
            );
        }
    },

    /**
     * Notifica quando un giocatore viene assegnato automaticamente
     * dopo 5 furti subiti.
     * @param {string} teamId - ID della squadra
     * @param {string} teamName - Nome della squadra
     * @param {string} playerName - Nome del giocatore assegnato
     */
    sendAutoAssignNotification(teamId, teamName, playerName) {
        console.log(`[Notifica] ${playerName} assegnato automaticamente a ${teamName}`);

        // Push notification se e' l'utente corrente
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (currentTeamId === teamId) {
            this.sendBrowserPushNotification(
                'Giocatore Assegnato Automaticamente',
                `Dopo 5 furti subiti, ti e' stato assegnato ${playerName}.`,
                'warning'
            );

            // Notifica in-app
            if (window.Notifications && window.Notifications.add) {
                window.Notifications.add({
                    type: 'draft_turn',
                    title: 'Giocatore Assegnato',
                    message: `Hai subito 5 furti di turno. Ti e' stato assegnato automaticamente ${playerName}.`,
                    action: null
                });
            }
        }
    },

    /**
     * Invia notifica alla vittima quando il suo turno viene rubato.
     * @param {string} victimTeamId - ID della squadra vittima
     * @param {string} victimTeamName - Nome della squadra vittima
     * @param {string} stealerTeamName - Nome della squadra che ha rubato il turno
     */
    sendStealVictimNotification(victimTeamId, victimTeamName, stealerTeamName) {
        console.log(`[Notifica] ${stealerTeamName} ha rubato il turno a ${victimTeamName}`);

        // Notifica in-app (viene mostrata a tutti, ma e' rilevante solo per la vittima)
        if (window.Notifications && window.Notifications.add) {
            window.Notifications.add({
                type: 'draft_turn',
                title: 'Turno Rubato!',
                message: `${stealerTeamName} ha rubato il turno a ${victimTeamName}.`,
                action: 'draft',
                targetTeamId: victimTeamId // Per identificare la vittima
            });
        }

        // Push notification se l'utente corrente e' la vittima
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (currentTeamId === victimTeamId) {
            this.sendBrowserPushNotification(
                'Il tuo turno e\' stato rubato!',
                `${stealerTeamName} ha rubato il tuo turno nel draft. Sei stato spostato in fondo alla coda.`,
                'warning'
            );
        }

        // Dispatch evento custom per aggiornare UI
        document.dispatchEvent(new CustomEvent('draftTurnStolen', {
            detail: { victimTeamId, victimTeamName, stealerTeamName }
        }));
    }
};

console.log("Modulo Draft-Turns caricato.");
