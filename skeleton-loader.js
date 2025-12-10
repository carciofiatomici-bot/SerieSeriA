//
// ====================================================================
// SKELETON-LOADER.JS - Sistema Skeleton Loading States
// ====================================================================
//

window.SkeletonLoader = {
    /**
     * Genera una linea skeleton
     * @param {string} width - Larghezza (es. 'full', '3/4', '1/2', '100px')
     * @param {string} height - Altezza (es. '4', '6', '8')
     */
    line(width = 'full', height = '4') {
        const widthClass = width.includes('px') || width.includes('%')
            ? `width: ${width}`
            : `w-${width}`;
        const style = width.includes('px') || width.includes('%') ? `style="${widthClass}"` : '';
        const wClass = !style ? widthClass : '';

        return `<div class="h-${height} ${wClass} bg-gray-700 rounded animate-pulse" ${style}></div>`;
    },

    /**
     * Genera un cerchio skeleton (per avatar)
     * @param {string} size - Dimensione (es. '8', '10', '12', '16')
     */
    circle(size = '10') {
        return `<div class="w-${size} h-${size} bg-gray-700 rounded-full animate-pulse flex-shrink-0"></div>`;
    },

    /**
     * Genera un rettangolo skeleton
     * @param {string} width - Larghezza
     * @param {string} height - Altezza
     */
    rect(width = 'full', height = '20') {
        return `<div class="w-${width} h-${height} bg-gray-700 rounded-lg animate-pulse"></div>`;
    },

    /**
     * Card giocatore skeleton
     */
    playerCard() {
        return `
            <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div class="flex items-center gap-3">
                    ${this.circle('12')}
                    <div class="flex-1 space-y-2">
                        ${this.line('3/4', '4')}
                        ${this.line('1/2', '3')}
                    </div>
                    ${this.rect('12', '6')}
                </div>
            </div>
        `;
    },

    /**
     * Lista giocatori skeleton
     * @param {number} count - Numero di card da mostrare
     */
    playerList(count = 5) {
        return `
            <div class="space-y-3">
                ${Array(count).fill(this.playerCard()).join('')}
            </div>
        `;
    },

    /**
     * Card squadra skeleton
     */
    teamCard() {
        return `
            <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div class="flex items-center gap-4">
                    ${this.circle('16')}
                    <div class="flex-1 space-y-2">
                        ${this.line('2/3', '5')}
                        ${this.line('1/3', '3')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Lista squadre skeleton
     */
    teamList(count = 4) {
        return `
            <div class="space-y-3">
                ${Array(count).fill(this.teamCard()).join('')}
            </div>
        `;
    },

    /**
     * Tabella classifica skeleton
     */
    leaderboardTable(rows = 8) {
        const row = `
            <div class="flex items-center gap-4 p-3 bg-gray-800 rounded">
                <div class="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
                ${this.circle('10')}
                <div class="flex-1">
                    ${this.line('1/2', '4')}
                </div>
                <div class="flex gap-4">
                    ${this.rect('8', '4')}
                    ${this.rect('8', '4')}
                    ${this.rect('8', '4')}
                </div>
            </div>
        `;
        return `<div class="space-y-2">${Array(rows).fill(row).join('')}</div>`;
    },

    /**
     * Card partita skeleton
     */
    matchCard() {
        return `
            <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 flex-1">
                        ${this.circle('10')}
                        ${this.line('24', '4')}
                    </div>
                    <div class="px-4">
                        ${this.rect('16', '8')}
                    </div>
                    <div class="flex items-center gap-3 flex-1 justify-end">
                        ${this.line('24', '4')}
                        ${this.circle('10')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Calendario partite skeleton
     */
    scheduleList(matchCount = 4) {
        return `
            <div class="space-y-4">
                <div class="flex items-center gap-2 mb-4">
                    ${this.rect('32', '6')}
                </div>
                <div class="space-y-3">
                    ${Array(matchCount).fill(this.matchCard()).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Dashboard stats skeleton
     */
    dashboardStats() {
        const statBox = `
            <div class="bg-gray-800 rounded-lg p-4 text-center">
                ${this.rect('full', '10')}
                <div class="mt-2">${this.line('2/3', '3')}</div>
            </div>
        `;
        return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${Array(4).fill(statBox).join('')}
            </div>
        `;
    },

    /**
     * Form skeleton
     */
    form(fields = 4) {
        const field = `
            <div class="space-y-2">
                ${this.line('1/4', '3')}
                ${this.rect('full', '10')}
            </div>
        `;
        return `
            <div class="space-y-4">
                ${Array(fields).fill(field).join('')}
                <div class="flex gap-3 mt-6">
                    ${this.rect('24', '10')}
                    ${this.rect('24', '10')}
                </div>
            </div>
        `;
    },

    /**
     * Grid di card skeleton
     */
    cardGrid(count = 6, cols = 3) {
        const card = `
            <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
                ${this.rect('full', '32')}
                ${this.line('3/4', '4')}
                ${this.line('1/2', '3')}
            </div>
        `;
        return `
            <div class="grid grid-cols-1 md:grid-cols-${cols} gap-4">
                ${Array(count).fill(card).join('')}
            </div>
        `;
    },

    /**
     * Spinner loading (fallback)
     */
    spinner(size = 'md', text = '') {
        const sizes = {
            sm: 'h-8 w-8 border-2',
            md: 'h-12 w-12 border-3',
            lg: 'h-16 w-16 border-4',
            xl: 'h-20 w-20 border-4'
        };
        const sizeClass = sizes[size] || sizes.md;

        return `
            <div class="flex flex-col items-center justify-center py-8">
                <div class="animate-spin rounded-full ${sizeClass} border-t-transparent border-green-500"></div>
                ${text ? `<p class="text-gray-400 mt-4">${text}</p>` : ''}
            </div>
        `;
    },

    /**
     * Contenitore loading generico con skeleton o spinner
     * @param {string} type - Tipo di skeleton
     * @param {Object} options - Opzioni
     */
    render(type, options = {}) {
        switch(type) {
            case 'player-list':
                return this.playerList(options.count || 5);
            case 'team-list':
                return this.teamList(options.count || 4);
            case 'leaderboard':
                return this.leaderboardTable(options.rows || 8);
            case 'schedule':
                return this.scheduleList(options.count || 4);
            case 'dashboard':
                return this.dashboardStats();
            case 'form':
                return this.form(options.fields || 4);
            case 'card-grid':
                return this.cardGrid(options.count || 6, options.cols || 3);
            case 'spinner':
                return this.spinner(options.size || 'md', options.text || '');
            default:
                return this.spinner('md', 'Caricamento...');
        }
    },

    /**
     * Mostra skeleton in un container
     * @param {string|HTMLElement} container - ID o elemento
     * @param {string} type - Tipo di skeleton
     * @param {Object} options - Opzioni
     */
    show(container, type, options = {}) {
        const el = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (el) {
            el.innerHTML = this.render(type, options);
        }
    }
};

console.log("Modulo SkeletonLoader caricato.");
