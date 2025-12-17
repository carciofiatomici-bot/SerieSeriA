//
// ====================================================================
// FIGURINE.JS - Sistema Collezione Figurine delle Icone
// ====================================================================
// Album collezionabile con figurine delle 16 Icone in 3 rarita
//

window.FigurineSystem = {
    // Costanti
    CONFIG_DOC_ID: 'figurineConfig',
    COLLECTION_NAME: 'figurine',
    TRADES_COLLECTION: 'figurineTrades',

    // Rarita disponibili
    RARITIES: {
        base: { id: 'base', name: 'Base', color: 'gray', probability: 0.70, sellValue: 5 },
        shiny: { id: 'shiny', name: 'Shiny', color: 'blue', probability: 0.25, sellValue: 15 },
        gold: { id: 'gold', name: 'Gold', color: 'yellow', probability: 0.05, sellValue: 50 }
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
            packPrice: 50,              // CS per pacchetto
            figurinesPerPack: 3,        // Figurine per pacchetto
            freePackCooldownHours: 24,  // Ore tra pacchetti gratis
            completionBonus: 500,       // Bonus per album completo
            sectionBonus: 50            // Bonus per sezione completa (1 icona tutte rarita)
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

        // Inizializza tutte le figurine a 0
        icone.forEach(icona => {
            collection[icona.id] = {
                base: 0,
                shiny: 0,
                gold: 0
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
            total += (icona.base || 0) + (icona.shiny || 0) + (icona.gold || 0);
        });
        return total;
    },

    /**
     * Conta le figurine uniche (almeno 1 di ogni tipo)
     */
    countUniqueFigurine(collection) {
        let unique = 0;
        Object.values(collection).forEach(icona => {
            if (icona.base > 0) unique++;
            if (icona.shiny > 0) unique++;
            if (icona.gold > 0) unique++;
        });
        return unique;
    },

    /**
     * Ottiene le sezioni complete (tutte e 3 le rarita di un'icona)
     */
    getCompletedSections(collection) {
        const completed = [];
        Object.entries(collection).forEach(([iconaId, counts]) => {
            if (counts.base > 0 && counts.shiny > 0 && counts.gold > 0) {
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
            counts.base > 0 && counts.shiny > 0 && counts.gold > 0
        ) && Object.keys(collection).length >= icone.length;
    },

    /**
     * Calcola la percentuale di completamento
     */
    getCompletionPercentage(collection) {
        const icone = this.getIconeList();
        const maxFigurine = icone.length * 3; // 3 rarita per icona
        const unique = this.countUniqueFigurine(collection);
        return Math.round((unique / maxFigurine) * 100);
    },

    // ==================== PACCHETTI ====================

    /**
     * Verifica se puo aprire pacchetto gratis
     */
    canOpenFreePack(album) {
        if (!album.lastFreePack) return true;

        const config = this._config || this.getDefaultConfig();
        const cooldownMs = config.freePackCooldownHours * 60 * 60 * 1000;
        const lastPack = new Date(album.lastFreePack).getTime();
        const now = Date.now();

        return (now - lastPack) >= cooldownMs;
    },

    /**
     * Tempo rimanente per pacchetto gratis
     */
    getTimeUntilFreePack(album) {
        if (!album.lastFreePack) return null;

        const config = this._config || this.getDefaultConfig();
        const cooldownMs = config.freePackCooldownHours * 60 * 60 * 1000;
        const lastPack = new Date(album.lastFreePack).getTime();
        const nextPack = lastPack + cooldownMs;
        const remaining = nextPack - Date.now();

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

        // Determina rarita
        const roll = Math.random();
        let rarity = 'base';

        if (roll < this.RARITIES.gold.probability) {
            rarity = 'gold';
        } else if (roll < this.RARITIES.gold.probability + this.RARITIES.shiny.probability) {
            rarity = 'shiny';
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
     */
    async openPack(teamId, isFree = false) {
        const config = await this.loadConfig();
        const album = await this.loadTeamAlbum(teamId);

        // Verifica se puo aprire
        if (isFree && !this.canOpenFreePack(album)) {
            throw new Error('Pacchetto gratis non ancora disponibile');
        }

        if (!isFree) {
            // Verifica crediti
            const teamData = await this.getTeamData(teamId);
            if (!teamData || (teamData.budget || 0) < config.packPrice) {
                throw new Error('Crediti insufficienti');
            }

            // Sottrai crediti
            await this.updateTeamBudget(teamId, -config.packPrice);
        }

        // Estrai figurine
        const extracted = [];
        for (let i = 0; i < config.figurinesPerPack; i++) {
            const figurina = this.extractRandomFigurina();
            extracted.push(figurina);

            // Aggiungi all'album
            if (!album.collection[figurina.iconaId]) {
                album.collection[figurina.iconaId] = { base: 0, shiny: 0, gold: 0 };
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
            isFree: isFree
        };
    },

    // ==================== DUPLICATI ====================

    /**
     * Ottiene i duplicati vendibili
     */
    getDuplicates(collection) {
        const duplicates = [];

        Object.entries(collection).forEach(([iconaId, counts]) => {
            const icona = this.getIconaById(iconaId);
            if (!icona) return;

            Object.entries(counts).forEach(([rarity, count]) => {
                if (count > 1) {
                    const rarityInfo = this.RARITIES[rarity];
                    duplicates.push({
                        iconaId,
                        iconaName: icona.name,
                        iconaPhoto: icona.photoUrl,
                        rarity,
                        rarityInfo,
                        duplicateCount: count - 1,
                        sellValue: rarityInfo.sellValue * (count - 1)
                    });
                }
            });
        });

        return duplicates;
    },

    /**
     * Vende un duplicato
     */
    async sellDuplicate(teamId, iconaId, rarity) {
        const album = await this.loadTeamAlbum(teamId);

        if (!album.collection[iconaId] || album.collection[iconaId][rarity] <= 1) {
            throw new Error('Nessun duplicato da vendere');
        }

        const rarityInfo = this.RARITIES[rarity];
        album.collection[iconaId][rarity]--;

        await this.saveTeamAlbum(teamId, album);
        await this.updateTeamBudget(teamId, rarityInfo.sellValue);

        return {
            sold: { iconaId, rarity },
            earned: rarityInfo.sellValue
        };
    },

    // ==================== SCAMBI ====================

    /**
     * Crea una proposta di scambio
     */
    async createTradeOffer(fromTeamId, fromTeamName, offer, wanted) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) {
            throw new Error('Firestore non disponibile');
        }

        const { collection, addDoc } = window.firestoreTools;
        const tradesRef = collection(window.db, `artifacts/${appId}/public/data/${this.TRADES_COLLECTION}`);

        const trade = {
            fromTeamId,
            fromTeamName,
            offer: offer,           // { iconaId, rarity }
            wanted: wanted,         // { iconaId, rarity }
            status: 'open',
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(tradesRef, trade);
        console.log('[Figurine] Scambio creato:', docRef.id);
        return docRef.id;
    },

    /**
     * Ottiene gli scambi aperti
     */
    async getOpenTrades(excludeTeamId = null) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) return [];

        try {
            const { collection, getDocs, query, where } = window.firestoreTools;
            const tradesRef = collection(window.db, `artifacts/${appId}/public/data/${this.TRADES_COLLECTION}`);
            const q = query(tradesRef, where('status', '==', 'open'));
            const snapshot = await getDocs(q);

            const trades = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!excludeTeamId || data.fromTeamId !== excludeTeamId) {
                    trades.push({ id: doc.id, ...data });
                }
            });

            return trades;
        } catch (error) {
            console.error('[Figurine] Errore caricamento scambi:', error);
            return [];
        }
    },

    /**
     * Accetta uno scambio
     */
    async acceptTrade(tradeId, acceptingTeamId) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) {
            throw new Error('Firestore non disponibile');
        }

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const tradeRef = doc(window.db, `artifacts/${appId}/public/data/${this.TRADES_COLLECTION}`, tradeId);
        const tradeSnap = await getDoc(tradeRef);

        if (!tradeSnap.exists()) {
            throw new Error('Scambio non trovato');
        }

        const trade = tradeSnap.data();
        if (trade.status !== 'open') {
            throw new Error('Scambio non piu disponibile');
        }

        // Carica album di entrambi
        const fromAlbum = await this.loadTeamAlbum(trade.fromTeamId);
        const toAlbum = await this.loadTeamAlbum(acceptingTeamId);

        // Verifica disponibilita
        if (!fromAlbum.collection[trade.offer.iconaId] ||
            fromAlbum.collection[trade.offer.iconaId][trade.offer.rarity] < 1) {
            throw new Error('Il proponente non ha piu la figurina offerta');
        }

        if (!toAlbum.collection[trade.wanted.iconaId] ||
            toAlbum.collection[trade.wanted.iconaId][trade.wanted.rarity] < 1) {
            throw new Error('Non hai la figurina richiesta');
        }

        // Esegui scambio
        fromAlbum.collection[trade.offer.iconaId][trade.offer.rarity]--;
        fromAlbum.collection[trade.wanted.iconaId][trade.wanted.rarity]++;

        toAlbum.collection[trade.wanted.iconaId][trade.wanted.rarity]--;
        toAlbum.collection[trade.offer.iconaId][trade.offer.rarity]++;

        // Salva
        await this.saveTeamAlbum(trade.fromTeamId, fromAlbum);
        await this.saveTeamAlbum(acceptingTeamId, toAlbum);

        // Aggiorna stato scambio
        await updateDoc(tradeRef, {
            status: 'completed',
            acceptedBy: acceptingTeamId,
            completedAt: new Date().toISOString()
        });

        return { success: true };
    },

    /**
     * Cancella uno scambio
     */
    async cancelTrade(tradeId, teamId) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) {
            throw new Error('Firestore non disponibile');
        }

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const tradeRef = doc(window.db, `artifacts/${appId}/public/data/${this.TRADES_COLLECTION}`, tradeId);
        const tradeSnap = await getDoc(tradeRef);

        if (!tradeSnap.exists()) {
            throw new Error('Scambio non trovato');
        }

        const trade = tradeSnap.data();
        if (trade.fromTeamId !== teamId) {
            throw new Error('Non puoi cancellare questo scambio');
        }

        await updateDoc(tradeRef, {
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        });

        return { success: true };
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
     * Aggiorna budget squadra
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
    }
};

console.log('Modulo figurine.js caricato.');
