//
// ====================================================================
// MODULO UNIFORM-EDITOR.JS (Gestione Divisa Squadra)
// ====================================================================
//

window.UniformEditor = {
    // Configurazione di default per una nuova divisa
    defaultUniform: {
        shirt: {
            primaryColor: '#22c55e',
            secondaryColor: '#ffffff',
            collarColor: '#ffffff',
            pattern: 'solid'
        },
        shorts: {
            primaryColor: '#1a1a2e',
            secondaryColor: '#ffffff',
            pattern: 'solid'
        },
        socks: {
            primaryColor: '#22c55e',
            secondaryColor: '#ffffff',
            pattern: 'solid'
        }
    },

    // Stato corrente dell'editor
    currentUniform: null,
    originalUniform: null,

    /**
     * Inizializza l'editor divisa
     */
    initialize() {
        this.bindEventListeners();
        console.log("UniformEditor inizializzato.");
    },

    /**
     * Collega tutti gli event listener
     */
    bindEventListeners() {
        const self = this;

        // Apertura editor dalla dashboard
        const uniformBox = document.getElementById('team-uniform-box');
        if (uniformBox) {
            uniformBox.addEventListener('click', () => self.openEditor());
        }

        // Chiusura editor
        const closeBtn = document.getElementById('btn-close-uniform-editor');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => self.closeEditor());
        }

        const cancelBtn = document.getElementById('btn-cancel-uniform');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => self.closeEditor());
        }

        // Salvataggio
        const saveBtn = document.getElementById('btn-save-uniform');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => self.saveUniform());
        }

        // Listener per aggiornamenti live dell'anteprima
        const colorInputs = [
            'shirt-color-primary', 'shirt-color-secondary', 'shirt-color-collar',
            'shorts-color-primary', 'shorts-color-secondary',
            'socks-color-primary', 'socks-color-secondary'
        ];

        colorInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => self.updatePreview());
            }
        });

        const patternSelects = ['shirt-pattern', 'shorts-pattern', 'socks-pattern'];
        patternSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', () => self.updatePreview());
            }
        });

        // Chiudi con click fuori dal modal
        const modal = document.getElementById('uniform-editor-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    self.closeEditor();
                }
            });
        }
    },

    /**
     * Apre l'editor divisa
     */
    openEditor() {
        const modal = document.getElementById('uniform-editor-modal');
        if (!modal) return;

        // Carica la divisa corrente dal team data
        const teamData = window.InterfacciaCore?.currentTeamData;
        if (teamData && teamData.uniform) {
            this.currentUniform = JSON.parse(JSON.stringify(teamData.uniform));
            // Assicura compatibilita con vecchie divise senza collarColor
            if (!this.currentUniform.shirt.collarColor) {
                this.currentUniform.shirt.collarColor = this.currentUniform.shirt.secondaryColor || '#ffffff';
            }
        } else {
            this.currentUniform = JSON.parse(JSON.stringify(this.defaultUniform));
        }
        this.originalUniform = JSON.parse(JSON.stringify(this.currentUniform));

        // Popola i controlli
        this.populateControls();

        // Aggiorna anteprima
        this.updatePreview();
        this.updateEditorPreview();

        // Mostra il modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Pulisci messaggio
        const msg = document.getElementById('uniform-editor-message');
        if (msg) msg.textContent = '';
    },

    /**
     * Chiude l'editor
     */
    closeEditor() {
        const modal = document.getElementById('uniform-editor-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    /**
     * Popola i controlli con i valori correnti
     */
    populateControls() {
        const u = this.currentUniform;

        // Maglia
        const shirtPrimary = document.getElementById('shirt-color-primary');
        const shirtSecondary = document.getElementById('shirt-color-secondary');
        const shirtCollar = document.getElementById('shirt-color-collar');
        const shirtPattern = document.getElementById('shirt-pattern');

        if (shirtPrimary) shirtPrimary.value = u.shirt.primaryColor;
        if (shirtSecondary) shirtSecondary.value = u.shirt.secondaryColor;
        if (shirtCollar) shirtCollar.value = u.shirt.collarColor || u.shirt.secondaryColor;
        if (shirtPattern) shirtPattern.value = u.shirt.pattern;

        // Pantaloncini
        const shortsPrimary = document.getElementById('shorts-color-primary');
        const shortsSecondary = document.getElementById('shorts-color-secondary');
        const shortsPattern = document.getElementById('shorts-pattern');

        if (shortsPrimary) shortsPrimary.value = u.shorts.primaryColor;
        if (shortsSecondary) shortsSecondary.value = u.shorts.secondaryColor;
        if (shortsPattern) shortsPattern.value = u.shorts.pattern;

        // Calzettoni
        const socksPrimary = document.getElementById('socks-color-primary');
        const socksSecondary = document.getElementById('socks-color-secondary');
        const socksPattern = document.getElementById('socks-pattern');

        if (socksPrimary) socksPrimary.value = u.socks.primaryColor;
        if (socksSecondary) socksSecondary.value = u.socks.secondaryColor;
        if (socksPattern) socksPattern.value = u.socks.pattern;
    },

    /**
     * Legge i valori correnti dai controlli
     */
    readControlValues() {
        return {
            shirt: {
                primaryColor: document.getElementById('shirt-color-primary')?.value || '#22c55e',
                secondaryColor: document.getElementById('shirt-color-secondary')?.value || '#ffffff',
                collarColor: document.getElementById('shirt-color-collar')?.value || '#ffffff',
                pattern: document.getElementById('shirt-pattern')?.value || 'solid'
            },
            shorts: {
                primaryColor: document.getElementById('shorts-color-primary')?.value || '#1a1a2e',
                secondaryColor: document.getElementById('shorts-color-secondary')?.value || '#ffffff',
                pattern: document.getElementById('shorts-pattern')?.value || 'solid'
            },
            socks: {
                primaryColor: document.getElementById('socks-color-primary')?.value || '#22c55e',
                secondaryColor: document.getElementById('socks-color-secondary')?.value || '#ffffff',
                pattern: document.getElementById('socks-pattern')?.value || 'solid'
            }
        };
    },

    /**
     * Aggiorna tutte le anteprime
     */
    updatePreview() {
        this.currentUniform = this.readControlValues();
        this.updateEditorPreview();
    },

    /**
     * Aggiorna l'anteprima nell'editor (divisa completa)
     */
    updateEditorPreview() {
        const u = this.currentUniform;
        const defs = document.getElementById('uniform-patterns-defs');
        if (!defs) return;

        // Genera i pattern SVG
        defs.innerHTML = this.generatePatternDefs(u);

        // Aggiorna maglia - gestione pattern speciali
        const pattern = u.shirt.pattern;

        // Corpo maglia (con maniche integrate in jersey.xml style)
        this.applyPatternToElement('editor-shirt-body', u.shirt, 'shirt');

        // Colletto sempre con colore dedicato
        document.getElementById('editor-shirt-collar')?.setAttribute('fill', u.shirt.collarColor);

        // Polsini con colore colletto (o secondario)
        const cuffColor = u.shirt.collarColor || u.shirt.secondaryColor;
        document.getElementById('editor-shirt-cuff-left')?.setAttribute('fill', cuffColor);
        document.getElementById('editor-shirt-cuff-right')?.setAttribute('fill', cuffColor);

        // Aggiorna pantaloncini
        this.applyPatternToElement('editor-shorts-body', u.shorts, 'shorts');

        // Strisce laterali pantaloncini
        const shortsPattern = u.shorts.pattern;
        const stripeLeft = document.getElementById('editor-shorts-stripe-left');
        const stripeRight = document.getElementById('editor-shorts-stripe-right');

        if (stripeLeft && stripeRight) {
            if (shortsPattern === 'side-stripe') {
                stripeLeft.setAttribute('fill', u.shorts.secondaryColor);
                stripeRight.setAttribute('fill', u.shorts.secondaryColor);
                stripeLeft.style.display = 'block';
                stripeRight.style.display = 'block';
            } else {
                stripeLeft.style.display = 'none';
                stripeRight.style.display = 'none';
            }
        }
    },

    /**
     * Genera le definizioni dei pattern SVG
     */
    generatePatternDefs(uniform) {
        let defs = '';

        // Pattern per maglia
        defs += this.createPatternDef('shirt', uniform.shirt);

        // Pattern per pantaloncini
        defs += this.createPatternDef('shorts', uniform.shorts);

        // Pattern per calzettoni
        defs += this.createPatternDef('socks', uniform.socks);

        return defs;
    },

    /**
     * Crea la definizione di un singolo pattern
     */
    createPatternDef(type, config) {
        const { primaryColor, secondaryColor, pattern } = config;
        const patternId = `pattern-${type}`;

        switch (pattern) {
            case 'solid':
            case 'shoulders':
            case 'sleeves':
                return ''; // Nessun pattern necessario, gestito direttamente

            case 'vertical-stripes':
                return `
                    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="10" height="10">
                        <rect width="5" height="10" fill="${primaryColor}"/>
                        <rect x="5" width="5" height="10" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'horizontal-stripes':
                return `
                    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="10" height="10">
                        <rect width="10" height="5" fill="${primaryColor}"/>
                        <rect y="5" width="10" height="5" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'half-vertical':
                return `
                    <pattern id="${patternId}" patternUnits="objectBoundingBox" width="1" height="1">
                        <rect width="0.5" height="1" fill="${primaryColor}"/>
                        <rect x="0.5" width="0.5" height="1" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'half-horizontal':
                return `
                    <pattern id="${patternId}" patternUnits="objectBoundingBox" width="1" height="1">
                        <rect width="1" height="0.5" fill="${primaryColor}"/>
                        <rect y="0.5" width="1" height="0.5" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'diagonal':
                return `
                    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
                        <rect width="7" height="14" fill="${primaryColor}"/>
                        <rect x="7" width="7" height="14" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'diagonal-stripes':
                return `
                    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                        <rect width="5" height="10" fill="${primaryColor}"/>
                        <rect x="5" width="5" height="10" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'center-band-v':
                return `
                    <pattern id="${patternId}" patternUnits="objectBoundingBox" width="1" height="1">
                        <rect width="1" height="1" fill="${primaryColor}"/>
                        <rect x="0.35" width="0.3" height="1" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'center-band-h':
                return `
                    <pattern id="${patternId}" patternUnits="objectBoundingBox" width="1" height="1">
                        <rect width="1" height="1" fill="${primaryColor}"/>
                        <rect y="0.35" width="1" height="0.3" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'checkered':
                return `
                    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="20" height="20">
                        <rect width="10" height="10" fill="${primaryColor}"/>
                        <rect x="10" width="10" height="10" fill="${secondaryColor}"/>
                        <rect y="10" width="10" height="10" fill="${secondaryColor}"/>
                        <rect x="10" y="10" width="10" height="10" fill="${primaryColor}"/>
                    </pattern>
                `;

            case 'hoops':
                return `
                    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="10" height="20">
                        <rect width="10" height="10" fill="${primaryColor}"/>
                        <rect y="10" width="10" height="10" fill="${secondaryColor}"/>
                    </pattern>
                `;

            case 'side-stripe':
                return `
                    <pattern id="${patternId}" patternUnits="objectBoundingBox" width="1" height="1">
                        <rect width="1" height="1" fill="${primaryColor}"/>
                        <rect width="0.15" height="1" fill="${secondaryColor}"/>
                        <rect x="0.85" width="0.15" height="1" fill="${secondaryColor}"/>
                    </pattern>
                `;

            default:
                return '';
        }
    },

    /**
     * Applica il pattern/colore a un elemento SVG
     */
    applyPatternToElement(elementId, config, type) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (config.pattern === 'solid' || config.pattern === 'shoulders' || config.pattern === 'sleeves') {
            element.setAttribute('fill', config.primaryColor);
        } else {
            element.setAttribute('fill', `url(#pattern-${type})`);
        }
    },

    /**
     * Aggiorna l'anteprima nella dashboard (solo maglia)
     */
    updateDashboardPreview(uniform) {
        // Usa default se uniform non valido o incompleto
        let u = uniform;
        if (!u || !u.shirt || !u.shirt.primaryColor) {
            u = this.defaultUniform;
        }

        // Assicura che tutti i campi necessari esistano
        const shirt = {
            primaryColor: u.shirt?.primaryColor || this.defaultUniform.shirt.primaryColor,
            secondaryColor: u.shirt?.secondaryColor || this.defaultUniform.shirt.secondaryColor,
            collarColor: u.shirt?.collarColor || u.shirt?.secondaryColor || this.defaultUniform.shirt.collarColor,
            pattern: u.shirt?.pattern || 'solid'
        };

        const svg = document.getElementById('uniform-preview-svg');
        if (!svg) return;

        // Genera pattern inline per la dashboard
        let defsEl = svg.querySelector('defs');
        if (!defsEl) {
            defsEl = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.insertBefore(defsEl, svg.firstChild);
        }

        const pattern = shirt.pattern;
        const patternDef = this.createPatternDef('dashboard-shirt', shirt);
        defsEl.innerHTML = patternDef;

        // Aggiorna corpo maglia (jersey.xml style - corpo e maniche integrati)
        const body = document.getElementById('dash-shirt-body');
        if (body) {
            // Pattern che non generano definizioni SVG usano il colore primario
            if (pattern === 'solid' || pattern === 'shoulders' || pattern === 'sleeves' || !patternDef) {
                body.setAttribute('fill', shirt.primaryColor);
            } else {
                body.setAttribute('fill', 'url(#pattern-dashboard-shirt)');
            }
        }

        // Aggiorna colletto
        const collar = document.getElementById('dash-shirt-collar');
        if (collar) {
            collar.setAttribute('fill', shirt.collarColor);
        }

        // Aggiorna polsini
        const cuffLeft = document.getElementById('dash-shirt-cuff-left');
        const cuffRight = document.getElementById('dash-shirt-cuff-right');
        const cuffColor = shirt.collarColor;

        if (cuffLeft) cuffLeft.setAttribute('fill', cuffColor);
        if (cuffRight) cuffRight.setAttribute('fill', cuffColor);
    },

    /**
     * Salva la divisa su Firestore
     */
    async saveUniform() {
        const msg = document.getElementById('uniform-editor-message');
        const saveBtn = document.getElementById('btn-save-uniform');

        if (!window.InterfacciaCore?.currentTeamId) {
            if (msg) {
                msg.textContent = 'Errore: Nessuna squadra selezionata.';
                msg.className = 'text-center mt-3 text-red-400';
            }
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Salvataggio...';

            const { doc, updateDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);

            const teamId = window.InterfacciaCore.currentTeamId;
            const uniformData = this.readControlValues();

            const teamDocRef = doc(window.db, TEAMS_COLLECTION_PATH, teamId);
            await updateDoc(teamDocRef, { uniform: uniformData });

            // Aggiorna i dati locali
            if (window.InterfacciaCore.currentTeamData) {
                window.InterfacciaCore.currentTeamData.uniform = uniformData;
            }

            // Aggiorna anteprima dashboard
            this.updateDashboardPreview(uniformData);

            if (msg) {
                msg.textContent = 'Divisa salvata con successo!';
                msg.className = 'text-center mt-3 text-green-400';
            }

            // Chiudi dopo un breve delay
            setTimeout(() => {
                this.closeEditor();
            }, 1000);

        } catch (error) {
            console.error('Errore nel salvataggio della divisa:', error);
            if (msg) {
                msg.textContent = 'Errore nel salvataggio. Riprova.';
                msg.className = 'text-center mt-3 text-red-400';
            }
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salva Divisa';
        }
    },

    /**
     * Carica e visualizza la divisa del team corrente
     */
    loadTeamUniform() {
        const teamData = window.InterfacciaCore?.currentTeamData;
        if (teamData && teamData.uniform) {
            this.updateDashboardPreview(teamData.uniform);
        } else {
            this.updateDashboardPreview(this.defaultUniform);
        }
    },

    /**
     * Genera un SVG inline della maglia per uso generico (es. preview partite)
     * @param {Object} uniform - Oggetto divisa con shirt, shorts, socks
     * @param {number} size - Dimensione in pixel (default 40)
     * @returns {string} - HTML string con SVG inline
     */
    generateShirtSvg(uniform, size = 40) {
        // Usa default se uniform non valido
        let u = uniform;
        if (!u || !u.shirt || !u.shirt.primaryColor) {
            u = this.defaultUniform;
        }

        const shirt = {
            primaryColor: u.shirt?.primaryColor || this.defaultUniform.shirt.primaryColor,
            secondaryColor: u.shirt?.secondaryColor || this.defaultUniform.shirt.secondaryColor,
            collarColor: u.shirt?.collarColor || u.shirt?.secondaryColor || this.defaultUniform.shirt.collarColor,
            pattern: u.shirt?.pattern || 'solid'
        };

        // Genera pattern inline se necessario
        const patternId = `shirt-pattern-${Math.random().toString(36).substr(2, 9)}`;
        let patternDef = '';
        let fillValue = shirt.primaryColor;

        if (shirt.pattern !== 'solid' && shirt.pattern !== 'shoulders' && shirt.pattern !== 'sleeves') {
            patternDef = this.createPatternDef(patternId.replace('pattern-', ''), shirt).replace(
                new RegExp(`pattern-[^"]+`, 'g'),
                patternId
            );
            if (patternDef) {
                fillValue = `url(#${patternId})`;
            }
        }

        return `
            <svg viewBox="15 0 170 165" width="${size}" height="${size}" style="display: inline-block; vertical-align: middle;">
                <defs>${patternDef}</defs>
                <!-- Corpo maglia con maniche -->
                <path d="M35,35 L35,140 L165,140 L165,35 L145,35 L145,60 L130,60 L130,35 L70,35 L70,60 L55,60 L55,35 Z"
                      fill="${fillValue}" stroke="#1a1a1a" stroke-width="2"/>
                <!-- Colletto -->
                <path d="M70,35 L100,45 L130,35 L120,30 L100,38 L80,30 Z"
                      fill="${shirt.collarColor}" stroke="#1a1a1a" stroke-width="1"/>
                <!-- Polsino sinistro -->
                <rect x="35" y="55" width="20" height="8" fill="${shirt.collarColor}" stroke="#1a1a1a" stroke-width="1"/>
                <!-- Polsino destro -->
                <rect x="145" y="55" width="20" height="8" fill="${shirt.collarColor}" stroke="#1a1a1a" stroke-width="1"/>
            </svg>
        `;
    },

    /**
     * Genera HTML della maglia per una squadra data (cerca nei dati cached o carica)
     * @param {string} teamId - ID della squadra
     * @param {number} size - Dimensione in pixel
     * @returns {string} - HTML string con SVG della maglia
     */
    getTeamShirtHtml(teamId, size = 40) {
        // Prima controlla se abbiamo i dati cached
        if (window.InterfacciaAuth && window.InterfacciaAuth._teamsCache) {
            const cachedTeam = window.InterfacciaAuth._teamsCache.find(t => t.id === teamId);
            if (cachedTeam && cachedTeam.uniform) {
                return this.generateShirtSvg(cachedTeam.uniform, size);
            }
        }
        // Fallback alla divisa di default
        return this.generateShirtSvg(this.defaultUniform, size);
    }
};

// Inizializzazione automatica
document.addEventListener('DOMContentLoaded', () => {
    // Attende che InterfacciaCore sia disponibile
    const checkAndInit = () => {
        if (window.InterfacciaCore && window.firestoreTools) {
            window.UniformEditor.initialize();
        } else {
            setTimeout(checkAndInit, 100);
        }
    };
    checkAndInit();
});

// Listener per aggiornare la divisa quando si carica la dashboard
document.addEventListener('dashboardNeedsUpdate', () => {
    if (window.UniformEditor) {
        window.UniformEditor.loadTeamUniform();
    }
});

console.log("Modulo uniform-editor.js caricato.");
