# Blackwater Command — Final Prototype Specification

**Working title:** Blackwater Command  
**Version:** Final Prototype v1.0  
**Platform:** Android, offline single-player  
**Orientation:** Landscape  
**Genre:** Naval hidden-information roguelite / tactical deckbuilder  
**Commercial model:** Premium offline game; no ads, energy, gacha, account, or server required

---

# 1. Prototype Goal

Build a playable vertical slice proving this core question:

> Can a player use evidence, terrain, limited resources, and cards to locate an enemy fleet more intelligently than random guessing?

The prototype succeeds only when players:

1. Make explainable deductions before attacking.
2. Understand why the AI chose its attacks.
3. Feel that an early discovery of their flagship is dangerous but recoverable.
4. Want another run after defeat.

**Concept rating:** 7/10. It becomes an 8/10 only if the evidence loop is clear, the AI is visibly fair, and the 20x20 board does not become dead search space.

---

# 2. One-Screen Pitch

Command a hidden naval task force across island-filled waters. Build a deck of sensors, weapons, deception, aircraft, and coastal-operation cards while fighting enemy fleets that infer your location without cheating. Choose a route through escalating encounters, conserve limited ammunition, outplay evidence-driven AI admirals, and sink the enemy flagship before yours is destroyed.

---

# 3. Core Product Rules

| Rule | Final decision |
|---|---|
| Platform | Android, offline single-player |
| Grid | 20 columns x 20 rows |
| Board visibility | Enemy ships hidden by fog-of-war until evidence reveals them |
| Player fleet | 1 flagship + 2 support ships |
| Enemy fleet | 1 flagship + 2 support ships in standard battles; 3 supports allowed for elites/bosses |
| Victory | Sink the enemy flagship |
| Defeat | Player flagship hull reaches zero |
| Support ships | Optional targets; losing one is a setback, not immediate defeat |
| Starting deck | 10 cards |
| Deck limit | 28 cards maximum |
| Standard timer | 75 seconds per player turn in the prototype |
| Boss timer | 60 seconds per player turn |
| Challenger timer | 45–50 seconds per player turn |
| AI rule | AI may not read hidden player data; it acts from observed evidence and a probability map |
| Route visibility | Full regional route visible; exact encounter modifiers remain hidden |

---

# 4. Player Experience

## Intended Feelings

| Desired feeling | System that creates it |
|---|---|
| “I predicted their route.” | Terrain, wake trails, scan evidence, probability reasoning |
| “I made them waste a valuable attack.” | Decoys, jammers, silent movement, false contacts |
| “I need to conserve this ammunition.” | Limited torpedoes, depth charges, aircraft fuel, reload rewards |
| “That loss was my mistake, not cheating.” | AI reason log, AI intel panel, post-battle Analyze Mode |
| “One more run.” | Build variety, route choices, recoverable setbacks, short encounters |

## Non-Goals

Do not make:

- A naval realism simulator.
- A real-time action game.
- A random-tap Battleship clone.
- A large fleet-management spreadsheet.
- A multiplayer game in the first release.
- A live-service economy.

---

# 5. Run Loop

```text
Choose Doctrine + Starter Deck
        ↓
View Region Route Map
        ↓
Choose Reachable Node
        ↓
Battle / Event / Repair / Supply
        ↓
Receive One Meaningful Reward Choice
        ↓
Update Deck + Modules + Hull + Ammunition
        ↓
Choose Next Reachable Node
        ↓
Regional Boss (special rule + shorter timer)
        ↓
Next Region or Run Victory
```

## Run Structure

| Region | Normal nodes before boss | Purpose |
|---|---:|---|
| Region 1 | 3–4 | Teach scouting, ammunition, terrain, basic deception |
| Region 2 | 4–5 | Test build identity, stronger enemy inference, mixed objectives |
| Region 3 | 5–6 | Test resource conservation, boss preparation, recovery skill |

Target full-run duration: **25–40 minutes**.

---

# 6. Route Map Sheet

## Route Visibility Rules

- Show the full region map from the start.
- Show node category and broad encounter archetype.
- Hide exact fleet composition, ship locations, enemy card loadout, weather, and special encounter modifiers until entry.
- Lock selected paths; no backtracking unless a rare card explicitly enables it.
- Fog elite nodes until the player completes two normal encounters.
- Fog the boss gate until the player completes one elite or three normal encounters.

