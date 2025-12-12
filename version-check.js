//
// ====================================================================
// VERSION-CHECK.JS - Sistema di Controllo Versione e Aggiornamento Forzato
// ====================================================================
// Mostra un overlay a tutto schermo quando e' disponibile una nuova versione
// dell'app, obbligando l'utente ad aggiornare.
//

window.VersionCheck = {
    // Versione corrente dell'app (deve corrispondere a APP_VERSION in service-worker.js)
    CURRENT_VERSION: '1.2.7',

    // Chiave localStorage per salvare la versione accettata
    VERSION_KEY: 'serie-seria-accepted-version',

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
                console.log('[VersionCheck] Nuovo service worker attivo, ricarico...');
                // Il service worker e' cambiato, potrebbe esserci una nuova versione
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
                    // Service worker ha risposto con la sua versione
                    console.log(`[VersionCheck] Versione SW: ${event.data.version}, Versione App: ${this.CURRENT_VERSION}`);
                    if (event.data.version !== this.CURRENT_VERSION) {
                        this.showUpdateOverlay(event.data.version);
                    }
                    break;

                case 'SW_ACTIVATED':
                    // Nuovo service worker attivato
                    console.log(`[VersionCheck] Nuovo SW attivato: ${event.data.version}`);
                    if (event.data.version !== this.CURRENT_VERSION) {
                        this.showUpdateOverlay(event.data.version);
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

        // Se l'utente non ha mai accettato una versione o la versione salvata e' diversa
        // dalla corrente, consideriamo che ha gia aggiornato correttamente
        if (!acceptedVersion || acceptedVersion === this.CURRENT_VERSION) {
            // Salva la versione corrente come accettata
            localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
        }

        this.isCheckingVersion = false;
    },

    /**
     * Mostra l'overlay di aggiornamento forzato
     * @param {string} newVersion - La nuova versione disponibile
     */
    showUpdateOverlay(newVersion) {
        // Evita di mostrare overlay multipli
        if (document.getElementById('version-update-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'version-update-overlay';
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.70);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(4px);
            ">
                <div style="
                    background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);
                    border: 2px solid #3b82f6;
                    border-radius: 16px;
                    padding: 40px;
                    max-width: 420px;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.3);
                ">
                    <div style="
                        font-size: 64px;
                        margin-bottom: 20px;
                    ">🔄</div>

                    <h2 style="
                        color: #ffffff;
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 16px;
                    ">Nuova Versione Disponibile!</h2>

                    <p style="
                        color: #94a3b8;
                        font-size: 16px;
                        margin-bottom: 8px;
                    ">La tua versione: <span style="color: #f87171; font-weight: bold;">${this.CURRENT_VERSION}</span></p>

                    <p style="
                        color: #94a3b8;
                        font-size: 16px;
                        margin-bottom: 24px;
                    ">Nuova versione: <span style="color: #4ade80; font-weight: bold;">${newVersion}</span></p>

                    <p style="
                        color: #e2e8f0;
                        font-size: 14px;
                        margin-bottom: 32px;
                        line-height: 1.5;
                    ">Per continuare a usare Serie SeriA devi aggiornare all'ultima versione.</p>

                    <button id="btn-force-update" style="
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                        color: white;
                        font-size: 18px;
                        font-weight: bold;
                        padding: 16px 48px;
                        border: none;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.6)';"
                       onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(59, 130, 246, 0.4)';">
                        Aggiorna Ora
                    </button>

                    <p style="
                        color: #64748b;
                        font-size: 12px;
                        margin-top: 20px;
                    ">L'aggiornamento ricarichera la pagina</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Handler per il bottone di aggiornamento
        const updateBtn = document.getElementById('btn-force-update');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.forceUpdate();
            });
        }

        console.log(`[VersionCheck] Overlay aggiornamento mostrato (${this.CURRENT_VERSION} -> ${newVersion})`);
    },

    /**
     * Forza l'aggiornamento dell'app
     */
    async forceUpdate() {
        // Mostra stato di caricamento sul bottone
        const updateBtn = document.getElementById('btn-force-update');
        if (updateBtn) {
            updateBtn.innerHTML = 'Aggiornamento in corso...';
            updateBtn.disabled = true;
            updateBtn.style.opacity = '0.7';
        }

        try {
            // 1. Cancella tutte le cache del browser
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('[VersionCheck] Cache cancellate:', cacheNames);
            }

            // 2. Invia SKIP_WAITING al service worker in attesa (se presente)
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    // Se c'e' un worker in attesa, fallo attivare
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    // Invia anche CLEAR_CACHE al controller attivo
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
                    }
                    // Deregistra il service worker per forzare reinstallazione
                    await registration.unregister();
                    console.log('[VersionCheck] Service worker deregistrato');
                }
            }

            // 3. Attendi un momento per assicurarsi che tutto sia completato
            await new Promise(resolve => setTimeout(resolve, 300));

            // 4. Ricarica la pagina (senza parametri deprecati)
            // Per forzare un reload senza cache, usiamo un timestamp nel URL
            const url = new URL(window.location.href);
            url.searchParams.set('_refresh', Date.now().toString());
            window.location.href = url.toString();

        } catch (error) {
            console.error('[VersionCheck] Errore durante aggiornamento:', error);
            // Fallback: reload semplice
            window.location.reload();
        }
    },

    /**
     * Metodo per forzare la visualizzazione dell'overlay (per testing)
     * Chiamare da console: window.VersionCheck.testOverlay()
     */
    testOverlay() {
        this.showUpdateOverlay('99.99.99');
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
