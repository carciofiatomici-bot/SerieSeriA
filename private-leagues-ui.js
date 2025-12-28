//
// ====================================================================
// PRIVATE-LEAGUES-UI.JS - Interfaccia Utente Leghe Private
// Premium Mobile-First Design
// ====================================================================
//

window.PrivateLeaguesUI = {
    currentTeamId: null,
    currentTeamData: null,
    currentLeague: null,
    timerInterval: null,

    /**
     * Inizializza l'UI delle leghe private
     */
    async init(teamId, teamData) {
        this.currentTeamId = teamId;
        this.currentTeamData = teamData;

        // Pulisci timer precedenti
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Ricarica dati squadra freschi per avere i CS aggiornati
        await this.refreshTeamData();

        // Carica la lega corrente (se esiste)
        this.currentLeague = await window.PrivateLeagues.getTeamLeague(teamId);

        // Se in una lega in corso, controlla auto-simulazione
        if (this.currentLeague && this.currentLeague.status === 'in_progress') {
            await this.checkAutoSimulation();
        }

        this.render();
    },

    /**
     * Controlla se e' il momento di auto-simulare
     */
    async checkAutoSimulation() {
        if (!this.currentLeague || this.currentLeague.status !== 'in_progress') return;

        const result = await window.PrivateLeagues.checkAndAutoSimulate(this.currentLeague.leagueId);

        if (result.simulated) {
            if (window.Toast) {
                if (result.isCompleted) {
                    window.Toast.success(`Campionato terminato! Vincitore: ${result.winner.teamName}`);
                } else {
                    window.Toast.success('Giornata simulata automaticamente!');
                }
            }
            // Ricarica dati
            await this.refreshTeamData();
            this.currentLeague = await window.PrivateLeagues.getLeagueById(this.currentLeague.leagueId);
        }
    },

    /**
     * Render principale
     */
    async render() {
        const container = document.getElementById('private-leagues-panel');
        if (!container) return;

        if (!this.currentLeague) {
            await this.renderNoLeague(container);
        } else if (this.currentLeague.status === 'waiting') {
            this.renderWaitingLeague(container);
        } else if (this.currentLeague.status === 'in_progress') {
            this.renderInProgressLeague(container);
        } else if (this.currentLeague.status === 'completed') {
            this.renderCompletedLeague(container);
        }
    },

    // ================================================================
    // STILI CSS INLINE (Premium Mobile-First)
    // ================================================================

    getStyles() {
        return `
            <style>
                .pl-container {
                    padding: 20px 16px 100px 16px;
                    max-width: 100%;
                    animation: pl-fade-in 0.4s ease-out;
                    padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px));
                }

                @keyframes pl-fade-in {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes pl-pulse-soft {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }

                @keyframes pl-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
                    50% { box-shadow: 0 0 35px rgba(168, 85, 247, 0.5); }
                }

                @keyframes pl-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }

                @keyframes pl-bounce-in {
                    0% { transform: scale(0.9); opacity: 0; }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); opacity: 1; }
                }

                .pl-header {
                    text-align: center;
                    margin-bottom: 24px;
                    position: relative;
                }

                .pl-header::after {
                    content: '';
                    position: absolute;
                    bottom: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 60px;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, #a855f7, transparent);
                    border-radius: 2px;
                }

                .pl-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.75rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-bottom: 6px;
                    letter-spacing: -0.02em;
                }

                .pl-subtitle {
                    font-family: 'DM Sans', sans-serif;
                    color: #94a3b8;
                    font-size: 0.875rem;
                    font-weight: 400;
                }

                .pl-card {
                    background: linear-gradient(145deg, rgba(30, 27, 75, 0.8) 0%, rgba(20, 18, 50, 0.9) 100%);
                    border: 1px solid rgba(168, 85, 247, 0.25);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 16px;
                    position: relative;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }

                .pl-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent);
                }

                .pl-card:hover {
                    border-color: rgba(168, 85, 247, 0.4);
                    transform: translateY(-2px);
                }

                .pl-card-create {
                    border-color: rgba(168, 85, 247, 0.35);
                    background: linear-gradient(145deg, rgba(88, 28, 135, 0.15) 0%, rgba(30, 27, 75, 0.8) 100%);
                }

                .pl-card-join {
                    border-color: rgba(59, 130, 246, 0.35);
                    background: linear-gradient(145deg, rgba(29, 78, 216, 0.15) 0%, rgba(30, 27, 75, 0.8) 100%);
                }

                .pl-card-join::before {
                    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent);
                }

                .pl-section-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .pl-section-title-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                }

                .pl-section-title-icon.purple {
                    background: linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(139, 92, 246, 0.2) 100%);
                }

                .pl-section-title-icon.blue {
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%);
                }

                .pl-budget-bar {
                    background: linear-gradient(145deg, rgba(30, 27, 75, 0.6) 0%, rgba(20, 18, 50, 0.8) 100%);
                    border: 1px solid rgba(234, 179, 8, 0.25);
                    border-radius: 14px;
                    padding: 14px 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                }

                .pl-budget-label {
                    font-family: 'DM Sans', sans-serif;
                    color: #94a3b8;
                    font-size: 0.875rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .pl-budget-value {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.25rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .pl-info-banner {
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 12px;
                    padding: 12px 16px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .pl-info-banner-icon {
                    font-size: 1rem;
                    flex-shrink: 0;
                }

                .pl-info-banner-text {
                    font-family: 'DM Sans', sans-serif;
                    color: #93c5fd;
                    font-size: 0.8rem;
                    line-height: 1.4;
                }

                .pl-input-group {
                    margin-bottom: 18px;
                }

                .pl-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: #94a3b8;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .pl-label-value {
                    font-family: 'Outfit', sans-serif;
                    font-weight: 600;
                    color: #c084fc;
                }

                .pl-label-value.gold {
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .pl-input {
                    width: 100%;
                    background: rgba(15, 23, 42, 0.8);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 12px;
                    padding: 14px 16px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 1rem;
                    color: #f1f5f9;
                    transition: all 0.25s ease;
                    -webkit-appearance: none;
                }

                .pl-input:focus {
                    outline: none;
                    border-color: #a855f7;
                    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
                }

                .pl-input::placeholder {
                    color: #64748b;
                }

                .pl-input-code {
                    text-align: center;
                    font-size: 1.5rem;
                    font-family: 'Outfit', monospace;
                    font-weight: 600;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                }

                .pl-slider {
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                    background: rgba(51, 65, 85, 0.6);
                    -webkit-appearance: none;
                    appearance: none;
                    cursor: pointer;
                }

                .pl-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
                    border: 3px solid #1e1b4b;
                    box-shadow: 0 2px 8px rgba(168, 85, 247, 0.4);
                    cursor: pointer;
                    transition: transform 0.2s ease;
                }

                .pl-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                }

                .pl-slider-labels {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #64748b;
                }

                .pl-prize-preview {
                    background: rgba(15, 23, 42, 0.6);
                    border-radius: 14px;
                    padding: 16px;
                    margin-top: 16px;
                    border: 1px solid rgba(234, 179, 8, 0.15);
                }

                .pl-prize-header {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    color: #94a3b8;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .pl-prize-pool {
                    font-family: 'Outfit', sans-serif;
                    font-weight: 700;
                    color: #fbbf24;
                }

                .pl-prize-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
                    gap: 8px;
                }

                .pl-prize-item {
                    background: rgba(30, 27, 75, 0.5);
                    border-radius: 10px;
                    padding: 10px 6px;
                    text-align: center;
                    border: 1px solid transparent;
                    transition: all 0.2s ease;
                }

                .pl-prize-item.winner {
                    background: linear-gradient(145deg, rgba(234, 179, 8, 0.15) 0%, rgba(180, 83, 9, 0.1) 100%);
                    border-color: rgba(234, 179, 8, 0.3);
                }

                .pl-prize-medal {
                    font-size: 1.25rem;
                    margin-bottom: 4px;
                }

                .pl-prize-amount {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #f1f5f9;
                }

                .pl-prize-net {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.65rem;
                    margin-top: 2px;
                }

                .pl-prize-net.positive { color: #4ade80; }
                .pl-prize-net.negative { color: #f87171; }

                .pl-prize-bonus {
                    font-size: 0.6rem;
                    color: #fbbf24;
                    margin-top: 2px;
                }

                .pl-warning {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    border-radius: 10px;
                    padding: 10px 14px;
                    margin-top: 12px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    color: #fca5a5;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .pl-btn {
                    width: 100%;
                    padding: 16px 24px;
                    border: none;
                    border-radius: 14px;
                    font-family: 'Outfit', sans-serif;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    position: relative;
                    overflow: hidden;
                }

                .pl-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                    transition: left 0.5s ease;
                }

                .pl-btn:hover::before {
                    left: 100%;
                }

                .pl-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none !important;
                }

                .pl-btn-primary {
                    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
                    color: white;
                    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.35);
                }

                .pl-btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 25px rgba(168, 85, 247, 0.45);
                }

                .pl-btn-primary:active:not(:disabled) {
                    transform: translateY(0) scale(0.98);
                }

                .pl-btn-secondary {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35);
                }

                .pl-btn-secondary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 25px rgba(59, 130, 246, 0.45);
                }

                .pl-btn-danger {
                    background: transparent;
                    border: 1px solid rgba(239, 68, 68, 0.4);
                    color: #f87171;
                }

                .pl-btn-danger:hover:not(:disabled) {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: rgba(239, 68, 68, 0.6);
                }

                .pl-btn-success {
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                    color: white;
                    box-shadow: 0 4px 20px rgba(34, 197, 94, 0.35);
                }

                .pl-btn-success:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 25px rgba(34, 197, 94, 0.45);
                }

                /* Invite Code Display */
                .pl-invite-box {
                    background: linear-gradient(145deg, rgba(88, 28, 135, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%);
                    border: 1px solid rgba(168, 85, 247, 0.3);
                    border-radius: 16px;
                    padding: 20px;
                    text-align: center;
                    margin-bottom: 16px;
                    position: relative;
                    overflow: hidden;
                }

                .pl-invite-box::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(45deg, transparent 30%, rgba(168, 85, 247, 0.05) 50%, transparent 70%);
                    background-size: 200% 200%;
                    animation: pl-shimmer 3s ease-in-out infinite;
                }

                .pl-invite-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    color: #94a3b8;
                    margin-bottom: 10px;
                    position: relative;
                }

                .pl-invite-code-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    position: relative;
                }

                .pl-invite-code {
                    font-family: 'Outfit', monospace;
                    font-size: 2rem;
                    font-weight: 700;
                    letter-spacing: 0.2em;
                    background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .pl-copy-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    background: rgba(30, 27, 75, 0.8);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .pl-copy-btn:hover {
                    background: rgba(168, 85, 247, 0.2);
                    border-color: rgba(168, 85, 247, 0.4);
                    color: #c084fc;
                }

                /* Team List */
                .pl-team-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .pl-team-item {
                    background: rgba(30, 27, 75, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    border-radius: 12px;
                    padding: 14px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: all 0.2s ease;
                }

                .pl-team-item:hover {
                    background: rgba(30, 27, 75, 0.7);
                }

                .pl-team-item.highlight {
                    border-color: rgba(168, 85, 247, 0.3);
                    background: rgba(88, 28, 135, 0.15);
                }

                .pl-team-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .pl-team-number {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: white;
                }

                .pl-team-name {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.95rem;
                    font-weight: 500;
                    color: #f1f5f9;
                }

                .pl-team-badge {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.65rem;
                    font-weight: 500;
                    padding: 3px 8px;
                    border-radius: 6px;
                    background: rgba(168, 85, 247, 0.2);
                    color: #c084fc;
                    margin-left: 8px;
                }

                .pl-team-status {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.75rem;
                    color: #4ade80;
                }

                .pl-team-slot-empty {
                    background: rgba(15, 23, 42, 0.4);
                    border: 2px dashed rgba(148, 163, 184, 0.2);
                    border-radius: 12px;
                    padding: 14px 16px;
                    text-align: center;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.85rem;
                    color: #64748b;
                    animation: pl-pulse-soft 2s ease-in-out infinite;
                }

                /* Timer Box */
                .pl-timer-box {
                    border-radius: 16px;
                    padding: 20px;
                    text-align: center;
                    margin-bottom: 16px;
                    position: relative;
                    overflow: hidden;
                }

                .pl-timer-box.waiting {
                    background: linear-gradient(145deg, rgba(59, 130, 246, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%);
                    border: 1px solid rgba(59, 130, 246, 0.25);
                }

                .pl-timer-box.ready {
                    background: linear-gradient(145deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    animation: pl-glow 2s ease-in-out infinite;
                }

                .pl-timer-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    color: #94a3b8;
                    margin-bottom: 8px;
                }

                .pl-timer-value {
                    font-family: 'Outfit', monospace;
                    font-size: 2.25rem;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                }

                .pl-timer-value.waiting { color: #60a5fa; }
                .pl-timer-value.ready { color: #4ade80; }

                .pl-timer-hint {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-top: 8px;
                }

                /* Standings Table */
                .pl-standings {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                .pl-standings table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    min-width: 320px;
                }

                .pl-standings th {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.65rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #64748b;
                    padding: 10px 6px;
                    text-align: center;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                    white-space: nowrap;
                }

                .pl-standings th:first-child,
                .pl-standings th:nth-child(2) {
                    text-align: left;
                }

                .pl-standings th.points {
                    color: #fbbf24;
                }

                .pl-standings td {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    padding: 12px 6px;
                    text-align: center;
                    color: #cbd5e1;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.05);
                }

                .pl-standings td:first-child,
                .pl-standings td:nth-child(2) {
                    text-align: left;
                }

                .pl-standings tr.my-team {
                    background: rgba(168, 85, 247, 0.1);
                }

                .pl-standings tr.my-team td:first-child {
                    position: relative;
                }

                .pl-standings tr.my-team td:first-child::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: #a855f7;
                    border-radius: 0 2px 2px 0;
                }

                .pl-standings .pos-1 { color: #fbbf24; font-weight: 600; }
                .pl-standings .wins { color: #4ade80; }
                .pl-standings .losses { color: #f87171; }
                .pl-standings .points-col {
                    font-family: 'Outfit', sans-serif;
                    font-weight: 700;
                    color: #fbbf24;
                }

                .pl-standings .team-name {
                    font-family: 'Outfit', sans-serif;
                    font-weight: 500;
                    color: #f1f5f9;
                    max-width: 100px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                /* Schedule */
                .pl-schedule-round {
                    margin-bottom: 20px;
                    padding: 14px;
                    border-radius: 12px;
                    background: rgba(15, 23, 42, 0.4);
                    border: 1px solid rgba(148, 163, 184, 0.08);
                }

                .pl-schedule-round.current {
                    background: rgba(168, 85, 247, 0.1);
                    border-color: rgba(168, 85, 247, 0.25);
                }

                .pl-schedule-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 12px;
                }

                .pl-schedule-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #94a3b8;
                }

                .pl-schedule-round.current .pl-schedule-title {
                    color: #c084fc;
                }

                .pl-schedule-badge {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.6rem;
                    font-weight: 600;
                    padding: 3px 8px;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
                    color: white;
                    text-transform: uppercase;
                }

                .pl-match {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 0;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                }

                .pl-match-team {
                    flex: 1;
                    color: #94a3b8;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .pl-match-team.home { text-align: right; padding-right: 10px; }
                .pl-match-team.away { text-align: left; padding-left: 10px; }
                .pl-match-team.winner { color: #4ade80; font-weight: 600; }

                .pl-match-score {
                    font-family: 'Outfit', monospace;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #f1f5f9;
                    min-width: 50px;
                    text-align: center;
                }

                .pl-match-score.pending {
                    color: #64748b;
                }

                /* Winner Header */
                .pl-winner-header {
                    background: linear-gradient(145deg, rgba(234, 179, 8, 0.15) 0%, rgba(180, 83, 9, 0.1) 100%);
                    border: 1px solid rgba(234, 179, 8, 0.3);
                    border-radius: 20px;
                    padding: 28px 20px;
                    text-align: center;
                    margin-bottom: 20px;
                    position: relative;
                    overflow: hidden;
                }

                .pl-winner-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(45deg, transparent 30%, rgba(234, 179, 8, 0.08) 50%, transparent 70%);
                    background-size: 200% 200%;
                    animation: pl-shimmer 3s ease-in-out infinite;
                }

                .pl-winner-trophy {
                    font-size: 3.5rem;
                    margin-bottom: 12px;
                    animation: pl-bounce-in 0.6s ease-out;
                    position: relative;
                }

                .pl-winner-name {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.5rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-bottom: 6px;
                    position: relative;
                }

                .pl-winner-subtitle {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.85rem;
                    color: #94a3b8;
                    position: relative;
                }

                /* Final Standings Item */
                .pl-final-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    border-radius: 12px;
                    margin-bottom: 8px;
                    background: rgba(30, 27, 75, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    transition: all 0.2s ease;
                }

                .pl-final-item.winner {
                    background: linear-gradient(145deg, rgba(234, 179, 8, 0.12) 0%, rgba(180, 83, 9, 0.08) 100%);
                    border-color: rgba(234, 179, 8, 0.25);
                }

                .pl-final-item.my-team {
                    border-color: rgba(168, 85, 247, 0.4);
                    box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.15);
                }

                .pl-final-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .pl-final-medal {
                    font-size: 1.5rem;
                }

                .pl-final-info {
                    display: flex;
                    flex-direction: column;
                }

                .pl-final-name {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #f1f5f9;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .pl-final-points {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.75rem;
                    color: #94a3b8;
                }

                .pl-champion-badge {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.55rem;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    color: #1e1b4b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .pl-final-right {
                    text-align: right;
                }

                .pl-final-prize {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1rem;
                    font-weight: 700;
                }

                .pl-final-prize.positive { color: #4ade80; }
                .pl-final-prize.negative { color: #f87171; }

                .pl-final-bonus {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.65rem;
                    color: #fbbf24;
                }

                /* Modal */
                .pl-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }

                .pl-modal-backdrop.active {
                    opacity: 1;
                    visibility: visible;
                }

                .pl-modal {
                    background: linear-gradient(145deg, rgba(30, 27, 75, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%);
                    border: 1px solid rgba(168, 85, 247, 0.25);
                    border-radius: 20px;
                    width: 100%;
                    max-width: 400px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    transform: scale(0.95) translateY(20px);
                    transition: transform 0.3s ease;
                }

                .pl-modal-backdrop.active .pl-modal {
                    transform: scale(1) translateY(0);
                }

                .pl-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 18px 20px;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                }

                .pl-modal-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #f1f5f9;
                }

                .pl-modal-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: rgba(51, 65, 85, 0.5);
                    border: none;
                    color: #94a3b8;
                    font-size: 1.25rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .pl-modal-close:hover {
                    background: rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }

                .pl-modal-body {
                    padding: 16px 20px;
                    overflow-y: auto;
                    flex: 1;
                }

                .pl-invite-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 14px;
                    background: rgba(30, 27, 75, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    border-radius: 12px;
                    margin-bottom: 10px;
                    transition: all 0.2s ease;
                }

                .pl-invite-item:hover {
                    background: rgba(30, 27, 75, 0.7);
                    border-color: rgba(148, 163, 184, 0.2);
                }

                .pl-invite-info h4 {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #f1f5f9;
                    margin-bottom: 2px;
                }

                .pl-invite-info p {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #64748b;
                }

                .pl-invite-btn {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: none;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                }

                .pl-invite-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                }

                .pl-invite-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .pl-invite-btn.sent {
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                }

                /* Fee Info */
                .pl-fee-info {
                    background: linear-gradient(145deg, rgba(234, 179, 8, 0.1) 0%, rgba(180, 83, 9, 0.05) 100%);
                    border: 1px solid rgba(234, 179, 8, 0.2);
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-bottom: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    text-align: center;
                }

                .pl-fee-cost {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.85rem;
                    color: #fbbf24;
                }

                .pl-fee-pool {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.75rem;
                    color: #b45309;
                }

                /* Success Info */
                .pl-success-info {
                    background: linear-gradient(145deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
                    border: 1px solid rgba(34, 197, 94, 0.25);
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-bottom: 16px;
                    text-align: center;
                }

                .pl-success-info p {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.85rem;
                    color: #4ade80;
                }

                /* Join Info */
                .pl-join-info {
                    background: rgba(30, 27, 75, 0.5);
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-top: 12px;
                }

                .pl-join-info-name {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #f1f5f9;
                    margin-bottom: 6px;
                }

                .pl-join-info-detail {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    color: #94a3b8;
                    margin-bottom: 3px;
                }

                .pl-join-info-cost {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.85rem;
                }

                .pl-join-info-cost.free { color: #4ade80; }
                .pl-join-info-cost.paid { color: #fbbf24; }

                /* Actions */
                .pl-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 20px;
                }

                .pl-danger-hint {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #f87171;
                    text-align: center;
                    margin-top: 6px;
                }

                /* Prizepool banner */
                .pl-prizepool-banner {
                    background: linear-gradient(145deg, rgba(234, 179, 8, 0.08) 0%, rgba(180, 83, 9, 0.04) 100%);
                    border: 1px solid rgba(234, 179, 8, 0.2);
                    border-radius: 10px;
                    padding: 10px 16px;
                    text-align: center;
                    margin-bottom: 16px;
                }

                .pl-prizepool-banner span {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.85rem;
                    color: #fbbf24;
                }

                .pl-prizepool-banner strong {
                    font-family: 'Outfit', sans-serif;
                    font-weight: 700;
                }

                /* Team adjust buttons */
                .pl-team-adjust-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: rgba(168, 85, 247, 0.2);
                    border: 1px solid rgba(168, 85, 247, 0.3);
                    color: #c084fc;
                    font-size: 1.25rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .pl-team-adjust-btn:hover:not(:disabled) {
                    background: rgba(168, 85, 247, 0.35);
                    border-color: rgba(168, 85, 247, 0.5);
                    transform: scale(1.05);
                }

                .pl-team-adjust-btn:active:not(:disabled) {
                    transform: scale(0.95);
                }

                .pl-team-adjust-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                /* Mobile optimizations */
                @media (max-width: 380px) {
                    .pl-container { padding: 16px 12px; }
                    .pl-card { padding: 16px; }
                    .pl-title { font-size: 1.5rem; }
                    .pl-invite-code { font-size: 1.5rem; letter-spacing: 0.15em; }
                    .pl-timer-value { font-size: 1.75rem; }
                    .pl-standings td, .pl-standings th { padding: 8px 4px; font-size: 0.7rem; }
                    .pl-btn { padding: 14px 20px; font-size: 0.9rem; }
                }
            </style>
        `;
    },

    // ================================================================
    // VISTA: NESSUNA LEGA
    // ================================================================

    async renderNoLeague(container) {
        // Ottieni CS (budget) in modo robusto
        let currentCS = await this.getTeamCS();
        // Assicurati che sia un numero valido
        if (typeof currentCS !== 'number' || isNaN(currentCS)) {
            currentCS = 0;
        }

        const maxFee = window.PrivateLeagues.MAX_ENTRY_FEE;
        const minTeams = window.PrivateLeagues.MIN_TEAMS;
        const maxTeams = window.PrivateLeagues.MAX_TEAMS;

        container.innerHTML = `
            ${this.getStyles()}
            <div class="pl-container">
                <!-- Header -->
                <div class="pl-header">
                    <h2 class="pl-title">Leghe Private</h2>
                    <p class="pl-subtitle">Sfida i tuoi amici in mini-campionati esclusivi</p>
                </div>

                <!-- Budget Display -->
                <div class="pl-budget-bar">
                    <span class="pl-budget-label">
                        <span>💰</span> Il tuo Budget
                    </span>
                    <span class="pl-budget-value">${currentCS} CS</span>
                </div>

                <!-- Info Banner -->
                <div class="pl-info-banner">
                    <span class="pl-info-banner-icon">ℹ️</span>
                    <span class="pl-info-banner-text">Puoi partecipare a <strong>1 lega privata</strong> per volta</span>
                </div>

                <!-- Create League Card -->
                <div class="pl-card pl-card-create">
                    <h3 class="pl-section-title">
                        <span class="pl-section-title-icon purple">🏆</span>
                        Crea Nuova Lega
                    </h3>

                    <div class="pl-input-group">
                        <label class="pl-label">Nome della Lega</label>
                        <input type="text" id="create-league-name" maxlength="30" class="pl-input" placeholder="Es: Lega Champions">
                    </div>

                    <div class="pl-input-group">
                        <label class="pl-label">
                            <span>Numero Squadre</span>
                            <span class="pl-label-value" id="team-count-display">4</span>
                        </label>
                        <input type="range" id="create-league-teams" min="${minTeams}" max="${maxTeams}" step="1" value="4" class="pl-slider">
                        <div class="pl-slider-labels">
                            <span>${minTeams} squadre</span>
                            <span>${maxTeams} squadre</span>
                        </div>
                    </div>

                    <div class="pl-input-group">
                        <label class="pl-label">
                            <span>Quota d'Ingresso</span>
                            <span class="pl-label-value gold" id="entry-fee-display">0 CS</span>
                        </label>
                        <input type="range" id="create-league-fee" min="0" max="${maxFee}" step="50" value="0" class="pl-slider">
                        <div class="pl-slider-labels">
                            <span>Gratis</span>
                            <span>${maxFee} CS</span>
                        </div>
                    </div>

                    <div id="prize-preview" class="pl-prize-preview" style="display: none;">
                        <div class="pl-prize-header">
                            <span>🏅</span> Montepremi: <span id="total-pool" class="pl-prize-pool">0 CS</span>
                        </div>
                        <div id="prize-grid" class="pl-prize-grid"></div>
                    </div>

                    <div id="create-warning" class="pl-warning" style="display: none;">
                        <span>⚠️</span>
                        <span id="create-warning-text"></span>
                    </div>

                    <button id="btn-create-league" class="pl-btn pl-btn-primary" style="margin-top: 16px;">
                        <span>✨</span> Crea Lega
                    </button>
                </div>

                <!-- Join League Card -->
                <div class="pl-card pl-card-join">
                    <h3 class="pl-section-title">
                        <span class="pl-section-title-icon blue">🎫</span>
                        Unisciti a una Lega
                    </h3>

                    <div class="pl-input-group">
                        <label class="pl-label">Codice Invito</label>
                        <input type="text" id="join-league-code" maxlength="6" class="pl-input pl-input-code" placeholder="ABC123">
                    </div>

                    <div id="join-league-info" class="pl-join-info" style="display: none;"></div>

                    <div id="join-warning" class="pl-warning" style="display: none;">
                        <span>⚠️</span>
                        <span id="join-warning-text"></span>
                    </div>

                    <button id="btn-join-league" class="pl-btn pl-btn-secondary" style="margin-top: 16px;">
                        <span>🔍</span> Cerca Lega
                    </button>
                </div>
            </div>
        `;

        this.attachNoLeagueListeners(container);
    },

    attachNoLeagueListeners(container) {
        const feeSlider = container.querySelector('#create-league-fee');
        const teamsSlider = container.querySelector('#create-league-teams');
        const feeDisplay = container.querySelector('#entry-fee-display');
        const teamsDisplay = container.querySelector('#team-count-display');
        const prizePreview = container.querySelector('#prize-preview');
        const prizeGrid = container.querySelector('#prize-grid');
        const createWarning = container.querySelector('#create-warning');
        const createWarningText = container.querySelector('#create-warning-text');
        const btnCreate = container.querySelector('#btn-create-league');

        // Cache dei CS (budget) per evitare chiamate async nel listener
        let cachedCS = this.currentTeamData?.budget || 0;
        this.getTeamCS().then(cs => { cachedCS = cs; }).catch(err => console.error('[PrivateLeagues] Errore caricamento CS:', err));

        const updatePrizePreview = () => {
            const fee = parseInt(feeSlider.value);
            const numTeams = parseInt(teamsSlider.value);
            const currentCS = cachedCS;

            teamsDisplay.textContent = numTeams;
            feeDisplay.textContent = `${fee} CS`;

            if (fee > 0) {
                prizePreview.style.display = 'block';
                const gains = window.PrivateLeagues.calculateNetGains(fee, numTeams);
                const totalPoolEl = container.querySelector('#total-pool');
                if (totalPoolEl) totalPoolEl.textContent = `${fee * numTeams} CS`;

                const medals = ['🥇', '🥈', '🥉', '4°', '5°', '6°'];
                prizeGrid.innerHTML = gains.map((g, i) => `
                    <div class="pl-prize-item ${i === 0 ? 'winner' : ''}">
                        <div class="pl-prize-medal">${medals[i]}</div>
                        <div class="pl-prize-amount">${g.prize} CS</div>
                        <div class="pl-prize-net ${g.netGain >= 0 ? 'positive' : 'negative'}">${g.netGain >= 0 ? '+' : ''}${g.netGain}</div>
                        ${i === 0 ? '<div class="pl-prize-bonus">+bonus</div>' : ''}
                    </div>
                `).join('');

                if (currentCS < fee) {
                    createWarningText.textContent = `CS insufficienti! Hai ${currentCS} CS`;
                    createWarning.style.display = 'flex';
                    btnCreate.disabled = true;
                } else {
                    createWarning.style.display = 'none';
                    btnCreate.disabled = false;
                }
            } else {
                prizePreview.style.display = 'none';
                createWarning.style.display = 'none';
                btnCreate.disabled = false;
            }
        };

        feeSlider?.addEventListener('input', updatePrizePreview);
        teamsSlider?.addEventListener('input', updatePrizePreview);

        // Crea lega
        btnCreate?.addEventListener('click', async () => {
            const name = container.querySelector('#create-league-name').value.trim();
            const fee = parseInt(feeSlider.value) || 0;
            const numTeams = parseInt(teamsSlider.value) || 4;

            if (!name || name.length < 3) {
                createWarningText.textContent = 'Nome troppo corto (min 3 caratteri)';
                createWarning.style.display = 'flex';
                return;
            }

            btnCreate.disabled = true;
            btnCreate.innerHTML = '<span>⏳</span> Creazione...';

            const result = await window.PrivateLeagues.createLeague(
                name,
                this.currentTeamId,
                this.currentTeamData.teamName,
                fee,
                numTeams
            );

            if (result.success) {
                if (window.Toast) window.Toast.success(`Lega creata! Codice: ${result.inviteCode}`);
                await this.refreshTeamData();
                this.currentLeague = await window.PrivateLeagues.getLeagueById(result.leagueId);
                this.render();
            } else {
                createWarningText.textContent = result.error;
                createWarning.style.display = 'flex';
                btnCreate.disabled = false;
                btnCreate.innerHTML = '<span>✨</span> Crea Lega';
            }
        });

        // Cerca lega
        const btnJoin = container.querySelector('#btn-join-league');
        const codeInput = container.querySelector('#join-league-code');
        const joinInfo = container.querySelector('#join-league-info');
        const joinWarning = container.querySelector('#join-warning');
        const joinWarningText = container.querySelector('#join-warning-text');

        let foundLeague = null;

        btnJoin?.addEventListener('click', async () => {
            const code = codeInput.value.trim().toUpperCase();

            if (!code || code.length < 4) {
                joinWarningText.textContent = 'Inserisci un codice valido';
                joinWarning.style.display = 'flex';
                return;
            }

            if (foundLeague && btnJoin.textContent.includes('Unisciti')) {
                btnJoin.disabled = true;
                btnJoin.innerHTML = '<span>⏳</span> Iscrizione...';

                const result = await window.PrivateLeagues.joinLeague(
                    code,
                    this.currentTeamId,
                    this.currentTeamData.teamName
                );

                if (result.success) {
                    if (result.leagueStarted) {
                        if (window.Toast) window.Toast.success('Lega al completo! Campionato iniziato!');
                    } else {
                        if (window.Toast) window.Toast.success('Iscrizione completata!');
                    }
                    await this.refreshTeamData();
                    this.currentLeague = await window.PrivateLeagues.getLeagueById(result.leagueId);
                    this.render();
                } else {
                    joinWarningText.textContent = result.error;
                    joinWarning.style.display = 'flex';
                    btnJoin.disabled = false;
                    btnJoin.innerHTML = '<span>🎯</span> Unisciti';
                }
                return;
            }

            btnJoin.disabled = true;
            btnJoin.innerHTML = '<span>⏳</span> Ricerca...';

            foundLeague = await window.PrivateLeagues.getLeagueByInviteCode(code);

            if (!foundLeague) {
                joinWarningText.textContent = 'Codice non valido';
                joinWarning.style.display = 'flex';
                joinInfo.style.display = 'none';
                btnJoin.disabled = false;
                btnJoin.innerHTML = '<span>🔍</span> Cerca Lega';
                return;
            }

            const canAfford = window.PrivateLeagues.canAffordEntry(cachedCS, foundLeague.entryFee);

            joinInfo.innerHTML = `
                <div class="pl-join-info-name">${foundLeague.name}</div>
                <div class="pl-join-info-detail">Squadre: ${foundLeague.teams.length}/${foundLeague.maxTeams}</div>
                <div class="pl-join-info-cost ${foundLeague.entryFee > 0 ? 'paid' : 'free'}">
                    ${foundLeague.entryFee > 0 ? `Quota: ${foundLeague.entryFee} CS` : '✅ Ingresso Gratuito'}
                </div>
                ${!canAfford ? `<div style="color: #f87171; font-size: 0.8rem; margin-top: 8px;">⚠️ CS insufficienti (Hai ${cachedCS} CS)</div>` : ''}
            `;
            joinInfo.style.display = 'block';
            joinWarning.style.display = 'none';

            if (foundLeague.teams.length >= foundLeague.maxTeams) {
                joinWarningText.textContent = 'Lega al completo';
                joinWarning.style.display = 'flex';
                btnJoin.disabled = false;
                btnJoin.innerHTML = '<span>🔍</span> Cerca Lega';
            } else if (!canAfford) {
                btnJoin.disabled = true;
                btnJoin.innerHTML = '<span>💸</span> CS Insufficienti';
            } else {
                btnJoin.disabled = false;
                btnJoin.innerHTML = '<span>🎯</span> Unisciti';
            }
        });
    },

    // ================================================================
    // VISTA: IN ATTESA
    // ================================================================

    renderWaitingLeague(container) {
        const league = this.currentLeague;

        container.innerHTML = `
            ${this.getStyles()}
            <div class="pl-container">
                <!-- Header -->
                <div class="pl-header">
                    <h2 class="pl-title">${league.name}</h2>
                    <p class="pl-subtitle">In attesa di giocatori...</p>
                </div>

                <!-- Invite Code Box -->
                <div class="pl-invite-box">
                    <div class="pl-invite-label">Condividi il codice invito</div>
                    <div class="pl-invite-code-wrapper">
                        <span class="pl-invite-code">${league.inviteCode}</span>
                        <button id="btn-copy-code" class="pl-copy-btn" title="Copia codice">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Info -->
                <div class="pl-info-banner">
                    <span class="pl-info-banner-icon">⚡</span>
                    <span class="pl-info-banner-text">Il campionato inizia automaticamente quando tutte le <strong>${league.maxTeams} squadre</strong> si iscrivono</span>
                </div>

                ${league.createdBy === this.currentTeamId ? `
                <!-- Modifica Numero Squadre (solo creatore) -->
                <div class="pl-card" style="padding: 14px 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1rem;">⚙️</span>
                            <span style="font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #94a3b8;">Numero Squadre</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button id="btn-decrease-teams" class="pl-team-adjust-btn" ${league.maxTeams <= league.teams.length || league.maxTeams <= window.PrivateLeagues.MIN_TEAMS ? 'disabled' : ''}>−</button>
                            <span id="current-max-teams" style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 600; color: #c084fc; min-width: 24px; text-align: center;">${league.maxTeams}</span>
                            <button id="btn-increase-teams" class="pl-team-adjust-btn" ${league.maxTeams >= window.PrivateLeagues.MAX_TEAMS ? 'disabled' : ''}>+</button>
                        </div>
                    </div>
                    <p style="font-family: 'DM Sans', sans-serif; font-size: 0.7rem; color: #64748b; margin-top: 8px; text-align: center;">
                        Min: ${league.teams.length} (iscritti) • Max: ${window.PrivateLeagues.MAX_TEAMS}
                    </p>
                </div>
                ` : ''}

                ${league.entryFee > 0 ? `
                    <div class="pl-fee-info">
                        <span class="pl-fee-cost">💰 Quota: <strong>${league.entryFee} CS</strong></span>
                        <span class="pl-fee-pool">Montepremi: <strong>${league.entryFee * league.maxTeams} CS</strong></span>
                    </div>
                ` : ''}

                <!-- Team List -->
                <div class="pl-card">
                    <h3 class="pl-section-title">
                        <span class="pl-section-title-icon purple">👥</span>
                        Squadre (${league.teams.length}/${league.maxTeams})
                    </h3>

                    <div class="pl-team-list">
                        ${league.teams.map((team, i) => `
                            <div class="pl-team-item ${team.teamId === this.currentTeamId ? 'highlight' : ''}">
                                <div class="pl-team-info">
                                    <span class="pl-team-number">${i + 1}</span>
                                    <span class="pl-team-name">${team.teamName}</span>
                                    ${team.teamId === league.createdBy ? '<span class="pl-team-badge">Creatore</span>' : ''}
                                </div>
                                ${league.entryFee > 0 ? '<span class="pl-team-status">✓ Pagato</span>' : ''}
                            </div>
                        `).join('')}

                        ${Array(league.maxTeams - league.teams.length).fill(0).map(() => `
                            <div class="pl-team-slot-empty">⏳ In attesa...</div>
                        `).join('')}
                    </div>
                </div>

                <!-- Actions -->
                <div class="pl-actions" style="margin-bottom: 40px;">
                    <button id="btn-invite-user" class="pl-btn pl-btn-secondary" style="min-height: 56px;">
                        <span>📨</span> Invita Giocatori
                    </button>
                    <button id="btn-leave-league" class="pl-btn pl-btn-danger" style="min-height: 56px;">
                        Abbandona Lega
                    </button>
                    ${league.entryFee > 0 ? `
                        <p class="pl-danger-hint">⚠️ Abbandonando perderai ${league.entryFee} CS</p>
                    ` : ''}
                </div>
            </div>

            <!-- Invite Modal -->
            <div id="invite-modal" class="pl-modal-backdrop">
                <div class="pl-modal">
                    <div class="pl-modal-header">
                        <span class="pl-modal-title">📨 Invita Squadra</span>
                        <button id="close-invite-modal" class="pl-modal-close">&times;</button>
                    </div>
                    <div id="invite-teams-list" class="pl-modal-body">
                        <p style="text-align: center; color: #64748b;">Caricamento squadre...</p>
                    </div>
                </div>
            </div>
        `;

        this.attachWaitingListeners(container);
    },

    attachWaitingListeners(container) {
        // Copia codice
        container.querySelector('#btn-copy-code')?.addEventListener('click', () => {
            navigator.clipboard.writeText(this.currentLeague.inviteCode);
            if (window.Toast) window.Toast.success('Codice copiato!');
        });

        // Modifica numero squadre (solo creatore)
        const btnDecrease = container.querySelector('#btn-decrease-teams');
        const btnIncrease = container.querySelector('#btn-increase-teams');
        const maxTeamsDisplay = container.querySelector('#current-max-teams');

        if (btnDecrease && btnIncrease && maxTeamsDisplay) {
            const updateMaxTeams = async (delta) => {
                const currentMax = parseInt(maxTeamsDisplay.textContent);
                const newMax = currentMax + delta;

                // Disabilita i pulsanti durante l'aggiornamento
                btnDecrease.disabled = true;
                btnIncrease.disabled = true;

                const result = await window.PrivateLeagues.updateMaxTeams(
                    this.currentLeague.leagueId,
                    this.currentTeamId,
                    newMax
                );

                if (result.success && !result.unchanged) {
                    // Se la lega è stata avviata, mostra messaggio e ricarica
                    if (result.leagueStarted) {
                        if (window.Toast) window.Toast.success('🏆 Lega avviata! Il campionato è iniziato!');
                        // Ricarica i dati freschi da Firestore
                        this.currentLeague = await window.PrivateLeagues.getLeagueById(this.currentLeague.leagueId);
                        this.render();
                        return;
                    }

                    // Aggiorna il display
                    maxTeamsDisplay.textContent = newMax;
                    this.currentLeague.maxTeams = newMax;

                    // Aggiorna lo stato dei pulsanti
                    const minTeams = Math.max(this.currentLeague.teams.length, window.PrivateLeagues.MIN_TEAMS);
                    btnDecrease.disabled = newMax <= minTeams;
                    btnIncrease.disabled = newMax >= window.PrivateLeagues.MAX_TEAMS;

                    if (window.Toast) window.Toast.success(`Numero squadre aggiornato a ${newMax}`);

                    // Refresh UI per aggiornare tutto
                    this.render();
                } else if (!result.success) {
                    if (window.Toast) window.Toast.error(result.error);
                    // Ripristina lo stato dei pulsanti
                    const minTeams = Math.max(this.currentLeague.teams.length, window.PrivateLeagues.MIN_TEAMS);
                    btnDecrease.disabled = currentMax <= minTeams;
                    btnIncrease.disabled = currentMax >= window.PrivateLeagues.MAX_TEAMS;
                }
            };

            btnDecrease.addEventListener('click', () => updateMaxTeams(-1));
            btnIncrease.addEventListener('click', () => updateMaxTeams(1));
        }

        // Modal inviti
        const inviteModal = container.querySelector('#invite-modal');
        const inviteTeamsList = container.querySelector('#invite-teams-list');

        container.querySelector('#btn-invite-user')?.addEventListener('click', async () => {
            inviteModal.classList.add('active');

            inviteTeamsList.innerHTML = '<p style="text-align: center; color: #64748b;">Caricamento squadre...</p>';

            const teams = await window.PrivateLeagues.getAvailableTeamsForInvite(this.currentLeague.leagueId);

            if (teams.length === 0) {
                inviteTeamsList.innerHTML = '<p style="text-align: center; color: #64748b;">Nessuna squadra disponibile</p>';
                return;
            }

            inviteTeamsList.innerHTML = teams.map(team => `
                <div class="pl-invite-item">
                    <div class="pl-invite-info">
                        <h4>${team.teamName}</h4>
                        <p>Budget: ${team.budget} CS</p>
                    </div>
                    <button class="pl-invite-btn btn-send-invite" data-team-id="${team.teamId}" data-team-name="${team.teamName}">
                        Invita
                    </button>
                </div>
            `).join('');

            inviteTeamsList.querySelectorAll('.btn-send-invite').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const targetTeamId = e.target.dataset.teamId;
                    const targetTeamName = e.target.dataset.teamName;

                    e.target.disabled = true;
                    e.target.textContent = 'Invio...';

                    const result = await window.PrivateLeagues.sendInvitation(
                        this.currentLeague.leagueId,
                        targetTeamId,
                        this.currentTeamData.teamName
                    );

                    if (result.success) {
                        if (window.Toast) window.Toast.success(`Invito inviato a ${targetTeamName}!`);
                        e.target.textContent = 'Inviato ✓';
                        e.target.classList.add('sent');
                    } else {
                        if (window.Toast) window.Toast.error(result.error);
                        e.target.disabled = false;
                        e.target.textContent = 'Invita';
                    }
                });
            });
        });

        // Chiudi modal
        container.querySelector('#close-invite-modal')?.addEventListener('click', () => {
            inviteModal.classList.remove('active');
        });

        inviteModal?.addEventListener('click', (e) => {
            if (e.target === inviteModal) {
                inviteModal.classList.remove('active');
            }
        });

        // Abbandona
        container.querySelector('#btn-leave-league')?.addEventListener('click', async () => {
            const fee = this.currentLeague.entryFee;
            const msg = fee > 0
                ? `Sei sicuro? Perderai ${fee} CS!`
                : 'Sei sicuro di voler abbandonare la lega?';

            if (!confirm(msg)) return;

            const result = await window.PrivateLeagues.leaveLeague(this.currentTeamId);

            if (result.success) {
                if (window.Toast) window.Toast.info('Hai abbandonato la lega');
                await this.refreshTeamData();
                this.currentLeague = null;
                this.render();
            } else {
                if (window.Toast) window.Toast.error(result.error);
            }
        });
    },

    // ================================================================
    // VISTA: IN CORSO
    // ================================================================

    renderInProgressLeague(container) {
        const league = this.currentLeague;
        const currentRound = league.currentRound || 1;
        const totalRounds = league.schedule.length;

        const timeRemaining = window.PrivateLeagues.getTimeUntilNextSimulation(league);
        const canForceSimulate = timeRemaining !== null && timeRemaining <= 0;

        const sortedStandings = [...league.standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
        });

        container.innerHTML = `
            ${this.getStyles()}
            <div class="pl-container">
                <!-- Header -->
                <div class="pl-header">
                    <h2 class="pl-title">${league.name}</h2>
                    <p class="pl-subtitle">Giornata ${Math.min(currentRound, totalRounds)} di ${totalRounds}</p>
                </div>

                <!-- Timer -->
                ${currentRound <= totalRounds ? `
                    <div class="pl-timer-box ${canForceSimulate ? 'ready' : 'waiting'}" id="timer-box">
                        <div class="pl-timer-label">Prossima giornata tra:</div>
                        <div class="pl-timer-value ${canForceSimulate ? 'ready' : 'waiting'}" id="timer-display">
                            ${canForceSimulate ? 'PRONTA!' : window.PrivateLeagues.formatTimeRemaining(timeRemaining)}
                        </div>
                        ${canForceSimulate ? `
                            <button id="btn-force-simulate" class="pl-btn pl-btn-success" style="margin-top: 12px; width: auto; padding: 12px 28px;">
                                <span>⚡</span> Simula Ora
                            </button>
                        ` : `
                            <div class="pl-timer-hint">Simulazione automatica ogni 24 ore</div>
                        `}
                    </div>
                ` : ''}

                ${league.entryFee > 0 ? `
                    <div class="pl-prizepool-banner">
                        <span>🏆 Montepremi: <strong>${league.entryFee * league.maxTeams} CS</strong></span>
                    </div>
                ` : ''}

                <!-- Standings -->
                <div class="pl-card">
                    <h3 class="pl-section-title">
                        <span class="pl-section-title-icon purple">📊</span>
                        Classifica
                    </h3>

                    <div class="pl-standings">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Squadra</th>
                                    <th>G</th>
                                    <th>V</th>
                                    <th>P</th>
                                    <th>S</th>
                                    <th>GF</th>
                                    <th>GS</th>
                                    <th class="points">Pt</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedStandings.map((team, i) => `
                                    <tr class="${team.teamId === this.currentTeamId ? 'my-team' : ''}">
                                        <td class="${i === 0 ? 'pos-1' : ''}">${i + 1}</td>
                                        <td class="team-name">${team.teamName}</td>
                                        <td>${team.played}</td>
                                        <td class="wins">${team.wins}</td>
                                        <td>${team.draws}</td>
                                        <td class="losses">${team.losses}</td>
                                        <td>${team.goalsFor}</td>
                                        <td>${team.goalsAgainst}</td>
                                        <td class="points-col">${team.points}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Schedule -->
                <div class="pl-card">
                    <h3 class="pl-section-title">
                        <span class="pl-section-title-icon blue">📅</span>
                        Calendario
                    </h3>

                    ${this.renderSchedule(league.schedule, currentRound)}
                </div>
            </div>
        `;

        this.attachInProgressListeners(container);
        this.startTimerUpdate(container);
    },

    renderSchedule(schedule, currentRound) {
        return schedule.map(round => {
            const isCurrent = round.round === currentRound;

            return `
                <div class="pl-schedule-round ${isCurrent ? 'current' : ''}">
                    <div class="pl-schedule-header">
                        <span class="pl-schedule-title">G${round.round} - ${round.type}</span>
                        ${isCurrent ? '<span class="pl-schedule-badge">Attuale</span>' : ''}
                    </div>
                    ${round.matches.map(match => `
                        <div class="pl-match">
                            <span class="pl-match-team home ${match.result && match.result.homeGoals > match.result.awayGoals ? 'winner' : ''}">${match.homeName}</span>
                            <span class="pl-match-score ${match.result ? '' : 'pending'}">
                                ${match.result ? `${match.result.homeGoals} - ${match.result.awayGoals}` : '- : -'}
                            </span>
                            <span class="pl-match-team away ${match.result && match.result.awayGoals > match.result.homeGoals ? 'winner' : ''}">${match.awayName}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    },

    attachInProgressListeners(container) {
        container.querySelector('#btn-force-simulate')?.addEventListener('click', async () => {
            const btn = container.querySelector('#btn-force-simulate');
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span> Simulazione...';

            const result = await window.PrivateLeagues.simulateRound(this.currentLeague.leagueId);

            if (result.success) {
                if (result.isCompleted) {
                    if (window.Toast) window.Toast.success(`Campionato terminato! Vincitore: ${result.winner.teamName}`);
                } else {
                    if (window.Toast) window.Toast.success('Giornata simulata!');
                }

                await this.refreshTeamData();
                this.currentLeague = await window.PrivateLeagues.getLeagueById(this.currentLeague.leagueId);
                this.render();
            } else {
                if (window.Toast) window.Toast.error(result.error);
                btn.disabled = false;
                btn.innerHTML = '<span>⚡</span> Simula Ora';
            }
        });
    },

    startTimerUpdate(container) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(async () => {
            if (!this.currentLeague || this.currentLeague.status !== 'in_progress') {
                clearInterval(this.timerInterval);
                return;
            }

            this.currentLeague = await window.PrivateLeagues.getLeagueById(this.currentLeague.leagueId);

            if (!this.currentLeague || this.currentLeague.status !== 'in_progress') {
                clearInterval(this.timerInterval);
                this.render();
                return;
            }

            const timeRemaining = window.PrivateLeagues.getTimeUntilNextSimulation(this.currentLeague);
            const canForceSimulate = timeRemaining !== null && timeRemaining <= 0;

            const timerDisplay = container.querySelector('#timer-display');
            const timerBox = container.querySelector('#timer-box');

            if (timerDisplay) {
                if (canForceSimulate) {
                    timerDisplay.textContent = 'PRONTA!';
                    timerDisplay.className = 'pl-timer-value ready';

                    if (timerBox && !container.querySelector('#btn-force-simulate')) {
                        timerBox.className = 'pl-timer-box ready';
                        const btnHtml = `
                            <button id="btn-force-simulate" class="pl-btn pl-btn-success" style="margin-top: 12px; width: auto; padding: 12px 28px;">
                                <span>⚡</span> Simula Ora
                            </button>
                        `;
                        timerDisplay.insertAdjacentHTML('afterend', btnHtml);
                        this.attachInProgressListeners(container);
                    }
                } else {
                    timerDisplay.textContent = window.PrivateLeagues.formatTimeRemaining(timeRemaining);
                }
            }
        }, 60000);
    },

    // ================================================================
    // VISTA: COMPLETATA
    // ================================================================

    renderCompletedLeague(container) {
        const league = this.currentLeague;

        const sortedStandings = [...league.standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
        });

        const prizeResults = league.prizeResults || [];
        const medals = ['🥇', '🥈', '🥉', '4°', '5°', '6°'];

        container.innerHTML = `
            ${this.getStyles()}
            <div class="pl-container">
                <!-- Winner Header -->
                <div class="pl-winner-header">
                    <div class="pl-winner-trophy">🏆</div>
                    <h2 class="pl-winner-name">${league.winner?.teamName || 'Vincitore'}</h2>
                    <p class="pl-winner-subtitle">Campione di ${league.name}</p>
                </div>

                <!-- Final Standings -->
                <div class="pl-card">
                    <h3 class="pl-section-title">
                        <span class="pl-section-title-icon purple">🏅</span>
                        Classifica Finale
                    </h3>

                    ${sortedStandings.map((team, i) => {
                        const prizeInfo = prizeResults.find(p => p.teamId === team.teamId);
                        const isWinner = i === 0;
                        const isMyTeam = team.teamId === this.currentTeamId;

                        return `
                            <div class="pl-final-item ${isWinner ? 'winner' : ''} ${isMyTeam ? 'my-team' : ''}">
                                <div class="pl-final-left">
                                    <span class="pl-final-medal">${medals[i]}</span>
                                    <div class="pl-final-info">
                                        <span class="pl-final-name">
                                            ${team.teamName}
                                            ${isWinner ? '<span class="pl-champion-badge">Campione</span>' : ''}
                                        </span>
                                        <span class="pl-final-points">${team.points} punti</span>
                                    </div>
                                </div>
                                ${prizeInfo && (prizeInfo.prize > 0 || prizeInfo.netGain !== 0) ? `
                                    <div class="pl-final-right">
                                        <span class="pl-final-prize ${prizeInfo.netGain >= 0 ? 'positive' : 'negative'}">
                                            ${prizeInfo.netGain >= 0 ? '+' : ''}${prizeInfo.netGain} CS
                                        </span>
                                        ${prizeInfo.winnerBonus > 0 ? `
                                            <span class="pl-final-bonus">bonus vincitore!</span>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Match History -->
                <div class="pl-card">
                    <h3 class="pl-section-title">
                        <span class="pl-section-title-icon blue">📜</span>
                        Storico Partite
                    </h3>
                    ${this.renderSchedule(league.schedule, 999)}
                </div>

                <!-- Success Info -->
                <div class="pl-success-info">
                    <p>🎉 Puoi abbandonare questa lega e iniziarne subito una nuova!</p>
                </div>

                <!-- Leave Button -->
                <button id="btn-leave-completed" class="pl-btn pl-btn-primary" style="margin-bottom: 40px; min-height: 56px;">
                    <span>🚀</span> Esci e Inizia Nuova Lega
                </button>
            </div>
        `;

        container.querySelector('#btn-leave-completed')?.addEventListener('click', async () => {
            if (!confirm('Vuoi abbandonare questa lega e iniziarne una nuova?')) return;

            const result = await window.PrivateLeagues.leaveLeague(this.currentTeamId);

            if (result.success) {
                if (window.Toast) window.Toast.info('Hai abbandonato la lega');
                await this.refreshTeamData();
                this.currentLeague = null;
                this.render();
            } else {
                if (window.Toast) window.Toast.error(result.error);
            }
        });
    },

    // ================================================================
    // UTILITY
    // ================================================================

    async refreshTeamData() {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const teamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams`, this.currentTeamId));
            if (teamDoc.exists()) {
                this.currentTeamData = teamDoc.data();
            }
        } catch (error) {
            console.error('Errore refresh dati squadra:', error);
        }
    },

    async getTeamCS() {
        if (this.currentTeamData?.budget !== undefined) {
            return this.currentTeamData.budget;
        }

        await this.refreshTeamData();
        return this.currentTeamData?.budget || 0;
    }
};

console.log("Modulo PrivateLeaguesUI caricato (Premium Mobile-First Design).");
