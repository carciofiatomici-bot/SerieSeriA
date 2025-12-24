//
// ====================================================================
// BREADCRUMB.JS - Sistema Navigazione Breadcrumb
// ====================================================================
//

window.Breadcrumb = {
    // Container del breadcrumb
    container: null,

    // Mappa schermate -> info breadcrumb
    screenMap: {
        // Dashboard principale
        'app-content': { label: 'Dashboard', icon: '🏠', parent: null },

        // Tab Dashboard (parent: app-content per tornare alla dashboard)
        'tab-home': { label: 'Board', icon: '📊', parent: null, isTab: true },
        'tab-squad': { label: 'Squadra', icon: '👥', parent: null, isTab: true },
        'tab-competitions': { label: 'Gare', icon: '🏆', parent: null, isTab: true },
        'tab-shop': { label: 'Shop', icon: '🛒', parent: null, isTab: true },
        'tab-rules': { label: 'Regole', icon: '📖', parent: null, isTab: true },

        // Sotto-schermate Gestione Squadra (da tab-squad)
        'squadra-content': { label: 'Gestione Squadra', icon: '👥', parent: 'tab-squad' },
        'stadium-content': { label: 'Stadio', icon: '🏟️', parent: 'tab-squad' },
        'match-history-content': { label: 'Hall of Fame', icon: '🏛️', parent: 'tab-squad' },

        // Sotto-schermate Shop (da tab-shop)
        'draft-content': { label: 'Draft', icon: '📋', parent: 'tab-shop' },
        'mercato-content': { label: 'Mercato', icon: '💰', parent: 'tab-shop' },

        // Sotto-schermate Gare (da tab-competitions)
        'user-campionato-content': { label: 'Campionato', icon: '⚽', parent: 'tab-competitions' },
        'user-coppa-content': { label: 'CoppaSeriA', icon: '🏆', parent: 'tab-competitions' },
        'user-supercoppa-content': { label: 'SuperCoppa', icon: '⭐', parent: 'tab-competitions' },
        'leaderboard-content': { label: 'Classifica', icon: '📊', parent: 'tab-competitions' },
        'schedule-content': { label: 'Calendario', icon: '📅', parent: 'tab-competitions' },

        // Admin
        'admin-content': { label: 'Admin', icon: '🔧', parent: null },
        'player-management-content': { label: 'Gestione Giocatori', icon: '👤', parent: 'admin-content' },
        'team-management-content': { label: 'Gestione Squadre', icon: '👥', parent: 'admin-content' },
        'championship-content': { label: 'Campionato Admin', icon: '🏟️', parent: 'admin-content' }
    },

    // Schermata corrente
    currentScreen: null,

    // Sotto-sezione corrente (opzionale)
    currentSubSection: null,

    /**
     * Inizializza il breadcrumb
     */
    init() {
        // Crea container se non esiste
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'breadcrumb-container';
            this.container.className = 'fixed top-0 left-0 right-0 z-[100] bg-gray-900 bg-opacity-95 border-b border-gray-700 px-4 py-2 hidden';

            // Inserisci dopo il body apre
            document.body.insertBefore(this.container, document.body.firstChild);

            // Aggiungi padding al main per compensare
            this.addMainPadding();
        }

        // Ascolta cambiamenti schermata
        this.observeScreenChanges();
    },

    /**
     * Aggiunge padding al contenuto principale
     */
    addMainPadding() {
        const style = document.createElement('style');
        style.id = 'breadcrumb-style';
        style.textContent = `
            body.has-breadcrumb main {
                padding-top: 48px !important;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Osserva cambiamenti nelle schermate visibili
     */
    observeScreenChanges() {
        // Intercetta showScreen
        const originalShowScreen = window.showScreen;
        if (originalShowScreen) {
            window.showScreen = (element) => {
                originalShowScreen(element);
                if (element && element.id) {
                    this.update(element.id);
                }
            };
        }

        // Ascolta cambiamenti tab della dashboard
        document.addEventListener('dashboardTabChanged', (e) => {
            const tabName = e.detail?.tab;
            if (tabName) {
                const tabId = `tab-${tabName}`;
                // Le tab principali non mostrano breadcrumb
                this.hide();
            }
        });
    },

    /**
     * Aggiorna il breadcrumb
     * @param {string} screenId - ID della schermata corrente
     * @param {string} subSection - Sotto-sezione opzionale
     */
    update(screenId, subSection = null) {
        this.currentScreen = screenId;
        this.currentSubSection = subSection;

        const screenInfo = this.screenMap[screenId];

        // Nascondi se schermata non mappata o login/gate
        if (!screenInfo || screenId === 'login-box' || screenId === 'gate-box') {
            this.hide();
            return;
        }

        // Nascondi per le tab principali (navigazione via tab bar)
        if (screenInfo.isTab) {
            this.hide();
            return;
        }

        // Costruisci il percorso
        const path = this.buildPath(screenId);

        // Se percorso vuoto o solo home, nascondi
        if (path.length <= 1 && !subSection) {
            this.hide();
            return;
        }

        // Aggiungi sotto-sezione se presente
        if (subSection) {
            path.push({ label: subSection, icon: null, id: null });
        }

        // Renderizza
        this.render(path);
        this.show();
    },

    /**
     * Costruisce il percorso breadcrumb
     */
    buildPath(screenId) {
        const path = [];
        let current = screenId;

        while (current) {
            const info = this.screenMap[current];
            if (info) {
                path.unshift({
                    id: current,
                    label: info.label,
                    icon: info.icon
                });
                current = info.parent;
            } else {
                break;
            }
        }

        return path;
    },

    /**
     * Renderizza il breadcrumb
     */
    render(path) {
        if (!this.container) return;

        const items = path.map((item, index) => {
            const isLast = index === path.length - 1;
            const isClickable = !isLast && item.id;

            if (isLast) {
                return `
                    <span class="text-white font-medium flex items-center gap-1">
                        ${item.icon ? `<span>${item.icon}</span>` : ''}
                        ${item.label}
                    </span>
                `;
            }

            return `
                <button class="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                        onclick="window.Breadcrumb.navigateTo('${item.id}')">
                    ${item.icon ? `<span>${item.icon}</span>` : ''}
                    ${item.label}
                </button>
                <span class="text-gray-600 mx-2">/</span>
            `;
        }).join('');

        this.container.innerHTML = `
            <div class="max-w-4xl mx-auto flex items-center text-sm">
                ${items}
            </div>
        `;
    },

    /**
     * Naviga a una schermata specifica
     */
    navigateTo(screenId) {
        const screenInfo = this.screenMap[screenId];

        // Se e' un tab della dashboard, usa DashboardTabs
        if (screenInfo?.isTab && window.DashboardTabs) {
            const tabName = screenId.replace('tab-', '');
            window.DashboardTabs.switchTab(tabName);
            this.hide();
            return;
        }

        const element = document.getElementById(screenId);
        if (element && window.showScreen) {
            window.showScreen(element);

            // Lancia eventi specifici se necessario
            if (screenId === 'app-content') {
                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
            }
        }
    },

    /**
     * Mostra il breadcrumb
     */
    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
            document.body.classList.add('has-breadcrumb');
        }
    },

    /**
     * Nasconde il breadcrumb
     */
    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
            document.body.classList.remove('has-breadcrumb');
        }
    },

    /**
     * Aggiorna sotto-sezione (es. Rosa, Formazione)
     */
    setSubSection(label) {
        if (this.currentScreen) {
            this.update(this.currentScreen, label);
        }
    },

    /**
     * Pulisce sotto-sezione
     */
    clearSubSection() {
        if (this.currentScreen) {
            this.update(this.currentScreen, null);
        }
    },

    /**
     * Registra una nuova schermata
     */
    registerScreen(id, label, icon, parentId = null) {
        this.screenMap[id] = { label, icon, parent: parentId };
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.Breadcrumb.init();
});

console.log("Modulo Breadcrumb caricato.");
