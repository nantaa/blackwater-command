# Blackwater Command — Multiplayer v0 Implementation Plan


**Goal:** Build a complete 4-player multiplayer system (1v1v1v1 FFA and 2v2 Teams) for Blackwater Command with secret deployment on a 24×24 quadrant board, contiguous multi-cell ship footprints, zero-leak fog-of-war filtering, turn timers, and an authoritative WebSocket server.

**Architecture:** An isomorphic core rule engine (`src/mp-engine.js`) powers both local client simulation and authoritative Node.js server (`server/mp-server.js`). Game state sent to clients is filtered per-player so no raw coordinates, ammo, or hands leak over the network. A tactical canvas UI (`blackwater-multiplayer.html`) supports both local 4-player hotseat testing and remote room lobbies via 4-letter invite codes.

**Tech Stack:** Vanilla JavaScript (ES6 / CommonJS isomorphic), HTML5 Canvas, CSS3, Node.js (`ws` WebSocket library), Playwright for automated browser end-to-end verification.

## Global Constraints
- Grid: Exactly 24×24 cells (A–X columns, 1–24 rows).
- Quadrants: NW (P1), NE (P2), SW (P3), SE (P4), each 12×12 cells.
- Ships: Flagship (3 contiguous cells, 20 HP), Patrol Boat (2 contiguous cells, 8 HP), Minelayer (2 contiguous cells, 10 HP).
- Border Rule: Movement cards can only reposition ships within the owner's home quadrant.
- Turn & Resource: 30s turn timer, CP starts at 3 (cap 6), draw 2 cards, timeout/skip penalty (costs 1 CP or discards 1 card).
- Security: Zero coordinate leakage to clients for opponents' ships, mines, decoys, or concealed actions.
- TDD Order: Plan → Test → Implement → Review → Verify → Document/Remember → Refactor.
- Sections: Adhere strictly to Section 15 of `blackwater-command-multiplayer-v0-rules-lock.md` (Patch 1 Local Simulation → Patch 2 WebSocket Rooms → Patch 3 2v2 Teams).

---

### Task 1: Core Multiplayer Engine & 24×24 Grid Rules (COMPLETED)
**Files:**
- Created: `src/mp-engine.js`
- Created: `test/test-mp-runner.js`

- [x] **Step 1: Write failing tests for 24×24 grid, quadrants, and multi-cell ship footprints**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Implement multi-cell placement, bounds validation, and quick deploy**
- [x] **Step 4: Run tests and verify PASS**
- [x] **Step 5: Checkpoint commit** (`0a0abe4`)

---

### Task 2: Match State, Turn Loop & Resources Engine (COMPLETED)
**Files:**
- Modified: `src/mp-engine.js`
- Modified: `test/test-mp-runner.js`

- [x] **Step 1: Write failing tests for CP carry-over, timeout penalty, platform action limits, and elimination**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Implement state machine, skip penalty, and 1-per-round support platform actions**
- [x] **Step 4: Run tests and verify PASS (23/23 tests green)**
- [x] **Step 5: Checkpoint commit** (`0a0abe4`)

---

### Task 3: Zero-Leak Per-Player State Filtering (COMPLETED)
**Files:**
- Modified: `src/mp-engine.js`
- Modified: `test/test-mp-runner.js`

- [x] **Step 1: Write failing tests confirming zero opponent ship coordinates or hidden cards in client state**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Implement `getFilteredState(match, viewerId)` with public-only combat log**
- [x] **Step 4: Run tests and verify PASS**
- [x] **Step 5: Checkpoint commit** (`0a0abe4`)

---

### Task 4: Local 4-Player Hotseat Simulation UI (`blackwater-multiplayer.html`)
**Files:**
- Create: `blackwater-multiplayer.html`
- Test: Playwright browser verification & manual hotseat walkthrough

**Interfaces:**
- Consumes: `window.MP` from `src/mp-engine.js` (`createMPMatch`, `submitDeployment`, `getFilteredState`, `resolveAttack`, `endMPTurn`, `handleTurnTimeoutOrSkip`, `quickDeployMP`).
- Produces: Standalone local 4-player simulation interface with quadrant switching tabs (`[P1: NW]`, `[P2: NE]`, `[P3: SW]`, `[P4: SE]`), secret deployment phase, 30s live turn timer, tactical canvas rendering, and zero-leak public logs.

- [ ] **Step 1: Write test runner script for UI verification**
Create `test/verify-ui.js` using Playwright to launch the page, check quadrant tabs, trigger deployment, and verify canvas renders without console errors.

- [ ] **Step 2: Run UI test to verify failure (page does not exist yet)**
Run: `node test/verify-ui.js`
Expected: FAIL (404 or file not found).

