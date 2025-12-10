//
// ====================================================================
// CHALLENGES.JS - Sistema Sfide tra Utenti con Scommesse CS
// ====================================================================
//

window.Challenges = {
    // Stato
    currentChallenge: null,
    unsubscribeChallenges: null,

    // Configurazione scommesse
    betConfig: {
        maxBet: 50,           // Massimo CS scommettibili
        cooldownMs: 60 * 60 * 1000  // 1 ora tra scommesse
    },

    // Path Firestore
    getChallengesPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/challenges` : null;
    },

    getTeamsPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/teams` : null;
    },

    /**
     * Inizializza il sistema sfide
     */
    init() {
        if (!window.FeatureFlags?.isEnabled('challenges')) {
            console.log("Sfide disabilitate");
            return;
        }
        this.startListeningForChallenges();
        console.log("Sistema Sfide inizializzato");
    },

    /**
     * Verifica se l'utente puo' scommettere (cooldown 1 ora)
     */
    async canBet() {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (!myTeamId) return { canBet: false, reason: "Nessuna squadra" };

        try {
            const lastBetKey = `fanta_last_bet_${myTeamId}`;
            const lastBetTime = localStorage.getItem(lastBetKey);

            if (lastBetTime) {
                const elapsed = Date.now() - parseInt(lastBetTime);
                if (elapsed < this.betConfig.cooldownMs) {
                    const remainingMs = this.betConfig.cooldownMs - elapsed;
                    const remainingMin = Math.ceil(remainingMs / 60000);
                    return {
                        canBet: false,
                        reason: `Devi aspettare ancora ${remainingMin} minuti per scommettere`,
                        remainingMs
                    };
                }
            }
            return { canBet: true };
        } catch (error) {
            console.error("Errore verifica cooldown scommessa:", error);
            return { canBet: true }; // In caso di errore, permetti
        }
    },

    /**
     * Registra timestamp ultima scommessa
     */
    recordBetTime() {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (myTeamId) {
            localStorage.setItem(`fanta_last_bet_${myTeamId}`, Date.now().toString());
        }
    },

    /**
     * Ottieni CS della squadra corrente
     */
    getMyCS() {
        const teamData = window.InterfacciaCore?.currentTeamData;
        return teamData?.crediti || teamData?.credits || 0;
    },

    /**
     * Mostra il modal per sfidare un'altra squadra
     */
    async showChallengeModal() {
        if (!window.FeatureFlags?.isEnabled('challenges')) {
            if (window.Toast) window.Toast.error("Le sfide non sono abilitate");
            return;
        }

        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (!myTeamId || myTeamId === 'admin') {
            if (window.Toast) window.Toast.error("Devi avere una squadra per sfidare");
            return;
        }

        // Verifica formazione
        const myTeam = window.InterfacciaCore?.currentTeamData;
        if (!myTeam?.formation?.titolari?.length) {
            if (window.Toast) window.Toast.warning("Imposta prima la tua formazione!");
            return;
        }

        // Verifica se puo' scommettere
        const betStatus = await this.canBet();
        const myCS = this.getMyCS();

        // Crea modal
        const modal = document.createElement('div');
        modal.id = 'challenge-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4 overflow-y-auto';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl max-w-md w-full p-6 border-2 border-orange-500 shadow-2xl my-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold text-orange-400 flex items-center gap-2">
                        <span>⚔️</span> Sfida una Squadra
                    </h2>
                    <button id="close-challenge-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <p class="text-gray-300 mb-4">Seleziona la squadra che vuoi sfidare. Ricevera' una notifica e potra' accettare o rifiutare.</p>

                <div class="mb-4">
                    <label class="block text-sm text-gray-400 mb-2">Squadra avversaria</label>
                    <select id="challenge-target-team" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        <option value="">Caricamento squadre...</option>
                    </select>
                </div>

                <div id="challenge-target-info" class="hidden mb-4 p-3 bg-gray-900 rounded-lg">
                    <p class="text-sm text-gray-400">Info squadra selezionata</p>
                </div>

                <!-- Sezione Scommessa CS -->
                <div class="mb-4 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-600/50 rounded-lg">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-bold text-yellow-400 flex items-center gap-2">
                            <span>💎</span> Scommessa CS
                        </h3>
                        <span class="text-sm text-gray-400">Hai: <span class="text-yellow-300 font-bold">${myCS}</span> CS</span>
                    </div>

                    ${!betStatus.canBet ? `
                        <div class="bg-red-900/30 border border-red-500/50 rounded p-3 mb-3">
                            <p class="text-red-400 text-sm flex items-center gap-2">
                                <span>⏱️</span> ${betStatus.reason}
                            </p>
                        </div>
                    ` : ''}

                    <div class="flex items-center gap-3">
                        <input type="range" id="challenge-bet-slider" min="0" max="${Math.min(this.betConfig.maxBet, myCS)}" value="0"
                            class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            ${!betStatus.canBet ? 'disabled' : ''}>
                        <div class="flex items-center gap-1 bg-gray-900 px-3 py-2 rounded-lg min-w-[80px] justify-center">
                            <span class="text-yellow-400 font-bold" id="challenge-bet-value">0</span>
                            <span class="text-gray-400 text-sm">CS</span>
                        </div>
                    </div>

                    <div class="flex justify-between mt-2 text-xs text-gray-500">
                        <span>0 CS (Amichevole)</span>
                        <span>Max ${Math.min(this.betConfig.maxBet, myCS)} CS</span>
                    </div>

                    <p class="text-xs text-gray-400 mt-3">
                        ${betStatus.canBet
                            ? '💡 Chi vince prende i CS scommessi. Pareggio = rimborso. Max 1 scommessa/ora.'
                            : '💡 Puoi comunque sfidare senza scommessa (illimitate).'
                        }
                    </p>
                </div>

                <div class="flex gap-3">
                    <button id="btn-send-challenge" class="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                        <span>⚔️</span> Invia Sfida
                    </button>
                    <button id="btn-cancel-challenge" class="px-6 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">
                        Annulla
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Aggiorna valore scommessa quando si muove lo slider
        const slider = document.getElementById('challenge-bet-slider');
        const valueDisplay = document.getElementById('challenge-bet-value');
        if (slider && valueDisplay) {
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
            });
        }

        // Carica squadre disponibili
        await this.loadAvailableTeams();

        // Event listeners
        document.getElementById('close-challenge-modal').addEventListener('click', () => modal.remove());
        document.getElementById('btn-cancel-challenge').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('btn-send-challenge').addEventListener('click', () => this.sendChallenge());

        document.getElementById('challenge-target-team').addEventListener('change', (e) => {
            this.showTargetInfo(e.target.value);
        });
    },

    /**
     * Carica squadre disponibili per la sfida
     */
    async loadAvailableTeams() {
        const select = document.getElementById('challenge-target-team');
        if (!select) return;

        const myTeamId = window.InterfacciaCore?.currentTeamId;

        try {
            const { collection, getDocs } = window.firestoreTools;
            const teamsPath = this.getTeamsPath();

            const snapshot = await getDocs(collection(window.db, teamsPath));
            const teams = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Escludi la propria squadra e squadre senza formazione
                if (doc.id !== myTeamId && data.teamName && data.formation?.titolari?.length) {
                    teams.push({
                        id: doc.id,
                        teamName: data.teamName,
                        formation: data.formation
                    });
                }
            });

            if (teams.length === 0) {
                select.innerHTML = '<option value="">Nessuna squadra disponibile</option>';
                return;
            }

            select.innerHTML = '<option value="">Seleziona squadra...</option>' +
                teams.map(t => `<option value="${t.id}">${t.teamName}</option>`).join('');

            // Salva dati per info
            this.availableTeams = teams;

        } catch (error) {
            console.error("Errore caricamento squadre:", error);
            select.innerHTML = '<option value="">Errore caricamento</option>';
        }
    },

    /**
     * Mostra info squadra selezionata
     */
    showTargetInfo(teamId) {
        const infoDiv = document.getElementById('challenge-target-info');
        if (!infoDiv || !teamId) {
            if (infoDiv) infoDiv.classList.add('hidden');
            return;
        }

        const team = this.availableTeams?.find(t => t.id === teamId);
        if (!team) {
            infoDiv.classList.add('hidden');
            return;
        }

        const titolariCount = team.formation?.titolari?.length || 0;

        infoDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl">⚽</div>
                <div>
                    <p class="font-bold text-white">${team.teamName}</p>
                    <p class="text-sm text-gray-400">${titolariCount} titolari in formazione</p>
                </div>
            </div>
        `;
        infoDiv.classList.remove('hidden');
    },

    /**
     * Invia sfida
     */
    async sendChallenge() {
        const targetTeamId = document.getElementById('challenge-target-team')?.value;
        if (!targetTeamId) {
            if (window.Toast) window.Toast.warning("Seleziona una squadra da sfidare");
            return;
        }

        const myTeamId = window.InterfacciaCore?.currentTeamId;
        const myTeamName = window.InterfacciaCore?.currentTeamData?.teamName || 'Squadra';

        // Ottieni importo scommessa
        const betAmount = parseInt(document.getElementById('challenge-bet-slider')?.value || 0);

        // Verifica CS sufficienti
        if (betAmount > 0) {
            const myCS = this.getMyCS();
            if (betAmount > myCS) {
                if (window.Toast) window.Toast.error("Non hai abbastanza CS!");
                return;
            }

            // Verifica cooldown scommessa
            const betStatus = await this.canBet();
            if (!betStatus.canBet) {
                if (window.Toast) window.Toast.error(betStatus.reason);
                return;
            }
        }

        const btn = document.getElementById('btn-send-challenge');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Invio...';

        try {
            const { collection, addDoc, Timestamp } = window.firestoreTools;
            const challengesPath = this.getChallengesPath();

            const targetTeam = this.availableTeams?.find(t => t.id === targetTeamId);

            const challenge = {
                fromTeamId: myTeamId,
                fromTeamName: myTeamName,
                toTeamId: targetTeamId,
                toTeamName: targetTeam?.teamName || 'Squadra',
                status: 'pending', // pending, accepted, declined, completed
                timestamp: Timestamp.now(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Scade in 24 ore
                bet: {
                    amount: betAmount,
                    fromTeamPaid: betAmount > 0, // Il mittente ha gia' "pagato" l'invio
                    toTeamAccepted: false        // Il destinatario deve ancora accettare
                }
            };

            await addDoc(collection(window.db, challengesPath), challenge);

            // Se c'e' scommessa, registra timestamp
            if (betAmount > 0) {
                this.recordBetTime();
            }

            const betText = betAmount > 0 ? ` (Scommessa: ${betAmount} CS)` : ' (Amichevole)';
            if (window.Toast) window.Toast.success(`Sfida inviata a ${targetTeam?.teamName}!${betText}`);

            // Chiudi modal
            document.getElementById('challenge-modal')?.remove();

        } catch (error) {
            console.error("Errore invio sfida:", error);
            if (window.Toast) window.Toast.error("Errore nell'invio della sfida");
            btn.disabled = false;
            btn.innerHTML = '<span>⚔️</span> Invia Sfida';
        }
    },

    /**
     * Ascolta sfide in arrivo
     */
    startListeningForChallenges() {
        const myTeamId = window.InterfacciaCore?.currentTeamId;
        if (!myTeamId || myTeamId === 'admin') return;

        if (!window.db || !window.firestoreTools) {
            // Riprova dopo
            setTimeout(() => this.startListeningForChallenges(), 2000);
            return;
        }

        try {
            const { collection, query, where, onSnapshot, orderBy } = window.firestoreTools;
            const challengesPath = this.getChallengesPath();

            if (!challengesPath) {
                setTimeout(() => this.startListeningForChallenges(), 2000);
                return;
            }

            // Ascolta sfide dove sono il destinatario
            const q = query(
                collection(window.db, challengesPath),
                where('toTeamId', '==', myTeamId),
                where('status', '==', 'pending')
            );

            this.unsubscribeChallenges = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const challenge = { id: change.doc.id, ...change.doc.data() };
                        this.showChallengeNotification(challenge);
                    }
                });
            }, (error) => {
                console.warn("Errore listener sfide:", error);
            });

            console.log("Listener sfide attivo per:", myTeamId);

        } catch (error) {
            console.error("Errore setup listener sfide:", error);
        }
    },

    /**
     * Mostra notifica sfida ricevuta
     */
    showChallengeNotification(challenge) {
        // Aggiungi notifica nel sistema notifiche
        if (window.Notifications && window.FeatureFlags?.isEnabled('notifications')) {
            window.Notifications.add({
                type: 'challenge',
                title: '⚔️ Sfida Ricevuta!',
                message: `${challenge.fromTeamName} ti ha sfidato!`,
                challengeId: challenge.id,
                action: { type: 'openChallenge', challengeId: challenge.id }
            });
        }

        // Mostra anche toast
        if (window.Toast) {
            window.Toast.info(`⚔️ ${challenge.fromTeamName} ti ha sfidato!`);
        }

        // Mostra modal di sfida
        this.showIncomingChallengeModal(challenge);
    },

    /**
     * Mostra modal sfida in arrivo
     */
    async showIncomingChallengeModal(challenge) {
        // Rimuovi modal esistente
        document.getElementById('incoming-challenge-modal')?.remove();

        const betAmount = challenge.bet?.amount || 0;
        const hasBet = betAmount > 0;
        const myCS = this.getMyCS();
        const canAffordBet = myCS >= betAmount;

        // Verifica se puo' scommettere (cooldown)
        const betStatus = await this.canBet();
        const canAcceptBet = hasBet ? (canAffordBet && betStatus.canBet) : true;

        const modal = document.createElement('div');
        modal.id = 'incoming-challenge-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4 overflow-y-auto';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl max-w-md w-full p-6 border-2 border-red-500 shadow-2xl animate-pulse-slow my-8">
                <div class="text-center mb-6">
                    <div class="text-6xl mb-4">⚔️</div>
                    <h2 class="text-3xl font-bold text-red-400">SFIDA!</h2>
                    <p class="text-gray-300 mt-2">Hai ricevuto una sfida</p>
                </div>

                <div class="bg-gray-900 rounded-lg p-4 mb-4">
                    <div class="flex items-center justify-between">
                        <div class="text-center flex-1">
                            <p class="text-lg font-bold text-orange-400">${challenge.fromTeamName}</p>
                            <p class="text-xs text-gray-500">Sfidante</p>
                        </div>
                        <div class="text-3xl text-red-500 px-4">VS</div>
                        <div class="text-center flex-1">
                            <p class="text-lg font-bold text-cyan-400">${challenge.toTeamName}</p>
                            <p class="text-xs text-gray-500">Tu</p>
                        </div>
                    </div>
                </div>

                ${hasBet ? `
                    <div class="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500 rounded-lg p-4 mb-4">
                        <div class="text-center">
                            <p class="text-yellow-400 font-bold text-lg flex items-center justify-center gap-2">
                                <span>💎</span> SCOMMESSA IN PALIO
                            </p>
                            <p class="text-3xl font-bold text-yellow-300 mt-2">${betAmount} CS</p>
                            <p class="text-xs text-gray-400 mt-2">Chi vince prende i CS scommessi dall'avversario!</p>
                            <p class="text-xs text-gray-500">In caso di pareggio, i CS vengono rimborsati.</p>

                            ${!canAffordBet ? `
                                <div class="mt-3 bg-red-900/50 border border-red-500 rounded p-2">
                                    <p class="text-red-400 text-sm">⚠️ Non hai abbastanza CS (hai ${myCS})</p>
                                </div>
                            ` : ''}

                            ${hasBet && !betStatus.canBet ? `
                                <div class="mt-3 bg-red-900/50 border border-red-500 rounded p-2">
                                    <p class="text-red-400 text-sm">⏱️ ${betStatus.reason}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : `
                    <div class="bg-gray-700 rounded-lg p-3 mb-4 text-center">
                        <p class="text-gray-300">🤝 Sfida Amichevole (senza scommessa)</p>
                    </div>
                `}

                <p class="text-sm text-gray-400 text-center mb-6">
                    Accettando la sfida, verra' simulata una partita tra le vostre squadre.
                    ${hasBet ? '<br><span class="text-yellow-400">Dovrai mettere in palio ' + betAmount + ' CS!</span>' : ''}
                </p>

                <div class="flex gap-3">
                    <button id="btn-accept-challenge" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 ${!canAcceptBet && hasBet ? 'opacity-50 cursor-not-allowed' : ''}" ${!canAcceptBet && hasBet ? 'disabled' : ''}>
                        <span>✅</span> ${hasBet ? 'Accetta Scommessa' : 'Accetta'}
                    </button>
                    <button id="btn-decline-challenge" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                        <span>❌</span> Rifiuta
                    </button>
                </div>
            </div>

            <style>
                @keyframes pulse-slow {
                    0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
                    50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.8); }
                }
                .animate-pulse-slow { animation: pulse-slow 2s infinite; }
            </style>
        `;

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('btn-accept-challenge').addEventListener('click', () => {
            if (!canAcceptBet && hasBet) {
                if (window.Toast) window.Toast.error("Non puoi accettare questa scommessa");
                return;
            }
            this.acceptChallenge(challenge);
            modal.remove();
        });

        document.getElementById('btn-decline-challenge').addEventListener('click', () => {
            this.declineChallenge(challenge);
            modal.remove();
        });
    },

    /**
     * Accetta sfida
     */
    async acceptChallenge(challenge) {
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const challengesPath = this.getChallengesPath();

            // Se c'e' scommessa, registra timestamp
            const betAmount = challenge.bet?.amount || 0;
            if (betAmount > 0) {
                this.recordBetTime();
            }

            // Aggiorna stato sfida
            await updateDoc(doc(window.db, challengesPath, challenge.id), {
                status: 'accepted',
                'bet.toTeamAccepted': true
            });

            if (window.Toast) window.Toast.success("Sfida accettata! Simulazione in corso...");

            // Esegui la simulazione
            await this.runChallengeMatch(challenge);

        } catch (error) {
            console.error("Errore accettazione sfida:", error);
            if (window.Toast) window.Toast.error("Errore nell'accettare la sfida");
        }
    },

    /**
     * Rifiuta sfida
     */
    async declineChallenge(challenge) {
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const challengesPath = this.getChallengesPath();

            await updateDoc(doc(window.db, challengesPath, challenge.id), {
                status: 'declined'
            });

            if (window.Toast) window.Toast.info("Sfida rifiutata");

        } catch (error) {
            console.error("Errore rifiuto sfida:", error);
        }
    },

    /**
     * Esegue la partita della sfida
     */
    async runChallengeMatch(challenge) {
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const teamsPath = this.getTeamsPath();
            const challengesPath = this.getChallengesPath();

            // Carica dati squadre
            const [homeDocSnap, awayDocSnap] = await Promise.all([
                getDoc(doc(window.db, teamsPath, challenge.fromTeamId)),
                getDoc(doc(window.db, teamsPath, challenge.toTeamId))
            ]);

            if (!homeDocSnap.exists() || !awayDocSnap.exists()) {
                throw new Error("Squadra non trovata");
            }

            const homeTeam = { id: homeDocSnap.id, ...homeDocSnap.data() };
            const awayTeam = { id: awayDocSnap.id, ...awayDocSnap.data() };

            // Verifica formazioni
            if (!homeTeam.formation?.titolari?.length || !awayTeam.formation?.titolari?.length) {
                throw new Error("Una delle squadre non ha la formazione impostata");
            }

            // Mostra modal risultato con simulazione
            this.showMatchSimulationModal(homeTeam, awayTeam, challenge);

        } catch (error) {
            console.error("Errore simulazione sfida:", error);
            if (window.Toast) window.Toast.error(error.message || "Errore nella simulazione");
        }
    },

    /**
     * Mostra modal con simulazione partita
     */
    showMatchSimulationModal(homeTeam, awayTeam, challenge) {
        const modal = document.createElement('div');
        modal.id = 'match-simulation-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center p-4 overflow-y-auto';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl max-w-2xl w-full p-6 border-2 border-green-500 shadow-2xl my-8">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-green-400 mb-2">⚽ Partita in Corso...</h2>
                    <div class="flex items-center justify-center gap-4">
                        <span class="text-xl font-bold text-orange-400">${homeTeam.teamName}</span>
                        <span class="text-gray-500">vs</span>
                        <span class="text-xl font-bold text-cyan-400">${awayTeam.teamName}</span>
                    </div>
                </div>

                <!-- Punteggio Live -->
                <div class="bg-gray-900 rounded-xl p-6 mb-6">
                    <div class="flex items-center justify-center gap-8">
                        <div class="text-center">
                            <p class="text-sm text-gray-400 mb-1">${homeTeam.teamName}</p>
                            <p id="home-score" class="text-5xl font-bold text-white">0</p>
                        </div>
                        <div class="text-4xl text-gray-600">-</div>
                        <div class="text-center">
                            <p class="text-sm text-gray-400 mb-1">${awayTeam.teamName}</p>
                            <p id="away-score" class="text-5xl font-bold text-white">0</p>
                        </div>
                    </div>
                    <div class="text-center mt-4">
                        <span id="match-minute" class="text-lg text-green-400 font-mono">0'</span>
                    </div>
                </div>

                <!-- Log Eventi -->
                <div class="bg-gray-900 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto">
                    <h3 class="text-sm font-bold text-gray-400 mb-2">Eventi Partita</h3>
                    <div id="match-events" class="space-y-2 text-sm">
                        <p class="text-gray-500 text-center">La partita sta per iniziare...</p>
                    </div>
                </div>

                <!-- Bottoni -->
                <div id="match-buttons" class="hidden">
                    <div class="flex gap-3 flex-wrap justify-center">
                        <button id="btn-close-match" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition">
                            Chiudi
                        </button>
                        <button id="btn-view-replay" class="hidden bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition flex items-center gap-2">
                            <span>🎬</span> Vedi Replay
                        </button>
                        <button id="btn-view-highlights" class="hidden bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg transition flex items-center gap-2">
                            <span>⭐</span> Solo Highlights
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Esegui simulazione con animazione
        this.animateMatchSimulation(homeTeam, awayTeam, challenge, modal);
    },

    /**
     * Anima la simulazione partita
     */
    async animateMatchSimulation(homeTeam, awayTeam, challenge, modal) {
        const homeScoreEl = document.getElementById('home-score');
        const awayScoreEl = document.getElementById('away-score');
        const minuteEl = document.getElementById('match-minute');
        const eventsEl = document.getElementById('match-events');
        const buttonsEl = document.getElementById('match-buttons');

        // Esegui simulazione reale
        const result = window.ChampionshipSimulation?.runSimulationWithLog?.(homeTeam, awayTeam);

        if (!result) {
            eventsEl.innerHTML = '<p class="text-red-400">Errore nella simulazione</p>';
            buttonsEl.classList.remove('hidden');
            document.getElementById('btn-close-match').addEventListener('click', () => modal.remove());
            return;
        }

        // Prepara eventi da mostrare
        const events = [];
        let homeGoals = 0;
        let awayGoals = 0;

        // Parsa il log semplice per estrarre eventi
        if (result.simpleLog) {
            result.simpleLog.forEach((line, idx) => {
                const minute = Math.floor((idx / result.simpleLog.length) * 90);

                if (line.includes('GOL') || line.includes('GOAL') || line.includes('⚽')) {
                    const isHome = line.includes(homeTeam.teamName);
                    events.push({
                        minute,
                        type: 'goal',
                        team: isHome ? 'home' : 'away',
                        text: line
                    });
                } else if (line.includes('Parata') || line.includes('PARATA')) {
                    events.push({
                        minute,
                        type: 'save',
                        text: line
                    });
                } else if (line.trim() && !line.startsWith('---')) {
                    events.push({
                        minute,
                        type: 'action',
                        text: line
                    });
                }
            });
        }

        // Se non ci sono eventi dal log, crea eventi base dai gol
        if (events.length === 0) {
            for (let i = 0; i < result.homeGoals; i++) {
                events.push({
                    minute: Math.floor(Math.random() * 90),
                    type: 'goal',
                    team: 'home',
                    text: `⚽ GOL! ${homeTeam.teamName} segna!`
                });
            }
            for (let i = 0; i < result.awayGoals; i++) {
                events.push({
                    minute: Math.floor(Math.random() * 90),
                    type: 'goal',
                    team: 'away',
                    text: `⚽ GOL! ${awayTeam.teamName} segna!`
                });
            }
            events.sort((a, b) => a.minute - b.minute);
        }

        // Anima eventi
        eventsEl.innerHTML = '';
        let currentMinute = 0;

        for (const event of events) {
            // Aggiorna minuto
            while (currentMinute < event.minute) {
                currentMinute += 5;
                minuteEl.textContent = `${Math.min(currentMinute, 90)}'`;
                await this.sleep(100);
            }

            // Mostra evento
            const eventEl = document.createElement('div');
            let eventClass = 'text-gray-300';
            let prefix = '';

            if (event.type === 'goal') {
                eventClass = event.team === 'home' ? 'text-orange-400 font-bold' : 'text-cyan-400 font-bold';
                prefix = '⚽ ';

                // Aggiorna punteggio
                if (event.team === 'home') {
                    homeGoals++;
                    homeScoreEl.textContent = homeGoals;
                    homeScoreEl.classList.add('animate-bounce');
                    setTimeout(() => homeScoreEl.classList.remove('animate-bounce'), 500);
                } else {
                    awayGoals++;
                    awayScoreEl.textContent = awayGoals;
                    awayScoreEl.classList.add('animate-bounce');
                    setTimeout(() => awayScoreEl.classList.remove('animate-bounce'), 500);
                }
            } else if (event.type === 'save') {
                eventClass = 'text-yellow-400';
                prefix = '🧤 ';
            }

            eventEl.className = eventClass;
            eventEl.innerHTML = `<span class="text-gray-500">${event.minute}'</span> ${prefix}${event.text}`;
            eventsEl.appendChild(eventEl);
            eventsEl.scrollTop = eventsEl.scrollHeight;

            await this.sleep(event.type === 'goal' ? 800 : 300);
        }

        // Fine partita
        minuteEl.textContent = "90' - FINE";
        homeScoreEl.textContent = result.homeGoals;
        awayScoreEl.textContent = result.awayGoals;

        const finalEvent = document.createElement('div');
        finalEvent.className = 'text-green-400 font-bold text-center mt-4 text-lg';
        finalEvent.textContent = '🏁 FINE PARTITA!';
        eventsEl.appendChild(finalEvent);

        // Determina vincitore
        let winnerText = '';
        if (result.homeGoals > result.awayGoals) {
            winnerText = `🏆 ${homeTeam.teamName} vince!`;
        } else if (result.awayGoals > result.homeGoals) {
            winnerText = `🏆 ${awayTeam.teamName} vince!`;
        } else {
            winnerText = '🤝 Pareggio!';
        }

        const winnerEl = document.createElement('div');
        winnerEl.className = 'text-white font-bold text-center mt-2 text-xl';
        winnerEl.textContent = winnerText;
        eventsEl.appendChild(winnerEl);

        // Processa scommessa se presente
        const betResult = await this.processBetResult(homeTeam, awayTeam, result.homeGoals, result.awayGoals, challenge);

        if (betResult.hasBet) {
            await this.sleep(500);

            const betResultEl = document.createElement('div');
            betResultEl.className = 'mt-4 p-3 rounded-lg text-center';

            if (betResult.error) {
                betResultEl.classList.add('bg-red-900/50', 'border', 'border-red-500');
                betResultEl.innerHTML = `<p class="text-red-400">⚠️ ${betResult.message}</p>`;
            } else if (betResult.isDraw) {
                betResultEl.classList.add('bg-gray-700', 'border', 'border-gray-500');
                betResultEl.innerHTML = `
                    <p class="text-yellow-400 font-bold text-lg">💎 SCOMMESSA</p>
                    <p class="text-gray-300">${betResult.message}</p>
                `;
            } else {
                const myTeamId = window.InterfacciaCore?.currentTeamId;
                const iWon = myTeamId === betResult.winnerId;

                if (iWon) {
                    betResultEl.classList.add('bg-green-900/50', 'border', 'border-green-500');
                    betResultEl.innerHTML = `
                        <p class="text-green-400 font-bold text-lg">💎 HAI VINTO!</p>
                        <p class="text-2xl font-bold text-yellow-300">+${betResult.winnings} CS</p>
                        ${betResult.multiplierReason ? `<p class="text-xs text-gray-400 mt-1">${betResult.multiplierReason}</p>` : ''}
                    `;
                } else {
                    betResultEl.classList.add('bg-red-900/50', 'border', 'border-red-500');
                    betResultEl.innerHTML = `
                        <p class="text-red-400 font-bold text-lg">💎 HAI PERSO</p>
                        <p class="text-2xl font-bold text-red-300">-${betResult.betAmount} CS</p>
                        <p class="text-xs text-gray-400 mt-1">${betResult.winnerName} vince ${betResult.winnings} CS</p>
                    `;
                }
            }

            eventsEl.appendChild(betResultEl);
            eventsEl.scrollTop = eventsEl.scrollHeight;
        }

        // Mostra bottoni
        buttonsEl.classList.remove('hidden');

        // Verifica flag animazioni
        const fullAnimEnabled = window.FeatureFlags?.isEnabled('matchAnimations');
        const highlightsEnabled = window.FeatureFlags?.isEnabled('matchHighlights');

        if (fullAnimEnabled) {
            const replayBtn = document.getElementById('btn-view-replay');
            replayBtn.classList.remove('hidden');
            replayBtn.addEventListener('click', () => {
                modal.remove();
                if (window.MatchAnimations) {
                    window.MatchAnimations.open({
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        result: `${result.homeGoals}-${result.awayGoals}`,
                        highlightsOnly: false
                    });
                }
            });
        }

        if (highlightsEnabled) {
            const highlightsBtn = document.getElementById('btn-view-highlights');
            highlightsBtn.classList.remove('hidden');
            highlightsBtn.addEventListener('click', () => {
                modal.remove();
                if (window.MatchAnimations) {
                    window.MatchAnimations.open({
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        result: `${result.homeGoals}-${result.awayGoals}`,
                        highlightsOnly: true
                    });
                }
            });
        }

        document.getElementById('btn-close-match').addEventListener('click', () => modal.remove());

        // Aggiorna sfida come completata
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const challengesPath = this.getChallengesPath();

            const updateData = {
                status: 'completed',
                result: {
                    homeGoals: result.homeGoals,
                    awayGoals: result.awayGoals
                }
            };

            // Aggiungi info scommessa se presente
            if (betResult.hasBet) {
                updateData.betResult = {
                    isDraw: betResult.isDraw || false,
                    winnerId: betResult.winnerId || null,
                    loserId: betResult.loserId || null,
                    betAmount: betResult.betAmount,
                    winnings: betResult.winnings || 0,
                    multiplier: betResult.multiplier || 1
                };
            }

            await updateDoc(doc(window.db, challengesPath, challenge.id), updateData);
        } catch (e) {
            console.warn("Errore aggiornamento sfida:", e);
        }
    },

    /**
     * Helper sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Calcola la media livello rosa di una squadra
     */
    calculateTeamAverage(team) {
        const rosa = team.rosa || team.players || [];
        if (rosa.length === 0) return 0;

        const totalLevel = rosa.reduce((sum, player) => {
            const level = player.level || player.livello || 1;
            return sum + level;
        }, 0);

        return totalLevel / rosa.length;
    },

    /**
     * Gestisce il trasferimento CS in base al risultato
     * @param {Object} homeTeam - Squadra casa
     * @param {Object} awayTeam - Squadra trasferta
     * @param {number} homeGoals - Gol casa
     * @param {number} awayGoals - Gol trasferta
     * @param {Object} challenge - Dati sfida con scommessa
     * @returns {Object} Info sul trasferimento
     */
    async processBetResult(homeTeam, awayTeam, homeGoals, awayGoals, challenge) {
        const betAmount = challenge.bet?.amount || 0;
        if (betAmount === 0) return { hasBet: false };

        const isDraw = homeGoals === awayGoals;
        const homeWins = homeGoals > awayGoals;

        // Calcola medie rosa
        const homeAvg = this.calculateTeamAverage(homeTeam);
        const awayAvg = this.calculateTeamAverage(awayTeam);
        const avgDiff = homeAvg - awayAvg;

        let winnerId, loserId, winnerName, loserName, winnerAvg, loserAvg;

        if (isDraw) {
            // Pareggio: rimborso (nessun trasferimento)
            return {
                hasBet: true,
                isDraw: true,
                betAmount,
                message: `Pareggio! I ${betAmount} CS vengono rimborsati ad entrambe le squadre.`
            };
        }

        if (homeWins) {
            winnerId = homeTeam.id;
            loserId = awayTeam.id;
            winnerName = homeTeam.teamName;
            loserName = awayTeam.teamName;
            winnerAvg = homeAvg;
            loserAvg = awayAvg;
        } else {
            winnerId = awayTeam.id;
            loserId = homeTeam.id;
            winnerName = awayTeam.teamName;
            loserName = homeTeam.teamName;
            winnerAvg = awayAvg;
            loserAvg = homeAvg;
        }

        // Calcola moltiplicatore in base alla differenza media
        // Se vincitore ha media >= 2.0 superiore: x0.75 (favorito vince)
        // Se vincitore ha media >= 2.0 inferiore: x1.25 (underdog vince)
        const winnerAdvantage = winnerAvg - loserAvg;
        let multiplier = 1.0;
        let multiplierReason = '';

        if (winnerAdvantage >= 2.0) {
            // Il vincitore era il favorito (media piu' alta)
            multiplier = 0.75;
            multiplierReason = `(media rosa +${winnerAdvantage.toFixed(1)} = x0.75)`;
        } else if (winnerAdvantage <= -2.0) {
            // Il vincitore era l'underdog (media piu' bassa)
            multiplier = 1.25;
            multiplierReason = `(underdog! media rosa ${winnerAdvantage.toFixed(1)} = x1.25)`;
        }

        const winnings = Math.floor(betAmount * multiplier);

        // Trasferisci CS
        try {
            const { doc, getDoc, updateDoc } = window.firestoreTools;
            const teamsPath = this.getTeamsPath();

            // Ottieni dati aggiornati delle squadre
            const [winnerDoc, loserDoc] = await Promise.all([
                getDoc(doc(window.db, teamsPath, winnerId)),
                getDoc(doc(window.db, teamsPath, loserId))
            ]);

            if (winnerDoc.exists() && loserDoc.exists()) {
                const winnerData = winnerDoc.data();
                const loserData = loserDoc.data();

                const winnerCredits = winnerData.crediti || winnerData.credits || 0;
                const loserCredits = loserData.crediti || loserData.credits || 0;

                // Aggiorna crediti
                await Promise.all([
                    updateDoc(doc(window.db, teamsPath, winnerId), {
                        crediti: winnerCredits + winnings
                    }),
                    updateDoc(doc(window.db, teamsPath, loserId), {
                        crediti: Math.max(0, loserCredits - betAmount)
                    })
                ]);

                // Aggiorna dati locali se necessario
                const myTeamId = window.InterfacciaCore?.currentTeamId;
                if (myTeamId === winnerId) {
                    if (window.InterfacciaCore?.currentTeamData) {
                        window.InterfacciaCore.currentTeamData.crediti = winnerCredits + winnings;
                    }
                } else if (myTeamId === loserId) {
                    if (window.InterfacciaCore?.currentTeamData) {
                        window.InterfacciaCore.currentTeamData.crediti = Math.max(0, loserCredits - betAmount);
                    }
                }

                return {
                    hasBet: true,
                    isDraw: false,
                    winnerId,
                    loserId,
                    winnerName,
                    loserName,
                    betAmount,
                    winnings,
                    multiplier,
                    multiplierReason,
                    message: multiplier !== 1.0
                        ? `${winnerName} vince ${winnings} CS! ${multiplierReason}`
                        : `${winnerName} vince ${winnings} CS!`
                };
            }
        } catch (error) {
            console.error("Errore trasferimento CS:", error);
            return {
                hasBet: true,
                error: true,
                message: "Errore nel trasferimento CS"
            };
        }

        return { hasBet: false };
    },

    /**
     * Cleanup
     */
    destroy() {
        if (this.unsubscribeChallenges) {
            this.unsubscribeChallenges();
            this.unsubscribeChallenges = null;
        }
    }
};

// Init quando DOM pronto e utente loggato
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che l'utente sia loggato
    const checkAndInit = () => {
        if (window.InterfacciaCore?.currentTeamId && window.db) {
            window.Challenges.init();
        } else {
            setTimeout(checkAndInit, 2000);
        }
    };
    setTimeout(checkAndInit, 2000);
});

console.log("Modulo Challenges caricato.");
