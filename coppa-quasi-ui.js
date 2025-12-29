//
// ====================================================================
// COPPA-QUASI-UI.JS - Interfaccia Premium Coppa Quasi SeriA
// ====================================================================
// Grafica speciale con effetti celebrativi per la Coppa Quasi SeriA
// Tema: Bronzo/Ambra per le ultime classificate
//

window.CoppaQuasiUI = {

    // CSS iniettato dinamicamente
    _stylesInjected: false,

    /**
     * Inietta gli stili CSS speciali per la Coppa Quasi
     */
    injectStyles() {
        if (this._stylesInjected) return;

        const style = document.createElement('style');
        style.id = 'coppa-quasi-premium-styles';
        style.textContent = `
            /* Font Premium */
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Bebas+Neue&display=swap');

            /* Container principale Coppa Quasi */
            .coppa-quasi-container {
                position: relative;
                background: linear-gradient(135deg, #1a1510 0%, #2d1f14 50%, #1a1208 100%);
                border-radius: 20px;
                overflow: hidden;
                box-shadow:
                    0 25px 80px rgba(205, 127, 50, 0.3),
                    0 10px 40px rgba(0, 0, 0, 0.5),
                    inset 0 1px 0 rgba(205, 127, 50, 0.2);
            }

            /* Bordo bronzo animato */
            .coppa-quasi-container::before {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 20px;
                padding: 3px;
                background: linear-gradient(
                    135deg,
                    #cd7f32 0%,
                    #b87333 25%,
                    #cd7f32 50%,
                    #a0522d 75%,
                    #cd7f32 100%
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
                animation: cqBorderShine 4s ease-in-out infinite;
                pointer-events: none;
            }

            @keyframes cqBorderShine {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }

            /* Header Coppa Quasi */
            .coppa-quasi-header {
                position: relative;
                padding: 24px 20px;
                background: linear-gradient(
                    180deg,
                    rgba(205, 127, 50, 0.15) 0%,
                    rgba(184, 115, 51, 0.08) 50%,
                    transparent 100%
                );
                text-align: center;
                border-bottom: 1px solid rgba(205, 127, 50, 0.2);
            }

            .coppa-quasi-header::after {
                content: '';
                position: absolute;
                bottom: -1px;
                left: 50%;
                transform: translateX(-50%);
                width: 200px;
                height: 3px;
                background: linear-gradient(90deg, transparent, #cd7f32, transparent);
            }

            /* Titolo Coppa Quasi */
            .coppa-quasi-title {
                font-family: 'Playfair Display', serif;
                font-size: 1.8rem;
                font-weight: 900;
                background: linear-gradient(
                    135deg,
                    #cd7f32 0%,
                    #deb887 30%,
                    #cd7f32 50%,
                    #a0522d 70%,
                    #cd7f32 100%
                );
                background-size: 200% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: cqGoldShimmer 3s linear infinite;
                text-transform: uppercase;
                letter-spacing: 3px;
                margin: 0;
                text-shadow: 0 0 40px rgba(205, 127, 50, 0.5);
            }

            @keyframes cqGoldShimmer {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
            }

            .coppa-quasi-subtitle {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.85rem;
                color: rgba(205, 127, 50, 0.7);
                letter-spacing: 5px;
                margin-top: 8px;
                text-transform: uppercase;
            }

            /* Trofeo centrale */
            .coppa-quasi-trophy {
                font-size: 3rem;
                filter: drop-shadow(0 0 20px rgba(205, 127, 50, 0.8));
                animation: cqTrophyPulse 2s ease-in-out infinite;
            }

            @keyframes cqTrophyPulse {
                0%, 100% {
                    transform: scale(1);
                    filter: drop-shadow(0 0 20px rgba(205, 127, 50, 0.8));
                }
                50% {
                    transform: scale(1.1);
                    filter: drop-shadow(0 0 35px rgba(205, 127, 50, 1));
                }
            }

            /* Classifica triangolare */
            .coppa-quasi-standings {
                padding: 20px;
                background: rgba(0, 0, 0, 0.3);
                margin: 16px;
                border-radius: 12px;
                border: 1px solid rgba(205, 127, 50, 0.2);
            }

            .coppa-quasi-standings-title {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 1rem;
                color: #cd7f32;
                letter-spacing: 3px;
                margin-bottom: 12px;
                text-transform: uppercase;
            }

            .coppa-quasi-standings-table {
                width: 100%;
                border-collapse: collapse;
            }

            .coppa-quasi-standings-table th {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.75rem;
                color: rgba(205, 127, 50, 0.7);
                letter-spacing: 1px;
                padding: 8px 4px;
                text-align: center;
                border-bottom: 1px solid rgba(205, 127, 50, 0.2);
            }

            .coppa-quasi-standings-table th:nth-child(2) {
                text-align: left;
            }

            .coppa-quasi-standings-table td {
                padding: 10px 4px;
                text-align: center;
                color: #fff;
                font-size: 0.9rem;
            }

            .coppa-quasi-standings-table td:nth-child(2) {
                text-align: left;
                font-weight: 600;
            }

            .coppa-quasi-standings-table tr:first-child td {
                color: #cd7f32;
                font-weight: 700;
            }

            .coppa-quasi-standings-table tr.winner-row {
                background: linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, transparent 100%);
            }

            .coppa-quasi-standings-table tr.winner-row td {
                color: #22c55e;
            }

            /* Partite */
            .coppa-quasi-matches {
                padding: 0 16px 16px;
            }

            .coppa-quasi-match-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(205, 127, 50, 0.15);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                transition: all 0.3s ease;
            }

            .coppa-quasi-match-card:hover {
                background: rgba(205, 127, 50, 0.05);
                border-color: rgba(205, 127, 50, 0.3);
            }

            .coppa-quasi-match-card.completed {
                border-left: 4px solid #22c55e;
            }

            .coppa-quasi-match-card.pending {
                border-left: 4px solid rgba(205, 127, 50, 0.3);
            }

            .coppa-quasi-match-teams {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
            }

            .coppa-quasi-team-name {
                flex: 1;
                font-size: 0.95rem;
                color: #fff;
                font-weight: 600;
            }

            .coppa-quasi-team-name.home {
                text-align: left;
            }

            .coppa-quasi-team-name.away {
                text-align: right;
            }

            .coppa-quasi-match-result {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 1.4rem;
                color: #cd7f32;
                min-width: 60px;
                text-align: center;
            }

            .coppa-quasi-match-vs {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.3);
            }

            /* Vincitore banner */
            .coppa-quasi-winner-banner {
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

            .coppa-quasi-winner-banner::before {
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
                animation: cqShine 3s infinite;
            }

            @keyframes cqShine {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            .coppa-quasi-winner-text {
                font-family: 'Playfair Display', serif;
                font-size: 1rem;
                font-weight: 700;
                color: #22c55e;
            }

            .coppa-quasi-winner-name {
                font-size: 1.3rem;
                color: #fff;
                margin-left: 8px;
            }

            .coppa-quasi-prize {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.85rem;
                color: #cd7f32;
                margin-top: 8px;
                letter-spacing: 2px;
            }

            /* Pulsanti azione */
            .coppa-quasi-actions {
                padding: 20px 16px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .coppa-quasi-btn {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 1rem;
                letter-spacing: 2px;
                padding: 14px 20px;
                border-radius: 10px;
                border: none;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                text-transform: uppercase;
                position: relative;
                overflow: hidden;
            }

            .coppa-quasi-btn::before {
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

            .coppa-quasi-btn:hover::before {
                left: 100%;
            }

            .coppa-quasi-btn-primary {
                background: linear-gradient(135deg, #cd7f32 0%, #a0522d 100%);
                color: #fff;
                box-shadow: 0 8px 25px rgba(205, 127, 50, 0.4);
            }

            .coppa-quasi-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(205, 127, 50, 0.5);
            }

            .coppa-quasi-btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .coppa-quasi-btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .coppa-quasi-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            .coppa-quasi-btn-danger {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }

            .coppa-quasi-btn-danger:hover {
                background: rgba(239, 68, 68, 0.3);
            }

            .coppa-quasi-btn-match {
                background: rgba(205, 127, 50, 0.15);
                color: #cd7f32;
                border: 1px solid rgba(205, 127, 50, 0.3);
                font-size: 0.85rem;
                padding: 10px 16px;
                margin-top: 10px;
            }

            .coppa-quasi-btn-match:hover {
                background: rgba(205, 127, 50, 0.25);
            }

            /* Info */
            .coppa-quasi-info {
                text-align: center;
                padding: 12px 16px;
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.5);
            }

            /* Stato pending */
            .coppa-quasi-pending {
                padding: 40px 20px;
                text-align: center;
            }

            .coppa-quasi-pending-icon {
                font-size: 3.5rem;
                opacity: 0.3;
                margin-bottom: 16px;
            }

            .coppa-quasi-pending-text {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 1.1rem;
                color: rgba(255, 255, 255, 0.5);
                letter-spacing: 3px;
            }

            /* Confetti */
            .coppa-quasi-confetti {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                overflow: hidden;
                z-index: 20;
            }

            .cq-confetti-piece {
                position: absolute;
                width: 8px;
                height: 8px;
                top: -20px;
                animation: cqConfettiFall 4s linear infinite;
            }

            @keyframes cqConfettiFall {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(400px) rotate(720deg);
                    opacity: 0;
                }
            }

            /* Responsive */
            @media (max-width: 640px) {
                .coppa-quasi-title {
                    font-size: 1.4rem;
                    letter-spacing: 2px;
                }

                .coppa-quasi-match-teams {
                    flex-direction: column;
                    text-align: center;
                }

                .coppa-quasi-team-name.home,
                .coppa-quasi-team-name.away {
                    text-align: center;
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
        confettiContainer.className = 'coppa-quasi-confetti';

        const colors = ['#cd7f32', '#22c55e', '#fff', '#b87333', '#deb887'];

        for (let i = 0; i < 40; i++) {
            const piece = document.createElement('div');
            piece.className = 'cq-confetti-piece';
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = `${Math.random() * 4}s`;
            piece.style.animationDuration = `${3 + Math.random() * 2}s`;

            if (Math.random() > 0.5) {
                piece.style.borderRadius = '50%';
            }

            confettiContainer.appendChild(piece);
        }

        container.appendChild(confettiContainer);
    },

    /**
     * Renderizza UI Admin Premium per la Coppa Quasi
     */
    async renderAdminUI(container) {
        this.injectStyles();

        if (!window.CoppaQuasi) {
            container.innerHTML = `<div class="p-4 text-center text-amber-400">Modulo Coppa Quasi non caricato</div>`;
            return;
        }

        try {
            const bracket = await window.CoppaQuasi.loadCoppaQuasi();

            if (!bracket) {
                const status = await window.CoppaQuasi.canCreateCoppaQuasi();
                this._renderCreateState(container, status);
            } else {
                this._renderTournamentState(container, bracket, true);
            }
        } catch (error) {
            console.error('[CoppaQuasiUI] Errore:', error);
            container.innerHTML = `
                <div class="coppa-quasi-container">
                    <div class="p-8 text-center">
                        <p class="text-red-400">Errore caricamento: ${error.message}</p>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Renderizza UI Utente per la Coppa Quasi
     */
    async renderUserUI(teamId, container) {
        this.injectStyles();

        if (!window.CoppaQuasi) {
            container.innerHTML = `<div class="p-4 text-center text-amber-400">Modulo Coppa Quasi non caricato</div>`;
            return;
        }

        try {
            const bracket = await window.CoppaQuasi.loadCoppaQuasi();

            if (!bracket) {
                container.innerHTML = `
                    <div class="coppa-quasi-container">
                        <div class="coppa-quasi-pending">
                            <div class="coppa-quasi-pending-icon">🏅</div>
                            <p class="coppa-quasi-pending-text">Coppa Quasi SeriA non in programma</p>
                        </div>
                    </div>
                `;
                return;
            }

            const isParticipant = bracket.participants.some(p => p.teamId === teamId);
            this._renderTournamentState(container, bracket, false, isParticipant, teamId);

        } catch (error) {
            console.error('[CoppaQuasiUI] Errore:', error);
            container.innerHTML = `
                <div class="coppa-quasi-container">
                    <div class="p-8 text-center">
                        <p class="text-red-400">Errore: ${error.message}</p>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Stato: Creazione Coppa Quasi
     */
    _renderCreateState(container, status) {
        container.innerHTML = `
            <div class="coppa-quasi-container">
                <div class="coppa-quasi-header">
                    <h3 class="coppa-quasi-title">Coppa Quasi SeriA</h3>
                    <p class="coppa-quasi-subtitle">Torneo Ultime 3</p>
                </div>

                <div class="coppa-quasi-pending">
                    <div class="coppa-quasi-trophy">🏅</div>
                    ${status.canCreate ? `
                        <p class="coppa-quasi-pending-text">Pronta per essere creata</p>
                        <p class="text-sm text-amber-500/70 mt-2">Triangolare tra le ultime 3 classificate</p>
                    ` : `
                        <p class="coppa-quasi-pending-text">${status.reason}</p>
                    `}
                </div>

                ${status.canCreate ? `
                    <div class="coppa-quasi-actions">
                        <button id="coppa-quasi-create-btn" class="coppa-quasi-btn coppa-quasi-btn-primary">
                            Crea Coppa Quasi SeriA
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        const createBtn = container.querySelector('#coppa-quasi-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', async () => {
                createBtn.disabled = true;
                createBtn.innerHTML = '<span class="animate-pulse">Creazione...</span>';
                try {
                    await window.CoppaQuasi.createCoppaQuasi();
                    await this.renderAdminUI(container);
                } catch (error) {
                    alert('Errore: ' + error.message);
                    createBtn.disabled = false;
                    createBtn.textContent = 'Crea Coppa Quasi SeriA';
                }
            });
        }
    },

    /**
     * Stato: Torneo in corso/completato
     */
    _renderTournamentState(container, bracket, isAdmin, isParticipant = false, userTeamId = null) {
        const isCompleted = bracket.isCompleted;

        container.innerHTML = `
            <div class="coppa-quasi-container" id="coppa-quasi-main-container">
                <div class="coppa-quasi-header">
                    <h3 class="coppa-quasi-title">Coppa Quasi SeriA</h3>
                    <p class="coppa-quasi-subtitle">${isCompleted ? 'Completata' : 'Torneo in Corso'}</p>
                </div>

                ${bracket.winner ? `
                    <div class="coppa-quasi-winner-banner">
                        <p>
                            <span class="coppa-quasi-winner-text">VINCITORE:</span>
                            <span class="coppa-quasi-winner-name">${bracket.winner.teamName}</span>
                        </p>
                        <p class="coppa-quasi-prize">Premio: ${window.CoppaQuasi.REWARD_CSS} CSS + Trofeo</p>
                    </div>
                ` : ''}

                ${this._renderStandings(bracket, userTeamId)}

                ${this._renderMatches(bracket, isAdmin)}

                ${isAdmin ? this._renderAdminActions(bracket) : ''}

                ${isParticipant && !isCompleted ? `
                    <div class="coppa-quasi-info">
                        <span class="text-amber-400">La tua squadra partecipa alla Coppa Quasi!</span>
                    </div>
                ` : ''}
            </div>
        `;

        if (bracket.winner) {
            const mainContainer = container.querySelector('#coppa-quasi-main-container');
            if (mainContainer) {
                this.generateConfetti(mainContainer);
            }
        }

        if (isAdmin) {
            this._attachAdminListeners(container, bracket);
        }
    },

    /**
     * Renderizza classifica triangolare
     */
    _renderStandings(bracket, userTeamId = null) {
        const standingsRows = bracket.standings.map((p, i) => {
            const isWinner = bracket.winner && p.teamId === bracket.winner.teamId;
            const isUser = p.teamId === userTeamId;
            return `
                <tr class="${isWinner ? 'winner-row' : ''} ${isUser ? 'bg-amber-900/20' : ''}">
                    <td class="font-bold">${i + 1}</td>
                    <td>${p.teamName} ${isWinner ? '🏆' : ''}</td>
                    <td>${p.played}</td>
                    <td class="font-bold ${i === 0 ? 'text-amber-400' : ''}">${p.points}</td>
                    <td>${p.goalsFor}-${p.goalsAgainst}</td>
                    <td>${p.goalsDiff >= 0 ? '+' : ''}${p.goalsDiff}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="coppa-quasi-standings">
                <h4 class="coppa-quasi-standings-title">Classifica Triangolare</h4>
                <table class="coppa-quasi-standings-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Squadra</th>
                            <th>G</th>
                            <th>Pt</th>
                            <th>Gol</th>
                            <th>+/-</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standingsRows}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Renderizza partite
     */
    _renderMatches(bracket, isAdmin) {
        const matchesHTML = bracket.matches.map((m, i) => `
            <div class="coppa-quasi-match-card ${m.isCompleted ? 'completed' : 'pending'}">
                <div class="coppa-quasi-match-teams">
                    <span class="coppa-quasi-team-name home">${m.homeTeam.teamName}</span>
                    ${m.isCompleted ? `
                        <span class="coppa-quasi-match-result">${m.result}</span>
                    ` : `
                        <span class="coppa-quasi-match-vs">VS</span>
                    `}
                    <span class="coppa-quasi-team-name away">${m.awayTeam.teamName}</span>
                </div>
                ${isAdmin && !m.isCompleted && !bracket.isCompleted ? `
                    <button class="coppa-quasi-btn coppa-quasi-btn-match btn-simulate-single" data-index="${i}">
                        Simula Partita ${i + 1}
                    </button>
                ` : ''}
            </div>
        `).join('');

        return `
            <div class="coppa-quasi-matches">
                ${matchesHTML}
            </div>
        `;
    },

    /**
     * Genera HTML azioni admin
     */
    _renderAdminActions(bracket) {
        if (!bracket.isCompleted) {
            const pendingMatches = bracket.matches.filter(m => !m.isCompleted).length;
            return `
                <div class="coppa-quasi-actions">
                    <button id="coppa-quasi-simulate-all-btn" class="coppa-quasi-btn coppa-quasi-btn-primary">
                        Simula Tutte (${pendingMatches} partite)
                    </button>
                    <p class="coppa-quasi-info">Chi fa piu punti vince il triangolare</p>
                </div>
            `;
        } else {
            return `
                <div class="coppa-quasi-actions">
                    <button id="coppa-quasi-delete-btn" class="coppa-quasi-btn coppa-quasi-btn-danger">
                        Elimina Coppa Quasi
                    </button>
                    <p class="coppa-quasi-info">I premi sono stati assegnati</p>
                </div>
            `;
        }
    },

    /**
     * Attacca event listeners admin
     */
    _attachAdminListeners(container, bracket) {
        const simulateAllBtn = container.querySelector('#coppa-quasi-simulate-all-btn');
        const deleteBtn = container.querySelector('#coppa-quasi-delete-btn');
        const singleBtns = container.querySelectorAll('.btn-simulate-single');

        if (simulateAllBtn) {
            simulateAllBtn.addEventListener('click', async () => {
                simulateAllBtn.disabled = true;
                simulateAllBtn.innerHTML = '<span class="animate-pulse">Simulazione in corso...</span>';
                try {
                    const result = await window.CoppaQuasi.simulateAllMatches();
                    this.renderAdminUI(container);

                    if (window.Toast) {
                        window.Toast.success(`${result.winner.teamName} vince la Coppa Quasi!`);
                    }
                } catch (error) {
                    alert('Errore: ' + error.message);
                    simulateAllBtn.disabled = false;
                    simulateAllBtn.textContent = 'Simula Tutte';
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Eliminare la Coppa Quasi SeriA?\n\nI premi sono gia stati assegnati.')) {
                    try {
                        await window.CoppaQuasi.deleteCoppaQuasi();
                        this.renderAdminUI(container);
                    } catch (error) {
                        alert('Errore: ' + error.message);
                    }
                }
            });
        }

        singleBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.target.dataset.index);
                btn.disabled = true;
                btn.innerHTML = '<span class="animate-pulse">Simulazione...</span>';
                try {
                    await window.CoppaQuasi.simulateMatch(index);
                    this.renderAdminUI(container);
                } catch (error) {
                    alert('Errore: ' + error.message);
                    btn.disabled = false;
                    btn.textContent = `Simula Partita ${index + 1}`;
                }
            });
        });
    }
};

console.log("Modulo CoppaQuasiUI caricato.");
