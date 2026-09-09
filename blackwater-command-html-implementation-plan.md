# Blackwater Command — HTML Implementation Plan

Turning the Final Prototype Spec into a buildable HTML/JS project, phased to match the spec's own Build Sequence Sheet (Section 22).

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Rendering | Vanilla JS + `<canvas>` for the 20x20 board, DOM/HTML for UI chrome (hand, panels, log) | Canvas gives fast redraws for fog/heatmap/trails; DOM is easier for cards, buttons, text, and accessibility than an all-canvas UI |
| State | Plain JS objects + a small pub/sub event bus (no framework required) | The game is turn-based and deterministic — a framework adds overhead without solving a real problem here |
| Build tooling | None required at first — plain ES modules loaded via `<script type="module">`. Add Vite later only if bundling/minifying for Android packaging becomes necessary | Keeps prototype loop (Phase 1) fast to iterate |
| Persistence | `localStorage` for save/run state (single offline device) | Matches "no account, no server" requirement |
| Android packaging (later) | Wrap the finished HTML/CSS/JS in Capacitor once gameplay is proven | Don't invest in native packaging before the loop is fun — that's exactly what the spec's phased approach protects against |

You do **not** need React/Vue for this. A deckbuilder-on-a-grid is well suited to plain JS with a clear state object and a render function that's cheap to call every turn.

---

## 2. File Structure

```
blackwater-command/
├── index.html
├── styles/
│   ├── layout.css        # screen regions: board, hand, panels, log
│   └── theme.css         # military-map visual language (Sec. 20)
├── src/
│   ├── main.js            # boot, screen switching
│   ├── state.js            # single source of truth: run state, battle state
│   ├── rng.js               # seeded PRNG (mulberry32 or similar) — powers Sec. 17 determinism
│   ├── board/
│   │   ├── grid.js          # 20x20 model, coordinates A–T / 1–20
│   │   ├── terrain.js       # terrain table + movement/sensor/weapon rules (Sec. 7)
│   │   ├── generator.js     # map generation + Generator Acceptance Rules validator
│   │   └── render.js        # canvas draw: terrain, fog, contacts, effects
│   ├── fleet/
│   │   ├── ships.js         # ship definitions, HP, roles (Sec. 8)
│   │   └── contacts.js      # contact state machine: Unknown→Suspected→Contact→Confirmed→Lost/Decoy (Sec. 9)
│   ├── cards/
│   │   ├── cardPool.js      # the 12 prototype cards as data (Sec. 12)
│   │   ├── deck.js          # deck/hand/draw logic
│   │   └── targeting.js     # legal-cell resolution, range/pattern preview
│   ├── ammo/
│   │   └── ammo.js          # inventory + spend/refill rules (Sec. 11)
│   ├── turn/
│   │   ├── turnLoop.js      # Upkeep → Draw → Planning → Timeout → AI → Evidence report (Sec. 10)
│   │   └── timer.js         # countdown + timeout penalty ladder
│   ├── ai/
│   │   ├── probabilityMap.js # weighted belief grid over legal player cells (Sec. 16)
│   │   ├── evidence.js       # updates from scans/trails/decoys/jammers, kept behind legal-knowledge boundary
│   │   ├── difficulty.js     # tier behavior tables (Recruit → Challenger)
│   │   └── decide.js         # target/action selection from the probability map
│   ├── transparency/
│   │   ├── intelPanel.js     # AI Intel Panel data view (Sec. 17)
│   │   ├── reasonLog.js      # human-readable reason strings tied to real decision inputs
│   │   └── analyzeMode.js    # replay, AI-vision toggle, heatmap overlay
│   ├── route/
│   │   ├── routeMap.js       # region node graph, fog rules (Sec. 6)
│   │   └── nodes.js          # node types: Fight/Elite/Event/Repair/Supply/Boss
│   ├── encounters/
│   │   ├── hunt.js
│   │   ├── convoyRaid.js
│   │   └── silentDuel.js
│   ├── rewards.js           # post-battle single-choice reward (Sec. 13)
│   ├── events.js            # decision-encounter table (Sec. 14)
│   └── ui/
│       ├── battleScreen.js   # assembles Sec. 19 layout regions
│       ├── cardHand.js
│       ├── log.js
│       └── tutorial.js
└── assets/
    ├── ships/, terrain/, effects/  # placeholder sprites, swap later per Sec. 20
    └── audio/
```

