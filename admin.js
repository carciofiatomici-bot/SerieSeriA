
//
// ====================================================================
// ADMIN.JS - Versione Modularizzata (Usa i moduli esterni)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    const adminContent = document.getElementById('admin-content');
    const adminDashboardContainer = document.getElementById('admin-dashboard-container');
    const adminLogoutButton = document.getElementById('admin-logout-button');
    const championshipContent = document.getElementById('championship-content');
    const playerManagementContent = document.getElementById('player-management-content'); 
    const playerManagementToolsContainer = document.getElementById('player-management-tools-container'); 
    const teamManagementContent = document.getElementById('team-management-content'); 
    const teamManagementToolsContainer = document.getElementById('team-management-tools-container'); 
    
    const leaderboardContent = document.getElementById('leaderboard-content');
    const scheduleContent = document.getElementById('schedule-content');

    let db;
    let firestoreTools;
    let TEAMS_COLLECTION_PATH;
    let DRAFT_PLAYERS_COLLECTION_PATH; 
    let MARKET_PLAYERS_COLLECTION_PATH; 
    let CHAMPIONSHIP_CONFIG_PATH; 
    
    const CONFIG_DOC_ID = 'settings';

    const displayMessage = (message, type, elementId) => {
        const msgElement = document.getElementById(elementId);
        if (!msgElement) return;
        msgElement.textContent = message;
        msgElement.classList.remove('text-red-400', 'text-green-500', 'text-yellow-400');
        if (type === 'error') msgElement.classList.add('text-red-400');
        else if (type === 'success') msgElement.classList.add('text-green-500');
        else if (type === 'info') msgElement.classList.add('text-yellow-400');
    };

    /**
     * Inizializza il pannello admin
     */
    const initializeAdminPanel = () => {
        // Usa le variabili globali caricate da interfaccia.js/index.html
        if (typeof window.db === 'undefined' || typeof window.firestoreTools === 'undefined') {
            console.error("Servizi Firebase non disponibili per il pannello Admin.");
            return;
        }
        
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;
        
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        DRAFT_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/draftPlayers`;
        MARKET_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/marketPlayers`;
        CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;

        console.log(`Pannello Admin inizializzato.`);
        
        if (document.getElementById('player-management-back-button')) {
            document.getElementById('player-management-back-button').addEventListener('click', () => {
                 window.showScreen(adminContent);
            });
        }
        if (document.getElementById('team-management-back-button')) {
             document.getElementById('team-management-back-button').addEventListener('click', () => {
                 window.showScreen(adminContent);
            });
        }

        renderAdminDashboardLayout();
        adminLogoutButton.addEventListener('click', handleAdminLogout);
    };

    /**
     * Renderizza la dashboard principale
     */
    const renderAdminDashboardLayout = async () => {
        const { doc, getDoc, collection, getDocs } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        const configData = configDoc.exists() ? configDoc.data() : {};
        
        const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
        const allTeams = teamsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));

        await window.AdminUI.renderAdminDashboard(adminDashboardContainer, configData, allTeams);
        setupAdminDashboardEvents();
    };
    
    /**
     * Cabla gli eventi della dashboard
     */
    const setupAdminDashboardEvents = () => {
        const btnChampionshipSettings = document.getElementById('btn-championship-settings');
        if (btnChampionshipSettings) btnChampionshipSettings.addEventListener('click', () => {
             if (window.showScreen) {
                 window.showScreen(championshipContent);
                 document.dispatchEvent(new CustomEvent('championshipPanelLoaded'));
             }
        });
        
        const btnPlayerManagement = document.getElementById('btn-player-management');
        if (btnPlayerManagement) btnPlayerManagement.addEventListener('click', renderPlayerManagementPanel); 

        const btnTeamManagement = document.getElementById('btn-team-management');
        if (btnTeamManagement) btnTeamManagement.addEventListener('click', renderTeamManagementPanel);
        
        const btnAdminLeaderboard = document.getElementById('btn-admin-leaderboard');
        if (btnAdminLeaderboard) {
            btnAdminLeaderboard.addEventListener('click', () => {
                 window.showScreen(leaderboardContent);
                 if (window.loadLeaderboard) window.InterfacciaDashboard && window.InterfacciaDashboard.loadLeaderboard && window.InterfacciaDashboard.loadLeaderboard();
                 document.getElementById('leaderboard-back-button').onclick = () => window.showScreen(adminContent);
            });
        }
        
        const btnAdminSchedule = document.getElementById('btn-admin-schedule');
        if (btnAdminSchedule) {
            btnAdminSchedule.addEventListener('click', () => {
                 window.showScreen(scheduleContent);
                 if (window.loadSchedule) window.loadSchedule();
                 document.getElementById('schedule-back-button').onclick = () => window.showScreen(adminContent);
            });
        }
        
        const btnSyncData = document.getElementById('btn-sync-data');
        if (btnSyncData) btnSyncData.addEventListener('click', () => {
             displayMessage("Sincronizzazione dati in corso... (Mock)", 'info', 'toggle-status-message');
             setTimeout(() => displayMessage("Dati sincronizzati.", 'success', 'toggle-status-message'), 1500);
        });

        // Test Simulazione Partita
        setupTestSimulationListeners();

        // Fix Abilita Icone
        const btnFixIcone = document.getElementById('btn-fix-icone-ability');
        if (btnFixIcone) {
            btnFixIcone.addEventListener('click', handleFixIconeAbility);
        }

        // Toggle Crediti Super Seri
        const btnToggleCSS = document.getElementById('btn-toggle-css');
        if (btnToggleCSS) {
            btnToggleCSS.addEventListener('click', handleToggleCSS);
        }

        // Bottoni CoppaSeriA
        const btnGenerateCupSchedule = document.getElementById('btn-generate-cup-schedule');
        if (btnGenerateCupSchedule) {
            btnGenerateCupSchedule.addEventListener('click', handleGenerateCupSchedule);
        }

        const btnViewCupBracket = document.getElementById('btn-view-cup-bracket');
        if (btnViewCupBracket) {
            btnViewCupBracket.addEventListener('click', handleViewCupBracket);
        }

        // Bottone genera calendario SerieSeriA
        const btnGenerateChampionshipSchedule = document.getElementById('btn-generate-championship-schedule');
        if (btnGenerateChampionshipSchedule) {
            btnGenerateChampionshipSchedule.addEventListener('click', () => {
                // Apri il pannello impostazioni campionato per generare il calendario
                if (window.showScreen) {
                    window.showScreen(championshipContent);
                    document.dispatchEvent(new CustomEvent('championshipPanelLoaded'));
                }
            });
        }

        // Carica stato campionato, coppa, supercoppa e automazione
        loadSerieSeriaStatus();
        loadCupStatus();
        loadSupercoppPanel();
        loadAutomationPanel();
    };

    /**
     * Fix abilita "Icona" per tutte le Icone in tutte le squadre
     */
    const handleFixIconeAbility = async () => {
        const resultDiv = document.getElementById('fix-icone-result');
        const btn = document.getElementById('btn-fix-icone-ability');

        if (!resultDiv || !btn) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Fixing...';
        resultDiv.textContent = 'Analisi squadre in corso...';
        resultDiv.className = 'flex items-center justify-center text-sm text-yellow-400';

        try {
            const { collection, getDocs, doc, updateDoc } = firestoreTools;

            // Carica tutte le squadre
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
            const teams = teamsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Carica la lista delle Icone disponibili
            const icone = window.ICONE || [];
            const iconeIds = new Set(icone.map(i => i.id));

            let teamsFixed = 0;
            let playersFixed = 0;

            for (const team of teams) {
                if (!team.players || !Array.isArray(team.players)) continue;

                let needsUpdate = false;
                const updatedPlayers = team.players.map(player => {
                    // Verifica se il giocatore e' un'Icona (per ID o iconaId della squadra)
                    // NOTA: isCaptain e' il "capitano nominato" (bonus +1), NON l'Icona
                    const isIcona = iconeIds.has(player.id) || player.id === team.iconaId;

                    if (isIcona) {
                        const abilities = Array.isArray(player.abilities) ? [...player.abilities] : [];

                        // Aggiungi "Icona" se non presente
                        if (!abilities.includes('Icona')) {
                            abilities.push('Icona');
                            needsUpdate = true;
                            playersFixed++;
                            console.log(`Fix: ${player.name} in ${team.teamName} - aggiunta abilita Icona`);
                        }

                        return { ...player, abilities };
                    }

                    return player;
                });

                if (needsUpdate) {
                    // Aggiorna anche la formazione
                    let updatedFormation = team.formation;
                    if (updatedFormation) {
                        const playersMap = new Map(updatedPlayers.map(p => [p.id, p]));

                        if (updatedFormation.titolari) {
                            updatedFormation.titolari = updatedFormation.titolari.map(t => {
                                const updated = playersMap.get(t.id);
                                return updated ? { ...t, abilities: updated.abilities } : t;
                            });
                        }
                        if (updatedFormation.panchina) {
                            updatedFormation.panchina = updatedFormation.panchina.map(p => {
                                const updated = playersMap.get(p.id);
                                return updated ? { ...p, abilities: updated.abilities } : p;
                            });
                        }
                    }

                    // Salva su Firestore
                    const teamRef = doc(db, TEAMS_COLLECTION_PATH, team.id);
                    await updateDoc(teamRef, {
                        players: updatedPlayers,
                        formation: updatedFormation
                    });

                    teamsFixed++;
                }
            }

            if (playersFixed > 0) {
                resultDiv.textContent = `Fixate ${playersFixed} Icone in ${teamsFixed} squadre!`;
                resultDiv.className = 'flex items-center justify-center text-sm text-green-400 font-bold';
            } else {
                resultDiv.textContent = 'Tutte le Icone hanno gia l\'abilita "Icona"';
                resultDiv.className = 'flex items-center justify-center text-sm text-green-400';
            }

            console.log(`Fix completato: ${playersFixed} icone fixate in ${teamsFixed} squadre`);

        } catch (error) {
            console.error('Errore fix icone:', error);
            resultDiv.textContent = `Errore: ${error.message}`;
            resultDiv.className = 'flex items-center justify-center text-sm text-red-400';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '👑 Fix Abilita Icone';
        }
    };

    /**
     * Setup listeners per il test di simulazione partita
     */
    const setupTestSimulationListeners = () => {
        const btnTestSimulation = document.getElementById('btn-test-simulation');
        const modal = document.getElementById('test-simulation-modal');
        const btnClose = document.getElementById('btn-close-test-simulation');
        const btnRun = document.getElementById('btn-run-test-simulation');
        const homeSelect = document.getElementById('test-home-team');
        const awaySelect = document.getElementById('test-away-team');
        const resultContainer = document.getElementById('test-simulation-result');
        const scoreDiv = document.getElementById('test-simulation-score');
        const detailsDiv = document.getElementById('test-simulation-details');

        if (!btnTestSimulation || !modal) return;

        // Apri modal e carica squadre
        btnTestSimulation.addEventListener('click', async () => {
            modal.classList.remove('hidden');
            resultContainer.classList.add('hidden');

            // Carica le squadre registrate
            try {
                const { collection, getDocs } = firestoreTools;
                const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
                const teams = teamsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).filter(t => t.teamName); // Solo squadre con nome

                // Popola i dropdown
                const defaultOption = '<option value="">Seleziona squadra...</option>';
                const teamOptions = teams.map(t =>
                    `<option value="${t.id}">${t.teamName}</option>`
                ).join('');

                homeSelect.innerHTML = defaultOption + teamOptions;
                awaySelect.innerHTML = defaultOption + teamOptions;

            } catch (error) {
                console.error('Errore caricamento squadre per test:', error);
                displayMessage('Errore nel caricamento delle squadre', 'error', 'toggle-status-message');
            }
        });

        // Chiudi modal
        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Click fuori dal modal per chiuderlo
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // Esegui simulazione
        btnRun.addEventListener('click', async () => {
            const homeTeamId = homeSelect.value;
            const awayTeamId = awaySelect.value;

            if (!homeTeamId || !awayTeamId) {
                displayMessage('Seleziona entrambe le squadre', 'error', 'toggle-status-message');
                return;
            }

            if (homeTeamId === awayTeamId) {
                displayMessage('Seleziona due squadre diverse', 'error', 'toggle-status-message');
                return;
            }

            btnRun.disabled = true;
            btnRun.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Simulazione...';

            try {
                // Carica i dati completi delle squadre
                const { doc, getDoc } = firestoreTools;
                const [homeDocSnap, awayDocSnap] = await Promise.all([
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, homeTeamId)),
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, awayTeamId))
                ]);

                if (!homeDocSnap.exists() || !awayDocSnap.exists()) {
                    throw new Error('Una delle squadre non esiste');
                }

                const homeTeamData = { id: homeDocSnap.id, ...homeDocSnap.data() };
                const awayTeamData = { id: awayDocSnap.id, ...awayDocSnap.data() };

                // Verifica che le squadre abbiano formazioni
                if (!homeTeamData.formation?.titolari?.length) {
                    throw new Error(`${homeTeamData.teamName} non ha una formazione impostata`);
                }
                if (!awayTeamData.formation?.titolari?.length) {
                    throw new Error(`${awayTeamData.teamName} non ha una formazione impostata`);
                }

                // Esegui la simulazione usando ChampionshipSimulation con log
                const result = window.ChampionshipSimulation.runSimulationWithLog(homeTeamData, awayTeamData);

                // Mostra risultato
                resultContainer.classList.remove('hidden');
                scoreDiv.textContent = `${homeTeamData.teamName} ${result.homeGoals} - ${result.awayGoals} ${awayTeamData.teamName}`;

                // Popola i log
                const simpleLogContent = document.getElementById('test-simulation-simple-log-content');
                const simpleLogContainer = document.getElementById('test-simulation-simple-log');
                const detailedLogContent = document.getElementById('test-simulation-detailed-log-content');
                const detailedLogContainer = document.getElementById('test-simulation-detailed-log');
                const btnSimpleLog = document.getElementById('btn-toggle-simple-log');
                const btnDetailedLog = document.getElementById('btn-toggle-detailed-log');

                if (simpleLogContent && result.simpleLog) {
                    simpleLogContent.textContent = result.simpleLog.join('\n');
                }
                if (detailedLogContent && result.log) {
                    detailedLogContent.textContent = result.log.join('\n');
                }

                // Reset stato log
                if (simpleLogContainer) simpleLogContainer.classList.add('hidden');
                if (detailedLogContainer) detailedLogContainer.classList.add('hidden');

                // Handler bottone log ristretto
                if (btnSimpleLog) {
                    btnSimpleLog.onclick = () => {
                        const isHidden = simpleLogContainer.classList.contains('hidden');
                        // Chiudi l'altro log se aperto
                        if (isHidden && detailedLogContainer) {
                            detailedLogContainer.classList.add('hidden');
                        }
                        simpleLogContainer.classList.toggle('hidden');
                    };
                }

                // Handler bottone log dettagliato
                if (btnDetailedLog) {
                    btnDetailedLog.onclick = () => {
                        const isHidden = detailedLogContainer.classList.contains('hidden');
                        // Chiudi l'altro log se aperto
                        if (isHidden && simpleLogContainer) {
                            simpleLogContainer.classList.add('hidden');
                        }
                        detailedLogContainer.classList.toggle('hidden');
                    };
                }

                // Calcola statistiche formazione
                const getFormationStats = (teamData) => {
                    const titolari = teamData.formation?.titolari || [];
                    const playersFormStatus = teamData.playersFormStatus || {};

                    let totalLevel = 0;
                    const playerDetails = titolari.map(p => {
                        const form = playersFormStatus[p.id];
                        const currentLevel = form?.level || p.level || 1;
                        totalLevel += currentLevel;
                        return {
                            name: p.name,
                            role: p.role,
                            baseLevel: p.level || 1,
                            currentLevel: currentLevel,
                            formMod: form?.mod || 0
                        };
                    });

                    // Ordina per ruolo (P, D, C, A) e poi per livello decrescente
                    const roleOrder = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
                    playerDetails.sort((a, b) => {
                        const roleA = roleOrder[a.role] ?? 4;
                        const roleB = roleOrder[b.role] ?? 4;
                        if (roleA !== roleB) return roleA - roleB;
                        return b.currentLevel - a.currentLevel;
                    });

                    return {
                        avgLevel: titolari.length > 0 ? (totalLevel / titolari.length).toFixed(1) : '?',
                        players: playerDetails
                    };
                };

                const homeStats = getFormationStats(homeTeamData);
                const awayStats = getFormationStats(awayTeamData);

                // Determina vincitore
                let winnerText = '';
                if (result.homeGoals > result.awayGoals) {
                    winnerText = `<span class="text-green-400 font-bold">Vince ${homeTeamData.teamName}!</span>`;
                } else if (result.awayGoals > result.homeGoals) {
                    winnerText = `<span class="text-green-400 font-bold">Vince ${awayTeamData.teamName}!</span>`;
                } else {
                    winnerText = '<span class="text-yellow-400 font-bold">Pareggio!</span>';
                }

                detailsDiv.innerHTML = `
                    <div class="text-center mb-4">${winnerText}</div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-700 p-3 rounded">
                            <p class="font-bold text-blue-400 mb-2">${homeTeamData.teamName}</p>
                            <p class="text-xs">Livello medio: <span class="text-yellow-400 font-bold">${homeStats.avgLevel}</span></p>
                            <p class="text-xs text-gray-400 mt-1">Titolari:</p>
                            <ul class="text-xs mt-1 space-y-1">
                                ${homeStats.players.map(p => `
                                    <li class="flex justify-between">
                                        <span>${p.role} - ${p.name}</span>
                                        <span class="${p.formMod > 0 ? 'text-green-400' : p.formMod < 0 ? 'text-red-400' : 'text-gray-400'}">
                                            Lv.${p.currentLevel} ${p.formMod !== 0 ? `(${p.formMod > 0 ? '+' : ''}${p.formMod})` : ''}
                                        </span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="bg-gray-700 p-3 rounded">
                            <p class="font-bold text-red-400 mb-2">${awayTeamData.teamName}</p>
                            <p class="text-xs">Livello medio: <span class="text-yellow-400 font-bold">${awayStats.avgLevel}</span></p>
                            <p class="text-xs text-gray-400 mt-1">Titolari:</p>
                            <ul class="text-xs mt-1 space-y-1">
                                ${awayStats.players.map(p => `
                                    <li class="flex justify-between">
                                        <span>${p.role} - ${p.name}</span>
                                        <span class="${p.formMod > 0 ? 'text-green-400' : p.formMod < 0 ? 'text-red-400' : 'text-gray-400'}">
                                            Lv.${p.currentLevel} ${p.formMod !== 0 ? `(${p.formMod > 0 ? '+' : ''}${p.formMod})` : ''}
                                        </span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 text-center mt-3">Simulazione basata su 30 occasioni per squadra</p>
                `;

                console.log('Test simulazione completato:', {
                    home: homeTeamData.teamName,
                    away: awayTeamData.teamName,
                    result: result
                });

            } catch (error) {
                console.error('Errore nella simulazione test:', error);
                displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
                resultContainer.classList.add('hidden');
            } finally {
                btnRun.disabled = false;
                btnRun.innerHTML = 'Simula Partita';
            }
        });
    };

    /**
     * Carica lo stato del campionato SerieSeriA
     */
    const loadSerieSeriaStatus = async () => {
        const container = document.getElementById('serieseria-status-container');
        if (!container) return;

        try {
            const { doc, getDoc, collection, getDocs } = firestoreTools;
            const appId = firestoreTools.appId;
            const SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
            const SCHEDULE_DOC_ID = 'full_schedule';

            // Carica il calendario
            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            const scheduleDoc = await getDoc(scheduleDocRef);

            // Carica config per stato stagione
            const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);
            const isSeasonOver = configDoc.exists() ? (configDoc.data().isSeasonOver || false) : false;

            // Conta squadre partecipanti
            const teamsSnapshot = await getDocs(collection(db, TEAMS_COLLECTION_PATH));
            const participatingTeams = teamsSnapshot.docs.filter(doc => doc.data().isParticipating).length;

            if (!scheduleDoc.exists() || !scheduleDoc.data().matches || scheduleDoc.data().matches.length === 0) {
                container.innerHTML = `
                    <div class="text-center">
                        <p class="text-gray-400">Nessun calendario generato.</p>
                        <p class="text-green-400 font-bold mt-2">Squadre iscritte: ${participatingTeams}</p>
                        ${participatingTeams < 2 ? '<p class="text-red-400 text-xs">Servono almeno 2 squadre iscritte.</p>' : ''}
                        ${isSeasonOver ? '<p class="text-yellow-400 text-xs mt-1">Stagione terminata. Pronto per nuova generazione.</p>' : ''}
                    </div>
                `;
            } else {
                const schedule = scheduleDoc.data().matches;
                const totalRounds = schedule.length;

                // Calcola partite giocate
                let playedMatches = 0;
                let totalMatches = 0;
                schedule.forEach(round => {
                    round.matches.forEach(match => {
                        totalMatches++;
                        if (match.result) playedMatches++;
                    });
                });

                const nextRound = schedule.find(round =>
                    round.matches.some(match => match.result === null)
                );
                const isFinished = !nextRound && totalRounds > 0;

                const statusText = isSeasonOver ? 'TERMINATO' : (isFinished ? 'COMPLETATO' : 'IN CORSO');
                const statusColor = isSeasonOver ? 'text-red-400' : (isFinished ? 'text-yellow-400' : 'text-green-400');

                container.innerHTML = `
                    <div class="text-center">
                        <p class="text-gray-400">Stato: <span class="font-bold ${statusColor}">${statusText}</span></p>
                        <p class="text-green-400">Giornate: ${totalRounds} | Partite: ${playedMatches}/${totalMatches}</p>
                        ${nextRound ? `<p class="text-gray-300 mt-2">Prossima giornata: ${nextRound.round}</p>` : ''}
                        ${isFinished && !isSeasonOver ? '<p class="text-yellow-400 text-xs mt-1">Tutte le partite completate. Termina la stagione.</p>' : ''}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Errore caricamento stato SerieSeriA:', error);
            container.innerHTML = `<p class="text-red-400 text-center">Errore caricamento stato campionato.</p>`;
        }
    };

    /**
     * Gestisce la generazione del calendario coppa
     */
    const handleGenerateCupSchedule = async () => {
        const btn = document.getElementById('btn-generate-cup-schedule');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generazione...';

        try {
            const bracket = await window.CoppaMain.generateCupSchedule();
            displayMessage(`Calendario CoppaSeriA generato con ${bracket.totalTeams} squadre!`, 'success', 'toggle-status-message');
            loadCupStatus();
        } catch (error) {
            console.error('Errore generazione calendario coppa:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trophy mr-2"></i> Genera Calendario Coppa';
        }
    };

    /**
     * Mostra il pannello di simulazione completo della coppa
     */
    const handleViewCupBracket = async () => {
        const bracket = await window.CoppaSchedule.loadCupSchedule();
        const container = document.getElementById('coppa-status-container');

        if (!bracket) {
            container.innerHTML = '<p class="text-yellow-400 text-center">Nessun tabellone generato.</p>';
            return;
        }

        // Usa il nuovo pannello di simulazione completo
        await window.CoppaUI.renderSimulationPanel(bracket, container);
    };

    /**
     * Carica lo stato della coppa
     */
    const loadCupStatus = async () => {
        const container = document.getElementById('coppa-status-container');
        if (!container) return;

        try {
            const bracket = await window.CoppaSchedule.loadCupSchedule();

            if (!bracket) {
                // Conta le squadre iscritte alla coppa
                const participants = await window.CoppaSchedule.getCupParticipants();
                container.innerHTML = `
                    <div class="text-center">
                        <p class="text-gray-400">Nessun tabellone generato.</p>
                        <p class="text-purple-400 font-bold mt-2">Squadre iscritte: ${participants.length}</p>
                        ${participants.length < 2 ? '<p class="text-red-400 text-xs">Servono almeno 2 squadre iscritte.</p>' : ''}
                    </div>
                `;
            } else {
                const statusText = bracket.status === 'completed' ? 'COMPLETATA' : 'IN CORSO';
                const statusColor = bracket.status === 'completed' ? 'text-green-400' : 'text-yellow-400';
                const nextMatch = window.CoppaSchedule.findNextMatch(bracket);

                container.innerHTML = `
                    <div class="text-center">
                        <p class="text-gray-400">Stato: <span class="font-bold ${statusColor}">${statusText}</span></p>
                        <p class="text-purple-400">Squadre: ${bracket.totalTeams} | Bye: ${bracket.numByes}</p>
                        ${bracket.winner ? `<p class="text-yellow-400 font-bold mt-2">Vincitore: ${bracket.winner.teamName}</p>` : ''}
                        ${nextMatch ? `<p class="text-gray-300 mt-2">Prossima: ${nextMatch.match.homeTeam?.teamName || 'TBD'} vs ${nextMatch.match.awayTeam?.teamName || 'TBD'}</p>` : ''}
                    </div>
                `;
            }
        } catch (error) {
            container.innerHTML = `<p class="text-red-400 text-center">Errore caricamento stato coppa.</p>`;
        }
    };

    /**
     * Carica il pannello Supercoppa
     */
    const loadSupercoppPanel = () => {
        const container = document.getElementById('supercoppa-admin-section');
        if (container && window.Supercoppa) {
            window.Supercoppa.renderAdminUI(container);
        }
    };

    /**
     * Carica il pannello Automazione Simulazioni
     */
    const loadAutomationPanel = async () => {
        const container = document.getElementById('automation-status-container');
        if (!container || !window.AutomazioneSimulazioni) {
            if (container) {
                container.innerHTML = '<p class="text-red-400 text-center text-sm">Modulo automazione non disponibile</p>';
            }
            return;
        }

        try {
            const info = await window.AutomazioneSimulazioni.getAutomationInfo();

            const statusColor = info.isEnabled ? 'text-green-400' : 'text-red-400';
            const statusText = info.isEnabled ? 'ATTIVA' : 'DISATTIVA';
            const buttonColor = info.isEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
            const buttonText = info.isEnabled ? 'DISATTIVA' : 'ATTIVA';

            const nextTypeLabels = {
                'coppa_andata': 'Coppa (Andata)',
                'coppa_ritorno': 'Coppa (Ritorno)',
                'campionato': 'Campionato'
            };
            const nextTypeLabel = nextTypeLabels[info.nextSimulationType] || info.nextSimulationType;

            // Verifica se ci sono partite da giocare
            const canEnable = info.hasMatchesToPlay;

            let statusHtml = `
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-bold text-lg text-white">Stato: </span>
                            <span class="font-extrabold ${statusColor}">${statusText}</span>
                        </div>
                        <button id="btn-toggle-automation"
                                class="px-6 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${buttonColor} text-white ${!canEnable && !info.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${!canEnable && !info.isEnabled ? 'disabled' : ''}>
                            ${buttonText}
                        </button>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-gray-900 p-3 rounded-lg">
                            <p class="text-xs text-gray-400">Prossima simulazione</p>
                            <p class="text-lg font-bold text-teal-400">${info.isEnabled ? info.timeUntilNextSimulation.formatted : '--:--:--'}</p>
                        </div>
                        <div class="bg-gray-900 p-3 rounded-lg">
                            <p class="text-xs text-gray-400">Prossimo turno</p>
                            <p class="text-lg font-bold text-white">${nextTypeLabel}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-gray-900 p-3 rounded-lg flex items-center">
                            <span class="text-2xl mr-2">${info.hasChampionshipMatches ? '🏆' : '✅'}</span>
                            <div>
                                <p class="text-xs text-gray-400">SerieSeriA</p>
                                <p class="text-sm font-bold ${info.hasChampionshipMatches ? 'text-green-400' : 'text-gray-500'}">${info.hasChampionshipMatches ? 'Partite disponibili' : 'Completato'}</p>
                            </div>
                        </div>
                        <div class="bg-gray-900 p-3 rounded-lg flex items-center">
                            <span class="text-2xl mr-2">${info.hasCupMatches ? '🏆' : '✅'}</span>
                            <div>
                                <p class="text-xs text-gray-400">CoppaSeriA</p>
                                <p class="text-sm font-bold ${info.hasCupMatches ? 'text-purple-400' : 'text-gray-500'}">${info.hasCupMatches ? 'Partite disponibili' : 'Completata'}</p>
                            </div>
                        </div>
                    </div>

                    ${info.simulatedToday ? '<p class="text-center text-sm text-yellow-400">Simulazione di oggi gia effettuata</p>' : ''}

                    ${info.lastSimulationDate ? `<p class="text-xs text-gray-500 text-center">Ultima simulazione: ${new Date(info.lastSimulationDate).toLocaleString('it-IT')}</p>` : ''}

                    ${!canEnable ? '<p class="text-center text-sm text-orange-400">Genera i calendari di Campionato e/o Coppa per abilitare l\'automazione</p>' : ''}
                </div>
            `;

            container.innerHTML = statusHtml;

            // Aggiungi listener al pulsante
            const btnToggle = document.getElementById('btn-toggle-automation');
            if (btnToggle) {
                btnToggle.addEventListener('click', async () => {
                    btnToggle.disabled = true;
                    btnToggle.textContent = 'Aggiornamento...';

                    try {
                        if (info.isEnabled) {
                            await window.AutomazioneSimulazioni.disableAutomation();
                        } else {
                            await window.AutomazioneSimulazioni.enableAutomation();
                        }
                        // Ricarica il pannello
                        loadAutomationPanel();
                    } catch (error) {
                        console.error('Errore toggle automazione:', error);
                        btnToggle.textContent = 'ERRORE';
                        setTimeout(() => loadAutomationPanel(), 2000);
                    }
                });
            }

            // Aggiorna il countdown ogni secondo se l'automazione e' attiva
            if (info.isEnabled) {
                startAutomationCountdown();
            }

        } catch (error) {
            console.error('Errore caricamento pannello automazione:', error);
            container.innerHTML = '<p class="text-red-400 text-center text-sm">Errore nel caricamento</p>';
        }
    };

    let automationCountdownInterval = null;

    const startAutomationCountdown = () => {
        if (automationCountdownInterval) {
            clearInterval(automationCountdownInterval);
        }

        automationCountdownInterval = setInterval(() => {
            if (window.AutomazioneSimulazioni) {
                const time = window.AutomazioneSimulazioni.getTimeUntilNextSimulation();
                const countdownEl = document.querySelector('#automation-status-container .text-teal-400');
                if (countdownEl) {
                    countdownEl.textContent = time.formatted;
                }
            }
        }, 1000);
    };

    /**
     * Gestisce il toggle del sistema Crediti Super Seri
     */
    const handleToggleCSS = async (event) => {
        const target = event.target;
        const currentlyEnabled = target.dataset.enabled === 'true';
        const newState = !currentlyEnabled;

        target.textContent = 'Aggiornamento...';
        target.disabled = true;

        try {
            if (window.CreditiSuperSeri) {
                const success = await window.CreditiSuperSeri.setEnabled(newState);

                if (success) {
                    // Aggiorna UI
                    target.dataset.enabled = newState;
                    target.textContent = newState ? 'DISABILITA' : 'ABILITA';

                    const statusText = document.getElementById('css-status-text');
                    const section = document.getElementById('css-admin-section');

                    if (statusText) {
                        statusText.textContent = newState ? 'ATTIVO' : 'DISATTIVO';
                        statusText.classList.remove('text-green-400', 'text-red-400');
                        statusText.classList.add(newState ? 'text-green-400' : 'text-red-400');
                    }

                    if (section) {
                        section.classList.remove('border-green-500', 'border-amber-500');
                        section.classList.add(newState ? 'border-green-500' : 'border-amber-500');
                    }

                    target.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-red-600', 'hover:bg-red-700');
                    target.classList.add(newState ? 'bg-red-600' : 'bg-green-600');
                    target.classList.add(newState ? 'hover:bg-red-700' : 'hover:bg-green-700');

                    displayMessage(`Sistema Crediti Super Seri ${newState ? 'ATTIVATO' : 'DISATTIVATO'}`, 'success', 'toggle-status-message');
                } else {
                    displayMessage('Errore durante il toggle CSS', 'error', 'toggle-status-message');
                    target.textContent = currentlyEnabled ? 'DISABILITA' : 'ABILITA';
                }
            } else {
                displayMessage('Modulo CreditiSuperSeri non caricato', 'error', 'toggle-status-message');
                target.textContent = currentlyEnabled ? 'DISABILITA' : 'ABILITA';
            }
        } catch (error) {
            console.error('Errore toggle CSS:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
            target.textContent = currentlyEnabled ? 'DISABILITA' : 'ABILITA';
        } finally {
            target.disabled = false;
        }
    };

    /**
     * Renderizza pannello gestione giocatori
     */
    const renderPlayerManagementPanel = async () => {
        window.showScreen(playerManagementContent);
        
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        let draftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;
        let marketOpen = configDoc.exists() ? (configDoc.data().isMarketOpen || false) : false;
        
        window.AdminUI.renderPlayerManagementPanel(playerManagementToolsContainer, draftOpen, marketOpen);
        setupPlayerManagementEvents();
        
        // =================================================================
        // FIX SINCRONIZZAZIONE (Risolve 'where is not a function')
        // Controlliamo esplicitamente se 'where' è una funzione in firestoreTools.
        if (window.firestoreTools && typeof window.firestoreTools.where === 'function') {
            window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
            window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
        } else {
             // Fallback: Tentiamo un caricamento ritardato o avvisiamo l'Admin
             console.warn("Firestore Query/Where non disponibili. Riprovo a caricare i giocatori tra 500ms.");
             // Mostra un messaggio visibile all'admin
             document.getElementById('draft-players-list').innerHTML = '<p class="text-center text-red-400">Errore sincronizzazione Firebase, ricarico la lista...</p>';
             document.getElementById('market-players-list').innerHTML = '<p class="text-center text-red-400">Errore sincronizzazione Firebase, ricarico la lista...</p>';

             setTimeout(() => {
                // Riprovo a caricare i giocatori dopo un breve timeout
                if (window.firestoreTools && typeof window.firestoreTools.where === 'function') {
                    window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
                    window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
                } else {
                     document.getElementById('draft-players-list').innerHTML = '<p class="text-center text-red-400">Errore sincronizzazione critico. Controlla index.html.</p>';
                     document.getElementById('market-players-list').innerHTML = '<p class="text-center text-red-400">Errore sincronizzazione critico. Controlla index.html.</p>';
                }
             }, 500); 
        }
        // =================================================================
    };

    /**
     * Cabla eventi gestione giocatori
     */
    const setupPlayerManagementEvents = () => {
        const roleSelect = document.getElementById('player-role');
        if (roleSelect) {
             roleSelect.addEventListener('change', () => window.AdminPlayers.updateAbilitiesChecklist());
        }
        
        const btnToggleDraft = document.getElementById('btn-toggle-draft');
        if (btnToggleDraft) btnToggleDraft.addEventListener('click', handleToggleState);

        const btnToggleMarket = document.getElementById('btn-toggle-market');
        if (btnToggleMarket) btnToggleMarket.addEventListener('click', handleToggleState);

        // Listener per Draft a Turni
        const btnGenerateDraftList = document.getElementById('btn-generate-draft-list');
        if (btnGenerateDraftList) {
            btnGenerateDraftList.addEventListener('click', handleGenerateDraftList);
        }

        const btnStopDraftTurns = document.getElementById('btn-stop-draft-turns');
        if (btnStopDraftTurns) {
            btnStopDraftTurns.addEventListener('click', handleStopDraftTurns);
        }

        // Carica lo stato corrente del draft a turni
        loadDraftTurnsStatus();
        
        const btnRandomPlayer = document.getElementById('btn-random-player');
        if (btnRandomPlayer) btnRandomPlayer.addEventListener('click', () => window.AdminPlayers.handleRandomPlayer());
        
        const btnCreatePlayer = document.getElementById('btn-create-player');
        if (btnCreatePlayer) btnCreatePlayer.addEventListener('click', () => {
            window.AdminPlayers.handleCreatePlayer(
                DRAFT_PLAYERS_COLLECTION_PATH, 
                MARKET_PLAYERS_COLLECTION_PATH,
                {
                    draft: () => window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH),
                    market: () => window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH)
                }
            );
        });
        
        const levelMaxInput = document.getElementById('player-level-max');
        const costDisplayInput = document.getElementById('player-cost-display');

        const updateCostDisplay = () => {
            const levelMax = parseInt(levelMaxInput.value);
            const validLevel = isNaN(levelMax) || levelMax < 1 || levelMax > 20 ? 1 : levelMax;
            const calculatedCost = window.AdminPlayers.calculateCost(validLevel);
            costDisplayInput.value = `Costo: ${calculatedCost} CS`;
            costDisplayInput.dataset.calculatedCost = calculatedCost; 
        };

        if (levelMaxInput) {
            levelMaxInput.addEventListener('input', updateCostDisplay);
            const levelMinInput = document.getElementById('player-level-min');
            if(levelMinInput) levelMinInput.addEventListener('input', updateCostDisplay);
            updateCostDisplay(); 
        }

        const draftList = document.getElementById('draft-players-list');
        const marketList = document.getElementById('market-players-list');

        if (draftList) draftList.addEventListener('click', (e) => handlePlayerAction(e, DRAFT_PLAYERS_COLLECTION_PATH));
        if (marketList) marketList.addEventListener('click', (e) => handlePlayerAction(e, MARKET_PLAYERS_COLLECTION_PATH));
        
        const clearButtonsContainer = playerManagementToolsContainer.querySelector('.grid.grid-cols-2.gap-6.mb-4');
        if (clearButtonsContainer) {
             clearButtonsContainer.addEventListener('click', handleClearCollectionWrapper);
        }
        
        window.AdminPlayers.updateAbilitiesChecklist(); 
    };

    /**
     * Carica lo stato corrente del draft a turni
     */
    const loadDraftTurnsStatus = async () => {
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        try {
            const configDoc = await getDoc(configDocRef);
            const configData = configDoc.exists() ? configDoc.data() : {};
            const draftTurns = configData.draftTurns;
            const isDraftTurnsActive = draftTurns && draftTurns.isActive;

            const btnGenerate = document.getElementById('btn-generate-draft-list');
            const btnStop = document.getElementById('btn-stop-draft-turns');
            const statusContainer = document.getElementById('draft-turns-status-container');

            if (isDraftTurnsActive) {
                // Draft a turni attivo
                if (btnGenerate) btnGenerate.classList.add('hidden');
                if (btnStop) btnStop.classList.remove('hidden');

                // Mostra stato corrente
                const currentRound = draftTurns.currentRound;
                const orderKey = currentRound === 1 ? 'round1Order' : 'round2Order';
                const currentOrder = draftTurns[orderKey] || [];
                const currentTeam = currentOrder.find(t => t.teamId === draftTurns.currentTeamId);
                const remainingTeams = currentOrder.filter(t => !t.hasDrafted).length;

                if (statusContainer) {
                    statusContainer.innerHTML = `
                        <div class="p-3 bg-purple-900 border border-purple-500 rounded-lg">
                            <p class="text-purple-300 font-bold mb-2">Draft a Turni ATTIVO</p>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="text-gray-400">Round:</span> <span class="text-white font-bold">${currentRound} / ${draftTurns.totalRounds}</span></div>
                                <div><span class="text-gray-400">Rimanenti:</span> <span class="text-white font-bold">${remainingTeams}</span></div>
                            </div>
                            <p class="text-sm mt-2"><span class="text-gray-400">Turno:</span> <span class="text-yellow-400 font-bold">${currentTeam ? currentTeam.teamName : 'N/A'}</span></p>
                            <div class="mt-2 flex flex-wrap gap-1">
                                ${currentOrder.map((t, i) => `
                                    <span class="text-xs px-2 py-1 rounded ${t.hasDrafted ? 'bg-gray-600 text-gray-400 line-through' : (t.teamId === draftTurns.currentTeamId ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-700 text-white')}">${i+1}. ${t.teamName}</span>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            } else {
                // Draft a turni non attivo
                if (btnGenerate) btnGenerate.classList.remove('hidden');
                if (btnStop) btnStop.classList.add('hidden');
                if (statusContainer) statusContainer.innerHTML = '';
            }

        } catch (error) {
            console.error('Errore nel caricamento stato draft a turni:', error);
        }
    };

    /**
     * Gestisce la generazione della lista draft
     */
    const handleGenerateDraftList = async () => {
        const btn = document.getElementById('btn-generate-draft-list');

        if (!confirm('Vuoi generare la lista del draft? Le squadre potranno draftare a turno.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Generazione in corso...';
        displayMessage('Generazione lista draft in corso...', 'info', 'toggle-status-message');

        try {
            // Prepara il contesto per DraftTurns
            const context = {
                db,
                firestoreTools,
                paths: {
                    TEAMS_COLLECTION_PATH,
                    CHAMPIONSHIP_CONFIG_PATH,
                    LEADERBOARD_COLLECTION_PATH: `artifacts/${firestoreTools.appId}/public/data/leaderboard`
                }
            };

            const result = await window.DraftTurns.startDraftTurns(context);

            if (result.success) {
                displayMessage('Lista draft generata! Il draft a turni e iniziato.', 'success', 'toggle-status-message');
                // Aggiorna lo stato
                loadDraftTurnsStatus();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Errore nella generazione lista draft:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
            btn.disabled = false;
            btn.textContent = 'Genera Lista Draft';
        }
    };

    /**
     * Gestisce la fermata del draft a turni
     */
    const handleStopDraftTurns = async () => {
        const btn = document.getElementById('btn-stop-draft-turns');

        if (!confirm('Vuoi fermare il draft a turni? Questa azione interrompera il draft in corso.')) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Fermando...';
        displayMessage('Fermando draft a turni...', 'info', 'toggle-status-message');

        try {
            const context = {
                db,
                firestoreTools,
                paths: {
                    CHAMPIONSHIP_CONFIG_PATH
                }
            };

            const result = await window.DraftTurns.stopDraftTurns(context);

            if (result.success) {
                displayMessage('Draft a turni fermato.', 'success', 'toggle-status-message');
                loadDraftTurnsStatus();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Errore nel fermare il draft:', error);
            displayMessage(`Errore: ${error.message}`, 'error', 'toggle-status-message');
            btn.disabled = false;
            btn.textContent = 'Ferma Draft a Turni';
        }
    };

    /**
     * Toggle draft/market state
     */
    const handleToggleState = async (event) => {
        const target = event.target;
        const stateType = target.dataset.type;
        const key = stateType === 'draft' ? 'isDraftOpen' : 'isMarketOpen';
        const statusTextId = stateType === 'draft' ? 'draft-status-text' : 'market-status-text';
        
        const { doc, setDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        const currentlyOpen = target.dataset.isOpen === 'true';
        const newState = !currentlyOpen;
        
        target.textContent = 'Aggiornamento...';
        target.disabled = true;
        displayMessage(`Aggiornamento stato ${stateType}...`, 'info', 'toggle-status-message');

        try {
            await setDoc(configDocRef, { [key]: newState, isSeasonOver: false }, { merge: true });
            
            displayMessage(`Stato ${stateType} aggiornato: ${newState ? 'APERTO' : 'CHIUSO'}`, 'success', 'toggle-status-message');
            
            target.dataset.isOpen = newState;
            target.textContent = newState ? `CHIUDI ${stateType}` : `APRI ${stateType}`;
            
            const statusBox = target.closest('div');
            const statusText = document.getElementById(statusTextId);

            statusText.textContent = newState ? 'APERTO' : 'CHIUSO';
            statusBox.classList.remove(newState ? 'border-red-500' : 'border-green-500', newState ? 'bg-red-900' : 'bg-green-900');
            statusBox.classList.add(newState ? 'border-green-500' : 'border-red-500', newState ? 'bg-green-900' : 'bg-red-900');
            target.classList.remove(newState ? 'bg-green-600' : 'bg-red-600', newState ? 'hover:bg-green-700' : 'hover:bg-red-700');
            target.classList.add(newState ? 'bg-red-600' : 'bg-green-600', newState ? 'hover:bg-red-700' : 'hover:bg-green-700');
            
            const summaryText = document.getElementById(`${stateType}-status-text-summary`);
            if (summaryText) summaryText.textContent = newState ? 'APERTO' : 'CHIUSO';

        } catch (error) {
            console.error(`Errore nell'aggiornamento dello stato ${stateType}:`, error);
            displayMessage(`Errore durante l'aggiornamento: ${error.message}`, 'error', 'toggle-status-message');
        } finally {
            target.disabled = false;
        }
    };

    const handlePlayerAction = async (event, collectionPath) => {
        const target = event.target;
        
        if (target.dataset.action === 'delete') {
            target.textContent = 'CONFERMA?';
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-delete';
            return;
        }

        if (target.dataset.action === 'confirm-delete') {
            const playerIdToDelete = target.dataset.playerId;
            const collectionName = collectionPath.includes('market') ? 'Mercato' : 'Draft';
            const { doc, deleteDoc } = firestoreTools;

            target.textContent = 'Eliminazione...';
            target.disabled = true;

            try {
                const playerDocRef = doc(db, collectionPath, playerIdToDelete);
                await deleteDoc(playerDocRef);

                target.closest('.player-item').remove();
                displayMessage(`Giocatore eliminato dal ${collectionName}!`, 'success', 'player-creation-message');
                
                if (collectionPath === DRAFT_PLAYERS_COLLECTION_PATH) {
                     window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
                } else {
                     window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
                }

            } catch (error) {
                console.error(`Errore durante l'eliminazione del giocatore ${playerIdToDelete} dal ${collectionName}:`, error);
                displayMessage(`Errore durante l'eliminazione dal ${collectionName}: ${error.message}`, 'error', 'player-creation-message');
            }
        }
    };

    const handleClearCollectionWrapper = (event) => {
        const target = event.target.closest('[data-action="clear-collection"]');
        if (!target) return;
        
        const targetCollection = target.dataset.target;
        let path, collectionName, loadFunction;

        if (targetCollection === 'draft') {
            path = DRAFT_PLAYERS_COLLECTION_PATH;
            collectionName = 'DRAFT';
            loadFunction = () => window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
        } else if (targetCollection === 'market') {
            path = MARKET_PLAYERS_COLLECTION_PATH;
            collectionName = 'MERCATO';
            loadFunction = () => window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
        } else {
            return;
        }

        handleClearCollection(path, collectionName, loadFunction);
    };

    const handleClearCollection = async (collectionPath, collectionName, loadFunction) => {
        const msgId = 'player-creation-message';
        const confirmation = prompt(`ATTENZIONE: Stai per eliminare TUTTI i giocatori dalla collezione ${collectionName}. Questa azione è IRREVERSIBILE.\n\nDigita il nome della collezione per confermare:`);
        
        if (!confirmation || confirmation.toUpperCase() !== collectionName.toUpperCase()) {
            displayMessage(`Cancellazione ${collectionName} annullata.`, 'info', msgId);
            return;
        }

        displayMessage(`Eliminazione di tutti i giocatori in ${collectionName} in corso...`, 'info', msgId);

        try {
            const { collection, getDocs, deleteDoc } = firestoreTools;
            const q = collection(db, collectionPath);
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                displayMessage(`Collezione ${collectionName} gia vuota.`, 'success', msgId);
                return;
            }

            const deletePromises = [];
            snapshot.forEach(doc => {
                deletePromises.push(deleteDoc(doc.ref));
            });

            await Promise.all(deletePromises);

            displayMessage(`Cancellati con successo ${snapshot.size} giocatori da ${collectionName}.`, 'success', msgId);
            loadFunction();

        } catch (error) {
            console.error(`Errore durante l'eliminazione di massa da ${collectionName}:`, error);
            displayMessage(`Errore critico nella cancellazione di ${collectionName}: ${error.message}`, 'error', msgId);
        }
    };

    /**
     * Renderizza pannello gestione squadre
     */
    const renderTeamManagementPanel = async () => {
        window.showScreen(teamManagementContent);
        window.AdminUI.renderTeamManagementPanel(teamManagementToolsContainer);
        
        window.AdminTeams.teamsListContainer = document.getElementById('teams-list-container-management');
        
        document.getElementById('btn-refresh-teams-management').addEventListener('click', () => {
            window.AdminTeams.loadTeams(TEAMS_COLLECTION_PATH);
        });
        
        if (window.AdminTeams.teamsListContainer) {
            window.AdminTeams.teamsListContainer.addEventListener('click', (e) => {
                window.AdminTeams.handleTeamAction(e, TEAMS_COLLECTION_PATH, () => {
                    window.AdminTeams.loadTeams(TEAMS_COLLECTION_PATH);
                });
            });
        }
        
        window.AdminTeams.loadTeams(TEAMS_COLLECTION_PATH);
    };

    const handleAdminLogout = () => {
        console.log("Logout Admin effettuato.");
        if (window.handleLogout) window.handleLogout();
    };

    document.addEventListener('adminLoggedIn', initializeAdminPanel);
    
    window.loadDraftPlayersAdmin = () => window.AdminPlayers.loadDraftPlayers(DRAFT_PLAYERS_COLLECTION_PATH);
    window.loadMarketPlayersAdmin = () => window.AdminPlayers.loadMarketPlayers(MARKET_PLAYERS_COLLECTION_PATH);
});