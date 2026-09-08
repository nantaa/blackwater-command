# Battleship Roguelike — Offline Design Specification

> Working title: **Blackwater Command**
>
> Status: Pre-production concept
>
> Platform: Android first, offline single-player
>
> Genre: Fast tactical hidden-information roguelite / deckbuilder

## Design Verdict

**Current concept rating: 7/10.**

The concept has a credible core: traditional Battleship gives immediate readability; deckbuilding gives build variety; islands, air units, limited ammunition, and partial-information AI create decisions beyond randomly guessing coordinates.

The weak assumption is that a larger board automatically makes the game better. **It does not.** A 20x20 board has 400 cells, four times the search area of standard 10x10 Battleship. Without aggressive scouting tools, substantial target patterns, and short battle objectives, it will become tedious rather than tactical. The design below treats the 20x20 board as a tactical space, not a larger guessing puzzle.

## Product Pillars

1. **Information is ammunition.** Scouting, deception, and deduction must be as valuable as direct damage.
2. **Fast but not twitchy.** Pressure comes from a per-turn timer and limited command points, not real-time aiming.
3. **Every attack should express a build.** The player wins through card combinations, vehicle loadout, map use, and probability management.
4. **The AI never has cheat vision.** It makes informed guesses from visible events and a hidden probability model.
5. **Offline by default.** No login, energy system, server dependency, gacha, or live-service requirement.

## Player Fantasy

You are a naval task-force commander fighting through hostile waters. You do not know where the enemy fleet is. You infer intent from partial sensor contacts, terrain, ammunition expenditure, enemy behavior, and your own mistakes.

The feeling should be:

- “I predicted that ambush.”
- “I wasted my torpedoes; now I need a clever recovery.”
- “That chain reaction was my build working, not luck carrying me.”
- “The enemy outplayed my pattern, but it did not cheat.”

## Game Structure

### A Run

- Target duration: 25–40 minutes.
- Structure: 3 regions, each containing 4–6 encounters and one boss encounter.
- A run ends when the player's flagship is destroyed, the final boss is defeated, or a special extraction condition is met.
- Between encounters, choose cards, modules, repairs, ammunition, routes, or temporary modifiers.

### A Battle

- Grid: 20x20.
- Expected duration: 3–7 minutes.
- Player and AI have hidden units, public damage history, limited ammunition, cards, command points, and a per-turn timer.
- Objective varies by encounter: destroy flagship, survive a fixed number of turns, capture an island installation, escort a convoy, or extract.

## Board Design

### Grid

- Size: 20 columns x 20 rows.
- Coordinate labeling: A–T and 1–20.
- Use zoom/pan only if required. Prefer a full-board landscape layout on phones and a high-contrast tactical display.
- Visual clarity matters more than realism. This can succeed with minimalist silhouettes, fog, markers, and readable effects.

### Islands

Each map seed creates a fixed island layout. A fixed seed means player and AI play under identical terrain rules; terrain is not secretly generated to help either side.

Recommended island count: 3–5 clusters per map.

Island effects:

| Terrain object | Rule | Tactical purpose |
|---|---|---|
| Island land | Blocks ship movement, direct torpedo travel, and line-of-sight attacks | Creates lanes, ambush routes, and safe sides |
| Shallow water | Surface ships move normally; submarines cannot enter | Restricts submarine hiding |
| Deep water | All naval units can enter; submarines gain concealment bonus | Creates high-risk hidden zones |
| Reef | Passable only by small ships; movement costs extra | Enables unit-specific flanking |
| Radar island | Can be captured or destroyed; reveals a small area each turn | Gives local objectives |
| Supply island | Can replenish one limited ammo type after capture | Adds route choices |

### Map Rules

- Islands must never create a single unbeatable hiding pocket.
- Every viable ship position must have at least two counterplay options: scouting, indirect fire, forced movement, air reconnaissance, mines, or flanking.
- The map generator must reject layouts that produce isolated regions with no tactical access.

## Fleet and Vehicle System

The player selects one flagship doctrine before each run. This is the primary build identity and determines the starting deck, ammo capacity, passive ability, and eligible modules.

### Initial Flagships

