//
// ====================================================================
// ABILITIES-ENCYCLOPEDIA-UI.JS - Interfaccia Enciclopedia Abilita
// ====================================================================
//

window.AbilitiesUI = {

    currentFilter: 'all',
    currentSearch: '',
    displayLimit: 20,
    currentDisplayCount: 20,

    /**
     * Apre l'enciclopedia in un overlay
     */
    open() {
        // Crea overlay se non esiste
        let overlay = document.getElementById('abilities-encyclopedia-overlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'abilities-encyclopedia-overlay';
            overlay.className = 'fixed inset-0 bg-slate-900 z-50 overflow-y-auto hidden';
            document.body.appendChild(overlay);
        }

        // Render contenuto
        this.render();

        // Mostra overlay
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Chiude l'enciclopedia
     */
    close() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
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
     * Render principale (Mobile-First)
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
            <div class="min-h-screen pb-24">

                <!-- Header Sticky Mobile-First -->
                <div class="sticky top-0 z-30 bg-gradient-to-b from-slate-900 via-slate-900/98 to-transparent pb-3 pt-3 px-3">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">📔</span>
                            <h1 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">ABILITA</h1>
                        </div>
                        <button onclick="window.AbilitiesUI.close()"
                                class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/80 border border-gray-700 text-gray-400 hover:text-white hover:bg-red-500/30 hover:border-red-500/50 transition">
                            <span class="text-xl">×</span>
                        </button>
                    </div>

                    <!-- Search Bar Compatta -->
                    <div class="relative">
                        <input type="text"
                               id="ability-search-input"
                               placeholder="Cerca abilita..."
                               value="${this.currentSearch}"
                               oninput="window.AbilitiesUI.handleSearch(this.value)"
                               class="w-full bg-gray-800/80 text-white text-sm px-4 py-2.5 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none placeholder-gray-500">
                    </div>
                </div>

                <!-- Role Filters (Scroll orizzontale) -->
                <div class="flex gap-2 overflow-x-auto pb-3 px-3 scrollbar-hide">
                    <button onclick="window.AbilitiesUI.filter('all')"
                            class="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}">
                        Tutte
                    </button>
                    <button onclick="window.AbilitiesUI.filter('P')"
                            class="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'P' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-blue-400 border border-gray-700'}">
                        🧤 POR
                    </button>
                    <button onclick="window.AbilitiesUI.filter('D')"
                            class="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'D' ? 'bg-green-500 text-white' : 'bg-gray-800 text-green-400 border border-gray-700'}">
                        🛡️ DIF
                    </button>
                    <button onclick="window.AbilitiesUI.filter('C')"
                            class="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'C' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-yellow-400 border border-gray-700'}">
                        ⚽ CEN
                    </button>
                    <button onclick="window.AbilitiesUI.filter('A')"
                            class="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'A' ? 'bg-red-500 text-white' : 'bg-gray-800 text-red-400 border border-gray-700'}">
                        ⚡ ATT
                    </button>
                    <button onclick="window.AbilitiesUI.filter('Multi')"
                            class="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'Multi' ? 'bg-pink-500 text-white' : 'bg-gray-800 text-pink-400 border border-gray-700'}">
                        🌟 Multi
                    </button>
                    <button onclick="window.AbilitiesUI.filter('Icone')"
                            class="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${this.currentFilter === 'Icone' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-yellow-400 border border-gray-700'}">
                        👑 Icone
                    </button>
                </div>

                <!-- Abilities Grid -->
                <div class="px-3">
                    ${displayedAbilities.length > 0 ? `
                        ${this.renderAbilitiesByType(displayedAbilities)}

                        ${hasMore ? `
                            <div class="text-center py-4">
                                <button onclick="window.AbilitiesUI.loadMore()"
                                        class="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/30 transition">
                                    Mostra altre (${totalCount - this.currentDisplayCount} rimanenti)
                                </button>
                            </div>
                        ` : ''}
                    ` : `
                        <div class="text-center py-12">
                            <p class="text-4xl mb-4">😢</p>
                            <p class="text-lg text-gray-400">Nessuna abilita trovata</p>
                            <p class="text-sm text-gray-500 mt-2">Prova con un'altra ricerca</p>
                        </div>
                    `}
                </div>

                <!-- Quick Stats Cards (in fondo) -->
                <div class="flex justify-between gap-2 px-3 mt-6 mb-3">
                    <div class="flex-1 bg-gradient-to-br from-purple-900/40 to-gray-900/60 border border-purple-500/40 rounded-xl p-2 text-center">
                        <div class="text-lg font-black text-purple-400">${stats.total}</div>
                        <div class="text-[9px] text-gray-400">Totali</div>
                    </div>
                    <div class="flex-1 bg-gradient-to-br from-red-900/40 to-gray-900/60 border border-red-500/40 rounded-xl p-2 text-center">
                        <div class="text-lg font-black text-red-400">${stats.byRarity.Leggendaria || 0}</div>
                        <div class="text-[9px] text-gray-400">Leggend.</div>
                    </div>
                    <div class="flex-1 bg-gradient-to-br from-violet-900/40 to-gray-900/60 border border-violet-500/40 rounded-xl p-2 text-center">
                        <div class="text-lg font-black text-violet-400">${stats.byRarity.Rara || 0}</div>
                        <div class="text-[9px] text-gray-400">Rare</div>
                    </div>
                    <div class="flex-1 bg-gradient-to-br from-yellow-900/40 to-gray-900/60 border border-yellow-500/40 rounded-xl p-2 text-center">
                        <div class="text-lg font-black text-yellow-400">${stats.byRarity.Unica || 0}</div>
                        <div class="text-[9px] text-gray-400">Icone</div>
                    </div>
                </div>

            </div>
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
     * Render singola card Abilita (Mobile-First - Compatta)
     */
    renderAbilityCard(ability) {
        const rarityStyles = {
            'Comune': { border: 'border-gray-600/50', bg: 'from-gray-800/60', badge: 'bg-gray-700 text-gray-300' },
            'Rara': { border: 'border-violet-500/50', bg: 'from-violet-900/30', badge: 'bg-violet-900/60 text-violet-300' },
            'Leggendaria': { border: 'border-red-500/50', bg: 'from-red-900/30', badge: 'bg-red-900/60 text-red-300' },
            'Unica': { border: 'border-yellow-500/50', bg: 'from-yellow-900/30', badge: 'bg-yellow-900/60 text-yellow-300' }
        };

        const style = rarityStyles[ability.rarity] || rarityStyles['Comune'];

        return `
            <div class="ability-card bg-gradient-to-br ${style.bg} to-gray-900/80 rounded-xl p-3 border ${style.border} hover:border-white/50 transition-all cursor-pointer active:scale-[0.98]"
                 onclick="window.AbilitiesUI.showDetails('${ability.name}')">

                <!-- Header -->
                <div class="flex items-start gap-2 mb-2">
                    <span class="text-2xl flex-shrink-0">${ability.icon}</span>
                    <div class="flex-1">
                        <h3 class="text-sm font-bold ${ability.color}">${ability.name}</h3>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[10px] text-gray-500">${this.getRoleLabel(ability.role)}</span>
                            <span class="text-[9px] ${style.badge} px-1.5 py-0.5 rounded-full font-bold">
                                ${ability.rarity === 'Leggendaria' ? 'LEG' : ability.rarity === 'Unica' ? 'UNICA' : ability.rarity.toUpperCase().slice(0,3)}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Effect Compatto -->
                <div class="bg-black/30 rounded-lg p-2">
                    <p class="text-[11px] text-gray-300 line-clamp-2">${ability.effect}</p>
                </div>
            </div>
        `;
    },

    /**
     * Mostra dettagli completi Abilita (Mobile-First)
     */
    showDetails(abilityName) {
        const ability = window.AbilitiesEncyclopedia.abilities[abilityName];
        if (!ability) return;

        const rarityStyles = {
            'Comune': { border: 'border-gray-600', text: 'text-gray-400', bg: 'from-gray-800/80' },
            'Rara': { border: 'border-violet-500', text: 'text-violet-400', bg: 'from-violet-900/40' },
            'Leggendaria': { border: 'border-red-500', text: 'text-red-400', bg: 'from-red-900/40' },
            'Unica': { border: 'border-yellow-500', text: 'text-yellow-400', bg: 'from-yellow-900/40' }
        };

        const style = rarityStyles[ability.rarity] || rarityStyles['Comune'];

        // Crea modal fullscreen mobile
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-slate-900 z-[10000] overflow-y-auto';

        modal.innerHTML = `
            <div class="min-h-screen pb-20">

                <!-- Header Sticky -->
                <div class="sticky top-0 z-10 bg-gradient-to-b ${style.bg} to-slate-900/95 backdrop-blur-sm border-b ${style.border} px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">${ability.icon}</span>
                            <div>
                                <h2 class="text-lg font-black ${ability.color}">${ability.name}</h2>
                                <div class="flex items-center gap-2 text-xs">
                                    <span class="text-gray-400">${this.getRoleLabel(ability.role)}</span>
                                    <span class="${style.text} font-bold">${ability.rarity}</span>
                                </div>
                            </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()"
                                class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/80 border border-gray-700 text-gray-400 hover:text-white hover:bg-red-500/30 transition">
                            <span class="text-xl">×</span>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="px-4 py-4 space-y-3">

                    <!-- Descrizione -->
                    <div class="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                        <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Descrizione</p>
                        <p class="text-sm text-gray-200">${ability.description}</p>
                    </div>

                    <!-- Effetto -->
                    <div class="bg-gradient-to-br from-purple-900/40 to-gray-900/60 rounded-xl p-3 border border-purple-500/40">
                        <p class="text-[10px] text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">⚡ Effetto</p>
                        <p class="text-sm text-white font-semibold">${ability.effect}</p>
                    </div>

                    <!-- Come Funziona -->
                    <div class="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                        <p class="text-[10px] text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">⚙️ Meccanica</p>
                        <p class="text-sm text-gray-300">${ability.mechanics}</p>
                    </div>

                    <!-- Esempio -->
                    <div class="bg-gradient-to-br from-green-900/30 to-gray-900/60 rounded-xl p-3 border border-green-500/40">
                        <p class="text-[10px] text-green-400 uppercase tracking-wider mb-1">📝 Esempio</p>
                        <p class="text-xs text-gray-300 font-mono bg-black/30 rounded p-2">${ability.example}</p>
                    </div>

                    <!-- Stats Grid -->
                    <div class="grid grid-cols-2 gap-2">
                        <div class="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 text-center">
                            <p class="text-[10px] text-gray-500 uppercase">Attivazione</p>
                            <p class="text-sm text-white font-bold mt-1">${ability.activation}</p>
                        </div>
                        <div class="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 text-center">
                            <p class="text-[10px] text-gray-500 uppercase">Fase</p>
                            <p class="text-sm text-white font-bold mt-1">${ability.phase || 'Tutte'}</p>
                        </div>
                    </div>

                    ${ability.warning ? `
                        <div class="bg-gradient-to-br from-red-900/40 to-gray-900/60 rounded-xl p-3 border border-red-500/40">
                            <p class="text-[10px] text-red-400 uppercase tracking-wider mb-1">⚠️ Attenzione</p>
                            <p class="text-sm text-gray-300">${ability.warning}</p>
                        </div>
                    ` : ''}

                    ${ability.synergy ? `
                        <div class="bg-gradient-to-br from-purple-900/30 to-gray-900/60 rounded-xl p-3 border border-purple-500/40">
                            <p class="text-[10px] text-purple-400 uppercase tracking-wider mb-2">🔗 Sinergie</p>
                            <div class="space-y-1">
                                ${ability.synergy.map(s => `
                                    <div class="flex items-start gap-2 text-xs text-gray-300">
                                        <span class="text-purple-400">•</span>
                                        <span>${s}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${ability.impact ? `
                        <div class="bg-gradient-to-br from-yellow-900/40 to-gray-900/60 rounded-xl p-3 border border-yellow-500/40 text-center">
                            <p class="text-[10px] text-yellow-400 uppercase tracking-wider mb-1">💥 Impatto</p>
                            <p class="text-xl text-white font-black">${ability.impact}</p>
                        </div>
                    ` : ''}

                </div>

                <!-- Footer Sticky -->
                <div class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
                    <button onclick="this.closest('.fixed').remove()"
                            class="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-purple-900/30 transition">
                        Chiudi
                    </button>
                </div>

            </div>
        `;

        document.body.appendChild(modal);
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
            abilities = abilities.filter(a =>
                a.name.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
                a.description.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
                a.effect.toLowerCase().includes(this.currentSearch.toLowerCase())
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

        // Sezione Abilita Uniche (ICONE) - Mobile-First
        if (unique.length > 0) {
            const isIconeFilter = this.currentFilter === 'Icone';
            html += `
                <div class="mb-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-xl">👑</span>
                        <h3 class="text-base font-bold text-yellow-400">${isIconeFilter ? 'Abilita Icone' : 'Abilita Uniche'}</h3>
                        <span class="text-[10px] px-2 py-0.5 bg-yellow-900/50 rounded-full text-yellow-400 font-bold">${unique.length}</span>
                    </div>
                    <div class="bg-yellow-900/20 rounded-lg p-2.5 mb-3 border border-yellow-700/50">
                        <p class="text-yellow-300 font-bold text-xs">✨ Esclusive Icone</p>
                        <p class="text-gray-400 text-[10px] mt-0.5">Ogni Icona ha la propria abilita unica.</p>
                    </div>
                    <div class="grid grid-cols-1 gap-2">
                        ${unique.map(ability => this.renderAbilityCard(ability)).join('')}
                    </div>
                </div>
            `;
        }

        // Sezione Abilita Positive - Mobile-First
        if (positive.length > 0) {
            html += `
                <div class="mb-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-xl">✅</span>
                        <h3 class="text-base font-bold text-green-400">Positive</h3>
                        <span class="text-[10px] px-2 py-0.5 bg-green-900/50 rounded-full text-green-400 font-bold">${positive.length}</span>
                    </div>
                    <div class="grid grid-cols-1 gap-2">
                        ${sortedPositive.map(ability => this.renderAbilityCard(ability)).join('')}
                    </div>
                </div>
            `;
        }

        // Sezione Abilita Negative - Mobile-First
        if (negative.length > 0) {
            html += `
                <div class="mb-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-xl">❌</span>
                        <h3 class="text-base font-bold text-red-400">Negative</h3>
                        <span class="text-[10px] px-2 py-0.5 bg-red-900/50 rounded-full text-red-400 font-bold">${negative.length}</span>
                    </div>
                    <div class="bg-red-900/20 rounded-lg p-2.5 mb-3 border border-red-700/50">
                        <p class="text-yellow-300 font-bold text-xs">⚠️ Attenzione</p>
                        <p class="text-gray-400 text-[10px] mt-0.5">Max 2 abilita negative per giocatore.</p>
                    </div>
                    <div class="grid grid-cols-1 gap-2">
                        ${sortedNegative.map(ability => this.renderAbilityCard(ability)).join('')}
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
            'Speciale': 'Speciale'
        };
        return labels[role] || role;
    }
};

console.log("Modulo Abilities Encyclopedia UI caricato.");
