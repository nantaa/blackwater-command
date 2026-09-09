/**
 * Blackwater Command — 1v1 Combat & Movement Bounds TDD Test Suite
 */

const assert = require('assert');
const MP = require('../src/mp-engine.js');

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
console.log(' Blackwater Command — 1v1 Combat & Movement Bounds');
console.log('====================================================\n');

console.log('--- Test Suite 1: 1v1 Combat Hit Detection on Deployed Fleet ---');

it('create1v1Match initializes eventsLog array', () => {
  const match = MP.create1v1Match(101, { id: 'p1' }, { id: 'p2' });
  assert(Array.isArray(match.eventsLog), 'match.eventsLog must be an array');
});

it('resolveAttack detects hits on deployed fleet when stored as Array or Map', () => {
  const match = MP.create1v1Match(101, { id: 'p1' }, { id: 'p2' });
  const p1Deploy = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  const p2Deploy = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  const r1 = MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Deploy });
  const r2 = MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Deploy });
  assert.strictEqual(r1.success, true);
  assert.strictEqual(r2.success, true);
  assert.strictEqual(match.phase, 'BATTLE_ACTIVE');

  // Find a target cell on P2's flagship
  const p2Flag = (Array.isArray(match.players[1].fleet))
    ? match.players[1].fleet.find(s => s.id === 'flagship')
    : match.players[1].fleet.flagship;

  assert(p2Flag, 'P2 flagship must exist');
  const targetCell = p2Flag.cells[1]; // Hit second segment

  const initialHp = p2Flag.hp;
  const attackRes = MP.resolveAttack(match, 'p1', targetCell.x, targetCell.y, 5);

  assert.strictEqual(attackRes.hit, true, 'Attack on flagship segment must register as hit');
  assert.strictEqual(attackRes.targetShip, 'flagship', 'Target ship must be flagship');
  assert.strictEqual(p2Flag.hp, initialHp - 5, 'Flagship HP must be deducted by 5');
});

console.log('\n--- Test Suite 2: Multi-Cell Movement Bounds in 1v1 Engine ---');

it('Rejects movement when trailing ship segments cross into enemy territory', () => {
  const match = MP.create1v1Match(101, { id: 'p1' }, { id: 'p2' });
  const p1Deploy = [
    { id: 'flagship', x: 2, y: 5, orient: 'H', len: 3, hp: 20, maxHp: 20, alive: true, cells: [{x:2,y:5},{x:3,y:5},{x:4,y:5}] },
    { id: 'patrol', x: 2, y: 8, orient: 'H', len: 2, hp: 8, maxHp: 8, alive: true, cells: [{x:2,y:8},{x:3,y:8}] },
    { id: 'minelayer', x: 2, y: 11, orient: 'H', len: 2, hp: 10, maxHp: 10, alive: true, cells: [{x:2,y:11},{x:3,y:11}] }
  ];
  const p2Deploy = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Deploy });
  MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Deploy });

  // Give P1 go_silent card
  const p1 = match.players[0];
  p1.hand = ['go_silent', 'flank_speed'];
  p1.cp = 3;

  // Move flagship to x=8, y=5. With length 3 and H orientation, segments are (8,5), (9,5), (10,5).
  // x=10 is in P2 territory (Cols K-T). This must be rejected!
  const moveRes = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'go_silent',
    target: { x: 8, y: 5 }
  });

  assert.strictEqual(moveRes.success, false, 'Movement with tail spilling across midline must be rejected');
});

it('Rejects flank_speed when support ship tail crosses into enemy territory', () => {
  const match = MP.create1v1Match(101, { id: 'p1' }, { id: 'p2' });
  const p1Deploy = [
    { id: 'flagship', x: 2, y: 5, orient: 'H', len: 3, hp: 20, maxHp: 20, alive: true, cells: [{x:2,y:5},{x:3,y:5},{x:4,y:5}] },
    { id: 'patrol', x: 2, y: 8, orient: 'H', len: 2, hp: 8, maxHp: 8, alive: true, cells: [{x:2,y:8},{x:3,y:8}] },
    { id: 'minelayer', x: 2, y: 11, orient: 'H', len: 2, hp: 10, maxHp: 10, alive: true, cells: [{x:2,y:11},{x:3,y:11}] }
  ];
  const p2Deploy = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Deploy });
  MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Deploy });

  const p1 = match.players[0];
  p1.hand = ['flank_speed'];
  p1.cp = 3;

  // Move support ship to x=9, y=8. Length 2 and H orientation means cells are (9,8) and (10,8).
  // x=10 is in P2 territory. This must be rejected!
  const moveRes = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'flank_speed',
    target: { x: 9, y: 8 }
  });

  assert.strictEqual(moveRes.success, false, 'Support ship moving with segment across midline must be rejected');
});

console.log('====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================\n');
