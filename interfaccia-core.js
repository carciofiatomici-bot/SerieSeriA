//
// ====================================================================
// MODULO INTERFACCIA-CORE.JS (Variabili Globali, Costanti, Helpers)
// ====================================================================
//

// Dichiarazioni globali per i servizi Firebase (vengono inizializzate in index.html)
let auth;
let db;
let firestoreTools;
let currentTeamId = null; // Memorizza l'ID della squadra corrente
let currentTeamData = null; // VARIABILE GLOBALE PER I DATI COMPLETI DELLA SQUADRA
let teamLogosMap = {}; // Mappa per salvare {teamId: logoUrl} di tutte le squadre
let captainCandidates = []; // candidati Icona (Capitano Iniziale)

// Esporta le variabili globali per gli altri moduli
window.InterfacciaCore = {
    // Getter/Setter per le variabili globali
    get auth() { return auth; },
    set auth(val) { auth = val; },
    
    get db() { return db; },
    set db(val) { db = val; },
    
    get firestoreTools() { return firestoreTools; },
    set firestoreTools(val) { firestoreTools = val; },
    
    get currentTeamId() { return currentTeamId; },
    set currentTeamId(val) { currentTeamId = val; },
    
    get currentTeamData() { return currentTeamData; },
    set currentTeamData(val) { currentTeamData = val; },
    
    get teamLogosMap() { return teamLogosMap; },
    set teamLogosMap(val) { teamLogosMap = val; },
    
    get captainCandidates() { return captainCandidates; },
    set captainCandidates(val) { captainCandidates = val; },
};

// --- FUNZIONI HELPER PER SICUREZZA ---

/**
 * Escape HTML per prevenire XSS attacks
 * Usa questa funzione SEMPRE quando inserisci dati utente in innerHTML
 * @param {string} text - Testo da escapare
 * @returns {string} - Testo safe per HTML
 */
window.escapeHtml = function(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
};

/**
 * Valida URL per prevenire javascript: injection
 * @param {string} url - URL da validare
 * @returns {boolean} - true se l'URL e' sicuro
 */
window.isValidUrl = function(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'data:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};

/**
 * Sanitizza URL immagine - ritorna placeholder se non valido
 * @param {string} url - URL da sanitizzare
 * @returns {string} - URL sicuro o placeholder
 */
window.sanitizeImageUrl = function(url) {
    if (!url || !window.isValidUrl(url)) {
        return 'https://via.placeholder.com/100?text=No+Image';
    }
    return url;
};

/**
 * Valida e parsa un intero con range
 * @param {any} value - Valore da parsare
 * @param {number} min - Valore minimo
 * @param {number} max - Valore massimo
 * @param {number} defaultVal - Valore di default se non valido
 * @returns {number} - Numero validato
 */
window.parseIntSafe = function(value, min, max, defaultVal) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return defaultVal;
    if (parsed < min) return min;
    if (parsed > max) return max;
    return parsed;
};

// --- FUNZIONE HELPER PER SANITIZZARE URL GITHUB ---
/**
 * Converte URL GitHub dal vecchio formato (github.com/.../blob/...?raw=true)
 * al nuovo formato (raw.githubusercontent.com/...)
 * @param {string} url - URL da sanitizzare
 * @returns {string} - URL nel formato corretto
 */
window.sanitizeGitHubUrl = function(url) {
    if (!url || typeof url !== 'string') return url;

    // Se e' gia' nel formato corretto, ritorna cosi' com'e'
    if (url.includes('raw.githubusercontent.com')) {
        return url.replace('?raw=true', '');
    }

    // Converti dal vecchio formato github.com/.../blob/... al nuovo
    if (url.includes('github.com') && url.includes('/blob/')) {
        let newUrl = url
            .replace('github.com', 'raw.githubusercontent.com')
            .replace('/blob/', '/')
            .replace('?raw=true', '');
        return newUrl;
    }

    return url;
};

