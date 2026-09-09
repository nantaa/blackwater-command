# Tactical 1v1 Online Mode (20×10 Dual-Sector) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated, low-latency Tactical 1v1 Online multiplayer mode featuring a fast-paced 20×10 grid (10×10 per player), supporting both automatic Quick Match pairing (FIFO queue) and 4-letter Private Room codes with 1-click invite links, fully integrated into the standalone single-file release.

**Architecture:** Extend the authoritative Node.js WebSocket server (`server/mp-server.js`) and core engine (`src/mp-engine.js`) to support a 2-player `1v1_duel` mode with strict 20×10 grid geometry, West ($x \in [0, 9]$) vs East ($x \in [10, 19]$) territory borders, and zero-leak state filtering. Inline all engine and UI components into `blackwater-command.html` to maintain standalone itch.io iframe compatibility.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5 Canvas, WebSockets (`ws`), Node.js built-in `vm` & `http` modules, Playwright.

---

## Global Constraints

- Standalone single-file distribution must be preserved in `blackwater-command.html` with zero broken external dependencies.
- Zero-Leak Security: Server payload to client must NEVER include opponent's hidden ship coordinates, hand cards, or secret smoke state.
- Strict TDD sequence: `plan → test → implement → review → verify → document/remember → refactor/improve`. Every task starts with a failing test and finishes green.
- Grid Geometry: Exactly 20 columns (A–T) and 10 rows (1–10). Player 1 sector is $x \in [0, 9]$ (Cols A–J); Player 2 sector is $x \in [10, 19]$ (Cols K–T). Midline border strictly bars ship entry.

---

## File Structure & Responsibilities

| File | Status | Responsibility |
| :--- | :--- | :--- |
| `test/test-1v1-matchmaking.js` | **NEW** | Unit tests for WebSocket server: Quick Match queue pairing, cancel queue, 4-letter private room codes, and disconnect handling. |
| `test/test-1v1-engine.js` | **NEW** | Unit tests for 20×10 engine: grid setup, 10×10 ship placement validation, midline border rules, combat damage, and zero-leak filtering. |
| `test/verify-1v1-flow.js` | **NEW** | End-to-end integration test simulating 2 automated WebSocket clients connecting, pairing, deploying, and firing turns. |
| `src/mp-engine.js` | **MODIFY** | Core state machine: add `1v1_duel` mode definition, 20×10 grid generator, West/East sector boundaries, and 2-player turn manager. |
| `server/mp-server.js` | **MODIFY** | Authoritative WebSocket server: add `quickMatchQueue`, message handlers for `QUEUE_1V1`, `CANCEL_QUEUE`, `CREATE_1V1_ROOM`, `JOIN_1V1_ROOM`. |
| `blackwater-command.html` | **MODIFY** | Main release file: inline updated MP engine, add "⚔ 1v1 TACTICAL ONLINE" title button, matchmaking modal, and 20×10 HUD. |

---

## Tasks

### Task 1: 1v1 Engine Core & 20×10 Grid Geometry (TDD Red → Green)

**Files:**
- Create: `test/test-1v1-engine.js`
- Modify: `src/mp-engine.js`

**Interfaces:**
- Consumes: `mp-engine.js` constants and helpers
- Produces: `MP.create1v1Match(seed, player1, player2)` returning a match object with `GW=20`, `GH=10`, `mode='1v1_duel'`, and sectors `P1: {minX:0, maxX:9, minY:0, maxY:9}` and `P2: {minX:10, maxX:19, minY:0, maxY:9}`.

