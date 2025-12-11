//
// ====================================================================
// CHANGELOG.JS - Storico Aggiornamenti Serie SeriA
// ====================================================================
//

window.Changelog = {

    // Versione corrente
    currentVersion: '0.9.94',

    // Numero massimo di versioni da mostrare
    maxEntries: 5,

    // Storico changelog (dal piu recente al piu vecchio)
    entries: [
        {
            version: '0.9.94',
            date: '2025-12-11',
            time: '21:00',
            title: 'Miglioramenti Pannello Admin',
            changes: [
                'Aggiunto bottone "Assegna CS a Tutte" per dare crediti a tutte le squadre',
                'Aggiunto bottone "Assegna CSS a Tutte" per dare crediti super seri a tutte',
                'Lista squadre in box scrollabile (max 8 visibili, poi scroll)',
                'Accesso rapido dashboard Mucche Mannare e Schalke104 in Utilita Admin',
                'Rimosso testo superfluo dalla homepage admin'
            ],
            type: 'feature'
        },
        {
            version: '0.9.93',
            date: '2025-12-11',
            time: '19:45',
            title: 'Pausa/Riprendi Draft',
            changes: [
                'Aggiunto bottone "Metti in Pausa" per sospendere temporaneamente il draft',
                'Aggiunto bottone "Riprendi Draft" per riprendere dalla pausa',
                'Il countdown si ferma durante la pausa e riprende da dove era',
                'Gli utenti vedono UI "Draft in Pausa" quando sospeso',
                'Pannello admin mostra stato pausa con colore arancione'
            ],
            type: 'feature'
        },
        {
            version: '0.9.92',
            date: '2025-12-11',
            time: '18:30',
            title: 'Draft Debug & Admin Panel',
            changes: [
                'Riorganizzato pannello admin: Draft a Turni dentro "Controllo Stato"',
                'Aggiunto bottone "Avanza Turno Manualmente" per admin',
                'Box Draft a Turni nascosto quando draft e chiuso',
                'Fix countdown desync: sincronizzazione con server ogni 10 secondi',
                'Fix race condition: guard aggiuntivi prima degli update',
                'Fix doppio draft: verifica isDrafted con dati freschi',
                'Migliorata gestione turni con verifica stato real-time'
            ],
            type: 'bugfix'
        },
        {
            version: '0.9.91',
            date: '2025-12-11',
            time: '16:45',
            title: 'Bug Fix & Ottimizzazioni',
            changes: [
                'Fix Draft Snake: risolto turno 2 saltato (race condition)',
                'Fix costo Draft: mostra range min-max invece di valore singolo',
                'Fix pannello Admin Automazioni: risolto blocco su "Aggiornamento"',
                'Fix mobile: toggle switches allineati su iPhone/Android',
                'Fix immagini: migrato a raw.githubusercontent.com',
                'Fix URL Icone: corretto case-sensitive (Icone/ maiuscolo)',
                'Aggiunta sanitizzazione automatica URL GitHub legacy',
                'Aggiunto Changelog in homepage'
            ],
            type: 'bugfix'
        }
    ],

    /**
     * Mostra il modal changelog
     */
    show() {
        const modal = document.getElementById('changelog-modal');
        const content = document.getElementById('changelog-content');

        if (!modal || !content) {
            console.error('Changelog: elementi DOM non trovati');
            return;
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
     * Renderizza il contenuto del changelog
     */
    renderChangelog() {
        const entriesToShow = this.entries.slice(0, this.maxEntries);

        let html = `
            <div class="text-center mb-6">
                <span class="bg-indigo-600 text-white text-lg font-bold px-4 py-2 rounded-full">
                    Versione Attuale: ${this.currentVersion}
                </span>
            </div>
        `;

        entriesToShow.forEach((entry, index) => {
            const isFirst = index === 0;

            if (isFirst) {
                // Prima entry (piu recente) - sempre espansa
                html += this.renderEntryExpanded(entry, true);
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
                            <span>${change}</span>
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
                                <span>${change}</span>
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
