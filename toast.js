//
// ====================================================================
// TOAST.JS - Sistema Notifiche Toast Centralizzato
// ====================================================================
//

window.Toast = {
    // Container per i toast
    container: null,

    // Contatore per ID unici
    counter: 0,

    // Configurazione default
    defaults: {
        duration: 4000,
        position: 'top-right' // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
    },

    /**
     * Inizializza il container dei toast
     */
    init() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed z-[9999] flex flex-col gap-2 pointer-events-none';
        this.setPosition(this.defaults.position);
        document.body.appendChild(this.container);
    },

    /**
     * Imposta la posizione del container
     */
    setPosition(position) {
        if (!this.container) return;

        // Reset classi posizione
        this.container.classList.remove(
            'top-4', 'bottom-4', 'left-4', 'right-4',
            'left-1/2', '-translate-x-1/2', 'items-center', 'items-end', 'items-start'
        );

        switch(position) {
            case 'top-right':
                this.container.classList.add('top-4', 'right-4', 'items-end');
                break;
            case 'top-left':
                this.container.classList.add('top-4', 'left-4', 'items-start');
                break;
            case 'bottom-right':
                this.container.classList.add('bottom-4', 'right-4', 'items-end');
                break;
            case 'bottom-left':
                this.container.classList.add('bottom-4', 'left-4', 'items-start');
                break;
            case 'top-center':
                this.container.classList.add('top-4', 'left-1/2', '-translate-x-1/2', 'items-center');
                break;
            case 'bottom-center':
                this.container.classList.add('bottom-4', 'left-1/2', '-translate-x-1/2', 'items-center');
                break;
            default:
                this.container.classList.add('top-4', 'right-4', 'items-end');
        }
    },

    /**
     * Mostra un toast
     * @param {string} message - Messaggio da mostrare
     * @param {string} type - Tipo: success, error, warning, info
     * @param {Object} options - Opzioni aggiuntive
     */
    show(message, type = 'info', options = {}) {
        this.init();

        const id = `toast-${++this.counter}`;
        const duration = options.duration || this.defaults.duration;
        const showClose = options.showClose !== false;

        // Configurazione stili per tipo
        const styles = {
            success: {
                bg: 'bg-green-600',
                border: 'border-green-400',
                icon: '✓',
                iconBg: 'bg-green-500'
            },
            error: {
                bg: 'bg-red-600',
                border: 'border-red-400',
                icon: '✕',
                iconBg: 'bg-red-500'
            },
            warning: {
                bg: 'bg-yellow-600',
                border: 'border-yellow-400',
                icon: '⚠',
                iconBg: 'bg-yellow-500'
            },
            info: {
                bg: 'bg-blue-600',
                border: 'border-blue-400',
                icon: 'ℹ',
                iconBg: 'bg-blue-500'
            }
        };

        const style = styles[type] || styles.info;

        // Crea elemento toast
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `
            pointer-events-auto
            flex items-center gap-3
            min-w-[280px] max-w-[400px]
            p-4 rounded-lg shadow-xl
            border-l-4 ${style.border}
            bg-gray-800 text-white
            transform translate-x-full opacity-0
            transition-all duration-300 ease-out
        `.replace(/\s+/g, ' ').trim();

        toast.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 ${style.iconBg} rounded-full flex items-center justify-center text-white font-bold">
                ${style.icon}
            </div>
            <div class="flex-1 text-sm font-medium">${message}</div>
            ${showClose ? `
                <button class="flex-shrink-0 text-gray-400 hover:text-white transition-colors" onclick="window.Toast.dismiss('${id}')">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            ` : ''}
        `;

        // Aggiungi al container
        this.container.appendChild(toast);

        // Anima entrata
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    },

    /**
     * Chiude un toast specifico
     */
    dismiss(id) {
        const toast = document.getElementById(id);
        if (!toast) return;

        // Anima uscita
        toast.classList.remove('translate-x-0', 'opacity-100');
        toast.classList.add('translate-x-full', 'opacity-0');

        // Rimuovi dopo animazione
        setTimeout(() => {
            toast.remove();
        }, 300);
    },

    /**
     * Chiude tutti i toast
     */
    dismissAll() {
        if (!this.container) return;
        const toasts = this.container.querySelectorAll('[id^="toast-"]');
        toasts.forEach(toast => this.dismiss(toast.id));
    },

    // Metodi shortcut
    success(message, options = {}) {
        return this.show(message, 'success', options);
    },

    error(message, options = {}) {
        return this.show(message, 'error', { duration: 6000, ...options });
    },

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    },

    info(message, options = {}) {
        return this.show(message, 'info', options);
    },

    /**
     * Toast con azione (es. "Annulla")
     */
    withAction(message, type, actionText, actionCallback, options = {}) {
        this.init();

        const id = `toast-${++this.counter}`;
        const duration = options.duration || 8000;

        const styles = {
            success: { border: 'border-green-400', icon: '✓', iconBg: 'bg-green-500' },
            error: { border: 'border-red-400', icon: '✕', iconBg: 'bg-red-500' },
            warning: { border: 'border-yellow-400', icon: '⚠', iconBg: 'bg-yellow-500' },
            info: { border: 'border-blue-400', icon: 'ℹ', iconBg: 'bg-blue-500' }
        };

        const style = styles[type] || styles.info;

        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `
            pointer-events-auto
            flex items-center gap-3
            min-w-[280px] max-w-[450px]
            p-4 rounded-lg shadow-xl
            border-l-4 ${style.border}
            bg-gray-800 text-white
            transform translate-x-full opacity-0
            transition-all duration-300 ease-out
        `.replace(/\s+/g, ' ').trim();

        toast.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 ${style.iconBg} rounded-full flex items-center justify-center text-white font-bold">
                ${style.icon}
            </div>
            <div class="flex-1 text-sm font-medium">${message}</div>
            <button id="${id}-action" class="flex-shrink-0 px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-medium transition-colors">
                ${actionText}
            </button>
            <button class="flex-shrink-0 text-gray-400 hover:text-white transition-colors" onclick="window.Toast.dismiss('${id}')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

        this.container.appendChild(toast);

        // Bind azione
        document.getElementById(`${id}-action`).addEventListener('click', () => {
            actionCallback();
            this.dismiss(id);
        });

        // Anima entrata
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        });

        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }
};

// Auto-init quando il DOM e' pronto
document.addEventListener('DOMContentLoaded', () => {
    window.Toast.init();
});

console.log("Modulo Toast caricato.");
