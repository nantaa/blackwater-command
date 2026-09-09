/**
 * Blackwater Command — Tactical 1v1 Online Engine Tests (20x10 Dual-Sector)
 */

const assert = require('assert');

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
console.log(' Blackwater Command — Tactical 1v1 Engine Test Suite');
console.log('====================================================\n');

let MP;
try {
  MP = require('../src/mp-engine.js');
} catch (e) {
  console.log('  [NOTE] mp-engine.js failed to load: ' + e.message);
  MP = {};
}

// ----------------------------------------------------
// TEST SUITE 1: 20x10 Dual-Sector Grid & Geometry
// ----------------------------------------------------
console.log('--- Test Suite 1: 20x10 Grid & Sector Boundaries ---');

it('DUEL_CONSTANTS defines 20x20 grid with A-T columns', () => {
  assert(MP.DUEL_CONSTANTS !== undefined, 'DUEL_CONSTANTS must be defined');
  assert.strictEqual(MP.DUEL_CONSTANTS.GW, 20, 'GW must be 20');
  assert.strictEqual(MP.DUEL_CONSTANTS.GH, 20, 'GH must be 20');
  assert.strictEqual(MP.DUEL_CONSTANTS.COLS.length, 20, 'COLS must have 20 characters');
  assert.strictEqual(MP.DUEL_CONSTANTS.COLS[0], 'A');
  assert.strictEqual(MP.DUEL_CONSTANTS.COLS[19], 'T');
});

it('SECTORS_1V1 defines P1 (West A-J) and P2 (East K-T)', () => {
  assert(MP.SECTORS_1V1 !== undefined, 'SECTORS_1V1 must be defined');
  assert.deepStrictEqual(MP.SECTORS_1V1.P1, {
    x0: 0, x1: 9, y0: 0, y1: 19,
    colStart: 'A', colEnd: 'J', rowStart: 1, rowEnd: 20
  });
  assert.deepStrictEqual(MP.SECTORS_1V1.P2, {
    x0: 10, x1: 19, y0: 0, y1: 19,
    colStart: 'K', colEnd: 'T', rowStart: 1, rowEnd: 20
  });
});

it('gen1v1Grid produces exactly 20 rows and 20 columns with valid landmass', () => {
  assert(typeof MP.gen1v1Grid === 'function', 'gen1v1Grid must be a function');
  const rng = MP.mkRng(7741);
  const grid = MP.gen1v1Grid(rng);
  assert.strictEqual(grid.length, 20, 'Must have 20 rows');
  assert.strictEqual(grid[0].length, 20, 'Must have 20 columns');

  let islands = 0;
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      if (grid[y][x] === MP.T.ISLAND) islands++;
    }
  }
  const islandRatio = islands / 200;
  assert(islandRatio < 0.35, `Islands ratio must be < 35% (got ${(islandRatio * 100).toFixed(1)}%)`);
});

// ----------------------------------------------------
// TEST SUITE 2: Ship Placement & Sector Validation
// ----------------------------------------------------
console.log('\n--- Test Suite 2: 1v1 Ship Placement Validation ---');

it('Rejects Player 1 ship placed outside West Sector (x >= 10)', () => {
  assert(typeof MP.validate1v1Placement === 'function', 'validate1v1Placement required');
  const rng = MP.mkRng(100);
  const grid = MP.gen1v1Grid(rng);
  const invalidShips = [
    { id: 'flagship', x: 9, y: 2, orient: 'H' } // Spills into x=10, 11
  ];
  const res = MP.validate1v1Placement(grid, 'p1', invalidShips);
  assert.strictEqual(res.valid, false);
  assert(res.error.includes('outside assigned sector') || res.error.includes('bounds'));
});

it('Rejects Player 2 ship placed outside East Sector (x < 10)', () => {
  const rng = MP.mkRng(100);
  const grid = MP.gen1v1Grid(rng);
  const invalidShips = [
    { id: 'flagship', x: 9, y: 2, orient: 'H' } // x=9 is West sector
  ];
  const res = MP.validate1v1Placement(grid, 'p2', invalidShips);
  assert.strictEqual(res.valid, false);
});

