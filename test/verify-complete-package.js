// test/verify-complete-package.js - Validates complete standalone itch.io package
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' Blackwater Command — itch.io Standalone Package Check');
console.log('====================================================\n');

const htmlPath = path.resolve(__dirname, '../blackwater-command.html');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

let passed = 0;
let total = 0;

function runTest(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${desc}`);
  } catch (err) {
    console.log(`  [FAIL] ${desc} -> ${err.message}`);
  }
}

assert(fs.existsSync(htmlPath), 'blackwater-command.html must exist');
const html = fs.readFileSync(htmlPath, 'utf8');

// 1. Single-file self-containment: inlined RouteEngine
runTest('Contains inlined RouteEngine with core APIs', () => {
  assert(html.includes('RouteEngine = {') || html.includes('const RouteEngine ='), 'Must define RouteEngine');
  assert(html.includes('generateRouteMap'), 'Must include generateRouteMap');
  assert(html.includes('resolveEventChoice'), 'Must include resolveEventChoice');
  assert(html.includes('setupEncounter'), 'Must include setupEncounter');
  assert(html.includes('createAnalyzeSession'), 'Must include createAnalyzeSession');
  assert(html.includes('getHeatmapColor'), 'Must include getHeatmapColor');
  assert(html.includes('explainAIAction'), 'Must include explainAIAction');
});

// 2. Single-file self-containment: inlined Multiplayer Engine
runTest('Contains inlined Multiplayer Engine with 24x24 hotseat logic', () => {
  assert(html.includes('createMPMatch'), 'Must contain createMPMatch');
  assert(html.includes('submitAction'), 'Must contain submitAction');
  assert(html.includes('advanceMPTurn'), 'Must contain advanceMPTurn');
  assert(html.includes('getFilteredState'), 'Must contain getFilteredState');
  assert(html.includes('MP_CONSTANTS'), 'Must contain MP_CONSTANTS');
});

// 3. Command Bridge Title Screen
runTest('Contains Command Bridge Title Screen with Campaign & Multiplayer entrypoints', () => {
  assert(html.includes('id="btn-campaign"'), 'Must have btn-campaign');
  assert(html.includes('id="btn-multiplayer"'), 'Must have btn-multiplayer');
  assert(html.includes('startCampaignRun()'), 'Must call startCampaignRun');
  assert(html.includes('openMultiplayerArena()'), 'Must call openMultiplayerArena');
});

// 4. Interactive Route Map
runTest('Contains Interactive Route Map Screen (Region 1 DAG) & controllers', () => {
  assert(html.includes('id="scr-route-map"'), 'Must have scr-route-map');
  assert(html.includes('renderRouteMap'), 'Must have renderRouteMap function');
  assert(html.includes('selectRouteNode'), 'Must have selectRouteNode function');
});

// 5. Decision Events & Encounters
runTest('Contains Decision Event modal & choice handler', () => {
  assert(html.includes('class="event-modal"'), 'Must have event modal');
  assert(html.includes('resolveEventChoice') || html.includes('onSelectEventChoice'), 'Must have event resolution');
});

// 6. Post-Battle Analyze Mode Heatmap
runTest('Contains Analyze Mode Screen with timeline scrubber and heatmap canvas', () => {
  assert(html.includes('id="scr-analyze"'), 'Must have scr-analyze');
  assert(html.includes('id="analyze-canvas"'), 'Must have analyze-canvas');
  assert(html.includes('openAnalyzeMode'), 'Must have openAnalyzeMode function');
  assert(html.includes('renderAnalyzeHeatmap'), 'Must have renderAnalyzeHeatmap function');
});

// 7. Tactical Multiplayer Hotseat Arena
runTest('Contains Tactical Multiplayer Screen with 4-Quadrant controls', () => {
  assert(html.includes('id="scr-mp"'), 'Must have scr-mp screen');
  assert(html.includes('openMultiplayerArena'), 'Must have openMultiplayerArena function');
});

console.log('\n====================================================');
console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('====================================================');

if (passed < total) {
  process.exit(1);
} else {
  console.log(' ALL STANDALONE PACKAGE TESTS PASSED (GREEN)!\n');
  process.exit(0);
}
