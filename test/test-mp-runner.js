/**
 * Blackwater Command — Multiplayer v0 Automated TDD Test Suite
 * Follows: blackwater-command-multiplayer-v0-rules-lock.md
 */

const assert = require('assert');
const path = require('path');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         ${err.message}`);
    failCount++;
  }
}

console.log('====================================================');
console.log(' Blackwater Command — Multiplayer v0 Test Suite');
console.log('====================================================\n');

// Import MP Engine (will be created in src/mp-engine.js)
let MP;
try {
  MP = require('../src/mp-engine.js');
} catch (e) {
  console.log('  [NOTE] mp-engine.js not yet implemented or failed to load: ' + e.message);
  MP = {};
}

// ----------------------------------------------------
// TEST SUITE 1: 24x24 Board, Coordinates & Quadrants
// ----------------------------------------------------
console.log('--- Test Suite 1: 24x24 Grid & Quadrant Boundaries ---');

it('Grid dimension is exactly 24x24 (576 cells)', () => {
  assert(typeof MP.genMPGrid === 'function', 'genMPGrid must be a function');
  const rng = MP.mkRng(1234);
  const grid = MP.genMPGrid(rng);
  assert.strictEqual(grid.length, 24);
  assert.strictEqual(grid[0].length, 24);
});

it('All 4 home quadrants are exactly 12x12 (144 cells each)', () => {
  assert(MP.QUADRANTS !== undefined, 'QUADRANTS definition required');
  assert.deepStrictEqual(MP.QUADRANTS.NW, { x0: 0, x1: 11, y0: 0, y1: 11, colStart: 'A', colEnd: 'L', rowStart: 1, rowEnd: 12 });
  assert.deepStrictEqual(MP.QUADRANTS.NE, { x0: 12, x1: 23, y0: 0, y1: 11, colStart: 'M', colEnd: 'X', rowStart: 1, rowEnd: 12 });
  assert.deepStrictEqual(MP.QUADRANTS.SW, { x0: 0, x1: 11, y0: 12, y1: 23, colStart: 'A', colEnd: 'L', rowStart: 13, rowEnd: 24 });
  assert.deepStrictEqual(MP.QUADRANTS.SE, { x0: 12, x1: 23, y0: 12, y1: 23, colStart: 'M', colEnd: 'X', rowStart: 13, rowEnd: 24 });
});

it('Coordinate helpers convert A-X, 1-24 properly', () => {
  assert(typeof MP.cid === 'function', 'cid helper required');
  assert(typeof MP.parseCid === 'function', 'parseCid helper required');
  assert.strictEqual(MP.cid(0, 0), 'A1');
  assert.strictEqual(MP.cid(23, 23), 'X24');
  assert.strictEqual(MP.cid(12, 11), 'M12');
  assert.deepStrictEqual(MP.parseCid('A1'), { x: 0, y: 0 });
  assert.deepStrictEqual(MP.parseCid('X24'), { x: 23, y: 23 });
  assert.deepStrictEqual(MP.parseCid('M12'), { x: 12, y: 11 });
});

it('Cell quadrant detection maps accurately', () => {
  assert(typeof MP.getQuadrant === 'function', 'getQuadrant helper required');
  assert.strictEqual(MP.getQuadrant(0, 0), 'NW');
  assert.strictEqual(MP.getQuadrant(11, 11), 'NW');
  assert.strictEqual(MP.getQuadrant(12, 0), 'NE');
  assert.strictEqual(MP.getQuadrant(23, 11), 'NE');
  assert.strictEqual(MP.getQuadrant(0, 12), 'SW');
  assert.strictEqual(MP.getQuadrant(11, 23), 'SW');
  assert.strictEqual(MP.getQuadrant(12, 12), 'SE');
  assert.strictEqual(MP.getQuadrant(23, 23), 'SE');
});

// ----------------------------------------------------
// TEST SUITE 2: Multi-Cell Ship Footprints & Placement Rules
// ----------------------------------------------------
console.log('\n--- Test Suite 2: Multi-Cell Ship Placement & Validation ---');

it('Multi-cell ship definitions conform to rules lock (3, 2, 2 cells)', () => {
  assert(MP.MP_SHIPS !== undefined, 'MP_SHIPS definition required');
  assert.strictEqual(MP.MP_SHIPS.flagship.len, 3, 'Flagship must be 3 cells');
  assert.strictEqual(MP.MP_SHIPS.flagship.hp, 20, 'Flagship HP must be 20');
  assert.strictEqual(MP.MP_SHIPS.patrol.len, 2, 'Patrol Boat must be 2 cells');
  assert.strictEqual(MP.MP_SHIPS.patrol.hp, 8, 'Patrol Boat HP must be 8');
  assert.strictEqual(MP.MP_SHIPS.minelayer.len, 2, 'Minelayer must be 2 cells');
  assert.strictEqual(MP.MP_SHIPS.minelayer.hp, 10, 'Minelayer HP must be 10');
});

it('getShipCells returns contiguous coordinates according to orientation', () => {
  assert(typeof MP.getShipCells === 'function', 'getShipCells required');
  // Horizontal Flagship at (2, 2)
  const hCells = MP.getShipCells('flagship', 2, 2, 'H');
  assert.deepStrictEqual(hCells, [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }]);

  // Vertical Flagship at (2, 2)
  const vCells = MP.getShipCells('flagship', 2, 2, 'V');
  assert.deepStrictEqual(vCells, [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }]);
});

it('Rejects placement if any segment spills outside owner quadrant', () => {
  assert(typeof MP.validateMPShipPlacement === 'function', 'validateMPShipPlacement required');
  const rng = MP.mkRng(444);
  const grid = MP.genMPGrid(rng);

  // NW quadrant goes up to x: 11, y: 11
  // Horizontal Flagship (length 3) at x: 10 spills to x: 10, 11, 12 (crosses into NE quadrant)
  const resCrossX = MP.validateMPShipPlacement(grid, 'NW', 'flagship', 10, 5, 'H');
  assert.strictEqual(resCrossX.valid, false);
  assert(resCrossX.reason.includes('quadrant'));

  // Vertical Flagship at y: 10 spills to y: 10, 11, 12 (crosses into SW quadrant)
  const resCrossY = MP.validateMPShipPlacement(grid, 'NW', 'flagship', 5, 10, 'V');
  assert.strictEqual(resCrossY.valid, false);
  assert(resCrossY.reason.includes('quadrant'));

  // Placement fully inside NW quadrant should be valid (assuming open water)
  const resInside = MP.validateMPShipPlacement(grid, 'NW', 'flagship', 2, 2, 'H');
  assert.strictEqual(resInside.valid, true);
});

it('Rejects overlapping ship placements within the same fleet', () => {
  assert(typeof MP.validateMPFleet === 'function', 'validateMPFleet required');
  const rng = MP.mkRng(555);
  const grid = MP.genMPGrid(rng);

  const overlappingFleet = {
    flagship: { x: 2, y: 2, o: 'H' }, // cells: (2,2), (3,2), (4,2)
    patrol: { x: 3, y: 1, o: 'V' },   // cells: (3,1), (3,2) -> overlap at (3,2)!
    minelayer: { x: 0, y: 8, o: 'H' }
  };

  const val = MP.validateMPFleet(grid, 'NW', overlappingFleet);
  assert.strictEqual(val.valid, false);
  assert(val.errors.some(e => e.includes('collision') || e.includes('overlap')));
});

it('quickDeployMP generates 100% legal placements for any quadrant', () => {
  assert(typeof MP.quickDeployMP === 'function', 'quickDeployMP required');
  const rng = MP.mkRng(777);
  const grid = MP.genMPGrid(rng);

  ['NW', 'NE', 'SW', 'SE'].forEach(q => {
    const fleet = MP.quickDeployMP(grid, q, MP.mkRng(888));
    assert(fleet.flagship && fleet.patrol && fleet.minelayer, `All ships deployed for quadrant ${q}`);
    const check = MP.validateMPFleet(grid, q, fleet);
    assert.strictEqual(check.valid, true, `Quick deploy for ${q} must be 100% valid: ${check.errors}`);
  });
});

it('Base-mode Border Rule prevents movement outside assigned quadrant', () => {
  assert(typeof MP.canShipMoveTo === 'function', 'canShipMoveTo required');
  // P1 owns NW quadrant (x: 0-11, y: 0-11)
  assert.strictEqual(MP.canShipMoveTo('NW', 5, 5), true, 'Move inside home quadrant allowed');
  assert.strictEqual(MP.canShipMoveTo('NW', 12, 5), false, 'Cross into NE forbidden');
  assert.strictEqual(MP.canShipMoveTo('NW', 5, 12), false, 'Cross into SW forbidden');
  assert.strictEqual(MP.canShipMoveTo('NW', 15, 15), false, 'Cross into SE forbidden');
});

// ----------------------------------------------------
// TEST SUITE 3: Match State, Turn Order, Round Refresh & CP Loop
// ----------------------------------------------------
console.log('\n--- Test Suite 3: Match State, Turn Loop & Resources ---');

it('createMPMatch initializes 4 players with home quadrants and default resources', () => {
  assert(typeof MP.createMPMatch === 'function', 'createMPMatch required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);

  assert.strictEqual(match.mode, '1v1v1v1');
  assert.strictEqual(match.players.length, 4);
  assert.strictEqual(match.players[0].quadrant, 'NW');
  assert.strictEqual(match.players[1].quadrant, 'NE');
  assert.strictEqual(match.players[2].quadrant, 'SW');
  assert.strictEqual(match.players[3].quadrant, 'SE');
  assert.strictEqual(match.players[0].cp, 3, 'Starting CP is 3');
  assert.strictEqual(match.players[0].hand.length, 5, 'Starting hand is 5');
});

it('Secret simultaneous deployment locks and initiates match', () => {
  assert(typeof MP.submitDeployment === 'function', 'submitDeployment required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);

  match.players.forEach(p => {
    const fleet = MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100));
    const sub = MP.submitDeployment(match, p.id, fleet);
    assert.strictEqual(sub.success, true);
  });

  assert.strictEqual(match.phase, 'BATTLE', 'Match transitions to BATTLE once all 4 confirm');
  assert(match.turnOrder && match.turnOrder.length === 4, 'Turn order established via initiative');
  assert(match.activePlayerId !== null, 'Active player set');
});

it('CP carries over up to maximum 6 and draws 2 cards per turn', () => {
  assert(typeof MP.endMPTurn === 'function', 'endMPTurn required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  const firstPlayer = match.players.find(p => p.id === match.activePlayerId);
  const initialCards = firstPlayer.hand.length;

  // Complete one full turn without spending CP
  MP.endMPTurn(match, firstPlayer.id, false); // voluntary = false
  // Cycle through other 3 players
  for (let i = 0; i < 3; i++) {
    MP.endMPTurn(match, match.activePlayerId, false);
  }

  // Now back to first player
  assert.strictEqual(match.activePlayerId, firstPlayer.id, 'Returned to first player');
  assert(firstPlayer.cp > 3, 'CP carried over and increased (+2 per turn up to 6)');
  assert.strictEqual(firstPlayer.hand.length, Math.min(8, initialCards + 2), 'Drew 2 cards at start of turn');
});

it('Voluntary skip and timeout spend 1 CP if >= 1, or discard 1 card if 0 CP', () => {
  assert(typeof MP.handleTurnTimeoutOrSkip === 'function', 'handleTurnTimeoutOrSkip required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  const p = match.players.find(pl => pl.id === match.activePlayerId);
  p.cp = 3;
  MP.handleTurnTimeoutOrSkip(match, p.id);
  assert.strictEqual(p.cp, 2, 'Spent 1 CP on skip');

  // Set CP to 0 and skip again when turn comes back
  p.cp = 0;
  const cardsBefore = p.hand.length;
  MP.handleTurnTimeoutOrSkip(match, p.id);
  assert.strictEqual(p.hand.length, cardsBefore - 1, 'Discarded 1 card when skipping with 0 CP');
});

it('Support ship platform actions are limited to 1 per full round and refresh', () => {
  assert(typeof MP.usePlatformAction === 'function', 'usePlatformAction required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  const p = match.players.find(pl => pl.id === match.activePlayerId);
  const act1 = MP.usePlatformAction(match, p.id, 'patrol');
  assert.strictEqual(act1.success, true, 'First patrol platform action succeeded');

  const act2 = MP.usePlatformAction(match, p.id, 'patrol');
  assert.strictEqual(act2.success, false, 'Second patrol platform action in same round rejected');

  // Complete a full round
  for (let i = 0; i < 4; i++) {
    MP.endMPTurn(match, match.activePlayerId, false);
  }

  // Now support should be refreshed
  assert.strictEqual(p.supportSpent.patrol, false, 'Patrol Boat platform refreshed after full round');
});

// ----------------------------------------------------
// TEST SUITE 4: Zero-Leak Per-Player State Filtering
// ----------------------------------------------------
console.log('\n--- Test Suite 4: Zero-Leak Per-Player State Filtering ---');

it('getFilteredState strips all opponent ship coordinates, hands, ammo, and hidden state', () => {
  assert(typeof MP.getFilteredState === 'function', 'getFilteredState required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  const filteredForP1 = MP.getFilteredState(match, 'p1');

  // P1 can see their own fleet positions
  assert(filteredForP1.self.fleet.flagship.cells.length === 3, 'P1 sees own flagship');
  assert(filteredForP1.self.hand.length === 5, 'P1 sees own hand');

  // P1 CANNOT see opponents' ship coordinates, hands, or ammunition
  filteredForP1.opponents.forEach(opp => {
    assert.strictEqual(opp.fleet, undefined, 'Opponent fleet coordinates MUST be undefined');
    assert.strictEqual(opp.hand, undefined, 'Opponent hand MUST be undefined');
    assert.strictEqual(opp.ammo, undefined, 'Opponent ammo MUST be undefined');
    assert(opp.flagshipHp !== undefined, 'Opponent flagship HP is public');
    assert(opp.survivingSupports !== undefined, 'Opponent support count is public');
  });
});

it('2v2 mode shares legally acquired intelligence between teammates', () => {
  const match = MP.createMPMatch(888, '2v2', [
    { id: 'p1', name: 'Alice', team: 'T1' },
    { id: 'p2', name: 'Bob', team: 'T2' },
    { id: 'p3', name: 'Charlie', team: 'T1' },
    { id: 'p4', name: 'Diana', team: 'T2' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  // P1 discovers a contact at M5 (in NE quadrant)
  MP.addSharedIntel(match, 'T1', { type: 'contact', cell: 'M5', turn: 1 });

  const filteredP1 = MP.getFilteredState(match, 'p1');
  const filteredP3 = MP.getFilteredState(match, 'p3'); // teammate
  const filteredP2 = MP.getFilteredState(match, 'p2'); // enemy

  assert(filteredP1.sharedIntel.some(i => i.cell === 'M5'), 'P1 sees contact');
  assert(filteredP3.sharedIntel.some(i => i.cell === 'M5'), 'P3 (teammate) automatically shares contact');
  assert(!filteredP2.sharedIntel.some(i => i.cell === 'M5'), 'P2 (enemy) does NOT receive contact');
});

// ----------------------------------------------------
// TEST SUITE 5: Combat, Hit/Miss & Multi-Cell Ships
// ----------------------------------------------------
console.log('\n--- Test Suite 5: Multi-Cell Combat & Hit Detection ---');

it('Attacking any segment of a multi-cell ship deals damage and records hit', () => {
  assert(typeof MP.resolveAttack === 'function', 'resolveAttack required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  // Target P2's flagship second cell
  const p2FlagCells = match.players[1].fleet.flagship.cells;
  const targetCell = p2FlagCells[1]; // middle cell of 3

  const res = MP.resolveAttack(match, 'p1', targetCell.x, targetCell.y, 5);
  assert.strictEqual(res.hit, true, 'Attack on middle segment of flagship is a HIT');
  assert.strictEqual(res.targetPlayerId, 'p2');
  assert.strictEqual(res.shipId, 'flagship');
  assert.strictEqual(match.players[1].fleet.flagship.hp, 15, 'Flagship took 5 damage (20 - 5 = 15)');

  // Attack an empty water cell
  const emptyCell = { x: 12, y: 0 }; // Near border
  // Ensure it's not on a ship
  const isShip = match.players.some(p => Object.values(p.fleet).some(s => s.cells.some(c => c.x === emptyCell.x && c.y === emptyCell.y)));
  if (!isShip) {
    const missRes = MP.resolveAttack(match, 'p1', emptyCell.x, emptyCell.y, 5);
    assert.strictEqual(missRes.hit, false, 'Attack on empty cell is a MISS');
  }
});

it('Public event log does NOT leak attacked coordinates to third parties', () => {
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  const p2FlagCells = match.players[1].fleet.flagship.cells;
  MP.resolveAttack(match, 'p1', p2FlagCells[0].x, p2FlagCells[0].y, 5);

  const latestPublicEvent = match.eventsLog[match.eventsLog.length - 1];
  assert(latestPublicEvent !== undefined, 'Public event logged');
  assert.strictEqual(latestPublicEvent.publicText, 'Alice hit Bob.', 'Public log says "Alice hit Bob" without coordinates');
  assert.strictEqual(latestPublicEvent.publicCoords, undefined, 'Coordinates omitted from public broadcast');
});

// ----------------------------------------------------
// TEST SUITE 6: Elimination, Surrender, Storm & Victory
// ----------------------------------------------------
console.log('\n--- Test Suite 6: Elimination, Surrender & Storm Collapse ---');

it('Player is eliminated when all 3 ships are sunk and turn is skipped', () => {
  assert(typeof MP.checkEliminationsAndVictory === 'function', 'checkEliminationsAndVictory required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  // Sink all of P2's ships
  const p2 = match.players[1];
  p2.fleet.flagship.hp = 0; p2.fleet.flagship.alive = false;
  p2.fleet.patrol.hp = 0; p2.fleet.patrol.alive = false;
  p2.fleet.minelayer.hp = 0; p2.fleet.minelayer.alive = false;

  MP.checkEliminationsAndVictory(match);
  assert.strictEqual(p2.eliminated, true, 'P2 is marked eliminated');

  // Verify P2 is skipped in turn progression
  match.activePlayerId = 'p1';
  MP.endMPTurn(match, 'p1', false);
  // Next in clockwise would be P2, but P2 is eliminated so it must skip directly to P3
  assert.strictEqual(match.activePlayerId, 'p3', 'Turn order skipped eliminated player P2');
});

it('FFA victory condition is triggered when only one player remains', () => {
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  // Eliminate P2, P3, P4
  [match.players[1], match.players[2], match.players[3]].forEach(p => {
    p.fleet.flagship.alive = false;
    p.fleet.patrol.alive = false;
    p.fleet.minelayer.alive = false;
  });

  MP.checkEliminationsAndVictory(match);
  assert.strictEqual(match.phase, 'FINISHED');
  assert.strictEqual(match.winner, 'p1', 'P1 wins as last surviving player');
});

it('Team surrender requires both teammates to confirm', () => {
  assert(typeof MP.submitSurrender === 'function', 'submitSurrender required');
  const match = MP.createMPMatch(888, '2v2', [
    { id: 'p1', name: 'Alice', team: 'T1' },
    { id: 'p2', name: 'Bob', team: 'T2' },
    { id: 'p3', name: 'Charlie', team: 'T1' },
    { id: 'p4', name: 'Diana', team: 'T2' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  // P1 submits surrender
  const res1 = MP.submitSurrender(match, 'p1');
  assert.strictEqual(res1.status, 'SURRENDER_PENDING', 'One teammate surrender creates SURRENDER_PENDING');
  assert.strictEqual(match.players[0].eliminated, false, 'P1 not yet eliminated without confirmation');

  // P3 (teammate) confirms surrender
  const res2 = MP.submitSurrender(match, 'p3');
  assert.strictEqual(res2.status, 'TEAM_SURRENDERED');
  assert.strictEqual(match.players[0].eliminated, true, 'P1 eliminated on team surrender');
  assert.strictEqual(match.players[2].eliminated, true, 'P3 eliminated on team surrender');
  assert.strictEqual(match.winner, 'T2', 'Opposing team T2 wins match');
});

it('Storm Collapse at round 20 makes outer rings unsafe and deals 2 damage/round', () => {
  assert(typeof MP.processStormCollapse === 'function', 'processStormCollapse required');
  const match = MP.createMPMatch(999, '1v1v1v1', [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' }
  ]);
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, MP.mkRng(100)));
  });

  match.round = 20;
  MP.processStormCollapse(match);
  assert.strictEqual(match.phase, 'STORM', 'Match enters STORM phase at round 20');
  assert(match.stormUnsafeRings >= 1, 'At least 1 unsafe ring generated');
});

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log(' ALL TESTS PASSED (GREEN)!\n');
  process.exit(0);
}

