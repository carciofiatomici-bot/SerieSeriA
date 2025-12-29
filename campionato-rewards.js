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

        // Moltiplicatore doppi premi (evento speciale)
        const rewardMultiplier = window.FeatureFlags?.isEnabled('doubleRewardsEvent') ? 2 : 1;

        // Calcola i crediti guadagnati
        let homeCreditsEarned = homeGoals * this.GOAL_CS; // 5 CS per gol
        let awayCreditsEarned = awayGoals * this.GOAL_CS; // 5 CS per gol

        // Bonus vittoria (usa getter dinamico)
        if (homeGoals > awayGoals) {
            homeCreditsEarned += this.WIN_CS;
        } else if (homeGoals < awayGoals) {
            awayCreditsEarned += this.WIN_CS;
        }

        // Applica moltiplicatore evento doppi premi
        if (rewardMultiplier > 1) {
            homeCreditsEarned *= rewardMultiplier;
            awayCreditsEarned *= rewardMultiplier;
            console.log('[Rewards] Evento Doppi Premi attivo! Premi x2');
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

        // Moltiplicatore doppi premi (evento speciale)
        const rewardMultiplier = window.FeatureFlags?.isEnabled('doubleRewardsEvent') ? 2 : 1;
        if (rewardMultiplier > 1) {
            console.log('[Rewards] Evento Doppi Premi attivo per premi fine stagione! x2');
        }

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

            // Applica moltiplicatore
            rewardsMap.set(team.teamId, reward * rewardMultiplier);
        });

        return rewardsMap;
    },

    /**
     * Applica i premi di fine stagione e la progressione allenatori.
     * @param {Array} standings - Classifica finale
     * @returns {Promise<{totalTeams: number, levelUps: number, championId: string}>}
     */
    async applySeasonEndRewards(standings) {
        const { doc, updateDoc, getDoc, collection, getDocs } = window.firestoreTools;
        const db = window.db;
        const TEAMS_COLLECTION_PATH = `artifacts/${window.firestoreTools.appId}/public/data/teams`;
        const getRandomInt = window.getRandomInt;

        // Calcola i premi
        const rewardsMap = this.calculateSeasonEndRewards(standings);

        // Assegna trofeo campionato al primo classificato
        let championId = null;
        let championName = null;
        if (standings.length > 0) {
            championId = standings[0].teamId;
            championName = standings[0].teamName;
            const championRef = doc(db, TEAMS_COLLECTION_PATH, championId);
            const championDoc = await getDoc(championRef);
            if (championDoc.exists()) {
                const currentTrophies = championDoc.data().campionatiVinti || 0;
                await updateDoc(championRef, {
                    campionatiVinti: currentTrophies + 1
                });
                console.log(`[Rewards] Trofeo Campionato assegnato a ${championName} (totale: ${currentTrophies + 1})`);
            }
        }

        // Identifica le ultime 3 squadre (escluse dal premio CSS)
        const numTeams = standings.length;
        const bottom3TeamIds = new Set(
            standings.slice(Math.max(0, numTeams - 3)).map(t => t.teamId)
        );
        // Set di tutti i partecipanti al campionato (per verificare chi ha partecipato)
        const participantTeamIds = new Set(standings.map(t => t.teamId));

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

            // Premio CSS: 1 CSS a tutti i partecipanti al campionato TRANNE le ultime 3 squadre
            const hasParticipated = participantTeamIds.has(teamId);
            const isBottom3 = bottom3TeamIds.has(teamId);

            if (hasParticipated && !isBottom3) {
                const cssEnabled = window.CreditiSuperSeri ? await window.CreditiSuperSeri.isEnabled() : false;
                if (cssEnabled) {
                    updateData.creditiSuperSeri = currentCSS + 1;
                    console.log(`Premio campionato: 1 CSS assegnato a ${teamData.teamName || teamId}`);
                } else {
                    console.log(`Sistema CSS disabilitato - premio CSS non assegnato a ${teamData.teamName || teamId}`);
                }
            } else if (isBottom3) {
                console.log(`${teamData.teamName || teamId} nelle ultime 3 posizioni - nessun CSS`);
            }

            // Aggiorna la squadra su Firestore
            await updateDoc(doc(db, TEAMS_COLLECTION_PATH, teamId), updateData);
        }

        return {
            totalTeams: teamsSnapshot.size,
            cssAwarded: numTeams - bottom3TeamIds.size,
            championId: championId,
            championName: championName
        };
    }
};