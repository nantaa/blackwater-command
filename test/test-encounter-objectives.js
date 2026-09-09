/**
 * Blackwater Command — Campaign Encounter Objectives TDD Test Suite
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
console.log(' Blackwater Command — Encounter Objectives Test');
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

console.log('--- Test Suite 1: Encounter Setup & Dynamic Objective Display ---');

it('Convoy Raid encounter sets objective text and spawns hostile transport ship', () => {
  vm.runInContext(`
    const enc1 = (typeof setupEncounter === 'function') ? setupEncounter(getRun(), 'Convoy Raid') : (RouteEngine.setupEncounter ? RouteEngine.setupEncounter(getRun(), 'Convoy Raid') : null);
    initGame(42, null, null, enc1);
  `, context);

  const G = vm.runInContext('G', context);
  assert(G, 'Game state must exist');
  assert(G.encounter, 'G.encounter must be attached');
  assert.strictEqual(G.encounter.archetype, 'Convoy Raid');

  // Check if transport ship exists in G.eFleet
  const transport = G.eFleet.find(s => s.id === 'transport');
  assert(transport, 'Convoy Raid must spawn an enemy transport ship in G.eFleet');
  assert.strictEqual(transport.alive, true, 'Transport ship must be alive');

  // Check dynamic HUD objective display
  const pnlTmr = getOrCreateEl('pnl-tmr').innerHTML;
  assert(pnlTmr.includes('CONVOY') || pnlTmr.includes('Transport'), `HUD objective must reflect Convoy Raid, got: ${pnlTmr}`);
});

it('Sinking the transport ship in Convoy Raid triggers victory', () => {
  vm.runInContext(`
    const enc2 = (typeof setupEncounter === 'function') ? setupEncounter(getRun(), 'Convoy Raid') : (RouteEngine.setupEncounter ? RouteEngine.setupEncounter(getRun(), 'Convoy Raid') : null);
    initGame(42, null, null, enc2);
    const tr = G.eFleet.find(s => s.id === 'transport');
    if (tr) { tr.hp = 0; tr.alive = false; }
    checkVic();
  `, context);

  const G = vm.runInContext('G', context);
  assert.strictEqual(G.result, 'vic', 'Sinking transport in Convoy Raid must trigger victory');
});

it('Transport escaping after designated turns triggers defeat in Convoy Raid', () => {
  vm.runInContext(`
    const enc3 = (typeof setupEncounter === 'function') ? setupEncounter(getRun(), 'Convoy Raid') : (RouteEngine.setupEncounter ? RouteEngine.setupEncounter(getRun(), 'Convoy Raid') : null);
    initGame(42, null, null, enc3);
    G.turn = 6; // Exceeds turnsToEscape (5)
    checkVic();
  `, context);

  const G = vm.runInContext('G', context);
  assert.strictEqual(G.result, 'def', 'Transport escaping after turnsToEscape must trigger defeat');
});

console.log('====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================\n');
