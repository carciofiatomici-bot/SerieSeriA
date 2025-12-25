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

        if (squadraMainTitle) squadraMainTitle.textContent = "Gestione Rosa";
        if (squadraSubtitle) squadraSubtitle.textContent = `Budget Rimanente: ${teamData.budget} Crediti Seri | Giocatori in rosa: ${window.getPlayerCountExcludingIcona(teamData.players)}/${window.InterfacciaConstants.MAX_ROSA_PLAYERS} (+ Icona)`;

        // Separa giocatori per ruolo
        const players = teamData.players || [];
        const icona = players.find(p => (p.abilities && p.abilities.includes('Icona')) || (teamData.iconaId && p.id === teamData.iconaId));
        const portieri = players.filter(p => p.role === 'P' && p !== icona).sort((a, b) => (b.level || 1) - (a.level || 1));
        const difensori = players.filter(p => p.role === 'D' && p !== icona).sort((a, b) => (b.level || 1) - (a.level || 1));
        const centrocampisti = players.filter(p => p.role === 'C' && p !== icona).sort((a, b) => (b.level || 1) - (a.level || 1));
        const attaccanti = players.filter(p => p.role === 'A' && p !== icona).sort((a, b) => (b.level || 1) - (a.level || 1));

        // Role configuration con colori e gradient per design compatto
        const roleConfig = {
            icona: { gradient: 'from-yellow-600/30 to-amber-900/20', border: 'border-yellow-500/50', text: 'text-yellow-400', icon: '👑', label: 'Icona' },
            P: { gradient: 'from-blue-600/30 to-blue-900/20', border: 'border-blue-500/50', text: 'text-blue-400', icon: '🧤', label: 'POR' },
            D: { gradient: 'from-emerald-600/30 to-green-900/20', border: 'border-green-500/50', text: 'text-green-400', icon: '🛡️', label: 'DIF' },
            C: { gradient: 'from-purple-600/30 to-indigo-900/20', border: 'border-purple-500/50', text: 'text-purple-400', icon: '⚽', label: 'CEN' },
            A: { gradient: 'from-red-600/30 to-rose-900/20', border: 'border-red-500/50', text: 'text-red-400', icon: '🎯', label: 'ATT' }
        };

        // Compatto role section renderer
        const renderRoleSection = (role, playersList, config) => {
            if (playersList.length === 0 && role !== 'icona') return '';
            if (role === 'icona' && !icona) return '';

            const playersToRender = role === 'icona' ? [icona] : playersList;

            return `
                <div class="role-section mb-2" data-role="${role}">
                    <div class="role-section-header flex items-center gap-2 px-2 py-1.5 cursor-pointer
                                bg-gradient-to-r ${config.gradient} rounded-lg border ${config.border}
                                hover:brightness-110 transition-all duration-200 active:scale-[0.99]">
                        <span class="role-toggle-icon text-gray-400 text-xs transition-transform duration-200">▶</span>
                        <span class="${config.text} font-bold text-sm">${config.icon}</span>
                        <span class="${config.text} font-semibold text-sm">${config.label}</span>
                        <span class="text-gray-400 text-xs ml-auto">${playersToRender.length}</span>
                    </div>
                    <div class="role-section-content hidden mt-1 space-y-1 pl-1">
                        ${playersToRender.map(player => this.renderPlayerCard(player, teamData)).join('')}
                    </div>
                </div>
            `;
        };

        // Conta giocatori totali per statistiche
        const totalPlayers = players.length;
        const maxPlayers = window.InterfacciaConstants?.MAX_ROSA_PLAYERS || 12;

        squadraToolsContainer.innerHTML = `
            <div id="player-list-box" class="rounded-xl border relative overflow-hidden"
                 style="background: rgba(17, 24, 39, 0.6); border-radius: 12px;">

                <!-- Header compatto con stats e azioni -->
                <div class="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 bg-gray-800/50">
                    <div class="flex items-center gap-2">
                        <span class="text-green-400 font-bold text-base">Rosa</span>
                        <span class="text-xs text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">${totalPlayers}/${maxPlayers}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button id="btn-training-rosa"
                                class="text-xs bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold
                                       px-2 py-1 rounded-md hover:brightness-110 transition-all duration-150
                                       flex items-center gap-1 active:scale-95">
                            <span class="text-sm">⚽</span>
                            <span class="hidden sm:inline">Allenamento</span>
                        </button>
                        <button id="btn-toggle-licenzia"
                                class="text-gray-400 hover:text-red-400 hover:bg-red-900/30
                                       w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150"
                                title="Mostra/Nascondi licenziamento">
                            <span class="text-sm">⚙️</span>
                        </button>
                    </div>
                </div>

                <!-- Messaggio feedback -->
                <div id="player-list-message" class="hidden text-center py-1.5 text-sm border-b border-gray-700/30"></div>

                <!-- Lista giocatori -->
                <div id="player-list" class="p-2 space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto overscroll-contain">
                    ${players.length === 0
                        ? `<div class="text-center py-8 text-gray-400">
                               <div class="text-3xl mb-2">⚽</div>
                               <p class="text-sm">Nessun calciatore in rosa</p>
                               <p class="text-xs text-gray-500 mt-1">Vai al Draft per acquistarne!</p>
                           </div>`
                        : `
                            ${renderRoleSection('icona', [], roleConfig.icona)}
                            ${renderRoleSection('P', portieri, roleConfig.P)}
                            ${renderRoleSection('D', difensori, roleConfig.D)}
                            ${renderRoleSection('C', centrocampisti, roleConfig.C)}
                            ${renderRoleSection('A', attaccanti, roleConfig.A)}
                        `
                    }
                </div>
            </div>
        `;

        this.attachEventListeners(context);
    },

    /**
     * Renderizza una singola card giocatore - versione compatta per mobile
     */
    renderPlayerCard(player, teamData) {
        const refundCost = player.cost > 0 ? Math.floor(player.cost / 2) : 0;
        const isCaptain = player.isCaptain;
        const isIcona = (player.abilities && player.abilities.includes('Icona')) ||
                        (teamData.iconaId && player.id === teamData.iconaId);

        // Status indicators (compatti)
        const isInjured = window.Injuries?.isPlayerInjured(player);
        const injuryRemaining = isInjured ? window.Injuries.getRemainingMatches(player) : 0;

        const playerLevel = player.level || 1;
        const playerCost = player.cost || 0;
        const isBasePlayer = player.isBase || player.isBasePlayer ||
                            (player.name?.includes('Base')) ||
                            (((playerLevel === 1) || (playerLevel === 5)) && playerCost === 0 && !isIcona);

        // Form color
        const formData = teamData.playersFormStatus?.[player.id];
        const formModifier = formData?.mod ?? 0;
        let nameColor = 'text-white';
        if (isCaptain) nameColor = 'text-orange-400';
        else if (formModifier > 0) nameColor = 'text-green-400';
        else if (formModifier < 0) nameColor = 'text-red-400';

        // Type badge compatto
        const playerType = player.type || 'N/A';
        const typeColors = { Potenza: 'bg-red-600', Tecnica: 'bg-blue-600', Velocita: 'bg-green-600' };
        const typeBg = typeColors[playerType] || 'bg-gray-600';

        // Abilita compatte
        const playerAbilities = player.abilities || [];
        const UNIQUE_ABILITIES = ['Icona', "Fatto d'acciaio", "L'uomo in piu", 'Tiro Dritto', 'Avanti un altro', 'Contrasto di gomito', 'Calcolo delle probabilita', 'Amici di panchina', 'Continua a provare', 'Stazionario', 'Osservatore', 'Relax', 'Scheggia impazzita', 'Assist-man'];

        // Potenziale
        let potenziale = null;
        let potenzialColor = '';
        if (!isIcona) {
            let maxLvl = player.isSeriousPlayer ? 10 : isBasePlayer ? 5 : player.secretMaxLevel;
            if (maxLvl) {
                if (maxLvl <= 5) { potenziale = 'Dilettante'; potenzialColor = 'text-gray-400'; }
                else if (maxLvl <= 10) { potenziale = 'Accettabile'; potenzialColor = 'text-white'; }
                else if (maxLvl <= 15) { potenziale = 'Pro'; potenzialColor = 'text-green-400'; }
                else if (maxLvl <= 19) { potenziale = 'Fuoriclasse'; potenzialColor = 'text-blue-400'; }
                else if (maxLvl <= 24) { potenziale = 'Leggenda'; potenzialColor = 'text-purple-400'; }
                else { potenziale = 'GOAT'; potenzialColor = 'text-orange-400'; }
            }
        }

        // EXP bar
        let expBarHtml = '';
        if (window.PlayerExp && window.PlayerExpUI) {
            if (player.exp === undefined) window.PlayerExp.migratePlayer(player);
            expBarHtml = `<div class="mt-1.5 w-full">${window.PlayerExpUI.renderExpBar(player, { showText: true, size: 'small' })}</div>`;
        }

        // Contratto badge
        const contractBadge = window.Contracts?.renderContractBadge(player, teamData) || '';

        // Border per status
        const borderColor = isInjured ? 'border-l-red-500' : 'border-l-transparent';

        // Training EXP button
        let trainingExpBtn = '';
        if (window.FeatureFlags?.isEnabled('trainingExp')) {
            const isInCooldown = window.TrainingExpMinigame?.isInCooldown(player.role);
            const testMode = window.FeatureFlags?.isEnabled('trainingExpTestMode');
            if (isInCooldown && !testMode) {
                const countdown = window.TrainingExpMinigame?.getCooldownCountdown() || '...';
                trainingExpBtn = `<span class="text-xs text-orange-400">⏳ ${countdown}</span>`;
            } else {
                trainingExpBtn = `
                    <button data-player-id="${player.id}" data-player-name="${player.name}" data-player-role="${player.role}"
                            data-action="training-exp"
                            class="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded transition-all">
                        🎮 EXP${testMode ? '*' : ''}
                    </button>`;
            }
        }

        // Statistiche button
        const statsBtn = window.FeatureFlags?.isEnabled('playerStats')
            ? `<button data-action="view-player-stats" data-player-id="${player.id}" data-player-name="${player.name}" data-player-role="${player.role}"
                       class="text-xs text-blue-400 hover:text-blue-300">📊</button>` : '';

        return `
            <div class="bg-gray-800/80 rounded-lg border-l-2 ${borderColor} border border-gray-700/50 overflow-hidden
                        hover:bg-gray-750 transition-all duration-150">
                <!-- Header compatto -->
                <div class="player-card-header px-2 py-1.5 cursor-pointer flex items-center gap-2" data-player-id="${player.id}">
                    <span class="player-toggle-icon text-gray-500 text-xs transition-transform duration-200">▶</span>

                    <!-- Info principale -->
                    <div class="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span class="${nameColor} font-semibold text-sm truncate">${player.name}</span>
                        ${isCaptain ? '<span class="text-orange-400 text-xs">Ⓒ</span>' : ''}
                        ${isIcona ? '<span class="text-yellow-400 text-xs">👑</span>' : ''}
                        ${isInjured ? `<span class="text-red-400 text-xs">🏥${injuryRemaining}</span>` : ''}
                        ${isBasePlayer ? '<span class="text-gray-400 text-xs">🌱</span>' : ''}
                        ${player.isSeriousPlayer ? '<span class="text-orange-400 text-xs">🎯</span>' : ''}
                    </div>

                    <!-- Badges compatti -->
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <span class="${typeBg} text-white text-xs px-1 py-0.5 rounded font-medium">${playerType.charAt(0)}</span>
                        <span class="text-gray-400 text-xs">Lv.${playerLevel}</span>
                        ${contractBadge}
                    </div>
                </div>

                <!-- Contenuto espandibile -->
                <div class="player-card-content hidden border-t border-gray-700/50 px-2 py-2 bg-gray-900/30">
                    <!-- Info row -->
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                <span>Costo: ${playerCost} CS</span>
                                ${potenziale ? `<span class="${potenzialColor}">${potenziale}</span>` : ''}
                            </div>
                            ${playerAbilities.length > 0
                                ? `<div class="text-xs text-indigo-300 truncate">
                                       ${playerAbilities.map(a => UNIQUE_ABILITIES.includes(a) ? `<span class="text-yellow-400">${a}</span>` : a).join(', ')}
                                   </div>`
                                : '<div class="text-xs text-gray-500">Nessuna abilita</div>'
                            }
                            ${expBarHtml}
                        </div>
                        <div class="flex items-center gap-1">
                            ${statsBtn}
                        </div>
                    </div>

                    <!-- Actions row -->
                    <div class="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-700/30">
                        ${trainingExpBtn}
                        ${isCaptain
                            ? '<span class="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">Capitano</span>'
                            : `<button data-player-id="${player.id}" data-player-name="${player.name}" data-action="assign-captain"
                                       class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-all">
                                   👑 Capitano
                               </button>`
                        }
                        ${window.Contracts?.isEnabled() && window.Contracts.isSubjectToContract(player, teamData)
                            ? `<button data-player-id="${player.id}" data-player-name="${player.name}"
                                       data-extension-cost="${window.Contracts.calculateExtensionCost(player)}"
                                       data-current-contract="${player.contract || 1}" data-action="extend-contract"
                                       class="text-xs bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded transition-all">
                                   📝 Prolunga
                               </button>` : ''
                        }
                        ${window.FeatureFlags?.isEnabled('marketObjects')
                            ? `<button data-player-id="${player.id}" data-player-name="${player.name}" data-action="open-equipment"
                                       class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition-all">
                                   🎒 Equip
                               </button>` : ''
                        }
                        <button data-player-id="${player.id}" data-original-cost="${playerCost}"
                                data-refund-cost="${refundCost}" data-player-name="${player.name}" data-action="licenzia"
                                class="licenzia-btn hidden text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition-all
                                       ${isIcona ? 'opacity-50 cursor-not-allowed' : ''}" ${isIcona ? 'disabled' : ''}>
                            🗑️ ${refundCost} CS
                        </button>
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
                    const card = playerHeader.parentElement;
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

        // Helper per rimuovere campi undefined (Firestore non li accetta)
        const cleanObject = (obj) => {
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value !== undefined) {
                    cleaned[key] = value;
                }
            }
            return cleaned;
        };

        try {
            const { doc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

            const updatedPlayers = currentTeamData.players.map(player => {
                return cleanObject({
                    ...player,
                    isCaptain: player.id === newCaptainId,
                });
            });

            // Verifica che formation esista
            const formation = currentTeamData.formation || {};
            const titolari = formation.titolari || [];
            const panchina = formation.panchina || [];

            await updateDoc(teamDocRef, {
                players: updatedPlayers,
                formation: {
                    ...formation,
                    titolari: titolari.map(p => cleanObject({
                        ...p,
                        isCaptain: p.id === newCaptainId
                    })),
                    panchina: panchina.map(p => cleanObject({
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

            // Imposta cooldown giornaliero (1 giocatore al giorno, tranne se test mode)
            // A questo punto score >= 0 (annullato gestito sopra con return)
            if (!testMode) {
                await window.TrainingExpMinigame?.setCooldown(currentTeamId);
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
                const originalCost = playerInRosa.cost !== undefined && playerInRosa.cost !== null ? playerInRosa.cost : 0;

                // I giocatori gratuiti (costo 0) o di livello 1 non vanno nel mercato
                const isFreePlayer = originalCost === 0 || finalLevel === 1;
                if (!isFreePlayer) {
                    // Il costo nel mercato e' 2/3 del costo originale di acquisto
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

                const marketMessage = !isFreePlayer ? ' Tornato nel Mercato.' : '';
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
