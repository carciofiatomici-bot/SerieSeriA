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
     * Recupera o inizializza la forma di un giocatore.
     * NUOVO SISTEMA: I giocatori partono con forma 0 (neutra).
     * La forma viene modificata solo dalle prestazioni in partita.
     * @param {Object} player - Oggetto giocatore.
     * @param {Map} formsMap - Mappa delle forme persistenti {playerId: {mod: X, icon: Y, level: Z}}.
     * @returns {Object} Oggetto giocatore con formModifier, formIcon, e currentLevel.
     */
    applyFormForDisplay(player, formsMap) {
        const playerId = player.id;

        // 1. RECUPERO: Se la forma e' gia' stata salvata, usala
        if (formsMap.has(playerId)) {
            const savedForm = formsMap.get(playerId);
            return {
                ...player,
                formModifier: savedForm.mod,
                formIcon: savedForm.icon,
                currentLevel: savedForm.level,
                benchStreak: savedForm.benchStreak || 0
            };
        }

        // 2. INIZIALIZZAZIONE: Nuovi giocatori partono con forma 0 (neutra)
        const mod = 0;
        const icon = 'text-gray-400 fas fa-minus-circle'; // Icona neutra

        const currentLevel = Math.min(30, Math.max(1, (player.level || player.currentLevel || 1) + mod));

        const formState = {
            ...player,
            formModifier: mod,
            formIcon: icon,
            currentLevel: currentLevel,
            benchStreak: 0
        };

        // 3. SALVATAGGIO NELLA MAPPA IN MEMORIA (formsMap)
        formsMap.set(playerId, {
            mod: mod,
            icon: icon,
            level: currentLevel,
            benchStreak: 0
        });

        return formState;
    },

    /**
     * Calcola l'icona della forma in base al modificatore
     * @param {number} mod - Modificatore forma
     * @returns {string} Classe CSS icona
     */
    getFormIcon(mod) {
        if (mod > 0) {
            return 'text-green-500 fas fa-arrow-up';
        } else if (mod < 0) {
            return 'text-red-500 fas fa-arrow-down';
        }
        return 'text-gray-400 fas fa-minus-circle';
    },

    /**
     * Aggiorna la forma dei giocatori dopo una partita.
     * NUOVO SISTEMA basato su prestazioni:
     * - Gol segnato: +1
     * - Assist: +1
     * - Clean sheet (portiere): +1
     * - 20% chance +-1 per titolari
     * - 10% chance +-1 per tutti
     * - Panchina consecutiva: probabilita' crescente di -1
     *
     * @param {string} teamId - ID squadra
     * @param {Object} teamData - Dati squadra con formation e players
     * @param {Object} matchResult - Risultato partita {scorers, assisters, cleanSheet, isHome, goalsAgainst}
     * @returns {Promise<Object>} Nuove forme aggiornate
     */
    async updatePlayerFormAfterMatch(teamId, teamData, matchResult) {
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        // Carica forme attuali
        const teamDocRef = doc(db, TEAMS_PATH, teamId);
        const teamDoc = await getDoc(teamDocRef);
        if (!teamDoc.exists()) {
            console.error(`[FormSystem] Squadra ${teamId} non trovata`);
            return null;
        }

        const currentData = teamDoc.data();
        const playersFormStatus = currentData.playersFormStatus || {};
        const players = currentData.players || [];
        const titolari = teamData.formation?.titolari || [];
        const panchina = teamData.formation?.panchina || [];

        // Set di ID titolari e panchina
        const titolariIds = new Set(titolari.map(p => p.id));
        const panchinaIds = new Set(panchina.map(p => p.id));

        // Estrai scorers e assisters dalla partita
        const scorersSet = new Set((matchResult.scorers || []).map(s => s.name));
        const assistersSet = new Set((matchResult.assists || []).map(a => a.name));
        const isCleanSheet = matchResult.goalsAgainst === 0;

        // Random helper
        const getRandomInt = window.getRandomInt || ((min, max) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        });

        const updatedForms = {};
        const formChanges = [];

        // Processa tutti i giocatori della rosa
        for (const player of players) {
            if (!player || !player.id) continue;

            const playerId = player.id;
            const playerName = player.name || player.nome || 'Giocatore';
            const currentForm = playersFormStatus[playerId] || { mod: 0, benchStreak: 0 };
            let newMod = currentForm.mod || 0;
            let benchStreak = currentForm.benchStreak || 0;
            const changes = [];

            const isTitolare = titolariIds.has(playerId);
            const isInPanchina = panchinaIds.has(playerId);
            const isGK = (player.role || player.ruolo || '').toUpperCase() === 'P';

            if (isTitolare) {
                // Reset bench streak per titolari
                benchStreak = 0;

                // Bonus gol
                if (scorersSet.has(playerName)) {
                    newMod += 1;
                    changes.push('+1 gol');
                }

                // Bonus assist
                if (assistersSet.has(playerName)) {
                    newMod += 1;
                    changes.push('+1 assist');
                }

                // Bonus clean sheet portiere
                if (isGK && isCleanSheet) {
                    newMod += 1;
                    changes.push('+1 clean sheet');
                }

                // 20% chance +-1 random per titolari
                if (Math.random() < 0.20) {
                    const randomChange = getRandomInt(0, 1) === 0 ? -1 : 1;
                    newMod += randomChange;
                    changes.push(`${randomChange > 0 ? '+1' : '-1'} random`);
                }

            } else if (isInPanchina) {
                // In panchina durante la partita: incrementa bench streak
                benchStreak += 1;

                // Probabilita' perdita forma basata su bench streak
                let benchPenaltyChance = 0;
                if (benchStreak === 1) benchPenaltyChance = 0.10;
                else if (benchStreak === 2) benchPenaltyChance = 0.20;
                else if (benchStreak >= 3) benchPenaltyChance = 0.30;

                if (benchPenaltyChance > 0 && Math.random() < benchPenaltyChance) {
                    newMod -= 1;
                    changes.push(`-1 panchina (streak ${benchStreak})`);
                } else {
                    // 10% chance +-1 random per chi non ha gia' preso penalita'
                    if (Math.random() < 0.10) {
                        const randomChange = getRandomInt(0, 1) === 0 ? -1 : 1;
                        newMod += randomChange;
                        changes.push(`${randomChange > 0 ? '+1' : '-1'} random`);
                    }
                }

            } else {
                // Non in formazione: incrementa bench streak (come in panchina)
                benchStreak += 1;

                // Stesse probabilita' della panchina
                let benchPenaltyChance = 0;
                if (benchStreak === 1) benchPenaltyChance = 0.10;
                else if (benchStreak === 2) benchPenaltyChance = 0.20;
                else if (benchStreak >= 3) benchPenaltyChance = 0.30;

                if (benchPenaltyChance > 0 && Math.random() < benchPenaltyChance) {
                    newMod -= 1;
                    changes.push(`-1 escluso (streak ${benchStreak})`);
                }
            }

            // Clamp forma a [-3, +3]
            newMod = Math.max(-3, Math.min(3, newMod));

            // Calcola nuovo livello
            const baseLevel = player.level || 1;
            const newLevel = Math.min(30, Math.max(1, baseLevel + newMod));

            updatedForms[playerId] = {
                mod: newMod,
                icon: this.getFormIcon(newMod),
                level: newLevel,
                benchStreak: benchStreak
            };

            if (changes.length > 0) {
                formChanges.push(`${playerName}: ${changes.join(', ')} -> forma ${newMod}`);
            }
        }

        // Salva su Firestore
        try {
            await updateDoc(teamDocRef, { playersFormStatus: updatedForms });
            console.log(`[FormSystem] Forme aggiornate per ${teamData.teamName || teamId}:`, formChanges);
        } catch (error) {
            console.error(`[FormSystem] Errore salvataggio forme per ${teamId}:`, error);
        }

        return updatedForms;
    },

    /**
     * Applica penalita' forma dopo allenamento giocatore (-1)
     * @param {string} teamId - ID squadra
     * @param {string} playerId - ID giocatore allenato
     * @returns {Promise<boolean>} Successo operazione
     */
    async applyTrainingFormPenalty(teamId, playerId) {
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        try {
            const teamDocRef = doc(db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) return false;

            const teamData = teamDoc.data();
            const playersFormStatus = teamData.playersFormStatus || {};
            const players = teamData.players || [];

            // Trova il giocatore per ottenere il livello base
            const player = players.find(p => p.id === playerId);
            if (!player) return false;

            const currentForm = playersFormStatus[playerId] || { mod: 0, benchStreak: 0 };
            const newMod = Math.max(-3, currentForm.mod - 1);
            const baseLevel = player.level || 1;
            const newLevel = Math.min(30, Math.max(1, baseLevel + newMod));

            playersFormStatus[playerId] = {
                mod: newMod,
                icon: this.getFormIcon(newMod),
                level: newLevel,
                benchStreak: currentForm.benchStreak || 0
            };

            await updateDoc(teamDocRef, { playersFormStatus });
            console.log(`[FormSystem] Penalita' allenamento: ${player.name || playerId} forma ${currentForm.mod} -> ${newMod}`);
            return true;

        } catch (error) {
            console.error(`[FormSystem] Errore penalita' allenamento:`, error);
            return false;
        }
    },

    /**
     * Resetta le forme di tutte le squadre a 0 (inizio stagione)
     * @returns {Promise<number>} Numero squadre resettate
     */
    async resetAllTeamsForms() {
        const { collection, getDocs, updateDoc, doc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        try {
            const teamsRef = collection(db, TEAMS_PATH);
            const teamsSnapshot = await getDocs(teamsRef);
            let resetCount = 0;

            for (const teamDoc of teamsSnapshot.docs) {
                const teamData = teamDoc.data();
                const players = teamData.players || [];
                const resetForms = {};

                // Resetta tutti i giocatori a forma 0
                for (const player of players) {
                    if (!player || !player.id) continue;
                    const baseLevel = player.level || 1;
                    resetForms[player.id] = {
                        mod: 0,
                        icon: 'text-gray-400 fas fa-minus-circle',
                        level: baseLevel,
                        benchStreak: 0
                    };
                }

                await updateDoc(doc(db, TEAMS_PATH, teamDoc.id), { playersFormStatus: resetForms });
                resetCount++;
            }

            console.log(`[FormSystem] Reset stagionale: ${resetCount} squadre resettate a forma 0`);
            return resetCount;

        } catch (error) {
            console.error('[FormSystem] Errore reset stagionale forme:', error);
            return 0;
        }
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
     * Salva solo i campi essenziali per ridurre dimensione documento Firestore
     * @param {Array} players - Array di giocatori
     * @returns {Array} Array pulito (compressi)
     */
    cleanFormationForSave(players) {
        // Salva solo campi essenziali: id, role, level, type, abilities, assignedPosition, isCaptain
        // I campi name, age, cost sono ridondanti (presenti nella rosa)
        // IMPORTANTE: Firebase non accetta valori undefined, quindi aggiungiamo solo campi definiti
        return players.map(({ id, role, level, isCaptain, type, abilities, assignedPosition }) => {
            const compressed = {};
            // Aggiungi solo campi con valori definiti (Firebase rifiuta undefined)
            if (id !== undefined) compressed.id = id;
            if (role !== undefined) compressed.role = role;
            if (level !== undefined) compressed.level = level;
            if (type !== undefined) compressed.type = type;
            if (assignedPosition !== undefined) compressed.assignedPosition = assignedPosition;
            if (isCaptain) compressed.isCaptain = true;
            if (abilities && abilities.length > 0) compressed.abilities = abilities;
            return compressed;
        });
    },

    /**
     * Espande i dati compressi della formazione recuperando info dalla rosa
     * @param {Array} compressedPlayers - Array di giocatori compressi
     * @param {Array} rosaPlayers - Array completo dei giocatori nella rosa
     * @returns {Array} Array completo con tutti i dati
     */
    expandFormationFromRosa(compressedPlayers, rosaPlayers) {
        if (!compressedPlayers || !Array.isArray(compressedPlayers)) return [];
        if (!rosaPlayers || !Array.isArray(rosaPlayers)) return compressedPlayers;

        return compressedPlayers.map(compressed => {
            // Trova il giocatore completo nella rosa
            const fullPlayer = rosaPlayers.find(p => p.id === compressed.id);

            if (fullPlayer) {
                // Unisci dati dalla rosa con quelli salvati (assignedPosition)
                return {
                    ...fullPlayer,
                    assignedPosition: compressed.assignedPosition,
                    // Se il livello salvato e diverso, usa quello salvato
                    level: compressed.level || fullPlayer.level
                };
            }

            // Fallback: restituisci i dati compressi (giocatore non piu in rosa?)
            return compressed;
        });
    },

    /**
     * Restituisce l'HTML per il badge del tipo di giocatore (PlayerTypeBadge)
     * @param {string} playerType - Tipo del giocatore ('Potenza', 'Tecnica', 'Velocita')
     * @param {string} size - Dimensione: 'xs', 'sm', 'md', 'lg' (default: 'sm')
     * @returns {string} HTML del badge
     */
    getTypeBadgeHtml(playerType, size = 'sm') {
        return window.GestioneSquadreConstants.getTypeBadgeHtml(playerType, size);
    },

    /**
     * @deprecated Usa getTypeBadgeHtml() invece
     * Restituisce l'HTML per l'icona del tipo di giocatore (legacy)
     * @param {string} playerType - Tipo del giocatore
     * @returns {string} HTML dell'icona
     */
    getTypeIconHtml(playerType) {
        // Ora restituisce il badge invece dell'icona
        return this.getTypeBadgeHtml(playerType, 'sm');
    }
};

console.log("Modulo GestioneSquadre-Utils caricato.");
