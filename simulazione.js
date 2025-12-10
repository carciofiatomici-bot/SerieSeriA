//
// ====================================================================
// MODULO SIMULAZIONE.JS (Motore Completo - Versione 3.0)
// ====================================================================
//
// Implementa:
// - Modificatori livello (1-30)
// - Sistema forma giocatori
// - Bonus/malus tipologie (Potenza -25% Tecnica, ecc.)
// - 60 abilità complete
// - Livello allenatore (+1/2 in tutte le fasi)
// - Icona (+1 a tutti, forma sempre positiva)
// - Nuove abilità v3.0: Presa Sicura, Muro Psicologico, Miracolo,
//   Freddezza, Lento a carburare, Soggetto a infortuni, Spazzata,
//   Adattabile, Salvataggio sulla Linea, Passaggio Corto,
//   Visione di Gioco, Tuttocampista, Egoista, Opportunista,
//   Tiro a Giro, Immarcabile
//
// ====================================================================

// REPLAY TRACKING
if (typeof window !== "undefined") { window.replayActions = []; }

// ====================================================================
// COSTANTI E CONFIGURAZIONE
// ====================================================================

/**
 * Mappa modificatori per livello (Regola 2 - AGGIORNATA fino a Livello 30)
 */
const LEVEL_MODIFIERS = {
    1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0, 6: 3.5, 7: 4.0, 8: 4.5, 9: 5.0, 10: 5.5,
    11: 6.0, 12: 6.5, 13: 7.0, 14: 7.5, 15: 8.0, 16: 8.5, 17: 9.0, 18: 9.5, 19: 10.0,
    20: 11.0, 21: 11.5, 22: 12.0, 23: 12.5, 24: 13.0, 25: 14.0, 26: 14.5, 27: 15.0,
    28: 15.5, 29: 17.5, 30: 18.5
};

/**
 * Vantaggi tipologia (Regola 5)
 * Potenza batte Tecnica, Tecnica batte Velocità, Velocità batte Potenza
 */
const TYPE_DISADVANTAGE = {
    'Potenza': 'Tecnica',    // Potenza subisce -25% da Tecnica
    'Tecnica': 'Velocita',   // Tecnica subisce -25% da Velocità
    'Velocita': 'Potenza'    // Velocità subisce -25% da Potenza
};
const TYPE_PENALTY = 0.25; // 25% di riduzione

/**
 * Utility: Roll dice
 */
const rollDice = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Utility: Roll percentage (1-100)
 */
const rollPercentage = () => rollDice(1, 100);

/**
 * Utility: Check percentage chance
 */
const checkChance = (percentage) => rollPercentage() <= percentage;

// Tracciamento abilità nullificate per questa occasione
let nullifiedAbilities = new Set();

// Tracciamento abilità "Contrasto Durissimo" usate
let contrastoDurisismoUsed = new Set();

// Tracciamento giocatori infortunati (per "Soggetto a infortuni")
let injuredPlayers = new Set();

// Tracciamento "Lento a carburare" - conta occasioni
let currentOccasionNumber = 0;

// Flag per "Presa Sicura" - skip prossima costruzione
let skipNextConstruction = false;

/**
 * Helper per ordinare giocatori per ruolo (P, D, C, A) e poi per livello decrescente
 */
const sortPlayersByRoleAndLevel = (players) => {
    const roleOrder = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
    return [...players].sort((a, b) => {
        const roleA = roleOrder[a.role] ?? 4;
        const roleB = roleOrder[b.role] ?? 4;
        if (roleA !== roleB) return roleA - roleB;
        return (b.currentLevel || b.level || 0) - (a.currentLevel || a.level || 0);
    });
};

// ====================================================================
// CALCOLO MODIFICATORI BASE
// ====================================================================

/**
 * Calcola il modificatore base di un giocatore considerando:
 * - Livello base
 * - Forma (bonus/malus)
 * - Icona (+1 se c'è l'Icona in squadra)
 * - Tipologia vs avversari (-25% se svantaggiato)
 * 
 * @param {Object} player - Giocatore
 * @param {boolean} hasIcona - Se la squadra ha l'Icona
 * @param {Array} opposingPlayers - Giocatori avversari in questa fase
 * @returns {number} Modificatore finale
 */
const calculatePlayerModifier = (player, hasIcona, opposingPlayers = []) => {
    // Abilità nullificata?
    if (nullifiedAbilities.has(player.id)) {
        return 0;
    }

    // Giocatore infortunato? (Soggetto a infortuni)
    if (injuredPlayers.has(player.id)) {
        return 0;
    }

    // Livello base (limitato a 1-30)
    const baseLevel = Math.min(30, Math.max(1, player.level || 1));
    let modifier = LEVEL_MODIFIERS[baseLevel] || 1.0;

    // Forma (currentLevel ha già il livello modificato dalla forma, limitato a 1-30)
    if (player.currentLevel !== undefined) {
        const clampedLevel = Math.min(30, Math.max(1, player.currentLevel));
        modifier = LEVEL_MODIFIERS[clampedLevel] || modifier;
    }

    // Freddezza: la forma non può mai essere negativa
    if (player.abilities?.includes('Freddezza')) {
        const formaDiff = (player.currentLevel || player.level) - (player.level || 1);
        if (formaDiff < 0) {
            // Ricalcola senza malus forma
            modifier = LEVEL_MODIFIERS[player.level || 1] || 1.0;
        }
    }

    // Icona: +1 a tutti i modificatori
    if (hasIcona && !player.abilities?.includes('Icona')) {
        modifier += 1.0;
    }

    // Icona: +1 aggiuntivo per il giocatore Icona stesso
    if (player.abilities?.includes('Icona')) {
        modifier += 1.0;
    }

    // Capitano nominato: +1 aggiuntivo (diverso dall'Icona)
    if (player.isCaptain === true) {
        modifier += 1.0;
    }

    // Lento a carburare: modificatore dimezzato nelle prime 5 occasioni
    if (player.abilities?.includes('Lento a carburare') && currentOccasionNumber <= 5) {
        modifier /= 2;
    }

    // Effetto tipologia vs avversari (Regola 5)
    // -25% se svantaggiato
    // Adattabile: ignora il malus tipologia
    if (player.type && opposingPlayers.length > 0 && !player.abilities?.includes('Adattabile')) {
        const disadvantagedAgainst = TYPE_DISADVANTAGE[player.type];
        const facingDisadvantage = opposingPlayers.some(opp =>
            opp.type === disadvantagedAgainst
        );

        if (facingDisadvantage) {
            modifier *= (1 - TYPE_PENALTY); // -25%
        }
    }

    // Tuttocampista: impone sempre il malus -25% agli avversari (gestito nella funzione opposingPlayers)
    // (La logica è invertita: gli avversari subiscono malus vs Tuttocampista)

    return modifier;
};

// ====================================================================
// GESTIONE ABILITÀ
// ====================================================================

/**
 * Applica le abilità PRIMA della fase (modifiche ai modificatori)
 */
