//
// ====================================================================
// MODULO CAMPIONATO-SIMULATION.JS (Logica Simulazione Partite)
// ====================================================================
//

window.ChampionshipSimulation = {

    /**
     * Prepara i dati della squadra per il motore di simulazione.
     * I modificatori di forma DEVONO provenire da playersFormStatus se esistenti.
     */
    prepareTeamForSimulation(teamData) {
        const getRandomInt = window.getRandomInt;
        let titolari = teamData.formation?.titolari || [];
        const panchina = teamData.formation?.panchina || [];

        // Join titolari con players per recuperare dati completi (incluso name)
        // La formazione salvata non include il campo 'name' per ridurre dimensioni Firestore
        const allPlayers = teamData.players || [];
        titolari = titolari.map(t => {
            const fullPlayer = allPlayers.find(p => p.id === t.id);
            // Unisce i dati: prende tutto da fullPlayer, ma sovrascrive con i dati di t (formazione)
            return fullPlayer ? { ...fullPlayer, ...t } : t;
        });
        const iconaId = teamData.iconaId;
        const coachLevel = teamData.coach?.level || 1;
        
        const MAX_TITOLARI = 5;
        
        // Conteggia i titolari per ruolo
        const countByRole = titolari.reduce((acc, p) => {
            acc[p.role] = (acc[p.role] || 0) + 1;
            return acc;
        }, {});
        
        const portieriAttuali = countByRole['P'] || 0;
        const missingCount = MAX_TITOLARI - titolari.length;
        
        if (missingCount > 0) {
            console.warn(`Squadra ${teamData.teamName}: Mancano ${missingCount} titolari. Aggiunti giocatori fantasma (Livello 1).`);

            const placeholderPlayer = {
                id: crypto.randomUUID(), 
                name: 'Slot Vuoto',
                role: 'C',
                level: 1,
                cost: 0,
                isCaptain: false,
                type: 'N/A',
                abilities: [],
            };
            
            for (let i = 0; i < missingCount; i++) {
                if (portieriAttuali === 0 && i === 0) {
                     titolari.push({...placeholderPlayer, role: 'P', name: 'Portiere Fantasma'});
                } else {
                     titolari.push({...placeholderPlayer, role: 'C', name: 'Centrocampista Fantasma'});
                }
            }
        }
        
        // Normalizza: solo 1 portiere
        const finalTitolari = [];
        let pCount = 0;

        for (const p of titolari) {
            if (p.role === 'P') {
                 if (pCount < 1) {
                      finalTitolari.push(p);
                      pCount++;
                 } else {
                      finalTitolari.push({...p, role: 'C', name: p.name.includes('Fantasma') ? 'Extra Player (C)' : `${p.name} (C)`, level: 1, currentLevel: 1});
                 }
            } else {
                 finalTitolari.push(p);
            }
        }
        titolari = finalTitolari;

        // Recupera i modificatori di forma salvati nel documento della squadra (se esistono)
        const playersFormStatus = teamData.playersFormStatus || {};

        // Applica FORMA (deve usare il dato persistente)
        const playersWithForm = titolari.map(p => {
            const persistedForm = playersFormStatus[p.id];
            let formModifier;
            let currentLevel;
            
            // Usa la forma persistente se disponibile
            if (persistedForm && persistedForm.mod !== undefined && persistedForm.level !== undefined) {
                formModifier = persistedForm.mod;
                currentLevel = Math.min(30, Math.max(1, persistedForm.level));
            } else {
                // Forma non salvata in playersFormStatus
                // Usa currentLevel se gia' calcolato (dal join con players), altrimenti level base
                formModifier = p.formModifier || 0;
                currentLevel = Math.min(30, Math.max(1, p.currentLevel || p.level || 1));
                if (!p.currentLevel) {
                    console.warn(`Forma mancante per ${p.name}. Usato Livello ${currentLevel} in simulazione.`);
                }
            }

            return {
                ...p,
                currentLevel: currentLevel,
                formModifier: formModifier,
                abilities: Array.isArray(p.abilities) ? p.abilities : (p.abilities ? [p.abilities] : [])
            };
        });

        const iconaPlayer = playersWithForm.find(p => p.abilities.includes('Icona'));
        const isIconaActive = iconaPlayer ? iconaPlayer.abilities.includes('Icona') : false;

        // Helper per ordinare giocatori per ruolo (P, D, C, A) e poi per livello decrescente
        const sortByRoleAndLevel = (players) => {
            const roleOrder = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
            return [...players].sort((a, b) => {
                const roleA = roleOrder[a.role] ?? 4;
                const roleB = roleOrder[b.role] ?? 4;
                if (roleA !== roleB) return roleA - roleB;
                return (b.currentLevel || b.level || 0) - (a.currentLevel || a.level || 0);
            });
        };

        const groupedPlayers = {
            P: sortByRoleAndLevel(playersWithForm.filter(p => p.role === 'P')),
            D: sortByRoleAndLevel(playersWithForm.filter(p => p.role === 'D')),
            C: sortByRoleAndLevel(playersWithForm.filter(p => p.role === 'C')),
            A: sortByRoleAndLevel(playersWithForm.filter(p => p.role === 'A')),
            Panchina: panchina.map(p => ({...p, abilities: Array.isArray(p.abilities) ? p.abilities : (p.abilities ? [p.abilities] : [])}))
        };

        groupedPlayers.formationInfo = {
            P: groupedPlayers.P,
            D: groupedPlayers.D,
            C: groupedPlayers.C,
            A: groupedPlayers.A,
            allPlayers: sortByRoleAndLevel(playersWithForm),
            isIconaActive: isIconaActive,
            Panchina: groupedPlayers.Panchina
        };

        groupedPlayers.coachLevel = coachLevel;

        // Bonus figurine uniche (+0.01 al modificatore per figurina unica)
        groupedPlayers.figurineBonus = 0;
        if (window.FigurineSystem?.getUniqueFigurineCountSync) {
            const teamId = teamData.id || teamData.teamId;
            if (teamId) {
                const uniqueCount = window.FigurineSystem.getUniqueFigurineCountSync(teamId);
                groupedPlayers.figurineBonus = uniqueCount * 0.01; // +0.01 per figurina
            }
        }

        return groupedPlayers;
    },

    /**
     * Simula una singola partita (50 occasioni per squadra).
     */
    runSimulation(homeTeamData, awayTeamData) {
        const { simulateOneOccasion } = window.simulationLogic || {};

        if (!simulateOneOccasion) {
            console.error("ERRORE CRITICO: Modulo simulazione.js non caricato correttamente.");
            return { homeGoals: 0, awayGoals: 0 };
        }

        // Check forfait: se una squadra ha < 5 titolari reali, perde 3-0
        const homeTitolari = homeTeamData.formation?.titolari?.length || 0;
        const awayTitolari = awayTeamData.formation?.titolari?.length || 0;

        if (homeTitolari < 5 && awayTitolari < 5) {
            console.warn(`[Simulation] Forfait doppio: ${homeTeamData.teamName} (${homeTitolari}) vs ${awayTeamData.teamName} (${awayTitolari})`);
            return { homeGoals: 0, awayGoals: 0, forfeit: 'both' };
        }
        if (homeTitolari < 5) {
            console.warn(`[Simulation] Forfait: ${homeTeamData.teamName} ha solo ${homeTitolari} titolari - perde 0-3`);
            return { homeGoals: 0, awayGoals: 3, forfeit: 'home' };
        }
        if (awayTitolari < 5) {
            console.warn(`[Simulation] Forfait: ${awayTeamData.teamName} ha solo ${awayTitolari} titolari - perde 3-0`);
            return { homeGoals: 3, awayGoals: 0, forfeit: 'away' };
        }

        const teamA = this.prepareTeamForSimulation(homeTeamData);
        const teamB = this.prepareTeamForSimulation(awayTeamData);

        // Applica bonus casa dalla struttura stadio (se feature abilitata)
        if (window.Stadium?.isEnabled() && homeTeamData.stadium?.totalBonus) {
            teamA.homeBonus = homeTeamData.stadium.totalBonus;
        }

        let homeGoals = 0;
        let awayGoals = 0;
        const occasionsPerTeam = 25; // v5.0: 25 occasioni per squadra = 50 totali

        // Genera 50 occasioni con minuti casuali (1-90), alternando le squadre
        const allOccasions = [];
        for (let i = 0; i < occasionsPerTeam; i++) {
            allOccasions.push({ team: 'home', occasionIndex: i + 1 });
            allOccasions.push({ team: 'away', occasionIndex: i + 1 });
        }

        // Assegna minuti casuali (1-90) e ordina cronologicamente
        allOccasions.forEach((occ, idx) => {
            occ.minute = Math.floor(Math.random() * 90) + 1;
        });
        allOccasions.sort((a, b) => a.minute - b.minute);

        // Esegui occasioni in ordine cronologico
        for (const occ of allOccasions) {
            if (occ.team === 'home') {
                if (simulateOneOccasion(teamA, teamB, occ.occasionIndex)) {
                    homeGoals++;
                }
            } else {
                if (simulateOneOccasion(teamB, teamA, occ.occasionIndex)) {
                    awayGoals++;
                }
            }
        }

        return { homeGoals, awayGoals };
    },

    /**
     * Simula una singola partita con log dettagliato per debug.
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @returns {Object} - { homeGoals, awayGoals, log, simpleLog, matchEvents }
     *   matchEvents: Array di eventi strutturati per ogni occasione con:
     *   - occasionNumber, attackingTeam, defendingTeam, side, result
     *   - phases: { construction, attack, shot } con dati dettagliati
     *   - abilities: array delle abilità attivate
     */
    runSimulationWithLog(homeTeamData, awayTeamData) {
        const { simulateOneOccasionWithLog, resetSimulationState } = window.simulationLogic || {};

        if (!simulateOneOccasionWithLog) {
            console.error("ERRORE CRITICO: Modulo simulazione.js non caricato correttamente.");
            return { homeGoals: 0, awayGoals: 0, log: ['ERRORE: Modulo simulazione non caricato'] };
        }

        // Check forfait: se una squadra ha < 5 titolari reali, perde 3-0
        const homeTitolari = homeTeamData.formation?.titolari?.length || 0;
        const awayTitolari = awayTeamData.formation?.titolari?.length || 0;

        if (homeTitolari < 5 && awayTitolari < 5) {
            console.warn(`[Simulation] Forfait doppio: ${homeTeamData.teamName} (${homeTitolari}) vs ${awayTeamData.teamName} (${awayTitolari})`);
            return { homeGoals: 0, awayGoals: 0, forfeit: 'both', log: [`FORFAIT DOPPIO: Entrambe le squadre hanno meno di 5 titolari`] };
        }
        if (homeTitolari < 5) {
            console.warn(`[Simulation] Forfait: ${homeTeamData.teamName} ha solo ${homeTitolari} titolari - perde 0-3`);
            return { homeGoals: 0, awayGoals: 3, forfeit: 'home', log: [`FORFAIT: ${homeTeamData.teamName} ha solo ${homeTitolari} titolari - perde 0-3`] };
        }
        if (awayTitolari < 5) {
            console.warn(`[Simulation] Forfait: ${awayTeamData.teamName} ha solo ${awayTitolari} titolari - perde 3-0`);
            return { homeGoals: 3, awayGoals: 0, forfeit: 'away', log: [`FORFAIT: ${awayTeamData.teamName} ha solo ${awayTitolari} titolari - perde 0-3`] };
        }

        // Reset stato simulazione
        if (resetSimulationState) resetSimulationState();

        const teamA = this.prepareTeamForSimulation(homeTeamData);
        const teamB = this.prepareTeamForSimulation(awayTeamData);

        // Inizializza bonus Icona (base 50% + bonus variante figurina)
        const { initIconaBonusForMatch } = window.simulationLogic || {};
        if (initIconaBonusForMatch) {
            const teamAHasIcona = teamA.formationInfo?.isIconaActive || false;
            const teamBHasIcona = teamB.formationInfo?.isIconaActive || false;
            const teamAVariant = homeTeamData.iconaVariant || 'normale';
            const teamBVariant = awayTeamData.iconaVariant || 'normale';
            initIconaBonusForMatch(teamAHasIcona, teamBHasIcona, teamAVariant, teamBVariant);
        }

        // Applica bonus casa dalla struttura stadio (se feature abilitata)
        if (window.Stadium?.isEnabled() && homeTeamData.stadium?.totalBonus) {
            teamA.homeBonus = homeTeamData.stadium.totalBonus;
        }

        let homeGoals = 0;
        let awayGoals = 0;
        const occasionsPerTeam = 25; // v5.0: 25 occasioni per squadra = 50 totali
        const log = [];
        const matchEvents = []; // Array per eventi partita strutturati

        // Log informazioni squadre
        log.push('='.repeat(70));
        log.push(`SIMULAZIONE: ${homeTeamData.teamName} vs ${awayTeamData.teamName}`);
        log.push('='.repeat(70));
        log.push('');

        // Helper per ordinare giocatori per ruolo (P, D, C, A) e poi per livello decrescente
        const sortPlayers = (players) => {
            const roleOrder = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
            return [...players].sort((a, b) => {
                const roleA = roleOrder[a.role] ?? 4;
                const roleB = roleOrder[b.role] ?? 4;
                if (roleA !== roleB) return roleA - roleB;
                // A parita di ruolo, ordina per livello decrescente
                return (b.currentLevel || b.level || 0) - (a.currentLevel || a.level || 0);
            });
        };

        // Log giocatori squadra casa
        log.push(`*** ${homeTeamData.teamName} (CASA) ***`);
        log.push(`Coach Level: ${teamA.coachLevel}`);
        if (teamA.homeBonus) {
            log.push(`Bonus Casa (Stadio): +${teamA.homeBonus.toFixed(2)}`);
        }
        log.push(`Modulo: ${homeTeamData.formation?.modulo || '?'}`);
        const allPlayersA = sortPlayers(teamA.formationInfo?.allPlayers || []);
        allPlayersA.forEach(p => {
            const abilities = p.abilities?.length > 0 ? p.abilities.join(', ') : '-';
            log.push(`  ${p.role} | ${p.name.padEnd(20)} | Lv.${String(p.currentLevel).padStart(2)} (base:${String(p.level || '?').padStart(2)}, forma:${p.formModifier >= 0 ? '+' : ''}${p.formModifier}) | ${(p.type || 'N/A').padEnd(8)} | ${abilities}`);
        });
        log.push('');

        // Log giocatori squadra trasferta
        log.push(`*** ${awayTeamData.teamName} (TRASFERTA) ***`);
        log.push(`Coach Level: ${teamB.coachLevel}`);
        log.push(`Modulo: ${awayTeamData.formation?.modulo || '?'}`);
        const allPlayersB = sortPlayers(teamB.formationInfo?.allPlayers || []);
        allPlayersB.forEach(p => {
            const abilities = p.abilities?.length > 0 ? p.abilities.join(', ') : '-';
            log.push(`  ${p.role} | ${p.name.padEnd(20)} | Lv.${String(p.currentLevel).padStart(2)} (base:${String(p.level || '?').padStart(2)}, forma:${p.formModifier >= 0 ? '+' : ''}${p.formModifier}) | ${(p.type || 'N/A').padEnd(8)} | ${abilities}`);
        });
        log.push('');

        // ==================== GENERA OCCASIONI CRONOLOGICHE ====================
        // Genera 50 occasioni (25 per squadra) con minuti casuali (1-90)
        const allOccasions = [];
        for (let i = 0; i < occasionsPerTeam; i++) {
            allOccasions.push({ team: 'home', occasionIndex: i + 1 });
            allOccasions.push({ team: 'away', occasionIndex: i + 1 });
        }
        allOccasions.forEach(occ => {
            occ.minute = Math.floor(Math.random() * 90) + 1;
        });
        allOccasions.sort((a, b) => a.minute - b.minute);

        log.push('#'.repeat(70));
        log.push(`# PARTITA (50 occasioni in ordine cronologico)`);
        log.push('#'.repeat(70));

        // Esegui occasioni in ordine cronologico
        for (const occ of allOccasions) {
            const attackingTeam = occ.team === 'home' ? teamA : teamB;
            const defendingTeam = occ.team === 'home' ? teamB : teamA;
            const attackingName = occ.team === 'home' ? homeTeamData.teamName : awayTeamData.teamName;
            const defendingName = occ.team === 'home' ? awayTeamData.teamName : homeTeamData.teamName;

            const result = simulateOneOccasionWithLog(attackingTeam, defendingTeam, occ.occasionIndex);

            if (result.goal) {
                if (occ.team === 'home') homeGoals++;
                else awayGoals++;
            }

            // Aggiungi il log dettagliato con minuto
            log.push(`\n[${occ.minute}'] ${attackingName} attacca`);
            log.push(...result.log);
            log.push(`  >> Parziale: ${homeTeamData.teamName} ${homeGoals} - ${awayGoals} ${awayTeamData.teamName}`);

            // Aggiungi evento strutturato
            if (result.eventData) {
                matchEvents.push({
                    ...result.eventData,
                    minute: occ.minute,
                    attackingTeam: attackingName,
                    defendingTeam: defendingName,
                    side: occ.team
                });
            }
        }

        // ==================== RISULTATO FINALE ====================
        log.push('');
        log.push('='.repeat(70));
        log.push(`RISULTATO FINALE: ${homeTeamData.teamName} ${homeGoals} - ${awayGoals} ${awayTeamData.teamName}`);
        if (homeGoals > awayGoals) {
            log.push(`VINCITORE: ${homeTeamData.teamName}`);
        } else if (awayGoals > homeGoals) {
            log.push(`VINCITORE: ${awayTeamData.teamName}`);
        } else {
            log.push(`PAREGGIO!`);
        }
        log.push('='.repeat(70));

        // Genera anche un log ristretto (solo risultati per occasione)
        const simpleLog = this.generateSimpleLog(homeTeamData, awayTeamData, teamA, teamB, homeGoals, awayGoals);

        return { homeGoals, awayGoals, log, simpleLog, matchEvents };
    },

    /**
     * Genera un log ristretto della simulazione
     */
    generateSimpleLog(homeTeamData, awayTeamData, teamA, teamB, homeGoals, awayGoals) {
        const { simulateOneOccasion, resetSimulationState } = window.simulationLogic || {};
        const log = [];

        log.push('='.repeat(60));
        log.push(`SIMULAZIONE: ${homeTeamData.teamName} vs ${awayTeamData.teamName}`);
        log.push('='.repeat(60));
        log.push('');

        // Helper per ordinare giocatori
        const sortPlayers = (players) => {
            const roleOrder = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
            return [...players].sort((a, b) => {
                const roleA = roleOrder[a.role] ?? 4;
                const roleB = roleOrder[b.role] ?? 4;
                if (roleA !== roleB) return roleA - roleB;
                return (b.currentLevel || b.level || 0) - (a.currentLevel || a.level || 0);
            });
        };

        // Info squadre compatte
        log.push(`${homeTeamData.teamName} (CASA)`);
        const homeBonusStr = teamA.homeBonus ? ` | Bonus Casa: +${teamA.homeBonus.toFixed(2)}` : '';
        log.push(`  Coach Lv.${teamA.coachLevel} | Modulo: ${homeTeamData.formation?.modulo || '?'}${homeBonusStr}`);
        const playersA = sortPlayers(teamA.formationInfo?.allPlayers || []);
        log.push(`  Titolari: ${playersA.map(p => `${p.role}:${p.name}(${p.currentLevel})`).join(', ')}`);
        log.push('');

        log.push(`${awayTeamData.teamName} (TRASFERTA)`);
        log.push(`  Coach Lv.${teamB.coachLevel} | Modulo: ${awayTeamData.formation?.modulo || '?'}`);
        const playersB = sortPlayers(teamB.formationInfo?.allPlayers || []);
        log.push(`  Titolari: ${playersB.map(p => `${p.role}:${p.name}(${p.currentLevel})`).join(', ')}`);
        log.push('');

        log.push('-'.repeat(60));
        log.push(`ATTACCO ${homeTeamData.teamName}`);
        log.push('-'.repeat(60));

        // Simula le occasioni per il log ristretto (usa i risultati gia calcolati)
        // Qui ri-simuliamo per avere i dettagli semplificati
        if (resetSimulationState) resetSimulationState();

        let homeG = 0;
        for (let i = 0; i < 50; i++) {
            const goal = simulateOneOccasion(teamA, teamB, i + 1);
            if (goal) {
                homeG++;
                log.push(`  [${String(i+1).padStart(2)}] GOL!     | Totale: ${homeG}`);
            } else {
                log.push(`  [${String(i+1).padStart(2)}] Fallito  | Totale: ${homeG}`);
            }
        }

        log.push('');
        log.push('-'.repeat(60));
        log.push(`ATTACCO ${awayTeamData.teamName}`);
        log.push('-'.repeat(60));

        let awayG = 0;
        for (let i = 0; i < 50; i++) {
            const goal = simulateOneOccasion(teamB, teamA, i + 1);
            if (goal) {
                awayG++;
                log.push(`  [${String(i+1).padStart(2)}] GOL!     | Totale: ${awayG}`);
            } else {
                log.push(`  [${String(i+1).padStart(2)}] Fallito  | Totale: ${awayG}`);
            }
        }

        log.push('');
        log.push('='.repeat(60));
        log.push(`RISULTATO: ${homeTeamData.teamName} ${homeGoals} - ${awayGoals} ${awayTeamData.teamName}`);
        log.push('='.repeat(60));

        return log;
    },

    /**
     * Genera gli highlights ("Azioni Salienti") dai matchEvents.
     * @param {Array} matchEvents - Array di eventi dalle occasioni
     * @param {string} homeTeamName - Nome squadra casa
     * @param {string} awayTeamName - Nome squadra trasferta
     * @param {number} homeGoals - Gol squadra casa
     * @param {number} awayGoals - Gol squadra trasferta
     * @returns {Object} - { highlights, scorers, assists }
     */
    generateHighlights(matchEvents, homeTeamName, awayTeamName, homeGoals, awayGoals) {
        const SimHighlights = window.SimulationHighlights;
        if (!SimHighlights) {
            console.warn('SimulationHighlights non disponibile');
            return { highlights: [], highlightsText: '', scorers: [], assists: [] };
        }

        const allHighlights = [];
        const scorers = [];
        const assists = [];

        // Header partita
        allHighlights.push(`${'='.repeat(50)}`);
        allHighlights.push(`⚽ AZIONI SALIENTI`);
        allHighlights.push(`${homeTeamName} vs ${awayTeamName}`);
        allHighlights.push(`${'='.repeat(50)}`);

        // Genera highlights per ogni occasione che ha portato a un gol
        const goalEvents = matchEvents.filter(e => e.result === 'goal');

        if (goalEvents.length === 0) {
            allHighlights.push(`\n🚫 Nessun gol segnato in questa partita.`);
        } else {
            goalEvents.forEach((event, index) => {
                const attackingTeamName = event.attackingTeam;
                const defendingTeamName = event.defendingTeam;

                // Determina se l'attaccante e' la squadra di casa (per colori)
                const attackerIsHome = (attackingTeamName === homeTeamName);

                const result = SimHighlights.generateHighlights(event, attackingTeamName, defendingTeamName, attackerIsHome);
                allHighlights.push(...result.highlights);

                if (result.scorer) {
                    scorers.push({
                        name: result.scorer,
                        team: attackingTeamName,
                        occasion: event.occasionNumber
                    });
                }
                if (result.assister) {
                    assists.push({
                        name: result.assister,
                        team: attackingTeamName,
                        occasion: event.occasionNumber
                    });
                }
            });
        }

        // Riepilogo finale
        allHighlights.push(`\n${'='.repeat(50)}`);
        allHighlights.push(`📋 RISULTATO FINALE`);
        allHighlights.push(`${homeTeamName} ${homeGoals} - ${awayGoals} ${awayTeamName}`);
        allHighlights.push(`${'='.repeat(50)}`);

        // Statistiche marcatori
        if (scorers.length > 0) {
            const homeScorers = scorers.filter(s => s.team === homeTeamName);
            const awayScorers = scorers.filter(s => s.team === awayTeamName);

            if (homeScorers.length > 0) {
                allHighlights.push(`\n⚽ Gol ${homeTeamName}:`);
                homeScorers.forEach(s => {
                    const assist = assists.find(a => a.team === homeTeamName && a.occasion === s.occasion);
                    const assistText = assist ? ` (assist: ${assist.name})` : '';
                    allHighlights.push(`   - ${s.name}${assistText}`);
                });
            }

            if (awayScorers.length > 0) {
                allHighlights.push(`\n⚽ Gol ${awayTeamName}:`);
                awayScorers.forEach(s => {
                    const assist = assists.find(a => a.team === awayTeamName && a.occasion === s.occasion);
                    const assistText = assist ? ` (assist: ${assist.name})` : '';
                    allHighlights.push(`   - ${s.name}${assistText}`);
                });
            }
        }

        return {
            highlights: allHighlights,
            highlightsText: allHighlights.join('\n'),
            scorers,
            assists
        };
    },

    /**
     * Esegue simulazione con highlights (senza log debug).
     * Usata per campionato, coppa, supercoppa.
     */
    runSimulationWithHighlights(homeTeamData, awayTeamData) {
        const { simulateOneOccasionWithLog, resetSimulationState, initIconaBonusForMatch, initAbilitiesForMatch } = window.simulationLogic || {};

        if (!simulateOneOccasionWithLog) {
            console.error("ERRORE CRITICO: Modulo simulazione.js non caricato correttamente.");
            return { homeGoals: 0, awayGoals: 0, highlights: [] };
        }

        // Check forfait
        const homeTitolari = homeTeamData.formation?.titolari?.length || 0;
        const awayTitolari = awayTeamData.formation?.titolari?.length || 0;

        if (homeTitolari < 5 && awayTitolari < 5) {
            return {
                homeGoals: 0, awayGoals: 0, forfeit: 'both',
                highlights: ['FORFAIT DOPPIO: Entrambe le squadre hanno meno di 5 titolari'],
                highlightsText: 'FORFAIT DOPPIO'
            };
        }
        if (homeTitolari < 5) {
            return {
                homeGoals: 0, awayGoals: 3, forfeit: 'home',
                highlights: [`FORFAIT: ${homeTeamData.teamName} ha solo ${homeTitolari} titolari - perde 0-3`],
                highlightsText: `FORFAIT: ${homeTeamData.teamName} perde 0-3`
            };
        }
        if (awayTitolari < 5) {
            return {
                homeGoals: 3, awayGoals: 0, forfeit: 'away',
                highlights: [`FORFAIT: ${awayTeamData.teamName} ha solo ${awayTitolari} titolari - perde 3-0`],
                highlightsText: `FORFAIT: ${awayTeamData.teamName} perde 3-0`
            };
        }

        // Reset stato simulazione
        if (resetSimulationState) resetSimulationState();

        const teamA = this.prepareTeamForSimulation(homeTeamData);
        const teamB = this.prepareTeamForSimulation(awayTeamData);

        // Inizializza bonus Icona (base 50% + bonus variante figurina)
        if (initIconaBonusForMatch) {
            const teamAHasIcona = teamA.formationInfo?.isIconaActive || false;
            const teamBHasIcona = teamB.formationInfo?.isIconaActive || false;
            const teamAVariant = homeTeamData.iconaVariant || 'normale';
            const teamBVariant = awayTeamData.iconaVariant || 'normale';
            initIconaBonusForMatch(teamAHasIcona, teamBHasIcona, teamAVariant, teamBVariant);
        }
        if (initAbilitiesForMatch) {
            initAbilitiesForMatch(teamA, teamB);
        }

        // Applica bonus casa
        if (window.Stadium?.isEnabled() && homeTeamData.stadium?.totalBonus) {
            teamA.homeBonus = homeTeamData.stadium.totalBonus;
        }

        let homeGoals = 0;
        let awayGoals = 0;
        const occasionsPerTeam = 25; // v5.0: 25 occasioni per squadra = 50 totali
        const matchEvents = [];

        // Genera 50 occasioni (25 per squadra) con minuti casuali (1-90)
        const allOccasions = [];
        for (let i = 0; i < occasionsPerTeam; i++) {
            allOccasions.push({ team: 'home', occasionIndex: i + 1 });
            allOccasions.push({ team: 'away', occasionIndex: i + 1 });
        }
        allOccasions.forEach(occ => {
            occ.minute = Math.floor(Math.random() * 90) + 1;
        });
        allOccasions.sort((a, b) => a.minute - b.minute);

        // Esegui occasioni in ordine cronologico
        for (const occ of allOccasions) {
            const attackingTeam = occ.team === 'home' ? teamA : teamB;
            const defendingTeam = occ.team === 'home' ? teamB : teamA;
            const attackingName = occ.team === 'home' ? homeTeamData.teamName : awayTeamData.teamName;
            const defendingName = occ.team === 'home' ? awayTeamData.teamName : homeTeamData.teamName;

            const result = simulateOneOccasionWithLog(attackingTeam, defendingTeam, occ.occasionIndex);

            if (result.goal) {
                if (occ.team === 'home') homeGoals++;
                else awayGoals++;
            }

            if (result.eventData) {
                matchEvents.push({
                    ...result.eventData,
                    minute: occ.minute,
                    attackingTeam: attackingName,
                    defendingTeam: defendingName,
                    side: occ.team
                });
            }
        }

        // Genera highlights
        const highlightsResult = this.generateHighlights(
            matchEvents,
            homeTeamData.teamName,
            awayTeamData.teamName,
            homeGoals,
            awayGoals
        );

        return {
            homeGoals,
            awayGoals,
            highlights: highlightsResult.highlights,
            highlightsText: highlightsResult.highlightsText,
            scorers: highlightsResult.scorers,
            assists: highlightsResult.assists,
            matchEvents
        };
    },

    /**
     * Aggiorna le statistiche di classifica dopo una partita.
     */
    updateStandingsStats(homeStats, awayStats, homeGoals, awayGoals) {
        homeStats.played++; 
        awayStats.played++;
        homeStats.goalsFor += homeGoals; 
        homeStats.goalsAgainst += awayGoals;
        awayStats.goalsFor += awayGoals; 
        awayStats.goalsAgainst += homeGoals;

        if (homeGoals > awayGoals) {
            homeStats.points += 3; 
            homeStats.wins++; 
            awayStats.losses++;
        } else if (homeGoals < awayGoals) {
            awayStats.points += 3; 
            awayStats.wins++; 
            homeStats.losses++;
        } else {
            homeStats.points += 1; 
            awayStats.points += 1; 
            homeStats.draws++; 
            awayStats.draws++;
        }

        return { homeStats, awayStats };
    },

    /**
     * Esegue simulazione con highlights E debug log (solo per test simulazione).
     * Include tutti i dettagli per debug: log dettagliato, highlights, eventi.
     */
    runSimulationWithHighlightsAndDebug(homeTeamData, awayTeamData) {
        const { simulateOneOccasionWithLog, resetSimulationState, initIconaBonusForMatch, initAbilitiesForMatch } = window.simulationLogic || {};
        const SimHighlights = window.SimulationHighlights;

        if (!simulateOneOccasionWithLog) {
            console.error("ERRORE CRITICO: Modulo simulazione.js non caricato correttamente.");
            return { homeGoals: 0, awayGoals: 0, highlights: [], debugLog: [] };
        }

        // Check forfait
        const homeTitolari = homeTeamData.formation?.titolari?.length || 0;
        const awayTitolari = awayTeamData.formation?.titolari?.length || 0;

        if (homeTitolari < 5 && awayTitolari < 5) {
            return {
                homeGoals: 0, awayGoals: 0, forfeit: 'both',
                highlights: ['FORFAIT DOPPIO'],
                highlightsText: 'FORFAIT DOPPIO',
                debugLog: ['FORFAIT DOPPIO: Entrambe le squadre hanno meno di 5 titolari']
            };
        }
        if (homeTitolari < 5) {
            return {
                homeGoals: 0, awayGoals: 3, forfeit: 'home',
                highlights: [`FORFAIT: ${homeTeamData.teamName}`],
                highlightsText: `FORFAIT: ${homeTeamData.teamName} perde 0-3`,
                debugLog: [`FORFAIT: ${homeTeamData.teamName} ha solo ${homeTitolari} titolari`]
            };
        }
        if (awayTitolari < 5) {
            return {
                homeGoals: 3, awayGoals: 0, forfeit: 'away',
                highlights: [`FORFAIT: ${awayTeamData.teamName}`],
                highlightsText: `FORFAIT: ${awayTeamData.teamName} perde 3-0`,
                debugLog: [`FORFAIT: ${awayTeamData.teamName} ha solo ${awayTitolari} titolari`]
            };
        }

        // Reset stato simulazione
        if (resetSimulationState) resetSimulationState();

        const teamA = this.prepareTeamForSimulation(homeTeamData);
        const teamB = this.prepareTeamForSimulation(awayTeamData);

        // Inizializza bonus Icona (base 50% + bonus variante figurina)
        if (initIconaBonusForMatch) {
            const teamAHasIcona = teamA.formationInfo?.isIconaActive || false;
            const teamBHasIcona = teamB.formationInfo?.isIconaActive || false;
            const teamAVariant = homeTeamData.iconaVariant || 'normale';
            const teamBVariant = awayTeamData.iconaVariant || 'normale';
            initIconaBonusForMatch(teamAHasIcona, teamBHasIcona, teamAVariant, teamBVariant);
        }
        if (initAbilitiesForMatch) {
            initAbilitiesForMatch(teamA, teamB);
        }

        // Applica bonus casa
        if (window.Stadium?.isEnabled() && homeTeamData.stadium?.totalBonus) {
            teamA.homeBonus = homeTeamData.stadium.totalBonus;
        }

        let homeGoals = 0;
        let awayGoals = 0;
        const occasionsPerTeam = 25; // v5.0: 25 occasioni per squadra = 50 totali
        const matchEvents = [];
        const allDebugLogs = [];

        // Header debug
        allDebugLogs.push('='.repeat(70));
        allDebugLogs.push(`DEBUG SIMULAZIONE: ${homeTeamData.teamName} vs ${awayTeamData.teamName}`);
        allDebugLogs.push('='.repeat(70));

        // Genera 50 occasioni (25 per squadra) con minuti casuali (1-90)
        const allOccasions = [];
        for (let i = 0; i < occasionsPerTeam; i++) {
            allOccasions.push({ team: 'home', occasionIndex: i + 1 });
            allOccasions.push({ team: 'away', occasionIndex: i + 1 });
        }
        allOccasions.forEach(occ => {
            occ.minute = Math.floor(Math.random() * 90) + 1;
        });
        allOccasions.sort((a, b) => a.minute - b.minute);

        allDebugLogs.push(`\n${'#'.repeat(50)}`);
        allDebugLogs.push(`# PARTITA (50 occasioni in ordine cronologico)`);
        allDebugLogs.push(`${'#'.repeat(50)}`);

        // Esegui occasioni in ordine cronologico
        for (const occ of allOccasions) {
            const attackingTeam = occ.team === 'home' ? teamA : teamB;
            const defendingTeam = occ.team === 'home' ? teamB : teamA;
            const attackingName = occ.team === 'home' ? homeTeamData.teamName : awayTeamData.teamName;
            const defendingName = occ.team === 'home' ? awayTeamData.teamName : homeTeamData.teamName;

            const result = simulateOneOccasionWithLog(attackingTeam, defendingTeam, occ.occasionIndex);

            if (result.goal) {
                if (occ.team === 'home') homeGoals++;
                else awayGoals++;
            }

            if (result.eventData) {
                matchEvents.push({
                    ...result.eventData,
                    minute: occ.minute,
                    attackingTeam: attackingName,
                    defendingTeam: defendingName,
                    side: occ.team
                });
                // Genera debug log per questa occasione
                if (SimHighlights?.generateDebugLog) {
                    allDebugLogs.push(`\n[${occ.minute}'] ${attackingName} attacca`);
                    const debugLines = SimHighlights.generateDebugLog(result.eventData, attackingTeam, defendingTeam);
                    allDebugLogs.push(...debugLines);
                }
            }
        }

        // Footer debug
        allDebugLogs.push(`\n${'='.repeat(70)}`);
        allDebugLogs.push(`RISULTATO FINALE: ${homeTeamData.teamName} ${homeGoals} - ${awayGoals} ${awayTeamData.teamName}`);
        allDebugLogs.push('='.repeat(70));

        // Genera highlights
        const highlightsResult = this.generateHighlights(
            matchEvents,
            homeTeamData.teamName,
            awayTeamData.teamName,
            homeGoals,
            awayGoals
        );

        return {
            homeGoals,
            awayGoals,
            highlights: highlightsResult.highlights,
            highlightsText: highlightsResult.highlightsText,
            scorers: highlightsResult.scorers,
            assists: highlightsResult.assists,
            matchEvents,
            debugLog: allDebugLogs,
            debugText: allDebugLogs.join('\n')
        };
    },

    // ====================================================================
    // SISTEMA INFORTUNI A FINE PARTITA
    // ====================================================================

    /**
     * Processa gli infortuni a fine partita.
     * - 1% di probabilita per ogni giocatore (titolari + panchina)
     * - Max 1 infortunio per squadra per partita
     * - Durata: 1-10 partite
     * - Solo se il feature flag 'injuries' e' attivo
     *
     * @param {string} teamId - ID della squadra
     * @param {Object} teamData - Dati squadra con formation.titolari e formation.panchina
     * @returns {Object|null} - { playerId, playerName, duration } o null se nessun infortunio
     */
    async processPostMatchInjuries(teamId, teamData) {
        // Verifica feature flag
        if (!window.FeatureFlags?.isEnabled('injuries')) {
            return null;
        }

        const allPlayers = [
            ...(teamData.formation?.titolari || []),
            ...(teamData.formation?.panchina || [])
        ];

        if (allPlayers.length === 0) return null;

        // Verifica limite infortuni (max 1/4 della rosa)
        const currentInjuries = (teamData.players || []).filter(p => p.injuredUntil > 0).length;
        const maxInjuries = Math.floor((teamData.players || []).length / 4);
        if (currentInjuries >= maxInjuries) {
            console.log(`[Injuries] ${teamData.teamName}: limite infortuni raggiunto (${currentInjuries}/${maxInjuries})`);
            return null;
        }

        // 1% di probabilita per ogni giocatore, max 1 per partita
        let injuredPlayer = null;
        for (const player of allPlayers) {
            if (!player || !player.id) continue;

            // Skip se gia infortunato
            if (player.injuredUntil > 0) continue;

            // 1% di probabilita
            if (Math.random() * 100 < 1) {
                const duration = Math.floor(Math.random() * 10) + 1; // 1-10 partite
                injuredPlayer = {
                    playerId: player.id,
                    playerName: player.name || 'Giocatore',
                    duration: duration
                };
                break; // Max 1 infortunio per partita
            }
        }

        if (!injuredPlayer) return null;

        // Salva infortunio su Firestore
        try {
            const { doc, updateDoc } = window.firestoreTools;
            const db = window.db;
            const appId = window.firestoreTools.appId;

            const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);

            // Aggiorna il giocatore nell'array players
            const updatedPlayers = (teamData.players || []).map(p => {
                if (p.id === injuredPlayer.playerId) {
                    return { ...p, injuredUntil: injuredPlayer.duration };
                }
                return p;
            });

            await updateDoc(teamDocRef, { players: updatedPlayers });

            console.log(`[Injuries] ${teamData.teamName}: ${injuredPlayer.playerName} infortunato per ${injuredPlayer.duration} partite`);
        } catch (error) {
            console.error('[Injuries] Errore salvataggio infortunio:', error);
        }

        return injuredPlayer;
    },

    /**
     * Processa infortuni per entrambe le squadre dopo una partita.
     * @param {string} homeTeamId - ID squadra casa
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {string} awayTeamId - ID squadra trasferta
     * @param {Object} awayTeamData - Dati squadra trasferta
     * @returns {Object} - { homeInjury, awayInjury }
     */
    async processMatchInjuries(homeTeamId, homeTeamData, awayTeamId, awayTeamData) {
        const homeInjury = await this.processPostMatchInjuries(homeTeamId, homeTeamData);
        const awayInjury = await this.processPostMatchInjuries(awayTeamId, awayTeamData);

        return { homeInjury, awayInjury };
    }
};