| Flagship doctrine | Starting identity | Strength | Weakness |
|---|---|---|---|
| Destroyer Command | Fast scouting and torpedo pressure | Cheap sensors, flexible movement | Low durability, limited area damage |
| Carrier Group | Air reconnaissance and precision strikes | Bypasses island lanes, wide reveal patterns | Aircraft are limited and vulnerable to anti-air |
| Submarine Wolfpack | Ambush, mines, stealth movement | Strong hidden attacks and deep-water control | Weak direct scouting, constrained by shallow water |
| Cruiser Battery | Heavy artillery and durable hull | Strong area denial and long-range fire | Expensive actions, slower recovery |

For MVP, build **Destroyer Command only**. The other doctrines are content expansions, not launch requirements.

### Unit Types

| Unit | Visibility | Typical role |
|---|---|---|
| Destroyer | Hidden until contacted or revealed | Flexible hunter, torpedoes, short-range sonar |
| Cruiser | Hidden until contacted or revealed | Area attacks, durable flagship support |
| Submarine | Very hard to detect in deep water | Ambush, mines, stealth repositioning |
| Carrier | Hidden until contacted or revealed | Launches aircraft and supports broad scouting |
| Fighter aircraft | Visible while acting | Counters bombers and intercepts reconnaissance |
| Patrol aircraft | Visible while acting | Reveals zones or tracks movement trails |
| Bomber aircraft | Visible while acting | Attacks an area or a discovered target |
| Mine layer | Hidden until attacked or scanned | Creates delayed area denial |
| Sonar buoy | Public once deployed | Persistent local scan, fragile but valuable |

## Ammunition Economy

Ammunition must be limited. This is essential: if all attacks are unlimited, deduction cards become optional and the game collapses into random bombing.

### Ammo Principles

- Ammunition belongs to the current doctrine and specific vehicle cards.
- A card cannot be played if its required ammo is depleted.
- Ammunition is replenished only by specific rewards, supply objectives, salvage, or rare cards.
- Stronger ammunition should create difficult trade-offs rather than being universally superior.

### Example Destroyer Starting Inventory

| Ammo type | Starting amount | Used by | Purpose |
|---|---:|---|---|
| Standard torpedo | 6 | Torpedo cards | Accurate line attack after scouting |
| Depth charge | 4 | Depth-charge cards | Area attack; stronger against submarines |
| Smoke charge | 3 | Evasion cards | Breaks targeting and hides movement |
| Sonar charge | 5 | Sonar cards | Reveals probability information |
| Mine | 2 | Mine cards | Delayed punishment for predicted routes |

## Cards and Deckbuilding

### Deck Rules

- Start with 10 cards.
- Draw 5 cards at battle start and draw 2 cards per turn.
- Hand limit: 8 cards.
- Discard pile reshuffles when empty.
- A deck should normally end a run at 18–28 cards. Beyond this, the player loses build consistency.
- Card copies are allowed, but each is restricted by ammunition, CP cost, rarity, or vehicle compatibility.

### Card Categories

| Category | Examples | Design goal |
|---|---|---|
| Intelligence | Sonar Sweep, Thermal Wake, Signal Intercept, Recon Flight | Convert fog into usable evidence |
| Direct fire | Torpedo Run, Barrage, Depth Charge, Rail Shell | Spend ammo to capitalize on evidence |
| Mobility | Flank Speed, Silent Running, Emergency Turn | Change your own hidden position and threaten lanes |
| Deception | Decoy Buoy, False Wake, Radar Jammer, Dummy Convoy | Manipulate the AI probability map |
| Air operations | Patrol Flight, Bombing Run, Fighter Screen | Bypass geography and create temporary visibility |
| Land operations | Capture Radar, Sabotage Supply, Coastal Battery | Make islands strategically relevant |
| Support | Repair Crew, Salvage, Reload, Overclock Sonar | Sustain an evolving build |

### Example Starter Cards

