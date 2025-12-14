//
// ====================================================================
// TRAINING-EXP-MINIGAME.JS - Minigioco Allenamento per XP
// ====================================================================
//

window.TrainingExpMinigame = {

    // ==================== CONFIGURAZIONE ====================
    config: {
        XP_PER_SUCCESS: 50,      // XP per ogni tentativo riuscito
        MAX_ATTEMPTS: 3,          // Numero massimo di tentativi
        MAX_XP: 150               // XP massimo ottenibile (3 * 50)
    },

    // ==================== STATO ====================
    isOpen: false,
    currentPlayer: null,
    currentRole: null,          // 'gk', 'def', 'mid', 'fwd'
    score: 0,
    attempts: 0,
    gameState: 'MENU',          // 'MENU', 'PLAYING', 'GAMEOVER'
    roundActive: true,          // Flag per evitare multipli nextAttempt()
    onCompleteCallback: null,
    frameId: null,

    // ==================== ELEMENTI DOM ====================
    modal: null,
    canvas: null,
    ctx: null,
    hudEl: null,
    feedbackEl: null,
    gameOverEl: null,

    // ==================== OGGETTI DI GIOCO ====================
    mouse: { x: 0, y: 0 },
    player: { x: 0, y: 0, radius: 25, color: '#2563eb' },
    ball: { x: 0, y: 0, radius: 12, vx: 0, vy: 0, active: false },
    targets: [],

    // ==================== INIZIALIZZAZIONE ====================

    init() {
        if (this.modal) return; // Gia inizializzato

        // Crea struttura modal
        this.modal = document.createElement('div');
        this.modal.id = 'training-exp-modal';
        this.modal.className = 'fixed inset-0 z-[9999] bg-black bg-opacity-90 hidden';
        this.modal.innerHTML = `
            <div class="relative w-full h-full flex flex-col items-center justify-center">
                <!-- Header -->
                <div class="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <div id="training-hud" class="text-white text-lg font-bold" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8); display: none;">
                        <div>Giocatore: <span id="hud-player-name"></span></div>
                        <div>Ruolo: <span id="hud-role"></span></div>
                        <div>Tentativo: <span id="hud-attempt">1</span>/3</div>
                        <div>Successi: <span id="hud-score">0</span></div>
                    </div>
                    <button id="training-close-btn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition">
                        Chiudi
                    </button>
                </div>

                <!-- Canvas Container -->
                <div id="training-canvas-container" class="relative">
                    <canvas id="training-canvas" class="rounded-lg shadow-2xl" style="background: #4ade80;"></canvas>

                    <!-- Feedback overlay -->
                    <div id="training-feedback" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-300">
                        <span class="text-6xl font-extrabold" style="text-shadow: 3px 3px 0 #000;"></span>
                    </div>
                </div>

                <!-- Game Over Screen -->
                <div id="training-gameover" class="absolute inset-0 flex items-center justify-center hidden">
                    <div class="bg-white bg-opacity-95 p-8 rounded-xl shadow-2xl text-center max-w-md">
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">Allenamento Completato!</h2>
                        <p class="text-xl text-gray-600 mb-2">Giocatore: <span id="gameover-player" class="font-bold text-blue-600"></span></p>
                        <p class="text-2xl mb-4">Successi: <span id="gameover-score" class="font-bold text-green-600"></span>/3</p>
                        <p class="text-lg text-gray-600 mb-6">XP Guadagnati: <span id="gameover-xp" class="font-bold text-purple-600"></span></p>
                        <button id="training-confirm-btn" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition">
                            Conferma
                        </button>
                    </div>
                </div>

                <!-- Instructions -->
                <div id="training-instructions" class="absolute bottom-4 left-4 right-4 text-center text-white text-sm opacity-75">
                    <span id="instruction-text"></span>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Riferimenti elementi
        this.canvas = document.getElementById('training-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.hudEl = document.getElementById('training-hud');
        this.feedbackEl = document.getElementById('training-feedback');
        this.gameOverEl = document.getElementById('training-gameover');

        // Event listeners
        this.setupEventListeners();

        console.log('[TrainingExpMinigame] Inizializzato');
    },

    setupEventListeners() {
        // Chiudi
        document.getElementById('training-close-btn').addEventListener('click', () => {
            this.close(true); // true = annullato
        });

        // Conferma fine gioco
        document.getElementById('training-confirm-btn').addEventListener('click', () => {
            this.close(false); // false = completato
        });

        // Mouse move
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        // Touch move
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.touches[0].clientX - rect.left;
            this.mouse.y = e.touches[0].clientY - rect.top;
        }, { passive: false });

        // Click/Touch per tiro/passaggio
        this.canvas.addEventListener('mousedown', () => this.handleInput());
        this.canvas.addEventListener('touchstart', () => this.handleInput());

        // Resize
        window.addEventListener('resize', () => {
            if (this.isOpen) this.resizeCanvas();
        });
    },

    resizeCanvas() {
        // Dimensioni responsive (max 800x600, min 320x240)
        const maxW = Math.min(800, window.innerWidth - 32);
        const maxH = Math.min(600, window.innerHeight - 150);

        // Mantieni aspect ratio 4:3
        const ratio = 4 / 3;
        let w = maxW;
        let h = w / ratio;

        if (h > maxH) {
            h = maxH;
            w = h * ratio;
        }

        this.canvas.width = w;
        this.canvas.height = h;
    },

    // ==================== APERTURA/CHIUSURA ====================

    open(player, onComplete) {
        if (!player) {
            console.error('[TrainingExpMinigame] Player non valido');
            return;
        }

        // Previeni apertura multipla
        if (this.isOpen) {
            console.warn('[TrainingExpMinigame] Minigioco gia aperto');
            return;
        }

        // Verifica cooldown prima di aprire (double-check)
        if (this.isInCooldown(player.role) && !window.FeatureFlags?.isEnabled('trainingExpTestMode')) {
            console.warn(`[TrainingExpMinigame] Cooldown attivo per ruolo ${player.role}`);
            if (window.Toast) {
                window.Toast.warning(`Hai gia allenato un ${this.getRoleNameItalian(player.role)} oggi!`);
            }
            return;
        }

        this.init();

        // Mappa ruolo giocatore a ruolo minigioco
        const roleMap = { 'P': 'gk', 'D': 'def', 'C': 'mid', 'A': 'fwd' };
        const gameRole = roleMap[player.role] || 'mid';

        this.currentPlayer = player;
        this.currentRole = gameRole;
        this.onCompleteCallback = onComplete;
        this.score = 0;
        this.attempts = 0;
        this.gameState = 'PLAYING';
        this.roundActive = true;
        this.isOpen = true;

        // Reset elementi
        this.gameOverEl.classList.add('hidden');
        this.hudEl.style.display = 'block';
        this.feedbackEl.style.opacity = '0';

        // Mostra modal
        this.modal.classList.remove('hidden');

        // Resize e setup
        this.resizeCanvas();
        this.updateHud();
        this.setInstructions();
        this.resetRound();

        // Cursor
        this.canvas.style.cursor = (gameRole === 'mid' || gameRole === 'fwd') ? 'crosshair' : 'none';

        // Avvia game loop
        this.gameLoop();

        console.log(`[TrainingExpMinigame] Aperto per ${player.name} (${player.role} -> ${gameRole})`);
    },

    close(cancelled = false) {
        this.isOpen = false;
        this.gameState = 'MENU';

        // Ferma game loop
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        // Nascondi modal
        this.modal.classList.add('hidden');

        // Callback con risultato
        if (this.onCompleteCallback) {
            if (cancelled) {
                this.onCompleteCallback(-1); // Annullato = -1 (valore speciale)
            } else {
                this.onCompleteCallback(this.score); // 0-3 = completato
            }
            this.onCompleteCallback = null;
        }

        console.log(`[TrainingExpMinigame] Chiuso - Score: ${this.score}, Cancelled: ${cancelled}`);
    },

    // ==================== COOLDOWN (per ruolo) ====================

    /**
     * Verifica se un ruolo specifico e' in cooldown
     * @param {string} role - Ruolo del giocatore (P, D, C, A)
     */
    isInCooldown(role) {
        if (!role) return false;

        const teamData = window.InterfacciaCore?.currentTeamData;
        const trainingByRole = teamData?.lastTrainingByRole;

        if (!trainingByRole || !trainingByRole[role]) return false;

        const trainingDate = new Date(trainingByRole[role]);
        const today = new Date();

        // Stesso giorno = cooldown attivo per quel ruolo
        return trainingDate.toDateString() === today.toDateString();
    },

    /**
     * Restituisce il countdown fino a mezzanotte
     */
    getCooldownCountdown() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);

        const diff = midnight.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    },

    /**
     * Restituisce il nome italiano del ruolo
     */
    getRoleNameItalian(role) {
        const names = {
            'P': 'Portiere',
            'D': 'Difensore',
            'C': 'Centrocampista',
            'A': 'Attaccante'
        };
        return names[role] || 'giocatore';
    },

    /**
     * Imposta il cooldown per un ruolo specifico
     * @param {string} teamId - ID della squadra
     * @param {string} role - Ruolo del giocatore (P, D, C, A)
     */
    async setCooldown(teamId, role) {
        if (!teamId || !role || !window.db || !window.firestoreTools) {
            console.error('[TrainingExpMinigame] Impossibile salvare cooldown');
            return;
        }

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamDocRef = doc(window.db, `artifacts/${appId}/public/data/teams`, teamId);

            // Ottieni i cooldown esistenti o crea nuovo oggetto
            const teamData = window.InterfacciaCore?.currentTeamData;
            const existingCooldowns = teamData?.lastTrainingByRole || {};

            const updatedCooldowns = {
                ...existingCooldowns,
                [role]: Date.now()
            };

            await updateDoc(teamDocRef, {
                lastTrainingByRole: updatedCooldowns
            });

            // Aggiorna anche in memoria
            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.lastTrainingByRole = updatedCooldowns;
            }

            console.log(`[TrainingExpMinigame] Cooldown salvato per ruolo ${role}`);
        } catch (error) {
            console.error('[TrainingExpMinigame] Errore salvataggio cooldown:', error);
        }
    },

    // ==================== SETUP RUOLI ====================

    setupGoalkeeper() {
        // Portiere fisso sulla linea di porta in basso
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 80;
        this.player.radius = 40;

        this.ball.active = true;
        this.ball.x = this.canvas.width / 2;
        this.ball.y = 50;

        // Traiettoria verso la porta (random X proporzionale al canvas)
        const goalWidth = Math.min(300, this.canvas.width * 0.5);
        const targetX = (this.canvas.width / 2 - goalWidth / 2) + Math.random() * goalWidth;
        const targetY = this.canvas.height + 50;

        const angle = Math.atan2(targetY - this.ball.y, targetX - this.ball.x);

        // Difficolta progressiva
        const speedLevels = [6, 9, 12]; // Facile, Medio, Difficile
        const speed = speedLevels[this.attempts] || speedLevels[2];

        this.ball.vx = Math.cos(angle) * speed;
        this.ball.vy = Math.sin(angle) * speed;
    },

    setupDefender() {
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 150;
        this.player.radius = 20;

        // Difficolta progressiva
        const speedLevels = [2.5, 4, 6]; // Facile, Medio, Difficile
        const enemySpeed = speedLevels[this.attempts] || speedLevels[2];

        // Nemico parte dall'alto
        this.targets = [{
            x: Math.random() * (this.canvas.width - 200) + 100,
            y: -60,
            radius: 30,
            speed: enemySpeed,
            hasBall: true
        }];
    },

    setupMidfielder() {
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 100;

        this.ball.x = this.player.x;
        this.ball.y = this.player.y;
        this.ball.active = false;

        // Difficolta progressiva
        const speedLevels = [2, 3.5, 5.5];  // Facile, Medio, Difficile
        const radiusLevels = [28, 22, 16];  // Grande, Medio, Piccolo
        const teammateSpeed = speedLevels[this.attempts] || speedLevels[2];
        const teammateRadius = radiusLevels[this.attempts] || radiusLevels[2];

        this.targets = [];
        for (let i = 0; i < 3; i++) {
            this.targets.push({
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * (this.canvas.height * 0.5) + 50,
                radius: teammateRadius,
                vx: (Math.random() > 0.5 ? 1 : -1) * teammateSpeed,
                vy: 0,
                type: 'teammate'
            });
        }
    },

    setupStriker() {
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 100;

        this.ball.x = this.player.x;
        this.ball.y = this.player.y;
        this.ball.active = false;

        // Difficolta progressiva
        const speedLevels = [3, 5, 8];      // Facile, Medio, Difficile
        const widthLevels = [60, 90, 130];  // Stretto, Medio, Largo
        const gkSpeed = speedLevels[this.attempts] || speedLevels[2];
        const gkWidth = widthLevels[this.attempts] || widthLevels[2];

        // Portiere nemico
        this.targets = [{
            x: this.canvas.width / 2,
            y: 80,
            width: gkWidth,
            height: 30,
            vx: gkSpeed,
            type: 'gk_enemy'
        }];
    },

    // ==================== INPUT ====================

    handleInput() {
        if (this.gameState !== 'PLAYING') return;

        if (this.currentRole === 'mid' && !this.ball.active) {
            const angle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
            const speed = 12;
            this.ball.vx = Math.cos(angle) * speed;
            this.ball.vy = Math.sin(angle) * speed;
            this.ball.active = true;
        } else if (this.currentRole === 'fwd' && !this.ball.active) {
            const angle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
            const speed = 18;
            this.ball.vx = Math.cos(angle) * speed;
            this.ball.vy = Math.sin(angle) * speed;
            this.ball.active = true;
        }
    },

    // ==================== UPDATE ====================

    update() {
        if (this.currentRole === 'gk') this.updateGK();
        else if (this.currentRole === 'def') this.updateDef();
        else if (this.currentRole === 'mid') this.updateMid();
        else if (this.currentRole === 'fwd') this.updateFwd();
    },

    updateGK() {
        // Il portiere si muove solo orizzontalmente
        this.player.x = this.mouse.x;
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));

        // Se il round e' gia' concluso, non processare
        if (!this.roundActive) return;

        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Collisione
        const dx = this.ball.x - this.player.x;
        const dy = this.ball.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (this.player.radius + this.ball.radius + 10)) {
            this.showFeedback('PARATA!', 'green');
            this.score++;
            this.nextAttempt(true); // Successo
            return;
        } else if (this.ball.y > this.canvas.height) {
            this.showFeedback('GOL SUBITO!', 'red');
            this.nextAttempt(false); // Fallimento
            return;
        }
    },

    updateDef() {
        // Il difensore segue il mouse ma resta nella sua meta campo (parte bassa)
        const halfField = this.canvas.height / 2;
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.mouse.x));
        this.player.y = Math.max(halfField + this.player.radius, Math.min(this.canvas.height - this.player.radius, this.mouse.y));

        // Se il round e' gia' concluso, non processare
        if (!this.roundActive) return;

        const enemy = this.targets[0];
        if (!enemy) return;

        enemy.y += enemy.speed;

        const ballDistFromFeet = 50;
        const enemyBallX = enemy.x;
        const enemyBallY = enemy.y + ballDistFromFeet;
        const enemyBallRadius = 18;

        const distBody = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
        const distBall = Math.hypot(this.player.x - enemyBallX, this.player.y - enemyBallY);

        if (distBall < (this.player.radius + enemyBallRadius + 5)) {
            this.showFeedback('PRESA!', 'green');
            this.score++;
            this.nextAttempt(true); // Successo
            return;
        } else if (distBody < (this.player.radius + enemy.radius - 5)) {
            this.showFeedback('FALLO!', 'red');
            this.nextAttempt(false); // Fallimento
            return;
        } else if (enemy.y > this.canvas.height) {
            this.showFeedback('PERSO!', 'orange');
            this.nextAttempt(false); // Fallimento
            return;
        }
    },

    updateMid() {
        // Muovi i compagni anche se il round e' concluso (per visual)
        this.targets.forEach(t => {
            t.x += t.vx;
            if (t.x < 50 || t.x > this.canvas.width - 50) t.vx *= -1;
        });

        // Se il round e' gia' concluso, non processare collisioni
        if (!this.roundActive) return;

        if (this.ball.active) {
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;

            let hit = false;
            this.targets.forEach((t, index) => {
                if (hit) return; // Gia' colpito un target
                const dist = Math.hypot(this.ball.x - t.x, this.ball.y - t.y);
                if (dist < (this.ball.radius + t.radius + 5)) {
                    this.showFeedback('ASSIST!', 'green');
                    this.score++;
                    hit = true;
                    this.targets.splice(index, 1);
                }
            });

            if (hit) {
                this.nextAttempt(true); // Successo
                return;
            } else if (this.ball.x < 0 || this.ball.x > this.canvas.width ||
                       this.ball.y < 0 || this.ball.y > this.canvas.height) {
                this.showFeedback('FUORI!', 'orange');
                this.nextAttempt(false); // Fallimento
                return;
            }
        }
    },

    updateFwd() {
        const gk = this.targets[0];

        // Movimento portiere nemico (anche se round concluso per visual)
        gk.x += gk.vx;
        const goalCenter = this.canvas.width / 2;
        if (gk.x < goalCenter - 120 || gk.x > goalCenter + 120) {
            gk.vx *= -1;
        }

        // Se il round e' gia' concluso, non processare collisioni
        if (!this.roundActive) return;

        if (this.ball.active) {
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;

            // Collisione portiere nemico
            if (this.ball.x > gk.x - (gk.width / 2 + 10) &&
                this.ball.x < gk.x + (gk.width / 2 + 10) &&
                this.ball.y > gk.y - (gk.height / 2 + 10) &&
                this.ball.y < gk.y + (gk.height / 2 + 15)) {
                this.showFeedback('PARATO!', 'red');
                this.nextAttempt(false); // Fallimento
                return;
            }

            // GOL o FUORI
            if (this.ball.y < 60) {
                if (this.ball.x > goalCenter - 150 && this.ball.x < goalCenter + 150) {
                    this.showFeedback('GOOOOL!', 'green');
                    this.score++;
                    this.nextAttempt(true); // Successo
                } else {
                    this.showFeedback('FUORI!', 'orange');
                    this.nextAttempt(false); // Fallimento
                }
                return;
            }
        }
    },

    // ==================== GESTIONE ROUND ====================

    resetRound() {
        if (this.attempts >= 3) {
            this.endGame();
            return;
        }

        // Attiva il nuovo round
        this.roundActive = true;

        if (this.currentRole === 'gk') this.setupGoalkeeper();
        else if (this.currentRole === 'def') this.setupDefender();
        else if (this.currentRole === 'mid') this.setupMidfielder();
        else if (this.currentRole === 'fwd') this.setupStriker();

        this.updateHud();
    },

    nextAttempt(success = false) {
        if (!this.roundActive) return; // Evita chiamate multiple
        this.roundActive = false;
        this.ball.active = false;
        this.attempts++;

        // Pausa breve per feedback: 800ms se successo, 400ms se fallito
        const delay = success ? 800 : 400;
        setTimeout(() => {
            if (this.gameState === 'PLAYING') this.resetRound();
        }, delay);
    },

    endGame() {
        this.gameState = 'GAMEOVER';
        this.canvas.style.cursor = 'default';
        this.hudEl.style.display = 'none';

        // Calcola XP (25 per portieri, 50 per altri)
        const testMode = window.FeatureFlags?.isEnabled('trainingExpTestMode');
        const xpPerSuccess = this.currentPlayer?.role === 'P' ? 25 : 50;
        const xpGained = testMode ? 0 : this.score * xpPerSuccess;

        // Mostra schermata fine
        document.getElementById('gameover-player').textContent = this.currentPlayer?.name || 'Giocatore';
        document.getElementById('gameover-score').textContent = this.score;
        document.getElementById('gameover-xp').textContent = xpGained + (testMode ? ' (Test Mode)' : '');

        this.gameOverEl.classList.remove('hidden');
    },

    // ==================== UI ====================

    showFeedback(text, color) {
        const span = this.feedbackEl.querySelector('span');
        span.textContent = text;

        const colors = {
            green: '#bbf7d0',
            red: '#fecaca',
            orange: '#fde047'
        };
        span.style.color = colors[color] || colors.green;

        this.feedbackEl.style.opacity = '1';
        setTimeout(() => {
            this.feedbackEl.style.opacity = '0';
        }, 800);
    },

    updateHud() {
        const roleNames = {
            'gk': 'Portiere',
            'def': 'Difensore',
            'mid': 'Centrocampista',
            'fwd': 'Attaccante'
        };

        document.getElementById('hud-player-name').textContent = this.currentPlayer?.name || '';
        document.getElementById('hud-role').textContent = roleNames[this.currentRole] || '';
        document.getElementById('hud-attempt').textContent = Math.min(this.attempts + 1, 3);
        document.getElementById('hud-score').textContent = this.score;
    },

    setInstructions() {
        const instructions = {
            'gk': 'Muovi il mouse orizzontalmente per parare i tiri!',
            'def': 'Tocca la palla per intercettarla, evita il corpo del nemico!',
            'mid': 'Clicca per passare la palla ai compagni blu!',
            'fwd': 'Clicca per tirare in porta, evita il portiere!'
        };

        document.getElementById('instruction-text').textContent =
            instructions[this.currentRole] || '';
    },

    // ==================== DRAW ====================

    draw() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Sfondo campo
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Righe campo
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 4;

        if (this.currentRole === 'gk' || this.currentRole === 'fwd') {
            // Porta e area
            ctx.strokeRect(
                canvas.width / 2 - 250,
                this.currentRole === 'gk' ? canvas.height - 200 : 0,
                500,
                200
            );
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            const goalY = this.currentRole === 'gk' ? canvas.height - 10 : 10;
            ctx.fillRect(canvas.width / 2 - 150, goalY, 300, 5);
        } else {
            // Centrocampo
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        }

        if (this.gameState !== 'PLAYING') return;

        // Disegna giocatore
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.player.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Guanti portiere
        if (this.currentRole === 'gk') {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(this.player.x - 25, this.player.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.player.x + 25, this.player.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // Targets / Nemici
        if (this.currentRole === 'def') {
            const enemy = this.targets[0];
            if (enemy) {
                // Corpo nemico
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#ef4444';
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('AVV', enemy.x, enemy.y + 5);

                // Palla nemica
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y + 50, 15, 0, Math.PI * 2);
                ctx.fillStyle = 'white';
                ctx.fill();
                ctx.strokeStyle = 'black';
                ctx.stroke();

                // Linea collegamento
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y + enemy.radius);
                ctx.lineTo(enemy.x, enemy.y + 35);
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else if (this.currentRole === 'fwd') {
            const gk = this.targets[0];
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(gk.x - gk.width / 2, gk.y - gk.height / 2, gk.width, gk.height);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PORTIERE', gk.x, gk.y + 4);
        } else if (this.currentRole === 'mid') {
            this.targets.forEach(t => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#fde047';
                ctx.stroke();
            });
        }

        // Palla libera
        if (this.currentRole !== 'def') {
            ctx.beginPath();
            ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Mirino per mid/fwd
        if ((this.currentRole === 'mid' || this.currentRole === 'fwd') && !this.ball.active) {
            ctx.beginPath();
            ctx.moveTo(this.player.x, this.player.y);
            ctx.lineTo(this.mouse.x, this.mouse.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Cursore mira
            ctx.beginPath();
            ctx.arc(this.mouse.x, this.mouse.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'yellow';
            ctx.fill();
        }
    },

    // ==================== GAME LOOP ====================

    gameLoop() {
        if (this.gameState === 'PLAYING') {
            this.update();
            this.draw();
            this.frameId = requestAnimationFrame(() => this.gameLoop());
        }
    }
};

console.log('Modulo TrainingExpMinigame caricato.');
