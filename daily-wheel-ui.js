/**
 * daily-wheel-ui.js
 * UI e animazione per la Ruota della Fortuna
 */

(function() {
    'use strict';

    let isSpinning = false;
    let currentRotation = 0;

    /**
     * Mostra il popup della ruota
     * @param {Object} context - Contesto con teamId e teamData
     */
    async function showWheelPopup(context) {
        if (!window.DailyWheel?.isEnabled()) return;

        const { currentTeamId, teamData } = context;

        // Carica la configurazione da Firestore prima di mostrare
        await window.DailyWheel.loadConfig();

        // Rimuovi popup esistente
        const existing = document.getElementById('daily-wheel-popup');
        if (existing) existing.remove();

        const PRIZES = window.DailyWheel.PRIZES;

        // Crea il popup
        const popup = document.createElement('div');
        popup.id = 'daily-wheel-popup';
        popup.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        popup.innerHTML = `
            <div class="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-yellow-500 shadow-2xl">
                <h2 class="text-2xl font-bold text-center text-yellow-400 mb-4">
                    🎡 Ruota della Fortuna
                </h2>

                <!-- Ruota -->
                <div class="relative w-72 h-72 mx-auto mb-6">
                    <!-- Indicatore -->
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                        <div class="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-yellow-400"></div>
                    </div>

                    <!-- Ruota SVG -->
                    <svg id="wheel-svg" viewBox="0 0 300 300" class="w-full h-full transition-transform" style="transform: rotate(${currentRotation}deg)">
                        ${PRIZES.map((prize, i) => {
                            const angle = 360 / PRIZES.length;
                            const startAngle = i * angle - 90;
                            const endAngle = startAngle + angle;

                            // Calcola i punti dell'arco
                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = (endAngle * Math.PI) / 180;
                            const x1 = 150 + 140 * Math.cos(startRad);
                            const y1 = 150 + 140 * Math.sin(startRad);
                            const x2 = 150 + 140 * Math.cos(endRad);
                            const y2 = 150 + 140 * Math.sin(endRad);

                            // Posizione testo
                            const textAngle = startAngle + angle / 2;
                            const textRad = (textAngle * Math.PI) / 180;
                            const textX = 150 + 90 * Math.cos(textRad);
                            const textY = 150 + 90 * Math.sin(textRad);

                            return `
                                <path d="M150,150 L${x1},${y1} A140,140 0 0,1 ${x2},${y2} Z"
                                      fill="${prize.color}" stroke="#1f2937" stroke-width="2"/>
                                <text x="${textX}" y="${textY}"
                                      text-anchor="middle" dominant-baseline="middle"
                                      fill="white" font-size="12" font-weight="bold"
                                      transform="rotate(${textAngle + 90}, ${textX}, ${textY})">
                                    ${prize.icon}
                                </text>
                            `;
                        }).join('')}
                        <circle cx="150" cy="150" r="25" fill="#1f2937" stroke="#fbbf24" stroke-width="3"/>
                        <text x="150" y="150" text-anchor="middle" dominant-baseline="middle" fill="#fbbf24" font-size="16">🎡</text>
                    </svg>
                </div>

                <!-- Legenda premi -->
                <div class="grid grid-cols-3 gap-2 mb-4 text-xs">
                    ${PRIZES.map(prize => `
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full" style="background: ${prize.color}"></span>
                            <span class="text-gray-300">${prize.label}</span>
                        </div>
                    `).join('')}
                </div>

                <!-- Bottoni -->
                <div class="flex gap-3">
                    <button id="btn-spin-wheel"
                            class="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold py-3 px-6 rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all transform hover:scale-105 shadow-lg">
                        🎲 GIRA LA RUOTA!
                    </button>
                    <button id="btn-close-wheel"
                            class="bg-gray-700 text-gray-300 font-bold py-3 px-4 rounded-xl hover:bg-gray-600 transition">
                        ✖
                    </button>
                </div>

                <!-- Risultato (nascosto) -->
                <div id="wheel-result" class="hidden mt-4 p-4 rounded-xl text-center">
                    <p class="text-lg font-bold" id="wheel-result-text"></p>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Event listeners
        document.getElementById('btn-spin-wheel').addEventListener('click', () => {
            handleSpin(currentTeamId, teamData);
        });

        document.getElementById('btn-close-wheel').addEventListener('click', () => {
            closeWheelPopup();
        });

        // Chiudi cliccando fuori
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closeWheelPopup();
            }
        });
    }

    /**
     * Gestisce il giro della ruota
     */
    async function handleSpin(teamId, teamData) {
        if (isSpinning) return;

        const spinBtn = document.getElementById('btn-spin-wheel');
        const wheelSvg = document.getElementById('wheel-svg');
        const resultDiv = document.getElementById('wheel-result');
        const resultText = document.getElementById('wheel-result-text');

        isSpinning = true;
        spinBtn.disabled = true;
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

        // Mostra risultato
        resultDiv.classList.remove('hidden');
        if (result.success) {
            resultDiv.classList.add('bg-green-900/50', 'border', 'border-green-500');
            resultText.innerHTML = `
                <span class="text-4xl block mb-2">${prize.icon}</span>
                <span class="text-green-400">Complimenti! Hai vinto:</span><br>
                <span class="text-2xl text-yellow-400">${prize.label}</span>
            `;

            // Nascondi il box della ruota nella dashboard immediatamente
            const wheelBox = document.getElementById('daily-wheel-box');
            if (wheelBox) {
                wheelBox.classList.add('hidden');
            }

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
            resultDiv.classList.add('bg-red-900/50', 'border', 'border-red-500');
            resultText.innerHTML = `
                <span class="text-red-400">Errore: ${result.message}</span>
            `;
        }

        // Cambia bottone in "Chiudi"
        spinBtn.textContent = '✓ Chiudi';
        spinBtn.classList.remove('from-yellow-500', 'to-orange-500', 'hover:from-yellow-400', 'hover:to-orange-400');
        spinBtn.classList.add('bg-gray-600', 'hover:bg-gray-500');
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
            <div class="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border-2 border-yellow-500/50 hover:border-yellow-400 transition-all cursor-pointer"
                 id="dashboard-wheel-box">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-yellow-400 font-bold text-lg flex items-center gap-2">
                            <span class="text-2xl animate-pulse">🎡</span> Ruota della Fortuna
                        </h3>
                        <p class="text-gray-400 text-sm mt-1">Giro giornaliero disponibile!</p>
                    </div>
                    <button id="btn-open-wheel"
                            class="bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold py-2 px-4 rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all transform hover:scale-105 shadow-lg">
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
