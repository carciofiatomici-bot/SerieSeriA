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
     * Ottiene la prossima partita della squadra (campionato o coppa)
     */
    async getNextMatch(teamId) {
        const { doc, getDoc, appId } = window.firestoreTools;
        const db = window.db;

        // Prima controlla il campionato
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
                        // Carica medie rosa
                        const homeAvg = await this.getTeamAverageLevel(match.homeId);
                        const awayAvg = await this.getTeamAverageLevel(match.awayId);
                        return {
                            type: 'campionato',
                            round: round.round,
                            homeName: match.homeName,
                            awayName: match.awayName,
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

        // Poi controlla la coppa
        try {
            const bracket = await window.CoppaSchedule?.loadCupSchedule();
            if (bracket) {
                const teamMatches = window.CoppaSchedule.getTeamMatches(bracket, teamId);
                const nextCupMatch = teamMatches.find(m => !m.winner);
                if (nextCupMatch && nextCupMatch.homeTeam && nextCupMatch.awayTeam) {
                    // Carica medie rosa
                    const homeAvg = await this.getTeamAverageLevel(nextCupMatch.homeTeam.teamId);
                    const awayAvg = await this.getTeamAverageLevel(nextCupMatch.awayTeam.teamId);
                    return {
                        type: 'coppa',
                        round: nextCupMatch.roundName || 'Turno',
                        homeName: nextCupMatch.homeTeam.name,
                        awayName: nextCupMatch.awayTeam.name,
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
        alert.className = 'fixed top-16 left-4 z-40 transition-all duration-300';

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
                <!-- Header sempre visibile -->
                <div class="bg-gradient-to-r from-${typeColor}-800 to-${typeColor}-700 px-3 py-1.5 flex items-center justify-between cursor-pointer" id="next-match-header">
                    <span id="next-match-header-text" class="text-white font-bold text-sm flex items-center gap-1">
                        ${typeIcon} <span class="header-label">Prossima Partita</span>
                    </span>
                    <button id="next-match-toggle" class="text-white hover:text-gray-300 transition text-lg leading-none ml-2">
                        <span class="toggle-icon">−</span>
                    </button>
                </div>
                <!-- Contenuto collassabile -->
                <div id="next-match-content" class="p-2">
                    <p class="text-${typeColor}-400 text-xs mb-1">${typeName} - ${nextMatch.round}</p>
                    <!-- Squadre con loghi e media -->
                    <div class="flex items-center justify-center gap-3 mb-1">
                        <div class="flex flex-col items-center">
                            <img src="${homeLogoUrl}" alt="${nextMatch.homeName}" class="w-7 h-7 rounded-full border border-gray-600 object-cover">
                            <span class="text-white text-[10px] font-semibold truncate max-w-14 ${nextMatch.isHome ? 'text-yellow-400' : ''}">${nextMatch.homeName}</span>
                            <span class="text-gray-500 text-[8px]">Lv.${nextMatch.homeAvg || '-'}</span>
                        </div>
                        <span class="text-gray-500 text-xs font-bold">vs</span>
                        <div class="flex flex-col items-center">
                            <img src="${awayLogoUrl}" alt="${nextMatch.awayName}" class="w-7 h-7 rounded-full border border-gray-600 object-cover">
                            <span class="text-white text-[10px] font-semibold truncate max-w-14 ${!nextMatch.isHome ? 'text-yellow-400' : ''}">${nextMatch.awayName}</span>
                            <span class="text-gray-500 text-[8px]">Lv.${nextMatch.awayAvg || '-'}</span>
                        </div>
                    </div>
                    ${automationState?.isEnabled ? `
                        <div class="bg-black bg-opacity-30 rounded-sm px-1.5 py-0.5 text-center inline-flex items-center gap-1 w-full justify-center">
                            <span class="text-gray-500 text-[9px]">20:30</span>
                            <span id="next-match-countdown" class="text-${typeColor}-400 font-mono font-bold text-xs">--:--:--</span>
                        </div>
                    ` : `
                        <div class="bg-black bg-opacity-30 rounded-sm px-1.5 py-0.5 text-center">
                            <span class="text-gray-500 text-[9px]">Automazione non attiva</span>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Salva icona per uso in toggleMinimize
        this._typeIcon = typeIcon;

        document.body.appendChild(alert);
        this._alertElement = alert;

        // Event listener per toggle
        const header = document.getElementById('next-match-header');
        const toggleBtn = document.getElementById('next-match-toggle');

        if (header) {
            header.addEventListener('click', () => this.toggleMinimize());
        }

        // Carica stato minimizzato da localStorage
        const savedState = localStorage.getItem('fanta_next_match_minimized');
        if (savedState === 'true') {
            this.toggleMinimize();
        }
    },

    /**
     * Toggle minimizza/espandi
     */
    toggleMinimize() {
        const content = document.getElementById('next-match-content');
        const toggleIcon = document.querySelector('#next-match-toggle .toggle-icon');
        const headerLabel = document.querySelector('#next-match-header-text .header-label');

        if (!content) return;

        this._isMinimized = !this._isMinimized;

        if (this._isMinimized) {
            content.classList.add('hidden');
            if (toggleIcon) toggleIcon.textContent = '+';
            // Nascondi label, mostra solo emoji
            if (headerLabel) headerLabel.classList.add('hidden');
        } else {
            content.classList.remove('hidden');
            if (toggleIcon) toggleIcon.textContent = '−';
            // Mostra label
            if (headerLabel) headerLabel.classList.remove('hidden');
        }

        // Salva stato in localStorage
        localStorage.setItem('fanta_next_match_minimized', this._isMinimized.toString());
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

console.log('[NextMatchAlert] Modulo caricato');
