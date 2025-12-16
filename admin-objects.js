//
// ====================================================================
// ADMIN-OBJECTS.JS - Gestione Oggetti Equipaggiabili (Admin)
// ====================================================================
//
// Pannello admin per creare e gestire oggetti equipaggiabili.
// Gli oggetti danno bonus ai modificatori durante le simulazioni.
//

window.AdminObjects = {

    // Costanti
    OBJECT_TYPES: ['cappello', 'maglia', 'guanti', 'parastinchi', 'scarpini'],
    PHASES: ['costruzione', 'attacco', 'difesa', 'portiere', 'tiro', 'tutte'],
    APPLY_TO: ['attack', 'defense', 'both'],

    // Labels per UI
    TYPE_LABELS: {
        'cappello': 'Cappello',
        'maglia': 'Maglia',
        'guanti': 'Guanti',
        'parastinchi': 'Parastinchi',
        'scarpini': 'Scarpini'
    },
    PHASE_LABELS: {
        'costruzione': 'Costruzione',
        'attacco': 'Attacco',
        'difesa': 'Difesa',
        'portiere': 'Portiere',
        'tiro': 'Tiro',
        'tutte': 'Tutte le fasi'
    },
    APPLY_LABELS: {
        'attack': 'Solo in Attacco',
        'defense': 'Solo in Difesa',
        'both': 'Attacco e Difesa'
    },

    // Icone per tipo
    TYPE_ICONS: {
        'cappello': '🧢',
        'maglia': '👕',
        'guanti': '🧤',
        'parastinchi': '🦵',
        'scarpini': '👟'
    },

    /**
     * Calcola il costo di un oggetto
     * Formula: 150 + (100 * bonus)
     */
    calculateCost(bonus) {
        return Math.round(150 + (100 * bonus));
    },

    /**
     * Ottiene il path Firestore per gli oggetti
     */
    getObjectsPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/marketObjects` : null;
    },

    /**
     * Mostra il modal per creare/gestire oggetti
     */
    showObjectManagerModal() {
        // Rimuovi modal esistente
        document.getElementById('admin-objects-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'admin-objects-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-emerald-500 shadow-2xl">
                <!-- Header -->
                <div class="bg-gradient-to-r from-emerald-700 to-teal-600 p-4 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <span>🎒</span> Gestione Oggetti Equipaggiabili
                    </h2>
                    <button onclick="document.getElementById('admin-objects-modal').remove()"
                            class="text-white hover:text-red-300 text-2xl font-bold">&times;</button>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-gray-700">
                    <button id="tab-create-object" onclick="window.AdminObjects.showTab('create')"
                            class="flex-1 py-3 px-4 text-center font-bold bg-emerald-700 text-white">
                        Crea Nuovo Oggetto
                    </button>
                    <button id="tab-list-objects" onclick="window.AdminObjects.showTab('list')"
                            class="flex-1 py-3 px-4 text-center font-bold bg-gray-800 text-gray-400 hover:text-white">
                        Lista Oggetti
                    </button>
                </div>

                <!-- Content -->
                <div class="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <!-- Tab Crea -->
                    <div id="tab-content-create">
                        ${this.renderCreateForm()}
                    </div>

                    <!-- Tab Lista (nascosto inizialmente) -->
                    <div id="tab-content-list" class="hidden">
                        <div id="objects-list-container">
                            <p class="text-gray-400 text-center py-8">Caricamento oggetti...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Click fuori per chiudere
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Carica lista oggetti in background
        this.loadObjectsList();
    },

    /**
     * Mostra una tab specifica
     */
    showTab(tabName) {
        const tabCreate = document.getElementById('tab-create-object');
        const tabList = document.getElementById('tab-list-objects');
        const contentCreate = document.getElementById('tab-content-create');
        const contentList = document.getElementById('tab-content-list');

        if (tabName === 'create') {
            tabCreate.className = 'flex-1 py-3 px-4 text-center font-bold bg-emerald-700 text-white';
            tabList.className = 'flex-1 py-3 px-4 text-center font-bold bg-gray-800 text-gray-400 hover:text-white';
            contentCreate.classList.remove('hidden');
            contentList.classList.add('hidden');
        } else {
            tabList.className = 'flex-1 py-3 px-4 text-center font-bold bg-emerald-700 text-white';
            tabCreate.className = 'flex-1 py-3 px-4 text-center font-bold bg-gray-800 text-gray-400 hover:text-white';
            contentList.classList.remove('hidden');
            contentCreate.classList.add('hidden');
            this.loadObjectsList();
        }
    },

    /**
     * Renderizza il form di creazione
     */
    renderCreateForm() {
        const typeOptions = this.OBJECT_TYPES.map(t =>
            `<option value="${t}">${this.TYPE_ICONS[t]} ${this.TYPE_LABELS[t]}</option>`
        ).join('');

        const phaseOptions = this.PHASES.map(p =>
            `<option value="${p}">${this.PHASE_LABELS[p]}</option>`
        ).join('');

        const applyOptions = this.APPLY_TO.map(a =>
            `<option value="${a}">${this.APPLY_LABELS[a]}</option>`
        ).join('');

        return `
            <form id="create-object-form" class="space-y-4">
                <!-- Nome -->
                <div>
                    <label class="block text-sm font-bold text-gray-300 mb-1">Nome Oggetto *</label>
                    <input type="text" id="obj-name" required
                           class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                           placeholder="es. Scarpini Veloci">
                </div>

                <!-- Tipo -->
                <div>
                    <label class="block text-sm font-bold text-gray-300 mb-1">Tipo Oggetto *</label>
                    <select id="obj-type" required
                            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none">
                        ${typeOptions}
                    </select>
                </div>

                <!-- Bonus Modificatore -->
                <div>
                    <label class="block text-sm font-bold text-gray-300 mb-1">Bonus Modificatore *</label>
                    <input type="number" id="obj-bonus" required step="0.5" min="0.5" max="5" value="1"
                           onchange="window.AdminObjects.updateCostPreview()"
                           oninput="window.AdminObjects.updateCostPreview()"
                           class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none">
                    <p class="text-xs text-gray-500 mt-1">Valore da 0.5 a 5.0 (incrementi di 0.5)</p>
                </div>

                <!-- Fase -->
                <div>
                    <label class="block text-sm font-bold text-gray-300 mb-1">Fase Bonus *</label>
                    <select id="obj-phase" required
                            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none">
                        ${phaseOptions}
                    </select>
                    <p class="text-xs text-gray-500 mt-1">In quale fase della simulazione si applica il bonus</p>
                </div>

                <!-- Applica a -->
                <div>
                    <label class="block text-sm font-bold text-gray-300 mb-1">Applica a *</label>
                    <select id="obj-apply" required
                            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none">
                        ${applyOptions}
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Se il bonus si applica quando la squadra attacca, difende o entrambi</p>
                </div>

                <!-- Preview Costo -->
                <div class="bg-gray-800 rounded-lg p-4 border border-emerald-500">
                    <div class="flex justify-between items-center">
                        <span class="text-gray-300">Costo calcolato:</span>
                        <span id="cost-preview" class="text-2xl font-bold text-emerald-400">250 CS</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Formula: 150 + (100 x bonus)</p>
                </div>

                <!-- Messaggio -->
                <div id="create-object-message" class="hidden"></div>

                <!-- Bottoni -->
                <div class="flex gap-4">
                    <button type="submit"
                            class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition">
                        Crea Oggetto
                    </button>
                    <button type="button" onclick="window.AdminObjects.seedDefaultObjects()"
                            class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition">
                        Seed Predefiniti
                    </button>
                </div>
            </form>
        `;
    },

    /**
     * Aggiorna la preview del costo
     */
    updateCostPreview() {
        const bonus = parseFloat(document.getElementById('obj-bonus')?.value) || 1;
        const cost = this.calculateCost(bonus);
        const preview = document.getElementById('cost-preview');
        if (preview) {
            preview.textContent = `${cost} CS`;
        }
    },

    /**
     * Crea un nuovo oggetto
     */
    async createObject(objectData) {
        const path = this.getObjectsPath();
        if (!path || !window.db || !window.firestoreTools) {
            throw new Error('Firestore non disponibile');
        }

        const { collection, addDoc, Timestamp } = window.firestoreTools;
        const collectionRef = collection(window.db, path);

        const newObject = {
            id: null, // Verrà aggiornato dopo
            name: objectData.name,
            type: objectData.type,
            bonus: objectData.bonus,
            phase: objectData.phase,
            applyTo: objectData.applyTo,
            cost: this.calculateCost(objectData.bonus),
            originalCost: this.calculateCost(objectData.bonus),
            isDefault: objectData.isDefault || false,
            available: true,
            ownerId: null,
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collectionRef, newObject);

        // Aggiorna con l'ID
        const { updateDoc } = window.firestoreTools;
        await updateDoc(docRef, { id: docRef.id });

        return { ...newObject, id: docRef.id };
    },

    /**
     * Carica la lista degli oggetti
     */
    async loadObjectsList() {
        const container = document.getElementById('objects-list-container');
        if (!container) return;

        const path = this.getObjectsPath();
        if (!path || !window.db || !window.firestoreTools) {
            container.innerHTML = '<p class="text-red-400 text-center py-8">Firestore non disponibile</p>';
            return;
        }

        try {
            const { collection, getDocs } = window.firestoreTools;
            const collectionRef = collection(window.db, path);
            const snapshot = await getDocs(collectionRef);

            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-gray-400 mb-4">Nessun oggetto presente nel mercato.</p>
                        <button onclick="window.AdminObjects.seedDefaultObjects()"
                                class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition">
                            Crea Oggetti Predefiniti
                        </button>
                    </div>
                `;
                return;
            }

            const objects = [];
            snapshot.forEach(doc => objects.push(doc.data()));

            // Raggruppa per tipo e ordina per nome
            const grouped = {};
            this.OBJECT_TYPES.forEach(type => grouped[type] = []);
            objects.forEach(obj => {
                if (grouped[obj.type]) {
                    grouped[obj.type].push(obj);
                }
            });
            // Ordina ogni gruppo per nome
            this.OBJECT_TYPES.forEach(type => {
                grouped[type].sort((a, b) => a.name.localeCompare(b.name));
            });

            let html = '';
            for (const type of this.OBJECT_TYPES) {
                const items = grouped[type];
                if (items.length === 0) continue;

                html += `
                    <div class="mb-6">
                        <h3 class="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
                            <span>${this.TYPE_ICONS[type]}</span> ${this.TYPE_LABELS[type]} (${items.length})
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${items.map(obj => this.renderObjectCard(obj)).join('')}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;

        } catch (error) {
            console.error('[AdminObjects] Errore caricamento:', error);
            container.innerHTML = `<p class="text-red-400 text-center py-8">Errore: ${error.message}</p>`;
        }
    },

    /**
     * Renderizza una card oggetto
     */
    renderObjectCard(obj) {
        const statusColor = obj.available ? 'text-green-400' : 'text-red-400';
        const statusText = obj.available ? 'Disponibile' : 'Acquistato';

        return `
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-emerald-500 transition">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-white">${this.TYPE_ICONS[obj.type]} ${obj.name}</h4>
                        <p class="text-sm text-gray-400">
                            +${obj.bonus} in ${this.PHASE_LABELS[obj.phase]} (${this.APPLY_LABELS[obj.applyTo]})
                        </p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-emerald-400">${obj.cost} CS</p>
                        <p class="text-xs ${statusColor}">${statusText}</p>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-2">
                    ${obj.available ? `
                        <button onclick="window.AdminObjects.deleteObject('${obj.id}')"
                                class="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded transition">
                            Elimina
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Elimina un oggetto
     */
    async deleteObject(objectId) {
        if (!confirm('Sei sicuro di voler eliminare questo oggetto?')) return;

        const path = this.getObjectsPath();
        if (!path || !window.db || !window.firestoreTools) {
            alert('Firestore non disponibile');
            return;
        }

        try {
            const { doc, deleteDoc } = window.firestoreTools;
            await deleteDoc(doc(window.db, path, objectId));
            this.loadObjectsList();
            console.log('[AdminObjects] Oggetto eliminato:', objectId);
        } catch (error) {
            console.error('[AdminObjects] Errore eliminazione:', error);
            alert('Errore eliminazione: ' + error.message);
        }
    },

    /**
     * Crea gli oggetti predefiniti
     */
    async seedDefaultObjects() {
        const defaultObjects = [
            { name: 'Cappellino Porta Fortuna', type: 'cappello', bonus: 0.5, phase: 'tutte', applyTo: 'both', isDefault: true },
            { name: 'Elmetto Tattico', type: 'cappello', bonus: 1.0, phase: 'difesa', applyTo: 'defense', isDefault: true },
            { name: 'Maglia Leggera', type: 'maglia', bonus: 0.5, phase: 'tutte', applyTo: 'both', isDefault: true },
            { name: 'Maglia da Bomber', type: 'maglia', bonus: 1.0, phase: 'tiro', applyTo: 'attack', isDefault: true },
            { name: 'Guanti Grip', type: 'guanti', bonus: 1.0, phase: 'costruzione', applyTo: 'both', isDefault: true },
            { name: 'Guanti da Portiere Pro', type: 'guanti', bonus: 1.5, phase: 'portiere', applyTo: 'defense', isDefault: true },
            { name: 'Parastinchi Rinforzati', type: 'parastinchi', bonus: 1.0, phase: 'difesa', applyTo: 'defense', isDefault: true },
            { name: 'Parastinchi Leggeri', type: 'parastinchi', bonus: 0.5, phase: 'attacco', applyTo: 'attack', isDefault: true },
            { name: 'Scarpini Velocita', type: 'scarpini', bonus: 1.0, phase: 'attacco', applyTo: 'attack', isDefault: true },
            { name: 'Scarpini Precisione', type: 'scarpini', bonus: 1.0, phase: 'tiro', applyTo: 'attack', isDefault: true }
        ];

        const messageEl = document.getElementById('create-object-message');
        if (messageEl) {
            messageEl.className = 'bg-blue-900 border border-blue-500 text-blue-200 p-3 rounded-lg';
            messageEl.textContent = 'Creazione oggetti predefiniti in corso...';
            messageEl.classList.remove('hidden');
        }

        try {
            let created = 0;
            for (const obj of defaultObjects) {
                await this.createObject(obj);
                created++;
            }

            if (messageEl) {
                messageEl.className = 'bg-green-900 border border-green-500 text-green-200 p-3 rounded-lg';
                messageEl.textContent = `Creati ${created} oggetti predefiniti con successo!`;
            }

            // Ricarica lista
            this.loadObjectsList();

        } catch (error) {
            console.error('[AdminObjects] Errore seed:', error);
            if (messageEl) {
                messageEl.className = 'bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg';
                messageEl.textContent = `Errore: ${error.message}`;
            }
        }
    },

    /**
     * Inizializza gli event listeners
     */
    init() {
        // Form creazione
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'create-object-form') {
                e.preventDefault();

                const name = document.getElementById('obj-name').value.trim();
                const type = document.getElementById('obj-type').value;
                const bonus = parseFloat(document.getElementById('obj-bonus').value);
                const phase = document.getElementById('obj-phase').value;
                const applyTo = document.getElementById('obj-apply').value;

                const messageEl = document.getElementById('create-object-message');

                if (!name) {
                    messageEl.className = 'bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg';
                    messageEl.textContent = 'Inserisci un nome per l\'oggetto';
                    messageEl.classList.remove('hidden');
                    return;
                }

                try {
                    messageEl.className = 'bg-blue-900 border border-blue-500 text-blue-200 p-3 rounded-lg';
                    messageEl.textContent = 'Creazione in corso...';
                    messageEl.classList.remove('hidden');

                    await this.createObject({ name, type, bonus, phase, applyTo, isDefault: false });

                    messageEl.className = 'bg-green-900 border border-green-500 text-green-200 p-3 rounded-lg';
                    messageEl.textContent = `Oggetto "${name}" creato con successo!`;

                    // Reset form
                    document.getElementById('obj-name').value = '';
                    document.getElementById('obj-bonus').value = '1';
                    this.updateCostPreview();

                    // Ricarica lista
                    this.loadObjectsList();

                } catch (error) {
                    console.error('[AdminObjects] Errore creazione:', error);
                    messageEl.className = 'bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg';
                    messageEl.textContent = `Errore: ${error.message}`;
                }
            }
        });
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.AdminObjects.init();
});

console.log("Modulo AdminObjects caricato.");
