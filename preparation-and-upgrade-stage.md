# Blackwater Command — Preparation and Post-Battle Upgrade Stage

**Purpose:** Define the essential pre-battle deployment phase and the post-victory reward/upgrade phase for the offline prototype.

---

# 1. Design Verdict

**System rating: 8/10.**

Manual deployment is essential because it gives the player agency before the first shot and makes island terrain, ship roles, deception, and later AI inference meaningful.

The weak assumption to avoid: “more upgrades always improve the roguelike loop.” **Wrong.** Too many upgrades, currencies, rerolls, and choices will turn a fast naval deduction game into menu management. Each win should give **one clear, meaningful reward decision**, not a flood of loot.

---

# 2. Full Encounter Loop

```text
Route Map
    ↓
Choose a reachable node
    ↓
Read public node archetype and risk level
    ↓
Preparation Stage: inspect map + deploy fleet
    ↓
Battle: fog-of-war tactical duel
    ↓
Victory
    ↓
Post-Battle Debrief: results + evidence summary
    ↓
Choose one reward / upgrade
    ↓
Update fleet, deck, ammunition, hull, and route state
    ↓
Return to Route Map
```

## Encounter Entry Information

The player sees enough information to prepare, but not enough to solve the encounter before it begins.

| Information visible before deployment | Information hidden until battle begins |
|---|---|
| Map terrain and island layout | Enemy ship coordinates |
| Encounter archetype | Exact enemy ship composition |
| Risk level | Enemy card hand/deck order |
| Known regional modifier | Exact weather variation, hidden mines, surprise rule |
| Current player hull, ammunition, cards, modules | Enemy AI target priorities |

Example: the map may say **“Submarine Ambush — High Risk”**, so the player can value depth charges and sonar. It must not say “three submarines begin at H12, M6, and P17.”

---

# 3. Preparation Stage

## Goal

The player chooses how to begin a battle:

- Where to hide the flagship.
- Which lanes support ships control.
- Which island routes to threaten or avoid.
- Which limited ammunition and cards are worth bringing into the encounter.
- Whether to prepare for aggression, survival, deception, or information gathering.

There is **no turn timer** in the preparation stage. The timer starts only after deployment is confirmed and combat begins.

## Player Fleet

| Ship | HP | Main purpose | Preparation decision |
|---|---:|---|---|
| Flagship: Destroyer Command | 20 | Main command ship; full deck access | Choose a flexible hiding location with at least two legal routes |
| Patrol Boat | 8 | Scout and deception support | Place near likely scout lanes, but avoid easy traps |
| Minelayer | 10 | Area denial and route control | Place near chokepoints or routes likely to be used later |

## Deployment Rules

| Rule | Specification |
|---|---|
| Manual placement | Player places all three ships before each battle |
| Orientation | Horizontal and vertical in MVP; no diagonal placement |
| Valid cells | Water only; obey vehicle terrain restrictions |
| Ship overlap | Not allowed |
| Island collision | Not allowed |
| Fleet spacing | No mandatory classic Battleship spacing in MVP; balance later only if clustering becomes dominant |
| Flagship safety | Flagship must begin with at least two legal movement routes |
| Support safety | Each support must have at least one valid first-turn action or movement route |
| Confirmation | Player must press Confirm Deployment before combat begins |
| Quick Deploy | Optional button places fleet legally for players who want speed |
| Clear / Reset | Player can clear placements before confirming |

## Terrain Restrictions

| Vehicle | Open water | Shallow water | Deep water | Reef | Island |
|---|---|---|---|---|---|
| Destroyer flagship | Allowed | Allowed | Allowed | Not allowed | Not allowed |
| Patrol Boat | Allowed | Allowed | Allowed | Allowed, extra movement cost | Not allowed |
| Minelayer | Allowed | Allowed | Allowed | Not allowed | Not allowed |
| Submarine, future | Allowed | Not allowed | Allowed, concealment bonus | Not allowed | Not allowed |
| Carrier, future | Allowed | Allowed | Allowed | Not allowed | Not allowed |

