//
// ====================================================================
// CONFIRM-DIALOG.JS - Sistema Dialoghi di Conferma
// ====================================================================
//

window.ConfirmDialog = {
    // Modal attualmente aperta
    currentModal: null,

    /**
     * Mostra un dialogo di conferma
     * @param {Object} options - Opzioni del dialogo
     * @returns {Promise<boolean>} - true se confermato, false se annullato
     */
    show(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Conferma',
                message = 'Sei sicuro di voler procedere?',
                confirmText = 'Conferma',
                cancelText = 'Annulla',
                type = 'warning', // warning, danger, info
                icon = null,
                requireInput = null // { placeholder, match } per conferma con testo
            } = options;

            // Configurazione stili per tipo
            const styles = {
                warning: {
                    iconBg: 'bg-yellow-500',
                    iconText: '⚠',
                    confirmBg: 'bg-yellow-600 hover:bg-yellow-500',
                    borderColor: 'border-yellow-500'
                },
                danger: {
                    iconBg: 'bg-red-500',
                    iconText: '⚠',
                    confirmBg: 'bg-red-600 hover:bg-red-500',
                    borderColor: 'border-red-500'
                },
                info: {
                    iconBg: 'bg-blue-500',
                    iconText: '?',
                    confirmBg: 'bg-blue-600 hover:bg-blue-500',
                    borderColor: 'border-blue-500'
                }
            };

            const style = styles[type] || styles.warning;
            const displayIcon = icon || style.iconText;

            // Crea modal
            const modal = document.createElement('div');
            modal.id = 'confirm-dialog-modal';
            modal.className = 'fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black bg-opacity-70';
            modal.style.animation = 'fadeIn 0.2s ease-out';

            modal.innerHTML = `
                <div class="bg-gray-800 rounded-xl shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-md w-full border-2 ${style.borderColor} transform scale-95 opacity-0 transition-all duration-200" id="confirm-dialog-box">
                    <div class="p-6">
                        <!-- Header con icona -->
                        <div class="flex items-center gap-4 mb-4">
                            <div class="flex-shrink-0 w-12 h-12 ${style.iconBg} rounded-full flex items-center justify-center text-white text-2xl">
                                ${displayIcon}
                            </div>
                            <h3 class="text-xl font-bold text-white">${title}</h3>
                        </div>

                        <!-- Messaggio -->
                        <p class="text-gray-300 mb-6 ml-16">${message}</p>

                        <!-- Input opzionale per conferma -->
                        ${requireInput ? `
                            <div class="mb-6 ml-16">
                                <input type="text"
                                       id="confirm-dialog-input"
                                       placeholder="${requireInput.placeholder || 'Digita per confermare'}"
                                       class="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-${type === 'danger' ? 'red' : 'yellow'}-500 focus:outline-none">
                                <p class="text-xs text-gray-400 mt-2">Digita "<span class="text-white font-bold">${requireInput.match}</span>" per confermare</p>
                            </div>
                        ` : ''}

                        <!-- Bottoni -->
                        <div class="flex gap-3 justify-end flex-wrap sm:flex-nowrap">
                            <button id="confirm-dialog-cancel"
                                    class="flex-1 sm:flex-initial px-5 py-2.5 min-h-[44px] bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 active:bg-gray-700 transition-colors">
                                ${cancelText}
                            </button>
                            <button id="confirm-dialog-confirm"
                                    class="flex-1 sm:flex-initial px-5 py-2.5 min-h-[44px] ${style.confirmBg} active:brightness-90 text-white font-semibold rounded-lg transition-colors ${requireInput ? 'opacity-50 cursor-not-allowed' : ''}"
                                    ${requireInput ? 'disabled' : ''}>
                                ${confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Aggiungi al DOM
            document.body.appendChild(modal);
            this.currentModal = modal;

            // Anima entrata
            requestAnimationFrame(() => {
                const box = document.getElementById('confirm-dialog-box');
                if (box) {
                    box.classList.remove('scale-95', 'opacity-0');
                    box.classList.add('scale-100', 'opacity-100');
                }
            });

            // Riferimenti elementi
            const confirmBtn = document.getElementById('confirm-dialog-confirm');
            const cancelBtn = document.getElementById('confirm-dialog-cancel');
            const inputEl = document.getElementById('confirm-dialog-input');

            // Gestione input per conferma
            if (requireInput && inputEl) {
                inputEl.addEventListener('input', (e) => {
                    const matches = e.target.value.toUpperCase() === requireInput.match.toUpperCase();
                    confirmBtn.disabled = !matches;
                    confirmBtn.classList.toggle('opacity-50', !matches);
                    confirmBtn.classList.toggle('cursor-not-allowed', !matches);
                });
                inputEl.focus();
                // Scroll input in view su mobile quando si apre la tastiera
                setTimeout(() => {
                    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }

            // Funzione chiusura
            const close = (result) => {
                const box = document.getElementById('confirm-dialog-box');
                if (box) {
                    box.classList.remove('scale-100', 'opacity-100');
                    box.classList.add('scale-95', 'opacity-0');
                }
                setTimeout(() => {
                    modal.remove();
                    this.currentModal = null;
                    resolve(result);
                }, 200);
            };

            // Event listeners
            confirmBtn.addEventListener('click', () => close(true));
            cancelBtn.addEventListener('click', () => close(false));

            // Chiudi con ESC
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleEsc);
                    close(false);
                }
            };
            document.addEventListener('keydown', handleEsc);

            // Chiudi cliccando fuori
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    close(false);
                }
            });
        });
    },

    /**
     * Conferma eliminazione (shortcut)
     */
    delete(itemName) {
        return this.show({
            title: 'Conferma Eliminazione',
            message: `Stai per eliminare <strong class="text-white">${itemName}</strong>. Questa azione non puo' essere annullata.`,
            confirmText: 'Elimina',
            cancelText: 'Annulla',
            type: 'danger'
        });
    },

    /**
     * Conferma eliminazione con input (per azioni critiche)
     */
    deleteWithConfirm(itemName, matchText) {
        return this.show({
            title: 'Conferma Eliminazione',
            message: `Stai per eliminare <strong class="text-white">${itemName}</strong>. Questa azione e' <strong class="text-red-400">IRREVERSIBILE</strong>.`,
            confirmText: 'Elimina Definitivamente',
            cancelText: 'Annulla',
            type: 'danger',
            requireInput: {
                placeholder: `Digita "${matchText}" per confermare`,
                match: matchText
            }
        });
    },

    /**
     * Conferma azione generica
     */
    action(message, actionName = 'Procedi') {
        return this.show({
            title: 'Conferma Azione',
            message: message,
            confirmText: actionName,
            cancelText: 'Annulla',
            type: 'warning'
        });
    },

    /**
     * Conferma con informazioni (non distruttiva)
     */
    info(title, message, confirmText = 'OK') {
        return this.show({
            title: title,
            message: message,
            confirmText: confirmText,
            cancelText: 'Annulla',
            type: 'info'
        });
    },

    /**
     * Alert semplice (solo OK)
     */
    alert(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.id = 'alert-dialog-modal';
            modal.className = 'fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black bg-opacity-70';

            modal.innerHTML = `
                <div class="bg-gray-800 rounded-xl shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-md w-full border-2 border-blue-500 transform scale-95 opacity-0 transition-all duration-200" id="alert-dialog-box">
                    <div class="p-6">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl">
                                ℹ
                            </div>
                            <h3 class="text-lg sm:text-xl font-bold text-white">${title}</h3>
                        </div>
                        <p class="text-gray-300 mb-6 ml-14 sm:ml-16">${message}</p>
                        <div class="flex justify-end">
                            <button id="alert-dialog-ok"
                                    class="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 active:bg-blue-700 transition-colors">
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            requestAnimationFrame(() => {
                const box = document.getElementById('alert-dialog-box');
                if (box) {
                    box.classList.remove('scale-95', 'opacity-0');
                    box.classList.add('scale-100', 'opacity-100');
                }
            });

            const close = () => {
                const box = document.getElementById('alert-dialog-box');
                if (box) {
                    box.classList.remove('scale-100', 'opacity-100');
                    box.classList.add('scale-95', 'opacity-0');
                }
                setTimeout(() => {
                    modal.remove();
                    resolve(true);
                }, 200);
            };

            document.getElementById('alert-dialog-ok').addEventListener('click', close);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });
        });
    }
};

// Aggiungi stile animazione
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);

console.log("Modulo ConfirmDialog caricato.");
