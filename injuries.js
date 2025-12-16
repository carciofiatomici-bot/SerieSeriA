//
// ====================================================================
// INJURIES.JS - Sistema Infortuni Giocatori
// ====================================================================
//
// Gestisce gli infortuni dei giocatori dopo le partite:
// - 1% di probabilita per squadra a fine partita
// - Se si rientra nell'1%: un giocatore random in campo si infortuna
// - Max 1 infortunio contemporaneo per squadra
// - Durata: 1-10 partite
// - Applica a: Campionato, Coppa, Supercoppa (NON sfide/allenamenti)
//

window.Injuries = {

    // Costanti (valori default, sovrascritti da Firestore se disponibili)
    INJURY_CHANCE: 0.01, // 1% per giocatore
    MIN_INJURY_DURATION: 1,
    MAX_INJURY_DURATION: 10,
    MAX_INJURIES_COUNT: 99, // Nessun limite infortuni per squadra

    /**
     * Verifica se il sistema infortuni e' abilitato
     */
    isEnabled() {
        return window.FeatureFlags?.isEnabled('injuries') || false;
    },

    /**
     * Carica le impostazioni da Firestore
     */
    async loadSettings() {
        if (!window.db || !window.firestoreTools) return;

        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const settingsDocRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'injurySettings');

            const docSnap = await getDoc(settingsDocRef);

            if (docSnap.exists()) {
                const settings = docSnap.data();
                if (settings.injuryChance !== undefined) this.INJURY_CHANCE = settings.injuryChance;
                if (settings.minDuration !== undefined) this.MIN_INJURY_DURATION = settings.minDuration;
                if (settings.maxDuration !== undefined) this.MAX_INJURY_DURATION = settings.maxDuration;
                if (settings.maxCount !== undefined) this.MAX_INJURIES_COUNT = settings.maxCount;
                console.log('[Injuries] Impostazioni caricate da Firestore:', settings);
            }
        } catch (error) {
            console.warn('[Injuries] Errore caricamento impostazioni, uso defaults:', error);
        }
    },

    /**
     * Processa gli infortuni dopo una partita
     * @param {string} teamId - ID della squadra
     * @param {Array} playersOnField - Giocatori schierati in campo
     * @param {string} matchType - Tipo partita: 'campionato', 'coppa', 'supercoppa'
     * @returns {Promise<Object|null>} - Giocatore infortunato o null
     */
    async processPostMatchInjuries(teamId, playersOnField, matchType) {
        if (!this.isEnabled()) return null;

        // Solo per partite ufficiali (incluse sfide in tempo reale)
        const validMatchTypes = ['campionato', 'coppa', 'supercoppa', 'sfida'];
        if (!validMatchTypes.includes(matchType?.toLowerCase())) {
            return null;
        }

        if (!playersOnField || playersOnField.length === 0) {
            return null;
        }

        try {
            // Carica dati squadra per verificare limite infortuni
            const teamData = await this.loadTeamData(teamId);
            if (!teamData) return null;

            const rosaSize = teamData.players?.length || 0;

            // Se rosa <= 5 giocatori, nessun infortunio possibile (protezione rosa minima)
            if (rosaSize <= 5) {
                console.log(`[Injuries] Squadra ${teamId} ha solo ${rosaSize} giocatori - protetta da infortuni`);
                return null;
            }

            const maxInjuries = this.MAX_INJURIES_COUNT; // Max 1 infortunato per squadra
            const currentInjuries = this.getInjuredPlayers(teamData).length;

            // Se gia al limite, nessun nuovo infortunio
            if (currentInjuries >= maxInjuries) {
                console.log(`[Injuries] Squadra ${teamId} gia al limite infortuni (${currentInjuries}/${maxInjuries})`);
                return null;
            }

            // Filtra giocatori gia infortunati e giocatori base (immuni)
            const eligiblePlayers = playersOnField.filter(p => {
                const playerData = teamData.players?.find(tp => tp.id === p.id);
                // Escludi se gia infortunato
                if (playerData?.injury) return false;
                // Escludi giocatori base (immuni agli infortuni)
                const isBase = playerData?.isBase ||
                               playerData?.isBasePlayer ||
                               (playerData?.name?.includes('Base')) ||
                               ((playerData?.level || 1) === 1 && (playerData?.cost || 0) === 0);
                if (isBase) return false;
                return true;
            });

            if (eligiblePlayers.length === 0) return null;

            // Roll singolo per la squadra (1% di probabilità)
            let injuredPlayer = null;

            if (Math.random() < this.INJURY_CHANCE) {
                // La squadra rientra nella probabilità di infortunio!
                // Seleziona un giocatore random tra quelli in campo
                const randomIndex = Math.floor(Math.random() * eligiblePlayers.length);
                const player = eligiblePlayers[randomIndex];

                const duration = this.getRandomInt(this.MIN_INJURY_DURATION, this.MAX_INJURY_DURATION);
                injuredPlayer = {
                    playerId: player.id,
                    playerName: player.name,
                    duration: duration,
                    matchType: matchType,
                    injuredAt: new Date().toISOString()
                };
            }

            if (injuredPlayer) {
                await this.applyInjury(teamId, injuredPlayer);
                console.log(`[Injuries] ${injuredPlayer.playerName} infortunato per ${injuredPlayer.duration} partite`);
            }

            return injuredPlayer;

        } catch (error) {
            console.error('[Injuries] Errore processamento infortuni:', error);
            return null;
        }
    },

    /**
     * Applica un infortunio a un giocatore
     */
    async applyInjury(teamId, injuryData) {
        if (!window.db || !window.firestoreTools) return;

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        try {
            const teamDocRef = doc(window.db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) return;

            const teamData = teamDoc.data();
            const players = teamData.players || [];

            // Trova e aggiorna il giocatore
            const updatedPlayers = players.map(p => {
                if (p.id === injuryData.playerId) {
                    return {
                        ...p,
                        injury: {
                            remainingMatches: injuryData.duration,
                            injuredAt: injuryData.injuredAt,
                            matchType: injuryData.matchType
                        }
                    };
                }
                return p;
            });

            await updateDoc(teamDocRef, { players: updatedPlayers });

        } catch (error) {
            console.error('[Injuries] Errore applicazione infortunio:', error);
        }
    },

    /**
     * Decrementa le partite di infortunio per tutti i giocatori di una squadra
     * Da chiamare dopo ogni partita ufficiale
     */
    async decrementInjuries(teamId) {
        if (!this.isEnabled()) return;
        if (!window.db || !window.firestoreTools) return;

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        try {
            const teamDocRef = doc(window.db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) return;

            const teamData = teamDoc.data();
            const players = teamData.players || [];
            let changed = false;

            const updatedPlayers = players.map(p => {
                if (p.injury && p.injury.remainingMatches > 0) {
                    const newRemaining = p.injury.remainingMatches - 1;
                    changed = true;

                    if (newRemaining <= 0) {
                        // Guarito!
                        const { injury, ...playerWithoutInjury } = p;
                        console.log(`[Injuries] ${p.name} guarito!`);
                        return playerWithoutInjury;
                    } else {
                        return {
                            ...p,
                            injury: {
                                ...p.injury,
                                remainingMatches: newRemaining
                            }
                        };
                    }
                }
                return p;
            });

            if (changed) {
                await updateDoc(teamDocRef, { players: updatedPlayers });
            }

        } catch (error) {
            console.error('[Injuries] Errore decremento infortuni:', error);
        }
    },

    /**
     * Ottiene la lista dei giocatori infortunati di una squadra
     */
    getInjuredPlayers(teamData) {
        if (!teamData?.players) return [];
        return teamData.players.filter(p => p.injury && p.injury.remainingMatches > 0);
    },

    /**
     * Verifica se un giocatore e' infortunato
     */
    isPlayerInjured(player) {
        return player?.injury && player.injury.remainingMatches > 0;
    },

    /**
     * Ottiene le partite rimanenti di infortunio
     */
    getRemainingMatches(player) {
        if (!this.isPlayerInjured(player)) return 0;
        return player.injury.remainingMatches;
    },

    /**
     * Carica i dati della squadra
     */
    async loadTeamData(teamId) {
        if (!window.db || !window.firestoreTools) return null;

        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        try {
            const teamDocRef = doc(window.db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);
            return teamDoc.exists() ? teamDoc.data() : null;
        } catch (error) {
            console.error('[Injuries] Errore caricamento squadra:', error);
            return null;
        }
    },

    /**
     * Genera numero casuale intero tra min e max (inclusi)
     */
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Rimuove manualmente un infortunio (per admin)
     */
    async removeInjury(teamId, playerId) {
        if (!window.db || !window.firestoreTools) return false;

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        try {
            const teamDocRef = doc(window.db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) return false;

            const teamData = teamDoc.data();
            const players = teamData.players || [];

            const updatedPlayers = players.map(p => {
                if (p.id === playerId) {
                    const { injury, ...playerWithoutInjury } = p;
                    return playerWithoutInjury;
                }
                return p;
            });

            await updateDoc(teamDocRef, { players: updatedPlayers });
            return true;

        } catch (error) {
            console.error('[Injuries] Errore rimozione infortunio:', error);
            return false;
        }
    },

    /**
     * Renderizza l'indicatore di infortunio per un giocatore
     */
    renderInjuryBadge(player) {
        if (!this.isPlayerInjured(player)) return '';

        const remaining = this.getRemainingMatches(player);
        return `<span class="text-red-500 text-xs ml-1" title="Infortunato - ${remaining} partite">🏥${remaining}</span>`;
    },

    /**
     * Renderizza il box infortunati per la gestione formazione
     */
    renderInjuredPlayersBox(teamData) {
        if (!this.isEnabled()) return '';

        const injuredPlayers = this.getInjuredPlayers(teamData);

        if (injuredPlayers.length === 0) {
            return `
                <div class="p-3 bg-gray-800 rounded-lg border border-gray-600 mb-4">
                    <h4 class="text-sm font-bold text-red-400 flex items-center gap-2 mb-2">
                        <span>🏥</span> Infermeria
                    </h4>
                    <p class="text-gray-500 text-sm text-center">Nessun giocatore infortunato</p>
                </div>
            `;
        }

        const playersHtml = injuredPlayers.map(p => {
            const remaining = p.injury.remainingMatches;
            return `
                <div class="flex items-center justify-between py-2 px-3 bg-red-900/30 rounded border border-red-700 mb-1">
                    <div class="flex items-center gap-2">
                        <span class="text-red-400">${this.getRoleBadge(p.role)}</span>
                        <span class="text-white text-sm">${p.name}</span>
                    </div>
                    <span class="text-red-400 text-xs font-bold">🏥 ${remaining} partite</span>
                </div>
            `;
        }).join('');

        return `
            <div class="p-3 bg-gray-800 rounded-lg border border-red-500 mb-4">
                <h4 class="text-sm font-bold text-red-400 flex items-center gap-2 mb-2">
                    <span>🏥</span> Infermeria (${injuredPlayers.length})
                </h4>
                <div class="max-h-32 overflow-y-auto">
                    ${playersHtml}
                </div>
                <p class="text-xs text-gray-500 mt-2 text-center">I giocatori infortunati non possono essere schierati</p>
            </div>
        `;
    },

    /**
     * Helper per badge ruolo
     */
    getRoleBadge(role) {
        const badges = {
            'P': '<span class="px-1 py-0.5 bg-yellow-600 text-yellow-100 rounded text-xs">P</span>',
            'D': '<span class="px-1 py-0.5 bg-blue-600 text-blue-100 rounded text-xs">D</span>',
            'C': '<span class="px-1 py-0.5 bg-green-600 text-green-100 rounded text-xs">C</span>',
            'A': '<span class="px-1 py-0.5 bg-red-600 text-red-100 rounded text-xs">A</span>'
        };
        return badges[role] || role;
    }
};

// Auto-init quando Firestore è pronto
document.addEventListener('DOMContentLoaded', () => {
    const checkAndInit = () => {
        if (window.db && window.firestoreTools) {
            window.Injuries.loadSettings();
        } else {
            setTimeout(checkAndInit, 200);
        }
    };
    setTimeout(checkAndInit, 500);
});

console.log("Modulo Injuries caricato.");
