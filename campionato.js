//
// ====================================================================
// CAMPIONATO.JS - Versione Modularizzata (Usa i 5 moduli esterni)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    const championshipContent = document.getElementById('championship-content');
    const championshipToolsContainer = document.getElementById('championship-tools-container');
    const championshipBackButton = document.getElementById('championship-back-button');
    const adminContent = document.getElementById('admin-content');
    
    let db;
    let firestoreTools;
    let CHAMPIONSHIP_CONFIG_PATH;
    let TEAMS_COLLECTION_PATH;
    let SCHEDULE_COLLECTION_PATH; 
    let LEADERBOARD_COLLECTION_PATH; 
    let countdownInterval = null; // Variabile per tenere traccia del timer

    const CONFIG_DOC_ID = 'settings';
    const SCHEDULE_DOC_ID = 'full_schedule';
    const LEADERBOARD_DOC_ID = 'standings'; 
    const DEFAULT_LOGO_URL = "https://github.com/carciofiatomici-bot/immaginiserie/blob/main/placeholder.jpg?raw=true";
    
    // Costante Cron (48 ore)
    const AUTO_SIMULATION_COOLDOWN_MS = window.InterfacciaConstants?.AUTO_SIMULATION_COOLDOWN_MS || (48 * 60 * 60 * 1000); 

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
    // LOGICA CRONOMETRO E AUTOMAZIONE
    // ====================================================================

    /**
     * Avvia il cronometro per visualizzare il tempo rimanente alla simulazione automatica.
     */
    const startCountdown = (lastAutoSimulatedDate) => {
        const timerElement = document.getElementById('cron-countdown-message');
        if (!timerElement) return;

        // Pulisce il timer precedente se esiste
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        const updateTimer = () => {
            const currentTime = new Date().getTime();
            const nextSimTime = lastAutoSimulatedDate + AUTO_SIMULATION_COOLDOWN_MS;
            const remainingTime = nextSimTime - currentTime;

            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
                timerElement.classList.remove('text-yellow-300');
                timerElement.classList.add('text-red-400');
                timerElement.innerHTML = `COOLDOWN SCADUTO. Ricarica la pagina per avviare la simulazione automatica.`;
                
                // Ricarica il pannello dopo un breve ritardo per lanciare la simulazione
                setTimeout(renderChampionshipPanel, 1000); 
                return;
            }

            const totalSeconds = Math.floor(remainingTime / 1000);
            const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');

            timerElement.innerHTML = `PROSSIMA SIMULAZIONE AUTOMATICA TRA: 
                                      <span class="text-white bg-indigo-700 px-2 py-1 rounded-md ml-2">${hours}:${minutes}:${seconds}</span>`;
            timerElement.classList.remove('text-red-400');
            timerElement.classList.add('text-yellow-300');
        };

        // Aggiorna immediatamente e poi ogni secondo
        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    };

    /**
     * Controlla la data dell'ultima simulazione automatica e la esegue se il cooldown è scaduto.
     */
    const checkAndRunAutoSimulation = async (configData, schedule) => {
        if (!schedule || schedule.length === 0) {
            return { executed: false, date: 0, message: "Calendario non generato." };
        }
        
        const nextRound = schedule.find(round => 
            round.matches.some(match => match.result === null)
        );
        
        // Non simula se la stagione è finita o non c'è una prossima giornata
        if (configData.isSeasonOver || !nextRound) {
            // Se la stagione è finita, fermiamo il timer se è attivo
            if (countdownInterval) clearInterval(countdownInterval);
            return { executed: false, date: configData.lastAutoSimulatedDate, message: "Stagione terminata o nessuna giornata rimanente." };
        }
        
        const lastDate = configData.lastAutoSimulatedDate || 0; 
        const currentTime = new Date().getTime();
        const timeElapsed = currentTime - lastDate;
        
        if (timeElapsed >= AUTO_SIMULATION_COOLDOWN_MS) {
            
            const roundIndex = schedule.indexOf(nextRound);
            const roundNum = nextRound.round;
            
            displayConfigMessage(`COOLDOWN CRON SCADUTO. Simulazione automatica Giornata ${roundNum} in corso...`, 'info');
            
            // Fetch di tutte le squadre necessarie per la simulazione
            const { collection, getDocs } = firestoreTools;
            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const teamsSnapshot = await getDocs(teamsCollectionRef);
            const allTeams = teamsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                name: doc.data().teamName, 
                isParticipating: doc.data().isParticipating || false 
            }));

            try {
                // Esegue la simulazione
                await window.ChampionshipMain.simulateCurrentRound(
                    roundIndex, schedule, allTeams, null // Nessun pulsante da disabilitare
                );
                
                // Resetta il timer (timestamp corrente)
                const newTime = new Date().getTime();
                await window.ChampionshipMain.updateLastAutoSimulatedDate(newTime);
                
                return { executed: true, date: newTime, message: `Simulazione automatica Giornata ${roundNum} completata con successo.` };
            } catch (error) {
                console.error("Errore simulazione automatica:", error);
                // Non aggiornare il timestamp se fallisce, riprova al prossimo accesso
                return { executed: false, date: lastDate, message: `Errore durante la simulazione automatica: ${error.message}` };
            }
        }
        
        return { executed: false, date: lastDate, message: null };
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
        
        // Pulisce l'intervallo del timer alla fine della stagione
        if (countdownInterval) clearInterval(countdownInterval);

        try {
            const leaderboardDoc = await getDoc(leaderboardDocRef);
            if (!leaderboardDoc.exists() || !leaderboardDoc.data().standings || leaderboardDoc.data().standings.length === 0) {
                 throw new Error("Classifica non trovata o vuota. Impossibile assegnare i premi.");
            }
            const standings = leaderboardDoc.data().standings;
            
            const result = await window.ChampionshipRewards.applySeasonEndRewards(standings);
            const { totalTeams, levelUps } = result;
            
            await deleteDoc(scheduleDocRef);
            // Resetta lastAutoSimulatedDate a 0
            await setDoc(configDocRef, { isSeasonOver: true, isDraftOpen: false, isMarketOpen: false, lastAutoSimulatedDate: 0 }, { merge: true });
            
            displayConfigMessage(
                `Campionato TERMINATO! Assegnati premi a ${totalTeams} squadre. ${levelUps} allenatori sono saliti di livello (20% chance). Calendario eliminato.`, 
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
        
        if (countdownInterval) clearInterval(countdownInterval);

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
        
        displayConfigMessage("Generazione calendario in corso...", 'info');
        const button = document.getElementById('btn-generate-schedule');
        button.disabled = true;

        try {
            const schedule = window.ChampionshipSchedule.generateRoundRobinSchedule(teams);
            const result = await window.ChampionshipSchedule.saveScheduleAndInitialize(teams, schedule);
            
            // FIX: Imposta la data CORRENTE invece di 0 per evitare simulazione immediata
            // Il countdown partirà da ORA (48h da adesso)
            await window.ChampionshipMain.updateLastAutoSimulatedDate(Date.now()); 

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
        // Pulisce il timer quando si entra nel pannello di simulazione manuale
        if (countdownInterval) clearInterval(countdownInterval);

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
        
        // Pulisce l'intervallo precedente per evitare duplicazioni
        if (countdownInterval) clearInterval(countdownInterval);


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
            
            // --- LOGICA CRON AUTOMATICA QUI ---
            const autoSimResult = await checkAndRunAutoSimulation(configData, schedule);
            
            // Se la simulazione automatica è stata eseguita, dobbiamo ricaricare i dati di config e schedule
            if (autoSimResult.executed) {
                // Ricarica i dati dopo l'esecuzione della simulazione
                configDoc = await getDoc(configDocRef);
                configData = configDoc.exists() ? configDoc.data() : {};
                
                scheduleDoc = await getDoc(scheduleDocRef);
                schedule = scheduleDoc.exists() ? scheduleDoc.data().matches : [];
                
                // Mostra il messaggio di successo della simulazione
                displayConfigMessage(autoSimResult.message, 'success');
            }
            // --- FINE LOGICA CRON ---
            
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
            
            const lastAutoDate = configData.lastAutoSimulatedDate || 0;
            const lastAutoDateString = lastAutoDate === 0 ? 'MAI' : new Date(lastAutoDate).toLocaleString('it-IT');

            // Calcola statistiche stagione
            const seasonStats = calculateSeasonStats(schedule);

            // HTML per Cron e Timer status
            const cronStatusHtml = `
                <div id="cron-status-box" class="p-4 bg-gray-700 rounded-lg border border-teal-500 shadow-md">
                    <h4 class="text-xl font-bold text-teal-400 mb-2">Automazione Giornate (Cron)</h4>
                    <p class="text-sm text-gray-300">Ultima esecuzione automatica: <span id="last-auto-date">${lastAutoDateString}</span></p>
                    <p class="text-sm font-extrabold mt-2 text-yellow-300" id="cron-countdown-message">Caricamento stato timer...</p>
                </div>
            `;

            // HTML per sezione Reward
            const rewardsHtml = `
                <div class="p-4 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg border-2 border-yellow-500 shadow-md">
                    <h4 class="text-xl font-bold text-yellow-400 mb-3 flex items-center">
                        <span class="mr-2">💰</span> Tabella Premi
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Campionato -->
                        <div class="bg-black bg-opacity-30 rounded-lg p-3">
                            <h5 class="text-green-400 font-bold mb-2 border-b border-green-600 pb-1">🏆 Campionato</h5>
                            <ul class="text-sm space-y-1">
                                <li class="flex justify-between"><span class="text-gray-300">Vincitore:</span><span class="text-yellow-300 font-bold">1 CSS</span></li>
                                <li class="flex justify-between"><span class="text-gray-300">Vittoria partita:</span><span class="text-green-400">25 CS</span></li>
                                <li class="flex justify-between"><span class="text-gray-300">Goal segnato:</span><span class="text-green-400">1 CS</span></li>
                                <li class="flex justify-between"><span class="text-gray-300">Primi 3 posti:</span><span class="text-green-400">150 CS</span></li>
                                <li class="flex justify-between"><span class="text-gray-300">Ultimi 3 posti:</span><span class="text-green-400">200 CS</span></li>
                                <li class="flex justify-between"><span class="text-gray-300">Altre posizioni:</span><span class="text-green-400">100 CS</span></li>
                            </ul>
                        </div>
                        <!-- CoppaSeriA -->
                        <div class="bg-black bg-opacity-30 rounded-lg p-3">
                            <h5 class="text-purple-400 font-bold mb-2 border-b border-purple-600 pb-1">🏆 CoppaSeriA</h5>
                            <ul class="text-sm space-y-1">
                                <li class="flex justify-between"><span class="text-gray-300">Vincitore:</span><span class="text-yellow-300 font-bold">1 CSS</span></li>
                                <li class="flex justify-between"><span class="text-gray-300">Vittoria partita:</span><span class="text-green-400">25 CS</span></li>
                                <li class="flex justify-between"><span class="text-gray-300">Goal segnato:</span><span class="text-green-400">1 CS</span></li>
                                <li class="flex justify-between"><span class="text-gray-300">2°, 3°, 4° posto:</span><span class="text-green-400">100 CS</span></li>
                            </ul>
                        </div>
                        <!-- Supercoppa -->
                        <div class="bg-black bg-opacity-30 rounded-lg p-3">
                            <h5 class="text-orange-400 font-bold mb-2 border-b border-orange-600 pb-1">⭐ Supercoppa</h5>
                            <ul class="text-sm space-y-1">
                                <li class="flex justify-between"><span class="text-gray-300">Vincitore:</span><span class="text-yellow-300 font-bold">1 CSS</span></li>
                            </ul>
                            <p class="text-xs text-gray-400 mt-2">1° Campionato vs Vincitore Coppa</p>
                        </div>
                    </div>
                </div>
            `;

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

                        <!-- Toggle Draft/Mercato -->
                        <div class="grid grid-cols-2 gap-4 mt-4">
                            <button id="btn-toggle-draft"
                                    class="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold transition ${draftOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                                <span>${draftOpen ? '🔒 Chiudi Draft' : '🔓 Apri Draft'}</span>
                            </button>
                            <button id="btn-toggle-market"
                                    class="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold transition ${marketOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                                <span>${marketOpen ? '🔒 Chiudi Mercato' : '🔓 Apri Mercato'}</span>
                            </button>
                        </div>
                    </div>

                    <!-- SEZIONE: Automazione -->
                    ${cronStatusHtml}

                    <!-- SEZIONE: Statistiche Stagione -->
                    ${statsHtml}

                    <!-- SEZIONE: Tabella Premi -->
                    ${rewardsHtml}

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

                    <!-- SEZIONE: Fine Stagione -->
                    <div class="bg-gray-900 rounded-lg p-4 border border-red-700">
                        <h3 class="text-xl font-bold text-red-400 border-b border-gray-600 pb-2 mb-4 flex items-center">
                            <span class="mr-2">🏁</span> Azioni Fine Stagione
                        </h3>
                        <div class="space-y-3">
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

                    <!-- Anteprima Calendario -->
                    <div id="schedule-display-container" class="mt-4">
                        ${renderSchedulePreview(schedule, numTeamsParticipating)}
                    </div>

                    <p id="championship-message" class="text-center mt-3 text-red-400 font-bold"></p>
                </div>
            `;
            
            // Avvia il cronometro se necessario dopo aver renderizzato l'HTML
            if (totalRounds > 0 && !isFinished) {
                // Utilizziamo autoSimResult.date che è l'ultima data di simulazione (sia manuale che automatica)
                startCountdown(autoSimResult.date);
            } else {
                 const timerElement = document.getElementById('cron-countdown-message');
                 if (timerElement) {
                     timerElement.classList.remove('text-yellow-300');
                     timerElement.classList.add('text-gray-400');
                     timerElement.textContent = "FunzionalitÃ  cron non attiva (Stagione non iniziata o conclusa).";
                 }
            }


            const seasonEndContainer = championshipToolsContainer.querySelector('.space-y-3');
            if (seasonEndContainer) {
                seasonEndContainer.addEventListener('click', (e) => {
                    const target = e.target;
                    const action = target.dataset.action;
                    if (action === 'end-season' && !target.disabled) confirmSeasonEnd(false);
                    else if (action === 'test-reset' && !target.disabled) confirmSeasonEnd(true);
                });
            }

            const btnShowFullSchedule = document.getElementById('btn-show-full-schedule');
            if (btnShowFullSchedule) {
                btnShowFullSchedule.addEventListener('click', async () => {
                    const reloadedScheduleDoc = await getDoc(scheduleDocRef);
                    const reloadedSchedule = reloadedScheduleDoc.exists() ? reloadedScheduleDoc.data().matches : [];
                    renderFullScheduleSimulation(reloadedSchedule, allTeams);
                });
            }

            // Toggle Draft
            const btnToggleDraft = document.getElementById('btn-toggle-draft');
            if (btnToggleDraft) {
                btnToggleDraft.addEventListener('click', async () => {
                    try {
                        btnToggleDraft.disabled = true;
                        btnToggleDraft.innerHTML = '<span class="animate-pulse">Aggiornamento...</span>';

                        const { setDoc } = firestoreTools;
                        await setDoc(configDocRef, { isDraftOpen: !draftOpen }, { merge: true });

                        displayConfigMessage(`Draft ${!draftOpen ? 'aperto' : 'chiuso'} con successo!`, 'success');
                        renderChampionshipPanel(); // Ricarica il pannello
                    } catch (error) {
                        console.error('Errore toggle draft:', error);
                        displayConfigMessage('Errore nel toggle draft', 'error');
                        btnToggleDraft.disabled = false;
                    }
                });
            }

            // Toggle Mercato
            const btnToggleMarket = document.getElementById('btn-toggle-market');
            if (btnToggleMarket) {
                btnToggleMarket.addEventListener('click', async () => {
                    try {
                        btnToggleMarket.disabled = true;
                        btnToggleMarket.innerHTML = '<span class="animate-pulse">Aggiornamento...</span>';

                        const { setDoc } = firestoreTools;
                        await setDoc(configDocRef, { isMarketOpen: !marketOpen }, { merge: true });

                        displayConfigMessage(`Mercato ${!marketOpen ? 'aperto' : 'chiuso'} con successo!`, 'success');
                        renderChampionshipPanel(); // Ricarica il pannello
                    } catch (error) {
                        console.error('Errore toggle mercato:', error);
                        displayConfigMessage('Errore nel toggle mercato', 'error');
                        btnToggleMarket.disabled = false;
                    }
                });
            }

            if (canGenerate) {
                 document.getElementById('btn-generate-schedule').addEventListener('click', () => generateSchedule(participatingTeams));
            }
            
        } catch (error) {
            console.error("Errore nel caricamento configurazione:", error);
            championshipToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: Impossibile caricare la configurazione.</p>`;
        }
    };

    const confirmSeasonEnd = (isTestMode) => {
        const message = isTestMode
            ? "ATTENZIONE: Stai per terminare il campionato SENZA assegnare crediti o livellare gli allenatori. Il calendario verrÃ  eliminato. Continuare?"
            : "AZIONE CRITICA: Stai per terminare la stagione UFFICIALE. Premi, crediti e progressione allenatori verranno assegnati. Il calendario verrÃ  eliminato. Continuare?";
        
        const title = isTestMode ? "Conferma Reset Campionato (TEST)" : "Conferma Chiusura Stagione Ufficiale";
        const confirmation = prompt(`${title}\n\n${message}\n\nDigita 'SI' per confermare:`);
        
        if (confirmation && confirmation.toUpperCase() === 'SI') {
            if (isTestMode) handleSeasonEndForTesting();
            else handleSeasonEnd();
        } else if (confirmation !== null) {
            displayConfigMessage("Azione annullata dall'Admin.", 'info');
        }
    };

    championshipBackButton.addEventListener('click', () => {
        // Pulisce il timer quando si esce dal pannello
        if (countdownInterval) clearInterval(countdownInterval);
        if (window.showScreen && adminContent) window.showScreen(adminContent);
    });

    document.addEventListener('championshipPanelLoaded', renderChampionshipPanel);
    
    window.handleSeasonEnd = handleSeasonEnd;
    window.handleSeasonEndForTesting = handleSeasonEndForTesting;
    
    // Funzione helper per l'automazione
    window.ChampionshipMain.updateLastAutoSimulatedDate = async (timestamp) => {
        const { doc, setDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
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