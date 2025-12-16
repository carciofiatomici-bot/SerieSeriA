//
// ====================================================================
// MATCH-ANIMATIONS.JS - Replay Visuale 2D delle Partite
// ====================================================================
//

window.MatchAnimations = {
    // Elementi UI
    overlay: null,
    canvas: null,
    ctx: null,

    // Stato
    isOpen: false,
    isPlaying: false,
    currentEventIndex: 0,
    animationFrame: null,
    speed: 1,

    // Dati partita
    matchData: null,
    events: [],
    homeTeam: null,
    awayTeam: null,

    // Configurazione campo
    field: {
        width: 700,
        height: 450,
        padding: 30,
        color: '#2d5a27',
        lineColor: '#ffffff'
    },

    // Posizioni giocatori (normalizzate 0-1)
    positions: {
        home: [],
        away: []
    },

    // Palla
    ball: {
        x: 0.5,
        y: 0.5,
        targetX: 0.5,
        targetY: 0.5,
        radius: 8
    },

    // Colori squadre
    colors: {
        home: '#3b82f6',
        away: '#ef4444'
    },

    /**
     * Inizializza il sistema
     */
    init() {
        // Abilita se almeno uno dei due flag e' attivo
        const fullEnabled = window.FeatureFlags?.isEnabled('matchAnimations');
        const highlightsEnabled = window.FeatureFlags?.isEnabled('matchHighlights');

        if (!fullEnabled && !highlightsEnabled) {
            console.log("Match Animations disabilitate");
            return;
        }

        this.createOverlay();
        this.setupListeners();
        console.log("Match Animations inizializzato");
    },

    /**
     * Crea l'overlay del player
     */
    createOverlay() {
        // Rimuovi se esiste
        const existing = document.getElementById('match-animation-overlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'match-animation-overlay';
        this.overlay.className = 'fixed inset-0 z-[9999] bg-black bg-opacity-95 hidden';

        this.overlay.innerHTML = `
            <div class="h-full flex flex-col">
                <!-- Header -->
                <div class="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
                    <div class="flex items-center gap-6">
                        <!-- Squadra Casa -->
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold" id="anim-home-logo">H</div>
                            <span class="text-white font-bold text-lg" id="anim-home-name">Casa</span>
                        </div>

                        <!-- Risultato -->
                        <div class="bg-gray-900 px-6 py-2 rounded-lg">
                            <span class="text-4xl font-extrabold text-white" id="anim-score">0 - 0</span>
                        </div>

                        <!-- Squadra Trasferta -->
                        <div class="flex items-center gap-3">
                            <span class="text-white font-bold text-lg" id="anim-away-name">Trasferta</span>
                            <div class="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold" id="anim-away-logo">A</div>
                        </div>
                    </div>

                    <!-- Controlli -->
                    <div class="flex items-center gap-4">
                        <button id="anim-speed-btn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold">
                            1x
                        </button>
                        <button id="anim-highlights-btn" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white font-semibold">
                            ⭐ Highlights
                        </button>
                        <button id="anim-close-btn" class="text-gray-400 hover:text-white text-3xl">
                            &times;
                        </button>
                    </div>
                </div>

                <!-- Campo di gioco -->
                <div class="flex-1 flex items-center justify-center p-4">
                    <div class="relative">
                        <canvas id="match-animation-canvas" width="700" height="450" class="rounded-lg shadow-2xl"></canvas>

                        <!-- Overlay fase -->
                        <div id="anim-phase-overlay" class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 px-4 py-2 rounded-lg hidden">
                            <span class="text-yellow-400 font-bold text-xl" id="anim-phase-text">GOAL!</span>
                        </div>
                    </div>
                </div>

                <!-- Footer con controlli e info -->
                <div class="bg-gray-800 p-4 border-t border-gray-700">
                    <!-- Progress bar -->
                    <div class="mb-4">
                        <div class="flex justify-between text-sm text-gray-400 mb-1">
                            <span id="anim-current-time">0'</span>
                            <span id="anim-phase-name">Inizio</span>
                            <span id="anim-total-time">90'</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2 cursor-pointer" id="anim-progress-bar">
                            <div class="bg-green-500 h-2 rounded-full transition-all duration-300" id="anim-progress-fill" style="width: 0%"></div>
                        </div>
                    </div>

                    <!-- Controlli playback -->
                    <div class="flex items-center justify-center gap-4">
                        <button id="anim-prev-btn" class="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"/></svg>
                        </button>
                        <button id="anim-play-btn" class="p-4 bg-green-600 hover:bg-green-500 rounded-full text-white">
                            <svg id="anim-play-icon" class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
                            <svg id="anim-pause-icon" class="w-8 h-8 hidden" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                        </button>
                        <button id="anim-next-btn" class="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z"/></svg>
                        </button>
                    </div>

                    <!-- Evento corrente -->
                    <div class="mt-4 text-center">
                        <p class="text-gray-300" id="anim-event-text">Clicca play per iniziare</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Setup canvas
        this.canvas = document.getElementById('match-animation-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Event listeners
        this.setupControlListeners();
    },

    /**
     * Setup listeners controlli
     */
    setupControlListeners() {
        document.getElementById('anim-close-btn')?.addEventListener('click', () => this.close());
        document.getElementById('anim-play-btn')?.addEventListener('click', () => this.togglePlay());
        document.getElementById('anim-prev-btn')?.addEventListener('click', () => this.prevEvent());
        document.getElementById('anim-next-btn')?.addEventListener('click', () => this.nextEvent());
        document.getElementById('anim-speed-btn')?.addEventListener('click', () => this.cycleSpeed());
        document.getElementById('anim-highlights-btn')?.addEventListener('click', () => this.showHighlights());

        // Progress bar click
        document.getElementById('anim-progress-bar')?.addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seekToPercent(percent);
        });

        // Chiudi con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
            if (e.key === ' ' && this.isOpen) {
                e.preventDefault();
                this.togglePlay();
            }
        });
    },

    /**
     * Setup listeners globali
     */
    setupListeners() {
        document.addEventListener('featureFlagChanged', (e) => {
            // Reagisci a entrambi i flag
            if (e.detail?.flagId === 'matchAnimations' || e.detail?.flagId === 'matchHighlights') {
                const fullEnabled = window.FeatureFlags?.isEnabled('matchAnimations');
                const highlightsEnabled = window.FeatureFlags?.isEnabled('matchHighlights');

                if (fullEnabled || highlightsEnabled) {
                    if (!this.overlay) this.init();
                } else {
                    this.destroy();
                }
            }
        });
    },

    /**
     * Apre l'animazione per una partita
     * @param {Object} matchData - Dati della partita (dal replay o simulazione)
     * @param {boolean} matchData.highlightsOnly - Se true, mostra solo gli highlights
     */
    open(matchData) {
        const fullEnabled = window.FeatureFlags?.isEnabled('matchAnimations');
        const highlightsEnabled = window.FeatureFlags?.isEnabled('matchHighlights');

        if (!fullEnabled && !highlightsEnabled) {
            if (window.Toast) window.Toast.info("Animazioni partita non disponibili");
            return;
        }

        if (!this.overlay) this.createOverlay();

        this.matchData = matchData;
        this.highlightsOnly = matchData.highlightsOnly || false;
        this.parseMatchData(matchData);
        this.resetState();

        // Se highlights only, filtra subito gli eventi
        if (this.highlightsOnly) {
            this.filterToHighlightsOnly();
        }

        // Aggiorna UI
        this.updateHeader();
        this.drawField();
        this.initializePositions();
        this.drawPlayers();

        // Nascondi bottone highlights se siamo gia' in modalita' highlights
        const highlightsBtn = document.getElementById('anim-highlights-btn');
        if (highlightsBtn) {
            highlightsBtn.style.display = this.highlightsOnly ? 'none' : 'block';
        }

        this.overlay.classList.remove('hidden');
        this.isOpen = true;
    },

    /**
     * Filtra eventi per mostrare solo highlights
     */
    filterToHighlightsOnly() {
        this.events = this.events.filter(e =>
            e.type === 'goal' || e.type === 'save' || e.type === 'end'
        );

        // Se non ci sono highlights, aggiungi almeno la fine partita
        if (this.events.length === 0) {
            this.events.push({ type: 'end', minute: 90, description: 'Fine Partita!' });
        }
    },

    /**
     * Chiude l'animazione
     */
    close() {
        this.pause();
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
        this.isOpen = false;
    },

    /**
     * Parse dei dati partita in eventi animabili
     */
    parseMatchData(data) {
        this.homeTeam = data.homeTeam || { name: 'Casa', formation: [] };
        this.awayTeam = data.awayTeam || { name: 'Trasferta', formation: [] };
        this.events = [];

        // Risultato finale
        const finalScore = data.result || data.score || '0-0';
        const [homeGoals, awayGoals] = finalScore.split('-').map(Number);

        // Crea eventi dalla simulazione
        if (data.phases && Array.isArray(data.phases)) {
            data.phases.forEach((phase, index) => {
                this.events.push({
                    type: 'phase_start',
                    phase: phase.name || `Fase ${index + 1}`,
                    minute: phase.minute || (index * 30),
                    description: `Inizio ${phase.name || 'fase'}`
                });

                // Aggiungi eventi della fase
                if (phase.events) {
                    phase.events.forEach(evt => {
                        this.events.push({
                            ...evt,
                            minute: evt.minute || phase.minute
                        });
                    });
                }
            });
        } else if (data.log || data.detailedLog) {
            // Parse dal log testuale
            this.parseLogToEvents(data.log || data.detailedLog, homeGoals, awayGoals);
        } else {
            // Genera eventi demo
            this.generateDemoEvents(homeGoals, awayGoals);
        }

        // Ordina per minuto
        this.events.sort((a, b) => (a.minute || 0) - (b.minute || 0));
    },

    /**
     * Parse log testuale in eventi
     */
    parseLogToEvents(log, homeGoals, awayGoals) {
        const lines = (log || '').split('\n').filter(l => l.trim());

        let currentMinute = 0;
        let homeScored = 0;
        let awayScored = 0;

        lines.forEach(line => {
            const lowerLine = line.toLowerCase();

            // Rileva fasi
            if (lowerLine.includes('costruzione')) {
                this.events.push({ type: 'phase_start', phase: 'Costruzione', minute: currentMinute, description: 'Fase di Costruzione' });
                currentMinute = 15;
            } else if (lowerLine.includes('attacco')) {
                this.events.push({ type: 'phase_start', phase: 'Attacco', minute: currentMinute, description: 'Fase di Attacco' });
                currentMinute = 45;
            } else if (lowerLine.includes('tiro')) {
                this.events.push({ type: 'phase_start', phase: 'Tiro', minute: currentMinute, description: 'Fase di Tiro' });
                currentMinute = 75;
            }

            // Rileva gol
            if (lowerLine.includes('gol') || lowerLine.includes('goal') || lowerLine.includes('segna')) {
                const isHome = homeScored < homeGoals && (lowerLine.includes('casa') || !lowerLine.includes('trasferta'));
                if (isHome && homeScored < homeGoals) {
                    homeScored++;
                    this.events.push({
                        type: 'goal',
                        team: 'home',
                        minute: currentMinute + Math.random() * 10,
                        description: `⚽ GOL ${this.homeTeam.name}!`,
                        score: `${homeScored}-${awayScored}`
                    });
                } else if (awayScored < awayGoals) {
                    awayScored++;
                    this.events.push({
                        type: 'goal',
                        team: 'away',
                        minute: currentMinute + Math.random() * 10,
                        description: `⚽ GOL ${this.awayTeam.name}!`,
                        score: `${homeScored}-${awayScored}`
                    });
                }
            }

            // Rileva parate
            if (lowerLine.includes('para') || lowerLine.includes('salva')) {
                this.events.push({
                    type: 'save',
                    minute: currentMinute + Math.random() * 10,
                    description: '🧤 Grande parata!'
                });
            }

            // Rileva abilita'
            if (lowerLine.includes('abilita') || lowerLine.includes('attiva')) {
                this.events.push({
                    type: 'ability',
                    minute: currentMinute + Math.random() * 10,
                    description: line.substring(0, 50) + '...'
                });
            }
        });

        // Assicurati che tutti i gol siano presenti
        while (homeScored < homeGoals) {
            homeScored++;
            this.events.push({
                type: 'goal',
                team: 'home',
                minute: 30 + Math.random() * 50,
                description: `⚽ GOL ${this.homeTeam.name}!`,
                score: `${homeScored}-${awayScored}`
            });
        }
        while (awayScored < awayGoals) {
            awayScored++;
            this.events.push({
                type: 'goal',
                team: 'away',
                minute: 30 + Math.random() * 50,
                description: `⚽ GOL ${this.awayTeam.name}!`,
                score: `${homeScored}-${awayScored}`
            });
        }

        // Aggiungi fine partita
        this.events.push({
            type: 'end',
            minute: 90,
            description: 'Fine Partita!'
        });
    },

    /**
     * Genera eventi demo
     */
    generateDemoEvents(homeGoals, awayGoals) {
        // Fasi
        this.events.push({ type: 'phase_start', phase: 'Costruzione', minute: 0, description: 'Calcio d\'inizio!' });
        this.events.push({ type: 'phase_start', phase: 'Attacco', minute: 30, description: 'Fase di Attacco' });
        this.events.push({ type: 'phase_start', phase: 'Tiro', minute: 60, description: 'Fase conclusiva' });

        // Distribuisci gol
        let homeScored = 0, awayScored = 0;
        const totalGoals = homeGoals + awayGoals;

        for (let i = 0; i < totalGoals; i++) {
            const minute = 10 + Math.floor((80 / totalGoals) * i) + Math.floor(Math.random() * 10);
            const isHome = homeScored < homeGoals && (awayScored >= awayGoals || Math.random() > 0.5);

            if (isHome) {
                homeScored++;
                this.events.push({
                    type: 'goal',
                    team: 'home',
                    minute,
                    description: `⚽ GOL ${this.homeTeam.name}!`,
                    score: `${homeScored}-${awayScored}`
                });
            } else {
                awayScored++;
                this.events.push({
                    type: 'goal',
                    team: 'away',
                    minute,
                    description: `⚽ GOL ${this.awayTeam.name}!`,
                    score: `${homeScored}-${awayScored}`
                });
            }

            // Aggiungi occasioni/parate random
            if (Math.random() > 0.5) {
                this.events.push({
                    type: 'save',
                    minute: minute - 2,
                    description: '🧤 Parata del portiere!'
                });
            }
        }

        this.events.push({ type: 'end', minute: 90, description: 'Fine Partita!' });
    },

    /**
     * Reset stato
     */
    resetState() {
        this.currentEventIndex = 0;
        this.isPlaying = false;
        this.speed = 1;
        this.ball.x = 0.5;
        this.ball.y = 0.5;
        this.updatePlayButton();
        this.updateProgress();
    },

    /**
     * Aggiorna header con info squadre
     */
    updateHeader() {
        document.getElementById('anim-home-name').textContent = this.homeTeam.name || 'Casa';
        document.getElementById('anim-away-name').textContent = this.awayTeam.name || 'Trasferta';
        document.getElementById('anim-home-logo').textContent = (this.homeTeam.name || 'C')[0];
        document.getElementById('anim-away-logo').textContent = (this.awayTeam.name || 'T')[0];
        document.getElementById('anim-score').textContent = '0 - 0';
    },

    /**
     * Inizializza posizioni giocatori
     */
    initializePositions() {
        // Formazione 1-3-3-1 base
        this.positions.home = [
            { x: 0.1, y: 0.5, role: 'P' },   // Portiere
            { x: 0.25, y: 0.2, role: 'D' },  // Difensori
            { x: 0.25, y: 0.5, role: 'D' },
            { x: 0.25, y: 0.8, role: 'D' },
            { x: 0.4, y: 0.3, role: 'C' },   // Centrocampisti
            { x: 0.4, y: 0.5, role: 'C' },
            { x: 0.4, y: 0.7, role: 'C' },
            { x: 0.55, y: 0.5, role: 'A' }   // Attaccante
        ];

        this.positions.away = [
            { x: 0.9, y: 0.5, role: 'P' },
            { x: 0.75, y: 0.2, role: 'D' },
            { x: 0.75, y: 0.5, role: 'D' },
            { x: 0.75, y: 0.8, role: 'D' },
            { x: 0.6, y: 0.3, role: 'C' },
            { x: 0.6, y: 0.5, role: 'C' },
            { x: 0.6, y: 0.7, role: 'C' },
            { x: 0.45, y: 0.5, role: 'A' }
        ];
    },

    /**
     * Disegna il campo
     */
    drawField() {
        const ctx = this.ctx;
        const w = this.field.width;
        const h = this.field.height;
        const p = this.field.padding;

        // Sfondo campo
        ctx.fillStyle = this.field.color;
        ctx.fillRect(0, 0, w, h);

        // Linee campo
        ctx.strokeStyle = this.field.lineColor;
        ctx.lineWidth = 2;

        // Bordo
        ctx.strokeRect(p, p, w - 2*p, h - 2*p);

        // Linea centrale
        ctx.beginPath();
        ctx.moveTo(w/2, p);
        ctx.lineTo(w/2, h - p);
        ctx.stroke();

        // Cerchio centrale
        ctx.beginPath();
        ctx.arc(w/2, h/2, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Area di rigore sinistra
        ctx.strokeRect(p, h/2 - 80, 80, 160);
        ctx.strokeRect(p, h/2 - 40, 30, 80);

        // Area di rigore destra
        ctx.strokeRect(w - p - 80, h/2 - 80, 80, 160);
        ctx.strokeRect(w - p - 30, h/2 - 40, 30, 80);

        // Punti rigore
        ctx.fillStyle = this.field.lineColor;
        ctx.beginPath();
        ctx.arc(p + 60, h/2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w - p - 60, h/2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Punto centrale
        ctx.beginPath();
        ctx.arc(w/2, h/2, 3, 0, Math.PI * 2);
        ctx.fill();
    },

    /**
     * Disegna i giocatori
     */
    drawPlayers() {
        const ctx = this.ctx;
        const w = this.field.width;
        const h = this.field.height;

        // Giocatori casa
        this.positions.home.forEach((pos, i) => {
            const x = pos.x * w;
            const y = pos.y * h;

            ctx.fillStyle = this.colors.home;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pos.role, x, y);
        });

        // Giocatori trasferta
        this.positions.away.forEach((pos, i) => {
            const x = pos.x * w;
            const y = pos.y * h;

            ctx.fillStyle = this.colors.away;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pos.role, x, y);
        });

        // Palla
        this.drawBall();
    },

    /**
     * Disegna la palla
     */
    drawBall() {
        const ctx = this.ctx;
        const x = this.ball.x * this.field.width;
        const y = this.ball.y * this.field.height;

        // Ombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + 2, this.ball.radius, this.ball.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Palla
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },

    /**
     * Avvia riproduzione
     */
    play() {
        this.isPlaying = true;
        this.updatePlayButton();
        this.animate();
    },

    /**
     * Pausa riproduzione
     */
    pause() {
        this.isPlaying = false;
        this.updatePlayButton();
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    },

    /**
     * Aggiorna icona play/pause
     */
    updatePlayButton() {
        const playIcon = document.getElementById('anim-play-icon');
        const pauseIcon = document.getElementById('anim-pause-icon');

        if (this.isPlaying) {
            playIcon?.classList.add('hidden');
            pauseIcon?.classList.remove('hidden');
        } else {
            playIcon?.classList.remove('hidden');
            pauseIcon?.classList.add('hidden');
        }
    },

    /**
     * Loop animazione principale
     */
    animate() {
        if (!this.isPlaying) return;

        // Processa evento corrente
        if (this.currentEventIndex < this.events.length) {
            const event = this.events[this.currentEventIndex];
            this.processEvent(event);

            // Passa al prossimo evento dopo un delay
            setTimeout(() => {
                this.currentEventIndex++;
                this.updateProgress();

                if (this.currentEventIndex < this.events.length) {
                    this.animationFrame = requestAnimationFrame(() => this.animate());
                } else {
                    this.pause();
                    this.showEndScreen();
                }
            }, 2000 / this.speed);
        }
    },

    /**
     * Processa un evento
     */
    processEvent(event) {
        // Aggiorna testo evento
        document.getElementById('anim-event-text').textContent = event.description || '';
        document.getElementById('anim-current-time').textContent = `${Math.floor(event.minute || 0)}'`;
        document.getElementById('anim-phase-name').textContent = event.phase || '';

        // Anima in base al tipo
        switch (event.type) {
            case 'phase_start':
                this.animatePhaseStart(event);
                break;
            case 'goal':
                this.animateGoal(event);
                break;
            case 'save':
                this.animateSave(event);
                break;
            case 'end':
                this.showEndScreen();
                break;
            default:
                this.animateGeneric(event);
        }
    },

    /**
     * Animazione inizio fase
     */
    animatePhaseStart(event) {
        // Mostra overlay fase
        const overlay = document.getElementById('anim-phase-overlay');
        const text = document.getElementById('anim-phase-text');

        text.textContent = event.phase;
        text.className = 'text-yellow-400 font-bold text-xl';
        overlay.classList.remove('hidden');

        setTimeout(() => overlay.classList.add('hidden'), 1500);

        // Muovi giocatori in base alla fase
        if (event.phase === 'Costruzione') {
            this.moveBallTo(0.5, 0.5);
        } else if (event.phase === 'Attacco') {
            this.moveBallTo(0.65, 0.5);
        } else if (event.phase === 'Tiro') {
            this.moveBallTo(0.8, 0.4);
        }
    },

    /**
     * Animazione gol
     */
    animateGoal(event) {
        const isHome = event.team === 'home';

        // Muovi palla verso la porta
        this.moveBallTo(isHome ? 0.95 : 0.05, 0.5);

        // Mostra overlay GOL
        const overlay = document.getElementById('anim-phase-overlay');
        const text = document.getElementById('anim-phase-text');

        text.textContent = '⚽ GOOOL!';
        text.className = 'text-green-400 font-bold text-3xl animate-bounce';
        overlay.classList.remove('hidden');

        // Aggiorna punteggio
        if (event.score) {
            document.getElementById('anim-score').textContent = event.score.replace('-', ' - ');
        }

        // Flash sul campo
        this.flashField(isHome ? this.colors.home : this.colors.away);

        setTimeout(() => {
            overlay.classList.add('hidden');
            this.moveBallTo(0.5, 0.5); // Torna al centro
        }, 2000);
    },

    /**
     * Animazione parata
     */
    animateSave(event) {
        const overlay = document.getElementById('anim-phase-overlay');
        const text = document.getElementById('anim-phase-text');

        text.textContent = '🧤 PARATA!';
        text.className = 'text-blue-400 font-bold text-2xl';
        overlay.classList.remove('hidden');

        setTimeout(() => overlay.classList.add('hidden'), 1000);
    },

    /**
     * Animazione generica
     */
    animateGeneric(event) {
        // Muovi palla casualmente
        this.moveBallTo(0.3 + Math.random() * 0.4, 0.2 + Math.random() * 0.6);
    },

    /**
     * Muovi la palla verso una posizione
     */
    moveBallTo(x, y) {
        const startX = this.ball.x;
        const startY = this.ball.y;
        const duration = 500;
        const start = performance.now();

        const animateBall = (time) => {
            const elapsed = time - start;
            const progress = Math.min(elapsed / duration, 1);

            // Easing
            const ease = 1 - Math.pow(1 - progress, 3);

            this.ball.x = startX + (x - startX) * ease;
            this.ball.y = startY + (y - startY) * ease;

            // Ridisegna
            this.drawField();
            this.drawPlayers();

            if (progress < 1) {
                requestAnimationFrame(animateBall);
            }
        };

        requestAnimationFrame(animateBall);
    },

    /**
     * Flash del campo per gol
     */
    flashField(color) {
        const canvas = this.canvas;
        const originalBg = this.field.color;

        let flashes = 0;
        const flashInterval = setInterval(() => {
            this.field.color = flashes % 2 === 0 ? color : originalBg;
            this.drawField();
            this.drawPlayers();
            flashes++;

            if (flashes >= 6) {
                clearInterval(flashInterval);
                this.field.color = originalBg;
                this.drawField();
                this.drawPlayers();
            }
        }, 150);
    },

    /**
     * Schermata fine partita
     */
    showEndScreen() {
        const overlay = document.getElementById('anim-phase-overlay');
        const text = document.getElementById('anim-phase-text');

        text.textContent = '🏁 FINE PARTITA';
        text.className = 'text-white font-bold text-2xl';
        overlay.classList.remove('hidden');

        document.getElementById('anim-event-text').textContent = 'Partita terminata';
    },

    /**
     * Evento precedente
     */
    prevEvent() {
        if (this.currentEventIndex > 0) {
            this.currentEventIndex--;
            this.processEvent(this.events[this.currentEventIndex]);
            this.updateProgress();
        }
    },

    /**
     * Evento successivo
     */
    nextEvent() {
        if (this.currentEventIndex < this.events.length - 1) {
            this.currentEventIndex++;
            this.processEvent(this.events[this.currentEventIndex]);
            this.updateProgress();
        }
    },

    /**
     * Cambia velocita'
     */
    cycleSpeed() {
        const speeds = [0.5, 1, 2, 4];
        const currentIndex = speeds.indexOf(this.speed);
        this.speed = speeds[(currentIndex + 1) % speeds.length];

        document.getElementById('anim-speed-btn').textContent = `${this.speed}x`;
    },

    /**
     * Mostra solo highlights
     */
    showHighlights() {
        this.pause();

        // Filtra solo eventi importanti
        const highlights = this.events.filter(e =>
            e.type === 'goal' || e.type === 'save' || e.type === 'end'
        );

        if (highlights.length === 0) {
            if (window.Toast) window.Toast.info("Nessun highlight disponibile");
            return;
        }

        // Sostituisci eventi e riavvia
        this.events = highlights;
        this.currentEventIndex = 0;
        this.updateProgress();

        if (window.Toast) window.Toast.info(`${highlights.length} highlights trovati`);
        this.play();
    },

    /**
     * Seek a percentuale
     */
    seekToPercent(percent) {
        const index = Math.floor(percent * this.events.length);
        this.currentEventIndex = Math.max(0, Math.min(index, this.events.length - 1));
        this.processEvent(this.events[this.currentEventIndex]);
        this.updateProgress();
    },

    /**
     * Aggiorna progress bar
     */
    updateProgress() {
        const percent = this.events.length > 0
            ? (this.currentEventIndex / this.events.length) * 100
            : 0;

        document.getElementById('anim-progress-fill').style.width = `${percent}%`;
    },

    /**
     * Distruggi modulo
     */
    destroy() {
        this.close();
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
};

// Init quando feature flags sono pronti
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const fullEnabled = window.FeatureFlags?.isEnabled('matchAnimations');
        const highlightsEnabled = window.FeatureFlags?.isEnabled('matchHighlights');

        if (fullEnabled || highlightsEnabled) {
            window.MatchAnimations.init();
        }
    }, 1000);
});

console.log("Modulo MatchAnimations caricato.");