const applyPrePhaseAbilities = (team, opposingTeam, phase) => {
    let modifiers = {
        bonus: 0,
        multipliers: {},
        skipPhase: false,
        interruptPhase: false,
        specialEffects: {}
    };
    
    // Contrasto Durissimo (Difensore): nullifica abilità di un giocatore in panchina avversaria
    if (phase === 'construction' || phase === 'attack') {
        const hasContrastoDurissimo = team.D?.some(p => 
            p.abilities?.includes('Contrasto Durissimo') && 
            !nullifiedAbilities.has(p.id) &&
            !contrastoDurisismoUsed.has(p.id)
        );
        
        if (hasContrastoDurissimo && opposingTeam.Panchina?.length > 0) {
            const randomBench = opposingTeam.Panchina[rollDice(0, opposingTeam.Panchina.length - 1)];
            nullifiedAbilities.add(randomBench.id);
            const contrasto = team.D.find(p => p.abilities?.includes('Contrasto Durissimo'));
            contrastoDurisismoUsed.add(contrasto.id);
        }
    }
    
    // Presa Sicura: skip costruzione se attivata dalla partita precedente
    if (phase === 'construction' && skipNextConstruction) {
        skipNextConstruction = false;
        modifiers.skipPhase = true;
        return modifiers;
    }

    // Regista (Centrocampista): 5% skip costruzione
    if (phase === 'construction') {
        const hasRegista = team.C?.some(p =>
            p.abilities?.includes('Regista') &&
            !nullifiedAbilities.has(p.id)
        );
        if (hasRegista && checkChance(5)) {
            modifiers.skipPhase = true;
            return modifiers;
        }
    }

    // Lancio lungo (Portiere): 5% skip costruzione
    if (phase === 'construction') {
        const hasLancioLungo = team.P?.some(p =>
            p.abilities?.includes('Lancio lungo') &&
            !nullifiedAbilities.has(p.id)
        );
        if (hasLancioLungo && checkChance(5)) {
            modifiers.skipPhase = true;
            return modifiers;
        }
    }
    
    // Antifurto (Difensore): 5% interrompe attacco
    if (phase === 'attack') {
        const hasAntifurto = opposingTeam.D?.some(p => 
            p.abilities?.includes('Antifurto') && 
            !nullifiedAbilities.has(p.id)
        );
        if (hasAntifurto && checkChance(5)) {
            modifiers.interruptPhase = true;
            return modifiers;
        }
    }
    
    // Mago del pallone (Centrocampista): 5% ignora un centrocampista avversario
    if (phase === 'construction') {
        const hasMago = team.C?.some(p => 
            p.abilities?.includes('Mago del pallone') && 
            !nullifiedAbilities.has(p.id)
        );
        if (hasMago && checkChance(5) && opposingTeam.C?.length > 0) {
            const randomOpponent = opposingTeam.C[rollDice(0, opposingTeam.C.length - 1)];
            nullifiedAbilities.add(randomOpponent.id);
        }
    }
    
    // Cross (Centrocampista): 5% skip direttamente a tiro
    if (phase === 'attack') {
        const hasCross = team.C?.some(p => 
            p.abilities?.includes('Cross') && 
            !nullifiedAbilities.has(p.id)
        );
        if (hasCross && checkChance(5)) {
            modifiers.specialEffects.cross = true;
            return modifiers;
        }
    }
    
    // Teletrasporto (Portiere): 5% partecipa alle fasi
    if (phase === 'construction' || phase === 'attack') {
        const hasTeletrasporto = team.P?.some(p =>
            p.abilities?.includes('Teletrasporto') &&
            !nullifiedAbilities.has(p.id)
        );
        if (hasTeletrasporto && checkChance(5)) {
            modifiers.specialEffects.teletrasporto = team.P[0];
        }
    }

    // Tiro a Giro (Attaccante): 5% ignora un difensore in Fase 2
    if (phase === 'attack') {
        const hasTiroAGiro = team.A?.some(p =>
            p.abilities?.includes('Tiro a Giro') &&
            !nullifiedAbilities.has(p.id)
        );
        if (hasTiroAGiro && checkChance(5) && opposingTeam.D?.length > 0) {
            const randomDefender = opposingTeam.D[rollDice(0, opposingTeam.D.length - 1)];
            nullifiedAbilities.add(randomDefender.id);
            modifiers.specialEffects.tiroAGiro = true;
        }
    }

    // Visione di Gioco (Centrocampista): 5% sostituisce mod alleato con proprio se maggiore
    if (phase === 'construction') {
        const visionePlayers = team.C?.filter(p =>
            p.abilities?.includes('Visione di Gioco') &&
            !nullifiedAbilities.has(p.id)
        );
        if (visionePlayers?.length > 0 && checkChance(5)) {
            modifiers.specialEffects.visioneGioco = visionePlayers[0];
        }
    }

    return modifiers;
};

/**
 * Calcola modificatore di gruppo con tutte le abilità
 */