## Node Types

| Icon placeholder | Node | Player sees before entering | Hidden until entry | Typical reward |
|---|---|---|---|---|
| Fight | Standard battle | Broad enemy archetype, risk level | Exact ships, map modifier, card set | Card / ammo / small repair |
| Elite | High-risk battle | Broad archetype, high risk | Exact elite rule and composition | Module + rare card |
| Event | Decision encounter | Event category only | Consequences or specific risk | Variable |
| Repair | Dock / safe harbor | Repair availability | Optional trade-off | Hull repair / card remove |
| Supply | Depot / market | Supply node | Exact offers | Ammo / card upgrade / module option |
| Boss | Regional admiral | Boss identity and public signature | Exact phase behavior | Region progress |

## Example Node Previews

| Preview | What it tells the player | What it does not reveal |
|---|---|---|
| Submarine Ambush — Medium | Expect deep-water concealment and depth-charge value | Number and position of submarines; weather; enemy deck |
| Carrier Patrol — High | Expect aircraft reconnaissance and broad pressure | Flight patterns, anti-air assets, boss modifiers |
| Convoy Raid — Medium | Moving transports and exit timing are likely | Escape route, escort count, mine placement |
| Silent Duel — High | Both fleets have reduced sensor access | Exact sensor penalty, unit positions, AI behavior bias |

---

# 7. Board and Terrain Sheet

## Board

| Component | Specification |
|---|---|
| Size | 20x20, 400 cells |
| Coordinates | Columns A–T; rows 1–20 |
| View | Full-board landscape tactical view |
| Seed | Visible deterministic battle seed |
| Fog | Hides enemy ship positions and hidden hazards |
| Public data | Terrain, confirmed hits/misses, revealed contacts, visible effects |

## Terrain

| Terrain | Movement | Sensors | Weapons | Purpose |
|---|---|---|---|---|
| Open water | Normal | Normal | Normal | Baseline tactical space |
| Island land | Blocks ships | Blocks line-based scans | Blocks torpedo travel and line attacks | Creates routes and cover |
| Shallow water | Surface ships only | Normal | Normal | Limits submarine hiding |
| Deep water | All ships | Submarines gain concealment | Depth-charge bonus zone | Enables stealth and ambush |
| Reef | Small ships only; costs extra movement | Partial | Blocks some lines | Doctrine-specific lanes |
| Radar island | Adjacent/captured interaction | Produces local scan | Can be sabotaged/destroyed | Objective control |
| Supply island | Dock interaction | None | None | Ammunition/recovery incentive |

## Generator Acceptance Rules

Reject generated maps where:

- Any ship can remain permanently inaccessible.
- One faction begins in an unavoidable choke point.
- Terrain creates only one viable attack path.
- More than 25% of cells are strategically irrelevant.
- A hidden ship cannot be legally discovered by scan, aircraft, movement evidence, or indirect attack.

---

# 8. Fleet Sheet

## Player Fleet

| Ship | HP | Role | Action access | Evidence profile | Loss effect |
|---|---:|---|---|---|---|
| Flagship: Destroyer Command | 20 | Main command vessel | Any eligible card; one primary action each turn | Strong wake and sonar signature | Run ends at 0 HP |
| Support: Patrol Boat | 8 | Forward observer | Scout, movement, deception cards | Moderate signature | Lost for rest of run unless restored by rare repair |
| Support: Minelayer | 10 | Route control | Mine, denial, support cards | Moderate signature | Lost for rest of run unless restored by rare repair |

## Enemy Fleet

| Ship | HP range | Role | Effect when destroyed |
|---|---:|---|---|
| Enemy flagship | 25–30 | Win-condition target | Player wins encounter |
| Scout support | 8–10 | Scans and tracks | Enemy loses a scouting action/tool |
| Strike support | 8–12 | Torpedoes, artillery, aircraft | Enemy loses a damage option |
| Specialist support | 10–12 | Submarine, carrier, jammer, minelayer | Removes encounter-specific pressure |

## Fleet Rules

- Every ship has independent HP.
- All ships start hidden unless an encounter says otherwise.
- Flagships act every turn.
- Player support ships have one action per battle by default.
- A card, module, or event may reactivate a support ship.
- Enemy supports use limited, readable actions; destroy them to reduce enemy action economy.
- Do not add more than two player support ships in the prototype.

---