This maps 1:1 to the spec's sheets, so any rule change in the doc has one obvious file to edit.

---

## 3. Core Data Model (sketch)

```js
// state.js
const battleState = {
  seed: 123456,               // Sec. 17 determinism
  turn: 1,
  cp: 3,
  timer: 75,
  board: { width: 20, height: 20, terrain: [] }, // terrain[y][x]
  playerFleet: [ /* {id, hp, maxHp, role, pos, actionsLeft} */ ],
  enemyFleet: [ /* same shape, plus contactState */ ],
  contacts: {},               // shipId -> 'unknown'|'suspected'|'contact'|'confirmed'|'lost'|'decoySuspected'
  ammo: { torpedo: 6, depthCharge: 4, sonar: 5, smoke: 3, mine: 2, fuel: 2 },
  deck: [], hand: [], discard: [],
  aiProbabilityMap: [], // 20x20 float grid, sums to 1 over legal cells
  reasonLog: [],
  eventLog: [],          // for Analyze Mode replay
};
```

Keep `eventLog` append-only and replay-driven — every board mutation should be expressible as `{type, payload, turn}` so Analyze Mode (Phase 5) can scrub through it later without special-casing.

---

## 4. Phased Build Plan

This follows the spec's own five phases (Section 22), with concrete HTML/JS tasks and a "pass condition" check before moving on — don't skip ahead even if a later phase looks more fun to build.

### Phase 1 — Deduction Prototype
**Goal:** prove the core deduction loop is legible before anything else exists.

