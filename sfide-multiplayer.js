//
// ====================================================================
// SFIDE MULTIPLAYER - Sistema Sfide Tattiche Online
// ====================================================================
// Integra il minigame tattico (sfide-minigame.js) con multiplayer
// - Sfide tra utenti in tempo reale
// - Sincronizzazione stato su Firestore
// - Turni alternati con timeout
// ====================================================================
//

window.SfideMultiplayer = (function() {
    'use strict';

    // ========================================
    // CONFIGURAZIONE
    // ========================================
    const CONFIG = {
        MOVES_PER_TURN: 1,
        TURN_TIMEOUT_MS: 30000,  // 30 secondi per mossa
        CHALLENGE_EXPIRE_MS: 5 * 60 * 1000, // 5 minuti per accettare
        GOAL_LIMIT: 3,
        TEAMS_CACHE_MS: 5 * 60 * 1000, // Cache squadre 5 minuti
        PRESENCE_HEARTBEAT_MS: 30000, // Heartbeat ogni 30 secondi
        PRESENCE_TIMEOUT_MS: 2 * 60 * 1000 // Considera offline dopo 2 minuti
    };

    // Costanti griglia - FONTE DI VERITA' per tutto il sistema Tattiche Serie
    const GRID_W = 12;
    const GRID_H = 7;

    // Cache per ridurre letture
    let teamsCache = {
        data: null,
        timestamp: 0
    };

    // Presenza online
    let presenceInterval = null;

    // ========================================
    // STATO
    // ========================================
    let state = {
        currentChallengeId: null,
        isInMatch: false,
        myTeamId: null,
        myRole: null, // 'attacker' o 'defender'
        isMyTurn: false,
        unsubscribeMatch: null,
        turnTimer: null,
        availableTeams: []
    };

    // ========================================
    // PATH FIRESTORE
    // ========================================
    function getMinigameChallengesPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/minigame-challenges` : null;
    }

    function getTeamsPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/teams` : null;
    }

    // ========================================
    // INIZIALIZZAZIONE
    // ========================================
    function init() {
        console.log('[SfideMultiplayer] Inizializzazione...');

        state.myTeamId = window.InterfacciaCore?.currentTeamId;

        if (!state.myTeamId || state.myTeamId === 'admin') {
            console.log('[SfideMultiplayer] Nessuna squadra, skip init');
            return;
        }

        // Avvia heartbeat presenza
        startPresenceHeartbeat();

        // Ascolta sfide in arrivo
        startListeningForChallenges();

        // Controlla se c'e' una partita in corso da riprendere
        checkForActiveMatch();

        console.log('[SfideMultiplayer] Inizializzato per team:', state.myTeamId);
    }

    // ========================================
    // SISTEMA PRESENZA ONLINE
    // ========================================

    /**
     * Avvia heartbeat per segnalare che l'utente e' online
     */
    function startPresenceHeartbeat() {
        if (presenceInterval) {
            clearInterval(presenceInterval);
        }

        // Aggiorna subito
        updatePresence();

        // Poi ogni 30 secondi
        presenceInterval = setInterval(() => {
            updatePresence();
        }, CONFIG.PRESENCE_HEARTBEAT_MS);

        // Aggiorna anche quando la finestra torna in focus
        window.addEventListener('focus', updatePresence);

        // Setta offline quando l'utente chiude il browser/tab
        window.addEventListener('beforeunload', handleBeforeUnload);

        console.log('[SfideMultiplayer] Heartbeat presenza avviato');
    }

    /**
     * Handler per chiusura browser/tab
     */
    function handleBeforeUnload() {
        // Usa sendBeacon per garantire che la richiesta arrivi
        // anche durante la chiusura della pagina
        setOffline();
    }

    /**
     * Ferma heartbeat presenza (logout/chiusura)
     */
    function stopPresenceHeartbeat() {
        if (presenceInterval) {
            clearInterval(presenceInterval);
            presenceInterval = null;
        }
        window.removeEventListener('focus', updatePresence);
        window.removeEventListener('beforeunload', handleBeforeUnload);

        // Setta offline
        setOffline();

        console.log('[SfideMultiplayer] Heartbeat presenza fermato');
    }

    /**
     * Aggiorna timestamp presenza su Firestore
     */
    async function updatePresence() {
        if (!state.myTeamId || state.myTeamId === 'admin') return;

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const path = getTeamsPath();
            if (!path) return;

            const teamDocRef = doc(window.db, path, state.myTeamId);
            await updateDoc(teamDocRef, {
                lastSeen: Date.now(),
                isOnline: true
            });
        } catch (error) {
            // Silently fail - non bloccare l'app per errori di presenza
            console.warn('[SfideMultiplayer] Errore aggiornamento presenza:', error.message);
        }
    }

    /**
     * Setta utente come offline
     */
    async function setOffline() {
        if (!state.myTeamId || state.myTeamId === 'admin') return;

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const path = getTeamsPath();
            if (!path) return;

            const teamDocRef = doc(window.db, path, state.myTeamId);
            await updateDoc(teamDocRef, {
                isOnline: false
            });
        } catch (error) {
            console.warn('[SfideMultiplayer] Errore set offline:', error.message);
        }
    }

    /**
     * Verifica se un team e' online (lastSeen negli ultimi 2 minuti)
     */
    function isTeamOnline(teamData) {
        if (!teamData?.lastSeen) return false;
        const now = Date.now();
        return (now - teamData.lastSeen) < CONFIG.PRESENCE_TIMEOUT_MS;
    }

    // ========================================
    // RICONNESSIONE PARTITA IN CORSO
    // ========================================
    async function checkForActiveMatch() {
        try {
            const { collection, query, where, getDocs } = window.firestoreTools;
            const path = getMinigameChallengesPath();
            if (!path) return;

            // Query 1: partite dove sono lo sfidante
            const q1 = query(
                collection(window.db, path),
                where('status', '==', 'in_progress'),
                where('challengerId', '==', state.myTeamId)
            );

            // Query 2: partite dove sono lo sfidato
            const q2 = query(
                collection(window.db, path),
                where('status', '==', 'in_progress'),
                where('challengedId', '==', state.myTeamId)
            );

            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            // Prendi la prima partita trovata (con bounds check)
            const matchDoc = (snap1.docs.length > 0 ? snap1.docs[0] : null) ||
                             (snap2.docs.length > 0 ? snap2.docs[0] : null);

            if (matchDoc) {
                const match = { id: matchDoc.id, ...matchDoc.data() };
                console.log('[SfideMultiplayer] Trovata partita in corso:', match.id);
                showReconnectModal(match);
            }
        } catch (error) {
            console.error('[SfideMultiplayer] Errore check partita attiva:', error);
        }
    }

    function showReconnectModal(match) {
        const opponentName = match.challengerId === state.myTeamId
            ? match.challengedName
            : match.challengerName;

        const modal = document.createElement('div');
        modal.id = 'reconnect-match-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl max-w-sm w-full p-6 border-2 border-yellow-500 text-center">
                <div class="text-5xl mb-4">⚠️</div>
                <h2 class="text-xl font-bold text-yellow-400 mb-2">Partita in Sospeso!</h2>
                <p class="text-gray-300 mb-4">
                    Hai una sfida in corso contro <span class="text-indigo-400 font-bold">${opponentName}</span>
                </p>
                <p class="text-sm text-gray-400 mb-4">
                    Punteggio: <span class="text-red-400">${match.gameState?.scoreA || 0}</span> -
                    <span class="text-blue-400">${match.gameState?.scoreB || 0}</span>
                </p>
                <div class="flex gap-3 justify-center">
                    <button id="btn-reconnect-match" class="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition">
                        🎮 Riprendi
                    </button>
                    <button id="btn-abandon-match" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition">
                        Abbandona
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('btn-reconnect-match').addEventListener('click', () => {
            modal.remove();
            joinMatch(match.id, match);
        });

        document.getElementById('btn-abandon-match').addEventListener('click', async () => {
            modal.remove();
            await abandonMatch(match.id);
        });
    }

    async function abandonMatch(matchId) {
        try {
            const { doc, getDoc, deleteDoc } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            // Leggi match per sapere il mio ruolo
            const matchDoc = await getDoc(doc(window.db, path, matchId));
            if (!matchDoc.exists()) {
                if (window.Toast) window.Toast.info('Partita non trovata');
                return;
            }
            const matchData = matchDoc.data();

            // Chi abbandona perde 0-3
            const myTeamLetter = state.myTeamId === matchData.challengerId ? 'A' : 'B';
            const winnerId = myTeamLetter === 'A' ? matchData.challengedId : matchData.challengerId;
            const loserId = state.myTeamId;

            // Salva nello storico per entrambi i team
            if (window.MatchHistory) {
                const scoreWinner = 3;
                const scoreLoser = 0;

                // Storico per il vincitore
                await window.MatchHistory.saveMatch(winnerId, {
                    type: 'sfida',
                    opponent: matchData.challengerId === winnerId ? matchData.challengedName : matchData.challengerName,
                    opponentId: loserId,
                    result: 'win',
                    score: `${scoreWinner}-${scoreLoser}`,
                    myGoals: scoreWinner,
                    opponentGoals: scoreLoser,
                    note: 'Vittoria per abbandono avversario'
                });

                // Storico per chi ha abbandonato
                await window.MatchHistory.saveMatch(loserId, {
                    type: 'sfida',
                    opponent: matchData.challengerId === loserId ? matchData.challengedName : matchData.challengerName,
                    opponentId: winnerId,
                    result: 'loss',
                    score: `${scoreLoser}-${scoreWinner}`,
                    myGoals: scoreLoser,
                    opponentGoals: scoreWinner,
                    note: 'Sconfitta per abbandono'
                });
            }

            // Elimina il documento
            await deleteDoc(doc(window.db, path, matchId));

            if (window.Toast) window.Toast.info('Partita abbandonata e registrata');
        } catch (error) {
            console.error('[SfideMultiplayer] Errore abbandono:', error);
        }
    }

    // ========================================
    // UI - MODAL SELEZIONE SQUADRA
    // ========================================
    async function showChallengeModal() {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (!myTeamId || myTeamId === 'admin') {
            if (window.Toast) window.Toast.error("Devi avere una squadra per sfidare");
            return;
        }

        // Verifica formazione
        const myTeam = window.InterfacciaCore?.currentTeamData;
        if (!myTeam?.formation?.titolari?.length || myTeam.formation.titolari.length < 5) {
            if (window.Toast) window.Toast.warning("Imposta prima la tua formazione con almeno 5 titolari!");
            return;
        }

        // Verifica se ha gia' una sfida attiva
        const hasActive = await hasActiveChallenge(myTeamId);
        if (hasActive) {
            if (window.Toast) window.Toast.warning("Hai gia' una sfida attiva. Completala prima di sfidare altri.");
            return;
        }

        // Crea modal
        const modal = document.createElement('div');
        modal.id = 'minigame-challenge-modal';
        modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl max-w-md w-full p-1 shadow-[0_0_60px_rgba(16,185,129,0.15)] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <!-- Decorative corner accents -->
                <div class="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-transparent"></div>
                <div class="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-500/10 to-transparent"></div>
                <div class="absolute top-0 right-0 w-1 h-16 bg-gradient-to-b from-emerald-400 to-transparent"></div>
                <div class="absolute bottom-0 left-0 h-1 w-24 bg-gradient-to-r from-cyan-400 to-transparent"></div>

                <!-- Inner content wrapper -->
                <div class="relative bg-slate-900/80 backdrop-blur-sm rounded-xl p-6">
                    <!-- Header -->
                    <div class="flex justify-between items-start mb-5">
                        <div>
                            <div class="flex items-center gap-3 mb-1">
                                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/25">
                                    ⚔️
                                </div>
                                <h2 class="text-2xl font-black tracking-tight text-white uppercase">
                                    Sfida <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Tattica</span>
                                </h2>
                            </div>
                            <p class="text-xs text-slate-500 uppercase tracking-widest ml-13">Minigame PvP</p>
                        </div>
                        <button id="close-minigame-modal" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/50 text-slate-500 hover:text-red-400 flex items-center justify-center transition-all duration-200 text-lg">
                            ×
                        </button>
                    </div>

                    <!-- Description -->
                    <p class="text-slate-400 text-sm leading-relaxed mb-5 border-l-2 border-emerald-500/30 pl-3">
                        Sfida un'altra squadra nel minigame tattico! I ruoli <span class="text-emerald-400 font-semibold">attaccante</span>/<span class="text-cyan-400 font-semibold">difensore</span> saranno assegnati casualmente.
                    </p>

                    <!-- Team selector -->
                    <div class="mb-4">
                        <label class="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Squadra avversaria
                        </label>
                        <div class="relative">
                            <select id="minigame-target-team" class="w-full p-3.5 pl-4 bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 focus:border-emerald-500 rounded-xl text-white appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium">
                                <option value="">Caricamento squadre...</option>
                            </select>
                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <!-- Target info (hidden by default) -->
                    <div id="minigame-target-info" class="hidden mb-4 p-4 bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl border border-slate-700/50">
                        <p class="text-sm text-slate-400">Info squadra selezionata</p>
                    </div>

                    <!-- Rules box -->
                    <div class="relative mb-5 p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-800/40 border border-emerald-500/20 overflow-hidden">
                        <div class="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
                        <h4 class="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                            </svg>
                            Regole
                        </h4>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="flex items-center gap-2 text-slate-300">
                                <span class="text-emerald-500">◆</span> 3 mosse/turno
                            </div>
                            <div class="flex items-center gap-2 text-slate-300">
                                <span class="text-cyan-500">◆</span> 30 sec/mossa
                            </div>
                            <div class="flex items-center gap-2 text-slate-300">
                                <span class="text-emerald-500">◆</span> Primo a 3 gol
                            </div>
                            <div class="flex items-center gap-2 text-slate-300">
                                <span class="text-cyan-500">◆</span> La tua formazione
                            </div>
                        </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex gap-3">
                        <button id="btn-send-minigame-challenge" class="flex-1 relative group bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]">
                            <span class="text-lg">⚔️</span>
                            <span class="uppercase tracking-wide text-sm">Invia Sfida</span>
                        </button>
                        <button id="btn-cancel-minigame" class="px-5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold py-3.5 rounded-xl transition-all duration-200 border border-slate-700 hover:border-slate-600 text-sm uppercase tracking-wide">
                            Annulla
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Carica squadre
        await loadAvailableTeams();

        // Event listeners
        document.getElementById('close-minigame-modal').addEventListener('click', () => modal.remove());
        document.getElementById('btn-cancel-minigame').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('minigame-target-team').addEventListener('change', (e) => {
            showTargetInfo(e.target.value);
        });

        document.getElementById('btn-send-minigame-challenge').addEventListener('click', () => {
            sendChallenge();
        });
    }

    async function loadAvailableTeams() {
        const select = document.getElementById('minigame-target-team');
        if (!select) return;

        const myTeamId = window.InterfacciaCore?.currentTeamId;

        // Per la presenza online NON usiamo cache, dobbiamo avere dati freschi
        try {
            const { collection, getDocs } = window.firestoreTools;
            const teamsPath = getTeamsPath();

            const snapshot = await getDocs(collection(window.db, teamsPath));
            const allTeams = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Solo squadre con formazione valida (almeno 5 titolari)
                if (data.teamName && data.formation?.titolari?.length >= 5) {
                    const teamData = {
                        id: doc.id,
                        teamName: data.teamName,
                        formation: data.formation,
                        lastSeen: data.lastSeen || 0,
                        isOnline: data.isOnline || false
                    };
                    // Calcola se e' realmente online (lastSeen negli ultimi 2 minuti)
                    teamData.isReallyOnline = isTeamOnline(teamData);
                    allTeams.push(teamData);
                }
            });

            // Filtra escludendo la mia squadra
            const teams = allTeams.filter(t => t.id !== myTeamId);

            // Ordina: prima gli online, poi gli offline
            teams.sort((a, b) => {
                if (a.isReallyOnline && !b.isReallyOnline) return -1;
                if (!a.isReallyOnline && b.isReallyOnline) return 1;
                return a.teamName.localeCompare(b.teamName);
            });

            state.availableTeams = teams;
            populateTeamsSelect(select, teams);

        } catch (error) {
            console.error("[SfideMultiplayer] Errore caricamento squadre:", error);
            select.innerHTML = '<option value="">Errore caricamento</option>';
        }
    }

    function populateTeamsSelect(select, teams) {
        // Conta quante squadre sono online
        const onlineCount = teams.filter(t => t.isReallyOnline).length;

        if (teams.length === 0) {
            select.innerHTML = '<option value="">Nessuna squadra disponibile</option>';
            return;
        }

        if (onlineCount === 0) {
            // Nessuno online, mostra tutte con nota
            select.innerHTML = '<option value="">Nessun giocatore online...</option>' +
                teams.map(t => `<option value="${t.id}">⚫ ${t.teamName} (offline)</option>`).join('');
            return;
        }

        // Mostra con indicatore online/offline
        select.innerHTML = '<option value="">Seleziona squadra... (${onlineCount} online)</option>'.replace('${onlineCount}', onlineCount) +
            teams.map(t => {
                const indicator = t.isReallyOnline ? '🟢' : '⚫';
                const status = t.isReallyOnline ? '' : ' (offline)';
                return `<option value="${t.id}">${indicator} ${t.teamName}${status}</option>`;
            }).join('');
    }

    function showTargetInfo(teamId) {
        const infoDiv = document.getElementById('minigame-target-info');
        if (!infoDiv || !teamId) {
            if (infoDiv) infoDiv.classList.add('hidden');
            return;
        }

        const team = state.availableTeams?.find(t => t.id === teamId);
        if (!team) {
            infoDiv.classList.add('hidden');
            return;
        }

        const titolariCount = team.formation?.titolari?.length || 0;
        const onlineStatus = team.isReallyOnline
            ? '<div class="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wide"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online</div>'
            : '<div class="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wide"><span class="w-2 h-2 rounded-full bg-slate-600"></span> Offline</div>';

        infoDiv.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center text-2xl border border-slate-600/50 shadow-inner">⚽</div>
                <div class="flex-1">
                    <p class="font-bold text-white text-base">${team.teamName}</p>
                    <p class="text-xs text-slate-500">${titolariCount} titolari in formazione</p>
                </div>
                ${onlineStatus}
            </div>
        `;
        infoDiv.classList.remove('hidden');
    }

    // ========================================
    // INVIO SFIDA
    // ========================================
    async function sendChallenge() {
        const targetTeamId = document.getElementById('minigame-target-team')?.value;
        if (!targetTeamId) {
            if (window.Toast) window.Toast.warning("Seleziona una squadra da sfidare");
            return;
        }

        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const myTeam = window.InterfacciaCore?.currentTeamData;

        // Verifica se target ha gia' una sfida attiva
        const targetHasActive = await hasActiveChallenge(targetTeamId);
        if (targetHasActive) {
            if (window.Toast) window.Toast.warning("Questa squadra ha gia' una sfida attiva.");
            return;
        }

        const btn = document.getElementById('btn-send-minigame-challenge');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Invio...';

        try {
            const { collection, addDoc, Timestamp } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            const targetTeam = state.availableTeams?.find(t => t.id === targetTeamId);

            // Assegna ruoli casualmente
            const challengerIsAttacker = Math.random() < 0.5;

            const challenge = {
                challengerId: myTeamId,
                challengerName: myTeam?.teamName || 'Squadra',
                challengerColor: myTeam?.primaryColor || '#ef4444', // Rosso default
                challengerFormation: myTeam?.formation?.titolari?.slice(0, 5) || [],

                challengedId: targetTeamId,
                challengedName: targetTeam?.teamName || 'Squadra',
                challengedColor: targetTeam?.primaryColor || '#3b82f6', // Blu default
                challengedFormation: targetTeam?.formation?.titolari?.slice(0, 5) || [],

                attackerId: challengerIsAttacker ? myTeamId : targetTeamId,
                defenderId: challengerIsAttacker ? targetTeamId : myTeamId,

                status: 'pending', // pending, accepted, in_progress, completed, declined, expired

                createdAt: Timestamp.now(),
                expiresAt: new Date(Date.now() + CONFIG.CHALLENGE_EXPIRE_MS),

                // Stato di gioco (inizializzato quando accettata)
                gameState: null
            };

            const docRef = await addDoc(collection(window.db, path), challenge);

            if (window.Toast) window.Toast.success(`Sfida inviata a ${targetTeam?.teamName}!`);

            // Chiudi modal
            document.getElementById('minigame-challenge-modal')?.remove();

            // Mostra modal di attesa
            showWaitingModal(docRef.id, targetTeam?.teamName);

        } catch (error) {
            console.error("[SfideMultiplayer] Errore invio sfida:", error);
            if (window.Toast) window.Toast.error("Errore nell'invio della sfida");
            btn.disabled = false;
            btn.innerHTML = '<span>🎮</span> Invia Sfida';
        }
    }

    function showWaitingModal(challengeId, targetName) {
        const modal = document.createElement('div');
        modal.id = 'waiting-challenge-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl max-w-sm w-full p-6 border-2 border-indigo-500 text-center">
                <div class="text-5xl mb-4 animate-pulse">🎮</div>
                <h2 class="text-xl font-bold text-white mb-2">Sfida Inviata!</h2>
                <p class="text-gray-300 mb-4">In attesa che <span class="text-indigo-400 font-bold">${targetName}</span> accetti...</p>
                <div class="flex justify-center mb-4">
                    <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p class="text-sm text-gray-500 mb-4">La sfida scade tra 5 minuti</p>
                <button id="btn-cancel-waiting" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition">
                    Annulla Sfida
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Ascolta stato sfida e ottieni funzione per unsubscribe
        const unsubscribe = listenToChallengeStatus(challengeId, modal);

        // Listener per cancellazione - pulisce anche il listener Firestore
        document.getElementById('btn-cancel-waiting').addEventListener('click', async () => {
            if (unsubscribe) unsubscribe(); // Pulisci listener prima di cancellare
            await cancelChallenge(challengeId);
            modal.remove();
        });
    }

    async function cancelChallenge(challengeId) {
        try {
            const { doc, deleteDoc } = window.firestoreTools;
            const path = getMinigameChallengesPath();
            await deleteDoc(doc(window.db, path, challengeId));
            if (window.Toast) window.Toast.info("Sfida annullata");
        } catch (error) {
            console.error("[SfideMultiplayer] Errore cancellazione:", error);
        }
    }

    function listenToChallengeStatus(challengeId, waitingModal) {
        const { doc, onSnapshot } = window.firestoreTools;
        const path = getMinigameChallengesPath();

        const unsubscribe = onSnapshot(doc(window.db, path, challengeId), (snapshot) => {
            if (!snapshot.exists()) {
                // Sfida cancellata o scaduta
                waitingModal?.remove();
                unsubscribe();
                return;
            }

            const challenge = snapshot.data();

            if (challenge.status === 'accepted' || challenge.status === 'in_progress') {
                // Sfida accettata! Avvia partita
                waitingModal?.remove();
                unsubscribe();
                joinMatch(challengeId, challenge);
            } else if (challenge.status === 'declined') {
                waitingModal?.remove();
                unsubscribe();
                if (window.Toast) window.Toast.info("La sfida e' stata rifiutata");
            } else if (challenge.status === 'expired') {
                waitingModal?.remove();
                unsubscribe();
                if (window.Toast) window.Toast.warning("La sfida e' scaduta");
            }
        });

        // Restituisce unsubscribe per pulizia esterna
        return unsubscribe;
    }

    // ========================================
    // RICEZIONE SFIDE
    // ========================================
    function startListeningForChallenges() {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (!myTeamId) return;

        const { collection, query, where, onSnapshot } = window.firestoreTools;
        const path = getMinigameChallengesPath();

        if (!path) {
            setTimeout(startListeningForChallenges, 2000);
            return;
        }

        // Ascolta sfide dove sono lo sfidato
        const q = query(
            collection(window.db, path),
            where('challengedId', '==', myTeamId),
            where('status', '==', 'pending')
        );

        let isFirstSnapshot = true;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const challenge = { id: change.doc.id, ...change.doc.data() };

                    // Ignora sfide vecchie al primo caricamento
                    if (isFirstSnapshot) {
                        const challengeTime = challenge.createdAt?.toMillis?.() || 0;
                        const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
                        if (challengeTime < twoMinutesAgo) {
                            return;
                        }
                    }

                    // Verifica se gia' in partita
                    if (state.isInMatch) {
                        console.log("[SfideMultiplayer] Gia' in partita, ignoro sfida");
                        return;
                    }

                    showIncomingChallengeModal(challenge);
                }
            });
            isFirstSnapshot = false;
        });

        state.unsubscribeChallenges = unsubscribe;
        console.log("[SfideMultiplayer] Listener sfide attivo");
    }

    // Cache per sfide test (non su Firestore)
    let testChallenges = {};

    function showIncomingChallengeModal(challenge) {
        // Rimuovi modal esistente
        document.getElementById('incoming-minigame-modal')?.remove();

        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const myRole = challenge.attackerId === myTeamId ? 'attacker' : 'defender';
        const myRoleText = myRole === 'attacker' ? 'Attaccante' : 'Difensore';
        const roleColor = myRole === 'attacker' ? 'text-red-400' : 'text-blue-400';

        // Salva sfida test in cache locale
        if (challenge.id?.startsWith('test_')) {
            testChallenges[challenge.id] = challenge;
        }

        // Aggiungi notifica nel centro notifiche
        if (window.Notifications && window.FeatureFlags?.isEnabled('notifications')) {
            window.Notifications.notify.minigameChallengeReceived(
                challenge.challengerName,
                challenge.id,
                myRole
            );
        }

        // Mostra anche toast
        if (window.Toast) {
            window.Toast.info(`🎮 ${challenge.challengerName} ti sfida!`);
        }

        const modal = document.createElement('div');
        modal.id = 'incoming-minigame-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl max-w-md w-full p-6 border-2 border-indigo-500 shadow-2xl animate-pulse-border">
                <div class="text-center mb-6">
                    <div class="text-6xl mb-4">🎮</div>
                    <h2 class="text-3xl font-bold text-indigo-400">SFIDA TATTICA!</h2>
                    <p class="text-gray-300 mt-2">Hai ricevuto una sfida</p>
                </div>

                <div class="bg-gray-900 rounded-lg p-4 mb-4">
                    <div class="flex items-center justify-between">
                        <div class="text-center flex-1">
                            <p class="text-lg font-bold text-orange-400">${challenge.challengerName}</p>
                            <p class="text-xs text-gray-500">Sfidante</p>
                        </div>
                        <div class="text-3xl text-indigo-500 px-4">VS</div>
                        <div class="text-center flex-1">
                            <p class="text-lg font-bold text-cyan-400">${challenge.challengedName}</p>
                            <p class="text-xs text-gray-500">Tu</p>
                        </div>
                    </div>
                </div>

                <div class="bg-indigo-900/30 border border-indigo-600/50 rounded-lg p-3 mb-4 text-center">
                    <p class="text-gray-300">Il tuo ruolo sara':</p>
                    <p class="text-2xl font-bold ${roleColor}">${myRoleText}</p>
                </div>

                <div class="bg-gray-900/50 rounded-lg p-3 mb-4">
                    <p class="text-sm text-gray-400 text-center">
                        3 mosse per turno • 30 sec per mossa • Primo a 3 gol
                    </p>
                </div>

                <div class="flex gap-3">
                    <button id="btn-accept-minigame" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                        <span>✅</span> Accetta
                    </button>
                    <button id="btn-decline-minigame" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                        <span>❌</span> Rifiuta
                    </button>
                </div>
            </div>

            <style>
                @keyframes pulse-border {
                    0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }
                    50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.8); }
                }
                .animate-pulse-border { animation: pulse-border 2s infinite; }
            </style>
        `;

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('btn-accept-minigame').addEventListener('click', async () => {
            modal.remove();
            await acceptChallenge(challenge);
        });

        document.getElementById('btn-decline-minigame').addEventListener('click', async () => {
            modal.remove();
            await declineChallenge(challenge);
        });
    }

    async function acceptChallenge(challenge) {
        try {
            // Inizializza stato di gioco
            const initialGameState = createInitialGameState(challenge);

            // Se e' una sfida test, non salvare su Firestore
            if (challenge.id?.startsWith('test_')) {
                console.log("[SfideMultiplayer] Accettazione sfida TEST (no Firestore)");
                if (window.Toast) window.Toast.success("Sfida TEST accettata! Partita in corso...");

                // Avvia partita in modalita' test/locale
                joinTestMatch(challenge.id, { ...challenge, gameState: initialGameState, status: 'in_progress' });
                return;
            }

            const { doc, updateDoc, Timestamp } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            await updateDoc(doc(window.db, path, challenge.id), {
                status: 'in_progress',
                acceptedAt: Timestamp.now(),
                gameState: initialGameState
            });

            if (window.Toast) window.Toast.success("Sfida accettata! Partita in corso...");

            // Unisciti alla partita
            joinMatch(challenge.id, { ...challenge, gameState: initialGameState, status: 'in_progress' });

        } catch (error) {
            console.error("[SfideMultiplayer] Errore accettazione:", error);
            if (window.Toast) window.Toast.error("Errore nell'accettare la sfida");
        }
    }

    /**
     * Avvia partita test (senza sync Firestore, vs Bot)
     */
    function joinTestMatch(challengeId, challenge) {
        console.log("[SfideMultiplayer] Avvio partita TEST:", challengeId);

        state.currentChallengeId = challengeId;
        state.isInMatch = true;
        state.myTeamId = window.InterfacciaCore?.currentTeamId;
        state.myRole = challenge.attackerId === state.myTeamId ? 'attacker' : 'defender';

        // Determina il mio team (A=rosso=challenger, B=blu=challenged)
        const myTeamLetter = state.myTeamId === challenge.challengerId ? 'A' : 'B';

        // Apri minigame in modalita' test con giocatori corretti
        if (window.SfideMinigame) {
            window.SfideMinigame.open({
                testMode: true,
                multiplayer: false,
                myTeam: myTeamLetter, // A=rosso, B=blu
                // Passa il gameState per usare i giocatori corretti
                gameState: challenge.gameState,
                useGameState: true, // Flag per usare gameState anche in testMode
                onComplete: (result) => {
                    console.log("[SfideMultiplayer] Partita TEST completata:", result);
                    state.isInMatch = false;
                    state.currentChallengeId = null;

                    // Risultato in base al mio team
                    const myScore = myTeamLetter === 'A' ? result.scoreA : result.scoreB;
                    const oppScore = myTeamLetter === 'A' ? result.scoreB : result.scoreA;

                    if (myScore > oppScore) {
                        if (window.Toast) window.Toast.success(`Hai vinto ${myScore}-${oppScore}!`);
                    } else if (oppScore > myScore) {
                        if (window.Toast) window.Toast.info(`Hai perso ${myScore}-${oppScore}`);
                    } else {
                        if (window.Toast) window.Toast.info(`Pareggio ${myScore}-${oppScore}!`);
                    }
                }
            });
        }
    }

    async function declineChallenge(challenge) {
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            await updateDoc(doc(window.db, path, challenge.id), {
                status: 'declined'
            });

            if (window.Toast) window.Toast.info("Sfida rifiutata");

        } catch (error) {
            console.error("[SfideMultiplayer] Errore rifiuto:", error);
        }
    }

    // ========================================
    // STATO INIZIALE PARTITA
    // ========================================
    function createInitialGameState(challenge) {
        // Usa GRID_W e GRID_H a livello di modulo
        const centerY = Math.floor(GRID_H / 2);
        console.log('[SfideMultiplayer] Creazione gameState con GRID_W=' + GRID_W);

        // Team A (Rosso, sinistra) = Challenger (chi sfida)
        // Team B (Blu, destra) = Challenged (chi viene sfidato)
        const challengerPlayers = generateTeamPlayers(
            challenge.challengerFormation,
            'A', // Challenger = Team A (rosso, sinistra)
            GRID_W, GRID_H
        );

        const challengedPlayers = generateTeamPlayers(
            challenge.challengedFormation,
            'B', // Challenged = Team B (blu, destra)
            GRID_W, GRID_H
        );

        // Chi inizia con la palla? Chi e' stato assegnato come attaccante
        const challengerStarts = challenge.attackerId === challenge.challengerId;
        const startingTeamPlayers = challengerStarts ? challengerPlayers : challengedPlayers;
        const startingPivot = startingTeamPlayers.find(p => p.name === 'A') || startingTeamPlayers[startingTeamPlayers.length - 1];

        const allPlayers = [...challengerPlayers, ...challengedPlayers];
        console.log('[SfideMultiplayer] Posizioni generate:', allPlayers.map(p => `${p.id}:${p.name}@(${p.x},${p.y})`).join(', '));

        return {
            players: allPlayers,
            scoreA: 0, // Challenger (rosso) score
            scoreB: 0, // Challenged (blu) score
            currentTurn: challenge.attackerId, // Chi attacca inizia
            movesLeft: CONFIG.MOVES_PER_TURN,
            ballCarrierId: startingPivot.id,
            ballPosition: null,
            lastMoveAt: Date.now(),
            isGameOver: false,
            winner: null,
            // Turni saltati consecutivi (3 = sconfitta)
            skippedTurns: {
                [challenge.challengerId]: 0,
                [challenge.challengedId]: 0
            },
            // Mappa teamId -> team letter per riferimento
            teamMapping: {
                [challenge.challengerId]: 'A',
                [challenge.challengedId]: 'B'
            }
        };
    }

    function generateTeamPlayers(formation, team, GRID_W, GRID_H) {
        const players = [];
        const centerY = Math.floor(GRID_H / 2);

        // Prendi solo i primi 5 giocatori dalla formazione
        const titolari = formation?.slice(0, 5) || [];

        // Posizioni fisse per formazione 1-1-2-1 (P, D, C, C, A) - Campo 12x7
        // Team A a sinistra, Team B a destra
        const fixedPositions = team === 'A' ? [
            { x: 0, y: centerY, name: 'P', mod: 8, isGK: true },      // Portiere
            { x: 2, y: centerY, name: 'D', mod: 6, isGK: false },     // Difensore
            { x: 3, y: 1, name: 'C', mod: 5, isGK: false },           // Centrocampista alto
            { x: 3, y: GRID_H - 2, name: 'C', mod: 5, isGK: false },  // Centrocampista basso
            { x: 4, y: centerY, name: 'A', mod: 7, isGK: false }      // Attaccante
        ] : [
            { x: GRID_W - 1, y: centerY, name: 'P', mod: 8, isGK: true },      // Portiere
            { x: GRID_W - 3, y: centerY, name: 'D', mod: 6, isGK: false },     // Difensore
            { x: GRID_W - 4, y: 1, name: 'C', mod: 5, isGK: false },           // Centrocampista alto
            { x: GRID_W - 4, y: GRID_H - 2, name: 'C', mod: 5, isGK: false },  // Centrocampista basso
            { x: GRID_W - 5, y: centerY, name: 'A', mod: 7, isGK: false }      // Attaccante
        ];

        // Assegna ogni giocatore a una posizione fissa
        for (let i = 0; i < 5; i++) {
            const pos = fixedPositions[i];
            const p = titolari[i];

            // Calcola modificatore dal livello del giocatore (se disponibile)
            let mod = pos.mod;
            if (p) {
                const level = p.level || p.currentLevel || p.livello || 5;
                mod = Math.min(10, 5 + Math.floor(level / 6));
            }

            players.push({
                id: `${team}${i + 1}`,
                team: team,
                name: pos.name,
                playerName: p?.name || 'Giocatore',
                x: pos.x,
                y: pos.y,
                mod: mod,
                isGK: pos.isGK,
                defenseMode: null,
                defenseCells: []
            });
        }

        return players;
    }

    // ========================================
    // PARTITA MULTIPLAYER
    // ========================================
    function joinMatch(challengeId, challenge) {
        console.log("[SfideMultiplayer] Joining match:", challengeId);

        state.currentChallengeId = challengeId;
        state.isInMatch = true;
        state.myTeamId = window.InterfacciaCore?.currentTeamId;
        state.myRole = challenge.attackerId === state.myTeamId ? 'attacker' : 'defender';

        // Determina il mio team (A=rosso=challenger, B=blu=challenged)
        state.myTeamLetter = state.myTeamId === challenge.challengerId ? 'A' : 'B';

        // Inizia a sincronizzare con Firestore
        startMatchSync(challengeId, challenge);

        // Apri il minigame con modalita' multiplayer
        if (window.SfideMinigame) {
            window.SfideMinigame.open({
                testMode: false,
                multiplayer: true,
                challengeId: challengeId,
                myRole: state.myRole,
                myTeam: state.myTeamLetter, // A=rosso, B=blu
                gameState: challenge.gameState,
                // Nomi e colori squadre (A=challenger, B=challenged)
                teamAName: challenge.challengerName || 'Rossa',
                teamBName: challenge.challengedName || 'Blu',
                teamAColor: challenge.challengerColor || '#ef4444',
                teamBColor: challenge.challengedColor || '#3b82f6',
                onMove: (move) => sendMove(challengeId, move),
                onComplete: (result) => handleMatchComplete(challengeId, result),
                onAbandon: () => handleAbandonMatch(challengeId)
            });
        }
    }

    /**
     * Gestisce l'abbandono della partita - l'avversario vince 3-0
     */
    async function handleAbandonMatch(challengeId) {
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            const docRef = doc(window.db, path, challengeId);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) return;

            const data = snapshot.data();
            const myTeamLetter = state.myTeamLetter || (state.myTeamId === data.challengerId ? 'A' : 'B');
            const winnerTeam = myTeamLetter === 'A' ? 'B' : 'A';

            // Chi abbandona perde 3-0
            const gameState = {
                ...data.gameState,
                isGameOver: true,
                winner: winnerTeam,
                scoreA: winnerTeam === 'A' ? 3 : 0,
                scoreB: winnerTeam === 'B' ? 3 : 0,
                abandonedBy: state.myTeamId
            };

            await updateDoc(docRef, {
                gameState,
                status: 'completed'
            });

            if (window.Toast) window.Toast.info('Partita abbandonata');

            // Chiudi il minigame
            if (window.SfideMinigame) {
                window.SfideMinigame.close?.();
            }

            endMatch();

        } catch (error) {
            console.error('[SfideMultiplayer] Errore abbandono partita:', error);
            if (window.Toast) window.Toast.error('Errore nell\'abbandonare la partita');
        }
    }

    function startMatchSync(challengeId, challenge) {
        const { doc, onSnapshot } = window.firestoreTools;
        const path = getMinigameChallengesPath();

        state.unsubscribeMatch = onSnapshot(doc(window.db, path, challengeId), (snapshot) => {
            if (!snapshot.exists()) {
                console.log("[SfideMultiplayer] Match eliminato");
                endMatch();
                return;
            }

            const data = snapshot.data();

            if (data.status === 'completed') {
                handleMatchComplete(challengeId, data.gameState);
                return;
            }

            // Aggiorna stato locale nel minigame
            if (window.SfideMinigame && data.gameState) {
                // Usa teamMapping o fallback a state.myTeamLetter
                const myTeam = data.gameState.teamMapping?.[state.myTeamId] || state.myTeamLetter || 'A';
                const isMyTurn = data.gameState.currentTurn === state.myTeamId;

                state.isMyTurn = isMyTurn;

                // Aggiorna UI minigame
                window.SfideMinigame.updateMultiplayerState?.({
                    gameState: data.gameState,
                    isMyTurn: isMyTurn,
                    myTeam: myTeam
                });

                // Gestisci timer turno
                if (isMyTurn) {
                    startTurnTimer(challengeId, data.gameState);
                } else {
                    clearTurnTimer();
                }
            }
        });
    }

    /**
     * Invia lo stato aggiornato dal minigame a Firestore
     * @param {string} challengeId - ID della sfida
     * @param {Object} newGameState - Stato completo dal minigame (gia' aggiornato con la mossa)
     */
    async function sendMove(challengeId, newGameState) {
        if (!state.isMyTurn) {
            console.warn("[SfideMultiplayer] Non e' il mio turno!");
            return;
        }

        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            const docRef = doc(window.db, path, challengeId);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) return;

            const data = snapshot.data();

            // Il gameState dal minigame e' gia' completo con:
            // - posizioni giocatori aggiornate
            // - punteggi aggiornati
            // - movesLeft corretto (1 se fine turno)
            // - currentTeam ('A' o 'B') aggiornato
            let gameState = { ...newGameState };

            // Mantieni skippedTurns dal documento esistente
            gameState.skippedTurns = data.gameState?.skippedTurns || {};

            // Reset turni saltati quando faccio una mossa
            if (gameState.skippedTurns[state.myTeamId]) {
                gameState.skippedTurns[state.myTeamId] = 0;
            }

            // Mantieni teamMapping dal documento esistente
            gameState.teamMapping = data.gameState?.teamMapping || {};

            // Converti currentTeam ('A'/'B') in currentTurn (teamId)
            // Questo permette all'avversario di sapere quando e' il suo turno
            if (gameState.currentTeam && gameState.teamMapping) {
                // Trova il teamId che corrisponde alla lettera del team corrente
                const teamEntries = Object.entries(gameState.teamMapping);
                const entry = teamEntries.find(([teamId, letter]) => letter === gameState.currentTeam);
                if (entry) {
                    gameState.currentTurn = entry[0]; // teamId
                }
            }

            // Verifica fine partita
            if (gameState.scoreA >= CONFIG.GOAL_LIMIT || gameState.scoreB >= CONFIG.GOAL_LIMIT) {
                gameState.isGameOver = true;
                gameState.winner = gameState.scoreA >= CONFIG.GOAL_LIMIT ? 'A' : 'B';
            }

            // Aggiorna Firestore
            const updateData = {
                gameState: gameState
            };

            if (gameState.isGameOver) {
                updateData.status = 'completed';
            }

            await updateDoc(docRef, updateData);

            console.log('[SfideMultiplayer] Stato inviato:', {
                movesLeft: gameState.movesLeft,
                currentTeam: gameState.currentTeam,
                currentTurn: gameState.currentTurn
            });

        } catch (error) {
            console.error("[SfideMultiplayer] Errore invio mossa:", error);
        }
    }

    function startTurnTimer(challengeId, gameState) {
        clearTurnTimer();

        const lastMoveTime = gameState.lastMoveAt || Date.now();
        const elapsed = Date.now() - lastMoveTime;
        const remaining = CONFIG.TURN_TIMEOUT_MS - elapsed;

        if (remaining <= 0) {
            // Timeout! Passa il turno
            handleTurnTimeout(challengeId);
            return;
        }

        state.turnTimer = setTimeout(() => {
            handleTurnTimeout(challengeId);
        }, remaining);

        // Aggiorna UI timer
        if (window.SfideMinigame) {
            window.SfideMinigame.setTurnTimer?.(remaining);
        }
    }

    function clearTurnTimer() {
        if (state.turnTimer) {
            clearTimeout(state.turnTimer);
            state.turnTimer = null;
        }
    }

    async function handleTurnTimeout(challengeId) {
        console.log("[SfideMultiplayer] Timeout turno!");

        if (!state.isMyTurn) return;

        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            const docRef = doc(window.db, path, challengeId);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) return;

            const data = snapshot.data();
            let gameState = { ...data.gameState };

            // Incrementa turni saltati per me
            if (!gameState.skippedTurns) {
                gameState.skippedTurns = {};
            }
            gameState.skippedTurns[state.myTeamId] = (gameState.skippedTurns[state.myTeamId] || 0) + 1;

            console.log(`[SfideMultiplayer] Turni saltati da ${state.myTeamId}: ${gameState.skippedTurns[state.myTeamId]}`);

            // Se 3 turni saltati, partita persa!
            if (gameState.skippedTurns[state.myTeamId] >= 3) {
                const myTeamLetter = gameState.teamMapping?.[state.myTeamId] || 'A';
                const winnerTeam = myTeamLetter === 'A' ? 'B' : 'A';

                gameState.isGameOver = true;
                gameState.winner = winnerTeam;
                gameState.lostByTimeout = state.myTeamId;

                await updateDoc(docRef, {
                    gameState,
                    status: 'completed'
                });

                if (window.Toast) window.Toast.error("Hai saltato 3 turni! Partita persa.");
                return;
            }

            // Passa il turno all'avversario
            const otherTeamId = data.challengerId === state.myTeamId
                ? data.challengedId
                : data.challengerId;

            gameState.currentTurn = otherTeamId;
            gameState.movesLeft = CONFIG.MOVES_PER_TURN;
            gameState.lastMoveAt = Date.now();

            // Reset difese del team che sta per giocare
            const otherTeam = gameState.teamMapping?.[otherTeamId] || 'B';
            gameState.players = gameState.players.map(p => {
                if (p.team === otherTeam) {
                    return { ...p, defenseMode: null, defenseCells: [] };
                }
                return p;
            });

            await updateDoc(docRef, { gameState });

            if (window.Toast) window.Toast.warning(`Tempo scaduto! Turno saltato (${gameState.skippedTurns[state.myTeamId]}/3)`);

        } catch (error) {
            console.error("[SfideMultiplayer] Errore timeout:", error);
        }
    }

    function handleMatchComplete(challengeId, result) {
        console.log("[SfideMultiplayer] Match completato:", result);

        state.isInMatch = false;
        clearTurnTimer();

        if (state.unsubscribeMatch) {
            state.unsubscribeMatch();
            state.unsubscribeMatch = null;
        }

        // Chiudi minigame se ancora aperto
        if (window.SfideMinigame) {
            window.SfideMinigame.close?.();
        }

        // Mostra risultato
        if (result) {
            // Usa myTeamLetter (A=challenger/rosso, B=challenged/blu) o fallback a teamMapping
            const myTeam = state.myTeamLetter || result.teamMapping?.[state.myTeamId] || 'A';
            const myScore = myTeam === 'A' ? result.scoreA : result.scoreB;
            const theirScore = myTeam === 'A' ? result.scoreB : result.scoreA;

            // Controlla se ha perso per timeout
            if (result.lostByTimeout === state.myTeamId) {
                if (window.Toast) window.Toast.error(`Hai perso per timeout (3 turni saltati)`);
            } else if (result.lostByTimeout) {
                if (window.Toast) window.Toast.success(`Hai vinto! L'avversario ha saltato 3 turni.`);
            } else if (result.winner === myTeam) {
                if (window.Toast) window.Toast.success(`Hai vinto ${myScore}-${theirScore}!`);
            } else if (myScore === theirScore) {
                if (window.Toast) window.Toast.info(`Pareggio ${myScore}-${theirScore}!`);
            } else {
                if (window.Toast) window.Toast.info(`Hai perso ${myScore}-${theirScore}`);
            }
        }

        state.currentChallengeId = null;
    }

    function endMatch() {
        state.isInMatch = false;
        state.currentChallengeId = null;
        clearTurnTimer();

        if (state.unsubscribeMatch) {
            state.unsubscribeMatch();
            state.unsubscribeMatch = null;
        }

        if (window.SfideMinigame) {
            window.SfideMinigame.close?.();
        }
    }

    // ========================================
    // UTILITIES
    // ========================================
    async function hasActiveChallenge(teamId) {
        // Bypass per testing (flag admin)
        if (window.FeatureFlags?.isEnabled('unlimitedChallenges')) {
            return false;
        }

        try {
            const { collection, query, where, getDocs } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            // Check come sfidante
            const q1 = query(
                collection(window.db, path),
                where('challengerId', '==', teamId),
                where('status', 'in', ['pending', 'in_progress'])
            );

            // Check come sfidato
            const q2 = query(
                collection(window.db, path),
                where('challengedId', '==', teamId),
                where('status', 'in', ['pending', 'in_progress'])
            );

            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            return snap1.size > 0 || snap2.size > 0;
        } catch (error) {
            console.error("[SfideMultiplayer] Errore check sfida attiva:", error);
            return false;
        }
    }

    // ========================================
    // CLEANUP
    // ========================================
    function destroy() {
        clearTurnTimer();

        if (state.unsubscribeChallenges) {
            state.unsubscribeChallenges();
        }
        if (state.unsubscribeMatch) {
            state.unsubscribeMatch();
        }

        state = {
            currentChallengeId: null,
            isInMatch: false,
            myTeamId: null,
            myRole: null,
            isMyTurn: false,
            unsubscribeMatch: null,
            turnTimer: null,
            availableTeams: []
        };
    }

    // ========================================
    // DEBUG/TEST
    // ========================================

    /**
     * Simula ricezione di una sfida (per test senza due account)
     * Uso: window.SfideMultiplayer.testIncomingChallenge()
     */
    function testIncomingChallenge() {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const myTeamName = window.InterfacciaCore?.currentTeamData?.teamName || 'La Mia Squadra';

        if (!myTeamId) {
            console.warn("testIncomingChallenge: Nessuna squadra selezionata");
            return;
        }

        // Crea sfida fake
        const fakeChallenge = {
            id: 'test_' + Date.now(),
            challengerId: 'test_team_123',
            challengerName: 'Squadra Test Bot',
            challengerFormation: [
                { name: 'Bot GK', ruolo: 'P', level: 10 },
                { name: 'Bot DEF', ruolo: 'D', level: 8 },
                { name: 'Bot MID1', ruolo: 'C', level: 7 },
                { name: 'Bot MID2', ruolo: 'C', level: 7 },
                { name: 'Bot ATT', ruolo: 'A', level: 9 }
            ],
            challengedId: myTeamId,
            challengedName: myTeamName,
            challengedFormation: window.InterfacciaCore?.currentTeamData?.formation?.titolari?.slice(0, 5) || [],
            attackerId: Math.random() < 0.5 ? 'test_team_123' : myTeamId,
            defenderId: null, // Verra' impostato sotto
            status: 'pending',
            createdAt: { toMillis: () => Date.now() }
        };
        fakeChallenge.defenderId = fakeChallenge.attackerId === 'test_team_123' ? myTeamId : 'test_team_123';

        // Debug: console.log("testIncomingChallenge: Simulazione sfida", fakeChallenge);

        // Mostra modal
        showIncomingChallengeModal(fakeChallenge);

        return fakeChallenge;
    }

    /**
     * Test completo: crea sfida su Firestore e simula flusso
     * Uso: await window.SfideMultiplayer.testCreateChallenge()
     */
    async function testCreateChallenge() {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const myTeamName = window.InterfacciaCore?.currentTeamData?.teamName || 'La Mia Squadra';
        const myFormation = window.InterfacciaCore?.currentTeamData?.formation?.titolari?.slice(0, 5) || [];

        if (!myTeamId || myFormation.length < 5) {
            console.warn("testCreateChallenge: Squadra non valida o formazione incompleta");
            if (window.Toast) window.Toast.error("Imposta prima una formazione con 5 titolari");
            return null;
        }

        try {
            const { collection, addDoc, Timestamp } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            // Ruoli casuali
            const iAmAttacker = Math.random() < 0.5;

            const challenge = {
                challengerId: 'bot_team_test',
                challengerName: 'Bot Tester',
                challengerFormation: [
                    { name: 'Bot Portiere', ruolo: 'P', level: 8 },
                    { name: 'Bot Difensore', ruolo: 'D', level: 7 },
                    { name: 'Bot Centrale 1', ruolo: 'C', level: 6 },
                    { name: 'Bot Centrale 2', ruolo: 'C', level: 6 },
                    { name: 'Bot Attaccante', ruolo: 'A', level: 8 }
                ],
                challengedId: myTeamId,
                challengedName: myTeamName,
                challengedFormation: myFormation,
                attackerId: iAmAttacker ? myTeamId : 'bot_team_test',
                defenderId: iAmAttacker ? 'bot_team_test' : myTeamId,
                status: 'pending',
                createdAt: Timestamp.now(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            };

            const docRef = await addDoc(collection(window.db, path), challenge);
            // Debug: console.log("testCreateChallenge: Sfida creata:", docRef.id);

            if (window.Toast) window.Toast.success("Sfida test creata! Controlla le notifiche.");

            return { id: docRef.id, ...challenge };
        } catch (error) {
            console.error("testCreateChallenge: Errore creazione sfida:", error);
            if (window.Toast) window.Toast.error("Errore creazione sfida test");
            return null;
        }
    }

    // ========================================
    // ESPOSIZIONE MODULO
    // ========================================
    return {
        init,
        showChallengeModal,
        destroy,

        // Presenza online
        startPresenceHeartbeat,
        stopPresenceHeartbeat,

        // Getters
        isInMatch: () => state.isInMatch,
        getCurrentChallengeId: () => state.currentChallengeId,
        getMyRole: () => state.myRole,

        // Test/Debug
        testIncomingChallenge,
        testCreateChallenge,

        // Costanti e funzioni per generazione stato partita (FONTE DI VERITA')
        GRID_W,
        GRID_H,
        generateTeamPlayers,
        createInitialGameState
    };

})();

// Init quando DOM pronto
document.addEventListener('DOMContentLoaded', () => {
    const checkAndInit = () => {
        if (window.InterfacciaCore?.currentTeamId && window.db && window.firestoreTools) {
            window.SfideMultiplayer.init();
        } else {
            setTimeout(checkAndInit, 2000);
        }
    };
    setTimeout(checkAndInit, 3000);
});

console.log('[OK] Modulo SfideMultiplayer caricato.');