# 9. Discovery and Visibility Sheet

## Discovery Rules

A hidden ship can be discovered by:

1. A direct hit.
2. A successful scan or aircraft patrol.
3. Moving through a currently scanned zone.
4. A visible attack whose origin can be traced.
5. A revealed wake trail combined with legal route inference.
6. A card effect that specifically exposes location or type.

## Contact States

| State | Player/AI knowledge | UI marker |
|---|---|---|
| Unknown | No useful evidence | Fog only |
| Suspected zone | Probability evidence without exact position | Soft dashed/orange region |
| Contact | Unit exists in a scanned region, exact cell uncertain | Yellow contact marker |
| Confirmed | Exact unit/cell is known currently | Red target marker |
| Lost contact | Previously known, location may have changed | Grey trail marker |
| Decoy suspected | Evidence may be false | Purple interference marker |

## Re-Hiding

A confirmed ship may become non-confirmed when it:

- Moves outside current sensor coverage.
- Moves to a non-adjacent zone.
- Uses Go Silent, smoke, jammer, or deep-water concealment.

The last known position remains public as a lost-contact clue.

---

# 10. Energy, Timer, and Turn Sheet

## Command Points

| Rule | Value |
|---|---:|
| Starting CP per player turn | 3 |
| Maximum stored CP | 6 |
| Typical card cost | 1–3 CP |
| Primary flagship action | One primary action each turn |
| Support action | One action per battle by default |

## Timer Rules

| Context | Timer | Purpose |
|---|---:|---|
| First three tutorial encounters | Disabled or 120 seconds | Teach systems safely |
| Standard prototype encounter | 75 seconds | Add momentum without panic |
| Boss encounter | 60 seconds | Increase pressure after mastery |
| Challenger encounter | 45–50 seconds | High-skill test |

## Turn Flow

1. **Upkeep:** effects, fires, mines, radar, and statuses resolve.
2. **Draw:** draw 2 cards; gain CP.
3. **Player planning:** inspect evidence, use cards, move eligible units, target effects.
4. **Timeout check:** unresolved target selections cancel; turn ends.
5. **Enemy planning and resolve:** AI acts from its legal intelligence state.
6. **Evidence report:** public outcomes update board, battle log, and AI Intel Panel.

## Timeout Penalties

| Timeout count | Effect |
|---|---|
| First | Turn ends; no extra punishment |
| Second consecutive | Discard one random card |
| Third consecutive | Next turn begins with -1 CP |
| Challenge-only fourth | Command Breakdown defeat option |

No immediate defeat from one interruption or one slow turn.

---

# 11. Ammunition Sheet

## Destroyer Command Inventory

| Resource | Starting amount | Primary use | Scarcity intent |
|---|---:|---|---|
| Standard torpedo | 6 | Accurate line strike | Main finisher; cannot waste freely |
| Depth charge | 4 | 3x3 attack; submarine counter | Area pressure and anti-stealth |
| Sonar charge | 5 | Scans and confirmation | Enables deduction; limited but used often |
| Smoke charge | 3 | Concealment / break targeting | Defensive recovery tool |
| Mine | 2 | Delayed route punishment | Prediction reward |
| Aircraft fuel | 2 | Patrol/recon | Terrain bypass and anti-stalemate tool |

## Ammo Rules

- Weapon cards cannot be played without their matching ammunition.
- Ammunition does not automatically fully refill between encounters.
- Refill sources: supply nodes, salvage, specific card effects, modules, and event choices.
- Ammo rewards must compete against cards, repairs, and modules.
- High damage without sufficient intelligence should be a losing long-term strategy.

---

# 12. Card Sheet

## Deck Rules

| Rule | Value |
|---|---:|
| Starting deck | 10 cards |
| Starting hand | 5 cards |
| Draw per turn | 2 cards |
| Hand limit | 8 cards |
| Deck cap | 28 cards |
| Duplicate cards | Allowed, constrained by ammo, cost, rarity, and doctrine |
| Card removal | Available at repair/supply/event nodes |

## Card Families

| Family | Game purpose |
|---|---|
| Intelligence | Convert fog into reliable or partial evidence |
| Direct fire | Capitalize on evidence with limited ammunition |
| Mobility | Change route, exposure, and threat geometry |
| Deception | Manipulate AI probability and player visibility |
| Air operations | Extend reach and defeat terrain stalemates |
| Land operations | Make islands strategically valuable |
| Sustain | Preserve hull, ammunition, card quality, or future options |