## Initial Loadout

The player does not choose an unlimited loadout. The current run state sets the available resources.

### Mandatory Starting Resources

| Resource | Prototype amount | Rule |
|---|---:|---|
| Torpedoes | Current run inventory | Consumed by Torpedo cards |
| Depth charges | Current run inventory | Consumed by area attacks |
| Sonar charges | Current run inventory | Consumed by scan cards |
| Smoke charges | Current run inventory | Consumed by concealment/jammer cards |
| Mines | Current run inventory | Consumed by Minefield cards |
| Aircraft fuel | Current run inventory | Consumed by Patrol Plane cards |

### Optional Preparation Choice: One Battle Doctrine

Before confirming deployment, choose **one** doctrine for the coming battle. This adds a meaningful decision without creating a second deckbuilding screen.

| Doctrine | Effect | Best use | Cost / downside |
|---|---|---|---|
| Silent Start | Flagship begins with reduced evidence signature for two turns | Survival, boss preparation | Start with -1 CP on turn one |
| Forward Recon | Patrol Boat begins with one free short scan | Information-heavy encounter | Patrol Boat begins more exposed |
| Armed Waters | Minelayer begins with one extra mine placement | Chokepoint maps | Start with -1 sonar charge |
| Rapid Strike | First Torpedo Line costs -1 CP | Aggressive confirmed-contact play | Flagship leaves a stronger wake after firing |

**MVP recommendation:** implement only **Silent Start** and **Forward Recon**. Four options are enough later; two are enough now.

## Preparation UI Requirements

| UI element | Requirement |
|---|---|
| Board | Show full 20x20 terrain map before placement |
| Fleet tray | Display all unplaced ships, HP, role, and terrain restrictions |
| Placement preview | Show valid cells, invalid cells, orientation, and ship footprint |
| Terrain explanation | Tap/long-press terrain to show its effect |
| Current resources | Show current ammunition, hull, deck size, active modules |
| Encounter preview | Show archetype and risk level; hide exact composition/modifiers |
| Controls | Rotate, Clear, Quick Deploy, Confirm Deployment |
| Doctrine selector | Present one simple pre-battle doctrine choice |

## Deployment Validation

The Confirm button remains disabled until:

- Flagship is placed legally.
- Both support ships are placed legally.
- No ships overlap.
- No ship occupies invalid terrain.
- Flagship has two valid legal movement routes.
- Each support ship has at least one valid movement/action opportunity.

## AI Preparation Rules

The enemy placement is generated from the same terrain and placement rules as the player.

The AI may not:

- Place inside islands or illegal terrain.
- Use AI-only hiding cells.
- Generate placement after reading the player’s hidden position.
- Know the player’s pre-battle doctrine unless its effect is publicly visible.

The enemy placement seed is stored for post-battle Analyze Mode. It remains hidden during battle.

---

# 4. Battle Start Handoff

After the player confirms deployment:

1. Player ships become hidden from the AI.
2. Enemy ships are hidden from the player.
3. Public terrain and encounter rules remain visible.
4. The player draws the starting hand.
5. Player receives 3 Command Points.
6. The 75-second timer begins.
7. AI Intel Panel begins at zero confirmed player contacts.

The player should never begin a battle with the AI already knowing their flagship location unless a clearly labeled encounter modifier explicitly says so.

---

# 5. Victory and Debrief

## Victory Condition

The player wins an encounter by sinking the enemy flagship.

Enemy support ships are optional targets. Sinking them weakens enemy scouting, attacking, or special abilities, but is not required for victory.

## Post-Battle Debrief Screen

Show this before rewards:

| Panel | Content |
|---|---|
| Result | Victory, turns taken, timer pressure, objective result |
| Fleet state | Flagship/support HP, destroyed supports, repairs needed |
| Ammunition | Used, recovered, remaining ammunition by type |
| Evidence summary | Successful scans, decoys fooled, confirmed contacts, blind shots |
| AI summary | Strongest AI inference, biggest AI error, highest probability guess |
| Route effect | Newly available route nodes or route changes |
| Analyze button | Opens replay, AI knowledge view, probability heatmap, and reason log |
| Continue button | Moves to reward selection |

