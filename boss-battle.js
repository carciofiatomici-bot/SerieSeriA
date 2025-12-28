/**
 * Boss Battle System - Core Logic
 * Sistema di eventi cooperativi dove i giocatori sfidano un Boss AI
 */

(function() {
    'use strict';

    // ============ CONFIGURAZIONE ============

    const DIFFICULTY_MODIFIERS = {
        easy: { levelBonus: 0, formBonus: 0, statMultiplier: 0.8 },
        normal: { levelBonus: 3, formBonus: 1, statMultiplier: 1.0 },
        hard: { levelBonus: 5, formBonus: 2, statMultiplier: 1.2 },
        nightmare: { levelBonus: 8, formBonus: 3, statMultiplier: 1.5 }
    };

    const DEFAULT_CONFIG = {
        enabled: false,
        rewardsEnabled: false,
        cooldownEnabled: false,
        cooldownHours: 24
    };

    // ============ MODULO PRINCIPALE ============

    window.BossBattle = {
        // Stato
        config: null,
        currentBoss: null,
        myParticipation: null,

        // ============ PATH FIRESTORE ============

        getConfigPath() {
            const appId = window.InterfacciaConstants?.appId || window.firestoreTools?.appId;
            if (!appId) {
                console.error('[BossBattle] appId non disponibile');
                return null;
            }
            return `artifacts/${appId}/public/data/config/bossConfig`;
        },

        getBossesPath() {
            const appId = window.InterfacciaConstants?.appId || window.firestoreTools?.appId;
            if (!appId) {
                console.error('[BossBattle] appId non disponibile');
                return null;
            }
            return `artifacts/${appId}/public/data/bossBattles`;
        },

        getParticipantsPath(bossId) {
            return `${this.getBossesPath()}/${bossId}/participants`;
        },

        // ============ CONFIGURAZIONE ============

        async loadConfig() {
            try {
                const { doc, getDoc } = window.firestoreTools || {};
                if (!doc || !getDoc || !window.db) {
                    console.warn('[BossBattle] Firestore non disponibile');
                    this.config = { ...DEFAULT_CONFIG };
                    return this.config;
                }

                const configRef = doc(window.db, this.getConfigPath());
                const configDoc = await getDoc(configRef);

                if (configDoc.exists()) {
                    this.config = { ...DEFAULT_CONFIG, ...configDoc.data() };
                } else {
                    this.config = { ...DEFAULT_CONFIG };
                }

                return this.config;
            } catch (error) {
                console.error('[BossBattle] Errore caricamento config:', error);
                this.config = { ...DEFAULT_CONFIG };
                return this.config;
            }
        },

        async saveConfig(newConfig) {
            try {
                const { doc, setDoc } = window.firestoreTools || {};
                if (!doc || !setDoc || !window.db) {
                    throw new Error('Firestore non disponibile');
                }

                const configRef = doc(window.db, this.getConfigPath());
                await setDoc(configRef, { ...this.config, ...newConfig }, { merge: true });
                this.config = { ...this.config, ...newConfig };

                console.log('[BossBattle] Config salvata:', this.config);
                return true;
            } catch (error) {
                console.error('[BossBattle] Errore salvataggio config:', error);
                return false;
            }
        },

        isEnabled() {
            return this.config?.enabled || false;
        },

        // ============ CARICAMENTO BOSS ============

        async loadActiveBoss() {
            try {
                const { collection, query, where, getDocs, orderBy, limit } = window.firestoreTools || {};
                if (!collection || !query || !window.db) {
                    return null;
                }

                const bossesRef = collection(window.db, this.getBossesPath());
                const q = query(
                    bossesRef,
                    where('status', '==', 'active'),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                );

                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    this.currentBoss = null;
                    return null;
                }

                const bossDoc = snapshot.docs[0];
                this.currentBoss = { id: bossDoc.id, ...bossDoc.data() };

                console.log('[BossBattle] Boss attivo caricato:', this.currentBoss.name);
                return this.currentBoss;
            } catch (error) {
                console.error('[BossBattle] Errore caricamento boss:', error);
                return null;
            }
        },

        async loadBoss(bossId) {
            try {
                const { doc, getDoc } = window.firestoreTools || {};
                if (!doc || !getDoc || !window.db) {
                    return null;
                }

                const bossRef = doc(window.db, this.getBossesPath(), bossId);
                const bossDoc = await getDoc(bossRef);

                if (!bossDoc.exists()) {
                    return null;
                }

                return { id: bossDoc.id, ...bossDoc.data() };
            } catch (error) {
                console.error('[BossBattle] Errore caricamento boss:', error);
                return null;
            }
        },

        async loadAllBosses() {
            try {
                const { collection, getDocs, orderBy, query } = window.firestoreTools || {};
                if (!collection || !getDocs || !window.db) {
                    return [];
                }

                const bossesRef = collection(window.db, this.getBossesPath());
                const q = query(bossesRef, orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);

                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error('[BossBattle] Errore caricamento boss:', error);
                return [];
            }
        },

        // ============ CREAZIONE BOSS ============

        async createBoss(bossData) {
            try {
                const { collection, addDoc, serverTimestamp } = window.firestoreTools || {};
                if (!collection || !addDoc || !window.db) {
                    throw new Error('Firestore non disponibile');
                }

                const bossId = `boss_${Date.now()}`;
                const newBoss = {
                    id: bossId,
                    name: bossData.name || 'Boss Sconosciuto',
                    description: bossData.description || '',
                    imageUrl: bossData.imageUrl || '',

                    status: 'active',
                    createdAt: serverTimestamp(),

                    maxHp: bossData.maxHp || 100,
                    currentHp: bossData.maxHp || 100,

                    difficulty: bossData.difficulty || 'normal',
                    difficultyModifiers: DIFFICULTY_MODIFIERS[bossData.difficulty || 'normal'],

                    bossTeam: bossData.bossTeam || this.generateDefaultBossTeam(bossData.difficulty || 'normal'),

                    rewards: {
                        enabled: false,
                        participation: { cs: 50 },
                        completion: { cs: 200, css: 1 }
                    },

                    totalDamage: 0,
                    totalParticipants: 0,
                    totalAttempts: 0
                };

                const bossesRef = collection(window.db, this.getBossesPath());
                const docRef = await addDoc(bossesRef, newBoss);

                console.log('[BossBattle] Boss creato:', newBoss.name);
                return { id: docRef.id, ...newBoss };
            } catch (error) {
                console.error('[BossBattle] Errore creazione boss:', error);
                throw error;
            }
        },

        generateDefaultBossTeam(difficulty) {
            const modifiers = DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.normal;
            const baseLevel = 10 + modifiers.levelBonus;

            // Genera 5 giocatori boss
            const positions = [
                { ruolo: 'P', nome: 'Guardiano Boss' },
                { ruolo: 'D', nome: 'Difensore Boss' },
                { ruolo: 'C', nome: 'Regista Boss' },
                { ruolo: 'C', nome: 'Mediano Boss' },
                { ruolo: 'A', nome: 'Bomber Boss' }
            ];

            const types = ['Potenza', 'Tecnica', 'Velocita'];

            const players = positions.map((pos, index) => ({
                id: `boss_player_${index}`,
                nome: pos.nome,
                name: pos.nome,
                ruolo: pos.ruolo,
                role: pos.ruolo,
                tipo: types[index % 3],
                type: types[index % 3],
                level: baseLevel,
                potenza: Math.floor(50 * modifiers.statMultiplier),
                tecnica: Math.floor(50 * modifiers.statMultiplier),
                velocita: Math.floor(50 * modifiers.statMultiplier),
                abilities: ['Boss']
            }));

            return {
                teamName: 'Squadra Boss',
                players: players,
                formation: {
                    modulo: '1-2-2',
                    titolari: players
                }
            };
        },

        // ============ SFIDA BOSS ============

        async challengeBoss(bossId, playerTeam) {
            try {
                // Carica boss
                const boss = await this.loadBoss(bossId);
                if (!boss) {
                    throw new Error('Boss non trovato');
                }

                if (boss.status !== 'active') {
                    throw new Error('Boss non attivo');
                }

                if (boss.currentHp <= 0) {
                    throw new Error('Boss gia sconfitto');
                }

                // Prepara squadra boss con modificatori
                const enhancedBossTeam = this.prepareBossTeam(boss.bossTeam, boss.difficultyModifiers);

                // Esegui simulazione
                const result = await this.runBossSimulation(playerTeam, enhancedBossTeam);

                // Calcola danno (= gol segnati dal giocatore)
                const damage = result.homeGoals || 0;

                // Aggiorna HP boss
                const updateResult = await this.dealDamage(bossId, damage, playerTeam);

                // Registra partecipazione
                await this.recordParticipation(bossId, playerTeam, damage, result);

                return {
                    success: true,
                    result: result,
                    damage: damage,
                    newHp: updateResult.newHp,
                    isDefeated: updateResult.isDefeated,
                    message: damage > 0
                        ? `Hai inflitto ${damage} danni al Boss!`
                        : 'Non hai inflitto danni al Boss.'
                };
            } catch (error) {
                console.error('[BossBattle] Errore sfida boss:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        prepareBossTeam(bossTeam, modifiers) {
            if (!bossTeam || !bossTeam.players) return bossTeam;

            const enhancedPlayers = bossTeam.players.map(player => ({
                ...player,
                level: (player.level || 1) + (modifiers?.levelBonus || 0),
                formMod: modifiers?.formBonus || 0
            }));

            return {
                ...bossTeam,
                players: enhancedPlayers,
                formation: {
                    ...bossTeam.formation,
                    titolari: enhancedPlayers
                }
            };
        },

        async runBossSimulation(playerTeam, bossTeam) {
            // Usa la simulazione esistente se disponibile
            if (window.ChampionshipSimulation?.runSimulationWithLog) {
                return window.ChampionshipSimulation.runSimulationWithLog(playerTeam, bossTeam);
            }

            // Fallback: simulazione semplificata
            return this.simpleBossSimulation(playerTeam, bossTeam);
        },

        simpleBossSimulation(playerTeam, bossTeam) {
            // Calcola forza squadre
            const playerStrength = this.calculateTeamStrength(playerTeam);
            const bossStrength = this.calculateTeamStrength(bossTeam) * 1.2; // Boss ha vantaggio

            const totalStrength = playerStrength + bossStrength;
            const playerProb = playerStrength / totalStrength;

            let playerGoals = 0;
            let bossGoals = 0;

            // Simula 10 azioni
            for (let i = 0; i < 10; i++) {
                const roll = Math.random();
                if (roll < playerProb * 0.25) {
                    playerGoals++;
                } else if (roll > 1 - (1 - playerProb) * 0.3) {
                    bossGoals++;
                }
            }

            return {
                homeGoals: playerGoals,
                awayGoals: bossGoals,
                homeTeamName: playerTeam.teamName || 'Giocatore',
                awayTeamName: bossTeam.teamName || 'Boss'
            };
        },

        calculateTeamStrength(team) {
            if (!team || !team.players) return 100;

            let strength = 0;
            const players = team.formation?.titolari || team.players || [];

            for (const player of players) {
                const level = player.level || 1;
                strength += level * 10;
            }

            return strength || 100;
        },

        // ============ AGGIORNAMENTO HP ============

        async dealDamage(bossId, damage, playerTeam) {
            try {
                const { doc, runTransaction, increment } = window.firestoreTools || {};
                if (!doc || !runTransaction || !window.db) {
                    throw new Error('Firestore non disponibile');
                }

                const bossRef = doc(window.db, this.getBossesPath(), bossId);

                const result = await runTransaction(window.db, async (transaction) => {
                    const bossDoc = await transaction.get(bossRef);
                    if (!bossDoc.exists()) {
                        throw new Error('Boss non trovato');
                    }

                    const currentHp = bossDoc.data().currentHp || 0;
                    const newHp = Math.max(0, currentHp - damage);
                    const isDefeated = newHp === 0;

                    const updates = {
                        currentHp: newHp,
                        totalDamage: increment(damage),
                        totalAttempts: increment(1)
                    };

                    if (isDefeated) {
                        updates.status = 'defeated';
                        updates.defeatedAt = new Date().toISOString();
                    }

                    transaction.update(bossRef, updates);

                    return { newHp, isDefeated };
                });

                console.log(`[BossBattle] Danno inflitto: ${damage}, HP rimanenti: ${result.newHp}`);

                // Se sconfitto, gestisci vittoria
                if (result.isDefeated) {
                    await this.handleBossDefeated(bossId);
                }

                return result;
            } catch (error) {
                console.error('[BossBattle] Errore aggiornamento HP:', error);
                throw error;
            }
        },

        // ============ PARTECIPAZIONE ============

        async recordParticipation(bossId, playerTeam, damage, matchResult) {
            try {
                const { doc, setDoc, getDoc, increment } = window.firestoreTools || {};
                if (!doc || !setDoc || !window.db) {
                    return;
                }

                const teamId = playerTeam.id || window.InterfacciaCore?.getTeamId?.() || 'unknown';
                const participantRef = doc(window.db, this.getParticipantsPath(bossId), teamId);

                const existingDoc = await getDoc(participantRef);
                const isNewParticipant = !existingDoc.exists();

                const participantData = {
                    teamId: teamId,
                    teamName: playerTeam.teamName || 'Squadra',
                    totalDamage: increment(damage),
                    attempts: increment(1),
                    lastAttemptAt: new Date().toISOString(),
                    lastMatchResult: `${matchResult.homeGoals}-${matchResult.awayGoals}`
                };

                await setDoc(participantRef, participantData, { merge: true });

                // Aggiorna contatore partecipanti se nuovo
                if (isNewParticipant) {
                    const bossRef = doc(window.db, this.getBossesPath(), bossId);
                    await setDoc(bossRef, { totalParticipants: increment(1) }, { merge: true });
                }

                console.log('[BossBattle] Partecipazione registrata');
            } catch (error) {
                console.error('[BossBattle] Errore registrazione partecipazione:', error);
            }
        },

        async getMyParticipation(bossId) {
            try {
                const { doc, getDoc } = window.firestoreTools || {};
                if (!doc || !getDoc || !window.db) {
                    return null;
                }

                const teamId = window.InterfacciaCore?.getTeamId?.() || 'unknown';
                const participantRef = doc(window.db, this.getParticipantsPath(bossId), teamId);
                const participantDoc = await getDoc(participantRef);

                if (!participantDoc.exists()) {
                    return null;
                }

                return participantDoc.data();
            } catch (error) {
                console.error('[BossBattle] Errore caricamento partecipazione:', error);
                return null;
            }
        },

        // ============ CLASSIFICA ============

        async getDamageLeaderboard(bossId, limitCount = 20) {
            try {
                const { collection, getDocs, orderBy, query, limit } = window.firestoreTools || {};
                if (!collection || !getDocs || !window.db) {
                    return [];
                }

                const participantsRef = collection(window.db, this.getParticipantsPath(bossId));
                const q = query(
                    participantsRef,
                    orderBy('totalDamage', 'desc'),
                    limit(limitCount)
                );

                const snapshot = await getDocs(q);

                return snapshot.docs.map((doc, index) => ({
                    rank: index + 1,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('[BossBattle] Errore caricamento classifica:', error);
                return [];
            }
        },

        // ============ BOSS SCONFITTO ============

        async handleBossDefeated(bossId) {
            console.log('[BossBattle] Boss sconfitto!', bossId);

            // Qui si potrebbero distribuire i premi quando abilitati
            if (this.config?.rewardsEnabled) {
                // TODO: Distribuisci premi
            }
        },

        // ============ GESTIONE BOSS ============

        async deleteBoss(bossId) {
            try {
                const { doc, deleteDoc } = window.firestoreTools || {};
                if (!doc || !deleteDoc || !window.db) {
                    throw new Error('Firestore non disponibile');
                }

                const bossRef = doc(window.db, this.getBossesPath(), bossId);
                await deleteDoc(bossRef);

                console.log('[BossBattle] Boss eliminato:', bossId);
                return true;
            } catch (error) {
                console.error('[BossBattle] Errore eliminazione boss:', error);
                return false;
            }
        },

        async resetBossHp(bossId) {
            try {
                const { doc, updateDoc } = window.firestoreTools || {};
                if (!doc || !updateDoc || !window.db) {
                    throw new Error('Firestore non disponibile');
                }

                const boss = await this.loadBoss(bossId);
                if (!boss) {
                    throw new Error('Boss non trovato');
                }

                const bossRef = doc(window.db, this.getBossesPath(), bossId);
                await updateDoc(bossRef, {
                    currentHp: boss.maxHp,
                    status: 'active',
                    totalDamage: 0,
                    totalAttempts: 0,
                    defeatedAt: null
                });

                console.log('[BossBattle] HP Boss resettati');
                return true;
            } catch (error) {
                console.error('[BossBattle] Errore reset HP:', error);
                return false;
            }
        },

        // ============ INIT ============

        async init() {
            await this.loadConfig();
            console.log('[BossBattle] Inizializzato, enabled:', this.isEnabled());
        }
    };

    // Auto-init quando DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.BossBattle.init());
    } else {
        window.BossBattle.init();
    }

})();
