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
                currentLevel = persistedForm.level;
            } else {
                // In simulazione, se la forma non è stata salvata, usiamo Livello Base (Livello 1) 
                // e mod 0 per prevenire simulazioni errate con forme casuali non salvate.
                // L'utente DEVE aprire il pannello Formazione prima di simulare.
                formModifier = 0;
                currentLevel = p.level || 1;
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

        const groupedPlayers = {
            P: playersWithForm.filter(p => p.role === 'P'),
            D: playersWithForm.filter(p => p.role === 'D'),
            C: playersWithForm.filter(p => p.role === 'C'),
            A: playersWithForm.filter(p => p.role === 'A'),
            Panchina: panchina.map(p => ({...p, abilities: Array.isArray(p.abilities) ? p.abilities : (p.abilities ? [p.abilities] : [])})) 
        };
        
        groupedPlayers.formationInfo = {
            P: groupedPlayers.P,
            D: groupedPlayers.D,
            C: groupedPlayers.C,
            A: groupedPlayers.A,
            allPlayers: playersWithForm,
            isIconaActive: isIconaActive,
            Panchina: groupedPlayers.Panchina 
        };
        
        groupedPlayers.coachLevel = coachLevel;

        return groupedPlayers;
    },

    /**
     * Simula una singola partita (30 occasioni per squadra).
     */
    runSimulation(homeTeamData, awayTeamData) {
        const { simulateOneOccasion } = window.simulationLogic || {};
        // ... [il resto della funzione runSimulation è invariato]
        
        if (!simulateOneOccasion) {
            console.error("ERRORE CRITICO: Modulo simulazione.js non caricato correttamente.");
            return { homeGoals: 0, awayGoals: 0 };
        }
        
        const teamA = this.prepareTeamForSimulation(homeTeamData);
        const teamB = this.prepareTeamForSimulation(awayTeamData);

        let homeGoals = 0;
        let awayGoals = 0;
        const totalOccasions = 30;

        for (let i = 0; i < totalOccasions; i++) {
            if (simulateOneOccasion(teamA, teamB)) {
                homeGoals++;
            }
        }

        for (let i = 0; i < totalOccasions; i++) {
            if (simulateOneOccasion(teamB, teamA)) {
                awayGoals++;
            }
        }

        return { homeGoals, awayGoals };
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