- [ ] `grid.js`: 20x20 coordinate model (columns A–T, rows 1–20), cell lookup helpers
- [ ] `render.js`: canvas grid draw, click/tap → cell coordinate
- [ ] `terrain.js` + `generator.js`: place 3–5 island clusters; implement the Generator Acceptance Rules as an automated validator you can run on every generated map (reject unreachable ships, single-path chokepoints, >25% dead cells)
- [ ] Fog-of-war layer: draw fog over unconfirmed enemy cells
- [ ] Manual player ship placement/movement (no AI yet — script the enemy fleet's fixed position)
- [ ] Implement 2 cards only: **Narrow Sonar** (5-cell line, contact count) and **Torpedo Line** (line attack, stops at ship/island)
- [ ] Scripted (non-adaptive) hidden enemy fleet for testers to hunt

**Pass condition:** a tester can point at the board and explain, in one sentence, why they targeted a cell — before you write a single line of AI code.

### Phase 2 — Resource Pressure
- [ ] `ammo.js`: inventory + spend rules; cards check ammo before allowing targeting
- [ ] CP system: 3 starting, 6 cap, card costs deducted, refilled at Draw step
- [ ] `timer.js`: 75-second countdown, visible in top-center UI region, warning states at 15/5 sec (audio hook for later)
- [ ] Basic flagship hull damage and defeat-at-zero check
- [ ] `turnLoop.js`: implement the six-step turn flow (Upkeep → Draw → Planning → Timeout check → Enemy resolve → Evidence report) as an explicit state machine, not implicit code order — this pays off hugely once AI and Analyze Mode need to hook into specific steps

**Pass condition:** playtesters use a scan before an expensive attack, and don't time out from confusion about what's clickable.

### Phase 3 — Fair AI
This is the highest-risk phase in the whole spec (Sec. 24 flags "AI appears to cheat" as Critical severity) — build the legal/illegal data boundary as actual code architecture, not a convention you have to remember.

- [ ] **Enforce the boundary structurally**: give the AI module a read-only view object that physically does not contain hidden player data — e.g. `ai/decide.js` only ever receives `evidenceState`, never `battleState.playerFleet` directly. This makes "AI cheats" a type error, not a discipline problem.
- [ ] `probabilityMap.js`: 20x20 float grid; seed with terrain legality (zero out cells no ship could occupy)
- [ ] `evidence.js`: update the map from scan results, wake trails, decoys, jammers — each as a small, testable pure function `(map, evidenceEvent) => newMap`
- [ ] `decide.js`: AI picks target from top-weighted legal cells, per difficulty tier
- [ ] `difficulty.js`: implement Recruit and Hunter tiers first (broad scanning / basic contact-following); leave Tactical–Challenger as stubs until later
- [ ] Implement **Decoy Buoy** and **Thermal Wake** cards so testers can manipulate the map you just built
- [ ] `intelPanel.js` + `reasonLog.js`: every AI action pushes a reason string generated from the *actual* evidence input used, not a canned line

**Pass condition:** a player can deliberately fool the AI with a decoy and then explain, correctly, why it worked.

### Phase 4 — Roguelite Layer
- [ ] `routeMap.js`: single-region node graph, fog rules for elite/boss gates
- [ ] `nodes.js`: Fight, Event, Repair, Supply node types with their preview/hidden data split
- [ ] Implement all 3 required standard encounters: Hunt, Convoy Raid, Silent Duel
- [ ] `rewards.js`: single reward choice screen after each node (card/module/repair/ammo/removal)
- [ ] Deck/hull/ammo persist across nodes within a run (in-memory is fine; `localStorage` if you want mid-run save/resume)
- [ ] One boss: Mirage Carrier, with its false-contact behavior as a special AI evidence injector

**Pass condition:** testers can articulate a build direction and choose their next node based on current ammo/hull/deck state.

### Phase 5 — Analyze Mode
- [ ] `rng.js`: seeded PRNG driving all non-player randomness; store and display the seed
- [ ] Make sure every mutation from Phase 1–4 already went through the append-only `eventLog` (this is why the data model in Section 3 matters early)
- [ ] `analyzeMode.js`: scrub through `eventLog` turn by turn, toggle "actual player positions" vs "AI-legal evidence only," render `aiProbabilityMap` history as a heatmap
- [ ] Tap-to-inspect: clicking a logged AI action shows the ranked legal targets it considered

**Pass condition:** a suspicious AI hit can be inspected and explained purely from visible evidence, by someone other than you.

---

## 5. Rendering Notes

- Draw the board once per turn (or on relevant events), not on a game loop — this is a turn-based tactics game, not real-time, so you don't need `requestAnimationFrame` churn. Redraw on: card play, target selection, turn resolve, timer tick (just the timer text/ring, not the whole board).
- Layer the canvas conceptually even if it's one `<canvas>`: terrain → fog → contacts/markers → effects (sonar rings, wakes) → selection/preview overlay. Composing draw order this way avoids z-order bugs when contacts change state mid-turn.
- Contact-state colors map directly from Section 9's table (dashed orange = suspected, yellow = contact, red = confirmed, grey = lost, purple = decoy-suspected) — encode this as one lookup table so the whole game stays visually consistent without per-feature color decisions.

## 6. UI Layout (Section 19 → concrete regions)

Use CSS grid for the outer shell, canvas only for the board:

```css
.battle-screen {
  display: grid;
  grid-template-columns: 220px 1fr 260px;
  grid-template-rows: 60px 1fr 160px;
  grid-template-areas:
    "topleft topcenter topright"
    "log board intel"
    "log hand hand";
}
```
Map each named area to the Section 19 table (hull/ammo, timer/CP/objective, Intel Panel, tappable log, hand). This keeps the layout self-documenting against the spec.

## 7. Suggested Order of Operations (first 2 weeks)

| Week | Focus |
|---|---|
| 1, days 1–2 | Project scaffold, grid model, canvas render, click-to-select |
| 1, days 3–5 | Terrain + generator + acceptance-rule validator; get a map that passes validation reliably |
| 2, days 1–2 | Narrow Sonar + Torpedo Line cards, ammo gating, CP costs |
| 2, days 3–4 | Turn loop state machine, timer, hull/defeat check |
| 2, day 5 | First internal playtest against Phase 1's pass condition — do not proceed to AI until this passes |

## 8. Risks to Watch While Building (from Section 24)

- Don't let the AI module reach into player state "just for a quick test" — that shortcut is exactly how the Critical "AI appears to cheat" risk happens later, and it's much harder to retrofit the boundary than to build it in from Phase 3 day one.
- Keep the event log append-only from Phase 1 onward even though Analyze Mode isn't built until Phase 5 — bolting logging on after the fact means rewriting every mutation site.
- Validate generated maps automatically (Section 7's Generator Acceptance Rules) rather than eyeballing them — a 20x20 board is large enough that dead space or unreachable ships slip past manual review.

---

**Not doing yet, per the MVP Build Sheet:** multiplayer, accounts/cloud saves, more than one region, voice/cutscenes, full physics, meta-progression economy, additional doctrines. Resist scope creep into these until the Section 25 Final Greenlight checklist passes.
