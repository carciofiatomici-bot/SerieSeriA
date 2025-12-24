//
// ====================================================================
// CAMPIONATO.JS - Versione Modularizzata (Usa i 5 moduli esterni)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    const championshipContent = document.getElementById('championship-content');
    const championshipToolsContainer = document.getElementById('championship-tools-container');
    const adminContent = document.getElementById('admin-content');
    
    let db;
    let firestoreTools;
    let CHAMPIONSHIP_CONFIG_PATH;
    let TEAMS_COLLECTION_PATH;
    let SCHEDULE_COLLECTION_PATH; 
    let LEADERBOARD_COLLECTION_PATH; 

    const CONFIG_DOC_ID = 'settings';
    const SCHEDULE_DOC_ID = 'full_schedule';
    const LEADERBOARD_DOC_ID = 'standings';
    const DEFAULT_LOGO_URL = "https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg";

    const getLogoHtml = (teamId) => {
        if (window.getLogoHtml) return window.getLogoHtml(teamId);
        return `<img src="${DEFAULT_LOGO_URL}" alt="Logo" class="w-6 h-6 rounded-full border border-gray-500 inline-block align-middle mr-2">`;
    };

    const displayConfigMessage = (message, type) => {
        const msgElement = document.getElementById('championship-message');
        if (!msgElement) return;
        msgElement.textContent = message;
        msgElement.classList.remove('text-red-400', 'text-green-500', 'text-yellow-400');
        if (type === 'error') msgElement.classList.add('text-red-400');
        else if (type === 'success') msgElement.classList.add('text-green-500');
        else if (type === 'info') msgElement.classList.add('text-yellow-400');
    };
    
    // ====================================================================
    // FUNZIONI CHE USANO I MODULI
    // ====================================================================

    const simulateSingleMatch = async (roundIndex, matchIndex, schedule, allTeams, button) => {
        displayConfigMessage(`Simulazione match G${schedule[roundIndex].round} in corso...`, 'info');
        try {
            await window.ChampionshipMain.simulateSingleMatch(
                roundIndex, matchIndex, schedule, allTeams, button, renderFullScheduleSimulation
            );
            displayConfigMessage(`Partita simulata con successo!`, 'success');
        } catch (error) {
            displayConfigMessage(`Simulazione Fallita: ${error.message}`, 'error');
        }
    };

    const simulateCurrentRound = async (roundIndex, schedule, allTeams, button) => {
        const roundNum = schedule[roundIndex].round;
        displayConfigMessage(`Simulazione Giornata ${roundNum} in corso...`, 'info');
        
        try {
            await window.ChampionshipMain.simulateCurrentRound(
                roundIndex, schedule, allTeams, button, renderFullScheduleSimulation
            );
            displayConfigMessage(`Giornata ${roundNum} completata!`, 'success');
        } catch (error) {
            displayConfigMessage(`Simulazione Fallita: ${error.message}`, 'error');
        }
    };

    const handleSeasonEnd = async () => {
        const button = document.querySelector('[data-action="end-season"]');
        if (button) button.disabled = true;
        
        displayConfigMessage("Terminazione Campionato in corso: Calcolo premi e progressione allenatori...", 'info');
        
        const { doc, setDoc, getDoc, deleteDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
        const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);


        try {
            // Usa LeaderboardListener per cache condivisa
            const leaderboardData = await window.LeaderboardListener.getLeaderboard();
            if (!leaderboardData?.standings || leaderboardData.standings.length === 0) {
                 throw new Error("Classifica non trovata o vuota. Impossibile assegnare i premi.");
            }
            const standings = leaderboardData.standings;
            
            const result = await window.ChampionshipRewards.applySeasonEndRewards(standings);
            const { totalTeams, levelUps } = result;

            // Decrementa contratti di tutti i giocatori (se sistema contratti attivo)
            let contractsMessage = '';
            if (window.Contracts?.isEnabled()) {
                try {
                    const contractsResult = await window.Contracts.decrementAllContracts();
                    const totalExpired = contractsResult.results.reduce((sum, r) => sum + r.expired.length, 0);
                    if (totalExpired > 0) {
                        contractsMessage = ` ${totalExpired} giocatori con contratto scaduto venduti.`;
                    }
                } catch (contractError) {
                    console.error('[Campionato] Errore decremento contratti:', contractError);
                }
            }

            await deleteDoc(scheduleDocRef);
            // Resetta lastAutoSimulatedDate a 0
            await setDoc(configDocRef, { isSeasonOver: true, isDraftOpen: false, isMarketOpen: false, lastAutoSimulatedDate: 0 }, { merge: true });

            // Verifica e crea automaticamente la Supercoppa se possibile
            let supercoppaMess = '';
            if (window.Supercoppa?.checkAndCreateSupercoppa) {
                const supercoppResult = await window.Supercoppa.checkAndCreateSupercoppa();
                if (supercoppResult.created) {
                    supercoppaMess = ` Supercoppa creata: ${supercoppResult.bracket.homeTeam.teamName} vs ${supercoppResult.bracket.awayTeam.teamName}!`;
                }
            }

            displayConfigMessage(
                `Campionato TERMINATO! Assegnati premi a ${totalTeams} squadre. ${levelUps} allenatori sono saliti di livello (20% chance).${contractsMessage}${supercoppaMess} Calendario eliminato.`,
                'success'
            );

            renderChampionshipPanel();

        } catch (error) {
            console.error("Errore durante la terminazione del campionato:", error);
            displayConfigMessage(`Errore critico durante la terminazione: ${error.message}`, 'error');
            if (button) button.disabled = false;
        }
    };
    
    const handleSeasonEndForTesting = async () => {
        const button = document.querySelector('[data-action="test-reset"]');
        if (button) button.disabled = true;
        
        displayConfigMessage("Terminazione Campionato forzata per testing... (NESSUN PREMIO O LIVELLO ASSEGNATO)", 'info');
        
        const { doc, setDoc, deleteDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
        
        try {
            await deleteDoc(scheduleDocRef);
            // Resetta lastAutoSimulatedDate a 0
            await setDoc(configDocRef, { isSeasonOver: true, isDraftOpen: false, isMarketOpen: false, lastAutoSimulatedDate: 0 }, { merge: true });
            
            displayConfigMessage(`Campionato TERMINATO per TESTING. Calendario eliminato. Budget e Livelli Allenatori NON modificati.`, 'success');
            renderChampionshipPanel();

        } catch (error) {
            console.error("Errore durante la terminazione per testing:", error);
            displayConfigMessage(`Errore critico durante la terminazione per testing: ${error.message}`, 'error');
            if (button) button.disabled = false;
        }
    };

    const generateSchedule = async (teams) => {
        if (!teams || teams.length < 2) {
            return displayConfigMessage("Errore: Necessarie almeno 2 squadre flaggate per generare il calendario.", 'error');
        }

        // Verifica se il campionato e' in corso (ci sono partite giocate)
        try {
            const schedulePath = `artifacts/${appId}/public/data/schedule/full_schedule`;
            const scheduleRef = doc(db, schedulePath);
            const scheduleSnap = await getDoc(scheduleRef);

            if (scheduleSnap.exists()) {
                const existingSchedule = scheduleSnap.data().matches || [];
                const playedMatches = existingSchedule.reduce((count, round) => {
                    return count + (round.matches?.filter(m => m.result !== null).length || 0);
                }, 0);

                if (playedMatches > 0) {
                    return displayConfigMessage(
                        `Impossibile generare un nuovo calendario: il campionato e' in corso (${playedMatches} partite giocate). Termina o resetta prima il campionato attuale.`,
                        'error'
                    );
                }
            }
        } catch (err) {
            console.warn("Errore verifica campionato in corso:", err);
        }

        displayConfigMessage("Generazione calendario in corso...", 'info');
        const button = document.getElementById('btn-generate-schedule');
        button.disabled = true;

        try {
            const schedule = window.ChampionshipSchedule.generateRoundRobinSchedule(teams);
            const result = await window.ChampionshipSchedule.saveScheduleAndInitialize(teams, schedule);

            // FIX: Imposta la data CORRENTE invece di 0 per evitare simulazione immediata
            // Il countdown partirà da ORA (48h da adesso)
            await window.ChampionshipMain.updateLastAutoSimulatedDate(Date.now());

            // AUTOMAZIONE CSS: Disattiva automaticamente i CSS se il flag cssAutomation è abilitato
            await disableCSSAutomation();

            // AUTOMAZIONE SCAMBI: Disattiva automaticamente gli scambi se il flag tradesAutomation è abilitato
            await disableTradesAutomation();

            displayConfigMessage(
                `Calendario di ${result.totalRounds} giornate (Andata/Ritorno) generato e salvato per ${result.numTeams} squadre flaggate! Classifica azzerata.`,
                'success'
            );
            button.disabled = false;
            renderChampionshipPanel();

        } catch (error) {
            console.error("Errore nel salvataggio del calendario:", error);
            displayConfigMessage(`Errore di salvataggio: ${error.message}`, 'error');
            button.disabled = false;
        }
    };

    /**
     * Disattiva automaticamente i CSS se l'automazione è abilitata
     * (da chiamare quando inizia il nuovo campionato)
     */
    const disableCSSAutomation = async () => {
        if (!window.FeatureFlags) return;

        const cssAutomationEnabled = window.FeatureFlags.isEnabled('cssAutomation');
        if (!cssAutomationEnabled) {
            console.log('Automazione CSS disabilitata - CSS non disattivato automaticamente');
            return;
        }

        // Verifica che il flag creditiSuperSeri esista
        if (!window.FeatureFlags.flags.creditiSuperSeri) {
            console.log('Flag creditiSuperSeri non trovato');
            return;
        }

        // Disattiva i CSS
        try {
            await window.FeatureFlags.setFlag('creditiSuperSeri', false);
            console.log('AUTOMAZIONE CSS: Crediti Super Seri DISATTIVATI automaticamente (inizio stagione)');

            // Notifica se disponibile
            if (window.Toast) {
                window.Toast.info('I Crediti Super Seri sono stati disattivati per la nuova stagione.');
            }
        } catch (error) {
            console.error('Errore disattivazione automatica CSS:', error);
        }
    };

    /**
     * Disattiva automaticamente gli Scambi se l'automazione è abilitata
     * (da chiamare quando inizia il nuovo campionato)
     */
    const disableTradesAutomation = async () => {
        if (!window.FeatureFlags) return;

        const tradesAutomationEnabled = window.FeatureFlags.isEnabled('tradesAutomation');
        if (!tradesAutomationEnabled) {
            console.log('Automazione Scambi disabilitata - Scambi non disattivati automaticamente');
            return;
        }

        // Verifica che il flag trades esista
        if (!window.FeatureFlags.flags.trades) {
            console.log('Flag trades non trovato');
            return;
        }

        // Disattiva gli Scambi
        try {
            await window.FeatureFlags.disable('trades', true);
            console.log('AUTOMAZIONE SCAMBI: Scambi Giocatori DISATTIVATI automaticamente (inizio stagione)');

            // Notifica se disponibile
            if (window.Toast) {
                window.Toast.info('Gli Scambi Giocatori sono stati disattivati per la nuova stagione.');
            }
        } catch (error) {
            console.error('Errore disattivazione automatica Scambi:', error);
        }
    };

    /**
     * Calcola le statistiche della stagione corrente
     */
    const calculateSeasonStats = (schedule) => {
        let playedMatches = 0;
        let totalMatches = 0;
        let totalGoals = 0;

        schedule.forEach(round => {
            round.matches.forEach(match => {
                totalMatches++;
                if (match.result) {
                    playedMatches++;
                    const [homeGoals, awayGoals] = match.result.split('-').map(Number);
                    totalGoals += (homeGoals || 0) + (awayGoals || 0);
                }
            });
        });

        const avgGoals = playedMatches > 0 ? (totalGoals / playedMatches).toFixed(2) : '0.00';
        const progressPercent = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0;

        return {
            playedMatches,
            totalMatches,
            totalGoals,
            avgGoals,
            progressPercent
        };
    };

    const renderSchedulePreview = (schedule, numTeams) => {
        return window.ChampionshipUI.renderSchedulePreview(schedule, numTeams);
    };

    const renderFullScheduleSimulation = (schedule, allTeams) => {
        window.ChampionshipUI.renderFullScheduleSimulation(schedule, allTeams, {
            onSimulateSingle: simulateSingleMatch,
            onSimulateRound: (roundIndex, schedule, allTeams, button) => {
                 // Usa simulateCurrentRound per l'azione manuale
                 simulateCurrentRound(roundIndex, schedule, allTeams, button);
                 // Dopo l'azione manuale, il cooldown automatico non viene resettato automaticamente
            },
            onBackToDashboard: renderChampionshipPanel
        });
    };

    // ====================================================================
    // RENDERING INTERFACCIA PRINCIPALE
    // ====================================================================

    const renderChampionshipPanel = async () => {
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId, doc, getDoc, collection, getDocs } = firestoreTools;
        CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
        LEADERBOARD_COLLECTION_PATH = `artifacts/${appId}/public/data/leaderboard`;
        
        championshipToolsContainer.innerHTML = `<p class="text-center text-gray-400">Caricamento configurazione e squadre...</p>`;

        try {
            const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            let configDoc = await getDoc(configDocRef);
            let configData = configDoc.exists() ? configDoc.data() : {};

            let draftOpen = configData.isDraftOpen || false;
            let marketOpen = configData.isMarketOpen || false; 
            let isSeasonOver = configData.isSeasonOver || false;

            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const teamsSnapshot = await getDocs(teamsCollectionRef);
            
            const allTeams = teamsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                name: doc.data().teamName, 
                isParticipating: doc.data().isParticipating || false 
            }));
            const participatingTeams = allTeams.filter(t => t.isParticipating);
            const numTeamsParticipating = participatingTeams.length;

            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            let scheduleDoc = await getDoc(scheduleDocRef);
            let schedule = scheduleDoc.exists() ? scheduleDoc.data().matches : [];
            
            const nextRound = schedule.find(round => 
                round.matches.some(match => match.result === null)
            );
            const totalRounds = schedule.length > 0 ? schedule[schedule.length - 1].round : 0;
            const isFinished = !nextRound && totalRounds > 0;
            
            if (window.fetchAllTeamLogos) await window.fetchAllTeamLogos();
            
            const isReadyForEnd = isFinished && !isSeasonOver;
            const canGenerate = isSeasonOver && numTeamsParticipating >= 2;

            const statusText = isSeasonOver ? 'TERMINATO (Pausa)' : (totalRounds > 0 ? 'IN CORSO' : 'INIZIALIZZAZIONE');
            const statusClass = isSeasonOver ? 'bg-red-900 border-red-500 text-red-400' : 'bg-green-900 border-green-500 text-green-400';

            // Calcola statistiche stagione
            const seasonStats = calculateSeasonStats(schedule);


            // HTML per statistiche stagione
            const statsHtml = totalRounds > 0 ? `
                <div class="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg border-2 border-blue-500 shadow-md">
                    <h4 class="text-xl font-bold text-blue-400 mb-3 flex items-center">
                        <span class="mr-2">📊</span> Statistiche Stagione
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="bg-black bg-opacity-30 rounded-lg p-3 text-center">
                            <p class="text-3xl font-bold text-white">${seasonStats.playedMatches}</p>
                            <p class="text-xs text-gray-400">Partite Giocate</p>
                        </div>
                        <div class="bg-black bg-opacity-30 rounded-lg p-3 text-center">
                            <p class="text-3xl font-bold text-gray-400">${seasonStats.totalMatches}</p>
                            <p class="text-xs text-gray-400">Partite Totali</p>
                        </div>
                        <div class="bg-black bg-opacity-30 rounded-lg p-3 text-center">
                            <p class="text-3xl font-bold text-green-400">${seasonStats.totalGoals}</p>
                            <p class="text-xs text-gray-400">Goal Totali</p>
                        </div>
                        <div class="bg-black bg-opacity-30 rounded-lg p-3 text-center">
                            <p class="text-3xl font-bold text-yellow-400">${seasonStats.avgGoals}</p>
                            <p class="text-xs text-gray-400">Media Goal/Partita</p>
                        </div>
                    </div>
                    <div class="mt-3 bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div class="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
                             style="width: ${seasonStats.progressPercent}%"></div>
                    </div>
                    <p class="text-center text-xs text-gray-400 mt-1">Progresso stagione: ${seasonStats.progressPercent}%</p>
                </div>
            ` : '';

            championshipToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-800 rounded-lg border border-orange-600 shadow-inner-lg space-y-6">

                    <!-- SEZIONE: Stato Generale -->
                    <div class="bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <h3 class="text-xl font-bold text-orange-400 border-b border-gray-600 pb-2 mb-4 flex items-center">
                            <span class="mr-2">⚙️</span> Stato Generale
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-600">
                                <p class="text-2xl font-bold text-yellow-400">${numTeamsParticipating}</p>
                                <p class="text-xs text-gray-400">Squadre Iscritte</p>
                            </div>
                            <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-600">
                                <p class="text-2xl font-bold ${draftOpen ? 'text-green-400' : 'text-red-400'}">${draftOpen ? 'APERTO' : 'CHIUSO'}</p>
                                <p class="text-xs text-gray-400">Draft</p>
                            </div>
                            <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-600">
                                <p class="text-2xl font-bold ${marketOpen ? 'text-green-400' : 'text-red-400'}">${marketOpen ? 'APERTO' : 'CHIUSO'}</p>
                                <p class="text-xs text-gray-400">Mercato</p>
                            </div>
                            <div class="bg-gray-800 rounded-lg p-3 text-center border-2 ${statusClass}">
                                <p class="text-lg font-bold">${statusText}</p>
                                <p class="text-xs text-gray-400">Stagione</p>
                            </div>
                        </div>

                        <!-- Nota: Toggle Draft/Mercato spostati in Gestione Giocatori -->
                    </div>

                    <!-- SEZIONE: Statistiche Stagione -->
                    ${statsHtml}

                    <!-- SEZIONE: Premi Individuali (Capocannoniere, Assistman, Clean Sheets) -->
                    <div id="season-individual-stats-container"></div>

                    <!-- SEZIONE: Generazione & Calendario -->
                    <div class="bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <h3 class="text-xl font-bold text-orange-400 border-b border-gray-600 pb-2 mb-4 flex items-center">
                            <span class="mr-2">📅</span> Generazione & Calendario
                        </h3>

                        <div class="space-y-3">
                            <button id="btn-generate-schedule"
                                    class="w-full bg-red-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    ${canGenerate ? '' : 'disabled'}>
                                🚀 Genera Nuovo Calendario (Avvia nuova stagione)
                            </button>
                            ${!canGenerate
                                ? `<p class="text-red-400 text-center text-sm font-semibold">${!isSeasonOver ? '⚠️ Termina il campionato attuale prima' : (numTeamsParticipating < 2 ? '⚠️ Iscrivi almeno 2 squadre' : '')}</p>`
                                : `<p class="text-green-400 text-center text-sm font-semibold">✅ Stagione conclusa. Pronto per generare il nuovo calendario.</p>`
                            }

                            ${totalRounds > 0 && !isSeasonOver ?
                                `<button id="btn-show-full-schedule" class="w-full bg-teal-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-teal-500 transition">
                                    📋 Vai al Calendario Completo (${schedule.length} Giornate)
                                </button>` : ''
                            }
                        </div>
                    </div>

                    <!-- SEZIONE: Fine Stagione Campionato -->
                    <div class="bg-gray-900 rounded-lg p-4 border border-red-700">
                        <h3 class="text-xl font-bold text-red-400 border-b border-gray-600 pb-2 mb-4 flex items-center">
                            <span class="mr-2">🏁</span> Fine Stagione - Campionato
                        </h3>
                        <div class="space-y-3" id="championship-end-actions">
                            <button data-action="end-season"
                                    class="w-full bg-red-800 text-white font-extrabold py-3 rounded-lg shadow-md hover:bg-red-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    ${!isReadyForEnd ? 'disabled' : ''}>
                                🏆 TERMINA CAMPIONATO (Assegna Premi & Livelli)
                            </button>

                            <button data-action="test-reset"
                                    class="w-full bg-orange-600 text-white font-extrabold py-2 rounded-lg shadow-md hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    ${isFinished || schedule.length === 0 || isSeasonOver ? '' : 'disabled'}>
                                🔄 TERMINA SENZA PREMI (Solo Test/Reset)
                            </button>

                            ${isReadyForEnd ? '<p class="text-green-400 text-center text-sm">✅ Tutte le partite completate. Pronto per terminare.</p>' :
                              (totalRounds > 0 && !isSeasonOver ? '<p class="text-yellow-400 text-center text-sm">⏳ Completa tutte le giornate per terminare la stagione.</p>' : '')}
                        </div>
                    </div>

                    <!-- SEZIONE: Fine Coppa -->
                    <div class="bg-gray-900 rounded-lg p-4 border border-purple-700">
                        <h3 class="text-xl font-bold text-purple-400 border-b border-gray-600 pb-2 mb-4 flex items-center">
                            <span class="mr-2">🏆</span> Fine Stagione - CoppaSeriA
                        </h3>
                        <div class="space-y-3" id="cup-end-actions">
                            <div id="cup-end-status" class="text-center text-gray-400 text-sm">Caricamento stato coppa...</div>
                        </div>
                    </div>

                    <!-- SEZIONE: Fine Supercoppa -->
                    <div class="bg-gray-900 rounded-lg p-4 border border-yellow-700">
                        <h3 class="text-xl font-bold text-yellow-400 border-b border-gray-600 pb-2 mb-4 flex items-center">
                            <span class="mr-2">⭐</span> Fine Stagione - Supercoppa
                        </h3>
                        <div class="space-y-3" id="supercoppa-end-actions">
                            <div id="supercoppa-end-status" class="text-center text-gray-400 text-sm">Caricamento stato supercoppa...</div>
                        </div>
                    </div>

                    <!-- Anteprima Calendario -->
                    <div id="schedule-display-container" class="mt-4">
                        ${renderSchedulePreview(schedule, numTeamsParticipating)}
                    </div>

                    <p id="championship-message" class="text-center mt-3 text-red-400 font-bold"></p>
                </div>
            `;
            const championshipEndContainer = document.getElementById('championship-end-actions');
            if (championshipEndContainer) {
                championshipEndContainer.addEventListener('click', (e) => {
                    const target = e.target;
                    const action = target.dataset.action;
                    if (action === 'end-season' && !target.disabled) confirmSeasonEnd(false);
                    else if (action === 'test-reset' && !target.disabled) confirmSeasonEnd(true);
                });
            }

            // Carica stato e UI per Coppa
            loadCupEndSection();

            // Carica stato e UI per Supercoppa
            loadSupercoppEndSection();

            // Carica statistiche individuali stagionali (capocannoniere, assistman, clean sheets)
            if (window.PlayerSeasonStatsUI && totalRounds > 0 && !isSeasonOver) {
                window.PlayerSeasonStatsUI.renderStatsPanel('season-individual-stats-container');
            }

            const btnShowFullSchedule = document.getElementById('btn-show-full-schedule');
            if (btnShowFullSchedule) {
                btnShowFullSchedule.addEventListener('click', async () => {
                    const reloadedScheduleDoc = await getDoc(scheduleDocRef);
                    const reloadedSchedule = reloadedScheduleDoc.exists() ? reloadedScheduleDoc.data().matches : [];
                    renderFullScheduleSimulation(reloadedSchedule, allTeams);
                });
            }

            // Nota: Toggle Draft/Mercato ora sono in Gestione Giocatori (admin-ui.js)

            if (canGenerate) {
                 document.getElementById('btn-generate-schedule').addEventListener('click', () => generateSchedule(participatingTeams));
            }
            
        } catch (error) {
            console.error("Errore nel caricamento configurazione:", error);
            championshipToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: Impossibile caricare la configurazione.</p>`;
        }
    };

    /**
     * Carica la sezione Fine Stagione per la CoppaSeriA
     */
    const loadCupEndSection = async () => {
        const container = document.getElementById('cup-end-actions');
        if (!container) return;

        try {
            const bracket = await window.CoppaSchedule.loadCupSchedule();
            const { doc, getDoc } = firestoreTools;
            const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);
            const isCupOver = configDoc.exists() ? (configDoc.data().isCupOver !== false) : true;

            if (!bracket) {
                container.innerHTML = `
                    <p class="text-gray-400 text-center">Nessuna CoppaSeriA in corso.</p>
                    ${isCupOver ? '<p class="text-green-400 text-center text-sm">✅ Coppa terminata o non ancora generata.</p>' : ''}
                `;
                return;
            }

            const isCompleted = bracket.status === 'completed';
            const winner = bracket.winner;

            if (isCompleted && !isCupOver) {
                container.innerHTML = `
                    <p class="text-green-400 text-center mb-3">✅ CoppaSeriA completata! Vincitore: <strong>${winner?.teamName || 'N/A'}</strong></p>
                    <button id="btn-end-cup-rewards"
                            class="w-full bg-purple-700 text-white font-extrabold py-3 rounded-lg shadow-md hover:bg-purple-800 transition">
                        🏆 TERMINA COPPA (Assegna Premi)
                    </button>
                    <button id="btn-end-cup-no-rewards"
                            class="w-full bg-orange-600 text-white font-extrabold py-2 rounded-lg shadow-md hover:bg-orange-700 transition mt-2">
                        🔄 TERMINA SENZA PREMI (Solo Reset)
                    </button>
                    <p class="text-purple-300 text-center text-sm mt-2">Premi: 1 CSS al vincitore, 150 CS a 2, 3, 4 posto</p>
                `;

                document.getElementById('btn-end-cup-rewards').addEventListener('click', async (e) => {
                    const btn = e.target;
                    const confirmation = prompt('CONFERMA CHIUSURA COPPA\n\nAssegnerai i premi ufficiali.\n\nDigita "SI" per confermare:');
                    if (confirmation && confirmation.toUpperCase() === 'SI') {
                        btn.disabled = true;
                        btn.innerHTML = '<span class="animate-pulse">Assegnazione premi...</span>';
                        try {
                            const result = await window.CoppaMain.applyCupRewards();
                            alert('CoppaSeriA terminata! Premi assegnati con successo.');
                            loadCupEndSection();
                        } catch (error) {
                            alert('Errore: ' + error.message);
                            btn.disabled = false;
                            btn.textContent = '🏆 TERMINA COPPA (Assegna Premi)';
                        }
                    }
                });

                document.getElementById('btn-end-cup-no-rewards').addEventListener('click', async (e) => {
                    const btn = e.target;
                    const confirmation = prompt('ATTENZIONE: Terminerai la coppa SENZA assegnare premi.\n\nDigita "SI" per confermare:');
                    if (confirmation && confirmation.toUpperCase() === 'SI') {
                        btn.disabled = true;
                        btn.innerHTML = '<span class="animate-pulse">Reset in corso...</span>';
                        try {
                            await window.CoppaMain.terminateCupWithoutRewards();
                            alert('CoppaSeriA terminata senza premi.');
                            loadCupEndSection();
                        } catch (error) {
                            alert('Errore: ' + error.message);
                            btn.disabled = false;
                            btn.textContent = '🔄 TERMINA SENZA PREMI (Solo Reset)';
                        }
                    }
                });

            } else if (isCupOver) {
                container.innerHTML = `
                    <p class="text-green-400 text-center">✅ CoppaSeriA gia terminata.</p>
                    <p class="text-gray-400 text-center text-sm">Pronta per nuova generazione.</p>
                `;
            } else {
                const nextMatch = window.CoppaSchedule.findNextMatch(bracket);
                const roundInfo = nextMatch ? 'Turno corrente: ' + nextMatch.round.roundName : 'Completa tutte le partite';
                container.innerHTML = `
                    <p class="text-yellow-400 text-center">⏳ CoppaSeriA in corso</p>
                    <p class="text-gray-400 text-center text-sm">${roundInfo}</p>
                    <p class="text-gray-500 text-center text-xs mt-2">Completa tutte le partite per terminare la coppa.</p>
                `;
            }

        } catch (error) {
            console.error('Errore caricamento sezione fine coppa:', error);
            container.innerHTML = '<p class="text-red-400 text-center">Errore caricamento stato coppa.</p>';
        }
    };

    /**
     * Carica la sezione Fine Stagione per la Supercoppa
     */
    const loadSupercoppEndSection = async () => {
        const container = document.getElementById('supercoppa-end-actions');
        if (!container) return;

        try {
            const bracket = await window.Supercoppa.loadSupercoppa();

            if (!bracket) {
                const canCreate = await window.Supercoppa.canCreateSupercoppa();
                container.innerHTML = `
                    <p class="text-gray-400 text-center">Nessuna Supercoppa in corso.</p>
                    ${canCreate.canCreate
                        ? '<p class="text-green-400 text-center text-sm">✅ Pronta per essere creata dal pannello Supercoppa.</p>'
                        : '<p class="text-yellow-400 text-center text-sm">⚠️ ' + canCreate.reason + '</p>'
                    }
                `;
                return;
            }

            if (bracket.isCompleted) {
                container.innerHTML = `
                    <p class="text-green-400 text-center mb-3">✅ Supercoppa completata! Vincitore: <strong>${bracket.winner?.teamName || 'N/A'}</strong></p>
                    <p class="text-gray-400 text-center text-sm mb-3">Il premio (1 CSS) e gia stato assegnato automaticamente.</p>
                    <button id="btn-delete-supercoppa-end"
                            class="w-full bg-red-600 text-white font-extrabold py-2 rounded-lg shadow-md hover:bg-red-700 transition">
                        🗑️ ELIMINA SUPERCOPPA (Prepara nuova stagione)
                    </button>
                `;

                document.getElementById('btn-delete-supercoppa-end').addEventListener('click', async (e) => {
                    const btn = e.target;
                    if (confirm('Eliminare la Supercoppa?\n\nI premi sono gia stati assegnati.')) {
                        btn.disabled = true;
                        btn.innerHTML = '<span class="animate-pulse">Eliminazione...</span>';
                        try {
                            await window.Supercoppa.deleteSupercoppa();
                            alert('Supercoppa eliminata. Pronto per nuova stagione.');
                            loadSupercoppEndSection();
                        } catch (error) {
                            alert('Errore: ' + error.message);
                            btn.disabled = false;
                            btn.textContent = '🗑️ ELIMINA SUPERCOPPA (Prepara nuova stagione)';
                        }
                    }
                });

            } else {
                container.innerHTML = `
                    <p class="text-yellow-400 text-center">⏳ Supercoppa in programma</p>
                    <p class="text-gray-400 text-center text-sm">${bracket.homeTeam?.teamName} vs ${bracket.awayTeam?.teamName}</p>
                    <p class="text-gray-500 text-center text-xs mt-2">Simula la partita dal pannello Supercoppa.</p>
                `;
            }

        } catch (error) {
            console.error('Errore caricamento sezione fine supercoppa:', error);
            container.innerHTML = '<p class="text-red-400 text-center">Errore caricamento stato supercoppa.</p>';
        }
    };

    const confirmSeasonEnd = (isTestMode) => {
        const message = isTestMode
            ? "ATTENZIONE: Stai per terminare il campionato SENZA assegnare crediti o livellare gli allenatori. Il calendario verra eliminato. Continuare?"
            : "AZIONE CRITICA: Stai per terminare la stagione UFFICIALE. Premi, crediti e progressione allenatori verranno assegnati. Il calendario verra eliminato. Continuare?";
        
        const title = isTestMode ? "Conferma Reset Campionato (TEST)" : "Conferma Chiusura Stagione Ufficiale";
        const confirmation = prompt(`${title}\n\n${message}\n\nDigita 'SI' per confermare:`);
        
        if (confirmation && confirmation.toUpperCase() === 'SI') {
            if (isTestMode) handleSeasonEndForTesting();
            else handleSeasonEnd();
        } else if (confirmation !== null) {
            displayConfigMessage("Azione annullata dall'Admin.", 'info');
        }
    };


    document.addEventListener('championshipPanelLoaded', renderChampionshipPanel);
    
    window.handleSeasonEnd = handleSeasonEnd;
    window.handleSeasonEndForTesting = handleSeasonEndForTesting;
    
    // Funzione helper per l'automazione
    window.ChampionshipMain.updateLastAutoSimulatedDate = async (timestamp) => {
        const { doc, setDoc, appId } = window.firestoreTools;
        const configPath = `artifacts/${appId}/public/data/config/championship`;
        const configDocRef = doc(window.db, configPath);
        try {
            await setDoc(configDocRef, { lastAutoSimulatedDate: timestamp }, { merge: true });
        } catch(e) {
             console.error("Errore aggiornamento lastAutoSimulatedDate:", e);
        }
    };
    
    // Assicurati che i riferimenti alle funzioni esterne siano corretti (sono state caricate in index.html)
    window.ChampionshipMain.simulateCurrentRound = window.ChampionshipMain.simulateCurrentRound || (() => console.error('SimulateCurrentRound non disponibile.'));
    window.ChampionshipMain.simulateSingleMatch = window.ChampionshipMain.simulateSingleMatch || (() => console.error('SimulateSingleMatch non disponibile.'));
});