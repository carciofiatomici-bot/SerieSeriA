/**
 * ====================================================================
 * SIMULATE.JS - Script di Automazione Simulazione Partite
 * ====================================================================
 * Eseguito da GitHub Actions ogni giorno alle 20:30
 * Simula le partite del campionato o della coppa in base alla configurazione
 */

const admin = require('firebase-admin');

// ============ CONFIGURAZIONE ============

const DRY_RUN = process.argv.includes('--dry-run');

// Inizializza Firebase Admin SDK
function initializeFirebase() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson || !projectId) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT e FIREBASE_PROJECT_ID sono richiesti');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
    });

    console.log(`[Firebase] Inizializzato per progetto: ${projectId}`);
    return admin.firestore();
}

// ============ COSTANTI ============

const ROLE_STATS = {
    P: { potenza: 0.6, tecnica: 0.8, velocita: 0.5 },
    D: { potenza: 0.9, tecnica: 0.6, velocita: 0.7 },
    C: { potenza: 0.7, tecnica: 0.9, velocita: 0.8 },
    A: { potenza: 0.8, tecnica: 0.8, velocita: 0.9 }
};

const TYPE_ADVANTAGE = {
    Potenza: 'Velocita',
    Velocita: 'Tecnica',
    Tecnica: 'Potenza'
};

// ============ SISTEMA EXP ============

const EXP_CONFIG = {
    // Valori base EXP
    MATCH_STARTER: 50,      // EXP per titolare
    MATCH_BENCH: 10,        // EXP per panchina (20% del titolare)
    GOAL: 30,               // EXP per gol
    ASSIST: 20,             // EXP per assist
    CLEAN_SHEET_GK: 40,     // EXP clean sheet portiere
    CLEAN_SHEET_DEF: 25,    // EXP clean sheet difensore
    VICTORY: 20,            // EXP vittoria
    DRAW: 10,               // EXP pareggio
    COACH_WIN: 100,         // EXP allenatore per vittoria

    // Moltiplicatori
    CAPTAIN_MULTIPLIER: 1.10,   // Capitano +10%
    ICON_MULTIPLIER: 1.05,      // Icona +5%

    // Formula level-up: Math.floor(BASE * Math.pow(level, EXPONENT) * MULTIPLIER)
    BASE: 100,
    EXPONENT: 1.5,
    MULTIPLIER: 1.15,

    // Limiti
    MAX_LEVEL_NORMAL: 25,
    MAX_LEVEL_ICON: 30,
    MAX_LEVEL_BASE: 5,
    MAX_LEVEL_COACH: 20
};

/**
 * Calcola l'EXP necessaria per passare dal livello L al livello L+1
 */
function expForLevel(level) {
    if (level < 1) return 0;
    return Math.floor(EXP_CONFIG.BASE * Math.pow(level, EXP_CONFIG.EXPONENT) * EXP_CONFIG.MULTIPLIER);
}

/**
 * Calcola l'EXP totale cumulativa necessaria per raggiungere un livello
 */
function totalExpForLevel(targetLevel) {
    let total = 0;
    for (let i = 1; i < targetLevel; i++) {
        total += expForLevel(i);
    }
    return total;
}

/**
 * Restituisce il livello massimo per un giocatore
 */
function getMaxLevel(player) {
    if (player.isSeriousPlayer) return 10;

    const isIcon = player.isIcon || player.icon || player.tipo === 'icona' ||
                   (player.abilities && player.abilities.includes('Icona'));
    if (isIcon) return EXP_CONFIG.MAX_LEVEL_ICON;

    const playerLevel = player.level || 1;
    const playerCost = player.cost || 0;
    const isBase = player.isBase ||
                   (player.nome && player.nome.includes('Base')) ||
                   (player.name && player.name.includes('Base')) ||
                   (player.id && /^[pdca]00[1-9]$/.test(player.id)) ||
                   ((playerLevel === 1 || playerLevel === 5) && playerCost === 0);

    if (isBase) return EXP_CONFIG.MAX_LEVEL_BASE;
    if (player.secretMaxLevel !== undefined) return player.secretMaxLevel;
    return EXP_CONFIG.MAX_LEVEL_NORMAL;
}

/**
 * Verifica e applica level-up
 */
function checkLevelUp(player) {
    if (!player || player.exp === undefined) return { leveledUp: false, levelsGained: 0 };

    const maxLevel = getMaxLevel(player);
    const startLevel = player.level;
    let levelsGained = 0;

    while (player.level < maxLevel) {
        const expNeededForNext = totalExpForLevel(player.level + 1);
        if (player.exp >= expNeededForNext) {
            player.level++;
            levelsGained++;
            const playerName = player.nome || player.name || 'Giocatore';
            console.log(`  [EXP] ${playerName} sale al livello ${player.level}!`);
        } else {
            break;
        }
    }

    if (player.level < maxLevel) {
        player.expToNextLevel = totalExpForLevel(player.level + 1) - player.exp;
    } else {
        player.expToNextLevel = 0;
    }

    return { leveledUp: levelsGained > 0, levelsGained };
}

/**
 * Migra un giocatore se non ha EXP
 */
function migratePlayer(player) {
    if (!player || typeof player !== 'object') return;
    if (player.exp !== undefined) return;

    const currentLevel = player.level || 1;
    player.level = currentLevel;
    player.exp = totalExpForLevel(currentLevel);
    player.expToNextLevel = expForLevel(currentLevel);
    player.totalMatchesPlayed = player.totalMatchesPlayed || 0;
}

/**
 * Applica EXP a un giocatore
 */
function applyExp(player, amount) {
    if (!player || amount <= 0) return { leveledUp: false, expGained: 0 };

    if (player.exp === undefined) {
        migratePlayer(player);
    }

    const oldLevel = player.level;
    const maxLevel = getMaxLevel(player);

    if (player.level >= maxLevel) {
        const maxExp = totalExpForLevel(maxLevel);
        if (player.exp > maxExp) player.exp = maxExp;
        player.expToNextLevel = 0;
        return { leveledUp: false, oldLevel, newLevel: oldLevel, expGained: 0 };
    }

    player.exp += amount;
    if (player.totalMatchesPlayed !== undefined) {
        player.totalMatchesPlayed++;
    }

    const levelUpResult = checkLevelUp(player);

    if (player.level >= maxLevel) {
        const maxExp = totalExpForLevel(maxLevel);
        if (player.exp > maxExp) player.exp = maxExp;
        player.expToNextLevel = 0;
    }

    return {
        leveledUp: levelUpResult.leveledUp,
        oldLevel: oldLevel,
        newLevel: player.level,
        expGained: amount,
        levelsGained: player.level - oldLevel
    };
}

/**
 * Processa EXP per una squadra dopo una partita
 */
