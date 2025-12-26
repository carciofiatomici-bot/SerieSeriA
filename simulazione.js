//
// ====================================================================
// MODULO SIMULAZIONE.JS (Motore Completo - Versione 3.1)
// ====================================================================
//
// Implementa:
// - Modificatori livello (1-30)
// - Sistema forma giocatori
// - Bonus/malus tipologie (Potenza -25% Tecnica, ecc.)
// - 60+ abilità complete
// - Livello allenatore (+1/2 in tutte le fasi)
// - Icona (+1 a tutti 50%, forma sempre positiva)
// - Nuove abilità v3.0: Presa Sicura, Muro Psicologico, Miracolo,
//   Freddezza, Lento a carburare, Soggetto a infortuni, Spazzata,
//   Adattabile, Salvataggio sulla Linea, Passaggio Corto,
//   Visione di Gioco, Tuttocampista, Egoista, Opportunista,
//   Tiro a Giro, Immarcabile
// - Abilità Uniche Icone v3.1: Fatto d'acciaio, L'uomo in più,
//   Tiro Dritto, Avanti un altro, Contrasto di gomito,
//   Calcolo delle probabilità, Continua a provare, Stazionario,
//   Osservatore, Relax, Scheggia impazzita, Assist-man
//
// ====================================================================

// REPLAY TRACKING
if (typeof window !== "undefined") { window.replayActions = []; }

// ====================================================================
// COSTANTI E CONFIGURAZIONE
// ====================================================================

/**
 * Mappa modificatori per livello (Regola 2 - AGGIORNATA v4.0)
 * Progressione: +0.5 ogni 2 livelli, bonus finale al livello 29-30
 */
const LEVEL_MODIFIERS = {
    1: 0.5, 2: 0.5,
    3: 1.0, 4: 1.0,
    5: 1.5, 6: 1.5,
    7: 2.0, 8: 2.0,
    9: 2.5, 10: 2.5,
    11: 3.0, 12: 3.0,
    13: 3.5, 14: 3.5,
    15: 4.0, 16: 4.0,
    17: 4.5, 18: 4.5,
    19: 5.0, 20: 5.0,
    21: 5.5, 22: 5.5,
    23: 6.0, 24: 6.0,
    25: 6.5, 26: 6.5,
    27: 7.0, 28: 7.0,
    29: 8.0, 30: 9.0
};

/**
 * Vantaggi tipologia (Regola 5 - AGGIORNATA v4.0)
 * Sistema Sasso-Carta-Forbice con bonus/malus fisso
 * Potenza > Tecnica > Velocita > Potenza
 */
const TYPE_ADVANTAGE = {
    'Potenza': 'Tecnica',    // Potenza batte Tecnica
    'Tecnica': 'Velocita',   // Tecnica batte Velocità
    'Velocita': 'Potenza'    // Velocità batte Potenza
};

// Bonus/Malus tipologia (valori assoluti, non percentuali)
const TYPE_ADVANTAGE_BONUS = 2.5;   // Chi vince il confronto tipologia
const TYPE_ADVANTAGE_MALUS = -2.5;  // Chi perde il confronto tipologia

/**
 * Calcola bonus/malus tipologia per un giocatore
 * @param {string} playerType - Tipologia del giocatore (Potenza/Tecnica/Velocita)
 * @param {string} opponentType - Tipologia dell'avversario
 * @returns {number} Bonus (+2.5), Malus (-2.5) o 0 se stesso tipo
 */
const getTypeModifier = (playerType, opponentType) => {
    if (!playerType || !opponentType || playerType === opponentType) return 0;

    // Il giocatore batte l'avversario?
    if (TYPE_ADVANTAGE[playerType] === opponentType) {
        return TYPE_ADVANTAGE_BONUS; // +2.5
    }
    // L'avversario batte il giocatore?
    if (TYPE_ADVANTAGE[opponentType] === playerType) {
        return TYPE_ADVANTAGE_MALUS; // -2.5
    }
    return 0;
};

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

/**
 * Ottieni bonus/malus formazione per una specifica fase
 * @param {Object} teamData - Dati della squadra (con formation.modulo e formationXp)
 * @param {string} fase - 'costruzione', 'difesa', o 'tiro'
 * @returns {number} Bonus/malus da applicare
 */
const getFormationBonus = (teamData, fase) => {
    // Controlla se il feature flag e' abilitato
    if (!window.FeatureFlags?.isEnabled('formationXp')) return 0;

    const modulo = teamData?.formation?.modulo || '1-1-2-1';
    const formationXp = teamData?.formationXp || {};
    const xp = formationXp[modulo] || 0;

    const modifiers = window.GestioneSquadreConstants?.FORMATION_MODIFIERS;
    if (!modifiers) return 0;

    const level = modifiers.getLevelFromXP(xp);
    const bonuses = modifiers.getModifiers(modulo, level);

    switch(fase) {
        case 'costruzione': return bonuses.fase1 || 0;
        case 'difesa': return bonuses.fase2Dif || 0;
        case 'tiro': return bonuses.fase3 || 0;
        default: return 0;
    }
};

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

// Tracciamento "Teletrasporto" - max 5 attivazioni per partita
let teletrasportoCount = { teamA: 0, teamB: 0 };

// Flag per "Forma Smagliante" - giocatori già processati
let formaSmaglianteApplied = new Set();

// ========================================
// TRACCIAMENTO ABILITÀ UNICHE ICONE
// ========================================

// "Icona" - 50% bonus attivo per partita (determinato a inizio partita)
let iconaBonusActive = { teamA: false, teamB: false };

// "L'uomo in più" (Fosco) - max 5 attivazioni per partita
let uomoInPiuCount = { teamA: 0, teamB: 0 };

// "Stazionario" (Cocco) - bonus accumulato per fase saltata
let stazionarioBonus = {}; // { odine: 0.0 }

// "Relax" (Sandro) - modificatore dinamico
let relaxModifier = {}; // { odine: 0 }

// "Scheggia impazzita" (Bemolle) - bonus accumulato per Fase 2
let scheggiaBonus = {}; // { odine: 0.0 }

// "Assist-man" (Meliodas) - assist fatti in partita
let assistManCount = {}; // { odine: 0 }

// "Assist-man" - flag per catena fasi
let assistManChain = { active: false, odine: null };

// "Parata Laser" (Simone) - bonus cumulativo per parate (max 5, resetta con goal)
let parataLaserBonus = {}; // { odine: 0 }

// "Continua a provare" (Gladio) - bonus per fasi fallite (+0.5 per fase, max +6.0)
let continuaProvareBonus = {}; // { odine: 0.0 }

// "Tiro Dritto" (Amedemo) - goal segnati (bonus cala -0.5 per goal)
let tiroDrittoGoals = {}; // { odine: 0 }

// ========================================
// TRACCIAMENTO ABILITÀ GENERALI
// ========================================

// Punteggio corrente partita (per Rivalsa, Demotivato)
let currentScore = { teamA: 0, teamB: 0 };

// "Lunatico" - bonus/malus determinato a inizio partita (1d6: 1=-1, 6=+1, altro=0)
let lunaticoModifier = {}; // { odine: -1/0/+1 }

// "Guerriero" (Portiere) - +1 per 3 occasioni dopo aver subito goal
let guerrieroOccasionsLeft = {}; // { odine: 0 }

// "Rilancio Laser" (Portiere) - +2 in Fase 1 dopo parata
let rilancioLaserActive = { teamA: false, teamB: false };

// "Regista Difensivo" (Portiere) - skip Fase 1 + bonus +2 dopo parata
let registaDifensivoActive = { teamA: false, teamB: false };

// "Regista" (Centrocampista) - +2 al ricevente dopo skip costruzione
let registaSkipBonus = { teamA: false, teamB: false };

// "Motore" (Centrocampista) - +2 alla prossima fase dopo Fase 1
let motoreBonus = {}; // { odine: true } - giocatori con Motore che hanno partecipato a Fase 1

// "Saracinesca" (Portiere) - 0% critico avversario dopo aver subito goal
let saracinescaActive = {}; // { odine: true }

// Flag se la fase costruzione e' stata saltata (per Distratto)
let constructionSkipped = false;

// "Piantagrane" - compagno penalizzato (determinato a inizio partita)
let piantagraneVictim = {}; // { odine: victimId }

// "Contrattura Cronica" - conta partecipazioni per giocatore
let partecipazioni = {}; // { odine: 0 }

// Numero totale occasioni partita (per Veterano - ultime 5)
let totalOccasionsInMatch = 30; // default 30 occasioni

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
 * - Icona (+1 se c'è l'Icona in squadra E il 50% è passato)
 * - Tipologia vs avversari (-25% se svantaggiato)
 *
 * @param {Object} player - Giocatore
 * @param {boolean} hasIcona - Se la squadra ha l'Icona
 * @param {Array} opposingPlayers - Giocatori avversari in questa fase
 * @param {string} teamKey - 'teamA' o 'teamB' (opzionale, per bonus Icona 50%)
 * @returns {number} Modificatore finale
 */
