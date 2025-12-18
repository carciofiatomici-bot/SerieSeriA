/**
 * Costanti di gioco centralizzate per Serie SeriA
 *
 * Contiene tutte le costanti condivise tra simulazione.js, challenge-match.js
 * e altri moduli per evitare duplicazione.
 */

(function() {
    'use strict';

    /**
     * Mappa modificatori per livello (Regola 2 - AGGIORNATA v4.0)
     * Progressione: +0.5 ogni 2 livelli, bonus finale al livello 29-30
     */
    const LEVEL_MODIFIERS = {
        1: 0.5, 2: 0.5,
        3: 1.0, 4: 1.0,
        5: 1.5, 6: 1.5,
        7: 2.0, 8: 2.0,
        9: 2.5, 10: 2.5,
        11: 3.0, 12: 3.0,
        13: 3.5, 14: 3.5,
        15: 4.0, 16: 4.0,
        17: 4.5, 18: 4.5,
        19: 5.0, 20: 5.0,
        21: 5.5, 22: 5.5,
        23: 6.0, 24: 6.0,
        25: 6.5, 26: 6.5,
        27: 7.0, 28: 7.0,
        29: 8.0, 30: 9.0
    };

    /**
     * Vantaggi tipologia (Regola 5 - AGGIORNATA v4.0)
     * Sistema Sasso-Carta-Forbice con bonus/malus fisso
     * Potenza > Tecnica > Velocita > Potenza
     */
    const TYPE_ADVANTAGE = {
        'Potenza': 'Tecnica',    // Potenza batte Tecnica
        'Tecnica': 'Velocita',   // Tecnica batte Velocita
        'Velocita': 'Potenza'    // Velocita batte Potenza
    };

    // Bonus/Malus tipologia (valori assoluti, non percentuali)
    const TYPE_ADVANTAGE_BONUS = 3.0;   // Chi vince il confronto tipologia
    const TYPE_ADVANTAGE_MALUS = -3.0;  // Chi perde il confronto tipologia

    /**
     * Calcola bonus/malus tipologia per un giocatore
     * @param {string} playerType - Tipologia del giocatore (Potenza/Tecnica/Velocita)
     * @param {string} opponentType - Tipologia dell'avversario
     * @returns {number} Bonus (+3.0), Malus (-3.0) o 0 se stesso tipo
     */
    const getTypeModifier = (playerType, opponentType) => {
        if (!playerType || !opponentType || playerType === opponentType) return 0;

        // Il giocatore batte l'avversario?
        if (TYPE_ADVANTAGE[playerType] === opponentType) {
            return TYPE_ADVANTAGE_BONUS; // +3.0
        }
        // L'avversario batte il giocatore?
        if (TYPE_ADVANTAGE[opponentType] === playerType) {
            return TYPE_ADVANTAGE_MALUS; // -3.0
        }
        return 0;
    };

    /**
     * Ottiene il modificatore per un livello
     * @param {number} level - Livello del giocatore (1-30)
     * @returns {number} Modificatore
     */
    const getLevelModifier = (level) => {
        const clampedLevel = Math.max(1, Math.min(30, level || 1));
        return LEVEL_MODIFIERS[clampedLevel] || 1.0;
    };

    /**
     * Utility: Roll dice
     */
    const rollDice = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    /**
     * Utility: Roll percentage (1-100)
     */
    const rollPercentage = () => rollDice(1, 100);

    // Esporta globalmente
    window.GameConstants = {
        LEVEL_MODIFIERS,
        TYPE_ADVANTAGE,
        TYPE_ADVANTAGE_BONUS,
        TYPE_ADVANTAGE_MALUS,
        getTypeModifier,
        getLevelModifier,
        rollDice,
        rollPercentage
    };
})();
