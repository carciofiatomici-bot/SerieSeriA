//
// ====================================================================
// ABILITIES-ENCYCLOPEDIA.JS - Enciclopedia Abilità Interattiva
// ====================================================================
//

window.AbilitiesEncyclopedia = {
    
    /**
     * Database completo abilità con spiegazioni, esempi, icone
     */
    abilities: {
        
        // ===== ABILITÀ PORTIERI =====
        
        'Pugno di ferro': {
            name: 'Pugno di ferro',
            icon: '🥊',
            role: 'P',
            color: 'text-red-500',
            rarity: 'Rara',
            description: 'Il portiere para anche tiri difficili',
            effect: 'Soglia parata abbassata a -2 (invece di 0)',
            mechanics: 'Normalmente il portiere para se il totale ≥ 0. Con Pugno di Ferro para se totale ≥ -2',
            activation: '100% (Passiva)',
            example: 'Tiro: 18 vs Parata: 16 → Differenza -2 → Normalmente GOAL, ma con Pugno di Ferro è PARATA!',
            phase: 'Fase 3 (Tiro)',
            synergy: ['Uscita Kamikaze (parate più potenti)', 'Teletrasporto (aiuta in costruzione)']
        },
        
        'Uscita Kamikaze': {
            name: 'Uscita Kamikaze',
            icon: '🤯',
            role: 'P',
            color: 'text-orange-500',
            rarity: 'Rara',
            description: 'Il portiere si lancia senza paura, raddoppiando la parata',
            effect: 'Raddoppia il modificatore del portiere, ma 5% di fallimento forzato',
            mechanics: 'Il modificatore del portiere viene moltiplicato x2. Se la parata riesce, c\'è comunque 5% di trasformarsi in goal',
            activation: '100% (Passiva) + 5% fail',
            example: 'Portiere mod +8 → Con Kamikaze diventa +16! MA: se para, 5% di fallire comunque',
            phase: 'Fase 3 (Tiro)',
            synergy: ['Pugno di Ferro (combinazione devastante)', 'Fortunato (annulla fail)'],
            warning: '⚠️ Rischio 5% di fallimento anche con parata riuscita!'
        },
        
        'Teletrasporto': {
            name: 'Teletrasporto',
            icon: '🌀',
            role: 'P',
            color: 'text-purple-500',
            rarity: 'Leggendaria',
            description: 'Il portiere si teletrasporta e aiuta in costruzione/attacco',
            effect: 'Il portiere può partecipare alle fasi 1 e 2 (5% chance)',
            mechanics: 'Nelle fasi Costruzione/Attacco, il portiere ha 5% di "teletrasportarsi" e aggiungere il suo modificatore',
            activation: '5% per fase 1 e 2',
            example: 'Costruzione: 1d20+15 vs 1d20+12 → Con Teletrasporto: 1d20+15+8(portiere) = enorme vantaggio!',
            phase: 'Fase 1 (Costruzione) e Fase 2 (Attacco)',
            synergy: ['Qualsiasi (aiuta tutta la squadra)', 'Icona (mod +1)']
        },
        
        // ===== ABILITÀ DIFENSORI =====
        
        'Muro': {
            name: 'Muro',
            icon: '🧱',
            role: 'D',
            color: 'text-blue-500',
            rarity: 'Rara',
            description: 'Il difensore diventa un muro invalicabile',
            effect: 'Raddoppia la difesa totale in Fase Attacco (5% chance)',
            mechanics: 'In Fase 2, se si attiva (5%), il totale difensivo viene moltiplicato x2',
            activation: '5%',
            example: 'Difesa: 1d20+12 = 24 → Con Muro: 24 x 2 = 48! Attacco impossibile da superare!',
            phase: 'Fase 2 (Attacco)',
            synergy: ['Guardia (difesa più forte)', 'Antifurto (doppia difesa)']
        },
        
        'Contrasto Durissimo': {
            name: 'Contrasto Durissimo',
            icon: '💪',
            role: 'D',
            color: 'text-red-600',
            rarity: 'Leggendaria',
            description: 'Contrasto violento che annulla un\'abilità avversaria',
            effect: 'Annulla le abilità di un giocatore in panchina avversario per tutta l\'occasione',
            mechanics: 'All\'inizio di ogni occasione, se presente, sceglie casualmente 1 giocatore avversario in panchina e ne annulla tutte le abilità',
            activation: '100% (se c\'è panchina avversaria)',
            example: 'Avversario ha Bomber in panchina → Contrasto Durissimo lo disattiva → Bomber non funziona!',
            phase: 'Inizio occasione',
            synergy: ['Muro (difesa impenetrabile)', 'Antifurto (controllo totale)'],
            warning: '⚠️ Funziona solo se avversario ha panchina!'
        },
        
        'Antifurto': {
            name: 'Antifurto',
            icon: '🛡️',
            role: 'D',
            color: 'text-indigo-500',
            rarity: 'Rara',
            description: 'Intercetta la palla interrompendo costruzione o attacco',
            effect: 'Interrompe Fase 1 o Fase 2 avversaria (5% per fase)',
            mechanics: 'In Fase 1 (Costruzione) o Fase 2 (Attacco), ha 5% di interrompere immediatamente l\'azione',
            activation: '5% in Fase 1, 5% in Fase 2',
            example: 'Avversario in Fase Attacco → Antifurto (5%) → Azione interrotta! Nessun goal possibile',
            phase: 'Fase 1 (Costruzione) e Fase 2 (Attacco)',
            synergy: ['Muro (difesa totale)', 'Contrasto Durissimo (controllo completo)']
        },
        
        'Guardia': {
            name: 'Guardia',
            icon: '🛡️',
            role: 'D',
            color: 'text-gray-600',
            rarity: 'Comune',
            description: 'Difensore affidabile che aumenta stabilità difensiva',
            effect: 'Bonus costante al modificatore difensivo',
            mechanics: 'Il difensore aggiunge il suo modificatore completo alla difesa (senza penalità)',
            activation: '100% (Passiva)',
            example: 'Difensore Lv 10 → mod +5.5 sempre attivo in difesa',
            phase: 'Fase 2 (Attacco)',
            synergy: ['Muro (difesa raddoppiata)', 'Antifurto (intercettazione)']
        },
        
        // ===== ABILITÀ CENTROCAMPISTI =====
        
        'Regista': {
            name: 'Regista',
            icon: '🎯',
            role: 'C',
            color: 'text-blue-400',
            rarity: 'Leggendaria',
            description: 'Salta la fase di costruzione con un passaggio perfetto',
            effect: 'Salta Fase 1 (Costruzione) e passa direttamente alla Fase 2 (5% chance)',
            mechanics: 'All\'inizio dell\'occasione, 5% di saltare completamente la costruzione',
            activation: '5%',
            example: 'Occasione inizia → Regista (5%) → Salta costruzione → Vai diretto all\'attacco!',
            phase: 'Fase 1 (Costruzione)',
            synergy: ['Motore (attacco devastante)', 'Tocco di Velluto (costruzione comunque forte)'],
            impact: '⭐⭐⭐⭐⭐ Game-changer!'
        },
        
        'Motore': {
            name: 'Motore',
            icon: '⚙️',
            role: 'C',
            color: 'text-green-500',
            rarity: 'Rara',
            description: 'Centrocampista instancabile che lavora in entrambe le fasi',
            effect: 'Modificatore NON dimezzato in Fase 2 (Attacco)',
            mechanics: 'Normalmente i centrocampisti sono dimezzati in attacco. Motore usa modificatore pieno',
            activation: '100% (Passiva)',
            example: 'Centrocampista Lv 10 → mod +5.5 → Normalmente +2.75 in attacco → Con Motore: +5.5 pieno!',
            phase: 'Fase 2 (Attacco)',
            synergy: ['Regista (passa veloce poi domina)', 'Pivot (attacco micidiale)']
        },
        
        'Tocco Di Velluto': {
            name: 'Tocco Di Velluto',
            icon: '✨',
            role: 'C',
            color: 'text-purple-400',
            rarity: 'Rara',
            description: 'Passaggi precisi e delicati in costruzione',
            effect: 'Bonus al modificatore in Fase 1 (Costruzione)',
            mechanics: 'Aumenta il modificatore del centrocampista in costruzione',
            activation: '100% (Passiva)',
            example: 'Costruzione delicata → Tocco Velluto → Passaggio perfetto',
            phase: 'Fase 1 (Costruzione)',
            synergy: ['Regista (costruzione OP)', 'Motore (versatilità totale)']
        },
        
        // ===== ABILITÀ ATTACCANTI =====
        
        'Bomber': {
            name: 'Bomber',
            icon: '💥',
            role: 'A',
            color: 'text-red-500',
            rarity: 'Rara',
            description: 'Attaccante letale che aumenta potenza di tiro',
            effect: '+1 al risultato della Fase Attacco (usato nella Fase Tiro)',
            mechanics: 'Il risultato della Fase 2 viene aumentato di +1 prima di calcolare la Fase 3',
            activation: '100% (Passiva)',
            example: 'Attacco: differenza +5 → Con Bomber: +6 → Tiro più potente → Goal più facile!',
            phase: 'Fase 3 (Tiro)',
            synergy: ['Pivot (costruisce poi finalizza)', 'Doppio Scatto (supera difesa)'],
            impact: '⭐⭐⭐⭐ Devastante!'
        },
        
        'Doppio: Scatto': {
            name: 'Doppio: Scatto',
            icon: '⚡',
            role: 'A',
            color: 'text-yellow-400',
            rarity: 'Rara',
            description: 'Accelerazione improvvisa che sorprende la difesa',
            effect: 'Bonus al modificatore in Fase 2 (Attacco)',
            mechanics: 'L\'attaccante aggiunge un bonus extra quando supera la difesa',
            activation: '100% (Passiva)',
            example: 'Attacco → Doppio Scatto → Difesa superata più facilmente!',
            phase: 'Fase 2 (Attacco)',
            synergy: ['Bomber (combo letale)', 'Pivot (versatilità)']
        },
        
        'Pivot': {
            name: 'Pivot',
            icon: '🔄',
            role: 'A',
            color: 'text-orange-400',
            rarity: 'Comune',
            description: 'Attaccante versatile che gioca anche per i compagni',
            effect: 'Contribuisce sia in attacco che in costruzione',
            mechanics: 'L\'attaccante può aiutare nelle fasi precedenti (non solo tiro)',
            activation: '100% (Passiva)',
            example: 'Costruzione debole → Pivot aiuta → Costruzione riesce!',
            phase: 'Fase 1 e 2',
            synergy: ['Bomber (finalizzatore)', 'Motore (centrocampo forte)']
        },
        
        // ===== ABILITÀ UNIVERSALI =====
        
        'Effetto Caos': {
            name: 'Effetto Caos',
            icon: '🎲',
            role: 'Tutti',
            color: 'text-pink-500',
            rarity: 'Leggendaria',
            description: 'Imprevedibilità totale: può andare benissimo o malissimo',
            effect: 'Ad ogni fase: modificatore +/- random tra -2 e +2',
            mechanics: 'Tira 1d5 (da -2 a +2) e aggiunge il risultato al modificatore',
            activation: '100% (ogni fase)',
            example: 'Giocatore Lv 10 (mod +5.5) → Caos tira -2 → mod diventa +3.5. OPPURE: tira +2 → mod +7.5!',
            phase: 'Tutte le fasi',
            synergy: ['Fortunato (compensa negativi)', 'Icona (stabilizza)'],
            warning: '⚠️ Alto rischio, alta ricompensa! Può sabotare o salvare la partita!'
        },
        
        'Fortunato': {
            name: 'Fortunato',
            icon: '🍀',
            role: 'Tutti',
            color: 'text-green-400',
            rarity: 'Rara',
            description: 'La fortuna aiuta gli audaci: doppia potenza casuale',
            effect: 'Raddoppia il modificatore (5% chance ogni fase)',
            mechanics: 'In ogni fase, 5% di raddoppiare il proprio modificatore',
            activation: '5% per fase',
            example: 'Giocatore mod +8 → Fortunato (5%) → mod diventa +16! Fase vinta facilmente!',
            phase: 'Tutte le fasi',
            synergy: ['Caos (compensa negativi)', 'Icona (mod già alto)']
        },
        
        'Bandiera del club': {
            name: 'Bandiera del club',
            icon: '🚩',
            role: 'Tutti',
            color: 'text-red-600',
            rarity: 'Leggendaria',
            description: 'Leader che ispira tutti i compagni dello stesso ruolo',
            effect: 'Tutti i compagni dello stesso ruolo ricevono +bonus',
            mechanics: 'Calcola un bonus basato sul livello della Bandiera e lo distribuisce ai compagni di ruolo',
            activation: '100% (Passiva)',
            example: 'Difensore Bandiera Lv 12 → Tutti gli altri difensori ricevono +bonus in difesa!',
            phase: 'Tutte le fasi (dove il ruolo partecipa)',
            synergy: ['Icona (bonus a tutta squadra)', 'Qualsiasi dello stesso ruolo'],
            impact: '⭐⭐⭐⭐⭐ Leader di squadra!'
        },
        
        'Icona': {
            name: 'Icona',
            icon: '👑',
            role: 'Speciale',
            color: 'text-yellow-500',
            rarity: 'Unica',
            description: 'Capitano leggendario che ispira tutta la squadra',
            effect: '+1 a TUTTI i giocatori della squadra (escluso se stesso)',
            mechanics: 'Se l\'Icona è in formazione (titolare o panchina), TUTTI i compagni ricevono +1 al modificatore',
            activation: '100% (Passiva)',
            example: 'Squadra con Icona → Ogni giocatore ha +1 → Vantaggio enorme in tutte le fasi!',
            phase: 'Tutte le fasi',
            synergy: ['Tutto (potenzia tutta la squadra)', 'Bandiera (leadership estrema)'],
            impact: '⭐⭐⭐⭐⭐ La più forte!'
        }
    },
    
    /**
     * Filtra abilità per ruolo
     */
    getAbilitiesByRole(role) {
        if (role === 'all') {
            return Object.values(this.abilities);
        }
        
        return Object.values(this.abilities).filter(ability => 
            ability.role === role || ability.role === 'Tutti' || ability.role === 'Speciale'
        );
    },
    
    /**
     * Cerca abilità per nome
     */
    searchAbility(query) {
        query = query.toLowerCase();
        return Object.values(this.abilities).filter(ability =>
            ability.name.toLowerCase().includes(query) ||
            ability.description.toLowerCase().includes(query) ||
            ability.effect.toLowerCase().includes(query)
        );
    },
    
    /**
     * Ottieni abilità per rarità
     */
    getAbilitiesByRarity(rarity) {
        return Object.values(this.abilities).filter(ability =>
            ability.rarity === rarity
        );
    },
    
    /**
     * Ottieni statistiche abilità
     */
    getAbilityStats() {
        const all = Object.values(this.abilities);
        return {
            total: all.length,
            byRole: {
                P: all.filter(a => a.role === 'P').length,
                D: all.filter(a => a.role === 'D').length,
                C: all.filter(a => a.role === 'C').length,
                A: all.filter(a => a.role === 'A').length,
                Universal: all.filter(a => a.role === 'Tutti').length,
                Special: all.filter(a => a.role === 'Speciale').length
            },
            byRarity: {
                Comune: all.filter(a => a.rarity === 'Comune').length,
                Rara: all.filter(a => a.rarity === 'Rara').length,
                Leggendaria: all.filter(a => a.rarity === 'Leggendaria').length,
                Unica: all.filter(a => a.rarity === 'Unica').length
            }
        };
    }
};

console.log("✅ Abilities Encyclopedia caricato.");
console.log("📚 Abilità totali:", Object.keys(window.AbilitiesEncyclopedia.abilities).length);
