/**
 * daily-wheel.js
 * Sistema Ruota della Fortuna Giornaliera
 *
 * Permette agli utenti di girare una ruota una volta al giorno
 * per vincere premi: CS, CSS o Oggetti
 */

(function() {
    'use strict';

    // Configurazione premi
    const PRIZES = [
        { id: 'cs5', label: '5 CS', type: 'cs', value: 5, probability: 30, color: '#4ade80', icon: '💰' },
        { id: 'cs10', label: '10 CS', type: 'cs', value: 10, probability: 25, color: '#22c55e', icon: '💰' },
        { id: 'cs25', label: '25 CS', type: 'cs', value: 25, probability: 20, color: '#3b82f6', icon: '💎' },
        { id: 'cs50', label: '50 CS', type: 'cs', value: 50, probability: 15, color: '#8b5cf6', icon: '💎' },
        { id: 'css1', label: '1 CSS', type: 'css', value: 1, probability: 8, color: '#fbbf24', icon: '⭐' },
        { id: 'object', label: 'Oggetto', type: 'object', value: null, probability: 2, color: '#ef4444', icon: '🎁' }
    ];

    // Oggetti possibili (se feature marketObjects attiva)
    const RANDOM_OBJECTS = [
        { name: 'Scarpini Veloci', slot: 'scarpini', bonus: { stat: 'velocita', value: 1 }, rarity: 'comune' },
        { name: 'Guanti Sicuri', slot: 'guanti', bonus: { stat: 'difesa', value: 1 }, rarity: 'comune' },
        { name: 'Maglia Fortunata', slot: 'maglia', bonus: { stat: 'fortuna', value: 1 }, rarity: 'comune' },
        { name: 'Parastinchi Resistenti', slot: 'parastinchi', bonus: { stat: 'resistenza', value: 1 }, rarity: 'comune' },
        { name: 'Cappello da Campione', slot: 'cappello', bonus: { stat: 'morale', value: 1 }, rarity: 'raro' }
    ];

    /**
     * Verifica se l'utente puo girare oggi
     * @param {Object} teamData - Dati della squadra
     * @returns {boolean}
     */
    function canSpinToday(teamData) {
        if (!teamData) return false;

        const wheelData = teamData.dailyWheel || {};
        const lastSpinDate = wheelData.lastSpinDate;

        if (!lastSpinDate) return true; // Mai girato

        // Usa data locale (reset alle 00:00 ora locale dell'utente)
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return lastSpinDate !== today;
    }

    /**
     * Estrae un premio dalla ruota
     * @returns {Object} Premio estratto
     */
    function spin() {
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
            // Usa data locale (coerente con canSpinToday)
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const wheelData = teamData.dailyWheel || { totalSpins: 0, history: [] };

            // Prepara aggiornamento
            const updates = {
                'dailyWheel.lastSpinDate': today,
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
        isEnabled
    };

    console.log('[DailyWheel] Modulo caricato');
})();