- [ ] **Step 1: Write failing tests in `test/test-1v1-engine.js`**
  - Verify grid dimensions are exactly 20×10 (200 cells).
  - Verify Player 1 home sector is $x \in [0, 9]$, $y \in [0, 9]$ (Cols A–J, Rows 1–10).
  - Verify Player 2 home sector is $x \in [10, 19]$, $y \in [0, 9]$ (Cols K–T, Rows 1–10).
  - Verify ship placement outside player sector is rejected.
  - Verify midline movement restriction bars Player 1 from $x \ge 10$ and Player 2 from $x < 10$.
  - Verify `getFilteredState(match, 'p1')` strips all coordinates of `p2` unrevealed ships.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node test/test-1v1-engine.js`
  - Expected: FAIL with "create1v1Match is not a function" or dimension mismatch.

- [ ] **Step 3: Implement 20×10 geometry in `src/mp-engine.js`**
  - Add `DUEL_CONSTANTS`: `GW: 20`, `GH: 10`, `COLS: 'ABCDEFGHIJKLMNOPQRST'.split('')`.
  - Add `SECTORS_1V1`: `p1: { x1: 0, x2: 9, y1: 0, y2: 9 }`, `p2: { x1: 10, x2: 19, y1: 0, y2: 9 }`.
  - Implement `create1v1Match(seed, p1Config, p2Config)`.
  - Enforce sector boundary validation on manual and quick deployment.
  - Implement zero-leak state filtering for 1v1 duel.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node test/test-1v1-engine.js`
  - Expected: All assertions PASS (GREEN).

- [ ] **Step 5: Commit**
  - Run: `git add test/test-1v1-engine.js src/mp-engine.js; git commit -m "feat(1v1): add 20x10 dual-sector engine and zero-leak state machine"`

---

### Task 2: Server-Side Matchmaking & Room Code Logic (TDD Red → Green)

**Files:**
- Create: `test/test-1v1-matchmaking.js`
- Modify: `server/mp-server.js`

**Interfaces:**
- Consumes: `mp-server.js` WebSocket protocol
- Produces: `quickMatchQueue`, messages `QUEUE_1V1`, `MATCH_FOUND`, `CANCEL_QUEUE`, `CREATE_1V1_ROOM`, `JOIN_1V1_ROOM`.

- [ ] **Step 1: Write failing tests in `test/test-1v1-matchmaking.js`**
  - Test Quick Match: Client A sends `QUEUE_1V1`; queue length becomes 1.
  - Test Queue Pairing: Client B sends `QUEUE_1V1`; both clients receive `MATCH_FOUND` with same `roomCode`, assigned player IDs (`p1` and `p2`), and map `20x10`.
  - Test Cancel Queue: Client A sends `CANCEL_QUEUE`; removed from queue, no match triggered on Client B join.
  - Test Disconnect Eviction: Queued client closes socket; server automatically evicts them from `quickMatchQueue`.
  - Test Private Room Code: Client A sends `CREATE_1V1_ROOM`; receives 4-letter alphanumeric code. Client B sends `JOIN_1V1_ROOM` with code; room starts.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node test/test-1v1-matchmaking.js`
  - Expected: FAIL with unhandled message types.

- [ ] **Step 3: Implement Quick Match & Private Code handling in `server/mp-server.js`**
  - Add `const quickMatch1v1Queue = [];`.
  - Handle `QUEUE_1V1`: if queue not empty, pop waiting player, create 1v1 Room with `mode: '1v1_duel'`, add both clients, and send `MATCH_FOUND`.
  - Handle `CANCEL_QUEUE`: filter socket from `quickMatch1v1Queue`.
  - Add socket `close` listener hook to purge socket from queue.
  - Handle `CREATE_1V1_ROOM` and `JOIN_1V1_ROOM` supporting 2-player max capacity.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node test/test-1v1-matchmaking.js`
  - Expected: All assertions PASS (GREEN).

- [ ] **Step 5: Commit**
  - Run: `git add test/test-1v1-matchmaking.js server/mp-server.js; git commit -m "feat(matchmaking): implement 1v1 quick match FIFO queue and private room codes"`

---

### Task 3: Inlining 1v1 Engine into Main Standalone Game (`blackwater-command.html`)

**Files:**
- Modify: `blackwater-command.html`
- Test: `test/verify-complete-package.js`

**Interfaces:**
- Consumes: Updated `MP` engine logic from `src/mp-engine.js`
- Produces: Inlined `MP.create1v1Match`, `DUEL_CONSTANTS`, and client-side WebSocket client controller in `blackwater-command.html`.

