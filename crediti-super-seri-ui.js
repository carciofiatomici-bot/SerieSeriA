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
                <div class="flex flex-wrap gap-2 mb-6">
                    <button id="tab-potenziamento" class="tab-btn active bg-amber-600 text-white font-bold py-2 px-4 rounded-lg">
                        Potenzia Livello
                    </button>
                    <button id="tab-abilita" class="tab-btn bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-600">
                        Assegna Abilita
                    </button>
                    <button id="tab-rimuovi" class="tab-btn bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-600">
                        Rimuovi Abilita
                    </button>
                    <button id="tab-upgrade-max" class="tab-btn bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-600">
                        Upgrade Massimale
                    </button>
                    <button id="tab-servizi" class="tab-btn bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-600">
                        Servizi
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
                        <span class="text-sm">
                            ${abilityStatusText}
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
                                    ${this.getAbilitaOptions(player.role, currentAbilities, saldo, isIcona ? iconaId : null)}
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

        let html = `
            <div class="mb-4 p-3 bg-gray-700 rounded-lg border border-purple-500">
                <p class="text-gray-300 text-sm">
                    <span class="text-purple-400 font-bold">Upgrade Massimale:</span>
                    Aumenta il livello massimo raggiungibile di un giocatore.
                    <br><span class="text-amber-400">Costo: 2 × Livello attuale CSS</span>
                    <br><span class="text-yellow-400">Limite massimo: Lv.${MAX_LEVEL} (GOAT)</span>
                </p>
            </div>
            <div class="space-y-4">
                <div class="grid grid-cols-12 gap-2 text-gray-400 text-sm font-semibold border-b border-gray-700 pb-2 mb-2">
                    <div class="col-span-1">Ruolo</div>
                    <div class="col-span-4">Nome</div>
                    <div class="col-span-2 text-center">Livello</div>
                    <div class="col-span-2 text-center">Max Attuale</div>
                    <div class="col-span-2 text-center">Costo</div>
                    <div class="col-span-1 text-center">Azione</div>
                </div>
        `;

        rosaSorted.forEach(player => {
            const currentLevel = player.currentLevel || player.level || 1;
            const secretMax = player.secretMaxLevel;
            const costo = currentLevel * 2; // Costo = 2 × livello giocatore
            const isAtGoatLevel = secretMax >= MAX_LEVEL; // Gia al massimo assoluto
            const canAfford = saldo >= costo && !isAtGoatLevel;

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
                    </div>
                    <div class="col-span-4 text-white font-semibold">
                        ${player.name}
                        ${isAtGoatLevel ? '<span class="ml-1 text-yellow-400 text-xs">🐐 GOAT</span>' : ''}
                    </div>
                    <div class="col-span-2 text-center">
                        <span class="text-amber-400 font-bold text-lg">Lv ${currentLevel}</span>
                    </div>
                    <div class="col-span-2 text-center">
                        ${isAtGoatLevel
                            ? `<span class="text-yellow-400 font-bold">${secretMax} MAX</span>`
                            : `<span class="text-purple-400 font-bold">${secretMax}</span>
                               <span class="text-gray-500">→</span>
                               <span class="text-green-400 font-bold">${secretMax + 1}</span>`
                        }
                    </div>
                    <div class="col-span-2 text-center">
                        ${isAtGoatLevel
                            ? '<span class="text-yellow-400 font-bold">GOAT</span>'
                            : `<span class="${canAfford ? 'text-amber-400' : 'text-red-400'} font-bold">${costo} CSS</span>`
                        }
                    </div>
                    <div class="col-span-1 text-center">
                        ${isAtGoatLevel
                            ? '<span class="text-gray-500">-</span>'
                            : `<button class="btn-upgrade-max ${canAfford
                                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              } font-bold py-1 px-3 rounded text-sm transition"
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
            <div class="space-y-4">
                <h3 class="text-xl font-bold text-amber-400 mb-4">Servizi Disponibili</h3>

                <!-- Servizio: Sostituisci Icona -->
                <div class="bg-gray-700 rounded-lg p-4 border border-orange-500">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">👑</span>
                            <div>
                                <p class="text-white font-bold text-lg">Sostituisci Icona</p>
                                <p class="text-gray-400 text-sm">Cambia l'Icona della tua squadra con una nuova</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="${canAffordIcona ? 'text-amber-400' : 'text-red-400'} font-bold text-lg">${costoSostituzioneIcona} CSS</span>
                            <button id="btn-sostituisci-icona"
                                    class="${canAffordIcona
                                        ? 'bg-orange-600 hover:bg-orange-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    } font-bold py-2 px-4 rounded-lg transition"
                                    ${canAffordIcona ? '' : 'disabled'}>
                                Acquista
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Servizio: Acquista CS -->
                <div class="bg-gray-700 rounded-lg p-4 border border-green-500">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">💰</span>
                            <div>
                                <p class="text-white font-bold text-lg">Acquista ${csOttenuti} CS</p>
                                <p class="text-gray-400 text-sm">Converti CSS in Crediti Seri per il mercato</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="${canAffordCS ? 'text-amber-400' : 'text-red-400'} font-bold text-lg">${costoAcquistoCS} CSS</span>
                            <button id="btn-acquista-cs"
                                    class="${canAffordCS
                                        ? 'bg-green-600 hover:bg-green-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    } font-bold py-2 px-4 rounded-lg transition"
                                    ${canAffordCS ? '' : 'disabled'}>
                                Acquista
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Servizio: Sblocco Lega Privata -->
                <div class="bg-gray-700 rounded-lg p-4 border ${isInCooldown ? 'border-purple-500' : 'border-gray-600'}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">🏠</span>
                            <div>
                                <p class="text-white font-bold text-lg">Sblocco Lega Privata</p>
                                <p class="text-gray-400 text-sm">
                                    ${isInCooldown
                                        ? `Sblocca ora (in cooldown fino al ${cooldownDateStr})`
                                        : 'Puoi gia partecipare alle leghe private'
                                    }
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="${sbloccoLegaDisponibile ? 'text-amber-400' : 'text-gray-500'} font-bold text-lg">${costoSbloccoLega} CSS</span>
                            <button id="btn-sblocco-lega"
                                    class="${sbloccoLegaDisponibile
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    } font-bold py-2 px-4 rounded-lg transition"
                                    ${sbloccoLegaDisponibile ? '' : 'disabled'}>
                                ${isInCooldown ? 'Sblocca' : 'Non necessario'}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Servizio: Converti CS in CSS -->
                <div class="bg-gray-700 rounded-lg p-4 border border-amber-500">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">💎</span>
                            <div>
                                <p class="text-white font-bold text-lg">Converti CS in CSS</p>
                                <p class="text-gray-400 text-sm">Converti ${csPerCSS} CS in 1 CSS (Hai ${budgetCS} CS)</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="${canAffordCStoCSS ? 'text-amber-400' : 'text-red-400'} font-bold text-lg">${csPerCSS} CS</span>
                            <button id="btn-converti-cs-css"
                                    class="${canAffordCStoCSS
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    } font-bold py-2 px-4 rounded-lg transition"
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

        let html = `
            <div class="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                <p class="text-gray-300 text-sm">
                    <span class="text-green-400 font-bold">Positive:</span> Costo = 5 + (2 × rarita) CSS
                    <span class="mx-2">|</span>
                    <span class="text-red-400 font-bold">Negative:</span> Costo progressivo = 5 × (n° rimossi + 1) CSS
                </p>
            </div>
            <div class="space-y-4">
        `;

        rosaSorted.forEach(player => {
            const abilities = player.abilities || [];
            const negativeRemovedCount = player.negativeRemovedCount || 0;

            // Separa positive e negative, escludi Icona e Uniche
            const positive = [];
            const negative = [];

            abilities.forEach(abilityName => {
                if (abilityName === 'Icona') return;
                const data = Encyclopedia.getAbility(abilityName);
                if (!data || data.rarity === 'Unica') return; // Escludi Uniche

                if (data.isNegative) {
                    negative.push({ name: abilityName, data });
                } else {
                    positive.push({ name: abilityName, data });
                }
            });

            if (positive.length === 0 && negative.length === 0) return;

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
                            <span class="text-gray-400 text-sm">(${player.role})</span>
                        </div>
                        ${negativeRemovedCount > 0 ? `
                            <span class="text-xs text-red-400 bg-red-900 px-2 py-1 rounded">
                                Negative rimosse: ${negativeRemovedCount}
                            </span>
                        ` : ''}
                    </div>

                    <div class="space-y-2">
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
                    <div class="flex items-center justify-between bg-gray-800 p-2 rounded">
                        <div class="flex items-center gap-2">
                            <span class="text-green-400">➕</span>
                            <span class="text-white">${data.icon || ''} ${name}</span>
                            <span class="${rarityColors[data.rarity] || 'text-gray-400'} text-xs">(${data.rarity})</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="${canAfford ? 'text-amber-400' : 'text-red-400'} text-sm font-bold">${costo} CSS</span>
                            <button class="btn-rimuovi-abilita ${canAfford
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                                text-xs font-bold py-1 px-2 rounded transition"
                                data-player-id="${player.id}"
                                data-ability-name="${name}"
                                data-is-negative="false"
                                ${canAfford ? '' : 'disabled'}>
                                Rimuovi
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
                    <div class="flex items-center justify-between bg-gray-800 p-2 rounded border border-red-900">
                        <div class="flex items-center gap-2">
                            <span class="text-red-400">➖</span>
                            <span class="text-white">${data.icon || ''} ${name}</span>
                            <span class="text-red-400 text-xs">(Negativa)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="${canAfford ? 'text-amber-400' : 'text-red-400'} text-sm font-bold">${costo} CSS</span>
                            <button class="btn-rimuovi-abilita ${canAfford
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                                text-xs font-bold py-1 px-2 rounded transition"
                                data-player-id="${player.id}"
                                data-ability-name="${name}"
                                data-is-negative="true"
                                ${canAfford ? '' : 'disabled'}>
                                Rimuovi
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
