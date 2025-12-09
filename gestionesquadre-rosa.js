//
// ====================================================================
// GESTIONESQUADRE-ROSA.JS - Gestione Rosa e Licenziamenti
// ====================================================================
//

window.GestioneSquadreRosa = {

    /**
     * Renderizza il pannello di gestione rosa
     * @param {Object} teamData - Dati della squadra
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    render(teamData, context) {
        const { squadraMainTitle, squadraSubtitle, squadraToolsContainer, currentTeamId, loadTeamDataFromFirestore } = context;
        const { TYPE_ICONS } = window.GestioneSquadreConstants;
        const { displayMessage, sortPlayersByRole, getTypeIconHtml } = window.GestioneSquadreUtils;

        squadraMainTitle.textContent = "Gestione Rosa";
        squadraSubtitle.textContent = `Budget Rimanente: ${teamData.budget} Crediti Seri | Giocatori in rosa: ${window.getPlayerCountExcludingIcona(teamData.players)}/${window.InterfacciaConstants.MAX_ROSA_PLAYERS} (+ Icona)`;

        const sortedPlayers = sortPlayersByRole(teamData.players);

        squadraToolsContainer.innerHTML = `
            <div class="bg-gray-700 p-6 rounded-lg border border-green-500">
                <h3 class="text-2xl font-bold text-green-400 mb-4">I Tuoi Calciatori (Ordinati per Icona, Ruolo e Livello)</h3>
                <div id="player-list-message" class="text-center mb-4 text-green-500"></div>

                <button id="btn-replace-icona"
                        class="w-full bg-orange-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-orange-500 transition duration-150 transform hover:scale-[1.01] mb-4">
                    Sostituisci Icona (Costo: 500 CS)
                </button>

                <div id="player-list" class="space-y-3">
                    ${sortedPlayers.length === 0
                        ? '<p class="text-gray-400">Nessun calciatore in rosa. Vai al Draft per acquistarne!</p>'
                        : sortedPlayers.map(player => this.renderPlayerCard(player, teamData, TYPE_ICONS)).join('')
                    }
                </div>
            </div>
        `;

        this.attachEventListeners(context);
    },

    /**
     * Renderizza una singola card giocatore
     */
    renderPlayerCard(player, teamData, TYPE_ICONS) {
        const refundCost = player.cost > 0 ? Math.floor(player.cost / 2) : 0;
        const isCaptain = player.isCaptain;
        const isIcona = player.abilities && player.abilities.includes('Icona');
        const captainMarker = isCaptain ? ' (CAPITANO)' : '';

        // Avatar Icona
        let iconaAvatarHtml = '';
        let iconaMarker = '';

        if (isIcona) {
            const iconaData = teamData.players.find(p => p.abilities && p.abilities.includes('Icona') && p.id === player.id) || {};
            const avatarUrl = iconaData.photoUrl && iconaData.photoUrl.includes('http')
                            ? iconaData.photoUrl
                            : 'https://placehold.co/40x40/facc15/000?text=I';

            iconaAvatarHtml = `
                <img src="${avatarUrl}" alt="Avatar Icona" class="w-10 h-10 rounded-full border-2 border-yellow-400 mr-3 object-cover">
            `;
            iconaMarker = ' <span class="bg-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full text-xs font-extrabold">ICONA</span>';
        }

        const isCaptainClass = isCaptain ? 'text-orange-400 font-extrabold' : 'text-white font-semibold';

        // Tipologia
        const playerType = player.type || 'N/A';
        const typeData = TYPE_ICONS[playerType] || TYPE_ICONS['N/A'];
        const typeIconHtml = `<i class="${typeData.icon} ${typeData.color} text-lg ml-2" title="Tipo: ${playerType}"></i>`;

        // Abilita
        const playerAbilities = (player.abilities || []).filter(a => a !== 'Icona');
        const abilitiesHtml = playerAbilities.length > 0
            ? `<p class="text-xs text-indigo-300 mt-1">Abilita: ${playerAbilities.join(', ')}</p>`
            : `<p class="text-xs text-gray-500 mt-1">Abilita: Nessuna</p>`;

        // Pulsante Capitano
        const captainButton = isCaptain
            ? `<button class="bg-gray-500 text-gray-300 text-sm px-4 py-2 rounded-lg cursor-default shadow-md" disabled>Capitano Attuale</button>`
            : `<button data-player-id="${player.id}"
                    data-player-name="${player.name}"
                    data-action="assign-captain"
                    class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-150 shadow-md">
                Nomina Capitano
            </button>`;

        // Bottone Licenziamento
        const isLicenziabile = !isIcona;
        const licenziaButton = `
            <button data-player-id="${player.id}"
                    data-original-cost="${player.cost}"
                    data-refund-cost="${refundCost}"
                    data-player-name="${player.name}"
                    data-action="licenzia"
                    class="bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition duration-150 shadow-md
                    ${isLicenziabile ? 'hover:bg-red-700' : 'opacity-50 cursor-not-allowed'}"
                    ${isLicenziabile ? '' : 'disabled'}>
                Licenzia (Rimborso: ${refundCost} CS)
            </button>
        `;

        return `
            <div class="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg border border-green-700">
                <div class="flex items-center mb-2 sm:mb-0 sm:w-1/2">
                    ${iconaAvatarHtml}
                    <div>
                        <span class="${isCaptainClass}">${player.name}${captainMarker}</span>
                        ${iconaMarker}
                        <span class="text-yellow-400">(${player.role})</span>
                        ${typeIconHtml}
                        <p class="text-sm text-gray-400">Livello: ${player.level || player.currentLevel || 1} | Acquistato per: ${player.cost || 0} CS</p>
                        ${abilitiesHtml}
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto items-center">
                    ${captainButton}
                    ${licenziaButton}
                </div>
            </div>
        `;
    },

    /**
     * Collega gli event listener
     */
    attachEventListeners(context) {
        const { currentTeamId, loadTeamDataFromFirestore, currentTeamData, db, firestoreTools, TEAMS_COLLECTION_PATH, DRAFT_PLAYERS_COLLECTION_PATH, MARKET_PLAYERS_COLLECTION_PATH } = context;
        const { displayMessage } = window.GestioneSquadreUtils;

        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.addEventListener('click', (e) => {
                const target = e.target;
                if (target.dataset.action === 'licenzia' || target.dataset.action === 'confirm-licenzia') {
                    this.handleRosaAction(e, context);
                } else if (target.dataset.action === 'assign-captain') {
                    this.handleCaptainAssignment(target.dataset.playerId, target.dataset.playerName, context);
                }
            });
        }

        document.getElementById('btn-replace-icona').addEventListener('click', () => {
            loadTeamDataFromFirestore(currentTeamId, 'icona-swap');
        });
    },

    /**
     * Gestisce l'assegnazione del Capitano
     */
    async handleCaptainAssignment(newCaptainId, newCaptainName, context) {
        const { db, firestoreTools, TEAMS_COLLECTION_PATH, currentTeamId, currentTeamData, loadTeamDataFromFirestore } = context;
        const { displayMessage } = window.GestioneSquadreUtils;
        const msgContainerId = 'player-list-message';

        displayMessage(msgContainerId, `Tentativo di nominare ${newCaptainName} Capitano...`, 'info');

        try {
            const { doc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            const updatedPlayers = currentTeamData.players.map(player => {
                const isNewCaptain = player.id === newCaptainId;
                return {
                    ...player,
                    isCaptain: isNewCaptain,
                };
            });

            await updateDoc(teamDocRef, {
                players: updatedPlayers,
                formation: {
                    ...currentTeamData.formation,
                    titolari: currentTeamData.formation.titolari.map(p => ({
                        ...p,
                        isCaptain: p.id === newCaptainId
                    })),
                    panchina: currentTeamData.formation.panchina.map(p => ({
                        ...p,
                        isCaptain: p.id === newCaptainId
                    })),
                }
            });

            window.InterfacciaCore.currentTeamData.players = updatedPlayers;
            currentTeamData.players = updatedPlayers;

            displayMessage(msgContainerId, `${newCaptainName} e il nuovo Capitano!`, 'success');

            loadTeamDataFromFirestore(currentTeamId, 'rosa');

            if (window.InterfacciaDashboard && window.InterfacciaCore.currentTeamId) {
                window.InterfacciaDashboard.reloadTeamDataAndUpdateUI(window.elements);
            }

        } catch (error) {
            console.error("Errore nell'assegnazione del Capitano:", error);
            displayMessage(msgContainerId, `Errore: Impossibile nominare ${newCaptainName} Capitano. ${error.message}`, 'error');
        }
    },

    /**
     * Gestisce le azioni sulla rosa (licenziamento)
     */
    async handleRosaAction(event, context) {
        const { db, firestoreTools, TEAMS_COLLECTION_PATH, DRAFT_PLAYERS_COLLECTION_PATH, MARKET_PLAYERS_COLLECTION_PATH, currentTeamId, currentTeamData, loadTeamDataFromFirestore } = context;
        const { displayMessage } = window.GestioneSquadreUtils;
        const target = event.target;
        const msgContainerId = 'player-list-message';

        if (!target.dataset.playerId) return;

        const playerId = target.dataset.playerId;
        const playerName = target.dataset.playerName;
        const refundCost = parseInt(target.dataset.refundCost);

        if (target.dataset.action === 'licenzia') {
            const playerInRosa = currentTeamData.players.find(p => p.id === playerId);
            if (playerInRosa && playerInRosa.isCaptain) {
                displayMessage(msgContainerId, `ERRORE: Non puoi licenziare il Capitano attuale! Assegna prima un nuovo Capitano.`, 'error');
                return;
            }
            if (playerInRosa && playerInRosa.abilities && playerInRosa.abilities.includes('Icona')) {
                displayMessage(msgContainerId, `ERRORE: Non puoi licenziare l'Icona del club!`, 'error');
                return;
            }

            target.textContent = `CONFERMA? (+${refundCost} CS)`;
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-licenzia';
            return;
        }

        if (target.dataset.action === 'confirm-licenzia') {
            target.textContent = 'Esecuzione...';
            target.disabled = true;
            displayMessage(msgContainerId, `Licenziamento di ${playerName} in corso...`, 'info');

            try {
                const { doc, getDoc, updateDoc, setDoc, deleteDoc, deleteField } = firestoreTools;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
                const draftDocRef = doc(db, DRAFT_PLAYERS_COLLECTION_PATH, playerId);
                const marketDocRef = doc(db, MARKET_PLAYERS_COLLECTION_PATH, playerId);

                const playerInRosa = currentTeamData.players.find(p => p.id === playerId);
                if (!playerInRosa) {
                    throw new Error("Dati giocatore non trovati nella rosa!");
                }

                const draftDoc = await getDoc(draftDocRef);
                const marketDoc = await getDoc(marketDocRef);

                const wasInDraft = draftDoc.exists();
                const docExistsInMarket = marketDoc.exists();

                const teamDoc = await getDoc(teamDocRef);
                const teamData = teamDoc.data();
                const currentPlayers = teamData.players || [];

                const updatedPlayers = currentPlayers.filter(p => p.id !== playerId);
                const updatedTitolari = teamData.formation.titolari.filter(p => p.id !== playerId);
                const updatedPanchina = teamData.formation.panchina.filter(p => p.id !== playerId);

                const formStatusUpdate = {};
                if (teamData.playersFormStatus && teamData.playersFormStatus[playerId]) {
                    formStatusUpdate[`playersFormStatus.${playerId}`] = deleteField();
                }

                await updateDoc(teamDocRef, {
                    budget: teamData.budget + refundCost,
                    players: updatedPlayers,
                    formation: {
                        ...teamData.formation,
                        titolari: updatedTitolari,
                        panchina: updatedPanchina
                    },
                    ...formStatusUpdate
                });

                const finalLevelRange = playerInRosa.levelRange && Array.isArray(playerInRosa.levelRange) ? playerInRosa.levelRange : [playerInRosa.level || 1, playerInRosa.level || 1];
                const finalCost = playerInRosa.cost !== undefined && playerInRosa.cost !== null ? playerInRosa.cost : 0;
                const finalAge = playerInRosa.age !== undefined && playerInRosa.age !== null ? playerInRosa.age : 25;
                const finalRole = playerInRosa.role || 'C';
                const finalName = playerInRosa.name || 'Sconosciuto';
                const finalType = playerInRosa.type || window.getRandomType();
                const finalAbilities = playerInRosa.abilities || [];

                const playerDocumentData = {
                    name: finalName,
                    role: finalRole,
                    type: finalType,
                    age: finalAge,
                    cost: finalCost,
                    levelRange: finalLevelRange,
                    abilities: finalAbilities,
                    isDrafted: false,
                    teamId: null,
                    creationDate: new Date().toISOString()
                };

                if (docExistsInMarket) {
                    await setDoc(marketDocRef, playerDocumentData, { merge: true });
                } else {
                    await setDoc(marketDocRef, playerDocumentData);
                }

                if (wasInDraft) {
                    await deleteDoc(draftDocRef);
                    console.log(`Giocatore ${playerName} rimosso dalla collezione Draft.`);
                }

                if (window.loadDraftPlayersAdmin) window.loadDraftPlayersAdmin();
                if (window.loadMarketPlayersAdmin) window.loadMarketPlayersAdmin();

                displayMessage(msgContainerId, `Giocatore ${playerName} licenziato! Rimborsati ${refundCost} CS. Tornato nel Mercato.`, 'success');
                loadTeamDataFromFirestore(currentTeamId, 'rosa');
                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            } catch (error) {
                console.error("Errore durante il licenziamento:", error);
                displayMessage(msgContainerId, `Errore nel licenziamento di ${playerName}. Messaggio: ${error.message}`, 'error');
                target.disabled = false;
                target.textContent = 'Licenzia (Errore)';
                target.classList.remove('bg-orange-500');
                target.classList.add('bg-red-600');
                target.dataset.action = 'licenzia';
            }
        }
    }
};

console.log("Modulo GestioneSquadre-Rosa caricato.");
