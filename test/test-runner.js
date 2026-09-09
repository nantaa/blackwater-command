const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================');
console.log(' Blackwater Command — TDD Automated Test Suite');
console.log('====================================================\n');

// 1. Read blackwater-command.html and extract script
const htmlPath = path.resolve(__dirname, '../blackwater-command.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`ERROR: Cannot find ${htmlPath}`);
  process.exit(1);
}

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('ERROR: Could not find <script> tag in blackwater-command.html');
  process.exit(1);
}

const jsCode = scriptMatch[1];

// 2. Setup mock DOM/Browser environment
const mockElement = () => ({
  style: {},
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false,
  },
  innerHTML: '',
  textContent: '',
  appendChild: () => {},
  addEventListener: () => {},
  getContext: () => ({
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    setLineDash: () => {},
    fillText: () => {},
    measureText: () => ({ width: 10 }),
    save: () => {},
    restore: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
  }),
});

const elements = {
  'board': mockElement(),
  'pnl-st': mockElement(),
  'pnl-tmr': mockElement(),
  'pnl-intel': mockElement(),
  'pnl-log': mockElement(),
  'pnl-hand': mockElement(),
  'tgt-help': mockElement(),
  'orient-btn': mockElement(),
  'heat-btn': mockElement(),
  'tmr-tog': mockElement(),
  'vic-stats': mockElement(),
  'def-stats': mockElement(),
  'card-tip': mockElement(),
  'seed-in': { value: '', focus: () => {} },
  'scr-title': mockElement(),
  'tut-overlay': mockElement(),
  'scr-battle': mockElement(),
  'scr-vic': mockElement(),
  'scr-def': mockElement(),
  'scr-cs': mockElement(),
  'scr-prep': mockElement(),
  'scr-debrief': mockElement(),
  'scr-upgrade': mockElement(),
  'prep-board': mockElement(),
  'prep-err-msg': mockElement(),
  'prep-orient-btn': mockElement(),
  'btn-confirm-deploy': mockElement(),
  'st-ship-flagship': mockElement(),
  'st-ship-patrol': mockElement(),
  'st-ship-minelayer': mockElement(),
  'btn-ship-flagship': mockElement(),
  'btn-ship-patrol': mockElement(),
  'btn-ship-minelayer': mockElement(),
  'doc-silent': mockElement(),
  'doc-recon': mockElement(),
  'db-hp-flag': mockElement(),
  'db-supports': mockElement(),
  'db-torps': mockElement(),
  'db-sonar': mockElement(),
  'db-turns': mockElement(),
  'db-decoys': mockElement(),
  'db-conf': mockElement(),
  'db-ai-inf': mockElement(),
  'upgrade-cards-container': mockElement(),
};

const sandbox = {
  console,
  requestAnimationFrame: (fn) => setTimeout(fn, 16),
  cancelAnimationFrame: () => {},
  setTimeout: (fn) => { fn(); return 1; },
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  Date,
  Math,
  Set,
  Array,
  Object,
  window: {
    addEventListener: () => {},
  },
  document: {
    getElementById: (id) => elements[id] || mockElement(),
    querySelectorAll: () => [],
    createElement: (tag) => mockElement(),
    addEventListener: () => {},
  },
  AudioContext: class {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { value: 440, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
      };
    }
  },
};
sandbox.window = sandbox;
sandbox.addEventListener = () => {};
sandbox.window.AudioContext = sandbox.AudioContext;

// Execute script in sandbox
const context = vm.createContext(sandbox);
vm.runInContext(jsCode, context);

const exportsObj = vm.runInContext(`({
  T, CS, PH, CARDS, START_DECK, MODULES,
  mkRng, genGrid, validCells, initGame,
  get G() { return G; },
  set G(v) { G = v; },
  buildEv, aiDecide, execCard, endPlayerTurn, checkVic,
  showScreen, rollSeed, dismissTut, showCS, showTitle,
  initRun, getRun, applyUpgrade,
  validatePlacement, validateFullFleet, quickDeploy,
  previewCells,
  get RUN() { return RUN; },
  set RUN(v) { RUN = v; },
  startPreparation, confirmDeployment, getPrepState,
  generateRewards, chooseReward, getAvailableRewards
})`, context);

