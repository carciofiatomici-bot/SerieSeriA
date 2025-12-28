//
// ====================================================================
// MODULO PWA-INSTALL.JS (Service Worker, Update e Install Banner)
// ====================================================================
//
// Estratto da index.html per mantenere il file principale piu pulito
//

// ====================================================================
// PWA UPDATER - Sistema di aggiornamento
// ====================================================================

window.PWAUpdater = {
    registration: null,
    newWorker: null,

    // Mostra banner di aggiornamento
    showUpdateBanner: function() {
        // Rimuovi banner esistente se presente
        const existingBanner = document.getElementById('pwa-update-banner');
        if (existingBanner) existingBanner.remove();

        // Crea banner
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.innerHTML = `
            <div style="position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white; padding: 16px 24px; border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 10000;
                        display: flex; align-items: center; gap: 16px; max-width: 90vw;">
                <div style="font-size: 28px;">🔄</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 14px;">Nuova versione disponibile!</div>
                    <div style="font-size: 12px; opacity: 0.9;">Aggiorna per le ultime novita</div>
                </div>
                <button id="pwa-update-btn" style="background: white; color: #059669; border: none;
                        padding: 10px 20px; border-radius: 8px; font-weight: bold;
                        cursor: pointer; font-size: 14px; transition: transform 0.2s;">
                    Aggiorna Ora
                </button>
                <button id="pwa-dismiss-btn" style="background: transparent; color: white; border: none;
                        font-size: 20px; cursor: pointer; padding: 4px 8px; opacity: 0.7;">
                    ✕
                </button>
            </div>
        `;
        document.body.appendChild(banner);

        // Event listeners
        document.getElementById('pwa-update-btn').addEventListener('click', () => {
            window.PWAUpdater.applyUpdate();
        });
        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
            banner.remove();
        });
    },

    // Applica l'aggiornamento - versione robusta
    applyUpdate: async function() {
        console.log('[PWA] Applicazione aggiornamento...');

        try {
            // 1. Prima pulisci tutte le cache
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
                console.log('[PWA] Cache cancellate:', names);
            }

            // 2. Attiva il nuovo worker se presente
            if (this.newWorker) {
                this.newWorker.postMessage({ type: 'SKIP_WAITING' });
                console.log('[PWA] SKIP_WAITING inviato al nuovo worker');
            }

            // 3. Aspetta un momento e ricarica
            await new Promise(resolve => setTimeout(resolve, 500));

            // 4. Forza reload con cache-busting
            const url = window.location.origin + window.location.pathname + '?_update=' + Date.now();
            window.location.replace(url);

        } catch (error) {
            console.error('[PWA] Errore applicazione aggiornamento:', error);
            location.reload();
        }
    },

    // Forza pulizia cache - versione asincrona
    clearCache: async function() {
        console.log('[PWA] Pulizia cache in corso...');

        try {
            // 1. Invia CLEAR_CACHE al service worker
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
            }

            // 2. Pulisci cache dal lato client (await!)
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
                console.log('[PWA] Cache client cancellate:', names);
            }

            // 3. Deregistra tutti i service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(r => r.unregister()));
            console.log('[PWA] Service workers deregistrati');

            // 4. Aspetta e ricarica
            await new Promise(resolve => setTimeout(resolve, 300));

            const url = window.location.origin + window.location.pathname + '?_clear=' + Date.now();
            window.location.replace(url);

        } catch (error) {
            console.error('[PWA] Errore pulizia cache:', error);
            location.reload();
        }
    },

    // Controlla manualmente se ci sono aggiornamenti
    checkForUpdates: function() {
        if (this.registration) {
            this.registration.update()
                .then(() => console.log('[PWA] Controllo aggiornamenti completato'))
                .catch(err => console.warn('[PWA] Errore controllo aggiornamenti:', err));
        }
    }
};

// ====================================================================
// SERVICE WORKER REGISTRATION
// ====================================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // updateViaCache: 'none' forza il browser a controllare sempre la versione del SW
        navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
            .then((registration) => {
                console.log('[PWA] Service Worker registrato:', registration.scope);
                window.PWAUpdater.registration = registration;

                // Controlla aggiornamenti ogni 60 minuti
                window.PWAUpdater._updateInterval = setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);

                // Gestione nuovo worker trovato
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[PWA] Nuova versione in installazione...');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // C'e' gia' un SW attivo = e' un aggiornamento
                                console.log('[PWA] Nuova versione pronta!');
                                window.PWAUpdater.newWorker = newWorker;
                                window.PWAUpdater.showUpdateBanner();
                            } else {
                                // Prima installazione
                                console.log('[PWA] App installata e pronta per uso offline');
                            }
                        }
                    });
                });
            })
            .catch((error) => {
                console.warn('[PWA] Registrazione Service Worker fallita:', error);
            });
    });

    // Ascolta messaggi dal Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_ACTIVATED') {
            console.log('[PWA] Service Worker aggiornato alla versione:', event.data.version);
            // Ricarica la pagina per usare la nuova versione
            location.reload();
        }
    });

    // Gestione cambio controller (quando un nuovo SW prende il controllo)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Nuovo Service Worker attivato, ricarico...');
        location.reload();
    });
}