function processTeamMatchExp(teamData, isHome, homeGoals, awayGoals) {
    if (!teamData) return [];

    const teamGoals = isHome ? homeGoals : awayGoals;
    const oppGoals = isHome ? awayGoals : homeGoals;

    let result = 'loss';
    if (teamGoals > oppGoals) result = 'win';
    else if (teamGoals === oppGoals) result = 'draw';

    const cleanSheet = oppGoals === 0;
    const captainId = teamData.capitanoId || teamData.captainId || teamData.iconaId;

    // Bonus spogliatoi
    const lockerRoomLevel = teamData.stadium?.lockerRoom?.level || 0;
    let expBonusMultiplier = 1 + (lockerRoomLevel * 0.05);

    // Bonus sponsor/media
    const sponsorExpBonus = teamData.sponsor?.expBonus || 0;
    const mediaExpBonus = teamData.media?.expBonus || 0;
    expBonusMultiplier += sponsorExpBonus + mediaExpBonus;

    // Bonus allenatore
    const coach = teamData.coach || teamData.allenatore;
    const coachLevel = (coach && typeof coach === 'object') ? (coach.level || 1) : 1;
    expBonusMultiplier += (coachLevel / 2) / 100;

    const results = [];
    const formation = teamData.formation?.titolari || [];
    const roster = teamData.players || [];
    const processedIds = new Set();

    // Processa titolari
    formation.forEach(formPlayer => {
        if (!formPlayer) return;
        const playerId = formPlayer.id || formPlayer.visitorId;
        if (!playerId || processedIds.has(playerId)) return;
        processedIds.add(playerId);

        const rosterPlayer = roster.find(p => p && ((p.id === playerId) || (p.visitorId === playerId)));
        const player = rosterPlayer || formPlayer;
        if (!player) return;

        const playerName = player.nome || player.name || 'Sconosciuto';
        const role = (player.ruolo || player.role || '').toUpperCase();
        const isIcon = player.isIcon || player.icon || player.tipo === 'icona';

        let exp = EXP_CONFIG.MATCH_STARTER;

        // Bonus risultato
        if (result === 'win') exp += EXP_CONFIG.VICTORY;
        else if (result === 'draw') exp += EXP_CONFIG.DRAW;

        // Bonus clean sheet
        if (cleanSheet) {
            if (role === 'P') exp += EXP_CONFIG.CLEAN_SHEET_GK;
            else if (role === 'D') exp += EXP_CONFIG.CLEAN_SHEET_DEF;
        }

        // Moltiplicatore capitano
        if (playerId === captainId) {
            exp = Math.floor(exp * EXP_CONFIG.CAPTAIN_MULTIPLIER);
        }

        // Moltiplicatore icona
        if (isIcon) {
            exp = Math.floor(exp * EXP_CONFIG.ICON_MULTIPLIER);
        }

        // Bonus strutture
        exp = Math.floor(exp * expBonusMultiplier);

        const applyResult = applyExp(player, exp);
        console.log(`  [EXP] ${playerName}: +${exp} EXP (Lv.${player.level})`);

        results.push({
            player,
            playerId,
            expGained: exp,
            ...applyResult
        });
    });

    // Processa panchina
    const benchPlayers = teamData.formation?.panchina || [];
    benchPlayers.forEach(benchPlayer => {
        if (!benchPlayer) return;
        const playerId = benchPlayer.id || benchPlayer.visitorId;
        if (!playerId || processedIds.has(playerId)) return;
        processedIds.add(playerId);

        const rosterPlayer = roster.find(p => p && ((p.id === playerId) || (p.visitorId === playerId)));
        const player = rosterPlayer || benchPlayer;
        if (!player) return;

        let exp = EXP_CONFIG.MATCH_BENCH;
        if (result === 'win') exp += Math.floor(EXP_CONFIG.VICTORY / 2);
        else if (result === 'draw') exp += Math.floor(EXP_CONFIG.DRAW / 2);

        exp = Math.floor(exp * expBonusMultiplier);

        const applyResult = applyExp(player, exp);
        const playerName = player.nome || player.name || 'Sconosciuto';
        console.log(`  [EXP] ${playerName} (panchina): +${exp} EXP`);

        results.push({
            player,
            playerId,
            expGained: exp,
            ...applyResult
        });
    });

    // Processa allenatore (solo vittoria)
    if (coach && typeof coach === 'object' && result === 'win') {
        if (coach.exp === undefined) {
            coach.level = coach.level || 1;
            coach.exp = totalExpForLevel(coach.level);
            coach.expToNextLevel = expForLevel(coach.level);
        }

        const maxLevel = EXP_CONFIG.MAX_LEVEL_COACH;
        if (coach.level < maxLevel) {
            let coachExp = Math.floor(EXP_CONFIG.COACH_WIN * expBonusMultiplier);
            coach.exp += coachExp;

            while (coach.level < maxLevel) {
                const expNeededForNext = totalExpForLevel(coach.level + 1);
                if (coach.exp >= expNeededForNext) {
                    coach.level++;
                    console.log(`  [EXP] Allenatore ${coach.name} sale al livello ${coach.level}!`);
                } else {
                    break;
                }
            }

            if (coach.level < maxLevel) {
                coach.expToNextLevel = totalExpForLevel(coach.level + 1) - coach.exp;
            } else {
                coach.expToNextLevel = 0;
            }

            console.log(`  [EXP] Allenatore: +${coachExp} EXP (Lv.${coach.level})`);

            results.push({
                type: 'coach',
                coach,
                expGained: coachExp
            });
        }
    }

    return results;
}

/**
 * Processa EXP per una squadra dopo una partita CON statistiche individuali
 * (gol, assist da playerStats)
 */
