# Blackwater Command — Multiplayer v0 Rules Lock

**Status:** Prototype / invite-only multiplayer test  
**Priority:** Post-offline-MVP experiment  
**Modes:** 1v1v1v1 free-for-all and 2v2 teams, tested independently  
**Match type:** Live turn-based  
**Platform:** HTML5 browser build on itch.io; remote sessions require an authoritative online server

---

# 1. Purpose and Authority

This document locks the rules for the first four-player multiplayer prototype.

It is intended for an AI/developer extending the existing Blackwater Command HTML build. It adds multiplayer rules only. The offline prototype rules remain the authority for shared core combat systems unless this document explicitly overrides them.

## Builder Rule

Do not add unlisted mechanics, additional cards, progression systems, matchmaking, public chat, spectator systems, ranked mode, or economy systems to v0.

When a rule is unspecified:

1. Prefer the simplest deterministic implementation.
2. Preserve hidden information.
3. Preserve equal rules for every player/team.
4. Add a TODO and surface the ambiguity rather than inventing a major mechanic.

---

# 2. Honest Scope Assessment

**Multiplayer v0 rating: 6/10.**

The mode is technically feasible because the game is grid-based and turn-based. It is not low-risk:

- Four-player free-for-all will naturally allow focus-fire, temporary social alliances, dogpiling, and kingmaking.
- There is deliberately no kingmaking-prevention system in v0.
- 2v2 is more likely to become a fair, repeatable mode.
- 1v1v1v1 is still valuable as a chaos/fun experiment, but do not claim it is competitively balanced before testing.

**Do not begin remote multiplayer implementation until the offline prototype has validated fog, placement, contact states, damage, timers, and save-safe deterministic state transitions.**

---

# 3. Core Match Rules

| System | v0 decision |
|---|---|
| Supported modes | 1v1v1v1 and 2v2 |
| Mode selection | Host chooses at match creation |
| Match access | Invite code only |
| Match type | Live turn-based |
| Player turn timer | 30 seconds |
| Target match duration | 10–20 minutes |
| Board size | 24x24 |
| Starting regions | One home quadrant per player/team |
| Deployment | Secret and simultaneous preparation phase |
| Turn order | Opening dice roll once; highest result starts; then fixed clockwise order |
| CP | Start with 3 CP; unspent CP carries; maximum 6 CP |
| Deck | Fixed identical starter deck for all players |
| Deckbuilding | None in v0 multiplayer |
| Ammunition | Independent per player |
| Main victory | Sink all opposing ships |
| Free-for-all surrender | Individual player may surrender |
| Team surrender | Both teammates must confirm surrender |
| Draw | No normal draw; resolve with Storm Collapse |
| Chat | Not included |
| Matchmaking | Not included; invite only |

---

# 4. Modes

## 4.1 Free-for-All: 1v1v1v1

- Four independent players.
- Every other player is an opponent.
- Any player may attack any opponent from turn one, subject to targeting and territory rules.
- Temporary alliances are socially allowed but have no in-game mechanic, UI, resource sharing, or formal agreement.
- Players cannot trade cards, ammunition, ships, or system intelligence.
- Players may share intelligence verbally or through external communication at their own discretion.
- Focus fire is allowed: multiple players may target the same opponent across their turns.
- No anti-kingmaking system exists in v0.

### FFA Win Condition

The last player with at least one surviving ship wins.

A player with all ships sunk is eliminated. Their turn is removed from the fixed turn order.

## 4.2 Team Mode: 2v2

- Two teams of two players.
- Each player owns and controls their own fleet, deck, CP, ammunition, and turn.
- Teammates share all legally acquired intelligence automatically.
- Teammates do not share cards, ammunition, CP, or ship control.
- No in-game chat is included in v0.
- Teammates may communicate externally.

### 2v2 Win Condition

A team wins when all ships belonging to both opposing-team players are sunk.

If one team member loses all ships:

- That player is eliminated.
- Their teammate continues playing.
- The team remains active until both teammate fleets are eliminated or both teammates surrender.

### Team Surrender

- One teammate choosing surrender creates a **Surrender Pending** state.
- The second teammate must confirm surrender before the team is removed.
- If the second teammate does not confirm, the match continues.
- Individual resignation without team confirmation is not allowed in v0.

