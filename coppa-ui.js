//
// ====================================================================
// COPPA-UI.JS - Interfaccia Utente CoppaSeriA
// ====================================================================
//

window.CoppaUI = {

    /**
     * Renderizza il tabellone completo della coppa (Admin)
     * @param {Object} bracket - Tabellone
     * @param {HTMLElement} container - Contenitore DOM
     */
    renderAdminBracket(bracket, container) {
        if (!bracket) {
            container.innerHTML = `
                <div class="text-center p-6 bg-gray-800 rounded-lg border border-yellow-500">
                    <p class="text-yellow-400 text-xl mb-4">Nessun tabellone CoppaSeriA generato.</p>
                    <p class="text-gray-400">Clicca "Genera Calendario Coppa" per creare il tabellone.</p>
                </div>
            `;
            return;
        }

        const { COMPETITION_NAME } = window.CoppaConstants;

        let html = `
            <div class="bg-gray-800 rounded-lg border-2 border-purple-500 p-4">
                <h3 class="text-2xl font-bold text-purple-400 mb-4 text-center border-b border-purple-600 pb-2">
                    🏆 ${COMPETITION_NAME} - Tabellone
                </h3>
                <p class="text-gray-400 text-sm text-center mb-4">
                    Squadre: ${bracket.totalTeams} | Bye: ${bracket.numByes} |
                    Status: <span class="${bracket.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}">${bracket.status === 'completed' ? 'COMPLETATA' : 'IN CORSO'}</span>
                </p>
        `;

        // Mostra le squadre con bye
        if (bracket.teamsWithBye && bracket.teamsWithBye.length > 0) {
            html += `
                <div class="mb-4 p-3 bg-gray-700 rounded-lg border border-green-600">
                    <p class="text-green-400 font-bold mb-2">Squadre con Bye (passano direttamente al turno successivo):</p>
                    <div class="flex flex-wrap gap-2">
                        ${bracket.teamsWithBye.map(t => `
                            <span class="bg-green-800 text-green-200 px-3 py-1 rounded-full text-sm">
                                ${t.teamName} (${t.leaguePosition}°)
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Renderizza ogni turno
        bracket.rounds.forEach((round, roundIndex) => {
            const roundStatus = window.CoppaSchedule.isRoundCompleted(round) ? 'completed' : 'pending';
            const statusColor = roundStatus === 'completed' ? 'text-green-400' : 'text-yellow-400';
            const borderColor = roundStatus === 'completed' ? 'border-green-600' : 'border-purple-600';

            html += `
                <div class="mb-4 p-4 bg-gray-700 rounded-lg border ${borderColor}">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="text-xl font-bold text-purple-300">
                            ${round.roundName} ${round.isSingleMatch ? '(Partita Secca)' : '(Andata/Ritorno)'}
                        </h4>
                        <span class="${statusColor} font-bold">${roundStatus === 'completed' ? '✓ Completato' : '⏳ In attesa'}</span>
                    </div>
                    <div class="space-y-2">
            `;

            round.matches.forEach((match, matchIndex) => {
                html += this.renderMatchRow(match, round, roundIndex, matchIndex, true);
            });

            html += `
                    </div>
                </div>
            `;
        });

        // Vincitore finale
        if (bracket.winner) {
            html += `
                <div class="mt-6 p-4 bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-lg text-center">
                    <p class="text-2xl font-extrabold text-white">🏆 VINCITORE: ${bracket.winner.teamName}</p>
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;

        // Aggancia event listeners per i bottoni di simulazione
        this.attachSimulationListeners(container, bracket);
    },

    /**
     * Renderizza una riga di match
     */
    renderMatchRow(match, round, roundIndex, matchIndex, isAdmin = false) {
        const homeName = match.homeTeam ? match.homeTeam.teamName : 'TBD';
        const awayName = match.awayTeam ? match.awayTeam.teamName : 'TBD';

        let resultHtml = '';
        let actionHtml = '';

        if (match.isBye) {
            resultHtml = `<span class="text-green-400">3-0 (Bye)</span>`;
        } else if (!match.homeTeam || !match.awayTeam) {
            resultHtml = `<span class="text-gray-500">In attesa</span>`;
        } else if (round.isSingleMatch) {
            // Partita secca
            if (match.leg1Result) {
                const hasPenalties = match.leg1Result.includes('d.c.r.');
                resultHtml = `<span class="text-white font-bold">${match.leg1Result}</span>`;
                if (match.winner) {
                    resultHtml += ` <span class="text-green-400 text-sm">(Vince: ${match.winner.teamName})</span>`;
                }
            } else if (isAdmin) {
                actionHtml = `
                    <button class="btn-simulate-cup bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm"
                            data-round="${roundIndex}" data-match="${matchIndex}" data-leg="leg1">
                        Simula
                    </button>
                `;
            }
        } else {
            // Andata/Ritorno
            const leg1 = match.leg1Result || '-';
            const leg2 = match.leg2Result || '-';

            resultHtml = `
                <span class="text-gray-300 text-sm">
                    And: <span class="text-white">${leg1}</span> |
                    Rit: <span class="text-white">${leg2}</span>
                </span>
            `;

            if (match.winner) {
                resultHtml += ` <span class="text-green-400 text-sm">(Passa: ${match.winner.teamName})</span>`;
            }

            if (isAdmin && !match.winner) {
                if (!match.leg1Result) {
                    actionHtml = `
                        <button class="btn-simulate-cup bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm"
                                data-round="${roundIndex}" data-match="${matchIndex}" data-leg="leg1">
                            Simula Andata
                        </button>
                    `;
                } else if (!match.leg2Result) {
                    actionHtml = `
                        <button class="btn-simulate-cup bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm"
                                data-round="${roundIndex}" data-match="${matchIndex}" data-leg="leg2">
                            Simula Ritorno
                        </button>
                    `;
                }
            }
        }

        return `
            <div class="flex justify-between items-center p-2 bg-gray-800 rounded ${match.winner ? 'border-l-4 border-green-500' : ''}">
                <div class="flex-1">
                    <span class="text-white font-semibold">${homeName}</span>
                    <span class="text-gray-400 mx-2">vs</span>
                    <span class="text-white font-semibold">${awayName}</span>
                </div>
                <div class="flex items-center gap-3">
                    ${resultHtml}
                    ${actionHtml}
                </div>
            </div>
        `;
    },

    /**
     * Aggancia event listeners per i bottoni di simulazione
     */
    attachSimulationListeners(container, bracket) {
        const buttons = container.querySelectorAll('.btn-simulate-cup');

        buttons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const roundIndex = parseInt(e.target.dataset.round);
                const matchIndex = parseInt(e.target.dataset.match);
                const legType = e.target.dataset.leg;

                e.target.disabled = true;
                e.target.textContent = 'Simulazione...';

                try {
                    await window.CoppaMain.simulateMatch(roundIndex, matchIndex, legType);
                } catch (error) {
                    console.error('Errore simulazione coppa:', error);
                    alert('Errore nella simulazione: ' + error.message);
                }
            });
        });
    },

    /**
     * Renderizza la vista utente della coppa (tab nel calendario)
     * @param {Object} bracket - Tabellone
     * @param {string} teamId - ID della squadra dell'utente
     * @param {HTMLElement} container - Contenitore DOM
     */
    renderUserCupView(bracket, teamId, container) {
        if (!bracket) {
            container.innerHTML = `
                <div class="text-center p-6 bg-gray-800 rounded-lg">
                    <p class="text-gray-400">La CoppaSeriA non e ancora iniziata.</p>
                </div>
            `;
            return;
        }

        const teamMatches = window.CoppaSchedule.getTeamMatches(bracket, teamId);
        const hasBye = window.CoppaSchedule.teamHasBye(bracket, teamId);

        let html = `
            <div class="bg-gray-800 rounded-lg p-4">
                <h3 class="text-xl font-bold text-purple-400 mb-4">🏆 Le tue partite di Coppa</h3>
        `;

        if (hasBye) {
            html += `
                <div class="mb-4 p-3 bg-green-900 rounded-lg border border-green-600">
                    <p class="text-green-400">✓ Hai un <strong>BYE</strong> nel primo turno! Passi direttamente al turno successivo.</p>
                </div>
            `;
        }

        if (teamMatches.length === 0 && !hasBye) {
            html += `<p class="text-gray-400">Non sei iscritto alla CoppaSeriA.</p>`;
        } else {
            html += `<div class="space-y-3">`;

            teamMatches.forEach(match => {
                const opponent = match.isHome ? match.awayTeam : match.homeTeam;
                const opponentName = opponent ? opponent.teamName : 'TBD';
                const venue = match.isHome ? '🏠 Casa' : '✈️ Trasferta';

                let statusHtml = '';
                let resultClass = '';

                if (match.winner) {
                    const won = match.winner.teamId === teamId;
                    statusHtml = won ?
                        `<span class="text-green-400 font-bold">✓ PASSATO</span>` :
                        `<span class="text-red-400 font-bold">✗ ELIMINATO</span>`;
                    resultClass = won ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500';
                } else if (match.leg1Result || match.leg2Result) {
                    statusHtml = `<span class="text-yellow-400">In corso</span>`;
                } else {
                    statusHtml = `<span class="text-gray-400">Da giocare</span>`;
                }

                html += `
                    <div class="p-3 bg-gray-700 rounded-lg ${resultClass}">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-purple-300 font-bold">${match.roundName}</p>
                                <p class="text-white">${venue} vs ${opponentName}</p>
                                ${match.isSingleMatch ?
                                    `<p class="text-xs text-gray-400">Partita Secca</p>` :
                                    `<p class="text-xs text-gray-400">Andata: ${match.leg1Result || '-'} | Ritorno: ${match.leg2Result || '-'}</p>`
                                }
                            </div>
                            <div class="text-right">
                                ${statusHtml}
                                ${match.leg1Result ? `<p class="text-white font-bold">${match.leg1Result}</p>` : ''}
                                ${match.penalties ? `<p class="text-xs text-yellow-400">Rigori: ${match.penalties.homeGoals}-${match.penalties.awayGoals}</p>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        // Tabellone compatto
        html += this.renderCompactBracket(bracket);

        html += `</div>`;
        container.innerHTML = html;
    },

    /**
     * Renderizza un tabellone compatto con accordion per ogni fase
     */
    renderCompactBracket(bracket) {
        let html = `
            <div class="mt-6">
                <h4 class="text-lg font-bold text-purple-300 mb-3">Tabellone Completo</h4>
                <div class="space-y-2">
        `;

        bracket.rounds.forEach((round, roundIndex) => {
            const accordionId = `coppa-round-${roundIndex}`;
            const matchCount = round.matches.length;
            const completedCount = round.matches.filter(m => m.winner).length;
            const statusText = completedCount === matchCount
                ? '<span class="text-green-400 text-xs ml-2">Completato</span>'
                : (completedCount > 0
                    ? `<span class="text-yellow-400 text-xs ml-2">${completedCount}/${matchCount}</span>`
                    : '<span class="text-gray-500 text-xs ml-2">Da giocare</span>');

            html += `
                <div class="border border-purple-600 rounded-lg overflow-hidden">
                    <button onclick="window.CoppaUI.toggleRoundAccordion('${accordionId}')"
                            class="w-full p-3 bg-purple-900/50 hover:bg-purple-800/50 transition flex items-center justify-between text-left">
                        <span class="font-bold text-purple-300">${round.roundName}${statusText}</span>
                        <span id="${accordionId}-icon" class="text-purple-400 transition-transform">+</span>
                    </button>
                    <div id="${accordionId}" class="hidden p-3 bg-gray-800/50">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            `;

            round.matches.forEach(match => {
                const homeName = match.homeTeam ? match.homeTeam.teamName : 'TBD';
                const awayName = match.awayTeam ? match.awayTeam.teamName : 'TBD';
                const winnerBg = match.winner
                    ? (match.winner.teamId === (match.homeTeam?.teamId) ? 'bg-green-900/50 border-green-600' : 'border-gray-600')
                    : 'border-gray-600';
                const loserBg = match.winner
                    ? (match.winner.teamId === (match.awayTeam?.teamId) ? 'bg-green-900/50 border-green-600' : 'border-gray-600')
                    : 'border-gray-600';

                // Risultato
                let resultText = '';
                if (match.winner) {
                    if (match.singleMatchResult) {
                        resultText = `<span class="text-gray-400 text-[10px]">${match.singleMatchResult}</span>`;
                    } else if (match.leg1Result && match.leg2Result) {
                        resultText = `<span class="text-gray-400 text-[10px]">${match.leg1Result} / ${match.leg2Result}</span>`;
                    } else if (match.leg1Result) {
                        resultText = `<span class="text-gray-400 text-[10px]">${match.leg1Result}</span>`;
                    }
                    // Mostra rigori se presenti
                    if (match.penalties) {
                        resultText += `<br><span class="text-yellow-400 text-[10px]">⚽ Rigori: ${match.penalties.homeGoals}-${match.penalties.awayGoals}</span>`;
                    }
                }

                html += `
                    <div class="bg-gray-700 rounded text-xs overflow-hidden">
                        <div class="p-2 ${winnerBg} ${match.homeTeam ? 'text-white' : 'text-gray-500'} flex justify-between items-center">
                            <span class="truncate">${homeName}</span>
                            ${match.winner?.teamId === match.homeTeam?.teamId ? '<span class="text-green-400 ml-1">✓</span>' : ''}
                        </div>
                        <div class="p-2 border-t border-gray-600 ${loserBg} ${match.awayTeam ? 'text-white' : 'text-gray-500'} flex justify-between items-center">
                            <span class="truncate">${awayName}</span>
                            ${match.winner?.teamId === match.awayTeam?.teamId ? '<span class="text-green-400 ml-1">✓</span>' : ''}
                        </div>
                        ${resultText ? `<div class="p-1 bg-gray-800 text-center">${resultText}</div>` : ''}
                    </div>
                `;
            });

            html += `
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    },

    /**
     * Toggle accordion per le fasi della coppa
     */
    toggleRoundAccordion(accordionId) {
        const content = document.getElementById(accordionId);
        const icon = document.getElementById(`${accordionId}-icon`);
        if (!content) return;

        const isHidden = content.classList.contains('hidden');
        if (isHidden) {
            content.classList.remove('hidden');
            if (icon) icon.textContent = '−';
        } else {
            content.classList.add('hidden');
            if (icon) icon.textContent = '+';
        }
    },

    /**
     * Renderizza lo stato iscrizione coppa nella dashboard utente
     */
    renderCupRegistrationToggle(isCupParticipating, container) {
        const statusText = isCupParticipating ? 'ISCRITTO' : 'NON ISCRITTO';
        const statusColor = isCupParticipating ? 'text-green-400' : 'text-gray-400';
        const buttonText = isCupParticipating ? 'Ritirati dalla Coppa' : 'Iscriviti alla Coppa';
        const buttonColor = isCupParticipating ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500';

        return `
            <div class="p-4 bg-gray-800 rounded-lg border border-purple-500 mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-purple-400 font-bold">🏆 CoppaSeriA</p>
                        <p class="text-sm ${statusColor}">${statusText}</p>
                    </div>
                    <button id="btn-toggle-cup-participation" class="${buttonColor} text-white px-4 py-2 rounded-lg font-bold transition">
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza il pannello di simulazione completo (stile campionato)
     * @param {Object} bracket - Tabellone
     * @param {HTMLElement} container - Contenitore DOM
     */
    async renderSimulationPanel(bracket, container) {
        if (!bracket) {
            container.innerHTML = `
                <div class="text-center p-6 bg-gray-800 rounded-lg border border-yellow-500">
                    <p class="text-yellow-400 text-xl mb-4">Nessun tabellone CoppaSeriA generato.</p>
                    <p class="text-gray-400">Clicca "Genera Calendario Coppa" per creare il tabellone.</p>
                </div>
            `;
            return;
        }

        const roundInfo = await window.CoppaMain.getCurrentRoundInfo();
        const { COMPETITION_NAME } = window.CoppaConstants;

        // Header con stato coppa
        let html = `
            <div class="bg-gray-800 rounded-lg border-2 border-purple-500 p-4">
                <h3 class="text-2xl font-bold text-purple-400 mb-4 text-center border-b border-purple-600 pb-2">
                    🏆 ${COMPETITION_NAME} - Pannello Simulazione
                </h3>
        `;

        if (roundInfo.isCompleted) {
            // Coppa completata
            const rewardsApplied = bracket?.rewardsApplied || false;
            const rewardsBtnText = rewardsApplied ? '✅ Premi Assegnati (Riassegna)' : '💰 Assegna Premi Coppa';
            const rewardsBtnClass = rewardsApplied
                ? 'bg-gray-600 hover:bg-gray-500'
                : 'bg-green-600 hover:bg-green-500';

            html += `
                <div class="mb-4 p-4 bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-lg text-center">
                    <p class="text-2xl font-extrabold text-white mb-2">🏆 COPPA COMPLETATA</p>
                    <p class="text-xl text-white">Vincitore: ${roundInfo.winner?.teamName || 'N/A'}</p>
                    ${roundInfo.runnerUp ? `<p class="text-gray-200">2° posto: ${roundInfo.runnerUp.teamName}</p>` : ''}
                    ${rewardsApplied ? '<p class="text-green-300 text-sm mt-2">✓ Premi distribuiti automaticamente</p>' : ''}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-apply-cup-rewards" class="${rewardsBtnClass} text-white font-bold py-3 rounded-lg">
                        ${rewardsBtnText}
                    </button>
                    <button id="btn-reset-cup" class="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg">
                        🗑️ Elimina Tabellone
                    </button>
                </div>
            `;
        } else {
            // Coppa in corso
            const legLabel = roundInfo.isSingleMatch ? '' : (roundInfo.legType === 'leg1' ? ' (Andata)' : ' (Ritorno)');

            html += `
                <div class="mb-4 p-4 bg-gray-700 rounded-lg border border-purple-600">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div class="bg-gray-800 rounded p-3">
                            <p class="text-2xl font-bold text-purple-400">${roundInfo.roundName}</p>
                            <p class="text-xs text-gray-400">Turno Corrente</p>
                        </div>
                        <div class="bg-gray-800 rounded p-3">
                            <p class="text-2xl font-bold text-yellow-400">${roundInfo.pendingMatches}</p>
                            <p class="text-xs text-gray-400">Partite da Giocare</p>
                        </div>
                        <div class="bg-gray-800 rounded p-3">
                            <p class="text-2xl font-bold text-white">${roundInfo.totalMatches}</p>
                            <p class="text-xs text-gray-400">Partite Totali</p>
                        </div>
                        <div class="bg-gray-800 rounded p-3">
                            <p class="text-2xl font-bold ${roundInfo.isSingleMatch ? 'text-orange-400' : 'text-blue-400'}">
                                ${roundInfo.isSingleMatch ? 'Secca' : legLabel}
                            </p>
                            <p class="text-xs text-gray-400">Formato</p>
                        </div>
                    </div>
                </div>

                <!-- Bottoni azione -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <button id="btn-simulate-cup-round"
                            class="bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl transition"
                            ${roundInfo.pendingMatches === 0 ? 'disabled' : ''}>
                        ⚡ Simula ${roundInfo.isSingleMatch ? 'Tutto il Turno' : (roundInfo.legType === 'leg1' ? 'Tutte le Andate' : 'Tutti i Ritorni')}
                    </button>
                    <button id="btn-back-to-admin" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg">
                        ← Torna al Pannello Admin
                    </button>
                </div>

                <p id="cup-simulation-message" class="text-center mb-4 text-green-400 font-bold hidden"></p>
            `;

            // Lista partite del turno corrente
            const round = bracket.rounds[roundInfo.roundIndex];
            html += `
                <div class="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h4 class="text-lg font-bold text-purple-300 mb-3">
                        Partite - ${roundInfo.roundName}${legLabel}
                    </h4>
                    <div class="space-y-2">
            `;

            round.matches.forEach((match, matchIndex) => {
                if (!match.homeTeam || !match.awayTeam) return;
                if (match.isBye) return;

                const hasLeg1 = match.leg1Result !== null && match.leg1Result !== undefined;
                const hasLeg2 = match.leg2Result !== null && match.leg2Result !== undefined;
                const hasWinner = match.winner !== null;

                let statusClass = 'bg-red-900 border-red-700';
                let statusText = 'Da giocare';
                let canSimulate = true;

                if (roundInfo.isSingleMatch) {
                    if (hasLeg1) {
                        statusClass = 'bg-green-900 border-green-700';
                        statusText = 'Giocata';
                        canSimulate = false;
                    }
                } else {
                    if (hasWinner) {
                        statusClass = 'bg-green-900 border-green-700';
                        statusText = 'Completata';
                        canSimulate = false;
                    } else if (roundInfo.legType === 'leg1' && hasLeg1) {
                        statusClass = 'bg-yellow-900 border-yellow-700';
                        statusText = 'Andata OK';
                        canSimulate = false;
                    } else if (roundInfo.legType === 'leg2' && hasLeg2) {
                        statusClass = 'bg-green-900 border-green-700';
                        statusText = 'Ritorno OK';
                        canSimulate = false;
                    } else if (roundInfo.legType === 'leg2' && !hasLeg1) {
                        statusClass = 'bg-gray-800 border-gray-600';
                        statusText = 'Attesa andata';
                        canSimulate = false;
                    }
                }

                html += `
                    <div class="flex justify-between items-center p-3 rounded-lg border ${statusClass}">
                        <div class="flex-1">
                            <span class="text-white font-semibold">${match.homeTeam.teamName}</span>
                            <span class="text-gray-400 mx-2">vs</span>
                            <span class="text-white font-semibold">${match.awayTeam.teamName}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            ${!roundInfo.isSingleMatch ? `
                                <span class="text-xs text-gray-400">
                                    And: ${match.leg1Result || '-'} | Rit: ${match.leg2Result || '-'}
                                </span>
                            ` : `
                                <span class="text-white font-bold">${match.leg1Result || '-'}</span>
                            `}
                            ${match.winner ? `<span class="text-green-400 text-sm">✓ ${match.winner.teamName}</span>` : ''}
                            ${canSimulate ? `
                                <button class="btn-simulate-single-cup bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm"
                                        data-round="${roundInfo.roundIndex}" data-match="${matchIndex}" data-leg="${roundInfo.legType}">
                                    Simula
                                </button>
                            ` : `
                                <span class="text-xs ${hasWinner ? 'text-green-400' : 'text-yellow-400'}">${statusText}</span>
                            `}
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Squadre con bye
        if (bracket.teamsWithBye && bracket.teamsWithBye.length > 0) {
            html += `
                <div class="mt-4 p-3 bg-gray-700 rounded-lg border border-green-600">
                    <p class="text-green-400 font-bold mb-2">Squadre con Bye:</p>
                    <div class="flex flex-wrap gap-2">
                        ${bracket.teamsWithBye.map(t => `
                            <span class="bg-green-800 text-green-200 px-3 py-1 rounded-full text-sm">
                                ${t.teamName} (${t.leaguePosition}°)
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;

        // Attach event listeners
        this.attachSimulationPanelListeners(container, roundInfo);
    },

    /**
     * Aggancia event listeners per il pannello di simulazione
     */
    attachSimulationPanelListeners(container, roundInfo) {
        // Simula singola partita
        const singleButtons = container.querySelectorAll('.btn-simulate-single-cup');
        singleButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const roundIndex = parseInt(e.target.dataset.round);
                const matchIndex = parseInt(e.target.dataset.match);
                const legType = e.target.dataset.leg;

                e.target.disabled = true;
                e.target.textContent = 'Simulando...';

                try {
                    await window.CoppaMain.simulateMatch(roundIndex, matchIndex, legType);
                    // Ricarica il pannello
                    const bracket = await window.CoppaSchedule.loadCupSchedule();
                    this.renderSimulationPanel(bracket, container);
                } catch (error) {
                    console.error('Errore simulazione:', error);
                    alert('Errore: ' + error.message);
                    e.target.disabled = false;
                    e.target.textContent = 'Simula';
                }
            });
        });

        // Simula tutto il turno
        const roundBtn = document.getElementById('btn-simulate-cup-round');
        if (roundBtn && !roundBtn.disabled) {
            roundBtn.addEventListener('click', async () => {
                roundBtn.disabled = true;
                roundBtn.textContent = 'Simulazione in corso...';

                try {
                    const result = await window.CoppaMain.simulateCurrentRound();

                    const msgEl = document.getElementById('cup-simulation-message');
                    if (msgEl) {
                        msgEl.textContent = `✓ Simulate ${result.results.length} partite - ${result.roundName}`;
                        msgEl.classList.remove('hidden');
                    }

                    // Ricarica il pannello dopo un breve delay
                    setTimeout(async () => {
                        const bracket = await window.CoppaSchedule.loadCupSchedule();
                        this.renderSimulationPanel(bracket, container);
                    }, 1500);
                } catch (error) {
                    console.error('Errore simulazione turno:', error);
                    alert('Errore: ' + error.message);
                    roundBtn.disabled = false;
                    roundBtn.textContent = 'Simula Turno';
                }
            });
        }

        // Assegna premi (manuale)
        const rewardsBtn = document.getElementById('btn-apply-cup-rewards');
        if (rewardsBtn) {
            rewardsBtn.addEventListener('click', async () => {
                // Verifica se i premi sono gia stati assegnati
                const bracket = await window.CoppaSchedule.loadCupSchedule();
                let forceReapply = false;

                if (bracket?.rewardsApplied) {
                    const reapply = confirm(
                        '⚠️ I premi sono gia stati assegnati automaticamente!\n\n' +
                        'Vuoi riassegnarli comunque?\n' +
                        '(I premi verranno AGGIUNTI a quelli gia dati)'
                    );
                    if (!reapply) return;
                    forceReapply = true;
                } else {
                    if (!confirm('Assegnare i premi della CoppaSeriA?\n\n• 1 CSS al vincitore\n• 100 CS al 2°, 3°, 4° posto')) return;
                }

                rewardsBtn.disabled = true;
                rewardsBtn.textContent = 'Assegnazione...';

                try {
                    const result = await window.CoppaMain.applyCupRewards(forceReapply);

                    if (result.alreadyApplied) {
                        alert('I premi erano gia stati assegnati.');
                    } else {
                        alert(`Premi assegnati!\n\n🥇 ${result.winner?.teamName}\n🥈 ${result.runnerUp?.teamName}\n🥉 ${result.thirdPlace?.teamName}\n4° ${result.fourthPlace?.teamName}`);
                    }

                    const updatedBracket = await window.CoppaSchedule.loadCupSchedule();
                    this.renderSimulationPanel(updatedBracket, container);
                } catch (error) {
                    console.error('Errore assegnazione premi:', error);
                    alert('Errore: ' + error.message);
                    rewardsBtn.disabled = false;
                    rewardsBtn.textContent = '💰 Assegna Premi Coppa';
                }
            });
        }

        // Elimina tabellone
        const resetBtn = document.getElementById('btn-reset-cup');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (!confirm('Eliminare il tabellone della CoppaSeriA?\nQuesta azione non puo essere annullata.')) return;

                try {
                    await window.CoppaMain.terminateCupWithoutRewards();
                    this.renderSimulationPanel(null, container);
                } catch (error) {
                    console.error('Errore eliminazione:', error);
                    alert('Errore: ' + error.message);
                }
            });
        }

        // Torna al pannello admin
        const backBtn = document.getElementById('btn-back-to-admin');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.CoppaAdminPanel && window.CoppaAdminPanel.refresh) {
                    window.CoppaAdminPanel.refresh();
                } else {
                    // Fallback: ricarica tabellone standard
                    window.CoppaSchedule.loadCupSchedule().then(bracket => {
                        this.renderAdminBracket(bracket, container);
                    }).catch(error => {
                        console.error('[CoppaUI] Errore caricamento tabellone:', error);
                    });
                }
            });
        }
    }
};

console.log("Modulo Coppa-UI caricato.");
