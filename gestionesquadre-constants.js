//
// ====================================================================
// GESTIONESQUADRE-CONSTANTS.JS - Costanti e Configurazioni
// ====================================================================
//

window.GestioneSquadreConstants = {

    // Struttura dei moduli e delle posizioni (P, D, C, A) - Ordinati per posizione crescente (D->C->A)
    MODULI: {
        // Difesa massima (4D)
        '1-4-0-0': { P: 1, D: 4, C: 0, A: 0, description: "Bunker mode! 4 Difensori, nessun attacco. Ultra-catenaccio. (4 titolari + Portiere)" },
        // Difesa alta (3D)
        '1-3-1': { P: 1, D: 3, C: 0, A: 1, description: "Modulo difensivo con 3 difensori, 1 Attaccante. (4 titolari + Portiere)" },
        // Difesa media (2D)
        '1-2-2-0': { P: 1, D: 2, C: 2, A: 0, description: "Modulo senza punte, 2 Difensori, 2 Centrocampisti. Controllo totale. (4 titolari + Portiere)" },
        '1-2-1-1': { P: 1, D: 2, C: 1, A: 1, description: "Modulo difensivo-equilibrato, 2 Difensori, 1 Centrocampista, 1 Attaccante. (4 titolari + Portiere)" },
        '1-2-2': { P: 1, D: 2, C: 0, A: 2, description: "Tattica ultradifensiva, 2 Difensori, 2 Attaccanti. (4 titolari + Portiere)" },
        // Difesa bassa (1D)
        '1-1-2-1': { P: 1, D: 1, C: 2, A: 1, description: "Modulo equilibrato, 1 Difensore, 2 Centrocampisti, 1 Attaccante. (4 titolari + Portiere)" },
        '1-1-1-2': { P: 1, D: 1, C: 1, A: 2, description: "Modulo offensivo, 1 Difensore, 1 Centrocampista, 2 Attaccanti. (4 titolari + Portiere)" },
        '1-1-3': { P: 1, D: 1, C: 0, A: 3, description: "Modulo ultra-offensivo, 1 Difensore, 3 Attaccanti. (4 titolari + Portiere)" },
        // Senza difesa (0D)
        '1-0-4-0': { P: 1, D: 0, C: 4, A: 0, description: "Centrocampo totale! 4 Centrocampisti, controllo assoluto ma senza finalizzatori. (4 titolari + Portiere)" },
        '1-0-3-1': { P: 1, D: 0, C: 3, A: 1, description: "Modulo senza difesa, 3 Centrocampisti, 1 Attaccante. Dominio centrocampo. (4 titolari + Portiere)" },
        '1-0-2-2': { P: 1, D: 0, C: 2, A: 2, description: "Modulo senza difesa, 2 Centrocampisti, 2 Attaccanti. Rischio totale! (4 titolari + Portiere)" },
        '1-0-0-4': { P: 1, D: 0, C: 0, A: 4, description: "All-in offensivo! 4 Attaccanti, nessuna difesa. O segni o prendi gol! (4 titolari + Portiere)" },
    },

    // Ruoli totali
    ROLES: ['P', 'D', 'C', 'A'],

    // Mappa per l'ordinamento dei ruoli
    ROLE_ORDER: { 'P': 0, 'D': 1, 'C': 2, 'A': 3 },

    // Mappa delle icone di tipologia
    TYPE_ICONS: {
        'Potenza': { icon: 'fas fa-hand-rock', color: 'text-red-500' },
        'Tecnica': { icon: 'fas fa-brain', color: 'text-blue-500' },
        'Velocita': { icon: 'fas fa-bolt', color: 'text-yellow-500' },
        'N/A': { icon: 'fas fa-question-circle', color: 'text-gray-400' }
    },

    // URL dell'immagine legenda tipologie
    TYPE_LEGEND_URL: "https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Logica%20Tipologie.png",

    // Costo sostituzione Icona (in CSS - Crediti Super Seri)
    ICONA_REPLACEMENT_COST: 1
};

console.log("Modulo GestioneSquadre-Constants caricato.");
