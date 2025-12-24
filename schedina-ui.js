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
    currentTab: 'current',

    // ==================== INIZIALIZZAZIONE ====================

    /**
     * Inizializza il modulo UI
     */
    init() {
        this.createModal();
        console.log('[SchedinaUI] Inizializzato');
    },

    /**
     * Crea il modal (Mobile-First Fullscreen)
     */
    createModal() {
        if (this.modal) return;

        this.modal = document.createElement('div');
        this.modal.id = 'schedina-modal';
        this.modal.className = 'fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm hidden overflow-y-auto';
        this.modal.innerHTML = `<div id="schedina-modal-content"></div>`;

        document.body.appendChild(this.modal);
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
        document.body.style.overflow = 'hidden';
        this.isOpen = true;

        // Carica dati prossima giornata
        await this.loadCurrentRound();
        this.render();
    },

    /**
     * Chiude il pannello
     */
    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        this.isOpen = false;
        this.stopCountdown();
    },

    // ==================== RENDERING PRINCIPALE ====================

    /**
     * Render principale (Mobile-First)
     */
    render() {
        const container = document.getElementById('schedina-modal-content');
        if (!container) return;

        const roundInfo = this.currentRound
            ? `Giornata ${this.currentRound.roundNumber}`
            : 'Nessuna giornata';

        container.innerHTML = `
            <div class="min-h-screen pb-24">

                <!-- Header Sticky Mobile-First -->
                <div class="sticky top-0 z-30 bg-gradient-to-b from-slate-900 via-slate-900/98 to-transparent pb-3 pt-3 px-3">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">🎯</span>
                            <div>
                                <h1 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">SCHEDINA</h1>
                                <p class="text-[10px] text-gray-400">${roundInfo}</p>
                            </div>
                        </div>
                        <button onclick="window.SchedinaUI.close()"
                                class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/80 border border-gray-700 text-gray-400 hover:text-white hover:bg-red-500/30 hover:border-red-500/50 transition">
                            <span class="text-xl">×</span>
                        </button>
                    </div>

                    <!-- Tab Filters -->
                    <div class="flex gap-2">
                        <button onclick="window.SchedinaUI.switchTab('current')"
                                class="flex-1 px-4 py-2 text-sm font-bold rounded-xl transition-all ${this.currentTab === 'current' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}">
                            📋 Prossima
                        </button>
                        <button onclick="window.SchedinaUI.switchTab('history')"
                                class="flex-1 px-4 py-2 text-sm font-bold rounded-xl transition-all ${this.currentTab === 'history' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}">
                            📜 Storico
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div id="schedina-tab-content" class="px-3">
                    <!-- Contenuto dinamico -->
                </div>

            </div>

            <!-- Footer Sticky (solo per tab current) -->
            <div id="schedina-footer" class="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent hidden">
                <button id="schedina-submit-btn" onclick="window.SchedinaUI.submitPredictions()"
                        class="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-bold text-base shadow-lg shadow-green-900/30 transition">
                    Invia Schedina
                </button>
                <p id="schedina-submit-status" class="text-center text-[10px] text-gray-500 mt-2"></p>
            </div>
        `;

        this.renderTab();
    },

    /**
     * Switch tab
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        this.render();
    },

    /**
     * Renderizza tab corrente
     */
    renderTab() {
        const footer = document.getElementById('schedina-footer');

        if (this.currentTab === 'current') {
            this.renderCurrentRound();
            if (this.currentRound && !this.existingPrediction?.status) {
                footer.classList.remove('hidden');
            }
        } else {
            this.renderHistory();
            footer.classList.add('hidden');
        }
    },

    // ==================== CARICAMENTO DATI ====================

    /**
     * Carica dati della giornata corrente
     */
    async loadCurrentRound() {
        try {
            this.currentRound = await window.Schedina.getNextRoundMatches();

            if (!this.currentRound) return;

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

        } catch (error) {
            console.error('[SchedinaUI] Errore caricamento:', error);
        }
    },

    // ==================== TAB CURRENT ====================

    /**
     * Renderizza partite della giornata corrente
     */
    renderCurrentRound() {
        const content = document.getElementById('schedina-tab-content');
        const footer = document.getElementById('schedina-footer');

        if (!this.currentRound) {
            content.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-4xl mb-4">📅</p>
                    <p class="text-lg text-gray-400">Nessuna giornata</p>
                    <p class="text-sm text-gray-500 mt-2">Tutte le partite sono state giocate</p>
                </div>
            `;
            footer.classList.add('hidden');
            return;
        }

        // Verifica se gia' calcolata
        if (this.existingPrediction?.status === 'calculated') {
            this.renderCalculatedResults();
            return;
        }

        // Se ha gia' inviato una schedina (status pending)
        if (this.existingPrediction?.status === 'pending') {
            this.renderSubmittedPredictions();
            return;
        }

        // Countdown
        this.setupCountdown();

        const matchesHtml = this.currentRound.matches.map((match) => {
            const key = `${match.homeId}_${match.awayId}`;
            const currentPred = this.predictions[key] || null;
            const isPlayed = !!match.result;

            return `
                <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-xl p-3 border border-gray-700/50 ${isPlayed ? 'opacity-50' : ''}"
                     data-match-key="${key}">

                    <!-- Teams -->
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <div class="flex-1 text-center">
                            <p class="text-white font-bold text-sm">${match.homeName || match.homeId}</p>
                        </div>
                        <span class="text-gray-600 text-xs font-bold">VS</span>
                        <div class="flex-1 text-center">
                            <p class="text-white font-bold text-sm">${match.awayName || match.awayId}</p>
                        </div>
                    </div>

                    <!-- Prediction Buttons -->
                    <div class="flex gap-2 justify-center">
                        <button class="pred-btn flex-1 max-w-[80px] h-11 rounded-xl font-black text-lg transition-all
                                       ${currentPred === '1' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105' : 'bg-gray-700/80 text-gray-400 hover:bg-gray-600'}
                                       ${isPlayed ? 'cursor-not-allowed opacity-50' : ''}"
                                data-match-key="${key}" data-prediction="1" ${isPlayed ? 'disabled' : ''}>
                            1
                        </button>
                        <button class="pred-btn flex-1 max-w-[80px] h-11 rounded-xl font-black text-lg transition-all
                                       ${currentPred === 'X' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30 scale-105' : 'bg-gray-700/80 text-gray-400 hover:bg-gray-600'}
                                       ${isPlayed ? 'cursor-not-allowed opacity-50' : ''}"
                                data-match-key="${key}" data-prediction="X" ${isPlayed ? 'disabled' : ''}>
                            X
                        </button>
                        <button class="pred-btn flex-1 max-w-[80px] h-11 rounded-xl font-black text-lg transition-all
                                       ${currentPred === '2' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-gray-700/80 text-gray-400 hover:bg-gray-600'}
                                       ${isPlayed ? 'cursor-not-allowed opacity-50' : ''}"
                                data-match-key="${key}" data-prediction="2" ${isPlayed ? 'disabled' : ''}>
                            2
                        </button>
                    </div>

                    ${isPlayed ? `<p class="text-center text-[10px] text-gray-500 mt-2">Risultato: ${match.result}</p>` : ''}
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <!-- Countdown -->
            <div id="schedina-countdown-box" class="bg-gradient-to-br from-yellow-900/30 to-gray-900/60 border border-yellow-500/40 rounded-xl p-3 mb-4 text-center hidden">
                <p class="text-yellow-400 text-xs font-semibold">Pronostici chiudono tra:</p>
                <p id="schedina-countdown" class="text-xl font-black text-white mt-1">--:--:--</p>
            </div>

            <!-- Matches -->
            <div class="space-y-3">
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
     * Renderizza schedina gia' inviata (sola lettura)
     */
    renderSubmittedPredictions() {
        const content = document.getElementById('schedina-tab-content');
        const footer = document.getElementById('schedina-footer');
        footer.classList.add('hidden');

        const predictionsHtml = this.existingPrediction.predictions.map(p => {
            const predStyles = {
                '1': 'bg-green-500 text-white',
                'X': 'bg-yellow-500 text-black',
                '2': 'bg-blue-500 text-white'
            };

            return `
                <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-xl p-3 border border-gray-700/50">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex-1 text-center">
                            <p class="text-white font-bold text-sm">${p.homeName}</p>
                        </div>
                        <span class="w-10 h-10 rounded-xl font-black text-base flex items-center justify-center ${predStyles[p.prediction]}">
                            ${p.prediction}
                        </span>
                        <div class="flex-1 text-center">
                            <p class="text-white font-bold text-sm">${p.awayName}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <!-- Banner schedina inviata -->
            <div class="bg-gradient-to-br from-green-900/40 to-gray-900/60 border border-green-500/50 rounded-xl p-4 text-center mb-4">
                <p class="text-3xl mb-2">✅</p>
                <p class="text-green-400 font-black text-lg">Schedina Inviata!</p>
                <p class="text-gray-400 text-xs mt-1">In attesa dei risultati</p>
            </div>

            <!-- Lista pronostici -->
            <div class="space-y-2">
                ${predictionsHtml}
            </div>
        `;
    },

    /**
     * Renderizza risultati calcolati
     */
    renderCalculatedResults() {
        const content = document.getElementById('schedina-tab-content');
        const footer = document.getElementById('schedina-footer');
        footer.classList.add('hidden');

        const pred = this.existingPrediction;
        const results = pred.results;

        const predictionsHtml = pred.predictions.map(p => {
            const isCorrect = p.isCorrect;
            const borderColor = isCorrect ? 'border-green-500/50' : 'border-red-500/50';
            const bgColor = isCorrect ? 'from-green-900/30' : 'from-red-900/30';

            return `
                <div class="bg-gradient-to-br ${bgColor} to-gray-900/80 rounded-xl p-3 border ${borderColor}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <p class="text-white text-sm font-bold">${p.homeName} vs ${p.awayName}</p>
                            <p class="text-gray-500 text-[10px] mt-1">Risultato: ${p.actualResult || '-'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-lg ${
                                p.prediction === '1' ? 'bg-green-700' :
                                p.prediction === 'X' ? 'bg-yellow-700' : 'bg-blue-700'
                            } text-white font-bold text-sm flex items-center justify-center">${p.prediction}</span>
                            <span class="text-xl">${isCorrect ? '✅' : '❌'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const isPerfect = results.isPerfect;
        const headerBg = isPerfect ? 'from-yellow-600 to-amber-500' : 'from-gray-700 to-gray-600';

        content.innerHTML = `
            <!-- Riepilogo -->
            <div class="bg-gradient-to-r ${headerBg} rounded-xl p-4 text-center mb-4">
                <p class="text-white text-lg font-black">
                    ${isPerfect ? '🎉 SCHEDINA PERFETTA!' : `${results.correctPredictions}/${results.totalMatches} Corretti`}
                </p>
                ${results.totalReward > 0 || results.cssBonus > 0 ? `
                    <p class="text-green-300 text-2xl font-black mt-2">+${results.totalReward} CS${results.cssBonus > 0 ? ` <span class="text-amber-300">+${results.cssBonus} CSS</span>` : ''}</p>
                ` : `
                    <p class="text-gray-300 text-sm mt-2">Nessun premio questa volta</p>
                `}
            </div>

            <!-- Dettaglio pronostici -->
            <div class="space-y-2">
                ${predictionsHtml}
            </div>
        `;
    },

    // ==================== TAB STORICO ====================

    /**
     * Renderizza storico schedine
     */
    async renderHistory() {
        const content = document.getElementById('schedina-tab-content');
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
                <div class="text-center py-12">
                    <p class="text-4xl mb-4">📭</p>
                    <p class="text-lg text-gray-400">Nessuna schedina</p>
                    <p class="text-sm text-gray-500 mt-2">Compila la tua prima schedina!</p>
                </div>
            `;
            return;
        }

        const historyHtml = history.map((s, idx) => {
            const isCalculated = s.status === 'calculated';
            const correct = s.results?.correctPredictions || 0;
            const total = s.results?.totalMatches || s.predictions?.length || 0;
            const reward = s.results?.totalReward || 0;
            const isPerfect = correct === total && total > 0;

            return `
                <div class="bg-gradient-to-br ${isCalculated ? (isPerfect ? 'from-yellow-900/30' : 'from-gray-800/60') : 'from-yellow-900/20'} to-gray-900/80 rounded-xl p-3 border ${isCalculated ? (isPerfect ? 'border-yellow-500/50' : 'border-gray-700/50') : 'border-yellow-700/30'} cursor-pointer hover:border-white/30 transition schedina-history-item"
                     data-index="${idx}">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-white font-bold">Giornata ${s.roundNumber}</p>
                            <p class="text-gray-500 text-[10px] mt-0.5">${new Date(s.submittedAt).toLocaleDateString('it-IT')}</p>
                        </div>
                        <div class="text-right flex items-center gap-3">
                            ${isCalculated ? `
                                <div>
                                    <p class="text-white font-bold">${correct}/${total}</p>
                                    ${reward > 0 ? `<p class="text-green-400 text-xs font-bold">+${reward} CS</p>` : ''}
                                </div>
                                <span class="text-lg">${isPerfect ? '🏆' : (correct > 0 ? '✅' : '❌')}</span>
                            ` : `
                                <span class="text-[10px] px-2 py-1 bg-yellow-900/50 rounded-full text-yellow-400 font-bold">In attesa</span>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `<div class="space-y-2">${historyHtml}</div>`;

        // Aggiungi click listener per mostrare dettagli
        content.querySelectorAll('.schedina-history-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.index);
                this.showSchedinaDetails(history[idx]);
            });
        });
    },

    /**
     * Mostra i dettagli di una schedina con i risultati
     */
    showSchedinaDetails(schedina) {
        const predictions = schedina.predictions || [];
        const status = schedina.status;
        const isCalculated = status === 'calculated';

        let detailsHtml = predictions.map(p => {
            const isCorrect = p.isCorrect;
            let bgClass = 'from-gray-800/60';
            let borderClass = 'border-gray-700/50';

            if (isCalculated) {
                bgClass = isCorrect ? 'from-green-900/30' : 'from-red-900/30';
                borderClass = isCorrect ? 'border-green-500/50' : 'border-red-500/50';
            }

            return `
                <div class="bg-gradient-to-br ${bgClass} to-gray-900/80 rounded-xl p-3 border ${borderClass}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <p class="text-white text-sm font-bold">${p.homeName || p.homeId} vs ${p.awayName || p.awayId}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="text-center">
                                <p class="text-[9px] text-gray-500">Tuo</p>
                                <p class="text-yellow-400 font-bold">${p.prediction}</p>
                            </div>
                            ${isCalculated ? `
                                <div class="text-center">
                                    <p class="text-[9px] text-gray-500">Esito</p>
                                    <p class="text-white font-bold">${p.actualResult || '-'}</p>
                                </div>
                                <span class="text-xl">${isCorrect ? '✅' : '❌'}</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Mostra in un overlay fullscreen mobile
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-900 z-[10000] overflow-y-auto';

        const correct = schedina.results?.correctPredictions || 0;
        const total = schedina.results?.totalMatches || 0;
        const reward = schedina.results?.totalReward || 0;
        const isPerfect = correct === total && total > 0;

        overlay.innerHTML = `
            <div class="min-h-screen pb-20">

                <!-- Header Sticky -->
                <div class="sticky top-0 z-10 bg-gradient-to-b from-slate-900 to-slate-900/95 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🎯</span>
                            <div>
                                <h2 class="text-lg font-black text-white">Giornata ${schedina.roundNumber}</h2>
                                <p class="text-[10px] text-gray-400">${new Date(schedina.submittedAt).toLocaleDateString('it-IT')}</p>
                            </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()"
                                class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/80 border border-gray-700 text-gray-400 hover:text-white hover:bg-red-500/30 transition">
                            <span class="text-xl">×</span>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="px-4 py-4 space-y-3">

                    ${isCalculated ? `
                        <!-- Riepilogo -->
                        <div class="bg-gradient-to-r ${isPerfect ? 'from-yellow-600 to-amber-500' : 'from-gray-700 to-gray-600'} rounded-xl p-4 text-center">
                            <p class="text-white font-black text-lg">
                                ${isPerfect ? '🏆 Perfetta!' : `${correct}/${total} Corretti`}
                            </p>
                            ${reward > 0 ? `<p class="text-green-300 text-xl font-black mt-1">+${reward} CS</p>` : ''}
                        </div>
                    ` : `
                        <div class="bg-gradient-to-br from-yellow-900/30 to-gray-900/60 border border-yellow-500/40 rounded-xl p-4 text-center">
                            <p class="text-yellow-400 font-bold">⏳ In attesa dei risultati</p>
                        </div>
                    `}

                    <!-- Pronostici -->
                    <div class="space-y-2">
                        ${detailsHtml}
                    </div>

                </div>

                <!-- Footer Sticky -->
                <div class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
                    <button onclick="this.closest('.fixed').remove()"
                            class="w-full bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-bold py-3 px-6 rounded-xl transition">
                        Chiudi
                    </button>
                </div>

            </div>
        `;

        document.body.appendChild(overlay);
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

                // Reset classes
                btn.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-blue-500', 'text-white', 'text-black', 'shadow-lg', 'shadow-green-500/30', 'shadow-yellow-500/30', 'shadow-blue-500/30', 'scale-105');
                btn.classList.add('bg-gray-700/80', 'text-gray-400');

                if (isSelected) {
                    btn.classList.remove('bg-gray-700/80', 'text-gray-400');
                    if (p === '1') btn.classList.add('bg-green-500', 'text-white', 'shadow-lg', 'shadow-green-500/30', 'scale-105');
                    if (p === 'X') btn.classList.add('bg-yellow-500', 'text-black', 'shadow-lg', 'shadow-yellow-500/30', 'scale-105');
                    if (p === '2') btn.classList.add('bg-blue-500', 'text-white', 'shadow-lg', 'shadow-blue-500/30', 'scale-105');
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

        if (!this.currentRound || !btn || !status) return;

        // Conta partite non giocate
        const unplayedMatches = this.currentRound.matches.filter(m => !m.result);
        const predictedCount = Object.keys(this.predictions).length;

        const allPredicted = predictedCount >= unplayedMatches.length;

        btn.disabled = !allPredicted;
        status.textContent = allPredicted
            ? '✓ Tutti i pronostici inseriti'
            : `${predictedCount}/${unplayedMatches.length} pronostici`;
    },

    /**
     * Invia pronostici
     */
    async submitPredictions() {
        const btn = document.getElementById('schedina-submit-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Invio...';

        try {
            const teamId = window.InterfacciaCore?.currentTeamId;
            const teamName = window.InterfacciaCore?.currentTeamData?.teamName;

            if (!teamId || !teamName) {
                throw new Error('Dati squadra non disponibili');
            }

            // Prepara array pronostici
            const predictionsArray = this.currentRound.matches
                .filter(m => !m.result)
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

            window.Toast?.success('Schedina inviata!');

            // Aggiorna stato
            this.existingPrediction = {
                predictions: predictionsArray,
                status: 'pending'
            };

            // Refresh UI
            this.render();

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
    async setupCountdown() {
        const box = document.getElementById('schedina-countdown-box');
        const countdown = document.getElementById('schedina-countdown');
        const submitBtn = document.getElementById('schedina-submit-btn');

        if (!box || !countdown) return;

        try {
            const canSubmitInfo = await window.Schedina.canSubmitPredictions(this.currentRound.roundNumber);

            if (!canSubmitInfo.canSubmit) {
                box.classList.remove('hidden');
                countdown.textContent = canSubmitInfo.reason || 'Chiuso';
                countdown.classList.add('text-red-400');
                if (submitBtn) submitBtn.disabled = true;
                return;
            }

            if (!canSubmitInfo.closingTime) {
                box.classList.add('hidden');
                return;
            }

            box.classList.remove('hidden');
            countdown.classList.remove('text-red-400');

            this.stopCountdown();
            this.countdownInterval = setInterval(() => {
                const remaining = this.formatCountdown(canSubmitInfo.closingTime);
                countdown.textContent = remaining;

                if (remaining === 'Chiuso') {
                    this.stopCountdown();
                    countdown.classList.add('text-red-400');
                    if (submitBtn) submitBtn.disabled = true;
                }
            }, 1000);

            countdown.textContent = this.formatCountdown(canSubmitInfo.closingTime);

        } catch (error) {
            console.error('[SchedinaUI] Errore countdown:', error);
        }
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