## Prototype Card Pool

| # | Card | Family | CP | Ammo | Effect |
|---:|---|---|---:|---:|---|
| 1 | Narrow Sonar | Intelligence | 1 | 1 sonar | Test a selected 5-cell line; returns enemy contact count, not exact location |
| 2 | Sector Sweep | Intelligence | 2 | 1 sonar | Reveal contact status in a 4x4 sector |
| 3 | Thermal Wake | Intelligence | 1 | 0 | Reveal whether a ship moved through a selected route last turn |
| 4 | Torpedo Line | Direct fire | 2 | 1 torpedo | Fire through up to 6 water cells; stops at first ship or island |
| 5 | Depth Pattern | Direct fire | 2 | 1 depth charge | Attack 3x3 water area; bonus damage to submarines |
| 6 | Precision Salvo | Direct fire | 3 | 2 torpedoes | Attack two selected cells in the same row/column after a confirmed contact |
| 7 | Flank Speed | Mobility | 1 | 0 | Move a surface unit two extra cells |
| 8 | Go Silent | Mobility | 1 | 1 smoke | Remove current confirmation after valid repositioning |
| 9 | Decoy Buoy | Deception | 1 | 0 | Add a false high-probability contact to AI intelligence |
| 10 | Radar Jammer | Deception | 2 | 1 smoke | Reduce enemy scan reliability in selected sector for one turn |
| 11 | Patrol Plane | Air operations | 2 | 1 fuel | Reveal a 5x5 zone until the next enemy turn |
| 12 | Coastal Radar | Land operations | 1 | 0 | At a controlled radar island, reveal an enemy trail or direction clue |

## Card Design Constraint

Every card must materially affect at least one of:

- Information.
- Terrain/geography.
- Movement.
- Timing/CP.
- Ammunition/resource conversion.
- Deception.

Avoid generic cards that only increase damage.

---

# 13. Upgrade and Reward Sheet

## After-Battle Choice

Offer one reward choice after each completed encounter. Do not shower the player with all reward types simultaneously.

| Reward type | Example | Purpose |
|---|---|---|
| Add card | Choose 1 of 3 cards | Build identity |
| Upgrade card | Improve scan radius or lower CP cost | Refine core loop |
| Install module | Permanent-for-run passive | Define strategy |
| Repair | Restore 3–6 flagship HP | Survival choice |
| Replenish ammo | Restore one scarce ammo category | Resource recovery |
| Remove card | Delete a weak/starting card | Deck consistency |
| Route bargain | Gain reward, accept later risk | Push-your-luck decision |

## Prototype Modules

| Module | Effect | Build direction |
|---|---|---|
| Acoustic Array | First sonar each battle costs 0 CP | Intelligence |
| Torpedo Loader | First two torpedoes each battle deal +1 damage | Precision strike |
| Decoy Network | First decoy creates two suspected contacts | Deception |
| Flight Deck Rig | Patrol Plane reveals one additional row and column | Air control |
| Salvage Crane | First enemy ship sunk each battle restores one common ammo | Sustain |
| Emergency Rudder | First time flagship is confirmed, gain one free movement | Recovery |
| Signal Interpreter | Revealed wake trails last one extra turn | Tracking |
| Mine Computer | Mines display predicted probability coverage before placement | Area denial |

---

# 14. Event Sheet

Every event must change deck, ammunition, hull, intelligence, route, timer, or future risk. Flavor-only events are not allowed.

| Event | Choice A | Choice B | Choice C |
|---|---|---|---|
| Distress Signal | Investigate: gain ammo, chance of ambush | Ignore: no reward, no risk | Remote scan: gain next-node intel only |
| Derelict Vessel | Board: gain card, risk hull damage | Salvage: gain ammo only | Leave: safe |
| Encrypted Intel | Accept: gain powerful intel card, possible corrupted card | Decrypt: reveal next-node broad modifier | Reject: safe |
| Storm Front | Push through: lose one ammo, skip a node | Wait: lose route flexibility, gain CP bonus next battle | Detour: encounter elite early |
| Smuggler Dock | Remove card at hull cost | Trade ammo for module fragment | Leave |
| Lost Patrol | Rescue: gain support-ship repair chance | Search: gain map clue, risk time penalty | Abandon: gain no reward |

