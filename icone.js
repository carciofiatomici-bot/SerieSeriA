//
// ====================================================================
// CONTENUTO DEL MODULO ICONE.JS (Definizioni Globali di Tipi e Icone)
// ====================================================================
//

// URL Placeholder per le Icone mancanti
const CAPTAIN_PLACEHOLDER_URL = "https://placehold.co/100x100/A0522D/ffffff?text=Icona";

// --- COSTANTI TIPOLOGIA ---
const TYPE_POTENZA = 'Potenza';
const TYPE_TECNICA = 'Tecnica';
const TYPE_VELOCITA = 'Velocita';

// Esportazione delle costanti globali
window.TYPE_POTENZA = TYPE_POTENZA;
window.TYPE_TECNICA = TYPE_TECNICA;
window.TYPE_VELOCITA = TYPE_VELOCITA;
window.CAPTAIN_PLACEHOLDER_URL = CAPTAIN_PLACEHOLDER_URL;

// Nota: Il livello base (p.level) per tutte le icone è fissato a 12.
// Il COSTO è stato AZZERATO (0).

/**
 * Lista completa dei candidati ICONA.
 * Nota: 'isCaptain: true' indica che sono i giocatori speciali iniziali.
 */
const CAPTAIN_CANDIDATES_TEMPLATES = [
    // Croccante: Tipo TECNICO. Livello BASE 12. COSTO 0.
    { id: 'croc', role: 'D', name: 'Croccante', levelRange: [12, 18], age: 28, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/croccante.png?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] }, 
    
    // Altri giocatori - Livello BASE 12. COSTO 0.
    { id: 'shik', role: 'C', name: 'Shikanto', levelRange: [12, 18], age: 26, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/real%20disagio.png?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] },
    { id: 'ilcap', role: 'C', name: 'Il Cap', levelRange: [12, 18], age: 30, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/cap.png?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] },
    { id: 'simo', role: 'P', name: 'Simone', levelRange: [12, 18], age: 25, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/simone.png?raw=true', type: TYPE_VELOCITA, abilities: ['Icona'] },
    
    // Placeholder - Livello BASE 12. COSTO 0.
    { id: 'dappi', role: 'C', name: 'Dappino', levelRange: [12, 18], age: 24, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/dappino.png?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] }, 
    { id: 'blatta', role: 'D', name: 'Blatta', levelRange: [12, 18], age: 27, cost: 0, isCaptain: true, level: 12, photoUrl: CAPTAIN_PLACEHOLDER_URL, type: TYPE_VELOCITA, abilities: ['Icona'] },
    { id: 'antony', role: 'D', name: 'Antony', levelRange: [12, 18], age: 29, cost: 0, isCaptain: true, level: 12, photoUrl: CAPTAIN_PLACEHOLDER_URL, type: TYPE_POTENZA, abilities: ['Icona'] },
    { id: 'gladio', role: 'D', name: 'Gladio', levelRange: [12, 18], age: 23, cost: 0, isCaptain: true, level: 12, photoUrl: CAPTAIN_PLACEHOLDER_URL, type: TYPE_POTENZA, abilities: ['Icona'] },
    { id: 'amedemo', role: 'A', name: 'Amedemo', levelRange: [12, 18], age: 25, cost: 0, isCaptain: true, level: 12, photoUrl: CAPTAIN_PLACEHOLDER_URL, type: TYPE_POTENZA, abilities: ['Icona'] },
    { id: 'flavio', role: 'D', name: 'Flavio El Ficario', levelRange: [12, 18], age: 31, cost: 0, isCaptain: true, level: 12, photoUrl: CAPTAIN_PLACEHOLDER_URL, type: TYPE_TECNICA, abilities: ['Icona'] },
    { id: 'luka', role: 'D', name: 'Luka Alpakashenka', levelRange: [12, 18], age: 28, cost: 0, isCaptain: true, level: 12, photoUrl: CAPTAIN_PLACEHOLDER_URL, type: TYPE_POTENZA, abilities: ['Icona'] },
];

window.CAPTAIN_CANDIDATES_TEMPLATES = CAPTAIN_CANDIDATES_TEMPLATES;