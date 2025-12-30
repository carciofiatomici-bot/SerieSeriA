//
// ====================================================================
// ERROR-HANDLER.JS - Gestione Errori Centralizzata
// ====================================================================
//

window.ErrorHandler = {
    // Log degli errori (mantiene gli ultimi 50)
    errorLog: [],
    maxLogSize: 50,

    // Configurazione
    config: {
        showToast: true,
        logToConsole: true,
        enableRecovery: true
    },

    /**
     * Gestisce un errore
     * @param {Error|string} error - Errore da gestire
     * @param {Object} context - Contesto aggiuntivo
     */
    handle(error, context = {}) {
        const errorInfo = this.parseError(error, context);

        // Log interno
        this.log(errorInfo);

        // Console
        if (this.config.logToConsole) {
            console.error(`[ErrorHandler] ${errorInfo.type}:`, errorInfo.message, errorInfo);
        }

        // Toast notification
        if (this.config.showToast && window.Toast) {
            this.showErrorToast(errorInfo);
        }

        // Tentativo di recovery automatico
        if (this.config.enableRecovery) {
            this.attemptRecovery(errorInfo);
        }

        return errorInfo;
    },

    /**
     * Parsa un errore in formato standard
     */
    parseError(error, context) {
        const timestamp = new Date().toISOString();
        let message, type, stack, code;

        if (error instanceof Error) {
            message = error.message;
            type = error.name || 'Error';
            stack = error.stack;
            code = error.code;
        } else if (typeof error === 'string') {
            message = error;
            type = 'Error';
        } else if (typeof error === 'object') {
            message = error.message || 'Errore sconosciuto';
            type = error.type || error.name || 'Error';
            code = error.code;
        } else {
            message = 'Errore sconosciuto';
            type = 'Error';
        }

        // Categorizza l'errore
        const category = this.categorize(message, code, context);

        return {
            timestamp,
            type,
            message,
            code,
            stack,
            category,
            context,
            userFriendlyMessage: this.getUserFriendlyMessage(category, message)
        };
    },

    /**
     * Categorizza l'errore per tipo
     */
    categorize(message, code, context) {
        const msgLower = (message || '').toLowerCase();

        // Network errors
        if (msgLower.includes('network') || msgLower.includes('fetch') ||
            msgLower.includes('connection') || code === 'unavailable') {
            return 'network';
        }

        // Firebase/Auth errors
        if (msgLower.includes('firebase') || msgLower.includes('auth') ||
            msgLower.includes('permission') || code?.startsWith?.('auth/')) {
            return 'auth';
        }

        // Database errors
        if (msgLower.includes('firestore') || msgLower.includes('database') ||
            msgLower.includes('collection') || msgLower.includes('document')) {
            return 'database';
        }

        // Validation errors
        if (msgLower.includes('valid') || msgLower.includes('required') ||
            msgLower.includes('format') || context.type === 'validation') {
            return 'validation';
        }

        // Timeout errors
        if (msgLower.includes('timeout') || msgLower.includes('timed out')) {
            return 'timeout';
        }

        // Not found
        if (msgLower.includes('not found') || msgLower.includes('non trovato') ||
            code === 'not-found') {
            return 'not_found';
        }

        return 'generic';
    },

    /**
     * Genera messaggio user-friendly
     */
    getUserFriendlyMessage(category, originalMessage) {
        const messages = {
            network: 'Problema di connessione. Verifica la tua connessione internet e riprova.',
            auth: 'Sessione scaduta o non autorizzata. Effettua nuovamente il login.',
            database: 'Errore nel caricamento dei dati. Riprova tra qualche istante.',
            validation: 'Dati inseriti non validi. Controlla i campi e riprova.',
            timeout: 'Operazione troppo lenta. Riprova tra qualche istante.',
            not_found: 'Elemento non trovato. Potrebbe essere stato eliminato.',
            generic: originalMessage || 'Si e verificato un errore. Riprova.'
        };

        return messages[category] || messages.generic;
    },

    /**
     * Mostra toast di errore
     */
    showErrorToast(errorInfo) {
        const { userFriendlyMessage, category } = errorInfo;

        // Per errori di rete, aggiungi azione "Riprova"
        if (category === 'network' || category === 'timeout') {
            window.Toast.withAction(
                userFriendlyMessage,
                'error',
                'Ricarica',
                () => window.location.reload(),
                { duration: 10000 }
            );
        } else if (category === 'auth') {
            window.Toast.withAction(
                userFriendlyMessage,
                'error',
                'Login',
                () => {
                    if (window.handleLogout) window.handleLogout();
                },
                { duration: 10000 }
            );
        } else {
            window.Toast.error(userFriendlyMessage, { duration: 6000 });
        }
    },

    /**
     * Tenta recovery automatico
     */
    attemptRecovery(errorInfo) {
        const { category, context } = errorInfo;

        switch (category) {
            case 'network':
                // Riprova dopo 3 secondi se c'e' una funzione retry
                if (context.retryFn) {
                    setTimeout(() => {
                        console.log('[ErrorHandler] Tentativo automatico di retry...');
                        context.retryFn();
                    }, 3000);
                }
                break;

            case 'auth':
                // Pulisci sessione corrotta
                if (window.InterfacciaAuth) {
                    window.InterfacciaAuth.clearSession();
                }
                break;

            case 'database':
                // Potrebbe tentare di ricaricare i dati
                break;
        }
    },

    /**
     * Log interno degli errori
     */
    log(errorInfo) {
        this.errorLog.push(errorInfo);

        // Mantieni solo gli ultimi N errori
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
    },

    /**
     * Ottieni log errori
     */
    getLog() {
        return [...this.errorLog];
    },

    /**
     * Pulisci log
     */
    clearLog() {
        this.errorLog = [];
    },

    /**
     * Wrapper per operazioni async con gestione errori
     * @param {Function} asyncFn - Funzione async da eseguire
     * @param {Object} context - Contesto per error handling
     * @returns {Promise<{success: boolean, data?: any, error?: object}>}
     */
    async wrap(asyncFn, context = {}) {
        try {
            const data = await asyncFn();
            return { success: true, data };
        } catch (error) {
            const errorInfo = this.handle(error, context);
            return { success: false, error: errorInfo };
        }
    },

    /**
     * Crea un error boundary per una sezione
     * @param {HTMLElement} container - Container dove mostrare errore
     * @param {Function} renderFn - Funzione di rendering
     * @param {Object} options - Opzioni
     */
    async withBoundary(container, renderFn, options = {}) {
        const {
            loadingType = 'spinner',
            errorTitle = 'Errore di Caricamento',
            retryText = 'Riprova'
        } = options;

        try {
            // Mostra loading
            if (window.SkeletonLoader) {
                container.innerHTML = window.SkeletonLoader.render(loadingType, options);
            }

            // Esegui render
            await renderFn();

        } catch (error) {
            const errorInfo = this.handle(error, { container: container.id, ...options });

            // Mostra UI di errore nel container
            container.innerHTML = `
                <div class="p-6 bg-gray-800 rounded-lg border-2 border-red-500 text-center">
                    <div class="text-4xl mb-4">❌</div>
                    <h3 class="text-xl font-bold text-red-400 mb-2">${errorTitle}</h3>
                    <p class="text-gray-300 mb-4">${errorInfo.userFriendlyMessage}</p>
                    <button onclick="window.location.reload()"
                            class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">
                        ${retryText}
                    </button>
                </div>
            `;
        }
    },

    /**
     * Mostra errore inline in un container
     */
    showInline(container, message, options = {}) {
        const el = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (!el) return;

        const { showRetry = false, onRetry = null } = options;

        el.innerHTML = `
            <div class="p-4 bg-red-900 bg-opacity-30 rounded-lg border border-red-500 text-center">
                <p class="text-red-400">${message}</p>
                ${showRetry && onRetry ? `
                    <button onclick="(${onRetry.toString()})()"
                            class="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-500 transition-colors">
                        Riprova
                    </button>
                ` : ''}
            </div>
        `;
    }
};

// Cattura errori globali non gestiti
window.addEventListener('error', (event) => {
    // Ignora errori ResizeObserver - sono warning innocui del browser
    // che si verificano durante il rendering di elementi dinamici
    const message = event.message || '';
    if (message.includes('ResizeObserver') ||
        message.includes('ResizeObserver loop completed') ||
        message.includes('ResizeObserver loop limit exceeded')) {
        event.preventDefault();
        return;
    }

    window.ErrorHandler.handle(event.error || event.message, {
        type: 'uncaught',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

// Cattura promise rejection non gestite
window.addEventListener('unhandledrejection', (event) => {
    window.ErrorHandler.handle(event.reason, {
        type: 'unhandled_promise'
    });
});

console.log("Modulo ErrorHandler caricato.");