function processTeamMatchExpWithStats(teamData, isHome, homeGoals, awayGoals, playerStats) {
    if (!teamData) return [];

    const teamGoals = isHome ? homeGoals : awayGoals;
    const oppGoals = isHome ? awayGoals : homeGoals;

    let result = 'loss';
    if (teamGoals > oppGoals) result = 'win';
    else if (teamGoals === oppGoals) result = 'draw';

    const cleanSheet = oppGoals === 0;
    const captainId = teamData.capitanoId || teamData.captainId || teamData.iconaId;

    // Bonus spogliatoi
    const lockerRoomLevel = teamData.stadium?.lockerRoom?.level || 0;
    let expBonusMultiplier = 1 + (lockerRoomLevel * 0.05);

    // Bonus sponsor/media
    const sponsorExpBonus = teamData.sponsor?.expBonus || 0;
    const mediaExpBonus = teamData.media?.expBonus || 0;
    expBonusMultiplier += sponsorExpBonus + mediaExpBonus;

    // Bonus allenatore
    const coach = teamData.coach || teamData.allenatore;
    const coachLevel = (coach && typeof coach === 'object') ? (coach.level || 1) : 1;
    expBonusMultiplier += (coachLevel / 2) / 100;

    const results = [];
    const formation = teamData.formation?.titolari || [];
    const roster = teamData.players || [];
    const processedIds = new Set();

    // Processa titolari
    formation.forEach(formPlayer => {
        if (!formPlayer) return;
        const playerId = formPlayer.id || formPlayer.visitorId;
        if (!playerId || processedIds.has(playerId)) return;
        processedIds.add(playerId);

        const rosterPlayer = roster.find(p => p && ((p.id === playerId) || (p.visitorId === playerId)));
        const player = rosterPlayer || formPlayer;
        if (!player) return;

        const playerName = player.nome || player.name || 'Sconosciuto';
        const role = (player.ruolo || player.role || '').toUpperCase();
        const isIcon = player.isIcon || player.icon || player.tipo === 'icona';

        // Statistiche individuali da playerStats
        const stats = playerStats?.[playerId] || { goals: 0, assists: 0 };

        let exp = EXP_CONFIG.MATCH_STARTER;

        // Bonus risultato
        if (result === 'win') exp += EXP_CONFIG.VICTORY;
        else if (result === 'draw') exp += EXP_CONFIG.DRAW;

        // Bonus clean sheet
        if (cleanSheet) {
            if (role === 'P') exp += EXP_CONFIG.CLEAN_SHEET_GK;
            else if (role === 'D') exp += EXP_CONFIG.CLEAN_SHEET_DEF;
        }

        // EXP per gol e assist
        if (stats.goals > 0) {
            exp += stats.goals * EXP_CONFIG.GOAL;
        }
        if (stats.assists > 0) {
            exp += stats.assists * EXP_CONFIG.ASSIST;
        }

        // Moltiplicatore capitano
        if (playerId === captainId) {
            exp = Math.floor(exp * EXP_CONFIG.CAPTAIN_MULTIPLIER);
        }

        // Moltiplicatore icona
        if (isIcon) {
            exp = Math.floor(exp * EXP_CONFIG.ICON_MULTIPLIER);
        }

        // Bonus strutture
        exp = Math.floor(exp * expBonusMultiplier);

        const applyResult = applyExp(player, exp);

        let extraInfo = '';
        if (stats.goals > 0) extraInfo += ` [${stats.goals}G]`;
        if (stats.assists > 0) extraInfo += ` [${stats.assists}A]`;
        console.log(`  [EXP] ${playerName}: +${exp} EXP (Lv.${player.level})${extraInfo}`);

        results.push({
            player,
            playerId,
            expGained: exp,
            ...applyResult
        });
    });

    // Processa panchina
    const benchPlayers = teamData.formation?.panchina || [];
    benchPlayers.forEach(benchPlayer => {
        if (!benchPlayer) return;
        const playerId = benchPlayer.id || benchPlayer.visitorId;
        if (!playerId || processedIds.has(playerId)) return;
        processedIds.add(playerId);

        const rosterPlayer = roster.find(p => p && ((p.id === playerId) || (p.visitorId === playerId)));
        const player = rosterPlayer || benchPlayer;
        if (!player) return;

        let exp = EXP_CONFIG.MATCH_BENCH;
        if (result === 'win') exp += Math.floor(EXP_CONFIG.VICTORY / 2);
        else if (result === 'draw') exp += Math.floor(EXP_CONFIG.DRAW / 2);

        exp = Math.floor(exp * expBonusMultiplier);

        const applyResult = applyExp(player, exp);
        const playerName = player.nome || player.name || 'Sconosciuto';
        console.log(`  [EXP] ${playerName} (panchina): +${exp} EXP`);

        results.push({
            player,
            playerId,
            expGained: exp,
            ...applyResult
        });
    });

    // Processa allenatore (solo vittoria)
    if (coach && typeof coach === 'object' && result === 'win') {
        if (coach.exp === undefined) {
            coach.level = coach.level || 1;
            coach.exp = totalExpForLevel(coach.level);
            coach.expToNextLevel = expForLevel(coach.level);
        }

        const maxLevel = EXP_CONFIG.MAX_LEVEL_COACH;
        if (coach.level < maxLevel) {
            let coachExp = Math.floor(EXP_CONFIG.COACH_WIN * expBonusMultiplier);
            coach.exp += coachExp;

            while (coach.level < maxLevel) {
                const expNeededForNext = totalExpForLevel(coach.level + 1);
                if (coach.exp >= expNeededForNext) {
                    coach.level++;
                    console.log(`  [EXP] Allenatore ${coach.name} sale al livello ${coach.level}!`);
                } else {
                    break;
                }
            }

            if (coach.level < maxLevel) {
                coach.expToNextLevel = totalExpForLevel(coach.level + 1) - coach.exp;
            } else {
                coach.expToNextLevel = 0;
            }

            console.log(`  [EXP] Allenatore: +${coachExp} EXP (Lv.${coach.level})`);

            results.push({
                type: 'coach',
                coach,
                expGained: coachExp
            });
        }
    }

    return results;
}

/**
 * Aggiorna la forma dei giocatori in base alle prestazioni della partita
 * Forma va da -2 a +2:
 *  - Gol segnato: +1
 *  - Assist: +0.5
 *  - Clean sheet (P/D): +0.5
 *  - Vittoria: +0.5
 *  - Sconfitta: -0.5
 *  - 0 gol subiti ma difensore: +0.25
 */
function updateTeamFormStatus(teamData, isHome, homeGoals, awayGoals, playerStats) {
    if (!teamData) return {};

    const teamGoals = isHome ? homeGoals : awayGoals;
    const oppGoals = isHome ? awayGoals : homeGoals;

    const won = teamGoals > oppGoals;
    const lost = teamGoals < oppGoals;
    const cleanSheet = oppGoals === 0;

    const formation = teamData.formation?.titolari || [];
    const roster = teamData.players || [];
    const currentFormStatus = teamData.playersFormStatus || {};
    const updatedFormStatus = { ...currentFormStatus };

    // Processa solo i titolari
    formation.forEach(formPlayer => {
        if (!formPlayer) return;
        const playerId = formPlayer.id || formPlayer.visitorId;
        if (!playerId) return;

        // Trova giocatore nella rosa per il ruolo
        const rosterPlayer = roster.find(p => p && ((p.id === playerId) || (p.visitorId === playerId)));
        const player = rosterPlayer || formPlayer;
        const role = (player?.ruolo || player?.role || 'C').toUpperCase();

        // Statistiche individuali
        const stats = playerStats?.[playerId] || { goals: 0, assists: 0 };

        // Forma attuale (default 0)
        let currentMod = updatedFormStatus[playerId]?.mod || 0;

        // Calcola nuova forma
        let formChange = 0;

        // Bonus/malus risultato
        if (won) formChange += 0.5;
        if (lost) formChange -= 0.5;

        // Bonus gol
        if (stats.goals > 0) formChange += stats.goals * 1;

        // Bonus assist
        if (stats.assists > 0) formChange += stats.assists * 0.5;

        // Bonus clean sheet per portieri e difensori
        if (cleanSheet) {
            if (role === 'P') formChange += 0.5;
            else if (role === 'D') formChange += 0.25;
        }

        // Applica cambio e limita tra -2 e +2
        currentMod += formChange;
        currentMod = Math.max(-2, Math.min(2, currentMod));

        // Arrotonda a 0.5
        currentMod = Math.round(currentMod * 2) / 2;

        updatedFormStatus[playerId] = {
            mod: currentMod,
            lastUpdate: new Date().toISOString()
        };
    });

    return updatedFormStatus;
}

/**
 * Salva la forma aggiornata su Firestore
 */
async function saveTeamFormStatus(db, appId, teamId, formStatus) {
    if (!teamId || !formStatus || Object.keys(formStatus).length === 0) return;

    try {
        const teamRef = db.collection(`artifacts/${appId}/public/data/teams`).doc(teamId);
        await teamRef.update({ playersFormStatus: formStatus });
        console.log(`  [Forma] Aggiornata forma giocatori per squadra ${teamId}`);
    } catch (error) {
        console.error(`  [Forma] Errore aggiornamento forma per squadra ${teamId}:`, error);
    }
}

/**
 * Salva EXP aggiornata su Firestore per una squadra
 */
async function saveTeamExpToFirestore(db, appId, teamId, teamData, expResults) {
    if (!teamId || !expResults || expResults.length === 0) return;

    try {
        const teamRef = db.collection(`artifacts/${appId}/public/data/teams`).doc(teamId);

        // Prepara playersExp aggiornato
        const existingPlayersExp = teamData.playersExp || {};
        const updatedPlayersExp = { ...existingPlayersExp };

        // Prepara coachExp
        let updatedCoachExp = teamData.coachExp || null;

        expResults.forEach(result => {
            if (result.type === 'coach' && result.coach) {
                updatedCoachExp = {
                    exp: result.coach.exp || 0,
                    level: result.coach.level || 1,
                    expToNextLevel: result.coach.expToNextLevel || 0
                };
            } else if (result.player && result.playerId) {
                updatedPlayersExp[result.playerId] = {
                    exp: result.player.exp || 0,
                    level: result.player.level || 1,
                    expToNextLevel: result.player.expToNextLevel || 0,
                    totalMatchesPlayed: result.player.totalMatchesPlayed || 0
                };
            }
        });

        // Aggiorna anche l'array players
        const updatedPlayers = (teamData.players || []).map(player => {
            if (!player) return player;
            const playerId = player.id || player.visitorId;
            if (playerId && updatedPlayersExp[playerId]) {
                const expData = updatedPlayersExp[playerId];
                return {
                    ...player,
                    exp: expData.exp,
                    level: expData.level,
                    expToNextLevel: expData.expToNextLevel,
                    totalMatchesPlayed: expData.totalMatchesPlayed || player.totalMatchesPlayed || 0
                };
            }
            return player;
        });

        // Prepara dati da salvare
        const updateData = {
            players: updatedPlayers,
            playersExp: updatedPlayersExp
        };

        // Aggiorna coach se presente
        if (updatedCoachExp && teamData.coach) {
            updateData.coach = {
                ...teamData.coach,
                exp: updatedCoachExp.exp,
                level: updatedCoachExp.level,
                expToNextLevel: updatedCoachExp.expToNextLevel
            };
            updateData.coachExp = updatedCoachExp;
        }

        await teamRef.update(updateData);
        console.log(`  [EXP] Salvata EXP per squadra ${teamData.teamName || teamId}`);

    } catch (error) {
        console.error(`  [EXP] Errore salvataggio EXP per squadra ${teamId}:`, error);
    }
}

