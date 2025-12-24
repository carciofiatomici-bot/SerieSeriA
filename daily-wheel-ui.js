/**
 * daily-wheel-ui.js
 * UI e animazione per la Ruota della Fortuna
 */

(function() {
    'use strict';

    let isSpinning = false;
    let currentRotation = 0;

    // Costante per il cooldown (12 ore in millisecondi)
    const WHEEL_COOLDOWN_MS = 12 * 60 * 60 * 1000;

    /**
     * Calcola il tempo rimanente fino al prossimo spin (cooldown 12 ore)
     * @param {Object} teamData - Dati della squadra (opzionale)
     * @returns {Object} { hours, minutes, seconds, formatted }
     */
    function getTimeUntilNextSpin(teamData) {
        let diff = 0;

        if (teamData?.dailyWheel?.lastSpinTimestamp) {
            const lastSpin = teamData.dailyWheel.lastSpinTimestamp;
            const nextSpinTime = lastSpin + WHEEL_COOLDOWN_MS;
            diff = Math.max(0, nextSpinTime - Date.now());
        } else {
            // Fallback: nessun cooldown attivo
            diff = 0;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return {
            hours,
            minutes,
            seconds,
            formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        };
    }

    /**
     * Mostra il popup della ruota
     * @param {Object} context - Contesto con teamId e teamData
     */
    async function showWheelPopup(context) {
        if (!window.DailyWheel?.isEnabled()) return;

        const { currentTeamId, teamData } = context;

        // Verifica se puo' girare PRIMA di mostrare il popup
        const canSpin = window.DailyWheel.canSpinToday(teamData);

        // Carica la configurazione da Firestore prima di mostrare
        await window.DailyWheel.loadConfig();

        // Rimuovi popup esistente
        const existing = document.getElementById('daily-wheel-popup');
        if (existing) existing.remove();

        const PRIZES = window.DailyWheel.PRIZES;

        // Genera particles HTML
        const particlesHtml = Array.from({length: 12}, (_, i) => {
            const left = 10 + Math.random() * 80;
            const delay = i * 0.3;
            return `<div class="wheel-particle" style="left: ${left}%; animation-delay: ${delay}s;"></div>`;
        }).join('');

        // Crea il popup con design Monte Carlo
        const popup = document.createElement('div');
        popup.id = 'daily-wheel-popup';
        popup.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-50';
        popup.innerHTML = `
            <div class="fortune-wheel-container rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl relative">
                <!-- Corner decorations -->
                <div class="wheel-corner-decoration top-left"></div>
                <div class="wheel-corner-decoration top-right"></div>
                <div class="wheel-corner-decoration bottom-left"></div>
                <div class="wheel-corner-decoration bottom-right"></div>

                <!-- Floating particles -->
                <div class="wheel-particles">${particlesHtml}</div>

                <!-- Title -->
                <h2 class="wheel-title text-2xl font-bold text-center mb-5">
                    Ruota della Fortuna
                </h2>

                <!-- Wheel wrapper -->
                <div class="wheel-wrapper w-72 h-72 mx-auto mb-6 relative">
                    <!-- Light rays -->
                    <div class="wheel-light-rays"></div>

                    <!-- Outer golden ring -->
                    <div class="wheel-outer-ring">
                        <div class="wheel-outer-ring-inner"></div>
                    </div>

                    <!-- Premium indicator -->
                    <div class="wheel-indicator">
                        <div class="wheel-indicator-arrow"></div>
                    </div>

                    <!-- Wheel SVG -->
                    <svg id="wheel-svg" viewBox="0 0 300 300" class="w-full h-full transition-transform absolute inset-0" style="transform: rotate(${currentRotation}deg)">
                        <!-- Gradient definitions -->
                        <defs>
                            ${PRIZES.map((prize, i) => `
                                <linearGradient id="prize-gradient-${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:${prize.color};stop-opacity:1" />
                                    <stop offset="50%" style="stop-color:${prize.color};stop-opacity:0.85" />
                                    <stop offset="100%" style="stop-color:${prize.color};stop-opacity:1" />
                                </linearGradient>
                            `).join('')}
                            <filter id="wheel-inner-shadow">
                                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                            </filter>
                        </defs>
                        ${PRIZES.map((prize, i) => {
                            const angle = 360 / PRIZES.length;
                            const startAngle = i * angle - 90;
                            const endAngle = startAngle + angle;

                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = (endAngle * Math.PI) / 180;
                            const x1 = 150 + 140 * Math.cos(startRad);
                            const y1 = 150 + 140 * Math.sin(startRad);
                            const x2 = 150 + 140 * Math.cos(endRad);
                            const y2 = 150 + 140 * Math.sin(endRad);

                            const textAngle = startAngle + angle / 2;
                            const textRad = (textAngle * Math.PI) / 180;
                            const textX = 150 + 85 * Math.cos(textRad);
                            const textY = 150 + 85 * Math.sin(textRad);

                            return `
                                <path d="M150,150 L${x1},${y1} A140,140 0 0,1 ${x2},${y2} Z"
                                      fill="url(#prize-gradient-${i})" stroke="#d4af37" stroke-width="1.5" filter="url(#wheel-inner-shadow)"/>
                                <text x="${textX}" y="${textY}"
                                      text-anchor="middle" dominant-baseline="middle"
                                      fill="white" font-size="18" font-weight="bold"
                                      style="text-shadow: 0 2px 4px rgba(0,0,0,0.5);"
                                      transform="rotate(${textAngle + 90}, ${textX}, ${textY})">
                                    ${prize.icon}
                                </text>
                            `;
                        }).join('')}
                        <!-- Center hub -->
                        <circle cx="150" cy="150" r="30" fill="#0a0f1a" stroke="#d4af37" stroke-width="4"/>
                        <circle cx="150" cy="150" r="22" fill="url(#prize-gradient-0)" opacity="0.3"/>
                        <text x="150" y="150" text-anchor="middle" dominant-baseline="middle" fill="#fbbf24" font-size="20" style="text-shadow: 0 0 10px rgba(251,191,36,0.8);">🎰</text>
                    </svg>
                </div>

                <!-- Prize legend -->
                <div class="wheel-prize-legend grid grid-cols-2 gap-2 mb-5 p-3 rounded-xl text-xs">
                    ${(() => {
                        const totalProb = PRIZES.reduce((sum, p) => sum + p.probability, 0);
                        return PRIZES.map(prize => {
                            const percent = ((prize.probability / totalProb) * 100).toFixed(0);
                            return `
                                <div class="wheel-prize-item flex items-center justify-between gap-2 px-3 py-2 rounded-lg">
                                    <div class="flex items-center gap-2">
                                        <span class="wheel-prize-color w-3 h-3 rounded-full" style="background: ${prize.color}; color: ${prize.color};"></span>
                                        <span class="text-gray-200">${prize.label}</span>
                                    </div>
                                    <span class="wheel-prize-percent font-bold">${percent}%</span>
                                </div>
                            `;
                        }).join('');
                    })()}
                </div>

                <!-- Buttons -->
                <div class="flex gap-3">
                    ${canSpin ? `
                    <button id="btn-spin-wheel" class="wheel-spin-btn flex-1 py-4 px-6 rounded-xl text-lg">
                        🎲 Gira la Ruota
                    </button>
                    ` : `
                    <div class="wheel-countdown-container flex-1 text-center py-3 px-6 rounded-xl">
                        <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Prossimo giro tra</p>
                        <p id="wheel-countdown" class="wheel-countdown-value">${getTimeUntilNextSpin(teamData).formatted}</p>
                    </div>
                    `}
                    <button id="btn-close-wheel" class="wheel-close-btn font-bold py-3 px-5 rounded-xl text-lg">
                        ✕
                    </button>
                </div>

                <!-- Result (hidden) -->
                <div id="wheel-result" class="wheel-result hidden mt-4 p-5 rounded-xl text-center">
                    <p class="text-lg font-bold" id="wheel-result-text"></p>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Event listeners
        const spinBtn = document.getElementById('btn-spin-wheel');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => {
                handleSpin(currentTeamId, teamData);
            });
        }

        document.getElementById('btn-close-wheel').addEventListener('click', () => {
            closeWheelPopup();
        });

        // Chiudi cliccando fuori
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closeWheelPopup();
            }
        });

        // Se non puo' girare, avvia timer countdown
        if (!canSpin) {
            const countdownEl = document.getElementById('wheel-countdown');
            if (countdownEl) {
                const countdownInterval = setInterval(() => {
                    // Verifica se popup esiste ancora
                    if (!document.getElementById('daily-wheel-popup')) {
                        clearInterval(countdownInterval);
                        return;
                    }
                    const time = getTimeUntilNextSpin(teamData);
                    countdownEl.textContent = time.formatted;
                }, 1000);
            }
        }
    }

    /**
     * Gestisce il giro della ruota
     */
    async function handleSpin(teamId, teamData) {
        if (isSpinning) return;

        // Doppio check di sicurezza: verifica se puo' ancora girare
        if (!window.DailyWheel.canSpinToday(teamData)) {
            if (window.Toast) {
                window.Toast.error('Hai gia girato la ruota! Riprova tra 12 ore.');
            }
            return;
        }

        const spinBtn = document.getElementById('btn-spin-wheel');
        const wheelSvg = document.getElementById('wheel-svg');
        const resultDiv = document.getElementById('wheel-result');
        const resultText = document.getElementById('wheel-result-text');

        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.textContent = '🔒 Bloccando...';

        // IMPORTANTE: Blocca SUBITO la ruota su Firebase PRIMA dell'animazione
        // Questo previene exploit di ricarica pagina durante l'animazione
        const locked = await window.DailyWheel.lockWheel(teamId);
        if (!locked) {
            if (window.Toast) {
                window.Toast.error('Errore di connessione. Riprova.');
            }
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.textContent = '🎲 GIRA LA RUOTA!';
            return;
        }

        spinBtn.textContent = '🎰 Girando...';

        // Estrai premio (ora async per caricare config da Firestore)
        const prize = await window.DailyWheel.spin();
        const prizeIndex = window.DailyWheel.getPrizeIndex(prize);

        // Calcola rotazione finale
        const PRIZES = window.DailyWheel.PRIZES;
        const anglePerPrize = 360 / PRIZES.length;
        const targetAngle = 360 - (prizeIndex * anglePerPrize + anglePerPrize / 2);

        // Aggiungi giri extra (5-8 giri completi)
        const extraRotations = (5 + Math.floor(Math.random() * 4)) * 360;
        const finalRotation = currentRotation + extraRotations + targetAngle - (currentRotation % 360);

        // Anima la ruota
        wheelSvg.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        wheelSvg.style.transform = `rotate(${finalRotation}deg)`;
        currentRotation = finalRotation;

        // Aspetta fine animazione
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Assegna premio
        const result = await window.DailyWheel.awardPrize(prize, teamId);

        // Mostra risultato con stile premium
        resultDiv.classList.remove('hidden');
        if (result.success) {
            resultDiv.classList.remove('error');
            resultText.innerHTML = `
                <span class="wheel-result-icon text-5xl block mb-3">${prize.icon}</span>
                <span class="text-green-400 text-sm uppercase tracking-wider">Complimenti! Hai vinto</span><br>
                <span class="text-2xl font-bold" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${prize.label}</span>
            `;

            // NON nascondere il box della ruota nella dashboard (rimane visibile con cooldown)
            // Il box mostrera il timer di cooldown invece del pulsante gira

            // Aggiorna anche i dati locali della squadra per riflettere il cambio
            if (window.InterfacciaCore?.currentTeamData) {
                const today = new Date().toISOString().split('T')[0];
                window.InterfacciaCore.currentTeamData.dailyWheel = {
                    ...(window.InterfacciaCore.currentTeamData.dailyWheel || {}),
                    lastSpinDate: today
                };
            }

            // Aggiorna dashboard
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
        } else {
            resultDiv.classList.add('error');
            resultText.innerHTML = `
                <span class="text-red-400 text-lg">Errore: ${result.message}</span>
            `;
        }

        // Cambia bottone in "Chiudi" con stile premium
        spinBtn.textContent = '✓ Chiudi';
        spinBtn.classList.remove('wheel-spin-btn');
        spinBtn.classList.add('wheel-close-btn');
        spinBtn.style.flex = '1';
        spinBtn.disabled = false;
        spinBtn.onclick = closeWheelPopup;

        isSpinning = false;
    }

    /**
     * Chiude il popup della ruota
     */
    function closeWheelPopup() {
        const popup = document.getElementById('daily-wheel-popup');
        if (popup) {
            popup.classList.add('opacity-0');
            setTimeout(() => popup.remove(), 200);
        }
    }

    /**
     * Renderizza il box della ruota nella dashboard
     * @param {Object} teamData - Dati squadra
     * @returns {string} HTML del box
     */
    function renderDashboardBox(teamData) {
        if (!window.DailyWheel?.isEnabled()) return '';

        const canSpin = window.DailyWheel.canSpinToday(teamData);

        if (!canSpin) return ''; // Nascondi se gia girato

        return `
            <div class="dashboard-wheel-box-premium rounded-xl p-4 hover:border-yellow-400/60 transition-all cursor-pointer"
                 id="dashboard-wheel-box">
                <div class="flex items-center justify-between relative z-10">
                    <div>
                        <h3 class="wheel-title text-lg flex items-center gap-2">
                            <span class="text-2xl" style="animation: wheel-rays-rotate 4s linear infinite;">🎰</span>
                            Ruota della Fortuna
                        </h3>
                        <p class="text-gray-400 text-sm mt-1">Giro disponibile!</p>
                    </div>
                    <button id="btn-open-wheel" class="wheel-spin-btn py-2 px-5 rounded-lg text-sm">
                        GIRA!
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Configura event listener per il box dashboard
     * @param {Object} context - Contesto con teamId e teamData
     */
    function setupDashboardListener(context) {
        const box = document.getElementById('dashboard-wheel-box');
        const btn = document.getElementById('btn-open-wheel');

        if (box) {
            box.addEventListener('click', (e) => {
                if (e.target.id !== 'btn-open-wheel') {
                    showWheelPopup(context);
                }
            });
        }

        if (btn) {
            btn.addEventListener('click', () => {
                showWheelPopup(context);
            });
        }
    }

    // Esporta modulo UI
    window.DailyWheelUI = {
        showWheelPopup,
        closeWheelPopup,
        renderDashboardBox,
        setupDashboardListener
    };

    console.log('[DailyWheelUI] Modulo caricato');
})();
