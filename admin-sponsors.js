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
        'birrificio del pareggio.png',
        'MONDO SErrande.png'
    ],

    // Default config
    defaultConfig: {
        sponsors: [
            { id: 'apracadabra', name: 'Apracadabra', image: 'apracadabra.png', description: 'Magia nei risultati!', formula: { perWin: 40, perGoal: 15, perDraw: 10 } },
            { id: 'assicurazioni_fortuna', name: 'Assicurazioni Fortuna', image: 'assicurazioni fortuna.png', description: 'La fortuna protegge i vincitori', formula: { perWin: 60, perGoal: 5, perDraw: 15 } },
            { id: 'auto_spinta', name: 'Auto Spinta', image: 'auto spinta.png', description: 'Spingiamo la tua squadra al successo', formula: { perWin: 50, perGoal: 10, perDraw: 10 } },
            { id: 'bar_sportivo', name: 'Bar Sportivo', image: 'bar sportivo.png', description: 'Dove si festeggia ogni vittoria', formula: { perWin: 35, perGoal: 20, perDraw: 15 } },
            { id: 'birra_del_borgo', name: 'Birra del Borgo', image: 'birra del borgo.png', description: 'La birra dei campioni locali', formula: { perWin: 45, perGoal: 10, perDraw: 20 } },
            { id: 'birra_grossa', name: 'Birra Grossa', image: 'birra grossa.png', description: 'Grande birra, grandi risultati', formula: { perWin: 30, perGoal: 25, perDraw: 10 } },
            { id: 'birra_terzo_tempo', name: 'Birra Terzo Tempo', image: 'birra terzo tempo.png', description: 'Il terzo tempo inizia qui', formula: { perWin: 40, perGoal: 15, perDraw: 15 } },
            { id: 'birrificio_pareggio', name: 'Birrificio del Pareggio', image: 'birrificio del pareggio.png', description: 'Anche il pareggio merita una birra', formula: { perWin: 25, perGoal: 10, perDraw: 40 } },
            { id: 'mondo_serrande', name: 'Mondo Serrande', image: 'MONDO SErrande.png', description: 'Chiudiamo la porta agli avversari', formula: { perWin: 55, perGoal: 5, perDraw: 10, cleanSheet: 30 } }
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
                        <img src="Immagini/Sponsor/${sponsor.image}" alt="${sponsor.name}"
                             class="w-full h-full object-contain p-1"
                             onerror="this.src='Immagini/placeholder.jpg'"
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
                this.collectFormValues();
                const success = await this.saveConfig();
                if (success) {
                    if (window.Toast) window.Toast.success('Configurazione salvata!');
                } else {
                    if (window.Toast) window.Toast.error('Errore nel salvataggio');
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
                    preview.src = `Immagini/Sponsor/${e.target.value}`;
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