// ============ SIMULAZIONE ============

/**
 * Calcola la forza di un giocatore
 */
function calculatePlayerStrength(player, formModifier = 0) {
    const level = player.level || player.currentLevel || 1;
    const role = player.role || 'C';
    const type = player.type || 'Tecnica';

    const roleMultiplier = ROLE_STATS[role] || ROLE_STATS.C;
    const baseStrength = level * 10;

    // Bonus tipo
    let typeBonus = 0;
    if (type === 'Potenza') typeBonus = baseStrength * roleMultiplier.potenza * 0.1;
    else if (type === 'Tecnica') typeBonus = baseStrength * roleMultiplier.tecnica * 0.1;
    else if (type === 'Velocita') typeBonus = baseStrength * roleMultiplier.velocita * 0.1;

    // Applica modificatore forma
    const formMultiplier = 1 + (formModifier * 0.1);

    return (baseStrength + typeBonus) * formMultiplier;
}

/**
 * Calcola la forza totale di una squadra
 */
function calculateTeamStrength(teamData) {
    const formation = teamData.formation?.titolari || [];
    const players = teamData.players || [];
    const formStatus = teamData.playersFormStatus || {};

    let totalStrength = 0;
    let playerCount = 0;

    // formation.titolari contiene oggetti giocatore, non solo ID
    for (const formationPlayer of formation) {
        // Cerca il giocatore completo nella rosa usando l'ID
        const playerId = formationPlayer.id || formationPlayer;
        const player = players.find(p => p.id === playerId) || formationPlayer;
        if (player) {
            const formMod = formStatus[playerId]?.mod || 0;
            totalStrength += calculatePlayerStrength(player, formMod);
            playerCount++;
        }
    }

    // Bonus capitano (icona)
    if (teamData.iconaId) {
        const icona = players.find(p => p.id === teamData.iconaId);
        if (icona) {
            totalStrength += calculatePlayerStrength(icona) * 0.5;
        }
    }

    // Bonus modulo
    const moduloBonus = {
        '1-2-2': 1.0,
        '1-1-2-1': 1.02,
        '1-3-1': 1.01,
        '1-1-3': 1.03
    };
    const modulo = teamData.formation?.modulo || '1-2-2';
    totalStrength *= moduloBonus[modulo] || 1.0;

    return totalStrength;
}

/**
 * Seleziona un giocatore casuale dalla formazione per ruolo (o qualsiasi)
 */
function selectRandomPlayer(team, preferredRoles = null) {
    const formation = team.formation?.titolari || [];
    const players = team.players || [];

    // Filtra per ruolo se specificato
    let candidates = formation.filter(p => {
        if (!p) return false;
        if (!preferredRoles) return true;
        const role = (p.ruolo || p.role || 'C').toUpperCase();
        return preferredRoles.includes(role);
    });

    // Se nessun candidato, usa tutti i titolari
    if (candidates.length === 0) {
        candidates = formation.filter(p => p);
    }

    if (candidates.length === 0) return null;

    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    // Cerca dati completi nella rosa
    const fullPlayer = players.find(p => p && (p.id === selected.id || p.visitorId === selected.id)) || selected;

    return fullPlayer;
}

/**
 * Genera descrizione azione per telecronaca
 */
