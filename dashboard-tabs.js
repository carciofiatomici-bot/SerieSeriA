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

        // Listener per il bottone schedina
        const btnSchedina = document.getElementById('btn-schedina');
        if (btnSchedina) {
            btnSchedina.addEventListener('click', () => {
                if (window.SchedinaUI?.openModal) {
                    window.SchedinaUI.openModal();
                } else {
                    console.warn('[DashboardTabs] SchedinaUI non disponibile');
                }
            });
        }

        // Carica il tab salvato o usa 'home' come default
        const savedTab = localStorage.getItem('dashboard_current_tab');
        if (savedTab && ['home', 'squad', 'competitions', 'shop'].includes(savedTab)) {
            this.switchTab(savedTab);
        }

        console.log('[DashboardTabs] Inizializzato');
    },

    /**
     * Cambia il tab attivo
     * @param {string} tabName - Nome del tab: 'home', 'squad', 'competitions', 'shop'
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Salva in localStorage per persistenza
        localStorage.setItem('dashboard_current_tab', tabName);

        // Nascondi tutti i contenuti tab
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Mostra il tab selezionato
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }

        // Aggiorna stili dei bottoni tab (bottom navigation con border-top)
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                // Tab attivo
                tab.classList.add('bg-green-600', 'text-white', 'border-green-400');
                tab.classList.remove('bg-gray-900', 'text-gray-400', 'border-transparent');
            } else {
                // Tab inattivo
                tab.classList.remove('bg-green-600', 'text-white', 'border-green-400');
                tab.classList.add('bg-gray-900', 'text-gray-400', 'border-transparent');
            }
        });

        // Emetti evento per eventuali listener esterni
        document.dispatchEvent(new CustomEvent('dashboardTabChanged', {
            detail: { tab: tabName }
        }));
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
    }
};

// Auto-inizializzazione quando il DOM e pronto
document.addEventListener('DOMContentLoaded', () => {
    // Ritarda l'init per assicurarsi che tutto sia caricato
    setTimeout(() => {
        window.DashboardTabs.init();
    }, 100);
});
