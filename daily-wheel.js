/**
 * daily-wheel.js
 * Sistema Ruota della Fortuna Giornaliera
 *
 * Permette agli utenti di girare una ruota una volta al giorno
 * per vincere premi: CS, CSS o Oggetti
 */

(function() {
    'use strict';

    // Flag per sapere se la config e' stata caricata
    let configLoaded = false;

    // Configurazione premi di DEFAULT (sovrascritta da Firestore se disponibile)
    let PRIZES = [
        { id: 'cs5', label: '5 CS', type: 'cs', value: 5, probability: 30, color: '#4ade80', icon: '💰' },
        { id: 'cs10', label: '10 CS', type: 'cs', value: 10, probability: 25, color: '#22c55e', icon: '💰' },
        { id: 'cs25', label: '25 CS', type: 'cs', value: 25, probability: 20, color: '#3b82f6', icon: '💎' },
        { id: 'cs50', label: '50 CS', type: 'cs', value: 50, probability: 15, color: '#8b5cf6', icon: '💎' },
        { id: 'css1', label: '1 CSS', type: 'css', value: 1, probability: 8, color: '#fbbf24', icon: '⭐' },
        { id: 'object', label: 'Oggetto', type: 'object', value: null, probability: 2, color: '#ef4444', icon: '🎁' }
    ];

    // Oggetti possibili (se feature marketObjects attiva)
    let RANDOM_OBJECTS = [
        { name: 'Scarpini Veloci', slot: 'scarpini', bonus: { stat: 'velocita', value: 1 }, rarity: 'comune' },
        { name: 'Guanti Sicuri', slot: 'guanti', bonus: { stat: 'difesa', value: 1 }, rarity: 'comune' },
        { name: 'Maglia Fortunata', slot: 'maglia', bonus: { stat: 'fortuna', value: 1 }, rarity: 'comune' },
        { name: 'Parastinchi Resistenti', slot: 'parastinchi', bonus: { stat: 'resistenza', value: 1 }, rarity: 'comune' },
        { name: 'Cappello da Campione', slot: 'cappello', bonus: { stat: 'morale', value: 1 }, rarity: 'raro' }
    ];

    /**
     * Carica la configurazione della ruota da Firestore
     * @param {boolean} forceReload - Se true, ricarica anche se gia caricata
     * @returns {Promise<boolean>} true se caricata con successo
     */
    async function loadConfig(forceReload = false) {
        if (configLoaded && !forceReload) return true;

        try {
            const firestoreTools = window.firestoreTools;
            if (!firestoreTools) {
                console.log('[DailyWheel] firestoreTools non disponibile, uso config default');
                return false;
            }

            const { doc, getDoc } = firestoreTools;
            const db = window.db;
            const appId = firestoreTools.appId;

            if (!db || !appId) {
                console.log('[DailyWheel] db o appId non disponibile, uso config default');
                return false;
            }

            const configPath = `artifacts/${appId}/public/data/config`;
            const configDocRef = doc(db, configPath, 'wheelConfig');
            const configDoc = await getDoc(configDocRef);

            if (configDoc.exists()) {
                const data = configDoc.data();

                if (data.prizes && Array.isArray(data.prizes) && data.prizes.length > 0) {
                    PRIZES.length = 0;
                    PRIZES.push(...data.prizes);
                    console.log('[DailyWheel] Premi caricati da Firestore:', PRIZES.length);
                }

                if (data.objects && Array.isArray(data.objects) && data.objects.length > 0) {
                    RANDOM_OBJECTS.length = 0;
                    RANDOM_OBJECTS.push(...data.objects);
                    console.log('[DailyWheel] Oggetti caricati da Firestore:', RANDOM_OBJECTS.length);
                }

                configLoaded = true;
                return true;
            } else {
                console.log('[DailyWheel] Nessuna config salvata, uso default');
                return false;
            }

        } catch (error) {
            console.error('[DailyWheel] Errore caricamento config:', error);
            return false;
        }
    }

    // Costante per il cooldown della ruota (12 ore in millisecondi)
    const WHEEL_COOLDOWN_MS = 12 * 60 * 60 * 1000;

    /**
     * Verifica se l'utente puo girare (cooldown 12 ore)
     * @param {Object} teamData - Dati della squadra
     * @returns {boolean}
     */
    function canSpinToday(teamData) {
        if (!teamData) return false;

        const wheelData = teamData.dailyWheel || {};
        const lastSpinTimestamp = wheelData.lastSpinTimestamp;

        // Fallback per vecchi dati: se c'è lastSpinDate ma non lastSpinTimestamp
        if (!lastSpinTimestamp && wheelData.lastSpinDate) {
            // Considera che possono girare (nuova logica)
            return true;
        }

        if (!lastSpinTimestamp) return true; // Mai girato

        // Verifica se sono passate 12 ore dall'ultimo spin
        const now = Date.now();
        return (now - lastSpinTimestamp) >= WHEEL_COOLDOWN_MS;
    }

    /**
     * Estrae un premio dalla ruota
     * Carica automaticamente la config se non ancora caricata
     * @returns {Promise<Object>} Premio estratto
     */
    async function spin() {
        // Assicurati che la config sia caricata
        await loadConfig();

        const totalProbability = PRIZES.reduce((sum, p) => sum + p.probability, 0);
        let random = Math.random() * totalProbability;

        for (const prize of PRIZES) {
            random -= prize.probability;
            if (random <= 0) {
                // Se e' un oggetto, scegli uno random
                if (prize.type === 'object') {
                    const randomObject = RANDOM_OBJECTS[Math.floor(Math.random() * RANDOM_OBJECTS.length)];
                    return {
                        ...prize,
                        value: randomObject,
                        label: randomObject.name
                    };
                }
                return { ...prize };
            }
        }

        // Fallback al primo premio
        return { ...PRIZES[0] };
    }

    /**
     * Assegna il premio alla squadra
     * @param {Object} prize - Premio da assegnare
     * @param {string} teamId - ID squadra
     * @returns {Promise<Object>} Risultato operazione
     */
    async function awardPrize(prize, teamId) {
        console.log('[DailyWheel] awardPrize chiamato con:', { prize, teamId });

        const firestoreTools = window.firestoreTools;
        if (!firestoreTools) {
            console.error('[DailyWheel] firestoreTools non disponibile');
            return { success: false, message: 'Firestore non disponibile' };
        }

        const { doc, getDoc, updateDoc } = firestoreTools;
        const db = window.db;

        if (!db) {
            console.error('[DailyWheel] window.db non disponibile');
            return { success: false, message: 'Database non disponibile' };
        }

        const appId = firestoreTools.appId;
        if (!appId) {
            console.error('[DailyWheel] appId non disponibile');
            return { success: false, message: 'AppId non disponibile' };
        }

        const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        console.log('[DailyWheel] Path squadre:', TEAMS_COLLECTION_PATH);

        try {
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
            const teamDoc = await getDoc(teamDocRef);

            if (!teamDoc.exists()) {
                return { success: false, message: 'Squadra non trovata' };
            }

            const teamData = teamDoc.data();
            // Timestamp per cooldown 12 ore + data per storico
            const nowTimestamp = Date.now();
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const wheelData = teamData.dailyWheel || { totalSpins: 0, history: [] };

            // Prepara aggiornamento
            const updates = {
                'dailyWheel.lastSpinDate': today,
                'dailyWheel.lastSpinTimestamp': nowTimestamp,
                'dailyWheel.totalSpins': (wheelData.totalSpins || 0) + 1
            };

            // Aggiorna storico (ultimi 10)
            const newHistory = [
                { date: today, prize: prize.label, type: prize.type },
                ...(wheelData.history || []).slice(0, 9)
            ];
            updates['dailyWheel.history'] = newHistory;

            // Assegna premio in base al tipo
            switch (prize.type) {
                case 'cs':
                    // Aggiungi CS al budget
                    const currentBudget = teamData.budget || 0;
                    updates.budget = currentBudget + prize.value;
                    console.log('[DailyWheel] CS premio - Budget attuale:', currentBudget, '+ Premio:', prize.value, '= Nuovo:', currentBudget + prize.value);
                    break;

                case 'css':
                    // Aggiungi CSS (Crediti Super Seri)
                    // Usa il campo creditiSuperSeri come il modulo CreditiSuperSeri
                    const currentCSS = teamData.creditiSuperSeri || 0;
                    updates.creditiSuperSeri = currentCSS + prize.value;
                    console.log('[DailyWheel] CSS premio - Saldo attuale:', currentCSS, '+ Premio:', prize.value, '= Nuovo:', currentCSS + prize.value);
                    break;

                case 'object':
                    // Aggiungi oggetto all'inventario
                    const inventory = teamData.inventory || [];
                    const newObject = {
                        id: `wheel_${Date.now()}`,
                        ...prize.value,
                        source: 'dailyWheel',
                        acquiredDate: today
                    };
                    updates.inventory = [...inventory, newObject];
                    break;
            }

            console.log('[DailyWheel] Aggiornamenti da salvare:', updates);
            await updateDoc(teamDocRef, updates);
            console.log('[DailyWheel] Aggiornamento completato con successo!');

            return {
                success: true,
                message: `Hai vinto ${prize.label}!`,
                prize: prize
            };

        } catch (error) {
            console.error('[DailyWheel] Errore assegnazione premio:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Ottiene l'indice del premio per l'animazione della ruota
     * @param {Object} prize - Premio estratto
     * @returns {number} Indice del premio
     */
    function getPrizeIndex(prize) {
        return PRIZES.findIndex(p => p.id === prize.id);
    }

    /**
     * Verifica se la feature e' abilitata
     * @returns {boolean}
     */
    function isEnabled() {
        return window.FeatureFlags?.isEnabled('dailyWheel') || false;
    }

    // Esporta modulo
    window.DailyWheel = {
        PRIZES,
        RANDOM_OBJECTS,
        canSpinToday,
        spin,
        awardPrize,
        getPrizeIndex,
        isEnabled,
        loadConfig
    };

    console.log('[DailyWheel] Modulo caricato');
})();
