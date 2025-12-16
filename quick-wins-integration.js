//
// ====================================================================
// QUICK-WINS-INTEGRATION.JS - Integra Quick Wins nelle funzioni esistenti
// ====================================================================
// Da caricare DOPO draft.js e mercato.js
//

// Aggiungi eventi custom per triggherare Quick Wins
document.addEventListener('DOMContentLoaded', () => {
    
    // Trigger Quick Wins quando la dashboard viene caricata
    const originalUpdateTeamUI = window.InterfacciaDashboard?.updateTeamUI;
    if (originalUpdateTeamUI) {
        window.InterfacciaDashboard.updateTeamUI = function(...args) {
            originalUpdateTeamUI.apply(this, args);
            
            // Inizializza Quick Wins dopo update dashboard
            setTimeout(() => {
                if (window.QuickWins) {
                    window.QuickWins.initializeAll();
                }
            }, 500);
        };
    }
    
    // Intercetta conferme acquisto (se esiste funzione globale)
    const originalConfirmPurchase = window.confirmPurchase;
    if (originalConfirmPurchase) {
        window.confirmPurchase = function(playerName, cost) {
            const teamData = window.InterfacciaCore.currentTeamData;
            if (!teamData) return true;
            
            // QUICK WIN 3: Conferma acquisti costosi
            if (window.QuickWins) {
                return window.QuickWins.confirmExpensivePurchase(
                    playerName, 
                    cost, 
                    teamData.budget
                );
            }
            
            return originalConfirmPurchase(playerName, cost);
        };
    }
    
});

// Wrapper globale per conferma acquisto (per draft e mercato)
window.confirmExpensivePurchase = (playerName, cost) => {
    const teamData = window.InterfacciaCore.currentTeamData;
    if (!teamData) return true;
    
    if (window.QuickWins) {
        return window.QuickWins.confirmExpensivePurchase(
            playerName, 
            cost, 
            teamData.budget
        );
    }
    
    return true;
};

// Helper per aggiungere badge forma ai giocatori
window.addPlayerFormaBadge = (player, containerElement) => {
    if (window.QuickWins && containerElement) {
        window.QuickWins.addFormaBadge(player, containerElement);
    }
};

console.log("✅ Quick Wins Integration caricato.");
