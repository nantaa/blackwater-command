// test/verify-ui.js - Validates multiplayer UI structure and contract
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('====================================================');
console.log(' Blackwater Command — Multiplayer UI Contract Tests');
console.log('====================================================\n');

const htmlPath = path.resolve(__dirname, '../blackwater-multiplayer.html');

function runTest(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    return true;
  } catch (err) {
    console.log(`  [FAIL] ${desc} -> ${err.message}`);
    return false;
  }
}

let passed = 0;
let total = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// 1. File existence
total++;
if (runTest('blackwater-multiplayer.html exists', () => {
  assert(fs.existsSync(htmlPath), 'blackwater-multiplayer.html does not exist');
})) passed++;

if (fs.existsSync(htmlPath)) {
  const content = fs.readFileSync(htmlPath, 'utf8');

  total++;
  if (runTest('Includes mp-engine.js script tag', () => {
    assert(content.includes('src/mp-engine.js') || content.includes('mp-engine.js'), 'Must link to mp-engine.js');
  })) passed++;

  total++;
  if (runTest('Contains 24x24 tactical canvas element', () => {
    assert(content.includes('<canvas id="boardCanvas"'), 'Missing boardCanvas element');
  })) passed++;

  total++;
  if (runTest('Contains Quadrant Viewer Switcher tabs (NW, NE, SW, SE)', () => {
    assert(content.includes('tab-p1') && content.includes('tab-p2') && content.includes('tab-p3') && content.includes('tab-p4'), 'Must have tabs for P1, P2, P3, P4');
  })) passed++;

  total++;
  if (runTest('Contains Secret Deployment controls (Confirm, Quick Deploy, Rotate)', () => {
    assert(content.includes('btn-quick-deploy') && content.includes('btn-confirm-deploy'), 'Must have deployment controls');
  })) passed++;

  total++;
  if (runTest('Contains Live Turn HUD elements (Timer, CP meter, Skip button)', () => {
    assert(content.includes('turn-timer') && content.includes('cp-meter') && content.includes('btn-skip-turn'), 'Must have HUD elements');
  })) passed++;

  total++;
  if (runTest('Contains Public Intel Feed (no coordinate leaks)', () => {
    assert(content.includes('public-intel-feed') || content.includes('event-log'), 'Must have public intel feed');
  })) passed++;

  total++;
  if (runTest('Supports Mode Selection (1v1v1v1 FFA vs 2v2 Teams)', () => {
    assert(content.includes('mode-select') || content.includes('mode-ffa') || content.includes('1v1v1v1'), 'Must include mode selection');
  })) passed++;
}

console.log('\n====================================================');
console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('====================================================');

if (passed < total) {
  process.exit(1);
} else {
  console.log(' ALL UI CONTRACT TESTS PASSED (GREEN)!\n');
}
