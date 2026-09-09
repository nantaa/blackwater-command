/**
 * Blackwater Command — Multi-Cell Movement & AI Bounds TDD Test Suite
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
console.log(' Blackwater Command — Movement & AI Bounds Test');
console.log('====================================================\n');

const html = fs.readFileSync(path.join(__dirname, '..', 'blackwater-command.html'), 'utf8');

const elementStore = {};
function getOrCreateEl(id) {
  if (!elementStore[id]) {
    elementStore[id] = {
      id,
      textContent: '',
      innerHTML: '',
      style: {},
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); },
        toggle(c, v) { if (v) this.classes.add(c); else this.classes.delete(c); }
      },
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      getContext: () => ({
        fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, clearRect() {},
        moveTo() {}, lineTo() {}, closePath() {}, setLineDash() {}, save() {}, restore() {},
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        measureText: () => ({ width: 10 })
      }),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 544, height: 544 })
    };
  }
  return elementStore[id];
}

const mockDocument = {
  getElementById: (id) => getOrCreateEl(id),
  documentElement: { clientWidth: 1080, clientHeight: 1920 },
  querySelectorAll: () => [],
  addEventListener: () => {}
};

const mockWindow = {
  innerWidth: 1080,
  innerHeight: 1920,
  addEventListener: () => {}
};

const scriptContent = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const sandbox = {
  document: mockDocument,
  window: mockWindow,
  console: console,
  setTimeout: () => {},
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  AudioContext: null,
  webkitAudioContext: null
};

const context = vm.createContext(sandbox);
vm.runInContext(scriptContent, context);

console.log('--- Test Suite 1: Single-Player Multi-Cell Movement Validation ---');

it('isValidShipMove validates full multi-cell footprint against sector boundaries', () => {
  vm.runInContext(`initGame(42);`, context);
  const G = vm.runInContext(`G`, context);
  assert(G, 'Game state must be initialized');

  // Flagship is horizontal (length 3).
  // Target x=8, y=5 -> cells are (8,5), (9,5), (10,5).
  // x=10 is enemy territory (Cols K-T). isValidShipMove must return false!
  const valid8 = vm.runInContext(`isValidShipMove(8, 5, 'flagship', 'H');`, context);
  assert.strictEqual(valid8, false, 'Moving flagship so segment enters enemy territory must be invalid');

  // Target x=9, y=5 -> cells are (9,5), (10,5), (11,5).
  const valid9 = vm.runInContext(`isValidShipMove(9, 5, 'flagship', 'H');`, context);
  assert.strictEqual(valid9, false, 'Moving flagship to Column J with H orientation must be invalid');

  // Moving 2-cell Patrol boat to x=9, y=5 (H) -> cells are (9,5) and (10,5).
  const validPat9 = vm.runInContext(`isValidShipMove(9, 5, 'patrol', 'H');`, context);
  assert.strictEqual(validPat9, false, 'Moving patrol boat to Column J with H orientation must be invalid');
});

console.log('\n--- Test Suite 2: Enemy AI Micro-Movement Bounds & Multi-Cell Sync ---');

it('Enemy micro-movement stays in Hostile sector and resyncs all ship cells', () => {
  vm.runInContext(`initGame(42);`, context);
  const G = vm.runInContext(`G`, context);
  const eFlag = G.eFleet[0];
  assert(eFlag, 'Enemy flagship must exist');

  // Set enemy flagship to border (x=10, y=5)
  eFlag.pos = { x: 10, y: 5 };
  eFlag.cells = vm.runInContext(`getShipCells('eflag', 10, 5, G.eFleet[0].orient || 'H');`, context);

  // Trigger doReport 10 times to test micro-movement
  for (let i = 0; i < 10; i++) {
    vm.runInContext(`doReport();`, context);
    // Verify ALL segments of all alive enemy ships remain in Hostile Sector (x >= 10)
    for (const s of G.eFleet) {
      if (!s.alive) continue;
      assert(s.cells && s.cells.length > 0, `Enemy ship ${s.id} must have populated cells array`);
      for (const cell of s.cells) {
        assert(cell.x >= 10, `Enemy ship segment at (${cell.x},${cell.y}) crossed into Allied territory (< 10)`);
        assert(cell.x < 20 && cell.y >= 0 && cell.y < 20, `Enemy ship segment (${cell.x},${cell.y}) out of grid bounds`);
      }
      // Verify s.pos matches anchor cell (s.cells[0])
      assert.strictEqual(s.pos.x, s.cells[0].x, `s.pos.x must match s.cells[0].x`);
      assert.strictEqual(s.pos.y, s.cells[0].y, `s.pos.y must match s.cells[0].y`);
    }
  }
});

console.log('====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================\n');
