//
// ====================================================================
// NEXT-MATCH-ALERT.JS - Floating Alert Prossima Partita
// ====================================================================
// Mostra un alert flottante in alto a sinistra con:
// - Prossima partita della squadra (campionato/coppa)
// - Timer countdown fino alle 20:30 del prossimo giorno di gioco
// - Possibilita' di minimizzare/espandere
// ====================================================================
//

window.NextMatchAlert = {

    // Elemento DOM dell'alert
    _alertElement: null,
    _countdownInterval: null,
    _isMinimized: false,

    // Stato per il drag
    _isDragging: false,
    _hasMoved: false,
    _dragStartX: 0,
    _dragStartY: 0,
    _alertStartX: 0,
    _alertStartY: 0,

    /**
     * Inizializza il floating alert
     */
    async init() {
        // Rimuovi alert esistente se presente
        this.destroy();

        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (!currentTeamId) return;

        // Carica la prossima partita
        const nextMatch = await this.getNextMatch(currentTeamId);
        if (!nextMatch) return;

        // Carica stato automazione per il timer
        const automationState = await this.getAutomationState();

        // Crea l'alert
        this.createAlertElement(nextMatch, automationState);

        // Avvia countdown
        this.startCountdown(automationState);
    },

    /**
     * Calcola la media livello di una squadra
     */
    async getTeamAverageLevel(teamId) {
        try {
            const { doc, getDoc, appId } = window.firestoreTools;
            const db = window.db;
            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
            const teamDoc = await getDoc(teamRef);
            if (teamDoc.exists()) {
                const players = teamDoc.data().players || [];
                if (players.length > 0) {
                    const total = players.reduce((sum, p) => sum + (p.currentLevel || p.level || 1), 0);
                    return (total / players.length).toFixed(1);
                }
            }
        } catch (e) {
            console.error('[NextMatchAlert] Errore calcolo media:', e);
        }
        return '-';
    },

    /**
     * Ottiene il nome di una squadra dal suo ID
     */
    getTeamNameById(teamId) {
        // Prova prima da allTeamsData
        const allTeams = window.InterfacciaCore?.allTeamsData;
        if (allTeams) {
            const team = allTeams.find(t => t.id === teamId);
            if (team?.name) return team.name;
        }
        // Fallback: prova dalla classifica
        const leaderboard = window.InterfacciaCore?.currentLeaderboard;
        if (leaderboard) {
            const entry = leaderboard.find(e => e.teamId === teamId);
            if (entry?.teamName) return entry.teamName;
        }
        return null;
    },

    /**
     * Ottiene la prossima partita della squadra (campionato o coppa)
     * Rispetta l'ordine di simulazione dell'automazione
     */
    async getNextMatch(teamId) {
        const { doc, getDoc, appId } = window.firestoreTools;
        const db = window.db;

        // Carica lo stato dell'automazione per sapere quale competizione viene simulata prima
        const automationState = await this.getAutomationState();
        const nextSimType = automationState?.nextSimulationType || 'campionato';
        const isCoppaNext = nextSimType.includes('coppa');

        // Funzione per caricare partita campionato
        const getChampionshipMatch = async () => {
            try {
                const schedulePath = `artifacts/${appId}/public/data/schedule/full_schedule`;
                const scheduleRef = doc(db, schedulePath);
                const scheduleDoc = await getDoc(scheduleRef);

                if (scheduleDoc.exists()) {
                    const schedule = scheduleDoc.data().matches || [];
                    for (const round of schedule) {
                        if (!round.matches) continue;
                        const match = round.matches.find(m =>
                            m.result === null && (m.homeId === teamId || m.awayId === teamId)
                        );
                        if (match) {
                            const homeAvg = await this.getTeamAverageLevel(match.homeId);
                            const awayAvg = await this.getTeamAverageLevel(match.awayId);
                            // Ottieni nomi squadre con fallback robusti
                            const homeName = match.homeName || this.getTeamNameById(match.homeId) || 'Squadra A';
                            const awayName = match.awayName || this.getTeamNameById(match.awayId) || 'Squadra B';
                            return {
                                type: 'campionato',
                                round: round.round || `Giornata ${schedule.indexOf(round) + 1}`,
                                homeName,
                                awayName,
                                homeId: match.homeId,
                                awayId: match.awayId,
                                isHome: match.homeId === teamId,
                                homeAvg,
                                awayAvg
                            };
                        }
                    }
                }
            } catch (error) {
                console.error('[NextMatchAlert] Errore caricamento campionato:', error);
            }
            return null;
        };

        // Funzione per caricare partita coppa
        const getCupMatch = async () => {
            try {
                const bracket = await window.CoppaSchedule?.loadCupSchedule();
                if (bracket) {
                    const teamMatches = window.CoppaSchedule.getTeamMatches(bracket, teamId);
                    const nextCupMatch = teamMatches.find(m => !m.winner);
                    if (nextCupMatch && nextCupMatch.homeTeam && nextCupMatch.awayTeam) {
                        const homeAvg = await this.getTeamAverageLevel(nextCupMatch.homeTeam.teamId);
                        const awayAvg = await this.getTeamAverageLevel(nextCupMatch.awayTeam.teamId);
                        // Ottieni nomi squadre con fallback robusti
                        const homeName = nextCupMatch.homeTeam.teamName
                            || nextCupMatch.homeTeam.name
                            || this.getTeamNameById(nextCupMatch.homeTeam.teamId)
                            || 'Squadra A';
                        const awayName = nextCupMatch.awayTeam.teamName
                            || nextCupMatch.awayTeam.name
                            || this.getTeamNameById(nextCupMatch.awayTeam.teamId)
                            || 'Squadra B';
                        return {
                            type: 'coppa',
                            round: nextCupMatch.roundName || 'Turno Coppa',
                            homeName,
                            awayName,
                            homeId: nextCupMatch.homeTeam.teamId,
                            awayId: nextCupMatch.awayTeam.teamId,
                            isHome: nextCupMatch.homeTeam.teamId === teamId,
                            homeAvg,
                            awayAvg
                        };
                    }
                }
            } catch (error) {
                console.error('[NextMatchAlert] Errore caricamento coppa:', error);
            }
            return null;
        };

        // Rispetta l'ordine dell'automazione: se la prossima simulazione e' coppa, mostra coppa prima
        if (isCoppaNext) {
            const cupMatch = await getCupMatch();
            if (cupMatch) return cupMatch;
            // Fallback a campionato se non c'e' partita di coppa
            return await getChampionshipMatch();
        } else {
            const champMatch = await getChampionshipMatch();
            if (champMatch) return champMatch;
            // Fallback a coppa se non c'e' partita di campionato
            return await getCupMatch();
        }
    },

    /**
     * Ottiene lo stato dell'automazione
     */
    async getAutomationState() {
        try {
            if (window.AutomazioneSimulazioni) {
                return await window.AutomazioneSimulazioni.loadAutomationState();
            }
        } catch (error) {
            console.error('[NextMatchAlert] Errore caricamento automazione:', error);
        }
        return { isEnabled: false };
    },

    /**
     * Calcola il prossimo orario di simulazione (20:30)
     */
    getNextSimulationTime() {
        const now = new Date();
        const next = new Date();

        // Imposta alle 20:30
        next.setHours(20, 30, 0, 0);

        // Se siamo gia' passati le 20:30 di oggi, vai a domani
        if (now >= next) {
            next.setDate(next.getDate() + 1);
        }

        return next;
    },

    /**
     * Formatta il countdown
     */
    formatCountdown(ms) {
        if (ms <= 0) return 'In corso...';

        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    /**
     * Ottiene URL logo squadra
     */
    getTeamLogoUrl(teamId) {
        return window.InterfacciaCore?.teamLogosMap?.[teamId] ||
               window.InterfacciaConstants?.DEFAULT_LOGO_URL ||
               'https://placehold.co/32x32/374151/9ca3af?text=?';
    },

    /**
     * Crea l'elemento DOM dell'alert
     */
    createAlertElement(nextMatch, automationState) {
        const alert = document.createElement('div');
        alert.id = 'next-match-floating-alert';
        alert.className = 'fixed z-40';

        // Carica posizione salvata o usa default
        const savedPos = this.loadSavedPosition();
        alert.style.top = savedPos.top;
        alert.style.left = savedPos.left;
        alert.style.right = savedPos.right;
        alert.style.bottom = savedPos.bottom;

        // Colori e icone per tipo competizione
        let typeColor, typeIcon, typeName;
        if (nextMatch.type === 'campionato') {
            typeColor = 'green';
            typeIcon = '🏆';
            typeName = 'Campionato';
        } else if (nextMatch.type === 'supercoppa') {
            typeColor = 'yellow';
            typeIcon = '⭐';
            typeName = 'Supercoppa';
        } else {
            typeColor = 'purple';
            typeIcon = '🏅';
            typeName = 'Coppa';
        }

        // URL loghi squadre
        const homeLogoUrl = this.getTeamLogoUrl(nextMatch.homeId);
        const awayLogoUrl = this.getTeamLogoUrl(nextMatch.awayId);

        alert.innerHTML = `
            <div class="bg-gray-900 rounded-lg border-2 border-${typeColor}-500 shadow-xl overflow-hidden max-w-xs">
                <!-- Header sempre visibile - trascinabile -->
                <div class="bg-gradient-to-r from-${typeColor}-800 to-${typeColor}-700 px-3 py-1.5 flex items-center justify-between cursor-move select-none" id="next-match-header">
                    <span id="next-match-header-text" class="text-white font-bold text-sm flex items-center gap-1">
                        <span class="drag-handle opacity-50 mr-1">⋮⋮</span>
                        ${typeIcon} <span class="header-label">Prossima Partita</span>
                    </span>
                    <button id="next-match-toggle" class="text-white hover:text-gray-300 transition text-lg leading-none ml-2 cursor-pointer">
                        <span class="toggle-icon">−</span>
                    </button>
                </div>
                <!-- Contenuto collassabile -->
                <div id="next-match-content" class="p-2">
                    <p class="text-${typeColor}-400 text-xs mb-2 text-center">${typeName} - ${nextMatch.round}</p>
                    <!-- Squadre con loghi e media -->
                    <div class="flex items-center justify-center gap-4 mb-2">
                        <div class="flex flex-col items-center">
                            <img src="${homeLogoUrl}" alt="${nextMatch.homeName}" class="w-10 h-10 rounded-full border-2 border-gray-600 object-cover mb-1" loading="lazy" decoding="async">
                            <span class="text-white text-xs font-bold truncate max-w-16 ${nextMatch.isHome ? 'text-yellow-400' : ''}">${nextMatch.homeName}</span>
                            <span class="text-gray-400 text-[10px] font-semibold">Lv.${nextMatch.homeAvg || '-'}</span>
                        </div>
                        <span class="text-gray-500 text-sm font-bold">vs</span>
                        <div class="flex flex-col items-center">
                            <img src="${awayLogoUrl}" alt="${nextMatch.awayName}" class="w-10 h-10 rounded-full border-2 border-gray-600 object-cover mb-1" loading="lazy" decoding="async">
                            <span class="text-white text-xs font-bold truncate max-w-16 ${!nextMatch.isHome ? 'text-yellow-400' : ''}">${nextMatch.awayName}</span>
                            <span class="text-gray-400 text-[10px] font-semibold">Lv.${nextMatch.awayAvg || '-'}</span>
                        </div>
                    </div>
                    ${automationState?.isEnabled ? `
                        <div class="text-center">
                            <span class="text-gray-500 text-[8px]">Prossima sim: ${automationState.nextSimulationType || 'campionato'} - 20:30</span>
                            <span id="next-match-countdown" class="text-${typeColor}-400 font-mono font-bold text-[10px] ml-1">--:--:--</span>
                        </div>
                    ` : `
                        <div class="text-center">
                            <span class="text-gray-500 text-[8px]">Automazione non attiva</span>
                        </div>
                    `}
                    <!-- Bottone Schedina (visibile solo se flag attivo) -->
                    <div id="next-match-schedina-btn-container" class="mt-2 hidden">
                        <button id="next-match-schedina-btn" class="w-full py-1.5 bg-green-600 hover:bg-green-500 rounded text-white text-xs font-bold flex items-center justify-center gap-1 transition">
                            <span>🎯</span> Compila Schedina
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Salva icona per uso in toggleMinimize
        this._typeIcon = typeIcon;

        document.body.appendChild(alert);
        this._alertElement = alert;

        // Event listener per drag e toggle
        const header = document.getElementById('next-match-header');
        const toggleBtn = document.getElementById('next-match-toggle');

        if (header) {
            // Drag events (mouse)
            header.addEventListener('mousedown', (e) => this.handleDragStart(e));

            // Drag events (touch)
            header.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
        }

        // Toggle button click (non propagare drag)
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMinimize();
            });
        }

        // Document-level listeners per drag
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleDragEnd(e));

        // Bottone Schedina - mostra se flag attivo
        this.updateSchedinaButton();

        // Event listener per bottone schedina
        const schedinaBtn = document.getElementById('next-match-schedina-btn');
        if (schedinaBtn) {
            schedinaBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita toggle del pannello
                if (window.SchedinaUI) {
                    window.SchedinaUI.open();
                } else {
                    window.Toast?.warning('Schedina non disponibile');
                }
            });
        }

        // Minimizza sempre di default (si apre solo con click)
        // Reset _isMinimized a false prima di chiamare toggleMinimize per assicurare che sia minimizzato
        this._isMinimized = false;
        this.toggleMinimize();
    },

    /**
     * Aggiorna visibilita' bottone schedina
     */
    updateSchedinaButton() {
        const container = document.getElementById('next-match-schedina-btn-container');
        if (!container) return;

        const isSchedinaEnabled = window.FeatureFlags?.isEnabled('schedina');
        if (isSchedinaEnabled) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    },

    /**
     * Toggle minimizza/espandi
     */
    toggleMinimize() {
        const content = document.getElementById('next-match-content');
        const toggleIcon = document.querySelector('#next-match-toggle .toggle-icon');
        const toggleBtn = document.getElementById('next-match-toggle');
        const headerLabel = document.querySelector('#next-match-header-text .header-label');
        const header = document.getElementById('next-match-header');
        const headerText = document.getElementById('next-match-header-text');
        const dragHandle = header?.querySelector('.drag-handle');
        const alertContainer = this._alertElement?.querySelector('.bg-gray-900');

        if (!content) return;

        this._isMinimized = !this._isMinimized;

        if (this._isMinimized) {
            content.classList.add('hidden');
            if (toggleIcon) toggleIcon.textContent = '+';
            // Nascondi label e drag handle
            if (headerLabel) headerLabel.classList.add('hidden');
            if (dragHandle) dragHandle.classList.add('hidden');
            // Riduci padding header per renderlo compatto come menu hamburger
            if (header) {
                header.classList.remove('px-3', 'py-1.5');
                header.classList.add('p-0.5');
            }
            if (headerText) {
                headerText.classList.remove('text-sm');
                headerText.classList.add('text-[11px]');
            }
            // Nascondi bottone toggle, usa header intero come click
            if (toggleBtn) toggleBtn.classList.add('hidden');
            // Riduci dimensioni container
            if (alertContainer) {
                alertContainer.classList.remove('max-w-xs');
                alertContainer.classList.add('w-5', 'h-5');
            }
        } else {
            content.classList.remove('hidden');
            if (toggleIcon) toggleIcon.textContent = '−';
            // Mostra label e drag handle
            if (headerLabel) headerLabel.classList.remove('hidden');
            if (dragHandle) dragHandle.classList.remove('hidden');
            // Ripristina padding header
            if (header) {
                header.classList.add('px-3', 'py-1.5');
                header.classList.remove('p-0.5');
            }
            if (headerText) {
                headerText.classList.add('text-sm');
                headerText.classList.remove('text-[11px]');
            }
            // Mostra bottone toggle
            if (toggleBtn) toggleBtn.classList.remove('hidden');
            // Ripristina dimensioni container
            if (alertContainer) {
                alertContainer.classList.add('max-w-xs');
                alertContainer.classList.remove('w-5', 'h-5');
            }
        }

        // Salva stato in localStorage
        localStorage.setItem('fanta_next_match_minimized', this._isMinimized.toString());
    },

    /**
     * Carica posizione salvata da localStorage
     */
    loadSavedPosition() {
        try {
            const saved = localStorage.getItem('fanta_next_match_position');
            if (saved) {
                const pos = JSON.parse(saved);
                return {
                    top: pos.top || 'auto',
                    left: pos.left || 'auto',
                    right: pos.right || 'auto',
                    bottom: pos.bottom || 'auto'
                };
            }
        } catch (e) {
            console.error('[NextMatchAlert] Errore caricamento posizione:', e);
        }
        // Default: in alto a sinistra
        return { top: '64px', left: '16px', right: 'auto', bottom: 'auto' };
    },

    /**
     * Salva posizione in localStorage
     */
    savePosition() {
        if (!this._alertElement) return;
        const style = this._alertElement.style;
        const pos = {
            top: style.top,
            left: style.left,
            right: style.right,
            bottom: style.bottom
        };
        localStorage.setItem('fanta_next_match_position', JSON.stringify(pos));
    },

    /**
     * Gestisce inizio drag
     */
    handleDragStart(e) {
        // Non iniziare drag se click su bottone toggle
        if (e.target.closest('#next-match-toggle')) return;

        this._isDragging = true;
        this._hasMoved = false;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this._dragStartX = clientX;
        this._dragStartY = clientY;

        if (this._alertElement) {
            const rect = this._alertElement.getBoundingClientRect();
            this._alertStartX = rect.left;
            this._alertStartY = rect.top;
        }

        if (e.touches) {
            e.preventDefault();
        }
    },

    /**
     * Gestisce movimento drag
     */
    handleDragMove(e) {
        if (!this._isDragging || !this._alertElement) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - this._dragStartX;
        const deltaY = clientY - this._dragStartY;

        // Considera come movimento solo se spostamento > 5px
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            this._hasMoved = true;
        }

        const newX = this._alertStartX + deltaX;
        const newY = this._alertStartY + deltaY;

        // Limita ai margini dello schermo
        const rect = this._alertElement.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 8;
        const maxY = window.innerHeight - rect.height - 8;

        const finalX = Math.max(8, Math.min(newX, maxX));
        const finalY = Math.max(8, Math.min(newY, maxY));

        // Applica posizione
        this._alertElement.style.left = `${finalX}px`;
        this._alertElement.style.top = `${finalY}px`;
        this._alertElement.style.right = 'auto';
        this._alertElement.style.bottom = 'auto';

        if (e.touches) {
            e.preventDefault();
        }
    },

    /**
     * Gestisce fine drag
     */
    handleDragEnd(e) {
        if (!this._isDragging) return;

        this._isDragging = false;

        // Se non si e' mosso, e' un click per toggle
        if (!this._hasMoved) {
            // Non fare toggle se click su bottone
            if (!e.target?.closest('#next-match-toggle')) {
                this.toggleMinimize();
            }
        } else {
            // Salva nuova posizione
            this.savePosition();
        }
    },

    /**
     * Avvia il countdown
     */
    startCountdown(automationState) {
        if (!automationState?.isEnabled) return;

        const updateCountdown = () => {
            const countdownEl = document.getElementById('next-match-countdown');
            if (!countdownEl) {
                this.stopCountdown();
                return;
            }

            const nextTime = this.getNextSimulationTime();
            const now = new Date();
            const diff = nextTime - now;

            countdownEl.textContent = this.formatCountdown(diff);
        };

        // Aggiorna subito
        updateCountdown();

        // Poi ogni secondo
        this._countdownInterval = setInterval(updateCountdown, 1000);
    },

    /**
     * Ferma il countdown
     */
    stopCountdown() {
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
    },

    /**
     * Distrugge l'alert
     */
    destroy() {
        this.stopCountdown();
        if (this._alertElement) {
            this._alertElement.remove();
            this._alertElement = null;
        }
        // Rimuovi anche per ID nel caso
        const existing = document.getElementById('next-match-floating-alert');
        if (existing) existing.remove();
    },

    /**
     * Aggiorna l'alert (ricarica dati)
     */
    async refresh() {
        await this.init();
    }
};

// Ascolta cambio flag schedina per aggiornare bottone
document.addEventListener('featureFlagChanged', (e) => {
    if (e.detail?.flagId === 'schedina') {
        window.NextMatchAlert.updateSchedinaButton();
    }
});

console.log('[NextMatchAlert] Modulo caricato');
