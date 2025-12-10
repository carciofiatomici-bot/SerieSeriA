//
// ====================================================================
// FORM-VALIDATOR.JS - Sistema Validazione Form
// ====================================================================
//

window.FormValidator = {
    // Regole di validazione predefinite
    rules: {
        required: {
            validate: (value) => value !== null && value !== undefined && value.toString().trim() !== '',
            message: 'Questo campo e\' obbligatorio'
        },
        email: {
            validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            message: 'Inserisci un indirizzo email valido'
        },
        minLength: {
            validate: (value, param) => !value || value.length >= param,
            message: (param) => `Minimo ${param} caratteri richiesti`
        },
        maxLength: {
            validate: (value, param) => !value || value.length <= param,
            message: (param) => `Massimo ${param} caratteri consentiti`
        },
        min: {
            validate: (value, param) => !value || parseFloat(value) >= param,
            message: (param) => `Il valore minimo e' ${param}`
        },
        max: {
            validate: (value, param) => !value || parseFloat(value) <= param,
            message: (param) => `Il valore massimo e' ${param}`
        },
        number: {
            validate: (value) => !value || !isNaN(parseFloat(value)),
            message: 'Inserisci un numero valido'
        },
        integer: {
            validate: (value) => !value || Number.isInteger(parseFloat(value)),
            message: 'Inserisci un numero intero'
        },
        alphanumeric: {
            validate: (value) => !value || /^[a-zA-Z0-9]+$/.test(value),
            message: 'Solo lettere e numeri consentiti'
        },
        noSpaces: {
            validate: (value) => !value || !/\s/.test(value),
            message: 'Gli spazi non sono consentiti'
        },
        pattern: {
            validate: (value, param) => !value || new RegExp(param).test(value),
            message: 'Formato non valido'
        },
        match: {
            validate: (value, param, formData) => value === formData[param],
            message: (param) => `I campi non corrispondono`
        },
        url: {
            validate: (value) => {
                if (!value) return true;
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            message: 'Inserisci un URL valido'
        }
    },

    /**
     * Valida un singolo campo
     * @param {any} value - Valore da validare
     * @param {Array} rules - Array di regole
     * @param {Object} formData - Dati completi del form (per regole come match)
     * @returns {Object} - { valid: boolean, errors: string[] }
     */
    validateField(value, rules, formData = {}) {
        const errors = [];

        for (const rule of rules) {
            let ruleName, ruleParam;

            if (typeof rule === 'string') {
                ruleName = rule;
            } else if (typeof rule === 'object') {
                ruleName = rule.rule;
                ruleParam = rule.param;
            }

            const ruleConfig = this.rules[ruleName];
            if (!ruleConfig) continue;

            const isValid = ruleConfig.validate(value, ruleParam, formData);
            if (!isValid) {
                const message = typeof ruleConfig.message === 'function'
                    ? ruleConfig.message(ruleParam)
                    : ruleConfig.message;
                errors.push(rule.message || message);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Valida un intero form
     * @param {Object} formData - Dati del form { fieldName: value }
     * @param {Object} schema - Schema di validazione { fieldName: [rules] }
     * @returns {Object} - { valid: boolean, errors: { fieldName: string[] } }
     */
    validate(formData, schema) {
        const errors = {};
        let isValid = true;

        for (const [fieldName, rules] of Object.entries(schema)) {
            const value = formData[fieldName];
            const result = this.validateField(value, rules, formData);

            if (!result.valid) {
                isValid = false;
                errors[fieldName] = result.errors;
            }
        }

        return { valid: isValid, errors };
    },

    /**
     * Valida un form HTML
     * @param {HTMLFormElement|string} form - Form o ID
     * @param {Object} schema - Schema di validazione
     * @returns {Object} - { valid: boolean, errors: object, data: object }
     */
    validateForm(form, schema) {
        const formEl = typeof form === 'string' ? document.getElementById(form) : form;
        if (!formEl) return { valid: false, errors: { form: ['Form non trovato'] }, data: {} };

        const formData = {};
        const inputs = formEl.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            const name = input.name || input.id;
            if (!name) return;

            if (input.type === 'checkbox') {
                formData[name] = input.checked;
            } else if (input.type === 'radio') {
                if (input.checked) {
                    formData[name] = input.value;
                }
            } else {
                formData[name] = input.value;
            }
        });

        const result = this.validate(formData, schema);
        return { ...result, data: formData };
    },

    /**
     * Mostra errori di validazione inline
     * @param {Object} errors - Errori per campo
     * @param {Object} options - Opzioni
     */
    showErrors(errors, options = {}) {
        const { clearPrevious = true, scrollToFirst = true } = options;

        // Pulisci errori precedenti
        if (clearPrevious) {
            this.clearErrors();
        }

        let firstErrorField = null;

        for (const [fieldName, fieldErrors] of Object.entries(errors)) {
            const input = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (!input) continue;

            if (!firstErrorField) firstErrorField = input;

            // Aggiungi classe errore all'input
            input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
            input.classList.remove('border-gray-600', 'focus:border-green-500');

            // Crea elemento errore
            const errorEl = document.createElement('div');
            errorEl.className = 'form-error text-red-400 text-sm mt-1';
            errorEl.textContent = fieldErrors[0]; // Mostra solo primo errore

            // Inserisci dopo l'input (o il suo container)
            const container = input.closest('.form-group') || input.parentElement;
            container.appendChild(errorEl);
        }

        // Scroll al primo errore
        if (scrollToFirst && firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
        }
    },

    /**
     * Pulisce tutti gli errori di validazione
     */
    clearErrors() {
        // Rimuovi messaggi errore
        document.querySelectorAll('.form-error').forEach(el => el.remove());

        // Rimuovi classi errore dagli input
        document.querySelectorAll('.border-red-500').forEach(el => {
            el.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
            el.classList.add('border-gray-600', 'focus:border-green-500');
        });
    },

    /**
     * Pulisce errore di un campo specifico
     */
    clearFieldError(fieldName) {
        const input = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!input) return;

        input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
        input.classList.add('border-gray-600', 'focus:border-green-500');

        const container = input.closest('.form-group') || input.parentElement;
        const errorEl = container.querySelector('.form-error');
        if (errorEl) errorEl.remove();
    },

    /**
     * Setup validazione live su un form
     * @param {HTMLFormElement|string} form - Form
     * @param {Object} schema - Schema validazione
     * @param {Object} options - Opzioni
     */
    setupLiveValidation(form, schema, options = {}) {
        const formEl = typeof form === 'string' ? document.getElementById(form) : form;
        if (!formEl) return;

        const { validateOn = 'blur', debounce = 300 } = options;
        let debounceTimer;

        const validateInput = (input) => {
            const name = input.name || input.id;
            const rules = schema[name];
            if (!rules) return;

            const value = input.type === 'checkbox' ? input.checked : input.value;
            const result = this.validateField(value, rules);

            this.clearFieldError(name);

            if (!result.valid) {
                this.showErrors({ [name]: result.errors }, { clearPrevious: false, scrollToFirst: false });
            }
        };

        formEl.querySelectorAll('input, select, textarea').forEach(input => {
            if (validateOn === 'blur') {
                input.addEventListener('blur', () => validateInput(input));
            } else if (validateOn === 'input') {
                input.addEventListener('input', () => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => validateInput(input), debounce);
                });
            }

            // Pulisci errore quando l'utente inizia a digitare
            input.addEventListener('input', () => {
                const name = input.name || input.id;
                this.clearFieldError(name);
            });
        });
    },

    /**
     * Aggiunge una regola custom
     */
    addRule(name, validateFn, message) {
        this.rules[name] = {
            validate: validateFn,
            message: message
        };
    },

    /**
     * Schema comuni predefiniti
     */
    schemas: {
        // Schema per giocatore
        player: {
            name: ['required', { rule: 'minLength', param: 2 }, { rule: 'maxLength', param: 30 }],
            role: ['required'],
            level: ['required', 'integer', { rule: 'min', param: 1 }, { rule: 'max', param: 30 }],
            cost: ['required', 'integer', { rule: 'min', param: 0 }]
        },

        // Schema per squadra
        team: {
            teamName: ['required', { rule: 'minLength', param: 3 }, { rule: 'maxLength', param: 25 }],
            password: ['required', { rule: 'minLength', param: 4 }]
        },

        // Schema per login
        login: {
            username: ['required'],
            password: ['required']
        }
    }
};

console.log("Modulo FormValidator caricato.");
