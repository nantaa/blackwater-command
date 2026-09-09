/**
 * Blackwater Command — Attack Sector Restriction Tests (TDD)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' Blackwater Command — Attack Sector Restriction Test');
console.log('====================================================\n');

let total = 0;
let passed = 0;

function report(name, ok, err) {
  total++;
  if (ok) {
    passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    console.log(`  [FAIL] ${name}`);
    if (err) console.error(`    ${err.message || err}`);
  }
}

// Load MP Engine
const MP = require('../src/mp-engine.js');

// --- Test Suite 1: Authoritative Server 1v1 Attack Sector Restrictions ---
console.log('--- Test Suite 1: Server 1v1 Attack Targeting Restrictions ---');

try {
  const match = MP.create1v1Match(
    12345,
    { id: 'p1', name: 'Commander Alpha' },
    { id: 'p2', name: 'Commander Bravo' }
  );

  // Deploy both
  const p1Fleet = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  const p2Fleet = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Fleet });
  MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Fleet });

  assert.strictEqual(match.phase, 'BATTLE_ACTIVE');
  assert.strictEqual(match.activePlayerId, 'p1');
  match.players[0].hand.push('deck_gun');

  // P1 attempts to fire Deck Gun into friendly West sector (x=4, y=5)
  const p1Illegal = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 4, y: 5 }
  });

  assert.strictEqual(p1Illegal.success, false, 'P1 firing on own sector (x=4) must fail');
  assert(p1Illegal.error.includes('friendly') || p1Illegal.error.includes('restricted'), 'Error message must mention friendly sector restriction');
  report('P1 attack targeting friendly sector (x < 10) is rejected by server', true);
} catch (e) {
  report('P1 attack targeting friendly sector (x < 10) is rejected by server', false, e);
}

try {
  const match = MP.create1v1Match(
    12345,
    { id: 'p1', name: 'Commander Alpha' },
    { id: 'p2', name: 'Commander Bravo' }
  );

  const p1Fleet = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  const p2Fleet = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Fleet });
  MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Fleet });
  match.players[0].hand.push('deck_gun');

  // P1 legally fires into East sector (x=14, y=5)
  const p1Legal = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 14, y: 5 }
  });

  assert.strictEqual(p1Legal.success, true, 'P1 firing into enemy sector (x=14) must succeed');
  report('P1 attack targeting hostile sector (x >= 10) is accepted by server', true);
} catch (e) {
  report('P1 attack targeting hostile sector (x >= 10) is accepted by server', false, e);
}

try {
  const match = MP.create1v1Match(
    12345,
    { id: 'p1', name: 'Commander Alpha' },
    { id: 'p2', name: 'Commander Bravo' }
  );

  const p1Fleet = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  const p2Fleet = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Fleet });
  MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Fleet });

  // Set active to P2
  match.activePlayerId = 'p2';
  match.players[1].hand.push('deck_gun');

  // P2 attempts to fire into friendly East sector (x=15, y=5)
  const p2Illegal = MP.exec1v1Action(match, 'p2', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 15, y: 5 }
  });

  assert.strictEqual(p2Illegal.success, false, 'P2 firing on own sector (x=15) must fail');
  assert(p2Illegal.error.includes('friendly') || p2Illegal.error.includes('restricted'), 'Error message must mention friendly sector restriction');
  report('P2 attack targeting friendly sector (x >= 10) is rejected by server', true);
} catch (e) {
  report('P2 attack targeting friendly sector (x >= 10) is rejected by server', false, e);
}

try {
  const match = MP.create1v1Match(
    12345,
    { id: 'p1', name: 'Commander Alpha' },
    { id: 'p2', name: 'Commander Bravo' }
  );

  const p1Fleet = MP.quickDeploy1v1(match.grid, 'P1', match.rng);
  const p2Fleet = MP.quickDeploy1v1(match.grid, 'P2', match.rng);

  MP.exec1v1Action(match, 'p1', { type: 'DEPLOY_FLEET', fleet: p1Fleet });
  MP.exec1v1Action(match, 'p2', { type: 'DEPLOY_FLEET', fleet: p2Fleet });

  // Set active to P2
  match.activePlayerId = 'p2';
  match.players[1].hand.push('deck_gun');

  // P2 legally fires into West sector (x=5, y=5)
  const p2Legal = MP.exec1v1Action(match, 'p2', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 5, y: 5 }
  });

  assert.strictEqual(p2Legal.success, true, 'P2 firing into enemy sector (x=5) must succeed');
  report('P2 attack targeting hostile sector (x < 10) is accepted by server', true);
} catch (e) {
  report('P2 attack targeting hostile sector (x < 10) is accepted by server', false, e);
}

// --- Test Suite 2: Client Code Checks for Attack Restrictions ---
console.log('\n--- Test Suite 2: Client Attack Validation ---');

const htmlPath = path.join(__dirname, '..', 'blackwater-command.html');
const html = fs.readFileSync(htmlPath, 'utf8');

try {
  // Check that execCard enforces hostile sector for direct fire / attacks
  const execCardMatch = html.match(/function execCard\(id,\s*tx,\s*ty\)\s*\{([\s\S]*?)\n\}/);
  assert(execCardMatch, 'execCard function must exist in html');
  const execCode = execCardMatch[1];
  const hasAttackCheck = execCode.includes('Cannot fire into friendly waters') || execCode.includes('friendly waters');
  assert(hasAttackCheck, 'execCard must reject attacks targeting friendly waters');
  report('execCard rejects attacks targeting friendly waters', true);
} catch (e) {
  report('execCard rejects attacks targeting friendly waters', false, e);
}

try {
  // Check that previewCells invalidates or blocks attack preview over friendly water
  const previewMatch = html.match(/function previewCells\(id,\s*hx,\s*hy\)\s*\{([\s\S]*?)\n\}/);
  assert(previewMatch, 'previewCells function must exist in html');
  const previewCode = previewMatch[1];
  const hasPreviewSectorCheck = previewCode.includes('isAttackCard') || previewCode.includes('isAttack') || previewCode.includes('c.fam === \'Direct fire\'') || previewCode.includes('Direct fire');
  assert(hasPreviewSectorCheck, 'previewCells must account for attack sector restriction');
  report('previewCells blocks preview for attack cards hovering over friendly sector', true);
} catch (e) {
  report('previewCells blocks preview for attack cards hovering over friendly sector', false, e);
}

console.log('====================================================');
console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('====================================================\n');

if (passed === total) {
  console.log(' ALL TESTS PASSED (GREEN)!\n');
  process.exit(0);
} else {
  console.log(' TESTS FAILED (RED) — Ready for Implementation.\n');
  process.exit(1);
}
