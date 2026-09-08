# Blackwater Command — Roguelite Route Map, Mirage Carrier Boss & AI Heatmap Analyze Mode Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the full roguelite vertical slice from `final-prototype.md`: build the interactive Branching Route Map (Region 1), multiple encounter types (Hunt, Convoy Raid, Silent Duel), the Mirage Carrier Regional Boss (60s timer + false contacts), Decision Events, and the post-battle AI Probability Heatmap Analyze Mode, unifying the campaign and multiplayer tactical modes into one polished itch.io package.

**Architecture:** A unified stateful run engine manages the campaign progression: Route Map DAG generator → Node transition controller → Battle/Event resolver → Debrief/Reward handoff → Analyze Mode replay. The tactical canvas renders the 20×20 single-player combat and probability heatmap overlay, and provides access to the 24×24 multiplayer tactical simulation.

**Tech Stack:** Vanilla JavaScript (ES6), HTML5 Canvas with alpha blending for heatmaps, CSS3 Glassmorphism, Node.js test runner (`test/test-roguelite.js`).

---

## Direct Critique & Challenging Assumptions (Rating: 7.0 / 10)

1. **"A single battle with rewards is enough for a roguelike prototype" — YOU'RE WRONG (Rating: 4.5/10).**  
   Without the visual branching Route Map (Section 6), resource attrition has no strategic meaning. If a player cannot look 3 nodes ahead and see a Repair Depot or an Elite confrontation, they cannot make calculated tradeoffs between spending scarce torpedoes or saving ammunition for the boss.
2. **"Analyze Mode can just be a text summary" — YOU'RE WRONG (Rating: 5/10).**  
   The core selling point of Blackwater Command over standard Battleship clones is *tactical trust*. Section 17 explicitly requires a true **Probability Heatmap** overlay on the 20×20 grid. The player must be able to visually scrub the timeline and watch the AI's probability heatmap illuminate false contacts when a Decoy Buoy is dropped.
3. **"Multiplayer and Single-player should remain in separate disconnected HTML files" — YOU'RE WRONG.**  
   On itch.io, players play in a single browser window/iframe. Having a unified title screen allowing players to jump between the **Roguelike Campaign Run** and the **4-Player Multiplayer Simulation / Lobby** delivers an exponentially more complete product.

---

## Global Constraints
- Grid: Single-player battles use 20×20 grid (cols A–T, rows 1–20); multiplayer uses 24×24 quadrant board.
- Timers: Standard encounter = 75s; Regional Boss = 60s; Challenger = 45–50s.
- AI Fairness: AI probability engine computes normalized cell likelihoods ($0.0 \le P \le 1.0$) using strictly observed evidence (hits, misses, wake trails, scans, decoys). Zero coordinate peeking.
- Route Map: Region 1 consists of 4 tiers (3 normal/event/supply tiers + 1 Regional Boss node). Branching paths with forward-only progression (no backtracking).
- Standalone itch.io deployment: All game code, campaign run, multiplayer local hotseat simulation, and network client cleanly bundled in one primary file (`blackwater-command.html`).

---

### Task 1: Roguelite Route Map Generator & Node Progression (TDD Phase 1)
**Files:**
- Create: `test/test-roguelite.js`
- Modify: `blackwater-command.html` (Run Engine & Navigation)

**Interfaces:**
- Consumes: Run object (`seed`, `currentHp`, `ammo`, `deck`, `modules`).
- Produces: `generateRouteMap(seed, regionNumber)` returning a directed acyclic graph (DAG) of nodes with types (`fight`, `elite`, `event`, `repair`, `supply`, `boss`), connections, locked states, and visit history.

- [ ] **Step 1: Write failing test in `test/test-roguelite.js`**
Test DAG generation:
  - Generates 4 tiers for Region 1.
  - Tier 0: 2–3 starting nodes.
  - Tier 1–2: Branching fight, event, supply, and elite nodes.
  - Tier 3: Convergence onto single Regional Boss node (`Mirage Carrier`).
  - Forward connections only, no isolated or dead-end nodes.
  - Path locking: Selecting a node locks non-connected nodes in that tier.

- [ ] **Step 2: Run test to verify failure**
Run: `node test/test-roguelite.js`
Expected: FAIL (file or function missing).

