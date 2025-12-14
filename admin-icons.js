//
// ====================================================================
// MODULO ADMIN-ICONS.JS (Gestione Icone/Capitani Admin)
// ====================================================================
// Le icone vengono salvate su Firestore per persistenza permanente
//

window.AdminIcons = {
    modalInstance: null,
    currentEditingIconIndex: null,
    ICONS_COLLECTION_PATH: null,

    /**
     * Ottiene il path della collection icone su Firestore
     */
    getIconsPath() {
        if (!this.ICONS_COLLECTION_PATH) {
            const appId = window.firestoreTools?.appId || 'default';
            this.ICONS_COLLECTION_PATH = `artifacts/${appId}/public/data/icons`;
        }
        return this.ICONS_COLLECTION_PATH;
    },

    /**
     * Carica le icone da Firestore (se esistono) e le mergia con quelle di default
     * Auto-sincronizza se rileva differenze in nome o abilita
     */
    async loadIconsFromFirestore() {
        const { collection, getDocs } = window.firestoreTools;
        const db = window.db;
        const iconsPath = this.getIconsPath();

        try {
            const iconsCollectionRef = collection(db, iconsPath);
            const querySnapshot = await getDocs(iconsCollectionRef);

            // Salva una copia delle icone originali da icone.js PRIMA di qualsiasi merge
            const originalIcons = JSON.parse(JSON.stringify(window.CAPTAIN_CANDIDATES_TEMPLATES || []));

            if (!querySnapshot.empty) {
                // Carica le icone da Firestore
                const firestoreIconsMap = {};
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    firestoreIconsMap[data.id] = { ...data, firestoreId: doc.id };
                });

                // Controlla se ci sono differenze e aggiorna Firestore se necessario
                const iconsToUpdate = [];
                for (const localIcon of originalIcons) {
                    const firestoreIcon = firestoreIconsMap[localIcon.id];
                    if (firestoreIcon) {
                        // Confronta nome e abilita
                        const nameChanged = firestoreIcon.name !== localIcon.name;
                        const abilitiesChanged = JSON.stringify(firestoreIcon.abilities || []) !== JSON.stringify(localIcon.abilities || []);

                        if (nameChanged || abilitiesChanged) {
                            console.log(`🔄 Differenza rilevata per ${localIcon.id}: ` +
                                (nameChanged ? `nome "${firestoreIcon.name}" -> "${localIcon.name}" ` : '') +
                                (abilitiesChanged ? `abilita aggiornate` : ''));
                            iconsToUpdate.push(localIcon);
                        }
                    }
                }

                // Auto-aggiorna Firestore se ci sono differenze
                if (iconsToUpdate.length > 0) {
                    console.log(`🔄 Auto-sincronizzazione: ${iconsToUpdate.length} icone da aggiornare su Firestore...`);
                    for (const icon of iconsToUpdate) {
                        try {
                            await this.saveIconToFirestore(icon);
                        } catch (e) {
                            console.error(`Errore aggiornamento ${icon.name}:`, e);
                        }
                    }
                    console.log(`✅ Icone aggiornate su Firestore!`);
                }

                // Mergia le icone - USA I VALORI LOCALI per nome e abilita
                const currentIcons = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
                for (let i = 0; i < currentIcons.length; i++) {
                    const iconId = currentIcons[i].id;
                    const localIcon = originalIcons.find(ic => ic.id === iconId);
                    if (firestoreIconsMap[iconId]) {
                        // Prendi i dati da Firestore MA sovrascrivi nome e abilita con quelli locali
                        currentIcons[i] = {
                            ...firestoreIconsMap[iconId],
                            name: localIcon?.name || firestoreIconsMap[iconId].name,
                            abilities: localIcon?.abilities || firestoreIconsMap[iconId].abilities
                        };
                    }
                }

                const firestoreCount = Object.keys(firestoreIconsMap).length;
                console.log(`Mergiate ${firestoreCount} icone da Firestore con ${currentIcons.length} icone di default`);
            } else {
                console.log('Nessuna icona su Firestore, uso quelle di default da icone.js');
            }
        } catch (error) {
            console.error('Errore nel caricamento icone da Firestore:', error);
        }
    },

    /**
     * Salva una singola icona su Firestore
     */
    async saveIconToFirestore(iconData) {
        const { doc, setDoc } = window.firestoreTools;
        const db = window.db;
        const iconsPath = this.getIconsPath();

        try {
            const iconDocRef = doc(db, iconsPath, iconData.id);

            // Rimuovi firestoreId prima di salvare
            const dataToSave = { ...iconData };
            delete dataToSave.firestoreId;

            await setDoc(iconDocRef, dataToSave);
            console.log(`Icona ${iconData.name} salvata su Firestore`);
            return true;
        } catch (error) {
            console.error('Errore nel salvataggio icona su Firestore:', error);
            throw error;
        }
    },

    /**
     * Salva tutte le icone su Firestore (inizializzazione)
     */
    async saveAllIconsToFirestore() {
        const icone = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
        let savedCount = 0;

        for (const icona of icone) {
            try {
                await this.saveIconToFirestore(icona);
                savedCount++;
            } catch (error) {
                console.error(`Errore salvataggio icona ${icona.name}:`, error);
            }
        }

        return savedCount;
    },

    /**
     * Apre il pannello di gestione delle icone
     */
    async openIconsManagementPanel() {
        // Prima carica le icone da Firestore
        await this.loadIconsFromFirestore();

        const icone = window.CAPTAIN_CANDIDATES_TEMPLATES || [];

        // Ordina le icone per ruolo
        const ROLE_ORDER = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
        const iconeOrdinate = [...icone].sort((a, b) => {
            const orderA = ROLE_ORDER[a.role] !== undefined ? ROLE_ORDER[a.role] : 99;
            const orderB = ROLE_ORDER[b.role] !== undefined ? ROLE_ORDER[b.role] : 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });

        const modalHtml = `
            <div id="icons-management-modal" class="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div class="football-box w-full max-w-6xl max-h-[95vh] overflow-y-auto">
                    <h3 class="text-3xl font-bold text-yellow-400 mb-4 border-b border-yellow-600 pb-2">👑 Gestione Icone (Capitani)</h3>
                    <p class="text-gray-300 mb-4">Modifica avatar, ruolo, tipologia e abilita delle icone disponibili.</p>
                    <p class="text-green-400 text-sm mb-4">Le modifiche vengono salvate permanentemente su Firestore.</p>
                    <p id="icons-message" class="text-center text-sm mb-4"></p>

                    <div class="mb-4 p-3 bg-gray-800 rounded-lg border border-yellow-600">
                        <button id="btn-sync-icons-to-firestore"
                                class="w-full bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-500 transition">
                            🔄 Sincronizza Icone Default su Firestore
                        </button>
                        <p class="text-xs text-gray-400 mt-2 text-center">Usa questo bottone per inizializzare/ripristinare le icone di default su Firestore</p>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                        ${iconeOrdinate.map((icona, index) => {
                            const originalIndex = icone.findIndex(i => i.id === icona.id);
                            return `
                            <div class="p-4 bg-gray-700 rounded-lg border-2 border-yellow-600 hover:border-yellow-400 transition cursor-pointer"
                                 onclick="window.AdminIcons.openEditIconModal(${originalIndex})">
                                <img src="${icona.photoUrl}"
                                     alt="${icona.name}"
                                     class="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-3 border-yellow-400">
                                <p class="text-lg font-bold text-white text-center">${icona.name}</p>
                                <p class="text-sm text-yellow-400 text-center">${icona.role} - ${icona.type}</p>
                                <p class="text-xs text-gray-400 text-center">Livello: ${icona.level}</p>
                                <p class="text-xs text-green-400 text-center mt-1">Abilita: ${icona.abilities?.join(', ') || 'Nessuna'}</p>
                                <button class="w-full mt-3 bg-blue-600 text-white py-1 rounded hover:bg-blue-500 transition text-sm font-bold">
                                    Modifica
                                </button>
                            </div>
                        `}).join('')}
                    </div>

                    <div class="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                        <button onclick="window.AdminIcons.closeIconsManagementPanel()"
                                class="bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-400 transition">
                            Chiudi
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Rimuovi eventuali modal esistenti
        const existingModal = document.getElementById('icons-management-modal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modalInstance = document.getElementById('icons-management-modal');

        // Aggiungi listener per sync
        document.getElementById('btn-sync-icons-to-firestore')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-sync-icons-to-firestore');
            const msgElement = document.getElementById('icons-message');

            if (!confirm('Vuoi sincronizzare le icone di default su Firestore? Questo sovrascrivera eventuali modifiche esistenti.')) {
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Sincronizzazione in corso...';

            try {
                // Ricarica le icone di default da icone.js (rimuovi quelle caricate da Firestore)
                // Per fare questo, dobbiamo ricaricare la pagina o avere un backup
                const savedCount = await this.saveAllIconsToFirestore();

                msgElement.textContent = `${savedCount} icone sincronizzate su Firestore!`;
                msgElement.className = 'text-center text-sm mb-4 text-green-400';
            } catch (error) {
                msgElement.textContent = `Errore: ${error.message}`;
                msgElement.className = 'text-center text-sm mb-4 text-red-400';
            } finally {
                btn.disabled = false;
                btn.textContent = '🔄 Sincronizza Icone Default su Firestore';
            }
        });
    },

    /**
     * Chiude il pannello di gestione icone
     */
    closeIconsManagementPanel() {
        const modal = document.getElementById('icons-management-modal');
        if (modal) modal.remove();
        this.modalInstance = null;
    },

    /**
     * Apre il modal per modificare una singola icona
     */
    openEditIconModal(index) {
        const icone = window.CAPTAIN_CANDIDATES_TEMPLATES || [];
        const icona = icone[index];
        if (!icona) return;

        this.currentEditingIconIndex = index;

        const types = ['Potenza', 'Tecnica', 'Velocita'];
        const roles = [
            { value: 'P', label: 'P (Portiere)' },
            { value: 'D', label: 'D (Difensore)' },
            { value: 'C', label: 'C (Centrocampista)' },
            { value: 'A', label: 'A (Attaccante)' }
        ];

        // Abilita disponibili per questa icona specifica (da CreditiSuperSeri)
        // Le Icone possono avere SOLO le abilità consentite dalla loro passiva unica
        const CSS = window.CreditiSuperSeri;
        const availableAbilities = CSS?.getAbilitaConsentiteIcona(icona.id) || ['Icona'];

        const modalHtml = `
            <div id="edit-icon-modal" class="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-[60]">
                <div class="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 border-2 border-yellow-500">
                    <h4 class="text-2xl font-bold text-yellow-400 mb-4">Modifica Icona: ${icona.name}</h4>
                    <p id="edit-icon-message" class="text-center text-sm mb-4"></p>

                    <div class="flex items-center mb-6">
                        <img id="icon-preview-img" src="${icona.photoUrl}"
                             alt="${icona.name}"
                             class="w-24 h-24 rounded-full object-cover border-4 border-yellow-400 mr-4">
                        <div class="flex-1">
                            <label class="text-gray-300 block mb-1 font-bold">URL Avatar</label>
                            <input type="text" id="icon-photo-url" value="${icona.photoUrl}"
                                   class="w-full p-2 bg-gray-700 border border-yellow-600 rounded text-white focus:border-yellow-400"
                                   onchange="document.getElementById('icon-preview-img').src = this.value">
                            <p class="text-xs text-gray-400 mt-1">Inserisci un URL immagine valido</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="text-gray-300 block mb-1 font-bold">Nome</label>
                            <input type="text" id="icon-name" value="${icona.name}"
                                   class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white">
                        </div>
                        <div>
                            <label class="text-gray-300 block mb-1 font-bold">ID (non modificabile)</label>
                            <input type="text" value="${icona.id}" disabled
                                   class="w-full p-2 bg-gray-600 border border-gray-500 rounded text-gray-400 cursor-not-allowed">
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label class="text-gray-300 block mb-1 font-bold">Ruolo</label>
                            <select id="icon-role" class="w-full p-2 bg-gray-700 border border-yellow-600 rounded text-white">
                                ${roles.map(r => `<option value="${r.value}" ${icona.role === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="text-gray-300 block mb-1 font-bold">Tipologia</label>
                            <select id="icon-type" class="w-full p-2 bg-gray-700 border border-yellow-600 rounded text-white">
                                ${types.map(t => `<option value="${t}" ${icona.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="text-gray-300 block mb-1 font-bold">Livello</label>
                            <input type="number" id="icon-level" value="${icona.level}" min="1" max="20"
                                   class="w-full p-2 bg-gray-700 border border-yellow-600 rounded text-white">
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="text-gray-300 block mb-2 font-bold">Abilita Consentite</label>
                        <p class="text-xs text-yellow-300 mb-2">Le Icone possono avere solo le abilità specificate nella loro passiva unica</p>
                        <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-gray-900 p-3 rounded border border-gray-600">
                            ${availableAbilities.map(ability => {
                                const isChecked = icona.abilities?.includes(ability) ? 'checked' : '';
                                const isIconaAbility = ability === 'Icona';
                                return `
                                    <label class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800 p-1 rounded ${isIconaAbility ? 'bg-yellow-900' : ''}">
                                        <input type="checkbox" value="${ability}" ${isChecked} ${isIconaAbility ? 'checked disabled' : ''}
                                               class="icon-ability-check form-checkbox h-4 w-4 ${isIconaAbility ? 'text-yellow-500' : 'text-green-500'}">
                                        <span class="${isIconaAbility ? 'text-yellow-400 font-bold' : 'text-gray-300'}">${ability}</span>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
                        <button onclick="window.AdminIcons.closeEditIconModal()"
                                class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition font-bold">
                            Annulla
                        </button>
                        <button id="btn-save-icon" onclick="window.AdminIcons.saveIconEdit(${index})"
                                class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-bold">
                            Salva su Firestore
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * Chiude il modal di modifica singola icona
     */
    closeEditIconModal() {
        const modal = document.getElementById('edit-icon-modal');
        if (modal) modal.remove();
        this.currentEditingIconIndex = null;
    },

    /**
     * Salva le modifiche all'icona su Firestore
     */
    async saveIconEdit(index) {
        const icone = window.CAPTAIN_CANDIDATES_TEMPLATES;
        if (!icone || !icone[index]) return;

        const msgElement = document.getElementById('edit-icon-message');
        const saveBtn = document.getElementById('btn-save-icon');

        const name = document.getElementById('icon-name').value.trim();
        const photoUrl = document.getElementById('icon-photo-url').value.trim();
        const role = document.getElementById('icon-role').value;
        const type = document.getElementById('icon-type').value;
        const level = parseInt(document.getElementById('icon-level').value);

        // Raccogli le abilita selezionate (inclusa "Icona" che e sempre attiva)
        const abilities = ['Icona'];
        document.querySelectorAll('.icon-ability-check:checked').forEach(checkbox => {
            if (checkbox.value !== 'Icona') {
                abilities.push(checkbox.value);
            }
        });

        // Validazione
        if (!name) {
            alert('Inserisci un nome per l\'icona!');
            return;
        }
        if (!photoUrl || !photoUrl.startsWith('http')) {
            alert('Inserisci un URL avatar valido (deve iniziare con http)!');
            return;
        }
        if (level < 1 || level > 20) {
            alert('Il livello deve essere tra 1 e 20!');
            return;
        }

        // Mostra stato salvataggio
        if (msgElement) {
            msgElement.textContent = 'Salvataggio su Firestore...';
            msgElement.className = 'text-center text-sm mb-4 text-yellow-400';
        }
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Salvataggio...';
        }

        try {
            // Prepara i dati da salvare
            const iconData = {
                id: icone[index].id,
                name: name,
                photoUrl: photoUrl,
                role: role,
                type: type,
                level: level,
                age: icone[index].age || 25,
                cost: 0,
                isCaptain: true,
                levelRange: [level, level + 6],
                abilities: abilities
            };

            // Salva su Firestore
            await this.saveIconToFirestore(iconData);

            // Aggiorna l'icona nell'array globale
            icone[index].name = name;
            icone[index].photoUrl = photoUrl;
            icone[index].role = role;
            icone[index].type = type;
            icone[index].level = level;
            icone[index].abilities = abilities;

            if (msgElement) {
                msgElement.textContent = 'Icona salvata con successo!';
                msgElement.className = 'text-center text-sm mb-4 text-green-400';
            }

            // Chiudi e aggiorna dopo 1 secondo
            setTimeout(() => {
                this.closeEditIconModal();
                this.closeIconsManagementPanel();
                this.openIconsManagementPanel();
            }, 1000);

        } catch (error) {
            console.error('Errore salvataggio icona:', error);
            if (msgElement) {
                msgElement.textContent = `Errore: ${error.message}`;
                msgElement.className = 'text-center text-sm mb-4 text-red-400';
            }
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Salva su Firestore';
            }
        }
    },

    /**
     * Inizializza i listener per il bottone gestione icone
     */
    initializeListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-manage-icons' || e.target.closest('#btn-manage-icons')) {
                this.openIconsManagementPanel();
            }
        });
    }
};

// Inizializza i listener quando il modulo viene caricato
document.addEventListener('DOMContentLoaded', () => {
    window.AdminIcons.initializeListeners();

    // Carica le icone da Firestore all'avvio (se disponibili)
    setTimeout(() => {
        if (window.firestoreTools && window.db) {
            window.AdminIcons.loadIconsFromFirestore();
        }
    }, 2000);
});

console.log('Modulo admin-icons.js caricato (con salvataggio Firestore).');
