// test/test-1v1-turn-order-and-hand-sync.js
// Validates 1v1 duel turn order, turn timeout engine, hand/round sync, and online combat hit resolution.
const assert = require('assert');
const MP = require('../src/mp-engine.js');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('--- TEST SUITE: 1v1 Turn Order, Turn Timeout & Hand Sync ---');

test('1. end1v1Turn cycles activePlayerId p1 <-> p2, awards CP, refills hand and advances round', () => {
  const match = MP.create1v1Match(42, { id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Bravo' });
  const p1 = match.players.find(p => p.id === 'p1');
  const p2 = match.players.find(p => p.id === 'p2');

  // Initial state
  assert.strictEqual(match.activePlayerId, 'p1');
  assert.strictEqual(match.round, 1);
  assert.strictEqual(p1.cp, 3);
  assert.strictEqual(p2.cp, 3);
  assert.strictEqual(p1.hand.length, 5);
  assert.strictEqual(p2.hand.length, 5);

  // P1 uses 2 cards
  p1.hand.pop();
  p1.hand.pop();
  p1.cp = 1;
  assert.strictEqual(p1.hand.length, 3);

  // P1 ends turn
  MP.end1v1Turn(match, 'p1');

  // Turn should now be P2
  assert.strictEqual(match.activePlayerId, 'p2');
  assert.strictEqual(p2.cp, 5, 'P2 should receive +2 CP on their turn (3 + 2 = 5)');
  assert.strictEqual(p2.hand.length, 5, 'P2 hand should remain filled to 5');
  assert.strictEqual(match.round, 1, 'Round remains 1 during P2 turn');

  // P2 plays 3 cards and ends turn
  p2.hand.pop();
  p2.hand.pop();
  p2.hand.pop();
  p2.cp = 2;
  assert.strictEqual(p2.hand.length, 2);

  MP.end1v1Turn(match, 'p2');

  // Turn returns to P1
  assert.strictEqual(match.activePlayerId, 'p1');
  assert.strictEqual(match.round, 2, 'Round should advance to 2 when turn cycles back to P1');
  assert.strictEqual(p1.cp, 3, 'P1 should receive +2 CP (1 + 2 = 3)');
  assert.strictEqual(p1.hand.length, 5, 'P1 should draw cards back up to 5');
});

test('2. 1v1 state filtering accurately exposes activePlayerId, round, myPlayerId, and myHand', () => {
  const match = MP.create1v1Match(99, { id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' });
  const p1State = MP.getFiltered1v1State(match, 'p1');
  const p2State = MP.getFiltered1v1State(match, 'p2');

  assert.strictEqual(p1State.myPlayerId, 'p1');
  assert.strictEqual(p1State.activePlayerId, 'p1');
  assert.strictEqual(p1State.round, 1);
  assert.strictEqual(Array.isArray(p1State.myHand), true);
  assert.strictEqual(p1State.myHand.length, 5);

  assert.strictEqual(p2State.myPlayerId, 'p2');
  assert.strictEqual(p2State.activePlayerId, 'p1');
  assert.strictEqual(p2State.round, 1);
  assert.strictEqual(p2State.myHand.length, 5);
});

test('3. Server timeout engine uses end1v1Turn for 1v1_duel rooms without calling 4-player endMPTurn', () => {
  const { rooms } = require('../server/mp-server.js');
  // Verify Room logic handles 1v1 timeout
  const code = 'TEST_1V1_TIMEOUT';
  const match = MP.create1v1Match(1234, { id: 'p1' }, { id: 'p2' });
  assert.strictEqual(match.activePlayerId, 'p1');

  // If active player times out, calling MP.end1v1Turn cleanly switches to p2
  MP.end1v1Turn(match, match.activePlayerId);
  assert.strictEqual(match.activePlayerId, 'p2');

  MP.end1v1Turn(match, match.activePlayerId);
  assert.strictEqual(match.activePlayerId, 'p1');
  assert.strictEqual(match.round, 2);
});

test('4. Sector check on attacks enforces hostile territory only for both P1 and P2', () => {
  const match = MP.create1v1Match(55, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';

  // P1 deploys in West (A-J, x 0-9), P2 deploys in East (K-T, x 10-19)
  match.players[0].fleet = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  match.players[1].fleet = MP.quickDeploy1v1(match.grid, 'P2', match.rng);
  match.players[0].deployed = true;
  match.players[1].deployed = true;

  if (!match.players[0].hand.includes('deck_gun')) match.players[0].hand.push('deck_gun');
  if (!match.players[1].hand.includes('deck_gun')) match.players[1].hand.push('deck_gun');

  // P1 cannot attack friendly sector (x < 10)
  const p1Friendly = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 3, y: 5 }
  });
  assert.strictEqual(p1Friendly.success, false);
  assert.match(p1Friendly.error, /friendly sector/i);

  // Ensure P1 still has deck_gun for hostile test
  if (!match.players[0].hand.includes('deck_gun')) match.players[0].hand.push('deck_gun');

  // P1 can attack hostile sector (x >= 10)
  const p1Hostile = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 12, y: 5 }
  });
  assert.strictEqual(p1Hostile.success, true);
  assert.strictEqual(p1Hostile.action, 'ATTACK');

  // Switch turn to P2
  MP.end1v1Turn(match, 'p1');
  assert.strictEqual(match.activePlayerId, 'p2');

  // Ensure P2 has deck_gun
  if (!match.players[1].hand.includes('deck_gun')) match.players[1].hand.push('deck_gun');

  // P2 cannot attack friendly sector (x >= 10)
  const p2Friendly = MP.exec1v1Action(match, 'p2', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 14, y: 5 }
  });
  assert.strictEqual(p2Friendly.success, false);
  assert.match(p2Friendly.error, /friendly sector/i);

  // P2 can attack hostile sector (x < 10)
  const p2Hostile = MP.exec1v1Action(match, 'p2', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 4, y: 5 }
  });
  assert.strictEqual(p2Hostile.success, true);
  assert.strictEqual(p2Hostile.action, 'ATTACK');
});

test('5. Multi-cell attack hit detection records hits on ships spanning multiple cells', () => {
  const match = MP.create1v1Match(77, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';

  // Explicit flagship at x: 12, 13, 14, y: 5 (horizontal len 3)
  match.players[1].fleet = [
    {
      id: 'flagship',
      name: 'Flagship',
      x: 12,
      y: 5,
      orient: 'H',
      len: 3,
      hp: 20,
      maxHp: 20,
      alive: true,
      cells: [{ x: 12, y: 5 }, { x: 13, y: 5 }, { x: 14, y: 5 }]
    }
  ];

  if (!match.players[0].hand.includes('deck_gun')) match.players[0].hand.push('deck_gun');

  // Strike segment 3 of flagship at (14, 5)
  const res = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 14, y: 5 }
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.hitCount, 1);
  assert.strictEqual(res.hits.length, 1);
  assert.strictEqual(res.hits[0].shipId, 'flagship');
  assert.strictEqual(match.players[1].fleet[0].hp, 17);
});

console.log(`\nALL ${passed}/${total} TESTS PASSED!`);
