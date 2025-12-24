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
            <div class="p-4 md:p-6 pb-32">
                <!-- Header -->
                <div class="mb-4">
                    <h2 class="text-xl md:text-2xl font-bold text-green-400 flex items-center gap-2">
                        <span class="text-2xl">🏟️</span>
                        Stadio di ${this.escapeHtml(teamName)}
                    </h2>
                </div>

                <!-- Box Allenatore (nascosto) -->
                <!-- ${this.renderCoachBox()} -->

                <!-- Sezione Spogliatoi (compatta per mobile) -->
                ${this.renderLockerRoomSection()}

                <!-- Campo da Calcio con Strutture -->
                <div id="stadium-field-box" class="rounded-xl border" style="background: rgba(17, 24, 39, 0.6); border-radius: 12px; padding: 12px;">
                    ${this.renderStadiumField()}
                </div>

                <!-- Legenda + Bonus Casa (collapsible) -->
                <div class="mt-4 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <!-- Header cliccabile -->
                    <button id="stadium-legend-toggle" class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition">
                        <div class="flex items-center gap-3">
                            <span class="text-gray-400">ℹ️</span>
                            <span class="text-sm font-bold text-gray-300">Legenda e Bonus</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-green-400 font-bold text-sm" id="total-bonus-display">+${(this._stadiumData?.totalBonus || 0).toFixed(2)}</span>
                            <span id="stadium-legend-arrow" class="text-gray-400 transition-transform">▼</span>
                        </div>
                    </button>
                    <!-- Contenuto collassabile (nascosto di default) -->
                    <div id="stadium-legend-content" class="hidden px-4 pb-4 border-t border-gray-700">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3">
                            <!-- Legenda -->
                            <div class="flex flex-wrap gap-3 text-sm">
                                <div class="flex items-center gap-1.5">
                                    <div class="w-5 h-5 rounded bg-green-700 border-2 border-green-400 flex items-center justify-center text-[10px] text-white font-bold">1</div>
                                    <span class="text-gray-400 text-xs">Lv.1</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <div class="w-5 h-5 rounded bg-green-700 border-2 border-blue-400 flex items-center justify-center text-[10px] text-white font-bold">2</div>
                                    <span class="text-gray-400 text-xs">Lv.2</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <div class="w-5 h-5 rounded bg-gradient-to-br from-yellow-700 to-yellow-900 border-2 border-purple-400 flex items-center justify-center text-[10px] text-yellow-300 font-bold">M</div>
                                    <span class="text-gray-400 text-xs">MAX</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <div class="w-5 h-5 rounded bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center text-[10px]">+</div>
                                    <span class="text-gray-400 text-xs">Disponibile</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <div class="w-5 h-5 rounded bg-gray-800 border-2 border-red-900 flex items-center justify-center text-[10px] opacity-50">🔒</div>
                                    <span class="text-gray-400 text-xs">Bloccato</span>
                                </div>
                            </div>
                            <!-- Bonus Casa grande -->
                            <div class="bg-gray-900 rounded-lg px-4 py-2 border-2 border-green-500 text-center">
                                <p class="text-[10px] text-gray-400">Bonus Casa Totale</p>
                                <p class="text-xl font-bold text-green-400">+${(this._stadiumData?.totalBonus || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Stadio (in fondo) -->
                <div class="mt-4 grid grid-cols-2 gap-3 mb-20">
                    <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <p class="text-gray-400 text-xs">Strutture Costruite</p>
                        <p class="text-xl font-bold text-white">${stats.built} / ${stats.total}</p>
                        <div class="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                            <div class="bg-green-500 h-1.5 rounded-full transition-all" style="width: ${stats.percentage}%"></div>
                        </div>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-3 border border-blue-600">
                        <p class="text-gray-400 text-xs">Livelli Totali</p>
                        <p class="text-xl font-bold text-blue-400">${stats.totalLevels} / ${stats.maxPossibleLevels}</p>
                        <div class="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                            <div class="bg-blue-500 h-1.5 rounded-full transition-all" style="width: ${stats.levelPercentage}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Messaggio feedback -->
                <p id="stadium-message" class="text-center mt-4 text-sm mb-16"></p>
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
                </div>
            </div>
        `;
    },

    /**
     * Renderizza la sezione spogliatoi con upgrade (compatta per mobile)
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
            <div id="locker-room-box" class="mb-4 rounded-xl p-3 border" style="background: rgba(17, 24, 39, 0.6); border-radius: 12px;">
                <!-- Layout compatto: tutto in una riga -->
                <div class="flex items-center gap-3">
                    <!-- Icona -->
                    <div class="text-3xl sm:text-4xl shrink-0">${locker.level > 0 ? '🚿' : '🚧'}</div>

                    <!-- Info + Barra -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="text-sm sm:text-base font-bold text-white">Spogliatoi</h3>
                            ${isMaxed ? '<span class="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full">MAX</span>' : ''}
                            <span class="text-xs ${locker.level > 0 ? 'text-green-400' : 'text-gray-500'}">
                                ${locker.level > 0 ? `+${locker.level * 5}% EXP` : ''}
                            </span>
                        </div>
                        <!-- Barra Livello compatta -->
                        <div class="flex gap-0.5 mt-1.5">
                            ${[1, 2, 3, 4, 5].map(lvl => `
                                <div class="flex-1 h-2 rounded ${lvl <= locker.level ? 'bg-gradient-to-r from-blue-500 to-green-500' : 'bg-gray-700'}"></div>
                            `).join('')}
                        </div>
                        <p class="text-[10px] text-gray-500 mt-0.5">
                            ${locker.level === 0 ? 'Non costruito' : isMaxed ? 'Livello MAX' : `Lv.${locker.level}/5`}
                        </p>
                    </div>

                    <!-- Pulsante Upgrade -->
                    <div class="shrink-0">
                        ${isMaxed ? `
                            <span class="text-yellow-400 text-xs font-bold">MAX</span>
                        ` : `
                            <button id="btn-upgrade-locker"
                                    class="${canUpgrade.canUpgrade
                                        ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                                        : 'bg-gray-600 cursor-not-allowed opacity-50'}
                                    text-white font-bold py-1.5 px-3 rounded-lg transition text-xs sm:text-sm"
                                    ${canUpgrade.canUpgrade ? '' : 'disabled'}>
                                <span class="hidden sm:inline">${locker.level === 0 ? 'Costruisci' : 'Migliora'}</span>
                                <span class="text-yellow-300 ml-1">${locker.nextCost} CS</span>
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

        // Helper per creare uno slot struttura compatto
        const createSlot = (structureId, size = 'normal') => {
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

            // Dimensioni in base al tipo
            const sizeClasses = {
                small: 'w-10 h-10 sm:w-12 sm:h-12',
                normal: 'w-12 h-12 sm:w-14 sm:h-14',
                wide: 'w-full h-10 sm:h-12'
            };

            let slotClass, content, title;

            if (isBuilt) {
                const borderColor = levelBorderColors[level] || 'border-green-400';
                const canUpgradeResult = window.Stadium.canUpgradeStructure(structureId, budget, this._stadiumData);

                if (isMaxed) {
                    slotClass = `bg-gradient-to-br from-yellow-700 to-yellow-900 ${borderColor} cursor-pointer`;
                    title = `${structure.name} Lv.MAX - Bonus: +${currentBonus.toFixed(2)}`;
                } else if (canUpgradeResult.canUpgrade) {
                    slotClass = `bg-green-700 ${borderColor} hover:border-blue-400 hover:bg-blue-900/50 cursor-pointer`;
                    title = `${structure.name} Lv.${level} - Clicca per migliorare (${canUpgradeResult.upgradeCost} CS)`;
                } else {
                    slotClass = `bg-green-700 ${borderColor} cursor-pointer`;
                    title = `${structure.name} Lv.${level} - +${currentBonus.toFixed(2)} bonus`;
                }

                content = size === 'wide' ? `
                    <span class="text-lg sm:text-xl">${structure.icon}</span>
                    <span class="text-xs font-bold ${isMaxed ? 'text-yellow-300' : 'text-white'} ml-1">
                        ${isMaxed ? 'MAX' : 'Lv.' + level}
                    </span>
                ` : `
                    <span class="text-lg sm:text-xl">${structure.icon}</span>
                    <span class="text-[10px] font-bold ${isMaxed ? 'text-yellow-300' : 'text-white'}">
                        ${isMaxed ? 'M' : level}
                    </span>
                `;
            } else if (isLocked) {
                slotClass = 'bg-gray-800 border-red-900 opacity-50 cursor-not-allowed';
                content = `<span class="text-sm">🔒</span>`;
                title = `${structure.name} - ${canBuildResult.reason}`;
            } else {
                const buildCost = window.Stadium.getUpgradeCost(structureId, 1);
                slotClass = 'bg-gray-700 border-dashed border-gray-500 hover:border-green-400 hover:bg-gray-600 cursor-pointer';
                content = `<span class="text-base opacity-50">${structure.icon}</span>`;
                title = `${structure.name} - ${buildCost} CS (+${structure.bonus} bonus)`;
            }

            const flexDirection = size === 'wide' ? 'flex-row' : 'flex-col';

            return `
                <div class="structure-slot ${sizeClasses[size]} rounded-lg border-2 ${slotClass}
                            flex ${flexDirection} items-center justify-center transition-all shrink-0"
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
            <div class="stadium-layout relative overflow-x-auto">
                <!-- Layout Stadio Compatto Orizzontale -->

                <!-- Container principale con aspect ratio fisso -->
                <div class="min-w-[320px] max-w-[600px] mx-auto">

                    <!-- Riga superiore: Fari + Tabelloni + Tribuna Nord -->
                    <div class="flex items-center justify-between gap-1 mb-1">
                        <div class="flex items-center gap-1">
                            ${createSlot('scoreboard_west', 'small')}
                            ${createSlot('light_nw', 'small')}
                        </div>
                        <div class="flex-1 mx-1">
                            ${createSlot('tribune_north', 'wide')}
                        </div>
                        <div class="flex items-center gap-1">
                            ${createSlot('light_ne', 'small')}
                            ${createSlot('scoreboard_east', 'small')}
                        </div>
                    </div>

                    <!-- Area Media Nord -->
                    <div class="flex justify-center mb-1">
                        ${createSlot('media_north', 'small')}
                    </div>

                    <!-- Campo centrale con tribune laterali -->
                    <div class="flex items-stretch gap-1 my-1">
                        <!-- Tribuna Ovest -->
                        <div class="flex items-center">
                            ${createSlot('tribune_west', 'normal')}
                        </div>

                        <!-- Campo da gioco -->
                        <div class="relative bg-gradient-to-b from-green-700 to-green-800 rounded-lg border-2 border-white/80 flex-1 min-h-[120px] sm:min-h-[140px]">
                            <!-- Linee del campo -->
                            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div class="absolute top-0 bottom-0 left-1/2 w-px bg-white/50"></div>
                                <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-white/50"></div>
                            </div>

                            <!-- Aree di rigore -->
                            <div class="absolute left-0 top-1/2 -translate-y-1/2 w-6 sm:w-8 h-14 sm:h-16 border border-white/50 border-l-0 rounded-r"></div>
                            <div class="absolute right-0 top-1/2 -translate-y-1/2 w-6 sm:w-8 h-14 sm:h-16 border border-white/50 border-r-0 rounded-l"></div>

                            <!-- Panchine dentro il campo -->
                            <div class="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-4">
                                ${createSlot('bench_left', 'small')}
                                ${createSlot('bench_right', 'small')}
                            </div>
                        </div>

                        <!-- Tribuna Est -->
                        <div class="flex items-center">
                            ${createSlot('tribune_east', 'normal')}
                        </div>
                    </div>

                    <!-- Area Media Sud -->
                    <div class="flex justify-center mt-1">
                        ${createSlot('media_south', 'small')}
                    </div>

                    <!-- Riga inferiore: Fari + Tribuna Sud -->
                    <div class="flex items-center justify-between gap-1 mt-1">
                        <div class="flex items-center gap-1">
                            <div class="w-10 h-10 sm:w-12 sm:h-12"></div>
                            ${createSlot('light_sw', 'small')}
                        </div>
                        <div class="flex-1 mx-1">
                            ${createSlot('tribune_south', 'wide')}
                        </div>
                        <div class="flex items-center gap-1">
                            ${createSlot('light_se', 'small')}
                            <div class="w-10 h-10 sm:w-12 sm:h-12"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sezione Strutture Speciali - Mobile-First Design -->
            <div class="mt-4 space-y-3">

                <!-- Premium (accent amber) -->
                <div class="rounded-xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-gray-900/80 to-gray-900">
                    <div class="px-3 py-2 bg-gradient-to-r from-amber-900/60 to-transparent flex items-center gap-2">
                        <span class="text-lg">⭐</span>
                        <h3 class="text-xs font-black text-amber-400 uppercase tracking-wider">Premium</h3>
                        <span class="text-[9px] text-amber-500/60 ml-auto">Strutture Esclusive</span>
                    </div>
                    <div class="p-2">
                        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            ${this.renderSpecialStructureCard('stadium_roof', 'amber')}
                            ${this.renderSpecialStructureCard('giant_screen', 'amber')}
                            ${this.renderSpecialStructureCard('ultras_section', 'amber')}
                            ${this.renderSpecialStructureCard('scouting_center', 'amber')}
                            ${this.renderSpecialStructureCard('observers_center', 'amber')}
                        </div>
                    </div>
                </div>

                <!-- Facilities (accent cyan) -->
                <div class="rounded-xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-gray-900/80 to-gray-900">
                    <div class="px-3 py-2 bg-gradient-to-r from-cyan-900/60 to-transparent flex items-center gap-2">
                        <span class="text-lg">🏋️</span>
                        <h3 class="text-xs font-black text-cyan-400 uppercase tracking-wider">Facilities</h3>
                        <span class="text-[9px] text-cyan-500/60 ml-auto">Allenamento & Recupero</span>
                    </div>
                    <div class="p-2">
                        <div class="grid grid-cols-2 gap-2">
                            ${this.renderSpecialStructureCard('medical_center', 'cyan')}
                            ${this.renderSpecialStructureCard('gym', 'cyan')}
                            ${this.renderSpecialStructureCard('tactical_room', 'cyan')}
                            ${this.renderSpecialStructureCard('warmup_area', 'cyan')}
                        </div>
                    </div>
                </div>

                <!-- Commerciali (accent emerald) -->
                <div class="rounded-xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-gray-900/80 to-gray-900">
                    <div class="px-3 py-2 bg-gradient-to-r from-emerald-900/60 to-transparent flex items-center gap-2">
                        <span class="text-lg">💰</span>
                        <h3 class="text-xs font-black text-emerald-400 uppercase tracking-wider">Commerciale</h3>
                        <span class="text-[9px] text-emerald-500/60 ml-auto">Ricavi & Immagine</span>
                    </div>
                    <div class="p-2">
                        <div class="grid grid-cols-3 gap-2">
                            ${this.renderSpecialStructureCard('shop', 'emerald')}
                            ${this.renderSpecialStructureCard('museum', 'emerald')}
                            ${this.renderSpecialStructureCard('conference_room', 'emerald')}
                        </div>
                    </div>
                </div>

            </div>
        `;
    },

    /**
     * Renderizza una card per struttura speciale (Mobile-First)
     * @param {string} structureId - ID struttura
     * @param {string} accentColor - Colore accent: 'amber', 'cyan', 'emerald'
     */
    renderSpecialStructureCard(structureId, accentColor = 'amber') {
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

        // Palette colori per accent
        const colorPalette = {
            amber: {
                border: 'border-amber-500/50',
                borderActive: 'border-amber-400',
                bg: 'from-amber-900/30',
                text: 'text-amber-400',
                badge: 'bg-amber-500 text-black',
                badgeLvl: 'bg-amber-600 text-white',
                bar: 'bg-amber-500',
                btn: 'bg-amber-600 hover:bg-amber-500',
                btnDisabled: 'bg-amber-900/50'
            },
            cyan: {
                border: 'border-cyan-500/50',
                borderActive: 'border-cyan-400',
                bg: 'from-cyan-900/30',
                text: 'text-cyan-400',
                badge: 'bg-cyan-500 text-black',
                badgeLvl: 'bg-cyan-600 text-white',
                bar: 'bg-cyan-500',
                btn: 'bg-cyan-600 hover:bg-cyan-500',
                btnDisabled: 'bg-cyan-900/50'
            },
            emerald: {
                border: 'border-emerald-500/50',
                borderActive: 'border-emerald-400',
                bg: 'from-emerald-900/30',
                text: 'text-emerald-400',
                badge: 'bg-emerald-500 text-black',
                badgeLvl: 'bg-emerald-600 text-white',
                bar: 'bg-emerald-500',
                btn: 'bg-emerald-600 hover:bg-emerald-500',
                btnDisabled: 'bg-emerald-900/50'
            }
        };

        const colors = colorPalette[accentColor] || colorPalette.amber;

        // Determina stato e styling
        let cardClass, statusContent, actionContent;

        if (isBuilt) {
            if (isMaxed) {
                // MAX LEVEL
                cardClass = `bg-gradient-to-br from-yellow-900/40 to-gray-900/60 border-2 border-yellow-500/70`;
                statusContent = `
                    <div class="absolute -top-1 -right-1">
                        <span class="bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">MAX</span>
                    </div>
                `;
                actionContent = `
                    <div class="mt-2 text-center">
                        <span class="text-yellow-400 text-[10px] font-bold">✨ Completo</span>
                    </div>
                `;
            } else {
                // BUILT - UPGRADEABLE
                const canAffordUpgrade = budget >= upgradeCost;
                cardClass = `bg-gradient-to-br ${colors.bg} to-gray-900/60 border ${colors.borderActive}`;
                statusContent = `
                    <div class="absolute -top-1 -right-1">
                        <span class="${colors.badgeLvl} text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">${level}</span>
                    </div>
                `;
                actionContent = `
                    <button class="structure-upgrade-btn w-full mt-2 ${canAffordUpgrade ? colors.btn : 'bg-gray-700 cursor-not-allowed opacity-60'}
                                   text-white text-[10px] font-bold py-1.5 rounded-lg transition active:scale-95"
                            data-structure-id="${structureId}"
                            ${canAffordUpgrade ? '' : 'disabled'}>
                        <span class="flex items-center justify-center gap-1">
                            <span>⬆️</span>
                            <span>${upgradeCost} CS</span>
                        </span>
                    </button>
                `;
            }
        } else if (canBuildResult.canBuild) {
            // NOT BUILT - AVAILABLE
            const canAfford = budget >= buildCost;
            cardClass = `bg-gradient-to-br from-gray-800/60 to-gray-900/80 border border-dashed ${colors.border} hover:${colors.borderActive}`;
            statusContent = `
                <div class="absolute -top-1 -right-1">
                    <span class="bg-gray-700 text-gray-400 text-[9px] px-1.5 py-0.5 rounded-full">—</span>
                </div>
            `;
            actionContent = `
                <button class="structure-build-btn w-full mt-2 ${canAfford ? colors.btn : 'bg-gray-700 cursor-not-allowed opacity-60'}
                               text-white text-[10px] font-bold py-1.5 rounded-lg transition active:scale-95"
                        data-structure-id="${structureId}"
                        ${canAfford ? '' : 'disabled'}>
                    <span class="flex items-center justify-center gap-1">
                        <span>🔨</span>
                        <span>${buildCost} CS</span>
                    </span>
                </button>
            `;
        } else {
            // LOCKED
            cardClass = `bg-gray-900/60 border border-red-900/40 opacity-50`;
            statusContent = `
                <div class="absolute -top-1 -right-1">
                    <span class="bg-red-900/80 text-red-300 text-[9px] px-1.5 py-0.5 rounded-full">🔒</span>
                </div>
            `;
            actionContent = `
                <div class="mt-2 text-center">
                    <span class="text-red-400/60 text-[9px]">Bloccato</span>
                </div>
            `;
        }

        // Barra livello (solo se costruito e non max)
        const levelBar = isBuilt ? `
            <div class="flex gap-0.5 mt-1.5">
                ${[1, 2, 3].map(lvl => `
                    <div class="flex-1 h-1 rounded-full ${lvl <= level ? (isMaxed ? 'bg-yellow-500' : colors.bar) : 'bg-gray-700/50'}"></div>
                `).join('')}
            </div>
        ` : '';

        return `
            <div class="special-structure-card relative flex-shrink-0 w-[85px] sm:w-auto p-2.5 rounded-xl ${cardClass} transition-all"
                 data-structure-id="${structureId}">
                ${statusContent}

                <!-- Icona -->
                <div class="text-center mb-1">
                    <span class="text-2xl sm:text-3xl drop-shadow-lg">${structure.icon}</span>
                </div>

                <!-- Nome -->
                <h4 class="font-bold ${colors.text} text-[10px] sm:text-[11px] leading-tight text-center truncate">${structure.name}</h4>

                <!-- Bonus -->
                ${structure.bonus > 0 ? `
                    <p class="text-[9px] text-green-400/80 text-center mt-0.5 font-semibold">
                        +${isBuilt ? currentBonus.toFixed(1) : structure.bonus}
                    </p>
                ` : ''}

                <!-- Barra livello -->
                ${levelBar}

                <!-- Action Button -->
                ${actionContent}
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

        // Toggle legenda
        const legendToggle = document.getElementById('stadium-legend-toggle');
        const legendContent = document.getElementById('stadium-legend-content');
        const legendArrow = document.getElementById('stadium-legend-arrow');
        if (legendToggle && legendContent) {
            legendToggle.addEventListener('click', () => {
                const isHidden = legendContent.classList.contains('hidden');
                legendContent.classList.toggle('hidden');
                if (legendArrow) {
                    legendArrow.style.transform = isHidden ? 'rotate(180deg)' : '';
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
