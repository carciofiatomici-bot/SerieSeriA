//
// ====================================================================
// SERVICE WORKER - Serie SeriA PWA
// ====================================================================
// Gestisce caching, funzionalita offline e aggiornamenti automatici
//
// IMPORTANTE: Per forzare un aggiornamento dell'app, incrementa APP_VERSION
//

const APP_VERSION = '2.4.2'; // <-- INCREMENTA QUESTO NUMERO PER FORZARE AGGIORNAMENTO
const CACHE_NAME = `serie-seria-v${APP_VERSION}`;
const STATIC_CACHE = `serie-seria-static-v${APP_VERSION}`;
const DYNAMIC_CACHE = `serie-seria-dynamic-v${APP_VERSION}`;
const IMAGE_CACHE = `serie-seria-images-v${APP_VERSION}`;
const MAX_IMAGE_CACHE_SIZE = 100; // Limite massimo immagini in cache

// File da cachare immediatamente (shell dell'app)
// IMPORTANTE: Mantenere sincronizzato con i <script> in index.html
const STATIC_ASSETS = [
    // Core
    './',
    './index.html',
    './style.css',
    './manifest.json',

    // Foundation
    './icone.js',
    './firestore-cache.js',
    './config-listener.js',
    './listener-manager.js',
    './interfaccia-core.js',
    './responsive-images.js',

    // UI Components
    './toast.js',
    './confirm-dialog.js',
    './skeleton-loader.js',
    './loading-manager.js',
    './error-handler.js',
    './form-validator.js',
    './breadcrumb.js',

    // Features
    './feature-flags.js',
    './notifications.js',
    './player-stats-advanced.js',
    './chat.js',
    './trades.js',
    './achievements.js',
    './injuries.js',
    './stadium.js',
    './stadium-ui.js',
    './training.js',
    './match-animations.js',
    './drag-drop.js',
    './challenges.js',
    './challenge-match.js',
    './challenge-minigame.js',
    './dashboard-features.js',
    './dashboard-tabs.js',
    './next-match-alert.js',
    './tutorial.js',
    './match-history.js',
    './sponsor-system.js',
    './private-leagues.js',
    './private-leagues-ui.js',
    './image-compressor.js',
    './lazy-loader.js',

    // Simulation
    './abilita-effects.js',
    './simulazione.js',
    './simulazione-nuove-regole.js',

    // Interface
    './interfaccia-auth.js',
    './interfaccia-dashboard.js',
    './interfaccia-navigation.js',
    './interfaccia-onboarding.js',
    './interfaccia-team.js',
    './uniform-editor.js',

    // Squad Management
    './gestionesquadre-constants.js',
    './gestionesquadre-utils.js',
    './gestionesquadre-rosa.js',
    './gestionesquadre-formazione.js',
    './gestionesquadre-icona.js',
    './gestionesquadre.js',

    // Draft
    './draft-constants.js',
    './draft-timer-sync.js',
    './draft-utils.js',
    './draft-turns.js',
    './draft-admin-ui.js',
    './draft-admin-players.js',
    './draft-user-ui.js',
    './draft-user-actions.js',
    './draft-status-box.js',
    './draft.js',
    './mercato.js',

    // Admin
    './admin-formulas.js',
    './admin-rewards.js',
    './admin-sponsors.js',
    './admin-media.js',
    './admin-ui.js',
    './admin-players.js',
    './admin-teams.js',
    './admin-icons.js',
    './admin.js',
    './admin-feature-flags.js',
    './admin-objects.js',
    './equipment-ui.js',

    // Player Stats & Experience
    './player-season-stats.js',
    './player-season-stats-ui.js',
    './player-exp.js',
    './player-exp-ui.js',
    './training-exp-minigame.js',

    // Championship
    './campionato-rewards.js',
    './campionato-simulation.js',
    './campionato-schedule.js',
    './campionato-ui.js',
    './campionato-main.js',
    './campionato.js',
    './automazione-simulazioni.js',

    // Cup
    './coppa-constants.js',
    './coppa-brackets.js',
    './coppa-simulation.js',
    './coppa-schedule.js',
    './coppa-ui.js',
    './coppa-main.js',
    './supercoppa.js',

    // Main Orchestrator
    './interfaccia.js',

    // Post-load UI
    './match-replay-simple.js',
    './player-stats.js',
    './player-stats-ui.js',
    './abilities-encyclopedia.js',
    './abilities-encyclopedia-ui.js',
    './rules-panel.js',
    './sponsor-media.js',
    './user-championship.js',
    './user-competitions.js',

    // Credits System
    './crediti-super-seri.js',
    './crediti-super-seri-ui.js',

    // PWA
    './pwa-install.js',

    // Offline fallback
    './offline.html'
    // Nota: le icone PWA sono caricate da CDN esterno (GitHub), non locali
];

// Installa il service worker e cacha i file statici
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installazione...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[Service Worker] Caching file statici');
                // Cache file uno alla volta per evitare errori
                return Promise.allSettled(
                    STATIC_ASSETS.map(asset =>
                        cache.add(asset).catch(err => {
                            console.warn(`[Service Worker] Impossibile cachare: ${asset}`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[Service Worker] Installazione completata');
                // Precache immagini critiche
                precacheCriticalImages();
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Errore durante installazione:', error);
            })
    );
});

