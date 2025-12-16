//
// ====================================================================
// ABILITIES-ENCYCLOPEDIA-UI.JS - Interfaccia Enciclopedia Abilita
// ====================================================================
//

window.AbilitiesUI = {
    
    currentFilter: 'all',
    currentSearch: '',
    
    /**
     * Apre l'enciclopedia in un overlay
     */
    open() {
        // Crea overlay se non esiste
        let overlay = document.getElementById('abilities-encyclopedia-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'abilities-encyclopedia-overlay';
            overlay.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto hidden';
            document.body.appendChild(overlay);
        }
        
        // Render contenuto
        this.render();
        
        // Mostra overlay
        overlay.classList.remove('hidden');
    },
    
    /**
     * Chiude l'enciclopedia
     */
    close() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
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
     * Render principale
     */
    render() {
        const overlay = document.getElementById('abilities-encyclopedia-overlay');
        if (!overlay) return;
        
        const stats = window.AbilitiesEncyclopedia.getAbilityStats();
        const abilities = this.getFilteredAbilities();
        
        overlay.innerHTML = `
            <div class="container mx-auto px-4 py-8 max-w-7xl">
                
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-t-lg p-6 border-b-4 border-yellow-500">
                    <div class="flex justify-between items-center">
                        <div>
                            <h1 class="text-4xl font-bold text-white mb-2">📔 Enciclopedia Abilita</h1>
                            <p class="text-gray-300">Guida completa a tutte le ${stats.total} Abilita speciali</p>
                        </div>
                        <button onclick="window.AbilitiesUI.close()" 
                                class="text-white hover:text-red-400 text-4xl font-bold">
                            X
                        </button>
                    </div>
                    
                    <!-- Stats Quick View -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div class="bg-black bg-opacity-30 rounded p-3 text-center">
                            <p class="text-2xl font-bold text-yellow-400">${stats.total}</p>
                            <p class="text-xs text-gray-300">Abilita Totali</p>
                        </div>
                        <div class="bg-black bg-opacity-30 rounded p-3 text-center">
                            <p class="text-2xl font-bold text-red-400">${stats.byRarity.Leggendaria}</p>
                            <p class="text-xs text-gray-300">Leggendarie</p>
                        </div>
                        <div class="bg-black bg-opacity-30 rounded p-3 text-center">
                            <p class="text-2xl font-bold text-purple-400">${stats.byRarity.Rara}</p>
                            <p class="text-xs text-gray-300">Rare</p>
                        </div>
                        <div class="bg-black bg-opacity-30 rounded p-3 text-center">
                            <p class="text-2xl font-bold text-blue-400">${stats.byRarity.Comune}</p>
                            <p class="text-xs text-gray-300">Comuni</p>
                        </div>
                    </div>
                </div>
                
                <!-- Filters & Search -->
                <div class="bg-gray-800 p-4 border-b-2 border-gray-700">
                    
                    <!-- Search Bar -->
                    <div class="mb-4">
                        <input type="text" 
                               id="ability-search" 
                               placeholder="🔎 Cerca Abilita..."
                               onkeyup="window.AbilitiesUI.handleSearch(this.value)"
                               class="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border-2 border-gray-600 focus:border-purple-500 focus:outline-none text-lg">
                    </div>
                    
                    <!-- Role Filters -->
                    <div class="flex flex-wrap gap-2">
                        <button onclick="window.AbilitiesUI.filter('all')"
                                class="filter-btn ${this.currentFilter === 'all' ? 'bg-purple-600' : 'bg-gray-700'} hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                            Tutte (${stats.total})
                        </button>
                        <button onclick="window.AbilitiesUI.filter('P')"
                                class="filter-btn ${this.currentFilter === 'P' ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            🧤 Portieri (${stats.byRole.P})
                        </button>
                        <button onclick="window.AbilitiesUI.filter('D')"
                                class="filter-btn ${this.currentFilter === 'D' ? 'bg-indigo-600' : 'bg-gray-700'} hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                            🛡️ Difensori (${stats.byRole.D})
                        </button>
                        <button onclick="window.AbilitiesUI.filter('C')"
                                class="filter-btn ${this.currentFilter === 'C' ? 'bg-green-600' : 'bg-gray-700'} hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                            ⚽ Centrocampisti (${stats.byRole.C})
                        </button>
                        <button onclick="window.AbilitiesUI.filter('A')"
                                class="filter-btn ${this.currentFilter === 'A' ? 'bg-red-600' : 'bg-gray-700'} hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                            ⚡ Attaccanti (${stats.byRole.A})
                        </button>
                        <button onclick="window.AbilitiesUI.filter('Multi')"
                                class="filter-btn ${this.currentFilter === 'Multi' ? 'bg-pink-600' : 'bg-gray-700'} hover:bg-pink-700 text-white font-bold py-2 px-4 rounded">
                            🌟 Multiruolo (${stats.byRole.Multi})
                        </button>
                        <button onclick="window.AbilitiesUI.filter('Icone')"
                                class="filter-btn ${this.currentFilter === 'Icone' ? 'bg-yellow-600' : 'bg-gray-700'} hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                            👑 Abilita Icone (${stats.byRarity.Unica})
                        </button>
                    </div>
                </div>
                
                <!-- Abilities Grid -->
                <div class="bg-gray-900 p-6 rounded-b-lg">
                    ${abilities.length > 0 ? `
                        ${this.renderAbilitiesByType(abilities)}
                    ` : `
                        <div class="text-center py-12">
                            <p class="text-4xl mb-4">😢</p>
                            <p class="text-xl text-gray-400">Nessuna Abilita trovata</p>
                            <p class="text-sm text-gray-500 mt-2">Prova con un'altra ricerca o filtro</p>
                        </div>
                    `}
                </div>
                
                <!-- Footer Tips -->
                <div class="bg-gray-800 p-4 mt-4 rounded-lg border-2 border-gray-700">
                    <h3 class="text-lg font-bold text-yellow-400 mb-2">💡 Suggerimenti</h3>
                    <ul class="text-sm text-gray-300 space-y-1">
                        <li>• Clicca su una card per vedere i dettagli completi</li>
                        <li>• Le Abilita <span class="text-red-400">Leggendarie</span> sono le piu rare e potenti</li>
                        <li>• Combina Abilita con <span class="text-purple-400">sinergia</span> per strategie devastanti</li>
                        <li>• L'Abilita <span class="text-yellow-400">Icona</span> e unica e la piu potente del gioco</li>
                    </ul>
                </div>
                
            </div>
        `;
    },
    
    /**
     * Render singola card Abilita
     */
    renderAbilityCard(ability) {
        const rarityColor = {
            'Comune': 'border-gray-500',
            'Rara': 'border-purple-500',
            'Leggendaria': 'border-red-500',
            'Unica': 'border-yellow-500'
        };
        
        const rarityBg = {
            'Comune': 'bg-gray-700',
            'Rara': 'bg-purple-900',
            'Leggendaria': 'bg-red-900',
            'Unica': 'bg-yellow-900'
        };
        
        return `
            <div class="ability-card bg-gray-800 rounded-lg p-4 border-2 ${rarityColor[ability.rarity]} hover:border-white transition-all cursor-pointer transform hover:scale-105"
                 onclick="window.AbilitiesUI.showDetails('${ability.name}')">
                
                <!-- Header -->
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-4xl">${ability.icon}</span>
                        <div>
                            <h3 class="text-lg font-bold ${ability.color}">${ability.name}</h3>
                            <p class="text-xs text-gray-400">${this.getRoleLabel(ability.role)} • ${ability.phase || 'Multi-fase'}</p>
                        </div>
                    </div>
                    <span class="text-xs ${rarityBg[ability.rarity]} px-2 py-1 rounded font-bold">
                        ${ability.rarity}
                    </span>
                </div>
                
                <!-- Description -->
                <p class="text-sm text-gray-300 mb-3">${ability.description}</p>
                
                <!-- Effect Badge -->
                <div class="bg-black bg-opacity-40 rounded p-2 mb-3">
                    <p class="text-xs text-yellow-400 font-bold mb-1">⚡ EFFETTO</p>
                    <p class="text-sm text-white">${ability.effect}</p>
                </div>
                
                <!-- Activation -->
                <div class="flex items-center gap-2 text-xs">
                    <span class="bg-green-900 text-green-300 px-2 py-1 rounded font-bold">
                        ${ability.activation}
                    </span>
                    ${ability.warning ? `
                        <span class="bg-red-900 text-red-300 px-2 py-1 rounded font-bold">
                            ⚠️ Rischio
                        </span>
                    ` : ''}
                    ${ability.impact ? `
                        <span class="text-yellow-400 font-bold">
                            ${ability.impact}
                        </span>
                    ` : ''}
                </div>
                
                <div class="mt-3 text-center">
                    <p class="text-xs text-purple-400">Clicca per dettagli 📔</p>
                </div>
            </div>
        `;
    },
    
    /**
     * Mostra dettagli completi Abilita
     */
    showDetails(abilityName) {
        const ability = window.AbilitiesEncyclopedia.abilities[abilityName];
        if (!ability) return;
        
        const rarityColor = {
            'Comune': 'text-gray-400',
            'Rara': 'text-purple-400',
            'Leggendaria': 'text-red-400',
            'Unica': 'text-yellow-400'
        };
        
        // Crea modal (z-index più alto del rules-panel z-[9999] per apparire sopra)
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-95 z-[10000] flex items-center justify-center p-4';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg max-w-3xl w-full max-h-screen overflow-y-auto border-4 ${ability.rarity === 'Leggendaria' ? 'border-red-500' : ability.rarity === 'Unica' ? 'border-yellow-500' : 'border-purple-500'}">
                
                <!-- Header -->
                <div class="bg-gradient-to-r from-gray-900 to-gray-800 p-6 sticky top-0 z-10">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-4">
                            <span class="text-6xl">${ability.icon}</span>
                            <div>
                                <h2 class="text-3xl font-bold ${ability.color}">${ability.name}</h2>
                                <p class="text-gray-400">${this.getRoleLabel(ability.role)}</p>
                                <span class="${rarityColor[ability.rarity]} font-bold text-lg">${ability.rarity}</span>
                            </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()"
                                class="text-white hover:text-red-400 text-4xl font-bold">
                            X
                        </button>
                    </div>
                </div>
                
                <!-- Content -->
                <div class="p-6 space-y-6">
                    
                    <!-- Description -->
                    <div class="bg-gray-900 rounded-lg p-4">
                        <h3 class="text-xl font-bold text-yellow-400 mb-2">→ Descrizione</h3>
                        <p class="text-lg text-white">${ability.description}</p>
                    </div>
                    
                    <!-- Effect -->
                    <div class="bg-purple-900 bg-opacity-30 rounded-lg p-4 border-2 border-purple-500">
                        <h3 class="text-xl font-bold text-purple-400 mb-2">⚡ Effetto</h3>
                        <p class="text-lg text-white font-bold">${ability.effect}</p>
                    </div>
                    
                    <!-- Mechanics -->
                    <div class="bg-gray-900 rounded-lg p-4">
                        <h3 class="text-xl font-bold text-blue-400 mb-2">⚙️ Come Funziona</h3>
                        <p class="text-white">${ability.mechanics}</p>
                    </div>
                    
                    <!-- Example -->
                    <div class="bg-green-900 bg-opacity-30 rounded-lg p-4 border-2 border-green-500">
                        <h3 class="text-xl font-bold text-green-400 mb-2">→ Esempio</h3>
                        <p class="text-white font-mono text-sm">${ability.example}</p>
                    </div>
                    
                    <!-- Activation & Phase -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-900 rounded-lg p-4">
                            <h3 class="text-lg font-bold text-yellow-400 mb-2">→ Attivazione</h3>
                            <p class="text-white text-2xl font-bold">${ability.activation}</p>
                        </div>
                        <div class="bg-gray-900 rounded-lg p-4">
                            <h3 class="text-lg font-bold text-orange-400 mb-2">🎯 Fase</h3>
                            <p class="text-white text-xl font-bold">${ability.phase || 'Tutte'}</p>
                        </div>
                    </div>
                    
                    <!-- Warning (if any) -->
                    ${ability.warning ? `
                        <div class="bg-red-900 bg-opacity-30 rounded-lg p-4 border-2 border-red-500">
                            <h3 class="text-xl font-bold text-red-400 mb-2">⚠️ Attenzione</h3>
                            <p class="text-white">${ability.warning}</p>
                        </div>
                    ` : ''}
                    
                    <!-- Synergy -->
                    ${ability.synergy ? `
                        <div class="bg-purple-900 bg-opacity-30 rounded-lg p-4 border-2 border-purple-500">
                            <h3 class="text-xl font-bold text-purple-400 mb-2">→ Sinergie</h3>
                            <ul class="space-y-2">
                                ${ability.synergy.map(s => `
                                    <li class="text-white">💡 ${s}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <!-- Impact (if any) -->
                    ${ability.impact ? `
                        <div class="bg-yellow-900 bg-opacity-30 rounded-lg p-4 border-2 border-yellow-500 text-center">
                            <h3 class="text-xl font-bold text-yellow-400 mb-2">→ Impatto</h3>
                            <p class="text-3xl font-bold text-white">${ability.impact}</p>
                        </div>
                    ` : ''}
                    
                </div>
                
                <!-- Footer -->
                <div class="bg-gray-900 p-4 sticky bottom-0">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
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
        this.render();
    },
    
    /**
     * Gestisce ricerca
     */
    handleSearch(query) {
        this.currentSearch = query;
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
            // Mostra solo abilità Multi-ruolo (non Uniche)
            abilities = Object.values(window.AbilitiesEncyclopedia.abilities)
                .filter(a => a.role === 'Multi' && a.rarity !== 'Unica');
        } else if (this.currentFilter === 'Icone') {
            // Mostra solo abilità Uniche (Abilità Icone)
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
     * Renderizza Abilita  separate per tipo (positive/negative)
     */
    /**
     * Ordina abilita per rarità: Comune, Rara, Epica, Leggendaria, Unica
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

    renderAbilitiesByType(abilities) {
        // Separa abilita uniche dalle altre
        const unique = abilities.filter(a => a.rarity === 'Unica');
        const normalAbilities = abilities.filter(a => a.rarity !== 'Unica');

        const positive = normalAbilities.filter(a => a.type === 'Positiva' || a.type === 'Leggendaria' || a.type === 'Epica');
        const negative = normalAbilities.filter(a => a.type === 'Negativa');

        // Ordina per rarità
        const sortedPositive = this.sortByRarity(positive);
        const sortedNegative = this.sortByRarity(negative);

        let html = '';

        // Sezione Abilita Uniche (ICONE) - mostra solo se non siamo già nel filtro Icone
        if (unique.length > 0) {
            const isIconeFilter = this.currentFilter === 'Icone';
            html += `
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-4 pb-2 border-b-2 border-yellow-500">
                        <span class="text-3xl">👑</span>
                        <h3 class="text-2xl font-bold text-yellow-400">${isIconeFilter ? 'Abilita Icone' : 'Abilita Uniche - Icone'} (${unique.length})</h3>
                    </div>
                    <div class="bg-yellow-900 bg-opacity-20 rounded-lg p-4 mb-4 border-2 border-yellow-700">
                        <p class="text-yellow-300 font-bold">✨ Abilita Esclusive!</p>
                        <p class="text-gray-300 text-sm mt-1">Queste abilita sono riservate esclusivamente ai giocatori Icona. Ogni Icona ha la propria abilita unica oltre all'abilita base "Icona". Le Icone non possono acquisire altre abilita.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${unique.map(ability => this.renderAbilityCard(ability)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Sezione Abilita  Positive
        if (positive.length > 0) {
            html += `
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-4 pb-2 border-b-2 border-green-500">
                        <span class="text-3xl">✅</span>
                        <h3 class="text-2xl font-bold text-green-400">Abilita  Positive (${positive.length})</h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${sortedPositive.map(ability => this.renderAbilityCard(ability)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Sezione Abilita  Negative
        if (negative.length > 0) {
            html += `
                <div>
                    <div class="flex items-center gap-3 mb-4 pb-2 border-b-2 border-red-500">
                        <span class="text-3xl">❌</span>
                        <h3 class="text-2xl font-bold text-red-400">Abilita  Negative (${negative.length})</h3>
                    </div>
                    <div class="bg-red-900 bg-opacity-20 rounded-lg p-4 mb-4 border-2 border-red-700">
                        <p class="text-yellow-300 font-bold">⚠️ Attenzione!</p>
                        <p class="text-gray-300 text-sm mt-1">Le Abilita  negative hanno effetti dannosi. Ogni giocatore puo avere MAX 2 Abilita  negativa.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
