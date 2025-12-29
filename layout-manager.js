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
        'login-box': 'full',
        'coach-selection-box': 'auth',
        'captain-selection-box': 'auth',

        // Dashboard e contenuti principali
        'app-content': 'full',
        'draft-content': 'full',
        'leaderboard-content': 'full',
        'schedule-content': 'full',
        'user-campionato-content': 'full',
        'user-coppa-content': 'full',
        'user-coppa-quasi-content': 'full',
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

        // Aggiorna i tab auth-required all'avvio
        this.updateAuthRequiredTabs();

        // Mostra la tab bar se siamo in login-box all'avvio
        const loginBox = document.getElementById('login-box');
        if (loginBox && !loginBox.classList.contains('hidden')) {
            this.setTabBarVisibility(true);
        }

        // Previene la visualizzazione accidentale del login-box durante lo scroll
        this.setupScrollProtection();

        this.initialized = true;
        console.log('[LayoutManager] Inizializzato con', Object.keys(this.screenLayouts).length, 'schermate registrate');
    },

    /**
     * Protegge il login-box dalla visualizzazione accidentale durante lo scroll
     */
    setupScrollProtection() {
        const loginBox = document.getElementById('login-box');
        if (!loginBox) return;

        // Funzione per verificare e nascondere login-box se necessario
        const ensureLoginBoxHidden = () => {
            const isLoggedIn = this.isUserLoggedIn();
            const currentScreen = this.currentScreen;

            // Se l'utente e' loggato e siamo in una schermata diversa da login-box,
            // assicuriamo che login-box sia nascosto
            if (isLoggedIn && currentScreen !== 'login-box') {
                if (!loginBox.classList.contains('hidden') || !loginBox.classList.contains('hidden-on-load')) {
                    loginBox.classList.add('hidden', 'hidden-on-load');
                }
            }
        };

        // Controlla periodicamente (ogni 500ms) per sicurezza
        // Salva l'interval ID per eventuale cleanup
        this._scrollProtectionInterval = setInterval(ensureLoginBoxHidden, 500);

        // Controlla anche su scroll e touchmove
        let scrollTimeout;
        const onScroll = () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(ensureLoginBoxHidden, 100);
        };

        document.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('touchmove', onScroll, { passive: true });
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
        // Mostra la tab bar se il layout lo richiede E (utente loggato OPPURE siamo in login-box OPPURE app-content per regole pubbliche)
        const showTabBar = layout.showTabBar && (this.isUserLoggedIn() || screenId === 'login-box' || screenId === 'app-content');
        this.setTabBarVisibility(showTabBar);

        // Mostra/nascondi i tab che richiedono autenticazione
        this.updateAuthRequiredTabs();

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

    /**
     * Aggiorna la visibilita dei tab che richiedono autenticazione
     */
    updateAuthRequiredTabs() {
        const isLoggedIn = this.isUserLoggedIn();
        const isAdmin = this.isAdminUser();

        // Mostra/nascondi i tab con classe auth-required
        document.querySelectorAll('.dashboard-tab.auth-required').forEach(tab => {
            if (isLoggedIn) {
                // Se loggato, mostra i tab (tranne admin che ha logica separata)
                if (tab.id !== 'dashboard-tab-admin') {
                    tab.classList.remove('hidden');
                }
            } else {
                // Se non loggato, nascondi i tab
                tab.classList.add('hidden');
            }
        });

        // Gestione speciale per tab admin
        const adminTab = document.getElementById('dashboard-tab-admin');
        if (adminTab) {
            if (isLoggedIn && isAdmin) {
                adminTab.classList.remove('hidden');
            } else {
                adminTab.classList.add('hidden');
            }
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
    },

    // ================================================================
    // THEMING - Colori dinamici
    // ================================================================

    /**
     * Colore primario corrente
     */
    currentPrimaryColor: '#22c55e',

    /**
     * Selettori per elementi che devono usare il colore primario
     */
    themedSelectors: {
        // Bottoni con sfondo colorato (gradiente)
        primaryButtons: [
            '#risorse-pacchetti',
            '#next-match-schedina-btn',
            '#btn-gestione-rosa',
            '#btn-gestione-formazione',
            '#btn-stadium',
            '#btn-hall-of-fame',
            '#btn-user-campionato',
            '#btn-user-coppa',
            '#btn-user-coppa-quasi',
            '#btn-user-supercoppa',
            '#btn-challenge',
            '#btn-private-leagues',
            '#btn-draft-utente',
            '#btn-mercato-utente',
            '#btn-trades'
        ],
        // Box con bordo colorato
        themedBoxes: [
            '#team-name-box',
            '#sponsor-media-box',
            '#next-match-inline-box',
            '#schedina-box',
            '#gestione-box',
            '#competizioni-box',
            '#draft-scambi-box',
            '#private-leagues-box',
            '#risorse-box',
            '#last-match-box'
        ],
        // Testi con colore primario
        themedTexts: [
            '#team-dashboard-title',
            '.team-color-text'
        ]
    },

    /**
     * Imposta il colore primario e applica a tutti gli elementi
     * @param {string} color - Colore hex
     */
    setPrimaryColor(color) {
        if (!color) return;

        this.currentPrimaryColor = color;

        // Calcola varianti colore
        const lighterColor = this.lightenColor(color, 15);
        const darkerColor = this.darkenColor(color, 15);

        // Salva come CSS variable per uso globale
        document.documentElement.style.setProperty('--team-primary-color', color);
        document.documentElement.style.setProperty('--team-primary-light', lighterColor);
        document.documentElement.style.setProperty('--team-primary-dark', darkerColor);

        // Applica ai bottoni primari
        this.applyButtonTheme(color, lighterColor, darkerColor);

        // Applica ai box
        this.applyBoxTheme(color);

        // Applica ai testi
        this.applyTextTheme(color, lighterColor, darkerColor);

        console.log('[LayoutManager] Colore primario applicato:', color);
    },

    /**
     * Applica il tema ai bottoni
     */
    applyButtonTheme(color, lighterColor, darkerColor) {
        // Bottoni con gradiente
        this.themedSelectors.primaryButtons.forEach(selector => {
            const btn = document.querySelector(selector);
            if (btn) {
                btn.style.background = `linear-gradient(to right, ${color}, ${darkerColor})`;
                btn.onmouseenter = () => {
                    btn.style.background = `linear-gradient(to right, ${lighterColor}, ${color})`;
                };
                btn.onmouseleave = () => {
                    btn.style.background = `linear-gradient(to right, ${color}, ${darkerColor})`;
                };
            }
        });

        // Applica anche a tutti i bottoni con classe .themed-button
        document.querySelectorAll('.themed-button').forEach(btn => {
            btn.style.background = `linear-gradient(to right, ${color}, ${darkerColor})`;
            btn.onmouseenter = () => {
                btn.style.background = `linear-gradient(to right, ${lighterColor}, ${color})`;
            };
            btn.onmouseleave = () => {
                btn.style.background = `linear-gradient(to right, ${color}, ${darkerColor})`;
            };
        });
    },

    /**
     * Applica il tema ai box
     */
    applyBoxTheme(color) {
        this.themedSelectors.themedBoxes.forEach(selector => {
            const box = document.querySelector(selector);
            if (box) {
                box.style.borderColor = color;
            }
        });

        // Applica anche a tutti i box con classe .themed-box
        document.querySelectorAll('.themed-box').forEach(box => {
            box.style.borderColor = color;
        });
    },

    /**
     * Applica il tema ai testi
     */
    applyTextTheme(color, lighterColor, darkerColor) {
        this.themedSelectors.themedTexts.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Per il titolo squadra usa gradiente (ora applica allo span interno)
                if (el.id === 'team-dashboard-title') {
                    const titleText = document.getElementById('team-dashboard-title-text');
                    if (titleText) {
                        titleText.style.background = `linear-gradient(135deg, ${color} 0%, ${darkerColor} 50%, ${lighterColor} 100%)`;
                        titleText.style.webkitBackgroundClip = 'text';
                        titleText.style.backgroundClip = 'text';
                        titleText.style.webkitTextFillColor = 'transparent';
                    } else {
                        el.style.background = `linear-gradient(135deg, ${color} 0%, ${darkerColor} 50%, ${lighterColor} 100%)`;
                        el.style.webkitBackgroundClip = 'text';
                        el.style.backgroundClip = 'text';
                        el.style.webkitTextFillColor = 'transparent';
                    }
                } else {
                    el.style.color = color;
                }
            });
        });

        // Applica anche a tutti gli elementi con classe .team-color-text
        document.querySelectorAll('.team-color-text').forEach(el => {
            el.style.color = color;
        });
    },

    /**
     * Schiarisce un colore hex
     */
    lightenColor(hex, percent) {
        if (!hex || hex.length < 7) return hex;
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    },

    /**
     * Scurisce un colore hex
     */
    darkenColor(hex, percent) {
        if (!hex || hex.length < 7) return hex;
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    },

    /**
     * Converte hex in rgba
     */
    hexToRgba(hex, alpha) {
        if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`;
        const num = parseInt(hex.slice(1), 16);
        const R = (num >> 16) & 0xFF;
        const G = (num >> 8) & 0xFF;
        const B = num & 0xFF;
        return `rgba(${R}, ${G}, ${B}, ${alpha})`;
    },

    /**
     * Ottiene il colore primario corrente
     */
    getPrimaryColor() {
        return this.currentPrimaryColor;
    }
};

// ====================================================================
// AUTO-INIZIALIZZAZIONE
// ====================================================================

// Inizializzazione immediata se DOM gia' pronto, altrimenti attendi
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.LayoutManager.init();
    });
} else {
    // DOM gia' pronto - inizializza subito
    window.LayoutManager.init();
}

// Ascolta cambiamenti del colorpicker per aggiornare il tema
document.addEventListener('DOMContentLoaded', () => {
    const colorPicker = document.getElementById('team-color-picker');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            window.LayoutManager.setPrimaryColor(e.target.value);
        });
    }
});

// Cleanup al logout per prevenire memory leak
document.addEventListener('userLoggedOut', () => {
    if (window.LayoutManager?._scrollProtectionInterval) {
        clearInterval(window.LayoutManager._scrollProtectionInterval);
        window.LayoutManager._scrollProtectionInterval = null;
    }
});

console.log('Modulo layout-manager.js caricato.');