// --- COSTANTI GLOBALI ---
window.InterfacciaConstants = {
    // Nome utente admin (case-insensitive)
    ADMIN_USERNAME: "serieseria",
    ADMIN_USERNAME_LOWER: "serieseria",

    // RIMOSSO: Password hardcoded (sicurezza)
    // L'accesso admin ora è basato su:
    // 1. teamName === "serieseria" (case insensitive)
    // 2. OPPURE isAdmin === true nel documento Firestore della squadra

    // Logo Placeholder
    DEFAULT_LOGO_URL: "https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg",
    
    // Limite massimo di giocatori nella rosa (escludendo l'Icona)
    MAX_ROSA_PLAYERS: 12, // 12 giocatori + 1 Icona
    
    // Collezioni Firestore (verranno inizializzate con appId)
    getTeamsCollectionPath: (appId) => `artifacts/${appId}/public/data/teams`,
    getScheduleCollectionPath: (appId) => `artifacts/${appId}/public/data/schedule`,
    getLeaderboardCollectionPath: (appId) => `artifacts/${appId}/public/data/leaderboard`,
    
    SCHEDULE_DOC_ID: 'full_schedule',
    LEADERBOARD_DOC_ID: 'standings',
    
    // NUOVE COSTANTI COOLDOWN
    // Le chiavi sono state cambiate per la persistenza separata
    COOLDOWN_DRAFT_KEY: 'lastDraftAcquisitionTimestamp',
    COOLDOWN_MARKET_KEY: 'lastMarketAcquisitionTimestamp',
    ACQUISITION_COOLDOWN_MS: 15 * 60 * 1000,

    // AUTOMAZIONE CRON: 2 giorni in millisecondi
    AUTO_SIMULATION_COOLDOWN_MS: 48 * 60 * 60 * 1000,
};

// --- FUNZIONE HELPER PER VERIFICARE ADMIN ---
/**
 * Verifica se una squadra ha permessi admin.
 * Admin se: teamName === "serieseria" (case insensitive) OPPURE isAdmin === true
 * @param {string} teamName - Nome della squadra
 * @param {object} teamData - Dati della squadra da Firestore (opzionale)
 * @returns {boolean}
 */
window.isTeamAdmin = function(teamName, teamData = null) {
    // Check 1: nome squadra è "serieseria"
    if (teamName && teamName.toLowerCase() === 'serieseria') {
        return true;
    }
    // Check 2: campo isAdmin nel documento
    if (teamData && teamData.isAdmin === true) {
        return true;
    }
    return false;
};

/**
 * Verifica async se la squadra corrente è admin (legge da Firestore se necessario)
 * @returns {Promise<boolean>}
 */
window.checkCurrentTeamIsAdmin = async function() {
    const currentTeamData = window.InterfacciaCore?.currentTeamData;
    const currentTeamId = window.InterfacciaCore?.currentTeamId;

    if (!currentTeamId) return false;

    // Se abbiamo già i dati, usiamoli
    if (currentTeamData) {
        return window.isTeamAdmin(currentTeamData.teamName, currentTeamData);
    }

    // Altrimenti leggi da Firestore
    try {
        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
        const teamDocRef = doc(window.db, TEAMS_PATH, currentTeamId);
        const teamDoc = await getDoc(teamDocRef);

        if (teamDoc.exists()) {
            const data = teamDoc.data();
            return window.isTeamAdmin(data.teamName, data);
        }
    } catch (error) {
        console.error('[Admin Check] Errore verifica permessi:', error);
    }

    return false;
};

// --- ROSA INIZIALE (5 GIOCATORI: P, D, C, C, A) ---
window.INITIAL_SQUAD = [
    { id: 'p001', name: 'Portiere Base', role: 'P', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: window.TYPE_POTENZA || 'Potenza', abilities: [] },
    { id: 'd001', name: 'Difensore Base', role: 'D', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: window.TYPE_POTENZA || 'Potenza', abilities: [] },
    { id: 'c001', name: 'Centrocampista Base 1', role: 'C', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: window.TYPE_TECNICA || 'Tecnica', abilities: [] },
    { id: 'c002', name: 'Centrocampista Base 2', role: 'C', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: window.TYPE_VELOCITA || 'Velocita', abilities: [] },
    { id: 'a001', name: 'Attaccante Base', role: 'A', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: window.TYPE_POTENZA || 'Potenza', abilities: [] }
];

// --- HELPER GLOBALE PER NUMERI CASUALI ---
/**
 * Helper per generare un numero intero casuale tra min (incluso) e max (incluso).
 * Esposto globalmente per essere usato da tutti i moduli.
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
window.getRandomInt = getRandomInt;

/**
 * Calcola il livello medio da una lista di giocatori.
 */
const calculateAverageLevel = (players) => {
    if (!players || players.length === 0) return 0;
    const totalLevel = players.reduce((sum, player) => sum + (player.currentLevel || player.level || 1), 0);
    return parseFloat((totalLevel / players.length).toFixed(1));
};
window.calculateAverageLevel = calculateAverageLevel;

/**
 * Restituisce i 5 giocatori titolari attuali.
 */
const getFormationPlayers = (teamData) => {
    if (!teamData || !teamData.formation || !teamData.formation.titolari) return [];
    return teamData.formation.titolari.filter(p => p.level);
};
window.getFormationPlayers = getFormationPlayers;

