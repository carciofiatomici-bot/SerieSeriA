# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Serie SeriA is a fantasy football (fantacalcio) web application built with vanilla JavaScript, HTML5, Tailwind CSS, and Firebase (Authentication + Firestore). It's a client-side SPA with no build system - files are loaded directly in the browser.

## Development Workflow

**No build/test commands** - this is a static web app:
1. Edit JavaScript/HTML/CSS files locally
2. Open `index.html` in browser to test
3. Use browser DevTools console for debugging
4. Firebase and Tailwind CSS are loaded from CDN

## Architecture

### Module System
All modules export to the `window` namespace (no ES modules):
```javascript
window.ModuleName = { method1, method2, ... }
```

### Key Global Objects
- `window.InterfacciaCore` - Shared team/user state with getters/setters
- `window.InterfacciaConstants` - App-wide constants
- `window.firestoreTools` - Firebase Firestore operations
- `window.showScreen(elementId)` - Screen navigation

### Script Load Order (defined in index.html)
Scripts must load in this order due to dependencies:
1. **Definitions**: `icone.js`, `interfaccia-core.js`
2. **Simulation**: `simulazione.js`
3. **Interface**: `interfaccia-auth.js`, `interfaccia-dashboard.js`, `interfaccia-navigation.js`, etc.
4. **Features**: `gestionesquadre.js`, `draft.js`, `mercato.js`, `campionato-*.js`, `admin-*.js`
5. **UI**: `match-replay-simple.js`, `player-stats*.js`, `abilities-encyclopedia*.js`
6. **Main**: `interfaccia.js` (orchestrator, runs on DOMContentLoaded)

### Key Files by Feature
| Feature | Primary File | Size |
|---------|--------------|------|
| Squad Management | `gestionesquadre.js` | 72 KB |
| Player Draft | `draft.js` | 39 KB |
| Abilities System | `abilities-encyclopedia.js` | 34 KB |
| Admin Teams | `admin-teams.js` | 33 KB |
| Match Simulation | `simulazione.js` | 24 KB |
| Authentication | `interfaccia-auth.js` | 21 KB |
| Free Agent Market | `mercato.js` | 20 KB |

### Firebase/Firestore Structure
Collections use dynamic appId prefix:
```
artifacts/{appId}/public/data/
├── teams/         # User team documents
├── draftPlayers/  # Available draft players
├── marketPlayers/ # Free agent market
├── config/        # Championship settings
├── schedule/      # Match schedule
└── leaderboard/   # League standings
```

## Game Domain Concepts

### Player System
- **Types**: Potenza (Power), Tecnica (Technical), Velocita (Speed) - rock-paper-scissors advantage system
- **Roles**: P (Portiere/GK), D (Difensore/DEF), C (Centrocampista/MID), A (Attaccante/FWD)
- **Squad**: 12 players + 1 captain (from 15 predefined "Icone")
- **Levels**: 1-30 with stat modifiers

### Match Simulation
Three-phase system in `simulazione.js`:
1. **Costruzione** (Building) - midfield battle
2. **Attacco** (Attack) - attacking play
3. **Tiro** (Shot) - shooting at goal

40+ abilities activate conditionally during phases.

### Key Constants
```javascript
MAX_ROSA_PLAYERS: 12 (+ 1 captain)
ACQUISITION_COOLDOWN_MS: 15 minutes
AUTO_SIMULATION_COOLDOWN_MS: 48 hours
```

### Formations
4 tactical formations: 1-2-2, 1-1-2-1, 1-3-1, 1-1-3

## Debugging

Access via browser console:
- `window.InterfacciaCore.getCurrentTeam()` - current team data
- `window.firestoreTools` - database operations
- `window.ExamplesUsage` - usage patterns

## External Dependencies

- Firebase SDK (CDN)
- Tailwind CSS (CDN)
- Font Awesome (CDN)
- Images hosted at: `https://github.com/carciofiatomici-bot/immaginiserie/`
