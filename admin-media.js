//
// ====================================================================
// ADMIN-MEDIA.JS - Configurazione Media da Admin
// ====================================================================
//

window.AdminMedia = {
    // Configurazione caricata da Firestore
    config: null,

    // Immagini disponibili
    availableImages: [
        '90+.png',
        'assist lab.png',
        'calcio 24.png',
        'calcio academy.png',
        'calcio chronicle.png',
        'calcio cuore.png',
        'calcio digitale.png',
        'calcio street.png',
        'Calcio Totale.png',
        'calcio underground.png',
        'corner club.png',
        'curva podcast.png',
        'Diretta stadio net.png',
        'Il Pallone Di Quartiere.png',
        'PANCHINA APERTA.png',
        'Tele Sport Dragoncello.png',
        'Tutto Calcio Oggi.png'
    ],

    // Default config
    defaultConfig: {
        media: [
            { id: '90plus', name: '90+', image: '90+.png', description: 'Emozioni fino all\'ultimo minuto', formula: { perWin: 25, perGoal: 20, perDraw: 5 } },
            { id: 'assist_lab', name: 'Assist Lab', image: 'assist lab.png', description: 'L\'arte dell\'assist', formula: { perWin: 20, perGoal: 10, perDraw: 10, perAssist: 25 } },
            { id: 'calcio_24', name: 'Calcio 24', image: 'calcio 24.png', description: 'Calcio 24 ore su 24', formula: { perWin: 30, perGoal: 15, perDraw: 10 } },
            { id: 'calcio_totale', name: 'Calcio Totale', image: 'Calcio Totale.png', description: 'Copertura totale del calcio', formula: { perWin: 35, perGoal: 15, perDraw: 10 } },
            { id: 'calcio_cuore', name: 'Calcio Cuore', image: 'calcio cuore.png', description: 'Il calcio con il cuore', formula: { perWin: 20, perGoal: 25, perDraw: 15 } },
            { id: 'corner_club', name: 'Corner Club', image: 'corner club.png', description: 'Ogni angolo conta', formula: { perWin: 25, perGoal: 20, perDraw: 10 } },
            { id: 'curva_podcast', name: 'Curva Podcast', image: 'curva podcast.png', description: 'Le voci dalla curva', formula: { perWin: 30, perGoal: 10, perDraw: 15 } },
            { id: 'diretta_stadio', name: 'Diretta Stadio Net', image: 'Diretta stadio net.png', description: 'In diretta dallo stadio', formula: { perWin: 40, perGoal: 10, perDraw: 5 } },
            { id: 'pallone_quartiere', name: 'Il Pallone Di Quartiere', image: 'Il Pallone Di Quartiere.png', description: 'Il calcio di quartiere', formula: { perWin: 20, perGoal: 15, perDraw: 20 } },
            { id: 'panchina_aperta', name: 'Panchina Aperta', image: 'PANCHINA APERTA.png', description: 'Dalla panchina al campo', formula: { perWin: 25, perGoal: 20, perDraw: 15 } },
            { id: 'tele_sport', name: 'Tele Sport Dragoncello', image: 'Tele Sport Dragoncello.png', description: 'La TV dello sport locale', formula: { perWin: 35, perGoal: 15, perDraw: 10 } },
            { id: 'tutto_calcio', name: 'Tutto Calcio Oggi', image: 'Tutto Calcio Oggi.png', description: 'Tutto il calcio in un giorno', formula: { perWin: 30, perGoal: 20, perDraw: 10 } }
        ],
        penaltyCost: 50,
        enabled: true
    },

    async loadConfig() {
        try {
            const { doc, getDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const configPath = `artifacts/${appId}/public/data/config/media`;
            const configDoc = await getDoc(doc(db, configPath));

            if (configDoc.exists()) {
                this.config = configDoc.data();
            } else {
                this.config = JSON.parse(JSON.stringify(this.defaultConfig));
            }
        } catch (error) {
            console.error('Errore caricamento config media:', error);
            this.config = JSON.parse(JSON.stringify(this.defaultConfig));
        }
    },

    async saveConfig() {
        try {
            const { doc, setDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const configPath = `artifacts/${appId}/public/data/config/media`;
            await setDoc(doc(db, configPath), this.config);

            if (window.SponsorSystem) {
                window.SponsorSystem.media = this.config.media;
            }

            return true;
        } catch (error) {
            console.error('Errore salvataggio config media:', error);
            return false;
        }
    },

    renderPanel(container) {
        if (!this.config) {
            container.innerHTML = '<p class="text-red-400">Errore: configurazione non caricata</p>';
            return;
        }

        const mediaCards = this.config.media.map((media, index) => `
            <div class="bg-gray-700 rounded-lg p-4 mb-3 border-l-4 border-pink-500">
                <div class="flex items-center gap-4 mb-3">
                    <div class="w-16 h-16 bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                        <img src="Immagini/Media/${media.image}" alt="${media.name}"
                             class="w-full h-full object-contain p-1"
                             onerror="this.src='Immagini/placeholder.jpg'"
                             id="media-preview-${index}">
                    </div>
                    <div class="flex-1">
                        <input type="text" id="media-name-${index}" value="${media.name}"
                               class="bg-gray-600 text-white font-bold px-2 py-1 rounded w-full mb-1">
                        <select id="media-image-${index}" class="bg-gray-600 text-gray-300 text-sm px-2 py-1 rounded w-full">
                            ${this.availableImages.map(img =>
                                `<option value="${img}" ${media.image === img ? 'selected' : ''}>${img.replace('.png', '')}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <input type="text" id="media-desc-${index}" value="${media.description}"
                       class="bg-gray-600 text-gray-300 text-sm px-2 py-1 rounded w-full mb-2" placeholder="Descrizione">
                <!-- Costo e Bonus EXP -->
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <div>
                        <label class="block text-pink-400 text-xs mb-1 font-bold">Costo (CS)</label>
                        <input type="number" id="media-cost-${index}" value="${media.cost || 0}"
                               class="w-full bg-gray-600 text-pink-300 px-2 py-1 rounded text-center font-bold">
                    </div>
                    <div>
                        <label class="block text-emerald-400 text-xs mb-1 font-bold">Bonus EXP (%)</label>
                        <input type="number" step="0.5" id="media-expbonus-${index}" value="${((media.expBonus || 0) * 100).toFixed(1)}"
                               class="w-full bg-gray-600 text-emerald-300 px-2 py-1 rounded text-center font-bold">
                    </div>
                </div>
                <!-- Formula CS per partita -->
                <div class="grid grid-cols-5 gap-2">
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Vittoria</label>
                        <input type="number" id="media-perwin-${index}" value="${media.formula.perWin}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Gol</label>
                        <input type="number" id="media-pergoal-${index}" value="${media.formula.perGoal}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Pareggio</label>
                        <input type="number" id="media-perdraw-${index}" value="${media.formula.perDraw}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Assist</label>
                        <input type="number" id="media-perassist-${index}" value="${media.formula.perAssist || 0}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Clean Sheet</label>
                        <input type="number" id="media-cleansheet-${index}" value="${media.formula.cleanSheet || 0}"
                               class="w-full bg-gray-600 text-white px-2 py-1 rounded text-center">
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gray-700 rounded-lg p-4 mb-4">
                    <h4 class="text-pink-400 font-bold mb-3">Impostazioni Generali</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-gray-400 text-sm mb-1">Penale Cambio Media (CS)</label>
                            <input type="number" id="media-penalty" value="${this.config.penaltyCost || 50}"
                                   class="w-full bg-gray-600 text-white px-3 py-2 rounded">
                        </div>
                        <div class="flex items-center justify-center">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="media-enabled" ${this.config.enabled !== false ? 'checked' : ''}
                                       class="w-5 h-5 rounded">
                                <span class="text-gray-300">Sistema Attivo</span>
                            </label>
                        </div>
                    </div>
                </div>

                <h4 class="text-pink-400 font-bold">Media Partner Disponibili (${this.config.media.length})</h4>
                <div class="max-h-[50vh] overflow-y-auto pr-2">
                    ${mediaCards}
                </div>

                <div class="flex justify-end gap-3 mt-4">
                    <button id="btn-reset-media" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition">
                        Reset Default
                    </button>
                    <button id="btn-save-media" class="px-6 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg font-bold transition">
                        Salva
                    </button>
                </div>
            </div>
        `;

        this.attachListeners(container);
    },

    attachListeners(container) {
        const btnSave = container.querySelector('#btn-save-media');
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

        const btnReset = container.querySelector('#btn-reset-media');
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
        container.querySelectorAll('[id^="media-image-"]').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = e.target.id.replace('media-image-', '');
                const preview = container.querySelector(`#media-preview-${index}`);
                if (preview) {
                    preview.src = `Immagini/Media/${e.target.value}`;
                }
            });
        });
    },

    collectFormValues() {
        this.config.penaltyCost = parseInt(document.getElementById('media-penalty').value) || 50;
        this.config.enabled = document.getElementById('media-enabled').checked;

        this.config.media.forEach((media, index) => {
            media.name = document.getElementById(`media-name-${index}`).value;
            media.image = document.getElementById(`media-image-${index}`).value;
            media.description = document.getElementById(`media-desc-${index}`).value;
            // Costo e Bonus EXP
            media.cost = parseInt(document.getElementById(`media-cost-${index}`).value) || 0;
            media.expBonus = (parseFloat(document.getElementById(`media-expbonus-${index}`).value) || 0) / 100;
            // Formula CS
            media.formula.perWin = parseInt(document.getElementById(`media-perwin-${index}`).value) || 0;
            media.formula.perGoal = parseInt(document.getElementById(`media-pergoal-${index}`).value) || 0;
            media.formula.perDraw = parseInt(document.getElementById(`media-perdraw-${index}`).value) || 0;
            media.formula.perAssist = parseInt(document.getElementById(`media-perassist-${index}`).value) || 0;
            media.formula.cleanSheet = parseInt(document.getElementById(`media-cleansheet-${index}`).value) || 0;
        });
    }
};

console.log("Modulo AdminMedia caricato.");
