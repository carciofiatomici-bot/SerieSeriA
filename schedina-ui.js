//
// ====================================================================
// SCHEDINA-UI.JS - Interfaccia Utente Schedina Pronostici
// ====================================================================
//

window.SchedinaUI = {
    // Stato UI
    modal: null,
    isOpen: false,
    currentRound: null,
    predictions: {},        // { matchKey: '1' | 'X' | '2' }
    existingPrediction: null,
    countdownInterval: null,

    // ==================== INIZIALIZZAZIONE ====================

    /**
     * Inizializza il modulo UI
     */
    init() {
        this.createModal();
        console.log('[SchedinaUI] Inizializzato');
    },

    /**
     * Crea il modal
     */
    createModal() {
        if (this.modal) return;

        this.modal = document.createElement('div');
        this.modal.id = 'schedina-modal';
        this.modal.className = 'fixed inset-0 z-[9999] bg-black bg-opacity-80 hidden flex items-center justify-center p-4';
        this.modal.innerHTML = `
            <div class="bg-gray-900 rounded-xl border-2 border-green-500 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <!-- Header -->
                <div class="bg-gradient-to-r from-green-700 to-emerald-600 p-4 flex justify-between items-center">
                    <div>
                        <h2 class="text-xl font-bold text-white flex items-center gap-2">
                            <span class="text-2xl">🎯</span> Schedina Pronostici
                        </h2>
                        <p id="schedina-round-info" class="text-green-200 text-sm mt-1"></p>
                    </div>
                    <button id="schedina-close-btn" class="text-white hover:text-green-200 text-2xl font-bold">&times;</button>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-gray-700">
                    <button class="schedina-tab flex-1 py-3 text-center font-semibold bg-green-600 text-white" data-tab="current">
                        Prossima Giornata
                    </button>
                    <button class="schedina-tab flex-1 py-3 text-center font-semibold bg-gray-700 text-gray-300 hover:bg-gray-600" data-tab="history">
                        Storico
                    </button>
                </div>

                <!-- Countdown -->
                <div id="schedina-countdown-container" class="px-4 pt-4 hidden">
                    <div class="bg-yellow-900/30 border border-yellow-500 rounded-lg p-3 text-center">
                        <p class="text-yellow-400 text-sm font-semibold">Pronostici chiudono tra:</p>
                        <p id="schedina-countdown" class="text-2xl font-bold text-white mt-1">--:--:--</p>
                    </div>
                </div>

                <!-- Content -->
                <div id="schedina-content" class="flex-1 overflow-y-auto p-4">
                    <!-- Contenuto dinamico -->
                </div>

                <!-- Footer con bottone Invia -->
                <div id="schedina-footer" class="p-4 border-t border-gray-700 hidden">
                    <button id="schedina-submit-btn" class="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-bold text-lg transition">
                        Invia Schedina
                    </button>
                    <p id="schedina-submit-status" class="text-center text-sm text-gray-400 mt-2"></p>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Event listeners
        document.getElementById('schedina-close-btn').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Tab switching
        this.modal.querySelectorAll('.schedina-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.modal.querySelectorAll('.schedina-tab').forEach(t => {
                    t.classList.remove('bg-green-600', 'text-white');
                    t.classList.add('bg-gray-700', 'text-gray-300');
                });
                tab.classList.remove('bg-gray-700', 'text-gray-300');
                tab.classList.add('bg-green-600', 'text-white');
                this.renderTab(tab.dataset.tab);
            });
        });

        // Submit button
        document.getElementById('schedina-submit-btn').addEventListener('click', () => this.submitPredictions());
    },

    // ==================== APERTURA/CHIUSURA ====================

    /**
     * Apre il pannello schedina
     */
    async open() {
        if (!window.Schedina?.isEnabled()) {
            window.Toast?.warning('Schedina non disponibile');
            return;
        }

        if (!this.modal) this.init();

        this.modal.classList.remove('hidden');
        this.isOpen = true;

        // Carica dati prossima giornata
        await this.loadCurrentRound();
        this.renderTab('current');
    },

    /**
     * Chiude il pannello
     */
    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        this.isOpen = false;
        this.stopCountdown();
    },

    // ==================== RENDERING ====================

    /**
     * Carica dati della giornata corrente
     */
    async loadCurrentRound() {
        const content = document.getElementById('schedina-content');
        content.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
            </div>
        `;

        try {
            this.currentRound = await window.Schedina.getNextRoundMatches();

            if (!this.currentRound) {
                document.getElementById('schedina-round-info').textContent = 'Nessuna giornata disponibile';
                return;
            }

            document.getElementById('schedina-round-info').textContent =
                `Giornata ${this.currentRound.roundNumber} - ${this.currentRound.roundType}`;

            // Carica pronostici esistenti
            const teamId = window.InterfacciaCore?.currentTeamId;
            if (teamId) {
                this.existingPrediction = await window.Schedina.getPredictionsForRound(teamId, this.currentRound.roundNumber);

                // Popola predictions da esistenti
                if (this.existingPrediction?.predictions) {
                    this.predictions = {};
                    this.existingPrediction.predictions.forEach(p => {
                        const key = `${p.homeId}_${p.awayId}`;
                        this.predictions[key] = p.prediction;
                    });
                } else {
                    this.predictions = {};
                }
            }

            // Verifica se puo' inviare
            const canSubmitInfo = await window.Schedina.canSubmitPredictions(this.currentRound.roundNumber);
            this.setupCountdown(canSubmitInfo);

        } catch (error) {
            console.error('[SchedinaUI] Errore caricamento:', error);
            content.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <p>Errore nel caricamento</p>
                    <button onclick="window.SchedinaUI.loadCurrentRound()" class="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
                        Riprova
                    </button>
                </div>
            `;
        }
    },

    /**
     * Renderizza tab
     */
    renderTab(tabName) {
        const footer = document.getElementById('schedina-footer');
        const countdownContainer = document.getElementById('schedina-countdown-container');

        if (tabName === 'current') {
            this.renderCurrentRound();
            footer.classList.remove('hidden');
            countdownContainer.classList.remove('hidden');
        } else {
            this.renderHistory();
            footer.classList.add('hidden');
            countdownContainer.classList.add('hidden');
        }
    },

    /**
     * Renderizza partite della giornata corrente
     */
    renderCurrentRound() {
        const content = document.getElementById('schedina-content');

        if (!this.currentRound) {
            content.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <p class="text-4xl mb-4">📅</p>
                    <p>Nessuna giornata da pronosticare</p>
                    <p class="text-sm mt-2">Tutte le partite sono state giocate</p>
                </div>
            `;
            document.getElementById('schedina-footer').classList.add('hidden');
            return;
        }

        // Verifica se gia' calcolata
        if (this.existingPrediction?.status === 'calculated') {
            this.renderCalculatedResults();
            return;
        }

        const matchesHtml = this.currentRound.matches.map((match, index) => {
            const key = `${match.homeId}_${match.awayId}`;
            const currentPred = this.predictions[key] || null;
            const isPlayed = !!match.result;

            return `
                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 ${isPlayed ? 'opacity-50' : ''}"
                     data-match-key="${key}">
                    <div class="flex items-center justify-between gap-2">
                        <!-- Squadra Casa -->
                        <div class="flex-1 text-center">
                            <p class="text-white font-semibold text-sm truncate">${match.homeName || match.homeId}</p>
                        </div>

                        <!-- Bottoni Pronostico -->
                        <div class="flex gap-1 mx-2">
                            <button class="pred-btn w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold text-lg transition
                                           ${currentPred === '1' ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                                           ${isPlayed ? 'cursor-not-allowed' : ''}"
                                    data-match-key="${key}" data-prediction="1" ${isPlayed ? 'disabled' : ''}>
                                1
                            </button>
                            <button class="pred-btn w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold text-lg transition
                                           ${currentPred === 'X' ? 'bg-yellow-600 text-white ring-2 ring-yellow-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                                           ${isPlayed ? 'cursor-not-allowed' : ''}"
                                    data-match-key="${key}" data-prediction="X" ${isPlayed ? 'disabled' : ''}>
                                X
                            </button>
                            <button class="pred-btn w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold text-lg transition
                                           ${currentPred === '2' ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                                           ${isPlayed ? 'cursor-not-allowed' : ''}"
                                    data-match-key="${key}" data-prediction="2" ${isPlayed ? 'disabled' : ''}>
                                2
                            </button>
                        </div>

                        <!-- Squadra Trasferta -->
                        <div class="flex-1 text-center">
                            <p class="text-white font-semibold text-sm truncate">${match.awayName || match.awayId}</p>
                        </div>
                    </div>
                    ${isPlayed ? `<p class="text-center text-xs text-gray-500 mt-2">Risultato: ${match.result}</p>` : ''}
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <div class="space-y-3">
                ${this.existingPrediction ? `
                    <div class="bg-green-900/30 border border-green-500 rounded-lg p-3 text-center mb-4">
                        <p class="text-green-400 text-sm">Hai gia' inviato una schedina per questa giornata</p>
                        <p class="text-gray-400 text-xs mt-1">Puoi modificarla fino alla chiusura</p>
                    </div>
                ` : ''}
                ${matchesHtml}
            </div>
        `;

        // Event listeners per bottoni pronostico
        content.querySelectorAll('.pred-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                const matchKey = btn.dataset.matchKey;
                const prediction = btn.dataset.prediction;
                this.setPrediction(matchKey, prediction);
            });
        });

        this.updateSubmitButton();
    },

    /**
     * Renderizza risultati calcolati
     */
    renderCalculatedResults() {
        const content = document.getElementById('schedina-content');
        const pred = this.existingPrediction;
        const results = pred.results;

        const predictionsHtml = pred.predictions.map(p => {
            const iconClass = p.isCorrect ? 'text-green-400' : 'text-red-400';
            const icon = p.isCorrect ? '✓' : '✗';
            const actualSymbol = window.Schedina.getResultSymbol(p.actualResult);

            return `
                <div class="bg-gray-800 rounded-lg p-3 border ${p.isCorrect ? 'border-green-500' : 'border-red-500'}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <p class="text-white text-sm">${p.homeName} vs ${p.awayName}</p>
                            <p class="text-gray-400 text-xs mt-1">Risultato: ${p.actualResult || '-'}</p>
                        </div>
                        <div class="text-center mx-4">
                            <span class="inline-block w-8 h-8 rounded-lg ${
                                p.prediction === '1' ? 'bg-green-700' :
                                p.prediction === 'X' ? 'bg-yellow-700' : 'bg-blue-700'
                            } text-white font-bold leading-8">${p.prediction}</span>
                            <p class="text-xs text-gray-500 mt-1">Tuo</p>
                        </div>
                        <div class="text-center">
                            <span class="text-2xl ${iconClass}">${icon}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <div class="space-y-4">
                <!-- Riepilogo -->
                <div class="bg-gradient-to-r ${results.isPerfect ? 'from-yellow-600 to-amber-500' : 'from-gray-700 to-gray-600'} rounded-xl p-4 text-center">
                    <p class="text-white text-lg font-bold">
                        ${results.isPerfect ? '🎉 SCHEDINA PERFETTA!' : `${results.correctPredictions}/${results.totalMatches} Corretti`}
                    </p>
                    ${results.totalReward > 0 ? `
                        <p class="text-green-300 text-2xl font-bold mt-2">+${results.totalReward} CS</p>
                        ${results.bonusReward > 0 ? `<p class="text-yellow-300 text-sm">(include bonus perfetta: +${results.bonusReward})</p>` : ''}
                    ` : `
                        <p class="text-gray-300 text-sm mt-2">Nessun premio questa volta</p>
                    `}
                </div>

                <!-- Dettaglio pronostici -->
                <div class="space-y-2">
                    ${predictionsHtml}
                </div>
            </div>
        `;

        document.getElementById('schedina-footer').classList.add('hidden');
    },

    /**
     * Renderizza storico schedine
     */
    async renderHistory() {
        const content = document.getElementById('schedina-content');
        content.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
            </div>
        `;

        const teamId = window.InterfacciaCore?.currentTeamId;
        if (!teamId) {
            content.innerHTML = '<p class="text-center text-gray-400 py-8">Accedi per vedere lo storico</p>';
            return;
        }

        const history = await window.Schedina.getUserHistory(teamId, 20);

        if (history.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <p class="text-4xl mb-4">📭</p>
                    <p>Nessuna schedina compilata</p>
                </div>
            `;
            return;
        }

        const historyHtml = history.map(s => {
            const status = s.status === 'calculated' ? 'Calcolata' : 'In attesa';
            const statusColor = s.status === 'calculated' ? 'text-green-400' : 'text-yellow-400';
            const correct = s.results?.correctPredictions || '-';
            const total = s.results?.totalMatches || s.predictions?.length || '-';
            const reward = s.results?.totalReward || 0;

            return `
                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-white font-semibold">Giornata ${s.roundNumber}</p>
                            <p class="text-gray-400 text-xs mt-1">${new Date(s.submittedAt).toLocaleDateString('it-IT')}</p>
                        </div>
                        <div class="text-right">
                            <p class="${statusColor} text-sm font-semibold">${status}</p>
                            ${s.status === 'calculated' ? `
                                <p class="text-white">${correct}/${total} corretti</p>
                                ${reward > 0 ? `<p class="text-green-400 font-bold">+${reward} CS</p>` : ''}
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `<div class="space-y-3">${historyHtml}</div>`;
    },

    // ==================== LOGICA PRONOSTICI ====================

    /**
     * Imposta un pronostico
     */
    setPrediction(matchKey, prediction) {
        // Toggle se gia' selezionato
        if (this.predictions[matchKey] === prediction) {
            delete this.predictions[matchKey];
        } else {
            this.predictions[matchKey] = prediction;
        }

        // Aggiorna UI bottoni
        const matchCard = document.querySelector(`[data-match-key="${matchKey}"]`);
        if (matchCard) {
            matchCard.querySelectorAll('.pred-btn').forEach(btn => {
                const p = btn.dataset.prediction;
                const isSelected = this.predictions[matchKey] === p;

                btn.classList.remove('bg-green-600', 'bg-yellow-600', 'bg-blue-600', 'ring-2', 'ring-green-400', 'ring-yellow-400', 'ring-blue-400');
                btn.classList.add('bg-gray-700', 'text-gray-300');

                if (isSelected) {
                    btn.classList.remove('bg-gray-700', 'text-gray-300');
                    if (p === '1') btn.classList.add('bg-green-600', 'text-white', 'ring-2', 'ring-green-400');
                    if (p === 'X') btn.classList.add('bg-yellow-600', 'text-white', 'ring-2', 'ring-yellow-400');
                    if (p === '2') btn.classList.add('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-400');
                }
            });
        }

        this.updateSubmitButton();
    },

    /**
     * Aggiorna stato bottone submit
     */
    updateSubmitButton() {
        const btn = document.getElementById('schedina-submit-btn');
        const status = document.getElementById('schedina-submit-status');

        if (!this.currentRound) return;

        // Conta partite non giocate
        const unplayedMatches = this.currentRound.matches.filter(m => !m.result);
        const predictedCount = Object.keys(this.predictions).length;

        const allPredicted = predictedCount >= unplayedMatches.length;

        btn.disabled = !allPredicted;
        status.textContent = allPredicted
            ? 'Tutti i pronostici inseriti'
            : `${predictedCount}/${unplayedMatches.length} pronostici inseriti`;
    },

    /**
     * Invia pronostici
     */
    async submitPredictions() {
        const btn = document.getElementById('schedina-submit-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Invio in corso...';

        try {
            const teamId = window.InterfacciaCore?.currentTeamId;
            const teamName = window.InterfacciaCore?.currentTeamData?.teamName;

            if (!teamId || !teamName) {
                throw new Error('Dati squadra non disponibili');
            }

            // Prepara array pronostici
            const predictionsArray = this.currentRound.matches
                .filter(m => !m.result) // Solo partite non giocate
                .map(match => {
                    const key = `${match.homeId}_${match.awayId}`;
                    return {
                        homeId: match.homeId,
                        awayId: match.awayId,
                        homeName: match.homeName || match.homeId,
                        awayName: match.awayName || match.awayId,
                        prediction: this.predictions[key],
                        actualResult: null,
                        isCorrect: null
                    };
                });

            await window.Schedina.submitPredictions(
                teamId,
                teamName,
                this.currentRound.roundNumber,
                predictionsArray
            );

            window.Toast?.success('Schedina inviata con successo!');

            // Aggiorna stato
            this.existingPrediction = {
                predictions: predictionsArray,
                status: 'pending'
            };

            // Refresh UI
            this.renderCurrentRound();

        } catch (error) {
            console.error('[SchedinaUI] Errore invio:', error);
            window.Toast?.error(error.message || 'Errore durante l\'invio');
            btn.disabled = false;
        }

        btn.textContent = originalText;
    },

    // ==================== COUNTDOWN ====================

    /**
     * Setup countdown
     */
    setupCountdown(canSubmitInfo) {
        const container = document.getElementById('schedina-countdown-container');
        const countdown = document.getElementById('schedina-countdown');

        if (!canSubmitInfo.canSubmit) {
            container.classList.remove('hidden');
            countdown.textContent = canSubmitInfo.reason || 'Chiuso';
            countdown.classList.add('text-red-400');
            document.getElementById('schedina-submit-btn').disabled = true;
            return;
        }

        if (!canSubmitInfo.closingTime) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        countdown.classList.remove('text-red-400');

        this.stopCountdown();
        this.countdownInterval = setInterval(() => {
            const remaining = this.formatCountdown(canSubmitInfo.closingTime);
            countdown.textContent = remaining;

            if (remaining === 'Chiuso') {
                this.stopCountdown();
                countdown.classList.add('text-red-400');
                document.getElementById('schedina-submit-btn').disabled = true;
            }
        }, 1000);

        // Aggiorna subito
        countdown.textContent = this.formatCountdown(canSubmitInfo.closingTime);
    },

    /**
     * Formatta countdown
     */
    formatCountdown(closingTime) {
        const now = new Date();
        const diff = new Date(closingTime).getTime() - now.getTime();

        if (diff <= 0) return 'Chiuso';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    /**
     * Ferma countdown
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
};

// Init quando DOM pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.FeatureFlags?.isEnabled('schedina')) {
            window.SchedinaUI.init();
        }
    }, 1000);
});

// Ascolta cambio flag
document.addEventListener('featureFlagChanged', (e) => {
    if (e.detail?.flagId === 'schedina') {
        if (e.detail.enabled) {
            window.SchedinaUI.init();
        }
    }
});

console.log('Modulo SchedinaUI caricato.');
