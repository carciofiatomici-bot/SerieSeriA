//
// ====================================================================
// DRAFT-USER-UI.JS - Rendering Pannello Utente Draft
// ====================================================================
//

window.DraftUserUI = {

    // Timer per aggiornare il countdown
    turnTimerInterval: null,

    // Listener real-time per lo stato del Draft
    configUnsubscribe: null,

    // Contesto salvato per il re-render
    savedContext: null,

    /**
     * Ferma il listener real-time
     */
    stopConfigListener() {
        if (this.configUnsubscribe) {
            this.configUnsubscribe();
            this.configUnsubscribe = null;
            console.log("Draft: listener config fermato");
        }
    },

    /**
     * Avvia il listener real-time per lo stato del Draft
     */
    startConfigListener(context) {
        const { db, firestoreTools, paths } = context;
        const { CONFIG_DOC_ID } = window.DraftConstants;
        const { doc, onSnapshot } = firestoreTools;

        // Ferma listener precedente
        this.stopConfigListener();

        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        this.configUnsubscribe = onSnapshot(configDocRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const configData = snapshot.data();
            const isDraftOpen = configData.isDraftOpen || false;

            console.log("Draft real-time update - isDraftOpen:", isDraftOpen);

            // Se siamo ancora nella pagina Draft, aggiorna l'UI
            const draftContent = document.getElementById('draft-content');
            if (draftContent && !draftContent.classList.contains('hidden')) {
                // Re-renderizza il pannello
                this.render(this.savedContext || context);
            }
        }, (error) => {
            console.error("Errore listener config Draft:", error);
        });
    },

    /**
     * Renderizza il pannello utente del Draft
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    async render(context) {
        console.log("DraftUserUI.render() chiamato con context:", context);

        // Salva il contesto per il re-render
        this.savedContext = context;

        const { draftToolsContainer, draftBackButton, appContent, db, firestoreTools, paths, currentTeamId } = context;
        const { MAX_ROSA_PLAYERS, CONFIG_DOC_ID, DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants;
        const { displayMessage } = window.DraftUtils;

        console.log("DraftUserUI - currentTeamId:", currentTeamId, "paths:", paths);

        // Pulisce il timer precedente
        this.clearTurnTimer();

        draftBackButton.textContent = "Torna alla Dashboard";
        draftBackButton.onclick = () => {
            this.clearTurnTimer();
            this.stopConfigListener();
            window.showScreen(appContent);
        };

        draftToolsContainer.innerHTML = `<p class="text-center text-gray-400">Verifica stato mercato...</p>`;

        // Verifica che currentTeamId sia valido
        if (!currentTeamId) {
            draftToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: ID squadra non trovato. Riprova ad accedere dalla dashboard.</p>`;
            console.error("currentTeamId non definito nel contesto Draft utente");
            return;
        }

        // Avvia il listener real-time (solo se non gia' attivo)
        if (!this.configUnsubscribe) {
            this.startConfigListener(context);
        }

        const { doc, getDoc, collection, getDocs, query, where } = firestoreTools;
        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);

        try {
            const configDoc = await getDoc(configDocRef);
            const configData = configDoc.exists() ? configDoc.data() : {};
            const isDraftOpen = configData.isDraftOpen || false;
            const draftTurns = configData.draftTurns || null;
            const isDraftTurnsActive = draftTurns && draftTurns.isActive;

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

            // Se il draft a turni e' attivo, controlla se e' il turno dell'utente
            let turnInfo = null;
            if (isDraftTurnsActive && window.DraftTurns && window.DraftTurns.checkTeamTurn) {
                try {
                    turnInfo = await window.DraftTurns.checkTeamTurn(context, currentTeamId);
                } catch (turnError) {
                    console.error("Errore nel controllo turno:", turnError);
                    turnInfo = null;
                }
            }

            // Determina lo stato da mostrare
            if (!isDraftOpen) {
                // DRAFT CHIUSO
                draftToolsContainer.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 shadow-xl space-y-4">
                        <p class="text-center text-2xl font-extrabold text-red-400">DRAFT CHIUSO</p>
                        <p class="text-center text-lg font-bold text-gray-300">
                             Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                        </p>
                        <p class="text-center text-lg text-gray-300 mt-2">Non e' possibile acquistare giocatori al momento. Attendi che l'Admin apra il Draft.</p>
                    </div>
                `;

            } else if (isDraftTurnsActive) {
                // DRAFT A TURNI ATTIVO
                await this.renderDraftTurnsUI(context, turnInfo, budgetRimanente, currentRosaCount, isRosaFull);

            } else {
                // DRAFT APERTO MA SENZA TURNI (fallback - non dovrebbe succedere con la nuova logica)
                draftToolsContainer.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-yellow-500 shadow-xl space-y-4">
                        <p class="text-center text-2xl font-extrabold text-yellow-400">DRAFT APERTO</p>
                        <p class="text-center text-lg font-bold text-gray-300">
                             Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                        </p>
                        <p class="text-center text-lg text-gray-300 mt-2">In attesa che l'Admin generi la lista del draft...</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error("Errore nel caricamento Draft Utente:", error);
            draftToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore nel caricamento del Draft. Riprova piu' tardi.</p>`;
        }
    },

    /**
     * Renderizza l'UI per il draft a turni
     */
    async renderDraftTurnsUI(context, turnInfo, budgetRimanente, currentRosaCount, isRosaFull) {
        const { draftToolsContainer, db, firestoreTools, paths } = context;
        const { MAX_ROSA_PLAYERS, DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants;
        const { collection, getDocs, query, where } = firestoreTools;

        if (turnInfo.hasDraftedThisRound) {
            // L'utente ha gia' draftato in questo round
            draftToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-green-500 shadow-xl space-y-4">
                    <p class="text-center text-2xl font-extrabold text-green-400">HAI GIA' DRAFTATO!</p>
                    <p class="text-center text-lg text-gray-300">
                        Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                    </p>
                    <p class="text-center text-lg font-bold text-gray-300">
                         Rosa attuale: <span class="text-green-400">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                    </p>
                    <p class="text-center text-gray-400 mt-2">Attendi il prossimo round o la fine del draft.</p>
                    <div class="mt-4 p-3 bg-gray-800 rounded-lg">
                        <p class="text-sm text-gray-400">Turno corrente: <span class="text-yellow-400 font-bold">${turnInfo.currentTeamName}</span></p>
                    </div>
                </div>
            `;
            return;
        }

        if (!turnInfo.isMyTurn) {
            // Non e' il turno dell'utente
            const timeRemaining = turnInfo.timeRemaining;
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);

            draftToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-yellow-500 shadow-xl space-y-4">
                    <p class="text-center text-2xl font-extrabold text-yellow-400">IN ATTESA DEL TUO TURNO</p>
                    <p class="text-center text-lg text-gray-300">
                        Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                    </p>
                    <p class="text-center text-lg font-bold text-gray-300">
                         Rosa attuale: <span class="${isRosaFull ? 'text-red-400' : 'text-green-400'}">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                    </p>

                    <div class="mt-4 p-4 bg-gray-800 rounded-lg border border-yellow-600">
                        <p class="text-center text-gray-300">Turno corrente:</p>
                        <p class="text-center text-2xl font-bold text-yellow-400">${turnInfo.currentTeamName}</p>
                        <p class="text-center text-sm text-gray-400 mt-2">
                            Tempo rimanente: <span id="draft-turn-countdown" class="text-white font-bold">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>
                        </p>
                    </div>

                    <div class="mt-4 p-3 bg-gray-800 rounded-lg">
                        <p class="text-sm text-gray-400">La tua posizione in coda: <span class="text-cyan-400 font-bold">${turnInfo.position + 1}</span> su ${turnInfo.totalTeams} squadre rimanenti</p>
                    </div>

                    <button id="btn-refresh-draft" class="w-full mt-4 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500 transition">
                        Aggiorna Stato
                    </button>
                </div>
            `;

            // Avvia il countdown
            this.startTurnCountdown(context, turnInfo.timeRemaining);

            // Event listener per il refresh
            document.getElementById('btn-refresh-draft').addEventListener('click', () => {
                this.render(context);
            });

            return;
        }

        // E' IL TURNO DELL'UTENTE!
        if (isRosaFull) {
            // Rosa piena
            draftToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 shadow-xl space-y-4">
                    <p class="text-center text-2xl font-extrabold text-green-400">E' IL TUO TURNO!</p>
                    <p class="text-center text-xl font-extrabold text-red-400">MA LA ROSA E' PIENA</p>
                    <p class="text-center text-lg text-gray-300">
                        Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                    </p>
                    <p class="text-center text-lg font-bold text-gray-300">
                         Rosa attuale: <span class="text-red-400">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                    </p>
                    <p class="text-center text-gray-300 mt-2">Licenzia un giocatore dalla tua rosa per poter draftare.</p>
                    <div class="mt-4 p-3 bg-red-900 rounded-lg">
                        <p class="text-center text-sm text-red-300">
                            Tempo rimanente: <span id="draft-turn-countdown" class="text-white font-bold">--:--</span>
                        </p>
                    </div>
                </div>
            `;
            this.startTurnCountdown(context, turnInfo.timeRemaining);
            return;
        }

        // Carica i giocatori disponibili
        const playersCollectionRef = collection(db, paths.DRAFT_PLAYERS_COLLECTION_PATH);
        const q = query(playersCollectionRef, where('isDrafted', '==', false));
        const playersSnapshot = await getDocs(q);

        const availablePlayers = playersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(player => !player.isDrafted);

        const timeRemaining = turnInfo.timeRemaining;
        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);

        draftToolsContainer.innerHTML = `
            <div class="p-6 bg-gray-700 rounded-lg border-2 border-green-500 shadow-xl space-y-4">
                <p class="text-center text-3xl font-extrabold text-green-400 animate-pulse">E' IL TUO TURNO!</p>
                <p class="text-center text-lg text-gray-300">
                    Round ${turnInfo.currentRound} / ${turnInfo.totalRounds}
                </p>
                <p class="text-center text-2xl font-extrabold text-white">
                    Budget: <span class="text-yellow-400">${budgetRimanente} CS</span>
                </p>
                <p class="text-center text-lg font-bold text-gray-300">
                     Rosa attuale: <span class="text-green-400">${currentRosaCount}</span> / ${MAX_ROSA_PLAYERS} giocatori (+ Icona)
                </p>

                <div class="p-3 bg-yellow-900 rounded-lg border border-yellow-500">
                    <p class="text-center text-sm text-yellow-300">
                        Tempo rimanente: <span id="draft-turn-countdown" class="text-2xl text-white font-bold">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>
                    </p>
                </div>
            </div>

            <div id="available-players-list" class="mt-6 space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-800 rounded-lg">
                ${availablePlayers.length > 0
                    ? availablePlayers.map(player => {
                        const isAffordable = budgetRimanente >= player.cost;
                        const canBuy = isAffordable;

                        const buttonClass = canBuy ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' : 'bg-gray-500 text-gray-300 cursor-not-allowed';
                        const buttonText = isAffordable ? `Drafta (${player.cost} CS)` : `Costo ${player.cost} CS (No Budget)`;

                        // Mostra abilita se presenti
                        const abilitiesText = player.abilities && player.abilities.length > 0
                            ? `<span class="text-purple-300 text-xs ml-2">[${player.abilities.join(', ')}]</span>`
                            : '';

                        return `
                            <div class="flex justify-between items-center p-3 bg-gray-600 rounded-lg border border-yellow-500">
                                <div>
                                    <p class="text-white font-semibold">${player.name} (${player.role}, ${player.age} anni) <span class="text-red-300">(${player.type || 'N/A'})</span>${abilitiesText}</p>
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
                    : '<p class="text-center text-red-400 font-semibold">Nessun calciatore disponibile al momento.</p>'
                }
            </div>
            <p id="user-draft-message" class="text-center mt-3 text-red-400"></p>
        `;

        // Avvia il countdown
        this.startTurnCountdown(context, turnInfo.timeRemaining);

        // Event listener per l'acquisto
        document.getElementById('available-players-list').addEventListener('click', (e) => {
            window.DraftUserActions.handleUserDraftAction(e, context);
        });
    },

    /**
     * Avvia il countdown del turno
     */
    startTurnCountdown(context, initialTimeRemaining) {
        this.clearTurnTimer();

        let timeRemaining = initialTimeRemaining;
        const countdownElement = document.getElementById('draft-turn-countdown');

        const updateCountdown = () => {
            if (!countdownElement) {
                this.clearTurnTimer();
                return;
            }

            timeRemaining -= 1000;

            if (timeRemaining <= 0) {
                countdownElement.textContent = '00:00';
                countdownElement.classList.add('text-red-500');
                this.clearTurnTimer();
                // Ricarica per aggiornare lo stato
                setTimeout(() => this.render(context), 2000);
                return;
            }

            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            countdownElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Cambia colore quando mancano meno di 5 minuti
            if (timeRemaining < 5 * 60 * 1000) {
                countdownElement.classList.add('text-red-400');
            }
        };

        // Aggiorna subito
        updateCountdown();

        // Poi ogni secondo
        this.turnTimerInterval = setInterval(updateCountdown, 1000);
    },

    /**
     * Pulisce il timer del turno
     */
    clearTurnTimer() {
        if (this.turnTimerInterval) {
            clearInterval(this.turnTimerInterval);
            this.turnTimerInterval = null;
        }
    }
};

console.log("Modulo Draft-User-UI caricato.");
