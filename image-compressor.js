//
// ====================================================================
// IMAGE-COMPRESSOR.JS - Compressione Immagini Lato Client
// ====================================================================
// Ottimizza le immagini (loghi) prima dell'upload su Firebase Storage
//

window.ImageCompressor = {
    // Configurazione default
    config: {
        maxWidth: 256,          // Larghezza massima in pixel
        maxHeight: 256,         // Altezza massima in pixel
        quality: 0.8,           // Qualita' JPEG/WebP (0-1)
        maxSizeKB: 100,         // Dimensione massima in KB
        outputFormat: 'image/jpeg', // Formato output (image/jpeg o image/webp)
        minQuality: 0.3         // Qualita' minima per compressione iterativa
    },

    /**
     * Comprime un'immagine
     * @param {File|Blob} file - File immagine da comprimere
     * @param {Object} options - Opzioni di compressione (sovrascrivono config)
     * @returns {Promise<Blob>} - Blob compresso
     */
    async compress(file, options = {}) {
        const settings = { ...this.config, ...options };

        // Verifica che sia un'immagine
        if (!file.type.startsWith('image/')) {
            throw new Error('Il file non e\' un\'immagine valida');
        }

        // Carica l'immagine
        const img = await this.loadImage(file);

        // Calcola le nuove dimensioni mantenendo l'aspect ratio
        const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            settings.maxWidth,
            settings.maxHeight
        );

        // Comprimi con qualita' iniziale
        let compressed = await this.resizeAndCompress(img, width, height, settings.quality, settings.outputFormat);

        // Se ancora troppo grande, riduci qualita' iterativamente
        let currentQuality = settings.quality;
        while (compressed.size > settings.maxSizeKB * 1024 && currentQuality > settings.minQuality) {
            currentQuality -= 0.1;
            compressed = await this.resizeAndCompress(img, width, height, currentQuality, settings.outputFormat);
            console.log(`ImageCompressor: qualita' ridotta a ${currentQuality.toFixed(1)}, size: ${(compressed.size / 1024).toFixed(1)}KB`);
        }

        console.log(`ImageCompressor: compressione completata - Original: ${(file.size / 1024).toFixed(1)}KB, Compressed: ${(compressed.size / 1024).toFixed(1)}KB`);

        return compressed;
    },

    /**
     * Carica un'immagine da File/Blob
     * @param {File|Blob} file - File da caricare
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Errore nel caricamento dell\'immagine'));
            };

            img.src = url;
        });
    },

    /**
     * Calcola le dimensioni mantenendo l'aspect ratio
     * @param {number} origWidth - Larghezza originale
     * @param {number} origHeight - Altezza originale
     * @param {number} maxWidth - Larghezza massima
     * @param {number} maxHeight - Altezza massima
     * @returns {Object} - { width, height }
     */
    calculateDimensions(origWidth, origHeight, maxWidth, maxHeight) {
        let width = origWidth;
        let height = origHeight;

        // Se l'immagine e' gia' piu' piccola, non ridimensionare
        if (width <= maxWidth && height <= maxHeight) {
            return { width, height };
        }

        // Calcola il ratio per mantenere le proporzioni
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        return { width, height };
    },

    /**
     * Ridimensiona e comprimi l'immagine usando Canvas
     * @param {HTMLImageElement} img - Immagine da processare
     * @param {number} width - Nuova larghezza
     * @param {number} height - Nuova altezza
     * @param {number} quality - Qualita' (0-1)
     * @param {string} format - Formato output
     * @returns {Promise<Blob>}
     */
    resizeAndCompress(img, width, height, quality, format) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');

            // Usa smoothing per migliore qualita'
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Disegna l'immagine ridimensionata
            ctx.drawImage(img, 0, 0, width, height);

            // Esporta come Blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Errore nella creazione del blob'));
                    }
                },
                format,
                quality
            );
        });
    },

    /**
     * Crea un File da un Blob con nome e tipo
     * @param {Blob} blob - Blob da convertire
     * @param {string} filename - Nome file
     * @returns {File}
     */
    blobToFile(blob, filename) {
        const extension = blob.type === 'image/webp' ? '.webp' : '.jpg';
        const finalName = filename.replace(/\.[^.]+$/, '') + extension;
        return new File([blob], finalName, { type: blob.type });
    },

    /**
     * Comprime e ritorna un File
     * @param {File} file - File originale
     * @param {Object} options - Opzioni
     * @returns {Promise<File>}
     */
    async compressToFile(file, options = {}) {
        const blob = await this.compress(file, options);
        return this.blobToFile(blob, file.name);
    },

    /**
     * Verifica se il browser supporta WebP
     * @returns {Promise<boolean>}
     */
    async supportsWebP() {
        if (!self.createImageBitmap) return false;

        const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
        const blob = await (await fetch(webpData)).blob();

        return createImageBitmap(blob).then(() => true, () => false);
    },

    /**
     * Inizializza con supporto WebP se disponibile
     */
    async init() {
        if (await this.supportsWebP()) {
            this.config.outputFormat = 'image/webp';
            console.log('ImageCompressor: WebP supportato, usando formato WebP');
        } else {
            console.log('ImageCompressor: WebP non supportato, usando JPEG');
        }
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.ImageCompressor.init();
});

console.log("Modulo ImageCompressor caricato.");
