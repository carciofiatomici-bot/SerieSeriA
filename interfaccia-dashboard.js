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

        // CASO SPECIALE: serieseria e' un account admin puro, non una squadra
        // Mostra SOLO il pannello admin, nasconde tutta la dashboard normale
        if (teamName && teamName.toLowerCase() === 'serieseria') {
            this.showAdminOnlyView(elements);
            return;
        }

        // Nome squadra in maiuscolo
        elements.teamDashboardTitle.textContent = teamName.toUpperCase();
        elements.teamFirestoreId.textContent = teamDocId;

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

        // Inizializza il widget giocatori vicini al level-up
        this.initNearLevelUpWidget();

        // Inizializza il countdown per la prossima partita
        this.initNextMatchCountdown();

        // Gestisce il bottone "Torna al Pannello Admin"
        this.initAdminReturnButton();

        // Gestisce il bottone "Pannello Admin" per squadre admin
        this.initAdminPanelButton();

        // Inizializza il sistema di cambio password
        this.initChangePassword();

        // Aggiorna gli alert sui bottoni (formazione migliorabile, contratti in scadenza)
        this.updateButtonAlerts();

        // Inizializza il floating alert prossima partita
        if (window.NextMatchAlert) {
            window.NextMatchAlert.init();
        }

        // Mostra la dashboard
        window.showScreen(elements.appContent);
    },

    /**
     * Mostra una vista speciale per l'account admin "serieseria".
     * Questo account non e' una squadra ma serve solo per accedere al pannello admin.
     */
    showAdminOnlyView(elements) {
        // Nascondi elementi dashboard normali e mostra vista admin-only
        const appContent = elements.appContent;
        if (!appContent) return;

        // Crea overlay admin-only
        let adminOnlyOverlay = document.getElementById('admin-only-overlay');
        if (!adminOnlyOverlay) {
            adminOnlyOverlay = document.createElement('div');
            adminOnlyOverlay.id = 'admin-only-overlay';
            adminOnlyOverlay.className = 'fixed inset-0 bg-gray-900 flex items-center justify-center z-50';
            adminOnlyOverlay.innerHTML = `
                <div class="text-center p-8 max-w-md">
                    <div class="text-8xl mb-6">🔧</div>
                    <h1 class="text-3xl font-bold text-white mb-4">Pannello Amministrazione</h1>
                    <p class="text-gray-400 mb-8">
                        Questo account e' riservato all'amministrazione del sistema.
                    </p>
                    <button id="btn-admin-only-enter"
                            class="w-full py-4 px-8 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-xl shadow-lg transition transform hover:scale-105">
                        Accedi al Pannello Admin
                    </button>
                    <p class="text-gray-500 text-sm mt-6">
                        Serie SeriA - Account Amministratore
                    </p>
                </div>
            `;
            document.body.appendChild(adminOnlyOverlay);

            // Event listener per il bottone
            document.getElementById('btn-admin-only-enter').addEventListener('click', () => {
                // Rimuovi l'overlay
                adminOnlyOverlay.remove();

                // Naviga al pannello admin
                const adminContent = document.getElementById('admin-content');
                if (adminContent && window.showScreen) {
                    window.showScreen(adminContent);
                    document.dispatchEvent(new CustomEvent('adminLoggedIn'));
                }
            });
        }

        console.log('[Dashboard] Account serieseria - mostrata vista admin-only');
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
     * Inizializza il bottone "Pannello Admin" per squadre con permessi admin.
     * Visibile SOLO se la squadra corrente ha isAdmin: true.
     * La verifica usa la funzione centralizzata window.isTeamAdmin().
     */
    initAdminPanelButton() {
        const button = document.getElementById('btn-goto-admin-panel');
        if (!button) return;

        const currentTeamData = window.InterfacciaCore?.currentTeamData;
        const currentTeamId = window.InterfacciaCore?.currentTeamId;

        // Verifica admin usando la funzione centralizzata (interfaccia-core.js)
        // isTeamAdmin controlla: teamName === 'serieseria' OPPURE isAdmin === true
        const isAdmin = window.isTeamAdmin(
            currentTeamData?.teamName,
            currentTeamData
        );

        if (isAdmin && currentTeamId) {
            // Mostra il bottone
            button.classList.remove('hidden');

            // Rimuovi listener precedenti clonando il bottone
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            // Aggiungi listener per aprire il pannello admin
            newButton.addEventListener('click', async () => {
                // Doppia verifica di sicurezza: ricontrolla permessi prima di navigare
                const stillAdmin = await window.checkCurrentTeamIsAdmin();
                if (!stillAdmin) {
                    if (window.Toast) {
                        window.Toast.error('Accesso negato: permessi insufficienti');
                    }
                    newButton.classList.add('hidden');
                    return;
                }

                // Imposta flag per mostrare "Torna alla Dashboard" nel pannello admin
                // Solo per squadre admin diverse da serieseria
                const teamName = currentTeamData?.teamName;
                if (teamName && teamName.toLowerCase() !== 'serieseria') {
                    window.adminTeamAccessingPanel = {
                        teamId: currentTeamId,
                        teamName: teamName
                    };
                }

                // Naviga al pannello admin
                const adminContent = document.getElementById('admin-content');
                if (adminContent && window.showScreen) {
                    window.showScreen(adminContent);
                    // Trigger evento per inizializzare il pannello admin
                    document.dispatchEvent(new CustomEvent('adminLoggedIn'));
                }
            });

            console.log('[Dashboard] Bottone Admin Panel attivato per squadra admin');

            // Nascondi il pulsante changelog per squadre admin (hanno gia il changelog nel pannello admin)
            const changelogBtn = document.getElementById('btn-show-changelog-dashboard');
            if (changelogBtn) {
                changelogBtn.classList.add('hidden');
            }
        } else {
            // Nascondi il bottone per squadre non admin
            button.classList.add('hidden');

            // Mostra il pulsante changelog per squadre non admin
            const changelogBtn = document.getElementById('btn-show-changelog-dashboard');
            if (changelogBtn) {
                changelogBtn.classList.remove('hidden');
            }
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

        // Bordo box Gestione Rosa/Formazione
        const gestioneBox = document.getElementById('gestione-box');
        if (gestioneBox) {
            gestioneBox.style.borderColor = color;
        }

        // Bordo box Competizioni
        const competizioniBox = document.getElementById('competizioni-box');
        if (competizioniBox) {
            competizioniBox.style.borderColor = color;
        }

        // Bordo box Draft/Scambi
        const draftScambiBox = document.getElementById('draft-scambi-box');
        if (draftScambiBox) {
            draftScambiBox.style.borderColor = color;
        }

        // Bordo box Toggle Partecipazione
        const togglePartecipazioneBox = document.getElementById('toggle-partecipazione-box');
        if (togglePartecipazioneBox) {
            togglePartecipazioneBox.style.borderColor = color;
        }

        // Bordo box Sponsor-Media
        const sponsorMediaBox = document.getElementById('sponsor-media-box');
        if (sponsorMediaBox) {
            sponsorMediaBox.style.borderColor = color;
        }

        // Bordo box Nome Squadra
        const teamNameBox = document.getElementById('team-name-box');
        if (teamNameBox) {
            teamNameBox.style.borderColor = color;
        }

        // Colore testo nome squadra
        const teamTitle = document.getElementById('team-dashboard-title');
        if (teamTitle) {
            teamTitle.style.color = color;
        }

        // Bordo box Lega Privata
        const privateLeaguesBox = document.getElementById('private-leagues-box');
        if (privateLeaguesBox) {
            privateLeaguesBox.style.borderColor = color;
        }

        // Bordo box Stadio-Hall of Fame
        const stadioHallBox = document.getElementById('stadio-hall-box');
        if (stadioHallBox) {
            stadioHallBox.style.borderColor = color;
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

        if (!toggle) return;

        const currentTeamData = window.InterfacciaCore.currentTeamData;
        const isParticipating = currentTeamData?.isParticipating || false;

        toggle.checked = isParticipating;

        // Aggiorna status text solo se esiste
        if (statusText) {
            if (isParticipating) {
                statusText.textContent = '✅ Stai partecipando al campionato';
                statusText.classList.remove('text-gray-400', 'text-red-400');
                statusText.classList.add('text-green-400');
            } else {
                statusText.textContent = '❌ Non stai partecipando al campionato';
                statusText.classList.remove('text-green-400', 'text-red-400');
                statusText.classList.add('text-gray-400');
            }
        }
    },

    /**
     * NUOVO: Gestisce il cambio del toggle partecipazione campionato
     */
    async handleChampionshipParticipationToggle(isChecked) {
        const toggle = document.getElementById('championship-participation-toggle');
        const statusText = document.getElementById('championship-participation-status');

        if (!toggle) return;

        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) return;

        const { doc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

        // Disabilita il toggle durante il salvataggio
        toggle.disabled = true;
        if (statusText) {
            statusText.textContent = '⏳ Salvataggio in corso...';
            statusText.classList.remove('text-green-400', 'text-gray-400', 'text-red-400');
            statusText.classList.add('text-yellow-400');
        }

        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, currentTeamId);

            await updateDoc(teamDocRef, {
                isParticipating: isChecked
            });

            // Aggiorna i dati locali
            window.InterfacciaCore.currentTeamData.isParticipating = isChecked;

            // Aggiorna l'UI
            if (statusText) {
                if (isChecked) {
                    statusText.textContent = '✅ Stai partecipando al campionato';
                    statusText.classList.remove('text-yellow-400');
                    statusText.classList.add('text-green-400');
                } else {
                    statusText.textContent = '❌ Non stai partecipando al campionato';
                    statusText.classList.remove('text-yellow-400');
                    statusText.classList.add('text-gray-400');
                }
            }

        } catch (error) {
            console.error('Errore nel salvataggio stato partecipazione:', error);

            // Ripristina lo stato precedente in caso di errore
            toggle.checked = !isChecked;
            if (statusText) {
                statusText.textContent = '❌ Errore nel salvataggio. Riprova.';
                statusText.classList.remove('text-yellow-400');
                statusText.classList.add('text-red-400');
            }
            if (window.Toast) {
                window.Toast.error('Errore nel salvataggio. Riprova.');
            }
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

        if (!toggle) return;

        const currentTeamData = window.InterfacciaCore.currentTeamData;
        const isCupParticipating = currentTeamData?.isCupParticipating || false;

        toggle.checked = isCupParticipating;

        // Aggiorna status text solo se esiste
        if (statusText) {
            if (isCupParticipating) {
                statusText.textContent = '✅ Iscritto alla CoppaSeriA';
                statusText.classList.remove('text-gray-400', 'text-red-400');
                statusText.classList.add('text-purple-400');
            } else {
                statusText.textContent = '❌ Non iscritto alla CoppaSeriA';
                statusText.classList.remove('text-purple-400', 'text-red-400');
                statusText.classList.add('text-gray-400');
            }
        }
    },

    /**
     * NUOVO: Gestisce il cambio del toggle partecipazione CoppaSeriA
     */
    async handleCupParticipationToggle(isChecked) {
        const toggle = document.getElementById('cup-participation-toggle');
        const statusText = document.getElementById('cup-participation-status');

        if (!toggle) return;

        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) return;

        // Disabilita il toggle durante il salvataggio
        toggle.disabled = true;
        if (statusText) {
            statusText.textContent = '⏳ Salvataggio in corso...';
            statusText.classList.remove('text-purple-400', 'text-gray-400', 'text-red-400');
            statusText.classList.add('text-yellow-400');
        }

        try {
            await window.CoppaMain.toggleCupParticipation(currentTeamId, isChecked);

            // Aggiorna i dati locali
            window.InterfacciaCore.currentTeamData.isCupParticipating = isChecked;

            // Aggiorna l'UI
            if (statusText) {
                if (isChecked) {
                    statusText.textContent = '✅ Iscritto alla CoppaSeriA';
                    statusText.classList.remove('text-yellow-400');
                    statusText.classList.add('text-purple-400');
                } else {
                    statusText.textContent = '❌ Non iscritto alla CoppaSeriA';
                    statusText.classList.remove('text-yellow-400');
                    statusText.classList.add('text-gray-400');
                }
            }

        } catch (error) {
            console.error('Errore nel salvataggio stato partecipazione coppa:', error);

            // Ripristina lo stato precedente in caso di errore
            toggle.checked = !isChecked;
            if (statusText) {
                statusText.textContent = '❌ Errore nel salvataggio. Riprova.';
                statusText.classList.remove('text-yellow-400');
                statusText.classList.add('text-red-400');
            }
            if (window.Toast) {
                window.Toast.error('Errore nel salvataggio. Riprova.');
            }
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
                // Ricarica stato toggle partecipazione draft
                window.InterfacciaNavigation?.loadDraftParticipationState?.();
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

    /**
     * Inizializza il widget giocatori vicini al level-up
     */
    async initNearLevelUpWidget() {
        const container = document.getElementById('near-level-up-widget-container');
        if (!container) return;

        const currentTeamData = window.InterfacciaCore?.currentTeamData;
        if (!currentTeamData || !window.PlayerExp || !window.PlayerExpUI) {
            container.innerHTML = '';
            return;
        }

        // Migra tutti i giocatori se necessario
        window.PlayerExp.migrateTeam(currentTeamData);

        // Renderizza il widget
        const widgetHtml = window.PlayerExpUI.renderNearLevelUpWidget(currentTeamData, 75);
        container.innerHTML = widgetHtml;
    },

    // ====================================================================
    // ALERT DRAFT ATTIVO - Sistema Refactored
    // ====================================================================

    // Intervallo per aggiornare il countdown dell'alert draft
    _draftAlertInterval: null,

    // Listener real-time per lo stato del draft
    _draftAlertUnsubscribe: null,

    // Stato corrente del draft alert (per evitare aggiornamenti ridondanti)
    _draftAlertState: {
        currentTeamId: null,
        turnStartTime: null,
        turnExpired: false,
        isStolenTurn: false,
        lastUpdate: 0
    },

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
     * REFACTORED: Usa lo stato come single source of truth
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
            this._resetDraftAlertState();
            return;
        }

        // Ottieni info sul turno corrente
        const currentRound = draftTurns.currentRound;
        const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
        const currentOrder = draftTurns[orderKey] || [];
        const currentTurnTeamId = draftTurns.currentTeamId;
        const currentTeam = currentOrder.find(t => t.teamId === currentTurnTeamId);

        // Converti turnStartTime se e' un Timestamp Firestore
        let turnStartTime = draftTurns.turnStartTime;
        if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
            turnStartTime = turnStartTime.toMillis();
        }
        const turnExpired = draftTurns.turnExpired || false;

        // Converti turnExpiredAt se e' un Timestamp Firestore
        let turnExpiredAt = draftTurns.turnExpiredAt;
        if (turnExpiredAt && typeof turnExpiredAt.toMillis === 'function') {
            turnExpiredAt = turnExpiredAt.toMillis();
        }

        // CONTROLLO: Valida isStolenTurn per evitare valori inconsistenti
        // Un turno e' considerato "rubato" SOLO se:
        // 1. isStolenTurn e' true in Firestore
        // 2. E stolenBy/stolenFrom sono impostati (indicano chi ha rubato da chi)
        // Se isStolenTurn e' true ma mancano questi campi, e' un valore stale
        let isStolenTurn = draftTurns.isStolenTurn || false;
        if (isStolenTurn) {
            const hasStealInfo = draftTurns.stolenBy || draftTurns.stolenFrom;
            if (!hasStealInfo) {
                // isStolenTurn e' true ma non ci sono info sul furto - probabilmente stale
                console.warn('[DraftAlert] isStolenTurn=true ma mancano stolenBy/stolenFrom - uso timeout normale (1h)');
                isStolenTurn = false;
            }
        }

        // Aggiorna DraftTimerSync con i dati dal server
        if (window.DraftTimerSync) {
            window.DraftTimerSync.updateFromFirestore(draftTurns);
        }

        // Debug: mostra quale timeout viene usato
        console.log('[DraftAlert] Stato:', {
            currentTeam: currentTeam?.teamName,
            turnExpired,
            isStolenTurn,
            stolenBy: draftTurns.stolenBy || null,
            stolenFrom: draftTurns.stolenFrom || null,
            timeout: isStolenTurn ? '10 min (stolen)' : '1 ora (normal)'
        });

        if (!currentTeam) {
            banner.classList.add('hidden');
            this._resetDraftAlertState();
            return;
        }

        // Mostra il banner
        banner.classList.remove('hidden');

        // Elementi UI
        const teamNameEl = document.getElementById('draft-alert-team');
        const countdownEl = document.getElementById('draft-alert-countdown');
        const stealInfoEl = document.getElementById('draft-alert-steal-info');
        const bannerInner = banner.querySelector('div');

        // Controlla se l'utente corrente puo' rubare il turno
        const userEntry = currentOrder.find(t => t.teamId === currentTeamId);
        const hasDraftedThisRound = userEntry ? userEntry.hasDrafted : false;
        const canSteal = turnExpired && currentTeamId !== currentTurnTeamId && !hasDraftedThisRound;
        const isMyTurn = currentTeamId === currentTurnTeamId;

        // SEMPRE ferma e riavvia il countdown per mantenerlo sincronizzato con Firestore
        this.stopDraftAlert();

        // Aggiorna lo stato salvato
        this._updateDraftAlertState(currentTurnTeamId, turnStartTime, turnExpired, isStolenTurn);

        // Applica lo stile e il contenuto in base allo stato
        this._applyDraftAlertStyle(banner, bannerInner, teamNameEl, countdownEl, stealInfoEl, {
            currentTeam,
            canSteal,
            isMyTurn,
            hasDraftedThisRound,
            turnExpired,
            turnExpiredAt,
            isStolenTurn,
            turnStartTime
        });
    },

    /**
     * Controlla se lo stato del draft e' cambiato
     */
    _hasDraftStateChanged(teamId, turnStartTime, turnExpired, isStolenTurn) {
        const state = this._draftAlertState;
        return (
            state.currentTeamId !== teamId ||
            state.turnStartTime !== turnStartTime ||
            state.turnExpired !== turnExpired ||
            state.isStolenTurn !== isStolenTurn
        );
    },

    /**
     * Aggiorna lo stato interno del draft alert
     */
    _updateDraftAlertState(teamId, turnStartTime, turnExpired, isStolenTurn) {
        this._draftAlertState = {
            currentTeamId: teamId,
            turnStartTime: turnStartTime,
            turnExpired: turnExpired,
            isStolenTurn: isStolenTurn,
            lastUpdate: Date.now()
        };
    },

    /**
     * Reset dello stato del draft alert
     */
    _resetDraftAlertState() {
        this._draftAlertState = {
            currentTeamId: null,
            turnStartTime: null,
            turnExpired: false,
            isStolenTurn: false,
            lastUpdate: 0
        };
    },

    /**
     * Applica lo stile e contenuto al banner del draft
     */
    _applyDraftAlertStyle(banner, bannerInner, teamNameEl, countdownEl, stealInfoEl, data) {
        const { currentTeam, canSteal, isMyTurn, hasDraftedThisRound, turnExpired, turnExpiredAt, isStolenTurn, turnStartTime } = data;

        // Elementi per auto-assign
        const autoAssignInfoEl = document.getElementById('draft-alert-autoassign-info');
        const autoAssignCountdownEl = document.getElementById('draft-alert-autoassign-countdown');

        // Reset classi del banner
        if (bannerInner) {
            bannerInner.classList.remove(
                'from-purple-900', 'to-indigo-900', 'border-purple-500',
                'from-green-900', 'to-emerald-900', 'border-green-500',
                'from-red-900', 'to-rose-900', 'border-red-500'
            );
        }

        // STATO 1: Turno rubabile (SCADUTO e posso rubare)
        if (canSteal) {
            // Auto-espandi l'alert quando si puo' rubare
            this.toggleDraftAlertMinimized(false);

            if (bannerInner) {
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
            if (stealInfoEl) {
                stealInfoEl.classList.remove('hidden');
                stealInfoEl.textContent = `Strikes: ${currentTeam.timeoutStrikes || 0}/3`;
            }

            // Mostra timer auto-assign se turnExpiredAt e' disponibile
            if (turnExpiredAt && autoAssignInfoEl && autoAssignCountdownEl) {
                autoAssignInfoEl.classList.remove('hidden');
                autoAssignInfoEl.textContent = '⚠️ Auto-assign tra:';
                autoAssignCountdownEl.classList.remove('hidden');

                // Avvia countdown per auto-assign (1 ora dalla scadenza)
                this.startAutoAssignCountdown(turnExpiredAt);
            } else {
                // Nascondi se non c'e' turnExpiredAt
                if (autoAssignInfoEl) autoAssignInfoEl.classList.add('hidden');
                if (autoAssignCountdownEl) autoAssignCountdownEl.classList.add('hidden');
            }
            return;
        }

        // Nascondi elementi auto-assign per altri stati
        if (autoAssignInfoEl) autoAssignInfoEl.classList.add('hidden');
        if (autoAssignCountdownEl) autoAssignCountdownEl.classList.add('hidden');

        // STATO 2: Ho gia' draftato in questo round
        if (hasDraftedThisRound) {
            if (bannerInner) {
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
            // Avvia countdown per mostrare tempo rimanente (solo info)
            this.startDraftAlertCountdown(turnStartTime, isStolenTurn, false);
            return;
        }

        // STATO 3: E' il mio turno
        if (isMyTurn) {
            // Auto-espandi l'alert quando e' il mio turno
            this.toggleDraftAlertMinimized(false);

            if (bannerInner) {
                bannerInner.classList.add('from-green-900', 'to-emerald-900', 'border-green-500');
            }
            if (teamNameEl) {
                teamNameEl.textContent = '🎉 TOCCA A TE!';
                teamNameEl.classList.remove('text-yellow-400', 'text-red-400');
                teamNameEl.classList.add('text-green-400');
            }
            if (countdownEl) {
                countdownEl.classList.remove('text-red-400', 'animate-pulse');
                countdownEl.classList.add('text-white');
            }
            if (stealInfoEl) {
                stealInfoEl.classList.add('hidden');
            }
            // Avvia countdown con possibilita' di mostrare SCADUTO se e' il mio turno
            this.startDraftAlertCountdown(turnStartTime, isStolenTurn, true);
            return;
        }

        // STATO 4: In attesa del mio turno (turno di qualcun altro, non scaduto)
        if (bannerInner) {
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
            stealInfoEl.classList.add('hidden');
        }
        // Avvia countdown - quando scade, Firestore impostera' turnExpired e il listener aggiornera' l'UI
        this.startDraftAlertCountdown(turnStartTime, isStolenTurn, false);
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
     * REFACTORED: Non ricarica piu' automaticamente quando scade - il listener Firestore gestisce gli aggiornamenti
     * @param {number} turnStartTimeParam - Timestamp di inizio turno
     * @param {boolean} isStolenTurn - Se true, usa timeout di 10 minuti invece di 1 ora
     * @param {boolean} showExpiredState - Se true, mostra "SCADUTO" quando il timer arriva a 0 (solo per il proprio turno)
     */
    startDraftAlertCountdown(turnStartTimeParam, isStolenTurn = false, showExpiredState = false) {
        const countdownEl = document.getElementById('draft-alert-countdown');
        const countdownMiniEl = document.getElementById('draft-alert-countdown-mini');
        if (!countdownEl) return;

        // Usa DraftTimerSync per il countdown sincronizzato
        if (window.DraftTimerSync) {
            // Flag per tracciare se abbiamo gia' mostrato lo stato scaduto
            let hasShownExpired = false;

            // Sottoscrivi agli aggiornamenti del timer
            this._draftAlertUnsubscribe = window.DraftTimerSync.subscribe((state) => {
                if (!countdownEl) return;

                // Se il tempo e' scaduto
                if (state.isExpired) {
                    if (showExpiredState && !hasShownExpired) {
                        hasShownExpired = true;
                        countdownEl.textContent = 'SCADUTO';
                        countdownEl.classList.add('text-red-400', 'animate-pulse');
                        countdownEl.classList.remove('text-white');
                        if (countdownMiniEl) {
                            countdownMiniEl.textContent = '00:00';
                            countdownMiniEl.classList.add('text-red-400', 'animate-pulse');
                        }
                    } else if (!showExpiredState) {
                        countdownEl.textContent = '00:00';
                        if (countdownMiniEl) {
                            countdownMiniEl.textContent = '00:00';
                        }
                    }
                    return;
                }

                // Formatta il tempo rimanente
                let timeText = state.formattedTime;
                if (state.isNightPause) {
                    timeText = `${state.formattedTime} 🌙`;
                }
                countdownEl.textContent = timeText;

                // Aggiorna anche la versione mini
                if (countdownMiniEl) {
                    countdownMiniEl.textContent = state.formattedTime;
                }

                // Gestisci le classi CSS
                countdownEl.classList.remove('text-red-400', 'text-white', 'animate-pulse');
                countdownMiniEl?.classList.remove('text-red-400', 'text-white', 'animate-pulse');

                if (state.isWarning && !state.isNightPause) {
                    countdownEl.classList.add('text-red-400');
                    countdownMiniEl?.classList.add('text-red-400');
                } else {
                    countdownEl.classList.add('text-white');
                    countdownMiniEl?.classList.add('text-white');
                }
            });
        } else {
            // Fallback: usa il vecchio metodo se DraftTimerSync non e' disponibile
            this._startLegacyAlertCountdown(turnStartTimeParam, isStolenTurn, showExpiredState);
        }
    },

    /**
     * Fallback: countdown legacy per l'alert senza DraftTimerSync
     */
    _startLegacyAlertCountdown(turnStartTimeParam, isStolenTurn, showExpiredState) {
        const countdownEl = document.getElementById('draft-alert-countdown');
        const countdownMiniEl = document.getElementById('draft-alert-countdown-mini');
        if (!countdownEl) return;

        let turnStartTime = turnStartTimeParam;
        if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
            turnStartTime = turnStartTime.toMillis();
        }

        const { DRAFT_TURN_TIMEOUT_MS, DRAFT_STEAL_TIMEOUT_MS } = window.DraftConstants || {
            DRAFT_TURN_TIMEOUT_MS: 3600000,
            DRAFT_STEAL_TIMEOUT_MS: 600000
        };

        const timeout = isStolenTurn ? DRAFT_STEAL_TIMEOUT_MS : DRAFT_TURN_TIMEOUT_MS;
        let hasShownExpired = false;

        const updateCountdown = () => {
            const timeRemaining = window.DraftConstants?.getEffectiveTimeRemaining
                ? window.DraftConstants.getEffectiveTimeRemaining(turnStartTime, timeout)
                : Math.max(0, timeout - (Date.now() - turnStartTime));

            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            const isNightPause = window.DraftConstants?.isNightPauseActive?.() || false;

            if (timeRemaining <= 0 && !isNightPause) {
                if (showExpiredState && !hasShownExpired) {
                    hasShownExpired = true;
                    countdownEl.textContent = 'SCADUTO';
                    countdownEl.classList.add('text-red-400', 'animate-pulse');
                    countdownEl.classList.remove('text-white');
                    if (countdownMiniEl) {
                        countdownMiniEl.textContent = '00:00';
                        countdownMiniEl.classList.add('text-red-400', 'animate-pulse');
                    }
                } else if (!showExpiredState) {
                    countdownEl.textContent = '00:00';
                    if (countdownMiniEl) countdownMiniEl.textContent = '00:00';
                }
                return;
            }

            let timeText = isNightPause
                ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} 🌙`
                : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            countdownEl.textContent = timeText;
            if (countdownMiniEl) countdownMiniEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

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
        };

        updateCountdown();
        this._draftAlertInterval = setInterval(updateCountdown, 1000);
    },

    /**
     * Ferma il countdown dell'alert draft
     */
    stopDraftAlert() {
        // Rimuovi sottoscrizione DraftTimerSync
        if (this._draftAlertUnsubscribe) {
            this._draftAlertUnsubscribe();
            this._draftAlertUnsubscribe = null;
        }
        // Legacy cleanup
        if (this._draftAlertInterval) {
            clearInterval(this._draftAlertInterval);
            this._draftAlertInterval = null;
        }
        // Ferma anche il countdown auto-assign
        this.stopAutoAssignCountdown();
    },

    /**
     * Avvia il countdown per l'auto-assign
     * Mostra quanto tempo manca prima che il sistema assegni automaticamente un giocatore
     * @param {number} turnExpiredAt - Timestamp di quando e' scaduto il timer principale
     */
    startAutoAssignCountdown(turnExpiredAt) {
        // Ferma eventuale countdown precedente
        this.stopAutoAssignCountdown();

        const autoAssignCountdownEl = document.getElementById('draft-alert-autoassign-countdown');
        const autoAssignInfoEl = document.getElementById('draft-alert-autoassign-info');
        if (!autoAssignCountdownEl) return;

        // L'auto-assign avviene 1 ora dopo turnExpiredAt (nella finestra 9:00-22:30)
        const { DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants || { DRAFT_TURN_TIMEOUT_MS: 3600000 };
        const autoAssignTime = turnExpiredAt + DRAFT_TURN_TIMEOUT_MS;

        const updateCountdown = () => {
            const now = Date.now();
            const timeRemaining = Math.max(0, autoAssignTime - now);

            if (timeRemaining <= 0) {
                // Tempo scaduto - l'auto-assign dovrebbe avvenire
                autoAssignCountdownEl.textContent = 'IMMINENTE';
                autoAssignCountdownEl.classList.add('animate-pulse');

                if (autoAssignInfoEl) {
                    autoAssignInfoEl.textContent = '⚠️ Auto-assign in corso...';
                }

                // Ferma il countdown
                this.stopAutoAssignCountdown();
                return;
            }

            // Formatta il tempo rimanente
            const hours = Math.floor(timeRemaining / 3600000);
            const minutes = Math.floor((timeRemaining % 3600000) / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);

            let timeText;
            if (hours > 0) {
                timeText = `${hours}h ${String(minutes).padStart(2, '0')}m`;
            } else {
                timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            autoAssignCountdownEl.textContent = timeText;

            // Aggiorna il testo informativo
            if (autoAssignInfoEl) {
                if (timeRemaining < 5 * 60 * 1000) {
                    // Meno di 5 minuti
                    autoAssignInfoEl.textContent = '⚠️ Auto-assign imminente!';
                    autoAssignCountdownEl.classList.add('animate-pulse');
                } else if (timeRemaining < 15 * 60 * 1000) {
                    // Meno di 15 minuti
                    autoAssignInfoEl.textContent = '⚠️ Auto-assign tra:';
                } else {
                    autoAssignInfoEl.textContent = '⏰ Auto-assign tra:';
                }
            }

            // Colore in base al tempo rimanente
            autoAssignCountdownEl.classList.remove('text-orange-400', 'text-red-400', 'text-yellow-400');
            if (timeRemaining < 5 * 60 * 1000) {
                autoAssignCountdownEl.classList.add('text-red-400');
            } else if (timeRemaining < 15 * 60 * 1000) {
                autoAssignCountdownEl.classList.add('text-yellow-400');
            } else {
                autoAssignCountdownEl.classList.add('text-orange-400');
            }
        };

        // Prima chiamata immediata
        updateCountdown();

        // Aggiorna ogni secondo
        this._autoAssignCountdownInterval = setInterval(updateCountdown, 1000);
    },

    /**
     * Ferma il countdown dell'auto-assign
     */
    stopAutoAssignCountdown() {
        if (this._autoAssignCountdownInterval) {
            clearInterval(this._autoAssignCountdownInterval);
            this._autoAssignCountdownInterval = null;
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
     * Ripristina stato minimizzato dal localStorage (default: minimizzato)
     */
    restoreDraftAlertMinimizedState() {
        try {
            const saved = localStorage.getItem('draft_alert_minimized');
            // Default a minimizzato se non c'e' stato salvato
            this._draftAlertMinimized = saved !== 'false';

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
    },

    // ====================================================================
    // CAMBIO PASSWORD
    // ====================================================================

    /**
     * Inizializza il sistema di cambio password
     */
    initChangePassword() {
        const openBtn = document.getElementById('btn-change-password');
        const modal = document.getElementById('change-password-modal');
        const closeBtn = document.getElementById('btn-close-change-password');
        const cancelBtn = document.getElementById('btn-cancel-change-password');
        const confirmBtn = document.getElementById('btn-confirm-change-password');
        const newPasswordInput = document.getElementById('new-password-input');
        const confirmPasswordInput = document.getElementById('confirm-password-input');
        const messageEl = document.getElementById('change-password-message');

        if (!openBtn || !modal) return;

        // Apri modal
        openBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            messageEl.classList.add('hidden');
            newPasswordInput.focus();
        });

        // Chiudi modal
        const closeModal = () => {
            modal.classList.add('hidden');
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            messageEl.classList.add('hidden');
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        // Chiudi cliccando fuori
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Conferma cambio password
        confirmBtn?.addEventListener('click', async () => {
            await this.handleChangePassword(newPasswordInput, confirmPasswordInput, messageEl, closeModal);
        });

        // Enter per confermare
        confirmPasswordInput?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.handleChangePassword(newPasswordInput, confirmPasswordInput, messageEl, closeModal);
            }
        });
    },

    /**
     * Gestisce il cambio password
     */
    async handleChangePassword(newPasswordInput, confirmPasswordInput, messageEl, closeModal) {
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validazione
        if (!newPassword) {
            this.showChangePasswordMessage(messageEl, 'Inserisci la nuova password', 'error');
            return;
        }

        if (newPassword.length < 4) {
            this.showChangePasswordMessage(messageEl, 'La password deve essere di almeno 4 caratteri', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showChangePasswordMessage(messageEl, 'Le password non corrispondono', 'error');
            return;
        }

        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (!currentTeamId) {
            this.showChangePasswordMessage(messageEl, 'Errore: nessuna squadra selezionata', 'error');
            return;
        }

        // Disabilita bottone durante il salvataggio
        const confirmBtn = document.getElementById('btn-confirm-change-password');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Salvataggio...';
        }

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamsPath = `artifacts/${appId}/public/data/teams`;
            const teamDocRef = doc(window.db, teamsPath, currentTeamId);

            await updateDoc(teamDocRef, {
                password: newPassword
            });

            // Aggiorna anche i dati locali
            if (window.InterfacciaCore.currentTeamData) {
                window.InterfacciaCore.currentTeamData.password = newPassword;
            }

            // Aggiorna la sessione salvata se presente
            const savedSession = localStorage.getItem('fanta_session');
            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession);
                    // Non salviamo la password in localStorage per sicurezza
                } catch (e) {}
            }

            this.showChangePasswordMessage(messageEl, 'Password cambiata con successo!', 'success');

            // Mostra toast se disponibile
            if (window.Toast) {
                window.Toast.success('Password aggiornata con successo');
            }

            // Chiudi modal dopo 1.5 secondi
            setTimeout(() => {
                closeModal();
            }, 1500);

        } catch (error) {
            console.error('[ChangePassword] Errore:', error);
            this.showChangePasswordMessage(messageEl, 'Errore durante il salvataggio. Riprova.', 'error');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Cambia Password';
            }
        }
    },

    /**
     * Mostra un messaggio nel modal cambio password
     */
    showChangePasswordMessage(messageEl, text, type) {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.classList.remove('hidden', 'text-green-400', 'text-red-400');
        messageEl.classList.add(type === 'success' ? 'text-green-400' : 'text-red-400');
    },

    // ====================================================================
    // MATCH ALERT BANNER - Timer Prossima Partita
    // ====================================================================

    _matchAlertInterval: null,
    _matchAlertMinimized: false,

    /**
     * Inizializza il banner del timer prossima partita
     * Sincronizzato con l'automazione simulazioni
     */
    async initMatchAlert() {
        const banner = document.getElementById('match-alert-banner');
        if (!banner) return;

        // Nascondi per l'admin
        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        const adminUsername = window.InterfacciaConstants?.ADMIN_USERNAME_LOWER || 'serieseria';
        if (!currentTeamId || currentTeamId === 'admin' || currentTeamId === adminUsername) {
            banner.classList.add('hidden');
            return;
        }

        // Verifica se campionato o coppa sono attivi
        const isActive = await this.checkCompetitionsActive();
        if (!isActive) {
            banner.classList.add('hidden');
            this.stopMatchAlert();
            return;
        }

        // Mostra il banner e avvia il timer
        banner.classList.remove('hidden');
        this.restoreMatchAlertMinimizedState();
        this.updateMatchAlertInfo();
        this.startMatchAlertCountdown();
    },

    /**
     * Verifica se campionato o coppa sono attivi
     */
    async checkCompetitionsActive() {
        try {
            const { doc, getDoc, appId } = window.firestoreTools;
            const configDocRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'settings');
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) return false;

            const config = configDoc.data();
            const isChampionshipActive = config.isChampionshipStarted === true;
            const isCupActive = config.isCoppaStarted === true;

            // Verifica anche se l'automazione e' attiva
            const automationEnabled = config.automationEnabled === true;

            return (isChampionshipActive || isCupActive) && automationEnabled;
        } catch (error) {
            console.error('[MatchAlert] Errore verifica competizioni:', error);
            return false;
        }
    },

    /**
     * Aggiorna le informazioni nel banner (competizione, avversario)
     */
    async updateMatchAlertInfo() {
        const competitionEl = document.getElementById('match-alert-competition');
        const infoEl = document.getElementById('match-alert-info');
        const opponentEl = document.getElementById('match-alert-opponent');

        if (!competitionEl || !infoEl || !opponentEl) return;

        try {
            // Ottieni info sull'automazione
            if (window.AutomazioneSimulazioni) {
                const info = await window.AutomazioneSimulazioni.getAutomationInfo();

                if (info && info.isEnabled) {
                    // Determina tipo di competizione
                    const typeLabels = {
                        'coppa_andata': 'COPPA (Andata)',
                        'coppa_ritorno': 'COPPA (Ritorno)',
                        'campionato': 'CAMPIONATO'
                    };

                    const competitionType = info.nextSimulationType || 'campionato';
                    competitionEl.textContent = typeLabels[competitionType] || 'PROSSIMA PARTITA';

                    // Info aggiuntive
                    if (competitionType === 'campionato') {
                        infoEl.textContent = 'Giornata in arrivo';
                    } else {
                        infoEl.textContent = 'Turno in arrivo';
                    }

                    // Per ora mostriamo un messaggio generico per l'avversario
                    opponentEl.textContent = 'Simulazione alle 20:30';
                } else {
                    competitionEl.textContent = 'COMPETIZIONI';
                    infoEl.textContent = 'Automazione disattivata';
                    opponentEl.textContent = '';
                }
            }
        } catch (error) {
            console.error('[MatchAlert] Errore aggiornamento info:', error);
        }
    },

    /**
     * Avvia il countdown sincronizzato con l'automazione simulazioni
     */
    startMatchAlertCountdown() {
        this.stopMatchAlert();

        const countdownEl = document.getElementById('match-alert-countdown');
        const countdownMiniEl = document.getElementById('match-alert-countdown-mini');

        if (!countdownEl) return;

        const updateCountdown = () => {
            if (window.AutomazioneSimulazioni) {
                const timeUntil = window.AutomazioneSimulazioni.getTimeUntilNextSimulation();

                if (timeUntil && timeUntil.formatted) {
                    countdownEl.textContent = timeUntil.formatted;
                    if (countdownMiniEl) {
                        countdownMiniEl.textContent = timeUntil.formatted;
                    }

                    // Cambia colore se meno di 1 ora
                    if (timeUntil.ms < 3600000) {
                        countdownEl.classList.remove('text-teal-400');
                        countdownEl.classList.add('text-yellow-400');
                        countdownMiniEl?.classList.remove('text-teal-400');
                        countdownMiniEl?.classList.add('text-yellow-400');
                    } else {
                        countdownEl.classList.remove('text-yellow-400');
                        countdownEl.classList.add('text-teal-400');
                        countdownMiniEl?.classList.remove('text-yellow-400');
                        countdownMiniEl?.classList.add('text-teal-400');
                    }

                    // Animazione se meno di 5 minuti
                    if (timeUntil.ms < 300000) {
                        countdownEl.classList.add('animate-pulse');
                        countdownMiniEl?.classList.add('animate-pulse');
                    } else {
                        countdownEl.classList.remove('animate-pulse');
                        countdownMiniEl?.classList.remove('animate-pulse');
                    }
                } else {
                    countdownEl.textContent = '--:--:--';
                    if (countdownMiniEl) countdownMiniEl.textContent = '--:--:--';
                }
            } else {
                countdownEl.textContent = '--:--:--';
                if (countdownMiniEl) countdownMiniEl.textContent = '--:--:--';
            }
        };

        // Prima chiamata immediata
        updateCountdown();

        // Aggiorna ogni secondo
        this._matchAlertInterval = setInterval(updateCountdown, 1000);
    },

    /**
     * Ferma il countdown del match alert
     */
    stopMatchAlert() {
        if (this._matchAlertInterval) {
            clearInterval(this._matchAlertInterval);
            this._matchAlertInterval = null;
        }
    },

    /**
     * Toggle stato minimizzato del match alert
     */
    toggleMatchAlertMinimized(minimized) {
        this._matchAlertMinimized = minimized;

        try {
            localStorage.setItem('match_alert_minimized', minimized ? 'true' : 'false');
        } catch (e) { }

        const expandedEl = document.getElementById('match-alert-expanded');
        const minimizedEl = document.getElementById('match-alert-minimized');

        if (minimized) {
            expandedEl?.classList.add('hidden');
            minimizedEl?.classList.remove('hidden');
        } else {
            expandedEl?.classList.remove('hidden');
            minimizedEl?.classList.add('hidden');
        }
    },

    /**
     * Ripristina stato minimizzato dal localStorage (default: minimizzato)
     */
    restoreMatchAlertMinimizedState() {
        try {
            const saved = localStorage.getItem('match_alert_minimized');
            // Default: minimizzato (true) se non c'è valore salvato
            this._matchAlertMinimized = saved !== 'false';

            if (this._matchAlertMinimized) {
                const expandedEl = document.getElementById('match-alert-expanded');
                const minimizedEl = document.getElementById('match-alert-minimized');
                expandedEl?.classList.add('hidden');
                minimizedEl?.classList.remove('hidden');
            }
        } catch (e) { }
    },

    // ====================================================================
    // BUTTON ALERTS - Formazione migliorabile, Contratti in scadenza
    // ====================================================================

    /**
     * Aggiorna gli alert sui bottoni della dashboard
     * - Formazione: se esiste una formazione migliore disponibile
     * - Rosa: se ci sono contratti in scadenza
     */
    updateButtonAlerts() {
        const currentTeamData = window.InterfacciaCore?.currentTeamData;
        if (!currentTeamData) return;

        // Alert Formazione Migliorabile
        this.updateFormationAlert(currentTeamData);

        // Alert Contratti in Scadenza
        this.updateContractsAlert(currentTeamData);
    },

    /**
     * Aggiorna l'alert sul bottone Gestione Formazione
     * @param {Object} teamData - Dati della squadra
     */
    updateFormationAlert(teamData) {
        const btnFormazione = document.getElementById('btn-gestione-formazione');
        if (!btnFormazione) return;

        // Rimuovi alert esistente
        const existingAlert = btnFormazione.querySelector('.formation-alert-badge');
        if (existingAlert) existingAlert.remove();

        // Verifica se la formazione puo' essere migliorata
        if (!window.FeatureFlags?.isEnabled('autoFormation')) return;

        try {
            const canImprove = window.GestioneSquadreFormazione?.canImproveFormation(teamData);
            if (canImprove) {
                const alertBadge = document.createElement('span');
                alertBadge.className = 'formation-alert-badge absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black animate-pulse';
                alertBadge.textContent = '!';
                alertBadge.title = 'Formazione migliorabile disponibile';

                // Assicurati che il bottone sia posizionato relativamente
                btnFormazione.style.position = 'relative';
                btnFormazione.appendChild(alertBadge);
            }
        } catch (error) {
            console.warn('[Dashboard] Errore nel calcolo formazione ottimale:', error);
        }
    },

    /**
     * Aggiorna l'alert sul bottone Gestione Rosa per contratti in scadenza
     * @param {Object} teamData - Dati della squadra
     */
    updateContractsAlert(teamData) {
        const btnRosa = document.getElementById('btn-gestione-rosa');
        if (!btnRosa) return;

        // Rimuovi alert esistente
        const existingAlert = btnRosa.querySelector('.contracts-alert-badge');
        if (existingAlert) existingAlert.remove();

        // Verifica se i contratti sono abilitati
        if (!window.Contracts?.isEnabled()) return;

        // Conta i contratti in scadenza (valore 0 o timer attivo)
        const players = teamData.players || [];
        const expiringContracts = players.filter(p => {
            // Escludi Icone e giocatori base gratuiti
            const isIcona = p.abilities && p.abilities.includes('Icona');
            const isBasePlayer = (p.level || p.currentLevel || 1) === 1 && (p.cost === 0 || !p.cost);
            if (isIcona || isBasePlayer) return false;

            // Verifica se contratto e' in scadenza (0 o ha timer attivo)
            const contract = p.contract ?? p.contractYears ?? 1;
            return contract === 0 || p.contractExpireTimer || p.contractExpiryTimer;
        });

        if (expiringContracts.length > 0) {
            const alertBadge = document.createElement('span');
            alertBadge.className = 'contracts-alert-badge absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse';
            alertBadge.textContent = expiringContracts.length;
            alertBadge.title = `${expiringContracts.length} contratt${expiringContracts.length === 1 ? 'o' : 'i'} in scadenza`;

            // Assicurati che il bottone sia posizionato relativamente
            btnRosa.style.position = 'relative';
            btnRosa.appendChild(alertBadge);
        }
    }
};

console.log("✅ Modulo interfaccia-dashboard.js caricato.");
