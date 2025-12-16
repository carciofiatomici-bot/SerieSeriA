//
// ====================================================================
// DRAFT-USER-ACTIONS.JS - Logica Acquisto Giocatori (Utente)
// ====================================================================
//

window.DraftUserActions = {

    // Lock per prevenire acquisti multipli simultanei (race condition fix)
    _purchaseLock: false,

    /**
     * Gestisce l'azione di acquisto di un giocatore (Utente).
     * @param {Event} event
     * @param {Object} context - Contesto con riferimenti
     */
    async handleUserDraftAction(event, context) {
        const { db, firestoreTools, paths, currentTeamId } = context;
        const { MAX_ROSA_PLAYERS } = window.DraftConstants;
        const { displayMessage, getRandomInt } = window.DraftUtils;
        const getPlayerCountExcludingIcona = window.getPlayerCountExcludingIcona;
        const calculatePlayerCost = window.calculatePlayerCost;
        const target = event.target;

        if (target.dataset.action === 'buy') {
            // LOCK: Prevenire acquisti multipli simultanei
            if (this._purchaseLock) {
                console.log("[Draft] Acquisto bloccato: operazione gia' in corso");
                return;
            }
            this._purchaseLock = true;

            const playerId = target.dataset.playerId;

            // VALIDAZIONE INPUT: usa parseIntSafe per prevenire valori non validi
            const parseIntSafe = window.parseIntSafe || ((v, min, max, def) => {
                const p = parseInt(v, 10);
                return isNaN(p) ? def : Math.max(min, Math.min(max, p));
            });

            const levelMin = parseIntSafe(target.dataset.playerLevelMin, 1, 30, 1);
            const levelMax = parseIntSafe(target.dataset.playerLevelMax, 1, 30, 30);

            // Raccogli gli altri dati necessari per la rosa
            const playerName = target.dataset.playerName || 'Giocatore';
            const playerRole = target.dataset.playerRole || 'C';
            const playerAge = parseIntSafe(target.dataset.playerAge, 16, 45, 25);
            const playerType = target.dataset.playerType || 'Tecnica';

            // Validazione: levelMin non puo' essere maggiore di levelMax
            if (levelMin > levelMax) {
                console.error('[Draft] Errore: levelMin > levelMax', { levelMin, levelMax });
                this._purchaseLock = false;
                return;
            }

            displayMessage(`Acquisto di ${playerName} in corso...`, 'info', 'user-draft-message');
            target.disabled = true;

            // Disabilita TUTTI i bottoni di acquisto per prevenire click multipli
            const allBuyButtons = document.querySelectorAll('[data-action="buy"]');
            allBuyButtons.forEach(btn => btn.disabled = true);

            try {
                const { doc, getDoc, updateDoc } = firestoreTools;
                const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, currentTeamId);
                const playerDraftDocRef = doc(db, paths.DRAFT_PLAYERS_COLLECTION_PATH, playerId);

                // 1. Ottieni i dati attuali della squadra e del giocatore draft
                const [teamDoc, playerDraftDoc] = await Promise.all([
                    getDoc(teamDocRef),
                    getDoc(playerDraftDocRef)
                ]);

                if (!teamDoc.exists()) throw new Error("Squadra non trovata.");
                if (!playerDraftDoc.exists()) throw new Error("Giocatore non trovato nel draft.");

                const teamData = teamDoc.data();
                const playerDraftData = playerDraftDoc.data();
                const currentBudget = teamData.budget || 0;
                const currentPlayers = teamData.players || [];

                // Recupera le abilita del giocatore dal draft
                const playerAbilities = playerDraftData.abilities || [];

                // GUARD: Verifica che il giocatore non sia gia' stato draftato
                if (playerDraftData.isDrafted) {
                    throw new Error("Questo giocatore e' gia' stato draftato da un'altra squadra!");
                }

                // Verifica che sia il turno dell'utente (se il draft a turni e' attivo)
                const turnInfo = await window.DraftTurns.checkTeamTurn(context, currentTeamId);
                if (turnInfo.draftActive && !turnInfo.isMyTurn) {
                    throw new Error("Non e' il tuo turno! Attendi il tuo turno per draftare.");
                }
                if (turnInfo.draftActive && turnInfo.hasDraftedThisRound) {
                    throw new Error("Hai gia' draftato in questo round!");
                }

                // Controllo limite rosa
                const currentRosaCount = getPlayerCountExcludingIcona(currentPlayers);
                if (currentRosaCount >= MAX_ROSA_PLAYERS) {
                    throw new Error(`Limite massimo di ${MAX_ROSA_PLAYERS} giocatori raggiunto (esclusa Icona).`);
                }

                // 2. Assegna Livello Casuale
                const finalLevel = getRandomInt(levelMin, levelMax);

                // 3. Calcola il costo dinamico in base al livello generato e alle abilita
                const finalCost = calculatePlayerCost(finalLevel, playerAbilities);

                // 4. Verifica Budget con il costo calcolato
                if (currentBudget < finalCost) {
                    throw new Error(`Crediti Seri insufficienti. Costo calcolato: ${finalCost} CS (Livello: ${finalLevel}).`);
                }

                // 5. Prepara il Giocatore per la Rosa della Squadra
                let playerForSquad = {
                    id: playerId,
                    name: playerName,
                    role: playerRole,
                    age: playerAge,
                    cost: finalCost,
                    level: finalLevel,
                    type: playerType,
                    abilities: playerAbilities,
                    isCaptain: false
                };

                // Inizializza contratto se sistema contratti attivo
                if (window.Contracts?.isEnabled()) {
                    playerForSquad = window.Contracts.initializeContract(playerForSquad);
                }

                // Genera secretMaxLevel per giocatori normali (sistema livello massimo segreto)
                if (window.PlayerExp?.isSubjectToSecretMaxLevel(playerForSquad)) {
                    playerForSquad.secretMaxLevel = window.PlayerExp.generateSecretMaxLevel(finalLevel);
                }

                // 6. GUARD FINALE: Ricarica lo stato del giocatore draft per evitare race condition
                const playerFreshDoc = await getDoc(playerDraftDocRef);
                if (!playerFreshDoc.exists()) {
                    throw new Error("Giocatore non piu' disponibile.");
                }
                const playerFreshData = playerFreshDoc.data();
                if (playerFreshData.isDrafted) {
                    throw new Error("Giocatore appena draftato da un'altra squadra! Riprova con un altro.");
                }

                // 7. GUARD FINALE: Ricarica lo stato del turno per evitare race condition
                if (turnInfo.draftActive) {
                    const freshTurnInfo = await window.DraftTurns.checkTeamTurn(context, currentTeamId);
                    if (!freshTurnInfo.isMyTurn) {
                        throw new Error("Il tuo turno e' appena terminato! Attendi il prossimo.");
                    }
                    if (freshTurnInfo.hasDraftedThisRound) {
                        throw new Error("Hai gia' completato il tuo turno in questo round!");
                    }
                }

                // 8. Aggiorna Firestore - Giocatore Draft PRIMA (per marcare come draftato)
                await updateDoc(playerDraftDocRef, {
                    isDrafted: true,
                    teamId: currentTeamId,
                    draftedBy: currentTeamId,
                    draftedAt: new Date().toISOString(),
                    level: finalLevel // Salva il livello assegnato per visualizzarlo nei pick effettuati
                });

                // 9. Aggiorna Firestore - Squadra
                await updateDoc(teamDocRef, {
                    budget: currentBudget - finalCost,
                    players: [...currentPlayers, playerForSquad]
                });

                displayMessage(`Acquisto Riuscito! ${playerName} (Lv.${finalLevel}) e' nella tua rosa. Costo: ${finalCost} CS. Budget: ${currentBudget - finalCost} CS.`, 'success', 'user-draft-message');

                // 10. Se il draft a turni e' attivo, passa al turno successivo
                if (turnInfo.draftActive) {
                    await window.DraftTurns.advanceToNextTurn(context, true);
                }

                // Ricarica la lista
                setTimeout(() => {
                    window.DraftUserUI.render(context);
                }, 1500);

                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            } catch (error) {
                console.error("Errore durante l'acquisto:", error);
                displayMessage(`Acquisto Fallito: ${error.message}`, 'error', 'user-draft-message');
                target.disabled = false;
                // Riabilita tutti i bottoni in caso di errore
                const allBuyButtons = document.querySelectorAll('[data-action="buy"]');
                allBuyButtons.forEach(btn => btn.disabled = false);
            } finally {
                // RILASCIA IL LOCK sempre, sia in caso di successo che di errore
                this._purchaseLock = false;
            }
        }
    }
};

console.log("Modulo Draft-User-Actions caricato.");
