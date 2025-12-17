//
// ====================================================================
// ADMIN-DATA-SYNC.JS - Sincronizzazione e Riparazione Dati
// ====================================================================
// Utility admin per sincronizzare i dati tra Firebase e l'app
//

window.AdminDataSync = {

    // Risultati dell'ultima sincronizzazione
    lastSyncResults: null,

    /**
     * Mostra il pannello di sincronizzazione dati
     */
    async showSyncPanel() {
        const container = document.getElementById('admin-content');
        if (!container) return;

        container.innerHTML = `
            <div class="p-4">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <i class="fas fa-sync-alt text-blue-400"></i>
                        Sincronizzazione Dati
                    </h2>
                    <button id="btn-close-sync-panel" class="text-gray-400 hover:text-white text-2xl px-2">&times;</button>
                </div>

                <p class="text-gray-400 text-sm mb-6">
                    Verifica e ripara incoerenze tra i dati salvati su Firebase e quelli mostrati nell'app.
                </p>

                <!-- Opzioni di sincronizzazione -->
                <div class="space-y-4 mb-6">
                    <div class="bg-gray-800 rounded-lg p-4">
                        <h3 class="text-white font-bold mb-3 flex items-center gap-2">
                            <i class="fas fa-trophy text-yellow-400"></i>
                            Hall of Fame / Storico Partite
                        </h3>
                        <div class="space-y-2">
                            <label class="flex items-center gap-2 text-gray-300">
                                <input type="checkbox" id="sync-coppa" checked class="rounded">
                                <span>Partite Coppa mancanti</span>
                            </label>
                            <label class="flex items-center gap-2 text-gray-300">
                                <input type="checkbox" id="sync-campionato" checked class="rounded">
                                <span>Partite Campionato mancanti</span>
                            </label>
                        </div>
                    </div>

                    <div class="bg-gray-800 rounded-lg p-4">
                        <h3 class="text-white font-bold mb-3 flex items-center gap-2">
                            <i class="fas fa-users text-green-400"></i>
                            Rose e Formazioni
                        </h3>
                        <div class="space-y-2">
                            <label class="flex items-center gap-2 text-gray-300">
                                <input type="checkbox" id="sync-formations" class="rounded">
                                <span>Rimuovi giocatori non piu in rosa dalle formazioni</span>
                            </label>
                        </div>
                    </div>

                    <div class="bg-gray-800 rounded-lg p-4">
                        <h3 class="text-white font-bold mb-3 flex items-center gap-2">
                            <i class="fas fa-chart-bar text-purple-400"></i>
                            Statistiche
                        </h3>
                        <div class="space-y-2">
                            <label class="flex items-center gap-2 text-gray-300">
                                <input type="checkbox" id="sync-player-stats" class="rounded">
                                <span>Ricalcola statistiche giocatori da storico</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Bottoni azione -->
                <div class="flex gap-4 mb-6">
                    <button id="btn-analyze-data" class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                        <i class="fas fa-search"></i>
                        Analizza Problemi
                    </button>
                    <button id="btn-sync-data" class="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2" disabled>
                        <i class="fas fa-wrench"></i>
                        Ripara Dati
                    </button>
                </div>

                <!-- Area risultati -->
                <div id="sync-results" class="bg-gray-900 rounded-lg p-4 min-h-[200px]">
                    <p class="text-gray-500 text-center">Clicca "Analizza Problemi" per iniziare</p>
                </div>

                <!-- Log dettagliato -->
                <div id="sync-log" class="mt-4 bg-gray-900 rounded-lg p-4 max-h-[300px] overflow-y-auto hidden">
                    <h4 class="text-white font-bold mb-2">Log Dettagliato</h4>
                    <div id="sync-log-content" class="text-xs text-gray-400 font-mono"></div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('btn-analyze-data')?.addEventListener('click', () => this.analyzeData());
        document.getElementById('btn-sync-data')?.addEventListener('click', () => this.repairData());
        document.getElementById('btn-close-sync-panel')?.addEventListener('click', () => {
            // Torna alla vista admin principale
            if (window.renderAdminDashboardLayout) {
                window.renderAdminDashboardLayout();
            }
        });
    },

    /**
     * Analizza i dati per trovare incoerenze
     */
    async analyzeData() {
        const resultsDiv = document.getElementById('sync-results');
        const logDiv = document.getElementById('sync-log');
        const logContent = document.getElementById('sync-log-content');
        const syncBtn = document.getElementById('btn-sync-data');

        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            <div class="flex items-center justify-center gap-2 text-blue-400">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Analisi in corso...</span>
            </div>
        `;

        logDiv.classList.remove('hidden');
        logContent.innerHTML = '';

        const log = (msg, type = 'info') => {
            const colors = { info: 'text-gray-400', success: 'text-green-400', warning: 'text-yellow-400', error: 'text-red-400' };
            logContent.innerHTML += `<div class="${colors[type]}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
            logContent.scrollTop = logContent.scrollHeight;
        };

        try {
            const results = {
                coppa: { missing: [], total: 0 },
                campionato: { missing: [], total: 0 },
                formations: { issues: [], total: 0 },
                stats: { outdated: [], total: 0 }
            };

            const syncCoppa = document.getElementById('sync-coppa')?.checked;
            const syncCampionato = document.getElementById('sync-campionato')?.checked;
            const syncFormations = document.getElementById('sync-formations')?.checked;
            const syncStats = document.getElementById('sync-player-stats')?.checked;

            // 1. Analizza Coppa
            if (syncCoppa) {
                log('Analisi partite Coppa...');
                results.coppa = await this.analyzeCoppaMatches(log);
            }

            // 2. Analizza Campionato
            if (syncCampionato) {
                log('Analisi partite Campionato...');
                results.campionato = await this.analyzeCampionatoMatches(log);
            }

            // 3. Analizza Formazioni
            if (syncFormations) {
                log('Analisi formazioni...');
                results.formations = await this.analyzeFormations(log);
            }

            // 4. Analizza Statistiche
            if (syncStats) {
                log('Analisi statistiche giocatori...');
                results.stats = await this.analyzePlayerStats(log);
            }

            this.lastSyncResults = results;

            // Mostra risultati
            const totalIssues =
                results.coppa.missing.length +
                results.campionato.missing.length +
                results.formations.issues.length +
                results.stats.outdated.length;

            resultsDiv.innerHTML = this.renderAnalysisResults(results, totalIssues);

            // Abilita bottone riparazione se ci sono problemi
            if (syncBtn && totalIssues > 0) {
                syncBtn.disabled = false;
            }

            log(`Analisi completata: ${totalIssues} problemi trovati`, totalIssues > 0 ? 'warning' : 'success');

        } catch (error) {
            console.error('Errore analisi dati:', error);
            log(`ERRORE: ${error.message}`, 'error');
            resultsDiv.innerHTML = `
                <div class="text-red-400 text-center">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Errore durante l'analisi: ${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Analizza partite Coppa mancanti in MatchHistory
     */
    async analyzeCoppaMatches(log) {
        const result = { missing: [], total: 0 };

        try {
            const { doc, getDoc, collection, getDocs } = window.firestoreTools;
            const appId = window.firestoreTools.appId;

            // Carica stato coppa
            const coppaRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'coppa');
            const coppaDoc = await getDoc(coppaRef);

            if (!coppaDoc.exists()) {
                log('Nessun dato Coppa trovato', 'warning');
                return result;
            }

            const coppaData = coppaDoc.data();
            const rounds = coppaData.rounds || [];

            // Carica tutte le squadre per verificare MatchHistory
            const teamsRef = collection(window.db, `artifacts/${appId}/public/data/teams`);
            const teamsSnapshot = await getDocs(teamsRef);
            const teamsMatchHistory = {};

            teamsSnapshot.forEach(doc => {
                const data = doc.data();
                teamsMatchHistory[doc.id] = {
                    name: data.name,
                    logoUrl: data.logoUrl || '',
                    history: data.matchHistory || []
                };
            });

            // Analizza ogni turno
            for (const round of rounds) {
                for (const match of round.matches || []) {
                    // Controlla leg1
                    if (match.leg1Result) {
                        result.total++;
                        const matchKey = `coppa_${round.roundName}_leg1_${match.homeTeam?.teamId}_${match.awayTeam?.teamId}`;

                        // Verifica se esiste nello storico di entrambe le squadre
                        const homeHas = this.hasMatchInHistory(teamsMatchHistory[match.homeTeam?.teamId]?.history, 'coppa', match.homeTeam?.teamId, match.awayTeam?.teamId, round.roundName, 'andata');
                        const awayHas = this.hasMatchInHistory(teamsMatchHistory[match.awayTeam?.teamId]?.history, 'coppa', match.homeTeam?.teamId, match.awayTeam?.teamId, round.roundName, 'andata');

                        if (!homeHas || !awayHas) {
                            result.missing.push({
                                type: 'coppa',
                                round: round.roundName,
                                leg: 'andata',
                                result: match.leg1Result,
                                homeTeam: match.homeTeam,
                                awayTeam: match.awayTeam,
                                missingFor: !homeHas && !awayHas ? 'both' : (!homeHas ? 'home' : 'away'),
                                homeTeamData: teamsMatchHistory[match.homeTeam?.teamId],
                                awayTeamData: teamsMatchHistory[match.awayTeam?.teamId]
                            });
                            log(`Coppa ${round.roundName} andata: ${match.homeTeam?.teamName} vs ${match.awayTeam?.teamName} (${match.leg1Result}) - MANCANTE`, 'warning');
                        }
                    }

                    // Controlla leg2
                    if (match.leg2Result) {
                        result.total++;

                        const homeHas = this.hasMatchInHistory(teamsMatchHistory[match.homeTeam?.teamId]?.history, 'coppa', match.homeTeam?.teamId, match.awayTeam?.teamId, round.roundName, 'ritorno');
                        const awayHas = this.hasMatchInHistory(teamsMatchHistory[match.awayTeam?.teamId]?.history, 'coppa', match.homeTeam?.teamId, match.awayTeam?.teamId, round.roundName, 'ritorno');

                        if (!homeHas || !awayHas) {
                            result.missing.push({
                                type: 'coppa',
                                round: round.roundName,
                                leg: 'ritorno',
                                result: match.leg2Result,
                                homeTeam: match.awayTeam, // Nel ritorno si inverte
                                awayTeam: match.homeTeam,
                                missingFor: !homeHas && !awayHas ? 'both' : (!homeHas ? 'home' : 'away'),
                                homeTeamData: teamsMatchHistory[match.awayTeam?.teamId],
                                awayTeamData: teamsMatchHistory[match.homeTeam?.teamId]
                            });
                            log(`Coppa ${round.roundName} ritorno: ${match.awayTeam?.teamName} vs ${match.homeTeam?.teamName} (${match.leg2Result}) - MANCANTE`, 'warning');
                        }
                    }
                }
            }

            log(`Coppa: ${result.missing.length}/${result.total} partite mancanti`, result.missing.length > 0 ? 'warning' : 'success');

        } catch (error) {
            log(`Errore analisi Coppa: ${error.message}`, 'error');
        }

        return result;
    },

    /**
     * Analizza partite Campionato mancanti in MatchHistory
     */
    async analyzeCampionatoMatches(log) {
        const result = { missing: [], total: 0 };

        try {
            const { doc, getDoc, collection, getDocs } = window.firestoreTools;
            const appId = window.firestoreTools.appId;

            // Carica schedule
            const scheduleRef = collection(window.db, `artifacts/${appId}/public/data/schedule`);
            const scheduleSnapshot = await getDocs(scheduleRef);

            if (scheduleSnapshot.empty) {
                log('Nessun calendario campionato trovato', 'warning');
                return result;
            }

            // Carica tutte le squadre per verificare MatchHistory
            const teamsRef = collection(window.db, `artifacts/${appId}/public/data/teams`);
            const teamsSnapshot = await getDocs(teamsRef);
            const teamsMatchHistory = {};

            teamsSnapshot.forEach(doc => {
                const data = doc.data();
                teamsMatchHistory[doc.id] = {
                    name: data.name,
                    logoUrl: data.logoUrl || '',
                    history: data.matchHistory || []
                };
            });

            // Analizza ogni giornata
            scheduleSnapshot.forEach(roundDoc => {
                const roundData = roundDoc.data();
                const roundNumber = roundData.round || roundDoc.id;

                for (const match of roundData.matches || []) {
                    if (match.result) {
                        result.total++;

                        // Verifica se esiste nello storico
                        const homeHas = this.hasMatchInHistory(teamsMatchHistory[match.homeTeamId]?.history, 'campionato', match.homeTeamId, match.awayTeamId, `Giornata ${roundNumber}`);
                        const awayHas = this.hasMatchInHistory(teamsMatchHistory[match.awayTeamId]?.history, 'campionato', match.homeTeamId, match.awayTeamId, `Giornata ${roundNumber}`);

                        if (!homeHas || !awayHas) {
                            result.missing.push({
                                type: 'campionato',
                                round: `Giornata ${roundNumber}`,
                                result: match.result,
                                homeTeamId: match.homeTeamId,
                                awayTeamId: match.awayTeamId,
                                homeTeamName: match.homeTeamName,
                                awayTeamName: match.awayTeamName,
                                missingFor: !homeHas && !awayHas ? 'both' : (!homeHas ? 'home' : 'away'),
                                homeTeamData: teamsMatchHistory[match.homeTeamId],
                                awayTeamData: teamsMatchHistory[match.awayTeamId]
                            });
                            log(`Campionato ${roundNumber}: ${match.homeTeamName} vs ${match.awayTeamName} (${match.result}) - MANCANTE`, 'warning');
                        }
                    }
                }
            });

            log(`Campionato: ${result.missing.length}/${result.total} partite mancanti`, result.missing.length > 0 ? 'warning' : 'success');

        } catch (error) {
            log(`Errore analisi Campionato: ${error.message}`, 'error');
        }

        return result;
    },

    /**
     * Analizza formazioni per giocatori non piu in rosa
     */
    async analyzeFormations(log) {
        const result = { issues: [], total: 0 };

        try {
            const { collection, getDocs } = window.firestoreTools;
            const appId = window.firestoreTools.appId;

            const teamsRef = collection(window.db, `artifacts/${appId}/public/data/teams`);
            const teamsSnapshot = await getDocs(teamsRef);

            teamsSnapshot.forEach(doc => {
                const data = doc.data();
                result.total++;

                const rosa = data.players || [];
                const rosaIds = new Set(rosa.map(p => p.id));

                const formation = data.formation || {};
                const titolari = formation.titolari || [];
                const panchina = formation.panchina || [];

                // Trova giocatori in formazione ma non in rosa
                const invalidTitolari = titolari.filter(p => !rosaIds.has(p.id));
                const invalidPanchina = panchina.filter(p => !rosaIds.has(p.id));

                if (invalidTitolari.length > 0 || invalidPanchina.length > 0) {
                    result.issues.push({
                        teamId: doc.id,
                        teamName: data.name,
                        invalidTitolari,
                        invalidPanchina
                    });
                    log(`${data.name}: ${invalidTitolari.length + invalidPanchina.length} giocatori fantasma in formazione`, 'warning');
                }
            });

            log(`Formazioni: ${result.issues.length}/${result.total} squadre con problemi`, result.issues.length > 0 ? 'warning' : 'success');

        } catch (error) {
            log(`Errore analisi formazioni: ${error.message}`, 'error');
        }

        return result;
    },

    /**
     * Analizza statistiche giocatori (placeholder per futuro)
     */
    async analyzePlayerStats(log) {
        log('Analisi statistiche: funzionalita in sviluppo', 'info');
        return { outdated: [], total: 0 };
    },

    /**
     * Verifica se una partita esiste nello storico
     */
    hasMatchInHistory(history, type, homeTeamId, awayTeamId, roundInfo, leg = null) {
        if (!history || !Array.isArray(history)) return false;

        return history.some(m => {
            if (m.type !== type) return false;

            // Verifica squadre (in qualsiasi ordine)
            const teamsMatch =
                (m.homeTeam?.id === homeTeamId && m.awayTeam?.id === awayTeamId) ||
                (m.homeTeam?.id === awayTeamId && m.awayTeam?.id === homeTeamId);

            if (!teamsMatch) return false;

            // Per la coppa, verifica anche il turno e la leg
            if (type === 'coppa' && leg) {
                return m.details?.round === roundInfo && m.details?.leg === leg;
            }

            // Per il campionato, verifica la giornata
            if (type === 'campionato') {
                return m.details?.round === roundInfo;
            }

            return true;
        });
    },

    /**
     * Renderizza i risultati dell'analisi
     */
    renderAnalysisResults(results, totalIssues) {
        if (totalIssues === 0) {
            return `
                <div class="text-center text-green-400">
                    <i class="fas fa-check-circle text-4xl mb-2"></i>
                    <p class="text-lg font-bold">Tutti i dati sono sincronizzati!</p>
                    <p class="text-sm text-gray-400">Non sono stati trovati problemi</p>
                </div>
            `;
        }

        let html = `
            <div class="text-yellow-400 mb-4">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="font-bold">${totalIssues} problemi trovati</span>
            </div>
            <div class="space-y-3">
        `;

        if (results.coppa.missing.length > 0) {
            html += `
                <div class="bg-gray-800 p-3 rounded">
                    <div class="flex items-center gap-2 text-yellow-400 mb-2">
                        <i class="fas fa-trophy"></i>
                        <span class="font-bold">Coppa: ${results.coppa.missing.length} partite mancanti</span>
                    </div>
                    <ul class="text-sm text-gray-400 space-y-1">
                        ${results.coppa.missing.slice(0, 5).map(m =>
                            `<li>• ${m.round} ${m.leg}: ${m.homeTeam?.teamName || 'N/A'} vs ${m.awayTeam?.teamName || 'N/A'} (${m.result})</li>`
                        ).join('')}
                        ${results.coppa.missing.length > 5 ? `<li class="text-gray-500">... e altre ${results.coppa.missing.length - 5}</li>` : ''}
                    </ul>
                </div>
            `;
        }

        if (results.campionato.missing.length > 0) {
            html += `
                <div class="bg-gray-800 p-3 rounded">
                    <div class="flex items-center gap-2 text-blue-400 mb-2">
                        <i class="fas fa-futbol"></i>
                        <span class="font-bold">Campionato: ${results.campionato.missing.length} partite mancanti</span>
                    </div>
                    <ul class="text-sm text-gray-400 space-y-1">
                        ${results.campionato.missing.slice(0, 5).map(m =>
                            `<li>• ${m.round}: ${m.homeTeamName} vs ${m.awayTeamName} (${m.result})</li>`
                        ).join('')}
                        ${results.campionato.missing.length > 5 ? `<li class="text-gray-500">... e altre ${results.campionato.missing.length - 5}</li>` : ''}
                    </ul>
                </div>
            `;
        }

        if (results.formations.issues.length > 0) {
            html += `
                <div class="bg-gray-800 p-3 rounded">
                    <div class="flex items-center gap-2 text-green-400 mb-2">
                        <i class="fas fa-users"></i>
                        <span class="font-bold">Formazioni: ${results.formations.issues.length} squadre con problemi</span>
                    </div>
                    <ul class="text-sm text-gray-400 space-y-1">
                        ${results.formations.issues.map(f =>
                            `<li>• ${f.teamName}: ${f.invalidTitolari.length + f.invalidPanchina.length} giocatori fantasma</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    /**
     * Ripara i dati trovati nell'analisi
     */
    async repairData() {
        if (!this.lastSyncResults) {
            alert('Esegui prima l\'analisi dei dati');
            return;
        }

        const resultsDiv = document.getElementById('sync-results');
        const logContent = document.getElementById('sync-log-content');

        const log = (msg, type = 'info') => {
            const colors = { info: 'text-gray-400', success: 'text-green-400', warning: 'text-yellow-400', error: 'text-red-400' };
            logContent.innerHTML += `<div class="${colors[type]}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
            logContent.scrollTop = logContent.scrollHeight;
        };

        resultsDiv.innerHTML = `
            <div class="flex items-center justify-center gap-2 text-green-400">
                <i class="fas fa-wrench fa-spin"></i>
                <span>Riparazione in corso...</span>
            </div>
        `;

        let repaired = 0;
        let errors = 0;

        try {
            // Ripara partite Coppa mancanti
            for (const match of this.lastSyncResults.coppa.missing) {
                try {
                    await this.repairCoppaMatch(match, log);
                    repaired++;
                } catch (e) {
                    log(`Errore riparazione Coppa: ${e.message}`, 'error');
                    errors++;
                }
            }

            // Ripara partite Campionato mancanti
            for (const match of this.lastSyncResults.campionato.missing) {
                try {
                    await this.repairCampionatoMatch(match, log);
                    repaired++;
                } catch (e) {
                    log(`Errore riparazione Campionato: ${e.message}`, 'error');
                    errors++;
                }
            }

            // Ripara formazioni
            for (const issue of this.lastSyncResults.formations.issues) {
                try {
                    await this.repairFormation(issue, log);
                    repaired++;
                } catch (e) {
                    log(`Errore riparazione formazione: ${e.message}`, 'error');
                    errors++;
                }
            }

            resultsDiv.innerHTML = `
                <div class="text-center ${errors > 0 ? 'text-yellow-400' : 'text-green-400'}">
                    <i class="fas fa-${errors > 0 ? 'exclamation-triangle' : 'check-circle'} text-4xl mb-2"></i>
                    <p class="text-lg font-bold">Riparazione completata</p>
                    <p class="text-sm text-gray-400">${repaired} elementi riparati${errors > 0 ? `, ${errors} errori` : ''}</p>
                </div>
            `;

            log(`Riparazione completata: ${repaired} successi, ${errors} errori`, errors > 0 ? 'warning' : 'success');

            // Disabilita bottone dopo riparazione
            document.getElementById('btn-sync-data').disabled = true;
            this.lastSyncResults = null;

        } catch (error) {
            log(`Errore critico: ${error.message}`, 'error');
            resultsDiv.innerHTML = `
                <div class="text-red-400 text-center">
                    <i class="fas fa-times-circle text-4xl mb-2"></i>
                    <p>Errore durante la riparazione</p>
                </div>
            `;
        }
    },

    /**
     * Ripara una partita Coppa mancante
     * Salva direttamente su Firestore (bypassa feature flag per operazioni admin)
     */
    async repairCoppaMatch(match, log) {
        const [homeGoals, awayGoals] = match.result.split('-').map(s => parseInt(s) || 0);
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;

        // Salva per squadra casa (se mancante)
        if (match.missingFor === 'both' || match.missingFor === 'home') {
            const homeTeamId = match.homeTeam?.teamId;
            if (homeTeamId) {
                await this.saveMatchDirectly(homeTeamId, {
                    type: 'coppa',
                    homeTeam: {
                        id: homeTeamId,
                        name: match.homeTeam?.teamName || 'N/A',
                        logoUrl: match.homeTeamData?.logoUrl || ''
                    },
                    awayTeam: {
                        id: match.awayTeam?.teamId,
                        name: match.awayTeam?.teamName || 'N/A',
                        logoUrl: match.awayTeamData?.logoUrl || ''
                    },
                    homeScore: homeGoals,
                    awayScore: awayGoals,
                    isHome: true,
                    details: { round: match.round, leg: match.leg }
                });
                log(`Coppa ${match.round} ${match.leg}: aggiunta per ${match.homeTeam?.teamName}`, 'success');
            }
        }

        // Salva per squadra ospite (se mancante)
        if (match.missingFor === 'both' || match.missingFor === 'away') {
            const awayTeamId = match.awayTeam?.teamId;
            if (awayTeamId) {
                await this.saveMatchDirectly(awayTeamId, {
                    type: 'coppa',
                    homeTeam: {
                        id: match.homeTeam?.teamId,
                        name: match.homeTeam?.teamName || 'N/A',
                        logoUrl: match.homeTeamData?.logoUrl || ''
                    },
                    awayTeam: {
                        id: awayTeamId,
                        name: match.awayTeam?.teamName || 'N/A',
                        logoUrl: match.awayTeamData?.logoUrl || ''
                    },
                    homeScore: homeGoals,
                    awayScore: awayGoals,
                    isHome: false,
                    details: { round: match.round, leg: match.leg }
                });
                log(`Coppa ${match.round} ${match.leg}: aggiunta per ${match.awayTeam?.teamName}`, 'success');
            }
        }
    },

    /**
     * Salva una partita direttamente su Firestore (bypassa feature flag)
     * Usato per operazioni admin di riparazione
     */
    async saveMatchDirectly(teamId, matchData) {
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

        const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) {
            throw new Error(`Squadra ${teamId} non trovata`);
        }

        const teamData = teamDoc.data();
        let matchHistory = teamData.matchHistory || [];

        // Crea record partita
        const matchRecord = {
            id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: new Date().toISOString(),
            type: matchData.type || 'coppa',
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            homeScore: matchData.homeScore || 0,
            awayScore: matchData.awayScore || 0,
            isHome: matchData.isHome !== undefined ? matchData.isHome : true,
            details: matchData.details || null
        };

        // Calcola risultato
        const myScore = matchRecord.isHome ? matchRecord.homeScore : matchRecord.awayScore;
        const opponentScore = matchRecord.isHome ? matchRecord.awayScore : matchRecord.homeScore;

        if (myScore > opponentScore) {
            matchRecord.result = 'win';
        } else if (myScore < opponentScore) {
            matchRecord.result = 'loss';
        } else {
            matchRecord.result = 'draw';
        }

        // Aggiungi in cima
        matchHistory.unshift(matchRecord);

        // Limita dimensione
        if (matchHistory.length > 100) {
            matchHistory = matchHistory.slice(0, 100);
        }

        // Salva
        await updateDoc(teamDocRef, { matchHistory });
        console.log(`[AdminDataSync] Partita salvata direttamente per ${teamId}`, matchRecord);
    },

    /**
     * Ripara una partita Campionato mancante
     * Salva direttamente su Firestore (bypassa feature flag per operazioni admin)
     */
    async repairCampionatoMatch(match, log) {
        const [homeGoals, awayGoals] = match.result.split('-').map(s => parseInt(s) || 0);

        // Salva per squadra casa
        if (match.missingFor === 'both' || match.missingFor === 'home') {
            if (match.homeTeamId) {
                await this.saveMatchDirectly(match.homeTeamId, {
                    type: 'campionato',
                    homeTeam: {
                        id: match.homeTeamId,
                        name: match.homeTeamName || 'N/A',
                        logoUrl: match.homeTeamData?.logoUrl || ''
                    },
                    awayTeam: {
                        id: match.awayTeamId,
                        name: match.awayTeamName || 'N/A',
                        logoUrl: match.awayTeamData?.logoUrl || ''
                    },
                    homeScore: homeGoals,
                    awayScore: awayGoals,
                    isHome: true,
                    details: { round: match.round }
                });
                log(`${match.round}: aggiunta per ${match.homeTeamName}`, 'success');
            }
        }

        // Salva per squadra ospite
        if (match.missingFor === 'both' || match.missingFor === 'away') {
            if (match.awayTeamId) {
                await this.saveMatchDirectly(match.awayTeamId, {
                    type: 'campionato',
                    homeTeam: {
                        id: match.homeTeamId,
                        name: match.homeTeamName || 'N/A',
                        logoUrl: match.homeTeamData?.logoUrl || ''
                    },
                    awayTeam: {
                        id: match.awayTeamId,
                        name: match.awayTeamName || 'N/A',
                        logoUrl: match.awayTeamData?.logoUrl || ''
                    },
                    homeScore: homeGoals,
                    awayScore: awayGoals,
                    isHome: false,
                    details: { round: match.round }
                });
                log(`${match.round}: aggiunta per ${match.awayTeamName}`, 'success');
            }
        }
    },

    /**
     * Ripara formazione con giocatori fantasma
     */
    async repairFormation(issue, log) {
        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;

        const teamRef = doc(window.db, `artifacts/${appId}/public/data/teams`, issue.teamId);
        const teamDoc = await getDoc(teamRef);

        if (!teamDoc.exists()) return;

        const data = teamDoc.data();
        const rosa = data.players || [];
        const rosaIds = new Set(rosa.map(p => p.id));

        const formation = data.formation || {};
        const newTitolari = (formation.titolari || []).filter(p => rosaIds.has(p.id));
        const newPanchina = (formation.panchina || []).filter(p => rosaIds.has(p.id));

        await updateDoc(teamRef, {
            'formation.titolari': newTitolari,
            'formation.panchina': newPanchina
        });

        log(`${issue.teamName}: rimossi ${issue.invalidTitolari.length + issue.invalidPanchina.length} giocatori fantasma`, 'success');
    }
};

console.log("Modulo Admin-Data-Sync caricato.");
