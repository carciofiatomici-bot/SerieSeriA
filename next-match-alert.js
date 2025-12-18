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
        if (!container) return;

        // Carica la prossima partita
        const nextMatch = await this.getNextMatch(currentTeamId);
        if (!nextMatch) {
            container.innerHTML = '';
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
     * Calcola il prossimo orario di simulazione (20:30)
     */
    getNextSimulationTime() {
        const now = new Date();
        const next = new Date();
        next.setHours(20, 30, 0, 0);
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
     * Crea il contenuto inline nel container
     */
    createInlineContent(container, nextMatch, automationState) {
        // Colori e icone per tipo competizione
        let typeColor, typeIcon, typeBorder;
        if (nextMatch.type === 'campionato') {
            typeColor = 'green';
            typeIcon = '🏆';
            typeBorder = 'border-green-500';
        } else if (nextMatch.type === 'supercoppa') {
            typeColor = 'yellow';
            typeIcon = '⭐';
            typeBorder = 'border-yellow-500';
        } else {
            typeColor = 'purple';
            typeIcon = '🏅';
            typeBorder = 'border-purple-500';
        }

        // URL loghi squadre
        const homeLogoUrl = this.getTeamLogoUrl(nextMatch.homeId);
        const awayLogoUrl = this.getTeamLogoUrl(nextMatch.awayId);

        // Carica stato espansione salvato
        const savedExpanded = localStorage.getItem('fanta_next_match_expanded') === 'true';
        this._isExpanded = savedExpanded;

        container.innerHTML = `
            <div class="relative">
                <!-- Header compatto - sempre visibile -->
                <div id="next-match-header"
                     class="inline-flex items-center gap-0.5 cursor-pointer select-none px-1 py-0.5 rounded border ${typeBorder} bg-gray-800/80 hover:bg-gray-700/80 transition"
                     title="Clicca per ${this._isExpanded ? 'chiudere' : 'espandere'}">
                    <span class="text-xs">${typeIcon}</span>
                    <span id="next-match-toggle-icon" class="text-[8px] text-gray-400">${this._isExpanded ? '▼' : '▶'}</span>
                </div>

                <!-- Pannello espanso - posizione assoluta (si sovrappone) -->
                <div id="next-match-expanded"
                     class="absolute top-full left-0 mt-1 z-50 bg-gray-900 rounded-lg border ${typeBorder} shadow-xl min-w-[160px] ${this._isExpanded ? '' : 'hidden'}">

                    <!-- Intestazione -->
                    <div class="bg-gradient-to-r from-${typeColor}-800 to-${typeColor}-700 px-2 py-0.5 rounded-t-md">
                        <p class="text-white text-[8px] font-bold text-center">${nextMatch.round}</p>
                    </div>

                    <!-- Squadre -->
                    <div class="px-2 py-1">
                        <div class="flex items-center justify-center gap-2">
                            <div class="flex flex-col items-center">
                                <img src="${homeLogoUrl}" alt="${nextMatch.homeName}"
                                     class="w-5 h-5 rounded-full border border-gray-600 object-cover"
                                     loading="lazy" decoding="async">
                                <span class="text-[7px] font-bold max-w-[45px] truncate ${nextMatch.isHome ? 'text-yellow-400' : 'text-white'}">${nextMatch.homeName}</span>
                                <span class="text-[6px] text-gray-400">Lv.${nextMatch.homeAvg}</span>
                            </div>
                            <span class="text-gray-500 text-[9px] font-bold">vs</span>
                            <div class="flex flex-col items-center">
                                <img src="${awayLogoUrl}" alt="${nextMatch.awayName}"
                                     class="w-5 h-5 rounded-full border border-gray-600 object-cover"
                                     loading="lazy" decoding="async">
                                <span class="text-[7px] font-bold max-w-[45px] truncate ${!nextMatch.isHome ? 'text-yellow-400' : 'text-white'}">${nextMatch.awayName}</span>
                                <span class="text-[6px] text-gray-400">Lv.${nextMatch.awayAvg}</span>
                            </div>
                        </div>
                        ${automationState?.isEnabled ? `
                            <div class="mt-1 text-center border-t border-gray-700 pt-1">
                                <span class="text-gray-500 text-[6px]">Sim 20:30</span>
                                <span id="next-match-countdown" class="text-${typeColor}-400 font-mono font-bold text-[8px] ml-1">--:--:--</span>
                            </div>
                        ` : ''}
                        <div id="next-match-schedina-container" class="mt-1 hidden">
                            <button id="next-match-schedina-btn"
                                    class="w-full py-0.5 bg-green-600 hover:bg-green-500 rounded text-white text-[8px] font-bold flex items-center justify-center gap-1 transition">
                                <span>🎯</span> Schedina
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind eventi
        this.bindEvents(container);

        // Aggiorna bottone schedina
        this.updateSchedinaButton();
    },

    /**
     * Collega gli eventi
     */
    bindEvents(container) {
        const header = container.querySelector('#next-match-header');
        const schedinaBtn = container.querySelector('#next-match-schedina-btn');

        // Toggle espansione
        if (header) {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExpand();
            });
        }

        // Bottone schedina
        if (schedinaBtn) {
            schedinaBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.SchedinaUI) {
                    window.SchedinaUI.open();
                } else {
                    window.Toast?.warning('Schedina non disponibile');
                }
            });
        }
    },

    /**
     * Toggle espansione
     */
    toggleExpand() {
        this._isExpanded = !this._isExpanded;

        const expanded = document.getElementById('next-match-expanded');
        const toggleIcon = document.getElementById('next-match-toggle-icon');

        if (expanded) {
            if (this._isExpanded) {
                expanded.classList.remove('hidden');
            } else {
                expanded.classList.add('hidden');
            }
        }

        if (toggleIcon) {
            toggleIcon.textContent = this._isExpanded ? '▼' : '▶';
        }

        // Salva stato
        localStorage.setItem('fanta_next_match_expanded', this._isExpanded.toString());
    },

    /**
     * Collassa il pannello
     */
    collapse() {
        if (!this._isExpanded) return;
        this._isExpanded = false;

        const expanded = document.getElementById('next-match-expanded');
        const toggleIcon = document.getElementById('next-match-toggle-icon');

        if (expanded) expanded.classList.add('hidden');
        if (toggleIcon) toggleIcon.textContent = '▶';

        localStorage.setItem('fanta_next_match_expanded', 'false');
    },

    /**
     * Aggiorna visibilita bottone schedina
     */
    updateSchedinaButton() {
        const container = document.getElementById('next-match-schedina-container');
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
