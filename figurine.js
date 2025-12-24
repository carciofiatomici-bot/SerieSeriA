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

    // Base URL per le immagini figurine
    FIGURINE_BASE_URL: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/figurine/',

    // Mapping completo da icona ID a nomi file figurine (nomi esatti come su GitHub)
    // Formato: { normale, evoluto, alternative, ultimate, fantasy }
    FIGURINE_FILES: {
        'croc': {
            normale: 'Icone/Croccante.jpg',
            evoluto: 'Icone/Croccante Evoluto.jpg',
            alternative: 'Icone/Croccante Alternative.jpg',
            ultimate: 'Icone/Croccante Ultimate.jpg',
            fantasy: 'Icone Fantasy/Croccante Fantasy.jpg'
        },
        'shik': {
            normale: 'Icone/shikanto.jpg',
            evoluto: 'Icone/shikanto evoluto.jpg',
            alternative: 'Icone/shikanto alternative.jpg',
            ultimate: 'Icone/shikanto ultimate.jpg',
            fantasy: 'Icone Fantasy/Shikanto Fantasy.jpg'
        },
        'ilcap': {
            normale: 'Icone/cap.jpg',
            evoluto: 'Icone/cap evoluto.jpg',
            alternative: 'Icone/cap alternative.jpg',
            ultimate: 'Icone/cap ultimate.jpg',
            fantasy: 'Icone Fantasy/Cap Fantasy.jpg'
        },
        'simo': {
            normale: 'Icone/simone.jpg',
            evoluto: 'Icone/simone evolved.jpg',
            alternative: 'Icone/simone alternative.jpg',
            ultimate: 'Icone/simone ultimate.jpg',
            fantasy: 'Icone Fantasy/Simone Fantasy.jpg'
        },
        'dappi': {
            normale: 'Icone/dappino.png',
            evoluto: 'Icone/dappino evolved.jpg',
            alternative: 'Icone/dappino alternative.jpg',
            ultimate: 'Icone/dappino ultimate.jpg',
            fantasy: 'Icone Fantasy/Dappino Fantasy.jpg'
        },
        'gladio': {
            normale: 'Icone/gladio.jpg',
            evoluto: 'Icone/gladio evoluto.jpg',
            alternative: 'Icone/gladio alternative.jpg',
            ultimate: 'Icone/gladio ultimate.jpg',
            fantasy: 'Icone Fantasy/Gladio Fantasy.jpg'
        },
        'amedemo': {
            normale: 'Icone/amedemo.jpg',
            evoluto: 'Icone/amedemo evolved.jpg',
            alternative: 'Icone/amedemo alternative.jpg',
            ultimate: 'Icone/amedemo ultimate.jpg',
            fantasy: 'Icone Fantasy/Amedemo Fantasy.jpg'
        },
        'flavio': {
            normale: 'Icone/elficario.jpg',
            evoluto: 'Icone/elficario evoluto.jpg',
            alternative: 'Icone/elficario alternative.jpg',
            ultimate: 'Icone/elficario ultimate.jpg',
            fantasy: 'Icone Fantasy/Elficario Fantasy.jpg'
        },
        'luka': {
            normale: 'Icone/luca.jpg',
            evoluto: 'Icone/luca evolved.jpg',
            alternative: 'Icone/luca alternative.jpg',
            ultimate: 'Icone/luca ultimate.jpg',
            fantasy: 'Icone Fantasy/Luka Fantasy.jpg'
        },
        'melio': {
            normale: 'Icone/Mel.jpg',
            evoluto: 'Icone/mel evolved.jpg',
            alternative: 'Icone/mel alternative.jpg',
            ultimate: 'Icone/mel ultimate.jpg',
            fantasy: 'Icone Fantasy/Mel Fantasy.jpg'
        },
        'markf': {
            normale: 'Icone/Mark Falco.jpg',
            evoluto: 'Icone/mark falco evoluto.jpg',
            alternative: 'Icone/mark falco alternative.jpg',
            ultimate: 'Icone/mark falco ultimate.jpg',
            fantasy: 'Icone Fantasy/Mark Falco Fantasy.jpg'
        },
        'sandro': {
            normale: 'Icone/sandro.jpg',
            evoluto: 'Icone/sandro evoluto.jpg',
            alternative: 'Icone/sandro alternative.jpg',
            ultimate: 'Icone/sandro ultimate.jpg',
            fantasy: 'Icone Fantasy/Sandro Diaz Fantasy.jpg'
        },
        'fosco': {
            normale: 'Icone/Fosco.jpg',
            evoluto: 'Icone/fosco evoluto.jpg',
            alternative: 'Icone/fosco alternative.jpg',
            ultimate: 'Icone/fosco ultimate.jpg',
            fantasy: 'Icone Fantasy/Fosco Fantasy.jpg'
        },
        'cocco': {
            normale: 'Icone/cocco.jpg',
            evoluto: 'Icone/Cocco evoluto.jpg',
            alternative: 'Icone/Cocco alternative.jpg',
            ultimate: 'Icone/cocco ultimate.jpg',
            fantasy: 'Icone Fantasy/Cocco Fantasy.jpg'
        },
        'antony': {
            normale: 'Icone/antony.jpg',
            evoluto: 'Icone/Antony Evoluto.jpg',
            alternative: 'Icone/Antony Alternative.jpg',
            ultimate: 'Icone/Antony Ultimate.jpg',
            fantasy: 'Icone Fantasy/Antony Fantasy.jpg'
        }
    },

    // Mapping per collezione Giocatori Seri
    GIOCATORI_SERI_FILES: {
        'alessandro_salucci': { base: 'Alessandro Salucci.jpg', name: 'Alessandro Salucci' },
        'alex_fuoco': { base: 'Alex Fuoco.jpg', name: 'Alex Fuoco' },
        'armando_machedonna': { base: 'Armando Machedonna.jpg', name: 'Armando Machedonna' },
        'baldovini_domenico': { base: 'Baldovini Domenico.jpg', name: 'Baldovini Domenico' },
        'claudio_broccolo': { base: 'Claudio Broccolo.jpg', name: 'Claudio Broccolo' },
        'costantino_tiraboschi': { base: 'Costantino Tiraboschi.jpg', name: 'Costantino Tiraboschi' },
        'dado_abrami': { base: 'Dado Abrami.jpg', name: 'Dado Abrami' },
        'daniele_busto': { base: 'Daniele Busto.jpg', name: 'Daniele Busto' },
        'eros_hamschick': { base: 'Eros Hamschick.jpg', name: 'Eros Hamschick' },
        'harry_poster': { base: 'Harry Poster.jpg', name: 'Harry Poster' },
        'jeanluigi_provolone': { base: 'Jeanluigi Provolone.jpg', name: 'Jeanluigi Provolone' },
        'joaquin_del_rio': { base: 'Joaquin Del Rio.jpg', name: 'Joaquin Del Rio' },
        'pino_costa': { base: 'Pino Costa.jpg', name: 'Pino Costa' },
        'roberto_lgabowsky': { base: 'Roberto Lgabowsky.jpg', name: 'Roberto Lgabowsky' },
        'silvano_abategiovanni': { base: 'Silvano Abategiovanni.jpg', name: 'Silvano Abategiovanni' },
        'vico_motta': { base: 'Vico Motta.jpg', name: 'Vico Motta' },
        'viola_augusto': { base: 'Viola Augusto.jpg', name: 'Viola Augusto' }
    },

    // Mapping per collezione Allenatori (da popolare)
    ALLENATORI_FILES: {
        // Esempio: 'allenatore1': { base: 'NomeAllenatore.jpg' }
    },

    // Mapping per collezione Illustrazioni con sottocategorie
    ILLUSTRAZIONI_FILES: {
        // === CATEGORIA PRINCIPALE ===
        'wallpaper': { base: 'Wallpaper.jpg', name: 'Wallpaper', category: null },

        // === CATEGORIA: VS ===
        'ame_vs_fosco': { base: 'VS/Ame vs Fosco.jpg', name: 'Ame vs Fosco', category: 'VS' },
        'antony_vs_croccante': { base: 'VS/Antony vs Croccante.jpg', name: 'Antony vs Croccante', category: 'VS' },
        'cocco_vs_luka': { base: 'VS/Cocco vs luka.jpg', name: 'Cocco vs Luka', category: 'VS' },
        'gladio_vs_croccante_fantasy': { base: 'VS/Gladio Vs Croccante Fantasy.jpg', name: 'Gladio vs Croccante Fantasy', category: 'VS' },

        // === CATEGORIA: Varie ===
        'bemolle_trick': { base: 'Varie/Bemolle Trick.jpg', name: 'Bemolle Trick', category: 'Varie' },
        'contrasto_croccante': { base: 'Varie/Contrasto Croccante.jpg', name: 'Contrasto Croccante', category: 'Varie' },
        'salvataggio_mark': { base: 'Varie/Salvataggio Mark.jpg', name: 'Salvataggio Mark', category: 'Varie' },
        'sandro_relax': { base: 'Varie/Sandro Relax.jpg', name: 'Sandro Relax', category: 'Varie' },
        'tiro_simone': { base: 'Varie/Tiro Simone.jpg', name: 'Tiro Simone', category: 'Varie' },

        // === CATEGORIA: Abilita Icone ===
        'abilita_amedemo': { base: 'Abilità icone/Amedemo - Tiro Dritto.jpg', name: 'Amedemo - Tiro Dritto', category: 'Abilita Icone' },
        'abilita_antony': { base: 'Abilità icone/Antony - avanti un altro.jpg', name: 'Antony - Avanti un Altro', category: 'Abilita Icone' },
        'abilita_bemolle': { base: 'Abilità icone/Bemolle - scheggia impazzita.jpg', name: 'Bemolle - Scheggia Impazzita', category: 'Abilita Icone' },
        'abilita_croccante': { base: 'Abilità icone/Croccante - Fatto d\'acciaio.jpg', name: 'Croccante - Fatto d\'Acciaio', category: 'Abilita Icone' },
        'abilita_fosco': { base: 'Abilità icone/Fosco - l\'uomo in più.jpg', name: 'Fosco - L\'Uomo in Piu', category: 'Abilita Icone' },
        'abilita_sandro': { base: 'Abilità icone/Sandro - relax.jpg', name: 'Sandro - Relax', category: 'Abilita Icone' },
        'abilita_simone': { base: 'Abilità icone/Simone - Parata efficiente.jpg', name: 'Simone - Parata Efficiente', category: 'Abilita Icone' },
        'abilita_cap': { base: 'Abilità icone/cap - calcolo delle probabilità.jpg', name: 'Cap - Calcolo delle Probabilita', category: 'Abilita Icone' },
        'abilita_cocco': { base: 'Abilità icone/cocco - stazionario.jpg', name: 'Cocco - Stazionario', category: 'Abilita Icone' },
        'abilita_gladio': { base: 'Abilità icone/gladio - continua a provare.jpg', name: 'Gladio - Continua a Provare', category: 'Abilita Icone' },
        'abilita_luka': { base: 'Abilità icone/luka - contrasto di gomito.jpg', name: 'Luka - Contrasto di Gomito', category: 'Abilita Icone' },
        'abilita_mark': { base: 'Abilità icone/mark falco - osservatore.jpg', name: 'Mark Falco - Osservatore', category: 'Abilita Icone' },
        'abilita_mel': { base: 'Abilità icone/mel assistman.jpg', name: 'Mel - Assist-man', category: 'Abilita Icone' },
        'abilita_shikanto': { base: 'Abilità icone/shikanto - amici di panchina.jpg', name: 'Shikanto - Amici di Panchina', category: 'Abilita Icone' }
    },

    // Categorie illustrazioni per UI (ordine e nomi visualizzati)
    // Le sottocategorie vengono mostrate PRIMA della cartella principale
    ILLUSTRAZIONI_CATEGORIES: [
        { id: 'VS', name: 'VS', icon: '⚔️' },
        { id: 'Varie', name: 'Varie', icon: '🎨' },
        { id: 'Abilita Icone', name: 'Abilita Icone', icon: '✨' },
        { id: null, name: 'Generali', icon: '🖼️' }
    ],

    // Mapping per collezione Figurine Utenti
    FIGURINE_UTENTI_FILES: {
        // Esempio: 'utente1': { base: 'NomeUtente.jpg', name: 'Nome Utente' }
    },

    // ==================== COLLEZIONI ====================
    // Sistema multi-collezione per figurine
    COLLECTIONS: {
        icone: {
            id: 'icone',
            name: 'Icone',
            description: 'Le leggendarie icone del calcetto',
            icon: '👑',
            enabled: true,
            hasBonus: true,  // Le varianti danno bonus
            variants: ['normale', 'evoluto', 'alternative', 'ultimate', 'fantasy'],
            baseUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/figurine/'
        },
        giocatori_seri: {
            id: 'giocatori_seri',
            name: 'Giocatori Seri',
            description: 'I giocatori piu seri del campionato',
            icon: '⚽',
            enabled: true,
            hasBonus: false,  // Solo collezionabili
            variants: ['base'],
            baseUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/figurine/Giocatori%20Seri/'
        },
        allenatori: {
            id: 'allenatori',
            name: 'Allenatori',
            description: 'I mister che guidano le squadre',
            icon: '📋',
            enabled: false,  // Disabilitato - cartella non presente
            hasBonus: false,  // Solo collezionabili
            variants: ['base'],
            baseUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/figurine/Allenatori/'
        },
        illustrazioni: {
            id: 'illustrazioni',
            name: 'Illustrazioni',
            description: 'Opere d\'arte esclusive',
            icon: '🎨',
            enabled: true,
            hasBonus: false,  // Solo collezionabili
            variants: ['base'],
            baseUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/figurine/Illustrazioni/'
        },
        figurine_utenti: {
            id: 'figurine_utenti',
            name: 'Figurine Utenti',
            description: 'Le figurine create dagli utenti',
            icon: '👤',
            enabled: true,
            hasBonus: false,  // Solo collezionabili
            variants: ['base'],
            baseUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/figurine/Figurine%20Utenti/'
        }
    },

    // Varianti per collezione Icone (5 varianti) - Probabilita allineate a FIGURINE_RARITIES
    // normale=Comune(40%), evoluto=Non Comune(30%), alternative=Rara(18%), ultimate=Epica(9%), fantasy=Leggendaria(3%)
    ICONE_RARITIES: {
        normale: { id: 'normale', name: 'Comune', color: 'gray', probability: 0.40, cssClass: 'border-gray-400', textClass: 'text-gray-400', icon: '⚪', rarityLevel: 1 },
        evoluto: { id: 'evoluto', name: 'Non Comune', color: 'green', probability: 0.30, cssClass: 'border-green-500', textClass: 'text-green-400', icon: '🟢', rarityLevel: 2 },
        alternative: { id: 'alternative', name: 'Rara', color: 'blue', probability: 0.18, cssClass: 'border-blue-500', textClass: 'text-blue-400', icon: '🔵', rarityLevel: 3 },
        ultimate: { id: 'ultimate', name: 'Epica', color: 'purple', probability: 0.09, cssClass: 'border-purple-500', textClass: 'text-purple-400', icon: '🟣', rarityLevel: 4 },
        fantasy: { id: 'fantasy', name: 'Leggendaria', color: 'orange', probability: 0.03, cssClass: 'border-orange-400', textClass: 'text-orange-400', icon: '🟠', rarityLevel: 5 }
    },

    // Varianti per collezioni senza bonus (solo base)
    BASE_RARITIES: {
        base: { id: 'base', name: 'Base', color: 'emerald', probability: 1.0, cssClass: 'border-emerald-500' }
    },

    // Rarita per figurine (Giocatori Seri, Illustrazioni, Figurine Utenti)
    // Probabilita di default: Comune 40%, Non Comune 30%, Rara 18%, Molto Rara 9%, Leggendaria 3%
    FIGURINE_RARITIES: {
        1: { id: 1, name: 'Comune', color: 'gray', probability: 0.40, cssClass: 'border-gray-400', textClass: 'text-gray-400', icon: '⚪' },
        2: { id: 2, name: 'Non Comune', color: 'green', probability: 0.30, cssClass: 'border-green-500', textClass: 'text-green-400', icon: '🟢' },
        3: { id: 3, name: 'Rara', color: 'blue', probability: 0.18, cssClass: 'border-blue-500', textClass: 'text-blue-400', icon: '🔵' },
        4: { id: 4, name: 'Epica', color: 'purple', probability: 0.09, cssClass: 'border-purple-500', textClass: 'text-purple-400', icon: '🟣' },
        5: { id: 5, name: 'Leggendaria', color: 'orange', probability: 0.03, cssClass: 'border-orange-400', textClass: 'text-orange-400', icon: '🟠' }
    },

    // Cache per rarita figurine da Firestore
    _figurineRarities: null,

    // Alias per retrocompatibilita
    get RARITIES() {
        return this.ICONE_RARITIES;
    },

    // Bonus associati alle varianti quando usate come avatar (solo per Icone)
    // iconaChance: bonus % alla probabilita di attivazione bonus icona (base 50%)
    // xpBonus: bonus % all'XP formazione guadagnato dopo le partite
    VARIANT_BONUSES: {
        normale: { iconaChance: 0, xpBonus: 0, description: 'Nessun bonus' },
        evoluto: { iconaChance: 5, xpBonus: 5, description: '+5% Icona | +5% XP' },
        alternative: { iconaChance: 10, xpBonus: 5, description: '+10% Icona | +5% XP' },
        ultimate: { iconaChance: 15, xpBonus: 15, description: '+15% Icona | +15% XP' },
        fantasy: { iconaChance: 10, xpBonus: 10, description: '+10% Icona | +10% XP' },
        base: { iconaChance: 0, xpBonus: 0, description: 'Nessun bonus' }
    },

    // Cache
    _config: null,
    _configLoaded: false,
    _iconeList: null,

    /**
     * Ottiene l'URL dell'immagine figurina per una specifica icona e rarita
     * @param {string} iconaId - ID dell'icona
     * @param {string} rarity - Rarita (normale, evoluto, alternative, ultimate)
     * @returns {string} URL dell'immagine o null se non esiste
     */
    getFigurineImageUrl(iconaId, rarity = 'normale') {
        const files = this.FIGURINE_FILES[iconaId];
        if (!files) {
            return null;
        }

        const fileName = files[rarity];
        if (!fileName) {
            return null;
        }

        return `${this.FIGURINE_BASE_URL}${encodeURIComponent(fileName)}`;
    },

    /**
     * Ottiene i bonus associati a una variante
     * @param {string} variant - Variante (normale, evoluto, alternative, ultimate)
     * @returns {Object} { iconaChance, xpBonus, description }
     */
    getVariantBonuses(variant) {
        return this.VARIANT_BONUSES[variant] || this.VARIANT_BONUSES.normale;
    },

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
            // Pacchetto gratis (tutte le collezioni)
            freePackCooldownHours: 6,   // Ore di cooldown dopo apertura pacchetto gratis
            freePackChance1: 0.99,      // 99% = 1 figurina
            freePackChance2: 0.01,      // 1% = 2 figurine
            // Prezzo pacchetto in CS (Crediti Seri)
            packPriceCS: 150,
            // Prezzi pacchetti specifici per collezione (in CSS)
            collectionPackPrices: {
                icone: 1,
                giocatori_seri: 1,
                allenatori: 1,
                illustrazioni: 1,
                figurine_utenti: 1
            },
            // Probabilita varianti per collezione Icone
            iconeProbabilities: {
                normale: 50,
                evoluto: 25,
                alternative: 12,
                ultimate: 8,
                fantasy: 5
            },
            // Legacy (retrocompatibilita)
            packPriceCSS: 1,
            packPrice: 0,
            figurinesPerPack: 1,
            bonusFigurineChance: 0.01,  // 1% per pacchetto gratis (2 invece di 1)
            completionBonus: 500,       // Bonus per album completo
            sectionBonus: 50,           // Bonus per sezione completa
            // Scambio figurine duplicate: 3 figurine = X CS
            tradeRequiredCount: 3,
            tradeRewards: {
                normale: 50,
                evoluto: 75,
                alternative: 150,
                ultimate: 300,
                fantasy: 300,           // Stesso valore di ultimate
                base: 25                // Per collezioni senza varianti
            },
            // Probabilita rarita figurine (non-Icone)
            figurineRarityProbabilities: {
                1: 40,  // Comune
                2: 30,  // Non Comune
                3: 18,  // Rara
                4: 9,   // Molto Rara
                5: 3    // Leggendaria
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

                // Applica le probabilita salvate su Firestore (legacy + nuovo formato)
                const probs = this._config.iconeProbabilities || this._config.rarityProbabilities;
                if (probs) {
                    if (probs.normale !== undefined) this.ICONE_RARITIES.normale.probability = probs.normale / 100;
                    if (probs.evoluto !== undefined) this.ICONE_RARITIES.evoluto.probability = probs.evoluto / 100;
                    if (probs.alternative !== undefined) this.ICONE_RARITIES.alternative.probability = probs.alternative / 100;
                    if (probs.ultimate !== undefined) this.ICONE_RARITIES.ultimate.probability = probs.ultimate / 100;
                    if (probs.fantasy !== undefined) this.ICONE_RARITIES.fantasy.probability = probs.fantasy / 100;
                    console.log('[Figurine] Probabilita Icone caricate da Firestore:', probs);
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

    // ==================== RARITA FIGURINE ====================

    /**
     * Carica le rarita delle figurine da Firestore
     * Formato: { collectionId: { itemId: rarityLevel, ... }, ... }
     * @param {boolean} forceRefresh - Se true, ignora la cache e ricarica da Firestore
     */
    async loadFigurineRarities(forceRefresh = false) {
        console.log('[Figurine] loadFigurineRarities chiamata, forceRefresh:', forceRefresh);

        // Usa cache solo se non forzato il refresh
        if (this._figurineRarities && !forceRefresh) {
            console.log('[Figurine] Usando cache rarita');
            return this._figurineRarities;
        }

        const path = this.getConfigPath();
        console.log('[Figurine] loadFigurineRarities - path:', path);

        if (!path || !window.db || !window.firestoreTools) {
            console.warn('[Figurine] loadFigurineRarities: path/db/firestoreTools non disponibili');
            this._figurineRarities = this.getDefaultFigurineRarities();
            return this._figurineRarities;
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const fullPath = `${path}/figurineRarities`;
            console.log('[Figurine] Caricamento da path completo:', fullPath);

            const docRef = doc(window.db, path, 'figurineRarities');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('[Figurine] Documento trovato, chiavi:', Object.keys(data));
                // Rimuovi il campo updatedAt dai dati prima di usarli
                const { updatedAt, ...rarities } = data;
                this._figurineRarities = rarities;
                console.log('[Figurine] Rarita caricate da Firestore:', Object.keys(rarities));

                // Debug: mostra alcune rarita caricate
                if (rarities.illustrazioni) {
                    console.log('[Figurine] Rarita illustrazioni:', JSON.stringify(rarities.illustrazioni).substring(0, 100));
                }
            } else {
                console.log('[Figurine] Documento rarita NON esiste, uso default');
                this._figurineRarities = this.getDefaultFigurineRarities();
            }
        } catch (error) {
            console.error('[Figurine] Errore caricamento rarita:', error);
            this._figurineRarities = this.getDefaultFigurineRarities();
        }

        return this._figurineRarities;
    },

    /**
     * Salva le rarita delle figurine su Firestore
     */
    async saveFigurineRarities(rarities) {
        const path = this.getConfigPath();
        console.log('[Figurine] saveFigurineRarities - path:', path);
        console.log('[Figurine] saveFigurineRarities - rarities:', JSON.stringify(rarities).substring(0, 200));

        if (!path || !window.db || !window.firestoreTools) {
            console.error('[Figurine] Impossibile salvare rarita - manca:', { path: !!path, db: !!window.db, firestoreTools: !!window.firestoreTools });
            return false;
        }

        try {
            const { doc, setDoc } = window.firestoreTools;
            const fullPath = `${path}/figurineRarities`;
            console.log('[Figurine] Salvataggio su path completo:', fullPath);

            const docRef = doc(window.db, path, 'figurineRarities');
            const dataToSave = { ...rarities, updatedAt: new Date().toISOString() };
            await setDoc(docRef, dataToSave);

            this._figurineRarities = rarities;
            console.log('[Figurine] Rarita salvate con successo su:', fullPath);
            return true;
        } catch (error) {
            console.error('[Figurine] Errore salvataggio rarita:', error);
            return false;
        }
    },

    /**
     * Ottiene rarita di default (tutte Comune = 1)
     */
    getDefaultFigurineRarities() {
        const rarities = {};

        // Giocatori Seri
        rarities.giocatori_seri = {};
        Object.keys(this.GIOCATORI_SERI_FILES).forEach(id => {
            rarities.giocatori_seri[id] = 1; // Comune
        });

        // Illustrazioni
        rarities.illustrazioni = {};
        Object.keys(this.ILLUSTRAZIONI_FILES).forEach(id => {
            rarities.illustrazioni[id] = 1; // Comune
        });

        // Figurine Utenti
        rarities.figurine_utenti = {};
        Object.keys(this.FIGURINE_UTENTI_FILES).forEach(id => {
            rarities.figurine_utenti[id] = 1; // Comune
        });

        return rarities;
    },

    /**
     * Ottiene la rarita di una figurina specifica
     * @param {string} collectionId - ID collezione
     * @param {string} itemId - ID figurina
     * @returns {number} Livello rarita (1-5)
     */
    getFigurineRarity(collectionId, itemId) {
        if (!this._figurineRarities) {
            return 1; // Default: Comune
        }
        return this._figurineRarities[collectionId]?.[itemId] || 1;
    },

    /**
     * Ottiene info rarita per livello
     * @param {number} level - Livello rarita (1-5)
     * @returns {Object} Info rarita
     */
    getRarityInfo(level) {
        return this.FIGURINE_RARITIES[level] || this.FIGURINE_RARITIES[1];
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
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, teamId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const album = docSnap.data();

                // Assegna automaticamente il Wallpaper se non ce l'ha
                if (!album.collections?.illustrazioni?.wallpaper?.base) {
                    if (!album.collections) album.collections = {};
                    if (!album.collections.illustrazioni) album.collections.illustrazioni = {};
                    if (!album.collections.illustrazioni.wallpaper) album.collections.illustrazioni.wallpaper = {};
                    album.collections.illustrazioni.wallpaper.base = 1;

                    // Salva l'aggiornamento
                    try {
                        await updateDoc(docRef, {
                            'collections.illustrazioni.wallpaper.base': 1
                        });
                        console.log('[Figurine] Wallpaper assegnato automaticamente a', teamId);
                    } catch (e) {
                        console.warn('[Figurine] Errore assegnazione wallpaper:', e);
                    }
                }

                return album;
            }
            return this.createEmptyAlbum(teamId);
        } catch (error) {
            console.error('[Figurine] Errore caricamento album:', error);
            return this.createEmptyAlbum(teamId);
        }
    },

    /**
     * Crea un album vuoto (multi-collezione)
     */
    createEmptyAlbum(teamId) {
        const icone = this.getIconeList();

        // Collezione Icone (5 varianti)
        const iconeCollection = {};
        icone.forEach(icona => {
            iconeCollection[icona.id] = {
                normale: 0,
                evoluto: 0,
                alternative: 0,
                ultimate: 0,
                fantasy: 0
            };
        });

        // Collezione Giocatori Seri (solo base)
        const giocatoriSeriCollection = {};
        Object.keys(this.GIOCATORI_SERI_FILES).forEach(id => {
            giocatoriSeriCollection[id] = { base: 0 };
        });

        // Collezione Allenatori (solo base)
        const allenatoriCollection = {};
        Object.keys(this.ALLENATORI_FILES).forEach(id => {
            allenatoriCollection[id] = { base: 0 };
        });

        // Collezione Illustrazioni (solo base)
        // Wallpaper e' gratuito per tutti
        const illustrazioniCollection = {};
        Object.keys(this.ILLUSTRAZIONI_FILES).forEach(id => {
            illustrazioniCollection[id] = { base: id === 'wallpaper' ? 1 : 0 };
        });

        // Collezione Figurine Utenti (solo base)
        const figurineUtentiCollection = {};
        Object.keys(this.FIGURINE_UTENTI_FILES).forEach(id => {
            figurineUtentiCollection[id] = { base: 0 };
        });

        return {
            teamId,
            // Legacy (retrocompatibilita)
            collection: iconeCollection,
            // Nuovo sistema multi-collezione
            collections: {
                icone: iconeCollection,
                giocatori_seri: giocatoriSeriCollection,
                allenatori: allenatoriCollection,
                illustrazioni: illustrazioniCollection,
                figurine_utenti: figurineUtentiCollection
            },
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
     * Conta il totale delle figurine (inclusi duplicati) - collezione Icone
     */
    countTotalFigurine(collection) {
        let total = 0;
        Object.values(collection).forEach(icona => {
            total += (icona.normale || 0) + (icona.evoluto || 0) + (icona.alternative || 0) + (icona.ultimate || 0) + (icona.fantasy || 0);
        });
        return total;
    },

    /**
     * Conta le figurine uniche (almeno 1 di ogni tipo) - collezione Icone
     */
    countUniqueFigurine(collection) {
        let unique = 0;
        Object.values(collection).forEach(icona => {
            if (icona.normale > 0) unique++;
            if (icona.evoluto > 0) unique++;
            if (icona.alternative > 0) unique++;
            if (icona.ultimate > 0) unique++;
            if (icona.fantasy > 0) unique++;
        });
        return unique;
    },

    // ==================== BONUS FIGURINE ====================

    // Cache per album team (usato per calcoli sincroni durante simulazioni)
    _albumCache: {},
    _albumCacheTimestamp: {},
    ALBUM_CACHE_TTL: 5 * 60 * 1000, // 5 minuti

    /**
     * Conta il totale delle figurine uniche di un team incluse tutte le collezioni
     * @param {Object} album - Album del team
     * @returns {number} Numero totale di figurine uniche
     */
    countAllUniqueFigurine(album) {
        if (!album) return 0;

        let totalUnique = 0;

        // Conta figurine uniche dalla collezione Icone
        totalUnique += this.countUniqueFigurine(album.collection || {});

        // Conta figurine uniche dalle altre collezioni
        const collections = album.collections || {};
        Object.keys(collections).forEach(collId => {
            if (collId !== 'icone') { // icone gia contato sopra
                totalUnique += this.countCollectionUnique(collections, collId);
            }
        });

        return totalUnique;
    },

    /**
     * Calcola il bonus EXP basato sulle figurine uniche
     * @param {Object} album - Album del team
     * @returns {number} Bonus percentuale (es. 0.42 per 42 figurine uniche = 0.42%)
     */
    getUniqueFigurineExpBonus(album) {
        if (!album) return 0;
        const uniqueCount = this.countAllUniqueFigurine(album);
        return uniqueCount * 0.01; // 0.01% per figurina unica
    },

    /**
     * Calcola il bonus simulazione basato sulle figurine uniche
     * @param {Object} album - Album del team
     * @returns {number} Bonus modificatore (es. 0.42 per 42 figurine uniche)
     */
    getUniqueFigurineSimBonus(album) {
        if (!album) return 0;
        const uniqueCount = this.countAllUniqueFigurine(album);
        return uniqueCount * 0.01; // +0.01 per figurina unica
    },

    /**
     * Carica e mette in cache l'album di un team
     * @param {string} teamId - ID del team
     * @returns {Promise<Object>} Album del team
     */
    async loadAndCacheTeamAlbum(teamId) {
        if (!teamId) return null;

        const album = await this.loadTeamAlbum(teamId);
        if (album) {
            this._albumCache[teamId] = album;
            this._albumCacheTimestamp[teamId] = Date.now();
        }
        return album;
    },

    /**
     * Ottiene il conteggio delle figurine uniche in modo sincrono (usa cache)
     * @param {string} teamId - ID del team
     * @returns {number} Numero di figurine uniche (0 se non in cache)
     */
    getUniqueFigurineCountSync(teamId) {
        if (!teamId) return 0;

        const cached = this._albumCache[teamId];
        const timestamp = this._albumCacheTimestamp[teamId] || 0;

        // Controlla se la cache e valida
        if (cached && (Date.now() - timestamp) < this.ALBUM_CACHE_TTL) {
            return this.countAllUniqueFigurine(cached);
        }

        // Cache scaduta o non presente - avvia caricamento asincrono per prossima volta
        this.loadAndCacheTeamAlbum(teamId);

        // Ritorna il valore cached (anche se scaduto) o 0
        return cached ? this.countAllUniqueFigurine(cached) : 0;
    },

    /**
     * Pre-carica gli album di piu team (utile prima delle simulazioni)
     * @param {Array<string>} teamIds - Array di ID team
     */
    async preloadTeamAlbums(teamIds) {
        if (!teamIds || !Array.isArray(teamIds)) return;

        const loadPromises = teamIds.map(id => this.loadAndCacheTeamAlbum(id));
        await Promise.all(loadPromises);
        console.log(`[Figurine] Precaricati ${teamIds.length} album team`);
    },

    /**
     * Conta totale figurine per una collezione specifica
     */
    countCollectionTotal(collections, collectionId) {
        const coll = collections?.[collectionId];
        if (!coll) return 0;

        let total = 0;
        const collectionDef = this.COLLECTIONS[collectionId];
        const variants = collectionDef?.variants || ['base'];

        Object.values(coll).forEach(item => {
            variants.forEach(v => {
                total += item[v] || 0;
            });
        });
        return total;
    },

    /**
     * Conta figurine uniche per una collezione specifica
     */
    countCollectionUnique(collections, collectionId) {
        const coll = collections?.[collectionId];
        if (!coll) return 0;

        let unique = 0;
        const collectionDef = this.COLLECTIONS[collectionId];
        const variants = collectionDef?.variants || ['base'];

        Object.values(coll).forEach(item => {
            variants.forEach(v => {
                if ((item[v] || 0) > 0) unique++;
            });
        });
        return unique;
    },

    /**
     * Ottiene le sezioni complete (tutte le varianti di un personaggio) - collezione Icone
     */
    getCompletedSections(collection) {
        const completed = [];
        Object.entries(collection).forEach(([iconaId, counts]) => {
            // Tutte e 5 le varianti per le Icone
            if (counts.normale > 0 && counts.evoluto > 0 && counts.alternative > 0 && counts.ultimate > 0 && counts.fantasy > 0) {
                completed.push(iconaId);
            }
        });
        return completed;
    },

    /**
     * Verifica se l'album Icone e completo
     */
    isAlbumComplete(collection) {
        const icone = this.getIconeList();
        return Object.values(collection).every(counts =>
            counts.normale > 0 && counts.evoluto > 0 && counts.alternative > 0 && counts.ultimate > 0 && counts.fantasy > 0
        ) && Object.keys(collection).length >= icone.length;
    },

    /**
     * Verifica se una collezione specifica e completa
     */
    isCollectionComplete(collections, collectionId) {
        const coll = collections?.[collectionId];
        if (!coll) return false;

        const collectionDef = this.COLLECTIONS[collectionId];
        const variants = collectionDef?.variants || ['base'];
        const files = this.getCollectionFiles(collectionId);

        if (Object.keys(coll).length < Object.keys(files).length) return false;

        return Object.values(coll).every(item =>
            variants.every(v => (item[v] || 0) > 0)
        );
    },

    /**
     * Calcola il totale figurine di tutte le collezioni abilitate
     * Si aggiorna automaticamente quando si aggiungono nuove figurine/collezioni
     */
    getTotalFigurineCount() {
        let total = 0;

        Object.entries(this.COLLECTIONS).forEach(([collId, collDef]) => {
            if (!collDef.enabled) return;

            const files = this.getCollectionFiles(collId);
            const variants = collDef.variants || ['base'];
            total += Object.keys(files).length * variants.length;
        });

        return total;
    },

    /**
     * Conta le figurine uniche possedute in tutte le collezioni
     */
    countAllCollectionsUnique(collections) {
        let total = 0;

        Object.entries(this.COLLECTIONS).forEach(([collId, collDef]) => {
            if (!collDef.enabled) return;
            total += this.countCollectionUnique(collections, collId);
        });

        return total;
    },

    /**
     * Calcola la percentuale di completamento globale (tutte le collezioni)
     */
    getGlobalCompletionPercentage(collections) {
        const maxFigurine = this.getTotalFigurineCount();
        if (maxFigurine === 0) return 0;

        const unique = this.countAllCollectionsUnique(collections);
        return Math.round((unique / maxFigurine) * 100);
    },

    /**
     * Calcola la percentuale di completamento - collezione Icone
     */
    getCompletionPercentage(collection) {
        const icone = this.getIconeList();
        const maxFigurine = icone.length * 5; // 5 varianti per icona
        const unique = this.countUniqueFigurine(collection);
        return Math.round((unique / maxFigurine) * 100);
    },

    /**
     * Calcola percentuale di completamento per una collezione specifica
     */
    getCollectionCompletionPercentage(collections, collectionId) {
        const coll = collections?.[collectionId];
        if (!coll) return 0;

        const files = this.getCollectionFiles(collectionId);
        const collectionDef = this.COLLECTIONS[collectionId];
        const variants = collectionDef?.variants || ['base'];
        const maxFigurine = Object.keys(files).length * variants.length;

        if (maxFigurine === 0) return 0;

        const unique = this.countCollectionUnique(collections, collectionId);
        return Math.round((unique / maxFigurine) * 100);
    },

    /**
     * Ottiene i file per una collezione specifica
     */
    getCollectionFiles(collectionId) {
        switch (collectionId) {
            case 'icone': return this.FIGURINE_FILES;
            case 'giocatori_seri': return this.GIOCATORI_SERI_FILES;
            case 'allenatori': return this.ALLENATORI_FILES;
            case 'illustrazioni': return this.ILLUSTRAZIONI_FILES;
            case 'figurine_utenti': return this.FIGURINE_UTENTI_FILES;
            default: return {};
        }
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
     * Estrae una figurina casuale dalla collezione Icone
     */
    extractRandomFigurina() {
        return this.extractRandomFromCollection('icone');
    },

    /**
     * Estrae una figurina casuale da una collezione specifica
     * @param {string} collectionId - ID della collezione (icone, giocatori_seri, allenatori)
     */
    extractRandomFromCollection(collectionId) {
        const collectionDef = this.COLLECTIONS[collectionId];
        if (!collectionDef) {
            console.error('[Figurine] Collezione non trovata:', collectionId);
            return null;
        }

        const files = this.getCollectionFiles(collectionId);
        const itemIds = Object.keys(files);

        if (itemIds.length === 0) {
            console.warn('[Figurine] Collezione vuota:', collectionId);
            return null;
        }

        // Seleziona un elemento casuale dalla collezione
        const randomId = itemIds[Math.floor(Math.random() * itemIds.length)];
        const variants = collectionDef.variants;

        let variant = variants[0]; // Default alla prima variante

        if (collectionId === 'icone') {
            // Per le Icone: determina variante con probabilita cumulative
            // Ordine: fantasy (5%), ultimate (8%), alternative (12%), evoluto (25%), normale (50%)
            const roll = Math.random();
            let cumulative = 0;

            cumulative += this.ICONE_RARITIES.fantasy.probability;
            if (roll < cumulative) {
                variant = 'fantasy';
            } else {
                cumulative += this.ICONE_RARITIES.ultimate.probability;
                if (roll < cumulative) {
                    variant = 'ultimate';
                } else {
                    cumulative += this.ICONE_RARITIES.alternative.probability;
                    if (roll < cumulative) {
                        variant = 'alternative';
                    } else {
                        cumulative += this.ICONE_RARITIES.evoluto.probability;
                        if (roll < cumulative) {
                            variant = 'evoluto';
                        } else {
                            variant = 'normale';
                        }
                    }
                }
            }
        }

        // Ottieni info per collezione Icone
        if (collectionId === 'icone') {
            const icona = this.getIconaById(randomId);
            return {
                collectionId: 'icone',
                itemId: randomId,
                iconaId: randomId, // Legacy
                iconaName: icona?.name || randomId,
                iconaPhoto: icona?.photoUrl,
                rarity: variant,
                variant: variant,
                rarityInfo: this.ICONE_RARITIES[variant],
                imageUrl: this.getFigurineImageUrl(randomId, variant)
            };
        }

        // Per altre collezioni: usa sistema rarita
        // 1. Determina rarita in base alle probabilita configurate
        const config = this._config || this.getDefaultConfig();
        const rarityProbs = config.figurineRarityProbabilities || { 1: 40, 2: 30, 3: 18, 4: 9, 5: 3 };

        // Roll per la rarita (dal piu raro al meno raro)
        const roll = Math.random() * 100;
        let targetRarity = 1; // Default: Comune
        let cumulative = 0;

        // Ordine: Leggendaria (5) -> Molto Rara (4) -> Rara (3) -> Non Comune (2) -> Comune (1)
        for (let r = 5; r >= 1; r--) {
            cumulative += rarityProbs[r] || 0;
            if (roll < cumulative) {
                targetRarity = r;
                break;
            }
        }

        // 2. Trova figurine di quella rarita nella collezione
        const figurinesOfRarity = itemIds.filter(id => {
            const figRarity = this.getFigurineRarity(collectionId, id);
            return figRarity === targetRarity;
        });

        // 3. Se ci sono figurine di quella rarita, pesca da quelle; altrimenti pesca casuale
        let selectedId;
        let actualRarity;
        if (figurinesOfRarity.length > 0) {
            selectedId = figurinesOfRarity[Math.floor(Math.random() * figurinesOfRarity.length)];
            actualRarity = targetRarity;
        } else {
            // Fallback: pesca casuale e usa la rarita assegnata
            selectedId = itemIds[Math.floor(Math.random() * itemIds.length)];
            actualRarity = this.getFigurineRarity(collectionId, selectedId);
        }

        const itemName = files[selectedId]?.name || selectedId;
        const rarityInfo = this.getRarityInfo(actualRarity);

        return {
            collectionId: collectionId,
            itemId: selectedId,
            itemName: itemName,
            iconaName: itemName, // Legacy compatibility
            variant: 'base',
            rarity: actualRarity,
            rarityLevel: actualRarity,
            rarityInfo: rarityInfo,
            imageUrl: `${collectionDef.baseUrl}${encodeURIComponent(files[selectedId]?.base || '')}`
        };
    },

    /**
     * Estrae una figurina casuale da qualsiasi collezione abilitata
     */
    extractRandomFromAnyCollection() {
        const randomCollectionId = this.getRandomEnabledCollection();
        return this.extractRandomFromCollection(randomCollectionId);
    },

    /**
     * Ottiene una collezione casuale tra quelle abilitate con elementi
     */
    getRandomEnabledCollection() {
        const enabledCollections = this.getEnabledCollectionsWithItems();
        if (enabledCollections.length === 0) {
            return 'icone'; // Fallback
        }
        return enabledCollections[Math.floor(Math.random() * enabledCollections.length)];
    },

    /**
     * Ottiene lista di collezioni abilitate con almeno un elemento
     */
    getEnabledCollectionsWithItems() {
        return Object.keys(this.COLLECTIONS).filter(id => {
            const coll = this.COLLECTIONS[id];
            const files = this.getCollectionFiles(id);
            return coll.enabled && Object.keys(files).length > 0;
        });
    },

    /**
     * Blocca immediatamente il pacchetto gratis salvando il timestamp su Firebase
     * DEVE essere chiamato PRIMA dell'estrazione per evitare exploit
     * @param {string} teamId - ID squadra
     * @returns {Promise<boolean>} true se bloccato con successo
     */
    async lockFreePack(teamId) {
        console.log('[Figurine] lockFreePack - Blocco immediato pacchetto per:', teamId);

        const path = this.getTeamFigurinePath(teamId);
        if (!path || !window.db || !window.firestoreTools) {
            console.error('[Figurine] Impossibile bloccare pacchetto');
            return false;
        }

        try {
            const { doc, getDoc, setDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, teamId);
            const nowTimestamp = new Date().toISOString();

            // Carica album esistente o crea nuovo
            const docSnap = await getDoc(docRef);
            let album;
            if (docSnap.exists()) {
                album = docSnap.data();
            } else {
                album = this.createEmptyAlbum(teamId);
            }

            // Salva SUBITO il timestamp per bloccare ulteriori tentativi
            album.lastFreePack = nowTimestamp;
            album.updatedAt = nowTimestamp;

            await setDoc(docRef, album);
            console.log('[Figurine] Pacchetto bloccato con successo, timestamp:', nowTimestamp);
            return true;
        } catch (error) {
            console.error('[Figurine] Errore blocco pacchetto:', error);
            return false;
        }
    },

    /**
     * Apre un pacchetto di figurine gratis da una collezione specifica
     * 99% una figurina, 1% due figurine
     * @param {string} teamId - ID squadra
     * @param {string} collectionId - ID collezione scelta dall'utente
     */
    async openFreePack(teamId, collectionId = null) {
        const config = await this.loadConfig();
        const album = await this.loadTeamAlbum(teamId);

        // Verifica cooldown
        if (!this.canOpenFreePack(album)) {
            throw new Error('Pacchetto gratis non ancora disponibile');
        }

        // Se non specificata una collezione, usa estrazione casuale (legacy)
        if (!collectionId) {
            collectionId = this.getRandomEnabledCollection();
        }

        // Verifica che la collezione sia valida e abbia elementi
        const files = this.getCollectionFiles(collectionId);
        if (Object.keys(files).length === 0) {
            throw new Error('Collezione non disponibile');
        }

        // IMPORTANTE: Blocca SUBITO il pacchetto su Firebase PRIMA dell'estrazione
        // Questo previene exploit di ricarica pagina
        const locked = await this.lockFreePack(teamId);
        if (!locked) {
            throw new Error('Errore di connessione. Riprova.');
        }

        // Aggiorna timestamp locale nell'album (gia salvato su Firebase)
        album.lastFreePack = new Date().toISOString();

        // Determina numero figurine: 99% una, 1% due
        const bonusChance = config.freePackChance2 || config.bonusFigurineChance || 0.01;
        const numFigurine = Math.random() < bonusChance ? 2 : 1;

        // Estrai figurine dalla collezione scelta
        const extracted = [];
        for (let i = 0; i < numFigurine; i++) {
            const figurina = this.extractRandomFromCollection(collectionId);
            if (figurina) {
                extracted.push(figurina);
                this.addFigurinaToAlbum(album, figurina);
            }
        }

        // Verifica bonus completamento
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
            isFree: true,
            gotBonus: numFigurine > 1
        };
    },

    /**
     * Apre un pacchetto di figurine a pagamento per una collezione specifica
     * @param {string} teamId - ID squadra
     * @param {string} collectionId - ID collezione (icone, giocatori_seri, allenatori)
     */
    async openCollectionPack(teamId, collectionId, currency = 'css') {
        const config = await this.loadConfig();
        const album = await this.loadTeamAlbum(teamId);

        // Verifica che la collezione esista
        if (!this.COLLECTIONS[collectionId]) {
            throw new Error(`Collezione "${collectionId}" non trovata`);
        }

        const teamData = await this.getTeamData(teamId);

        // Calcola costi
        const csPrice = config.packPriceCS || 150;
        const cssPrice = config.collectionPackPrices?.[collectionId] || config.packPriceCSS || 1;
        let paidAmount = 0;

        // Gestisci pagamento in base alla valuta
        if (currency === 'cs') {
            // Acquisto con CS (Crediti Seri)
            const currentCS = teamData?.budget || 0; // FIX: era creditiSeri, il campo corretto e budget

            if (currentCS < csPrice) {
                throw new Error(`CS insufficienti (hai ${currentCS}, servono ${csPrice})`);
            }

            // Sottrai CS
            await this.updateTeamCS(teamId, -csPrice);
            paidAmount = csPrice;
        } else {
            // Acquisto con CSS (Crediti Super Seri)
            const currentCSS = teamData?.creditiSuperSeri || 0;

            if (currentCSS < cssPrice) {
                throw new Error(`CSS insufficienti (hai ${currentCSS}, servono ${cssPrice})`);
            }

            // Sottrai CSS
            await this.updateTeamCSS(teamId, -cssPrice);
            paidAmount = cssPrice;
        }

        // Estrai figurina dalla collezione specifica
        const figurina = this.extractRandomFromCollection(collectionId);
        if (!figurina) {
            // Rimborsa se estrazione fallita
            if (currency === 'cs') {
                await this.updateTeamCS(teamId, csPrice);
            } else {
                await this.updateTeamCSS(teamId, cssPrice);
            }
            throw new Error(`Impossibile estrarre da collezione "${collectionId}"`);
        }

        // Aggiungi all'album
        this.addFigurinaToAlbum(album, figurina);

        // Verifica bonus completamento
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
            figurine: [figurina],
            album: album,
            bonusEarned: bonusEarned,
            collectionId: collectionId,
            cost: paidAmount,
            currency: currency,
            isFree: false
        };
    },

    /**
     * Aggiunge una figurina all'album (helper interno)
     */
    addFigurinaToAlbum(album, figurina) {
        const collectionId = figurina.collectionId || 'icone';
        const itemId = figurina.itemId || figurina.iconaId;
        const variant = figurina.variant || figurina.rarity;

        // Inizializza struttura collections se non esiste
        if (!album.collections) {
            album.collections = {
                icone: album.collection || {},
                giocatori_seri: {},
                allenatori: {}
            };
        }

        // Assicurati che la collezione esista
        if (!album.collections[collectionId]) {
            album.collections[collectionId] = {};
        }

        // Assicurati che l'item esista nella collezione
        if (!album.collections[collectionId][itemId]) {
            const collDef = this.COLLECTIONS[collectionId];
            const variants = collDef?.variants || ['base'];
            album.collections[collectionId][itemId] = {};
            variants.forEach(v => {
                album.collections[collectionId][itemId][v] = 0;
            });
        }

        // Incrementa il contatore
        album.collections[collectionId][itemId][variant] = (album.collections[collectionId][itemId][variant] || 0) + 1;

        // Aggiorna anche collection legacy per le icone
        if (collectionId === 'icone') {
            if (!album.collection) album.collection = {};
            if (!album.collection[itemId]) {
                album.collection[itemId] = { normale: 0, evoluto: 0, alternative: 0, ultimate: 0, fantasy: 0 };
            }
            album.collection[itemId][variant] = (album.collection[itemId][variant] || 0) + 1;
        }
    },

    /**
     * Legacy: Apre un pacchetto di figurine
     * Usa openFreePack o openCollectionPack invece
     */
    async openPack(teamId, isFree = false) {
        if (isFree) {
            return this.openFreePack(teamId);
        }
        // Default a icone per retrocompatibilita
        return this.openCollectionPack(teamId, 'icone');
    },

    // ==================== SCAMBIO FIGURINE ====================

    /**
     * Conta le figurine duplicate scambiabili per rarita (collezione Icone)
     * Duplicate = quelle oltre la prima (quella nell'album)
     * @param {Object} collection - La collezione dell'album
     * @returns {Object} { normale: X, evoluto: Y, alternative: Z, ultimate: W, fantasy: V }
     */
    countTradableDuplicates(collection) {
        const duplicates = {
            normale: 0,
            evoluto: 0,
            alternative: 0,
            ultimate: 0,
            fantasy: 0
        };

        Object.values(collection).forEach(iconaCounts => {
            // Per ogni rarita, le duplicate sono quelle oltre la prima
            if (iconaCounts.normale > 1) duplicates.normale += iconaCounts.normale - 1;
            if (iconaCounts.evoluto > 1) duplicates.evoluto += iconaCounts.evoluto - 1;
            if (iconaCounts.alternative > 1) duplicates.alternative += iconaCounts.alternative - 1;
            if (iconaCounts.ultimate > 1) duplicates.ultimate += iconaCounts.ultimate - 1;
            if (iconaCounts.fantasy > 1) duplicates.fantasy += iconaCounts.fantasy - 1;
        });

        return duplicates;
    },

    /**
     * Conta figurine duplicate per una collezione specifica
     */
    countCollectionDuplicates(collections, collectionId) {
        const coll = collections?.[collectionId];
        if (!coll) return {};

        const collectionDef = this.COLLECTIONS[collectionId];
        const variants = collectionDef?.variants || ['base'];
        const duplicates = {};
        variants.forEach(v => duplicates[v] = 0);

        Object.values(coll).forEach(item => {
            variants.forEach(v => {
                if ((item[v] || 0) > 1) {
                    duplicates[v] += item[v] - 1;
                }
            });
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
            normale: Math.floor((duplicates.normale || 0) / requiredCount),
            evoluto: Math.floor((duplicates.evoluto || 0) / requiredCount),
            alternative: Math.floor((duplicates.alternative || 0) / requiredCount),
            ultimate: Math.floor((duplicates.ultimate || 0) / requiredCount),
            fantasy: Math.floor((duplicates.fantasy || 0) / requiredCount),
            base: Math.floor((duplicates.base || 0) / requiredCount)
        };
    },

    /**
     * Esegue uno scambio di figurine duplicate per CS
     * @param {string} teamId - ID squadra
     * @param {string} rarity - Rarita da scambiare (normale, evoluto, alternative, ultimate, fantasy, base)
     * @param {number} count - Numero di scambi da fare (default 1)
     * @returns {Object} { success, csEarned, message }
     */
    async tradeDuplicates(teamId, rarity, count = 1) {
        const config = await this.loadConfig();
        const album = await this.loadTeamAlbum(teamId);
        const requiredCount = config.tradeRequiredCount || 3;
        const rewards = config.tradeRewards || { normale: 50, evoluto: 75, alternative: 150, ultimate: 300, fantasy: 300, base: 30 };
        const reward = rewards[rarity] || 0;

        if (!reward) {
            return { success: false, message: `Rarita "${rarity}" non valida` };
        }

        const totalRequired = requiredCount * count;

        // Per rarita "base", gestisci le collezioni non-icone
        if (rarity === 'base') {
            let baseDuplicates = 0;
            const albumCollections = album.collections || {};
            Object.entries(albumCollections).forEach(([collId, collData]) => {
                if (collId === 'icone') return;
                Object.values(collData || {}).forEach(item => {
                    if ((item.base || 0) > 1) {
                        baseDuplicates += item.base - 1;
                    }
                });
            });

            if (baseDuplicates < totalRequired) {
                return {
                    success: false,
                    message: `Figurine insufficienti: hai ${baseDuplicates} duplicate base, servono ${totalRequired}`
                };
            }

            // Rimuovi le figurine base duplicate
            let toRemove = totalRequired;
            for (const collId in albumCollections) {
                if (collId === 'icone') continue;
                if (toRemove <= 0) break;

                const collData = albumCollections[collId];
                for (const itemId in collData) {
                    if (toRemove <= 0) break;
                    const item = collData[itemId];
                    if ((item.base || 0) > 1) {
                        const removable = item.base - 1;
                        const removeNow = Math.min(removable, toRemove);
                        item.base -= removeNow;
                        toRemove -= removeNow;
                    }
                }
            }
        } else {
            // Gestione normale per icone
            const duplicates = this.countTradableDuplicates(album.collection || {});

            if ((duplicates[rarity] || 0) < totalRequired) {
                return {
                    success: false,
                    message: `Figurine insufficienti: hai ${duplicates[rarity] || 0} duplicate ${rarity}, servono ${totalRequired}`
                };
            }

            // Rimuovi le figurine dalla collezione (le duplicate, non la prima)
            let toRemove = totalRequired;
            for (const iconaId in album.collection) {
                if (toRemove <= 0) break;

                const iconaCounts = album.collection[iconaId];
                if ((iconaCounts[rarity] || 0) > 1) {
                    const removable = iconaCounts[rarity] - 1; // Lascia sempre almeno 1
                    const removeNow = Math.min(removable, toRemove);
                    iconaCounts[rarity] -= removeNow;
                    toRemove -= removeNow;
                }
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
     * @param {string} rarity - Rarita da scambiare (normale, evoluto, alternative, ultimate, fantasy, base)
     * @returns {Object} { success, csEarned, traded, message }
     */
    async tradeAllDuplicates(teamId, rarity) {
        const config = await this.loadConfig();
        const album = await this.loadTeamAlbum(teamId);
        const requiredCount = config.tradeRequiredCount || 3;

        // Per rarita "base", conta i duplicati da tutte le collezioni non-icone
        let duplicateCount = 0;
        if (rarity === 'base') {
            const albumCollections = album.collections || {};
            Object.entries(albumCollections).forEach(([collId, collData]) => {
                if (collId === 'icone') return;
                Object.values(collData || {}).forEach(item => {
                    if ((item.base || 0) > 1) {
                        duplicateCount += item.base - 1;
                    }
                });
            });
        } else {
            const duplicates = this.countTradableDuplicates(album.collection || {});
            duplicateCount = duplicates[rarity] || 0;
        }

        const possibleTrades = Math.floor(duplicateCount / requiredCount);

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
        if (!appId || !window.db) {
            console.warn('[Figurine] getTeamData: appId o db mancante', { appId, hasDb: !!window.db });
            return null;
        }
        if (!teamId) {
            console.warn('[Figurine] getTeamData: teamId mancante');
            return null;
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const teamRef = doc(window.db, `artifacts/${appId}/public/data/teams`, teamId);
            const teamSnap = await getDoc(teamRef);
            const data = teamSnap.exists() ? teamSnap.data() : null;
            if (!data) {
                console.warn('[Figurine] getTeamData: documento non trovato per', teamId);
            }
            return data;
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
    },

    /**
     * Aggiorna i Crediti Seri (CS) di un team
     * @param {string} teamId - ID squadra
     * @param {number} amount - Quantita da aggiungere (o sottrarre se negativo)
     */
    async updateTeamCS(teamId, amount) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) return false;

        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const teamRef = doc(window.db, `artifacts/${appId}/public/data/teams`, teamId);
            const teamSnap = await getDoc(teamRef);

            if (!teamSnap.exists()) return false;

            // FIX: era creditiSeri, il campo corretto e budget
            const currentCS = teamSnap.data().budget || 0;
            await updateDoc(teamRef, { budget: currentCS + amount });
            return true;
        } catch (error) {
            console.error('[Figurine] Errore aggiornamento CS:', error);
            return false;
        }
    },

    // ==================== SFONDO DASHBOARD ====================

    /**
     * Salva la preferenza dello sfondo dashboard per un team
     * @param {string} teamId - ID del team
     * @param {string} itemId - ID della figurina illustrazione (o null per rimuovere)
     */
    async saveDashboardBackground(teamId, itemId) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db || !teamId) {
            console.error('[Figurine] Impossibile salvare sfondo');
            return false;
        }

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const teamRef = doc(window.db, `artifacts/${appId}/public/data/teams`, teamId);

            if (itemId) {
                // Salva sfondo - usa customUrl se disponibile
                const itemData = this.ILLUSTRAZIONI_FILES[itemId];
                const imgUrl = itemData?.customUrl ||
                    `${this.COLLECTIONS.illustrazioni.baseUrl}${encodeURIComponent(itemData?.base || '')}`;
                await updateDoc(teamRef, {
                    dashboardBackground: {
                        itemId: itemId,
                        imageUrl: imgUrl,
                        updatedAt: new Date().toISOString()
                    }
                });
                console.log('[Figurine] Sfondo salvato:', itemId, imgUrl);
            } else {
                // Rimuovi sfondo
                await updateDoc(teamRef, { dashboardBackground: null });
                console.log('[Figurine] Sfondo rimosso');
            }

            // Aggiorna anche currentTeamData
            if (window.InterfacciaCore?.currentTeamData) {
                const itemData = this.ILLUSTRAZIONI_FILES[itemId];
                const imgUrl = itemData?.customUrl ||
                    `${this.COLLECTIONS.illustrazioni.baseUrl}${encodeURIComponent(itemData?.base || '')}`;
                window.InterfacciaCore.currentTeamData.dashboardBackground = itemId ? {
                    itemId,
                    imageUrl: imgUrl
                } : null;
            }

            return true;
        } catch (error) {
            console.error('[Figurine] Errore salvataggio sfondo:', error);
            return false;
        }
    },

    /**
     * Salva lo sfondo dashboard usando un URL diretto (per figurine/varianti)
     * @param {string} teamId - ID del team
     * @param {string} imageUrl - URL dell'immagine
     * @param {string} title - Titolo/nome dell'immagine
     */
    async saveDashboardBackgroundDirect(teamId, imageUrl, title) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db || !teamId) {
            console.error('[Figurine] Impossibile salvare sfondo diretto');
            return false;
        }

        try {
            const { doc, updateDoc } = window.firestoreTools;
            const teamRef = doc(window.db, `artifacts/${appId}/public/data/teams`, teamId);

            await updateDoc(teamRef, {
                dashboardBackground: {
                    itemId: title,
                    imageUrl: imageUrl,
                    updatedAt: new Date().toISOString()
                }
            });
            console.log('[Figurine] Sfondo diretto salvato:', title, imageUrl);

            // Aggiorna anche currentTeamData
            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.dashboardBackground = {
                    itemId: title,
                    imageUrl: imageUrl
                };
            }

            return true;
        } catch (error) {
            console.error('[Figurine] Errore salvataggio sfondo diretto:', error);
            return false;
        }
    },

    /**
     * Ottiene lo sfondo dashboard corrente di un team
     * @param {string} teamId - ID del team
     * @returns {Object|null} { itemId, imageUrl } o null
     */
    async getDashboardBackground(teamId) {
        const teamData = await this.getTeamData(teamId);
        return teamData?.dashboardBackground || null;
    },

    /**
     * Verifica se un utente possiede una specifica illustrazione
     * @param {Object} album - Album dell'utente
     * @param {string} itemId - ID dell'illustrazione
     */
    hasIllustrazione(album, itemId) {
        const count = album?.collections?.illustrazioni?.[itemId]?.base || 0;
        return count > 0;
    },

    // ==================== ADMIN UTILITIES ====================

    /**
     * Sblocca una figurina specifica per tutti i team esistenti
     * Uso: await window.FigurineSystem.unlockFigurinaForAll('illustrazioni', 'wallpaper')
     * @param {string} collectionId - ID collezione (es. 'illustrazioni')
     * @param {string} itemId - ID figurina (es. 'wallpaper')
     * @param {number} count - Quantita da assegnare (default 1)
     */
    async unlockFigurinaForAll(collectionId, itemId, count = 1) {
        const appId = window.firestoreTools?.appId;
        if (!appId || !window.db) {
            console.error('[Figurine] appId o db mancante');
            return { success: false, message: 'Database non disponibile' };
        }

        try {
            const { collection, getDocs, doc, updateDoc, getDoc } = window.firestoreTools;
            const figurinePath = `artifacts/${appId}/public/data/figurine`;
            const figurineCollection = collection(window.db, figurinePath);
            const snapshot = await getDocs(figurineCollection);

            let updated = 0;
            let errors = 0;

            for (const docSnap of snapshot.docs) {
                try {
                    const albumData = docSnap.data();

                    // Inizializza struttura se non esiste
                    if (!albumData.collections) {
                        albumData.collections = {};
                    }
                    if (!albumData.collections[collectionId]) {
                        albumData.collections[collectionId] = {};
                    }
                    if (!albumData.collections[collectionId][itemId]) {
                        albumData.collections[collectionId][itemId] = { base: 0 };
                    }

                    // Aggiorna solo se non ha gia la figurina
                    const current = albumData.collections[collectionId][itemId]?.base || 0;
                    if (current < count) {
                        const updatePath = `collections.${collectionId}.${itemId}.base`;
                        await updateDoc(doc(window.db, figurinePath, docSnap.id), {
                            [updatePath]: count
                        });
                        updated++;
                        console.log(`[Figurine] Sbloccata ${itemId} per team ${docSnap.id}`);
                    }
                } catch (err) {
                    errors++;
                    console.error(`[Figurine] Errore per team ${docSnap.id}:`, err);
                }
            }

            const message = `Figurina "${itemId}" sbloccata per ${updated} team (${errors} errori)`;
            console.log('[Figurine]', message);
            return { success: true, updated, errors, message };
        } catch (error) {
            console.error('[Figurine] Errore sblocco globale:', error);
            return { success: false, message: error.message };
        }
    }
};

console.log('Modulo figurine.js caricato.');
