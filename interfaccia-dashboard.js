//
// ====================================================================
// MODULO INTERFACCIA-DASHBOARD.JS (Dashboard Utente, Statistiche, Prossima Partita)
// ====================================================================
//

window.InterfacciaDashboard = {

    /**
     * Aggiorna l'interfaccia utente con i dati della squadra.
     */
    updateTeamUI(teamName, teamDocId, logoUrl, isNew, elements) {
        const { DEFAULT_LOGO_URL } = window.InterfacciaConstants;
        const currentTeamData = window.InterfacciaCore.currentTeamData;

        // Nome squadra in maiuscolo
        elements.teamDashboardTitle.textContent = teamName.toUpperCase();
        elements.teamFirestoreId.textContent = teamDocId;

        // Aggiorna il box budget (desktop e mobile)
        const budgetElement = document.getElementById('team-budget-value');
        const budgetElementMobile = document.getElementById('team-budget-value-mobile');
        if (budgetElement || budgetElementMobile) {
            const budget = currentTeamData.budget || 0;
            if (budgetElement) budgetElement.textContent = `${budget} CS`;
            if (budgetElementMobile) budgetElementMobile.textContent = `${budget} CS`;
        }

        window.InterfacciaCore.currentTeamId = teamDocId;
        // Sanitizza URL per convertire vecchi formati GitHub
        const sanitizedLogoUrl = window.sanitizeGitHubUrl(logoUrl) || DEFAULT_LOGO_URL;
        elements.teamLogoElement.src = sanitizedLogoUrl;

        // Aggiorna l'avatar dell'Icona
        const iconaAvatarElement = document.getElementById('team-icona-avatar');
        if (iconaAvatarElement) {
            const players = currentTeamData.players || [];
            // Cerca l'Icona: prima per abilities, poi per isCaptain, poi per iconaId
            let iconaPlayer = players.find(p => p.abilities && p.abilities.includes('Icona'));
            if (!iconaPlayer) {
                iconaPlayer = players.find(p => p.isCaptain === true);
            }
            if (!iconaPlayer && currentTeamData.iconaId) {
                iconaPlayer = players.find(p => p.id === currentTeamData.iconaId);
            }

            // Se troviamo l'Icona ma non ha photoUrl, cerca nel template CAPTAIN_CANDIDATES_TEMPLATES
            if (iconaPlayer) {
                let photoUrl = iconaPlayer.photoUrl;
                let playerType = iconaPlayer.type;
                if (!photoUrl && window.CAPTAIN_CANDIDATES_TEMPLATES) {
                    const template = window.CAPTAIN_CANDIDATES_TEMPLATES.find(t => t.name === iconaPlayer.name || t.id === iconaPlayer.id);
                    if (template) {
                        photoUrl = template.photoUrl;
                        if (!playerType) playerType = template.type;
                    }
                }
                // Popola il tooltip personalizzato
                const iconaName = iconaPlayer.name || 'Icona';
                const iconaLevel = iconaPlayer.level || 1;
                const iconaRole = iconaPlayer.role || '?';
                const iconaType = playerType || 'N/A';

                if (photoUrl) {
                    // Sanitizza URL per convertire vecchi formati GitHub
                    iconaAvatarElement.src = window.sanitizeGitHubUrl(photoUrl);
                } else {
                    iconaAvatarElement.src = 'https://placehold.co/96x96/facc15/000?text=?';
                }

                // Aggiorna elementi tooltip
                const tooltipName = document.getElementById('icona-tooltip-name');
                const tooltipLevel = document.getElementById('icona-tooltip-level');
                const tooltipRole = document.getElementById('icona-tooltip-role');
                const tooltipType = document.getElementById('icona-tooltip-type');
                if (tooltipName) tooltipName.textContent = iconaName + ' 👑';
                if (tooltipLevel) tooltipLevel.textContent = `Livello: ${iconaLevel}`;
                if (tooltipRole) tooltipRole.textContent = `Ruolo: ${iconaRole}`;
                if (tooltipType) tooltipType.textContent = `Tipo: ${iconaType}`;
            } else {
                iconaAvatarElement.src = 'https://placehold.co/96x96/facc15/000?text=?';
                const tooltipName = document.getElementById('icona-tooltip-name');
                if (tooltipName) tooltipName.textContent = 'Nessuna Icona';
            }
        }

        // Applica il colore primario salvato
        const primaryColor = currentTeamData.primaryColor || '#22c55e';
        this.applyPrimaryColor(primaryColor);

        // Inizializza il color picker
        this.initColorPicker();

        // Carica e visualizza la divisa della squadra
        if (window.UniformEditor) {
            window.UniformEditor.loadTeamUniform();
        }

        // Calcolo e aggiornamento statistiche
        const allPlayers = currentTeamData.players || [];
        const formationPlayers = window.getFormationPlayers(currentTeamData);

        const rosaLevel = window.calculateAverageLevel(allPlayers);
        const formationLevel = window.calculateAverageLevel(formationPlayers.map(p => ({ level: p.level })));

        elements.statRosaLevel.textContent = rosaLevel.toFixed(1);
        elements.statRosaCount.textContent = `(${allPlayers.length} giocatori)`;
        elements.statFormazioneLevel.textContent = formationLevel.toFixed(1);

        // NUOVO: Aggiorna il toggle partecipazione campionato
        this.updateChampionshipParticipationUI();

        // NUOVO: Aggiorna il toggle partecipazione coppa
        this.updateCupParticipationUI();

        // Inizializza il widget Crediti Super Seri
        this.initCreditiSuperSeriWidget();

        // Inizializza il countdown per la prossima partita
        this.initNextMatchCountdown();

        // Gestisce il bottone "Torna al Pannello Admin"
        this.initAdminReturnButton();

        // Mostra la dashboard
        window.showScreen(elements.appContent);
    },

    /**
     * Inizializza il bottone "Torna al Pannello Admin".
     * Visibile SOLO se si e' acceduti alla dashboard tramite pannello admin.
     */
    initAdminReturnButton() {
        const container = document.getElementById('admin-return-button-container');
        const button = document.getElementById('btn-return-to-admin');

        if (!container || !button) return;

        // Mostra il bottone SOLO se si e' arrivati dal pannello admin
        if (window.accessedFromAdminPanel === true) {
            container.classList.remove('hidden');

            // Rimuovi listener precedenti clonando il bottone
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            // Aggiungi listener per tornare al pannello admin
            newButton.addEventListener('click', () => {
                // Resetta il flag
                window.accessedFromAdminPanel = false;

                // Torna al pannello admin
                const adminContent = document.getElementById('admin-content');
                if (adminContent && window.showScreen) {
                    window.showScreen(adminContent);
                }
            });
        } else {
            container.classList.add('hidden');
        }
    },

    /**
     * Variabile per l'intervallo del countdown
     */
    _countdownInterval: null,
    _draftAlertUnsubscribe: null,

    /**
     * Pulisce tutti gli intervalli e listener per prevenire memory leak
     * Chiamare quando si cambia pagina o si fa logout
     */
    cleanup() {
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
        if (this._draftAlertUnsubscribe) {
            this._draftAlertUnsubscribe();
            this._draftAlertUnsubscribe = null;
        }
        this._lastStateCheck = null;
        this._automationEnabled = null;
        console.log('[Dashboard] Cleanup completato - intervalli e listener rimossi');
    },

    /**
     * Inizializza il countdown per la prossima simulazione
     */
    async initNextMatchCountdown() {
        const countdownEl = document.getElementById('countdown-timer');
        const countdownBox = document.getElementById('next-match-countdown');
        const labelTop = document.getElementById('countdown-label-top');
        const labelBottom = document.getElementById('countdown-label-bottom');
        if (!countdownEl) return;

        // Pulisce eventuali intervalli precedenti
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
        }

        const self = this;

        const setActiveState = () => {
            countdownEl.classList.remove('text-gray-500');
            countdownEl.classList.add('text-teal-400');
            if (labelTop) {
                labelTop.textContent = 'Prossima';
                labelTop.classList.remove('text-gray-500');
                labelTop.classList.add('text-teal-300');
            }
            if (labelBottom) {
                labelBottom.textContent = 'Partita';
            }
            if (countdownBox) {
                countdownBox.classList.remove('border-gray-600');
                countdownBox.classList.add('border-teal-500');
            }
        };

        const setInactiveState = () => {
            countdownEl.textContent = 'In attesa';
            countdownEl.classList.remove('text-teal-400');
            countdownEl.classList.add('text-gray-500');
            if (labelTop) {
                labelTop.textContent = '';
                labelTop.classList.remove('text-teal-300');
                labelTop.classList.add('text-gray-500');
            }
            if (labelBottom) {
                labelBottom.textContent = 'di partite';
            }
            if (countdownBox) {
                countdownBox.classList.remove('border-teal-500');
                countdownBox.classList.add('border-gray-600');
            }
        };

        const updateCountdown = async () => {
            if (window.AutomazioneSimulazioni) {
                try {
                    const state = await window.AutomazioneSimulazioni.loadAutomationState();
                    if (state && state.isEnabled) {
                        // Automazione attiva - mostra countdown
                        const time = window.AutomazioneSimulazioni.getTimeUntilNextSimulation();
                        countdownEl.textContent = time.formatted;
                        setActiveState();
                    } else {
                        // Automazione disattivata - mostra messaggio
                        setInactiveState();
                    }
                } catch (error) {
                    countdownEl.textContent = '--:--:--';
                }
            } else {
                countdownEl.textContent = '--:--:--';
            }
        };

        // Aggiorna subito
        await updateCountdown();

        // Aggiorna ogni secondo (solo il tempo, non lo stato)
        this._countdownInterval = setInterval(async () => {
            if (window.AutomazioneSimulazioni) {
                try {
                    // Controlla lo stato solo ogni 30 secondi per non sovraccaricare
                    const now = Date.now();
                    if (!self._lastStateCheck || now - self._lastStateCheck > 30000) {
                        self._lastStateCheck = now;
                        const state = await window.AutomazioneSimulazioni.loadAutomationState();
                        self._automationEnabled = state && state.isEnabled;
                    }

                    if (self._automationEnabled) {
                        const time = window.AutomazioneSimulazioni.getTimeUntilNextSimulation();
                        countdownEl.textContent = time.formatted;
                        setActiveState();
                    } else {
                        setInactiveState();
                    }
                } catch (error) {
                    countdownEl.textContent = '--:--:--';
                }
            }
        }, 1000);
    },

    /**
     * Applica il colore primario alla dashboard
     */
    applyPrimaryColor(color) {
        // Titolo squadra
        const title = document.getElementById('team-dashboard-title');
        if (title) {
            title.style.color = color;
        }

        // Bordo logo
        const logo = document.getElementById('team-logo');
        if (logo) {
            logo.style.borderColor = color;
        }

        // Bordo icona
        const icona = document.getElementById('team-icona-avatar');
        if (icona) {
            icona.style.borderColor = color;
        }

        // Bordo dashboard (football-box)
        const dashboard = document.getElementById('app-content');
        if (dashboard) {
            dashboard.style.borderColor = color;
        }

        // Bordo box countdown
        const countdown = document.getElementById('next-match-countdown');
        if (countdown) {
            countdown.style.borderColor = color;
        }

        // Bordo box divisa
        const uniformBox = document.getElementById('team-uniform-box');
        if (uniformBox) {
            uniformBox.style.borderColor = color;
        }

        // Bordo box sponsor
        const sponsorImage = document.getElementById('sponsor-image');
        if (sponsorImage) {
            sponsorImage.style.borderColor = color;
        }

        // Bordo box media
        const mediaImage = document.getElementById('media-image');
        if (mediaImage) {
            mediaImage.style.borderColor = color;
        }

        // Bordo box statistiche - Livello Medio Rosa
        const statRosaBox = document.getElementById('stat-rosa-level')?.closest('.border-2');
        if (statRosaBox) {
            statRosaBox.style.borderColor = color;
        }

        // Bordo box statistiche - Livello Tattico Titolari
        const statFormazioneBox = document.getElementById('stat-formazione-level')?.closest('.border-2');
        if (statFormazioneBox) {
            statFormazioneBox.style.borderColor = color;
        }

        // Bordo box toggle Campionato
        const championshipBox = document.getElementById('championship-participation-toggle')?.closest('.border-2');
        if (championshipBox) {
            championshipBox.style.borderColor = color;
        }

        // Bordo box toggle CoppaSeriA
        const cupBox = document.getElementById('cup-participation-toggle')?.closest('.border-2');
        if (cupBox) {
            cupBox.style.borderColor = color;
        }

        // Aggiorna il color picker
        const colorPicker = document.getElementById('team-color-picker');
        if (colorPicker) {
            colorPicker.value = color;
        }
    },

    /**
     * Inizializza il color picker
     */
    initColorPicker() {
        const colorPicker = document.getElementById('team-color-picker');
        if (!colorPicker) return;

        // Rimuovi listener precedenti
        const newColorPicker = colorPicker.cloneNode(true);
        colorPicker.parentNode.replaceChild(newColorPicker, colorPicker);

        // Aggiungi nuovo listener
        newColorPicker.addEventListener('input', (e) => {
            this.applyPrimaryColor(e.target.value);
        });

        newColorPicker.addEventListener('change', async (e) => {
            const newColor = e.target.value;
            await this.savePrimaryColor(newColor);
        });
    },

    /**
     * Salva il colore primario nel database
     */
    async savePrimaryColor(color) {
        const teamDocId = window.InterfacciaCore.currentTeamId;
        if (!teamDocId) return;

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const { appId } = window.firestoreTools;
            const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamDocId);

            await updateDoc(teamDocRef, {
                primaryColor: color
            });

            // Aggiorna anche i dati locali
            if (window.InterfacciaCore.currentTeamData) {
                window.InterfacciaCore.currentTeamData.primaryColor = color;
            }

            console.log('Colore primario salvato:', color);
        } catch (error) {
            console.error('Errore nel salvataggio del colore primario:', error);
        }
    },
    
    /**
     * NUOVO: Aggiorna l'UI del toggle partecipazione campionato
     */
    updateChampionshipParticipationUI() {
        const toggle = document.getElementById('championship-participation-toggle');
        const statusText = document.getElementById('championship-participation-status');

        if (!toggle || !statusText) return;

        const currentTeamData = window.InterfacciaCore.currentTeamData;
        const isParticipating = currentTeamData?.isParticipating || false;

        toggle.checked = isParticipating;

        if (isParticipating) {
            statusText.textContent = '✅ Stai partecipando al campionato';
            statusText.classList.remove('text-gray-400', 'text-red-400');
            statusText.classList.add('text-green-400');
        } else {
            statusText.textContent = '❌ Non stai partecipando al campionato';
            statusText.classList.remove('text-green-400', 'text-red-400');
            statusText.classList.add('text-gray-400');
        }
    },

    /**
     * NUOVO: Gestisce il cambio del toggle partecipazione campionato
     */
    async handleChampionshipParticipationToggle(isChecked) {
        const toggle = document.getElementById('championship-participation-toggle');
        const statusText = document.getElementById('championship-participation-status');
        
        if (!toggle || !statusText) return;
        
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) return;
        
        const { doc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
        
        // Disabilita il toggle durante il salvataggio
        toggle.disabled = true;
        statusText.textContent = '⏳ Salvataggio in corso...';
        statusText.classList.remove('text-green-400', 'text-gray-400', 'text-red-400');
        statusText.classList.add('text-yellow-400');
        
        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, currentTeamId);
            
            await updateDoc(teamDocRef, {
                isParticipating: isChecked
            });
            
            // Aggiorna i dati locali
            window.InterfacciaCore.currentTeamData.isParticipating = isChecked;
            
            // Aggiorna l'UI
            if (isChecked) {
                statusText.textContent = '✅ Stai partecipando al campionato';
                statusText.classList.remove('text-yellow-400');
                statusText.classList.add('text-green-400');
            } else {
                statusText.textContent = '❌ Non stai partecipando al campionato';
                statusText.classList.remove('text-yellow-400');
                statusText.classList.add('text-gray-400');
            }
            
        } catch (error) {
            console.error('Errore nel salvataggio stato partecipazione:', error);
            
            // Ripristina lo stato precedente in caso di errore
            toggle.checked = !isChecked;
            statusText.textContent = '❌ Errore nel salvataggio. Riprova.';
            statusText.classList.remove('text-yellow-400');
            statusText.classList.add('text-red-400');
        } finally {
            toggle.disabled = false;
        }
    },

    /**
     * NUOVO: Inizializza il listener per il toggle partecipazione campionato
     */
    initializeChampionshipParticipationToggle() {
        const toggle = document.getElementById('championship-participation-toggle');

        if (!toggle) return;

        toggle.addEventListener('change', (e) => {
            this.handleChampionshipParticipationToggle(e.target.checked);
        });
    },

    /**
     * NUOVO: Aggiorna l'UI del toggle partecipazione CoppaSeriA
     */
    updateCupParticipationUI() {
        const toggle = document.getElementById('cup-participation-toggle');
        const statusText = document.getElementById('cup-participation-status');

        if (!toggle || !statusText) return;

        const currentTeamData = window.InterfacciaCore.currentTeamData;
        const isCupParticipating = currentTeamData?.isCupParticipating || false;

        toggle.checked = isCupParticipating;

        if (isCupParticipating) {
            statusText.textContent = '✅ Iscritto alla CoppaSeriA';
            statusText.classList.remove('text-gray-400', 'text-red-400');
            statusText.classList.add('text-purple-400');
        } else {
            statusText.textContent = '❌ Non iscritto alla CoppaSeriA';
            statusText.classList.remove('text-purple-400', 'text-red-400');
            statusText.classList.add('text-gray-400');
        }
    },

    /**
     * NUOVO: Gestisce il cambio del toggle partecipazione CoppaSeriA
     */
    async handleCupParticipationToggle(isChecked) {
        const toggle = document.getElementById('cup-participation-toggle');
        const statusText = document.getElementById('cup-participation-status');

        if (!toggle || !statusText) return;

        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) return;

        // Disabilita il toggle durante il salvataggio
        toggle.disabled = true;
        statusText.textContent = '⏳ Salvataggio in corso...';
        statusText.classList.remove('text-purple-400', 'text-gray-400', 'text-red-400');
        statusText.classList.add('text-yellow-400');

        try {
            await window.CoppaMain.toggleCupParticipation(currentTeamId, isChecked);

            // Aggiorna i dati locali
            window.InterfacciaCore.currentTeamData.isCupParticipating = isChecked;

            // Aggiorna l'UI
            if (isChecked) {
                statusText.textContent = '✅ Iscritto alla CoppaSeriA';
                statusText.classList.remove('text-yellow-400');
                statusText.classList.add('text-purple-400');
            } else {
                statusText.textContent = '❌ Non iscritto alla CoppaSeriA';
                statusText.classList.remove('text-yellow-400');
                statusText.classList.add('text-gray-400');
            }

        } catch (error) {
            console.error('Errore nel salvataggio stato partecipazione coppa:', error);

            // Ripristina lo stato precedente in caso di errore
            toggle.checked = !isChecked;
            statusText.textContent = '❌ Errore nel salvataggio. Riprova.';
            statusText.classList.remove('text-yellow-400');
            statusText.classList.add('text-red-400');
        } finally {
            toggle.disabled = false;
        }
    },

    /**
     * NUOVO: Inizializza il listener per il toggle partecipazione CoppaSeriA
     */
    initializeCupParticipationToggle() {
        const toggle = document.getElementById('cup-participation-toggle');

        if (!toggle) return;

        toggle.addEventListener('change', (e) => {
            this.handleCupParticipationToggle(e.target.checked);
        });
    },
    
    /**
     * Ricarica solo i dati della squadra e aggiorna la UI.
     */
    async reloadTeamDataAndUpdateUI(elements) {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) return;

        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, currentTeamId);

            // Usa cache con TTL breve (dati squadra cambiano spesso)
            let teamDoc;
            if (window.FirestoreCache) {
                teamDoc = await window.FirestoreCache.getDoc(
                    teamDocRef, 'team', currentTeamId,
                    window.FirestoreCache.TTL.SHORT
                );
            } else {
                teamDoc = await getDoc(teamDocRef);
            }

            if (teamDoc.exists()) {
                window.InterfacciaCore.currentTeamData = teamDoc.data();
                this.updateTeamUI(
                    window.InterfacciaCore.currentTeamData.teamName, 
                    teamDocRef.id, 
                    window.InterfacciaCore.currentTeamData.logoUrl, 
                    false, 
                    elements
                );
            } else {
                console.error("Errore: Impossibile trovare i dati della squadra corrente per l'aggiornamento.");
            }
        } catch (error) {
            console.error("Errore nel ricaricamento dati squadra:", error);
        }
    },

    /**
     * Carica e visualizza la prossima partita da giocare per la squadra corrente.
     */
    async loadNextMatch(elements) {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        const currentTeamData = window.InterfacciaCore.currentTeamData;
        
        if (!currentTeamId || !currentTeamData || !elements.nextMatchPreview) return;
        
        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const SCHEDULE_COLLECTION_PATH = window.InterfacciaConstants.getScheduleCollectionPath(appId);
        const SCHEDULE_DOC_ID = window.InterfacciaConstants.SCHEDULE_DOC_ID;
        
        elements.nextMatchPreview.innerHTML = `<p class="text-gray-400 font-semibold">Ricerca prossima sfida...</p>`;

        try {
            const scheduleDocRef = doc(window.db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);

            // Usa cache se disponibile
            let scheduleDoc;
            if (window.FirestoreCache) {
                scheduleDoc = await window.FirestoreCache.getDoc(
                    scheduleDocRef, 'schedule', SCHEDULE_DOC_ID,
                    window.FirestoreCache.TTL.SCHEDULE
                );
            } else {
                scheduleDoc = await getDoc(scheduleDocRef);
            }

            if (!scheduleDoc.exists() || !scheduleDoc.data().matches) {
                elements.nextMatchPreview.innerHTML = `<p class="text-red-400 font-semibold">Calendario non generato dall'Admin.</p>`;
                return;
            }
            
            const allRounds = scheduleDoc.data().matches;
            let nextMatch = null;

            for (const round of allRounds) {
                if (!round.matches) continue;

                const match = round.matches.find(m => 
                    m.result === null && (m.homeId === currentTeamId || m.awayId === currentTeamId)
                );
                if (match) {
                    nextMatch = match;
                    break;
                }
            }

            if (nextMatch) {
                const isHome = nextMatch.homeId === currentTeamId;
                const statusColor = isHome ? 'text-green-300' : 'text-red-300';
                const statusText = isHome ? 'IN CASA' : 'FUORI CASA';
                
                const homeLogo = window.getLogoHtml(nextMatch.homeId);
                const awayLogo = window.getLogoHtml(nextMatch.awayId);
                
                elements.nextMatchPreview.innerHTML = `
                    <p class="text-sm text-gray-300 font-semibold mb-1">PROSSIMA SFIDA (Giornata ${nextMatch.round} / ${nextMatch.type})</p>
                    <div class="flex justify-center items-center space-x-4">
                        <span class="text-xl font-extrabold text-white flex items-center">
                            ${homeLogo} <span class="ml-2">${nextMatch.homeName}</span>
                        </span>
                        <span class="text-2xl font-extrabold text-orange-400">VS</span>
                        <span class="text-xl font-extrabold text-white flex items-center">
                            <span class="mr-2">${nextMatch.awayName}</span> ${awayLogo}
                        </span>
                    </div>
                    <p class="text-sm font-semibold mt-1 ${statusColor}">Giochi ${statusText}</p>
                `;
            } else {
                elements.nextMatchPreview.innerHTML = `<p class="text-green-400 font-semibold">Hai giocato tutte le partite! Campionato concluso.</p>`;
            }

        } catch (error) {
            console.error("Errore nel caricamento prossima partita:", error);
            elements.nextMatchPreview.innerHTML = `<p class="text-red-400 font-semibold">Errore nel caricamento sfida. Controlla la console.</p>`;
        }
    },

    /**
     * Renderizza la sezione statistiche della dashboard.
     */
    renderStatisticsSection(statsData) {
        if (!statsData) return;
        
        const { gamesPlayed, wins, draws, losses, goalsFor, goalsAgainst, points } = statsData;
        const goalDifference = goalsFor - goalsAgainst;
        
        return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div class="p-4 bg-gray-700 rounded-lg border border-blue-500 text-center">
                    <p class="text-blue-400 font-bold text-sm">Partite</p>
                    <p class="text-white text-2xl font-extrabold">${gamesPlayed}</p>
                </div>
                <div class="p-4 bg-gray-700 rounded-lg border border-green-500 text-center">
                    <p class="text-green-400 font-bold text-sm">Vittorie</p>
                    <p class="text-white text-2xl font-extrabold">${wins}</p>
                </div>
                <div class="p-4 bg-gray-700 rounded-lg border border-yellow-500 text-center">
                    <p class="text-yellow-400 font-bold text-sm">Pareggi</p>
                    <p class="text-white text-2xl font-extrabold">${draws}</p>
                </div>
                <div class="p-4 bg-gray-700 rounded-lg border border-red-500 text-center">
                    <p class="text-red-400 font-bold text-sm">Sconfitte</p>
                    <p class="text-white text-2xl font-extrabold">${losses}</p>
                </div>
                <div class="p-4 bg-gray-700 rounded-lg border border-purple-500 text-center">
                    <p class="text-purple-400 font-bold text-sm">Gol Fatti</p>
                    <p class="text-white text-2xl font-extrabold">${goalsFor}</p>
                </div>
                <div class="p-4 bg-gray-700 rounded-lg border border-orange-500 text-center">
                    <p class="text-orange-400 font-bold text-sm">Gol Subiti</p>
                    <p class="text-white text-2xl font-extrabold">${goalsAgainst}</p>
                </div>
                <div class="p-4 bg-gray-700 rounded-lg border border-teal-500 text-center">
                    <p class="text-teal-400 font-bold text-sm">Diff. Reti</p>
                    <p class="text-white text-2xl font-extrabold ${goalDifference >= 0 ? 'text-green-400' : 'text-red-400'}">${goalDifference >= 0 ? '+' : ''}${goalDifference}</p>
                </div>
                <div class="p-4 bg-gray-700 rounded-lg border border-yellow-400 text-center">
                    <p class="text-yellow-400 font-bold text-sm">Punti</p>
                    <p class="text-white text-2xl font-extrabold">${points}</p>
                </div>
            </div>
        `;
    },

    /**
     * Inizializza il widget Crediti Super Seri nella dashboard
     */
    async initCreditiSuperSeriWidget() {
        if (window.CreditiSuperSeriUI) {
            await window.CreditiSuperSeriUI.initDashboardWidget();
        }
    },

    // ====================================================================
    // ALERT DRAFT ATTIVO
    // ====================================================================

    // Intervallo per aggiornare il countdown dell'alert draft
    _draftAlertInterval: null,

    // Listener real-time per lo stato del draft
    _draftAlertUnsubscribe: null,

    /**
     * Avvia il listener real-time per l'alert del draft
     */
    startDraftAlertListener() {
        // Ferma listener precedente
        this.stopDraftAlertListener();

        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        const adminUsername = window.InterfacciaConstants?.ADMIN_USERNAME_LOWER || 'serieseria';
        if (!currentTeamId || currentTeamId === 'admin' || currentTeamId === adminUsername) {
            return;
        }

        try {
            const { doc, onSnapshot } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const CONFIG_PATH = `artifacts/${appId}/public/data/config`;
            const CONFIG_DOC_ID = 'settings';

            const configDocRef = doc(window.db, CONFIG_PATH, CONFIG_DOC_ID);

            const unsubscribe = onSnapshot(configDocRef, (snapshot) => {
                if (!snapshot.exists()) return;

                // Aggiorna l'alert con i nuovi dati
                this.updateDraftAlertFromSnapshot(snapshot.data());
            }, (error) => {
                console.error('[DraftAlert] Errore listener:', error);
            });

            this._draftAlertUnsubscribe = unsubscribe;

            // Registra nel ListenerManager (priorita' bassa, pausabile)
            if (window.ListenerManager) {
                window.ListenerManager.register('draft-alert', unsubscribe, {
                    priority: 'low',
                    pausable: true,
                    screen: 'dashboard'
                });
            }

            console.log('[DraftAlert] Listener real-time avviato');

        } catch (error) {
            console.error('[DraftAlert] Errore avvio listener:', error);
        }
    },

    /**
     * Ferma il listener real-time per l'alert del draft
     */
    stopDraftAlertListener() {
        if (this._draftAlertUnsubscribe) {
            this._draftAlertUnsubscribe();
            this._draftAlertUnsubscribe = null;
            console.log('[DraftAlert] Listener real-time fermato');
        }
    },

    /**
     * Aggiorna l'alert del draft da uno snapshot Firestore
     */
    updateDraftAlertFromSnapshot(configData) {
        const banner = document.getElementById('draft-alert-banner');
        if (!banner) return;

        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        const adminUsername = window.InterfacciaConstants?.ADMIN_USERNAME_LOWER || 'serieseria';
        if (!currentTeamId || currentTeamId === 'admin' || currentTeamId === adminUsername) {
            banner.classList.add('hidden');
            return;
        }

        const draftTurns = configData.draftTurns;
        const isDraftOpen = configData.isDraftOpen;
        const isDraftTurnsActive = draftTurns && draftTurns.isActive;
        const timerEnabled = draftTurns ? draftTurns.timerEnabled !== false : true;
        const isPaused = draftTurns && draftTurns.isPaused;

        // Mostra alert solo se draft aperto, turni attivi e timer abilitato
        if (!isDraftOpen || !isDraftTurnsActive || !timerEnabled || isPaused) {
            banner.classList.add('hidden');
            this.stopDraftAlert();
            return;
        }

        // Ottieni info sul turno corrente
        const currentRound = draftTurns.currentRound;
        const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
        const currentOrder = draftTurns[orderKey] || [];
        const currentTeam = currentOrder.find(t => t.teamId === draftTurns.currentTeamId);
        // Converti turnStartTime se e' un Timestamp Firestore
        let turnStartTime = draftTurns.turnStartTime;
        if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
            turnStartTime = turnStartTime.toMillis();
        }
        const turnExpired = draftTurns.turnExpired || false;
        const isStolenTurn = draftTurns.isStolenTurn || false;

        if (!currentTeam) {
            banner.classList.add('hidden');
            return;
        }

        // Mostra il banner
        banner.classList.remove('hidden');

        // Aggiorna nome squadra
        const teamNameEl = document.getElementById('draft-alert-team');
        const countdownEl = document.getElementById('draft-alert-countdown');
        const stealInfoEl = document.getElementById('draft-alert-steal-info');

        // Controlla se l'utente corrente puo' rubare il turno
        // Puo' rubare SOLO se: turno scaduto, non e' il suo turno, e NON ha ancora draftato in questo round
        const userEntry = currentOrder.find(t => t.teamId === currentTeamId);
        const hasDraftedThisRound = userEntry ? userEntry.hasDrafted : false;
        const canSteal = turnExpired && currentTeamId !== draftTurns.currentTeamId && !hasDraftedThisRound;

        if (teamNameEl) {
            teamNameEl.textContent = currentTeam.teamName;
        }

        // Ferma countdown precedente prima di aggiornare
        this.stopDraftAlert();

        // Gestisci lo stato del banner in base alla situazione
        if (canSteal) {
            // Turno rubabile - colore rosso
            const bannerInner = banner.querySelector('div');
            if (bannerInner) {
                bannerInner.classList.remove('from-purple-900', 'to-indigo-900', 'border-purple-500');
                bannerInner.classList.remove('from-green-900', 'to-emerald-900', 'border-green-500');
                bannerInner.classList.add('from-red-900', 'to-rose-900', 'border-red-500');
            }
            if (teamNameEl) {
                teamNameEl.textContent = `⚡ RUBA TURNO a ${currentTeam.teamName}!`;
                teamNameEl.classList.remove('text-yellow-400', 'text-green-400');
                teamNameEl.classList.add('text-red-400');
            }
            if (countdownEl) {
                countdownEl.textContent = 'SCADUTO';
                countdownEl.classList.add('text-red-400', 'animate-pulse');
                countdownEl.classList.remove('text-white');
            }
            // Mostra info sul furto
            if (stealInfoEl) {
                stealInfoEl.classList.remove('hidden');
                stealInfoEl.textContent = `Strikes: ${currentTeam.stealStrikes || 0}/5`;
            }

        } else if (hasDraftedThisRound) {
            // L'utente ha gia' draftato in questo round - colore grigio/viola
            const bannerInner = banner.querySelector('div');
            if (bannerInner) {
                bannerInner.classList.remove('from-green-900', 'to-emerald-900', 'border-green-500');
                bannerInner.classList.remove('from-red-900', 'to-rose-900', 'border-red-500');
                bannerInner.classList.add('from-purple-900', 'to-indigo-900', 'border-purple-500');
            }
            if (teamNameEl) {
                teamNameEl.textContent = currentTeam.teamName;
                teamNameEl.classList.remove('text-green-400', 'text-red-400');
                teamNameEl.classList.add('text-yellow-400');
            }
            if (countdownEl) {
                countdownEl.classList.remove('text-red-400', 'animate-pulse');
                countdownEl.classList.add('text-white');
            }
            if (stealInfoEl) {
                stealInfoEl.classList.remove('hidden');
                stealInfoEl.textContent = '✓ Hai gia\' draftato';
                stealInfoEl.classList.remove('text-red-300');
                stealInfoEl.classList.add('text-green-300');
            }
            // Avvia countdown comunque per mostrare il tempo rimanente
            this.startDraftAlertCountdown(turnStartTime, isStolenTurn);

        } else if (currentTeamId === draftTurns.currentTeamId) {
            // E' il turno dell'utente - colore verde
            const bannerInner = banner.querySelector('div');
            if (bannerInner) {
                bannerInner.classList.remove('from-purple-900', 'to-indigo-900', 'border-purple-500');
                bannerInner.classList.remove('from-red-900', 'to-rose-900', 'border-red-500');
                bannerInner.classList.add('from-green-900', 'to-emerald-900', 'border-green-500');
            }
            if (teamNameEl) {
                teamNameEl.textContent = '🎉 TOCCA A TE!';
                teamNameEl.classList.remove('text-yellow-400', 'text-red-400');
                teamNameEl.classList.add('text-green-400');
            }
            if (countdownEl) {
                countdownEl.classList.remove('text-red-400', 'animate-pulse');
            }
            if (stealInfoEl) {
                stealInfoEl.classList.add('hidden');
            }
            // Mostra tempo appropriato (10 min se turno rubato)
            this.startDraftAlertCountdown(turnStartTime, isStolenTurn);

        } else {
            // In attesa del turno - colore viola
            const bannerInner = banner.querySelector('div');
            if (bannerInner) {
                bannerInner.classList.remove('from-green-900', 'to-emerald-900', 'border-green-500');
                bannerInner.classList.remove('from-red-900', 'to-rose-900', 'border-red-500');
                bannerInner.classList.add('from-purple-900', 'to-indigo-900', 'border-purple-500');
            }
            if (teamNameEl) {
                teamNameEl.classList.remove('text-green-400', 'text-red-400');
                teamNameEl.classList.add('text-yellow-400');
            }
            if (countdownEl) {
                countdownEl.classList.remove('text-red-400', 'animate-pulse');
                countdownEl.classList.add('text-white');
            }
            if (stealInfoEl) {
                stealInfoEl.classList.add('hidden');
            }
            // Avvia countdown con tempo appropriato
            this.startDraftAlertCountdown(turnStartTime, isStolenTurn);
        }
    },

    /**
     * Inizializza e aggiorna l'alert del draft nella homepage.
     * Avvia anche il listener real-time per aggiornamenti automatici.
     */
    async initDraftAlert() {
        const banner = document.getElementById('draft-alert-banner');
        if (!banner) return;

        // Ferma eventuali timer precedenti
        this.stopDraftAlert();

        // Nascondi l'alert per l'admin
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        const adminUsername = window.InterfacciaConstants?.ADMIN_USERNAME_LOWER || 'serieseria';
        if (!currentTeamId || currentTeamId === 'admin' || currentTeamId === adminUsername) {
            banner.classList.add('hidden');
            this.stopDraftAlertListener();
            return;
        }

        // Avvia il listener real-time se non gia' attivo
        if (!this._draftAlertUnsubscribe) {
            this.startDraftAlertListener();
        }

        // Fa anche un fetch iniziale per mostrare subito lo stato
        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const CONFIG_PATH = `artifacts/${appId}/public/data/config`;
            const CONFIG_DOC_ID = 'settings';

            const configDocRef = doc(window.db, CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) {
                banner.classList.add('hidden');
                return;
            }

            // Usa la funzione di update comune
            this.updateDraftAlertFromSnapshot(configDoc.data());

        } catch (error) {
            console.error('[DraftAlert] Errore:', error);
            banner.classList.add('hidden');
        }
    },

    /**
     * Avvia il countdown nell'alert draft
     * @param {number} turnStartTimeParam - Timestamp di inizio turno
     * @param {boolean} isStolenTurn - Se true, usa timeout di 10 minuti invece di 1 ora
     */
    startDraftAlertCountdown(turnStartTimeParam, isStolenTurn = false) {
        const countdownEl = document.getElementById('draft-alert-countdown');
        const countdownMiniEl = document.getElementById('draft-alert-countdown-mini');
        if (!countdownEl) return;

        // Converti turnStartTime se e' un Timestamp Firestore
        let turnStartTime = turnStartTimeParam;
        if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
            turnStartTime = turnStartTime.toMillis();
        }

        const { DRAFT_TURN_TIMEOUT_MS, DRAFT_STEAL_TIMEOUT_MS } = window.DraftConstants || {
            DRAFT_TURN_TIMEOUT_MS: 3600000,
            DRAFT_STEAL_TIMEOUT_MS: 600000
        };

        // Usa il timeout appropriato
        const timeout = isStolenTurn ? DRAFT_STEAL_TIMEOUT_MS : DRAFT_TURN_TIMEOUT_MS;

        const updateCountdown = () => {
            // Usa getEffectiveTimeRemaining per considerare la pausa notturna
            const timeRemaining = window.DraftConstants?.getEffectiveTimeRemaining
                ? window.DraftConstants.getEffectiveTimeRemaining(turnStartTime, timeout)
                : Math.max(0, timeout - (Date.now() - turnStartTime));

            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);

            // Controlla se siamo in pausa notturna
            const isNightPause = window.DraftConstants?.isNightPauseActive?.() || false;

            let timeText;
            if (isNightPause) {
                timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} 🌙`;
            } else {
                timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
            countdownEl.textContent = timeText;

            // Aggiorna anche la versione mini
            if (countdownMiniEl) {
                countdownMiniEl.textContent = isNightPause ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : timeText;
            }

            // Soglia di avviso: 5 minuti per turno normale, 2 minuti per turno rubato
            const warningThreshold = isStolenTurn ? 2 * 60 * 1000 : 5 * 60 * 1000;
            if (timeRemaining < warningThreshold && !isNightPause) {
                countdownEl.classList.add('text-red-400');
                countdownEl.classList.remove('text-white');
                countdownMiniEl?.classList.add('text-red-400');
                countdownMiniEl?.classList.remove('text-white');
            } else {
                countdownEl.classList.remove('text-red-400');
                countdownEl.classList.add('text-white');
                countdownMiniEl?.classList.remove('text-red-400');
                countdownMiniEl?.classList.add('text-white');
            }

            // Se scaduto (e non in pausa notturna), ricarica lo stato per mostrare "Ruba Turno"
            if (timeRemaining <= 0 && !isNightPause) {
                countdownEl.textContent = 'SCADUTO';
                countdownEl.classList.add('animate-pulse');
                if (countdownMiniEl) {
                    countdownMiniEl.textContent = '00:00';
                    countdownMiniEl.classList.add('animate-pulse');
                }
                // Ricarica per aggiornare lo stato (mostrare opzione Ruba Turno)
                setTimeout(() => this.initDraftAlert(), 2000);
            }
        };

        // Aggiorna subito e poi ogni secondo
        updateCountdown();
        this._draftAlertInterval = setInterval(updateCountdown, 1000);
    },

    /**
     * Ferma il countdown dell'alert draft
     */
    stopDraftAlert() {
        if (this._draftAlertInterval) {
            clearInterval(this._draftAlertInterval);
            this._draftAlertInterval = null;
        }
    },

    /**
     * Stato minimizzato dell'alert (salvato in localStorage)
     */
    _draftAlertMinimized: false,

    /**
     * Toggle stato minimizzato dell'alert draft
     * @param {boolean} minimized - true per minimizzare, false per espandere
     */
    toggleDraftAlertMinimized(minimized) {
        this._draftAlertMinimized = minimized;

        // Salva preferenza in localStorage
        try {
            localStorage.setItem('draft_alert_minimized', minimized ? 'true' : 'false');
        } catch (e) { }

        // Aggiorna UI
        const expandedEl = document.getElementById('draft-alert-expanded');
        const minimizedEl = document.getElementById('draft-alert-minimized');

        if (minimized) {
            expandedEl?.classList.add('hidden');
            minimizedEl?.classList.remove('hidden');
        } else {
            expandedEl?.classList.remove('hidden');
            minimizedEl?.classList.add('hidden');
        }
    },

    /**
     * Ripristina stato minimizzato dal localStorage
     */
    restoreDraftAlertMinimizedState() {
        try {
            const saved = localStorage.getItem('draft_alert_minimized');
            this._draftAlertMinimized = saved === 'true';

            if (this._draftAlertMinimized) {
                const expandedEl = document.getElementById('draft-alert-expanded');
                const minimizedEl = document.getElementById('draft-alert-minimized');
                expandedEl?.classList.add('hidden');
                minimizedEl?.classList.remove('hidden');
            }
        } catch (e) { }
    },

    /**
     * Naviga al draft correttamente (caricando il modulo se necessario)
     */
    goToDraft() {
        const draftContent = document.getElementById('draft-content');
        if (!draftContent) {
            console.error('[DraftAlert] draft-content non trovato');
            return;
        }

        // Usa showScreen
        if (window.showScreen) {
            window.showScreen(draftContent);
        }

        // Lancia l'evento per caricare il contenuto del draft
        // (come fa il bottone nella dashboard)
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        document.dispatchEvent(new CustomEvent('draftPanelLoaded', {
            detail: { mode: 'utente', teamId: currentTeamId }
        }));
    },

    /**
     * Inizializza il listener per il bottone "Vai al Draft" nell'alert
     */
    initDraftAlertButton() {
        const goBtn = document.getElementById('draft-alert-go-btn');
        if (goBtn) {
            goBtn.addEventListener('click', () => {
                this.goToDraft();
            });
        }

        // Ripristina stato minimizzato
        this.restoreDraftAlertMinimizedState();
    }
};

console.log("✅ Modulo interfaccia-dashboard.js caricato.");