---

# 15. Encounter Sheet

## Standard Encounters

| Encounter | Player objective | Primary test | Prototype status |
|---|---|---|---|
| Hunt | Sink enemy flagship | Basic deduction and precision | Required |
| Convoy Raid | Destroy moving transport before it exits | Route prediction and timing | Required |
| Silent Duel | Defeat enemy with reduced sensor access | Deception and probability | Required |
| Island Capture | Control radar/supply island | Terrain and land card value | Post-prototype |
| Minefield Escape | Reach an extraction zone | Careful movement and scouting | Post-prototype |
| Weather Front | Adapt to changing scan/air rules | Flexible build use | Post-prototype |

## Boss Encounters

| Boss | Public signature | Hidden pressure | Counterplay | Timer |
|---|---|---|---|---:|
| Mirage Carrier | False contacts and aircraft icon | Exact false-contact placement and patrol pattern | Cross-check via sonar/trails; use jammers | 60 sec |
| Deep Choir | Submarine warning | Exact number/routes of submarines | Sonar nets, depth patterns, predictive mines | 60 sec |
| Iron Atoll | Fortified island icon | Coastal artillery layout | Capture/sabotage island assets | 60 sec |
| Cartographer | Map-corruption icon | Specific misinformation rule | Redundant intelligence and route discipline | 60 sec |

## Boss Design Rule

Bosses challenge a tactical assumption. They may not simply:

- Receive illegal information.
- Start with arbitrary player damage.
- Halve player timer without warning.
- Use invisible unavoidable attacks.

Boss timer pressure must be paired with clear mechanical counterplay.

---

# 16. Fair AI Sheet

## Legal AI Knowledge

The AI may use only:

- Public terrain.
- Its own units, cards, ammunition, and prior actions.
- Its own successful scans/air patrols.
- Public hits, misses, visible attacks, trails, and destroyed assets.
- Player cards/actions only when publicly revealed.
- Decoys/jammers only as observed evidence, not as truth labels.

## Prohibited AI Knowledge

The AI may never access:

- Hidden player coordinates.
- Hidden mines/decoys before detection.
- Unrevealed player hand or deck order.
- Future RNG results.
- Unrevealed player movement.

## AI Probability Model

The AI stores a weighted probability map over legal player locations.

Inputs:

| Evidence source | Example effect on AI belief |
|---|---|
| Last confirmed contact | Increases probability around legal next positions |
| Terrain | Favors deep water for submarines; avoids impossible cells |
| Wake trail | Narrows probable movement routes |
| Attack origin clue | Constrains possible source positions |
| Scan result | Removes or boosts locations based on legal result |
| Decoy | Creates false high-probability area |
| Jammer | Reduces confidence and forces broader guesses |
| Repeated player behavior | Gradually weights habitual routes, never confirms them |

## Difficulty Tiers

| Tier | Behavior |
|---|---|
| Recruit | Broad scanning, wasteful fire, weak clue interpretation |
| Hunter | Uses confirmed contacts and basic line probability |
| Tactical | Understands terrain and wake trails |
| Veteran | Tracks player deck clues and counters repeated behavior |
| Commander | Coordinates scans, air operations, and resource conservation |
| Challenger | Best legal inference model; no cheat vision; fixed seed |

## Fallibility Requirement

AI errors must be real results of its probability model, not staged fake misses.

Target:

- Standard difficulties: 15–25% of meaningful AI guesses are clearly wrong.
- Challenger: fewer mistakes, but still capable of wrong inferences.
- A decoy should be able to produce a visible, explainable AI error.

---

# 17. AI Transparency Sheet

## Required Feature: AI Intel Panel

Visible during battle.

| Field | Example |
|---|---|
| Confirmed player contacts | 0 |
| Suspected player zones | 3 |
| Active movement trails | 1 |
| Suspected decoys | 1 |
| Lost contacts | 2 |
| Current AI confidence | Medium |

Purpose: the player can deliberately manipulate what the AI thinks it knows.

## Required Feature: AI Reason Log

Every AI action has a truthful reason attached to the actual decision input.

Examples:

- “Scanned F8: unexplained wake trail; medium confidence.”
- “Fired at D12: last confirmed contact remained in this legal lane.”
- “Avoided M5: no legal route supports this location.”
- “Investigated J9: contact conflicts with previous scan results.”

## Required Feature: Analyze Mode

