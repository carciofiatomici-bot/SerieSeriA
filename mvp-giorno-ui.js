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

        // Trova o crea il container
        let container = document.getElementById(containerId);
        if (!container) {
            // Crea container nel dashboard
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                container = document.createElement('div');
                container.id = containerId;
                container.className = 'mb-4';
                // Inserisci dopo il primo elemento (solitamente il titolo)
                const firstChild = dashboard.querySelector('.bg-gray-800, .bg-slate-800');
                if (firstChild) {
                    firstChild.parentNode.insertBefore(container, firstChild);
                } else {
                    dashboard.prepend(container);
                }
            }
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
            // Nessun MVP ancora calcolato
            this._container.innerHTML = '';
            return;
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

        // Data formattata
        const calculatedAt = mvp.calculatedAt ? new Date(mvp.calculatedAt) : new Date();
        const dateStr = calculatedAt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

        this._container.innerHTML = `
            <div class="bg-gradient-to-r from-amber-900/40 via-yellow-900/30 to-amber-900/40 rounded-xl border border-yellow-500/50 p-4 shadow-lg relative overflow-hidden">
                <!-- Decorazione sfondo -->
                <div class="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div class="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

                <div class="relative z-10">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl animate-pulse">&#127942;</span>
                            <h3 class="text-lg font-bold text-yellow-400">MVP del Giorno</h3>
                        </div>
                        <span class="text-xs text-gray-400">${dateStr}</span>
                    </div>

                    <!-- Player Info -->
                    <div class="flex items-center gap-4">
                        <!-- Avatar/Icon -->
                        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-3xl shadow-lg border-2 border-yellow-400/50">
                            ${roleIcon}
                        </div>

                        <!-- Details -->
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xl font-bold text-white">${this.escapeHtml(mvp.playerName)}</span>
                                <span class="px-2 py-0.5 rounded text-xs font-bold ${roleBadgeClass}">${mvp.role}</span>
                            </div>
                            <div class="text-sm text-gray-300 mb-2">
                                <i class="fas fa-shield-alt mr-1 text-gray-500"></i>
                                ${this.escapeHtml(mvp.teamName)}
                            </div>

                            <!-- Stats -->
                            <div class="flex flex-wrap gap-3 text-xs">
                                ${goals > 0 ? `<span class="flex items-center gap-1 text-green-400"><i class="fas fa-futbol"></i> ${goals} gol</span>` : ''}
                                ${assists > 0 ? `<span class="flex items-center gap-1 text-blue-400"><i class="fas fa-hands-helping"></i> ${assists} assist</span>` : ''}
                                ${cleanSheets > 0 ? `<span class="flex items-center gap-1 text-purple-400"><i class="fas fa-ban"></i> ${cleanSheets} CS</span>` : ''}
                                ${saves > 0 ? `<span class="flex items-center gap-1 text-cyan-400"><i class="fas fa-hand-paper"></i> ${saves} parate</span>` : ''}
                            </div>
                        </div>

                        <!-- Score -->
                        <div class="text-right">
                            <div class="text-3xl font-bold text-yellow-400">${mvp.score?.toFixed(1) || '0.0'}</div>
                            <div class="text-xs text-gray-400">punti</div>
                        </div>
                    </div>

                    <!-- Bonus indicator -->
                    <div class="mt-3 pt-3 border-t border-yellow-500/20 flex items-center justify-center gap-2">
                        <span class="text-xs text-yellow-300/80">
                            <i class="fas fa-bolt mr-1"></i>
                            +5% XP fino al prossimo calcolo
                        </span>
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
