//
// ====================================================================
// DRAFT-USER-UI.JS - Rendering Pannello Utente Draft
// ====================================================================
//

window.DraftUserUI = {

    /**
     * Renderizza il pannello utente del Draft
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    async render(context) {
        const { draftToolsContainer, draftBackButton, appContent, db, firestoreTools, paths, currentTeamId } = context;
        const { MAX_ROSA_PLAYERS, DRAFT_COOLDOWN_KEY, CONFIG_DOC_ID } = window.DraftConstants;
        const { displayMessage, clearCooldownInterval, startAcquisitionCountdown, checkCooldownStatus } = window.DraftUtils;

        draftBackButton.textContent = "Torna alla Dashboard";
        draftBackButton.onclick = () => {
            clearCooldownInterval();
            window.showScreen(appContent);
        };

        // Pulisce il timer all'inizio del rendering
        clearCooldownInterval();

        draftToolsContainer.innerHTML = `<p class="text-center text-gray-400">Verifica stato mercato...</p>`;

        const { doc, getDoc, collection, getDocs, query, where } = firestoreTools;
        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);

        try {
            const configDoc = await getDoc(configDocRef);
            const isDraftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;

            // Carica i dati della squadra
            const teamDocRef = doc(db, paths.TEAMS_COLLECTION_PATH, currentTeamId);
            const teamDoc = await getDoc(teamDocRef);
            const teamData = teamDoc.exists() ? teamDoc.data() : {};
            const budgetRimanente = teamData.budget || 0;
            const currentPlayers = teamData.players || [];

            // Controllo limite rosa
            const getPlayerCountExcludingIcona = window.getPlayerCountExcludingIcona;
            const currentRosaCount = getPlayerCountExcludingIcona(currentPlayers);
            const isRosaFull = currentRosaCount >= MAX_ROSA_PLAYERS;

            // Controllo cooldown
            const lastAcquisitionTimestamp = teamData[DRAFT_COOLDOWN_KEY] || 0;
            const { isCooldownActive } = checkCooldownStatus(lastAcquisitionTimestamp);

            // Messaggi stato
            let mainMessage = '';
            let secondaryMessageHtml = '';
            let disableAcquisition = false;

            if (!isDraftOpen) {
                mainMessage = 'DRAFT CHIUSO.';
                secondaryMessageHtml = '<p class="text-center text-lg text-gray-300 mt-2">Non è possibile acquistare giocatori al momento. Attendi che l\'Admin apra il Draft.</p>';
                disableAcquisition = true;
            } else if (isCooldownActive) {
                mainMessage = 'COOLDOWN ATTIVO.';
                secondaryMessageHtml = `<p class="text-center text-lg text-yellow-300 mt-2" id="draft-cooldown-timer">Caricamento timer...</p>`;
            } else if (isRosaFull) {
                mainMessage = 'ROSA AL COMPLETO.';
                secondaryMessageHtml = `<p class="text-center text-lg text-gray-300 mt-2">Licenzia un giocatore per acquistarne uno nuovo.</p>`;
                disableAcquisition = true;
            }

            if (isDraftOpen && !isCooldownActive && !isRosaFull) {
                // DRAFT APERTO E PRONTO
                const q = query(playersCollectionRef, where('isDrafted', '==', false));
                const playersSnapshot = await getDocs(q);

                const availablePlayers = playersSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(player => !player.isDrafted);

                draftToolsContainer.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-green-500 shadow-xl space-y-4">
                         <p class="text-center text-2xl font-extrabold text-white">
                            Budget: <span class="text-yellow-400">${budgetRimanente} CS</span>
                         </p>
                         <p class="text-center text-lg font-bold text-gray-300">
                             Rosa attuale: <span class="text-green-400">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                         </p>
                        <p class="text-center text-2xl font-extrabold text-green-400">DRAFT APERTO! Acquista ora.</p>
                        <p class="text-center text-lg text-gray-300">Giocatori disponibili: ${availablePlayers.length}</p>
                    </div>

                    <div id="available-players-list" class="mt-6 space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-800 rounded-lg">
                        ${availablePlayers.length > 0
                            ? availablePlayers.map(player => {
                                const isAffordable = budgetRimanente >= player.cost;
                                const canBuy = isAffordable && !disableAcquisition;

                                const buttonClass = canBuy ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' : 'bg-gray-500 text-gray-300 cursor-not-allowed';
                                const buttonText = isAffordable ? `Acquista (${player.cost} CS)` : `Costo ${player.cost} CS (No Budget)`;

                                return `
                                    <div class="flex justify-between items-center p-3 bg-gray-600 rounded-lg border border-yellow-500">
                                        <div>
                                            <p class="text-white font-semibold">${player.name} (${player.role}, ${player.age} anni) <span class="text-red-300">(${player.type || 'N/A'})</span></p>
                                            <p class="text-sm text-yellow-300">Livello: ${player.levelRange[0]}-${player.levelRange[1]} | Costo: ${player.cost} CS</p>
                                        </div>
                                        <button data-player-id="${player.id}"
                                                data-player-cost="${player.cost}"
                                                data-player-level-min="${player.levelRange[0]}"
                                                data-player-level-max="${player.levelRange[1]}"
                                                data-player-name="${player.name}"
                                                data-player-role="${player.role}"
                                                data-player-age="${player.age}"
                                                data-player-type="${player.type}"
                                                data-action="buy"
                                                ${canBuy ? '' : 'disabled'}
                                                class="text-sm px-4 py-2 rounded-lg font-bold transition duration-150 ${buttonClass}">
                                            ${buttonText}
                                        </button>
                                    </div>
                                `;
                            }).join('')
                            : '<p class="text-center text-red-400 font-semibold">Nessun calciatore disponibile al momento. Aspetta l\'inserimento di nuovi giocatori.</p>'
                        }
                    </div>
                    <p id="user-draft-message" class="text-center mt-3 text-red-400"></p>
                `;

                document.getElementById('available-players-list').addEventListener('click', (e) => {
                    window.DraftUserActions.handleUserDraftAction(e, context);
                });

            } else {
                // DRAFT CHIUSO O COOLDOWN ATTIVO O ROSA PIENA
                draftToolsContainer.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 shadow-xl space-y-4">
                        <p class="text-center text-2xl font-extrabold text-red-400">${mainMessage}</p>
                        <p class="text-center text-lg font-bold text-gray-300">
                             Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                        </p>
                        ${secondaryMessageHtml}
                    </div>
                `;

                if (isCooldownActive) {
                    // Avvia il cronometro se il cooldown è attivo
                    startAcquisitionCountdown(lastAcquisitionTimestamp, () => {
                        this.render(context);
                    });
                }
            }

        } catch (error) {
            console.error("Errore nel caricamento Draft Utente:", error);
            draftToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore nel caricamento del Draft. Riprova più tardi.</p>`;
        }
    }
};

console.log("Modulo Draft-User-UI caricato.");