Do not reveal enemy placement during normal debrief by default. Reveal it in Analyze Mode or post-victory board recap.

---

# 6. Post-Battle Reward Stage

## Rule: One Primary Reward Choice

After a normal victory, give the player **one choice from three rewards**.

This is the core roguelike upgrade moment. The player chooses what best fits their current run rather than automatically becoming stronger.

| Reward slot | Selection rule |
|---|---|
| Normal battle | Choose 1 of 3 rewards |
| Elite battle | Choose 1 of 3 stronger rewards; one may be rare |
| Boss victory | Gain one guaranteed doctrine-level reward, then choose one of 3 bonuses |
| Event | Uses its own explicit trade-off; does not automatically give a reward |

## Reward Types

| Reward type | What it changes | When it is valuable |
|---|---|---|
| Add card | Adds a tactical option to deck | Player needs a new approach or synergy |
| Upgrade card | Improves an existing card | Player has a reliable core card |
| Install module | Adds a run-long passive | Player commits to a strategy |
| Replenish ammunition | Restores limited weapon/sensor resource | Player is low on a vital resource |
| Repair hull | Restores flagship or support HP | Player needs survival margin |
| Remove card | Deletes a weak/basic card | Player needs consistency |
| Upgrade support ship | Improves one support ship’s role | Player has kept/supports a tactical plan |
| Route intelligence | Reveals more about future nodes | Player wants safer planning |

## Reward Generation Rules

- Show three rewards with different strategic purposes when possible.
- Do not offer three versions of the same weak reward.
- Avoid guaranteed “correct” picks.
- If hull is critically low, include a repair option at least once every two victories.
- If a required ammo type is near zero, include ammo recovery sometimes, not always.
- Do not let rewards violate deck cap, ammo cap, or support-ship limits.

---

# 7. Upgrade Sheets

## A. Card Acquisition Sheet

| Reward tier | Offer rule | Example |
|---|---|---|
| Common | Three standard cards | Sector Sweep, Flank Speed, Minefield |
| Uncommon | Stronger or build-defining card | Signal Intercept, Precision Salvo, Radar Jammer |
| Rare | Unique rule-changing card | False Fleet, Deep Scan Network, Emergency Extraction |
| Elite | One uncommon/rare option guaranteed | Pick one stronger tactical direction |
| Boss | One boss-themed special card possible | Anti-Air Net after carrier boss |

### Card Upgrade Examples

| Base card | Upgrade | Result |
|---|---|---|
| Narrow Sonar | Focused Sonar | Scan 6 cells instead of 5 and cost remains 1 CP |
| Sector Sweep | Wide Sweep | Scan 5x4 instead of 4x4 |
| Torpedo Line | Guided Torpedo | Can bend once around a legal water corner |
| Depth Pattern | Saturation Pattern | Attacks 3x3 and marks surviving ships as Contact |
| Decoy Buoy | Phantom Buoy | Creates two competing false contact zones |
| Go Silent | Deep Silence | Remove confirmation and erase one wake trail |
| Patrol Plane | Long Patrol | Reveal lasts through two enemy turns |

## B. Module Sheet

Modules are permanent for the current run unless destroyed by a clearly labeled event. Limit active modules to **four** in prototype to prevent unreadable stacking.

| Module | Effect | Strategic identity |
|---|---|---|
| Acoustic Array | First sonar card each battle costs 0 CP | Information engine |
| Torpedo Loader | First two torpedoes each battle deal +1 damage | Precision strike |
| Decoy Network | First Decoy Buoy creates two suspected contacts | Deception |
| Flight Deck Rig | Patrol Plane reveals one additional row and column | Air control |
| Salvage Crane | First enemy support sunk restores one common ammo | Sustain |
| Emergency Rudder | First time flagship is confirmed, gain a free movement | Recovery |
| Signal Interpreter | Wake trails persist one additional turn | Tracking |
| Mine Computer | Show predicted high-probability routes before placing mines | Area denial |

