//
// ====================================================================
// GESTIONESQUADRE-UTILS.JS - Funzioni Utility
// ====================================================================
//

window.GestioneSquadreUtils = {

    /**
     * Helper per mostrare messaggi di stato.
     * @param {string} containerId - ID del contenitore del messaggio
     * @param {string} message - Messaggio da mostrare
     * @param {string} type - Tipo: 'error', 'success', 'info'
     */
    displayMessage(containerId, message, type) {
        const msgElement = document.getElementById(containerId);
        if (!msgElement) return;
        msgElement.textContent = message;
        msgElement.classList.remove('text-red-400', 'text-green-500', 'text-yellow-400');

        if (type === 'error') {
            msgElement.classList.add('text-red-400');
        } else if (type === 'success') {
            msgElement.classList.add('text-green-500');
        } else if (type === 'info') {
            msgElement.classList.add('text-yellow-400');
        }
    },

    /**
     * Rimuove il giocatore dalla sua posizione corrente (titolari o panchina).
     * @param {string} playerId - ID del giocatore da rimuovere.
     * @param {Object} teamData - Dati della squadra corrente
     * @returns {boolean} True se il giocatore è stato rimosso
     */
    removePlayerFromPosition(playerId, teamData) {
        const initialTitolariLength = teamData.formation.titolari.length;
        teamData.formation.titolari = teamData.formation.titolari.filter(p => p.id !== playerId);
        const removedFromTitolari = initialTitolariLength !== teamData.formation.titolari.length;

        const initialPanchinaLength = teamData.formation.panchina.length;
        teamData.formation.panchina = teamData.formation.panchina.filter(p => p.id !== playerId);
        const removedFromPanchina = initialPanchinaLength !== teamData.formation.panchina.length;

        return removedFromTitolari || removedFromPanchina;
    },

    /**
     * Genera o recupera la forma casuale e la applica al giocatore.
     * @param {Object} player - Oggetto giocatore.
     * @param {Map} formsMap - Mappa delle forme persistenti {playerId: {mod: X, icon: Y, level: Z}}.
     * @returns {Object} Oggetto giocatore con formModifier, formIcon, e currentLevel.
     */
    applyFormForDisplay(player, formsMap) {
        const playerId = player.id;
        const getRandomInt = window.getRandomInt;

        // 1. RECUPERO: Se la forma è già stata calcolata e salvata, usala
        if (formsMap.has(playerId)) {
            const savedForm = formsMap.get(playerId);
            return {
                ...player,
                formModifier: savedForm.mod,
                formIcon: savedForm.icon,
                currentLevel: savedForm.level
            };
        }

        // 2. GENERAZIONE: Genera un modificatore di forma
        let mod;

        const isIcona = player.abilities && player.abilities.includes('Icona');
        if (isIcona) {
             mod = getRandomInt(0, 6); // ICONA: Range [0, +6]
        } else {
             mod = getRandomInt(-3, 3); // ALTRI: Range [-3, +3]
        }

        let icon;

        if (mod > 0) {
            icon = 'text-green-500 fas fa-arrow-up';
        } else if (mod < 0) {
            icon = 'text-red-500 fas fa-arrow-down';
        } else {
            icon = 'text-gray-400 fas fa-minus-circle';
        }

        const currentLevel = Math.max(1, (player.level || player.currentLevel || 1) + mod);

        const formState = {
            ...player,
            formModifier: mod,
            formIcon: icon,
            currentLevel: currentLevel
        };

        // 3. SALVATAGGIO NELLA MAPPA IN MEMORIA (formsMap)
        formsMap.set(playerId, {
            mod: mod,
            icon: icon,
            level: currentLevel
        });

        return formState;
    },

    /**
     * Ordina i giocatori per Icona, Ruolo e Livello
     * @param {Array} players - Array di giocatori
     * @returns {Array} Array ordinato
     */
    sortPlayersByRole(players) {
        const { ROLE_ORDER } = window.GestioneSquadreConstants;

        return [...players].sort((a, b) => {
            const isIconaA = a.abilities && a.abilities.includes('Icona');
            const isIconaB = b.abilities && b.abilities.includes('Icona');

            // 1. Icona prima
            if (isIconaA && !isIconaB) return -1;
            if (!isIconaA && isIconaB) return 1;

            // 2. Ruolo (P, D, C, A)
            const roleComparison = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
            if (roleComparison !== 0) {
                 return roleComparison;
            }

            // 3. Livello (dal più alto al più basso)
            return (b.level || 1) - (a.level || 1);
        });
    },

    /**
     * Pulisce i dati della formazione per il salvataggio (rimuove dati temporanei)
     * @param {Array} players - Array di giocatori
     * @returns {Array} Array pulito
     */
    cleanFormationForSave(players) {
        return players.map(({ id, name, role, age, cost, level, isCaptain, type, abilities }) =>
            ({ id, name, role, age, cost, level, isCaptain, type, abilities })
        );
    },

    /**
     * Restituisce l'HTML per l'icona del tipo di giocatore
     * @param {string} playerType - Tipo del giocatore
     * @returns {string} HTML dell'icona
     */
    getTypeIconHtml(playerType) {
        const { TYPE_ICONS } = window.GestioneSquadreConstants;
        const typeData = TYPE_ICONS[playerType] || TYPE_ICONS['N/A'];
        return `<i class="${typeData.icon} ${typeData.color} text-lg ml-2" title="Tipo: ${playerType}"></i>`;
    }
};

console.log("Modulo GestioneSquadre-Utils caricato.");
