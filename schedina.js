//
// ====================================================================
// SCHEDINA.JS - Sistema Pronostici Partite
// ====================================================================
//

window.Schedina = {
    // Costanti
    CONFIG_DOC_ID: 'schedinaConfig',
    COLLECTION_NAME: 'schedine',

    // Cache
    _config: null,
    _configLoaded: false,

    // ==================== CONFIGURAZIONE ====================

    /**
     * Ottiene il path per la configurazione
     */
    getConfigPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/config` : null;
    },

    /**
     * Ottiene il path per le schedine
     */
    getSchedinePath(teamId) {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/${this.COLLECTION_NAME}/${teamId}` : null;
    },

    /**
     * Configurazione di default
     */
    getDefaultConfig() {
        return {
            enabled: true,
            baseRewardPerCorrect: 5,          // CS per pronostico corretto
            perfectBonusReward: 50,           // Bonus schedina perfetta
            minCorrectToWin: 0,               // Minimo corretti per vincere (0 = nessuna soglia)
            closingMinutesBeforeSimulation: 60
        };
    },

    /**
     * Carica configurazione da Firestore
     */
    async loadConfig() {
        if (this._configLoaded && this._config) {
            return this._config;
        }

        const path = this.getConfigPath();
        if (!path || !window.db || !window.firestoreTools) {
            this._config = this.getDefaultConfig();
            return this._config;
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, this.CONFIG_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                this._config = { ...this.getDefaultConfig(), ...docSnap.data() };
            } else {
                this._config = this.getDefaultConfig();
            }
            this._configLoaded = true;
        } catch (error) {
            console.error('[Schedina] Errore caricamento config:', error);
            this._config = this.getDefaultConfig();
        }

        return this._config;
    },

    /**
     * Salva configurazione su Firestore
     */
    async saveConfig(config) {
        const path = this.getConfigPath();
        if (!path || !window.db || !window.firestoreTools) {
            console.error('[Schedina] Impossibile salvare config: Firestore non disponibile');
            return false;
        }

        try {
            const { doc, setDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, this.CONFIG_DOC_ID);

            await setDoc(docRef, {
                ...config,
                updatedAt: new Date().toISOString()
            });

            this._config = config;
            console.log('[Schedina] Config salvata');
            return true;
        } catch (error) {
            console.error('[Schedina] Errore salvataggio config:', error);
            return false;
        }
    },

    /**
     * Verifica se la feature e' abilitata
     */
    isEnabled() {
        return window.FeatureFlags?.isEnabled('schedina') || false;
    },

    // ==================== PARTITE E GIORNATE ====================

    /**
     * Ottiene le partite della prossima giornata da pronosticare
     */
    async getNextRoundMatches() {
        try {
            // Usa ScheduleListener se disponibile
            const scheduleData = await window.ScheduleListener?.getSchedule();
            if (!scheduleData || !scheduleData.matches) {
                console.warn('[Schedina] Schedule non disponibile');
                return null;
            }

            // Trova la prossima giornata non ancora giocata completamente
            for (const round of scheduleData.matches) {
                // Verifica se ci sono partite non giocate in questa giornata
                const unplayedMatches = round.matches.filter(m => !m.result);
                if (unplayedMatches.length > 0) {
                    return {
                        roundNumber: round.round,
                        roundType: round.type || 'Andata',
                        matches: round.matches, // Tutte le partite della giornata
                        unplayedCount: unplayedMatches.length,
                        totalCount: round.matches.length
                    };
                }
            }

            return null; // Tutte le giornate sono state giocate
        } catch (error) {
            console.error('[Schedina] Errore caricamento partite:', error);
            return null;
        }
    },

    /**
     * Verifica se l'utente puo' ancora inviare pronostici
     */
    async canSubmitPredictions(roundNumber) {
        const config = await this.loadConfig();

        if (!this.isEnabled()) {
            return { canSubmit: false, reason: 'Schedina disabilitata' };
        }

        // Verifica se c'e' una simulazione programmata
        try {
            const appId = window.firestoreTools?.appId;
            const { doc, getDoc } = window.firestoreTools;
            const configDocRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'autoSimulation');
            const configSnap = await getDoc(configDocRef);

            if (configSnap.exists()) {
                const autoSimConfig = configSnap.data();
                if (autoSimConfig.nextSimulationTime) {
                    const simTime = new Date(autoSimConfig.nextSimulationTime);
                    const closingTime = new Date(simTime.getTime() - (config.closingMinutesBeforeSimulation * 60 * 1000));
                    const now = new Date();

                    if (now > closingTime) {
                        return {
                            canSubmit: false,
                            reason: 'Pronostici chiusi',
                            closedAt: closingTime
                        };
                    }

                    return {
                        canSubmit: true,
                        closingTime: closingTime
                    };
                }
            }
        } catch (error) {
            console.warn('[Schedina] Errore verifica tempo chiusura:', error);
        }

        // Se non c'e' simulazione automatica, permetti sempre
        return { canSubmit: true, closingTime: null };
    },

    // ==================== PRONOSTICI UTENTE ====================

    /**
     * Ottiene i pronostici dell'utente per una giornata
     */
    async getPredictionsForRound(teamId, roundNumber) {
        const path = this.getSchedinePath(teamId);
        if (!path || !window.db || !window.firestoreTools) {
            return null;
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, `giornata_${roundNumber}`);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error('[Schedina] Errore caricamento pronostici:', error);
            return null;
        }
    },

    /**
     * Salva i pronostici dell'utente
     */
    async submitPredictions(teamId, teamName, roundNumber, predictions) {
        const { canSubmit, reason } = await this.canSubmitPredictions(roundNumber);
        if (!canSubmit) {
            throw new Error(reason);
        }

        const path = this.getSchedinePath(teamId);
        if (!path || !window.db || !window.firestoreTools) {
            throw new Error('Firestore non disponibile');
        }

        try {
            const { doc, setDoc } = window.firestoreTools;
            const docRef = doc(window.db, path, `giornata_${roundNumber}`);

            await setDoc(docRef, {
                teamId,
                teamName,
                roundNumber,
                submittedAt: new Date().toISOString(),
                status: 'pending',
                predictions,
                results: null
            });

            console.log(`[Schedina] Pronostici salvati per giornata ${roundNumber}`);
            return true;
        } catch (error) {
            console.error('[Schedina] Errore salvataggio pronostici:', error);
            throw error;
        }
    },

    /**
     * Ottiene lo storico schedine dell'utente
     */
    async getUserHistory(teamId, limit = 10) {
        const path = this.getSchedinePath(teamId);
        if (!path || !window.db || !window.firestoreTools) {
            return [];
        }

        try {
            const { collection, getDocs, query, orderBy, limit: limitFn } = window.firestoreTools;
            const collRef = collection(window.db, path);

            // Ottiene tutte le schedine ordinate per roundNumber
            const snapshot = await getDocs(collRef);
            const schedine = [];

            snapshot.forEach(doc => {
                schedine.push({ id: doc.id, ...doc.data() });
            });

            // Ordina per roundNumber decrescente e limita
            schedine.sort((a, b) => b.roundNumber - a.roundNumber);
            return schedine.slice(0, limit);
        } catch (error) {
            console.error('[Schedina] Errore caricamento storico:', error);
            return [];
        }
    },

    // ==================== CALCOLO RISULTATI ====================

    /**
     * Converte un risultato in simbolo 1/X/2
     */
    getResultSymbol(result) {
        if (!result) return null;
        const parts = result.split('-');
        if (parts.length !== 2) return null;

        const home = parseInt(parts[0]);
        const away = parseInt(parts[1]);

        if (home > away) return '1';
        if (home < away) return '2';
        return 'X';
    },

    /**
     * Calcola i risultati per una giornata (chiamato dopo simulazione)
     */
    async calculateResults(roundNumber) {
        if (!window.db || !window.firestoreTools) {
            console.error('[Schedina] Firestore non disponibile');
            return { success: false };
        }

        const config = await this.loadConfig();
        const appId = window.firestoreTools.appId;
        const { collection, getDocs, doc, getDoc, updateDoc } = window.firestoreTools;

        try {
            // Carica risultati reali delle partite
            const scheduleData = await window.ScheduleListener?.getSchedule(true); // Forza refresh
            if (!scheduleData) {
                console.error('[Schedina] Schedule non disponibile');
                return { success: false };
            }

            const round = scheduleData.matches.find(r => r.round === roundNumber);
            if (!round) {
                console.error(`[Schedina] Giornata ${roundNumber} non trovata`);
                return { success: false };
            }

            // Mappa risultati reali
            const actualResults = {};
            round.matches.forEach(match => {
                if (match.result) {
                    const key = `${match.homeId}_${match.awayId}`;
                    actualResults[key] = {
                        result: match.result,
                        symbol: this.getResultSymbol(match.result)
                    };
                }
            });

            // Carica tutte le schedine per questa giornata
            const teamsPath = `artifacts/${appId}/public/data/teams`;
            const teamsSnap = await getDocs(collection(window.db, teamsPath));
            const participantsResults = [];

            for (const teamDoc of teamsSnap.docs) {
                const teamId = teamDoc.id;
                const schedinePath = this.getSchedinePath(teamId);
                if (!schedinePath) continue;

                const predDocRef = doc(window.db, schedinePath, `giornata_${roundNumber}`);
                const predSnap = await getDoc(predDocRef);

                if (!predSnap.exists()) continue;

                const predData = predSnap.data();
                if (predData.status === 'calculated') continue; // Gia calcolato

                // Calcola risultati
                let correctCount = 0;
                const updatedPredictions = predData.predictions.map(pred => {
                    const key = `${pred.homeId}_${pred.awayId}`;
                    const actual = actualResults[key];

                    const isCorrect = actual && pred.prediction === actual.symbol;
                    if (isCorrect) correctCount++;

                    return {
                        ...pred,
                        actualResult: actual?.result || null,
                        isCorrect
                    };
                });

                const isPerfect = correctCount === predData.predictions.length;
                const meetsThreshold = correctCount >= config.minCorrectToWin;
                const baseReward = meetsThreshold ? correctCount * config.baseRewardPerCorrect : 0;
                const bonusReward = (meetsThreshold && isPerfect) ? config.perfectBonusReward : 0;
                const totalReward = baseReward + bonusReward;

                // Aggiorna documento
                await updateDoc(predDocRef, {
                    status: 'calculated',
                    predictions: updatedPredictions,
                    results: {
                        totalMatches: predData.predictions.length,
                        correctPredictions: correctCount,
                        isPerfect,
                        meetsThreshold,
                        baseReward,
                        bonusReward,
                        totalReward,
                        rewarded: false,
                        rewardedAt: null
                    }
                });

                participantsResults.push({
                    teamId,
                    teamName: predData.teamName,
                    correctPredictions: correctCount,
                    totalReward,
                    isPerfect
                });
            }

            console.log(`[Schedina] Risultati calcolati per giornata ${roundNumber}: ${participantsResults.length} partecipanti`);
            return { success: true, participants: participantsResults };
        } catch (error) {
            console.error('[Schedina] Errore calcolo risultati:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Applica i premi alle squadre
     */
    async applyRewards(roundNumber) {
        // Verifica che i rewards siano abilitati globalmente
        if (window.AdminRewards?.areRewardsDisabled()) {
            console.log('[Schedina] Rewards disabilitati globalmente');
            return { rewarded: 0 };
        }

        if (!window.db || !window.firestoreTools) {
            console.error('[Schedina] Firestore non disponibile');
            return { rewarded: 0 };
        }

        const appId = window.firestoreTools.appId;
        const { collection, getDocs, doc, updateDoc, getDoc } = window.firestoreTools;
        const TEAMS_PATH = `artifacts/${appId}/public/data/teams`;

        let rewardedCount = 0;

        try {
            // Ottieni tutte le squadre
            const teamsSnap = await getDocs(collection(window.db, TEAMS_PATH));

            for (const teamDoc of teamsSnap.docs) {
                const teamId = teamDoc.id;
                const schedinePath = this.getSchedinePath(teamId);
                if (!schedinePath) continue;

                const predDocRef = doc(window.db, schedinePath, `giornata_${roundNumber}`);
                const predSnap = await getDoc(predDocRef);

                if (!predSnap.exists()) continue;

                const predData = predSnap.data();
                if (!predData.results || predData.results.rewarded) continue;
                if (predData.results.totalReward <= 0) continue;

                // Assegna crediti
                const teamDocRef = doc(window.db, TEAMS_PATH, teamId);
                const teamSnap = await getDoc(teamDocRef);
                if (!teamSnap.exists()) continue;

                const currentBudget = teamSnap.data().budget || 0;
                await updateDoc(teamDocRef, {
                    budget: currentBudget + predData.results.totalReward
                });

                // Marca come premiato
                await updateDoc(predDocRef, {
                    'results.rewarded': true,
                    'results.rewardedAt': new Date().toISOString()
                });

                rewardedCount++;
                console.log(`[Schedina] Premio ${predData.results.totalReward} CS assegnato a ${teamId}`);
            }

            console.log(`[Schedina] Premi assegnati: ${rewardedCount} squadre`);
            return { rewarded: rewardedCount };
        } catch (error) {
            console.error('[Schedina] Errore assegnazione premi:', error);
            return { rewarded: rewardedCount, error: error.message };
        }
    },

    // ==================== UTILITA ====================

    /**
     * Formatta il tempo rimanente alla chiusura
     */
    formatTimeRemaining(closingTime) {
        if (!closingTime) return null;

        const now = new Date();
        const diff = closingTime.getTime() - now.getTime();

        if (diff <= 0) return 'Chiuso';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
};

console.log('Modulo Schedina caricato.');
