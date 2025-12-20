//
// ====================================================================
// CONTRACTS.JS - Sistema Contratti Giocatori
// ====================================================================
//
// I contratti si applicano SOLO ai giocatori NORMALI (non Icona, non Base livello 1)
// - Contratto iniziale: 1
// - A fine campionato: contratto -1 per tutti
// - Se contratto = 0: parte timer 48h, poi vendita automatica (rimborso 50%)
//

window.Contracts = {

    // Costante timer 48 ore in millisecondi
    CONTRACT_EXPIRE_TIMER_MS: 48 * 60 * 60 * 1000, // 48 ore

    // Limite massimo anni di contratto
    MAX_CONTRACT_YEARS: 5,

    /**
     * Verifica se il sistema contratti e' abilitato
     */
    isEnabled() {
        return window.FeatureFlags?.isEnabled('contracts') || false;
    },

    /**
     * Verifica se un giocatore e' soggetto a contratto
     * Esclude: Icone, Giocatori Base, Giocatori Seri
     */
    isSubjectToContract(player, teamData = null) {
        if (!player) return false;

        // Escludi Icone
        const isIcona = (player.abilities && player.abilities.includes('Icona')) ||
                        (teamData?.iconaId && player.id === teamData.iconaId);
        if (isIcona) return false;

        // Escludi Giocatori Seri (livello max 10, non lasciano mai la squadra)
        if (player.isSeriousPlayer) return false;

        // Escludi giocatori Base/Gratuiti (livello 1 o 5 con costo 0, non lasciano mai la squadra)
        const playerLevel = player.level || 1;
        const playerCost = player.cost ?? 0;
        const isBase = player.isBase ||
                       player.isBasePlayer ||
                       (player.name?.includes('Base')) ||
                       ((playerLevel === 1 || playerLevel === 5) && playerCost === 0);
        if (isBase) return false;

        return true;
    },

    /**
     * Inizializza il contratto per un nuovo giocatore acquisito
     * @param {Object} player - Giocatore da aggiornare
     * @returns {Object} - Giocatore con contratto inizializzato
     */
    initializeContract(player) {
        if (!this.isEnabled()) return player;
        if (!this.isSubjectToContract(player)) return player;

        return {
            ...player,
            contract: 1 // Contratto iniziale
        };
    },

    /**
     * Calcola il costo per prolungare il contratto di 1
     * Formula: [100 + (livello * 10) + (livello abilità * 25)] / 2
     * @param {Object} player - Giocatore
     * @returns {number} - Costo in CS
     */
    calculateExtensionCost(player) {
        const level = player.level || 1;
        const abilityLevel = (player.abilities?.length || 0);
        const cost = Math.floor((100 + (level * 10) + (abilityLevel * 25)) / 2);
        return cost;
    },

    /**
     * Prolunga il contratto di un giocatore (rimuove anche il timer se attivo)
     * @param {Object} player - Giocatore
     * @param {Object} teamData - Dati squadra
     * @param {Object} context - Contesto Firestore
     * @returns {Promise<{success: boolean, message: string, newContract?: number, newBudget?: number}>}
     */
    async extendContract(player, teamData, context) {
        if (!this.isEnabled()) {
            return { success: false, message: 'Sistema contratti non attivo' };
        }

        if (!this.isSubjectToContract(player, teamData)) {
            return { success: false, message: 'Questo giocatore non e soggetto a contratto' };
        }

        // Verifica limite massimo contratto
        const currentContract = player.contract || 1;
        if (currentContract >= this.MAX_CONTRACT_YEARS) {
            return { success: false, message: `Contratto gia al massimo (${this.MAX_CONTRACT_YEARS} anni)` };
        }

        const cost = this.calculateExtensionCost(player);

        if ((teamData.budget || 0) < cost) {
            return { success: false, message: `Budget insufficiente! Servono ${cost} CS` };
        }

        try {
            const { db, firestoreTools, TEAMS_COLLECTION_PATH, currentTeamId } = context;
            const { doc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            // Aggiorna il giocatore nell'array players
            const updatedPlayers = teamData.players.map(p => {
                if (p.id === player.id) {
                    const updatedPlayer = {
                        ...p,
                        contract: (p.contract || 0) + 1
                    };
                    // Rimuovi il timer se presente
                    delete updatedPlayer.contractExpireTimer;
                    return updatedPlayer;
                }
                return p;
            });

            const newBudget = teamData.budget - cost;
            const newContract = (player.contract || 0) + 1;

            await updateDoc(teamDocRef, {
                players: updatedPlayers,
                budget: newBudget
            });

            // Aggiorna stato locale
            teamData.players = updatedPlayers;
            teamData.budget = newBudget;
            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.players = updatedPlayers;
                window.InterfacciaCore.currentTeamData.budget = newBudget;
            }

            return {
                success: true,
                message: `Contratto di ${player.name} prolungato! Nuovo contratto: ${newContract} anno/i`,
                newContract,
                newBudget
            };

        } catch (error) {
            console.error('[Contracts] Errore prolungamento contratto:', error);
            return { success: false, message: `Errore: ${error.message}` };
        }
    },

    /**
     * Verifica se un giocatore ha il timer di scadenza attivo
     */
    hasExpireTimer(player) {
        return player.contractExpireTimer !== undefined && player.contractExpireTimer !== null;
    },

    /**
     * Verifica se il timer di scadenza e' scaduto
     */
    isTimerExpired(player) {
        if (!this.hasExpireTimer(player)) return false;
        return Date.now() >= player.contractExpireTimer;
    },

    /**
     * Calcola il tempo rimanente prima della vendita automatica
     * @returns {number} Millisecondi rimanenti, o 0 se scaduto
     */
    getTimeRemaining(player) {
        if (!this.hasExpireTimer(player)) return 0;
        const remaining = player.contractExpireTimer - Date.now();
        return Math.max(0, remaining);
    },

    /**
     * Formatta il tempo rimanente in formato leggibile
     */
    formatTimeRemaining(player) {
        const remaining = this.getTimeRemaining(player);
        if (remaining <= 0) return 'Scaduto';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    },

    /**
     * Decrementa i contratti di tutti i giocatori di una squadra a fine stagione
     * Se contratto arriva a 0, avvia timer 48h
     * @param {string} teamId - ID squadra
     * @returns {Promise<{expired: Array, renewed: Array, timerStarted: Array}>}
     */
    async decrementContracts(teamId) {
        if (!this.isEnabled()) return { expired: [], renewed: [], timerStarted: [] };

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const db = window.db;

        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) {
            console.warn(`[Contracts] Squadra ${teamId} non trovata`);
            return { expired: [], renewed: [], timerStarted: [] };
        }

        const teamData = teamDoc.data();
        const expired = [];
        const renewed = [];
        const timerStarted = [];

        const updatedPlayers = [];

        for (const player of (teamData.players || [])) {
            if (!this.isSubjectToContract(player, teamData)) {
                // Icone e Base non hanno contratto
                updatedPlayers.push(player);
                continue;
            }

            // Se ha gia' timer attivo, non decrementare ulteriormente
            if (this.hasExpireTimer(player)) {
                updatedPlayers.push(player);
                continue;
            }

            const currentContract = player.contract || 1;
            const newContract = currentContract - 1;

            if (newContract <= 0) {
                // Contratto scaduto - avvia timer 48h
                const expireTimestamp = Date.now() + this.CONTRACT_EXPIRE_TIMER_MS;
                updatedPlayers.push({
                    ...player,
                    contract: 0,
                    contractExpireTimer: expireTimestamp
                });
                timerStarted.push({
                    player,
                    expireTimestamp
                });
            } else {
                // Contratto ancora valido
                updatedPlayers.push({
                    ...player,
                    contract: newContract
                });
                renewed.push({
                    player,
                    newContract
                });
            }
        }

        // Aggiorna la squadra
        await updateDoc(teamDocRef, {
            players: updatedPlayers
        });

        console.log(`[Contracts] Squadra ${teamId}: ${timerStarted.length} timer avviati, ${renewed.length} rinnovati`);

        return { expired, renewed, timerStarted };
    },

    /**
     * Controlla e vende automaticamente i giocatori con timer scaduto
     * @param {string} teamId - ID squadra
     * @returns {Promise<{sold: Array, budgetGained: number}>}
     */
    async checkAndSellExpiredPlayers(teamId) {
        if (!this.isEnabled()) return { sold: [], budgetGained: 0 };

        const { doc, getDoc, updateDoc, setDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const db = window.db;

        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) return { sold: [], budgetGained: 0 };

        const teamData = teamDoc.data();
        const sold = [];
        let budgetGained = 0;

        const updatedPlayers = [];
        const playersToMarket = [];

        for (const player of (teamData.players || [])) {
            if (this.hasExpireTimer(player) && this.isTimerExpired(player)) {
                // Timer scaduto - vendita automatica
                const refund = Math.floor((player.cost || 0) / 2);
                budgetGained += refund;
                sold.push({ player, refund });
                playersToMarket.push(player);
            } else {
                updatedPlayers.push(player);
            }
        }

        if (sold.length === 0) return { sold: [], budgetGained: 0 };

        // Aggiorna la squadra
        const updatedTitolari = teamData.formation?.titolari?.filter(p =>
            !playersToMarket.some(pm => pm.id === p.id)
        ) || [];
        const updatedPanchina = teamData.formation?.panchina?.filter(p =>
            !playersToMarket.some(pm => pm.id === p.id)
        ) || [];

        await updateDoc(teamDocRef, {
            players: updatedPlayers,
            budget: (teamData.budget || 0) + budgetGained,
            formation: {
                ...teamData.formation,
                titolari: updatedTitolari,
                panchina: updatedPanchina
            }
        });

        // Metti i giocatori venduti nel mercato
        for (const player of playersToMarket) {
            const marketDocRef = doc(db, `artifacts/${appId}/public/data/marketPlayers`, player.id);
            const marketCost = Math.floor((player.cost || 0) * 2 / 3);

            await setDoc(marketDocRef, {
                name: player.name,
                role: player.role,
                type: player.type || 'Potenza',
                age: player.age || 25,
                cost: marketCost,
                level: player.level || 1,
                abilities: player.abilities || [],
                isDrafted: false,
                teamId: null,
                creationDate: new Date().toISOString(),
                expiredContract: true
            });
        }

        console.log(`[Contracts] Squadra ${teamId}: ${sold.length} giocatori venduti per contratto scaduto, ${budgetGained} CS rimborsati`);

        return { sold, budgetGained };
    },

    /**
     * Controlla e vende i giocatori con timer scaduto per TUTTE le squadre
     */
    async checkAndSellExpiredPlayersAllTeams() {
        if (!this.isEnabled()) return { results: [] };

        const { collection, getDocs } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const db = window.db;

        const teamsRef = collection(db, `artifacts/${appId}/public/data/teams`);
        const teamsSnapshot = await getDocs(teamsRef);

        const results = [];

        for (const teamDoc of teamsSnapshot.docs) {
            const result = await this.checkAndSellExpiredPlayers(teamDoc.id);
            if (result.sold.length > 0) {
                results.push({
                    teamId: teamDoc.id,
                    teamName: teamDoc.data().teamName,
                    ...result
                });
            }
        }

        return { results };
    },

    /**
     * Applica i contratti a TUTTI i giocatori esistenti di una squadra
     * Usato quando si abilita il sistema contratti per la prima volta
     * @param {string} teamId - ID squadra
     */
    async applyContractsToExistingPlayers(teamId) {
        if (!this.isEnabled()) return;

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const db = window.db;

        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) return;

        const teamData = teamDoc.data();
        let updated = false;

        const updatedPlayers = (teamData.players || []).map(player => {
            if (this.isSubjectToContract(player, teamData) && player.contract === undefined) {
                updated = true;
                return { ...player, contract: 1 };
            }
            return player;
        });

        if (updated) {
            await updateDoc(teamDocRef, { players: updatedPlayers });
            console.log(`[Contracts] Contratti applicati ai giocatori esistenti della squadra ${teamId}`);
        }
    },

    /**
     * Applica i contratti a TUTTE le squadre (chiamato all'attivazione del flag)
     */
    async applyContractsToAllTeams() {
        if (!this.isEnabled()) return;

        const { collection, getDocs } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const db = window.db;

        const teamsRef = collection(db, `artifacts/${appId}/public/data/teams`);
        const teamsSnapshot = await getDocs(teamsRef);

        for (const teamDoc of teamsSnapshot.docs) {
            await this.applyContractsToExistingPlayers(teamDoc.id);
        }

        console.log('[Contracts] Contratti applicati a tutte le squadre');
    },

    /**
     * Decrementa i contratti di TUTTE le squadre (chiamato a fine campionato)
     */
    async decrementAllContracts() {
        if (!this.isEnabled()) return { results: [] };

        const { collection, getDocs } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const db = window.db;

        const teamsRef = collection(db, `artifacts/${appId}/public/data/teams`);
        const teamsSnapshot = await getDocs(teamsRef);

        const results = [];

        for (const teamDoc of teamsSnapshot.docs) {
            const result = await this.decrementContracts(teamDoc.id);
            results.push({
                teamId: teamDoc.id,
                teamName: teamDoc.data().teamName,
                ...result
            });
        }

        console.log('[Contracts] Contratti decrementati per tutte le squadre');
        return { results };
    },

    /**
     * Ottieni il colore del badge contratto in base al valore
     */
    getContractBadgeColor(player) {
        // Se ha timer attivo
        if (this.hasExpireTimer(player)) {
            return 'bg-orange-600 text-orange-100 animate-pulse';
        }

        const contract = player.contract || 1;
        if (contract >= 3) return 'bg-green-600 text-green-100';
        if (contract === 2) return 'bg-yellow-600 text-yellow-100';
        if (contract === 1) return 'bg-red-600 text-red-100';
        return 'bg-gray-600 text-gray-100';
    },

    /**
     * Renderizza il badge contratto
     */
    renderContractBadge(player, teamData = null) {
        if (!this.isEnabled()) return '';
        if (!this.isSubjectToContract(player, teamData)) return '';

        // Se ha timer attivo, mostra countdown
        if (this.hasExpireTimer(player)) {
            const timeRemaining = this.formatTimeRemaining(player);
            const colorClass = this.getContractBadgeColor(player);
            return `<span class="${colorClass} px-2 py-0.5 rounded-full text-xs font-bold" title="Vendita automatica tra ${timeRemaining}">⏰ ${timeRemaining}</span>`;
        }

        const contract = player.contract || 1;
        const colorClass = this.getContractBadgeColor(player);

        return `<span class="${colorClass} px-2 py-0.5 rounded-full text-xs font-bold" title="Contratto: ${contract} anno/i">📝 ${contract}</span>`;
    }
};

// Listener per quando il flag viene attivato
document.addEventListener('featureFlagChanged', async (e) => {
    if (e.detail.flagId === 'contracts' && e.detail.enabled) {
        // Applica contratti a tutti i giocatori esistenti
        await window.Contracts.applyContractsToAllTeams();
        if (window.Toast) {
            window.Toast.success('Sistema Contratti attivato! Contratti applicati ai giocatori esistenti.');
        }
    }
});

// Controlla periodicamente i timer scaduti (ogni 5 minuti)
setInterval(async () => {
    if (window.Contracts?.isEnabled() && window.db && window.firestoreTools) {
        const result = await window.Contracts.checkAndSellExpiredPlayersAllTeams();
        if (result.results.length > 0) {
            console.log('[Contracts] Venduti giocatori con timer scaduto:', result.results);
            // Aggiorna la dashboard se necessario
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
        }
    }
}, 5 * 60 * 1000); // 5 minuti

console.log("Modulo Contracts caricato.");