it('quickDeploy1v1 generates 100% legal placements for both P1 and P2', () => {
  assert(typeof MP.quickDeploy1v1 === 'function', 'quickDeploy1v1 required');
  const rng = MP.mkRng(500);
  const grid = MP.gen1v1Grid(rng);

  const p1Fleet = MP.quickDeploy1v1(grid, 'p1', rng);
  const p1Val = MP.validate1v1Placement(grid, 'p1', p1Fleet);
  assert(p1Val.valid, `P1 quick deploy must be legal: ${p1Val.error}`);

  const p2Fleet = MP.quickDeploy1v1(grid, 'p2', rng);
  const p2Val = MP.validate1v1Placement(grid, 'p2', p2Fleet);
  assert(p2Val.valid, `P2 quick deploy must be legal: ${p2Val.error}`);
});

// ----------------------------------------------------
// TEST SUITE 3: 1v1 Match Creation & State Transitions
// ----------------------------------------------------
console.log('\n--- Test Suite 3: 1v1 Match Creation & Zero-Leak Filtering ---');

it('create1v1Match initializes 2 players with correct sectors and resources', () => {
  assert(typeof MP.create1v1Match === 'function', 'create1v1Match required');
  const match = MP.create1v1Match(42, { id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Bravo' });
  assert.strictEqual(match.mode, '1v1_duel');
  assert.strictEqual(match.GW, 20);
  assert.strictEqual(match.GH, 20);
  assert.strictEqual(match.players.length, 2);
  assert.strictEqual(match.players[0].id, 'p1');
  assert.strictEqual(match.players[0].sector, 'P1');
  assert.strictEqual(match.players[1].id, 'p2');
  assert.strictEqual(match.players[1].sector, 'P2');
  assert.strictEqual(match.phase, 'DEPLOY');
});

it('Zero-Leak: getFiltered1v1State completely hides unrevealed opponent ships and hands', () => {
  assert(typeof MP.getFiltered1v1State === 'function', 'getFiltered1v1State required');
  const match = MP.create1v1Match(42, { id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Bravo' });
  const rng = MP.mkRng(42);
  match.players[0].fleet = MP.quickDeploy1v1(match.grid, 'p1', rng);
  match.players[1].fleet = MP.quickDeploy1v1(match.grid, 'p2', rng);
  match.phase = 'BATTLE_ACTIVE';

  const p1View = MP.getFiltered1v1State(match, 'p1');
  assert.strictEqual(p1View.myPlayerId, 'p1');
  assert(Array.isArray(p1View.myFleet), 'P1 view must have own fleet');
  assert.strictEqual(p1View.opponent.fleet, undefined, 'P1 view must NEVER contain opponent fleet array');
  assert.strictEqual(p1View.opponent.hand, undefined, 'P1 view must NEVER contain opponent hand');

  // Verify JSON serialization contains 0 enemy coordinates
  const json = JSON.stringify(p1View);
  const p2FlagPos = match.players[1].fleet.find(s => s.id === 'flagship').cells[0];
  assert(!json.includes(`"x":${p2FlagPos.x},"y":${p2FlagPos.y}`), 'Zero-leak: opponent ship coords must not exist in view payload');
});

// ----------------------------------------------------
// TEST SUITE 4: Midline Movement Restriction
// ----------------------------------------------------
console.log('\n--- Test Suite 4: Midline Movement Border Rule ---');

it('Rejects movement card crossing into enemy territory', () => {
  assert(typeof MP.exec1v1Action === 'function', 'exec1v1Action required');
  const match = MP.create1v1Match(42, { id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Bravo' });
  const rng = MP.mkRng(42);
  match.players[0].fleet = MP.quickDeploy1v1(match.grid, 'p1', rng);
  match.players[1].fleet = MP.quickDeploy1v1(match.grid, 'p2', rng);
  match.phase = 'BATTLE_ACTIVE';
  match.activePlayerId = 'p1';
  match.players[0].hand = ['flank_speed'];
  match.players[0].cp = 3;

  // Attempt move to Column L (x=11, enemy sector)
  const illegalMove = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'flank_speed',
    target: { x: 11, y: 5 }
  });

  assert.strictEqual(illegalMove.success, false, 'Moving to x=11 must fail for P1');
  assert(illegalMove.error.includes('sector') || illegalMove.error.includes('border') || illegalMove.error.includes('restricted'));
  assert.strictEqual(match.players[0].cp, 3, 'CP must be preserved');
  assert(match.players[0].hand.includes('flank_speed'), 'Card must remain in hand');
});

// ----------------------------------------------------
// TEST SUITE 5: Combat & Victory
// ----------------------------------------------------
console.log('\n--- Test Suite 5: Combat & Flagship Sinking ---');

it('Sinking opponent flagship declares victory for survivor', () => {
  const match = MP.create1v1Match(42, { id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Bravo' });
  const rng = MP.mkRng(42);
  match.players[0].fleet = MP.quickDeploy1v1(match.grid, 'p1', rng);
  match.players[1].fleet = MP.quickDeploy1v1(match.grid, 'p2', rng);
  match.phase = 'BATTLE_ACTIVE';
  match.activePlayerId = 'p1';
  match.players[0].hand = ['torpedo_line']; // Ballistic missile
  match.players[0].cp = 3;

  const p2Flag = match.players[1].fleet.find(s => s.id === 'flagship');
  const targetCell = p2Flag.cells[0];

  // Set HP to 4 so 5-damage missile sinks it
  p2Flag.hp = 4;

  const strike = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'torpedo_line',
    target: { x: targetCell.x, y: targetCell.y }
  });

  assert.strictEqual(strike.success, true);
  assert.strictEqual(p2Flag.hp, 0);
  assert.strictEqual(p2Flag.alive, false);
  assert.strictEqual(match.phase, 'FINISHED');
  assert.strictEqual(match.winnerId, 'p1');
});

// ----------------------------------------------------
// TEST SUITE 6: Default Basic Strike (Deck Gun) & Infinite Sonar Ammo
// ----------------------------------------------------
console.log('\n--- Test Suite 6: Default Basic Strike & Infinite Sonar Ammo ---');

it('deck_gun card exists with 1 CP, 0 ammo cost, and deals 3 single-cell dmg', () => {
  assert(MP.MP_CARDS !== undefined && MP.MP_CARDS.deck_gun !== undefined, 'deck_gun card definition required in MP_CARDS');
  const dg = MP.MP_CARDS.deck_gun;
  assert.strictEqual(dg.cp, 1);
  assert.strictEqual(dg.tgt, 'SINGLE');
  assert.strictEqual(dg.dmg, 3);
  assert.deepStrictEqual(dg.ammo || {}, {});
});

it('narrow_sonar requires 0 ammo charges (infinite sonar charges)', () => {
  assert(MP.MP_CARDS !== undefined && MP.MP_CARDS.narrow_sonar !== undefined, 'narrow_sonar definition required');
  const ns = MP.MP_CARDS.narrow_sonar;
  assert.deepStrictEqual(ns.ammo || {}, {});
});

it('exec1v1Action executes deck_gun striking single cell for 3 damage without splash', () => {
  const match = MP.create1v1Match(100, { id: 'p1' }, { id: 'p2' });
  const rng = MP.mkRng(100);
  match.players[0].fleet = MP.quickDeploy1v1(match.grid, 'p1', rng);
  match.players[1].fleet = MP.quickDeploy1v1(match.grid, 'p2', rng);
  match.phase = 'BATTLE_ACTIVE';
  match.activePlayerId = 'p1';
  match.players[0].hand = ['deck_gun'];
  match.players[0].cp = 2;

  const targetShip = match.players[1].fleet[0];
  const targetPt = targetShip.cells[0];
  const initialHp = targetShip.hp;

  const res = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: targetPt.x, y: targetPt.y }
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(targetShip.hp, initialHp - 3, 'Deck Gun must deal exactly 3 damage');
  assert.strictEqual(match.players[0].cp, 1, 'Deck Gun must consume 1 CP');
});

console.log('\n====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log(' ALL 1V1 ENGINE TESTS PASSED (GREEN)!\n');
}
