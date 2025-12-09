//
// ====================================================================
// DRAFT-ADMIN-UI.JS - Rendering Pannello Admin Draft
// ====================================================================
//

window.DraftAdminUI = {

    /**
     * Renderizza il pannello Admin del Draft
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    async render(context) {
        const { draftToolsContainer, draftBackButton, adminContent, db, firestoreTools, paths } = context;
        const { TYPES } = window.DraftConstants;
        const { displayMessage } = window.DraftUtils;

        draftBackButton.textContent = "Torna al Pannello Admin";
        draftBackButton.onclick = () => window.showScreen(adminContent);

        // Inizializzazione per la gestione dello stato Draft
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, paths.CHAMPIONSHIP_CONFIG_PATH, window.DraftConstants.CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        let draftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;

        // Interfaccia Creazione Calciatore con il pulsante Toggle
        draftToolsContainer.innerHTML = `
            <div class="p-6 bg-gray-800 rounded-lg border border-yellow-600 shadow-inner-lg space-y-8">

                <!-- SEZIONE 1: GESTIONE STATO DRAFT -->
                <h3 class="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2">Stato Mercato/Draft</h3>
                <div class="flex items-center justify-between p-4 rounded-lg border ${draftOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span id="draft-status-text" class="font-extrabold text-xl">${draftOpen ? 'DRAFT APERTO' : 'DRAFT CHIUSO'}</span>
                    <button id="btn-toggle-draft"
                            data-is-open="${draftOpen}"
                            class="px-4 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${draftOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                        ${draftOpen ? 'CHIUDI Draft' : 'APRI Draft'}
                    </button>
                </div>
                <p id="draft-toggle-message" class="text-center mt-3 text-red-400"></p>


                <!-- SEZIONE 2: CREAZIONE CALCIATORE -->
                <h3 class="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2 pt-4">Crea Nuovo Calciatore</h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Nome -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-name">Nome</label>
                        <input type="text" id="player-name" placeholder="Es: Barella"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Ruolo -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-role">Ruolo</label>
                        <select id="player-role"
                                class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                            <option value="">Seleziona Ruolo</option>
                            <option value="P">P (Portiere)</option>
                            <option value="D">D (Difensore)</option>
                            <option value="C">C (Centrocampista)</option>
                            <option value="A">A (Attaccante)</option>
                        </select>
                    </div>

                    <!-- Tipologia (Type) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-type">Tipologia (Type)</label>
                        <select id="player-type"
                                class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                            <option value="">Seleziona Tipo</option>
                            ${TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Età (Range 15-50) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-age">Età (15 - 50)</label>
                        <input type="number" id="player-age" min="15" max="50" placeholder="25"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Liv Minimo (Range 1-20) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-min">Liv Minimo (1 - 20)</label>
                        <input type="number" id="player-level-min" min="1" max="20" placeholder="10"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Liv Massimo (Range 1-20) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-max">Liv Massimo (1 - 20)</label>
                        <input type="number" id="player-level-max" min="1" max="20" placeholder="18"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Costo -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-cost">Costo (Crediti Seri)</label>
                        <input type="number" id="player-cost" min="1" placeholder="50"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>
                </div>

                <!-- Pulsanti Azioni -->
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-random-player"
                            class="bg-purple-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150 transform hover:scale-[1.01] mt-4">
                        Crea Giocatore Casuale
                    </button>
                    <button id="btn-create-player"
                            class="bg-green-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-400 transition duration-150 transform hover:scale-[1.01] mt-4">
                        Aggiungi Calciatore al Draft
                    </button>
                </div>

                <p id="player-creation-message" class="text-center mt-3 text-red-400"></p>

                <!-- SEZIONE 3: LISTA CALCIATORI ESISTENTI -->
                <h3 class="text-xl font-bold text-gray-400 border-b border-gray-700 pb-2 mt-8 pt-4">Calciatori Disponibili nel Draft</h3>
                <div id="draft-players-list" class="mt-4 space-y-3">
                     <p class="text-gray-500 text-center">Caricamento in corso...</p>
                </div>

            </div>
        `;

        // Collega gli event listeners
        this.attachEventListeners(context);

        // Carica la lista dei giocatori
        window.DraftAdminPlayers.loadDraftPlayers(context);
    },

    /**
     * Collega gli event listener per il pannello admin
     * @param {Object} context - Contesto con riferimenti
     */
    attachEventListeners(context) {
        document.getElementById('btn-toggle-draft').addEventListener('click', (e) => {
            window.DraftAdminPlayers.handleToggleDraft(e, context);
        });
        document.getElementById('btn-create-player').addEventListener('click', () => {
            window.DraftAdminPlayers.handleCreatePlayer(context);
        });
        document.getElementById('btn-random-player').addEventListener('click', () => {
            window.DraftAdminPlayers.handleRandomPlayer();
        });
    }
};

console.log("Modulo Draft-Admin-UI caricato.");