---

# 5. Board, Territories, and Borders

## 5.1 Board

| Property | Rule |
|---|---|
| Dimensions | 24 columns x 24 rows |
| Total cells | 576 |
| Coordinate format | A–X, 1–24 |
| Terrain | Public to all players before deployment |
| Ships | Hidden by fog-of-war until legally revealed |
| Board rendering | Landscape tactical map |

## 5.2 Home Quadrants

Each player/team receives one fixed home quadrant.

| Quadrant | Columns | Rows |
|---|---|---|
| North-West | A–L | 1–12 |
| North-East | M–X | 1–12 |
| South-West | A–L | 13–24 |
| South-East | M–X | 13–24 |

For 2v2, teammates receive assigned quadrants according to match layout. The host/server must use a symmetrical layout.

## 5.3 Base-Mode Border Rule

This v0 mode preserves Battleship identity.

- Ships may deploy only in their assigned home quadrant.
- Ships may move only within their assigned home quadrant.
- Ships may not cross into another player’s quadrant.
- Ships may not enter a teammate’s quadrant in 2v2.
- Aircraft, sonar, torpedoes, mines, and legal card effects may target any quadrant when their targeting rule permits it.
- All players obey the identical border rule.

There is no central contested zone in v0.

## 5.4 Why Borders Exist

Cross-quadrant ship movement is intentionally forbidden. If fleets freely infiltrate enemy territory, the game becomes a conventional turn-based naval skirmish and loses its core hidden-deployment Battleship identity.

Capture-the-flag, extraction, central-zone, and infiltration modes are post-v0 experiments and must not influence base-mode balance.

---

# 6. Secret Simultaneous Deployment

## 6.1 Preparation Flow

```text
Server creates match seed and public 24x24 terrain map
→ Each player receives only their own home quadrant deployment access
→ All players place fleet secretly
→ Each player confirms deployment
→ Server validates all placements
→ Server locks placements simultaneously
→ Server rolls opening initiative dice
→ Server deals starting hands and begins Player 1 turn
```

## 6.2 Deployment Requirements

Each player deploys:

| Ship | Cells | HP | Orientation |
|---|---:|---:|---|
| Flagship | 3 contiguous cells | 20 | Horizontal or vertical |
| Patrol Boat | 2 contiguous cells | 8 | Horizontal or vertical |
| Minelayer | 2 contiguous cells | 10 | Horizontal or vertical |

Rules:

- All ship cells must remain within the owner’s home quadrant.
- Ships cannot overlap islands, invalid terrain, friendly ships, or enemy ships.
- Ships may be adjacent to each other.
- Ship placement remains secret after confirmation.
- No player sees another player’s deployment, deck, hand, ammunition, mine locations, decoys, or hidden status.

## 6.3 Deployment Timeout

- Player deployment timer: 60 seconds.
- If timer expires before confirmation, server uses legal Quick Deploy.
- Quick Deploy must follow the exact same terrain, footprint, and quadrant rules as manual placement.

---

# 7. Visibility and Intelligence

## 7.1 Fog-of-War

Each player has an independent fog-of-war view.

| Information | FFA visibility | 2v2 visibility |
|---|---|---|
| Own ships and resources | Owner only | Owner only |
| Teammate ship positions | Not applicable | Teammate only |
| Enemy ship locations | Only when legally revealed | Shared with team when legally revealed |
| Sensor results | Owner only | Shared automatically with teammate |
| Wake trail | Only observer | Shared automatically with teammate |
| Aircraft reconnaissance | Owner only | Shared automatically with teammate |
| Enemy private deductions | Never visible | Never visible |
| Opponent probability map | Never visible | Never visible |

## 7.2 Public Status Information

Shown in a status panel, never as hidden-position information on the board.

| Information | Visibility |
|---|---|
| Each player’s flagship current HP | Public |
| Each player’s surviving support count | Public |
| Ship locations | Hidden unless legally revealed |
| Ship exact HP for supports | Hidden by default |
| Remaining ammunition | Hidden |
| Cards in hand | Hidden |
| Deck order | Hidden |
| Mine locations | Hidden |
| Decoy locations | Hidden until identified/hit |

## 7.3 Hit and Reveal Rules

