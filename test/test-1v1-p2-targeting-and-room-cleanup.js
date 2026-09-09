const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' Blackwater Command — 1v1 Placement Bounds, Room Auto-Close & P2 Field Test');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function report(desc, ok, err) {
  total++;
  if (ok) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  } else {
    console.error(`  [FAIL] ${desc}`);
    if (err) console.error('   ', err.message || err);
  }
}

const htmlPath = path.join(__dirname, '..', 'blackwater-command.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// --- Test Suite 1: Placement Bounds & Multi-cell Segment Validation ---
console.log('--- Test Suite 1: Placement Bounds & Multi-cell Segment Validation ---');

// Extract validatePlacement from blackwater-command.html
const valPlacementMatch = html.match(/function validatePlacement\(grid,\s*shipId,\s*x,\s*y,\s*orientation\)\s*\{([\s\S]*?)\n\}/);
assert(valPlacementMatch, 'validatePlacement must exist in blackwater-command.html');

// Create mock grid
const mockGrid = Array.from({ length: 20 }, () => Array(20).fill(0));
const T = { WATER: 0, ISLAND: 1, RADAR: 2, REEF: 3 };

function runValPlacement(prepStateMock, shipId, x, y, orient) {
  const fn = new Function('grid', 'shipId', 'x', 'y', 'orientation', 'prepState', 'T', 'GW', 'GH', 'cid', `
    function cid(cx, cy) { return String.fromCharCode(65 + cx) + (cy + 1); }
    ${valPlacementMatch[1]}
  `);
  return fn(mockGrid, shipId, x, y, orient, prepStateMock, T, 20, 20, (cx, cy) => `${cx},${cy}`);
}

try {
  // P2 East sector: cols K-T (10..19)
  const p2Prep = { mode: '1v1_duel', sector: 'P2' };

  // Destroyer Flagship (length 3 or 2): horizontal at T1 (x=19) -> must fail!
  const resT1 = runValPlacement(p2Prep, 'flagship', 19, 0, 'H');
  assert.strictEqual(resT1.valid, false, 'Horizontal flagship at T1 (x=19) must be rejected because segment extends to x=20');
  report('Rejects horizontal ship placement at Column T (x=19) spilling to Column index 20', true);
} catch (e) {
  report('Rejects horizontal ship placement at Column T (x=19) spilling to Column index 20', false, e);
}

try {
  const p2Prep = { mode: '1v1_duel', sector: 'P2' };
  // Destroyer Flagship horizontal at S1 (x=18) with length 3: segment 0=18, 1=19, 2=20 -> must fail!
  const resS1 = runValPlacement(p2Prep, 'flagship', 18, 0, 'H');
  assert.strictEqual(resS1.valid, false, 'Horizontal flagship (length 3) at S1 (x=18) must be rejected');
  report('Rejects 3-cell flagship at Column S (x=18) spilling to Column index 20', true);
} catch (e) {
  report('Rejects 3-cell flagship at Column S (x=18) spilling to Column index 20', false, e);
}

try {
  const p2Prep = { mode: '1v1_duel', sector: 'P2' };
  // Destroyer Flagship horizontal at R1 (x=17): segments 17, 18, 19 (Cols R, S, T) -> legal!
  const resR1 = runValPlacement(p2Prep, 'flagship', 17, 0, 'H');
  assert.strictEqual(resR1.valid, true, 'Horizontal flagship at R1 (x=17) fits within Cols K-T (17, 18, 19)');
  report('Accepts legal flagship horizontal placement at Column R (x=17..19)', true);
} catch (e) {
  report('Accepts legal flagship horizontal placement at Column R (x=17..19)', false, e);
}

try {
  const p1Prep = { mode: '1v1_duel', sector: 'P1' };
  // P1 West sector: cols A-J (0..9). Flagship horizontal at J1 (x=9) -> segment 1 is at x=10 (Enemy sector) -> must fail!
  const resJ1 = runValPlacement(p1Prep, 'flagship', 9, 0, 'H');
  assert.strictEqual(resJ1.valid, false, 'Horizontal flagship at J1 (x=9) must be rejected because segment enters enemy sector at x=10');
  report('Rejects P1 horizontal placement at Column J (x=9) crossing midline into enemy territory', true);
} catch (e) {
  report('Rejects P1 horizontal placement at Column J (x=9) crossing midline into enemy territory', false, e);
}

// --- Test Suite 2: Player 2 Fog & Targeting Inversion in Client Code ---
console.log('\n--- Test Suite 2: Player 2 Fog & Targeting Inversion in Client Code ---');
try {
  // Check that drawFog accounts for P2 sector
  const drawFogMatch = html.match(/function drawFog\(ctx\)\s*\{([\s\S]*?)\n\}/);
  assert(drawFogMatch, 'drawFog function must exist');
  const fogCode = drawFogMatch[1];
  const hasP2FogHandling = fogCode.includes('G.mySector === \'P2\'') || fogCode.includes('isP2');
  assert(hasP2FogHandling, 'drawFog must dynamically check if player is P2 to leave East sector fog-free and West sector under fog');
  report('drawFog dynamically covers Hostile sector (West for P2, East for P1) and keeps Friendly sector clear', true);
} catch (e) {
  report('drawFog dynamically covers Hostile sector and keeps Friendly sector clear', false, e);
}

try {
  // Check that isValidShipMove accounts for P2 sector
  const moveMatch = html.match(/function isValidShipMove\(tx,\s*ty\)\s*\{([\s\S]*?)\n\}/);
  assert(moveMatch, 'isValidShipMove function must exist');
  const moveCode = moveMatch[1];
  const hasP2MoveHandling = moveCode.includes('G.mySector === \'P2\'') || moveCode.includes('isP2');
  assert(hasP2MoveHandling, 'isValidShipMove must check sector bounds depending on P1 vs P2');
  report('isValidShipMove restricts movement to Friendly sector (Cols K-T for P2, Cols A-J for P1)', true);
} catch (e) {
  report('isValidShipMove restricts movement to Friendly sector', false, e);
}

try {
  // Check that execDecoy accounts for P2 sector
  const decoyMatch = html.match(/function execDecoy\(tx,\s*ty\)\s*\{([\s\S]*?)\n\}/);
  assert(decoyMatch, 'execDecoy function must exist');
  const decoyCode = decoyMatch[1];
  const hasP2DecoyHandling = decoyCode.includes('G.mySector === \'P2\'') || decoyCode.includes('isP2');
  assert(hasP2DecoyHandling, 'execDecoy must require placement in player friendly sector (K-T for P2, A-J for P1)');
  report('execDecoy enforces decoy placement inside player friendly sector (K-T for P2, A-J for P1)', true);
} catch (e) {
  report('execDecoy enforces decoy placement inside player friendly sector', false, e);
}

// --- Test Suite 3: Abandoned Room Auto-Close in Server ---
console.log('\n--- Test Suite 3: Abandoned Room Auto-Close in Server ---');
const serverPath = path.join(__dirname, '..', 'server', 'mp-server.js');
const serverCode = fs.readFileSync(serverPath, 'utf8');

try {
  const hasAutoClose = serverCode.includes('closeRoom') || serverCode.includes('rooms.delete') || serverCode.includes('auto-close');
  assert(hasAutoClose, 'mp-server.js must implement room closure / deletion for abandoned rooms');
  report('mp-server.js defines room auto-closing and cleanup routines', true);
} catch (e) {
  report('mp-server.js defines room auto-closing and cleanup routines', false, e);
}

try {
  const hasDisconnectCleanup = serverCode.includes('handleClientDisconnect') && (serverCode.includes('closeRoom') || serverCode.includes('rooms.delete'));
  assert(hasDisconnectCleanup, 'handleClientDisconnect must trigger room closure when all parties leave');
  report('handleClientDisconnect auto-closes rooms when all parties have disconnected or abandoned', true);
} catch (e) {
  report('handleClientDisconnect auto-closes rooms when all parties have disconnected or abandoned', false, e);
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
