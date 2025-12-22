//
// ====================================================================
// MODULO STADIUM.JS - Gestione Stadio e Bonus Casa
// ====================================================================
//
// Permette agli utenti di costruire strutture nello stadio per ottenere
// bonus nelle partite in casa.
//

window.Stadium = {

    // ========================================
    // CONFIGURAZIONE STRUTTURE
    // ========================================

    // Livello massimo per strutture standard
    MAX_STRUCTURE_LEVEL: 3,

    // Moltiplicatori bonus per livello: Lv.1 = 1x, Lv.2 = 1.25x, Lv.3 = 1.5x
    LEVEL_BONUS_MULTIPLIERS: [1, 1.25, 1.5],

    // Moltiplicatori costo per livello: Lv.1 = 1x, Lv.2 = 2x, Lv.3 = 3x
    LEVEL_COST_MULTIPLIERS: [1, 2, 3],

    STRUCTURES: {
        // Tribune (4 slot) - ai 4 lati del campo
        tribune_north: {
            id: 'tribune_north',
            name: 'Tribuna Nord',
            type: 'tribune',
            position: 'north',
            cost: 250,
            bonus: 0.08,
            maxLevel: 3,
            icon: '🏛️',
            requires: null,
            description: 'Tribuna per i tifosi sul lato nord'
        },
        tribune_south: {
            id: 'tribune_south',
            name: 'Tribuna Sud',
            type: 'tribune',
            position: 'south',
            cost: 250,
            bonus: 0.08,
            maxLevel: 3,
            icon: '🏛️',
            requires: null,
            description: 'Tribuna per i tifosi sul lato sud'
        },
        tribune_east: {
            id: 'tribune_east',
            name: 'Tribuna Est',
            type: 'tribune',
            position: 'east',
            cost: 250,
            bonus: 0.08,
            maxLevel: 3,
            icon: '🏛️',
            requires: null,
            description: 'Tribuna dietro la porta est'
        },
        tribune_west: {
            id: 'tribune_west',
            name: 'Tribuna Ovest',
            type: 'tribune',
            position: 'west',
            cost: 250,
            bonus: 0.08,
            maxLevel: 3,
            icon: '🏛️',
            requires: null,
            description: 'Tribuna dietro la porta ovest'
        },

        // Fari (4 slot) - agli angoli, richiedono tribune adiacenti
        light_ne: {
            id: 'light_ne',
            name: 'Faro Nord-Est',
            type: 'light',
            position: 'ne',
            cost: 250,
            bonus: 0.06,
            maxLevel: 3,
            icon: '💡',
            requires: ['tribune_north', 'tribune_east'],
            description: 'Illuminazione angolo nord-est'
        },
        light_nw: {
            id: 'light_nw',
            name: 'Faro Nord-Ovest',
            type: 'light',
            position: 'nw',
            cost: 250,
            bonus: 0.06,
            maxLevel: 3,
            icon: '💡',
            requires: ['tribune_north', 'tribune_west'],
            description: 'Illuminazione angolo nord-ovest'
        },
        light_se: {
            id: 'light_se',
            name: 'Faro Sud-Est',
            type: 'light',
            position: 'se',
            cost: 250,
            bonus: 0.06,
            maxLevel: 3,
            icon: '💡',
            requires: ['tribune_south', 'tribune_east'],
            description: 'Illuminazione angolo sud-est'
        },
        light_sw: {
            id: 'light_sw',
            name: 'Faro Sud-Ovest',
            type: 'light',
            position: 'sw',
            cost: 250,
            bonus: 0.06,
            maxLevel: 3,
            icon: '💡',
            requires: ['tribune_south', 'tribune_west'],
            description: 'Illuminazione angolo sud-ovest'
        },

        // Tabelloni (2 slot) - esterni alle porte
        scoreboard_east: {
            id: 'scoreboard_east',
            name: 'Tabellone Est',
            type: 'scoreboard',
            position: 'east_outer',
            cost: 250,
            bonus: 0.06,
            maxLevel: 3,
            icon: '📺',
            requires: null,
            description: 'Tabellone segnapunti lato est'
        },
        scoreboard_west: {
            id: 'scoreboard_west',
            name: 'Tabellone Ovest',
            type: 'scoreboard',
            position: 'west_outer',
            cost: 250,
            bonus: 0.06,
            maxLevel: 3,
            icon: '📺',
            requires: null,
            description: 'Tabellone segnapunti lato ovest'
        },

        // Area Media & VIP (2 slot) - premium
        media_north: {
            id: 'media_north',
            name: 'Tribuna Stampa',
            type: 'media',
            position: 'north_inner',
            cost: 500,
            bonus: 0.15,
            maxLevel: 3,
            icon: '🎙️',
            requires: ['tribune_north'],
            description: 'Area stampa e commentatori'
        },
        media_south: {
            id: 'media_south',
            name: 'Box VIP',
            type: 'media',
            position: 'south_inner',
            cost: 500,
            bonus: 0.15,
            maxLevel: 3,
            icon: '👔',
            requires: ['tribune_south'],
            description: 'Area VIP e hospitality'
        },

        // Panchine (2 slot) - a bordo campo
        bench_left: {
            id: 'bench_left',
            name: 'Panchina Sinistra',
            type: 'bench',
            position: 'left',
            cost: 250,
            bonus: 0.06,
            maxLevel: 3,
            icon: '🪑',
            requires: null,
            description: 'Panchina squadra di casa'
        },
        bench_right: {
            id: 'bench_right',
            name: 'Panchina Destra',
            type: 'bench',
            position: 'right',
            cost: 250,
            bonus: 0.06,
            maxLevel: 3,
            icon: '🪑',
            requires: null,
            description: 'Panchina squadra ospite'
        },

        // ========================================
        // NUOVE STRUTTURE
        // ========================================

        // Centro Medico - riduce giornate infortunio
        medical_center: {
            id: 'medical_center',
            name: 'Centro Medico',
            type: 'facility',
            position: 'facility_1',
            cost: 750,
            bonus: 0,
            maxLevel: 3,
            icon: '🏥',
            requires: ['locker_room_1'], // Richiede Spogliatoi Lv.1
            description: '-1/-1/-2 giornate infortunio (min 1)',
            specialEffect: 'injury_reduction'
        },

        // Palestra - bonus allenamento
        gym: {
            id: 'gym',
            name: 'Palestra',
            type: 'facility',
            position: 'facility_2',
            cost: 500,
            bonus: 0,
            maxLevel: 3,
            icon: '🏋️',
            requires: ['locker_room_2'], // Richiede Spogliatoi Lv.2
            description: '+2% bonus EXP allenamento',
            specialEffect: 'training_bonus'
        },

        // Sala Tattica - bonus partite
        tactical_room: {
            id: 'tactical_room',
            name: 'Sala Tattica',
            type: 'facility',
            position: 'facility_3',
            cost: 600,
            bonus: 0.10,
            maxLevel: 3,
            icon: '📋',
            requires: ['media_north'],
            description: 'Bonus tattico nelle partite in casa',
            specialEffect: 'tactical_bonus'
        },

        // Area Riscaldamento - riduce malus forma
        warmup_area: {
            id: 'warmup_area',
            name: 'Area Riscaldamento',
            type: 'bench',
            position: 'warmup',
            cost: 300,
            bonus: 0.04,
            maxLevel: 3,
            icon: '🔥',
            requires: ['bench_left', 'bench_right'],
            description: 'Annulla 0.25/0.50/0.75 malus forma',
            specialEffect: 'form_bonus'
        },

        // Negozio Ufficiale - entrate passive
        shop: {
            id: 'shop',
            name: 'Negozio Ufficiale',
            type: 'commercial',
            position: 'commercial_1',
            cost: 800,
            bonus: 0,
            maxLevel: 3,
            icon: '🛒',
            requires: null,
            description: '+50 CS/settimana (passivo)',
            specialEffect: 'passive_income'
        },

        // Museo del Club - prestigio
        museum: {
            id: 'museum',
            name: 'Museo del Club',
            type: 'prestige',
            position: 'prestige_1',
            cost: 1000,
            bonus: 0,
            maxLevel: 3,
            icon: '🏛️',
            requires: null,
            description: 'Sblocca Hall of Fame e Storia Club',
            specialEffect: 'prestige'
        },

        // Sala Conferenze - media
        conference_room: {
            id: 'conference_room',
            name: 'Sala Conferenze',
            type: 'media',
            position: 'media_extra',
            cost: 400,
            bonus: 0.06,
            maxLevel: 3,
            icon: '🎤',
            requires: ['media_north'],
            description: 'Bonus eventi stampa'
        },

        // Copertura Stadio - premium
        stadium_roof: {
            id: 'stadium_roof',
            name: 'Copertura Stadio',
            type: 'premium',
            position: 'roof',
            cost: 2000,
            bonus: 0.58,
            maxLevel: 3,
            icon: '🏟️',
            requires: ['tribune_north', 'tribune_south', 'tribune_east', 'tribune_west'],
            description: 'Copertura totale dello stadio'
        },

        // Maxischermo Centrale - premium
        giant_screen: {
            id: 'giant_screen',
            name: 'Maxischermo Centrale',
            type: 'tech',
            position: 'center_screen',
            cost: 1500,
            bonus: 0.30,
            maxLevel: 3,
            icon: '📺',
            requires: ['scoreboard_east', 'scoreboard_west'],
            description: 'Maxischermo centrale HD'
        },

        // Settore Ultras - tifosi
        ultras_section: {
            id: 'ultras_section',
            name: 'Settore Ultras',
            type: 'fans',
            position: 'ultras',
            cost: 750,
            bonus: 0.25,
            maxLevel: 3,
            icon: '🎺',
            requires: ['tribune_north', 'light_ne', 'light_nw'],
            description: 'Settore dedicato ai tifosi piu caldi'
        },

        // Centro Scouting - bonus trasferta
        scouting_center: {
            id: 'scouting_center',
            name: 'Centro Scouting',
            type: 'premium',
            position: 'scouting',
            cost: 2500,
            bonus: 0, // Non da bonus casa
            maxLevel: 3,
            icon: '🔭',
            requires: ['tactical_room'], // Richiede Sala Tattica
            description: 'Bonus nelle partite in trasferta',
            specialEffect: 'away_bonus'
        },

        // Centro degli Osservatori - sconto mercato
        observers_center: {
            id: 'observers_center',
            name: 'Centro degli Osservatori',
            type: 'premium',
            position: 'observers',
            cost: 2500,
            bonus: 0, // Non da bonus casa
            maxLevel: 3,
            icon: '👁️',
            requires: ['tactical_room'], // Richiede Sala Tattica
            description: '-5/-10/-15% costo giocatori mercato',
            specialEffect: 'market_discount'
        }
    },

    // ========================================
    // STRUTTURE MIGLIORABILI (con livelli)
    // ========================================

    UPGRADEABLE: {
        locker_room: {
            id: 'locker_room',
            name: 'Spogliatoi',
            type: 'facility',
            icon: '🚿',
            maxLevel: 5,
            // Costi per ogni livello (1000, 2000, 3000, 4000, 5000)
            costs: [1000, 2000, 3000, 4000, 5000],
            // Bonus EXP per ogni livello (+5% per livello)
            expBonus: [0.05, 0.10, 0.15, 0.20, 0.25],
            description: 'Bonus EXP per giocatori e allenatori',
            getBonusText(level) {
                if (level <= 0) return 'Non costruito';
                return `+${level * 5}% EXP guadagnata`;
            }
        }
    },

    // ========================================
    // STATO LOCALE
    // ========================================

    _currentStadium: null,
    _currentTeamId: null,

    // ========================================
    // METODI PRINCIPALI
    // ========================================

    /**
     * Verifica se il feature flag stadium e' abilitato
     */
    isEnabled() {
        return window.FeatureFlags?.isEnabled?.('stadium') || false;
    },

    /**
     * Carica i dati dello stadio di una squadra
     * @param {string} teamId - ID della squadra
     * @returns {Object} Dati stadio
     */
    async loadStadium(teamId) {
        if (!teamId || !window.db || !window.firestoreTools) {
            console.warn('[Stadium] Impossibile caricare: parametri mancanti');
            return this.getDefaultStadium();
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;

            const teamRef = doc(window.db, teamPath);
            const teamDoc = await getDoc(teamRef);

            if (teamDoc.exists()) {
                const data = teamDoc.data();
                this._currentStadium = data.stadium || this.getDefaultStadium();
                this._currentTeamId = teamId;
                return this._currentStadium;
            }

            return this.getDefaultStadium();
        } catch (error) {
            console.error('[Stadium] Errore caricamento:', error);
            return this.getDefaultStadium();
        }
    },

    /**
     * Restituisce lo stadio di default (vuoto)
     */
    getDefaultStadium() {
        return {
            built: {},  // Oggetto { structureId: level } - es. { tribune_north: 2, light_ne: 1 }
            totalBonus: 0,
            lastUpdated: null
        };
    },

    /**
     * Migra i dati stadio dal vecchio formato (array) al nuovo (oggetto con livelli)
     * @param {Object} stadiumData - Dati stadio da migrare
     * @returns {Object} Dati stadio migrati
     */
    migrateStadiumData(stadiumData) {
        if (!stadiumData) return this.getDefaultStadium();

        // Se built e' gia' un oggetto, non serve migrazione
        if (stadiumData.built && typeof stadiumData.built === 'object' && !Array.isArray(stadiumData.built)) {
            return stadiumData;
        }

        // Migra da array a oggetto
        const migratedBuilt = {};
        if (Array.isArray(stadiumData.built)) {
            for (const structureId of stadiumData.built) {
                migratedBuilt[structureId] = 1; // Tutte le strutture esistenti partono da Lv.1
            }
        }

        console.log('[Stadium] Migrati dati stadio da array a oggetto:', migratedBuilt);

        return {
            ...stadiumData,
            built: migratedBuilt,
            totalBonus: this.calculateTotalBonus(migratedBuilt)
        };
    },

    /**
     * Salva lo stadio su Firestore
     * @param {string} teamId - ID della squadra
     * @param {Object} stadiumData - Dati stadio da salvare
     */
    async saveStadium(teamId, stadiumData) {
        if (!teamId || !window.db || !window.firestoreTools) {
            console.error('[Stadium] Impossibile salvare: parametri mancanti');
            return false;
        }

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;

            const teamRef = doc(window.db, teamPath);
            await updateDoc(teamRef, {
                stadium: {
                    ...stadiumData,
                    lastUpdated: new Date().toISOString()
                }
            });

            this._currentStadium = stadiumData;
            console.log('[Stadium] Salvato con successo');
            return true;
        } catch (error) {
            console.error('[Stadium] Errore salvataggio:', error);
            return false;
        }
    },

    /**
     * Verifica se una struttura e' gia costruita (livello >= 1)
     * @param {string} structureId - ID struttura
     * @param {Object} stadiumData - Dati stadio (opzionale, usa cached)
     */
    isBuilt(structureId, stadiumData = null) {
        const stadium = stadiumData || this._currentStadium;
        if (!stadium || !stadium.built) return false;

        // Supporto retrocompatibilita: array o oggetto
        if (Array.isArray(stadium.built)) {
            return stadium.built.includes(structureId);
        }
        return (stadium.built[structureId] || 0) >= 1;
    },

    /**
     * Ottiene il livello di una struttura
     * @param {string} structureId - ID struttura
     * @param {Object} stadiumData - Dati stadio (opzionale)
     * @returns {number} Livello (0 = non costruita)
     */
    getStructureLevel(structureId, stadiumData = null) {
        const stadium = stadiumData || this._currentStadium;
        if (!stadium || !stadium.built) return 0;

        // Supporto retrocompatibilita
        if (Array.isArray(stadium.built)) {
            return stadium.built.includes(structureId) ? 1 : 0;
        }
        return stadium.built[structureId] || 0;
    },

    /**
     * Calcola il bonus di una struttura in base al suo livello
     * @param {string} structureId - ID struttura
     * @param {number} level - Livello struttura
     * @returns {number} Bonus calcolato
     */
    calculateStructureBonus(structureId, level) {
        if (level <= 0) return 0;

        const structure = this.STRUCTURES[structureId];
        if (!structure || !structure.bonus) return 0;

        // Applica moltiplicatore livello: Lv.1 = 1x, Lv.2 = 1.25x, Lv.3 = 1.5x
        const multiplier = this.LEVEL_BONUS_MULTIPLIERS[level - 1] || 1;
        return structure.bonus * multiplier;
    },

    /**
     * Calcola il costo per costruire/migliorare una struttura a un dato livello
     * @param {string} structureId - ID struttura
     * @param {number} targetLevel - Livello target (1, 2, o 3)
     * @returns {number} Costo
     */
    getUpgradeCost(structureId, targetLevel) {
        const structure = this.STRUCTURES[structureId];
        if (!structure) return 0;

        // Costo base * moltiplicatore livello: Lv.1 = 1x, Lv.2 = 2x, Lv.3 = 3x
        const multiplier = this.LEVEL_COST_MULTIPLIERS[targetLevel - 1] || 1;
        return structure.cost * multiplier;
    },

    /**
     * Verifica se i prerequisiti di una struttura sono soddisfatti
     * @param {string} structureId - ID struttura
     * @param {Object} stadiumData - Dati stadio (opzionale)
     */
    canBuild(structureId, stadiumData = null) {
        const structure = this.STRUCTURES[structureId];
        if (!structure) return { canBuild: false, reason: 'Struttura non trovata' };

        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();

        // Gia costruita?
        if (this.isBuilt(structureId, stadium)) {
            return { canBuild: false, reason: 'Gia costruita' };
        }

        // Verifica prerequisiti
        if (structure.requires && structure.requires.length > 0) {
            const missingReqs = [];

            for (const req of structure.requires) {
                // Gestione speciale per requisiti spogliatoi (es. 'locker_room_1', 'locker_room_2')
                if (req.startsWith('locker_room_')) {
                    const requiredLevel = parseInt(req.split('_')[2]) || 1;
                    const lockerRoom = stadium.lockerRoom || { level: 0 };
                    if (lockerRoom.level < requiredLevel) {
                        missingReqs.push(`Spogliatoi Lv.${requiredLevel}`);
                    }
                } else {
                    // Requisito normale: struttura deve essere costruita (livello >= 1)
                    if (!this.isBuilt(req, stadium)) {
                        missingReqs.push(this.STRUCTURES[req]?.name || req);
                    }
                }
            }

            if (missingReqs.length > 0) {
                return {
                    canBuild: false,
                    reason: `Richiede: ${missingReqs.join(', ')}`,
                    missing: missingReqs
                };
            }
        }

        return { canBuild: true, reason: null };
    },

    /**
     * Verifica se una struttura puo essere migliorata
     * @param {string} structureId - ID struttura
     * @param {number} currentBudget - Budget disponibile
     * @param {Object} stadiumData - Dati stadio (opzionale)
     */
    canUpgradeStructure(structureId, currentBudget, stadiumData = null) {
        const structure = this.STRUCTURES[structureId];
        if (!structure) return { canUpgrade: false, reason: 'Struttura non trovata' };

        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();
        const currentLevel = this.getStructureLevel(structureId, stadium);

        // Non costruita?
        if (currentLevel <= 0) {
            return { canUpgrade: false, reason: 'Non costruita' };
        }

        // Gia al massimo?
        const maxLevel = structure.maxLevel || this.MAX_STRUCTURE_LEVEL;
        if (currentLevel >= maxLevel) {
            return { canUpgrade: false, reason: 'Livello massimo raggiunto' };
        }

        // Calcola costo upgrade
        const nextLevel = currentLevel + 1;
        const upgradeCost = this.getUpgradeCost(structureId, nextLevel);

        // Verifica budget
        if (currentBudget < upgradeCost) {
            return {
                canUpgrade: false,
                reason: `Fondi insufficienti. Richiesti: ${upgradeCost} CS`
            };
        }

        return {
            canUpgrade: true,
            reason: null,
            currentLevel: currentLevel,
            nextLevel: nextLevel,
            upgradeCost: upgradeCost
        };
    },

    /**
     * Costruisce una struttura (livello 1)
     * @param {string} teamId - ID squadra
     * @param {string} structureId - ID struttura da costruire
     * @param {number} currentBudget - Budget attuale della squadra
     * @returns {Object} Risultato operazione
     */
    async buildStructure(teamId, structureId, currentBudget) {
        const structure = this.STRUCTURES[structureId];
        if (!structure) {
            return { success: false, error: 'Struttura non trovata' };
        }

        // Carica stadio se necessario
        if (!this._currentStadium || this._currentTeamId !== teamId) {
            await this.loadStadium(teamId);
        }

        // Migra dati se necessario
        this._currentStadium = this.migrateStadiumData(this._currentStadium);

        // Verifica prerequisiti
        const canBuildResult = this.canBuild(structureId);
        if (!canBuildResult.canBuild) {
            return { success: false, error: canBuildResult.reason };
        }

        // Costo per livello 1
        const cost = this.getUpgradeCost(structureId, 1);

        // Verifica budget
        if (currentBudget < cost) {
            return {
                success: false,
                error: `Fondi insufficienti. Richiesti: ${cost} CS, disponibili: ${currentBudget} CS`
            };
        }

        // Costruisci a livello 1
        const newBuilt = { ...(this._currentStadium.built || {}), [structureId]: 1 };
        const newBonus = this.calculateTotalBonus(newBuilt);

        const newStadiumData = {
            ...this._currentStadium,
            built: newBuilt,
            totalBonus: newBonus
        };

        // Salva su Firestore
        const saved = await this.saveStadium(teamId, newStadiumData);
        if (!saved) {
            return { success: false, error: 'Errore salvataggio' };
        }

        // Sottrai costo dal budget della squadra
        try {
            const { doc, updateDoc, increment } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
            const teamRef = doc(window.db, teamPath);

            await updateDoc(teamRef, {
                budget: increment(-cost)
            });
        } catch (error) {
            console.error('[Stadium] Errore sottrazione budget:', error);
            // Rollback stadio
            await this.saveStadium(teamId, this._currentStadium);
            return { success: false, error: 'Errore sottrazione crediti' };
        }

        return {
            success: true,
            structure: structure,
            level: 1,
            newBonus: newBonus,
            costPaid: cost
        };
    },

    /**
     * Migliora una struttura esistente al livello successivo
     * @param {string} teamId - ID squadra
     * @param {string} structureId - ID struttura da migliorare
     * @param {number} currentBudget - Budget attuale della squadra
     * @returns {Object} Risultato operazione
     */
    async upgradeStructure(teamId, structureId, currentBudget) {
        const structure = this.STRUCTURES[structureId];
        if (!structure) {
            return { success: false, error: 'Struttura non trovata' };
        }

        // Carica stadio se necessario
        if (!this._currentStadium || this._currentTeamId !== teamId) {
            await this.loadStadium(teamId);
        }

        // Migra dati se necessario
        this._currentStadium = this.migrateStadiumData(this._currentStadium);

        // Verifica se puo essere migliorata
        const canUpgradeResult = this.canUpgradeStructure(structureId, currentBudget);
        if (!canUpgradeResult.canUpgrade) {
            return { success: false, error: canUpgradeResult.reason };
        }

        const { currentLevel, nextLevel, upgradeCost } = canUpgradeResult;

        // Migliora
        const newBuilt = { ...(this._currentStadium.built || {}), [structureId]: nextLevel };
        const newBonus = this.calculateTotalBonus(newBuilt);

        const newStadiumData = {
            ...this._currentStadium,
            built: newBuilt,
            totalBonus: newBonus
        };

        // Salva su Firestore
        const saved = await this.saveStadium(teamId, newStadiumData);
        if (!saved) {
            return { success: false, error: 'Errore salvataggio' };
        }

        // Sottrai costo dal budget della squadra
        try {
            const { doc, updateDoc, increment } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
            const teamRef = doc(window.db, teamPath);

            await updateDoc(teamRef, {
                budget: increment(-upgradeCost)
            });
        } catch (error) {
            console.error('[Stadium] Errore sottrazione budget upgrade:', error);
            // Rollback stadio
            await this.saveStadium(teamId, this._currentStadium);
            return { success: false, error: 'Errore sottrazione crediti' };
        }

        const maxLevel = structure.maxLevel || this.MAX_STRUCTURE_LEVEL;

        return {
            success: true,
            structure: structure,
            oldLevel: currentLevel,
            newLevel: nextLevel,
            newBonus: newBonus,
            costPaid: upgradeCost,
            maxed: nextLevel >= maxLevel
        };
    },

    /**
     * Verifica se una struttura puo essere demolita
     * (non deve essere prerequisito di altre strutture costruite)
     * @param {string} structureId - ID struttura
     * @param {Object} stadiumData - Dati stadio (opzionale)
     */
    canDemolish(structureId, stadiumData = null) {
        const structure = this.STRUCTURES[structureId];
        if (!structure) return { canDemolish: false, reason: 'Struttura non trovata' };

        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();

        // Non costruita?
        if (!this.isBuilt(structureId, stadium)) {
            return { canDemolish: false, reason: 'Non costruita' };
        }

        // Ottieni lista strutture costruite
        const builtIds = this._getBuiltStructureIds(stadium);

        // Verifica se altre strutture costruite dipendono da questa
        const dependents = [];
        for (const builtId of builtIds) {
            if (builtId === structureId) continue;
            const builtStructure = this.STRUCTURES[builtId];
            if (builtStructure?.requires?.includes(structureId)) {
                dependents.push(builtStructure.name);
            }
        }

        if (dependents.length > 0) {
            return {
                canDemolish: false,
                reason: `Richiesta da: ${dependents.join(', ')}`,
                dependents: dependents
            };
        }

        return { canDemolish: true, reason: null };
    },

    /**
     * Ottiene la lista degli ID strutture costruite (helper interno)
     * @param {Object} stadiumData - Dati stadio
     * @returns {Array} Array di ID strutture
     */
    _getBuiltStructureIds(stadiumData) {
        if (!stadiumData || !stadiumData.built) return [];

        if (Array.isArray(stadiumData.built)) {
            return stadiumData.built;
        }

        // Oggetto: ritorna chiavi con livello > 0
        return Object.entries(stadiumData.built)
            .filter(([_, level]) => level > 0)
            .map(([id]) => id);
    },

    /**
     * Demolisce una struttura e rimborsa il 50% del costo totale investito
     * @param {string} teamId - ID squadra
     * @param {string} structureId - ID struttura da demolire
     * @returns {Object} Risultato operazione
     */
    async demolishStructure(teamId, structureId) {
        const structure = this.STRUCTURES[structureId];
        if (!structure) {
            return { success: false, error: 'Struttura non trovata' };
        }

        // Carica stadio se necessario
        if (!this._currentStadium || this._currentTeamId !== teamId) {
            await this.loadStadium(teamId);
        }

        // Migra dati se necessario
        this._currentStadium = this.migrateStadiumData(this._currentStadium);

        // Verifica se puo essere demolita
        const canDemolishResult = this.canDemolish(structureId);
        if (!canDemolishResult.canDemolish) {
            return { success: false, error: canDemolishResult.reason };
        }

        // Ottieni livello attuale per calcolare rimborso
        const currentLevel = this.getStructureLevel(structureId);

        // Calcola costo totale investito (somma di tutti i livelli)
        let totalInvested = 0;
        for (let lvl = 1; lvl <= currentLevel; lvl++) {
            totalInvested += this.getUpgradeCost(structureId, lvl);
        }

        // Rimborso = 50% del totale investito
        const refund = Math.floor(totalInvested / 2);

        // Rimuovi struttura (imposta livello a 0 o rimuovi chiave)
        const newBuilt = { ...(this._currentStadium.built || {}) };
        delete newBuilt[structureId];

        const newBonus = this.calculateTotalBonus(newBuilt);

        const newStadiumData = {
            ...this._currentStadium,
            built: newBuilt,
            totalBonus: newBonus
        };

        // Salva su Firestore
        const saved = await this.saveStadium(teamId, newStadiumData);
        if (!saved) {
            return { success: false, error: 'Errore salvataggio' };
        }

        // Aggiungi rimborso al budget della squadra
        try {
            const { doc, updateDoc, increment } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
            const teamRef = doc(window.db, teamPath);

            await updateDoc(teamRef, {
                budget: increment(refund)
            });
        } catch (error) {
            console.error('[Stadium] Errore rimborso budget:', error);
            // Rollback stadio
            await this.saveStadium(teamId, this._currentStadium);
            return { success: false, error: 'Errore rimborso crediti' };
        }

        return {
            success: true,
            structure: structure,
            demolishedLevel: currentLevel,
            newBonus: newBonus,
            totalInvested: totalInvested,
            refund: refund
        };
    },

    /**
     * Calcola il bonus totale dalle strutture costruite
     * @param {Object|Array} builtStructures - Oggetto { structureId: level } o Array (retrocompatibilita)
     */
    calculateTotalBonus(builtStructures = {}) {
        if (!builtStructures) return 0;

        let total = 0;

        // Supporto retrocompatibilita: array o oggetto
        if (Array.isArray(builtStructures)) {
            // Vecchio formato: array di ID -> tutte a livello 1
            for (const structureId of builtStructures) {
                total += this.calculateStructureBonus(structureId, 1);
            }
        } else {
            // Nuovo formato: oggetto { structureId: level }
            for (const [structureId, level] of Object.entries(builtStructures)) {
                if (level > 0) {
                    total += this.calculateStructureBonus(structureId, level);
                }
            }
        }

        return Math.round(total * 100) / 100; // Arrotonda a 2 decimali
    },

    /**
     * Ottiene il bonus casa di una squadra (per uso in simulazione)
     * @param {string} teamId - ID squadra
     * @returns {number} Bonus casa
     */
    async getHomeBonus(teamId) {
        if (!this.isEnabled()) return 0;

        try {
            const stadium = await this.loadStadium(teamId);
            return stadium?.totalBonus || 0;
        } catch (error) {
            console.error('[Stadium] Errore getHomeBonus:', error);
            return 0;
        }
    },

    /**
     * Ottiene il bonus casa dalla cache (sincrono, per simulazione)
     * @param {Object} teamData - Dati squadra con campo stadium
     * @returns {number} Bonus casa
     */
    getHomeBonusSync(teamData) {
        if (!this.isEnabled()) return 0;
        if (!teamData?.stadium?.totalBonus) return 0;
        return teamData.stadium.totalBonus;
    },

    /**
     * Restituisce tutte le strutture raggruppate per tipo
     */
    getStructuresByType() {
        const byType = {
            tribune: [],
            light: [],
            scoreboard: [],
            media: [],
            bench: [],
            facility: [],
            commercial: [],
            prestige: [],
            premium: [],
            tech: [],
            fans: []
        };

        for (const [id, structure] of Object.entries(this.STRUCTURES)) {
            if (byType[structure.type]) {
                byType[structure.type].push({ id, ...structure });
            }
        }

        return byType;
    },

    /**
     * Restituisce statistiche stadio
     * @param {Object} stadiumData - Dati stadio
     */
    getStats(stadiumData = null) {
        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();
        const totalStructures = Object.keys(this.STRUCTURES).length;

        // Conta strutture costruite (livello >= 1)
        const builtIds = this._getBuiltStructureIds(stadium);
        const builtCount = builtIds.length;

        // Calcola livelli totali e massimi
        let totalLevels = 0;
        let maxPossibleLevels = 0;

        for (const [id, structure] of Object.entries(this.STRUCTURES)) {
            const maxLevel = structure.maxLevel || this.MAX_STRUCTURE_LEVEL;
            maxPossibleLevels += maxLevel;
            totalLevels += this.getStructureLevel(id, stadium);
        }

        // Calcola bonus massimo con tutte le strutture a livello max
        let maxBonus = 0;
        for (const [id, structure] of Object.entries(this.STRUCTURES)) {
            const maxLevel = structure.maxLevel || this.MAX_STRUCTURE_LEVEL;
            maxBonus += this.calculateStructureBonus(id, maxLevel);
        }

        return {
            built: builtCount,
            total: totalStructures,
            percentage: Math.round((builtCount / totalStructures) * 100),
            bonus: stadium.totalBonus || this.calculateTotalBonus(stadium.built),
            maxBonus: Math.round(maxBonus * 100) / 100,
            totalLevels: totalLevels,
            maxPossibleLevels: maxPossibleLevels,
            levelPercentage: Math.round((totalLevels / maxPossibleLevels) * 100)
        };
    },

    /**
     * Calcola il costo totale per completare lo stadio (tutte le strutture a livello max)
     * @param {Object} stadiumData - Dati stadio
     */
    getRemainingCost(stadiumData = null) {
        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();

        let totalCost = 0;
        for (const [id, structure] of Object.entries(this.STRUCTURES)) {
            const currentLevel = this.getStructureLevel(id, stadium);
            const maxLevel = structure.maxLevel || this.MAX_STRUCTURE_LEVEL;

            // Aggiungi costo per ogni livello mancante
            for (let lvl = currentLevel + 1; lvl <= maxLevel; lvl++) {
                totalCost += this.getUpgradeCost(id, lvl);
            }
        }
        return totalCost;
    },

    // ========================================
    // GESTIONE SPOGLIATOI (Struttura Migliorabile)
    // ========================================

    /**
     * Ottiene i dati degli spogliatoi
     * @param {Object} stadiumData - Dati stadio
     * @returns {Object} {level, expBonus, nextCost, maxed}
     */
    getLockerRoom(stadiumData = null) {
        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();
        const lockerRoom = stadium.lockerRoom || { level: 0 };
        const config = this.UPGRADEABLE.locker_room;

        const level = lockerRoom.level || 0;
        const maxed = level >= config.maxLevel;
        const expBonus = level > 0 ? config.expBonus[level - 1] : 0;
        const nextCost = maxed ? 0 : config.costs[level];

        return {
            level: level,
            expBonus: expBonus,
            expBonusPercent: Math.round(expBonus * 100),
            nextCost: nextCost,
            maxed: maxed,
            maxLevel: config.maxLevel,
            config: config
        };
    },

    /**
     * Verifica se si possono migliorare gli spogliatoi
     * @param {number} currentBudget - Budget disponibile
     * @param {Object} stadiumData - Dati stadio
     */
    canUpgradeLockerRoom(currentBudget, stadiumData = null) {
        const locker = this.getLockerRoom(stadiumData);

        if (locker.maxed) {
            return { canUpgrade: false, reason: 'Livello massimo raggiunto' };
        }

        if (currentBudget < locker.nextCost) {
            return {
                canUpgrade: false,
                reason: `Fondi insufficienti. Richiesti: ${locker.nextCost} CS`
            };
        }

        return { canUpgrade: true, reason: null };
    },

    /**
     * Migliora gli spogliatoi
     * @param {string} teamId - ID squadra
     * @param {number} currentBudget - Budget attuale
     */
    async upgradeLockerRoom(teamId, currentBudget) {
        // Carica stadio se necessario
        if (!this._currentStadium || this._currentTeamId !== teamId) {
            await this.loadStadium(teamId);
        }

        const locker = this.getLockerRoom();

        // Verifica
        const canUpgrade = this.canUpgradeLockerRoom(currentBudget);
        if (!canUpgrade.canUpgrade) {
            return { success: false, error: canUpgrade.reason };
        }

        const newLevel = locker.level + 1;
        const cost = locker.nextCost;
        const config = this.UPGRADEABLE.locker_room;
        const newExpBonus = config.expBonus[newLevel - 1];

        // Aggiorna dati stadio
        const newStadiumData = {
            ...this._currentStadium,
            lockerRoom: {
                level: newLevel,
                expBonus: newExpBonus
            }
        };

        // Salva su Firestore
        const saved = await this.saveStadium(teamId, newStadiumData);
        if (!saved) {
            return { success: false, error: 'Errore salvataggio' };
        }

        // Sottrai costo dal budget
        try {
            const { doc, updateDoc, increment } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
            const teamRef = doc(window.db, teamPath);

            await updateDoc(teamRef, {
                budget: increment(-cost)
            });
        } catch (error) {
            console.error('[Stadium] Errore sottrazione budget spogliatoi:', error);
            // Rollback
            await this.saveStadium(teamId, this._currentStadium);
            return { success: false, error: 'Errore sottrazione crediti' };
        }

        return {
            success: true,
            oldLevel: locker.level,
            newLevel: newLevel,
            expBonus: newExpBonus,
            expBonusPercent: Math.round(newExpBonus * 100),
            costPaid: cost,
            maxed: newLevel >= config.maxLevel
        };
    },

    /**
     * Ottiene il bonus EXP dagli spogliatoi (per uso in player-exp.js)
     * @param {Object} teamData - Dati squadra
     * @returns {number} Moltiplicatore EXP (es. 1.15 per +15%)
     */
    getExpBonusMultiplier(teamData) {
        if (!teamData?.stadium?.lockerRoom) return 1;
        const level = teamData.stadium.lockerRoom.level || 0;
        if (level <= 0) return 1;
        return 1 + (level * 0.05); // +5% per livello
    },

    // ========================================
    // EFFETTI SPECIALI STRUTTURE
    // ========================================

    /**
     * Verifica se una struttura con effetto speciale e' attiva
     * @param {string} effectType - Tipo effetto (injury_reduction, training_bonus, etc.)
     * @param {Object} stadiumData - Dati stadio
     * @returns {Object} { active: boolean, level: number, structureId: string }
     */
    getSpecialEffect(effectType, stadiumData = null) {
        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();

        for (const [structureId, structure] of Object.entries(this.STRUCTURES)) {
            if (structure.specialEffect === effectType) {
                const level = this.getStructureLevel(structureId, stadium);
                if (level > 0) {
                    return { active: true, level: level, structureId: structureId };
                }
            }
        }
        return { active: false, level: 0, structureId: null };
    },

    /**
     * Centro Medico: Riduce i giorni di infortunio
     * @param {Object} stadiumData - Dati stadio
     * @returns {number} Giorni da sottrarre (0-3 in base al livello)
     */
    getInjuryReduction(stadiumData = null) {
        const effect = this.getSpecialEffect('injury_reduction', stadiumData);
        if (!effect.active) return 0;
        // Lv.1 = -1, Lv.2 = -1, Lv.3 = -2 giorni
        // NOTA: Gli infortuni non possono mai andare a 0, minimo sempre 1 giornata
        const reductions = [0, 1, 1, 2]; // index 0 unused, 1-3 = livelli
        return reductions[effect.level] || 0;
    },

    /**
     * Palestra: Bonus EXP allenamento
     * @param {Object} stadiumData - Dati stadio
     * @returns {number} Moltiplicatore bonus (es. 1.02 per +2%)
     */
    getTrainingBonusMultiplier(stadiumData = null) {
        const effect = this.getSpecialEffect('training_bonus', stadiumData);
        if (!effect.active) return 1;
        // Lv.1 = +2%, Lv.2 = +4%, Lv.3 = +6%
        return 1 + (effect.level * 0.02);
    },

    /**
     * Sala Tattica: Bonus tattico nelle partite in casa
     * @param {Object} stadiumData - Dati stadio
     * @returns {number} Bonus tattico (0.1-0.3 in base al livello)
     */
    getTacticalBonus(stadiumData = null) {
        const effect = this.getSpecialEffect('tactical_bonus', stadiumData);
        if (!effect.active) return 0;
        // Lv.1 = +0.1, Lv.2 = +0.2, Lv.3 = +0.3
        return effect.level * 0.1;
    },

    /**
     * Area Riscaldamento: Annulla malus forma
     * @param {Object} stadiumData - Dati stadio
     * @returns {number} Malus forma annullato (0.25/0.50/0.75 in base al livello)
     */
    getFormMalusReduction(stadiumData = null) {
        const effect = this.getSpecialEffect('form_bonus', stadiumData);
        if (!effect.active) return 0;
        // Lv.1 = annulla 0.25, Lv.2 = annulla 0.50, Lv.3 = annulla 0.75 del malus forma
        return effect.level * 0.25;
    },

    /**
     * Negozio Ufficiale: Entrate passive settimanali
     * @param {Object} stadiumData - Dati stadio
     * @returns {number} CS guadagnati a settimana
     */
    getPassiveIncome(stadiumData = null) {
        const effect = this.getSpecialEffect('passive_income', stadiumData);
        if (!effect.active) return 0;
        // Lv.1 = 50 CS, Lv.2 = 100 CS, Lv.3 = 150 CS a settimana
        return effect.level * 50;
    },

    /**
     * Centro Scouting: Bonus nelle partite in trasferta
     * @param {Object} stadiumData - Dati stadio
     * @returns {number} Bonus trasferta (0.50/1.00/1.50 in base al livello)
     */
    getAwayBonus(stadiumData = null) {
        const effect = this.getSpecialEffect('away_bonus', stadiumData);
        if (!effect.active) return 0;
        // Lv.1 = +0.50, Lv.2 = +1.00, Lv.3 = +1.50
        return effect.level * 0.50;
    },

    /**
     * Centro degli Osservatori: Sconto sul mercato giocatori
     * @param {Object} stadiumData - Dati stadio
     * @returns {number} Percentuale sconto (0.05/0.10/0.15 in base al livello)
     */
    getMarketDiscount(stadiumData = null) {
        const effect = this.getSpecialEffect('market_discount', stadiumData);
        if (!effect.active) return 0;
        // Lv.1 = -5%, Lv.2 = -10%, Lv.3 = -15%
        return effect.level * 0.05;
    },

    /**
     * Ottiene il bonus combinato totale per la squadra in casa
     * Include: bonus strutture + bonus tattico
     * @param {Object} stadiumData - Dati stadio
     * @returns {number} Bonus totale
     */
    getTotalHomeAdvantage(stadiumData = null) {
        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();

        // Bonus strutture base
        const structureBonus = stadium.totalBonus || this.calculateTotalBonus(stadium.built);

        // Bonus tattico dalla Sala Tattica
        const tacticalBonus = this.getTacticalBonus(stadium);

        return structureBonus + tacticalBonus;
    }
};

console.log("Modulo stadium.js caricato.");
