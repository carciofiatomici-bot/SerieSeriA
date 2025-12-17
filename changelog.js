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
    currentVersion: '2.2.6',

    // Numero massimo di versioni da mostrare
    maxEntries: 5,

    // Modalita corrente (admin o players)
    currentMode: 'players',

    // Storico changelog (dal piu recente al piu vecchio)
    // adminOnly: true = visibile solo nel changelog admin
    // adminOnly: false o assente = visibile a tutti
    entries: [
        {
            version: '2.2.6',
            date: '2025-12-17',
            time: '16:00',
            title: 'Fix Critici Schedina e UI Mobile',
            changes: [
                { text: 'FIX: Errore salvataggio schedina su Firebase risolto', adminOnly: false },
                { text: 'FIX: Timer countdown schedina ora mostra correttamente il tempo rimanente', adminOnly: false },
                { text: 'FIX: Icona statistiche giocatore non rompe piu il layout su mobile', adminOnly: false },
                { text: 'Il countdown si ferma automaticamente 1 ora prima della partita (19:30)', adminOnly: false },
                { text: 'FIX: Struttura dati Firestore schedine corretta', adminOnly: true }
            ],
            type: 'bugfix'
        },
        {
            version: '2.2.5',
            date: '2025-12-17',
            time: '14:00',
            title: 'Automazione Schedina + Fix UI Mobile',
            changes: [
                { text: 'NUOVO: I premi della schedina vengono assegnati automaticamente 1 ora dopo la partita', adminOnly: false },
                { text: 'NUOVO: Timer countdown "Pronostici chiudono tra:" nella schedina', adminOnly: false },
                { text: 'I pronostici si chiudono automaticamente 1 ora prima della simulazione', adminOnly: false },
                { text: 'Notifica automatica quando vinci premi dalla schedina', adminOnly: false },
                { text: 'FIX: Icona statistiche giocatore riposizionata correttamente su mobile', adminOnly: false },
                { text: 'NUOVO: GitHub Action per calcolo automatico schedina alle 21:30', adminOnly: true },
                { text: 'Automazione schedina integrata nel sistema di simulazione', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '2.2.4',
            date: '2025-12-17',
            time: '12:00',
            title: 'Sistema Schedina Pronostici + Fix Mobile',
            changes: [
                { text: 'NUOVO: Sistema Schedina Pronostici - pronostica i risultati 1/X/2 delle partite!', adminOnly: false },
                { text: 'Schedina accessibile dal floating alert della prossima partita', adminOnly: false },
                { text: 'Vinci crediti per ogni pronostico corretto + bonus schedina perfetta', adminOnly: false },
                { text: 'Soglia minima partite corrette configurabile per vincere premi', adminOnly: false },
                { text: 'Storico schedine con risultati e premi vinti', adminOnly: false },
                { text: 'MIGLIORATO: Minigiochi allenamento ora scalano dinamicamente su mobile', adminOnly: false },
                { text: 'MIGLIORATO: Fullscreen automatico per minigiochi su dispositivi mobili', adminOnly: false },
                { text: 'FIX: Icona statistiche non piu sovrapposta al nome giocatore su mobile', adminOnly: false },
                { text: 'NUOVO: Flag Schedina nella sezione Admin dei Feature Flags', adminOnly: true },
                { text: 'NUOVO: Pannello Config Schedina per configurare premi e soglie', adminOnly: true },
                { text: 'Admin puo calcolare risultati e assegnare premi manualmente', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '2.2.3',
            date: '2025-12-16',
            time: '23:45',
            title: 'Fix Bug Avanzamento Coppa',
            changes: [
                { text: 'FIX: La coppa non termina piu prematuramente dopo gli ottavi di finale', adminOnly: false },
                { text: 'FIX: I quarti di finale vengono creati correttamente dopo il ritorno degli ottavi', adminOnly: false },
                { text: 'Aggiunto sistema di riparazione automatica del bracket coppa se corrotto', adminOnly: true },
                { text: 'Migliorato logging per debug avanzamento coppa', adminOnly: true }
            ],
            type: 'bugfix'
        },
        {
            version: '2.2.2',
            date: '2025-12-16',
            time: '23:30',
            title: 'Upgrade Massimale + Accordion Competizioni + Giocatori Seri',
            changes: [
                { text: 'NUOVO: Tab "Upgrade Massimale" nel Negozio CSS per aumentare il livello massimo dei giocatori', adminOnly: false },
                { text: 'Upgrade Massimale: costa 2x livello giocatore in CSS, limite massimo GOAT Lv.25', adminOnly: false },
                { text: 'Solo giocatori che hanno raggiunto il loro massimo attuale possono fare upgrade', adminOnly: false },
                { text: 'Badge GOAT dorato per i giocatori che raggiungono il livello massimo 25', adminOnly: false },
                { text: 'NUOVO: Menu accordion per Campionato - giornate collassabili, completate in fondo', adminOnly: false },
                { text: 'NUOVO: Menu accordion per Coppa - turni collassabili, completati in fondo', adminOnly: false },
                { text: 'NUOVO: Box "Ultima Partita" nel tab Campionato con risultato e colore vittoria/sconfitta/pareggio', adminOnly: false },
                { text: 'NUOVO: Box "Ultima Partita" nel tab Coppa con risultato ultima partita giocata', adminOnly: false },
                { text: 'NUOVO: Flag "Giocatore Serio" nella modifica giocatori admin - livello massimo 10', adminOnly: true },
                { text: 'Badge arancione per Giocatori Seri nella gestione rosa', adminOnly: false },
                { text: 'Giocatori Base e Seri mostrano potenziale "Dilettante" (Max 5 e 10)', adminOnly: false },
                { text: 'Giocatori Base e Seri esclusi dal sistema contratti - non lasciano mai la squadra', adminOnly: false },
                { text: 'Colore nome giocatori in rosa basato sulla forma: verde (in forma), bianco (neutro), rosso (fuori forma)', adminOnly: false },
                { text: 'FIX: Alert prossima partita ora mostra i nomi reali delle squadre (non piu "Squadra A vs Squadra B")', adminOnly: false },
                { text: 'FIX: Alert prossima partita rispetta ordine automazione (coppa o campionato)', adminOnly: false },
                { text: 'FIX: Icone nuove squadre ora partono da livello 5 invece di 10', adminOnly: false },
                { text: 'FIX: Errore "getCurrentTeamId is not a function" nel modal Recupero Forma', adminOnly: false }
            ],
            type: 'feature'
        },
        {
            version: '2.2.1',
            date: '2025-12-16',
            time: '22:00',
            title: 'Floating Alert Partite + Miglioramenti UI',
            changes: [
                { text: 'NUOVO: Floating alert prossima partita in alto a sinistra con countdown', adminOnly: false },
                { text: 'Alert mostra loghi squadre, media rosa e timer fino alle 20:30', adminOnly: false },
                { text: 'Alert minimizzabile con click - da ridotto mostra solo icona competizione', adminOnly: false },
                { text: 'NUOVO: Calendario completo con menu a scomparsa (accordion) per ogni giornata', adminOnly: false },
                { text: 'La giornata corrente si apre automaticamente', adminOnly: false },
                { text: 'Indicazione "(tua partita)" sulla giornata in cui giochi', adminOnly: false },
                { text: 'Nome squadra ora centrato nel box della dashboard', adminOnly: false },
                { text: 'FIX: Bottone statistiche non copre piu i nomi giocatori in PWA', adminOnly: false },
                { text: 'FIX: Sponsor e Media ora assegnano crediti al budget correttamente', adminOnly: false },
                { text: 'FIX: La pagina mantiene la schermata corrente dopo un refresh', adminOnly: false },
                { text: 'FIX: Alla riapertura della PWA si torna alla dashboard (non all\'ultima schermata)', adminOnly: false }
            ],
            type: 'feature'
        },
        {
            version: '2.2.0',
            date: '2025-12-16',
            time: '20:00',
            title: 'Ruota della Fortuna + Auto-Formazione + Potenziale',
            changes: [
                { text: 'NUOVO: Ruota della Fortuna Giornaliera - gira ogni giorno per vincere CS, CSS o Oggetti!', adminOnly: false },
                { text: 'Premi ruota: 5/10/25/50 CS, 1 CSS, Oggetto random', adminOnly: false },
                { text: 'NUOVO: Sistema Auto-Formazione - schiera automaticamente la formazione migliore', adminOnly: false },
                { text: 'NUOVO: Giocatori Base Gratuiti nel Mercato - acquista P, D, C, A di livello 1 a 0 CS', adminOnly: false },
                { text: 'I Giocatori Base non hanno cooldown e possono essere acquistati a volonta', adminOnly: false },
                { text: 'NUOVO: Potenziale visibile nella Gestione Rosa (Dilettante, Professionista, Fuoriclasse, Leggenda, GOAT)', adminOnly: false },
                { text: 'NUOVO: Potenziale visibile anche nella lista Draft per scegliere meglio i giocatori', adminOnly: false },
                { text: 'Nuovo limite livello massimo: Giocatori Base fino a Lv.25, Icone fino a Lv.30', adminOnly: false },
                { text: 'NUOVO: Alert sul bottone Gestione Formazione se la formazione puo essere migliorata', adminOnly: false },
                { text: 'NUOVO: Alert sul bottone Gestione Rosa se ci sono contratti in scadenza', adminOnly: false },
                { text: 'NUOVO: Limite massimo contratti a 5 anni', adminOnly: false },
                { text: 'Ruoli nella Gestione Rosa ora separati per colore (P blu, D verde, C arancione, A rosso)', adminOnly: false },
                { text: 'Nuove icone ruoli: Centrocampisti ora con pallone, Attaccanti con scarpa', adminOnly: false },
                { text: 'NUOVO: Pannello Opzioni Avanzate nelle Utilita Admin (bottone ingranaggio)', adminOnly: true },
                { text: 'NUOVO: Bottoni gestione contratti: +1, -1, Reset a 1 per tutti i giocatori', adminOnly: true },
                { text: 'NUOVO: Campo Contratto nel modal modifica giocatore', adminOnly: true },
                { text: 'NUOVO: Bottone Set Livello Icone per cambiare livello a tutte le Icone', adminOnly: true },
                { text: 'Categorie Feature Flags ora collassabili e chiuse di default', adminOnly: true },
                { text: 'Box Annulla Competizioni spostato nelle Opzioni Avanzate', adminOnly: true },
                { text: 'NUOVO: Bottone "Assegna Giocatore Casuale" nel Draft Admin - assegna un giocatore random', adminOnly: true },
                { text: 'NUOVO: Pannello Configurazione Ruota Fortuna - modifica premi e probabilita', adminOnly: true },
                { text: 'Bottone Avanza Turno spostato sotto il toggle Draft Attivo', adminOnly: true },
                { text: 'Bottone Changelog ora visibile a destra del Tutorial in dashboard', adminOnly: false }
            ],
            type: 'feature'
        },
        {
            version: '2.0.0',
            date: '2025-12-14',
            time: '26:00',
            title: 'Aggiornamento Regole Simulazione v4.0',
            changes: [
                { text: 'NUOVO: Nuovi modificatori livello (da 0.5 a 9.0 invece di 1.0-18.5)', adminOnly: false },
                { text: 'NUOVO: Sistema tipologia sasso-carta-forbice: +1.5 per chi vince, -1.5 per chi perde', adminOnly: false },
                { text: 'NUOVO: Simulazione campionato, coppa, supercoppa: 50 occasioni per squadra', adminOnly: false },
                { text: 'NUOVO: Sfide interattive: 10 occasioni totali con confronto allenatori', adminOnly: false },
                { text: 'NUOVO: Nelle sfide, ogni occasione inizia con 1d20+mod allenatore vs 1d20+mod allenatore', adminOnly: false },
                { text: 'NUOVO: Sfide hanno tipologia potenziata (±3) e 15% successo critico', adminOnly: false },
                { text: 'NUOVO: 40+ nuove abilita aggiunte all\'enciclopedia', adminOnly: false },
                { text: 'NUOVA ABILITA: Cuore Impavido (+1.5 fuori casa)', adminOnly: false },
                { text: 'NUOVA ABILITA: Camaleonte (inverte tipologia)', adminOnly: false },
                { text: 'NUOVA ABILITA: Specialisti (Difesa/Costruzione/Tiro)', adminOnly: false },
                { text: 'NUOVA ABILITA: Veterano (+1.5 ultime 5 occasioni)', adminOnly: false },
                { text: 'NUOVA ABILITA: Dribbling Ubriacante (critico vs difensori)', adminOnly: false },
                { text: 'NUOVA ABILITA: Parata Laser per Simone (cumula -1 per parata)', adminOnly: false },
                { text: 'Enciclopedia abilita aggiornata a V4.0 con 120+ abilita', adminOnly: false }
            ],
            type: 'feature'
        },
        {
            version: '1.6.2',
            date: '2025-12-14',
            time: '25:00',
            title: 'Notifiche Push Browser',
            changes: [
                { text: 'NUOVO: Notifiche push del browser per eventi importanti', adminOnly: false },
                { text: 'Push quando e\' il tuo turno nel draft', adminOnly: false },
                { text: 'Push quando puoi rubare un turno nel draft', adminOnly: false },
                { text: 'Push quando termina una partita (campionato, coppa, supercoppa)', adminOnly: false },
                { text: 'Push per notifiche high priority (scambi, sfide)', adminOnly: false },
                { text: 'Richiesta permesso notifiche all\'avvio dell\'app', adminOnly: false }
            ],
            type: 'feature'
        },
        {
            version: '1.6.1',
            date: '2025-12-14',
            time: '24:30',
            title: 'Automazione Scambi + Fix Abilita Uniche',
            changes: [
                { text: 'NUOVO: Flag "Automazione Scambi" nel pannello Feature Flags', adminOnly: true },
                { text: 'Scambi disattivati automaticamente quando inizia la stagione', adminOnly: true },
                { text: 'Scambi attivati automaticamente quando termina la Supercoppa', adminOnly: true },
                { text: 'FIX: Notifiche scambi ora arrivano correttamente al destinatario', adminOnly: false },
                { text: 'FIX: Le abilita Uniche ora sono correttamente escluse dalla rimozione', adminOnly: false },
                { text: 'FIX: Calcolo costo rimozione abilita positive corretto', adminOnly: false }
            ],
            type: 'fix'
        },
        {
            version: '1.6.0',
            date: '2025-12-14',
            time: '24:00',
            title: 'Pannello Admin Configurazione Reward',
            changes: [
                { text: 'NUOVO: Pannello "Configurazione Reward" nel menu Utilita Admin', adminOnly: true },
                { text: 'Reward CS ora configurabili: goal, vittoria, fine stagione', adminOnly: true },
                { text: 'Reward CSS competizioni ora configurabili: campionato, coppa, supercoppa', adminOnly: true },
                { text: 'Reward EXP giocatori configurabili: titolare, panchina, goal, assist, clean sheet', adminOnly: true },
                { text: 'Reward EXP allenatore configurabile: vittoria partita', adminOnly: true },
                { text: 'Tutti i reward salvati su Firestore e modificabili dall\'app', adminOnly: true }
            ],
            type: 'feature',
            adminOnly: true
        },
        {
            version: '1.5.0',
            date: '2025-12-14',
            time: '23:30',
            title: 'Tab Rimuovi Abilita + Pannello Formule Admin',
            changes: [
                { text: 'NUOVO: Tab "Rimuovi Abilita" nel negozio CSS per rimuovere abilita dai giocatori', adminOnly: false },
                { text: 'Rimozione abilita positive: costo = 5 + (2 x rarita) CSS', adminOnly: false },
                { text: 'Rimozione abilita negative: costo progressivo 5x(n+1) CSS per giocatore', adminOnly: false },
                { text: 'Contatore negative rimosse persistente: piu rimuovi, piu costa', adminOnly: false },
                { text: 'Le abilita Icona e Uniche non possono essere rimosse', adminOnly: false },
                { text: 'Fix layout box abilita nella creazione giocatori (piu larghi e leggibili)', adminOnly: false },
                { text: 'Nuova sezione "Rimozione Abilita" nel pannello formule admin', adminOnly: true },
                { text: 'Formule rimozione configurabili: base, moltiplicatore, progressivo', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '1.4.0',
            date: '2025-12-14',
            time: '22:00',
            title: 'Avvia Stagione + Miglioramenti Icone + Ottimizzazioni CSS',
            changes: [
                { text: 'NUOVO: Bottone "Avvia Stagione" nel pannello admin - genera calendari e attiva automazione', adminOnly: true },
                { text: 'Avvia Stagione: genera calendario campionato + tabellone coppa + attiva auto-sim alle 20:30', adminOnly: true },
                { text: 'Lista Icone nella homepage ora mostra le abilita uniche di ogni Icona', adminOnly: false },
                { text: 'Cliccando su un\'Icona si apre un dettaglio con tutte le informazioni e abilita', adminOnly: false },
                { text: 'Aggiunta abilita "Parata Efficiente" per Simone', adminOnly: false },
                { text: 'Corretta abilita "Relax" per Sandro Diaz', adminOnly: false },
                { text: 'Flavio El Ficario nascosto dalla lista Icone e dalla selezione squadra', adminOnly: true },
                { text: 'Auto-sync: le Icone in Firestore si aggiornano automaticamente da icone.js', adminOnly: true },
                { text: 'Ottimizzazioni CSS per miglior compatibilita mobile e accessibilita', adminOnly: true },
                { text: 'Rimosso bottone "Test Simulazione Partita" dal pannello admin', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '1.3.0',
            date: '2025-12-14',
            time: '18:00',
            title: 'Nuovo Sistema Abilita - 1 per Rarita + Negative Automatiche',
            changes: [
                { text: 'NUOVO: Limite 1 abilita per rarita (max 1 Comune, 1 Rara, 1 Epica, 1 Leggendaria)', adminOnly: false },
                { text: 'NUOVO: Abilita negative automatiche per Epiche e Leggendarie', adminOnly: false },
                { text: 'Acquisto abilita Epica: +1 abilita negativa random assegnata automaticamente', adminOnly: false },
                { text: 'Acquisto abilita Leggendaria: +2 abilita negative random assegnate automaticamente', adminOnly: false },
                { text: 'Generatore random giocatori Draft aggiornato con la nuova logica', adminOnly: false },
                { text: 'UI Crediti Super Seri aggiornata per mostrare negative automatiche', adminOnly: false },
                { text: 'Le abilita Uniche rimangono non acquistabili (solo Icone)', adminOnly: false },
                { text: 'Rimosso modal selezione abilita negative (ora automatico)', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '1.2.0',
            date: '2025-12-14',
            time: '15:00',
            title: 'Abilita Uniche delle Icone + Simulazione V3.1',
            changes: [
                { text: 'NUOVO: 13 Abilita Uniche per le Icone implementate nella simulazione', adminOnly: false },
                { text: 'Fatto d\'acciaio (Croccante): immune agli infortuni, cura gratuita', adminOnly: false },
                { text: 'L\'uomo in piu (Fosco): salva fasi perse aggiungendo 1/2 mod (max 5x)', adminOnly: false },
                { text: 'Tiro Dritto (Amedemo): se unico A: +1/5 lv, critico 6%', adminOnly: false },
                { text: 'Avanti un altro (Antony): +2 in difesa Fase 2', adminOnly: false },
                { text: 'Contrasto di gomito (Luka): +1/5 lv difesa, 1% fail automatico', adminOnly: false },
                { text: 'Calcolo delle probabilita (Il Cap): 2d20 in Fase 1, prende il migliore', adminOnly: false },
                { text: 'Continua a provare (Gladio): media 2d20, mod x0.5 attacco, x1.5 difesa, no critico', adminOnly: false },
                { text: 'Stazionario (Cocco): accumula +0.5 per fase saltata', adminOnly: false },
                { text: 'Osservatore (Mark Falco): annulla abilita piu rara avversario, bonus rarita', adminOnly: false },
                { text: 'Relax (Sandro): mod dinamico +1 attacco/-1 difesa (range -5 a +5)', adminOnly: false },
                { text: 'Scheggia impazzita (Bemolle): +0.2 per ogni Fase 2 (max +5)', adminOnly: false },
                { text: 'Assist-man (Meliodas): +1 mod per ogni assist fatto', adminOnly: false },
                { text: 'Abilita Icona modificata: 50% di attivarsi a inizio partita', adminOnly: false },
                { text: 'Sezione Abilita Uniche aggiunta all\'Enciclopedia Abilita', adminOnly: false },
                { text: 'Tutte le abilita uniche ora con colore dorato nell\'enciclopedia', adminOnly: false },
                { text: 'Fix Abilita Icone: bottone admin per aggiungere abilita uniche alle Icone esistenti', adminOnly: true },
                { text: 'Simulazione.js aggiornato a V3.1 con tracking abilita uniche', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '1.1.0',
            date: '2025-12-13',
            time: '23:00',
            title: 'Nuove Abilita + Sistema Eventi Partita + Regole Simulazione V3.3',
            changes: [
                { text: 'NUOVE ABILITA: Responta, Colpo d\'anca, Ripresa rapida, Forma Smagliante', adminOnly: false },
                { text: 'NUOVE ABILITA: Raddoppio in difesa, Raddoppio in attacco', adminOnly: false },
                { text: 'NUOVE ABILITA NEGATIVE: Fragile, Non Adattabile, Titubanza', adminOnly: false },
                { text: 'Aggiornata Parata di pugno (ex Pugno di ferro): -1/-2 diventa 0', adminOnly: false },
                { text: 'Aggiornato Muro Psicologico: ora Leggendaria, dimezza il tiro avversario', adminOnly: false },
                { text: 'Aggiornato Sguardo Intimidatorio: 1d12 invece di 1d6', adminOnly: false },
                { text: 'Occasioni per squadra aumentate da 30 a 40', adminOnly: false },
                { text: 'Penalita tipologia ora variabile tra 5% e 25% (invece di fisso 25%)', adminOnly: false },
                { text: 'Infortuni post-partita: 1% per giocatore, max 1 per squadra', adminOnly: false },
                { text: 'NUOVO: Espandi Eventi Partita - visualizza dettagli fasi e abilita attivate', adminOnly: false },
                { text: 'Sistema matchEvents per tracciamento dettagliato simulazione', adminOnly: true },
                { text: 'Abilities encyclopedia aggiornata a V3.3 con 75 abilita', adminOnly: true },
                { text: 'Aggiunti test automatici per matchEvents, regole simulazione e infortuni', adminOnly: true },
                { text: 'Bottone Espandi Eventi aggiunto ai test admin simulazione', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '1.0.0',
            date: '2025-12-13',
            time: '17:00',
            title: 'Sistema EXP Allenatore + Spogliatoi + Pulizia Codice',
            changes: [
                { text: 'NUOVO: Sistema EXP per allenatori - guadagna esperienza vincendo partite', adminOnly: false },
                { text: 'NUOVO: Spogliatoi - nuova costruzione stadio con bonus EXP (+5% per livello, max +25%)', adminOnly: false },
                { text: 'Barra EXP allenatore visibile nella schermata Stadio', adminOnly: false },
                { text: 'Spogliatoi upgradabili da livello 1 a 5 (costi: 1000-5000 CS)', adminOnly: false },
                { text: 'Rimosso vecchio sistema level-up allenatore casuale (20% a stagione)', adminOnly: false },
                { text: 'Pulsante "Novita" aggiunto alla dashboard utente', adminOnly: false },
                { text: 'Pulizia index.html: estratto codice PWA in file separato (pwa-install.js)', adminOnly: true },
                { text: 'Fix bug: contenuto HTML dopo tag </html> spostato correttamente', adminOnly: true },
                { text: 'Animazioni replay spostate in style.css (-400 righe da index.html)', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '0.9.99',
            date: '2025-12-12',
            time: '22:00',
            title: 'Sistema Infortuni + Layout Dashboard',
            changes: [
                { text: 'NUOVO: Sistema Infortuni - i giocatori possono infortunarsi dopo le partite', adminOnly: false },
                { text: 'Infortunio: 1% di probabilita per giocatore schierato (configurabile)', adminOnly: false },
                { text: 'Massimo 1 infortunio per partita per squadra', adminOnly: false },
                { text: 'Durata infortunio: da 1 a 10 partite (casuale)', adminOnly: false },
                { text: 'Box "Infermeria" nella gestione formazione mostra giocatori infortunati', adminOnly: false },
                { text: 'Giocatori infortunati non possono essere schierati', adminOnly: false },
                { text: 'Dashboard: sponsor, countdown, logo, icona, divisa e media tutti su una riga', adminOnly: false },
                { text: 'Moduli ordinati per posizione (dal piu difensivo al piu offensivo)', adminOnly: false },
                { text: 'Notifica sfida ora mostra i crediti scommessi', adminOnly: false },
                { text: 'Nuovo flag "Sistema Infortuni" con impostazioni configurabili', adminOnly: true },
                { text: 'Impostazioni infortuni: % infortunio, durata min/max, max % rosa infortunata', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '0.9.98',
            date: '2025-12-12',
            time: '19:00',
            title: 'Formazioni + Fuori Ruolo + Draft UI',
            changes: [
                { text: 'Nuove formazioni disponibili: 1-1-1-2, 1-2-1-1, 1-2-2-0, 1-0-2-2, 1-0-3-1, 1-4-0-0, 1-0-0-4, 1-0-4-0', adminOnly: false },
                { text: 'Menu selezione modulo ora mostra anche i ruoli (es. 1-2-1-1 P-DD-C-A)', adminOnly: false },
                { text: 'Giocatori fuori ruolo: -15% al livello (arrotondato per difetto)', adminOnly: false },
                { text: 'Notifica quando si salvano giocatori fuori ruolo nella formazione', adminOnly: false },
                { text: 'Draft: rinominato "Pick Recenti" in "Pick Effettuati"', adminOnly: false },
                { text: 'Draft: ora mostra nome, ruolo (badge colorato), livello e squadra', adminOnly: false },
                { text: 'Preview abilita al click nella sezione Regole', adminOnly: false },
                { text: 'Notifiche turno draft e possibilita di rubare turno', adminOnly: false },
                { text: 'Toast notifiche anche quando il flag notifiche e disabilitato', adminOnly: false },
                { text: 'Aggiornata descrizione flag Sfide Interattive con range forma corretto', adminOnly: true }
            ],
            type: 'feature'
        },
        {
            version: '0.9.97',
            date: '2025-12-12',
            time: '16:00',
            title: 'Sfide Giornaliere + Rewards + Mobile',
            changes: [
                { text: 'Reward goal segnati aumentato da 1 CS a 5 CS (Campionato e Coppa)', adminOnly: false },
                { text: 'Limite 1 sfida al giorno per utente (reset a mezzanotte)', adminOnly: false },
                { text: 'Bottone Scambi aggiunto nella dashboard accanto a Sfida', adminOnly: false },
                { text: 'Bottone Allenamento spostato in Gestione Rosa sotto l\'allenatore', adminOnly: false },
                { text: 'Achievements: tutti i reward ora danno 1 CSS', adminOnly: false },
                { text: 'Ottimizzazione completa mobile/app (dashboard, modali, bottoni)', adminOnly: false },
                { text: 'Budget visibile sempre su mobile (non serve hover)', adminOnly: false },
                { text: 'Nuovo flag "Sfide Illimitate" per rimuovere limite giornaliero', adminOnly: true },
                { text: 'Gestione Achievements spostata sotto flag nel pannello admin', adminOnly: true }
            ],
            type: 'feature'
        },
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
