//
// ====================================================================
// MODULO STADIUM-UI.JS - Interfaccia Grafica Stadio
// ====================================================================
//
// Renderizza la visualizzazione dello stadio con campo da calcio
// e strutture costruibili/costruite.
//

window.StadiumUI = {

    // Container ID
    CONTAINER_ID: 'stadium-content',

    // Stato UI
    _teamId: null,
    _teamData: null,
    _stadiumData: null,

    /**
     * Inizializza e renderizza il pannello stadio
     * @param {string} teamId - ID della squadra
     * @param {Object} teamData - Dati completi della squadra
     */
    async init(teamId, teamData) {
        this._teamId = teamId;
        this._teamData = teamData;

        // Carica dati stadio
        this._stadiumData = await window.Stadium.loadStadium(teamId);

        // Renderizza
        this.render();
    },

    /**
     * Renderizza l'intero pannello stadio
     */
    render() {
        const container = document.getElementById(this.CONTAINER_ID);
        if (!container) {
            console.error('[StadiumUI] Container non trovato:', this.CONTAINER_ID);
            return;
        }

        const stats = window.Stadium.getStats(this._stadiumData);
        const teamName = this._teamData?.teamName || 'La tua squadra';

        container.innerHTML = `
            <div class="p-4 md:p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold text-green-400 flex items-center gap-3">
                            <span class="text-4xl">🏟️</span>
                            Stadio di ${this.escapeHtml(teamName)}
                        </h2>
                        <p class="text-gray-400 mt-1">Costruisci strutture per ottenere bonus nelle partite in casa</p>
                    </div>
                    <button id="btn-back-from-stadium" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">
                        <i class="fas fa-arrow-left mr-2"></i> Torna alla Dashboard
                    </button>
                </div>

                <!-- Box Allenatore (centrato) -->
                ${this.renderCoachBox()}

                <!-- Stats Bar -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-gray-400 text-sm">Strutture Costruite</p>
                        <p class="text-2xl font-bold text-white">${stats.built} / ${stats.total}</p>
                        <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                            <div class="bg-green-500 h-2 rounded-full transition-all" style="width: ${stats.percentage}%"></div>
                        </div>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-blue-600">
                        <p class="text-gray-400 text-sm">Livelli Totali</p>
                        <p class="text-2xl font-bold text-blue-400">${stats.totalLevels} / ${stats.maxPossibleLevels}</p>
                        <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                            <div class="bg-blue-500 h-2 rounded-full transition-all" style="width: ${stats.levelPercentage}%"></div>
                        </div>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-green-600">
                        <p class="text-gray-400 text-sm">Bonus Casa Attuale</p>
                        <p class="text-2xl font-bold text-green-400">+${stats.bonus.toFixed(2)}</p>
                        <p class="text-xs text-gray-500 mt-1">Max: +${stats.maxBonus.toFixed(2)}</p>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p class="text-gray-400 text-sm">Budget Disponibile</p>
                        <p class="text-2xl font-bold text-yellow-400">${this._teamData?.budget || 0} CS</p>
                    </div>
                </div>

                <!-- Sezione Spogliatoi -->
                ${this.renderLockerRoomSection()}

                <!-- Campo da Calcio con Strutture -->
                <div class="bg-gray-900 rounded-xl p-4 md:p-6 border-2 border-gray-700">
                    ${this.renderStadiumField()}
                </div>

                <!-- Legenda + Bonus Casa -->
                <div class="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <!-- Legenda a sinistra -->
                        <div>
                            <h4 class="text-lg font-bold text-gray-300 mb-3">Legenda</h4>
                            <div class="flex flex-wrap gap-4 text-sm">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded bg-green-700 border-2 border-green-400 flex items-center justify-center text-xs text-white font-bold">1</div>
                                    <span class="text-gray-400">Lv.1</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded bg-green-700 border-2 border-blue-400 flex items-center justify-center text-xs text-white font-bold">2</div>
                                    <span class="text-gray-400">Lv.2</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded bg-gradient-to-br from-yellow-700 to-yellow-900 border-2 border-purple-400 flex items-center justify-center text-xs text-yellow-300 font-bold">M</div>
                                    <span class="text-gray-400">Lv.MAX</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center text-xs">+</div>
                                    <span class="text-gray-400">Disponibile</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded bg-gray-800 border-2 border-red-900 flex items-center justify-center text-xs opacity-50">🔒</div>
                                    <span class="text-gray-400">Bloccato</span>
                                </div>
                            </div>
                        </div>
                        <!-- Bonus Casa a destra -->
                        <div class="bg-gray-900 rounded-lg px-5 py-3 border-2 border-green-500 text-center">
                            <p class="text-xs text-gray-400 mb-1">Bonus Casa Totale</p>
                            <p class="text-2xl font-bold text-green-400" id="total-bonus-display">+${(this._stadiumData?.totalBonus || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <!-- Messaggio feedback -->
                <p id="stadium-message" class="text-center mt-4 text-sm"></p>
            </div>

            <!-- Modal Conferma Acquisto -->
            <div id="stadium-confirm-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg w-full max-w-md mx-4 border-2 border-green-500">
                    <div class="bg-gradient-to-r from-green-700 to-green-500 p-4 rounded-t-lg">
                        <h3 class="text-xl font-bold text-white" id="modal-structure-title">Conferma Costruzione</h3>
                    </div>
                    <div class="p-6">
                        <div id="modal-structure-info" class="mb-4"></div>
                        <div class="flex gap-4">
                            <button id="btn-confirm-build" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition">
                                Costruisci
                            </button>
                            <button id="btn-cancel-build" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">
                                Annulla
                            </button>
                        </div>
                        <p id="modal-error-message" class="text-center mt-3 text-sm text-red-400"></p>
                    </div>
                </div>
            </div>

            <!-- Modal Conferma Demolizione -->
            <div id="stadium-demolish-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg w-full max-w-md mx-4 border-2 border-red-500">
                    <div class="bg-gradient-to-r from-red-700 to-red-500 p-4 rounded-t-lg">
                        <h3 class="text-xl font-bold text-white" id="demolish-modal-title">Conferma Demolizione</h3>
                    </div>
                    <div class="p-6">
                        <div id="demolish-modal-info" class="mb-4"></div>
                        <div class="flex gap-4">
                            <button id="btn-confirm-demolish" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">
                                Demolisci
                            </button>
                            <button id="btn-cancel-demolish" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">
                                Annulla
                            </button>
                        </div>
                        <p id="demolish-error-message" class="text-center mt-3 text-sm text-red-400"></p>
                    </div>
                </div>
            </div>

            <!-- Modal Upgrade/Demolisci -->
            <div id="stadium-upgrade-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg w-full max-w-md mx-4 border-2 border-blue-500">
                    <div class="bg-gradient-to-r from-blue-700 to-blue-500 p-4 rounded-t-lg">
                        <h3 class="text-xl font-bold text-white" id="upgrade-modal-title">Gestisci Struttura</h3>
                    </div>
                    <div class="p-6">
                        <div id="upgrade-modal-info" class="mb-4"></div>
                        <div class="flex flex-col gap-3">
                            <button id="btn-confirm-upgrade" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition">
                                Migliora
                            </button>
                            <button id="btn-demolish-from-upgrade" class="bg-red-600/50 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition text-sm">
                                Demolisci Struttura
                            </button>
                            <button id="btn-cancel-upgrade" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded-lg transition text-sm">
                                Annulla
                            </button>
                        </div>
                        <p id="upgrade-error-message" class="text-center mt-3 text-sm text-red-400"></p>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    /**
     * Renderizza il box allenatore centrato con barra EXP
     */
    renderCoachBox() {
        const coach = this._teamData?.coach;
        if (!coach) {
            return '';
        }

        const coachName = coach.name || 'Sconosciuto';
        const coachLevel = coach.level || 1;
        const maxLevel = window.PlayerExp?.CONFIG?.MAX_LEVEL_COACH || 10;

        // Ottieni progressione EXP
        let expProgress = { current: 0, needed: 0, percentage: 0, maxed: false };
        if (window.PlayerExp?.getCoachExpProgress) {
            expProgress = window.PlayerExp.getCoachExpProgress(coach);
        }

        const isMaxed = coachLevel >= maxLevel || expProgress.maxed;

        return `
            <div class="flex justify-center mb-6">
                <div class="p-4 bg-gray-800 rounded-lg border-2 border-orange-500 text-center shadow-lg min-w-64">
                    <p class="text-sm text-gray-400 font-semibold">Allenatore:</p>
                    <p class="text-xl font-extrabold text-orange-400 mt-1">${this.escapeHtml(coachName)}</p>
                    <p class="text-xs text-gray-500 mb-2">Livello: ${coachLevel} / ${maxLevel}</p>

                    <!-- Barra EXP Allenatore -->
                    <div class="mt-3">
                        ${isMaxed ? `
                            <div class="text-xs text-yellow-400 font-bold mb-1">LIVELLO MASSIMO</div>
                            <div class="w-full bg-gray-700 rounded-full h-3">
                                <div class="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full" style="width: 100%"></div>
                            </div>
                        ` : `
                            <div class="text-xs text-gray-400 mb-1">
                                EXP: ${expProgress.current} / ${expProgress.needed}
                            </div>
                            <div class="w-full bg-gray-700 rounded-full h-3">
                                <div class="bg-gradient-to-r from-orange-600 to-orange-400 h-3 rounded-full transition-all"
                                     style="width: ${expProgress.percentage}%"></div>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">${expProgress.percentage}% verso Lv.${coachLevel + 1}</div>
                        `}
                    </div>
                    <p class="text-xs text-gray-600 mt-2 italic">Guadagna EXP vincendo partite</p>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza la sezione spogliatoi con upgrade
     */
    renderLockerRoomSection() {
        if (!window.Stadium?.getLockerRoom) {
            return '';
        }

        const locker = window.Stadium.getLockerRoom(this._stadiumData);
        const budget = this._teamData?.budget || 0;
        const canUpgrade = window.Stadium.canUpgradeLockerRoom(budget, this._stadiumData);

        // Colori in base al livello
        const levelColors = {
            0: 'border-gray-600',
            1: 'border-blue-500',
            2: 'border-green-500',
            3: 'border-purple-500',
            4: 'border-orange-500',
            5: 'border-yellow-500'
        };

        const borderColor = levelColors[locker.level] || levelColors[0];
        const isMaxed = locker.maxed;

        return `
            <div class="mb-6 bg-gray-800 rounded-lg p-4 border-2 ${borderColor}">
                <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                    <!-- Info Spogliatoi -->
                    <div class="flex items-center gap-4">
                        <div class="text-5xl">${locker.level > 0 ? '🚿' : '🚧'}</div>
                        <div>
                            <h3 class="text-xl font-bold text-white flex items-center gap-2">
                                Spogliatoi
                                ${isMaxed ? '<span class="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full">MAX</span>' : ''}
                            </h3>
                            <p class="text-sm text-gray-400">
                                ${locker.level === 0 ? 'Non costruito' : `Livello ${locker.level} / 5`}
                            </p>
                            <p class="text-sm ${locker.level > 0 ? 'text-green-400' : 'text-gray-500'}">
                                ${locker.level > 0 ? `Bonus EXP: +${locker.level * 5}%` : 'Nessun bonus'}
                            </p>
                        </div>
                    </div>

                    <!-- Barra Livello -->
                    <div class="flex-1 max-w-xs mx-4">
                        <div class="flex gap-1">
                            ${[1, 2, 3, 4, 5].map(lvl => `
                                <div class="flex-1 h-4 rounded ${lvl <= locker.level ? 'bg-gradient-to-r from-blue-500 to-green-500' : 'bg-gray-700'}"></div>
                            `).join('')}
                        </div>
                        <p class="text-center text-xs text-gray-500 mt-1">
                            ${isMaxed ? '+25% EXP massimo' : `Prossimo: +${(locker.level + 1) * 5}% EXP`}
                        </p>
                    </div>

                    <!-- Pulsante Upgrade -->
                    <div class="text-center">
                        ${isMaxed ? `
                            <div class="text-yellow-400 font-bold text-sm">
                                Livello Massimo Raggiunto
                            </div>
                        ` : `
                            <button id="btn-upgrade-locker"
                                    class="${canUpgrade.canUpgrade
                                        ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                                        : 'bg-gray-600 cursor-not-allowed opacity-50'}
                                    text-white font-bold py-2 px-4 rounded-lg transition flex items-center gap-2"
                                    ${canUpgrade.canUpgrade ? '' : 'disabled'}>
                                <span>${locker.level === 0 ? 'Costruisci' : 'Migliora'}</span>
                                <span class="text-yellow-300">${locker.nextCost} CS</span>
                            </button>
                            ${!canUpgrade.canUpgrade && !isMaxed ? `
                                <p class="text-xs text-red-400 mt-1">${canUpgrade.reason}</p>
                            ` : ''}
                        `}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza il campo da calcio con tutti gli slot
     */
    renderStadiumField() {
        const budget = this._teamData?.budget || 0;

        // Helper per creare uno slot struttura
        const createSlot = (structureId) => {
            const structure = window.Stadium.STRUCTURES[structureId];
            if (!structure) return '';

            const level = window.Stadium.getStructureLevel(structureId, this._stadiumData);
            const isBuilt = level > 0;
            const canBuildResult = window.Stadium.canBuild(structureId, this._stadiumData);
            const isLocked = !isBuilt && !canBuildResult.canBuild;
            const maxLevel = structure.maxLevel || window.Stadium.MAX_STRUCTURE_LEVEL;
            const isMaxed = level >= maxLevel;
            const currentBonus = window.Stadium.calculateStructureBonus(structureId, level);

            // Colori bordo in base al livello
            const levelBorderColors = {
                1: 'border-green-400',
                2: 'border-blue-400',
                3: 'border-purple-400'
            };

            let slotClass, content, title;

            if (isBuilt) {
                const borderColor = levelBorderColors[level] || 'border-green-400';
                const canUpgradeResult = window.Stadium.canUpgradeStructure(structureId, budget, this._stadiumData);

                if (isMaxed) {
                    // Livello massimo - sfondo dorato
                    slotClass = `bg-gradient-to-br from-yellow-700 to-yellow-900 ${borderColor} cursor-pointer`;
                    title = `${structure.name} Lv.MAX - Bonus: +${currentBonus.toFixed(2)}`;
                } else if (canUpgradeResult.canUpgrade) {
                    // Puo essere migliorata
                    slotClass = `bg-green-700 ${borderColor} hover:border-blue-400 hover:bg-blue-900/50 cursor-pointer`;
                    title = `${structure.name} Lv.${level} - Clicca per migliorare (${canUpgradeResult.upgradeCost} CS)`;
                } else {
                    // Costruita ma non migliorabile (fondi insufficienti)
                    slotClass = `bg-green-700 ${borderColor} cursor-pointer`;
                    title = `${structure.name} Lv.${level} - +${currentBonus.toFixed(2)} bonus`;
                }

                content = `
                    <span class="text-2xl">${structure.icon}</span>
                    <span class="text-xs font-bold ${isMaxed ? 'text-yellow-300' : 'text-white'} mt-0.5">
                        ${isMaxed ? 'MAX' : 'Lv.' + level}
                    </span>
                `;
            } else if (isLocked) {
                slotClass = 'bg-gray-800 border-red-900 opacity-50 cursor-not-allowed';
                content = `<span class="text-lg">🔒</span>`;
                title = `${structure.name} - ${canBuildResult.reason}`;
            } else {
                const buildCost = window.Stadium.getUpgradeCost(structureId, 1);
                slotClass = 'bg-gray-700 border-dashed border-gray-500 hover:border-green-400 hover:bg-gray-600 cursor-pointer';
                content = `<span class="text-xl opacity-50">${structure.icon}</span>`;
                title = `${structure.name} - ${buildCost} CS (+${structure.bonus} bonus)`;
            }

            return `
                <div class="structure-slot w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 ${slotClass}
                            flex flex-col items-center justify-center transition-all"
                     data-structure-id="${structureId}"
                     data-level="${level}"
                     data-is-built="${isBuilt}"
                     data-is-maxed="${isMaxed}"
                     data-is-locked="${isLocked}"
                     title="${title}">
                    ${content}
                </div>
            `;
        };

        return `
            <div class="stadium-layout relative">
                <!-- Layout Stadio: Vista dall'alto, campo orizzontale -->

                <!-- Riga superiore: Tabellone Ovest - Faro NW - Tribuna Nord - Faro NE - Tabellone Est -->
                <div class="flex justify-center items-center gap-2 mb-2">
                    ${createSlot('scoreboard_west')}
                    ${createSlot('light_nw')}
                    <div class="flex-1 max-w-md">
                        ${createSlot('tribune_north')}
                    </div>
                    ${createSlot('light_ne')}
                    ${createSlot('scoreboard_east')}
                </div>

                <!-- Area Media Nord -->
                <div class="flex justify-center mb-2">
                    ${createSlot('media_north')}
                </div>

                <!-- Campo centrale con porte e panchine -->
                <div class="flex items-center justify-center gap-2 my-4">
                    <!-- Tribuna Ovest (porta) -->
                    <div class="flex flex-col items-center gap-2">
                        ${createSlot('tribune_west')}
                    </div>

                    <!-- Campo da gioco -->
                    <div class="relative bg-green-800 rounded-lg border-4 border-white w-full max-w-2xl aspect-[2/1] mx-2">
                        <!-- Linee del campo -->
                        <div class="absolute inset-0 flex items-center justify-center">
                            <!-- Linea centrale -->
                            <div class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white opacity-60"></div>
                            <!-- Cerchio centrale -->
                            <div class="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-white opacity-60"></div>
                        </div>

                        <!-- Porta sinistra -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-4 md:w-6 h-16 md:h-24 border-2 border-white border-l-0 opacity-80"></div>
                        <!-- Area piccola sinistra -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-8 md:w-12 h-24 md:h-32 border-2 border-white border-l-0 opacity-60"></div>

                        <!-- Porta destra -->
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 md:w-6 h-16 md:h-24 border-2 border-white border-r-0 opacity-80"></div>
                        <!-- Area piccola destra -->
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-8 md:w-12 h-24 md:h-32 border-2 border-white border-r-0 opacity-60"></div>

                        <!-- Panchine a bordo campo -->
                        <div class="absolute bottom-2 left-1/4 transform -translate-x-1/2">
                            ${createSlot('bench_left')}
                        </div>
                        <div class="absolute bottom-2 right-1/4 transform translate-x-1/2">
                            ${createSlot('bench_right')}
                        </div>
                    </div>

                    <!-- Tribuna Est (porta) -->
                    <div class="flex flex-col items-center gap-2">
                        ${createSlot('tribune_east')}
                    </div>
                </div>

                <!-- Area Media Sud -->
                <div class="flex justify-center mt-2">
                    ${createSlot('media_south')}
                </div>

                <!-- Riga inferiore: Faro SW - Tribuna Sud - Faro SE -->
                <div class="flex justify-center items-center gap-2 mt-2">
                    <div class="w-16 h-16 md:w-20 md:h-20"></div> <!-- Spacer -->
                    ${createSlot('light_sw')}
                    <div class="flex-1 max-w-md">
                        ${createSlot('tribune_south')}
                    </div>
                    ${createSlot('light_se')}
                    <div class="w-16 h-16 md:w-20 md:h-20"></div> <!-- Spacer -->
                </div>

            </div>

            <!-- Sezione Strutture Speciali -->
            <div class="mt-6 pt-6 border-t-2 border-gray-700">
                <h3 class="text-xl font-bold text-gray-300 mb-4 text-center">Strutture Speciali</h3>

                <!-- Strutture Premium -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    ${this.renderSpecialStructureCard('stadium_roof')}
                    ${this.renderSpecialStructureCard('giant_screen')}
                    ${this.renderSpecialStructureCard('ultras_section')}
                    ${this.renderSpecialStructureCard('scouting_center')}
                    ${this.renderSpecialStructureCard('observers_center')}
                </div>

                <!-- Facilities -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    ${this.renderSpecialStructureCard('medical_center')}
                    ${this.renderSpecialStructureCard('gym')}
                    ${this.renderSpecialStructureCard('tactical_room')}
                    ${this.renderSpecialStructureCard('warmup_area')}
                </div>

                <!-- Commerciali e Prestigio -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${this.renderSpecialStructureCard('shop')}
                    ${this.renderSpecialStructureCard('museum')}
                    ${this.renderSpecialStructureCard('conference_room')}
                </div>
            </div>
        `;
    },

    /**
     * Renderizza una card per struttura speciale
     * @param {string} structureId - ID struttura
     */
    renderSpecialStructureCard(structureId) {
        const structure = window.Stadium.STRUCTURES[structureId];
        if (!structure) return '';

        const level = window.Stadium.getStructureLevel(structureId, this._stadiumData);
        const isBuilt = level > 0;
        const canBuildResult = window.Stadium.canBuild(structureId, this._stadiumData);
        const maxLevel = structure.maxLevel || window.Stadium.MAX_STRUCTURE_LEVEL;
        const isMaxed = level >= maxLevel;
        const budget = this._teamData?.budget || 0;

        // Calcola costo e bonus
        const buildCost = window.Stadium.getUpgradeCost(structureId, 1);
        const upgradeCost = isBuilt && !isMaxed ? window.Stadium.getUpgradeCost(structureId, level + 1) : 0;
        const currentBonus = window.Stadium.calculateStructureBonus(structureId, level);

        // Colori in base allo stato
        let cardClass, statusBadge, actionButton;

        if (isBuilt) {
            if (isMaxed) {
                // MAX level
                cardClass = 'bg-gradient-to-br from-yellow-900/50 to-yellow-700/30 border-yellow-500';
                statusBadge = `<span class="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">MAX</span>`;
                actionButton = '';
            } else {
                // Costruita, puo migliorare
                const canAffordUpgrade = budget >= upgradeCost;
                cardClass = 'bg-gray-800 border-green-500';
                statusBadge = `<span class="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">Lv.${level}</span>`;
                actionButton = `
                    <button class="structure-upgrade-btn w-full mt-2 ${canAffordUpgrade ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 cursor-not-allowed'}
                                   text-white text-xs font-bold py-1.5 px-2 rounded transition"
                            data-structure-id="${structureId}"
                            ${canAffordUpgrade ? '' : 'disabled'}>
                        Migliora Lv.${level + 1} - ${upgradeCost} CS
                    </button>
                `;
            }
        } else if (canBuildResult.canBuild) {
            // Disponibile per costruzione
            const canAfford = budget >= buildCost;
            cardClass = 'bg-gray-800 border-gray-600 hover:border-green-500';
            statusBadge = `<span class="bg-gray-600 text-gray-300 text-xs px-2 py-0.5 rounded-full">Non costruito</span>`;
            actionButton = `
                <button class="structure-build-btn w-full mt-2 ${canAfford ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 cursor-not-allowed'}
                               text-white text-xs font-bold py-1.5 px-2 rounded transition"
                        data-structure-id="${structureId}"
                        ${canAfford ? '' : 'disabled'}>
                    Costruisci - ${buildCost} CS
                </button>
            `;
        } else {
            // Bloccato
            cardClass = 'bg-gray-900 border-red-900/50 opacity-60';
            statusBadge = `<span class="bg-red-900 text-red-300 text-xs px-2 py-0.5 rounded-full">Bloccato</span>`;
            actionButton = `
                <p class="text-xs text-red-400 mt-2 text-center">${canBuildResult.reason}</p>
            `;
        }

        // Descrizione effetto speciale
        const specialEffects = {
            'injury_reduction': '-1/-1/-2 giornate infortunio',
            'training_bonus': '+2/4/6% EXP allenamento',
            'tactical_bonus': 'Bonus tattico partite',
            'form_bonus': '-0.25/0.50/0.75 malus forma',
            'passive_income': '+50/100/150 CS/settimana',
            'prestige': 'Storia del Club',
            'away_bonus': '+0.50/1.00/1.50 trasferta',
            'market_discount': '-5/-10/-15% costo mercato'
        };
        const effectText = specialEffects[structure.specialEffect] || structure.description;

        return `
            <div class="special-structure-card p-3 rounded-lg border-2 ${cardClass} transition-all"
                 data-structure-id="${structureId}">
                <div class="flex items-start justify-between mb-2">
                    <span class="text-3xl">${structure.icon}</span>
                    ${statusBadge}
                </div>
                <h4 class="font-bold text-white text-sm">${structure.name}</h4>
                <p class="text-xs text-gray-400 mt-1">${effectText}</p>
                ${structure.bonus > 0 ? `
                    <p class="text-xs text-green-400 mt-1">
                        Bonus: +${isBuilt ? currentBonus.toFixed(2) : structure.bonus}
                        ${isBuilt && !isMaxed ? ` → +${window.Stadium.calculateStructureBonus(structureId, level + 1).toFixed(2)}` : ''}
                    </p>
                ` : ''}
                ${isBuilt ? `
                    <!-- Barra livello -->
                    <div class="flex gap-0.5 mt-2">
                        ${[1, 2, 3].map(lvl => `
                            <div class="flex-1 h-1.5 rounded ${lvl <= level ? 'bg-green-500' : 'bg-gray-700'}"></div>
                        `).join('')}
                    </div>
                ` : ''}
                ${actionButton}
            </div>
        `;
    },

    /**
     * Attacca gli event listener
     */
    attachEventListeners() {
        // Torna alla dashboard
        const btnBack = document.getElementById('btn-back-from-stadium');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                if (window.showScreen) {
                    window.showScreen(document.getElementById('app-content'));
                }
            });
        }

        // Upgrade spogliatoi
        const btnUpgradeLocker = document.getElementById('btn-upgrade-locker');
        if (btnUpgradeLocker) {
            btnUpgradeLocker.addEventListener('click', async () => {
                await this.handleLockerUpgrade();
            });
        }

        // Click sugli slot struttura (campo)
        const slots = document.querySelectorAll('.structure-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                const structureId = slot.dataset.structureId;
                const isBuilt = slot.dataset.isBuilt === 'true';
                const isLocked = slot.dataset.isLocked === 'true';
                const isMaxed = slot.dataset.isMaxed === 'true';
                const level = parseInt(slot.dataset.level) || 0;

                if (isBuilt) {
                    if (isMaxed) {
                        // Mostra opzione demolizione
                        const canDemolish = window.Stadium.canDemolish(structureId, this._stadiumData);
                        if (canDemolish.canDemolish) {
                            this.showDemolishConfirmModal(structureId);
                        }
                    } else {
                        // Mostra opzione upgrade o demolizione
                        this.showUpgradeOrDemolishModal(structureId);
                    }
                    return;
                }

                if (isLocked) return;

                this.showBuildConfirmModal(structureId);
            });
        });

        // Pulsanti costruisci nelle card strutture speciali
        const buildBtns = document.querySelectorAll('.structure-build-btn');
        buildBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const structureId = btn.dataset.structureId;
                this.showBuildConfirmModal(structureId);
            });
        });

        // Pulsanti upgrade nelle card strutture speciali
        const upgradeBtns = document.querySelectorAll('.structure-upgrade-btn');
        upgradeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const structureId = btn.dataset.structureId;
                this.showUpgradeConfirmModal(structureId);
            });
        });

        // Modal conferma costruzione
        const btnConfirm = document.getElementById('btn-confirm-build');
        const btnCancel = document.getElementById('btn-cancel-build');
        const buildModal = document.getElementById('stadium-confirm-modal');

        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                buildModal?.classList.add('hidden');
            });
        }

        if (btnConfirm) {
            btnConfirm.addEventListener('click', async () => {
                await this.handleBuildConfirm();
            });
        }

        buildModal?.addEventListener('click', (e) => {
            if (e.target === buildModal) {
                buildModal.classList.add('hidden');
            }
        });

        // Modal conferma demolizione
        const btnConfirmDemolish = document.getElementById('btn-confirm-demolish');
        const btnCancelDemolish = document.getElementById('btn-cancel-demolish');
        const demolishModal = document.getElementById('stadium-demolish-modal');

        if (btnCancelDemolish) {
            btnCancelDemolish.addEventListener('click', () => {
                demolishModal?.classList.add('hidden');
            });
        }

        if (btnConfirmDemolish) {
            btnConfirmDemolish.addEventListener('click', async () => {
                await this.handleDemolishConfirm();
            });
        }

        demolishModal?.addEventListener('click', (e) => {
            if (e.target === demolishModal) {
                demolishModal.classList.add('hidden');
            }
        });

        // Modal upgrade
        const btnConfirmUpgrade = document.getElementById('btn-confirm-upgrade');
        const btnCancelUpgrade = document.getElementById('btn-cancel-upgrade');
        const btnDemolishFromUpgrade = document.getElementById('btn-demolish-from-upgrade');
        const upgradeModal = document.getElementById('stadium-upgrade-modal');

        if (btnCancelUpgrade) {
            btnCancelUpgrade.addEventListener('click', () => {
                upgradeModal?.classList.add('hidden');
            });
        }

        if (btnConfirmUpgrade) {
            btnConfirmUpgrade.addEventListener('click', async () => {
                await this.handleUpgradeConfirm();
            });
        }

        if (btnDemolishFromUpgrade) {
            btnDemolishFromUpgrade.addEventListener('click', () => {
                const structureId = upgradeModal?.dataset.structureId;
                upgradeModal?.classList.add('hidden');
                if (structureId) {
                    this.showDemolishConfirmModal(structureId);
                }
            });
        }

        upgradeModal?.addEventListener('click', (e) => {
            if (e.target === upgradeModal) {
                upgradeModal.classList.add('hidden');
            }
        });
    },

    /**
     * Mostra il modal di conferma costruzione
     * @param {string} structureId - ID struttura
     */
    showBuildConfirmModal(structureId) {
        const structure = window.Stadium.STRUCTURES[structureId];
        if (!structure) return;

        const modal = document.getElementById('stadium-confirm-modal');
        const title = document.getElementById('modal-structure-title');
        const info = document.getElementById('modal-structure-info');
        const errorMsg = document.getElementById('modal-error-message');

        title.textContent = `Costruisci ${structure.name}`;

        const budget = this._teamData?.budget || 0;
        const buildCost = window.Stadium.getUpgradeCost(structureId, 1);
        const canAfford = budget >= buildCost;
        const maxLevel = structure.maxLevel || window.Stadium.MAX_STRUCTURE_LEVEL;

        info.innerHTML = `
            <div class="text-center mb-4">
                <span class="text-5xl">${structure.icon}</span>
            </div>
            <div class="bg-gray-800 rounded-lg p-4 space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Struttura:</span>
                    <span class="text-white font-bold">${structure.name}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Descrizione:</span>
                    <span class="text-gray-300 text-sm">${structure.description}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Costo Lv.1:</span>
                    <span class="${canAfford ? 'text-yellow-400' : 'text-red-400'} font-bold">${buildCost} CS</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Bonus Casa Lv.1:</span>
                    <span class="text-green-400 font-bold">+${structure.bonus}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Livello Massimo:</span>
                    <span class="text-blue-400 font-bold">Lv.${maxLevel}</span>
                </div>
                <div class="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span class="text-gray-400">Il tuo budget:</span>
                    <span class="${canAfford ? 'text-green-400' : 'text-red-400'} font-bold">${budget} CS</span>
                </div>
            </div>
            <p class="text-xs text-gray-500 text-center mt-2">Potrai migliorare la struttura fino a Lv.${maxLevel}</p>
        `;

        if (!canAfford) {
            errorMsg.textContent = 'Fondi insufficienti!';
        } else {
            errorMsg.textContent = '';
        }

        // Salva l'ID per il confirm
        modal.dataset.structureId = structureId;

        modal.classList.remove('hidden');
    },

    /**
     * Gestisce la conferma di costruzione
     */
    async handleBuildConfirm() {
        const modal = document.getElementById('stadium-confirm-modal');
        const structureId = modal?.dataset.structureId;
        const btnConfirm = document.getElementById('btn-confirm-build');
        const errorMsg = document.getElementById('modal-error-message');

        if (!structureId) return;

        btnConfirm.disabled = true;
        btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Costruendo...';

        const result = await window.Stadium.buildStructure(
            this._teamId,
            structureId,
            this._teamData?.budget || 0
        );

        if (result.success) {
            // Aggiorna dati locali
            this._stadiumData = window.Stadium._currentStadium;
            this._teamData.budget -= result.costPaid;

            // Aggiorna anche InterfacciaCore per sincronizzare la dashboard
            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.budget = this._teamData.budget;
            }

            // Mostra messaggio successo
            this.showMessage(`${result.structure.name} costruito! Bonus casa: +${result.newBonus.toFixed(2)}`, 'success');

            // Chiudi modal e re-render
            modal.classList.add('hidden');
            this.render();

        } else {
            errorMsg.textContent = result.error;
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = 'Costruisci';
        }
    },

    /**
     * Mostra il modal di conferma demolizione
     * @param {string} structureId - ID struttura
     */
    showDemolishConfirmModal(structureId) {
        const structure = window.Stadium.STRUCTURES[structureId];
        if (!structure) return;

        const modal = document.getElementById('stadium-demolish-modal');
        const title = document.getElementById('demolish-modal-title');
        const info = document.getElementById('demolish-modal-info');
        const errorMsg = document.getElementById('demolish-error-message');

        const level = window.Stadium.getStructureLevel(structureId, this._stadiumData);
        const currentBonus = window.Stadium.calculateStructureBonus(structureId, level);

        // Calcola rimborso totale (50% di tutto l'investito)
        let totalInvested = 0;
        for (let lvl = 1; lvl <= level; lvl++) {
            totalInvested += window.Stadium.getUpgradeCost(structureId, lvl);
        }
        const refund = Math.floor(totalInvested / 2);

        title.textContent = `Demolisci ${structure.name}`;

        info.innerHTML = `
            <div class="text-center mb-4">
                <span class="text-5xl">${structure.icon}</span>
                <span class="block text-lg font-bold text-white mt-2">Livello ${level}</span>
            </div>
            <div class="bg-gray-800 rounded-lg p-4 space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Struttura:</span>
                    <span class="text-white font-bold">${structure.name}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Bonus attuale:</span>
                    <span class="text-green-400 font-bold">+${currentBonus.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Totale investito:</span>
                    <span class="text-gray-300">${totalInvested} CS</span>
                </div>
                <div class="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span class="text-gray-400">Rimborso (50%):</span>
                    <span class="text-yellow-400 font-bold">+${refund} CS</span>
                </div>
            </div>
            <p class="text-center text-red-300 text-sm mt-3">
                Perderai tutti i livelli della struttura!
            </p>
        `;

        errorMsg.textContent = '';

        // Salva l'ID per il confirm
        modal.dataset.structureId = structureId;

        modal.classList.remove('hidden');
    },

    /**
     * Mostra il modal per upgrade o demolizione
     * @param {string} structureId - ID struttura
     */
    showUpgradeOrDemolishModal(structureId) {
        // Usa direttamente il modal upgrade
        this.showUpgradeConfirmModal(structureId);
    },

    /**
     * Mostra il modal di conferma upgrade
     * @param {string} structureId - ID struttura
     */
    showUpgradeConfirmModal(structureId) {
        const structure = window.Stadium.STRUCTURES[structureId];
        if (!structure) return;

        const modal = document.getElementById('stadium-upgrade-modal');
        const title = document.getElementById('upgrade-modal-title');
        const info = document.getElementById('upgrade-modal-info');
        const errorMsg = document.getElementById('upgrade-error-message');
        const btnUpgrade = document.getElementById('btn-confirm-upgrade');
        const btnDemolish = document.getElementById('btn-demolish-from-upgrade');

        const level = window.Stadium.getStructureLevel(structureId, this._stadiumData);
        const maxLevel = structure.maxLevel || window.Stadium.MAX_STRUCTURE_LEVEL;
        const budget = this._teamData?.budget || 0;

        const currentBonus = window.Stadium.calculateStructureBonus(structureId, level);
        const nextBonus = window.Stadium.calculateStructureBonus(structureId, level + 1);
        const upgradeCost = window.Stadium.getUpgradeCost(structureId, level + 1);
        const canAfford = budget >= upgradeCost;

        const canDemolishResult = window.Stadium.canDemolish(structureId, this._stadiumData);

        title.textContent = `${structure.name} - Livello ${level}`;

        info.innerHTML = `
            <div class="text-center mb-4">
                <span class="text-5xl">${structure.icon}</span>
                <!-- Barra livello -->
                <div class="flex gap-1 justify-center mt-3 max-w-32 mx-auto">
                    ${[1, 2, 3].map(lvl => `
                        <div class="flex-1 h-2 rounded ${lvl <= level ? 'bg-green-500' : lvl === level + 1 ? 'bg-blue-500/50' : 'bg-gray-700'}"></div>
                    `).join('')}
                </div>
                <p class="text-xs text-gray-500 mt-1">Lv.${level} / ${maxLevel}</p>
            </div>
            <div class="bg-gray-800 rounded-lg p-4 space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Bonus attuale:</span>
                    <span class="text-green-400 font-bold">+${currentBonus.toFixed(2)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-400">Bonus Lv.${level + 1}:</span>
                    <span class="text-blue-400 font-bold">+${nextBonus.toFixed(2)} <span class="text-xs text-green-400">(+${(nextBonus - currentBonus).toFixed(2)})</span></span>
                </div>
                <div class="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span class="text-gray-400">Costo upgrade:</span>
                    <span class="${canAfford ? 'text-yellow-400' : 'text-red-400'} font-bold">${upgradeCost} CS</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Il tuo budget:</span>
                    <span class="${canAfford ? 'text-green-400' : 'text-red-400'} font-bold">${budget} CS</span>
                </div>
            </div>
        `;

        // Configura pulsante upgrade
        if (canAfford) {
            btnUpgrade.disabled = false;
            btnUpgrade.className = 'bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition';
            btnUpgrade.innerHTML = `Migliora a Lv.${level + 1} - ${upgradeCost} CS`;
        } else {
            btnUpgrade.disabled = true;
            btnUpgrade.className = 'bg-gray-600 cursor-not-allowed text-white font-bold py-3 rounded-lg';
            btnUpgrade.innerHTML = `Fondi insufficienti (${upgradeCost} CS)`;
        }

        // Configura pulsante demolisci
        if (canDemolishResult.canDemolish) {
            btnDemolish.disabled = false;
            btnDemolish.className = 'bg-red-600/50 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition text-sm';
        } else {
            btnDemolish.disabled = true;
            btnDemolish.className = 'bg-gray-700 cursor-not-allowed text-gray-500 font-bold py-2 rounded-lg text-sm';
            btnDemolish.title = canDemolishResult.reason;
        }

        errorMsg.textContent = '';

        // Salva l'ID per il confirm
        modal.dataset.structureId = structureId;

        modal.classList.remove('hidden');
    },

    /**
     * Gestisce la conferma di upgrade
     */
    async handleUpgradeConfirm() {
        const modal = document.getElementById('stadium-upgrade-modal');
        const structureId = modal?.dataset.structureId;
        const btnConfirm = document.getElementById('btn-confirm-upgrade');
        const errorMsg = document.getElementById('upgrade-error-message');

        if (!structureId) return;

        const originalText = btnConfirm.innerHTML;
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Migliorando...';

        const result = await window.Stadium.upgradeStructure(
            this._teamId,
            structureId,
            this._teamData?.budget || 0
        );

        if (result.success) {
            // Aggiorna dati locali
            this._stadiumData = window.Stadium._currentStadium;
            this._teamData.budget -= result.costPaid;

            // Aggiorna anche InterfacciaCore per sincronizzare la dashboard
            if (window.InterfacciaCore?.currentTeamData) {
                window.InterfacciaCore.currentTeamData.budget = this._teamData.budget;
            }

            // Mostra messaggio successo
            const maxedText = result.maxed ? ' (LIVELLO MAX!)' : '';
            this.showMessage(
                `${result.structure.name} migliorato a Lv.${result.newLevel}${maxedText}! Bonus casa: +${result.newBonus.toFixed(2)}`,
                'success'
            );

            // Chiudi modal e re-render
            modal.classList.add('hidden');
            this.render();

        } else {
            errorMsg.textContent = result.error;
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = originalText;
        }
    },

    /**
     * Gestisce la conferma di demolizione
     */
    async handleDemolishConfirm() {
        const modal = document.getElementById('stadium-demolish-modal');
        const structureId = modal?.dataset.structureId;
        const btnConfirm = document.getElementById('btn-confirm-demolish');
        const errorMsg = document.getElementById('demolish-error-message');

        if (!structureId) return;

        btnConfirm.disabled = true;
        btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Demolendo...';

        const result = await window.Stadium.demolishStructure(
            this._teamId,
            structureId
        );

        if (result.success) {
            // Aggiorna dati locali
            this._stadiumData = window.Stadium._currentStadium;
            this._teamData.budget += result.refund;

            // Mostra messaggio successo
            this.showMessage(`${result.structure.name} demolito! Rimborsati ${result.refund} CS. Bonus casa: +${result.newBonus.toFixed(2)}`, 'success');

            // Chiudi modal e re-render
            modal.classList.add('hidden');
            this.render();

        } else {
            errorMsg.textContent = result.error;
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = 'Demolisci';
        }
    },

    /**
     * Gestisce l'upgrade degli spogliatoi
     */
    async handleLockerUpgrade() {
        const btn = document.getElementById('btn-upgrade-locker');
        if (!btn) return;

        // Verifica possibilita upgrade
        const budget = this._teamData?.budget || 0;
        const canUpgrade = window.Stadium.canUpgradeLockerRoom(budget, this._stadiumData);

        if (!canUpgrade.canUpgrade) {
            this.showMessage(canUpgrade.reason, 'error');
            return;
        }

        // Disabilita pulsante
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Costruendo...';

        try {
            const result = await window.Stadium.upgradeLockerRoom(this._teamId, budget);

            if (result.success) {
                // Aggiorna dati locali
                this._stadiumData = window.Stadium._currentStadium;
                this._teamData.budget -= result.cost;

                // Aggiorna anche InterfacciaCore per sincronizzare la dashboard
                if (window.InterfacciaCore?.currentTeamData) {
                    window.InterfacciaCore.currentTeamData.budget = this._teamData.budget;
                }

                // Aggiorna anche il locker room nei dati team per il calcolo EXP
                if (!this._teamData.stadium) {
                    this._teamData.stadium = {};
                }
                this._teamData.stadium.lockerRoom = {
                    level: result.newLevel,
                    expBonus: result.expBonus
                };

                // Mostra messaggio successo
                const bonusPercentage = Math.round(result.expBonus * 100);
                this.showMessage(
                    `Spogliatoi migliorati al livello ${result.newLevel}! Bonus EXP: +${bonusPercentage}%`,
                    'success'
                );

                // Re-render
                this.render();

            } else {
                this.showMessage(result.error, 'error');
                btn.disabled = false;
                btn.innerHTML = `<span>Migliora</span><span class="text-yellow-300">${window.Stadium.getLockerRoom(this._stadiumData).nextCost} CS</span>`;
            }

        } catch (error) {
            console.error('[StadiumUI] Errore upgrade spogliatoi:', error);
            this.showMessage('Errore durante l\'upgrade', 'error');
            btn.disabled = false;
            const locker = window.Stadium.getLockerRoom(this._stadiumData);
            btn.innerHTML = `<span>${locker.level === 0 ? 'Costruisci' : 'Migliora'}</span><span class="text-yellow-300">${locker.nextCost} CS</span>`;
        }
    },

    /**
     * Mostra un messaggio di feedback
     */
    showMessage(text, type = 'info') {
        const msgEl = document.getElementById('stadium-message');
        if (!msgEl) return;

        const colors = {
            success: 'text-green-400',
            error: 'text-red-400',
            info: 'text-blue-400',
            warning: 'text-yellow-400'
        };

        msgEl.textContent = text;
        msgEl.className = `text-center mt-4 text-sm ${colors[type] || colors.info}`;

        setTimeout(() => {
            msgEl.textContent = '';
        }, 4000);
    },

    /**
     * Escape HTML per prevenire XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

console.log("Modulo stadium-ui.js caricato.");
