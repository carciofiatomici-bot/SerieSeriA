//
// ====================================================================
// LOADING-MANAGER.JS - Gestione Unificata Loading States
// ====================================================================
//

window.LoadingManager = {
    // Stato loading attivi
    activeLoaders: new Map(),

    // Configurazione default
    defaults: {
        type: 'spinner',      // spinner, skeleton, overlay, inline
        text: 'Caricamento...',
        minDuration: 300,     // Durata minima per evitare flash
        timeout: 30000        // Timeout automatico
    },

    /**
     * Mostra loading in un container
     * @param {string|HTMLElement} container - Container ID o elemento
     * @param {Object} options - Opzioni
     * @returns {string} - Loading ID per riferimento
     */
    show(container, options = {}) {
        const el = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (!el) return null;

        const id = `loading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const opts = { ...this.defaults, ...options };
        const startTime = Date.now();

        // Salva contenuto originale
        const originalContent = el.innerHTML;

        // Genera HTML loading
        let loadingHtml = '';
        switch (opts.type) {
            case 'skeleton':
                loadingHtml = window.SkeletonLoader
                    ? window.SkeletonLoader.render(opts.skeletonType || 'spinner', opts)
                    : this.getSpinnerHtml(opts);
                break;

            case 'overlay':
                loadingHtml = this.getOverlayHtml(opts);
                break;

            case 'inline':
                loadingHtml = this.getInlineHtml(opts);
                break;

            case 'spinner':
            default:
                loadingHtml = this.getSpinnerHtml(opts);
                break;
        }

        // Applica loading
        if (opts.type === 'overlay') {
            // Per overlay, aggiungi sopra il contenuto
            el.style.position = 'relative';
            const overlay = document.createElement('div');
            overlay.id = id;
            overlay.innerHTML = loadingHtml;
            el.appendChild(overlay);
        } else {
            el.innerHTML = loadingHtml;
        }

        // Registra loader
        this.activeLoaders.set(id, {
            container: el,
            originalContent,
            startTime,
            options: opts,
            timeoutId: opts.timeout ? setTimeout(() => this.hide(id), opts.timeout) : null
        });

        return id;
    },

    /**
     * Nasconde loading
     * @param {string} id - Loading ID
     * @param {string} newContent - Nuovo contenuto da mostrare (opzionale)
     */
    async hide(id, newContent = null) {
        const loader = this.activeLoaders.get(id);
        if (!loader) return;

        const { container, originalContent, startTime, options, timeoutId } = loader;

        // Cancella timeout
        if (timeoutId) clearTimeout(timeoutId);

        // Rispetta durata minima
        const elapsed = Date.now() - startTime;
        if (elapsed < options.minDuration) {
            await new Promise(resolve => setTimeout(resolve, options.minDuration - elapsed));
        }

        // Rimuovi loader
        if (options.type === 'overlay') {
            const overlay = document.getElementById(id);
            if (overlay) overlay.remove();
        } else if (newContent !== null) {
            container.innerHTML = newContent;
        } else {
            container.innerHTML = originalContent;
        }

        // Pulisci registro
        this.activeLoaders.delete(id);
    },

    /**
     * Nasconde tutti i loading attivi
     */
    hideAll() {
        this.activeLoaders.forEach((_, id) => this.hide(id));
    },

    /**
     * Spinner HTML
     */
    getSpinnerHtml(opts) {
        const size = opts.size || 'md';
        const sizes = {
            sm: 'h-8 w-8 border-2',
            md: 'h-12 w-12 border-3',
            lg: 'h-16 w-16 border-4'
        };
        const sizeClass = sizes[size] || sizes.md;
        const color = opts.color || 'green';

        return `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="animate-spin rounded-full ${sizeClass} border-${color}-500 border-t-transparent"></div>
                ${opts.text ? `<p class="text-gray-400 mt-4 text-center">${opts.text}</p>` : ''}
            </div>
        `;
    },

    /**
     * Overlay HTML
     */
    getOverlayHtml(opts) {
        return `
            <div class="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 rounded-lg">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto"></div>
                    ${opts.text ? `<p class="text-white mt-4">${opts.text}</p>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Inline HTML (piccolo, senza sostituire contenuto)
     */
    getInlineHtml(opts) {
        return `
            <div class="flex items-center justify-center gap-2 py-4">
                <div class="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
                ${opts.text ? `<span class="text-gray-400 text-sm">${opts.text}</span>` : ''}
            </div>
        `;
    },

    /**
     * Wrapper per operazioni async con loading automatico
     * @param {string|HTMLElement} container - Container
     * @param {Function} asyncFn - Funzione async
     * @param {Object} options - Opzioni loading
     */
    async wrap(container, asyncFn, options = {}) {
        const loaderId = this.show(container, options);

        try {
            const result = await asyncFn();
            return result;
        } finally {
            if (options.hideOnComplete !== false) {
                this.hide(loaderId, options.successContent || null);
            }
        }
    },

    /**
     * Loading per bottone
     * @param {HTMLElement} button - Bottone
     * @param {boolean} loading - Stato loading
     */
    button(button, loading) {
        if (!button) return;

        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `
                <span class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Attendere...
                </span>
            `;
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    },

    /**
     * Progress bar loading
     * @param {string|HTMLElement} container - Container
     * @param {number} progress - Progresso 0-100
     * @param {string} text - Testo descrittivo
     */
    progress(container, progress, text = '') {
        const el = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (!el) return;

        el.innerHTML = `
            <div class="py-4">
                ${text ? `<p class="text-gray-300 text-sm mb-2">${text}</p>` : ''}
                <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div class="bg-green-500 h-full rounded-full transition-all duration-300"
                         style="width: ${Math.min(100, Math.max(0, progress))}%"></div>
                </div>
                <p class="text-gray-400 text-xs mt-1 text-right">${Math.round(progress)}%</p>
            </div>
        `;
    },

    /**
     * Mostra stato "vuoto" per liste
     */
    empty(container, message = 'Nessun elemento trovato', icon = '📭') {
        const el = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (!el) return;

        el.innerHTML = `
            <div class="py-12 text-center">
                <div class="text-5xl mb-4">${icon}</div>
                <p class="text-gray-400 text-lg">${message}</p>
            </div>
        `;
    }
};

console.log("Modulo LoadingManager caricato.");
