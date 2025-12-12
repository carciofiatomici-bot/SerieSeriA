//
// ====================================================================
// FEATURE-FLAGS.JS - Sistema Feature Flags Centralizzato
// ====================================================================
//

window.FeatureFlags = {
    // Configurazione feature flags
    flags: {
        notifications: {
            id: 'notifications',
            name: 'Sistema Notifiche',
            description: 'Notifiche in-app per eventi importanti (turno draft, partite simulate, mercato)',
            icon: '🔔',
            enabled: false,
            category: 'communication',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Campanella notifiche nell'angolo in alto a destra</li>
                    <li>Badge con contatore messaggi non letti</li>
                    <li>Notifiche per: turno draft, risultati partite, mercato, scambi</li>
                    <li>Click sulla notifica per andare alla sezione relativa</li>
                    <li>Persistenza notifiche per 7 giorni</li>
                </ul>
                <p class="mt-2 text-yellow-400">Le notifiche ad alta priorita' mostrano anche un toast.</p>`
        },
        playerStats: {
            id: 'playerStats',
            name: 'Statistiche Avanzate',
            description: 'Storico prestazioni, grafici andamento e confronto tra giocatori',
            icon: '📊',
            enabled: false,
            category: 'stats',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Pannello statistiche dettagliate per ogni giocatore</li>
                    <li>Grafico andamento voti nelle ultime partite</li>
                    <li>Statistiche offensive: gol, assist, tiri, passaggi chiave</li>
                    <li>Statistiche difensive: contrasti, intercetti, parate</li>
                    <li>Storico partita per partita con voti e performance</li>
                </ul>
                <p class="mt-2 text-yellow-400">Accessibile cliccando su un giocatore nella rosa.</p>`
        },
        chat: {
            id: 'chat',
            name: 'Chat Lega',
            description: 'Chat globale per comunicare con tutti i manager della lega',
            icon: '💬',
            enabled: false,
            category: 'communication',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Bottone chat flottante in basso a sinistra</li>
                    <li>Chat globale visibile a tutti i manager della lega</li>
                    <li>Nome squadra visibile sopra ogni messaggio</li>
                    <li>Badge notifica nuovi messaggi</li>
                    <li>Storico messaggi salvato</li>
                </ul>
                <p class="mt-2 text-yellow-400">Perfetta per coordinare scambi o commentare le partite!</p>`
        },
        trades: {
            id: 'trades',
            name: 'Scambi Giocatori',
            description: 'Sistema per proporre e negoziare scambi tra squadre',
            icon: '🔄',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Pannello scambi con proposte ricevute e inviate</li>
                    <li>Creazione nuove proposte di scambio</li>
                    <li>Scambio giocatori + crediti opzionali</li>
                    <li>Accetta, rifiuta o annulla proposte</li>
                    <li>Notifiche per nuove proposte ricevute</li>
                </ul>
                <p class="mt-2 text-yellow-400">Gli scambi completati trasferiscono immediatamente i giocatori.</p>`
        },
        achievements: {
            id: 'achievements',
            name: 'Achievements',
            description: 'Badge e trofei per traguardi raggiunti',
            icon: '🏆',
            enabled: false,
            category: 'gamification',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>20+ achievements da sbloccare</li>
                    <li>Categorie: Progressione, Vittorie, Gol, Rosa, Classifica, Speciali</li>
                    <li>Sistema punti per ogni achievement</li>
                    <li>Notifiche quando sblocchi un nuovo achievement</li>
                    <li>Pannello con tutti gli achievements e progresso</li>
                </ul>
                <p class="mt-2 text-yellow-400">Esempi: Prima Vittoria, Tripletta, Capocannoniere, Campione!</p>`
        },
        training: {
            id: 'training',
            name: 'Allenamento',
            description: 'Partite amichevoli per testare formazioni senza conseguenze',
            icon: '⚽',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Partite amichevoli che non influenzano classifica</li>
                    <li>Scelta avversario: Casuale, Specchio (te stesso), Squadra della lega</li>
                    <li>Difficolta' regolabile: Facile, Normale, Difficile</li>
                    <li>Storico partite di allenamento</li>
                    <li>Perfetto per testare formazioni e strategie</li>
                </ul>
                <p class="mt-2 text-yellow-400">Nessun rischio! Sperimenta liberamente.</p>`
        },
        matchAnimations: {
            id: 'matchAnimations',
            name: 'Animazioni Partite (Completo)',
            description: 'Replay visuale 2D completo delle partite con tutte le fasi di gioco',
            icon: '🎬',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Campo 2D visto dall'alto con giocatori posizionati</li>
                    <li>Animazione completa di TUTTE le fasi di gioco</li>
                    <li>Movimento palla durante costruzione, attacco e tiro</li>
                    <li>Effetti speciali per i gol (flash campo, celebrazione)</li>
                    <li>Animazioni parate del portiere</li>
                    <li>Controlli: Play/Pausa, velocita' (0.5x-4x), avanti/indietro</li>
                </ul>
                <p class="mt-2 text-yellow-400">Mostra la partita completa, fase per fase. Accessibile dal bottone "Animazione Completa" dopo ogni partita.</p>`
        },
        matchHighlights: {
            id: 'matchHighlights',
            name: 'Animazioni Partite (Solo Highlights)',
            description: 'Replay visuale 2D con solo i momenti salienti: gol, parate, occasioni',
            icon: '⭐',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Campo 2D visto dall'alto con giocatori posizionati</li>
                    <li>Mostra SOLO i momenti salienti della partita</li>
                    <li>Animazioni gol con celebrazione</li>
                    <li>Animazioni parate decisive</li>
                    <li>Occasioni da gol mancate</li>
                    <li>Durata ridotta: solo le azioni importanti</li>
                </ul>
                <p class="mt-2 text-yellow-400">Versione veloce per vedere solo il meglio! Accessibile dal bottone "Solo Highlights" dopo ogni partita.</p>`
        },
        creditiSuperSeri: {
            id: 'creditiSuperSeri',
            name: 'Crediti Super Seri',
            description: 'Sistema valuta premium per potenziamenti e abilita speciali',
            icon: '💎',
            enabled: false,
            category: 'economy',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Valuta premium (CSS) per acquisti speciali</li>
                    <li>Potenziamento livello giocatori oltre il limite normale</li>
                    <li>Acquisto abilita' speciali per i giocatori</li>
                    <li>Si guadagnano vincendo trofei (Campionato, Coppa, Supercoppa)</li>
                    <li>Interfaccia dedicata nel pannello squadra</li>
                </ul>
                <p class="mt-2 text-yellow-400">I CSS sono piu' rari dei crediti normali e danno vantaggi esclusivi.</p>`
        },
        cssAutomation: {
            id: 'cssAutomation',
            name: 'Automazione CSS',
            description: 'Attiva/disattiva automaticamente i CSS quando la stagione termina/inizia',
            icon: '🤖',
            enabled: false,
            category: 'economy',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Attivazione automatica CSS a fine stagione (campionato + coppa + supercoppa terminati)</li>
                    <li>Disattivazione automatica CSS all'inizio del nuovo campionato</li>
                    <li>Permette ai manager di usare i CSS solo nella finestra di mercato</li>
                </ul>
                <p class="mt-2 text-yellow-400">Richiede che il flag "Crediti Super Seri" sia abilitato.</p>`
        },
        dragDrop: {
            id: 'dragDrop',
            name: 'Drag & Drop Migliorato',
            description: 'Trascina giocatori per impostare formazione e riordinare rosa',
            icon: '✋',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Formazione con drag visuale - trascina giocatori sul campo</li>
                    <li>Riordino rosa trascinando i giocatori nella lista</li>
                    <li>Supporto touch completo per smartphone e tablet</li>
                    <li>Feedback visivo durante il trascinamento</li>
                    <li>Validazione automatica delle posizioni</li>
                </ul>
                <p class="mt-2 text-yellow-400">Tieni premuto su mobile per attivare il drag!</p>`
        },
        challenges: {
            id: 'challenges',
            name: 'Sfide tra Squadre',
            description: 'Sfida altri manager in partite amichevoli con scommesse CS',
            icon: '⚔️',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Bottone "Sfida" nella dashboard per sfidare altre squadre</li>
                    <li>Notifica in tempo reale quando ricevi una sfida</li>
                    <li>Simulazione partita animata con punteggio live</li>
                    <li>Sistema scommesse: scommetti fino a 50 CS per sfida</li>
                    <li>Chi vince prende i CS scommessi dall'avversario</li>
                    <li>Limite: massimo una scommessa ogni ora</li>
                    <li>Sfide senza scommessa: illimitate!</li>
                    <li>In caso di pareggio con scommessa: ognuno riprende i propri CS</li>
                </ul>
                <p class="mt-2 text-cyan-400"><strong>Moltiplicatori vincita:</strong></p>
                <ul class="list-disc list-inside mt-1 space-y-1 text-sm">
                    <li>Favorito vince (media rosa +2.0): vincita x0.75</li>
                    <li>Underdog vince (media rosa -2.0): vincita x1.25</li>
                </ul>
                <p class="mt-2 text-yellow-400">Sfida i tuoi amici e dimostra chi e' il piu' forte!</p>`
        },
        interactiveChallenges: {
            id: 'interactiveChallenges',
            name: 'Sfide Interattive Real-Time',
            description: 'Partite sfida dove entrambi i giocatori lanciano i dadi in tempo reale',
            icon: '🎲',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Partite interattive in tempo reale tra due giocatori</li>
                    <li>60 occasioni totali (30 per squadra, alternate)</li>
                    <li>3 fasi per occasione: Costruzione, Attacco, Tiro</li>
                    <li>Entrambi i giocatori lanciano i dadi cliccando bottoni</li>
                    <li>Animazione dado visibile a entrambi in tempo reale</li>
                    <li>Sistema presenza: se ti disconnetti per piu di 15 secondi perdi!</li>
                    <li>Sistema sasso-carta-forbice per tipi giocatori</li>
                    <li>Forma fisica casuale: da -3 a +3 per giocatori normali, da 0 a +6 per Icone</li>
                </ul>
                <p class="mt-2 text-red-400"><strong>ATTENZIONE:</strong> Richiede che entrambi i giocatori siano online!</p>
                <p class="mt-2 text-yellow-400">Richiede che il flag "Sfide tra Squadre" sia abilitato.</p>`
        },
        unlimitedChallenges: {
            id: 'unlimitedChallenges',
            name: 'Sfide Illimitate',
            description: 'Rimuove il limite di una sfida al giorno per utente',
            icon: '♾️',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Rimuove il limite di 1 sfida al giorno per utente</li>
                    <li>I giocatori possono sfidare e essere sfidati senza limiti</li>
                    <li>Utile per eventi speciali o periodi di test</li>
                </ul>
                <p class="mt-2 text-yellow-400">Di default ogni utente puo' fare/ricevere solo 1 sfida al giorno (reset a mezzanotte).</p>
                <p class="mt-2 text-cyan-400">Richiede che il flag "Sfide tra Squadre" sia abilitato.</p>`
        },
        tutorial: {
            id: 'tutorial',
            name: 'Tutorial Interattivo',
            description: 'Guida passo-passo per i nuovi utenti attraverso le funzionalita del gioco',
            icon: '📖',
            enabled: false,
            category: 'support',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Tutorial guidato step-by-step</li>
                    <li>Evidenziazione elementi dell'interfaccia</li>
                    <li>Spiegazione di tutte le funzionalita principali</li>
                    <li>Bottone "Tutorial" nel box Supporto della homepage</li>
                    <li>Possibilita di saltare o ripetere il tutorial</li>
                </ul>
                <p class="mt-2 text-yellow-400">Perfetto per i nuovi giocatori! Attivalo per aiutare chi inizia.</p>`
        },
        matchHistory: {
            id: 'matchHistory',
            name: 'Hall of Fame',
            description: 'Storico delle partite giocate con risultati e statistiche',
            icon: '🏛️',
            enabled: false,
            category: 'stats',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Bottone "Hall of Fame" nella dashboard sopra il nome squadra</li>
                    <li>Lista completa di tutte le partite giocate</li>
                    <li>Filtri per tipo: Campionato, Sfide, Coppa, Allenamenti</li>
                    <li>Statistiche riepilogative: vittorie, pareggi, sconfitte</li>
                    <li>Dettagli partita: marcatori, risultato, avversario</li>
                    <li>Percentuale vittorie e andamento</li>
                </ul>
                <p class="mt-2 text-yellow-400">La gloria della tua squadra, immortalata per sempre!</p>`
        },
        injuries: {
            id: 'injuries',
            name: 'Sistema Infortuni',
            description: 'I giocatori possono infortunarsi dopo le partite e saltare da 1 a 10 giornate',
            icon: '🏥',
            enabled: false,
            category: 'gameplay',
            details: `<strong>Cosa include:</strong>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>1% di probabilita di infortunio per ogni giocatore schierato</li>
                    <li>Massimo 1 infortunio per partita per squadra</li>
                    <li>Massimo infortuni contemporanei: 1/4 della rosa</li>
                    <li>Durata infortunio: da 1 a 10 partite (casuale)</li>
                    <li>Giocatori infortunati non possono essere schierati</li>
                    <li>Box "Infortunati" visibile nella gestione formazione</li>
                    <li>Emoji e contatore partite nella gestione rosa</li>
                </ul>
                <p class="mt-2 text-red-400">Applica a: Campionato, Coppa, Supercoppa (NON sfide e allenamenti)</p>
                <p class="mt-2 text-yellow-400">Gestisci bene la tua rosa per non restare senza giocatori!</p>`
        }
    },

    // Path Firestore per salvare i flags
    getConfigPath() {
        const appId = window.firestoreTools?.appId;
        return appId ? `artifacts/${appId}/public/data/config/featureFlags` : null;
    },

    // Unsubscribe function per il listener real-time
    _unsubscribe: null,

    /**
     * Inizializza i feature flags caricandoli da Firestore
     */
    async init() {
        try {
            await this.loadFromFirestore();
            // Avvia listener real-time per aggiornamenti immediati
            this.startRealtimeListener();
            console.log("Feature Flags inizializzati:", this.getEnabledFlags());
        } catch (error) {
            console.warn("Impossibile caricare feature flags, uso defaults:", error);
        }
    },

    /**
     * Carica i flags da Firestore (una tantum)
     */
    async loadFromFirestore() {
        const path = this.getConfigPath();
        if (!path || !window.db || !window.firestoreTools) return;

        const { doc, getDoc } = window.firestoreTools;
        const docRef = doc(window.db, path);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const savedFlags = docSnap.data();
            // Aggiorna solo lo stato enabled, mantieni le altre proprietà
            for (const [key, value] of Object.entries(savedFlags)) {
                if (this.flags[key]) {
                    this.flags[key].enabled = value.enabled || false;
                }
            }
        }
    },

    /**
     * Avvia listener real-time per aggiornamenti immediati dei flags
     */
    startRealtimeListener() {
        const path = this.getConfigPath();
        if (!path || !window.db || !window.firestoreTools) return;

        // Evita duplicati
        if (this._unsubscribe) {
            this._unsubscribe();
        }

        try {
            const { doc, onSnapshot } = window.firestoreTools;
            const docRef = doc(window.db, path);

            this._unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const savedFlags = docSnap.data();

                    // Controlla quali flags sono cambiati
                    for (const [key, value] of Object.entries(savedFlags)) {
                        if (this.flags[key]) {
                            const newEnabled = value.enabled || false;
                            const oldEnabled = this.flags[key].enabled;

                            // Se lo stato e' cambiato, aggiorna e notifica
                            if (newEnabled !== oldEnabled) {
                                this.flags[key].enabled = newEnabled;
                                console.log(`Feature Flag "${key}" cambiato: ${oldEnabled} -> ${newEnabled}`);
                                this.notifyChange(key, newEnabled);
                            }
                        }
                    }
                }
            }, (error) => {
                console.warn("Errore listener feature flags:", error);
            });

            console.log("Listener real-time feature flags attivo");
        } catch (error) {
            console.error("Errore setup listener feature flags:", error);
        }
    },

    /**
     * Ferma il listener real-time
     */
    stopRealtimeListener() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
    },

    /**
     * Salva i flags su Firestore
     */
    async saveToFirestore() {
        const path = this.getConfigPath();
        if (!path || !window.db || !window.firestoreTools) {
            console.error("Impossibile salvare feature flags: Firestore non disponibile");
            return false;
        }

        try {
            const { doc, setDoc } = window.firestoreTools;
            const docRef = doc(window.db, path);

            // Salva solo id e enabled per ogni flag
            const dataToSave = {};
            for (const [key, flag] of Object.entries(this.flags)) {
                dataToSave[key] = {
                    enabled: flag.enabled,
                    updatedAt: new Date().toISOString()
                };
            }

            await setDoc(docRef, dataToSave);
            return true;
        } catch (error) {
            console.error("Errore salvataggio feature flags:", error);
            return false;
        }
    },

    /**
     * Controlla se una feature è abilitata
     * @param {string} flagId - ID del flag
     * @returns {boolean}
     */
    isEnabled(flagId) {
        return this.flags[flagId]?.enabled || false;
    },

    /**
     * Abilita un flag
     * @param {string} flagId - ID del flag
     * @param {boolean} save - Se salvare su Firestore
     */
    async enable(flagId, save = true) {
        if (this.flags[flagId]) {
            this.flags[flagId].enabled = true;

            // Mutua esclusione tra matchAnimations e matchHighlights
            if (flagId === 'matchAnimations' && this.flags['matchHighlights']?.enabled) {
                this.flags['matchHighlights'].enabled = false;
                this.notifyChange('matchHighlights', false);
            } else if (flagId === 'matchHighlights' && this.flags['matchAnimations']?.enabled) {
                this.flags['matchAnimations'].enabled = false;
                this.notifyChange('matchAnimations', false);
            }

            if (save) await this.saveToFirestore();
            this.notifyChange(flagId, true);
        }
    },

    /**
     * Disabilita un flag
     * @param {string} flagId - ID del flag
     * @param {boolean} save - Se salvare su Firestore
     */
    async disable(flagId, save = true) {
        if (this.flags[flagId]) {
            this.flags[flagId].enabled = false;
            if (save) await this.saveToFirestore();
            this.notifyChange(flagId, false);
        }
    },

    /**
     * Toggle un flag
     * @param {string} flagId - ID del flag
     */
    async toggle(flagId) {
        if (this.flags[flagId]) {
            const newState = !this.flags[flagId].enabled;

            if (newState) {
                // Usa enable per gestire mutua esclusione
                await this.enable(flagId, true);
            } else {
                await this.disable(flagId, true);
            }

            return this.flags[flagId].enabled;
        }
        return false;
    },

    /**
     * Notifica il cambio di un flag
     */
    notifyChange(flagId, enabled) {
        document.dispatchEvent(new CustomEvent('featureFlagChanged', {
            detail: { flagId, enabled }
        }));
    },

    /**
     * Ottieni tutti i flags abilitati
     */
    getEnabledFlags() {
        return Object.entries(this.flags)
            .filter(([_, flag]) => flag.enabled)
            .map(([key, _]) => key);
    },

    /**
     * Ottieni tutti i flags
     */
    getAllFlags() {
        return { ...this.flags };
    },

    /**
     * Ottieni flags per categoria
     */
    getFlagsByCategory(category) {
        return Object.entries(this.flags)
            .filter(([_, flag]) => flag.category === category)
            .reduce((acc, [key, flag]) => {
                acc[key] = flag;
                return acc;
            }, {});
    },

    /**
     * Wrapper per eseguire codice solo se feature abilitata
     * @param {string} flagId - ID del flag
     * @param {Function} fn - Funzione da eseguire
     * @param {Function} fallback - Funzione fallback se disabilitato
     */
    whenEnabled(flagId, fn, fallback = null) {
        if (this.isEnabled(flagId)) {
            return fn();
        } else if (fallback) {
            return fallback();
        }
        return null;
    }
};

// Auto-init quando Firestore è pronto
document.addEventListener('DOMContentLoaded', () => {
    const checkAndInit = () => {
        if (window.db && window.firestoreTools) {
            window.FeatureFlags.init();
        } else {
            setTimeout(checkAndInit, 200);
        }
    };
    setTimeout(checkAndInit, 500);
});

console.log("Modulo FeatureFlags caricato.");
