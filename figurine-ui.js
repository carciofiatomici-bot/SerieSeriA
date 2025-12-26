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
    expandedCollections: {}, // Collezioni espanse (tutte chiuse di default)

    /**
     * Formatta il tempo rimanente in ore e minuti
     * @param {object} timeLeft - Oggetto con { hours, minutes, seconds }
     */
    formatTimeLeft(timeLeft) {
        if (!timeLeft) return '--:--';
        const hours = timeLeft.hours || 0;
        const minutes = timeLeft.minutes || 0;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    },

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
            <div class="absolute inset-0 bg-black/90 backdrop-blur-sm" id="figurine-overlay"></div>

            <!-- Container - Full screen mobile -->
            <div class="relative h-full flex flex-col sm:items-center sm:justify-center sm:p-4">
                <div class="bg-gray-900 w-full h-full sm:h-auto sm:rounded-2xl sm:max-w-2xl sm:max-h-[90vh] overflow-hidden border-0 sm:border border-purple-500/30 shadow-2xl flex flex-col">

                    <!-- Header - Sticky & Compact -->
                    <div class="sticky top-0 z-20 bg-gradient-to-r from-purple-900/95 via-indigo-900/95 to-purple-900/95 backdrop-blur-md border-b border-purple-500/30">
                        <div class="px-3 py-2.5 flex items-center justify-between gap-3">
                            <!-- Close + Title -->
                            <div class="flex items-center gap-2.5 min-w-0">
                                <button id="figurine-close" class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-600/80 hover:bg-red-500 text-white rounded-lg transition shadow-lg">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                                <div class="min-w-0">
                                    <h2 class="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 truncate">
                                        <span>🎴</span> <span class="bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">Album Figurine</span>
                                    </h2>
                                </div>
                            </div>
                            <!-- Free Pack Indicator -->
                            <div id="figurine-free-pack" class="flex-shrink-0 text-xs"></div>
                        </div>

                        <!-- Stats Row - Compact -->
                        <div class="px-3 pb-2">
                            <div class="flex items-center gap-2 text-[10px] sm:text-xs">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-1.5 mb-1">
                                        <span id="figurine-progress" class="text-purple-300 font-semibold">0%</span>
                                        <span class="text-gray-500">|</span>
                                        <span id="figurine-count" class="text-gray-400">0/64</span>
                                    </div>
                                    <div class="bg-gray-800/80 rounded-full h-1.5 overflow-hidden">
                                        <div id="figurine-progress-bar" class="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 h-full transition-all duration-500 relative" style="width: 0%">
                                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-shrink-0 flex items-center gap-2 pl-2 border-l border-gray-700">
                                    <span id="figurine-exp-bonus" class="text-teal-400 font-medium" title="Bonus EXP">📈+0%</span>
                                    <span id="figurine-mod-bonus" class="text-yellow-400 font-medium" title="Bonus Mod">⚔️+0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs - Pill Style -->
                    <div class="px-3 py-2 bg-gray-900/80 border-b border-gray-800">
                        <div class="flex gap-1 bg-gray-800/50 rounded-xl p-1">
                            <button class="figurine-tab flex-1 py-2 px-2 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition rounded-lg" data-tab="album">
                                📖 Album
                            </button>
                            <button class="figurine-tab flex-1 py-2 px-2 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition rounded-lg" data-tab="pack">
                                📦 Pacchetti
                            </button>
                            <button class="figurine-tab flex-1 py-2 px-2 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition rounded-lg" data-tab="trades">
                                🔄 Scambi
                            </button>
                        </div>
                    </div>

                    <!-- Content -->
                    <div id="figurine-content" class="flex-1 overflow-y-auto p-3 sm:p-4">
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
            window.Toast?.warning('Album Figurine non disponibile');
            return;
        }

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) {
            window.Toast?.warning('Seleziona prima una squadra');
            return;
        }

        // Crea modal se non esiste ancora
        if (!document.getElementById('figurine-modal')) {
            this.createModal();
            this.bindEvents();
        }

        document.getElementById('figurine-modal')?.classList.remove('hidden');
        this.isOpen = true;

        // Carica le rarita delle figurine da Firestore (forza refresh per avere dati aggiornati)
        await window.FigurineSystem.loadFigurineRarities(true);

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

        const collections = this.currentAlbum.collections || { icone: this.currentAlbum.collection };
        const maxFigurine = window.FigurineSystem.getTotalFigurineCount();
        const unique = window.FigurineSystem.countAllCollectionsUnique(collections);
        const percentage = window.FigurineSystem.getGlobalCompletionPercentage(collections);

        const progressEl = document.getElementById('figurine-progress');
        const countEl = document.getElementById('figurine-count');
        const progressBarEl = document.getElementById('figurine-progress-bar');
        const freePackEl = document.getElementById('figurine-free-pack');
        const expBonusEl = document.getElementById('figurine-exp-bonus');
        const modBonusEl = document.getElementById('figurine-mod-bonus');

        // Compact format
        if (progressEl) progressEl.textContent = `${percentage}%`;
        if (countEl) countEl.textContent = `${unique}/${maxFigurine}`;
        if (progressBarEl) progressBarEl.style.width = `${percentage}%`;

        // Calcola bonus EXP: +0.1% per figurina unica
        const expBonusPercent = (unique * 0.1).toFixed(1);
        if (expBonusEl) expBonusEl.textContent = `📈+${expBonusPercent}%`;

        // Calcola bonus Mod partita: +0.01 per figurina unica
        const modBonus = (unique * 0.01).toFixed(2);
        if (modBonusEl) modBonusEl.textContent = `⚔️+${modBonus}`;

        // Free pack - emoji quando disponibile, altrimenti countdown
        const canFree = window.FigurineSystem.canOpenFreePack(this.currentAlbum);
        if (freePackEl) {
            if (canFree) {
                freePackEl.innerHTML = '<span class="text-xl animate-bounce">🎁</span>';
            } else {
                // Mostra countdown nel header
                const timeLeft = window.FigurineSystem.getTimeUntilFreePack(this.currentAlbum);
                if (timeLeft > 0) {
                    freePackEl.innerHTML = `<span class="text-yellow-400 font-mono text-xs">🎁 ${this.formatTimeLeft(timeLeft)}</span>`;
                } else {
                    freePackEl.innerHTML = '';
                }
            }
        }
    },

    /**
     * Cambia tab
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Aggiorna stile tabs - pill style
        document.querySelectorAll('.figurine-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('bg-purple-600', 'text-white', 'shadow-lg');
                tab.classList.remove('text-gray-400', 'bg-transparent');
            } else {
                tab.classList.remove('bg-purple-600', 'text-white', 'shadow-lg');
                tab.classList.add('text-gray-400', 'bg-transparent');
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
        }
    },

    /**
     * Renderizza album con menu a scomparsa per collezioni
     */
    renderAlbum() {
        const content = document.getElementById('figurine-content');
        const collections = window.FigurineSystem.COLLECTIONS;

        let html = '<div class="space-y-2">';

        // Renderizza ogni collezione come sezione espandibile
        Object.entries(collections).forEach(([collId, collDef]) => {
            if (!collDef.enabled) return;

            const files = window.FigurineSystem.getCollectionFiles(collId);
            if (Object.keys(files).length === 0 && collId !== 'icone') return;

            const isExpanded = this.expandedCollections[collId];
            const percentage = collId === 'icone'
                ? window.FigurineSystem.getCompletionPercentage(this.currentAlbum?.collection || {})
                : window.FigurineSystem.getCollectionCompletionPercentage(this.currentAlbum?.collections, collId);

            // Progress color based on percentage
            const progressColor = percentage >= 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-purple-500' : 'bg-gray-600';

            html += `
                <div class="rounded-xl overflow-hidden border border-gray-700/50">
                    <!-- Header Collezione (cliccabile) -->
                    <button class="collection-toggle w-full flex items-center gap-3 bg-gray-800/80 hover:bg-gray-700/80 p-2.5 sm:p-3 transition active:scale-[0.99]" data-collection="${collId}">
                        <div class="flex-shrink-0 w-10 h-10 bg-gray-900/80 rounded-lg flex items-center justify-center border border-gray-700">
                            <span class="text-xl">${collDef.icon}</span>
                        </div>
                        <div class="flex-1 min-w-0 text-left">
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-white text-sm truncate">${collDef.name}</h3>
                                <span class="text-xs text-purple-400 font-bold">${percentage}%</span>
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div class="${progressColor} h-full rounded-full transition-all" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                        </div>
                        <span class="flex-shrink-0 text-gray-500 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}">▼</span>
                    </button>

                    <!-- Contenuto Collezione -->
                    <div class="collection-content ${isExpanded ? '' : 'hidden'} bg-gray-900/50" data-collection-content="${collId}">
                        ${this.renderCollectionItems(collId, collDef)}
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Legenda compatta
        html += `
            <div class="mt-3 p-2.5 bg-gray-800/50 rounded-xl border border-gray-700/30">
                <p class="text-[10px] text-gray-500 mb-1.5">Tocca una figurina per i dettagli</p>
                <div class="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-gray-400"></span><span class="text-gray-400">C</span></span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span><span class="text-green-400">NC</span></span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span><span class="text-blue-400">R</span></span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-purple-500"></span><span class="text-purple-400">E</span></span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-yellow-400"></span><span class="text-yellow-400">L</span></span>
                </div>
            </div>
        `;

        content.innerHTML = html;

        // Event listener per toggle collezioni
        content.querySelectorAll('.collection-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const collId = btn.dataset.collection;
                this.toggleCollection(collId);
            });
        });

        // Event listener per toggle sottocategorie illustrazioni
        content.querySelectorAll('.category-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const categoryContent = btn.nextElementSibling;
                const arrow = btn.querySelector('.category-arrow');
                if (categoryContent) {
                    categoryContent.classList.toggle('hidden');
                }
                if (arrow) {
                    arrow.classList.toggle('rotate-180');
                }
            });
        });

        // Event listener per aprire il modal delle varianti
        content.querySelectorAll('.figurine-card').forEach(card => {
            card.addEventListener('click', () => {
                const iconaId = card.dataset.iconaId;
                const iconaName = card.dataset.iconaName;
                const collectionId = card.dataset.collectionId;
                this.showVariantsModal(iconaId, iconaName, collectionId);
            });
        });
    },

    /**
     * Toggle espansione collezione
     */
    toggleCollection(collId) {
        this.expandedCollections[collId] = !this.expandedCollections[collId];
        const contentEl = document.querySelector(`[data-collection-content="${collId}"]`);
        const arrowEl = document.querySelector(`[data-collection="${collId}"] span:last-child`);

        if (contentEl) {
            contentEl.classList.toggle('hidden');
        }
        if (arrowEl) {
            arrowEl.classList.toggle('rotate-180');
        }
    },

    /**
     * Renderizza items di una collezione specifica
     */
    renderCollectionItems(collId, collDef) {
        if (collId === 'icone') {
            return this.renderIconeCollection();
        }

        // Per altre collezioni (base only)
        const files = window.FigurineSystem.getCollectionFiles(collId);
        const albumColl = this.currentAlbum?.collections?.[collId] || {};

        if (Object.keys(files).length === 0) {
            return `<div class="p-4 text-center text-gray-500">Collezione in arrivo...</div>`;
        }

        // Collezioni senza anteprima (mostra ? se non posseduta): giocatori_seri, figurine_utenti
        const noPreviewCollections = ['giocatori_seri', 'figurine_utenti'];
        if (noPreviewCollections.includes(collId)) {
            const collIcon = collDef.icon || '🎴';
            let html = '<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-3">';
            Object.entries(files).forEach(([itemId, itemFiles]) => {
                const counts = albumColl[itemId] || { base: 0 };
                const hasAny = counts.base > 0;
                const displayName = itemFiles.name || itemId;

                // Ottieni rarita e colori
                const rarityLevel = window.FigurineSystem.getFigurineRarity(collId, itemId);
                const rarityInfo = window.FigurineSystem.getRarityInfo(rarityLevel);
                const borderClass = hasAny ? rarityInfo.cssClass : 'border-gray-700';
                const textClass = hasAny ? rarityInfo.textClass : 'text-gray-500';

                html += `
                    <div class="figurine-card bg-gray-800 rounded-lg p-2 border-2 ${borderClass} cursor-pointer hover:bg-gray-700 transition text-center relative"
                         data-icona-id="${itemId}" data-icona-name="${displayName}" data-collection-id="${collId}">
                        <div class="aspect-square rounded bg-gray-700 flex items-center justify-center mb-1 relative">
                            ${hasAny
                                ? `<span class="text-2xl">${collIcon}</span>`
                                : `<span class="text-3xl text-gray-500 font-bold">?</span>`
                            }
                            <span class="absolute bottom-0 left-0 text-sm">${rarityInfo.icon}</span>
                        </div>
                        <p class="text-[10px] font-semibold ${hasAny ? 'text-white' : 'text-gray-500'} truncate">${displayName}</p>
                        ${hasAny ? `<span class="text-[10px] ${textClass}">x${counts.base}</span>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            return html;
        }

        // Collezioni che nascondono immagine se non posseduta (mostra ? se non posseduta, immagine se posseduta)
        const hideWhenNotOwnedCollections = ['illustrazioni'];
        if (hideWhenNotOwnedCollections.includes(collId)) {
            // Raggruppa per categoria
            const categories = window.FigurineSystem.ILLUSTRAZIONI_CATEGORIES || [{ id: null, name: 'Generali', icon: '🖼️' }];
            const groupedItems = {};

            // Inizializza gruppi
            categories.forEach(cat => {
                groupedItems[cat.id === null ? '__main__' : cat.id] = [];
            });

            // Raggruppa items per categoria
            Object.entries(files).forEach(([itemId, itemFiles]) => {
                const category = itemFiles.category || null;
                const key = category === null ? '__main__' : category;
                if (!groupedItems[key]) groupedItems[key] = [];
                groupedItems[key].push({ itemId, ...itemFiles });
            });

            let html = '<div class="p-3 space-y-4">';

            categories.forEach(cat => {
                const key = cat.id === null ? '__main__' : cat.id;
                const items = groupedItems[key] || [];
                if (items.length === 0) return;

                // Conta possedute
                const ownedCount = items.filter(item => (albumColl[item.itemId]?.base || 0) > 0).length;

                html += `
                    <div class="illustrazioni-category">
                        <button class="category-toggle w-full flex items-center justify-between p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                                data-category="${key}">
                            <span class="font-bold text-white flex items-center gap-2">
                                ${cat.icon} ${cat.name}
                                <span class="text-xs text-gray-400">(${ownedCount}/${items.length})</span>
                            </span>
                            <span class="category-arrow text-gray-400 transition-transform ${key === '__main__' ? '' : 'rotate-180'}">▼</span>
                        </button>
                        <div class="category-content ${key === '__main__' ? '' : 'hidden'} mt-2">
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                `;

                items.forEach(item => {
                    const counts = albumColl[item.itemId] || { base: 0 };
                    const hasAny = counts.base > 0;
                    const displayName = item.name || item.itemId;
                    const imgUrl = item.customUrl || `${collDef.baseUrl}${encodeURIComponent(item.base || '')}`;

                    // Ottieni rarita e colori
                    const rarityLevel = window.FigurineSystem.getFigurineRarity(collId, item.itemId);
                    const rarityInfo = window.FigurineSystem.getRarityInfo(rarityLevel);
                    const borderClass = hasAny ? rarityInfo.cssClass : 'border-gray-700';
                    const textClass = hasAny ? rarityInfo.textClass : 'text-gray-500';

                    html += `
                        <div class="figurine-card bg-gray-800 rounded-lg p-2 border-2 ${borderClass} relative cursor-pointer hover:bg-gray-700 transition"
                             data-icona-id="${item.itemId}" data-icona-name="${displayName}" data-collection-id="${collId}">
                            <div class="aspect-square rounded overflow-hidden mb-2 relative">
                                ${hasAny
                                    ? `<img src="${imgUrl}" alt="${displayName}" class="w-full h-full object-cover"
                                         onerror="this.src='https://placehold.co/100x100/1f2937/6b7280?text=?'">`
                                    : `<div class="w-full h-full bg-gray-700 flex items-center justify-center">
                                         <span class="text-4xl text-gray-500 font-bold">?</span>
                                       </div>`
                                }
                                <span class="absolute bottom-0 left-0 text-sm">${rarityInfo.icon}</span>
                            </div>
                            <p class="text-xs font-semibold ${hasAny ? 'text-white' : 'text-gray-500'} text-center truncate mb-1">${displayName}</p>
                            ${hasAny ? `<span class="text-[10px] ${textClass} block text-center">x${counts.base}</span>` : ''}
                        </div>
                    `;
                });

                html += `
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            return html;
        }

        // Altre collezioni con anteprima (sempre visibile)
        let html = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">';

        Object.entries(files).forEach(([itemId, itemFiles]) => {
            const counts = albumColl[itemId] || { base: 0 };
            const hasAny = counts.base > 0;
            const imgUrl = itemFiles.customUrl || `${collDef.baseUrl}${encodeURIComponent(itemFiles.base || '')}`;

            html += `
                <div class="figurine-card bg-gray-800 rounded-lg p-2 border ${hasAny ? 'border-emerald-500' : 'border-gray-700'} relative cursor-pointer hover:bg-gray-700 transition"
                     data-icona-id="${itemId}" data-icona-name="${itemId}" data-collection-id="${collId}">
                    <div class="aspect-square rounded overflow-hidden mb-2 ${!hasAny ? 'opacity-30 grayscale' : ''}">
                        <img src="${imgUrl}" alt="${itemId}" class="w-full h-full object-cover"
                             onerror="this.src='https://placehold.co/100x100/1f2937/6b7280?text=?'">
                    </div>
                    <p class="text-xs font-semibold text-white text-center truncate mb-1">${itemId}</p>
                    <div class="flex justify-center">
                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs ${hasAny ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-500'}">
                            ${hasAny ? counts.base : '○'}
                        </span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Renderizza collezione Icone (5 varianti)
     */
    renderIconeCollection() {
        const icone = window.FigurineSystem.getIconeList();
        const collection = this.currentAlbum?.collection || {};

        // Mapping variante -> icona rarita
        const variantRarityIcons = {
            normale: '⚪',
            evoluto: '🟢',
            alternative: '🔵',
            ultimate: '🟣',
            fantasy: '🟠'
        };

        let html = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">';

        icone.forEach(icona => {
            const counts = collection[icona.id] || { normale: 0, evoluto: 0, alternative: 0, ultimate: 0, fantasy: 0 };
            const hasAny = counts.normale > 0 || counts.evoluto > 0 || counts.alternative > 0 || counts.ultimate > 0 || counts.fantasy > 0;
            const isComplete = counts.normale > 0 && counts.evoluto > 0 && counts.alternative > 0 && counts.ultimate > 0 && counts.fantasy > 0;

            // Calcola la rarita piu alta posseduta
            let highestRarityIcon = '⚪'; // Default: Normale
            if (counts.fantasy > 0) highestRarityIcon = '🟠';
            else if (counts.ultimate > 0) highestRarityIcon = '🟣';
            else if (counts.alternative > 0) highestRarityIcon = '🔵';
            else if (counts.evoluto > 0) highestRarityIcon = '🟢';
            else if (counts.normale > 0) highestRarityIcon = '⚪';

            const figurineImg = window.FigurineSystem.getFigurineImageUrl(icona.id, 'normale');
            const imgSrc = figurineImg || icona.photoUrl || 'https://placehold.co/100x100/1f2937/6b7280?text=?';

            html += `
                <div class="figurine-card bg-gray-800 rounded-lg p-2 border ${isComplete ? 'border-yellow-500' : (hasAny ? 'border-purple-600' : 'border-gray-700')} relative cursor-pointer hover:bg-gray-700 transition"
                     data-icona-id="${icona.id}" data-icona-name="${icona.name}" data-collection-id="icone">
                    ${isComplete ? '<span class="absolute -top-2 -right-2 text-lg">⭐</span>' : ''}

                    <div class="aspect-square rounded overflow-hidden mb-2 relative ${!hasAny ? 'opacity-30 grayscale' : ''}">
                        <img src="${imgSrc}" alt="${icona.name}" class="w-full h-full object-cover"
                             onerror="this.src='${icona.photoUrl || 'https://placehold.co/100x100/1f2937/6b7280?text=?'}'">
                        <span class="absolute bottom-0 left-0 text-sm">${highestRarityIcon}</span>
                    </div>

                    <p class="text-xs font-semibold text-white text-center truncate mb-1">${icona.name}</p>

                    <!-- Varianti (5 tipi) con icone rarita -->
                    <div class="flex justify-center gap-1">
                        <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${counts.normale > 0 ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-500'}" title="Normale: ${counts.normale}">
                            ${counts.normale > 0 ? counts.normale : '○'}
                        </span>
                        <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${counts.evoluto > 0 ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-500'}" title="Evoluto: ${counts.evoluto}">
                            ${counts.evoluto > 0 ? counts.evoluto : '○'}
                        </span>
                        <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${counts.alternative > 0 ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-500'}" title="Alternative: ${counts.alternative}">
                            ${counts.alternative > 0 ? counts.alternative : '○'}
                        </span>
                        <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${counts.ultimate > 0 ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-700 text-gray-500'}" title="Ultimate: ${counts.ultimate}">
                            ${counts.ultimate > 0 ? counts.ultimate : '○'}
                        </span>
                        <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${counts.fantasy > 0 ? 'bg-pink-500 text-white font-bold' : 'bg-gray-700 text-gray-500'}" title="Fantasy: ${counts.fantasy}">
                            ${counts.fantasy > 0 ? counts.fantasy : '○'}
                        </span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Mostra modal con tutte le varianti di una figurina
     */
    showVariantsModal(iconaId, iconaName, collectionId = 'icone') {
        // Rimuovi modal esistente
        document.getElementById('figurine-variants-modal')?.remove();

        const collDef = window.FigurineSystem.COLLECTIONS[collectionId];
        if (!collDef) return;

        // Per collezioni base-only
        if (collectionId !== 'icone') {
            this.showBaseVariantModal(iconaId, iconaName, collectionId);
            return;
        }

        // Per Icone (5 varianti)
        const collection = this.currentAlbum?.collection || {};
        const counts = collection[iconaId] || { normale: 0, evoluto: 0, alternative: 0, ultimate: 0, fantasy: 0 };

        const variants = [
            { id: 'normale', name: 'Normale', color: 'gray', bgColor: 'bg-gray-600', count: counts.normale },
            { id: 'evoluto', name: 'Evoluto', color: 'blue', bgColor: 'bg-blue-600', count: counts.evoluto },
            { id: 'alternative', name: 'Alternative', color: 'purple', bgColor: 'bg-purple-600', count: counts.alternative },
            { id: 'ultimate', name: 'Ultimate', color: 'yellow', bgColor: 'bg-yellow-500', count: counts.ultimate },
            { id: 'fantasy', name: 'Fantasy', color: 'pink', bgColor: 'bg-pink-500', count: counts.fantasy }
        ];

        const icona = window.FigurineSystem.getIconeList().find(i => i.id === iconaId);
        const fallbackImg = icona?.photoUrl || 'https://placehold.co/150x150/1f2937/6b7280?text=?';

        const modal = document.createElement('div');
        modal.id = 'figurine-variants-modal';
        modal.className = 'fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-gray-900 rounded-xl border-2 border-purple-500 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="p-4 bg-gradient-to-r from-purple-800 to-purple-600 rounded-t-xl flex justify-between items-center">
                    <h3 class="text-xl font-bold text-white">${iconaName}</h3>
                    <button id="close-variants-modal" class="text-white hover:text-purple-200 text-2xl">&times;</button>
                </div>

                <!-- Varianti (griglia 5 colonne su desktop, 2-3 su mobile) -->
                <div class="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    ${variants.map(v => {
                        const imgUrl = window.FigurineSystem.getFigurineImageUrl(iconaId, v.id) || fallbackImg;
                        const owned = v.count > 0;
                        const isBase = v.id === 'normale';
                        const showImage = owned || isBase;
                        const displayUrl = showImage ? imgUrl : 'https://placehold.co/150x150/1f2937/374151?text=';
                        const bonuses = window.FigurineSystem?.getVariantBonuses(v.id);
                        const bonusText = bonuses?.description || 'Nessun bonus';
                        const isSpecial = v.id === 'ultimate' || v.id === 'fantasy';
                        const bonusTextColor = v.id === 'normale' ? 'text-gray-400' : 'text-green-400';
                        return `
                            <div class="variant-card rounded-lg border-2 ${owned ? `border-${v.color}-500` : 'border-gray-700'} overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                                 data-variant="${v.id}" data-img-url="${showImage ? imgUrl : ''}" data-variant-name="${v.name}" data-owned="${owned}">
                                <div class="aspect-square bg-gray-800 relative">
                                    ${showImage ? `
                                        <img src="${displayUrl}"
                                             alt="${v.name}"
                                             class="w-full h-full object-cover ${!owned && isBase ? 'grayscale brightness-50' : ''}"
                                             onerror="this.src='${fallbackImg}'">
                                    ` : `
                                        <div class="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                                            <span class="text-5xl text-gray-500 font-bold">?</span>
                                        </div>
                                    `}
                                </div>
                                <div class="${owned ? v.bgColor : 'bg-gray-700'} p-2 text-center">
                                    <p class="text-xs font-bold ${isSpecial && owned ? 'text-black' : 'text-white'}">${v.name}</p>
                                    <p class="text-[10px] ${isSpecial && owned ? 'text-gray-800' : 'text-gray-300'}">
                                        ${owned ? `x${v.count}` : '???'}
                                    </p>
                                    <p class="text-[9px] ${isSpecial && owned ? 'text-gray-700' : bonusTextColor} mt-1 leading-tight">
                                        ${bonusText}
                                    </p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <p class="text-center text-xs text-gray-500 px-4 pb-2">Tocca una variante per ingrandirla</p>

                <!-- Footer -->
                <div class="p-4 border-t border-gray-700 text-center">
                    <button id="close-variants-btn" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition">
                        Chiudi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('close-variants-modal').addEventListener('click', () => modal.remove());
        document.getElementById('close-variants-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Click su variante per ingrandire
        modal.querySelectorAll('.variant-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const imgUrl = card.dataset.imgUrl;
                const variantName = card.dataset.variantName;
                const owned = card.dataset.owned === 'true';

                if (!imgUrl) {
                    // Non posseduta e non base
                    window.Toast?.info(`Non possiedi la variante ${variantName}. Trova il pacchetto giusto!`);
                    return;
                }

                this.showFullscreenImage(imgUrl, `${iconaName} - ${variantName}`, owned);
            });
        });
    },

    /**
     * Mostra immagine a schermo intero con opzione sfondo
     */
    showFullscreenImage(imgUrl, title, owned = true, itemId = null) {
        // Rimuovi viewer esistente
        document.getElementById('fullscreen-image-viewer')?.remove();

        // Verifica se e' lo sfondo attuale
        const currentBg = window.InterfacciaCore?.currentTeamData?.dashboardBackground;
        const isCurrentBackground = currentBg?.imageUrl === imgUrl;

        const viewer = document.createElement('div');
        viewer.id = 'fullscreen-image-viewer';
        viewer.className = 'fixed inset-0 bg-black/95 z-[1200] flex items-center justify-center p-4';

        viewer.innerHTML = `
            <div class="relative max-w-full max-h-full flex flex-col items-center" id="fullscreen-content">
                <button id="close-fullscreen-btn" class="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center text-2xl z-10">&times;</button>
                <img src="${imgUrl}" alt="${title}"
                     class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl ${!owned ? 'grayscale brightness-50' : ''}"
                     onerror="this.src='https://placehold.co/400x400/1f2937/6b7280?text=Errore'">
                <p class="mt-4 text-white text-lg font-bold text-center">${title}</p>
                ${!owned ? '<p class="text-yellow-400 text-sm">Anteprima - Non posseduta</p>' : ''}
                ${owned ? `
                    <button id="set-bg-fullscreen-btn" class="${isCurrentBackground
                        ? 'bg-red-600 hover:bg-red-500'
                        : 'bg-purple-600 hover:bg-purple-500'} text-white font-bold py-2 px-4 rounded-lg transition mt-4 flex items-center gap-2">
                        ${isCurrentBackground ? '🚫 Rimuovi sfondo' : '🖼️ Usa come sfondo'}
                    </button>
                ` : ''}
            </div>
        `;

        document.body.appendChild(viewer);

        // Chiudi con X
        document.getElementById('close-fullscreen-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            viewer.remove();
        });

        // Chiudi al click fuori dal contenuto
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer) viewer.remove();
        });

        // Pulsante sfondo
        const bgBtn = document.getElementById('set-bg-fullscreen-btn');
        if (bgBtn) {
            bgBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const teamId = window.InterfacciaCore?.currentTeamId;
                if (!teamId) {
                    window.Toast?.error('Errore: team non trovato');
                    return;
                }

                bgBtn.disabled = true;
                bgBtn.innerHTML = '⏳ Salvataggio...';

                try {
                    if (isCurrentBackground) {
                        // Rimuovi sfondo
                        await window.FigurineSystem.saveDashboardBackground(teamId, null);
                        window.Toast?.success('Sfondo rimosso!');
                    } else {
                        // Imposta sfondo con URL diretto
                        await window.FigurineSystem.saveDashboardBackgroundDirect(teamId, imgUrl, title);
                        window.Toast?.success('Sfondo impostato! Torna alla dashboard per vederlo.');
                    }
                    viewer.remove();
                    window.DashboardBackground?.apply();
                } catch (error) {
                    console.error('[FigurineUI] Errore impostazione sfondo:', error);
                    window.Toast?.error('Errore nel salvataggio dello sfondo');
                    bgBtn.disabled = false;
                    bgBtn.innerHTML = isCurrentBackground ? '🚫 Rimuovi sfondo' : '🖼️ Usa come sfondo';
                }
            });
        }

        // Chiudi con ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                viewer.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    /**
     * Mostra modal per collezioni con singola variante (base)
     */
    showBaseVariantModal(itemId, itemName, collectionId) {
        const collDef = window.FigurineSystem.COLLECTIONS[collectionId];
        const files = window.FigurineSystem.getCollectionFiles(collectionId);
        const albumColl = this.currentAlbum?.collections?.[collectionId] || {};
        const counts = albumColl[itemId] || { base: 0 };
        const owned = counts.base > 0;
        const noPreviewCollections = ['giocatori_seri', 'figurine_utenti'];
        const hideWhenNotOwnedCollections = ['illustrazioni'];
        const hidePreview = noPreviewCollections.includes(collectionId);
        const hideIfNotOwned = hideWhenNotOwnedCollections.includes(collectionId);

        const itemFiles = files[itemId] || {};
        const imgUrl = itemFiles.customUrl || `${collDef.baseUrl}${encodeURIComponent(itemFiles.base || '')}`;

        // Ottieni rarita
        const rarityLevel = window.FigurineSystem.getFigurineRarity(collectionId, itemId);
        const rarityInfo = window.FigurineSystem.getRarityInfo(rarityLevel);

        // Verifica se e' lo sfondo attuale
        const currentBg = window.InterfacciaCore?.currentTeamData?.dashboardBackground;
        const isCurrentBackground = currentBg?.itemId === itemId;

        // Pulsante sfondo (solo per illustrazioni possedute)
        const canSetBackground = collectionId === 'illustrazioni' && owned;

        const modal = document.createElement('div');
        modal.id = 'figurine-variants-modal';
        modal.className = 'fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4';

        // Logica immagine: nascondi sempre per noPreview, nascondi se non posseduta per hideIfNotOwned
        let imageContent = '';
        let canShowFullscreen = false;
        if (!hidePreview) {
            if (hideIfNotOwned && !owned) {
                // Illustrazioni non possedute: mostra ?
                imageContent = `
                    <div class="aspect-square bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                        <span class="text-6xl text-gray-500 font-bold">?</span>
                    </div>
                `;
            } else {
                // Mostra immagine (con grayscale se non posseduta e non hideIfNotOwned)
                canShowFullscreen = true;
                imageContent = `
                    <div id="figurine-image-container" class="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform ${!owned && !hideIfNotOwned ? 'grayscale opacity-50' : ''}"
                         data-img-url="${imgUrl}" data-owned="${owned}">
                        <img src="${imgUrl}" alt="${itemName}" class="w-full h-full object-cover"
                             onerror="this.src='https://placehold.co/200x200/1f2937/6b7280?text=?'">
                    </div>
                    <p class="text-center text-[10px] text-gray-500 mt-1">Tocca l'immagine per ingrandirla</p>
                `;
            }
        }

        modal.innerHTML = `
            <div class="bg-gray-900 rounded-xl border-2 border-emerald-500 max-w-sm w-full overflow-hidden">
                <!-- Header -->
                <div class="p-4 bg-gradient-to-r from-emerald-800 to-emerald-600 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-white">${itemName}</h3>
                    <button id="close-variants-modal" class="text-white hover:text-emerald-200 text-2xl">&times;</button>
                </div>

                <!-- Contenuto -->
                <div class="p-6">
                    ${imageContent}
                    <div class="${hidePreview ? '' : 'mt-4'} text-center">
                        <p class="text-lg font-bold ${owned ? 'text-emerald-400' : 'text-gray-500'}">
                            ${owned ? `Possedute: x${counts.base}` : 'Non posseduta'}
                        </p>
                        <p class="text-xs text-gray-400 mt-1">${collDef.description}</p>
                        <p class="text-xs mt-2">Rarita: <span class="${rarityInfo.textClass}">${rarityInfo.icon} ${rarityInfo.name}</span></p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-4 border-t border-gray-700 text-center space-y-2">
                    ${canSetBackground ? `
                        <button id="set-background-btn" class="${isCurrentBackground
                            ? 'bg-red-600 hover:bg-red-500'
                            : 'bg-purple-600 hover:bg-purple-500'} text-white font-bold py-2 px-4 rounded-lg transition w-full flex items-center justify-center gap-2">
                            ${isCurrentBackground ? '🚫 Rimuovi sfondo' : '🖼️ Usa come sfondo'}
                        </button>
                    ` : ''}
                    <button id="close-variants-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg transition">
                        Chiudi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('close-variants-modal').addEventListener('click', () => modal.remove());
        document.getElementById('close-variants-btn').addEventListener('click', () => modal.remove());

        // Click su immagine per fullscreen
        if (canShowFullscreen) {
            const imgContainer = modal.querySelector('#figurine-image-container');
            if (imgContainer) {
                imgContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const imgUrlData = imgContainer.dataset.imgUrl;
                    const isOwned = imgContainer.dataset.owned === 'true';
                    this.showFullscreenImage(imgUrlData, itemName, isOwned);
                });
            }
        }

        // Pulsante sfondo
        if (canSetBackground) {
            document.getElementById('set-background-btn')?.addEventListener('click', async () => {
                const teamId = window.InterfacciaCore?.currentTeamId;
                if (!teamId) return;

                const btn = document.getElementById('set-background-btn');
                btn.disabled = true;
                btn.innerHTML = '⏳ Salvataggio...';

                try {
                    if (isCurrentBackground) {
                        // Rimuovi sfondo
                        await window.FigurineSystem.saveDashboardBackground(teamId, null);
                        window.Toast?.success('Sfondo rimosso!');
                    } else {
                        // Imposta sfondo
                        await window.FigurineSystem.saveDashboardBackground(teamId, itemId);
                        window.Toast?.success('Sfondo impostato! Torna alla dashboard per vederlo.');
                    }
                    modal.remove();
                    // Aggiorna dashboard se visibile
                    window.DashboardBackground?.apply();
                } catch (error) {
                    console.error('[FigurineUI] Errore impostazione sfondo:', error);
                    window.Toast?.error('Errore nel salvataggio dello sfondo');
                    btn.disabled = false;
                    btn.innerHTML = isCurrentBackground ? '🚫 Rimuovi sfondo' : '🖼️ Usa come sfondo';
                }
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    /**
     * Renderizza pacchetti con collezioni specifiche
     */
    async renderPacks() {
        const content = document.getElementById('figurine-content');
        const config = await window.FigurineSystem.loadConfig();
        const canFree = window.FigurineSystem.canOpenFreePack(this.currentAlbum);
        const timeLeft = window.FigurineSystem.getTimeUntilFreePack(this.currentAlbum);

        // Carica sempre dati freschi per CS/CSS (importante per acquisti recenti)
        const teamId = window.InterfacciaCore?.currentTeamId;
        let teamData = await window.FigurineSystem.getTeamData(teamId);
        // Fallback a currentTeamData se query fallisce
        if (!teamData) {
            teamData = window.InterfacciaCore?.currentTeamData;
            console.warn('[FigurineUI] Fallback a currentTeamData per CS/CSS');
        }
        // Debug: mostra struttura dati team
        console.log('[FigurineUI] teamData per CS/CSS:', {
            teamId,
            budget: teamData?.budget,
            creditiSuperSeri: teamData?.creditiSuperSeri,
            hasTeamData: !!teamData,
            allKeys: teamData ? Object.keys(teamData) : []
        });
        const css = teamData?.creditiSuperSeri || 0;
        const cs = teamData?.budget || 0;
        const collections = window.FigurineSystem.COLLECTIONS;
        const enabledCollections = window.FigurineSystem.getEnabledCollectionsWithItems();
        const collectionPrices = config.collectionPackPrices || { icone: 1, giocatori_seri: 1, allenatori: 1, illustrazioni: 1, figurine_utenti: 1 };
        const csPrice = config.packPriceCS || 150; // Prezzo in CS per pacchetto

        // Calcola duplicati scambiabili (icone con varianti)
        const duplicates = window.FigurineSystem.countTradableDuplicates(this.currentAlbum.collection || {});

        // Calcola duplicati base da tutte le collezioni non-icone
        let baseDuplicates = 0;
        const albumCollections = this.currentAlbum.collections || {};
        Object.entries(albumCollections).forEach(([collId, collData]) => {
            if (collId === 'icone') return; // Icone gestite separatamente
            Object.values(collData || {}).forEach(item => {
                if ((item.base || 0) > 1) {
                    baseDuplicates += item.base - 1;
                }
            });
        });

        const tradeRewards = config.tradeRewards || { normale: 50, evoluto: 75, alternative: 150, ultimate: 300, fantasy: 300, base: 30 };
        const tradeRequired = config.tradeRequiredCount || 3;

        // Bonus chance per pacchetto gratis
        const bonusChance = Math.round((config.freePackChance2 || config.bonusFigurineChance || 0.01) * 100);

        content.innerHTML = `
            <div class="space-y-4">
                <!-- Crediti Disponibili -->
                <div class="bg-gray-800 rounded-lg p-3 flex items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <span class="text-gray-300">💰</span>
                        <span class="text-lg font-bold text-yellow-400">${cs} CS</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-gray-300">💎</span>
                        <span class="text-lg font-bold text-cyan-400">${css} CSS</span>
                    </div>
                </div>

                <!-- Pacchetto Gratis -->
                ${canFree ? `
                <div class="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl p-3 border border-green-500/50">
                    <h3 class="text-sm font-bold text-green-400 mb-2">🎁 Pacchetto Giornaliero</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        ${enabledCollections.map(collId => {
                            const collDef = collections[collId];
                            return `
                                <button class="btn-free-pack-collection bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-2"
                                        data-collection="${collId}">
                                    <span class="text-xl">${collDef.icon}</span>
                                    <span class="text-xs">${collDef.name}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
                ` : `
                <!-- Timer pacchetto gratis -->
                <div class="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-3 border border-gray-600/50">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-bold text-gray-400">🎁 Pacchetto Giornaliero</h3>
                        <div id="free-pack-timer" class="text-right">
                            ${timeLeft ? `
                                <p class="text-xs text-gray-500">Prossimo tra:</p>
                                <p class="text-lg font-bold text-yellow-400" id="free-pack-countdown">${this.formatTimeLeft(timeLeft)}</p>
                            ` : `
                                <p class="text-xs text-gray-500">In attesa...</p>
                            `}
                        </div>
                    </div>
                </div>
                `}

                <!-- Pacchetti per Collezione - Compatto -->
                <div class="bg-gray-800/50 rounded-xl p-2.5 border border-gray-700/50">
                    <h4 class="font-semibold text-white text-xs mb-2 px-1">📦 Pacchetti</h4>
                    <div class="space-y-1.5">
                        ${Object.entries(collections).map(([collId, collDef]) => {
                            if (!collDef.enabled) return '';
                            const files = window.FigurineSystem.getCollectionFiles(collId);
                            if (Object.keys(files).length === 0 && collId !== 'icone') return '';
                            const cssPrice = collectionPrices[collId] || 1;

                            return `
                                <div class="flex items-center gap-2 bg-gray-700/30 p-2 rounded-lg">
                                    <span class="text-lg">${collDef.icon}</span>
                                    <span class="flex-1 font-medium text-white text-xs truncate">${collDef.name}</span>
                                    <button class="btn-collection-pack-cs bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-2 py-1 rounded text-[10px]"
                                            data-collection="${collId}" data-price="${csPrice}" data-currency="cs">
                                        ${csPrice}CS
                                    </button>
                                    <button class="btn-collection-pack-css bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-2 py-1 rounded text-[10px]"
                                            data-collection="${collId}" data-price="${cssPrice}" data-currency="css">
                                        ${cssPrice}CSS
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Probabilita Rarita - Compatto inline -->
                <div class="bg-gray-800/50 rounded-xl p-2.5 border border-gray-700/50">
                    <h4 class="font-semibold text-white text-xs mb-2 px-1">📊 Probabilita</h4>
                    <div class="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[10px]">
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-gray-400"></span><span class="text-gray-400">C 40%</span></span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span><span class="text-green-400">NC 30%</span></span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span><span class="text-blue-400">R 18%</span></span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-purple-500"></span><span class="text-purple-400">E 9%</span></span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-yellow-400"></span><span class="text-yellow-400">L 3%</span></span>
                    </div>
                </div>

                <!-- Container risultato apertura -->
                <div id="pack-result" class="hidden"></div>
            </div>
        `;

        // Bind bottoni pacchetto gratis (scelta collezione)
        document.querySelectorAll('.btn-free-pack-collection').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const collId = e.currentTarget.dataset.collection;
                await this.openFreePackFromCollection(collId);
            });
        });

        // Bind collection pack buttons (con conferma e verifica fondi)
        // Bottoni acquisto con CS
        document.querySelectorAll('.btn-collection-pack-cs').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const collId = e.currentTarget.dataset.collection;
                const price = parseInt(e.currentTarget.dataset.price) || 150;
                const collName = collections[collId]?.name || collId;
                console.log('[FigurineUI] Click CS pack:', collId, price);

                // Verifica fondi - usa currentTeamData già caricato
                let teamData = window.InterfacciaCore?.currentTeamData;
                if (!teamData) {
                    teamData = await window.FigurineSystem.getTeamData(window.InterfacciaCore?.currentTeamId);
                }
                const currentCS = teamData?.budget || 0;
                if (currentCS < price) {
                    window.Toast?.warning(`CS insufficienti! Hai ${currentCS} CS, ne servono ${price}.`);
                    return;
                }

                await this.confirmAndOpenCollectionPack(collId, collName, price, 'cs');
            });
        });

        // Bottoni acquisto con CSS
        document.querySelectorAll('.btn-collection-pack-css').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const collId = e.currentTarget.dataset.collection;
                const price = parseInt(e.currentTarget.dataset.price) || 1;
                const collName = collections[collId]?.name || collId;
                console.log('[FigurineUI] Click CSS pack:', collId, price);

                // Verifica fondi - usa currentTeamData già caricato
                let teamData = window.InterfacciaCore?.currentTeamData;
                if (!teamData) {
                    teamData = await window.FigurineSystem.getTeamData(window.InterfacciaCore?.currentTeamId);
                }
                const currentCSS = teamData?.creditiSuperSeri || 0;
                if (currentCSS < price) {
                    window.Toast?.warning(`CSS insufficienti! Hai ${currentCSS} CSS, ne servono ${price}.`);
                    return;
                }

                await this.confirmAndOpenCollectionPack(collId, collName, price, 'css');
            });
        });

    },

    /**
     * Renderizza tab Scambi Doppioni
     */
    async renderTrades() {
        const content = document.getElementById('figurine-content');
        const config = await window.FigurineSystem.loadConfig();

        // Conta doppioni per LIVELLO DI RARITA' (1-5) da TUTTE le collezioni
        const duplicatesByRarity = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        // 1. Conta doppioni dalle ICONE (usano varianti: normale=1, evoluto=2, etc.)
        const iconeCollection = this.currentAlbum?.collection || {};
        const iconeDuplicates = window.FigurineSystem.countTradableDuplicates(iconeCollection);
        // Mappa varianti icone a livelli rarità
        duplicatesByRarity[1] += iconeDuplicates.normale || 0;   // Comune
        duplicatesByRarity[2] += iconeDuplicates.evoluto || 0;   // Non Comune
        duplicatesByRarity[3] += iconeDuplicates.alternative || 0; // Rara
        duplicatesByRarity[4] += iconeDuplicates.ultimate || 0;  // Epica
        duplicatesByRarity[5] += iconeDuplicates.fantasy || 0;   // Leggendaria

        // 2. Conta doppioni dalle ALTRE COLLEZIONI (usano base come contatore)
        const albumCollections = this.currentAlbum?.collections || {};
        for (const [collId, collData] of Object.entries(albumCollections)) {
            if (collId === 'icone') continue;
            for (const [itemId, item] of Object.entries(collData || {})) {
                const count = item.base || 0;
                if (count > 1) {
                    // Ottieni la rarità della figurina dalla definizione
                    const rarityLevel = window.FigurineSystem?.getFigurineRarity(collId, itemId) || 1;
                    duplicatesByRarity[rarityLevel] += (count - 1);
                }
            }
        }

        const tradeRequired = config.tradeRequiredCount || 3;
        const tradeRewards = config.tradeRewards || {
            normale: 50,
            evoluto: 75,
            alternative: 150,
            ultimate: 200,
            fantasy: 200,
            base: 25
        };

        // Mappa livelli rarità a rewards
        const rarityRewards = {
            1: tradeRewards.normale || 50,    // Comune
            2: tradeRewards.evoluto || 75,    // Non Comune
            3: tradeRewards.alternative || 150, // Rara
            4: tradeRewards.ultimate || 200,  // Epica
            5: tradeRewards.fantasy || 200    // Leggendaria
        };

        content.innerHTML = `
            <div class="space-y-4">
                <!-- Header Scambi -->
                <div class="bg-gradient-to-r from-amber-900/50 to-orange-900/50 rounded-xl p-4 border border-amber-500/50">
                    <h3 class="text-lg font-bold text-amber-400 mb-2">🔄 Scambia Doppioni</h3>
                    <p class="text-sm text-gray-300 mb-3">Scambia ${tradeRequired} figurine duplicate della stessa rarita per ottenere Crediti Seri (CS)!</p>
                    <div class="flex items-center gap-2 text-xs text-gray-400">
                        <span>📊 ${tradeRequired} doppioni = CS</span>
                    </div>
                </div>

                <!-- Griglia Scambi per Rarita -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <!-- Comune (Rarity 1) -->
                    <button data-trade="1" class="trade-btn flex flex-col items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-xl border border-gray-600/50 transition ${duplicatesByRarity[1] < tradeRequired ? 'opacity-40 cursor-not-allowed' : 'hover:border-gray-400'}" ${duplicatesByRarity[1] < tradeRequired ? 'disabled' : ''}>
                        <span class="text-2xl">⚪</span>
                        <span class="text-sm text-gray-300 font-medium">Comune</span>
                        <span class="text-xs text-gray-400">Doppioni: <span class="text-white font-bold">${duplicatesByRarity[1]}</span></span>
                        <span class="text-sm text-amber-400 font-bold">+${rarityRewards[1]} CS</span>
                    </button>

                    <!-- Non Comune (Rarity 2) -->
                    <button data-trade="2" class="trade-btn flex flex-col items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-xl border border-green-600/50 transition ${duplicatesByRarity[2] < tradeRequired ? 'opacity-40 cursor-not-allowed' : 'hover:border-green-400'}" ${duplicatesByRarity[2] < tradeRequired ? 'disabled' : ''}>
                        <span class="text-2xl">🟢</span>
                        <span class="text-sm text-green-300 font-medium">Non Comune</span>
                        <span class="text-xs text-gray-400">Doppioni: <span class="text-white font-bold">${duplicatesByRarity[2]}</span></span>
                        <span class="text-sm text-amber-400 font-bold">+${rarityRewards[2]} CS</span>
                    </button>

                    <!-- Rara (Rarity 3) -->
                    <button data-trade="3" class="trade-btn flex flex-col items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-xl border border-blue-600/50 transition ${duplicatesByRarity[3] < tradeRequired ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-400'}" ${duplicatesByRarity[3] < tradeRequired ? 'disabled' : ''}>
                        <span class="text-2xl">🔵</span>
                        <span class="text-sm text-blue-300 font-medium">Rara</span>
                        <span class="text-xs text-gray-400">Doppioni: <span class="text-white font-bold">${duplicatesByRarity[3]}</span></span>
                        <span class="text-sm text-amber-400 font-bold">+${rarityRewards[3]} CS</span>
                    </button>

                    <!-- Epica (Rarity 4) -->
                    <button data-trade="4" class="trade-btn flex flex-col items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-xl border border-purple-600/50 transition ${duplicatesByRarity[4] < tradeRequired ? 'opacity-40 cursor-not-allowed' : 'hover:border-purple-400'}" ${duplicatesByRarity[4] < tradeRequired ? 'disabled' : ''}>
                        <span class="text-2xl">🟣</span>
                        <span class="text-sm text-purple-300 font-medium">Epica</span>
                        <span class="text-xs text-gray-400">Doppioni: <span class="text-white font-bold">${duplicatesByRarity[4]}</span></span>
                        <span class="text-sm text-amber-400 font-bold">+${rarityRewards[4]} CS</span>
                    </button>

                    <!-- Leggendaria (Rarity 5) -->
                    <button data-trade="5" class="trade-btn flex flex-col items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-xl border border-yellow-600/50 transition ${duplicatesByRarity[5] < tradeRequired ? 'opacity-40 cursor-not-allowed' : 'hover:border-yellow-400'}" ${duplicatesByRarity[5] < tradeRequired ? 'disabled' : ''}>
                        <span class="text-2xl">🟠</span>
                        <span class="text-sm text-yellow-300 font-medium">Leggendaria</span>
                        <span class="text-xs text-gray-400">Doppioni: <span class="text-white font-bold">${duplicatesByRarity[5]}</span></span>
                        <span class="text-sm text-amber-400 font-bold">+${rarityRewards[5]} CS</span>
                    </button>
                </div>

                <!-- Risultato scambio -->
                <p id="trade-result" class="text-center text-sm mt-2"></p>

                <!-- Info -->
                <div class="bg-gray-800/30 rounded-xl p-3 border border-gray-700/50 text-xs text-gray-400">
                    <p class="flex items-center gap-2">
                        <span>💡</span>
                        <span>I doppioni sono figurine che possiedi piu di una volta per la stessa rarita. Scambiane ${tradeRequired} per ottenere CS!</span>
                    </p>
                </div>
            </div>
        `;

        // Bind trade buttons
        content.querySelectorAll('.trade-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (btn.disabled || btn.classList.contains('opacity-40')) {
                    window.Toast?.info('Non hai abbastanza doppioni per questo scambio');
                    return;
                }
                const rarity = btn.dataset.trade;
                if (!rarity) return;
                await this.tradeDuplicates(rarity);
            });
        });
    },

    /**
     * Mostra conferma e apre pacchetto collezione specifica
     * @param {string} currency - 'cs' o 'css'
     */
    async confirmAndOpenCollectionPack(collectionId, collectionName, price, currency = 'css') {
        const currencyLabel = currency === 'cs' ? 'CS' : 'CSS';
        const currencyName = currency === 'cs' ? 'Crediti Seri' : 'Crediti Super Seri';

        // Usa ConfirmDialog se disponibile, altrimenti confirm nativo
        const confirmed = window.ConfirmDialog
            ? await window.ConfirmDialog.show({
                title: 'Conferma Acquisto',
                message: `Vuoi acquistare un pacchetto ${collectionName} per ${price} ${currencyLabel}?`,
                confirmText: 'Acquista',
                cancelText: 'Annulla',
                type: 'warning'
            })
            : confirm(`Vuoi acquistare un pacchetto ${collectionName} per ${price} ${currencyLabel}?`);

        if (confirmed) {
            await this.openCollectionPack(collectionId, currency);
        }
    },

    /**
     * Apre pacchetto di una collezione specifica
     * @param {string} currency - 'cs' o 'css'
     */
    async openCollectionPack(collectionId, currency = 'css') {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            const result = await window.FigurineSystem.openCollectionPack(teamId, collectionId, currency);
            this.currentAlbum = result.album;
            this.updateStats();
            this.showPackResult(result);
        } catch (error) {
            window.Toast?.error(error.message);
        }
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
                resultEl.className = 'text-center text-[10px] mt-1.5 text-red-400';
            }
            return;
        }

        // Mostra loading
        if (resultEl) {
            resultEl.textContent = 'Scambio in corso...';
            resultEl.className = 'text-center text-[10px] mt-1.5 text-gray-400 animate-pulse';
        }

        try {
            const result = await window.FigurineSystem.tradeAllDuplicates(teamId, rarity);

            if (result.success) {
                if (resultEl) {
                    resultEl.textContent = result.message;
                    resultEl.className = 'text-center text-[10px] mt-1.5 text-green-400 font-semibold';
                }
                window.Toast?.success(result.message);

                // Aggiorna immediatamente il contatore CS nella UI
                const teamData = await window.FigurineSystem.getTeamData(teamId);
                if (teamData) {
                    // Aggiorna currentTeamData per sincronizzare
                    if (window.InterfacciaCore?.currentTeamData) {
                        window.InterfacciaCore.currentTeamData.budget = teamData.budget;
                    }
                }

                // Ricarica album e UI (questo ricarica tutto incluso il contatore CS)
                this.currentAlbum = await window.FigurineSystem.loadTeamAlbum(teamId);
                await this.renderTrades();
            } else {
                if (resultEl) {
                    resultEl.textContent = result.message;
                    resultEl.className = 'text-center text-[10px] mt-1.5 text-red-400';
                }
                window.Toast?.error(result.message);
            }
        } catch (error) {
            console.error('[FigurineUI] Errore scambio:', error);
            if (resultEl) {
                resultEl.textContent = `Errore: ${error.message}`;
                resultEl.className = 'text-center text-[10px] mt-1.5 text-red-400';
            }
            window.Toast?.error(`Errore scambio: ${error.message}`);
        }
    },

    /**
     * Apre un pacchetto gratis da una collezione specifica
     */
    async openFreePackFromCollection(collectionId) {
        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) return;

        try {
            const result = await window.FigurineSystem.openFreePack(teamId, collectionId);
            this.currentAlbum = result.album;
            this.updateStats();
            this.showPackResult(result);
            this.checkFreePack();
        } catch (error) {
            window.Toast?.error(error.message);
        }
    },

    /**
     * Apre un pacchetto (legacy)
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
            window.Toast?.error(error.message);
        }
    },

    /**
     * Mostra risultato apertura pacchetto in overlay fullscreen
     */
    showPackResult(result) {
        // Rimuovi overlay esistente
        const existing = document.getElementById('pack-result-overlay');
        if (existing) existing.remove();

        const rarityColors = {
            normale: 'from-gray-600 to-gray-800 border-gray-400',
            evoluto: 'from-green-600 to-green-900 border-green-400',
            alternative: 'from-blue-600 to-blue-900 border-blue-400',
            ultimate: 'from-purple-600 to-purple-900 border-purple-400',
            fantasy: 'from-yellow-500 to-amber-700 border-yellow-300',
            base: 'from-emerald-600 to-emerald-900 border-emerald-400'
        };

        const bgGlow = {
            normale: 'shadow-gray-500/50',
            evoluto: 'shadow-green-500/50',
            alternative: 'shadow-blue-500/50',
            ultimate: 'shadow-purple-500/50',
            fantasy: 'shadow-yellow-400/70',
            base: 'shadow-emerald-500/50'
        };

        // Crea overlay
        const overlay = document.createElement('div');
        overlay.id = 'pack-result-overlay';
        overlay.className = 'fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center';
        overlay.style.animation = 'fadeIn 0.3s ease-out';

        const fig = result.figurine[0]; // Mostra la prima carta
        const rarity = fig.rarity || fig.variant || 'base';
        const name = fig.iconaName || fig.itemName || fig.itemId || 'Figurina';
        const imgUrl = fig.imageUrl || fig.iconaPhoto || 'https://placehold.co/200x200/1f2937/6b7280?text=?';
        const rarityName = fig.rarityInfo?.name || rarity;
        const noPreviewCollections = ['giocatori_seri', 'figurine_utenti'];
        const hideImage = noPreviewCollections.includes(fig.collectionId);

        overlay.innerHTML = `
            <div class="text-center p-6 max-w-sm w-full">
                <!-- Titolo -->
                <h2 class="text-3xl font-bold text-white mb-6 animate-pulse">
                    🎉 Hai trovato!
                </h2>

                <!-- Card della figurina -->
                <div class="relative inline-block">
                    <div class="bg-gradient-to-b ${rarityColors[rarity] || rarityColors.base} rounded-2xl p-4 border-4 shadow-2xl ${bgGlow[rarity] || bgGlow.base}"
                         style="animation: cardReveal 0.6s ease-out; min-width: 200px;">
                        <!-- Immagine -->
                        <div class="aspect-square rounded-xl overflow-hidden mb-4 bg-gray-900/50">
                            ${hideImage ? `
                                <div class="w-full h-full flex items-center justify-center">
                                    <span class="text-6xl">⚽</span>
                                </div>
                            ` : `
                                <img src="${imgUrl}"
                                     alt="${name}"
                                     class="w-full h-full object-cover"
                                     onerror="this.src='https://placehold.co/200x200/1f2937/6b7280?text=?'">
                            `}
                        </div>

                        <!-- Nome -->
                        <p class="text-xl font-bold text-white mb-1">${name}</p>

                        <!-- Rarita -->
                        <p class="text-lg font-semibold" style="color: var(--rarity-color, #fff);">
                            ${fig.rarityInfo?.icon || '⭐'} ${rarityName}
                        </p>
                    </div>

                    <!-- Effetto sparkle per rarita alte -->
                    ${['fantasy', 'ultimate'].includes(rarity) ? `
                        <div class="absolute inset-0 pointer-events-none">
                            <div class="absolute top-0 left-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
                            <div class="absolute top-1/4 right-0 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style="animation-delay: 0.3s;"></div>
                            <div class="absolute bottom-1/4 left-0 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style="animation-delay: 0.6s;"></div>
                        </div>
                    ` : ''}
                </div>

                ${result.figurine.length > 1 ? `
                    <p class="text-green-400 font-bold mt-4">🍀 +${result.figurine.length - 1} figurina bonus!</p>
                ` : ''}

                ${result.bonusEarned > 0 ? `
                    <p class="text-green-400 font-bold mt-2">+${result.bonusEarned} CS Bonus!</p>
                ` : ''}

                <!-- Pulsante chiudi -->
                <button id="btn-close-pack-overlay"
                        class="mt-8 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl shadow-lg transform transition hover:scale-105">
                    ✨ Continua
                </button>
            </div>

            <style>
                @keyframes cardReveal {
                    0% { transform: scale(0.5) rotateY(180deg); opacity: 0; }
                    50% { transform: scale(1.1) rotateY(0deg); opacity: 1; }
                    100% { transform: scale(1) rotateY(0deg); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            </style>
        `;

        document.body.appendChild(overlay);

        // Event listener per chiudere
        document.getElementById('btn-close-pack-overlay')?.addEventListener('click', () => {
            overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
            setTimeout(() => {
                overlay.remove();
                this.renderPacks();
            }, 200);
        });

        // Chiudi anche cliccando fuori
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
                setTimeout(() => {
                    overlay.remove();
                    this.renderPacks();
                }, 200);
            }
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

