# Implementation Plan: 1v1 Battlefield Synchronization & Deployment Prep Stage

Fix the 1v1 multiplayer desynchronization where paired commanders receive mismatched battlefields, and restore the missing interactive fleet preparation stage before entering active combat.

## User Review Required

> [!IMPORTANT]
> **Direct Assessment of the Two Issues:**
> 1. **Battlefield Mismatch (You are 100% right):** The client code in `start1v1DuelBattle` called `initGame(Date.now())` locally on each machine. Because `Date.now()` differs between browser windows, each commander was placed onto a completely different randomly generated island map! Furthermore, because local port 8090 was not active, both windows fell back to local offline mode (`Room: LOCAL. Sector: P1`), meaning neither window was talking to a server.
> 2. **Missing Preparation Stage (You are 100% right):** The 1v1 flow skipped `scr-prep` entirely, jumping straight to `scr-battle` with randomized placements. Fleet placement (hiding behind islands, staggering lines, spacing support vessels) is fundamental to naval tactics. Bypassing the prep stage broke the core gameplay loop.

> [!WARNING]
> **Authoritative Server Requirement:**
> True 1v1 multiplayer requires both clients to connect to the same authoritative WebSocket server (`wss://blackwater-command-production.up.railway.app` or local `ws://localhost:8090`). If the server is offline, we must clearly indicate that local bot fallback is running, rather than silently pretending an online room was created.

---

## Proposed Changes

### Core Engine & Server Synchronization

#### [MODIFY] [`server/mp-server.js`](file:///d:/Document%20Backup/website-aryo/game/server/mp-server.js)
- Fix private room match ready broadcast: when a second player joins via `JOIN_1V1_ROOM`, emit individual `MATCH_READY` messages:
  - To Host (Client 1): `{ type: 'MATCH_READY', roomCode, mode: '1v1_duel', seed, grid, playerId: 'p1', sector: 'P1', opponent: { name: p2Name } }`
  - To Challenger (Client 2): `{ type: 'MATCH_READY', roomCode, mode: '1v1_duel', seed, grid, playerId: 'p2', sector: 'P2', opponent: { name: p1Name } }`
- Ensure Quick Match (`MATCH_FOUND`) also includes the exact shared `seed` and `grid`.
- Maintain match in `phase: 'DEPLOY'` until both players submit `SUBMIT_DEPLOYMENT`.
- When both deployments are accepted, transition match to `'BATTLE_ACTIVE'` and broadcast initial `STATE_UPDATE`.

---

### Client 1v1 Preparation Stage & Battlefield Rendering

#### [MODIFY] [`blackwater-command.html`](file:///d:/Document%20Backup/website-aryo/game/blackwater-command.html)
- **1v1 Handshake & Prep Launch:**
  - Update `handleDuelServerMsg`: on `MATCH_FOUND` and `MATCH_READY`, store `duelRoomCode`, `duelPlayerId`, `duelSector` (`'P1'` or `'P2'`), `duelGrid`, and `duelSeed`.
  - Call `start1v1Preparation(duelGrid, duelSector, duelSeed)`.
- **Customized 1v1 Preparation Stage (`scr-prep`):**
  - Adjust Sector Banners and placement bounds based on assigned sector:
    - If `duelSector === 'P1'`: Allied placement allowed strictly in West (Cols A–J, 0 ≤ x ≤ 9). East is marked Hostile (Cols K–T).
    - If `duelSector === 'P2'`: Allied placement allowed strictly in East (Cols K–T, 10 ≤ x ≤ 19). West is marked Hostile (Cols A–J).
  - Update `renderPrepBoard` to highlight the player's active home sector and restrict invalid placements with clear audio/visual warnings.
  - Update `confirmDeployment`:
    - In 1v1 online mode, send `{ type: 'SUBMIT_DEPLOYMENT', roomCode: duelRoomCode, fleet: placedShips }` over `duelWs`.
    - Display waiting overlay: `"Fleet deployed. Awaiting opponent deployment..."`.
- **Synchronized Battle Initialization:**
  - When `STATE_UPDATE` arrives with `phase === 'BATTLE_ACTIVE'`:
    - Dismiss prep waiting overlay and transition to `scr-battle`.
    - Initialize the battle grid with the **exact server grid and seed** (never `Date.now()`).
    - Render friendly ships in their confirmed placement coordinates.
    - Set fog of war on the opponent's sector.
- **Improved Offline Fallback Mode:**
  - If WebSocket cannot connect, display a clear warning banner: `"[OFFLINE TACTICAL SIM] Server not connected. Running local duel against simulated commander."`
  - Generate a single deterministic seed, allow P1 to place ships in Cols A–J in prep stage, and auto-deploy simulated opponent in Cols K–T.

---

### Automated Verification & Tests

#### [NEW] [`test/test-1v1-prep-and-sync.js`](file:///d:/Document%20Backup/website-aryo/game/test/test-1v1-prep-and-sync.js)
Unit test suite verifying:
1. Deterministic grid synchronization: identical seed produces identical grid in server and client.
2. Sector partitioning: P1 placement validator rejects Cols K–T; P2 placement validator rejects Cols A–J.
3. Private room message symmetry: both host and joiner receive matching grid, seed, and reciprocal sectors (`P1` and `P2`).
4. Two-phase transition: match phase stays in `DEPLOY` until both fleets are submitted, then transitions to `BATTLE_ACTIVE`.
5. Zero-leak state isolation: player state payloads never contain opponent coordinates prior to discovery.

---

## Verification Plan

### Automated Tests
```bash
# Run new 1v1 prep and sync test suite
node test/test-1v1-prep-and-sync.js

# Run full project regression suite
node test/test-runner.js
node test/verify-complete-package.js
```

### Manual Verification via Multi-Tab Browser Testing
1. Start local server daemon on port 8090 (`node server/mp-server.js`).
2. Open Browser Tab 1: Click `1v1 TACTICAL ONLINE`, click `CREATE ROOM`. Note the 4-letter room code.
3. Open Browser Tab 2: Click `1v1 TACTICAL ONLINE`, enter the room code, and click `JOIN`.
4. Verify both tabs transition immediately to the **Preparation Screen (`scr-prep`)**:
   - Tab 1 displays Allied Sector on West (Cols A–J).
   - Tab 2 displays Allied Sector on East (Cols K–T).
   - Both tabs display the **identical island and radar coordinates**.
5. Place ships in Tab 1 and click `CONFIRM DEPLOYMENT` $\to$ verify waiting message appears.
6. Place ships in Tab 2 and click `CONFIRM DEPLOYMENT` $\to$ verify both tabs transition simultaneously to `scr-battle`.
7. Verify both tabs see the same terrain, with friendly ships visible only in their own sector and fog of war covering the opponent.
