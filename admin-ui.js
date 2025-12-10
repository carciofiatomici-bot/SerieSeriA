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

        adminDashboardContainer.innerHTML = `
            <!-- SEZIONE AUTOMAZIONE SIMULAZIONI -->
            <h3 class="text-2xl font-bold text-teal-400 mb-4 border-b border-gray-600 pb-2">Automazione Simulazioni</h3>
            <div id="automation-admin-section" class="p-4 bg-gray-800 rounded-lg border border-teal-500 mb-6">
                <p class="text-gray-400 text-sm mb-3">Simula automaticamente partite di Campionato e Coppa alle 20:30 in alternanza</p>
                <div id="automation-status-container">
                    <p class="text-gray-400 text-center text-sm">Caricamento stato automazione...</p>
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

            <!-- SEZIONE SERIESERIA -->
            <h3 class="text-2xl font-bold text-green-400 mb-4 border-b border-gray-600 pb-2 pt-6">🏆 SerieSeriA</h3>
            <div id="serieseria-admin-section" class="p-4 bg-gray-800 rounded-lg border border-green-500 mb-6">
                <p class="text-gray-400 text-sm mb-3">Gestisci il campionato principale</p>
                <div class="grid grid-cols-3 gap-4">
                    <button id="btn-admin-leaderboard"
                            class="bg-green-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-500 transition duration-150">
                        <i class="fas fa-chart-bar mr-2"></i> Classifica
                    </button>
                    <button id="btn-admin-schedule"
                            class="bg-green-700 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-600 transition duration-150">
                        <i class="fas fa-calendar-alt mr-2"></i> Calendario
                    </button>
                    <button id="btn-generate-championship-schedule"
                            class="bg-green-800 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-700 transition duration-150">
                        <i class="fas fa-plus-circle mr-2"></i> Genera Calendario
                    </button>
                </div>
                <div id="serieseria-status-container" class="mt-4">
                    <p class="text-gray-400 text-center text-sm">Caricamento stato campionato...</p>
                </div>
            </div>

            <!-- SEZIONE COPPA SERIA -->
            <h3 class="text-2xl font-bold text-purple-400 mb-4 border-b border-gray-600 pb-2 pt-6">CoppaSeriA</h3>
            <div id="coppa-admin-section" class="p-4 bg-gray-800 rounded-lg border border-purple-500 mb-6">
                <p class="text-gray-400 text-sm mb-3">Gestisci il torneo a eliminazione diretta</p>
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-generate-cup-schedule"
                            class="bg-purple-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150">
                        <i class="fas fa-trophy mr-2"></i> Genera Calendario Coppa
                    </button>
                    <button id="btn-view-cup-bracket"
                            class="bg-purple-800 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-700 transition duration-150">
                        <i class="fas fa-sitemap mr-2"></i> Visualizza Tabellone
                    </button>
                </div>
                <div id="coppa-status-container" class="mt-4">
                    <p class="text-gray-400 text-center text-sm">Caricamento stato coppa...</p>
                </div>
            </div>

            <!-- SEZIONE SUPERCOPPA -->
            <h3 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-600 pb-2 pt-6">Supercoppa</h3>
            <div id="supercoppa-admin-section" class="p-4 bg-gray-800 rounded-lg border border-yellow-500 mb-6">
                <p class="text-gray-400 text-sm mb-3">Campione vs Vincitore Coppa (o 2° classificato)</p>
                <!-- Il contenuto viene renderizzato da Supercoppa.renderAdminUI() -->
            </div>

            <!-- UTILITA ADMIN -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2 pt-6">Utilita Admin</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
                 <button id="btn-sync-data"
                        class="bg-red-700 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-600 transition duration-150">
                    Sincronizza Dati Calciatori (Mock)
                </button>
                <button id="btn-test-simulation"
                        class="bg-blue-700 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-blue-600 transition duration-150">
                    🧪 Test Simulazione Partita
                </button>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-6">
                <button id="btn-fix-icone-ability"
                        class="bg-yellow-700 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-yellow-600 transition duration-150">
                    👑 Fix Abilita Icone
                </button>
                <div id="fix-icone-result" class="flex items-center justify-center text-sm text-gray-400">
                    Assegna abilita "Icona" a tutte le Icone
                </div>
            </div>
            <div class="text-gray-400 text-sm mb-6">
                Squadre partecipanti: <span class="font-bold text-green-400 ml-1">${participatingTeamsCount}</span>
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
                            <button id="btn-toggle-simple-log" class="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 rounded-lg">
                                Log Ristretto
                            </button>
                            <button id="btn-toggle-detailed-log" class="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 rounded-lg">
                                Log Dettagliato
                            </button>
                        </div>
                        <div id="test-simulation-simple-log" class="hidden mt-4 bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto">
                            <h5 class="text-sm font-bold text-blue-400 mb-2">Log Ristretto</h5>
                            <pre id="test-simulation-simple-log-content" class="text-xs text-gray-300 whitespace-pre-wrap font-mono"></pre>
                        </div>
                        <div id="test-simulation-detailed-log" class="hidden mt-4 bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto">
                            <h5 class="text-sm font-bold text-purple-400 mb-2">Log Dettagliato</h5>
                            <pre id="test-simulation-detailed-log-content" class="text-xs text-gray-300 whitespace-pre-wrap font-mono"></pre>
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

            <!-- CONTROLLO STATI -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2">Controllo Stato Mercato & Draft</h3>
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="p-4 rounded-lg border ${draftOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span class="font-bold text-lg text-white block mb-2">Stato Draft: <span id="draft-status-text" class="font-extrabold">${draftOpen ? 'APERTO' : 'CHIUSO'}</span></span>
                    <button id="btn-toggle-draft"
                            data-type="draft"
                            data-is-open="${draftOpen}"
                            class="w-full px-4 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${draftOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                        ${draftOpen ? 'CHIUDI Draft' : 'APRI Draft'}
                    </button>
                </div>

                <div class="p-4 rounded-lg border ${marketOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span class="font-bold text-lg text-white block mb-2">Stato Mercato: <span id="market-status-text" class="font-extrabold">${marketOpen ? 'APERTO' : 'CHIUSO'}</span></span>
                    <button id="btn-toggle-market"
                            data-type="market"
                            data-is-open="${marketOpen}"
                            class="w-full px-4 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${marketOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                        ${marketOpen ? 'CHIUDI Mercato' : 'APRI Mercato'}
                    </button>
                </div>
            </div>
            <p id="toggle-status-message" class="text-center mt-3 mb-6 text-red-400"></p>

            <!-- GESTIONE DRAFT A TURNI -->
            <div class="p-4 bg-gray-700 rounded-lg border border-purple-500 mb-6">
                <h4 class="text-lg font-bold text-purple-300 mb-3">Draft a Turni</h4>
                <p class="text-sm text-gray-300 mb-3">Genera la lista del draft per permettere alle squadre di draftare a turno. L'ordine viene calcolato in base alla classifica (o media rosa se non c'e' classifica).</p>
                <div id="draft-turns-status-container" class="mb-3"></div>
                <button id="btn-generate-draft-list"
                        class="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-500 transition">
                    Genera Lista Draft
                </button>
                <button id="btn-stop-draft-turns"
                        class="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500 transition mt-2 hidden">
                    Ferma Draft a Turni
                </button>
            </div>

            <!-- CREAZIONE CALCIATORE -->
            <h3 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-600 pb-2 pt-4">Crea Nuovo Calciatore</h3>
            <div class="p-6 bg-gray-700 rounded-lg space-y-4 mb-6">

                 <div class="flex flex-col">
                     <label class="text-gray-300 mb-1 font-semibold" for="target-collection">Destinazione Giocatore</label>
                     <select id="target-collection"
                             class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white focus:ring-yellow-400">
                         <option value="draft">Draft (Selezione a Turni)</option>
                         <option value="market">Mercato (Acquisto Libero)</option>
                     </select>
                     <p class="text-xs text-gray-400 mt-1">Scegli dove aggiungere il giocatore.</p>
                 </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-name">Nome</label>
                        <input type="text" id="player-name" placeholder="Es: Barella" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>

                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-nationality">Nazionalita</label>
                        <select id="player-nationality" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                            <option value="">Seleziona Nazionalita</option>
                            ${window.DraftConstants?.NATIONALITIES?.map(n => `<option value="${n.code}">${n.flag} ${n.name}</option>`).join('') || ''}
                        </select>
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
                        <label class="text-gray-300 mb-1" for="player-age">Eta (15 - 50)</label>
                        <input type="number" id="player-age" min="15" max="50" placeholder="25" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>

                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-min">Liv Minimo (1 - 20)</label>
                        <input type="number" id="player-level-min" min="1" max="20" placeholder="10" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>

                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-max">Liv Massimo (1 - 20)</label>
                        <input type="number" id="player-level-max" min="1" max="20" placeholder="18" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>

                    <div class="flex flex-col lg:col-span-2">
                        <label class="text-gray-300 mb-1" for="player-cost-display">Costo Calcolato (CS)</label>
                        <input type="text" id="player-cost-display" value="Costo: 100 CS" readonly disabled
                               class="p-2 rounded-lg bg-gray-500 border border-yellow-400 text-white font-extrabold text-center cursor-default">
                    </div>
                </div>

                <div class="flex flex-col lg:col-span-4 border border-gray-600 p-4 rounded-lg bg-gray-800">
                    <label class="text-gray-300 mb-2 font-semibold text-lg">Abilita (Max 3)</label>
                    <div id="abilities-checklist" class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <p class="text-yellow-400 col-span-4" id="abilities-placeholder">Seleziona un ruolo per visualizzare le abilita disponibili.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-random-player"
                            class="bg-purple-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150">
                        Crea Giocatore Casuale
                    </button>
                    <button id="btn-create-player"
                            class="bg-green-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-400 transition duration-150">
                        Aggiungi Calciatore
                    </button>
                </div>

                <p id="player-creation-message" class="text-center mt-3 text-red-400"></p>
            </div>

            <!-- LISTE GIOCATORI -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2 pt-6">Elenco Giocatori (Draft & Mercato)</h3>

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
                    <h4 class="text-xl font-bold text-yellow-400 mb-3">Giocatori Draft</h4>
                    <div id="draft-players-list" class="space-y-3 max-h-96 overflow-y-auto" data-collection="draft">
                         <p class="text-gray-500 text-center">Caricamento Draft...</p>
                    </div>
                </div>

                <div class="p-4 bg-gray-700 rounded-lg border border-blue-500">
                    <h4 class="text-xl font-bold text-blue-400 mb-3">Giocatori Mercato</h4>
                    <div id="market-players-list" class="space-y-3 max-h-96 overflow-y-auto" data-collection="market">
                         <p class="text-gray-500 text-center">Caricamento Mercato...</p>
                    </div>
                </div>
            </div>
        `;
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

            <div id="teams-list-container-management" class="space-y-3">
                <p class="text-gray-400 text-center">Caricamento in corso...</p>
            </div>
        `;
    }
};
