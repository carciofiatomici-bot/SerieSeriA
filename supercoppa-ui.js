//
// ====================================================================
// SUPERCOPPA-UI.JS - Interfaccia Premium Supercoppa
// ====================================================================
// Grafica speciale con effetti celebrativi per la Supercoppa
//

window.SupercoppaUI = {

    // CSS iniettato dinamicamente
    _stylesInjected: false,

    /**
     * Inietta gli stili CSS speciali per la Supercoppa
     */
    injectStyles() {
        if (this._stylesInjected) return;

        const style = document.createElement('style');
        style.id = 'supercoppa-premium-styles';
        style.textContent = `
            /* Font Premium */
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Bebas+Neue&display=swap');

            /* Container principale Supercoppa */
            .supercoppa-container {
                position: relative;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
                border-radius: 20px;
                overflow: hidden;
                box-shadow:
                    0 25px 80px rgba(212, 175, 55, 0.3),
                    0 10px 40px rgba(0, 0, 0, 0.5),
                    inset 0 1px 0 rgba(255, 215, 0, 0.2);
            }

            /* Bordo dorato animato */
            .supercoppa-container::before {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 20px;
                padding: 3px;
                background: linear-gradient(
                    135deg,
                    #ffd700 0%,
                    #b8860b 25%,
                    #ffd700 50%,
                    #daa520 75%,
                    #ffd700 100%
                );
                background-size: 300% 300%;
                -webkit-mask:
                    linear-gradient(#fff 0 0) content-box,
                    linear-gradient(#fff 0 0);
                mask:
                    linear-gradient(#fff 0 0) content-box,
                    linear-gradient(#fff 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
                animation: borderShine 4s ease-in-out infinite;
                pointer-events: none;
            }

            @keyframes borderShine {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }

            /* Header Supercoppa */
            .supercoppa-header {
                position: relative;
                padding: 24px 20px;
                background: linear-gradient(
                    180deg,
                    rgba(255, 215, 0, 0.15) 0%,
                    rgba(218, 165, 32, 0.08) 50%,
                    transparent 100%
                );
                text-align: center;
                border-bottom: 1px solid rgba(255, 215, 0, 0.2);
            }

            .supercoppa-header::after {
                content: '';
                position: absolute;
                bottom: -1px;
                left: 50%;
                transform: translateX(-50%);
                width: 200px;
                height: 3px;
                background: linear-gradient(90deg, transparent, #ffd700, transparent);
            }

            /* Titolo Supercoppa */
            .supercoppa-title {
                font-family: 'Playfair Display', serif;
                font-size: 2rem;
                font-weight: 900;
                background: linear-gradient(
                    135deg,
                    #ffd700 0%,
                    #fff8dc 30%,
                    #ffd700 50%,
                    #b8860b 70%,
                    #ffd700 100%
                );
                background-size: 200% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: goldShimmer 3s linear infinite;
                text-transform: uppercase;
                letter-spacing: 4px;
                margin: 0;
                text-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
            }

            @keyframes goldShimmer {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
            }

            .supercoppa-subtitle {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.9rem;
                color: rgba(255, 215, 0, 0.7);
                letter-spacing: 6px;
                margin-top: 8px;
                text-transform: uppercase;
            }

            /* Trofeo centrale */
            .supercoppa-trophy {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 4rem;
                filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.8));
                animation: trophyPulse 2s ease-in-out infinite;
                z-index: 10;
            }

            @keyframes trophyPulse {
                0%, 100% {
                    transform: translate(-50%, -50%) scale(1);
                    filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.8));
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.1);
                    filter: drop-shadow(0 0 50px rgba(255, 215, 0, 1));
                }
            }

            /* Area match */
            .supercoppa-match {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                gap: 20px;
                padding: 40px 20px;
                align-items: center;
                position: relative;
            }

            /* Squadra */
            .supercoppa-team {
                text-align: center;
                padding: 20px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 16px;
                border: 1px solid rgba(255, 215, 0, 0.1);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .supercoppa-team:hover {
                background: rgba(255, 215, 0, 0.05);
                border-color: rgba(255, 215, 0, 0.3);
                transform: translateY(-4px);
            }

            .supercoppa-team.winner {
                background: linear-gradient(
                    135deg,
                    rgba(255, 215, 0, 0.15) 0%,
                    rgba(255, 215, 0, 0.05) 100%
                );
                border-color: #ffd700;
                box-shadow:
                    0 0 40px rgba(255, 215, 0, 0.3),
                    inset 0 0 30px rgba(255, 215, 0, 0.1);
                animation: winnerGlow 2s ease-in-out infinite;
            }

            @keyframes winnerGlow {
                0%, 100% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.3), inset 0 0 30px rgba(255, 215, 0, 0.1); }
                50% { box-shadow: 0 0 60px rgba(255, 215, 0, 0.5), inset 0 0 40px rgba(255, 215, 0, 0.2); }
            }

            .supercoppa-qualification {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.75rem;
                color: #ffd700;
                letter-spacing: 3px;
                text-transform: uppercase;
                margin-bottom: 12px;
                opacity: 0.9;
            }

            .supercoppa-team-name {
                font-family: 'Playfair Display', serif;
                font-size: 1.4rem;
                font-weight: 700;
                color: #fff;
                margin: 0;
                line-height: 1.3;
            }

            .supercoppa-team.winner .supercoppa-team-name {
                color: #ffd700;
            }

            /* Centro - VS / Risultato */
            .supercoppa-center {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-width: 120px;
            }

            .supercoppa-vs {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 2rem;
                color: rgba(255, 255, 255, 0.3);
                letter-spacing: 4px;
            }

            .supercoppa-result {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 3.5rem;
                background: linear-gradient(180deg, #fff 0%, #ffd700 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
                animation: resultPulse 1.5s ease-in-out infinite;
            }

            @keyframes resultPulse {
                0%, 100% { opacity: 1; filter: brightness(1); }
                50% { opacity: 0.9; filter: brightness(1.2); }
            }

            .supercoppa-penalties {
                font-size: 0.8rem;
                color: rgba(255, 215, 0, 0.7);
                margin-top: 4px;
            }

            .supercoppa-format {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.4);
                margin-top: 8px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            /* Vincitore banner */
            .supercoppa-winner-banner {
                background: linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(34, 197, 94, 0.2) 20%,
                    rgba(34, 197, 94, 0.3) 50%,
                    rgba(34, 197, 94, 0.2) 80%,
                    transparent 100%
                );
                border-top: 1px solid rgba(34, 197, 94, 0.3);
                border-bottom: 1px solid rgba(34, 197, 94, 0.3);
                padding: 20px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .supercoppa-winner-banner::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.1),
                    transparent
                );
                animation: shine 3s infinite;
            }

            @keyframes shine {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            .supercoppa-winner-text {
                font-family: 'Playfair Display', serif;
                font-size: 1.1rem;
                font-weight: 700;
                color: #22c55e;
            }

            .supercoppa-winner-name {
                font-size: 1.5rem;
                color: #fff;
                margin-left: 8px;
            }

            .supercoppa-prize {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.9rem;
                color: #ffd700;
                margin-top: 8px;
                letter-spacing: 2px;
            }

            /* Pulsanti azione */
            .supercoppa-actions {
                padding: 24px 20px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .supercoppa-btn {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 1.1rem;
                letter-spacing: 3px;
                padding: 16px 24px;
                border-radius: 12px;
                border: none;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                text-transform: uppercase;
                position: relative;
                overflow: hidden;
            }

            .supercoppa-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.2),
                    transparent
                );
                transition: left 0.5s;
            }

            .supercoppa-btn:hover::before {
                left: 100%;
            }

            .supercoppa-btn-primary {
                background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
                color: #1a1a2e;
                box-shadow: 0 8px 30px rgba(255, 215, 0, 0.4);
            }

            .supercoppa-btn-primary:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 40px rgba(255, 215, 0, 0.5);
            }

            .supercoppa-btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .supercoppa-btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .supercoppa-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.3);
            }

            .supercoppa-btn-danger {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }

            .supercoppa-btn-danger:hover {
                background: rgba(239, 68, 68, 0.3);
            }

            /* Info aggiuntive */
            .supercoppa-info {
                text-align: center;
                padding: 12px 20px 24px;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.5);
            }

            /* Stato: in attesa */
            .supercoppa-pending {
                padding: 40px 20px;
                text-align: center;
            }

            .supercoppa-pending-icon {
                font-size: 4rem;
                opacity: 0.3;
                margin-bottom: 16px;
            }

            .supercoppa-pending-text {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.5);
                letter-spacing: 3px;
            }

            /* Confetti */
            .supercoppa-confetti {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                overflow: hidden;
                z-index: 20;
            }

            .confetti-piece {
                position: absolute;
                width: 10px;
                height: 10px;
                top: -20px;
                animation: confettiFall 4s linear infinite;
            }

            @keyframes confettiFall {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(500px) rotate(720deg);
                    opacity: 0;
                }
            }

            /* Responsive */
            @media (max-width: 640px) {
                .supercoppa-title {
                    font-size: 1.5rem;
                    letter-spacing: 2px;
                }

                .supercoppa-match {
                    grid-template-columns: 1fr;
                    gap: 16px;
                    padding: 24px 16px;
                }

                .supercoppa-center {
                    order: -1;
                    padding: 16px 0;
                }

                .supercoppa-trophy {
                    position: relative;
                    top: auto;
                    left: auto;
                    transform: none;
                    font-size: 3rem;
                }

                .supercoppa-result {
                    font-size: 2.5rem;
                }

                .supercoppa-team-name {
                    font-size: 1.2rem;
                }
            }
        `;
        document.head.appendChild(style);
        this._stylesInjected = true;
    },

    /**
     * Genera confetti animati
     */
    generateConfetti(container) {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'supercoppa-confetti';

        const colors = ['#ffd700', '#22c55e', '#fff', '#b8860b', '#daa520'];

        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = `${Math.random() * 4}s`;
            piece.style.animationDuration = `${3 + Math.random() * 2}s`;

            // Forma casuale
            if (Math.random() > 0.5) {
                piece.style.borderRadius = '50%';
            } else {
                piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            }

            confettiContainer.appendChild(piece);
        }

        container.appendChild(confettiContainer);
    },

    /**
     * Renderizza UI Admin Premium per la Supercoppa
     */
    async renderAdminUI(container) {
        this.injectStyles();

        // Bug #7: Verifica che window.Supercoppa esista
        if (!window.Supercoppa) {
            container.innerHTML = `<div class="p-4 text-center text-yellow-400">Modulo Supercoppa non caricato</div>`;
            return;
        }

        try {
            const bracket = await window.Supercoppa.loadSupercoppa();

            if (!bracket) {
                // Nessuna supercoppa - mostra stato creazione
                const status = await window.Supercoppa.canCreateSupercoppa();
                this._renderCreateState(container, status);
            } else {
                // Supercoppa esistente
                this._renderMatchState(container, bracket, true);
            }
        } catch (error) {
            console.error('[SupercoppaUI] Errore:', error);
            container.innerHTML = `
                <div class="supercoppa-container">
                    <div class="p-8 text-center">
                        <p class="text-red-400">Errore caricamento: ${error.message}</p>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Renderizza UI Utente per la Supercoppa
     */
    async renderUserUI(teamId, container) {
        this.injectStyles();

        // Bug #7: Verifica che window.Supercoppa esista
        if (!window.Supercoppa) {
            container.innerHTML = `<div class="p-4 text-center text-yellow-400">Modulo Supercoppa non caricato</div>`;
            return;
        }

        try {
            const bracket = await window.Supercoppa.loadSupercoppa();

            if (!bracket) {
                container.innerHTML = `
                    <div class="supercoppa-container">
                        <div class="supercoppa-pending">
                            <div class="supercoppa-pending-icon">⭐</div>
                            <p class="supercoppa-pending-text">Supercoppa non ancora in programma</p>
                        </div>
                    </div>
                `;
                return;
            }

            const isParticipant = bracket.homeTeam.teamId === teamId || bracket.awayTeam.teamId === teamId;
            this._renderMatchState(container, bracket, false, isParticipant, teamId);

        } catch (error) {
            console.error('[SupercoppaUI] Errore:', error);
            container.innerHTML = `
                <div class="supercoppa-container">
                    <div class="p-8 text-center">
                        <p class="text-red-400">Errore: ${error.message}</p>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Stato: Creazione Supercoppa
     */
    _renderCreateState(container, status) {
        container.innerHTML = `
            <div class="supercoppa-container">
                <div class="supercoppa-header">
                    <h3 class="supercoppa-title">Supercoppa</h3>
                    <p class="supercoppa-subtitle">Serie SeriA</p>
                </div>

                <div class="supercoppa-pending">
                    <div class="supercoppa-pending-icon">🏆</div>
                    ${status.canCreate ? `
                        <p class="supercoppa-pending-text">Pronta per essere creata</p>
                        <p class="text-sm text-yellow-500/70 mt-2">1° Classificato vs Vincitore Coppa</p>
                    ` : `
                        <p class="supercoppa-pending-text">${status.reason}</p>
                    `}
                </div>

                ${status.canCreate ? `
                    <div class="supercoppa-actions">
                        <button id="supercoppa-create-btn" class="supercoppa-btn supercoppa-btn-primary">
                            Crea Supercoppa
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        const createBtn = container.querySelector('#supercoppa-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', async () => {
                createBtn.disabled = true;
                createBtn.innerHTML = '<span class="animate-pulse">Creazione...</span>';
                try {
                    await window.Supercoppa.createSupercoppa();
                    await this.renderAdminUI(container);
                } catch (error) {
                    alert('Errore: ' + error.message);
                    createBtn.disabled = false;
                    createBtn.textContent = 'Crea Supercoppa';
                }
            });
        }
    },

    /**
     * Stato: Partita Supercoppa
     */
    _renderMatchState(container, bracket, isAdmin, isParticipant = false, userTeamId = null) {
        const isCompleted = bracket.isCompleted;
        const homeIsWinner = bracket.winner?.teamId === bracket.homeTeam.teamId;
        const awayIsWinner = bracket.winner?.teamId === bracket.awayTeam.teamId;

        container.innerHTML = `
            <div class="supercoppa-container" id="supercoppa-main-container">
                <div class="supercoppa-header">
                    <h3 class="supercoppa-title">Supercoppa</h3>
                    <p class="supercoppa-subtitle">${isCompleted ? 'Completata' : 'In Programma'}</p>
                </div>

                <div class="supercoppa-match">
                    <!-- Squadra Casa -->
                    <div class="supercoppa-team ${homeIsWinner ? 'winner' : ''}">
                        <p class="supercoppa-qualification">${bracket.homeTeam.qualification}</p>
                        <h4 class="supercoppa-team-name">${bracket.homeTeam.teamName}</h4>
                        ${homeIsWinner ? '<p class="text-xs text-yellow-400 mt-2">VINCITORE</p>' : ''}
                    </div>

                    <!-- Centro -->
                    <div class="supercoppa-center">
                        ${!isCompleted ? `
                            <div class="supercoppa-trophy">🏆</div>
                            <span class="supercoppa-vs">VS</span>
                        ` : `
                            <div class="supercoppa-result">${bracket.result?.split(' ')[0] || bracket.result}</div>
                            ${bracket.penalties ? '<p class="supercoppa-penalties">d.c.r.</p>' : ''}
                        `}
                    </div>

                    <!-- Squadra Ospite -->
                    <div class="supercoppa-team ${awayIsWinner ? 'winner' : ''}">
                        <p class="supercoppa-qualification">${bracket.awayTeam.qualification}</p>
                        <h4 class="supercoppa-team-name">${bracket.awayTeam.teamName}</h4>
                        ${awayIsWinner ? '<p class="text-xs text-yellow-400 mt-2">VINCITORE</p>' : ''}
                    </div>
                </div>

                ${bracket.winner ? `
                    <div class="supercoppa-winner-banner">
                        <p>
                            <span class="supercoppa-winner-text">VINCITORE:</span>
                            <span class="supercoppa-winner-name">${bracket.winner.teamName}</span>
                        </p>
                        <p class="supercoppa-prize">Premio: ${window.Supercoppa.REWARD_CSS} CSS + Trofeo</p>
                    </div>
                ` : ''}

                ${isAdmin ? this._renderAdminActions(bracket) : ''}

                ${isParticipant && !isCompleted ? `
                    <div class="supercoppa-info">
                        <span class="text-yellow-400">La tua squadra partecipa alla Supercoppa!</span>
                    </div>
                ` : ''}
            </div>
        `;

        // Aggiungi confetti se c'e' un vincitore
        if (bracket.winner) {
            const mainContainer = container.querySelector('#supercoppa-main-container');
            if (mainContainer) {
                this.generateConfetti(mainContainer);
            }
        }

        // Event listeners per admin
        if (isAdmin) {
            this._attachAdminListeners(container, bracket);
        }
    },

    /**
     * Genera HTML azioni admin
     */
    _renderAdminActions(bracket) {
        if (!bracket.isCompleted) {
            return `
                <div class="supercoppa-actions">
                    <button id="supercoppa-simulate-btn" class="supercoppa-btn supercoppa-btn-primary">
                        Simula Supercoppa
                    </button>
                    <p class="supercoppa-info">Partita secca con rigori in caso di pareggio</p>
                </div>
            `;
        } else {
            return `
                <div class="supercoppa-actions">
                    <div class="flex gap-3">
                        <button id="supercoppa-details-btn" class="supercoppa-btn supercoppa-btn-secondary flex-1">
                            Dettagli
                        </button>
                        <button id="supercoppa-delete-btn" class="supercoppa-btn supercoppa-btn-danger flex-1">
                            Elimina
                        </button>
                    </div>
                    <p class="supercoppa-info">Elimina per preparare la nuova stagione</p>
                </div>
            `;
        }
    },

    /**
     * Attacca event listeners admin
     */
    _attachAdminListeners(container, bracket) {
        const simulateBtn = container.querySelector('#supercoppa-simulate-btn');
        const detailsBtn = container.querySelector('#supercoppa-details-btn');
        const deleteBtn = container.querySelector('#supercoppa-delete-btn');

        if (simulateBtn) {
            simulateBtn.addEventListener('click', async () => {
                simulateBtn.disabled = true;
                simulateBtn.innerHTML = '<span class="animate-pulse">Simulazione in corso...</span>';
                try {
                    const result = await window.Supercoppa.simulateSupercoppa();
                    // Refresh UI
                    this.renderAdminUI(container);

                    // Toast di successo
                    if (window.Toast) {
                        window.Toast.success(`${result.winner.teamName} vince la Supercoppa!`);
                    }
                } catch (error) {
                    alert('Errore: ' + error.message);
                    simulateBtn.disabled = false;
                    simulateBtn.textContent = 'Simula Supercoppa';
                }
            });
        }

        if (detailsBtn && bracket.penalties) {
            detailsBtn.addEventListener('click', () => {
                let penaltyLog = 'CALCI DI RIGORE:\n\n';
                // Bug #9: Usa optional chaining su shootout
                bracket.penalties?.shootout?.forEach((kick, i) => {
                    const team = kick.team === 'home' ? bracket.homeTeam.teamName : bracket.awayTeam.teamName;
                    const result = kick.scored ? 'GOL' : 'PARATO';
                    penaltyLog += `${i + 1}. ${team}: ${result}\n`;
                });
                penaltyLog += `\nRisultato: ${bracket.penalties.homeGoals}-${bracket.penalties.awayGoals}`;
                alert(penaltyLog);
            });
        } else if (detailsBtn) {
            detailsBtn.addEventListener('click', () => {
                alert(`Supercoppa\n\n${bracket.homeTeam.teamName} vs ${bracket.awayTeam.teamName}\nRisultato: ${bracket.result}\nVincitore: ${bracket.winner.teamName}`);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Eliminare la Supercoppa?\n\nI premi sono gia stati assegnati.')) {
                    try {
                        await window.Supercoppa.deleteSupercoppa();
                        this.renderAdminUI(container);
                    } catch (error) {
                        alert('Errore: ' + error.message);
                    }
                }
            });
        }
    }
};

console.log("Modulo SupercoppaUI caricato.");
