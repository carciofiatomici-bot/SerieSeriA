//
// ====================================================================
// SFIDE MINIGAME - Futsal Tactics (Gioco Tattico a Turni)
// ====================================================================
// Gioco tattico su griglia per sfide (btn-challenge)
// - Campo 11x7 celle
// - 5 giocatori per squadra (GK, FIX, ALA, ALA, PIV)
// - 3 azioni per turno
// - Primo a 3 gol vince
// ====================================================================
//

(function() {
    'use strict';

    // ========================================
    // CONFIGURAZIONE
    // ========================================
    const GRID_W = 11;
    const GRID_H = 7;
    const GOAL_LIMIT = 3;

    // ========================================
    // STATO DEL GIOCO
    // ========================================
    let state = {
        scoreA: 0,
        scoreB: 0,
        currentTeam: 'A',
        actionsLeft: 3,
        selectedPlayer: null,
        ballCarrierId: 'A5',
        ballPosition: null, // Per palla libera in zona
        isGameOver: false,
        testMode: false,
        onComplete: null,
        actionMode: null // 'pass', 'shot' o null
    };

    const initialPlayers = [
        { id: 'A1', team: 'A', name: 'GK', x: 0, y: 3, mod: 8, isGK: true, mura: false, muraCells: [] },
        { id: 'A2', team: 'A', name: 'FIX', x: 2, y: 3, mod: 6, isGK: false, mura: false, muraCells: [] },
        { id: 'A3', team: 'A', name: 'ALA', x: 4, y: 1, mod: 5, isGK: false, mura: false, muraCells: [] },
        { id: 'A4', team: 'A', name: 'ALA', x: 4, y: 5, mod: 5, isGK: false, mura: false, muraCells: [] },
        { id: 'A5', team: 'A', name: 'PIV', x: 5, y: 3, mod: 7, isGK: false, mura: false, muraCells: [] },

        { id: 'B1', team: 'B', name: 'GK', x: 10, y: 3, mod: 8, isGK: true, mura: false, muraCells: [] },
        { id: 'B2', team: 'B', name: 'FIX', x: 8, y: 3, mod: 6, isGK: false, mura: false, muraCells: [] },
        { id: 'B3', team: 'B', name: 'ALA', x: 6, y: 1, mod: 5, isGK: false, mura: false, muraCells: [] },
        { id: 'B4', team: 'B', name: 'ALA', x: 6, y: 5, mod: 5, isGK: false, mura: false, muraCells: [] },
        { id: 'B5', team: 'B', name: 'PIV', x: 6, y: 3, mod: 7, isGK: false, mura: false, muraCells: [] }
    ];

    let players = [];

    // Elementi DOM
    let modal = null;

    // ========================================
    // INIZIALIZZAZIONE
    // ========================================

    function init() {
        if (modal) return;

        modal = document.createElement('div');
        modal.id = 'sfide-minigame-modal';
        modal.className = 'fixed inset-0 bg-slate-900 z-50 hidden flex flex-col';
        modal.innerHTML = `
            <style>
                #sfide-minigame-modal .pitch {
                    display: grid;
                    grid-template-columns: repeat(11, 1fr);
                    grid-template-rows: repeat(7, 1fr);
                    background-color: #15803d;
                    border: 4px solid #f8fafc;
                    position: relative;
                    aspect-ratio: 11 / 7;
                    width: 95%;
                    max-width: 800px;
                    margin: 0 auto;
                    box-shadow: 0 0 50px rgba(0,0,0,0.5);
                }

                /* Mobile Portrait: Campo verticale (7x11 invece di 11x7) */
                @media screen and (max-width: 768px) and (orientation: portrait) {
                    #sfide-minigame-modal .pitch {
                        grid-template-columns: repeat(7, 1fr);
                        grid-template-rows: repeat(11, 1fr);
                        aspect-ratio: 7 / 11;
                        width: 85%;
                        max-width: none;
                    }
                    #sfide-minigame-modal .goal-post {
                        width: 42.85% !important;
                        height: 10px !important;
                        left: 28.57% !important;
                        top: auto !important;
                        right: auto !important;
                    }
                    #sfide-minigame-modal .goal-left {
                        top: -10px !important;
                        bottom: auto !important;
                        border-radius: 4px 4px 0 0 !important;
                    }
                    #sfide-minigame-modal .goal-right {
                        bottom: -10px !important;
                        top: auto !important;
                        border-radius: 0 0 4px 4px !important;
                    }
                    #sfide-minigame-modal .smg-header {
                        padding: 0.5rem !important;
                    }
                    #sfide-minigame-modal .smg-header h1 {
                        font-size: 0.875rem !important;
                    }
                    #sfide-minigame-modal .smg-scoreboard {
                        padding: 0.5rem !important;
                    }
                    #sfide-minigame-modal .smg-controls {
                        padding: 0.5rem !important;
                    }
                }
                #sfide-minigame-modal .cell {
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    cursor: pointer;
                }
                #sfide-minigame-modal .cell:hover { background-color: rgba(255, 255, 255, 0.1); }
                #sfide-minigame-modal .cell.highlight-move { background-color: rgba(255, 255, 255, 0.25); }
                #sfide-minigame-modal .cell.highlight-target { background-color: rgba(248, 113, 113, 0.5); }
                #sfide-minigame-modal .cell.highlight-pass { background-color: rgba(74, 222, 128, 0.4); }
                #sfide-minigame-modal .cell.highlight-shot { background-color: rgba(251, 191, 36, 0.5); }
                #sfide-minigame-modal .cell.highlight-mura {
                    background-color: rgba(99, 102, 241, 0.3);
                    box-shadow: inset 0 0 10px rgba(99, 102, 241, 0.5);
                }

                #sfide-minigame-modal .player-token {
                    width: 75%;
                    height: 75%;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 0.65rem;
                    z-index: 10;
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border: 3px solid rgba(0,0,0,0.3);
                    position: relative;
                }
                #sfide-minigame-modal .team-a { background: linear-gradient(135deg, #ef4444, #991b1b); color: white; }
                #sfide-minigame-modal .team-b { background: linear-gradient(135deg, #3b82f6, #1e3a8a); color: white; }
                #sfide-minigame-modal .player-token.selected {
                    transform: scale(1.3);
                    border-color: #fbbf24;
                    box-shadow: 0 0 20px #fbbf24;
                }

                #sfide-minigame-modal .mod-tag {
                    position: absolute;
                    bottom: -6px;
                    background: #1e293b;
                    padding: 0 3px;
                    border-radius: 3px;
                    font-size: 0.55rem;
                    border: 1px solid #475569;
                }

                #sfide-minigame-modal .mura-effect::after {
                    content: '';
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    font-size: 0.9rem;
                    animation: smg-bounce 1s infinite;
                }

                #sfide-minigame-modal .ball-token {
                    width: 12px;
                    height: 12px;
                    background: radial-gradient(circle at 30% 30%, #fff, #999);
                    border-radius: 50%;
                    position: absolute;
                    transition: all 0.4s ease-out;
                    z-index: 30;
                    border: 1px solid #000;
                    pointer-events: none;
                }

                #sfide-minigame-modal .goal-post {
                    position: absolute;
                    width: 10px;
                    height: 42.85%;
                    top: 28.57%;
                    background: #fff;
                    border: 2px solid #333;
                    z-index: 5;
                }
                #sfide-minigame-modal .goal-left { left: -10px; border-radius: 4px 0 0 4px; }
                #sfide-minigame-modal .goal-right { right: -10px; border-radius: 0 4px 4px 0; }

                @keyframes smg-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }

                #sfide-minigame-modal .log-entry {
                    animation: smg-slideIn 0.3s ease-out;
                }
                @keyframes smg-slideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                /* Bottoni azione attivi */
                #sfide-minigame-modal .action-btn.active {
                    ring: 2px;
                    ring-color: white;
                    transform: scale(1.05);
                }
            </style>

            <!-- Game Container -->
            <div class="game-container flex flex-col h-full w-full bg-slate-900">
                <!-- Header -->
                <div class="smg-header flex justify-between items-center p-3 bg-slate-800 border-b border-slate-700">
                    <button id="smg-close-btn" class="text-white text-2xl hover:text-red-400 transition px-2">
                        <i class="fas fa-times"></i>
                    </button>
                    <h1 class="text-lg font-black italic tracking-tight text-white">FUTSAL TACTICS</h1>
                    <div class="w-8"></div>
                </div>

                <!-- Scoreboard -->
                <div class="smg-scoreboard flex justify-between items-center max-w-2xl mx-auto w-full p-3 bg-slate-800/50">
                    <div class="text-center">
                        <div class="text-xs text-slate-400 uppercase font-bold">Rossa</div>
                        <div id="smg-score-a" class="text-3xl font-black text-red-500">0</div>
                    </div>
                    <div class="flex flex-col items-center">
                        <div id="smg-turn-display" class="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                            TURNO ROSSO
                        </div>
                        <div id="smg-actions-display" class="flex gap-1 mt-1">
                            <div class="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                        </div>
                    </div>
                    <div class="text-center">
                        <div class="text-xs text-slate-400 uppercase font-bold">Blu</div>
                        <div id="smg-score-b" class="text-3xl font-black text-blue-500">0</div>
                    </div>
                </div>

                <!-- Campo -->
                <div class="flex-grow flex items-center justify-center p-2 overflow-hidden">
                    <div class="pitch" id="smg-pitch">
                        <div class="goal-post goal-left"></div>
                        <div class="goal-post goal-right"></div>
                        <div id="smg-ball" class="ball-token"></div>
                    </div>
                </div>

                <!-- Controlli -->
                <div class="smg-controls max-w-2xl mx-auto w-full grid grid-cols-2 gap-2 p-2">
                    <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
                        <div id="smg-selection-info" class="text-slate-400 text-xs italic">Seleziona un giocatore...</div>
                        <div id="smg-action-panel" class="hidden mt-2">
                            <div class="flex flex-wrap gap-2 items-center mb-2">
                                <button id="smg-btn-mura" class="action-btn bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded font-bold text-xs transition text-white">
                                    🛡️ Mura
                                </button>
                                <button id="smg-btn-pass" class="action-btn bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded font-bold text-xs transition text-white">
                                    ⚽ Passa
                                </button>
                                <button id="smg-btn-shot" class="action-btn bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded font-bold text-xs transition text-white">
                                    🥅 Tira
                                </button>
                            </div>
                            <div class="text-xs border-t border-slate-600 pt-2">
                                <span id="smg-stat-name" class="font-bold text-white">PIVOT</span>
                                <span id="smg-stat-mod" class="text-yellow-400 ml-1">+7</span>
                            </div>
                        </div>
                    </div>
                    <div id="smg-log" class="bg-black/40 rounded-lg p-2 border border-slate-800 overflow-y-auto text-xs font-mono max-h-24">
                        <div class="text-yellow-500">Primo a 3 gol vince!</div>
                    </div>
                </div>

                <!-- Game Over Modal -->
                <div id="smg-game-over" class="hidden fixed inset-0 bg-black/85 z-60 flex items-center justify-center backdrop-blur-sm">
                    <div class="bg-slate-800 p-6 rounded-xl border-2 border-slate-600 text-center shadow-2xl max-w-sm w-11/12">
                        <h2 class="text-2xl font-black italic mb-2 text-white">PARTITA CONCLUSA</h2>
                        <div id="smg-winner-text" class="text-lg font-bold mb-4 text-yellow-400 uppercase">SQUADRA ROSSA VINCE!</div>
                        <div class="space-y-2">
                            <button id="smg-btn-restart" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition">
                                🔄 NUOVA PARTITA
                            </button>
                            <button id="smg-btn-exit" class="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded-lg transition">
                                X CHIUDI
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setupEventListeners();
        console.log('[SfideMinigame] Inizializzato');
    }

    function setupEventListeners() {
        document.getElementById('smg-close-btn').addEventListener('click', close);
        document.getElementById('smg-btn-mura').addEventListener('click', (e) => {
            e.stopPropagation();
            performMura();
        });
        document.getElementById('smg-btn-pass').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleActionMode('pass');
        });
        document.getElementById('smg-btn-shot').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleActionMode('shot');
        });
        document.getElementById('smg-btn-restart').addEventListener('click', resetGame);
        document.getElementById('smg-btn-exit').addEventListener('click', close);
    }

    function isPortrait() {
        return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    }

    function buildPitch() {
        const pitch = document.getElementById('smg-pitch');
        // Rimuovi celle esistenti
        pitch.querySelectorAll('.cell').forEach(c => c.remove());

        const portrait = isPortrait();

        if (portrait) {
            // Portrait: griglia 7 colonne x 11 righe
            // Le coordinate x,y del gioco rimangono uguali (11x7)
            // ma le celle sono disposte ruotate di 90 gradi
            // x (0-10) diventa la riga (dall'alto verso il basso)
            // y (0-6) diventa la colonna (da sinistra a destra)
            for (let x = 0; x < GRID_W; x++) {
                for (let y = 0; y < GRID_H; y++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.x = x;
                    cell.dataset.y = y;
                    cell.addEventListener('click', () => onCellClick(x, y));
                    pitch.appendChild(cell);
                }
            }
        } else {
            // Landscape: griglia standard 11 colonne x 7 righe
            for (let y = 0; y < GRID_H; y++) {
                for (let x = 0; x < GRID_W; x++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.x = x;
                    cell.dataset.y = y;
                    cell.addEventListener('click', () => onCellClick(x, y));
                    pitch.appendChild(cell);
                }
            }
        }
    }

    // ========================================
    // LIFECYCLE
    // ========================================

    function open(options = {}) {
        init();

        state.testMode = options.testMode || false;
        state.onComplete = options.onComplete || null;

        // Forza landscape su mobile
        if (window.innerWidth < 768) {
            try {
                screen.orientation?.lock?.('landscape').catch(() => {});
            } catch(e) {}
        }

        resetGame();
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        console.log('[SfideMinigame] Aperto', { testMode: state.testMode });
    }

    function close() {
        if (modal) {
            modal.classList.add('hidden');
        }
        document.body.style.overflow = '';

        // Sblocca orientamento
        try {
            screen.orientation?.unlock?.();
        } catch(e) {}

        if (state.onComplete) {
            state.onComplete({
                scoreA: state.scoreA,
                scoreB: state.scoreB,
                winner: state.scoreA >= GOAL_LIMIT ? 'A' : (state.scoreB >= GOAL_LIMIT ? 'B' : null)
            });
        }

        console.log('[SfideMinigame] Chiuso');
    }

    function resetGame() {
        state.scoreA = 0;
        state.scoreB = 0;
        state.currentTeam = 'A';
        state.actionsLeft = 3;
        state.ballCarrierId = 'A5';
        state.ballPosition = null;
        state.isGameOver = false;
        state.selectedPlayer = null;
        state.actionMode = null;

        players = JSON.parse(JSON.stringify(initialPlayers));

        document.getElementById('smg-game-over').classList.add('hidden');
        document.getElementById('smg-log').innerHTML = '<div class="text-yellow-500">Nuova Partita! Inizia la Squadra Rossa.</div>';

        buildPitch();
        update();
    }

    // ========================================
    // GAME LOGIC
    // ========================================

    function toggleActionMode(mode) {
        if (state.actionMode === mode) {
            state.actionMode = null;
        } else {
            state.actionMode = mode;
        }
        updateHighlights();
        updateActionButtons();
    }

    function updateActionButtons() {
        const btnPass = document.getElementById('smg-btn-pass');
        const btnShot = document.getElementById('smg-btn-shot');

        btnPass.classList.toggle('ring-2', state.actionMode === 'pass');
        btnPass.classList.toggle('ring-white', state.actionMode === 'pass');
        btnShot.classList.toggle('ring-2', state.actionMode === 'shot');
        btnShot.classList.toggle('ring-white', state.actionMode === 'shot');
    }

    function onCellClick(x, y) {
        if (state.isGameOver) return;

        const playerAt = players.find(p => p.x === x && p.y === y);

        // Modalita' passaggio attiva
        if (state.actionMode === 'pass' && state.selectedPlayer && state.ballCarrierId === state.selectedPlayer.id) {
            executePass(state.selectedPlayer, { x, y, id: playerAt?.id });
            state.actionMode = null;
            updateActionButtons();
            return;
        }

        // Modalita' tiro attiva
        if (state.actionMode === 'shot' && state.selectedPlayer && state.ballCarrierId === state.selectedPlayer.id) {
            const targetGoalX = state.currentTeam === 'A' ? GRID_W - 1 : 0;
            if (x === targetGoalX && y >= 2 && y <= 4) {
                executeShot(state.selectedPlayer, y);
                state.actionMode = null;
                updateActionButtons();
            } else {
                logMsg("Clicca sulla porta avversaria!", "text-orange-400");
            }
            return;
        }

        // Selezione giocatore della propria squadra
        if (playerAt && playerAt.team === state.currentTeam) {
            state.selectedPlayer = playerAt;
            state.actionMode = null;
            updateHighlights();
        } else if (state.selectedPlayer) {
            handleAction(x, y);
        }
        update();
    }

    function updateHighlights() {
        document.querySelectorAll('#smg-pitch .cell').forEach(c => {
            c.classList.remove('highlight-move', 'highlight-target', 'highlight-pass', 'highlight-shot', 'highlight-mura');
        });

        if (!state.selectedPlayer) return;

        const sp = state.selectedPlayer;
        const isCarrier = state.ballCarrierId === sp.id;

        // Modalita' passaggio
        if (state.actionMode === 'pass' && isCarrier) {
            // Evidenzia tutti i compagni e celle vuote per passaggio
            players.filter(p => p.team === state.currentTeam && p.id !== sp.id).forEach(p => {
                const cell = getCell(p.x, p.y);
                if (cell) cell.classList.add('highlight-pass');
            });
            // Celle vuote
            for (let y = 0; y < GRID_H; y++) {
                for (let x = 0; x < GRID_W; x++) {
                    if (!players.find(p => p.x === x && p.y === y)) {
                        getCell(x, y)?.classList.add('highlight-pass');
                    }
                }
            }
            return;
        }

        // Modalita' tiro
        if (state.actionMode === 'shot' && isCarrier) {
            const targetGoalX = state.currentTeam === 'A' ? GRID_W - 1 : 0;
            for (let gy = 2; gy <= 4; gy++) {
                getCell(targetGoalX, gy)?.classList.add('highlight-shot');
            }
            return;
        }

        // Celle adiacenti per movimento
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const tx = sp.x + dx;
                const ty = sp.y + dy;
                if (tx >= 0 && tx < GRID_W && ty >= 0 && ty < GRID_H) {
                    const cell = getCell(tx, ty);
                    const p = players.find(pl => pl.x === tx && pl.y === ty);
                    if (!p) {
                        cell.classList.add('highlight-move');
                    } else if (p.team !== state.currentTeam && state.ballCarrierId === p.id) {
                        cell.classList.add('highlight-target');
                    }
                }
            }
        }

        // Mostra celle difese da mura
        players.filter(p => p.mura && p.muraCells?.length > 0).forEach(p => {
            p.muraCells.forEach(mc => {
                getCell(mc.x, mc.y)?.classList.add('highlight-mura');
            });
        });
    }

    function handleAction(tx, ty) {
        const sp = state.selectedPlayer;
        const dist = Math.max(Math.abs(tx - sp.x), Math.abs(ty - sp.y));
        const playerAt = players.find(p => p.x === tx && p.y === ty);
        const isCarrier = state.ballCarrierId === sp.id;

        // Movimento
        if (dist === 1 && !playerAt) {
            sp.x = tx;
            sp.y = ty;
            sp.mura = false;
            sp.muraCells = [];
            logMsg(`${sp.name} si sposta.`);
            consumeAction();
            return;
        }

        // Tackle (su chi ha la palla)
        if (dist === 1 && playerAt && playerAt.team !== state.currentTeam) {
            if (state.ballCarrierId === playerAt.id) {
                executeTackle(sp, playerAt);
            } else {
                logMsg("Tackle solo su chi ha palla.", "text-gray-500");
            }
            return;
        }

        // Raccolta palla libera
        if (state.ballPosition && sp.x === state.ballPosition.x && sp.y === state.ballPosition.y) {
            state.ballCarrierId = sp.id;
            state.ballPosition = null;
            logMsg(`${sp.name} prende la palla!`, "text-green-400");
            return;
        }

        logMsg("Azione non valida.", "text-red-400");
    }

    function executeTackle(atk, def) {
        const rollAtk = d20() + atk.mod;
        const rollDef = d20() + def.mod + (def.mura ? 3 : 0);
        logMsg(`Tackle: ${atk.name}(${rollAtk}) vs ${def.name}(${rollDef})`);

        if (rollAtk > rollDef) {
            state.ballCarrierId = atk.id;
            logMsg("Palla rubata!", "text-green-400");
        } else {
            logMsg("Tackle fallito.", "text-red-400");
        }
        consumeAction();
    }

    function executePass(from, target) {
        // target = { x, y, id (opzionale) }
        const path = getLinePath(from.x, from.y, target.x, target.y);
        const malus = path.length; // -1 per ogni cella attraversata

        logMsg(`Passaggio (${path.length} celle)...`);

        // Controlla intercettazioni lungo il percorso
        for (let i = 0; i < path.length; i++) {
            const cell = path[i];

            // Trova difensori nella cella o con mura che copre la cella
            const defenders = players.filter(p =>
                p.team !== state.currentTeam &&
                ((p.x === cell.x && p.y === cell.y) ||
                 (p.mura && p.muraCells?.some(mc => mc.x === cell.x && mc.y === cell.y)))
            );

            for (const defender of defenders) {
                const interceptionRoll = d20() + defender.mod + (defender.mura ? 3 : 0);
                const difficulty = 12 + Math.floor(malus / 2);

                if (interceptionRoll >= difficulty) {
                    state.ballCarrierId = defender.id;
                    defender.mura = false;
                    defender.muraCells = [];
                    logMsg(`INTERCETTATO da ${defender.name}! (${interceptionRoll} vs ${difficulty})`, "text-red-400");
                    consumeAction();
                    return;
                }
            }
        }

        // Passaggio riuscito
        const passRoll = d20() + from.mod - malus;
        const difficulty = 8;

        if (passRoll >= difficulty) {
            if (target.id) {
                // Passaggio a giocatore
                state.ballCarrierId = target.id;
                const receiver = players.find(p => p.id === target.id);
                logMsg(`Passaggio a ${receiver?.name}! (${passRoll} vs ${difficulty})`, "text-green-400");
            } else {
                // Passaggio in zona
                state.ballCarrierId = null;
                state.ballPosition = { x: target.x, y: target.y };
                logMsg(`Palla in zona! (${passRoll} vs ${difficulty})`, "text-green-400");
            }
        } else {
            state.ballCarrierId = null;
            state.ballPosition = null;
            logMsg(`Passaggio fuori! (${passRoll} vs ${difficulty})`, "text-orange-400");
        }
        consumeAction();
    }

    function executeShot(atk, targetY) {
        const gk = players.find(p => p.team !== state.currentTeam && p.isGK);
        const goalX = state.currentTeam === 'A' ? GRID_W - 1 : 0;
        const path = getLinePath(atk.x, atk.y, goalX, targetY);
        const malus = path.length;

        logMsg(`Tiro! (${path.length} celle)...`);

        // Controlla blocchi lungo traiettoria (escluso portiere)
        for (const cell of path) {
            const blockers = players.filter(p =>
                p.team !== state.currentTeam && !p.isGK &&
                ((p.x === cell.x && p.y === cell.y) ||
                 (p.mura && p.muraCells?.some(mc => mc.x === cell.x && mc.y === cell.y)))
            );

            for (const blocker of blockers) {
                const blockRoll = d20() + blocker.mod + (blocker.mura ? 3 : 0);
                if (blockRoll >= 15) {
                    state.ballCarrierId = blocker.id;
                    blocker.mura = false;
                    blocker.muraCells = [];
                    logMsg(`BLOCCATO da ${blocker.name}! (${blockRoll})`, "text-blue-400");
                    consumeAction();
                    return;
                }
            }
        }

        // Tiro vs Portiere
        const shotRoll = d20() + atk.mod - Math.floor(malus / 2);
        const saveRoll = d20() + gk.mod + 2;

        logMsg(`Tiro: ${shotRoll} vs GK: ${saveRoll}`);

        if (shotRoll > saveRoll) {
            // GOAL!
            if (state.currentTeam === 'A') state.scoreA++;
            else state.scoreB++;
            logMsg("GOOOOL!!!", "text-yellow-400 font-bold");
            checkWinCondition();
            if (!state.isGameOver) handleGoalReset();
        } else {
            logMsg("PARATA!", "text-blue-400");
            state.ballCarrierId = gk.id;
            consumeAction();
        }
    }

    function checkWinCondition() {
        if (state.scoreA >= GOAL_LIMIT || state.scoreB >= GOAL_LIMIT) {
            state.isGameOver = true;
            const gameOverModal = document.getElementById('smg-game-over');
            const winText = document.getElementById('smg-winner-text');

            if (state.scoreA >= GOAL_LIMIT) {
                winText.innerText = "SQUADRA ROSSA VINCE!";
                winText.className = "text-lg font-bold mb-4 text-red-400 uppercase";
            } else {
                winText.innerText = "SQUADRA BLU VINCE!";
                winText.className = "text-lg font-bold mb-4 text-blue-400 uppercase";
            }
            gameOverModal.classList.remove('hidden');
        }
    }

    function handleGoalReset() {
        // Resetta posizioni
        resetPositions();

        // La squadra che ha SUBITO il goal inizia con la palla
        const scoringTeam = state.currentTeam;
        const receivingTeam = scoringTeam === 'A' ? 'B' : 'A';

        // Assegna palla al pivot della squadra che ha subito
        const pivot = players.find(p => p.team === receivingTeam && p.name === 'PIV');
        state.ballCarrierId = pivot ? pivot.id : players.find(p => p.team === receivingTeam && !p.isGK)?.id;
        state.ballPosition = null;

        // Il turno passa a chi ha subito il goal
        state.currentTeam = receivingTeam;
        state.actionsLeft = 3;
        state.selectedPlayer = null;
        state.actionMode = null;

        logMsg(`--- RIPRESA: TURNO ${receivingTeam === 'A' ? 'ROSSO' : 'BLU'} ---`, "text-yellow-500 font-bold");

        update();
    }

    function performMura() {
        const sp = state.selectedPlayer;
        if (!sp) {
            logMsg("Seleziona un giocatore!", "text-orange-400");
            return;
        }
        if (state.ballCarrierId === sp.id) {
            logMsg("Chi ha la palla non puo fare mura!", "text-orange-400");
            return;
        }
        if (sp.mura) {
            logMsg("Gia in mura!", "text-gray-500");
            return;
        }

        sp.mura = true;
        // Celle difese: posizione corrente + 2 celle laterali (y-1 e y+1)
        sp.muraCells = [
            { x: sp.x, y: sp.y }
        ];
        if (sp.y > 0) sp.muraCells.push({ x: sp.x, y: sp.y - 1 });
        if (sp.y < GRID_H - 1) sp.muraCells.push({ x: sp.x, y: sp.y + 1 });

        logMsg(`${sp.name} in MURA! (difende ${sp.muraCells.length} celle)`);
        consumeAction();
    }

    function consumeAction() {
        state.actionsLeft--;
        state.selectedPlayer = null;
        state.actionMode = null;
        document.querySelectorAll('#smg-pitch .cell').forEach(c => {
            c.classList.remove('highlight-move', 'highlight-target', 'highlight-pass', 'highlight-shot');
        });
        updateActionButtons();
        if (state.actionsLeft <= 0) {
            switchTurn();
        }
        update();
    }

    function switchTurn() {
        state.currentTeam = state.currentTeam === 'A' ? 'B' : 'A';
        state.actionsLeft = 3;
        // Resetta mura della squadra che sta per giocare
        players.filter(p => p.team === state.currentTeam).forEach(p => {
            p.mura = false;
            p.muraCells = [];
        });
        logMsg(`--- TURNO ${state.currentTeam === 'A' ? 'ROSSO' : 'BLU'} ---`, "text-yellow-500 font-bold");
    }

    function resetPositions() {
        const startPos = {
            'A1': [0, 3], 'A2': [2, 3], 'A3': [4, 1], 'A4': [4, 5], 'A5': [5, 3],
            'B1': [10, 3], 'B2': [8, 3], 'B3': [6, 1], 'B4': [6, 5], 'B5': [6, 3]
        };
        players.forEach(p => {
            p.x = startPos[p.id][0];
            p.y = startPos[p.id][1];
            p.mura = false;
            p.muraCells = [];
        });
    }

    // ========================================
    // UPDATE / RENDER
    // ========================================

    function update() {
        // Punteggi
        document.getElementById('smg-score-a').innerText = state.scoreA;
        document.getElementById('smg-score-b').innerText = state.scoreB;

        // Turno
        const turnDisp = document.getElementById('smg-turn-display');
        turnDisp.innerText = `TURNO ${state.currentTeam === 'A' ? 'ROSSO' : 'BLU'}`;
        turnDisp.className = `px-3 py-1 rounded-full text-xs font-bold ${state.currentTeam === 'A' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`;

        // Azioni rimanenti
        const dots = document.getElementById('smg-actions-display').children;
        for (let i = 0; i < 3; i++) {
            dots[i].style.opacity = i < state.actionsLeft ? "1" : "0.2";
        }

        // Giocatori
        document.querySelectorAll('.player-token').forEach(e => e.remove());
        players.forEach(p => {
            const cell = getCell(p.x, p.y);
            if (!cell) return;

            const el = document.createElement('div');
            el.className = `player-token team-${p.team.toLowerCase()} ${state.selectedPlayer?.id === p.id ? 'selected' : ''} ${p.mura ? 'mura-effect' : ''}`;
            el.innerHTML = `<span>${p.name}</span><div class="mod-tag">+${p.mod}</div>`;
            cell.appendChild(el);
        });

        // Palla
        const ball = document.getElementById('smg-ball');
        const carrier = players.find(p => p.id === state.ballCarrierId);
        const pitch = document.getElementById('smg-pitch');

        if (carrier) {
            const cCell = getCell(carrier.x, carrier.y);
            if (cCell && pitch) {
                const rect = cCell.getBoundingClientRect();
                const pRect = pitch.getBoundingClientRect();
                ball.style.left = (rect.left - pRect.left + rect.width * 0.7) + 'px';
                ball.style.top = (rect.top - pRect.top + rect.height * 0.7) + 'px';
                ball.style.display = 'block';
            }
        } else if (state.ballPosition) {
            // Palla libera in zona
            const zCell = getCell(state.ballPosition.x, state.ballPosition.y);
            if (zCell && pitch) {
                const rect = zCell.getBoundingClientRect();
                const pRect = pitch.getBoundingClientRect();
                ball.style.left = (rect.left - pRect.left + rect.width * 0.45) + 'px';
                ball.style.top = (rect.top - pRect.top + rect.height * 0.45) + 'px';
                ball.style.display = 'block';
            }
        } else {
            // Palla uscita
            ball.style.display = 'none';
        }

        // Pannello selezione
        const panel = document.getElementById('smg-action-panel');
        const info = document.getElementById('smg-selection-info');

        if (state.selectedPlayer) {
            panel.classList.remove('hidden');
            info.classList.add('hidden');
            const hasBall = state.ballCarrierId === state.selectedPlayer.id;
            document.getElementById('smg-stat-name').innerText = state.selectedPlayer.name + (hasBall ? " (PALLA)" : "");
            document.getElementById('smg-stat-mod').innerText = "+" + state.selectedPlayer.mod;

            // Mostra/nascondi bottoni in base allo stato
            document.getElementById('smg-btn-mura').style.display = hasBall ? "none" : "inline-block";
            document.getElementById('smg-btn-pass').style.display = hasBall ? "inline-block" : "none";
            document.getElementById('smg-btn-shot').style.display = hasBall ? "inline-block" : "none";
        } else {
            panel.classList.add('hidden');
            info.classList.remove('hidden');
        }

        // Aggiorna highlights delle celle mura
        updateHighlights();
    }

    // ========================================
    // UTILITIES
    // ========================================

    function getCell(x, y) {
        return document.querySelector(`#smg-pitch .cell[data-x="${x}"][data-y="${y}"]`);
    }

    function d20() {
        return Math.floor(Math.random() * 20) + 1;
    }

    function logMsg(txt, colorClass = "text-white") {
        const log = document.getElementById('smg-log');
        const div = document.createElement('div');
        div.className = "log-entry " + colorClass;
        div.innerText = `> ${txt}`;
        log.prepend(div);

        // Limita log a 20 messaggi
        while (log.children.length > 20) {
            log.removeChild(log.lastChild);
        }
    }

    /**
     * Calcola il percorso lineare tra due punti (algoritmo Bresenham)
     */
    function getLinePath(x1, y1, x2, y2) {
        const path = [];
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        let x = x1, y = y1;

        while (true) {
            if (x !== x1 || y !== y1) {
                path.push({ x, y });
            }
            if (x === x2 && y === y2) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }

        return path;
    }

    // ========================================
    // ESPOSIZIONE MODULO
    // ========================================

    window.SfideMinigame = {
        init,
        open,
        close,
        getState: () => ({
            scoreA: state.scoreA,
            scoreB: state.scoreB,
            isGameOver: state.isGameOver
        })
    };

    console.log('[OK] Modulo SfideMinigame (Futsal Tactics) caricato.');

})();
