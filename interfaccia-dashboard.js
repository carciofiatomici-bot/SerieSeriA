//
// ====================================================================
// MODULO INTERFACCIA-DASHBOARD.JS (Dashboard Utente, Statistiche, Prossima Partita)
// ====================================================================
//

window.InterfacciaDashboard = {

    /**
     * Aggiorna l'interfaccia utente con i dati della squadra.
     */
    updateTeamUI(teamName, teamDocId, logoUrl, isNew, elements) {
        const { DEFAULT_LOGO_URL } = window.InterfacciaConstants;
        const currentTeamData = window.InterfacciaCore.currentTeamData;
        
        elements.teamDashboardTitle.textContent = `Dashboard di ${teamName}`;
        elements.teamWelcomeMessage.textContent = isNew 
            ? `Benvenuto/a, Manager! La tua squadra '${teamName}' è stata appena creata. Inizia il calciomercato!`
            : `Bentornato/a, Manager di ${teamName}! Sei pronto per la prossima giornata?`;
        elements.teamFirestoreId.textContent = teamDocId;
        
        window.InterfacciaCore.currentTeamId = teamDocId;
        elements.teamLogoElement.src = logoUrl || DEFAULT_LOGO_URL;
        
        // Calcolo e aggiornamento statistiche
        const allPlayers = currentTeamData.players || [];
        const formationPlayers = window.getFormationPlayers(currentTeamData);
        
        const rosaLevel = window.calculateAverageLevel(allPlayers);
        const formationLevel = window.calculateAverageLevel(formationPlayers.map(p => ({ level: p.level })));
        
        elements.statRosaLevel.textContent = rosaLevel.toFixed(1);
        elements.statRosaCount.textContent = `(${allPlayers.length} giocatori)`;
        elements.statFormazioneLevel.textContent = formationLevel.toFixed(1);
        
        // Aggiorna i dati dell'allenatore
        const coach = currentTeamData.coach || { name: 'Allenatore Sconosciuto', level: 0 };
        elements.statCoachName.textContent = coach.name;
        elements.statCoachLevel.textContent = coach.level;

        // Carica la prossima partita
        this.loadNextMatch(elements);
        
        // Mostra la dashboard
        window.showScreen(elements.appContent);
    },
    
    /**
     * Ricarica solo i dati della squadra e aggiorna la UI.
     */
    async reloadTeamDataAndUpdateUI(elements) {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        if (!currentTeamId) return;

        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

        try {
            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, currentTeamId);
            const teamDoc = await getDoc(teamDocRef);
            
            if (teamDoc.exists()) {
                window.InterfacciaCore.currentTeamData = teamDoc.data();
                this.updateTeamUI(
                    window.InterfacciaCore.currentTeamData.teamName, 
                    teamDocRef.id, 
                    window.InterfacciaCore.currentTeamData.logoUrl, 
                    false, 
                    elements
                );
            } else {
                console.error("Errore: Impossibile trovare i dati della squadra corrente per l'aggiornamento.");
            }
        } catch (error) {
            console.error("Errore nel ricaricamento dati squadra:", error);
        }
    },

    /**
     * Carica e visualizza la prossima partita da giocare per la squadra corrente.
     */
    async loadNextMatch(elements) {
        const currentTeamId = window.InterfacciaCore.currentTeamId;
        const currentTeamData = window.InterfacciaCore.currentTeamData;
        
        if (!currentTeamId || !currentTeamData || !elements.nextMatchPreview) return;
        
        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const SCHEDULE_COLLECTION_PATH = window.InterfacciaConstants.getScheduleCollectionPath(appId);
        const SCHEDULE_DOC_ID = window.InterfacciaConstants.SCHEDULE_DOC_ID;
        
        elements.nextMatchPreview.innerHTML = `<p class="text-gray-400 font-semibold">Ricerca prossima sfida...</p>`;

        try {
            const scheduleDocRef = doc(window.db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            const scheduleDoc = await getDoc(scheduleDocRef);
            
            if (!scheduleDoc.exists() || !scheduleDoc.data().matches) {
                elements.nextMatchPreview.innerHTML = `<p class="text-red-400 font-semibold">Calendario non generato dall'Admin.</p>`;
                return;
            }
            
            const allRounds = scheduleDoc.data().matches;
            let nextMatch = null;

            for (const round of allRounds) {
                if (!round.matches) continue;

                const match = round.matches.find(m => 
                    m.result === null && (m.homeId === currentTeamId || m.awayId === currentTeamId)
                );
                if (match) {
                    nextMatch = match;
                    break;
                }
            }

            if (nextMatch) {
                const isHome = nextMatch.homeId === currentTeamId;
                const statusColor = isHome ? 'text-green-300' : 'text-red-300';
                const statusText = isHome ? 'IN CASA' : 'FUORI CASA';
                
                const homeLogo = window.getLogoHtml(nextMatch.homeId);
                const awayLogo = window.getLogoHtml(nextMatch.awayId);
                
                elements.nextMatchPreview.innerHTML = `
                    <p class="text-sm text-gray-300 font-semibold mb-1">PROSSIMA SFIDA (Giornata ${nextMatch.round} / ${nextMatch.type})</p>
                    <div class="flex justify-center items-center space-x-4">
                        <span class="text-xl font-extrabold text-white flex items-center">
                            ${homeLogo} <span class="ml-2">${nextMatch.homeName}</span>
                        </span>
                        <span class="text-2xl font-extrabold text-orange-400">VS</span>
                        <span class="text-xl font-extrabold text-white flex items-center">
                            <span class="mr-2">${nextMatch.awayName}</span> ${awayLogo}
                        </span>
                    </div>
                    <p class="text-sm font-semibold mt-1 ${statusColor}">Giochi ${statusText}</p>
                `;
            } else {
                elements.nextMatchPreview.innerHTML = `<p class="text-green-400 font-semibold">Hai giocato tutte le partite! Campionato concluso.</p>`;
            }

        } catch (error) {
            console.error("Errore nel caricamento prossima partita:", error);
            elements.nextMatchPreview.innerHTML = `<p class="text-red-400 font-semibold">Errore nel caricamento sfida. Controlla la console.</p>`;
        }
    },

    /**
     * Carica e visualizza la classifica completa.
     */
    async loadLeaderboard() {
        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const LEADERBOARD_COLLECTION_PATH = window.InterfacciaConstants.getLeaderboardCollectionPath(appId);
        const LEADERBOARD_DOC_ID = window.InterfacciaConstants.LEADERBOARD_DOC_ID;
        
        const leaderboardDocRef = doc(window.db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);

        const leaderboardDisplayContainer = document.getElementById('leaderboard-content') 
            ? document.getElementById('leaderboard-content').querySelector('.football-box > div:not([id])') 
            : null;
        if (!leaderboardDisplayContainer) return;

        leaderboardDisplayContainer.innerHTML = `
            <p class="text-white font-semibold text-center">Caricamento Classifica...</p>
            <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-blue-500 text-center shadow-lg">
                 <p class="text-gray-400">Recupero dati da Firestore.</p>
            </div>
        `;

        try {
            await window.fetchAllTeamLogos();

            const leaderboardDoc = await getDoc(leaderboardDocRef);
            
            if (!leaderboardDoc.exists() || !leaderboardDoc.data().standings || leaderboardDoc.data().standings.length === 0) {
                leaderboardDisplayContainer.innerHTML = `
                    <p class="text-white font-semibold text-center mb-4">Classifica non disponibile.</p>
                    <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center shadow-lg">
                        <p class="text-red-400 font-semibold">Simula la prima giornata per generare la classifica.</p>
                    </div>
                `;
                return;
            }

            const standings = leaderboardDoc.data().standings;
            let leaderboardHtml = `
                <h3 class="text-2xl font-extrabold text-blue-400 mb-4 text-center">Classifica Generale</h3>
                <div class="bg-gray-800 rounded-lg overflow-x-auto shadow-xl">
                    <table class="min-w-full divide-y divide-gray-700">
                        <thead class="bg-blue-600 text-white">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">#</th>
                                <th class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Squadra</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">Pti</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">G</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">V</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">N</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">P</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">GF</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">GS</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">DG</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-700 text-white">
                            ${standings.map((team, index) => `
                                <tr class="${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-600'} hover:bg-gray-500 transition duration-150">
                                    <td class="px-3 py-2 whitespace-nowrap text-sm font-medium">${index + 1}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm font-semibold flex items-center">
                                        ${window.getLogoHtml(team.teamId)} <span class="ml-2">${team.teamName}</span>
                                    </td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-extrabold text-yellow-300">${team.points}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center">${team.played}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center text-green-400">${team.wins}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-300">${team.draws}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center text-red-400">${team.losses}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center">${team.goalsFor}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center">${team.goalsAgainst}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-bold">${team.goalsFor - team.goalsAgainst}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            leaderboardDisplayContainer.innerHTML = leaderboardHtml;

        } catch (error) {
            console.error("Errore nel caricamento della classifica:", error);
            leaderboardDisplayContainer.innerHTML = `
                <p class="text-white font-semibold text-center mb-4">Errore di Connessione</p>
                <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center shadow-lg">
                    <p class="text-red-400">Impossibile caricare la classifica. Controlla la tua connessione.</p>
                </div>
            `;
        }
    },

    /**
     * Carica e visualizza il calendario completo delle partite.
     */
    async loadSchedule() {
        const { doc, getDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const SCHEDULE_COLLECTION_PATH = window.InterfacciaConstants.getScheduleCollectionPath(appId);
        const SCHEDULE_DOC_ID = window.InterfacciaConstants.SCHEDULE_DOC_ID;
        
        const scheduleDocRef = doc(window.db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);

        const scheduleDisplayContainer = document.getElementById('schedule-content') 
            ? document.getElementById('schedule-content').querySelector('.football-box > div:not([id])') 
            : null;
        if (!scheduleDisplayContainer) return;

        scheduleDisplayContainer.innerHTML = `
            <p class="text-white font-semibold">Caricamento Calendario...</p>
            <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-teal-500 text-center shadow-lg">
                 <p class="text-gray-400">Recupero dati da Firestore.</p>
            </div>
        `;

        try {
            await window.fetchAllTeamLogos();

            const scheduleDoc = await getDoc(scheduleDocRef);
            
            if (!scheduleDoc.exists() || !scheduleDoc.data().matches || scheduleDoc.data().matches.length === 0) {
                scheduleDisplayContainer.innerHTML = `
                    <p class="text-white font-semibold text-center mb-4">Nessun Calendario Disponibile.</p>
                    <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center shadow-lg">
                        <p class="text-red-400 font-semibold">Il calendario deve essere generato dall'Admin nell'area Impostazioni Campionato.</p>
                    </div>
                `;
                return;
            }

            const scheduleData = scheduleDoc.data().matches;
            const totalRounds = scheduleData.length > 0 ? scheduleData[scheduleData.length - 1].round : 0;

            let scheduleHtml = `<p class="text-white font-semibold text-xl mb-4">Calendario Completo: ${totalRounds} Giornate</p>`;

            scheduleData.forEach(roundData => {
                const roundNum = roundData.round;
                const roundType = roundData.matches[0].type;
                const roundBg = roundType === 'Ritorno' ? 'bg-teal-700' : 'bg-gray-700';

                scheduleHtml += `
                    <div class="mb-6 p-4 rounded-lg ${roundBg} border border-teal-500 shadow-md">
                        <h4 class="font-bold text-lg text-yellow-300 border-b border-gray-600 pb-1">
                            GIORNATA ${roundNum} (${roundType})
                        </h4>
                        <ul class="mt-2 space-y-1 text-white">
                            ${roundData.matches.map(match => `
                                <li class="text-sm p-1 rounded hover:bg-gray-600 transition flex items-center justify-between">
                                    <span class="flex items-center">
                                        ${window.getLogoHtml(match.homeId)} <span class="ml-2">${match.homeName}</span>
                                    </span> 
                                    ${match.result ? `<span class="font-bold text-red-300">${match.result}</span>` : '<span class="text-gray-400">vs</span>'} 
                                    <span class="flex items-center text-right">
                                        <span class="mr-2">${match.awayName}</span> ${window.getLogoHtml(match.awayId)}
                                    </span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            });

            scheduleDisplayContainer.innerHTML = scheduleHtml;

        } catch (error) {
            console.error("Errore nel caricamento del calendario:", error);
            scheduleDisplayContainer.innerHTML = `
                <p class="text-white font-semibold text-center mb-4">Errore di Connessione</p>
                <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center shadow-lg">
                    <p class="text-red-400">Impossibile caricare il calendario. Controlla la tua connessione.</p>
                </div>
            `;
        }
    }
};

// Esponi le funzioni globalmente per compatibilità con admin.js
window.loadSchedule = () => window.InterfacciaDashboard.loadSchedule();
window.loadLeaderboard = () => window.InterfacciaDashboard.loadLeaderboard();

console.log("✅ Modulo interfaccia-dashboard.js caricato.");