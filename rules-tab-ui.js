//
// ====================================================================
// RULES-TAB-UI.JS - Interfaccia Regolamento Premium Mobile-First
// ====================================================================
//

window.RulesTabUI = {

    initialized: false,
    expandedSections: {},

    /**
     * Inizializza e renderizza la tab regole
     */
    init() {
        if (this.initialized) return;

        const container = document.getElementById('tab-rules');
        if (!container) return;

        this.render(container);
        this.initialized = true;
    },

    /**
     * Stili CSS Premium
     */
    getStyles() {
        return `
            <style>
                .rules-container {
                    padding: 16px 12px;
                    max-width: 100%;
                    animation: rules-fade-in 0.4s ease-out;
                }

                @keyframes rules-fade-in {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes rules-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                @keyframes rules-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }

                .rules-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding: 16px;
                    background: linear-gradient(145deg, rgba(30, 27, 75, 0.8) 0%, rgba(20, 18, 50, 0.9) 100%);
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: 16px;
                    position: relative;
                    overflow: hidden;
                }

                .rules-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.6), transparent);
                }

                .rules-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .rules-header-icon {
                    font-size: 2rem;
                    animation: rules-pulse 3s ease-in-out infinite;
                }

                .rules-header-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.5rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    letter-spacing: -0.02em;
                }

                .rules-header-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(236, 72, 153, 0.4);
                    background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%);
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #f472b6;
                    cursor: pointer;
                    transition: all 0.25s ease;
                }

                .rules-header-btn:hover {
                    background: linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(168, 85, 247, 0.2) 100%);
                    border-color: rgba(236, 72, 153, 0.6);
                    transform: translateY(-1px);
                }

                /* Quick Stats Grid */
                .rules-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                    margin-bottom: 20px;
                }

                .rules-stat-card {
                    background: linear-gradient(145deg, rgba(30, 27, 75, 0.6) 0%, rgba(20, 18, 50, 0.8) 100%);
                    border-radius: 14px;
                    padding: 12px 8px;
                    text-align: center;
                    border: 1px solid transparent;
                    transition: all 0.25s ease;
                    position: relative;
                    overflow: hidden;
                }

                .rules-stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--stat-color, rgba(255,255,255,0.3)), transparent);
                    opacity: 0.6;
                }

                .rules-stat-card.yellow { --stat-color: rgba(251, 191, 36, 0.6); border-color: rgba(251, 191, 36, 0.25); }
                .rules-stat-card.green { --stat-color: rgba(34, 197, 94, 0.6); border-color: rgba(34, 197, 94, 0.25); }
                .rules-stat-card.sky { --stat-color: rgba(56, 189, 248, 0.6); border-color: rgba(56, 189, 248, 0.25); }
                .rules-stat-card.orange { --stat-color: rgba(251, 146, 60, 0.6); border-color: rgba(251, 146, 60, 0.25); }

                .rules-stat-icon {
                    font-size: 1.25rem;
                    margin-bottom: 4px;
                }

                .rules-stat-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.6rem;
                    color: #64748b;
                    margin-bottom: 2px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .rules-stat-value {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1rem;
                    font-weight: 700;
                }

                .rules-stat-value.yellow { color: #fbbf24; }
                .rules-stat-value.green { color: #4ade80; }
                .rules-stat-value.sky { color: #38bdf8; }
                .rules-stat-value.orange { color: #fb923c; }

                /* Accordion Sections */
                .rules-sections {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .rules-accordion {
                    background: linear-gradient(145deg, rgba(30, 27, 75, 0.6) 0%, rgba(20, 18, 50, 0.8) 100%);
                    border: 1px solid rgba(148, 163, 184, 0.15);
                    border-radius: 16px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .rules-accordion:hover {
                    border-color: rgba(148, 163, 184, 0.25);
                }

                .rules-accordion.expanded {
                    border-color: var(--section-color, rgba(148, 163, 184, 0.3));
                }

                .rules-accordion.yellow { --section-color: rgba(251, 191, 36, 0.4); }
                .rules-accordion.sky { --section-color: rgba(56, 189, 248, 0.4); }
                .rules-accordion.green { --section-color: rgba(34, 197, 94, 0.4); }
                .rules-accordion.orange { --section-color: rgba(251, 146, 60, 0.4); }
                .rules-accordion.amber { --section-color: rgba(245, 158, 11, 0.4); }
                .rules-accordion.purple { --section-color: rgba(168, 85, 247, 0.4); }

                .rules-accordion-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    cursor: pointer;
                    transition: background 0.2s ease;
                    -webkit-tap-highlight-color: transparent;
                }

                .rules-accordion-header:hover {
                    background: rgba(255, 255, 255, 0.03);
                }

                .rules-accordion-header:active {
                    background: rgba(255, 255, 255, 0.05);
                }

                .rules-accordion-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .rules-accordion-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    background: var(--icon-bg, rgba(148, 163, 184, 0.15));
                }

                .rules-accordion.yellow .rules-accordion-icon { --icon-bg: rgba(251, 191, 36, 0.2); }
                .rules-accordion.sky .rules-accordion-icon { --icon-bg: rgba(56, 189, 248, 0.2); }
                .rules-accordion.green .rules-accordion-icon { --icon-bg: rgba(34, 197, 94, 0.2); }
                .rules-accordion.orange .rules-accordion-icon { --icon-bg: rgba(251, 146, 60, 0.2); }
                .rules-accordion.amber .rules-accordion-icon { --icon-bg: rgba(245, 158, 11, 0.2); }
                .rules-accordion.purple .rules-accordion-icon { --icon-bg: rgba(168, 85, 247, 0.2); }

                .rules-accordion-info h3 {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.95rem;
                    font-weight: 600;
                    margin-bottom: 2px;
                }

                .rules-accordion.yellow .rules-accordion-info h3 { color: #fbbf24; }
                .rules-accordion.sky .rules-accordion-info h3 { color: #38bdf8; }
                .rules-accordion.green .rules-accordion-info h3 { color: #4ade80; }
                .rules-accordion.orange .rules-accordion-info h3 { color: #fb923c; }
                .rules-accordion.amber .rules-accordion-info h3 { color: #f59e0b; }
                .rules-accordion.purple .rules-accordion-info h3 { color: #a855f7; }

                .rules-accordion-info p {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #64748b;
                }

                .rules-accordion-arrow {
                    font-size: 0.75rem;
                    color: #64748b;
                    transition: transform 0.3s ease;
                }

                .rules-accordion.expanded .rules-accordion-arrow {
                    transform: rotate(180deg);
                }

                .rules-accordion-content {
                    display: none;
                    padding: 0 16px 16px;
                    border-top: 1px solid rgba(148, 163, 184, 0.1);
                    background: rgba(15, 23, 42, 0.3);
                    animation: rules-content-in 0.3s ease;
                }

                @keyframes rules-content-in {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .rules-accordion.expanded .rules-accordion-content {
                    display: block;
                }

                /* Content Elements */
                .rules-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 0;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    color: #cbd5e1;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.08);
                }

                .rules-item:last-child {
                    border-bottom: none;
                }

                .rules-item-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    background: rgba(51, 65, 85, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    flex-shrink: 0;
                }

                .rules-item strong {
                    color: #f1f5f9;
                    font-weight: 600;
                }

                /* Role Badges */
                .rules-roles {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    padding-top: 12px;
                }

                .rules-role-badge {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .rules-role-badge.blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
                .rules-role-badge.green { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
                .rules-role-badge.yellow { background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); }
                .rules-role-badge.red { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

                /* Type Advantage Box */
                .rules-type-box {
                    background: rgba(15, 23, 42, 0.6);
                    border-radius: 10px;
                    padding: 12px;
                    margin-top: 12px;
                }

                .rules-type-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-bottom: 8px;
                }

                .rules-type-chain {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .rules-type-chain .red { color: #f87171; }
                .rules-type-chain .blue { color: #60a5fa; }
                .rules-type-chain .yellow { color: #facc15; }
                .rules-type-chain .arrow { color: #475569; font-size: 0.7rem; }

                /* Level Grid */
                .rules-level-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 6px;
                    margin-top: 10px;
                }

                .rules-level-item {
                    background: rgba(30, 27, 75, 0.5);
                    border-radius: 8px;
                    padding: 8px 4px;
                    text-align: center;
                }

                .rules-level-item.gold {
                    background: linear-gradient(145deg, rgba(234, 179, 8, 0.15) 0%, rgba(180, 83, 9, 0.1) 100%);
                    border: 1px solid rgba(234, 179, 8, 0.3);
                }

                .rules-level-range {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.6rem;
                    color: #64748b;
                }

                .rules-level-item.gold .rules-level-range {
                    color: #fbbf24;
                }

                .rules-level-bonus {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #94a3b8;
                }

                .rules-level-item.gold .rules-level-bonus {
                    color: #fbbf24;
                }

                /* Phase Flow */
                .rules-phase-flow {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 12px;
                }

                .rules-phase-item {
                    flex: 1;
                    text-align: center;
                    padding: 12px 6px;
                    border-radius: 10px;
                }

                .rules-phase-item.cyan { background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); }
                .rules-phase-item.orange { background: rgba(251, 146, 60, 0.15); border: 1px solid rgba(251, 146, 60, 0.3); }
                .rules-phase-item.red { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); }

                .rules-phase-icon {
                    font-size: 1.1rem;
                    margin-bottom: 4px;
                }

                .rules-phase-name {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.65rem;
                    font-weight: 600;
                }

                .rules-phase-item.cyan .rules-phase-name { color: #22d3ee; }
                .rules-phase-item.orange .rules-phase-name { color: #fb923c; }
                .rules-phase-item.red .rules-phase-name { color: #f87171; }

                .rules-phase-arrow {
                    color: #475569;
                    font-size: 0.8rem;
                }

                /* Forma Scale */
                .rules-forma-scale {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    margin: 12px 0;
                }

                .rules-forma-item {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 6px 10px;
                    border-radius: 6px;
                }

                .rules-forma-item.neg-3 { background: rgba(239, 68, 68, 0.3); color: #f87171; }
                .rules-forma-item.neg-2 { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
                .rules-forma-item.neg-1 { background: rgba(239, 68, 68, 0.1); color: #fecaca; }
                .rules-forma-item.zero { background: rgba(71, 85, 105, 0.4); color: #94a3b8; }
                .rules-forma-item.pos-1 { background: rgba(34, 197, 94, 0.1); color: #86efac; }
                .rules-forma-item.pos-2 { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
                .rules-forma-item.pos-3 { background: rgba(34, 197, 94, 0.3); color: #22c55e; }

                .rules-forma-effects {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .rules-forma-effect {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.75rem;
                }

                .rules-forma-effect.green { background: rgba(34, 197, 94, 0.1); }
                .rules-forma-effect.red { background: rgba(239, 68, 68, 0.1); }
                .rules-forma-effect.purple { background: rgba(168, 85, 247, 0.1); }

                .rules-forma-effect-label { color: #cbd5e1; }
                .rules-forma-effect-value { font-weight: 600; }
                .rules-forma-effect.green .rules-forma-effect-value { color: #4ade80; }
                .rules-forma-effect.red .rules-forma-effect-value { color: #f87171; }
                .rules-forma-effect.purple .rules-forma-effect-value { color: #a855f7; }

                /* Currency Cards */
                .rules-currency-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-top: 10px;
                }

                .rules-currency-card {
                    padding: 14px;
                    border-radius: 12px;
                }

                .rules-currency-card.cs {
                    background: rgba(30, 27, 75, 0.6);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                }

                .rules-currency-card.css {
                    background: linear-gradient(145deg, rgba(245, 158, 11, 0.1) 0%, rgba(180, 83, 9, 0.05) 100%);
                    border: 1px solid rgba(245, 158, 11, 0.3);
                }

                .rules-currency-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 6px;
                }

                .rules-currency-icon {
                    font-size: 1.25rem;
                }

                .rules-currency-name {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 700;
                }

                .rules-currency-card.cs .rules-currency-name { color: #f1f5f9; }
                .rules-currency-card.css .rules-currency-name { color: #f59e0b; }

                .rules-currency-desc {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #64748b;
                    line-height: 1.4;
                }

                .rules-currency-card.css .rules-currency-desc { color: #fbbf24; opacity: 0.8; }

                /* Competition Cards */
                .rules-competitions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 10px;
                }

                .rules-competition {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 10px;
                }

                .rules-competition.emerald { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); }
                .rules-competition.purple { background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.25); }
                .rules-competition.yellow { background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.25); }

                .rules-competition-icon {
                    font-size: 1.25rem;
                    flex-shrink: 0;
                }

                .rules-competition-name {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.85rem;
                    font-weight: 600;
                    margin-bottom: 3px;
                }

                .rules-competition.emerald .rules-competition-name { color: #34d399; }
                .rules-competition.purple .rules-competition-name { color: #c084fc; }
                .rules-competition.yellow .rules-competition-name { color: #fbbf24; }

                .rules-competition-desc {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #94a3b8;
                    line-height: 1.4;
                }

                /* Info Box */
                .rules-info-box {
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 10px;
                    padding: 12px;
                    margin-top: 12px;
                }

                .rules-info-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-bottom: 6px;
                }

                .rules-info-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .rules-info-tag {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.65rem;
                    padding: 4px 8px;
                    border-radius: 6px;
                    background: rgba(51, 65, 85, 0.5);
                    color: #cbd5e1;
                }

                /* Occasions Box */
                .rules-occasions-box {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 10px;
                    margin-bottom: 12px;
                }

                .rules-occasions-label {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    color: #94a3b8;
                }

                .rules-occasions-value {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1rem;
                    font-weight: 700;
                    color: #f1f5f9;
                }

                .rules-occasions-sub {
                    font-size: 0.7rem;
                    color: #64748b;
                    font-weight: 400;
                }

                .rules-hint {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.7rem;
                    color: #64748b;
                    text-align: center;
                    margin-top: 10px;
                }

                /* Mobile Responsive */
                @media (max-width: 380px) {
                    .rules-container { padding: 12px 8px; }
                    .rules-header { padding: 12px; }
                    .rules-header-title { font-size: 1.25rem; }
                    .rules-header-btn { padding: 8px 12px; font-size: 0.75rem; }
                    .rules-stats-grid { gap: 6px; }
                    .rules-stat-card { padding: 10px 4px; }
                    .rules-stat-icon { font-size: 1rem; }
                    .rules-stat-value { font-size: 0.9rem; }
                    .rules-accordion-header { padding: 12px; }
                    .rules-accordion-icon { width: 32px; height: 32px; font-size: 1rem; }
                    .rules-accordion-info h3 { font-size: 0.85rem; }
                    .rules-level-grid { grid-template-columns: repeat(4, 1fr); }
                }
            </style>
        `;
    },

    /**
     * Render principale
     */
    render(container) {
        container.innerHTML = `
            ${this.getStyles()}
            <div class="rules-container">
                <!-- Header -->
                <div class="rules-header">
                    <div class="rules-header-left">
                        <span class="rules-header-icon">📖</span>
                        <span class="rules-header-title">Regolamento</span>
                    </div>
                    <button class="rules-header-btn" onclick="if(window.AbilitiesUI?.open) window.AbilitiesUI.open();">
                        <span>📔</span> Abilita
                    </button>
                </div>

                <!-- Quick Stats -->
                <div class="rules-stats-grid">
                    <div class="rules-stat-card yellow">
                        <div class="rules-stat-icon">⚽</div>
                        <div class="rules-stat-label">Rosa</div>
                        <div class="rules-stat-value yellow">15+1</div>
                    </div>
                    <div class="rules-stat-card green">
                        <div class="rules-stat-icon">🎮</div>
                        <div class="rules-stat-label">Occasioni</div>
                        <div class="rules-stat-value green">50</div>
                    </div>
                    <div class="rules-stat-card sky">
                        <div class="rules-stat-icon">📊</div>
                        <div class="rules-stat-label">Lv Max</div>
                        <div class="rules-stat-value sky">30</div>
                    </div>
                    <div class="rules-stat-card orange">
                        <div class="rules-stat-icon">💪</div>
                        <div class="rules-stat-label">Forma</div>
                        <div class="rules-stat-value orange">±3</div>
                    </div>
                </div>

                <!-- Accordion Sections -->
                <div class="rules-sections">
                    ${this.renderSquadraSection()}
                    ${this.renderLivelliSection()}
                    ${this.renderPartitaSection()}
                    ${this.renderFormaSection()}
                    ${this.renderValuteSection()}
                    ${this.renderCompetizioniSection()}
                </div>
            </div>
        `;

        // Attach accordion listeners
        container.querySelectorAll('.rules-accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const accordion = header.closest('.rules-accordion');
                const isExpanded = accordion.classList.contains('expanded');

                // Close all others
                container.querySelectorAll('.rules-accordion').forEach(acc => {
                    acc.classList.remove('expanded');
                });

                // Toggle current
                if (!isExpanded) {
                    accordion.classList.add('expanded');
                }
            });
        });
    },

    renderSquadraSection() {
        return `
            <div class="rules-accordion yellow">
                <div class="rules-accordion-header">
                    <div class="rules-accordion-left">
                        <div class="rules-accordion-icon">⚽</div>
                        <div class="rules-accordion-info">
                            <h3>La Squadra</h3>
                            <p>Rosa, formazioni, ruoli</p>
                        </div>
                    </div>
                    <span class="rules-accordion-arrow">▼</span>
                </div>
                <div class="rules-accordion-content">
                    <div class="rules-item">
                        <span class="rules-item-icon">👥</span>
                        <span><strong>15 giocatori</strong> + 1 Icona capitano</span>
                    </div>
                    <div class="rules-item">
                        <span class="rules-item-icon">📋</span>
                        <span><strong>5 titolari</strong> + 3 in panchina</span>
                    </div>
                    <div class="rules-item">
                        <span class="rules-item-icon">⚙️</span>
                        <span>Moduli: <strong>1-2-2, 1-1-2-1, 1-3-1, 1-1-3</strong></span>
                    </div>

                    <div class="rules-roles">
                        <span class="rules-role-badge blue">🧤 P Portiere</span>
                        <span class="rules-role-badge green">🛡️ D Difensore</span>
                        <span class="rules-role-badge yellow">⚙️ C Centrocampista</span>
                        <span class="rules-role-badge red">⚡ A Attaccante</span>
                    </div>

                    <div class="rules-type-box">
                        <div class="rules-type-label">Tipologie (vantaggio carta):</div>
                        <div class="rules-type-chain">
                            <span class="red">Potenza</span>
                            <span class="arrow">></span>
                            <span class="blue">Tecnica</span>
                            <span class="arrow">></span>
                            <span class="yellow">Velocita</span>
                            <span class="arrow">></span>
                            <span class="red">Potenza</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderLivelliSection() {
        return `
            <div class="rules-accordion sky">
                <div class="rules-accordion-header">
                    <div class="rules-accordion-left">
                        <div class="rules-accordion-icon">📊</div>
                        <div class="rules-accordion-info">
                            <h3>Livelli</h3>
                            <p>Modificatori e bonus</p>
                        </div>
                    </div>
                    <span class="rules-accordion-arrow">▼</span>
                </div>
                <div class="rules-accordion-content">
                    <div class="rules-type-label" style="padding-top: 12px;">Bonus ai tiri in base al livello:</div>
                    <div class="rules-level-grid">
                        <div class="rules-level-item">
                            <div class="rules-level-range">1-4</div>
                            <div class="rules-level-bonus">+0.5</div>
                        </div>
                        <div class="rules-level-item">
                            <div class="rules-level-range">5-8</div>
                            <div class="rules-level-bonus">+1.5</div>
                        </div>
                        <div class="rules-level-item">
                            <div class="rules-level-range">9-12</div>
                            <div class="rules-level-bonus">+2.5</div>
                        </div>
                        <div class="rules-level-item">
                            <div class="rules-level-range">13-16</div>
                            <div class="rules-level-bonus">+3.5</div>
                        </div>
                        <div class="rules-level-item">
                            <div class="rules-level-range">17-20</div>
                            <div class="rules-level-bonus">+4.5</div>
                        </div>
                        <div class="rules-level-item">
                            <div class="rules-level-range">21-24</div>
                            <div class="rules-level-bonus">+5.5</div>
                        </div>
                        <div class="rules-level-item">
                            <div class="rules-level-range">25-28</div>
                            <div class="rules-level-bonus">+6.5</div>
                        </div>
                        <div class="rules-level-item gold">
                            <div class="rules-level-range">29</div>
                            <div class="rules-level-bonus">+8.0</div>
                        </div>
                        <div class="rules-level-item gold" style="grid-column: span 2;">
                            <div class="rules-level-range">30 MAX</div>
                            <div class="rules-level-bonus">+9.0</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderPartitaSection() {
        return `
            <div class="rules-accordion green">
                <div class="rules-accordion-header">
                    <div class="rules-accordion-left">
                        <div class="rules-accordion-icon">🎮</div>
                        <div class="rules-accordion-info">
                            <h3>La Partita</h3>
                            <p>Fasi e meccaniche</p>
                        </div>
                    </div>
                    <span class="rules-accordion-arrow">▼</span>
                </div>
                <div class="rules-accordion-content">
                    <div class="rules-occasions-box">
                        <span class="rules-occasions-label">Occasioni totali:</span>
                        <span class="rules-occasions-value">50 <span class="rules-occasions-sub">(25 per squadra)</span></span>
                    </div>

                    <div class="rules-type-label">Le 3 fasi di ogni azione:</div>
                    <div class="rules-phase-flow">
                        <div class="rules-phase-item cyan">
                            <div class="rules-phase-icon">🏗️</div>
                            <div class="rules-phase-name">Costruzione</div>
                        </div>
                        <span class="rules-phase-arrow">→</span>
                        <div class="rules-phase-item orange">
                            <div class="rules-phase-icon">⚡</div>
                            <div class="rules-phase-name">Attacco</div>
                        </div>
                        <span class="rules-phase-arrow">→</span>
                        <div class="rules-phase-item red">
                            <div class="rules-phase-icon">🎯</div>
                            <div class="rules-phase-name">Tiro</div>
                        </div>
                    </div>
                    <p class="rules-hint">Le abilita si attivano automaticamente in base alla fase</p>
                </div>
            </div>
        `;
    },

    renderFormaSection() {
        return `
            <div class="rules-accordion orange">
                <div class="rules-accordion-header">
                    <div class="rules-accordion-left">
                        <div class="rules-accordion-icon">💪</div>
                        <div class="rules-accordion-info">
                            <h3>Forma</h3>
                            <p>Bonus/malus dinamici</p>
                        </div>
                    </div>
                    <span class="rules-accordion-arrow">▼</span>
                </div>
                <div class="rules-accordion-content">
                    <div class="rules-forma-scale">
                        <span class="rules-forma-item neg-3">-3</span>
                        <span class="rules-forma-item neg-2">-2</span>
                        <span class="rules-forma-item neg-1">-1</span>
                        <span class="rules-forma-item zero">0</span>
                        <span class="rules-forma-item pos-1">+1</span>
                        <span class="rules-forma-item pos-2">+2</span>
                        <span class="rules-forma-item pos-3">+3</span>
                    </div>

                    <div class="rules-forma-effects">
                        <div class="rules-forma-effect green">
                            <span class="rules-forma-effect-label">Gol / Assist / Clean sheet</span>
                            <span class="rules-forma-effect-value">+1</span>
                        </div>
                        <div class="rules-forma-effect red">
                            <span class="rules-forma-effect-label">Panchina consecutiva</span>
                            <span class="rules-forma-effect-value">-1 (prob.)</span>
                        </div>
                        <div class="rules-forma-effect purple">
                            <span class="rules-forma-effect-label">Evento random post-partita</span>
                            <span class="rules-forma-effect-value">±1 (20%)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderValuteSection() {
        return `
            <div class="rules-accordion amber">
                <div class="rules-accordion-header">
                    <div class="rules-accordion-left">
                        <div class="rules-accordion-icon">💰</div>
                        <div class="rules-accordion-info">
                            <h3>Valute</h3>
                            <p>CS e CSS</p>
                        </div>
                    </div>
                    <span class="rules-accordion-arrow">▼</span>
                </div>
                <div class="rules-accordion-content">
                    <div class="rules-currency-grid">
                        <div class="rules-currency-card cs">
                            <div class="rules-currency-header">
                                <span class="rules-currency-icon">🪙</span>
                                <span class="rules-currency-name">CS</span>
                            </div>
                            <div class="rules-currency-desc">Crediti Standard per acquisti e mercato</div>
                        </div>
                        <div class="rules-currency-card css">
                            <div class="rules-currency-header">
                                <span class="rules-currency-icon">💎</span>
                                <span class="rules-currency-name">CSS</span>
                            </div>
                            <div class="rules-currency-desc">Crediti Premium per potenziamenti</div>
                        </div>
                    </div>

                    <div class="rules-info-box">
                        <div class="rules-info-label">Come ottenerle:</div>
                        <div class="rules-info-tags">
                            <span class="rules-info-tag">Vittorie</span>
                            <span class="rules-info-tag">Trofei</span>
                            <span class="rules-info-tag">Stagioni</span>
                            <span class="rules-info-tag">Eventi</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderCompetizioniSection() {
        return `
            <div class="rules-accordion purple">
                <div class="rules-accordion-header">
                    <div class="rules-accordion-left">
                        <div class="rules-accordion-icon">🏆</div>
                        <div class="rules-accordion-info">
                            <h3>Competizioni</h3>
                            <p>Campionato, Coppa, Supercoppa</p>
                        </div>
                    </div>
                    <span class="rules-accordion-arrow">▼</span>
                </div>
                <div class="rules-accordion-content">
                    <div class="rules-competitions">
                        <div class="rules-competition emerald">
                            <span class="rules-competition-icon">🏟️</span>
                            <div>
                                <div class="rules-competition-name">SerieSeriA</div>
                                <div class="rules-competition-desc">Girone unico, tutti contro tutti. Vince chi ha piu punti.</div>
                            </div>
                        </div>
                        <div class="rules-competition purple">
                            <span class="rules-competition-icon">🏆</span>
                            <div>
                                <div class="rules-competition-name">CoppaSeriA</div>
                                <div class="rules-competition-desc">Eliminazione diretta con andata/ritorno o partita secca.</div>
                            </div>
                        </div>
                        <div class="rules-competition yellow">
                            <span class="rules-competition-icon">⭐</span>
                            <div>
                                <div class="rules-competition-name">Supercoppa</div>
                                <div class="rules-competition-desc">Sfida secca tra Campione e Vincitore della Coppa.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Auto-inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    // Delay per assicurarsi che tab-rules esista
    setTimeout(() => {
        window.RulesTabUI.init();
    }, 100);
});

console.log("Modulo RulesTabUI caricato (Premium Mobile-First Design).");