const calculateGroupModifier = (players, isHalf, team, opposingTeam, phase) => {
    if (!players || players.length === 0) return 0;
    
    const hasIcona = team.formationInfo?.isIconaActive || false;
    let totalModifier = 0;
    
    // Conta Bandiera del club per ruolo
    const bandiereCount = {};
    
    for (const player of players) {
        if (nullifiedAbilities.has(player.id)) continue;

        // Soggetto a infortuni: 2.5% di infortunarsi per ogni fase
        if (player.abilities?.includes('Soggetto a infortuni') && !injuredPlayers.has(player.id)) {
            if (checkChance(2.5)) {
                injuredPlayers.add(player.id);
                continue; // Questo giocatore non contribuisce più
            }
        }

        // Check if already injured
        if (injuredPlayers.has(player.id)) continue;

        // Calcola mod considerando Tuttocampista negli avversari
        // Tuttocampista impone sempre -25% agli avversari
        let effectiveOpposingTeam = opposingTeam;
        const hasTuttocampista = opposingTeam?.some(p => p.abilities?.includes('Tuttocampista'));
        if (hasTuttocampista && player.type) {
            // Simula che l'avversario abbia sempre la tipologia vincente
            const disadvantagedType = TYPE_DISADVANTAGE[player.type];
            if (disadvantagedType) {
                effectiveOpposingTeam = [{ type: disadvantagedType }];
            }
        }

        let mod = calculatePlayerModifier(player, hasIcona, effectiveOpposingTeam);

        // Effetto Caos: modificatore varia da -3 a +3
        if (player.abilities?.includes('Effetto Caos')) {
            mod += rollDice(-3, 3);
        }

        // Fortunato: 5% raddoppia modificatore (se negativo diventa 0)
        if (player.abilities?.includes('Fortunato') && checkChance(5)) {
            mod = mod < 0 ? 0 : mod * 2;
        }

        // Bandiera del club: +1 ai compagni dello stesso ruolo
        if (player.abilities?.includes('Bandiera del club')) {
            if (!bandiereCount[player.role]) {
                bandiereCount[player.role] = true; // Solo una volta per ruolo
            }
        }

        // Abilità specifiche per fase COSTRUZIONE
        if (phase === 'construction') {
            // Tocco di velluto (Centrocampista): 5% raddoppia modificatore
            if (player.role === 'C' && player.abilities?.includes('Tocco Di Velluto') && checkChance(5)) {
                mod *= 2;
            }

            // Passaggio Corto (Centrocampista): +1 al risultato (gestito come bonus al mod)
            if (player.role === 'C' && player.abilities?.includes('Passaggio Corto')) {
                mod += 1;
            }

            // Impreciso (Centrocampista negativa): 5% sottrae invece di aggiungere
            if (player.role === 'C' && player.abilities?.includes('Impreciso') && checkChance(5)) {
                mod *= -1;
            }

            // Ingabbiato (Centrocampista negativa): 5% non aggiunge
            if (player.role === 'C' && player.abilities?.includes('Ingabbiato') && checkChance(5)) {
                mod = 0;
            }

            // Egoista (Centrocampista negativa): 5% sottrae mod di un compagno
            // (gestito dopo il loop dei giocatori)
        }

        // Abilità specifiche per fase ATTACCO
        if (phase === 'attack') {
            // Muro (Difensore): 5% raddoppia quando difende
            if (player.role === 'D' && player.abilities?.includes('Muro') && checkChance(5)) {
                mod *= 2;
            }

            // Spazzata (Difensore): 5% +1 al modificatore
            if (player.role === 'D' && player.abilities?.includes('Spazzata') && checkChance(5)) {
                mod += 1;
            }

            // Guardia (Difensore): raddoppia se è l'unico difensore
            if (player.role === 'D' && player.abilities?.includes('Guardia') && players.length === 1) {
                mod *= 2;
            }

            // Pivot (Attaccante): raddoppia se è l'unico attaccante
            if (player.role === 'A' && player.abilities?.includes('Pivot') &&
                team.A?.length === 1) {
                mod *= 2;
            }

            // Doppio Scatto (Attaccante): 5% mette 2 volte il modificatore
            if (player.role === 'A' && player.abilities?.includes('Doppio Scatto') && checkChance(5)) {
                mod *= 2;
            }

            // Motore (Centrocampista): usa modificatore intero invece di 1/2
            // (gestito nella logica di dimezzamento)

            // Abilità negative
            // Falloso (Difensore): 5% sottrae invece di aggiungere
            if (player.role === 'D' && player.abilities?.includes('Falloso') && checkChance(5)) {
                mod *= -1;
            }

            // Insicuro (Difensore): 5% non aggiunge
            if (player.role === 'D' && player.abilities?.includes('Insicuro') && checkChance(5)) {
                mod = 0;
            }

            // Piedi a banana (Attaccante): 5% sottrae
            if (player.role === 'A' && player.abilities?.includes('Piedi a banana') && checkChance(5)) {
                mod *= -1;
            }

            // Eccesso di sicurezza (Attaccante): 5% non aggiunge
            if (player.role === 'A' && player.abilities?.includes('Eccesso di sicurezza') && checkChance(5)) {
                mod = 0;
            }

            // Egoista (Attaccante negativa): 5% sottrae mod di un compagno
            // (gestito dopo il loop dei giocatori)
        }

        // Fuori Posizione (tutte tranne tiro): 2.5% dà 1/2 del modificatore agli avversari
        if (phase !== 'shot' && player.abilities?.includes('Fuori Posizione') && checkChance(2.5)) {
            // Questo viene gestito sommando negativamente nel gruppo avversario
            // Per ora lo segnamo per elaborazione successiva
            mod = -mod / 2;
        }

        // Motore: non dimezza il modificatore
        if (player.abilities?.includes('Motore') && isHalf) {
            totalModifier += mod; // Aggiunge intero
        } else {
            totalModifier += isHalf ? mod / 2 : mod;
        }
    }

    // Egoista: 5% sottrae mod di un compagno dello stesso ruolo
    const egoistPlayers = players.filter(p =>
        p.abilities?.includes('Egoista') &&
        !nullifiedAbilities.has(p.id) &&
        !injuredPlayers.has(p.id)
    );
    for (const egoist of egoistPlayers) {
        if (checkChance(5)) {
            const sameRolePlayers = players.filter(p =>
                p.role === egoist.role &&
                p.id !== egoist.id &&
                !nullifiedAbilities.has(p.id) &&
                !injuredPlayers.has(p.id)
            );
            if (sameRolePlayers.length > 0) {
                const victim = sameRolePlayers[rollDice(0, sameRolePlayers.length - 1)];
                const victimMod = calculatePlayerModifier(victim, hasIcona, opposingTeam);
                totalModifier -= victimMod * 2; // Sottrae invece di sommare
            }
        }
    }
    
    // Applica bonus Bandiera del club
    for (const role in bandiereCount) {
        const sameRolePlayers = players.filter(p => p.role === role && !p.abilities?.includes('Bandiera del club'));
        totalModifier += sameRolePlayers.length * 1.0; // +1 per ogni compagno stesso ruolo
    }
    
    // Rientro Rapido (Attaccante): 5% partecipa alla difesa
    if (phase === 'attack' && team.A?.length > 0) {
        const hasRientro = team.A.some(p => p.abilities?.includes('Rientro Rapido') && !nullifiedAbilities.has(p.id));
        if (hasRientro && checkChance(5)) {
            const attaccante = team.A.find(p => p.abilities?.includes('Rientro Rapido'));
            const bonusMod = calculatePlayerModifier(attaccante, hasIcona, opposingTeam);
            totalModifier += bonusMod / 2; // Aggiunge come difesa
        }
    }
    
    return totalModifier;
};

// ====================================================================
// FASE 1: COSTRUZIONE
// ====================================================================

const phaseConstruction = (teamA, teamB) => {
    const preAbilities = applyPrePhaseAbilities(teamA, teamB, 'construction');
    
    // Skip fase?
    if (preAbilities.skipPhase) return true;
    
    // Interrupt fase?
    if (preAbilities.interruptPhase) return false;
    
    // Calcola modificatori
    // Squadra A: 1/2 D + 1 C
    // Squadra B: 1 C
    const modA_D = calculateGroupModifier(teamA.D, true, teamA, teamB.C || [], 'construction');
    const modA_C = calculateGroupModifier(teamA.C, false, teamA, teamB.C || [], 'construction');
    const modB_C = calculateGroupModifier(teamB.C, false, teamB, [...(teamA.D || []), ...(teamA.C || [])], 'construction');
    
    // Teletrasporto portiere?
    if (preAbilities.specialEffects.teletrasporto) {
        const portiereBonus = calculatePlayerModifier(preAbilities.specialEffects.teletrasporto, teamA.formationInfo?.isIconaActive, teamB.C || []);
        modA_C += portiereBonus / 2;
    }
    
    // Roll + coach bonus (Regola 6: +1/2 livello allenatore)
    const rollA = rollDice(1, 20);
    const rollB = rollDice(1, 20);
    
    const coachA = (teamA.coachLevel || 1) / 2;
    const coachB = (teamB.coachLevel || 1) / 2;
    
    const totalA = rollA + modA_D + modA_C + coachA;
    const totalB = rollB + modB_C + coachB;
    
    // Calcola % successo
    const successChance = Math.max(5, Math.min(95, totalA - totalB + 50)); // Centrato a 50%
    
    // Roll 1d100
    const success = checkChance(successChance);
    
    // 5% di passare comunque
    if (!success && checkChance(5)) return true;
    
    return success;
};

