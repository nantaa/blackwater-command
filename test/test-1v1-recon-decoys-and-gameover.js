// test/test-1v1-recon-decoys-and-gameover.js
// TDD Test Suite: 1v1 Decoy Buoys, Authoritative Recon (Sector Sweep, Patrol Plane, Thermal Wake), Game Over, and Heatmap Normalization.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const MP = require('../src/mp-engine.js');

let passed = 0;
let total = 0;

function it(name, fn) {
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

console.log('--- TEST SUITE: 1v1 Decoys, Server Recon, Game Over & Heatmap ---');

it('1. decoy_buoy can be deployed in friendly waters and is stored in match.decoys', () => {
  const match = MP.create1v1Match(101, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';
  match.players[0].hand = ['decoy_buoy', 'deck_gun'];

  // P1 deploys decoy in friendly sector (West: x < 10)
  const res = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'decoy_buoy',
    target: { x: 4, y: 8 }
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, 'DECOY');
  assert.strictEqual(match.decoys['p1'].length, 1);
  assert.strictEqual(match.decoys['p1'][0].x, 4);
  assert.strictEqual(match.decoys['p1'][0].y, 8);

  // Filtered state for P1 contains myDecoys
  const p1State = MP.getFiltered1v1State(match, 'p1');
  assert.strictEqual(p1State.myDecoys.length, 1);
  assert.strictEqual(p1State.myDecoys[0].x, 4);

  // Filtered state for opponent P2 DOES NOT leak decoy coordinates
  const p2State = MP.getFiltered1v1State(match, 'p2');
  assert.strictEqual(p2State.myDecoys.length, 0);
  assert.strictEqual(p2State.opponent.decoys, undefined);
});

it('2. narrow_sonar, sector_sweep, and patrol_plane detect Decoy Buoys as positive contacts', () => {
  const match = MP.create1v1Match(102, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';
  match.players[0].hand = ['narrow_sonar', 'sector_sweep', 'patrol_plane'];
  match.players[1].fleet = []; // Empty fleet to isolate decoy test
  match.decoys['p2'] = [{ x: 14, y: 8 }]; // P2 placed decoy at (14, 8)

  // P1 narrow sonar horizontal through row 8 covering (12..16, 8)
  const sonarRes = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'narrow_sonar',
    target: { x: 14, y: 8, orient: 'H' }
  });
  assert.strictEqual(sonarRes.success, true);
  assert.strictEqual(sonarRes.contacts, 1, 'Narrow sonar must count Decoy Buoy as 1 contact');

  // P1 sector sweep 4x4 covering x: 12..15, y: 6..9
  match.players[0].hand.push('sector_sweep');
  const sweepRes = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'sector_sweep',
    target: { x: 12, y: 6 }
  });
  assert.strictEqual(sweepRes.success, true);
  assert.strictEqual(sweepRes.contacts, 1, 'Sector sweep must count Decoy Buoy as 1 contact');
  assert.strictEqual(sweepRes.cells.length, 16);

  // P1 patrol plane 5x5 covering x: 12..16, y: 6..10
  match.players[0].hand.push('patrol_plane');
  const planeRes = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'patrol_plane',
    target: { x: 12, y: 6 }
  });
  assert.strictEqual(planeRes.success, true);
  assert.strictEqual(planeRes.contacts, 1, 'Patrol plane must detect Decoy Buoy as contact');
  assert.strictEqual(planeRes.cells.length, 25);
});

it('3. Direct weapon strike on Decoy Buoy destroys the decoy and signals bait taken', () => {
  const match = MP.create1v1Match(103, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';
  match.players[0].hand = ['deck_gun'];
  match.decoys['p2'] = [{ x: 15, y: 7 }];

  const atkRes = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 15, y: 7 }
  });

  assert.strictEqual(atkRes.success, true);
  assert.strictEqual(atkRes.decoyHit, true, 'Strike on decoy cell must report decoyHit');
  assert.strictEqual(match.decoys['p2'].length, 0, 'Decoy must be neutralized and removed from server state');
});

