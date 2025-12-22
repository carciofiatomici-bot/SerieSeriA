// ====================================================================
// SIMULATION HIGHLIGHTS - Sistema "Azioni Salienti"
// ====================================================================
// Modulo per generare log semplificati delle occasioni di gioco
// Usato da: campionato, coppa, supercoppa, allenamento, automation, test simulazione
// ====================================================================

(function() {
    'use strict';

    // ====================================================================
    // FORMATTERS
    // ====================================================================

    /**
     * Trova il giocatore principale (più alto livello) da un array di giocatori
     */
    const getMainPlayer = (players, preferredRole = null) => {
        if (!players || players.length === 0) return null;

        // Se c'è un ruolo preferito, filtra prima per quello
        if (preferredRole) {
            const roleFiltered = players.filter(p => p.role === preferredRole);
            if (roleFiltered.length > 0) {
                return roleFiltered.reduce((max, p) => (p.level || 0) > (max.level || 0) ? p : max);
            }
        }

        // Altrimenti prendi il più alto livello
        return players.reduce((max, p) => (p.level || 0) > (max.level || 0) ? p : max);
    };

    /**
     * Formatta un giocatore per il log: "Nome [Lv.X]"
     * @param {Object} player - Dati giocatore
     * @param {string} team - 'home' per squadra casa (blu), 'away' per squadra ospite (rosso)
     */
    const formatPlayer = (player, team = null) => {
        if (!player) return '???';
        const level = player.level || player.currentLevel || 1;
        const name = player.name || 'Giocatore';
        const text = `${name} [Lv.${level}]`;

        // Se specificato un team, colora il testo
        if (team === 'home') {
            return `<span class="text-blue-400">${text}</span>`;
        } else if (team === 'away') {
            return `<span class="text-red-400">${text}</span>`;
        }
        return text;
    };

    /**
     * Formatta le abilità attive
     */
    const formatAbilities = (abilities) => {
        if (!abilities || abilities.length === 0) return '';
        return abilities.join(', ');
    };

    /**
     * Genera il risultato con emoji appropriata
     * @param {string} phase - 'construction', 'attack', 'shot'
     * @param {string} result - 'success', 'fail', 'goal', 'save', etc.
     * @param {boolean} isGoal - se è un gol nella fase finale
     */
    const getResultEmoji = (phase, result, isGoal = false) => {
        if (phase === 'construction') {
            return result === 'success' || result === 'lucky' ? '✅' : '🛑';
        }
        if (phase === 'attack') {
            return result === 'success' || result === 'lucky' ? '👟' : '🛑';
        }
        if (phase === 'shot') {
            if (result === 'goal' || result === 'lucky_goal' || result === 'draw_goal') {
                return '⚽';
            }
            return '🧤';
        }
        return isGoal ? '⚽' : '🛑';
    };

    // ====================================================================
    // HIGHLIGHT GENERATION
    // ====================================================================

    /**
     * Genera le "Azioni Salienti" da un eventData
     * @param {Object} eventData - I dati dell'occasione dalla simulazione
     * @param {string} attackingTeamName - Nome squadra attaccante
     * @param {string} defendingTeamName - Nome squadra difendente
     * @param {boolean} attackerIsHome - true se l'attaccante e' la squadra di casa (blu), false se ospite (rosso)
     * @returns {Object} - { highlights: string[], isGoal: boolean, scorer: string|null, assister: string|null }
     */
    const generateHighlights = (eventData, attackingTeamName = 'ATT', defendingTeamName = 'DIF', attackerIsHome = true) => {
        const highlights = [];
        let scorer = null;
        let assister = null;
        const isGoal = eventData.result === 'goal';

        // Determina i colori: attaccante e difensore
        const attackerTeam = attackerIsHome ? 'home' : 'away';
        const defenderTeam = attackerIsHome ? 'away' : 'home';

        highlights.push(`\n🎯 OCCASIONE ${eventData.occasionNumber} - ${attackingTeamName}`);

        // ===== FASE 1: COSTRUZIONE =====
        const construction = eventData.phases?.construction;
        if (construction) {
            highlights.push(`\n📊 FASE COSTRUZIONE`);

            if (construction.skipped) {
                highlights.push(`⏩ Saltata (${construction.reason})`);
            } else {
                // Abilità
                const abilitiesUsed = eventData.abilities?.filter(a => a.includes('costruzione')) || [];
                if (abilitiesUsed.length > 0) {
                    highlights.push(`✨ Abilità: ${abilitiesUsed.join(', ')}`);
                }

                // Giocatori principali
                const mainAttacker = getMainPlayer(construction.players?.attacker, 'C');
                const mainDefender = getMainPlayer(construction.players?.defender, 'C');

                // Confronto
                const rollA = construction.rolls?.attacker || 0;
                const modA = construction.modifiers?.attacker || 0;
                const coachA = construction.coach?.attacker || 0;
                const totalA = construction.totals?.attacker || (rollA + modA + coachA);

                const rollB = construction.rolls?.defender || 0;
                const modB = construction.modifiers?.defender || 0;
                const coachB = construction.coach?.defender || 0;
                const totalB = construction.totals?.defender || (rollB + modB + coachB);

                highlights.push(`⚔️ ${formatPlayer(mainAttacker, attackerTeam)} (🎲${rollA} +${modA.toFixed(1)}) = ${totalA.toFixed(1)}`);
                highlights.push(`   VS ${formatPlayer(mainDefender, defenderTeam)} (🎲${rollB} +${modB.toFixed(1)}) = ${totalB.toFixed(1)}`);

                const emoji = getResultEmoji('construction', construction.result);
                const resultText = construction.result === 'success' ? 'Superata!' :
                                  construction.result === 'lucky' ? 'Fortuna! (5%)' : 'Fallita';
                highlights.push(`   ${emoji} ${resultText}`);

                if (construction.result === 'fail') {
                    return { highlights, isGoal: false, scorer: null, assister: null };
                }
            }
        }

        // ===== FASE 2: ATTACCO =====
        const attack = eventData.phases?.attack;
        if (attack) {
            highlights.push(`\n📊 FASE ATTACCO vs DIFESA`);

            if (attack.interrupted) {
                highlights.push(`🚫 Interrotta (${attack.reason})`);
                return { highlights, isGoal: false, scorer: null, assister: null };
            }

            // Abilità
            const abilitiesUsed = eventData.abilities?.filter(a => a.includes('attacco')) || [];
            if (abilitiesUsed.length > 0) {
                highlights.push(`✨ Abilità: ${abilitiesUsed.join(', ')}`);
            }

            // Giocatori principali
            const mainAttacker = getMainPlayer(attack.players?.attacker, 'A');
            const mainDefender = getMainPlayer(attack.players?.defender, 'D');

            // Confronto
            const rollA = attack.rolls?.attacker || 0;
            const modA = attack.modifiers?.attacker || 0;
            const coachA = attack.coach?.attacker || 0;
            const totalA = attack.totals?.attacker || (rollA + modA + coachA);

            const rollB = attack.rolls?.defender || 0;
            const modB = attack.modifiers?.defender || 0;
            const coachB = attack.coach?.defender || 0;
            const totalB = attack.totals?.defender || (rollB + modB + coachB);

            highlights.push(`⚔️ ${formatPlayer(mainAttacker, attackerTeam)} (🎲${rollA} +${modA.toFixed(1)}) = ${totalA.toFixed(1)}`);
            highlights.push(`   VS ${formatPlayer(mainDefender, defenderTeam)} (🎲${rollB} +${modB.toFixed(1)}) = ${totalB.toFixed(1)}`);

            const attackResult = attack.attackResult || (totalA - totalB);
            const emoji = getResultEmoji('attack', attack.result);
            const resultText = attack.result === 'success' ? `Superata! (+${attackResult.toFixed(1)})` :
                              attack.result === 'lucky' ? 'Fortuna! (5%)' : 'Fallita';
            highlights.push(`   ${emoji} ${resultText}`);

            // Traccia potenziale assistman
            if (attack.result === 'success' || attack.result === 'lucky') {
                assister = mainAttacker?.name || null;
            }

            if (attack.result === 'fail') {
                return { highlights, isGoal: false, scorer: null, assister: null };
            }
        }

        // ===== FASE 3: TIRO =====
        const shot = eventData.phases?.shot;
        if (shot) {
            highlights.push(`\n📊 FASE TIRO vs PORTIERE`);

            if (shot.noGoalkeeper) {
                highlights.push(`🥅 Nessun portiere!`);
                highlights.push(`   ⚽ GOL AUTOMATICO!`);
                scorer = assister; // Chi ha passato la fase attacco è anche il marcatore
                assister = null;
                return { highlights, isGoal: true, scorer, assister: null };
            }

            // Abilità
            const abilitiesUsed = eventData.abilities?.filter(a =>
                a.includes('gol') || a.includes('Miracolo') || a.includes('Opportunista')
            ) || [];
            if (abilitiesUsed.length > 0) {
                highlights.push(`✨ Abilità: ${abilitiesUsed.join(', ')}`);
            }

            // Dati tiro
            const attackValue = shot.attackValue || 0;
            const attackBonus = shot.modifiers?.attackBonus || 0;

            // Dati portiere
            const goalkeeper = shot.goalkeeper;
            const rollP = shot.rolls?.goalkeeper || 0;
            const modP = shot.modifiers?.goalkeeper || 0;
            const coachP = shot.coach?.goalkeeper || 0;
            const totalP = shot.totalGoalkeeper || (rollP + modP + coachP);

            // Trova l'attaccante che ha tirato (il migliore dalla fase attacco)
            const shooter = getMainPlayer(attack?.players?.attacker, 'A');
            scorer = shooter?.name || assister || 'Attaccante';

            // Abilità speciali portiere
            let gkAbilities = '';
            if (shot.kamikazeActive) gkAbilities += ' 🦸';

            highlights.push(`⚔️ ${formatPlayer(shooter, attackerTeam)} (Tiro: ${attackValue.toFixed(1)}${attackBonus > 0 ? ` +${attackBonus}🎯` : ''})`);
            highlights.push(`   VS ${formatPlayer(goalkeeper, defenderTeam)}${gkAbilities} (🎲${rollP} +${modP.toFixed(1)}) = ${totalP.toFixed(1)}`);

            const saveResult = shot.saveResult || 0;
            const emoji = getResultEmoji('shot', shot.result);

            let resultText = '';
            if (shot.result === 'goal') {
                resultText = `GOL! ${scorer} segna!`;
            } else if (shot.result === 'lucky_goal') {
                resultText = `GOL FORTUNATO! (5%) ${scorer} segna!`;
            } else if (shot.result === 'draw_goal') {
                resultText = `GOAL! (50/50) ${scorer} segna!`;
            } else if (shot.result === 'save') {
                resultText = `PARATO da ${goalkeeper?.name || 'Portiere'}!`;
                scorer = null;
            } else if (shot.result === 'draw_save') {
                resultText = `PARATO! (50/50) ${goalkeeper?.name || 'Portiere'} salva!`;
                scorer = null;
            } else if (shot.result === 'miracolo_save') {
                resultText = `MIRACOLO! ${goalkeeper?.name || 'Portiere'} para l'impossibile!`;
                scorer = null;
            } else {
                resultText = shot.result || 'Esito sconosciuto';
            }

            highlights.push(`   ${emoji} ${resultText}`);

            // Gestione assist - solo se c'è gol e il tiratore è diverso dall'assistman
            if (isGoal && assister && scorer && assister !== scorer) {
                highlights.push(`   🎯 Assist di ${assister}!`);
            } else {
                assister = null; // Niente assist se stesso giocatore o niente gol
            }
        }

        return { highlights, isGoal, scorer, assister };
    };

    /**
     * Genera un riassunto breve di una singola occasione
     * Esempio output: "Goal di Rossi, assist di Bianchi" o "Parata di Buffon"
     * @param {Object} eventData - Dati dell'occasione dalla simulazione
     * @param {string} attackingTeamName - Nome squadra attaccante
     * @param {string} defendingTeamName - Nome squadra difendente
     * @returns {string} - Riassunto breve dell'occasione
     */
    const generateEventSummary = (eventData, attackingTeamName = 'ATT', defendingTeamName = 'DIF') => {
        const result = eventData.result;
        const construction = eventData.phases?.construction;
        const attack = eventData.phases?.attack;
        const shot = eventData.phases?.shot;

        // Gol segnato
        if (result === 'goal' || result === 'lucky_goal' || result === 'draw_goal') {
            const shooter = getMainPlayer(attack?.players?.attacker, 'A');
            const scorer = shooter?.name || 'Attaccante';
            const assisterPlayer = getMainPlayer(construction?.players?.attacker, 'C');
            const assister = assisterPlayer?.name;

            let summaryText = `Goal di ${scorer}`;
            if (result === 'lucky_goal') {
                summaryText = `Goal fortunato di ${scorer}`;
            }
            if (assister && assister !== scorer) {
                summaryText += `, assist di ${assister}`;
            }
            return summaryText;
        }

        // Costruzione fallita
        if (construction?.result === 'fail') {
            const defender = getMainPlayer(construction?.players?.defender, 'C');
            const defenderName = defender?.name || 'Difensore';
            return `Contrasto di ${defenderName}`;
        }

        // Attacco fallito (difesa vince)
        if (attack?.result === 'fail') {
            const defender = getMainPlayer(attack?.players?.defender, 'D');
            const defenderName = defender?.name || 'Difensore';
            return `Contrasto di ${defenderName}`;
        }

        // Parata del portiere
        if (shot?.result === 'save') {
            const gk = shot?.goalkeeper?.name || 'Portiere';
            return `Parata di ${gk}`;
        }
        if (shot?.result === 'draw_save') {
            const gk = shot?.goalkeeper?.name || 'Portiere';
            return `Parata di ${gk} (50/50)`;
        }
        if (shot?.result === 'miracolo_save') {
            const gk = shot?.goalkeeper?.name || 'Portiere';
            return `Miracolo di ${gk}`;
        }

        return 'Occasione sprecata';
    };

    /**
     * Genera un riepilogo finale della partita
     */
    const generateMatchSummary = (occasionsData, teamAName, teamBName, scoreA, scoreB) => {
        const summary = [];
        summary.push(`\n${'='.repeat(50)}`);
        summary.push(`📋 RIEPILOGO PARTITA`);
        summary.push(`${teamAName} ${scoreA} - ${scoreB} ${teamBName}`);
        summary.push(`${'='.repeat(50)}`);

        // Statistiche gol
        const goalsA = occasionsData.filter(o => o.isGoal && o.attackingTeam === 'A');
        const goalsB = occasionsData.filter(o => o.isGoal && o.attackingTeam === 'B');

        if (goalsA.length > 0) {
            summary.push(`\n⚽ Gol ${teamAName}:`);
            goalsA.forEach(g => {
                const assistText = g.assister ? ` (assist: ${g.assister})` : '';
                summary.push(`   - ${g.scorer}${assistText}`);
            });
        }

        if (goalsB.length > 0) {
            summary.push(`\n⚽ Gol ${teamBName}:`);
            goalsB.forEach(g => {
                const assistText = g.assister ? ` (assist: ${g.assister})` : '';
                summary.push(`   - ${g.scorer}${assistText}`);
            });
        }

        return summary;
    };

    // ====================================================================
    // DEBUG LOG (solo per test simulazione)
    // ====================================================================

    /**
     * Genera log di debug dettagliato (usato solo in test simulazione)
     */
    const generateDebugLog = (eventData, attackingTeam, defendingTeam) => {
        const debug = [];
        debug.push(`\n${'#'.repeat(60)}`);
        debug.push(`# DEBUG - OCCASIONE ${eventData.occasionNumber}`);
        debug.push(`${'#'.repeat(60)}`);

        // Fase Costruzione
        if (eventData.phases?.construction && !eventData.phases.construction.skipped) {
            const c = eventData.phases.construction;
            debug.push(`\n[COSTRUZIONE - DEBUG]`);
            debug.push(`  Giocatori ATT: ${c.players?.attacker?.map(p => `${p.name}(${p.role}L${p.level})`).join(', ')}`);
            debug.push(`  Giocatori DIF: ${c.players?.defender?.map(p => `${p.name}(${p.role}L${p.level})`).join(', ')}`);
            debug.push(`  Roll ATT: ${c.rolls?.attacker} | Mod: ${c.modifiers?.attacker?.toFixed(2)} | Coach: ${c.coach?.attacker?.toFixed(2)} | Tot: ${c.totals?.attacker?.toFixed(2)}`);
            debug.push(`  Roll DIF: ${c.rolls?.defender} | Mod: ${c.modifiers?.defender?.toFixed(2)} | Coach: ${c.coach?.defender?.toFixed(2)} | Tot: ${c.totals?.defender?.toFixed(2)}`);
            debug.push(`  Success Chance: ${c.successChance}% | d100: ${c.roll100} | Result: ${c.result}`);
            if (c.luckyRoll) debug.push(`  Lucky Roll: ${c.luckyRoll}`);
        }

        // Fase Attacco
        if (eventData.phases?.attack && !eventData.phases.attack.interrupted) {
            const a = eventData.phases.attack;
            debug.push(`\n[ATTACCO - DEBUG]`);
            debug.push(`  Giocatori ATT: ${a.players?.attacker?.map(p => `${p.name}(${p.role}L${p.level})`).join(', ')}`);
            debug.push(`  Giocatori DIF: ${a.players?.defender?.map(p => `${p.name}(${p.role}L${p.level})`).join(', ')}`);
            debug.push(`  Roll ATT: ${a.rolls?.attacker} | Mod: ${a.modifiers?.attacker?.toFixed(2)} | Coach: ${a.coach?.attacker?.toFixed(2)} | Tot: ${a.totals?.attacker?.toFixed(2)}`);
            debug.push(`  Roll DIF: ${a.rolls?.defender} | Mod: ${a.modifiers?.defender?.toFixed(2)} | Coach: ${a.coach?.defender?.toFixed(2)} | Tot: ${a.totals?.defender?.toFixed(2)}`);
            debug.push(`  Attack Result: ${a.attackResult?.toFixed(2)} | Final: ${a.finalAttackResult?.toFixed(2)} | Result: ${a.result}`);
            if (a.luckyRoll) debug.push(`  Lucky Roll: ${a.luckyRoll}`);
        }

        // Fase Tiro
        if (eventData.phases?.shot && !eventData.phases.shot.noGoalkeeper) {
            const s = eventData.phases.shot;
            debug.push(`\n[TIRO - DEBUG]`);
            debug.push(`  Portiere: ${s.goalkeeper?.name} (L${s.goalkeeper?.level}) Tipo: ${s.goalkeeper?.type}`);
            debug.push(`  Attack Value: ${s.attackValue?.toFixed(2)} | Bonus: ${s.modifiers?.attackBonus}`);
            debug.push(`  Roll GK: ${s.rolls?.goalkeeper} | Mod: ${s.modifiers?.goalkeeper?.toFixed(2)} | Coach: ${s.coach?.goalkeeper?.toFixed(2)} | Tot: ${s.totalGoalkeeper?.toFixed(2)}`);
            debug.push(`  Save Result: ${s.saveResult?.toFixed(2)} | Threshold: ${s.saveThreshold} | Result: ${s.result}`);
            if (s.kamikazeActive) debug.push(`  Kamikaze Active: SI`);
            if (s.fiftyFiftyRoll) debug.push(`  50/50 Roll: ${s.fiftyFiftyRoll} (${s.goalChance}% chance)`);
            if (s.luckyRoll) debug.push(`  Lucky Roll: ${s.luckyRoll}`);
            if (s.miracoloRoll) debug.push(`  Miracolo Roll: ${s.miracoloRoll}`);
        }

        debug.push(`\n  ESITO FINALE: ${eventData.result === 'goal' ? '⚽ GOL' : '❌ NO GOL'}`);
        debug.push(`${'#'.repeat(60)}`);

        return debug;
    };

    // ====================================================================
    // MAIN EXPORT FUNCTIONS
    // ====================================================================

    /**
     * Simula una partita e genera le Azioni Salienti
     * Wrapper per le simulazioni che genera automaticamente gli highlights
     */
    const runSimulationWithHighlights = (teamA, teamB, options = {}) => {
        const {
            occasions = 10,
            teamAName = teamA.name || 'Squadra A',
            teamBName = teamB.name || 'Squadra B',
            includeDebug = false,
            homePenalty = 0
        } = options;

        const logic = window.simulationLogic;
        if (!logic) {
            console.error('simulationLogic non disponibile');
            return null;
        }

        // Reset stato simulazione
        logic.resetSimulationState?.();
        logic.setTotalOccasions?.(occasions);

        let scoreA = 0;
        let scoreB = 0;
        const allHighlights = [];
        const occasionsData = [];
        const allDebugLogs = [];

        // Inizializza bonus icona
        logic.initIconaBonusForMatch?.(teamA);
        logic.initIconaBonusForMatch?.(teamB);
        logic.initAbilitiesForMatch?.(teamA);
        logic.initAbilitiesForMatch?.(teamB);

        for (let i = 1; i <= occasions; i++) {
            // Alterna le squadre (con penalità casa se specificata)
            const isTeamAAttacking = (i % 2 === 1);
            const attackingTeam = isTeamAAttacking ? teamA : teamB;
            const defendingTeam = isTeamAAttacking ? teamB : teamA;
            const attackingTeamName = isTeamAAttacking ? teamAName : teamBName;
            const defendingTeamName = isTeamAAttacking ? teamBName : teamAName;

            // Aggiorna punteggio corrente per le abilità
            logic.updateScore?.('A', scoreA);
            logic.updateScore?.('B', scoreB);

            // Simula l'occasione
            const result = logic.simulateOneOccasionWithLog(attackingTeam, defendingTeam, i);

            // Genera highlights (teamA = home/blu, teamB = away/rosso)
            const attackerIsHome = isTeamAAttacking;
            const highlightResult = generateHighlights(result.eventData, attackingTeamName, defendingTeamName, attackerIsHome);
            highlightResult.occasionNumber = i;
            highlightResult.attackingTeam = isTeamAAttacking ? 'A' : 'B';

            allHighlights.push(...highlightResult.highlights);
            occasionsData.push(highlightResult);

            // Debug log se richiesto
            if (includeDebug) {
                allDebugLogs.push(...generateDebugLog(result.eventData, attackingTeam, defendingTeam));
            }

            // Aggiorna punteggio
            if (result.goal) {
                if (isTeamAAttacking) {
                    scoreA++;
                } else {
                    scoreB++;
                }
            }
        }

        // Aggiungi riepilogo
        const summary = generateMatchSummary(occasionsData, teamAName, teamBName, scoreA, scoreB);
        allHighlights.push(...summary);

        return {
            scoreA,
            scoreB,
            winner: scoreA > scoreB ? 'A' : (scoreB > scoreA ? 'B' : 'draw'),
            highlights: allHighlights,
            debugLog: includeDebug ? allDebugLogs : null,
            occasionsData,
            highlightsText: allHighlights.join('\n'),
            debugText: includeDebug ? allDebugLogs.join('\n') : null
        };
    };

    /**
     * Genera highlights da un singolo eventData
     * Utility per quando la simulazione è già stata fatta
     */
    const createHighlightsFromEvent = generateHighlights;

    // ====================================================================
    // ESPOSIZIONE GLOBALE
    // ====================================================================

    window.SimulationHighlights = {
        // Main functions
        runSimulationWithHighlights,
        generateHighlights,
        createHighlightsFromEvent,
        generateEventSummary,

        // Utilities
        generateMatchSummary,
        generateDebugLog,
        formatPlayer,
        getMainPlayer,
        getResultEmoji
    };

    console.log('✅ SimulationHighlights module loaded');

})();
