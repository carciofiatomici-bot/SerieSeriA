//
// ====================================================================
// MODULO SIMULAZIONE.JS (Logica Core di Simulazione Partita e AbilitÃ )
// ====================================================================
//

/**
 * Mappa dei modificatori basati sul livello del giocatore (Regola 2 estesa fino a Lv 24).
 * @type {Object<number, number>}
 */
const LEVEL_MODIFIERS = {
    1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0, 6: 3.5, 7: 4.0, 8: 4.5, 9: 5.0, 10: 5.5,
    11: 6.0, 12: 6.5, 13: 7.0, 14: 7.5, 15: 8.0, 16: 8.5, 17: 9.0, 18: 9.5, 19: 10.0, 
    20: 11.0, 21: 11.5, 22: 12.0, 23: 12.5, 24: 13.5
};

/**
 * Mappa dei vantaggi di tipologia (Regola 5).
 * Potenza > Tecnico > VelocitÃ  > Potenza
 */
const TYPE_ADVANTAGE_MAP = {
    'Potenza': 'Tecnica',
    'Tecnica': 'Velocita',
    'Velocita': 'Potenza',
};
const TYPE_MODIFIER_FACTOR = 0.20; // 20%

/**
 * Funzione di utilitÃ  per generare un numero intero casuale.
 * @param {number} min - Valore minimo (incluso).
 * @param {number} max - Valore massimo (incluso).
 * @returns {number}
 */
const rollDice = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Variabile globale per tracciare le abilitÃ  annullate da Contrasto Durissimo in questa occasione
let nullifiedPlayerAbilities = new Set();


/**
 * Calcola il moltiplicatore di livello (1.2, 0.8 o 1.0) per un giocatore in base alla tipologia
 * dei giocatori avversari che incontra nella fase.
 *
 * @param {string} playerType - Tipologia del giocatore corrente (Potenza/Tecnica/Velocita).
 * @param {Array<Object>} opposingGroup - Gruppo di giocatori avversari rilevanti nella fase.
 * @returns {number} Moltiplicatore di livello (0.80, 1.00, o 1.20).
 */
const calculateTypeModifier = (playerType, opposingGroup) => {
    if (!opposingGroup || opposingGroup.length === 0) return 1.0;
    if (!playerType || playerType === 'N/A') return 1.0;

    let totalAdvantageScore = 0; // Contatore: +1 per vantaggio, -1 per svantaggio
    let totalClashes = 0;

    for (const opponent of opposingGroup) {
        if (!opponent.type || opponent.type === 'N/A') continue;
        
        totalClashes++;

        // Vantaggio: Player > Opponent (Livello AUMENTA del 20%)
        if (TYPE_ADVANTAGE_MAP[playerType] === opponent.type) {
            totalAdvantageScore += 1;
        } 
        // Svantaggio: Opponent > Player (Livello DIMINUISCE del 20%)
        else if (TYPE_ADVANTAGE_MAP[opponent.type] === playerType) {
            totalAdvantageScore -= 1;
        }
    }

    if (totalClashes === 0) return 1.0;

    // Se la maggioranza degli scontri (netto) Ã¨ a favore
    if (totalAdvantageScore > 0) {
        return 1.20;
    } 
    // Se la maggioranza degli scontri (netto) Ã¨ a sfavore
    else if (totalAdvantageScore < 0) {
        return 0.80;
    }
    
    return 1.0; // Neutrale o pareggio
};


/**
 * Calcola il modificatore base di un singolo giocatore.
 * Applica i bonus Icona, Capitano, Caos, Fortunato, e la Tipologia/Forma.
 *
 * @param {Object} player - Oggetto giocatore.
 * @param {boolean} isIconaActive - Se l'abilitÃ  Icona (+1 a tutti) Ã¨ attiva nella squadra del giocatore.
 * @param {number} phaseNum - 1 (Costruzione), 2 (Attacco), o 3 (Tiro).
 * @param {Array<Object>} opposingGroup - Gruppo di giocatori avversari rilevanti nella fase.
 * @returns {number} Modificatore totale base/variabile/tipologia.
 */
