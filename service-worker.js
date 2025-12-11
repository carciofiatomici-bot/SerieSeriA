//
// ====================================================================
// SERVICE WORKER - Serie SeriA PWA
// ====================================================================
// Gestisce caching, funzionalita offline e aggiornamenti automatici
//
// IMPORTANTE: Per forzare un aggiornamento dell'app, incrementa APP_VERSION
//

const APP_VERSION = '1.1.6'; // <-- INCREMENTA QUESTO NUMERO PER FORZARE AGGIORNAMENTO
const CACHE_NAME = `serie-seria-v${APP_VERSION}`;
const STATIC_CACHE = `serie-seria-static-v${APP_VERSION}`;
const DYNAMIC_CACHE = `serie-seria-dynamic-v${APP_VERSION}`;

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
        console.log('[Service Worker] Skip waiting richiesto, attivazione immediata...');
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('[Service Worker] Pulizia cache richiesta...');
        caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
        });
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
                        .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
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