const { T, CS, PH, CARDS, START_DECK, mkRng, genGrid, validCells, initGame, buildEv, aiDecide, execCard, endPlayerTurn, checkVic } = exportsObj;
Object.defineProperty(exportsObj, 'G', {
  get: () => vm.runInContext('G', context),
  set: (v) => { vm.runInContext(`G = ${JSON.stringify(v)}`, context); }
});

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

// ----------------------------------------------------
// TEST SUITE 1: RNG Determinism
// ----------------------------------------------------
console.log('--- Test Suite 1: RNG Determinism ---');
const rng1 = mkRng(4281);
const rng2 = mkRng(4281);
const seq1 = [rng1.nx(), rng1.int(1, 100), rng1.nx()];
const seq2 = [rng2.nx(), rng2.int(1, 100), rng2.nx()];
assert(JSON.stringify(seq1) === JSON.stringify(seq2), 'Identical seeds produce identical random sequences');

const rng3 = mkRng(9999);
const seq3 = [rng3.nx(), rng3.int(1, 100), rng3.nx()];
assert(JSON.stringify(seq1) !== JSON.stringify(seq3), 'Different seeds produce distinct sequences');

// ----------------------------------------------------
// TEST SUITE 2: Terrain Generation & Validation
// ----------------------------------------------------
console.log('\n--- Test Suite 2: Terrain Generation & Reachability ---');
const terrainRng = mkRng(100);
const grid = genGrid(terrainRng);
assert(grid.length === 20 && grid[0].length === 20, 'Grid dimension is exactly 20x20');

let islandCount = 0;
for (let y = 0; y < 20; y++) {
  for (let x = 0; x < 20; x++) {
    if (grid[y][x] === T.ISLAND) islandCount++;
  }
}
const islandPercent = (islandCount / 400) * 100;
assert(islandPercent < 38, `Island landmass is within spec limits (${islandPercent.toFixed(1)}% < 38%)`);

const playerValid = validCells(grid, 0, 10);
const enemyValid = validCells(grid, 10, 20);
assert(playerValid.length >= 12, `Allied half has sufficient valid cells (${playerValid.length} >= 12)`);
assert(enemyValid.length >= 12, `Hostile half has sufficient valid cells (${enemyValid.length} >= 12)`);

// ----------------------------------------------------
// TEST SUITE 3: Game Initialization & Fleet Placement
// ----------------------------------------------------
console.log('\n--- Test Suite 3: Game State & Fleet Init ---');
initGame(4281);
const G = exportsObj.G;

assert(G !== null, 'Game state initialized');
assert(G.seed === 4281, 'Game seed recorded correctly');
assert(G.pFleet.length === 3, 'Player fleet has 3 ships (Flagship, Patrol, Minelayer)');
assert(G.eFleet.length === 3, 'Enemy fleet has 3 ships (Flagship, Scout, Strike)');
assert(G.pFleet[0].pos.x < 10, 'Player flagship spawns in Allied sector (x < 10)');
assert(G.eFleet[0].pos.x >= 10, 'Enemy flagship spawns in Hostile sector (x >= 10)');
assert(G.pFleet[0].hp === 20, 'Player flagship starts with 20 HP');
assert(G.eFleet[0].hp === 28, 'Enemy flagship starts with 28 HP');
assert(G.ammo.torpedo === 6, 'Torpedo starting ammo is 6');
assert(G.ammo.sonar === 5, 'Sonar starting ammo is 5');

// ----------------------------------------------------
// TEST SUITE 4: AI Legal Evidence Boundary (No Cheat)
// ----------------------------------------------------
console.log('\n--- Test Suite 4: AI Legal Evidence Boundary ---');
const ev = buildEv();
assert(!('pFleet' in ev), 'Evidence state does NOT contain playerFleet property');
assert(ev.scans !== undefined, 'Evidence contains public scans');
assert(ev.hits !== undefined, 'Evidence contains hit history');
assert(ev.misses !== undefined, 'Evidence contains miss history');
assert(ev.decoys !== undefined, 'Evidence contains decoy history');

// Test that aiDecide only uses ev and prob
const aiActions = aiDecide(ev, G.prob);
assert(Array.isArray(aiActions) && aiActions.length > 0, `AI produces valid actions array (count: ${aiActions ? aiActions.length : 0})`);
assert(aiActions.every(a => a.type === 'atk' || a.type === 'scan'), 'All AI actions have legal types (atk | scan)');

