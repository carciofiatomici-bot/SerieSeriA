//
// ====================================================================
// GESTIONESQUADRE-ROSA.JS - Gestione Rosa e Licenziamenti
// ====================================================================
//

window.GestioneSquadreRosa = {

    /**
     * Renderizza il pannello di gestione rosa
     * @param {Object} teamData - Dati della squadra
     * @param {Object} context - Contesto con riferimenti DOM e funzioni
     */
    render(teamData, context) {
        const { squadraMainTitle, squadraSubtitle, squadraToolsContainer, currentTeamId, loadTeamDataFromFirestore } = context;
        const { displayMessage } = window.GestioneSquadreUtils;

        squadraMainTitle.textContent = "Gestione Rosa";
        squadraSubtitle.textContent = `Budget Rimanente: ${teamData.budget} Crediti Seri | Giocatori in rosa: ${window.getPlayerCountExcludingIcona(teamData.players)}/${window.InterfacciaConstants.MAX_ROSA_PLAYERS} (+ Icona)`;

        // Separa giocatori per ruolo
        const players = teamData.players || [];
        const icona = players.find(p => (p.abilities && p.abilities.includes('Icona')) || (teamData.iconaId && p.id === teamData.iconaId));
        const portieri = players.filter(p => p.role === 'P' && p !== icona).sort((a, b) => (b.level || 1) - (a.level || 1));
        const difensori = players.filter(p => p.role === 'D' && p !== icona).sort((a, b) => (b.level || 1) - (a.level || 1));
        const centrocampisti = players.filter(p => p.role === 'C' && p !== icona).sort((a, b) => (b.level || 1) - (a.level || 1));
        const attaccanti = players.filter(p => p.role === 'A' && p !== icona).sort((a, b) => (b.level || 1) - (a.level || 1));

        const roleColors = {
            icona: { border: 'border-yellow-500', bg: 'bg-yellow-900 bg-opacity-20', text: 'text-yellow-400', icon: '👑' },
            P: { border: 'border-blue-500', bg: 'bg-blue-900 bg-opacity-20', text: 'text-blue-400', icon: '🧤' },
            D: { border: 'border-green-500', bg: 'bg-green-900 bg-opacity-20', text: 'text-green-400', icon: '🛡️' },
            C: { border: 'border-purple-500', bg: 'bg-purple-900 bg-opacity-20', text: 'text-purple-400', icon: '⚽' },
            A: { border: 'border-red-500', bg: 'bg-red-900 bg-opacity-20', text: 'text-red-400', icon: '👟' }
        };

        const renderRoleSection = (role, title, playersList, colors) => {
            if (playersList.length === 0 && role !== 'icona') return '';
            if (role === 'icona' && !icona) return '';

            const playersToRender = role === 'icona' ? [icona] : playersList;

            return `
                <div class="role-section mb-4 ${colors.bg} rounded-lg border ${colors.border} overflow-hidden">
                    <div class="role-section-header flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                         data-role="${role}">
                        <div class="flex items-center gap-2">
                            <span class="role-toggle-icon text-gray-400 transition-transform duration-200" style="transform: rotate(90deg);">▶</span>
                            <span class="${colors.text} font-bold text-lg">${colors.icon} ${title}</span>
                            <span class="text-gray-400 text-sm">(${playersToRender.length})</span>
                        </div>
                    </div>
                    <div class="role-section-content p-3 pt-0 space-y-2">
                        ${playersToRender.map(player => this.renderPlayerCard(player, teamData)).join('')}
                    </div>
                </div>
            `;
        };

        squadraToolsContainer.innerHTML = `
            <!-- BOTTONE ALLENAMENTO (centrato) -->
            <div class="flex justify-center mb-6">
                <button id="btn-training-rosa"
                        class="bg-gradient-to-r from-green-600 to-emerald-500 text-white font-extrabold py-3 px-8 rounded-lg shadow-xl hover:from-green-500 hover:to-emerald-400 transition duration-150 transform hover:scale-[1.02] flex items-center justify-center gap-2">
                    <span>⚽</span> Allenamento
                </button>
            </div>

            <div class="bg-gray-700 p-6 rounded-lg border border-green-500 relative">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-2xl font-bold text-green-400">I Tuoi Calciatori</h3>
                    <button id="btn-toggle-licenzia"
                            class="text-gray-400 hover:text-white hover:bg-gray-600 px-2 py-1 rounded transition text-xl"
                            title="Mostra/Nascondi opzioni licenziamento">⚙️</button>
                </div>
                <div id="player-list-message" class="text-center mb-4 text-green-500"></div>

                <div id="player-list">
                    ${players.length === 0
                        ? '<p class="text-gray-400">Nessun calciatore in rosa. Vai al Draft per acquistarne!</p>'
                        : `
                            ${renderRoleSection('icona', 'Icona', [], roleColors.icona)}
                            ${renderRoleSection('P', 'Portieri', portieri, roleColors.P)}
                            ${renderRoleSection('D', 'Difensori', difensori, roleColors.D)}
                            ${renderRoleSection('C', 'Centrocampisti', centrocampisti, roleColors.C)}
                            ${renderRoleSection('A', 'Attaccanti', attaccanti, roleColors.A)}
                        `
                    }
                </div>
            </div>
        `;

        this.attachEventListeners(context);
    },

    /**
     * Renderizza una singola card giocatore
     */
    renderPlayerCard(player, teamData) {
        const refundCost = player.cost > 0 ? Math.floor(player.cost / 2) : 0;
        const isCaptain = player.isCaptain;
        // Verifica se è Icona: tramite abilities OPPURE tramite iconaId nel teamData
        const isIcona = (player.abilities && player.abilities.includes('Icona')) ||
                        (teamData.iconaId && player.id === teamData.iconaId);
        const captainMarker = isCaptain ? ' Ⓒ' : '';

        // Marker Icona
        let iconaMarker = '';

        if (isIcona) {
            iconaMarker = ' <span class="bg-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full text-xs font-extrabold">ICONA</span>';
        }

        // Marker Infortunio
        let injuryMarker = '';
        const isInjured = window.Injuries?.isPlayerInjured(player);
        if (isInjured) {
            const remaining = window.Injuries.getRemainingMatches(player);
            injuryMarker = ` <span class="bg-red-800 text-red-300 px-2 py-0.5 rounded-full text-xs font-extrabold" title="Infortunato per ${remaining} partite">🏥 ${remaining}</span>`;
        }

        // Marker Giocatore Base (immune agli infortuni)
        let basePlayerMarker = '';
        const isBasePlayer = player.isBase ||
                            player.isBasePlayer ||
                            (player.name?.includes('Base')) ||
                            ((player.level || 1) === 1 && (player.cost || 0) === 0 && !isIcona);
        if (isBasePlayer) {
            basePlayerMarker = ' <span class="bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full text-xs font-semibold" title="Giocatore Base - immune agli infortuni">🌱</span>';
        }

        // Marker Giocatore Serio (livello massimo 10)
        let seriousPlayerMarker = '';
        if (player.isSeriousPlayer) {
            seriousPlayerMarker = ' <span class="bg-orange-700 text-orange-200 px-2 py-0.5 rounded-full text-xs font-semibold" title="Giocatore Serio - livello massimo 10">🎯</span>';
        }

        // Marker Contratto
        const contractBadge = window.Contracts?.renderContractBadge(player, teamData) || '';

        // Colore nome basato sulla forma del giocatore
        const formData = teamData.playersFormStatus?.[player.id];
        const formModifier = formData?.mod ?? 0;
        let formColorClass = 'text-white'; // neutro
        if (formModifier > 0) {
            formColorClass = 'text-green-400'; // in forma
        } else if (formModifier < 0) {
            formColorClass = 'text-red-400'; // fuori forma
        }
        // Il capitano ha sempre il colore arancione che sovrascrive la forma
        const nameColorClass = isCaptain ? 'text-orange-400 font-extrabold' : `${formColorClass} font-semibold`;

        // Badge tipologia (PlayerTypeBadge)
        const playerType = player.type || 'N/A';
        const typeBadgeHtml = window.GestioneSquadreConstants.getTypeBadgeHtml(playerType, 'sm');

        // Abilita (mostra tutte, inclusa Icona e abilita uniche in dorato)
        const playerAbilities = player.abilities || [];
        const UNIQUE_ABILITIES = ['Icona', "Fatto d'acciaio", "L'uomo in piu", 'Tiro Dritto', 'Avanti un altro', 'Contrasto di gomito', 'Calcolo delle probabilita', 'Amici di panchina', 'Continua a provare', 'Stazionario', 'Osservatore', 'Relax', 'Scheggia impazzita', 'Assist-man'];
        const abilitiesHtml = playerAbilities.length > 0
            ? `<p class="text-xs text-indigo-300 mt-1">Abilita: ${playerAbilities.map(a => UNIQUE_ABILITIES.includes(a) ? `<span class="text-yellow-400 font-bold">${a}</span>` : a).join(', ')}</p>`
            : `<p class="text-xs text-gray-500 mt-1">Abilita: Nessuna</p>`;

        // Potenziale basato su secretMaxLevel o tipo giocatore (solo per giocatori normali, non icone)
        let potenzialHtml = '';
        if (!isIcona) {
            // Determina il livello massimo effettivo
            let maxLvl = null;

            // Giocatore Serio: max 10
            if (player.isSeriousPlayer) {
                maxLvl = 10;
            }
            // Giocatore Base: max 5
            else if (isBasePlayer) {
                maxLvl = 5;
            }
            // Giocatore normale con secretMaxLevel
            else if (player.secretMaxLevel !== undefined && player.secretMaxLevel !== null) {
                maxLvl = player.secretMaxLevel;
            }

            if (maxLvl !== null) {
                let potenziale = '';
                let potenzialColor = '';
                if (maxLvl <= 10) {
                    potenziale = 'Dilettante';
                    potenzialColor = 'text-gray-400';
                } else if (maxLvl <= 15) {
                    potenziale = 'Professionista';
                    potenzialColor = 'text-green-400';
                } else if (maxLvl <= 19) {
                    potenziale = 'Fuoriclasse';
                    potenzialColor = 'text-blue-400';
                } else if (maxLvl <= 24) {
                    potenziale = 'Leggenda';
                    potenzialColor = 'text-purple-400';
                } else {
                    potenziale = 'GOAT';
                    potenzialColor = 'text-yellow-400';
                }
                // Mostra livello max segreto se admin ha il flag attivo
                const showSecretLevel = window.FeatureFlags?.isEnabled('adminViewSecretMaxLevel');
                const secretLevelText = showSecretLevel ? ` <span class="text-purple-300">(Max: ${maxLvl})</span>` : '';
                potenzialHtml = `<p class="text-xs mt-1">Potenziale: <span class="${potenzialColor} font-semibold">${potenziale}</span>${secretLevelText}</p>`;
            }
        }

        // Barra EXP
        let expBarHtml = '';
        if (window.PlayerExp && window.PlayerExpUI) {
            // Migra il giocatore se necessario
            if (player.exp === undefined) {
                window.PlayerExp.migratePlayer(player);
            }
            expBarHtml = `<div class="mt-2 w-full max-w-xs">${window.PlayerExpUI.renderExpBar(player, { showText: true, size: 'small' })}</div>`;
        }

        // Equipaggiamento (solo se feature flag attivo)
        let equipmentHtml = '';
        if (window.FeatureFlags?.isEnabled('marketObjects')) {
            const equipment = player.equipment || {};
            const slots = ['cappello', 'maglia', 'guanti', 'parastinchi', 'scarpini'];
            const icons = { cappello: '🧢', maglia: '👕', guanti: '🧤', parastinchi: '🦵', scarpini: '👟' };
            const equippedCount = slots.filter(s => equipment[s]).length;

            equipmentHtml = `
                <div class="mt-2 flex items-center gap-2">
                    <span class="text-xs text-gray-400">Equip:</span>
                    <div class="flex gap-1">
                        ${slots.map(slot => `
                            <span class="text-sm ${equipment[slot] ? 'opacity-100' : 'opacity-30'}" title="${equipment[slot]?.name || 'Nessun ' + slot}">${icons[slot]}</span>
                        `).join('')}
                    </div>
                    <button data-player-id="${player.id}"
                            data-player-name="${player.name}"
                            data-action="open-equipment"
                            class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition">
                        ${equippedCount > 0 ? `Modifica (${equippedCount}/5)` : 'Equipaggia'}
                    </button>
                </div>
            `;
        }

        // Pulsante Capitano
        const captainButton = isCaptain
            ? `<button class="bg-gray-500 text-gray-300 text-sm px-4 py-2 rounded-lg cursor-default shadow-md" disabled>Capitano Attuale</button>`
            : `<button data-player-id="${player.id}"
                    data-player-name="${player.name}"
                    data-action="assign-captain"
                    class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-150 shadow-md">
                Nomina Capitano
            </button>`;

        // Pulsante Prolunga Contratto (solo se sistema contratti attivo e giocatore soggetto)
        let contractButton = '';
        if (window.Contracts?.isEnabled() && window.Contracts.isSubjectToContract(player, teamData)) {
            const extensionCost = window.Contracts.calculateExtensionCost(player);
            const currentContract = player.contract || 1;
            const hasTimer = window.Contracts.hasExpireTimer(player);
            contractButton = `
                <button data-player-id="${player.id}"
                        data-player-name="${player.name}"
                        data-extension-cost="${extensionCost}"
                        data-current-contract="${currentContract}"
                        data-action="extend-contract"
                        class="bg-teal-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-teal-500 transition duration-150 shadow-md flex items-center gap-1">
                    📝 Prolunga (${extensionCost} CS)
                </button>
            `;
        }

        // Bottone Licenziamento (nascosto di default, visibile tramite toggle ⚙️)
        const isLicenziabile = !isIcona;
        const licenziaButton = `
            <button data-player-id="${player.id}"
                    data-original-cost="${player.cost}"
                    data-refund-cost="${refundCost}"
                    data-player-name="${player.name}"
                    data-action="licenzia"
                    class="licenzia-btn hidden bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition duration-150 shadow-md
                    ${isLicenziabile ? 'hover:bg-red-700' : 'opacity-50 cursor-not-allowed'}"
                    ${isLicenziabile ? '' : 'disabled'}>
                Licenzia (Rimborso: ${refundCost} CS)
            </button>
        `;

        // Bottone Allenamento EXP (se feature abilitata) - cooldown per ruolo
        let trainingExpButton = '';
        if (window.FeatureFlags?.isEnabled('trainingExp')) {
            const isInCooldown = window.TrainingExpMinigame?.isInCooldown(player.role);
            const testMode = window.FeatureFlags?.isEnabled('trainingExpTestMode');

            if (isInCooldown && !testMode) {
                // Mostra countdown invece del bottone (per questo ruolo)
                const countdown = window.TrainingExpMinigame?.getCooldownCountdown() || '...';
                trainingExpButton = `
                    <div class="text-xs text-orange-400 bg-orange-900 bg-opacity-30 px-3 py-2 rounded-lg border border-orange-600 flex items-center gap-1">
                        <span>⏳</span> ${player.role} gia allenato (${countdown})
                    </div>
                `;
            } else {
                trainingExpButton = `
                    <button data-player-id="${player.id}"
                            data-player-name="${player.name}"
                            data-player-role="${player.role}"
                            data-action="training-exp"
                            class="bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-sm px-3 py-2 rounded-lg hover:from-purple-500 hover:to-indigo-400 transition duration-150 shadow-md flex items-center gap-1">
                        <span>🎮</span> Allenamento EXP${testMode ? ' (Test)' : ''}
                    </button>
                `;
            }
        }

        // Border rosso se infortunato
        const borderClass = isInjured ? 'border-red-500' : 'border-green-700';

        // Bottone statistiche (se feature attiva) - inline dopo il nome
        const statsButton = window.FeatureFlags?.isEnabled('playerStats')
            ? `<button data-action="view-player-stats"
                       data-player-id="${player.id}"
                       data-player-name="${player.name}"
                       data-player-role="${player.role}"
                       class="inline-flex items-center justify-center w-5 h-5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded ml-1"
                       title="Statistiche ${player.name}">📊</button>`
            : '';

        return `
            <div class="bg-gray-800 rounded-lg border ${borderClass} overflow-hidden">
                <!-- Header cliccabile -->
                <div class="player-card-header flex items-center p-3 sm:p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                     data-player-id="${player.id}">
                    <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span class="player-toggle-icon text-gray-400 transition-transform duration-200">▶</span>
                        <span class="${nameColorClass} inline-flex items-center" title="Forma: ${formModifier >= 0 ? '+' : ''}${formModifier}">${player.name}${isIcona ? ' 👑' : ''}${captainMarker}${statsButton}</span>
                        ${iconaMarker}
                        ${basePlayerMarker}
                        ${seriousPlayerMarker}
                        ${injuryMarker}
                        <span class="text-yellow-400">(${player.role})</span>
                        ${typeBadgeHtml}
                        <span class="text-gray-500 text-sm ml-2">Lv.${player.level || player.currentLevel || 1}</span>
                        ${contractBadge}
                    </div>
                </div>
                <!-- Contenuto espandibile (chiuso di default) -->
                <div class="player-card-content hidden px-4 pb-4 border-t border-gray-700">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3">
                        <div class="mb-3 sm:mb-0 sm:w-1/2">
                            <p class="text-sm text-gray-400">Acquistato per: ${player.cost || 0} CS</p>
                            ${abilitiesHtml}
                            ${potenzialHtml}
                            ${expBarHtml}
                            ${equipmentHtml}
                        </div>
                        <div class="flex flex-col w-full sm:w-auto items-end gap-2">
                            <div class="flex flex-row items-center gap-2">
                                ${trainingExpButton}
                                ${captainButton}
                            </div>
                            <div class="flex flex-row items-center gap-2">
                                ${contractButton}
                            </div>
                            ${licenziaButton}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Collega gli event listener
     */
    attachEventListeners(context) {
        const { currentTeamId, loadTeamDataFromFirestore, currentTeamData, db, firestoreTools, TEAMS_COLLECTION_PATH, DRAFT_PLAYERS_COLLECTION_PATH, MARKET_PLAYERS_COLLECTION_PATH } = context;
        const { displayMessage } = window.GestioneSquadreUtils;

        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.addEventListener('click', (e) => {
                const target = e.target;

                // Toggle espansione sezione ruolo (click su header sezione)
                const roleHeader = target.closest('.role-section-header');
                if (roleHeader) {
                    const section = roleHeader.closest('.role-section');
                    const content = section.querySelector('.role-section-content');
                    const icon = roleHeader.querySelector('.role-toggle-icon');

                    if (content && icon) {
                        content.classList.toggle('hidden');
                        icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
                    }
                    return;
                }

                // Toggle espansione card giocatore (click su header)
                const playerHeader = target.closest('.player-card-header');
                if (playerHeader && !target.closest('button') && !target.closest('[data-action]')) {
                    const card = playerHeader.closest('.relative');
                    const content = card.querySelector('.player-card-content');
                    const icon = playerHeader.querySelector('.player-toggle-icon');

                    if (content && icon) {
                        content.classList.toggle('hidden');
                        icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
                    }
                    return;
                }

                if (target.dataset.action === 'licenzia' || target.dataset.action === 'confirm-licenzia') {
                    this.handleRosaAction(e, context);
                } else if (target.dataset.action === 'assign-captain') {
                    this.handleCaptainAssignment(target.dataset.playerId, target.dataset.playerName, context);
                } else if (target.dataset.action === 'open-equipment') {
                    window.EquipmentUI?.showEquipmentModal(target.dataset.playerId, target.dataset.playerName, context);
                } else if (target.dataset.action === 'training-exp') {
                    this.handleTrainingExp(target.dataset.playerId, target.dataset.playerName, target.dataset.playerRole, context);
                } else if (target.dataset.action === 'extend-contract') {
                    this.handleExtendContract(target.dataset.playerId, target.dataset.playerName, parseInt(target.dataset.extensionCost), context);
                } else if (target.closest('[data-action="view-player-stats"]')) {
                    const container = target.closest('[data-action="view-player-stats"]');
                    if (container && window.FeatureFlags?.isEnabled('playerStats')) {
                        const playerId = container.dataset.playerId;
                        const playerName = container.dataset.playerName;
                        const player = currentTeamData.players.find(p => p.id === playerId);
                        if (player && window.PlayerStatsAdvanced) {
                            window.PlayerStatsAdvanced.open(player, currentTeamId);
                        }
                    }
                }
            });
        }

        // Bottone Allenamento nella Gestione Rosa
        const btnTrainingRosa = document.getElementById('btn-training-rosa');
        if (btnTrainingRosa) {
            btnTrainingRosa.addEventListener('click', () => {
                // Verifica se l'allenamento e' abilitato
                if (!window.FeatureFlags?.isEnabled('training')) {
                    if (window.Toast) window.Toast.info("Allenamento non disponibile");
                    return;
                }
                if (window.Training) {
                    window.Training.openPanel();
                } else {
                    if (window.Toast) window.Toast.error("Sistema Allenamento non disponibile");
                }
            });
        }

        // Bottone Toggle Licenziamento (⚙️)
        const btnToggleLicenzia = document.getElementById('btn-toggle-licenzia');
        if (btnToggleLicenzia) {
            btnToggleLicenzia.addEventListener('click', () => {
                const licenziaButtons = document.querySelectorAll('.licenzia-btn');
                const isHidden = licenziaButtons[0]?.classList.contains('hidden');

                licenziaButtons.forEach(btn => {
                    if (isHidden) {
                        btn.classList.remove('hidden');
                    } else {
                        btn.classList.add('hidden');
                    }
                });

                // Cambia aspetto del bottone toggle per indicare stato
                if (isHidden) {
                    btnToggleLicenzia.classList.add('text-red-400', 'bg-red-900', 'bg-opacity-30');
                    btnToggleLicenzia.classList.remove('text-gray-400');
                } else {
                    btnToggleLicenzia.classList.remove('text-red-400', 'bg-red-900', 'bg-opacity-30');
                    btnToggleLicenzia.classList.add('text-gray-400');
                }
            });
        }
    },

    /**
     * Gestisce l'assegnazione del Capitano
     */
    async handleCaptainAssignment(newCaptainId, newCaptainName, context) {
        const { db, firestoreTools, TEAMS_COLLECTION_PATH, currentTeamId, currentTeamData, loadTeamDataFromFirestore } = context;
        const { displayMessage } = window.GestioneSquadreUtils;
        const msgContainerId = 'player-list-message';

        displayMessage(msgContainerId, `Tentativo di nominare ${newCaptainName} Capitano...`, 'info');

        try {
            const { doc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            const updatedPlayers = currentTeamData.players.map(player => {
                const isNewCaptain = player.id === newCaptainId;
                return {
                    ...player,
                    isCaptain: isNewCaptain,
                };
            });

            await updateDoc(teamDocRef, {
                players: updatedPlayers,
                formation: {
                    ...currentTeamData.formation,
                    titolari: currentTeamData.formation.titolari.map(p => ({
                        ...p,
                        isCaptain: p.id === newCaptainId
                    })),
                    panchina: currentTeamData.formation.panchina.map(p => ({
                        ...p,
                        isCaptain: p.id === newCaptainId
                    })),
                }
            });

            window.InterfacciaCore.currentTeamData.players = updatedPlayers;
            currentTeamData.players = updatedPlayers;

            displayMessage(msgContainerId, `${newCaptainName} è il nuovo Capitano!`, 'success');

            // Ricarica solo la pagina Gestione Rosa senza tornare alla dashboard
            loadTeamDataFromFirestore(currentTeamId, 'rosa');

        } catch (error) {
            console.error("Errore nell'assegnazione del Capitano:", error);
            displayMessage(msgContainerId, `Errore: Impossibile nominare ${newCaptainName} Capitano. ${error.message}`, 'error');
        }
    },

    /**
     * Gestisce il prolungamento del contratto di un giocatore
     */
    async handleExtendContract(playerId, playerName, extensionCost, context) {
        const { currentTeamId, currentTeamData, loadTeamDataFromFirestore } = context;
        const { displayMessage } = window.GestioneSquadreUtils;
        const msgContainerId = 'player-list-message';

        // Trova il giocatore
        const player = currentTeamData.players.find(p => p.id === playerId);
        if (!player) {
            displayMessage(msgContainerId, 'Giocatore non trovato!', 'error');
            return;
        }

        // Verifica budget
        if ((currentTeamData.budget || 0) < extensionCost) {
            displayMessage(msgContainerId, `Budget insufficiente! Servono ${extensionCost} CS`, 'error');
            return;
        }

        // Conferma
        const currentContract = player.contract || 0;
        const hasTimer = window.Contracts?.hasExpireTimer(player);
        const timerInfo = hasTimer ? `\n⚠️ Timer scadenza attivo! Verra' annullato.` : '';

        const confirmed = confirm(
            `Vuoi prolungare il contratto di ${playerName}?\n\n` +
            `Contratto attuale: ${currentContract} anno/i\n` +
            `Nuovo contratto: ${currentContract + 1} anni\n` +
            `Costo: ${extensionCost} CS\n\n` +
            `Budget attuale: ${currentTeamData.budget} CS\n` +
            `Budget dopo: ${currentTeamData.budget - extensionCost} CS` +
            timerInfo
        );
        if (!confirmed) return;

        displayMessage(msgContainerId, `Prolungamento contratto di ${playerName} in corso...`, 'info');

        // Esegui il prolungamento
        const result = await window.Contracts.extendContract(player, currentTeamData, context);

        if (result.success) {
            displayMessage(msgContainerId, result.message, 'success');
            if (window.Toast) window.Toast.success(result.message);
            loadTeamDataFromFirestore(currentTeamId, 'rosa');
            document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
        } else {
            displayMessage(msgContainerId, result.message, 'error');
            if (window.Toast) window.Toast.error(result.message);
        }
    },

    /**
     * Gestisce il click sul bottone Allenamento EXP
     */
    async handleTrainingExp(playerId, playerName, playerRole, context) {
        const { currentTeamId, currentTeamData, loadTeamDataFromFirestore } = context;
        const { displayMessage } = window.GestioneSquadreUtils;
        const msgContainerId = 'player-list-message';

        // Trova giocatore nella rosa
        const player = currentTeamData.players.find(p => p.id === playerId);
        if (!player) {
            displayMessage(msgContainerId, 'Giocatore non trovato!', 'error');
            return;
        }

        // Verifica cooldown per questo ruolo (tranne se in test mode)
        const testMode = window.FeatureFlags?.isEnabled('trainingExpTestMode');
        if (!testMode && window.TrainingExpMinigame?.isInCooldown(player.role)) {
            displayMessage(msgContainerId, `Ruolo ${player.role} gia allenato oggi! Aspetta fino a mezzanotte.`, 'warning');
            return;
        }

        // Apri minigioco con callback
        window.TrainingExpMinigame?.open(player, async (score) => {
            // score = -1 significa annullato, 0-3 significa completato
            if (score < 0) {
                displayMessage(msgContainerId, 'Allenamento annullato', 'info');
                return; // Non impostare cooldown se annullato
            }

            // Calcola XP (0 se test mode, usa valori da RewardsConfig)
            const xpPerSuccess = player.role === 'P'
                ? (window.RewardsConfig?.expTrainingGK || 20)
                : (window.RewardsConfig?.expTrainingField || 40);
            const xpGained = testMode ? 0 : score * xpPerSuccess;

            if (xpGained > 0) {
                // Applica XP al giocatore
                if (window.PlayerExp) {
                    // Migra giocatore se necessario
                    if (player.exp === undefined) {
                        window.PlayerExp.migratePlayer(player);
                    }

                    const oldLevel = player.level;
                    player.exp = (player.exp || 0) + xpGained;

                    // Verifica level up
                    const result = window.PlayerExp.checkLevelUp(player);

                    // Salva su Firestore
                    await this.savePlayerExpToFirestore(player, context);

                    // Mostra feedback
                    let message = `${playerName} ha guadagnato ${xpGained} EXP!`;
                    if (result && result.levelsGained > 0) {
                        message += ` LEVEL UP! Ora e livello ${player.level}!`;
                        if (window.PlayerExpUI?.showLevelUpNotification) {
                            window.PlayerExpUI.showLevelUpNotification(player, oldLevel, player.level);
                        }
                    }
                    displayMessage(msgContainerId, message, 'success');
                }
            } else if (testMode) {
                displayMessage(msgContainerId, `Modalita test: ${score}/3 successi (0 EXP assegnati)`, 'info');
            } else if (score === 0) {
                displayMessage(msgContainerId, `${playerName}: nessun successo, niente EXP guadagnati`, 'info');
            }

            // Imposta cooldown per questo ruolo (tranne se test mode)
            // A questo punto score >= 0 (annullato gestito sopra con return)
            if (!testMode) {
                await window.TrainingExpMinigame?.setCooldown(currentTeamId, player.role);
            }

            // Aggiorna vista rosa
            loadTeamDataFromFirestore(currentTeamId, 'rosa');
        });
    },

    /**
     * Salva l'EXP del giocatore su Firestore
     */
    async savePlayerExpToFirestore(player, context) {
        const { db, firestoreTools, TEAMS_COLLECTION_PATH, currentTeamId, currentTeamData } = context;

        try {
            const { doc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            // Aggiorna il giocatore nell'array players
            const updatedPlayers = currentTeamData.players.map(p =>
                p.id === player.id
                    ? { ...p, exp: player.exp, level: player.level, expToNextLevel: player.expToNextLevel }
                    : p
            );

            await updateDoc(teamDocRef, { players: updatedPlayers });

            // Aggiorna anche in memoria
            currentTeamData.players = updatedPlayers;
            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.players = updatedPlayers;
            }

            console.log(`[GestioneSquadreRosa] EXP salvato per ${player.name}: ${player.exp} XP, Livello ${player.level}`);
        } catch (error) {
            console.error('[GestioneSquadreRosa] Errore salvataggio EXP:', error);
        }
    },

    /**
     * Gestisce le azioni sulla rosa (licenziamento)
     */
    async handleRosaAction(event, context) {
        const { db, firestoreTools, TEAMS_COLLECTION_PATH, DRAFT_PLAYERS_COLLECTION_PATH, MARKET_PLAYERS_COLLECTION_PATH, currentTeamId, currentTeamData, loadTeamDataFromFirestore } = context;
        const { displayMessage } = window.GestioneSquadreUtils;
        const target = event.target;
        const msgContainerId = 'player-list-message';

        if (!target.dataset.playerId) return;

        const playerId = target.dataset.playerId;
        const playerName = target.dataset.playerName;
        const refundCost = parseInt(target.dataset.refundCost);

        if (target.dataset.action === 'licenzia') {
            const playerInRosa = currentTeamData.players.find(p => p.id === playerId);
            if (playerInRosa && playerInRosa.isCaptain) {
                displayMessage(msgContainerId, `ERRORE: Non puoi licenziare il Capitano attuale! Assegna prima un nuovo Capitano.`, 'error');
                return;
            }
            if (playerInRosa && playerInRosa.abilities && playerInRosa.abilities.includes('Icona')) {
                displayMessage(msgContainerId, `ERRORE: Non puoi licenziare l'Icona del club!`, 'error');
                return;
            }

            target.textContent = `CONFERMA? (+${refundCost} CS)`;
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-licenzia';
            return;
        }

        if (target.dataset.action === 'confirm-licenzia') {
            target.textContent = 'Esecuzione...';
            target.disabled = true;
            displayMessage(msgContainerId, `Licenziamento di ${playerName} in corso...`, 'info');

            try {
                const { doc, getDoc, updateDoc, setDoc, deleteDoc, deleteField } = firestoreTools;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
                const draftDocRef = doc(db, DRAFT_PLAYERS_COLLECTION_PATH, playerId);
                const marketDocRef = doc(db, MARKET_PLAYERS_COLLECTION_PATH, playerId);

                const playerInRosa = currentTeamData.players.find(p => p.id === playerId);
                if (!playerInRosa) {
                    throw new Error("Dati giocatore non trovati nella rosa!");
                }

                const draftDoc = await getDoc(draftDocRef);
                const marketDoc = await getDoc(marketDocRef);

                const wasInDraft = draftDoc.exists();
                const docExistsInMarket = marketDoc.exists();

                const teamDoc = await getDoc(teamDocRef);
                const teamData = teamDoc.data();
                const currentPlayers = teamData.players || [];

                const updatedPlayers = currentPlayers.filter(p => p.id !== playerId);
                const updatedTitolari = teamData.formation.titolari.filter(p => p.id !== playerId);
                const updatedPanchina = teamData.formation.panchina.filter(p => p.id !== playerId);

                const formStatusUpdate = {};
                if (teamData.playersFormStatus && teamData.playersFormStatus[playerId]) {
                    formStatusUpdate[`playersFormStatus.${playerId}`] = deleteField();
                }

                await updateDoc(teamDocRef, {
                    budget: teamData.budget + refundCost,
                    players: updatedPlayers,
                    formation: {
                        ...teamData.formation,
                        titolari: updatedTitolari,
                        panchina: updatedPanchina
                    },
                    ...formStatusUpdate
                });

                // Il giocatore in rosa ha un level fisso (non range)
                const finalLevel = playerInRosa.level || 1;

                // I giocatori di livello 1 (starter gratuiti) non vanno nel mercato
                if (finalLevel > 1) {
                    // Il costo nel mercato e' 2/3 del costo originale di acquisto
                    const originalCost = playerInRosa.cost !== undefined && playerInRosa.cost !== null ? playerInRosa.cost : 0;
                    const marketCost = Math.floor(originalCost * 2 / 3);
                    const finalAge = playerInRosa.age !== undefined && playerInRosa.age !== null ? playerInRosa.age : 25;
                    const finalRole = playerInRosa.role || 'C';
                    const finalName = playerInRosa.name || 'Sconosciuto';
                    const finalType = playerInRosa.type || window.getRandomType();
                    const finalAbilities = playerInRosa.abilities || [];

                    const playerDocumentData = {
                        name: finalName,
                        role: finalRole,
                        type: finalType,
                        age: finalAge,
                        cost: marketCost,
                        level: finalLevel,
                        abilities: finalAbilities,
                        isDrafted: false,
                        teamId: null,
                        creationDate: new Date().toISOString()
                    };

                    if (docExistsInMarket) {
                        await setDoc(marketDocRef, playerDocumentData, { merge: true });
                    } else {
                        await setDoc(marketDocRef, playerDocumentData);
                    }
                }

                if (wasInDraft) {
                    await deleteDoc(draftDocRef);
                    console.log(`Giocatore ${playerName} rimosso dalla collezione Draft.`);
                }

                if (window.loadDraftPlayersAdmin) window.loadDraftPlayersAdmin();
                if (window.loadMarketPlayersAdmin) window.loadMarketPlayersAdmin();

                const marketMessage = finalLevel > 1 ? ' Tornato nel Mercato.' : '';
                displayMessage(msgContainerId, `Giocatore ${playerName} licenziato! Rimborsati ${refundCost} CS.${marketMessage}`, 'success');
                loadTeamDataFromFirestore(currentTeamId, 'rosa');
                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            } catch (error) {
                console.error("Errore durante il licenziamento:", error);
                displayMessage(msgContainerId, `Errore nel licenziamento di ${playerName}. Messaggio: ${error.message}`, 'error');
                target.disabled = false;
                target.textContent = 'Licenzia (Errore)';
                target.classList.remove('bg-orange-500');
                target.classList.add('bg-red-600');
                target.dataset.action = 'licenzia';
            }
        }
    }
};

console.log("Modulo GestioneSquadre-Rosa caricato.");
