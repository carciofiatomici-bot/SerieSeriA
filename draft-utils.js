//
// ====================================================================
// DRAFT-UTILS.JS - Funzioni Helper per il Draft
// ====================================================================
//

window.DraftUtils = {

    /**
     * Helper per generare un numero intero casuale tra min (incluso) e max (incluso).
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Stub per compatibilità - il cooldown è stato rimosso
     */
    clearCooldownInterval() {
        // Non fa nulla - cooldown rimosso nel nuovo sistema a turni
    },

    /**
     * Helper per visualizzare i messaggi di stato.
     * @param {string} message - Il testo del messaggio.
     * @param {string} type - 'success', 'error', o 'info'.
     * @param {string} elementId - L'ID dell'elemento messaggio.
     */
    displayMessage(message, type, elementId = 'player-creation-message') {
        const msgElement = document.getElementById(elementId);
        if (!msgElement) return;
        msgElement.textContent = message;
        msgElement.classList.remove('text-red-400', 'text-green-500', 'text-yellow-400', 'text-gray-400');

        if (type === 'error') {
            msgElement.classList.add('text-red-400');
        } else if (type === 'success') {
            msgElement.classList.add('text-green-500');
        } else if (type === 'info') {
            msgElement.classList.add('text-yellow-400');
        } else {
            msgElement.classList.add('text-gray-400');
        }
    }
};

console.log("Modulo Draft-Utils caricato.");
