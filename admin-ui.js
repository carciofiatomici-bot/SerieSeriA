//
// ====================================================================
// MODULO ADMIN-UI.JS (Rendering Interfaccia Admin)
// ====================================================================
//

window.AdminUI = {

    /**
     * Renderizza la dashboard admin principale
     */
    async renderAdminDashboard(adminDashboardContainer, configData, allTeams) {
        const draftOpen = configData.isDraftOpen || false;
        const marketOpen = configData.isMarketOpen || false;
        const cssEnabled = configData.creditiSuperSeriEnabled || false;
        const participatingTeamsCount = allTeams.filter(t => t.isParticipating).length;

        // Gestione bottone "Torna alla Dashboard" (in fondo alla pagina, in index.html)
        const adminTeamInfo = window.adminTeamAccessingPanel;
        const returnContainer = document.getElementById('admin-return-dashboard-container');
        const returnTeamName = document.getElementById('return-dashboard-team-name');

        if (returnContainer && returnTeamName) {
            if (adminTeamInfo) {
                returnTeamName.textContent = `Torna alla Dashboard di ${adminTeamInfo.teamName}`;
                returnContainer.classList.remove('hidden');
            } else {
                returnContainer.classList.add('hidden');
            }
        }

        adminDashboardContainer.innerHTML = `
            <!-- STATO GENERALE - In cima alla pagina -->
            <div class="mb-6 bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h3 class="text-xl font-bold text-orange-400 border-b border-gray-600 pb-2 mb-4 flex items-center">
                    <span class="mr-2">⚙️</span> Stato Generale
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-600">
                        <p class="text-2xl font-bold text-yellow-400">${participatingTeamsCount}</p>
                        <p class="text-xs text-gray-400">Squadre Iscritte</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-600">
                        <p class="text-2xl font-bold ${draftOpen ? 'text-green-400' : 'text-red-400'}">${draftOpen ? 'APERTO' : 'CHIUSO'}</p>
                        <p class="text-xs text-gray-400">Draft</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-600">
                        <p class="text-2xl font-bold ${marketOpen ? 'text-green-400' : 'text-red-400'}">${marketOpen ? 'APERTO' : 'CHIUSO'}</p>
                        <p class="text-xs text-gray-400">Mercato</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-600">
                        <p class="text-2xl font-bold ${cssEnabled ? 'text-green-400' : 'text-red-400'}">${cssEnabled ? 'ATTIVI' : 'DISATTIVI'}</p>
                        <p class="text-xs text-gray-400">Crediti Super Seri</p>
                    </div>
                </div>
            </div>

            <!-- Pulsanti Navigazione Principale -->
            <div class="mb-6 space-y-4">
                <div class="grid grid-cols-4 gap-4">
                    <button id="btn-championship-settings"
                            class="bg-orange-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-orange-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-cog mr-2"></i> Impostazioni Campionato
                    </button>
                    <button id="btn-player-management"
                            class="bg-yellow-600 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-yellow-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-list-ol mr-2"></i> Gestione Giocatori
                    </button>
                    <button id="btn-team-management"
                            class="bg-blue-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-blue-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-users mr-2"></i> Gestione Squadre
                    </button>
                    <button id="btn-feature-flags"
                            class="bg-purple-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-flag mr-2"></i> Flag
                    </button>
                </div>
            </div>

            <!-- ========== 1. GESTIONE COMPETIZIONI ========== -->
            <div class="mb-4">
                <button id="btn-toggle-league-management" class="w-full bg-gradient-to-r from-green-600 via-purple-600 to-yellow-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:opacity-90 transition duration-150 flex items-center justify-between px-6">
                    <span class="flex items-center">
                        <i class="fas fa-trophy mr-3"></i> Gestione Competizioni
                    </span>
                    <i id="league-management-chevron" class="fas fa-chevron-down transition-transform duration-300"></i>
                </button>

                <div id="league-management-content" class="hidden mt-3 space-y-4 transition-all duration-300">
                    <!-- SerieSeriA -->
                    <div id="serieseria-admin-section" class="p-4 bg-gray-800 rounded-lg border border-green-500">
                        <h4 class="text-lg font-bold text-green-400 mb-3 flex items-center">🏅 SerieSeriA</h4>

                        <!-- Stato Campionato -->
                        <div id="serieseria-status-container" class="mb-3 p-3 bg-gray-900 rounded-lg">
                            <p class="text-gray-400 text-center text-xs">Caricamento stato...</p>
                        </div>

                        <!-- Bottoni Azione -->
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <button id="btn-generate-championship-schedule" class="bg-green-700 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition text-sm">
                                <i class="fas fa-plus-circle mr-1"></i> Genera Calendario
                            </button>
                            <button id="btn-simulate-championship-round" class="bg-yellow-600 text-gray-900 font-bold py-2 rounded-lg hover:bg-yellow-500 transition text-sm">
                                <i class="fas fa-play mr-1"></i> Simula Giornata
                            </button>
                        </div>

                        <!-- Prossima Giornata -->
                        <div id="serieseria-next-round" class="mb-3">
                            <div class="p-3 bg-gray-900 rounded-lg border border-gray-700">
                                <h5 class="text-sm font-bold text-yellow-400 mb-2 flex items-center">
                                    <i class="fas fa-calendar-day mr-2"></i> Prossima Giornata
                                </h5>
                                <div id="serieseria-next-matches" class="text-xs text-gray-400">
                                    Caricamento...
                                </div>
                            </div>
                        </div>

                        <!-- Classifica Accordion -->
                        <div id="serieseria-standings-accordion" class="border border-gray-700 rounded-lg overflow-hidden">
                            <button id="btn-toggle-standings" class="w-full p-3 bg-gray-900 hover:bg-gray-700 transition flex items-center justify-between text-left">
                                <span class="text-sm font-bold text-blue-400 flex items-center">
                                    <i class="fas fa-chart-bar mr-2"></i> Classifica
                                </span>
                                <i id="standings-chevron" class="fas fa-chevron-down text-gray-400 transition-transform"></i>
                            </button>
                            <div id="serieseria-standings-content" class="hidden bg-gray-900 border-t border-gray-700">
                                <div id="serieseria-standings-table" class="p-2 text-xs">
                                    Caricamento classifica...
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- CoppaSeriA -->
                    <div id="coppa-admin-section" class="p-4 bg-gray-800 rounded-lg border border-purple-500">
                        <h4 class="text-lg font-bold text-purple-400 mb-3 flex items-center">🏆 CoppaSeriA</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <button id="btn-generate-cup-schedule" class="bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-500 transition text-sm">
                                <i class="fas fa-trophy mr-1"></i> Genera Coppa
                            </button>
                            <button id="btn-view-cup-bracket" class="bg-purple-800 text-white font-bold py-2 rounded-lg hover:bg-purple-700 transition text-sm">
                                <i class="fas fa-sitemap mr-1"></i> Tabellone
                            </button>
                        </div>
                        <div id="coppa-status-container" class="mt-3">
                            <p class="text-gray-400 text-center text-xs">Caricamento stato...</p>
                        </div>
                    </div>

                    <!-- SuperCoppa -->
                    <div id="supercoppa-admin-section" class="p-4 bg-gray-800 rounded-lg border border-yellow-500">
                        <h4 class="text-lg font-bold text-yellow-400 mb-3 flex items-center">⭐ SuperCoppaSeriA</h4>
                        <p class="text-gray-400 text-xs">Campione vs Vincitore Coppa</p>
                    </div>

                    <!-- Automazione -->
                    <div id="automation-admin-section" class="p-4 bg-gray-800 rounded-lg border border-teal-500">
                        <h4 class="text-lg font-bold text-teal-400 mb-3 flex items-center">🤖 Automazione Simulazioni</h4>
                        <p class="text-gray-400 text-xs mb-2">Simula automaticamente alle 12:00 e 20:30</p>
                        <div id="automation-status-container">
                            <p class="text-gray-400 text-center text-xs">Caricamento stato...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ========== 2. AZIONI STAGIONE ========== -->
            <div class="mb-4">
                <button id="btn-toggle-admin-utils" class="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:opacity-90 transition duration-150 flex items-center justify-between px-6">
                    <span class="flex items-center">
                        <i class="fas fa-rocket mr-3"></i> Azioni Stagione
                    </span>
                    <i id="admin-utils-chevron" class="fas fa-chevron-down transition-transform duration-300"></i>
                </button>

                <div id="admin-utils-content" class="hidden mt-3 p-4 bg-gray-800 rounded-lg border border-teal-500 transition-all duration-300">
                    <div class="grid grid-cols-2 gap-3">
                        <button id="btn-avvia-stagione" class="bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold py-3 rounded-lg hover:from-green-500 hover:to-teal-400 transition col-span-2">
                            🚀 Avvia Stagione
                        </button>
                        <button id="btn-create-objects" class="bg-emerald-700 text-white font-bold py-2 rounded-lg hover:bg-emerald-600 transition text-sm">
                            🎒 Creazione Oggetti
                        </button>
                        <button id="btn-test-simulation-new-rules" class="bg-purple-700 text-white font-bold py-2 rounded-lg hover:bg-purple-600 transition text-sm">
                            🧪 Test Simulazione
                        </button>
                        <button id="btn-test-challenge-minigame" class="bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-2 rounded-lg hover:from-green-500 hover:to-green-600 transition text-sm">
                            🎮 Test Minigioco
                        </button>
                        <button id="btn-reset-hall-of-fame" class="bg-orange-700 text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition text-sm">
                            🏛️ Reset HoF Stats
                        </button>
                    </div>
                    <p class="text-gray-400 text-xs mt-3 text-center">Squadre partecipanti: <span class="font-bold text-green-400">${participatingTeamsCount}</span></p>
                </div>
            </div>

            <!-- ========== 3. CONFIGURAZIONI ========== -->
            <div class="mb-4">
                <button id="btn-toggle-configs" class="w-full bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:opacity-90 transition duration-150 flex items-center justify-between px-6">
                    <span class="flex items-center">
                        <i class="fas fa-cogs mr-3"></i> Configurazioni
                    </span>
                    <i id="configs-chevron" class="fas fa-chevron-down transition-transform duration-300"></i>
                </button>

                <div id="configs-content" class="hidden mt-3 p-4 bg-gray-800 rounded-lg border border-cyan-500 transition-all duration-300">
                    <div class="grid grid-cols-2 gap-3">
                        <button id="btn-formulas-config" class="bg-gradient-to-r from-cyan-700 to-blue-600 text-white font-bold py-2 rounded-lg hover:from-cyan-600 hover:to-blue-500 transition text-sm">
                            📐 Formule Costi
                        </button>
                        <button id="btn-rewards-config" class="bg-gradient-to-r from-emerald-700 to-green-600 text-white font-bold py-2 rounded-lg hover:from-emerald-600 hover:to-green-500 transition text-sm">
                            🏆 Reward
                        </button>
                        <button id="btn-sponsors-config" class="bg-gradient-to-r from-yellow-700 to-amber-600 text-white font-bold py-2 rounded-lg hover:from-yellow-600 hover:to-amber-500 transition text-sm">
                            🤝 Sponsor
                        </button>
                        <button id="btn-media-config" class="bg-gradient-to-r from-pink-700 to-rose-600 text-white font-bold py-2 rounded-lg hover:from-pink-600 hover:to-rose-500 transition text-sm">
                            📺 Media
                        </button>
                        <button id="btn-wheel-config" class="bg-gradient-to-r from-orange-600 to-yellow-500 text-white font-bold py-2 rounded-lg hover:from-orange-500 hover:to-yellow-400 transition text-sm">
                            🎡 Ruota
                        </button>
                        <button id="btn-schedina-config" class="bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-2 rounded-lg hover:from-green-500 hover:to-emerald-400 transition text-sm">
                            🎯 Schedina
                        </button>
                        <button id="btn-figurine-config" class="bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-bold py-2 rounded-lg hover:from-purple-500 hover:to-indigo-400 transition text-sm">
                            🃏 Figurine
                            <span class="block text-[10px] font-normal opacity-80">Config</span>
                        </button>
                        <button id="btn-figurine-rarity" class="bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold py-2 rounded-lg hover:from-amber-500 hover:to-yellow-400 transition text-sm">
                            ⭐ Rarita
                            <span class="block text-[10px] font-normal opacity-80">Figurine</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- ========== 4. GESTIONE DATI ========== -->
            <div class="mb-4">
                <button id="btn-toggle-data-management" class="w-full bg-gradient-to-r from-indigo-600 to-purple-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:opacity-90 transition duration-150 flex items-center justify-between px-6">
                    <span class="flex items-center">
                        <i class="fas fa-database mr-3"></i> Gestione Dati
                    </span>
                    <i id="data-management-chevron" class="fas fa-chevron-down transition-transform duration-300"></i>
                </button>

                <div id="data-management-content" class="hidden mt-3 p-4 bg-gray-800 rounded-lg border border-indigo-500 space-y-4 transition-all duration-300">
                    <!-- Contratti -->
                    <div>
                        <p class="text-xs text-gray-400 mb-2 font-bold">📝 Contratti (tutte le squadre)</p>
                        <div class="grid grid-cols-3 gap-2">
                            <button id="btn-add-contracts-all" class="bg-blue-700 text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition text-sm">+1</button>
                            <button id="btn-remove-contracts-all" class="bg-orange-700 text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition text-sm">-1</button>
                            <button id="btn-reset-contracts-all" class="bg-gray-600 text-white font-bold py-2 rounded-lg hover:bg-gray-500 transition text-sm">Reset</button>
                        </div>
                    </div>

                    <!-- Icone -->
                    <div>
                        <p class="text-xs text-gray-400 mb-2 font-bold">👑 Icone</p>
                        <div class="grid grid-cols-2 gap-2">
                            <button id="btn-fix-icone-ability" class="bg-yellow-700 text-white font-bold py-2 rounded-lg hover:bg-yellow-600 transition text-sm">Fix Abilita</button>
                            <button id="btn-set-icone-level" class="bg-amber-600 text-white font-bold py-2 rounded-lg hover:bg-amber-500 transition text-sm">Set Livello</button>
                        </div>
                    </div>

                    <!-- Figurine & Sync -->
                    <div>
                        <p class="text-xs text-gray-400 mb-2 font-bold">🔧 Manutenzione</p>
                        <div class="grid grid-cols-1 gap-2">
                            <button id="btn-reset-figurine-timer" class="bg-purple-700 text-white font-bold py-2 rounded-lg hover:bg-purple-600 transition text-sm">
                                🃏 Reset Timer Figurine
                            </button>
                            <button id="btn-data-sync" class="bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500 transition text-sm">
                                🔄 Sincronizza Dati Firebase
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ========== 5. EMERGENZA ========== -->
            <div class="mb-4 p-4 bg-red-900/30 rounded-lg border border-red-600">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-red-400 font-bold">🚨 Emergenza</p>
                        <p class="text-xs text-gray-400">Annulla Campionato e Coppa senza premi</p>
                    </div>
                    <button id="btn-emergency-cancel-competitions" class="bg-red-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm border border-red-500">
                        Annulla Competizioni
                    </button>
                </div>
            </div>

            <!-- PANNELLO FORMULE COSTI (inizialmente nascosto) -->
            <div id="formulas-panel-container" class="hidden mb-6 bg-gray-800 p-6 rounded-lg border-2 border-cyan-500">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-cyan-400">📐 Configurazione Formule Costi</h3>
                    <button id="btn-close-formulas-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="formulas-panel-content">
                    <p class="text-gray-400">Caricamento...</p>
                </div>
            </div>

            <!-- PANNELLO CONFIGURAZIONE REWARD (inizialmente nascosto) -->
            <div id="rewards-panel-container" class="hidden mb-6 bg-gray-800 p-6 rounded-lg border-2 border-emerald-500">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-emerald-400">🏆 Configurazione Reward</h3>
                    <button id="btn-close-rewards-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="rewards-panel-content">
                    <p class="text-gray-400">Caricamento...</p>
                </div>
            </div>

            <!-- PANNELLO CONFIGURAZIONE SPONSOR (inizialmente nascosto) -->
            <div id="sponsors-panel-container" class="hidden mb-6 bg-gray-800 p-6 rounded-lg border-2 border-yellow-500">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-yellow-400">🤝 Configurazione Sponsor</h3>
                    <button id="btn-close-sponsors-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="sponsors-panel-content">
                    <p class="text-gray-400">Caricamento...</p>
                </div>
            </div>

            <!-- PANNELLO CONFIGURAZIONE MEDIA (inizialmente nascosto) -->
            <div id="media-panel-container" class="hidden mb-6 bg-gray-800 p-6 rounded-lg border-2 border-pink-500">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-pink-400">📺 Configurazione Media</h3>
                    <button id="btn-close-media-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="media-panel-content">
                    <p class="text-gray-400">Caricamento...</p>
                </div>
            </div>

            <!-- PANNELLO CONFIGURAZIONE RUOTA FORTUNA (inizialmente nascosto) -->
            <div id="wheel-panel-container" class="hidden mb-6 bg-gray-800 p-6 rounded-lg border-2 border-orange-500">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-orange-400">🎡 Configurazione Ruota della Fortuna</h3>
                    <button id="btn-close-wheel-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="wheel-panel-content">
                    <p class="text-gray-400">Caricamento...</p>
                </div>
            </div>

            <!-- PANNELLO CONFIGURAZIONE SCHEDINA (inizialmente nascosto) -->
            <div id="schedina-panel-container" class="hidden mb-6 bg-gray-800 p-6 rounded-lg border-2 border-green-500">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-green-400">🎯 Configurazione Schedina Pronostici</h3>
                    <button id="btn-close-schedina-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="schedina-panel-content">
                    <p class="text-gray-400">Caricamento...</p>
                </div>
            </div>

            <!-- PANNELLO CONFIGURAZIONE FIGURINE (inizialmente nascosto) -->
            <div id="figurine-panel-container" class="hidden mb-6 bg-gray-800 p-6 rounded-lg border-2 border-purple-500">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-purple-400">🃏 Configurazione Album Figurine</h3>
                    <button id="btn-close-figurine-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="figurine-panel-content">
                    <p class="text-gray-400">Caricamento...</p>
                </div>
            </div>

            <!-- PANNELLO RARITA FIGURINE (inizialmente nascosto) -->
            <div id="figurine-rarity-container" class="hidden mb-6 bg-gray-800 p-6 rounded-lg border-2 border-amber-500">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-amber-400">⭐ Gestione Rarita Figurine</h3>
                    <button id="btn-close-rarity-panel" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div id="figurine-rarity-content">
                    <p class="text-gray-400">Caricamento...</p>
                </div>
            </div>

            <!-- MODAL TEST SIMULAZIONE -->
            <div id="test-simulation-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-blue-500">
                    <h3 class="text-xl font-bold text-blue-400 mb-4">🧪 Test Simulazione Partita</h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-gray-300 mb-2">Squadra Casa</label>
                            <select id="test-home-team" class="w-full bg-gray-800 text-white p-2 rounded border border-gray-600">
                                <option value="">Seleziona squadra...</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-gray-300 mb-2">Squadra Trasferta</label>
                            <select id="test-away-team" class="w-full bg-gray-800 text-white p-2 rounded border border-gray-600">
                                <option value="">Seleziona squadra...</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-4 mb-4">
                        <button id="btn-run-test-simulation" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg">
                            Simula Partita
                        </button>
                        <button id="btn-close-test-simulation" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded-lg">
                            Chiudi
                        </button>
                    </div>
                    <div id="test-simulation-result" class="bg-gray-800 rounded-lg p-4 hidden">
                        <h4 class="text-lg font-bold text-white mb-2">Risultato</h4>
                        <div id="test-simulation-score" class="text-center text-3xl font-extrabold text-yellow-400 mb-4"></div>
                        <div id="test-simulation-details" class="text-sm text-gray-300 max-h-64 overflow-y-auto"></div>
                        <div class="flex gap-2 mt-4">
                            <button id="btn-toggle-simple-log" class="flex-1 bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg">
                                <i class="fas fa-star mr-2"></i>Azioni Salienti
                            </button>
                            <button id="btn-toggle-detailed-log" class="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 rounded-lg">
                                <i class="fas fa-bug mr-2"></i>Debug Log
                            </button>
                        </div>
                        <div id="test-simulation-animation-buttons" class="hidden flex gap-2 mt-4">
                            <button id="btn-test-view-replay" class="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                                <span>🎬</span> Replay Completo
                            </button>
                            <button id="btn-test-view-highlights" class="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                                <span>⭐</span> Solo Highlights
                            </button>
                        </div>
                        <div id="test-simulation-simple-log" class="hidden mt-4 bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto">
                            <h5 class="text-sm font-bold text-yellow-400 mb-2"><i class="fas fa-star mr-2"></i>Azioni Salienti</h5>
                            <pre id="test-simulation-simple-log-content" class="text-xs text-gray-300 whitespace-pre-wrap font-mono"></pre>
                        </div>
                        <div id="test-simulation-detailed-log" class="hidden mt-4 bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto">
                            <h5 class="text-sm font-bold text-purple-400 mb-2"><i class="fas fa-bug mr-2"></i>Debug Log</h5>
                            <pre id="test-simulation-detailed-log-content" class="text-xs text-gray-300 whitespace-pre-wrap font-mono"></pre>
                        </div>
                        <!-- Espandi Eventi Partita -->
                        <div id="test-simulation-events-section" class="hidden mt-4">
                            <button id="btn-expand-events-test" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                                <span>📊</span> Espandi Eventi Partita
                            </button>
                            <div id="test-simulation-events-container" class="hidden mt-4 max-h-96 overflow-y-auto"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL TEST SIMULAZIONE NUOVE REGOLE -->
            <div id="test-simulation-new-rules-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-purple-500">
                    <h3 class="text-xl font-bold text-purple-400 mb-4">🧪 Test Simulazione - Nuove Regole</h3>
                    <div class="bg-purple-900/30 rounded-lg p-3 mb-4 text-sm text-purple-200">
                        <p class="font-bold mb-1">Differenze dalle regole attuali (30 occasioni):</p>
                        <ul class="list-disc list-inside text-xs space-y-1">
                            <li>40 occasioni per squadra (invece di 30)</li>
                            <li>Modificatori livello aumentati (Liv 29 = +17.5, Liv 30 = +19.5 vs +8 e +9)</li>
                            <li>Tipologia: bonus variabile 5-25% (invece di fisso)</li>
                            <li>5% di passare alla fase successiva anche su fallimento</li>
                            <li>5% di segnare comunque anche su parata</li>
                        </ul>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-gray-300 mb-2">Squadra Casa</label>
                            <select id="test-new-home-team" class="w-full bg-gray-800 text-white p-2 rounded border border-gray-600">
                                <option value="">Seleziona squadra...</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-gray-300 mb-2">Squadra Trasferta</label>
                            <select id="test-new-away-team" class="w-full bg-gray-800 text-white p-2 rounded border border-gray-600">
                                <option value="">Seleziona squadra...</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-4 mb-4">
                        <button id="btn-run-test-new-simulation" class="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg">
                            Simula Partita
                        </button>
                        <button id="btn-close-test-new-simulation" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded-lg">
                            Chiudi
                        </button>
                    </div>
                    <div id="test-new-simulation-result" class="bg-gray-800 rounded-lg p-4 hidden">
                        <h4 class="text-lg font-bold text-white mb-2">Risultato</h4>
                        <div id="test-new-simulation-score" class="text-center text-3xl font-extrabold text-yellow-400 mb-4"></div>
                        <div class="flex gap-2 mt-4">
                            <button id="btn-toggle-new-simple-log" class="flex-1 bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg">
                                <i class="fas fa-star mr-2"></i>Azioni Salienti
                            </button>
                            <button id="btn-toggle-new-detailed-log" class="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 rounded-lg">
                                <i class="fas fa-bug mr-2"></i>Debug Log
                            </button>
                        </div>
                        <div id="test-new-simulation-simple-log" class="hidden mt-4 bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto">
                            <h5 class="text-sm font-bold text-yellow-400 mb-2"><i class="fas fa-star mr-2"></i>Azioni Salienti</h5>
                            <pre id="test-new-simulation-simple-log-content" class="text-xs text-gray-300 whitespace-pre-wrap font-mono"></pre>
                        </div>
                        <div id="test-new-simulation-detailed-log" class="hidden mt-4 bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto">
                            <h5 class="text-sm font-bold text-purple-400 mb-2"><i class="fas fa-bug mr-2"></i>Debug Log</h5>
                            <pre id="test-new-simulation-detailed-log-content" class="text-xs text-gray-300 whitespace-pre-wrap font-mono"></pre>
                        </div>
                        <!-- Espandi Eventi Partita -->
                        <div id="test-new-simulation-events-section" class="hidden mt-4">
                            <button id="btn-expand-events-new-test" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                                <span>📊</span> Espandi Eventi Partita
                            </button>
                            <div id="test-new-simulation-events-container" class="hidden mt-4 max-h-96 overflow-y-auto"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Messaggio di stato (usato per feedback) -->
            <p id="toggle-status-message" class="text-center mt-3 mb-6 text-red-400 hidden"></p>
        `;
    },

    /**
     * Renderizza il pannello gestione giocatori
     */
    renderPlayerManagementPanel(playerManagementToolsContainer, draftOpen, marketOpen) {
        const types = ['Potenza', 'Tecnica', 'Velocita'];

        playerManagementToolsContainer.innerHTML = `
            <!-- GESTIONE ICONE -->
            <div class="mb-6">
                <button id="btn-manage-icons"
                        class="w-full bg-yellow-500 text-gray-900 font-extrabold py-4 rounded-lg shadow-xl hover:bg-yellow-400 transition duration-150 transform hover:scale-[1.01]">
                    <i class="fas fa-crown mr-2"></i> 👑 Gestione Icone (Capitani)
                </button>
            </div>

            <!-- CONTROLLO STATI MERCATO & DRAFT -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2">Controllo Stato Mercato & Draft</h3>

            <!-- Toggle Draft e Mercato -->
            <div class="grid grid-cols-2 gap-4 mb-4">
                <!-- TOGGLE DRAFT -->
                <div class="p-4 rounded-lg border-2 ${draftOpen ? 'border-green-500 bg-gray-800' : 'border-red-500 bg-gray-800'}">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-bold text-lg text-white block">Draft</span>
                            <span id="draft-status-text" class="text-sm ${draftOpen ? 'text-green-400' : 'text-red-400'} font-semibold">${draftOpen ? 'APERTO' : 'CHIUSO'}</span>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="toggle-draft-checkbox"
                                   class="sr-only peer"
                                   ${draftOpen ? 'checked' : ''}
                                   data-type="draft">
                            <div class="w-14 h-7 bg-red-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>

                <!-- TOGGLE MERCATO -->
                <div class="p-4 rounded-lg border-2 ${marketOpen ? 'border-green-500 bg-gray-800' : 'border-red-500 bg-gray-800'}">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-bold text-lg text-white block">Mercato</span>
                            <span id="market-status-text" class="text-sm ${marketOpen ? 'text-green-400' : 'text-red-400'} font-semibold">${marketOpen ? 'APERTO' : 'CHIUSO'}</span>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="toggle-market-checkbox"
                                   class="sr-only peer"
                                   ${marketOpen ? 'checked' : ''}
                                   data-type="market">
                            <div class="w-14 h-7 bg-red-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>
            </div>
            <p id="toggle-status-message" class="text-center mt-2 mb-4 text-red-400"></p>

            <!-- Bottoni Lista Giocatori Draft e Mercato -->
            <div class="grid grid-cols-2 gap-4 mb-4">
                <button id="btn-view-draft-players"
                        class="bg-gradient-to-r from-yellow-600 to-amber-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:from-yellow-500 hover:to-amber-400 transition duration-150 transform hover:scale-[1.01]">
                    📝 Lista Giocatori Draft
                </button>
                <button id="btn-view-market-players"
                        class="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:from-blue-500 hover:to-cyan-400 transition duration-150 transform hover:scale-[1.01]">
                    💰 Lista Giocatori Mercato
                </button>
            </div>

            <!-- GESTIONE DRAFT A TURNI - Visibile solo se Draft aperto -->
            <div id="draft-turns-section" class="p-4 bg-gray-700 rounded-lg border border-purple-500 mb-6 ${draftOpen ? '' : 'hidden'}">
                <h4 class="text-lg font-bold text-purple-300 mb-3">Draft a Turni</h4>
                <p class="text-sm text-gray-300 mb-3">Genera la lista del draft per permettere alle squadre di draftare a turno. L'ordine viene calcolato in base alla classifica (o media rosa se non c'e' classifica).</p>

                <!-- Opzione Timer (visibile solo prima di generare la lista) -->
                <div id="draft-timer-option" class="mb-4 p-3 bg-gray-800 rounded-lg border border-cyan-600">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" id="draft-timer-enabled" checked
                               class="w-5 h-5 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500">
                        <div>
                            <span class="text-white font-bold">Timer 1 ora per turno</span>
                            <p class="text-xs text-gray-400 mt-1">
                                Se attivo, ogni squadra ha 1 ora per scegliere. Dopo 3 scadenze, viene esclusa dal round corrente.
                            </p>
                        </div>
                    </label>
                </div>

                <div id="draft-turns-status-container" class="mb-3"></div>
                <div class="grid grid-cols-1 gap-2">
                    <button id="btn-generate-draft-list"
                            class="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-500 transition">
                        Genera Lista Draft
                    </button>

                    <!-- Toggle Pausa Draft -->
                    <div id="draft-pause-toggle-container" class="hidden p-3 bg-gray-800 rounded-lg border border-gray-600">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span id="draft-pause-icon" class="text-xl">▶️</span>
                                <div>
                                    <p id="draft-pause-label" class="text-white font-semibold">Draft Attivo</p>
                                    <p id="draft-pause-sublabel" class="text-xs text-gray-400">Il timer sta scorrendo</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="draft-pause-toggle" class="sr-only peer">
                                <div class="w-14 h-7 bg-green-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-600"></div>
                            </label>
                        </div>
                    </div>

                    <button id="btn-force-advance-turn"
                            class="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-500 transition hidden">
                        ⏭️ Avanza Turno Manualmente
                    </button>

                    <button id="btn-assign-random-player"
                            class="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-500 transition hidden">
                        🎲 Assegna Giocatore Casuale
                    </button>

                    <button id="btn-stop-draft-turns"
                            class="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500 transition hidden">
                        Ferma Draft a Turni
                    </button>
                </div>
            </div>

            <!-- CREAZIONE CALCIATORE - Menu a Scomparsa -->
            <div class="mb-6 bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                <!-- Header Cliccabile -->
                <div id="create-player-header" class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-650 transition-colors bg-gray-750">
                    <div class="flex items-center gap-3">
                        <span id="create-player-toggle-icon" class="text-yellow-400 transition-transform duration-200">▶</span>
                        <h3 class="text-xl font-bold text-yellow-400">Crea Giocatore</h3>
                    </div>
                    <span class="text-gray-400 text-sm">Clicca per espandere</span>
                </div>

                <!-- Contenuto Collassabile -->
                <div id="create-player-content" class="hidden p-6 space-y-4 border-t border-gray-600">

                    <!-- Destinazione -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1 font-semibold" for="target-collection">Destinazione</label>
                        <select id="target-collection" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                            <option value="draft">Draft</option>
                            <option value="market">Mercato</option>
                        </select>
                    </div>

                    <!-- Campi Principali -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="player-name">Nome</label>
                            <input type="text" id="player-name" placeholder="Es: Barella" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                        </div>

                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="player-role">Ruolo</label>
                            <select id="player-role" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                                <option value="">Seleziona Ruolo</option>
                                <option value="P">P (Portiere)</option>
                                <option value="D">D (Difensore)</option>
                                <option value="C">C (Centrocampista)</option>
                                <option value="A">A (Attaccante)</option>
                            </select>
                        </div>

                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="player-type">Tipologia</label>
                            <select id="player-type" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                                <option value="">Seleziona Tipo</option>
                                ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>

                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="player-age">Eta (16 - 45)</label>
                            <input type="number" id="player-age" min="16" max="45" placeholder="25" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                        </div>

                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="player-level-min">Livello Min (1 - 8)</label>
                            <input type="number" id="player-level-min" min="1" max="8" value="1" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                        </div>

                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="player-level-max">Livello Max (1 - 8)</label>
                            <input type="number" id="player-level-max" min="1" max="8" value="3" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                        </div>
                    </div>

                    <!-- Costo Calcolato -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-cost-display">Costo Calcolato</label>
                        <input type="text" id="player-cost-display" value="Costo: -- CS" readonly disabled
                               class="p-2 rounded-lg bg-gray-500 border border-yellow-400 text-white font-extrabold text-center cursor-default">
                    </div>

                    <!-- Abilita -->
                    <div class="border border-gray-600 p-4 rounded-lg bg-gray-800">
                        <label class="text-gray-300 mb-2 font-semibold text-lg block">Abilita (Max 3 positive, 2 negative)</label>
                        <div id="abilities-checklist" class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <p class="text-yellow-400 col-span-4" id="abilities-placeholder">Seleziona un ruolo per visualizzare le abilita.</p>
                        </div>
                    </div>

                    <!-- Bottoni -->
                    <div class="grid grid-cols-2 gap-4">
                        <button id="btn-random-player"
                                class="bg-purple-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150 flex items-center justify-center gap-2">
                            <span>🎲</span> Genera Casuale
                        </button>
                        <button id="btn-create-player"
                                class="bg-green-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-400 transition duration-150 flex items-center justify-center gap-2">
                            <span>➕</span> Crea Giocatore
                        </button>
                    </div>

                    <p id="player-creation-message" class="text-center mt-3 text-red-400"></p>
                </div>
            </div>

            <!-- LISTE GIOCATORI -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2 pt-6">Elenco Giocatori (Draft & Mercato)</h3>

            <!-- Ordinamento per ruolo -->
            <div class="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <span class="text-gray-300 font-semibold">Ordina per ruolo:</span>
                    <div class="flex gap-2">
                        <button id="btn-sort-all" class="sort-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500 font-bold border-2 border-cyan-400">Tutti</button>
                        <button id="btn-sort-P" class="sort-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">P</button>
                        <button id="btn-sort-D" class="sort-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">D</button>
                        <button id="btn-sort-C" class="sort-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">C</button>
                        <button id="btn-sort-A" class="sort-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">A</button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-6 mb-4">
                <button data-action="clear-collection" data-target="draft"
                        class="bg-red-800 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-700 transition duration-150">
                    <i class="fas fa-trash-alt mr-2"></i> SVUOTA TUTTO IL DRAFT
                </button>
                <button data-action="clear-collection" data-target="market"
                        class="bg-red-800 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-700 transition duration-150">
                    <i class="fas fa-trash-alt mr-2"></i> SVUOTA TUTTO IL MERCATO
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-4 bg-gray-700 rounded-lg border border-yellow-500">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xl font-bold text-yellow-400">Giocatori Draft</h4>
                        <button id="btn-update-draft-costs" class="bg-orange-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-orange-500 transition">
                            🔄 Aggiorna Costi
                        </button>
                    </div>
                    <p id="update-draft-costs-message" class="text-center text-xs mb-2"></p>
                    <div id="draft-players-list" class="space-y-3 max-h-96 overflow-y-auto" data-collection="draft">
                         <p class="text-gray-500 text-center">Caricamento Draft...</p>
                    </div>
                </div>

                <div class="p-4 bg-gray-700 rounded-lg border border-blue-500">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xl font-bold text-blue-400">Giocatori Mercato</h4>
                        <button id="btn-update-market-costs" class="bg-orange-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-orange-500 transition">
                            🔄 Aggiorna Costi
                        </button>
                    </div>
                    <p id="update-market-costs-message" class="text-center text-xs mb-2"></p>
                    <div id="market-players-list" class="space-y-3 max-h-96 overflow-y-auto" data-collection="market">
                         <p class="text-gray-500 text-center">Caricamento Mercato...</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza il modal per la lista giocatori (Draft o Mercato)
     */
    renderPlayersListModal(container, type, players, onEdit, onDelete, onClose) {
        const isDraft = type === 'draft';
        const title = isDraft ? '📝 Lista Giocatori Draft' : '💰 Lista Giocatori Mercato';
        const borderColor = isDraft ? 'border-yellow-500' : 'border-blue-500';
        const headerBg = isDraft ? 'bg-gradient-to-r from-yellow-600 to-amber-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500';

        const modalHtml = `
            <div id="players-list-modal" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col border-2 ${borderColor}">
                    <!-- Header -->
                    <div class="${headerBg} p-4 rounded-t-lg flex items-center justify-between">
                        <h2 class="text-xl font-bold text-white">${title}</h2>
                        <button id="btn-close-players-modal" class="text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
                    </div>

                    <!-- Filtri -->
                    <div class="p-4 bg-gray-800 border-b border-gray-700">
                        <div class="flex items-center gap-4 flex-wrap">
                            <span class="text-gray-300 font-semibold">Filtra per ruolo:</span>
                            <div class="flex gap-2">
                                <button data-filter="all" class="filter-btn bg-cyan-600 text-white px-3 py-1 rounded text-sm font-bold">Tutti</button>
                                <button data-filter="P" class="filter-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">P</button>
                                <button data-filter="D" class="filter-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">D</button>
                                <button data-filter="C" class="filter-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">C</button>
                                <button data-filter="A" class="filter-btn bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">A</button>
                            </div>
                            <span class="text-gray-400 text-sm ml-auto" id="players-count">Totale: ${players.length} giocatori</span>
                        </div>
                    </div>

                    <!-- Lista Giocatori -->
                    <div class="flex-1 overflow-y-auto p-4" id="modal-players-list">
                        ${this.renderPlayersList(players, isDraft)}
                    </div>

                    <!-- Footer -->
                    <div class="p-4 bg-gray-800 border-t border-gray-700 rounded-b-lg">
                        <div class="flex justify-between items-center">
                            <button id="btn-update-costs-modal" class="bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-500 transition">
                                🔄 Aggiorna Costi Tutti
                            </button>
                            <button id="btn-close-players-modal-bottom" class="bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-500 transition">
                                Chiudi
                            </button>
                        </div>
                        <p id="modal-action-message" class="text-center mt-2 text-sm"></p>
                    </div>
                </div>
            </div>
        `;

        // Inserisce il modal nel body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);

        const modal = document.getElementById('players-list-modal');

        // Event listeners
        const closeModal = () => {
            modal.remove();
            if (onClose) onClose();
        };

        document.getElementById('btn-close-players-modal').addEventListener('click', closeModal);
        document.getElementById('btn-close-players-modal-bottom').addEventListener('click', closeModal);

        // Click fuori dal modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Filtri per ruolo
        const filterButtons = modal.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => {
                    b.classList.remove('bg-cyan-600', 'font-bold');
                    b.classList.add('bg-gray-600');
                });
                btn.classList.remove('bg-gray-600');
                btn.classList.add('bg-cyan-600', 'font-bold');

                const filter = btn.dataset.filter;
                const playerCards = modal.querySelectorAll('.player-card');
                let visibleCount = 0;

                playerCards.forEach(card => {
                    if (filter === 'all' || card.dataset.role === filter) {
                        card.classList.remove('hidden');
                        visibleCount++;
                    } else {
                        card.classList.add('hidden');
                    }
                });

                document.getElementById('players-count').textContent = `Visibili: ${visibleCount} / ${players.length} giocatori`;
            });
        });

        // Azioni sui giocatori (Modifica/Elimina)
        const playersList = document.getElementById('modal-players-list');
        playersList.addEventListener('click', (e) => {
            const target = e.target;
            const playerId = target.dataset.playerId;

            if (target.dataset.action === 'edit' && onEdit) {
                onEdit(playerId, type);
            } else if (target.dataset.action === 'delete') {
                if (target.textContent === 'Elimina') {
                    target.textContent = 'CONFERMA?';
                    target.classList.remove('bg-red-600');
                    target.classList.add('bg-orange-500');
                } else if (target.textContent === 'CONFERMA?') {
                    target.textContent = '...';
                    target.disabled = true;
                    if (onDelete) onDelete(playerId, type, target);
                }
            }
        });

        return modal;
    },

    /**
     * Renderizza la lista dei giocatori per il modal
     */
    renderPlayersList(players, isDraft) {
        if (!players || players.length === 0) {
            return '<p class="text-center text-gray-400 py-8">Nessun giocatore disponibile.</p>';
        }

        return `
            <div class="grid gap-3">
                ${players.map(player => {
                    const levelRange = player.levelRange || [player.level || 1, player.level || 1];
                    const abilitiesList = player.abilities && player.abilities.length > 0 ? player.abilities.join(', ') : 'Nessuna';
                    const status = player.isDrafted
                        ? `<span class="text-red-400">Venduto a ${player.teamId}</span>`
                        : `<span class="text-green-400">Disponibile</span>`;
                    const bgClass = player.isDrafted ? 'bg-red-900/30' : 'bg-gray-700';
                    const flag = window.AdminPlayers?.getFlag(player.nationality) || '';

                    // Usa escapeHtml per prevenire XSS
                    const safeName = window.escapeHtml ? window.escapeHtml(player.name) : player.name;
                    return `
                        <div class="player-card ${bgClass} p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition" data-role="${player.role}" data-player-id="${player.id}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-lg font-bold text-white">${flag} ${safeName}</span>
                                        <span class="px-2 py-0.5 rounded text-xs font-bold ${this.getRoleBadgeClass(player.role)}">${player.role}</span>
                                        <span class="px-2 py-0.5 rounded text-xs bg-gray-600 text-gray-300">${player.type || 'N/A'}</span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-x-4 text-sm text-gray-400">
                                        <p>Livello: <span class="text-yellow-400 font-semibold">${levelRange[0]}-${levelRange[1]}</span></p>
                                        <p>Costo: <span class="text-green-400 font-semibold">${window.AdminPlayers?.formatCost(player) || player.cost + ' CS'}</span></p>
                                        <p>Eta: <span class="text-white">${player.age || 'N/A'}</span></p>
                                        <p>${status}</p>
                                    </div>
                                    <p class="text-xs text-yellow-300 mt-1">Abilita: ${abilitiesList}</p>
                                </div>
                                <div class="flex flex-col gap-2 ml-4">
                                    <button data-player-id="${player.id}" data-action="edit"
                                            class="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-500 transition font-semibold">
                                        ✏️ Modifica
                                    </button>
                                    <button data-player-id="${player.id}" data-action="delete"
                                            class="bg-red-600 text-white text-sm px-3 py-1.5 rounded hover:bg-red-500 transition font-semibold">
                                        Elimina
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    /**
     * Ottiene la classe CSS per il badge del ruolo
     */
    getRoleBadgeClass(role) {
        const classes = {
            'P': 'bg-orange-600 text-white',
            'D': 'bg-blue-600 text-white',
            'C': 'bg-green-600 text-white',
            'A': 'bg-red-600 text-white'
        };
        return classes[role] || 'bg-gray-600 text-white';
    },

    /**
     * Renderizza il modal per la modifica di un giocatore
     */
    renderEditPlayerModal(player, type, onSave, onClose) {
        const isDraft = type === 'draft';
        // Escape player.name per prevenire XSS
        const safeName = window.escapeHtml ? window.escapeHtml(player.name) : player.name;
        const safeNameAttr = safeName.replace(/"/g, '&quot;'); // Extra escape per attributi
        const title = `Modifica: ${safeName}`;
        const borderColor = isDraft ? 'border-yellow-500' : 'border-blue-500';

        const nationalities = window.DraftConstants?.NATIONALITIES || [];
        const types = ['Potenza', 'Tecnica', 'Velocita'];
        const roles = ['P', 'D', 'C', 'A'];

        const modalHtml = `
            <div id="edit-player-modal" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]">
                <div class="bg-gray-900 rounded-lg w-full max-w-2xl mx-4 border-2 ${borderColor}">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-lg flex items-center justify-between">
                        <h2 class="text-xl font-bold text-white">✏️ ${title}</h2>
                        <button id="btn-close-edit-modal" class="text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
                    </div>

                    <!-- Form -->
                    <div class="p-6 space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">Nome</label>
                                <input type="text" id="edit-player-name" value="${safeNameAttr}"
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">Nazionalita</label>
                                <select id="edit-player-nationality" class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
                                    ${nationalities.map(n => `<option value="${n.code}" ${n.code === player.nationality ? 'selected' : ''}>${n.flag} ${n.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">Ruolo</label>
                                <select id="edit-player-role" class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
                                    ${roles.map(r => `<option value="${r}" ${r === player.role ? 'selected' : ''}>${r}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">Tipo</label>
                                <select id="edit-player-type" class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
                                    ${types.map(t => `<option value="${t}" ${t === player.type ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">Eta</label>
                                <input type="number" id="edit-player-age" value="${player.age || 25}" min="15" max="50"
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">Livello Min</label>
                                <input type="number" id="edit-player-level-min" value="${player.levelRange?.[0] || player.level || 1}" min="1" max="30"
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">Livello Max</label>
                                <input type="number" id="edit-player-level-max" value="${player.levelRange?.[1] || player.level || 1}" min="1" max="30"
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">Costo Calcolato</label>
                                <input type="text" id="edit-player-cost-display" value="--" readonly disabled
                                       class="w-full p-2 rounded bg-gray-600 border border-gray-500 text-yellow-400 font-bold">
                            </div>
                        </div>

                        <!-- EXP e Contratto -->
                        <div class="grid grid-cols-3 gap-4">
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">EXP Attuale</label>
                                <input type="number" id="edit-player-exp" value="${player.exp || 0}" min="0"
                                       class="w-full p-2 rounded bg-gray-700 border border-purple-600 text-purple-300">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">EXP per Prossimo Lv</label>
                                <input type="number" id="edit-player-exp-next" value="${player.expToNextLevel || 100}" min="1" readonly disabled
                                       class="w-full p-2 rounded bg-gray-600 border border-gray-500 text-gray-400">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 font-semibold">📝 Contratto (anni)</label>
                                <input type="number" id="edit-player-contract" value="${player.contract || 1}" min="0" max="${window.Contracts?.MAX_CONTRACT_YEARS || 5}"
                                       class="w-full p-2 rounded bg-gray-700 border border-blue-600 text-blue-300">
                            </div>
                        </div>

                        <!-- Abilita attuali -->
                        <div>
                            <label class="block text-gray-300 mb-2 font-semibold">Abilita attuali</label>
                            <div class="flex flex-wrap gap-2" id="edit-current-abilities">
                                ${(player.abilities || []).length > 0 ? (player.abilities || []).map(ab => `
                                    <span class="px-2 py-1 bg-yellow-600 text-white rounded text-sm flex items-center gap-1">
                                        ${ab}
                                        <button data-ability="${ab}" class="remove-ability text-white hover:text-red-300 font-bold">&times;</button>
                                    </span>
                                `).join('') : '<span class="text-gray-500 no-abilities-msg">Nessuna abilita</span>'}
                            </div>
                        </div>

                        <!-- Aggiungi Abilita -->
                        <div>
                            <label class="block text-gray-300 mb-2 font-semibold">Aggiungi Abilita</label>
                            <div class="flex gap-2">
                                <select id="edit-add-ability-select" class="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white">
                                    <option value="">-- Seleziona abilita --</option>
                                </select>
                                <button id="btn-add-ability" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 transition font-semibold">
                                    + Aggiungi
                                </button>
                            </div>
                            <p class="text-xs text-gray-400 mt-1">Max 3 abilita positive + 2 negative</p>
                        </div>

                        <p id="edit-player-message" class="text-center text-sm"></p>
                    </div>

                    <!-- Footer -->
                    <div class="p-4 bg-gray-800 border-t border-gray-700 rounded-b-lg flex justify-end gap-4">
                        <button id="btn-cancel-edit" class="bg-gray-600 text-white font-bold py-2 px-6 rounded hover:bg-gray-500 transition">
                            Annulla
                        </button>
                        <button id="btn-save-edit" class="bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-500 transition">
                            💾 Salva Modifiche
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);

        const modal = document.getElementById('edit-player-modal');
        let currentAbilities = [...(player.abilities || [])];

        // Lista abilita negative
        const negativeAbilities = window.AdminPlayers?.NEGATIVE_ABILITIES || [
            'Mani di burro', 'Respinta Timida', 'Fuori dai pali', 'Lento a carburare', 'Soggetto a infortuni',
            'Falloso', 'Insicuro', 'Fuori Posizione',
            'Egoista', 'Impreciso', 'Ingabbiato',
            'Piedi a banana', 'Eccesso di sicurezza',
            'Fragile', 'Non Adattabile', 'Titubanza'
        ];

        // Funzione per verificare se un'abilita e' negativa
        const isNegative = (abilityName) => negativeAbilities.includes(abilityName);

        // Funzione per contare abilita positive e negative
        const countAbilities = () => {
            let positive = 0;
            let negative = 0;
            currentAbilities.forEach(ab => {
                if (isNegative(ab)) negative++;
                else positive++;
            });
            return { positive, negative };
        };

        // Funzione per aggiornare il dropdown delle abilita disponibili
        const updateAbilityDropdown = () => {
            const role = document.getElementById('edit-player-role').value;
            const select = document.getElementById('edit-add-ability-select');
            if (!select) return;

            const roleAbilities = window.AdminPlayers?.ROLE_ABILITIES_SEPARATED?.[role] || { positive: [], negative: [] };
            const allRoleAbilities = [...(roleAbilities.positive || []), ...(roleAbilities.negative || [])];

            // Filtra le abilita gia presenti
            const availableAbilities = allRoleAbilities.filter(ab => !currentAbilities.includes(ab));

            // Raggruppa per tipo
            const availablePositive = availableAbilities.filter(ab => !isNegative(ab));
            const availableNegative = availableAbilities.filter(ab => isNegative(ab));

            let optionsHtml = '<option value="">-- Seleziona abilita --</option>';

            if (availablePositive.length > 0) {
                optionsHtml += '<optgroup label="Abilita Positive">';
                availablePositive.forEach(ab => {
                    const rarity = window.AdminPlayers?.getAbilityRarity?.(ab) || 'Comune';
                    optionsHtml += `<option value="${ab}">${ab} (${rarity})</option>`;
                });
                optionsHtml += '</optgroup>';
            }

            if (availableNegative.length > 0) {
                optionsHtml += '<optgroup label="Abilita Negative">';
                availableNegative.forEach(ab => {
                    optionsHtml += `<option value="${ab}">${ab}</option>`;
                });
                optionsHtml += '</optgroup>';
            }

            select.innerHTML = optionsHtml;
        };

        // Funzione per aggiornare la visualizzazione delle abilita correnti
        const updateCurrentAbilitiesDisplay = () => {
            const container = document.getElementById('edit-current-abilities');
            if (!container) return;

            if (currentAbilities.length === 0) {
                container.innerHTML = '<span class="text-gray-500 no-abilities-msg">Nessuna abilita</span>';
            } else {
                container.innerHTML = currentAbilities.map(ab => {
                    const bgColor = isNegative(ab) ? 'bg-red-600' : 'bg-yellow-600';
                    return `
                        <span class="px-2 py-1 ${bgColor} text-white rounded text-sm flex items-center gap-1">
                            ${ab}
                            <button data-ability="${ab}" class="remove-ability text-white hover:text-red-300 font-bold">&times;</button>
                        </span>
                    `;
                }).join('');
            }
        };

        // Aggiorna costo display
        const updateCostDisplay = () => {
            const levelMin = parseInt(document.getElementById('edit-player-level-min').value) || 1;
            const levelMax = parseInt(document.getElementById('edit-player-level-max').value) || 1;
            const costMin = window.AdminPlayers?.calculateCost(levelMin, currentAbilities) || 0;
            const costMax = window.AdminPlayers?.calculateCost(levelMax, currentAbilities) || 0;
            const costDisplay = document.getElementById('edit-player-cost-display');
            if (costDisplay) {
                costDisplay.value = costMin === costMax ? `${costMin} CS` : `${costMin} - ${costMax} CS`;
            }
        };

        // Event listeners per aggiornare il costo
        document.getElementById('edit-player-level-min').addEventListener('input', updateCostDisplay);
        document.getElementById('edit-player-level-max').addEventListener('input', updateCostDisplay);

        // Aggiorna dropdown quando cambia il ruolo
        document.getElementById('edit-player-role').addEventListener('change', updateAbilityDropdown);

        // Aggiunta abilita
        document.getElementById('btn-add-ability').addEventListener('click', () => {
            const select = document.getElementById('edit-add-ability-select');
            const selectedAbility = select.value;
            const msgEl = document.getElementById('edit-player-message');

            if (!selectedAbility) {
                if (msgEl) {
                    msgEl.textContent = 'Seleziona un\'abilita da aggiungere';
                    msgEl.className = 'text-center text-sm text-yellow-400';
                    setTimeout(() => { msgEl.textContent = ''; }, 2000);
                }
                return;
            }

            const counts = countAbilities();
            const isNeg = isNegative(selectedAbility);

            // Controlla i limiti
            if (!isNeg && counts.positive >= 3) {
                if (msgEl) {
                    msgEl.textContent = 'Massimo 3 abilita positive!';
                    msgEl.className = 'text-center text-sm text-red-400';
                    setTimeout(() => { msgEl.textContent = ''; }, 2000);
                }
                return;
            }

            if (isNeg && counts.negative >= 2) {
                if (msgEl) {
                    msgEl.textContent = 'Massimo 2 abilita negative!';
                    msgEl.className = 'text-center text-sm text-red-400';
                    setTimeout(() => { msgEl.textContent = ''; }, 2000);
                }
                return;
            }

            // Aggiungi l'abilita
            currentAbilities.push(selectedAbility);
            updateCurrentAbilitiesDisplay();
            updateAbilityDropdown();
            updateCostDisplay();

            if (msgEl) {
                msgEl.textContent = `Abilita "${selectedAbility}" aggiunta!`;
                msgEl.className = 'text-center text-sm text-green-400';
                setTimeout(() => { msgEl.textContent = ''; }, 2000);
            }
        });

        // Rimozione abilita
        document.getElementById('edit-current-abilities').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-ability')) {
                const abilityToRemove = e.target.dataset.ability;
                currentAbilities = currentAbilities.filter(a => a !== abilityToRemove);
                updateCurrentAbilitiesDisplay();
                updateAbilityDropdown();
                updateCostDisplay();
            }
        });

        // Inizializza
        updateAbilityDropdown();
        updateCurrentAbilitiesDisplay();
        updateCostDisplay();

        const closeModal = () => {
            modal.remove();
            if (onClose) onClose();
        };

        document.getElementById('btn-close-edit-modal').addEventListener('click', closeModal);
        document.getElementById('btn-cancel-edit').addEventListener('click', closeModal);

        document.getElementById('btn-save-edit').addEventListener('click', () => {
            const updatedData = {
                name: document.getElementById('edit-player-name').value.trim(),
                nationality: document.getElementById('edit-player-nationality').value,
                role: document.getElementById('edit-player-role').value,
                type: document.getElementById('edit-player-type').value,
                age: parseInt(document.getElementById('edit-player-age').value),
                levelRange: [
                    parseInt(document.getElementById('edit-player-level-min').value),
                    parseInt(document.getElementById('edit-player-level-max').value)
                ],
                abilities: currentAbilities,
                exp: parseInt(document.getElementById('edit-player-exp').value) || 0,
                contract: parseInt(document.getElementById('edit-player-contract').value) || 1
            };

            // Calcola nuovo costo
            const costMin = window.AdminPlayers?.calculateCost(updatedData.levelRange[0], currentAbilities) || 100;
            const costMax = window.AdminPlayers?.calculateCost(updatedData.levelRange[1], currentAbilities) || 100;
            updatedData.cost = costMax;
            updatedData.costRange = [costMin, costMax];

            if (onSave) onSave(player.id, updatedData, type, closeModal);
        });

        return modal;
    },

    /**
     * Renderizza il pannello gestione squadre
     */
    renderTeamManagementPanel(teamManagementToolsContainer) {
        teamManagementToolsContainer.innerHTML = `
            <h3 class="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2 pt-4">Elenco Squadre Registrate</h3>
            <p class="text-xs text-gray-400 mb-4">Modifica budget, password o livello allenatore delle squadre.</p>

            <div class="grid grid-cols-2 gap-4 mb-4">
                 <button id="btn-mock-action"
                        class="w-full bg-red-700 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-600 transition duration-150">
                    Azione Mock
                </button>

                 <button id="btn-refresh-teams-management"
                        class="w-full bg-gray-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-gray-400 transition duration-150">
                    Ricarica Lista Squadre
                </button>
            </div>

            <!-- Box scrollabile per squadre (max 8 visibili) -->
            <div class="bg-gray-900 rounded-lg border border-gray-600 p-4 mb-4">
                <div id="teams-list-container-management" class="space-y-3 max-h-[640px] overflow-y-auto pr-2">
                    <p class="text-gray-400 text-center">Caricamento in corso...</p>
                </div>
            </div>

            <!-- Strumenti di Riparazione di Massa -->
            <div class="bg-gray-800 rounded-lg border border-orange-500 p-4 mb-4">
                <h4 class="text-lg font-bold text-orange-400 mb-3">🔧 Strumenti di Riparazione</h4>
                <p class="text-xs text-gray-400 mb-3">Correggi automaticamente i livelli e l'esperienza di tutti i giocatori.</p>
                <p id="fix-all-levels-message" class="text-center text-sm mb-3"></p>
                <div class="grid grid-cols-3 gap-3 mb-3">
                    <button id="btn-fix-all-teams-levels"
                            class="bg-orange-600 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-orange-500 transition duration-150">
                        🔧 Fix Livelli
                    </button>
                    <button id="btn-repair-all-exp"
                            class="bg-purple-600 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150"
                            title="Applica level-up pendenti e normalizza EXP">
                        📊 Repair EXP
                    </button>
                    <button id="btn-reset-all-players-exp"
                            class="bg-yellow-600 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-yellow-500 transition duration-150">
                        🔄 Reset XP
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button id="btn-fix-icone-abilities"
                            class="bg-cyan-600 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-cyan-500 transition duration-150"
                            title="Corregge le abilita mancanti delle Icone (es. Tiro Dritto per Amedemo)">
                        ⚡ Fix Abilita Icone
                    </button>
                    <button id="btn-reset-advanced-stats"
                            class="bg-red-600 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-red-500 transition duration-150"
                            title="Cancella tutte le statistiche avanzate (goal, assist, contrasti, parate) per ricominciare">
                        🗑️ Reset Statistiche Avanzate
                    </button>
                </div>
            </div>

            <!-- Bottoni Assegna CS/CSS a squadra singola -->
            <div class="bg-gray-800 rounded-lg border border-green-500 p-4 mb-4">
                <h4 class="text-lg font-bold text-green-400 mb-3">Assegnazione Crediti Singola Squadra</h4>
                <p id="single-assign-message" class="text-center text-sm mb-3"></p>
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-assign-cs-single"
                            class="w-full bg-blue-700 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-blue-600 transition duration-150">
                        💰 Assegna CS a Squadra
                    </button>
                    <button id="btn-assign-css-single"
                            class="w-full bg-amber-700 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-amber-600 transition duration-150">
                        ⭐ Assegna CSS a Squadra
                    </button>
                </div>
            </div>

            <!-- Bottoni Assegna CS/CSS a tutte le squadre -->
            <div class="bg-gray-800 rounded-lg border border-yellow-500 p-4">
                <h4 class="text-lg font-bold text-yellow-400 mb-3">Assegnazione Crediti di Massa</h4>
                <p id="mass-assign-message" class="text-center text-sm mb-3"></p>
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-assign-cs-all"
                            class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-blue-500 transition duration-150">
                        💰 Assegna CS a Tutte
                    </button>
                    <button id="btn-assign-css-all"
                            class="w-full bg-amber-600 text-white font-bold py-3 rounded-lg shadow-xl hover:bg-amber-500 transition duration-150">
                        ⭐ Assegna CSS a Tutte
                    </button>
                </div>
            </div>

            <!-- Modal Assegna Crediti a Squadra Singola -->
            <div id="assign-credits-single-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border-2 border-green-500">
                    <h3 id="assign-credits-single-title" class="text-xl font-bold text-green-400 mb-4">Assegna Crediti</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-300 mb-2">Seleziona Squadra</label>
                            <select id="assign-credits-team-select" class="w-full bg-gray-800 text-white p-2 rounded border border-gray-600">
                                <option value="">Seleziona squadra...</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-gray-300 mb-2">Quantita</label>
                            <input type="number" id="assign-credits-amount" min="1" value="100" class="w-full bg-gray-800 text-white p-2 rounded border border-gray-600">
                        </div>
                    </div>
                    <div class="flex gap-4 mt-6">
                        <button id="btn-confirm-assign-single" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg">
                            Conferma
                        </button>
                        <button id="btn-cancel-assign-single" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded-lg">
                            Annulla
                        </button>
                    </div>
                    <p id="assign-single-error" class="text-center mt-3 text-sm text-red-400"></p>
                </div>
            </div>
        `;
    }
};
