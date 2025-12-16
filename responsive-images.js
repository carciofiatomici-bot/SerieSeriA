//
// ====================================================================
// RESPONSIVE-IMAGES.JS - Helper per Immagini Responsive
// ====================================================================
// Modulo per gestire immagini responsive con:
// - srcset/sizes per diverse risoluzioni
// - Lazy loading nativo e con Intersection Observer
// - Supporto WebP con fallback
// - Gestione errori con placeholder
// ====================================================================
//

window.ResponsiveImages = {

    // Cache per supporto WebP
    _webpSupported: null,

    /**
     * Verifica se il browser supporta WebP
     * @returns {boolean}
     */
    supportsWebP() {
        if (this._webpSupported !== null) return this._webpSupported;

        try {
            this._webpSupported = document.createElement('canvas')
                .toDataURL('image/webp')
                .indexOf('data:image/webp') === 0;
        } catch (e) {
            this._webpSupported = false;
        }
        return this._webpSupported;
    },

    /**
     * Ottiene il placeholder di default
     * @returns {string} URL placeholder
     */
    getPlaceholder() {
        return window.InterfacciaConstants?.DEFAULT_LOGO_URL ||
               'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/placeholder.jpg';
    },

    /**
     * Genera HTML per un'immagine con lazy loading
     * @param {Object} options - Opzioni immagine
     * @param {string} options.src - URL immagine
     * @param {string} options.alt - Testo alternativo
     * @param {string} options.cssClass - Classi CSS
     * @param {boolean} options.lazy - Usa lazy loading (default: true)
     * @param {boolean} options.rounded - Bordi arrotondati (default: false)
     * @param {string} options.fallback - URL fallback in caso di errore
     * @returns {string} HTML img tag
     */
    getImg({ src, alt = '', cssClass = '', lazy = true, rounded = false, fallback = null }) {
        const sanitizedSrc = window.sanitizeGitHubUrl?.(src) || src || this.getPlaceholder();
        const fallbackUrl = fallback || this.getPlaceholder();
        const roundedClass = rounded ? 'rounded-full' : '';
        const lazyAttr = lazy ? 'loading="lazy" decoding="async"' : '';

        return `<img src="${sanitizedSrc}"
                     alt="${alt}"
                     class="${cssClass} ${roundedClass} object-cover"
                     ${lazyAttr}
                     onerror="this.onerror=null; this.src='${fallbackUrl}'">`;
    },

    /**
     * Genera HTML per logo squadra (ottimizzato per piccole dimensioni)
     * @param {string} url - URL logo
     * @param {string} teamName - Nome squadra
     * @param {string} size - Dimensione: 'xs', 'sm', 'md', 'lg', 'xl'
     * @returns {string} HTML img tag
     */
    getTeamLogo(url, teamName = 'Team', size = 'sm') {
        const sizeClasses = {
            'xs': 'w-4 h-4',
            'sm': 'w-6 h-6',
            'md': 'w-8 h-8',
            'lg': 'w-10 h-10',
            'xl': 'w-12 h-12',
            '2xl': 'w-16 h-16',
            '3xl': 'w-20 h-20',
            '4xl': 'w-24 h-24',
            '5xl': 'w-28 h-28'
        };

        const cssSize = sizeClasses[size] || sizeClasses['sm'];
        const sanitizedUrl = window.sanitizeGitHubUrl?.(url) || url || this.getPlaceholder();

        return `<img src="${sanitizedUrl}"
                     alt="${teamName}"
                     class="${cssSize} rounded-full object-cover border border-gray-600"
                     loading="lazy"
                     decoding="async"
                     onerror="this.onerror=null; this.src='${this.getPlaceholder()}'">`;
    },

    /**
     * Genera HTML per foto giocatore/icona
     * @param {string} url - URL foto
     * @param {string} playerName - Nome giocatore
     * @param {string} size - Dimensione: 'sm', 'md', 'lg', 'xl'
     * @param {string} borderColor - Colore bordo (classe Tailwind)
     * @returns {string} HTML img tag
     */
    getPlayerPhoto(url, playerName = 'Player', size = 'md', borderColor = 'border-gray-500') {
        const sizeClasses = {
            'sm': 'w-12 h-12',
            'md': 'w-16 h-16',
            'lg': 'w-20 h-20',
            'xl': 'w-24 h-24',
            '2xl': 'w-32 h-32'
        };

        const cssSize = sizeClasses[size] || sizeClasses['md'];
        const sanitizedUrl = window.sanitizeGitHubUrl?.(url) || url;
        const placeholder = 'https://placehold.co/100x100/374151/9ca3af?text=?';
        const imgUrl = sanitizedUrl || placeholder;

        return `<img src="${imgUrl}"
                     alt="${playerName}"
                     class="${cssSize} rounded-full object-cover border-2 ${borderColor}"
                     loading="lazy"
                     decoding="async"
                     onerror="this.onerror=null; this.src='${placeholder}'">`;
    },

    /**
     * Genera HTML per immagine sponsor/media
     * @param {string} url - URL immagine
     * @param {string} name - Nome sponsor
     * @param {string} maxWidth - Larghezza massima CSS
     * @returns {string} HTML img tag
     */
    getSponsorImg(url, name = 'Sponsor', maxWidth = '120px') {
        const sanitizedUrl = window.sanitizeGitHubUrl?.(url) || url;

        return `<img src="${sanitizedUrl}"
                     alt="${name}"
                     class="object-contain"
                     style="max-width: ${maxWidth}; max-height: 60px;"
                     loading="lazy"
                     decoding="async"
                     onerror="this.style.display='none'">`;
    },

    /**
     * Inizializza Intersection Observer per lazy loading avanzato
     * Usare per immagini con data-src invece di src
     * @param {string} selector - Selettore CSS per immagini
     * @param {Object} options - Opzioni observer
     */
    initLazyLoading(selector = 'img[data-src]', options = {}) {
        const defaultOptions = {
            rootMargin: '50px 0px',
            threshold: 0.01
        };
        const mergedOptions = { ...defaultOptions, ...options };

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            img.classList.remove('lazy-placeholder');
                        }
                        if (img.dataset.srcset) {
                            img.srcset = img.dataset.srcset;
                            img.removeAttribute('data-srcset');
                        }
                        obs.unobserve(img);
                    }
                });
            }, mergedOptions);

            document.querySelectorAll(selector).forEach(img => {
                observer.observe(img);
            });

            return observer;
        } else {
            // Fallback per browser senza IntersectionObserver
            document.querySelectorAll(selector).forEach(img => {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                }
            });
            return null;
        }
    },

    /**
     * Precarica un'immagine (utile per immagini critiche)
     * @param {string} url - URL immagine
     * @returns {Promise<HTMLImageElement>}
     */
    preload(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load: ${url}`));
            img.src = url;
        });
    },

    /**
     * Precarica multiple immagini
     * @param {string[]} urls - Array di URL
     * @returns {Promise<HTMLImageElement[]>}
     */
    preloadAll(urls) {
        return Promise.allSettled(urls.map(url => this.preload(url)));
    },

    /**
     * Genera placeholder SVG inline (per evitare richieste di rete)
     * @param {number} width - Larghezza
     * @param {number} height - Altezza
     * @param {string} bgColor - Colore sfondo
     * @param {string} text - Testo (opzionale)
     * @returns {string} Data URL SVG
     */
    getPlaceholderSvg(width = 100, height = 100, bgColor = '#374151', text = '') {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <rect fill="${bgColor}" width="${width}" height="${height}"/>
                ${text ? `<text fill="#9ca3af" font-family="sans-serif" font-size="14" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">${text}</text>` : ''}
            </svg>
        `;
        return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
    }
};

console.log('[ResponsiveImages] Modulo caricato');