- [ ] **Step 1: Add standalone contract tests in `test/verify-complete-package.js`**
  - Assert `blackwater-command.html` contains `create1v1Match`.
  - Assert `blackwater-command.html` contains 1v1 matchmaking lobby UI elements (`btn-quick-1v1`, `btn-create-1v1`, `txt-join-1v1`).

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node test/verify-complete-package.js`
  - Expected: FAIL with missing 1v1 UI / engine elements.

- [ ] **Step 3: Inline 1v1 engine & add lobby UI in `blackwater-command.html`**
  - Sync the inlined `MP` engine IIFE with `create1v1Match` and `20x10` dual-sector definitions.
  - Add Command Bridge Title Screen button: `⚔ 1v1 TACTICAL ONLINE`.
  - Add Modal Screen `scr-1v1-lobby`:
    - Tab 1: **⚡ Quick Match** (status pulse, search timer, cancel button).
    - Tab 2: **🔒 Private Duel** (Host 4-letter code generator + Copy Link button; Join code input + Join button).
  - Add client WebSocket connection controller with automatic reconnection and fallback to local hotseat if server is offline.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node test/verify-complete-package.js`
  - Expected: All standalone package tests PASS (GREEN).

- [ ] **Step 5: Commit**
  - Run: `git add blackwater-command.html test/verify-complete-package.js; git commit -m "feat(ui): inline 1v1 duel engine and add matchmaking lobby to title screen"`

---

### Task 4: 20×10 Dual-Sector Tactical HUD & Game Flow

**Files:**
- Modify: `blackwater-command.html`
- Create: `test/verify-1v1-flow.js`

**Interfaces:**
- Consumes: Active 1v1 match WebSocket feed
- Produces: 20×10 canvas rendering (Cols A–T, Rows 1–10), secret deployment stage for 10×10 sector, turn indicators, and live combat resolution.

- [ ] **Step 1: Write integration test in `test/verify-1v1-flow.js`**
  - Spawn 2 WebSocket client bots.
  - Client 1 and Client 2 send `QUEUE_1V1`.
  - Verify both receive `MATCH_FOUND`.
  - Both submit valid secret deployments in their respective sectors.
  - Verify match transitions to `BATTLE_ACTIVE`.
  - Player 1 fires `Ballistic Missile` into enemy sector (Cols K–T).
  - Player 2 receives damage event; verify zero leaks of hidden coordinates.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node test/verify-1v1-flow.js`
  - Expected: FAIL before game loop implementation.

- [ ] **Step 3: Implement 20×10 HUD rendering & battle controller**
  - Canvas dimensions: $544 \times 284$ px ($GW=20, GH=10$, cell size 26px + labels).
  - Add sector boundary visual line separating Column J (Allied West) and Column K (Hostile East).
  - Render player's own ships in clear tactical blue; render enemy sector in fog of war with radar grid.
  - Wire action inputs (`Ballistic Missile`, `Narrow Sonar`, `Flank Speed`, `Go Silent`) to send authoritative WebSocket actions.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node test/verify-1v1-flow.js`
  - Expected: Full match flow passes cleanly (GREEN).

- [ ] **Step 5: Commit**
  - Run: `git add blackwater-command.html test/verify-1v1-flow.js; git commit -m "feat(1v1): implement 20x10 dual-sector canvas HUD and live battle loop"`

---

### Task 5: Full Regression Testing & Playwright Multi-Client Browser Verification

**Files:**
- Test all test files:
  - `node test/verify-complete-package.js`
  - `node test/test-roguelite.js`
  - `node test/test-runner.js`
  - `node test/test-mp-runner.js`
  - `node test/test-1v1-engine.js`
  - `node test/test-1v1-matchmaking.js`
  - `node test/verify-1v1-flow.js`
- Browser validation using Playwright:
  - Open two browser contexts on `http://localhost:8089/blackwater-command.html`.
  - Client 1 clicks "Quick Match"; Client 2 clicks "Quick Match".
  - Verify automatic match pairing in $< 2$ seconds.
  - Test secret deployment and live firing on the 20×10 tactical grid.
  - Capture screenshots of 1v1 matchmaking lobby and 20×10 active battle.

- [ ] **Step 1: Execute all unit and integration test suites**
- [ ] **Step 2: Execute Playwright multi-client browser verification session**
- [ ] **Step 3: Update `walkthrough.md` with new test evidence, diagrams, and screenshots**
- [ ] **Step 4: Commit final changes**
