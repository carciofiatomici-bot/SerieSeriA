//
// ====================================================================
// CREDITI-SUPER-SERI.JS - Sistema Valuta Premium per Potenziamenti
// ====================================================================
// Gestisce i Crediti Super Seri (CSS) per potenziare giocatori e icone
//

window.CreditiSuperSeri = {

    // ========================================
    // COSTANTI
    // ========================================

    // Limiti di livello
    MAX_LEVEL_GIOCATORE: 20,
    MAX_LEVEL_ICONA: 25,

    // Costi potenziamento (placeholder - configurabili)
    // Costo per salire AL livello indicato
    COSTI_POTENZIAMENTO: {
        // Livelli 1-5: costo basso
        2: 10, 3: 15, 4: 20, 5: 25,
        // Livelli 6-10: costo medio
        6: 35, 7: 45, 8: 55, 9: 70, 10: 85,
        // Livelli 11-15: costo alto
        11: 100, 12: 120, 13: 140, 14: 165, 15: 190,
        // Livelli 16-20: costo molto alto
        16: 220, 17: 255, 18: 295, 19: 340, 20: 400,
        // Livelli 21-25 (solo Icone): costo premium
        21: 500, 22: 600, 23: 750, 24: 900, 25: 1100
    },

    // Costo base per assegnare un'abilità
    COSTO_ABILITA_BASE: 150,

    // Moltiplicatore per rarità abilità
    MOLTIPLICATORE_RARITA: {
        'Comune': 0.5,
        'Rara': 1.0,
        'Epica': 1.5,
        'Leggendaria': 2.5
    },

    // Premi per vittorie (predisposizione)
    PREMI: {
        CAMPIONATO: 500,
        COPPA: 300,      // Futuro
        SUPERCOPPA: 200  // Futuro
    },

    // ========================================
    // METODI DI CONFIGURAZIONE
    // ========================================

    /**
     * Verifica se il sistema CSS è abilitato
     * @returns {Promise<boolean>}
     */
    async isEnabled() {
        // Prima controlla il FeatureFlags se disponibile
        if (window.FeatureFlags) {
            return window.FeatureFlags.isEnabled('creditiSuperSeri');
        }

        // Fallback al vecchio sistema
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const CONFIG_PATH = `artifacts/${appId}/public/data/config`;

            const configDocRef = doc(db, CONFIG_PATH, 'settings');
            const configDoc = await getDoc(configDocRef);

            if (configDoc.exists()) {
                return configDoc.data().creditiSuperSeriEnabled || false;
            }
            return false;
        } catch (error) {
            console.error('Errore verifica stato CSS:', error);
            return false;
        }
    },

    /**
     * Abilita/Disabilita il sistema CSS (solo Admin)
     * @param {boolean} enabled
     * @returns {Promise<boolean>}
     */
    async setEnabled(enabled) {
        try {
            // Usa FeatureFlags se disponibile
            if (window.FeatureFlags) {
                if (enabled) {
                    await window.FeatureFlags.enable('creditiSuperSeri');
                } else {
                    await window.FeatureFlags.disable('creditiSuperSeri');
                }
                console.log(`Sistema Crediti Super Seri ${enabled ? 'ABILITATO' : 'DISABILITATO'} (via FeatureFlags)`);
                return true;
            }

            // Fallback al vecchio sistema
            const { doc, setDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const CONFIG_PATH = `artifacts/${appId}/public/data/config`;

            const configDocRef = doc(db, CONFIG_PATH, 'settings');
            await setDoc(configDocRef, {
                creditiSuperSeriEnabled: enabled
            }, { merge: true });

            console.log(`Sistema Crediti Super Seri ${enabled ? 'ABILITATO' : 'DISABILITATO'}`);
            return true;
        } catch (error) {
            console.error('Errore toggle CSS:', error);
            return false;
        }
    },

    // ========================================
    // METODI SALDO
    // ========================================

    /**
     * Ottiene il saldo CSS di una squadra
     * @param {string} teamId
     * @returns {Promise<number>}
     */
    async getSaldo(teamId) {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

            const teamDocRef = doc(db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (teamDoc.exists()) {
                return teamDoc.data().creditiSuperSeri || 0;
            }
            return 0;
        } catch (error) {
            console.error('Errore lettura saldo CSS:', error);
            return 0;
        }
    },

    /**
     * Aggiunge CSS a una squadra
     * @param {string} teamId
     * @param {number} amount
     * @param {string} motivo - Descrizione del motivo
     * @returns {Promise<{success: boolean, nuovoSaldo: number, error?: string}>}
     */
    async aggiungiCrediti(teamId, amount, motivo = '') {
        try {
            const { doc, updateDoc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

            const teamDocRef = doc(db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                return { success: false, nuovoSaldo: 0, error: 'Squadra non trovata' };
            }

            const currentSaldo = teamDoc.data().creditiSuperSeri || 0;
            const nuovoSaldo = currentSaldo + amount;

            await updateDoc(teamDocRef, {
                creditiSuperSeri: nuovoSaldo
            });

            console.log(`CSS +${amount} a ${teamId}. Motivo: ${motivo}. Nuovo saldo: ${nuovoSaldo}`);

            return { success: true, nuovoSaldo };
        } catch (error) {
            console.error('Errore aggiunta CSS:', error);
            return { success: false, nuovoSaldo: 0, error: error.message };
        }
    },

    /**
     * Sottrae CSS da una squadra
     * @param {string} teamId
     * @param {number} amount
     * @param {string} motivo
     * @returns {Promise<{success: boolean, nuovoSaldo: number, error?: string}>}
     */
    async sottraiCrediti(teamId, amount, motivo = '') {
        try {
            const { doc, updateDoc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

            const teamDocRef = doc(db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                return { success: false, nuovoSaldo: 0, error: 'Squadra non trovata' };
            }

            const currentSaldo = teamDoc.data().creditiSuperSeri || 0;

            if (currentSaldo < amount) {
                return {
                    success: false,
                    nuovoSaldo: currentSaldo,
                    error: `Saldo insufficiente. Hai ${currentSaldo} CSS, servono ${amount} CSS`
                };
            }

            const nuovoSaldo = currentSaldo - amount;

            await updateDoc(teamDocRef, {
                creditiSuperSeri: nuovoSaldo
            });

            console.log(`CSS -${amount} da ${teamId}. Motivo: ${motivo}. Nuovo saldo: ${nuovoSaldo}`);

            return { success: true, nuovoSaldo };
        } catch (error) {
            console.error('Errore sottrazione CSS:', error);
            return { success: false, nuovoSaldo: 0, error: error.message };
        }
    },

    // ========================================
    // METODI POTENZIAMENTO
    // ========================================

    /**
     * Calcola il costo per potenziare un giocatore dal livello attuale al prossimo
     * @param {number} livelloAttuale
     * @param {boolean} isIcona
     * @returns {number|null} - null se non può essere potenziato
     */
    getCostoPotenziamento(livelloAttuale, isIcona = false) {
        const maxLevel = isIcona ? this.MAX_LEVEL_ICONA : this.MAX_LEVEL_GIOCATORE;

        if (livelloAttuale >= maxLevel) {
            return null; // Già al massimo
        }

        const prossimoLivello = livelloAttuale + 1;
        return this.COSTI_POTENZIAMENTO[prossimoLivello] || null;
    },

    /**
     * Calcola il costo totale per potenziare da un livello a un altro
     * @param {number} livelloDa
     * @param {number} livelloA
     * @param {boolean} isIcona
     * @returns {number}
     */
    getCostoPotenziamentoTotale(livelloDa, livelloA, isIcona = false) {
        const maxLevel = isIcona ? this.MAX_LEVEL_ICONA : this.MAX_LEVEL_GIOCATORE;

        if (livelloA > maxLevel) livelloA = maxLevel;
        if (livelloDa >= livelloA) return 0;

        let costoTotale = 0;
        for (let lv = livelloDa + 1; lv <= livelloA; lv++) {
            costoTotale += this.COSTI_POTENZIAMENTO[lv] || 0;
        }
        return costoTotale;
    },

    /**
     * Potenzia un giocatore di 1 livello
     * @param {string} teamId
     * @param {string} playerId
     * @returns {Promise<{success: boolean, nuovoLivello?: number, nuovoSaldo?: number, error?: string}>}
     */
    async potenziaGiocatore(teamId, playerId) {
        try {
            // Verifica che il sistema sia abilitato
            const enabled = await this.isEnabled();
            if (!enabled) {
                return { success: false, error: 'Sistema Crediti Super Seri non attivo' };
            }

            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

            // Carica dati squadra
            const teamDocRef = doc(db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                return { success: false, error: 'Squadra non trovata' };
            }

            const teamData = teamDoc.data();
            const rosa = teamData.rosa || [];

            // Trova il giocatore
            const playerIndex = rosa.findIndex(p => p.id === playerId);
            if (playerIndex === -1) {
                return { success: false, error: 'Giocatore non trovato nella rosa' };
            }

            const player = rosa[playerIndex];
            const isIcona = player.abilities && player.abilities.includes('Icona');
            const livelloAttuale = player.currentLevel || player.level || 1;
            const maxLevel = isIcona ? this.MAX_LEVEL_ICONA : this.MAX_LEVEL_GIOCATORE;

            // Verifica livello massimo
            if (livelloAttuale >= maxLevel) {
                return {
                    success: false,
                    error: `${player.name} ha già raggiunto il livello massimo (${maxLevel})`
                };
            }

            // Calcola costo
            const costo = this.getCostoPotenziamento(livelloAttuale, isIcona);
            if (!costo) {
                return { success: false, error: 'Impossibile calcolare il costo di potenziamento' };
            }

            // Verifica saldo
            const saldoAttuale = teamData.creditiSuperSeri || 0;
            if (saldoAttuale < costo) {
                return {
                    success: false,
                    error: `Crediti insufficienti. Hai ${saldoAttuale} CSS, servono ${costo} CSS`
                };
            }

            // Esegui potenziamento
            const nuovoLivello = livelloAttuale + 1;
            rosa[playerIndex] = {
                ...player,
                currentLevel: nuovoLivello,
                level: nuovoLivello
            };

            const nuovoSaldo = saldoAttuale - costo;

            await updateDoc(teamDocRef, {
                rosa: rosa,
                creditiSuperSeri: nuovoSaldo
            });

            // Aggiorna anche la formazione se il giocatore è titolare
            if (teamData.formation && teamData.formation.titolari) {
                const titolari = teamData.formation.titolari;
                const titolareIndex = titolari.findIndex(t => t.id === playerId);
                if (titolareIndex !== -1) {
                    titolari[titolareIndex] = {
                        ...titolari[titolareIndex],
                        currentLevel: nuovoLivello,
                        level: nuovoLivello
                    };
                    await updateDoc(teamDocRef, {
                        'formation.titolari': titolari
                    });
                }
            }

            console.log(`Potenziato ${player.name} da Lv${livelloAttuale} a Lv${nuovoLivello}. Costo: ${costo} CSS`);

            return {
                success: true,
                nuovoLivello,
                nuovoSaldo,
                playerName: player.name
            };

        } catch (error) {
            console.error('Errore potenziamento:', error);
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // METODI ABILITA'
    // ========================================

    /**
     * Calcola il costo per assegnare un'abilità
     * @param {string} abilityName
     * @returns {number}
     */
    getCostoAbilita(abilityName) {
        if (!window.AbilitiesEncyclopedia) return this.COSTO_ABILITA_BASE;

        const ability = window.AbilitiesEncyclopedia.getAbility(abilityName);
        if (!ability) return this.COSTO_ABILITA_BASE;

        const moltiplicatore = this.MOLTIPLICATORE_RARITA[ability.rarity] || 1.0;
        return Math.round(this.COSTO_ABILITA_BASE * moltiplicatore);
    },

    /**
     * Ottiene le abilità disponibili per un ruolo (escludendo quelle già possedute)
     * @param {string} role
     * @param {Array<string>} currentAbilities
     * @returns {Array<Object>}
     */
    getAbilitaDisponibili(role, currentAbilities = []) {
        if (!window.AbilitiesEncyclopedia) return [];

        const tutteAbilita = window.AbilitiesEncyclopedia.getAbilitiesByRole(role);

        // Filtra le abilità già possedute e quelle non assegnabili (Icona)
        return tutteAbilita.filter(a => {
            // Non può assegnare Icona tramite CSS
            if (a.name === 'Icona') return false;
            // Non può assegnare abilità già possedute
            if (currentAbilities.includes(a.name)) return false;
            return true;
        }).map(a => ({
            ...a,
            costo: this.getCostoAbilita(a.name)
        }));
    },

    /**
     * Assegna un'abilità a un giocatore
     * @param {string} teamId
     * @param {string} playerId
     * @param {string} abilityName
     * @returns {Promise<{success: boolean, nuovoSaldo?: number, error?: string}>}
     */
    async assegnaAbilita(teamId, playerId, abilityName) {
        try {
            // Verifica che il sistema sia abilitato
            const enabled = await this.isEnabled();
            if (!enabled) {
                return { success: false, error: 'Sistema Crediti Super Seri non attivo' };
            }

            // Non può assegnare l'abilità Icona
            if (abilityName === 'Icona') {
                return { success: false, error: 'L\'abilità Icona non può essere assegnata' };
            }

            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

            // Carica dati squadra
            const teamDocRef = doc(db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                return { success: false, error: 'Squadra non trovata' };
            }

            const teamData = teamDoc.data();
            const rosa = teamData.rosa || [];

            // Trova il giocatore
            const playerIndex = rosa.findIndex(p => p.id === playerId);
            if (playerIndex === -1) {
                return { success: false, error: 'Giocatore non trovato nella rosa' };
            }

            const player = rosa[playerIndex];
            const currentAbilities = player.abilities || [];

            // Verifica che il giocatore non abbia già questa abilità
            if (currentAbilities.includes(abilityName)) {
                return { success: false, error: `${player.name} possiede già l'abilità "${abilityName}"` };
            }

            // Verifica limite abilità (max 3, escluso Icona)
            const abilitiesCount = currentAbilities.filter(a => a !== 'Icona').length;
            if (abilitiesCount >= 3) {
                return { success: false, error: `${player.name} ha già il massimo di 3 abilità` };
            }

            // Verifica che l'abilità sia valida per il ruolo
            if (window.AbilitiesEncyclopedia) {
                const ability = window.AbilitiesEncyclopedia.getAbility(abilityName);
                if (!ability) {
                    return { success: false, error: `Abilità "${abilityName}" non trovata` };
                }
                if (ability.role !== player.role && ability.role !== 'Tutti') {
                    return { success: false, error: `L'abilità "${abilityName}" non è compatibile con il ruolo ${player.role}` };
                }
            }

            // Calcola costo
            const costo = this.getCostoAbilita(abilityName);

            // Verifica saldo
            const saldoAttuale = teamData.creditiSuperSeri || 0;
            if (saldoAttuale < costo) {
                return {
                    success: false,
                    error: `Crediti insufficienti. Hai ${saldoAttuale} CSS, servono ${costo} CSS`
                };
            }

            // Esegui assegnazione
            const nuoveAbilita = [...currentAbilities, abilityName];
            rosa[playerIndex] = {
                ...player,
                abilities: nuoveAbilita
            };

            const nuovoSaldo = saldoAttuale - costo;

            await updateDoc(teamDocRef, {
                rosa: rosa,
                creditiSuperSeri: nuovoSaldo
            });

            // Aggiorna anche la formazione se il giocatore è titolare
            if (teamData.formation && teamData.formation.titolari) {
                const titolari = teamData.formation.titolari;
                const titolareIndex = titolari.findIndex(t => t.id === playerId);
                if (titolareIndex !== -1) {
                    titolari[titolareIndex] = {
                        ...titolari[titolareIndex],
                        abilities: nuoveAbilita
                    };
                    await updateDoc(teamDocRef, {
                        'formation.titolari': titolari
                    });
                }
            }

            console.log(`Assegnata abilità "${abilityName}" a ${player.name}. Costo: ${costo} CSS`);

            return {
                success: true,
                nuovoSaldo,
                playerName: player.name,
                abilityName
            };

        } catch (error) {
            console.error('Errore assegnazione abilità:', error);
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // METODI PREMI
    // ========================================

    /**
     * Assegna il premio per la vittoria del campionato
     * @param {string} teamId
     * @returns {Promise<{success: boolean, premio?: number, error?: string}>}
     */
    async premiaCampione(teamId) {
        const enabled = await this.isEnabled();
        if (!enabled) {
            console.log('Sistema CSS disabilitato, premio campionato non assegnato');
            return { success: false, error: 'Sistema CSS non attivo' };
        }

        const premio = this.PREMI.CAMPIONATO;
        const result = await this.aggiungiCrediti(teamId, premio, 'Vittoria Campionato');

        if (result.success) {
            return { success: true, premio, nuovoSaldo: result.nuovoSaldo };
        }
        return { success: false, error: result.error };
    },

    /**
     * Assegna il premio per la vittoria della coppa (futuro)
     * @param {string} teamId
     * @returns {Promise<{success: boolean, premio?: number, error?: string}>}
     */
    async premiaCoppa(teamId) {
        const enabled = await this.isEnabled();
        if (!enabled) {
            return { success: false, error: 'Sistema CSS non attivo' };
        }

        const premio = this.PREMI.COPPA;
        const result = await this.aggiungiCrediti(teamId, premio, 'Vittoria Coppa');

        if (result.success) {
            return { success: true, premio, nuovoSaldo: result.nuovoSaldo };
        }
        return { success: false, error: result.error };
    },

    /**
     * Assegna il premio per la vittoria della supercoppa (futuro)
     * @param {string} teamId
     * @returns {Promise<{success: boolean, premio?: number, error?: string}>}
     */
    async premiaSupercoppa(teamId) {
        const enabled = await this.isEnabled();
        if (!enabled) {
            return { success: false, error: 'Sistema CSS non attivo' };
        }

        const premio = this.PREMI.SUPERCOPPA;
        const result = await this.aggiungiCrediti(teamId, premio, 'Vittoria Supercoppa');

        if (result.success) {
            return { success: true, premio, nuovoSaldo: result.nuovoSaldo };
        }
        return { success: false, error: result.error };
    }
};

console.log('Modulo Crediti Super Seri caricato.');
