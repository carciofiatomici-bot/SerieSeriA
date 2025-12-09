//
// ====================================================================
// DRAFT-UTILS.JS - Funzioni Helper per il Draft
// ====================================================================
//

window.DraftUtils = {

    // Riferimento per il timer di cooldown
    cooldownInterval: null,

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
    },

    /**
     * Pulisce il timer di cooldown se esiste
     */
    clearCooldownInterval() {
        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
        }
    },

    /**
     * Avvia il cronometro per visualizzare il tempo rimanente al cooldown di acquisizione.
     * @param {number} lastAcquisitionTimestamp - Timestamp dell'ultima acquisizione.
     * @param {Function} onComplete - Callback da eseguire quando il cooldown termina.
     */
    startAcquisitionCountdown(lastAcquisitionTimestamp, onComplete) {
        const timerElement = document.getElementById('draft-cooldown-timer');
        if (!timerElement) return;

        const { ACQUISITION_COOLDOWN_MS } = window.DraftConstants;

        // Pulisce eventuali timer precedenti
        this.clearCooldownInterval();

        const updateTimer = () => {
            const currentTime = new Date().getTime();
            const nextAcquisitionTime = lastAcquisitionTimestamp + ACQUISITION_COOLDOWN_MS;
            const remainingTime = nextAcquisitionTime - currentTime;

            if (remainingTime <= 0) {
                this.clearCooldownInterval();
                timerElement.classList.remove('text-yellow-300');
                timerElement.classList.add('text-green-400');
                timerElement.innerHTML = `COOLDOWN TERMINATO! Ricarica il Draft per acquistare.`;

                // Esegui callback se fornita
                if (onComplete && typeof onComplete === 'function') {
                    setTimeout(onComplete, 1500);
                }
                return;
            }

            const totalSeconds = Math.floor(remainingTime / 1000);
            const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');

            timerElement.innerHTML = `Tempo rimanente: <span class="font-extrabold text-white">${minutes}:${seconds}</span>`;
        };

        updateTimer();
        this.cooldownInterval = setInterval(updateTimer, 1000);
    },

    /**
     * Calcola se il cooldown è attivo
     * @param {number} lastAcquisitionTimestamp - Timestamp dell'ultima acquisizione
     * @returns {Object} - Oggetto con stato cooldown e tempo rimanente
     */
    checkCooldownStatus(lastAcquisitionTimestamp) {
        const { ACQUISITION_COOLDOWN_MS } = window.DraftConstants;
        const currentTime = new Date().getTime();
        const timeElapsed = currentTime - lastAcquisitionTimestamp;
        const cooldownRemaining = ACQUISITION_COOLDOWN_MS - timeElapsed;
        const isCooldownActive = cooldownRemaining > 0 && lastAcquisitionTimestamp !== 0;

        return {
            isCooldownActive,
            cooldownRemaining,
            timeElapsed
        };
    }
};

console.log("Modulo Draft-Utils caricato.");