const calculatePlayerModifier = (player, isIconaActive, phaseNum, opposingGroup) => {
    // Check iniziale per l'abilitÃ  annullata
    if (nullifiedPlayerAbilities.has(player.id)) {
        return 0; 
    }

    // Livello Base (con Forma giÃ  applicata da campionato.js)
    // Regola 6: la forma Ã¨ considerata qui tramite 'currentLevel'
    const baseLevel = player.level || 1;
    let effectiveLevel = player.currentLevel || baseLevel; 
    
    // 1. Applica la Tipologia (Moltiplicatore 0.8 o 1.2)
    const typeMultiplier = calculateTypeModifier(player.type, opposingGroup);
    effectiveLevel *= typeMultiplier;
    
    effectiveLevel = Math.round(effectiveLevel); // Arrotonda il livello effettivo finale

    // 2. Mappa il LIVELLO EFFETTIVO al MODIFICATORE
    let mod = LEVEL_MODIFIERS[Math.min(24, Math.max(1, effectiveLevel))] || 1.0; // Max level 24


    // 3. Modificatori Costanti (AbilitÃ )
    if (player.isCaptain) {
        mod += 1.0; // Bonus Capitano (Regola 3)
    }
    if (isIconaActive && !player.isCaptain) {
        mod += 1.0; // AbilitÃ  Icona
    }
    
    // 4. AbilitÃ  Variabili (che si attivano "ad ogni fase")
    
    // Effetto Caos
    if (player.abilities && player.abilities.includes('Effetto Caos')) {
        mod += rollDice(-2, 2);
    }
    
    // Fortunato
    if (player.abilities && player.abilities.includes('Fortunato') && rollDice(1, 100) <= 5) {
        mod *= 2;
    }
    
    return Math.max(0, parseFloat(mod.toFixed(2)));
};

/**
 * Funzione per applicare il bonus Bandiera del Club ai compagni.
 *
 * @param {Array<Object>} players - Gruppo di giocatori di un ruolo.
 * @param {Object} teamFormationInfo - Formazione/info della squadra.
 * @param {string} role - Ruolo da controllare.
 * @returns {number} Modificatore extra dovuto all'abilitÃ  Bandiera.
 */
const applyBandieraBonus = (players, teamFormationInfo, role) => {
    // Verifica se l'abilitÃ  Bandiera Ã¨ attiva per il ruolo (solo se uno ce l'ha)
    const playersWithFlag = teamFormationInfo.allPlayers.filter(p => p.role === role && p.abilities && p.abilities.includes('Bandiera del club'));
    
    if (playersWithFlag.length !== 1) {
        return 0; // Se zero o piÃ¹ di uno, l'abilitÃ  non si attiva per il bonus compagni (non cumulabile)
    }
    
    const flagPossessorId = playersWithFlag[0].id;
    let bonus = 0;

    // Applica +1 a tutti i compagni (non al possessore)
    for (const player of players) {
        if (player.id !== flagPossessorId) {
            bonus += 1.0;
        }
    }
    return bonus;
};


/**
 * Calcola il modificatore totale di un gruppo di giocatori in una fase specifica.
 *
 * @param {Array<Object>} players - Array di oggetti giocatore filtrati per ruolo.
 * @param {boolean} isHalf - Se il modificatore deve essere dimezzato per la formula standard.
 * @param {number} phaseNum - 1 (Costruzione), 2 (Attacco), o 3 (Tiro).
 * @param {Object} teamAFormationInfo - Formazione/info Attaccante.
 * @param {Object} teamBFormationInfo - Formazione/info Difensore.
 * @param {boolean} isTeamAMatching - Se il gruppo di giocatori Ã¨ della squadra A (Attaccante).
 * @returns {number} Modificatore totale arrotondato.
 */
