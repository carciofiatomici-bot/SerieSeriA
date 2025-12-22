//
// ====================================================================
// DASHBOARD TABS - Gestione navigazione a tab della dashboard
// ====================================================================
//

window.DashboardTabs = {
    currentTab: 'home',

    /**
     * Inizializza i listener per i tab
     */
    init() {
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Nascondi il bottone regole flottante quando la dashboard e visibile
        this.hideFloatingRulesButton();

        // Carica il tab salvato o usa 'home' come default
        const savedTab = localStorage.getItem('dashboard_current_tab');
        if (savedTab && ['home', 'squad', 'competitions', 'shop', 'rules'].includes(savedTab)) {
            this.switchTab(savedTab);
        }

        console.log('[DashboardTabs] Inizializzato');
    },

    /**
     * Cambia il tab attivo
     * @param {string} tabName - Nome del tab: 'home', 'squad', 'competitions', 'shop', 'rules', 'admin'
     */
    switchTab(tabName) {
        // Gestione speciale per tab login - porta alla schermata login/home
        if (tabName === 'login') {
            const loginBox = document.getElementById('login-box');
            if (loginBox && window.showScreen) {
                window.showScreen(loginBox);

                // Gestisci header e box in base allo stato di login
                const isLoggedIn = !!(window.InterfacciaCore?.currentTeamId);
                const normalLoginBox = document.getElementById('normal-login-box');
                const loginHeader = document.getElementById('login-header');
                const homeTeamHeader = document.getElementById('home-team-header');
                const homeTeamName = document.getElementById('home-team-name');

                if (isLoggedIn) {
                    // Utente loggato: mostra team-name-box, nascondi logo Serie SeriA e login box
                    if (normalLoginBox) normalLoginBox.classList.add('hidden');
                    if (loginHeader) loginHeader.classList.add('hidden');
                    if (homeTeamHeader) {
                        homeTeamHeader.classList.remove('hidden');
                        // Sincronizza dati dalla dashboard alla homepage
                        this.syncHomeTeamHeader();
                    }
                } else {
                    // Utente non loggato: mostra logo Serie SeriA e login box
                    if (normalLoginBox) normalLoginBox.classList.remove('hidden');
                    if (loginHeader) loginHeader.classList.remove('hidden');
                    if (homeTeamHeader) homeTeamHeader.classList.add('hidden');
                }
            }
            // Aggiorna stili tab per evidenziare "login" come attivo
            this.updateTabStyles('login');
            return;
        }

        // Gestione speciale per tab admin - apre il pannello admin
        if (tabName === 'admin') {
            const adminContent = document.getElementById('admin-content');
            if (adminContent && window.showScreen) {
                // Imposta flag per mostrare "Torna alla Dashboard"
                const currentTeamData = window.InterfacciaCore?.currentTeamData;
                const currentTeamId = window.InterfacciaCore?.currentTeamId;
                const teamName = currentTeamData?.teamName;
                if (teamName && teamName.toLowerCase() !== 'serieseria') {
                    window.adminTeamAccessingPanel = {
                        teamId: currentTeamId,
                        teamName: teamName
                    };
                }
                window.showScreen(adminContent);
                // Trigger evento per inizializzare il pannello admin
                document.dispatchEvent(new CustomEvent('adminLoggedIn'));
            }
            // Aggiorna stili tab per evidenziare "admin" come attivo
            this.updateTabStyles('admin');
            return;
        }

        // Se siamo in una schermata diversa da app-content (es. admin-content),
        // torniamo prima alla dashboard
        const appContent = document.getElementById('app-content');
        if (appContent && appContent.classList.contains('hidden')) {
            window.showScreen(appContent);
        }

        this.currentTab = tabName;

        // Salva in localStorage per persistenza (escludi rules che non ha persistenza)
        if (tabName !== 'rules') {
            localStorage.setItem('dashboard_current_tab', tabName);
        }

        // Nascondi tutti i contenuti tab
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Mostra il tab selezionato
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }

        // Aggiorna stili dei bottoni tab
        this.updateTabStyles(tabName);

        // Emetti evento per eventuali listener esterni
        document.dispatchEvent(new CustomEvent('dashboardTabChanged', {
            detail: { tab: tabName }
        }));
    },

    /**
     * Aggiorna gli stili visivi dei bottoni tab (bottom navigation)
     * @param {string} activeTab - Nome del tab attivo
     */
    updateTabStyles(activeTab) {
        // Ottieni il colore team dal color picker o usa default
        const colorPicker = document.getElementById('team-color-picker');
        const teamColor = colorPicker?.value || window.InterfacciaCore?.currentTeamData?.primaryColor || '#22c55e';

        // Aggiorna stili dei bottoni tab (bottom navigation con border-top)
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            if (tab.dataset.tab === activeTab) {
                // Tab attivo - usa colore team
                tab.classList.remove('bg-gray-900', 'text-gray-400', 'border-transparent');
                tab.classList.add('text-white');
                tab.style.backgroundColor = teamColor;
                tab.style.borderTopColor = this.lightenColor(teamColor, 20);
            } else {
                // Tab inattivo
                tab.classList.remove('text-white');
                tab.classList.add('bg-gray-900', 'text-gray-400', 'border-transparent');
                tab.style.backgroundColor = '';
                tab.style.borderTopColor = '';
            }
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
     * Ritorna al tab home
     */
    goHome() {
        this.switchTab('home');
    },

    /**
     * Ottiene il tab corrente
     * @returns {string}
     */
    getCurrentTab() {
        return this.currentTab;
    },

    /**
     * Nasconde il bottone regole flottante quando la dashboard e attiva
     * (le regole sono accessibili dal tab nella bottom navigation)
     */
    hideFloatingRulesButton() {
        const rulesBtnContainer = document.getElementById('rules-btn-container');
        const rulesMinimizedBtn = document.getElementById('rules-minimized-btn');

        if (rulesBtnContainer) {
            rulesBtnContainer.style.display = 'none';
        }
        if (rulesMinimizedBtn) {
            rulesMinimizedBtn.style.display = 'none';
        }
    },

    /**
     * Mostra il bottone regole flottante (quando si esce dalla dashboard)
     */
    showFloatingRulesButton() {
        const rulesBtnContainer = document.getElementById('rules-btn-container');
        if (rulesBtnContainer) {
            rulesBtnContainer.style.display = 'block';
        }
    },

    /**
     * Sincronizza i dati del team-name-box dalla dashboard alla homepage
     */
    syncHomeTeamHeader() {
        const teamData = window.InterfacciaCore?.currentTeamData;
        if (!teamData) return;

        // Nome squadra
        const homeTeamName = document.getElementById('home-team-name');
        if (homeTeamName) {
            homeTeamName.textContent = teamData.teamName || 'SQUADRA';
        }

        // Colore squadra
        const teamColor = teamData.primaryColor || '#22c55e';
        const homeColorPicker = document.getElementById('home-color-picker');
        if (homeColorPicker) {
            homeColorPicker.value = teamColor;
        }

        // Sincronizza CS e CSS
        const dashboardCS = document.getElementById('risorse-cs');
        const dashboardCSS = document.getElementById('risorse-css');
        const homeCS = document.getElementById('home-risorse-cs');
        const homeCSS = document.getElementById('home-risorse-css');

        if (dashboardCS && homeCS) {
            homeCS.textContent = dashboardCS.textContent;
        }
        if (dashboardCSS && homeCSS) {
            homeCSS.textContent = dashboardCSS.textContent;
        }

        // Sincronizza visibilita bottoni Album, Ruota, Negozio
        const syncButtonVisibility = (dashboardId, homeId) => {
            const dashboardBtn = document.getElementById(dashboardId);
            const homeBtn = document.getElementById(homeId);
            if (dashboardBtn && homeBtn) {
                if (dashboardBtn.classList.contains('hidden')) {
                    homeBtn.classList.add('hidden');
                } else {
                    homeBtn.classList.remove('hidden');
                }
            }
        };

        syncButtonVisibility('risorse-pacchetti', 'home-risorse-pacchetti');
        syncButtonVisibility('risorse-ruota', 'home-risorse-ruota');
        syncButtonVisibility('risorse-negozio', 'home-risorse-negozio');
    },

    /**
     * Inizializza i listener per il menu hamburger della homepage
     */
    initHomeMenuListeners() {
        const homeMenuBtn = document.getElementById('home-menu-btn');
        const homeMenuDropdown = document.getElementById('home-menu-dropdown');

        if (homeMenuBtn && homeMenuDropdown) {
            // Toggle menu
            homeMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                homeMenuDropdown.classList.toggle('hidden');
            });

            // Chiudi menu cliccando fuori
            document.addEventListener('click', () => {
                homeMenuDropdown.classList.add('hidden');
            });
        }

        // Collega i bottoni del menu ai loro equivalenti nella dashboard
        const menuMappings = [
            ['home-menu-tutorial', 'menu-tutorial'],
            ['home-menu-changelog', 'menu-changelog'],
            ['home-menu-password', 'menu-password'],
            ['home-menu-color-picker', 'menu-color-picker'],
            ['home-menu-delete-team', 'menu-delete-team']
        ];

        menuMappings.forEach(([homeId, dashboardId]) => {
            const homeBtn = document.getElementById(homeId);
            const dashboardBtn = document.getElementById(dashboardId);
            if (homeBtn && dashboardBtn) {
                homeBtn.addEventListener('click', () => {
                    homeMenuDropdown?.classList.add('hidden');
                    dashboardBtn.click();
                });
            }
        });

        // Sincronizza color picker della homepage con quello della dashboard
        const homeColorPicker = document.getElementById('home-color-picker');
        const dashboardColorPicker = document.getElementById('team-color-picker');
        if (homeColorPicker && dashboardColorPicker) {
            homeColorPicker.addEventListener('input', (e) => {
                dashboardColorPicker.value = e.target.value;
                dashboardColorPicker.dispatchEvent(new Event('input'));
            });
        }

        // Collega bottoni risorse (Album, Ruota, Negozio)
        const resourceMappings = [
            ['home-risorse-pacchetti', 'risorse-pacchetti'],
            ['home-risorse-ruota', 'risorse-ruota'],
            ['home-risorse-negozio', 'risorse-negozio']
        ];

        resourceMappings.forEach(([homeId, dashboardId]) => {
            const homeBtn = document.getElementById(homeId);
            const dashboardBtn = document.getElementById(dashboardId);
            if (homeBtn && dashboardBtn) {
                homeBtn.addEventListener('click', () => {
                    dashboardBtn.click();
                });
            }
        });
    }
};

// Auto-inizializzazione quando il DOM e pronto
document.addEventListener('DOMContentLoaded', () => {
    // Ritarda l'init per assicurarsi che tutto sia caricato
    setTimeout(() => {
        window.DashboardTabs.init();
        window.DashboardTabs.initHomeMenuListeners();
    }, 100);
});
