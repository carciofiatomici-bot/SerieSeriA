//
// ====================================================================
// MODULO DRAFT-STATUS-BOX.JS (Box Stato Draft)
// ====================================================================
//
// Mostra quando il draft e' aperto:
// - Giocatori ancora disponibili (non draftati)
// - Ordine del draft delle squadre che non hanno ancora draftato
//

window.DraftStatusBox = {

    // Cache per i dati
    _cachedPlayers: null,
    _cachedDraftState: null,
    _configSubscriberId: null,  // ID subscriber per ConfigListener condiviso
    _lastDraftTurnsHash: null,  // Hash per rilevare cambiamenti rilevanti
    _containerId: null,         // Salva containerId per refresh

    /**
     * Inizializza il box di stato del draft nella dashboard.
     * @param {string} containerId - ID del container HTML
     */
    async init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('DraftStatusBox: Container non trovato:', containerId);
            return;
        }

        // Controlla se il draft e' aperto
        const configData = await this.loadConfig();
        if (!configData || !configData.isDraftOpen) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        // Mostra il container
        container.classList.remove('hidden');

        // Avvia il listener real-time
        this.startRealTimeListener(containerId);

        // Carica i dati iniziali
        await this.refresh(containerId);
    },

    /**
     * Carica la configurazione dal database.
     */
    async loadConfig() {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const CONFIG_PATH = `artifacts/${appId}/public/data/config`;

            const configDocRef = doc(window.db, CONFIG_PATH, 'settings');
            const configDoc = await getDoc(configDocRef);

            return configDoc.exists() ? configDoc.data() : null;
        } catch (error) {
            console.error('DraftStatusBox: Errore caricamento config:', error);
            return null;
        }
    },

    /**
     * Carica i giocatori disponibili (non draftati).
     */
    async loadAvailablePlayers() {
        try {
            const { collection, getDocs, query, where } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const DRAFT_PLAYERS_PATH = `artifacts/${appId}/public/data/draftPlayers`;

            const playersRef = collection(window.db, DRAFT_PLAYERS_PATH);
            const q = query(playersRef, where('isDrafted', '==', false));
            const snapshot = await getDocs(q);

            const players = [];
            snapshot.forEach(doc => {
                players.push({ id: doc.id, ...doc.data() });
            });

            // Ordina per ruolo e poi per nome
            const roleOrder = { 'P': 1, 'D': 2, 'C': 3, 'A': 4 };
            players.sort((a, b) => {
                const roleCompare = (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
                if (roleCompare !== 0) return roleCompare;
                return (a.name || '').localeCompare(b.name || '');
            });

            this._cachedPlayers = players;
            return players;
        } catch (error) {
            console.error('DraftStatusBox: Errore caricamento giocatori:', error);
            return [];
        }
    },

    /**
     * Genera un hash dei dati rilevanti del draft per rilevare cambiamenti.
     * Ricarica i giocatori SOLO quando cambiano: round, turno, o lista hasDrafted.
     */
    _getDraftTurnsHash(data) {
        if (!data || !data.draftTurns) return 'no-draft';

        const dt = data.draftTurns;
        // Crea hash con: round corrente, team corrente, e stato hasDrafted di ogni team
        const round1Drafted = (dt.round1Order || []).map(t => `${t.teamId}:${t.hasDrafted}`).join(',');
        const round2Drafted = (dt.round2Order || []).map(t => `${t.teamId}:${t.hasDrafted}`).join(',');

        return `${dt.isActive}-${dt.currentRound}-${dt.currentTeamId}-${round1Drafted}-${round2Drafted}`;
    },

    /**
     * Avvia il listener real-time per aggiornamenti.
     * OTTIMIZZATO: Ricarica i giocatori solo quando il draft state cambia realmente.
     */
    startRealTimeListener(containerId) {
        this.stopRealTimeListener();

        try {
            const { doc, onSnapshot } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const CONFIG_PATH = `artifacts/${appId}/public/data/config`;

            const configDocRef = doc(window.db, CONFIG_PATH, 'settings');

            this._unsubscribe = onSnapshot(configDocRef, async (snapshot) => {
                if (!snapshot.exists()) return;

                const data = snapshot.data();

                // Se il draft non e' piu' aperto, nascondi il box
                if (!data.isDraftOpen) {
                    const container = document.getElementById(containerId);
                    if (container) {
                        container.innerHTML = '';
                        container.classList.add('hidden');
                    }
                    this.stopRealTimeListener();
                    return;
                }

                // Calcola hash del draft state corrente
                const currentHash = this._getDraftTurnsHash(data);

                // Controlla se il draft state e' cambiato
                const draftStateChanged = (this._lastDraftTurnsHash !== currentHash);

                // Aggiorna cache
                this._cachedDraftState = data;
                this._lastDraftTurnsHash = currentHash;

                // OTTIMIZZAZIONE: Ricarica giocatori SOLO se il draft state e' cambiato
                // (es. qualcuno ha draftato, turno cambiato, round cambiato)
                if (draftStateChanged) {
                    console.log('[DraftStatusBox] Draft state cambiato, ricarico giocatori');
                    await this.refresh(containerId, true);  // forceReload = true
                } else {
                    // Solo aggiorna UI con dati cached (senza ricaricare giocatori)
                    console.log('[DraftStatusBox] Config aggiornato ma draft state invariato, uso cache');
                    await this.refresh(containerId, false); // forceReload = false
                }
            });

            console.log('[DraftStatusBox] Listener real-time avviato (ottimizzato)');
        } catch (error) {
            console.error('[DraftStatusBox] Errore avvio listener:', error);
        }
    },

    /**
     * Ferma il listener real-time.
     */
    stopRealTimeListener() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
    },

    /**
     * Aggiorna la UI del box.
     * @param {string} containerId - ID del container HTML
     * @param {boolean} forceReload - Se true, ricarica i giocatori da Firestore. Se false, usa cache.
     */
    async refresh(containerId, forceReload = true) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Usa config cached se disponibile
        const configData = this._cachedDraftState || await this.loadConfig();

        // OTTIMIZZAZIONE: Ricarica giocatori solo se richiesto o se cache vuota
        let players;
        if (forceReload || !this._cachedPlayers) {
            players = await this.loadAvailablePlayers();
        } else {
            players = this._cachedPlayers;
            console.log('[DraftStatusBox] Usando giocatori dalla cache');
        }

        if (!configData || !configData.isDraftOpen) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        const draftTurns = configData.draftTurns;
        const isDraftTurnsActive = draftTurns && draftTurns.isActive;

        // Ottieni l'ordine del draft
        let draftOrder = [];
        let currentRound = 1;
        let currentTeamId = null;

        if (isDraftTurnsActive) {
            currentRound = draftTurns.currentRound || 1;
            currentTeamId = draftTurns.currentTeamId;
            const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
            const order = draftTurns[orderKey] || [];

            // Filtra solo le squadre che non hanno ancora draftato
            draftOrder = order.filter(t => !t.hasDrafted);
        }

        // Render
        container.innerHTML = this.renderBox(players, draftOrder, currentRound, currentTeamId, isDraftTurnsActive);
    },

    /**
     * Renderizza il box HTML (versione completa per schermata draft).
     */
    renderBox(players, draftOrder, currentRound, currentTeamId, isDraftTurnsActive) {
        const getLogoHtml = window.getLogoHtml || (() => '');

        // Conta giocatori per ruolo
        const countByRole = {
            P: players.filter(p => p.role === 'P').length,
            D: players.filter(p => p.role === 'D').length,
            C: players.filter(p => p.role === 'C').length,
            A: players.filter(p => p.role === 'A').length
        };

        // HTML per l'ordine del draft
        let draftOrderHtml = '';
        if (isDraftTurnsActive && draftOrder.length > 0) {
            draftOrderHtml = `
                <div class="mb-4">
                    <h4 class="text-sm font-bold text-purple-300 mb-2 flex items-center">
                        <span class="mr-2">📋</span> Ordine Draft - Round ${currentRound}
                    </h4>
                    <div class="space-y-1 max-h-40 overflow-y-auto">
                        ${draftOrder.map((team, index) => {
                            const isCurrentTurn = team.teamId === currentTeamId;
                            const bgClass = isCurrentTurn ? 'bg-yellow-900 border-yellow-500' : 'bg-gray-800 border-gray-700';
                            const textClass = isCurrentTurn ? 'text-yellow-300 font-bold' : 'text-gray-300';
                            const indicator = isCurrentTurn ? '▶' : `${index + 1}.`;

                            return `
                                <div class="flex items-center px-2 py-1 rounded border ${bgClass}">
                                    <span class="w-6 text-center ${isCurrentTurn ? 'text-yellow-400' : 'text-gray-500'}">${indicator}</span>
                                    ${getLogoHtml(team.teamId)}
                                    <span class="ml-2 text-sm ${textClass}">${team.teamName}</span>
                                    ${isCurrentTurn ? '<span class="ml-auto text-xs text-yellow-400 animate-pulse">IN CORSO</span>' : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } else if (!isDraftTurnsActive) {
            draftOrderHtml = `
                <div class="mb-4 p-2 bg-gray-800 rounded border border-gray-700">
                    <p class="text-sm text-gray-400 text-center">Draft libero (senza turni)</p>
                </div>
            `;
        }

        // HTML per i giocatori disponibili
        const playersHtml = `
            <div>
                <h4 class="text-sm font-bold text-teal-300 mb-2 flex items-center">
                    <span class="mr-2">⚽</span> Giocatori Disponibili (${players.length})
                </h4>

                <!-- Contatori per ruolo -->
                <div class="grid grid-cols-4 gap-2 mb-3">
                    <div class="text-center p-2 bg-yellow-900 rounded border border-yellow-700">
                        <p class="text-lg font-bold text-yellow-400">${countByRole.P}</p>
                        <p class="text-xs text-yellow-300">Portieri</p>
                    </div>
                    <div class="text-center p-2 bg-blue-900 rounded border border-blue-700">
                        <p class="text-lg font-bold text-blue-400">${countByRole.D}</p>
                        <p class="text-xs text-blue-300">Difensori</p>
                    </div>
                    <div class="text-center p-2 bg-green-900 rounded border border-green-700">
                        <p class="text-lg font-bold text-green-400">${countByRole.C}</p>
                        <p class="text-xs text-green-300">Centrocampisti</p>
                    </div>
                    <div class="text-center p-2 bg-red-900 rounded border border-red-700">
                        <p class="text-lg font-bold text-red-400">${countByRole.A}</p>
                        <p class="text-xs text-red-300">Attaccanti</p>
                    </div>
                </div>

                <!-- Lista giocatori (collapsible) -->
                <details class="bg-gray-800 rounded border border-gray-700">
                    <summary class="cursor-pointer px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded">
                        Mostra lista completa giocatori
                    </summary>
                    <div class="max-h-48 overflow-auto p-2">
                        <table class="w-full text-xs min-w-[280px]">
                            <thead class="sticky top-0 bg-gray-900">
                                <tr>
                                    <th class="text-left py-1 px-2 text-gray-500">Nome</th>
                                    <th class="text-center py-1 px-2 text-gray-500">Ruolo</th>
                                    <th class="text-center py-1 px-2 text-gray-500">Tipo</th>
                                    <th class="text-center py-1 px-2 text-gray-500">Livello</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${players.map(p => {
                                    const levelRange = p.levelRange ? `${p.levelRange[0]}-${p.levelRange[1]}` : (p.level || '?');
                                    const roleBadge = this.getRoleBadge(p.role);
                                    const typeBadge = this.getTypeBadge(p.type);

                                    return `
                                        <tr class="border-t border-gray-700 hover:bg-gray-700">
                                            <td class="py-1 px-2 text-white">${p.name || 'N/A'}</td>
                                            <td class="py-1 px-2 text-center">${roleBadge}</td>
                                            <td class="py-1 px-2 text-center">${typeBadge}</td>
                                            <td class="py-1 px-2 text-center text-gray-400">${levelRange}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </details>
            </div>
        `;

        return `
            <div class="p-4 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-lg border-2 border-purple-500 shadow-lg">
                <h3 class="text-lg font-bold text-purple-300 mb-4 flex items-center">
                    <span class="mr-2">🎯</span> Stato Draft
                    <span class="ml-auto text-xs bg-green-600 text-white px-2 py-1 rounded-full animate-pulse">ATTIVO</span>
                </h3>

                ${draftOrderHtml}
                ${playersHtml}
            </div>
        `;
    },

    /**
     * Restituisce il badge HTML per il ruolo.
     */
    getRoleBadge(role) {
        const badges = {
            'P': '<span class="px-1 py-0.5 bg-yellow-600 text-yellow-100 rounded text-xs">P</span>',
            'D': '<span class="px-1 py-0.5 bg-blue-600 text-blue-100 rounded text-xs">D</span>',
            'C': '<span class="px-1 py-0.5 bg-green-600 text-green-100 rounded text-xs">C</span>',
            'A': '<span class="px-1 py-0.5 bg-red-600 text-red-100 rounded text-xs">A</span>'
        };
        return badges[role] || '<span class="px-1 py-0.5 bg-gray-600 text-gray-100 rounded text-xs">?</span>';
    },

    /**
     * Restituisce il badge HTML per il tipo.
     */
    getTypeBadge(type) {
        const badges = {
            'Potenza': '<span class="px-1 py-0.5 bg-orange-700 text-orange-100 rounded text-xs">POT</span>',
            'Tecnica': '<span class="px-1 py-0.5 bg-cyan-700 text-cyan-100 rounded text-xs">TEC</span>',
            'Velocita': '<span class="px-1 py-0.5 bg-lime-700 text-lime-100 rounded text-xs">VEL</span>'
        };
        return badges[type] || '<span class="px-1 py-0.5 bg-gray-700 text-gray-100 rounded text-xs">-</span>';
    },

    /**
     * Pulisce le risorse quando l'utente lascia la dashboard.
     */
    cleanup() {
        this.stopRealTimeListener();
        this._cachedPlayers = null;
        this._cachedDraftState = null;
        this._lastDraftTurnsHash = null;
    }
};

// Event delegation per il bottone "Vai al Draft"
document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-go-to-draft-from-box') {
        const draftContent = document.getElementById('draft-content');
        if (draftContent && window.showScreen) {
            // Dispatch evento per inizializzare il draft in modalita utente
            document.dispatchEvent(new CustomEvent('showDraftPanel', {
                detail: {
                    mode: 'utente',
                    teamId: window.InterfacciaCore?.currentTeamId
                }
            }));
        }
    }
});

console.log("DraftStatusBox.js caricato - Box stato draft per dashboard");