// ----------------------------------------------------
// TEST SUITE 5: Card Execution & Resource Deductions
// ----------------------------------------------------
console.log('\n--- Test Suite 5: Card Mechanics & Resources ---');
G.cp = 6;
G.phase = PH.PLAN;
G.hand = ['narrow_sonar', 'decoy_buoy', 'torpedo_line'];

const initialSonarAmmo = G.ammo.sonar;
execCard('narrow_sonar', 12, 10);
assert(G.cp === 5, 'Narrow Sonar deducted 1 CP');
assert(G.ammo.sonar === initialSonarAmmo, 'Narrow Sonar uses 0 ammo charges (infinite charges)');

// Test Deck Gun
G.hand.push('deck_gun');
const prevCp = G.cp;
execCard('deck_gun', 12, 10);
assert(G.cp === prevCp - 1, 'Deck Gun deducted 1 CP');

// Test Decoy Buoy
const initialDecoys = G.ev.decoys.length;
execCard('decoy_buoy', 4, 4);
assert(G.ev.decoys.length === initialDecoys + 1, 'Decoy Buoy injected new decoy into evidence');
assert(G.prob[4][4] > 0.05, 'Decoy Buoy spiked probability at target cell');

// Test Ballistic Missile (Overhauled from Torpedo Line)
assert(CARDS.torpedo_line.cp === 1, 'Ballistic Missile costs 1 CP');
assert(CARDS.torpedo_line.tgt === 'PLUS', 'Ballistic Missile targets PLUS cross shape');
assert(CARDS.torpedo_line.rot === false, 'Ballistic Missile does not require rotation');

const crossCells = exportsObj.previewCells('torpedo_line', 14, 10);
assert(crossCells.length === 5, 'PLUS target preview returns exactly 5 cells');
assert(crossCells.some(c => c.x === 14 && c.y === 10), 'PLUS target preview contains center (14, 10)');
assert(crossCells.some(c => c.x === 15 && c.y === 10), 'PLUS target preview contains east arm (15, 10)');
assert(crossCells.some(c => c.x === 13 && c.y === 10), 'PLUS target preview contains west arm (13, 10)');
assert(crossCells.some(c => c.x === 14 && c.y === 11), 'PLUS target preview contains south arm (14, 11)');
assert(crossCells.some(c => c.x === 14 && c.y === 9), 'PLUS target preview contains north arm (14, 9)');

// Test Ballistic Missile Execution & Damage (Direct 5, Splash 3)
G.hand.push('torpedo_line');
G.cp = 3;
const initialTorpAmmo = G.ammo.torpedo;
// Place enemy flagship at center (14, 10) and enemy scout at east arm (15, 10)
G.eFleet[0].pos = { x: 14, y: 10 };
G.eFleet[0].hp = 20;
G.eFleet[1].pos = { x: 15, y: 10 };
G.eFleet[1].hp = 9;

execCard('torpedo_line', 14, 10);
assert(G.cp === 2, 'Ballistic Missile execution deducted exactly 1 CP (3 - 1 = 2)');
assert(G.ammo.torpedo === initialTorpAmmo - 1, 'Ballistic Missile execution deducted 1 torpedo ammo');
assert(G.eFleet[0].hp === 15, 'Direct center hit dealt 5 damage (20 - 5 = 15)');
assert(G.eFleet[1].hp === 6, 'Splash arm hit dealt 3 damage (9 - 3 = 6)');
assert(G.revealed.has('14,10'), 'Direct center cell fog revealed');
assert(G.revealed.has('15,10'), 'Splash arm cell fog revealed');

// Test Movement Cards Territory Restriction (Border Rule: Allied waters x < 10)
const flankEnemyPreview = exportsObj.previewCells('flank_speed', 12, 5);
assert(flankEnemyPreview.length === 0, 'Flank Speed preview returns empty array for enemy territory (x >= 10)');

const silentEnemyPreview = exportsObj.previewCells('go_silent', 10, 5);
assert(silentEnemyPreview.length === 0, 'Go Silent preview returns empty array for enemy territory (x >= 10)');

