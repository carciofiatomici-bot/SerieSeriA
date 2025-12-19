//
// ====================================================================
// VERSION-CHECK.JS - Sistema di Controllo Versione con Floating Alert
// ====================================================================
// Mostra un alert flottante quando e' disponibile una nuova versione
// dell'app, permettendo all'utente di continuare o aggiornare.
//

window.VersionCheck = {
    // Versione corrente dell'app (deve corrispondere a APP_VERSION in service-worker.js)
    CURRENT_VERSION: '2.2.33',

    // Chiave localStorage per salvare la versione accettata
    VERSION_KEY: 'serie-seria-accepted-version',

    // Chiave localStorage per salvare quando l'alert e' stato chiuso
    DISMISS_KEY: 'serie-seria-update-dismissed',

    // Durata in ms per cui l'alert rimane nascosto dopo la chiusura (1 ora)
    DISMISS_DURATION: 60 * 60 * 1000,

    // Flag per evitare check multipli
    isCheckingVersion: false,

    /**
     * Inizializza il sistema di controllo versione
     */
    init() {
        // Ascolta messaggi dal service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });

            // Richiedi la versione al service worker
            navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
        }

        // Ascolta quando un nuovo service worker viene installato
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[VersionCheck] Nuovo service worker attivo, controllo versione...');
                this.checkVersionMismatch();
            });
        }

        // Controlla la versione all'avvio
        this.checkVersionMismatch();

        console.log(`[VersionCheck] Sistema inizializzato - Versione ${this.CURRENT_VERSION}`);
    },

    /**
     * Gestisce i messaggi dal service worker
     */
    handleServiceWorkerMessage(event) {
        if (event.data) {
            switch (event.data.type) {
                case 'VERSION':
                    console.log(`[VersionCheck] Versione SW: ${event.data.version}, Versione App: ${this.CURRENT_VERSION}`);
                    if (event.data.version !== this.CURRENT_VERSION) {
                        this.showUpdateAlert(event.data.version);
                    }
                    break;

                case 'SW_ACTIVATED':
                    console.log(`[VersionCheck] Nuovo SW attivato: ${event.data.version}`);
                    if (event.data.version !== this.CURRENT_VERSION) {
                        this.showUpdateAlert(event.data.version);
                    }
                    break;
            }
        }
    },

    /**
     * Controlla se c'e' una discrepanza di versione
     */
    checkVersionMismatch() {
        if (this.isCheckingVersion) return;
        this.isCheckingVersion = true;

        const acceptedVersion = localStorage.getItem(this.VERSION_KEY);

        if (!acceptedVersion || acceptedVersion === this.CURRENT_VERSION) {
            localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
        }

        this.isCheckingVersion = false;
    },

    /**
     * Verifica se l'alert e' stato recentemente chiuso
     */
    isAlertDismissed() {
        const dismissedUntil = localStorage.getItem(this.DISMISS_KEY);
        if (!dismissedUntil) return false;

        const dismissTime = parseInt(dismissedUntil, 10);
        if (isNaN(dismissTime)) return false;

        return Date.now() < dismissTime;
    },

    /**
     * Segna l'alert come chiuso per un periodo
     */
    dismissAlert() {
        const dismissUntil = Date.now() + this.DISMISS_DURATION;
        localStorage.setItem(this.DISMISS_KEY, dismissUntil.toString());
    },

    /**
     * Mostra il floating alert di aggiornamento
     * @param {string} newVersion - La nuova versione disponibile
     */
    showUpdateAlert(newVersion) {
        // Verifica se l'alert e' stato recentemente chiuso
        if (this.isAlertDismissed()) {
            console.log('[VersionCheck] Alert chiuso di recente, non mostro');
            return;
        }

        // Evita di mostrare alert multipli
        if (document.getElementById('version-update-alert')) {
            return;
        }

        const alert = document.createElement('div');
        alert.id = 'version-update-alert';
        alert.innerHTML = `
            <div style="
                position: fixed;
                top: 16px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99999;
                animation: slideDown 0.3s ease-out;
            ">
                <div style="
                    background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);
                    border: 2px solid #3b82f6;
                    border-radius: 12px;
                    padding: 16px 20px;
                    min-width: 320px;
                    max-width: 90vw;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                ">
                    <!-- Icona -->
                    <div style="
                        font-size: 32px;
                        flex-shrink: 0;
                    ">🔄</div>

                    <!-- Contenuto -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="
                            color: #ffffff;
                            font-size: 14px;
                            font-weight: bold;
                            margin-bottom: 4px;
                        ">Nuova Versione Disponibile!</div>
                        <div style="
                            color: #94a3b8;
                            font-size: 12px;
                        ">
                            <span style="color: #f87171;">${this.CURRENT_VERSION}</span>
                            <span style="margin: 0 6px;">→</span>
                            <span style="color: #4ade80; font-weight: bold;">${newVersion}</span>
                        </div>
                    </div>

                    <!-- Bottoni -->
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button id="btn-update-now" style="
                            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                            color: white;
                            font-size: 12px;
                            font-weight: bold;
                            padding: 8px 16px;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                        ">
                            Aggiorna
                        </button>
                        <button id="btn-dismiss-update" style="
                            background: transparent;
                            color: #94a3b8;
                            font-size: 18px;
                            padding: 4px 8px;
                            border: none;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            line-height: 1;
                        " title="Chiudi (riappare tra 1 ora)">
                            ✕
                        </button>
                    </div>
                </div>
            </div>

            <style>
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                @keyframes slideUp {
                    from {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                }
                #btn-update-now:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                }
                #btn-dismiss-update:hover {
                    color: #ffffff;
                }
            </style>
        `;

        document.body.appendChild(alert);

        // Handler per il bottone di aggiornamento
        const updateBtn = document.getElementById('btn-update-now');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.forceUpdate();
            });
        }

        // Handler per il bottone di chiusura
        const dismissBtn = document.getElementById('btn-dismiss-update');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                this.hideAlert();
            });
        }

        console.log(`[VersionCheck] Alert aggiornamento mostrato (${this.CURRENT_VERSION} -> ${newVersion})`);
    },

    /**
     * Nasconde l'alert e lo segna come chiuso
     */
    hideAlert() {
        const alert = document.getElementById('version-update-alert');
        if (alert) {
            // Animazione di uscita
            const inner = alert.querySelector('div');
            if (inner) {
                inner.style.animation = 'slideUp 0.3s ease-out forwards';
            }

            // Rimuovi dopo l'animazione
            setTimeout(() => {
                alert.remove();
            }, 300);
        }

        // Segna come chiuso
        this.dismissAlert();
        console.log('[VersionCheck] Alert chiuso, riapparira tra 1 ora');
    },

    /**
     * Forza l'aggiornamento dell'app
     */
    async forceUpdate() {
        // Mostra stato di caricamento sul bottone
        const updateBtn = document.getElementById('btn-update-now');
        if (updateBtn) {
            updateBtn.innerHTML = '...';
            updateBtn.disabled = true;
            updateBtn.style.opacity = '0.7';
        }

        console.log('[VersionCheck] Inizio aggiornamento forzato...');

        try {
            // STEP 1: Cancella TUTTE le cache del browser (Cache API)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('[VersionCheck] Cache da cancellare:', cacheNames);
                await Promise.all(cacheNames.map(name => {
                    console.log('[VersionCheck] Cancellazione cache:', name);
                    return caches.delete(name);
                }));
                console.log('[VersionCheck] Tutte le cache cancellate');
            }

            // STEP 2: Gestisci il Service Worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                console.log('[VersionCheck] Service workers trovati:', registrations.length);

                for (const registration of registrations) {
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        console.log('[VersionCheck] SKIP_WAITING inviato');
                    }

                    if (registration.active) {
                        registration.active.postMessage({ type: 'CLEAR_CACHE' });
                        console.log('[VersionCheck] CLEAR_CACHE inviato');
                    }

                    const unregistered = await registration.unregister();
                    console.log('[VersionCheck] Service worker deregistrato:', unregistered);
                }
            }

            // STEP 3: Pulisci localStorage relativo alla versione
            localStorage.removeItem(this.VERSION_KEY);
            localStorage.removeItem(this.DISMISS_KEY);
            localStorage.removeItem('fanta_last_screen');
            console.log('[VersionCheck] localStorage pulito');

            // STEP 4: Attendi che tutto sia completato
            await new Promise(resolve => setTimeout(resolve, 500));

            // STEP 5: Forza hard refresh
            const baseUrl = window.location.origin + window.location.pathname;
            const freshUrl = baseUrl + '?_nocache=' + Date.now();

            console.log('[VersionCheck] Reindirizzamento a:', freshUrl);
            window.location.replace(freshUrl);

        } catch (error) {
            console.error('[VersionCheck] Errore durante aggiornamento:', error);
            if ('caches' in window) {
                caches.keys()
                    .then(names => names.forEach(name => caches.delete(name)))
                    .catch(err => console.warn('[VersionCheck] Errore pulizia cache:', err));
            }
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname + '?force=' + Date.now();
            }, 200);
        }
    },

    /**
     * Metodo per forzare la visualizzazione dell'alert (per testing)
     * Chiamare da console: window.VersionCheck.testAlert()
     */
    testAlert() {
        // Rimuovi eventuale dismiss precedente per il test
        localStorage.removeItem(this.DISMISS_KEY);
        this.showUpdateAlert('99.99.99');
    },

    /**
     * Metodo per resettare lo stato di dismiss (per testing)
     * Chiamare da console: window.VersionCheck.resetDismiss()
     */
    resetDismiss() {
        localStorage.removeItem(this.DISMISS_KEY);
        console.log('[VersionCheck] Dismiss resettato');
    }
};

// Auto-inizializzazione quando il DOM e' pronto
document.addEventListener('DOMContentLoaded', () => {
    // Ritarda leggermente per permettere al service worker di registrarsi
    setTimeout(() => {
        window.VersionCheck.init();
    }, 1000);
});

console.log('[VersionCheck] Modulo caricato');
