//
// ====================================================================
// RULES-PANEL.JS - Pannello Regole con Enciclopedia Collassabile
// ====================================================================
//

window.RulesPanel = {

    isOpen: false,
    isEncyclopediaExpanded: false,
    encyclopediaLoaded: false,

    /**
     * Ordina le abilità per rarità (Comune -> Rara -> Epica -> Leggendaria -> Unica)
     * @param {Array} abilities - Array di abilità
     * @returns {Array} - Array ordinato
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
            return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
        });
    },

    /**
     * Apre il pannello regole
     */
    open() {
        const panel = document.getElementById('rules-panel');
        if (panel) {
            panel.classList.remove('hidden');
            this.isOpen = true;
        }
    },

    /**
     * Chiude il pannello regole
     */
    close() {
        const panel = document.getElementById('rules-panel');
        if (panel) {
            panel.classList.add('hidden');
            this.isOpen = false;
        }
    },

    /**
     * Toggle apri/chiudi pannello regole
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    /**
     * Toggle espansione enciclopedia abilita
     */
    toggleEncyclopedia() {
        const content = document.getElementById('encyclopedia-content');
        const arrow = document.getElementById('encyclopedia-arrow');

        if (!content || !arrow) return;

        this.isEncyclopediaExpanded = !this.isEncyclopediaExpanded;

        if (this.isEncyclopediaExpanded) {
            content.classList.remove('hidden');
            arrow.textContent = '▲';
            arrow.style.transform = 'rotate(180deg)';

            // Carica contenuto enciclopedia se non ancora caricato
            if (!this.encyclopediaLoaded) {
                this.loadEncyclopediaContent();
            }
        } else {
            content.classList.add('hidden');
            arrow.textContent = '▼';
            arrow.style.transform = 'rotate(0deg)';
        }
    },

    /**
     * Carica il contenuto dell'enciclopedia abilita
     */
    loadEncyclopediaContent() {
        const container = document.getElementById('encyclopedia-container');
        if (!container) return;

        if (!window.AbilitiesEncyclopedia) {
            container.innerHTML = '<p class="text-red-400 text-center">Errore: Enciclopedia non disponibile.</p>';
            return;
        }

        const stats = window.AbilitiesEncyclopedia.getAbilityStats();
        const abilities = Object.values(window.AbilitiesEncyclopedia.abilities);

        // Separa abilita per tipo (positive/negative)
        const positive = abilities.filter(a => a.type === 'Positiva' || a.type === 'Leggendaria' || a.type === 'Epica');
        const negative = abilities.filter(a => a.type === 'Negativa');

        // Separa abilita specifiche per un solo ruolo da quelle multi-ruolo/universali
        const singleRolePositive = positive.filter(a => ['P', 'D', 'C', 'A'].includes(a.role));
        const multiRolePositive = positive.filter(a => a.role === 'Multi' || a.role === 'Tutti' || a.role === 'Speciale');

        const singleRoleNegative = negative.filter(a => ['P', 'D', 'C', 'A'].includes(a.role));
        const multiRoleNegative = negative.filter(a => a.role === 'Multi' || a.role === 'Tutti' || a.role === 'Speciale');

        // Raggruppa per ruolo specifico e ordina per rarità
        const byRolePositive = {
            'P': this.sortByRarity(singleRolePositive.filter(a => a.role === 'P')),
            'D': this.sortByRarity(singleRolePositive.filter(a => a.role === 'D')),
            'C': this.sortByRarity(singleRolePositive.filter(a => a.role === 'C')),
            'A': this.sortByRarity(singleRolePositive.filter(a => a.role === 'A'))
        };

        const byRoleNegative = {
            'P': this.sortByRarity(singleRoleNegative.filter(a => a.role === 'P')),
            'D': this.sortByRarity(singleRoleNegative.filter(a => a.role === 'D')),
            'C': this.sortByRarity(singleRoleNegative.filter(a => a.role === 'C')),
            'A': this.sortByRarity(singleRoleNegative.filter(a => a.role === 'A'))
        };

        // Ordina anche le multi-ruolo per rarità
        const sortedMultiRolePositive = this.sortByRarity(multiRolePositive);
        const sortedMultiRoleNegative = this.sortByRarity(multiRoleNegative);

        const roleLabels = {
            'P': { name: 'Portiere', emoji: '🧤', color: 'text-blue-400', border: 'border-blue-500' },
            'D': { name: 'Difensore', emoji: '🛡️', color: 'text-green-400', border: 'border-green-500' },
            'C': { name: 'Centrocampista', emoji: '⚙️', color: 'text-yellow-400', border: 'border-yellow-500' },
            'A': { name: 'Attaccante', emoji: '⚡', color: 'text-red-400', border: 'border-red-500' }
        };

        container.innerHTML = `
            <!-- Stats rapide -->
            <div class="grid grid-cols-4 gap-2 mb-6">
                <div class="bg-black bg-opacity-30 rounded p-2 text-center">
                    <p class="text-xl font-bold text-yellow-400">${stats.total}</p>
                    <p class="text-xs text-gray-400">Totali</p>
                </div>
                <div class="bg-black bg-opacity-30 rounded p-2 text-center">
                    <p class="text-xl font-bold text-red-400">${stats.byRarity.Leggendaria}</p>
                    <p class="text-xs text-gray-400">Leggendarie</p>
                </div>
                <div class="bg-black bg-opacity-30 rounded p-2 text-center">
                    <p class="text-xl font-bold text-purple-400">${stats.byRarity.Rara}</p>
                    <p class="text-xs text-gray-400">Rare</p>
                </div>
                <div class="bg-black bg-opacity-30 rounded p-2 text-center">
                    <p class="text-xl font-bold text-blue-400">${stats.byRarity.Comune}</p>
                    <p class="text-xs text-gray-400">Comuni</p>
                </div>
            </div>

            <!-- Bottone per aprire enciclopedia completa -->
            <button onclick="window.AbilitiesUI.open(); window.RulesPanel.close();"
                    class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg mb-6 transition">
                📔 Apri Enciclopedia Completa (con ricerca e filtri)
            </button>

            <!-- SEZIONE ABILITA POSITIVE -->
            <div class="mb-6">
                <h4 class="text-lg font-bold text-green-400 mb-3 border-b border-green-600 pb-2">
                    ✅ Abilita Positive (${positive.length})
                </h4>

                <!-- Abilita per ruolo specifico -->
                ${Object.entries(byRolePositive).map(([role, abils]) => {
                    if (abils.length === 0) return '';
                    const info = roleLabels[role];
                    return `
                        <div class="mb-4">
                            <h5 class="text-sm font-bold ${info.color} mb-2 flex items-center gap-2">
                                <span>${info.emoji}</span> ${info.name} (${abils.length})
                            </h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                ${abils.map(a => this.renderAbilityMini(a)).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}

                <!-- Abilita multi-ruolo -->
                ${sortedMultiRolePositive.length > 0 ? `
                    <div class="mt-4 pt-4 border-t border-gray-700">
                        <h5 class="text-sm font-bold text-pink-400 mb-2 flex items-center gap-2">
                            <span>🌟</span> Multi-Ruolo / Universali (${sortedMultiRolePositive.length})
                        </h5>
                        <div class="bg-pink-900 bg-opacity-20 rounded p-2 mb-2 border border-pink-700">
                            <p class="text-pink-300 text-xs">Queste abilita possono essere usate da piu ruoli</p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${sortedMultiRolePositive.map(a => this.renderAbilityMini(a, true)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- SEZIONE ABILITA NEGATIVE -->
            <div>
                <h4 class="text-lg font-bold text-red-400 mb-3 border-b border-red-600 pb-2">
                    ❌ Abilita Negative (${negative.length})
                </h4>
                <div class="bg-red-900 bg-opacity-20 rounded p-2 mb-3 border border-red-700">
                    <p class="text-yellow-300 text-xs">⚠️ Le abilita negative hanno effetti dannosi. Max 2 per giocatore.</p>
                </div>

                <!-- Abilita negative per ruolo specifico -->
                ${Object.entries(byRoleNegative).map(([role, abils]) => {
                    if (abils.length === 0) return '';
                    const info = roleLabels[role];
                    return `
                        <div class="mb-4">
                            <h5 class="text-sm font-bold ${info.color} mb-2 flex items-center gap-2">
                                <span>${info.emoji}</span> ${info.name} (${abils.length})
                            </h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                ${abils.map(a => this.renderAbilityMini(a)).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}

                <!-- Abilita negative multi-ruolo -->
                ${sortedMultiRoleNegative.length > 0 ? `
                    <div class="mt-4 pt-4 border-t border-gray-700">
                        <h5 class="text-sm font-bold text-pink-400 mb-2 flex items-center gap-2">
                            <span>🌟</span> Multi-Ruolo (${sortedMultiRoleNegative.length})
                        </h5>
                        <div class="bg-pink-900 bg-opacity-20 rounded p-2 mb-2 border border-pink-700">
                            <p class="text-pink-300 text-xs">Queste abilita negative possono colpire piu ruoli</p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${sortedMultiRoleNegative.map(a => this.renderAbilityMini(a, true)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        this.encyclopediaLoaded = true;
    },

    /**
     * Renderizza una card abilita in formato mini
     * @param {Object} ability - Dati dell'abilita
     * @param {boolean} isMultiRole - Se true, mostra i ruoli disponibili
     */
    renderAbilityMini(ability, isMultiRole = false) {
        const rarityBorder = {
            'Comune': 'border-gray-600',
            'Rara': 'border-purple-500',
            'Leggendaria': 'border-red-500',
            'Epica': 'border-orange-500',
            'Unica': 'border-yellow-500'
        };

        const roleLabel = {
            'P': '🧤',
            'D': '🛡️',
            'C': '⚙️',
            'A': '⚡',
            'Tutti': '🌟',
            'Speciale': '✨',
            'Multi': '🌟'
        };

        // Per le abilita multi-ruolo, mostra i ruoli disponibili
        let roleDisplay = '';
        if (isMultiRole && ability.roles && ability.roles.length > 0) {
            roleDisplay = ability.roles.map(r => roleLabel[r] || r).join(' ');
        } else if (ability.role === 'Tutti') {
            roleDisplay = '🌟 Tutti';
        } else {
            roleDisplay = roleLabel[ability.role] || ability.role;
        }

        return `
            <div class="bg-gray-800 rounded p-2 border ${rarityBorder[ability.rarity] || 'border-gray-600'} hover:bg-gray-700 cursor-pointer transition"
                 onclick="window.AbilitiesUI.showDetails('${ability.name}')">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${ability.icon}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-bold ${ability.color} text-sm truncate">${ability.name}</p>
                        <p class="text-xs text-gray-400">${roleDisplay} | ${ability.rarity}</p>
                    </div>
                </div>
            </div>
        `;
    }
};

console.log("Modulo Rules-Panel caricato.");