| Event | Attacker/team learns | Target player learns | Other opponents learn |
|---|---|---|---|
| Miss | Target cell is empty | Attacked coordinate and miss | “Player A missed Player B” only; no coordinate |
| Hit | Full footprint of hit ship currently | Damage and attack coordinate | “Player A hit Player B” only; no coordinate |
| Ship moves after hit | Previous footprint becomes Lost Contact to attacker/team | Own movement result | No coordinate |
| Ship is sunk | Full ship footprint and identity | Own ship destroyed | Ship identity destroyed; no coordinate |
| Successful scan | Card-specific result | No notification unless effect is public | No notification |

## 7.4 Decoys

- Decoys appear to opponents as a plausible ship/contact.
- Decoys have 1 HP.
- A decoy is revealed as a Decoy only when it is damaged by an attack.
- Before that hit, it must not be labeled differently, colored differently, or transmitted as special client metadata.
- Decoys cannot move.
- Decoys do not count toward a player’s remaining real ship count.

---

# 8. Turn Order, CP, and Skipping

## 8.1 Initiative

1. After all deployments lock, each player rolls a server-side initiative die.
2. Highest result acts first.
3. Ties are resolved by a second server-side roll only among tied players.
4. Turn order then remains clockwise/fixed for the entire match.
5. Eliminated players are skipped.

## 8.2 Turn Resources

| Resource rule | Value |
|---|---:|
| Starting CP | 3 |
| CP carry-over | Yes |
| CP maximum | 6 |
| Starting cards | 5 |
| Card draw | 2 cards at the start of each owner turn |
| Hand limit | 8 cards |
| Ammo | Independent inventory per player |

## 8.3 End Turn and Voluntary Skip

- The active player may click **End Turn** at any time.
- A voluntary skip is a deliberate End Turn with no card or movement action.
- Only the active player may skip their own turn.
- No card, effect, opponent, teammate, or system may force another player to skip an entire turn in v0.

### Voluntary Skip Cost

| Condition | Cost |
|---|---|
| Player has at least 1 CP | Spend 1 CP, then end turn |
| Player has 0 CP | Burn/discard 1 card, then end turn |

The skip cost is not generic ammunition loss. Burning an arbitrary ammunition type would be unclear and exploitable.

## 8.4 Timeout

If the 30-second timer expires:

- Resolve no unconfirmed action.
- End the active player’s turn.
- Apply the same cost as a voluntary skip: spend 1 CP if possible; otherwise discard 1 card.
- Timer expiration is not an opponent-caused skip.

---

# 9. Support Ships and Round Refresh

## 9.1 Player Fleet Roles

| Ship | Role | Platform action |
|---|---|---|
| Flagship | General command, movement, weapons, scans | May use all Command cards |
| Patrol Boat | Reconnaissance | May use Patrol Plane / patrol cards |
| Minelayer | Route denial | May use Minefield / mine cards |

## 9.2 Support Platform Actions

- Each alive support ship may perform one platform action per full round.
- A support action marks that support as spent.
- A spent support cannot perform another platform action until refresh.
- Supports may still be moved by a valid movement card if alive.
- A destroyed support never refreshes.

## 9.3 Round Definition

A **full round** means every non-eliminated player has had one completed turn in current fixed turn order.

At the start of the owner’s next turn after a full round completes:

- Their alive Patrol Boat refreshes.
- Their alive Minelayer refreshes.

---

# 10. Cards, Ammunition, and Combat Limits

## 10.1 Fixed Multiplayer Deck

All players start with the same fixed deck. There is no card drafting, card acquisition, relic/module system, shop, reward screen, or deckbuilding during a v0 multiplayer match.

Use the existing 12-card base deck only after adapting card effects to multiplayer visibility rules.

## 10.2 Independent Resources

- Each player has their own CP, hand, deck, discard pile, ship HP, ammunition, supports, and decoys.
- In 2v2, teammates share intelligence only.
- Cards, ammunition, CP, and ship control cannot be traded.

## 10.3 Allowed Disruption

| Effect | v0 rule |
|---|---|
| Steal ammunition | Allowed: maximum 1 ammo from one opponent per card/action |
| Force discard | Allowed: maximum 1 card from one opponent per card/action |
| Steal ammo + discard in same action | Forbidden |
| Permanent ship reveal | Forbidden |
| Force opponent full-turn skip | Forbidden |
| Affect multiple opponents | Forbidden |
| Alter/create blocking terrain | Forbidden |
| Attack every player | Forbidden |

