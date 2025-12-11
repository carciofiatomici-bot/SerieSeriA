//
// ====================================================================
// TUTORIAL.JS - Tutorial Interattivo per Serie SeriA
// ====================================================================
// Guida i nuovi utenti attraverso le funzionalita principali
//

window.Tutorial = {
    // Stato del tutorial
    isActive: false,
    currentStep: 0,
    overlay: null,
    tooltip: null,
    spotlight: null,
    currentSteps: null, // Steps attualmente in uso (tutorial o guida creazione)

    // Steps per "Come creare la mia squadra" (dalla homepage)
    howToCreateTeamSteps: [
        {
            id: 'intro',
            title: 'Come creare la tua squadra',
            content: 'Segui questa guida per creare la tua squadra in Serie SeriA! Ti spieghiamo passo passo come fare.',
            target: null,
            position: 'center'
        },
        {
            id: 'login-box',
            title: 'Box Login',
            content: 'Qui puoi creare la tua squadra o accedere se ne hai gia una. Vediamo come registrarsi!',
            target: '#normal-login-box',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'nome-squadra',
            title: 'Nome Squadra',
            content: 'Nel campo "Nome Squadra" inserisci il nome che vuoi dare alla tua squadra. IMPORTANTE: il nome NON deve contenere spazi! Usa lettere e numeri (es: "Squadra1", "RealMadrid", "MilanFC").',
            target: '#login-username',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'password',
            title: 'Password',
            content: 'Nel campo "Password" inserisci una password di ALMENO 5 caratteri. Questa sara la tua password per accedere sempre alla squadra.',
            target: '#login-password',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'nota-bene',
            title: 'NOTA BENE - Sicurezza',
            content: 'NON usare password che usi per altre app o servizi importanti! Scegli una password unica per Serie SeriA.',
            target: null,
            position: 'center'
        },
        {
            id: 'primo-accesso',
            title: 'Primo Accesso',
            content: 'Clicca "Accedi" con le credenziali scelte. Al primo accesso ti verra chiesto di scegliere un ALLENATORE per la tua squadra.',
            target: '#login-button',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'selezione-icona',
            title: 'Scegli la tua Icona',
            content: 'Dopo l\'allenatore, dovrai scegliere un\'ICONA: un giocatore speciale che sara il capitano della tua squadra. Scegli con attenzione!',
            target: null,
            position: 'center'
        },
        {
            id: 'esplora-icone',
            title: 'Esplora le Icone Disponibili',
            content: 'Puoi vedere tutte le Icone disponibili cliccando sul bottone "Icone" nella sezione Esplora la Lega.',
            target: '#btn-lista-icone',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'dashboard',
            title: 'La tua Dashboard',
            content: 'Una volta completata la creazione, accederai alla tua Dashboard dove potrai gestire rosa, formazione, partecipare al draft e molto altro!',
            target: null,
            position: 'center'
        },
        {
            id: 'complete',
            title: 'Sei pronto!',
            content: 'Ora sai come creare la tua squadra! Inserisci nome (senza spazi) e password (min. 5 caratteri) e inizia la tua avventura in Serie SeriA!',
            target: null,
            position: 'center',
            isLast: true
        }
    ],

    // Definizione degli steps del tutorial (dashboard)
    steps: [
        {
            id: 'welcome',
            title: 'Benvenuto in Serie SeriA!',
            content: 'Questo tutorial ti guidera attraverso le funzionalita principali del gioco. Clicca "Avanti" per iniziare!',
            target: null, // Nessun elemento specifico, mostra al centro
            position: 'center'
        },
        {
            id: 'dashboard',
            title: 'La tua Dashboard',
            content: 'Questa e la tua dashboard principale. Da qui puoi accedere a tutte le funzionalita del gioco.',
            target: '#app-content',
            position: 'center',
            highlight: true
        },
        {
            id: 'gestione-rosa',
            title: 'Gestione Rosa',
            content: 'Clicca qui per vedere tutti i giocatori della tua squadra e le loro statistiche.',
            target: '#btn-gestione-rosa',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'gestione-formazione',
            title: 'Gestione Formazione',
            content: 'Qui puoi schierare i tuoi titolari e scegliere la formazione per le partite.',
            target: '#btn-gestione-formazione',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'draft',
            title: 'Draft Giocatori',
            content: 'Nel Draft puoi acquistare nuovi giocatori per la tua squadra usando i tuoi Crediti Seri.',
            target: '#btn-draft-utente',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'mercato',
            title: 'Mercato Svincolati',
            content: 'Qui trovi giocatori svincolati che puoi ingaggiare gratuitamente.',
            target: '#btn-mercato-utente',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'sfida',
            title: 'Sfida',
            content: 'Sfida altre squadre in partite amichevoli! Puoi scommettere Crediti Seri sul risultato.',
            target: '#btn-challenge',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'allenamento',
            title: 'Allenamento',
            content: 'Fai partite di allenamento contro squadre generate o contro squadre della lega senza conseguenze.',
            target: '#btn-training',
            position: 'bottom',
            highlight: true
        },
        {
            id: 'classifica',
            title: 'Classifica',
            content: 'Controlla la classifica del campionato e vedi come si posiziona la tua squadra.',
            target: '#btn-dashboard-leaderboard',
            position: 'top',
            highlight: true
        },
        {
            id: 'calendario',
            title: 'Calendario',
            content: 'Visualizza il calendario delle partite e i risultati delle giornate.',
            target: '#btn-dashboard-schedule',
            position: 'top',
            highlight: true
        },
        {
            id: 'regole',
            title: 'Regole del Gioco',
            content: 'Se hai dubbi, clicca qui per leggere le regole complete del gioco!',
            target: '#rules-global-btn',
            position: 'left',
            highlight: true
        },
        {
            id: 'complete',
            title: 'Tutorial Completato!',
            content: 'Ora sei pronto per giocare a Serie SeriA! Buona fortuna con la tua squadra!',
            target: null,
            position: 'center',
            isLast: true
        }
    ],

    /**
     * Inizializza il tutorial
     */
    init() {
        this.createOverlayElements();
        console.log('Tutorial inizializzato');
    },

    /**
     * Crea gli elementi DOM per l'overlay
     */
    createOverlayElements() {
        // Rimuovi elementi esistenti se presenti
        this.destroy();

        // Overlay scuro
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        this.overlay.className = 'tutorial-overlay hidden';
        document.body.appendChild(this.overlay);

        // Spotlight (buco nell'overlay)
        this.spotlight = document.createElement('div');
        this.spotlight.id = 'tutorial-spotlight';
        this.spotlight.className = 'tutorial-spotlight hidden';
        document.body.appendChild(this.spotlight);

        // Tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'tutorial-tooltip';
        this.tooltip.className = 'tutorial-tooltip hidden';
        this.tooltip.innerHTML = `
            <div class="tutorial-tooltip-header">
                <span class="tutorial-step-indicator"></span>
                <h3 class="tutorial-title"></h3>
                <button class="tutorial-close" onclick="window.Tutorial.stop()">&times;</button>
            </div>
            <div class="tutorial-content"></div>
            <div class="tutorial-footer">
                <button class="tutorial-btn tutorial-btn-skip" onclick="window.Tutorial.stop()">Salta Tutorial</button>
                <div class="tutorial-nav">
                    <button class="tutorial-btn tutorial-btn-prev" onclick="window.Tutorial.prev()">Indietro</button>
                    <button class="tutorial-btn tutorial-btn-next" onclick="window.Tutorial.next()">Avanti</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.tooltip);
    },

    /**
     * Avvia il tutorial (dalla dashboard)
     */
    start() {
        // Verifica se il flag e attivo
        if (!window.FeatureFlags?.isEnabled('tutorial')) {
            if (window.Toast) window.Toast.info('Tutorial non disponibile');
            return;
        }

        // Verifica che siamo nella dashboard utente
        const appContent = document.getElementById('app-content');
        if (!appContent || appContent.classList.contains('hidden')) {
            if (window.Toast) window.Toast.warning('Accedi alla dashboard per avviare il tutorial');
            return;
        }

        this.currentSteps = this.steps;
        this.isActive = true;
        this.currentStep = 0;

        // Assicurati che gli elementi esistano
        if (!this.overlay) {
            this.createOverlayElements();
        }

        this.overlay.classList.remove('hidden');
        this.tooltip.classList.remove('hidden');

        this.showStep(0);
        console.log('Tutorial avviato');
    },

    /**
     * Avvia la guida "Come creare la mia squadra" (dalla homepage)
     */
    startHowToCreateTeam() {
        // Verifica se il flag e attivo
        if (!window.FeatureFlags?.isEnabled('tutorial')) {
            if (window.Toast) window.Toast.info('Guida non disponibile');
            return;
        }

        // Verifica che siamo nella pagina di login
        const loginBox = document.getElementById('login-box');
        if (!loginBox || loginBox.classList.contains('hidden')) {
            if (window.Toast) window.Toast.warning('Questa guida e disponibile solo dalla homepage');
            return;
        }

        this.currentSteps = this.howToCreateTeamSteps;
        this.isActive = true;
        this.currentStep = 0;

        // Assicurati che gli elementi esistano
        if (!this.overlay) {
            this.createOverlayElements();
        }

        this.overlay.classList.remove('hidden');
        this.tooltip.classList.remove('hidden');

        this.showStep(0);
        console.log('Guida "Come creare la mia squadra" avviata');
    },

    /**
     * Ferma il tutorial
     */
    stop() {
        // Salva solo se era il tutorial della dashboard (non la guida creazione)
        const wasDashboardTutorial = this.currentSteps === this.steps;

        this.isActive = false;
        this.currentStep = 0;
        this.currentSteps = null;

        if (this.overlay) this.overlay.classList.add('hidden');
        if (this.spotlight) this.spotlight.classList.add('hidden');
        if (this.tooltip) this.tooltip.classList.add('hidden');

        // Salva che l'utente ha completato/saltato il tutorial (solo per il tutorial dashboard)
        if (wasDashboardTutorial) {
            localStorage.setItem('tutorial_completed', 'true');
        }

        console.log('Tutorial fermato');
    },

    /**
     * Vai allo step successivo
     */
    next() {
        const steps = this.currentSteps || this.steps;
        if (this.currentStep < steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            this.complete();
        }
    },

    /**
     * Vai allo step precedente
     */
    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    },

    /**
     * Mostra uno step specifico
     */
    showStep(stepIndex) {
        const steps = this.currentSteps || this.steps;
        const step = steps[stepIndex];
        if (!step) return;

        // Aggiorna indicatore step
        const indicator = this.tooltip.querySelector('.tutorial-step-indicator');
        indicator.textContent = `${stepIndex + 1}/${steps.length}`;

        // Aggiorna titolo e contenuto
        const title = this.tooltip.querySelector('.tutorial-title');
        title.textContent = step.title;

        const content = this.tooltip.querySelector('.tutorial-content');
        content.textContent = step.content;

        // Aggiorna bottoni
        const prevBtn = this.tooltip.querySelector('.tutorial-btn-prev');
        const nextBtn = this.tooltip.querySelector('.tutorial-btn-next');

        prevBtn.style.display = stepIndex === 0 ? 'none' : 'inline-block';
        nextBtn.textContent = step.isLast ? 'Completa!' : 'Avanti';

        // Posiziona spotlight e tooltip
        if (step.target) {
            const targetEl = document.querySelector(step.target);
            if (targetEl && !targetEl.classList.contains('hidden')) {
                this.positionSpotlight(targetEl);
                this.positionTooltip(targetEl, step.position);
                this.spotlight.classList.remove('hidden');
            } else {
                // Elemento non trovato o nascosto, mostra al centro
                this.spotlight.classList.add('hidden');
                this.positionTooltipCenter();
            }
        } else {
            // Nessun target, mostra al centro
            this.spotlight.classList.add('hidden');
            this.positionTooltipCenter();
        }
    },

    /**
     * Posiziona lo spotlight sull'elemento target
     */
    positionSpotlight(element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;

        this.spotlight.style.top = `${rect.top - padding + window.scrollY}px`;
        this.spotlight.style.left = `${rect.left - padding}px`;
        this.spotlight.style.width = `${rect.width + padding * 2}px`;
        this.spotlight.style.height = `${rect.height + padding * 2}px`;
    },

    /**
     * Posiziona il tooltip rispetto all'elemento target
     */
    positionTooltip(element, position) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const padding = 15;

        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - padding + window.scrollY;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + padding + window.scrollY;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2 + window.scrollY;
                left = rect.left - tooltipRect.width - padding;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2 + window.scrollY;
                left = rect.right + padding;
                break;
            default:
                this.positionTooltipCenter();
                return;
        }

        // Assicurati che il tooltip sia visibile nello schermo
        const maxLeft = window.innerWidth - tooltipRect.width - 10;
        const maxTop = window.innerHeight - tooltipRect.height - 10 + window.scrollY;

        left = Math.max(10, Math.min(left, maxLeft));
        top = Math.max(10 + window.scrollY, Math.min(top, maxTop));

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.transform = 'none';
    },

    /**
     * Posiziona il tooltip al centro dello schermo
     */
    positionTooltipCenter() {
        this.tooltip.style.top = '50%';
        this.tooltip.style.left = '50%';
        this.tooltip.style.transform = 'translate(-50%, -50%)';
    },

    /**
     * Completa il tutorial
     */
    complete() {
        const wasDashboardTutorial = this.currentSteps === this.steps;

        if (wasDashboardTutorial) {
            localStorage.setItem('tutorial_completed', 'true');
            if (window.Toast) {
                window.Toast.success('Tutorial completato! Buon divertimento!');
            }
        } else {
            if (window.Toast) {
                window.Toast.success('Ora sai come creare la tua squadra!');
            }
        }

        this.stop();
    },

    /**
     * Resetta lo stato del tutorial (per permettere di rifarlo)
     */
    reset() {
        localStorage.removeItem('tutorial_completed');
        console.log('Tutorial resettato');
    },

    /**
     * Verifica se il tutorial e stato completato
     */
    isCompleted() {
        return localStorage.getItem('tutorial_completed') === 'true';
    },

    /**
     * Distrugge gli elementi del tutorial
     */
    destroy() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.spotlight) {
            this.spotlight.remove();
            this.spotlight = null;
        }
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }
};

// Inizializza quando il DOM e pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che gli altri moduli siano pronti
    setTimeout(() => {
        window.Tutorial.init();
    }, 2000);
});

console.log('Modulo Tutorial caricato');