// ====================================================================
// FASE 2: ATTACCO VS DIFESA
// ====================================================================

const phaseAttack = (teamA, teamB) => {
    const preAbilities = applyPrePhaseAbilities(teamA, teamB, 'attack');
    
    // Interrupt fase?
    if (preAbilities.interruptPhase) return -1;
    
    // Cross? Skip direttamente a tiro con 1d20 + miglior attaccante
    if (preAbilities.specialEffects.cross) {
        const bestAttacker = teamA.A?.reduce((best, curr) => {
            const modBest = calculatePlayerModifier(best, teamA.formationInfo?.isIconaActive, []);
            const modCurr = calculatePlayerModifier(curr, teamA.formationInfo?.isIconaActive, []);
            return modCurr > modBest ? curr : best;
        });
        
        if (bestAttacker) {
            const crossResult = rollDice(1, 20) + calculatePlayerModifier(bestAttacker, teamA.formationInfo?.isIconaActive, []);
            return crossResult;
        }
    }
    
    // Calcola modificatori
    // Squadra A: 1/2 C + 1 A
    // Squadra B: 1 D + 1/2 C
    const modA_C = calculateGroupModifier(teamA.C, true, teamA, [...(teamB.D || []), ...(teamB.C || [])], 'attack');
    const modA_A = calculateGroupModifier(teamA.A, false, teamA, [...(teamB.D || []), ...(teamB.C || [])], 'attack');
    const modB_D = calculateGroupModifier(teamB.D, false, teamB, [...(teamA.C || []), ...(teamA.A || [])], 'attack');
    const modB_C = calculateGroupModifier(teamB.C, true, teamB, [...(teamA.C || []), ...(teamA.A || [])], 'attack');
    
    // Teletrasporto portiere?
    if (preAbilities.specialEffects.teletrasporto) {
        const portiereBonus = calculatePlayerModifier(preAbilities.specialEffects.teletrasporto, teamA.formationInfo?.isIconaActive, teamB.D || []);
        modA_A += portiereBonus / 2;
    }
    
    // Roll + coach bonus
    let rollA = rollDice(1, 20);

    // Immarcabile (Attaccante): 5% tira 2d20 e tiene il migliore
    const hasImmarcabile = teamA.A?.some(p =>
        p.abilities?.includes('Immarcabile') &&
        !nullifiedAbilities.has(p.id) &&
        !injuredPlayers.has(p.id)
    );
    if (hasImmarcabile && checkChance(5)) {
        const roll2 = rollDice(1, 20);
        rollA = Math.max(rollA, roll2);
    }

    const rollB = rollDice(1, 20);

    const coachA = (teamA.coachLevel || 1) / 2;
    const coachB = (teamB.coachLevel || 1) / 2;

    const totalA = rollA + modA_C + modA_A + coachA;
    const totalB = rollB + modB_D + modB_C + coachB;

    const result = totalA - totalB;
    
    // Se >= 0 passa
    if (result >= 0) return Math.max(1, result);
    
    // Se < 0, 5% di passare comunque con risultato 5
    if (checkChance(5)) return 5;
    
    return -1;
};

// ====================================================================
// FASE 3: TIRO VS PORTIERE
// ====================================================================

