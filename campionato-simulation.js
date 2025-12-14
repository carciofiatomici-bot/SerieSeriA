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
                // In simulazione, se la forma non è stata salvata, usiamo Livello Base (Livello 1)
                // e mod 0 per prevenire simulazioni errate con forme casuali non salvate.
                // L'utente DEVE aprire il pannello Formazione prima di simulare.
                formModifier = 0;
                currentLevel = Math.min(30, Math.max(1, p.level || 1));
                console.warn(`Forma mancante per ${p.name}. Usato Livello Base ${currentLevel} in simulazione.`);
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
        const totalOccasions = 50; // Aggiornato v4.0: da 40 a 50 occasioni

        for (let i = 0; i < totalOccasions; i++) {
            if (simulateOneOccasion(teamA, teamB, i + 1)) {
                homeGoals++;
            }
        }

        for (let i = 0; i < totalOccasions; i++) {
            if (simulateOneOccasion(teamB, teamA, i + 1)) {
                awayGoals++;
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

        // Inizializza bonus Icona (50% per ogni team con Icona)
        const { initIconaBonusForMatch } = window.simulationLogic || {};
        if (initIconaBonusForMatch) {
            const teamAHasIcona = teamA.formationInfo?.isIconaActive || false;
            const teamBHasIcona = teamB.formationInfo?.isIconaActive || false;
            initIconaBonusForMatch(teamAHasIcona, teamBHasIcona);
        }

        // Applica bonus casa dalla struttura stadio (se feature abilitata)
        if (window.Stadium?.isEnabled() && homeTeamData.stadium?.totalBonus) {
            teamA.homeBonus = homeTeamData.stadium.totalBonus;
        }

        let homeGoals = 0;
        let awayGoals = 0;
        const totalOccasions = 50; // Aggiornato v4.0: da 40 a 50 occasioni
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

        // ==================== OCCASIONI SQUADRA CASA ====================
        log.push('');
        log.push('#'.repeat(70));
        log.push(`# ATTACCO ${homeTeamData.teamName} (50 occasioni)`);
        log.push('#'.repeat(70));

        for (let i = 0; i < totalOccasions; i++) {
            const result = simulateOneOccasionWithLog(teamA, teamB, i + 1);
            if (result.goal) {
                homeGoals++;
            }
            // Aggiungi il log dettagliato di questa occasione
            log.push(...result.log);
            log.push(`  >> Parziale ${homeTeamData.teamName}: ${homeGoals} gol su ${i + 1} occasioni`);

            // Aggiungi evento strutturato
            if (result.eventData) {
                matchEvents.push({
                    ...result.eventData,
                    attackingTeam: homeTeamData.teamName,
                    defendingTeam: awayTeamData.teamName,
                    side: 'home'
                });
            }
        }

        // ==================== OCCASIONI SQUADRA TRASFERTA ====================
        log.push('');
        log.push('#'.repeat(70));
        log.push(`# ATTACCO ${awayTeamData.teamName} (50 occasioni)`);
        log.push('#'.repeat(70));

        for (let i = 0; i < totalOccasions; i++) {
            const result = simulateOneOccasionWithLog(teamB, teamA, i + 1);
            if (result.goal) {
                awayGoals++;
            }
            // Aggiungi il log dettagliato di questa occasione
            log.push(...result.log);
            log.push(`  >> Parziale ${awayTeamData.teamName}: ${awayGoals} gol su ${i + 1} occasioni`);

            // Aggiungi evento strutturato
            if (result.eventData) {
                matchEvents.push({
                    ...result.eventData,
                    attackingTeam: awayTeamData.teamName,
                    defendingTeam: homeTeamData.teamName,
                    side: 'away'
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
    }
};