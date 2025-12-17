//
// ====================================================================
// FIGURINE-UI.JS - Interfaccia Album Figurine
// ====================================================================
//

window.FigurineUI = {
    // Stato
    isOpen: false,
    currentTab: 'album', // album, pack
    currentAlbum: null,

    /**
     * Inizializza UI
     */
    init() {
        this.createModal();
        this.bindEvents();
        this.setupDashboardBox();
        console.log('[FigurineUI] Inizializzato');
    },

    /**
     * Setup box nella dashboard
     */
    setupDashboardBox() {
        const box = document.getElementById('figurine-box');
        const badge = document.getElementById('figurine-badge');

        if (!box) {
            console.warn('[FigurineUI] Box dashboard non trovato');
            return;
        }

        // Mostra il box
        box.classList.remove('hidden');

        // Click per aprire pannello
        box.addEventListener('click', () => {
            this.open();
        });

        // Controlla se c'è un pacchetto gratis disponibile
        this.checkFreePack();
    },

    /**
     * Verifica se pacchetto gratuito disponibile e mostra badge
     */
    async checkFreePack() {
        const badge = document.getElementById('figurine-badge');
        if (!badge) return;

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) {
            badge.classList.add('hidden');
            return;
        }

        try {
            const canOpen = await window.FigurineSystem?.canOpenFreePackByTeamId(teamId);
            if (canOpen) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        } catch (error) {
            badge.classList.add('hidden');
        }
    },

    /**
     * Crea il modale
     */
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'figurine-modal';
        modal.className = 'fixed inset-0 z-[1000] hidden';
        modal.innerHTML = `
            <!-- Overlay -->
            <div class="absolute inset-0 bg-black/80" id="figurine-overlay"></div>

            <!-- Container -->
            <div class="relative h-full flex items-center justify-center p-2 sm:p-4">
                <div class="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-purple-500 shadow-2xl flex flex-col">

                    <!-- Header -->
                    <div class="bg-gradient-to-r from-purple-800 to-indigo-700 px-4 py-3 flex items-center justify-between">
                        <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                            <span class="text-2xl">🎴</span> Album Figurine
                        </h2>
                        <button id="figurine-close" class="text-white hover:text-gray-300 text-2xl">&times;</button>
                    </div>

                    <!-- Stats Bar -->
                    <div class="bg-gray-800 px-4 py-2 border-b border-gray-700">
                        <div class="flex items-center justify-between text-sm">
                            <div class="flex items-center gap-4">
                                <span id="figurine-progress" class="text-purple-300">Completamento: 0%</span>
                                <span id="figurine-count" class="text-gray-400">0/64 figurine</span>
                            </div>
                            <div id="figurine-free-pack" class="text-green-400 text-xs"></div>
                        </div>
                        <div class="mt-2 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div id="figurine-progress-bar" class="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-500" style="width: 0%"></div>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="flex border-b border-gray-700 bg-gray-800">
                        <button class="figurine-tab flex-1 py-2 text-sm font-semibold text-gray-400 hover:text-white transition border-b-2 border-transparent" data-tab="album">
                            📖 Album
                        </button>
                        <button class="figurine-tab flex-1 py-2 text-sm font-semibold text-gray-400 hover:text-white transition border-b-2 border-transparent" data-tab="pack">
                            📦 Pacchetti
                        </button>
                    </div>

                    <!-- Content -->
                    <div id="figurine-content" class="flex-1 overflow-y-auto p-4">
                        <!-- Contenuto dinamico -->
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Collega eventi
     */
    bindEvents() {
        // Chiudi
        document.getElementById('figurine-close')?.addEventListener('click', () => this.close());
        document.getElementById('figurine-overlay')?.addEventListener('click', () => this.close());

        // Tabs
        document.querySelectorAll('.figurine-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    /**
     * Apre il modale
     */
    async open() {
        if (!window.FigurineSystem?.isEnabled()) {
            alert('Album Figurine non disponibile');
            return;
        }

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) {
            alert('Seleziona prima una squadra');
            return;
        }

        document.getElementById('figurine-modal')?.classList.remove('hidden');
        this.isOpen = true;

        // Carica album
        await this.loadAlbum();
        this.switchTab('album');
    },

    /**
     * Chiude il modale
     */
    close() {
        document.getElementById('figurine-modal')?.classList.add('hidden');
        this.isOpen = false;
    },

    /**
     * Carica album
     */
    async loadAlbum() {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        this.currentAlbum = await window.FigurineSystem.loadTeamAlbum(teamId);
        this.updateStats();
    },

    /**
     * Aggiorna statistiche
     */
    updateStats() {
        if (!this.currentAlbum) return;

        const collection = this.currentAlbum.collection;
        const icone = window.FigurineSystem.getIconeList();
        const maxFigurine = icone.length * 4; // 4 varianti per giocatore
        const unique = window.FigurineSystem.countUniqueFigurine(collection);
        const percentage = window.FigurineSystem.getCompletionPercentage(collection);

        document.getElementById('figurine-progress').textContent = `Completamento: ${percentage}%`;
        document.getElementById('figurine-count').textContent = `${unique}/${maxFigurine} figurine`;
        document.getElementById('figurine-progress-bar').style.width = `${percentage}%`;

        // Free pack
        const canFree = window.FigurineSystem.canOpenFreePack(this.currentAlbum);
        const freePackEl = document.getElementById('figurine-free-pack');
        if (canFree) {
            freePackEl.innerHTML = '🎁 Pacchetto GRATIS disponibile!';
            freePackEl.className = 'text-green-400 text-xs font-bold animate-pulse';
        } else {
            const timeLeft = window.FigurineSystem.getTimeUntilFreePack(this.currentAlbum);
            freePackEl.innerHTML = timeLeft ? `Prossimo gratis: ${timeLeft.formatted}` : '';
            freePackEl.className = 'text-gray-400 text-xs';
        }
    },

    /**
     * Cambia tab
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Aggiorna stile tabs
        document.querySelectorAll('.figurine-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('text-purple-400', 'border-purple-400');
                tab.classList.remove('text-gray-400', 'border-transparent');
            } else {
                tab.classList.remove('text-purple-400', 'border-purple-400');
                tab.classList.add('text-gray-400', 'border-transparent');
            }
        });

        // Renderizza contenuto
        switch (tabName) {
            case 'album':
                this.renderAlbum();
                break;
            case 'pack':
                this.renderPacks();
                break;
        }
    },

    /**
     * Renderizza album
     */
    renderAlbum() {
        const content = document.getElementById('figurine-content');
        const icone = window.FigurineSystem.getIconeList();
        const collection = this.currentAlbum?.collection || {};

        let html = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">';

        icone.forEach(icona => {
            const counts = collection[icona.id] || { normale: 0, evoluto: 0, alternative: 0, ultimate: 0 };
            const hasAny = counts.normale > 0 || counts.evoluto > 0 || counts.alternative > 0 || counts.ultimate > 0;
            const isComplete = counts.normale > 0 && counts.evoluto > 0 && counts.alternative > 0 && counts.ultimate > 0;

            html += `
                <div class="bg-gray-800 rounded-lg p-2 border ${isComplete ? 'border-yellow-500' : (hasAny ? 'border-purple-600' : 'border-gray-700')} relative">
                    ${isComplete ? '<span class="absolute -top-2 -right-2 text-lg">⭐</span>' : ''}

                    <!-- Immagine Icona -->
                    <div class="aspect-square rounded overflow-hidden mb-2 ${!hasAny ? 'opacity-30 grayscale' : ''}">
                        <img src="${icona.photoUrl || 'https://placehold.co/100x100/1f2937/6b7280?text=?'}"
                             alt="${icona.name}"
                             class="w-full h-full object-cover"
                             onerror="this.src='https://placehold.co/100x100/1f2937/6b7280?text=?'">
                    </div>

                    <!-- Nome -->
                    <p class="text-xs font-semibold text-white text-center truncate mb-1">${icona.name}</p>

                    <!-- Varianti (4 tipi) -->
                    <div class="flex justify-center gap-1">
                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${counts.normale > 0 ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-500'}"
                              title="Normale: ${counts.normale}">
                            ${counts.normale > 0 ? counts.normale : '○'}
                        </span>
                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${counts.evoluto > 0 ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-500'}"
                              title="Evoluto: ${counts.evoluto}">
                            ${counts.evoluto > 0 ? counts.evoluto : '○'}
                        </span>
                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${counts.alternative > 0 ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-500'}"
                              title="Alternative: ${counts.alternative}">
                            ${counts.alternative > 0 ? counts.alternative : '○'}
                        </span>
                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${counts.ultimate > 0 ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-700 text-gray-500'}"
                              title="Ultimate: ${counts.ultimate}">
                            ${counts.ultimate > 0 ? counts.ultimate : '○'}
                        </span>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Legenda
        html += `
            <div class="mt-4 p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
                <p class="font-semibold mb-1">Legenda Varianti:</p>
                <div class="flex flex-wrap gap-3">
                    <span><span class="inline-block w-3 h-3 rounded-full bg-gray-500 mr-1"></span> Normale (55%)</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span> Evoluto (25%)</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1"></span> Alternative (15%)</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span> Ultimate (5%)</span>
                </div>
            </div>
        `;

        content.innerHTML = html;
    },

    /**
     * Renderizza pacchetti
     */
    async renderPacks() {
        const content = document.getElementById('figurine-content');
        const config = await window.FigurineSystem.loadConfig();
        const canFree = window.FigurineSystem.canOpenFreePack(this.currentAlbum);
        const timeLeft = window.FigurineSystem.getTimeUntilFreePack(this.currentAlbum);

        const teamData = await window.FigurineSystem.getTeamData(window.InterfacciaCore?.currentTeamId);
        const budget = teamData?.budget || 0;
        const css = teamData?.creditiSuperSeri || 0;
        const packCost = config.packPriceCSS || 1;

        // Calcola duplicati scambiabili
        const duplicates = window.FigurineSystem.countTradableDuplicates(this.currentAlbum.collection);
        const tradeRewards = config.tradeRewards || { normale: 50, evoluto: 75, alternative: 150, ultimate: 300 };
        const tradeRequired = config.tradeRequiredCount || 3;

        content.innerHTML = `
            <div class="space-y-4">
                <!-- Pacchetto Gratis -->
                <div class="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl p-4 border border-green-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-bold text-green-400 flex items-center gap-2">
                                🎁 Pacchetto Giornaliero
                            </h3>
                            <p class="text-sm text-gray-300 mt-1">${config.figurinesPerPack} figurine gratis ogni ${config.freePackCooldownHours} ore</p>
                        </div>
                        ${canFree ?
                            `<button id="btn-free-pack" class="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-lg transition animate-pulse">
                                APRI GRATIS
                            </button>` :
                            `<div class="text-right">
                                <p class="text-sm text-gray-400">Prossimo tra:</p>
                                <p class="text-xl font-bold text-green-400">${timeLeft?.formatted || '--'}</p>
                            </div>`
                        }
                    </div>
                </div>

                <!-- Pacchetto Premium -->
                <div class="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-4 border border-purple-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-bold text-purple-400 flex items-center gap-2">
                                📦 Pacchetto Figurine
                            </h3>
                            <p class="text-sm text-gray-300 mt-1">1 figurina (1% di ottenerne 2!) per ${packCost} CSS</p>
                            <p class="text-xs text-gray-500 mt-1">CSS disponibili: ${css}</p>
                        </div>
                        <button id="btn-buy-pack" class="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-lg transition ${css < packCost ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${css < packCost ? 'disabled' : ''}>
                            ${packCost} CSS
                        </button>
                    </div>
                </div>

                <!-- Info -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="font-semibold text-white mb-2">Probabilita Varianti</h4>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-300">⚪ Normale</span>
                            <div class="flex items-center gap-2">
                                <div class="w-32 bg-gray-700 rounded-full h-2">
                                    <div class="bg-gray-500 h-2 rounded-full" style="width: 55%"></div>
                                </div>
                                <span class="text-gray-400 text-sm">55%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-blue-300">🔵 Evoluto</span>
                            <div class="flex items-center gap-2">
                                <div class="w-32 bg-gray-700 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full" style="width: 25%"></div>
                                </div>
                                <span class="text-gray-400 text-sm">25%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-purple-300">🟣 Alternative</span>
                            <div class="flex items-center gap-2">
                                <div class="w-32 bg-gray-700 rounded-full h-2">
                                    <div class="bg-purple-500 h-2 rounded-full" style="width: 15%"></div>
                                </div>
                                <span class="text-gray-400 text-sm">15%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-yellow-300">🟡 Ultimate</span>
                            <div class="flex items-center gap-2">
                                <div class="w-32 bg-gray-700 rounded-full h-2">
                                    <div class="bg-yellow-500 h-2 rounded-full" style="width: 5%"></div>
                                </div>
                                <span class="text-gray-400 text-sm">5%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Scambio Figurine Duplicate -->
                <div class="bg-gradient-to-r from-amber-900/50 to-orange-900/50 rounded-xl p-4 border border-amber-500">
                    <h4 class="font-semibold text-amber-400 mb-3 flex items-center gap-2">
                        🔄 Scambia Figurine Duplicate
                    </h4>
                    <p class="text-xs text-gray-400 mb-3">${tradeRequired} figurine duplicate = CS (la prima resta nell'album)</p>
                    <div class="grid grid-cols-2 gap-2">
                        <button data-trade="normale" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.normale < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.normale < tradeRequired ? 'disabled' : ''}>
                            <span class="text-gray-300 text-sm">⚪ Normali: ${duplicates.normale}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.normale} CS</span>
                        </button>
                        <button data-trade="evoluto" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.evoluto < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.evoluto < tradeRequired ? 'disabled' : ''}>
                            <span class="text-blue-300 text-sm">🔵 Evolute: ${duplicates.evoluto}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.evoluto} CS</span>
                        </button>
                        <button data-trade="alternative" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.alternative < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.alternative < tradeRequired ? 'disabled' : ''}>
                            <span class="text-purple-300 text-sm">🟣 Alternative: ${duplicates.alternative}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.alternative} CS</span>
                        </button>
                        <button data-trade="ultimate" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.ultimate < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.ultimate < tradeRequired ? 'disabled' : ''}>
                            <span class="text-yellow-300 text-sm">🟡 Ultimate: ${duplicates.ultimate}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.ultimate} CS</span>
                        </button>
                    </div>
                    <p id="trade-result" class="text-center text-sm mt-2"></p>
                </div>

                <!-- Container risultato apertura -->
                <div id="pack-result" class="hidden"></div>
            </div>
        `;

        // Bind buttons
        document.getElementById('btn-free-pack')?.addEventListener('click', () => this.openPack(true));
        document.getElementById('btn-buy-pack')?.addEventListener('click', () => this.openPack(false));

        // Bind trade buttons
        document.querySelectorAll('.trade-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const rarity = e.currentTarget.dataset.trade;
                if (!rarity) return;
                await this.tradeDuplicates(rarity);
            });
        });
    },

    /**
     * Scambia figurine duplicate
     */
    async tradeDuplicates(rarity) {
        const resultEl = document.getElementById('trade-result');
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!teamId) {
            if (resultEl) {
                resultEl.textContent = 'Errore: squadra non trovata';
                resultEl.className = 'text-center text-sm mt-2 text-red-400';
            }
            return;
        }

        try {
            const result = await window.FigurineSystem.tradeAllDuplicates(teamId, rarity);

            if (result.success) {
                if (resultEl) {
                    resultEl.textContent = result.message;
                    resultEl.className = 'text-center text-sm mt-2 text-green-400';
                }
                // Ricarica album e UI
                this.currentAlbum = await window.FigurineSystem.loadTeamAlbum(teamId);
                await this.renderPacks();
            } else {
                if (resultEl) {
                    resultEl.textContent = result.message;
                    resultEl.className = 'text-center text-sm mt-2 text-red-400';
                }
            }
        } catch (error) {
            console.error('[FigurineUI] Errore scambio:', error);
            if (resultEl) {
                resultEl.textContent = `Errore: ${error.message}`;
                resultEl.className = 'text-center text-sm mt-2 text-red-400';
            }
        }
    },

    /**
     * Apre un pacchetto
     */
    async openPack(isFree) {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            const result = await window.FigurineSystem.openPack(teamId, isFree);
            this.currentAlbum = result.album;
            this.updateStats();
            this.showPackResult(result);

            // Aggiorna il badge del pacchetto gratis nella dashboard
            if (isFree) {
                this.checkFreePack();
            }
        } catch (error) {
            alert(error.message);
        }
    },

    /**
     * Mostra risultato apertura pacchetto
     */
    showPackResult(result) {
        const container = document.getElementById('pack-result');
        if (!container) return;

        let html = `
            <div class="bg-gradient-to-b from-purple-900 to-gray-900 rounded-xl p-4 border-2 border-purple-400 animate-pulse">
                <h3 class="text-center text-lg font-bold text-white mb-4">🎉 Hai ottenuto:</h3>
                <div class="grid grid-cols-3 gap-3">
        `;

        result.figurine.forEach(fig => {
            const rarityColors = {
                normale: 'border-gray-500 bg-gray-800',
                evoluto: 'border-blue-500 bg-blue-900/30',
                alternative: 'border-purple-500 bg-purple-900/30',
                ultimate: 'border-yellow-500 bg-yellow-900/30'
            };

            const textColors = {
                normale: 'text-gray-400',
                evoluto: 'text-blue-400',
                alternative: 'text-purple-400',
                ultimate: 'text-yellow-400'
            };

            html += `
                <div class="rounded-lg p-2 ${rarityColors[fig.rarity]} border-2 text-center">
                    <img src="${fig.iconaPhoto || 'https://placehold.co/80x80/1f2937/6b7280?text=?'}"
                         alt="${fig.iconaName}"
                         class="w-16 h-16 mx-auto rounded object-cover mb-1"
                         onerror="this.src='https://placehold.co/80x80/1f2937/6b7280?text=?'">
                    <p class="text-xs font-semibold text-white truncate">${fig.iconaName}</p>
                    <p class="text-xs ${textColors[fig.rarity]}">${fig.rarityInfo.name}</p>
                </div>
            `;
        });

        html += '</div>';

        if (result.bonusEarned > 0) {
            html += `<p class="text-center text-green-400 font-bold mt-3">+${result.bonusEarned} CS Bonus!</p>`;
        }

        html += `
                <button id="btn-close-result" class="w-full mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg">
                    Continua
                </button>
            </div>
        `;

        container.innerHTML = html;
        container.classList.remove('hidden');

        document.getElementById('btn-close-result')?.addEventListener('click', () => {
            container.classList.add('hidden');
            this.renderPacks();
        });
    }
};

// Init quando DOM pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.FeatureFlags?.isEnabled('figurine')) {
            window.FigurineUI.init();
        }

        // Ascolta cambio flag
        document.addEventListener('featureFlagChanged', (e) => {
            if (e.detail?.flagId === 'figurine' && e.detail?.enabled) {
                window.FigurineUI.init();
            }
        });
    }, 1000);
});

console.log('Modulo figurine-ui.js caricato.');
