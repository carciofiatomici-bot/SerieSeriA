//
// ====================================================================
// MODULO PLAYER-EXP.JS (Sistema Esperienza Giocatori)
// ====================================================================
// Gestisce il sistema di esperienza (EXP) per i giocatori:
// - Calcolo EXP guadagnata per partita e azioni
// - Progressione e level-up
// - Migrazione giocatori esistenti
// ====================================================================
//

(function() {
    'use strict';

    // ========================================
    // COSTANTI
    // ========================================

    // Funzione per ottenere valori EXP dinamici da RewardsConfig
    function getExpValues() {
        return {
            MATCH_STARTER: window.RewardsConfig?.expPartitaTitolare || 50,
            MATCH_BENCH: window.RewardsConfig?.expPartitaPanchina || 10,
            GOAL: window.RewardsConfig?.expGoal || 30,
            ASSIST: window.RewardsConfig?.expAssist || 20,
            CLEAN_SHEET_GK: window.RewardsConfig?.expCleanSheetGK || 40,
            CLEAN_SHEET_DEF: window.RewardsConfig?.expCleanSheetDEF || 25,
            VICTORY: window.RewardsConfig?.expVittoria || 20,
            DRAW: window.RewardsConfig?.expPareggio || 10,
            COACH_WIN: window.RewardsConfig?.expCoachVittoria || 100
        };
    }

    const EXP_CONFIG = {
        // Formula: Math.floor(BASE * Math.pow(level, EXPONENT) * MULTIPLIER)
        BASE: 100,
        EXPONENT: 1.5,
        MULTIPLIER: 1.15,

        // Limiti livello
        MAX_LEVEL_NORMAL: 25,
        MAX_LEVEL_ICON: 30,
        MAX_LEVEL_BASE: 5,          // Livello max giocatori base (iniziali)
        MAX_LEVEL_COACH: 20,        // Livello max allenatore

        // Livello massimo segreto (per giocatori normali)
        SECRET_MAX_LEVEL_MIN: 10,   // Minimo livello segreto
        SECRET_MAX_LEVEL_MAX: 25,   // Massimo livello segreto

        // EXP per azioni - getter dinamico
        get VALUES() {
            return getExpValues();
        },

        // Moltiplicatori
        MULTIPLIERS: {
            CAPTAIN: 1.10,          // Capitano +10%
            ICON: 1.05              // Icona +5%
        }
    };

    // ========================================
    // FUNZIONI CORE
    // ========================================

    /**
     * Calcola l'EXP necessaria per passare dal livello L al livello L+1
     * @param {number} level - Livello attuale
     * @returns {number} EXP necessaria
     */
    function expForLevel(level) {
        if (level < 1) return 0;
        return Math.floor(EXP_CONFIG.BASE * Math.pow(level, EXP_CONFIG.EXPONENT) * EXP_CONFIG.MULTIPLIER);
    }

    /**
     * Calcola l'EXP totale cumulativa necessaria per raggiungere un livello
     * @param {number} targetLevel - Livello da raggiungere
     * @returns {number} EXP totale cumulativa
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
     * @param {Object} player - Oggetto giocatore
     * @returns {number} Livello massimo (25 per base, secretMaxLevel per normali, 30 icone)
     */
    function getMaxLevel(player) {
        // Verifica se il giocatore e un'icona
        const isIcon = player.isIcon || player.icon || player.tipo === 'icona' ||
                       (player.abilities && player.abilities.includes('Icona'));
        if (isIcon) return EXP_CONFIG.MAX_LEVEL_ICON;

        // Verifica se e un giocatore base (iniziale)
        // Base players hanno: isBase=true, o nome che contiene "Base", o ID tipo p001/d001/c001/a001
        const isBase = player.isBase ||
                       (player.nome && player.nome.includes('Base')) ||
                       (player.name && player.name.includes('Base')) ||
                       (player.id && /^[pdca]00[1-9]$/.test(player.id));

        if (isBase) return EXP_CONFIG.MAX_LEVEL_BASE;

        // NUOVO: Se il giocatore ha un secretMaxLevel, usalo
        if (player.secretMaxLevel !== undefined && player.secretMaxLevel !== null) {
            return player.secretMaxLevel;
        }

        // Fallback per giocatori normali senza secretMaxLevel (legacy)
        return EXP_CONFIG.MAX_LEVEL_NORMAL;
    }

    /**
     * Calcola la percentuale di progressione verso il prossimo livello
     * @param {Object} player - Oggetto giocatore
     * @returns {number} Percentuale (0-100)
     */
    function getProgressPercentage(player) {
        if (!player || player.exp === undefined) return 0;

        const maxLevel = getMaxLevel(player);
        if (player.level >= maxLevel) return 100;

        const expNeeded = expForLevel(player.level);
        const expInCurrentLevel = player.exp - totalExpForLevel(player.level);

        if (expNeeded <= 0) return 100;
        return Math.min(100, Math.max(0, Math.floor((expInCurrentLevel / expNeeded) * 100)));
    }

    /**
     * Restituisce l'EXP attuale nel livello corrente e quella necessaria
     * @param {Object} player - Oggetto giocatore
     * @returns {Object} {current, needed, percentage}
     */
    function getExpProgress(player) {
        if (!player) return { current: 0, needed: 0, percentage: 0 };

        // Migra il giocatore se necessario
        if (player.exp === undefined) {
            migratePlayer(player);
        }

        const maxLevel = getMaxLevel(player);
        if (player.level >= maxLevel) {
            return { current: 0, needed: 0, percentage: 100, maxed: true };
        }

        const expNeeded = expForLevel(player.level);
        const totalExpAtCurrentLevel = totalExpForLevel(player.level);
        const expInCurrentLevel = Math.max(0, player.exp - totalExpAtCurrentLevel);
        const percentage = expNeeded > 0 ? Math.min(100, Math.floor((expInCurrentLevel / expNeeded) * 100)) : 100;

        return {
            current: expInCurrentLevel,
            needed: expNeeded,
            percentage: percentage,
            maxed: false
        };
    }

    // ========================================
    // CALCOLO EXP PARTITA
    // ========================================

    /**
     * Calcola l'EXP guadagnata da un giocatore in una partita
     * @param {Object} player - Oggetto giocatore
     * @param {Object} matchData - Dati partita {goals, assists, isStarter, cleanSheet, result, isCaptain}
     * @param {number} expBonusMultiplier - Moltiplicatore bonus spogliatoi (es. 1.15 per +15%)
     * @returns {number} EXP guadagnata
     */
    function calculateMatchExp(player, matchData, expBonusMultiplier = 1) {
        if (!player || !matchData) return 0;

        let exp = 0;

        // EXP base partita
        if (matchData.isStarter) {
            exp += EXP_CONFIG.VALUES.MATCH_STARTER;
        } else if (matchData.onBench) {
            exp += EXP_CONFIG.VALUES.MATCH_BENCH;
        }

        // EXP goal
        if (matchData.goals && matchData.goals > 0) {
            exp += matchData.goals * EXP_CONFIG.VALUES.GOAL;
        }

        // EXP assist
        if (matchData.assists && matchData.assists > 0) {
            exp += matchData.assists * EXP_CONFIG.VALUES.ASSIST;
        }

        // EXP clean sheet (solo se non hanno subito gol)
        if (matchData.cleanSheet) {
            const role = (player.ruolo || player.role || '').toUpperCase();
            if (role === 'P') {
                exp += EXP_CONFIG.VALUES.CLEAN_SHEET_GK;
            } else if (role === 'D') {
                exp += EXP_CONFIG.VALUES.CLEAN_SHEET_DEF;
            }
        }

        // EXP risultato partita
        if (matchData.result === 'win') {
            exp += EXP_CONFIG.VALUES.VICTORY;
        } else if (matchData.result === 'draw') {
            exp += EXP_CONFIG.VALUES.DRAW;
        }

        // Moltiplicatore capitano
        if (matchData.isCaptain) {
            exp = Math.floor(exp * EXP_CONFIG.MULTIPLIERS.CAPTAIN);
        }

        // Moltiplicatore icona
        const isIcon = player.isIcon || player.icon || player.tipo === 'icona';
        if (isIcon) {
            exp = Math.floor(exp * EXP_CONFIG.MULTIPLIERS.ICON);
        }

        // Moltiplicatore bonus spogliatoi
        if (expBonusMultiplier > 1) {
            exp = Math.floor(exp * expBonusMultiplier);
        }

        return exp;
    }

    // ========================================
    // APPLICAZIONE EXP E LEVEL-UP
    // ========================================

    /**
     * Applica EXP a un giocatore e verifica level-up
     * @param {Object} player - Oggetto giocatore
     * @param {number} amount - Quantita EXP da aggiungere
     * @returns {Object} {leveledUp, oldLevel, newLevel, expGained}
     */
    function applyExp(player, amount) {
        if (!player || amount <= 0) return { leveledUp: false, expGained: 0 };

        // Migra se necessario
        if (player.exp === undefined) {
            migratePlayer(player);
        }

        const oldLevel = player.level;
        const maxLevel = getMaxLevel(player);

        // Se gia al massimo, non aggiungere EXP
        if (player.level >= maxLevel) {
            return { leveledUp: false, oldLevel, newLevel: oldLevel, expGained: 0 };
        }

        // Aggiungi EXP
        player.exp += amount;

        // Incrementa contatore partite se presente
        if (player.totalMatchesPlayed !== undefined) {
            player.totalMatchesPlayed++;
        }

        // Verifica level-up
        const levelUpResult = checkLevelUp(player);

        return {
            leveledUp: levelUpResult.leveledUp,
            oldLevel: oldLevel,
            newLevel: player.level,
            expGained: amount,
            levelsGained: player.level - oldLevel
        };
    }

    /**
     * Verifica e applica eventuali level-up
     * @param {Object} player - Oggetto giocatore
     * @returns {Object} {leveledUp, levelsGained}
     */
    function checkLevelUp(player) {
        if (!player || player.exp === undefined) return { leveledUp: false, levelsGained: 0 };

        const maxLevel = getMaxLevel(player);
        const startLevel = player.level;
        let levelsGained = 0;

        // Continua a fare level-up finche possibile
        while (player.level < maxLevel) {
            const expNeededForNext = totalExpForLevel(player.level + 1);

            if (player.exp >= expNeededForNext) {
                player.level++;
                levelsGained++;
                console.log(`[PlayerExp] ${player.nome || player.name} sale al livello ${player.level}!`);
            } else {
                break;
            }
        }

        // Aggiorna expToNextLevel
        if (player.level < maxLevel) {
            player.expToNextLevel = totalExpForLevel(player.level + 1) - player.exp;
        } else {
            player.expToNextLevel = 0;
        }

        return {
            leveledUp: levelsGained > 0,
            levelsGained: levelsGained
        };
    }

    // ========================================
    // PROCESSAMENTO PARTITA COMPLETA
    // ========================================

    /**
     * Processa l'EXP per tutti i giocatori di una squadra dopo una partita
     * @param {Object} teamData - Dati squadra con formazione e rosa
     * @param {Object} matchResult - Risultato partita {homeGoals, awayGoals, isHome, playerStats}
     * @returns {Array} Array di risultati per ogni giocatore
     */
    function processMatchExp(teamData, matchResult) {
        if (!teamData || !matchResult) return [];

        const results = [];

        // La formazione puo essere un oggetto o un array
        let formation = teamData.formazione || teamData.formation || [];
        if (!Array.isArray(formation)) {
            formation = Object.values(formation).filter(p => p);
        }

        const roster = teamData.rosa || teamData.roster || [];
        const captainId = teamData.capitanoId || teamData.captainId;

        // Calcola bonus spogliatoi (+5% per livello)
        const lockerRoomLevel = teamData.stadium?.lockerRoom?.level || 0;
        let expBonusMultiplier = 1 + (lockerRoomLevel * 0.05);

        // Bonus EXP progressivo da sponsor/media (dal contratto salvato)
        // Sponsor/Media costosi danno bonus EXP maggiore (0% - 7.5%)
        const sponsorExpBonus = teamData.sponsor?.expBonus || 0;
        const mediaExpBonus = teamData.media?.expBonus || 0;

        // Bonus passivo per avere sponsor/media (max 2.5% totale)
        // Con spogliatoi: +1.25% ciascuno
        // Senza spogliatoi: +0.625% ciascuno (max 1.25% insieme)
        const hasSponsor = teamData.sponsor && teamData.sponsor.id;
        const hasMedia = teamData.media && teamData.media.id;
        let passiveBonus = 0;
        if (lockerRoomLevel > 0) {
            passiveBonus = (hasSponsor ? 0.0125 : 0) + (hasMedia ? 0.0125 : 0);
        } else {
            passiveBonus = (hasSponsor ? 0.00625 : 0) + (hasMedia ? 0.00625 : 0);
        }

        // Totale: bonus progressivo (dal contratto) + bonus passivo
        expBonusMultiplier += sponsorExpBonus + mediaExpBonus + passiveBonus;

        // Determina risultato partita
        const teamGoals = matchResult.isHome ? matchResult.homeGoals : matchResult.awayGoals;
        const opponentGoals = matchResult.isHome ? matchResult.awayGoals : matchResult.homeGoals;

        let result = 'loss';
        if (teamGoals > opponentGoals) result = 'win';
        else if (teamGoals === opponentGoals) result = 'draw';

        // Clean sheet se non hanno subito gol
        const cleanSheet = opponentGoals === 0;

        // Statistiche giocatori dalla partita
        const playerStats = matchResult.playerStats || {};

        // Processa titolari (formazione)
        formation.forEach(player => {
            if (!player) return;

            const playerId = player.id || player.visitorId;
            const stats = playerStats[playerId] || {};

            const matchData = {
                isStarter: true,
                onBench: false,
                goals: stats.goals || 0,
                assists: stats.assists || 0,
                cleanSheet: cleanSheet,
                result: result,
                isCaptain: playerId === captainId
            };

            const expGained = calculateMatchExp(player, matchData, expBonusMultiplier);
            const applyResult = applyExp(player, expGained);

            results.push({
                player: player,
                playerId: playerId,
                expGained: expGained,
                ...applyResult
            });
        });

        // Processa panchina (giocatori in rosa ma non in formazione)
        const formationIds = new Set(formation.filter(p => p).map(p => p.id || p.visitorId));

        roster.forEach(player => {
            if (!player) return;

            const playerId = player.id || player.visitorId;

            // Salta se e in formazione (gia processato)
            if (formationIds.has(playerId)) return;

            const matchData = {
                isStarter: false,
                onBench: true,
                goals: 0,
                assists: 0,
                cleanSheet: false, // Panchina non conta per clean sheet
                result: result,
                isCaptain: false
            };

            const expGained = calculateMatchExp(player, matchData, expBonusMultiplier);
            const applyResult = applyExp(player, expGained);

            results.push({
                player: player,
                playerId: playerId,
                expGained: expGained,
                ...applyResult
            });
        });

        // Processa allenatore (solo con vittorie)
        const coach = teamData.coach || teamData.allenatore;
        if (coach && typeof coach === 'object') {
            const coachExpGained = calculateCoachMatchExp(coach, result, expBonusMultiplier);
            if (coachExpGained > 0) {
                const coachApplyResult = applyCoachExp(coach, coachExpGained);
                results.push({
                    type: 'coach',
                    coach: coach,
                    expGained: coachExpGained,
                    ...coachApplyResult
                });
            }
        }

        return results;
    }

    // ========================================
    // MIGRAZIONE GIOCATORI ESISTENTI
    // ========================================

    /**
     * Inizializza i campi EXP per un giocatore esistente
     * @param {Object} player - Oggetto giocatore
     */
    function migratePlayer(player) {
        // Verifica che sia un oggetto valido (non stringa, null, undefined, etc.)
        if (!player || typeof player !== 'object') return;

        // Se ha gia l'EXP, non migrare
        if (player.exp !== undefined) return;

        // Inizializza come se avesse appena raggiunto il suo livello attuale
        const currentLevel = player.level || player.livello || 1;
        player.level = currentLevel;
        player.exp = totalExpForLevel(currentLevel);
        player.expToNextLevel = expForLevel(currentLevel);
        player.totalMatchesPlayed = player.totalMatchesPlayed || 0;

        console.log(`[PlayerExp] Migrato giocatore ${player.nome || player.name}: Lv.${currentLevel}, EXP: ${player.exp}`);
    }

    /**
     * Migra tutti i giocatori di una squadra
     * @param {Object} teamData - Dati squadra
     */
    function migrateTeam(teamData) {
        if (!teamData) return;

        const roster = teamData.rosa || teamData.roster || [];

        // La formazione puo essere un oggetto o un array
        let formation = teamData.formazione || teamData.formation || [];
        if (!Array.isArray(formation)) {
            formation = Object.values(formation).filter(p => p);
        }

        roster.forEach(player => migratePlayer(player));
        formation.forEach(player => {
            if (player) migratePlayer(player);
        });

        // Migra anche il capitano se presente
        if (teamData.capitano) {
            migratePlayer(teamData.capitano);
        }
    }

    // ========================================
    // SISTEMA EXP ALLENATORE
    // ========================================

    /**
     * Calcola l'EXP guadagnata dall'allenatore in una partita
     * L'allenatore guadagna EXP SOLO con le vittorie
     * @param {Object} coach - Oggetto allenatore
     * @param {string} matchResult - Risultato: 'win', 'draw', 'loss'
     * @param {number} expBonusMultiplier - Moltiplicatore bonus spogliatoi (es. 1.15 per +15%)
     * @returns {number} EXP guadagnata
     */
    function calculateCoachMatchExp(coach, matchResult, expBonusMultiplier = 1) {
        if (!coach || typeof coach !== 'object') return 0;

        // L'allenatore guadagna EXP solo con le vittorie
        if (matchResult !== 'win') return 0;

        let exp = EXP_CONFIG.VALUES.COACH_WIN;

        // Applica bonus spogliatoi
        exp = Math.floor(exp * expBonusMultiplier);

        return exp;
    }

    /**
     * Applica EXP all'allenatore e verifica level-up
     * @param {Object} coach - Oggetto allenatore
     * @param {number} amount - Quantita EXP da aggiungere
     * @returns {Object} {leveledUp, oldLevel, newLevel, expGained}
     */
    function applyCoachExp(coach, amount) {
        if (!coach || typeof coach !== 'object' || amount <= 0) {
            return { leveledUp: false, expGained: 0 };
        }

        // Migra se necessario
        if (coach.exp === undefined) {
            migrateCoach(coach);
        }

        const oldLevel = coach.level;
        const maxLevel = EXP_CONFIG.MAX_LEVEL_COACH;

        // Se gia al massimo, non aggiungere EXP
        if (coach.level >= maxLevel) {
            return { leveledUp: false, oldLevel, newLevel: oldLevel, expGained: 0 };
        }

        // Aggiungi EXP
        coach.exp += amount;

        // Verifica level-up
        const levelUpResult = checkCoachLevelUp(coach);

        return {
            leveledUp: levelUpResult.leveledUp,
            oldLevel: oldLevel,
            newLevel: coach.level,
            expGained: amount,
            levelsGained: coach.level - oldLevel
        };
    }

    /**
     * Verifica e applica eventuali level-up per l'allenatore
     * @param {Object} coach - Oggetto allenatore
     * @returns {Object} {leveledUp, levelsGained}
     */
    function checkCoachLevelUp(coach) {
        if (!coach || coach.exp === undefined) return { leveledUp: false, levelsGained: 0 };

        const maxLevel = EXP_CONFIG.MAX_LEVEL_COACH;
        const startLevel = coach.level;
        let levelsGained = 0;

        // Continua a fare level-up finche possibile
        while (coach.level < maxLevel) {
            const expNeededForNext = totalExpForLevel(coach.level + 1);

            if (coach.exp >= expNeededForNext) {
                coach.level++;
                levelsGained++;
                console.log(`[PlayerExp] Allenatore ${coach.name} sale al livello ${coach.level}!`);
            } else {
                break;
            }
        }

        // Aggiorna expToNextLevel
        if (coach.level < maxLevel) {
            coach.expToNextLevel = totalExpForLevel(coach.level + 1) - coach.exp;
        } else {
            coach.expToNextLevel = 0;
        }

        return {
            leveledUp: levelsGained > 0,
            levelsGained: levelsGained
        };
    }

    /**
     * Inizializza i campi EXP per un allenatore esistente
     * @param {Object} coach - Oggetto allenatore
     */
    function migrateCoach(coach) {
        // Verifica che sia un oggetto valido
        if (!coach || typeof coach !== 'object') return;

        // Se ha gia l'EXP, non migrare
        if (coach.exp !== undefined) return;

        // Inizializza come se avesse appena raggiunto il suo livello attuale
        const currentLevel = coach.level || 1;
        coach.level = currentLevel;
        coach.exp = totalExpForLevel(currentLevel);
        coach.expToNextLevel = expForLevel(currentLevel);

        console.log(`[PlayerExp] Migrato allenatore ${coach.name}: Lv.${currentLevel}, EXP: ${coach.exp}`);
    }

    /**
     * Restituisce i dati di progressione EXP dell'allenatore
     * @param {Object} coach - Oggetto allenatore
     * @returns {Object} {current, needed, percentage, maxed}
     */
    function getCoachExpProgress(coach) {
        if (!coach || typeof coach !== 'object') {
            return { current: 0, needed: 0, percentage: 0, maxed: false };
        }

        // Migra se necessario
        if (coach.exp === undefined) {
            migrateCoach(coach);
        }

        const maxLevel = EXP_CONFIG.MAX_LEVEL_COACH;
        if (coach.level >= maxLevel) {
            return { current: 0, needed: 0, percentage: 100, maxed: true };
        }

        const expNeeded = expForLevel(coach.level);
        const totalExpAtCurrentLevel = totalExpForLevel(coach.level);
        const expInCurrentLevel = Math.max(0, coach.exp - totalExpAtCurrentLevel);
        const percentage = expNeeded > 0 ? Math.min(100, Math.floor((expInCurrentLevel / expNeeded) * 100)) : 100;

        return {
            current: expInCurrentLevel,
            needed: expNeeded,
            percentage: percentage,
            maxed: false
        };
    }

    // ========================================
    // SECRET MAX LEVEL SYSTEM
    // ========================================

    /**
     * Verifica se un giocatore e' soggetto al sistema secretMaxLevel
     * Esclude: Icone e giocatori Base (liv.1 con costo 0)
     * @param {Object} player - Oggetto giocatore
     * @param {Object} teamData - Dati squadra (opzionale, per verificare iconaId)
     * @returns {boolean}
     */
    function isSubjectToSecretMaxLevel(player, teamData = null) {
        if (!player) return false;

        // Escludi Icone
        const isIcona = (player.abilities && player.abilities.includes('Icona')) ||
                        (teamData?.iconaId && player.id === teamData.iconaId) ||
                        player.isIcon || player.icon || player.tipo === 'icona';
        if (isIcona) return false;

        // Escludi giocatori Base (livello 1 con costo 0)
        const isBase = ((player.level || 1) === 1 && (player.cost || 0) === 0) ||
                       player.isBase ||
                       (player.id && /^[pdca]00[1-9]$/.test(player.id));
        if (isBase) return false;

        return true;
    }

    /**
     * Genera un secretMaxLevel casuale per un giocatore
     * Il valore sara' sempre >= al livello attuale del giocatore
     * @param {number} currentLevel - Livello attuale del giocatore
     * @returns {number} secretMaxLevel (10-25)
     */
    function generateSecretMaxLevel(currentLevel) {
        const min = Math.max(EXP_CONFIG.SECRET_MAX_LEVEL_MIN, currentLevel || 1);
        const max = EXP_CONFIG.SECRET_MAX_LEVEL_MAX;

        // Usa getRandomInt se disponibile, altrimenti fallback
        if (window.getRandomInt) {
            return window.getRandomInt(min, max);
        }
        // Fallback
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Applica secretMaxLevel a tutti i giocatori di una squadra che non ce l'hanno
     * @param {string} teamId - ID della squadra
     * @returns {Promise<{updated: number, skipped: number}>}
     */
    async function applySecretMaxLevelToTeam(teamId) {
        if (!window.db || !window.firestoreTools) {
            console.warn('[PlayerExp] Firestore non disponibile per migrazione secretMaxLevel');
            return { updated: 0, skipped: 0 };
        }

        const { doc, getDoc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const db = window.db;

        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) {
            return { updated: 0, skipped: 0 };
        }

        const teamData = teamDoc.data();
        let updated = 0;
        let skipped = 0;

        const updatedPlayers = (teamData.players || []).map(player => {
            // Solo giocatori normali senza secretMaxLevel
            if (isSubjectToSecretMaxLevel(player, teamData) && player.secretMaxLevel === undefined) {
                const currentLevel = player.level || 1;
                updated++;
                return {
                    ...player,
                    secretMaxLevel: generateSecretMaxLevel(currentLevel)
                };
            }
            skipped++;
            return player;
        });

        if (updated > 0) {
            await updateDoc(teamDocRef, { players: updatedPlayers });
            console.log(`[PlayerExp] SecretMaxLevel applicato a ${updated} giocatori della squadra ${teamData.teamName || teamId}`);
        }

        return { updated, skipped };
    }

    /**
     * Applica secretMaxLevel a TUTTE le squadre
     * Chiamata automatica al caricamento del modulo
     * @returns {Promise<{totalUpdated: number, teamsProcessed: number}>}
     */
    async function applySecretMaxLevelToAllTeams() {
        if (!window.db || !window.firestoreTools) {
            console.warn('[PlayerExp] Firestore non disponibile per migrazione secretMaxLevel');
            return { totalUpdated: 0, teamsProcessed: 0 };
        }

        const { collection, getDocs } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const db = window.db;

        try {
            const teamsRef = collection(db, `artifacts/${appId}/public/data/teams`);
            const teamsSnapshot = await getDocs(teamsRef);

            let totalUpdated = 0;
            let teamsProcessed = 0;

            for (const teamDoc of teamsSnapshot.docs) {
                const result = await applySecretMaxLevelToTeam(teamDoc.id);
                totalUpdated += result.updated;
                teamsProcessed++;
            }

            if (totalUpdated > 0) {
                console.log(`[PlayerExp] SecretMaxLevel migrazione completata: ${totalUpdated} giocatori aggiornati in ${teamsProcessed} squadre`);
            }

            return { totalUpdated, teamsProcessed };

        } catch (error) {
            console.error('[PlayerExp] Errore migrazione secretMaxLevel:', error);
            return { totalUpdated: 0, teamsProcessed: 0 };
        }
    }

    // ========================================
    // UTILITY
    // ========================================

    /**
     * Restituisce i giocatori vicini al level-up (>75% progressione)
     * @param {Object} teamData - Dati squadra
     * @returns {Array} Giocatori ordinati per progressione
     */
    function getPlayersNearLevelUp(teamData, threshold = 75) {
        if (!teamData) return [];

        const roster = teamData.rosa || teamData.roster || [];
        const nearLevelUp = [];

        roster.forEach(player => {
            if (!player) return;

            // Migra se necessario
            if (player.exp === undefined) {
                migratePlayer(player);
            }

            const maxLevel = getMaxLevel(player);
            if (player.level >= maxLevel) return;

            const progress = getExpProgress(player);
            if (progress.percentage >= threshold) {
                nearLevelUp.push({
                    player: player,
                    percentage: progress.percentage,
                    expNeeded: progress.needed - progress.current
                });
            }
        });

        // Ordina per percentuale decrescente
        nearLevelUp.sort((a, b) => b.percentage - a.percentage);

        return nearLevelUp;
    }

    /**
     * Formatta l'EXP per la visualizzazione
     * @param {number} exp - Valore EXP
     * @returns {string} EXP formattata
     */
    function formatExp(exp) {
        if (exp >= 1000000) {
            return (exp / 1000000).toFixed(1) + 'M';
        } else if (exp >= 1000) {
            return (exp / 1000).toFixed(1) + 'K';
        }
        return exp.toString();
    }

    /**
     * Restituisce le costanti di configurazione (per debug/UI)
     * @returns {Object} Configurazione EXP
     */
    function getConfig() {
        return { ...EXP_CONFIG };
    }

    // ========================================
    // ESPOSIZIONE MODULO
    // ========================================

    window.PlayerExp = {
        // Core
        expForLevel,
        totalExpForLevel,
        getMaxLevel,
        getProgressPercentage,
        getExpProgress,

        // Calcolo e applicazione giocatori
        calculateMatchExp,
        applyExp,
        checkLevelUp,
        processMatchExp,

        // Allenatore
        calculateCoachMatchExp,
        applyCoachExp,
        checkCoachLevelUp,
        migrateCoach,
        getCoachExpProgress,

        // Migrazione
        migratePlayer,
        migrateTeam,

        // Secret Max Level System
        isSubjectToSecretMaxLevel,
        generateSecretMaxLevel,
        applySecretMaxLevelToTeam,
        applySecretMaxLevelToAllTeams,

        // Utility
        getPlayersNearLevelUp,
        formatExp,
        getConfig,

        // Costanti esposte
        CONFIG: EXP_CONFIG
    };

    console.log('[OK] Modulo PlayerExp caricato.');

    // Auto-migrazione secretMaxLevel al caricamento
    // Eseguita una volta quando Firestore e' disponibile
    document.addEventListener('DOMContentLoaded', () => {
        const checkAndMigrate = async () => {
            if (window.db && window.firestoreTools) {
                // Esegui migrazione dopo un breve delay per assicurarsi che tutto sia caricato
                setTimeout(async () => {
                    await applySecretMaxLevelToAllTeams();
                }, 2000);
            } else {
                setTimeout(checkAndMigrate, 500);
            }
        };
        setTimeout(checkAndMigrate, 1000);
    });

})();