const calculateGroupModifier = (players, isHalf, phaseNum, teamAFormationInfo, teamBFormationInfo, isTeamAMatching) => {
    if (!players || players.length === 0) return 0;
    
    const role = players[0].role;
    let totalModifier = 0;
    
    const formationInfo = isTeamAMatching ? teamAFormationInfo : teamBFormationInfo;

    // 1. Calcola il bonus Bandiera una volta per il gruppo
    const bandieraBonus = applyBandieraBonus(players, formationInfo, role);

    // 2. Determina il gruppo avversario per il calcolo della Tipologia
    let opposingGroup = [];
    if (phaseNum === 1 && isTeamAMatching) { // A Attacca (D+C) contro B (C)
        opposingGroup = teamBFormationInfo.C;
    } else if (phaseNum === 2 && isTeamAMatching) { // A Attacca (C+A) contro B (D+C)
        opposingGroup = teamBFormationInfo.D.concat(teamBFormationInfo.C);
    } else if (phaseNum === 1 && !isTeamAMatching) { // B Difende (C) contro A (D+C)
        opposingGroup = teamAFormationInfo.D.concat(teamAFormationInfo.C);
    } else if (phaseNum === 2 && !isTeamAMatching) { // B Difende (D+C) contro A (C+A)
         opposingGroup = teamAFormationInfo.C.concat(teamAFormationInfo.A);
    } else if (phaseNum === 3 && !isTeamAMatching) { // Portiere B difende contro A Attaccanti
        opposingGroup = teamAFormationInfo.A;
    }

else if (phaseNum === 3 && isTeamAMatching) { // A attacca, B difende con Portiere
    // Supporta piÃ¹ convenzioni per il portiere
    const gk =
      (teamBFormationInfo && (teamBFormationInfo.P || teamBFormationInfo.G || teamBFormationInfo.Goalkeeper))
      || [];
    opposingGroup = gk;
}



    for (const player of players) {
        
        const singleMod = calculatePlayerModifier(
            player,
            formationInfo.isIconaActive,
            phaseNum,
            opposingGroup
        );
        
        let finalMod = singleMod;

        // Aggiungi il bonus Bandiera (giÃ  calcolato sopra)
        finalMod += bandieraBonus;

        // Teletrasporto (Portiere): 5% di partecipare a fase Costruzione/Attacco
        if (player.role === 'P' && player.abilities && player.abilities.includes('Teletrasporto') && phaseNum !== 3) {
            if (rollDice(1, 100) > 5) {
                continue; // Il portiere non partecipa (modificatore = 0)
            }
        }


        // === LOGICA DIMEZZAMENTO E BONUS SPECIFICI PER FASE/RUOLO ===
        
        const isMotore = player.abilities && player.abilities.includes('Motore');
        
        if (phaseNum === 2 && role === 'C') {
             // C in Fase 2 (attacco/difesa): 1/2 mod standard
             if (isHalf && !isMotore) {
                 finalMod /= 2; 
             }
             // Se ha Motore, usa il modificatore intero (non dimezzato).
        } else if (phaseNum === 1 && role === 'D' && isHalf) {
            // D in Fase 1 (costruzione): 1/2 mod
            finalMod /= 2;
        } else if (phaseNum === 1 && role === 'C' && player.abilities && player.abilities.includes('Tocco Di Velluto') && rollDice(1, 100) <= 5) {
             // C: Tocco di Velluto (Solo Fase 1): Raddoppia il modificatore.
             finalMod *= 2;
        }


        // A: AbilitÃ  Doppio: Scatto (Fase 2 Attacco A)
        if (phaseNum === 2 && role === 'A' && player.abilities && player.abilities.includes('Doppio: Scatto') && isTeamAMatching && rollDice(1, 100) <= 5) {
             finalMod *= 2; 
        }
        
        // A: AbilitÃ  Pivot (Fase 2 Attacco A)
        if (phaseNum === 2 && role === 'A' && teamAFormationInfo.A.length === 1 && player.abilities && player.abilities.includes('Pivot') && isTeamAMatching) {
            finalMod *= 2;
        }
        
        // D: AbilitÃ  Guardia (Fase 2 Difesa B)
        if (phaseNum === 2 && role === 'D' && teamBFormationInfo.D.length === 1 && player.abilities && player.abilities.includes('Guardia') && !isTeamAMatching) {
            finalMod *= 2;
        }

        totalModifier += finalMod;
    }
    
    return parseFloat(totalModifier.toFixed(2));
};

/**
 * Fase 1: Calcola il successo della Costruzione (Passaggio in Attacco).
 * @returns {boolean} True se la costruzione ha successo, False altrimenti.
 */