const phaseShot = (teamA, teamB, attackResult) => {
    if (!teamB.P || teamB.P.length === 0) return true; // No portiere = gol
    
    const portiere = teamB.P[0];
    
    // Tiro fulmineo (Attaccante): 5% annulla abilità portiere
    const hasTiroFulmineo = teamA.A?.some(p => p.abilities?.includes('Tiro Fulmineo') && !nullifiedAbilities.has(p.id));
    if (hasTiroFulmineo && checkChance(5)) {
        nullifiedAbilities.add(portiere.id);
    }
    
    // Modificatore portiere
    let modPortiere = calculatePlayerModifier(portiere, teamB.formationInfo?.isIconaActive, teamA.A || []);
    
    // Uscita Kamikaze: raddoppia modificatore
    let kamikazeActive = false;
    if (portiere.abilities?.includes('Uscita Kamikaze') && !nullifiedAbilities.has(portiere.id)) {
        modPortiere *= 2;
        kamikazeActive = true;
    }
    
    // Deviazione (Difensore): 5% aggiunge modificatore del difensore
    if (teamB.D?.length > 0) {
        const hasDeviazione = teamB.D.some(p => p.abilities?.includes('Deviazione') && !nullifiedAbilities.has(p.id));
        if (hasDeviazione && checkChance(5)) {
            const difensore = teamB.D.find(p => p.abilities?.includes('Deviazione'));
            modPortiere += calculatePlayerModifier(difensore, teamB.formationInfo?.isIconaActive, []);
        }
    }
    
    // Mani di burro (Portiere negativa): 5% sottrae invece di aggiungere
    if (portiere.abilities?.includes('Mani di burro') && !nullifiedAbilities.has(portiere.id) && checkChance(5)) {
        modPortiere *= -1;
    }
    
    // Fuori dai pali (Portiere negativa): 5% non aggiunge modificatore
    if (portiere.abilities?.includes('Fuori dai pali') && !nullifiedAbilities.has(portiere.id) && checkChance(5)) {
        modPortiere = 0;
    }
    
    // Coach bonus
    const coachB = (teamB.coachLevel || 1) / 2;
    
    // Bomber (Attaccante): +1 al risultato attacco
    let attackBonus = 0;
    if (teamA.A?.some(p => p.abilities?.includes('Bomber') && !nullifiedAbilities.has(p.id))) {
        attackBonus = 1;
    }
    
    // Tiro dalla distanza (Centrocampista/Difensore): sostituisce modificatore attaccante più basso
    const shooters = [...(teamA.C || []), ...(teamA.D || [])].filter(p => 
        p.abilities?.includes('Tiro dalla distanza') && !nullifiedAbilities.has(p.id)
    );
    
    if (shooters.length > 0 && teamA.A?.length > 0) {
        // Trova attaccante con modificatore più basso
        let worstAttacker = teamA.A.reduce((worst, curr) => {
            const modWorst = calculatePlayerModifier(worst, teamA.formationInfo?.isIconaActive, []);
            const modCurr = calculatePlayerModifier(curr, teamA.formationInfo?.isIconaActive, []);
            return modCurr < modWorst ? curr : worst;
        });
        
        const worstAttackerMod = calculatePlayerModifier(worstAttacker, teamA.formationInfo?.isIconaActive, []);
        
        // Trova miglior shooter
        const bestShooter = shooters.reduce((best, curr) => {
            const modBest = calculatePlayerModifier(best, teamA.formationInfo?.isIconaActive, []);
            const modCurr = calculatePlayerModifier(curr, teamA.formationInfo?.isIconaActive, []);
            return modCurr > modBest ? curr : best;
        });
        
        const bestShooterMod = calculatePlayerModifier(bestShooter, teamA.formationInfo?.isIconaActive, []);
        
        // Se lo shooter è migliore, sostituisce
        if (bestShooterMod > worstAttackerMod) {
            attackBonus += (bestShooterMod - worstAttackerMod);
        }
    }
    
    const finalAttackResult = attackResult + attackBonus;

    // Muro Psicologico (Portiere): 5% attacco tira 1d10 invece di 1d20
    let attackRollDie = 20;
    if (portiere.abilities?.includes('Muro Psicologico') && !nullifiedAbilities.has(portiere.id) && checkChance(5)) {
        attackRollDie = 10;
    }

    // Roll portiere
    let rollP = rollDice(1, 20);

    // Parata con i piedi (Portiere): 5% tira due dadi e tiene il più alto
    if (portiere.abilities?.includes('Parata con i piedi') && !nullifiedAbilities.has(portiere.id) && checkChance(5)) {
        const roll2 = rollDice(1, 20);
        rollP = Math.max(rollP, roll2);
    }

    // Respinta Timida (Portiere negativa): 5% ritira e usa il secondo
    if (portiere.abilities?.includes('Respinta Timida') && !nullifiedAbilities.has(portiere.id) && checkChance(5)) {
        rollP = rollDice(1, 20);
    }

    const totalPortiere = rollP + modPortiere + coachB;

    // Calcola risultato (considerando Muro Psicologico che riduce il dado dell'attacco)
    // Nota: il finalAttackResult già include il roll fatto in phaseAttack
    // Per Muro Psicologico, applichiamo una penalità proporzionale
    let effectiveAttackResult = finalAttackResult;
    if (attackRollDie === 10) {
        // Riduce il risultato dell'attacco come se avesse tirato un d10 invece di d20
        effectiveAttackResult = Math.max(1, finalAttackResult - 5); // Penalità media
    }

    let saveResult = totalPortiere - effectiveAttackResult;

    // Pugno di ferro: soglia parata -2 invece di 0
    let saveThreshold = 0;
    if (portiere.abilities?.includes('Pugno di ferro') && !nullifiedAbilities.has(portiere.id)) {
        saveThreshold = -2;
    }

    // Kamikaze fail check: 5% fallisce anche se parata riuscita
    if (kamikazeActive && saveResult > saveThreshold && checkChance(5)) {
        // Salvataggio sulla Linea può ancora salvare
        if (checkSalvataggioSullaLinea(teamB, effectiveAttackResult)) {
            return false; // Salvato!
        }
        return true; // Gol!
    }

    // Check risultato
    if (saveResult > saveThreshold) {
        // Parata!
        // Presa Sicura: se differenza > 5, prossima azione skip costruzione
        if (portiere.abilities?.includes('Presa Sicura') && !nullifiedAbilities.has(portiere.id)) {
            if (saveResult > 5) {
                skipNextConstruction = true;
            }
        }
        // 5% di gol comunque
        if (checkChance(5)) {
            // Salvataggio sulla Linea può ancora salvare
            if (checkSalvataggioSullaLinea(teamB, effectiveAttackResult)) {
                return false;
            }
            return true;
        }
        return false;
    } else if (saveResult === saveThreshold) {
        // 50-50
        // Opportunista (Attaccante): se pareggio, 75% goal invece di 50%
        const hasOpportunista = teamA.A?.some(p =>
            p.abilities?.includes('Opportunista') &&
            !nullifiedAbilities.has(p.id) &&
            !injuredPlayers.has(p.id)
        );
        const goalChance = hasOpportunista ? 75 : 50;

        if (checkChance(goalChance)) {
            // Salvataggio sulla Linea può ancora salvare
            if (checkSalvataggioSullaLinea(teamB, effectiveAttackResult)) {
                return false;
            }
            return true;
        }
        return false;
    } else {
        // Gol!
        // Miracolo (Portiere): 5% salva se differenza < 3
        if (portiere.abilities?.includes('Miracolo') && !nullifiedAbilities.has(portiere.id)) {
            if (Math.abs(saveResult) < 3 && checkChance(5)) {
                return false; // Miracolo! Parata!
            }
        }

        // Salvataggio sulla Linea (Difensore): 5% salva dopo goal
        if (checkSalvataggioSullaLinea(teamB, effectiveAttackResult)) {
            return false; // Salvato!
        }

        return true;
    }
};

/**
 * Check Salvataggio sulla Linea ability
 */
const checkSalvataggioSullaLinea = (teamB, attackResult) => {
    if (!teamB.D || teamB.D.length === 0) return false;

    const hasSalvataggio = teamB.D.some(p =>
        p.abilities?.includes('Salvataggio sulla Linea') &&
        !nullifiedAbilities.has(p.id) &&
        !injuredPlayers.has(p.id)
    );

    if (hasSalvataggio && checkChance(5)) {
        const difensore = teamB.D.find(p => p.abilities?.includes('Salvataggio sulla Linea'));
        const rollD = rollDice(1, 20);
        const modD = calculatePlayerModifier(difensore, teamB.formationInfo?.isIconaActive, []);
        const totalD = rollD + modD;

        if (totalD > attackResult) {
            return true; // Salvato!
        }
    }

    return false;
};

// ====================================================================
// FUNZIONE PRINCIPALE: SIMULA UN'OCCASIONE
// ====================================================================

/**
 * Simula un'intera occasione di attacco
 * @param {Object} attackingTeam - Squadra attaccante
 * @param {Object} defendingTeam - Squadra difendente
 * @param {number} occasionNumber - Numero occasione (1-30) per abilità "Lento a carburare"
 * @returns {boolean} true se gol, false se no
 */
const simulateOneOccasion = (attackingTeam, defendingTeam, occasionNumber = 1) => {
    // Reset abilità nullificate per questa occasione
    nullifiedAbilities.clear();
    contrastoDurisismoUsed.clear();

    // Imposta il numero di occasione corrente (per "Lento a carburare")
    currentOccasionNumber = occasionNumber;

    // Fase 1: Costruzione
    if (!phaseConstruction(attackingTeam, defendingTeam)) {
        return false;
    }

    // Fase 2: Attacco
    const attackResult = phaseAttack(attackingTeam, defendingTeam);
    if (attackResult === -1) {
        return false;
    }

    // Fase 3: Tiro
    return phaseShot(attackingTeam, defendingTeam, attackResult);
};

/**
 * Resetta lo stato della simulazione (chiamare all'inizio di una nuova partita)
 */
const resetSimulationState = () => {
    nullifiedAbilities.clear();
    contrastoDurisismoUsed.clear();
    injuredPlayers.clear();
    currentOccasionNumber = 0;
    skipNextConstruction = false;
};

// ====================================================================
// VERSIONE CON LOG DETTAGLIATO PER DEBUG
// ====================================================================

/**
 * Simula un'occasione con log dettagliato di ogni fase
 */
/**
 * Calcola il modificatore con log dettagliato per debug
 */
