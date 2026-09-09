/**
 * Blackwater Command — 1v1 Multi-Cell Fleet & Turn Order TDD Test Suite
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
console.log(' Blackwater Command — 1v1 Multi-Cell & Turn Order');
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

console.log('--- Test Suite 1: Multi-Cell Fleet Hydration in 1v1 ---');

it('init1v1OnlineBattle hydrates multi-cell ships (3 cells for Flagship, 2 for Patrol & Minelayer)', () => {
  const sample1v1State = {
    seed: 1788944,
    mySector: 'P1',
    activePlayerId: 'p1',
    myFleet: [
      { id: 'flagship', name: 'DESTROYER', x: 8, y: 12, orient: 'V', len: 3, hp: 20, maxHp: 20, alive: true, cells: [{ x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 }] },
      { id: 'patrol', name: 'PAT.BOAT', x: 8, y: 17, orient: 'H', len: 2, hp: 8, maxHp: 8, alive: true, cells: [{ x: 8, y: 17 }, { x: 9, y: 17 }] },
      { id: 'minelayer', name: 'MINELAYER', x: 6, y: 14, orient: 'H', len: 2, hp: 10, maxHp: 10, alive: true, cells: [{ x: 6, y: 14 }, { x: 7, y: 14 }] }
    ]
  };

  context.sample1v1State = sample1v1State;
  vm.runInContext('init1v1OnlineBattle(sample1v1State);', context);
  const G = vm.runInContext('G', context);

  const flag = G.pFleet.find(s => s.id === 'flagship');
  const pat = G.pFleet.find(s => s.id === 'patrol');
  const mine = G.pFleet.find(s => s.id === 'minelayer');

  assert(flag && flag.cells && flag.cells.length === 3, `Flagship must have 3 cells, got: ${flag && flag.cells ? flag.cells.length : 'none'}`);
  assert(pat && pat.cells && pat.cells.length === 2, `Patrol Boat must have 2 cells, got: ${pat && pat.cells ? pat.cells.length : 'none'}`);
  assert(mine && mine.cells && mine.cells.length === 2, `Minelayer must have 2 cells, got: ${mine && mine.cells ? mine.cells.length : 'none'}`);
});

it('sync1v1OnlineBattle preserves multi-cell segments on battle updates', () => {
  const updateState = {
    seed: 1788944,
    mySector: 'P1',
    activePlayerId: 'p1',
    myFleet: [
      { id: 'flagship', name: 'DESTROYER', x: 8, y: 12, orient: 'V', len: 3, hp: 15, maxHp: 20, alive: true, cells: [{ x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 }] },
      { id: 'patrol', name: 'PAT.BOAT', x: 8, y: 17, orient: 'H', len: 2, hp: 8, maxHp: 8, alive: true, cells: [{ x: 8, y: 17 }, { x: 9, y: 17 }] },
      { id: 'minelayer', name: 'MINELAYER', x: 6, y: 14, orient: 'H', len: 2, hp: 10, maxHp: 10, alive: true, cells: [{ x: 6, y: 14 }, { x: 7, y: 14 }] }
    ]
  };

  context.updateState = updateState;
  vm.runInContext('sync1v1OnlineBattle(updateState);', context);
  const G = vm.runInContext('G', context);
  const flag = G.pFleet.find(s => s.id === 'flagship');
  assert(flag && flag.cells && flag.cells.length === 3, `Synced Flagship must retain 3 cells, got: ${flag && flag.cells ? flag.cells.length : 'none'}`);
});

console.log('\n--- Test Suite 2: Multi-Cell Attack Hit Detection in 1v1 Engine ---');

const MP = require(path.join(__dirname, '..', 'src', 'mp-engine.js'));

it('Ballistic Missile splash damage hits opponent multi-cell ship segment', () => {
  const match = MP.create1v1Match(1788944, { id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' });
  const p1 = match.players.find(p => p.id === 'p1');
  const p2 = match.players.find(p => p.id === 'p2');

  // Place P2 patrol boat at { x: 17, y: 17 } and { x: 18, y: 17 } (R18 and S18)
  p2.fleet = [
    { id: 'flagship', name: 'Flagship', x: 16, y: 0, orient: 'H', len: 3, hp: 20, maxHp: 20, alive: true, cells: [{ x: 16, y: 0 }, { x: 17, y: 0 }, { x: 18, y: 0 }] },
    { id: 'patrol', name: 'Patrol Boat', x: 17, y: 17, orient: 'H', len: 2, hp: 8, maxHp: 8, alive: true, cells: [{ x: 17, y: 17 }, { x: 18, y: 17 }] },
    { id: 'minelayer', name: 'Minelayer', x: 15, y: 14, orient: 'H', len: 2, hp: 10, maxHp: 10, alive: true, cells: [{ x: 15, y: 14 }, { x: 16, y: 14 }] }
  ];
  p2.deployed = true;
  match.phase = 'BATTLE_ACTIVE';
  match.activePlayerId = 'p1';

  // Give P1 a ballistic missile card
  p1.hand = ['torpedo_line'];
  p1.cp = 3;

  // P1 strikes at Q18: { x: 16, y: 17 }. Splash radius includes East arm: { x: 17, y: 17 } (R18)!
  const res = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'torpedo_line',
    target: { x: 16, y: 17 }
  });

  assert(res.success, `Action execution must succeed, got error: ${res.error}`);
  assert(match.hits.p1.length > 0, 'Match hits for P1 must contain at least 1 hit entry');
  const hit = match.hits.p1.find(h => h.shipId === 'patrol');
  assert(hit, 'Patrol Boat must be hit by splash arm at (17, 17)');
  assert.strictEqual(hit.dmg, 3, 'Splash damage must deal 3 damage');
  assert.strictEqual(p2.fleet.find(s => s.id === 'patrol').hp, 5, 'Patrol Boat HP should be 8 - 3 = 5');
});

console.log('\n--- Test Suite 3: 1v1 Turn Order & END_TURN ---');

it('Playing an action in 1v1 duel does NOT prematurely flip activePlayerId', () => {
  const match = MP.create1v1Match(1788944, { id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' });
  const p1 = match.players.find(p => p.id === 'p1');
  p1.hand = ['deck_gun', 'torpedo_line'];
  p1.cp = 3;
  match.phase = 'BATTLE_ACTIVE';
  match.activePlayerId = 'p1';

  // Play Deck Gun at (12, 5)
  MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 12, y: 5 }
  });

  // After playing 1 card, P1 still has 2 CP and turn should NOT flip until END_TURN
  assert.strictEqual(match.activePlayerId, 'p1', 'Active player should remain p1 after playing a card');
  assert.strictEqual(p1.cp, 2, 'P1 CP should be deducted to 2');
});

it('Sending END_TURN advances active turn from p1 to p2 and replenishes CP', () => {
  const match = MP.create1v1Match(1788944, { id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' });
  const p2 = match.players.find(p => p.id === 'p2');
  p2.cp = 1;
  match.phase = 'BATTLE_ACTIVE';
  match.activePlayerId = 'p1';

  // MP.end1v1Turn(match, 'p1') advances turn
  if (typeof MP.end1v1Turn === 'function') {
    MP.end1v1Turn(match, 'p1');
  } else {
    // Or via endMPTurn
    MP.endMPTurn(match, 'p1');
  }

  assert.strictEqual(match.activePlayerId, 'p2', 'Active player must advance to p2');
  assert(p2.cp >= 3, `p2 CP should be replenished (+2 to 1 = 3), got: ${p2.cp}`);
});

console.log('====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================\n');
