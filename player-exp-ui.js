//
// ====================================================================
// MODULO PLAYER-EXP-UI.JS (UI Sistema Esperienza)
// ====================================================================
// Gestisce la parte visuale del sistema EXP:
// - Notifiche level-up
// - Barra EXP riusabile
// - Animazioni
// ====================================================================
//

(function() {
    'use strict';

    // ========================================
    // NOTIFICHE LEVEL-UP
    // ========================================

    /**
     * Mostra una notifica toast per il level-up
     * @param {Object} player - Giocatore che ha fatto level-up
     * @param {number} oldLevel - Livello precedente
     * @param {number} newLevel - Nuovo livello
     */
    function showLevelUpNotification(player, oldLevel, newLevel) {
        if (!player) return;

        const playerName = player.nome || player.name || 'Giocatore';
        const levelsGained = newLevel - oldLevel;

        // Crea il container delle notifiche se non esiste
        let container = document.getElementById('exp-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'exp-notification-container';
            container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
            document.body.appendChild(container);
        }

        // Crea la notifica
        const notification = document.createElement('div');
        notification.className = 'exp-level-up-notification pointer-events-auto transform translate-x-full opacity-0 transition-all duration-300';
        notification.innerHTML = `
            <div class="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3 min-w-[200px] max-w-[calc(100vw-2rem)]">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                        <i class="fas fa-arrow-up text-yellow-800 text-lg"></i>
                    </div>
                </div>
                <div class="flex-1">
                    <div class="font-bold text-sm">LEVEL UP!</div>
                    <div class="text-yellow-100 text-sm">${playerName}</div>
                    <div class="text-yellow-200 text-xs">
                        Lv. ${oldLevel} → Lv. ${newLevel}
                        ${levelsGained > 1 ? `(+${levelsGained} livelli!)` : ''}
                    </div>
                </div>
                <button class="text-yellow-200 hover:text-white transition-colors" onclick="this.closest('.exp-level-up-notification').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(notification);

        // Animazione entrata
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
        });

        // Rimuovi dopo 5 secondi
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Mostra un modal dettagliato per level-up multipli
     * @param {Array} levelUpResults - Array di risultati level-up
     */
    function showMultipleLevelUpModal(levelUpResults) {
        if (!levelUpResults || levelUpResults.length === 0) return;

        // Filtra solo quelli che hanno fatto level-up
        const leveledUp = levelUpResults.filter(r => r.leveledUp);
        if (leveledUp.length === 0) return;

        // Se e solo uno, usa la notifica semplice
        if (leveledUp.length === 1) {
            const r = leveledUp[0];
            showLevelUpNotification(r.player, r.oldLevel, r.newLevel);
            return;
        }

        // Modal per level-up multipli
        const modal = document.createElement('div');
        modal.id = 'exp-level-up-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 transform scale-95 opacity-0 transition-all duration-300">
                <div class="text-center mb-4">
                    <div class="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-trophy text-yellow-900 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-yellow-400">Level Up!</h3>
                    <p class="text-gray-400 text-sm">${leveledUp.length} giocatori sono saliti di livello</p>
                </div>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                    ${leveledUp.filter(r => r && r.player).map(r => `
                        <div class="flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2">
                            <span class="text-white font-medium">${r.player.nome || r.player.name || 'Giocatore'}</span>
                            <span class="text-yellow-400 font-bold">
                                Lv. ${r.oldLevel || '?'} → ${r.newLevel || '?'}
                            </span>
                        </div>
                    `).join('')}
                </div>
                <button onclick="document.getElementById('exp-level-up-modal').remove()"
                        class="w-full mt-4 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold py-2 rounded-lg transition-colors">
                    Fantastico!
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Animazione entrata
        requestAnimationFrame(() => {
            modal.querySelector('.bg-gray-800').classList.remove('scale-95', 'opacity-0');
        });

        // Chiudi con click fuori
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // ========================================
    // BARRA EXP RIUSABILE
    // ========================================

    /**
     * Crea l'HTML per una barra EXP
     * @param {Object} player - Giocatore
     * @param {Object} options - Opzioni {showText, size, animated}
     * @returns {string} HTML della barra
     */
    function renderExpBar(player, options = {}) {
        const { showText = true, size = 'normal', animated = true } = options;

        if (!player) return '';

        // Assicura che PlayerExp sia disponibile
        if (!window.PlayerExp) {
            console.warn('[PlayerExpUI] PlayerExp non disponibile');
            return '';
        }

        const progress = window.PlayerExp.getExpProgress(player);
        const maxLevel = window.PlayerExp.getMaxLevel(player);

        // Verifica se admin puo' vedere il livello massimo segreto
        const isAdmin = window.InterfacciaCore?.isAdmin?.() || false;
        const adminCanViewSecret = isAdmin && window.FeatureFlags?.isEnabled('adminViewSecretMaxLevel');
        const hasSecretMaxLevel = player.secretMaxLevel !== undefined && player.secretMaxLevel !== null;
        const showSecretInfo = adminCanViewSecret && hasSecretMaxLevel;

        // Se al massimo livello
        if (progress.maxed || player.level >= maxLevel) {
            return `
                <div class="exp-bar-container ${size === 'small' ? 'text-xs' : 'text-sm'}">
                    <div class="w-full bg-gray-700 rounded-full ${size === 'small' ? 'h-1.5' : 'h-2'}">
                        <div class="bg-gradient-to-r from-yellow-500 to-yellow-400 ${size === 'small' ? 'h-1.5' : 'h-2'} rounded-full w-full"></div>
                    </div>
                    ${showText ? `<span class="text-yellow-400 font-medium mt-1 block">MAX LV. ${maxLevel}</span>` : ''}
                </div>
            `;
        }

        const barColorClass = progress.percentage >= 75
            ? 'from-yellow-500 to-yellow-400'
            : progress.percentage >= 50
                ? 'from-blue-500 to-blue-400'
                : 'from-blue-600 to-blue-500';

        const animationClass = animated ? 'transition-all duration-500' : '';

        // Info livello massimo segreto per admin
        const secretMaxLevelInfo = showSecretInfo
            ? `<span class="text-purple-400 ml-2" title="Livello massimo segreto">(Max: ${player.secretMaxLevel})</span>`
            : '';

        return `
            <div class="exp-bar-container ${size === 'small' ? 'text-xs' : 'text-sm'}">
                <div class="w-full bg-gray-700 rounded-full ${size === 'small' ? 'h-1.5' : 'h-2'} overflow-hidden">
                    <div class="bg-gradient-to-r ${barColorClass} ${size === 'small' ? 'h-1.5' : 'h-2'} rounded-full ${animationClass}"
                         style="width: ${progress.percentage}%"></div>
                </div>
                ${showText ? `
                    <div class="flex justify-between mt-1 text-gray-400">
                        <span>EXP: ${window.PlayerExp.formatExp(progress.current)} / ${window.PlayerExp.formatExp(progress.needed)}${secretMaxLevelInfo}</span>
                        <span>${progress.percentage}%</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Crea un elemento DOM per la barra EXP
     * @param {Object} player - Giocatore
     * @param {Object} options - Opzioni
     * @returns {HTMLElement} Elemento DOM
     */
    function createExpBarElement(player, options = {}) {
        const container = document.createElement('div');
        container.className = 'exp-bar-wrapper';
        container.innerHTML = renderExpBar(player, options);
        return container;
    }

    /**
     * Aggiorna una barra EXP esistente
     * @param {HTMLElement} container - Container della barra
     * @param {Object} player - Giocatore
     * @param {Object} options - Opzioni
     */
    function updateExpBar(container, player, options = {}) {
        if (!container || !player) return;
        container.innerHTML = renderExpBar(player, options);
    }

    // ========================================
    // WIDGET GIOCATORI VICINI AL LEVEL-UP
    // ========================================

    /**
     * Renderizza il widget dei giocatori vicini al level-up
     * @param {Object} teamData - Dati squadra
     * @param {number} threshold - Soglia percentuale (default 75)
     * @returns {string} HTML del widget
     */
    function renderNearLevelUpWidget(teamData, threshold = 75) {
        if (!window.PlayerExp) return '';

        const nearLevelUp = window.PlayerExp.getPlayersNearLevelUp(teamData, threshold);

        if (nearLevelUp.length === 0) {
            return '';
        }

        return `
            <div class="near-level-up-widget rounded-xl p-4 border border-green-500/50" style="background: rgba(17, 24, 39, 0.6);">
                <div class="flex items-center gap-2 mb-3">
                    <i class="fas fa-star text-yellow-400"></i>
                    <h4 class="text-white font-bold">Vicini al Level Up</h4>
                </div>
                <div class="space-y-2">
                    ${nearLevelUp.slice(0, 5).map(item => `
                        <div class="flex items-center gap-3 bg-gray-700 rounded-lg px-3 py-2">
                            <div class="flex-1">
                                <div class="text-white text-sm font-medium">${item.player.nome || item.player.name}</div>
                                <div class="text-gray-400 text-xs">Lv. ${item.player.level}</div>
                            </div>
                            <div class="w-24">
                                <div class="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                                    <div class="bg-gradient-to-r from-yellow-500 to-yellow-400 h-2 rounded-full transition-all duration-300"
                                         style="width: ${item.percentage}%"></div>
                                </div>
                                <div class="text-yellow-400 text-xs text-right mt-0.5">${item.percentage}%</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${nearLevelUp.length > 5 ? `
                    <div class="text-gray-500 text-xs text-center mt-2">
                        +${nearLevelUp.length - 5} altri giocatori
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ========================================
    // TOAST EXP GUADAGNATA
    // ========================================

    /**
     * Mostra un toast con l'EXP guadagnata
     * @param {number} totalExp - EXP totale guadagnata
     * @param {string} context - Contesto (es. "Partita completata")
     */
    function showExpGainedToast(totalExp, context = 'Partita completata') {
        if (totalExp <= 0) return;

        let container = document.getElementById('exp-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'exp-notification-container';
            container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'exp-gained-toast pointer-events-auto transform translate-x-full opacity-0 transition-all duration-300';
        toast.innerHTML = `
            <div class="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <div class="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                    <i class="fas fa-plus text-blue-800"></i>
                </div>
                <div>
                    <div class="font-bold text-sm">+${window.PlayerExp ? window.PlayerExp.formatExp(totalExp) : totalExp} EXP</div>
                    <div class="text-blue-200 text-xs">${context}</div>
                </div>
            </div>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========================================
    // ESPOSIZIONE MODULO
    // ========================================

    window.PlayerExpUI = {
        // Notifiche
        showLevelUpNotification,
        showMultipleLevelUpModal,
        showExpGainedToast,

        // Barra EXP
        renderExpBar,
        createExpBarElement,
        updateExpBar,

        // Widget
        renderNearLevelUpWidget
    };

    console.log('[OK] Modulo PlayerExpUI caricato.');

})();
