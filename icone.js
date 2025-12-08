//
// ====================================================================
// CONTENUTO DEL MODULO ICONE.JS (Definizioni Globali di Tipi e Icone)
// ====================================================================
//

// URL Placeholder per le Icone mancanti
const CAPTAIN_PLACEHOLDER_URL = "https://placehold.co/100x100/A0522D/ffffff?text=Icona";

// --- COSTANTI TIPOLOGIA ---
// Mappatura delle richieste utente:
// "Potente" -> TYPE_POTENZA ('Potenza')
// "Tecnico" -> TYPE_TECNICA ('Tecnica')
// "Velocità" -> TYPE_VELOCITA ('Velocita')
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
    // 1. Croccante: D, Tecnico
    { 
        id: 'croc', 
        role: 'D', 
        name: 'Croccante', 
        levelRange: [12, 18], 
        age: 28, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Croccante.jpg?raw=true', 
        type: TYPE_TECNICA, 
        abilities: ['Icona'] 
    }, 
    
    // 2. Shikanto: C, Tecnico
    { 
        id: 'shik', 
        role: 'C', 
        name: 'Shikanto', 
        levelRange: [12, 18], 
        age: 26, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/shikanto.jpg?raw=true', 
        type: TYPE_TECNICA, 
        abilities: ['Icona'] 
    },
    
    // 3. Il Cap: C, Tecnico
    { 
        id: 'ilcap', 
        role: 'C', 
        name: 'Il Cap', 
        levelRange: [12, 18], 
        age: 30, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/cap.jpg?raw=true', 
        type: TYPE_TECNICA, 
        abilities: ['Icona'] 
    },
    
    // 4. Simone: P, Velocità
    { 
        id: 'simo', 
        role: 'P', 
        name: 'Simone', 
        levelRange: [12, 18], 
        age: 25, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/simone.jpg?raw=true', 
        type: TYPE_VELOCITA, 
        abilities: ['Icona'] 
    },
    
    // 5. Dappino: C, Tecnico
    { 
        id: 'dappi', 
        role: 'C', 
        name: 'Dappino', 
        levelRange: [12, 18], 
        age: 24, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/dappino.png?raw=true', 
        type: TYPE_TECNICA, 
        abilities: ['Icona'] 
    }, 
    
    // 6. Blatta: D, Velocità
    { 
        id: 'blatta', 
        role: 'D', 
        name: 'Blatta', 
        levelRange: [12, 18], 
        age: 27, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/blatta.jpg?raw=true', 
        type: TYPE_VELOCITA, 
        abilities: ['Icona'] 
    },
    
    // 7. Antony: D, Potente
    { 
        id: 'antony', 
        role: 'D', 
        name: 'Antony', 
        levelRange: [12, 18], 
        age: 29, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/antony.jpg?raw=true', 
        type: TYPE_POTENZA, 
        abilities: ['Icona'] 
    },
    
    // 8. Gladio: D, Potente
    { 
        id: 'gladio', 
        role: 'D', 
        name: 'Gladio', 
        levelRange: [12, 18], 
        age: 23, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/gladio.jpg?raw=true', 
        type: TYPE_POTENZA, 
        abilities: ['Icona'] 
    },
    
    // 9. Amedemo: A, Potente
    { 
        id: 'amedemo', 
        role: 'A', 
        name: 'Amedemo', 
        levelRange: [12, 18], 
        age: 25, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/amedemo.jpg?raw=true', 
        type: TYPE_POTENZA, 
        abilities: ['Icona'] 
    },
    
    // 10. Flavio El Ficario: D, Tecnico
    { 
        id: 'flavio', 
        role: 'D', 
        name: 'Flavio El Ficario', 
        levelRange: [12, 18], 
        age: 31, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/elficario.jpg?raw=true', 
        type: TYPE_TECNICA, 
        abilities: ['Icona'] 
    },
    
    // 11. Luka Alpakashenka: D, Potente
    { 
        id: 'luka', 
        role: 'D', 
        name: 'Luka Alpakashenka', 
        levelRange: [12, 18], 
        age: 28, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/luca.jpg?raw=true', 
        type: TYPE_POTENZA, 
        abilities: ['Icona'] 
    },

    // 12. Meliodas: C, Tecnico
    { 
        id: 'melio', 
        role: 'C', 
        name: 'Meliodas', 
        levelRange: [12, 18], 
        age: 25, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/meliodas.jpg?raw=true', 
        type: TYPE_TECNICA, 
        abilities: ['Icona'] 
    },
    
    // 13. Mark Falco: P, Potente
    { 
        id: 'markf', 
        role: 'P', 
        name: 'Mark Falco', 
        levelRange: [12, 18], 
        age: 27, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Mark%20Falco.jpg?raw=true', 
        type: TYPE_POTENZA, 
        abilities: ['Icona'] 
    },
    
    // 14. Sandro: C, Tecnico
    { 
        id: 'sandro', 
        role: 'C', 
        name: 'Sandro Diaz', 
        levelRange: [12, 18], 
        age: 29, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/sandro.jpg?raw=true', 
        type: TYPE_TECNICA, 
        abilities: ['Icona'] 
    },

    // 15. Fosco: P, Tecnico (NUOVO)
    { 
        id: 'fosco', 
        role: 'P', 
        name: 'Fosco', 
        levelRange: [12, 18], 
        age: 26, 
        cost: 0, 
        isCaptain: true, 
        level: 12, 
        photoUrl: 'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Fosco.jpg?raw=true', 
        type: TYPE_TECNICA, 
        abilities: ['Icona'] 
    },
];

window.CAPTAIN_CANDIDATES_TEMPLATES = CAPTAIN_CANDIDATES_TEMPLATES;