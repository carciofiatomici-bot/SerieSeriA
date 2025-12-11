//
// ====================================================================
// CHANGELOG.JS - Storico Aggiornamenti Serie SeriA
// ====================================================================
//
// Supporta due modalita:
// - showPlayers() / show(): mostra solo le modifiche rilevanti per i giocatori
// - showAdmin(): mostra tutte le modifiche incluse quelle admin-only
//

window.Changelog = {

    // Versione corrente
    currentVersion: '0.9.96',

    // Numero massimo di versioni da mostrare
    maxEntries: 5,

    // Modalita corrente (admin o players)
    currentMode: 'players',

    // Storico changelog (dal piu recente al piu vecchio)
    // adminOnly: true = visibile solo nel changelog admin
    // adminOnly: false o assente = visibile a tutti
    entries: [
        {
            version: '0.9.96',
            date: '2025-12-11',
            time: '23:30',
            title: 'Timer Draft + Notifiche',
            changes: [
                { text: 'Ripristinato timer 1 ora per i pick nel draft a turni', adminOnly: false },
                { text: 'Notifiche push del browser quando tocca a te nel draft', adminOnly: false },
                { text: 'Se fai scadere il timer, vai in fondo alla lista', adminOnly: false },
                { text: 'Dopo 3 scadenze timer, sei escluso dal round corrente (rientri nel prossimo)', adminOnly: false },
                { text: 'Aggiunta checkbox per attivare/disattivare il timer nel pannello admin', adminOnly: true },
                { text: 'Il timer si avvia automaticamente quando si genera la lista draft', adminOnly: true },
                { text: 'Notifiche in-app tramite centro notifiche per turno draft', adminOnly: false }
            ],
            type: 'feature'
        },
        {
            version: '0.9.95',
            date: '2025-12-11',
            time: '22:30',
            title: 'Correzioni Sistema Draft',
            changes: [
                { text: 'Fix bug salto turno: risolto problema che saltava una squadra durante il draft', adminOnly: false },
                { text: 'Migliorata stabilita del sistema turni con protezione race condition', adminOnly: false },
                { text: 'Admin puo cliccare su una squadra nella lista per passare il turno', adminOnly: true },
                { text: 'Changelog separato per admin e giocatori', adminOnly: true }
            ],
            type: 'bugfix'
        },
        {
            version: '0.9.94',
            date: '2025-12-11',
            time: '21:00',
            title: 'Miglioramenti Pannello Admin',
            changes: [
                { text: 'Aggiunto bottone "Assegna CS a Tutte" per dare crediti a tutte le squadre', adminOnly: true },
                { text: 'Aggiunto bottone "Assegna CSS a Tutte" per dare crediti super seri a tutte', adminOnly: true },
                { text: 'Lista squadre in box scrollabile (max 8 visibili, poi scroll)', adminOnly: true },
                { text: 'Accesso rapido dashboard Mucche Mannare e Schalke104 in Utilita Admin', adminOnly: true },
                { text: 'Rimosso testo superfluo dalla homepage admin', adminOnly: true }
            ],
            type: 'feature',
            adminOnly: true
        },
        {
            version: '0.9.93',
            date: '2025-12-11',
            time: '19:45',
            title: 'Pausa/Riprendi Draft',
            changes: [
                { text: 'Il draft puo essere messo in pausa temporaneamente', adminOnly: false },
                { text: 'Il countdown si ferma durante la pausa e riprende da dove era', adminOnly: false },
                { text: 'Interfaccia mostra chiaramente quando il draft e in pausa', adminOnly: false },
                { text: 'Aggiunto bottone "Metti in Pausa" per admin', adminOnly: true },
                { text: 'Aggiunto bottone "Riprendi Draft" per admin', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '0.9.92',
            date: '2025-12-11',
            time: '18:30',
            title: 'Miglioramenti Draft',
            changes: [
                { text: 'Fix sincronizzazione countdown con il server', adminOnly: false },
                { text: 'Migliorata gestione turni con verifica stato real-time', adminOnly: false },
                { text: 'Fix doppio draft: verifica piu accurata prima dell\'acquisto', adminOnly: false },
                { text: 'Riorganizzato pannello admin: Draft a Turni dentro "Controllo Stato"', adminOnly: true },
                { text: 'Aggiunto bottone "Avanza Turno Manualmente" per admin', adminOnly: true },
                { text: 'Box Draft a Turni nascosto quando draft e chiuso', adminOnly: true }
            ],
            type: 'bugfix'
        },
        {
            version: '0.9.91',
            date: '2025-12-11',
            time: '16:45',
            title: 'Bug Fix & Ottimizzazioni',
            changes: [
                { text: 'Fix Draft Snake: risolto problema turni', adminOnly: false },
                { text: 'Fix costo Draft: mostra range min-max invece di valore singolo', adminOnly: false },
                { text: 'Fix mobile: toggle switches allineati su iPhone/Android', adminOnly: false },
                { text: 'Fix immagini giocatori', adminOnly: false },
                { text: 'Fix pannello Admin Automazioni: risolto blocco su "Aggiornamento"', adminOnly: true }
            ],
            type: 'bugfix'
        }
    ],

    /**
     * Mostra il modal changelog per giocatori (default)
     */
    show() {
        this.showPlayers();
    },

    /**
     * Mostra il changelog per giocatori (esclude modifiche admin)
     */
    showPlayers() {
        this.currentMode = 'players';
        this._showModal('Novita per i Giocatori');
    },

    /**
     * Mostra il changelog completo per admin
     */
    showAdmin() {
        this.currentMode = 'admin';
        this._showModal('Changelog Completo (Admin)');
    },

    /**
     * Mostra il modal con titolo personalizzato
     */
    _showModal(title) {
        const modal = document.getElementById('changelog-modal');
        const content = document.getElementById('changelog-content');
        const titleEl = document.getElementById('changelog-title');

        if (!modal || !content) {
            console.error('Changelog: elementi DOM non trovati');
            return;
        }

        if (titleEl) {
            titleEl.innerHTML = `<span>📋</span> ${title}`;
        }

        content.innerHTML = this.renderChangelog();
        this.setupAccordions();
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Nasconde il modal changelog
     */
    hide() {
        const modal = document.getElementById('changelog-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    /**
     * Setup degli accordion per le versioni precedenti
     */
    setupAccordions() {
        document.querySelectorAll('.changelog-accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const arrow = header.querySelector('.accordion-arrow');

                if (content.classList.contains('hidden')) {
                    content.classList.remove('hidden');
                    arrow.style.transform = 'rotate(180deg)';
                } else {
                    content.classList.add('hidden');
                    arrow.style.transform = 'rotate(0deg)';
                }
            });
        });
    },

    /**
     * Filtra le entries in base alla modalita corrente
     */
    getFilteredEntries() {
        if (this.currentMode === 'admin') {
            // Admin vede tutto
            return this.entries;
        }

        // Players: filtra le entries che sono adminOnly a livello di entry
        // e filtra i singoli changes adminOnly
        return this.entries
            .filter(entry => !entry.adminOnly)
            .map(entry => ({
                ...entry,
                changes: entry.changes.filter(change => {
                    // Supporta sia il vecchio formato (stringa) che il nuovo (oggetto)
                    if (typeof change === 'string') return true;
                    return !change.adminOnly;
                })
            }))
            .filter(entry => entry.changes.length > 0); // Rimuovi entries senza changes visibili
    },

    /**
     * Ottiene il testo di un change (supporta vecchio e nuovo formato)
     */
    getChangeText(change) {
        if (typeof change === 'string') return change;
        return change.text;
    },

    /**
     * Renderizza il contenuto del changelog
     */
    renderChangelog() {
        const filteredEntries = this.getFilteredEntries();
        const entriesToShow = filteredEntries.slice(0, this.maxEntries);

        if (entriesToShow.length === 0) {
            return `
                <div class="text-center text-gray-400 py-8">
                    <p>Nessun aggiornamento recente.</p>
                </div>
            `;
        }

        let html = `
            <div class="text-center mb-6">
                <span class="bg-indigo-600 text-white text-lg font-bold px-4 py-2 rounded-full">
                    Versione Attuale: ${this.currentVersion}
                </span>
            </div>
        `;

        let firstShown = false;
        entriesToShow.forEach((entry, index) => {
            if (!firstShown) {
                // Prima entry (piu recente) - sempre espansa
                html += this.renderEntryExpanded(entry, true);
                firstShown = true;
            } else {
                // Altre entries - accordion collassabile
                html += this.renderEntryAccordion(entry, index);
            }
        });

        html += `
            <div class="text-center text-gray-500 text-sm mt-4 pt-4 border-t border-gray-700">
                Serie SeriA - Fantasy Football Manager
            </div>
        `;

        return html;
    },

    /**
     * Renderizza una entry espansa (per la versione corrente)
     */
    renderEntryExpanded(entry, isCurrent = false) {
        const typeConfig = this.getTypeConfig(entry.type);

        return `
            <div class="mb-4 p-4 rounded-lg border-l-4 ${typeConfig.borderColor}">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <span class="bg-indigo-700 text-white text-sm font-bold px-3 py-1 rounded">
                        v${entry.version}
                    </span>
                    <span class="${typeConfig.labelColor} text-white text-xs font-semibold px-2 py-1 rounded">
                        ${typeConfig.labelText}
                    </span>
                    ${isCurrent ? '<span class="bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded">ATTUALE</span>' : ''}
                    <span class="text-gray-400 text-sm">
                        ${this.formatDate(entry.date)} - ${entry.time}
                    </span>
                </div>
                <h4 class="text-white font-bold text-lg mb-2">${entry.title}</h4>
                <ul class="space-y-1">
                    ${entry.changes.map(change => `
                        <li class="text-gray-300 text-sm flex items-start gap-2">
                            <span class="text-green-400 mt-0.5 flex-shrink-0">&#10003;</span>
                            <span>${this.getChangeText(change)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    },

    /**
     * Renderizza una entry come accordion collassabile
     */
    renderEntryAccordion(entry, index) {
        const typeConfig = this.getTypeConfig(entry.type);

        return `
            <div class="mb-2 rounded-lg border border-gray-600 overflow-hidden">
                <div class="changelog-accordion-header flex items-center justify-between p-3 bg-gray-700 cursor-pointer hover:bg-gray-600 transition">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="bg-indigo-700 text-white text-xs font-bold px-2 py-1 rounded">
                            v${entry.version}
                        </span>
                        <span class="${typeConfig.labelColor} text-white text-xs font-semibold px-2 py-0.5 rounded">
                            ${typeConfig.labelText}
                        </span>
                        <span class="text-white text-sm font-medium">${entry.title}</span>
                        <span class="text-gray-400 text-xs">${this.formatDate(entry.date)}</span>
                    </div>
                    <svg class="accordion-arrow w-5 h-5 text-gray-400 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </div>
                <div class="hidden p-3 bg-gray-800 border-t border-gray-600">
                    <p class="text-gray-400 text-xs mb-2">${this.formatDate(entry.date)} - ${entry.time}</p>
                    <ul class="space-y-1">
                        ${entry.changes.map(change => `
                            <li class="text-gray-300 text-sm flex items-start gap-2">
                                <span class="text-green-400 mt-0.5 flex-shrink-0">&#10003;</span>
                                <span>${this.getChangeText(change)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    },

    /**
     * Ottiene la configurazione colori per tipo di update
     */
    getTypeConfig(type) {
        const configs = {
            'bugfix': {
                borderColor: 'border-red-500 bg-red-900/20',
                labelColor: 'bg-red-600',
                labelText: 'Bug Fix'
            },
            'feature': {
                borderColor: 'border-green-500 bg-green-900/20',
                labelColor: 'bg-green-600',
                labelText: 'Nuova Funzione'
            },
            'update': {
                borderColor: 'border-blue-500 bg-blue-900/20',
                labelColor: 'bg-blue-600',
                labelText: 'Aggiornamento'
            },
            'hotfix': {
                borderColor: 'border-orange-500 bg-orange-900/20',
                labelColor: 'bg-orange-600',
                labelText: 'Hotfix'
            }
        };
        return configs[type] || {
            borderColor: 'border-gray-500 bg-gray-900/20',
            labelColor: 'bg-gray-600',
            labelText: 'Update'
        };
    },

    /**
     * Formatta la data in italiano
     */
    formatDate(dateStr) {
        const [year, month, day] = dateStr.split('-');
        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
    },

    /**
     * Ottiene la versione corrente
     */
    getVersion() {
        return this.currentVersion;
    }
};

// Click fuori dal modal per chiuderlo
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('changelog-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.Changelog.hide();
            }
        });
    }
});

console.log(`Modulo Changelog caricato - Versione ${window.Changelog.currentVersion}`);
