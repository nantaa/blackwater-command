// test/test-1v1-prep-and-sync.js — TDD tests for 1v1 battlefield synchronization and deployment preparation
const assert = require('assert');
const MP = require('../src/mp-engine.js');

console.log('====================================================');
console.log(' Blackwater Command — 1v1 Prep & Sync Test Suite');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

// 1. Grid and Seed Determinism
test('Identical seed generates identical 20x20 dual-sector grid', () => {
  const seed = 123456789;
  const match1 = MP.create1v1Match(seed, { id: 'p1' }, { id: 'p2' });
  const match2 = MP.create1v1Match(seed, { id: 'p1' }, { id: 'p2' });

  assert.strictEqual(match1.GW, 20);
  assert.strictEqual(match1.GH, 20);
  assert.strictEqual(match2.GW, 20);
  assert.strictEqual(match2.GH, 20);

  // Deep compare grid tiles
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      assert.strictEqual(match1.grid[y][x], match2.grid[y][x], `Tile mismatch at (${x},${y})`);
    }
  }
});

// 2. Sector Placement Partitioning
test('P1 fleet placement strictly restricted to West Sector (Cols A–J, 0 <= x <= 9)', () => {
  const seed = 99999;
  const match = MP.create1v1Match(seed);
  const p1ValidFleet = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  const valValid = MP.validate1v1Placement(match.grid, 'P1', p1ValidFleet);
  assert.strictEqual(valValid.valid, true, `Expected valid placement: ${valValid.error}`);

  const p1IllegalFleet = JSON.parse(JSON.stringify(p1ValidFleet));
  p1IllegalFleet[0].x = 10; // In East sector!
  p1IllegalFleet[0].cells = MP.getShipCells(p1IllegalFleet[0].id, 10, p1IllegalFleet[0].y, p1IllegalFleet[0].orient);

  const valIllegal = MP.validate1v1Placement(match.grid, 'P1', p1IllegalFleet);
  assert.strictEqual(valIllegal.valid, false, 'Expected illegal placement across border to be rejected');
});

test('P2 fleet placement strictly restricted to East Sector (Cols K–T, 10 <= x <= 19)', () => {
  const seed = 99999;
  const match = MP.create1v1Match(seed);
  const p2ValidFleet = MP.quickDeploy1v1(match.grid, 'P2', match.rng);
  const valValid = MP.validate1v1Placement(match.grid, 'P2', p2ValidFleet);
  assert.strictEqual(valValid.valid, true, `Expected valid placement: ${valValid.error}`);

  const p2IllegalFleet = JSON.parse(JSON.stringify(p2ValidFleet));
  p2IllegalFleet[0].x = 2; // move flagship to West sector
  p2IllegalFleet[0].cells = MP.getShipCells(p2IllegalFleet[0].id, 2, p2IllegalFleet[0].y, p2IllegalFleet[0].orient);

  const valIllegal = MP.validate1v1Placement(match.grid, 'P2', p2IllegalFleet);
  assert.strictEqual(valIllegal.valid, false, 'Expected illegal P2 placement in West sector to be rejected');
});

// 3. Two-phase transition: DEPLOY -> BATTLE_ACTIVE
test('Match stays in DEPLOY phase until BOTH players submit deployment', () => {
  const seed = 88888;
  const match = MP.create1v1Match(seed, { id: 'p1' }, { id: 'p2' });
  assert.strictEqual(match.phase, 'DEPLOY');

  const p1Fleet = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  const p2Fleet = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  // Deploy P1 only
  const res1 = MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Fleet });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(match.phase, 'DEPLOY', 'Match should remain in DEPLOY after only 1 player submits');

  // Attempting combat action while in DEPLOY must fail
  const combatAct = MP.exec1v1Action(match, 'p1', { type: 'PLAY_CARD', cardId: 'narrow_sonar', target: { x: 5, y: 5 } });
  assert.strictEqual(combatAct.success, false, 'Cannot play combat cards during DEPLOY phase');

  // Deploy P2
  const res2 = MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Fleet });
  assert.strictEqual(res2.success, true);
  assert.strictEqual(match.phase, 'BATTLE_ACTIVE', 'Match must advance to BATTLE_ACTIVE once both players deploy');
});

// 4. Zero-Leak State Isolation
test('Filtered 1v1 state never exposes unrevealed opponent coordinates to either player', () => {
  const seed = 77777;
  const match = MP.create1v1Match(seed, { id: 'p1' }, { id: 'p2' });
  const p1Fleet = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  const p2Fleet = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Fleet });
  MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Fleet });

  const p1State = MP.getFiltered1v1State(match, 'p1');
  const p2State = MP.getFiltered1v1State(match, 'p2');

  assert.ok(p1State.myFleet, 'P1 must see own fleet');
  assert.strictEqual(p1State.opponent.fleet, undefined, 'P1 state MUST NOT contain opponent fleet array');
  assert.strictEqual(p1State.opponent.cells, undefined, 'P1 state MUST NOT contain opponent cells');

  assert.ok(p2State.myFleet, 'P2 must see own fleet');
  assert.strictEqual(p2State.opponent.fleet, undefined, 'P2 state MUST NOT contain opponent fleet array');
  assert.strictEqual(p2State.opponent.cells, undefined, 'P2 state MUST NOT contain opponent cells');
});

console.log('\n====================================================');
console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('====================================================');

if (passed === total) {
  console.log(' ALL 1v1 PREP & SYNC TESTS PASSED (GREEN)!\n');
  process.exit(0);
} else {
  console.error(' SOME TESTS FAILED!\n');
  process.exit(1);
}
