//
// ====================================================================
// SIMULAZIONE-NUOVE-REGOLE.JS - Simulazione Partita con Nuove Regole
// ====================================================================
// Implementa il regolamento descritto in "regole test simulazioni.txt"
//

window.SimulazioneNuoveRegole = {

    // Tabella modificatori livello secondo le nuove regole
    LEVEL_MODIFIERS: {
        1: 1.0,   2: 1.5,   3: 2.0,   4: 2.5,   5: 3.0,
        6: 3.5,   7: 4.0,   8: 4.5,   9: 5.0,   10: 5.5,
        11: 6.0,  12: 6.5,  13: 7.0,  14: 7.5,  15: 8.0,
        16: 8.5,  17: 9.0,  18: 9.5,  19: 10.0, 20: 11.0,
        21: 11.5, 22: 12.0, 23: 12.5, 24: 13.0, 25: 14.0,
        26: 14.5, 27: 15.0, 28: 15.5, 29: 17.5, 30: 18.5
    },

    // Costanti
    OCCASIONS_PER_TEAM: 30,
    LUCKY_PASS_CHANCE: 0.05,  // 5% di passare comunque
    LUCKY_GOAL_CHANCE: 0.05,  // 5% di goal su parata
    TYPE_ADVANTAGE_MIN: 0.05, // +5% min
    TYPE_ADVANTAGE_MAX: 0.25, // +25% max

    /**
     * Ottiene il modificatore per un livello
     */
    getLevelModifier(level) {
        return this.LEVEL_MODIFIERS[level] || 1.0;
    },

    /**
     * Tira un dado da 1 a max
     */
    rollDice(max = 20) {
        return Math.floor(Math.random() * max) + 1;
    },

    /**
     * Tira percentuale (1-100)
     */
    rollPercentage() {
        return Math.floor(Math.random() * 100) + 1;
    },

    /**
     * Seleziona un giocatore casuale per ruolo
     */
    getRandomPlayerByRole(players, roles) {
        const eligible = players.filter(p => roles.includes(p.role));
        if (eligible.length === 0) return null;
        return eligible[Math.floor(Math.random() * eligible.length)];
    },

    /**
     * Calcola il modificatore tipo (sasso-carta-forbice)
     * Potenza > Tecnica > Velocita > Potenza
     */
    getTypeModifier(attackerType, defenderType) {
        const advantage = this.TYPE_ADVANTAGE_MIN + Math.random() * (this.TYPE_ADVANTAGE_MAX - this.TYPE_ADVANTAGE_MIN);

        if (attackerType === 'Potenza' && defenderType === 'Tecnica') return { attacker: advantage, defender: -advantage };
        if (attackerType === 'Tecnica' && defenderType === 'Velocita') return { attacker: advantage, defender: -advantage };
        if (attackerType === 'Velocita' && defenderType === 'Potenza') return { attacker: advantage, defender: -advantage };

        // Svantaggio (inverso)
        if (attackerType === 'Tecnica' && defenderType === 'Potenza') return { attacker: -advantage, defender: advantage };
        if (attackerType === 'Velocita' && defenderType === 'Tecnica') return { attacker: -advantage, defender: advantage };
        if (attackerType === 'Potenza' && defenderType === 'Velocita') return { attacker: -advantage, defender: advantage };

        return { attacker: 0, defender: 0 };
    },

    /**
     * Calcola modificatore totale di un giocatore
     */
    calculatePlayerModifier(player, teamData, isCaptain = false) {
        let mod = this.getLevelModifier(player.level || 1);

        // Bonus forma fisica
        const formStatus = teamData.playersFormStatus?.[player.id];
        if (formStatus?.mod) {
            mod += formStatus.mod;
        }

        // Bonus capitano (+1)
        if (isCaptain || player.isCaptain) {
            mod += 1;
        }

        return mod;
    },

    /**
     * Calcola bonus allenatore (1/2 livello)
     */
    getCoachBonus(teamData) {
        const coachLevel = teamData.coach?.level || 1;
        return coachLevel / 2;
    },

    /**
     * Esegue la simulazione completa
     */
    runSimulation(homeTeamData, awayTeamData) {
        const result = this.runSimulationWithLog(homeTeamData, awayTeamData);
        return {
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals
        };
    },

    /**
     * Esegue la simulazione con log dettagliato
     */
    runSimulationWithLog(homeTeamData, awayTeamData) {
        const log = [];
        const simpleLog = [];
        let homeGoals = 0;
        let awayGoals = 0;

        const homePlayers = homeTeamData.formation?.titolari || [];
        const awayPlayers = awayTeamData.formation?.titolari || [];

        const homeCoachBonus = this.getCoachBonus(homeTeamData);
        const awayCoachBonus = this.getCoachBonus(awayTeamData);

        // Bonus stadio (solo casa)
        const homeStadiumBonus = homeTeamData.stadium?.totalBonus || 0;

        log.push('='.repeat(60));
        log.push(`PARTITA: ${homeTeamData.teamName} vs ${awayTeamData.teamName}`);
        log.push(`Bonus Allenatore Casa: +${homeCoachBonus.toFixed(1)} | Trasferta: +${awayCoachBonus.toFixed(1)}`);
        if (homeStadiumBonus > 0) {
            log.push(`Bonus Stadio Casa: +${homeStadiumBonus.toFixed(2)}`);
        }
        log.push('='.repeat(60));
        log.push('');

        simpleLog.push(`${homeTeamData.teamName} vs ${awayTeamData.teamName}`);
        simpleLog.push('-'.repeat(40));

        // 30 occasioni per squadra (alternando)
        for (let i = 0; i < this.OCCASIONS_PER_TEAM * 2; i++) {
            const isHomeAttacking = i % 2 === 0;
            const occasionNumber = Math.floor(i / 2) + 1;

            const attackingTeam = isHomeAttacking ? homeTeamData : awayTeamData;
            const defendingTeam = isHomeAttacking ? awayTeamData : homeTeamData;
            const attackingPlayers = isHomeAttacking ? homePlayers : awayPlayers;
            const defendingPlayers = isHomeAttacking ? awayPlayers : homePlayers;
            const attackingCoachBonus = isHomeAttacking ? homeCoachBonus : awayCoachBonus;
            const defendingCoachBonus = isHomeAttacking ? awayCoachBonus : homeCoachBonus;
            const stadiumBonus = isHomeAttacking ? homeStadiumBonus : 0;

            log.push(`--- Occasione ${occasionNumber} (${attackingTeam.teamName} attacca) ---`);

            const occasionResult = this.simulateOccasion(
                attackingTeam, defendingTeam,
                attackingPlayers, defendingPlayers,
                attackingCoachBonus, defendingCoachBonus,
                stadiumBonus, log
            );

            if (occasionResult.goal) {
                if (isHomeAttacking) {
                    homeGoals++;
                    simpleLog.push(`⚽ ${occasionNumber}' GOAL ${homeTeamData.teamName}! (${occasionResult.scorer})`);
                } else {
                    awayGoals++;
                    simpleLog.push(`⚽ ${occasionNumber}' GOAL ${awayTeamData.teamName}! (${occasionResult.scorer})`);
                }
            }

            log.push('');
        }

        log.push('='.repeat(60));
        log.push(`RISULTATO FINALE: ${homeTeamData.teamName} ${homeGoals} - ${awayGoals} ${awayTeamData.teamName}`);
        log.push('='.repeat(60));

        simpleLog.push('-'.repeat(40));
        simpleLog.push(`FINALE: ${homeGoals} - ${awayGoals}`);

        return {
            homeGoals,
            awayGoals,
            log,
            simpleLog
        };
    },

    /**
     * Simula una singola occasione (3 fasi)
     */
    simulateOccasion(attackingTeam, defendingTeam, attackingPlayers, defendingPlayers, attackingCoachBonus, defendingCoachBonus, stadiumBonus, log) {

        // === FASE 1: COSTRUZIONE ===
        // D/C attaccante vs C difensore
        const phase1Attacker = this.getRandomPlayerByRole(attackingPlayers, ['D', 'C']);
        const phase1Defender = this.getRandomPlayerByRole(defendingPlayers, ['C']);

        if (!phase1Attacker || !phase1Defender) {
            log.push('  Fase 1: Giocatori insufficienti - azione fallita');
            return { goal: false };
        }

        const p1AttMod = this.calculatePlayerModifier(phase1Attacker, attackingTeam);
        const p1DefMod = this.calculatePlayerModifier(phase1Defender, defendingTeam);
        const p1TypeMod = this.getTypeModifier(phase1Attacker.type, phase1Defender.type);

        const p1AttRoll = this.rollDice(20);
        const p1DefRoll = this.rollDice(20);

        const p1AttTotal = p1AttRoll + p1AttMod * (1 + p1TypeMod.attacker) + attackingCoachBonus + stadiumBonus;
        const p1DefTotal = p1DefRoll + p1DefMod * (1 + p1TypeMod.defender) + defendingCoachBonus;

        // La differenza determina la % di riuscita
        const phase1Diff = p1AttTotal - p1DefTotal;
        const passChance = Math.max(5, Math.min(95, 50 + phase1Diff * 2)); // 5-95% range
        const phase1Roll = this.rollPercentage();
        const phase1Success = phase1Roll <= passChance;

        const p1AttCaptain = phase1Attacker.isCaptain ? ' [C]' : '';
        const p1DefCaptain = phase1Defender.isCaptain ? ' [C]' : '';
        log.push(`  Fase 1 (Costruzione):`);
        log.push(`    ATT: ${phase1Attacker.name}${p1AttCaptain} (${phase1Attacker.role}, ${phase1Attacker.type || 'N/A'}, Lv.${phase1Attacker.level || 1})`);
        log.push(`    DIF: ${phase1Defender.name}${p1DefCaptain} (${phase1Defender.role}, ${phase1Defender.type || 'N/A'}, Lv.${phase1Defender.level || 1})`);
        log.push(`    ATT: 1d20(${p1AttRoll}) + mod(${p1AttMod.toFixed(1)}) + coach(${attackingCoachBonus.toFixed(1)}) = ${p1AttTotal.toFixed(1)}`);
        log.push(`    DIF: 1d20(${p1DefRoll}) + mod(${p1DefMod.toFixed(1)}) + coach(${defendingCoachBonus.toFixed(1)}) = ${p1DefTotal.toFixed(1)}`);
        log.push(`    Probabilita passaggio: ${passChance.toFixed(0)}% | Tiro: ${phase1Roll}`);

        if (!phase1Success) {
            // 5% di passare comunque
            if (Math.random() < this.LUCKY_PASS_CHANCE) {
                log.push(`    FALLIMENTO ma passaggio fortunato! (5% chance)`);
            } else {
                log.push(`    FALLIMENTO - Azione interrotta`);
                return { goal: false };
            }
        } else {
            log.push(`    SUCCESSO - Si passa alla Fase 2`);
        }

        // === FASE 2: ATTACCO VS DIFESA ===
        // A/C attaccante vs D/C difensore
        const phase2Attacker = this.getRandomPlayerByRole(attackingPlayers, ['A', 'C']);
        const phase2Defender = this.getRandomPlayerByRole(defendingPlayers, ['D', 'C']);

        if (!phase2Attacker || !phase2Defender) {
            log.push('  Fase 2: Giocatori insufficienti - azione fallita');
            return { goal: false };
        }

        const p2AttMod = this.calculatePlayerModifier(phase2Attacker, attackingTeam);
        const p2DefMod = this.calculatePlayerModifier(phase2Defender, defendingTeam);
        const p2TypeMod = this.getTypeModifier(phase2Attacker.type, phase2Defender.type);

        const p2AttRoll = this.rollDice(20);
        const p2DefRoll = this.rollDice(20);

        const p2AttTotal = p2AttRoll + p2AttMod * (1 + p2TypeMod.attacker) + attackingCoachBonus + stadiumBonus;
        const p2DefTotal = p2DefRoll + p2DefMod * (1 + p2TypeMod.defender) + defendingCoachBonus;

        const p2AttCaptain = phase2Attacker.isCaptain ? ' [C]' : '';
        const p2DefCaptain = phase2Defender.isCaptain ? ' [C]' : '';
        log.push(`  Fase 2 (Attacco):`);
        log.push(`    ATT: ${phase2Attacker.name}${p2AttCaptain} (${phase2Attacker.role}, ${phase2Attacker.type || 'N/A'}, Lv.${phase2Attacker.level || 1})`);
        log.push(`    DIF: ${phase2Defender.name}${p2DefCaptain} (${phase2Defender.role}, ${phase2Defender.type || 'N/A'}, Lv.${phase2Defender.level || 1})`);
        log.push(`    ATT: 1d20(${p2AttRoll}) + mod(${p2AttMod.toFixed(1)}) = ${p2AttTotal.toFixed(1)}`);
        log.push(`    DIF: 1d20(${p2DefRoll}) + mod(${p2DefMod.toFixed(1)}) = ${p2DefTotal.toFixed(1)}`);

        const phase2Success = p2AttTotal > p2DefTotal;
        let shotValue = phase2Success ? p2AttTotal : 5;

        if (!phase2Success) {
            // 5% di passare comunque con valore tiro = 5
            if (Math.random() < this.LUCKY_PASS_CHANCE) {
                log.push(`    FALLIMENTO ma passaggio fortunato! Valore Tiro = 5`);
                shotValue = 5;
            } else {
                log.push(`    FALLIMENTO - Difesa recupera palla`);
                return { goal: false };
            }
        } else {
            log.push(`    SUCCESSO - Valore Tiro: ${shotValue.toFixed(1)}`);
        }

        // === FASE 3: TIRO VS PORTIERE ===
        const shooter = this.getRandomPlayerByRole(attackingPlayers, ['A', 'C']);
        const goalkeeper = this.getRandomPlayerByRole(defendingPlayers, ['P']);

        if (!shooter || !goalkeeper) {
            log.push('  Fase 3: Giocatori insufficienti - azione fallita');
            return { goal: false };
        }

        const shooterMod = this.calculatePlayerModifier(shooter, attackingTeam);
        const gkMod = this.calculatePlayerModifier(goalkeeper, defendingTeam);

        const shooterRoll = this.rollDice(20);
        const gkRoll = this.rollDice(20);

        const shooterTotal = shooterRoll + shooterMod + attackingCoachBonus + stadiumBonus;
        const gkTotal = gkRoll + gkMod + defendingCoachBonus;

        const phase3Diff = gkTotal - shooterTotal;

        const shooterCaptain = shooter.isCaptain ? ' [C]' : '';
        const gkCaptain = goalkeeper.isCaptain ? ' [C]' : '';
        log.push(`  Fase 3 (Tiro):`);
        log.push(`    TIRO: ${shooter.name}${shooterCaptain} (${shooter.role}, ${shooter.type || 'N/A'}, Lv.${shooter.level || 1})`);
        log.push(`    PORT: ${goalkeeper.name}${gkCaptain} (${goalkeeper.role}, ${goalkeeper.type || 'N/A'}, Lv.${goalkeeper.level || 1})`);
        log.push(`    TIRO: 1d20(${shooterRoll}) + mod(${shooterMod.toFixed(1)}) = ${shooterTotal.toFixed(1)}`);
        log.push(`    PORT: 1d20(${gkRoll}) + mod(${gkMod.toFixed(1)}) = ${gkTotal.toFixed(1)}`);
        log.push(`    Differenza (PORT - TIRO): ${phase3Diff.toFixed(1)}`);

        let isGoal = false;
        let scorer = shooter.name;

        if (phase3Diff > 0) {
            // Parata, ma 5% di goal fortunato
            if (Math.random() < this.LUCKY_GOAL_CHANCE) {
                log.push(`    PARATA ma GOAL fortunato! (5% chance)`);
                isGoal = true;
            } else {
                log.push(`    PARATA di ${goalkeeper.name}!`);
            }
        } else if (phase3Diff === 0) {
            // 50/50
            isGoal = Math.random() < 0.5;
            log.push(`    INCERTO (50/50) -> ${isGoal ? 'GOAL!' : 'PARATA!'}`);
        } else {
            // Goal
            log.push(`    GOAL di ${shooter.name}!`);
            isGoal = true;
        }

        return { goal: isGoal, scorer };
    }
};

console.log("[OK] Modulo SimulazioneNuoveRegole caricato.");
