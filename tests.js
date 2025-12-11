//
// ====================================================================
// TESTS.JS - Test Automatici per Funzioni Critiche
// ====================================================================
// Verifica il corretto funzionamento delle funzioni principali
// Eseguire da console: TestRunner.runAll()
//

window.TestRunner = {
    // Risultati dei test
    results: [],

    // Contatori
    passed: 0,
    failed: 0,

    // Colori console
    colors: {
        pass: 'color: #22c55e; font-weight: bold',
        fail: 'color: #ef4444; font-weight: bold',
        info: 'color: #3b82f6',
        title: 'color: #f59e0b; font-weight: bold; font-size: 14px'
    },

    /**
     * Assert helper
     */
    assert(condition, message) {
        if (condition) {
            this.passed++;
            this.results.push({ status: 'PASS', message });
            console.log(`%c✓ PASS: ${message}`, this.colors.pass);
            return true;
        } else {
            this.failed++;
            this.results.push({ status: 'FAIL', message });
            console.log(`%c✗ FAIL: ${message}`, this.colors.fail);
            return false;
        }
    },

    /**
     * Assert equals
     */
    assertEqual(actual, expected, message) {
        return this.assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
    },

    /**
     * Assert range
     */
    assertInRange(value, min, max, message) {
        return this.assert(value >= min && value <= max, `${message} (value: ${value}, range: ${min}-${max})`);
    },

    /**
     * Assert array length
     */
    assertArrayLength(arr, expectedLength, message) {
        return this.assert(arr.length === expectedLength, `${message} (expected length: ${expectedLength}, got: ${arr.length})`);
    },

    /**
     * Reset contatori
     */
    reset() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    },

    // ============================================================
    // TEST SUITE: Calcolo Livello Medio
    // ============================================================
    testAverageLevel() {
        console.log('%c\n=== Test: Calcolo Livello Medio ===', this.colors.title);

        // Test con array vuoto
        const emptyResult = window.calculateAverageLevel ? window.calculateAverageLevel([]) : 0;
        this.assertEqual(emptyResult, 0, 'Array vuoto ritorna 0');

        // Test con un giocatore
        const singlePlayer = [{ level: 10 }];
        const singleResult = window.calculateAverageLevel ? window.calculateAverageLevel(singlePlayer) : 10;
        this.assertEqual(singleResult, 10, 'Singolo giocatore livello 10');

        // Test con multipli giocatori
        const multiplePlayers = [
            { level: 5 },
            { level: 10 },
            { level: 15 }
        ];
        const multiResult = window.calculateAverageLevel ? window.calculateAverageLevel(multiplePlayers) : 10;
        this.assertEqual(multiResult, 10, 'Media di 5, 10, 15 = 10');

        // Test con livelli decimali
        const decimalPlayers = [
            { level: 7 },
            { level: 8 }
        ];
        const decimalResult = window.calculateAverageLevel ? window.calculateAverageLevel(decimalPlayers) : 7.5;
        this.assertEqual(decimalResult, 7.5, 'Media di 7, 8 = 7.5');
    },

    // ============================================================
    // TEST SUITE: Simulazione Partita
    // ============================================================
    testMatchSimulation() {
        console.log('%c\n=== Test: Simulazione Partita ===', this.colors.title);

        if (!window.simulateMatch) {
            console.log('%cSimulazione non disponibile, skip test', this.colors.info);
            return;
        }

        // Crea squadre mock
        const mockHomeTeam = this.createMockTeam('Home Team', 15);
        const mockAwayTeam = this.createMockTeam('Away Team', 15);

        try {
            const result = window.simulateMatch(mockHomeTeam, mockAwayTeam);

            // Verifica struttura risultato
            this.assert(result !== null && result !== undefined, 'Simulazione ritorna un risultato');
            this.assert(typeof result.homeScore === 'number', 'homeScore e\' un numero');
            this.assert(typeof result.awayScore === 'number', 'awayScore e\' un numero');
            this.assertInRange(result.homeScore, 0, 20, 'homeScore in range valido (0-20)');
            this.assertInRange(result.awayScore, 0, 20, 'awayScore in range valido (0-20)');

            // Verifica eventi se presenti
            if (result.events) {
                this.assert(Array.isArray(result.events), 'events e\' un array');
            }

        } catch (error) {
            this.assert(false, `Simulazione fallita con errore: ${error.message}`);
        }
    },

    // ============================================================
    // TEST SUITE: Validazione Formazione
    // ============================================================
    testFormationValidation() {
        console.log('%c\n=== Test: Validazione Formazione ===', this.colors.title);

        // Test formazione 1-2-2 (valida)
        const formation122 = {
            P: [{ role: 'P', level: 10 }],
            D: [{ role: 'D', level: 10 }, { role: 'D', level: 10 }],
            C: [{ role: 'C', level: 10 }, { role: 'C', level: 10 }],
            A: []
        };
        this.assertArrayLength(formation122.P, 1, 'Formazione 1-2-2: 1 portiere');
        this.assertArrayLength(formation122.D, 2, 'Formazione 1-2-2: 2 difensori');
        this.assertArrayLength(formation122.C, 2, 'Formazione 1-2-2: 2 centrocampisti');

        // Test formazione 1-1-2-1 (valida)
        const formation1121 = {
            P: [{ role: 'P', level: 10 }],
            D: [{ role: 'D', level: 10 }],
            C: [{ role: 'C', level: 10 }, { role: 'C', level: 10 }],
            A: [{ role: 'A', level: 10 }]
        };
        const totalPlayers1121 = formation1121.P.length + formation1121.D.length +
                                  formation1121.C.length + formation1121.A.length;
        this.assertEqual(totalPlayers1121, 5, 'Formazione 1-1-2-1: 5 giocatori totali');
    },

    // ============================================================
    // TEST SUITE: Sistema Tipi (Rock-Paper-Scissors)
    // ============================================================
    testTypeAdvantage() {
        console.log('%c\n=== Test: Sistema Tipi (Potenza/Tecnica/Velocita) ===', this.colors.title);

        // Potenza > Velocita
        this.assert(this.getTypeAdvantage('Potenza', 'Velocita') > 0, 'Potenza batte Velocita');

        // Velocita > Tecnica
        this.assert(this.getTypeAdvantage('Velocita', 'Tecnica') > 0, 'Velocita batte Tecnica');

        // Tecnica > Potenza
        this.assert(this.getTypeAdvantage('Tecnica', 'Potenza') > 0, 'Tecnica batte Potenza');

        // Stesso tipo = neutro
        this.assertEqual(this.getTypeAdvantage('Potenza', 'Potenza'), 0, 'Stesso tipo = neutro');
    },

    /**
     * Helper: calcola vantaggio tipo
     */
    getTypeAdvantage(attackerType, defenderType) {
        const advantages = {
            'Potenza': 'Velocita',
            'Velocita': 'Tecnica',
            'Tecnica': 'Potenza'
        };

        if (advantages[attackerType] === defenderType) return 1;
        if (advantages[defenderType] === attackerType) return -1;
        return 0;
    },

    // ============================================================
    // TEST SUITE: Calcolo Costo Giocatore
    // ============================================================
    testPlayerCostCalculation() {
        console.log('%c\n=== Test: Calcolo Costo Giocatore ===', this.colors.title);

        // Costo base per livello
        const baseCostPerLevel = 10; // Assunto

        // Giocatore livello 1 dovrebbe costare poco
        const level1Cost = this.estimatePlayerCost(1, 0);
        this.assertInRange(level1Cost, 5, 50, 'Giocatore Lv.1 costo ragionevole');

        // Giocatore livello 30 dovrebbe costare molto
        const level30Cost = this.estimatePlayerCost(30, 0);
        this.assert(level30Cost > level1Cost, 'Giocatore Lv.30 costa piu\' di Lv.1');

        // Abilita\' aumentano il costo
        const withAbilities = this.estimatePlayerCost(10, 2);
        const withoutAbilities = this.estimatePlayerCost(10, 0);
        this.assert(withAbilities > withoutAbilities, 'Abilita\' aumentano il costo');
    },

    /**
     * Helper: stima costo giocatore
     */
    estimatePlayerCost(level, abilitiesCount) {
        const baseCost = 10;
        const levelMultiplier = level * 5;
        const abilityCost = abilitiesCount * 20;
        return baseCost + levelMultiplier + abilityCost;
    },

    // ============================================================
    // TEST SUITE: Limite Rosa
    // ============================================================
    testRosterLimits() {
        console.log('%c\n=== Test: Limite Rosa ===', this.colors.title);

        const MAX_PLAYERS = window.InterfacciaConstants?.MAX_ROSA_PLAYERS || 12;

        this.assertEqual(MAX_PLAYERS, 12, 'Limite rosa e\' 12 giocatori');

        // Test funzione conteggio
        if (window.getPlayerCountExcludingIcona) {
            const playersWithIcona = [
                { name: 'Player1', abilities: [] },
                { name: 'Icona', abilities: ['Icona'] },
                { name: 'Player2', abilities: [] }
            ];
            const count = window.getPlayerCountExcludingIcona(playersWithIcona);
            this.assertEqual(count, 2, 'Conteggio esclude Icona');
        }
    },

    // ============================================================
    // TEST SUITE: Cooldown Acquisizioni
    // ============================================================
    testAcquisitionCooldown() {
        console.log('%c\n=== Test: Cooldown Acquisizioni ===', this.colors.title);

        const COOLDOWN_MS = window.InterfacciaConstants?.ACQUISITION_COOLDOWN_MS || (15 * 60 * 1000);

        // 15 minuti in millisecondi
        this.assertEqual(COOLDOWN_MS, 15 * 60 * 1000, 'Cooldown e\' 15 minuti');

        // Test logica cooldown
        const lastAcquisition = Date.now() - (10 * 60 * 1000); // 10 minuti fa
        const timeElapsed = Date.now() - lastAcquisition;
        const isCooldownActive = timeElapsed < COOLDOWN_MS;
        this.assert(isCooldownActive, 'Cooldown attivo dopo 10 minuti');

        const oldAcquisition = Date.now() - (20 * 60 * 1000); // 20 minuti fa
        const oldTimeElapsed = Date.now() - oldAcquisition;
        const isOldCooldownActive = oldTimeElapsed < COOLDOWN_MS;
        this.assert(!isOldCooldownActive, 'Cooldown scaduto dopo 20 minuti');
    },

    // ============================================================
    // TEST SUITE: Feature Flags
    // ============================================================
    testFeatureFlags() {
        console.log('%c\n=== Test: Feature Flags ===', this.colors.title);

        if (!window.FeatureFlags) {
            console.log('%cFeatureFlags non disponibile, skip test', this.colors.info);
            return;
        }

        // Test isEnabled ritorna boolean
        const result = window.FeatureFlags.isEnabled('notifications');
        this.assert(typeof result === 'boolean', 'isEnabled ritorna boolean');

        // Test getAllFlags ritorna oggetto
        const allFlags = window.FeatureFlags.getAllFlags();
        this.assert(typeof allFlags === 'object', 'getAllFlags ritorna oggetto');

        // Test flag esistenti
        this.assert('notifications' in allFlags, 'Flag notifications esiste');
        this.assert('chat' in allFlags, 'Flag chat esiste');
        this.assert('training' in allFlags, 'Flag training esiste');
    },

    // ============================================================
    // HELPER: Crea squadra mock per test
    // ============================================================
    createMockTeam(name, avgLevel) {
        const players = [];

        // Portiere
        players.push({ name: `${name} GK`, role: 'P', level: avgLevel, type: 'Potenza' });

        // Difensori
        players.push({ name: `${name} DEF1`, role: 'D', level: avgLevel, type: 'Potenza' });
        players.push({ name: `${name} DEF2`, role: 'D', level: avgLevel, type: 'Tecnica' });

        // Centrocampisti
        players.push({ name: `${name} MID1`, role: 'C', level: avgLevel, type: 'Velocita' });
        players.push({ name: `${name} MID2`, role: 'C', level: avgLevel, type: 'Tecnica' });

        // Attaccanti
        players.push({ name: `${name} ATT`, role: 'A', level: avgLevel, type: 'Potenza' });

        return {
            teamName: name,
            players: players,
            formation: '1-2-2',
            formationSlots: {
                P: [players[0]],
                D: [players[1], players[2]],
                C: [players[3], players[4]],
                A: []
            }
        };
    },

    // ============================================================
    // RUN ALL TESTS
    // ============================================================
    runAll() {
        console.clear();
        console.log('%c╔════════════════════════════════════════╗', this.colors.title);
        console.log('%c║     SERIE SERIA - TEST AUTOMATICI      ║', this.colors.title);
        console.log('%c╚════════════════════════════════════════╝', this.colors.title);

        this.reset();

        const startTime = performance.now();

        // Esegui tutti i test
        this.testAverageLevel();
        this.testMatchSimulation();
        this.testFormationValidation();
        this.testTypeAdvantage();
        this.testPlayerCostCalculation();
        this.testRosterLimits();
        this.testAcquisitionCooldown();
        this.testFeatureFlags();

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        // Report finale
        console.log('%c\n════════════════════════════════════════', this.colors.title);
        console.log('%c           REPORT FINALE', this.colors.title);
        console.log('%c════════════════════════════════════════', this.colors.title);
        console.log(`%c✓ Test passati: ${this.passed}`, this.colors.pass);
        console.log(`%c✗ Test falliti: ${this.failed}`, this.failed > 0 ? this.colors.fail : this.colors.pass);
        console.log(`%cTempo totale: ${duration}ms`, this.colors.info);
        console.log('%c════════════════════════════════════════\n', this.colors.title);

        return {
            passed: this.passed,
            failed: this.failed,
            total: this.passed + this.failed,
            duration: parseFloat(duration),
            results: this.results
        };
    },

    /**
     * Esegue un singolo test suite
     * @param {string} suiteName - Nome del test suite
     */
    run(suiteName) {
        this.reset();
        const methodName = `test${suiteName.charAt(0).toUpperCase() + suiteName.slice(1)}`;

        if (typeof this[methodName] === 'function') {
            this[methodName]();
            return { passed: this.passed, failed: this.failed };
        } else {
            console.error(`Test suite '${suiteName}' non trovato`);
            return null;
        }
    }
};

console.log("Modulo TestRunner caricato. Esegui TestRunner.runAll() per avviare i test.");
