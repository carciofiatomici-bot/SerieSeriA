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

    STRUCTURES: {
        // Tribune (4 slot) - ai 4 lati del campo
        tribune_north: {
            id: 'tribune_north',
            name: 'Tribuna Nord',
            type: 'tribune',
            position: 'north',
            cost: 250,
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.25,
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
            bonus: 0.50,
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
            bonus: 0.50,
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
            bonus: 0.25,
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
            bonus: 0.25,
            icon: '🪑',
            requires: null,
            description: 'Panchina squadra ospite'
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
            built: [],  // Array di ID strutture costruite
            totalBonus: 0,
            lastUpdated: null
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
     * Verifica se una struttura e' gia costruita
     * @param {string} structureId - ID struttura
     * @param {Object} stadiumData - Dati stadio (opzionale, usa cached)
     */
    isBuilt(structureId, stadiumData = null) {
        const stadium = stadiumData || this._currentStadium;
        if (!stadium || !stadium.built) return false;
        return stadium.built.includes(structureId);
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
            const missingReqs = structure.requires.filter(req => !this.isBuilt(req, stadium));
            if (missingReqs.length > 0) {
                const missingNames = missingReqs.map(id => this.STRUCTURES[id]?.name || id).join(', ');
                return {
                    canBuild: false,
                    reason: `Richiede: ${missingNames}`,
                    missing: missingReqs
                };
            }
        }

        return { canBuild: true, reason: null };
    },

    /**
     * Costruisce una struttura
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

        // Verifica prerequisiti
        const canBuildResult = this.canBuild(structureId);
        if (!canBuildResult.canBuild) {
            return { success: false, error: canBuildResult.reason };
        }

        // Verifica budget
        if (currentBudget < structure.cost) {
            return {
                success: false,
                error: `Fondi insufficienti. Richiesti: ${structure.cost} CS, disponibili: ${currentBudget} CS`
            };
        }

        // Costruisci
        const newBuilt = [...(this._currentStadium.built || []), structureId];
        const newBonus = this.calculateTotalBonus(newBuilt);

        const newStadiumData = {
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
                budget: increment(-structure.cost)
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
            newBonus: newBonus,
            costPaid: structure.cost
        };
    },

    /**
     * Calcola il bonus totale dalle strutture costruite
     * @param {Array} builtStructures - Array di ID strutture costruite
     */
    calculateTotalBonus(builtStructures = []) {
        if (!builtStructures || builtStructures.length === 0) return 0;

        let total = 0;
        for (const structureId of builtStructures) {
            const structure = this.STRUCTURES[structureId];
            if (structure) {
                total += structure.bonus;
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
            bench: []
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
        const builtCount = stadium.built?.length || 0;

        return {
            built: builtCount,
            total: totalStructures,
            percentage: Math.round((builtCount / totalStructures) * 100),
            bonus: stadium.totalBonus || 0,
            maxBonus: this.calculateTotalBonus(Object.keys(this.STRUCTURES))
        };
    },

    /**
     * Calcola il costo totale per completare lo stadio
     * @param {Object} stadiumData - Dati stadio
     */
    getRemainingCost(stadiumData = null) {
        const stadium = stadiumData || this._currentStadium || this.getDefaultStadium();
        const built = stadium.built || [];

        let totalCost = 0;
        for (const [id, structure] of Object.entries(this.STRUCTURES)) {
            if (!built.includes(id)) {
                totalCost += structure.cost;
            }
        }
        return totalCost;
    }
};

console.log("Modulo stadium.js caricato.");
