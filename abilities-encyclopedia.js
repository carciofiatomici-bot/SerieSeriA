//
// ====================================================================
// ABILITIES-ENCYCLOPEDIA.JS - Enciclopedia Abilità Completa V3.0
// ====================================================================
// Aggiornato con tutte le 60 abilità del nuovo motore di simulazione
//

window.AbilitiesEncyclopedia = {
    
    /**
     * Database completo abilità - AGGIORNATO V2.0
     */
    abilities: {
        
        // ========================================
        // PORTIERE (11 Abilità)
        // ========================================
        
        'Pugno di ferro': {
            name: 'Pugno di ferro',
            icon: '🥊',
            role: 'P',
            color: 'text-red-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Il portiere para anche tiri difficili',
            effect: 'Soglia parata abbassata da 0 a -2',
            mechanics: 'Normalmente il portiere para se il risultato ≥ 0. Con Pugno di Ferro para se ≥ -2',
            activation: '100% (Passiva)',
            example: 'Tiro: 18 vs Parata: 16 → Differenza -2 → Normalmente GOAL, con Pugno di Ferro è PARATA!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Uscita Kamikaze', 'Parata con i piedi']
        },
        
        'Uscita Kamikaze': {
            name: 'Uscita Kamikaze',
            icon: '🤯',
            role: 'P',
            color: 'text-orange-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Il portiere si lancia senza paura, raddoppiando la parata',
            effect: 'Raddoppia modificatore portiere, ma 5% di fallimento forzato',
            mechanics: 'Modificatore x2 in fase tiro. Se para, 5% di goal comunque',
            activation: '100% (raddoppio) + 5% (fail)',
            example: 'Portiere mod +8 → Con Kamikaze diventa +16! MA: se para, 5% di fallire',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Pugno di Ferro', 'Fortunato'],
            warning: '⚠️ Rischio 5% di fallimento anche con parata riuscita!'
        },
        
        'Teletrasporto': {
            name: 'Teletrasporto',
            icon: '🌀',
            role: 'P',
            color: 'text-purple-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Il portiere si teletrasporta e aiuta in costruzione/attacco',
            effect: '5% di partecipare alle fasi 1 e 2',
            mechanics: 'In Costruzione e Attacco, 5% di aggiungere il modificatore del portiere',
            activation: '5% per ogni fase 1 e 2',
            example: 'Costruzione: 1d20+15 vs 1d20+12 → Con Teletrasporto: 1d20+15+8(portiere) = vantaggio enorme!',
            phase: 'Fase 1 (Costruzione) e Fase 2 (Attacco)',
            synergy: ['Icona (+1 mod)', 'Fortunato']
        },
        
        'Effetto Caos': {
            name: 'Effetto Caos',
            icon: '🎲',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-yellow-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Il modificatore varia casualmente ogni fase',
            effect: 'Modificatore varia da -3 a +3 ogni fase',
            mechanics: 'Ad ogni fase, roll casuale da -3 a +3 si aggiunge al modificatore base',
            activation: '100% (ogni fase)',
            example: 'Giocatore lv10 (mod 5.5) → Fase 1: 5.5+2, Fase 2: 5.5-1, Fase 3: 5.5+3',
            phase: 'Tutte le fasi',
            synergy: ['Fortunato (stabilizza)', 'Icona'],
            warning: '⚠️ Può anche peggiorare il modificatore!'
        },

        'Fortunato': {
            name: 'Fortunato',
            icon: '🍀',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-green-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: '5% di raddoppiare il modificatore (negativo diventa 0)',
            effect: '5% raddoppia mod, se negativo diventa 0',
            mechanics: 'Ogni fase, 5% di raddoppiare. Se mod negativo, diventa 0 invece',
            activation: '5% per ogni fase',
            example: 'Mod +8 → 5% → Diventa +16 | Mod -3 → 5% → Diventa 0',
            phase: 'Tutte le fasi',
            synergy: ['Effetto Caos (protegge da negativi)', 'Uscita Kamikaze']
        },

        'Bandiera del club': {
            name: 'Bandiera del club',
            icon: '🚩',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-blue-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Dà +1 ai compagni dello stesso ruolo',
            effect: '+1 modificatore a tutti gli altri giocatori dello stesso ruolo',
            mechanics: 'Ogni altro giocatore del suo ruolo in squadra riceve +1 al modificatore',
            activation: '100% (passiva)',
            example: 'Difensore A (Bandiera) + Difensore B → Difensore B riceve +1',
            phase: 'Tutte le fasi',
            synergy: ['Icona (stack +2 totale)'],
            warning: 'Non cumulabile con altre Bandiere dello stesso ruolo'
        },
        
        'Parata con i piedi': {
            name: 'Parata con i piedi',
            icon: '🦶',
            role: 'P',
            color: 'text-teal-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: '5% di tirare 2 dadi e tenere il migliore',
            effect: '5% tira 2d20 in fase parata, tiene il più alto',
            mechanics: 'In fase tiro, 5% di lanciare un secondo d20 e tenere il risultato migliore',
            activation: '5%',
            example: 'Tiro 1: 8, Tiro 2: 17 → Tiene 17! Parata molto più facile',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Pugno di Ferro', 'Uscita Kamikaze']
        },
        
        'Lancio lungo': {
            name: 'Lancio lungo',
            icon: '🚀',
            role: 'P',
            color: 'text-cyan-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% di saltare la fase costruzione',
            effect: '5% skip fase costruzione, passa direttamente ad attacco',
            mechanics: 'All\'inizio dell\'occasione, 5% di saltare Fase 1 e passare a Fase 2',
            activation: '5%',
            example: 'Occasione inizia → 5% → Skip costruzione → Attacco diretto!',
            phase: 'Fase 1 (Costruzione)',
            synergy: ['Regista (doppia chance skip)'],
            warning: 'Non cumulabile con altre abilità skip costruzione'
        },
        
        'Mani di burro': {
            name: 'Mani di burro',
            icon: '🧈',
            role: 'P',
            color: 'text-red-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% di sottrarre il modificatore invece di aggiungerlo',
            effect: '5% il modificatore diventa negativo in fase parata',
            mechanics: 'In fase tiro, 5% di sottrarre il modificatore invece di sommarlo',
            activation: '5%',
            example: 'Portiere mod +8 → 5% → Diventa -8! Parata quasi impossibile',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Nessuna (abilità negativa)'],
            warning: '⚠️ ABILITÀ NEGATIVA - Può rovinare la parata!'
        },
        
        'Respinta Timida': {
            name: 'Respinta Timida',
            icon: '😰',
            role: 'P',
            color: 'text-orange-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% di dover ritirare il dado obbligatoriamente',
            effect: '5% ritira d20 e usa il secondo tiro (obbligatorio)',
            mechanics: 'In fase tiro, 5% di dover ritirare il d20 e usare il secondo risultato',
            activation: '5%',
            example: 'Tiro 1: 18 (ottimo!) → 5% → Ritira → Tiro 2: 5 (pessimo!) → Usa 5',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Nessuna (abilità negativa)'],
            warning: '⚠️ ABILITÀ NEGATIVA - Può peggiorare il risultato!'
        },
        
        'Fuori dai pali': {
            name: 'Fuori dai pali',
            icon: '🚪',
            role: 'P',
            color: 'text-gray-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% di non aggiungere il modificatore',
            effect: '5% il modificatore diventa 0 in fase parata',
            mechanics: 'In fase tiro, 5% di non aggiungere alcun modificatore',
            activation: '5%',
            example: 'Portiere mod +8 → 5% → Modificatore = 0! Para solo con il d20',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Nessuna (abilità negativa)'],
            warning: '⚠️ ABILITÀ NEGATIVA - Azzera il modificatore!'
        },

        'Presa Sicura': {
            name: 'Presa Sicura',
            icon: '🧤',
            role: 'P',
            color: 'text-green-500',
            rarity: 'Comune',
            type: 'Positiva',
            description: 'Se la parata supera di 5 punti, la squadra salta la costruzione',
            effect: 'Se Totale Portiere - Totale Tiro > 5, prossima azione parte da Fase 2',
            mechanics: 'Se il portiere effettua una parata con differenza > 5, la squadra riparte automaticamente dalla Fase 2',
            activation: '100% (condizionale)',
            example: 'Portiere 22 vs Tiro 15 → Differenza +7 → Prossima azione skip costruzione!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Pugno di Ferro', 'Uscita Kamikaze']
        },

        'Muro Psicologico': {
            name: 'Muro Psicologico',
            icon: '🧠',
            role: 'P',
            color: 'text-purple-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '5% di costringere l\'attacco a tirare 1d10 invece di 1d20',
            effect: '5% l\'attaccante tira 1d10 invece di 1d20 in Fase 3',
            mechanics: 'In fase tiro, 5% di probabilità che l\'attacco usi un d10 invece del d20',
            activation: '5%',
            example: 'Fase 3 → 5% Muro Psicologico → Attacco tira 1d10+mod invece di 1d20+mod!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Pugno di Ferro', 'Parata con i piedi']
        },

        'Miracolo': {
            name: 'Miracolo',
            icon: '✨',
            role: 'P',
            color: 'text-yellow-400',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% di trasformare un goal in parata se differenza < 3',
            effect: '5% se Goal con differenza < 3, diventa Parata',
            mechanics: 'Se il tiro batte il portiere con differenza < 3 punti, 5% di salvare comunque',
            activation: '5% (solo se Goal con differenza < 3)',
            example: 'Tiro 18 vs Portiere 16 → Differenza -2 → 5% → Miracolo! Parata!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Pugno di Ferro', 'Uscita Kamikaze'],
            warning: 'Funziona solo se la differenza è < 3 punti'
        },

        'Freddezza': {
            name: 'Freddezza',
            icon: '❄️',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-blue-400',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Non subisce mai malus alla forma',
            effect: 'Se il modificatore forma sarebbe negativo, viene considerato 0',
            mechanics: 'Il giocatore ignora i malus alla forma fisica. La forma non può mai essere negativa',
            activation: '100% (passiva)',
            example: 'Giocatore con forma -2 → Con Freddezza diventa forma 0',
            phase: 'Tutte le fasi',
            synergy: ['Icona', 'Fortunato']
        },

        'Sguardo Intimidatorio': {
            name: 'Sguardo Intimidatorio',
            icon: '👁️‍🗨️',
            role: 'P',
            color: 'text-red-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '5% che l\'avversario usi 1d6 invece di 1d10 in Fase 3',
            effect: '5% l\'attacco tira 1d6 invece di 1d10 in fase tiro',
            mechanics: 'In Fase 3, 5% di probabilità che la squadra avversaria usi 1d6 invece di 1d10 per il tiro',
            activation: '5%',
            example: 'Fase 3 → 5% Sguardo Intimidatorio → Attacco tira 1d6+mod invece di 1d10+mod!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Pugno di Ferro', 'Muro Psicologico', 'Parata con i piedi']
        },

        'Tiro dalla porta': {
            name: 'Tiro dalla porta',
            icon: '🥅',
            role: 'P',
            color: 'text-emerald-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: '5% di aggiungere metà del suo mod alla fase tiro della propria squadra',
            effect: '5% aggiunge 1/2 mod alla Fase 3 quando la sua squadra attacca',
            mechanics: 'In Fase 3 (quando la sua squadra tira), 5% di probabilità di aggiungere metà del suo modificatore al tiro',
            activation: '5%',
            example: 'Portiere mod +10 → 5% → Tiro della squadra riceve +5!',
            phase: 'Fase 3 (Tiro vs Portiere - in attacco)',
            synergy: ['Lancio lungo', 'Teletrasporto']
        },

        'Lento a carburare': {
            name: 'Lento a carburare',
            icon: '🐢',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-orange-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: 'Modificatore dimezzato nelle prime 5 occasioni',
            effect: 'Nelle prime 5 occasioni (su 30), il modificatore è dimezzato',
            mechanics: 'Durante le prime 5 occasioni della partita, il giocatore contribuisce con metà modificatore',
            activation: '100% (prime 5 occasioni)',
            example: 'Occasione 1-5: Mod +8 → Diventa +4 | Occasione 6+: Mod +8 normale',
            phase: 'Tutte le fasi (prime 5 occasioni)',
            synergy: ['Nessuna (abilità negativa)'],
            warning: '⚠️ ABILITÀ NEGATIVA - Penalizza l\'inizio partita!'
        },

        'Soggetto a infortuni': {
            name: 'Soggetto a infortuni',
            icon: '🤕',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-red-800',
            rarity: 'Epica',
            type: 'Negativa',
            description: '2.5% per fase di infortunarsi e azzerare il modificatore',
            effect: '2.5% ad ogni fase che il modificatore scenda a 0 per il resto della partita',
            mechanics: 'Ad ogni fase a cui partecipa, 2.5% di infortunarsi. Se succede, mod = 0 per tutta la simulazione',
            activation: '2.5% per fase',
            example: 'Fase 3 → 2.5% infortunio → Mod = 0 per TUTTE le occasioni rimanenti!',
            phase: 'Tutte le fasi',
            synergy: ['Nessuna (abilità negativa)'],
            warning: '⚠️ ABILITÀ NEGATIVA - Può disabilitare il giocatore!'
        },

        // ========================================
        // DIFENSORE (12 Abilità)
        // ========================================
        
        'Muro': {
            name: 'Muro',
            icon: '🧱',
            role: 'D',
            color: 'text-blue-600',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Il difensore diventa un muro invalicabile',
            effect: '5% raddoppia modificatore quando difende in Fase 2',
            mechanics: 'In Fase Attacco vs Difesa, 5% di raddoppiare il modificatore del difensore',
            activation: '5%',
            example: 'Difensore mod +6 → 5% → Diventa +12! Difesa fortissima',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Guardia', 'Antifurto']
        },
        
        'Contrasto Durissimo': {
            name: 'Contrasto Durissimo',
            icon: '💪',
            role: 'D',
            color: 'text-red-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Annulla abilità di un giocatore in panchina avversaria',
            effect: 'Ad ogni fase, nullifica abilità random dalla panchina avversaria',
            mechanics: 'All\'inizio dell\'occasione, sceglie casualmente 1 giocatore in panchina avversaria e annulla le sue abilità',
            activation: '100% (se c\'è panchina avversaria)',
            example: 'Avversario ha Bomber in panchina → Contrasto lo disattiva → Bomber non funziona!',
            phase: 'Inizio occasione',
            synergy: ['Muro', 'Antifurto'],
            warning: '⚠️ Funziona solo se avversario ha panchina!'
        },
        
        'Antifurto': {
            name: 'Antifurto',
            icon: '🛡️',
            role: 'D',
            color: 'text-indigo-600',
            rarity: 'Rara',
            type: 'Positiva',
            description: '5% di interrompere direttamente l\'attacco avversario',
            effect: '5% blocca Fase 2 (Attacco vs Difesa) istantaneamente',
            mechanics: 'In Fase 2, 5% di interrompere l\'attacco senza calcoli',
            activation: '5%',
            example: 'Attacco avversario inizia → 5% → Antifurto! Attacco bloccato subito',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Muro', 'Contrasto Durissimo'],
            warning: 'Non cumulabile con altre Antifurto'
        },
        
        'Guardia': {
            name: 'Guardia',
            icon: '🛡️',
            role: 'D',
            color: 'text-blue-700',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Se unico difensore, raddoppia il modificatore',
            effect: 'Raddoppia mod se è l\'unico difensore in formazione',
            mechanics: 'Se in campo c\'è solo questo difensore, raddoppia il suo modificatore in Fase 2',
            activation: '100% (se unico difensore)',
            example: 'Formazione 1-0-3-1, Difensore mod +8 → Diventa +16!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Muro (x2 → x4!)', 'Bandiera del club']
        },
        
        // Nota: Effetto Caos, Fortunato, Bandiera del club sono definiti come Multi-Ruolo
        // nella sezione generale sopra

        // Nota: Tiro dalla distanza è definito come Multi-Ruolo (D,C)
        // nella sezione generale sopra

        'Deviazione': {
            name: 'Deviazione',
            icon: '🤚',
            role: 'D',
            color: 'text-cyan-600',
            rarity: 'Rara',
            type: 'Positiva',
            description: '5% di aggiungere il suo mod al portiere',
            effect: '5% aiuta il portiere aggiungendo il proprio modificatore',
            mechanics: 'In Fase 3, 5% di aggiungere il modificatore difensore a quello portiere',
            activation: '5%',
            example: 'Portiere mod +8, Difensore mod +6 → 5% → Portiere diventa +14!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Pugno di Ferro', 'Uscita Kamikaze']
        },

        'Svaligiatore': {
            name: 'Svaligiatore',
            icon: '🦹',
            role: 'D',
            color: 'text-emerald-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% di rubare il modificatore di un attaccante avversario',
            effect: '5% ruba mod attaccante avversario e lo aggiunge al proprio',
            mechanics: 'In Fase 2, 5% di prendere il modificatore di un attaccante avversario e aggiungerlo al proprio',
            activation: '5%',
            example: 'Attaccante avversario mod +10 → 5% → Difensore guadagna +10!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Muro', 'Antifurto', 'Guardia']
        },

        'Spazzata': {
            name: 'Spazzata',
            icon: '🧹',
            role: 'D',
            color: 'text-green-600',
            rarity: 'Comune',
            type: 'Positiva',
            description: '5% di aggiungere +1 al proprio modificatore in Fase 2',
            effect: '5% bonus +1 al modificatore durante Fase 2',
            mechanics: 'In Fase Attacco vs Difesa, 5% di ottenere +1 al proprio modificatore',
            activation: '5%',
            example: 'Difensore mod +6 → 5% Spazzata → Diventa +7!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Muro', 'Guardia']
        },

        'Adattabile': {
            name: 'Adattabile',
            icon: '🔄',
            role: 'D',
            color: 'text-teal-600',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Ignora il malus del -25% dovuto alla tipologia avversaria',
            effect: 'Non subisce penalità -25% da sasso-carta-forbice',
            mechanics: 'Il difensore ignora il sistema di tipologie (Potenza/Tecnica/Velocità) e non subisce mai il malus del -25%',
            activation: '100% (passiva)',
            example: 'Difensore Potenza vs Attaccante Velocità → Normalmente -25%, con Adattabile nessun malus!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Muro', 'Guardia', 'Antifurto']
        },

        'Salvataggio sulla Linea': {
            name: 'Salvataggio sulla Linea',
            icon: '🦸',
            role: 'D',
            color: 'text-gold-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% di salvare un goal già segnato',
            effect: 'Se portiere battuto, 5% di intervenire con 1d20+mod vs totale attacco',
            mechanics: 'Dopo un Goal, 5% di tirare 1d20+mod difensore. Se batte il totale attacco, il goal è annullato',
            activation: '5% (solo dopo Goal)',
            example: 'Goal! → 5% Salvataggio → 1d20(15)+mod(+8)=23 vs Attacco(20) → Salvato!',
            phase: 'Fase 3 (dopo Goal)',
            synergy: ['Deviazione', 'Muro'],
            warning: 'Si attiva solo DOPO che il portiere è stato battuto'
        },

        'Tiro dalla distanza': {
            name: 'Tiro dalla distanza',
            icon: '🚀',
            role: 'D',
            color: 'text-violet-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Sostituisce il mod dell\'attaccante più debole se il suo è più alto',
            effect: 'In Fase 2, sostituisce il mod dell\'attaccante più debole con il proprio (se maggiore)',
            mechanics: 'Durante Fase Attacco vs Difesa, se il suo mod è maggiore di quello dell\'attaccante con mod più basso, lo sostituisce',
            activation: '100% (condizionale)',
            example: 'Difensore mod +9, Attaccante più debole +4 → Attaccante diventa +9!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Bomber', 'Cross', 'Muro'],
            warning: 'Funziona solo se il mod del difensore è maggiore di quello dell\'attaccante più debole'
        },

        'Falloso': {
            name: 'Falloso',
            icon: '🟨',
            role: 'D',
            color: 'text-yellow-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% sottrae modificatore invece di aggiungerlo',
            effect: '5% mod diventa negativo in Fase 2',
            mechanics: 'In difesa, 5% di sottrarre invece di sommare',
            activation: '5%',
            example: 'Difensore mod +6 → 5% → Diventa -6! Difesa compromessa',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA!'
        },
        
        'Insicuro': {
            name: 'Insicuro',
            icon: '😰',
            role: 'D',
            color: 'text-gray-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% non aggiunge il modificatore',
            effect: '5% mod = 0 in Fase 2',
            mechanics: 'In difesa, 5% di non aggiungere mod',
            activation: '5%',
            example: 'Difensore mod +6 → 5% → Mod = 0',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA!'
        },
        
        'Fuori Posizione': {
            name: 'Fuori Posizione',
            icon: '📍',
            role: 'Multi',
            roles: ['D', 'C', 'A'],
            color: 'text-red-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '2.5% dà metà modificatore agli avversari',
            effect: '2.5% dà 1/2 mod alla squadra avversaria (non in fase 3)',
            mechanics: 'Ogni fase (tranne tiro), 2.5% di dare metà modificatore agli avversari',
            activation: '2.5%',
            example: 'Giocatore mod +8 → 2.5% → Avversario riceve +4!',
            phase: 'Fase 1 e 2',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA! Aiuta gli avversari!'
        },
        
        // ========================================
        // CENTROCAMPISTA (12 Abilità)
        // ========================================
        
        'Regista': {
            name: 'Regista',
            icon: '🎯',
            role: 'C',
            color: 'text-purple-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% salta fase costruzione',
            effect: '5% skip Fase 1, passa direttamente a Fase 2',
            mechanics: 'All\'inizio occasione, 5% skip costruzione',
            activation: '5%',
            example: 'Occasione inizia → 5% → Skip → Attacco diretto!',
            phase: 'Fase 1 (Costruzione)',
            synergy: ['Lancio lungo'],
            warning: 'Non cumulabile con altre Regista'
        },
        
        'Motore': {
            name: 'Motore',
            icon: '⚙️',
            role: 'C',
            color: 'text-blue-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Usa modificatore intero invece di 1/2 in Fase 2',
            effect: 'In attacco/difesa usa mod intero, non dimezzato',
            mechanics: 'In Fase 2, non dimezza il modificatore (usa 1x invece di 0.5x)',
            activation: '100%',
            example: 'Centrocampista mod +7 → Normalmente +3.5, con Motore +7!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Fortunato (mod doppio!)', 'Bandiera del club']
        },
        
        'Tocco Di Velluto': {
            name: 'Tocco Di Velluto',
            icon: '✨',
            role: 'C',
            color: 'text-pink-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: '5% raddoppia modificatore in costruzione',
            effect: '5% mod x2 in Fase 1',
            mechanics: 'In costruzione, 5% di raddoppiare modificatore',
            activation: '5%',
            example: 'Centrocampista mod +7 → 5% → Diventa +14!',
            phase: 'Fase 1 (Costruzione)',
            synergy: ['Regista', 'Mago del pallone']
        },

        // Nota: Effetto Caos, Fortunato, Bandiera del club, Tiro dalla distanza
        // sono definiti come Multi-Ruolo nella sezione PORTIERE/DIFENSORE

        'Cross': {
            name: 'Cross',
            icon: '🎯',
            role: 'C',
            color: 'text-cyan-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% passa direttamente a fase tiro',
            effect: '5% skip Fase 2, va a Fase 3 con 1d20+attaccante migliore',
            mechanics: 'In Fase 2, 5% di skip e usare 1d20+mod miglior attaccante',
            activation: '5%',
            example: 'Fase 2 inizia → 5% → Cross! 1d20+10(attaccante) = tiro diretto!',
            phase: 'Fase 2 (Attacco)',
            synergy: ['Bomber', 'Tiro dalla distanza']
        },
        
        'Mago del pallone': {
            name: 'Mago del pallone',
            icon: '🪄',
            role: 'C',
            color: 'text-purple-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: '5% ignora un centrocampista avversario',
            effect: '5% nullifica mod di 1 centrocampista avversario in Fase 1',
            mechanics: 'In costruzione, 5% di annullare random 1 centrocampista avversario',
            activation: '5%',
            example: 'Fase 1 → 5% → Centrocampista avversario mod = 0!',
            phase: 'Fase 1 (Costruzione)',
            synergy: ['Tocco Di Velluto', 'Regista']
        },

        'Passaggio Corto': {
            name: 'Passaggio Corto',
            icon: '➡️',
            role: 'C',
            color: 'text-green-500',
            rarity: 'Comune',
            type: 'Positiva',
            description: '+1 al risultato della squadra in Fase 1',
            effect: '+1 permanente al risultato totale in Fase Costruzione',
            mechanics: 'In Fase 1 (Costruzione), la squadra riceve +1 al risultato finale',
            activation: '100%',
            example: 'Risultato costruzione 18 → Con Passaggio Corto diventa 19!',
            phase: 'Fase 1 (Costruzione)',
            synergy: ['Tocco Di Velluto', 'Regista']
        },

        'Visione di Gioco': {
            name: 'Visione di Gioco',
            icon: '👁️',
            role: 'C',
            color: 'text-indigo-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: '5% di sostituire il mod di un alleato con il proprio se maggiore',
            effect: '5% in Fase 1 sostituisce mod alleato con il proprio (se maggiore)',
            mechanics: 'In Fase 1, 5% di sostituire il modificatore di un altro giocatore alleato con il proprio, se è maggiore',
            activation: '5%',
            example: 'Centrocampista A (mod +9) → 5% → Alleato con mod +5 diventa +9!',
            phase: 'Fase 1 (Costruzione)',
            synergy: ['Passaggio Corto', 'Tocco Di Velluto']
        },

        'Tuttocampista': {
            name: 'Tuttocampista',
            icon: '🌟',
            role: 'C',
            color: 'text-gold-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Conta come tutte e tre le tipologie contemporaneamente',
            effect: 'Impone sempre il malus -25% agli avversari diretti',
            mechanics: 'Il giocatore conta come Potenza, Tecnica e Velocità. Impone sempre il malus tipologia agli avversari',
            activation: '100% (passiva)',
            example: 'Avversario Potenza, Tecnica o Velocità → Subisce sempre -25% contro Tuttocampista!',
            phase: 'Tutte le fasi',
            synergy: ['Motore', 'Regista'],
            warning: 'Estremamente potente nel sistema sasso-carta-forbice!'
        },

        'Egoista': {
            name: 'Egoista',
            icon: '🤳',
            role: 'Multi',
            roles: ['C', 'A'],
            color: 'text-pink-700',
            rarity: 'Rara',
            type: 'Negativa',
            description: '5% di sottrarre il modificatore di un compagno di reparto',
            effect: '5% sottrae mod compagno invece di sommarlo',
            mechanics: 'Il giocatore vuole fare tutto da solo. 5% di sottrarre il mod di un compagno dello stesso ruolo',
            activation: '5%',
            example: 'Centrocampista A (Egoista) → 5% → Centrocampista B mod +6 diventa -6!',
            phase: 'Tutte le fasi',
            synergy: ['Nessuna (abilità negativa)'],
            warning: '⚠️ ABILITÀ NEGATIVA - Può danneggiare i compagni!'
        },

        'Tiro Potente': {
            name: 'Tiro Potente',
            icon: '💥',
            role: 'Multi',
            roles: ['D', 'C', 'A'],
            color: 'text-orange-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% di tirare 2d10 in Fase 3 e prendere il più alto',
            effect: '5% tira 2d10 invece di 1d10 in fase tiro e tiene il migliore',
            mechanics: 'In Fase 3 (Tiro vs Portiere), 5% di lanciare 2d10 e scegliere il risultato più alto',
            activation: '5%',
            example: 'Fase 3 → 5% Tiro Potente → Tiro 1: 4, Tiro 2: 9 → Usa 9!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Bomber', 'Cross', 'Tiro dalla distanza']
        },

        'Impreciso': {
            name: 'Impreciso',
            icon: '❌',
            role: 'C',
            color: 'text-red-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% sottrae invece di aggiungere in Fase 1',
            effect: '5% mod negativo in costruzione',
            mechanics: 'In Fase 1, 5% sottrae mod',
            activation: '5%',
            example: 'Mod +7 → 5% → -7',
            phase: 'Fase 1',
            synergy: ['Nessuna'],
            warning: '⚠️ NEGATIVA!'
        },
        
        'Ingabbiato': {
            name: 'Ingabbiato',
            icon: '🔒',
            role: 'C',
            color: 'text-gray-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% non aggiunge mod in Fase 1',
            effect: '5% mod = 0 in costruzione',
            mechanics: 'In Fase 1, 5% mod = 0',
            activation: '5%',
            example: 'Mod +7 → 5% → 0',
            phase: 'Fase 1',
            synergy: ['Nessuna'],
            warning: '⚠️ NEGATIVA!'
        },

        // Nota: Fuori Posizione è definita come Multi-Ruolo (D, C, A) nella sezione DIFENSORE

        // ========================================
        // ATTACCANTE (11 Abilità)
        // ========================================
        
        'Bomber': {
            name: 'Bomber',
            icon: '💣',
            role: 'A',
            color: 'text-red-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: '+1 al risultato in fase tiro',
            effect: '+1 permanente al risultato attacco in Fase 3',
            mechanics: 'In Fase 3, +1 al risultato finale',
            activation: '100%',
            example: 'Risultato attacco 15 → Con Bomber diventa 16!',
            phase: 'Fase 3 (Tiro)',
            synergy: ['Tiro dalla distanza', 'Cross', 'Tiro Fulmineo']
        },
        
        'Doppio Scatto': {
            name: 'Doppio Scatto',
            icon: '⚡⚡',
            role: 'A',
            color: 'text-yellow-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: '5% mette 2x il modificatore in Fase 2',
            effect: '5% raddoppia mod in attacco',
            mechanics: 'In Fase 2, 5% mod x2',
            activation: '5%',
            example: 'Attaccante mod +10 → 5% → +20!',
            phase: 'Fase 2 (Attacco)',
            synergy: ['Pivot', 'Fortunato']
        },
        
        'Pivot': {
            name: 'Pivot',
            icon: '🎯',
            role: 'A',
            color: 'text-orange-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Se unico attaccante, raddoppia mod',
            effect: 'Raddoppia mod se unico attaccante in formazione',
            mechanics: 'In Fase 2, se solo 1 attaccante, mod x2',
            activation: '100% (se unico)',
            example: 'Formazione 1-2-2-1, Attaccante mod +10 → Diventa +20!',
            phase: 'Fase 2 (Attacco)',
            synergy: ['Doppio Scatto (x4!)', 'Bomber']
        },

        // Nota: Effetto Caos, Fortunato, Bandiera del club sono definiti come Multi-Ruolo
        // nella sezione PORTIERE/DIFENSORE

        'Rientro Rapido': {
            name: 'Rientro Rapido',
            icon: '🔙',
            role: 'A',
            color: 'text-green-600',
            rarity: 'Rara',
            type: 'Positiva',
            description: '5% partecipa alla difesa in Fase 2',
            effect: '5% aiuta difesa con 1/2 mod',
            mechanics: 'In Fase 2 difesa, 5% aggiunge mod/2',
            activation: '5%',
            example: 'Attaccante mod +10 → 5% → Difesa riceve +5!',
            phase: 'Fase 2 (Difesa)',
            synergy: ['Muro', 'Guardia']
        },
        
        'Tiro Fulmineo': {
            name: 'Tiro Fulmineo',
            icon: '⚡',
            role: 'A',
            color: 'text-cyan-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% annulla abilità portiere',
            effect: '5% nullifica tutte le abilità portiere in Fase 3',
            mechanics: 'In Fase 3, 5% disattiva portiere',
            activation: '5%',
            example: 'Portiere con Kamikaze+Pugno di Ferro → 5% → Tutte disattivate!',
            phase: 'Fase 3 (Tiro)',
            synergy: ['Bomber', 'Cross']
        },

        'Opportunista': {
            name: 'Opportunista',
            icon: '🎰',
            role: 'A',
            color: 'text-green-500',
            rarity: 'Comune',
            type: 'Positiva',
            description: 'Se risultato Fase 3 è 0, probabilità goal diventa 75%',
            effect: 'Pareggio in Fase 3 diventa 75% goal invece di 50%',
            mechanics: 'Se il risultato Tiro vs Portiere è esattamente 0 (50/50), la probabilità di goal diventa 75%',
            activation: '100% (condizionale)',
            example: 'Tiro 15 vs Portiere 15 → Differenza 0 → Normalmente 50%, con Opportunista 75% goal!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Bomber', 'Tiro Fulmineo']
        },

        'Tiro a Giro': {
            name: 'Tiro a Giro',
            icon: '🌀',
            role: 'A',
            color: 'text-purple-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: '5% di ignorare un difensore avversario in Fase 2',
            effect: '5% ignora il mod di un difensore avversario',
            mechanics: 'In Fase 2, 5% di annullare il contributo di un difensore avversario, facilitando l\'arrivo alla Fase 3',
            activation: '5%',
            example: 'Fase 2 → 5% Tiro a Giro → Difensore avversario mod +8 diventa 0!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Doppio Scatto', 'Pivot']
        },

        'Immarcabile': {
            name: 'Immarcabile',
            icon: '💨',
            role: 'A',
            color: 'text-gold-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% di tirare 2d20 in Fase 2 e scegliere il migliore',
            effect: '5% tira 2d20 in attacco e tiene il risultato migliore',
            mechanics: 'In Fase 2, 5% di lanciare 2d20 e scegliere il risultato più alto',
            activation: '5%',
            example: 'Fase 2 → 5% Immarcabile → Tiro 1: 8, Tiro 2: 17 → Usa 17!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Doppio Scatto', 'Pivot', 'Bomber']
        },

        'Piedi a banana': {
            name: 'Piedi a banana',
            icon: '🍌',
            role: 'A',
            color: 'text-yellow-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% sottrae mod in Fase 2',
            effect: '5% mod negativo',
            mechanics: 'In attacco, 5% sottrae',
            activation: '5%',
            example: 'Mod +10 → 5% → -10',
            phase: 'Fase 2',
            synergy: ['Nessuna'],
            warning: '⚠️ NEGATIVA!'
        },
        
        'Eccesso di sicurezza': {
            name: 'Eccesso di sicurezza',
            icon: '😎',
            role: 'A',
            color: 'text-gray-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '5% non aggiunge mod in Fase 2',
            effect: '5% mod = 0',
            mechanics: 'In attacco, 5% mod = 0',
            activation: '5%',
            example: 'Mod +10 → 5% → 0',
            phase: 'Fase 2',
            synergy: ['Nessuna'],
            warning: '⚠️ NEGATIVA!'
        },

        'Titubanza': {
            name: 'Titubanza',
            icon: '😨',
            role: 'A',
            color: 'text-gray-600',
            rarity: 'Comune',
            type: 'Negativa',
            description: 'In attacco, il dado del tiro diventa 1d6 invece di 1d10',
            effect: 'In Fase 3, la squadra usa 1d6 invece di 1d10 per il tiro',
            mechanics: 'In Fase 3 (Tiro vs Portiere), quando l\'attaccante con Titubanza tira, la squadra usa 1d6 invece di 1d10',
            activation: '100% (passiva)',
            example: 'Fase 3 → Titubanza → Tiro con 1d6+mod invece di 1d10+mod!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Nessuna (abilità negativa)'],
            warning: '⚠️ ABILITÀ NEGATIVA - Riduce drasticamente il potenziale di tiro!'
        },

        // Nota: Fuori Posizione è definita come Multi-Ruolo (D, C, A) nella sezione DIFENSORE

        // ========================================
        // ABILITÀ SPECIALE - ICONA (1)
        // ========================================
        
        'Icona': {
            name: 'Icona',
            icon: '👑',
            role: 'Tutti',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Leggendaria',
            description: 'L\'Icona della squadra - Bonus speciali',
            effect: '+1 a TUTTI i compagni, +1 a sé stesso, forma mai negativa',
            mechanics: 'Tutti i giocatori ricevono +1 mod. L\'Icona riceve +1 aggiuntivo (totale +2). La forma dell\'Icona non può mai essere < 0',
            activation: '100% (passiva)',
            example: 'Squadra con Icona: Tutti +1! Icona stessa +2! Icona con forma -2 → diventa 0',
            phase: 'Tutte le fasi',
            synergy: ['TUTTE (potenzia l\'intera squadra)'],
            warning: '⚠️ Solo 1 Icona per squadra!',
            special: 'Questa è l\'abilità più potente del gioco!'
        }
    },
    
    /**
     * Ottiene lista abilità per ruolo (include Multi-Ruolo)
     */
    getAbilitiesByRole(role) {
        return Object.values(this.abilities).filter(a => {
            if (a.role === role || a.role === 'Tutti') return true;
            if (a.role === 'Multi' && a.roles && a.roles.includes(role)) return true;
            return false;
        });
    },

    /**
     * Verifica se un'abilità è multi-ruolo
     */
    isMultiRole(ability) {
        return ability.role === 'Multi' && ability.roles && ability.roles.length > 1;
    },

    /**
     * Ottiene le abilità multi-ruolo
     */
    getMultiRoleAbilities() {
        return Object.values(this.abilities).filter(a => this.isMultiRole(a));
    },

    /**
     * Ottiene le abilità specifiche per un solo ruolo
     */
    getSingleRoleAbilities(role) {
        return Object.values(this.abilities).filter(a => a.role === role);
    },

    /**
     * Ottiene abilità per nome
     */
    getAbility(name) {
        return this.abilities[name] || null;
    },

    /**
     * Ottiene tutte le abilità positive
     */
    getPositiveAbilities() {
        return Object.values(this.abilities).filter(a => a.type === 'Positiva' || a.type === 'Leggendaria' || a.type === 'Epica');
    },

    /**
     * Ottiene tutte le abilità negative
     */
    getNegativeAbilities() {
        return Object.values(this.abilities).filter(a => a.type === 'Negativa');
    },

    /**
     * Ottiene statistiche abilità (per UI)
     */
    getAbilityStats() {
        const all = Object.values(this.abilities);

        // Conta abilità per ruolo considerando Multi-Ruolo
        const countByRole = (role) => {
            return all.filter(a => {
                if (a.role === role) return true;
                if (a.role === 'Multi' && a.roles && a.roles.includes(role)) return true;
                return false;
            }).length;
        };

        const stats = {
            total: all.length,
            byRole: {
                P: countByRole('P'),
                D: countByRole('D'),
                C: countByRole('C'),
                A: countByRole('A'),
                Tutti: all.filter(a => a.role === 'Tutti').length,
                Multi: all.filter(a => a.role === 'Multi').length
            },
            byRarity: {
                Comune: all.filter(a => a.rarity === 'Comune').length,
                Rara: all.filter(a => a.rarity === 'Rara').length,
                Epica: all.filter(a => a.rarity === 'Epica').length,
                Leggendaria: all.filter(a => a.rarity === 'Leggendaria').length,
                Unica: all.filter(a => a.rarity === 'Unica').length
            },
            byType: {
                Positiva: all.filter(a => a.type === 'Positiva').length,
                Negativa: all.filter(a => a.type === 'Negativa').length,
                Leggendaria: all.filter(a => a.type === 'Leggendaria').length,
                Epica: all.filter(a => a.type === 'Epica').length
            }
        };

        return stats;
    }
};

console.log('✅ Enciclopedia Abilità V3.1 caricata - 65 abilità complete!');