it('4. sector_sweep scans 4x4 zone authoritatively and returns true contact count', () => {
  const match = MP.create1v1Match(104, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';
  match.players[0].hand = ['sector_sweep'];
  // Opponent flagship at (12, 4), (13, 4), (14, 4)
  match.players[1].fleet = [
    {
      id: 'flagship',
      name: 'Flagship',
      x: 12,
      y: 4,
      orient: 'H',
      len: 3,
      hp: 20,
      maxHp: 20,
      alive: true,
      cells: [{ x: 12, y: 4 }, { x: 13, y: 4 }, { x: 14, y: 4 }]
    }
  ];

  // Scan 4x4 at x: 11..14, y: 3..6 (captures all 3 flagship segments)
  const res = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'sector_sweep',
    target: { x: 11, y: 3 }
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, 'RECON');
  assert.strictEqual(res.contacts, 1, 'Sector sweep reports 1 ship contact present in area');
  assert.strictEqual(res.cells.length, 16);
});

it('5. patrol_plane reveals 5x5 zone and identifies confirmed ship names', () => {
  const match = MP.create1v1Match(105, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';
  match.players[0].hand = ['patrol_plane'];
  match.players[1].fleet = [
    {
      id: 'flagship',
      name: 'Destroyer Flagship',
      x: 12,
      y: 4,
      orient: 'H',
      len: 3,
      hp: 20,
      maxHp: 20,
      alive: true,
      cells: [{ x: 12, y: 4 }, { x: 13, y: 4 }, { x: 14, y: 4 }]
    }
  ];

  const res = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'patrol_plane',
    target: { x: 11, y: 2 }
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, 'RECON');
  assert.strictEqual(res.contacts, 1);
  assert.strictEqual(Array.isArray(res.confirmedShips), true);
  assert.strictEqual(res.confirmedShips.length, 1);
  assert.strictEqual(res.confirmedShips[0].id, 'flagship');
});

it('6. thermal_wake checks previous turn ship movement trail authoritatively', () => {
  const match = MP.create1v1Match(106, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';
  match.players[0].hand = ['thermal_wake'];
  match.players[1].fleet = [
    {
      id: 'patrol',
      name: 'Patrol Boat',
      x: 15,
      y: 10,
      prevPos: { x: 14, y: 10 },
      orient: 'H',
      len: 2,
      hp: 8,
      maxHp: 8,
      alive: true,
      cells: [{ x: 15, y: 10 }, { x: 16, y: 10 }]
    }
  ];

  // Check previous position (14, 10)
  const wakeTrue = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'thermal_wake',
    target: { x: 14, y: 10 }
  });
  assert.strictEqual(wakeTrue.success, true);
  assert.strictEqual(wakeTrue.trailFound, true, 'Thermal wake must detect previous position');

  // Check random untouched cell (18, 2)
  match.players[0].hand.push('thermal_wake');
  const wakeFalse = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'thermal_wake',
    target: { x: 18, y: 2 }
  });
  assert.strictEqual(wakeFalse.success, true);
  assert.strictEqual(wakeFalse.trailFound, false, 'No trail should be found in unvisited cell');
});