## 10.4 Damage Guardrails

There is no hard numeric maximum damage per turn if the player legally has CP, cards, ammunition, and available ship platforms.

However, these guardrails are mandatory:

- CP cap is 6.
- Each ship can make at most one weapon-platform action on its owner’s turn.
- A support ship can use at most one platform action each full round.
- All card costs, ammo requirements, targets, and damage must be server-validated.
- No card can affect more than one opponent in v0.

This prevents unlimited loops while allowing high-resource tactical turns.

---

# 11. Win, Surrender, Elimination, and Storm Collapse

## 11.1 Elimination

A player is eliminated when all their ships are sunk.

- Their future turns are removed.
- Their remaining cards, CP, ammunition, mines, decoys, and effects are removed unless a specific card says otherwise.
- Their public status becomes Eliminated.

## 11.2 Surrender

| Mode | Rule |
|---|---|
| 1v1v1v1 | Player may surrender individually; all ships are removed and player is eliminated |
| 2v2 | Both teammates must confirm to surrender the team; one player cannot unilaterally remove their fleet |

## 11.3 Storm Collapse

No normal draw state exists.

At the match hard-limit turn count, initiate Storm Collapse.

### Hard Limit

- Prototype default: 20 full rounds.
- Tune after playtesting against the 10–20 minute duration target.

### Storm Rules

1. Announce Storm Collapse publicly.
2. At the end of every full round, the outermost remaining ring of every home quadrant becomes unsafe.
3. A ship occupying an unsafe cell at end of its owner turn takes 2 hull damage.
4. Every player gains one free **Global Scan** once per Storm round.
5. Global Scan returns only broad contact information, not permanent exact locations.
6. No player receives free ammunition refill.
7. Continue until one player remains in FFA or one team remains in 2v2.

Storm Collapse forces action without turning the result into “first random hit wins.”

---

# 12. Disconnect, Rejoin, and Autoplay

## 12.1 Disconnect Grace Period

- When an active player disconnects, begin a 10-second reconnect grace period.
- If they reconnect, restore their turn with remaining timer time if technically feasible; otherwise restore with at least 10 seconds.
- If they do not reconnect, Autoplay takes over for that turn.

## 12.2 Autoplay

Autoplay is a temporary control state, not an AI that receives extra information.

Autoplay may use only:

- The disconnected player’s visible-to-owner state.
- Their own fleet locations, deck, hand, CP, ammunition, and legally acquired intelligence.
- Public board terrain and events.

Autoplay may not use opponents’ hidden positions, hands, mines, decoys, or private intelligence.

### Autoplay Priority

```text
1. If own flagship has a current Lock: attempt legal concealment/movement.
2. If a known enemy Lock exists: make best legal high-value attack.
3. If a Contact/Evidence exists: use best legal scan or targeted attack.
4. Otherwise use a basic legal scan.
5. If no legal useful action exists: End Turn using normal skip cost.
```

## 12.3 Rejoining

- A reconnecting player immediately regains control at the next legal action boundary.
- If Autoplay already committed an action, it cannot be rolled back.
- Display a public status label: `AUTOPLAY ACTIVE`.
- No permanent penalty for temporary disconnection beyond the decisions Autoplay made.

---

# 13. Network and Security Requirements

## Non-Negotiable Rule

Remote multiplayer cannot be implemented as a client-only itch.io HTML game. itch.io hosts the web client; a separate authoritative backend is required for hidden-information multiplayer.

## Server Must Authoritatively Control

- Match seed and RNG.
- Secret deployments.
- Card draw order.
- Player hands.
- Ammunition and CP.
- Legal targets and card resolution.
- Damage, sinking, elimination, surrender, timeout, and Storm resolution.
- Per-player filtered match state.

## Never Send to a Client

- Opponent ship coordinates before legal reveal.
- Opponent hand/deck order.
- Opponent mine or decoy locations before legal reveal.
- Opponent exact support HP unless public by rule.
- Opponent private scan results.
- Any hidden server seed that enables prediction of opponent state.

## Required v0 Backend Features