- [ ] **Step 3: Implement `blackwater-multiplayer.html`**
Build the complete single-file UI:
- Responsive 24×24 grid canvas (with distinct gold quadrant boundary lines).
- Mode selector (1v1v1v1 FFA vs 2v2 Teams).
- Quadrant viewer switcher tabs to test fog-of-war from each player's perspective.
- Secret deployment controls: Place Flagship (3 cells), Patrol Boat (2 cells), Minelayer (2 cells), rotate orientation, Quick Deploy button, and Confirm Deployment button.
- Combat interface: Active player banner, 30s countdown bar, CP meter, action buttons (Standard Strike, Torpedo Salvo, Sonar Scan, Decoy Buoy), and voluntary Skip/End Turn button.
- Public intelligence panel: Flagship HP for all 4 players, surviving support counts, public combat feed without coordinate leaks.

- [ ] **Step 4: Run UI test to verify pass**
Run: `node test/verify-ui.js`
Expected: PASS (Canvas initializes, 4 players deploy, hotseat turn advances).

- [ ] **Step 5: Commit UI checkpoint**
```powershell
git add blackwater-multiplayer.html test/verify-ui.js
git commit -m "feat(mp-ui): Add standalone 4-player local simulation client (Patch 1 complete)"
```

---

### Task 5: Authoritative WebSocket Server & Network Rooms (Patch 2)
**Files:**
- Create: `server/mp-server.js`
- Create: `test/test-server.js`
- Modify: `blackwater-multiplayer.html` (add "Remote Lobby" tab to connect via WebSocket)

**Interfaces:**
- Consumes: `src/mp-engine.js` for server-side rule execution and per-player filtering.
- Produces: WebSocket server on port 8090 handling room creation, 4-letter join codes, 30s turn timers, 10s disconnect grace period, and Autoplay fallback.

- [ ] **Step 1: Write failing WebSocket server test**
Create `test/test-server.js` that connects 4 simulated WebSocket clients to `ws://localhost:8090`, creates a room, joins 4 players, completes secret deployment, executes an action, and verifies filtered state broadcast.

- [ ] **Step 2: Run server test to verify failure**
Run: `node test/test-server.js`
Expected: FAIL (Connection refused).

- [ ] **Step 3: Implement `server/mp-server.js`**
- Uses Node `ws` library.
- Manages active rooms with 4-letter alphanumeric room codes.
- Handles messages: `CREATE_ROOM`, `JOIN_ROOM`, `SUBMIT_DEPLOYMENT`, `PLAY_ACTION`, `SURRENDER`, `DISCONNECT`.
- Runs authoritative 30s countdown timer on active turns.
- Injects 10s disconnect grace period, falling back to Autoplay if player times out.
- Broadcasts `getFilteredState(match, playerId)` strictly to each player's socket.

- [ ] **Step 4: Run server integration test**
Run: `node test/test-server.js`
Expected: PASS.

- [ ] **Step 5: Connect client UI to WebSocket server**
Add network lobby modal to `blackwater-multiplayer.html` with host/join buttons and room code input.

- [ ] **Step 6: Commit server checkpoint**
```powershell
git add server/mp-server.js test/test-server.js blackwater-multiplayer.html
git commit -m "feat(mp-server): Add authoritative WebSocket room server and client network lobby (Patch 2 complete)"
```

---

### Task 6: 2v2 Team Intelligence Sharing & Dual Surrender Verification (Patch 3)
**Files:**
- Modify: `src/mp-engine.js`
- Modify: `server/mp-server.js`
- Modify: `blackwater-multiplayer.html`
- Create: `test/test-2v2.js`

- [ ] **Step 1: Write failing test for 2v2 mechanics**
Write tests in `test/test-2v2.js`:
- Team 1 (NW P1 + SW P3) vs Team 2 (NE P2 + SE P4).
- Confirming that scans performed by P1 immediately reveal cells on P3's filtered map.
- Surrender requires confirmation from both living teammates before elimination occurs.
- Win condition: Elimination of both opposing flagships.

- [ ] **Step 2: Run test to verify failure or edge-case behavior**
Run: `node test/test-2v2.js`

- [ ] **Step 3: Polish implementation and UI team indicators**
Add team badges, shared scan overlays on canvas, and dual-confirmation surrender modal.

- [ ] **Step 4: Run all test suites across the project**
Run:
```powershell
node test/test-runner.js
node test/test-mp-runner.js
node test/test-server.js
node test/test-2v2.js
```
Expected: ALL SUITES GREEN.

- [ ] **Step 5: End-to-End Browser verification with screenshots**
Use Playwright to execute a 4-player session, capture screenshots, and save to artifacts.

- [ ] **Step 6: Final commit on feature branch**
```powershell
git add .
git commit -m "feat(mp-v0): Complete multiplayer v0 specifications (Local hotseat + Authoritative WebSocket + 2v2 teams)"
```