Available after every battle.

| Function | Requirement |
|---|---|
| Replay | Turn-by-turn timeline with pause, step, and speed controls |
| Player reveal | Toggle actual player ship positions |
| AI vision | Toggle only evidence legally visible to AI at each moment |
| Heatmap | Display AI probability map over the board |
| Action inspection | Tap AI action to show ranked legal targets and evidence |
| Event timeline | Show contact, trail, decoy, scan, hit, miss, and confidence changes |
| Seed | Display battle seed and deterministic replay data |

## Required Feature: Deterministic Battle Seeds

The visible seed determines:

- Terrain generation.
- Enemy draw order.
- AI tie-break choices.
- Non-player randomness.
- Reward offers, where applicable.

Same seed + same actions = same legal outcomes and AI decisions.

## Required Tutorial: Fairness Lesson

Teach the player to:

1. Create a Decoy Buoy.
2. See the AI Intel Panel update.
3. Observe the AI legally investigate the decoy.
4. Inspect the event in Analyze Mode.

This is stronger than claiming “the AI does not cheat.”

---

# 18. Challenger Mode Sheet

## Purpose

A repeatable, high-skill mode for players who understand the game systems.

## Rules

| Rule | Challenger implementation |
|---|---|
| AI vision | Same legal fog rules as player |
| AI inference | Highest probability-model quality |
| Battle seed | Fixed and displayed |
| Timer | 45–50 seconds |
| Rewards | Limited or score-based |
| Transparency | Analyze Mode always enabled |
| Goal | Win efficiently, with limited hull/ammo loss |

## Anti-Frustration Rule

Challenger Mode is allowed to be brutally hard. It is not allowed to be opaque. Every threatening AI action must remain inspectable.

---

# 19. UI Sheet

## Main Battle Screen

| Area | Required content |
|---|---|
| Center | 20x20 grid, fog, islands, contacts, effects |
| Top-left | Player flagship hull, support hull icons, ammo summary |
| Top-center | Turn timer, CP, battle objective |
| Top-right | AI Intel Panel, enemy visible assets, pause |
| Bottom | Player hand, card costs, ammo requirements |
| Side/log | Tappable battle log; AI reasons; event history |

## Interaction Rules

- Tap card, then tap valid target cells.
- Preview range/pattern before confirmation.
- Invalid cells show clear reason: blocked by island, insufficient ammo, outside range, no valid path.
- Long-press card shows full rule text, targeting pattern, CP cost, ammo use, and examples.
- Tappable log entries highlight relevant cells.
- Provide animation-speed control and skip enemy-animation setting.

---

# 20. Art and Audio Sheet

## Art Direction

| Element | Direction |
|---|---|
| Visual style | Stylized 2D tactical command map |
| Ships | Strong silhouettes and readable class markers |
| Terrain | High-contrast islands, water depth, reefs, fog |
| Effects | Sonar rings, wakes, smoke, aircraft paths, explosions |
| UI | Functional, military-map inspired, not photorealistic |
| Asset priority | Readability > animation polish > realism |

“Meh” graphics are acceptable only if the map state is readable at a glance. Cheap-looking ambiguity is not acceptable.

## Audio Priorities

- Distinct sonar ping for scan result type.
- Separate audio for hit, miss, decoy, and false-contact resolution.
- Timer warning at 15 and 5 seconds.
- Minimal music; prioritize information-carrying sound.

---

# 21. MVP Build Sheet

## Required MVP Content

| Component | MVP target |
|---|---|
| Platform | Android offline build |
| Board | 20x20 generator, 3–5 island clusters |
| Player doctrine | Destroyer Command only |
| Player fleet | Flagship + Patrol Boat + Minelayer |
| Enemy fleet | Flagship + 2 supports |
| Cards | 12 cards from prototype card pool |
| Modules | 8 modules |
| Terrain | Open water, islands, shallow, deep, radar island |
| Encounters | Hunt, Convoy Raid, Silent Duel |
| Boss | Mirage Carrier |
| Route map | One region, branching visible map, hidden modifiers |
| Timer | 75 sec standard; 60 sec boss |
| AI | Probability map, no hidden-data access |
| Transparency | Intel Panel, Reason Log, Analyze Mode, seed display |
| Tutorials | Basic deduction + decoy/fair-AI lesson |

## Not in MVP

