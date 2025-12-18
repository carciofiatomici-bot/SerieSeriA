//
// ====================================================================
// PULL-TO-REFRESH.JS - Aggiornamento pagina con gesto swipe
// ====================================================================
// Permette di ricaricare la pagina tirando verso il basso dalla cima
// IMPORTANTE: Si attiva SOLO se l'utente e' gia' in cima alla pagina
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
    wasAtTopOnStart: false,  // NUOVO: traccia se eravamo in cima all'inizio del touch

    // Elementi DOM
    indicator: null,
    spinner: null,

    // Chiavi sessionStorage
    SCREEN_KEY: 'pull-refresh-screen',
    SECTION_KEY: 'pull-refresh-section',

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
        // Leggi da URL hash (es. #team-screen:Gestione%20Rosa)
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#restore:')) return;

        // Pulisci l'hash
        const data = hash.replace('#restore:', '');
        history.replaceState(null, '', window.location.pathname);

        const [savedScreen, savedSection] = data.split(':').map(s => decodeURIComponent(s));
        if (!savedScreen) return;

        console.log('[PullToRefresh] Ripristino da hash:', savedScreen, savedSection);

        // Aspetta che l'app sia completamente pronta
        const tryRestore = (attempts = 0) => {
            if (attempts > 20) {
                console.warn('[PullToRefresh] Impossibile ripristinare schermata dopo 20 tentativi');
                return;
            }

            // Verifica se showScreen esiste e l'utente e' loggato
            if (typeof window.showScreen === 'function' && window.InterfacciaCore?.currentTeamId) {
                console.log('[PullToRefresh] Navigo a:', savedScreen);
                window.showScreen(savedScreen);

                // Se era team-screen, ripristina anche la sezione
                if (savedScreen === 'team-screen' && savedSection) {
                    setTimeout(() => this.restoreTeamSection(savedSection), 800);
                }
            } else {
                // Riprova dopo 300ms
                setTimeout(() => tryRestore(attempts + 1), 300);
            }
        };

        // Primo tentativo dopo 2 secondi
        setTimeout(() => tryRestore(0), 2000);
    },

    /**
     * Ripristina la sezione attiva di team-screen
     */
    restoreTeamSection(section) {
        console.log('[PullToRefresh] Ripristino sezione team:', section);

        const sectionButtons = {
            'Gestione Rosa': 'btn-gestione-rosa',
            'Gestione Formazione': 'btn-gestione-formazione'
        };

        const buttonId = sectionButtons[section];
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                console.log('[PullToRefresh] Click su:', buttonId);
                button.click();
            }
        }
    },

    /**
     * Trova la sezione attiva di team-screen
     */
    getCurrentTeamSection() {
        const titleElement = document.getElementById('squadra-main-title');
        if (titleElement) {
            return titleElement.textContent?.trim() || null;
        }
        return null;
    },

    /**
     * Trova la schermata attualmente visibile
     */
    getCurrentScreen() {
        // Lista delle schermate principali
        const screenIds = [
            'team-screen',
            'mercato-screen',
            'draft-screen',
            'campionato-screen',
            'coppa-screen',
            'admin-screen',
            'supercoppa-screen',
            'private-leagues-screen'
        ];

        // Cerca quale schermata non ha la classe hidden
        for (const id of screenIds) {
            const screen = document.getElementById(id);
            if (screen && !screen.classList.contains('hidden')) {
                return id;
            }
        }

        return null; // Dashboard o nessuna schermata specifica
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
     * Verifica se siamo in cima alla pagina (scroll = 0)
     */
    isAtTop() {
        // Usa Math.round per gestire valori decimali su alcuni browser
        return Math.round(window.scrollY) === 0;
    },

    /**
     * Gestisce inizio touch
     */
    handleTouchStart(e) {
        if (this.isRefreshing) return;

        // Reset stato
        this.isPulling = false;
        this.wasAtTopOnStart = false;
        this.startY = 0;
        this.currentY = 0;

        // IMPORTANTE: Attiva il pull SOLO se siamo GIA' in cima alla pagina
        // Se l'utente sta scorrendo verso l'alto per tornare in cima, non attivare
        if (this.isAtTop()) {
            this.startY = e.touches[0].clientY;
            this.wasAtTopOnStart = true;
            // NON impostiamo isPulling = true qui, lo faremo in touchmove
            // solo se l'utente tira verso il BASSO
        }
    },

    /**
     * Gestisce movimento touch
     */
    handleTouchMove(e) {
        if (this.isRefreshing) return;

        // Se non eravamo in cima all'inizio del touch, ignora completamente
        if (!this.wasAtTopOnStart) return;

        // Se non siamo piu' in cima (l'utente ha scrollato), resetta
        if (!this.isAtTop()) {
            this.resetPull();
            this.wasAtTopOnStart = false;
            return;
        }

        this.currentY = e.touches[0].clientY;
        const deltaY = this.currentY - this.startY;

        // IMPORTANTE: Attiva il pull SOLO se l'utente sta tirando verso il BASSO
        // Se deltaY < 0, l'utente sta cercando di scrollare verso l'alto
        if (deltaY <= 0) {
            if (this.isPulling) {
                this.resetPull();
            }
            return;
        }

        // Ora siamo sicuri che l'utente sta tirando verso il basso dalla cima
        this.isPulling = true;

        const pullDistance = deltaY / this.resistance;

        // Previeni scroll normale quando si tira verso il basso dalla cima
        e.preventDefault();

        // Limita il pull
        const limitedPull = Math.min(pullDistance, this.maxPull);

        // Aggiorna indicatore
        this.updateIndicator(limitedPull);
    },

    /**
     * Gestisce fine touch
     */
    handleTouchEnd(e) {
        if (!this.isPulling || this.isRefreshing) {
            this.wasAtTopOnStart = false;
            return;
        }

        const pullDistance = (this.currentY - this.startY) / this.resistance;

        if (pullDistance >= this.threshold) {
            this.triggerRefresh();
        } else {
            this.resetPull();
        }

        this.isPulling = false;
        this.wasAtTopOnStart = false;
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
        this.isPulling = false;
    },

    /**
     * Attiva il refresh
     */
    triggerRefresh() {
        this.isRefreshing = true;

        // Costruisci URL con hash per il restore
        const currentScreen = this.getCurrentScreen();
        let restoreHash = '';

        if (currentScreen) {
            restoreHash = `#restore:${encodeURIComponent(currentScreen)}`;

            // Se siamo in team-screen, aggiungi anche la sezione
            if (currentScreen === 'team-screen') {
                const section = this.getCurrentTeamSection();
                if (section) {
                    restoreHash += `:${encodeURIComponent(section)}`;
                }
            }
            console.log('[PullToRefresh] Salvo stato in hash:', restoreHash);
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
            if (restoreHash) {
                // Usa hash per passare lo stato attraverso il reload
                window.location.href = window.location.pathname + restoreHash;
            } else {
                window.location.reload();
            }
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

console.log('[PullToRefresh] Modulo caricato');
