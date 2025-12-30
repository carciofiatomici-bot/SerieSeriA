//
// ====================================================================
// MODULO MVP-GIORNO-UI.JS - UI Banner MVP del Giorno
// ====================================================================
//
// Mostra il banner MVP del Giorno nella dashboard di tutti gli utenti.
//

window.MvpDelGiornoUI = {

    // Riferimento al container del banner
    _container: null,

    /**
     * Verifica se il sistema MVP e' abilitato
     */
    isEnabled() {
        return window.FeatureFlags?.isEnabled('mvpDelGiorno') || false;
    },

    /**
     * Inizializza il banner MVP nella dashboard
     * @param {string} containerId - ID del container dove inserire il banner
     */
    async init(containerId = 'mvp-banner-container') {
        if (!this.isEnabled()) {
            console.log('[MVP-UI] Sistema MVP disabilitato');
            return;
        }

        // Trova il container (deve esistere nell'HTML)
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('[MVP-UI] Container non trovato:', containerId);
            return;
        }

        this._container = container;

        // Carica e mostra MVP
        await this.render();

        // Avvia listener real-time
        window.MvpDelGiorno?.startRealtimeListener((mvp) => {
            this.render(mvp);
        });

        console.log('[MVP-UI] Banner inizializzato');
    },

    /**
     * Verifica se la stagione e' terminata
     */
    async checkSeasonOver() {
        try {
            const { doc, getDoc, appId } = window.firestoreTools || {};
            if (!doc || !getDoc || !appId || !window.db) return false;

            const configDocRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'settings');
            const configDoc = await getDoc(configDocRef);
            return configDoc.exists() ? (configDoc.data().isSeasonOver || false) : false;
        } catch (e) {
            console.warn('[MVP-UI] Errore verifica isSeasonOver:', e);
            return false;
        }
    },

    /**
     * Inietta gli stili CSS per le animazioni MVP (una sola volta)
     */
    injectStyles() {
        if (document.getElementById('mvp-celebration-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'mvp-celebration-styles';
        styleSheet.textContent = `
            @keyframes mvp-shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
            }
            @keyframes mvp-glow-pulse {
                0%, 100% { box-shadow: 0 0 20px var(--team-primary-color, #fbbf24), 0 0 40px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.2); }
                50% { box-shadow: 0 0 30px var(--team-primary-color, #fbbf24), 0 0 60px rgba(251, 191, 36, 0.5), inset 0 1px 0 rgba(255,255,255,0.3); }
            }
            @keyframes mvp-star-float {
                0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; }
                50% { transform: translateY(-3px) rotate(10deg); opacity: 0.8; }
            }
            @keyframes mvp-crown-bounce {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-2px) scale(1.1); }
            }
            @keyframes mvp-border-dance {
                0% { border-color: var(--team-primary-color, #fbbf24); }
                33% { border-color: #fcd34d; }
                66% { border-color: #f59e0b; }
                100% { border-color: var(--team-primary-color, #fbbf24); }
            }
            .mvp-own-team-box {
                animation: mvp-glow-pulse 2s ease-in-out infinite, mvp-border-dance 3s linear infinite;
            }
            .mvp-shimmer-text {
                background: linear-gradient(90deg, #fbbf24 0%, #fef3c7 25%, #fbbf24 50%, #fef3c7 75%, #fbbf24 100%);
                background-size: 200% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: mvp-shimmer 2s linear infinite;
            }
            .mvp-crown {
                animation: mvp-crown-bounce 1.5s ease-in-out infinite;
                filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.8));
            }
            .mvp-star {
                animation: mvp-star-float 2s ease-in-out infinite;
            }
            .mvp-star:nth-child(2) { animation-delay: 0.3s; }
            .mvp-star:nth-child(3) { animation-delay: 0.6s; }
            .mvp-star:nth-child(4) { animation-delay: 0.9s; }
        `;
        document.head.appendChild(styleSheet);
    },

    /**
     * Renderizza il banner MVP
     * @param {Object} mvp - Dati MVP (opzionale, se non passato li carica)
     */
    async render(mvp = null) {
        if (!this._container) return;

        if (!this.isEnabled()) {
            this._container.innerHTML = '';
            return;
        }

        // Carica MVP se non passato
        if (!mvp) {
            mvp = await window.MvpDelGiorno?.getCurrentMvp();
        }

        if (!mvp) {
            // Nessun MVP ancora calcolato - mostra placeholder
            const isSeasonOver = await this.checkSeasonOver();
            this.renderPlaceholder(isSeasonOver);
            return;
        }

        // Verifica se l'MVP e' della squadra corrente
        const currentTeamId = window.InterfacciaCore?.getCurrentTeam()?.id;
        const isOwnTeam = currentTeamId && mvp.teamId === currentTeamId;

        // Inietta stili se necessario
        if (isOwnTeam) {
            this.injectStyles();
        }

        // Icona ruolo
        const roleIcons = {
            'P': '<i class="fas fa-hand-paper text-yellow-400"></i>',
            'D': '<i class="fas fa-shield-alt text-blue-400"></i>',
            'C': '<i class="fas fa-futbol text-green-400"></i>',
            'A': '<i class="fas fa-crosshairs text-red-400"></i>'
        };
        const roleIcon = roleIcons[mvp.role] || '<i class="fas fa-user"></i>';

        // Badge ruolo
        const roleBadges = {
            'P': 'bg-yellow-600 text-yellow-100',
            'D': 'bg-blue-600 text-blue-100',
            'C': 'bg-green-600 text-green-100',
            'A': 'bg-red-600 text-red-100'
        };
        const roleBadgeClass = roleBadges[mvp.role] || 'bg-gray-600 text-gray-100';

        // Stats
        const stats = mvp.stats || {};
        const goals = stats.goals || 0;
        const assists = stats.assists || 0;
        const cleanSheets = stats.cleanSheets || 0;
        const saves = stats.saves || 0;

        // Stats compatte
        const statsArr = [];
        if (goals > 0) statsArr.push(`${goals}G`);
        if (assists > 0) statsArr.push(`${assists}A`);
        if (cleanSheets > 0) statsArr.push(`${cleanSheets}CS`);
        if (saves > 0) statsArr.push(`${saves}P`);
        const statsStr = statsArr.length > 0 ? statsArr.join(' ') : '';

        if (isOwnTeam) {
            // VERSIONE CELEBRATIVA - E' IL TUO GIOCATORE!
            this._container.innerHTML = `
                <div class="mvp-own-team-box rounded-xl border-2 p-4 relative overflow-hidden" style="background: linear-gradient(135deg, rgba(120, 53, 15, 0.6) 0%, rgba(180, 83, 9, 0.4) 50%, rgba(120, 53, 15, 0.6) 100%); border-color: var(--team-primary-color, #fbbf24);">
                    <!-- Stelle decorative -->
                    <div class="absolute top-2 left-3 text-yellow-400/60 text-xs mvp-star">&#9733;</div>
                    <div class="absolute top-3 right-4 text-yellow-400/50 text-[10px] mvp-star">&#9733;</div>
                    <div class="absolute bottom-2 left-6 text-yellow-400/40 text-[8px] mvp-star">&#9733;</div>
                    <div class="absolute bottom-3 right-8 text-yellow-400/50 text-xs mvp-star">&#9733;</div>

                    <!-- Contenuto principale -->
                    <div class="relative z-10">
                        <!-- Header celebrativo -->
                        <div class="flex items-center justify-center gap-2 mb-2">
                            <span class="mvp-crown text-lg">&#128081;</span>
                            <span class="mvp-shimmer-text text-sm font-black uppercase tracking-wider">E' il tuo giocatore!</span>
                            <span class="mvp-crown text-lg">&#128081;</span>
                        </div>

                        <!-- Player row -->
                        <div class="flex items-center gap-3">
                            <!-- Avatar con glow -->
                            <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg border-2 flex-shrink-0" style="background: linear-gradient(135deg, var(--team-primary-color, #fbbf24) 0%, #f59e0b 100%); border-color: rgba(255,255,255,0.3); box-shadow: 0 0 15px var(--team-primary-color, #fbbf24);">
                                ${roleIcon}
                            </div>

                            <!-- Player Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-lg">&#127942;</span>
                                    <span class="text-base font-black text-yellow-300 truncate">${this.escapeHtml(mvp.playerName)}</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${roleBadgeClass}">${mvp.role}</span>
                                </div>
                                <div class="text-xs text-yellow-200/80 flex items-center gap-2 flex-wrap mt-0.5">
                                    ${statsStr ? `<span class="font-semibold">${statsStr}</span>` : ''}
                                    <span class="text-green-300 font-bold">+0.5 MOD</span>
                                    <span class="text-yellow-200">+5% XP</span>
                                </div>
                            </div>

                            <!-- Score grande -->
                            <div class="text-right flex-shrink-0">
                                <div class="text-2xl font-black mvp-shimmer-text">${mvp.score?.toFixed(1) || '0.0'}</div>
                                <div class="text-[10px] text-yellow-300/70 uppercase tracking-wide">punti</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // VERSIONE NORMALE - MVP di altra squadra
            this._container.innerHTML = `
                <div class="bg-gradient-to-r from-amber-900/40 via-yellow-900/30 to-amber-900/40 rounded-lg border border-yellow-500/50 p-3 relative overflow-hidden">
                    <div class="relative z-10 flex items-center gap-3">
                        <!-- Avatar/Icon -->
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-lg shadow-md border-2 border-yellow-400/50 flex-shrink-0">
                            ${roleIcon}
                        </div>

                        <!-- Player Info -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-base">&#127942;</span>
                                <span class="text-sm font-bold text-yellow-400">MVP</span>
                                <span class="text-sm font-bold text-white truncate">${this.escapeHtml(mvp.playerName)}</span>
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${roleBadgeClass}">${mvp.role}</span>
                            </div>
                            <div class="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                                <span class="truncate">${this.escapeHtml(mvp.teamName)}</span>
                                ${statsStr ? `<span class="text-yellow-400/80">${statsStr}</span>` : ''}
                                <span class="text-green-400/80">+0.5 MOD</span>
                                <span class="text-yellow-300/60">+5% XP</span>
                            </div>
                        </div>

                        <!-- Score -->
                        <div class="text-right flex-shrink-0">
                            <div class="text-xl font-bold text-yellow-400">${mvp.score?.toFixed(1) || '0.0'}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Renderizza il placeholder quando non c'e' MVP
     * @param {boolean} isSeasonOver - Se la stagione e' terminata
     */
    renderPlaceholder(isSeasonOver) {
        if (!this._container) return;

        const title = isSeasonOver ? 'Stagione Terminata' : 'In attesa...';
        const subtitle = 'MVP disponibile dopo 2 partite';
        const icon = isSeasonOver ? '<i class="fas fa-flag-checkered text-gray-400 text-lg"></i>' : '<i class="fas fa-hourglass-half text-gray-400 text-lg"></i>';

        this._container.innerHTML = `
            <div class="bg-gradient-to-r from-gray-800/60 via-gray-700/40 to-gray-800/60 rounded-lg border border-gray-600/50 p-3 relative overflow-hidden">
                <div class="relative z-10 flex items-center gap-3">
                    <!-- Icon -->
                    <div class="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center border border-gray-600/50 flex-shrink-0">
                        ${icon}
                    </div>
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-base opacity-50">&#127942;</span>
                            <span class="text-sm font-bold text-gray-400">MVP del Giorno</span>
                        </div>
                        <div class="text-xs text-gray-500">${title} - ${subtitle}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Rimuove il banner dalla dashboard
     */
    destroy() {
        window.MvpDelGiorno?.stopRealtimeListener();
        if (this._container) {
            this._container.innerHTML = '';
        }
    },

    /**
     * Helper per escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Mostra modal con storico MVP
     */
    async showHistory() {
        const history = await window.MvpDelGiorno?.getHistory(30);

        if (!history || history.length === 0) {
            window.Toast?.show('Nessuno storico MVP disponibile', 'info');
            return;
        }

        const roleBadges = {
            'P': 'bg-yellow-600',
            'D': 'bg-blue-600',
            'C': 'bg-green-600',
            'A': 'bg-red-600'
        };

        let historyHtml = history.map((mvp, index) => {
            const date = new Date(mvp.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const stats = mvp.stats || {};
            const statsStr = [];
            if (stats.goals) statsStr.push(`${stats.goals}G`);
            if (stats.assists) statsStr.push(`${stats.assists}A`);
            if (stats.cleanSheets) statsStr.push(`${stats.cleanSheets}CS`);
            if (stats.saves) statsStr.push(`${stats.saves}P`);

            return `
                <div class="flex items-center gap-3 p-2 ${index % 2 === 0 ? 'bg-gray-800/50' : ''} rounded">
                    <span class="text-gray-500 text-xs w-8">${date}</span>
                    <span class="px-1.5 py-0.5 rounded text-xs font-bold ${roleBadges[mvp.role] || 'bg-gray-600'}">${mvp.role}</span>
                    <span class="flex-1 text-white font-medium">${this.escapeHtml(mvp.playerName)}</span>
                    <span class="text-gray-400 text-xs">${this.escapeHtml(mvp.teamName)}</span>
                    <span class="text-yellow-400 font-bold">${mvp.score?.toFixed(1)}</span>
                </div>
            `;
        }).join('');

        const modalHtml = `
            <div id="mvp-history-modal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div class="bg-gray-900 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl border border-gray-700">
                    <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                        <h3 class="text-lg font-bold text-yellow-400">
                            <i class="fas fa-trophy mr-2"></i>
                            Storico MVP del Giorno
                        </h3>
                        <button onclick="document.getElementById('mvp-history-modal').remove()" class="text-gray-400 hover:text-white text-xl">&times;</button>
                    </div>
                    <div class="p-4 overflow-y-auto max-h-96">
                        ${historyHtml}
                    </div>
                </div>
            </div>
        `;

        // Rimuovi modal esistente
        document.getElementById('mvp-history-modal')?.remove();

        // Aggiungi modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};

// Auto-init quando DOM pronto e feature flags caricati
document.addEventListener('featureFlagsLoaded', () => {
    if (window.MvpDelGiornoUI.isEnabled()) {
        // Ritarda init per assicurarsi che la dashboard sia renderizzata
        setTimeout(() => {
            window.MvpDelGiornoUI.init();
        }, 500);
    }
});

console.log("Modulo MvpDelGiornoUI caricato.");