- Multiplayer.
- Asynchronous play.
- Leaderboards.
- Accounts/cloud saves.
- More doctrines.
- Daily challenges.
- More than one region/biome.
- Story cutscenes or voice acting.
- Full naval physics.
- Deep meta-progression economy.

---

# 22. Build Sequence Sheet

## Phase 1 — Deduction Prototype

Build:

- 20x20 grid.
- Islands and fog-of-war.
- Manual player placement/movement.
- Narrow Sonar and Torpedo Line.
- Scripted hidden enemy.

**Pass condition:** testers can explain why they chose a target before firing.

## Phase 2 — Resource Pressure

Build:

- Command points.
- Limited ammunition.
- 75-second timer.
- Basic player hull damage.

**Pass condition:** players use scans before expensive attacks and do not regularly time out from UI confusion.

## Phase 3 — Fair AI

Build:

- Legal-information boundary.
- Probability map.
- AI target selection.
- Decoy Buoy and wake-trail evidence.
- AI Intel Panel and action reasons.

**Pass condition:** a player can deliberately fool the AI with a decoy and understand why it worked.

## Phase 4 — Roguelite Layer

Build:

- Route map.
- Three encounter archetypes.
- Rewards, modules, and deck changes.
- One boss.

**Pass condition:** testers identify a build direction and choose routes based on current ammunition/hull/deck state.

## Phase 5 — Analyze Mode

Build:

- Deterministic seed system.
- Event logging.
- Turn replay.
- AI vision / heatmap overlay.

**Pass condition:** a suspicious AI hit can be inspected and explained through visible evidence.

---

# 23. Playtest Sheet

## Questions to Ask Testers

1. Why did you target that cell/area?
2. Did you feel forced into random attacks? When?
3. Did you understand why the AI chose its last action?
4. Did the timer feel exciting, stressful, or irrelevant?
5. Did you understand how to use a decoy?
6. If you lost, did the game feel unfair? Why?
7. Would you start another run immediately?

## Metrics

| Metric | Target / diagnostic |
|---|---|
| Mean standard battle duration | 4–7 minutes |
| Mean boss battle duration | 6–10 minutes |
| Blind attacks per battle | Decrease as player learns; high rate indicates weak evidence tools |
| Scan-before-attack rate | Should rise after tutorial |
| Turn timeout rate | Low after tutorial; high rate means timer/UI is wrong |
| Ammo remaining on victory | Some remaining, not full and not always zero |
| Decoy use rate | Must be understandable and tactically valuable |
| Decoy success rate | Must occasionally cause real AI mistakes |
| AI-cheating accusations | Investigate via replay logs; fix observability before balance |
| Analyze Mode use | Indicates trust/curiosity value |
| Second-run rate | Core “one more run” signal |

---

# 24. Risk Sheet

| Risk | Severity | Mitigation |
|---|---:|---|
| 20x20 board creates tedious empty searching | Critical | Sector objectives, scans, movement trails, air support, map rejection rules |
| AI appears to cheat | Critical | Strict data boundary, AI Intel Panel, reason log, replay, probability heatmap, deterministic seeds |
| Flagship discovered early feels unwinnable | High | Smoke, decoys, repositioning, support-ship sacrifice, recoverable hull pressure |
| Too many ships overload mobile UI | High | One flagship + two supports only; compact fleet HUD |
| Timer creates panic rather than strategy | High | Start at 75–120 sec; clear targeting preview; tune from telemetry |
| Cards turn the game into generic damage deckbuilder | High | Card design constraint: information/terrain/movement/timing/deception/resource focus |
| Air/land mechanics grow scope | High | One air card and one land card in MVP |
| Premium mobile discovery is hard | High | Ship a polished demo; make Analyze Mode and tactical replay shareable later; do not assume quality alone creates discovery |

---

# 25. Final Greenlight Test

Do not expand to more content until all statements are true:

- A player can win through deductions rather than mostly blind attacks.
- A player can intentionally mislead the AI.
- A player can inspect why the AI attacked and accept that it had legal evidence.
- Losing a support ship hurts but does not automatically end a run.
- An early flagship reveal is dangerous but can be escaped through skillful play.
- Route choice changes player strategy based on current hull, ammunition, cards, and modules.
- The standard battle fits a mobile session without feeling rushed.

If any statement fails, **do not add more ships, cards, art, maps, or bosses. Fix the core loop first.**
