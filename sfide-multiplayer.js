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
        MOVES_PER_TURN: 3,
        TURN_TIMEOUT_MS: 30000,  // 30 secondi per mossa
        CHALLENGE_EXPIRE_MS: 5 * 60 * 1000, // 5 minuti per accettare
        GOAL_LIMIT: 3,
        TEAMS_CACHE_MS: 5 * 60 * 1000 // Cache squadre 5 minuti
    };

    // Cache per ridurre letture
    let teamsCache = {
        data: null,
        timestamp: 0
    };

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

        // Ascolta sfide in arrivo
        startListeningForChallenges();

        // Controlla se c'e' una partita in corso da riprendere
        checkForActiveMatch();

        console.log('[SfideMultiplayer] Inizializzato per team:', state.myTeamId);
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

            // Prendi la prima partita trovata
            const matchDoc = snap1.docs[0] || snap2.docs[0];

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
            const { doc, updateDoc } = window.firestoreTools;
            const path = getMinigameChallengesPath();

            // Chi abbandona perde
            const myTeamLetter = state.myTeamId === state.challengerId ? 'A' : 'B';
            const winnerId = myTeamLetter === 'A' ? 'B' : 'A';

            await updateDoc(doc(window.db, path, matchId), {
                status: 'completed',
                'gameState.isGameOver': true,
                'gameState.winner': winnerId,
                'gameState.abandonedBy': state.myTeamId
            });

            if (window.Toast) window.Toast.info('Partita abbandonata');
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
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl max-w-md w-full p-6 border-2 border-indigo-500 shadow-2xl">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold text-indigo-400 flex items-center gap-2">
                        <span>🎮</span> Sfida Tattica
                    </h2>
                    <button id="close-minigame-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <p class="text-gray-300 mb-4">
                    Sfida un'altra squadra nel minigame tattico!
                    I ruoli (attaccante/difensore) saranno assegnati casualmente.
                </p>

                <div class="mb-4">
                    <label class="block text-sm text-gray-400 mb-2">Squadra avversaria</label>
                    <select id="minigame-target-team" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        <option value="">Caricamento squadre...</option>
                    </select>
                </div>

                <div id="minigame-target-info" class="hidden mb-4 p-3 bg-gray-900 rounded-lg">
                    <p class="text-sm text-gray-400">Info squadra selezionata</p>
                </div>

                <div class="bg-indigo-900/30 border border-indigo-600/50 rounded-lg p-3 mb-4">
                    <h4 class="text-indigo-300 font-bold mb-2">Regole:</h4>
                    <ul class="text-sm text-gray-300 space-y-1">
                        <li>• 3 mosse per turno</li>
                        <li>• 20 secondi per mossa</li>
                        <li>• Primo a 3 gol vince</li>
                        <li>• Giocatori dalla tua formazione</li>
                    </ul>
                </div>

                <div class="flex gap-3">
                    <button id="btn-send-minigame-challenge" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                        <span>🎮</span> Invia Sfida
                    </button>
                    <button id="btn-cancel-minigame" class="px-6 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">
                        Annulla
                    </button>
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

        // Usa cache se valida (riduce letture Firestore)
        const cacheValid = teamsCache.data &&
            (Date.now() - teamsCache.timestamp < CONFIG.TEAMS_CACHE_MS);

        if (cacheValid) {
            console.log("[SfideMultiplayer] Usando cache squadre");
            const teams = teamsCache.data.filter(t => t.id !== myTeamId);
            state.availableTeams = teams;
            populateTeamsSelect(select, teams);
            return;
        }

        try {
            const { collection, getDocs } = window.firestoreTools;
            const teamsPath = getTeamsPath();

            const snapshot = await getDocs(collection(window.db, teamsPath));
            const allTeams = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Solo squadre con formazione valida (almeno 5 titolari)
                if (data.teamName && data.formation?.titolari?.length >= 5) {
                    allTeams.push({
                        id: doc.id,
                        teamName: data.teamName,
                        formation: data.formation
                    });
                }
            });

            // Salva in cache
            teamsCache = {
                data: allTeams,
                timestamp: Date.now()
            };

            const teams = allTeams.filter(t => t.id !== myTeamId);
            state.availableTeams = teams;
            populateTeamsSelect(select, teams);

        } catch (error) {
            console.error("[SfideMultiplayer] Errore caricamento squadre:", error);
            select.innerHTML = '<option value="">Errore caricamento</option>';
        }
    }

    function populateTeamsSelect(select, teams) {
        if (teams.length === 0) {
            select.innerHTML = '<option value="">Nessuna squadra disponibile</option>';
            return;
        }
        select.innerHTML = '<option value="">Seleziona squadra...</option>' +
            teams.map(t => `<option value="${t.id}">${t.teamName}</option>`).join('');
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

        infoDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl">⚽</div>
                <div>
                    <p class="font-bold text-white">${team.teamName}</p>
                    <p class="text-sm text-gray-400">${titolariCount} titolari in formazione</p>
                </div>
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
                challengerFormation: myTeam?.formation?.titolari?.slice(0, 5) || [],

                challengedId: targetTeamId,
                challengedName: targetTeam?.teamName || 'Squadra',
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

        // Listener per cancellazione
        document.getElementById('btn-cancel-waiting').addEventListener('click', async () => {
            await cancelChallenge(challengeId);
            modal.remove();
        });

        // Ascolta stato sfida
        listenToChallengeStatus(challengeId, modal);
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
                        3 mosse per turno • 20 sec per mossa • Primo a 3 gol
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
        const GRID_W = 13;
        const GRID_H = 9;
        const centerY = Math.floor(GRID_H / 2);

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
        const startingPivot = startingTeamPlayers.find(p => p.name === 'PIV') || startingTeamPlayers[startingTeamPlayers.length - 1];

        return {
            players: [...challengerPlayers, ...challengedPlayers],
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
        const isLeft = team === 'A';
        const centerY = Math.floor(GRID_H / 2);

        // Prendi solo i primi 5 giocatori dalla formazione
        const titolari = formation?.slice(0, 5) || [];

        // Ruoli: P, D, C, C, A (o simili)
        const rolePositions = {
            'A': { // Team A (sinistra - attaccante)
                'P': { x: 0, y: centerY, name: 'GK', mod: 8, isGK: true },
                'D': { x: 3, y: centerY, name: 'FIX', mod: 6, isGK: false },
                'C': [
                    { x: 4, y: 1, name: 'ALA', mod: 5, isGK: false },
                    { x: 4, y: GRID_H - 2, name: 'ALA', mod: 5, isGK: false }
                ],
                'A': { x: 5, y: centerY, name: 'PIV', mod: 7, isGK: false }
            },
            'B': { // Team B (destra - difensore)
                'P': { x: GRID_W - 1, y: centerY, name: 'GK', mod: 8, isGK: true },
                'D': { x: GRID_W - 4, y: centerY, name: 'FIX', mod: 6, isGK: false },
                'C': [
                    { x: GRID_W - 5, y: 1, name: 'ALA', mod: 5, isGK: false },
                    { x: GRID_W - 5, y: GRID_H - 2, name: 'ALA', mod: 5, isGK: false }
                ],
                'A': { x: GRID_W - 6, y: centerY, name: 'PIV', mod: 7, isGK: false }
            }
        };

        let cIndex = 0;
        let playerIndex = 1;

        titolari.forEach(p => {
            const role = p.ruolo || p.assignedPosition || 'C';
            const pos = rolePositions[team][role];

            let playerPos;
            if (Array.isArray(pos)) {
                playerPos = pos[cIndex % pos.length];
                cIndex++;
            } else {
                playerPos = pos;
            }

            if (!playerPos) {
                // Fallback per ruoli non mappati
                playerPos = rolePositions[team]['C'][0];
            }

            // Calcola modificatore dal livello del giocatore
            const level = p.level || p.currentLevel || p.livello || 5;
            const mod = Math.min(10, 5 + Math.floor(level / 6));

            players.push({
                id: `${team}${playerIndex}`,
                team: team,
                name: playerPos.name,
                playerName: p.name || 'Giocatore', // Nome reale
                x: playerPos.x,
                y: playerPos.y,
                mod: mod,
                isGK: playerPos.isGK,
                defenseMode: null,
                defenseCells: []
            });

            playerIndex++;
        });

        // Se meno di 5 giocatori, aggiungi default
        while (players.length < 5) {
            const defaultPos = rolePositions[team]['C'][players.length % 2];
            players.push({
                id: `${team}${players.length + 1}`,
                team: team,
                name: 'ALA',
                playerName: 'Riserva',
                x: defaultPos.x + (players.length % 2),
                y: defaultPos.y,
                mod: 5,
                isGK: false,
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
                onMove: (move) => sendMove(challengeId, move),
                onComplete: (result) => handleMatchComplete(challengeId, result)
            });
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

    async function sendMove(challengeId, move) {
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
            let gameState = { ...data.gameState };

            // Reset turni saltati quando faccio una mossa
            if (gameState.skippedTurns && gameState.skippedTurns[state.myTeamId]) {
                gameState.skippedTurns[state.myTeamId] = 0;
            }

            // Applica la mossa
            gameState = applyMove(gameState, move);

            // Verifica fine partita
            if (gameState.scoreA >= CONFIG.GOAL_LIMIT || gameState.scoreB >= CONFIG.GOAL_LIMIT) {
                gameState.isGameOver = true;
                // A = challenger (rosso), B = challenged (blu)
                gameState.winner = gameState.scoreA >= CONFIG.GOAL_LIMIT ? 'A' : 'B';
            }

            // Aggiorna Firestore
            const updateData = {
                gameState: gameState,
                'gameState.lastMoveAt': Date.now()
            };

            if (gameState.isGameOver) {
                updateData.status = 'completed';
            }

            await updateDoc(docRef, updateData);

        } catch (error) {
            console.error("[SfideMultiplayer] Errore invio mossa:", error);
        }
    }

    function applyMove(gameState, move) {
        // Applica la mossa allo stato
        // Questo viene delegato alla logica di sfide-minigame.js
        // che chiamera' sendMove con il nuovo stato

        // Decrementa mosse
        gameState.movesLeft--;

        // Se finite le mosse, passa il turno
        if (gameState.movesLeft <= 0) {
            // Trova l'altro team
            const currentIsAttacker = gameState.currentTurn === state.myTeamId && state.myRole === 'attacker';

            // Il turno passa all'altro
            // Questo richiede conoscere gli ID delle squadre...
            // Per ora lasciamo che il minigame gestisca il cambio turno
            gameState.movesLeft = CONFIG.MOVES_PER_TURN;
        }

        return gameState;
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
            console.error("[TEST] Nessuna squadra selezionata");
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

        console.log("[TEST] Simulazione sfida in arrivo:", fakeChallenge);

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
            console.error("[TEST] Squadra non valida o formazione incompleta");
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
            console.log("[TEST] Sfida creata su Firestore:", docRef.id);

            if (window.Toast) window.Toast.success("Sfida test creata! Controlla le notifiche.");

            return { id: docRef.id, ...challenge };
        } catch (error) {
            console.error("[TEST] Errore creazione sfida:", error);
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

        // Getters
        isInMatch: () => state.isInMatch,
        getCurrentChallengeId: () => state.currentChallengeId,
        getMyRole: () => state.myRole,

        // Test/Debug
        testIncomingChallenge,
        testCreateChallenge
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
