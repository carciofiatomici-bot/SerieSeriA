//
// ====================================================================
// CHALLENGE-MATCH.JS - Sistema Partite Interattive in Tempo Reale
// ====================================================================
//
// Gestisce:
// - Partite sfida interattive tra due utenti
// - Lanci di dado in tempo reale con animazioni
// - Sincronizzazione via Firestore onSnapshot
// - Sistema presenza/heartbeat per rilevare disconnessioni
// - 20 occasioni (10 per squadra) con 3 fasi ciascuna
//

window.ChallengeMatch = {

    // ====================================================================
    // STATO E CONFIGURAZIONE
    // ====================================================================

    // Stato corrente
    currentMatch: null,
    unsubscribeMatch: null,
    presenceInterval: null,
    diceTimeoutTimer: null,
    myTeamId: null,

    // Configurazione
    config: {
        HEARTBEAT_INTERVAL_MS: 5000,        // Heartbeat ogni 5 secondi
        DICE_TIMEOUT_MS: 30000,             // 30 secondi per lanciare dado
        DISCONNECT_THRESHOLD_MS: 15000,     // 15 secondi = disconnessione
        TOTAL_OCCASIONS: 20,                // 10 per squadra, alternati
        OCCASIONS_PER_TEAM: 10
    },

    // Mappa modificatori livello (da simulazione.js)
    LEVEL_MODIFIERS: {
        1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0, 6: 3.5, 7: 4.0, 8: 4.5, 9: 5.0, 10: 5.5,
        11: 6.0, 12: 6.5, 13: 7.0, 14: 7.5, 15: 8.0, 16: 8.5, 17: 9.0, 18: 9.5, 19: 10.0,
        20: 11.0, 21: 11.5, 22: 12.0, 23: 12.5, 24: 13.0, 25: 14.0, 26: 14.5, 27: 15.0,
        28: 15.5, 29: 17.5, 30: 18.5
    },

    // Sistema sasso-carta-forbice
    TYPE_DISADVANTAGE: {
        'Potenza': 'Tecnica',
        'Tecnica': 'Velocita',
        'Velocita': 'Potenza'
    },
    TYPE_PENALTY: 0.25,

    // ====================================================================
    // PATH HELPERS
    // ====================================================================

    getLiveMatchesPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/liveMatches` : null;
    },

    getMatchPath(matchId) {
        const basePath = this.getLiveMatchesPath();
        return basePath ? `${basePath}/${matchId}` : null;
    },

    getTeamsPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/teams` : null;
    },

    // ====================================================================
    // CREAZIONE PARTITA
    // ====================================================================

    /**
     * Crea una nuova partita interattiva
     * @param {Object} challengeData - Dati della sfida
     * @returns {string} matchId
     */
    async createInteractiveMatch(challengeData) {
        const { doc, setDoc, Timestamp } = window.firestoreTools;
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

        // Carica formazioni attuali
        const [homeFormation, awayFormation] = await Promise.all([
            this.loadTeamFormation(challengeData.fromTeamId),
            this.loadTeamFormation(challengeData.toTeamId)
        ]);

        // Assegna forma fisica casuale ai giocatori
        this.assignPhysicalForm(homeFormation);
        this.assignPhysicalForm(awayFormation);

        const matchData = {
            matchId,
            challengeId: challengeData.id,

            // Squadre
            homeTeamId: challengeData.fromTeamId,
            homeTeamName: challengeData.fromTeamName,
            awayTeamId: challengeData.toTeamId,
            awayTeamName: challengeData.toTeamName,

            // Stato
            status: 'waiting', // waiting, inProgress, completed, abandoned
            homeScore: 0,
            awayScore: 0,

            // Turno corrente
            currentOccasion: 1,
            currentPhase: 'waiting_start', // waiting_start, construction, attack, shot, result
            attackingTeamId: challengeData.fromTeamId, // Casa inizia

            // Dado
            diceState: {
                waitingFor: null,
                diceType: null,
                result: null,
                rolledAt: null,
                purpose: null, // construction_att, construction_def, attack_att, attack_def, shot_gk
                pendingRolls: [] // Per fasi che richiedono piu' lanci
            },

            // Dati fase corrente
            phaseData: {
                attackModifier: 0,
                defenseModifier: 0,
                attackRoll: null,
                defenseRoll: null,
                successChance: null,
                attackResult: null
            },

            // Presenza
            presence: {
                [challengeData.fromTeamId]: { lastSeen: Timestamp.now(), connected: true },
                [challengeData.toTeamId]: { lastSeen: null, connected: false }
            },

            // Log eventi
            eventLog: [{
                timestamp: Timestamp.now(),
                occasion: 0,
                phase: 'start',
                message: `Partita creata - ${challengeData.fromTeamName} vs ${challengeData.toTeamName}`,
                type: 'system'
            }],

            // Formazioni (snapshot)
            homeFormation,
            awayFormation,

            // Scommessa
            bet: challengeData.bet || { amount: 0, processed: false },

            // Timestamps
            createdAt: Timestamp.now(),
            startedAt: null,
            completedAt: null,
            lastActionAt: Timestamp.now()
        };

        const matchPath = this.getMatchPath(matchId);
        await setDoc(doc(window.db, matchPath), matchData);

        console.log(`[ChallengeMatch] Partita creata: ${matchId}`);
        return matchId;
    },

    /**
     * Carica formazione di una squadra
     */
    async loadTeamFormation(teamId) {
        const { doc, getDoc } = window.firestoreTools;
        const teamsPath = this.getTeamsPath();

        const teamDoc = await getDoc(doc(window.db, teamsPath, teamId));
        if (!teamDoc.exists()) {
            throw new Error(`Squadra ${teamId} non trovata`);
        }

        const teamData = teamDoc.data();
        const formation = teamData.formation || {};
        const titolari = formation.titolari || [];
        const panchina = formation.panchina || [];
        const modulo = formation.modulo || '1-2-2';

        // Organizza per ruolo
        const organized = {
            P: titolari.filter(p => p.role === 'P'),
            D: titolari.filter(p => p.role === 'D'),
            C: titolari.filter(p => p.role === 'C'),
            A: titolari.filter(p => p.role === 'A'),
            Panchina: panchina,
            coachLevel: teamData.coachLevel || 1,
            formationInfo: {
                isIconaActive: titolari.some(p => p.abilities?.includes('Icona')),
                modulo
            },
            teamName: teamData.teamName,
            teamId: teamId,
            primaryColor: teamData.primaryColor || '#22c55e' // Colore squadra
        };

        return organized;
    },

    /**
     * Assegna forma fisica casuale ai giocatori
     * Normali: -3 a +3
     * Icone: 0 a +6
     */
    assignPhysicalForm(formation) {
        const allPlayers = [...(formation.P || []), ...(formation.D || []),
                          ...(formation.C || []), ...(formation.A || [])];

        allPlayers.forEach(player => {
            const baseLevel = player.level || 1;
            let formBonus;

            if (player.abilities?.includes('Icona')) {
                // Icone: forma sempre positiva (0 a +6)
                formBonus = Math.floor(Math.random() * 7); // 0-6
            } else {
                // Normali: -3 a +3
                formBonus = Math.floor(Math.random() * 7) - 3; // -3 to +3
            }

            player.currentLevel = Math.min(30, Math.max(1, baseLevel + formBonus));
            player.formBonus = formBonus;
        });
    },

    // ====================================================================
    // JOIN E LISTENER
    // ====================================================================

    /**
     * Unisciti a una partita esistente
     */
    async joinMatch(matchId) {
        this.myTeamId = window.InterfacciaCore?.currentTeamId;
        if (!this.myTeamId) {
            console.error("[ChallengeMatch] Nessun team ID");
            return;
        }

        // Avvia listener
        this.startMatchListener(matchId);

        // Avvia heartbeat
        this.startPresenceHeartbeat(matchId);

        // Mostra UI
        this.showMatchScreen(null); // Mostra loading, poi onSnapshot aggiornera'
    },

    /**
     * Avvia listener real-time per la partita
     */
    startMatchListener(matchId) {
        const { doc, onSnapshot } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchId);

        // Ferma listener precedente
        this.stopMatchListener();

        this.unsubscribeMatch = onSnapshot(doc(window.db, matchPath), (snapshot) => {
            if (!snapshot.exists()) {
                console.error("[ChallengeMatch] Partita non trovata");
                this.handleMatchNotFound();
                return;
            }

            const matchData = snapshot.data();
            this.currentMatch = matchData;

            // Controlla disconnessioni
            if (this.checkDisconnection(matchData)) {
                return; // Abbandono gestito
            }

            // Aggiorna UI
            this.updateMatchUI(matchData);

            // Gestisci stato partita
            if (matchData.status === 'completed' || matchData.status === 'abandoned') {
                this.showFinalResult(matchData);
            }

        }, (error) => {
            console.error("[ChallengeMatch] Errore listener:", error);
        });

        console.log(`[ChallengeMatch] Listener avviato per ${matchId}`);
    },

    /**
     * Ferma listener
     */
    stopMatchListener() {
        if (this.unsubscribeMatch) {
            this.unsubscribeMatch();
            this.unsubscribeMatch = null;
        }
    },

    // ====================================================================
    // SISTEMA PRESENZA
    // ====================================================================

    /**
     * Avvia heartbeat per segnalare presenza
     */
    startPresenceHeartbeat(matchId) {
        this.stopPresenceHeartbeat();

        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchId);

        // Aggiorna subito
        this.updatePresence(matchPath);

        // Poi ogni 5 secondi
        this.presenceInterval = setInterval(() => {
            this.updatePresence(matchPath);
        }, this.config.HEARTBEAT_INTERVAL_MS);
    },

    async updatePresence(matchPath) {
        try {
            const { doc, updateDoc, Timestamp } = window.firestoreTools;
            await updateDoc(doc(window.db, matchPath), {
                [`presence.${this.myTeamId}.lastSeen`]: Timestamp.now(),
                [`presence.${this.myTeamId}.connected`]: true
            });
        } catch (e) {
            console.warn("[ChallengeMatch] Errore update presenza:", e);
        }
    },

    stopPresenceHeartbeat() {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
    },

    /**
     * Controlla se l'avversario si e' disconnesso
     */
    checkDisconnection(matchData) {
        if (matchData.status !== 'inProgress' && matchData.status !== 'waiting') {
            return false;
        }

        const now = Date.now();

        for (const [teamId, presence] of Object.entries(matchData.presence)) {
            if (teamId === this.myTeamId) continue; // Skip me stesso

            const lastSeen = presence.lastSeen?.toMillis?.() || 0;
            const elapsed = now - lastSeen;

            if (elapsed > this.config.DISCONNECT_THRESHOLD_MS && presence.connected) {
                console.log(`[ChallengeMatch] ${teamId} disconnesso (${elapsed}ms)`);
                this.handleAbandonment(matchData.matchId, teamId);
                return true;
            }
        }

        return false;
    },

    /**
     * Gestisci abbandono
     */
    async handleAbandonment(matchId, disconnectedTeamId) {
        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchId);

        const matchData = this.currentMatch;
        const winnerId = disconnectedTeamId === matchData.homeTeamId
            ? matchData.awayTeamId
            : matchData.homeTeamId;

        const winnerName = winnerId === matchData.homeTeamId
            ? matchData.homeTeamName
            : matchData.awayTeamName;

        try {
            await updateDoc(doc(window.db, matchPath), {
                status: 'abandoned',
                completedAt: Timestamp.now(),
                abandonedBy: disconnectedTeamId,
                winnerId: winnerId,
                // Vittoria a tavolino 3-0
                homeScore: winnerId === matchData.homeTeamId ? 3 : 0,
                awayScore: winnerId === matchData.awayTeamId ? 3 : 0,
                eventLog: [...(matchData.eventLog || []), {
                    timestamp: Timestamp.now(),
                    occasion: matchData.currentOccasion,
                    phase: 'abandoned',
                    message: `Partita abbandonata! ${winnerName} vince 3-0 a tavolino.`,
                    type: 'system'
                }]
            });
        } catch (e) {
            console.error("[ChallengeMatch] Errore gestione abbandono:", e);
        }
    },

    // ====================================================================
    // AVVIO PARTITA
    // ====================================================================

    /**
     * Avvia la partita (quando entrambi sono connessi)
     */
    async startMatch() {
        if (!this.currentMatch || this.currentMatch.status !== 'waiting') return;

        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(this.currentMatch.matchId);

        try {
            await updateDoc(doc(window.db, matchPath), {
                status: 'inProgress',
                startedAt: Timestamp.now(),
                currentPhase: 'construction',
                'diceState.waitingFor': this.currentMatch.homeTeamId,
                'diceState.diceType': 'd20',
                'diceState.purpose': 'construction_att',
                'diceState.result': null,
                eventLog: [...(this.currentMatch.eventLog || []), {
                    timestamp: Timestamp.now(),
                    occasion: 1,
                    phase: 'start',
                    message: `INIZIA LA PARTITA! Occasione 1 - ${this.currentMatch.homeTeamName} attacca`,
                    type: 'action'
                }]
            });
        } catch (e) {
            console.error("[ChallengeMatch] Errore avvio partita:", e);
        }
    },

    // ====================================================================
    // LANCIO DADO
    // ====================================================================

    /**
     * Esegui lancio dado (con transazione per evitare race condition)
     */
    async rollDice() {
        if (!this.currentMatch) return;

        const { doc, runTransaction, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(this.currentMatch.matchId);

        try {
            const result = await runTransaction(window.db, async (transaction) => {
                const matchRef = doc(window.db, matchPath);
                const matchSnap = await transaction.get(matchRef);

                if (!matchSnap.exists()) {
                    throw new Error('Partita non trovata');
                }

                const matchData = matchSnap.data();

                // Verifica che sia il mio turno
                if (matchData.diceState.waitingFor !== this.myTeamId) {
                    throw new Error('Non e\' il tuo turno di lanciare!');
                }

                // Verifica che non sia gia' stato lanciato
                if (matchData.diceState.result !== null) {
                    throw new Error('Dado gia\' lanciato!');
                }

                // Genera risultato
                const diceType = matchData.diceState.diceType;
                const maxValue = parseInt(diceType.replace('d', ''));
                const diceResult = Math.floor(Math.random() * maxValue) + 1;

                // Aggiorna atomicamente
                transaction.update(matchRef, {
                    'diceState.result': diceResult,
                    'diceState.rolledAt': Timestamp.now(),
                    'lastActionAt': Timestamp.now()
                });

                return { result: diceResult, diceType };
            });

            console.log(`[ChallengeMatch] Dado lanciato: ${result.diceType} = ${result.result}`);

            // Mostra animazione
            await this.showDiceAnimation(result.diceType, result.result);

            // Processa risultato (avanza fase se necessario)
            await this.processDiceResult();

        } catch (error) {
            console.error("[ChallengeMatch] Errore lancio dado:", error);
            if (window.Toast) window.Toast.error(error.message);
        }
    },

    /**
     * Processa il risultato del dado e avanza la fase
     */
    async processDiceResult() {
        if (!this.currentMatch) return;

        // Attendi che Firestore aggiorni lo stato locale
        await this.sleep(300);

        // Rileggi lo stato aggiornato
        const { doc, getDoc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(this.currentMatch.matchId);
        const freshSnap = await getDoc(doc(window.db, matchPath));
        if (!freshSnap.exists()) return;

        const matchData = freshSnap.data();
        this.currentMatch = matchData;

        const diceState = matchData.diceState;
        const purpose = diceState.purpose;

        // Determina prossimo passo in base alla fase
        switch (purpose) {
            case 'construction_att':
                // Attaccante ha lanciato, ora tocca al difensore
                await updateDoc(doc(window.db, matchPath), {
                    'phaseData.attackRoll': diceState.result,
                    'diceState.waitingFor': matchData.attackingTeamId === matchData.homeTeamId
                        ? matchData.awayTeamId : matchData.homeTeamId,
                    'diceState.purpose': 'construction_def',
                    'diceState.result': null,
                    'diceState.rolledAt': null
                });
                break;

            case 'construction_def':
                // Difensore ha lanciato, calcola risultato fase costruzione
                await this.resolveConstructionPhase();
                break;

            case 'construction_d100':
                // Tiro d100 per verificare successo costruzione
                await this.resolveConstructionD100();
                break;

            case 'attack_att':
                // Attaccante ha lanciato in fase attacco
                await updateDoc(doc(window.db, matchPath), {
                    'phaseData.attackRoll': diceState.result,
                    'diceState.waitingFor': matchData.attackingTeamId === matchData.homeTeamId
                        ? matchData.awayTeamId : matchData.homeTeamId,
                    'diceState.purpose': 'attack_def',
                    'diceState.result': null,
                    'diceState.rolledAt': null
                });
                break;

            case 'attack_def':
                // Difensore ha lanciato, calcola risultato fase attacco
                await this.resolveAttackPhase();
                break;

            case 'shot_att':
                // Attaccante ha lanciato d10 per il tiro, ora tocca al portiere
                await updateDoc(doc(window.db, matchPath), {
                    'phaseData.shotRoll': diceState.result,
                    'diceState.waitingFor': matchData.attackingTeamId === matchData.homeTeamId
                        ? matchData.awayTeamId : matchData.homeTeamId,
                    'diceState.diceType': 'd20',
                    'diceState.purpose': 'shot_gk',
                    'diceState.result': null,
                    'diceState.rolledAt': null
                });
                break;

            case 'shot_gk':
                // Portiere ha lanciato, calcola risultato tiro
                await this.resolveShotPhase();
                break;
        }
    },

    // ====================================================================
    // RISOLUZIONE FASI
    // ====================================================================

    /**
     * Calcola modificatore di un giocatore
     */
    calculatePlayerModifier(player, hasIcona, opposingPlayers = []) {
        const baseLevel = Math.min(30, Math.max(1, player.level || 1));
        let modifier = this.LEVEL_MODIFIERS[baseLevel] || 1.0;

        // Forma
        if (player.currentLevel !== undefined) {
            const clampedLevel = Math.min(30, Math.max(1, player.currentLevel));
            modifier = this.LEVEL_MODIFIERS[clampedLevel] || modifier;
        }

        // Icona bonus
        if (hasIcona && !player.abilities?.includes('Icona')) {
            modifier += 1.0;
        }
        if (player.abilities?.includes('Icona')) {
            modifier += 1.0;
        }

        // Capitano
        if (player.isCaptain) {
            modifier += 1.0;
        }

        // Tipologia
        if (player.type && opposingPlayers.length > 0 && !player.abilities?.includes('Adattabile')) {
            const disadvantagedAgainst = this.TYPE_DISADVANTAGE[player.type];
            const facingDisadvantage = opposingPlayers.some(opp => opp.type === disadvantagedAgainst);
            if (facingDisadvantage) {
                modifier *= (1 - this.TYPE_PENALTY);
            }
        }

        return modifier;
    },

    /**
     * Calcola modificatore di un gruppo
     */
    calculateGroupModifier(players, isHalf, formation, opposingPlayers = []) {
        if (!players || players.length === 0) return { total: 0, details: [] };

        const hasIcona = formation.formationInfo?.isIconaActive || false;
        let total = 0;
        const details = [];

        for (const player of players) {
            const mod = this.calculatePlayerModifier(player, hasIcona, opposingPlayers);
            const contribution = isHalf ? mod / 2 : mod;
            total += contribution;
            details.push({
                name: player.name,
                level: player.currentLevel || player.level,
                role: player.role,
                type: player.type,
                mod: contribution,
                abilities: player.abilities || []
            });
        }

        return { total, details };
    },

    /**
     * Formatta lista giocatori per il log
     */
    formatPlayersForLog(details) {
        if (!details || details.length === 0) return '';
        return details.map(p => `${p.name}(${p.role}${p.level})`).join(', ');
    },

    /**
     * Controlla e attiva abilita pre-fase
     * Ritorna un oggetto con le abilita attivate
     */
    checkPrePhaseAbilities(attFormation, defFormation, phase) {
        const activated = [];
        const rollChance = () => Math.floor(Math.random() * 100) + 1;

        if (phase === 'construction') {
            // Regista (5% skip costruzione)
            const regista = attFormation.C?.find(p => p.abilities?.includes('Regista'));
            if (regista && rollChance() <= 5) {
                activated.push({ ability: 'Regista', player: regista.name, effect: 'Skip costruzione!' });
                return { skip: true, activated };
            }

            // Lancio lungo (5% skip costruzione)
            const lancioLungo = attFormation.P?.find(p => p.abilities?.includes('Lancio lungo'));
            if (lancioLungo && rollChance() <= 5) {
                activated.push({ ability: 'Lancio lungo', player: lancioLungo.name, effect: 'Skip costruzione!' });
                return { skip: true, activated };
            }
        }

        if (phase === 'attack') {
            // Antifurto (5% interrompe attacco)
            const antifurto = defFormation.D?.find(p => p.abilities?.includes('Antifurto'));
            if (antifurto && rollChance() <= 5) {
                activated.push({ ability: 'Antifurto', player: antifurto.name, effect: 'Palla rubata!' });
                return { interrupt: true, activated };
            }

            // Cross (5% skip direttamente a tiro)
            const cross = attFormation.C?.find(p => p.abilities?.includes('Cross'));
            if (cross && rollChance() <= 5) {
                activated.push({ ability: 'Cross', player: cross.name, effect: 'Cross pericoloso!' });
                return { cross: true, activated };
            }
        }

        return { activated };
    },

    /**
     * Risolvi fase costruzione (dopo entrambi i lanci d20)
     */
    async resolveConstructionPhase() {
        const matchData = this.currentMatch;
        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchData.matchId);

        const isHomeAttacking = matchData.attackingTeamId === matchData.homeTeamId;
        const attFormation = isHomeAttacking ? matchData.homeFormation : matchData.awayFormation;
        const defFormation = isHomeAttacking ? matchData.awayFormation : matchData.homeFormation;
        const attTeamName = isHomeAttacking ? matchData.homeTeamName : matchData.awayTeamName;
        const defTeamName = isHomeAttacking ? matchData.awayTeamName : matchData.homeTeamName;

        // Calcola modificatori con dettagli giocatori
        const resultA_D = this.calculateGroupModifier(attFormation.D, true, attFormation, defFormation.C || []);
        const resultA_C = this.calculateGroupModifier(attFormation.C, false, attFormation, defFormation.C || []);
        const resultB_C = this.calculateGroupModifier(defFormation.C, false, defFormation, [...(attFormation.D || []), ...(attFormation.C || [])]);

        const modA_D = resultA_D.total;
        const modA_C = resultA_C.total;
        const modB_C = resultB_C.total;

        const coachA = (attFormation.coachLevel || 1) / 2;
        const coachB = (defFormation.coachLevel || 1) / 2;

        const rollA = matchData.phaseData.attackRoll;
        const rollB = matchData.diceState.result;

        const totalA = rollA + modA_D + modA_C + coachA;
        const totalB = rollB + modB_C + coachB;

        const successChance = Math.max(5, Math.min(95, Math.round(totalA - totalB + 50)));

        // Crea log dettagliato con giocatori
        const attPlayers = [...resultA_D.details, ...resultA_C.details];
        const defPlayers = resultB_C.details;

        const eventLogs = [...(matchData.eventLog || [])];

        // Log giocatori coinvolti
        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'construction',
            message: `${attTeamName} costruisce con: ${this.formatPlayersForLog(attPlayers)}`,
            type: 'action'
        });
        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'construction',
            message: `${defTeamName} difende con: ${this.formatPlayersForLog(defPlayers)}`,
            type: 'action'
        });

        // Log risultato con range chiari
        const modTotaleAtt = modA_D + modA_C + coachA;
        const modTotaleDef = modB_C + coachB;
        const rangeMinA = 1 + modTotaleAtt;
        const rangeMaxA = 20 + modTotaleAtt;
        const rangeMinB = 1 + modTotaleDef;
        const rangeMaxB = 20 + modTotaleDef;

        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'construction',
            message: `📊 ${attTeamName}: 🎲${rollA} + ${modTotaleAtt.toFixed(1)} = ${totalA.toFixed(1)} (range ${rangeMinA.toFixed(0)}-${rangeMaxA.toFixed(0)})`,
            type: 'dice'
        });
        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'construction',
            message: `📊 ${defTeamName}: 🎲${rollB} + ${modTotaleDef.toFixed(1)} = ${totalB.toFixed(1)} (range ${rangeMinB.toFixed(0)}-${rangeMaxB.toFixed(0)})`,
            type: 'dice'
        });
        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'construction',
            message: `⚙️ Costruzione: ${totalA.toFixed(1)} vs ${totalB.toFixed(1)} → Successo ${successChance}%`,
            type: 'action'
        });

        // Ora serve un d100 per verificare successo
        await updateDoc(doc(window.db, matchPath), {
            'phaseData.attackModifier': totalA,
            'phaseData.defenseModifier': totalB,
            'phaseData.successChance': successChance,
            'phaseData.defenseRoll': rollB,
            'diceState.waitingFor': matchData.attackingTeamId,
            'diceState.diceType': 'd100',
            'diceState.purpose': 'construction_d100',
            'diceState.result': null,
            'diceState.rolledAt': null,
            eventLog: eventLogs
        });
    },

    /**
     * Risolvi d100 costruzione
     */
    async resolveConstructionD100() {
        const matchData = this.currentMatch;
        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchData.matchId);

        const roll100 = matchData.diceState.result;
        const successChance = matchData.phaseData.successChance;
        const success = roll100 <= successChance;

        if (success) {
            // Passa a fase attacco
            await updateDoc(doc(window.db, matchPath), {
                currentPhase: 'attack',
                'diceState.waitingFor': matchData.attackingTeamId,
                'diceState.diceType': 'd20',
                'diceState.purpose': 'attack_att',
                'diceState.result': null,
                'diceState.rolledAt': null,
                'phaseData.attackRoll': null,
                'phaseData.defenseRoll': null,
                eventLog: [...(matchData.eventLog || []), {
                    timestamp: Timestamp.now(),
                    occasion: matchData.currentOccasion,
                    phase: 'construction',
                    message: `Costruzione RIUSCITA! (${roll100} <= ${successChance}%)`,
                    type: 'action'
                }]
            });
        } else {
            // 5% di passare comunque
            const luckyRoll = Math.floor(Math.random() * 100) + 1;
            if (luckyRoll <= 5) {
                await updateDoc(doc(window.db, matchPath), {
                    currentPhase: 'attack',
                    'diceState.waitingFor': matchData.attackingTeamId,
                    'diceState.diceType': 'd20',
                    'diceState.purpose': 'attack_att',
                    'diceState.result': null,
                    'diceState.rolledAt': null,
                    eventLog: [...(matchData.eventLog || []), {
                        timestamp: Timestamp.now(),
                        occasion: matchData.currentOccasion,
                        phase: 'construction',
                        message: `Costruzione fallita ma 5% fortuna! (${roll100} > ${successChance}%, lucky ${luckyRoll})`,
                        type: 'action'
                    }]
                });
            } else {
                // Costruzione fallita, prossima occasione
                await this.advanceToNextOccasion('Costruzione fallita');
            }
        }
    },

    /**
     * Risolvi fase attacco
     */
    async resolveAttackPhase() {
        const matchData = this.currentMatch;
        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchData.matchId);

        const isHomeAttacking = matchData.attackingTeamId === matchData.homeTeamId;
        const attFormation = isHomeAttacking ? matchData.homeFormation : matchData.awayFormation;
        const defFormation = isHomeAttacking ? matchData.awayFormation : matchData.homeFormation;
        const attTeamName = isHomeAttacking ? matchData.homeTeamName : matchData.awayTeamName;
        const defTeamName = isHomeAttacking ? matchData.awayTeamName : matchData.homeTeamName;

        // Calcola modificatori con dettagli
        const resultA_C = this.calculateGroupModifier(attFormation.C, true, attFormation, [...(defFormation.D || []), ...(defFormation.C || [])]);
        const resultA_A = this.calculateGroupModifier(attFormation.A, false, attFormation, [...(defFormation.D || []), ...(defFormation.C || [])]);
        const resultB_D = this.calculateGroupModifier(defFormation.D, false, defFormation, [...(attFormation.C || []), ...(attFormation.A || [])]);
        const resultB_C = this.calculateGroupModifier(defFormation.C, true, defFormation, [...(attFormation.C || []), ...(attFormation.A || [])]);

        const modA_C = resultA_C.total;
        const modA_A = resultA_A.total;
        const modB_D = resultB_D.total;
        const modB_C = resultB_C.total;

        const coachA = (attFormation.coachLevel || 1) / 2;
        const coachB = (defFormation.coachLevel || 1) / 2;

        const rollA = matchData.phaseData.attackRoll;
        const rollB = matchData.diceState.result;

        const totalA = rollA + modA_C + modA_A + coachA;
        const totalB = rollB + modB_D + modB_C + coachB;

        const attackResult = totalA - totalB;

        // Log giocatori coinvolti
        const attPlayers = [...resultA_C.details, ...resultA_A.details];
        const defPlayers = [...resultB_D.details, ...resultB_C.details];
        const eventLogs = [...(matchData.eventLog || [])];

        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'attack',
            message: `${attTeamName} attacca con: ${this.formatPlayersForLog(attPlayers)}`,
            type: 'action'
        });
        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'attack',
            message: `${defTeamName} difende con: ${this.formatPlayersForLog(defPlayers)}`,
            type: 'action'
        });

        if (attackResult >= 0) {
            // Passa a fase tiro - prima l'attaccante lancia d10 (o d6 se Titubanza/Sguardo Intimidatorio)
            const portiere = defFormation.P?.[0];
            const portiereInfo = portiere ? `${portiere.name}(P${portiere.currentLevel || portiere.level})` : 'Nessun portiere';

            // Determina dado tiro (normalmente d10)
            let shotDie = 'd10';
            let shotDieReason = '';

            // Titubanza (Attaccante negativa): dado diventa d6
            const hasTitubanza = attFormation.A?.some(p => p.abilities?.includes('Titubanza'));
            if (hasTitubanza) {
                shotDie = 'd6';
                shotDieReason = ' (Titubanza!)';
            }

            // Sguardo Intimidatorio (Portiere): 5% dado diventa d6
            if (portiere?.abilities?.includes('Sguardo Intimidatorio') && Math.random() < 0.05) {
                shotDie = 'd6';
                shotDieReason = ' (Sguardo Intimidatorio!)';
                eventLogs.push({
                    timestamp: Timestamp.now(),
                    occasion: matchData.currentOccasion,
                    phase: 'attack',
                    message: `👁️ ${portiere.name} attiva Sguardo Intimidatorio! Dado ridotto a d6`,
                    type: 'action'
                });
            }

            // Log con dado + modificatore chiaro e range
            const modTotaleAttacco = modA_C + modA_A + coachA;
            const modTotaleDifesa = modB_D + modB_C + coachB;
            const rangeAttMin = 1 + modTotaleAttacco;
            const rangeAttMax = 20 + modTotaleAttacco;
            const rangeDefMin = 1 + modTotaleDifesa;
            const rangeDefMax = 20 + modTotaleDifesa;

            eventLogs.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'attack',
                message: `📊 ${attTeamName}: 🎲${rollA} + ${modTotaleAttacco.toFixed(1)} = ${totalA.toFixed(1)} (range ${rangeAttMin.toFixed(0)}-${rangeAttMax.toFixed(0)})`,
                type: 'dice'
            });
            eventLogs.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'attack',
                message: `📊 ${defTeamName}: 🎲${rollB} + ${modTotaleDifesa.toFixed(1)} = ${totalB.toFixed(1)} (range ${rangeDefMin.toFixed(0)}-${rangeDefMax.toFixed(0)})`,
                type: 'dice'
            });
            eventLogs.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'attack',
                message: `⚔️ Attacco: ${totalA.toFixed(1)} vs ${totalB.toFixed(1)} → ${attackResult >= 0 ? 'SUCCESSO!' : 'Respinto'} (base ${Math.max(1, attackResult).toFixed(1)})`,
                type: 'action'
            });
            eventLogs.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'attack',
                message: `⚽ ${attTeamName} prepara il tiro! (lancia 1${shotDie}${shotDieReason})`,
                type: 'action'
            });

            await updateDoc(doc(window.db, matchPath), {
                currentPhase: 'shot',
                'phaseData.attackResult': Math.max(1, attackResult),
                'phaseData.attackModifier': totalA,
                'phaseData.defenseModifier': totalB,
                'diceState.waitingFor': matchData.attackingTeamId, // Attaccante lancia dado
                'diceState.diceType': shotDie,
                'diceState.purpose': 'shot_att',
                'diceState.result': null,
                'diceState.rolledAt': null,
                eventLog: eventLogs
            });
        } else {
            // 5% di passare comunque con risultato 5
            const luckyRoll = Math.floor(Math.random() * 100) + 1;
            if (luckyRoll <= 5) {
                // Determina dado tiro anche nel caso fortuna
                let shotDieLucky = 'd10';
                const hasTitubanzaLucky = attFormation.A?.some(p => p.abilities?.includes('Titubanza'));
                if (hasTitubanzaLucky) {
                    shotDieLucky = 'd6';
                }
                const portiereLucky = defFormation.P?.[0];
                if (portiereLucky?.abilities?.includes('Sguardo Intimidatorio') && Math.random() < 0.05) {
                    shotDieLucky = 'd6';
                }

                eventLogs.push({
                    timestamp: Timestamp.now(),
                    occasion: matchData.currentOccasion,
                    phase: 'attack',
                    message: `Attacco respinto ma ⭐ 5% fortuna! (${totalA.toFixed(1)} < ${totalB.toFixed(1)}) → Valore base 5`,
                    type: 'action'
                });
                eventLogs.push({
                    timestamp: Timestamp.now(),
                    occasion: matchData.currentOccasion,
                    phase: 'attack',
                    message: `⚽ ${attTeamName} prepara il tiro! (lancia 1${shotDieLucky})`,
                    type: 'action'
                });

                await updateDoc(doc(window.db, matchPath), {
                    currentPhase: 'shot',
                    'phaseData.attackResult': 5,
                    'diceState.waitingFor': matchData.attackingTeamId,
                    'diceState.diceType': shotDieLucky,
                    'diceState.purpose': 'shot_att',
                    'diceState.result': null,
                    'diceState.rolledAt': null,
                    eventLog: eventLogs
                });
            } else {
                // Attacco fallito
                eventLogs.push({
                    timestamp: Timestamp.now(),
                    occasion: matchData.currentOccasion,
                    phase: 'attack',
                    message: `❌ Attacco respinto: ${totalA.toFixed(1)} < ${totalB.toFixed(1)}`,
                    type: 'action'
                });
                await updateDoc(doc(window.db, matchPath), {
                    eventLog: eventLogs
                });
                await this.advanceToNextOccasion();
            }
        }
    },

    /**
     * Risolvi fase tiro
     * Formula: [1d20 + Mod. Portiere] - [1d10 + Valore Tiro Fase 2]
     */
    async resolveShotPhase() {
        const matchData = this.currentMatch;
        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchData.matchId);

        const isHomeAttacking = matchData.attackingTeamId === matchData.homeTeamId;
        const attFormation = isHomeAttacking ? matchData.homeFormation : matchData.awayFormation;
        const defFormation = isHomeAttacking ? matchData.awayFormation : matchData.homeFormation;
        const attTeamName = isHomeAttacking ? matchData.homeTeamName : matchData.awayTeamName;
        const defTeamName = isHomeAttacking ? matchData.awayTeamName : matchData.homeTeamName;

        const portiere = defFormation.P?.[0];
        if (!portiere) {
            // Nessun portiere = gol automatico
            await this.scoreGoal(`Nessun portiere! ${attTeamName} segna facilmente!`);
            return;
        }

        const hasIconaB = defFormation.formationInfo?.isIconaActive || false;
        const modPortiere = this.calculatePlayerModifier(portiere, hasIconaB, []);
        const coachB = (defFormation.coachLevel || 1) / 2;

        const rollP = matchData.diceState.result; // d20 del portiere
        let shotRoll = matchData.phaseData.shotRoll || 0; // d10 (o d6) dell'attaccante
        const attackResult = matchData.phaseData.attackResult; // Valore base dalla fase 2

        // Tiro Potente (D, C, A): 5% di tirare un secondo dado e prendere il più alto
        const allShooters = [...(attFormation.D || []), ...(attFormation.C || []), ...(attFormation.A || [])];
        const hasTiroPotente = allShooters.some(p => p.abilities?.includes('Tiro Potente'));
        let tiroPotenteBonusRoll = null;
        if (hasTiroPotente && Math.random() < 0.05) {
            // Determina il tipo di dado usato
            const shotDieType = matchData.diceState.diceType === 'd6' ? 6 : 10;
            tiroPotenteBonusRoll = Math.floor(Math.random() * shotDieType) + 1;
            if (tiroPotenteBonusRoll > shotRoll) {
                shotRoll = tiroPotenteBonusRoll;
            }
        }

        // Formula: [1d20 + Mod. Portiere + Coach] - [1d10 + Valore Tiro]
        const totalPortiere = rollP + modPortiere + coachB;
        let totalShot = shotRoll + attackResult;

        // Tiro dalla porta (Portiere attaccante): 5% aggiunge 1/2 modificatore portiere
        const portiereAttaccante = attFormation.P?.[0];
        let tiroDallaPortaBonus = 0;
        if (portiereAttaccante?.abilities?.includes('Tiro dalla porta') && Math.random() < 0.05) {
            const hasIconaA = attFormation.formationInfo?.isIconaActive || false;
            const modPortiereAtt = this.calculatePlayerModifier(portiereAttaccante, hasIconaA, []);
            tiroDallaPortaBonus = Math.floor(modPortiereAtt / 2);
            totalShot += tiroDallaPortaBonus;
        }

        const saveResult = totalPortiere - totalShot;

        // Prepara log dettagliato
        const eventLogs = [...(matchData.eventLog || [])];
        const portiereInfo = `${portiere.name}(P${portiere.currentLevel || portiere.level})`;
        const portiereAbilities = portiere.abilities?.filter(a =>
            ['Pugno di ferro', 'Uscita Kamikaze', 'Presa Sicura', 'Miracolo', 'Parata con i piedi', 'Sguardo Intimidatorio', 'Tiro dalla porta'].includes(a)
        ) || [];

        // Log abilità attivate
        if (tiroPotenteBonusRoll !== null) {
            const shooterWithTiroPotente = allShooters.find(p => p.abilities?.includes('Tiro Potente'));
            eventLogs.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'shot',
                message: `💪 ${shooterWithTiroPotente?.name || 'Giocatore'} attiva Tiro Potente! Secondo dado: ${tiroPotenteBonusRoll}`,
                type: 'action'
            });
        }

        if (tiroDallaPortaBonus > 0) {
            eventLogs.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'shot',
                message: `🥅 ${portiereAttaccante.name} attiva Tiro dalla porta! +${tiroDallaPortaBonus} al tiro`,
                type: 'action'
            });
        }

        // Log tiro attaccante con range
        // Determina il dado usato per il tiro (d6 se Titubanza o Sguardo Intimidatorio attivo)
        const originalShotRoll = matchData.phaseData.shotRoll || 0;
        const hadTitubanza = attFormation.A?.some(p => p.abilities?.includes('Titubanza'));
        const shotDieUsed = hadTitubanza || originalShotRoll <= 6 ? 'd6' : 'd10';
        const dieMax = shotDieUsed === 'd6' ? 6 : 10;
        const rangeTiroMin = 1 + attackResult + tiroDallaPortaBonus;
        const rangeTiroMax = dieMax + attackResult + tiroDallaPortaBonus;

        let shotLogMessage = `📊 Tiro: 🎲${shotRoll}`;
        if (tiroPotenteBonusRoll !== null && tiroPotenteBonusRoll > originalShotRoll) {
            shotLogMessage = `📊 Tiro: 🎲${originalShotRoll}→${shotRoll} (Potente!)`;
        }
        shotLogMessage += ` + ${attackResult.toFixed(1)}`;
        if (tiroDallaPortaBonus > 0) {
            shotLogMessage += ` + ${tiroDallaPortaBonus}`;
        }
        shotLogMessage += ` = ${totalShot.toFixed(1)} (range ${rangeTiroMin.toFixed(0)}-${rangeTiroMax.toFixed(0)})`;

        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'shot',
            message: shotLogMessage,
            type: 'dice'
        });

        // Log portiere con range
        const modTotPortiere = modPortiere + coachB;
        const rangeParataMin = 1 + modTotPortiere;
        const rangeParataMax = 20 + modTotPortiere;

        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'shot',
            message: `📊 ${portiere.name}: 🎲${rollP} + ${modTotPortiere.toFixed(1)} = ${totalPortiere.toFixed(1)} (range ${rangeParataMin.toFixed(0)}-${rangeParataMax.toFixed(0)})`,
            type: 'dice'
        });

        // Log confronto finale compatto
        const risultatoTesto = saveResult > 0 ? 'PARATA' : (saveResult === 0 ? '50/50' : 'GOL');
        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'shot',
            message: `🥅 ${totalPortiere.toFixed(1)} vs ${totalShot.toFixed(1)} = ${saveResult > 0 ? '+' : ''}${saveResult.toFixed(1)} → ${risultatoTesto}`,
            type: 'action'
        });

        let goal = false;
        let message = '';

        if (saveResult > 0) {
            // Parata!
            message = `🧤 PARATA di ${portiere.name}! (${totalPortiere.toFixed(1)} > ${totalShot.toFixed(1)})`;

            // 5% di gol comunque
            const luckyGoal = Math.floor(Math.random() * 100) + 1;
            if (luckyGoal <= 5) {
                goal = true;
                message = `⭐ Parata bucata! 5% fortuna (roll: ${luckyGoal})`;
                eventLogs.push({
                    timestamp: Timestamp.now(),
                    occasion: matchData.currentOccasion,
                    phase: 'shot',
                    message: `⭐ FORTUNA! Il tiro passa nonostante la parata!`,
                    type: 'action'
                });
            }
        } else if (saveResult === 0) {
            // 50/50
            const fiftyFifty = Math.floor(Math.random() * 100) + 1;
            goal = fiftyFifty <= 50;
            if (goal) {
                message = `⚖️ Pareggio perfetto! 50/50 (roll: ${fiftyFifty}) → GOL!`;
            } else {
                message = `⚖️ Pareggio perfetto! 50/50 (roll: ${fiftyFifty}) → Parato!`;
            }
            eventLogs.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'shot',
                message: `⚖️ 50/50! Roll: ${fiftyFifty} ${goal ? '≤50 GOL!' : '>50 Parato!'}`,
                type: 'action'
            });
        } else {
            // Gol!
            goal = true;
            message = `⚽ GOOOOOL! Tiro ${totalShot.toFixed(1)} batte ${portiere.name} ${totalPortiere.toFixed(1)}`;

            // Miracolo (5% salva se differenza < 3)
            if (portiere.abilities?.includes('Miracolo') && Math.abs(saveResult) < 3) {
                const miracoloRoll = Math.floor(Math.random() * 100) + 1;
                if (miracoloRoll <= 5) {
                    goal = false;
                    message = `✨ MIRACOLO di ${portiere.name}! Parata impossibile! (roll: ${miracoloRoll})`;
                    eventLogs.push({
                        timestamp: Timestamp.now(),
                        occasion: matchData.currentOccasion,
                        phase: 'shot',
                        message: `✨ MIRACOLO! ${portiere.name} compie una parata impossibile!`,
                        type: 'save'
                    });
                }
            }
        }

        // Aggiorna log prima di procedere
        await updateDoc(doc(window.db, matchPath), {
            eventLog: eventLogs
        });

        if (goal) {
            await this.scoreGoal(message);
        } else {
            await this.advanceToNextOccasion(message);
        }
    },

    /**
     * Genera marcatore e assistman plausibili in base alla formazione
     */
    generateScorerAndAssist(formation) {
        const attackers = formation.A || [];
        const midfielders = formation.C || [];
        const defenders = formation.D || [];

        // Pesi per la probabilita di segnare in base al ruolo e abilita
        const getScorerWeight = (player) => {
            let weight = 1;
            if (player.role === 'A') weight = 10;
            else if (player.role === 'C') weight = 4;
            else if (player.role === 'D') weight = 1;

            // Bonus per abilita offensive
            if (player.abilities?.includes('Bomber')) weight *= 2;
            if (player.abilities?.includes('Opportunista')) weight *= 1.5;
            if (player.abilities?.includes('Tiro Potente')) weight *= 1.3;
            if (player.abilities?.includes('Tiro a Giro')) weight *= 1.3;
            if (player.abilities?.includes('Tiro Fulmineo')) weight *= 1.3;
            if (player.abilities?.includes('Cross')) weight *= 0.7; // Crossatori fanno assist
            if (player.abilities?.includes('Regista')) weight *= 0.5; // Registi fanno assist

            // Livello influisce
            weight *= (player.currentLevel || player.level || 1) / 15;

            return weight;
        };

        const getAssistWeight = (player) => {
            let weight = 1;
            if (player.role === 'C') weight = 8;
            else if (player.role === 'A') weight = 4;
            else if (player.role === 'D') weight = 2;

            // Bonus per abilita di assist
            if (player.abilities?.includes('Cross')) weight *= 2.5;
            if (player.abilities?.includes('Regista')) weight *= 2;
            if (player.abilities?.includes('Visione di Gioco')) weight *= 1.8;
            if (player.abilities?.includes('Passaggio Corto')) weight *= 1.5;
            if (player.abilities?.includes('Mago del pallone')) weight *= 1.3;
            if (player.abilities?.includes('Tocco Di Velluto')) weight *= 1.3;
            if (player.abilities?.includes('Lancio lungo')) weight *= 1.2;
            if (player.abilities?.includes('Pivot')) weight *= 1.5;

            weight *= (player.currentLevel || player.level || 1) / 15;

            return weight;
        };

        // Tutti i giocatori che possono segnare (non portieri)
        const allPlayers = [...attackers, ...midfielders, ...defenders];

        // Selezione pesata del marcatore
        const scorerWeights = allPlayers.map(p => ({ player: p, weight: getScorerWeight(p) }));
        const totalScorerWeight = scorerWeights.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalScorerWeight;
        let scorer = null;
        for (const p of scorerWeights) {
            random -= p.weight;
            if (random <= 0) {
                scorer = p.player;
                break;
            }
        }
        if (!scorer && allPlayers.length > 0) {
            scorer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
        }

        // Selezione assistman (diverso dal marcatore)
        const assistCandidates = allPlayers.filter(p => p !== scorer);
        let assistMan = null;

        // 80% di probabilita di avere un assist
        if (Math.random() < 0.80 && assistCandidates.length > 0) {
            const assistWeights = assistCandidates.map(p => ({ player: p, weight: getAssistWeight(p) }));
            const totalAssistWeight = assistWeights.reduce((sum, p) => sum + p.weight, 0);
            random = Math.random() * totalAssistWeight;
            for (const p of assistWeights) {
                random -= p.weight;
                if (random <= 0) {
                    assistMan = p.player;
                    break;
                }
            }
            if (!assistMan) {
                assistMan = assistCandidates[Math.floor(Math.random() * assistCandidates.length)];
            }
        }

        return { scorer, assistMan };
    },

    /**
     * Calcola il minuto di gioco in base all'occasione
     * 20 occasioni = 90 minuti, con varianza
     */
    calculateMatchMinute(occasion) {
        // Base: occasione 1 = minuto ~5, occasione 20 = minuto ~90
        const baseMinute = Math.floor((occasion / 20) * 90);
        // Aggiungi varianza casuale (-2 a +2 minuti)
        const variance = Math.floor(Math.random() * 5) - 2;
        return Math.max(1, Math.min(90 + 4, baseMinute + variance)); // Max 94' (recupero)
    },

    /**
     * Segna un gol
     */
    async scoreGoal(message = 'GOOOOOL!') {
        const matchData = this.currentMatch;
        const { doc, updateDoc, getDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchData.matchId);

        // Rileggi il log aggiornato da Firestore
        const freshSnap = await getDoc(doc(window.db, matchPath));
        const freshData = freshSnap.exists() ? freshSnap.data() : matchData;

        const isHomeAttacking = matchData.attackingTeamId === matchData.homeTeamId;
        const newHomeScore = isHomeAttacking ? matchData.homeScore + 1 : matchData.homeScore;
        const newAwayScore = isHomeAttacking ? matchData.awayScore : matchData.awayScore + 1;

        const scorerTeamName = isHomeAttacking ? matchData.homeTeamName : matchData.awayTeamName;
        const attFormation = isHomeAttacking ? matchData.homeFormation : matchData.awayFormation;

        // Genera marcatore e assist
        const { scorer, assistMan } = this.generateScorerAndAssist(attFormation);

        // Calcola minuto di gioco
        const minute = this.calculateMatchMinute(matchData.currentOccasion);

        // Prepara messaggio gol dettagliato con minuto
        let goalDetail = '';
        if (scorer) {
            goalDetail = `${minute}' ⚽ ${scorer.name}`;
            if (assistMan) {
                goalDetail += ` (assist: ${assistMan.name})`;
            }
        }

        // Aggiorna statistiche gol nel match
        const goals = freshData.goals || [];
        goals.push({
            occasion: matchData.currentOccasion,
            minute: minute,
            teamId: matchData.attackingTeamId,
            teamName: scorerTeamName,
            scorer: scorer ? { name: scorer.name, role: scorer.role, level: scorer.currentLevel || scorer.level } : null,
            assistMan: assistMan ? { name: assistMan.name, role: assistMan.role, level: assistMan.currentLevel || assistMan.level } : null
        });

        // Aggiorna statistiche giocatori (gol e assist totali per la partita)
        const playerStats = freshData.playerStats || {};

        if (scorer) {
            const scorerKey = `${matchData.attackingTeamId}_${scorer.name}`;
            if (!playerStats[scorerKey]) {
                playerStats[scorerKey] = { name: scorer.name, role: scorer.role, teamId: matchData.attackingTeamId, goals: 0, assists: 0 };
            }
            playerStats[scorerKey].goals++;
        }

        if (assistMan) {
            const assistKey = `${matchData.attackingTeamId}_${assistMan.name}`;
            if (!playerStats[assistKey]) {
                playerStats[assistKey] = { name: assistMan.name, role: assistMan.role, teamId: matchData.attackingTeamId, goals: 0, assists: 0 };
            }
            playerStats[assistKey].assists++;
        }

        const eventLogs = [...(freshData.eventLog || [])];
        eventLogs.push({
            timestamp: Timestamp.now(),
            occasion: matchData.currentOccasion,
            phase: 'goal',
            message: `${minute}' ${message} - ${scorerTeamName} segna! (${newHomeScore}-${newAwayScore})`,
            type: 'goal'
        });

        if (goalDetail) {
            eventLogs.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'goal',
                message: goalDetail,
                type: 'goal'
            });
        }

        await updateDoc(doc(window.db, matchPath), {
            homeScore: newHomeScore,
            awayScore: newAwayScore,
            goals: goals,
            playerStats: playerStats,
            eventLog: eventLogs
        });

        // Piccola pausa poi prossima occasione
        setTimeout(() => {
            this.advanceToNextOccasion();
        }, 2000);
    },

    /**
     * Avanza alla prossima occasione
     */
    async advanceToNextOccasion(message = null) {
        const matchData = this.currentMatch;
        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchData.matchId);

        const nextOccasion = matchData.currentOccasion + 1;

        // Controlla se partita finita
        if (nextOccasion > this.config.TOTAL_OCCASIONS) {
            await this.completeMatch();
            return;
        }

        // Alterna squadra attaccante
        const nextAttacker = matchData.attackingTeamId === matchData.homeTeamId
            ? matchData.awayTeamId
            : matchData.homeTeamId;

        const nextAttackerName = nextAttacker === matchData.homeTeamId
            ? matchData.homeTeamName
            : matchData.awayTeamName;

        const eventLog = [...(matchData.eventLog || [])];
        if (message) {
            eventLog.push({
                timestamp: Timestamp.now(),
                occasion: matchData.currentOccasion,
                phase: 'result',
                message: message,
                type: 'action'
            });
        }

        eventLog.push({
            timestamp: Timestamp.now(),
            occasion: nextOccasion,
            phase: 'start',
            message: `Occasione ${nextOccasion} - ${nextAttackerName} attacca`,
            type: 'action'
        });

        await updateDoc(doc(window.db, matchPath), {
            currentOccasion: nextOccasion,
            currentPhase: 'construction',
            attackingTeamId: nextAttacker,
            'phaseData.attackRoll': null,
            'phaseData.defenseRoll': null,
            'phaseData.attackResult': null,
            'phaseData.successChance': null,
            'diceState.waitingFor': nextAttacker,
            'diceState.diceType': 'd20',
            'diceState.purpose': 'construction_att',
            'diceState.result': null,
            'diceState.rolledAt': null,
            eventLog: eventLog
        });
    },

    /**
     * Completa la partita
     */
    async completeMatch() {
        const matchData = this.currentMatch;
        const { doc, updateDoc, Timestamp } = window.firestoreTools;
        const matchPath = this.getMatchPath(matchData.matchId);

        let resultMessage = '';
        let winnerId = null;

        if (matchData.homeScore > matchData.awayScore) {
            resultMessage = `${matchData.homeTeamName} vince ${matchData.homeScore}-${matchData.awayScore}!`;
            winnerId = matchData.homeTeamId;
        } else if (matchData.awayScore > matchData.homeScore) {
            resultMessage = `${matchData.awayTeamName} vince ${matchData.awayScore}-${matchData.homeScore}!`;
            winnerId = matchData.awayTeamId;
        } else {
            resultMessage = `Pareggio ${matchData.homeScore}-${matchData.awayScore}!`;
        }

        await updateDoc(doc(window.db, matchPath), {
            status: 'completed',
            completedAt: Timestamp.now(),
            winnerId: winnerId,
            'diceState.waitingFor': null,
            eventLog: [...(matchData.eventLog || []), {
                timestamp: Timestamp.now(),
                occasion: this.config.TOTAL_OCCASIONS,
                phase: 'end',
                message: `FINE PARTITA! ${resultMessage}`,
                type: 'system'
            }]
        });

        // Processa scommessa
        if (matchData.bet?.amount > 0) {
            await this.processBetResult(matchData, winnerId);
        }
    },

    /**
     * Processa risultato scommessa
     */
    async processBetResult(matchData, winnerId) {
        // Usa la stessa logica di challenges.js
        if (window.Challenges?.processBetResult) {
            const homeTeam = { id: matchData.homeTeamId, teamName: matchData.homeTeamName };
            const awayTeam = { id: matchData.awayTeamId, teamName: matchData.awayTeamName };
            await window.Challenges.processBetResult(
                homeTeam, awayTeam,
                matchData.homeScore, matchData.awayScore,
                matchData
            );
        }
    },

    // ====================================================================
    // UI
    // ====================================================================

    /**
     * Mostra schermata partita (ottimizzata per mobile)
     */
    showMatchScreen(matchData) {
        // Rimuovi modal esistente
        document.getElementById('interactive-match-modal')?.remove();

        // Rileva se mobile
        const isMobile = window.innerWidth < 640;

        const modal = document.createElement('div');
        modal.id = 'interactive-match-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-95 z-[9999] flex flex-col overflow-hidden';

        // Previeni scroll su iOS
        modal.style.cssText = 'touch-action: none; -webkit-overflow-scrolling: touch;';

        modal.innerHTML = `
            <style>
                /* Stili ottimizzati per mobile */
                @media (max-width: 640px) {
                    #match-home-score, #match-away-score {
                        font-size: 2.5rem !important;
                    }
                    #match-occasion {
                        font-size: 0.875rem !important;
                    }
                    #match-phase {
                        font-size: 0.75rem !important;
                    }
                    #match-home-name, #match-away-name {
                        font-size: 0.7rem !important;
                        max-width: 80px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    #dice-display {
                        font-size: 3.5rem !important;
                    }
                    #roll-dice-btn {
                        font-size: 1rem !important;
                        padding: 1rem !important;
                    }
                    #phase-info {
                        padding: 1rem !important;
                    }
                    #phase-info p {
                        font-size: 0.9rem;
                    }
                    #event-log {
                        font-size: 0.7rem !important;
                    }
                }

                /* Animazione dado ottimizzata */
                @keyframes dice-shake {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    25% { transform: rotate(-15deg) scale(1.1); }
                    50% { transform: rotate(15deg) scale(1.15); }
                    75% { transform: rotate(-10deg) scale(1.1); }
                }
                .dice-shaking {
                    animation: dice-shake 0.1s ease-in-out;
                }
                .dice-result {
                    animation: dice-result 0.3s ease-out;
                }
                @keyframes dice-result {
                    0% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }

                /* Bottone touch-friendly */
                #roll-dice-btn {
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                    user-select: none;
                    min-height: 56px;
                }
                #roll-dice-btn:active {
                    transform: scale(0.95);
                    background-color: #16a34a;
                }

                /* Safe area per notch iPhone */
                .safe-area-top {
                    padding-top: env(safe-area-inset-top, 0);
                }
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 0);
                }
            </style>

            <!-- Header con punteggio (responsive) -->
            <div class="bg-gray-800 p-2 sm:p-4 border-b border-gray-700 safe-area-top">
                <div class="flex items-center justify-between max-w-4xl mx-auto">
                    <div class="text-center flex-1 min-w-0">
                        <p id="match-home-name" class="text-xs sm:text-sm font-bold truncate px-1" style="color: #f97316">Casa</p>
                        <p id="match-home-score" class="text-4xl sm:text-5xl font-bold text-white transition-all duration-300">0</p>
                    </div>
                    <div class="text-center px-2 sm:px-4 flex-shrink-0">
                        <p id="match-occasion" class="text-sm sm:text-lg text-yellow-400 font-bold">0/60</p>
                        <p id="match-phase" class="text-xs sm:text-sm text-gray-400">In attesa...</p>
                    </div>
                    <div class="text-center flex-1 min-w-0">
                        <p id="match-away-name" class="text-xs sm:text-sm font-bold truncate px-1" style="color: #06b6d4">Trasferta</p>
                        <p id="match-away-score" class="text-4xl sm:text-5xl font-bold text-white transition-all duration-300">0</p>
                    </div>
                </div>
            </div>

            <!-- Area centrale (flex-grow per occupare spazio) -->
            <div class="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden min-h-0">
                <!-- Info fase -->
                <div id="phase-info" class="max-w-lg w-full bg-gray-800 rounded-xl p-3 sm:p-6 mb-2 sm:mb-4 text-center">
                    <p class="text-gray-400">Caricamento partita...</p>
                </div>

                <!-- Area dado (touch-optimized) -->
                <div id="dice-area" class="hidden max-w-md w-full bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-yellow-500 shadow-lg shadow-yellow-500/20">
                    <p id="dice-prompt" class="text-base sm:text-lg text-yellow-400 mb-3 sm:mb-4 text-center font-medium">E' il tuo turno!</p>
                    <div id="dice-container" class="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 flex items-center justify-center bg-gray-800 rounded-xl border border-gray-700">
                        <div id="dice-display" class="text-5xl sm:text-6xl font-bold text-white">?</div>
                    </div>
                    <button id="roll-dice-btn" class="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold py-3 sm:py-4 rounded-xl text-lg sm:text-xl transition-all duration-150 shadow-lg">
                        🎲 LANCIA IL DADO
                    </button>
                </div>

                <!-- Attesa avversario -->
                <div id="waiting-area" class="hidden max-w-md w-full bg-gray-800 rounded-xl p-4 sm:p-6 text-center">
                    <p class="text-gray-300 mb-2 text-sm sm:text-base">In attesa dell'avversario...</p>
                    <div class="text-3xl sm:text-4xl animate-pulse">🎲</div>
                </div>
            </div>

            <!-- Log eventi (scrollable, piu visibile) -->
            <div class="bg-gray-800 border-t-2 border-yellow-600 max-h-40 sm:max-h-48 overflow-y-auto flex-shrink-0">
                <div class="bg-gray-900 px-3 py-1 border-b border-gray-700 sticky top-0">
                    <p class="text-xs text-yellow-400 font-bold uppercase tracking-wider">📜 Cronaca Partita</p>
                </div>
                <div id="event-log" class="p-3 space-y-2 text-sm sm:text-base font-mono">
                    <p class="text-gray-500 text-center">In attesa dell'inizio...</p>
                </div>
            </div>

            <!-- Status bar (con safe area bottom per iPhone) -->
            <div class="bg-gray-900 p-2 border-t border-gray-700 safe-area-bottom flex-shrink-0">
                <div class="flex justify-between items-center max-w-4xl mx-auto text-xs">
                    <span id="opponent-status" class="text-green-400 flex items-center gap-1">
                        <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Connessione...
                    </span>
                    <button id="btn-leave-match" class="text-red-400 hover:text-red-300 active:text-red-500 px-3 py-1 -mr-2">
                        Abbandona
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Previeni scroll della pagina sottostante
        document.body.style.overflow = 'hidden';

        // Event listener per lancio dado (touch + click)
        const rollBtn = document.getElementById('roll-dice-btn');
        if (rollBtn) {
            // Usa touchend per risposta immediata su mobile
            rollBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (!rollBtn.disabled) {
                    this.rollDice();
                }
            }, { passive: false });

            // Fallback click per desktop
            rollBtn.addEventListener('click', (e) => {
                // Evita doppio trigger su touch device
                if (e.pointerType !== 'touch' && !rollBtn.disabled) {
                    this.rollDice();
                }
            });
        }

        // Event listener per abbandono
        document.getElementById('btn-leave-match')?.addEventListener('click', () => {
            if (confirm('Sei sicuro di voler abbandonare? Perderai la partita!')) {
                this.leaveMatch();
            }
        });

        // Se abbiamo dati, aggiorna subito
        if (matchData) {
            this.updateMatchUI(matchData);
        }
    },

    /**
     * Aggiorna UI partita
     */
    updateMatchUI(matchData) {
        if (!matchData) return;

        // Colori squadre
        const homeColor = matchData.homeFormation?.primaryColor || '#f97316';
        const awayColor = matchData.awayFormation?.primaryColor || '#06b6d4';

        // Aggiorna punteggio
        const homeScoreEl = document.getElementById('match-home-score');
        const awayScoreEl = document.getElementById('match-away-score');
        const homeNameEl = document.getElementById('match-home-name');
        const awayNameEl = document.getElementById('match-away-name');
        const occasionEl = document.getElementById('match-occasion');
        const phaseEl = document.getElementById('match-phase');

        if (homeScoreEl) homeScoreEl.textContent = matchData.homeScore;
        if (awayScoreEl) awayScoreEl.textContent = matchData.awayScore;
        if (homeNameEl) {
            homeNameEl.textContent = matchData.homeTeamName;
            homeNameEl.style.color = homeColor;
        }
        if (awayNameEl) {
            awayNameEl.textContent = matchData.awayTeamName;
            awayNameEl.style.color = awayColor;
        }
        if (occasionEl) occasionEl.textContent = `Occasione ${matchData.currentOccasion}/${this.config.TOTAL_OCCASIONS}`;

        // Fase
        const phaseNames = {
            'waiting_start': 'In attesa di iniziare',
            'construction': 'Fase Costruzione',
            'attack': 'Fase Attacco',
            'shot': 'Fase Tiro',
            'result': 'Risultato'
        };
        if (phaseEl) phaseEl.textContent = phaseNames[matchData.currentPhase] || matchData.currentPhase;

        // Info fase
        this.updatePhaseInfo(matchData);

        // Area dado
        this.updateDiceArea(matchData);

        // Log eventi
        this.updateEventLog(matchData.eventLog || []);

        // Status avversario
        this.updateOpponentStatus(matchData);

        // Se in attesa di entrambi i giocatori
        if (matchData.status === 'waiting') {
            const bothConnected = Object.values(matchData.presence).every(p => p.connected);
            if (bothConnected && this.myTeamId === matchData.homeTeamId) {
                // Host avvia la partita
                this.startMatch();
            }
        }
    },

    /**
     * Aggiorna info fase
     */
    updatePhaseInfo(matchData) {
        const phaseInfo = document.getElementById('phase-info');
        if (!phaseInfo) return;

        const isMyTurn = matchData.diceState.waitingFor === this.myTeamId;
        const attackerName = matchData.attackingTeamId === matchData.homeTeamId
            ? matchData.homeTeamName : matchData.awayTeamName;
        const defenderName = matchData.attackingTeamId === matchData.homeTeamId
            ? matchData.awayTeamName : matchData.homeTeamName;

        // Colori squadre
        const homeColor = matchData.homeFormation?.primaryColor || '#f97316';
        const awayColor = matchData.awayFormation?.primaryColor || '#06b6d4';
        const attackerColor = matchData.attackingTeamId === matchData.homeTeamId ? homeColor : awayColor;
        const defenderColor = matchData.attackingTeamId === matchData.homeTeamId ? awayColor : homeColor;

        // Chi deve tirare
        const waitingForName = matchData.diceState.waitingFor === matchData.homeTeamId
            ? matchData.homeTeamName : matchData.awayTeamName;
        const waitingForColor = matchData.diceState.waitingFor === matchData.homeTeamId ? homeColor : awayColor;
        const isWaitingForAttacker = matchData.diceState.waitingFor === matchData.attackingTeamId;

        // Box chi deve tirare
        const turnIndicator = matchData.diceState.waitingFor ? `
            <div class="mt-3 p-3 rounded-lg border-2 ${isMyTurn ? 'bg-green-900/50 border-green-500' : 'bg-gray-700/50 border-gray-500'}">
                <p class="text-xs uppercase tracking-wider ${isMyTurn ? 'text-green-400' : 'text-gray-400'} mb-1">
                    ${isMyTurn ? '🎲 TOCCA A TE!' : '⏳ In attesa di...'}
                </p>
                <p class="text-lg font-bold" style="color: ${waitingForColor}">${waitingForName}</p>
                <p class="text-xs text-gray-400 mt-1">${this.getPurposeDescription(matchData.diceState.purpose)}</p>
            </div>
        ` : '';

        let html = '';

        switch (matchData.currentPhase) {
            case 'waiting_start':
                html = `
                    <p class="text-2xl text-yellow-400 font-bold mb-2">⏳ In Attesa</p>
                    <p class="text-gray-300">Attendi che l'avversario si connetta...</p>
                `;
                break;

            case 'construction':
                html = `
                    <p class="text-xl text-cyan-400 font-bold mb-2">⚙️ FASE COSTRUZIONE</p>
                    <p class="text-gray-300 mb-1">
                        <span style="color: ${attackerColor}" class="font-bold">${attackerName}</span>
                        costruisce l'azione
                    </p>
                    <p class="text-xs text-gray-500">Difensori + Centrocampisti vs Centrocampisti</p>
                    ${turnIndicator}
                `;
                break;

            case 'attack':
                html = `
                    <p class="text-xl text-orange-400 font-bold mb-2">⚔️ FASE ATTACCO</p>
                    <p class="text-gray-300 mb-1">
                        <span style="color: ${attackerColor}" class="font-bold">${attackerName}</span>
                        attacca
                        <span style="color: ${defenderColor}" class="font-bold">${defenderName}</span>!
                    </p>
                    <p class="text-xs text-gray-500">Centrocampisti + Attaccanti vs Difensori + Centrocampisti</p>
                    ${turnIndicator}
                `;
                break;

            case 'shot':
                html = `
                    <p class="text-xl text-red-400 font-bold mb-2">🥅 FASE TIRO!</p>
                    <p class="text-gray-300 mb-1">
                        Valore tiro: <span class="text-yellow-400 font-bold text-lg">${matchData.phaseData.attackResult?.toFixed(1) || '?'}</span>
                    </p>
                    <p class="text-xs text-gray-500">Il portiere di <span style="color: ${defenderColor}">${defenderName}</span> tenta la parata</p>
                    ${turnIndicator}
                `;
                break;
        }

        phaseInfo.innerHTML = html;
    },

    /**
     * Descrizione del purpose del dado
     */
    getPurposeDescription(purpose) {
        const descriptions = {
            'construction_att': 'Lancio costruzione (attaccante)',
            'construction_def': 'Lancio costruzione (difensore)',
            'construction_d100': 'Verifica costruzione (d100)',
            'attack_att': 'Lancio attacco',
            'attack_def': 'Lancio difesa',
            'shot_att': 'Lancio tiro (d10)',
            'shot_gk': 'Lancio portiere (d20)'
        };
        return descriptions[purpose] || purpose;
    },

    /**
     * Aggiorna area dado
     */
    updateDiceArea(matchData) {
        const diceArea = document.getElementById('dice-area');
        const waitingArea = document.getElementById('waiting-area');
        const diceDisplay = document.getElementById('dice-display');
        const dicePrompt = document.getElementById('dice-prompt');
        const rollBtn = document.getElementById('roll-dice-btn');

        if (!diceArea || !waitingArea) return;

        const isMyTurn = matchData.diceState.waitingFor === this.myTeamId;
        const hasRolled = matchData.diceState.result !== null;

        if (matchData.status !== 'inProgress') {
            diceArea.classList.add('hidden');
            waitingArea.classList.add('hidden');
            return;
        }

        if (isMyTurn && !hasRolled) {
            // Mio turno di lanciare
            diceArea.classList.remove('hidden');
            waitingArea.classList.add('hidden');

            const purposeNames = {
                'construction_att': 'Costruzione (Attacco)',
                'construction_def': 'Costruzione (Difesa)',
                'construction_d100': 'Verifica Costruzione',
                'attack_att': 'Attacco',
                'attack_def': 'Difesa',
                'shot_gk': 'Parata Portiere'
            };

            if (dicePrompt) {
                dicePrompt.textContent = `Lancia ${matchData.diceState.diceType} per ${purposeNames[matchData.diceState.purpose] || ''}`;
            }
            if (diceDisplay) diceDisplay.textContent = '?';
            if (rollBtn) rollBtn.disabled = false;

        } else if (hasRolled) {
            // Mostra risultato
            diceArea.classList.remove('hidden');
            waitingArea.classList.add('hidden');

            if (diceDisplay) diceDisplay.textContent = matchData.diceState.result;
            if (rollBtn) rollBtn.disabled = true;

        } else {
            // Attesa avversario
            diceArea.classList.add('hidden');
            waitingArea.classList.remove('hidden');
        }
    },

    /**
     * Mostra animazione dado (ottimizzata per mobile)
     */
    async showDiceAnimation(diceType, result) {
        const diceDisplay = document.getElementById('dice-display');
        const diceContainer = document.getElementById('dice-container');
        const rollBtn = document.getElementById('roll-dice-btn');

        if (!diceDisplay) return;

        // Disabilita bottone e cambia testo
        if (rollBtn) {
            rollBtn.disabled = true;
            rollBtn.textContent = '🎲 Lancio in corso...';
            rollBtn.classList.add('opacity-50');
        }

        // Animazione shake ottimizzata (usa CSS transform invece di reflow)
        const maxValue = parseInt(diceType.replace('d', ''));

        // Aggiungi classe animazione al container
        if (diceContainer) {
            diceContainer.classList.add('dice-shaking');
        }

        // Usa requestAnimationFrame per animazioni fluide
        const animationDuration = 800; // ms totali
        const frameCount = 8; // numero di frame
        const frameDelay = animationDuration / frameCount;

        for (let i = 0; i < frameCount; i++) {
            const randomValue = Math.floor(Math.random() * maxValue) + 1;
            diceDisplay.textContent = randomValue;

            // Aggiungi effetto vibrazione
            if (diceContainer) {
                diceContainer.style.transform = `rotate(${(Math.random() - 0.5) * 20}deg)`;
            }

            await this.sleep(frameDelay);
        }

        // Reset transform
        if (diceContainer) {
            diceContainer.classList.remove('dice-shaking');
            diceContainer.style.transform = '';
        }

        // Mostra risultato finale con animazione
        diceDisplay.textContent = result;
        diceDisplay.classList.add('dice-result', 'text-yellow-400');

        // Vibrazione haptic su mobile (se disponibile)
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 100]); // pattern: vibra, pausa, vibra
        }

        await this.sleep(400);
        diceDisplay.classList.remove('dice-result');

        // Ripristina bottone
        if (rollBtn) {
            rollBtn.textContent = '🎲 LANCIA IL DADO';
            rollBtn.classList.remove('opacity-50');
        }
    },

    /**
     * Aggiorna log eventi
     */
    updateEventLog(events) {
        const logEl = document.getElementById('event-log');
        if (!logEl) return;

        // Colori squadre
        const matchData = this.currentMatch;
        const homeColor = matchData?.homeFormation?.primaryColor || '#f97316';
        const awayColor = matchData?.awayFormation?.primaryColor || '#06b6d4';
        const homeName = matchData?.homeTeamName || 'Casa';
        const awayName = matchData?.awayTeamName || 'Trasferta';

        // Mostra ultimi 15 eventi (piu visibili)
        const recentEvents = events.slice(-15);

        logEl.innerHTML = recentEvents.map(event => {
            let bgClass = 'bg-transparent';
            let icon = '';
            let textStyle = 'color: #9ca3af'; // gray-400

            switch (event.type) {
                case 'goal':
                    bgClass = 'bg-green-900/30 border-l-4 border-green-500 pl-2';
                    icon = '⚽ ';
                    textStyle = 'color: #4ade80; font-weight: bold'; // green-400
                    break;
                case 'save':
                    bgClass = 'bg-yellow-900/20 border-l-2 border-yellow-600 pl-2';
                    icon = '🧤 ';
                    textStyle = 'color: #facc15'; // yellow-400
                    break;
                case 'dice':
                    icon = '🎲 ';
                    textStyle = 'color: #60a5fa'; // blue-400
                    break;
                case 'system':
                    bgClass = 'bg-purple-900/20';
                    icon = '📢 ';
                    textStyle = 'color: #c084fc'; // purple-400
                    break;
                case 'action':
                    icon = '▶️ ';
                    break;
            }

            // Colora i nomi delle squadre nel messaggio
            let message = event.message;
            if (homeName && message.includes(homeName)) {
                message = message.replace(new RegExp(homeName, 'g'),
                    `<span style="color: ${homeColor}; font-weight: bold">${homeName}</span>`);
            }
            if (awayName && message.includes(awayName)) {
                message = message.replace(new RegExp(awayName, 'g'),
                    `<span style="color: ${awayColor}; font-weight: bold">${awayName}</span>`);
            }

            return `
                <div class="py-1 ${bgClass} rounded">
                    <p style="${textStyle}">
                        <span class="text-gray-600 text-xs mr-1">${event.occasion}'</span>
                        ${icon}${message}
                    </p>
                </div>
            `;
        }).join('');

        // Scroll to bottom con animazione smooth
        logEl.scrollTo({ top: logEl.scrollHeight, behavior: 'smooth' });
    },

    /**
     * Aggiorna status avversario (con indicatore visivo)
     */
    updateOpponentStatus(matchData) {
        const statusEl = document.getElementById('opponent-status');
        if (!statusEl) return;

        const opponentId = this.myTeamId === matchData.homeTeamId
            ? matchData.awayTeamId : matchData.homeTeamId;

        const opponentPresence = matchData.presence[opponentId];

        if (opponentPresence?.connected) {
            statusEl.innerHTML = `
                <span class="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
                <span class="ml-1">Avversario online</span>
            `;
            statusEl.className = 'text-green-400 flex items-center gap-1';
        } else {
            statusEl.innerHTML = `
                <span class="w-2 h-2 bg-red-400 rounded-full inline-block animate-pulse"></span>
                <span class="ml-1">Disconnesso...</span>
            `;
            statusEl.className = 'text-red-400 flex items-center gap-1';
        }
    },

    /**
     * Genera HTML riepilogo marcatori con minuti e statistiche
     */
    generateScorersHtml(matchData) {
        const goals = matchData.goals || [];
        if (goals.length === 0) return '';

        // Raggruppa gol per squadra
        const homeGoals = goals.filter(g => g.teamId === matchData.homeTeamId);
        const awayGoals = goals.filter(g => g.teamId === matchData.awayTeamId);

        // Colori squadre
        const homeColor = matchData.homeFormation?.primaryColor || '#f97316';
        const awayColor = matchData.awayFormation?.primaryColor || '#06b6d4';

        const formatGoals = (teamGoals, teamName, color) => {
            if (teamGoals.length === 0) return '';

            // Raggruppa per marcatore con minuti
            const scorerMap = new Map();
            teamGoals.forEach(g => {
                if (g.scorer) {
                    const key = g.scorer.name;
                    if (!scorerMap.has(key)) {
                        scorerMap.set(key, { scorer: g.scorer, minutes: [], count: 0 });
                    }
                    scorerMap.get(key).minutes.push(g.minute || '?');
                    scorerMap.get(key).count++;
                }
            });

            // Raggruppa assist
            const assistMap = new Map();
            teamGoals.forEach(g => {
                if (g.assistMan) {
                    const key = g.assistMan.name;
                    if (!assistMap.has(key)) {
                        assistMap.set(key, { assistMan: g.assistMan, count: 0 });
                    }
                    assistMap.get(key).count++;
                }
            });

            let html = `<div class="mb-3">
                <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: ${color}">${teamName}</p>
                <div class="text-sm text-gray-300 space-y-1">`;

            // Marcatori con minuti
            const scorers = Array.from(scorerMap.values());
            scorers.forEach(s => {
                const minutesStr = s.minutes.map(m => `${m}'`).join(', ');
                html += `<div class="flex items-center gap-1">
                    <span class="text-white font-medium">⚽ ${s.scorer.name}</span>
                    <span class="text-yellow-500 text-xs">${minutesStr}</span>
                </div>`;
            });

            // Assist con conteggio
            const assists = Array.from(assistMap.values());
            if (assists.length > 0) {
                html += `<div class="mt-1 pt-1 border-t border-gray-700/50">
                    <span class="text-gray-500 text-xs">Assist: `;
                assists.forEach((a, i) => {
                    html += `<span class="text-cyan-400">${a.assistMan.name}</span>`;
                    if (a.count > 1) html += ` <span class="text-cyan-600">(${a.count})</span>`;
                    if (i < assists.length - 1) html += ', ';
                });
                html += `</span></div>`;
            }

            html += `</div></div>`;
            return html;
        };

        // Statistiche complessive dalla partita
        const playerStats = matchData.playerStats || {};
        const topScorers = Object.values(playerStats)
            .filter(p => p.goals > 0)
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 3);
        const topAssisters = Object.values(playerStats)
            .filter(p => p.assists > 0)
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 3);

        let html = `<div class="mt-4 pt-4 border-t border-gray-700 max-h-48 overflow-y-auto">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Tabellino</p>`;

        if (homeGoals.length > 0) {
            html += formatGoals(homeGoals, matchData.homeTeamName, homeColor);
        }
        if (awayGoals.length > 0) {
            html += formatGoals(awayGoals, matchData.awayTeamName, awayColor);
        }

        // Mostra statistiche top se ci sono multipli gol
        if (goals.length >= 3 && (topScorers.length > 0 || topAssisters.length > 0)) {
            html += `<div class="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-2 gap-2 text-xs">`;

            if (topScorers.length > 0) {
                html += `<div>
                    <p class="text-gray-500 mb-1">Top Marcatori</p>
                    ${topScorers.map(p => `<p class="text-gray-300">${p.name}: <span class="text-yellow-400 font-bold">${p.goals}</span></p>`).join('')}
                </div>`;
            }

            if (topAssisters.length > 0) {
                html += `<div>
                    <p class="text-gray-500 mb-1">Top Assist</p>
                    ${topAssisters.map(p => `<p class="text-gray-300">${p.name}: <span class="text-cyan-400 font-bold">${p.assists}</span></p>`).join('')}
                </div>`;
            }

            html += `</div>`;
        }

        html += `</div>`;
        return html;
    },

    /**
     * Mostra risultato finale (responsive)
     */
    showFinalResult(matchData) {
        const phaseInfo = document.getElementById('phase-info');
        if (!phaseInfo) return;

        let resultHtml = '';

        // Vibrazione haptic per il risultato
        if (navigator.vibrate) {
            const iWon = matchData.winnerId === this.myTeamId;
            if (iWon) {
                navigator.vibrate([100, 50, 100, 50, 200]); // Vittoria: pattern festivo
            } else if (matchData.homeScore !== matchData.awayScore) {
                navigator.vibrate([200]); // Sconfitta: singola vibrazione
            }
        }

        // Genera riepilogo marcatori
        const scorersHtml = this.generateScorersHtml(matchData);

        if (matchData.status === 'abandoned') {
            const iWon = matchData.winnerId === this.myTeamId;
            resultHtml = `
                <p class="text-2xl sm:text-3xl ${iWon ? 'text-green-400' : 'text-red-400'} font-bold mb-3 sm:mb-4">
                    ${iWon ? 'VITTORIA!' : 'SCONFITTA'}
                </p>
                <p class="text-lg sm:text-xl text-white mb-2">${matchData.homeScore} - ${matchData.awayScore}</p>
                <p class="text-sm sm:text-base text-gray-400">Partita abbandonata dall'avversario</p>
                ${scorersHtml}
                <button id="btn-close-match" class="mt-4 bg-gray-600 hover:bg-gray-500 active:bg-gray-700 text-white font-bold py-3 px-6 sm:px-8 rounded-xl min-h-[48px] touch-manipulation">
                    Chiudi
                </button>
            `;
        } else {
            const isDraw = matchData.homeScore === matchData.awayScore;
            const iWon = matchData.winnerId === this.myTeamId;

            let emoji = isDraw ? '🤝' : (iWon ? '🏆' : '😢');
            let resultText = isDraw ? 'PAREGGIO' : (iWon ? 'VITTORIA!' : 'SCONFITTA');
            let colorClass = isDraw ? 'text-yellow-400' : (iWon ? 'text-green-400' : 'text-red-400');

            resultHtml = `
                <p class="text-5xl sm:text-6xl mb-3 sm:mb-4">${emoji}</p>
                <p class="text-2xl sm:text-3xl ${colorClass} font-bold mb-3 sm:mb-4">${resultText}</p>
                <p class="text-3xl sm:text-4xl text-white mb-3 sm:mb-4">${matchData.homeScore} - ${matchData.awayScore}</p>
                ${scorersHtml}
                <button id="btn-close-match" class="mt-3 sm:mt-4 bg-gray-600 hover:bg-gray-500 active:bg-gray-700 text-white font-bold py-3 px-6 sm:px-8 rounded-xl min-h-[48px] touch-manipulation transition-all">
                    Chiudi
                </button>
            `;
        }

        phaseInfo.innerHTML = resultHtml;

        // Nascondi aree dado
        document.getElementById('dice-area')?.classList.add('hidden');
        document.getElementById('waiting-area')?.classList.add('hidden');

        // Event listener chiudi (touch-friendly)
        const closeBtn = document.getElementById('btn-close-match');
        if (closeBtn) {
            closeBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.closeMatch();
            }, { passive: false });

            closeBtn.addEventListener('click', () => {
                this.closeMatch();
            });
        }
    },

    /**
     * Abbandona partita
     */
    async leaveMatch() {
        if (this.currentMatch) {
            await this.handleAbandonment(this.currentMatch.matchId, this.myTeamId);
        }
        this.closeMatch();
    },

    /**
     * Chiudi modal partita
     */
    closeMatch() {
        this.stopMatchListener();
        this.stopPresenceHeartbeat();
        this.currentMatch = null;
        document.getElementById('interactive-match-modal')?.remove();

        // Ripristina scroll della pagina
        document.body.style.overflow = '';
    },

    /**
     * Gestisci partita non trovata
     */
    handleMatchNotFound() {
        if (window.Toast) window.Toast.error('Partita non trovata');
        this.closeMatch();
    },

    // ====================================================================
    // UTILITIES
    // ====================================================================

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Cleanup
     */
    destroy() {
        this.stopMatchListener();
        this.stopPresenceHeartbeat();
        this.currentMatch = null;
    }
};

console.log("Modulo Challenge-Match caricato.");
