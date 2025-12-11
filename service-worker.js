//
// ====================================================================
// SERVICE WORKER - Serie SeriA PWA
// ====================================================================
// Gestisce caching e funzionalita offline
//

const CACHE_NAME = 'serie-seria-v1';
const STATIC_CACHE = 'serie-seria-static-v1';
const DYNAMIC_CACHE = 'serie-seria-dynamic-v1';

// File da cachare immediatamente (shell dell'app)
const STATIC_ASSETS = [
    './',
    './index.html',
    './interfaccia.js',
    './interfaccia-core.js',
    './interfaccia-auth.js',
    './interfaccia-dashboard.js',
    './interfaccia-navigation.js',
    './simulazione.js',
    './gestionesquadre.js',
    './gestionesquadre-formazione.js',
    './draft.js',
    './mercato.js',
    './challenges.js',
    './training.js',
    './feature-flags.js',
    './dashboard-features.js',
    './icone.js',
    './abilities-encyclopedia.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
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
                return self.skipWaiting();
            })
    );
});

// Attiva il service worker e pulisce le vecchie cache
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Attivazione...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                        .map((name) => {
                            console.log(`[Service Worker] Eliminazione vecchia cache: ${name}`);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Attivazione completata');
                return self.clients.claim();
            })
    );
});

// Strategia di fetch: Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora richieste non-GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignora richieste a Firebase (devono sempre andare in rete)
    if (url.hostname.includes('firebase') ||
        url.hostname.includes('firestore') ||
        url.hostname.includes('googleapis')) {
        return;
    }

    // Ignora richieste a CDN esterni (Tailwind, Font Awesome, etc.)
    if (url.hostname !== location.hostname) {
        // Per CDN esterni, usa cache-first
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
                                .then((cache) => cache.put(request, responseClone));
                            return response;
                        });
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
                        // Se e' una pagina HTML, ritorna la pagina principale
                        if (request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('./index.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Gestione messaggi dal main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
        });
    }
});

console.log('[Service Worker] Script caricato');
