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
    expandedCollections: { icone: true }, // Collezioni espanse

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

        // Crea modal se non esiste ancora
        if (!document.getElementById('figurine-modal')) {
            this.createModal();
            this.bindEvents();
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
        const maxFigurine = icone.length * 5; // 5 varianti per giocatore (inclusa fantasy)
        const unique = window.FigurineSystem.countUniqueFigurine(collection);
        const percentage = window.FigurineSystem.getCompletionPercentage(collection);

        const progressEl = document.getElementById('figurine-progress');
        const countEl = document.getElementById('figurine-count');
        const progressBarEl = document.getElementById('figurine-progress-bar');
        const freePackEl = document.getElementById('figurine-free-pack');

        if (progressEl) progressEl.textContent = `Completamento: ${percentage}%`;
        if (countEl) countEl.textContent = `${unique}/${maxFigurine} figurine`;
        if (progressBarEl) progressBarEl.style.width = `${percentage}%`;

        // Free pack
        const canFree = window.FigurineSystem.canOpenFreePack(this.currentAlbum);
        if (freePackEl) {
            if (canFree) {
                freePackEl.innerHTML = '🎁 Pacchetto GRATIS disponibile!';
                freePackEl.className = 'text-green-400 text-xs font-bold animate-pulse';
            } else {
                const timeLeft = window.FigurineSystem.getTimeUntilFreePack(this.currentAlbum);
                freePackEl.innerHTML = timeLeft ? `Prossimo gratis: ${timeLeft.formatted}` : '';
                freePackEl.className = 'text-gray-400 text-xs';
            }
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
     * Renderizza album con menu a scomparsa per collezioni
     */
    renderAlbum() {
        const content = document.getElementById('figurine-content');
        const collections = window.FigurineSystem.COLLECTIONS;

        let html = '';

        // Renderizza ogni collezione come sezione espandibile
        Object.entries(collections).forEach(([collId, collDef]) => {
            if (!collDef.enabled) return;

            const files = window.FigurineSystem.getCollectionFiles(collId);
            if (Object.keys(files).length === 0 && collId !== 'icone') return; // Salta collezioni vuote (tranne icone)

            const isExpanded = this.expandedCollections[collId];
            const percentage = collId === 'icone'
                ? window.FigurineSystem.getCompletionPercentage(this.currentAlbum?.collection || {})
                : window.FigurineSystem.getCollectionCompletionPercentage(this.currentAlbum?.collections, collId);

            html += `
                <div class="mb-4">
                    <!-- Header Collezione (cliccabile) -->
                    <button class="collection-toggle w-full flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 rounded-lg p-3 transition" data-collection="${collId}">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">${collDef.icon}</span>
                            <div class="text-left">
                                <h3 class="font-bold text-white">${collDef.name}</h3>
                                <p class="text-xs text-gray-400">${collDef.description}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-sm text-purple-400 font-semibold">${percentage}%</span>
                            <span class="text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}">▼</span>
                        </div>
                    </button>

                    <!-- Contenuto Collezione -->
                    <div class="collection-content ${isExpanded ? '' : 'hidden'}" data-collection-content="${collId}">
                        ${this.renderCollectionItems(collId, collDef)}
                    </div>
                </div>
            `;
        });

        // Legenda
        html += `
            <div class="mt-4 p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
                <p class="font-semibold mb-1">Tocca una figurina per vedere tutte le varianti</p>
                <div class="flex flex-wrap gap-2 mt-2">
                    <span><span class="inline-block w-3 h-3 rounded-full bg-gray-500 mr-1"></span> Normale</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span> Evoluto</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1"></span> Alternative</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span> Ultimate</span>
                    <span><span class="inline-block w-3 h-3 rounded-full bg-pink-500 mr-1"></span> Fantasy</span>
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

        // Giocatori Seri: card con ? se non posseduta
        if (collId === 'giocatori_seri') {
            let html = '<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-3">';
            Object.entries(files).forEach(([itemId, itemFiles]) => {
                const counts = albumColl[itemId] || { base: 0 };
                const hasAny = counts.base > 0;
                const displayName = itemFiles.name || itemId;

                html += `
                    <div class="figurine-card bg-gray-800 rounded-lg p-2 border ${hasAny ? 'border-emerald-500' : 'border-gray-700'} cursor-pointer hover:bg-gray-700 transition text-center"
                         data-icona-id="${itemId}" data-icona-name="${displayName}" data-collection-id="${collId}">
                        <div class="aspect-square rounded bg-gray-700 flex items-center justify-center mb-1">
                            ${hasAny
                                ? `<span class="text-2xl">⚽</span>`
                                : `<span class="text-3xl text-gray-500 font-bold">?</span>`
                            }
                        </div>
                        <p class="text-[10px] font-semibold ${hasAny ? 'text-white' : 'text-gray-500'} truncate">${displayName}</p>
                        ${hasAny ? `<span class="text-[10px] text-emerald-400">x${counts.base}</span>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            return html;
        }

        // Altre collezioni con anteprima
        let html = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">';

        Object.entries(files).forEach(([itemId, itemFiles]) => {
            const counts = albumColl[itemId] || { base: 0 };
            const hasAny = counts.base > 0;
            const imgUrl = `${collDef.baseUrl}${encodeURIComponent(itemFiles.base || '')}`;

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

        let html = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">';

        icone.forEach(icona => {
            const counts = collection[icona.id] || { normale: 0, evoluto: 0, alternative: 0, ultimate: 0, fantasy: 0 };
            const hasAny = counts.normale > 0 || counts.evoluto > 0 || counts.alternative > 0 || counts.ultimate > 0 || counts.fantasy > 0;
            const isComplete = counts.normale > 0 && counts.evoluto > 0 && counts.alternative > 0 && counts.ultimate > 0 && counts.fantasy > 0;

            const figurineImg = window.FigurineSystem.getFigurineImageUrl(icona.id, 'normale');
            const imgSrc = figurineImg || icona.photoUrl || 'https://placehold.co/100x100/1f2937/6b7280?text=?';

            html += `
                <div class="figurine-card bg-gray-800 rounded-lg p-2 border ${isComplete ? 'border-yellow-500' : (hasAny ? 'border-purple-600' : 'border-gray-700')} relative cursor-pointer hover:bg-gray-700 transition"
                     data-icona-id="${icona.id}" data-icona-name="${icona.name}" data-collection-id="icone">
                    ${isComplete ? '<span class="absolute -top-2 -right-2 text-lg">⭐</span>' : ''}

                    <div class="aspect-square rounded overflow-hidden mb-2 ${!hasAny ? 'opacity-30 grayscale' : ''}">
                        <img src="${imgSrc}" alt="${icona.name}" class="w-full h-full object-cover"
                             onerror="this.src='${icona.photoUrl || 'https://placehold.co/100x100/1f2937/6b7280?text=?'}'">
                    </div>

                    <p class="text-xs font-semibold text-white text-center truncate mb-1">${icona.name}</p>

                    <!-- Varianti (5 tipi) -->
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
                            <div class="rounded-lg border-2 ${owned ? `border-${v.color}-500` : 'border-gray-700'} overflow-hidden">
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
        const hidePreview = collectionId === 'giocatori_seri';

        const imgUrl = `${collDef.baseUrl}${encodeURIComponent(files[itemId]?.base || '')}`;

        const modal = document.createElement('div');
        modal.id = 'figurine-variants-modal';
        modal.className = 'fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-gray-900 rounded-xl border-2 border-emerald-500 max-w-sm w-full overflow-hidden">
                <!-- Header -->
                <div class="p-4 bg-gradient-to-r from-emerald-800 to-emerald-600 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-white">${itemName}</h3>
                    <button id="close-variants-modal" class="text-white hover:text-emerald-200 text-2xl">&times;</button>
                </div>

                <!-- Contenuto -->
                <div class="p-6">
                    ${hidePreview ? '' : `
                    <div class="aspect-square bg-gray-800 rounded-lg overflow-hidden ${!owned ? 'grayscale opacity-50' : ''}">
                        <img src="${imgUrl}" alt="${itemName}" class="w-full h-full object-cover"
                             onerror="this.src='https://placehold.co/200x200/1f2937/6b7280?text=?'">
                    </div>
                    `}
                    <div class="${hidePreview ? '' : 'mt-4'} text-center">
                        <p class="text-lg font-bold ${owned ? 'text-emerald-400' : 'text-gray-500'}">
                            ${owned ? `Possedute: x${counts.base}` : 'Non posseduta'}
                        </p>
                        <p class="text-xs text-gray-400 mt-1">${collDef.description}</p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-4 border-t border-gray-700 text-center">
                    <button id="close-variants-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg transition">
                        Chiudi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('close-variants-modal').addEventListener('click', () => modal.remove());
        document.getElementById('close-variants-btn').addEventListener('click', () => modal.remove());
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

        const teamData = await window.FigurineSystem.getTeamData(window.InterfacciaCore?.currentTeamId);
        const css = teamData?.creditiSuperSeri || 0;
        const cs = teamData?.creditiSeri || 0;
        const collections = window.FigurineSystem.COLLECTIONS;
        const collectionPrices = config.collectionPackPrices || { icone: 1, giocatori_seri: 1, allenatori: 1, illustrazioni: 1 };
        const csPrice = 150; // Prezzo in CS per pacchetto
        const probs = config.iconeProbabilities || { normale: 50, evoluto: 25, alternative: 12, ultimate: 8, fantasy: 5 };

        // Calcola duplicati scambiabili
        const duplicates = window.FigurineSystem.countTradableDuplicates(this.currentAlbum.collection);
        const tradeRewards = config.tradeRewards || { normale: 50, evoluto: 75, alternative: 150, ultimate: 300, fantasy: 300 };
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
                <div class="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl p-4 border border-green-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-bold text-green-400 flex items-center gap-2">
                                🎁 Pacchetto Giornaliero
                            </h3>
                            <p class="text-sm text-gray-300 mt-1">
                                1 figurina (${100 - bonusChance}%) o 2 (${bonusChance}%) da qualsiasi collezione
                            </p>
                            <p class="text-xs text-gray-500 mt-1">Disponibile ogni ${config.freePackCooldownHours || 4} ore</p>
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

                <!-- Pacchetti per Collezione -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="font-semibold text-white mb-3 flex items-center gap-2">📦 Pacchetti Collezione</h4>
                    <div class="space-y-2">
                        ${Object.entries(collections).map(([collId, collDef]) => {
                            if (!collDef.enabled) return '';
                            const files = window.FigurineSystem.getCollectionFiles(collId);
                            if (Object.keys(files).length === 0 && collId !== 'icone') return '';

                            const cssPrice = collectionPrices[collId] || 1;
                            const canBuyCS = cs >= csPrice;
                            const canBuyCSS = css >= cssPrice;
                            const variantText = collId === 'icone' ? '5 varianti con bonus' : 'variante base';

                            return `
                                <div class="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg flex-wrap gap-2">
                                    <div class="flex items-center gap-3">
                                        <span class="text-2xl">${collDef.icon}</span>
                                        <div>
                                            <p class="font-semibold text-white">${collDef.name}</p>
                                            <p class="text-xs text-gray-400">${variantText}</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button class="btn-collection-pack-cs bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-3 py-2 rounded-lg transition text-sm ${!canBuyCS ? 'opacity-50 cursor-not-allowed' : ''}"
                                                data-collection="${collId}" data-price="${csPrice}" data-currency="cs" ${!canBuyCS ? 'disabled' : ''}>
                                            ${csPrice} CS
                                        </button>
                                        <button class="btn-collection-pack-css bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-2 rounded-lg transition text-sm ${!canBuyCSS ? 'opacity-50 cursor-not-allowed' : ''}"
                                                data-collection="${collId}" data-price="${cssPrice}" data-currency="css" ${!canBuyCSS ? 'disabled' : ''}>
                                            ${cssPrice} CSS
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Probabilita Varianti Icone -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="font-semibold text-white mb-2">Probabilita Varianti (Icone)</h4>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-300 text-sm">⚪ Normale</span>
                            <div class="flex items-center gap-2">
                                <div class="w-24 bg-gray-700 rounded-full h-2">
                                    <div class="bg-gray-500 h-2 rounded-full" style="width: ${probs.normale}%"></div>
                                </div>
                                <span class="text-gray-400 text-xs w-8">${probs.normale}%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-blue-300 text-sm">🔵 Evoluto</span>
                            <div class="flex items-center gap-2">
                                <div class="w-24 bg-gray-700 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${probs.evoluto}%"></div>
                                </div>
                                <span class="text-gray-400 text-xs w-8">${probs.evoluto}%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-purple-300 text-sm">🟣 Alternative</span>
                            <div class="flex items-center gap-2">
                                <div class="w-24 bg-gray-700 rounded-full h-2">
                                    <div class="bg-purple-500 h-2 rounded-full" style="width: ${probs.alternative}%"></div>
                                </div>
                                <span class="text-gray-400 text-xs w-8">${probs.alternative}%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-yellow-300 text-sm">🟡 Ultimate</span>
                            <div class="flex items-center gap-2">
                                <div class="w-24 bg-gray-700 rounded-full h-2">
                                    <div class="bg-yellow-500 h-2 rounded-full" style="width: ${probs.ultimate}%"></div>
                                </div>
                                <span class="text-gray-400 text-xs w-8">${probs.ultimate}%</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-pink-300 text-sm">🩷 Fantasy</span>
                            <div class="flex items-center gap-2">
                                <div class="w-24 bg-gray-700 rounded-full h-2">
                                    <div class="bg-pink-500 h-2 rounded-full" style="width: ${probs.fantasy}%"></div>
                                </div>
                                <span class="text-gray-400 text-xs w-8">${probs.fantasy}%</span>
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
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button data-trade="normale" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.normale < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.normale < tradeRequired ? 'disabled' : ''}>
                            <span class="text-gray-300 text-xs">⚪ ${duplicates.normale}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.normale} CS</span>
                        </button>
                        <button data-trade="evoluto" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.evoluto < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.evoluto < tradeRequired ? 'disabled' : ''}>
                            <span class="text-blue-300 text-xs">🔵 ${duplicates.evoluto}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.evoluto} CS</span>
                        </button>
                        <button data-trade="alternative" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.alternative < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.alternative < tradeRequired ? 'disabled' : ''}>
                            <span class="text-purple-300 text-xs">🟣 ${duplicates.alternative}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.alternative} CS</span>
                        </button>
                        <button data-trade="ultimate" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.ultimate < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.ultimate < tradeRequired ? 'disabled' : ''}>
                            <span class="text-yellow-300 text-xs">🟡 ${duplicates.ultimate}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.ultimate} CS</span>
                        </button>
                        <button data-trade="fantasy" class="trade-btn flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition ${duplicates.fantasy < tradeRequired ? 'opacity-50 cursor-not-allowed' : ''}" ${duplicates.fantasy < tradeRequired ? 'disabled' : ''}>
                            <span class="text-pink-300 text-xs">🩷 ${duplicates.fantasy || 0}</span>
                            <span class="text-amber-400 text-xs font-bold">${tradeRewards.fantasy} CS</span>
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

        // Bind collection pack buttons (con conferma)
        // Bottoni acquisto con CS
        document.querySelectorAll('.btn-collection-pack-cs').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const collId = e.currentTarget.dataset.collection;
                const price = parseInt(e.currentTarget.dataset.price);
                const collName = collections[collId]?.name || collId;
                await this.confirmAndOpenCollectionPack(collId, collName, price, 'cs');
            });
        });

        // Bottoni acquisto con CSS
        document.querySelectorAll('.btn-collection-pack-css').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const collId = e.currentTarget.dataset.collection;
                const price = parseInt(e.currentTarget.dataset.price);
                const collName = collections[collId]?.name || collId;
                await this.confirmAndOpenCollectionPack(collId, collName, price, 'css');
            });
        });

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
            alert(error.message);
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

        const rarityColors = {
            normale: 'border-gray-500 bg-gray-800',
            evoluto: 'border-blue-500 bg-blue-900/30',
            alternative: 'border-purple-500 bg-purple-900/30',
            ultimate: 'border-yellow-500 bg-yellow-900/30',
            fantasy: 'border-pink-500 bg-pink-900/30',
            base: 'border-emerald-500 bg-emerald-900/30'
        };

        const textColors = {
            normale: 'text-gray-400',
            evoluto: 'text-blue-400',
            alternative: 'text-purple-400',
            ultimate: 'text-yellow-400',
            fantasy: 'text-pink-400',
            base: 'text-emerald-400'
        };

        let html = `
            <div class="bg-gradient-to-b from-purple-900 to-gray-900 rounded-xl p-4 border-2 border-purple-400 animate-pulse">
                <h3 class="text-center text-lg font-bold text-white mb-4">🎉 Hai ottenuto:</h3>
                <div class="grid grid-cols-${Math.min(result.figurine.length, 3)} gap-3">
        `;

        result.figurine.forEach(fig => {
            const rarity = fig.rarity || fig.variant || 'base';
            const name = fig.iconaName || fig.itemName || fig.itemId || 'Figurina';
            const imgUrl = fig.imageUrl || fig.iconaPhoto || 'https://placehold.co/80x80/1f2937/6b7280?text=?';
            const rarityName = fig.rarityInfo?.name || rarity;
            const hideImage = fig.collectionId === 'giocatori_seri';

            html += `
                <div class="rounded-lg p-2 ${rarityColors[rarity] || rarityColors.base} border-2 text-center">
                    ${hideImage ? `
                        <div class="w-16 h-16 mx-auto rounded bg-emerald-900/50 flex items-center justify-center mb-1">
                            <span class="text-2xl">⚽</span>
                        </div>
                    ` : `
                        <img src="${imgUrl}"
                             alt="${name}"
                             class="w-16 h-16 mx-auto rounded object-cover mb-1"
                             onerror="this.src='https://placehold.co/80x80/1f2937/6b7280?text=?'">
                    `}
                    <p class="text-xs font-semibold text-white truncate">${name}</p>
                    <p class="text-xs ${textColors[rarity] || textColors.base}">${rarityName}</p>
                </div>
            `;
        });

        html += '</div>';

        if (result.bonusEarned > 0) {
            html += `<p class="text-center text-green-400 font-bold mt-3">+${result.bonusEarned} CS Bonus!</p>`;
        }

        if (result.cssCost) {
            html += `<p class="text-center text-gray-400 text-xs mt-1">-${result.cssCost} CSS</p>`;
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
