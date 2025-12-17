//
// ====================================================================
// CREDITI-SUPER-SERI.JS - Sistema Valuta Premium per Potenziamenti
// ====================================================================
// Gestisce i Crediti Super Seri (CSS) per potenziare giocatori e icone
//

window.CreditiSuperSeri = {

    // ========================================
    // COSTANTI (con fallback a FormulasConfig)
    // ========================================

    // Getter per leggere da FormulasConfig o usare default
    get MAX_LEVEL_GIOCATORE() {
        return window.FormulasConfig?.maxLevelGiocatore || 20;
    },
    get MAX_LEVEL_ICONA() {
        return window.FormulasConfig?.maxLevelIcona || 25;
    },
    get COSTO_BASE_ICONA() {
        return window.FormulasConfig?.costoBaseIcona || 5;
    },

    // Costi abilità per rarità (getter dinamici)
    get COSTO_ABILITA() {
        const config = window.FormulasConfig || {};
        return {
            'Comune': config.costoAbilitaComune || 2,
            'Rara': config.costoAbilitaRara || 4,
            'Epica': config.costoAbilitaEpica || 6,
            'Leggendaria': config.costoAbilitaLeggendaria || 8,
            'Unica': Infinity
        };
    },

    // Numero di abilità negative AUTOMATICHE per rarità (assegnate random)
    ABILITA_NEGATIVE_AUTOMATICHE: {
        'Comune': 0,
        'Rara': 0,
        'Epica': 1,      // +1 negativa random
        'Leggendaria': 2, // +2 negative random
        'Unica': 0
    },

    // Limite abilità per rarità (1 per ogni rarità) - max 4 abilità positive totali
    MAX_ABILITA_PER_RARITA: {
        'Comune': 1,
        'Rara': 1,
        'Epica': 1,
        'Leggendaria': 1
    },

    // Mappatura rarità stringa -> valore numerico per calcolo costi rimozione
    // Formula: 5 + (2 × valore) → Comune: 7, Rara: 8, Epica: 9, Leggendaria: 10
    RARITY_TO_VALUE: {
        'Comune': 1.0,
        'Rara': 1.5,
        'Epica': 2.0,
        'Leggendaria': 2.5,
        'Unica': 5  // Per filtro, non usato nel calcolo costi
    },

    // Abilità consentite per ogni Icona (non possono averne altre)
    // Croccante può avere Regista grazie a "Fatto d'acciaio"
    ICONE_ALLOWED_ABILITIES: {
        'croc': ['Icona', "Fatto d'acciaio", 'Regista'],
        'shik': ['Icona', 'Amici di panchina'],
        'ilcap': ['Icona', 'Calcolo delle probabilita'],
        'simo': ['Icona', 'Parata Efficiente'],
        'dappi': ['Icona'],
        'blatta': ['Icona', 'Scheggia impazzita'],
        'antony': ['Icona', 'Avanti un altro'],
        'gladio': ['Icona', 'Continua a provare'],
        'amedemo': ['Icona', 'Tiro Dritto'],
        'flavio': ['Icona'],
        'luka': ['Icona', 'Contrasto di gomito'],
        'melio': ['Icona', 'Assist-man'],
        'markf': ['Icona', 'Osservatore'],
        'sandro': ['Icona', 'Relax'],
        'fosco': ['Icona', "L'uomo in piu"],
        'cocco': ['Icona', 'Stazionario']
    },

    // Costo servizio sostituzione icona
    COSTO_SOSTITUZIONE_ICONA: 5,

    // Costo servizio sblocco lega privata (rimuove cooldown mensile)
    COSTO_SBLOCCO_LEGA: 1,

    // Conversione CS -> CSS (2000 CS = 1 CSS)
    CS_TO_CSS_RATE: 2000,

    // Conversione CSS -> CS (getter dinamici)
    get CSS_TO_CS_RATE() {
        return window.FormulasConfig?.cssToCsRate || 1000;
    },
    get COSTO_CONVERSIONE_CS() {
        return window.FormulasConfig?.costoConversione || 1;
    },

    // Premi per vittorie (getter dinamici da RewardsConfig)
    get PREMI() {
        return {
            CAMPIONATO: window.RewardsConfig?.rewardCampionatoCSS || 1,
            COPPA: window.RewardsConfig?.rewardCoppaCSS || 1,
            SUPERCOPPA: window.RewardsConfig?.rewardSupercoppaCSS || 1
        };
    },

    // Costi rimozione abilità (getter dinamici)
    get COSTO_BASE_RIMOZIONE_POSITIVA() {
        return window.FormulasConfig?.costoBaseRimozionePositiva || 5;
    },
    get MOLTIPLICATORE_RARITA_RIMOZIONE() {
        return window.FormulasConfig?.moltiplicatoreRaritaRimozione || 2;
    },
    get COSTO_BASE_RIMOZIONE_NEGATIVA() {
        return window.FormulasConfig?.costoBaseRimozioneNegativa || 5;
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

            // Invia notifica all'utente se e' lui a ricevere i crediti
            const currentTeamId = window.InterfacciaCore?.currentTeamId;
            if (currentTeamId === teamId && window.Notifications?.notify?.creditsReceived) {
                window.Notifications.notify.creditsReceived(amount, motivo);
            }

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
     * Giocatori normali: costo = livello raggiunto (es: 5→6 costa 6 CSS)
     * Icone: costo = 5 + livello attuale (es: lv 12 costa 17 CSS)
     * @param {number} livelloAttuale
     * @param {boolean} isIcona
     * @returns {number|null} - null se non può essere potenziato
     */
    getCostoPotenziamento(livelloAttuale, isIcona = false) {
        const maxLevel = isIcona ? this.MAX_LEVEL_ICONA : this.MAX_LEVEL_GIOCATORE;

        if (livelloAttuale >= maxLevel) {
            return null; // Già al massimo
        }

        if (isIcona) {
            // Icone: costo = 5 + livello attuale
            return this.COSTO_BASE_ICONA + livelloAttuale;
        } else {
            // Giocatori normali: costo = livello raggiunto
            return livelloAttuale + 1;
        }
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
        for (let lv = livelloDa; lv < livelloA; lv++) {
            costoTotale += this.getCostoPotenziamento(lv, isIcona) || 0;
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
            const players = teamData.players || [];

            // Trova il giocatore
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex === -1) {
                return { success: false, error: 'Giocatore non trovato nella rosa' };
            }

            const player = players[playerIndex];
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
            players[playerIndex] = {
                ...player,
                currentLevel: nuovoLivello,
                level: nuovoLivello
            };

            const nuovoSaldo = saldoAttuale - costo;

            await updateDoc(teamDocRef, {
                players: players,
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
     * Calcola il costo per assegnare un'abilità (costo fisso per rarità)
     * @param {string} abilityName
     * @returns {number}
     */
    getCostoAbilita(abilityName) {
        if (!window.AbilitiesEncyclopedia) return this.COSTO_ABILITA['Comune'];

        const ability = window.AbilitiesEncyclopedia.getAbility(abilityName);
        if (!ability) return this.COSTO_ABILITA['Comune'];

        return this.COSTO_ABILITA[ability.rarity] || this.COSTO_ABILITA['Comune'];
    },

    /**
     * Ottiene il numero di abilità negative automatiche per una rarità
     * @param {string} rarity
     * @returns {number}
     */
    getAbilitaNegativeAutomatiche(rarity) {
        return this.ABILITA_NEGATIVE_AUTOMATICHE[rarity] || 0;
    },

    /**
     * Conta quante abilità di ogni rarità ha un giocatore
     * @param {Array<string>} abilities - Lista abilità del giocatore
     * @returns {Object} - {Comune: n, Rara: n, Epica: n, Leggendaria: n}
     */
    contaAbilitaPerRarita(abilities) {
        const count = { 'Comune': 0, 'Rara': 0, 'Epica': 0, 'Leggendaria': 0 };
        if (!abilities || !window.AbilitiesEncyclopedia) return count;

        for (const abilityName of abilities) {
            const ability = window.AbilitiesEncyclopedia.getAbility(abilityName);
            if (ability && ability.type !== 'Negativa' && count[ability.rarity] !== undefined) {
                count[ability.rarity]++;
            }
        }
        return count;
    },

    /**
     * Verifica se un giocatore può acquisire un'abilità di una certa rarità
     * @param {Array<string>} currentAbilities
     * @param {string} rarity
     * @returns {boolean}
     */
    puoAcquisireRarita(currentAbilities, rarity) {
        const count = this.contaAbilitaPerRarita(currentAbilities);
        const max = this.MAX_ABILITA_PER_RARITA[rarity] || 1;
        return count[rarity] < max;
    },

    /**
     * Seleziona abilità negative random compatibili con il ruolo
     * @param {string} role - Ruolo del giocatore
     * @param {Array<string>} currentAbilities - Abilità già possedute
     * @param {number} count - Numero di negative da selezionare
     * @returns {Array<string>} - Abilità negative selezionate
     */
    selezionaAbilitaNegativeRandom(role, currentAbilities, count) {
        if (count <= 0) return [];

        // Ottieni abilità negative disponibili per il ruolo
        const roleAbilities = window.DraftConstants?.ROLE_ABILITIES_MAP?.[role];
        if (!roleAbilities || !roleAbilities.negative) return [];

        // Filtra quelle già possedute
        const disponibili = roleAbilities.negative.filter(a => !currentAbilities.includes(a));

        // Mischia e prendi le prime 'count'
        const shuffled = [...disponibili].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    },

    /**
     * Verifica se un'abilità può essere acquistata
     * @param {string} abilityName
     * @returns {boolean}
     */
    canPurchaseAbility(abilityName) {
        if (abilityName === 'Icona') return false;

        if (!window.AbilitiesEncyclopedia) return true;

        const ability = window.AbilitiesEncyclopedia.getAbility(abilityName);
        if (!ability) return false;

        // Le abilità Uniche non possono essere acquistate
        return ability.rarity !== 'Unica';
    },

    /**
     * Verifica se un giocatore è un'Icona
     * @param {Object} player
     * @returns {boolean}
     */
    isIcona(player) {
        return player?.abilities?.includes('Icona') || player?.isCaptain === true;
    },

    /**
     * Ottiene le abilità consentite per un'Icona specifica
     * @param {string} iconaId - ID dell'icona (es: 'croc', 'shik')
     * @returns {Array<string>}
     */
    getAbilitaConsentiteIcona(iconaId) {
        return this.ICONE_ALLOWED_ABILITIES[iconaId] || ['Icona'];
    },

    /**
     * Verifica se un'abilità è consentita per un'Icona
     * @param {string} iconaId
     * @param {string} abilityName
     * @returns {boolean}
     */
    isAbilitaConsentitaPerIcona(iconaId, abilityName) {
        const consentite = this.getAbilitaConsentiteIcona(iconaId);
        return consentite.includes(abilityName);
    },

    /**
     * Ottiene le abilità che un'Icona può ancora acquisire
     * @param {string} iconaId
     * @param {Array<string>} currentAbilities
     * @returns {Array<string>}
     */
    getAbilitaDisponibiliPerIcona(iconaId, currentAbilities = []) {
        const consentite = this.getAbilitaConsentiteIcona(iconaId);
        return consentite.filter(a => !currentAbilities.includes(a));
    },

    /**
     * Ottiene le abilità disponibili per un ruolo (escludendo quelle già possedute e oltre il limite)
     * Per le Icone, restituisce solo le abilità consentite dalla loro passiva unica
     * @param {string} role
     * @param {Array<string>} currentAbilities
     * @param {boolean} onlyNegative - Se true, restituisce solo abilità negative
     * @param {string|null} iconaId - ID dell'icona (se è un'Icona)
     * @returns {Array<Object>}
     */
    getAbilitaDisponibili(role, currentAbilities = [], onlyNegative = false, iconaId = null) {
        if (!window.AbilitiesEncyclopedia) return [];

        // Se è un'Icona, restituisce solo le abilità consentite non ancora possedute
        if (iconaId && this.ICONE_ALLOWED_ABILITIES[iconaId]) {
            const consentite = this.getAbilitaConsentiteIcona(iconaId);
            const disponibili = consentite.filter(a =>
                !currentAbilities.includes(a) && a !== 'Icona'
            );

            // Per le Icone, non ci sono abilità negative e non serve il costo (già hanno le loro)
            // Solo Croccante può acquisire Regista (costo 4 CSS - Rara)
            return disponibili.map(abilityName => {
                const ability = window.AbilitiesEncyclopedia.getAbility(abilityName);
                return {
                    name: abilityName,
                    rarity: ability?.rarity || 'Rara',
                    type: ability?.type || 'Positiva',
                    icon: ability?.icon || '',
                    description: ability?.description || '',
                    costo: this.getCostoAbilita(abilityName),
                    negativeAutomatiche: 0 // Icone non prendono negative automatiche
                };
            });
        }

        const tutteAbilita = window.AbilitiesEncyclopedia.getAbilitiesByRole(role);

        // Conta abilità per rarità già possedute
        const countPerRarita = this.contaAbilitaPerRarita(currentAbilities);

        // Filtra le abilità
        return tutteAbilita.filter(a => {
            // Non può assegnare Icona tramite CSS
            if (a.name === 'Icona') return false;
            // Non può assegnare abilità Uniche
            if (a.rarity === 'Unica') return false;
            // Non può assegnare abilità già possedute
            if (currentAbilities.includes(a.name)) return false;
            // Se richieste solo negative, filtra
            if (onlyNegative && a.type !== 'Negativa') return false;
            // Se non richieste negative, escludi le negative dalla lista principale
            if (!onlyNegative && a.type === 'Negativa') return false;
            // Verifica limite per rarità (1 per ogni rarità = max 4 positive)
            if (!onlyNegative && this.MAX_ABILITA_PER_RARITA[a.rarity]) {
                if (countPerRarita[a.rarity] >= this.MAX_ABILITA_PER_RARITA[a.rarity]) {
                    return false;
                }
            }
            return true;
        }).map(a => ({
            ...a,
            costo: this.getCostoAbilita(a.name),
            negativeAutomatiche: this.getAbilitaNegativeAutomatiche(a.rarity)
        }));
    },

    /**
     * Ottiene le abilità negative disponibili per un ruolo
     * @param {string} role
     * @param {Array<string>} currentAbilities
     * @returns {Array<Object>}
     */
    getAbilitaNegativeDisponibili(role, currentAbilities = []) {
        return this.getAbilitaDisponibili(role, currentAbilities, true);
    },

    // ========================================
    // METODI RIMOZIONE ABILITA'
    // ========================================

    /**
     * Calcola il costo per rimuovere un'abilità positiva
     * Formula: 5 + (2 × rarityValue)
     * - Comune (1.0): 5 + 2 = 7 CSS
     * - Rara (1.5): 5 + 3 = 8 CSS
     * - Epica (2.0): 5 + 4 = 9 CSS
     * - Leggendaria (2.5): 5 + 5 = 10 CSS
     * @param {number} rarityValue - Valore rarità (1, 1.5, 2, 2.5)
     * @returns {number}
     */
    getCostoRimozionePositiva(rarityValue) {
        const base = this.COSTO_BASE_RIMOZIONE_POSITIVA;
        const moltiplicatore = this.MOLTIPLICATORE_RARITA_RIMOZIONE;
        return Math.round(base + (moltiplicatore * rarityValue));
    },

    /**
     * Calcola il costo per rimuovere un'abilità negativa
     * Formula progressiva: 5 × (n + 1) dove n = numero di negative già rimosse
     * - Prima: 5 × 1 = 5 CSS
     * - Seconda: 5 × 2 = 10 CSS
     * - Terza: 5 × 3 = 15 CSS
     * @param {number} negativeRemovedCount - Numero di negative già rimosse dal giocatore
     * @returns {number}
     */
    getCostoRimozioneNegativa(negativeRemovedCount) {
        const base = this.COSTO_BASE_RIMOZIONE_NEGATIVA;
        return base * (negativeRemovedCount + 1);
    },

    /**
     * Rimuove un'abilità da un giocatore
     * - Non si possono rimuovere Icona o abilità Uniche
     * - Il costo dipende dal tipo (positiva/negativa)
     * - Per le negative, il contatore viene incrementato e persiste su Firestore
     * @param {string} teamId
     * @param {string} playerId
     * @param {string} abilityName
     * @param {boolean} isNegative
     * @returns {Promise<{success: boolean, nuovoSaldo?: number, playerName?: string, error?: string}>}
     */
    async rimuoviAbilita(teamId, playerId, abilityName, isNegative = false) {
        try {
            // Verifica che il sistema sia abilitato
            const enabled = await this.isEnabled();
            if (!enabled) {
                return { success: false, error: 'Sistema Crediti Super Seri non attivo' };
            }

            // Non può rimuovere l'abilità Icona
            if (abilityName === 'Icona') {
                return { success: false, error: 'L\'abilità Icona non può essere rimossa' };
            }

            // Verifica che non sia un'abilità Unica
            if (window.AbilitiesEncyclopedia) {
                const ability = window.AbilitiesEncyclopedia.getAbility(abilityName);
                if (ability && ability.rarity === 'Unica') {
                    return { success: false, error: 'Le abilità Uniche non possono essere rimosse' };
                }
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
            const players = teamData.players || [];

            // Trova il giocatore
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex === -1) {
                return { success: false, error: 'Giocatore non trovato nella rosa' };
            }

            const player = players[playerIndex];
            const currentAbilities = player.abilities || [];

            // Verifica che il giocatore abbia questa abilità
            if (!currentAbilities.includes(abilityName)) {
                return { success: false, error: `${player.name} non possiede l'abilità "${abilityName}"` };
            }

            // Le Icone non possono rimuovere le loro abilità fisse
            if (this.isIcona(player)) {
                const iconaId = player.id || player.iconaId;
                const consentite = this.getAbilitaConsentiteIcona(iconaId);
                if (consentite.includes(abilityName)) {
                    return { success: false, error: 'Le Icone non possono rimuovere le loro abilità fisse' };
                }
            }

            // Calcola costo rimozione
            let costo;
            const negativeRemovedCount = player.negativeRemovedCount || 0;

            if (isNegative) {
                costo = this.getCostoRimozioneNegativa(negativeRemovedCount);
            } else {
                // Per le positive, usa il valore rarità dell'abilità
                const abilityData = window.AbilitiesEncyclopedia?.getAbility(abilityName);
                const rarityValue = this.RARITY_TO_VALUE[abilityData?.rarity] || 1;
                costo = this.getCostoRimozionePositiva(rarityValue);
            }

            // Verifica saldo
            const saldoAttuale = teamData.creditiSuperSeri || 0;
            if (saldoAttuale < costo) {
                return {
                    success: false,
                    error: `Crediti insufficienti. Hai ${saldoAttuale} CSS, servono ${costo} CSS`
                };
            }

            // Esegui rimozione
            const nuoveAbilita = currentAbilities.filter(a => a !== abilityName);
            const nuovoSaldo = saldoAttuale - costo;

            // Prepara update
            const updateData = {
                creditiSuperSeri: nuovoSaldo
            };

            // Se è negativa, incrementa il contatore
            players[playerIndex] = {
                ...player,
                abilities: nuoveAbilita
            };

            if (isNegative) {
                players[playerIndex].negativeRemovedCount = negativeRemovedCount + 1;
            }

            updateData.players = players;

            await updateDoc(teamDocRef, updateData);

            // Aggiorna anche la formazione se il giocatore è titolare
            if (teamData.formation && teamData.formation.titolari) {
                const titolari = teamData.formation.titolari;
                const titolareIndex = titolari.findIndex(t => t.id === playerId);
                if (titolareIndex !== -1) {
                    titolari[titolareIndex] = {
                        ...titolari[titolareIndex],
                        abilities: nuoveAbilita
                    };
                    if (isNegative) {
                        titolari[titolareIndex].negativeRemovedCount = negativeRemovedCount + 1;
                    }
                    await updateDoc(teamDocRef, {
                        'formation.titolari': titolari
                    });
                }
            }

            const tipoAbilita = isNegative ? 'negativa' : 'positiva';
            console.log(`Rimossa abilità ${tipoAbilita} "${abilityName}" da ${player.name}. Costo: ${costo} CSS`);

            return {
                success: true,
                nuovoSaldo,
                playerName: player.name
            };

        } catch (error) {
            console.error('Errore rimozione abilità:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Assegna un'abilità a un giocatore
     * - Limite: 1 abilità per rarità (1 Comune, 1 Rara, 1 Epica, 1 Leggendaria)
     * - Epica: +1 abilità negativa random automatica
     * - Leggendaria: +2 abilità negative random automatiche
     * @param {string} teamId
     * @param {string} playerId
     * @param {string} abilityName - Abilità positiva da assegnare
     * @returns {Promise<{success: boolean, nuovoSaldo?: number, negativeAssegnate?: Array, error?: string}>}
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

            // Verifica che l'abilità non sia Unica
            if (!this.canPurchaseAbility(abilityName)) {
                return { success: false, error: 'Le abilità Uniche non possono essere acquistate' };
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
            const players = teamData.players || [];

            // Trova il giocatore
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex === -1) {
                return { success: false, error: 'Giocatore non trovato nella rosa' };
            }

            const player = players[playerIndex];
            const currentAbilities = player.abilities || [];

            // Verifica che il giocatore non abbia già questa abilità
            if (currentAbilities.includes(abilityName)) {
                return { success: false, error: `${player.name} possiede già l'abilità "${abilityName}"` };
            }

            // ICONE: Possono avere solo le abilità consentite dalla loro passiva unica
            if (this.isIcona(player)) {
                const iconaId = player.id || player.iconaId;
                if (!this.isAbilitaConsentitaPerIcona(iconaId, abilityName)) {
                    return {
                        success: false,
                        error: `Le Icone possono avere solo le abilità specificate nella loro passiva unica. "${abilityName}" non è consentita per ${player.name}.`
                    };
                }
            }

            // Verifica che l'abilità sia valida per il ruolo
            let ability = null;
            if (window.AbilitiesEncyclopedia) {
                ability = window.AbilitiesEncyclopedia.getAbility(abilityName);
                if (!ability) {
                    return { success: false, error: `Abilità "${abilityName}" non trovata` };
                }
                // Verifica compatibilità ruolo (considera anche role='Multi' con array roles)
                const isCompatible = ability.role === player.role ||
                                    ability.role === 'Tutti' ||
                                    (ability.role === 'Multi' && ability.roles && ability.roles.includes(player.role));
                if (!isCompatible) {
                    return { success: false, error: `L'abilità "${abilityName}" non è compatibile con il ruolo ${player.role}` };
                }

                // Verifica limite 1 abilità per rarità (solo per giocatori normali, non Icone)
                if (!this.isIcona(player) && !this.puoAcquisireRarita(currentAbilities, ability.rarity)) {
                    return {
                        success: false,
                        error: `${player.name} ha già un'abilità ${ability.rarity}. Limite: 1 per rarità`
                    };
                }
            }

            // Seleziona automaticamente abilità negative random se necessario (solo per giocatori normali)
            let negativeAbilities = [];
            if (!this.isIcona(player)) {
                const negativeCount = ability ? this.getAbilitaNegativeAutomatiche(ability.rarity) : 0;
                negativeAbilities = this.selezionaAbilitaNegativeRandom(player.role, currentAbilities, negativeCount);

                // Verifica che ci siano abbastanza negative disponibili
                if (negativeCount > 0 && negativeAbilities.length < negativeCount) {
                    return {
                        success: false,
                        error: `Non ci sono abbastanza abilità negative disponibili per il ruolo ${player.role}`
                    };
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

            // Esegui assegnazione (abilità positiva + negative automatiche)
            const nuoveAbilita = [...currentAbilities, abilityName, ...negativeAbilities];
            players[playerIndex] = {
                ...player,
                abilities: nuoveAbilita
            };

            const nuovoSaldo = saldoAttuale - costo;

            await updateDoc(teamDocRef, {
                players: players,
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

            let logMsg = `Assegnata abilità "${abilityName}" a ${player.name}. Costo: ${costo} CSS`;
            if (negativeAbilities.length > 0) {
                logMsg += `. Negative automatiche: ${negativeAbilities.join(', ')}`;
            }
            console.log(logMsg);

            return {
                success: true,
                nuovoSaldo,
                playerName: player.name,
                abilityName,
                negativeAssegnate: negativeAbilities
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
    },

    // ========================================
    // METODI SERVIZI
    // ========================================

    /**
     * Acquista CS (Crediti Seri) con CSS
     * @param {string} teamId
     * @returns {Promise<{success: boolean, csOttenuti?: number, nuovoSaldoCSS?: number, nuovoBudget?: number, error?: string}>}
     */
    async acquistaCS(teamId) {
        try {
            const enabled = await this.isEnabled();
            if (!enabled) {
                return { success: false, error: 'Sistema CSS non attivo' };
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
            const saldoCSS = teamData.creditiSuperSeri || 0;
            const budgetAttuale = teamData.budget || 0;

            // Verifica saldo CSS
            if (saldoCSS < this.COSTO_CONVERSIONE_CS) {
                return {
                    success: false,
                    error: `Crediti insufficienti. Hai ${saldoCSS} CSS, servono ${this.COSTO_CONVERSIONE_CS} CSS`
                };
            }

            // Esegui conversione
            const nuovoSaldoCSS = saldoCSS - this.COSTO_CONVERSIONE_CS;
            const nuovoBudget = budgetAttuale + this.CSS_TO_CS_RATE;

            await updateDoc(teamDocRef, {
                creditiSuperSeri: nuovoSaldoCSS,
                budget: nuovoBudget
            });

            console.log(`Acquistati ${this.CSS_TO_CS_RATE} CS per ${this.COSTO_CONVERSIONE_CS} CSS. Nuovo saldo: ${nuovoSaldoCSS} CSS, Budget: ${nuovoBudget} CS`);

            return {
                success: true,
                csOttenuti: this.CSS_TO_CS_RATE,
                nuovoSaldoCSS,
                nuovoBudget
            };

        } catch (error) {
            console.error('Errore acquisto CS:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Acquista sblocco lega privata (rimuove cooldown mensile)
     * @param {string} teamId
     * @returns {Promise<{success: boolean, nuovoSaldoCSS?: number, error?: string}>}
     */
    async acquistaSbloccoLega(teamId) {
        try {
            const enabled = await this.isEnabled();
            if (!enabled) {
                return { success: false, error: 'Sistema CSS non attivo' };
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
            const saldoCSS = teamData.creditiSuperSeri || 0;

            // Verifica saldo CSS
            if (saldoCSS < this.COSTO_SBLOCCO_LEGA) {
                return {
                    success: false,
                    error: `Crediti insufficienti. Hai ${saldoCSS} CSS, servono ${this.COSTO_SBLOCCO_LEGA} CSS`
                };
            }

            // Verifica se la squadra e' effettivamente in cooldown
            if (!window.PrivateLeagues) {
                return { success: false, error: 'Sistema Leghe Private non disponibile' };
            }

            const cooldownCheck = await window.PrivateLeagues.isTeamInCooldown(teamId);
            if (!cooldownCheck.inCooldown) {
                return { success: false, error: 'Non sei in cooldown, puoi gia partecipare alle leghe!' };
            }

            // Scala CSS
            const nuovoSaldoCSS = saldoCSS - this.COSTO_SBLOCCO_LEGA;
            await updateDoc(teamDocRef, {
                creditiSuperSeri: nuovoSaldoCSS
            });

            // Rimuovi cooldown
            const clearResult = await window.PrivateLeagues.clearCooldown(teamId);
            if (!clearResult.success) {
                // Rimborsa CSS se fallisce
                await updateDoc(teamDocRef, {
                    creditiSuperSeri: saldoCSS
                });
                return { success: false, error: 'Errore rimozione cooldown: ' + clearResult.error };
            }

            console.log(`Sblocco lega acquistato per ${this.COSTO_SBLOCCO_LEGA} CSS. Nuovo saldo: ${nuovoSaldoCSS} CSS`);

            return {
                success: true,
                nuovoSaldoCSS
            };

        } catch (error) {
            console.error('Errore acquisto sblocco lega:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Converti CS in CSS (2000 CS = 1 CSS)
     * @param {string} teamId
     * @returns {Promise<{success: boolean, cssOttenuti?: number, nuovoSaldoCSS?: number, nuovoBudget?: number, error?: string}>}
     */
    async convertiCSinCSS(teamId) {
        try {
            const enabled = await this.isEnabled();
            if (!enabled) {
                return { success: false, error: 'Sistema CSS non attivo' };
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
            const budgetAttuale = teamData.budget || 0;
            const saldoCSS = teamData.creditiSuperSeri || 0;

            // Verifica budget CS
            if (budgetAttuale < this.CS_TO_CSS_RATE) {
                return {
                    success: false,
                    error: `Crediti insufficienti. Hai ${budgetAttuale} CS, servono ${this.CS_TO_CSS_RATE} CS`
                };
            }

            // Esegui conversione
            const nuovoBudget = budgetAttuale - this.CS_TO_CSS_RATE;
            const nuovoSaldoCSS = saldoCSS + 1;

            await updateDoc(teamDocRef, {
                budget: nuovoBudget,
                creditiSuperSeri: nuovoSaldoCSS
            });

            console.log(`Convertiti ${this.CS_TO_CSS_RATE} CS in 1 CSS. Nuovo saldo: ${nuovoSaldoCSS} CSS, Budget: ${nuovoBudget} CS`);

            return {
                success: true,
                cssOttenuti: 1,
                nuovoSaldoCSS,
                nuovoBudget
            };

        } catch (error) {
            console.error('Errore conversione CS in CSS:', error);
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // METODI PULIZIA ICONE
    // ========================================

    /**
     * Pulisce le abilità non consentite da un'Icona specifica
     * @param {string} teamId
     * @param {string} playerId
     * @returns {Promise<{success: boolean, abilitaRimosse?: Array, error?: string}>}
     */
    async pulisciAbilitaIcona(teamId, playerId) {
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

            const teamDocRef = doc(db, TEAMS_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                return { success: false, error: 'Squadra non trovata' };
            }

            const teamData = teamDoc.data();
            const players = teamData.players || [];

            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex === -1) {
                return { success: false, error: 'Giocatore non trovato' };
            }

            const player = players[playerIndex];

            // Solo per Icone
            if (!this.isIcona(player)) {
                return { success: false, error: 'Il giocatore non è un\'Icona' };
            }

            const iconaId = player.id || player.iconaId;
            const consentite = this.getAbilitaConsentiteIcona(iconaId);
            const currentAbilities = player.abilities || [];

            // Filtra solo le abilità consentite
            const nuoveAbilita = currentAbilities.filter(a => consentite.includes(a));
            const rimosse = currentAbilities.filter(a => !consentite.includes(a));

            if (rimosse.length === 0) {
                return { success: true, abilitaRimosse: [], message: 'Nessuna abilità da rimuovere' };
            }

            players[playerIndex] = {
                ...player,
                abilities: nuoveAbilita
            };

            await updateDoc(teamDocRef, { players: players });

            // Aggiorna anche la formazione
            if (teamData.formation?.titolari) {
                const titolari = teamData.formation.titolari;
                const titolareIndex = titolari.findIndex(t => t.id === playerId);
                if (titolareIndex !== -1) {
                    titolari[titolareIndex] = { ...titolari[titolareIndex], abilities: nuoveAbilita };
                    await updateDoc(teamDocRef, { 'formation.titolari': titolari });
                }
            }

            console.log(`Pulita Icona ${player.name}: rimosse ${rimosse.join(', ')}`);
            return { success: true, abilitaRimosse: rimosse };

        } catch (error) {
            console.error('Errore pulizia Icona:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Pulisce le abilità non consentite da TUTTE le Icone di TUTTI i team (Admin)
     * @returns {Promise<{success: boolean, teamsProcessati: number, iconeProcessate: number, abilitaRimosse: number}>}
     */
    async pulisciTutteIcone() {
        try {
            const { collection, getDocs, doc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;
            const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

            const teamsSnapshot = await getDocs(collection(db, TEAMS_PATH));
            let teamsProcessati = 0;
            let iconeProcessate = 0;
            let abilitaRimosseTotali = 0;

            for (const teamDoc of teamsSnapshot.docs) {
                const teamData = teamDoc.data();
                const players = teamData.players || [];
                let modificato = false;

                for (let i = 0; i < players.length; i++) {
                    const player = players[i];

                    if (this.isIcona(player)) {
                        const iconaId = player.id || player.iconaId;
                        const consentite = this.getAbilitaConsentiteIcona(iconaId);
                        const currentAbilities = player.abilities || [];

                        const nuoveAbilita = currentAbilities.filter(a => consentite.includes(a));
                        const rimosse = currentAbilities.filter(a => !consentite.includes(a));

                        if (rimosse.length > 0) {
                            players[i] = { ...player, abilities: nuoveAbilita };
                            modificato = true;
                            abilitaRimosseTotali += rimosse.length;
                            console.log(`[${teamData.teamName}] Icona ${player.name}: rimosse ${rimosse.join(', ')}`);
                        }
                        iconeProcessate++;
                    }
                }

                if (modificato) {
                    const teamDocRef = doc(db, TEAMS_PATH, teamDoc.id);
                    await updateDoc(teamDocRef, { players: players });

                    // Aggiorna anche formazione
                    if (teamData.formation?.titolari) {
                        const titolari = teamData.formation.titolari.map(t => {
                            const matchedPlayer = players.find(r => r.id === t.id);
                            return matchedPlayer ? { ...t, abilities: matchedPlayer.abilities } : t;
                        });
                        await updateDoc(teamDocRef, { 'formation.titolari': titolari });
                    }
                }
                teamsProcessati++;
            }

            console.log(`Pulizia completata: ${teamsProcessati} team, ${iconeProcessate} icone, ${abilitaRimosseTotali} abilità rimosse`);
            return { success: true, teamsProcessati, iconeProcessate, abilitaRimosse: abilitaRimosseTotali };

        } catch (error) {
            console.error('Errore pulizia tutte Icone:', error);
            return { success: false, error: error.message };
        }
    }
};

console.log('Modulo Crediti Super Seri caricato.');
