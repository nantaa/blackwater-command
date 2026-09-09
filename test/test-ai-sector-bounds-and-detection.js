/**
 * Blackwater Command — AI Sector Bounds & Flagship Detection TDD Test Suite
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
console.log(' Blackwater Command — AI Bounds & Detection TDD');
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
  assert: assert,
  setTimeout: () => {},
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  AudioContext: null,
  webkitAudioContext: null
};

const context = vm.createContext(sandbox);
vm.runInContext(scriptContent, context);

console.log('--- Test Suite 1: AI Attack & Scan Sector Boundaries ---');

it('AI never attacks cells in Hostile territory (x >= 10)', () => {
  // Test across 50 simulated battle seeds and multiple turns where Allied prob is drained
  for (let seed = 100; seed <= 150; seed++) {
    vm.runInContext(`initGame(${seed});`, context);
    const G = vm.runInContext('G', context);
    
    // Drain player side probabilities so low-evidence search triggers
    for (let y = 0; y < G.prob.length; y++) {
      for (let x = 0; x < 10; x++) {
        G.prob[y][x] = 0.0001;
      }
    }
    
    for (let t = 1; t <= 5; t++) {
      G.turn = t;
      const acts = vm.runInContext('aiDecide(buildEv(), G.prob);', context);
      for (const act of acts) {
        if (act.type === 'atk') {
          assert(act.pos.x < 10, `Seed ${seed} Turn ${t}: AI attempted to attack x=${act.pos.x} (>= 10)! Reason: ${act.reason}`);
          assert(act.pos.x >= 0, `Seed ${seed} Turn ${t}: AI attack x out of bounds (${act.pos.x})`);
        }
      }
    }
  }
});

it('AI scan center and footprint stays strictly inside Allied territory (x < 10)', () => {
  for (let seed = 200; seed <= 230; seed++) {
    vm.runInContext(`initGame(${seed});`, context);
    const G = vm.runInContext('G', context);
    for (let t = 1; t <= 5; t++) {
      G.turn = t;
      const acts = vm.runInContext('aiDecide(buildEv(), G.prob);', context);
      for (const act of acts) {
        if (act.type === 'scan') {
          assert(act.pos.x <= 8, `AI scan center x must be <= 8, got: ${act.pos.x}`);
          assert(act.pos.x >= 1, `AI scan center x must be >= 1, got: ${act.pos.x}`);
        }
      }
    }
  }
});

console.log('\n--- Test Suite 2: Enemy Fleet Spawning & Movement Boundaries ---');

it('Enemy fleet ships spawn strictly in Hostile sector (x >= 10)', () => {
  for (let seed = 300; seed <= 350; seed++) {
    vm.runInContext(`initGame(${seed});`, context);
    const G = vm.runInContext('G', context);
    assert(G.eFleet && G.eFleet.length >= 3, 'Enemy fleet must have at least 3 ships');
    for (const s of G.eFleet) {
      assert(s.cells.every(c => c.x >= 10), `Enemy ship ${s.id} in seed ${seed} has segment in Allied sector: ${JSON.stringify(s.cells)}`);
    }
  }
});

it('Enemy ship micro-movement never crosses into Allied sector (x < 10)', () => {
  vm.runInContext('initGame(82222);', context);
  const G = vm.runInContext('G', context);
  for (let turn = 1; turn <= 40; turn++) {
    vm.runInContext('doReport();', context);
    for (const s of G.eFleet) {
      if (s.alive && s.cells) {
        assert(s.cells.every(c => c.x >= 10), `Turn ${turn}: Enemy ship ${s.id} moved into Allied sector: ${JSON.stringify(s.cells)}`);
      }
    }
  }
});

console.log('\n--- Test Suite 3: Revealed Water Ship Detection ---');

it('Enemy ship in cleared water (G.revealed) is automatically detected and marked CONF', () => {
  vm.runInContext(`
    initGame(82222);
    // Enemy flagship is at {x: 10, y: 8}, {x: 11, y: 8}, {x: 12, y: 8}
    const flag = G.eFleet.find(s => s.id === 'eflag');
    assert.strictEqual(flag.cs, CS.UNK, 'Initially enemy flagship is UNK');
    // Reveal one of its water cells as if scanned or patrolled
    G.revealed.add('10,8');
    render();
  `, context);
  const flag = vm.runInContext('G.eFleet.find(s => s.id === "eflag");', context);
  const CS = vm.runInContext('CS', context);
  assert.strictEqual(flag.cs, CS.CONF, `Enemy ship in revealed water must be detected as CONF, got: ${flag.cs}`);
});

it('Enemy ship micro-moving into previously revealed water triggers contact notice and CONF status', () => {
  vm.runInContext(`
    initGame(99999);
    const scout = G.eFleet.find(s => s.id === 'escout');
    scout.cs = CS.UNK;
    // Mark target cell as revealed by player earlier
    const targetCell = { x: scout.pos.x + 1, y: scout.pos.y };
    G.revealed.add(targetCell.x + ',' + targetCell.y);
    // Simulate move into target cell
    scout.pos = { ...targetCell };
    scout.cells = getShipCells(scout.id, targetCell.x, targetCell.y, scout.orient || 'H');
    render();
  `, context);
  const scout = vm.runInContext('G.eFleet.find(s => s.id === "escout");', context);
  const CS = vm.runInContext('CS', context);
  assert.strictEqual(scout.cs, CS.CONF, `Ship moving into revealed cell must be detected as CONF, got: ${scout.cs}`);
});

console.log('====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================\n');
