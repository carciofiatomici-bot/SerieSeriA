//
// ====================================================================
// NEXT-MATCH-ALERT.JS - Box Prossima Partita Inline Espandibile
// ====================================================================
// Mostra un box espandibile nel sponsor-media-box con:
// - Prossima partita della squadra (campionato/coppa)
// - Timer countdown fino alle 20:30 del prossimo giorno di gioco
// - Click per espandere/collassare i dettagli
// ====================================================================
//

window.NextMatchAlert = {

    // Stato
    _countdownInterval: null,
    _isExpanded: false,
    _currentMatch: null,

    /**
     * Inizializza il box inline
     */
    async init() {
        this.destroy();

        const currentTeamId = window.InterfacciaCore?.currentTeamId;
        if (!currentTeamId) return;

        const container = document.getElementById('next-match-inline-box');
        const contentContainer = document.getElementById('next-match-content');
        if (!container) return;

        // Carica la prossima partita
        const nextMatch = await this.getNextMatch(currentTeamId);
        if (!nextMatch) {
            // Mostra messaggio "nessuna partita" nel content container
            if (contentContainer) {
                contentContainer.innerHTML = `
                    <div class="text-center py-4">
                        <p class="text-gray-500 text-sm">Nessuna partita in programma</p>
                        <p class="text-gray-600 text-xs mt-1">Iscriviti a SerieSeriA o CoppaSeriA</p>
                    </div>
                `;
            }
            return;
        }

        this._currentMatch = nextMatch;

        // Carica stato automazione per il timer
        const automationState = await this.getAutomationState();

        // Crea il contenuto inline
        this.createInlineContent(container, nextMatch, automationState);

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
        const allTeams = window.InterfacciaCore?.allTeamsData;
        if (allTeams) {
            const team = allTeams.find(t => t.id === teamId);
            if (team?.name) return team.name;
        }
        const leaderboard = window.InterfacciaCore?.currentLeaderboard;
        if (leaderboard) {
            const entry = leaderboard.find(e => e.teamId === teamId);
            if (entry?.teamName) return entry.teamName;
        }
        return null;
    },

    /**
     * Ottiene la prossima partita della squadra (campionato o coppa)
     * Usa la stessa logica di findNextValidSimulation per determinare
     * quale competizione verra' effettivamente simulata
     */
    async getNextMatch(teamId) {
        const { doc, getDoc, appId } = window.firestoreTools;
        const db = window.db;

        const automationState = await this.getAutomationState();

        // Usa findNextValidSimulation per determinare cosa verra' REALMENTE simulato
        // invece di basarsi solo su nextSimulationType
        let actualNextType = automationState?.nextSimulationType || 'campionato';
        if (window.AutomazioneSimulazioni?.findNextValidSimulation) {
            const validType = await window.AutomazioneSimulazioni.findNextValidSimulation(actualNextType);
            if (validType) {
                actualNextType = validType;
            }
        }
        const isCoppaNext = actualNextType.includes('coppa');

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

        const getCupMatch = async () => {
            try {
                const bracket = await window.CoppaSchedule?.loadCupSchedule();
                if (bracket) {
                    const teamMatches = window.CoppaSchedule.getTeamMatches(bracket, teamId);
                    const nextCupMatch = teamMatches.find(m => !m.winner);
                    if (nextCupMatch && nextCupMatch.homeTeam && nextCupMatch.awayTeam) {
                        const homeAvg = await this.getTeamAverageLevel(nextCupMatch.homeTeam.teamId);
                        const awayAvg = await this.getTeamAverageLevel(nextCupMatch.awayTeam.teamId);
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

        if (isCoppaNext) {
            const cupMatch = await getCupMatch();
            if (cupMatch) return cupMatch;
            return await getChampionshipMatch();
        } else {
            const champMatch = await getChampionshipMatch();
            if (champMatch) return champMatch;
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
     * Calcola il prossimo orario di simulazione (12:00 o 20:30)
     */
    getNextSimulationTime() {
        // Usa il sistema centralizzato se disponibile
        if (window.AutomazioneSimulazioni?.getTimeUntilNextSimulation) {
            const result = window.AutomazioneSimulazioni.getTimeUntilNextSimulation();
            return result.nextTime;
        }

        // Fallback: orari hardcoded
        const SIMULATION_TIMES = [
            { hour: 12, minute: 0 },
            { hour: 20, minute: 30 }
        ];

        const now = new Date();
        let nextTarget = null;

        for (const time of SIMULATION_TIMES) {
            const target = new Date();
            target.setHours(time.hour, time.minute, 0, 0);
            if (now < target) {
                if (!nextTarget || target < nextTarget) {
                    nextTarget = target;
                }
            }
        }

        if (!nextTarget) {
            nextTarget = new Date();
            nextTarget.setDate(nextTarget.getDate() + 1);
            nextTarget.setHours(12, 0, 0, 0);
        }

        return nextTarget;
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
     * Crea il contenuto inline nel container (versione espansa diretta)
     */
    createInlineContent(container, nextMatch, automationState) {
        // Colori, icone e nomi per tipo competizione
        let typeColor, typeIcon, typeName;
        if (nextMatch.type === 'campionato') {
            typeColor = 'green';
            typeIcon = '🏆';
            typeName = 'SerieSeriA';
        } else if (nextMatch.type === 'supercoppa') {
            typeColor = 'yellow';
            typeIcon = '⭐';
            typeName = 'SuperCoppa';
        } else {
            typeColor = 'purple';
            typeIcon = '🏅';
            typeName = 'CoppaSeriA';
        }

        // URL loghi squadre
        const homeLogoUrl = this.getTeamLogoUrl(nextMatch.homeId);
        const awayLogoUrl = this.getTeamLogoUrl(nextMatch.awayId);

        // Trova il container next-match-content (dentro next-match-inline-box)
        const contentContainer = document.getElementById('next-match-content') || container;

        contentContainer.innerHTML = `
            <!-- Badge Competizione -->
            <div class="flex items-center justify-center gap-2 mb-4">
                <span class="text-2xl">${typeIcon}</span>
                <span class="text-base sm:text-lg font-bold text-${typeColor}-400">${typeName}</span>
                ${nextMatch.round ? `<span class="text-sm text-gray-400">- ${nextMatch.round}</span>` : ''}
            </div>

            <!-- Squadre VS -->
            <div class="flex items-center justify-between px-2 sm:px-4">
                <!-- Squadra Casa -->
                <div class="flex flex-col items-center flex-1">
                    <img src="${homeLogoUrl}" alt="${nextMatch.homeName}"
                         class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 ${nextMatch.isHome ? 'border-yellow-400 shadow-yellow-400/30' : 'border-gray-600'} object-cover shadow-lg"
                         loading="lazy" decoding="async">
                    <span class="text-sm sm:text-base font-bold mt-2 max-w-[100px] sm:max-w-[120px] truncate text-center ${nextMatch.isHome ? 'text-yellow-400' : 'text-white'}">${nextMatch.homeName}</span>
                    <span class="text-xs text-gray-400 mt-0.5">Lv. ${nextMatch.homeAvg}</span>
                </div>

                <!-- VS -->
                <div class="flex flex-col items-center px-3">
                    <span class="text-2xl sm:text-3xl font-black text-gray-500">VS</span>
                </div>

                <!-- Squadra Trasferta -->
                <div class="flex flex-col items-center flex-1">
                    <img src="${awayLogoUrl}" alt="${nextMatch.awayName}"
                         class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 ${!nextMatch.isHome ? 'border-yellow-400 shadow-yellow-400/30' : 'border-gray-600'} object-cover shadow-lg"
                         loading="lazy" decoding="async">
                    <span class="text-sm sm:text-base font-bold mt-2 max-w-[100px] sm:max-w-[120px] truncate text-center ${!nextMatch.isHome ? 'text-yellow-400' : 'text-white'}">${nextMatch.awayName}</span>
                    <span class="text-xs text-gray-400 mt-0.5">Lv. ${nextMatch.awayAvg}</span>
                </div>
            </div>

            <!-- Countdown -->
            ${automationState?.isEnabled ? `
                <div class="mt-2 pt-2 border-t border-cyan-500/30 flex flex-col items-center">
                    <p class="text-[10px] sm:text-xs text-gray-400">Prossima simulazione tra</p>
                    <p id="next-match-countdown" class="text-lg sm:text-xl font-bold text-white countdown-title">--:--:--</p>
                </div>
            ` : `
                <div class="mt-2 pt-2 border-t border-gray-700/50 flex flex-col items-center">
                    <p class="text-xs text-gray-500">Simulazione automatica disattivata</p>
                </div>
            `}
        `;

        // Bind eventi (semplificato - niente toggle)
        this.bindEvents(container);

        // Aggiorna bottone schedina (se esiste)
        this.updateSchedinaButton();
    },

    /**
     * Collega gli eventi
     */
    bindEvents(container) {
        // Bottone schedina (nel box schedina-box separato)
        const schedinaBtn = document.getElementById('next-match-schedina-btn');
        if (schedinaBtn) {
            schedinaBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.SchedinaUI?.open) {
                    window.SchedinaUI.open();
                } else if (window.SchedinaUI?.openModal) {
                    window.SchedinaUI.openModal();
                } else {
                    window.Toast?.warning('Schedina non disponibile');
                }
            });
        }
    },

    /**
     * Aggiorna visibilita bottone schedina
     */
    updateSchedinaButton() {
        const container = document.getElementById('schedina-inline-container');
        if (!container) return;

        const isSchedinaEnabled = window.FeatureFlags?.isEnabled('schedina');
        if (isSchedinaEnabled) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
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

        updateCountdown();
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
     * Distrugge il box
     */
    destroy() {
        this.stopCountdown();
        const container = document.getElementById('next-match-inline-box');
        if (container) {
            container.innerHTML = '';
        }
        this._currentMatch = null;
        this._isExpanded = false;
    },

    /**
     * Aggiorna (ricarica dati)
     */
    async refresh() {
        await this.init();
    }
};

// Ascolta cambio flag schedina
document.addEventListener('featureFlagChanged', (e) => {
    if (e.detail?.flagId === 'schedina') {
        window.NextMatchAlert.updateSchedinaButton();
    }
});

console.log('[NextMatchAlert] Modulo caricato (versione inline)');