function generateActionDescription(phase, team, player, result, isGoal) {
    const teamName = team.teamName || 'Squadra';
    const playerName = player?.nome || player?.name || 'Giocatore';

    const phaseDescriptions = {
        costruzione: [
            `${teamName} costruisce dal basso con ${playerName}`,
            `Bella triangolazione del ${teamName}, palla a ${playerName}`,
            `${playerName} gestisce il possesso per il ${teamName}`
        ],
        attacco: [
            `${teamName} attacca! ${playerName} in area`,
            `Azione pericolosa del ${teamName} con ${playerName}`,
            `${playerName} punta la porta avversaria`
        ],
        tiro: isGoal ? [
            `GOL! ${playerName} segna per il ${teamName}!`,
            `RETE! Splendido gol di ${playerName}!`,
            `${playerName} non sbaglia! GOL del ${teamName}!`
        ] : [
            `Tiro di ${playerName}, parato!`,
            `${playerName} calcia, palla fuori!`,
            `Occasione sprecata da ${playerName}`
        ]
    };

    const descriptions = phaseDescriptions[phase] || phaseDescriptions.costruzione;
    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Simula una partita tra due squadre con telecronaca e statistiche individuali
 * Ritorna { homeGoals, awayGoals, scorers, assists, matchLog, matchEvents, playerStats }
 */
function simulateMatch(homeTeam, awayTeam) {
    const homeStrength = calculateTeamStrength(homeTeam);
    const awayStrength = calculateTeamStrength(awayTeam);

    // Bonus casa (+10%)
    const adjustedHomeStrength = homeStrength * 1.1;

    // Calcola probabilita gol
    const totalStrength = adjustedHomeStrength + awayStrength;
    const homeProb = adjustedHomeStrength / totalStrength;
    const awayProb = awayStrength / totalStrength;

    // Statistiche
    let homeGoals = 0;
    let awayGoals = 0;
    const scorers = [];
    const assists = [];
    const matchLog = [];       // Solo gol (highlights)
    const matchEvents = [];    // Tutte le 50 occasioni (telecronaca completa)
    const playerStats = {};    // ID giocatore -> { goals, assists }

    // Simula 50 occasioni di gioco (come la simulazione client)
    for (let occasion = 1; occasion <= 50; occasion++) {
        const minute = Math.floor((occasion / 50) * 90);
        const roll = Math.random();

        // Determina quale squadra ha l'azione
        const isHomeAction = roll < 0.5 + (homeProb - 0.5) * 0.3;
        const attackingTeam = isHomeAction ? homeTeam : awayTeam;
        const defendingTeam = isHomeAction ? awayTeam : homeTeam;

        // Fasi dell'azione
        const phases = ['costruzione', 'attacco', 'tiro'];
        let actionSuccess = true;
        let isGoal = false;
        const eventDetails = {
            occasion,
            minute,
            team: isHomeAction ? 'home' : 'away',
            teamName: attackingTeam.teamName,
            phases: []
        };

        for (const phase of phases) {
            const phaseRoll = Math.random();
            const successChance = phase === 'costruzione' ? 0.7 : (phase === 'attacco' ? 0.5 : 0.3);
            const adjustedChance = successChance * (isHomeAction ? homeProb / 0.5 : awayProb / 0.5);

            const player = selectRandomPlayer(attackingTeam,
                phase === 'costruzione' ? ['C', 'D'] :
                phase === 'attacco' ? ['C', 'A'] :
                ['A', 'C']
            );

            if (phaseRoll > adjustedChance) {
                // Azione fallita
                eventDetails.phases.push({
                    phase,
                    success: false,
                    player: player?.nome || player?.name || 'Giocatore',
                    playerId: player?.id,
                    description: generateActionDescription(phase, attackingTeam, player, 'fail', false)
                });
                actionSuccess = false;
                break;
            }

            // Fase riuscita
            eventDetails.phases.push({
                phase,
                success: true,
                player: player?.nome || player?.name || 'Giocatore',
                playerId: player?.id,
                description: generateActionDescription(phase, attackingTeam, player, 'success', phase === 'tiro')
            });

            // Se siamo alla fase tiro e ha avuto successo, e un gol!
            if (phase === 'tiro') {
                isGoal = true;
            }
        }

        // Se l'azione ha portato a un gol
        if (isGoal && actionSuccess) {
            if (isHomeAction) {
                homeGoals++;
            } else {
                awayGoals++;
            }

            // Trova marcatore e assistman
            const scorer = selectRandomPlayer(attackingTeam, ['A', 'C']);
            const assistPlayer = selectRandomPlayer(attackingTeam, ['C', 'A', 'D']);

            const scorerId = scorer?.id || scorer?.visitorId;
            const assistId = assistPlayer?.id || assistPlayer?.visitorId;

            // Aggiorna statistiche giocatore
            if (scorerId) {
                if (!playerStats[scorerId]) playerStats[scorerId] = { goals: 0, assists: 0 };
                playerStats[scorerId].goals++;
            }
            if (assistId && assistId !== scorerId) {
                if (!playerStats[assistId]) playerStats[assistId] = { goals: 0, assists: 0 };
                playerStats[assistId].assists++;
            }

            // Aggiungi ai marcatori
            scorers.push({
                teamId: attackingTeam.id,
                teamName: attackingTeam.teamName,
                playerId: scorerId,
                playerName: scorer?.nome || scorer?.name || 'Giocatore',
                minute: minute
            });

            // Aggiungi agli assistmen (se diverso dal marcatore)
            if (assistId && assistId !== scorerId) {
                assists.push({
                    teamId: attackingTeam.id,
                    teamName: attackingTeam.teamName,
                    playerId: assistId,
                    playerName: assistPlayer?.nome || assistPlayer?.name || 'Giocatore',
                    minute: minute
                });
            }

            // Aggiungi a matchLog (highlights)
            const goalDescription = `${minute}' - GOL! ${scorer?.nome || scorer?.name || 'Giocatore'} (${attackingTeam.teamName})${assistId && assistId !== scorerId ? ` su assist di ${assistPlayer?.nome || assistPlayer?.name}` : ''}`;
            matchLog.push({
                minute,
                type: 'goal',
                team: isHomeAction ? 'home' : 'away',
                teamName: attackingTeam.teamName,
                scorer: scorer?.nome || scorer?.name || 'Giocatore',
                scorerId: scorerId,
                assist: assistId && assistId !== scorerId ? (assistPlayer?.nome || assistPlayer?.name) : null,
                assistId: assistId && assistId !== scorerId ? assistId : null,
                description: goalDescription,
                homeScore: homeGoals,
                awayScore: awayGoals
            });

            eventDetails.isGoal = true;
            eventDetails.scorer = scorer?.nome || scorer?.name;
            eventDetails.scorerId = scorerId;
            eventDetails.assist = assistId && assistId !== scorerId ? (assistPlayer?.nome || assistPlayer?.name) : null;
            eventDetails.assistId = assistId && assistId !== scorerId ? assistId : null;
            eventDetails.homeScore = homeGoals;
            eventDetails.awayScore = awayGoals;
        }

        // Aggiungi sempre a matchEvents (telecronaca completa)
        matchEvents.push(eventDetails);
    }

    // Limita gol massimi (sicurezza)
    homeGoals = Math.min(homeGoals, 7);
    awayGoals = Math.min(awayGoals, 7);

    console.log(`  ${homeTeam.teamName} ${homeGoals} - ${awayGoals} ${awayTeam.teamName}`);
    console.log(`    (Forza: ${adjustedHomeStrength.toFixed(0)} vs ${awayStrength.toFixed(0)})`);
    if (scorers.length > 0) {
        console.log(`    Marcatori: ${scorers.map(s => `${s.playerName} (${s.minute}')`).join(', ')}`);
    }

    return {
        homeGoals,
        awayGoals,
        scorers,
        assists,
        matchLog,
        matchEvents,
        playerStats
    };
}

// ============ CAMPIONATO ============

/**
 * Trova la prossima giornata da simulare
 * NOTA: Usa la stessa struttura del client (full_schedule con matches[].matches[])
 */
async function findNextMatchday(db, appId) {
    const scheduleRef = db.collection(`artifacts/${appId}/public/data/schedule`).doc('full_schedule');
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
        console.log('[Campionato] Nessun calendario trovato');
        return null;
    }

    const scheduleData = scheduleDoc.data();
    const rounds = scheduleData.matches || [];

    // Trova la prima giornata non completata (result === null significa non giocata)
    for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        const hasUnplayedMatches = round.matches?.some(m => m.result === null);

        if (hasUnplayedMatches) {
            return { roundIndex: i, round, scheduleData };
        }
    }

    console.log('[Campionato] Tutte le giornate sono state giocate');
    return null;
}

/**
 * Simula una giornata di campionato
 * NOTA: Usa la stessa struttura del client
 */
async function simulateChampionshipMatchday(db, appId) {
    console.log('\n[Campionato] Ricerca prossima giornata...');

    const result = await findNextMatchday(db, appId);
    if (!result) return false;

    const { roundIndex, round, scheduleData } = result;
    console.log(`[Campionato] Simulazione Giornata ${round.round}`);

    // Carica tutte le squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    const teamsMap = {};
    teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Simula ogni partita della giornata
    for (const match of round.matches) {
        // Salta partite gia giocate (result !== null)
        if (match.result !== null) continue;

        // NOTA: Il client usa homeId/awayId, non homeTeamId/awayTeamId
        const homeTeam = teamsMap[match.homeId];
        const awayTeam = teamsMap[match.awayId];

        if (!homeTeam || !awayTeam) {
            console.log(`  Partita saltata: squadra mancante (${match.homeId} vs ${match.awayId})`);
            continue;
        }

        const simResult = simulateMatch(homeTeam, awayTeam);

        // Aggiorna il match nel formato del client: result = "homeGoals-awayGoals"
        match.result = `${simResult.homeGoals}-${simResult.awayGoals}`;

        // Salva matchLog e matchEvents per telecronaca
        match.matchLog = simResult.matchLog || [];
        match.matchEvents = simResult.matchEvents || [];
        match.scorers = simResult.scorers || [];
        match.assists = simResult.assists || [];

        // Invia notifiche, salva nella Hall of Fame, e processa EXP
        if (!DRY_RUN) {
            await sendMatchNotifications(db, appId, homeTeam, awayTeam, simResult.homeGoals, simResult.awayGoals, 'Campionato');

            // Salva nella Hall of Fame (matchHistory) per entrambe le squadre
            await saveMatchToHistory(db, appId, homeTeam.id, {
                type: 'campionato',
                homeTeam: { id: homeTeam.id, name: homeTeam.teamName, logoUrl: homeTeam.logoUrl || '' },
                awayTeam: { id: awayTeam.id, name: awayTeam.teamName, logoUrl: awayTeam.logoUrl || '' },
                homeScore: simResult.homeGoals,
                awayScore: simResult.awayGoals,
                isHome: true,
                details: { round: round.round }
            });
            await saveMatchToHistory(db, appId, awayTeam.id, {
                type: 'campionato',
                homeTeam: { id: homeTeam.id, name: homeTeam.teamName, logoUrl: homeTeam.logoUrl || '' },
                awayTeam: { id: awayTeam.id, name: awayTeam.teamName, logoUrl: awayTeam.logoUrl || '' },
                homeScore: simResult.homeGoals,
                awayScore: simResult.awayGoals,
                isHome: false,
                details: { round: round.round }
            });

            // ========== SISTEMA EXP ==========
            console.log(`  [EXP] Processamento EXP per ${homeTeam.teamName}...`);

            // Processa EXP per squadra casa con statistiche individuali
            const homeExpResults = processTeamMatchExpWithStats(
                homeTeam,
                true,
                simResult.homeGoals,
                simResult.awayGoals,
                simResult.playerStats
            );

            // Salva EXP squadra casa
            if (homeExpResults.length > 0) {
                await saveTeamExpToFirestore(db, appId, homeTeam.id, homeTeam, homeExpResults);
            }

            console.log(`  [EXP] Processamento EXP per ${awayTeam.teamName}...`);

            // Processa EXP per squadra trasferta con statistiche individuali
            const awayExpResults = processTeamMatchExpWithStats(
                awayTeam,
                false,
                simResult.homeGoals,
                simResult.awayGoals,
                simResult.playerStats
            );

            // Salva EXP squadra trasferta
            if (awayExpResults.length > 0) {
                await saveTeamExpToFirestore(db, appId, awayTeam.id, awayTeam, awayExpResults);
            }

            // ========== AGGIORNA FORMA GIOCATORI ==========
            console.log(`  [Forma] Aggiornamento forma giocatori...`);

            // Aggiorna forma squadra casa
            const homeFormStatus = updateTeamFormStatus(
                homeTeam,
                true,
                simResult.homeGoals,
                simResult.awayGoals,
                simResult.playerStats
            );
            await saveTeamFormStatus(db, appId, homeTeam.id, homeFormStatus);

            // Aggiorna forma squadra trasferta
            const awayFormStatus = updateTeamFormStatus(
                awayTeam,
                false,
                simResult.homeGoals,
                simResult.awayGoals,
                simResult.playerStats
            );
            await saveTeamFormStatus(db, appId, awayTeam.id, awayFormStatus);
        }
    }

    if (!DRY_RUN) {
        // Salva il calendario aggiornato (stessa struttura del client)
        await db.collection(`artifacts/${appId}/public/data/schedule`).doc('full_schedule').set({
            matches: scheduleData.matches,
            lastUpdated: new Date().toISOString()
        });
        console.log('[Campionato] Calendario salvato (con telecronaca)');

        // Aggiorna la classifica
        await updateLeaderboard(db, appId, scheduleData);
    }

    return true;
}

/**
 * Aggiorna la classifica del campionato
 * NOTA: Usa la stessa struttura del client (scheduleData.matches[])
 */
async function updateLeaderboard(db, appId, scheduleData) {
    const standings = {};

    // Calcola punti e statistiche da tutte le partite giocate
    for (const round of scheduleData.matches || []) {
        for (const match of round.matches || []) {
            // result === null significa non giocata
            if (match.result === null) continue;

            // Il client usa homeId/awayId
            const homeId = match.homeId;
            const awayId = match.awayId;

            // Parse del risultato (formato "homeGoals-awayGoals")
            const [homeScore, awayScore] = match.result.split('-').map(Number);

            // Inizializza se necessario
            if (!standings[homeId]) {
                standings[homeId] = { teamId: homeId, points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
            }
            if (!standings[awayId]) {
                standings[awayId] = { teamId: awayId, points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
            }

            // Aggiorna statistiche
            standings[homeId].played++;
            standings[awayId].played++;
            standings[homeId].goalsFor += homeScore;
            standings[homeId].goalsAgainst += awayScore;
            standings[awayId].goalsFor += awayScore;
            standings[awayId].goalsAgainst += homeScore;

            // Punti
            if (homeScore > awayScore) {
                standings[homeId].points += 3;
                standings[homeId].wins++;
                standings[awayId].losses++;
            } else if (homeScore < awayScore) {
                standings[awayId].points += 3;
                standings[awayId].wins++;
                standings[homeId].losses++;
            } else {
                standings[homeId].points += 1;
                standings[awayId].points += 1;
                standings[homeId].draws++;
                standings[awayId].draws++;
            }
        }
    }

    // Ordina per punti, differenza reti, gol fatti
    const sortedStandings = Object.values(standings).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const diffA = a.goalsFor - a.goalsAgainst;
        const diffB = b.goalsFor - b.goalsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.goalsFor - a.goalsFor;
    });

    // Aggiungi nomi squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    const teamsMap = {};
    teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = doc.data();
    });

    sortedStandings.forEach(team => {
        team.teamName = teamsMap[team.teamId]?.teamName || 'Squadra Sconosciuta';
    });

    // Salva classifica
    await db.collection(`artifacts/${appId}/public/data/leaderboard`).doc('standings').set({
        standings: sortedStandings,
        lastUpdated: new Date().toISOString()
    });

    console.log('[Campionato] Classifica aggiornata');
}

