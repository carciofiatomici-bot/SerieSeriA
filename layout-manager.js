//
// ====================================================================
// LAYOUT MANAGER - Sistema di gestione layout centralizzato
// ====================================================================
//
// Gestisce la struttura comune delle pagine (header, footer, tab bar)
// e applica automaticamente stili e comportamenti condivisi.
//

window.LayoutManager = {

    // ================================================================
    // CONFIGURAZIONE LAYOUT
    // ================================================================

    /**
     * Tipi di layout disponibili
     * Ogni layout definisce quali elementi globali sono visibili
     */
    layouts: {
        // Layout completo con tab bar (dashboard e schermate principali)
        'full': {
            showTabBar: true,
            showHeader: true,
            contentClass: 'pb-20', // Padding per tab bar
            requiresAuth: true
        },
        // Layout per schermate di autenticazione (no tab bar)
        'auth': {
            showTabBar: false,
            showHeader: false,
            contentClass: '',
            requiresAuth: false
        },
        // Layout per modali/overlay (no tab bar, no header)
        'modal': {
            showTabBar: false,
            showHeader: false,
            contentClass: '',
            requiresAuth: false
        },
        // Layout admin (tab bar con bottone admin visibile)
        'admin': {
            showTabBar: true,
            showHeader: true,
            contentClass: 'pb-20',
            requiresAuth: true,
            showAdminTab: true
        }
    },

    /**
     * Registro delle schermate con il loro layout associato
     * Chiave: ID elemento, Valore: nome layout
     */
    screenLayouts: {
        // Schermate di autenticazione
        'gate-box': 'auth',
        'login-box': 'auth',
        'coach-selection-box': 'auth',
        'captain-selection-box': 'auth',

        // Dashboard e contenuti principali
        'app-content': 'full',
        'draft-content': 'full',
        'leaderboard-content': 'full',
        'schedule-content': 'full',
        'user-campionato-content': 'full',
        'user-coppa-content': 'full',
        'user-supercoppa-content': 'full',
        'user-championship-content': 'full',
        'squadra-content': 'full',
        'mercato-content': 'full',
        'match-history-content': 'full',
        'stadium-content': 'full',
        'private-leagues-content': 'full',

        // Schermate admin
        'admin-content': 'admin',
        'championship-content': 'admin',
        'player-management-content': 'admin',
        'team-management-content': 'admin',
        'feature-flags-content': 'admin'
    },

    // ================================================================
    // STATO
    // ================================================================

    currentScreen: null,
    previousScreen: null,
    initialized: false,

    // ================================================================
    // INIZIALIZZAZIONE
    // ================================================================

    /**
     * Inizializza il Layout Manager
     * Da chiamare dopo il DOMContentLoaded
     */
    init() {
        if (this.initialized) return;

        // Verifica elementi globali
        this.tabBar = document.getElementById('dashboard-tabs');
        this.adminTab = document.getElementById('dashboard-tab-admin');

        // Applica classi di padding a tutte le schermate registrate
        this.applyInitialClasses();

        // Sovrascrive window.showScreen per integrarsi con il sistema esistente
        this.wrapShowScreen();

        this.initialized = true;
        console.log('[LayoutManager] Inizializzato con', Object.keys(this.screenLayouts).length, 'schermate registrate');
    },

    /**
     * Applica le classi iniziali a tutte le schermate registrate
     */
    applyInitialClasses() {
        for (const [screenId, layoutName] of Object.entries(this.screenLayouts)) {
            const screen = document.getElementById(screenId);
            const layout = this.layouts[layoutName];

            if (screen && layout && layout.contentClass) {
                // Aggiungi classe solo se non presente
                if (!screen.classList.contains(layout.contentClass)) {
                    screen.classList.add(layout.contentClass);
                }
            }
        }
    },

    /**
     * Wrappa la funzione showScreen esistente per aggiungere la logica di layout
     */
    wrapShowScreen() {
        const originalShowScreen = window.showScreen;

        window.showScreen = (elementToShow) => {
            // Chiama la funzione originale
            if (originalShowScreen) {
                originalShowScreen(elementToShow);
            }

            // Applica la logica di layout
            if (elementToShow) {
                this.applyLayout(elementToShow.id || elementToShow);
            }
        };
    },

    // ================================================================
    // GESTIONE LAYOUT
    // ================================================================

    /**
     * Applica il layout appropriato per una schermata
     * @param {string|HTMLElement} screen - ID o elemento della schermata
     */
    applyLayout(screen) {
        const screenId = typeof screen === 'string' ? screen : screen?.id;
        if (!screenId) return;

        // Salva la schermata precedente
        this.previousScreen = this.currentScreen;
        this.currentScreen = screenId;

        // Trova il layout associato (default: 'full' se loggato, 'auth' altrimenti)
        const layoutName = this.screenLayouts[screenId] ||
            (this.isUserLoggedIn() ? 'full' : 'auth');
        const layout = this.layouts[layoutName];

        if (!layout) {
            console.warn('[LayoutManager] Layout non trovato:', layoutName);
            return;
        }

        // Applica visibilita tab bar
        this.setTabBarVisibility(layout.showTabBar && this.isUserLoggedIn());

        // Gestisci tab admin
        if (this.adminTab) {
            if (layout.showAdminTab && this.isAdminUser()) {
                this.adminTab.classList.remove('hidden');
            } else if (!this.isAdminUser()) {
                this.adminTab.classList.add('hidden');
            }
        }

        // Emetti evento per listener esterni
        document.dispatchEvent(new CustomEvent('layoutChanged', {
            detail: {
                screen: screenId,
                layout: layoutName,
                previous: this.previousScreen
            }
        }));
    },

    /**
     * Mostra/nasconde la tab bar
     * @param {boolean} visible
     */
    setTabBarVisibility(visible) {
        if (!this.tabBar) return;

        if (visible) {
            this.tabBar.classList.remove('hidden');
        } else {
            this.tabBar.classList.add('hidden');
        }
    },

    // ================================================================
    // UTILITY
    // ================================================================

    /**
     * Verifica se l'utente e' loggato
     * @returns {boolean}
     */
    isUserLoggedIn() {
        return !!(window.InterfacciaCore?.currentTeamId);
    },

    /**
     * Verifica se l'utente e' admin
     * @returns {boolean}
     */
    isAdminUser() {
        const teamData = window.InterfacciaCore?.currentTeamData;
        const teamName = teamData?.name || teamData?.teamName;
        return window.isTeamAdmin?.(teamName, teamData) || false;
    },

    /**
     * Registra una nuova schermata con il suo layout
     * Utile per schermate aggiunte dinamicamente
     * @param {string} screenId - ID dell'elemento
     * @param {string} layoutName - Nome del layout ('full', 'auth', 'modal', 'admin')
     */
    registerScreen(screenId, layoutName = 'full') {
        if (!this.layouts[layoutName]) {
            console.warn('[LayoutManager] Layout non valido:', layoutName);
            return false;
        }

        this.screenLayouts[screenId] = layoutName;

        // Applica classe se l'elemento esiste
        const screen = document.getElementById(screenId);
        const layout = this.layouts[layoutName];
        if (screen && layout.contentClass) {
            screen.classList.add(layout.contentClass);
        }

        console.log('[LayoutManager] Schermata registrata:', screenId, '->', layoutName);
        return true;
    },

    /**
     * Ottiene il layout di una schermata
     * @param {string} screenId
     * @returns {object|null}
     */
    getScreenLayout(screenId) {
        const layoutName = this.screenLayouts[screenId];
        return layoutName ? this.layouts[layoutName] : null;
    },

    /**
     * Ottiene la schermata corrente
     * @returns {string|null}
     */
    getCurrentScreen() {
        return this.currentScreen;
    },

    /**
     * Torna alla schermata precedente
     */
    goBack() {
        if (this.previousScreen) {
            const prevElement = document.getElementById(this.previousScreen);
            if (prevElement && window.showScreen) {
                window.showScreen(prevElement);
            }
        }
    },

    // ================================================================
    // CLASSI COMUNI
    // ================================================================

    /**
     * Classi Tailwind comuni per i box contenuto
     * Usare queste costanti per garantire consistenza
     */
    commonClasses: {
        // Box contenuto standard
        contentBox: 'p-2 sm:p-3 rounded-lg border border-green-500/50 bg-gray-900/30',

        // Box con bordo colorato dinamico (usa CSS variable)
        coloredBox: 'p-2 sm:p-3 rounded-lg border bg-gray-900/30',

        // Bottone primario
        primaryButton: 'w-full font-extrabold py-3 rounded-lg shadow-xl transition duration-150 transform hover:scale-[1.02]',

        // Bottone secondario
        secondaryButton: 'w-full bg-gray-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-gray-500 transition duration-150 transform hover:scale-[1.02]',

        // Titolo sezione
        sectionTitle: 'text-4xl font-extrabold text-center mb-4 border-b-4 pb-2',

        // Sottotitolo
        subtitle: 'text-center text-lg text-gray-300 mb-6'
    },

    /**
     * Applica le classi comuni a un elemento
     * @param {HTMLElement} element
     * @param {string} classType - Chiave di commonClasses
     */
    applyCommonClasses(element, classType) {
        const classes = this.commonClasses[classType];
        if (element && classes) {
            classes.split(' ').forEach(cls => element.classList.add(cls));
        }
    }
};

// ====================================================================
// AUTO-INIZIALIZZAZIONE
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Ritarda leggermente per assicurarsi che gli altri moduli siano caricati
    setTimeout(() => {
        window.LayoutManager.init();
    }, 50);
});

console.log('Modulo layout-manager.js caricato.');