const calculatePlayerModifier = (player, hasIcona, opposingPlayers = [], teamKey = null) => {
    // Abilità nullificata?
    if (nullifiedAbilities.has(player.id)) {
        return 0;
    }

    // Giocatore infortunato? (Soggetto a infortuni)
    // Indistruttibile e Fatto d'acciaio: non possono essere infortunati
    if (injuredPlayers.has(player.id) &&
        !player.abilities?.includes('Indistruttibile') &&
        !player.abilities?.includes("Fatto d'acciaio")) {
        return 0;
    }

    // Calcola livello effettivo considerando penalita fuori ruolo (-15% arrotondato per difetto)
    let effectiveLevel = player.level || 1;
    let outOfPositionPenalty = 0.85; // -15% default

    // Multiruolo: ignora completamente la penalita fuori ruolo
    const hasMultiruolo = player.abilities?.includes('Multiruolo');

    // Non Adattabile: raddoppia il malus fuori ruolo
    if (player.abilities?.includes('Non Adattabile') && !hasMultiruolo) {
        outOfPositionPenalty = 0.70; // -30% invece di -15%
    }

    if (player.assignedPosition && player.assignedPosition !== player.role && !hasMultiruolo) {
        effectiveLevel = Math.floor(effectiveLevel * outOfPositionPenalty);
    }

    // Livello base (limitato a 1-30)
    const baseLevel = Math.min(30, Math.max(1, effectiveLevel));
    let modifier = LEVEL_MODIFIERS[baseLevel] || 1.0;

    // Forma (currentLevel ha già il livello modificato dalla forma, limitato a 1-30)
    // Applica anche la penalita fuori ruolo alla forma (tranne Multiruolo)
    if (player.currentLevel !== undefined) {
        let effectiveCurrentLevel = player.currentLevel;
        if (player.assignedPosition && player.assignedPosition !== player.role && !hasMultiruolo) {
            effectiveCurrentLevel = Math.floor(effectiveCurrentLevel * 0.85);
        }
        const clampedLevel = Math.min(30, Math.max(1, effectiveCurrentLevel));
        modifier = LEVEL_MODIFIERS[clampedLevel] || modifier;
    }

    // Freddezza: la forma non puo mai essere negativa (solo per abilita Freddezza, NON per Icone)
    if (player.abilities?.includes('Freddezza')) {
        const formaDiff = (player.currentLevel || player.level) - (player.level || 1);
        if (formaDiff < 0) {
            // Ricalcola senza malus forma (ma con penalita fuori ruolo se applicabile)
            let effectiveLevelForFreddezza = player.level || 1;
            if (player.assignedPosition && player.assignedPosition !== player.role) {
                effectiveLevelForFreddezza = Math.floor(effectiveLevelForFreddezza * outOfPositionPenalty);
            }
            modifier = LEVEL_MODIFIERS[effectiveLevelForFreddezza] || 1.0;
        }
    }

    // Forma Smagliante: se forma negativa a inizio partita, diventa +1
    if (player.abilities?.includes('Forma Smagliante') && !formaSmaglianteApplied.has(player.id)) {
        const formaDiff = (player.currentLevel || player.level) - (player.level || 1);
        if (formaDiff < 0) {
            modifier += 1; // Bonus +1 invece della forma negativa
            formaSmaglianteApplied.add(player.id);
        }
    }

    // Non Adattabile: -2 al modificatore permanente
    if (player.abilities?.includes('Non Adattabile')) {
        modifier -= 2;
    }

    // Icona: +1 a tutti i modificatori (se il 50% è passato a inizio partita)
    // Se teamKey è fornito, controlla iconaBonusActive; altrimenti usa hasIcona per retrocompatibilità
    if (hasIcona && !player.abilities?.includes('Icona')) {
        const iconaBonusEnabled = teamKey ? iconaBonusActive[teamKey] : hasIcona;
        if (iconaBonusEnabled) {
            modifier += 1.0;
        }
    }

    // NOTA: L'Icona NON riceve bonus a se stessa, solo ai compagni
    // Le Icone ora possono avere forma negativa (range -2 a +4)

    // Capitano nominato: +1 aggiuntivo (diverso dall'Icona)
    if (player.isCaptain === true) {
        modifier += 1.0;
    }

    // Lento a carburare: -3 malus nelle prime 5 occasioni
    if (player.abilities?.includes('Lento a carburare') && currentOccasionNumber <= 5) {
        modifier -= 3;
    }

    // Talento Precoce: +1.5 fisso al modificatore (livello max 18 gestito altrove)
    if (player.abilities?.includes('Talento Precoce')) {
        modifier += 1.5;
    }

    // Veterano: +1.5 nelle ultime 5 occasioni della partita
    if (player.abilities?.includes('Veterano')) {
        const lastOccasions = totalOccasionsInMatch - 5; // es. 35 se totale e' 40
        if (currentOccasionNumber > lastOccasions) {
            modifier += 1.5;
        }
    }

    // Effetto tipologia vs avversari (Regola 5 - AGGIORNATA v4.0)
    // Bonus/Malus fisso: +1.5 se vince, -1.5 se perde il confronto tipologia
    // Adattabile: ignora il malus tipologia
    if (player.type && opposingPlayers.length > 0) {
        // Trova l'avversario principale (primo con tipo definito)
        const mainOpponent = opposingPlayers.find(opp => opp.type);
        if (mainOpponent) {
            let typeBonus = getTypeModifier(player.type, mainOpponent.type);

            // Adattabile: ignora solo il malus, tiene il bonus
            if (player.abilities?.includes('Adattabile') && typeBonus < 0) {
                typeBonus = 0;
            }

            // Camaleonte: inverte l'esito del confronto tipologia
            if (player.abilities?.includes('Camaleonte') && typeBonus !== 0) {
                typeBonus = -typeBonus;
            }

            // Prevedibile: malus aumentato a -2.5 invece di -1.5
            if (player.abilities?.includes('Prevedibile') && typeBonus < 0) {
                typeBonus = -2.5;
            }

            modifier += typeBonus;
        }
    }

    // Tuttocampista: conta come tutte le tipologie, quindi gli avversari subiscono sempre -1.5
    // (La logica è gestita nella funzione opposingPlayers)

    // Bonus equipaggiamento (solo oggetti con fase "tutte" o corrispondente)
    if (window.FeatureFlags?.isEnabled('marketObjects') && player.equipment) {
        const equipmentBonus = calculateEquipmentBonus(player.equipment);
        modifier += equipmentBonus;
    }

    return modifier;
};

/**
 * Calcola il bonus totale dall'equipaggiamento di un giocatore
 * @param {Object} equipment - Oggetto equipment del giocatore
 * @param {string} phase - Fase corrente (opzionale: costruzione, attacco, difesa, portiere, tiro)
 * @param {boolean} isAttacking - Se la squadra sta attaccando (opzionale)
 * @param {boolean} excludeTutte - Se true, esclude oggetti con fase "tutte" (default: false)
 * @returns {number} Bonus totale
 */
const calculateEquipmentBonus = (equipment, phase = null, isAttacking = null, excludeTutte = false) => {
    if (!equipment) return 0;

    const SLOTS = ['cappello', 'maglia', 'guanti', 'parastinchi', 'scarpini'];
    let totalBonus = 0;

    for (const slot of SLOTS) {
        const item = equipment[slot];
        if (!item || !item.bonus) continue;

        // Verifica fase
        if (phase !== null) {
            // Se specificata una fase, applica solo se corrisponde o e' "tutte"
            if (excludeTutte) {
                // Esclude "tutte" - solo fase specifica
                if (item.phase !== phase) continue;
            } else {
                if (item.phase !== 'tutte' && item.phase !== phase) continue;
            }
        } else {
            // Se non specificata fase, applica solo oggetti con fase "tutte"
            if (item.phase !== 'tutte') continue;
        }

        // Verifica attacco/difesa
        if (isAttacking !== null && item.applyTo !== 'both') {
            if (item.applyTo === 'attack' && !isAttacking) continue;
            if (item.applyTo === 'defense' && isAttacking) continue;
        }

        totalBonus += item.bonus;
    }

    return totalBonus;
};

// ====================================================================
// GESTIONE ABILITÀ
// ====================================================================

/**
 * Applica le abilità PRIMA della fase (modifiche ai modificatori)
 * @param {string} teamKey - 'teamA' o 'teamB' per tracking bonus
 */
