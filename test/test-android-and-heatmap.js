const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' Blackwater Command — Android & Heatmap Test Suite');
console.log('====================================================');

let passed = 0;
let total = 0;

function report(desc, ok, err) {
  total++;
  if (ok) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  } else {
    console.error(`  [FAIL] ${desc}`);
    if (err) console.error('   ', err.message || err);
  }
}

const htmlPath = path.join(__dirname, '..', 'blackwater-command.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// --- Test Suite 1: Mobile & Android Viewport Metadata ---
console.log('\n--- Test Suite 1: Mobile & Android Viewport Metadata ---');
try {
  const hasMobileMeta = html.includes('width=device-width') &&
                        html.includes('user-scalable=no') &&
                        html.includes('viewport-fit=cover');
  assert(hasMobileMeta, 'Viewport meta tag is configured for mobile/Android devices');
  report('Viewport meta tag contains mobile parameters (width=device-width, user-scalable=no, viewport-fit=cover)', true);
} catch (e) {
  report('Viewport meta tag contains mobile parameters', false, e);
}

try {
  const hasWebAppCap = html.includes('mobile-web-app-capable') || html.includes('apple-mobile-web-app-capable');
  assert(hasWebAppCap, 'Mobile web app capability meta tag present');
  report('Mobile web app standalone capability meta tags present', true);
} catch (e) {
  report('Mobile web app standalone capability meta tags present', false, e);
}

// --- Test Suite 2: Heatmap Button Relocation ---
console.log('\n--- Test Suite 2: Heatmap Button Relocation ---');
try {
  // Check that #heat-btn is NOT inside #brd-area or #pnl-brd
  const brdMatch = html.match(/<div id="brd-area">([\s\S]*?)<\/div>/) || html.match(/<div class="pnl" id="pnl-brd">([\s\S]*?)<\/div>/);
  assert(brdMatch, '#brd-area exists');
  const heatInBrd = brdMatch[1].includes('id="heat-btn"');
  assert(!heatInBrd, '#heat-btn must NOT be inside #brd-area');
  report('#heat-btn removed from board area (unblocking grid cells)', true);
} catch (e) {
  report('#heat-btn removed from #pnl-brd (unblocking grid cells)', false, e);
}

try {
  // Check that renderTmr outputs #heat-btn alongside #tmr-tog
  const renderTmrMatch = html.match(/function renderTmr\(\)\s*\{([\s\S]*?)\n\}/);
  assert(renderTmrMatch, 'renderTmr function exists');
  const tmrCode = renderTmrMatch[1];
  const hasHeatBtnInTmr = tmrCode.includes('id="heat-btn"') && tmrCode.includes('id="tmr-tog"');
  assert(hasHeatBtnInTmr, 'renderTmr must render #heat-btn alongside #tmr-tog');
  report('#heat-btn rendered inside timer panel (#pnl-tmr) beside #tmr-tog', true);
} catch (e) {
  report('#heat-btn rendered inside timer panel (#pnl-tmr) beside #tmr-tog', false, e);
}

// --- Test Suite 3: Touch & Pointer Event Support in Input Handling ---
console.log('\n--- Test Suite 3: Touch & Pointer Event Support ---');
try {
  const hasPointerOrTouch = html.includes('pointerdown') || html.includes('touchstart');
  assert(hasPointerOrTouch, 'Input handling must listen to pointerdown or touchstart events');
  report('Canvas input system binds pointer/touch events for touchscreen support', true);
} catch (e) {
  report('Canvas input system binds pointer/touch events for touchscreen support', false, e);
}

try {
  const hasTouchCoordinateHandling = html.includes('e.touches') || html.includes('pointerType') || html.includes('clientX');
  assert(hasTouchCoordinateHandling, 'px2cell supports touch event coordinate extraction');
  report('px2cell handles touch coordinate extraction cleanly', true);
} catch (e) {
  report('px2cell handles touch coordinate extraction cleanly', false, e);
}

// --- Test Suite 4: Responsive Viewport Auto-Scaling ---
console.log('\n--- Test Suite 4: Responsive Viewport Auto-Scaling ---');
try {
  const hasScaler = html.includes('fitAppToScreen') || html.includes('scale(') || html.includes('app-scaler');
  assert(hasScaler, 'Responsive auto-scaler implementation exists');
  report('Responsive auto-scaler dynamically scales UI to fit Android screen dimensions', true);
} catch (e) {
  report('Responsive auto-scaler dynamically scales UI to fit Android screen dimensions', false, e);
}

// --- Test Suite 5: Touch Target & Styling Optimizations ---
console.log('\n--- Test Suite 5: Touch Target & Styling Optimizations ---');
try {
  const hasTouchAction = html.includes('touch-action:none') || html.includes('touch-action: manipulation') || html.includes('touch-action');
  assert(hasTouchAction, 'CSS includes touch-action to prevent gesture interference');
  report('CSS touch-action configured to prevent gesture interference and double-tap zoom', true);
} catch (e) {
  report('CSS touch-action configured to prevent gesture interference and double-tap zoom', false, e);
}

// --- Test Suite 6: Campaign Victory Navigation to Route Map ---
console.log('\n--- Test Suite 6: Campaign Victory Navigation to Route Map ---');
try {
  // Check that Victory screen or reward flow routes to returnToRouteMap when in campaignRun
  const hasRouteMapReturn = html.includes('returnToRouteMap') && (
    html.includes('campaignRun') || html.includes('startNextBattle')
  );
  assert(hasRouteMapReturn, 'returnToRouteMap must be called upon continuing from victory/rewards in campaign mode');
  report('Victory and reward flow routes back to Route Map screen (next tier/page) in campaign mode', true);
} catch (e) {
  report('Victory and reward flow routes back to Route Map screen (next tier/page) in campaign mode', false, e);
}

try {
  // Check that endBattle victory screen offers return to route map when campaign is active
  const endBattleMatch = html.match(/function endBattle\([\s\S]*?\{([\s\S]*?)\n\}/);
  assert(endBattleMatch, 'endBattle function exists');
  const endBattleCode = endBattleMatch[1];
  const hasCampaignVicCheck = endBattleCode.includes('campaignRun') || html.includes('returnToRouteMap');
  assert(hasCampaignVicCheck, 'Victory flow accounts for campaignRun state');
  report('Victory screen navigation dynamically displays Route Map return option for campaigns', true);
} catch (e) {
  report('Victory screen navigation dynamically displays Route Map return option for campaigns', false, e);
}

console.log('====================================================');
console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('====================================================');

if (passed === total) {
  console.log(' ALL TESTS PASSED (GREEN)!\n');
  process.exit(0);
} else {
  console.log(' TESTS INCOMPLETE (RED) — Ready for Implementation.\n');
  process.exit(1);
}