// ====================================================================
// DASHBOARD BACKGROUND - Gestisce lo sfondo personalizzato della dashboard
// ====================================================================

window.DashboardBackground = {
    // Overlay per leggibilita
    OVERLAY_OPACITY: 0.7,

    // Flag per tracciare se lo sfondo e applicato
    _hasBackground: false,

    /**
     * Applica lo sfondo a TUTTA LA PAGINA (body)
     */
    apply() {
        const bg = window.InterfacciaCore?.currentTeamData?.dashboardBackground;

        // Rimuovi sfondo esistente
        this.remove();

        if (!bg?.imageUrl) {
            console.log('[DashboardBackground] Nessuno sfondo impostato');
            return;
        }

        // Applica sfondo al body per coprire tutta la pagina
        document.body.style.backgroundImage = `linear-gradient(rgba(17, 24, 39, ${this.OVERLAY_OPACITY}), rgba(17, 24, 39, ${this.OVERLAY_OPACITY})), url('${bg.imageUrl}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        this._hasBackground = true;

        console.log('[DashboardBackground] Sfondo applicato a body:', bg.itemId);
    },

    /**
     * Rimuove lo sfondo dalla pagina
     */
    remove() {
        if (this._hasBackground) {
            document.body.style.backgroundImage = '';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundRepeat = '';
            document.body.style.backgroundAttachment = '';
            this._hasBackground = false;
        }
    },

    /**
     * Inizializza e applica lo sfondo quando i dati sono pronti
     */
    init() {
        // Applica subito se i dati sono gia disponibili
        if (window.InterfacciaCore?.currentTeamData) {
            this.apply();
        }

        // Ascolta cambi di team/login
        document.addEventListener('teamDataLoaded', () => {
            this.apply();
        });
    }
};

// Init quando DOM pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.DashboardBackground.init();
    }, 1500);
});

console.log('Modulo DashboardBackground caricato.');
