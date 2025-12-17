//
// ====================================================================
// FIGURINE.JS - Sistema Collezione Figurine dei Giocatori
// ====================================================================
// Album collezionabile con figurine in 4 varianti
//

window.FigurineSystem = {
    // Costanti
    CONFIG_DOC_ID: 'figurineConfig',
    COLLECTION_NAME: 'figurine',

    // Tipi figurine disponibili (4 varianti)
    RARITIES: {
        normale: { id: 'normale', name: 'Normale', color: 'gray', probability: 0.55, cssClass: 'border-gray-400' },
        evoluto: { id: 'evoluto', name: 'Evoluto', color: 'blue', probability: 0.25, cssClass: 'border-blue-500' },
        alternative: { id: 'alternative', name: 'Alternative', color: 'purple', probability: 0.15, cssClass: 'border-purple-500' },
        ultimate: { id: 'ultimate', name: 'Ultimate', color: 'yellow', probability: 0.05, cssClass: 'border-yellow-400' }
    },

    // Cache
    _config: null,
    _configLoaded: false,
    _iconeList: null,

    // ==================== CONFIGURAZIONE ====================

    /**
     * Ottiene il path per la configurazione
     */
    getConfigPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/config` : null;
    },

    /**
     * Ottiene il path per le figurine di una squadra
     */
    getTeamFigurinePath(teamId) {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/${this.COLLECTION_NAME}` : null;
    },

    /**
     * Configurazione di default
     */
    getDefaultConfig() {
        return {
            enabled: true,
            packPriceCSS: 1,            // CSS per pacchetto (Crediti Super Seri)
            packPrice: 0,               // CS per pacchetto (non usato, ora si usa CSS)
            figurinesPerPack: 1,        // Figurine base per pacchetto
            bonusFigurineChance: 0.05,  // 5% probabilita di ottenere 2 figurine invece di 1
            freePackCooldownHours: 8,   // Ore di cooldown dopo apertura pacchetto gratis
            completionBonus: 500,       // Bonus per album completo
            sectionBonus: 50,           // Bonus per sezione completa (1 icona tutte rarita)
            // Scambio figurine duplicate: 3 figurine = X CS
            tradeRequiredCount: 3,      // Figurine richieste per scambio
            tradeRewards: {
                normale: 50,            // 3 normali = 50 CS
                evoluto: 75,            // 3 evolute = 75 CS
                alternative: 150,       // 3 alternative = 150 CS
                ultimate: 300           // 3 ultimate = 300 CS
            }
        };
    },

    /**
     * Carica configurazione da Firestore
     */
    async loadConfig() {
        if (this._configLoaded && this._config) {
            return this._config;
        }

        const path = this.getConfigPath();
        if (!path || !window.db || !window.firestoreTools) {
            this._config = this.getDefaultConfig();
            return this._config;
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, this.CONFIG_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                this._config = { ...this.getDefaultConfig(), ...docSnap.data() };

                // Applica le probabilita salvate su Firestore
                if (this._config.rarityProbabilities) {
                    const probs = this._config.rarityProbabilities;
                    if (probs.normale !== undefined) this.RARITIES.normale.probability = probs.normale / 100;
                    if (probs.evoluto !== undefined) this.RARITIES.evoluto.probability = probs.evoluto / 100;
                    if (probs.alternative !== undefined) this.RARITIES.alternative.probability = probs.alternative / 100;
                    if (probs.ultimate !== undefined) this.RARITIES.ultimate.probability = probs.ultimate / 100;
                    console.log('[Figurine] Probabilita caricate da Firestore:', probs);
                }
            } else {
                this._config = this.getDefaultConfig();
            }
            this._configLoaded = true;
        } catch (error) {
            console.error('[Figurine] Errore caricamento config:', error);
            this._config = this.getDefaultConfig();
        }

        return this._config;
    },

    /**
     * Salva configurazione su Firestore
     */
    async saveConfig(config) {
        const path = this.getConfigPath();
        if (!path || !window.db || !window.firestoreTools) {
            console.error('[Figurine] Impossibile salvare config');
            return false;
        }

        try {
            const { doc, setDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, this.CONFIG_DOC_ID);
            await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() });
            this._config = config;
            console.log('[Figurine] Config salvata');
            return true;
        } catch (error) {
            console.error('[Figurine] Errore salvataggio config:', error);
            return false;
        }
    },

    /**
     * Verifica se la feature e abilitata
     */
    isEnabled() {
        return window.FeatureFlags?.isEnabled('figurine') || false;
    },

    // ==================== ICONE ====================

    /**
     * Ottiene la lista delle icone disponibili
     */
    getIconeList() {
        if (this._iconeList) return this._iconeList;

        // Prende le icone da window.ICONE o CAPTAIN_CANDIDATES_TEMPLATES
        const icone = window.ICONE || window.CAPTAIN_CANDIDATES_TEMPLATES || [];

        this._iconeList = icone.map(icona => ({
            id: icona.id,
            name: icona.name,
            role: icona.role,
            type: icona.type,
            photoUrl: icona.photoUrl
        }));

        return this._iconeList;
    },

    /**
     * Ottiene info di un'icona per ID
     */
    getIconaById(iconaId) {
        const icone = this.getIconeList();
        return icone.find(i => i.id === iconaId);
    },

    // ==================== ALBUM UTENTE ====================

    /**
     * Carica l'album di una squadra
     */
    async loadTeamAlbum(teamId) {
        const path = this.getTeamFigurinePath(teamId);
        if (!path || !window.db || !window.firestoreTools) {
            return this.createEmptyAlbum(teamId);
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, teamId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }
            return this.createEmptyAlbum(teamId);
        } catch (error) {
            console.error('[Figurine] Errore caricamento album:', error);
            return this.createEmptyAlbum(teamId);
        }
    },

    /**
     * Crea un album vuoto
     */
    createEmptyAlbum(teamId) {
        const icone = this.getIconeList();
        const collection = {};

        // Inizializza tutte le figurine a 0 (4 tipi)
        icone.forEach(icona => {
            collection[icona.id] = {
                normale: 0,
                evoluto: 0,
                alternative: 0,
                ultimate: 0
            };
        });

        return {
            teamId,
            collection,
            totalFigurine: 0,
            uniqueFigurine: 0,
            lastFreePack: null,
            completedSections: [],
            albumComplete: false,
            createdAt: new Date().toISOString()
        };
    },

    /**
     * Salva l'album di una squadra
     */
    async saveTeamAlbum(teamId, album) {
        const path = this.getTeamFigurinePath(teamId);
        if (!path || !window.db || !window.firestoreTools) {
            console.error('[Figurine] Impossibile salvare album');
            return false;
        }

        try {
            const { doc, setDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, teamId);

            // Calcola statistiche
            album.totalFigurine = this.countTotalFigurine(album.collection);
            album.uniqueFigurine = this.countUniqueFigurine(album.collection);
            album.completedSections = this.getCompletedSections(album.collection);
            album.albumComplete = this.isAlbumComplete(album.collection);
            album.updatedAt = new Date().toISOString();

            await setDoc(docRef, album);
            console.log('[Figurine] Album salvato');
            return true;
        } catch (error) {
            console.error('[Figurine] Errore salvataggio album:', error);
            return false;
        }
    },

    // ==================== STATISTICHE ====================

    /**
     * Conta il totale delle figurine (inclusi duplicati)
     */
    countTotalFigurine(collection) {
        let total = 0;
        Object.values(collection).forEach(icona => {
            total += (icona.normale || 0) + (icona.evoluto || 0) + (icona.alternative || 0) + (icona.ultimate || 0);
        });
        return total;
    },

    /**
     * Conta le figurine uniche (almeno 1 di ogni tipo)
     */
    countUniqueFigurine(collection) {
        let unique = 0;
        Object.values(collection).forEach(icona => {
            if (icona.normale > 0) unique++;
            if (icona.evoluto > 0) unique++;
            if (icona.alternative > 0) unique++;
            if (icona.ultimate > 0) unique++;
        });
        return unique;
    },

    /**
     * Ottiene le sezioni complete (tutte e 4 le varianti di un giocatore)
     */
    getCompletedSections(collection) {
        const completed = [];
        Object.entries(collection).forEach(([iconaId, counts]) => {
            if (counts.normale > 0 && counts.evoluto > 0 && counts.alternative > 0 && counts.ultimate > 0) {
                completed.push(iconaId);
            }
        });
        return completed;
    },

    /**
     * Verifica se l'album e completo
     */
    isAlbumComplete(collection) {
        const icone = this.getIconeList();
        return Object.values(collection).every(counts =>
            counts.normale > 0 && counts.evoluto > 0 && counts.alternative > 0 && counts.ultimate > 0
        ) && Object.keys(collection).length >= icone.length;
    },

    /**
     * Calcola la percentuale di completamento
     */
    getCompletionPercentage(collection) {
        const icone = this.getIconeList();
        const maxFigurine = icone.length * 4; // 4 varianti per giocatore
        const unique = this.countUniqueFigurine(collection);
        return Math.round((unique / maxFigurine) * 100);
    },

    // ==================== PACCHETTI ====================

    /**
     * Verifica se puo aprire pacchetto gratis (async con teamId)
     */
    async canOpenFreePackByTeamId(teamId) {
        try {
            const album = await this.loadTeamAlbum(teamId);
            return this.canOpenFreePack(album);
        } catch (error) {
            console.error('[Figurine] Errore verifica free pack:', error);
            return true; // In caso di errore, mostra comunque il badge
        }
    },

    /**
     * Ottiene il prossimo reset delle 12:00
     * Se ora sono prima delle 12:00, ritorna le 12:00 di oggi
     * Se ora sono dopo le 12:00, ritorna le 12:00 di domani
     */
    getNextResetTime() {
        const now = new Date();
        const resetHour = 12; // 12:00

        const todayReset = new Date(now);
        todayReset.setHours(resetHour, 0, 0, 0);

        // Se siamo dopo le 12:00 di oggi, il prossimo reset e' domani
        if (now >= todayReset) {
            todayReset.setDate(todayReset.getDate() + 1);
        }

        return todayReset;
    },

    /**
     * Verifica se puo aprire pacchetto gratis
     * Cooldown di 8 ore dopo l'apertura dell'ultimo pacchetto
     */
    canOpenFreePack(album) {
        if (!album.lastFreePack) return true;

        const lastPack = new Date(album.lastFreePack);
        const now = new Date();
        const config = this._config || this.getDefaultConfig();
        const cooldownMs = config.freePackCooldownHours * 60 * 60 * 1000; // 8 ore in ms

        // Puo aprire se sono passate almeno 8 ore dall'ultimo pacchetto
        return (now.getTime() - lastPack.getTime()) >= cooldownMs;
    },

    /**
     * Tempo rimanente per pacchetto gratis (cooldown 8 ore)
     */
    getTimeUntilFreePack(album) {
        if (!album.lastFreePack) return null;
        if (this.canOpenFreePack(album)) return null;

        const lastPack = new Date(album.lastFreePack);
        const config = this._config || this.getDefaultConfig();
        const cooldownMs = config.freePackCooldownHours * 60 * 60 * 1000;
        const nextAvailable = new Date(lastPack.getTime() + cooldownMs);
        const now = new Date();
        const remaining = nextAvailable.getTime() - now.getTime();

        if (remaining <= 0) return null;

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        return { hours, minutes, formatted: `${hours}h ${minutes}m` };
    },

    /**
     * Estrae una figurina casuale
     */
    extractRandomFigurina() {
        const icone = this.getIconeList();
        const randomIcona = icone[Math.floor(Math.random() * icone.length)];

        // Determina tipo figurina (probabilita cumulative)
        const roll = Math.random();
        let rarity = 'normale';

        // Ultimate: 5%, Alternative: 15%, Evoluto: 25%, Normale: 55%
        if (roll < this.RARITIES.ultimate.probability) {
            rarity = 'ultimate';
        } else if (roll < this.RARITIES.ultimate.probability + this.RARITIES.alternative.probability) {
            rarity = 'alternative';
        } else if (roll < this.RARITIES.ultimate.probability + this.RARITIES.alternative.probability + this.RARITIES.evoluto.probability) {
            rarity = 'evoluto';
        }

        return {
            iconaId: randomIcona.id,
            iconaName: randomIcona.name,
            iconaPhoto: randomIcona.photoUrl,
            rarity: rarity,
            rarityInfo: this.RARITIES[rarity]
        };
    },

    /**
     * Apre un pacchetto di figurine
     * Costa 1 CSS (Credito Super Serio)
     * 99% una figurina, 1% due figurine
     */
    async openPack(teamId, isFree = false) {
        const config = await this.loadConfig();
        const album = await this.loadTeamAlbum(teamId);

        // Verifica se puo aprire
        if (isFree && !this.canOpenFreePack(album)) {
            throw new Error('Pacchetto gratis non ancora disponibile');
        }

        if (!isFree) {
            // Verifica CSS (Crediti Super Seri)
            const teamData = await this.getTeamData(teamId);
            const packCost = config.packPriceCSS || 1;
            const currentCSS = teamData?.creditiSuperSeri || 0;

            if (currentCSS < packCost) {
                throw new Error(`CSS insufficienti (hai ${currentCSS}, servono ${packCost})`);
            }

            // Sottrai CSS
            await this.updateTeamCSS(teamId, -packCost);
        }

        // Determina numero figurine: 99% una, 1% due
        const bonusChance = config.bonusFigurineChance || 0.01;
        const numFigurine = Math.random() < bonusChance ? 2 : 1;

        // Estrai figurine
        const extracted = [];
        for (let i = 0; i < numFigurine; i++) {
            const figurina = this.extractRandomFigurina();
            extracted.push(figurina);

            // Aggiungi all'album
            if (!album.collection[figurina.iconaId]) {
                album.collection[figurina.iconaId] = { normale: 0, evoluto: 0, alternative: 0, ultimate: 0 };
            }
            album.collection[figurina.iconaId][figurina.rarity]++;
        }

        // Aggiorna timestamp pacchetto gratis
        if (isFree) {
            album.lastFreePack = new Date().toISOString();
        }

        // Verifica bonus completamento sezioni
        const prevCompleted = album.completedSections?.length || 0;
        await this.saveTeamAlbum(teamId, album);

        const newCompleted = album.completedSections.length;
        let bonusEarned = 0;

        if (newCompleted > prevCompleted) {
            bonusEarned = (newCompleted - prevCompleted) * config.sectionBonus;
            await this.updateTeamBudget(teamId, bonusEarned);
        }

        // Verifica album completo
        if (album.albumComplete && !album.completionBonusAwarded) {
            await this.updateTeamBudget(teamId, config.completionBonus);
            album.completionBonusAwarded = true;
            await this.saveTeamAlbum(teamId, album);
            bonusEarned += config.completionBonus;
        }

        return {
            figurine: extracted,
            album: album,
            bonusEarned: bonusEarned,
            isFree: isFree,
            gotBonus: numFigurine > 1
        };
    },

    // ==================== SCAMBIO FIGURINE ====================

    /**
     * Conta le figurine duplicate scambiabili per rarita
     * Duplicate = quelle oltre la prima (quella nell'album)
     * @param {Object} collection - La collezione dell'album
     * @returns {Object} { normale: X, evoluto: Y, alternative: Z, ultimate: W }
     */
    countTradableDuplicates(collection) {
        const duplicates = {
            normale: 0,
            evoluto: 0,
            alternative: 0,
            ultimate: 0
        };

        Object.values(collection).forEach(iconaCounts => {
            // Per ogni rarita, le duplicate sono quelle oltre la prima
            if (iconaCounts.normale > 1) duplicates.normale += iconaCounts.normale - 1;
            if (iconaCounts.evoluto > 1) duplicates.evoluto += iconaCounts.evoluto - 1;
            if (iconaCounts.alternative > 1) duplicates.alternative += iconaCounts.alternative - 1;
            if (iconaCounts.ultimate > 1) duplicates.ultimate += iconaCounts.ultimate - 1;
        });

        return duplicates;
    },

    /**
     * Calcola quanti scambi sono possibili per ogni rarita
     * @param {Object} duplicates - Output di countTradableDuplicates
     * @param {number} requiredCount - Figurine richieste per scambio (default 3)
     * @returns {Object} { normale: X, evoluto: Y, ... } numero di scambi possibili
     */
    countPossibleTrades(duplicates, requiredCount = 3) {
        return {
            normale: Math.floor(duplicates.normale / requiredCount),
            evoluto: Math.floor(duplicates.evoluto / requiredCount),
            alternative: Math.floor(duplicates.alternative / requiredCount),
            ultimate: Math.floor(duplicates.ultimate / requiredCount)
        };
    },

    /**
     * Esegue uno scambio di figurine duplicate per CS
     * @param {string} teamId - ID squadra
     * @param {string} rarity - Rarita da scambiare (normale, evoluto, alternative, ultimate)
     * @param {number} count - Numero di scambi da fare (default 1)
     * @returns {Object} { success, csEarned, message }
     */
    async tradeDuplicates(teamId, rarity, count = 1) {
        const config = await this.loadConfig();
        const album = await this.loadTeamAlbum(teamId);
        const requiredCount = config.tradeRequiredCount || 3;
        const reward = config.tradeRewards?.[rarity] || 0;

        if (!reward) {
            return { success: false, message: `Rarita "${rarity}" non valida` };
        }

        const totalRequired = requiredCount * count;
        const duplicates = this.countTradableDuplicates(album.collection);

        if (duplicates[rarity] < totalRequired) {
            return {
                success: false,
                message: `Figurine insufficienti: hai ${duplicates[rarity]} duplicate ${rarity}, servono ${totalRequired}`
            };
        }

        // Rimuovi le figurine dalla collezione (le duplicate, non la prima)
        let toRemove = totalRequired;
        for (const iconaId in album.collection) {
            if (toRemove <= 0) break;

            const iconaCounts = album.collection[iconaId];
            if (iconaCounts[rarity] > 1) {
                const removable = iconaCounts[rarity] - 1; // Lascia sempre almeno 1
                const removeNow = Math.min(removable, toRemove);
                iconaCounts[rarity] -= removeNow;
                toRemove -= removeNow;
            }
        }

        // Salva album aggiornato
        await this.saveTeamAlbum(teamId, album);

        // Assegna CS
        const csEarned = reward * count;
        await this.updateTeamBudget(teamId, csEarned);

        return {
            success: true,
            csEarned: csEarned,
            traded: totalRequired,
            rarity: rarity,
            message: `Scambiate ${totalRequired} figurine ${rarity} per ${csEarned} CS!`
        };
    },

    /**
     * Scambia tutte le figurine duplicate di una rarita
     * @param {string} teamId - ID squadra
     * @param {string} rarity - Rarita da scambiare
     * @returns {Object} { success, csEarned, traded, message }
     */
    async tradeAllDuplicates(teamId, rarity) {
        const config = await this.loadConfig();
        const album = await this.loadTeamAlbum(teamId);
        const requiredCount = config.tradeRequiredCount || 3;

        const duplicates = this.countTradableDuplicates(album.collection);
        const possibleTrades = Math.floor(duplicates[rarity] / requiredCount);

        if (possibleTrades === 0) {
            return {
                success: false,
                message: `Non hai abbastanza figurine ${rarity} duplicate (servono ${requiredCount})`
            };
        }

        return await this.tradeDuplicates(teamId, rarity, possibleTrades);
    },

    // ==================== UTILITIES ====================

    /**
     * Ottiene dati squadra
     */
    async getTeamData(teamId) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) return null;

        try {
            const { doc, getDoc } = window.firestoreTools;
            const teamRef = doc(window.db, `artifacts/${appId}/public/data/teams`, teamId);
            const teamSnap = await getDoc(teamRef);
            return teamSnap.exists() ? teamSnap.data() : null;
        } catch (error) {
            console.error('[Figurine] Errore caricamento team:', error);
            return null;
        }
    },

    /**
     * Aggiorna budget squadra (CS)
     */
    async updateTeamBudget(teamId, amount) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) return false;

        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const teamRef = doc(window.db, `artifacts/${appId}/public/data/teams`, teamId);
            const teamSnap = await getDoc(teamRef);

            if (!teamSnap.exists()) return false;

            const currentBudget = teamSnap.data().budget || 0;
            await updateDoc(teamRef, { budget: currentBudget + amount });
            return true;
        } catch (error) {
            console.error('[Figurine] Errore aggiornamento budget:', error);
            return false;
        }
    },

    /**
     * Aggiorna CSS squadra (Crediti Super Seri)
     */
    async updateTeamCSS(teamId, amount) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) return false;

        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const teamRef = doc(window.db, `artifacts/${appId}/public/data/teams`, teamId);
            const teamSnap = await getDoc(teamRef);

            if (!teamSnap.exists()) return false;

            const currentCSS = teamSnap.data().creditiSuperSeri || 0;
            await updateDoc(teamRef, { creditiSuperSeri: currentCSS + amount });
            return true;
        } catch (error) {
            console.error('[Figurine] Errore aggiornamento CSS:', error);
            return false;
        }
    }
};

console.log('Modulo figurine.js caricato.');
