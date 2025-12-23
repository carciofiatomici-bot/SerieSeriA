//
// ====================================================================
// SFIDE MINIGAME - Minigioco per Sfide (btn-challenge)
// ====================================================================
// Gioco skill-based con 4 ruoli: Portiere, Difensore, Centrocampista, Attaccante
// 3 tentativi per ruolo, difficolta' progressiva
// Basato su testpersfide.html - per integrazione futura con challenges.js
// ====================================================================
//

(function() {
    'use strict';

    // ========================================
    // CONFIGURAZIONE
    // ========================================
    const config = {
        BASE_WIDTH: 800,
        BASE_HEIGHT: 600,
        MAX_ATTEMPTS: 3,
        MIN_SCALE: 0.5,
        MAX_SCALE: 1.0
    };

    // ========================================
    // STATO DEL GIOCO
    // ========================================
    let state = {
        gameState: 'MENU', // MENU, PLAYING, GAMEOVER
        role: '',
        score: 0,
        attempts: 0,
        frameId: null,
        scale: 1,
        testMode: false,
        onComplete: null
    };

    let mouse = { x: 0, y: 0 };
    let player = { x: 0, y: 0, radius: 25, color: '#2563eb' };
    let ball = { x: 0, y: 0, radius: 12, vx: 0, vy: 0, active: false };
    let targets = [];

    // Elementi DOM
    let modal = null;
    let canvas = null;
    let ctx = null;
    let hudEl = null;
    let feedbackEl = null;
    let menuEl = null;
    let gameOverEl = null;

    // ========================================
    // INIZIALIZZAZIONE
    // ========================================

    function init() {
        if (modal) return; // Gia' inizializzato

        modal = document.createElement('div');
        modal.id = 'sfide-minigame-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 hidden flex items-center justify-center';
        modal.innerHTML = `
            <div class="relative w-full h-full flex flex-col items-center justify-center">
                <!-- Bottone Chiudi -->
                <button id="sfide-minigame-close" class="absolute top-4 right-4 z-20 text-white text-3xl hover:text-red-400 transition">
                    <i class="fas fa-times"></i>
                </button>

                <!-- Canvas Container -->
                <div id="sfide-minigame-canvas-container" class="relative">
                    <canvas id="sfide-minigame-canvas"></canvas>

                    <!-- HUD -->
                    <div id="sfide-minigame-hud" class="absolute top-2 left-2 text-white text-sm font-bold hidden" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
                        <div>Ruolo: <span id="smg-hud-role"></span></div>
                        <div>Tentativo: <span id="smg-hud-attempt">1</span>/3</div>
                        <div>Successi: <span id="smg-hud-score">0</span></div>
                    </div>

                    <!-- Feedback -->
                    <div id="sfide-minigame-feedback" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-300">
                        <span class="text-4xl sm:text-6xl font-black" style="text-shadow: 3px 3px 0 #000;"></span>
                    </div>
                </div>

                <!-- Menu Selezione Ruolo -->
                <div id="sfide-minigame-menu" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                    <div class="bg-gray-800 rounded-xl p-6 max-w-md w-11/12 border-2 border-orange-500 shadow-2xl">
                        <h2 class="text-2xl sm:text-3xl font-bold text-center text-white mb-2">Sfida</h2>
                        <p class="text-gray-400 text-center mb-6">Seleziona il tuo ruolo:</p>
                        <div class="space-y-3">
                            <button data-role="gk" class="smg-role-btn w-full py-3 px-4 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white font-bold rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition transform hover:scale-[1.02] flex items-center justify-center gap-3">
                                <span class="text-2xl">🧤</span> Portiere (Para)
                            </button>
                            <button data-role="def" class="smg-role-btn w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-500 hover:to-blue-600 transition transform hover:scale-[1.02] flex items-center justify-center gap-3">
                                <span class="text-2xl">🛡️</span> Difensore (Intercetta)
                            </button>
                            <button data-role="mid" class="smg-role-btn w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg hover:from-green-500 hover:to-green-600 transition transform hover:scale-[1.02] flex items-center justify-center gap-3">
                                <span class="text-2xl">👟</span> Centrocampista (Passa)
                            </button>
                            <button data-role="fwd" class="smg-role-btn w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg hover:from-red-500 hover:to-red-600 transition transform hover:scale-[1.02] flex items-center justify-center gap-3">
                                <span class="text-2xl">⚡</span> Attaccante (Segna)
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Game Over -->
                <div id="sfide-minigame-gameover" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 hidden">
                    <div class="bg-gray-800 rounded-xl p-6 max-w-md w-11/12 border-2 border-orange-500 shadow-2xl text-center">
                        <h2 class="text-3xl font-bold text-white mb-2">Fine Sfida!</h2>
                        <p class="text-xl text-gray-300 mb-4">Punteggio: <span id="smg-final-score" class="font-bold text-orange-400"></span>/3</p>
                        <div class="space-y-3">
                            <button id="smg-btn-retry" class="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold rounded-lg hover:from-orange-500 hover:to-orange-600 transition">
                                🔄 Riprova
                            </button>
                            <button id="smg-btn-menu" class="w-full py-3 px-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-600 transition">
                                📋 Cambia Ruolo
                            </button>
                            <button id="smg-btn-close" class="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg hover:from-red-500 hover:to-red-600 transition">
                                ✕ Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Riferimenti elementi
        canvas = document.getElementById('sfide-minigame-canvas');
        ctx = canvas.getContext('2d');
        hudEl = document.getElementById('sfide-minigame-hud');
        feedbackEl = document.getElementById('sfide-minigame-feedback');
        menuEl = document.getElementById('sfide-minigame-menu');
        gameOverEl = document.getElementById('sfide-minigame-gameover');

        // Event Listeners
        setupEventListeners();

        console.log('[SfideMinigame] Inizializzato');
    }

    function setupEventListeners() {
        // Chiudi modal
        document.getElementById('sfide-minigame-close').addEventListener('click', close);

        // Selezione ruolo
        document.querySelectorAll('.smg-role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const role = btn.dataset.role;
                startGame(role);
            });
        });

        // Game Over buttons
        document.getElementById('smg-btn-retry').addEventListener('click', () => {
            startGame(state.role);
        });
        document.getElementById('smg-btn-menu').addEventListener('click', showMenu);
        document.getElementById('smg-btn-close').addEventListener('click', close);

        // Mouse events
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mousedown', handleInput);

        // Touch events
        canvas.addEventListener('touchmove', handleTouch, { passive: false });
        canvas.addEventListener('touchstart', handleInput, { passive: false });

        // Resize
        window.addEventListener('resize', resizeCanvas);
    }

    // ========================================
    // LIFECYCLE
    // ========================================

    function open(options = {}) {
        init();

        state.testMode = options.testMode || false;
        state.onComplete = options.onComplete || null;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        resizeCanvas();
        showMenu();

        console.log('[SfideMinigame] Aperto', { testMode: state.testMode });
    }

    function close() {
        if (state.frameId) {
            cancelAnimationFrame(state.frameId);
            state.frameId = null;
        }

        state.gameState = 'MENU';

        if (modal) {
            modal.classList.add('hidden');
        }
        document.body.style.overflow = '';

        // Callback con risultato
        if (state.onComplete) {
            state.onComplete(state.score);
        }

        console.log('[SfideMinigame] Chiuso con score:', state.score);
    }

    function showMenu() {
        state.gameState = 'MENU';
        state.score = 0;
        state.attempts = 0;

        if (state.frameId) {
            cancelAnimationFrame(state.frameId);
            state.frameId = null;
        }

        menuEl.classList.remove('hidden');
        gameOverEl.classList.add('hidden');
        hudEl.classList.add('hidden');

        // Disegna sfondo campo
        drawField();
    }

    // ========================================
    // CANVAS RESIZE
    // ========================================

    function resizeCanvas() {
        if (!canvas) return;

        const container = document.getElementById('sfide-minigame-canvas-container');
        const maxWidth = window.innerWidth * 0.95;
        const maxHeight = window.innerHeight * 0.85;

        // Mantieni aspect ratio 4:3
        let width = config.BASE_WIDTH;
        let height = config.BASE_HEIGHT;

        // Scala per adattarsi allo schermo
        const scaleX = maxWidth / width;
        const scaleY = maxHeight / height;
        state.scale = Math.min(scaleX, scaleY, config.MAX_SCALE);
        state.scale = Math.max(state.scale, config.MIN_SCALE);

        canvas.width = Math.floor(width * state.scale);
        canvas.height = Math.floor(height * state.scale);

        canvas.style.borderRadius = '12px';
        canvas.style.border = '3px solid #f97316'; // Arancione per sfide

        if (state.gameState === 'MENU') {
            drawField();
        }
    }

    // ========================================
    // INPUT HANDLING
    // ========================================

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) / state.scale * (config.BASE_WIDTH / canvas.width * state.scale);
        mouse.y = (e.clientY - rect.top) / state.scale * (config.BASE_HEIGHT / canvas.height * state.scale);
    }

    function handleTouch(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouse.x = (touch.clientX - rect.left) / state.scale * (config.BASE_WIDTH / canvas.width * state.scale);
        mouse.y = (touch.clientY - rect.top) / state.scale * (config.BASE_HEIGHT / canvas.height * state.scale);
    }

    function handleInput(e) {
        if (e) e.preventDefault();
        if (state.gameState !== 'PLAYING') return;

        if (state.role === 'mid' && !ball.active) {
            shootBall(12);
        } else if (state.role === 'fwd' && !ball.active) {
            shootBall(18);
        }
    }

    function shootBall(speed) {
        const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        ball.active = true;
    }

    // ========================================
    // GAME SETUP
    // ========================================

    function startGame(role) {
        state.role = role;
        state.gameState = 'PLAYING';
        state.score = 0;
        state.attempts = 0;

        menuEl.classList.add('hidden');
        gameOverEl.classList.add('hidden');
        hudEl.classList.remove('hidden');

        canvas.style.cursor = (role === 'mid' || role === 'fwd') ? 'crosshair' : 'none';

        updateHud();
        resetRound();
        gameLoop();
    }

    function resetRound() {
        if (state.attempts >= config.MAX_ATTEMPTS) {
            endGame();
            return;
        }

        ball.active = false;
        targets = [];

        // Difficolta' progressiva
        const speedMultiplier = 1 + (state.attempts * 0.4); // +40% per tentativo

        switch (state.role) {
            case 'gk': setupGoalkeeper(speedMultiplier); break;
            case 'def': setupDefender(speedMultiplier); break;
            case 'mid': setupMidfielder(speedMultiplier); break;
            case 'fwd': setupStriker(speedMultiplier); break;
        }

        updateHud();
    }

    function setupGoalkeeper(speedMult) {
        const W = config.BASE_WIDTH;
        const H = config.BASE_HEIGHT;

        player.x = W / 2;
        player.y = H - 80;
        player.radius = 40;
        player.color = '#eab308'; // Yellow

        ball.active = true;
        ball.x = W / 2;
        ball.y = 50;
        ball.radius = 15;

        // Traiettoria verso porta (random X)
        const targetX = (W / 2 - 200) + Math.random() * 400;
        const targetY = H + 50;

        const angle = Math.atan2(targetY - ball.y, targetX - ball.x);
        const speed = 7 * speedMult;

        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
    }

    function setupDefender(speedMult) {
        const W = config.BASE_WIDTH;
        const H = config.BASE_HEIGHT;

        player.x = W / 2;
        player.y = H - 150;
        player.radius = 22;
        player.color = '#3b82f6'; // Blue

        // Nemico dall'alto
        targets = [{
            x: Math.random() * (W - 200) + 100,
            y: -60,
            radius: 28,
            speed: 3 * speedMult,
            hasBall: true
        }];
    }

    function setupMidfielder(speedMult) {
        const W = config.BASE_WIDTH;
        const H = config.BASE_HEIGHT;

        player.x = W / 2;
        player.y = H - 100;
        player.radius = 20;
        player.color = '#22c55e'; // Green

        ball.x = player.x;
        ball.y = player.y;
        ball.active = false;
        ball.radius = 12;

        // 3 compagni che si muovono
        targets = [];
        for (let i = 0; i < 3; i++) {
            targets.push({
                x: Math.random() * (W - 150) + 75,
                y: Math.random() * (H * 0.5) + 80,
                radius: 25,
                vx: (Math.random() > 0.5 ? 1 : -1) * 3 * speedMult,
                vy: 0,
                type: 'teammate'
            });
        }
    }

    function setupStriker(speedMult) {
        const W = config.BASE_WIDTH;
        const H = config.BASE_HEIGHT;

        player.x = W / 2;
        player.y = H - 100;
        player.radius = 20;
        player.color = '#ef4444'; // Red

        ball.x = player.x;
        ball.y = player.y;
        ball.active = false;
        ball.radius = 12;

        // Portiere nemico
        targets = [{
            x: W / 2,
            y: 80,
            width: 90,
            height: 35,
            vx: 4 * speedMult,
            type: 'gk_enemy'
        }];
    }

    // ========================================
    // GAME UPDATE
    // ========================================

    function update() {
        const W = config.BASE_WIDTH;
        const H = config.BASE_HEIGHT;

        switch (state.role) {
            case 'gk': updateGoalkeeper(W, H); break;
            case 'def': updateDefender(W, H); break;
            case 'mid': updateMidfielder(W, H); break;
            case 'fwd': updateStriker(W, H); break;
        }
    }

    function updateGoalkeeper(W, H) {
        // Movimento orizzontale
        player.x = mouse.x;
        player.x = Math.max(player.radius, Math.min(W - player.radius, player.x));

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Collisione con portiere
        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (player.radius + ball.radius + 15)) {
            showFeedback("PARATA!", "#22c55e");
            state.score++;
            nextAttempt();
        } else if (ball.y > H) {
            showFeedback("GOL SUBITO!", "#ef4444");
            nextAttempt();
        }
    }

    function updateDefender(W, H) {
        player.x = mouse.x;
        player.y = mouse.y;

        const enemy = targets[0];
        if (!enemy) return;

        enemy.y += enemy.speed;

        // Palla nemica (avanti rispetto al corpo)
        const ballDist = 50;
        const enemyBallX = enemy.x;
        const enemyBallY = enemy.y + ballDist;
        const enemyBallRadius = 18;

        // Distanze
        const distBody = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        const distBall = Math.hypot(player.x - enemyBallX, player.y - enemyBallY);

        // Priorita': palla prima del corpo
        if (distBall < (player.radius + enemyBallRadius + 8)) {
            showFeedback("PRESA!", "#22c55e");
            state.score++;
            nextAttempt();
        } else if (distBody < (player.radius + enemy.radius - 5)) {
            showFeedback("FALLO!", "#ef4444");
            nextAttempt();
        } else if (enemy.y > H) {
            showFeedback("PERSO!", "#f59e0b");
            nextAttempt();
        }
    }

    function updateMidfielder(W, H) {
        // Movimento compagni
        targets.forEach(t => {
            t.x += t.vx;
            if (t.x < 60 || t.x > W - 60) t.vx *= -1;
        });

        if (ball.active) {
            ball.x += ball.vx;
            ball.y += ball.vy;

            let hit = false;
            for (let i = targets.length - 1; i >= 0; i--) {
                const t = targets[i];
                const dist = Math.hypot(ball.x - t.x, ball.y - t.y);
                if (dist < (ball.radius + t.radius + 8)) {
                    showFeedback("ASSIST!", "#22c55e");
                    state.score++;
                    hit = true;
                    targets.splice(i, 1);
                    break;
                }
            }

            if (hit) {
                nextAttempt();
            } else if (ball.x < 0 || ball.x > W || ball.y < 0 || ball.y > H) {
                showFeedback("FUORI!", "#f59e0b");
                nextAttempt();
            }
        }
    }

    function updateStriker(W, H) {
        const gk = targets[0];

        // Movimento portiere
        gk.x += gk.vx;
        const goalCenter = W / 2;
        if (gk.x < goalCenter - 130 || gk.x > goalCenter + 130) {
            gk.vx *= -1;
        }

        if (ball.active) {
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Collisione portiere (rettangolo)
            if (ball.x > gk.x - (gk.width / 2 + 12) &&
                ball.x < gk.x + (gk.width / 2 + 12) &&
                ball.y > gk.y - (gk.height / 2 + 12) &&
                ball.y < gk.y + (gk.height / 2 + 18)) {

                showFeedback("PARATA!", "#ef4444");
                nextAttempt();
                return;
            }

            // GOL (palla oltre linea porta)
            if (ball.y < 50) {
                if (ball.x > goalCenter - 150 && ball.x < goalCenter + 150) {
                    showFeedback("GOOOOL!", "#22c55e");
                    state.score++;
                } else {
                    showFeedback("FUORI!", "#f59e0b");
                }
                nextAttempt();
            }
        }
    }

    function nextAttempt() {
        ball.active = false;
        state.attempts++;

        setTimeout(() => {
            if (state.gameState === 'PLAYING') {
                resetRound();
            }
        }, 1200);
    }

    function endGame() {
        state.gameState = 'GAMEOVER';
        canvas.style.cursor = 'default';
        hudEl.classList.add('hidden');
        gameOverEl.classList.remove('hidden');
        document.getElementById('smg-final-score').textContent = state.score;

        console.log('[SfideMinigame] Game Over - Score:', state.score);
    }

    // ========================================
    // DRAWING
    // ========================================

    function draw() {
        const W = config.BASE_WIDTH;
        const H = config.BASE_HEIGHT;
        const scale = canvas.width / W;

        ctx.save();
        ctx.scale(scale, scale);

        // Sfondo campo (arancione tenue per sfide)
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, 0, W, H);

        // Linee campo
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 4;

        if (state.role === 'gk' || state.role === 'fwd') {
            // Area di rigore
            const areaY = state.role === 'gk' ? H - 200 : 0;
            ctx.strokeRect(W / 2 - 250, areaY, 500, 200);

            // Linea di porta
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            const goalY = state.role === 'gk' ? H - 8 : 8;
            ctx.fillRect(W / 2 - 150, goalY, 300, 6);
        } else {
            // Centrocampo
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, H / 2);
            ctx.lineTo(W, H / 2);
            ctx.stroke();
        }

        if (state.gameState !== 'PLAYING') {
            ctx.restore();
            return;
        }

        // Giocatore
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Guanti portiere
        if (state.role === 'gk') {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(player.x - 30, player.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(player.x + 30, player.y, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        // Target/Nemici
        if (state.role === 'def') {
            const enemy = targets[0];
            if (enemy) {
                // Corpo nemico
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#ef4444';
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('AVV', enemy.x, enemy.y);

                // Palla nemica
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y + 50, 15, 0, Math.PI * 2);
                ctx.fillStyle = 'white';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else if (state.role === 'fwd') {
            const gk = targets[0];
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(gk.x - gk.width / 2, gk.y - gk.height / 2, gk.width, gk.height);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PORTIERE', gk.x, gk.y);
        } else if (state.role === 'mid') {
            targets.forEach(t => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 4;
                ctx.stroke();
            });
        }

        // Palla
        if (state.role !== 'def') {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Mirino per mid/fwd
        if ((state.role === 'mid' || state.role === 'fwd') && !ball.active) {
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([8, 8]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);

            // Cursore mira
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#f97316'; // Arancione
            ctx.fill();
        }

        ctx.restore();
    }

    function drawField() {
        if (!ctx || !canvas) return;

        const W = config.BASE_WIDTH;
        const H = config.BASE_HEIGHT;
        const scale = canvas.width / W;

        ctx.save();
        ctx.scale(scale, scale);

        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, 0, W, H);

        // Linee decorative
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();

        ctx.restore();
    }

    // ========================================
    // UI HELPERS
    // ========================================

    function showFeedback(text, color) {
        const span = feedbackEl.querySelector('span');
        span.textContent = text;
        span.style.color = color;
        feedbackEl.style.opacity = '1';

        setTimeout(() => {
            feedbackEl.style.opacity = '0';
        }, 800);
    }

    function updateHud() {
        const roles = {
            'gk': 'Portiere',
            'def': 'Difensore',
            'mid': 'Centrocampista',
            'fwd': 'Attaccante'
        };
        document.getElementById('smg-hud-role').textContent = roles[state.role] || '';
        document.getElementById('smg-hud-attempt').textContent = Math.min(state.attempts + 1, config.MAX_ATTEMPTS);
        document.getElementById('smg-hud-score').textContent = state.score;
    }

    // ========================================
    // GAME LOOP
    // ========================================

    function gameLoop() {
        if (state.gameState === 'PLAYING') {
            update();
            draw();
            state.frameId = requestAnimationFrame(gameLoop);
        }
    }

    // ========================================
    // ESPOSIZIONE MODULO
    // ========================================

    window.SfideMinigame = {
        init,
        open,
        close,
        getScore: () => state.score
    };

    console.log('[OK] Modulo SfideMinigame caricato.');

})();
