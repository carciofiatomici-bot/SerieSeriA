//
// ====================================================================
// ESEMPI DI UTILIZZO DELLE NUOVE FUNZIONALITÀ
// ====================================================================
// Questo file mostra come usare le nuove funzioni aggiunte al progetto
//

// ============================================
// 1. VALIDAZIONE INPUT
// ============================================

// Esempio: Validare nome squadra prima di salvare
async function handleTeamCreation() {
    const teamName = document.getElementById('team-name-input').value;
    
    // Valida il nome
    const error = window.validateTeamName(teamName);
    if (error) {
        window.showToast(error, 'error');
        return;
    }
    
    // Valida la password
    const password = document.getElementById('password-input').value;
    const passwordError = window.validatePassword(password);
    if (passwordError) {
        window.showToast(passwordError, 'error');
        return;
    }
    
    // Procedi con la creazione...
    window.showLoader(true, 'Creazione squadra in corso...');
    try {
        await createTeam(teamName, password);
        window.showToast('Squadra creata con successo!', 'success');
    } catch (error) {
        window.showToast(window.getUserFriendlyError(error), 'error');
    } finally {
        window.showLoader(false);
    }
}

// ============================================
// 2. GESTIONE LOADER
// ============================================

// Esempio: Mostrare loader durante operazioni lunghe
async function loadTeamData(teamId) {
    window.showLoader(true, 'Caricamento dati squadra...');
    
    try {
        const data = await fetchTeamFromFirestore(teamId);
        return data;
    } catch (error) {
        window.showErrorBanner(window.getUserFriendlyError(error));
        throw error;
    } finally {
        window.showLoader(false);
    }
}

// ============================================
// 3. NOTIFICHE TOAST
// ============================================

// Esempio: Notifiche per diverse azioni
function demonstrateToasts() {
    // Successo
    window.showToast('Giocatore acquistato con successo!', 'success');
    
    // Errore
    window.showToast('Budget insufficiente per questo acquisto', 'error');
    
    // Warning
    window.showToast('Attenzione: hai solo 5 minuti per completare', 'warning');
    
    // Info
    window.showToast('La simulazione inizierà tra 2 ore', 'info');
    
    // Notifica persistente (senza auto-chiusura)
    window.showToast('Notifica importante che rimane visibile', 'warning', 0);
}

// ============================================
// 4. BANNER ERRORI
// ============================================

// Esempio: Mostrare errore persistente
function handleCriticalError(error) {
    console.error('Errore critico:', error);
    
    // Mostra banner che rimane visibile
    window.showErrorBanner(
        'Errore critico: impossibile connettersi al server. Contatta il supporto.',
        0 // 0 = rimane visibile fino a chiusura manuale
    );
}

// Esempio: Mostrare errore temporaneo
function handleTemporaryError(error) {
    window.showErrorBanner(
        window.getUserFriendlyError(error),
        5000 // Si chiude dopo 5 secondi
    );
}

// ============================================
// 5. ERRORI USER-FRIENDLY
// ============================================

// Esempio: Gestire errori Firebase con messaggi user-friendly
async function saveData(data) {
    try {
        await setDoc(docRef, data);
        window.showToast('Dati salvati correttamente', 'success');
    } catch (error) {
        // Converte l'errore tecnico in messaggio comprensibile
        const friendlyMessage = window.getUserFriendlyError(error);
        window.showToast(friendlyMessage, 'error');
        window.logger.error('Errore salvataggio:', error);
    }
}

// ============================================
// 6. LOGGING CONFIGURABILE
// ============================================

// Esempio: Usare il logger al posto di console.log
function debugFunction() {
    window.logger.log('Funzione chiamata'); // Visibile solo in DEBUG_MODE
    window.logger.debug('Dettagli debug:', { data: 'esempio' });
    window.logger.warn('Attenzione: comportamento anomalo');
    window.logger.error('Errore critico!'); // Sempre visibile
}

// ============================================
// 7. CACHE LOGHI CON REFRESH
// ============================================

// Esempio: Ricaricare i loghi solo quando necessario
async function refreshTeamLogos() {
    // Caricamento normale (usa cache se disponibile)
    await window.fetchAllTeamLogos();
    
    // Forza refresh ignorando cache
    await window.fetchAllTeamLogos(true);
}

