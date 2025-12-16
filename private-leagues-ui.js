//
// ====================================================================
// PRIVATE-LEAGUES-UI.JS - Interfaccia Utente Leghe Private
// ====================================================================
//

window.PrivateLeaguesUI = {
    currentTeamId: null,
    currentTeamData: null,
    currentLeague: null,
    timerInterval: null,

    /**
     * Inizializza l'UI delle leghe private
     */
    async init(teamId, teamData) {
        this.currentTeamId = teamId;
        this.currentTeamData = teamData;

        // Pulisci timer precedenti
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Ricarica dati squadra freschi per avere i CS aggiornati
        await this.refreshTeamData();

        // Carica la lega corrente (se esiste)
        this.currentLeague = await window.PrivateLeagues.getTeamLeague(teamId);

        // Se in una lega in corso, controlla auto-simulazione
        if (this.currentLeague && this.currentLeague.status === 'in_progress') {
            await this.checkAutoSimulation();
        }

        this.render();
    },

    /**
     * Controlla se e' il momento di auto-simulare
     */
    async checkAutoSimulation() {
        if (!this.currentLeague || this.currentLeague.status !== 'in_progress') return;

        const result = await window.PrivateLeagues.checkAndAutoSimulate(this.currentLeague.leagueId);

        if (result.simulated) {
            if (window.Toast) {
                if (result.isCompleted) {
                    window.Toast.success(`Campionato terminato! Vincitore: ${result.winner.teamName}`);
                } else {
                    window.Toast.success('Giornata simulata automaticamente!');
                }
            }
            // Ricarica dati
            await this.refreshTeamData();
            this.currentLeague = await window.PrivateLeagues.getLeagueById(this.currentLeague.leagueId);
        }
    },

    /**
     * Render principale
     */
    async render() {
        const container = document.getElementById('private-leagues-panel');
        if (!container) return;

        // Verifica cooldown prima di tutto
        const cooldownCheck = await window.PrivateLeagues.isTeamInCooldown(this.currentTeamId);

        if (!this.currentLeague) {
            if (cooldownCheck.inCooldown) {
                this.renderCooldown(container, cooldownCheck);
            } else {
                await this.renderNoLeague(container);
            }
        } else if (this.currentLeague.status === 'waiting') {
            this.renderWaitingLeague(container);
        } else if (this.currentLeague.status === 'in_progress') {
            this.renderInProgressLeague(container);
        } else if (this.currentLeague.status === 'completed') {
            this.renderCompletedLeague(container);
        }
    },

    // ================================================================
    // VISTA: COOLDOWN
    // ================================================================

    renderCooldown(container, cooldownCheck) {
        const dateStr = window.PrivateLeagues.formatCooldownDate(cooldownCheck.cooldownUntil);

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <!-- Header -->
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-purple-400">Leghe Private</h2>
                    <p class="text-gray-400 text-sm mt-1">Crea o unisciti a un mini-campionato con gli amici</p>
                </div>

                <!-- Messaggio Cooldown -->
                <div class="bg-orange-900/30 border border-orange-600/50 rounded-xl p-6 text-center">
                    <div class="text-5xl mb-4">&#9203;</div>
                    <h3 class="text-xl font-bold text-orange-400 mb-2">Periodo di Attesa</h3>
                    <p class="text-gray-300 mb-4">
                        Hai completato una lega di recente.<br>
                        Potrai partecipare a una nuova lega dal:
                    </p>
                    <div class="bg-gray-800 rounded-lg p-4 inline-block">
                        <span class="text-2xl font-bold text-white">${dateStr}</span>
                    </div>
                    <p class="text-gray-500 text-sm mt-4">
                        Questo periodo di attesa si resetta il primo giorno di ogni mese.
                    </p>
                </div>
            </div>
        `;
    },

    // ================================================================
    // VISTA: NESSUNA LEGA
    // ================================================================

    async renderNoLeague(container) {
        // Ottieni CS (budget) in modo robusto
        let currentCS = await this.getTeamCS();
        // Assicurati che sia un numero valido
        if (typeof currentCS !== 'number' || isNaN(currentCS)) {
            currentCS = 0;
        }

        const maxFee = window.PrivateLeagues.MAX_ENTRY_FEE;
        const minTeams = window.PrivateLeagues.MIN_TEAMS;
        const maxTeams = window.PrivateLeagues.MAX_TEAMS;

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <!-- Header -->
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-purple-400">Leghe Private</h2>
                    <p class="text-gray-400 text-sm mt-1">Crea o unisciti a un mini-campionato con gli amici</p>
                </div>

                <!-- Info Budget disponibile -->
                <div class="bg-gray-700 rounded-lg p-3 text-center">
                    <span class="text-gray-400">Budget:</span>
                    <span class="text-yellow-400 font-bold ml-2">${currentCS} CS</span>
                </div>

                <!-- Info limite mensile -->
                <div class="bg-blue-900/30 rounded-lg p-3 text-center border border-blue-600/30">
                    <p class="text-blue-400 text-sm">
                        <strong>Nota:</strong> Puoi partecipare a max 1 lega privata al mese
                    </p>
                </div>

                <!-- Crea Nuova Lega -->
                <div class="bg-gray-800 rounded-xl p-5 border border-purple-500/30">
                    <h3 class="text-lg font-bold text-purple-400 mb-4">Crea Nuova Lega</h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-400 text-sm mb-1">Nome Lega</label>
                            <input type="text" id="create-league-name" maxlength="30"
                                   class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                                   placeholder="Es: Lega degli Amici">
                        </div>

                        <!-- Selettore numero squadre -->
                        <div>
                            <label class="block text-gray-400 text-sm mb-1">
                                Numero Squadre: <span id="team-count-display" class="text-purple-400 font-bold">4</span>
                            </label>
                            <input type="range" id="create-league-teams" min="${minTeams}" max="${maxTeams}" step="1" value="4"
                                   class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500">
                            <div class="flex justify-between text-xs text-gray-500 mt-1">
                                <span>${minTeams} squadre</span>
                                <span>${maxTeams} squadre</span>
                            </div>
                        </div>

                        <div>
                            <label class="block text-gray-400 text-sm mb-1">
                                Costo d'Ingresso: <span id="entry-fee-display" class="text-yellow-400 font-bold">0 CS</span>
                            </label>
                            <input type="range" id="create-league-fee" min="0" max="${maxFee}" step="50" value="0"
                                   class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500">
                            <div class="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Gratis</span>
                                <span>${maxFee} CS</span>
                            </div>
                        </div>

                        <!-- Preview Montepremi -->
                        <div id="prize-preview" class="bg-gray-700/50 rounded-lg p-3 hidden">
                            <p class="text-sm text-gray-400 mb-2">Montepremi totale: <span id="total-pool" class="text-yellow-400 font-bold">0 CS</span></p>
                            <div id="prize-grid" class="grid gap-2 text-xs text-center">
                                <!-- Generato dinamicamente -->
                            </div>
                        </div>

                        <div id="create-warning" class="text-red-400 text-sm hidden"></div>

                        <button id="btn-create-league"
                                class="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                            Crea Lega
                        </button>
                    </div>
                </div>

                <!-- Unisciti a Lega -->
                <div class="bg-gray-800 rounded-xl p-5 border border-blue-500/30">
                    <h3 class="text-lg font-bold text-blue-400 mb-4">Unisciti a una Lega</h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-400 text-sm mb-1">Codice Invito</label>
                            <input type="text" id="join-league-code" maxlength="6"
                                   class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none uppercase text-center text-xl tracking-widest"
                                   placeholder="ABC123">
                        </div>

                        <div id="join-league-info" class="hidden bg-gray-700/50 rounded-lg p-3">
                            <!-- Info lega trovata -->
                        </div>

                        <div id="join-warning" class="text-red-400 text-sm hidden"></div>

                        <button id="btn-join-league"
                                class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                            Cerca Lega
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.attachNoLeagueListeners(container);
    },

    attachNoLeagueListeners(container) {
        const feeSlider = container.querySelector('#create-league-fee');
        const teamsSlider = container.querySelector('#create-league-teams');
        const feeDisplay = container.querySelector('#entry-fee-display');
        const teamsDisplay = container.querySelector('#team-count-display');
        const prizePreview = container.querySelector('#prize-preview');
        const prizeGrid = container.querySelector('#prize-grid');
        const createWarning = container.querySelector('#create-warning');
        const btnCreate = container.querySelector('#btn-create-league');

        // Cache dei CS (budget) per evitare chiamate async nel listener
        let cachedCS = this.currentTeamData?.budget || 0;
        this.getTeamCS().then(cs => { cachedCS = cs; });

        const updatePrizePreview = () => {
            const fee = parseInt(feeSlider.value);
            const numTeams = parseInt(teamsSlider.value);
            const currentCS = cachedCS;

            teamsDisplay.textContent = numTeams;
            feeDisplay.textContent = `${fee} CS`;

            if (fee > 0) {
                prizePreview.classList.remove('hidden');
                const gains = window.PrivateLeagues.calculateNetGains(fee, numTeams);
                container.querySelector('#total-pool').textContent = `${fee * numTeams} CS`;

                // Genera griglia premi dinamica
                const colors = ['yellow', 'gray', 'amber', 'gray', 'gray', 'gray'];
                const medals = ['🥇', '🥈', '🥉', '4°', '5°', '6°'];
                prizeGrid.className = `grid grid-cols-${Math.min(numTeams, 4)} gap-2 text-xs text-center`;

                prizeGrid.innerHTML = gains.map((g, i) => `
                    <div class="bg-${colors[i]}-900/30 rounded p-2 ${i === 0 ? 'border border-yellow-500' : ''}">
                        <div class="text-${colors[i]}-400 font-bold">${medals[i]}</div>
                        <div class="text-white">${g.prize} CS</div>
                        <div class="text-${g.netGain >= 0 ? 'green' : 'red'}-400 text-[10px]">(${g.netGain >= 0 ? '+' : ''}${g.netGain})</div>
                        ${i === 0 ? '<div class="text-yellow-300 text-[8px]">+bonus</div>' : ''}
                    </div>
                `).join('');

                if (currentCS < fee) {
                    createWarning.textContent = `CS insufficienti! Hai ${currentCS} CS`;
                    createWarning.classList.remove('hidden');
                    btnCreate.disabled = true;
                } else {
                    createWarning.classList.add('hidden');
                    btnCreate.disabled = false;
                }
            } else {
                prizePreview.classList.add('hidden');
                createWarning.classList.add('hidden');
                btnCreate.disabled = false;
            }
        };

        // Aggiorna preview fee e teams
        feeSlider?.addEventListener('input', updatePrizePreview);
        teamsSlider?.addEventListener('input', updatePrizePreview);

        // Crea lega
        btnCreate?.addEventListener('click', async () => {
            const name = container.querySelector('#create-league-name').value.trim();
            const fee = parseInt(feeSlider.value) || 0;
            const numTeams = parseInt(teamsSlider.value) || 4;

            if (!name || name.length < 3) {
                createWarning.textContent = 'Nome troppo corto (min 3 caratteri)';
                createWarning.classList.remove('hidden');
                return;
            }

            btnCreate.disabled = true;
            btnCreate.textContent = 'Creazione...';

            const result = await window.PrivateLeagues.createLeague(
                name,
                this.currentTeamId,
                this.currentTeamData.teamName,
                fee,
                numTeams
            );

            if (result.success) {
                if (window.Toast) window.Toast.success(`Lega creata! Codice: ${result.inviteCode}`);
                // Ricarica dati squadra
                await this.refreshTeamData();
                this.currentLeague = await window.PrivateLeagues.getLeagueById(result.leagueId);
                this.render();
            } else {
                createWarning.textContent = result.error;
                createWarning.classList.remove('hidden');
                btnCreate.disabled = false;
                btnCreate.textContent = 'Crea Lega';
            }
        });

        // Cerca lega
        const btnJoin = container.querySelector('#btn-join-league');
        const codeInput = container.querySelector('#join-league-code');
        const joinInfo = container.querySelector('#join-league-info');
        const joinWarning = container.querySelector('#join-warning');

        let foundLeague = null;

        btnJoin?.addEventListener('click', async () => {
            const code = codeInput.value.trim().toUpperCase();

            if (!code || code.length < 4) {
                joinWarning.textContent = 'Inserisci un codice valido';
                joinWarning.classList.remove('hidden');
                return;
            }

            // Se abbiamo gia trovato una lega, prova a unirti
            if (foundLeague && btnJoin.textContent === 'Unisciti') {
                btnJoin.disabled = true;
                btnJoin.textContent = 'Iscrizione...';

                const result = await window.PrivateLeagues.joinLeague(
                    code,
                    this.currentTeamId,
                    this.currentTeamData.teamName
                );

                if (result.success) {
                    if (result.leagueStarted) {
                        if (window.Toast) window.Toast.success('Lega al completo! Campionato iniziato!');
                    } else {
                        if (window.Toast) window.Toast.success('Iscrizione completata!');
                    }
                    await this.refreshTeamData();
                    this.currentLeague = await window.PrivateLeagues.getLeagueById(result.leagueId);
                    this.render();
                } else {
                    joinWarning.textContent = result.error;
                    joinWarning.classList.remove('hidden');
                    btnJoin.disabled = false;
                    btnJoin.textContent = 'Unisciti';
                }
                return;
            }

            // Cerca la lega
            btnJoin.disabled = true;
            btnJoin.textContent = 'Ricerca...';

            foundLeague = await window.PrivateLeagues.getLeagueByInviteCode(code);

            if (!foundLeague) {
                joinWarning.textContent = 'Codice non valido';
                joinWarning.classList.remove('hidden');
                joinInfo.classList.add('hidden');
                btnJoin.disabled = false;
                btnJoin.textContent = 'Cerca Lega';
                return;
            }

            // Mostra info lega
            const canAfford = window.PrivateLeagues.canAffordEntry(cachedCS, foundLeague.entryFee);

            joinInfo.innerHTML = `
                <p class="font-bold text-white">${foundLeague.name}</p>
                <p class="text-sm text-gray-400">Squadre: ${foundLeague.teams.length}/${foundLeague.maxTeams}</p>
                <p class="text-sm ${foundLeague.entryFee > 0 ? 'text-yellow-400' : 'text-green-400'}">
                    Costo: ${foundLeague.entryFee > 0 ? foundLeague.entryFee + ' CS' : 'Gratis'}
                </p>
                ${!canAfford ? `<p class="text-red-400 text-sm mt-2">CS insufficienti! (Hai ${cachedCS} CS)</p>` : ''}
            `;
            joinInfo.classList.remove('hidden');
            joinWarning.classList.add('hidden');

            if (foundLeague.teams.length >= foundLeague.maxTeams) {
                joinWarning.textContent = 'Lega al completo';
                joinWarning.classList.remove('hidden');
                btnJoin.disabled = false;
                btnJoin.textContent = 'Cerca Lega';
            } else if (!canAfford) {
                btnJoin.disabled = true;
                btnJoin.textContent = 'CS Insufficienti';
            } else {
                btnJoin.disabled = false;
                btnJoin.textContent = 'Unisciti';
            }
        });
    },

    // ================================================================
    // VISTA: IN ATTESA
    // ================================================================

    renderWaitingLeague(container) {
        const league = this.currentLeague;
        const isCreator = league.createdBy === this.currentTeamId;

        container.innerHTML = `
            <div class="p-4 space-y-6">
                <!-- Header -->
                <div class="text-center mb-4">
                    <h2 class="text-2xl font-bold text-purple-400">${league.name}</h2>
                    <p class="text-gray-400 text-sm">In attesa di giocatori...</p>
                </div>

                <!-- Codice Invito -->
                <div class="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-4 text-center">
                    <p class="text-gray-400 text-sm mb-2">Condividi il codice invito</p>
                    <div class="flex items-center justify-center gap-3">
                        <span class="text-3xl font-mono font-bold text-white tracking-widest">${league.inviteCode}</span>
                        <button id="btn-copy-code" class="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition" title="Copia">
                            <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Info Lega -->
                <div class="bg-gray-700/50 rounded-lg p-3 text-center">
                    <p class="text-gray-400 text-sm">
                        Il campionato iniziera automaticamente quando tutte le ${league.maxTeams} squadre si saranno iscritte
                    </p>
                </div>

                <!-- Info Costo -->
                ${league.entryFee > 0 ? `
                    <div class="bg-yellow-900/30 rounded-lg p-3 text-center border border-yellow-600/30">
                        <p class="text-yellow-400">
                            Costo d'ingresso: <span class="font-bold">${league.entryFee} CS</span>
                        </p>
                        <p class="text-yellow-600 text-sm">
                            Montepremi: <span class="font-bold">${league.entryFee * league.maxTeams} CS</span>
                        </p>
                    </div>
                ` : ''}

                <!-- Lista Squadre -->
                <div class="bg-gray-800 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-white mb-3">
                        Squadre Iscritte (${league.teams.length}/${league.maxTeams})
                    </h3>
                    <div class="space-y-2">
                        ${league.teams.map((team, i) => `
                            <div class="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                                <div class="flex items-center gap-3">
                                    <span class="w-6 h-6 flex items-center justify-center bg-purple-600 rounded-full text-sm font-bold">${i + 1}</span>
                                    <span class="text-white">${team.teamName}</span>
                                    ${team.teamId === league.createdBy ? '<span class="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">Creatore</span>' : ''}
                                </div>
                                ${league.entryFee > 0 ? '<span class="text-green-400 text-sm">Pagato</span>' : ''}
                            </div>
                        `).join('')}

                        ${Array(league.maxTeams - league.teams.length).fill(0).map(() => `
                            <div class="flex items-center justify-center bg-gray-700/30 rounded-lg p-3 border-2 border-dashed border-gray-600">
                                <span class="text-gray-500">In attesa...</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Azioni -->
                <div class="space-y-3">
                    <button id="btn-invite-user" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                        <span>📨</span> Invita Utente
                    </button>

                    <button id="btn-leave-league" class="w-full bg-red-600/30 hover:bg-red-600/50 text-red-400 font-bold py-3 rounded-lg transition border border-red-600/50">
                        Abbandona Lega
                    </button>

                    ${league.entryFee > 0 ? `
                        <p class="text-center text-red-400 text-xs">
                            Attenzione: abbandonando perderai ${league.entryFee} CS!
                        </p>
                    ` : ''}
                </div>
            </div>

            <!-- Modal Invita Utente -->
            <div id="invite-modal" class="fixed inset-0 bg-black/70 z-[9999] hidden items-center justify-center p-4">
                <div class="bg-gray-800 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
                    <div class="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 class="text-lg font-bold text-white">Invita Squadra</h3>
                        <button id="close-invite-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <div id="invite-teams-list" class="p-4 overflow-y-auto flex-1">
                        <p class="text-gray-400 text-center">Caricamento squadre...</p>
                    </div>
                </div>
            </div>
        `;

        this.attachWaitingListeners(container);
    },

    attachWaitingListeners(container) {
        // Copia codice
        container.querySelector('#btn-copy-code')?.addEventListener('click', () => {
            navigator.clipboard.writeText(this.currentLeague.inviteCode);
            if (window.Toast) window.Toast.success('Codice copiato!');
        });

        // Apri modal inviti
        const inviteModal = container.querySelector('#invite-modal');
        const inviteTeamsList = container.querySelector('#invite-teams-list');

        container.querySelector('#btn-invite-user')?.addEventListener('click', async () => {
            inviteModal.classList.remove('hidden');
            inviteModal.classList.add('flex');

            // Carica squadre disponibili
            inviteTeamsList.innerHTML = '<p class="text-gray-400 text-center">Caricamento squadre...</p>';

            const teams = await window.PrivateLeagues.getAvailableTeamsForInvite(this.currentLeague.leagueId);

            if (teams.length === 0) {
                inviteTeamsList.innerHTML = '<p class="text-gray-400 text-center">Nessuna squadra disponibile per l\'invito</p>';
                return;
            }

            inviteTeamsList.innerHTML = teams.map(team => `
                <div class="flex items-center justify-between bg-gray-700/50 rounded-lg p-3 mb-2 hover:bg-gray-700 transition">
                    <div>
                        <p class="text-white font-bold">${team.teamName}</p>
                        <p class="text-gray-400 text-xs">Budget: ${team.budget} CS</p>
                    </div>
                    <button class="btn-send-invite bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-4 rounded-lg transition"
                            data-team-id="${team.teamId}" data-team-name="${team.teamName}">
                        Invita
                    </button>
                </div>
            `).join('');

            // Aggiungi listener ai bottoni invita
            inviteTeamsList.querySelectorAll('.btn-send-invite').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const targetTeamId = e.target.dataset.teamId;
                    const targetTeamName = e.target.dataset.teamName;

                    e.target.disabled = true;
                    e.target.textContent = 'Invio...';

                    const result = await window.PrivateLeagues.sendInvitation(
                        this.currentLeague.leagueId,
                        targetTeamId,
                        this.currentTeamData.teamName
                    );

                    if (result.success) {
                        if (window.Toast) window.Toast.success(`Invito inviato a ${targetTeamName}!`);
                        e.target.textContent = 'Inviato ✓';
                        e.target.classList.remove('bg-blue-600', 'hover:bg-blue-500');
                        e.target.classList.add('bg-green-600');
                    } else {
                        if (window.Toast) window.Toast.error(result.error);
                        e.target.disabled = false;
                        e.target.textContent = 'Invita';
                    }
                });
            });
        });

        // Chiudi modal
        container.querySelector('#close-invite-modal')?.addEventListener('click', () => {
            inviteModal.classList.add('hidden');
            inviteModal.classList.remove('flex');
        });

        // Chiudi cliccando fuori
        inviteModal?.addEventListener('click', (e) => {
            if (e.target === inviteModal) {
                inviteModal.classList.add('hidden');
                inviteModal.classList.remove('flex');
            }
        });

        // Abbandona
        container.querySelector('#btn-leave-league')?.addEventListener('click', async () => {
            const fee = this.currentLeague.entryFee;
            const msg = fee > 0
                ? `Sei sicuro? Perderai ${fee} CS!`
                : 'Sei sicuro di voler abbandonare la lega?';

            if (!confirm(msg)) return;

            const result = await window.PrivateLeagues.leaveLeague(this.currentTeamId);

            if (result.success) {
                if (window.Toast) window.Toast.info('Hai abbandonato la lega');
                await this.refreshTeamData();
                this.currentLeague = null;
                this.render();
            } else {
                if (window.Toast) window.Toast.error(result.error);
            }
        });
    },

    // ================================================================
    // VISTA: IN CORSO
    // ================================================================

    renderInProgressLeague(container) {
        const league = this.currentLeague;
        const currentRound = league.currentRound || 1;
        const totalRounds = league.schedule.length;

        // Calcola tempo rimanente
        const timeRemaining = window.PrivateLeagues.getTimeUntilNextSimulation(league);
        const canForceSimulate = timeRemaining !== null && timeRemaining <= 0;

        // Ordina classifica
        const sortedStandings = [...league.standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
        });

        container.innerHTML = `
            <div class="p-4 space-y-4">
                <!-- Header -->
                <div class="text-center mb-4">
                    <h2 class="text-2xl font-bold text-purple-400">${league.name}</h2>
                    <p class="text-gray-400 text-sm">Giornata ${Math.min(currentRound, totalRounds)}/${totalRounds}</p>
                </div>

                <!-- Timer Prossima Simulazione -->
                ${currentRound <= totalRounds ? `
                    <div id="timer-box" class="bg-gradient-to-r ${canForceSimulate ? 'from-green-900/50 to-emerald-900/50 border-green-600/50' : 'from-blue-900/50 to-cyan-900/50 border-blue-600/50'} rounded-xl p-4 text-center border">
                        <p class="text-gray-400 text-sm mb-1">Prossima giornata tra:</p>
                        <div id="timer-display" class="text-3xl font-mono font-bold ${canForceSimulate ? 'text-green-400' : 'text-blue-400'}">
                            ${canForceSimulate ? 'PRONTA!' : window.PrivateLeagues.formatTimeRemaining(timeRemaining)}
                        </div>
                        ${canForceSimulate ? `
                            <button id="btn-force-simulate" class="mt-3 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition">
                                Forza Simulazione
                            </button>
                        ` : `
                            <p class="text-gray-500 text-xs mt-2">La simulazione avviene automaticamente ogni 48 ore</p>
                        `}
                    </div>
                ` : ''}

                <!-- Montepremi -->
                ${league.entryFee > 0 ? `
                    <div class="bg-yellow-900/20 rounded-lg p-2 text-center border border-yellow-600/30">
                        <span class="text-yellow-400 text-sm">Montepremi: <span class="font-bold">${league.entryFee * league.maxTeams} CS</span></span>
                    </div>
                ` : ''}

                <!-- Classifica -->
                <div class="bg-gray-800 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-white mb-3">Classifica</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-gray-400 text-xs">
                                    <th class="text-left pb-2">#</th>
                                    <th class="text-left pb-2">Squadra</th>
                                    <th class="text-center pb-2">G</th>
                                    <th class="text-center pb-2">V</th>
                                    <th class="text-center pb-2">P</th>
                                    <th class="text-center pb-2">S</th>
                                    <th class="text-center pb-2">GF</th>
                                    <th class="text-center pb-2">GS</th>
                                    <th class="text-center pb-2 text-yellow-400">Pt</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedStandings.map((team, i) => `
                                    <tr class="${team.teamId === this.currentTeamId ? 'bg-purple-900/30' : ''} border-t border-gray-700">
                                        <td class="py-2 ${i === 0 ? 'text-yellow-400' : ''}">${i + 1}</td>
                                        <td class="py-2 text-white ${team.teamId === this.currentTeamId ? 'font-bold' : ''}">${team.teamName}</td>
                                        <td class="text-center py-2">${team.played}</td>
                                        <td class="text-center py-2 text-green-400">${team.wins}</td>
                                        <td class="text-center py-2">${team.draws}</td>
                                        <td class="text-center py-2 text-red-400">${team.losses}</td>
                                        <td class="text-center py-2">${team.goalsFor}</td>
                                        <td class="text-center py-2">${team.goalsAgainst}</td>
                                        <td class="text-center py-2 font-bold text-yellow-400">${team.points}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Prossima Giornata / Calendario -->
                <div class="bg-gray-800 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-white mb-3">
                        ${currentRound <= totalRounds ? `Giornata ${currentRound}` : 'Campionato Terminato'}
                    </h3>

                    ${this.renderSchedule(league.schedule, currentRound)}
                </div>
            </div>
        `;

        this.attachInProgressListeners(container);
        this.startTimerUpdate(container);
    },

    renderSchedule(schedule, currentRound) {
        return schedule.map(round => {
            const isCurrent = round.round === currentRound;
            const isPast = round.round < currentRound;

            return `
                <div class="mb-4 ${isCurrent ? 'bg-purple-900/20 rounded-lg p-2' : ''}">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-sm font-bold ${isCurrent ? 'text-purple-400' : 'text-gray-400'}">
                            G${round.round} - ${round.type}
                        </span>
                        ${isCurrent ? '<span class="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">Attuale</span>' : ''}
                    </div>
                    <div class="space-y-1">
                        ${round.matches.map(match => `
                            <div class="flex items-center justify-between text-sm ${match.result ? '' : 'text-gray-400'}">
                                <span class="flex-1 text-right ${match.result && match.result.homeGoals > match.result.awayGoals ? 'text-green-400 font-bold' : ''}">${match.homeName}</span>
                                <span class="mx-3 font-mono ${match.result ? 'text-white' : 'text-gray-500'}">
                                    ${match.result ? `${match.result.homeGoals} - ${match.result.awayGoals}` : '- : -'}
                                </span>
                                <span class="flex-1 text-left ${match.result && match.result.awayGoals > match.result.homeGoals ? 'text-green-400 font-bold' : ''}">${match.awayName}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    attachInProgressListeners(container) {
        container.querySelector('#btn-force-simulate')?.addEventListener('click', async () => {
            const btn = container.querySelector('#btn-force-simulate');
            btn.disabled = true;
            btn.textContent = 'Simulazione...';

            const result = await window.PrivateLeagues.simulateRound(this.currentLeague.leagueId);

            if (result.success) {
                if (result.isCompleted) {
                    if (window.Toast) window.Toast.success(`Campionato terminato! Vincitore: ${result.winner.teamName}`);
                } else {
                    if (window.Toast) window.Toast.success('Giornata simulata!');
                }

                // Ricarica dati
                await this.refreshTeamData();
                this.currentLeague = await window.PrivateLeagues.getLeagueById(this.currentLeague.leagueId);
                this.render();
            } else {
                if (window.Toast) window.Toast.error(result.error);
                btn.disabled = false;
                btn.textContent = 'Forza Simulazione';
            }
        });
    },

    startTimerUpdate(container) {
        // Pulisci timer precedenti
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Aggiorna ogni minuto
        this.timerInterval = setInterval(async () => {
            if (!this.currentLeague || this.currentLeague.status !== 'in_progress') {
                clearInterval(this.timerInterval);
                return;
            }

            // Ricarica dati lega per timer aggiornato
            this.currentLeague = await window.PrivateLeagues.getLeagueById(this.currentLeague.leagueId);

            if (!this.currentLeague || this.currentLeague.status !== 'in_progress') {
                clearInterval(this.timerInterval);
                this.render();
                return;
            }

            const timeRemaining = window.PrivateLeagues.getTimeUntilNextSimulation(this.currentLeague);
            const canForceSimulate = timeRemaining !== null && timeRemaining <= 0;

            const timerDisplay = container.querySelector('#timer-display');
            const timerBox = container.querySelector('#timer-box');

            if (timerDisplay) {
                if (canForceSimulate) {
                    timerDisplay.textContent = 'PRONTA!';
                    timerDisplay.className = 'text-3xl font-mono font-bold text-green-400';

                    // Aggiorna box
                    if (timerBox && !container.querySelector('#btn-force-simulate')) {
                        timerBox.className = 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-600/50 rounded-xl p-4 text-center border';
                        // Aggiungi bottone se non esiste
                        const btnHtml = `
                            <button id="btn-force-simulate" class="mt-3 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition">
                                Forza Simulazione
                            </button>
                        `;
                        timerDisplay.insertAdjacentHTML('afterend', btnHtml);
                        this.attachInProgressListeners(container);
                    }
                } else {
                    timerDisplay.textContent = window.PrivateLeagues.formatTimeRemaining(timeRemaining);
                }
            }
        }, 60000); // Ogni minuto
    },

    // ================================================================
    // VISTA: COMPLETATA
    // ================================================================

    renderCompletedLeague(container) {
        const league = this.currentLeague;

        // Ordina classifica
        const sortedStandings = [...league.standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
        });

        // Calcola premi netti
        const prizeResults = league.prizeResults || [];

        container.innerHTML = `
            <div class="p-4 space-y-4">
                <!-- Header Vincitore -->
                <div class="text-center mb-4 bg-gradient-to-r from-yellow-900/50 to-amber-900/50 rounded-xl p-6">
                    <div class="text-5xl mb-2">&#127942;</div>
                    <h2 class="text-2xl font-bold text-yellow-400">${league.winner?.teamName || 'Vincitore'}</h2>
                    <p class="text-gray-400">Campione di ${league.name}</p>
                </div>

                <!-- Classifica Finale -->
                <div class="bg-gray-800 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-white mb-3">Classifica Finale</h3>
                    <div class="space-y-2">
                        ${sortedStandings.map((team, i) => {
                            const prizeInfo = prizeResults.find(p => p.teamId === team.teamId);
                            const medals = ['&#129351;', '&#129352;', '&#129353;'];
                            const medal = i < 3 ? medals[i] : `${i + 1}°`;
                            const isWinner = i === 0;

                            return `
                                <div class="flex items-center justify-between ${isWinner ? 'bg-yellow-900/30 border border-yellow-600/50' : 'bg-gray-700/50'} rounded-lg p-3 ${team.teamId === this.currentTeamId ? 'ring-2 ring-purple-500' : ''}">
                                    <div class="flex items-center gap-3">
                                        <span class="text-xl">${medal}</span>
                                        <div>
                                            <span class="text-white font-bold">${team.teamName}</span>
                                            <span class="text-gray-400 text-sm ml-2">${team.points} pt</span>
                                            ${isWinner ? '<span class="ml-2 text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">CAMPIONE</span>' : ''}
                                        </div>
                                    </div>
                                    ${prizeInfo && (prizeInfo.prize > 0 || prizeInfo.netGain !== 0) ? `
                                        <div class="text-right">
                                            <span class="${prizeInfo.netGain >= 0 ? 'text-green-400' : 'text-red-400'} font-bold">
                                                ${prizeInfo.netGain >= 0 ? '+' : ''}${prizeInfo.netGain} CS
                                            </span>
                                            ${prizeInfo.winnerBonus > 0 ? `
                                                <span class="text-yellow-400 text-xs block">
                                                    (bonus vincitore!)
                                                </span>
                                            ` : prizeInfo.prize > 0 ? `
                                                <span class="text-gray-500 text-xs block">
                                                    (${prizeInfo.prize} CS)
                                                </span>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Storico Partite -->
                <div class="bg-gray-800 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-white mb-3">Tutte le Partite</h3>
                    ${this.renderSchedule(league.schedule, 999)}
                </div>

                <!-- Info Cooldown -->
                <div class="bg-orange-900/30 rounded-lg p-4 text-center border border-orange-600/30">
                    <p class="text-orange-400 text-sm">
                        <strong>Nota:</strong> Dopo aver abbandonato questa lega, dovrai attendere il 1° del prossimo mese per partecipare a una nuova lega.
                    </p>
                </div>

                <!-- Abbandona -->
                <button id="btn-leave-completed" class="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">
                    Abbandona Lega (per iniziarne una nuova)
                </button>
            </div>
        `;

        container.querySelector('#btn-leave-completed')?.addEventListener('click', async () => {
            if (!confirm('Vuoi abbandonare questa lega? Dovrai attendere il 1° del prossimo mese per unirti a una nuova lega.')) return;

            const result = await window.PrivateLeagues.leaveLeague(this.currentTeamId);

            if (result.success) {
                if (window.Toast) window.Toast.info('Hai abbandonato la lega');
                await this.refreshTeamData();
                this.currentLeague = null;
                this.render();
            } else {
                if (window.Toast) window.Toast.error(result.error);
            }
        });
    },

    // ================================================================
    // UTILITY
    // ================================================================

    async refreshTeamData() {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const teamDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/teams`, this.currentTeamId));
            if (teamDoc.exists()) {
                this.currentTeamData = teamDoc.data();
            }
        } catch (error) {
            console.error('Errore refresh dati squadra:', error);
        }
    },

    /**
     * Ottiene i CS (Crediti Seri = budget) della squadra
     */
    async getTeamCS() {
        // CS = Crediti Seri = budget (NON creditiSuperSeri che sono i CSS)

        // Prendi dai dati squadra locali
        if (this.currentTeamData?.budget !== undefined) {
            return this.currentTeamData.budget;
        }

        // Ricarica dati dal DB
        await this.refreshTeamData();
        return this.currentTeamData?.budget || 0;
    }
};

console.log("Modulo PrivateLeaguesUI caricato (con timer 48H e cooldown mensile).");
