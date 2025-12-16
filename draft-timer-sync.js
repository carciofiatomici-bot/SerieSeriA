//
// ====================================================================
// DRAFT-TIMER-SYNC.JS - Timer Sincronizzato Draft
// ====================================================================
// Modulo condiviso per mantenere sincronizzato il timer del draft
// tra il pannello draft e l'alert nella dashboard
//

window.DraftTimerSync = {

    // Stato del timer
    _state: {
        turnStartTime: null,
        timeout: null,
        isStolenTurn: false,
        turnExpired: false,
        isPaused: false,
        currentTeamId: null,
        currentTeamName: null
    },

    // Callback registrate per aggiornamenti
    _listeners: [],

    // Interval per il countdown
    _countdownInterval: null,

    // Ultimo tempo rimanente calcolato
    _lastTimeRemaining: null,

    /**
     * Aggiorna lo stato del timer da Firestore
     * @param {Object} draftTurns - Dati draftTurns da Firestore
     */
    updateFromFirestore(draftTurns) {
        if (!draftTurns || !draftTurns.isActive) {
            this.stop();
            return;
        }

        // Converti turnStartTime se e' un Timestamp Firestore
        let turnStartTime = draftTurns.turnStartTime;
        if (turnStartTime && typeof turnStartTime.toMillis === 'function') {
            turnStartTime = turnStartTime.toMillis();
        }

        // Determina il timeout corretto
        const { DRAFT_TURN_TIMEOUT_MS, DRAFT_STEAL_TIMEOUT_MS } = window.DraftConstants || {
            DRAFT_TURN_TIMEOUT_MS: 3600000,
            DRAFT_STEAL_TIMEOUT_MS: 600000
        };

        // Valida isStolenTurn
        let isStolenTurn = draftTurns.isStolenTurn || false;
        if (isStolenTurn && !draftTurns.stolenBy && !draftTurns.stolenFrom) {
            isStolenTurn = false; // Valore stale
        }

        const timeout = isStolenTurn ? DRAFT_STEAL_TIMEOUT_MS : DRAFT_TURN_TIMEOUT_MS;

        // Ottieni info team corrente
        const currentRound = draftTurns.currentRound || 1;
        const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
        const currentOrder = draftTurns[orderKey] || [];
        const currentTeam = currentOrder.find(t => t.teamId === draftTurns.currentTeamId);

        // Aggiorna stato
        this._state = {
            turnStartTime,
            timeout,
            isStolenTurn,
            turnExpired: draftTurns.turnExpired || false,
            isPaused: draftTurns.isPaused || false,
            currentTeamId: draftTurns.currentTeamId,
            currentTeamName: currentTeam?.teamName || 'N/A',
            currentRound
        };

        // Avvia/riavvia il countdown
        this._startCountdown();

        // Notifica i listener
        this._notifyListeners();
    },

    /**
     * Avvia il countdown interno
     */
    _startCountdown() {
        // Ferma countdown precedente
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
        }

        const tick = () => {
            const timeRemaining = this.getTimeRemaining();

            // Notifica solo se il tempo e' cambiato (evita spam)
            if (timeRemaining !== this._lastTimeRemaining) {
                this._lastTimeRemaining = timeRemaining;
                this._notifyListeners();
            }
        };

        // Tick immediato e poi ogni secondo
        tick();
        this._countdownInterval = setInterval(tick, 1000);
    },

    /**
     * Ferma il timer
     */
    stop() {
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
        this._state = {
            turnStartTime: null,
            timeout: null,
            isStolenTurn: false,
            turnExpired: false,
            isPaused: false,
            currentTeamId: null,
            currentTeamName: null
        };
        this._lastTimeRemaining = null;
        this._notifyListeners();
    },

    /**
     * Calcola il tempo rimanente in millisecondi
     * @returns {number} - Tempo rimanente in ms (0 se scaduto)
     */
    getTimeRemaining() {
        const { turnStartTime, timeout, isPaused } = this._state;

        if (!turnStartTime || !timeout || isPaused) {
            return null;
        }

        // Usa getEffectiveTimeRemaining per considerare la pausa notturna
        if (window.DraftConstants?.getEffectiveTimeRemaining) {
            return window.DraftConstants.getEffectiveTimeRemaining(turnStartTime, timeout);
        }

        // Fallback senza pausa notturna
        return Math.max(0, timeout - (Date.now() - turnStartTime));
    },

    /**
     * Ottiene il tempo formattato come stringa MM:SS
     * @returns {string} - Tempo formattato o '--:--' se non disponibile
     */
    getFormattedTime() {
        const timeRemaining = this.getTimeRemaining();

        if (timeRemaining === null) {
            return '--:--';
        }

        if (timeRemaining <= 0) {
            return '00:00';
        }

        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    /**
     * Verifica se siamo in pausa notturna
     * @returns {boolean}
     */
    isNightPause() {
        return window.DraftConstants?.isNightPauseActive?.() || false;
    },

    /**
     * Verifica se il timer e' in stato di warning (< 5 min o < 2 min per stolen)
     * @returns {boolean}
     */
    isWarning() {
        const timeRemaining = this.getTimeRemaining();
        if (timeRemaining === null || timeRemaining <= 0) return false;

        const { DRAFT_TURN_TIMEOUT_MS } = window.DraftConstants || { DRAFT_TURN_TIMEOUT_MS: 3600000 };
        const warningThreshold = this._state.isStolenTurn ? 2 * 60 * 1000 : 5 * 60 * 1000;

        return timeRemaining < warningThreshold;
    },

    /**
     * Verifica se il timer e' scaduto
     * @returns {boolean}
     */
    isExpired() {
        const timeRemaining = this.getTimeRemaining();
        return timeRemaining !== null && timeRemaining <= 0 && !this.isNightPause();
    },

    /**
     * Ottiene lo stato completo del timer
     * @returns {Object}
     */
    getState() {
        return {
            ...this._state,
            timeRemaining: this.getTimeRemaining(),
            formattedTime: this.getFormattedTime(),
            isNightPause: this.isNightPause(),
            isWarning: this.isWarning(),
            isExpired: this.isExpired()
        };
    },

    /**
     * Registra un listener per gli aggiornamenti del timer
     * @param {Function} callback - Funzione chiamata ad ogni aggiornamento
     * @returns {Function} - Funzione per rimuovere il listener
     */
    subscribe(callback) {
        this._listeners.push(callback);

        // Chiama subito con lo stato attuale
        callback(this.getState());

        // Ritorna funzione per unsubscribe
        return () => {
            const index = this._listeners.indexOf(callback);
            if (index > -1) {
                this._listeners.splice(index, 1);
            }
        };
    },

    /**
     * Notifica tutti i listener
     */
    _notifyListeners() {
        const state = this.getState();
        this._listeners.forEach(callback => {
            try {
                callback(state);
            } catch (e) {
                console.error('[DraftTimerSync] Errore in listener:', e);
            }
        });
    }
};

console.log("Modulo DraftTimerSync caricato.");