// ============================================
// 8. WORKFLOW COMPLETO
// ============================================

// Esempio: Workflow completo di acquisto giocatore
async function acquistaGiocatore(playerId, cost) {
    const teamId = window.InterfacciaCore.currentTeamId;
    const teamData = window.InterfacciaCore.currentTeamData;
    
    // 1. Validazione
    if (teamData.budget < cost) {
        window.showToast('Budget insufficiente per questo acquisto', 'error');
        return false;
    }
    
    // 2. Conferma utente (opzionale)
    if (!confirm(`Confermi l'acquisto del giocatore per ${cost} crediti?`)) {
        return false;
    }
    
    // 3. Mostra loader
    window.showLoader(true, 'Elaborazione acquisto...');
    
    try {
        // 4. Esegui operazione
        const { doc, updateDoc } = window.firestoreTools;
        const appId = window.firestoreTools.appId;
        const TEAMS_COLLECTION_PATH = window.InterfacciaConstants.getTeamsCollectionPath(appId);
        
        const teamRef = doc(window.db, TEAMS_COLLECTION_PATH, teamId);
        
        // Aggiorna giocatori e budget
        const newPlayers = [...teamData.players, playerId];
        const newBudget = teamData.budget - cost;
        
        await updateDoc(teamRef, {
            players: newPlayers,
            budget: newBudget
        });
        
        // 5. Aggiorna dati locali
        teamData.players = newPlayers;
        teamData.budget = newBudget;
        window.InterfacciaCore.currentTeamData = teamData;
        
        // 6. Notifica successo
        window.showToast('Giocatore acquistato con successo!', 'success');
        
        // 7. Aggiorna UI
        document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
        
        return true;
        
    } catch (error) {
        // 8. Gestione errore
        window.logger.error('Errore acquisto giocatore:', error);
        window.showToast(window.getUserFriendlyError(error), 'error');
        return false;
        
    } finally {
        // 9. Nascondi loader
        window.showLoader(false);
    }
}

// ============================================
// 9. GESTIONE FORMULARI
// ============================================

// Esempio: Validare un form completo
function validateTeamForm() {
    const teamName = document.getElementById('team-name').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Valida nome
    const nameError = window.validateTeamName(teamName);
    if (nameError) {
        document.getElementById('name-error').textContent = nameError;
        return false;
    }
    
    // Valida password
    const passError = window.validatePassword(password);
    if (passError) {
        document.getElementById('password-error').textContent = passError;
        return false;
    }
    
    // Conferma password
    if (password !== confirmPassword) {
        document.getElementById('confirm-error').textContent = 'Le password non coincidono';
        return false;
    }
    
    // Pulisci messaggi errore
    document.getElementById('name-error').textContent = '';
    document.getElementById('password-error').textContent = '';
    document.getElementById('confirm-error').textContent = '';
    
    return true;
}

// ============================================
// 10. CONSTANTS USAGE
// ============================================

// Esempio: Usare le costanti al posto di magic numbers
function checkCooldown() {
    const lastAcquisition = teamData.lastDraftAcquisitionTimestamp;
    const now = Date.now();
    const cooldownTime = window.InterfacciaConstants.ACQUISITION_COOLDOWN_MS;
    
    if (now - lastAcquisition < cooldownTime) {
        const remainingMinutes = Math.ceil((cooldownTime - (now - lastAcquisition)) / 60000);
        window.showToast(
            `Devi aspettare ancora ${remainingMinutes} minuti prima del prossimo acquisto`,
            'warning'
        );
        return false;
    }
    
    return true;
}

// ============================================
// ESPORTAZIONE FUNZIONI ESEMPIO
// ============================================

window.ExamplesUsage = {
    handleTeamCreation,
    loadTeamData,
    demonstrateToasts,
    handleCriticalError,
    handleTemporaryError,
    saveData,
    debugFunction,
    refreshTeamLogos,
    acquistaGiocatore,
    validateTeamForm,
    checkCooldown
};

console.log("✅ Esempi di utilizzo caricati. Usa window.ExamplesUsage per testare le funzioni.");