// ============ COPPA ============

/**
 * Trova il prossimo match di coppa da simulare
 */
async function findNextCupMatch(db, appId) {
    const scheduleRef = db.collection(`artifacts/${appId}/public/data/schedule`).doc('coppa_schedule');
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
        console.log('[Coppa] Nessun calendario coppa trovato');
        return null;
    }

    const bracket = scheduleDoc.data();

    if (bracket.status === 'completed') {
        console.log('[Coppa] La coppa e gia completata');
        return null;
    }

    // Trova il prossimo match da giocare
    for (let roundIndex = 0; roundIndex < bracket.rounds.length; roundIndex++) {
        const round = bracket.rounds[roundIndex];

        for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex++) {
            const match = round.matches[matchIndex];

            if (!match.homeTeam || !match.awayTeam) continue;
            if (match.isBye) continue;

            // Per turni andata/ritorno
            if (!round.isSingleMatch) {
                if (!match.leg1Result) {
                    return { bracket, roundIndex, matchIndex, round, match, legType: 'leg1' };
                }
                if (!match.leg2Result && !match.winner) {
                    return { bracket, roundIndex, matchIndex, round, match, legType: 'leg2' };
                }
            } else {
                // Partita secca
                if (!match.leg1Result) {
                    return { bracket, roundIndex, matchIndex, round, match, legType: 'leg1' };
                }
            }
        }
    }

    console.log('[Coppa] Tutte le partite sono state giocate');
    return null;
}

/**
 * Simula i rigori
 */
function simulatePenalties() {
    let home = 0;
    let away = 0;

    // 5 rigori per squadra
    for (let i = 0; i < 5; i++) {
        if (Math.random() > 0.25) home++;
        if (Math.random() > 0.25) away++;
    }

    // Sudden death se pari
    while (home === away) {
        const homeScores = Math.random() > 0.25;
        const awayScores = Math.random() > 0.25;
        if (homeScores) home++;
        if (awayScores) away++;
        if (homeScores !== awayScores) break;
    }

    return { homeGoals: home, awayGoals: away };
}

/**
 * Simula un turno completo di coppa (tutte le partite del round corrente)
 */
