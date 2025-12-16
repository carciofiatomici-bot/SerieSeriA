//
// ====================================================================
// SUPERCOPPA.JS - Logica Supercoppa Completa
// ====================================================================
//
// La Supercoppa si gioca tra:
// - 1° classificato del Campionato
// - Vincitore della CoppaSeriA
// Se sono la stessa squadra: 1° vs 2° classificato
//
// Formato: Partita secca, rigori in caso di pareggio
// Premio: 1 CSS al vincitore
//

window.Supercoppa = {

    SUPERCOPPA_DOC_ID: 'supercoppa_match',

    // Getter dinamico per premio CSS
    get REWARD_CSS() {
        return window.RewardsConfig?.rewardSupercoppaCSS || 1;
    },

    /**
     * Verifica se le condizioni per la Supercoppa sono soddisfatte
     * (Campionato terminato E Coppa terminata)
     */
    async canCreateSupercoppa() {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        const configRef = doc(db, `artifacts/${appId}/public/data/config`, 'settings');
        const configDoc = await getDoc(configRef);

        if (!configDoc.exists()) return { canCreate: false, reason: 'Configurazione non trovata.' };

        const config = configDoc.data();

        // Verifica campionato terminato
        if (!config.isSeasonOver) {
            return { canCreate: false, reason: 'Il campionato non e ancora terminato.' };
        }

        // Verifica coppa terminata
        if (config.isCupOver === false) {
            return { canCreate: false, reason: 'La CoppaSeriA non e ancora terminata.' };
        }

        // Verifica che non ci sia gia una supercoppa in corso
        const supercoppaBracket = await this.loadSupercoppa();
        if (supercoppaBracket && !supercoppaBracket.isCompleted) {
            return { canCreate: false, reason: 'Una Supercoppa e gia in corso.' };
        }

        return { canCreate: true, reason: null };
    },

    /**
     * Determina i partecipanti alla Supercoppa
     */
    async getParticipants() {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        // Carica classifica campionato
        const leaderboardRef = doc(db, `artifacts/${appId}/public/data/leaderboard`, 'standings');
        const leaderboardDoc = await getDoc(leaderboardRef);

        if (!leaderboardDoc.exists()) {
            throw new Error('Classifica campionato non trovata.');
        }

        const standings = leaderboardDoc.data().standings || [];
        if (standings.length < 2) {
            throw new Error('Servono almeno 2 squadre in classifica.');
        }

        const championId = standings[0].teamId;
        const championName = standings[0].teamName;
        const runnerUpId = standings[1].teamId;
        const runnerUpName = standings[1].teamName;

        // Carica vincitore coppa
        const cupWinner = await window.CoppaMain.getCupWinner();

        let participant1 = { teamId: championId, teamName: championName, qualification: 'Campione' };
        let participant2;

        if (cupWinner && cupWinner.teamId !== championId) {
            // Caso normale: 1° campionato vs Vincitore coppa
            participant2 = { teamId: cupWinner.teamId, teamName: cupWinner.teamName, qualification: 'Vincitore Coppa' };
        } else {
            // Stesso vincitore o nessun vincitore coppa: 1° vs 2° campionato
            participant2 = { teamId: runnerUpId, teamName: runnerUpName, qualification: '2° Campionato' };
        }

        return { participant1, participant2 };
    },

    /**
     * Crea la Supercoppa
     */
    async createSupercoppa() {
        const canCreate = await this.canCreateSupercoppa();
        if (!canCreate.canCreate) {
            throw new Error(canCreate.reason);
        }

        const { participant1, participant2 } = await this.getParticipants();

        const supercoppaBracket = {
            matchId: 'supercoppa_' + Date.now(),
            homeTeam: participant1,
            awayTeam: participant2,
            result: null,
            penalties: null,
            winner: null,
            isCompleted: false,
            creationDate: new Date().toISOString()
        };

        await this.saveSupercoppa(supercoppaBracket);

        console.log(`Supercoppa creata: ${participant1.teamName} vs ${participant2.teamName}`);

        return supercoppaBracket;
    },

    /**
     * Simula la Supercoppa
     */
    async simulateSupercoppa() {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        const supercoppaBracket = await this.loadSupercoppa();
        if (!supercoppaBracket) {
            throw new Error('Nessuna Supercoppa in programma.');
        }

        if (supercoppaBracket.isCompleted) {
            throw new Error('La Supercoppa e gia stata giocata.');
        }

        // Carica i dati delle squadre
        const homeTeamRef = doc(db, `artifacts/${appId}/public/data/teams`, supercoppaBracket.homeTeam.teamId);
        const awayTeamRef = doc(db, `artifacts/${appId}/public/data/teams`, supercoppaBracket.awayTeam.teamId);

        const [homeTeamDoc, awayTeamDoc] = await Promise.all([
            getDoc(homeTeamRef),
            getDoc(awayTeamRef)
        ]);

        if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) {
            throw new Error('Dati squadra non trovati.');
        }

        const homeTeamData = homeTeamDoc.data();
        const awayTeamData = awayTeamDoc.data();

        // Espandi formazione per avere nomi giocatori (per telecronaca)
        const expandFormation = window.GestioneSquadreUtils?.expandFormationFromRosa;
        if (expandFormation) {
            homeTeamData.formation.titolari = expandFormation(homeTeamData.formation?.titolari || [], homeTeamData.players || []);
            awayTeamData.formation.titolari = expandFormation(awayTeamData.formation?.titolari || [], awayTeamData.players || []);
        }

        // Genera log telecronaca
        let matchLog = null;
        if (window.SimulazioneNuoveRegole) {
            const logResult = window.SimulazioneNuoveRegole.runSimulationWithLog(homeTeamData, awayTeamData);
            matchLog = logResult.log;
        }

        // Simula la partita
        const matchResult = window.CoppaSimulation.runMatch(homeTeamData, awayTeamData);

        let finalResult = `${matchResult.homeGoals}-${matchResult.awayGoals}`;
        let winner;
        let penalties = null;

        if (matchResult.homeGoals > matchResult.awayGoals) {
            winner = supercoppaBracket.homeTeam;
        } else if (matchResult.awayGoals > matchResult.homeGoals) {
            winner = supercoppaBracket.awayTeam;
        } else {
            // Pareggio - rigori
            const penaltyResult = window.CoppaSimulation.simulatePenaltyShootout(homeTeamData, awayTeamData);
            penalties = penaltyResult;
            winner = penaltyResult.winner === 'home' ? supercoppaBracket.homeTeam : supercoppaBracket.awayTeam;
            finalResult = `${matchResult.homeGoals}-${matchResult.awayGoals} (d.c.r. ${penaltyResult.homeGoals}-${penaltyResult.awayGoals})`;
        }

        // Aggiorna il bracket
        supercoppaBracket.result = finalResult;
        supercoppaBracket.penalties = penalties;
        supercoppaBracket.winner = winner;
        supercoppaBracket.isCompleted = true;

        // Applica premio al vincitore (1 CSS)
        await this.applyReward(winner.teamId);

        // Processa XP formazione (se feature attiva)
        if (window.FeatureFlags?.isEnabled('formationXp') && window.ChampionshipMain?.addFormationXp) {
            await window.ChampionshipMain.addFormationXp(supercoppaBracket.homeTeam.teamId, homeTeamData.formation?.modulo);
            await window.ChampionshipMain.addFormationXp(supercoppaBracket.awayTeam.teamId, awayTeamData.formation?.modulo);
        }

        // Salva
        await this.saveSupercoppa(supercoppaBracket);

        // Resetta forma giocatori
        await window.CoppaMain.resetPlayersForm([
            supercoppaBracket.homeTeam.teamId,
            supercoppaBracket.awayTeam.teamId
        ]);

        console.log(`Supercoppa completata: ${finalResult}. Vincitore: ${winner.teamName}`);

        // Salva nello storico partite per entrambe le squadre
        if (window.MatchHistory) {
            // Salva per squadra di casa
            await window.MatchHistory.saveMatch(supercoppaBracket.homeTeam.teamId, {
                type: 'supercoppa',
                homeTeam: {
                    id: supercoppaBracket.homeTeam.teamId,
                    name: supercoppaBracket.homeTeam.teamName,
                    logoUrl: homeTeamData.logoUrl || ''
                },
                awayTeam: {
                    id: supercoppaBracket.awayTeam.teamId,
                    name: supercoppaBracket.awayTeam.teamName,
                    logoUrl: awayTeamData.logoUrl || ''
                },
                homeScore: matchResult.homeGoals,
                awayScore: matchResult.awayGoals,
                isHome: true,
                details: {
                    matchLog: matchLog,
                    penalties: penalties
                }
            });

            // Salva per squadra ospite
            await window.MatchHistory.saveMatch(supercoppaBracket.awayTeam.teamId, {
                type: 'supercoppa',
                homeTeam: {
                    id: supercoppaBracket.homeTeam.teamId,
                    name: supercoppaBracket.homeTeam.teamName,
                    logoUrl: homeTeamData.logoUrl || ''
                },
                awayTeam: {
                    id: supercoppaBracket.awayTeam.teamId,
                    name: supercoppaBracket.awayTeam.teamName,
                    logoUrl: awayTeamData.logoUrl || ''
                },
                homeScore: matchResult.homeGoals,
                awayScore: matchResult.awayGoals,
                isHome: false,
                details: {
                    matchLog: matchLog,
                    penalties: penalties
                }
            });

            // Dispatch evento matchSimulated per notifiche push
            document.dispatchEvent(new CustomEvent('matchSimulated', {
                detail: {
                    homeTeam: { id: supercoppaBracket.homeTeam.teamId, name: supercoppaBracket.homeTeam.teamName },
                    awayTeam: { id: supercoppaBracket.awayTeam.teamId, name: supercoppaBracket.awayTeam.teamName },
                    result: `${matchResult.homeGoals}-${matchResult.awayGoals}`,
                    type: 'Supercoppa'
                }
            }));
        }

        // AUTOMAZIONE CSS: Attiva automaticamente i CSS se il flag cssAutomation è abilitato
        await this.triggerCSSAutomation();

        // AUTOMAZIONE SCAMBI: Attiva automaticamente gli scambi se il flag tradesAutomation è abilitato
        await this.triggerTradesAutomation();

        return supercoppaBracket;
    },

    /**
     * Attiva automaticamente i CSS se l'automazione è abilitata
     * (da chiamare quando la supercoppa è terminata = fine stagione completa)
     */
    async triggerCSSAutomation() {
        if (!window.FeatureFlags) return;

        const cssAutomationEnabled = window.FeatureFlags.isEnabled('cssAutomation');
        if (!cssAutomationEnabled) {
            console.log('Automazione CSS disabilitata - CSS non attivato automaticamente');
            return;
        }

        // Verifica che il flag creditiSuperSeri esista
        if (!window.FeatureFlags.flags.creditiSuperSeri) {
            console.log('Flag creditiSuperSeri non trovato');
            return;
        }

        // Attiva i CSS
        try {
            await window.FeatureFlags.setFlag('creditiSuperSeri', true);
            console.log('AUTOMAZIONE CSS: Crediti Super Seri ATTIVATI automaticamente (fine stagione)');

            // Notifica se disponibile
            if (window.Toast) {
                window.Toast.success('I Crediti Super Seri sono ora disponibili!');
            }
        } catch (error) {
            console.error('Errore attivazione automatica CSS:', error);
        }
    },

    /**
     * Attiva automaticamente gli Scambi se l'automazione è abilitata
     * (da chiamare quando la supercoppa è terminata = fine stagione completa)
     */
    async triggerTradesAutomation() {
        if (!window.FeatureFlags) return;

        const tradesAutomationEnabled = window.FeatureFlags.isEnabled('tradesAutomation');
        if (!tradesAutomationEnabled) {
            console.log('Automazione Scambi disabilitata - Scambi non attivati automaticamente');
            return;
        }

        // Verifica che il flag trades esista
        if (!window.FeatureFlags.flags.trades) {
            console.log('Flag trades non trovato');
            return;
        }

        // Attiva gli Scambi
        try {
            await window.FeatureFlags.enable('trades', true);
            console.log('AUTOMAZIONE SCAMBI: Scambi Giocatori ATTIVATI automaticamente (fine stagione)');

            // Notifica se disponibile
            if (window.Toast) {
                window.Toast.success('Gli Scambi Giocatori sono ora disponibili!');
            }
        } catch (error) {
            console.error('Errore attivazione automatica Scambi:', error);
        }
    },

    /**
     * Applica il premio CSS al vincitore
     */
    async applyReward(teamId) {
        const { appId, doc, getDoc, updateDoc } = window.firestoreTools;
        const db = window.db;

        const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        const teamDoc = await getDoc(teamRef);

        if (teamDoc.exists()) {
            await updateDoc(teamRef, {
                creditiSuperSeri: (teamDoc.data().creditiSuperSeri || 0) + this.REWARD_CSS
            });
            console.log(`Premio Supercoppa (${this.REWARD_CSS} CSS) assegnato.`);
        }
    },

    /**
     * Salva la Supercoppa su Firestore
     */
    async saveSupercoppa(bracket) {
        const { appId, doc, setDoc } = window.firestoreTools;
        const db = window.db;

        const supercoppRef = doc(db, `artifacts/${appId}/public/data/schedule`, this.SUPERCOPPA_DOC_ID);
        await setDoc(supercoppRef, bracket);
    },

    /**
     * Carica la Supercoppa da Firestore
     */
    async loadSupercoppa() {
        const { appId, doc, getDoc } = window.firestoreTools;
        const db = window.db;

        const supercoppRef = doc(db, `artifacts/${appId}/public/data/schedule`, this.SUPERCOPPA_DOC_ID);
        const supercoppDoc = await getDoc(supercoppRef);

        return supercoppDoc.exists() ? supercoppDoc.data() : null;
    },

    /**
     * Elimina la Supercoppa
     */
    async deleteSupercoppa() {
        const { appId, doc, deleteDoc } = window.firestoreTools;
        const db = window.db;

        const supercoppRef = doc(db, `artifacts/${appId}/public/data/schedule`, this.SUPERCOPPA_DOC_ID);
        await deleteDoc(supercoppRef);
    },

    /**
     * Renderizza l'UI della Supercoppa (Admin) - Pannello completo stile Coppa
     */
    renderAdminUI(container) {
        this.loadSupercoppa().then(bracket => {
            if (!bracket) {
                this.canCreateSupercoppa().then(status => {
                    container.innerHTML = `
                        <div class="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg border-2 border-yellow-500 p-4">
                            <h3 class="text-2xl font-bold text-yellow-400 mb-4 text-center border-b border-yellow-600 pb-2">
                                ⭐ Supercoppa - Pannello Admin
                            </h3>
                            ${status.canCreate ? `
                                <div class="text-center p-4 bg-black bg-opacity-30 rounded-lg mb-4">
                                    <p class="text-gray-300 mb-3">La Supercoppa e pronta per essere creata!</p>
                                    <p class="text-yellow-400 text-sm">1° Classificato vs Vincitore Coppa (o 2° se stesso vincitore)</p>
                                </div>
                                <button id="btn-create-supercoppa" class="w-full bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl transition">
                                    🏆 Crea Supercoppa
                                </button>
                            ` : `
                                <div class="text-center p-4 bg-red-900 bg-opacity-50 rounded-lg">
                                    <p class="text-red-400 font-bold">⚠️ ${status.reason}</p>
                                    <p class="text-gray-400 text-sm mt-2">Completa prima il campionato e la coppa.</p>
                                </div>
                            `}
                        </div>
                    `;

                    const createBtn = document.getElementById('btn-create-supercoppa');
                    if (createBtn) {
                        createBtn.addEventListener('click', async () => {
                            createBtn.disabled = true;
                            createBtn.innerHTML = '<span class="animate-pulse">Creazione in corso...</span>';
                            try {
                                await this.createSupercoppa();
                                this.renderAdminUI(container);
                            } catch (error) {
                                alert('Errore: ' + error.message);
                                createBtn.disabled = false;
                                createBtn.textContent = '🏆 Crea Supercoppa';
                            }
                        });
                    }
                });
            } else {
                const isCompleted = bracket.isCompleted;

                container.innerHTML = `
                    <div class="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg border-2 border-yellow-500 p-4">
                        <h3 class="text-2xl font-bold text-yellow-400 mb-4 text-center border-b border-yellow-600 pb-2">
                            ⭐ Supercoppa - ${isCompleted ? 'COMPLETATA' : 'IN PROGRAMMA'}
                        </h3>

                        <!-- Info partita -->
                        <div class="p-4 bg-black bg-opacity-40 rounded-lg mb-4">
                            <div class="grid grid-cols-3 gap-4 items-center">
                                <!-- Home Team -->
                                <div class="text-center">
                                    <p class="text-xs text-yellow-300 mb-1">${bracket.homeTeam.qualification}</p>
                                    <p class="text-xl font-bold text-white">${bracket.homeTeam.teamName}</p>
                                </div>

                                <!-- Risultato / VS -->
                                <div class="text-center">
                                    ${bracket.result ?
                                        `<p class="text-3xl font-extrabold text-yellow-400">${bracket.result}</p>
                                         ${bracket.penalties ? `<p class="text-xs text-gray-400">(d.c.r.)</p>` : ''}` :
                                        `<p class="text-2xl text-gray-400 font-bold">VS</p>
                                         <p class="text-xs text-gray-500">Partita Secca</p>`
                                    }
                                </div>

                                <!-- Away Team -->
                                <div class="text-center">
                                    <p class="text-xs text-yellow-300 mb-1">${bracket.awayTeam.qualification}</p>
                                    <p class="text-xl font-bold text-white">${bracket.awayTeam.teamName}</p>
                                </div>
                            </div>

                            ${bracket.winner ? `
                                <div class="mt-4 p-3 bg-green-900 bg-opacity-50 rounded-lg text-center">
                                    <p class="text-green-400 font-extrabold text-lg">
                                        🏆 VINCITORE: ${bracket.winner.teamName}
                                    </p>
                                    <p class="text-green-300 text-sm">Premio: 1 CSS</p>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Bottoni azione -->
                        <div class="space-y-3">
                            ${!isCompleted ? `
                                <button id="btn-simulate-supercoppa" class="w-full bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl transition">
                                    ⚡ Simula Supercoppa
                                </button>
                                <p class="text-center text-gray-400 text-sm">
                                    Partita secca con eventuali rigori in caso di pareggio
                                </p>
                            ` : `
                                <div class="grid grid-cols-2 gap-3">
                                    <button id="btn-view-supercoppa-details" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg">
                                        📊 Dettagli Partita
                                    </button>
                                    <button id="btn-delete-supercoppa" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg">
                                        🗑️ Elimina
                                    </button>
                                </div>
                                <p class="text-center text-gray-400 text-sm">
                                    Elimina per preparare la nuova stagione
                                </p>
                            `}
                        </div>
                    </div>
                `;

                const simBtn = document.getElementById('btn-simulate-supercoppa');
                if (simBtn) {
                    simBtn.addEventListener('click', async () => {
                        simBtn.disabled = true;
                        simBtn.innerHTML = '<span class="animate-pulse">⚡ Simulazione in corso...</span>';
                        try {
                            const result = await this.simulateSupercoppa();
                            // Mostra messaggio di successo
                            alert(`Supercoppa completata!\n\n${result.homeTeam.teamName} vs ${result.awayTeam.teamName}\nRisultato: ${result.result}\n\n🏆 Vincitore: ${result.winner.teamName}\nPremio: 1 CSS assegnato!`);
                            this.renderAdminUI(container);
                        } catch (error) {
                            alert('Errore: ' + error.message);
                            simBtn.disabled = false;
                            simBtn.textContent = '⚡ Simula Supercoppa';
                        }
                    });
                }

                const delBtn = document.getElementById('btn-delete-supercoppa');
                if (delBtn) {
                    delBtn.addEventListener('click', async () => {
                        if (confirm('Eliminare la Supercoppa?\n\nQuesta azione prepara la nuova stagione.\nI premi sono gia stati assegnati.')) {
                            try {
                                await this.deleteSupercoppa();
                                this.renderAdminUI(container);
                            } catch (error) {
                                alert('Errore: ' + error.message);
                            }
                        }
                    });
                }

                const detailsBtn = document.getElementById('btn-view-supercoppa-details');
                if (detailsBtn && bracket.penalties) {
                    detailsBtn.addEventListener('click', () => {
                        let penaltyLog = 'CALCI DI RIGORE:\n\n';
                        bracket.penalties.shootout.forEach((kick, i) => {
                            const team = kick.team === 'home' ? bracket.homeTeam.teamName : bracket.awayTeam.teamName;
                            const result = kick.scored ? '⚽ GOL' : '❌ PARATO';
                            penaltyLog += `${i + 1}. ${team} - ${kick.shooter}: ${result}\n`;
                        });
                        penaltyLog += `\nRisultato rigori: ${bracket.penalties.homeGoals}-${bracket.penalties.awayGoals}`;
                        alert(penaltyLog);
                    });
                } else if (detailsBtn) {
                    detailsBtn.addEventListener('click', () => {
                        alert(`Supercoppa\n\n${bracket.homeTeam.teamName} vs ${bracket.awayTeam.teamName}\n\nRisultato: ${bracket.result}\nVincitore: ${bracket.winner.teamName}`);
                    });
                }
            }
        });
    },

    /**
     * Renderizza l'UI della Supercoppa (Utente)
     */
    async renderUserUI(teamId, container) {
        const bracket = await this.loadSupercoppa();

        if (!bracket) {
            container.innerHTML = `
                <div class="p-4 bg-gray-800 rounded-lg">
                    <p class="text-gray-400 text-center">Nessuna Supercoppa in programma.</p>
                </div>
            `;
            return;
        }

        const isParticipant = bracket.homeTeam.teamId === teamId || bracket.awayTeam.teamId === teamId;

        container.innerHTML = `
            <div class="p-4 bg-gray-800 rounded-lg border ${isParticipant ? 'border-yellow-500' : 'border-gray-600'}">
                <h3 class="text-xl font-bold text-yellow-400 mb-3">⭐ Supercoppa</h3>
                ${isParticipant ? `<p class="text-green-400 mb-2">La tua squadra partecipa!</p>` : ''}
                <div class="p-3 bg-gray-700 rounded-lg">
                    <div class="flex justify-between items-center">
                        <div class="text-center flex-1">
                            <p class="text-xs text-gray-400">${bracket.homeTeam.qualification}</p>
                            <p class="font-bold ${bracket.homeTeam.teamId === teamId ? 'text-yellow-400' : 'text-white'}">${bracket.homeTeam.teamName}</p>
                        </div>
                        <div class="text-center px-4">
                            ${bracket.result ?
                                `<p class="text-xl font-bold text-yellow-400">${bracket.result}</p>` :
                                `<p class="text-gray-500">VS</p>`
                            }
                        </div>
                        <div class="text-center flex-1">
                            <p class="text-xs text-gray-400">${bracket.awayTeam.qualification}</p>
                            <p class="font-bold ${bracket.awayTeam.teamId === teamId ? 'text-yellow-400' : 'text-white'}">${bracket.awayTeam.teamName}</p>
                        </div>
                    </div>
                    ${bracket.winner ? `
                        <p class="text-center text-green-400 font-bold mt-2">
                            🏆 ${bracket.winner.teamName}
                        </p>
                    ` : `
                        <p class="text-center text-gray-400 text-sm mt-2">In attesa di simulazione</p>
                    `}
                </div>
            </div>
        `;
    }
};

console.log("Modulo Supercoppa caricato.");