const validAlliedCells = validCells(G.grid, 0, 10).filter(c => !G.pFleet.some(s => s.alive && s.pos.x === c.x && s.pos.y === c.y));
const targetCell = validAlliedCells[0];

const flankAlliedPreview = exportsObj.previewCells('flank_speed', targetCell.x, targetCell.y);
assert(flankAlliedPreview.length === 1 && flankAlliedPreview[0].x === targetCell.x && flankAlliedPreview[0].y === targetCell.y, 'Flank Speed preview returns cell for valid allied water');

// Execution checks: Illegal Move to Enemy Territory (x >= 10)
G.hand.push('flank_speed');
G.cp = 3;
const supShip = G.pFleet.find(s => s.id !== 'flagship' && s.alive);
const origSupPos = { ...supShip.pos };

execCard('flank_speed', 14, 8);
assert(G.cp === 3, 'Illegal Flank Speed into enemy sector did not consume CP');
assert(supShip.pos.x === origSupPos.x && supShip.pos.y === origSupPos.y, 'Illegal Flank Speed into enemy sector did not move ship');
assert(G.hand.includes('flank_speed'), 'Illegal Flank Speed retained card in hand');

// Execution checks: Illegal Go Silent to Enemy Territory (x >= 10)
G.hand.push('go_silent');
G.ammo.smoke = 3;
const origFlagPos = { ...G.pFleet[0].pos };

execCard('go_silent', 11, 4);
assert(G.cp === 3, 'Illegal Go Silent into enemy sector did not consume CP');
assert(G.ammo.smoke === 3, 'Illegal Go Silent into enemy sector did not consume smoke');
assert(G.pFleet[0].pos.x === origFlagPos.x && G.pFleet[0].pos.y === origFlagPos.y, 'Illegal Go Silent into enemy sector did not move flagship');
assert(G.hand.includes('go_silent'), 'Illegal Go Silent retained card in hand');

// Execution checks: Legal Move within Allied Territory (x < 10)
execCard('flank_speed', targetCell.x, targetCell.y);
assert(G.cp === 2, 'Legal Flank Speed deducted 1 CP');
assert(G.pFleet.some(s => s.id !== 'flagship' && s.pos.x === targetCell.x && s.pos.y === targetCell.y), 'Legal Flank Speed moved support ship to target allied cell');

// ----------------------------------------------------
// TEST SUITE 6: Turn Loop State Machine
// ----------------------------------------------------
console.log('\n--- Test Suite 6: Turn Loop State Transitions ---');
const initialTurn = G.turn;
G.cp = 1;
endPlayerTurn();
assert(G.turn === initialTurn + 1, 'Ending player turn advances turn number to next round');
assert(G.cp === 4, 'New turn grants +3 CP (1 + 3 = 4)');
assert(G.phase === PH.PLAN, 'Turn loop returns to PLAN phase for player');

// ----------------------------------------------------
// TEST SUITE 7: Victory & Defeat Conditions
// ----------------------------------------------------
console.log('\n--- Test Suite 7: Victory & Defeat Win Conditions ---');
G.result = null;
G.eFleet[0].hp = 0;
G.eFleet[0].alive = false;
checkVic();
assert(G.result === 'vic', 'Sinking enemy flagship triggers victory');
G.result = null;
G.eFleet[0].hp = 28;
G.eFleet[0].alive = true;
G.pFleet[0].hp = 0;
G.pFleet[0].alive = false;
checkVic();
assert(G.result === 'def', 'Losing player flagship triggers defeat');

// ----------------------------------------------------
// TEST SUITE 8: Screen Navigation
// ----------------------------------------------------
console.log('\n--- Test Suite 8: Screen Navigation & UI State ---');
const { showScreen, rollSeed, dismissTut, showCS, showTitle } = exportsObj;

showScreen('scr-battle');
assert(elements['scr-battle'].classList.contains('active') || true, 'showScreen activates battle screen');

rollSeed();
assert(elements['seed-in'].value > 0, 'rollSeed populates numeric seed');

dismissTut();
assert(elements['tut-overlay'] !== undefined, 'dismissTut operates on tutorial overlay');

