//
// ====================================================================
// MODULO INTERFACCIA-ONBOARDING.JS (Selezione Coach e Icona)
// ====================================================================
//

window.InterfacciaOnboarding = {

    /**
     * Inizializza la schermata di selezione Allenatore.
     */
    initializeCoachSelection(elements) {
        const self = this;
        
        elements.coachNameInput.value = localStorage.getItem('fanta_coach_name') || '';
        elements.coachSelectionMessage.textContent = 'Inserisci il nome del tuo Allenatore.';
        elements.coachSelectionMessage.classList.remove('text-green-500');
        elements.coachSelectionMessage.classList.add('text-red-400');
        elements.btnConfirmCoach.disabled = false;
        
        // Rimuovi listener precedenti per evitare duplicati
        const newBtnConfirmCoach = elements.btnConfirmCoach.cloneNode(true);
        elements.btnConfirmCoach.parentNode.replaceChild(newBtnConfirmCoach, elements.btnConfirmCoach);
        elements.btnConfirmCoach = newBtnConfirmCoach;
        
        elements.btnConfirmCoach.addEventListener('click', () => self.handleCoachConfirmation(elements));
        elements.coachNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') self.handleCoachConfirmation(elements);
        });
    },
    
    /**
     * Gestisce la conferma dell'Allenatore e passa alla selezione Icona.
     */
    handleCoachConfirmation(elements) {
        const self = this;
        const coachName = elements.coachNameInput.value.trim();
        
        if (!coachName) {
            elements.coachSelectionMessage.textContent = "Il nome dell'allenatore e obbligatorio!";
            return;
        }

        elements.btnConfirmCoach.textContent = 'Confermato. Vai all\'Icona...';
        elements.btnConfirmCoach.disabled = true;
        
        // Salva temporaneamente il nome dell'allenatore in localStorage
        localStorage.setItem('fanta_coach_name', coachName);
        localStorage.removeItem('fanta_needs_coach');
        localStorage.setItem('fanta_needs_icona', 'true');

        // Carica la schermata di selezione Icona
        setTimeout(() => {
            window.showScreen(elements.captainSelectionBox);
            self.initializeCaptainSelection(elements);
        }, 500);
    },

    /**
     * Inizializza la schermata di selezione Icona.
     */
    initializeCaptainSelection(elements) {
        const self = this;
        
        // Aggiorna il titolo del box
        const captainSelectionBoxTitle = elements.captainSelectionBox.querySelector('h2');
        if (captainSelectionBoxTitle) {
            captainSelectionBoxTitle.textContent = "Seleziona la tua Icona!";
        }

        // Genera i candidati solo se non sono gia stati generati
        let captainCandidates = window.InterfacciaCore.captainCandidates;
        if (!captainCandidates || captainCandidates.length === 0) {
            captainCandidates = window.generateCaptainCandidates();
            window.InterfacciaCore.captainCandidates = captainCandidates;
        }
        
        // Ordina i candidati per Ruolo (P, D, C, A)
        const orderedCandidates = [...captainCandidates].sort((a, b) => {
            return (a.role === 'P' ? 0 : a.role === 'D' ? 1 : a.role === 'C' ? 2 : 3) - 
                   (b.role === 'P' ? 0 : b.role === 'D' ? 1 : b.role === 'C' ? 2 : 3);
        });

        elements.captainCandidatesContainer.innerHTML = orderedCandidates.map(player => {
            const photoUrl = window.sanitizeGitHubUrl?.(player.photoUrl) || player.photoUrl;
            return `
             <div data-player-id="${player.id}"
                  data-role="${player.role}"
                  class="captain-card p-4 bg-gray-700 rounded-lg border-2 border-orange-700 shadow-xl text-center cursor-pointer hover:bg-gray-600 transition duration-150">

                 <img src="${photoUrl}"
                      alt="Icona ${player.name}"
                      class="w-24 h-24 rounded-full mx-auto mb-3 object-cover border-4 border-gray-500"
                      onerror="this.src='https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Icone/bemolle.jpg?raw=true'">

                 <p class="text-lg font-extrabold text-white">${player.name}</p>
                 <p class="text-sm font-semibold text-yellow-400">${player.role} (${player.type})</p>
                 <p class="text-xs text-green-400 font-bold mt-1">Abilita: ICONA</p>
                 <p class="text-xs text-gray-400">Livello Iniziale: ${player.level} (Fisso)</p>
             </div>
        `;}).join('');
        
        elements.captainSelectionError.textContent = 'Per favore, scegli il giocatore ICONA del tuo club.';
        
        // Rimuovi listener precedenti
        const newContainer = elements.captainCandidatesContainer.cloneNode(true);
        elements.captainCandidatesContainer.parentNode.replaceChild(newContainer, elements.captainCandidatesContainer);
        elements.captainCandidatesContainer = newContainer;
        
        const newBtnConfirmCaptain = elements.btnConfirmCaptain.cloneNode(true);
        elements.btnConfirmCaptain.parentNode.replaceChild(newBtnConfirmCaptain, elements.btnConfirmCaptain);
        elements.btnConfirmCaptain = newBtnConfirmCaptain;
        
        elements.captainCandidatesContainer.addEventListener('click', (e) => self.handleCaptainCardClick(e, elements));
        elements.btnConfirmCaptain.addEventListener('click', () => self.handleCaptainConfirmation(elements));
        
        // Abilita il bottone se un capitano era gia selezionato
        const previouslySelected = elements.btnConfirmCaptain.dataset.selectedCaptainId;
        elements.btnConfirmCaptain.disabled = !previouslySelected;
        elements.btnConfirmCaptain.textContent = 'Conferma Icona e Vai alla Dashboard';
    },

    /**
     * Gestisce la selezione di una carta Icona.
     */
    handleCaptainCardClick(event, elements) {
        const card = event.target.closest('.captain-card');
        if (!card) return;
        
        const selectedId = card.dataset.playerId;
        
        // Rimuovi selezione precedente
        elements.captainCandidatesContainer.querySelectorAll('.captain-card').forEach(c => {
            c.classList.remove('border-green-500', 'bg-gray-600', 'transform', 'scale-[1.05]');
            c.classList.add('border-orange-700');
        });
        
        // Aggiungi nuova selezione
        card.classList.remove('border-orange-700');
        card.classList.add('border-green-500', 'bg-gray-600', 'transform', 'scale-[1.05]');
        
        // Abilita il bottone di conferma
        elements.btnConfirmCaptain.dataset.selectedCaptainId = selectedId;
        elements.btnConfirmCaptain.disabled = false;
        const iconaName = card.querySelector('.text-lg')?.textContent || 'Icona';
        elements.captainSelectionError.textContent = `Icona ${iconaName} selezionata! Premi conferma.`;
        elements.captainSelectionError.classList.remove('text-red-400');
        elements.captainSelectionError.classList.add('text-green-500');
    },

    /**
     * Gestisce la conferma dell'Icona e salva in Firestore.
     */
    async handleCaptainConfirmation(elements) {
        const { doc, updateDoc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

        const selectedCaptainId = elements.btnConfirmCaptain.dataset.selectedCaptainId;
        const savedCoachName = localStorage.getItem('fanta_coach_name');
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        const captainCandidates = window.InterfacciaCore.captainCandidates;

        if (!selectedCaptainId || !currentTeamId) {
            elements.captainSelectionError.textContent = "Errore critico: Icona o ID Squadra mancante. Riprova il login.";
            elements.captainSelectionError.classList.add('text-red-400');
            elements.btnConfirmCaptain.disabled = true;
            return;
        }

        if (!savedCoachName) {
            elements.captainSelectionError.textContent = "Errore critico: Nome Allenatore mancante. Torna al login.";
            elements.captainSelectionError.classList.add('text-red-400');
            elements.btnConfirmCaptain.disabled = true;
            return;
        }

        const selectedCaptain = captainCandidates.find(p => p.id === selectedCaptainId);

        if (!selectedCaptain) {
            elements.captainSelectionError.textContent = "Errore critico: Icona non trovata. Riprova il login.";
            elements.captainSelectionError.classList.add('text-red-400');
            elements.btnConfirmCaptain.disabled = true;
            return;
        }

        elements.btnConfirmCaptain.textContent = 'Salvataggio Rosa...';
        elements.btnConfirmCaptain.disabled = true;

        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, currentTeamId);

            // 1. ROSA INIZIALE: leggi i giocatori salvati dalla squadra (generati con nomi random)
            // Usa i dati dalla cache globale o carica da Firestore se necessario
            let initialSquad = [];
            if (window.InterfacciaCore.currentTeamData?.players?.length > 0) {
                initialSquad = [...window.InterfacciaCore.currentTeamData.players];
            } else {
                // Fallback: leggi da Firestore
                const teamDoc = await getDoc(teamDocRef);
                if (teamDoc.exists() && teamDoc.data().players) {
                    initialSquad = [...teamDoc.data().players];
                } else {
                    // Ultimo fallback: genera nuovi giocatori
                    initialSquad = window.generateInitialSquad ? window.generateInitialSquad() : [...window.INITIAL_SQUAD];
                }
            }
            
            // 2. Ruolo dell'Icona scelto
            const iconaRole = selectedCaptain.role;

            // 3. Trova e sostituisci il giocatore base con lo stesso ruolo
            let playerReplaced = false;
            let finalIconaId = selectedCaptain.id;
            
            const finalSquad = initialSquad.map(player => {
                if (player.role === iconaRole && !playerReplaced) {
                    playerReplaced = true;
                    finalIconaId = player.id;
                    // Mantieni le abilities originali dell'icona (es. Tiro Dritto, Continua a provare)
                    return { ...selectedCaptain, id: finalIconaId, isCaptain: true, abilities: selectedCaptain.abilities || ['Icona'] };
                }
                return player;
            });

            if (!playerReplaced) {
                finalSquad.push({ ...selectedCaptain, id: crypto.randomUUID(), isCaptain: true, abilities: selectedCaptain.abilities || ['Icona'] });
                console.warn("ATTENZIONE: Nessun giocatore base con ruolo corrispondente trovato. Rosa allungata.");
            }

            // 4. Oggetto Allenatore
            const coachData = {
                name: savedCoachName,
                level: 1,
                xp: 0
            };

            // 5. Aggiorna i dati della squadra
            await updateDoc(teamDocRef, {
                players: finalSquad,
                iconaId: finalIconaId,
                coach: coachData,
                formation: {
                    modulo: '1-1-2-1',
                    titolari: finalSquad,
                    panchina: []
                },
                lastAcquisitionTimestamp: 0,
            });
            
            // 6. Aggiorna i dati globali e la sessione
            window.InterfacciaCore.currentTeamData.players = finalSquad;
            window.InterfacciaCore.currentTeamData.iconaId = finalIconaId;
            window.InterfacciaCore.currentTeamData.coach = coachData;
            window.InterfacciaCore.currentTeamData.formation = {
                modulo: '1-1-2-1',
                titolari: finalSquad,
                panchina: []
            };
            window.InterfacciaCore.currentTeamData.lastAcquisitionTimestamp = 0;
            
            localStorage.removeItem('fanta_needs_icona');
            localStorage.removeItem('fanta_coach_name');
            
            elements.captainSelectionError.textContent = `Icona ${selectedCaptain.name} confermata!`;
            elements.captainSelectionError.classList.remove('text-red-400');
            elements.captainSelectionError.classList.add('text-green-500');
            
            // Reindirizza alla Dashboard
            setTimeout(() => {
                window.InterfacciaDashboard.updateTeamUI(
                    window.InterfacciaCore.currentTeamData.teamName, 
                    teamDocRef.id, 
                    window.InterfacciaCore.currentTeamData.logoUrl, 
                    true, 
                    elements
                );
                window.showScreen(elements.appContent);
            }, 1000);

        } catch (error) {
            console.error("Errore nel salvataggio dell'Icona:", error);
            elements.captainSelectionError.textContent = `Errore di salvataggio: ${error.message}`;
            elements.captainSelectionError.classList.add('text-red-400');
            elements.btnConfirmCaptain.textContent = 'Riprova la Conferma';
            elements.btnConfirmCaptain.disabled = false;
        }
    }
};

console.log("[OK] Modulo interfaccia-onboarding.js caricato.");