it('7. Game Over sets phase to FINISHED and records winnerId on flagship sinking', () => {
  const match = MP.create1v1Match(107, { id: 'p1' }, { id: 'p2' });
  match.phase = 'BATTLE_ACTIVE';
  match.players[0].hand = ['deck_gun'];
  match.players[1].fleet = [
    {
      id: 'flagship',
      name: 'Destroyer Flagship',
      x: 12,
      y: 5,
      orient: 'H',
      len: 3,
      hp: 3, // 1 hit left
      maxHp: 20,
      alive: true,
      cells: [{ x: 12, y: 5 }, { x: 13, y: 5 }, { x: 14, y: 5 }]
    }
  ];

  const res = MP.exec1v1Action(match, 'p1', {
    type: 'PLAY_CARD',
    cardId: 'deck_gun',
    target: { x: 12, y: 5 }
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(match.phase, 'FINISHED');
  assert.strictEqual(match.winnerId, 'p1');

  const p1State = MP.getFiltered1v1State(match, 'p1');
  const p2State = MP.getFiltered1v1State(match, 'p2');
  assert.strictEqual(p1State.phase, 'FINISHED');
  assert.strictEqual(p1State.winnerId, 'p1');
  assert.strictEqual(p2State.phase, 'FINISHED');
  assert.strictEqual(p2State.winnerId, 'p1');
});

it('8. Heatmap formula with uniform baseline pBase produces t = 0 (no red flooding)', () => {
  const validCellCount = 188;
  const pBase = 1 / validCellCount;
  const pUniform = pBase;
  const maxP = pBase;

  // Normalized intensity above baseline
  function calcHeatIntensity(p, base, max) {
    if (max <= base * 1.05) return 0; // Pure baseline: no heat
    return Math.max(0, (p - base) / Math.max(0.0001, max - base));
  }

  assert.strictEqual(calcHeatIntensity(pUniform, pBase, maxP), 0, 'Uniform prior must produce 0 heat');

  // Spiked cell (decoy or hit)
  const pSpike = 0.35;
  const newMax = 0.35;
  const intensity = calcHeatIntensity(pSpike, pBase, newMax);
  assert(intensity > 0.95, 'Spiked cell must produce near maximum heat');

  const unspikedIntensity = calcHeatIntensity(pBase, pBase, newMax);
  assert.strictEqual(unspikedIntensity, 0, 'Baseline cells must stay at 0 heat even when another cell spikes');
});

it('9. Client HTML renderTmr() displays 1v1 online timer and hides heatmap toggle', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'blackwater-command.html'), 'utf8');
  const elementStore = {};
  function getEl(id) {
    if (!elementStore[id]) {
      elementStore[id] = {
        id,
        innerHTML: '',
        textContent: '',
        style: {},
        classList: { classes: new Set(), add() {}, remove() {} },
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => ({
          fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, clearRect() {},
          moveTo() {}, lineTo() {}, closePath() {}, setLineDash() {}, save() {}, restore() {},
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
          measureText: () => ({ width: 10 })
        }),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 544, height: 544 }),
        querySelectorAll: () => []
      };
    }
    return elementStore[id];
  }
  const sandbox = {
    document: { getElementById: getEl, querySelectorAll: () => [], addEventListener: () => {} },
    window: { innerWidth: 1080, innerHeight: 1920, addEventListener: () => {} },
    console: console,
    setTimeout: () => {},
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {}
  };
  const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/)[1];
  const ctx = vm.createContext(sandbox);
  vm.runInContext(scriptMatch, ctx);

  vm.runInContext(`
    initGame(1234);
    G.isOnline1v1 = true;
    G.onlineTimer = 22;
    renderTmr();
  `, ctx);

  const tmrHtml = getEl('pnl-tmr').innerHTML;
  assert(tmrHtml.includes('22s'), 'HUD must display live 22s online timer');
  assert(!tmrHtml.includes('heat-btn'), 'HUD must NOT render heatmap toggle during 1v1 duel');
});

it('10. Client HTML 1v1 FINISHED state presents RETURN TO BRIDGE button and debrief flow', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'blackwater-command.html'), 'utf8');
  const elementStore = {};
  function getEl(id) {
    if (!elementStore[id]) {
      elementStore[id] = {
        id,
        innerHTML: '',
        textContent: '',
        style: {},
        classList: { classes: new Set(), add() {}, remove() {} },
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => ({
          fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, clearRect() {},
          moveTo() {}, lineTo() {}, closePath() {}, setLineDash() {}, save() {}, restore() {},
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
          measureText: () => ({ width: 10 })
        }),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 544, height: 544 }),
        querySelectorAll: () => []
      };
    }
    return elementStore[id];
  }
  const sandbox = {
    document: { getElementById: getEl, querySelectorAll: () => [], addEventListener: () => {} },
    window: { innerWidth: 1080, innerHeight: 1920, addEventListener: () => {} },
    console: console,
    setTimeout: () => {},
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {}
  };
  const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/)[1];
  const ctx = vm.createContext(sandbox);
  vm.runInContext(scriptMatch, ctx);

  vm.runInContext(`
    initGame(1234);
    G.isOnline1v1 = true;
    G.phase = 'FINISHED';
    renderTmr();
  `, ctx);

  const tmrHtml = getEl('pnl-tmr').innerHTML;
  assert(tmrHtml.includes('RETURN TO BRIDGE'), 'Finished 1v1 match must display RETURN TO BRIDGE button');
  assert(tmrHtml.includes('leave1v1Duel()'), 'Button must call leave1v1Duel() to exit match cleanly');
});

console.log(`\nALL ${passed}/${total} TESTS PASSED!`);
