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

        // Aggiorna il box budget
        const budgetElement = document.getElementById('team-budget-value');
        if (budgetElement) {
            const budget = currentTeamData.budget || 0;
            budgetElement.textContent = `${budget} CS`;
        }

        window.InterfacciaCore.currentTeamId = teamDocId;
        elements.teamLogoElement.src = logoUrl || DEFAULT_LOGO_URL;

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
                    iconaAvatarElement.src = photoUrl;
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

        // Mostra la dashboard
        window.showScreen(elements.appContent);
    },

    /**
     * Variabile per l'intervallo del countdown
     */
    _countdownInterval: null,

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

        // Bordo dashboard (football-box)
        const dashboard = document.getElementById('app-content');
        if (dashboard) {
            dashboard.style.borderColor = color;
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
            toggle.classList.remove('bg-gray-600', 'border-purple-500');
            toggle.classList.add('bg-green-500', 'border-green-500');
            statusText.textContent = '✅ Stai partecipando al campionato';
            statusText.classList.remove('text-gray-400', 'text-red-400');
            statusText.classList.add('text-green-400');
        } else {
            toggle.classList.remove('bg-green-500', 'border-green-500');
            toggle.classList.add('bg-gray-600', 'border-purple-500');
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
                toggle.classList.remove('bg-gray-600', 'border-purple-500');
                toggle.classList.add('bg-green-500', 'border-green-500');
                statusText.textContent = '✅ Stai partecipando al campionato';
                statusText.classList.remove('text-yellow-400');
                statusText.classList.add('text-green-400');
            } else {
                toggle.classList.remove('bg-green-500', 'border-green-500');
                toggle.classList.add('bg-gray-600', 'border-purple-500');
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
            toggle.classList.remove('bg-gray-600', 'border-purple-500');
            toggle.classList.add('bg-purple-500', 'border-purple-500');
            statusText.textContent = '✅ Iscritto alla CoppaSeriA';
            statusText.classList.remove('text-gray-400', 'text-red-400');
            statusText.classList.add('text-purple-400');
        } else {
            toggle.classList.remove('bg-purple-500', 'border-purple-500');
            toggle.classList.add('bg-gray-600', 'border-gray-500');
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
                toggle.classList.remove('bg-gray-600', 'border-gray-500');
                toggle.classList.add('bg-purple-500', 'border-purple-500');
                statusText.textContent = '✅ Iscritto alla CoppaSeriA';
                statusText.classList.remove('text-yellow-400');
                statusText.classList.add('text-purple-400');
            } else {
                toggle.classList.remove('bg-purple-500', 'border-purple-500');
                toggle.classList.add('bg-gray-600', 'border-gray-500');
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
            const teamDoc = await getDoc(teamDocRef);
            
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
            const scheduleDoc = await getDoc(scheduleDocRef);
            
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
    }
};

console.log("✅ Modulo interfaccia-dashboard.js caricato.");
