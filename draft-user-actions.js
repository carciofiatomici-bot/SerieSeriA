//
// ====================================================================
// DRAFT-USER-ACTIONS.JS - Logica Acquisto Giocatori (Utente)
// ====================================================================
//

window.DraftUserActions = {

    /**
     * Gestisce l'azione di acquisto di un giocatore (Utente).
     * @param {Event} event
     * @param {Object} context - Contesto con riferimenti
     */
    async handleUserDraftAction(event, context) {
        const { db, firestoreTools, paths, currentTeamId } = context;
        const { ACQUISITION_COOLDOWN_MS, DRAFT_COOLDOWN_KEY, MAX_ROSA_PLAYERS } = window.DraftConstants;
        const { displayMessage, getRandomInt } = window.DraftUtils;
        const getPlayerCountExcludingIcona = window.getPlayerCountExcludingIcona;
        const target = event.target;

        if (target.dataset.action === 'buy') {
            const playerId = target.dataset.playerId;
            const playerCost = parseInt(target.dataset.playerCost);
            const levelMin = parseInt(target.dataset.playerLevelMin);
            const levelMax = parseInt(target.dataset.playerLevelMax);

            // Raccogli gli altri dati necessari per la rosa
            const playerName = target.dataset.playerName;
            const playerRole = target.dataset.playerRole;
            const playerAge = parseInt(target.dataset.playerAge);
            const playerType = target.dataset.playerType;

            displayMessage(`Acquisto di ${playerName} in corso...`, 'info', 'user-draft-message');
            target.disabled = true;

            try {
                const { doc, getDoc, updateDoc } = firestoreTools;
                const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, currentTeamId);
                const playerDraftDocRef = doc(db, paths.DRAFT_PLAYERS_COLLECTION_PATH, playerId);

                // 1. Ottieni i dati attuali della squadra
                const teamDoc = await getDoc(teamDocRef);
                if (!teamDoc.exists()) throw new Error("Squadra non trovata.");

                const teamData = teamDoc.data();
                const currentBudget = teamData.budget || 0;
                const currentPlayers = teamData.players || [];

                // Controllo cooldown
                const lastAcquisitionTimestamp = teamData[DRAFT_COOLDOWN_KEY] || 0;
                const currentTime = new Date().getTime();
                const timeElapsed = currentTime - lastAcquisitionTimestamp;

                if (lastAcquisitionTimestamp !== 0 && timeElapsed < ACQUISITION_COOLDOWN_MS) {
                    const minutes = Math.ceil((ACQUISITION_COOLDOWN_MS - timeElapsed) / (60 * 1000));
                    throw new Error(`Devi aspettare ${minutes} minuti prima del prossimo acquisto.`);
                }

                // Controllo limite rosa
                const currentRosaCount = getPlayerCountExcludingIcona(currentPlayers);
                if (currentRosaCount >= MAX_ROSA_PLAYERS) {
                    throw new Error(`Limite massimo di ${MAX_ROSA_PLAYERS} giocatori raggiunto (esclusa Icona).`);
                }

                // 2. Verifica Budget
                if (currentBudget < playerCost) {
                    throw new Error("Crediti Seri insufficienti.");
                }

                // 3. Assegna Livello Casuale
                const finalLevel = getRandomInt(levelMin, levelMax);

                // 4. Prepara il Giocatore per la Rosa della Squadra
                const playerForSquad = {
                    id: playerId,
                    name: playerName,
                    role: playerRole,
                    age: playerAge,
                    cost: playerCost,
                    level: finalLevel,
                    type: playerType,
                    isCaptain: false
                };

                // 5. Aggiorna Firestore
                const acquisitionTime = new Date().getTime();

                // Transazione 1: Aggiorna il documento della squadra
                await updateDoc(teamDocRef, {
                    budget: currentBudget - playerCost,
                    players: [...currentPlayers, playerForSquad],
                    [DRAFT_COOLDOWN_KEY]: acquisitionTime,
                });

                // Transazione 2: Aggiorna il documento del giocatore Draft
                await updateDoc(playerDraftDocRef, {
                    isDrafted: true,
                    teamId: currentTeamId,
                });

                displayMessage(`Acquisto Riuscito! ${playerName} (${finalLevel}) è nella tua rosa. Budget: ${currentBudget - playerCost} CS.`, 'success', 'user-draft-message');

                // Ricarica la lista
                window.DraftUserUI.render(context);
                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            } catch (error) {
                console.error("Errore durante l'acquisto:", error);
                displayMessage(`Acquisto Fallito: ${error.message}`, 'error', 'user-draft-message');
                target.disabled = false;
            }
        }
    }
};

console.log("Modulo Draft-User-Actions caricato.");
