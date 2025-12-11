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
    // Credenziali Admin Hardcoded
    ADMIN_USERNAME: "serieseria",
    ADMIN_PASSWORD: "admin",
    ADMIN_USERNAME_LOWER: "serieseria",

    // Password Gate
    MASTER_PASSWORD: "seria",

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
 */
const fetchAllTeamLogos = async () => {
    const { collection, getDocs } = window.firestoreTools;
    const appId = window.firestoreTools.appId;
    const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
    
    try {
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
        console.log("Mappa loghi caricata con successo.");

    } catch (error) {
        console.error("Errore nel caricamento dei loghi:", error);
        teamLogosMap = {};
        window.InterfacciaCore.teamLogosMap = {};
    }
};
window.fetchAllTeamLogos = fetchAllTeamLogos;

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

console.log("✅ Modulo interfaccia-core.js caricato.");