// NOTA: L'evento 'activate' è definito in fondo al file con logica avanzata

// Strategia di fetch: Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora richieste non-GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignora schemi non supportati (chrome-extension, etc.)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Ignora richieste a Firebase (devono sempre andare in rete)
    if (url.hostname.includes('firebase') ||
        url.hostname.includes('firestore') ||
        url.hostname.includes('googleapis')) {
        return;
    }

    // Gestione speciale per immagini esterne (GitHub, etc.)
    const isImage = request.destination === 'image' ||
                    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

    if (url.hostname !== location.hostname) {
        // Per immagini esterne: Cache-First con cache dedicata
        if (isImage) {
            event.respondWith(
                caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        return fetch(request)
                            .then((response) => {
                                if (!response || response.status !== 200) {
                                    return response;
                                }
                                const responseClone = response.clone();
                                caches.open(IMAGE_CACHE)
                                    .then((cache) => {
                                        cache.put(request, responseClone);
                                        // Limita dimensione cache immagini
                                        trimImageCache();
                                    })
                                    .catch((err) => console.warn('[Service Worker] Errore cache immagine:', err));
                                return response;
                            });
                    })
                    .catch((error) => {
                        console.warn('[Service Worker] Errore fetch immagine:', error);
                        return new Response('', { status: 404 });
                    })
            );
            return;
        }

        // Per altri CDN esterni (Tailwind, Font Awesome): cache-first
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request)
                        .then((response) => {
                            // Non cachare risposte non valide
                            if (!response || response.status !== 200) {
                                return response;
                            }
                            // Cacha la risposta
                            const responseClone = response.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then((cache) => cache.put(request, responseClone))
                                .catch((err) => console.warn('[Service Worker] Errore cache CDN:', err));
                            return response;
                        });
                })
                .catch((error) => {
                    console.warn('[Service Worker] Errore fetch CDN:', error);
                    return new Response('', { status: 503 });
                })
        );
        return;
    }

    // Per file locali: Network First con fallback a cache
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Aggiorna la cache con la nuova versione
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then((cache) => cache.put(request, responseClone));
                }
                return response;
            })
            .catch(() => {
                // Se offline, prova dalla cache
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Se e' una pagina HTML, mostra la pagina offline dedicata
                        if (request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('./offline.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Gestione messaggi dal main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[Service Worker] Skip waiting richiesto, attivazione immediata...');
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('[Service Worker] Pulizia cache richiesta...');
        event.waitUntil(
            caches.keys().then((names) => {
                console.log('[Service Worker] Cancellazione cache:', names);
                return Promise.all(names.map((name) => caches.delete(name)));
            }).then(() => {
                console.log('[Service Worker] Tutte le cache cancellate');
            }).catch((error) => {
                console.error('[Service Worker] Errore pulizia cache:', error);
            })
        );
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        // Risponde con la versione corrente
        event.source.postMessage({
            type: 'VERSION',
            version: APP_VERSION
        });
    }
});

// Notifica tutti i client quando il SW si attiva
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Attivazione...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
                        .map((name) => {
                            console.log(`[Service Worker] Eliminazione vecchia cache: ${name}`);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Attivazione completata');
                // Notifica i client dell'aggiornamento
                return self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'SW_ACTIVATED',
                            version: APP_VERSION
                        });
                    });
                });
            })
            .then(() => self.clients.claim())
    );
});

console.log(`[Service Worker] Script caricato - Versione ${APP_VERSION}`);

// ====================================================================
// GESTIONE CACHE IMMAGINI
// ====================================================================

/**
 * Limita la dimensione della cache immagini
 * Rimuove le immagini piu' vecchie quando supera il limite
 */
async function trimImageCache() {
    try {
        const cache = await caches.open(IMAGE_CACHE);
        const keys = await cache.keys();

        if (keys.length > MAX_IMAGE_CACHE_SIZE) {
            // Rimuovi le prime (piu' vecchie) per stare sotto il limite
            const toDelete = keys.length - MAX_IMAGE_CACHE_SIZE;
            console.log(`[Service Worker] Pulizia cache immagini: rimozione ${toDelete} elementi`);

            for (let i = 0; i < toDelete; i++) {
                await cache.delete(keys[i]);
            }
        }
    } catch (error) {
        console.warn('[Service Worker] Errore pulizia cache immagini:', error);
    }
}

/**
 * Precache immagini critiche (chiamare all'installazione)
 */
const CRITICAL_IMAGES = [
    'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg',
    'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/serie%20sera%20256.png'
];

async function precacheCriticalImages() {
    try {
        const cache = await caches.open(IMAGE_CACHE);
        console.log('[Service Worker] Precaching immagini critiche...');

        await Promise.allSettled(
            CRITICAL_IMAGES.map(url =>
                fetch(url)
                    .then(response => {
                        if (response.ok) {
                            return cache.put(url, response);
                        }
                    })
                    .catch(err => console.warn(`[Service Worker] Impossibile precachare: ${url}`, err))
            )
        );
    } catch (error) {
        console.warn('[Service Worker] Errore precache immagini:', error);
    }
}
