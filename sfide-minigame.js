//
// ====================================================================
// SFIDE MINIGAME - Tattiche Serie (Gioco Tattico a Turni)
// ====================================================================
// Gioco tattico su griglia per sfide (btn-challenge)
// - Campo 12x8 celle
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
    const GRID_W = 13;
    const GRID_H = 9;
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
        actionMode: null, // 'pass', 'shot' o null

        // Multiplayer
        multiplayer: false,
        challengeId: null,
        myRole: null, // 'attacker' o 'defender'
        myTeam: null, // 'A' o 'B'
        isMyTurn: true,
        onMove: null, // Callback per inviare mosse
        turnTimeRemaining: null
    };

    // Tipi di azioni difensive
    const DEFENSE_MODES = {
        MURA: 'mura',           // Blocca tiri
        INTERCETTO: 'intercetto', // Blocca passaggi
        BLOCCO: 'blocco'        // Blocca movimento
    };

    const initialPlayers = [
        // Squadra A (sinistra) - campo 13x9
        { id: 'A1', team: 'A', name: 'GK', x: 0, y: 4, mod: 8, isGK: true, defenseMode: null, defenseCells: [] },
        { id: 'A2', team: 'A', name: 'FIX', x: 3, y: 4, mod: 6, isGK: false, defenseMode: null, defenseCells: [] },
        { id: 'A3', team: 'A', name: 'ALA', x: 4, y: 1, mod: 5, isGK: false, defenseMode: null, defenseCells: [] },
        { id: 'A4', team: 'A', name: 'ALA', x: 4, y: 7, mod: 5, isGK: false, defenseMode: null, defenseCells: [] },
        { id: 'A5', team: 'A', name: 'PIV', x: 5, y: 4, mod: 7, isGK: false, defenseMode: null, defenseCells: [] },

        // Squadra B (destra) - campo 13x9
        { id: 'B1', team: 'B', name: 'GK', x: 12, y: 4, mod: 8, isGK: true, defenseMode: null, defenseCells: [] },
        { id: 'B2', team: 'B', name: 'FIX', x: 9, y: 4, mod: 6, isGK: false, defenseMode: null, defenseCells: [] },
        { id: 'B3', team: 'B', name: 'ALA', x: 8, y: 1, mod: 5, isGK: false, defenseMode: null, defenseCells: [] },
        { id: 'B4', team: 'B', name: 'ALA', x: 8, y: 7, mod: 5, isGK: false, defenseMode: null, defenseCells: [] },
        { id: 'B5', team: 'B', name: 'PIV', x: 7, y: 4, mod: 7, isGK: false, defenseMode: null, defenseCells: [] }
    ];

    let players = [];
    let initialPositions = {}; // Memorizza posizioni iniziali per reset dopo gol

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
                /* =====================================================
                   CAMPO DA CALCETTO - CELLE QUADRATE GARANTITE
                   ===================================================== */

                :root {
                    --smg-cell-size: min(calc((95vw - 8px) / 13), calc((60vh - 8px) / 9));
                    --smg-cols: 13;
                    --smg-rows: 9;
                }

                #sfide-minigame-modal .pitch-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    padding: 8px;
                    box-sizing: border-box;
                }

                #sfide-minigame-modal .pitch {
                    /* Griglia con celle di dimensione fissa */
                    display: grid;
                    grid-template-columns: repeat(var(--smg-cols), var(--smg-cell-size));
                    grid-template-rows: repeat(var(--smg-rows), var(--smg-cell-size));

                    /* Stile campo */
                    background: linear-gradient(135deg, #15803d 0%, #166534 50%, #14532d 100%);
                    border: 4px solid #f8fafc;
                    border-radius: 4px;
                    position: relative;

                    /* Dimensioni calcolate dalla griglia */
                    width: calc(var(--smg-cols) * var(--smg-cell-size));
                    height: calc(var(--smg-rows) * var(--smg-cell-size));

                    /* Effetti */
                    box-shadow:
                        0 0 60px rgba(0,0,0,0.6),
                        inset 0 0 100px rgba(0,0,0,0.15);
                }

                /* Texture erba sottile */
                #sfide-minigame-modal .pitch::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: repeating-linear-gradient(
                        90deg,
                        transparent,
                        transparent 2px,
                        rgba(255,255,255,0.02) 2px,
                        rgba(255,255,255,0.02) 4px
                    );
                    pointer-events: none;
                    z-index: 0;
                }

                /* ============ MOBILE LANDSCAPE ============ */
                @media screen and (max-width: 900px) and (orientation: landscape) {
                    :root {
                        --smg-cell-size: min(calc((98vw - 8px) / 13), calc((55vh - 8px) / 9));
                    }
                }

                /* ============ MOBILE PORTRAIT: Campo ruotato 9x13 ============ */
                @media screen and (max-width: 768px) and (orientation: portrait) {
                    :root {
                        --smg-cell-size: min(calc((94vw - 8px) / 9), calc((52vh - 8px) / 13));
                        --smg-cols: 9;
                        --smg-rows: 13;
                    }

                    #sfide-minigame-modal .pitch {
                        grid-template-columns: repeat(9, var(--smg-cell-size));
                        grid-template-rows: repeat(13, var(--smg-cell-size));
                        width: calc(9 * var(--smg-cell-size));
                        height: calc(13 * var(--smg-cell-size));
                    }

                    /* Porte ruotate (orizzontali in alto e basso) */
                    #sfide-minigame-modal .goal-post {
                        width: calc(3 * var(--smg-cell-size)) !important;
                        height: 10px !important;
                        left: 50% !important;
                        transform: translateX(-50%) !important;
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

                    /* UI compatta */
                    #sfide-minigame-modal .smg-header {
                        padding: 0.4rem 0.5rem !important;
                    }
                    #sfide-minigame-modal .smg-header h1 {
                        font-size: 0.8rem !important;
                    }
                    #sfide-minigame-modal .smg-scoreboard {
                        padding: 0.4rem !important;
                    }
                    #sfide-minigame-modal .smg-scoreboard > div:first-child > div:last-child,
                    #sfide-minigame-modal .smg-scoreboard > div:last-child > div:last-child {
                        font-size: 1.5rem !important;
                    }
                    #sfide-minigame-modal .smg-controls {
                        padding: 0.4rem !important;
                        gap: 0.25rem !important;
                    }
                }

                /* ============ CELLE ============ */
                #sfide-minigame-modal .cell {
                    /* Cella esattamente quadrata */
                    width: var(--smg-cell-size);
                    height: var(--smg-cell-size);
                    aspect-ratio: 1 / 1;

                    /* Layout interno */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;

                    /* Stile */
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-sizing: border-box;
                    cursor: pointer;
                    transition: background-color 0.15s ease;
                    z-index: 2;
                }

                #sfide-minigame-modal .cell:hover {
                    background-color: rgba(255, 255, 255, 0.12);
                }
                #sfide-minigame-modal .cell.highlight-move {
                    background-color: rgba(255, 255, 255, 0.3);
                    box-shadow: inset 0 0 8px rgba(255,255,255,0.3);
                }
                #sfide-minigame-modal .cell.highlight-target {
                    background-color: rgba(248, 113, 113, 0.5);
                    box-shadow: inset 0 0 10px rgba(248, 113, 113, 0.5);
                }
                #sfide-minigame-modal .cell.highlight-pass {
                    background-color: rgba(74, 222, 128, 0.4);
                    box-shadow: inset 0 0 8px rgba(74, 222, 128, 0.4);
                }
                #sfide-minigame-modal .cell.highlight-shot {
                    background-color: rgba(251, 191, 36, 0.5);
                    box-shadow: inset 0 0 10px rgba(251, 191, 36, 0.5);
                    animation: smg-shot-pulse 0.8s ease-in-out infinite;
                }
                #sfide-minigame-modal .cell.highlight-mura {
                    background-color: rgba(99, 102, 241, 0.35);
                    box-shadow: inset 0 0 12px rgba(99, 102, 241, 0.6);
                }
                #sfide-minigame-modal .cell.highlight-intercetto {
                    background-color: rgba(16, 185, 129, 0.35);
                    box-shadow: inset 0 0 12px rgba(16, 185, 129, 0.6);
                }
                #sfide-minigame-modal .cell.highlight-blocco {
                    background-color: rgba(239, 68, 68, 0.35);
                    box-shadow: inset 0 0 12px rgba(239, 68, 68, 0.6);
                }

                @keyframes smg-shot-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }

                /* ============ GIOCATORI ============ */
                #sfide-minigame-modal .player-token {
                    /* Dimensione relativa alla cella */
                    width: calc(var(--smg-cell-size) * 0.78);
                    height: calc(var(--smg-cell-size) * 0.78);
                    min-width: 28px;
                    min-height: 28px;
                    max-width: 48px;
                    max-height: 48px;

                    /* Forma e layout */
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;

                    /* Testo */
                    font-weight: 700;
                    font-size: clamp(0.5rem, calc(var(--smg-cell-size) * 0.22), 0.7rem);
                    letter-spacing: -0.02em;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.4);

                    /* Stile */
                    z-index: 10;
                    position: relative;
                    border: 3px solid rgba(0,0,0,0.25);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                #sfide-minigame-modal .team-a {
                    background: linear-gradient(145deg, #f87171 0%, #ef4444 40%, #b91c1c 100%);
                    color: white;
                }
                #sfide-minigame-modal .team-b {
                    background: linear-gradient(145deg, #60a5fa 0%, #3b82f6 40%, #1d4ed8 100%);
                    color: white;
                }

                #sfide-minigame-modal .player-token.selected {
                    transform: scale(1.25);
                    border-color: #fbbf24;
                    box-shadow:
                        0 0 0 3px rgba(251, 191, 36, 0.4),
                        0 0 20px rgba(251, 191, 36, 0.6),
                        0 4px 12px rgba(0,0,0,0.4);
                    z-index: 15;
                }

                #sfide-minigame-modal .mod-tag {
                    position: absolute;
                    bottom: -5px;
                    background: linear-gradient(135deg, #1e293b, #0f172a);
                    padding: 1px 4px;
                    border-radius: 4px;
                    font-size: clamp(0.4rem, calc(var(--smg-cell-size) * 0.18), 0.55rem);
                    font-weight: 600;
                    border: 1px solid #475569;
                    color: #fbbf24;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }

                #sfide-minigame-modal .defense-effect {
                    animation: smg-defense-glow 1.5s ease-in-out infinite;
                }
                #sfide-minigame-modal .defense-effect::after {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    font-size: clamp(0.6rem, calc(var(--smg-cell-size) * 0.25), 0.85rem);
                    animation: smg-bounce 1s infinite;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
                }
                #sfide-minigame-modal .defense-mura::after { content: '🛡️'; }
                #sfide-minigame-modal .defense-intercetto::after { content: '🖐️'; }
                #sfide-minigame-modal .defense-blocco::after { content: '🚧'; }

                @keyframes smg-defense-glow {
                    0%, 100% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.5); }
                    50% { box-shadow: 0 0 16px rgba(99, 102, 241, 0.8); }
                }

                /* ============ PALLA ============ */
                #sfide-minigame-modal .ball-token {
                    width: clamp(10px, calc(var(--smg-cell-size) * 0.32), 16px);
                    height: clamp(10px, calc(var(--smg-cell-size) * 0.32), 16px);
                    background: radial-gradient(circle at 30% 30%, #ffffff, #e5e5e5 50%, #a3a3a3 100%);
                    border-radius: 50%;
                    position: absolute;
                    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    z-index: 30;
                    border: 1.5px solid #404040;
                    pointer-events: none;
                    box-shadow:
                        0 2px 4px rgba(0,0,0,0.4),
                        inset 0 -2px 4px rgba(0,0,0,0.2);
                }

                /* ============ PORTE ============ */
                /* Porte: 3 celle centrali su 9 = 33.33% altezza, centrate */
                #sfide-minigame-modal .goal-post {
                    position: absolute;
                    width: 12px;
                    height: calc(3 * var(--smg-cell-size));
                    top: 50%;
                    transform: translateY(-50%);
                    background: linear-gradient(180deg, #ffffff, #e5e5e5);
                    border: 2px solid #404040;
                    z-index: 5;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                #sfide-minigame-modal .goal-left {
                    left: -12px;
                    border-radius: 6px 0 0 6px;
                    border-right: none;
                }
                #sfide-minigame-modal .goal-right {
                    right: -12px;
                    border-radius: 0 6px 6px 0;
                    border-left: none;
                }

                /* ============ LINEE CAMPO ============ */
                #sfide-minigame-modal .pitch-lines {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 1;
                }

                /* Linea di centrocampo */
                #sfide-minigame-modal .center-line {
                    position: absolute;
                    left: 50%;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: rgba(255,255,255,0.55);
                    transform: translateX(-50%);
                    box-shadow: 0 0 4px rgba(255,255,255,0.2);
                }

                /* Cerchio di centrocampo */
                #sfide-minigame-modal .center-circle {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: calc(4 * var(--smg-cell-size));
                    height: calc(4 * var(--smg-cell-size));
                    border: 2px solid rgba(255,255,255,0.55);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 4px rgba(255,255,255,0.15);
                }

                /* Punto di centrocampo */
                #sfide-minigame-modal .center-spot {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 8px;
                    height: 8px;
                    background: rgba(255,255,255,0.7);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 6px rgba(255,255,255,0.4);
                }

                /* Area portiere sinistra */
                #sfide-minigame-modal .penalty-area-left {
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: calc(2.5 * var(--smg-cell-size));
                    height: calc(5 * var(--smg-cell-size));
                    border: 2px solid rgba(255,255,255,0.55);
                    border-left: none;
                    border-radius: 0 4px 4px 0;
                }

                /* Area portiere destra */
                #sfide-minigame-modal .penalty-area-right {
                    position: absolute;
                    right: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: calc(2.5 * var(--smg-cell-size));
                    height: calc(5 * var(--smg-cell-size));
                    border: 2px solid rgba(255,255,255,0.55);
                    border-right: none;
                    border-radius: 4px 0 0 4px;
                }

                /* Area piccola sinistra */
                #sfide-minigame-modal .goal-area-left {
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: calc(1.2 * var(--smg-cell-size));
                    height: calc(3 * var(--smg-cell-size));
                    border: 2px solid rgba(255,255,255,0.55);
                    border-left: none;
                    border-radius: 0 3px 3px 0;
                }

                /* Area piccola destra */
                #sfide-minigame-modal .goal-area-right {
                    position: absolute;
                    right: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: calc(1.2 * var(--smg-cell-size));
                    height: calc(3 * var(--smg-cell-size));
                    border: 2px solid rgba(255,255,255,0.55);
                    border-right: none;
                    border-radius: 3px 0 0 3px;
                }

                /* ============ LINEE CAMPO - MOBILE PORTRAIT ============ */
                @media screen and (max-width: 768px) and (orientation: portrait) {
                    #sfide-minigame-modal .center-line {
                        left: 0;
                        right: 0;
                        top: 50%;
                        bottom: auto;
                        width: 100%;
                        height: 2px;
                        transform: translateY(-50%);
                    }

                    #sfide-minigame-modal .center-circle {
                        width: calc(4 * var(--smg-cell-size));
                        height: calc(4 * var(--smg-cell-size));
                    }

                    #sfide-minigame-modal .penalty-area-left {
                        left: 50%;
                        top: 0;
                        transform: translateX(-50%);
                        width: calc(5 * var(--smg-cell-size));
                        height: calc(2.5 * var(--smg-cell-size));
                        border: 2px solid rgba(255,255,255,0.55);
                        border-top: none;
                        border-left: 2px solid rgba(255,255,255,0.55);
                        border-radius: 0 0 4px 4px;
                    }

                    #sfide-minigame-modal .penalty-area-right {
                        right: auto;
                        left: 50%;
                        top: auto;
                        bottom: 0;
                        transform: translateX(-50%);
                        width: calc(5 * var(--smg-cell-size));
                        height: calc(2.5 * var(--smg-cell-size));
                        border: 2px solid rgba(255,255,255,0.55);
                        border-bottom: none;
                        border-right: 2px solid rgba(255,255,255,0.55);
                        border-radius: 4px 4px 0 0;
                    }

                    #sfide-minigame-modal .goal-area-left {
                        left: 50%;
                        top: 0;
                        transform: translateX(-50%);
                        width: calc(3 * var(--smg-cell-size));
                        height: calc(1.2 * var(--smg-cell-size));
                        border: 2px solid rgba(255,255,255,0.55);
                        border-top: none;
                        border-left: 2px solid rgba(255,255,255,0.55);
                        border-radius: 0 0 3px 3px;
                    }

                    #sfide-minigame-modal .goal-area-right {
                        right: auto;
                        left: 50%;
                        top: auto;
                        bottom: 0;
                        transform: translateX(-50%);
                        width: calc(3 * var(--smg-cell-size));
                        height: calc(1.2 * var(--smg-cell-size));
                        border: 2px solid rgba(255,255,255,0.55);
                        border-bottom: none;
                        border-right: 2px solid rgba(255,255,255,0.55);
                        border-radius: 3px 3px 0 0;
                    }
                }

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

                /* Log espandibile */
                #sfide-minigame-modal #smg-log {
                    cursor: pointer;
                    transition: max-height 0.3s ease;
                    position: relative;
                }
                #sfide-minigame-modal #smg-log::after {
                    content: '⬇️';
                    position: absolute;
                    bottom: 2px;
                    right: 4px;
                    font-size: 0.6rem;
                    opacity: 0.5;
                }
                #sfide-minigame-modal #smg-log.expanded {
                    max-height: 60vh !important;
                    position: fixed;
                    left: 5%;
                    right: 5%;
                    bottom: 10%;
                    top: auto;
                    z-index: 100;
                    background: rgba(0,0,0,0.95) !important;
                    border: 2px solid #6366f1 !important;
                }
                #sfide-minigame-modal #smg-log.expanded::after {
                    content: '⬆️';
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
                    <h1 class="text-lg font-black italic tracking-tight text-white">TATTICHE SERIE</h1>
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
                        <div id="smg-turn-timer" class="hidden text-lg font-bold text-yellow-400 mt-1">20s</div>
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
                <div class="pitch-wrapper flex-grow overflow-hidden">
                    <div class="pitch" id="smg-pitch">
                        <!-- Linee campo -->
                        <div class="pitch-lines">
                            <div class="center-line"></div>
                            <div class="center-circle"></div>
                            <div class="center-spot"></div>
                            <div class="penalty-area-left"></div>
                            <div class="penalty-area-right"></div>
                            <div class="goal-area-left"></div>
                            <div class="goal-area-right"></div>
                        </div>
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
                            <!-- Azioni con palla -->
                            <div id="smg-ball-actions" class="flex flex-wrap gap-2 items-center mb-2">
                                <button id="smg-btn-pass" class="action-btn bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded font-bold text-xs transition text-white">
                                    ⚽ Passa
                                </button>
                                <button id="smg-btn-shot" class="action-btn bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded font-bold text-xs transition text-white">
                                    🥅 Tira
                                </button>
                            </div>
                            <!-- Azioni difensive (senza palla) -->
                            <div id="smg-defense-actions" class="flex flex-wrap gap-1 items-center mb-2">
                                <button id="smg-btn-mura" class="action-btn bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded font-bold text-xs transition text-white">
                                    🛡️ Mura
                                </button>
                                <button id="smg-btn-intercetto" class="action-btn bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded font-bold text-xs transition text-white">
                                    🖐️ Intercetto
                                </button>
                                <button id="smg-btn-blocco" class="action-btn bg-red-600 hover:bg-red-500 px-2 py-1 rounded font-bold text-xs transition text-white">
                                    🚧 Blocco
                                </button>
                            </div>
                            <div class="text-xs border-t border-slate-600 pt-2">
                                <span id="smg-stat-name" class="font-bold text-white">PIVOT</span>
                                <span id="smg-stat-mod" class="text-yellow-400 ml-1">+7</span>
                            </div>
                        </div>
                    </div>
                    <div id="smg-log" class="bg-black/40 rounded-lg p-2 border border-slate-800 overflow-y-auto text-xs font-mono max-h-32">
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
        // Azioni difensive
        document.getElementById('smg-btn-mura').addEventListener('click', (e) => {
            e.stopPropagation();
            performDefense(DEFENSE_MODES.MURA);
        });
        document.getElementById('smg-btn-intercetto').addEventListener('click', (e) => {
            e.stopPropagation();
            performDefense(DEFENSE_MODES.INTERCETTO);
        });
        document.getElementById('smg-btn-blocco').addEventListener('click', (e) => {
            e.stopPropagation();
            performDefense(DEFENSE_MODES.BLOCCO);
        });
        // Azioni con palla
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

        // Toggle espansione log
        document.getElementById('smg-log').addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('expanded');
        });
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

        // Opzioni multiplayer
        state.multiplayer = options.multiplayer || false;
        state.challengeId = options.challengeId || null;
        state.myRole = options.myRole || null;
        // myTeam: A=rosso (challenger), B=blu (challenged) - usa options.myTeam se fornito
        // In testMode senza multiplayer, il giocatore e' sempre Team A (rosso)
        state.myTeam = options.myTeam || (state.testMode && !state.multiplayer ? 'A' : (state.myRole === 'attacker' ? 'A' : 'B'));
        state.onMove = options.onMove || null;
        state.isMyTurn = true; // Default, aggiornato da updateMultiplayerState

        // Forza landscape su mobile
        if (window.innerWidth < 768) {
            try {
                screen.orientation?.lock?.('landscape').catch(() => {});
            } catch(e) {}
        }

        // In multiplayer o se richiesto, usa gameState passato
        if ((state.multiplayer || options.useGameState) && options.gameState) {
            applyGameState(options.gameState);
        } else {
            resetGame();
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        console.log('[SfideMinigame] Aperto', {
            testMode: state.testMode,
            multiplayer: state.multiplayer,
            myRole: state.myRole
        });
    }

    /**
     * Applica stato di gioco ricevuto dal server (multiplayer)
     */
    function applyGameState(gameState) {
        if (!gameState) return;

        state.scoreA = gameState.scoreA || 0;
        state.scoreB = gameState.scoreB || 0;
        state.actionsLeft = gameState.movesLeft || 3;
        state.ballCarrierId = gameState.ballCarrierId || null;
        state.ballPosition = gameState.ballPosition || null;
        state.isGameOver = gameState.isGameOver || false;
        state.selectedPlayer = null;
        state.actionMode = null;

        // Converti currentTurn da teamId a 'A'/'B'
        // In multiplayer: attackerId = 'A', defenderId = 'B'
        // currentTurn contiene il teamId, dobbiamo capire se e' A o B
        // Lo facciamo in updateMultiplayerState

        if (gameState.players) {
            players = gameState.players.map(p => ({ ...p }));

            // Memorizza posizioni iniziali
            initialPositions = {};
            players.forEach(p => {
                initialPositions[p.id] = { x: p.x, y: p.y };
            });
        } else {
            players = generatePlayersFromFormations();
        }

        buildPitch();
        update();
    }

    /**
     * Aggiorna stato multiplayer (chiamato da SfideMultiplayer)
     */
    function updateMultiplayerState(data) {
        if (!state.multiplayer) return;

        const { gameState, isMyTurn, myTeam } = data;

        state.isMyTurn = isMyTurn;
        state.myTeam = myTeam;

        if (gameState) {
            state.scoreA = gameState.scoreA || 0;
            state.scoreB = gameState.scoreB || 0;
            state.actionsLeft = gameState.movesLeft || 3;
            state.ballCarrierId = gameState.ballCarrierId || null;
            state.ballPosition = gameState.ballPosition || null;
            state.isGameOver = gameState.isGameOver || false;

            // Usa currentTeam dal gameState se disponibile, altrimenti calcola da isMyTurn
            if (gameState.currentTeam) {
                state.currentTeam = gameState.currentTeam;
            } else {
                state.currentTeam = isMyTurn ? myTeam : (myTeam === 'A' ? 'B' : 'A');
            }

            if (gameState.players) {
                players = gameState.players.map(p => ({ ...p }));
            }
        }

        // Aggiorna UI
        update();
        updateMultiplayerUI();
    }

    /**
     * Imposta timer turno (chiamato da SfideMultiplayer)
     */
    function setTurnTimer(remainingMs) {
        state.turnTimeRemaining = remainingMs;
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const timerEl = document.getElementById('smg-turn-timer');
        if (!timerEl) return;

        if (state.turnTimeRemaining && state.multiplayer) {
            const seconds = Math.ceil(state.turnTimeRemaining / 1000);
            timerEl.textContent = `${seconds}s`;
            timerEl.classList.remove('hidden');

            if (seconds <= 5) {
                timerEl.classList.add('text-red-400', 'animate-pulse');
            } else {
                timerEl.classList.remove('text-red-400', 'animate-pulse');
            }
        } else {
            timerEl.classList.add('hidden');
        }
    }

    function updateMultiplayerUI() {
        if (!state.multiplayer) return;

        const turnDisp = document.getElementById('smg-turn-display');
        if (!turnDisp) return;

        if (state.isMyTurn) {
            turnDisp.textContent = 'IL TUO TURNO';
            turnDisp.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white animate-pulse';
        } else {
            turnDisp.textContent = 'TURNO AVVERSARIO';
            turnDisp.className = 'px-3 py-1 rounded-full text-xs font-bold bg-gray-600 text-white';
        }
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
        // Squadra iniziale random
        state.currentTeam = Math.random() < 0.5 ? 'A' : 'B';
        state.actionsLeft = 3;
        state.isGameOver = false;
        state.selectedPlayer = null;
        state.actionMode = null;
        state.ballPosition = null;

        // Genera giocatori dalle formazioni
        players = generatePlayersFromFormations();

        // Assegna palla al pivot della squadra che inizia
        const starterPivot = players.find(p => p.team === state.currentTeam && p.name === 'PIV');
        state.ballCarrierId = starterPivot ? starterPivot.id : (state.currentTeam === 'A' ? 'A5' : 'B5');

        document.getElementById('smg-game-over').classList.add('hidden');
        const teamName = state.currentTeam === 'A' ? 'Rossa' : 'Blu';
        const teamColor = state.currentTeam === 'A' ? 'text-red-400' : 'text-blue-400';
        document.getElementById('smg-log').innerHTML = `<div class="text-yellow-500">Nuova Partita!</div><div class="${teamColor}">Inizia la Squadra ${teamName}.</div>`;

        buildPitch();
        update();

        // In testMode, se il Bot inizia, avvia il suo turno
        if (state.testMode && !state.multiplayer) {
            const botTeam = state.myTeam === 'A' ? 'B' : 'A';
            if (state.currentTeam === botTeam) {
                setTimeout(() => executeBotTurn(botTeam), 1000);
            }
        }
    }

    /**
     * Genera i giocatori basandosi sulla formazione dell'utente (Team A) e una formazione AI (Team B)
     */
    function generatePlayersFromFormations() {
        const result = [];
        const teamData = window.InterfacciaCore?.currentTeamData;

        // Mappatura ruoli alle posizioni sul campo 13x9
        // Team A (sinistra): GK a x=0, D a x=2-3, C a x=4-5, A a x=5-6
        // Team B (destra): GK a x=12, D a x=10-11, C a x=7-8, A a x=6-7

        const positionsA = getTeamPositions('A', teamData);
        const positionsB = getTeamPositions('B', null); // AI team

        // Resetta posizioni iniziali
        initialPositions = {};

        positionsA.forEach((p, i) => {
            const id = `A${i+1}`;
            result.push({
                id: id,
                team: 'A',
                name: p.name,
                x: p.x,
                y: p.y,
                mod: p.mod,
                isGK: p.isGK,
                defenseMode: null,
                defenseCells: []
            });
            // Memorizza posizione iniziale
            initialPositions[id] = { x: p.x, y: p.y };
        });

        positionsB.forEach((p, i) => {
            const id = `B${i+1}`;
            result.push({
                id: id,
                team: 'B',
                name: p.name,
                x: p.x,
                y: p.y,
                mod: p.mod,
                isGK: p.isGK,
                defenseMode: null,
                defenseCells: []
            });
            // Memorizza posizione iniziale
            initialPositions[id] = { x: p.x, y: p.y };
        });

        return result;
    }

    /**
     * Ottieni posizioni dei giocatori per una squadra
     */
    function getTeamPositions(team, teamData) {
        const positions = [];
        const isLeft = team === 'A';
        const centerY = Math.floor(GRID_H / 2); // 4 per campo 9

        // Portiere sempre al centro della porta
        positions.push({
            name: 'GK',
            x: isLeft ? 0 : GRID_W - 1,
            y: centerY,
            mod: 8,
            isGK: true
        });

        // Se abbiamo dati squadra, usa la formazione
        if (teamData?.formation?.titolari) {
            const titolari = teamData.formation.titolari;
            const modulo = teamData.formation.modulo || '1-1-2-1';

            // Conta ruoli nel modulo
            const roleCount = { D: 0, C: 0, A: 0 };
            titolari.forEach(p => {
                if (p.ruolo !== 'P') roleCount[p.ruolo] = (roleCount[p.ruolo] || 0) + 1;
            });

            // Posizioni base per ruoli
            let dIdx = 0, cIdx = 0, aIdx = 0;
            titolari.forEach(p => {
                if (p.ruolo === 'P') return; // Già aggiunto GK

                const pos = getPositionForRole(p.ruolo, isLeft, roleCount,
                    p.ruolo === 'D' ? dIdx++ : p.ruolo === 'C' ? cIdx++ : aIdx++);

                positions.push({
                    name: getRoleName(p.ruolo),
                    x: pos.x,
                    y: pos.y,
                    mod: Math.min(10, 5 + Math.floor((p.modificatore || 0) / 3)),
                    isGK: false
                });
            });
        } else {
            // Formazione default 1-1-2-1
            positions.push(
                { name: 'FIX', x: isLeft ? 3 : GRID_W - 4, y: centerY, mod: 6, isGK: false },
                { name: 'ALA', x: isLeft ? 4 : GRID_W - 5, y: 1, mod: 5, isGK: false },
                { name: 'ALA', x: isLeft ? 4 : GRID_W - 5, y: GRID_H - 2, mod: 5, isGK: false },
                { name: 'PIV', x: isLeft ? 5 : GRID_W - 6, y: centerY, mod: 7, isGK: false }
            );
        }

        return positions;
    }

    function getPositionForRole(ruolo, isLeft, roleCount, index) {
        const centerY = Math.floor(GRID_H / 2);
        const count = roleCount[ruolo] || 1;

        // Calcola Y: distribuisci uniformemente
        let y;
        if (count === 1) {
            y = centerY;
        } else if (count === 2) {
            y = index === 0 ? 2 : GRID_H - 3;
        } else if (count === 3) {
            y = index === 0 ? 1 : index === 1 ? centerY : GRID_H - 2;
        } else {
            y = Math.round(1 + index * (GRID_H - 3) / (count - 1));
        }

        // Calcola X in base al ruolo
        let x;
        if (ruolo === 'D') {
            x = isLeft ? 2 + Math.floor(index / 2) : GRID_W - 3 - Math.floor(index / 2);
        } else if (ruolo === 'C') {
            x = isLeft ? 4 + Math.floor(index / 2) : GRID_W - 5 - Math.floor(index / 2);
        } else { // A
            x = isLeft ? 5 + Math.floor(index / 2) : GRID_W - 6 - Math.floor(index / 2);
        }

        return { x, y };
    }

    function getRoleName(ruolo) {
        const names = { D: 'FIX', C: 'ALA', A: 'PIV' };
        return names[ruolo] || ruolo;
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

        // In multiplayer, controlla se e' il mio turno
        if (state.multiplayer && !state.isMyTurn) {
            logMsg("Non e' il tuo turno!", "text-orange-400");
            return;
        }

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
            const goalCenterY = Math.floor(GRID_H / 2); // Centro del campo (4 per campo 9)
            if (x === targetGoalX && y >= goalCenterY - 1 && y <= goalCenterY + 1) {
                executeShot(state.selectedPlayer, y);
                state.actionMode = null;
                updateActionButtons();
            } else {
                logMsg("Clicca sulla porta avversaria!", "text-orange-400");
            }
            return;
        }

        // Selezione giocatore della propria squadra
        // In multiplayer, posso selezionare solo i miei giocatori
        const myTeam = state.multiplayer ? state.myTeam : state.currentTeam;
        if (playerAt && playerAt.team === myTeam) {
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
            c.classList.remove('highlight-move', 'highlight-target', 'highlight-pass', 'highlight-shot', 'highlight-mura', 'highlight-intercetto', 'highlight-blocco');
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
            const goalCenterY = Math.floor(GRID_H / 2);
            for (let gy = goalCenterY - 1; gy <= goalCenterY + 1; gy++) {
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

        // Mostra celle difese da azioni difensive
        players.filter(p => p.defenseMode && p.defenseCells?.length > 0).forEach(p => {
            const highlightClass = `highlight-${p.defenseMode}`;
            p.defenseCells.forEach(dc => {
                getCell(dc.x, dc.y)?.classList.add(highlightClass);
            });
        });
    }

    function handleAction(tx, ty) {
        const sp = state.selectedPlayer;
        const dist = Math.max(Math.abs(tx - sp.x), Math.abs(ty - sp.y));
        const playerAt = players.find(p => p.x === tx && p.y === ty);
        const isCarrier = state.ballCarrierId === sp.id;

        // Movimento semplice (cella vuota adiacente)
        if (dist === 1 && !playerAt) {
            // Chi sta in difesa non può muoversi
            if (sp.defenseMode) {
                logMsg(`Stai in ${sp.defenseMode}! Non puoi muoverti.`, "text-orange-400");
                return;
            }

            // Controlla se la cella è bloccata da BLOCCO avversario
            const isBlocked = players.some(p =>
                p.team !== state.currentTeam &&
                p.defenseMode === DEFENSE_MODES.BLOCCO &&
                p.defenseCells?.some(dc => dc.x === tx && dc.y === ty)
            );

            if (isBlocked) {
                logMsg("Cella bloccata da avversario!", "text-orange-400");
                return;
            }

            sp.x = tx;
            sp.y = ty;
            sp.defenseMode = null;
            sp.defenseCells = [];

            // Controlla se c'è una palla libera nella nuova posizione
            if (state.ballPosition && tx === state.ballPosition.x && ty === state.ballPosition.y) {
                state.ballCarrierId = sp.id;
                state.ballPosition = null;
                logMsg(`${sp.name} si sposta e prende la palla!`, "text-green-400");
            } else {
                logMsg(`${sp.name} si sposta.`);
            }
            consumeAction();
            return;
        }

        // Azioni su giocatore avversario adiacente
        if (dist === 1 && playerAt && playerAt.team !== state.currentTeam) {
            if (isCarrier) {
                // DRIBBLING: ho la palla e premo su avversario
                executeDribbling(sp, playerAt);
            } else if (state.ballCarrierId === playerAt.id) {
                // CONTRASTO: non ho palla e premo su chi ce l'ha
                executeContrasto(sp, playerAt);
            } else {
                logMsg("Nessuna azione possibile.", "text-gray-500");
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

    /**
     * DRIBBLING: giocatore CON palla preme su avversario
     * 1d20+modA vs 1d20+modB
     * - Vince A: passa alle spalle di B
     * - Vince B: A non può più muoversi (azione persa)
     */
    function executeDribbling(attacker, defender) {
        const rollAtk = d20() + attacker.mod;
        const rollDef = d20() + defender.mod;

        logMsg(`Dribbling: ${attacker.name}(${rollAtk}) vs ${defender.name}(${rollDef})`);

        if (rollAtk > rollDef) {
            // Calcola posizione "alle spalle" del difensore
            const behindX = defender.x + (defender.x - attacker.x);
            const behindY = defender.y + (defender.y - attacker.y);

            // Verifica che la posizione sia valida
            if (behindX >= 0 && behindX < GRID_W && behindY >= 0 && behindY < GRID_H) {
                const playerBehind = players.find(p => p.x === behindX && p.y === behindY);
                if (!playerBehind) {
                    attacker.x = behindX;
                    attacker.y = behindY;
                    logMsg("Dribbling riuscito!", "text-green-400");
                } else {
                    // C'è qualcuno dietro, vai al posto del difensore
                    attacker.x = defender.x;
                    attacker.y = defender.y;
                    defender.x = behindX - (defender.x - attacker.x);
                    defender.y = behindY - (defender.y - attacker.y);
                    logMsg("Dribbling riuscito! (spazio limitato)", "text-green-400");
                }
            } else {
                // Fuori campo, scambia posizioni
                const tempX = attacker.x;
                const tempY = attacker.y;
                attacker.x = defender.x;
                attacker.y = defender.y;
                defender.x = tempX;
                defender.y = tempY;
                logMsg("Dribbling riuscito! (bordo campo)", "text-green-400");
            }

            attacker.defenseMode = null;
            attacker.defenseCells = [];
        } else {
            logMsg("Dribbling fallito! Bloccato.", "text-red-400");
            // Azione persa, non può più muoversi
        }
        consumeAction();
    }

    /**
     * CONTRASTO: giocatore SENZA palla preme su chi ha palla
     * 1d20+modA vs 1d20+modB
     * - Vince A: prende palla e va alle spalle di B
     * - Vince B: A può ritentare ma tira 2d20 e prende il più basso
     * - Il portiere NON puo' essere contrastato nella sua area di rigore
     */
    function executeContrasto(attacker, defender, isRetry = false) {
        // Impedisci contrasto al portiere nella sua area
        if (defender.isGK && isInOwnPenaltyArea(defender)) {
            logMsg("Il portiere non puo' essere contrastato nella sua area!", "text-orange-400");
            return;
        }

        let rollAtk;
        if (isRetry) {
            // Ritenta: 2d20 prende il più basso
            const roll1 = d20();
            const roll2 = d20();
            rollAtk = Math.min(roll1, roll2) + attacker.mod;
            logMsg(`Ritenta contrasto (${roll1},${roll2}): ${attacker.name}(${rollAtk}) vs...`);
        } else {
            rollAtk = d20() + attacker.mod;
        }

        const rollDef = d20() + defender.mod;

        if (!isRetry) {
            logMsg(`Contrasto: ${attacker.name}(${rollAtk}) vs ${defender.name}(${rollDef})`);
        } else {
            logMsg(`...${defender.name}(${rollDef})`);
        }

        if (rollAtk > rollDef) {
            // Calcola posizione "alle spalle" del difensore
            const behindX = defender.x + (defender.x - attacker.x);
            const behindY = defender.y + (defender.y - attacker.y);

            // Attaccante prende la palla
            state.ballCarrierId = attacker.id;

            // Verifica che la posizione sia valida
            if (behindX >= 0 && behindX < GRID_W && behindY >= 0 && behindY < GRID_H) {
                const playerBehind = players.find(p => p.x === behindX && p.y === behindY);
                if (!playerBehind) {
                    attacker.x = behindX;
                    attacker.y = behindY;
                } else {
                    // Scambia posizioni se c'è qualcuno dietro
                    const tempX = attacker.x;
                    const tempY = attacker.y;
                    attacker.x = defender.x;
                    attacker.y = defender.y;
                    defender.x = tempX;
                    defender.y = tempY;
                }
            } else {
                // Fuori campo, scambia posizioni
                const tempX = attacker.x;
                const tempY = attacker.y;
                attacker.x = defender.x;
                attacker.y = defender.y;
                defender.x = tempX;
                defender.y = tempY;
            }

            defender.defenseMode = null;
            defender.defenseCells = [];

            logMsg("Contrasto vinto! Palla rubata!", "text-green-400");
            consumeAction();
        } else {
            if (!isRetry) {
                logMsg("Contrasto perso! Puoi ritentare (svantaggio)...", "text-orange-400");
                // Ritenta automaticamente con svantaggio
                executeContrasto(attacker, defender, true);
            } else {
                logMsg("Contrasto fallito definitivamente.", "text-red-400");
                consumeAction();
            }
        }
    }

    /**
     * PASSAGGIO (nuove regole):
     * - 1d20 + MOD - distanza
     * - Malus MOD per ogni intercettatore in traiettoria
     * - Malus -1 per ogni giocatore in traiettoria che NON intercetta
     * - Successo se risultato > 5
     * - Se risultato <= 0 e intercettato: palla all'intercettatore
     * - Se risultato <= 5 e non intercettato: palla in direzione casuale 1-2 celle
     */
    function executePass(from, target) {
        const path = getLinePath(from.x, from.y, target.x, target.y);
        const distance = path.length;

        // Calcola risultato: 1d20 + MOD - distanza
        let passResult = d20() + from.mod - distance;
        let interceptors = [];
        let playersInPath = [];
        let firstInterceptor = null;

        for (const cell of path) {
            // Avversari che stanno intercettando
            const interceptingPlayers = players.filter(p =>
                p.team !== state.currentTeam &&
                p.defenseMode === DEFENSE_MODES.INTERCETTO &&
                p.defenseCells?.some(dc => dc.x === cell.x && dc.y === cell.y)
            );
            for (const ip of interceptingPlayers) {
                passResult -= ip.mod;
                interceptors.push(`${ip.name}(-${ip.mod})`);
                if (!firstInterceptor) firstInterceptor = ip;
            }

            // Avversari fisicamente nella cella che NON intercettano
            const enemyInCell = players.find(p =>
                p.team !== state.currentTeam &&
                p.x === cell.x && p.y === cell.y &&
                p.defenseMode !== DEFENSE_MODES.INTERCETTO
            );
            if (enemyInCell) {
                passResult -= 1;
                playersInPath.push(`${enemyInCell.name}(-1)`);
            }
        }

        const logDetails = [];
        if (interceptors.length > 0) logDetails.push(`Intercetto: ${interceptors.join(', ')}`);
        if (playersInPath.length > 0) logDetails.push(`In traiettoria: ${playersInPath.join(', ')}`);
        const detailStr = logDetails.length > 0 ? ` [${logDetails.join(' | ')}]` : '';

        logMsg(`Passaggio: risultato ${passResult} (serve >5)${detailStr}`);

        if (passResult > 5) {
            // Successo!
            if (target.id) {
                state.ballCarrierId = target.id;
                const receiver = players.find(p => p.id === target.id);
                logMsg(`Passaggio a ${receiver?.name}!`, "text-green-400");
            } else {
                // Cella vuota o con giocatore
                const playerAtTarget = players.find(p => p.x === target.x && p.y === target.y);
                if (playerAtTarget) {
                    state.ballCarrierId = playerAtTarget.id;
                    logMsg(`Palla a ${playerAtTarget.name}!`, "text-green-400");
                } else {
                    state.ballCarrierId = null;
                    state.ballPosition = { x: target.x, y: target.y };
                    logMsg(`Palla in zona!`, "text-green-400");
                }
            }
        } else if (passResult <= 0 && firstInterceptor) {
            // Intercettato!
            state.ballCarrierId = firstInterceptor.id;
            state.ballPosition = null;
            logMsg(`INTERCETTATO da ${firstInterceptor.name}!`, "text-red-400");
        } else {
            // Passaggio fallito: palla in direzione casuale 1-2 celle dal target
            const randomDist = Math.floor(Math.random() * 2) + 1; // 1 o 2
            const randomAngle = Math.random() * Math.PI * 2;
            let newX = Math.round(target.x + Math.cos(randomAngle) * randomDist);
            let newY = Math.round(target.y + Math.sin(randomAngle) * randomDist);

            // Clamp alle dimensioni del campo
            newX = Math.max(0, Math.min(GRID_W - 1, newX));
            newY = Math.max(0, Math.min(GRID_H - 1, newY));

            // Controlla se c'è un giocatore nella nuova posizione
            const playerAtNew = players.find(p => p.x === newX && p.y === newY);
            if (playerAtNew) {
                state.ballCarrierId = playerAtNew.id;
                state.ballPosition = null;
                logMsg(`Passaggio impreciso! Palla a ${playerAtNew.name}`, "text-orange-400");
            } else {
                state.ballCarrierId = null;
                state.ballPosition = { x: newX, y: newY };
                logMsg(`Passaggio impreciso! Palla libera`, "text-orange-400");
            }
        }
        consumeAction();
    }

    /**
     * TIRO (nuove regole):
     * - 1d20 + MOD - distanza
     * - Malus MOD per ogni MURA in traiettoria
     * - Malus -1 per ogni giocatore in traiettoria che NON mura
     * - Se risultato <= 0: palla al primo muratore
     * - vs 1d20 + MOD portiere (se in area) oppure vs 5 (se fuori area)
     * - Se risultato = 0 esatto: 50/50 gol o parata
     */
    function executeShot(atk, targetY) {
        const gk = players.find(p => p.team !== state.currentTeam && p.isGK);
        const goalX = state.currentTeam === 'A' ? GRID_W - 1 : 0;
        const path = getLinePath(atk.x, atk.y, goalX, targetY);
        const distance = path.length;

        // Calcola risultato: 1d20 + MOD - distanza
        let shotResult = d20() + atk.mod - distance;
        let blockers = [];
        let playersInPath = [];
        let firstBlocker = null;

        for (const cell of path) {
            // Giocatori che stanno murando (difendono tiri)
            const muraPlayers = players.filter(p =>
                p.team !== state.currentTeam &&
                p.defenseMode === DEFENSE_MODES.MURA &&
                p.defenseCells?.some(dc => dc.x === cell.x && dc.y === cell.y)
            );
            for (const mp of muraPlayers) {
                shotResult -= mp.mod;
                blockers.push(`${mp.name}(-${mp.mod})`);
                if (!firstBlocker) firstBlocker = mp;
            }

            // Avversari fisicamente nella cella che NON murano
            const enemyInCell = players.find(p =>
                p.team !== state.currentTeam &&
                p.x === cell.x && p.y === cell.y &&
                p.defenseMode !== DEFENSE_MODES.MURA &&
                !p.isGK // Non contare il portiere come ostacolo generico
            );
            if (enemyInCell) {
                shotResult -= 1;
                playersInPath.push(`${enemyInCell.name}(-1)`);
            }
        }

        const logDetails = [];
        if (blockers.length > 0) logDetails.push(`Mura: ${blockers.join(', ')}`);
        if (playersInPath.length > 0) logDetails.push(`In traiettoria: ${playersInPath.join(', ')}`);
        const detailStr = logDetails.length > 0 ? ` [${logDetails.join(' | ')}]` : '';

        // Se risultato <= 0 e c'era un muratore, palla al muratore
        if (shotResult <= 0 && firstBlocker) {
            logMsg(`Tiro: risultato ${shotResult}${detailStr}`);
            logMsg(`MURATO da ${firstBlocker.name}!`, "text-blue-400");
            state.ballCarrierId = firstBlocker.id;
            state.ballPosition = null;
            consumeAction();
            return;
        }

        // Verifica se il portiere è nell'area di rigore
        const gkInPenaltyArea = gk && isInOwnPenaltyArea(gk);

        if (gkInPenaltyArea) {
            // Portiere para: 1d20 + MOD
            const saveRoll = d20() + gk.mod;
            logMsg(`Tiro: ${shotResult} vs GK: ${saveRoll}${detailStr}`);

            if (shotResult === 0) {
                // Risultato esatto 0: 50/50
                const fiftyFifty = Math.random() < 0.5;
                if (fiftyFifty) {
                    if (state.currentTeam === 'A') state.scoreA++;
                    else state.scoreB++;
                    logMsg("GOOOOL!!! (50/50 fortunato)", "text-yellow-400 font-bold");
                    checkWinCondition();
                    if (!state.isGameOver) handleGoalReset();
                } else {
                    logMsg("PARATA! (50/50)", "text-blue-400");
                    state.ballCarrierId = gk.id;
                    consumeAction();
                }
            } else if (shotResult > saveRoll) {
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
        } else {
            // Portiere fuori area - difficoltà fissa 5
            const difficulty = 5;
            logMsg(`Tiro: ${shotResult} vs ${difficulty} (GK fuori area!)${detailStr}`);

            if (shotResult === 0) {
                // Risultato esatto 0: 50/50
                const fiftyFifty = Math.random() < 0.5;
                if (fiftyFifty) {
                    if (state.currentTeam === 'A') state.scoreA++;
                    else state.scoreB++;
                    logMsg("GOOOOL!!! (50/50 fortunato)", "text-yellow-400 font-bold");
                    checkWinCondition();
                    if (!state.isGameOver) handleGoalReset();
                } else {
                    logMsg("Tiro fuori! (50/50)", "text-orange-400");
                    if (gk) state.ballCarrierId = gk.id;
                    consumeAction();
                }
            } else if (shotResult > difficulty) {
                // GOAL!
                if (state.currentTeam === 'A') state.scoreA++;
                else state.scoreB++;
                logMsg("GOOOOL!!! (Porta sguarnita)", "text-yellow-400 font-bold");
                checkWinCondition();
                if (!state.isGameOver) handleGoalReset();
            } else {
                logMsg("Tiro fuori!", "text-orange-400");
                if (gk) state.ballCarrierId = gk.id;
                consumeAction();
            }
        }
    }

    function checkWinCondition() {
        // In multiplayer, sincronizza dopo ogni gol (evento critico)
        if (state.multiplayer && state.onMove) {
            syncMultiplayerState(false);
        }

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

            // Sync finale partita
            if (state.multiplayer && state.onMove) {
                syncMultiplayerState(true);
            }
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

    /**
     * Esegue un'azione difensiva (MURA, INTERCETTO, BLOCCO)
     * Celle difese: sempre orizzontali (x-1, x, x+1) sulla stessa Y
     */
    function performDefense(defenseType) {
        const sp = state.selectedPlayer;
        if (!sp) {
            logMsg("Seleziona un giocatore!", "text-orange-400");
            return;
        }
        if (sp.isGK) {
            logMsg("I portieri non possono difendere!", "text-orange-400");
            return;
        }
        if (state.ballCarrierId === sp.id) {
            logMsg("Chi ha la palla non puo' difendere!", "text-orange-400");
            return;
        }
        if (sp.defenseMode) {
            logMsg(`Gia' in ${sp.defenseMode}!`, "text-gray-500");
            return;
        }

        sp.defenseMode = defenseType;
        // Celle difese: giocatore + cella SOPRA + cella SOTTO
        // (x, y-1), (x, y), (x, y+1) - stessa colonna X, Y varia
        sp.defenseCells = [
            { x: sp.x, y: sp.y }
        ];
        if (sp.y > 0) sp.defenseCells.push({ x: sp.x, y: sp.y - 1 });
        if (sp.y < GRID_H - 1) sp.defenseCells.push({ x: sp.x, y: sp.y + 1 });

        const defenseNames = {
            [DEFENSE_MODES.MURA]: 'MURA (blocca tiri)',
            [DEFENSE_MODES.INTERCETTO]: 'INTERCETTO (blocca passaggi)',
            [DEFENSE_MODES.BLOCCO]: 'BLOCCO (blocca movimento)'
        };

        logMsg(`${sp.name} in ${defenseNames[defenseType]}!`);
        consumeAction();
    }

    function consumeAction() {
        state.actionsLeft--;
        state.selectedPlayer = null;
        state.actionMode = null;
        document.querySelectorAll('#smg-pitch .cell').forEach(c => {
            c.classList.remove('highlight-move', 'highlight-target', 'highlight-pass', 'highlight-shot', 'highlight-mura', 'highlight-intercetto', 'highlight-blocco');
        });
        updateActionButtons();

        if (state.actionsLeft <= 0) {
            // In multiplayer, sincronizza stato solo a FINE TURNO (riduce letture 3x)
            if (state.multiplayer && state.onMove) {
                syncMultiplayerState(true); // true = cambio turno
            }
            switchTurn();
        }
        update();
    }

    /**
     * Sincronizza stato partita con server (multiplayer)
     * @param {boolean} endOfTurn - true se il turno e' finito e passa all'avversario
     */
    function syncMultiplayerState(endOfTurn = false) {
        if (!state.onMove) return;

        // Calcola il prossimo team se e' fine turno
        const nextTeam = endOfTurn
            ? (state.currentTeam === 'A' ? 'B' : 'A')
            : state.currentTeam;

        const gameState = {
            players: players.map(p => ({
                id: p.id,
                team: p.team,
                name: p.name,
                playerName: p.playerName,
                x: p.x,
                y: p.y,
                mod: p.mod,
                isGK: p.isGK,
                defenseMode: p.defenseMode,
                defenseCells: p.defenseCells
            })),
            scoreA: state.scoreA,
            scoreB: state.scoreB,
            movesLeft: endOfTurn ? 3 : state.actionsLeft,
            currentTeam: nextTeam,
            ballCarrierId: state.ballCarrierId,
            ballPosition: state.ballPosition,
            isGameOver: state.isGameOver,
            lastMoveAt: Date.now()
        };

        state.onMove(gameState);
    }

    function switchTurn() {
        state.currentTeam = state.currentTeam === 'A' ? 'B' : 'A';
        state.actionsLeft = 3;
        // Resetta difese della squadra che sta per giocare
        players.filter(p => p.team === state.currentTeam).forEach(p => {
            p.defenseMode = null;
            p.defenseCells = [];
        });
        logMsg(`--- TURNO ${state.currentTeam === 'A' ? 'ROSSO' : 'BLU'} ---`, "text-yellow-500 font-bold");

        // In testMode senza multiplayer, il Bot gioca per la squadra avversaria
        if (state.testMode && !state.multiplayer) {
            const botTeam = state.myTeam === 'A' ? 'B' : 'A';
            if (state.currentTeam === botTeam) {
                setTimeout(() => executeBotTurn(botTeam), 800);
            }
        }
    }

    // ========================================
    // BOT AI (per testMode)
    // ========================================

    /**
     * Esegue il turno del Bot (3 azioni)
     */
    function executeBotTurn(botTeam) {
        if (state.isGameOver || state.currentTeam !== botTeam) return;

        logMsg("🤖 Bot sta pensando...", "text-cyan-400");

        let actionsRemaining = 3;

        function doNextAction() {
            if (state.isGameOver || actionsRemaining <= 0 || state.currentTeam !== botTeam) {
                return;
            }

            const botPlayers = players.filter(p => p.team === botTeam && !p.isGK);
            const carrier = players.find(p => p.id === state.ballCarrierId);
            const hasball = carrier && carrier.team === botTeam;

            if (hasball) {
                // Bot ha la palla - prova a tirare o passare
                const goalX = botTeam === 'A' ? GRID_W - 1 : 0;
                const distanceToGoal = Math.abs(carrier.x - goalX);

                if (distanceToGoal <= 4) {
                    // Abbastanza vicino - TIRA!
                    logMsg(`🤖 ${carrier.name} tira!`, "text-cyan-400");
                    state.selectedPlayer = carrier;
                    executeShot(carrier, Math.floor(GRID_H / 2));
                    actionsRemaining = 0; // Shot consuma azione e potrebbe cambiare turno
                } else {
                    // Troppo lontano - passa o avanza
                    const forwardTeammates = botPlayers.filter(p =>
                        p.id !== carrier.id &&
                        (botTeam === 'A' ? p.x > carrier.x : p.x < carrier.x)
                    );

                    if (forwardTeammates.length > 0 && Math.random() < 0.6) {
                        // Passa a un compagno avanti
                        const target = forwardTeammates[Math.floor(Math.random() * forwardTeammates.length)];
                        logMsg(`🤖 ${carrier.name} passa a ${target.name}`, "text-cyan-400");
                        executePass(carrier, { x: target.x, y: target.y, id: target.id });
                        actionsRemaining--;
                    } else {
                        // Avanza verso la porta
                        const dx = botTeam === 'A' ? 1 : -1;
                        const newX = Math.max(0, Math.min(GRID_W - 1, carrier.x + dx));
                        const newY = carrier.y;

                        if (!players.find(p => p.x === newX && p.y === newY)) {
                            carrier.x = newX;
                            logMsg(`🤖 ${carrier.name} avanza!`, "text-cyan-400");
                            actionsRemaining--;
                            update();
                        } else {
                            // Cella occupata, prova passaggio
                            const anyTeammate = botPlayers.find(p => p.id !== carrier.id);
                            if (anyTeammate) {
                                executePass(carrier, { x: anyTeammate.x, y: anyTeammate.y, id: anyTeammate.id });
                                actionsRemaining--;
                            }
                        }
                    }
                }
            } else {
                // Bot NON ha la palla - difendi o prova a rubarla
                const enemyCarrier = players.find(p => p.id === state.ballCarrierId);

                if (enemyCarrier) {
                    // Trova giocatore piu' vicino all'avversario con palla
                    const closest = botPlayers
                        .filter(p => !p.defenseMode)
                        .sort((a, b) => {
                            const distA = Math.abs(a.x - enemyCarrier.x) + Math.abs(a.y - enemyCarrier.y);
                            const distB = Math.abs(b.x - enemyCarrier.x) + Math.abs(b.y - enemyCarrier.y);
                            return distA - distB;
                        })[0];

                    if (closest) {
                        const dist = Math.abs(closest.x - enemyCarrier.x) + Math.abs(closest.y - enemyCarrier.y);

                        if (dist === 1) {
                            // Adiacente - contrasta!
                            logMsg(`🤖 ${closest.name} contrasta!`, "text-cyan-400");
                            state.selectedPlayer = closest;
                            executeContrasto(closest, enemyCarrier);
                            actionsRemaining--;
                        } else if (dist <= 3) {
                            // Vicino - muoviti verso la palla
                            const dx = enemyCarrier.x > closest.x ? 1 : (enemyCarrier.x < closest.x ? -1 : 0);
                            const dy = enemyCarrier.y > closest.y ? 1 : (enemyCarrier.y < closest.y ? -1 : 0);
                            const newX = closest.x + dx;
                            const newY = closest.y + dy;

                            if (newX >= 0 && newX < GRID_W && newY >= 0 && newY < GRID_H &&
                                !players.find(p => p.x === newX && p.y === newY)) {
                                closest.x = newX;
                                closest.y = newY;
                                logMsg(`🤖 ${closest.name} si avvicina`, "text-cyan-400");
                                actionsRemaining--;
                                update();
                            } else {
                                // Non puo' muoversi, metti in difesa
                                const defenseType = Math.random() < 0.5 ? DEFENSE_MODES.MURA : DEFENSE_MODES.INTERCETTO;
                                state.selectedPlayer = closest;
                                performDefense(defenseType);
                                actionsRemaining--;
                            }
                        } else {
                            // Lontano - metti in difesa
                            const defender = botPlayers.find(p => !p.defenseMode);
                            if (defender) {
                                state.selectedPlayer = defender;
                                performDefense(DEFENSE_MODES.INTERCETTO);
                                actionsRemaining--;
                            }
                        }
                    }
                } else {
                    // Palla libera - vai a prenderla
                    if (state.ballPosition) {
                        const closest = botPlayers
                            .sort((a, b) => {
                                const distA = Math.abs(a.x - state.ballPosition.x) + Math.abs(a.y - state.ballPosition.y);
                                const distB = Math.abs(b.x - state.ballPosition.x) + Math.abs(b.y - state.ballPosition.y);
                                return distA - distB;
                            })[0];

                        if (closest) {
                            const dx = state.ballPosition.x > closest.x ? 1 : (state.ballPosition.x < closest.x ? -1 : 0);
                            const dy = state.ballPosition.y > closest.y ? 1 : (state.ballPosition.y < closest.y ? -1 : 0);
                            const newX = closest.x + dx;
                            const newY = closest.y + dy;

                            if (!players.find(p => p.x === newX && p.y === newY)) {
                                closest.x = newX;
                                closest.y = newY;
                                logMsg(`🤖 ${closest.name} va verso la palla`, "text-cyan-400");
                                actionsRemaining--;

                                // Controlla se ha raggiunto la palla
                                if (closest.x === state.ballPosition.x && closest.y === state.ballPosition.y) {
                                    state.ballCarrierId = closest.id;
                                    state.ballPosition = null;
                                    logMsg(`🤖 ${closest.name} prende la palla!`, "text-green-400");
                                }
                                update();
                            }
                        }
                    }
                }
            }

            // Prossima azione con delay
            if (actionsRemaining > 0 && !state.isGameOver && state.currentTeam === botTeam) {
                setTimeout(doNextAction, 600);
            } else if (actionsRemaining <= 0 && state.currentTeam === botTeam) {
                // Fine turno bot - passa all'umano
                setTimeout(() => {
                    if (state.currentTeam === botTeam) {
                        switchTurn();
                        update();
                    }
                }, 500);
            }
        }

        // Inizia la prima azione
        setTimeout(doNextAction, 500);
    }

    function resetPositions() {
        // Usa le posizioni iniziali memorizzate quando i giocatori sono stati generati
        players.forEach(p => {
            if (initialPositions[p.id]) {
                p.x = initialPositions[p.id].x;
                p.y = initialPositions[p.id].y;
            }
            p.defenseMode = null;
            p.defenseCells = [];
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

            const defenseClass = p.defenseMode ? `defense-effect defense-${p.defenseMode}` : '';
            const el = document.createElement('div');
            el.className = `player-token team-${p.team.toLowerCase()} ${state.selectedPlayer?.id === p.id ? 'selected' : ''} ${defenseClass}`;
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
            const inDefense = state.selectedPlayer.defenseMode;

            let statusText = state.selectedPlayer.name;
            if (hasBall) statusText += " (PALLA)";
            if (inDefense) statusText += ` [${inDefense.toUpperCase()}]`;

            document.getElementById('smg-stat-name').innerText = statusText;
            document.getElementById('smg-stat-mod').innerText = "+" + state.selectedPlayer.mod;

            // Mostra/nascondi sezioni in base allo stato
            document.getElementById('smg-ball-actions').style.display = hasBall ? "flex" : "none";
            document.getElementById('smg-defense-actions').style.display = hasBall ? "none" : "flex";
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

    /**
     * Verifica se un giocatore e' nella sua area di rigore
     * Area di rigore: 2.5 celle dalla linea di porta, 5 celle di altezza centrate
     */
    function isInOwnPenaltyArea(player) {
        const centerY = Math.floor(GRID_H / 2);
        const penaltyHeight = 2; // +/- 2 celle dal centro
        const penaltyDepth = 2;  // 2 celle dalla linea di porta

        if (player.team === 'A') {
            // Area sinistra: x <= penaltyDepth, y tra centerY-2 e centerY+2
            return player.x <= penaltyDepth &&
                   player.y >= centerY - penaltyHeight &&
                   player.y <= centerY + penaltyHeight;
        } else {
            // Area destra: x >= GRID_W-1-penaltyDepth
            return player.x >= GRID_W - 1 - penaltyDepth &&
                   player.y >= centerY - penaltyHeight &&
                   player.y <= centerY + penaltyHeight;
        }
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
            isGameOver: state.isGameOver,
            multiplayer: state.multiplayer
        }),

        // Funzioni multiplayer
        updateMultiplayerState,
        setTurnTimer,
        isMultiplayer: () => state.multiplayer,
        isMyTurn: () => state.isMyTurn,

        /**
         * Avvia una partita test contro il Bot
         * Uso: window.SfideMinigame.testVsBot()
         */
        testVsBot: function() {
            open({
                testMode: true,
                multiplayer: false,
                onComplete: (result) => {
                    console.log('[SfideMinigame] Partita test completata:', result);
                    const winText = result.winner === 'A' ? 'HAI VINTO!' : (result.winner === 'B' ? 'HAI PERSO...' : 'PAREGGIO');
                    if (window.Toast) window.Toast.info(`${winText} (${result.scoreA}-${result.scoreB})`);
                }
            });
        }
    };

    console.log('[OK] Modulo SfideMinigame (Tattiche Serie) caricato.');

})();