| Card | CP | Ammo | Effect |
|---|---:|---|---|
| Narrow Sonar | 1 | 1 sonar | Reveal whether any enemy occupies a selected 5-cell line |
| Torpedo Line | 2 | 1 torpedo | Fire through up to 6 water cells; stops on first ship or island |
| Depth Pattern | 2 | 1 depth charge | Attack a 3x3 water area; deals bonus damage to submarines |
| Patrol Plane | 2 | 1 aircraft fuel | Reveal a 5x5 square until the next enemy turn |
| Decoy Buoy | 1 | 0 | Creates a false high-confidence contact for the AI |
| Flank Speed | 1 | 0 | Move a surface unit two additional cells this turn |
| Minefield | 2 | 1 mine | Place 3 hidden mines in an adjacent water lane |
| Coastal Radar | 1 | 0 | If adjacent to a radar island, reveal a random enemy movement trail |

## Turn and Timing System

### Recommendation

Do **not** use a 60-second timer for the first prototype. On a 20x20 hidden-information board, 60 seconds can feel stressful before the player learns the vocabulary.

Use this progression:

| Mode | Timer per turn | Purpose |
|---|---:|---|
| First 3 tutorial battles | No timer or 120 seconds | Teach systems without panic |
| Standard early region | 75 seconds | Encourage momentum |
| Standard late region | 55–60 seconds | Demand prioritization |
| Boss / Challenger | 40–50 seconds | Test mastery and recognition |

### Turn Flow

1. **Upkeep:** status effects tick; persistent radar/sonar reveals resolve.
2. **Draw:** player draws cards and gains command points.
3. **Plan and act:** player plays cards, targets cells, moves eligible units, and spends ammo.
4. **Timeout:** when timer reaches zero, uncommitted targeting cancels and the player turn ends.
5. **Enemy resolve:** AI chooses actions from only its known information.
6. **Report:** show public battle log: detected contacts, shots, misses, destroyed objects, terrain effects.

### Command Points

- Start with 3 CP per turn.
- Most strategic cards cost 1–3 CP.
- Do not let players earn unlimited CP. Cap it at 6.
- The strongest builds should produce alternate choices, not infinite-action turns.

## AI Design: Hidden Probability Layer

### Non-Cheat Rule

The AI **must never read actual unrevealed player positions**. It may access only the same public information a player could see plus its own previously discovered evidence.

If this rule is violated, players will notice. A Battleship game loses credibility instantly when the opponent “randomly” fires into a perfect hidden location repeatedly.

### AI Knowledge Model

The AI maintains a probability map over all legal player positions.

For each hidden player unit, the AI calculates weighted likelihood based on:

- Legal placements and movement routes.
- Island shadows and deep-water concealment.
- Last confirmed or suspected contact.
- Visible attacks and their source constraints.
- Movement trails, wake signatures, aircraft origin, and sonar results.
- Known player cards and ammunition already observed.
- Decoys and jammers, which inject false evidence.
- Player behavior patterns, but only after enough observed turns.

The AI selects actions against high-probability areas, not confirmed invisible positions.

### Difficulty Escalation

Difficulty must increase through **better inference and stronger tactical plans**, not through extra illegal information.

| Stage | AI behavior | Allowed advantage |
|---|---|---|
| 1: Recruit | Broad random search, wastes ammo, ignores weak clues | Low accuracy and simple rules |
| 2: Hunter | Uses confirmed hits and basic line-probability | Better target selection |
| 3: Tactical | Understands islands, follows movement trails, uses basic decoys | Better probability weighting |
| 4: Veteran | Tracks player deck clues, protects key routes, bait-and-switch behavior | Better planning, no cheat vision |
| 5: Commander | Uses coordinated scans, air patrols, and counter-deception | Efficient action sequencing |

### Challenger Mode

Challenger Mode is not “AI with 100% aim.” That would be fake difficulty.

Rules:

- Same fog-of-war rules as the player.
- Same legal information access.
- Stronger probability model, more accurate memory, and better resource conservation.
- Understands common human patterns such as hiding behind the largest island or repeatedly moving along the same lane.
- Can identify decoys only through contradictions over time; it cannot know a decoy is fake when first deployed.
- Uses a fixed challenger seed for fair repeatability and leaderboard-ready design later.

Suggested player-facing label: **“The Admiral sees patterns, not positions.”**