async function simulateCupRound(db, appId) {
    console.log('\n[Coppa] Ricerca prossimo match...');

    const result = await findNextCupMatch(db, appId);
    if (!result) return false;

    const { bracket, roundIndex, round, legType } = result;
    console.log(`[Coppa] Simulazione ${round.roundName} - ${legType === 'leg1' ? 'Andata' : legType === 'leg2' ? 'Ritorno' : 'Partita'}`);

    // Carica tutte le squadre
    const teamsSnapshot = await db.collection(`artifacts/${appId}/public/data/teams`).get();
    const teamsMap = {};
    teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Simula tutte le partite del round per questo leg
    for (const match of round.matches) {
        if (!match.homeTeam || !match.awayTeam) continue;
        if (match.isBye) continue;
        if (match.winner) continue;

        // Verifica se questa leg e gia giocata
        if (legType === 'leg1' && match.leg1Result) continue;
        if (legType === 'leg2' && match.leg2Result) continue;

        const homeTeam = teamsMap[match.homeTeam.teamId];
        const awayTeam = teamsMap[match.awayTeam.teamId];

        if (!homeTeam || !awayTeam) {
            console.log(`  Match saltato: squadra mancante`);
            continue;
        }

        // Per il ritorno, inverti casa/trasferta
        let actualHome = homeTeam;
        let actualAway = awayTeam;
        if (legType === 'leg2') {
            actualHome = awayTeam;
            actualAway = homeTeam;
        }

        const simResult = simulateMatch(actualHome, actualAway);

        // Salva matchLog e matchEvents per telecronaca
        if (legType === 'leg1') {
            match.leg1MatchLog = simResult.matchLog || [];
            match.leg1MatchEvents = simResult.matchEvents || [];
            match.leg1Scorers = simResult.scorers || [];
            match.leg1Assists = simResult.assists || [];
        } else {
            match.leg2MatchLog = simResult.matchLog || [];
            match.leg2MatchEvents = simResult.matchEvents || [];
            match.leg2Scorers = simResult.scorers || [];
            match.leg2Assists = simResult.assists || [];
        }

        // Invia notifiche alle squadre, salva nella Hall of Fame, processa EXP e forma
        if (!DRY_RUN) {
            const legLabel = legType === 'leg1' ? 'Andata' : 'Ritorno';
            await sendMatchNotifications(db, appId, actualHome, actualAway, simResult.homeGoals, simResult.awayGoals, `Coppa - ${round.roundName} (${legLabel})`);

            // Salva nella Hall of Fame (matchHistory) per entrambe le squadre
            await saveMatchToHistory(db, appId, match.homeTeam.teamId, {
                type: 'coppa',
                homeTeam: { id: match.homeTeam.teamId, name: match.homeTeam.teamName, logoUrl: homeTeam.logoUrl || '' },
                awayTeam: { id: match.awayTeam.teamId, name: match.awayTeam.teamName, logoUrl: awayTeam.logoUrl || '' },
                homeScore: simResult.homeGoals,
                awayScore: simResult.awayGoals,
                isHome: true,
                details: { round: round.roundName, leg: legLabel }
            });
            await saveMatchToHistory(db, appId, match.awayTeam.teamId, {
                type: 'coppa',
                homeTeam: { id: match.homeTeam.teamId, name: match.homeTeam.teamName, logoUrl: homeTeam.logoUrl || '' },
                awayTeam: { id: match.awayTeam.teamId, name: match.awayTeam.teamName, logoUrl: awayTeam.logoUrl || '' },
                homeScore: simResult.homeGoals,
                awayScore: simResult.awayGoals,
                isHome: false,
                details: { round: round.roundName, leg: legLabel }
            });

            // ========== SISTEMA EXP COPPA ==========
            console.log(`  [EXP] Processamento EXP Coppa per ${actualHome.teamName}...`);

            // Processa EXP per squadra casa
            const homeExpResults = processTeamMatchExpWithStats(
                actualHome,
                true,
                simResult.homeGoals,
                simResult.awayGoals,
                simResult.playerStats
            );
            if (homeExpResults.length > 0) {
                await saveTeamExpToFirestore(db, appId, actualHome.id, actualHome, homeExpResults);
            }

            console.log(`  [EXP] Processamento EXP Coppa per ${actualAway.teamName}...`);

            // Processa EXP per squadra trasferta
            const awayExpResults = processTeamMatchExpWithStats(
                actualAway,
                false,
                simResult.homeGoals,
                simResult.awayGoals,
                simResult.playerStats
            );
            if (awayExpResults.length > 0) {
                await saveTeamExpToFirestore(db, appId, actualAway.id, actualAway, awayExpResults);
            }

            // ========== AGGIORNA FORMA GIOCATORI COPPA ==========
            console.log(`  [Forma] Aggiornamento forma giocatori Coppa...`);

            const homeFormStatus = updateTeamFormStatus(
                actualHome,
                true,
                simResult.homeGoals,
                simResult.awayGoals,
                simResult.playerStats
            );
            await saveTeamFormStatus(db, appId, actualHome.id, homeFormStatus);

            const awayFormStatus = updateTeamFormStatus(
                actualAway,
                false,
                simResult.homeGoals,
                simResult.awayGoals,
                simResult.playerStats
            );
            await saveTeamFormStatus(db, appId, actualAway.id, awayFormStatus);
        }

        // Salva risultato
        if (legType === 'leg1') {
            match.leg1Result = `${simResult.homeGoals}-${simResult.awayGoals}`;
        } else {
            match.leg2Result = `${simResult.homeGoals}-${simResult.awayGoals}`;
        }

        // Determina vincitore se necessario
        if (round.isSingleMatch) {
            // Partita secca
            if (simResult.homeGoals === simResult.awayGoals) {
                const penalties = simulatePenalties();
                match.penalties = penalties;
                match.winner = penalties.homeGoals > penalties.awayGoals ? match.homeTeam : match.awayTeam;
                console.log(`    Rigori: ${penalties.homeGoals}-${penalties.awayGoals}`);
            } else {
                match.winner = simResult.homeGoals > simResult.awayGoals ? match.homeTeam : match.awayTeam;
            }
        } else if (legType === 'leg2') {
            // Calcola aggregato
            const leg1 = match.leg1Result.split('-').map(Number);
            const totalHome = leg1[0] + simResult.awayGoals;
            const totalAway = leg1[1] + simResult.homeGoals;

            match.aggregateHome = totalHome;
            match.aggregateAway = totalAway;

            if (totalHome === totalAway) {
                // Gol in trasferta
                const awayGoalsHome = leg1[1];
                const awayGoalsAway = simResult.awayGoals;

                if (awayGoalsHome === awayGoalsAway) {
                    // Rigori
                    const penalties = simulatePenalties();
                    match.penalties = penalties;
                    match.winner = penalties.homeGoals > penalties.awayGoals ? match.homeTeam : match.awayTeam;
                    console.log(`    Rigori: ${penalties.homeGoals}-${penalties.awayGoals}`);
                } else {
                    match.winner = awayGoalsHome > awayGoalsAway ? match.awayTeam : match.homeTeam;
                }
            } else {
                match.winner = totalHome > totalAway ? match.homeTeam : match.awayTeam;
            }

            console.log(`    Aggregato: ${totalHome}-${totalAway} - Passa: ${match.winner?.teamName}`);
        }

        // Promuovi vincitore se presente
        if (match.winner) {
            promoteWinner(bracket, roundIndex, round.matches.indexOf(match), match.winner);
        }
    }

    // Verifica se il round e completo
    const roundComplete = round.matches.every(m => m.winner || m.isBye || !m.homeTeam || !m.awayTeam);
    if (roundComplete) {
        round.status = 'completed';
    }

    // Verifica se la coppa e completa
    if (bracket.winner) {
        bracket.status = 'completed';
        console.log(`[Coppa] VINCITORE: ${bracket.winner.teamName}`);
    }

    if (!DRY_RUN) {
        // Salva il bracket aggiornato (con telecronaca)
        await db.collection(`artifacts/${appId}/public/data/schedule`).doc('coppa_schedule').set({
            ...bracket,
            lastUpdated: new Date().toISOString()
        });
        console.log('[Coppa] Bracket salvato (con telecronaca)');
    }

    return true;
}