/**
 * Calcola il numero di giocatori in rosa, escludendo l'Icona.
 */
const getPlayerCountExcludingIcona = (players) => {
    if (!players || players.length === 0) return 0;
    return players.filter(p => !(p.abilities && p.abilities.includes('Icona'))).length;
};
window.getPlayerCountExcludingIcona = getPlayerCountExcludingIcona;


/**
 * Helper per generare l'HTML del logo.
 */
const getLogoHtml = (teamId) => {
    const url = teamLogosMap[teamId] || window.InterfacciaConstants.DEFAULT_LOGO_URL;
    return `<img src="${url}" alt="Logo" class="w-6 h-6 rounded-full border border-gray-500 inline-block align-middle">`;
};
window.getLogoHtml = getLogoHtml;

/**
 * Carica tutti i loghi delle squadre e li mappa {id: url}
 * OTTIMIZZATO: Usa cache per evitare chiamate Firestore ripetute
 * @param {boolean} forceRefresh - Se true, ignora la cache e ricarica da Firestore
 * @returns {Object} Mappa {teamId: logoUrl}
 */
const fetchAllTeamLogos = async (forceRefresh = false) => {
    // OTTIMIZZAZIONE: Se già in cache e non forzato, ritorna cache
    if (!forceRefresh && teamLogosMap && Object.keys(teamLogosMap).length > 0) {
        console.log("[fetchAllTeamLogos] Usando cache (0 reads)");
        return teamLogosMap;
    }

    const { collection, getDocs } = window.firestoreTools;
    const appId = window.firestoreTools.appId;
    const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

    try {
        console.log("[fetchAllTeamLogos] Caricamento da Firestore...");
        const teamsCollectionRef = collection(window.db, TEAMS_COLLECTION_PATH);
        const teamsSnapshot = await getDocs(teamsCollectionRef);

        const logos = {};
        teamsSnapshot.forEach(doc => {
            const data = doc.data();
            // Sanitizza l'URL per convertire vecchi formati GitHub
            const rawLogoUrl = data.logoUrl || window.InterfacciaConstants.DEFAULT_LOGO_URL;
            logos[doc.id] = window.sanitizeGitHubUrl(rawLogoUrl);
        });

        teamLogosMap = logos;
        window.InterfacciaCore.teamLogosMap = logos;
        console.log(`[fetchAllTeamLogos] Caricati ${Object.keys(logos).length} loghi.`);

        return logos;

    } catch (error) {
        console.error("[fetchAllTeamLogos] Errore:", error);
        teamLogosMap = {};
        window.InterfacciaCore.teamLogosMap = {};
        return {};
    }
};
window.fetchAllTeamLogos = fetchAllTeamLogos;

/**
 * Invalida la cache dei loghi (chiamare quando un logo viene modificato)
 */
window.invalidateTeamLogosCache = function() {
    teamLogosMap = {};
    window.InterfacciaCore.teamLogosMap = {};
    console.log("[fetchAllTeamLogos] Cache invalidata");
};

/**
 * Genera la lista completa dei candidati Icona con i livelli iniziali calcolati.
 * @returns {Array<Object>}
 */
const generateCaptainCandidates = () => {
    const CAPTAIN_CANDIDATES_TEMPLATES = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
    const CAPTAIN_PLACEHOLDER_URL = window.CAPTAIN_PLACEHOLDER_URL || "https://placehold.co/100x100/A0522D/ffffff?text=Icona";
    
    return CAPTAIN_CANDIDATES_TEMPLATES.map(template => {
        // Usa il livello base specificato nel template (ora 12)
        const finalLevel = template.level || 12;
        
        const finalPhotoUrl = template.photoUrl && template.photoUrl.includes('http')
                              ? template.photoUrl 
                              : CAPTAIN_PLACEHOLDER_URL;

        return { 
            ...template, 
            level: finalLevel,
            age: template.age,
            id: crypto.randomUUID(), 
            photoUrl: finalPhotoUrl
        };
    });
};
window.generateCaptainCandidates = generateCaptainCandidates;

/**
 * Mappa rarità abilità → livello per calcolo costo
 * Comune=1, Rara=2, Epica=3, Leggendaria=4, Unica=5
 */
const ABILITY_RARITY_LEVELS = {
    'Comune': 1,
    'Rara': 2,
    'Epica': 3,
    'Leggendaria': 4,
    'Unica': 5
};
window.ABILITY_RARITY_LEVELS = ABILITY_RARITY_LEVELS;

/**
 * Calcola il costo di un giocatore in base al livello e alle abilità.
 * Formula: 100 + (level * 10) + (levelAbilità * 50)
 *
 * @param {number} level - Livello del giocatore (1-20)
 * @param {Array<string>} abilities - Array dei nomi delle abilità del giocatore
 * @returns {number} - Costo in CS
 */
