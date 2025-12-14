//
// ====================================================================
// ABILITIES-ENCYCLOPEDIA.JS - Enciclopedia Abilità Completa V4.0
// ====================================================================
// Aggiornato con le nuove abilità v4.0 - Sistema tipologia ±1.5/±3
//

window.AbilitiesEncyclopedia = {
    
    /**
     * Database completo abilità - AGGIORNATO V2.0
     */
    abilities: {
        
        // ========================================
        // PORTIERE (11 Abilità)
        // ========================================
        
        'Parata di pugno': {
            name: 'Parata di pugno',
            icon: '🥊',
            role: 'P',
            color: 'text-red-500',
            rarity: 'Comune',
            type: 'Positiva',
            description: 'Se il risultato della fase tiro vs portiere e -1 o -2, si comporta come se fosse 0',
            effect: 'Risultato -1 o -2 in Fase 3 diventa 0 (50% parata)',
            mechanics: 'Quando il portiere perde con differenza di -1 o -2, il risultato viene considerato come 0, dando comunque una chance di parata del 50%',
            activation: '100% (Passiva)',
            example: 'Tiro: 18 vs Parata: 16 → Differenza -2 → Normalmente GOAL, con Parata di pugno diventa 50% parata!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Uscita Kamikaze', 'Parata con i piedi', 'Colpo d\'anca']
        },

        'Responta': {
            name: 'Responta',
            icon: '🔄',
            role: 'P',
            color: 'text-blue-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: '10% di far ritirare il d20 all\'avversario se il portiere e stato battuto',
            effect: '10% ritira dado attacco in Fase 3, tiene obbligatoriamente il secondo risultato',
            mechanics: 'Se il portiere viene battuto in Fase 3, ha il 10% di probabilita di far ritirare il d20 all\'attaccante, che deve obbligatoriamente usare il secondo risultato',
            activation: '10% (solo se battuto)',
            example: 'Tiro 18 vs Portiere 15 → GOAL! → 10% Responta → Attaccante ritira → Tiro 8 → PARATA!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Parata di pugno', 'Miracolo', 'Colpo d\'anca']
        },

        'Colpo d\'anca': {
            name: 'Colpo d\'anca',
            icon: '🦵',
            role: 'P',
            color: 'text-amber-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Quando il risultato e 0, la possibilita di parare diventa 75%. Annulla il 5% di successo automatico avversario',
            effect: 'Su risultato 0: 75% parata invece di 50%. Annulla auto-goal del 5%',
            mechanics: 'Se la differenza tra Tiro e Portiere e esattamente 0, la probabilita di parata sale dal 50% al 75%. Inoltre, annulla la regola del 5% di successo automatico dell\'attaccante',
            activation: '100% (condizionale)',
            example: 'Tiro 15 vs Portiere 15 → Differenza 0 → Normalmente 50%, con Colpo d\'anca 75% parata!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Parata di pugno', 'Responta', 'Miracolo']
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
            description: '10% di partecipare alle fasi 1 o 2 in difesa se il suo mod e maggiore del giocatore scelto',
            effect: '10% di partecipare alle fasi 1/2 (solo difesa), max 5 volte per partita',
            mechanics: 'In Fase 1 o 2, se il portiere ha un modificatore maggiore del giocatore difensivo scelto, ha il 10% di probabilita di sostituirlo. Massimo 5 attivazioni per partita',
            activation: '10% (condizionale, max 5x)',
            example: 'Fase 1 difesa → Difensore mod +4 → Portiere mod +8 → 10% → Teletrasporto! Usa +8 invece di +4!',
            phase: 'Fase 1 (Costruzione) e Fase 2 (Attacco) - solo difesa',
            synergy: ['Icona (+1 mod)', 'Fortunato', 'Freddezza']
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
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '5% di probabilita di dimezzare il valore del tiro durante la Fase 3',
            effect: '5% il tiro avversario viene dimezzato in Fase 3',
            mechanics: 'In fase tiro, 5% di probabilita che il risultato del dado dell\'attacco venga dimezzato (arrotondato per difetto)',
            activation: '5%',
            example: 'Fase 3 → 5% Muro Psicologico → Attacco tira 16 → Diventa 8!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Parata di pugno', 'Parata con i piedi', 'Miracolo']
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
            description: '5% che l\'avversario usi 1d12 invece di 1d20 in Fase 3',
            effect: '5% l\'attacco tira 1d12 invece di 1d20 in fase tiro',
            mechanics: 'In Fase 3, 5% di probabilita che la squadra avversaria usi 1d12 invece di 1d20 per il tiro',
            activation: '5%',
            example: 'Fase 3 → 5% Sguardo Intimidatorio → Attacco tira 1d12+mod invece di 1d20+mod!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Parata di pugno', 'Muro Psicologico', 'Parata con i piedi']
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
        // ABILITÀ MULTI-RUOLO AGGIUNTIVE
        // ========================================

        'Indistruttibile': {
            name: 'Indistruttibile',
            icon: '🛡️',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-emerald-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Il giocatore non puo essere infortunato',
            effect: 'Immunita completa agli infortuni',
            mechanics: 'Il giocatore e immune al sistema infortuni. Non puo mai subire infortuni a fine partita o durante la simulazione',
            activation: '100% (passiva)',
            example: 'Fine partita → Roll infortunio → Indistruttibile attivo → Nessun infortunio possibile!',
            phase: 'Post-partita / Durante simulazione',
            synergy: ['Freddezza', 'Icona']
        },

        'Multiruolo': {
            name: 'Multiruolo',
            icon: '🔀',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-violet-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Quando gioca fuori ruolo, il livello non subisce modifiche',
            effect: 'Ignora il malus da fuori ruolo',
            mechanics: 'Quando il giocatore viene schierato in un ruolo diverso dal suo, non subisce il normale malus al livello. Mantiene il suo modificatore pieno',
            activation: '100% (passiva)',
            example: 'Difensore schierato come Centrocampista → Normalmente malus, con Multiruolo nessun malus!',
            phase: 'Tutte le fasi',
            synergy: ['Adattabile', 'Tuttocampista'],
            warning: 'Utilissimo per formazioni flessibili!'
        },

        'Fragile': {
            name: 'Fragile',
            icon: '🩹',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-red-600',
            rarity: 'Comune',
            type: 'Negativa',
            description: 'Raddoppia la possibilita di infortunio a fine partita',
            effect: 'Probabilita infortunio x2 (da 1% a 2%)',
            mechanics: 'A fine partita, la probabilita che questo giocatore si infortuni e raddoppiata rispetto al normale',
            activation: '100% (passiva)',
            example: 'Fine partita → Normalmente 1% infortunio → Con Fragile diventa 2%!',
            phase: 'Post-partita',
            synergy: ['Nessuna (abilita negativa)'],
            warning: '⚠️ ABILITA NEGATIVA - Aumenta il rischio di infortuni!'
        },

        'Non Adattabile': {
            name: 'Non Adattabile',
            icon: '🚫',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-gray-600',
            rarity: 'Comune',
            type: 'Negativa',
            description: 'Modificatore -2 permanente. Malus fuori ruolo raddoppiato',
            effect: '-2 al modificatore base. Quando gioca fuori ruolo il malus ai livelli raddoppia',
            mechanics: 'Il giocatore ha sempre un malus di -2 al suo modificatore. Se schierato fuori ruolo, il malus normale e raddoppiato',
            activation: '100% (passiva)',
            example: 'Giocatore lv10 (mod 5.5) → Con Non Adattabile: mod 3.5 | Fuori ruolo: malus x2!',
            phase: 'Tutte le fasi',
            synergy: ['Nessuna (abilita negativa)'],
            warning: '⚠️ ABILITA NEGATIVA - Penalizza costantemente il giocatore!'
        },

        'Ripresa rapida': {
            name: 'Ripresa rapida',
            icon: '💊',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-green-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Tempo di guarigione dimezzato, costo cura 75%',
            effect: 'Infortuni guariscono in meta tempo, costo CS ridotto al 75%',
            mechanics: 'Il tempo di guarigione dagli infortuni e dimezzato (arrotondato per eccesso). Il costo per curare l\'infortunio in CS e il 75% del valore originale',
            activation: '100% (passiva)',
            example: 'Infortunio 4 turni → Con Ripresa rapida: 2 turni! Cura 100 CS → 75 CS!',
            phase: 'Post-partita / Infermeria',
            synergy: ['Indistruttibile (opposto)', 'Freddezza']
        },

        'Forma Smagliante': {
            name: 'Forma Smagliante',
            icon: '✨',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-yellow-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Se la forma e negativa a inizio partita, diventa +1',
            effect: 'Forma negativa → +1 a inizio simulazione',
            mechanics: 'Quando la partita inizia, se il modificatore forma del giocatore e in negativo, viene automaticamente portato a +1',
            activation: '100% (a inizio partita)',
            example: 'Forma -2 → Partita inizia → Con Forma Smagliante diventa +1!',
            phase: 'Inizio partita',
            synergy: ['Freddezza', 'Icona']
        },

        'Raddoppio in difesa': {
            name: 'Raddoppio in difesa',
            icon: '🛡️',
            role: 'Multi',
            roles: ['D', 'C', 'A'],
            color: 'text-blue-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '5% di aggiungere il proprio modificatore a quello del giocatore scelto per la fase (solo in difesa)',
            effect: '5% raddoppia il contributo difensivo aggiungendo il proprio mod',
            mechanics: 'In qualsiasi fase difensiva, 5% di probabilita di aggiungere il proprio modificatore a quello del giocatore principale scelto per quella fase',
            activation: '5% (solo in difesa)',
            example: 'Fase 2 difesa → Difensore A scelto (mod +8) → 5% → Raddoppio da B (mod +6) → Totale +14!',
            phase: 'Tutte le fasi (solo in difesa)',
            synergy: ['Muro', 'Guardia', 'Deviazione']
        },

        'Raddoppio in attacco': {
            name: 'Raddoppio in attacco',
            icon: '⚔️',
            role: 'Multi',
            roles: ['D', 'C', 'A'],
            color: 'text-red-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '5% di aggiungere il proprio modificatore a quello del giocatore scelto per la fase (solo in attacco)',
            effect: '5% raddoppia il contributo offensivo aggiungendo il proprio mod',
            mechanics: 'In qualsiasi fase offensiva, 5% di probabilita di aggiungere il proprio modificatore a quello del giocatore principale scelto per quella fase',
            activation: '5% (solo in attacco)',
            example: 'Fase 2 attacco → Attaccante A scelto (mod +10) → 5% → Raddoppio da C (mod +7) → Totale +17!',
            phase: 'Tutte le fasi (solo in attacco)',
            synergy: ['Doppio Scatto', 'Pivot', 'Cross']
        },

        // ========================================
        // NUOVE ABILITÀ V4.0 - GENERALI
        // ========================================

        'Cuore Impavido': {
            name: 'Cuore Impavido',
            icon: '💪',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-red-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Se la squadra gioca Fuori Casa, il giocatore ottiene +1.5 al modificatore',
            effect: '+1.5 mod quando si gioca fuori casa (senza bonus stadio)',
            mechanics: 'Se la squadra non beneficia del Bonus Stadio (gioca in trasferta), questo giocatore riceve un bonus fisso di +1.5 al modificatore',
            activation: '100% (condizionale)',
            example: 'Partita fuori casa → Cuore Impavido attivo → +1.5 al modificatore!',
            phase: 'Tutte le fasi',
            synergy: ['Freddezza', 'Icona']
        },

        'Uomo Spogliatoio': {
            name: 'Uomo Spogliatoio',
            icon: '🤝',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-blue-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Dalla panchina, riduce il Malus Forma di tutti i titolari di 1',
            effect: 'Se in panchina: malus forma titolari ridotto di 1 (es. -2 diventa -1)',
            mechanics: 'Se questo giocatore è in panchina, il malus derivante dalla forma fisica negativa di tutti i titolari viene ridotto di 1 punto',
            activation: '100% (se in panchina)',
            example: 'Titolare con forma -3 → Con Uomo Spogliatoio in panchina → forma -2!',
            phase: 'Pre-partita',
            synergy: ['Freddezza', 'Forma Smagliante']
        },

        'Rivalsa': {
            name: 'Rivalsa',
            icon: '🔥',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-orange-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Se in svantaggio di 2+ goal, ottiene +2 al modificatore',
            effect: '+2 mod quando la squadra perde di 2 o più goal',
            mechanics: 'Se la propria squadra è in svantaggio di 2 o più goal, il giocatore ottiene +2 al modificatore in tutte le fasi',
            activation: '100% (condizionale)',
            example: 'Risultato 0-2 → Rivalsa attivo → +2 al modificatore!',
            phase: 'Tutte le fasi',
            synergy: ['Bomber', 'Doppio Scatto']
        },

        'Talismano': {
            name: 'Talismano',
            icon: '🍀',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-green-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'La probabilità di infortunio della squadra scende dallo 1% allo 0.5%',
            effect: 'Dimezza la probabilità di infortunio di fine partita per la squadra',
            mechanics: 'Se il giocatore è in campo, la probabilità di infortunio di fine partita per tutta la squadra scende dall\'1% allo 0.5%',
            activation: '100% (passiva)',
            example: 'Fine partita → Probabilità infortunio 0.5% invece di 1%!',
            phase: 'Post-partita',
            synergy: ['Indistruttibile', 'Ripresa rapida']
        },

        'Camaleonte': {
            name: 'Camaleonte',
            icon: '🦎',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-green-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Inverte l\'esito della Tipologia Giocatori (malus diventa bonus e viceversa)',
            effect: 'Se avrebbe -1.5, ottiene +1.5. Se avrebbe +1.5, subisce -1.5',
            mechanics: 'L\'esito del sistema sasso-carta-forbice viene invertito per questo giocatore. Se perderebbe il confronto, lo vince invece, e viceversa',
            activation: '100% (passiva)',
            example: 'Potenza vs Velocità → Normalmente -1.5 → Con Camaleonte +1.5!',
            phase: 'Tutte le fasi',
            synergy: ['Adattabile', 'Tuttocampista']
        },

        'Specialista Difesa': {
            name: 'Specialista Difesa',
            icon: '🛡️',
            role: 'Multi',
            roles: ['D', 'C', 'A'],
            color: 'text-blue-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '+1 in Fase 2 difesa, -0.5 nelle altre fasi',
            effect: 'Bonus +1 in Fase 2 (difesa), malus -0.5 in altre fasi',
            mechanics: 'Il giocatore ottiene +1 fisso al modificatore quando partecipa alla Fase 2 in difesa, ma -0.5 nelle altre fasi',
            activation: '100% (passiva)',
            example: 'Fase 2 difesa → +1 mod! Fase 1 o Fase 3 → -0.5 mod',
            phase: 'Tutte le fasi',
            synergy: ['Muro', 'Guardia']
        },

        'Specialista Costruzione': {
            name: 'Specialista Costruzione',
            icon: '⚙️',
            role: 'Multi',
            roles: ['D', 'C', 'A'],
            color: 'text-cyan-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '+1 in Fase 1, -0.5 nelle altre fasi',
            effect: 'Bonus +1 in Fase 1 (costruzione), malus -0.5 in altre fasi',
            mechanics: 'Il giocatore ottiene +1 fisso al modificatore quando partecipa alla Fase 1, ma -0.5 nelle altre fasi',
            activation: '100% (passiva)',
            example: 'Fase 1 → +1 mod! Fase 2 o Fase 3 → -0.5 mod',
            phase: 'Tutte le fasi',
            synergy: ['Regista', 'Tocco Di Velluto']
        },

        'Specialista Tiro': {
            name: 'Specialista Tiro',
            icon: '🎯',
            role: 'Multi',
            roles: ['D', 'C', 'A'],
            color: 'text-red-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '+1 in Fase 3, -0.5 nelle altre fasi',
            effect: 'Bonus +1 in Fase 3 (tiro), malus -0.5 in altre fasi',
            mechanics: 'Il giocatore ottiene +1 fisso al modificatore quando partecipa alla Fase 3, ma -0.5 nelle altre fasi',
            activation: '100% (passiva)',
            example: 'Fase 3 → +1 mod! Fase 1 o Fase 2 → -0.5 mod',
            phase: 'Tutte le fasi',
            synergy: ['Bomber', 'Tiro Fulmineo']
        },

        'Veterano': {
            name: 'Veterano',
            icon: '🎖️',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-amber-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Nelle ultime 5 occasioni (35-40), ottiene +1.5 al modificatore',
            effect: '+1.5 mod nelle occasioni dalla 35 alla 40',
            mechanics: 'Durante le ultime 5 occasioni della partita (dalla 35 alla 40), il giocatore aggiunge +1.5 al suo modificatore',
            activation: '100% (ultime 5 occasioni)',
            example: 'Occasione 36 → Veterano attivo → +1.5 mod!',
            phase: 'Tutte le fasi (occasioni 35-40)',
            synergy: ['Icona', 'Freddezza']
        },

        'Talento Precoce': {
            name: 'Talento Precoce',
            icon: '⭐',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-yellow-500',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '+1.5 fisso al modificatore, ma livello massimo 18',
            effect: 'Bonus permanente +1.5, cap livello a 18',
            mechanics: 'Aggiunge un bonus fisso di +1.5 al modificatore base, simulando un potenziale maggiore del livello attuale. Il livello massimo del giocatore scende a 18',
            activation: '100% (passiva)',
            example: 'Giocatore Lv10 (mod 2.5) → Con Talento Precoce: 2.5+1.5 = 4.0!',
            phase: 'Tutte le fasi',
            synergy: ['Icona', 'Fortunato'],
            warning: 'Il livello massimo è ridotto a 18!'
        },

        'Jolly Tattico': {
            name: 'Jolly Tattico',
            icon: '🃏',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-purple-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'A inizio partita può cambiare la sua Tipologia per tutto il match',
            effect: 'Scelta tipologia a inizio partita (definitiva)',
            mechanics: 'A inizio partita, il giocatore può scegliere di cambiare la sua Tipologia (Potenza/Tecnica/Velocità) per adattarsi agli avversari. La scelta è definitiva per tutto il match',
            activation: '100% (a inizio partita)',
            example: 'Avversario pieno di Tecnica → Jolly sceglie Potenza → +1.5 su tutti!',
            phase: 'Pre-partita',
            synergy: ['Camaleonte', 'Tuttocampista']
        },

        // ========================================
        // NUOVE ABILITÀ V4.0 - NEGATIVE GENERALI
        // ========================================

        'Meteoropatico': {
            name: 'Meteoropatico',
            icon: '🌧️',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-gray-600',
            rarity: 'Comune',
            type: 'Negativa',
            description: 'Se gioca Fuori Casa, subisce -1 a tutti i modificatori',
            effect: '-1 mod quando si gioca fuori casa',
            mechanics: 'Se la squadra gioca Fuori Casa (senza Bonus Stadio), il giocatore subisce -1 a tutti i modificatori',
            activation: '100% (condizionale)',
            example: 'Partita fuori casa → -1 al modificatore!',
            phase: 'Tutte le fasi',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA!'
        },

        'Scaramantico': {
            name: 'Scaramantico',
            icon: '🪬',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-purple-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: 'Nelle occasioni 13-17, il modificatore diventa automaticamente 0',
            effect: 'Mod = 0 nelle occasioni dalla 13 alla 17',
            mechanics: 'Nelle occasioni dalla 13 alla 17, se partecipa, il suo modificatore diventa automaticamente 0',
            activation: '100% (occasioni 13-17)',
            example: 'Occasione 15 → Modificatore = 0!',
            phase: 'Tutte le fasi (occasioni 13-17)',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA!'
        },

        'Prevedibile': {
            name: 'Prevedibile',
            icon: '📖',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-orange-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: 'Il malus da tipologia è -2.5 invece di -1.5',
            effect: 'Malus sasso-carta-forbice aumentato a -2.5',
            mechanics: 'Quando perde il confronto Tipologia dei Giocatori (sasso-carta-forbice), il malus applicato è -2.5 invece che il normale -1.5',
            activation: '100% (passiva)',
            example: 'Potenza vs Velocità → Normalmente -1.5 → Con Prevedibile -2.5!',
            phase: 'Tutte le fasi',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA!'
        },

        'Sudditanza Psicologica': {
            name: 'Sudditanza Psicologica',
            icon: '😰',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-red-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '-1 se allenatore avversario è superiore, -0.5 se pari/inferiore',
            effect: 'Malus basato sul confronto livello allenatori',
            mechanics: 'Se la squadra avversaria ha un Livello Allenatore superiore, subisce -1 al modificatore per tutta la partita. Se pari o inferiore, il malus è -0.5',
            activation: '100% (passiva)',
            example: 'Allenatore avversario Lv15 vs Lv10 → -1 mod per tutta la partita!',
            phase: 'Tutte le fasi',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA!'
        },

        'Demotivato': {
            name: 'Demotivato',
            icon: '😞',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-gray-700',
            rarity: 'Comune',
            type: 'Negativa',
            description: '-1 se la squadra è in svantaggio',
            effect: '-1 mod quando si perde (anche di 1 solo goal)',
            mechanics: 'Se la propria squadra sta perdendo (svantaggio di 1 o più goal), subisce -1 a tutte le fasi finché il risultato non torna in parità o vantaggio',
            activation: '100% (condizionale)',
            example: 'Risultato 0-1 → -1 al modificatore!',
            phase: 'Tutte le fasi',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA!'
        },

        'Contrattura Cronica': {
            name: 'Contrattura Cronica',
            icon: '🦵',
            role: 'Multi',
            roles: ['P', 'D', 'C', 'A'],
            color: 'text-red-800',
            rarity: 'Comune',
            type: 'Negativa',
            description: 'Dopo 15 occasioni, il modificatore viene dimezzato',
            effect: 'Mod /2 dalla 16esima occasione in poi',
            mechanics: 'Se partecipa a più di 15 occasioni, dalla 16esima in poi il suo modificatore viene dimezzato per la fatica',
            activation: '100% (dopo occ. 15)',
            example: 'Occasione 20 → Mod +8 diventa +4!',
            phase: 'Tutte le fasi (da occ. 16)',
            synergy: ['Nessuna (negativa)'],
            warning: '⚠️ NEGATIVA!'
        },

        // ========================================
        // NUOVE ABILITÀ V4.0 - PORTIERE
        // ========================================

        'Guerriero': {
            name: 'Guerriero',
            icon: '⚔️',
            role: 'P',
            color: 'text-red-600',
            rarity: 'Comune',
            type: 'Positiva',
            description: 'Quando subisce un goal, ottiene +1 per le prossime 3 occasioni',
            effect: '+1 mod per 3 occasioni dopo aver subito goal',
            mechanics: 'Quando subisce un goal, ottiene +1 al modificatore per le prossime 3 occasioni in cui è chiamato in causa',
            activation: '100% (dopo goal subito)',
            example: 'Subisce goal → +1 mod per 3 occasioni!',
            phase: 'Fase 3 (post-goal)',
            synergy: ['Parata di pugno', 'Miracolo']
        },

        'Presenza': {
            name: 'Presenza',
            icon: '👤',
            role: 'P',
            color: 'text-purple-600',
            rarity: 'Comune',
            type: 'Positiva',
            description: 'Riduce di -1 il Bonus Allenatore avversario in Fase 3',
            effect: '-1 al bonus allenatore avversario quando tira',
            mechanics: 'Riduce di -1 il Bonus Allenatore della squadra avversaria durante la Fase 3',
            activation: '100% (passiva)',
            example: 'Allenatore avversario +3 → Con Presenza diventa +2!',
            phase: 'Fase 3',
            synergy: ['Parata di pugno', 'Muro Psicologico']
        },

        'Rilancio Laser': {
            name: 'Rilancio Laser',
            icon: '🚀',
            role: 'P',
            color: 'text-cyan-600',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Dopo una parata, la squadra ottiene +2 alla Fase 1 successiva',
            effect: '+2 alla Fase 1 successiva dopo una parata',
            mechanics: 'Se il portiere effettua una parata, la sua squadra ottiene un bonus di +2 al modificatore nella Fase 1 successiva',
            activation: '100% (dopo parata)',
            example: 'Parata! → Prossima Fase 1: +2 bonus!',
            phase: 'Fase 1 (post-parata)',
            synergy: ['Presa Sicura', 'Regista']
        },

        'Saracinesca': {
            name: 'Saracinesca',
            icon: '🚧',
            role: 'P',
            color: 'text-gray-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Se subisce goal, il critico avversario scende allo 0% per il resto della partita',
            effect: 'Dopo goal subito: critico avversario = 0%',
            mechanics: 'Se subisce un Goal, la probabilità che l\'avversario faccia un Successo Critico (Goal su parata) scende allo 0% per il resto della partita',
            activation: '100% (dopo goal subito)',
            example: 'Subisce goal → Critico avversario 0% per sempre!',
            phase: 'Fase 3',
            synergy: ['Miracolo', 'Parata di pugno']
        },

        'Gatto': {
            name: 'Gatto',
            icon: '🐱',
            role: 'P',
            color: 'text-orange-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Se la differenza è esattamente -1, il goal viene annullato (parata)',
            effect: 'Differenza -1 = parata invece di goal',
            mechanics: 'Se il portiere subisce un Goal ma la differenza è esattamente -1, il goal viene annullato e considerato parata',
            activation: '100% (condizionale)',
            example: 'Tiro 16 vs Parata 15 → Diff -1 → Con Gatto: PARATA!',
            phase: 'Fase 3',
            synergy: ['Parata di pugno', 'Miracolo']
        },

        'Regista Difensivo': {
            name: 'Regista Difensivo',
            icon: '🎬',
            role: 'P',
            color: 'text-gold-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Dopo parata, la squadra salta la Fase 1 e inizia dalla Fase 2 con +2',
            effect: 'Parata → Skip Fase 1, Fase 2 con +2',
            mechanics: 'Se effettua una parata, la squadra salta la Fase 1 dell\'azione successiva e inizia direttamente dalla Fase 2 (Attacco vs Difesa) con un bonus di +2',
            activation: '100% (dopo parata)',
            example: 'Parata! → Prossima azione: Skip Fase 1, +2 in Fase 2!',
            phase: 'Fase 2 (post-parata)',
            synergy: ['Rilancio Laser', 'Presa Sicura']
        },

        // ========================================
        // NUOVE ABILITÀ V4.0 - DIFENSORE
        // ========================================

        'Spallata': {
            name: 'Spallata',
            icon: '💪',
            role: 'D',
            color: 'text-orange-600',
            rarity: 'Comune',
            type: 'Positiva',
            description: 'Contro Tecnica, bonus tipologia aumentato a +2.5 (invece di +1.5)',
            effect: '+2.5 invece di +1.5 vs Tecnica',
            mechanics: 'Se partecipa alla Fase 2 contro un attaccante di tipologia Tecnica, aggiunge +1 extra al bonus di tipologia (totale +2.5 invece di +1.5)',
            activation: '100% (vs Tecnica)',
            example: 'Vs Attaccante Tecnica → +2.5 invece di +1.5!',
            phase: 'Fase 2',
            synergy: ['Muro', 'Guardia']
        },

        'Blocco Fisico': {
            name: 'Blocco Fisico',
            icon: '🧱',
            role: 'D',
            color: 'text-blue-600',
            rarity: 'Comune',
            type: 'Positiva',
            description: '+1 in Fase 2 contro attaccanti di tipologia Velocità',
            effect: '+1 mod vs Velocità in Fase 2',
            mechanics: 'Quando partecipa alla Fase 2 contro un attaccante di tipologia Velocità, il difensore ottiene +1 al modificatore',
            activation: '100% (vs Velocità)',
            example: 'Vs Attaccante Velocità → +1 mod!',
            phase: 'Fase 2',
            synergy: ['Muro', 'Spallata']
        },

        'Anticipo Secco': {
            name: 'Anticipo Secco',
            icon: '⚡',
            role: 'D',
            color: 'text-yellow-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Se vince Fase 2, la squadra salta Fase 1 nell\'azione successiva',
            effect: 'Vittoria Fase 2 → Skip Fase 1 prossima azione',
            mechanics: 'Se vince la Fase 2 (Attacco vs Difesa), la sua squadra salta la Fase 1 nell\'azione successiva e parte direttamente dalla Fase 2 in attacco',
            activation: '100% (se vince Fase 2)',
            example: 'Vince Fase 2 → Prossima azione: Skip Fase 1!',
            phase: 'Fase 2 → Fase 1 successiva',
            synergy: ['Muro', 'Antifurto']
        },

        'Intercetto': {
            name: 'Intercetto',
            icon: '🤚',
            role: 'D',
            color: 'text-green-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '5% di vincere automaticamente la Fase 2 se avversario è Centrocampista',
            effect: '5% auto-vittoria Fase 2 vs Centrocampista',
            mechanics: '5% di probabilità di vincere automaticamente la Fase 2 senza tirare i dadi se l\'avversario è un Centrocampista',
            activation: '5% (vs Centrocampista)',
            example: 'Vs Centrocampista → 5% → Fase 2 vinta automaticamente!',
            phase: 'Fase 2',
            synergy: ['Antifurto', 'Muro']
        },

        'Muro di Gomma': {
            name: 'Muro di Gomma',
            icon: '🏐',
            role: 'D',
            color: 'text-purple-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Se perde Fase 2, sottrae comunque 3 punti al Valore Tiro avversario',
            effect: 'Sconfitta Fase 2 → -3 al Valore Tiro avversario',
            mechanics: 'Se il difensore perde il confronto in Fase 2, sottrae comunque 3 punti al Valore Tiro dell\'attaccante che passa alla Fase 3',
            activation: '100% (se perde Fase 2)',
            example: 'Perde Fase 2 → Valore Tiro avversario -3!',
            phase: 'Fase 2 → Fase 3',
            synergy: ['Muro', 'Deviazione']
        },

        'Mastino': {
            name: 'Mastino',
            icon: '🐕',
            role: 'D',
            color: 'text-amber-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Copia il bonus abilità dell\'avversario in Fase 2',
            effect: 'Copia bonus abilità avversario',
            mechanics: 'Se l\'avversario in Fase 2 ottiene un bonus da un\'abilità, il difensore ottiene lo stesso identico bonus al proprio modificatore',
            activation: '100% (se avversario ha bonus)',
            example: 'Avversario attiva Doppio Scatto (+3) → Mastino ottiene +3!',
            phase: 'Fase 2',
            synergy: ['Muro', 'Guardia']
        },

        'Scivolata Disperata': {
            name: 'Scivolata Disperata',
            icon: '🦵',
            role: 'D',
            color: 'text-red-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'Se perde Fase 2, 10% di annullare l\'azione (salta 2 occasioni)',
            effect: '10% annulla azione se perde, ma skip 2 occasioni',
            mechanics: 'Se perde la Fase 2, 10% di probabilità di annullare l\'azione commettendo fallo tattico (salta le successive 2 occasioni)',
            activation: '10% (se perde Fase 2)',
            example: 'Perde Fase 2 → 10% → Azione annullata! Skip 2 occasioni',
            phase: 'Fase 2',
            synergy: ['Muro', 'Antifurto'],
            warning: 'Salta 2 occasioni se attivata!'
        },

        // ========================================
        // NUOVE ABILITÀ V4.0 - CENTROCAMPISTA
        // ========================================

        'Geometra': {
            name: 'Geometra',
            icon: '📐',
            role: 'C',
            color: 'text-blue-500',
            rarity: 'Comune',
            type: 'Positiva',
            description: 'In Fase 1, se il d20 è pari, aggiunge +1 al totale',
            effect: '+1 se d20 pari in Fase 1',
            mechanics: 'Nella Fase 1 (Costruzione), se il risultato naturale del suo d20 è un numero pari, aggiunge +1 al totale',
            activation: '50% (d20 pari)',
            example: 'Tira 14 (pari) → +1 bonus! Tira 13 (dispari) → niente',
            phase: 'Fase 1',
            synergy: ['Tocco Di Velluto', 'Passaggio Corto']
        },

        'Pressing Alto': {
            name: 'Pressing Alto',
            icon: '⬆️',
            role: 'C',
            color: 'text-red-500',
            rarity: 'Comune',
            type: 'Positiva',
            description: 'In Fase 1 difesa, -1 al modificatore avversario',
            effect: '-1 mod avversario in Fase 1 difesa',
            mechanics: 'Quando partecipa alla Fase 1 in difesa, impone un malus di -1 al modificatore dell\'avversario',
            activation: '100% (in Fase 1 difesa)',
            example: 'Avversario in Fase 1 con mod +8 → Con Pressing Alto: +7!',
            phase: 'Fase 1 (difesa)',
            synergy: ['Mago del pallone', 'Regista']
        },

        'Diga': {
            name: 'Diga',
            icon: '🌊',
            role: 'C',
            color: 'text-cyan-600',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'In Fase 2 difesa, annulla bonus tipologia avversario',
            effect: 'Annulla bonus +1.5 tipologia avversario in Fase 2',
            mechanics: 'Quando partecipa alla Fase 2 in difesa, annulla eventuali bonus di Tipologia dell\'avversario',
            activation: '100% (in Fase 2 difesa)',
            example: 'Avversario avrebbe +1.5 da tipologia → Con Diga: +0!',
            phase: 'Fase 2 (difesa)',
            synergy: ['Motore', 'Antifurto']
        },

        'Metronomo': {
            name: 'Metronomo',
            icon: '🎵',
            role: 'C',
            color: 'text-purple-500',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'In Fase 1, se d20 < 8, diventa automaticamente 8',
            effect: 'd20 minimo 8 in Fase 1',
            mechanics: 'Se il risultato del suo d20 in Fase 1 è inferiore a 8, lo considera automaticamente come 8',
            activation: '100% (se d20 < 8)',
            example: 'Tira 4 → Con Metronomo diventa 8!',
            phase: 'Fase 1',
            synergy: ['Tocco Di Velluto', 'Regista']
        },

        'Illuminante': {
            name: 'Illuminante',
            icon: '💡',
            role: 'C',
            color: 'text-yellow-500',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Se vince Fase 1 con differenza > 10, salta il d100',
            effect: 'Differenza > 10 in Fase 1 = skip d100',
            mechanics: 'Se vince la Fase 1 con una differenza di punteggio superiore a 10, la squadra passa automaticamente alla Fase 2 senza tirare il d100',
            activation: '100% (se differenza > 10)',
            example: 'Vince Fase 1: 25 vs 12 → Differenza 13 → Skip d100!',
            phase: 'Fase 1 → Fase 2',
            synergy: ['Tocco Di Velluto', 'Regista']
        },

        'Box-to-Box': {
            name: 'Box-to-Box',
            icon: '🏃',
            role: 'C',
            color: 'text-green-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Se vince Fase 1, partecipa anche a Fase 2 con +1',
            effect: 'Vittoria Fase 1 → Partecipa a Fase 2 con +1',
            mechanics: 'Se partecipa alla Fase 1 e la squadra vince, partecipa automaticamente anche alla Fase 2 con un bonus di +1',
            activation: '100% (se vince Fase 1)',
            example: 'Vince Fase 1 → Partecipa anche a Fase 2 con +1!',
            phase: 'Fase 1 → Fase 2',
            synergy: ['Motore', 'Incursore']
        },

        'Onnipresente': {
            name: 'Onnipresente',
            icon: '👥',
            role: 'C',
            color: 'text-indigo-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: '10% di supportare Fase 2 con metà modificatore',
            effect: '10% aggiunge 1/2 mod in Fase 2',
            mechanics: 'Ha il 10% di probabilità di partecipare alla Fase 2 in supporto (sia attacco che difesa) aggiungendo metà del suo modificatore a quello del compagno titolare',
            activation: '10%',
            example: 'Fase 2 → 10% → Compagno +4 (metà di 8)!',
            phase: 'Fase 2',
            synergy: ['Motore', 'Box-to-Box']
        },

        // ========================================
        // NUOVE ABILITÀ V4.0 - ATTACCANTE
        // ========================================

        'Rapinatore': {
            name: 'Rapinatore',
            icon: '🦝',
            role: 'A',
            color: 'text-gray-600',
            rarity: 'Comune',
            type: 'Positiva',
            description: '5% di segnare su ribattuta dopo parata stretta (differenza < 3)',
            effect: '5% goal su ribattuta se parata con diff < 3',
            mechanics: 'Se il portiere effettua una parata ma il risultato è inferiore a 3 (parata per poco), c\'è un 5% di probabilità di segnare sulla ribattuta',
            activation: '5% (se parata con diff < 3)',
            example: 'Parata con diff +2 → 5% → GOAL su ribattuta!',
            phase: 'Fase 3 (post-parata)',
            synergy: ['Bomber', 'Opportunista']
        },

        'Tiro della Domenica': {
            name: 'Tiro della Domenica',
            icon: '🎰',
            role: 'A',
            color: 'text-purple-600',
            rarity: 'Comune',
            type: 'Positiva',
            description: '5% di +5 mod in Fase 3, ma se fallisce -1 alla forma',
            effect: '5% +5 mod in Fase 3, rischio -1 forma',
            mechanics: '5% di probabilità di aggiungere +5 al modificatore in Fase 3, ma se fallisce (non segna) subisce -1 alla forma',
            activation: '5%',
            example: '5% attivo → +5 mod! Se non segna → -1 forma',
            phase: 'Fase 3',
            synergy: ['Bomber', 'Opportunista'],
            warning: 'Rischio -1 forma se non segna!'
        },

        'Potenza Pura': {
            name: 'Potenza Pura',
            icon: '💥',
            role: 'A',
            color: 'text-red-600',
            rarity: 'Rara',
            type: 'Positiva',
            description: 'Se di tipologia Potenza, metà margine vittoria Fase 2 come bonus Fase 3',
            effect: 'Tipologia Potenza: 1/2 margine Fase 2 → bonus Fase 3',
            mechanics: 'Se è di tipologia Potenza, quando vince la Fase 2 trasmette metà del margine di vittoria come bonus al tiro in Fase 3',
            activation: '100% (se Potenza e vince Fase 2)',
            example: 'Vince Fase 2: 20 vs 14 (margine 6) → +3 in Fase 3!',
            phase: 'Fase 2 → Fase 3',
            synergy: ['Doppio Scatto', 'Bomber']
        },

        'Specialista del Cucchiaio': {
            name: 'Specialista del Cucchiaio',
            icon: '🥄',
            role: 'A',
            color: 'text-amber-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: 'Ignora abilità del portiere in Fase 3',
            effect: 'Annulla tutte le abilità del portiere',
            mechanics: 'Se il portiere ha un\'abilità che aumenta il proprio modificatore in Fase 3, quella specifica abilità viene ignorata',
            activation: '100% (passiva)',
            example: 'Portiere con Uscita Kamikaze → Ignorata!',
            phase: 'Fase 3',
            synergy: ['Tiro Fulmineo', 'Bomber']
        },

        'Sangue Freddo': {
            name: 'Sangue Freddo',
            icon: '❄️',
            role: 'A',
            color: 'text-blue-600',
            rarity: 'Epica',
            type: 'Positiva',
            description: '10% di ignorare critico/abilità difensiva del portiere',
            effect: '10% ignora critico e abilità difensive portiere',
            mechanics: 'Se il portiere avversario ottiene un successo critico o attiva un\'abilità difensiva, 10% di probabilità di ignorarla',
            activation: '10%',
            example: 'Portiere attiva Miracolo → 10% → Ignorato!',
            phase: 'Fase 3',
            synergy: ['Tiro Fulmineo', 'Specialista del Cucchiaio']
        },

        'Dribbling Ubriacante': {
            name: 'Dribbling Ubriacante',
            icon: '🌀',
            role: 'A',
            color: 'text-purple-600',
            rarity: 'Leggendaria',
            type: 'Positiva',
            description: 'vs Difensore, se d20 = 19-20 → Fase 3 con Valore Tiro 35',
            effect: '19-20 su d20 vs Difensore = critico 35 diretto',
            mechanics: 'In Fase 2, se l\'avversario è un Difensore, tira 1d20. Se esce 19 o 20, passa direttamente alla Fase 3 con un Valore Tiro di 35 (Critico automatico)',
            activation: '10% (19-20 su d20)',
            example: 'Vs Difensore → Tira 19 → Skip a Fase 3 con Valore Tiro 35!',
            phase: 'Fase 2 → Fase 3',
            synergy: ['Doppio Scatto', 'Bomber']
        },

        // ========================================
        // NUOVA ABILITÀ ICONA V4.0
        // ========================================

        'Parata Laser': {
            name: 'Parata Laser',
            icon: '⚡',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Valore Tiro avversario -1 per ogni parata (max -5). Critico avversario 1%',
            effect: '-1 cumulativo al Valore Tiro per parata (max -5), critico 1%',
            mechanics: 'In Fase 3, il Valore Tiro avversario è ridotto di -1 cumulativo per ogni parata effettuata in precedenza (max -5). La probabilità di critico dell\'attaccante scende all\'1%',
            activation: '100% (passiva)',
            example: '3 parate fatte → Valore Tiro avversario -3! Critico solo 1%',
            phase: 'Fase 3',
            synergy: ['Parata di pugno', 'Miracolo'],
            warning: '⚠️ ESCLUSIVA: Solo Simone',
            special: 'Abilita unica di Simone (aggiornata v4.0)'
        },

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
            description: 'L\'Icona della squadra - Capitano speciale con bonus unici',
            effect: '50% di dare +1 a TUTTI i compagni a inizio partita (escluso se stesso), forma mai negativa',
            mechanics: 'A inizio partita c\'e il 50% di probabilita di dare +1 ai modificatori di tutti gli altri giocatori della squadra in tutte le fasi (escluso se stesso). La forma dell\'Icona non puo mai essere negativa.',
            activation: '50% (a inizio partita)',
            example: 'Partita inizia → 50% → Tutti i compagni +1! Icona con forma -2 → diventa 0.',
            phase: 'Tutte le fasi',
            synergy: ['TUTTE (potenzia l\'intera squadra)'],
            warning: '⚠️ Solo 1 Icona per squadra! Riservata ai capitani scelti alla creazione.',
            special: 'Questa e l\'abilita base di tutte le Icone!'
        },

        // ========================================
        // ABILITÀ UNICHE SPECIFICHE PER ICONA
        // ========================================

        'Fatto d\'acciaio': {
            name: 'Fatto d\'acciaio',
            icon: '🦾',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Il giocatore non puo infortunarsi. Costo cura 0 CS. Puo ottenere Regista anche se non e centrocampista.',
            effect: 'Immune agli infortuni, cura gratuita, puo avere Regista',
            mechanics: 'Il giocatore non puo mai infortunarsi. Se viene infortunato il costo per curarlo diventa 0 CS. Puo ottenere l\'abilita "Regista" anche se non e un centrocampista.',
            activation: '100% (passiva)',
            example: 'Croccante si infortuna → Costo cura 0 CS! Puo avere Regista da difensore!',
            phase: 'Tutte le fasi',
            synergy: ['Regista', 'Indistruttibile'],
            warning: '⚠️ ESCLUSIVA: Solo Croccante',
            special: 'Abilita unica di Croccante'
        },

        'L\'uomo in piu': {
            name: 'L\'uomo in piu',
            icon: '🦸',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Quando una fase in attacco verrebbe interrotta, aggiunge meta del modificatore e ricontrolla (max 5x)',
            effect: 'Salva fasi perse in attacco aggiungendo 1/2 mod (max 5 volte)',
            mechanics: 'Quando una qualsiasi fase in attacco verrebbe interrotta (persa), aggiungi meta del modificatore del giocatore al risultato e ricontrolla se la fase viene vinta invece che persa. Massimo 5 volte in tutta la partita.',
            activation: '100% (max 5x per partita)',
            example: 'Fase 2 persa (18 vs 20) → L\'uomo in piu (+4) → 18+4=22 vs 20 → Fase vinta!',
            phase: 'Fasi di attacco',
            synergy: ['Bomber', 'Doppio Scatto'],
            warning: '⚠️ ESCLUSIVA: Solo Fosco',
            special: 'Abilita unica di Fosco'
        },

        'Tiro Dritto': {
            name: 'Tiro Dritto',
            icon: '🎯',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Se unico attaccante: 100% chance di tirare in Fase 3, +1/5 livello al mod, critico 6% invece di 5%',
            effect: 'Unico A: sempre lui tira, bonus mod, critico aumentato',
            mechanics: 'Se e l\'unico attaccante della formazione, la fase "tiro vs portiere" e assegnata automaticamente a lui (100%). Aggiunge 1/5 del suo livello al modificatore. Aumenta il range di successo critico da 5% a 6%.',
            activation: '100% (se unico attaccante)',
            example: 'Amedemo lv15 unico A → 100% lui tira → +3 al mod → 6% critico!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Pivot', 'Bomber'],
            warning: '⚠️ ESCLUSIVA: Solo Amedemo',
            special: 'Abilita unica di Amedemo'
        },

        'Avanti un altro': {
            name: 'Avanti un altro',
            icon: '💀',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Infortuni avversari al 7% invece di 3.5%. In difesa Fase 2: +2 al mod se scelto',
            effect: 'Raddoppia infortuni avversari, +2 in difesa Fase 2',
            mechanics: 'La probabilita di infortunio dei giocatori avversari dopo una partita diventa 7% invece che 3.5%. Solamente nella Fase 2 e solamente se in difesa, se scelto come giocatore della fase il suo modificatore aumenta di +2.',
            activation: '100% (passiva) + Fase 2 difesa',
            example: 'Avversario → 7% infortunio! Fase 2 difesa → Antony +2 al mod!',
            phase: 'Post-partita + Fase 2 (Difesa)',
            synergy: ['Muro', 'Guardia'],
            warning: '⚠️ ESCLUSIVA: Solo Antony',
            special: 'Abilita unica di Antony'
        },

        'Contrasto di gomito': {
            name: 'Contrasto di gomito',
            icon: '💪',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'In difesa: +1/5 livello al mod. 1% di far fallire automaticamente la fase avversaria',
            effect: '+1/5 lv in difesa, 1% fail automatico avversario',
            mechanics: 'Quando scelto come giocatore nelle fasi difensive, il suo modificatore aumenta di 1/5 del suo livello. 1% di probabilita di far fallire automaticamente la fase prima di tirare il d20.',
            activation: '100% (in difesa) + 1%',
            example: 'Luka lv15 difende → +3 al mod! 1% → Fase avversaria fallisce automaticamente!',
            phase: 'Fasi difensive',
            synergy: ['Muro', 'Antifurto'],
            warning: '⚠️ ESCLUSIVA: Solo Luka Alpakashenka',
            special: 'Abilita unica di Luka Alpakashenka'
        },

        'Calcolo delle probabilita': {
            name: 'Calcolo delle probabilita',
            icon: '🧮',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'In Fase 1: tira 2d20 e sceglie il migliore. I bonus Fase 1 si applicano anche in Fase 2',
            effect: '2d20 in costruzione, bonus costruzione anche in attacco',
            mechanics: 'Quando scelto come giocatore nella fase "costruzione", tira 2d20 e sceglie il piu alto invece che tirarne uno solo. Quando scelto come giocatore nella fase "attacco vs difesa" i bonus che avrebbe nella fase di costruzione si applicano anche a questa fase.',
            activation: '100% (quando scelto)',
            example: 'Fase 1 → 2d20 (8, 17) → Usa 17! Fase 2 → Bonus costruzione attivi!',
            phase: 'Fase 1 + Fase 2',
            synergy: ['Tocco Di Velluto', 'Motore'],
            warning: '⚠️ ESCLUSIVA: Solo Il Cap',
            special: 'Abilita unica di Il Cap'
        },

        'Amici di panchina': {
            name: 'Amici di panchina',
            icon: '🤝',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Puo giocare in panchina anche se infortunato. Da le sue abilita al giocatore scelto. +2 in Fase 1 attacco',
            effect: 'Gioca infortunato, passa abilita, +2 costruzione attacco',
            mechanics: 'Quando e infortunato puo essere comunque schierato in panchina. Quando e in panchina ad ogni fase (attacco e difesa) le sue abilita (esclusa Icona) vengono date al giocatore scelto per la fase. In Fase 1 attacco: +2 al mod quando scelto.',
            activation: '100% (passiva)',
            example: 'Shikanto infortunato in panchina → Passa abilita! Fase 1 attacco → +2!',
            phase: 'Tutte le fasi',
            synergy: ['Tutte le abilita positive'],
            warning: '⚠️ ESCLUSIVA: Solo Shikanto',
            special: 'Abilita unica di Shikanto'
        },

        'Continua a provare': {
            name: 'Continua a provare',
            icon: '🔄',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Tira 2d20 e fa la media. Mod attacco x0.5, difesa x1.5. No critico (0%)',
            effect: 'Media 2d20, debole attacco, forte difesa, no critico',
            mechanics: 'Ogni volta che partecipa ad una qualsiasi fase invece che 1d20 tira 2d20 e fa la media, quello e il suo risultato. Il suo modificatore nelle fasi di attacco e x0.5. Non puo avere successo critico (da 5% a 0%). Il suo modificatore nelle fasi di difesa e x1.5.',
            activation: '100% (sempre)',
            example: 'Fase difesa → 2d20 (8, 16) = media 12 → Mod x1.5! Attacco → Mod x0.5, no critico',
            phase: 'Tutte le fasi',
            synergy: ['Muro', 'Guardia'],
            warning: '⚠️ ESCLUSIVA: Solo Gladio',
            special: 'Abilita unica di Gladio'
        },

        'Stazionario': {
            name: 'Stazionario',
            icon: '🧘',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Accumula +0.5 mod per fase saltata (max +3). A +5 partecipa obbligatoriamente, poi reset',
            effect: 'Carica bonus, poi scarica in una fase',
            mechanics: 'Per ogni fase a cui non partecipa accumula +0.5 al suo modificatore (max 3.0). Quando il modificatore bonus arriva a 5.0 partecipa obbligatoriamente alla prossima fase qualsiasi essa sia. Quando partecipa ad una fase il bonus si resetta a +0.0.',
            activation: '100% (passiva)',
            example: '10 fasi saltate → +5 bonus → Prossima fase obbligatoria con +5! → Reset a 0',
            phase: 'Tutte le fasi',
            synergy: ['Motore', 'Fortunato'],
            warning: '⚠️ ESCLUSIVA: Solo Cocco',
            special: 'Abilita unica di Cocco'
        },

        'Osservatore': {
            name: 'Osservatore',
            icon: '👁️',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'In Fase 3 come portiere: annulla abilita piu rara dell\'attaccante e aggiunge il livello rarita al mod. Malus dimezzati',
            effect: 'Annulla abilita top, guadagna bonus, malus /2',
            mechanics: 'Quando e nella fase "tiro vs portiere" ed e il portiere, scansiona l\'avversario e annulla l\'abilita di rarita piu alta che ha. Il livello dell\'abilita annullata si aggiunge al suo modificatore (+1 comune, +2 rara, +3 epica, +4 leggendaria). I malus al modificatore che gli verrebbero applicati sono efficaci la meta.',
            activation: '100% (in Fase 3 come P)',
            example: 'Attaccante ha Bomber (Epica) → Annullata! Mark Falco +3 al mod! Malus -4 → -2',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Parata di pugno', 'Miracolo'],
            warning: '⚠️ ESCLUSIVA: Solo Mark Falco',
            special: 'Abilita unica di Mark Falco'
        },

        'Relax': {
            name: 'Relax',
            icon: '😌',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Secondo mod "Relax": -1 in difesa, +1 in attacco. Range -5 a +5, poi blocca',
            effect: 'Mod dinamico che cresce attaccando, cala difendendo',
            mechanics: 'Questo giocatore ha un secondo modificatore chiamato Relax. Quando partecipa ad una fase come difensore il suo Relax riceve -1. Quando partecipa come attaccante riceve +1. Questo modificatore si aggiunge al suo mod base. Quando raggiunge -5 o +5 rimane cosi per il resto della partita.',
            activation: '100% (dinamico)',
            example: '3 fasi attacco → Relax +3 | 2 fasi difesa → Relax +1 | Max +5 o -5 poi blocca',
            phase: 'Tutte le fasi',
            synergy: ['Doppio Scatto', 'Muro'],
            warning: '⚠️ ESCLUSIVA: Solo Sandro',
            special: 'Abilita unica di Sandro'
        },

        'Scheggia impazzita': {
            name: 'Scheggia impazzita',
            icon: '💥',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Se unico difensore: 100% partecipa in Fase 2. +0.2 mod per ogni Fase 2 (max +5)',
            effect: 'Unico D: sempre presente, accumula bonus',
            mechanics: 'Quando e l\'unico difensore in campo ha il 100% di possibilita di partecipare alla fase "attacco vs difesa" invece che del solito 75%. Per ogni fase "attacco vs difesa" a cui partecipa aggiunge +0.2 al suo modificatore (massimo +5.0).',
            activation: '100% (se unico D)',
            example: 'Bemolle unico D → 100% partecipa! 25 fasi → +5 bonus permanente!',
            phase: 'Fase 2 (Attacco vs Difesa)',
            synergy: ['Guardia', 'Muro'],
            warning: '⚠️ ESCLUSIVA: Solo Bemolle',
            special: 'Abilita unica di Bemolle'
        },

        'Assist-man': {
            name: 'Assist-man',
            icon: '🅰️',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Se vince Fase 1 come A: 100% lui in Fase 2. Se segna altro, assist suo. +1 mod per assist',
            effect: 'Catena di fasi garantita, accumula bonus assist',
            mechanics: 'Quando partecipa alla fase costruzione come attaccante e riesce, continua partecipando lui il 100% delle volte alla fase "attacco vs difesa". Se la fase riesce non puo mai essere lui a tirare in Fase 3, se il tiratore segna l\'assist e sempre di Meliodas. Ottiene +1 al mod per ogni assist fatto in quella partita.',
            activation: '100% (catena fasi)',
            example: 'Meliodas vince Fase 1 → 100% Fase 2 → Altro segna → Assist! → +1 mod permanente',
            phase: 'Fase 1 → Fase 2 → Fase 3',
            synergy: ['Bomber', 'Tiro Fulmineo'],
            warning: '⚠️ ESCLUSIVA: Solo Meliodas',
            special: 'Abilita unica di Meliodas'
        },

        'Parata Efficiente': {
            name: 'Parata Efficiente',
            icon: '🧤',
            role: 'Speciale',
            color: 'text-gold-500',
            rarity: 'Unica',
            type: 'Positiva',
            description: 'Se para con diff +1 o piu: bonus alla Fase 1 successiva pari a meta della differenza. Critico avversario ridotto a 1%',
            effect: 'Parate forti danno bonus costruzione, critico avversario 1%',
            mechanics: 'Quando il giocatore e nella fase "tiro vs portiere" ed e il portiere e para con una differenza di +1 o superiore, aggiunge un modificatore alla fase di costruzione successiva pari alla meta della differenza tra parata e tiro. La percentuale di successo critico dell\'attaccante in fase "tiro vs portiere" si abbassa a 1% da 5%.',
            activation: '100% (quando para)',
            example: 'Simone para con diff +6 → Prossima Fase 1: +3 bonus! Critico avversario solo 1%!',
            phase: 'Fase 3 (Tiro vs Portiere)',
            synergy: ['Presa Sicura', 'Colpo d\'anca'],
            warning: '⚠️ ESCLUSIVA: Solo Simone',
            special: 'Abilita unica di Simone'
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

console.log('✅ Enciclopedia Abilita V4.0 caricata - 120+ abilita complete!');