## Air and Land Systems

### Air System

Aircraft are not cosmetic. They are the pressure valve that prevents islands and fog from causing stalemates.

| Aircraft action | Effect | Counterplay |
|---|---|---|
| Patrol sweep | Temporarily reveals a selected 5x5 zone | Fighter interception, anti-air, smoke |
| Bombing run | Area attack that ignores islands | Limited fuel, interception, poor precision |
| Sonobuoy drop | Persistent small sonar zone | Can be destroyed or jammed |
| Flare run | Reveals ship movement trail, not exact location | Silent-running card, deep-water bonus |

### Land System

Land cards should be limited to island interactions. Do not turn this into a second full land-combat game.

| Land card | Effect |
|---|---|
| Capture Radar Station | Gain one free local scan each turn while controlled |
| Sabotage Supply Depot | Enemy loses one random ammo type next turn |
| Coastal Artillery | Fire a fixed-pattern shot from a captured island |
| Signal Tower | Peek at an enemy card intent or next action category |
| Repair Dock | Repair one hull damage or recover one common ammunition |

## Encounter Types

Do not make every node “sink all ships.” Variety is required for a 20x20 board to remain fresh.

| Encounter | Objective | Main test |
|---|---|---|
| Hunt | Sink enemy flagship | Deduction and efficient ammunition |
| Convoy raid | Find and destroy moving transports before escape | Prediction and route control |
| Island capture | Hold/capture a radar or supply island | Positioning and land interaction |
| Minefield | Escape through a hazardous route | Scouting and careful movement |
| Silent duel | Both fleets have reduced sensors | Probability tracking and deception |
| Weather front | Scan ranges and air operations change each turn | Adaptation |
| Boss | Defeat a unique command vessel under special rules | Build mastery |

## Boss Concepts

| Boss | Rule | Counterplay |
|---|---|---|
| The Mirage Carrier | Generates false aircraft contacts | Verify via multiple intelligence sources |
| The Deep Choir | Multiple submarines move after each player turn | Use sonar nets, depth charges, and predictive mines |
| Iron Atoll | Fortified island network fires coastal artillery | Disable radar/supply islands before direct assault |
| The Cartographer | Reconfigures fog rules and creates misleading map pings | Build redundancy into intelligence cards |

## Roguelite Rewards

After each encounter, present one meaningful choice rather than a flood of rewards.

### Reward Categories

- Add one card from three options.
- Upgrade one existing card.
- Install one module.
- Repair hull / recover ammunition.
- Remove one weak card.
- Choose a route benefit with a future risk.

### Module Examples

| Module | Effect | Build direction |
|---|---|---|
| Acoustic Array | First sonar each battle costs 0 CP | Intelligence engine |
| Torpedo Loader | First two torpedoes each battle deal +1 damage | Precision damage |
| Decoy Network | First decoy each battle creates two contacts | Deception |
| Flight Deck Rig | Patrol planes reveal +1 row and column | Air control |
| Salvage Crane | Gain one ammo after sinking an enemy ship | Sustain |

## Meta-Progression

Keep it light. Permanent stats can undermine the deduction challenge.

Good permanent unlocks:

- New starting doctrines.
- New card pools.
- New modules.
- New map biomes.
- Cosmetic ship flags, command-room skins, and UI themes.
- Challenge modifiers.

Avoid:

- Permanent +damage upgrades.
- Permanent starting ammo inflation.
- Paid power.
- Grind-based stat gates.

## Failure Rules

- Primary defeat: flagship hull reaches zero.
- Optional pressure rule: three consecutive turn timeouts impose a “Command Breakdown” defeat.
- Do not immediately defeat a player for one timeout. A phone interruption is normal.
- Better alternative: a timeout discards one random card and gives the AI a temporary initiative bonus.

## UX Requirements

- Every action must explain *why* it succeeded or failed.
- The player must see public evidence distinctly: hit, miss, sonar contact, false contact, wake trail, aircraft spot, mine trigger.
- Add a battle log with tap-to-highlight grid locations.
- Let players long-press any card for exact targeting pattern and ammo cost.
- Use distinct shapes/icons in addition to color for accessibility.
- Provide animation speed controls and an option to skip enemy animations.