const calculatePlayerCost = (level, abilities = []) => {
    // Costo base + bonus livello
    let cost = 100 + (level * 10);

    // Aggiungi costo abilità
    if (abilities && abilities.length > 0 && window.AbilitiesEncyclopedia) {
        abilities.forEach(abilityName => {
            // Salta l'abilità "Icona" per il calcolo costo
            if (abilityName === 'Icona') return;

            const abilityData = window.AbilitiesEncyclopedia.getAbility(abilityName);
            if (abilityData && abilityData.rarity) {
                const rarityLevel = ABILITY_RARITY_LEVELS[abilityData.rarity] || 1;
                cost += rarityLevel * 50;
            }
        });
    }

    return cost;
};
window.calculatePlayerCost = calculatePlayerCost;

// --- UTILITY ADMIN DA CONSOLE ---

/**
 * Imposta una squadra come admin (aggiunge isAdmin: true al documento Firestore)
 * Chiamare da console: await window.setTeamAsAdmin('nomesquadra')
 * @param {string} teamName - Nome della squadra (case insensitive)
 * @returns {Promise<boolean>}
 */
window.setTeamAsAdmin = async function(teamName) {
    if (!window.db || !window.firestoreTools) {
        console.error("[setTeamAsAdmin] Firestore non disponibile");
        return false;
    }

    const teamDocId = teamName.toLowerCase().replace(/\s/g, '');

    try {
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

        const teamDocRef = doc(window.db, TEAMS_PATH, teamDocId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) {
            console.error(`[setTeamAsAdmin] Squadra '${teamName}' non trovata (ID: ${teamDocId})`);
            return false;
        }

        await updateDoc(teamDocRef, { isAdmin: true });
        console.log(`[setTeamAsAdmin] Squadra '${teamName}' impostata come admin`);
        return true;
    } catch (error) {
        console.error("[setTeamAsAdmin] Errore:", error);
        return false;
    }
};

/**
 * Resetta le statistiche Hall of Fame di una squadra
 * Chiamare da console: await window.resetTeamHallOfFame('nomesquadra')
 * @param {string} teamName - Nome della squadra (case insensitive)
 * @returns {Promise<boolean>}
 */
window.resetTeamHallOfFame = async function(teamName) {
    if (!window.db || !window.firestoreTools) {
        console.error("[resetTeamHallOfFame] Firestore non disponibile");
        return false;
    }

    const teamDocId = teamName.toLowerCase().replace(/\s/g, '');

    try {
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

        const teamDocRef = doc(window.db, TEAMS_PATH, teamDocId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) {
            console.error(`[resetTeamHallOfFame] Squadra '${teamName}' non trovata (ID: ${teamDocId})`);
            return false;
        }

        await updateDoc(teamDocRef, {
            matchHistory: [],
            campionatiVinti: 0,
            coppeSerieVinte: 0,
            supercoppeSerieVinte: 0
        });
        console.log(`[resetTeamHallOfFame] Statistiche Hall of Fame resettate per '${teamName}'`);
        return true;
    } catch (error) {
        console.error("[resetTeamHallOfFame] Errore:", error);
        return false;
    }
};

/**
 * Resetta le statistiche Hall of Fame di TUTTE le squadre
 * Chiamare da console: await window.resetAllHallOfFame()
 * @returns {Promise<number>} Numero di squadre resettate
 */
window.resetAllHallOfFame = async function() {
    if (!window.db || !window.firestoreTools) {
        console.error("[resetAllHallOfFame] Firestore non disponibile");
        return 0;
    }

    try {
        const { collection, getDocs, doc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

        const teamsCollectionRef = collection(window.db, TEAMS_PATH);
        const teamsSnapshot = await getDocs(teamsCollectionRef);

        let count = 0;
        for (const teamDoc of teamsSnapshot.docs) {
            const teamDocRef = doc(window.db, TEAMS_PATH, teamDoc.id);
            await updateDoc(teamDocRef, {
                matchHistory: [],
                campionatiVinti: 0,
                coppeSerieVinte: 0,
                supercoppeSerieVinte: 0
            });
            count++;
            console.log(`[resetAllHallOfFame] Reset: ${teamDoc.data().teamName || teamDoc.id}`);
        }

        console.log(`[resetAllHallOfFame] Resettate ${count} squadre`);
        return count;
    } catch (error) {
        console.error("[resetAllHallOfFame] Errore:", error);
        return 0;
    }
};

console.log("Modulo interfaccia-core.js caricato.");