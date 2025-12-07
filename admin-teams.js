//
// ====================================================================
// MODULO ADMIN-TEAMS.JS (Gestione Squadre)
// ====================================================================
//

window.AdminTeams = {
    teamsListContainer: null,
    modalInstance: null,

    /**
     * Carica tutte le squadre e le renderizza
     */
    async loadTeams(TEAMS_COLLECTION_PATH) {
        const { collection, getDocs } = window.firestoreTools;
        const db = window.db;
        
        if (!this.teamsListContainer) return;

        this.teamsListContainer.innerHTML = '<p class="text-center text-gray-400">Caricamento squadre...</p>';

        try {
            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const querySnapshot = await getDocs(teamsCollectionRef);

            if (querySnapshot.empty) {
                this.teamsListContainer.innerHTML = '<p class="text-center text-red-400 font-semibold">Nessuna squadra registrata al momento.</p>';
                return;
            }

            let teamsHtml = '';
            querySnapshot.forEach(doc => {
                const teamData = doc.data();
                const teamId = doc.id;
                const isParticipating = teamData.isParticipating || false;
                
                const date = teamData.creationDate ? new Date(teamData.creationDate).toLocaleDateString('it-IT') : 'N/A';
                const checkboxColorClasses = isParticipating ? 'bg-green-500 border-green-500' : 'bg-gray-700 border-gray-500';

                teamsHtml += `
                    <div class="team-item flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg border border-gray-600 hover:border-blue-500 transition duration-150">
                        <div class="flex items-center space-x-4 mb-2 sm:mb-0">
                            <input type="checkbox" id="participating-${teamId}" data-team-id="${teamId}" data-action="toggle-participation"
                                   class="form-checkbox h-5 w-5 rounded transition duration-150 ease-in-out ${checkboxColorClasses}"
                                   ${isParticipating ? 'checked' : ''}>
                            <label for="participating-${teamId}" class="text-gray-300 font-bold">Partecipa al Campionato</label>
                        </div>

                        <div class="w-full sm:w-auto mb-2 sm:mb-0">
                            <p class="text-lg font-bold text-white">${teamData.teamName}</p>
                            <p class="text-xs text-gray-400">ID: ${teamId}</p>
                            <p class="text-sm text-gray-400">Budget: ${teamData.budget} CS | Rosa: ${teamData.players.length} gioc. | Creazione: ${date}</p>
                            <p class="text-sm text-gray-400">Coach: ${teamData.coach?.name || 'N/A'} (Liv: ${teamData.coach?.level || 0})</p>
                        </div>
                        
                        <div class="flex space-x-2 mt-2 sm:mt-0">
                            <button data-team-id="${teamId}" data-action="edit"
                                    class="bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 transform hover:scale-105">
                                Modifica
                            </button>
                            <button data-team-id="${teamId}" data-action="delete"
                                    class="delete-btn bg-red-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-red-700 transition duration-150 transform hover:scale-105">
                                Elimina
                            </button>
                        </div>
                    </div>
                `;
            });
            
            this.teamsListContainer.innerHTML = teamsHtml;

        } catch (error) {
            console.error("Errore nel caricamento delle squadre:", error);
            this.teamsListContainer.innerHTML = `<p class="text-center text-red-500">Errore di caricamento: ${error.message}</p>`;
        }
    },

    /**
     * Gestisce le azioni sui bottoni delle squadre
     */
    async handleTeamAction(event, TEAMS_COLLECTION_PATH, reloadCallback) {
        const target = event.target;
        const teamId = target.dataset.teamId;
        const action = target.dataset.action;

        if (!teamId || !action) return;

        if (action === 'toggle-participation') {
            this.handleToggleParticipation(teamId, target.checked, target, TEAMS_COLLECTION_PATH);
            return;
        }
        
        if (action === 'delete') {
            target.textContent = 'CONFERMA? (Click di nuovo)';
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-delete';
            return;
        }

        if (action === 'confirm-delete') {
            target.textContent = 'Eliminazione...';
            target.disabled = true;

            try {
                const { doc, deleteDoc } = window.firestoreTools;
                const db = window.db;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                await deleteDoc(teamDocRef);

                target.closest('.team-item').remove();
                if (reloadCallback) reloadCallback();

            } catch (error) {
                console.error(`Errore durante l'eliminazione della squadra ${teamId}:`, error);
                target.textContent = 'Elimina';
                target.classList.remove('bg-orange-500');
                target.classList.add('bg-red-600');
                target.disabled = false;
                target.dataset.action = 'delete';
            }
            return;
        }
        
        if (action === 'edit') {
            this.openEditTeamModal(teamId, TEAMS_COLLECTION_PATH, reloadCallback);
        }
    },

    /**
     * Aggiorna lo stato di partecipazione
     */
    async handleToggleParticipation(teamId, isChecked, checkboxElement, TEAMS_COLLECTION_PATH) {
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        const label = checkboxElement.closest('.team-item').querySelector('label');
        
        checkboxElement.disabled = true;
        label.textContent = 'Salvando...';

        try {
            await updateDoc(teamDocRef, {
                isParticipating: isChecked
            });
            
            if (isChecked) {
                checkboxElement.classList.remove('bg-gray-700', 'border-gray-500');
                checkboxElement.classList.add('bg-green-500', 'border-green-500');
            } else {
                checkboxElement.classList.remove('bg-green-500', 'border-green-500');
                checkboxElement.classList.add('bg-gray-700', 'border-gray-500');
            }
            
            label.textContent = 'Partecipa al Campionato';

        } catch (error) {
            console.error(`Errore nell'aggiornamento partecipazione per ${teamId}:`, error);
            checkboxElement.checked = !isChecked;
            label.textContent = 'Errore di salvataggio!';
        } finally {
            checkboxElement.disabled = false;
        }
    },

    /**
     * Apre la modale per modificare la squadra
     */
    async openEditTeamModal(teamId, TEAMS_COLLECTION_PATH, reloadCallback) {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        try {
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Squadra non trovata.");

            const teamData = teamDoc.data();
            this.renderEditTeamModal(teamId, teamData, TEAMS_COLLECTION_PATH, reloadCallback);
            
        } catch (error) {
            console.error("Errore nel caricamento dei dati per la modifica:", error);
        }
    },

    /**
     * Renderizza la modale di modifica
     */
    renderEditTeamModal(teamId, teamData, TEAMS_COLLECTION_PATH, reloadCallback) {
        if (this.modalInstance) {
            this.modalInstance.remove();
            this.modalInstance = null;
        }

        const playersJsonString = JSON.stringify(teamData.players, null, 2);
        const mainElement = document.querySelector('main');

        const modalHtml = `
            <div id="edit-team-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div class="football-box w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <h3 class="text-3xl font-bold text-blue-400 mb-4 border-b border-blue-600 pb-2">Modifica Squadra: ${teamData.teamName}</h3>
                    <p id="edit-message" class="text-center text-sm mb-4 text-red-400"></p>

                    <form id="edit-team-form" data-team-id="${teamId}" class="space-y-4">
                        
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="edit-budget">Budget (Crediti Seri)</label>
                            <input type="number" id="edit-budget" name="budget" value="${teamData.budget}" min="0"
                                class="p-3 rounded-lg bg-gray-700 border border-blue-600 text-white focus:ring-blue-400">
                        </div>

                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="edit-players">Rosa Giocatori (JSON)</label>
                            <textarea id="edit-players" name="players" rows="10" 
                                class="p-3 rounded-lg bg-gray-700 border border-blue-600 text-white font-mono text-sm focus:ring-blue-400">${playersJsonString}</textarea>
                            <p class="text-xs text-gray-400 mt-1">Modifica la lista dei giocatori qui sotto (formato JSON corretto).</p>
                        </div>

                        <div class="flex justify-end space-x-4 pt-4">
                            <button type="button" id="btn-cancel-edit"
                                    class="bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-150">
                                Annulla
                            </button>
                            <button type="submit" id="btn-save-edit"
                                    class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-150">
                                Salva Modifiche
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        mainElement.insertAdjacentHTML('beforeend', modalHtml);
        this.modalInstance = document.getElementById('edit-team-modal');
        
        document.getElementById('btn-cancel-edit').addEventListener('click', () => this.closeEditTeamModal());
        document.getElementById('edit-team-form').addEventListener('submit', (e) => 
            this.handleSaveTeamEdit(e, TEAMS_COLLECTION_PATH, reloadCallback)
        );
    },

    /**
     * Chiude la modale
     */
    closeEditTeamModal() {
        if (this.modalInstance) {
            this.modalInstance.remove();
            this.modalInstance = null;
        }
    },

    /**
     * Salva le modifiche della squadra
     */
    async handleSaveTeamEdit(event, TEAMS_COLLECTION_PATH, reloadCallback) {
        event.preventDefault();
        const form = event.target;
        const teamId = form.dataset.teamId;
        const budgetInput = document.getElementById('edit-budget');
        const playersInput = document.getElementById('edit-players');
        const saveButton = document.getElementById('btn-save-edit');
        const editMessage = document.getElementById('edit-message');

        let updatedPlayers;
        const updatedBudget = parseInt(budgetInput.value);

        saveButton.textContent = 'Salvataggio...';
        saveButton.disabled = true;
        editMessage.textContent = 'Validazione e salvataggio in corso...';
        editMessage.classList.remove('text-red-400');
        editMessage.classList.add('text-yellow-400');

        try {
            updatedPlayers = JSON.parse(playersInput.value);
            if (!Array.isArray(updatedPlayers)) {
                throw new Error("La rosa non è in formato array.");
            }
        } catch (e) {
            editMessage.textContent = `Errore di formato JSON nella rosa: ${e.message}`;
            editMessage.classList.remove('text-yellow-400');
            editMessage.classList.add('text-red-400');
            saveButton.textContent = 'Salva Modifiche';
            saveButton.disabled = false;
            return;
        }

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

            await updateDoc(teamDocRef, {
                budget: updatedBudget,
                players: updatedPlayers
            });
            
            editMessage.textContent = 'Modifiche salvate con successo!';
            editMessage.classList.remove('text-yellow-400');
            editMessage.classList.add('text-green-500');

            setTimeout(() => {
                this.closeEditTeamModal();
                if (reloadCallback) reloadCallback();
            }, 1000);

        } catch (error) {
            console.error("Errore nel salvataggio delle modifiche:", error);
            editMessage.textContent = `Errore di salvataggio Firestore: ${error.message}`;
            editMessage.classList.remove('text-yellow-400');
            editMessage.classList.add('text-red-400');
            saveButton.textContent = 'Salva Modifiche';
            saveButton.disabled = false;
        }
    }
};