const phaseOneConstruction = (teamA, teamB) => {
    
    // ABILITÃ€ CONTRATO DURISSIMO (DIFENSORE B)
    const hasContrastoDurissimo = teamB.D.some(p => p.abilities && p.abilities.includes('Contrasto Durissimo'));
    if (hasContrastoDurissimo && teamA.Panchina.length > 0) {
        const randomBenchPlayer = teamA.Panchina[rollDice(0, teamA.Panchina.length - 1)];
        nullifiedPlayerAbilities.add(randomBenchPlayer.id);
    }


    // ABILITÃ€ REGISTA (CENTROCAMPISTA A): 5% di saltare la fase di costruzione
    const hasRegista = teamA.C.some(p => p.abilities && p.abilities.includes('Regista'));
    if (hasRegista && rollDice(1, 100) <= 5) {
         return true;
    }

    // ABILITÃ€ ANTIFURTO (DIFENSORE B): 5% di interrompere la fase in Costruzione
    const hasAntifurto = teamB.D.some(p => p.abilities && p.abilities.includes('Antifurto'));
    if (hasAntifurto && rollDice(1, 100) <= 5) {
         return false;
    }

    // Calcolo Modificatori (1/2 D A, 1 C A, 1 C B)
    // Squadra A (Attacca) vs Squadra B (Difende)
    const modA_D = calculateGroupModifier(teamA.D, true, 1, teamA.formationInfo, teamB.formationInfo, true);
    const modA_C = calculateGroupModifier(teamA.C, false, 1, teamA.formationInfo, teamB.formationInfo, true);
    const modB_C = calculateGroupModifier(teamB.C, false, 1, teamA.formationInfo, teamB.formationInfo, false);
    
    // Formula per la percentuale di riuscita (Costruzione)
    // [(1d20 + 1/2 mod D A + mod C A) - (1d20 + mod C B)]
    const rollA = rollDice(1, 20);
    const rollB = rollDice(1, 20);
    
    // Regola 7: Aggiungi il livello allenatore ad entrambi i valori
    const attackValue = rollA + modA_D + modA_C + teamA.coachLevel;
    const defenseValue = rollB + modB_C + teamB.coachLevel;
    
    const successPercentage = Math.max(5, Math.min(100, Math.round(attackValue - defenseValue)));

    // Tiro 1d100 per verificare la riuscita
    const dice100 = rollDice(1, 100);

    const isSuccessful = dice100 <= successPercentage;

    // 5% di probabilitÃ  di passare alla fase successiva anche in caso di fallimento
    const luckyPass = rollDice(1, 100) <= 5;
    
    return isSuccessful || luckyPass;
};

/**
 * Fase 2: Calcola il successo dell'Attacco (Superamento del Centrocampo/Difesa).
 * @returns {number} Risultato della fase di attacco (usato nella fase 3) o -1 se fallisce.
 */
const phaseTwoAttack = (teamA, teamB) => {
    // ABILITÃ€ ANTIFURTO (DIFENSORE B): 5% di interrompere la fase in Attacco
    const hasAntifurto = teamB.D.some(p => p.abilities && p.abilities.includes('Antifurto'));
    if (hasAntifurto && rollDice(1, 100) <= 5) {
         return -1;
    }
    
    // Calcolo Modificatori
    // Squadra A (Attacca) vs Squadra B (Difende)
    
    // Modificatori Attacco: C (1/2/Motore) + A (1/Pivot/Doppio)
    const modA_C = calculateGroupModifier(teamA.C, true, 2, teamA.formationInfo, teamB.formationInfo, true);
    const modA_A = calculateGroupModifier(teamA.A, false, 2, teamA.formationInfo, teamB.formationInfo, true);
    
    // Modificatori Difesa: D (1/Guardia) + C (1/2/Motore)
    const modB_D = calculateGroupModifier(teamB.D, false, 2, teamA.formationInfo, teamB.formationInfo, false);
    const modB_C = calculateGroupModifier(teamB.C, true, 2, teamA.formationInfo, teamB.formationInfo, false); 
    
    // AbilitÃ  Difensore "Muro" (Difensore B): 5% di raddoppiare la difesa
    const muroMultiplier = teamB.D.some(p => p.abilities && p.abilities.includes('Muro') && rollDice(1, 100) <= 5) ? 2 : 1;
    
    // Formula Attacco
    // [(1d20 + 1/2 mod C A + mod A A) - ( 1d20 + mod D B + 1/2 mod C B)]
    const rollA = rollDice(1, 20);
    const rollB = rollDice(1, 20);

    // Regola 7: Aggiungi il livello allenatore ad entrambi i valori
    const attackTotal = rollA + modA_C + modA_A + teamA.coachLevel;
    const defenseTotal = (rollB + modB_D + modB_C + teamB.coachLevel) * muroMultiplier; // Muro si applica dopo il bonus coach

    const result = attackTotal - defenseTotal;
    
    // Se totale >= 0, si passa alla fase successiva.
    if (result >= 0) {
        return result;
    } 
    
    // Se totale < 0, attacco non riuscito.
    // 5% di possibilitÃ  che si passi comunque alla fase successiva simulando un risultato = 5
    const luckyShot = rollDice(1, 100) <= 5;
    
    if (luckyShot) {
        return 5; // Passa alla fase successiva con un risultato neutro di 5
    }

    return -1; // Attacco fallito
};

