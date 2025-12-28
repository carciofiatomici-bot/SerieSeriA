//
// ====================================================================
// DASHBOARD TABS - Gestione navigazione a tab della dashboard
// ====================================================================
//

window.DashboardTabs = {
    currentTab: 'home',

    /**
     * Chiude tutti i modal e overlay aperti
     */
    closeAllModalsAndOverlays() {
        // Chiudi modal per ID comuni
        const modalIds = [
            'lista-squadre-modal',
            'edit-team-modal',
            'abilities-encyclopedia-overlay',
            'player-details-modal',
            'match-replay-modal',
            'figurine-overlay',
            'private-leagues-overlay',
            'achievements-modal',
            'schedina-modal',
            'chat-modal',
            'sfida-tattica-modal',
            'notifications-modal',
            'lista-icone-modal',
            'player-roster-modal',
            'team-roster-modal'
        ];

        modalIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('flex'); // Importante: rimuovi flex che viene usato per mostrare
                el.style.display = '';
            }
        });

        // Chiudi tutti gli elementi con fixed inset-0 (fullscreen overlays)
        document.querySelectorAll('.fixed.inset-0:not(.hidden)').forEach(el => {
            // Non chiudere la tab bar stessa o elementi di sistema
            if (!el.classList.contains('dashboard-tab') &&
                !el.id?.includes('nav-') &&
                !el.id?.includes('tab-bar')) {
                el.classList.add('hidden');
                el.classList.remove('flex');
            }
        });

        // Chiudi modal specifici tramite i loro metodi close se esistono
        if (window.InterfacciaAuth?.hideListaSquadre) window.InterfacciaAuth.hideListaSquadre();
        if (window.InterfacciaAuth?.hideListaIcone) window.InterfacciaAuth.hideListaIcone();
        if (window.AbilitiesEncyclopedia?.close) window.AbilitiesEncyclopedia.close();
        if (window.FigurineUI?.close) window.FigurineUI.close();
        if (window.PrivateLeaguesUI?.closeOverlay) window.PrivateLeaguesUI.closeOverlay();
        if (window.AdminTeams?.closeEditTeamModal) window.AdminTeams.closeEditTeamModal();

        console.log('[DashboardTabs] Chiusi tutti i modal e overlay');
    },

    /**
     * Inizializza i listener per i tab
     */
    init() {
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Rimuovi le classi di colore hardcoded dall'HTML all'init
        this.resetAllTabStyles();

        // Nascondi il bottone regole flottante quando la dashboard e visibile
        this.hideFloatingRulesButton();

        console.log('[DashboardTabs] Inizializzato');
    },

    /**
     * Resetta tutti i tab allo stato inattivo (rimuove classi hardcoded)
     */
    resetAllTabStyles() {
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            // Rimuovi tutte le classi di colore hardcoded
            tab.classList.remove('bg-green-600', 'border-green-400', 'text-white', 'tab-active');
            tab.classList.add('bg-gray-900', 'text-gray-400', 'border-transparent');
            // Rimuovi stili inline
            tab.style.backgroundColor = '';
            tab.style.background = '';
            tab.style.borderTopColor = '';
        });
    },

    /**
     * Ripristina il tab salvato (chiamare dopo il login/rientro sessione)
     * @param {boolean} goToBoard - true per andare a Board, false per ripristinare tab salvato
     */
    restoreSavedTab(goToBoard = true) {
        if (goToBoard) {
            // Vai a Board (home)
            try { localStorage.setItem('dashboard_current_tab', 'home'); } catch (e) {}
            this.switchTab('home');
        } else {
            // Ripristina il tab salvato (usato solo per refresh in-app)
            const savedTab = localStorage.getItem('dashboard_current_tab');
            if (savedTab && ['home', 'squad', 'competitions', 'shop', 'rules'].includes(savedTab)) {
                this.switchTab(savedTab);
            } else {
                // Default a home se non c'e' tab salvato
                this.switchTab('home');
            }
        }
    },

    /**
     * Ripristina il tab salvato per refresh in-app
     * Chiamare quando si rileva un refresh della pagina (non un nuovo accesso)
     */
    restoreTabOnRefresh() {
        const savedTab = localStorage.getItem('dashboard_current_tab');
        if (savedTab && ['home', 'squad', 'competitions', 'shop', 'rules'].includes(savedTab)) {
            this.switchTab(savedTab);
        }
    },

    /**
     * Cambia il tab attivo
     * @param {string} tabName - Nome del tab: 'home', 'squad', 'competitions', 'shop', 'rules', 'admin'
     */
    switchTab(tabName) {
        // Chiudi tutti i modal e overlay aperti prima di cambiare tab
        this.closeAllModalsAndOverlays();

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
                    // Utente loggato: sposta team-name-box nella homepage, nascondi logo Serie SeriA e login box
                    if (normalLoginBox) normalLoginBox.classList.add('hidden');
                    if (loginHeader) loginHeader.classList.add('hidden');
                    if (homeTeamHeader) {
                        homeTeamHeader.classList.remove('hidden');
                        // Sposta il team-name-box dalla dashboard alla homepage
                        this.moveTeamNameBoxToHome();
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

        // Riporta il team-name-box alla dashboard (se era stato spostato nella homepage)
        this.moveTeamNameBoxToDashboard();

        this.currentTab = tabName;

        // Salva in localStorage per persistenza (escludi rules che non ha persistenza)
        if (tabName !== 'rules') {
            try { localStorage.setItem('dashboard_current_tab', tabName); } catch (e) {}
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

        // Gestisci visibilita header dashboard in base a sessione e tab
        const isLoggedIn = !!(window.InterfacciaCore?.currentTeamId);
        const dashboardHeader = document.getElementById('dashboard-fixed-header');
        if (dashboardHeader) {
            if (tabName === 'rules' && !isLoggedIn) {
                // Nascondi header se in Regole senza sessione
                dashboardHeader.classList.add('hidden');
            } else if (isLoggedIn) {
                // Mostra header se c'e' sessione attiva
                dashboardHeader.classList.remove('hidden');
            } else {
                // Senza sessione, nascondi header su tutti i tab tranne quelli pubblici
                dashboardHeader.classList.add('hidden');
            }
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
        // Ottieni il colore team dal color picker (fonte principale)
        const colorPicker = document.getElementById('team-color-picker');
        const teamDataColor = window.InterfacciaCore?.currentTeamData?.primaryColor;

        // Usa il valore del color picker se esiste, altrimenti teamData, altrimenti default
        let teamColor = colorPicker?.value || teamDataColor || '#22c55e';

        this.updateTabStylesWithColor(activeTab, teamColor);
    },

    /**
     * Aggiorna gli stili visivi dei bottoni tab con un colore specifico
     * @param {string} activeTab - Nome del tab attivo
     * @param {string} teamColor - Colore da usare
     */
    updateTabStylesWithColor(activeTab, teamColor) {
        console.log('[DashboardTabs] updateTabStylesWithColor:', activeTab, teamColor);

        // Aggiorna stili dei bottoni tab (bottom navigation con border-top)
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            if (tab.dataset.tab === activeTab) {
                // Tab attivo - usa colore team con !important via cssText
                tab.classList.remove('bg-gray-900', 'bg-green-600', 'text-gray-400', 'border-transparent', 'border-green-400');
                tab.classList.add('text-white', 'tab-active');
                tab.style.cssText = `background-color: ${teamColor} !important; border-top-color: ${this.lightenColor(teamColor, 20)} !important; border-radius: 6px;`;
            } else {
                // Tab inattivo - rimuovi tutte le classi di stato attivo
                tab.classList.remove('text-white', 'tab-active', 'bg-green-600', 'border-green-400');
                tab.classList.add('bg-gray-900', 'text-gray-400', 'border-transparent');
                // Rimuovi stili inline completamente
                tab.style.cssText = '';
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
     * Sposta il team-name-box dalla dashboard alla homepage
     */
    moveTeamNameBoxToHome() {
        const teamNameBox = document.getElementById('team-name-box');
        const homeTeamHeader = document.getElementById('home-team-header');

        if (teamNameBox && homeTeamHeader) {
            // Sposta il box nella homepage
            homeTeamHeader.appendChild(teamNameBox);
        }
    },

    /**
     * Riporta il team-name-box dalla homepage alla dashboard
     */
    moveTeamNameBoxToDashboard() {
        const teamNameBox = document.getElementById('team-name-box');
        const dashboardFixedHeader = document.getElementById('dashboard-fixed-header');

        if (teamNameBox && dashboardFixedHeader) {
            // Riporta il box alla dashboard (come primo figlio)
            dashboardFixedHeader.insertBefore(teamNameBox, dashboardFixedHeader.firstChild);
        }
    },

};

// Auto-inizializzazione quando il DOM e pronto
document.addEventListener('DOMContentLoaded', () => {
    // Ritarda l'init per assicurarsi che tutto sia caricato
    setTimeout(() => {
        window.DashboardTabs.init();
    }, 100);
});