const calculatePlayerModifierWithLog = (player, hasIcona, opposingPlayers = []) => {
    const details = [];
    const abilityBonuses = []; // Traccia bonus/malus abilita

    if (nullifiedAbilities.has(player.id)) {
        return { mod: 0, details: ['NULLIFICATO'], abilityBonuses: [] };
    }
    if (injuredPlayers.has(player.id)) {
        return { mod: 0, details: ['INFORTUNATO'], abilityBonuses: [] };
    }

    // Livello base
    const baseLevel = Math.min(30, Math.max(1, player.level || 1));
    let modifier = LEVEL_MODIFIERS[baseLevel] || 1.0;
    details.push(`base Lv.${baseLevel}=${modifier.toFixed(1)}`);

    // Forma (currentLevel)
    if (player.currentLevel !== undefined && player.currentLevel !== baseLevel) {
        const clampedLevel = Math.min(30, Math.max(1, player.currentLevel));
        const formaMod = LEVEL_MODIFIERS[clampedLevel] || modifier;

        // Freddezza: la forma non puo mai essere negativa
        if (player.abilities?.includes('Freddezza')) {
            const formaDiff = player.currentLevel - baseLevel;
            if (formaDiff < 0) {
                // Ignora malus forma
                details.push(`forma Lv.${clampedLevel} ignorata`);
                abilityBonuses.push({ ability: 'Freddezza', effect: 'forma negativa ignorata' });
            } else {
                details.push(`forma Lv.${clampedLevel}=${formaMod.toFixed(1)}`);
                modifier = formaMod;
            }
        } else {
            details.push(`forma Lv.${clampedLevel}=${formaMod.toFixed(1)}`);
            modifier = formaMod;
        }
    }

    // Icona bonus
    if (hasIcona && !player.abilities?.includes('Icona')) {
        modifier += 1.0;
        details.push(`icona+1`);
        abilityBonuses.push({ ability: 'Icona (squadra)', effect: '+1' });
    }
    if (player.abilities?.includes('Icona')) {
        modifier += 1.0;
        details.push(`ICONA+1`);
        abilityBonuses.push({ ability: 'Icona', effect: '+1' });
    }

    // Capitano nominato: +1 aggiuntivo
    if (player.isCaptain === true) {
        modifier += 1.0;
        details.push(`CAP+1`);
        abilityBonuses.push({ ability: 'Capitano', effect: '+1' });
    }

    // Lento a carburare: modificatore dimezzato nelle prime 5 occasioni
    if (player.abilities?.includes('Lento a carburare') && currentOccasionNumber <= 5) {
        const oldMod = modifier;
        modifier /= 2;
        details.push(`Lento(occ.${currentOccasionNumber}): ${oldMod.toFixed(1)}/2=${modifier.toFixed(1)}`);
        abilityBonuses.push({ ability: 'Lento a carburare', effect: `/2 (occ.${currentOccasionNumber}/5)` });
    }

    // Adattabile: ignora il malus tipologia
    if (player.abilities?.includes('Adattabile')) {
        abilityBonuses.push({ ability: 'Adattabile', effect: 'ignora malus tipo' });
    }

    // Tipologia
    if (player.type && opposingPlayers.length > 0 && !player.abilities?.includes('Adattabile')) {
        const disadvantagedAgainst = TYPE_DISADVANTAGE[player.type];
        const facingDisadvantage = opposingPlayers.some(opp => opp.type === disadvantagedAgainst);
        if (facingDisadvantage) {
            const oldMod = modifier;
            modifier *= (1 - TYPE_PENALTY);
            details.push(`${player.type} vs ${disadvantagedAgainst} -25%: ${oldMod.toFixed(1)}=>${modifier.toFixed(1)}`);
        }
    }

    return { mod: modifier, details, abilityBonuses };
};