// ====================================================================
// PWA UPDATE BUTTON (solo se installata come PWA)
// ====================================================================

function setupPWAUpdateButton() {
    const container = document.getElementById('pwa-update-button-container');
    const btn = document.getElementById('btn-check-pwa-update');

    if (!container || !btn) return;

    // Controlla se l'app e' in modalita' standalone (installata come PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
        || document.referrer.includes('android-app://');

    if (isStandalone) {
        // Mostra il bottone
        container.classList.remove('hidden');
        console.log('[PWA] App installata, bottone aggiornamento visibile');

        // Gestisci click
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span> Controllo in corso...';

            try {
                // Forza controllo aggiornamenti
                if (window.PWAUpdater && window.PWAUpdater.registration) {
                    await window.PWAUpdater.registration.update();

                    // Aspetta un attimo per vedere se c'e' un nuovo worker
                    setTimeout(() => {
                        if (window.PWAUpdater.newWorker) {
                            // C'e' un aggiornamento
                            btn.innerHTML = '<span>✅</span> Aggiornamento trovato!';
                            btn.classList.remove('bg-cyan-600', 'hover:bg-cyan-500');
                            btn.classList.add('bg-green-600', 'hover:bg-green-500');
                            window.PWAUpdater.showUpdateBanner();
                        } else {
                            // Nessun aggiornamento
                            btn.innerHTML = '<span>✅</span> Sei aggiornato!';
                            btn.classList.remove('bg-cyan-600', 'hover:bg-cyan-500');
                            btn.classList.add('bg-gray-600');
                            setTimeout(() => {
                                btn.innerHTML = '<span>🔄</span> Controlla Aggiornamenti';
                                btn.classList.remove('bg-gray-600');
                                btn.classList.add('bg-cyan-600', 'hover:bg-cyan-500');
                                btn.disabled = false;
                            }, 3000);
                        }
                    }, 2000);
                } else {
                    // Fallback: pulisci cache e ricarica
                    window.PWAUpdater?.clearCache();
                }
            } catch (error) {
                console.error('[PWA] Errore controllo aggiornamenti:', error);
                btn.innerHTML = '<span>❌</span> Errore, riprova';
                btn.disabled = false;
                setTimeout(() => {
                    btn.innerHTML = '<span>🔄</span> Controlla Aggiornamenti';
                }, 2000);
            }
        });
    } else {
        // Non e' una PWA installata, nascondi il bottone
        container.classList.add('hidden');
    }
}

// Esegui quando il DOM e' pronto
document.addEventListener('DOMContentLoaded', setupPWAUpdateButton);

// ====================================================================
// PWA INSTALL PROMPT - Banner per installare l'app
// ====================================================================

let deferredInstallPrompt = null;

// Cookie helper functions
function setInstallDismissedCookie() {
    const days = 15;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `pwa_install_dismissed=true; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
    console.log('[PWA] Cookie installazione impostato per 15 giorni');
}

function isInstallDismissed() {
    return document.cookie.split(';').some(c => c.trim().startsWith('pwa_install_dismissed='));
}

// Cattura l'evento beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Previeni il prompt automatico del browser
    e.preventDefault();
    // Salva l'evento per usarlo dopo
    deferredInstallPrompt = e;

    // Controlla se l'utente ha gia' rifiutato
    if (isInstallDismissed()) {
        console.log('[PWA] Utente ha rifiutato installazione, non mostro banner');
        return;
    }

    // Mostra il banner di installazione
    showInstallBanner();
    console.log('[PWA] App installabile, banner mostrato');
});

// Mostra il banner di installazione
function showInstallBanner() {
    // Controlla di nuovo il cookie prima di mostrare
    if (isInstallDismissed()) {
        return;
    }

    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.remove('hidden');
    }
}

// Nascondi il banner (con opzione di salvare preferenza)
function hideInstallBanner(savePreference = false) {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.add('hidden');
    }

    if (savePreference) {
        setInstallDismissedCookie();
    }
}

// Installa l'app
async function installPWA() {
    if (!deferredInstallPrompt) {
        console.log('[PWA] Nessun prompt disponibile');
        return;
    }

    // Mostra il prompt nativo
    deferredInstallPrompt.prompt();

    // Aspetta la risposta dell'utente
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Scelta utente:', outcome);

    // Pulisci il prompt salvato
    deferredInstallPrompt = null;

    // Nascondi il banner
    hideInstallBanner();

    if (outcome === 'accepted') {
        console.log('[PWA] App installata con successo!');
    }
}

// Esponi funzioni globalmente
window.installPWA = installPWA;
window.hideInstallBanner = hideInstallBanner;

// Rileva se l'app e' gia' installata
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installata!');
    hideInstallBanner();
    deferredInstallPrompt = null;
});

// Nascondi banner se gia' in modalita' standalone
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    console.log('[PWA] App gia in modalita standalone');
}

console.log("Modulo pwa-install.js caricato.");
