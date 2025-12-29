//
// ====================================================================
// STIPENDI.JS - Sistema Stipendi Giocatori
// ====================================================================
//
// Sistema di stipendi basato sul livello dei giocatori.
// Rende difficile mantenere una rosa di tutti giocatori alti.
//
// Formula: stipendio = livello x coefficiente (1.36)
// Bilanciamento: 5 giocatori lv.25 = ~170 CS (quanto si guadagna vincendo 5-0)
// Pagamento: ogni giornata di campionato
// Penalita: malus in partita se in debito, vendita forzata dopo X giornate
// Esenti: Icone (capitani) e giocatori base (livello <= 5)
//
// Tabella stipendi (coeff 1.36):
// Lv.1-5=0CS (esenti), Lv.10=14CS, Lv.15=20CS, Lv.20=27CS, Lv.25=34CS, Lv.30=41CS
//

window.Stipendi = {

    // Configurazione di default
    // BILANCIAMENTO: coeff 1.36 = 5 giocatori lv.25 costano ~170 CS
    // (equivalente ai guadagni di una vittoria 5-0 con Sponsor+Media base)
    DEFAULT_CONFIG: {
        enabled: false,              // Disattivato di default
        baseCoefficient: 1.36,       // stipendio = livello * 1.36
        debtPenaltyModifier: -1.5,   // Malus in partita per debito
        maxDebtMatchdays: 3,         // Giornate max in debito prima vendita forzata
        autoSellEnabled: true        // Vendita forzata attiva
        // NOTA: Icone (capitani) sono ESENTI da stipendio
        // NOTA: Nessun salary cap - il costo scala con il livello dei giocatori
    },

    // Cache della configurazione
    _configCache: null,
    _configCacheTime: 0,
    CONFIG_CACHE_DURATION: 60000, // 1 minuto

    // ========== CARICAMENTO CONFIGURAZIONE ==========

    /**
     * Carica la configurazione stipendi da Firestore
     */
    async loadConfig() {
        const now = Date.now();

        // Usa cache se valida
        if (this._configCache && (now - this._configCacheTime) < this.CONFIG_CACHE_DURATION) {
            return this._configCache;
        }

        try {
            const { doc, getDoc, appId } = window.firestoreTools;
            const db = window.db;
            const configRef = doc(db, `artifacts/${appId}/public/data/config`, 'settings');
            const configDoc = await getDoc(configRef);

            if (configDoc.exists() && configDoc.data().salaryConfig) {
                this._configCache = { ...this.DEFAULT_CONFIG, ...configDoc.data().salaryConfig };
            } else {
                this._configCache = { ...this.DEFAULT_CONFIG };
            }

            this._configCacheTime = now;
            return this._configCache;

        } catch (error) {
            console.error('[Stipendi] Errore caricamento config:', error);
            return { ...this.DEFAULT_CONFIG };
        }
    },

    /**
     * Salva la configurazione stipendi su Firestore
     */
    async saveConfig(config) {
        try {
            const { doc, updateDoc, appId } = window.firestoreTools;
            const db = window.db;
            const configRef = doc(db, `artifacts/${appId}/public/data/config`, 'settings');

            await updateDoc(configRef, { salaryConfig: config });

            // Invalida cache
            this._configCache = config;
            this._configCacheTime = Date.now();

            console.log('[Stipendi] Configurazione salvata');
            return true;

        } catch (error) {
            console.error('[Stipendi] Errore salvataggio config:', error);
            return false;
        }
    },

    /**
     * Verifica se il sistema stipendi e attivo
     * Usa il Feature Flag 'salaries' come controllo principale
     */
    async isEnabled() {
        // Prima controlla il feature flag
        if (window.FeatureFlags && !window.FeatureFlags.isEnabled('salaries')) {
            return false;
        }
        return true;
    },

    // ========== CALCOLO STIPENDI ==========

    /**
     * Calcola lo stipendio di un singolo giocatore
     * Formula: stipendio = livello x coefficiente (1.36)
     * ESENTI: Icone (capitani) e giocatori base (livello <= 5)
     *
     * Tabella riferimento (coeff 1.36):
     * Lv.1-5=0CS (esenti), Lv.10=14CS, Lv.15=20CS, Lv.20=27CS, Lv.25=34CS, Lv.30=41CS
     */
    calculatePlayerSalary(player, config) {
        if (!player) return 0;

        // Icone (capitani) sono ESENTI da stipendio
        const isIcona = player.abilities?.includes('Icona') || player.isCaptain;
        if (isIcona) {
            return 0;
        }

        const level = player.level || 1;

        // Giocatori base (livello 5) sono ESENTI da stipendio
        if (level <= 5) {
            return 0;
        }

        const coefficient = config?.baseCoefficient || 1.36;
        const salary = level * coefficient;

        return Math.round(salary);
    },

    /**
     * Calcola il monte stipendi totale della squadra
     */
    calculateTotalSalary(players, config) {
        if (!players || !Array.isArray(players)) return 0;

        return players.reduce((total, player) => {
            return total + this.calculatePlayerSalary(player, config);
        }, 0);
    },

    /**
     * Ottiene informazioni complete sugli stipendi di una squadra
     * (Nessun salary cap - il costo scala con il livello dei giocatori)
     */
    async getSalaryInfo(teamData) {
        // Controlla feature flag
        if (window.FeatureFlags && !window.FeatureFlags.isEnabled('salaries')) {
            return { enabled: false };
        }

        const config = await this.loadConfig();

        const players = teamData?.players || [];
        const totalSalary = this.calculateTotalSalary(players, config);

        return {
            enabled: true,
            totalSalary,
            coefficient: config.baseCoefficient || 1.36,
            debt: teamData?.salaryDebt || 0,
            debtMatchdays: teamData?.debtMatchdays || 0,
            maxDebtMatchdays: config.maxDebtMatchdays
        };
    },

    // ========== PAGAMENTO STIPENDI ==========

    /**
     * Processa il pagamento stipendi per una squadra dopo una partita
     * Chiamato da campionato-main.js dopo applyMatchRewards
     */
    async processSalaryPayment(teamId, teamData, matchday) {
        // Controlla feature flag
        if (window.FeatureFlags && !window.FeatureFlags.isEnabled('salaries')) {
            return { success: true, skipped: true, reason: 'Sistema stipendi disattivato' };
        }

        const config = await this.loadConfig();

        const players = teamData?.players || [];
        const totalSalary = this.calculateTotalSalary(players, config);
        const currentBudget = teamData?.budget || 0;
        const currentDebt = teamData?.salaryDebt || 0;
        let currentDebtMatchdays = teamData?.debtMatchdays || 0;

        let paid = 0;
        let newDebt = currentDebt;
        let newDebtMatchdays = currentDebtMatchdays;
        let forceSaleResult = null;

        if (currentBudget >= totalSalary) {
            // Pagamento completo
            paid = totalSalary;
            // Se aveva debito, resetta contatore giornate (ma debito resta)
            if (currentDebt === 0) {
                newDebtMatchdays = 0;
            }
        } else {
            // Pagamento parziale o nullo
            paid = Math.max(0, currentBudget);
            const unpaid = totalSalary - paid;
            newDebt = currentDebt + unpaid;
            newDebtMatchdays = currentDebtMatchdays + 1;

            console.log(`[Stipendi] ${teamData.teamName}: debito aumentato di ${unpaid} CS (totale: ${newDebt}, giornate: ${newDebtMatchdays})`);
        }

        // Calcola nuovo budget
        const newBudget = currentBudget - paid;

        // Aggiorna Firestore
        try {
            const { doc, updateDoc, appId } = window.firestoreTools;
            const db = window.db;
            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);

            await updateDoc(teamRef, {
                budget: newBudget,
                salaryDebt: newDebt,
                debtMatchdays: newDebtMatchdays,
                lastSalaryPayment: {
                    matchday,
                    totalDue: totalSalary,
                    totalPaid: paid,
                    timestamp: new Date().toISOString()
                }
            });

            console.log(`[Stipendi] ${teamData.teamName}: pagati ${paid}/${totalSalary} CS (budget: ${newBudget})`);

        } catch (error) {
            console.error(`[Stipendi] Errore aggiornamento team ${teamId}:`, error);
            return { success: false, error: error.message };
        }

        // Verifica vendita forzata se troppo tempo in debito
        if (newDebtMatchdays >= config.maxDebtMatchdays && config.autoSellEnabled && newDebt > 0) {
            console.log(`[Stipendi] ${teamData.teamName}: vendita forzata attivata (${newDebtMatchdays} giornate in debito)`);
            forceSaleResult = await this.forcePlayerSale(teamId, { ...teamData, budget: newBudget, salaryDebt: newDebt }, newDebt);
        }

        return {
            success: true,
            paid,
            totalSalary,
            newBudget,
            debt: newDebt,
            debtMatchdays: newDebtMatchdays,
            forceSale: forceSaleResult
        };
    },

    // ========== PENALITA IN PARTITA ==========

    /**
     * Calcola il malus da applicare in simulazione per debito
     * Usato in simulazione.js
     */
    getDebtPenalty(teamData, config) {
        // Controlla feature flag (sync version)
        if (window.FeatureFlags && !window.FeatureFlags.isEnabled('salaries')) {
            return 0;
        }

        if (!config) {
            // Usa config cached se disponibile
            config = this._configCache || this.DEFAULT_CONFIG;
        }

        const debt = teamData?.salaryDebt || 0;
        if (debt <= 0) return 0;

        // Malus fisso se in debito
        return config.debtPenaltyModifier || -1.5;
    },

    /**
     * Versione async di getDebtPenalty (carica config)
     */
    async getDebtPenaltyAsync(teamData) {
        const config = await this.loadConfig();
        return this.getDebtPenalty(teamData, config);
    },

    // ========== VENDITA FORZATA ==========

    /**
     * Calcola il valore di vendita di un giocatore
     * Formula: (livello x 5) + (abilita.length x 10)
     */
    calculatePlayerValue(player) {
        if (!player) return 0;

        const level = player.level || 1;
        const abilities = player.abilities || [];
        const positiveAbilities = abilities.filter(a => !a.startsWith('-')).length;

        return (level * 5) + (positiveAbilities * 10);
    },

    /**
     * Vende forzatamente il giocatore piu costoso per coprire il debito
     * Non vende l'Icona (capitano)
     */
    async forcePlayerSale(teamId, teamData, debt) {
        const config = await this.loadConfig();
        const players = teamData?.players || [];

        // Trova giocatori vendibili (esclusa Icona)
        const sellablePlayers = players.filter(p =>
            !p.abilities?.includes('Icona') && !p.isCaptain
        );

        if (sellablePlayers.length === 0) {
            console.log(`[Stipendi] ${teamData.teamName}: nessun giocatore vendibile`);
            return null;
        }

        // Ordina per stipendio decrescente (vendi il piu costoso)
        sellablePlayers.sort((a, b) => {
            const salaryA = this.calculatePlayerSalary(a, config);
            const salaryB = this.calculatePlayerSalary(b, config);
            return salaryB - salaryA;
        });

        const playerToSell = sellablePlayers[0];
        const saleValue = this.calculatePlayerValue(playerToSell);

        // Rimuovi giocatore e accredita valore
        const updatedPlayers = players.filter(p => p.id !== playerToSell.id);
        const newBudget = (teamData.budget || 0) + saleValue;
        const newDebt = Math.max(0, debt - saleValue);
        const newDebtMatchdays = newDebt > 0 ? (teamData.debtMatchdays || 0) : 0;

        try {
            const { doc, updateDoc, appId } = window.firestoreTools;
            const db = window.db;
            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);

            await updateDoc(teamRef, {
                players: updatedPlayers,
                budget: newBudget,
                salaryDebt: newDebt,
                debtMatchdays: newDebtMatchdays
            });

            console.log(`[Stipendi] VENDITA FORZATA: ${playerToSell.name} venduto per ${saleValue} CS (debito rimasto: ${newDebt})`);

            // Notifica se disponibile
            if (window.Toast) {
                window.Toast.warning(`Vendita forzata: ${playerToSell.name} venduto per ${saleValue} CS`);
            }

            return {
                success: true,
                player: playerToSell,
                saleValue,
                remainingDebt: newDebt,
                newBudget
            };

        } catch (error) {
            console.error(`[Stipendi] Errore vendita forzata:`, error);
            return { success: false, error: error.message };
        }
    },

    // ========== UTILITY ==========

    /**
     * Ripaga il debito con i crediti disponibili
     */
    async payDebt(teamId, teamData, amount) {
        const currentBudget = teamData?.budget || 0;
        const currentDebt = teamData?.salaryDebt || 0;

        if (currentDebt <= 0) {
            return { success: true, message: 'Nessun debito da ripagare' };
        }

        const amountToPay = Math.min(amount || currentDebt, currentBudget, currentDebt);

        if (amountToPay <= 0) {
            return { success: false, message: 'Budget insufficiente' };
        }

        try {
            const { doc, updateDoc, appId } = window.firestoreTools;
            const db = window.db;
            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);

            const newBudget = currentBudget - amountToPay;
            const newDebt = currentDebt - amountToPay;

            await updateDoc(teamRef, {
                budget: newBudget,
                salaryDebt: newDebt,
                debtMatchdays: newDebt > 0 ? (teamData.debtMatchdays || 0) : 0
            });

            console.log(`[Stipendi] Debito ripagato: ${amountToPay} CS (rimasto: ${newDebt})`);

            return {
                success: true,
                paid: amountToPay,
                remainingDebt: newDebt,
                newBudget
            };

        } catch (error) {
            console.error('[Stipendi] Errore pagamento debito:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Resetta debito e contatore (uso admin)
     */
    async resetDebt(teamId) {
        try {
            const { doc, updateDoc, appId } = window.firestoreTools;
            const db = window.db;
            const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);

            await updateDoc(teamRef, {
                salaryDebt: 0,
                debtMatchdays: 0
            });

            console.log(`[Stipendi] Debito resettato per team ${teamId}`);
            return { success: true };

        } catch (error) {
            console.error('[Stipendi] Errore reset debito:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Invalida la cache della configurazione
     */
    invalidateCache() {
        this._configCache = null;
        this._configCacheTime = 0;
    }
};

console.log('[Stipendi] Modulo caricato');
