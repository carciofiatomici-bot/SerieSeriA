/**
 * Test Match da Firebase
 * Carica due squadre da Firestore e simula una partita
 *
 * Uso: node test-match-firebase.js [squadra1] [squadra2]
 * Es:  node test-match-firebase.js "TiroDritto" "MuccheMannare"
 *
 * Richiede file .env con:
 *   FIREBASE_PROJECT_ID=tuo-project-id
 *   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
 *
 * Oppure file service-account.json nella stessa cartella
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Carica moduli simulazione
global.window = global;
global.console = console;
window.FigurineSystem = { getVariantBonuses: () => ({ iconaChance: 0 }) };

require(path.join(__dirname, '..', 'game-constants.js'));
require(path.join(__dirname, '..', 'abilita-effects.js'));
require(path.join(__dirname, '..', 'simulazione.js'));

const { simulationLogic } = window;

// ============ FIREBASE ============

function initializeFirebase() {
    let serviceAccount;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    // Prova a leggere da file service-account.json
    const serviceAccountPath = path.join(__dirname, 'service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
        console.log('[Firebase] Caricamento credenziali da service-account.json');
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log('[Firebase] Caricamento credenziali da .env');
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        console.error('ERRORE: Credenziali Firebase non trovate!');
        console.error('Crea uno dei seguenti:');
        console.error('  1. automation/service-account.json');
        console.error('  2. automation/.env con FIREBASE_SERVICE_ACCOUNT');
        process.exit(1);
    }

    if (!projectId && !serviceAccount.project_id) {
        console.error('ERRORE: FIREBASE_PROJECT_ID mancante');
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id
    });

    console.log(`[Firebase] Connesso a: ${projectId || serviceAccount.project_id}`);
    return admin.firestore();
}

// ============ CARICA SQUADRE ============

async function loadTeam(db, teamName) {
    const appId = 'serie-seria';
    const teamsRef = db.collection(`artifacts/${appId}/public/data/teams`);

    // Cerca per nome esatto
    let snapshot = await teamsRef.where('teamName', '==', teamName).get();

    if (snapshot.empty) {
        // Prova ricerca case-insensitive
        const allTeams = await teamsRef.get();
        const found = allTeams.docs.find(d =>
            d.data().teamName?.toLowerCase() === teamName.toLowerCase()
        );
        if (found) return { id: found.id, ...found.data() };

        // Prova ricerca parziale
        const partial = allTeams.docs.find(d =>
            d.data().teamName?.toLowerCase().includes(teamName.toLowerCase())
        );
        if (partial) return { id: partial.id, ...partial.data() };

        return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}

// ============ PREPARA SQUADRA ============

function prepareTeamForSimulation(teamData) {
    let titolari = teamData.formation?.titolari || [];
    const allPlayers = teamData.players || [];

    // Join con dati completi
    titolari = titolari.map(t => {
        const full = allPlayers.find(p => p.id === t.id);
        return full ? { ...full, ...t } : t;
    });

    // Applica forma
    const playersFormStatus = teamData.playersFormStatus || {};
    const playersWithForm = titolari.map(p => {
        const persisted = playersFormStatus[p.id];
        let currentLevel;

        if (persisted?.level !== undefined) {
            currentLevel = Math.min(30, Math.max(1, persisted.level));
        } else {
            currentLevel = Math.min(30, Math.max(1, p.currentLevel || p.level || 1));
        }

        return {
            ...p,
            currentLevel,
            abilities: Array.isArray(p.abilities) ? p.abilities : []
        };
    });

    // Raggruppa per ruolo
    const team = {
        teamName: teamData.teamName,
        formationInfo: {
            isIconaActive: playersWithForm.some(p => p.abilities?.includes('Icona'))
        },
        P: playersWithForm.filter(p => p.role === 'P'),
        D: playersWithForm.filter(p => p.role === 'D'),
        C: playersWithForm.filter(p => p.role === 'C'),
        A: playersWithForm.filter(p => p.role === 'A'),
        coachLevel: teamData.coach?.level || 1
    };

    return team;
}

// ============ MAIN ============

async function main() {
    const args = process.argv.slice(2);
    const team1Name = args[0] || 'TiroDritto';
    const team2Name = args[1] || 'MuccheMannare';

    console.log('\n' + '='.repeat(70));
    console.log(`TEST MATCH: ${team1Name} vs ${team2Name}`);
    console.log('='.repeat(70));

    const db = initializeFirebase();

    // Carica squadre
    console.log('\n[Caricamento squadre...]');

    const team1Data = await loadTeam(db, team1Name);
    const team2Data = await loadTeam(db, team2Name);

    if (!team1Data) {
        console.error(`Squadra "${team1Name}" non trovata!`);
        process.exit(1);
    }
    if (!team2Data) {
        console.error(`Squadra "${team2Name}" non trovata!`);
        process.exit(1);
    }

    console.log(`  ✓ ${team1Data.teamName}: ${team1Data.formation?.titolari?.length || 0} titolari`);
    console.log(`  ✓ ${team2Data.teamName}: ${team2Data.formation?.titolari?.length || 0} titolari`);

    // Prepara squadre
    const teamA = prepareTeamForSimulation(team1Data);
    const teamB = prepareTeamForSimulation(team2Data);

    // Mostra formazioni
    console.log(`\n[${teamA.teamName.toUpperCase()}] (${[...teamA.P, ...teamA.D, ...teamA.C, ...teamA.A].length} giocatori)`);
    [...teamA.P, ...teamA.D, ...teamA.C, ...teamA.A].forEach(p => {
        const ab = p.abilities?.length ? ` [${p.abilities.join(', ')}]` : '';
        console.log(`  ${p.role}: ${p.name} Lv.${p.currentLevel}${ab}`);
    });

    console.log(`\n[${teamB.teamName.toUpperCase()}] (${[...teamB.P, ...teamB.D, ...teamB.C, ...teamB.A].length} giocatori)`);
    [...teamB.P, ...teamB.D, ...teamB.C, ...teamB.A].forEach(p => {
        const ab = p.abilities?.length ? ` [${p.abilities.join(', ')}]` : '';
        console.log(`  ${p.role}: ${p.name} Lv.${p.currentLevel}${ab}`);
    });

    // Init simulazione
    simulationLogic.resetSimulationState();
    simulationLogic.initIconaBonusForMatch(
        teamA.formationInfo.isIconaActive,
        teamB.formationInfo.isIconaActive,
        'normale', 'normale'
    );
    simulationLogic.initAbilitiesForMatch(teamA, teamB);

    // Simula 50 occasioni
    let goalsA = 0, goalsB = 0;
    const events = [];

    console.log('\n[SIMULAZIONE 50 OCCASIONI]');

    for (let i = 1; i <= 50; i++) {
        const attacking = i % 2 === 1 ? teamA : teamB;
        const defending = i % 2 === 1 ? teamB : teamA;
        const attName = i % 2 === 1 ? teamA.teamName : teamB.teamName;

        const result = simulationLogic.simulateOneOccasionWithLog(attacking, defending, i);

        if (result.goal) {
            if (i % 2 === 1) goalsA++; else goalsB++;
            const ab = result.eventData?.abilities?.length > 0
                ? ` [${result.eventData.abilities.join(', ')}]` : '';
            events.push(`  Occ.${i}: ${attName} ⚽ GOL!${ab}`);
        }

        simulationLogic.updateScore('teamA', goalsA);
        simulationLogic.updateScore('teamB', goalsB);
    }

    // Risultato
    console.log('\n' + '='.repeat(70));
    console.log(`RISULTATO: ${teamA.teamName} ${goalsA} - ${goalsB} ${teamB.teamName}`);
    console.log('='.repeat(70));

    console.log('\n[GOL SEGNATI]');
    if (events.length === 0) console.log('  Nessun goal');
    else events.forEach(e => console.log(e));

    // Tracking icone
    const allPlayersA = [...teamA.P, ...teamA.D, ...teamA.C, ...teamA.A];
    const allPlayersB = [...teamB.P, ...teamB.D, ...teamB.C, ...teamB.A];

    const iconaA = allPlayersA.find(p => p.abilities?.includes('Icona'));
    const iconaB = allPlayersB.find(p => p.abilities?.includes('Icona'));

    if (iconaA || iconaB) {
        console.log('\n[TRACKING ICONE]');
        if (iconaA) {
            const track = window.AbilitaEffects.getPlayerTracking(iconaA.id);
            const stats = [];
            if (track.tiroDrittoGoals > 0) stats.push(`tiroDritto: ${track.tiroDrittoGoals}`);
            if (track.parataLaserBonus > 0) stats.push(`parataLaser: ${track.parataLaserBonus}`);
            if (stats.length > 0) console.log(`  ${iconaA.name}: ${stats.join(', ')}`);
        }
        if (iconaB) {
            const track = window.AbilitaEffects.getPlayerTracking(iconaB.id);
            const stats = [];
            if (track.tiroDrittoGoals > 0) stats.push(`tiroDritto: ${track.tiroDrittoGoals}`);
            if (track.parataLaserBonus > 0) stats.push(`parataLaser: ${track.parataLaserBonus}`);
            if (stats.length > 0) console.log(`  ${iconaB.name}: ${stats.join(', ')}`);
        }
    }

    console.log('\n' + '='.repeat(70));

    process.exit(0);
}

main().catch(err => {
    console.error('Errore:', err);
    process.exit(1);
});
