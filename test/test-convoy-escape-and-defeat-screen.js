/**
 * Blackwater Command — Convoy Escape Budget & Defeat Screen TDD Test Suite
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
console.log(' Blackwater Command — Convoy Escape & Defeat UI Test');
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
  setTimeout: () => {},
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  AudioContext: null,
  webkitAudioContext: null
};

const context = vm.createContext(sandbox);
vm.runInContext(scriptContent, context);

console.log('--- Test Suite 1: Convoy Raid Turn Budget & Countdown HUD ---');

it('setupEncounter grants at least 10 turns for Convoy Raid', () => {
  const enc = vm.runInContext(`RouteEngine.setupEncounter(getRun(), 'Convoy Raid');`, context);
  assert(enc, 'Encounter must exist');
  assert(enc.turnsToEscape >= 10, `turnsToEscape must be >= 10, got: ${enc.turnsToEscape}`);
});

it('Turn 6 in Convoy Raid does NOT trigger premature defeat', () => {
  vm.runInContext(`
    const enc = RouteEngine.setupEncounter(getRun(), 'Convoy Raid');
    initGame(83559, null, null, enc);
    G.turn = 6;
    checkVic();
  `, context);
  const G = vm.runInContext('G', context);
  assert.strictEqual(G.result, null, 'Turn 6 should not trigger defeat when budget is 10 turns');
});

it('Turn 11 triggers defeat with reason convoy_escaped', () => {
  vm.runInContext(`
    const enc11 = RouteEngine.setupEncounter(getRun(), 'Convoy Raid');
    initGame(83559, null, null, enc11);
    G.turn = 11;
    checkVic();
  `, context);
  const G = vm.runInContext('G', context);
  assert.strictEqual(G.result, 'def', 'Exceeding turn limit must trigger defeat');
  assert.strictEqual(G.defeatReason, 'convoy_escaped', 'Defeat reason must be convoy_escaped');
});

it('HUD displays active turn countdown for Convoy Raid', () => {
  vm.runInContext(`
    const encHUD = RouteEngine.setupEncounter(getRun(), 'Convoy Raid');
    initGame(83559, null, null, encHUD);
    G.turn = 3;
    renderTmr();
  `, context);
  const pnlTmr = getOrCreateEl('pnl-tmr').innerHTML;
  assert(pnlTmr.includes('left') || pnlTmr.includes('turns remaining') || pnlTmr.includes('8 turns left'),
    `HUD must display turns countdown, got: ${pnlTmr}`);
});

console.log('\n--- Test Suite 2: Contextual Defeat Screen ---');

it('Defeat screen displays CONVOY ESCAPED instead of FLAGSHIP LOST when convoy escapes', () => {
  vm.runInContext(`
    initGame(83559);
    G.pFleet[0].hp = 20; // Flagship is at full health!
    endBattle('def', 'convoy_escaped');
  `, context);

  const defTitle = getOrCreateEl('def-title').innerHTML || getOrCreateEl('def-title').textContent;
  const defBox = getOrCreateEl('scr-def').innerHTML;
  const combined = defTitle + ' ' + defBox;
  assert(combined.includes('CONVOY ESCAPED'), `Defeat screen must display CONVOY ESCAPED, got: ${combined}`);
});

console.log('\n--- Test Suite 3: AI Vision Heatmap Button Rebranding ---');

it('Heatmap toggle button is rebranded as AI VISION', () => {
  vm.runInContext(`
    initGame(83559);
    G.showHeat = false;
    renderTmr();
  `, context);
  const pnlTmr = getOrCreateEl('pnl-tmr').innerHTML;
  assert(pnlTmr.includes('AI VISION'), `Button must be labeled AI VISION, got: ${pnlTmr}`);
});

console.log('====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================\n');