/**
 * Promuove il vincitore al round successivo
 */
function promoteWinner(bracket, roundIndex, matchIndex, winner) {
    const nextRoundIndex = roundIndex + 1;

    if (nextRoundIndex >= bracket.rounds.length) {
        // E la finale
        bracket.winner = winner;
        return;
    }

    const nextRound = bracket.rounds[nextRoundIndex];
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];

    if (!nextMatch) return;

    if (matchIndex % 2 === 0) {
        nextMatch.homeTeam = winner;
    } else {
        nextMatch.awayTeam = winner;
    }
}

// ============ NOTIFICHE ============

/**
 * Invia notifica risultato partita a una squadra
 */
async function sendMatchNotification(db, appId, teamId, teamName, opponentName, myScore, oppScore, matchType = 'Campionato') {
    const won = myScore > oppScore;
    const draw = myScore === oppScore;

    const notification = {
        type: 'match_result',
        title: won ? 'Vittoria!' : (draw ? 'Pareggio' : 'Sconfitta'),
        message: `${matchType}: ${teamName} ${myScore} - ${oppScore} ${opponentName}`,
        targetTeamId: teamId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        data: {
            myScore,
            oppScore,
            opponent: opponentName,
            matchType,
            won,
            draw
        }
    };

    const notifRef = db.collection(`artifacts/${appId}/public/data/notifications`).doc();
    await notifRef.set(notification);

    console.log(`  [Notifica] ${teamName}: ${notification.title}`);
}

/**
 * Invia notifiche per una partita (a entrambe le squadre)
 */
async function sendMatchNotifications(db, appId, homeTeam, awayTeam, homeGoals, awayGoals, matchType = 'Campionato') {
    await Promise.all([
        sendMatchNotification(db, appId, homeTeam.id, homeTeam.teamName, awayTeam.teamName, homeGoals, awayGoals, matchType),
        sendMatchNotification(db, appId, awayTeam.id, awayTeam.teamName, homeTeam.teamName, awayGoals, homeGoals, matchType)
    ]);
}

// ============ HALL OF FAME (MATCH HISTORY) ============

/**
 * Salva una partita nello storico della squadra (Hall of Fame)
 * @param {Firestore} db - Istanza Firestore
 * @param {string} appId - App ID
 * @param {string} teamId - ID della squadra
 * @param {Object} matchData - Dati della partita
 */
async function saveMatchToHistory(db, appId, teamId, matchData) {
    const MAX_HISTORY_SIZE = 100;

    try {
        const teamRef = db.collection(`artifacts/${appId}/public/data/teams`).doc(teamId);
        const teamDoc = await teamRef.get();

        if (!teamDoc.exists) {
            console.log(`  [MatchHistory] Squadra ${teamId} non trovata`);
            return false;
        }

        const teamData = teamDoc.data();
        let matchHistory = teamData.matchHistory || [];

        // Crea record partita (stesso formato del client)
        const matchRecord = {
            id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: new Date().toISOString(),
            type: matchData.type || 'campionato',
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            homeScore: matchData.homeScore || 0,
            awayScore: matchData.awayScore || 0,
            isHome: matchData.isHome !== undefined ? matchData.isHome : true,
            details: matchData.details || null,
            betAmount: matchData.betAmount || 0,
            creditsWon: matchData.creditsWon || 0
        };

        // Aggiungi in testa (piu recenti prima)
        matchHistory.unshift(matchRecord);

        // Limita dimensione storico
        if (matchHistory.length > MAX_HISTORY_SIZE) {
            matchHistory = matchHistory.slice(0, MAX_HISTORY_SIZE);
        }

        // Salva
        await teamRef.update({ matchHistory });
        return true;
    } catch (error) {
        console.error(`  [MatchHistory] Errore salvataggio per squadra ${teamId}:`, error);
        return false;
    }
}

// ============ UTILITIES ============

/**
 * Resetta la forma dei giocatori dopo le partite
 */
async function resetPlayersForm(db, appId, teamsMap) {
    const batch = db.batch();

    for (const teamId of Object.keys(teamsMap)) {
        const teamRef = db.collection(`artifacts/${appId}/public/data/teams`).doc(teamId);
        batch.update(teamRef, { playersFormStatus: {} });
    }

    await batch.commit();
    console.log('[Sistema] Forma giocatori resettata');
}

// ============ MAIN ============

async function main() {
    console.log('====================================');
    console.log('Serie SeriA - Simulazione Automatica');
    console.log(`Data: ${new Date().toISOString()}`);
    console.log(`Dry Run: ${DRY_RUN}`);
    console.log('====================================\n');

    const appId = process.env.APP_ID;
    if (!appId) {
        throw new Error('APP_ID e richiesto');
    }

    const db = initializeFirebase();

    // Carica configurazione
    const configRef = db.collection(`artifacts/${appId}/public/data/config`).doc('settings');
    const configDoc = await configRef.get();
    const config = configDoc.exists ? configDoc.data() : {};

    console.log('[Config] Configurazione caricata');
    console.log(`  - Simulazione Coppa prima: ${config.simulateCupFirst ? 'Si' : 'No'}`);
    console.log(`  - Coppa terminata (flag): ${config.isCupOver ? 'Si' : 'No'}`);
    console.log(`  - Campionato terminato (flag): ${config.isChampionshipOver ? 'Si' : 'No'}`);

    // Verifica EFFETTIVA se ci sono partite da giocare (ignora i flag)
    const championshipResult = await findNextMatchday(db, appId);
    const cupResult = await findNextCupMatch(db, appId);
    const hasChampionshipMatches = championshipResult !== null;
    const hasCupMatches = cupResult !== null;

    console.log(`  - Partite campionato disponibili: ${hasChampionshipMatches ? 'Si' : 'No'}`);
    console.log(`  - Partite coppa disponibili: ${hasCupMatches ? 'Si' : 'No'}`);

    // Warning se i flag sono incoerenti con lo stato reale
    if (config.isChampionshipOver && hasChampionshipMatches) {
        console.warn('[WARN] isChampionshipOver=true ma ci sono ancora partite da giocare! Simulazione procedera comunque.');
    }
    if (config.isCupOver && hasCupMatches) {
        console.warn('[WARN] isCupOver=true ma ci sono ancora partite di coppa da giocare! Simulazione procedera comunque.');
    }

    let simulatedSomething = false;

    // Determina cosa simulare basandosi sulla disponibilita REALE delle partite
    if (config.simulateCupFirst) {
        // Prima la coppa, poi campionato
        if (hasCupMatches) {
            simulatedSomething = await simulateCupRound(db, appId);
        }
        if (!simulatedSomething && hasChampionshipMatches) {
            simulatedSomething = await simulateChampionshipMatchday(db, appId);
        }
    } else {
        // Prima il campionato, poi coppa
        if (hasChampionshipMatches) {
            simulatedSomething = await simulateChampionshipMatchday(db, appId);
        }
        if (!simulatedSomething && hasCupMatches) {
            simulatedSomething = await simulateCupRound(db, appId);
        }
    }

    if (!simulatedSomething) {
        console.log('\n[Sistema] Nessuna partita da simulare oggi.');
    }

    console.log('\n====================================');
    console.log('Simulazione completata!');
    console.log('====================================');
}

main().catch(error => {
    console.error('ERRORE:', error);
    process.exit(1);
});
