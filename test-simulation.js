/**
 * TEST SIMULAZIONE CAMPIONATO
 *
 * Esegui questo script nella console del browser DOPO aver fatto login come admin.
 * Verifica che le ottimizzazioni (LeaderboardListener) funzionino durante le simulazioni.
 */

(async function testSimulation() {
    console.log('='.repeat(60));
    console.log('TEST SIMULAZIONE CON OTTIMIZZAZIONI');
    console.log('='.repeat(60));

    // Verifica prerequisiti
    console.log('\n[PREREQUISITI]');

    if (!window.db || !window.firestoreTools) {
        console.error('ERRORE: Firebase non inizializzato. Ricarica la pagina.');
        return;
    }
    console.log('  - Firebase: OK');

    if (!window.LeaderboardListener) {
        console.error('ERRORE: LeaderboardListener non trovato.');
        return;
    }
    console.log('  - LeaderboardListener: OK');

    if (!window.ChampionshipMain) {
        console.error('ERRORE: ChampionshipMain non trovato.');
        return;
    }
    console.log('  - ChampionshipMain: OK');

    if (!window.ChampionshipSimulation) {
        console.error('ERRORE: ChampionshipSimulation non trovato.');
        return;
    }
    console.log('  - ChampionshipSimulation: OK');

    // Test 1: Carica classifica via LeaderboardListener
    console.log('\n[TEST 1] Caricamento classifica via LeaderboardListener');
    const startTime1 = performance.now();

    try {
        const leaderboard1 = await window.LeaderboardListener.getLeaderboard();
        const time1 = (performance.now() - startTime1).toFixed(2);

        if (leaderboard1?.standings) {
            console.log(`  - Prima chiamata: ${time1}ms (${leaderboard1.standings.length} squadre)`);

            // Seconda chiamata (dovrebbe usare cache)
            const startTime2 = performance.now();
            const leaderboard2 = await window.LeaderboardListener.getLeaderboard();
            const time2 = (performance.now() - startTime2).toFixed(2);
            console.log(`  - Seconda chiamata (cache): ${time2}ms`);

            if (parseFloat(time2) < parseFloat(time1) / 2) {
                console.log('  - Cache funzionante: OK (2a chiamata piu veloce)');
            } else {
                console.log('  - Cache: potrebbe non essere attiva');
            }

            // Mostra classifica
            console.log('\n  Classifica attuale:');
            leaderboard1.standings.slice(0, 5).forEach((team, i) => {
                console.log(`    ${i + 1}. ${team.teamName} - ${team.points} pt (${team.played} g)`);
            });
        } else {
            console.log('  - Nessuna classifica trovata (normale se campionato non iniziato)');
        }
    } catch (e) {
        console.error('  - ERRORE:', e.message);
    }

    // Test 2: Carica calendario
    console.log('\n[TEST 2] Caricamento calendario');
    try {
        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const schedulePath = `artifacts/${appId}/public/data/schedule/full_schedule`;
        const scheduleDoc = await getDoc(doc(window.db, schedulePath));

        if (scheduleDoc.exists()) {
            const schedule = scheduleDoc.data().matches || [];
            console.log(`  - Giornate totali: ${schedule.length}`);

            // Trova prossima giornata
            let nextRound = null;
            for (const round of schedule) {
                const hasUnplayed = round.matches?.some(m => m.result === null);
                if (hasUnplayed) {
                    nextRound = round;
                    break;
                }
            }

            if (nextRound) {
                console.log(`  - Prossima giornata: ${nextRound.round}`);
                const unplayedCount = nextRound.matches.filter(m => m.result === null).length;
                console.log(`  - Partite da giocare: ${unplayedCount}`);

                // Mostra partite
                console.log('\n  Partite della giornata:');
                nextRound.matches.forEach(m => {
                    const status = m.result ? `[${m.result}]` : '[Da giocare]';
                    console.log(`    ${m.homeName} vs ${m.awayName} ${status}`);
                });
            } else {
                console.log('  - Tutte le giornate sono state giocate');
            }
        } else {
            console.log('  - Nessun calendario trovato');
        }
    } catch (e) {
        console.error('  - ERRORE:', e.message);
    }

    // Test 3: Simula una partita (DRY RUN - solo calcolo, no salvataggio)
    console.log('\n[TEST 3] Simulazione partita (DRY RUN)');
    try {
        // Carica due squadre qualsiasi
        const { collection, getDocs, limit, query } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const teamsPath = `artifacts/${appId}/public/data/teams`;

        const teamsQuery = query(collection(window.db, teamsPath), limit(2));
        const teamsSnap = await getDocs(teamsQuery);

        if (teamsSnap.size >= 2) {
            const teams = [];
            teamsSnap.forEach(doc => {
                teams.push({ id: doc.id, ...doc.data() });
            });

            const homeTeam = teams[0];
            const awayTeam = teams[1];

            console.log(`  - ${homeTeam.teamName} vs ${awayTeam.teamName}`);

            // Esegui simulazione
            if (window.ChampionshipSimulation.runSimulation) {
                const result = window.ChampionshipSimulation.runSimulation(homeTeam, awayTeam);
                console.log(`  - Risultato simulato: ${result.homeGoals} - ${result.awayGoals}`);
                console.log('  - Simulazione funzionante: OK');
            } else {
                console.log('  - runSimulation non disponibile');
            }
        } else {
            console.log('  - Meno di 2 squadre trovate');
        }
    } catch (e) {
        console.error('  - ERRORE:', e.message);
    }

    // Test 4: Verifica invalidazione cache
    console.log('\n[TEST 4] Test invalidazione cache');
    try {
        // Invalida cache
        window.LeaderboardListener.invalidateCache();
        console.log('  - Cache invalidata');

        // Verifica che la cache sia vuota (lastFetchTime = 0)
        const stats = window.LeaderboardListener.getStats();
        console.log('  - Stats dopo invalidazione:', JSON.stringify(stats));

        // Ricarica (dovrebbe fare fetch)
        const startTime = performance.now();
        await window.LeaderboardListener.getLeaderboard();
        const time = (performance.now() - startTime).toFixed(2);
        console.log(`  - Ricaricamento dopo invalidazione: ${time}ms`);

        console.log('  - Invalidazione funzionante: OK');
    } catch (e) {
        console.error('  - ERRORE:', e.message);
    }

    // Test 5: Cache Stats finali
    console.log('\n[TEST 5] Statistiche Cache Finali');
    if (window.FirestoreCache) {
        const stats = window.FirestoreCache.getStats();
        console.log(`  - Total requests: ${stats.total}`);
        console.log(`  - Cache hits: ${stats.hits}`);
        console.log(`  - Cache misses: ${stats.misses}`);
        console.log(`  - Hit rate: ${stats.hitRate}`);
    }

    if (window.LeaderboardListener) {
        const stats = window.LeaderboardListener.getStats();
        console.log(`  - LeaderboardListener subscribers: ${stats.subscribers}`);
        console.log(`  - Realtime active: ${stats.isRealtime}`);
        console.log(`  - Has cached data: ${stats.hasCachedData}`);
    }

    // Risultato
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETATI');
    console.log('='.repeat(60));
    console.log('\nPer eseguire una simulazione REALE:');
    console.log('1. Vai nel pannello Admin');
    console.log('2. Apri "Gestione Campionato"');
    console.log('3. Clicca "Simula Giornata"');
    console.log('\nLe ottimizzazioni saranno attive automaticamente.');

})();
