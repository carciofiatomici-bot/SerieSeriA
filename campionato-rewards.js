//
// ====================================================================
// MODULO CAMPIONATO-REWARDS.JS (Sistema Premi e Crediti)
// ====================================================================
//

window.ChampionshipRewards = {

    // Costante per il livello massimo dell'allenatore
    COACH_MAX_LEVEL: 10,

    // Getter per reward dinamici da RewardsConfig
    get GOAL_CS() {
        return window.RewardsConfig?.rewardGoalCS || 5;
    },
    get WIN_CS() {
        return window.RewardsConfig?.rewardVittoriaCS || 25;
    },
    get REWARD_TOP3() {
        return window.RewardsConfig?.rewardTop3CS || 150;
    },
    get REWARD_ULTIMI3() {
        return window.RewardsConfig?.rewardUltimi3CS || 200;
    },
    get REWARD_ALTRI() {
        return window.RewardsConfig?.rewardAltriCS || 100;
    },

    /**
     * Calcola e assegna i crediti durante una partita.
     * @param {number} homeGoals - Gol squadra casa
     * @param {number} awayGoals - Gol squadra ospite
     * @param {Object} homeTeamData - Dati squadra casa
     * @param {Object} awayTeamData - Dati squadra ospite
     * @param {string} homeTeamId - ID squadra casa
     * @param {string} awayTeamId - ID squadra ospite
     * @returns {Promise<{homeCredits: number, awayCredits: number}>}
     */
    async applyMatchRewards(homeGoals, awayGoals, homeTeamData, awayTeamData, homeTeamId, awayTeamId) {
        const { doc, updateDoc } = window.firestoreTools;
        const db = window.db;
        const TEAMS_COLLECTION_PATH = `artifacts/${window.firestoreTools.appId}/public/data/teams`;

        // Calcola i crediti guadagnati
        let homeCreditsEarned = homeGoals * this.GOAL_CS; // 5 CS per gol
        let awayCreditsEarned = awayGoals * this.GOAL_CS; // 5 CS per gol

        // Bonus vittoria: 25 CS
        if (homeGoals > awayGoals) {
            homeCreditsEarned += 25;
        } else if (homeGoals < awayGoals) {
            awayCreditsEarned += 25;
        }

        // Aggiorna il budget in Firestore
        const homeTeamDocRef = doc(db, TEAMS_COLLECTION_PATH, homeTeamId);
        const awayTeamDocRef = doc(db, TEAMS_COLLECTION_PATH, awayTeamId);
        
        const currentHomeBudget = homeTeamData.budget || 0;
        const currentAwayBudget = awayTeamData.budget || 0;
        
        await updateDoc(homeTeamDocRef, {
            budget: currentHomeBudget + homeCreditsEarned
        });
        
        await updateDoc(awayTeamDocRef, {
            budget: currentAwayBudget + awayCreditsEarned
        });

        return {
            homeCredits: homeCreditsEarned,
            awayCredits: awayCreditsEarned
        };
    },

    /**
     * Calcola i premi di fine campionato per posizione in classifica.
     * @param {Array} standings - Classifica finale ordinata
     * @returns {Map<string, number>} Mappa teamId -> reward
     */
    calculateSeasonEndRewards(standings) {
        const rewardsMap = new Map();
        const numTeams = standings.length;

        standings.forEach((team, index) => {
            let reward;

            // Prime 3 squadre
            if (index < 3) {
                reward = this.REWARD_TOP3;
            }
            // Ultime 3 squadre
            else if (index >= numTeams - 3) {
                reward = this.REWARD_ULTIMI3;
            }
            // Tutte le altre squadre partecipanti
            else {
                reward = this.REWARD_ALTRI;
            }

            rewardsMap.set(team.teamId, reward);
        });

        return rewardsMap;
    },

    /**
     * Applica i premi di fine stagione e la progressione allenatori.
     * @param {Array} standings - Classifica finale
     * @returns {Promise<{totalTeams: number, levelUps: number}>}
     */
    async applySeasonEndRewards(standings) {
        const { doc, updateDoc, getDoc, collection, getDocs } = window.firestoreTools;
        const db = window.db;
        const TEAMS_COLLECTION_PATH = `artifacts/${window.firestoreTools.appId}/public/data/teams`;
        const getRandomInt = window.getRandomInt;

        // Calcola i premi
        const rewardsMap = this.calculateSeasonEndRewards(standings);

        // Identifica il vincitore del campionato (primo in classifica)
        const championTeamId = standings.length > 0 ? standings[0].teamId : null;

        // Applica i premi a tutte le squadre
        const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
        const teamsSnapshot = await getDocs(teamsCollectionRef);

        for (const docSnapshot of teamsSnapshot.docs) {
            const teamData = docSnapshot.data();
            const teamId = docSnapshot.id;
            
            const reward = rewardsMap.get(teamId) || this.REWARD_ALTRI; // Default se non in classifica
            const currentBudget = teamData.budget || 0;
            const currentCSS = teamData.creditiSuperSeri || 0;
            const currentCoach = teamData.coach || { name: 'Sconosciuto', level: 1, exp: 0 };

            // NOTA: Il level-up dell'allenatore ora avviene tramite il sistema EXP (player-exp.js)
            // L'allenatore guadagna EXP solo con le vittorie durante le partite

            // Prepara l'aggiornamento
            const updateData = {
                budget: currentBudget + reward,
                coach: {
                    ...currentCoach,
                },
                // Resetta il cooldown acquisto
                lastAcquisitionTimestamp: 0,
            };

            // Premio speciale: 1 CSS al vincitore del campionato (solo se sistema CSS abilitato)
            if (teamId === championTeamId) {
                const cssEnabled = window.CreditiSuperSeri ? await window.CreditiSuperSeri.isEnabled() : false;
                if (cssEnabled) {
                    updateData.creditiSuperSeri = currentCSS + 1;
                    console.log(`Premio campionato: 1 CSS assegnato al vincitore ${teamData.teamName || teamId}`);
                } else {
                    console.log(`Sistema CSS disabilitato - premio CSS non assegnato a ${teamData.teamName || teamId}`);
                }
            }

            // Aggiorna la squadra su Firestore
            await updateDoc(doc(db, TEAMS_COLLECTION_PATH, teamId), updateData);
        }

        return {
            totalTeams: teamsSnapshot.size,
            championId: championTeamId
        };
    }
};