## C. Ammunition Reward Sheet

| Reward | Effect | Use case |
|---|---|---|
| Torpedo Crate | +2 standard torpedoes | Player has confirmation tools but no finishing power |
| Depth Rack | +2 depth charges | Submarine/area-control preparation |
| Sonar Cell Pack | +3 sonar charges | Player needs more information capacity |
| Smoke Cache | +2 smoke charges | Player expects to be hunted or exposed |
| Mine Bundle | +2 mines | Chokepoint/route-control build |
| Fuel Canister | +2 aircraft fuel | Air reconnaissance build |

## D. Hull and Support Recovery Sheet

| Reward | Effect | Balance rule |
|---|---|---|
| Emergency Repairs | Restore 5 flagship HP | Cannot exceed max HP |
| Full Dock Repair | Restore 8 flagship HP | Rare / repair node / boss reward |
| Patrol Boat Repairs | Restore 4 Patrol Boat HP | Only if alive |
| Minelayer Repairs | Restore 4 Minelayer HP | Only if alive |
| Field Recovery | Restore a destroyed support at 50% HP | Rare event only; never routine |
| Reinforced Hull | +3 max flagship HP for current run | Rare; cap once per run |

A destroyed support ship should normally stay destroyed for the run. If recovery is common, support sacrifice becomes optimal and removes tension.

## E. Deck Cleanup Sheet

| Reward | Effect | Purpose |
|---|---|---|
| Scrap Basic Tactics | Remove one chosen card | Improve deck consistency |
| Purge Weak Signal | Remove one card and gain one sonar charge | Trade weak draw for information |
| Refit | Transform one common card into a random uncommon card | Risk/reward change |
| Archive Intel | Remove one card; preview next reward pool | Planning value |

---

# 8. Upgrade Flow by Encounter Type

| Encounter result | Reward behavior |
|---|---|
| Standard victory | Choose 1 of 3 mixed reward options |
| Elite victory | Choose 1 of 3 high-value options; include module/rare card chance |
| Boss victory | Gain boss reward + choose one high-value reward |
| Event success | Explicit event reward only |
| Narrow victory | Prefer repair/ammo offer; do not force it if player intentionally takes risk |
| Support destroyed | Offer repair/recovery only when appropriate; do not automatically undo loss |

## Example Reward Screens

### Example 1: Low Ammo, Healthy Hull

| Choice | Reward | Why it is interesting |
|---|---|---|
| A | Add “Signal Intercept” | Strengthen intelligence build |
| B | +3 sonar charges | Solve immediate resource shortage |
| C | Torpedo Loader module | Commit to precision attacks but remain low on ammo |

### Example 2: Low Hull, Strong Deck

| Choice | Reward | Why it is interesting |
|---|---|---|
| A | Restore 5 flagship HP | Safe but no build growth |
| B | Upgrade Decoy Buoy to Phantom Buoy | Strong future deception, risky now |
| C | Scrap one basic card | Consistency improvement, no immediate survival |

### Example 3: After Elite Victory

| Choice | Reward | Why it is interesting |
|---|---|---|
| A | Acoustic Array module | Strong intelligence engine |
| B | Precision Salvo card | Strong damage but consumes two torpedoes |
| C | Restore 4 HP and +2 depth charges | Resilience and submarine preparation |

---

# 9. Boss Reward and Escalation

## Boss Rewards

Bosses should grant a reward that reflects the boss mechanic. This makes victory feel like earned adaptation, not generic loot.

