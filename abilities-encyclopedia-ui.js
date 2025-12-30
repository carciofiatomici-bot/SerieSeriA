//
// ====================================================================
// ABILITIES-ENCYCLOPEDIA-UI.JS - Interfaccia Enciclopedia Abilita
// ====================================================================
// Mobile-First v2 - Bottom Tab Navigation + Simplified Cards
//

window.AbilitiesUI = {

    currentFilter: 'all',
    currentSearch: '',
    displayLimit: 20,
    currentDisplayCount: 20,
    searchVisible: false,
    expandedCard: null,
    statsVisible: false,

    // Touch gesture state
    touchStartY: 0,
    touchCurrentY: 0,
    isDragging: false,
    overlayElement: null,
    bottomSheetElement: null,

    /**
     * Inject custom styles for mobile UX v2
     */
    injectStyles() {
        if (document.getElementById('abilities-ui-styles-v2')) return;

        const styles = document.createElement('style');
        styles.id = 'abilities-ui-styles-v2';
        styles.textContent = `
            /* ===== ENCICLOPEDIA MOBILE V2 ===== */

            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            @keyframes slideDown {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(100%); opacity: 0; }
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes expandCard {
                from { max-height: 0; opacity: 0; }
                to { max-height: 500px; opacity: 1; }
            }

            @keyframes collapseCard {
                from { max-height: 500px; opacity: 1; }
                to { max-height: 0; opacity: 0; }
            }

            @keyframes pulseRing {
                0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
                70% { box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); }
                100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
            }

            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }

            .enc-overlay-enter {
                animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            .enc-overlay-exit {
                animation: slideDown 0.25s cubic-bezier(0.4, 0, 1, 1) forwards;
            }

            .enc-card-enter {
                animation: fadeIn 0.3s ease-out forwards;
            }

            .enc-expand-enter {
                animation: expandCard 0.3s ease-out forwards;
                overflow: hidden;
            }

            .enc-expand-exit {
                animation: collapseCard 0.2s ease-in forwards;
                overflow: hidden;
            }

            /* Drag handle area */
            .enc-drag-zone {
                cursor: grab;
                touch-action: pan-y;
            }

            .enc-drag-zone:active {
                cursor: grabbing;
            }

            .enc-drag-bar {
                width: 48px;
                height: 5px;
                background: rgba(255,255,255,0.25);
                border-radius: 3px;
                margin: 0 auto;
                transition: background 0.2s, width 0.2s;
            }

            .enc-drag-zone:active .enc-drag-bar {
                background: rgba(139, 92, 246, 0.6);
                width: 64px;
            }

            /* Bottom filter bar */
            .enc-bottom-bar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 60;
                background: linear-gradient(to top, rgba(15,15,25,0.98) 0%, rgba(15,15,25,0.95) 100%);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-top: 1px solid rgba(139, 92, 246, 0.2);
                padding: 8px 4px calc(8px + env(safe-area-inset-bottom, 0px)) 4px;
            }

            .enc-filter-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-width: 44px;
                min-height: 52px;
                padding: 6px 8px;
                border-radius: 12px;
                transition: all 0.2s ease;
                background: transparent;
                border: none;
                cursor: pointer;
                flex: 1;
            }

            .enc-filter-btn:active {
                transform: scale(0.92);
            }

            .enc-filter-btn.active {
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(109, 40, 217, 0.2));
                animation: pulseRing 2s infinite;
            }

            .enc-filter-icon {
                font-size: 20px;
                line-height: 1;
                margin-bottom: 2px;
            }

            .enc-filter-label {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: rgba(255,255,255,0.5);
                transition: color 0.2s;
            }

            .enc-filter-btn.active .enc-filter-label {
                color: #a78bfa;
            }

            /* Simplified ability card */
            .enc-ability-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 16px;
                background: rgba(30, 30, 45, 0.6);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 16px;
                cursor: pointer;
                transition: all 0.2s ease;
                min-height: 56px;
            }

            .enc-ability-item:active {
                transform: scale(0.98);
                background: rgba(40, 40, 60, 0.8);
            }

            .enc-ability-item.expanded {
                background: rgba(50, 40, 70, 0.6);
                border-color: rgba(139, 92, 246, 0.3);
            }

            .enc-ability-icon {
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                font-size: 24px;
                flex-shrink: 0;
            }

            .enc-ability-info {
                flex: 1;
                min-width: 0;
            }

            .enc-ability-name {
                font-size: 15px;
                font-weight: 700;
                color: white;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .enc-ability-meta {
                font-size: 12px;
                color: rgba(255,255,255,0.4);
                margin-top: 2px;
            }

            .enc-rarity-badge {
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                flex-shrink: 0;
            }

            .enc-rarity-comune { background: rgba(100,100,120,0.3); color: #9ca3af; }
            .enc-rarity-rara { background: rgba(139,92,246,0.2); color: #a78bfa; }
            .enc-rarity-leggendaria { background: rgba(239,68,68,0.2); color: #f87171; }
            .enc-rarity-unica { background: rgba(234,179,8,0.2); color: #fbbf24; }

            /* Expanded detail section */
            .enc-detail-section {
                padding: 16px;
                margin-top: 12px;
                background: rgba(0,0,0,0.2);
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.05);
            }

            .enc-detail-row {
                margin-bottom: 12px;
            }

            .enc-detail-row:last-child {
                margin-bottom: 0;
            }

            .enc-detail-label {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: rgba(139, 92, 246, 0.7);
                margin-bottom: 4px;
            }

            .enc-detail-value {
                font-size: 14px;
                color: rgba(255,255,255,0.85);
                line-height: 1.5;
            }

            /* Search bar */
            .enc-search-container {
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .enc-search-container.hidden {
                max-height: 0;
                opacity: 0;
                padding: 0;
                margin: 0;
            }

            .enc-search-container.visible {
                max-height: 60px;
                opacity: 1;
                padding: 0 16px 12px;
            }

            .enc-search-input {
                width: 100%;
                padding: 12px 16px 12px 44px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: white;
                font-size: 15px;
                outline: none;
                transition: all 0.2s;
            }

            .enc-search-input:focus {
                background: rgba(255,255,255,0.08);
                border-color: rgba(139, 92, 246, 0.5);
            }

            .enc-search-input::placeholder {
                color: rgba(255,255,255,0.3);
            }

            /* Stats toggle */
            .enc-stats-toggle {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 10px 16px;
                margin: 0 16px 8px;
                background: rgba(139, 92, 246, 0.1);
                border: 1px solid rgba(139, 92, 246, 0.2);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .enc-stats-toggle:active {
                transform: scale(0.98);
            }

            .enc-stats-panel {
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .enc-stats-panel.hidden {
                max-height: 0;
                opacity: 0;
            }

            .enc-stats-panel.visible {
                max-height: 200px;
                opacity: 1;
            }

            /* Skeleton loader */
            .enc-skeleton {
                background: linear-gradient(90deg, rgba(40,40,55,0.5) 0%, rgba(60,60,80,0.5) 50%, rgba(40,40,55,0.5) 100%);
                background-size: 200% 100%;
                animation: shimmer 1.2s infinite;
                border-radius: 12px;
            }

            /* Touch button base */
            .enc-touch-btn {
                min-width: 44px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.15s;
                border: none;
                background: transparent;
            }

            .enc-touch-btn:active {
                transform: scale(0.9);
            }

            /* Content area with bottom padding for filter bar */
            .enc-content-area {
                padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
            }

            /* Hide scrollbar */
            .enc-scroll-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .enc-scroll-hide::-webkit-scrollbar {
                display: none;
            }

            /* Section header */
            .enc-section-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 16px 16px 8px;
            }

            .enc-section-icon {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                font-size: 16px;
            }

            .enc-section-title {
                font-size: 14px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .enc-section-count {
                font-size: 12px;
                color: rgba(255,255,255,0.4);
                margin-left: auto;
            }
        `;
        document.head.appendChild(styles);
    },

    /**
     * Apre l'enciclopedia
     */
    open() {
        this.injectStyles();
        this.searchVisible = false;
        this.expandedCard = null;
        this.statsVisible = false;
        this.currentDisplayCount = this.displayLimit;

        let overlay = document.getElementById('abilities-encyclopedia-overlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'abilities-encyclopedia-overlay';
            overlay.className = 'fixed inset-0 z-50 hidden overflow-hidden';
            overlay.style.cssText = 'background: linear-gradient(180deg, #0c0a1a 0%, #1a1528 50%, #0c0a1a 100%);';
            document.body.appendChild(overlay);
        }

        this.overlayElement = overlay;

        this.renderSkeleton();
        overlay.classList.remove('hidden');
        overlay.classList.remove('enc-overlay-exit');
        overlay.classList.add('enc-overlay-enter');
        document.body.style.overflow = 'hidden';

        setTimeout(() => this.render(), 100);
    },

    /**
     * Chiude l'enciclopedia
     */
    close() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (overlay) {
            overlay.classList.remove('enc-overlay-enter');
            overlay.classList.add('enc-overlay-exit');

            setTimeout(() => {
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }, 250);
        }
    },

    /**
     * Toggle
     */
    toggle() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            this.close();
        } else {
            this.open();
        }
    },

    /**
     * Skeleton loader
     */
    renderSkeleton() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="h-full flex flex-col">
                <div class="p-4">
                    <div class="enc-skeleton h-6 w-32 mb-4"></div>
                    <div class="enc-skeleton h-12 w-full mb-4"></div>
                </div>
                <div class="flex-1 px-4 space-y-3">
                    ${[1,2,3,4,5,6].map(() => `<div class="enc-skeleton h-16 w-full"></div>`).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render principale - Mobile First v2
     */
    render() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (!overlay) return;

        const stats = window.AbilitiesEncyclopedia.getAbilityStats();
        const abilities = this.getFilteredAbilities();
        const totalCount = abilities.length;
        const displayedAbilities = abilities.slice(0, this.currentDisplayCount);
        const hasMore = totalCount > this.currentDisplayCount;

        overlay.innerHTML = `
            <div class="h-full flex flex-col">

                <!-- HEADER MINIMALE -->
                <div class="enc-drag-zone flex-shrink-0" id="enc-header-drag">
                    <div class="pt-3 pb-2">
                        <div class="enc-drag-bar"></div>
                    </div>

                    <div class="flex items-center justify-between px-4 pb-3">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📔</span>
                            <div>
                                <h1 class="text-lg font-black text-white">Enciclopedia</h1>
                                <p class="text-xs text-violet-400">${stats.total} abilita</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <!-- Search Toggle -->
                            <button onclick="window.AbilitiesUI.toggleSearch()"
                                    class="enc-touch-btn ${this.searchVisible ? 'bg-violet-500/20' : 'bg-white/5'}">
                                <svg class="w-5 h-5 ${this.searchVisible ? 'text-violet-400' : 'text-white/60'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                            </button>

                            <!-- Close -->
                            <button onclick="window.AbilitiesUI.close()"
                                    class="enc-touch-btn bg-white/5 hover:bg-red-500/20">
                                <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- SEARCH BAR (Collapsible) -->
                <div class="enc-search-container ${this.searchVisible ? 'visible' : 'hidden'}">
                    <div class="relative">
                        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input type="text"
                               id="enc-search-input"
                               class="enc-search-input"
                               dir="ltr"
                               autocomplete="off"
                               autocorrect="off"
                               autocapitalize="off"
                               spellcheck="false"
                               placeholder="Cerca abilita..."
                               value="${this.currentSearch}"
                               oninput="window.AbilitiesUI.handleSearch(this.value)">
                        ${this.currentSearch ? `
                            <button onclick="window.AbilitiesUI.clearSearch()"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 enc-touch-btn w-8 h-8">
                                <svg class="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- STATS TOGGLE (Collapsed by default) -->
                <div onclick="window.AbilitiesUI.toggleStats()" class="enc-stats-toggle">
                    <span class="text-sm">📊</span>
                    <span class="text-xs font-bold text-violet-300">Statistiche</span>
                    <svg class="w-4 h-4 text-violet-400 transition-transform ${this.statsVisible ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </div>

                <!-- STATS PANEL -->
                <div class="enc-stats-panel ${this.statsVisible ? 'visible' : 'hidden'}">
                    <div class="grid grid-cols-4 gap-2 px-4 pb-3">
                        <div class="text-center p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                            <div class="text-lg font-black text-violet-400">${stats.total}</div>
                            <div class="text-[10px] text-violet-300/50 font-bold">TOTALI</div>
                        </div>
                        <div class="text-center p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                            <div class="text-lg font-black text-red-400">${stats.byRarity.Leggendaria || 0}</div>
                            <div class="text-[10px] text-red-300/50 font-bold">LEGEND.</div>
                        </div>
                        <div class="text-center p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <div class="text-lg font-black text-purple-400">${stats.byRarity.Rara || 0}</div>
                            <div class="text-[10px] text-purple-300/50 font-bold">RARE</div>
                        </div>
                        <div class="text-center p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                            <div class="text-lg font-black text-yellow-400">${stats.byRarity.Unica || 0}</div>
                            <div class="text-[10px] text-yellow-300/50 font-bold">ICONE</div>
                        </div>
                    </div>
                </div>

                <!-- RESULTS COUNT -->
                <div id="enc-results-count" class="${this.currentSearch || this.currentFilter !== 'all' ? 'px-4 py-2' : 'hidden'}">
                    ${this.currentSearch || this.currentFilter !== 'all' ? `
                        <span class="text-sm text-white/40">
                            <span class="text-violet-400 font-bold">${totalCount}</span> risultat${totalCount === 1 ? 'o' : 'i'}
                            ${this.currentSearch ? ` per "${this.currentSearch}"` : ''}
                        </span>
                    ` : ''}
                </div>

                <!-- CONTENT AREA -->
                <div class="flex-1 overflow-y-auto enc-scroll-hide enc-content-area" id="enc-scroll-area">
                    ${displayedAbilities.length > 0 ? `
                        ${this.renderAbilitiesList(displayedAbilities)}

                        ${hasMore ? `
                            <div class="p-4 text-center">
                                <button onclick="window.AbilitiesUI.loadMore()"
                                        class="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all active:scale-95">
                                    Mostra altre ${Math.min(this.displayLimit, totalCount - this.currentDisplayCount)}
                                </button>
                                <p class="text-xs text-white/30 mt-2">${totalCount - this.currentDisplayCount} rimanenti</p>
                            </div>
                        ` : `
                            <div class="p-4 text-center">
                                <p class="text-xs text-white/20">Fine lista</p>
                            </div>
                        `}
                    ` : `
                        <div class="flex flex-col items-center justify-center h-64 px-8">
                            <span class="text-5xl mb-4">🔍</span>
                            <p class="text-white/60 font-medium text-center mb-2">Nessuna abilita trovata</p>
                            <p class="text-white/30 text-sm text-center mb-4">Prova con altri filtri</p>
                            <button onclick="window.AbilitiesUI.resetFilters()"
                                    class="px-5 py-2 bg-white/10 text-white text-sm font-medium rounded-lg active:scale-95">
                                Reset filtri
                            </button>
                        </div>
                    `}
                </div>

                <!-- BOTTOM FILTER BAR -->
                <div class="enc-bottom-bar">
                    <div class="flex justify-around">
                        ${this.renderFilterButton('all', '✨', 'Tutte')}
                        ${this.renderFilterButton('P', '🧤', 'POR')}
                        ${this.renderFilterButton('D', '🛡️', 'DIF')}
                        ${this.renderFilterButton('C', '⚽', 'CEN')}
                        ${this.renderFilterButton('A', '⚡', 'ATT')}
                        ${this.renderFilterButton('Multi', '🌟', 'Multi')}
                        ${this.renderFilterButton('Icone', '👑', 'Icone')}
                    </div>
                </div>

            </div>
        `;

        // Setup drag to close
        this.setupDragToClose();

        // Focus search if visible
        if (this.searchVisible) {
            setTimeout(() => {
                const input = document.getElementById('enc-search-input');
                if (input) input.focus();
            }, 100);
        }
    },

    /**
     * Render filter button for bottom bar
     */
    renderFilterButton(filter, icon, label) {
        const isActive = this.currentFilter === filter;
        return `
            <button onclick="window.AbilitiesUI.filter('${filter}')"
                    class="enc-filter-btn ${isActive ? 'active' : ''}">
                <span class="enc-filter-icon">${icon}</span>
                <span class="enc-filter-label">${label}</span>
            </button>
        `;
    },

    /**
     * Render abilities list with sections
     */
    renderAbilitiesList(abilities) {
        // Separate by type
        const unique = abilities.filter(a => a.rarity === 'Unica');
        const normalAbilities = abilities.filter(a => a.rarity !== 'Unica');
        const positive = normalAbilities.filter(a => a.type === 'Positiva' || a.type === 'Leggendaria' || a.type === 'Epica');
        const negative = normalAbilities.filter(a => a.type === 'Negativa');

        let html = '';

        // Unique abilities section
        if (unique.length > 0) {
            html += `
                <div class="enc-section-header">
                    <div class="enc-section-icon bg-yellow-500/20">👑</div>
                    <span class="enc-section-title text-yellow-400">Abilita Icone</span>
                    <span class="enc-section-count">${unique.length}</span>
                </div>
                <div class="px-4 space-y-2">
                    ${unique.map(a => this.renderAbilityItem(a)).join('')}
                </div>
            `;
        }

        // Positive abilities section
        if (positive.length > 0) {
            html += `
                <div class="enc-section-header">
                    <div class="enc-section-icon bg-emerald-500/20">✅</div>
                    <span class="enc-section-title text-emerald-400">Positive</span>
                    <span class="enc-section-count">${positive.length}</span>
                </div>
                <div class="px-4 space-y-2">
                    ${this.sortByRarity(positive).map(a => this.renderAbilityItem(a)).join('')}
                </div>
            `;
        }

        // Negative abilities section
        if (negative.length > 0) {
            html += `
                <div class="enc-section-header">
                    <div class="enc-section-icon bg-rose-500/20">❌</div>
                    <span class="enc-section-title text-rose-400">Negative</span>
                    <span class="enc-section-count">${negative.length}</span>
                </div>
                <div class="px-4 space-y-2">
                    ${this.sortByRarity(negative).map(a => this.renderAbilityItem(a)).join('')}
                </div>
            `;
        }

        return html;
    },

    /**
     * Render single ability item (simplified)
     */
    renderAbilityItem(ability) {
        const isExpanded = this.expandedCard === ability.name;
        const rarityClass = `enc-rarity-${(ability.rarity || 'comune').toLowerCase()}`;
        const safeName = (ability.name || '').replace(/'/g, "\\'");

        return `
            <div class="enc-card-enter" style="animation-delay: ${Math.random() * 0.1}s">
                <div onclick="window.AbilitiesUI.toggleCard('${safeName}')"
                     class="enc-ability-item ${isExpanded ? 'expanded' : ''}">
                    <div class="enc-ability-icon">${ability.icon}</div>
                    <div class="enc-ability-info">
                        <div class="enc-ability-name ${ability.color}">${ability.name}</div>
                        <div class="enc-ability-meta">${this.getRoleLabel(ability.role)}</div>
                    </div>
                    <span class="${rarityClass} enc-rarity-badge">
                        ${ability.rarity === 'Leggendaria' ? 'LEG' : ability.rarity === 'Unica' ? 'UNICA' : (ability.rarity || 'COM').slice(0,3).toUpperCase()}
                    </span>
                </div>

                ${isExpanded ? `
                    <div class="enc-expand-enter mx-4 mb-2">
                        <div class="enc-detail-section">
                            <div class="enc-detail-row">
                                <div class="enc-detail-label">Descrizione</div>
                                <div class="enc-detail-value">${ability.description}</div>
                            </div>
                            <div class="enc-detail-row">
                                <div class="enc-detail-label text-violet-400">⚡ Effetto</div>
                                <div class="enc-detail-value font-semibold">${ability.effect}</div>
                            </div>
                            <div class="enc-detail-row">
                                <div class="enc-detail-label text-blue-400">⚙️ Meccanica</div>
                                <div class="enc-detail-value">${ability.mechanics}</div>
                            </div>
                            ${ability.example ? `
                                <div class="enc-detail-row">
                                    <div class="enc-detail-label text-emerald-400">📝 Esempio</div>
                                    <div class="enc-detail-value text-sm opacity-70 font-mono">${ability.example}</div>
                                </div>
                            ` : ''}
                            <div class="flex gap-4 mt-3 pt-3 border-t border-white/5">
                                <div>
                                    <div class="enc-detail-label">Attivazione</div>
                                    <div class="text-sm text-white font-medium">${ability.activation || '-'}</div>
                                </div>
                                <div>
                                    <div class="enc-detail-label">Fase</div>
                                    <div class="text-sm text-white font-medium">${ability.phase || 'Tutte'}</div>
                                </div>
                            </div>
                            ${ability.warning ? `
                                <div class="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <div class="text-xs font-bold text-red-400 mb-1">⚠️ Attenzione</div>
                                    <div class="text-sm text-white/70">${ability.warning}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Toggle card expansion
     */
    toggleCard(name) {
        if (this.expandedCard === name) {
            this.expandedCard = null;
        } else {
            this.expandedCard = name;
        }
        this.updateResultsOnly();

        // Scroll to card
        if (this.expandedCard) {
            setTimeout(() => {
                const scrollArea = document.getElementById('enc-scroll-area');
                const card = scrollArea?.querySelector('.expanded');
                if (card && scrollArea) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    },

    /**
     * Toggle search visibility
     */
    toggleSearch() {
        this.searchVisible = !this.searchVisible;
        if (!this.searchVisible) {
            this.currentSearch = '';
            this.currentDisplayCount = this.displayLimit;
        }
        this.render();
    },

    /**
     * Toggle stats panel
     */
    toggleStats() {
        this.statsVisible = !this.statsVisible;
        this.render();
    },

    /**
     * Setup drag to close
     */
    setupDragToClose() {
        const header = document.getElementById('enc-header-drag');
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (!header || !overlay) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        header.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
            overlay.style.transition = 'none';
        }, { passive: true });

        header.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            if (deltaY > 0) {
                overlay.style.transform = `translateY(${deltaY}px)`;
                overlay.style.opacity = Math.max(0.3, 1 - deltaY / 300);
            }
        }, { passive: true });

        header.addEventListener('touchend', () => {
            overlay.style.transition = '';
            const deltaY = currentY - startY;

            if (deltaY > 100) {
                this.close();
            } else {
                overlay.style.transform = '';
                overlay.style.opacity = '';
            }

            isDragging = false;
            startY = 0;
            currentY = 0;
        }, { passive: true });
    },

    /**
     * Load more abilities
     */
    loadMore() {
        this.currentDisplayCount += this.displayLimit;
        this.updateResultsOnly();
    },

    /**
     * Clear search
     */
    clearSearch() {
        this.currentSearch = '';
        this.currentDisplayCount = this.displayLimit;
        this.render();
        setTimeout(() => {
            const input = document.getElementById('enc-search-input');
            if (input) input.focus();
        }, 50);
    },

    /**
     * Reset all filters
     */
    resetFilters() {
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.searchVisible = false;
        this.expandedCard = null;
        this.currentDisplayCount = this.displayLimit;
        this.render();
    },

    /**
     * Filter by role
     */
    filter(role) {
        this.currentFilter = role;
        this.expandedCard = null;
        this.currentDisplayCount = this.displayLimit;
        this.render();

        // Scroll to top
        const scrollArea = document.getElementById('enc-scroll-area');
        if (scrollArea) scrollArea.scrollTop = 0;
    },

    /**
     * Handle search input - aggiorna solo i risultati senza ricreare l'input
     */
    handleSearch(query) {
        this.currentSearch = query;
        this.expandedCard = null;
        this.currentDisplayCount = this.displayLimit;
        this.updateResultsOnly();
    },

    /**
     * Aggiorna solo l'area risultati (per evitare di ricreare l'input durante la digitazione)
     */
    updateResultsOnly() {
        const scrollArea = document.getElementById('enc-scroll-area');
        const resultsCountEl = document.getElementById('enc-results-count');
        if (!scrollArea) return;

        const abilities = this.getFilteredAbilities();
        const totalCount = abilities.length;
        const displayedAbilities = abilities.slice(0, this.currentDisplayCount);
        const hasMore = totalCount > this.currentDisplayCount;

        // Aggiorna conteggio risultati
        if (resultsCountEl) {
            if (this.currentSearch || this.currentFilter !== 'all') {
                resultsCountEl.innerHTML = `
                    <span class="text-sm text-white/40">
                        <span class="text-violet-400 font-bold">${totalCount}</span> risultat${totalCount === 1 ? 'o' : 'i'}
                        ${this.currentSearch ? ` per "${this.currentSearch}"` : ''}
                    </span>
                `;
                resultsCountEl.className = 'px-4 py-2';
            } else {
                resultsCountEl.className = 'hidden';
                resultsCountEl.innerHTML = '';
            }
        }

        // Aggiorna lista risultati
        if (displayedAbilities.length > 0) {
            scrollArea.innerHTML = `
                ${this.renderAbilitiesList(displayedAbilities)}

                ${hasMore ? `
                    <div class="p-4 text-center">
                        <button onclick="window.AbilitiesUI.loadMore()"
                                class="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all active:scale-95">
                            Mostra altre ${Math.min(this.displayLimit, totalCount - this.currentDisplayCount)}
                        </button>
                        <p class="text-xs text-white/30 mt-2">${totalCount - this.currentDisplayCount} rimanenti</p>
                    </div>
                ` : `
                    <div class="p-4 text-center">
                        <p class="text-xs text-white/20">Fine lista</p>
                    </div>
                `}
            `;
        } else {
            scrollArea.innerHTML = `
                <div class="flex flex-col items-center justify-center h-64 px-8">
                    <span class="text-5xl mb-4">🔍</span>
                    <p class="text-white/60 font-medium text-center mb-2">Nessuna abilita trovata</p>
                    <p class="text-white/30 text-sm text-center mb-4">Prova con altri filtri</p>
                    <button onclick="window.AbilitiesUI.resetFilters()"
                            class="px-5 py-2 bg-white/10 text-white text-sm font-medium rounded-lg active:scale-95">
                        Reset filtri
                    </button>
                </div>
            `;
        }
    },

    /**
     * Get filtered abilities
     */
    getFilteredAbilities() {
        let abilities = [];

        if (this.currentFilter === 'all') {
            abilities = Object.values(window.AbilitiesEncyclopedia.abilities);
        } else if (this.currentFilter === 'Multi') {
            abilities = Object.values(window.AbilitiesEncyclopedia.abilities)
                .filter(a => a.role === 'Multi' && a.rarity !== 'Unica');
        } else if (this.currentFilter === 'Icone') {
            abilities = Object.values(window.AbilitiesEncyclopedia.abilities)
                .filter(a => a.rarity === 'Unica');
        } else {
            abilities = window.AbilitiesEncyclopedia.getAbilitiesByRole(this.currentFilter);
        }

        if (this.currentSearch) {
            const search = this.currentSearch.toLowerCase();
            abilities = abilities.filter(a =>
                (a.name || '').toLowerCase().includes(search) ||
                (a.description || '').toLowerCase().includes(search) ||
                (a.effect || '').toLowerCase().includes(search)
            );
        }

        return abilities;
    },

    /**
     * Sort by rarity
     */
    sortByRarity(abilities) {
        const order = { 'Comune': 1, 'Rara': 2, 'Epica': 3, 'Leggendaria': 4, 'Unica': 5 };
        return [...abilities].sort((a, b) => (order[a.rarity] || 0) - (order[b.rarity] || 0));
    },

    /**
     * Get role label
     */
    getRoleLabel(role) {
        const labels = {
            'P': 'Portiere',
            'D': 'Difensore',
            'C': 'Centrocampista',
            'A': 'Attaccante',
            'Tutti': 'Universale',
            'Multi': 'Multi-ruolo',
            'Speciale': 'Speciale'
        };
        return labels[role] || role;
    }
};

console.log("Modulo Abilities Encyclopedia UI v2 (Mobile-First) caricato.");
