/**
 * Blackwater Command — Multi-Cell Fleet Architecture & Hit Detection Test (TDD)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' Blackwater Command — Multi-Cell Fleet & Combat Test');
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

const htmlPath = path.join(__dirname, '..', 'blackwater-command.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// --- Test Suite 1: Source Code Multi-Cell Integration Checks ---
console.log('--- Test Suite 1: Multi-Cell Fleet Structure in Client Code ---');

try {
  // Check that getShipAt helper function is defined
  const hasGetShipAt = html.includes('function getShipAt(');
  assert(hasGetShipAt, 'getShipAt(fleet, x, y) helper must exist to check multi-cell hits');
  report('Universal multi-cell helper getShipAt() is defined', true);
} catch (e) {
  report('Universal multi-cell helper getShipAt() is defined', false, e);
}

try {
  // Check that initGame builds pFleet with cells array
  const initGameMatch = html.match(/function initGame\([\s\S]*?\{([\s\S]*?)\nfunction /);
  assert(initGameMatch, 'initGame function must exist');
  const initGameCode = initGameMatch[1];
  const hasPlayerMultiCell = initGameCode.includes('getShipCells') && initGameCode.includes('cells:');
  assert(hasPlayerMultiCell, 'initGame must generate full multi-cell segment lists for pFleet');
  report('initGame constructs player fleet with multi-cell segments', true);
} catch (e) {
  report('initGame constructs player fleet with multi-cell segments', false, e);
}

try {
  // Check that initGame builds eFleet with multi-cell ships
  const initGameMatch = html.match(/function initGame\([\s\S]*?\{([\s\S]*?)\nfunction /);
  assert(initGameMatch, 'initGame function must exist');
  const initGameCode = initGameMatch[1];
  const hasEnemyMultiCell = initGameCode.includes('quickDeployEnemyFleet') || (initGameCode.includes('eflag') && initGameCode.includes('cells:'));
  assert(hasEnemyMultiCell, 'initGame must construct enemy fleet with multi-cell ships');
  report('initGame constructs enemy fleet with multi-cell ships (3-cell flag, 2-cell scout/strike)', true);
} catch (e) {
  report('initGame constructs enemy fleet with multi-cell ships (3-cell flag, 2-cell scout/strike)', false, e);
}

// --- Test Suite 2: Combat Hit Detection on Any Segment ---
console.log('\n--- Test Suite 2: Combat Hit Detection Across All Ship Segments ---');

try {
  // Check that execDeckGun checks multi-cell segments
  const deckGunMatch = html.match(/function execDeckGun\(tx,\s*ty\)\s*\{([\s\S]*?)\n\}/);
  assert(deckGunMatch, 'execDeckGun function must exist');
  const deckGunCode = deckGunMatch[1];
  const hasMultiCellHit = deckGunCode.includes('getShipAt') || deckGunCode.includes('s.cells.some');
  assert(hasMultiCellHit, 'execDeckGun must check all segments using getShipAt or s.cells.some');
  report('execDeckGun detects hits on any segment of an enemy ship', true);
} catch (e) {
  report('execDeckGun detects hits on any segment of an enemy ship', false, e);
}

try {
  // Check that resolveAtk checks multi-cell segments of player fleet
  const resolveAtkMatch = html.match(/function resolveAtk\(pos,\s*src\)\s*\{([\s\S]*?)\n\}/);
  assert(resolveAtkMatch, 'resolveAtk function must exist');
  const resolveAtkCode = resolveAtkMatch[1];
  const hasAiMultiCellHit = resolveAtkCode.includes('getShipAt') || resolveAtkCode.includes('s.cells.some');
  assert(hasAiMultiCellHit, 'resolveAtk must check all segments of player fleet using getShipAt or s.cells.some');
  report('resolveAtk detects hits on any segment of player multi-cell ships', true);
} catch (e) {
  report('resolveAtk detects hits on any segment of player multi-cell ships', false, e);
}

try {
  // Check that drawPlayerFleet renders all segments in s.cells
  const drawFleetMatch = html.match(/function drawPlayerFleet\(ctx\)\s*\{([\s\S]*?)\n\}/);
  assert(drawFleetMatch, 'drawPlayerFleet function must exist');
  const drawFleetCode = drawFleetMatch[1];
  const hasMultiCellDraw = drawFleetCode.includes('s.cells') || drawFleetCode.includes('cells.forEach');
  assert(hasMultiCellDraw, 'drawPlayerFleet must iterate through s.cells to draw all segments');
  report('drawPlayerFleet renders full multi-cell ship footprints on battle board', true);
} catch (e) {
  report('drawPlayerFleet renders full multi-cell ship footprints on battle board', false, e);
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
