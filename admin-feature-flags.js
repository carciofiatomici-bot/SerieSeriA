 //
// ====================================================================
// ADMIN-FEATURE-FLAGS.JS - Pannello Admin per Feature Flags
// ====================================================================
//

window.AdminFeatureFlags = {
    // Container pannello
    container: null,

    /**
     * Inizializza il pannello admin
     */
    init() {
        console.log("AdminFeatureFlags inizializzato");
    },

    /**
     * Renderizza il pannello nel container admin
     */
    render(containerId = 'admin-feature-flags-content') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn("Container admin feature flags non trovato");
            return;
        }

        this.updateUI();
    },

    /**
     * Aggiorna l'interfaccia
     */
    updateUI() {
        if (!this.container) return;

        const flags = window.FeatureFlags?.getAllFlags() || {};

        // Raggruppa per categoria
        const categories = {};
        for (const [key, flag] of Object.entries(flags)) {
            const cat = flag.category || 'altro';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ key, ...flag });
        }

        const categoryNames = {
            communication: '💬 Comunicazione',
            stats: '📊 Statistiche',
            gameplay: '🎮 Gameplay',
            gamification: '🏆 Gamification',
            economy: '💎 Economia',
            altro: '⚙️ Altro'
        };

        this.container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-xl font-bold text-white flex items-center gap-2">
                                <span>🎛️</span>
                                <span>Gestione Feature Flags</span>
                            </h2>
                            <p class="text-purple-200 text-sm mt-1">Abilita o disabilita funzionalita' dell'applicazione</p>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-white">${Object.values(flags).filter(f => f.enabled).length}/${Object.keys(flags).length}</div>
                            <div class="text-xs text-purple-200">attive</div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="flex gap-3">
                    <button id="enable-all-flags" class="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-semibold flex items-center gap-2">
                        <span>✅</span> Abilita Tutte
                    </button>
                    <button id="disable-all-flags" class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-semibold flex items-center gap-2">
                        <span>❌</span> Disabilita Tutte
                    </button>
                    <button id="refresh-flags" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-sm font-semibold flex items-center gap-2">
                        <span>🔄</span> Ricarica
                    </button>
                </div>

                <!-- Flags per categoria -->
                ${Object.entries(categories).map(([cat, catFlags]) => `
                    <div class="bg-gray-700 rounded-xl overflow-hidden">
                        <div class="bg-gray-600 px-4 py-2">
                            <h3 class="font-semibold text-white">${categoryNames[cat] || cat}</h3>
                        </div>
                        <div class="p-4 space-y-3">
                            ${catFlags.map(flag => this.renderFlagCard(flag)).join('')}
                        </div>
                    </div>
                `).join('')}

                <!-- Info -->
                <div class="bg-blue-900 bg-opacity-30 rounded-xl p-4 border border-blue-500">
                    <h4 class="font-semibold text-blue-300 mb-2">ℹ️ Informazioni</h4>
                    <ul class="text-sm text-blue-200 space-y-1">
                        <li>• Le modifiche vengono salvate automaticamente su Firestore</li>
                        <li>• Gli utenti vedranno le modifiche al prossimo refresh</li>
                        <li>• Le feature disabilitate nascondono completamente le relative UI</li>
                    </ul>
                </div>
            </div>
        `;

        // Event listeners
        this.setupEventListeners();
    },

    /**
     * Renderizza card singolo flag
     */
    renderFlagCard(flag) {
        const statusClass = flag.enabled ? 'bg-green-500' : 'bg-gray-500';
        const statusText = flag.enabled ? 'Attiva' : 'Disattiva';
        const hasDetails = flag.details && flag.details.trim() !== '';

        return `
            <div class="bg-gray-800 rounded-lg overflow-hidden">
                <div class="p-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="text-3xl">${flag.icon || '⚙️'}</div>
                        <div>
                            <h4 class="font-semibold text-white">${flag.name}</h4>
                            <p class="text-gray-400 text-sm">${flag.description}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="px-2 py-1 ${statusClass} rounded text-xs text-white font-semibold">
                            ${statusText}
                        </span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox"
                                   class="sr-only peer flag-toggle"
                                   data-flag-id="${flag.id}"
                                   ${flag.enabled ? 'checked' : ''}>
                            <div class="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>
                ${hasDetails ? `
                    <div class="border-t border-gray-700">
                        <button class="flag-details-toggle w-full px-4 py-2 text-left text-sm text-purple-400 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                                data-flag-id="${flag.id}">
                            <svg class="w-4 h-4 transform transition-transform flag-details-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                            <span>Maggiori informazioni</span>
                        </button>
                        <div class="flag-details-content hidden px-4 pb-4 text-sm text-gray-300 bg-gray-900 bg-opacity-50"
                             id="flag-details-${flag.id}">
                            ${flag.details}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle singolo flag
        this.container.querySelectorAll('.flag-toggle').forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const flagId = e.target.dataset.flagId;
                const enabled = e.target.checked;

                // Mostra loading
                e.target.disabled = true;

                try {
                    if (enabled) {
                        await window.FeatureFlags.enable(flagId);
                    } else {
                        await window.FeatureFlags.disable(flagId);
                    }

                    if (window.Toast) {
                        window.Toast.success(`${enabled ? 'Attivata' : 'Disattivata'}: ${window.FeatureFlags.flags[flagId]?.name}`);
                    }

                    // Aggiorna UI
                    this.updateUI();
                } catch (error) {
                    console.error("Errore toggle flag:", error);
                    if (window.Toast) {
                        window.Toast.error("Errore nel salvare la modifica");
                    }
                    // Ripristina stato
                    e.target.checked = !enabled;
                } finally {
                    e.target.disabled = false;
                }
            });
        });

        // Abilita tutte
        document.getElementById('enable-all-flags')?.addEventListener('click', async () => {
            if (window.ConfirmDialog) {
                const confirmed = await window.ConfirmDialog.show({
                    title: 'Abilita Tutte',
                    message: 'Sei sicuro di voler abilitare tutte le feature?',
                    confirmText: 'Abilita Tutte',
                    confirmClass: 'bg-green-600 hover:bg-green-500'
                });
                if (!confirmed) return;
            }

            for (const flagId of Object.keys(window.FeatureFlags.flags)) {
                await window.FeatureFlags.enable(flagId, false);
            }
            await window.FeatureFlags.saveToFirestore();

            if (window.Toast) window.Toast.success("Tutte le feature sono state abilitate");
            this.updateUI();
        });

        // Disabilita tutte
        document.getElementById('disable-all-flags')?.addEventListener('click', async () => {
            if (window.ConfirmDialog) {
                const confirmed = await window.ConfirmDialog.show({
                    title: 'Disabilita Tutte',
                    message: 'Sei sicuro di voler disabilitare tutte le feature?',
                    confirmText: 'Disabilita Tutte',
                    confirmClass: 'bg-red-600 hover:bg-red-500',
                    type: 'danger'
                });
                if (!confirmed) return;
            }

            for (const flagId of Object.keys(window.FeatureFlags.flags)) {
                await window.FeatureFlags.disable(flagId, false);
            }
            await window.FeatureFlags.saveToFirestore();

            if (window.Toast) window.Toast.info("Tutte le feature sono state disabilitate");
            this.updateUI();
        });

        // Ricarica
        document.getElementById('refresh-flags')?.addEventListener('click', async () => {
            await window.FeatureFlags.loadFromFirestore();
            this.updateUI();
            if (window.Toast) window.Toast.info("Feature flags ricaricati");
        });

        // Toggle dettagli espandibili
        this.container.querySelectorAll('.flag-details-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const flagId = btn.dataset.flagId;
                const detailsContent = document.getElementById(`flag-details-${flagId}`);
                const arrow = btn.querySelector('.flag-details-arrow');

                if (detailsContent) {
                    detailsContent.classList.toggle('hidden');

                    // Ruota freccia
                    if (arrow) {
                        if (detailsContent.classList.contains('hidden')) {
                            arrow.style.transform = 'rotate(0deg)';
                        } else {
                            arrow.style.transform = 'rotate(180deg)';
                        }
                    }
                }
            });
        });
    }
};

console.log("Modulo AdminFeatureFlags caricato.");