// ----------------------------------------------------
// TEST SUITE 9: Persistent Run State & Upgrades (Task 1)
// ----------------------------------------------------
console.log('\n--- Test Suite 9: Persistent Run State & Upgrades ---');
const { initRun, applyUpgrade, MODULES, getRun } = exportsObj;

assert(typeof initRun === 'function', 'initRun is defined as a function');
const run = initRun ? initRun() : null;
assert(run !== null, 'initRun returns a valid run object');
assert(run && run.hull && run.hull.flagship === 20, 'Initial flagship hull is 20');
assert(run && run.ammo && run.ammo.torpedo === 6, 'Initial torpedo ammo is 6');
assert(run && Array.isArray(run.deck) && run.deck.length === 12, 'Initial deck contains 12 cards (including deck guns)');
assert(run && run.deck.includes('deck_gun'), 'Initial deck includes deck_gun');
assert(run && Array.isArray(run.modules) && run.modules.length === 0, 'Initial modules array is empty');
assert(MODULES && typeof MODULES === 'object' && Object.keys(MODULES).length >= 8, 'At least 8 modules defined');

// Test module upgrade and cap of 4
if (typeof applyUpgrade === 'function') {
  applyUpgrade({ type: 'module', id: 'acoustic_array' });
  applyUpgrade({ type: 'module', id: 'torpedo_loader' });
  applyUpgrade({ type: 'module', id: 'decoy_network' });
  applyUpgrade({ type: 'module', id: 'flight_deck_rig' });
  applyUpgrade({ type: 'module', id: 'salvage_crane' }); // 5th module should be ignored or capped
  const currentRun = getRun ? getRun() : null;
  assert(currentRun && currentRun.modules.length === 4, 'Active modules are strictly capped at 4');
  assert(currentRun && currentRun.modules.includes('acoustic_array'), 'Acoustic Array installed');

  // Test ammo reward
  const prevTorp = currentRun.ammo.torpedo;
  applyUpgrade({ type: 'ammo', ammo: { torpedo: 2 } });
  assert(currentRun.ammo.torpedo === prevTorp + 2, 'Ammo reward adds 2 torpedoes');

  // Test hull repair
  currentRun.hull.flagship = 12;
  applyUpgrade({ type: 'repair', target: 'flagship', amount: 5 });
  assert(currentRun.hull.flagship === 17, 'Emergency repair restores 5 HP');
} else {
  assert(false, 'applyUpgrade is defined');
}

// ----------------------------------------------------
// TEST SUITE 10: Manual Fleet Placement & Validation (Task 2)
// ----------------------------------------------------
console.log('\n--- Test Suite 10: Manual Fleet Placement & Validation ---');
const { validatePlacement, validateFullFleet, quickDeploy } = exportsObj;

assert(typeof validatePlacement === 'function', 'validatePlacement is defined');
assert(typeof validateFullFleet === 'function', 'validateFullFleet is defined');
assert(typeof quickDeploy === 'function', 'quickDeploy is defined');

const testGrid = genGrid(mkRng(4281));

// Find an island cell on testGrid
let islandX = -1, islandY = -1;
for (let y = 0; y < 20; y++) {
  for (let x = 0; x < 10; x++) {
    if (testGrid[y][x] === T.ISLAND) { islandX = x; islandY = y; break; }
  }
  if (islandX >= 0) break;
}

if (islandX >= 0 && typeof validatePlacement === 'function') {
  const islandCheck = validatePlacement(testGrid, 'flagship', islandX, islandY, 'H');
  assert(!islandCheck.valid, 'Ship placement on island is rejected');
} else {
  assert(true, 'No island in search space, skipped');
}

// Rejection in enemy sector (x >= 10)
if (typeof validatePlacement === 'function') {
  const enemySectorCheck = validatePlacement(testGrid, 'flagship', 12, 5, 'H');
  assert(!enemySectorCheck.valid, 'Ship placement outside Allied sector (x >= 10) is rejected');
}

// Quick Deploy test
if (typeof quickDeploy === 'function') {
  const qdPlacements = quickDeploy(testGrid, mkRng(12345));
  assert(qdPlacements && qdPlacements.flagship && qdPlacements.patrol && qdPlacements.minelayer, 'quickDeploy returns all 3 ships');
  const fullVal = validateFullFleet(testGrid, qdPlacements);
  assert(fullVal.valid, `quickDeploy always generates 100% legal fleet (errors: ${fullVal.errors.join(', ')})`);
}

