//
// ====================================================================
// CREDITI-SUPER-SERI-UI.JS - Interfaccia Utente per CSS
// ====================================================================
// Gestisce la visualizzazione e interazione con i Crediti Super Seri
//

window.CreditiSuperSeriUI = {

    // Mappatura rarità stringa -> valore numerico per calcolo costi rimozione
    // Formula: 5 + (2 × valore) → Comune: 7, Rara: 8, Epica: 9, Leggendaria: 10
    RARITY_TO_VALUE: {
        'Comune': 1.0,
        'Rara': 1.5,
        'Epica': 2.0,
        'Leggendaria': 2.5,
        'Unica': 5  // Per filtro, non usato nel calcolo costi
    },

    /**
     * Renderizza il widget saldo CSS nella dashboard
     * @param {HTMLElement} container
     * @param {number} saldo
     * @param {boolean} enabled
     */
    renderSaldoWidget(container, saldo, enabled) {
        if (!enabled) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="p-4 bg-gradient-to-r from-amber-900 to-yellow-900 rounded-lg border-2 border-amber-500 shadow-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">💰</span>
                        <div>
                            <p class="text-amber-300 text-sm font-semibold">Crediti Super Seri</p>
                            <p class="text-white text-2xl font-extrabold">${saldo} CSS</p>
                        </div>
                    </div>
                    <button id="btn-open-css-shop"
                            class="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-2 px-4 rounded-lg shadow-md transition duration-150 flex items-center gap-2">
                        <span>Acquista</span>
                        <span class="text-lg">🛒</span>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Apre il pannello di potenziamento
     * @param {Array} rosa - Lista giocatori in rosa
     * @param {number} saldo - Saldo CSS attuale
     */
    openPotenziamentoPanel(rosa, saldo) {
        // Crea overlay
        const overlay = document.createElement('div');
        overlay.id = 'css-potenziamento-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto';

        overlay.innerHTML = `
            <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
                <!-- Header Mobile-First -->
                <div class="sticky top-0 z-10 bg-black/80 backdrop-blur-md -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 mb-4 border-b border-amber-500/30">
                    <div class="flex items-center justify-between gap-2">
                        <!-- Title & Close -->
                        <div class="flex items-center gap-3 min-w-0">
                            <button id="btn-close-css-panel"
                                    class="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-red-600/80 hover:bg-red-500 text-white rounded-lg border border-red-500/50 transition shadow-lg">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                            <div class="min-w-0">
                                <h2 class="text-lg sm:text-xl font-bold text-amber-400 truncate">Potenziamento</h2>
                            </div>
                        </div>
                        <!-- Saldo Badge -->
                        <div class="flex-shrink-0 bg-gradient-to-r from-amber-900/80 to-yellow-900/80 border border-amber-500/50 rounded-lg px-3 py-1.5">
                            <div class="flex items-center gap-1.5">
                                <span class="text-amber-300 text-xs hidden sm:inline">Saldo:</span>
                                <span class="text-lg">💰</span>
                                <span id="css-saldo-display" class="text-white font-bold text-sm sm:text-base">${saldo}</span>
                                <span class="text-amber-400 text-xs font-semibold">CSS</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabs - Horizontal Scroll -->
                <div class="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
                    <button id="tab-potenziamento" class="tab-btn active flex-shrink-0 bg-amber-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg text-sm whitespace-nowrap">
                        ⬆️ Livello
                    </button>
                    <button id="tab-abilita" class="tab-btn flex-shrink-0 bg-gray-700 text-gray-300 font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-600 text-sm whitespace-nowrap">
                        ✨ Abilita
                    </button>
                    <button id="tab-rimuovi" class="tab-btn flex-shrink-0 bg-gray-700 text-gray-300 font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-600 text-sm whitespace-nowrap">
                        🗑️ Rimuovi
                    </button>
                    <button id="tab-upgrade-max" class="tab-btn flex-shrink-0 bg-gray-700 text-gray-300 font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-600 text-sm whitespace-nowrap">
                        📈 Max
                    </button>
                    <button id="tab-servizi" class="tab-btn flex-shrink-0 bg-gray-700 text-gray-300 font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-600 text-sm whitespace-nowrap">
                        🛒 Servizi
                    </button>
                </div>

                <!-- Content -->
                <div id="css-panel-content" class="bg-gray-800/50 rounded-xl p-3 sm:p-5 border border-gray-700/50">
                    <p class="text-gray-400 text-center">Caricamento...</p>
                </div>

                <!-- Messaggio -->
                <p id="css-action-message" class="text-center mt-3 font-semibold text-sm"></p>
            </div>
        `;

        document.body.appendChild(overlay);

        // Setup eventi
        document.getElementById('btn-close-css-panel').addEventListener('click', () => {
            overlay.remove();
        });

        document.getElementById('tab-potenziamento').addEventListener('click', () => {
            this.setActiveTab('potenziamento');
            this.renderPotenziamentoContent(rosa, saldo);
        });

        document.getElementById('tab-abilita').addEventListener('click', () => {
            this.setActiveTab('abilita');
            this.renderAbilitaContent(rosa, saldo);
        });

        document.getElementById('tab-servizi').addEventListener('click', async () => {
            this.setActiveTab('servizi');
            await this.renderServiziContent(saldo);
        });

        document.getElementById('tab-rimuovi').addEventListener('click', () => {
            this.setActiveTab('rimuovi');
            this.renderRimuoviAbilitaContent(rosa, saldo);
        });

        document.getElementById('tab-upgrade-max').addEventListener('click', () => {
            this.setActiveTab('upgrade-max');
            this.renderUpgradeMassimaleContent(rosa, saldo);
        });

        // Renderizza contenuto iniziale
        this.renderPotenziamentoContent(rosa, saldo);
    },

    /**
     * Imposta la tab attiva
     */
    setActiveTab(tabName) {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.classList.remove('active', 'bg-amber-600', 'text-white');
            tab.classList.add('bg-gray-700', 'text-gray-300');
        });

        const activeTab = document.getElementById(`tab-${tabName}`);
        if (activeTab) {
            activeTab.classList.remove('bg-gray-700', 'text-gray-300');
            activeTab.classList.add('active', 'bg-amber-600', 'text-white');
        }
    },

    /**
     * Renderizza il contenuto del tab Potenziamento
     */
    renderPotenziamentoContent(rosa, saldo) {
        const container = document.getElementById('css-panel-content');
        if (!container) return;

        const CSS = window.CreditiSuperSeri;
        if (!CSS) {
            container.innerHTML = '<p class="text-red-400 text-center">Sistema CSS non disponibile</p>';
            return;
        }

        // Ordina per ruolo: P, D, C, A
        const ordineRuoli = ['P', 'D', 'C', 'A'];
        const rosaSorted = [...rosa].sort((a, b) => {
            return ordineRuoli.indexOf(a.role) - ordineRuoli.indexOf(b.role);
        });

        const roleColors = {
            'P': { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
            'D': { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
            'C': { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' },
            'A': { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' }
        };

        let html = '<div class="space-y-2">';

        rosaSorted.forEach(player => {
            const isIcona = player.abilities && player.abilities.includes('Icona');
            const livelloAttuale = player.currentLevel || player.level || 1;
            const maxLevel = isIcona ? CSS.MAX_LEVEL_ICONA : CSS.MAX_LEVEL_GIOCATORE;
            const costo = CSS.getCostoPotenziamento(livelloAttuale, isIcona);
            const canUpgrade = costo !== null && saldo >= costo;
            const isMaxLevel = livelloAttuale >= maxLevel;
            const colors = roleColors[player.role] || { text: 'text-white', bg: 'bg-gray-500/20', border: 'border-gray-500/50' };
            const progressPct = Math.min((livelloAttuale / maxLevel) * 100, 100);

            html += `
                <div class="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-800/80 rounded-lg border ${colors.border} hover:bg-gray-700/50 transition active:scale-[0.99]">
                    <!-- Role Badge -->
                    <div class="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 ${colors.bg} rounded-lg flex items-center justify-center border ${colors.border}">
                        <span class="font-bold ${colors.text} text-sm sm:text-base">${player.role}</span>
                    </div>

                    <!-- Player Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span class="text-white font-semibold text-sm sm:text-base truncate">${player.name}</span>
                            ${isIcona ? '<span class="flex-shrink-0" title="Icona">👑</span>' : ''}
                        </div>
                        <!-- Level Progress Bar -->
                        <div class="flex items-center gap-2 mt-1">
                            <div class="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div class="h-full ${isMaxLevel ? 'bg-green-500' : 'bg-amber-500'} rounded-full transition-all" style="width: ${progressPct}%"></div>
                            </div>
                            <span class="text-xs ${isMaxLevel ? 'text-green-400' : 'text-amber-400'} font-bold whitespace-nowrap">
                                Lv ${livelloAttuale}/${maxLevel}
                            </span>
                        </div>
                    </div>

                    <!-- Action -->
                    <div class="flex-shrink-0 flex items-center gap-2">
                        ${isMaxLevel
                            ? '<span class="text-green-400 font-bold text-xs px-2 py-1 bg-green-500/20 rounded">MAX</span>'
                            : `<span class="${canUpgrade ? 'text-amber-400' : 'text-red-400'} font-bold text-xs sm:text-sm">${costo}💰</span>
                               <button class="btn-potenzia ${canUpgrade
                                   ? 'bg-amber-500 hover:bg-amber-400 text-gray-900'
                                   : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                 } font-bold w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-sm transition flex items-center justify-center"
                                 data-player-id="${player.id}"
                                 ${canUpgrade ? '' : 'disabled'}>
                                   ⬆️
                               </button>`
                        }
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Collega eventi potenziamento
        container.querySelectorAll('.btn-potenzia').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const playerId = e.target.dataset.playerId;
                await this.handlePotenziamento(playerId);
            });
        });
    },

    /**
     * Renderizza il contenuto del tab Abilita
     * - Icone: mostrano abilità fisse, possono acquisire solo quelle consentite (es: Croccante + Regista)
     * - Giocatori normali: max 4 abilità positive (1 per rarità)
     */
    renderAbilitaContent(rosa, saldo) {
        const container = document.getElementById('css-panel-content');
        if (!container) return;

        const CSS = window.CreditiSuperSeri;
        if (!CSS) {
            container.innerHTML = '<p class="text-red-400 text-center">Sistema CSS non disponibile</p>';
            return;
        }

        // Ordina per ruolo
        const ordineRuoli = ['P', 'D', 'C', 'A'];
        const rosaSorted = [...rosa].sort((a, b) => {
            return ordineRuoli.indexOf(a.role) - ordineRuoli.indexOf(b.role);
        });

        let html = '<div class="space-y-6">';

        rosaSorted.forEach(player => {
            const isIcona = CSS.isIcona(player);
            const currentAbilities = player.abilities || [];
            const iconaId = player.id || player.iconaId;

            // Per Icone: verifica se possono ancora acquisire abilità
            // Per normali: conta abilità positive (1 per rarità = max 4)
            let canAddAbility = false;
            let abilityStatusText = '';

            if (isIcona) {
                // Icone: possono acquisire solo le abilità consentite non ancora possedute
                const disponibiliIcona = CSS.getAbilitaDisponibiliPerIcona(iconaId, currentAbilities);
                canAddAbility = disponibiliIcona.length > 0;
                abilityStatusText = canAddAbility
                    ? `<span class="text-yellow-400">Abilità disponibili: ${disponibiliIcona.join(', ')}</span>`
                    : '<span class="text-gray-500">Abilità fisse</span>';
            } else {
                // Giocatori normali: conta abilità per rarità
                const countRarita = CSS.contaAbilitaPerRarita(currentAbilities);
                const totalPositive = countRarita['Comune'] + countRarita['Rara'] + countRarita['Epica'] + countRarita['Leggendaria'];
                canAddAbility = totalPositive < 4;
                abilityStatusText = `<span class="${canAddAbility ? 'text-gray-400' : 'text-green-400'}">Abilità: ${totalPositive}/4</span>`;
            }

            const roleColors = {
                'P': { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
                'D': { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
                'C': { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' },
                'A': { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' }
            };
            const colors = roleColors[player.role] || { text: 'text-white', bg: 'bg-gray-500/20', border: 'border-gray-500/50' };

            html += `
                <div class="bg-gray-800/80 rounded-lg p-3 sm:p-4 border ${colors.border}">
                    <!-- Header -->
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="flex-shrink-0 w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center border ${colors.border}">
                                <span class="font-bold ${colors.text} text-sm">${player.role}</span>
                            </div>
                            <span class="font-bold text-white text-sm sm:text-base truncate">${player.name}</span>
                            ${isIcona ? '<span class="flex-shrink-0" title="Icona">👑</span>' : ''}
                        </div>
                        <span class="text-xs flex-shrink-0">
                            ${abilityStatusText}
                        </span>
                    </div>

                    <!-- Abilita attuali -->
                    <div class="flex flex-wrap gap-1.5 mb-2">
                        ${currentAbilities.length > 0
                            ? currentAbilities.map(a => `
                                <span class="bg-gray-900/80 text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold border border-amber-600/50">
                                    ${a}
                                </span>
                            `).join('')
                            : '<span class="text-gray-500 text-xs italic">Nessuna abilita</span>'
                        }
                    </div>

                    ${canAddAbility ? `
                        <!-- Selezione nuova abilita -->
                        <div class="pt-2 border-t border-gray-700/50">
                            <div class="flex flex-col sm:flex-row gap-2">
                                <select id="select-ability-${player.id}"
                                        class="flex-1 bg-gray-900 border border-gray-600 text-white rounded-lg px-2.5 py-2 text-xs sm:text-sm">
                                    <option value="">-- Seleziona abilita --</option>
                                    ${this.getAbilitaOptions(player.role, currentAbilities, saldo, isIcona ? iconaId : null)}
                                </select>
                                <button class="btn-assegna-abilita bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg text-xs sm:text-sm transition whitespace-nowrap"
                                        data-player-id="${player.id}">
                                    ✨ Assegna
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Collega eventi assegnazione abilita
        container.querySelectorAll('.btn-assegna-abilita').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const playerId = e.target.dataset.playerId;
                const select = document.getElementById(`select-ability-${playerId}`);
                const abilityName = select?.value;

                if (!abilityName) {
                    this.showMessage('Seleziona un\'abilita', 'error');
                    return;
                }

                await this.handleAssegnaAbilita(playerId, abilityName);
            });
        });
    },

    // Livello massimo assoluto per giocatori normali (GOAT)
    MAX_SECRET_LEVEL: 25,

    /**
     * Renderizza il contenuto del tab Upgrade Massimale
     * Permette di aumentare il livello massimo segreto dei giocatori che hanno raggiunto il max
     * Limite massimo: 25 (GOAT)
     */
    renderUpgradeMassimaleContent(rosa, saldo) {
        const container = document.getElementById('css-panel-content');
        if (!container) return;

        const CSS = window.CreditiSuperSeri;
        const PlayerExp = window.PlayerExp;
        if (!CSS || !PlayerExp) {
            container.innerHTML = '<p class="text-red-400 text-center">Sistema non disponibile</p>';
            return;
        }

        const MAX_LEVEL = this.MAX_SECRET_LEVEL; // 25 = GOAT

        // Filtra giocatori che hanno raggiunto il loro livello massimo segreto
        // Escludi icone (non hanno secretMaxLevel)
        const giocatoriAlMax = rosa.filter(player => {
            const isIcona = player.abilities && player.abilities.includes('Icona');
            if (isIcona) return false;

            const currentLevel = player.currentLevel || player.level || 1;
            const secretMax = player.secretMaxLevel;

            // Deve avere secretMaxLevel e averlo raggiunto
            return secretMax !== undefined && secretMax !== null && currentLevel >= secretMax;
        });

        if (giocatoriAlMax.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <span class="text-6xl">📈</span>
                    <p class="text-gray-400 mt-4">Nessun giocatore ha raggiunto il livello massimo.</p>
                    <p class="text-gray-500 text-sm mt-2">Potenzia i tuoi giocatori fino al loro limite per sbloccare l'upgrade del massimale.</p>
                </div>
            `;
            return;
        }

        // Ordina per ruolo
        const ordineRuoli = ['P', 'D', 'C', 'A'];
        const rosaSorted = [...giocatoriAlMax].sort((a, b) => {
            return ordineRuoli.indexOf(a.role) - ordineRuoli.indexOf(b.role);
        });

        const roleColors = {
            'P': { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
            'D': { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
            'C': { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' },
            'A': { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' }
        };

        let html = `
            <div class="mb-3 p-2.5 sm:p-3 bg-purple-900/30 rounded-lg border border-purple-500/50">
                <p class="text-gray-300 text-xs sm:text-sm">
                    <span class="text-purple-400 font-bold">📈 Upgrade Massimale</span> - Aumenta il livello max raggiungibile
                    <br><span class="text-amber-400 text-xs">Costo: 2 × Livello attuale</span>
                    <span class="mx-1.5 text-gray-600">|</span>
                    <span class="text-yellow-400 text-xs">Limite: Lv.${MAX_LEVEL} 🐐</span>
                </p>
            </div>
            <div class="space-y-2">
        `;

        rosaSorted.forEach(player => {
            const currentLevel = player.currentLevel || player.level || 1;
            const secretMax = player.secretMaxLevel;
            const costo = currentLevel * 2;
            const isAtGoatLevel = secretMax >= MAX_LEVEL;
            const canAfford = saldo >= costo && !isAtGoatLevel;
            const colors = roleColors[player.role] || { text: 'text-white', bg: 'bg-gray-500/20', border: 'border-gray-500/50' };

            html += `
                <div class="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-800/80 rounded-lg border ${colors.border} hover:bg-gray-700/50 transition">
                    <!-- Role Badge -->
                    <div class="flex-shrink-0 w-9 h-9 ${colors.bg} rounded-lg flex items-center justify-center border ${colors.border}">
                        <span class="font-bold ${colors.text} text-sm">${player.role}</span>
                    </div>

                    <!-- Player Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span class="text-white font-semibold text-sm truncate">${player.name}</span>
                            ${isAtGoatLevel ? '<span class="flex-shrink-0 text-xs">🐐</span>' : ''}
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-amber-400 text-xs font-bold">Lv ${currentLevel}</span>
                            <span class="text-gray-500 text-xs">Max:</span>
                            ${isAtGoatLevel
                                ? `<span class="text-yellow-400 font-bold text-xs">${secretMax} GOAT</span>`
                                : `<span class="text-purple-400 font-bold text-xs">${secretMax}</span>
                                   <span class="text-gray-500 text-xs">→</span>
                                   <span class="text-green-400 font-bold text-xs">${secretMax + 1}</span>`
                            }
                        </div>
                    </div>

                    <!-- Action -->
                    <div class="flex-shrink-0 flex items-center gap-2">
                        ${isAtGoatLevel
                            ? '<span class="text-yellow-400 font-bold text-xs px-2 py-1 bg-yellow-500/20 rounded">🐐 GOAT</span>'
                            : `<span class="${canAfford ? 'text-amber-400' : 'text-red-400'} font-bold text-xs">${costo}💰</span>
                               <button class="btn-upgrade-max ${canAfford
                                   ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                   : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                 } font-bold w-8 h-8 rounded-lg text-sm transition flex items-center justify-center"
                                 data-player-id="${player.id}"
                                 data-costo="${costo}"
                                 ${canAfford ? '' : 'disabled'}>
                                   📈
                               </button>`
                        }
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Collega eventi upgrade
        container.querySelectorAll('.btn-upgrade-max').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const playerId = e.target.dataset.playerId;
                await this.handleUpgradeMassimale(playerId);
            });
        });
    },

    /**
     * Gestisce l'upgrade del livello massimo di un giocatore
     * Limite massimo: 25 (GOAT)
     */
    async handleUpgradeMassimale(playerId) {
        const teamId = window.InterfacciaCore?.currentTeamId;
        const teamData = window.InterfacciaCore?.currentTeamData;

        if (!teamId || !teamData) {
            this.showMessage('Errore: dati squadra non disponibili', 'error');
            return;
        }

        // Trova il giocatore
        const player = teamData.players?.find(p => p.id === playerId);
        if (!player) {
            this.showMessage('Errore: giocatore non trovato', 'error');
            return;
        }

        const currentSecretMax = player.secretMaxLevel || 20;
        const MAX_LEVEL = this.MAX_SECRET_LEVEL; // 25 = GOAT

        // Verifica limite GOAT
        if (currentSecretMax >= MAX_LEVEL) {
            this.showMessage(`${player.name} ha gia raggiunto il livello GOAT (${MAX_LEVEL})!`, 'error');
            return;
        }

        const currentLevel = player.currentLevel || player.level || 1;
        const costo = currentLevel * 2;
        const saldo = teamData.creditiSuperSeri || 0;

        if (saldo < costo) {
            this.showMessage(`CSS insufficienti. Servono ${costo} CSS`, 'error');
            return;
        }

        // Conferma
        if (!confirm(`Vuoi aumentare il livello massimo di ${player.name} da ${currentSecretMax} a ${currentSecretMax + 1} per ${costo} CSS?`)) {
            return;
        }

        this.showMessage('Upgrade in corso...', 'info');

        try {
            const { doc, updateDoc, appId } = window.firestoreTools;
            const db = window.db;
            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);

            // Aggiorna il giocatore
            const updatedPlayers = teamData.players.map(p => {
                if (p.id === playerId) {
                    return {
                        ...p,
                        secretMaxLevel: (p.secretMaxLevel || 20) + 1
                    };
                }
                return p;
            });

            // Scala i CSS
            const nuovoSaldo = saldo - costo;

            await updateDoc(teamRef, {
                players: updatedPlayers,
                creditiSuperSeri: nuovoSaldo
            });

            // Aggiorna dati locali
            window.InterfacciaCore.currentTeamData.players = updatedPlayers;
            window.InterfacciaCore.currentTeamData.creditiSuperSeri = nuovoSaldo;

            this.showMessage(
                `Livello massimo di ${player.name} aumentato a ${currentSecretMax + 1}! Saldo: ${nuovoSaldo} CSS`,
                'success'
            );

            // Aggiorna saldo nella UI
            const saldoDisplay = document.getElementById('css-saldo-display');
            if (saldoDisplay) {
                saldoDisplay.textContent = `${nuovoSaldo} CSS`;
            }

            // Ricarica il pannello
            await this.refreshPanel();

        } catch (error) {
            console.error('[CSS] Errore upgrade massimale:', error);
            this.showMessage(`Errore: ${error.message}`, 'error');
        }
    },

    /**
     * Renderizza il contenuto del tab Servizi
     */
    async renderServiziContent(saldo) {
        const container = document.getElementById('css-panel-content');
        if (!container) return;

        const CSS = window.CreditiSuperSeri;
        const costoSostituzioneIcona = CSS?.COSTO_SOSTITUZIONE_ICONA || 5;
        const costoAcquistoCS = CSS?.COSTO_CONVERSIONE_CS || 1;
        const csOttenuti = CSS?.CSS_TO_CS_RATE || 1000;
        const costoSbloccoLega = CSS?.COSTO_SBLOCCO_LEGA || 1;
        const csPerCSS = CSS?.CS_TO_CSS_RATE || 2000;

        const canAffordIcona = saldo >= costoSostituzioneIcona;
        const canAffordCS = saldo >= costoAcquistoCS;
        const canAffordSblocco = saldo >= costoSbloccoLega;

        // Verifica budget CS per conversione CS -> CSS
        const teamData = window.InterfacciaCore?.currentTeamData;
        const budgetCS = teamData?.budget || 0;
        const canAffordCStoCSS = budgetCS >= csPerCSS;

        // Verifica se la squadra e' in cooldown per le leghe private
        const teamId = window.InterfacciaCore?.currentTeamId;
        let isInCooldown = false;
        let cooldownDateStr = '';
        if (teamId && window.PrivateLeagues) {
            const cooldownCheck = await window.PrivateLeagues.isTeamInCooldown(teamId);
            isInCooldown = cooldownCheck.inCooldown;
            if (isInCooldown) {
                cooldownDateStr = window.PrivateLeagues.formatCooldownDate(cooldownCheck.cooldownUntil);
            }
        }

        // Il servizio sblocco lega e' disponibile solo se in cooldown
        const sbloccoLegaDisponibile = isInCooldown && canAffordSblocco;

        container.innerHTML = `
            <div class="space-y-3">
                <!-- Servizio: Sostituisci Icona -->
                <div class="bg-gray-800/80 rounded-lg p-3 border border-orange-500/50 hover:bg-gray-700/50 transition">
                    <div class="flex items-center gap-3">
                        <div class="flex-shrink-0 w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <span class="text-xl">👑</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-white font-bold text-sm sm:text-base">Sostituisci Icona</p>
                            <p class="text-gray-400 text-xs truncate">Cambia l'Icona della squadra</p>
                        </div>
                        <div class="flex-shrink-0 flex items-center gap-2">
                            <span class="${canAffordIcona ? 'text-amber-400' : 'text-red-400'} font-bold text-sm">${costoSostituzioneIcona}💰</span>
                            <button id="btn-sostituisci-icona"
                                    class="${canAffordIcona
                                        ? 'bg-orange-600 hover:bg-orange-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    } font-bold py-1.5 px-3 rounded-lg text-xs sm:text-sm transition"
                                    ${canAffordIcona ? '' : 'disabled'}>
                                Acquista
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Servizio: Acquista CS -->
                <div class="bg-gray-800/80 rounded-lg p-3 border border-green-500/50 hover:bg-gray-700/50 transition">
                    <div class="flex items-center gap-3">
                        <div class="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <span class="text-xl">💰</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-white font-bold text-sm sm:text-base">+${csOttenuti} CS</p>
                            <p class="text-gray-400 text-xs truncate">Converti CSS in Crediti Seri</p>
                        </div>
                        <div class="flex-shrink-0 flex items-center gap-2">
                            <span class="${canAffordCS ? 'text-amber-400' : 'text-red-400'} font-bold text-sm">${costoAcquistoCS}💰</span>
                            <button id="btn-acquista-cs"
                                    class="${canAffordCS
                                        ? 'bg-green-600 hover:bg-green-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    } font-bold py-1.5 px-3 rounded-lg text-xs sm:text-sm transition"
                                    ${canAffordCS ? '' : 'disabled'}>
                                Acquista
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Servizio: Sblocco Lega Privata -->
                <div class="bg-gray-800/80 rounded-lg p-3 border ${isInCooldown ? 'border-purple-500/50' : 'border-gray-600/50'} hover:bg-gray-700/50 transition">
                    <div class="flex items-center gap-3">
                        <div class="flex-shrink-0 w-10 h-10 ${isInCooldown ? 'bg-purple-500/20' : 'bg-gray-500/20'} rounded-lg flex items-center justify-center">
                            <span class="text-xl">🏠</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-white font-bold text-sm sm:text-base">Sblocco Lega</p>
                            <p class="text-gray-400 text-xs truncate">
                                ${isInCooldown ? `Cooldown: ${cooldownDateStr}` : 'Gia disponibile'}
                            </p>
                        </div>
                        <div class="flex-shrink-0 flex items-center gap-2">
                            <span class="${sbloccoLegaDisponibile ? 'text-amber-400' : 'text-gray-500'} font-bold text-sm">${costoSbloccoLega}💰</span>
                            <button id="btn-sblocco-lega"
                                    class="${sbloccoLegaDisponibile
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    } font-bold py-1.5 px-3 rounded-lg text-xs sm:text-sm transition"
                                    ${sbloccoLegaDisponibile ? '' : 'disabled'}>
                                ${isInCooldown ? 'Sblocca' : '✓'}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Servizio: Converti CS in CSS -->
                <div class="bg-gray-800/80 rounded-lg p-3 border border-amber-500/50 hover:bg-gray-700/50 transition">
                    <div class="flex items-center gap-3">
                        <div class="flex-shrink-0 w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <span class="text-xl">💎</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-white font-bold text-sm sm:text-base">CS → CSS</p>
                            <p class="text-gray-400 text-xs truncate">${csPerCSS} CS = 1 CSS (Hai ${budgetCS})</p>
                        </div>
                        <div class="flex-shrink-0 flex items-center gap-2">
                            <span class="${canAffordCStoCSS ? 'text-amber-400' : 'text-red-400'} font-bold text-sm">${csPerCSS}</span>
                            <button id="btn-converti-cs-css"
                                    class="${canAffordCStoCSS
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    } font-bold py-1.5 px-3 rounded-lg text-xs sm:text-sm transition"
                                    ${canAffordCStoCSS ? '' : 'disabled'}>
                                Converti
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event listener per Sostituisci Icona
        const btnSostituisci = document.getElementById('btn-sostituisci-icona');
        if (btnSostituisci && canAffordIcona) {
            btnSostituisci.addEventListener('click', async () => {
                await this.handleSostituisciIcona();
            });
        }

        // Event listener per Acquista CS
        const btnAcquistaCS = document.getElementById('btn-acquista-cs');
        if (btnAcquistaCS && canAffordCS) {
            btnAcquistaCS.addEventListener('click', async () => {
                await this.handleAcquistaCS();
            });
        }

        // Event listener per Sblocco Lega
        const btnSbloccoLega = document.getElementById('btn-sblocco-lega');
        if (btnSbloccoLega && sbloccoLegaDisponibile) {
            btnSbloccoLega.addEventListener('click', async () => {
                await this.handleSbloccoLega();
            });
        }

        // Event listener per Converti CS in CSS
        const btnConvertiCSCSS = document.getElementById('btn-converti-cs-css');
        if (btnConvertiCSCSS && canAffordCStoCSS) {
            btnConvertiCSCSS.addEventListener('click', async () => {
                await this.handleConvertiCSinCSS();
            });
        }
    },

    /**
     * Renderizza il contenuto del tab Rimuovi Abilita
     * Mostra giocatori con abilità rimuovibili (escluse Icona e Uniche)
     */
    renderRimuoviAbilitaContent(rosa, saldo) {
        const container = document.getElementById('css-panel-content');
        if (!container) return;

        const CSS = window.CreditiSuperSeri;
        const Encyclopedia = window.AbilitiesEncyclopedia;
        if (!CSS || !Encyclopedia) {
            container.innerHTML = '<p class="text-red-400 text-center">Sistema non disponibile</p>';
            return;
        }

        // Filtra giocatori con abilità rimuovibili (escluse Icona e Uniche)
        const giocatoriConAbilita = rosa.filter(player => {
            const abilities = player.abilities || [];
            // Escludi abilità Icona e Uniche
            const rimuovibili = abilities.filter(a => {
                if (a === 'Icona') return false;
                const data = Encyclopedia.getAbility(a);
                return data && data.rarity !== 'Unica'; // Non Uniche
            });
            return rimuovibili.length > 0;
        });

        if (giocatoriConAbilita.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <span class="text-6xl">🎯</span>
                    <p class="text-gray-400 mt-4">Nessun giocatore ha abilita rimuovibili.</p>
                    <p class="text-gray-500 text-sm mt-2">Le abilita Icona e Uniche non possono essere rimosse.</p>
                </div>
            `;
            return;
        }

        // Ordina per ruolo
        const ordineRuoli = ['P', 'D', 'C', 'A'];
        const rosaSorted = [...giocatoriConAbilita].sort((a, b) => {
            return ordineRuoli.indexOf(a.role) - ordineRuoli.indexOf(b.role);
        });

        const roleColors = {
            'P': { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
            'D': { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
            'C': { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' },
            'A': { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' }
        };

        let html = `
            <div class="mb-3 p-2.5 bg-gray-800/80 rounded-lg border border-gray-600/50">
                <p class="text-gray-300 text-xs">
                    <span class="text-green-400 font-bold">➕ Positive:</span> 5 + (2 × rarita)
                    <span class="mx-1.5 text-gray-600">|</span>
                    <span class="text-red-400 font-bold">➖ Negative:</span> 5 × (n° rimossi + 1)
                </p>
            </div>
            <div class="space-y-3">
        `;

        rosaSorted.forEach(player => {
            const abilities = player.abilities || [];
            const negativeRemovedCount = player.negativeRemovedCount || 0;

            const positive = [];
            const negative = [];

            abilities.forEach(abilityName => {
                if (abilityName === 'Icona') return;
                const data = Encyclopedia.getAbility(abilityName);
                if (!data || data.rarity === 'Unica') return;

                if (data.isNegative) {
                    negative.push({ name: abilityName, data });
                } else {
                    positive.push({ name: abilityName, data });
                }
            });

            if (positive.length === 0 && negative.length === 0) return;

            const colors = roleColors[player.role] || { text: 'text-white', bg: 'bg-gray-500/20', border: 'border-gray-500/50' };

            html += `
                <div class="bg-gray-800/80 rounded-lg p-3 border ${colors.border}">
                    <!-- Header -->
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="flex-shrink-0 w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center border ${colors.border}">
                                <span class="font-bold ${colors.text} text-sm">${player.role}</span>
                            </div>
                            <span class="font-bold text-white text-sm truncate">${player.name}</span>
                        </div>
                        ${negativeRemovedCount > 0 ? `
                            <span class="flex-shrink-0 text-xs text-red-400 bg-red-900/50 px-1.5 py-0.5 rounded">
                                -${negativeRemovedCount}
                            </span>
                        ` : ''}
                    </div>

                    <div class="space-y-1.5">
            `;

            // Abilità Positive
            positive.forEach(({ name, data }) => {
                const rarityValue = this.RARITY_TO_VALUE[data.rarity] || 1;
                const costo = CSS.getCostoRimozionePositiva(rarityValue);
                const canAfford = saldo >= costo;
                const rarityColors = {
                    'Comune': 'text-gray-400',
                    'Rara': 'text-blue-400',
                    'Epica': 'text-purple-400',
                    'Leggendaria': 'text-yellow-400'
                };

                html += `
                    <div class="flex items-center justify-between gap-2 bg-gray-900/50 p-2 rounded-lg">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="text-green-400 text-xs flex-shrink-0">➕</span>
                            <span class="text-white text-xs sm:text-sm truncate">${data.icon || ''} ${name}</span>
                            <span class="${rarityColors[data.rarity] || 'text-gray-400'} text-xs flex-shrink-0">(${data.rarity?.charAt(0)})</span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <span class="${canAfford ? 'text-amber-400' : 'text-red-400'} text-xs font-bold">${costo}💰</span>
                            <button class="btn-rimuovi-abilita ${canAfford
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                                text-xs font-bold py-1 px-2 rounded transition"
                                data-player-id="${player.id}"
                                data-ability-name="${name}"
                                data-is-negative="false"
                                ${canAfford ? '' : 'disabled'}>
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });

            // Abilità Negative
            negative.forEach(({ name, data }) => {
                const costo = CSS.getCostoRimozioneNegativa(negativeRemovedCount);
                const canAfford = saldo >= costo;

                html += `
                    <div class="flex items-center justify-between gap-2 bg-red-900/20 p-2 rounded-lg border border-red-500/30">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="text-red-400 text-xs flex-shrink-0">➖</span>
                            <span class="text-white text-xs sm:text-sm truncate">${data.icon || ''} ${name}</span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <span class="${canAfford ? 'text-amber-400' : 'text-red-400'} text-xs font-bold">${costo}💰</span>
                            <button class="btn-rimuovi-abilita ${canAfford
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                                text-xs font-bold py-1 px-2 rounded transition"
                                data-player-id="${player.id}"
                                data-ability-name="${name}"
                                data-is-negative="true"
                                ${canAfford ? '' : 'disabled'}>
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Collega eventi rimozione
        container.querySelectorAll('.btn-rimuovi-abilita').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const playerId = e.target.dataset.playerId;
                const abilityName = e.target.dataset.abilityName;
                const isNegative = e.target.dataset.isNegative === 'true';
                await this.handleRimuoviAbilita(playerId, abilityName, isNegative);
            });
        });
    },

    /**
     * Gestisce la rimozione di un'abilita
     */
    async handleRimuoviAbilita(playerId, abilityName, isNegative) {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) {
            this.showMessage('Errore: sistema non disponibile', 'error');
            return;
        }

        // Conferma rimozione
        const tipoAbilita = isNegative ? 'negativa' : 'positiva';
        if (!confirm(`Vuoi rimuovere l'abilita ${tipoAbilita} "${abilityName}"?`)) {
            return;
        }

        this.showMessage('Rimozione in corso...', 'info');

        const result = await CSS.rimuoviAbilita(teamId, playerId, abilityName, isNegative);

        if (result.success) {
            this.showMessage(
                `Abilita "${abilityName}" rimossa da ${result.playerName}! Saldo: ${result.nuovoSaldo} CSS`,
                'success'
            );

            // Aggiorna saldo nella UI
            const saldoDisplay = document.getElementById('css-saldo-display');
            if (saldoDisplay) {
                saldoDisplay.textContent = `${result.nuovoSaldo} CSS`;
            }

            // Ricarica la rosa e aggiorna il pannello
            await this.refreshPanel();
        } else {
            this.showMessage(result.error || 'Errore durante la rimozione', 'error');
        }
    },

    /**
     * Gestisce la sostituzione dell'Icona
     */
    async handleSostituisciIcona() {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) {
            this.showMessage('Errore: sistema non disponibile', 'error');
            return;
        }

        const costoIcona = CSS.COSTO_SOSTITUZIONE_ICONA || 5;

        // Verifica saldo
        const saldo = await CSS.getSaldo(teamId);
        if (saldo < costoIcona) {
            this.showMessage(`CSS insufficienti. Servono ${costoIcona} CSS`, 'error');
            return;
        }

        // Chiudi il pannello CSS
        const overlay = document.getElementById('css-potenziamento-overlay');
        if (overlay) overlay.remove();

        // Ricarica i dati della squadra e vai alla selezione icona
        if (window.GestioneSquadre && typeof window.GestioneSquadre.loadTeamDataFromFirestore === 'function') {
            window.GestioneSquadre.loadTeamDataFromFirestore(teamId, 'icona-swap');
        } else {
            // Fallback: usa il metodo del core
            const loadTeamFn = window.InterfacciaCore?.loadTeamDataFromFirestore;
            if (loadTeamFn) {
                loadTeamFn(teamId, 'icona-swap');
            } else {
                this.showMessage('Errore: impossibile caricare la selezione icona', 'error');
            }
        }
    },

    /**
     * Gestisce l'acquisto di CS con CSS
     */
    async handleAcquistaCS() {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) {
            this.showMessage('Errore: sistema non disponibile', 'error');
            return;
        }

        this.showMessage('Acquisto in corso...', 'info');

        const result = await CSS.acquistaCS(teamId);

        if (result.success) {
            this.showMessage(
                `Acquistati ${result.csOttenuti} CS! Saldo: ${result.nuovoSaldoCSS} CSS, Budget: ${result.nuovoBudget} CS`,
                'success'
            );

            // Aggiorna saldo nella UI
            const saldoDisplay = document.getElementById('css-saldo-display');
            if (saldoDisplay) {
                saldoDisplay.textContent = `${result.nuovoSaldoCSS} CSS`;
            }

            // Aggiorna il tab servizi
            await this.renderServiziContent(result.nuovoSaldoCSS);
        } else {
            this.showMessage(result.error || 'Errore durante l\'acquisto', 'error');
        }
    },

    /**
     * Gestisce l'acquisto dello sblocco lega privata
     */
    async handleSbloccoLega() {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) {
            this.showMessage('Errore: sistema non disponibile', 'error');
            return;
        }

        // Mostra messaggio di conferma
        const confirmed = confirm(
            'Una lega di 6 giocatori dura 10 giorni, il 1° del mese potrai partecipare di nuovo ad una lega privata, vuoi acquistare comunque?'
        );

        if (!confirmed) {
            return;
        }

        this.showMessage('Acquisto in corso...', 'info');

        const result = await CSS.acquistaSbloccoLega(teamId);

        if (result.success) {
            this.showMessage('Sblocco lega acquistato! Ora puoi partecipare a una nuova lega privata.', 'success');

            // Aggiorna saldo nella UI
            const saldoDisplay = document.getElementById('css-saldo-display');
            if (saldoDisplay) {
                saldoDisplay.textContent = `${result.nuovoSaldoCSS} CSS`;
            }

            // Aggiorna il tab servizi
            await this.renderServiziContent(result.nuovoSaldoCSS);

            // Notifica toast
            if (window.Toast) {
                window.Toast.success('Cooldown lega rimosso!');
            }
        } else {
            this.showMessage(result.error || 'Errore durante l\'acquisto', 'error');
        }
    },

    /**
     * Gestisce la conversione di CS in CSS (2000 CS = 1 CSS)
     */
    async handleConvertiCSinCSS() {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) {
            this.showMessage('Errore: sistema non disponibile', 'error');
            return;
        }

        const csRequired = CSS.CS_TO_CSS_RATE || 2000;

        // Mostra messaggio di conferma
        const confirmed = confirm(
            `Vuoi convertire ${csRequired} CS in 1 CSS?`
        );

        if (!confirmed) {
            return;
        }

        this.showMessage('Conversione in corso...', 'info');

        const result = await CSS.convertiCSinCSS(teamId);

        if (result.success) {
            this.showMessage(
                `Convertiti ${csRequired} CS in 1 CSS! Saldo: ${result.nuovoSaldoCSS} CSS, Budget: ${result.nuovoBudget} CS`,
                'success'
            );

            // Aggiorna saldo nella UI
            const saldoDisplay = document.getElementById('css-saldo-display');
            if (saldoDisplay) {
                saldoDisplay.textContent = `${result.nuovoSaldoCSS} CSS`;
            }

            // Aggiorna dati locali
            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.creditiSuperSeri = result.nuovoSaldoCSS;
                window.InterfacciaCore.currentTeamData.budget = result.nuovoBudget;
            }

            // Aggiorna il tab servizi
            await this.renderServiziContent(result.nuovoSaldoCSS);

            // Notifica toast
            if (window.Toast) {
                window.Toast.success('Conversione completata!');
            }
        } else {
            this.showMessage(result.error || 'Errore durante la conversione', 'error');
        }
    },

    /**
     * Genera le opzioni per il select abilita
     * Ordinate per rarità (Comune → Rara → Epica → Leggendaria)
     * Nasconde automaticamente le abilità non acquistabili (già filtrate da getAbilitaDisponibili)
     * @param {string} role - Ruolo del giocatore
     * @param {Array} currentAbilities - Abilità attuali
     * @param {number} saldo - Saldo CSS
     * @param {string|null} iconaId - ID dell'icona (se è un'Icona)
     */
    getAbilitaOptions(role, currentAbilities, saldo, iconaId = null) {
        const CSS = window.CreditiSuperSeri;
        if (!CSS) return '';

        // Passa iconaId a getAbilitaDisponibili per filtrare correttamente per Icone
        const disponibili = CSS.getAbilitaDisponibili(role, currentAbilities, false, iconaId);

        // Ordine rarità per sorting
        const rarityOrder = { 'Comune': 1, 'Rara': 2, 'Epica': 3, 'Leggendaria': 4 };

        // Ordina per rarità
        const sorted = [...disponibili].sort((a, b) => {
            return (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99);
        });

        // Icone per rarità
        const rarityIcons = {
            'Comune': '⚪',
            'Rara': '🔵',
            'Epica': '🟣',
            'Leggendaria': '🟡'
        };

        return sorted.map(a => {
            const canAfford = saldo >= a.costo;
            const negAuto = a.negativeAutomatiche || 0;
            const negText = negAuto > 0 ? ` [+${negAuto} neg]` : '';
            const rarityIcon = rarityIcons[a.rarity] || '';
            return `<option value="${a.name}"
                            data-rarity="${a.rarity}"
                            data-negative-auto="${negAuto}"
                            ${canAfford ? '' : 'disabled'}>
                ${rarityIcon} ${a.name} (${a.rarity}) - ${a.costo} CSS${negText}${canAfford ? '' : ' ❌'}
            </option>`;
        }).join('');
    },

    /**
     * Gestisce il potenziamento di un giocatore
     */
    async handlePotenziamento(playerId) {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) {
            this.showMessage('Errore: sistema non disponibile', 'error');
            return;
        }

        this.showMessage('Potenziamento in corso...', 'info');

        const result = await CSS.potenziaGiocatore(teamId, playerId);

        if (result.success) {
            this.showMessage(
                `${result.playerName} potenziato a Livello ${result.nuovoLivello}! Saldo: ${result.nuovoSaldo} CSS`,
                'success'
            );

            // Aggiorna saldo nella UI
            const saldoDisplay = document.getElementById('css-saldo-display');
            if (saldoDisplay) {
                saldoDisplay.textContent = `${result.nuovoSaldo} CSS`;
            }

            // Ricarica la rosa e aggiorna il pannello
            await this.refreshPanel();
        } else {
            this.showMessage(result.error || 'Errore durante il potenziamento', 'error');
        }
    },

    /**
     * Gestisce l'assegnazione di un'abilita
     * Le abilità negative vengono assegnate AUTOMATICAMENTE per Epiche (+1) e Leggendarie (+2)
     */
    async handleAssegnaAbilita(playerId, abilityName) {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) {
            this.showMessage('Errore: sistema non disponibile', 'error');
            return;
        }

        this.showMessage('Assegnazione in corso...', 'info');

        // Le abilità negative vengono assegnate automaticamente dalla funzione assegnaAbilita
        const result = await CSS.assegnaAbilita(teamId, playerId, abilityName);

        if (result.success) {
            // Mostra le negative assegnate automaticamente se presenti
            const negText = result.negativeAssegnate?.length > 0
                ? ` (+ ${result.negativeAssegnate.join(', ')} automatiche)`
                : '';
            this.showMessage(
                `Abilita "${result.abilityName}"${negText} assegnata a ${result.playerName}! Saldo: ${result.nuovoSaldo} CSS`,
                'success'
            );

            // Aggiorna saldo nella UI
            const saldoDisplay = document.getElementById('css-saldo-display');
            if (saldoDisplay) {
                saldoDisplay.textContent = `${result.nuovoSaldo} CSS`;
            }

            // Ricarica la rosa e aggiorna il pannello
            await this.refreshPanel();
        } else {
            this.showMessage(result.error || 'Errore durante l\'assegnazione', 'error');
        }
    },

    /**
     * Apre il modal per selezionare le abilità negative
     */
    openNegativeAbilityModal(playerId, positiveAbilityName, negativeCount) {
        const CSS = window.CreditiSuperSeri;
        const teamData = window.InterfacciaCore?.currentTeamData;
        if (!CSS || !teamData) return;

        // Trova il giocatore
        const player = teamData.rosa?.find(p => p.id === playerId);
        if (!player) return;

        const currentAbilities = player.abilities || [];
        const negativeAbilities = CSS.getAbilitaNegativeDisponibili(player.role, currentAbilities);

        if (negativeAbilities.length < negativeCount) {
            this.showMessage(`Non ci sono abbastanza abilita negative disponibili per il ruolo ${player.role}`, 'error');
            return;
        }

        // Crea modal
        const modal = document.createElement('div');
        modal.id = 'negative-ability-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 border-red-500 shadow-2xl">
                <h3 class="text-xl font-bold text-red-400 mb-2">Seleziona Abilita Negative</h3>
                <p class="text-gray-400 text-sm mb-4">
                    Per acquistare <span class="text-purple-400 font-bold">${positiveAbilityName}</span>
                    devi assegnare <span class="text-red-400 font-bold">${negativeCount}</span> abilita negativa/e
                    a <span class="text-white font-bold">${player.name}</span>.
                </p>

                <div class="space-y-2 max-h-60 overflow-y-auto mb-4">
                    ${negativeAbilities.map(neg => `
                        <label class="flex items-center gap-3 p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition">
                            <input type="checkbox" name="negative-ability" value="${neg.name}"
                                   class="w-5 h-5 text-red-600 bg-gray-600 border-gray-500 rounded focus:ring-red-500">
                            <div>
                                <span class="text-white font-semibold">${neg.icon || ''} ${neg.name}</span>
                                <p class="text-gray-400 text-xs">${neg.description || ''}</p>
                            </div>
                        </label>
                    `).join('')}
                </div>

                <div class="flex gap-3">
                    <button id="btn-cancel-negative" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">
                        Annulla
                    </button>
                    <button id="btn-confirm-negative" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition" disabled>
                        Conferma (0/${negativeCount})
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handler per checkbox
        const checkboxes = modal.querySelectorAll('input[name="negative-ability"]');
        const confirmBtn = modal.querySelector('#btn-confirm-negative');

        const updateConfirmButton = () => {
            const selected = modal.querySelectorAll('input[name="negative-ability"]:checked').length;
            confirmBtn.textContent = `Conferma (${selected}/${negativeCount})`;
            confirmBtn.disabled = selected !== negativeCount;
        };

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                // Limita selezione al numero richiesto
                const selected = modal.querySelectorAll('input[name="negative-ability"]:checked');
                if (selected.length > negativeCount) {
                    cb.checked = false;
                }
                updateConfirmButton();
            });
        });

        // Handler annulla
        modal.querySelector('#btn-cancel-negative').addEventListener('click', () => {
            modal.remove();
        });

        // Handler conferma
        confirmBtn.addEventListener('click', async () => {
            const selectedNegatives = Array.from(
                modal.querySelectorAll('input[name="negative-ability"]:checked')
            ).map(cb => cb.value);

            if (selectedNegatives.length === negativeCount) {
                modal.remove();
                await this.handleAssegnaAbilita(playerId, positiveAbilityName, selectedNegatives);
            }
        });
    },

    /**
     * Ricarica i dati e aggiorna il pannello
     */
    async refreshPanel() {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) return;

        // Ricarica dati squadra
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        const teamDoc = await getDoc(doc(db, TEAMS_PATH, teamId));
        if (!teamDoc.exists()) return;

        const teamData = teamDoc.data();
        const rosa = teamData.players || [];
        const saldo = teamData.creditiSuperSeri || 0;

        // Aggiorna anche il currentTeamData globale
        window.InterfacciaCore.currentTeamData = teamData;

        // Determina quale tab e' attiva e renderizza
        const tabPotenziamento = document.getElementById('tab-potenziamento');
        const tabAbilita = document.getElementById('tab-abilita');
        const tabServizi = document.getElementById('tab-servizi');
        const tabRimuovi = document.getElementById('tab-rimuovi');
        const tabUpgradeMax = document.getElementById('tab-upgrade-max');

        if (tabPotenziamento?.classList.contains('active')) {
            this.renderPotenziamentoContent(rosa, saldo);
        } else if (tabServizi?.classList.contains('active')) {
            await this.renderServiziContent(saldo);
        } else if (tabRimuovi?.classList.contains('active')) {
            this.renderRimuoviAbilitaContent(rosa, saldo);
        } else if (tabUpgradeMax?.classList.contains('active')) {
            this.renderUpgradeMassimaleContent(rosa, saldo);
        } else {
            this.renderAbilitaContent(rosa, saldo);
        }
    },

    /**
     * Mostra un messaggio all'utente
     */
    showMessage(text, type = 'info') {
        const msgEl = document.getElementById('css-action-message');
        if (!msgEl) return;

        msgEl.textContent = text;
        msgEl.classList.remove('text-green-400', 'text-red-400', 'text-yellow-400');

        if (type === 'success') {
            msgEl.classList.add('text-green-400');
        } else if (type === 'error') {
            msgEl.classList.add('text-red-400');
        } else {
            msgEl.classList.add('text-yellow-400');
        }

        // Auto-hide dopo 5 secondi per success/info
        if (type !== 'error') {
            setTimeout(() => {
                if (msgEl.textContent === text) {
                    msgEl.textContent = '';
                }
            }, 5000);
        }
    },

    /**
     * Inizializza il widget CSS nella dashboard
     */
    async initDashboardWidget() {
        const CSS = window.CreditiSuperSeri;
        if (!CSS) return;

        const enabled = await CSS.isEnabled();
        const teamId = window.InterfacciaCore?.currentTeamId;

        // Widget CSS rimosso dalla dashboard - ora nel box risorse in cima
        // Manteniamo solo la logica per il negozio nel box risorse
        const widgetContainer = document.getElementById('css-dashboard-widget');
        if (widgetContainer) {
            widgetContainer.innerHTML = '';
            widgetContainer.classList.add('hidden');
        }

        if (!enabled || !teamId) {
            return;
        }

        // Widget non piu' renderizzato - ora gestito dal box risorse
        // const saldo = await CSS.getSaldo(teamId);
        // this.renderSaldoWidget(widgetContainer, saldo, enabled);
    }
};

console.log('Modulo Crediti Super Seri UI caricato.');
