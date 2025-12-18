/**
 * Logger condizionale per Serie SeriA
 *
 * In produzione (hostname diverso da localhost/127.0.0.1) i log sono disabilitati.
 * In sviluppo tutti i log sono attivi.
 *
 * Uso: window.Logger.debug('messaggio'), window.Logger.info('messaggio'), ecc.
 */

(function() {
    'use strict';

    // Determina se siamo in ambiente di sviluppo
    const isDevelopment = () => {
        const hostname = window.location?.hostname || '';
        return hostname === 'localhost' ||
               hostname === '127.0.0.1' ||
               hostname === '' || // file://
               hostname.includes('192.168.') || // LAN locale
               localStorage.getItem('debug_mode') === 'true';
    };

    // Livelli di log
    const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    };

    // Livello minimo: in sviluppo DEBUG, in produzione solo WARN+
    const getMinLevel = () => isDevelopment() ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

    // No-op function per produzione
    const noop = () => {};

    // Crea wrapper per console method
    const createLogMethod = (method, level) => {
        return function(...args) {
            if (level >= getMinLevel()) {
                console[method](...args);
            }
        };
    };

    // Logger object
    const Logger = {
        // Metodi standard
        debug: createLogMethod('log', LOG_LEVELS.DEBUG),
        log: createLogMethod('log', LOG_LEVELS.DEBUG),
        info: createLogMethod('info', LOG_LEVELS.INFO),
        warn: createLogMethod('warn', LOG_LEVELS.WARN),
        error: createLogMethod('error', LOG_LEVELS.ERROR),

        // Metodi speciali
        group: function(label) {
            if (getMinLevel() <= LOG_LEVELS.DEBUG) console.group(label);
        },
        groupEnd: function() {
            if (getMinLevel() <= LOG_LEVELS.DEBUG) console.groupEnd();
        },
        table: function(data) {
            if (getMinLevel() <= LOG_LEVELS.DEBUG) console.table(data);
        },
        time: function(label) {
            if (getMinLevel() <= LOG_LEVELS.DEBUG) console.time(label);
        },
        timeEnd: function(label) {
            if (getMinLevel() <= LOG_LEVELS.DEBUG) console.timeEnd(label);
        },

        // Utility
        isDev: isDevelopment,

        // Forza abilitazione debug (utile per testing in produzione)
        enableDebug: function() {
            localStorage.setItem('debug_mode', 'true');
            console.info('[Logger] Debug mode abilitato. Ricarica la pagina.');
        },
        disableDebug: function() {
            localStorage.removeItem('debug_mode');
            console.info('[Logger] Debug mode disabilitato. Ricarica la pagina.');
        }
    };

    // Esporta globalmente
    window.Logger = Logger;

    // Log iniziale solo in sviluppo
    if (isDevelopment()) {
        console.info('[Logger] Modalita sviluppo - logging completo attivo');
    }
})();
