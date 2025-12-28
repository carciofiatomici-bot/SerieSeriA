//
// ====================================================================
// MODULO ADMIN-TEAMS.JS V2.0 - UI Migliorata per Editing Giocatori
// ====================================================================
//

window.AdminTeams = {
    teamsListContainer: null,
    modalInstance: null,
    currentEditingTeamId: null,
    currentEditingPlayers: [],
    currentEditingTeamData: null,
    reloadCallback: null,

    // MAPPA COMPLETA abilita (75 abilita!)
    ROLE_ABILITIES_MAP: {
        'P': {
            positive: ['Parata di pugno', 'Responta', 'Colpo d\'anca', 'Uscita Kamikaze', 'Teletrasporto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Parata con i piedi', 'Lancio lungo', 'Presa Sicura', 'Muro Psicologico', 'Miracolo', 'Freddezza', 'Sguardo Intimidatorio', 'Tiro dalla porta', 'Ripresa rapida', 'Forma Smagliante', 'Indistruttibile', 'Multiruolo'],
            negative: ['Mani di burro', 'Respinta Timida', 'Fuori dai pali', 'Lento a carburare', 'Soggetto a infortuni', 'Fragile', 'Non Adattabile'],
            unique: ['Icona']
        },
        'D': {
            positive: ['Muro', 'Contrasto Durissimo', 'Antifurto', 'Guardia', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Deviazione', 'Svaligiatore', 'Spazzata', 'Adattabile', 'Salvataggio sulla Linea', 'Freddezza', 'Tiro dalla distanza', 'Tiro Potente', 'Ripresa rapida', 'Forma Smagliante', 'Raddoppio in difesa', 'Raddoppio in attacco', 'Indistruttibile', 'Multiruolo'],
            negative: ['Falloso', 'Insicuro', 'Fuori Posizione', 'Lento a carburare', 'Soggetto a infortuni', 'Fragile', 'Non Adattabile'],
            unique: ['Icona']
        },
        'C': {
            positive: ['Tuttocampista', 'Regista', 'Motore', 'Tocco Di Velluto', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Cross', 'Mago del pallone', 'Passaggio Corto', 'Visione di Gioco', 'Freddezza', 'Tiro Potente', 'Ripresa rapida', 'Forma Smagliante', 'Raddoppio in difesa', 'Raddoppio in attacco', 'Indistruttibile', 'Multiruolo'],
            negative: ['Egoista', 'Impreciso', 'Ingabbiato', 'Fuori Posizione', 'Lento a carburare', 'Soggetto a infortuni', 'Fragile', 'Non Adattabile'],
            unique: ['Icona']
        },
        'A': {
            positive: ['Opportunista', 'Bomber', 'Doppio Scatto', 'Pivot', 'Effetto Caos', 'Fortunato', 'Bandiera del club', 'Rientro Rapido', 'Tiro Fulmineo', 'Tiro a Giro', 'Immarcabile', 'Freddezza', 'Tiro Potente', 'Ripresa rapida', 'Forma Smagliante', 'Raddoppio in difesa', 'Raddoppio in attacco', 'Indistruttibile', 'Multiruolo'],
            negative: ['Piedi a banana', 'Eccesso di sicurezza', 'Egoista', 'Fuori Posizione', 'Lento a carburare', 'Soggetto a infortuni', 'Fragile', 'Non Adattabile', 'Titubanza'],
            unique: ['Icona']
        }
    },

    /**
     * Verifica se un giocatore e' un'Icona (ha abilita Icona o e' nella lista ICONE)
     * NOTA: Questo e' diverso dal "Capitano nominato" (isCaptain) che da solo +1
     */
    isPlayerIcona(player) {
        if (!player) return false;
        // Ha gia l'abilita Icona?
        if (player.abilities && player.abilities.includes('Icona')) return true;
        // E' nella lista delle Icone predefinite?
        const icone = window.ICONE || window.CAPTAIN_CANDIDATES_TEMPLATES || [];
        const iconeIds = new Set(icone.map(i => i.id));
        return iconeIds.has(player.id);
    },

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

                // Escludi "serieseria" dalla lista - e' un account admin puro, non una squadra
                if (teamData.teamName && teamData.teamName.toLowerCase() === 'serieseria') {
                    return; // Skip this team
                }
                const isParticipating = teamData.isParticipating || false;
                const isCupParticipating = teamData.isCupParticipating || false;

                const date = teamData.creationDate ? new Date(teamData.creationDate).toLocaleDateString('it-IT') : 'N/A';
                const checkboxColorClasses = isParticipating ? 'bg-green-500 border-green-500' : 'bg-gray-700 border-gray-500';
                const cupCheckboxColorClasses = isCupParticipating ? 'bg-purple-500 border-purple-500' : 'bg-gray-700 border-gray-500';

                const logoUrl = teamData.logoUrl || 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';

                const isDraftEnabled = teamData.draft_enabled || false;
                const draftCheckboxColorClasses = isDraftEnabled ? 'bg-green-500 border-green-500' : 'bg-gray-700 border-gray-500';

                // Escape teamName per XSS
                const safeTeamName = window.escapeHtml ? window.escapeHtml(teamData.teamName || '') : (teamData.teamName || '');

                teamsHtml += `
                    <div class="team-item flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg border border-gray-600 hover:border-blue-500 transition duration-150">
                        <div class="flex flex-col space-y-2 mb-2 sm:mb-0">
                            <div class="flex items-center space-x-4">
                                <input type="checkbox" id="participating-${teamId}" data-team-id="${teamId}" data-action="toggle-participation"
                                       class="form-checkbox h-5 w-5 rounded transition duration-150 ease-in-out ${checkboxColorClasses}"
                                       ${isParticipating ? 'checked' : ''}>
                                <label for="participating-${teamId}" class="text-gray-300 font-bold">🏆 SerieSeriA</label>
                            </div>
                            <div class="flex items-center space-x-4">
                                <input type="checkbox" id="cup-participating-${teamId}" data-team-id="${teamId}" data-action="toggle-cup-participation"
                                       class="form-checkbox h-5 w-5 rounded transition duration-150 ease-in-out ${cupCheckboxColorClasses}"
                                       ${isCupParticipating ? 'checked' : ''}>
                                <label for="cup-participating-${teamId}" class="text-gray-300 font-bold">🏆 CoppaSeriA</label>
                            </div>
                            <div class="flex items-center space-x-4">
                                <input type="checkbox" id="draft-enabled-${teamId}" data-team-id="${teamId}" data-action="toggle-draft-enabled"
                                       class="form-checkbox h-5 w-5 rounded transition duration-150 ease-in-out ${draftCheckboxColorClasses}"
                                       ${isDraftEnabled ? 'checked' : ''}>
                                <label for="draft-enabled-${teamId}" class="text-gray-300 font-bold">📝 Draft</label>
                            </div>
                        </div>

                        <div class="flex items-center w-full sm:w-auto mb-2 sm:mb-0">
                            <img src="${logoUrl}"
                                 alt="Logo ${safeTeamName}"
                                 data-team-id="${teamId}"
                                 data-action="change-logo"
                                 class="w-16 h-16 rounded-full border-2 border-yellow-500 mr-4 cursor-pointer hover:border-yellow-300 hover:scale-110 transition object-cover"
                                 title="Clicca per cambiare il logo">
                            <div>
                                <p class="text-lg font-bold text-white">${safeTeamName}${teamData.isAdmin ? ' <span class="text-red-400" title="Squadra Admin">🔧</span>' : ''}${teamData.draft_enabled ? ' <span class="text-green-400" title="Partecipa al Draft">📝</span>' : ''}</p>
                                <p class="text-xs text-gray-400">ID: ${teamId}</p>
                                <p class="text-sm text-gray-400">Budget: ${teamData.budget} CS | CSS: ${teamData.creditiSuperSeri || 0} | Rosa: ${(teamData.players || []).length} gioc. | Creazione: ${date}</p>
                                <p class="text-sm text-gray-400">Coach: ${teamData.coach?.name || 'N/A'} (Liv: ${teamData.coach?.level || 0})</p>
                            </div>
                        </div>
                        
                        <div class="flex flex-wrap gap-2 mt-2 sm:mt-0">
                            <button data-team-id="${teamId}" data-action="view-dashboard"
                                    class="bg-green-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-green-700 transition duration-150 transform hover:scale-105">
                                Dashboard
                            </button>
                            <button data-team-id="${teamId}" data-action="change-icon"
                                    class="bg-yellow-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-yellow-700 transition duration-150 transform hover:scale-105">
                                👑 Icona
                            </button>
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

        if (action === 'toggle-cup-participation') {
            this.handleToggleCupParticipation(teamId, target.checked, target, TEAMS_COLLECTION_PATH);
            return;
        }

        if (action === 'toggle-draft-enabled') {
            this.handleToggleDraftEnabled(teamId, target.checked, target, TEAMS_COLLECTION_PATH);
            return;
        }

        if (action === 'view-dashboard') {
            this.viewTeamDashboard(teamId, TEAMS_COLLECTION_PATH);
            return;
        }

        if (action === 'change-icon') {
            this.openChangeIconModal(teamId, TEAMS_COLLECTION_PATH, reloadCallback);
            return;
        }

        if (action === 'change-logo') {
            this.handleChangeLogo(teamId, target, TEAMS_COLLECTION_PATH);
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
            
            label.textContent = '🏆 SerieSeriA';

        } catch (error) {
            console.error(`Errore nell'aggiornamento partecipazione per ${teamId}:`, error);
            checkboxElement.checked = !isChecked;
            label.textContent = 'Errore di salvataggio!';
        } finally {
            checkboxElement.disabled = false;
        }
    },

    /**
     * Aggiorna lo stato di partecipazione alla Coppa
     */
    async handleToggleCupParticipation(teamId, isChecked, checkboxElement, TEAMS_COLLECTION_PATH) {
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

        const label = checkboxElement.closest('.team-item').querySelector(`label[for="cup-participating-${teamId}"]`);

        checkboxElement.disabled = true;
        label.textContent = 'Salvando...';

        try {
            await updateDoc(teamDocRef, {
                isCupParticipating: isChecked
            });

            if (isChecked) {
                checkboxElement.classList.remove('bg-gray-700', 'border-gray-500');
                checkboxElement.classList.add('bg-purple-500', 'border-purple-500');
            } else {
                checkboxElement.classList.remove('bg-purple-500', 'border-purple-500');
                checkboxElement.classList.add('bg-gray-700', 'border-gray-500');
            }

            label.textContent = '🏆 CoppaSeriA';

        } catch (error) {
            console.error(`Errore nell'aggiornamento partecipazione coppa per ${teamId}:`, error);
            checkboxElement.checked = !isChecked;
            label.textContent = 'Errore di salvataggio!';
        } finally {
            checkboxElement.disabled = false;
        }
    },

    /**
     * Aggiorna lo stato di partecipazione al draft
     */
    async handleToggleDraftEnabled(teamId, isChecked, checkboxElement, TEAMS_COLLECTION_PATH) {
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

        const label = checkboxElement.closest('.team-item').querySelector(`label[for="draft-enabled-${teamId}"]`);

        checkboxElement.disabled = true;
        label.textContent = 'Salvando...';

        try {
            await updateDoc(teamDocRef, {
                draft_enabled: isChecked
            });

            if (isChecked) {
                checkboxElement.classList.remove('bg-gray-700', 'border-gray-500');
                checkboxElement.classList.add('bg-green-500', 'border-green-500');
            } else {
                checkboxElement.classList.remove('bg-green-500', 'border-green-500');
                checkboxElement.classList.add('bg-gray-700', 'border-gray-500');
            }

            label.textContent = '📝 Draft';

        } catch (error) {
            console.error(`Errore nell'aggiornamento partecipazione draft per ${teamId}:`, error);
            checkboxElement.checked = !isChecked;
            label.textContent = 'Errore di salvataggio!';
        } finally {
            checkboxElement.disabled = false;
        }
    },

    /**
     * Visualizza la dashboard di una squadra selezionata (come Admin)
     */
    async viewTeamDashboard(teamId, TEAMS_COLLECTION_PATH) {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

        try {
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) {
                alert('Squadra non trovata!');
                return;
            }

            const teamData = teamDoc.data();

            // Imposta i dati della squadra nel core
            window.InterfacciaCore.currentTeamData = teamData;
            window.InterfacciaCore.currentTeamId = teamId;

            // Salva la sessione come admin che sta visualizzando una squadra
            try { localStorage.setItem('fanta_admin_viewing_team', teamId); } catch (e) {}

            // Carica i loghi delle squadre
            if (window.fetchAllTeamLogos) {
                await window.fetchAllTeamLogos();
            }

            // Aggiorna la UI della dashboard
            const elements = window.elements;
            if (window.InterfacciaDashboard && elements) {
                window.InterfacciaDashboard.updateTeamUI(
                    teamData.teamName,
                    teamId,
                    teamData.logoUrl,
                    false,
                    elements
                );
            }

            // Mostra la dashboard utente
            const appContent = document.getElementById('app-content');
            if (appContent && window.showScreen) {
                window.showScreen(appContent);
            }

        } catch (error) {
            console.error('Errore nel caricamento della dashboard:', error);
            alert('Errore nel caricamento della dashboard: ' + error.message);
        }
    },

    /**
     * Apre la modale per cambiare l'icona della squadra
     */
    async openChangeIconModal(teamId, TEAMS_COLLECTION_PATH, reloadCallback) {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

        try {
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) {
                alert('Squadra non trovata!');
                return;
            }

            const teamData = teamDoc.data();
            const currentIconaId = teamData.iconaId;
            const icone = window.CAPTAIN_CANDIDATES_TEMPLATES || [];

            // Ordina le icone per ruolo
            const ROLE_ORDER = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
            const iconeOrdinate = [...icone].sort((a, b) => {
                const orderA = ROLE_ORDER[a.role] !== undefined ? ROLE_ORDER[a.role] : 99;
                const orderB = ROLE_ORDER[b.role] !== undefined ? ROLE_ORDER[b.role] : 99;
                return orderA - orderB;
            });

            // Crea il modal
            const modalHtml = `
                <div id="change-icon-modal" class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div class="football-box w-full max-w-4xl max-h-[95vh] overflow-y-auto">
                        <h3 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-yellow-600 pb-2">👑 Cambia Icona - ${teamData.teamName}</h3>
                        <p class="text-gray-300 mb-4">Icona attuale: <span class="text-yellow-400 font-bold">${currentIconaId ? icone.find(i => i.id === currentIconaId)?.name || currentIconaId : 'Nessuna'}</span></p>
                        <p id="change-icon-message" class="text-center text-sm mb-4"></p>

                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                            ${iconeOrdinate.map(icona => `
                                <div class="p-3 bg-gray-700 rounded-lg border-2 ${icona.id === currentIconaId ? 'border-green-500 bg-green-900' : 'border-gray-600 hover:border-yellow-500'} text-center cursor-pointer transition"
                                     onclick="window.AdminTeams.selectIcon('${icona.id}', '${teamId}', '${TEAMS_COLLECTION_PATH}')">
                                    <img src="${icona.photoUrl}"
                                         alt="${icona.name}"
                                         class="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-2 ${icona.id === currentIconaId ? 'border-green-400' : 'border-yellow-400'}">
                                    <p class="text-sm font-bold text-white">${icona.name}</p>
                                    <p class="text-xs text-yellow-400">${icona.role} - ${icona.type}</p>
                                    ${icona.id === currentIconaId ? '<p class="text-xs text-green-400 mt-1">ATTUALE</p>' : ''}
                                </div>
                            `).join('')}
                        </div>

                        <div class="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                            <button onclick="window.AdminTeams.closeChangeIconModal()"
                                    class="bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-400 transition">
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Rimuovi eventuali modal esistenti
            const existingModal = document.getElementById('change-icon-modal');
            if (existingModal) existingModal.remove();

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            this.changeIconReloadCallback = reloadCallback;

        } catch (error) {
            console.error('Errore nel caricamento delle icone:', error);
            alert('Errore: ' + error.message);
        }
    },

    /**
     * Seleziona e salva una nuova icona per la squadra
     */
    async selectIcon(iconaId, teamId, TEAMS_COLLECTION_PATH) {
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

        const msgElement = document.getElementById('change-icon-message');
        if (msgElement) {
            msgElement.textContent = 'Salvataggio in corso...';
            msgElement.className = 'text-center text-sm mb-4 text-yellow-400';
        }

        try {
            // Trova i dati dell'icona selezionata
            const icone = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
            const selectedIcona = icone.find(i => i.id === iconaId);
            if (!selectedIcona) throw new Error('Icona non trovata!');

            // Carica i dati attuali della squadra
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) throw new Error('Squadra non trovata!');
            const teamData = teamDoc.data();

            // Rimuovi la vecchia icona dalla rosa (se presente)
            let updatedPlayers = teamData.players.filter(p => !p.abilities || !p.abilities.includes('Icona'));

            // Crea il nuovo giocatore icona
            const newIconaPlayer = {
                id: selectedIcona.id,
                name: selectedIcona.name,
                role: selectedIcona.role,
                type: selectedIcona.type,
                age: selectedIcona.age,
                level: selectedIcona.level || 5, // Livello base icone da icone.js
                cost: 0,
                abilities: selectedIcona.abilities || ['Icona'], // Mantieni abilita originali (es. Tiro Dritto)
                isCaptain: true,
                photoUrl: selectedIcona.photoUrl
            };

            // Aggiungi la nuova icona alla rosa
            updatedPlayers.push(newIconaPlayer);

            // Aggiorna anche la formazione se necessario
            let updatedFormation = teamData.formation || { modulo: '1-1-2-1', titolari: [], panchina: [] };

            // Rimuovi la vecchia icona dalla formazione
            updatedFormation.titolari = updatedFormation.titolari.filter(p => !p.abilities || !p.abilities.includes('Icona'));
            updatedFormation.panchina = updatedFormation.panchina.filter(p => !p.abilities || !p.abilities.includes('Icona'));

            // Aggiungi la nuova icona ai titolari
            updatedFormation.titolari.push(newIconaPlayer);

            // Salva su Firestore
            await updateDoc(teamDocRef, {
                iconaId: iconaId,
                players: updatedPlayers,
                formation: updatedFormation
            });

            if (msgElement) {
                msgElement.textContent = `Icona cambiata in ${selectedIcona.name}!`;
                msgElement.className = 'text-center text-sm mb-4 text-green-400';
            }

            // Chiudi il modal dopo 1 secondo e ricarica
            setTimeout(() => {
                this.closeChangeIconModal();
                if (this.changeIconReloadCallback) this.changeIconReloadCallback();
            }, 1000);

        } catch (error) {
            console.error('Errore nel cambio icona:', error);
            if (msgElement) {
                msgElement.textContent = `Errore: ${error.message}`;
                msgElement.className = 'text-center text-sm mb-4 text-red-400';
            }
        }
    },

    /**
     * Chiude il modal di cambio icona
     */
    closeChangeIconModal() {
        const modal = document.getElementById('change-icon-modal');
        if (modal) modal.remove();
        this.changeIconReloadCallback = null;
    },

    /**
     * Gestisce il cambio del logo della squadra
     */
    async handleChangeLogo(teamId, imgElement, TEAMS_COLLECTION_PATH) {
        const DEFAULT_LOGO_URL = 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
        const currentUrl = imgElement.src;

        const newLogoUrl = prompt("Inserisci il link (URL) del nuovo logo della squadra:", currentUrl);

        if (newLogoUrl === null) {
            return; // Utente ha annullato
        }

        const trimmedUrl = newLogoUrl.trim();

        // Se vuoto o non valido, usa il placeholder
        let finalUrl = trimmedUrl;
        if (trimmedUrl === "" || !trimmedUrl.startsWith('http')) {
            if (trimmedUrl !== "" && !trimmedUrl.startsWith('http')) {
                alert('URL non valido. Deve iniziare con http:// o https://. Verra usato il placeholder.');
            }
            finalUrl = DEFAULT_LOGO_URL;
        }

        // Aggiorna l'immagine immediatamente
        imgElement.src = finalUrl;

        // Salva su Firestore
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

            await updateDoc(teamDocRef, {
                logoUrl: finalUrl
            });

            // Aggiorna anche la mappa globale dei loghi
            if (window.InterfacciaCore && window.InterfacciaCore.teamLogosMap) {
                window.InterfacciaCore.teamLogosMap[teamId] = finalUrl;
            }

            console.log(`Logo squadra ${teamId} aggiornato con successo.`);

        } catch (error) {
            console.error('Errore nel salvataggio del logo:', error);
            alert('Errore nel salvataggio del logo: ' + error.message);
            // Ripristina l'immagine precedente in caso di errore
            imgElement.src = currentUrl;
        }
    },

    /**
     * Apre la modale per modificare la squadra (NUOVA UI!)
     */
    async openEditTeamModal(teamId, TEAMS_COLLECTION_PATH, reloadCallback) {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        try {
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Squadra non trovata.");

            const teamData = teamDoc.data();
            this.currentEditingTeamId = teamId;
            this.currentEditingPlayers = JSON.parse(JSON.stringify(teamData.players)); // Deep copy
            this.currentEditingTeamData = teamData;
            this.reloadCallback = reloadCallback;
            
            this.renderEditTeamModal(teamId, teamData, TEAMS_COLLECTION_PATH, reloadCallback);
            
        } catch (error) {
            console.error("Errore nel caricamento dei dati per la modifica:", error);
        }
    },

    /**
     * Renderizza la modale di modifica con tabs
     */
    renderEditTeamModal(teamId, teamData, TEAMS_COLLECTION_PATH, reloadCallback) {
        if (this.modalInstance) {
            this.modalInstance.remove();
            this.modalInstance = null;
        }

        const mainElement = document.querySelector('main');

        const modalHtml = `
            <div id="edit-team-modal" class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div class="football-box w-full max-w-6xl max-h-[95vh] overflow-y-auto">
                    <h3 class="text-3xl font-bold text-blue-400 mb-4 border-b border-blue-600 pb-2">✏️ Modifica Squadra: ${teamData.teamName}</h3>
                    <p id="edit-message" class="text-center text-sm mb-4"></p>

                    <!-- Tabs -->
                    <div class="flex space-x-2 mb-4 border-b border-gray-700">
                        <button onclick="window.AdminTeams.switchTab('info')" id="tab-info" 
                                class="px-4 py-2 font-bold bg-blue-600 text-white rounded-t transition">
                            📋 Info Squadra
                        </button>
                        <button onclick="window.AdminTeams.switchTab('players')" id="tab-players" 
                                class="px-4 py-2 font-bold bg-gray-700 text-gray-300 rounded-t hover:bg-gray-600 transition">
                            ⚽ Giocatori (${(teamData.players || []).length})
                        </button>
                    </div>

                    <!-- Tab Content: Info Squadra -->
                    <div id="tab-content-info" class="space-y-4">
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1 font-bold" for="edit-team-name">Nome Squadra</label>
                            <input type="text" id="edit-team-name" value="${teamData.teamName}" minlength="3" maxlength="30"
                                class="p-3 rounded-lg bg-gray-700 border border-blue-600 text-white focus:ring-blue-400">
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex flex-col">
                                <label class="text-gray-300 mb-1 font-bold" for="edit-budget">Budget (Crediti Seri)</label>
                                <input type="number" id="edit-budget" value="${teamData.budget}" min="0"
                                    class="p-3 rounded-lg bg-gray-700 border border-blue-600 text-white focus:ring-blue-400">
                                <p class="text-xs text-gray-400 mt-1">CS - Valuta standard per acquisti</p>
                            </div>

                            <div class="flex flex-col">
                                <label class="text-amber-400 mb-1 font-bold" for="edit-css">Crediti Super Seri (CSS)</label>
                                <input type="number" id="edit-css" value="${teamData.creditiSuperSeri || 0}" min="0"
                                    class="p-3 rounded-lg bg-gray-700 border border-amber-500 text-white focus:ring-amber-400">
                                <p class="text-xs text-amber-400 mt-1">CSS - Valuta premium per potenziamenti</p>
                            </div>
                        </div>

                        <!-- Sezione Partecipazione Draft -->
                        <div class="mt-6 p-4 bg-green-900 rounded-lg border border-green-500">
                            <h4 class="text-lg font-bold text-green-400 mb-2">📝 Partecipazione Draft</h4>
                            <p class="text-sm text-gray-300 mb-3">Indica se questa squadra partecipa al draft.</p>
                            <div class="flex items-center justify-between">
                                <span class="text-white font-semibold">Partecipa al Draft</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="edit-draft-enabled" class="sr-only peer" ${teamData.draft_enabled ? 'checked' : ''}>
                                    <div class="w-14 h-7 bg-gray-600 peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>
                            <p id="draft-status-text" class="text-xs mt-2 ${teamData.draft_enabled ? 'text-green-400' : 'text-gray-500'}">
                                ${teamData.draft_enabled ? 'Questa squadra partecipa al draft' : 'Non partecipa al draft'}
                            </p>
                        </div>

                        <!-- Sezione Permessi Admin -->
                        <div class="mt-6 p-4 bg-red-900 rounded-lg border border-red-500">
                            <h4 class="text-lg font-bold text-red-400 mb-2">🔐 Permessi Amministratore</h4>
                            <p class="text-sm text-gray-300 mb-3">Abilita l'accesso al pannello admin per questa squadra.</p>
                            <div class="flex items-center justify-between">
                                <span class="text-white font-semibold">Squadra Admin</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="edit-is-admin" class="sr-only peer" ${teamData.isAdmin ? 'checked' : ''}>
                                    <div class="w-14 h-7 bg-gray-600 peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                            <p id="admin-status-text" class="text-xs mt-2 ${teamData.isAdmin ? 'text-red-400' : 'text-gray-500'}">
                                ${teamData.isAdmin ? 'Questa squadra ha accesso al pannello admin' : 'Squadra normale senza permessi admin'}
                            </p>
                        </div>

                        <!-- Sezione Ripara Squadra -->
                        <div class="mt-6 p-4 bg-orange-900 rounded-lg border border-orange-500">
                            <h4 class="text-lg font-bold text-orange-400 mb-2">🔧 Strumenti di Riparazione</h4>
                            <p class="text-sm text-gray-300 mb-3">Corregge automaticamente livelli errati e rimuove dati obsoleti.</p>
                            <div class="grid grid-cols-2 gap-2">
                                <button onclick="window.AdminTeams.repairTeam()"
                                        class="bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-500 transition">
                                    🔧 Ripara Livelli
                                </button>
                                <button onclick="window.AdminTeams.fixDuplicateIcone()"
                                        class="bg-yellow-600 text-white font-bold py-2 rounded-lg hover:bg-yellow-500 transition">
                                    👑 Fix Icone Doppie
                                </button>
                            </div>
                            <p id="repair-message" class="text-center text-sm mt-2"></p>
                        </div>
                    </div>

                    <!-- Tab Content: Giocatori -->
                    <div id="tab-content-players" class="hidden">
                        <div class="mb-4 p-4 bg-gray-800 rounded-lg border border-green-500">
                            <button onclick="window.AdminTeams.addNewPlayer()" 
                                    class="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
                                ➕ Aggiungi Nuovo Giocatore
                            </button>
                        </div>

                        <div id="players-list-edit" class="space-y-3">
                            ${this.renderPlayersList()}
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4 pt-6 mt-6 border-t border-gray-700">
                        <button type="button" onclick="window.AdminTeams.closeEditTeamModal()"
                                class="bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-400 transition duration-150">
                            Annulla
                        </button>
                        <button type="button" onclick="window.AdminTeams.saveTeamEdit('${teamId}', '${TEAMS_COLLECTION_PATH}')"
                                class="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-150">
                            💾 Salva Modifiche
                        </button>
                    </div>
                </div>
            </div>
        `;

        mainElement.insertAdjacentHTML('beforeend', modalHtml);
        this.modalInstance = document.getElementById('edit-team-modal');
        this.initAdminToggleListener();
        this.initDraftToggleListener();
    },

    /**
     * Switch tra tabs
     */
    switchTab(tab) {
        const tabInfo = document.getElementById('tab-info');
        const tabPlayers = document.getElementById('tab-players');
        const contentInfo = document.getElementById('tab-content-info');
        const contentPlayers = document.getElementById('tab-content-players');

        if (tab === 'info') {
            tabInfo.className = 'px-4 py-2 font-bold bg-blue-600 text-white rounded-t transition';
            tabPlayers.className = 'px-4 py-2 font-bold bg-gray-700 text-gray-300 rounded-t hover:bg-gray-600 transition';
            contentInfo.classList.remove('hidden');
            contentPlayers.classList.add('hidden');
        } else {
            tabInfo.className = 'px-4 py-2 font-bold bg-gray-700 text-gray-300 rounded-t hover:bg-gray-600 transition';
            tabPlayers.className = 'px-4 py-2 font-bold bg-blue-600 text-white rounded-t transition';
            contentInfo.classList.add('hidden');
            contentPlayers.classList.remove('hidden');
        }
    },

    /**
     * Inizializza il listener per il toggle admin con conferma
     */
    initAdminToggleListener() {
        const toggle = document.getElementById('edit-is-admin');
        const statusText = document.getElementById('admin-status-text');
        if (!toggle) return;

        toggle.addEventListener('change', async (e) => {
            try {
                if (e.target.checked) {
                    // Chiedi conferma quando si ATTIVA il flag admin
                    let confirmed = false;
                    if (window.ConfirmDialog?.show) {
                        confirmed = await window.ConfirmDialog.show({
                            title: 'Conferma Permessi Admin',
                            message: 'Sei sicuro di voler concedere i permessi admin a questa squadra? Potra accedere al pannello di amministrazione.',
                            confirmText: 'Si, Concedi Admin',
                            cancelText: 'Annulla',
                            type: 'warning'
                        });
                    } else {
                        confirmed = confirm('Sei sicuro di voler concedere i permessi admin a questa squadra?');
                    }

                    if (!confirmed) {
                        e.target.checked = false;
                        return;
                    }
                }

                // Aggiorna testo stato
                if (e.target.checked) {
                    statusText.textContent = 'Questa squadra ha accesso al pannello admin';
                    statusText.className = 'text-xs mt-2 text-red-400';
                } else {
                    statusText.textContent = 'Squadra normale senza permessi admin';
                    statusText.className = 'text-xs mt-2 text-gray-500';
                }
            } catch (error) {
                console.error('[AdminTeams] Errore toggle admin:', error);
                e.target.checked = !e.target.checked; // Ripristina stato
            }
        });
    },

    /**
     * Inizializza il listener per il toggle partecipazione draft
     */
    initDraftToggleListener() {
        const toggle = document.getElementById('edit-draft-enabled');
        const statusText = document.getElementById('draft-status-text');
        if (!toggle) return;

        toggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                statusText.textContent = 'Questa squadra partecipa al draft';
                statusText.className = 'text-xs mt-2 text-green-400';
            } else {
                statusText.textContent = 'Non partecipa al draft';
                statusText.className = 'text-xs mt-2 text-gray-500';
            }
        });
    },

    /**
     * Renderizza la lista dei giocatori
     */
    renderPlayersList() {
        if (!this.currentEditingPlayers || this.currentEditingPlayers.length === 0) {
            return '<p class="text-center text-gray-400 py-8">Nessun giocatore nella rosa. Clicca "Aggiungi Nuovo Giocatore" per iniziare.</p>';
        }

        return this.currentEditingPlayers.map((player, index) => {
            const abilitiesDisplay = player.abilities && player.abilities.length > 0 
                ? `<p class="text-xs text-purple-400 mt-1">🌟 abilita : ${player.abilities.join(', ')}</p>` 
                : '';
            
            return `
                <div class="p-4 bg-gray-800 rounded-lg border border-gray-600 hover:border-blue-500 transition" data-player-index="${index}">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="text-lg font-bold text-white">${player.name}</p>
                            <p class="text-sm text-gray-400">
                                Ruolo: <span class="text-yellow-400">${player.role}</span> | 
                                Tipo: <span class="text-cyan-400">${player.type}</span> | 
                                Eta: <span class="text-gray-300">${player.age}</span> |
                                Livello: <span class="text-green-400">${player.level !== undefined ? player.level : (player.levelRange && Array.isArray(player.levelRange) ? player.levelRange[0] : (player.levelMin || 1))}</span>
                            </p>
                            ${abilitiesDisplay}
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="window.AdminTeams.editPlayer(${index})" 
                                    class="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition text-sm">
                                ✏️
                            </button>
                            <button onclick="window.AdminTeams.deletePlayer(${index})" 
                                    class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Aggiungi nuovo giocatore
     */
    addNewPlayer() {
        this.openPlayerEditModal(-1); // -1 = nuovo
    },

    /**
     * Modifica giocatore esistente
     */
    editPlayer(index) {
        this.openPlayerEditModal(index);
    },

    /**
     * Elimina giocatore
     */
    deletePlayer(index) {
        if (!confirm(`Eliminare "${this.currentEditingPlayers[index].name}" dalla rosa?`)) return;
        
        this.currentEditingPlayers.splice(index, 1);
        document.getElementById('players-list-edit').innerHTML = this.renderPlayersList();
        
        // Aggiorna contatore nel tab
        document.getElementById('tab-players').innerHTML = `⚽ Giocatori (${this.currentEditingPlayers.length})`;
    },

    /**
     * Apre modal per editare/creare singolo giocatore
     */
    openPlayerEditModal(index) {
        const isNew = index === -1;
        const player = isNew ? {
            name: '',
            role: 'A',
            type: 'Potenza',
            age: 25,
            levelMin: 1,
            levelMax: 10,
            abilities: []
        } : (function() {
            const p = JSON.parse(JSON.stringify(this.currentEditingPlayers[index]));
            if (p.level !== undefined) {
                p.singleLevel = p.level;
            }
            return p;
        }.bind(this))();

        // Determina se il giocatore ha un livello fisso (player.level o levelRange con stesso valore min/max)
        const originalPlayer = !isNew ? this.currentEditingPlayers[index] : null;
        const hasFixedLevel = !isNew && (
            originalPlayer.level !== undefined ||
            (originalPlayer.levelRange && Array.isArray(originalPlayer.levelRange))
        );

        // Calcola il valore del livello da mostrare
        let levelValue = 1;
        if (hasFixedLevel) {
            if (originalPlayer.level !== undefined) {
                levelValue = originalPlayer.level;
            } else if (originalPlayer.levelRange && Array.isArray(originalPlayer.levelRange)) {
                levelValue = originalPlayer.levelRange[0];
            }
        } else if (player.levelMin) {
            levelValue = player.levelMin;
        }

        const modalHtml = `
            <div id="player-edit-modal" class="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-[60]">
                <div class="bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 border-2 border-blue-500">
                    <h4 class="text-2xl font-bold text-yellow-400 mb-4">${isNew ? '➕ Nuovo Giocatore' : '✏️ Modifica Giocatore'}</h4>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Nome *</label>
                                <input type="text" id="player-name-input" value="${player.name}" placeholder="Es: Marco Rossi"
                                       class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            </div>
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Eta </label>
                                <input type="number" id="player-age-input" value="${player.age}" min="18" max="40"
                                       class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Ruolo *</label>
                                <select id="player-role-input" class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500"
                                        onchange="window.AdminTeams.updateAbilitiesForRole()">
                                    <option value="P" ${player.role === 'P' ? 'selected' : ''}>🧤 Portiere</option>
                                    <option value="D" ${player.role === 'D' ? 'selected' : ''}>🛡 Difensore</option>
                                    <option value="C" ${player.role === 'C' ? 'selected' : ''}>⚙ Centrocampista</option>
                                    <option value="A" ${player.role === 'A' ? 'selected' : ''}>⚡ Attaccante</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Tipo</label>
                                <select id="player-type-input" class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                                    <option value="Potenza" ${player.type === 'Potenza' ? 'selected' : ''}>💪 Potenza</option>
                                    <option value="Tecnica" ${player.type === 'Tecnica' ? 'selected' : ''}>🎯 Tecnica</option>
                                    <option value="Velocita" ${player.type === 'Velocita' ? 'selected' : ''}>⚡ Velocita</option>
                                </select>
                            </div>
                        </div>

                        ${hasFixedLevel ? `
                        <div>
                            <label class="text-gray-300 block mb-1 font-bold">Livello *</label>
                            <input type="number" id="player-level-single" value="${levelValue}" min="1" max="20"
                                   class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            <p class="text-xs text-green-400 mt-1">Livello fisso del giocatore in squadra (1-20)</p>
                        </div>
                        ` : `
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Livello Min *</label>
                                <input type="number" id="player-levelmin-input" value="${player.levelMin || 1}" min="1" max="20"
                                       class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            </div>
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">Livello Max *</label>
                                <input type="number" id="player-levelmax-input" value="${player.levelMax || 10}" min="1" max="20"
                                       class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500">
                            </div>
                        </div>
                        <p class="text-xs text-yellow-400 -mt-2">Range per giocatori da assegnare (1-20)</p>
                        `}

                        <!-- EXP -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">EXP Attuale</label>
                                <input type="number" id="player-exp-input" value="${player.exp || 0}" min="0"
                                       class="w-full p-2 bg-gray-700 border border-purple-600 rounded text-purple-300 focus:border-purple-400">
                            </div>
                            <div>
                                <label class="text-gray-300 block mb-1 font-bold">EXP per Prossimo Lv</label>
                                <input type="number" id="player-expnext-input" value="${player.expToNextLevel || 100}" readonly disabled
                                       class="w-full p-2 bg-gray-600 border border-gray-500 rounded text-gray-400">
                            </div>
                        </div>
                        <p class="text-xs text-purple-400 -mt-2">L'EXP viene usato per il sistema di progressione</p>

                        <!-- Giocatore Serio -->
                        <div class="bg-gray-900 p-3 rounded border border-orange-500">
                            <label class="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" id="player-serious-check" ${player.isSeriousPlayer ? 'checked' : ''}
                                       class="form-checkbox h-5 w-5 text-orange-500 rounded">
                                <div>
                                    <span class="text-orange-400 font-bold">Giocatore Serio</span>
                                    <p class="text-xs text-gray-400 mt-1">Se attivo, il livello massimo del giocatore e' limitato a 10 (indipendentemente dal tipo)</p>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label class="text-gray-300 block mb-2 font-bold">Abilita</label>
                            <p class="text-xs text-yellow-300 mb-2">Max 3 positive + 2 negative</p>
                            <div id="abilities-selection" class="space-y-3" data-editing-index="${index}">
                                ${this.renderAbilitiesSelection(player.role, player.abilities || [], this.isPlayerIcona(player), index)}
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
                        <button onclick="window.AdminTeams.closePlayerEditModal()" 
                                class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition font-bold">
                            Annulla
                        </button>
                        <button onclick="window.AdminTeams.savePlayerEdit(${index})" 
                                class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-bold">
                            💾 Salva Giocatore
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * Renderizza selezione abilita
     * @param {string} role - Ruolo del giocatore
     * @param {Array} currentAbilities - Abilita attuali del giocatore
     * @param {boolean} isIcona - Se il giocatore e' un'icona
     * @param {number} editingIndex - Indice del giocatore in modifica (-1 per nuovo)
     */
    renderAbilitiesSelection(role, currentAbilities, isIcona = false, editingIndex = -1) {
        const roleAbilities = this.ROLE_ABILITIES_MAP[role];
        if (!roleAbilities) return '<p class="text-gray-400">Nessuna abilita disponibile</p>';

        // Verifica se esiste gia un'icona nella rosa (escludendo il giocatore in modifica)
        const existsOtherIcona = this.currentEditingPlayers && this.currentEditingPlayers.some((p, i) => {
            if (i === editingIndex) return false; // Escludi giocatore corrente
            return p.abilities && p.abilities.includes('Icona');
        });

        let html = '<div class="bg-gray-900 p-3 rounded border border-green-500"><h5 class="text-green-400 font-bold mb-2">Abilita Positive (Max 3)</h5><div class="grid grid-cols-2 gap-2">';

        roleAbilities.positive.forEach(ability => {
            const checked = currentAbilities.includes(ability) ? 'checked' : '';
            html += `
                <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800 p-1 rounded">
                    <input type="checkbox" value="${ability}" ${checked} class="ability-positive-check form-checkbox h-4 w-4 text-green-500" 
                           onchange="window.AdminTeams.validateAbilitySelection()">
                    <span class="text-gray-300">${ability}</span>
                </label>
            `;
        });
        
        html += '</div></div>';
        
        html += '<div class="bg-gray-900 p-3 rounded border border-red-500 mt-3"><h5 class="text-red-400 font-bold mb-2">Abilita Negative (Max 2)</h5>';
        html += '<p class="text-xs text-yellow-300 mb-2">Attenzione: effetti dannosi!</p><div class="grid grid-cols-2 gap-2">';
        
        roleAbilities.negative.forEach(ability => {
            const checked = currentAbilities.includes(ability) ? 'checked' : '';
            html += `
                <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800 p-1 rounded">
                    <input type="checkbox" value="${ability}" ${checked} class="ability-negative-check form-checkbox h-4 w-4 text-red-500" 
                           onchange="window.AdminTeams.validateAbilitySelection()">
                    <span class="text-gray-300">${ability}</span>
                </label>
            `;
        });

        html += '</div></div>';

        // Abilita Uniche (solo per Admin)
        if (roleAbilities.unique && roleAbilities.unique.length > 0) {
            html += '<div class="bg-gray-900 p-3 rounded border border-yellow-500 mt-3"><h5 class="text-yellow-400 font-bold mb-2">👑 Abilita Uniche (Solo Admin)</h5>';
            html += '<p class="text-xs text-yellow-300 mb-2">Abilita speciali riservate alle Icone</p><div class="grid grid-cols-2 gap-2">';

            roleAbilities.unique.forEach(ability => {
                // Per le Icone (giocatori speciali), l'abilita "Icona" e sempre checked e bloccata
                const isIconaAbility = ability === 'Icona';
                const isLocked = isIcona && isIconaAbility;
                // Blocca "Icona" se esiste gia un'altra icona nella rosa
                const isBlockedByOtherIcona = isIconaAbility && existsOtherIcona && !isIcona;
                const checked = isLocked || currentAbilities.includes(ability) ? 'checked' : '';
                const disabled = isLocked || isBlockedByOtherIcona ? 'disabled' : '';
                const lockedStyle = (isLocked || isBlockedByOtherIcona) ? 'opacity-75 cursor-not-allowed' : '';
                let lockedNote = '';
                if (isLocked) {
                    lockedNote = ' (Fissa)';
                } else if (isBlockedByOtherIcona) {
                    lockedNote = ' (Gia presente)';
                }

                html += `
                    <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800 p-1 rounded ${lockedStyle}">
                        <input type="checkbox" value="${ability}" ${checked} ${disabled} class="ability-unique-check form-checkbox h-4 w-4 text-yellow-500"
                               onchange="window.AdminTeams.validateAbilitySelection()">
                        <span class="text-yellow-300 font-bold">${ability}${lockedNote}</span>
                    </label>
                `;
            });

            html += '</div></div>';
        }

        return html;
    },

    /**
     * Aggiorna abilita quando cambia ruolo
     */
    updateAbilitiesForRole() {
        const role = document.getElementById('player-role-input').value;
        const abilitiesDiv = document.getElementById('abilities-selection');
        const editingIndex = parseInt(abilitiesDiv.dataset.editingIndex) || -1;
        abilitiesDiv.innerHTML = this.renderAbilitiesSelection(role, [], false, editingIndex);
    },

    /**
     * Valida selezione abilita (max 3 positive, max 1 negativa)
     */
    validateAbilitySelection() {
        const positiveChecks = document.querySelectorAll('.ability-positive-check:checked');
        const negativeChecks = document.querySelectorAll('.ability-negative-check:checked');
        
        // Limita positive a 3
        if (positiveChecks.length > 3) {
            event.target.checked = false;
            alert('Massimo 3 abilita positive!');
            return false;
        }
        
        // Limita negative a 2
        if (negativeChecks.length > 2) {
            event.target.checked = false;
            alert('Massimo 2 abilita negative!');
            return false;
        }
        
        return true;
    },

    /**
     * Salva modifica giocatore
     */
    savePlayerEdit(index) {
        const name = document.getElementById('player-name-input').value.trim();
        const age = parseInt(document.getElementById('player-age-input').value);
        const role = document.getElementById('player-role-input').value;
        const type = document.getElementById('player-type-input').value;

        const levelSingleInput = document.getElementById('player-level-single');
        const hasFixedLevelInput = levelSingleInput !== null;

        let level;

        if (hasFixedLevelInput) {
            level = parseInt(levelSingleInput.value);
        } else {
            // Per nuovi giocatori con range, usa levelMin come livello iniziale
            const levelMin = parseInt(document.getElementById('player-levelmin-input').value);
            const levelMax = parseInt(document.getElementById('player-levelmax-input').value);

            if (levelMin > levelMax) {
                alert('Livello Min non puo essere maggiore di Livello Max!');
                return;
            }
            if (levelMin < 1 || levelMax > 20) {
                alert('I livelli devono essere tra 1 e 20!');
                return;
            }

            level = levelMin; // Usa il livello minimo come valore iniziale
        }

        // Cerca le checkbox solo all'interno del modal player-edit-modal
        const modal = document.getElementById('player-edit-modal');
        if (!modal) {
            console.error('Modal player-edit-modal non trovato!');
            return;
        }

        const positiveAbilities = Array.from(modal.querySelectorAll('.ability-positive-check:checked')).map(el => el.value);
        const negativeAbilities = Array.from(modal.querySelectorAll('.ability-negative-check:checked')).map(el => el.value);
        // Includi anche le checkbox disabled (per Icona bloccata sulle Icone)
        const uniqueAbilities = Array.from(modal.querySelectorAll('.ability-unique-check:checked, .ability-unique-check:disabled:checked')).map(el => el.value);
        let abilities = [...positiveAbilities, ...negativeAbilities, ...uniqueAbilities];

        // Per le Icone (giocatori speciali), assicurati che "Icona" sia sempre presente
        // NOTA: isCaptain e' il "capitano nominato" (bonus +1), diverso dall'Icona
        const originalPlayer = index !== -1 ? this.currentEditingPlayers[index] : {};
        if (this.isPlayerIcona(originalPlayer) && !abilities.includes('Icona')) {
            abilities.push('Icona');
        }

        // Debug: mostra tutte le checkbox unique trovate
        const allUniqueCheckboxes = modal.querySelectorAll('.ability-unique-check');
        console.log('Tutte checkbox unique trovate:', allUniqueCheckboxes.length);
        allUniqueCheckboxes.forEach(cb => {
            console.log(`  - ${cb.value}: checked=${cb.checked}`);
        });

        console.log('Abilita positive:', positiveAbilities);
        console.log('Abilita negative:', negativeAbilities);
        console.log('Abilita unique:', uniqueAbilities);
        console.log('Abilita totali salvate:', abilities);

        // VALIDAZIONE: Impedisci di aggiungere "Icona" se esiste gia un'icona nella rosa
        if (abilities.includes('Icona')) {
            const existingIconaIndex = this.currentEditingPlayers.findIndex((p, i) => {
                // Escludi il giocatore che stiamo modificando (index)
                if (i === index) return false;
                return p.abilities && p.abilities.includes('Icona');
            });

            if (existingIconaIndex !== -1) {
                const existingIcona = this.currentEditingPlayers[existingIconaIndex];
                alert(`Errore: Esiste gia un'Icona nella rosa (${existingIcona.name})!\n\nOgni squadra puo avere solo 1 Icona. Rimuovi prima l'abilita "Icona" dall'altro giocatore.`);
                return;
            }
        }

        if (!name) {
            alert('Inserisci un nome!');
            return;
        }

        if (level < 1 || level > 20) {
            alert('Il livello deve essere tra 1 e 20!');
            return;
        }

        // Leggi EXP dal form
        const expInput = document.getElementById('player-exp-input');
        const exp = expInput ? parseInt(expInput.value) || 0 : (originalPlayer.exp || 0);

        // Leggi flag Giocatore Serio
        const seriousCheck = document.getElementById('player-serious-check');
        const isSeriousPlayer = seriousCheck ? seriousCheck.checked : false;

        const playerData = {
            id: index === -1 ? `player_${Date.now()}` : (originalPlayer.id || `player_${Date.now()}`),
            name,
            age,
            role,
            type,
            level, // Sempre usa level singolo
            abilities,
            cost: originalPlayer.cost || 0,
            isCaptain: originalPlayer.isCaptain || false,
            exp: exp,
            expToNextLevel: originalPlayer.expToNextLevel || 100,
            isSeriousPlayer: isSeriousPlayer
        };

        // Mantieni photoUrl se presente (per Icone)
        if (originalPlayer.photoUrl) {
            playerData.photoUrl = originalPlayer.photoUrl;
        }

        if (index === -1) {
            this.currentEditingPlayers.push(playerData);
        } else {
            this.currentEditingPlayers[index] = playerData;
        }

        console.log('PlayerData salvato:', JSON.stringify(playerData, null, 2));
        console.log('Abilita nel playerData:', playerData.abilities);

        this.closePlayerEditModal();
        document.getElementById('players-list-edit').innerHTML = this.renderPlayersList();
        document.getElementById('tab-players').innerHTML = `⚽ Giocatori (${this.currentEditingPlayers.length})`;
    },

    /**
     * Chiude modal giocatore
     */
    closePlayerEditModal() {
        const modal = document.getElementById('player-edit-modal');
        if (modal) modal.remove();
    },

    /**
     * Salva modifiche squadra
     */
    async saveTeamEdit(teamId, TEAMS_COLLECTION_PATH) {
        const teamName = document.getElementById('edit-team-name').value.trim();
        const budget = parseInt(document.getElementById('edit-budget').value);
        const creditiSuperSeri = parseInt(document.getElementById('edit-css').value) || 0;
        const isAdmin = document.getElementById('edit-is-admin')?.checked || false;
        const draft_enabled = document.getElementById('edit-draft-enabled')?.checked || false;

        if (!teamName || teamName.length < 3) {
            alert('Il nome squadra deve avere almeno 3 caratteri!');
            return;
        }
        
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        const msgElement = document.getElementById('edit-message');
        msgElement.textContent = '¢³ Salvataggio in corso...';
        msgElement.className = 'text-center text-sm mb-4 text-yellow-400';
        
        try {
            // Sincronizza la formazione con i giocatori modificati
            const updatedFormation = this.syncFormationWithPlayers(
                this.currentEditingTeamData.formation,
                this.currentEditingPlayers
            );

            // Sincronizza playersFormStatus con i nuovi livelli dei giocatori
            const updatedFormStatus = this.syncFormStatusWithPlayers(
                this.currentEditingTeamData.playersFormStatus,
                this.currentEditingPlayers
            );

            await updateDoc(teamDocRef, {
                teamName,
                budget,
                creditiSuperSeri,
                isAdmin,
                draft_enabled,
                players: this.currentEditingPlayers,
                formation: updatedFormation,
                playersFormStatus: updatedFormStatus
            });
            
            msgElement.textContent = ' Modifiche salvate con successo!';
            msgElement.className = 'text-center text-sm mb-4 text-green-400';
            
            setTimeout(() => {
                this.closeEditTeamModal();
                if (this.reloadCallback) this.reloadCallback();
            }, 1000);
            
        } catch (error) {
            console.error('Errore salvataggio:', error);
            msgElement.textContent = `¢Å’ Errore: ${error.message}`;
            msgElement.className = 'text-center text-sm mb-4 text-red-400';
        }
    },

    /**
     * Sincronizza playersFormStatus con i nuovi livelli dei giocatori.
     * Aggiorna il campo 'level' in playersFormStatus per riflettere le modifiche admin.
     * Ricalcola il livello basandosi sul nuovo livello base + modificatore forma esistente.
     */
    syncFormStatusWithPlayers(formStatus, players) {
        if (!formStatus) {
            return {};
        }

        const updatedFormStatus = { ...formStatus };

        // Crea una mappa dei giocatori per ID
        const playersMap = new Map();
        players.forEach(p => playersMap.set(p.id, p));

        // Aggiorna ogni entry in formStatus
        for (const playerId in updatedFormStatus) {
            const player = playersMap.get(playerId);
            if (player) {
                const existingForm = updatedFormStatus[playerId];
                const formMod = existingForm.mod || 0;
                // Ricalcola il livello: nuovo livello base + modificatore forma esistente
                const newLevel = Math.min(30, Math.max(1, (player.level || 1) + formMod));

                updatedFormStatus[playerId] = {
                    ...existingForm,
                    level: newLevel
                };
            } else {
                // Rimuovi formStatus per giocatori eliminati
                delete updatedFormStatus[playerId];
            }
        }

        return updatedFormStatus;
    },

    /**
     * Sincronizza la formazione con i giocatori modificati.
     * Aggiorna i dati dei giocatori in titolari/panchina con quelli dalla rosa.
     * Rimuove dalla formazione i giocatori eliminati dalla rosa.
     */
    syncFormationWithPlayers(formation, players) {
        if (!formation) {
            return { modulo: '1-1-2-1', titolari: [], panchina: [] };
        }

        // Crea una mappa dei giocatori per ID per lookup veloce
        const playersMap = new Map();
        players.forEach(p => playersMap.set(p.id, p));

        // Funzione helper per sincronizzare un giocatore
        const syncPlayer = (formationPlayer) => {
            const updatedPlayer = playersMap.get(formationPlayer.id);
            const synced = {
                ...formationPlayer,
                name: updatedPlayer.name,
                role: updatedPlayer.role,
                type: updatedPlayer.type,
                age: updatedPlayer.age,
                level: updatedPlayer.level,
                abilities: updatedPlayer.abilities || [],
                cost: updatedPlayer.cost || 0,
                isCaptain: updatedPlayer.isCaptain || false
            };
            // Copia campi opzionali importanti dal player aggiornato
            if (updatedPlayer.photoUrl) synced.photoUrl = updatedPlayer.photoUrl;
            if (updatedPlayer.exp !== undefined) synced.exp = updatedPlayer.exp;
            if (updatedPlayer.expToNextLevel !== undefined) synced.expToNextLevel = updatedPlayer.expToNextLevel;
            if (updatedPlayer.totalMatchesPlayed !== undefined) synced.totalMatchesPlayed = updatedPlayer.totalMatchesPlayed;
            if (updatedPlayer.secretMaxLevel !== undefined) synced.secretMaxLevel = updatedPlayer.secretMaxLevel;
            if (updatedPlayer.isBase !== undefined) synced.isBase = updatedPlayer.isBase;
            if (updatedPlayer.isSeriousPlayer !== undefined) synced.isSeriousPlayer = updatedPlayer.isSeriousPlayer;
            if (updatedPlayer.contract !== undefined) synced.contract = updatedPlayer.contract;
            return synced;
        };

        // Aggiorna titolari: mantieni solo quelli ancora nella rosa e aggiorna i loro dati
        const updatedTitolari = (formation.titolari || [])
            .filter(t => playersMap.has(t.id))
            .map(syncPlayer);

        // Aggiorna panchina: mantieni solo quelli ancora nella rosa e aggiorna i loro dati
        const updatedPanchina = (formation.panchina || [])
            .filter(p => playersMap.has(p.id))
            .map(syncPlayer);

        return {
            modulo: formation.modulo || '1-1-2-1',
            titolari: updatedTitolari,
            panchina: updatedPanchina
        };
    },

    /**
     * Chiude la modale
     */
    closeEditTeamModal() {
        if (this.modalInstance) {
            this.modalInstance.remove();
            this.modalInstance = null;
        }
        this.currentEditingTeamId = null;
        this.currentEditingPlayers = [];
        this.currentEditingTeamData = null;
        this.reloadCallback = null;
    },

    /**
     * Ripara automaticamente i dati della squadra:
     * - Icona: mantiene il livello attuale (default 5 se non definito)
     * - Giocatori Base: livello fissato a 1
     * - Rimuove levelRange, levelMin, levelMax obsoleti
     * - Converte tutto in formato level singolo
     * - Preserva i campi EXP
     */
    repairTeam() {
        const msgElement = document.getElementById('repair-message');
        if (!msgElement) return;

        if (!this.currentEditingPlayers || this.currentEditingPlayers.length === 0) {
            msgElement.textContent = 'Nessun giocatore da riparare.';
            msgElement.className = 'text-center text-sm mt-2 text-yellow-400';
            return;
        }

        let repairs = [];

        // Carica template icone per riparare abilities
        const iconeTemplates = window.CAPTAIN_CANDIDATES_TEMPLATES || [];

        this.currentEditingPlayers = this.currentEditingPlayers.map(player => {
            const isIcona = player.abilities && player.abilities.includes('Icona');
            const isBasePlayer = player.name && (
                player.name.includes('Base') ||
                player.name === 'Portiere Base' ||
                player.name === 'Difensore Base' ||
                player.name.includes('Centrocampista Base') ||
                player.name === 'Attaccante Base'
            );

            // Determina il livello corretto
            let correctLevel;
            if (isIcona) {
                // Icone: mantieni il livello attuale, default 5 se non definito
                // NON usare levelRange per le icone (era un bug)
                correctLevel = player.level !== undefined ? player.level : 5;
            } else if (isBasePlayer) {
                correctLevel = 1;
            } else {
                // Per altri giocatori, usa il livello esistente o estrai da levelRange
                if (player.level !== undefined) {
                    correctLevel = player.level;
                } else if (player.levelRange && Array.isArray(player.levelRange)) {
                    correctLevel = player.levelRange[0];
                } else if (player.levelMin !== undefined) {
                    correctLevel = player.levelMin;
                } else {
                    correctLevel = 1;
                }
            }

            // Controlla se serve riparazione
            const currentLevel = player.level !== undefined ? player.level :
                                 (player.levelRange ? player.levelRange[0] : (player.levelMin || 1));

            const needsLevelFix = currentLevel !== correctLevel;
            const hasObsoleteFields = player.levelRange || player.levelMin !== undefined || player.levelMax !== undefined;

            // FIX ABILITIES ICONE: controlla se l'icona ha abilities incomplete
            let correctAbilities = player.abilities || [];
            let needsAbilitiesFix = false;

            if (isIcona) {
                // Cerca l'icona template per nome o id
                const iconaTemplate = iconeTemplates.find(t =>
                    t.id === player.id || t.name === player.name
                );

                if (iconaTemplate && iconaTemplate.abilities) {
                    // Controlla se mancano abilities (es. solo ['Icona'] invece di ['Icona', 'Tiro Dritto'])
                    const templateAbilities = iconaTemplate.abilities;
                    const playerAbilities = player.abilities || [];
                    const missingAbilities = templateAbilities.filter(a => !playerAbilities.includes(a));

                    if (missingAbilities.length > 0) {
                        correctAbilities = [...new Set([...playerAbilities, ...templateAbilities])];
                        needsAbilitiesFix = true;
                    }
                }
            }

            if (needsLevelFix || hasObsoleteFields || needsAbilitiesFix) {
                let repairNote = `${player.name}: `;
                const fixes = [];
                if (needsLevelFix) {
                    fixes.push(`Lv ${currentLevel} -> ${correctLevel}`);
                }
                if (hasObsoleteFields) {
                    fixes.push('rimossi campi obsoleti');
                }
                if (needsAbilitiesFix) {
                    const originalAbilities = player.abilities || [];
                    const added = correctAbilities.filter(a => !originalAbilities.includes(a));
                    fixes.push(`+${added.join(', ')}`);
                }
                repairNote += fixes.join(', ');
                repairs.push(repairNote);
            }

            // Crea oggetto giocatore pulito
            const repairedPlayer = {
                id: player.id,
                name: player.name,
                role: player.role,
                type: player.type,
                age: player.age,
                cost: player.cost || 0,
                level: correctLevel,
                abilities: correctAbilities, // Usa abilities corrette
                isCaptain: player.isCaptain || false
            };

            // Mantieni photoUrl se presente (per Icone)
            if (player.photoUrl) {
                repairedPlayer.photoUrl = player.photoUrl;
            }

            // Mantieni campi EXP se presenti
            if (player.exp !== undefined) repairedPlayer.exp = player.exp;
            if (player.expToNextLevel !== undefined) repairedPlayer.expToNextLevel = player.expToNextLevel;
            if (player.totalMatchesPlayed !== undefined) repairedPlayer.totalMatchesPlayed = player.totalMatchesPlayed;

            // Mantieni altri campi importanti
            if (player.secretMaxLevel !== undefined) repairedPlayer.secretMaxLevel = player.secretMaxLevel;
            if (player.isBase !== undefined) repairedPlayer.isBase = player.isBase;
            if (player.isSeriousPlayer !== undefined) repairedPlayer.isSeriousPlayer = player.isSeriousPlayer;
            if (player.contract !== undefined) repairedPlayer.contract = player.contract;

            return repairedPlayer;
        });

        // Aggiorna la lista visuale
        document.getElementById('players-list-edit').innerHTML = this.renderPlayersList();
        document.getElementById('tab-players').innerHTML = `⚽ Giocatori (${this.currentEditingPlayers.length})`;

        // Mostra risultato
        if (repairs.length > 0) {
            msgElement.innerHTML = `<span class="text-green-400"> Riparati ${repairs.length} giocatori:</span><br><span class="text-xs text-gray-300">${repairs.join('<br>')}</span>`;
            msgElement.className = 'text-center text-sm mt-2';
        } else {
            msgElement.textContent = ' Nessuna riparazione necessaria. Tutti i dati sono corretti.';
            msgElement.className = 'text-center text-sm mt-2 text-green-400';
        }
    },

    /**
     * Rimuove icone duplicate dalla rosa, mantenendo solo l'icona originale
     * L'icona originale e' quella con photoUrl (dal template CAPTAIN_CANDIDATES)
     */
    fixDuplicateIcone() {
        const msgElement = document.getElementById('repair-message');
        if (!msgElement) return;

        if (!this.currentEditingPlayers || this.currentEditingPlayers.length === 0) {
            msgElement.textContent = 'Nessun giocatore nella rosa.';
            msgElement.className = 'text-center text-sm mt-2 text-yellow-400';
            return;
        }

        // Trova tutti i giocatori con abilita "Icona"
        const icone = this.currentEditingPlayers.filter(p => p.abilities && p.abilities.includes('Icona'));

        if (icone.length <= 1) {
            msgElement.textContent = 'Nessuna icona duplicata trovata.';
            msgElement.className = 'text-center text-sm mt-2 text-green-400';
            return;
        }

        // L'icona "vera" e' quella con photoUrl (dal template)
        const iconaVera = icone.find(p => p.photoUrl) || icone[0];
        const iconeFalse = icone.filter(p => p !== iconaVera);

        let fixes = [];

        // Rimuovi l'abilita "Icona" dalle icone false
        this.currentEditingPlayers = this.currentEditingPlayers.map(player => {
            if (iconeFalse.includes(player)) {
                const newAbilities = (player.abilities || []).filter(a => a !== 'Icona');
                fixes.push(`Rimossa abilita "Icona" da ${player.name}`);
                return {
                    ...player,
                    abilities: newAbilities,
                    isCaptain: false
                };
            }
            return player;
        });

        // Aggiorna la lista visuale
        document.getElementById('players-list-edit').innerHTML = this.renderPlayersList();
        document.getElementById('tab-players').innerHTML = `⚽ Giocatori (${this.currentEditingPlayers.length})`;

        // Mostra risultato
        if (fixes.length > 0) {
            const escapedFixes = fixes.map(f => window.escapeHtml ? window.escapeHtml(f) : f).join('<br>');
            const escapedName = window.escapeHtml ? window.escapeHtml(iconaVera.name) : iconaVera.name;
            msgElement.innerHTML = `<span class="text-green-400">✅ Corrette ${fixes.length} icone duplicate:</span><br><span class="text-xs text-gray-300">${escapedFixes}</span><br><span class="text-yellow-400 text-xs mt-2">Icona mantenuta: ${escapedName}</span>`;
            msgElement.className = 'text-center text-sm mt-2';
        }
    },

    /**
     * Fix livelli di tutte le squadre in batch
     * Applica la stessa logica di repairTeam() a tutte le squadre
     * @param {string} TEAMS_COLLECTION_PATH - Path della collection squadre
     */
    async fixAllTeamsLevels(TEAMS_COLLECTION_PATH) {
        const { collection, getDocs, doc, updateDoc } = window.firestoreTools;
        const db = window.db;

        const msgElement = document.getElementById('fix-all-levels-message');
        const button = document.getElementById('btn-fix-all-teams-levels');

        if (msgElement) {
            msgElement.textContent = 'Caricamento squadre...';
            msgElement.className = 'text-center text-sm mb-3 text-yellow-400';
        }
        if (button) {
            button.disabled = true;
            button.textContent = '⏳ Elaborazione...';
        }

        try {
            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const querySnapshot = await getDocs(teamsCollectionRef);

            if (querySnapshot.empty) {
                if (msgElement) {
                    msgElement.textContent = 'Nessuna squadra trovata.';
                    msgElement.className = 'text-center text-sm mb-3 text-yellow-400';
                }
                return;
            }

            let totalTeamsFixed = 0;
            let totalPlayersFixed = 0;
            const teamResults = [];

            for (const teamDoc of querySnapshot.docs) {
                const teamId = teamDoc.id;
                const teamData = teamDoc.data();

                // Salta serieseria (account admin puro)
                if (teamData.teamName && teamData.teamName.toLowerCase() === 'serieseria') {
                    continue;
                }

                if (!teamData.players || !Array.isArray(teamData.players)) {
                    continue;
                }

                let teamRepairs = [];

                // Applica la logica di riparazione a ogni giocatore
                const repairedPlayers = teamData.players.map(player => {
                    const isIcona = player.abilities && player.abilities.includes('Icona');
                    const isBasePlayer = player.name && (
                        player.name.includes('Base') ||
                        player.name === 'Portiere Base' ||
                        player.name === 'Difensore Base' ||
                        player.name.includes('Centrocampista Base') ||
                        player.name === 'Attaccante Base'
                    );

                    // Determina il livello corretto
                    let correctLevel;
                    if (isIcona) {
                        // Icone: mantieni il livello attuale, default 5 se non definito
                        // NON usare levelRange per le icone (era un bug)
                        correctLevel = player.level !== undefined ? player.level : 5;
                    } else if (isBasePlayer) {
                        correctLevel = 1;
                    } else {
                        // Per altri giocatori, usa il livello esistente o estrai da levelRange
                        if (player.level !== undefined) {
                            correctLevel = player.level;
                        } else if (player.levelRange && Array.isArray(player.levelRange)) {
                            correctLevel = player.levelRange[0];
                        } else if (player.levelMin !== undefined) {
                            correctLevel = player.levelMin;
                        } else {
                            correctLevel = 1;
                        }
                    }

                    // Controlla se serve riparazione
                    const currentLevel = player.level !== undefined ? player.level :
                                         (player.levelRange ? player.levelRange[0] : (player.levelMin || 1));

                    const needsLevelFix = currentLevel !== correctLevel;
                    const hasObsoleteFields = player.levelRange || player.levelMin !== undefined || player.levelMax !== undefined;

                    if (needsLevelFix || hasObsoleteFields) {
                        teamRepairs.push(`${player.name}: Lv ${currentLevel} -> ${correctLevel}`);
                    }

                    // Crea oggetto giocatore pulito
                    const repairedPlayer = {
                        id: player.id,
                        name: player.name,
                        role: player.role,
                        type: player.type,
                        age: player.age,
                        cost: player.cost || 0,
                        level: correctLevel,
                        abilities: player.abilities || [],
                        isCaptain: player.isCaptain || false
                    };

                    // Mantieni photoUrl se presente (per Icone)
                    if (player.photoUrl) {
                        repairedPlayer.photoUrl = player.photoUrl;
                    }

                    // Mantieni campi EXP se presenti
                    if (player.exp !== undefined) repairedPlayer.exp = player.exp;
                    if (player.expToNextLevel !== undefined) repairedPlayer.expToNextLevel = player.expToNextLevel;
                    if (player.totalMatchesPlayed !== undefined) repairedPlayer.totalMatchesPlayed = player.totalMatchesPlayed;

                    // Mantieni altri campi importanti
                    if (player.secretMaxLevel !== undefined) repairedPlayer.secretMaxLevel = player.secretMaxLevel;
                    if (player.isBase !== undefined) repairedPlayer.isBase = player.isBase;
                    if (player.isSeriousPlayer !== undefined) repairedPlayer.isSeriousPlayer = player.isSeriousPlayer;
                    if (player.contract !== undefined) repairedPlayer.contract = player.contract;

                    return repairedPlayer;
                });

                // Se ci sono riparazioni, aggiorna la squadra su Firestore
                if (teamRepairs.length > 0) {
                    // Sincronizza anche la formazione
                    const updatedFormation = this.syncFormationWithPlayers(
                        teamData.formation,
                        repairedPlayers
                    );

                    // Sincronizza playersFormStatus
                    const updatedFormStatus = this.syncFormStatusWithPlayers(
                        teamData.playersFormStatus,
                        repairedPlayers
                    );

                    const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                    await updateDoc(teamDocRef, {
                        players: repairedPlayers,
                        formation: updatedFormation,
                        playersFormStatus: updatedFormStatus
                    });

                    totalTeamsFixed++;
                    totalPlayersFixed += teamRepairs.length;
                    teamResults.push({
                        teamName: teamData.teamName,
                        repairs: teamRepairs.length
                    });
                }
            }

            // Mostra risultato
            if (msgElement) {
                if (totalTeamsFixed > 0) {
                    const teamsSummary = teamResults.map(t => `${t.teamName}: ${t.repairs} fix`).join(', ');
                    msgElement.innerHTML = `<span class="text-green-400">✅ Completato!</span><br>
                        <span class="text-white">Squadre corrette: ${totalTeamsFixed}</span><br>
                        <span class="text-white">Giocatori corretti: ${totalPlayersFixed}</span><br>
                        <span class="text-xs text-gray-400">${teamsSummary}</span>`;
                    msgElement.className = 'text-center text-sm mb-3';
                } else {
                    msgElement.textContent = '✅ Nessuna correzione necessaria. Tutti i dati sono gia corretti.';
                    msgElement.className = 'text-center text-sm mb-3 text-green-400';
                }
            }

            // Ricarica la lista squadre
            if (this.teamsListContainer) {
                this.loadTeams(TEAMS_COLLECTION_PATH);
            }

        } catch (error) {
            console.error('Errore nel fix di tutte le squadre:', error);
            if (msgElement) {
                msgElement.textContent = `❌ Errore: ${error.message}`;
                msgElement.className = 'text-center text-sm mb-3 text-red-400';
            }
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = '🔧 Fix Livelli Tutte le Squadre';
            }
        }
    },

    /**
     * Aggiorna le abilita delle icone esistenti con le nuove abilita uniche
     * da icone.js (legge da CAPTAIN_CANDIDATES_TEMPLATES)
     */
    async updateIconeAbilities() {
        const appId = window.firestoreTools?.appId || window.currentAppId;
        if (!appId) {
            console.error('[AdminTeams] appId non disponibile');
            return;
        }
        const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

        const { collection, getDocs, doc, updateDoc } = window.firestoreTools;
        const db = window.db;

        // Leggi direttamente da CAPTAIN_CANDIDATES_TEMPLATES (icone.js)
        const iconeTemplates = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
        if (iconeTemplates.length === 0) {
            console.error('❌ CAPTAIN_CANDIDATES_TEMPLATES non disponibile!');
            alert('❌ Errore: CAPTAIN_CANDIDATES_TEMPLATES non caricato');
            return;
        }

        // Crea mappa ID -> abilities dai template
        const ICONE_ABILITIES = {};
        iconeTemplates.forEach(icona => {
            ICONE_ABILITIES[icona.id] = icona.abilities || ['Icona'];
            // Aggiungi anche per nome (fallback)
            if (icona.name) {
                ICONE_ABILITIES[icona.name.toLowerCase()] = icona.abilities || ['Icona'];
            }
        });

        console.log('📋 Mappa abilita icone:', ICONE_ABILITIES);

        let updatedCount = 0;
        let teamsUpdated = [];
        let details = [];

        try {
            console.log('🔄 Inizio aggiornamento abilita icone...');

            const teamsRef = collection(db, TEAMS_COLLECTION_PATH);
            const querySnapshot = await getDocs(teamsRef);

            for (const docSnap of querySnapshot.docs) {
                const teamId = docSnap.id;
                const teamData = docSnap.data();

                if (!teamData.players || !Array.isArray(teamData.players)) continue;

                // Trova il giocatore icona
                let iconaUpdated = false;
                const updatedPlayers = teamData.players.map(player => {
                    // Controlla se e un'icona
                    if (player.abilities && player.abilities.includes('Icona')) {
                        // Trova l'id dell'icona (prova ID, poi nome lowercase)
                        const iconaId = player.id;
                        const iconaNameLower = (player.name || '').toLowerCase();

                        let newAbilities = ICONE_ABILITIES[iconaId] || ICONE_ABILITIES[iconaNameLower];

                        if (newAbilities) {
                            // Controlla se le abilita sono diverse
                            const currentAbilities = player.abilities || [];
                            const currentSorted = [...currentAbilities].sort().join(',');
                            const newSorted = [...newAbilities].sort().join(',');

                            if (currentSorted !== newSorted) {
                                console.log(`  Aggiornando ${player.name} (${iconaId}): [${currentAbilities.join(', ')}] -> [${newAbilities.join(', ')}]`);
                                details.push(`${teamData.teamName}: ${player.name} [${currentAbilities.join(', ')}] -> [${newAbilities.join(', ')}]`);
                                iconaUpdated = true;
                                return { ...player, abilities: newAbilities };
                            }
                        } else {
                            console.warn(`  ⚠️ Icona non trovata in template: ${player.name} (${iconaId})`);
                        }
                    }
                    return player;
                });

                if (iconaUpdated) {
                    const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                    await updateDoc(teamDocRef, { players: updatedPlayers });
                    updatedCount++;
                    teamsUpdated.push(teamData.teamName);
                }
            }

            console.log(`✅ Aggiornamento completato! ${updatedCount} squadre aggiornate.`);
            if (teamsUpdated.length > 0) {
                console.log(`   Squadre: ${teamsUpdated.join(', ')}`);
            }
            if (details.length > 0) {
                console.log('📝 Dettagli modifiche:');
                details.forEach(d => console.log(`   ${d}`));
            }

            const detailsText = details.length > 0 ? `\n\nDettagli:\n${details.join('\n')}` : '';
            alert(`✅ Aggiornamento abilita icone completato!\n\n${updatedCount} squadre aggiornate:\n${teamsUpdated.join('\n') || 'Nessuna (tutte gia corrette)'}${detailsText}`);

            // Ricarica la lista
            if (this.teamsListContainer) {
                this.loadTeams(TEAMS_COLLECTION_PATH);
            }

        } catch (error) {
            console.error('❌ Errore aggiornamento abilita icone:', error);
            alert(`❌ Errore: ${error.message}`);
        }
    }
};

// Esponi la funzione globalmente per poterla chiamare dalla console
window.updateIconeAbilities = () => window.AdminTeams.updateIconeAbilities();

console.log(' AdminTeams V2.0 caricato - UI migliorata con form per giocatori!');




