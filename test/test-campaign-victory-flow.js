const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' Blackwater Command — Campaign Victory Flow Test');
console.log('====================================================');

const html = fs.readFileSync(path.join(__dirname, '..', 'blackwater-command.html'), 'utf8');

// Minimal mock DOM environment to verify the exact client code execution
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
        fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, clearRect() {}
      }),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 544, height: 544 })
    };
  }
  return elementStore[id];
}

const mockDocument = {
  getElementById: (id) => getOrCreateEl(id),
  documentElement: { clientWidth: 1080, clientHeight: 1920 },
  querySelectorAll: (selector) => {
    if (selector === '.screen') {
      return ['scr-title', 'scr-route-map', 'scr-battle', 'scr-prep', 'scr-vic', 'scr-def', 'scr-debrief', 'scr-upgrade']
        .map(id => getOrCreateEl(id));
    }
    return [];
  },
  addEventListener: () => {}
};

const mockWindow = {
  innerWidth: 1080,
  innerHeight: 1920,
  addEventListener: () => {}
};

// Extract relevant script parts
// Extract RouteEngine
const routeEngineMatch = html.match(/const RouteEngine = \((function\s*\(\)|function\(\)|\(\)\s*=>)\s*\{([\s\S]*?)\n\}\)\(\);/);
assert(routeEngineMatch, 'RouteEngine found in html');
const RouteEngine = eval(`(() => { ${routeEngineMatch[2]} })()`);

// Extract campaign functions
const scriptContent = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// We can run the campaign logic within a sandbox or eval
const sandbox = {
  RouteEngine,
  document: mockDocument,
  window: mockWindow,
  console: console,
  setTimeout: (fn) => fn(),
  setInterval: () => 1,
  clearInterval: () => {},
  Math: Math,
  Date: Date,
  CARDS: {},
  GW: 20, GH: 20, CELL: 24, LBL: 20,
  PH: { PLAN: 'PLAN' },
  CS: { CONF: 3 }
};

// Extract functions needed for campaign and victory testing
const neededFuncs = [
  'mkRng',
  'startCampaignRun',
  'updateRouteHUD',
  'renderRouteMap',
  'selectRouteNode',
  'returnToRouteMap',
  'showScreen',
  'showTitle',
  'showDebrief',
  'chooseReward',
  'startNextBattle',
  'endBattle',
  'stopTimer',
  'getRun'
];

// Execute script in sandbox context
const vm = require('vm');
const context = vm.createContext(sandbox);

// Evaluate the HTML script in context
vm.runInContext(scriptContent, context);

console.log('\n--- 1. Testing Campaign Initialization ---');
vm.runInContext(`startCampaignRun(9999);`, context);
const initialRun = vm.runInContext(`campaignRun`, context);
assert(initialRun !== null, 'campaignRun must be initialized');
assert(initialRun.seed === 9999, 'campaignRun seed matches');
assert(initialRun.map !== null, 'campaignRun route map generated');
assert.strictEqual(initialRun.map.currentTier, 0, 'Initial tier is 0 (Tier 1)');
console.log('  [PASS] Campaign started with Tier 1 and valid DAG map');

console.log('\n--- 2. Visiting Tier 1 Node & Advancing to Tier 2 ---');
const firstNodeId = initialRun.map.tiers[0][0].id;
vm.runInContext(`
  // Mock launchEncounterNode to not start canvas prep
  launchEncounterNode = function(n) {};
  selectRouteNode('${firstNodeId}');
`, context);

assert.strictEqual(initialRun.map.currentTier, 1, 'Current tier advanced to 1 (Tier 2)');
assert.strictEqual(initialRun.map.currentNodeId, firstNodeId, 'Node marked visited');
console.log('  [PASS] Route tier advanced to Tier 2');

console.log('\n--- 3. Simulating Battle Victory & Campaign State Synchronization ---');
vm.runInContext(`
  G = {
    seed: 9999,
    turn: 5,
    result: null,
    stats: { torps: 2, sonar: 1 },
    ammo: { torpedo: 5, sonar: 4 },
    pFleet: [{ id: 'flagship', hp: 16, max: 20, alive: true }],
    eFleet: [{ id: 'boss', hp: 0, max: 20, alive: false }]
  };
  endBattle('vic');
`, context);

assert.strictEqual(initialRun.flagshipHull, 16, 'Flagship hull preserved in campaignRun');
assert.strictEqual(initialRun.ammo.torpedo, 5, 'Ammo torpedo synced to campaignRun');
assert.strictEqual(initialRun.ammo.sonar, 4, 'Ammo sonar synced to campaignRun');

const vicBtnsHtml = elementStore['vic-btns'].innerHTML;
assert(vicBtnsHtml.includes('returnToRouteMap()'), 'Victory buttons contain returnToRouteMap()');
console.log('  [PASS] Flagship hull and ammo synced, Victory buttons offer route map return');

console.log('\n--- 4. Returning to Route Map (Next Page / Tier 2) ---');
vm.runInContext(`returnToRouteMap();`, context);
const activeScreens = Object.values(elementStore).filter(el => el.classList && el.classList.contains('active'));
assert(elementStore['scr-route-map'].classList.contains('active'), '#scr-route-map must be the active screen');

const tierLabel = elementStore['route-tier-lbl'].textContent;
assert(tierLabel.includes('TIER 2 OF 4'), `Tier label should reflect Tier 2 of 4, got: ${tierLabel}`);
console.log(`  [PASS] Returned to Route Map successfully, displaying: "${tierLabel}"`);

console.log('\n--- 5. Clearing All Tiers & Advancing to Next Region (Next Page) ---');
// Simulate reaching and completing the final boss tier
initialRun.map.currentTier = 4; // 4 tiers complete
vm.runInContext(`returnToRouteMap();`, context);

assert.strictEqual(initialRun.region, 2, 'Region advances to 2 upon completing all tiers');
assert.strictEqual(initialRun.map.currentTier, 0, 'New region starts at Tier 1 (currentTier 0)');
const regionLabel = elementStore['route-region-lbl'].textContent;
assert(regionLabel.includes('REGION 2'), `Region label should display Region 2, got: ${regionLabel}`);
console.log(`  [PASS] Advanced to Next Region Page: "${regionLabel}"`);

console.log('====================================================');
console.log(' ALL CAMPAIGN VICTORY FLOW TESTS PASSED (GREEN)!');
console.log('====================================================\n');
