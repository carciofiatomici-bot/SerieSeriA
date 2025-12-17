//
// ====================================================================
// FIGURINE-UI.JS - Interfaccia Album Figurine
// ====================================================================
//

window.FigurineUI = {
    // Stato
    isOpen: false,
    currentTab: 'album', // album, pack, trades, duplicates
    currentAlbum: null,

    /**
     * Inizializza UI
     */
    init() {
        this.createModal();
        this.bindEvents();
        console.log('[FigurineUI] Inizializzato');
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
                                <span id="figurine-count" class="text-gray-400">0/48 figurine</span>
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
                        <button class="figurine-tab flex-1 py-2 text-sm font-semibold text-gray-400 hover:text-white transition border-b-2 border-transparent" data-tab="trades">
                            🔄 Scambi
                        </button>
                        <button class="figurine-tab flex-1 py-2 text-sm font-semibold text-gray-400 hover:text-white transition border-b-2 border-transparent" data-tab="duplicates">
                            📋 Duplicati
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
        const maxFigurine = icone.length * 3;
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
            case 'trades':
                this.renderTrades();
                break;
            case 'duplicates':
                this.renderDuplicates();
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
            const counts = collection[icona.id] || { base: 0, shiny: 0, gold: 0 };
            const hasAny = counts.base > 0 || counts.shiny > 0 || counts.gold > 0;
            const isComplete = counts.base > 0 && counts.shiny > 0 && counts.gold > 0;

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

                    <!-- Rarita -->
                    <div class="flex justify-center gap-1">
                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${counts.base > 0 ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-500'}"
                              title="Base: ${counts.base}">
                            ${counts.base > 0 ? counts.base : '○'}
                        </span>
                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${counts.shiny > 0 ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-500'}"
                              title="Shiny: ${counts.shiny}">
                            ${counts.shiny > 0 ? counts.shiny : '○'}
                        </span>
                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${counts.gold > 0 ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-700 text-gray-500'}"
                              title="Gold: ${counts.gold}">
                            ${counts.gold > 0 ? counts.gold : '○'}
                        </span>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Legenda
        html += `
            <div class="mt-4 p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
                <p class="font-semibold mb-1">Legenda Rarita:</p>
                <div class="flex gap-4">
                    <span><span class="inline-block w-3 h-3 rounded-full bg-gray-500 mr-1"></span> Base (70%)</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span> Shiny (25%)</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span> Gold (5%)</span>
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
                                📦 Pacchetto Premium
                            </h3>
                            <p class="text-sm text-gray-300 mt-1">${config.figurinesPerPack} figurine per ${config.packPrice} CS</p>
                            <p class="text-xs text-gray-500 mt-1">Budget attuale: ${budget} CS</p>
                        </div>
                        <button id="btn-buy-pack" class="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-lg transition ${budget < config.packPrice ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${budget < config.packPrice ? 'disabled' : ''}>
                            ACQUISTA
                        </button>
                    </div>
                </div>

                <!-- Info -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="font-semibold text-white mb-2">Probabilita Rarita</h4>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-300">⚪ Base</span>
                            <div class="flex items-center gap-2">
                                <div class="w-32 bg-gray-700 rounded-full h-2">
                                    <div class="bg-gray-500 h-2 rounded-full" style="width: 70%"></div>
                                </div>
                                <span class="text-gray-400 text-sm">70%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-blue-300">🔵 Shiny</span>
                            <div class="flex items-center gap-2">
                                <div class="w-32 bg-gray-700 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full" style="width: 25%"></div>
                                </div>
                                <span class="text-gray-400 text-sm">25%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-yellow-300">🟡 Gold</span>
                            <div class="flex items-center gap-2">
                                <div class="w-32 bg-gray-700 rounded-full h-2">
                                    <div class="bg-yellow-500 h-2 rounded-full" style="width: 5%"></div>
                                </div>
                                <span class="text-gray-400 text-sm">5%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Container risultato apertura -->
                <div id="pack-result" class="hidden"></div>
            </div>
        `;

        // Bind buttons
        document.getElementById('btn-free-pack')?.addEventListener('click', () => this.openPack(true));
        document.getElementById('btn-buy-pack')?.addEventListener('click', () => this.openPack(false));
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
                base: 'border-gray-500 bg-gray-800',
                shiny: 'border-blue-500 bg-blue-900/30',
                gold: 'border-yellow-500 bg-yellow-900/30'
            };

            html += `
                <div class="rounded-lg p-2 ${rarityColors[fig.rarity]} border-2 text-center">
                    <img src="${fig.iconaPhoto || 'https://placehold.co/80x80/1f2937/6b7280?text=?'}"
                         alt="${fig.iconaName}"
                         class="w-16 h-16 mx-auto rounded object-cover mb-1"
                         onerror="this.src='https://placehold.co/80x80/1f2937/6b7280?text=?'">
                    <p class="text-xs font-semibold text-white truncate">${fig.iconaName}</p>
                    <p class="text-xs ${fig.rarity === 'gold' ? 'text-yellow-400' : (fig.rarity === 'shiny' ? 'text-blue-400' : 'text-gray-400')}">${fig.rarityInfo.name}</p>
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
    },

    /**
     * Renderizza scambi
     */
    async renderTrades() {
        const content = document.getElementById('figurine-content');
        const teamId = window.InterfacciaCore?.currentTeamId;

        content.innerHTML = '<p class="text-center text-gray-400">Caricamento scambi...</p>';

        const trades = await window.FigurineSystem.getOpenTrades(teamId);

        let html = `
            <div class="space-y-4">
                <button id="btn-new-trade" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition">
                    + Proponi Nuovo Scambio
                </button>

                <h3 class="font-semibold text-white">Scambi Disponibili</h3>
        `;

        if (trades.length === 0) {
            html += '<p class="text-center text-gray-400 py-8">Nessuno scambio disponibile</p>';
        } else {
            trades.forEach(trade => {
                const offerIcona = window.FigurineSystem.getIconaById(trade.offer.iconaId);
                const wantedIcona = window.FigurineSystem.getIconaById(trade.wanted.iconaId);

                html += `
                    <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <div class="text-center">
                                    <img src="${offerIcona?.photoUrl || ''}" class="w-12 h-12 rounded object-cover mx-auto"
                                         onerror="this.src='https://placehold.co/48x48/1f2937/6b7280?text=?'">
                                    <p class="text-xs text-gray-300">${offerIcona?.name || '?'}</p>
                                    <p class="text-xs text-${trade.offer.rarity === 'gold' ? 'yellow' : (trade.offer.rarity === 'shiny' ? 'blue' : 'gray')}-400">${trade.offer.rarity}</p>
                                </div>
                                <span class="text-2xl">➡️</span>
                                <div class="text-center">
                                    <img src="${wantedIcona?.photoUrl || ''}" class="w-12 h-12 rounded object-cover mx-auto"
                                         onerror="this.src='https://placehold.co/48x48/1f2937/6b7280?text=?'">
                                    <p class="text-xs text-gray-300">${wantedIcona?.name || '?'}</p>
                                    <p class="text-xs text-${trade.wanted.rarity === 'gold' ? 'yellow' : (trade.wanted.rarity === 'shiny' ? 'blue' : 'gray')}-400">${trade.wanted.rarity}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-gray-400">da ${trade.fromTeamName}</p>
                                <button class="btn-accept-trade mt-2 bg-green-600 hover:bg-green-500 text-white text-sm px-3 py-1 rounded"
                                        data-trade-id="${trade.id}">
                                    Accetta
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        content.innerHTML = html;

        // Bind eventi
        document.getElementById('btn-new-trade')?.addEventListener('click', () => this.showNewTradeForm());
        document.querySelectorAll('.btn-accept-trade').forEach(btn => {
            btn.addEventListener('click', () => this.acceptTrade(btn.dataset.tradeId));
        });
    },

    /**
     * Mostra form nuovo scambio
     */
    showNewTradeForm() {
        // Implementazione semplificata
        alert('Funzionalita scambi in arrivo!');
    },

    /**
     * Accetta scambio
     */
    async acceptTrade(tradeId) {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        if (!confirm('Accettare questo scambio?')) return;

        try {
            await window.FigurineSystem.acceptTrade(tradeId, teamId);
            alert('Scambio completato!');
            await this.loadAlbum();
            this.renderTrades();
        } catch (error) {
            alert('Errore: ' + error.message);
        }
    },

    /**
     * Renderizza duplicati
     */
    renderDuplicates() {
        const content = document.getElementById('figurine-content');
        const collection = this.currentAlbum?.collection || {};
        const duplicates = window.FigurineSystem.getDuplicates(collection);

        let html = '<div class="space-y-4">';

        if (duplicates.length === 0) {
            html += '<p class="text-center text-gray-400 py-8">Nessun duplicato da vendere</p>';
        } else {
            html += '<p class="text-sm text-gray-400 mb-2">Vendi i duplicati per guadagnare CS (tieni sempre almeno 1 copia)</p>';

            duplicates.forEach(dup => {
                html += `
                    <div class="bg-gray-800 rounded-lg p-3 border border-gray-700 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <img src="${dup.iconaPhoto || ''}" class="w-12 h-12 rounded object-cover"
                                 onerror="this.src='https://placehold.co/48x48/1f2937/6b7280?text=?'">
                            <div>
                                <p class="text-white font-semibold">${dup.iconaName}</p>
                                <p class="text-sm text-${dup.rarity === 'gold' ? 'yellow' : (dup.rarity === 'shiny' ? 'blue' : 'gray')}-400">${dup.rarityInfo.name} x${dup.duplicateCount}</p>
                            </div>
                        </div>
                        <button class="btn-sell-dup bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded-lg"
                                data-icona="${dup.iconaId}" data-rarity="${dup.rarity}">
                            Vendi +${dup.rarityInfo.sellValue} CS
                        </button>
                    </div>
                `;
            });
        }

        html += '</div>';
        content.innerHTML = html;

        // Bind eventi
        document.querySelectorAll('.btn-sell-dup').forEach(btn => {
            btn.addEventListener('click', () => this.sellDuplicate(btn.dataset.icona, btn.dataset.rarity));
        });
    },

    /**
     * Vende duplicato
     */
    async sellDuplicate(iconaId, rarity) {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            const result = await window.FigurineSystem.sellDuplicate(teamId, iconaId, rarity);
            await this.loadAlbum();
            this.updateStats();
            this.renderDuplicates();
        } catch (error) {
            alert('Errore: ' + error.message);
        }
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