| Feature | Requirement |
|---|---|
| Identity | Guest identity plus invite code |
| Match creation | Create 1v1v1v1 or 2v2 private room |
| Joining | Invite code only |
| Transport | HTTPS + WSS/WebSocket for live updates |
| Authority | Server validates every action |
| Reconnect | Session recovery and latest filtered state |
| Timer | Server-owned turn timer |
| Autoplay | Server-owned legal decision logic |
| Security | Rate limiting, action sequence validation, ownership validation |
| Logging | Append-only match event log for debugging/replay later |

---

# 14. Required UI States

| State | Required UI behavior |
|---|---|
| Room Lobby | Invite code, player slots, mode, ready status |
| Deployment | Own quadrant only; secret placement; 60-second timer |
| Waiting for deployment | Do not reveal enemy readiness details beyond safe status |
| Own Turn | 30-second timer, cards, resources, legal targeting |
| Opponent Turn | Public action updates only; do not leak coordinates or scans |
| Teammate Turn | In 2v2, show teammate public actions and shared intelligence updates |
| Autoplay | Public label; update board through legal actions only |
| Elimination | Remove player turns; preserve public status |
| Surrender Pending | 2v2 teammate confirmation prompt |
| Storm Collapse | Unsafe rings, round warning, Global Scan control |
| Match Result | Winner, eliminations, public timeline, rematch/invite option |

---

# 15. Build Order

## Prerequisite

Offline prototype acceptance tests must pass first.

## Multiplayer Patch 1 — Local Four-Player Simulation

- Run four player states in one browser session for developer testing.
- Implement 24x24 quadrants, fixed turn order, private per-player views, deployment lock, CP, and elimination.
- Add no network code yet.

**Pass condition:** no player view leaks another player’s hidden ship location, hand, or private scan data.

## Multiplayer Patch 2 — 1v1v1v1 Server Room

- Add invite-only server room.
- Add authoritative deployment and per-player filtered state.
- Add live 30-second timer.
- Add reconnect and Autoplay.
- Add FFA elimination and Storm Collapse.

**Pass condition:** four browser clients can finish a match without hidden-state leak, invalid action, or turn desynchronization.

## Multiplayer Patch 3 — 2v2 Rules

- Add teams and symmetrical quadrant assignment.
- Share legally acquired intelligence within team only.
- Add team surrender-pending state.
- Validate team victory condition.

**Pass condition:** teammate receives shared sensor result, enemy does not; both teammate surrender confirmations are required.

## Deferred After v0

- Public matchmaking.
- Rating/Elo.
- Chat.
- Friends list.
- Spectators.
- Cosmetics.
- Replay sharing.
- Ranked rules.
- Capture-the-flag mode.
- Infiltration/cross-border movement.

---

# 16. Multiplayer v0 Acceptance Tests

## Hidden Information

- A player’s browser never receives another player’s hidden coordinates, hand, ammunition, mines, decoys, or private sensor result.
- 2v2 teammates receive shared legal intelligence immediately.
- FFA opponents do not receive coordinates from public log messages.
- A decoy is indistinguishable from a ship until damaged.

## Turn System

- All players deploy secretly before turn order begins.
- Server rolls initiative once and preserves fixed turn order.
- Each active player receives 30 seconds.
- CP carries over but cannot exceed 6.
- Voluntary skip and timeout apply only to active player and use correct skip cost.
- No effect can skip another player’s entire turn.
- Support platforms refresh only after a full round.

## Victory and Fairness

- FFA ends when only one player has surviving ships.
- 2v2 ends when both opposing fleets are sunk.
- One teammate cannot surrender the whole team unilaterally.
- Storm Collapse produces no ammunition refill and reveals no permanent exact positions.
- All resource theft/discard limits are enforced.

## Networking

- Invalid client action requests are rejected server-side.
- A disconnect activates Autoplay only after grace period.
- Autoplay cannot access opponent hidden state.
- Rejoining player regains control at next legal boundary.
- Four browsers stay synchronized through an entire match.

---

# 17. Final Builder Instruction

Build **local four-player simulation first**, then invite-only 1v1v1v1, then 2v2.

Do not start with public itch.io matchmaking, chat, ranked mode, 2v2 coordination systems, or additional cards. If hidden-state filtering, timer synchronization, or disconnect recovery fails, stop and fix that before adding gameplay content.