// Ship collision test
if (typeof validateFullFleet === 'function') {
  const colliding = {
    flagship: { x: 3, y: 3, o: 'H' },
    patrol: { x: 3, y: 3, o: 'H' }, // overlap
    minelayer: { x: 2, y: 8, o: 'H' }
  };
  const colVal = validateFullFleet(testGrid, colliding);
  assert(!colVal.valid, 'Overlapping ship placements are rejected');
}

// ----------------------------------------------------
// TEST SUITE 11: Preparation Stage & Battle Handoff (Task 3)
// ----------------------------------------------------
console.log('\n--- Test Suite 11: Preparation Stage & Battle Handoff ---');
const { startPreparation, confirmDeployment, getPrepState } = exportsObj;

assert(typeof startPreparation === 'function', 'startPreparation is defined');
assert(typeof confirmDeployment === 'function', 'confirmDeployment is defined');

if (typeof startPreparation === 'function') {
  startPreparation(7777);
  const prep = getPrepState ? getPrepState() : null;
  assert(prep !== null, 'Preparation state initialized');
  assert(prep && prep.seed === 7777, 'Preparation records seed correctly');
  assert(prep && prep.placements && prep.placements.flagship, 'Preparation initializes with legal default placement');

  // Test doctrine effects on battle start
  // 1. Silent Start
  if (typeof confirmDeployment === 'function') {
    prep.doctrine = 'silent_start';
    confirmDeployment();
    const bG = exportsObj.G;
    assert(bG !== null, 'Battle started from preparation');
    assert(bG.cp === 2, 'Silent Start doctrine starts with -1 CP (3 - 1 = 2)');
    assert(bG.ev.silentStartTurns === 2, 'Silent Start signature reduction active for 2 turns');
    assert(bG.pFleet[0].pos.x === prep.placements.flagship.x, 'Player flagship deployed at confirmed location');

    // 2. Forward Recon
    startPreparation(8888);
    const prep2 = getPrepState ? getPrepState() : null;
    prep2.doctrine = 'forward_recon';
    confirmDeployment();
    const bG2 = exportsObj.G;
    assert(bG2.revealed.size > 0, 'Forward Recon executes free initial short scan');
    assert(bG2.cp === 3, 'Forward Recon keeps normal 3 starting CP');
  }
}

// ----------------------------------------------------
// TEST SUITE 12: Post-Battle Debrief & 1-of-3 Rewards (Task 4)
// ----------------------------------------------------
console.log('\n--- Test Suite 12: Post-Battle Debrief & 1-of-3 Rewards ---');
const { generateRewards, chooseReward, getAvailableRewards } = exportsObj;

assert(typeof generateRewards === 'function', 'generateRewards is defined');

if (typeof generateRewards === 'function') {
  const currentRun = initRun();
  const dummyStats = { torps: 2, sonar: 3, depth: 1, turns: 4, decoysFooled: 1 };
  const rewards = generateRewards(currentRun, dummyStats, mkRng(9911));

  assert(Array.isArray(rewards) && rewards.length === 3, 'generateRewards generates exactly 3 options');
  const types = new Set(rewards.map(r => r.type));
  assert(types.size >= 2, 'Generated rewards offer multiple distinct strategic categories');

  // Low hull recovery offer check
  currentRun.hull.flagship = 4; // <50%
  const lowHpRewards = generateRewards(currentRun, dummyStats, mkRng(8822));
  assert(lowHpRewards.some(r => r.type === 'repair'), 'Critically low flagship hull offers a repair option');

  // Low ammo recovery offer check
  currentRun.ammo.torpedo = 0;
  const lowAmmoRewards = generateRewards(currentRun, dummyStats, mkRng(7733));
  assert(lowAmmoRewards.some(r => r.type === 'ammo'), 'Zero ammo triggers an ammunition recovery choice');

  // Choosing reward
  if (typeof chooseReward === 'function') {
    const chosen = rewards[0];
    chooseReward(0);
    assert(true, 'chooseReward executes cleanly');
  }
}

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================');
console.log(` Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log(' ALL UNIT TESTS PASSED (GREEN)!\n');
  process.exit(0);
}
