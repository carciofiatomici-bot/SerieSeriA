//
// ====================================================================
// CONTENUTO DEL MODULO ICONE.JS (Definizioni Globali di Tipi e Icone)
// ====================================================================
//

// URL Placeholder per le Icone mancanti
const CAPTAIN_PLACEHOLDER_URL = "https://placehold.co/100x100/A0522D/ffffff?text=Icona";

// --- COSTANTI TIPOLOGIA ---
const TYPE_POTENZA = 'Potenza'; // Lasciata come 'Potenza' (non 'Potente')
const TYPE_TECNICA = 'Tecnica'; // Lasciata come 'Tecnica' (non 'Tecnico')
const TYPE_VELOCITA = 'Velocita'; // Lasciata come 'Velocita' (non 'Velocità')

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
    // I GIOCATORI ESISTENTI (Con URL aggiornati se necessario)
    // Usando le costanti di tipologia originali: TYPE_TECNICA ('Tecnica'), TYPE_VELOCITA ('Velocita'), TYPE_POTENZA ('Potenza')
    // -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Croccante: Tipo TECNICO/Tecnica. Ruolo D.
    { id: 'croc', role: 'D', name: 'Croccante', levelRange: [12, 18], age: 28, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Mega%20Croccante.jpg?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] }, 
    
    // Shikanto: Tipo TECNICO/Tecnica. Ruolo C.
    { id: 'shik', role: 'C', name: 'Shikanto', levelRange: [12, 18], age: 26, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/real%20disagio.png?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] },
    
    // Il Cap: Tipo TECNICO/Tecnica. Ruolo C.
    { id: 'ilcap', role: 'C', name: 'Il Cap', levelRange: [12, 18], age: 30, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/cap.jpg?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] },
    
    // Simone: Tipo VELOCITÀ/Velocita. Ruolo P.
    { id: 'simo', role: 'P', name: 'Simone', levelRange: [12, 18], age: 25, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/simone.png?raw=true', type: TYPE_VELOCITA, abilities: ['Icona'] },
    
    // Dappino: Tipo TECNICO/Tecnica. Ruolo C.
    { id: 'dappi', role: 'C', name: 'Dappino', levelRange: [12, 18], age: 24, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/dappino.png?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] }, 
    
    // Blatta: Tipo VELOCITÀ/Velocita. Ruolo D.
    { id: 'bemolle', role: 'D', name: 'Bemolle', levelRange: [12, 18], age: 27, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/blatta.jpg?raw=true', type: TYPE_VELOCITA, abilities: ['Icona'] },
    
    // Antony: Tipo POTENTE/Potenza. Ruolo D.
    { id: 'antony', role: 'D', name: 'Antony', levelRange: [12, 18], age: 29, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/unnamed%20(4).jpg?raw=true', type: TYPE_POTENZA, abilities: ['Icona'] },
    
    // Gladio: Tipo POTENTE/Potenza. Ruolo D.
    { id: 'gladio', role: 'D', name: 'Gladio', levelRange: [12, 18], age: 23, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/gladio.jpg?raw=true', type: TYPE_POTENZA, abilities: ['Icona'] },
    
    // Amedemo: Tipo POTENTE/Potenza. Ruolo A.
    { id: 'amedemo', role: 'A', name: 'Amedemo', levelRange: [12, 18], age: 25, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/amedemo.jpg?raw=true', type: TYPE_POTENZA, abilities: ['Icona'] },
    
    // Flavio El Ficario: Tipo TECNICO/Tecnica. Ruolo D.
    { id: 'flavio', role: 'D', name: 'Flavio El Ficario', levelRange: [12, 18], age: 31, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/elficario.jpg?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] },
    
    // Luka Alpakashenka: Tipo POTENTE/Potenza. Ruolo D.
    { id: 'luka', role: 'D', name: 'Luka Alpakashenka', levelRange: [12, 18], age: 28, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/luca.jpg?raw=true', type: TYPE_POTENZA, abilities: ['Icona'] },

    // I NUOVI GIOCATORI AGGIUNTI
    // -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Meliodas: Tipo TECNICO/Tecnica. Ruolo C.
    { id: 'melio', role: 'C', name: 'Meliodas', levelRange: [12, 18], age: 25, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/meliodas.jpg?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] },
    
    // Mark Falco: Tipo POTENTE/Potenza. Ruolo P.
    { id: 'markf', role: 'P', name: 'Mark Falco', levelRange: [12, 18], age: 27, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Mark%20Falco.jpg?raw=true', type: TYPE_POTENZA, abilities: ['Icona'] },
    
    // Sandro: Tipo TECNICO/Tecnica. Ruolo C. (Assumo 'C' per Centrocampista)
    { id: 'sandro', role: 'C', name: 'Sandro', levelRange: [12, 18], age: 29, cost: 0, isCaptain: true, level: 12, photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/sandro.jpg?raw=true', type: TYPE_TECNICA, abilities: ['Icona'] },
];


window.CAPTAIN_CANDIDATES_TEMPLATES = CAPTAIN_CANDIDATES_TEMPLATES;

