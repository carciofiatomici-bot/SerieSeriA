/**
 * Admin Boss Battle Panel
 * Pannello admin per gestire e testare il sistema Boss Battle
 */

(function() {
    'use strict';

    window.AdminBoss = {
        container: null,
        currentBoss: null,

        // ============ RENDER PANNELLO PRINCIPALE ============

        async renderBossAdminPanel(container) {
            this.container = container;
            container.innerHTML = `
                <div class="p-4 space-y-6">
                    <h2 class="text-xl font-bold text-yellow-400 flex items-center gap-2">
                        <span class="text-2xl">👹</span> Boss Battle Admin
                    </h2>

                    <!-- Config Section -->
                    <div id="boss-config-section" class="bg-gray-800/50 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-white mb-3">Configurazione</h3>
                        <div class="text-gray-400">Caricamento...</div>
                    </div>

                    <!-- Boss List Section -->
                    <div id="boss-list-section" class="bg-gray-800/50 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-white mb-3">Boss Attivi</h3>
                        <div class="text-gray-400">Caricamento...</div>
                    </div>

                    <!-- Create Boss Section -->
                    <div id="boss-create-section" class="bg-gray-800/50 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-white mb-3">Crea Nuovo Boss</h3>
                        <div id="boss-create-form"></div>
                    </div>

                    <!-- Test Section -->
                    <div id="boss-test-section" class="bg-gray-800/50 rounded-lg p-4 hidden">
                        <h3 class="text-lg font-semibold text-white mb-3">🎮 Test Sfida Boss</h3>
                        <div id="boss-test-content"></div>
                    </div>
                </div>
            `;

            // Carica dati
            await this.renderConfigSection();
            await this.renderBossListSection();
            this.renderCreateBossForm();
        },

        // ============ SEZIONE CONFIGURAZIONE ============

        async renderConfigSection() {
            const section = document.getElementById('boss-config-section');
            if (!section) return;

            const config = await window.BossBattle?.loadConfig() || {};

            section.innerHTML = `
                <h3 class="text-lg font-semibold text-white mb-3">Configurazione</h3>
                <div class="space-y-3">
                    <!-- Feature Flag -->
                    <label class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                        <div>
                            <span class="text-white font-medium">Boss Battle Attivo</span>
                            <p class="text-sm text-gray-400">Abilita il sistema Boss Battle</p>
                        </div>
                        <input type="checkbox" id="config-enabled" ${config.enabled ? 'checked' : ''}
                            class="w-5 h-5 accent-yellow-500 cursor-pointer"
                            onchange="AdminBoss.toggleConfig('enabled', this.checked)">
                    </label>

                    <!-- Rewards Toggle -->
                    <label class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                        <div>
                            <span class="text-white font-medium">Premi Abilitati</span>
                            <p class="text-sm text-gray-400">Distribuisci CS/CSS ai partecipanti</p>
                        </div>
                        <input type="checkbox" id="config-rewards" ${config.rewardsEnabled ? 'checked' : ''}
                            class="w-5 h-5 accent-yellow-500 cursor-pointer"
                            onchange="AdminBoss.toggleConfig('rewardsEnabled', this.checked)">
                    </label>

                    <!-- Cooldown Toggle -->
                    <label class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                        <div>
                            <span class="text-white font-medium">Cooldown Attivo</span>
                            <p class="text-sm text-gray-400">Limita tentativi (1 al giorno)</p>
                        </div>
                        <input type="checkbox" id="config-cooldown" ${config.cooldownEnabled ? 'checked' : ''}
                            class="w-5 h-5 accent-yellow-500 cursor-pointer"
                            onchange="AdminBoss.toggleConfig('cooldownEnabled', this.checked)">
                    </label>
                </div>
            `;
        },

        async toggleConfig(key, value) {
            const newConfig = { [key]: value };
            const success = await window.BossBattle?.saveConfig(newConfig);

            if (success) {
                this.showToast(`${key} ${value ? 'abilitato' : 'disabilitato'}`, 'success');
            } else {
                this.showToast('Errore salvataggio config', 'error');
            }
        },

        // ============ SEZIONE LISTA BOSS ============

        async renderBossListSection() {
            const section = document.getElementById('boss-list-section');
            if (!section) return;

            const bosses = await window.BossBattle?.loadAllBosses() || [];

            if (bosses.length === 0) {
                section.innerHTML = `
                    <h3 class="text-lg font-semibold text-white mb-3">Boss</h3>
                    <p class="text-gray-400 text-center py-4">Nessun boss creato. Creane uno!</p>
                `;
                document.getElementById('boss-test-section')?.classList.add('hidden');
                return;
            }

            const bossCards = bosses.map(boss => this.renderBossCard(boss)).join('');

            section.innerHTML = `
                <h3 class="text-lg font-semibold text-white mb-3">Boss (${bosses.length})</h3>
                <div class="space-y-3">
                    ${bossCards}
                </div>
            `;

            // Mostra sezione test se c'è un boss attivo
            const activeBoss = bosses.find(b => b.status === 'active');
            if (activeBoss) {
                this.currentBoss = activeBoss;
                await this.renderTestSection(activeBoss);
            }
        },

        renderBossCard(boss) {
            const hpPercent = boss.maxHp > 0 ? (boss.currentHp / boss.maxHp) * 100 : 0;
            const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';
            const statusColor = boss.status === 'active' ? 'text-green-400' :
                               boss.status === 'defeated' ? 'text-red-400' : 'text-gray-400';
            const statusText = boss.status === 'active' ? 'Attivo' :
                              boss.status === 'defeated' ? 'Sconfitto' : 'Terminato';

            return `
                <div class="boss-card bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="text-white font-bold text-lg">${boss.name || 'Boss'}</h4>
                            <span class="text-sm ${statusColor}">${statusText}</span>
                            <span class="text-sm text-gray-500 ml-2">• ${boss.difficulty || 'normal'}</span>
                        </div>
                        <div class="flex gap-2">
                            ${boss.status === 'active' ? `
                                <button onclick="AdminBoss.selectBossForTest('${boss.id}')"
                                    class="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded">
                                    🎮 Test
                                </button>
                            ` : ''}
                            ${boss.status === 'defeated' ? `
                                <button onclick="AdminBoss.resetBoss('${boss.id}')"
                                    class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">
                                    🔄 Reset
                                </button>
                            ` : ''}
                            <button onclick="AdminBoss.deleteBoss('${boss.id}')"
                                class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded">
                                🗑️
                            </button>
                        </div>
                    </div>

                    <!-- HP Bar -->
                    <div class="mb-3">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-400">HP</span>
                            <span class="text-white font-mono">${boss.currentHp} / ${boss.maxHp}</span>
                        </div>
                        <div class="boss-hp-bar h-4 bg-gray-700 rounded-full overflow-hidden">
                            <div class="boss-hp-fill h-full ${hpColor} transition-all duration-500"
                                style="width: ${hpPercent}%"></div>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div class="grid grid-cols-3 gap-2 text-center text-sm">
                        <div class="bg-gray-800 rounded p-2">
                            <div class="text-gray-400">Danni Totali</div>
                            <div class="text-white font-bold">${boss.totalDamage || 0}</div>
                        </div>
                        <div class="bg-gray-800 rounded p-2">
                            <div class="text-gray-400">Partecipanti</div>
                            <div class="text-white font-bold">${boss.totalParticipants || 0}</div>
                        </div>
                        <div class="bg-gray-800 rounded p-2">
                            <div class="text-gray-400">Tentativi</div>
                            <div class="text-white font-bold">${boss.totalAttempts || 0}</div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ============ SEZIONE CREAZIONE BOSS ============

        renderCreateBossForm() {
            const formContainer = document.getElementById('boss-create-form');
            if (!formContainer) return;

            formContainer.innerHTML = `
                <div class="space-y-4">
                    <!-- Nome -->
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Nome Boss</label>
                        <input type="text" id="boss-name" placeholder="Es: Guardiano del Natale"
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white
                                   focus:border-yellow-500 focus:outline-none">
                    </div>

                    <!-- Descrizione -->
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Descrizione</label>
                        <textarea id="boss-description" placeholder="Descrizione del boss..."
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white
                                   focus:border-yellow-500 focus:outline-none" rows="2"></textarea>
                    </div>

                    <!-- HP e Difficolta in row -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">HP Totali</label>
                            <input type="number" id="boss-hp" value="100" min="10" max="10000"
                                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white
                                       focus:border-yellow-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Difficolta</label>
                            <select id="boss-difficulty"
                                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white
                                       focus:border-yellow-500 focus:outline-none">
                                <option value="easy">Facile</option>
                                <option value="normal" selected>Normale</option>
                                <option value="hard">Difficile</option>
                                <option value="nightmare">Incubo</option>
                            </select>
                        </div>
                    </div>

                    <!-- Bottone Crea -->
                    <button onclick="AdminBoss.createBoss()"
                        class="w-full py-3 bg-gradient-to-r from-yellow-600 to-yellow-500
                               hover:from-yellow-500 hover:to-yellow-400 text-white font-bold rounded-lg
                               transition-all transform hover:scale-[1.02]">
                        👹 Crea Boss
                    </button>
                </div>
            `;
        },

        async createBoss() {
            const name = document.getElementById('boss-name')?.value?.trim();
            const description = document.getElementById('boss-description')?.value?.trim();
            const maxHp = parseInt(document.getElementById('boss-hp')?.value) || 100;
            const difficulty = document.getElementById('boss-difficulty')?.value || 'normal';

            if (!name) {
                this.showToast('Inserisci un nome per il boss', 'error');
                return;
            }

            try {
                const boss = await window.BossBattle?.createBoss({
                    name,
                    description,
                    maxHp,
                    difficulty
                });

                if (boss) {
                    this.showToast(`Boss "${name}" creato!`, 'success');
                    // Reset form
                    document.getElementById('boss-name').value = '';
                    document.getElementById('boss-description').value = '';
                    document.getElementById('boss-hp').value = '100';
                    // Refresh lista
                    await this.renderBossListSection();
                }
            } catch (error) {
                this.showToast('Errore creazione boss: ' + error.message, 'error');
            }
        },

        // ============ SEZIONE TEST ============

        async renderTestSection(boss) {
            const section = document.getElementById('boss-test-section');
            const content = document.getElementById('boss-test-content');
            if (!section || !content) return;

            section.classList.remove('hidden');
            this.currentBoss = boss;

            const hpPercent = boss.maxHp > 0 ? (boss.currentHp / boss.maxHp) * 100 : 0;
            const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

            content.innerHTML = `
                <div class="space-y-4">
                    <!-- Info Boss -->
                    <div class="text-center">
                        <h4 class="text-xl font-bold text-white">${boss.name}</h4>
                        <p class="text-gray-400 text-sm">${boss.description || 'Sconfiggi il boss!'}</p>
                    </div>

                    <!-- HP Bar Grande -->
                    <div class="py-2">
                        <div class="flex justify-between text-sm mb-2">
                            <span class="text-red-400 font-bold">❤️ HP</span>
                            <span class="text-white font-mono text-lg">${boss.currentHp} / ${boss.maxHp}</span>
                        </div>
                        <div class="boss-hp-bar h-6 bg-gray-700 rounded-full overflow-hidden border-2 border-gray-600">
                            <div class="boss-hp-fill h-full ${hpColor} transition-all duration-500"
                                style="width: ${hpPercent}%"></div>
                        </div>
                    </div>

                    <!-- Bottone Sfida -->
                    <button id="btn-challenge-boss" onclick="AdminBoss.challengeBoss('${boss.id}')"
                        class="w-full py-4 bg-gradient-to-r from-red-600 to-red-500
                               hover:from-red-500 hover:to-red-400 text-white font-bold text-lg rounded-lg
                               transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">
                        ⚔️ SFIDA IL BOSS!
                    </button>

                    <!-- Risultato Sfida -->
                    <div id="challenge-result" class="hidden"></div>

                    <!-- Classifica -->
                    <div id="damage-leaderboard" class="mt-4">
                        <h5 class="text-sm font-semibold text-gray-400 mb-2">🏆 Top Danneggiatori</h5>
                        <div class="text-gray-500 text-sm">Caricamento...</div>
                    </div>
                </div>
            `;

            // Carica classifica
            await this.loadLeaderboard(boss.id);
        },

        async selectBossForTest(bossId) {
            const boss = await window.BossBattle?.loadBoss(bossId);
            if (boss) {
                await this.renderTestSection(boss);
                // Scroll to test section
                document.getElementById('boss-test-section')?.scrollIntoView({ behavior: 'smooth' });
            }
        },

        async challengeBoss(bossId) {
            const btn = document.getElementById('btn-challenge-boss');
            const resultDiv = document.getElementById('challenge-result');

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ Simulazione in corso...';
            }

            try {
                // Ottieni squadra del giocatore corrente
                const playerTeam = window.InterfacciaCore?.getCurrentTeam?.() || this.getMockPlayerTeam();

                // Esegui sfida
                const result = await window.BossBattle?.challengeBoss(bossId, playerTeam);

                if (result?.success) {
                    // Mostra risultato
                    this.showChallengeResult(result);
                    // Aggiorna HP bar e lista
                    await this.renderBossListSection();
                    // Se boss ancora attivo, aggiorna test section
                    const updatedBoss = await window.BossBattle?.loadBoss(bossId);
                    if (updatedBoss && updatedBoss.status === 'active') {
                        await this.renderTestSection(updatedBoss);
                    } else if (updatedBoss?.status === 'defeated') {
                        this.showBossDefeated(updatedBoss);
                    }
                } else {
                    this.showToast(result?.error || 'Errore sfida', 'error');
                }
            } catch (error) {
                this.showToast('Errore: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '⚔️ SFIDA IL BOSS!';
                }
            }
        },

        showChallengeResult(result) {
            const resultDiv = document.getElementById('challenge-result');
            if (!resultDiv) return;

            const matchResult = result.result || {};
            const playerGoals = matchResult.homeGoals || 0;
            const bossGoals = matchResult.awayGoals || 0;
            const won = playerGoals > bossGoals;

            resultDiv.className = 'p-4 rounded-lg text-center ' +
                (result.damage > 0 ? 'bg-green-900/50 border border-green-600' : 'bg-red-900/50 border border-red-600');
            resultDiv.classList.remove('hidden');

            resultDiv.innerHTML = `
                <div class="text-2xl font-bold mb-2">
                    ${won ? '🎉 Vittoria!' : playerGoals === bossGoals ? '🤝 Pareggio' : '💀 Sconfitta'}
                </div>
                <div class="text-3xl font-mono mb-3">
                    <span class="text-blue-400">${playerGoals}</span>
                    <span class="text-gray-400 mx-2">-</span>
                    <span class="text-red-400">${bossGoals}</span>
                </div>
                <div class="text-lg ${result.damage > 0 ? 'text-green-400' : 'text-gray-400'}">
                    ${result.damage > 0
                        ? `⚔️ Hai inflitto <span class="font-bold text-xl">${result.damage}</span> danni!`
                        : '😔 Non hai inflitto danni'}
                </div>
                ${result.isDefeated ? `
                    <div class="mt-3 text-yellow-400 font-bold text-xl animate-pulse">
                        🏆 BOSS SCONFITTO!
                    </div>
                ` : `
                    <div class="mt-2 text-sm text-gray-400">
                        HP Boss rimanenti: ${result.newHp}
                    </div>
                `}
            `;

            // Auto-hide dopo 5 secondi
            setTimeout(() => {
                resultDiv.classList.add('hidden');
            }, 5000);
        },

        showBossDefeated(boss) {
            const testSection = document.getElementById('boss-test-section');
            const content = document.getElementById('boss-test-content');
            if (!content) return;

            content.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-6xl mb-4">🏆</div>
                    <h3 class="text-2xl font-bold text-yellow-400 mb-2">BOSS SCONFITTO!</h3>
                    <p class="text-white text-lg">${boss.name} è stato eliminato!</p>
                    <p class="text-gray-400 mt-2">Danni totali inflitti: ${boss.totalDamage}</p>
                    <p class="text-gray-400">Partecipanti: ${boss.totalParticipants}</p>

                    <button onclick="AdminBoss.resetBoss('${boss.id}')"
                        class="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg">
                        🔄 Resetta Boss per nuovo test
                    </button>
                </div>
            `;
        },

        async loadLeaderboard(bossId) {
            const container = document.getElementById('damage-leaderboard');
            if (!container) return;

            const leaderboard = await window.BossBattle?.getDamageLeaderboard(bossId, 10) || [];

            if (leaderboard.length === 0) {
                container.innerHTML = `
                    <h5 class="text-sm font-semibold text-gray-400 mb-2">🏆 Top Danneggiatori</h5>
                    <p class="text-gray-500 text-sm text-center py-2">Nessun partecipante ancora</p>
                `;
                return;
            }

            const rows = leaderboard.map((p, i) => `
                <div class="flex justify-between items-center py-1 ${i < 3 ? 'text-yellow-400' : 'text-gray-300'}">
                    <span>${i + 1}. ${p.teamName || 'Squadra'}</span>
                    <span class="font-mono">${p.totalDamage || 0} dmg</span>
                </div>
            `).join('');

            container.innerHTML = `
                <h5 class="text-sm font-semibold text-gray-400 mb-2">🏆 Top Danneggiatori</h5>
                <div class="bg-gray-800 rounded p-2 text-sm max-h-48 overflow-y-auto">
                    ${rows}
                </div>
            `;
        },

        // ============ AZIONI BOSS ============

        async resetBoss(bossId) {
            if (!confirm('Vuoi resettare gli HP del boss?')) return;

            const success = await window.BossBattle?.resetBossHp(bossId);
            if (success) {
                this.showToast('Boss resettato!', 'success');
                await this.renderBossListSection();
            } else {
                this.showToast('Errore reset boss', 'error');
            }
        },

        async deleteBoss(bossId) {
            if (!confirm('Vuoi eliminare questo boss?')) return;

            const success = await window.BossBattle?.deleteBoss(bossId);
            if (success) {
                this.showToast('Boss eliminato!', 'success');
                await this.renderBossListSection();
            } else {
                this.showToast('Errore eliminazione boss', 'error');
            }
        },

        // ============ UTILITIES ============

        getMockPlayerTeam() {
            // Team di test se non c'è un team reale
            return {
                id: 'test_team',
                teamName: 'Squadra Test Admin',
                players: [
                    { id: 'p1', nome: 'Portiere Test', ruolo: 'P', level: 10 },
                    { id: 'p2', nome: 'Difensore Test', ruolo: 'D', level: 10 },
                    { id: 'p3', nome: 'Centrocampista Test', ruolo: 'C', level: 10 },
                    { id: 'p4', nome: 'Centrocampista2 Test', ruolo: 'C', level: 10 },
                    { id: 'p5', nome: 'Attaccante Test', ruolo: 'A', level: 10 }
                ],
                formation: {
                    modulo: '1-2-2',
                    titolari: [
                        { id: 'p1', nome: 'Portiere Test', ruolo: 'P', level: 10 },
                        { id: 'p2', nome: 'Difensore Test', ruolo: 'D', level: 10 },
                        { id: 'p3', nome: 'Centrocampista Test', ruolo: 'C', level: 10 },
                        { id: 'p4', nome: 'Centrocampista2 Test', ruolo: 'C', level: 10 },
                        { id: 'p5', nome: 'Attaccante Test', ruolo: 'A', level: 10 }
                    ]
                }
            };
        },

        showToast(message, type = 'info') {
            // Usa Toast esistente se disponibile
            if (window.Toast) {
                if (type === 'success') window.Toast.success(message);
                else if (type === 'error') window.Toast.error(message);
                else window.Toast.info(message);
                return;
            }

            // Fallback: alert
            alert(message);
        }
    };

})();
