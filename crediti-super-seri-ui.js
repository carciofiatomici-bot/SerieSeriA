//
// ====================================================================
// CREDITI-SUPER-SERI-UI.JS - Interfaccia Utente per CSS
// ====================================================================
// Gestisce la visualizzazione e interazione con i Crediti Super Seri
//

window.CreditiSuperSeriUI = {

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
                        <span>Potenzia</span>
                        <span class="text-lg">⚡</span>
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
            <div class="container mx-auto px-4 py-8 max-w-4xl">
                <!-- Header -->
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-amber-400">Potenziamento Giocatori</h2>
                        <p class="text-gray-400 mt-1">Spendi i tuoi Crediti Super Seri per potenziare la squadra</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="bg-amber-900 border border-amber-500 rounded-lg px-4 py-2">
                            <span class="text-amber-300 text-sm">Saldo:</span>
                            <span id="css-saldo-display" class="text-white font-bold text-xl ml-2">${saldo} CSS</span>
                        </div>
                        <button id="btn-close-css-panel"
                                class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                            Chiudi X
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="flex gap-2 mb-6">
                    <button id="tab-potenziamento" class="tab-btn active bg-amber-600 text-white font-bold py-2 px-6 rounded-lg">
                        Potenzia Livello
                    </button>
                    <button id="tab-abilita" class="tab-btn bg-gray-700 text-gray-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-600">
                        Assegna Abilita
                    </button>
                </div>

                <!-- Content -->
                <div id="css-panel-content" class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <p class="text-gray-400 text-center">Caricamento...</p>
                </div>

                <!-- Messaggio -->
                <p id="css-action-message" class="text-center mt-4 font-semibold"></p>
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

        let html = `
            <div class="space-y-4">
                <div class="grid grid-cols-12 gap-2 text-gray-400 text-sm font-semibold border-b border-gray-700 pb-2 mb-2">
                    <div class="col-span-1">Ruolo</div>
                    <div class="col-span-4">Nome</div>
                    <div class="col-span-2 text-center">Livello</div>
                    <div class="col-span-2 text-center">Max</div>
                    <div class="col-span-2 text-center">Costo</div>
                    <div class="col-span-1 text-center">Azione</div>
                </div>
        `;

        rosaSorted.forEach(player => {
            const isIcona = player.abilities && player.abilities.includes('Icona');
            const livelloAttuale = player.currentLevel || player.level || 1;
            const maxLevel = isIcona ? CSS.MAX_LEVEL_ICONA : CSS.MAX_LEVEL_GIOCATORE;
            const costo = CSS.getCostoPotenziamento(livelloAttuale, isIcona);
            const canUpgrade = costo !== null && saldo >= costo;
            const isMaxLevel = livelloAttuale >= maxLevel;

            const roleColors = {
                'P': 'text-yellow-400',
                'D': 'text-blue-400',
                'C': 'text-green-400',
                'A': 'text-red-400'
            };

            html += `
                <div class="grid grid-cols-12 gap-2 items-center py-3 border-b border-gray-700 hover:bg-gray-700 rounded transition">
                    <div class="col-span-1">
                        <span class="font-bold ${roleColors[player.role] || 'text-white'}">${player.role}</span>
                        ${isIcona ? '<span class="ml-1" title="Icona">👑</span>' : ''}
                    </div>
                    <div class="col-span-4 text-white font-semibold">${player.name}</div>
                    <div class="col-span-2 text-center">
                        <span class="text-amber-400 font-bold text-lg">Lv ${livelloAttuale}</span>
                    </div>
                    <div class="col-span-2 text-center">
                        <span class="text-gray-400">/ ${maxLevel}</span>
                    </div>
                    <div class="col-span-2 text-center">
                        ${isMaxLevel
                            ? '<span class="text-green-400 font-bold">MAX</span>'
                            : `<span class="${canUpgrade ? 'text-amber-400' : 'text-red-400'} font-bold">${costo} CSS</span>`
                        }
                    </div>
                    <div class="col-span-1 text-center">
                        ${isMaxLevel
                            ? '<span class="text-gray-500">-</span>'
                            : `<button class="btn-potenzia ${canUpgrade
                                ? 'bg-amber-500 hover:bg-amber-400 text-gray-900'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              } font-bold py-1 px-3 rounded text-sm transition"
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
            const isIcona = player.abilities && player.abilities.includes('Icona');
            const currentAbilities = player.abilities || [];
            const abilitiesCount = currentAbilities.filter(a => a !== 'Icona').length;
            const canAddAbility = abilitiesCount < 3;

            const roleColors = {
                'P': 'border-yellow-500',
                'D': 'border-blue-500',
                'C': 'border-green-500',
                'A': 'border-red-500'
            };

            html += `
                <div class="bg-gray-700 rounded-lg p-4 border-l-4 ${roleColors[player.role]}">
                    <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-white text-lg">${player.name}</span>
                            ${isIcona ? '<span title="Icona">👑</span>' : ''}
                            <span class="text-gray-400 text-sm">(${player.role})</span>
                        </div>
                        <span class="text-sm ${canAddAbility ? 'text-gray-400' : 'text-red-400'}">
                            Abilita: ${abilitiesCount}/3
                        </span>
                    </div>

                    <!-- Abilita attuali -->
                    <div class="flex flex-wrap gap-2 mb-3">
                        ${currentAbilities.length > 0
                            ? currentAbilities.map(a => `
                                <span class="bg-gray-800 text-amber-400 px-3 py-1 rounded-full text-sm font-semibold border border-amber-600">
                                    ${a}
                                </span>
                            `).join('')
                            : '<span class="text-gray-500 text-sm italic">Nessuna abilita</span>'
                        }
                    </div>

                    ${canAddAbility ? `
                        <!-- Selezione nuova abilita -->
                        <div class="mt-3 pt-3 border-t border-gray-600">
                            <div class="flex gap-2 items-center">
                                <select id="select-ability-${player.id}"
                                        class="flex-1 bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
                                    <option value="">-- Seleziona abilita --</option>
                                    ${this.getAbilitaOptions(player.role, currentAbilities, saldo)}
                                </select>
                                <button class="btn-assegna-abilita bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition"
                                        data-player-id="${player.id}">
                                    Assegna
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

    /**
     * Genera le opzioni per il select abilita
     */
    getAbilitaOptions(role, currentAbilities, saldo) {
        const CSS = window.CreditiSuperSeri;
        if (!CSS) return '';

        const disponibili = CSS.getAbilitaDisponibili(role, currentAbilities);

        return disponibili.map(a => {
            const canAfford = saldo >= a.costo;
            return `<option value="${a.name}" ${canAfford ? '' : 'disabled'}>
                ${a.icon || ''} ${a.name} - ${a.costo} CSS ${canAfford ? '' : '(insufficiente)'}
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
     */
    async handleAssegnaAbilita(playerId, abilityName) {
        const CSS = window.CreditiSuperSeri;
        const teamId = window.InterfacciaCore?.currentTeamId;

        if (!CSS || !teamId) {
            this.showMessage('Errore: sistema non disponibile', 'error');
            return;
        }

        this.showMessage('Assegnazione in corso...', 'info');

        const result = await CSS.assegnaAbilita(teamId, playerId, abilityName);

        if (result.success) {
            this.showMessage(
                `Abilita "${result.abilityName}" assegnata a ${result.playerName}! Saldo: ${result.nuovoSaldo} CSS`,
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
        const rosa = teamData.rosa || [];
        const saldo = teamData.creditiSuperSeri || 0;

        // Aggiorna anche il currentTeamData globale
        window.InterfacciaCore.currentTeamData = teamData;

        // Determina quale tab e' attiva e renderizza
        const tabPotenziamento = document.getElementById('tab-potenziamento');
        if (tabPotenziamento?.classList.contains('active')) {
            this.renderPotenziamentoContent(rosa, saldo);
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

        // Trova il container del widget (sempre presente nell'HTML)
        const widgetContainer = document.getElementById('css-dashboard-widget');
        if (!widgetContainer) return;

        if (!enabled || !teamId) {
            // Nascondi widget se CSS non abilitato
            widgetContainer.innerHTML = '';
            widgetContainer.classList.add('hidden');
            return;
        }

        // Mostra il container
        widgetContainer.classList.remove('hidden');

        const saldo = await CSS.getSaldo(teamId);
        this.renderSaldoWidget(widgetContainer, saldo, enabled);

        // Collega evento apertura pannello
        const btnOpen = document.getElementById('btn-open-css-shop');
        if (btnOpen) {
            btnOpen.addEventListener('click', async () => {
                const teamData = window.InterfacciaCore?.currentTeamData;
                const rosa = teamData?.rosa || [];
                const currentSaldo = await CSS.getSaldo(teamId);
                this.openPotenziamentoPanel(rosa, currentSaldo);
            });
        }
    }
};

console.log('Modulo Crediti Super Seri UI caricato.');