- [ ] **Step 3: Implement `generateRouteMap` and route state machine**
Implement in `blackwater-command.html` (and test export):
- Deterministic pseudo-random DAG generation based on run seed.
- Node selection validation (`canVisitNode`, `visitNode`).
- Node archetype resolution (`Hunt`, `Convoy Raid`, `Silent Duel`, `Event: Distress Signal`, `Event: Derelict Vessel`, `Depot: Ammunition`, `Dock: Repair`, `Boss: Mirage Carrier`).

- [ ] **Step 4: Run tests and verify PASS**
Run: `node test/test-roguelite.js`
Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

---

### Task 2: Decision Events & Encounter Archetypes (TDD Phase 2)
**Files:**
- Modify: `test/test-roguelite.js`
- Modify: `blackwater-command.html`

**Specifications:**
- Events (Section 14 of `final-prototype.md`):
  - *Distress Signal*: Choice A (Investigate: +ammo, risk ambush), Choice B (Ignore: safe), Choice C (Remote scan: reveal next node modifier).
  - *Derelict Vessel*: Choice A (Board: gain card, take 2 hull damage), Choice B (Salvage: gain 2 torpedoes), Choice C (Leave: safe).
  - *Smuggler Dock*: Choice A (Remove card for 3 hull), Choice B (Trade 2 ammo for module), Choice C (Leave).
- Encounter Archetypes (Section 15):
  - *Hunt*: Standard flagship sink condition.
  - *Silent Duel*: Sensor range halved, both sides rely on wake trails and prediction.
  - *Convoy Raid*: Secondary transport target with 5-turn exit clock.
- Boss: *Mirage Carrier*:
  - 60-second turn timer.
  - Spawns periodic acoustic phantoms (false contacts) on the player's map.
  - Counterplay: Cross-referencing via thermal wake trails or using jammers.

- [ ] **Step 1: Write failing tests for events & boss logic in `test/test-roguelite.js`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement event resolution & boss modifier systems**
- [ ] **Step 4: Run tests and verify PASS**
- [ ] **Step 5: Commit checkpoint**

---

### Task 3: Post-Battle Analyze Mode & AI Probability Heatmap Overlay (TDD Phase 3)
**Files:**
- Modify: `test/test-roguelite.js`
- Modify: `blackwater-command.html`

**Specifications:**
- Post-battle screen adds **Analyze Mode**:
  - Turn timeline scrubber (Turn 1 to final turn).
  - **AI Heatmap Canvas Overlay**: Renders normalized probability distribution across the 20×20 board using a visual heat gradient (dark blue $\to$ cyan $\to$ yellow $\to$ red).
  - **AI Vision vs Reality Toggle**:
    - Mode A (AI Perspective): Shows only what the AI legally knew at that turn.
    - Mode B (Full Truth): Reveals exact player ship locations alongside the AI probability cloud.
  - **Explain Action**: Clicking any AI attack in the battle log highlights the exact evidence (wake trail, prior hit, decoy spike) that motivated the strike.

- [ ] **Step 1: Write failing test verifying probability map export & timeline recording in `test/test-roguelite.js`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement timeline snapshots and heatmap rendering logic**
- [ ] **Step 4: Run tests and verify PASS**
- [ ] **Step 5: Commit checkpoint**

---

### Task 4: Unified Title Screen & itch.io Standalone Packaging
**Files:**
- Modify: `blackwater-command.html`
- Create: `test/verify-complete-package.js`

**Specifications:**
- Title Screen with Navigation:
  - **Roguelike Campaign**: Select Doctrine $\to$ Interactive Route Map $\to$ Preparation Screen $\to$ Tactical Battle $\to$ Debrief / Rewards $\to$ Analyze Mode.
  - **Tactical Multiplayer**: Seamlessly launch local 4-Player 24×24 Hotseat Simulation or Online Room Lobby (inlining `src/mp-engine.js` so zero external dependencies exist for itch.io).
  - **Codex & Tutorial**: Immediate access to game rules, doctrines, and fairness walkthrough.
- Test Playwright browser script verifying full navigation flow without console errors or broken links.

- [ ] **Step 1: Write Playwright E2E verification test (`test/verify-complete-package.js`)**
- [ ] **Step 2: Run test to observe failure**
- [ ] **Step 3: Integrate route map screen, analyze mode screen, and unified menu in `blackwater-command.html`**
- [ ] **Step 4: Run all test suites across the repository**
- [ ] **Step 5: Final Playwright screenshot capture & commit**
