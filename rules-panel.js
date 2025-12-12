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
     * Renderizza una card abilita in formato mini con preview al click
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

        // Escapa caratteri speciali per evitare problemi con onclick
        const safeName = ability.name.replace(/'/g, "\\'");

        return `
            <div class="bg-gray-800 rounded p-2 border ${rarityBorder[ability.rarity] || 'border-gray-600'} hover:bg-gray-700 cursor-pointer transition relative ability-preview-card"
                 onclick="window.RulesPanel.showAbilityPreview('${safeName}', event)">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${ability.icon}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-bold ${ability.color} text-sm truncate">${ability.name}</p>
                        <p class="text-xs text-gray-400">${roleDisplay} | ${ability.rarity}</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Mostra preview rapida dell'abilita al click
     * @param {string} abilityName - Nome dell'abilita
     * @param {Event} event - Evento click
     */
    showAbilityPreview(abilityName, event) {
        event.stopPropagation();

        // Rimuovi preview esistente
        this.hideAbilityPreview();

        const ability = window.AbilitiesEncyclopedia?.abilities[abilityName];
        if (!ability) {
            console.warn('Abilita non trovata:', abilityName);
            return;
        }

        const rarityColors = {
            'Comune': 'border-gray-500 bg-gray-900',
            'Rara': 'border-purple-500 bg-purple-900',
            'Leggendaria': 'border-red-500 bg-red-900',
            'Epica': 'border-orange-500 bg-orange-900',
            'Unica': 'border-yellow-500 bg-yellow-900'
        };

        const typeIcon = ability.type === 'Negativa' ? '❌' : '✅';
        const typeColor = ability.type === 'Negativa' ? 'text-red-400' : 'text-green-400';

        const preview = document.createElement('div');
        preview.id = 'ability-preview-popup';
        preview.className = `fixed z-[10000] p-4 rounded-xl border-2 ${rarityColors[ability.rarity] || 'border-gray-500 bg-gray-900'} shadow-2xl max-w-sm animate-fade-in`;

        preview.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${ability.icon}</span>
                    <div>
                        <h4 class="font-bold ${ability.color} text-lg">${ability.name}</h4>
                        <p class="text-xs text-gray-400">${ability.rarity} | ${typeIcon} <span class="${typeColor}">${ability.type}</span></p>
                    </div>
                </div>
                <button onclick="window.RulesPanel.hideAbilityPreview()" class="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>

            <div class="bg-black bg-opacity-40 rounded p-3 mb-3">
                <p class="text-white text-sm">${ability.description}</p>
            </div>

            <div class="flex flex-wrap gap-2 text-xs mb-3">
                <span class="bg-blue-800 px-2 py-1 rounded text-blue-200">📍 Fase: ${ability.phase || 'N/A'}</span>
                <span class="bg-green-800 px-2 py-1 rounded text-green-200">🎯 Prob: ${ability.probability || 'N/A'}</span>
            </div>

            <button onclick="window.AbilitiesUI.showDetails('${ability.name.replace(/'/g, "\\'")}'); window.RulesPanel.hideAbilityPreview();"
                    class="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 rounded transition">
                📔 Vedi dettagli completi
            </button>
        `;

        document.body.appendChild(preview);

        // Posiziona il popup vicino al click
        const rect = event.target.closest('.ability-preview-card')?.getBoundingClientRect();
        if (rect) {
            let top = rect.bottom + 10;
            let left = rect.left;

            // Assicurati che il popup sia visibile
            const popupRect = preview.getBoundingClientRect();

            if (left + popupRect.width > window.innerWidth) {
                left = window.innerWidth - popupRect.width - 20;
            }
            if (top + popupRect.height > window.innerHeight) {
                top = rect.top - popupRect.height - 10;
            }

            preview.style.top = `${Math.max(10, top)}px`;
            preview.style.left = `${Math.max(10, left)}px`;
        } else {
            // Fallback: centra lo schermo
            preview.style.top = '50%';
            preview.style.left = '50%';
            preview.style.transform = 'translate(-50%, -50%)';
        }

        // Chiudi cliccando fuori
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 100);
    },

    /**
     * Nasconde la preview dell'abilita
     */
    hideAbilityPreview() {
        const popup = document.getElementById('ability-preview-popup');
        if (popup) {
            popup.remove();
        }
        document.removeEventListener('click', this.handleOutsideClick);
    },

    /**
     * Gestisce click fuori dal popup
     */
    handleOutsideClick(event) {
        const popup = document.getElementById('ability-preview-popup');
        if (popup && !popup.contains(event.target)) {
            window.RulesPanel.hideAbilityPreview();
        }
    }
};

console.log("Modulo Rules-Panel caricato.");
