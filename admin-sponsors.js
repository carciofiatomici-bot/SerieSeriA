//
// ====================================================================
// ADMIN-SPONSORS.JS - Configurazione Sponsor da Admin
// ====================================================================
//

window.AdminSponsors = {
    // Configurazione caricata da Firestore
    config: null,

    // Immagini disponibili
    availableImages: [
        'apracadabra.png',
        'assicurazioni fortuna.png',
        'auto spinta.png',
        'bar sportivo.png',
        'birra del borgo.png',
        'birra grossa.png',
        'birra terzo tempo.png',
        'birrificio-del-pareggio.png',
        'MONDO SErrande.png'
    ],

    // Helper per ottenere URL immagine da GitHub
    getImageUrl(imageName) {
        return window.SponsorSystem?.getSponsorImageUrl(imageName) || `Immagini/Sponsor/${imageName}`;
    },

    // Default config - ordinati per costo crescente (0-1500 CS)
    // Formula: V + 5*G + 5*A + CS = Tot 5-0
    defaultConfig: {
        sponsors: [
            { id: 'birrificio_pareggio', name: 'Birrificio del Pareggio', image: 'birrificio-del-pareggio.png', description: 'Anche il pareggio merita una birra', cost: 0, expBonus: 0, formula: { perWin: 10, perGoal: 4, perDraw: 8, perAssist: 4, cleanSheet: 10 } },
            { id: 'bar_sportivo', name: 'Bar Sportivo', image: 'bar sportivo.png', description: 'Dove si festeggia ogni vittoria', cost: 500, expBonus: 0.01, formula: { perWin: 15, perGoal: 5, perDraw: 5, perAssist: 5, cleanSheet: 15 } },
            { id: 'mondo_serrande', name: 'Mondo Serrande', image: 'MONDO SErrande.png', description: 'Chiudiamo la porta agli avversari', cost: 650, expBonus: 0.02, formula: { perWin: 18, perGoal: 6, perDraw: 6, perAssist: 6, cleanSheet: 18 } },
            { id: 'auto_spinta', name: 'Auto Spinta', image: 'auto spinta.png', description: 'Spingiamo la tua squadra al successo', cost: 800, expBonus: 0.03, formula: { perWin: 20, perGoal: 7, perDraw: 6, perAssist: 7, cleanSheet: 20 } },
            { id: 'birra_terzo_tempo', name: 'Birra Terzo Tempo', image: 'birra terzo tempo.png', description: 'Il terzo tempo inizia qui', cost: 950, expBonus: 0.04, formula: { perWin: 22, perGoal: 7, perDraw: 8, perAssist: 7, cleanSheet: 22 } },
            { id: 'birra_del_borgo', name: 'Birra del Borgo', image: 'birra del borgo.png', description: 'La birra dei campioni locali', cost: 1100, expBonus: 0.05, formula: { perWin: 24, perGoal: 8, perDraw: 6, perAssist: 8, cleanSheet: 24 } },
            { id: 'apracadabra', name: 'Apracadabra', image: 'apracadabra.png', description: 'Magia nei risultati!', cost: 1250, expBonus: 0.06, formula: { perWin: 28, perGoal: 8, perDraw: 8, perAssist: 8, cleanSheet: 26 } },
            { id: 'birra_grossa', name: 'Birra Grossa', image: 'birra grossa.png', description: 'Grande birra, grandi risultati', cost: 1400, expBonus: 0.07, formula: { perWin: 32, perGoal: 9, perDraw: 6, perAssist: 9, cleanSheet: 28 } },
            { id: 'assicurazioni_fortuna', name: 'Assicurazioni Fortuna', image: 'assicurazioni fortuna.png', description: 'La fortuna protegge i vincitori', cost: 1500, expBonus: 0.075, formula: { perWin: 35, perGoal: 10, perDraw: 10, perAssist: 9, cleanSheet: 30 } }
        ],
        penaltyCost: 50,
        enabled: true
    },

    async loadConfig() {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const configPath = `artifacts/${appId}/public/data/config/sponsors`;
            const configDoc = await getDoc(doc(db, configPath));

            if (configDoc.exists()) {
                this.config = configDoc.data();
            } else {
                this.config = JSON.parse(JSON.stringify(this.defaultConfig));
            }
        } catch (error) {
            console.error('Errore caricamento config sponsor:', error);
            this.config = JSON.parse(JSON.stringify(this.defaultConfig));
        }
    },

    async saveConfig() {
        try {
            const { doc, setDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const configPath = `artifacts/${appId}/public/data/config/sponsors`;
            await setDoc(doc(db, configPath), this.config);

            if (window.SponsorSystem) {
                window.SponsorSystem.sponsors = this.config.sponsors;
                window.SponsorSystem.penaltyCost = this.config.penaltyCost;
            }

            return true;
        } catch (error) {
            console.error('Errore salvataggio config sponsor:', error);
            return false;
        }
    },

    renderPanel(container) {
        if (!this.config) {
            container.innerHTML = '<p class="text-red-400">Errore: configurazione non caricata</p>';
            return;
        }

        const imageOptions = this.availableImages.map(img =>
            `<option value="${img}">${img.replace('.png', '')}</option>`
        ).join('');

        const sponsorCards = this.config.sponsors.map((sponsor, index) => `
            <div class="bg-gray-700 rounded-lg p-4 mb-3 border-l-4 border-yellow-500">
                <div class="flex items-center gap-4 mb-3">
                    <div class="w-16 h-16 bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                        <img src="${this.getImageUrl(sponsor.image)}" alt="${sponsor.name}"
                             class="w-full h-full object-contain p-1"
                             onerror="this.src='https://placehold.co/64x64/374151/9ca3af?text=?'"
                             id="sponsor-preview-${index}">
                    </div>
                    <div class="flex-1">
                        <input type="text" id="sponsor-name-${index}" value="${sponsor.name}"
                               class="bg-gray-600 text-white font-bold px-2 py-1 rounded w-full mb-1">
                        <select id="sponsor-image-${index}" class="bg-gray-600 text-gray-300 text-sm px-2 py-1 rounded w-full">
                            ${this.availableImages.map(img =>
                                `<option value="${img}" ${sponsor.image === img ? 'selected' : ''}>${img.replace('.png', '')}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <input type="text" id="sponsor-desc-${index}" value="${sponsor.description}"
                       class="bg-gray-600 text-gray-300 text-sm px-2 py-1 rounded w-full mb-2" placeholder="Descrizione">
                <!-- Costo e Bonus EXP -->
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <div>
                        <label class="block text-yellow-400 text-xs mb-1 font-bold">Costo (CS)</label>
                        <input type="number" id="sponsor-cost-${index}" value="${sponsor.cost || 0}"
                               class="w-full bg-gray-600 text-yellow-300 px-2 py-1 rounded text-center font-bold">
                    </div>
                    <div>
                        <label class="block text-emerald-400 text-xs mb-1 font-bold">Bonus EXP (%)</label>
                        <input type="number" step="0.5" id="sponsor-expbonus-${index}" value="${((sponsor.expBonus || 0) * 100).toFixed(1)}"
                               class="w-full bg-gray-600 text-emerald-300 px-2 py-1 rounded text-center font-bold">
                    </div>
                </div>
                <!-- Formula CS per partita -->
                <div class="grid grid-cols-5 gap-2">
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Vittoria</label>
                        <input type="number" id="sponsor-perwin-${index}" value="${sponsor.formula.perWin}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Gol</label>
                        <input type="number" id="sponsor-pergoal-${index}" value="${sponsor.formula.perGoal}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Pareggio</label>
                        <input type="number" id="sponsor-perdraw-${index}" value="${sponsor.formula.perDraw}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Assist</label>
                        <input type="number" id="sponsor-perassist-${index}" value="${sponsor.formula.perAssist || 0}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Clean Sheet</label>
                        <input type="number" id="sponsor-cleansheet-${index}" value="${sponsor.formula.cleanSheet || 0}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gray-700 rounded-lg p-4 mb-4">
                    <h4 class="text-yellow-400 font-bold mb-3">Impostazioni Generali</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-gray-400 text-sm mb-1">Penale Cambio Sponsor (CS)</label>
                            <input type="number" id="sponsor-penalty" value="${this.config.penaltyCost}"
                                   class="w-full bg-gray-600 text-white px-3 py-2 rounded">
                        </div>
                        <div class="flex items-center justify-center">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="sponsors-enabled" ${this.config.enabled !== false ? 'checked' : ''}
                                       class="w-5 h-5 rounded">
                                <span class="text-gray-300">Sistema Attivo</span>
                            </label>
                        </div>
                    </div>
                </div>

                <h4 class="text-yellow-400 font-bold">Sponsor Disponibili (${this.config.sponsors.length})</h4>
                <div class="max-h-[50vh] overflow-y-auto pr-2">
                    ${sponsorCards}
                </div>

                <div class="flex justify-end gap-3 mt-4">
                    <button id="btn-reset-sponsors" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition">
                        Reset Default
                    </button>
                    <button id="btn-save-sponsors" class="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold transition">
                        Salva
                    </button>
                </div>
            </div>
        `;

        this.attachListeners(container);
    },

    attachListeners(container) {
        const btnSave = container.querySelector('#btn-save-sponsors');
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                try {
                    this.collectFormValues();
                    const success = await this.saveConfig();
                    if (success) {
                        if (window.Toast) window.Toast.success('Configurazione salvata!');
                    } else {
                        if (window.Toast) window.Toast.error('Errore nel salvataggio');
                    }
                } catch (error) {
                    console.error('[AdminSponsors] Errore salvataggio config:', error);
                    window.ErrorHandler?.handle(error, { context: 'save-sponsors-config' });
                }
            });
        }

        const btnReset = container.querySelector('#btn-reset-sponsors');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm('Ripristinare i valori default?')) {
                    this.config = JSON.parse(JSON.stringify(this.defaultConfig));
                    this.renderPanel(container);
                    if (window.Toast) window.Toast.info('Valori resettati');
                }
            });
        }

        // Aggiorna preview immagine
        container.querySelectorAll('[id^="sponsor-image-"]').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = e.target.id.replace('sponsor-image-', '');
                const preview = container.querySelector(`#sponsor-preview-${index}`);
                if (preview) {
                    preview.src = this.getImageUrl(e.target.value);
                }
            });
        });
    },

    collectFormValues() {
        this.config.penaltyCost = parseInt(document.getElementById('sponsor-penalty').value) || 50;
        this.config.enabled = document.getElementById('sponsors-enabled').checked;

        this.config.sponsors.forEach((sponsor, index) => {
            sponsor.name = document.getElementById(`sponsor-name-${index}`).value;
            sponsor.image = document.getElementById(`sponsor-image-${index}`).value;
            sponsor.description = document.getElementById(`sponsor-desc-${index}`).value;
            // Costo e Bonus EXP
            sponsor.cost = parseInt(document.getElementById(`sponsor-cost-${index}`).value) || 0;
            sponsor.expBonus = (parseFloat(document.getElementById(`sponsor-expbonus-${index}`).value) || 0) / 100;
            // Formula CS
            sponsor.formula.perWin = parseInt(document.getElementById(`sponsor-perwin-${index}`).value) || 0;
            sponsor.formula.perGoal = parseInt(document.getElementById(`sponsor-pergoal-${index}`).value) || 0;
            sponsor.formula.perDraw = parseInt(document.getElementById(`sponsor-perdraw-${index}`).value) || 0;
            sponsor.formula.perAssist = parseInt(document.getElementById(`sponsor-perassist-${index}`).value) || 0;
            sponsor.formula.cleanSheet = parseInt(document.getElementById(`sponsor-cleansheet-${index}`).value) || 0;
        });
    }
};

console.log("Modulo AdminSponsors caricato.");
