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

// Nota: Il livello base (p.level) per tutte le icone e fissato a 5.
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
        age: 28,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/Croccante.jpg',
        type: TYPE_TECNICA,
        abilities: ['Icona', 'Fatto d\'acciaio']
    }, 
    
    // 2. Shikanto: C, Tecnico
    {
        id: 'shik',
        role: 'C',
        name: 'Shikanto',
        age: 26,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/shikanto.jpg',
        type: TYPE_TECNICA,
        abilities: ['Icona', 'Amici di panchina']
    },
    
    // 3. Il Cap: C, Tecnico
    {
        id: 'ilcap',
        role: 'C',
        name: 'Il Cap',
        age: 30,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/cap.jpg',
        type: TYPE_TECNICA,
        abilities: ['Icona', 'Calcolo delle probabilita']
    },
    
    // 4. Simone: P, Velocita
    {
        id: 'simo',
        role: 'P',
        name: 'Simone',
        age: 25,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/simone.jpg',
        type: TYPE_VELOCITA,
        abilities: ['Icona', 'Parata Efficiente']
    },
    
    // 5. Dappino: C, Tecnico
    {
        id: 'dappi',
        role: 'C',
        name: 'A. H. Uunanana',
        age: 24,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/dappino.png',
        type: TYPE_TECNICA,
        abilities: ['Icona']
    }, 
    
    // 6. Antony: D, Potente
    {
        id: 'antony',
        role: 'D',
        name: 'Antony',
        age: 29,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/antony.jpg',
        type: TYPE_POTENZA,
        abilities: ['Icona', 'Avanti un altro']
    },
    
    // 8. Gladio: D, Potente
    {
        id: 'gladio',
        role: 'D',
        name: 'Gladio',
        age: 23,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/gladio.jpg',
        type: TYPE_POTENZA,
        abilities: ['Icona', 'Continua a provare']
    },
    
    // 9. Amedemo: A, Potente
    {
        id: 'amedemo',
        role: 'A',
        name: 'Amedemo',
        age: 25,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/amedemo.jpg',
        type: TYPE_POTENZA,
        abilities: ['Icona', 'Tiro Dritto']
    },
    
    // 10. Flavio El Ficario: D, Tecnico
    {
        id: 'flavio',
        role: 'D',
        name: 'Flavio El Ficario',
        age: 31,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/elficario.jpg',
        type: TYPE_TECNICA,
        abilities: ['Icona']
    },
    
    // 11. Luka Alpakashenka: D, Potente
    {
        id: 'luka',
        role: 'D',
        name: 'Luka Alpakashenka',
        age: 28,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/luca.jpg',
        type: TYPE_POTENZA,
        abilities: ['Icona', 'Contrasto di gomito']
    },

    // 12. Meliodas: C, Tecnico
    {
        id: 'melio',
        role: 'C',
        name: 'Meliodas',
        age: 25,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/Mel.jpg',
        type: TYPE_TECNICA,
        abilities: ['Icona', 'Assist-man']
    },
    
    // 13. Mark Falco: P, Potente
    {
        id: 'markf',
        role: 'P',
        name: 'Mark Falco',
        age: 27,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/Mark%20Falco.jpg',
        type: TYPE_POTENZA,
        abilities: ['Icona', 'Osservatore']
    },
    
    // 14. Sandro Diaz: C, Tecnico
    {
        id: 'sandro',
        role: 'C',
        name: 'Sandro Diaz',
        age: 29,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/sandro.jpg',
        type: TYPE_TECNICA,
        abilities: ['Icona', 'Relax']
    },

    // 15. Fosco: P, Tecnico
    {
        id: 'fosco',
        role: 'P',
        name: 'Fosco',
        age: 26,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/Fosco.jpg',
        type: TYPE_TECNICA,
        abilities: ['Icona', 'L\'uomo in piu']
    },

    // 16. Cocco: C, Potente
    {
        id: 'cocco',
        role: 'C',
        name: 'Cocco',
        age: 24,
        cost: 0,
        isCaptain: true,
        level: 5,
        photoUrl: 'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Icone/cocco.jpg',
        type: TYPE_POTENZA,
        abilities: ['Icona', 'Stazionario']
    },
];

window.CAPTAIN_CANDIDATES_TEMPLATES = CAPTAIN_CANDIDATES_TEMPLATES;
// Alias piu semplice per uso globale
window.ICONE = CAPTAIN_CANDIDATES_TEMPLATES;