/**
 * Fase 3: Calcola il tiro in porta (Goal vs Parata).
 * @returns {boolean} True se Ã¨ Goal, False se Ã¨ Parata.
 */
const phaseThreeShot = (teamA, teamB, attackResult) => {
    // teamB: P (intero)
    const portiereB = teamB.P[0] || null;
    if (!portiereB || teamB.P.length === 0) return true; // Se manca il portiere, Ã¨ sempre goal (Regola implicita)
    
    // Modificatore del portiere (Gestisce Icona, Caos, Fortunato, Tipologia vs A)
    const modB_P = calculateGroupModifier(
        teamB.P,
        false, // Non dimezzato
        3, // Fase 3
        teamA.formationInfo, 
        teamB.formationInfo,
        false // Difende
    );

    // ABILITÃ€ ATTACCANTE "BOMBER" (Squadra A): +1 al risultato
    const bomberBonus = teamA.A.some(p => p.abilities && p.abilities.includes('Bomber')) ? 1 : 0;
    const finalAttackResult = attackResult + bomberBonus;
    
    
    // ABILITÃ€ PORTIERE "USCITA KAMIKAZE" (Squadra B)
    let saveMultiplier = 1;
    let kamikazeFailChance = false;
    if (portiereB.abilities && portiereB.abilities.includes('Uscita Kamikaze')) {
         saveMultiplier = 2; // Raddoppia il modificatore
         kamikazeFailChance = true; // Attiva la chance di fallimento
    }
    
    // ABILITÃ€ PORTIERE "PUGNO DI FERRO" (Squadra B)
    // Soglia di parata: Se totale >= -2 (invece di 0) Ã¨ parata!
    const parataSuccessThreshold = portiereB.abilities && portiereB.abilities.includes('Pugno di ferro') ? -2 : 0;
    
    
    // Formula Tiro in Porta
    // 1d20 + modificatore portiere - risultato fase attacco precedente
    const rollP = rollDice(1, 20);
    
    const totalSavePower = rollP + (modB_P * saveMultiplier) + teamB.coachLevel; // Regola 7: Bonus Coach Portiere
    
    // Punto 5 del tuo regolamento: risultato fase attacco precedente si sottrae.
    const saveTotal = totalSavePower - finalAttackResult; 
    
    // 1. Check Kamikaze Fail (se attiva e parata teoricamente riuscita)
    if (kamikazeFailChance && saveTotal >= parataSuccessThreshold && rollDice(1, 100) <= 5) {
         return true; // Goal (5% di fallimento forzato)
    }

    // 2. Check Parata/Goal
    if (saveTotal >= parataSuccessThreshold) {
        // Regola: 5% di possibilitÃ  che se avviene una parata sia comunque un goal
        const luckyGoal = rollDice(1, 100) <= 5;
        return luckyGoal; 
    }

    // Se totale < Soglia Goal!
    return true;
};

/**
 * Funzione principale per simulare un'intera occasione d'attacco per una squadra.
 * @param {Object} attackingTeamData - Dati pre-processati della squadra attaccante (P, D, C, A, Pan, FormazioneInfo).
 * @param {Object} defendingTeamData - Dati pre-processati della squadra difendente.
 * @returns {boolean} True se l'occasione Ã¨ Goal, False altrimenti.
 */
const simulateOneOccasion = (attackingTeamData, defendingTeamData) => {
    
    // 0. RESETTA ABILITÃ€ AD OGNI OCCASIONE
    nullifiedPlayerAbilities.clear(); 
    
    // 1. Fase di Costruzione
    if (!phaseOneConstruction(attackingTeamData, defendingTeamData)) {
        return false;
    }
    
    // 2. Fase di Attacco
    const attackResult = phaseTwoAttack(attackingTeamData, defendingTeamData);
    if (attackResult === -1) {
        return false;
    }

    // 3. Fase di Tiro in Porta
    return phaseThreeShot(attackingTeamData, defendingTeamData, attackResult);
};

// ====================================================================
// ESPOSIZIONE GLOBALE
// ====================================================================

window.simulationLogic = {
    simulateOneOccasion,
    calculateGroupModifier,
    calculatePlayerModifier, 
    rollDice,
    LEVEL_MODIFIERS
};