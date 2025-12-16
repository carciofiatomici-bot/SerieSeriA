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

                <!-- Flags per categoria (collapsibili) -->
                ${Object.entries(categories).map(([cat, catFlags]) => `
                    <div class="bg-gray-700 rounded-xl overflow-hidden category-section" data-category="${cat}">
                        <div class="bg-gray-600 px-4 py-3 cursor-pointer hover:bg-gray-550 transition-colors category-header flex items-center justify-between"
                             onclick="window.AdminFeatureFlags.toggleCategory('${cat}')">
                            <div class="flex items-center gap-2">
                                <span class="category-toggle-icon text-gray-400 transition-transform duration-200">▶</span>
                                <h3 class="font-semibold text-white">${categoryNames[cat] || cat}</h3>
                            </div>
                            <span class="text-gray-400 text-sm">${catFlags.length} flag${catFlags.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="category-content hidden p-4 space-y-3">
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
     * Renderizza la sezione gestione achievements
     */
    renderAchievementsSection() {
        const achievements = window.Achievements?.definitions || {};
        const achievementsList = Object.values(achievements);

        const categories = {
            progressione: '📈 Progressione',
            vittorie: '🏆 Vittorie',
            gol: '⚽ Gol',
            rosa: '👥 Rosa',
            classifica: '📊 Classifica',
            speciali: '✨ Speciali'
        };

        return `
            <div class="bg-gray-700 rounded-xl overflow-hidden">
                <div class="bg-gradient-to-r from-amber-600 to-yellow-500 px-4 py-3">
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold text-white flex items-center gap-2">
                            <span>🏆</span>
                            <span>Gestione Achievements</span>
                        </h3>
                        <button id="btn-add-achievement" class="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white text-sm font-semibold flex items-center gap-1">
                            <span>+</span> Nuovo Achievement
                        </button>
                    </div>
                </div>

                <div class="p-4">
                    <!-- Stats -->
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div class="bg-gray-800 rounded-lg p-3 text-center">
                            <p class="text-2xl font-bold text-amber-400">${achievementsList.length}</p>
                            <p class="text-xs text-gray-400">Totali</p>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-3 text-center">
                            <p class="text-2xl font-bold text-green-400">${Object.keys(categories).length}</p>
                            <p class="text-xs text-gray-400">Categorie</p>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-3 text-center">
                            <p class="text-2xl font-bold text-purple-400">${achievementsList.reduce((sum, a) => sum + (a.points || 0), 0)}</p>
                            <p class="text-xs text-gray-400">Punti Totali</p>
                        </div>
                    </div>

                    <!-- Lista achievements per categoria -->
                    <div class="space-y-3 max-h-96 overflow-y-auto" id="achievements-admin-list">
                        ${Object.entries(categories).map(([catKey, catName]) => {
                            const catAchievements = achievementsList.filter(a => a.category === catKey);
                            if (catAchievements.length === 0) return '';

                            return `
                                <details class="bg-gray-800 rounded-lg overflow-hidden" open>
                                    <summary class="px-4 py-2 bg-gray-750 cursor-pointer hover:bg-gray-700 flex items-center justify-between">
                                        <span class="font-semibold text-white">${catName}</span>
                                        <span class="text-xs text-gray-400">${catAchievements.length} achievements</span>
                                    </summary>
                                    <div class="p-2 space-y-2">
                                        ${catAchievements.map(ach => this.renderAchievementAdminCard(ach)).join('')}
                                    </div>
                                </details>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza card achievement per admin
     */
    renderAchievementAdminCard(achievement) {
        const cssReward = achievement.cssReward || achievement.points || 0;
        return `
            <div class="bg-gray-700 rounded-lg p-2 flex items-center gap-2 hover:bg-gray-650 transition text-sm" data-achievement-id="${achievement.id}">
                <div class="text-2xl">${achievement.icon || '🏆'}</div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-white truncate text-sm">${achievement.name}</h4>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-purple-400">+${cssReward} CSS</span>
                    </div>
                </div>
                <div class="flex gap-1">
                    <button class="btn-edit-achievement p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs" data-id="${achievement.id}" title="Modifica">
                        ✏️
                    </button>
                    <button class="btn-delete-achievement p-1.5 bg-red-600 hover:bg-red-500 rounded text-white text-xs" data-id="${achievement.id}" title="Elimina">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Mostra modal per aggiungere/modificare achievement
     */
    showAchievementModal(achievement = null) {
        const isEdit = achievement !== null;
        const title = isEdit ? 'Modifica Achievement' : 'Nuovo Achievement';

        const categories = [
            { value: 'progressione', label: '📈 Progressione' },
            { value: 'vittorie', label: '🏆 Vittorie' },
            { value: 'gol', label: '⚽ Gol' },
            { value: 'rosa', label: '👥 Rosa' },
            { value: 'classifica', label: '📊 Classifica' },
            { value: 'speciali', label: '✨ Speciali' }
        ];

        const conditionTypes = [
            { value: 'matches_played', label: 'Partite giocate' },
            { value: 'matches_won', label: 'Partite vinte' },
            { value: 'goals_scored', label: 'Gol segnati' },
            { value: 'clean_sheets', label: 'Clean sheets' },
            { value: 'win_streak', label: 'Vittorie consecutive' },
            { value: 'purchases', label: 'Acquisti mercato' },
            { value: 'player_level', label: 'Livello giocatore' },
            { value: 'leaderboard_position', label: 'Posizione classifica' },
            { value: 'login_streak', label: 'Giorni login consecutivi' },
            { value: 'custom', label: 'Personalizzato' }
        ];

        // Valori default o da achievement esistente
        const values = {
            id: achievement?.id || '',
            name: achievement?.name || '',
            description: achievement?.description || '',
            icon: achievement?.icon || '🏆',
            category: achievement?.category || 'progressione',
            cssReward: achievement?.cssReward || achievement?.points || 10,
            conditionType: achievement?.conditionType || 'matches_played',
            conditionValue: achievement?.conditionValue || 1
        };

        const modalHtml = `
            <div id="achievement-modal" class="fixed inset-0 z-[9999] bg-black bg-opacity-80 flex items-center justify-center p-4">
                <div class="bg-gray-800 rounded-xl shadow-2xl border-2 border-amber-500 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div class="p-4 bg-gradient-to-r from-amber-600 to-yellow-500 flex justify-between items-center">
                        <h3 class="text-xl font-bold text-white">${title}</h3>
                        <button id="close-achievement-modal" class="text-white hover:text-amber-200 text-2xl">&times;</button>
                    </div>

                    <form id="achievement-form" class="p-4 space-y-4">
                        ${isEdit ? `<input type="hidden" name="id" value="${values.id}">` : ''}

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-gray-300 mb-1 text-sm font-semibold">Nome *</label>
                                <input type="text" name="name" value="${values.name}" required
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-amber-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 text-sm font-semibold">Icona (emoji)</label>
                                <input type="text" name="icon" value="${values.icon}"
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-center text-2xl focus:border-amber-500 focus:outline-none">
                            </div>
                        </div>

                        <div>
                            <label class="block text-gray-300 mb-1 text-sm font-semibold">Descrizione *</label>
                            <textarea name="description" required rows="2"
                                      class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-amber-500 focus:outline-none">${values.description}</textarea>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-gray-300 mb-1 text-sm font-semibold">Categoria</label>
                                <select name="category"
                                        class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-amber-500 focus:outline-none">
                                    ${categories.map(c => `<option value="${c.value}" ${values.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-1 text-sm font-semibold">CSS (Crediti Super Seri)</label>
                                <input type="number" name="cssReward" value="${values.cssReward}" min="1" max="500"
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-amber-500 focus:outline-none">
                            </div>
                        </div>

                        <div class="bg-gray-750 rounded-lg p-3 border border-gray-600">
                            <h4 class="text-amber-400 font-semibold mb-2">Condizione di Sblocco</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-300 mb-1 text-sm">Tipo condizione</label>
                                    <select name="conditionType"
                                            class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-amber-500 focus:outline-none">
                                        ${conditionTypes.map(c => `<option value="${c.value}" ${values.conditionType === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-gray-300 mb-1 text-sm">Valore richiesto</label>
                                    <input type="number" name="conditionValue" value="${values.conditionValue}" min="1"
                                           class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-amber-500 focus:outline-none">
                                </div>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Es: "Partite giocate" con valore 10 = sblocca dopo 10 partite</p>
                        </div>

                        <div class="flex gap-3 pt-2">
                            <button type="button" id="cancel-achievement-modal"
                                    class="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold">
                                Annulla
                            </button>
                            <button type="submit"
                                    class="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-semibold">
                                ${isEdit ? 'Salva Modifiche' : 'Crea Achievement'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Rimuovi modal esistente
        document.getElementById('achievement-modal')?.remove();

        // Aggiungi al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Event listeners
        document.getElementById('close-achievement-modal').addEventListener('click', () => {
            document.getElementById('achievement-modal')?.remove();
        });
        document.getElementById('cancel-achievement-modal').addEventListener('click', () => {
            document.getElementById('achievement-modal')?.remove();
        });
        document.getElementById('achievement-modal').addEventListener('click', (e) => {
            if (e.target.id === 'achievement-modal') {
                document.getElementById('achievement-modal')?.remove();
            }
        });

        // Form submit
        document.getElementById('achievement-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveAchievement(new FormData(e.target), isEdit);
        });
    },

    /**
     * Salva achievement (nuovo o modificato)
     */
    async saveAchievement(formData, isEdit) {
        const data = Object.fromEntries(formData.entries());

        // Genera ID se nuovo
        if (!isEdit) {
            data.id = data.name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
        }

        // Converti cssReward e conditionValue in numeri
        data.cssReward = parseInt(data.cssReward) || 10;
        data.conditionValue = parseInt(data.conditionValue) || 1;

        try {
            // Aggiorna le definizioni locali
            if (window.Achievements) {
                window.Achievements.definitions[data.id] = {
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    icon: data.icon || '🏆',
                    category: data.category,
                    cssReward: data.cssReward,
                    conditionType: data.conditionType,
                    conditionValue: data.conditionValue
                };
            }

            // Salva su Firestore
            await this.saveAchievementsToFirestore();

            // Chiudi modal
            document.getElementById('achievement-modal')?.remove();

            // Mostra toast
            if (window.Toast) {
                window.Toast.success(isEdit ? 'Achievement modificato!' : 'Achievement creato!');
            }

            // Aggiorna UI
            this.updateUI();

        } catch (error) {
            console.error('Errore salvataggio achievement:', error);
            if (window.Toast) {
                window.Toast.error('Errore nel salvataggio');
            }
        }
    },

    /**
     * Elimina achievement
     */
    async deleteAchievement(achievementId) {
        if (window.ConfirmDialog) {
            const confirmed = await window.ConfirmDialog.show({
                title: 'Elimina Achievement',
                message: `Sei sicuro di voler eliminare questo achievement?`,
                confirmText: 'Elimina',
                confirmClass: 'bg-red-600 hover:bg-red-500',
                type: 'danger'
            });
            if (!confirmed) return;
        }

        try {
            // Rimuovi dalle definizioni locali
            if (window.Achievements?.definitions) {
                delete window.Achievements.definitions[achievementId];
            }

            // Salva su Firestore
            await this.saveAchievementsToFirestore();

            if (window.Toast) {
                window.Toast.success('Achievement eliminato!');
            }

            // Aggiorna UI
            this.updateUI();

        } catch (error) {
            console.error('Errore eliminazione achievement:', error);
            if (window.Toast) {
                window.Toast.error('Errore nell\'eliminazione');
            }
        }
    },

    /**
     * Salva achievements su Firestore
     */
    async saveAchievementsToFirestore() {
        if (!window.db || !window.firestoreTools) {
            console.warn('Firestore non disponibile');
            return;
        }

        const { doc, setDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const achievementsDocRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'achievements');

        await setDoc(achievementsDocRef, {
            definitions: window.Achievements?.definitions || {},
            lastUpdated: new Date().toISOString()
        });

        console.log('Achievements salvati su Firestore');
    },

    /**
     * Carica achievements da Firestore
     */
    async loadAchievementsFromFirestore() {
        if (!window.db || !window.firestoreTools) {
            console.warn('Firestore non disponibile');
            return;
        }

        try {
            const { doc, getDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const achievementsDocRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'achievements');

            const docSnap = await getDoc(achievementsDocRef);

            if (docSnap.exists() && docSnap.data().definitions) {
                // Sovrascrivi le definizioni locali con quelle da Firestore
                if (window.Achievements) {
                    window.Achievements.definitions = docSnap.data().definitions;
                }
                console.log('Achievements caricati da Firestore');
            }
        } catch (error) {
            console.error('Errore caricamento achievements da Firestore:', error);
        }
    },

    /**
     * Renderizza card singolo flag come accordion collassabile
     */
    renderFlagCard(flag) {
        const statusClass = flag.enabled ? 'bg-green-500' : 'bg-gray-500';
        const statusText = flag.enabled ? 'ON' : 'OFF';
        const hasDetails = flag.details && flag.details.trim() !== '';

        // Controlla se questo e' il flag achievements e se e' attivo
        const isAchievementsFlag = flag.id === 'achievements';
        const showAchievementsManager = isAchievementsFlag && flag.enabled;

        // Controlla se questo e' il flag injuries e se e' attivo
        const isInjuriesFlag = flag.id === 'injuries';
        const showInjuriesSettings = isInjuriesFlag && flag.enabled;

        // Verifica se ha contenuto espandibile
        const hasExpandableContent = hasDetails || showAchievementsManager || showInjuriesSettings;

        return `
            <div class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700" data-flag-card="${flag.id}">
                <!-- Header sempre visibile -->
                <div class="flex items-center justify-between p-3 ${hasExpandableContent ? 'cursor-pointer hover:bg-gray-750' : ''} flag-card-header"
                     data-flag-id="${flag.id}" data-expandable="${hasExpandableContent}">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        ${hasExpandableContent ? `
                            <svg class="w-4 h-4 text-gray-400 transform transition-transform flag-card-arrow flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        ` : '<div class="w-4"></div>'}
                        <div class="text-2xl flex-shrink-0">${flag.icon || '⚙️'}</div>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-semibold text-white text-sm truncate">${flag.name}</h4>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 flex-shrink-0">
                        <span class="px-2 py-0.5 ${statusClass} rounded text-xs text-white font-bold">
                            ${statusText}
                        </span>
                        <label class="relative inline-flex items-center cursor-pointer" onclick="event.stopPropagation()">
                            <input type="checkbox"
                                   class="sr-only peer flag-toggle"
                                   data-flag-id="${flag.id}"
                                   ${flag.enabled ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>

                <!-- Contenuto espandibile -->
                ${hasExpandableContent ? `
                    <div class="flag-card-content hidden border-t border-gray-700" data-flag-content="${flag.id}">
                        <!-- Descrizione -->
                        <div class="px-4 py-3 bg-gray-850">
                            <p class="text-gray-400 text-sm">${flag.description}</p>
                        </div>

                        ${hasDetails ? `
                            <div class="px-4 py-3 text-sm text-gray-300 bg-gray-900 bg-opacity-50 border-t border-gray-700">
                                ${flag.details}
                            </div>
                        ` : ''}
                        ${showAchievementsManager ? this.renderAchievementsManager() : ''}
                        ${showInjuriesSettings ? this.renderInjuriesSettings() : ''}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Renderizza il manager degli achievements (menu a scomparsa)
     */
    renderAchievementsManager() {
        const achievements = window.Achievements?.definitions || {};
        const achievementsList = Object.values(achievements);

        const categories = {
            progressione: '📈 Progressione',
            vittorie: '🏆 Vittorie',
            gol: '⚽ Gol',
            rosa: '👥 Rosa',
            classifica: '📊 Classifica',
            speciali: '✨ Speciali'
        };

        return `
            <div class="border-t border-amber-600">
                <button class="achievements-manager-toggle w-full px-4 py-3 text-left text-sm text-amber-400 hover:bg-gray-700 flex items-center gap-2 transition-colors bg-gray-750">
                    <svg class="w-4 h-4 transform transition-transform achievements-manager-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                    <span class="font-semibold">⚙️ Gestione Achievements</span>
                    <span class="ml-auto text-xs text-gray-400">${achievementsList.length} totali</span>
                </button>
                <div class="achievements-manager-content hidden bg-gray-900 bg-opacity-50">
                    <div class="p-4">
                        <!-- Header con bottone aggiungi -->
                        <div class="flex justify-between items-center mb-4">
                            <div class="flex items-center gap-4">
                                <div class="text-center">
                                    <p class="text-xl font-bold text-amber-400">${achievementsList.length}</p>
                                    <p class="text-xs text-gray-400">Totali</p>
                                </div>
                                <div class="text-center">
                                    <p class="text-xl font-bold text-purple-400">${achievementsList.reduce((sum, a) => sum + (a.cssReward || 0), 0)}</p>
                                    <p class="text-xs text-gray-400">CSS Totali</p>
                                </div>
                            </div>
                            <button id="btn-add-achievement" class="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white text-sm font-semibold flex items-center gap-1">
                                <span>+</span> Nuovo
                            </button>
                        </div>

                        <!-- Lista achievements per categoria -->
                        <div class="space-y-2 max-h-80 overflow-y-auto" id="achievements-admin-list">
                            ${Object.entries(categories).map(([catKey, catName]) => {
                                const catAchievements = achievementsList.filter(a => a.category === catKey);
                                if (catAchievements.length === 0) return '';

                                return `
                                    <details class="bg-gray-800 rounded-lg overflow-hidden">
                                        <summary class="px-3 py-2 cursor-pointer hover:bg-gray-700 flex items-center justify-between text-sm">
                                            <span class="font-semibold text-white">${catName}</span>
                                            <span class="text-xs text-gray-400">${catAchievements.length}</span>
                                        </summary>
                                        <div class="p-2 space-y-1">
                                            ${catAchievements.map(ach => this.renderAchievementAdminCard(ach)).join('')}
                                        </div>
                                    </details>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza le impostazioni del sistema infortuni (menu a scomparsa)
     */
    renderInjuriesSettings() {
        // Carica le impostazioni correnti
        const injuryChance = (window.Injuries?.INJURY_CHANCE || 0.01) * 100;
        const minDuration = window.Injuries?.MIN_INJURY_DURATION || 1;
        const maxDuration = window.Injuries?.MAX_INJURY_DURATION || 10;
        const maxRatio = (window.Injuries?.MAX_INJURIES_RATIO || 0.25) * 100;

        return `
            <div class="border-t border-red-600">
                <button class="injuries-settings-toggle w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2 transition-colors bg-gray-750">
                    <svg class="w-4 h-4 transform transition-transform injuries-settings-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                    <span class="font-semibold">⚙️ Impostazioni Infortuni</span>
                </button>
                <div class="injuries-settings-content hidden bg-gray-900 bg-opacity-50">
                    <div class="p-4 space-y-4">
                        <!-- Probabilita infortunio -->
                        <div>
                            <label class="block text-gray-300 mb-2 text-sm font-semibold">
                                Probabilita Infortunio per Giocatore
                            </label>
                            <div class="flex items-center gap-3">
                                <input type="range" id="injury-chance-slider" min="1" max="20" value="${injuryChance}"
                                       class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500">
                                <span id="injury-chance-value" class="text-lg font-bold text-red-400 w-16 text-center">${injuryChance}%</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">% di probabilita che un giocatore si infortuni dopo una partita</p>
                        </div>

                        <!-- Durata minima -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-gray-300 mb-2 text-sm font-semibold">
                                    Durata Minima
                                </label>
                                <input type="number" id="injury-min-duration" min="1" max="5" value="${minDuration}"
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-red-500 focus:outline-none">
                                <p class="text-xs text-gray-500 mt-1">partite</p>
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-2 text-sm font-semibold">
                                    Durata Massima
                                </label>
                                <input type="number" id="injury-max-duration" min="5" max="20" value="${maxDuration}"
                                       class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-red-500 focus:outline-none">
                                <p class="text-xs text-gray-500 mt-1">partite</p>
                            </div>
                        </div>

                        <!-- Max ratio infortunati -->
                        <div>
                            <label class="block text-gray-300 mb-2 text-sm font-semibold">
                                Max % Rosa Infortunata
                            </label>
                            <div class="flex items-center gap-3">
                                <input type="range" id="injury-max-ratio-slider" min="10" max="50" value="${maxRatio}"
                                       class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500">
                                <span id="injury-max-ratio-value" class="text-lg font-bold text-red-400 w-16 text-center">${maxRatio}%</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">Massima percentuale della rosa che puo' essere infortunata contemporaneamente</p>
                        </div>

                        <!-- Bottone salva -->
                        <button id="btn-save-injury-settings"
                                class="w-full py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-semibold flex items-center justify-center gap-2">
                            <span>💾</span> Salva Impostazioni
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Salva le impostazioni degli infortuni su Firestore
     */
    async saveInjurySettings() {
        if (!window.db || !window.firestoreTools) {
            console.error('Firestore non disponibile');
            return false;
        }

        const injuryChance = parseFloat(document.getElementById('injury-chance-slider')?.value || 1) / 100;
        const minDuration = parseInt(document.getElementById('injury-min-duration')?.value || 1);
        const maxDuration = parseInt(document.getElementById('injury-max-duration')?.value || 10);
        const maxRatio = parseFloat(document.getElementById('injury-max-ratio-slider')?.value || 25) / 100;

        try {
            const { doc, setDoc } = window.firestoreTools;
            const appId = window.firestoreTools.appId;
            const settingsDocRef = doc(window.db, `artifacts/${appId}/public/data/config`, 'injurySettings');

            await setDoc(settingsDocRef, {
                injuryChance,
                minDuration,
                maxDuration,
                maxRatio,
                updatedAt: new Date().toISOString()
            });

            // Aggiorna anche l'oggetto Injuries locale
            if (window.Injuries) {
                window.Injuries.INJURY_CHANCE = injuryChance;
                window.Injuries.MIN_INJURY_DURATION = minDuration;
                window.Injuries.MAX_INJURY_DURATION = maxDuration;
                window.Injuries.MAX_INJURIES_RATIO = maxRatio;
            }

            if (window.Toast) {
                window.Toast.success('Impostazioni infortuni salvate!');
            }

            return true;
        } catch (error) {
            console.error('Errore salvataggio impostazioni infortuni:', error);
            if (window.Toast) {
                window.Toast.error('Errore nel salvataggio');
            }
            return false;
        }
    },

    /**
     * Toggle categoria (espandi/comprimi)
     * @param {string} categoryId - ID della categoria
     */
    toggleCategory(categoryId) {
        const section = this.container?.querySelector(`.category-section[data-category="${categoryId}"]`);
        if (!section) return;

        const content = section.querySelector('.category-content');
        const icon = section.querySelector('.category-toggle-icon');

        if (content && icon) {
            content.classList.toggle('hidden');
            icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
        }
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

        // Toggle accordion card (click su header)
        this.container.querySelectorAll('.flag-card-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Non espandere se non ha contenuto espandibile
                if (header.dataset.expandable !== 'true') return;

                const flagId = header.dataset.flagId;
                const content = document.querySelector(`[data-flag-content="${flagId}"]`);
                const arrow = header.querySelector('.flag-card-arrow');

                if (content) {
                    content.classList.toggle('hidden');

                    // Ruota freccia
                    if (arrow) {
                        if (content.classList.contains('hidden')) {
                            arrow.style.transform = 'rotate(0deg)';
                        } else {
                            arrow.style.transform = 'rotate(90deg)';
                        }
                    }
                }
            });
        });

        // === ACHIEVEMENTS EVENT LISTENERS ===

        // Toggle menu gestione achievements
        this.container.querySelectorAll('.achievements-manager-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const content = btn.nextElementSibling;
                const arrow = btn.querySelector('.achievements-manager-arrow');

                if (content) {
                    content.classList.toggle('hidden');

                    if (arrow) {
                        if (content.classList.contains('hidden')) {
                            arrow.style.transform = 'rotate(0deg)';
                        } else {
                            arrow.style.transform = 'rotate(180deg)';
                        }
                    }
                }
            });
        });

        // Aggiungi nuovo achievement
        document.getElementById('btn-add-achievement')?.addEventListener('click', () => {
            this.showAchievementModal(null);
        });

        // Modifica achievement
        this.container.querySelectorAll('.btn-edit-achievement').forEach(btn => {
            btn.addEventListener('click', () => {
                const achievementId = btn.dataset.id;
                const achievement = window.Achievements?.definitions?.[achievementId];
                if (achievement) {
                    this.showAchievementModal(achievement);
                }
            });
        });

        // Elimina achievement
        this.container.querySelectorAll('.btn-delete-achievement').forEach(btn => {
            btn.addEventListener('click', () => {
                const achievementId = btn.dataset.id;
                this.deleteAchievement(achievementId);
            });
        });

        // === INJURIES SETTINGS EVENT LISTENERS ===

        // Toggle menu impostazioni infortuni
        this.container.querySelectorAll('.injuries-settings-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const content = btn.nextElementSibling;
                const arrow = btn.querySelector('.injuries-settings-arrow');

                if (content) {
                    content.classList.toggle('hidden');

                    if (arrow) {
                        if (content.classList.contains('hidden')) {
                            arrow.style.transform = 'rotate(0deg)';
                        } else {
                            arrow.style.transform = 'rotate(180deg)';
                        }
                    }
                }
            });
        });

        // Slider probabilita infortunio
        const injuryChanceSlider = document.getElementById('injury-chance-slider');
        const injuryChanceValue = document.getElementById('injury-chance-value');
        if (injuryChanceSlider && injuryChanceValue) {
            injuryChanceSlider.addEventListener('input', (e) => {
                injuryChanceValue.textContent = `${e.target.value}%`;
            });
        }

        // Slider max ratio infortunati
        const injuryMaxRatioSlider = document.getElementById('injury-max-ratio-slider');
        const injuryMaxRatioValue = document.getElementById('injury-max-ratio-value');
        if (injuryMaxRatioSlider && injuryMaxRatioValue) {
            injuryMaxRatioSlider.addEventListener('input', (e) => {
                injuryMaxRatioValue.textContent = `${e.target.value}%`;
            });
        }

        // Bottone salva impostazioni infortuni
        document.getElementById('btn-save-injury-settings')?.addEventListener('click', () => {
            this.saveInjurySettings();
        });
    }
};

console.log("Modulo AdminFeatureFlags caricato.");
