//
// ====================================================================
// MODULO INTERFACCIA-TEAM.JS (Gestione Logo e Eliminazione Squadra)
// ====================================================================
//

window.InterfacciaTeam = {

    /**
     * Gestisce il click sul logo per richiedere un nuovo URL.
     */
    async handleLogoClick(elements) {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        const { DEFAULT_LOGO_URL } = window.InterfacciaConstants;
        
        if (!currentTeamId) return;

        const newLogoUrl = prompt("Inserisci il link (URL) del nuovo logo della squadra:", elements.teamLogoElement.src);
        
        if (newLogoUrl === null) {
            return;
        }

        const trimmedUrl = newLogoUrl.trim();
        
        if (trimmedUrl === "" || !trimmedUrl.startsWith('http')) {
            const finalUrl = trimmedUrl.startsWith('http') ? trimmedUrl : DEFAULT_LOGO_URL;
            if (trimmedUrl !== "" && !trimmedUrl.startsWith('http')) {
                console.warn("Per favore, inserisci un URL valido (deve iniziare con http/https). Verrà utilizzato il placeholder.");
            }
            elements.teamLogoElement.src = finalUrl;
            window.InterfacciaCore.currentTeamData.logoUrl = finalUrl;
            await this.saveLogoUrl(finalUrl);
            return;
        }
        
        elements.teamLogoElement.src = trimmedUrl;
        window.InterfacciaCore.currentTeamData.logoUrl = trimmedUrl;
        
        await this.saveLogoUrl(trimmedUrl);
    },

    /**
     * Salva l'URL del logo su Firestore.
     */
    async saveLogoUrl(url) {
        const { doc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        
        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, currentTeamId);
            await updateDoc(teamDocRef, {
                logoUrl: url
            });
            window.InterfacciaCore.teamLogosMap[currentTeamId] = url;
            console.log("Logo aggiornato su Firestore con successo.");
        } catch (error) {
            console.error("Errore nel salvataggio del logo:", error);
            console.error("Errore nel salvataggio del logo su Firestore. Controlla la console.");
        }
    },

    /**
     * Apre la modale di conferma per l'eliminazione della squadra.
     * MODIFICATO: Blocca l'eliminazione se la squadra partecipa al campionato ATTIVO.
     */
    async openDeleteTeamModal(elements) {
        const currentTeamData = window.InterfacciaCore.currentTeamData;
        
        if (!currentTeamData || !elements.deleteTeamModal) return;

        // NUOVO: Controlla se la squadra partecipa al campionato E il campionato è attivo
        if (currentTeamData.isParticipating) {
            // Verifica se il campionato è attivo
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;
            
            try {
                const configDocRef = doc(window.db, CHAMPIONSHIP_CONFIG_PATH, 'settings');
                const configDoc = await getDoc(configDocRef);
                const isSeasonOver = configDoc.exists() ? (configDoc.data().isSeasonOver || false) : false;
                
                // Blocca eliminazione SOLO se il campionato è attivo (NON terminato)
                if (!isSeasonOver) {
                    alert('⚠️ Non puoi eliminare questa squadra perché sta partecipando a un campionato ATTIVO!\n\n' +
                          'Opzioni:\n' +
                          '1. Ritirati dal campionato usando il toggle nella dashboard\n' +
                          '2. Aspetta che l\'admin termini il campionato');
                    return;
                }
                
                // Il campionato è terminato, quindi può eliminare anche se isParticipating è true
                console.log('Campionato terminato: eliminazione permessa anche con isParticipating=true');
                
            } catch (error) {
                console.error('Errore nel controllo stato campionato:', error);
                alert('⚠️ Errore nel controllo dello stato del campionato. Riprova.');
                return;
            }
        }

        elements.teamNameToDeleteSpan.textContent = currentTeamData.teamName;
        elements.deleteConfirmationInput.value = '';
        elements.deleteMessage.textContent = '';
        elements.btnConfirmDeleteFinal.disabled = true;

        elements.deleteTeamModal.classList.remove('hidden');
        elements.deleteTeamModal.style.display = 'flex';
    },

    /**
     * Chiude la modale di conferma.
     */
    closeDeleteTeamModal(elements) {
        if (elements.deleteTeamModal) {
            elements.deleteTeamModal.classList.add('hidden');
            elements.deleteTeamModal.style.display = 'none';
        }
    },
    
    /**
     * Controlla l'input di conferma e abilita/disabilita il bottone finale.
     */
    checkConfirmationInput(elements) {
        const value = elements.deleteConfirmationInput.value.trim();
        if (value === "ELIMINA") {
            elements.btnConfirmDeleteFinal.disabled = false;
            elements.deleteMessage.textContent = "Pronto per l'eliminazione.";
            elements.deleteMessage.classList.remove('text-red-400');
            elements.deleteMessage.classList.add('text-green-500');
        } else {
            elements.btnConfirmDeleteFinal.disabled = true;
            elements.deleteMessage.textContent = '';
        }
    },
    
    /**
     * Esegue l'eliminazione effettiva del documento della squadra.
     * MODIFICATO: Doppio controllo della partecipazione al campionato ATTIVO.
     */
    async handleFinalTeamDeletion(elements) {
        const { doc, deleteDoc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
        const CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        
        if (!currentTeamId || elements.deleteConfirmationInput.value !== "ELIMINA") return;

        elements.btnConfirmDeleteFinal.disabled = true;
        elements.btnConfirmDeleteFinal.textContent = 'Verifica in corso...';
        elements.deleteMessage.textContent = 'Controllo stato partecipazione e campionato...';
        elements.deleteMessage.classList.remove('text-green-500');
        elements.deleteMessage.classList.add('text-yellow-400');

        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, currentTeamId);
            
            // NUOVO: Ricontrolla lo stato prima dell'eliminazione
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists() && teamDoc.data().isParticipating) {
                // Controlla se il campionato è attivo
                const configDocRef = doc(window.db, CHAMPIONSHIP_CONFIG_PATH, 'settings');
                const configDoc = await getDoc(configDocRef);
                const isSeasonOver = configDoc.exists() ? (configDoc.data().isSeasonOver || false) : false;
                
                if (!isSeasonOver) {
                    // Campionato ATTIVO: blocca eliminazione
                    elements.deleteMessage.textContent = '⚠️ Impossibile eliminare: la squadra partecipa a un campionato ATTIVO!';
                    elements.deleteMessage.classList.remove('text-yellow-400');
                    elements.deleteMessage.classList.add('text-red-400');
                    elements.btnConfirmDeleteFinal.textContent = 'Conferma Eliminazione';
                    elements.btnConfirmDeleteFinal.disabled = false;
                    
                    setTimeout(() => {
                        this.closeDeleteTeamModal(elements);
                    }, 3000);
                    return;
                }
                
                // Campionato terminato: può procedere
                console.log('Campionato terminato: eliminazione permessa');
            }

            elements.btnConfirmDeleteFinal.textContent = 'Eliminazione in corso...';
            elements.deleteMessage.textContent = 'Contatto Firestore per eliminare il documento...';
            
            await deleteDoc(teamDocRef);

            elements.deleteMessage.textContent = 'Squadra eliminata con successo! Reindirizzamento...';
            elements.deleteMessage.classList.remove('text-yellow-400');
            elements.deleteMessage.classList.add('text-green-500');
            
            setTimeout(() => {
                this.closeDeleteTeamModal(elements);
                window.handleLogout();
            }, 1500);

        } catch (error) {
            console.error("Errore durante l'eliminazione della squadra:", error);
            elements.deleteMessage.textContent = `Errore critico: ${error.message}. Riprova o contatta l'Admin.`;
            elements.deleteMessage.classList.remove('text-yellow-400');
            elements.deleteMessage.classList.add('text-red-400');
            elements.btnConfirmDeleteFinal.textContent = 'Conferma Eliminazione';
            elements.btnConfirmDeleteFinal.disabled = false;
        }
    },

    /**
     * Inizializza i listener per logo e eliminazione squadra.
     */
    initializeTeamListeners(elements) {
        const self = this;
        
        // Click sul logo per cambiarlo
        document.addEventListener('click', (e) => {
            if (e.target.id === 'team-logo') {
                self.handleLogoClick(elements);
            }
        });
        
        // Modale eliminazione
        if (elements.btnDeleteTeam) {
            elements.btnDeleteTeam.addEventListener('click', () => self.openDeleteTeamModal(elements));
        }
        if (elements.btnCancelDelete) {
            elements.btnCancelDelete.addEventListener('click', () => self.closeDeleteTeamModal(elements));
        }
        if (elements.deleteConfirmationInput) {
            elements.deleteConfirmationInput.addEventListener('input', () => self.checkConfirmationInput(elements));
            elements.deleteConfirmationInput.style.textTransform = 'uppercase';
        }
        if (elements.btnConfirmDeleteFinal) {
            elements.btnConfirmDeleteFinal.addEventListener('click', () => self.handleFinalTeamDeletion(elements));
        }
    }
};

console.log("✅ Modulo interfaccia-team.js caricato.");
