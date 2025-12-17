//
// ====================================================================
// PULL-TO-REFRESH.JS - Aggiornamento pagina con gesto swipe
// ====================================================================
// Permette di ricaricare la pagina tirando verso il basso dalla cima
//

window.PullToRefresh = {
    // Configurazione
    threshold: 80,           // Pixel da tirare per attivare refresh
    maxPull: 120,            // Massimo pull visivo
    resistance: 2.5,         // Resistenza al pull (piu alto = piu difficile)

    // Stato
    startY: 0,
    currentY: 0,
    isPulling: false,
    isRefreshing: false,

    // Elementi DOM
    indicator: null,
    spinner: null,

    // Chiave sessionStorage per salvare schermata
    SCREEN_KEY: 'pull-refresh-screen',

    /**
     * Inizializza il pull-to-refresh
     */
    init() {
        // Non attivare su desktop
        if (!this.isTouchDevice()) {
            console.log('[PullToRefresh] Non e un dispositivo touch, skip');
            return;
        }

        this.createIndicator();
        this.bindEvents();
        this.restoreScreen();
        console.log('[PullToRefresh] Inizializzato');
    },

    /**
     * Ripristina la schermata salvata dopo un refresh
     */
    restoreScreen() {
        const savedScreen = sessionStorage.getItem(this.SCREEN_KEY);
        if (savedScreen) {
            sessionStorage.removeItem(this.SCREEN_KEY);
            console.log('[PullToRefresh] Ripristino schermata:', savedScreen);

            // Aspetta che l'app sia pronta, poi naviga alla schermata salvata
            setTimeout(() => {
                if (typeof window.showScreen === 'function') {
                    window.showScreen(savedScreen);
                }
            }, 1000);
        }
    },

    /**
     * Trova la schermata attualmente visibile
     */
    getCurrentScreen() {
        // Cerca la schermata visibile (non hidden)
        const screens = document.querySelectorAll('[id$="-screen"]');
        for (const screen of screens) {
            if (!screen.classList.contains('hidden') && screen.offsetParent !== null) {
                return screen.id;
            }
        }
        return 'dashboard-screen'; // Default
    },

    /**
     * Verifica se e un dispositivo touch
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    /**
     * Crea l'indicatore visivo
     */
    createIndicator() {
        // Container indicatore
        this.indicator = document.createElement('div');
        this.indicator.id = 'pull-refresh-indicator';
        this.indicator.className = 'fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center pointer-events-none';
        this.indicator.style.cssText = 'transform: translateY(-100%); transition: none; height: 60px;';

        // Spinner/Icona
        this.spinner = document.createElement('div');
        this.spinner.className = 'flex flex-col items-center';
        this.spinner.innerHTML = `
            <div class="refresh-icon text-2xl transition-transform duration-200">
                <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                    </path>
                </svg>
            </div>
            <span class="refresh-text text-xs text-gray-400 mt-1">Tira per aggiornare</span>
        `;

        this.indicator.appendChild(this.spinner);
        document.body.insertBefore(this.indicator, document.body.firstChild);
    },

    /**
     * Collega gli eventi touch
     */
    bindEvents() {
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    },

    /**
     * Verifica se siamo in cima alla pagina
     */
    isAtTop() {
        return window.scrollY <= 0;
    },

    /**
     * Gestisce inizio touch
     */
    handleTouchStart(e) {
        if (this.isRefreshing) return;

        if (this.isAtTop()) {
            this.startY = e.touches[0].clientY;
            this.isPulling = true;
        }
    },

    /**
     * Gestisce movimento touch
     */
    handleTouchMove(e) {
        if (!this.isPulling || this.isRefreshing) return;
        if (!this.isAtTop()) {
            this.resetPull();
            return;
        }

        this.currentY = e.touches[0].clientY;
        const pullDistance = (this.currentY - this.startY) / this.resistance;

        if (pullDistance > 0) {
            // Previeni scroll normale quando si tira
            e.preventDefault();

            // Limita il pull
            const limitedPull = Math.min(pullDistance, this.maxPull);

            // Aggiorna indicatore
            this.updateIndicator(limitedPull);
        }
    },

    /**
     * Gestisce fine touch
     */
    handleTouchEnd(e) {
        if (!this.isPulling || this.isRefreshing) return;

        const pullDistance = (this.currentY - this.startY) / this.resistance;

        if (pullDistance >= this.threshold) {
            this.triggerRefresh();
        } else {
            this.resetPull();
        }

        this.isPulling = false;
    },

    /**
     * Aggiorna l'indicatore visivo
     */
    updateIndicator(pullDistance) {
        // Trasla l'indicatore
        const translateY = Math.min(pullDistance - 60, 20);
        this.indicator.style.transform = `translateY(${translateY}px)`;

        // Ruota l'icona in base al pull
        const rotation = (pullDistance / this.threshold) * 180;
        const icon = this.spinner.querySelector('.refresh-icon');
        if (icon) {
            icon.style.transform = `rotate(${Math.min(rotation, 180)}deg)`;
        }

        // Aggiorna testo
        const text = this.spinner.querySelector('.refresh-text');
        if (text) {
            if (pullDistance >= this.threshold) {
                text.textContent = 'Rilascia per aggiornare';
                text.className = 'refresh-text text-xs text-green-400 mt-1';
            } else {
                text.textContent = 'Tira per aggiornare';
                text.className = 'refresh-text text-xs text-gray-400 mt-1';
            }
        }
    },

    /**
     * Resetta l'indicatore
     */
    resetPull() {
        this.indicator.style.transition = 'transform 0.3s ease';
        this.indicator.style.transform = 'translateY(-100%)';

        const icon = this.spinner.querySelector('.refresh-icon');
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
        }

        setTimeout(() => {
            this.indicator.style.transition = 'none';
        }, 300);

        this.startY = 0;
        this.currentY = 0;
    },

    /**
     * Attiva il refresh
     */
    triggerRefresh() {
        this.isRefreshing = true;

        // Salva la schermata corrente prima del reload
        const currentScreen = this.getCurrentScreen();
        if (currentScreen && currentScreen !== 'dashboard-screen') {
            sessionStorage.setItem(this.SCREEN_KEY, currentScreen);
            console.log('[PullToRefresh] Salvo schermata:', currentScreen);
        }

        // Mostra spinner di caricamento
        const icon = this.spinner.querySelector('.refresh-icon');
        if (icon) {
            icon.innerHTML = `
                <svg class="w-8 h-8 text-green-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            `;
        }

        const text = this.spinner.querySelector('.refresh-text');
        if (text) {
            text.textContent = 'Aggiornamento...';
            text.className = 'refresh-text text-xs text-green-400 mt-1';
        }

        // Posiziona indicatore visibile
        this.indicator.style.transition = 'transform 0.3s ease';
        this.indicator.style.transform = 'translateY(10px)';

        // Ricarica pagina dopo breve delay per feedback visivo
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
};

// Inizializza quando DOM pronto
document.addEventListener('DOMContentLoaded', () => {
    // Piccolo delay per assicurarsi che tutto sia caricato
    setTimeout(() => {
        window.PullToRefresh.init();
    }, 500);
});

console.log('Modulo pull-to-refresh.js caricato.');