const applyPrePhaseAbilities = (team, opposingTeam, phase, teamKey = 'teamA') => {
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

    // Regista (Centrocampista): 5% skip costruzione, +2 al ricevente
    if (phase === 'construction') {
        const hasRegista = team.C?.some(p =>
            p.abilities?.includes('Regista') &&
            !nullifiedAbilities.has(p.id)
        );
        if (hasRegista && checkChance(5)) {
            modifiers.skipPhase = true;
            // Attiva bonus +2 per il ricevente in Fase 2
            registaSkipBonus[teamKey] = true;
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

    // CONTRASTO DI GOMITO (Luka): 1% fail automatico fase avversaria (solo difesa)
    if ((phase === 'construction' || phase === 'attack')) {
        const allDefenders = [...(opposingTeam.D || []), ...(opposingTeam.C || []), ...(opposingTeam.P || [])];
        const hasContrastoGomito = allDefenders.some(p =>
            p.abilities?.includes('Contrasto di gomito') &&
            !nullifiedAbilities.has(p.id)
        );
        if (hasContrastoGomito && checkChance(1)) {
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
 * @param {Array} players - Giocatori del gruppo
 * @param {boolean} isHalf - Se il modificatore va dimezzato
 * @param {Object} team - Squadra corrente
 * @param {Array} opposingTeam - Giocatori avversari
 * @param {string} phase - Fase corrente (construction, attack, shot)
 * @param {boolean} isAttacking - Se la squadra sta attaccando (default: true)
 */
const calculateGroupModifier = (players, isHalf, team, opposingTeam, phase, isAttacking = true) => {
    if (!players || players.length === 0) return 0;

    const hasIcona = team.formationInfo?.isIconaActive || false;
    let totalModifier = 0;

    // Mappa fasi simulazione -> fasi equipaggiamento
    const PHASE_MAP = {
        'construction': 'costruzione',
        'attack': isAttacking ? 'attacco' : 'difesa',
        'shot': isAttacking ? 'tiro' : 'portiere'
    };
    const equipmentPhase = PHASE_MAP[phase] || null;

    // Conta Bandiera del club per ruolo
    const bandiereCount = {};

    for (const player of players) {
        if (nullifiedAbilities.has(player.id)) continue;

        // Soggetto a infortuni: 0.5% di infortunarsi per ogni fase
        // FATTO D'ACCIAIO e INDISTRUTTIBILE: immuni agli infortuni
        if (player.abilities?.includes('Soggetto a infortuni') &&
            !injuredPlayers.has(player.id) &&
            !player.abilities?.includes("Fatto d'acciaio") &&
            !player.abilities?.includes('Indistruttibile')) {
            if (checkChance(0.5)) {
                injuredPlayers.add(player.id);
                continue; // Questo giocatore non contribuisce più
            }
        }

        // Check if already injured
        if (injuredPlayers.has(player.id)) continue;

        // Tuttocampista: conta come tutte le tipologie, impone sempre -1.5 agli avversari
        // LOGICA: Se un avversario ha Tuttocampista, forziamo il malus tipologia creando
        // un "avversario virtuale" con la tipologia che batte quella del giocatore corrente.
        // Esempio: se il giocatore e' Potenza (battuto da Velocita), creiamo avversario "Velocita"
        let effectiveOpposingTeam = opposingTeam;
        const hasTuttocampista = opposingTeam?.some(p => p.abilities?.includes('Tuttocampista'));
        if (hasTuttocampista && player.type) {
            // Trova chi batte questo tipo (inversione di TYPE_ADVANTAGE)
            const beatenBy = Object.keys(TYPE_ADVANTAGE).find(t => TYPE_ADVANTAGE[t] === player.type);
            if (beatenBy) {
                effectiveOpposingTeam = [{ type: beatenBy }];
            }
        }

        let mod = calculatePlayerModifier(player, hasIcona, effectiveOpposingTeam);

        // Bonus equipaggiamento fase-specifico (oltre ai bonus "tutte" già applicati in calculatePlayerModifier)
        if (window.FeatureFlags?.isEnabled('marketObjects') && player.equipment && equipmentPhase) {
            const phaseEquipBonus = calculateEquipmentBonus(player.equipment, equipmentPhase, isAttacking, true);
            mod += phaseEquipBonus;
        }

        // Effetto Caos: modificatore varia da -3 a +3
        if (player.abilities?.includes('Effetto Caos')) {
            mod += rollDice(-3, 3);
        }

        // Fortunato: 5% aggiunge +3 al modificatore
        if (player.abilities?.includes('Fortunato') && checkChance(5)) {
            mod += 3;
        }

        // ========================================
        // ABILITÀ GENERALI
        // ========================================

        // Cuore Impavido: +1.5 se gioca Fuori Casa (no bonus stadio)
        if (player.abilities?.includes('Cuore Impavido') && !team.homeBonus) {
            mod += 1.5;
        }

        // Rivalsa: +2 se in svantaggio di 2+ goal
        if (player.abilities?.includes('Rivalsa')) {
            const teamKey = team.teamKey || (team === 'teamA' ? 'teamA' : 'teamB');
            const opponentKey = teamKey === 'teamA' ? 'teamB' : 'teamA';
            const ownGoals = currentScore[teamKey] || 0;
            const opponentGoals = currentScore[opponentKey] || 0;
            if (opponentGoals - ownGoals >= 2) {
                mod += 2;
            }
        }

        // Specialista Costruzione: +1 in Fase 1 attacco, -0.5 altre fasi
        if (player.abilities?.includes('Specialista Costruzione')) {
            if (phase === 'construction' && isAttacking) {
                mod += 1;
            } else {
                mod -= 0.5;
            }
        }

        // Specialista Difesa: +1 in Fase 2 difesa, -0.5 altre fasi
        if (player.abilities?.includes('Specialista Difesa')) {
            if (phase === 'attack' && !isAttacking) {
                mod += 1;
            } else {
                mod -= 0.5;
            }
        }

        // Specialista Tiro: +1 in Fase 3 attacco, -0.5 altre fasi
        if (player.abilities?.includes('Specialista Tiro')) {
            if (phase === 'shot' && isAttacking) {
                mod += 1;
            } else {
                mod -= 0.5;
            }
        }

        // ========================================
        // ABILITÀ GENERALI NEGATIVE
        // ========================================

        // Lunatico: bonus/malus determinato a inizio partita (1d6: 1=-1, 6=+1)
        if (player.abilities?.includes('Lunatico')) {
            const playerId = player.id || player.odine;
            if (lunaticoModifier[playerId] !== undefined) {
                mod += lunaticoModifier[playerId];
            }
        }

        // Senza Fiato: -1 dopo la 30esima occasione
        if (player.abilities?.includes('Senza Fiato') && currentOccasionNumber > 30) {
            mod -= 1;
        }

        // Meteoropatico: -1 se gioca Fuori Casa (no bonus stadio)
        if (player.abilities?.includes('Meteoropatico') && !team.homeBonus) {
            mod -= 1;
        }

        // Scaramantico: modificatore 0 nelle occasioni 13-17
        if (player.abilities?.includes('Scaramantico') &&
            currentOccasionNumber >= 13 && currentOccasionNumber <= 17) {
            mod = 0;
        }

        // Sudditanza Psicologica: -1 se allenatore avversario > proprio, -0.5 se <=
        if (player.abilities?.includes('Sudditanza Psicologica')) {
            const ownCoach = team.coachLevel || 1;
            const oppCoach = opposingTeam?.coachLevel || opposingTeam?.[0]?.coachLevel || 1;
            if (oppCoach > ownCoach) {
                mod -= 1;
            } else {
                mod -= 0.5;
            }
        }

        // Vita Notturna: forma mai positiva (se forma > 0, diventa 0)
        if (player.abilities?.includes('Vita Notturna')) {
            const formaDiff = (player.currentLevel || player.level) - (player.level || 1);
            if (formaDiff > 0) {
                // Ricalcola senza bonus forma
                const baseLevel = Math.min(30, Math.max(1, player.level || 1));
                const baseMod = LEVEL_MODIFIERS[baseLevel] || 1.0;
                mod = baseMod; // Reset al modificatore base senza forma
            }
        }

        // Demotivato: -1 se squadra in svantaggio di 1+ goal
        if (player.abilities?.includes('Demotivato')) {
            const teamKey = team.teamKey || 'teamA';
            const opponentKey = teamKey === 'teamA' ? 'teamB' : 'teamA';
            const ownGoals = currentScore[teamKey] || 0;
            const opponentGoals = currentScore[opponentKey] || 0;
            if (opponentGoals > ownGoals) {
                mod -= 1;
            }
        }

        // Contrattura Cronica: mod dimezzato dopo 15 partecipazioni
        if (player.abilities?.includes('Contrattura Cronica')) {
            const playerId = player.id || player.odine;
            partecipazioni[playerId] = (partecipazioni[playerId] || 0) + 1;
            if (partecipazioni[playerId] > 15) {
                mod = mod / 2;
            }
        }

        // Lento: mod dimezzato vs Velocita
        if (player.abilities?.includes('Lento')) {
            const hasVelocita = opposingTeam?.some(p => p.type === 'Velocita');
            if (hasVelocita) {
                mod = Math.floor(mod / 2);
            }
        }

        // Debole: mod dimezzato vs Potenza
        if (player.abilities?.includes('Debole')) {
            const hasPotenza = opposingTeam?.some(p => p.type === 'Potenza');
            if (hasPotenza) {
                mod = Math.floor(mod / 2);
            }
        }

        // Impreparato: mod dimezzato vs Tecnica
        if (player.abilities?.includes('Impreparato')) {
            const hasTecnica = opposingTeam?.some(p => p.type === 'Tecnica');
            if (hasTecnica) {
                mod = Math.floor(mod / 2);
            }
        }

        // Piantagrane: il giocatore vittima subisce -1
        const playerId = player.id || player.odine;
        const isPiantagraneVictim = Object.values(piantagraneVictim).includes(playerId);
        if (isPiantagraneVictim) {
            mod -= 1;
        }

        // ========================================
        // ABILITÀ UNICHE ICONE
        // ========================================

        // AVANTI UN ALTRO (Antony): +2 in difesa Fase 2
        if (player.abilities?.includes('Avanti un altro') && phase === 'attack' && !isAttacking) {
            mod += 2;
        }

        // CONTRASTO DI GOMITO (Luka): +2 fisso in difesa
        if (player.abilities?.includes('Contrasto di gomito') && !isAttacking) {
            mod += 2;
        }

        // CONTINUA A PROVARE (Gladio): +0.5 per ogni fase fallita (max +6.0)
        if (player.abilities?.includes('Continua a provare')) {
            const playerId = player.id || player.odine;
            if (continuaProvareBonus[playerId] === undefined) {
                continuaProvareBonus[playerId] = 0;
            }
            // Applica bonus accumulato (max +6.0)
            mod += Math.min(6, continuaProvareBonus[playerId]);
        }

        // RELAX (Sandro): secondo modificatore dinamico
        if (player.abilities?.includes('Relax')) {
            const playerId = player.id || player.odine;
            if (relaxModifier[playerId] === undefined) {
                relaxModifier[playerId] = 0;
            }
            // Applica il bonus/malus accumulato
            mod += relaxModifier[playerId];
            // Aggiorna il modificatore per la prossima fase
            if (isAttacking) {
                relaxModifier[playerId] = Math.min(5, relaxModifier[playerId] + 1);
            } else {
                relaxModifier[playerId] = Math.max(-5, relaxModifier[playerId] - 1);
            }
        }

        // SCHEGGIA IMPAZZITA (Bemolle): +0.2 per ogni Fase 2 (max +5)
        if (player.abilities?.includes('Scheggia impazzita') && phase === 'attack') {
            const playerId = player.id || player.odine;
            if (scheggiaBonus[playerId] === undefined) {
                scheggiaBonus[playerId] = 0;
            }
            mod += scheggiaBonus[playerId];
            // Accumula bonus per prossima volta
            scheggiaBonus[playerId] = Math.min(5, scheggiaBonus[playerId] + 0.2);
        }

        // STAZIONARIO (Cocco): bonus accumulato per fasi saltate
        if (player.abilities?.includes('Stazionario')) {
            const playerId = player.id || player.odine;
            if (stazionarioBonus[playerId] === undefined) {
                stazionarioBonus[playerId] = 0;
            }
            // Applica bonus accumulato
            mod += stazionarioBonus[playerId];
            // Reset bonus quando partecipa
            stazionarioBonus[playerId] = 0;
        }

        // TIRO DRITTO (Amedemo): +3.5, cala di 0.5 per ogni goal realizzato con questa abilita
        if (player.abilities?.includes('Tiro Dritto') && player.role === 'A' && team.A?.length === 1) {
            const playerId = player.id || player.odine;
            const goalsScored = tiroDrittoGoals[playerId] || 0;
            const tiroDrittoBonus = Math.max(0, 3.5 - (goalsScored * 0.5)); // Minimo 0
            mod += tiroDrittoBonus;
        }

        // ASSIST-MAN (Meliodas): +1 per ogni assist fatto
        if (player.abilities?.includes('Assist-man')) {
            const playerId = player.id || player.odine;
            if (assistManCount[playerId]) {
                mod += assistManCount[playerId];
            }
        }

        // AMICI DI PANCHINA (Shikanto): +2 in attacco costruzione
        // Nota: la meccanica completa (panchina infortunato, passa abilità) è gestita altrove
        if (player.abilities?.includes('Amici di panchina')) {
            // Il bonus +2 in costruzione viene applicato in calculateGroupModifier
        }

        // Bandiera del club: +1 ai compagni dello stesso ruolo (per ogni Bandiera)
        if (player.abilities?.includes('Bandiera del club')) {
            bandiereCount[player.role] = (bandiereCount[player.role] || 0) + 1;
        }

        // Abilità specifiche per fase COSTRUZIONE
        if (phase === 'construction') {
            // Tocco di velluto (Centrocampista): 5% aggiunge +3 al modificatore
            if (player.role === 'C' && player.abilities?.includes('Tocco Di Velluto') && checkChance(5)) {
                mod += 3;
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

            // Geometra (Centrocampista): +1 se d20 pari (approssimato come 50%)
            if (player.role === 'C' && player.abilities?.includes('Geometra') && checkChance(50)) {
                mod += 1;
            }

            // Pressing Alto (Centrocampista): -1 all'avversario in Fase 1 difesa
            if (player.role === 'C' && player.abilities?.includes('Pressing Alto') && !isAttacking) {
                // Effetto applicato come malus agli avversari (gestito nel totale)
                mod += 1; // Bonus equivalente a -1 avversario
            }

            // Metronomo (Centrocampista): minimo 8 sul d20 (approssimato come +2 medio)
            if (player.role === 'C' && player.abilities?.includes('Metronomo')) {
                mod += 1; // Bonus medio equivalente
            }

            // Egoista (Centrocampista negativa): 5% sottrae mod di un compagno
            // (gestito dopo il loop dei giocatori)

            // Innamorato della palla (Centrocampista): 5% azione termina dopo vittoria
            // (Gestito nella phaseConstruction)

            // Passaggio Telefonato (Centrocampista): +1 al d20 avversario
            if (player.role === 'C' && player.abilities?.includes('Passaggio Telefonato') && isAttacking) {
                mod -= 1; // Equivalente a +1 avversario
            }

            // Amici di panchina (Shikanto): +2 in attacco costruzione
            if (player.abilities?.includes('Amici di panchina') && isAttacking) {
                mod += 2;
            }

            // Motore (Centrocampista): traccia partecipazione a Fase 1 per bonus +2 alla prossima fase
            if (player.role === 'C' && player.abilities?.includes('Motore')) {
                const playerId = player.id || player.name;
                motoreBonus[playerId] = true; // Attiva bonus per la prossima fase
            }

            // Regista Arretrato (Difensore): ritira d20 se <5 in Fase 1
            // (Gestito nella phaseConstruction come roll)
        }

        // Abilità specifiche per fase ATTACCO
        if (phase === 'attack') {
            // Muro (Difensore): 5% aggiunge +3 quando difende
            if (player.role === 'D' && player.abilities?.includes('Muro') && checkChance(5)) {
                mod += 3;
            }

            // Spazzata (Difensore): 5% +1 al modificatore
            if (player.role === 'D' && player.abilities?.includes('Spazzata') && checkChance(5)) {
                mod += 1;
            }

            // Guardia (Difensore): +3 se è l'unico difensore
            if (player.role === 'D' && player.abilities?.includes('Guardia') && players.length === 1) {
                mod += 3;
            }

            // Pivot (Attaccante): +3 se è l'unico attaccante
            if (player.role === 'A' && player.abilities?.includes('Pivot') &&
                team.A?.length === 1) {
                mod += 3;
            }

            // Doppio Scatto (Attaccante): 5% aggiunge +3 al modificatore
            if (player.role === 'A' && player.abilities?.includes('Doppio Scatto') && checkChance(5)) {
                mod += 3;
            }

            // Motore (Centrocampista): +2 se ha partecipato a Fase 1 nella stessa azione
            const playerId = player.id || player.name;
            if (player.role === 'C' && player.abilities?.includes('Motore') && motoreBonus[playerId]) {
                mod += 2;
                motoreBonus[playerId] = false; // Consuma il bonus
            }

            // Abilità negative
            // Falloso (Difensore): 5% sottrae invece di aggiungere
            if (player.role === 'D' && player.abilities?.includes('Falloso') && checkChance(5)) {
                mod *= -1;
            }

            // Insicuro (Difensore): 5% non aggiunge
            if (player.role === 'D' && player.abilities?.includes('Insicuro') && checkChance(5)) {
                mod = 0;
            }

            // Spallata (Difensore): +1 extra vs Tecnica in Fase 2
            if (player.role === 'D' && player.abilities?.includes('Spallata') && !isAttacking) {
                const hasTecnica = opposingTeam?.some(p => p.type === 'Tecnica');
                if (hasTecnica) {
                    mod += 1; // +1 extra oltre al bonus tipologia
                }
            }

            // Blocco Fisico (Difensore): +1 vs Velocita in Fase 2
            if (player.role === 'D' && player.abilities?.includes('Blocco Fisico') && !isAttacking) {
                const hasVelocita = opposingTeam?.some(p => p.type === 'Velocita');
                if (hasVelocita) {
                    mod += 1;
                }
            }

            // Intercetto (Difensore): 5% vince automaticamente vs Centrocampista
            if (player.role === 'D' && player.abilities?.includes('Intercetto') && !isAttacking) {
                const hasCentrocampista = opposingTeam?.some(p => p.role === 'C');
                if (hasCentrocampista && checkChance(5)) {
                    mod += 20; // Bonus enorme per vincere automaticamente
                }
            }

            // Muro di Gomma (Difensore): -3 al Valore Tiro se perde Fase 2
            // (Gestito nella phaseShot, qui solo flag)

            // Mastino (Difensore): copia bonus abilita avversario
            if (player.role === 'D' && player.abilities?.includes('Mastino') && !isAttacking) {
                // Cerca se avversario ha bonus da abilita >= +3
                for (const opp of (opposingTeam || [])) {
                    if (opp.abilities?.some(a => ['Doppio Scatto', 'Muro', 'Tocco Di Velluto'].includes(a))) {
                        mod += 3; // Copia il bonus +3
                        break;
                    }
                }
            }

            // Bucato (Difensore): -3 se avversario ha bonus >= +3
            if (player.role === 'D' && player.abilities?.includes('Bucato') && !isAttacking) {
                for (const opp of (opposingTeam || [])) {
                    if (opp.abilities?.some(a => ['Doppio Scatto', 'Muro', 'Tocco Di Velluto'].includes(a))) {
                        mod -= 3;
                        break;
                    }
                }
            }

            // Intercettatore (Centrocampista): +2 vs Centrocampista in Fase 2 difesa
            if (player.role === 'C' && player.abilities?.includes('Intercettatore') && !isAttacking) {
                const hasCentrocampista = opposingTeam?.some(p => p.role === 'C');
                if (hasCentrocampista) {
                    mod += 2;
                }
            }

            // Polmoni d'Acciaio (Centrocampista): +2 nelle ultime 10 occasioni
            if (player.role === 'C' && player.abilities?.includes("Polmoni d'Acciaio")) {
                const lastOccasions = totalOccasionsInMatch - 10;
                if (currentOccasionNumber > lastOccasions) {
                    mod += 2;
                }
            }

            // Diga (Centrocampista): annulla bonus tipologia avversario in Fase 2 difesa
            // (Gestito nel calcolo tipologia come flag)

            // Fantasma (Centrocampista): -1 vs squadre con livello medio superiore
            if (player.role === 'C' && player.abilities?.includes('Fantasma') && !isAttacking) {
                // Approssimato: se difende, potrebbe essere vs squadra forte
                // (Richiederebbe confronto livelli medi)
            }

            // Piedi a banana (Attaccante): 5% sottrae
            if (player.role === 'A' && player.abilities?.includes('Piedi a banana') && checkChance(5)) {
                mod *= -1;
            }

            // Eccesso di sicurezza (Attaccante): 5% non aggiunge
            if (player.role === 'A' && player.abilities?.includes('Eccesso di sicurezza') && checkChance(5)) {
                mod = 0;
            }

            // Solista (Attaccante): -2 quando partecipa a Fase 2
            if (player.role === 'A' && player.abilities?.includes('Solista') && isAttacking) {
                mod -= 2;
            }

            // Caldo (Attaccante): ignora malus forma in Fase 3
            // (Gestito in phaseShot)

            // Egoista (Attaccante negativa): 5% sottrae mod di un compagno
            // (gestito dopo il loop dei giocatori)
        }

        // Fuori Posizione (tutte tranne tiro): 2.5% regala +2 alla squadra avversaria
        if (phase !== 'shot' && player.abilities?.includes('Fuori Posizione') && checkChance(2.5)) {
            // Regala +2 agli avversari (sottratto dal proprio team = -2)
            mod = -2;
        }

        // Applica modificatore (dimezzato se richiesto)
        totalModifier += isHalf ? mod / 2 : mod;
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
                totalModifier -= victimMod; // Sottrae il modificatore del compagno
            }
        }
    }
    
    // Applica bonus Bandiera del club (ogni Bandiera da +1 ai compagni dello stesso ruolo)
    for (const role in bandiereCount) {
        const count = bandiereCount[role]; // numero di giocatori Bandiera del ruolo
        const sameRolePlayers = players.filter(p => p.role === role && !p.abilities?.includes('Bandiera del club'));
        totalModifier += sameRolePlayers.length * count; // +1 per ogni Bandiera per compagno
    }

    // Raddoppio in difesa: 5% di aggiungere il proprio mod al giocatore scelto (solo in difesa)
    if (!isAttacking) {
        const allTeamPlayers = [...(team.P || []), ...(team.D || []), ...(team.C || []), ...(team.A || [])];
        const raddoppioDifesaPlayers = allTeamPlayers.filter(p =>
            p.abilities?.includes('Raddoppio in difesa') &&
            !nullifiedAbilities.has(p.id) &&
            !injuredPlayers.has(p.id) &&
            !players.includes(p) // Non gia' nella fase
        );
        for (const player of raddoppioDifesaPlayers) {
            if (checkChance(5)) {
                const bonusMod = calculatePlayerModifier(player, hasIcona, []);
                totalModifier += bonusMod;
                break; // Solo un raddoppio per fase
            }
        }
    }

    // Raddoppio in attacco: 5% di aggiungere il proprio mod al giocatore scelto (solo in attacco)
    if (isAttacking) {
        const allTeamPlayers = [...(team.P || []), ...(team.D || []), ...(team.C || []), ...(team.A || [])];
        const raddoppioAttaccoPlayers = allTeamPlayers.filter(p =>
            p.abilities?.includes('Raddoppio in attacco') &&
            !nullifiedAbilities.has(p.id) &&
            !injuredPlayers.has(p.id) &&
            !players.includes(p) // Non gia' nella fase
        );
        for (const player of raddoppioAttaccoPlayers) {
            if (checkChance(5)) {
                const bonusMod = calculatePlayerModifier(player, hasIcona, []);
                totalModifier += bonusMod;
                break; // Solo un raddoppio per fase
            }
        }
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
    const teamAKey = teamA.teamKey || 'teamA';
    const preAbilities = applyPrePhaseAbilities(teamA, teamB, 'construction', teamAKey);

    // Regista Difensivo: skip Fase 1 + bonus +2 in Fase 2 (attivato dalla parata precedente)
    if (registaDifensivoActive[teamAKey]) {
        registaDifensivoActive[teamAKey] = false;
        constructionSkipped = true;
        return true; // Skip costruzione, bonus +2 gestito in Fase 2
    }

    // Skip fase?
    if (preAbilities.skipPhase) {
        constructionSkipped = true;
        return true;
    }

    // Reset flag constructionSkipped
    constructionSkipped = false;

    // Interrupt fase?
    if (preAbilities.interruptPhase) return false;
    
    // Calcola modificatori
    // Squadra A: 1/2 D + 1 C (attacca)
    // Squadra B: 1 C (difende)
    const modA_D = calculateGroupModifier(teamA.D, true, teamA, teamB.C || [], 'construction', true);
    const modA_C = calculateGroupModifier(teamA.C, false, teamA, teamB.C || [], 'construction', true);
    const modB_C = calculateGroupModifier(teamB.C, false, teamB, [...(teamA.D || []), ...(teamA.C || [])], 'construction', false);
    
    // Teletrasporto portiere?
    if (preAbilities.specialEffects.teletrasporto) {
        const portiereBonus = calculatePlayerModifier(preAbilities.specialEffects.teletrasporto, teamA.formationInfo?.isIconaActive, teamB.C || []);
        modA_C += portiereBonus / 2;
    }
    
    // Roll + coach bonus (Regola 6: +1/2 livello allenatore)
    let rollA = rollDice(1, 20);
    let rollB = rollDice(1, 20);

    // CALCOLO DELLE PROBABILITÀ (Il Cap): 2d20 e prende il migliore in Fase 1
    const allPlayersA = [...(teamA.D || []), ...(teamA.C || [])];
    const hasCalcoloProbabilita = allPlayersA.some(p =>
        p.abilities?.includes('Calcolo delle probabilita') &&
        !nullifiedAbilities.has(p.id)
    );
    if (hasCalcoloProbabilita) {
        const roll2 = rollDice(1, 20);
        rollA = Math.max(rollA, roll2);
    }

    // CONTINUA A PROVARE (Gladio): tira 2d20 e fa la media
    const hasContinuaProvareA = allPlayersA.some(p =>
        p.abilities?.includes('Continua a provare') &&
        !nullifiedAbilities.has(p.id)
    );
    if (hasContinuaProvareA && !hasCalcoloProbabilita) {
        const roll2 = rollDice(1, 20);
        rollA = Math.round((rollA + roll2) / 2);
    }

    const allPlayersB = [...(teamB.C || [])];
    const hasContinuaProvareB = allPlayersB.some(p =>
        p.abilities?.includes('Continua a provare') &&
        !nullifiedAbilities.has(p.id)
    );
    if (hasContinuaProvareB) {
        const roll2 = rollDice(1, 20);
        rollB = Math.round((rollB + roll2) / 2);
    }

    const coachA = (teamA.coachLevel || 1) / 2;
    const coachB = (teamB.coachLevel || 1) / 2;

    // Home bonus (Stadio) - applicato alla squadra che ha il campo homeBonus
    const homeBonusA = teamA.homeBonus || 0;
    const homeBonusB = teamB.homeBonus || 0;

    // Bonus figurine uniche (+0.01 per figurina unica)
    const figurineBonusA = teamA.figurineBonus || 0;
    const figurineBonusB = teamB.figurineBonus || 0;

    // Rilancio Laser: +2 in Fase 1 dopo parata del proprio portiere
    let rilancioBonus = 0;
    if (rilancioLaserActive[teamAKey]) {
        rilancioBonus = 2;
        rilancioLaserActive[teamAKey] = false;
    }

    // Bonus formazione (Fase 1: Costruzione)
    const formationBonusA = getFormationBonus(teamA, 'costruzione');

    const totalA = rollA + modA_D + modA_C + coachA + homeBonusA + figurineBonusA + rilancioBonus + formationBonusA;
    const totalB = rollB + modB_C + coachB + homeBonusB + figurineBonusB;

    // Calcola % successo
    const successChance = Math.max(5, Math.min(95, totalA - totalB + 50)); // Centrato a 50%

    // Roll 1d100
    let success = checkChance(successChance);

    // L'UOMO IN PIÙ (Fosco): se fase fallisce, aggiungi +3 e ricontrolla (max 5x per partita)
    if (!success) {
        const teamKey = 'teamA'; // Sempre teamA attacca in questa funzione
        const allPlayers = [...(teamA.D || []), ...(teamA.C || []), ...(teamA.A || [])];
        const uomoInPiuPlayer = allPlayers.find(p =>
            p.abilities?.includes("L'uomo in piu") &&
            !nullifiedAbilities.has(p.id)
        );

        if (uomoInPiuPlayer && uomoInPiuCount[teamKey] < 5) {
            const bonusMod = 3; // +3 fisso invece di meta modificatore
            const newTotalA = totalA + bonusMod;
            const newSuccessChance = Math.max(5, Math.min(95, newTotalA - totalB + 50));
            success = checkChance(newSuccessChance);
            uomoInPiuCount[teamKey]++;
        }
    }

    // 2% di passare comunque (bilanciamento v4.1: ridotto da 5%)
    if (!success && checkChance(2)) return true;

    return success;
};

// ====================================================================
// FASE 2: ATTACCO VS DIFESA
// ====================================================================

const phaseAttack = (teamA, teamB) => {
    const teamAKey = teamA.teamKey || 'teamA';
    const preAbilities = applyPrePhaseAbilities(teamA, teamB, 'attack', teamAKey);

    // Interrupt fase?
    if (preAbilities.interruptPhase) return -1;

    // Bonus +2 da Regista (skip costruzione) - applicato al ricevente
    let registaBonus = 0;
    if (registaSkipBonus[teamAKey]) {
        registaBonus = 2;
        registaSkipBonus[teamAKey] = false;
    }

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
    // Squadra A: 1/2 C + 1 A (attacca)
    // Squadra B: 1 D + 1/2 C (difende)
    const modA_C = calculateGroupModifier(teamA.C, true, teamA, [...(teamB.D || []), ...(teamB.C || [])], 'attack', true);
    const modA_A = calculateGroupModifier(teamA.A, false, teamA, [...(teamB.D || []), ...(teamB.C || [])], 'attack', true);
    const modB_D = calculateGroupModifier(teamB.D, false, teamB, [...(teamA.C || []), ...(teamA.A || [])], 'attack', false);
    const modB_C = calculateGroupModifier(teamB.C, true, teamB, [...(teamA.C || []), ...(teamA.A || [])], 'attack', false);
    
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

    // CONTINUA A PROVARE (Gladio): tira 2d20 e fa la media
    const allPlayersA2 = [...(teamA.C || []), ...(teamA.A || [])];
    const hasContinuaProvareA2 = allPlayersA2.some(p =>
        p.abilities?.includes('Continua a provare') &&
        !nullifiedAbilities.has(p.id)
    );
    if (hasContinuaProvareA2 && !hasImmarcabile) {
        const roll2 = rollDice(1, 20);
        rollA = Math.round((rollA + roll2) / 2);
    }

    let rollB = rollDice(1, 20);

    const allPlayersB2 = [...(teamB.D || []), ...(teamB.C || [])];
    const hasContinuaProvareB2 = allPlayersB2.some(p =>
        p.abilities?.includes('Continua a provare') &&
        !nullifiedAbilities.has(p.id)
    );
    if (hasContinuaProvareB2) {
        const roll2 = rollDice(1, 20);
        rollB = Math.round((rollB + roll2) / 2);
    }

    const coachA = (teamA.coachLevel || 1) / 2;
    const coachB = (teamB.coachLevel || 1) / 2;

    // Home bonus (Stadio)
    const homeBonusA = teamA.homeBonus || 0;
    const homeBonusB = teamB.homeBonus || 0;

    // Bonus figurine uniche (+0.01 per figurina unica)
    const figurineBonusA = teamA.figurineBonus || 0;
    const figurineBonusB = teamB.figurineBonus || 0;

    // Bonus formazione (Fase 2: Attacco/Difesa)
    const formationBonusA = getFormationBonus(teamA, 'costruzione'); // Attaccanti usano bonus costruzione in attacco
    const formationBonusB = getFormationBonus(teamB, 'difesa');

    const totalA = rollA + modA_C + modA_A + coachA + homeBonusA + figurineBonusA + registaBonus;
    const totalB = rollB + modB_D + modB_C + coachB + homeBonusB + figurineBonusB + formationBonusB;

    let result = totalA - totalB;

    // Se >= 0 passa
    if (result >= 0) return Math.max(1, result);

    // L'UOMO IN PIÙ (Fosco): se fase fallisce, aggiungi +3 e ricontrolla (max 5x per partita)
    const teamKey = 'teamA';
    const allPlayersUomo = [...(teamA.C || []), ...(teamA.A || [])];
    const uomoInPiuPlayer = allPlayersUomo.find(p =>
        p.abilities?.includes("L'uomo in piu") &&
        !nullifiedAbilities.has(p.id)
    );

    if (uomoInPiuPlayer && uomoInPiuCount[teamKey] < 5) {
        const bonusMod = 3; // +3 fisso invece di meta modificatore
        const newResult = result + bonusMod;
        if (newResult >= 0) {
            uomoInPiuCount[teamKey]++;
            return Math.max(1, newResult);
        }
        uomoInPiuCount[teamKey]++;
    }

    // Se < 0, 5% di passare comunque con risultato 5
    if (checkChance(5)) return 5;

    return -1;
};

// ====================================================================
// FASE 3: TIRO VS PORTIERE
// Formula: [1d20 + Mod. Portiere] - [1d10 + Valore Tiro Fase 2]
// ====================================================================

const phaseShot = (teamA, teamB, attackResult) => {
    if (!teamB.P || teamB.P.length === 0) return true; // No portiere = gol

    const portiere = teamB.P[0];

    // Tiro fulmineo (Attaccante): 5% annulla abilità portiere
    const hasTiroFulmineo = teamA.A?.some(p => p.abilities?.includes('Tiro Fulmineo') && !nullifiedAbilities.has(p.id));
    if (hasTiroFulmineo && checkChance(5)) {
        nullifiedAbilities.add(portiere.id);
    }

    // OSSERVATORE (Mark Falco): annulla abilità attaccante, guadagna bonus rarita (C+1, R+2, E+3, L+4, min +1)
    let osservatoreBonus = 0;
    let osservatoreActive = false;
    if (portiere.abilities?.includes('Osservatore') && !nullifiedAbilities.has(portiere.id)) {
        osservatoreActive = true;
        // Mappa rarita: Comune +1, Rara +2, Epica +3, Leggendaria/Unica +4
        const RARITY_VALUES = { 'Comune': 1, 'Rara': 2, 'Epica': 3, 'Leggendaria': 4, 'Unica': 4 };
        let highestRarity = 0;
        let highestAbilityOwner = null;

        // Trova abilità più rara tra gli attaccanti
        for (const attacker of (teamA.A || [])) {
            if (nullifiedAbilities.has(attacker.id)) continue;
            for (const ability of (attacker.abilities || [])) {
                const abilityData = window.AbilitiesEncyclopedia?.abilities?.[ability];
                if (abilityData) {
                    const rarityValue = RARITY_VALUES[abilityData.rarity] || 0;
                    if (rarityValue > highestRarity) {
                        highestRarity = rarityValue;
                        highestAbilityOwner = attacker;
                    }
                }
            }
        }

        if (highestAbilityOwner && highestRarity > 0) {
            nullifiedAbilities.add(highestAbilityOwner.id);
            osservatoreBonus = highestRarity; // Bonus pari alla rarita
        } else {
            osservatoreBonus = 1; // Minimo +1 anche se non annulla nulla
        }
    }

    // Modificatore portiere
    let modPortiere = calculatePlayerModifier(portiere, teamB.formationInfo?.isIconaActive, teamA.A || []);

    // Applica bonus Osservatore
    modPortiere += osservatoreBonus;

    // Guerriero: +1 per 3 occasioni dopo aver subito goal
    const portiereId = portiere.id || portiere.name || portiere.odine;
    if (portiere.abilities?.includes('Guerriero') && !nullifiedAbilities.has(portiere.id)) {
        if (guerrieroOccasionsLeft[portiereId] > 0) {
            modPortiere += 1;
            guerrieroOccasionsLeft[portiereId]--;
        }
    }

    // Tuffo Ritardato: -2 vs attaccanti Velocita
    if (portiere.abilities?.includes('Tuffo Ritardato') && !nullifiedAbilities.has(portiere.id)) {
        const hasVelocita = teamA.A?.some(p => p.type === 'Velocita');
        if (hasVelocita) {
            modPortiere -= 2;
        }
    }

    // Statico: -1 vs attaccanti Velocita
    if (portiere.abilities?.includes('Statico') && !nullifiedAbilities.has(portiere.id)) {
        const hasVelocita = teamA.A?.some(p => p.type === 'Velocita');
        if (hasVelocita) {
            modPortiere -= 1;
        }
    }

    // Distratto: -2 se azione ha saltato Fase 1
    if (portiere.abilities?.includes('Distratto') && !nullifiedAbilities.has(portiere.id)) {
        if (constructionSkipped) {
            modPortiere -= 2;
        }
    }

    // OSSERVATORE: riduce i malus di 1
    if (osservatoreActive && modPortiere < 0) {
        modPortiere += 1; // Riduce il malus di 1
    }

    // Bonus equipaggiamento portiere (fase 'portiere', esclude "tutte" già contati)
    if (window.FeatureFlags?.isEnabled('marketObjects') && portiere.equipment) {
        modPortiere += calculateEquipmentBonus(portiere.equipment, 'portiere', false, true);
    }

    // Uscita Kamikaze: +5 al modificatore
    let kamikazeActive = false;
    if (portiere.abilities?.includes('Uscita Kamikaze') && !nullifiedAbilities.has(portiere.id)) {
        modPortiere += 5;
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

    // Bonus equipaggiamento attaccanti (fase 'tiro', esclude "tutte" già contati)
    if (window.FeatureFlags?.isEnabled('marketObjects') && teamA.A?.length > 0) {
        for (const attacker of teamA.A) {
            if (attacker.equipment && !nullifiedAbilities.has(attacker.id) && !injuredPlayers.has(attacker.id)) {
                attackBonus += calculateEquipmentBonus(attacker.equipment, 'tiro', true, true);
            }
        }
    }

    // Tiro dalla distanza (Centrocampista/Difensore): 10% sostituisce modificatore attaccante più basso
    const shooters = [...(teamA.C || []), ...(teamA.D || [])].filter(p =>
        p.abilities?.includes('Tiro dalla distanza') && !nullifiedAbilities.has(p.id)
    );

    if (shooters.length > 0 && teamA.A?.length > 0 && checkChance(10)) {
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

    // Determina dado tiro attaccante (normalmente 1d20)
    let shotDie = 20;

    // Titubanza (Attaccante negativa): il dado diventa 1d12 invece di 1d20
    const hasTitubanza = teamA.A?.some(p =>
        p.abilities?.includes('Titubanza') &&
        !nullifiedAbilities.has(p.id) &&
        !injuredPlayers.has(p.id)
    );
    if (hasTitubanza) {
        shotDie = 12;
    }

    // Sguardo Intimidatorio (Portiere): 5% che l'attacco usi 1d12 invece di 1d20 (sulla fase tiro)
    let sguardoIntimidatorioActive = false;
    if (portiere.abilities?.includes('Sguardo Intimidatorio') && !nullifiedAbilities.has(portiere.id) && checkChance(5)) {
        sguardoIntimidatorioActive = true;
    }

    // Tiro Potente (Difensore, Centrocampista, Attaccante): 5% di tirare 2d10 e prendere il più alto
    const allShooters = [...(teamA.D || []), ...(teamA.C || []), ...(teamA.A || [])];
    const hasTiroPotente = allShooters.some(p =>
        p.abilities?.includes('Tiro Potente') &&
        !nullifiedAbilities.has(p.id) &&
        !injuredPlayers.has(p.id)
    );
    let tiroPotente2d10 = false;
    if (hasTiroPotente && checkChance(5)) {
        tiroPotente2d10 = true; // Attiva 2d10 speciale
    }

    // Muro Psicologico (Portiere): 5% costringe l'avversario a tirare 2d20 e tenere il peggiore
    let muroPsicologicoActive = false;
    if (portiere.abilities?.includes('Muro Psicologico') && !nullifiedAbilities.has(portiere.id) && checkChance(5)) {
        muroPsicologicoActive = true;
    }

    // Roll tiro attaccante (1d20 normalmente, ridotto da altre abilita)
    // Sguardo Intimidatorio riduce il dado tiro a d6
    if (sguardoIntimidatorioActive && shotDie > 6) {
        shotDie = 6;
    }

    let shotRoll;
    if (tiroPotente2d10) {
        // Tiro Potente: tira 2d10 e prende il migliore
        const roll1 = rollDice(1, 10);
        const roll2 = rollDice(1, 10);
        shotRoll = Math.max(roll1, roll2);
    } else {
        shotRoll = rollDice(1, shotDie);
    }
    if (muroPsicologicoActive) {
        // Muro Psicologico: tira 2 dadi e prende il peggiore
        const roll2 = rollDice(1, shotDie);
        shotRoll = Math.min(shotRoll, roll2);
    }

    // Roll portiere (1d20)
    let rollP = rollDice(1, 20);

    // Parata con i piedi (Portiere): 5% tira due dadi e tiene il più alto
    if (portiere.abilities?.includes('Parata con i piedi') && !nullifiedAbilities.has(portiere.id) && checkChance(5)) {
        const roll2 = rollDice(1, 20);
        rollP = Math.max(rollP, roll2);
    }

    // Respinta Timida (Portiere negativa): 10% ritira e usa il secondo
    if (portiere.abilities?.includes('Respinta Timida') && !nullifiedAbilities.has(portiere.id) && checkChance(10)) {
        rollP = rollDice(1, 20);
    }

    // Home bonus (Stadio)
    const homeBonusA = teamA.homeBonus || 0;
    const homeBonusB = teamB.homeBonus || 0;

    // Bonus figurine uniche (+0.01 per figurina unica)
    const figurineBonusA = teamA.figurineBonus || 0;
    const figurineBonusB = teamB.figurineBonus || 0;

    // Bilanciamento v4.1: +2 bonus base portiere per più parate
    const GOALKEEPER_BASE_BONUS = 2;
    const totalPortiere = rollP + modPortiere + coachB + homeBonusB + figurineBonusB + GOALKEEPER_BASE_BONUS;

    // Bonus formazione (Fase 3: Tiro)
    const formationBonusTiro = getFormationBonus(teamA, 'tiro');

    // Calcola totale tiro: 1d10 (o 1d6) + Valore Tiro Fase 2 + bonus
    let totalShot = shotRoll + finalAttackResult + homeBonusA + figurineBonusA + formationBonusTiro;

    // Tiro dalla porta (Portiere attaccante): 5% di aggiungere +2 al tiro del compagno
    const portiereAttaccante = teamA.P?.[0];
    if (portiereAttaccante?.abilities?.includes('Tiro dalla porta') &&
        !nullifiedAbilities.has(portiereAttaccante.id) &&
        !injuredPlayers.has(portiereAttaccante.id) &&
        checkChance(5)) {
        totalShot += 2; // +2 fisso al tiro del compagno
    }

    // Presenza (Portiere difensore): riduce il modificatore del tiratore di -1
    if (portiere.abilities?.includes('Presenza') && !nullifiedAbilities.has(portiere.id)) {
        totalShot -= 1;
    }

    // Parata Laser (Portiere difensore): riduce tiro di -1 per ogni parata precedente (max -5)
    // portiereId già dichiarato sopra
    const hasParataLaser = portiere.abilities?.includes('Parata Laser') && !nullifiedAbilities.has(portiere.id);
    if (hasParataLaser) {
        const currentBonus = parataLaserBonus[portiereId] || 0;
        if (currentBonus > 0) {
            totalShot -= Math.min(currentBonus, 5);
        }
    }

    // Muro Psicologico: gia' applicato nel roll (2d20 peggiore) - nessuna modifica aggiuntiva qui

    // Formula: Totale Portiere - Totale Tiro
    let saveResult = totalPortiere - totalShot;

    // Parata di pugno: se risultato e' -1 o -2, diventa 0 (50% parata)
    const hasParataDiPugno = portiere.abilities?.includes('Parata di pugno') && !nullifiedAbilities.has(portiere.id);
    if (hasParataDiPugno && (saveResult === -1 || saveResult === -2)) {
        saveResult = 0;
    }

    // Gatto: se risultato e' esattamente -1, diventa parata
    const hasGatto = portiere.abilities?.includes('Gatto') && !nullifiedAbilities.has(portiere.id);
    if (hasGatto && saveResult === -1) {
        saveResult = 1; // Diventa parata
    }

    // Colpo d'anca: su risultato 0, 75% parata invece di 50% e annulla 5% auto-goal
    const hasColpoDAnca = portiere.abilities?.includes('Colpo d\'anca') && !nullifiedAbilities.has(portiere.id);

    // Para-Rigori: annulla 5% critico avversario
    const hasParaRigori = portiere.abilities?.includes('Para-Rigori') && !nullifiedAbilities.has(portiere.id);

    // Saracinesca: 0% critico avversario dopo aver subito goal
    const hasSaracinesca = saracinescaActive[portiereId] === true;

    // Kamikaze fail check: 5% fallisce anche se parata riuscita
    // Colpo d'anca annulla questa probabilita
    if (kamikazeActive && saveResult > 0 && !hasColpoDAnca && checkChance(5)) {
        // Salvataggio sulla Linea può ancora salvare
        if (checkSalvataggioSullaLinea(teamB, totalShot)) {
            return false; // Salvato!
        }
        // Parata Laser: resetta bonus su goal
        if (hasParataLaser) parataLaserBonus[portiereId] = 0;
        return true; // Gol!
    }

    // Check risultato
    if (saveResult > 0) {
        // Parata!
        // Presa Sicura: se differenza > 5, prossima azione skip costruzione
        if (portiere.abilities?.includes('Presa Sicura') && !nullifiedAbilities.has(portiere.id)) {
            if (saveResult > 5) {
                skipNextConstruction = true;
            }
        }
        // 2% di gol comunque (critico) - bilanciamento v4.1: ridotto da 5%
        // TIRO DRITTO (Amedemo): 3% se unico attaccante (ridotto da 6%)
        // CONTINUA A PROVARE (Gladio): 0% (no critico)
        // PARATA LASER (Simone): 1% se portiere ha l'abilita
        // PARA-RIGORI: 0% critico
        // SARACINESCA: 0% critico dopo aver subito goal
        let criticoChance = 2; // Bilanciamento v4.1: ridotto da 5%
        const hasTiroDritto = teamA.A?.length === 1 && teamA.A[0]?.abilities?.includes('Tiro Dritto');
        const hasContinuaProvareCritico = teamA.A?.some(p =>
            p.abilities?.includes('Continua a provare') &&
            !nullifiedAbilities.has(p.id)
        );
        if (hasContinuaProvareCritico || hasParaRigori || hasSaracinesca) {
            criticoChance = 0; // No critico
        } else if (hasParataLaser) {
            criticoChance = 1; // Critico ridotto a 1%
        } else if (hasTiroDritto) {
            criticoChance = 3; // Critico aumentato (ridotto da 6%)
        }

        // Colpo d'anca annulla questa probabilita
        if (!hasColpoDAnca && checkChance(criticoChance)) {
            // Respinta: 10% di far ritirare il dado all'attaccante
            if (portiere.abilities?.includes('Respinta') && !nullifiedAbilities.has(portiere.id) && checkChance(10)) {
                // Attaccante ritira il dado, potrebbe non essere piu goal
                const newShotRoll = rollDice(1, shotDie);
                const newTotalShot = newShotRoll + finalAttackResult + homeBonusA + figurineBonusA;
                const newSaveResult = totalPortiere - newTotalShot;
                if (newSaveResult >= 0) {
                    // Parata Laser: incrementa bonus su parata
                    if (hasParataLaser) parataLaserBonus[portiereId] = (parataLaserBonus[portiereId] || 0) + 1;
                    return false; // Respinta ha salvato!
                }
            }
            // Salvataggio sulla Linea può ancora salvare
            if (checkSalvataggioSullaLinea(teamB, totalShot)) {
                return false;
            }
            // Parata Laser: resetta bonus su goal
            if (hasParataLaser) parataLaserBonus[portiereId] = 0;
            return true;
        }
        // Battezzata fuori: 5% se parata margine <2, diventa goal
        if (portiere.abilities?.includes('Battezzata fuori') && !nullifiedAbilities.has(portiere.id)) {
            if (saveResult < 2 && checkChance(5)) {
                // Guerriero: attiva +1 per 3 occasioni dopo goal
                if (portiere.abilities?.includes('Guerriero')) {
                    guerrieroOccasionsLeft[portiereId] = 3;
                }
                // Saracinesca: attiva 0% critico per resto partita
                if (portiere.abilities?.includes('Saracinesca')) {
                    saracinescaActive[portiereId] = true;
                }
                if (hasParataLaser) parataLaserBonus[portiereId] = 0;
                return true; // Goal per Battezzata fuori!
            }
        }

        // Parata Laser: incrementa bonus su parata
        if (hasParataLaser) parataLaserBonus[portiereId] = (parataLaserBonus[portiereId] || 0) + 1;

        // Rilancio Laser: +2 in Fase 1 successiva dopo parata
        if (portiere.abilities?.includes('Rilancio Laser') && !nullifiedAbilities.has(portiere.id)) {
            rilancioLaserActive[teamB.teamKey || 'teamB'] = true;
        }

        // Regista Difensivo: skip Fase 1 + bonus +2 dopo parata
        if (portiere.abilities?.includes('Regista Difensivo') && !nullifiedAbilities.has(portiere.id)) {
            registaDifensivoActive[teamB.teamKey || 'teamB'] = true;
        }

        return false;
    } else if (saveResult === 0) {
        // 50-50 (o altre % con abilita)
        // Opportunista (Attaccante): se pareggio, 75% goal invece di 50%
        const hasOpportunista = teamA.A?.some(p =>
            p.abilities?.includes('Opportunista') &&
            !nullifiedAbilities.has(p.id) &&
            !injuredPlayers.has(p.id)
        );

        // Rapace d'Area (Attaccante): 80% goal su risultato 0
        const hasRapaceDArea = teamA.A?.some(p =>
            p.abilities?.includes("Rapace d'Area") &&
            !nullifiedAbilities.has(p.id) &&
            !injuredPlayers.has(p.id)
        );

        // Allergico ai rigori (Attaccante): 25% invece di 50%
        const hasAllergicoRigori = teamA.A?.some(p =>
            p.abilities?.includes('Allergico ai rigori') &&
            !nullifiedAbilities.has(p.id) &&
            !injuredPlayers.has(p.id)
        );

        // Colpo d'anca: 75% parata invece di 50%
        let goalChance = 50;
        if (hasRapaceDArea) {
            goalChance = 80; // Rapace d'Area prioritario
        } else if (hasOpportunista && !hasColpoDAnca) {
            goalChance = 75;
        } else if (hasColpoDAnca && !hasOpportunista) {
            goalChance = 25; // 75% parata = 25% goal
        } else if (hasOpportunista && hasColpoDAnca) {
            goalChance = 50; // Si annullano
        }

        // Allergico ai rigori riduce la chance
        if (hasAllergicoRigori && goalChance >= 50) {
            goalChance = 25;
        }

        if (checkChance(goalChance)) {
            // Salvataggio sulla Linea può ancora salvare
            if (checkSalvataggioSullaLinea(teamB, totalShot)) {
                return false;
            }
            // Parata Laser: resetta bonus su goal
            if (hasParataLaser) parataLaserBonus[portiereId] = 0;
            return true;
        }
        // Parata Laser: incrementa bonus su parata (50-50 salvato)
        if (hasParataLaser) parataLaserBonus[portiereId] = (parataLaserBonus[portiereId] || 0) + 1;
        return false;
    } else {
        // Gol! (saveResult < 0)
        // Respinta (Portiere): 10% di far ritirare il dado all'attaccante
        if (portiere.abilities?.includes('Respinta') && !nullifiedAbilities.has(portiere.id) && checkChance(10)) {
            const newShotRoll = rollDice(1, shotDie);
            const newTotalShot = newShotRoll + finalAttackResult + homeBonusA + figurineBonusA;
            const newSaveResult = totalPortiere - newTotalShot;
            if (newSaveResult >= 0) {
                // Parata Laser: incrementa bonus su parata
                if (hasParataLaser) parataLaserBonus[portiereId] = (parataLaserBonus[portiereId] || 0) + 1;
                return false; // Respinta ha salvato!
            }
        }

        // Miracolo (Portiere): 5% salva se differenza al massimo -5
        if (portiere.abilities?.includes('Miracolo') && !nullifiedAbilities.has(portiere.id)) {
            if (Math.abs(saveResult) <= 5 && checkChance(5)) {
                // Parata Laser: incrementa bonus su parata
                if (hasParataLaser) parataLaserBonus[portiereId] = (parataLaserBonus[portiereId] || 0) + 1;
                return false; // Miracolo! Parata!
            }
        }

        // Salvataggio sulla Linea (Difensore): 5% salva dopo goal
        if (checkSalvataggioSullaLinea(teamB, totalShot)) {
            return false; // Salvato!
        }

        // Parata Laser: resetta bonus su goal
        if (hasParataLaser) parataLaserBonus[portiereId] = 0;

        // Guerriero: attiva +1 per 3 occasioni dopo goal
        if (portiere.abilities?.includes('Guerriero') && !nullifiedAbilities.has(portiere.id)) {
            guerrieroOccasionsLeft[portiereId] = 3;
        }

        // Saracinesca: attiva 0% critico per resto partita dopo goal
        if (portiere.abilities?.includes('Saracinesca') && !nullifiedAbilities.has(portiere.id)) {
            saracinescaActive[portiereId] = true;
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

    // Sincronizza con AbilitaEffects
    if (window.AbilitaEffects) {
        window.AbilitaEffects.onOccasionStart();
    }

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
    const isGoal = phaseShot(attackingTeam, defendingTeam, attackResult);

    // Traccia goal per Tiro Dritto (Amedemo): incrementa contatore se goal con unico attaccante
    if (isGoal && attackingTeam.A?.length === 1) {
        const attacker = attackingTeam.A[0];
        if (attacker.abilities?.includes('Tiro Dritto') && !nullifiedAbilities.has(attacker.id)) {
            const playerId = attacker.id || attacker.odine;
            tiroDrittoGoals[playerId] = (tiroDrittoGoals[playerId] || 0) + 1;
        }
    }

    return isGoal;
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
    teletrasportoCount = { teamA: 0, teamB: 0 };
    formaSmaglianteApplied.clear();

    // Sincronizza con AbilitaEffects
    if (window.AbilitaEffects?.state) {
        window.AbilitaEffects.state.reset();
    }

    // Reset abilità uniche Icone
    iconaBonusActive = { teamA: false, teamB: false };
    uomoInPiuCount = { teamA: 0, teamB: 0 };
    stazionarioBonus = {};
    relaxModifier = {};
    scheggiaBonus = {};
    assistManCount = {};
    assistManChain = { active: false, playerId: null };
    parataLaserBonus = {};
    continuaProvareBonus = {};
    tiroDrittoGoals = {};

    // Reset abilità generali
    currentScore = { teamA: 0, teamB: 0 };
    lunaticoModifier = {};
    guerrieroOccasionsLeft = {};
    piantagraneVictim = {};
    partecipazioni = {};

    // Reset abilità portiere
    rilancioLaserActive = { teamA: false, teamB: false };
    registaDifensivoActive = { teamA: false, teamB: false };
    saracinescaActive = {};
    constructionSkipped = false;
};

/**
 * Inizializza il bonus Icona per la partita (base 50% + bonus variante)
 * Chiamare DOPO resetSimulationState e PRIMA della prima occasione
 * @param {boolean} teamAHasIcona - Se teamA ha l'Icona
 * @param {boolean} teamBHasIcona - Se teamB ha l'Icona
 * @param {string} teamAVariant - Variante icona teamA (normale/evoluto/alternative/ultimate)
 * @param {string} teamBVariant - Variante icona teamB
 */
const initIconaBonusForMatch = (teamAHasIcona, teamBHasIcona, teamAVariant = 'normale', teamBVariant = 'normale') => {
    // Base 50% + bonus dalla variante figurina
    if (teamAHasIcona) {
        const bonusA = window.FigurineSystem?.getVariantBonuses(teamAVariant)?.iconaChance || 0;
        const chanceA = 50 + bonusA;
        iconaBonusActive.teamA = checkChance(chanceA);
        if (iconaBonusActive.teamA) {
            console.log(`⭐ Icona TeamA: bonus +1 ATTIVO per questa partita! (${chanceA}% con variante ${teamAVariant})`);
        } else {
            console.log(`⭐ Icona TeamA: bonus +1 NON attivato (${chanceA}% fallito, variante ${teamAVariant})`);
        }
    }
    if (teamBHasIcona) {
        const bonusB = window.FigurineSystem?.getVariantBonuses(teamBVariant)?.iconaChance || 0;
        const chanceB = 50 + bonusB;
        iconaBonusActive.teamB = checkChance(chanceB);
        if (iconaBonusActive.teamB) {
            console.log(`⭐ Icona TeamB: bonus +1 ATTIVO per questa partita! (${chanceB}% con variante ${teamBVariant})`);
        } else {
            console.log(`⭐ Icona TeamB: bonus +1 NON attivato (${chanceB}% fallito, variante ${teamBVariant})`);
        }
    }
};

/**
 * Inizializza le abilità che richiedono setup a inizio partita
 * Chiamare DOPO resetSimulationState e PRIMA della prima occasione
 * @param {Object} teamA - Squadra A
 * @param {Object} teamB - Squadra B
 */
const initAbilitiesForMatch = (teamA, teamB) => {
    const allPlayersA = [...(teamA.P || []), ...(teamA.D || []), ...(teamA.C || []), ...(teamA.A || [])];
    const allPlayersB = [...(teamB.P || []), ...(teamB.D || []), ...(teamB.C || []), ...(teamB.A || [])];
    const allPlayers = [...allPlayersA, ...allPlayersB];

    for (const player of allPlayers) {
        const playerId = player.id || player.odine;

        // Lunatico: 1d6 a inizio partita (1=-1, 6=+1, altro=0)
        if (player.abilities?.includes('Lunatico')) {
            const roll = rollDice(1, 6);
            if (roll === 1) {
                lunaticoModifier[playerId] = -1;
            } else if (roll === 6) {
                lunaticoModifier[playerId] = 1;
            } else {
                lunaticoModifier[playerId] = 0;
            }
        }

        // Piantagrane: sceglie un compagno casuale da penalizzare
        if (player.abilities?.includes('Piantagrane')) {
            const isTeamA = allPlayersA.includes(player);
            const teammates = isTeamA ? allPlayersA : allPlayersB;
            const otherTeammates = teammates.filter(p => p.id !== player.id && p.odine !== player.odine);
            if (otherTeammates.length > 0) {
                const victim = otherTeammates[rollDice(0, otherTeammates.length - 1)];
                piantagraneVictim[playerId] = victim.id || victim.odine;
            }
        }
    }

    // Sincronizza con AbilitaEffects - passa anche i dati calcolati
    if (window.AbilitaEffects) {
        window.AbilitaEffects.initMatch(teamA, teamB, {
            lunaticoModifier,
            piantagraneVictim
        });
    }
};

/**
 * Controlla se il bonus Icona è attivo per un team
 * @param {string} teamKey - 'teamA' o 'teamB'
 * @returns {boolean}
 */
const isIconaBonusActive = (teamKey) => {
    return iconaBonusActive[teamKey] || false;
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

    // Calcola livello effettivo con penalita fuori ruolo (-15%)
    const isOutOfPosition = player.assignedPosition && player.assignedPosition !== player.role;
    let effectiveLevel = player.level || 1;
    if (isOutOfPosition) {
        effectiveLevel = Math.floor(effectiveLevel * 0.85);
        abilityBonuses.push({ ability: 'Fuori Ruolo', effect: `-15% (${player.role}->${player.assignedPosition})` });
    }

    // Livello base
    const baseLevel = Math.min(30, Math.max(1, effectiveLevel));
    let modifier = LEVEL_MODIFIERS[baseLevel] || 1.0;
    if (isOutOfPosition) {
        details.push(`base Lv.${player.level}-15%=${baseLevel}=${modifier.toFixed(1)}`);
    } else {
        details.push(`base Lv.${baseLevel}=${modifier.toFixed(1)}`);
    }

    // Forma (currentLevel) - applica anche penalita fuori ruolo
    if (player.currentLevel !== undefined && player.currentLevel !== baseLevel) {
        let effectiveCurrentLevel = player.currentLevel;
        if (isOutOfPosition) {
            effectiveCurrentLevel = Math.floor(effectiveCurrentLevel * 0.85);
        }
        const clampedLevel = Math.min(30, Math.max(1, effectiveCurrentLevel));
        const formaMod = LEVEL_MODIFIERS[clampedLevel] || modifier;

        // Freddezza: la forma non puo mai essere negativa
        if (player.abilities?.includes('Freddezza')) {
            const formaDiff = player.currentLevel - (player.level || 1);
            if (formaDiff < 0) {
                // Ignora malus forma
                details.push(`forma Lv.${player.currentLevel}${isOutOfPosition ? '-15%' : ''} ignorata`);
                abilityBonuses.push({ ability: 'Freddezza', effect: 'forma negativa ignorata' });
            } else {
                details.push(`forma Lv.${player.currentLevel}${isOutOfPosition ? '-15%=' + clampedLevel : ''}=${formaMod.toFixed(1)}`);
                modifier = formaMod;
            }
        } else {
            details.push(`forma Lv.${player.currentLevel}${isOutOfPosition ? '-15%=' + clampedLevel : ''}=${formaMod.toFixed(1)}`);
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

    // Lento a carburare: -3 malus nelle prime 5 occasioni
    if (player.abilities?.includes('Lento a carburare') && currentOccasionNumber <= 5) {
        const oldMod = modifier;
        modifier -= 3;
        details.push(`Lento(occ.${currentOccasionNumber}): ${oldMod.toFixed(1)}-3=${modifier.toFixed(1)}`);
        abilityBonuses.push({ ability: 'Lento a carburare', effect: `-3 (occ.${currentOccasionNumber}/5)` });
    }

    // Tipologia (v4.0 - bonus/malus fisso)
    if (player.type && opposingPlayers.length > 0) {
        const mainOpponent = opposingPlayers.find(opp => opp.type);
        if (mainOpponent) {
            let typeBonus = getTypeModifier(player.type, mainOpponent.type);

            // Adattabile: ignora solo il malus
            if (player.abilities?.includes('Adattabile') && typeBonus < 0) {
                abilityBonuses.push({ ability: 'Adattabile', effect: 'ignora malus tipo' });
                typeBonus = 0;
            }

            // Camaleonte: inverte l'esito
            if (player.abilities?.includes('Camaleonte') && typeBonus !== 0) {
                abilityBonuses.push({ ability: 'Camaleonte', effect: 'inverte tipologia' });
                typeBonus = -typeBonus;
            }

            // Prevedibile: malus aumentato
            if (player.abilities?.includes('Prevedibile') && typeBonus < 0) {
                abilityBonuses.push({ ability: 'Prevedibile', effect: 'malus tipo -2.5' });
                typeBonus = -2.5;
            }

            if (typeBonus !== 0) {
                const oldMod = modifier;
                modifier += typeBonus;
                const sign = typeBonus > 0 ? '+' : '';
                details.push(`${player.type} vs ${mainOpponent.type} ${sign}${typeBonus}: ${oldMod.toFixed(1)}=>${modifier.toFixed(1)}`);
            }
        }
    }

    return { mod: modifier, details, abilityBonuses };
};

const simulateOneOccasionWithLog = (attackingTeam, defendingTeam, occasionNumber = 1) => {
    const log = [];

    // Event data per matchEvents system
    const eventData = {
        occasionNumber,
        phases: {
            construction: null,
            attack: null,
            shot: null
        },
        result: null,
        abilities: []
    };

    // Reset abilità nullificate
    nullifiedAbilities.clear();
    contrastoDurisismoUsed.clear();
    currentOccasionNumber = occasionNumber;

    // Sincronizza con AbilitaEffects
    if (window.AbilitaEffects) {
        window.AbilitaEffects.onOccasionStart();
    }

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
        eventData.phases.construction = {
            skipped: true,
            reason: 'Regista/Lancio lungo'
        };
        eventData.abilities.push('Regista/Lancio lungo (skip costruzione)');
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

        // Raccolta dati evento Fase 1
        eventData.phases.construction = {
            skipped: false,
            players: {
                attacker: [...playersA_D, ...playersA_C].map(p => ({ name: p.name, role: p.role, level: p.currentLevel, type: p.type })),
                defender: playersB_C.map(p => ({ name: p.name, role: p.role, level: p.currentLevel, type: p.type }))
            },
            rolls: { attacker: rollA, defender: rollB },
            modifiers: { attacker: modA_D + modA_C, defender: modB_C },
            coach: { attacker: coachA, defender: coachB },
            totals: { attacker: totalA, defender: totalB },
            successChance,
            roll100,
            result: null
        };

        if (!success) {
            const luckyRoll = rollPercentage();
            if (luckyRoll <= 5) {
                log.push(`  FALLITO ma 5% fortuna attivato (roll: ${luckyRoll})`);
                eventData.phases.construction.result = 'lucky';
                eventData.phases.construction.luckyRoll = luckyRoll;
                eventData.abilities.push('5% fortuna (costruzione)');
            } else {
                log.push(`  => FASE 1 FALLITA - Occasione persa`);
                eventData.phases.construction.result = 'fail';
                eventData.result = 'no_goal';
                return { goal: false, log, eventData };
            }
        } else {
            log.push(`  => FASE 1 SUPERATA`);
            eventData.phases.construction.result = 'success';
        }
    }

    // ===== FASE 2: ATTACCO =====
    log.push(`\n[FASE 2: ATTACCO vs DIFESA]`);

    const preAbilitiesA = applyPrePhaseAbilities(attackingTeam, defendingTeam, 'attack');
    if (preAbilitiesA.interruptPhase) {
        log.push(`  INTERROTTO! (Antifurto attivato)`);
        log.push(`  => Occasione persa`);
        eventData.phases.attack = { interrupted: true, reason: 'Antifurto' };
        eventData.abilities.push('Antifurto (interrupt attacco)');
        eventData.result = 'no_goal';
        return { goal: false, log, eventData };
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

    // Raccolta dati evento Fase 2
    eventData.phases.attack = {
        interrupted: false,
        players: {
            attacker: [...playersA_C2, ...playersA_A].map(p => ({ name: p.name, role: p.role, level: p.currentLevel, type: p.type })),
            defender: [...playersB_D, ...playersB_C2].map(p => ({ name: p.name, role: p.role, level: p.currentLevel, type: p.type }))
        },
        rolls: { attacker: rollA2, defender: rollB2 },
        modifiers: { attacker: modA_C2 + modA_A, defender: modB_D + modB_C2 },
        coach: { attacker: coachA2, defender: coachB2 },
        totals: { attacker: totalA2, defender: totalB2 },
        attackResult,
        result: null
    };

    if (attackResult < 0) {
        const luckyRoll = rollPercentage();
        if (luckyRoll <= 5) {
            log.push(`  FALLITO ma 5% fortuna attivato (roll: ${luckyRoll}) => risultato forzato a 5`);
            eventData.phases.attack.result = 'lucky';
            eventData.phases.attack.luckyRoll = luckyRoll;
            eventData.abilities.push('5% fortuna (attacco)');
        } else {
            log.push(`  => FASE 2 FALLITA - Occasione persa`);
            eventData.phases.attack.result = 'fail';
            eventData.result = 'no_goal';
            return { goal: false, log, eventData };
        }
    } else {
        log.push(`  => FASE 2 SUPERATA (risultato: ${Math.max(1, attackResult).toFixed(1)})`);
        eventData.phases.attack.result = 'success';
    }

    const finalAttackResult = attackResult < 0 ? 5 : Math.max(1, attackResult);
    eventData.phases.attack.finalAttackResult = finalAttackResult;

    // ===== FASE 3: TIRO =====
    log.push(`\n[FASE 3: TIRO vs PORTIERE]`);

    const portiere = defendingTeam.P?.[0];
    if (!portiere) {
        log.push(`  Nessun portiere! => GOL AUTOMATICO`);
        eventData.phases.shot = { noGoalkeeper: true };
        eventData.result = 'goal';
        return { goal: true, log, eventData };
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
        modPortiere += 5;
        kamikazeActive = true;
        log.push(`    Uscita Kamikaze: +5 => ${modPortiere.toFixed(1)}`);
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

    // Determina il tiratore principale (miglior attaccante per livello)
    const shooterPlayer = playersA_A?.length > 0
        ? playersA_A.reduce((best, p) => (p.currentLevel || 0) > (best.currentLevel || 0) ? p : best)
        : (playersA_C2?.length > 0
            ? playersA_C2.reduce((best, p) => (p.currentLevel || 0) > (best.currentLevel || 0) ? p : best)
            : null);

    // Raccolta dati evento Fase 3
    eventData.phases.shot = {
        noGoalkeeper: false,
        shooter: shooterPlayer ? { name: shooterPlayer.name, role: shooterPlayer.role, level: shooterPlayer.currentLevel, type: shooterPlayer.type } : null,
        goalkeeper: { name: portiere.name, level: portiere.currentLevel, type: portiere.type },
        attackValue: effectiveAttack,
        rolls: { goalkeeper: rollP },
        modifiers: { goalkeeper: modPortiere, attackBonus },
        coach: { goalkeeper: coachP },
        totalGoalkeeper: totalPortiere,
        saveResult,
        saveThreshold,
        kamikazeActive,
        result: null
    };

    let goal = false;
    if (saveResult > saveThreshold) {
        log.push(`  => PARATA! (${saveResult.toFixed(1)} > ${saveThreshold})`);
        eventData.phases.shot.result = 'save';
        const luckyGoal = rollPercentage();
        if (luckyGoal <= 5) {
            log.push(`  Ma 5% gol fortunato attivato (roll: ${luckyGoal}) => GOL!`);
            goal = true;
            eventData.phases.shot.result = 'lucky_goal';
            eventData.phases.shot.luckyRoll = luckyGoal;
            eventData.abilities.push('5% gol fortunato');
        }
    } else if (saveResult === saveThreshold) {
        const fiftyFifty = rollPercentage();
        const hasOpportunista = attackingTeam.A?.some(p => p.abilities?.includes('Opportunista'));
        const goalChance = hasOpportunista ? 75 : 50;
        log.push(`  => 50/50! Roll: ${fiftyFifty} ${fiftyFifty <= goalChance ? '<=' : '>'} ${goalChance}%`);
        goal = fiftyFifty <= goalChance;
        eventData.phases.shot.result = goal ? 'draw_goal' : 'draw_save';
        eventData.phases.shot.fiftyFiftyRoll = fiftyFifty;
        eventData.phases.shot.goalChance = goalChance;
        if (hasOpportunista) {
            eventData.abilities.push('Opportunista (75% su pareggio)');
        }
    } else {
        log.push(`  => GOL! (${saveResult.toFixed(1)} < ${saveThreshold})`);
        goal = true;
        eventData.phases.shot.result = 'goal';

        // Miracolo check (differenza al massimo -5)
        if (portiere.abilities?.includes('Miracolo') && Math.abs(saveResult) <= 5) {
            const miracoloRoll = rollPercentage();
            if (miracoloRoll <= 5) {
                log.push(`  MIRACOLO! (roll: ${miracoloRoll}) => PARATA!`);
                goal = false;
                eventData.phases.shot.result = 'miracolo_save';
                eventData.phases.shot.miracoloRoll = miracoloRoll;
                eventData.abilities.push('Miracolo');
            }
        }
    }

    log.push(`\n  *** RISULTATO: ${goal ? 'GOL!' : 'PARATO/FALLITO'} ***`);

    // Sincronizza eventi con AbilitaEffects
    if (window.AbilitaEffects) {
        const shooter = attackingTeam.A?.[0] || null;
        if (goal) {
            window.AbilitaEffects.onGoal(shooter, attackingTeam);
        } else {
            window.AbilitaEffects.onSave(portiere, shooter, defendingTeam);
        }
    }

    eventData.result = goal ? 'goal' : 'no_goal';
    return { goal, log, eventData };
};

// ====================================================================
// ESPOSIZIONE GLOBALE
// ====================================================================

window.simulationLogic = {
    simulateOneOccasion,
    simulateOneOccasionWithLog,
    resetSimulationState,
    initIconaBonusForMatch,
    initAbilitiesForMatch,
    isIconaBonusActive,
    calculatePlayerModifier,
    calculateGroupModifier,
    rollDice,
    LEVEL_MODIFIERS,
    updateScore: (teamKey, goals) => { currentScore[teamKey] = goals; },
    setTotalOccasions: (total) => { totalOccasionsInMatch = total; },
    // Accesso al modulo abilita
    getAbilitaEffects: () => window.AbilitaEffects
};

console.log("Simulazione.js v3.2 caricato - Integrazione AbilitaEffects");
