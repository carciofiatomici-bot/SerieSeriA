//
// ====================================================================
// GESTIONESQUADRE-ICONA.JS - Sostituzione Icona
// ====================================================================
//

window.GestioneSquadreIcona = {

    /**
     * Renderizza il pannello per sostituire l'Icona
     * @param {Object} teamData - Dati della squadra
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    async render(teamData, context) {
        const { squadraToolsContainer, currentTeamId, loadTeamDataFromFirestore } = context;
        const { ICONA_REPLACEMENT_COST } = window.GestioneSquadreConstants;
        const { displayMessage } = window.GestioneSquadreUtils;

        const msgContainerId = 'player-list-message';

        // Verifica stato campionato
        if (window.isSeasonOver) {
            const isOver = await window.isSeasonOver();
            if (!isOver) {
                displayMessage(msgContainerId, "ERRORE: La sostituzione dell'Icona e consentita SOLO se il campionato e fermo (Pausa/Terminato).", 'error');
                return;
            }
        }

        // Verifica saldo CSS (Crediti Super Seri)
        const CSS = window.CreditiSuperSeri;
        let saldoCSS = 0;
        if (CSS) {
            saldoCSS = await CSS.getSaldo(currentTeamId);
        }
        if (saldoCSS < ICONA_REPLACEMENT_COST) {
            displayMessage(msgContainerId, `ERRORE: CSS insufficienti. La sostituzione costa ${ICONA_REPLACEMENT_COST} CSS. Saldo attuale: ${saldoCSS} CSS.`, 'error');
            return;
        }

        const currentIcona = teamData.players.find(p => p.abilities && p.abilities.includes('Icona'));
        const candidates = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
        const availableIcons = candidates.filter(c => c.name !== currentIcona.name);

        squadraToolsContainer.innerHTML = `
            <div class="p-6 bg-gray-800 rounded-lg border border-orange-500 shadow-inner-lg space-y-6">
                <h3 class="text-2xl font-bold text-orange-400 mb-4 border-b border-gray-600 pb-2">
                    Sostituzione Icona (Costo: ${ICONA_REPLACEMENT_COST} CSS)
                </h3>
                <p class="text-gray-300">Icona Attuale: <span class="text-yellow-400 font-extrabold">${currentIcona.name} (${currentIcona.role})</span>. Scegli una nuova Icona qui sotto.
                </p>
                <p id="icona-replacement-message" class="text-center text-red-400"></p>

                <div id="icona-candidates-list" class="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                    ${availableIcons.map(icon => `
                        <div data-icon-id="${icon.id}" data-icon-name="${icon.name}"
                             class="icon-select-card p-3 bg-gray-700 rounded-lg border border-gray-600 text-center cursor-pointer hover:bg-indigo-700 transition duration-150 transform hover:scale-[1.03]">
                            <img src="${icon.photoUrl}" alt="Avatar ${icon.name}" class="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-2 border-gray-400">
                            <p class="font-bold text-white">${icon.name}</p>
                            <p class="text-xs text-yellow-400">${icon.role} (${icon.type})</p>
                        </div>
                    `).join('')}
                </div>

                <button id="btn-confirm-replace-icona" disabled
                        class="w-full bg-green-600 text-white font-extrabold py-3 rounded-lg opacity-50 cursor-not-allowed transition duration-150">
                    CONFERMA SCAMBIO ICONA
                </button>

                <button id="btn-cancel-replace"
                        class="w-full bg-gray-600 text-white font-extrabold py-2 rounded-lg transition duration-150">
                    Annulla e Torna alla Gestione Rosa
                </button>
            </div>
        `;

        this.attachEventListeners(teamData, candidates, context);
    },

    /**
     * Collega gli event listener
     */
    attachEventListeners(teamData, candidates, context) {
        const { currentTeamId, loadTeamDataFromFirestore } = context;
        const { ICONA_REPLACEMENT_COST } = window.GestioneSquadreConstants;
        const { displayMessage } = window.GestioneSquadreUtils;

        const iconaCandidatesList = document.getElementById('icona-candidates-list');
        const btnConfirmReplace = document.getElementById('btn-confirm-replace-icona');
        const btnCancel = document.getElementById('btn-cancel-replace');

        let selectedIconData = null;

        iconaCandidatesList.addEventListener('click', (e) => {
            const card = e.target.closest('.icon-select-card');
            if (!card) return;

            iconaCandidatesList.querySelectorAll('.icon-select-card').forEach(c => {
                c.classList.remove('border-green-400', 'bg-indigo-700');
            });

            card.classList.add('border-green-400', 'bg-indigo-700');

            selectedIconData = candidates.find(c => c.id === card.dataset.iconId);

            btnConfirmReplace.disabled = false;
            btnConfirmReplace.classList.remove('opacity-50', 'cursor-not-allowed');
            btnConfirmReplace.textContent = `CONFERMA SCAMBIO CON ${selectedIconData.name} (${ICONA_REPLACEMENT_COST} CSS)`;
            displayMessage('icona-replacement-message', `Hai selezionato ${selectedIconData.name}. Pronto per confermare.`, 'info');
        });

        btnConfirmReplace.addEventListener('click', () => {
            if (selectedIconData) {
                this.confirmAndSwapIcona(teamData, selectedIconData, ICONA_REPLACEMENT_COST, context);
            }
        });

        btnCancel.addEventListener('click', () => loadTeamDataFromFirestore(currentTeamId, 'rosa'));
    },

    /**
     * Esegue la transazione di scambio Icona
     */
    async confirmAndSwapIcona(teamData, newIcona, cost, context) {
        const { db, firestoreTools, TEAMS_COLLECTION_PATH, currentTeamId, loadTeamDataFromFirestore } = context;
        const { displayMessage } = window.GestioneSquadreUtils;

        const msgId = 'icona-replacement-message';
        const { doc, updateDoc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

        const currentIcona = teamData.players.find(p => p.abilities && p.abilities.includes('Icona'));

        if (!currentIcona) {
            displayMessage(msgId, "Errore critico: Icona attuale non trovata.", 'error');
            return;
        }

        displayMessage(msgId, "Esecuzione scambio Icona...", 'info');
        document.getElementById('btn-confirm-replace-icona').disabled = true;

        try {
            // Sottrai CSS invece del budget normale
            const CSS = window.CreditiSuperSeri;
            if (CSS) {
                const risultato = await CSS.sottraiCrediti(currentTeamId, cost, 'Sostituzione Icona');
                if (!risultato.success) {
                    displayMessage(msgId, `Errore: ${risultato.error}`, 'error');
                    document.getElementById('btn-confirm-replace-icona').disabled = false;
                    return;
                }
            }

            const updatedPlayers = teamData.players.map(p => {
                if (p.id === currentIcona.id) {
                    return {
                        ...newIcona,
                        id: currentIcona.id,
                        isCaptain: p.isCaptain,
                        level: newIcona.level,
                        abilities: ['Icona']
                    };
                }
                return p;
            });

            await updateDoc(teamDocRef, {
                players: updatedPlayers,
                iconaId: currentIcona.id,
                lastAcquisitionTimestamp: new Date().getTime(),
            });

            displayMessage(msgId, `Icona scambiata! ${newIcona.name} e la nuova Icona. Ti sono stati scalati ${cost} CSS.`, 'success');

            setTimeout(() => {
                loadTeamDataFromFirestore(currentTeamId, 'rosa');
            }, 1000);

        } catch (error) {
            console.error("Errore durante lo scambio Icona:", error);
            displayMessage(msgId, `Scambio fallito: ${error.message}.`, 'error');
            document.getElementById('btn-confirm-replace-icona').disabled = false;
        }
    }
};

console.log("Modulo GestioneSquadre-Icona caricato.");