## Art Direction

Art can be simple. It cannot be unclear.

Recommended style:

- Stylized tactical map, high contrast.
- 2D silhouettes and clean icons rather than realistic naval 3D.
- Water, fog, explosions, sonar pulses, and card animation provide motion.
- Minimalist art reduces production scope and supports phone readability.

Do not choose pixel art merely because it is cheap. Use it only if it improves the intended naval-command mood and grid readability.

## Monetization

Recommended: **premium offline game**.

- Suggested initial price: $3–6, adjusted regionally.
- Optional later additions: paid content packs containing new doctrines, maps, and card sets.
- No ads, energy, loot boxes, or online requirement.

This is commercially harder to market than free-to-play. However, adding predatory F2P systems would conflict directly with the strategic, fair-play identity of the game.

## MVP Scope

Build this before adding additional factions, online modes, or multiple vehicle doctrines.

### MVP Content

- Android offline build.
- One 20x20 map generator with 3–5 island clusters.
- One player doctrine: Destroyer Command.
- One AI doctrine: balanced enemy task force.
- 12 player cards: 3 intelligence, 3 attack, 2 movement, 2 deception, 1 air, 1 land.
- 6 enemy units/archetypes.
- 3 normal encounter types and one boss.
- 8 modules.
- Probability-map AI with no hidden-position access.
- Standard mode and one challenger encounter.
- 75-second timer, reduced only after playtesting.

### Explicitly Out of Scope for MVP

- PvP or asynchronous multiplayer.
- Multiple player doctrines.
- Daily challenges.
- Story campaign, voice acting, cutscenes.
- Full naval simulation physics.
- Procedural narrative.
- More than one biome.

## Prototype Validation Plan

### Week 1: The Board Test

Build only:

- 20x20 grid.
- Fog-of-war.
- Islands.
- Placement/movement restrictions.
- Basic sonar and torpedo actions.

Pass condition: a player can identify a plausible enemy location through clues, not random grid taps.

### Week 2: The Pressure Test

Add:

- Command points.
- Limited ammunition.
- 75-second timer.
- Basic AI probability map.

Pass condition: time pressure creates prioritization, not confusion or panic.

### Week 3: The Build Test

Add:

- 12 cards.
- Reward choice after battles.
- One synergy path each for sonar, torpedo, deception, and aircraft.

Pass condition: testers can describe different builds they intentionally pursued.

### Week 4: The Fairness Test

Add:

- AI evidence log.
- Challenger rules.
- Replay seed.

Pass condition: players believe the AI is smart but not cheating. If players accuse the AI of cheating, inspect its data access before changing difficulty.

## Metrics to Test Locally

Do not optimize monetization metrics before proving that the core is fun.

Track:

- Average battle duration.
- Percentage of turns that time out.
- Average number of random blind attacks per battle.
- Average ammo remaining on victory/defeat.
- Most selected cards and modules.
- Whether a player uses scouting before firing.
- Whether Challenger Mode feels unfair.
- Number of runs a tester voluntarily starts after their first run.

## Key Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---:|---|
| 20x20 creates excessive blind guessing | Critical | Strong scan patterns, movement trails, objectives, and smaller effective combat zones |
| Timer creates stress rather than excitement | High | Start at 75–120 seconds; shorten only after observed mastery |
| AI appears to cheat | Critical | Enforce strict information boundary and show evidence-driven behavior |
| Too many cards obscure Battleship identity | High | Keep every card tied to naval scouting, targeting, movement, terrain, or deception |
| Air and land mechanics expand scope too far | High | Air: 2 cards in MVP. Land: 1 radar-island interaction in MVP |
| Runs become repetitive | Medium | Use varied objectives and boss rules before adding more cards |

## Final Direction

The strongest version is not “Battleship with many cards.” It is a **fast naval deduction roguelite** where cards let the player create, interpret, distort, and exploit incomplete information.

The single most important prototype question is:

> Does a player feel clever after winning a battle, or merely lucky after finding a ship?

If the answer is “lucky,” increase evidence, pattern play, movement prediction, and counterplay before adding content.
