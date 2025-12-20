//
// ====================================================================
// AUTOMAZIONE-SIMULAZIONI.JS - Sistema di simulazione automatica
// ====================================================================
// Simula partite di campionato e coppa alle 12:00 e 20:30 in alternanza:
// Andata coppa -> Campionato -> Ritorno coppa -> Campionato -> ...
// ====================================================================
//

window.AutomazioneSimulazioni = {

    // Stato locale del timer
    _checkInterval: null,
    _lastCheckTime: null,

    /**
     * Orari di simulazione (12:00 e 20:30)
     */
    SIMULATION_TIMES: [
        { hour: 12, minute: 0 },   // 12:00
        { hour: 20, minute: 30 }   // 20:30
    ],
    // Legacy: mantieni per compatibilita'
    SIMULATION_HOUR: 20,
    SIMULATION_MINUTE: 30,

    /**
     * Orario calcolo schedina (21:30 - 1 ora dopo simulazione)
     */
    SCHEDINA_HOUR: 21,
    SCHEDINA_MINUTE: 30,

    /**
     * Carica lo stato dell'automazione dal database
     */
    async loadAutomationState() {
        const { doc, getDoc, appId } = window.firestoreTools;
        const db = window.db;

        const configPath = `artifacts/${appId}/public/data/config/automation`;
        const configRef = doc(db, configPath);

        try {
            const configDoc = await getDoc(configRef);
            if (configDoc.exists()) {
                return configDoc.data();
            }
            return {
                isEnabled: false,
                lastSimulationDate: null,
                nextSimulationType: 'coppa_andata', // coppa_andata, campionato, coppa_ritorno, campionato
                simulationHistory: []
            };
        } catch (error) {
            console.error('Errore caricamento stato automazione:', error);
            return null;
        }
    },

    /**
     * Salva lo stato dell'automazione nel database
     */
    async saveAutomationState(state) {
        const { doc, setDoc, appId } = window.firestoreTools;
        const db = window.db;

        const configPath = `artifacts/${appId}/public/data/config/automation`;
        const configRef = doc(db, configPath);

        try {
            await setDoc(configRef, state, { merge: true });
            return true;
        } catch (error) {
            console.error('Errore salvataggio stato automazione:', error);
            return false;
        }
    },

    /**
     * Verifica se ci sono partite da giocare nel campionato
     */
    async hasChampionshipMatchesToPlay() {
        const { doc, getDoc, appId } = window.firestoreTools;
        const db = window.db;

        const schedulePath = `artifacts/${appId}/public/data/schedule/full_schedule`;
        const scheduleRef = doc(db, schedulePath);

        try {
            const scheduleDoc = await getDoc(scheduleRef);
            if (!scheduleDoc.exists()) return false;

            const schedule = scheduleDoc.data().matches || [];
            if (schedule.length === 0) return false;

            // Cerca una giornata con partite non giocate
            const hasUnplayedMatches = schedule.some(round =>
                round.matches.some(match => match.result === null)
            );

            return hasUnplayedMatches;
        } catch (error) {
            console.error('Errore verifica partite campionato:', error);
            return false;
        }
    },

    /**
     * Verifica se ci sono partite da giocare nella coppa
     */
    async hasCupMatchesToPlay() {
        try {
            if (!window.CoppaSchedule) return false;

            const bracket = await window.CoppaSchedule.loadCupSchedule();
            if (!bracket || !bracket.rounds) return false;

            // Verifica se la coppa e' completata
            if (bracket.winner) return false;

            // Cerca partite non giocate
            for (const round of bracket.rounds) {
                for (const match of round.matches) {
                    if (match.isBye) continue;
                    if (!match.homeTeam || !match.awayTeam) continue;

                    // Partita secca (finale)
                    if (round.isSingleMatch && !match.winner) {
                        return true;
                    }

                    // Partita andata/ritorno
                    if (!round.isSingleMatch) {
                        if (!match.leg1Result || !match.leg2Result) {
                            return true;
                        }
                    }
                }
            }

            return false;
        } catch (error) {
            console.error('Errore verifica partite coppa:', error);
            return false;
        }
    },

    /**
     * Determina il prossimo tipo di simulazione in base alla sequenza
     * Sequenza: coppa_andata -> campionato -> coppa_ritorno -> campionato -> coppa_andata ...
     */
    getNextSimulationType(currentType) {
        const sequence = ['coppa_andata', 'campionato', 'coppa_ritorno', 'campionato'];
        const currentIndex = sequence.indexOf(currentType);
        const nextIndex = (currentIndex + 1) % sequence.length;
        return sequence[nextIndex];
    },

    /**
     * Verifica se una competizione ha partite disponibili
     */
    async canSimulate(simulationType) {
        if (simulationType === 'campionato') {
            return await this.hasChampionshipMatchesToPlay();
        } else {
            // coppa_andata o coppa_ritorno
            return await this.hasCupMatchesToPlay();
        }
    },

    /**
     * Trova il prossimo tipo di simulazione valido (salta se la competizione e' finita)
     */
    async findNextValidSimulation(startType) {
        const sequence = ['coppa_andata', 'campionato', 'coppa_ritorno', 'campionato'];
        let currentType = startType;

        // Prova tutti i tipi nella sequenza
        for (let i = 0; i < sequence.length; i++) {
            if (await this.canSimulate(currentType)) {
                return currentType;
            }
            currentType = this.getNextSimulationType(currentType);
        }

        return null; // Nessuna simulazione disponibile
    },

    /**
     * Simula una giornata di campionato
     */
    async simulateChampionship() {
        const { doc, getDoc, appId } = window.firestoreTools;
        const db = window.db;

        const schedulePath = `artifacts/${appId}/public/data/schedule/full_schedule`;
        const scheduleRef = doc(db, schedulePath);

        try {
            const scheduleDoc = await getDoc(scheduleRef);
            if (!scheduleDoc.exists()) {
                throw new Error('Calendario campionato non trovato');
            }

            const schedule = scheduleDoc.data().matches || [];

            // Trova la prossima giornata da simulare
            const nextRoundIndex = schedule.findIndex(round =>
                round.matches.some(match => match.result === null)
            );

            if (nextRoundIndex === -1) {
                throw new Error('Nessuna giornata da simulare');
            }

            // Carica tutte le squadre
            const { collection, getDocs } = window.firestoreTools;
            const teamsPath = `artifacts/${appId}/public/data/teams`;
            const teamsRef = collection(db, teamsPath);
            const teamsSnapshot = await getDocs(teamsRef);
            const allTeams = teamsSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().teamName,
                isParticipating: doc.data().isParticipating || false
            }));

            // Simula la giornata
            await window.ChampionshipMain.simulateCurrentRound(
                nextRoundIndex, schedule, allTeams, null
            );

            const roundNumber = schedule[nextRoundIndex].round;
            console.log(`[Automazione] Simulata giornata ${roundNumber} del campionato`);

            return {
                success: true,
                type: 'campionato',
                round: roundNumber,
                message: `Giornata ${roundNumber} del campionato simulata`
            };

        } catch (error) {
            console.error('Errore simulazione campionato:', error);
            return {
                success: false,
                type: 'campionato',
                error: error.message
            };
        }
    },

    /**
     * Simula un turno di coppa (andata o ritorno)
     */
    async simulateCup(legType) {
        try {
            if (!window.CoppaMain || !window.CoppaSchedule) {
                throw new Error('Moduli coppa non disponibili');
            }

            const bracket = await window.CoppaSchedule.loadCupSchedule();
            if (!bracket) {
                throw new Error('Tabellone coppa non trovato');
            }

            // Trova il turno corrente
            const roundInfo = await window.CoppaMain.getCurrentRoundInfo();
            if (!roundInfo || roundInfo.isCompleted) {
                throw new Error('Nessun turno coppa da simulare');
            }

            // Determina se simulare andata o ritorno
            // IMPORTANTE: simulateRound e simulateMatch si aspettano 'leg1' o 'leg2', non 'andata'/'ritorno'
            let targetLegType = legType === 'coppa_andata' ? 'leg1' : 'leg2';

            // Se e' partita secca (finale), usa leg1
            if (roundInfo.isSingleMatch) {
                targetLegType = 'leg1';
            }

            // Simula il turno
            const results = await window.CoppaMain.simulateRound(roundInfo.roundIndex, targetLegType);

            const roundName = roundInfo.roundName;
            const legName = targetLegType === 'single' ? '(Partita Secca)' : `(${targetLegType.charAt(0).toUpperCase() + targetLegType.slice(1)})`;

            console.log(`[Automazione] Simulato ${roundName} ${legName} della coppa`);

            return {
                success: true,
                type: legType,
                round: roundName,
                leg: targetLegType,
                message: `${roundName} ${legName} della coppa simulato`
            };

        } catch (error) {
            console.error('Errore simulazione coppa:', error);
            return {
                success: false,
                type: legType,
                error: error.message
            };
        }
    },

    /**
     * Esegue la simulazione automatica
     */
    async executeSimulation() {
        const state = await this.loadAutomationState();
        if (!state || !state.isEnabled) {
            console.log('[Automazione] Automazione disabilitata');
            return null;
        }

        // Trova il prossimo tipo di simulazione valido
        const nextType = await this.findNextValidSimulation(state.nextSimulationType);

        if (!nextType) {
            console.log('[Automazione] Nessuna partita da simulare - tutte le competizioni sono finite');
            // Disabilita automaticamente l'automazione
            await this.saveAutomationState({
                ...state,
                isEnabled: false
            });
            return null;
        }

        // Esegui la simulazione appropriata
        let result;
        if (nextType === 'campionato') {
            result = await this.simulateChampionship();
        } else {
            result = await this.simulateCup(nextType);
        }

        // Aggiorna lo stato
        const now = new Date();
        const newState = {
            ...state,
            lastSimulationDate: now.toISOString(),
            nextSimulationType: this.getNextSimulationType(nextType),
            simulationHistory: [
                ...(state.simulationHistory || []).slice(-19), // Mantiene ultimi 20
                {
                    date: now.toISOString(),
                    type: nextType,
                    success: result.success,
                    message: result.message || result.error
                }
            ]
        };

        await this.saveAutomationState(newState);

        return result;
    },

    /**
     * Verifica se e' il momento di simulare (20:30)
     */
    isSimulationTime() {
        const now = new Date();
        return now.getHours() === this.SIMULATION_HOUR &&
               now.getMinutes() === this.SIMULATION_MINUTE;
    },

    /**
     * Verifica se e' il momento di calcolare la schedina (21:30)
     */
    isSchedinaTime() {
        const now = new Date();
        return now.getHours() === this.SCHEDINA_HOUR &&
               now.getMinutes() === this.SCHEDINA_MINUTE;
    },

    /**
     * Verifica se la schedina di oggi e' gia' stata processata
     */
    async hasProcessedSchedinaToday() {
        const state = await this.loadAutomationState();
        if (!state || !state.lastSchedinaProcessDate) return false;

        const lastDate = new Date(state.lastSchedinaProcessDate);
        const today = new Date();

        return lastDate.getFullYear() === today.getFullYear() &&
               lastDate.getMonth() === today.getMonth() &&
               lastDate.getDate() === today.getDate();
    },

    /**
     * Processa i risultati della schedina (calcola risultati e assegna premi)
     */
    async processSchedina() {
        if (!window.Schedina || !window.FeatureFlags?.isEnabled('schedina')) {
            console.log('[Automazione] Schedina non abilitata, skip processo');
            return { success: false, reason: 'disabled' };
        }

        try {
            // Trova l'ultima giornata giocata
            const schedule = await window.ScheduleListener?.getSchedule(true);
            if (!schedule?.matches) {
                console.log('[Automazione] Schedule non disponibile per schedina');
                return { success: false, reason: 'no_schedule' };
            }

            // Trova l'ultima giornata con risultati
            let lastPlayedRound = null;
            for (let i = schedule.matches.length - 1; i >= 0; i--) {
                const round = schedule.matches[i];
                const playedMatches = round.matches.filter(m => m.result);
                if (playedMatches.length > 0) {
                    lastPlayedRound = round.round;
                    break;
                }
            }

            if (!lastPlayedRound) {
                console.log('[Automazione] Nessuna giornata giocata per schedina');
                return { success: false, reason: 'no_played_round' };
            }

            console.log(`[Automazione] Calcolo risultati schedina per giornata ${lastPlayedRound}...`);

            // Calcola risultati
            const calcResult = await window.Schedina.calculateResults(lastPlayedRound);
            if (!calcResult.success) {
                console.error('[Automazione] Errore calcolo schedina:', calcResult.error);
                return { success: false, reason: 'calc_error', error: calcResult.error };
            }

            console.log(`[Automazione] Risultati calcolati: ${calcResult.participants?.length || 0} partecipanti`);

            // Assegna premi
            const rewardResult = await window.Schedina.applyRewards(lastPlayedRound);
            console.log(`[Automazione] Premi assegnati: ${rewardResult.rewarded} squadre`);

            // Aggiorna stato
            const state = await this.loadAutomationState() || {};
            await this.saveAutomationState({
                ...state,
                lastSchedinaProcessDate: new Date().toISOString(),
                lastSchedinaRound: lastPlayedRound,
                lastSchedinaParticipants: calcResult.participants?.length || 0,
                lastSchedinaRewarded: rewardResult.rewarded
            });

            return {
                success: true,
                round: lastPlayedRound,
                participants: calcResult.participants?.length || 0,
                rewarded: rewardResult.rewarded
            };
        } catch (error) {
            console.error('[Automazione] Errore processo schedina:', error);
            return { success: false, reason: 'exception', error: error.message };
        }
    },

    /**
     * Verifica se la simulazione di oggi e' gia' stata eseguita
     */
    async hasSimulatedToday() {
        const state = await this.loadAutomationState();
        if (!state || !state.lastSimulationDate) return false;

        const lastSimDate = new Date(state.lastSimulationDate);
        const today = new Date();

        return lastSimDate.getFullYear() === today.getFullYear() &&
               lastSimDate.getMonth() === today.getMonth() &&
               lastSimDate.getDate() === today.getDate();
    },

    /**
     * Controlla e esegue la simulazione se necessario
     */
    async checkAndExecute() {
        const state = await this.loadAutomationState();
        if (!state || !state.isEnabled) return;

        // Verifica se e' l'ora giusta e non abbiamo gia' simulato oggi (20:30)
        if (this.isSimulationTime()) {
            const alreadySimulated = await this.hasSimulatedToday();
            if (!alreadySimulated) {
                console.log('[Automazione] Esecuzione simulazione automatica alle 20:30');
                await this.executeSimulation();
            }
        }

        // Verifica se e' l'ora di processare la schedina (21:30 - 1 ora dopo simulazione)
        if (this.isSchedinaTime()) {
            const alreadyProcessed = await this.hasProcessedSchedinaToday();
            if (!alreadyProcessed) {
                console.log('[Automazione] Processo schedina automatico alle 21:30');
                await this.processSchedina();
            }
        }
    },

    /**
     * Avvia il controllo periodico (ogni minuto)
     */
    startPeriodicCheck() {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
        }

        // Controlla ogni minuto
        this._checkInterval = setInterval(() => {
            this.checkAndExecute();
        }, 60 * 1000);

        // Esegui subito un controllo iniziale
        this.checkAndExecute();

        console.log('[Automazione] Controllo periodico avviato');
    },

    /**
     * Ferma il controllo periodico
     */
    stopPeriodicCheck() {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
            this._checkInterval = null;
        }
        console.log('[Automazione] Controllo periodico fermato');
    },

    /**
     * Attiva l'automazione
     */
    async enableAutomation() {
        const state = await this.loadAutomationState() || {};

        await this.saveAutomationState({
            ...state,
            isEnabled: true,
            enabledAt: new Date().toISOString()
        });

        this.startPeriodicCheck();
        console.log('[Automazione] Automazione attivata');
        return true;
    },

    /**
     * Disattiva l'automazione
     */
    async disableAutomation() {
        const state = await this.loadAutomationState() || {};

        await this.saveAutomationState({
            ...state,
            isEnabled: false,
            disabledAt: new Date().toISOString()
        });

        this.stopPeriodicCheck();
        console.log('[Automazione] Automazione disattivata');
        return true;
    },

    /**
     * Calcola il tempo rimanente alla prossima simulazione (12:00 o 20:30)
     */
    getTimeUntilNextSimulation() {
        const now = new Date();
        let nextTarget = null;

        // Trova il prossimo orario di simulazione
        for (const time of this.SIMULATION_TIMES) {
            const target = new Date();
            target.setHours(time.hour, time.minute, 0, 0);

            if (now < target) {
                // Questo orario e' nel futuro oggi
                if (!nextTarget || target < nextTarget) {
                    nextTarget = target;
                }
            }
        }

        // Se nessun orario e' nel futuro oggi, prendi il primo di domani
        if (!nextTarget) {
            const firstTime = this.SIMULATION_TIMES[0]; // 12:00
            nextTarget = new Date();
            nextTarget.setDate(nextTarget.getDate() + 1);
            nextTarget.setHours(firstTime.hour, firstTime.minute, 0, 0);
        }

        const diff = nextTarget - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return {
            total: diff,
            hours,
            minutes,
            seconds,
            formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
            nextTime: nextTarget
        };
    },

    /**
     * Ottiene informazioni sullo stato dell'automazione per la UI
     */
    async getAutomationInfo() {
        const state = await this.loadAutomationState();
        const hasChampionship = await this.hasChampionshipMatchesToPlay();
        const hasCup = await this.hasCupMatchesToPlay();
        const timeUntil = this.getTimeUntilNextSimulation();
        const simulatedToday = await this.hasSimulatedToday();

        return {
            isEnabled: state?.isEnabled || false,
            hasMatchesToPlay: hasChampionship || hasCup,
            hasChampionshipMatches: hasChampionship,
            hasCupMatches: hasCup,
            nextSimulationType: state?.nextSimulationType || 'coppa_andata',
            lastSimulationDate: state?.lastSimulationDate || null,
            simulationHistory: state?.simulationHistory || [],
            timeUntilNextSimulation: timeUntil,
            simulatedToday
        };
    },

    /**
     * Avanza il tipo di simulazione al prossimo nella sequenza.
     * Da chiamare dopo una simulazione manuale per sincronizzare con l'automazione.
     * @param {string} simulatedType - Tipo appena simulato ('campionato', 'coppa_andata', 'coppa_ritorno')
     */
    async advanceSimulationType(simulatedType) {
        try {
            const state = await this.loadAutomationState();
            if (!state) return;

            const currentNext = state.nextSimulationType || 'coppa_andata';

            // Se il tipo simulato corrisponde al prossimo, avanza
            // campionato -> campionato
            // coppa_andata/coppa_ritorno -> coppa (match partiale)
            let shouldAdvance = false;

            if (simulatedType === 'campionato' && currentNext === 'campionato') {
                shouldAdvance = true;
            } else if (simulatedType === 'coppa' && currentNext.includes('coppa')) {
                shouldAdvance = true;
            }

            if (shouldAdvance) {
                const newNext = this.getNextSimulationType(currentNext);
                await this.saveAutomationState({
                    ...state,
                    nextSimulationType: newNext,
                    lastManualSimulation: new Date().toISOString(),
                    lastManualSimulationType: simulatedType
                });
                console.log(`[Automazione] Tipo simulazione avanzato: ${currentNext} -> ${newNext}`);

                // Aggiorna l'alert della prossima partita
                if (window.NextMatchAlert) {
                    window.NextMatchAlert.refresh();
                }
            }
        } catch (error) {
            console.error('[Automazione] Errore avanzamento tipo simulazione:', error);
        }
    },

    /**
     * Inizializza il modulo (da chiamare al caricamento della pagina admin)
     */
    async initialize() {
        const state = await this.loadAutomationState();
        if (state && state.isEnabled) {
            this.startPeriodicCheck();
        }
        console.log('[Automazione] Modulo inizializzato');
    }
};

// Inizializza al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza solo se siamo admin (verificato dopo il login)
    document.addEventListener('adminLoggedIn', () => {
        window.AutomazioneSimulazioni.initialize();
    });
});

console.log("Modulo automazione-simulazioni.js caricato.");
