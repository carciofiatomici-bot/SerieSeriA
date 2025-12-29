//
// ====================================================================
// ABILITIES-ENCYCLOPEDIA-UI.JS - Interfaccia Enciclopedia Abilita
// ====================================================================
// Mobile-First Premium Design with Touch Gestures
//

window.AbilitiesUI = {

    currentFilter: 'all',
    currentSearch: '',
    displayLimit: 15,
    currentDisplayCount: 15,

    // Touch gesture state
    touchStartY: 0,
    touchCurrentY: 0,
    isDragging: false,
    overlayElement: null,
    bottomSheetElement: null,

    /**
     * Inject custom styles for animations and mobile UX
     */
    injectStyles() {
        if (document.getElementById('abilities-ui-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'abilities-ui-styles';
        styles.textContent = `
            /* Custom scrollbar for webkit */
            .abilities-scroll::-webkit-scrollbar {
                width: 4px;
            }
            .abilities-scroll::-webkit-scrollbar-track {
                background: transparent;
            }
            .abilities-scroll::-webkit-scrollbar-thumb {
                background: rgba(139, 92, 246, 0.3);
                border-radius: 4px;
            }

            /* Overlay animations */
            @keyframes overlaySlideUp {
                from {
                    opacity: 0;
                    transform: translateY(100%);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes overlaySlideDown {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(100%);
                }
            }

            @keyframes bottomSheetUp {
                from {
                    transform: translateY(100%);
                }
                to {
                    transform: translateY(0);
                }
            }

            @keyframes bottomSheetDown {
                from {
                    transform: translateY(0);
                }
                to {
                    transform: translateY(100%);
                }
            }

            @keyframes cardFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            @keyframes shimmer {
                0% {
                    background-position: -200% 0;
                }
                100% {
                    background-position: 200% 0;
                }
            }

            @keyframes pulseGlow {
                0%, 100% {
                    box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
                }
                50% {
                    box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
                }
            }

            .abilities-overlay-enter {
                animation: overlaySlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            .abilities-overlay-exit {
                animation: overlaySlideDown 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
            }

            .bottom-sheet-enter {
                animation: bottomSheetUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            .bottom-sheet-exit {
                animation: bottomSheetDown 0.25s cubic-bezier(0.4, 0, 1, 1) forwards;
            }

            .ability-card-animate {
                animation: cardFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                opacity: 0;
            }

            .skeleton-shimmer {
                background: linear-gradient(90deg,
                    rgba(30, 30, 40, 0.8) 0%,
                    rgba(50, 50, 65, 0.8) 50%,
                    rgba(30, 30, 40, 0.8) 100%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
            }

            /* Touch feedback */
            .touch-feedback {
                transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                            box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .touch-feedback:active {
                transform: scale(0.97);
            }

            /* Filter chip active state */
            .filter-chip-active {
                animation: pulseGlow 2s infinite;
            }

            /* Smooth scroll */
            .smooth-scroll {
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior-y: contain;
            }

            /* Glass effect */
            .glass-effect {
                background: rgba(15, 15, 25, 0.85);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            /* Drag indicator */
            .drag-indicator {
                width: 40px;
                height: 5px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
                margin: 0 auto;
            }

            /* Hide scrollbar utility */
            .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .hide-scrollbar::-webkit-scrollbar {
                display: none;
            }
        `;
        document.head.appendChild(styles);
    },

    /**
     * Apre l'enciclopedia in un overlay con animazione
     */
    open() {
        this.injectStyles();

        let overlay = document.getElementById('abilities-encyclopedia-overlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'abilities-encyclopedia-overlay';
            overlay.className = 'fixed inset-0 z-50 hidden overflow-y-auto overscroll-contain';
            overlay.style.cssText = 'background: linear-gradient(to bottom, #020617, #0f172a, #020617);';
            document.body.appendChild(overlay);
        }

        this.overlayElement = overlay;

        // Show skeleton first, then render
        this.renderSkeleton();
        overlay.classList.remove('hidden');
        overlay.classList.remove('abilities-overlay-exit');
        overlay.classList.add('abilities-overlay-enter');
        document.body.style.overflow = 'hidden';

        // Setup touch gestures
        this.setupTouchGestures(overlay);

        // Render actual content after brief delay for smooth animation
        setTimeout(() => this.render(), 150);
    },

    /**
     * Chiude l'enciclopedia con animazione
     */
    close() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (overlay) {
            overlay.classList.remove('abilities-overlay-enter');
            overlay.classList.add('abilities-overlay-exit');

            setTimeout(() => {
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }, 300);
        }
    },

    /**
     * Toggle apri/chiudi l'enciclopedia
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
     * Setup touch gestures for swipe-to-close
     */
    setupTouchGestures(element) {
        const header = element.querySelector('.swipe-handle');
        if (!header) return;

        header.addEventListener('touchstart', (e) => {
            if (!e.touches || e.touches.length === 0) return;
            this.touchStartY = e.touches[0].clientY;
            this.isDragging = true;
        }, { passive: true });

        header.addEventListener('touchmove', (e) => {
            if (!this.isDragging || !e.touches || e.touches.length === 0) return;
            this.touchCurrentY = e.touches[0].clientY;
            const deltaY = this.touchCurrentY - this.touchStartY;

            if (deltaY > 0) {
                element.style.transform = `translateY(${deltaY}px)`;
                element.style.opacity = Math.max(0.5, 1 - deltaY / 400);
            }
        }, { passive: true });

        header.addEventListener('touchend', () => {
            const deltaY = this.touchCurrentY - this.touchStartY;

            if (deltaY > 120) {
                this.close();
            } else {
                element.style.transform = '';
                element.style.opacity = '';
            }

            this.isDragging = false;
            this.touchStartY = 0;
            this.touchCurrentY = 0;
        }, { passive: true });
    },

    /**
     * Render skeleton loading state
     */
    renderSkeleton() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                <!-- Skeleton Header -->
                <div class="sticky top-0 z-30 glass-effect border-b border-white/5 px-4 py-4">
                    <div class="flex items-center justify-between mb-4">
                        <div class="skeleton-shimmer h-8 w-32 rounded-lg"></div>
                        <div class="skeleton-shimmer h-11 w-11 rounded-full"></div>
                    </div>
                    <div class="skeleton-shimmer h-12 w-full rounded-2xl"></div>
                </div>

                <!-- Skeleton Filters -->
                <div class="flex gap-3 px-4 py-4">
                    ${[1,2,3,4,5].map(() => `
                        <div class="skeleton-shimmer h-11 w-20 rounded-full flex-shrink-0"></div>
                    `).join('')}
                </div>

                <!-- Skeleton Cards -->
                <div class="px-4 space-y-3">
                    ${[1,2,3,4,5].map(() => `
                        <div class="skeleton-shimmer h-28 w-full rounded-2xl"></div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render principale (Mobile-First Premium)
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
            <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 smooth-scroll abilities-scroll">

                <!-- Header with Swipe Handle -->
                <div class="sticky top-0 z-30 glass-effect border-b border-white/5 swipe-handle">
                    <!-- Drag Indicator -->
                    <div class="pt-3 pb-2">
                        <div class="drag-indicator"></div>
                    </div>

                    <div class="px-4 pb-4">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                    <span class="text-xl">📔</span>
                                </div>
                                <div>
                                    <h1 class="text-lg font-black text-white tracking-tight">Enciclopedia</h1>
                                    <p class="text-xs text-violet-400 font-medium">${stats.total} Abilita</p>
                                </div>
                            </div>
                            <button onclick="window.AbilitiesUI.close()"
                                    class="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all touch-feedback">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <!-- Search Bar Premium -->
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg class="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                            </div>
                            <input type="text"
                                   id="ability-search-input"
                                   placeholder="Cerca abilita..."
                                   value="${this.currentSearch}"
                                   oninput="window.AbilitiesUI.handleSearch(this.value)"
                                   class="w-full bg-white/5 text-white text-base pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 focus:border-violet-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/20 placeholder-white/30 transition-all">
                            ${this.currentSearch ? `
                                <button onclick="window.AbilitiesUI.clearSearch()"
                                        class="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white transition-colors">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Filter Chips (Large Touch Targets) -->
                <div class="flex gap-2.5 overflow-x-auto hide-scrollbar py-4 px-4">
                    ${this.renderFilterChip('all', 'Tutte', '✨', 'from-violet-500 to-purple-600', 'violet')}
                    ${this.renderFilterChip('P', 'POR', '🧤', 'from-blue-500 to-blue-600', 'blue')}
                    ${this.renderFilterChip('D', 'DIF', '🛡️', 'from-emerald-500 to-green-600', 'emerald')}
                    ${this.renderFilterChip('C', 'CEN', '⚽', 'from-amber-500 to-yellow-600', 'amber')}
                    ${this.renderFilterChip('A', 'ATT', '⚡', 'from-rose-500 to-red-600', 'rose')}
                    ${this.renderFilterChip('Multi', 'Multi', '🌟', 'from-pink-500 to-fuchsia-600', 'pink')}
                    ${this.renderFilterChip('Icone', 'Icone', '👑', 'from-yellow-400 to-amber-500', 'yellow')}
                </div>

                <!-- Stats Summary (Compact) -->
                <div class="flex gap-2 px-4 mb-4">
                    <div class="flex-1 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-xl p-3 text-center">
                        <div class="text-xl font-black text-purple-400">${stats.total}</div>
                        <div class="text-[11px] text-purple-300/60 font-medium">Totali</div>
                    </div>
                    <div class="flex-1 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl p-3 text-center">
                        <div class="text-xl font-black text-red-400">${stats.byRarity.Leggendaria || 0}</div>
                        <div class="text-[11px] text-red-300/60 font-medium">Leggend.</div>
                    </div>
                    <div class="flex-1 bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/20 rounded-xl p-3 text-center">
                        <div class="text-xl font-black text-violet-400">${stats.byRarity.Rara || 0}</div>
                        <div class="text-[11px] text-violet-300/60 font-medium">Rare</div>
                    </div>
                    <div class="flex-1 bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-xl p-3 text-center">
                        <div class="text-xl font-black text-yellow-400">${stats.byRarity.Unica || 0}</div>
                        <div class="text-[11px] text-yellow-300/60 font-medium">Icone</div>
                    </div>
                </div>

                <!-- Results Count -->
                ${this.currentSearch || this.currentFilter !== 'all' ? `
                    <div class="px-4 mb-3">
                        <p class="text-sm text-white/40">
                            <span class="text-violet-400 font-bold">${totalCount}</span> risultat${totalCount === 1 ? 'o' : 'i'}
                            ${this.currentSearch ? ` per "${this.currentSearch}"` : ''}
                        </p>
                    </div>
                ` : ''}

                <!-- Abilities Grid -->
                <div class="px-4 pb-32">
                    ${displayedAbilities.length > 0 ? `
                        ${this.renderAbilitiesByType(displayedAbilities)}

                        ${hasMore ? `
                            <div class="text-center py-6">
                                <button onclick="window.AbilitiesUI.loadMore()"
                                        class="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-purple-500/30 transition-all touch-feedback">
                                    Mostra altre ${Math.min(this.displayLimit, totalCount - this.currentDisplayCount)}
                                    <span class="text-white/60 ml-2">(${totalCount - this.currentDisplayCount} rimanenti)</span>
                                </button>
                            </div>
                        ` : `
                            <div class="text-center py-6">
                                <p class="text-sm text-white/30">Hai visualizzato tutte le abilita</p>
                            </div>
                        `}
                    ` : `
                        <div class="text-center py-16">
                            <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                <span class="text-4xl">😢</span>
                            </div>
                            <p class="text-lg text-white/60 font-medium mb-2">Nessuna abilita trovata</p>
                            <p class="text-sm text-white/30">Prova con un'altra ricerca o filtro</p>
                            <button onclick="window.AbilitiesUI.resetFilters()"
                                    class="mt-4 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all touch-feedback">
                                Resetta filtri
                            </button>
                        </div>
                    `}
                </div>

            </div>
        `;

        // Add staggered animation to cards
        requestAnimationFrame(() => {
            const cards = overlay.querySelectorAll('.ability-card-animate');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 50}ms`;
            });
        });

        // Re-setup touch gestures after render
        this.setupTouchGestures(overlay);
    },

    /**
     * Render filter chip with proper touch target
     */
    renderFilterChip(filter, label, icon, gradient, color) {
        const isActive = this.currentFilter === filter;

        return `
            <button onclick="window.AbilitiesUI.filter('${filter}')"
                    class="flex-shrink-0 flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-full font-bold text-sm transition-all touch-feedback
                           ${isActive
                               ? `bg-gradient-to-r ${gradient} text-white shadow-lg shadow-${color}-500/30 filter-chip-active`
                               : `bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white`}">
                <span class="text-base">${icon}</span>
                <span>${label}</span>
            </button>
        `;
    },

    /**
     * Carica altre abilita
     */
    loadMore() {
        this.currentDisplayCount += this.displayLimit;
        this.render();
    },

    /**
     * Clear search
     */
    clearSearch() {
        this.currentSearch = '';
        this.currentDisplayCount = this.displayLimit;
        this.render();

        // Focus input after clear
        setTimeout(() => {
            const input = document.getElementById('ability-search-input');
            if (input) input.focus();
        }, 100);
    },

    /**
     * Reset all filters
     */
    resetFilters() {
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.currentDisplayCount = this.displayLimit;
        this.render();
    },

    /**
     * Render singola card Abilita (Mobile-First - Large Touch Target)
     */
    renderAbilityCard(ability, index = 0) {
        const rarityStyles = {
            'Comune': {
                border: 'border-slate-600/30',
                bg: 'from-slate-800/40',
                badge: 'bg-slate-700/80 text-slate-300',
                glow: ''
            },
            'Rara': {
                border: 'border-violet-500/30',
                bg: 'from-violet-900/20',
                badge: 'bg-violet-500/20 text-violet-300',
                glow: 'shadow-violet-500/10'
            },
            'Leggendaria': {
                border: 'border-red-500/30',
                bg: 'from-red-900/20',
                badge: 'bg-red-500/20 text-red-300',
                glow: 'shadow-red-500/10'
            },
            'Unica': {
                border: 'border-yellow-500/40',
                bg: 'from-yellow-900/20',
                badge: 'bg-yellow-500/20 text-yellow-300',
                glow: 'shadow-yellow-500/20'
            }
        };

        const style = rarityStyles[ability.rarity] || rarityStyles['Comune'];
        const safeName = (ability.name || '').replace(/'/g, "\\'");

        return `
            <div class="ability-card-animate ability-card bg-gradient-to-br ${style.bg} to-slate-900/60 rounded-2xl p-4 border ${style.border} hover:border-white/20 transition-all touch-feedback shadow-lg ${style.glow} cursor-pointer min-h-[100px]"
                 onclick="window.AbilitiesUI.showDetails('${safeName}')">

                <!-- Header with large tap area -->
                <div class="flex items-start gap-3">
                    <div class="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center flex-shrink-0">
                        <span class="text-2xl">${ability.icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                            <h3 class="text-base font-bold ${ability.color} truncate">${ability.name}</h3>
                            <span class="text-xs ${style.badge} px-2.5 py-1 rounded-full font-bold flex-shrink-0">
                                ${ability.rarity === 'Leggendaria' ? 'LEG' : ability.rarity === 'Unica' ? 'UNICA' : ability.rarity.toUpperCase().slice(0,3)}
                            </span>
                        </div>
                        <p class="text-sm text-white/40 mt-0.5">${this.getRoleLabel(ability.role)}</p>
                    </div>
                </div>

                <!-- Tap hint -->
                <div class="flex items-center justify-end mt-2 text-white/20">
                    <span class="text-xs">Tocca per dettagli</span>
                    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </div>
            </div>
        `;
    },

    /**
     * Mostra dettagli completi Abilita (Bottom Sheet Mobile Pattern)
     */
    showDetails(abilityName) {
        const ability = window.AbilitiesEncyclopedia.abilities[abilityName];
        if (!ability) return;

        const rarityStyles = {
            'Comune': { border: 'border-slate-600', text: 'text-slate-400', bg: 'from-slate-800/80', accent: 'slate' },
            'Rara': { border: 'border-violet-500', text: 'text-violet-400', bg: 'from-violet-900/40', accent: 'violet' },
            'Leggendaria': { border: 'border-red-500', text: 'text-red-400', bg: 'from-red-900/40', accent: 'red' },
            'Unica': { border: 'border-yellow-500', text: 'text-yellow-400', bg: 'from-yellow-900/40', accent: 'yellow' }
        };

        const style = rarityStyles[ability.rarity] || rarityStyles['Comune'];

        // Remove existing bottom sheet if any
        const existing = document.getElementById('ability-detail-sheet');
        if (existing) existing.remove();

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'ability-detail-backdrop';
        backdrop.className = 'fixed inset-0 bg-black/60 z-[9999] transition-opacity';
        backdrop.onclick = () => this.closeDetails();

        // Create bottom sheet
        const sheet = document.createElement('div');
        sheet.id = 'ability-detail-sheet';
        sheet.className = 'fixed bottom-0 left-0 right-0 z-[10000] max-h-[90vh] bottom-sheet-enter';

        this.bottomSheetElement = sheet;

        sheet.innerHTML = `
            <div class="bg-gradient-to-b ${style.bg} to-slate-900 rounded-t-3xl border-t ${style.border} overflow-hidden">

                <!-- Drag Handle -->
                <div class="sticky top-0 z-10 glass-effect pt-3 pb-4 px-4 detail-swipe-handle">
                    <div class="drag-indicator mb-4"></div>

                    <!-- Header -->
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${style.bg} border ${style.border} flex items-center justify-center shadow-lg">
                            <span class="text-3xl">${ability.icon}</span>
                        </div>
                        <div class="flex-1">
                            <h2 class="text-xl font-black ${ability.color}">${ability.name}</h2>
                            <div class="flex items-center gap-3 mt-1">
                                <span class="text-sm text-white/50">${this.getRoleLabel(ability.role)}</span>
                                <span class="text-sm ${style.text} font-bold">${ability.rarity}</span>
                            </div>
                        </div>
                        <button onclick="window.AbilitiesUI.closeDetails()"
                                class="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-red-500/20 transition-all touch-feedback">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Scrollable Content -->
                <div class="overflow-y-auto max-h-[calc(90vh-120px)] px-4 pb-8 smooth-scroll abilities-scroll">
                    <div class="space-y-4">

                        <!-- Descrizione -->
                        <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <p class="text-xs text-white/40 uppercase tracking-wider font-bold mb-2">Descrizione</p>
                            <p class="text-base text-white/80 leading-relaxed">${ability.description}</p>
                        </div>

                        <!-- Effetto (Highlighted) -->
                        <div class="bg-gradient-to-br from-violet-500/15 to-purple-500/5 rounded-2xl p-4 border border-violet-500/30">
                            <p class="text-xs text-violet-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                                <span>⚡</span> Effetto in Partita
                            </p>
                            <p class="text-base text-white font-semibold leading-relaxed">${ability.effect}</p>
                        </div>

                        <!-- Come Funziona -->
                        <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <p class="text-xs text-blue-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                                <span>⚙️</span> Meccanica
                            </p>
                            <p class="text-base text-white/70 leading-relaxed">${ability.mechanics}</p>
                        </div>

                        <!-- Esempio -->
                        <div class="bg-gradient-to-br from-emerald-500/10 to-green-500/5 rounded-2xl p-4 border border-emerald-500/20">
                            <p class="text-xs text-emerald-400 uppercase tracking-wider font-bold mb-2">📝 Esempio</p>
                            <div class="bg-black/30 rounded-xl p-3">
                                <p class="text-sm text-white/60 font-mono leading-relaxed">${ability.example}</p>
                            </div>
                        </div>

                        <!-- Stats Grid -->
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                                <p class="text-xs text-white/40 uppercase font-bold mb-1">Attivazione</p>
                                <p class="text-base text-white font-bold">${ability.activation}</p>
                            </div>
                            <div class="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                                <p class="text-xs text-white/40 uppercase font-bold mb-1">Fase</p>
                                <p class="text-base text-white font-bold">${ability.phase || 'Tutte'}</p>
                            </div>
                        </div>

                        ${ability.warning ? `
                            <div class="bg-gradient-to-br from-red-500/15 to-rose-500/5 rounded-2xl p-4 border border-red-500/30">
                                <p class="text-xs text-red-400 uppercase tracking-wider font-bold mb-2">⚠️ Attenzione</p>
                                <p class="text-base text-white/70 leading-relaxed">${ability.warning}</p>
                            </div>
                        ` : ''}

                        ${ability.synergy ? `
                            <div class="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 rounded-2xl p-4 border border-purple-500/20">
                                <p class="text-xs text-purple-400 uppercase tracking-wider font-bold mb-3">🔗 Sinergie</p>
                                <div class="space-y-2">
                                    ${ability.synergy.map(s => `
                                        <div class="flex items-start gap-3 text-base text-white/70">
                                            <span class="text-purple-400 mt-1">•</span>
                                            <span class="leading-relaxed">${s}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${ability.impact ? `
                            <div class="bg-gradient-to-br from-yellow-500/15 to-amber-500/5 rounded-2xl p-4 border border-yellow-500/30 text-center">
                                <p class="text-xs text-yellow-400 uppercase tracking-wider font-bold mb-2">💥 Impatto</p>
                                <p class="text-3xl text-white font-black">${ability.impact}</p>
                            </div>
                        ` : ''}

                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(sheet);

        // Setup swipe to close for bottom sheet
        this.setupBottomSheetGestures(sheet, backdrop);
    },

    /**
     * Setup swipe gestures for bottom sheet
     */
    setupBottomSheetGestures(sheet, backdrop) {
        const handle = sheet.querySelector('.detail-swipe-handle');
        if (!handle) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
            sheet.style.transition = 'none';
        }, { passive: true });

        handle.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            if (deltaY > 0) {
                sheet.style.transform = `translateY(${deltaY}px)`;
                backdrop.style.opacity = Math.max(0.3, 1 - deltaY / 300);
            }
        }, { passive: true });

        handle.addEventListener('touchend', () => {
            sheet.style.transition = '';
            const deltaY = currentY - startY;

            if (deltaY > 100) {
                this.closeDetails();
            } else {
                sheet.style.transform = '';
                backdrop.style.opacity = '';
            }

            isDragging = false;
            startY = 0;
            currentY = 0;
        }, { passive: true });
    },

    /**
     * Close details bottom sheet
     */
    closeDetails() {
        const sheet = document.getElementById('ability-detail-sheet');
        const backdrop = document.getElementById('ability-detail-backdrop');

        if (sheet) {
            sheet.classList.remove('bottom-sheet-enter');
            sheet.classList.add('bottom-sheet-exit');
        }
        if (backdrop) {
            backdrop.style.opacity = '0';
        }

        setTimeout(() => {
            sheet?.remove();
            backdrop?.remove();
        }, 250);
    },

    /**
     * Filtra Abilita per ruolo
     */
    filter(role) {
        this.currentFilter = role;
        this.currentDisplayCount = this.displayLimit;
        this.render();
    },

    /**
     * Gestisce ricerca
     */
    handleSearch(query) {
        this.currentSearch = query;
        this.currentDisplayCount = this.displayLimit;
        this.render();
    },

    /**
     * Ottieni Abilita filtrate
     */
    getFilteredAbilities() {
        let abilities = [];

        // Filtro ruolo
        if (this.currentFilter === 'all') {
            abilities = Object.values(window.AbilitiesEncyclopedia.abilities);
        } else if (this.currentFilter === 'Multi') {
            // Mostra solo abilita Multi-ruolo (non Uniche)
            abilities = Object.values(window.AbilitiesEncyclopedia.abilities)
                .filter(a => a.role === 'Multi' && a.rarity !== 'Unica');
        } else if (this.currentFilter === 'Icone') {
            // Mostra solo abilita Uniche (Abilita Icone)
            abilities = Object.values(window.AbilitiesEncyclopedia.abilities)
                .filter(a => a.rarity === 'Unica');
        } else {
            abilities = window.AbilitiesEncyclopedia.getAbilitiesByRole(this.currentFilter);
        }

        // Filtro ricerca
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
     * Ordina abilita per rarita: Comune, Rara, Epica, Leggendaria, Unica
     */
    sortByRarity(abilities) {
        const rarityOrder = {
            'Comune': 1,
            'Rara': 2,
            'Epica': 3,
            'Leggendaria': 4,
            'Unica': 5
        };
        return [...abilities].sort((a, b) => {
            const orderA = rarityOrder[a.rarity] || 0;
            const orderB = rarityOrder[b.rarity] || 0;
            return orderA - orderB;
        });
    },

    /**
     * Renderizza Abilita separate per tipo (positive/negative) - Mobile-First
     */
    renderAbilitiesByType(abilities) {
        // Separa abilita uniche dalle altre
        const unique = abilities.filter(a => a.rarity === 'Unica');
        const normalAbilities = abilities.filter(a => a.rarity !== 'Unica');

        const positive = normalAbilities.filter(a => a.type === 'Positiva' || a.type === 'Leggendaria' || a.type === 'Epica');
        const negative = normalAbilities.filter(a => a.type === 'Negativa');

        // Ordina per rarita
        const sortedPositive = this.sortByRarity(positive);
        const sortedNegative = this.sortByRarity(negative);

        let html = '';

        // Sezione Abilita Uniche (ICONE)
        if (unique.length > 0) {
            const isIconeFilter = this.currentFilter === 'Icone';
            html += `
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                            <span class="text-xl">👑</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-yellow-400">${isIconeFilter ? 'Abilita Icone' : 'Abilita Uniche'}</h3>
                            <p class="text-sm text-yellow-400/60">${unique.length} abilita esclusive</p>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-yellow-500/10 to-transparent rounded-2xl p-4 mb-4 border border-yellow-500/20">
                        <p class="text-yellow-300 font-bold text-sm">✨ Esclusive delle Icone</p>
                        <p class="text-white/50 text-sm mt-1">Ogni Icona ha la propria abilita unica che la distingue.</p>
                    </div>
                    <div class="space-y-3">
                        ${unique.map((ability, i) => this.renderAbilityCard(ability, i)).join('')}
                    </div>
                </div>
            `;
        }

        // Sezione Abilita Positive
        if (positive.length > 0) {
            html += `
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                            <span class="text-xl">✅</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-emerald-400">Positive</h3>
                            <p class="text-sm text-emerald-400/60">${positive.length} abilita</p>
                        </div>
                    </div>
                    <div class="space-y-3">
                        ${sortedPositive.map((ability, i) => this.renderAbilityCard(ability, i)).join('')}
                    </div>
                </div>
            `;
        }

        // Sezione Abilita Negative
        if (negative.length > 0) {
            html += `
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
                            <span class="text-xl">❌</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-rose-400">Negative</h3>
                            <p class="text-sm text-rose-400/60">${negative.length} abilita</p>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-red-500/10 to-transparent rounded-2xl p-4 mb-4 border border-red-500/20">
                        <p class="text-yellow-300 font-bold text-sm">⚠️ Attenzione</p>
                        <p class="text-white/50 text-sm mt-1">Max 2 abilita negative per giocatore.</p>
                    </div>
                    <div class="space-y-3">
                        ${sortedNegative.map((ability, i) => this.renderAbilityCard(ability, i)).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    },

    /**
     * Helper label ruolo
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

console.log("Modulo Abilities Encyclopedia UI (Mobile Premium) caricato.");