| Boss defeated | Guaranteed reward | Example optional bonus |
|---|---|---|
| Mirage Carrier | Anti-Mirage Protocol: first false contact each battle is identified as suspicious | Flight Deck Rig / Patrol Plane upgrade / fuel cache |
| Deep Choir | Hydrophone Net: first submarine contact each battle persists one extra turn | Depth-charge upgrade / sonar pack / mine module |
| Iron Atoll | Coastal Access: capture radar islands with -1 CP cost | Coastal Radar upgrade / repair dock / hull reinforcement |
| Cartographer | Verified Charts: first map misinformation effect each battle is revealed | Signal Interpreter / route intelligence / rare scan card |

## Boss Difficulty Rules

- Bosses have shorter turn timers: 60 seconds in prototype.
- Bosses impose a public tactical disadvantage, not an opaque stat penalty.
- The player sees the boss identity and broad signature before entering the route node.
- Exact phase behavior remains hidden until the fight begins.
- The player must have a viable recovery path after a poor start.

---

# 10. Persistent Run State Sheet

This data is carried from one node to the next during a run.

| State category | Persists between encounters | Notes |
|---|---|---|
| Flagship current HP | Yes | Run ends at 0 HP |
| Support ship HP | Yes | Destroyed supports normally remain lost |
| Ammunition | Yes | Recovered through rewards/events/supply nodes |
| Deck contents | Yes | Must stay at or below 28 cards |
| Card upgrades | Yes | Upgraded card keeps upgrade for run |
| Modules | Yes | Active module cap: 4 in prototype |
| Route intelligence | Yes | Reveals future node information only |
| AI knowledge | No | New encounter starts without knowledge of player placements |
| AI behavior tier | Yes, by region/encounter | Difficulty escalates through legal inference quality |

## Important Reset Rule

The enemy AI must **not** carry hidden knowledge of the player’s prior ship placement into a new battle.

It may carry a high-level behavioral trait in later regions, such as “this admiral prefers investigating island shadows,” but it cannot know where the player placed ships in the next encounter.

---

# 11. Essential Prototype Scope

## Build Now

| System | Prototype requirement |
|---|---|
| Deployment board | 20x20 map, terrain visibility, drag placement, rotation, validation |
| Fleet | Flagship + Patrol Boat + Minelayer |
| Preparation controls | Rotate, Clear, Quick Deploy, Confirm |
| Pre-battle choice | Silent Start and Forward Recon only |
| Battle handoff | Hidden fleets, draw 5, gain 3 CP, start timer |
| Rewards | Choose 1 of 3 after normal victory |
| Reward types | Add card, upgrade card, module, ammo, repair, remove card |
| Cards | 12-card initial pool |
| Modules | 8 initial modules |
| Run state | HP, supports, ammo, deck, upgrades, modules persist |
| Debrief | Result, fleet state, ammo state, Analyze Mode button |

## Do Not Build Yet

- Saved deployment presets.
- Formation bonuses.
- More than two support ships.
- More than two pre-battle doctrines.
- Support-ship revival as normal economy.
- Complex loadout editing before every fight.
- More than four active modules.
- Reroll currency or reward-shop economy.
- Multiplayer or asynchronous fleet placement.

---

# 12. Acceptance Tests

## Preparation Stage

- Player can place all ships without reading a manual.
- Invalid placement has immediate, readable feedback.
- Player understands why the flagship needs escape routes.
- Quick Deploy always produces a legal fleet layout.
- Player can identify a meaningful reason to choose Silent Start versus Forward Recon.
- Preparation does not take more than 45–75 seconds after the tutorial.

## Reward Stage

- Player can explain why they chose one reward over the other two.
- A low-health player has a real chance to recover, but cannot always repair for free.
- A low-ammo player must sometimes choose between survival/recovery and build growth.
- Card additions do not push the deck beyond 28 cards.
- Module stacking does not produce an unbeatable automatic build.
- The player has at least one card-removal opportunity within a normal region.

## Core Question

After a completed encounter, ask the tester:

> “What did you choose during deployment, what did you gain after victory, and how did those decisions change your next battle?”

If they cannot answer clearly, the preparation/reward systems are too complex, too weak, or disconnected from the tactical game.