const simulateOneOccasionWithLog = (attackingTeam, defendingTeam, occasionNumber = 1) => {
    const log = [];

    // Reset abilità nullificate
    nullifiedAbilities.clear();
    contrastoDurisismoUsed.clear();
    currentOccasionNumber = occasionNumber;

    const hasIconaA = attackingTeam.formationInfo?.isIconaActive || false;
    const hasIconaB = defendingTeam.formationInfo?.isIconaActive || false;

    log.push(`\n--- OCCASIONE ${occasionNumber} ---`);
    log.push(`  [Icona ATT: ${hasIconaA ? 'SI' : 'NO'} | Icona DIF: ${hasIconaB ? 'SI' : 'NO'}]`);

    // ===== FASE 1: COSTRUZIONE =====
    log.push(`\n[FASE 1: COSTRUZIONE]`);

    // Controllo skip fase
    const preAbilitiesC = applyPrePhaseAbilities(attackingTeam, defendingTeam, 'construction');
    if (preAbilitiesC.skipPhase) {
        log.push(`  SKIP! (Regista/Lancio lungo attivato)`);
        log.push(`  => Passa direttamente a Fase 2`);
    } else {
        // Calcola modificatori - ordina per livello decrescente
        const playersA_D = sortPlayersByRoleAndLevel(attackingTeam.D || []);
        const playersA_C = sortPlayersByRoleAndLevel(attackingTeam.C || []);
        const playersB_C = sortPlayersByRoleAndLevel(defendingTeam.C || []);

        // Mostra tipologie avversarie
        const oppTypesB = playersB_C.map(p => p.type || 'N/A').join(', ');
        const oppTypesA = [...playersA_D, ...playersA_C].map(p => p.type || 'N/A').join(', ');

        let modA_D = 0;
        log.push(`  ATT Difensori (1/2 mod) vs [${oppTypesB}]:`);
        playersA_D.forEach(p => {
            if (!nullifiedAbilities.has(p.id) && !injuredPlayers.has(p.id)) {
                const { mod, details, abilityBonuses } = calculatePlayerModifierWithLog(p, hasIconaA, playersB_C);
                modA_D += mod / 2;
                const abilitiesStr = p.abilities?.length > 0 ? ` [${p.abilities.join(', ')}]` : '';
                const bonusStr = abilityBonuses?.length > 0 ? ` << ${abilityBonuses.map(b => `${b.ability}: ${b.effect}`).join(', ')}` : '';
                log.push(`    - ${p.name} [${p.type || 'N/A'}] Lv.${p.level}->Lv.${p.currentLevel}${abilitiesStr}: ${details.join(' | ')} = ${mod.toFixed(1)} => +${(mod/2).toFixed(1)}${bonusStr}`);
            }
        });

        let modA_C = 0;
        log.push(`  ATT Centrocampisti (1x mod) vs [${oppTypesB}]:`);
        playersA_C.forEach(p => {
            if (!nullifiedAbilities.has(p.id) && !injuredPlayers.has(p.id)) {
                const { mod, details, abilityBonuses } = calculatePlayerModifierWithLog(p, hasIconaA, playersB_C);
                modA_C += mod;
                const abilitiesStr = p.abilities?.length > 0 ? ` [${p.abilities.join(', ')}]` : '';
                const bonusStr = abilityBonuses?.length > 0 ? ` << ${abilityBonuses.map(b => `${b.ability}: ${b.effect}`).join(', ')}` : '';
                log.push(`    - ${p.name} [${p.type || 'N/A'}] Lv.${p.level}->Lv.${p.currentLevel}${abilitiesStr}: ${details.join(' | ')} = ${mod.toFixed(1)} => +${mod.toFixed(1)}${bonusStr}`);
            }
        });

        let modB_C = 0;
        log.push(`  DIF Centrocampisti (1x mod) vs [${oppTypesA}]:`);
        playersB_C.forEach(p => {
            if (!nullifiedAbilities.has(p.id) && !injuredPlayers.has(p.id)) {
                const { mod, details, abilityBonuses } = calculatePlayerModifierWithLog(p, hasIconaB, [...playersA_D, ...playersA_C]);
                modB_C += mod;
                const abilitiesStr = p.abilities?.length > 0 ? ` [${p.abilities.join(', ')}]` : '';
                const bonusStr = abilityBonuses?.length > 0 ? ` << ${abilityBonuses.map(b => `${b.ability}: ${b.effect}`).join(', ')}` : '';
                log.push(`    - ${p.name} [${p.type || 'N/A'}] Lv.${p.level}->Lv.${p.currentLevel}${abilitiesStr}: ${details.join(' | ')} = ${mod.toFixed(1)} => +${mod.toFixed(1)}${bonusStr}`);
            }
        });

        const rollA = rollDice(1, 20);
        const rollB = rollDice(1, 20);
        const coachA = (attackingTeam.coachLevel || 1) / 2;
        const coachB = (defendingTeam.coachLevel || 1) / 2;

        const totalA = rollA + modA_D + modA_C + coachA;
        const totalB = rollB + modB_C + coachB;

        log.push(`  ---`);
        log.push(`  ATT: dado=${rollA} + difMod=${modA_D.toFixed(1)} + cenMod=${modA_C.toFixed(1)} + coach=${coachA.toFixed(1)} = ${totalA.toFixed(1)}`);
        log.push(`  DIF: dado=${rollB} + cenMod=${modB_C.toFixed(1)} + coach=${coachB.toFixed(1)} = ${totalB.toFixed(1)}`);

        const successChance = Math.max(5, Math.min(95, totalA - totalB + 50));
        const roll100 = rollPercentage();
        const success = roll100 <= successChance;

        log.push(`  Differenza: ${(totalA - totalB).toFixed(1)} => ${successChance}% successo`);
        log.push(`  Roll d100: ${roll100} ${success ? '<=' : '>'} ${successChance}`);

        if (!success) {
            const luckyRoll = rollPercentage();
            if (luckyRoll <= 5) {
                log.push(`  FALLITO ma 5% fortuna attivato (roll: ${luckyRoll})`);
            } else {
                log.push(`  => FASE 1 FALLITA - Occasione persa`);
                return { goal: false, log };
            }
        } else {
            log.push(`  => FASE 1 SUPERATA`);
        }
    }

    // ===== FASE 2: ATTACCO =====
    log.push(`\n[FASE 2: ATTACCO vs DIFESA]`);

    const preAbilitiesA = applyPrePhaseAbilities(attackingTeam, defendingTeam, 'attack');
    if (preAbilitiesA.interruptPhase) {
        log.push(`  INTERROTTO! (Antifurto attivato)`);
        log.push(`  => Occasione persa`);
        return { goal: false, log };
    }

    const playersA_C2 = sortPlayersByRoleAndLevel(attackingTeam.C || []);
    const playersA_A = sortPlayersByRoleAndLevel(attackingTeam.A || []);
    const playersB_D = sortPlayersByRoleAndLevel(defendingTeam.D || []);
    const playersB_C2 = sortPlayersByRoleAndLevel(defendingTeam.C || []);

    const oppTypesB2 = [...playersB_D, ...playersB_C2].map(p => p.type || 'N/A').join(', ');
    const oppTypesA2 = [...playersA_C2, ...playersA_A].map(p => p.type || 'N/A').join(', ');

    let modA_C2 = 0;
    log.push(`  ATT Centrocampisti (1/2 mod) vs [${oppTypesB2}]:`);
    playersA_C2.forEach(p => {
        if (!nullifiedAbilities.has(p.id) && !injuredPlayers.has(p.id)) {
            const { mod, details, abilityBonuses } = calculatePlayerModifierWithLog(p, hasIconaA, [...playersB_D, ...playersB_C2]);
            modA_C2 += mod / 2;
            const abilitiesStr = p.abilities?.length > 0 ? ` [${p.abilities.join(', ')}]` : '';
            const bonusStr = abilityBonuses?.length > 0 ? ` << ${abilityBonuses.map(b => `${b.ability}: ${b.effect}`).join(', ')}` : '';
            log.push(`    - ${p.name} [${p.type || 'N/A'}] Lv.${p.level}->Lv.${p.currentLevel}${abilitiesStr}: ${details.join(' | ')} = ${mod.toFixed(1)} => +${(mod/2).toFixed(1)}${bonusStr}`);
        }
    });

    let modA_A = 0;
    log.push(`  ATT Attaccanti (1x mod) vs [${oppTypesB2}]:`);
    playersA_A.forEach(p => {
        if (!nullifiedAbilities.has(p.id) && !injuredPlayers.has(p.id)) {
            const { mod, details, abilityBonuses } = calculatePlayerModifierWithLog(p, hasIconaA, [...playersB_D, ...playersB_C2]);
            modA_A += mod;
            const abilitiesStr = p.abilities?.length > 0 ? ` [${p.abilities.join(', ')}]` : '';
            const bonusStr = abilityBonuses?.length > 0 ? ` << ${abilityBonuses.map(b => `${b.ability}: ${b.effect}`).join(', ')}` : '';
            log.push(`    - ${p.name} [${p.type || 'N/A'}] Lv.${p.level}->Lv.${p.currentLevel}${abilitiesStr}: ${details.join(' | ')} = ${mod.toFixed(1)} => +${mod.toFixed(1)}${bonusStr}`);
        }
    });

    let modB_D = 0;
    log.push(`  DIF Difensori (1x mod) vs [${oppTypesA2}]:`);
    playersB_D.forEach(p => {
        if (!nullifiedAbilities.has(p.id) && !injuredPlayers.has(p.id)) {
            const { mod, details, abilityBonuses } = calculatePlayerModifierWithLog(p, hasIconaB, [...playersA_C2, ...playersA_A]);
            modB_D += mod;
            const abilitiesStr = p.abilities?.length > 0 ? ` [${p.abilities.join(', ')}]` : '';
            const bonusStr = abilityBonuses?.length > 0 ? ` << ${abilityBonuses.map(b => `${b.ability}: ${b.effect}`).join(', ')}` : '';
            log.push(`    - ${p.name} [${p.type || 'N/A'}] Lv.${p.level}->Lv.${p.currentLevel}${abilitiesStr}: ${details.join(' | ')} = ${mod.toFixed(1)} => +${mod.toFixed(1)}${bonusStr}`);
        }
    });

    let modB_C2 = 0;
    log.push(`  DIF Centrocampisti (1/2 mod) vs [${oppTypesA2}]:`);
    playersB_C2.forEach(p => {
        if (!nullifiedAbilities.has(p.id) && !injuredPlayers.has(p.id)) {
            const { mod, details, abilityBonuses } = calculatePlayerModifierWithLog(p, hasIconaB, [...playersA_C2, ...playersA_A]);
            modB_C2 += mod / 2;
            const abilitiesStr = p.abilities?.length > 0 ? ` [${p.abilities.join(', ')}]` : '';
            const bonusStr = abilityBonuses?.length > 0 ? ` << ${abilityBonuses.map(b => `${b.ability}: ${b.effect}`).join(', ')}` : '';
            log.push(`    - ${p.name} [${p.type || 'N/A'}] Lv.${p.level}->Lv.${p.currentLevel}${abilitiesStr}: ${details.join(' | ')} = ${mod.toFixed(1)} => +${(mod/2).toFixed(1)}${bonusStr}`);
        }
    });

    const rollA2 = rollDice(1, 20);
    const rollB2 = rollDice(1, 20);
    const coachA2 = (attackingTeam.coachLevel || 1) / 2;
    const coachB2 = (defendingTeam.coachLevel || 1) / 2;

    const totalA2 = rollA2 + modA_C2 + modA_A + coachA2;
    const totalB2 = rollB2 + modB_D + modB_C2 + coachB2;
    const attackResult = totalA2 - totalB2;

    log.push(`  ---`);
    log.push(`  ATT: dado=${rollA2} + cenMod=${modA_C2.toFixed(1)} + attMod=${modA_A.toFixed(1)} + coach=${coachA2.toFixed(1)} = ${totalA2.toFixed(1)}`);
    log.push(`  DIF: dado=${rollB2} + difMod=${modB_D.toFixed(1)} + cenMod=${modB_C2.toFixed(1)} + coach=${coachB2.toFixed(1)} = ${totalB2.toFixed(1)}`);
    log.push(`  Risultato attacco: ${attackResult.toFixed(1)}`);

    if (attackResult < 0) {
        const luckyRoll = rollPercentage();
        if (luckyRoll <= 5) {
            log.push(`  FALLITO ma 5% fortuna attivato (roll: ${luckyRoll}) => risultato forzato a 5`);
        } else {
            log.push(`  => FASE 2 FALLITA - Occasione persa`);
            return { goal: false, log };
        }
    } else {
        log.push(`  => FASE 2 SUPERATA (risultato: ${Math.max(1, attackResult).toFixed(1)})`);
    }

    const finalAttackResult = attackResult < 0 ? 5 : Math.max(1, attackResult);

    // ===== FASE 3: TIRO =====
    log.push(`\n[FASE 3: TIRO vs PORTIERE]`);

    const portiere = defendingTeam.P?.[0];
    if (!portiere) {
        log.push(`  Nessun portiere! => GOL AUTOMATICO`);
        return { goal: true, log };
    }

    const { mod: modPortiereBase, details: portiereDetails, abilityBonuses: portiereAbilityBonuses } = calculatePlayerModifierWithLog(portiere, hasIconaB, playersA_A);
    let modPortiere = modPortiereBase;
    const portiereAbilitiesStr = portiere.abilities?.length > 0 ? ` [${portiere.abilities.join(', ')}]` : '';
    const portiereBonusStr = portiereAbilityBonuses?.length > 0 ? ` << ${portiereAbilityBonuses.map(b => `${b.ability}: ${b.effect}`).join(', ')}` : '';
    log.push(`  Portiere: ${portiere.name} [${portiere.type || 'N/A'}] Lv.${portiere.level}->Lv.${portiere.currentLevel}${portiereAbilitiesStr}`);
    log.push(`    calcolo: ${portiereDetails.join(' | ')} = ${modPortiere.toFixed(1)}${portiereBonusStr}`);

    // Abilita' portiere
    let kamikazeActive = false;
    if (portiere.abilities?.includes('Uscita Kamikaze') && !nullifiedAbilities.has(portiere.id)) {
        modPortiere *= 2;
        kamikazeActive = true;
        log.push(`    Uscita Kamikaze: mod x2 => ${modPortiere.toFixed(1)}`);
    }
    if (portiere.abilities?.includes('Pugno di ferro') && !nullifiedAbilities.has(portiere.id)) {
        log.push(`    Pugno di ferro: soglia parata -2`);
    }

    const rollP = rollDice(1, 20);
    const coachP = (defendingTeam.coachLevel || 1) / 2;
    const totalPortiere = rollP + modPortiere + coachP;

    // Bomber bonus
    let attackBonus = 0;
    if (attackingTeam.A?.some(p => p.abilities?.includes('Bomber') && !nullifiedAbilities.has(p.id))) {
        attackBonus = 1;
        log.push(`  Bomber attivo: +1 al tiro`);
    }

    const effectiveAttack = finalAttackResult + attackBonus;
    const saveResult = totalPortiere - effectiveAttack;
    const saveThreshold = portiere.abilities?.includes('Pugno di ferro') ? -2 : 0;

    log.push(`  ---`);
    log.push(`  TIRO: risultato attacco=${finalAttackResult.toFixed(1)} + bonus=${attackBonus} = ${effectiveAttack.toFixed(1)}`);
    log.push(`  PARATA: dado=${rollP} + mod=${modPortiere.toFixed(1)} + coach=${coachP.toFixed(1)} = ${totalPortiere.toFixed(1)}`);
    log.push(`  Differenza parata: ${saveResult.toFixed(1)} (soglia: ${saveThreshold})`);

    let goal = false;
    if (saveResult > saveThreshold) {
        log.push(`  => PARATA! (${saveResult.toFixed(1)} > ${saveThreshold})`);
        const luckyGoal = rollPercentage();
        if (luckyGoal <= 5) {
            log.push(`  Ma 5% gol fortunato attivato (roll: ${luckyGoal}) => GOL!`);
            goal = true;
        }
    } else if (saveResult === saveThreshold) {
        const fiftyFifty = rollPercentage();
        const hasOpportunista = attackingTeam.A?.some(p => p.abilities?.includes('Opportunista'));
        const goalChance = hasOpportunista ? 75 : 50;
        log.push(`  => 50/50! Roll: ${fiftyFifty} ${fiftyFifty <= goalChance ? '<=' : '>'} ${goalChance}%`);
        goal = fiftyFifty <= goalChance;
    } else {
        log.push(`  => GOL! (${saveResult.toFixed(1)} < ${saveThreshold})`);
        goal = true;

        // Miracolo check
        if (portiere.abilities?.includes('Miracolo') && Math.abs(saveResult) < 3) {
            const miracoloRoll = rollPercentage();
            if (miracoloRoll <= 5) {
                log.push(`  MIRACOLO! (roll: ${miracoloRoll}) => PARATA!`);
                goal = false;
            }
        }
    }

    log.push(`\n  *** RISULTATO: ${goal ? 'GOL!' : 'PARATO/FALLITO'} ***`);

    return { goal, log };
};

// ====================================================================
// ESPOSIZIONE GLOBALE
// ====================================================================

window.simulationLogic = {
    simulateOneOccasion,
    simulateOneOccasionWithLog,
    resetSimulationState,
    calculatePlayerModifier,
    calculateGroupModifier,
    rollDice,
    LEVEL_MODIFIERS
};

console.log("Simulazione.js v3.1 caricato - 60 abilita + log dettagliato");
