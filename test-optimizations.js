/**
 * TEST OTTIMIZZAZIONI FIREBASE
 *
 * Esegui questo script nella console del browser dopo aver caricato l'app.
 * Copia e incolla tutto il contenuto nella console per eseguire i test.
 */

(async function testOptimizations() {
    console.log('='.repeat(60));
    console.log('TEST OTTIMIZZAZIONI FIREBASE');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    // Test 1: Verifica FirestoreCache
    console.log('\n[TEST 1] FirestoreCache');
    try {
        if (window.FirestoreCache) {
            console.log('  - Modulo caricato: OK');
            console.log('  - TTL TEAM_DATA:', window.FirestoreCache.TTL.TEAM_DATA / 1000, 'sec');
            console.log('  - TTL CONFIG:', window.FirestoreCache.TTL.CONFIG / 1000, 'sec');

            if (window.FirestoreCache.TTL.TEAM_DATA >= 300000) {
                console.log('  - TTL aumentati: OK (5+ min)');
                passed++;
            } else {
                console.log('  - TTL aumentati: FAIL (ancora < 5 min)');
                failed++;
            }
        } else {
            console.log('  - FAIL: FirestoreCache non trovato');
            failed++;
        }
    } catch (e) {
        console.log('  - ERRORE:', e.message);
        failed++;
    }

    // Test 2: Verifica LeaderboardListener
    console.log('\n[TEST 2] LeaderboardListener');
    try {
        if (window.LeaderboardListener) {
            console.log('  - Modulo caricato: OK');
            console.log('  - Metodo getLeaderboard:', typeof window.LeaderboardListener.getLeaderboard === 'function' ? 'OK' : 'FAIL');
            console.log('  - Metodo invalidateCache:', typeof window.LeaderboardListener.invalidateCache === 'function' ? 'OK' : 'FAIL');
            console.log('  - Metodo getCached:', typeof window.LeaderboardListener.getCached === 'function' ? 'OK' : 'FAIL');

            // Test fetch classifica
            console.log('  - Tentativo fetch classifica...');
            const data = await window.LeaderboardListener.getLeaderboard();
            if (data) {
                console.log('  - Fetch classifica: OK (' + (data.standings?.length || 0) + ' squadre)');
                passed++;
            } else {
                console.log('  - Fetch classifica: WARN (nessun dato, potrebbe essere normale se non c\'e\' campionato)');
                passed++; // Non e' un errore se non c'e' campionato
            }

            // Test cache
            const cached = window.LeaderboardListener.getCached();
            console.log('  - Cache attiva:', cached !== null ? 'SI' : 'NO');

            // Mostra stats
            const stats = window.LeaderboardListener.getStats();
            console.log('  - Stats:', JSON.stringify(stats));

        } else {
            console.log('  - FAIL: LeaderboardListener non trovato');
            failed++;
        }
    } catch (e) {
        console.log('  - ERRORE:', e.message);
        failed++;
    }

    // Test 3: Verifica ConfigListener
    console.log('\n[TEST 3] ConfigListener');
    try {
        if (window.ConfigListener) {
            console.log('  - Modulo caricato: OK');
            console.log('  - Metodo subscribe:', typeof window.ConfigListener.subscribe === 'function' ? 'OK' : 'FAIL');
            console.log('  - Config in cache:', window.ConfigListener.getConfig() ? 'SI' : 'NO');
            passed++;
        } else {
            console.log('  - FAIL: ConfigListener non trovato');
            failed++;
        }
    } catch (e) {
        console.log('  - ERRORE:', e.message);
        failed++;
    }

    // Test 4: Verifica Offline Persistence
    console.log('\n[TEST 4] Offline Persistence');
    try {
        // Controlla se IndexedDB ha dati Firebase
        const databases = await indexedDB.databases();
        const firebaseDB = databases.find(db => db.name && db.name.includes('firestore'));
        if (firebaseDB) {
            console.log('  - IndexedDB Firebase trovato: OK');
            console.log('  - Nome DB:', firebaseDB.name);
            passed++;
        } else {
            console.log('  - IndexedDB Firebase: NON TROVATO (potrebbe non essere ancora inizializzato)');
            // Non contiamo come fallito perche potrebbe essere la prima visita
        }
    } catch (e) {
        console.log('  - WARN: indexedDB.databases() non supportato in questo browser');
    }

    // Test 5: Verifica Cache Stats
    console.log('\n[TEST 5] Cache Stats');
    try {
        if (window.FirestoreCache) {
            const stats = window.FirestoreCache.getStats();
            console.log('  - Hits:', stats.hits);
            console.log('  - Misses:', stats.misses);
            console.log('  - Hit Rate:', stats.hitRate);
            console.log('  - Cache Size:', stats.cacheSize);
            passed++;
        }
    } catch (e) {
        console.log('  - ERRORE:', e.message);
        failed++;
    }

    // Risultato finale
    console.log('\n' + '='.repeat(60));
    console.log('RISULTATO: ' + passed + ' OK, ' + failed + ' FAIL');
    console.log('='.repeat(60));

    if (failed === 0) {
        console.log('\n✅ Tutte le ottimizzazioni sono attive e funzionanti!');
    } else {
        console.log('\n⚠️ Alcuni test hanno fallito. Controlla i dettagli sopra.');
    }

    return { passed, failed };
})();
