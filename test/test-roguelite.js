// test/test-roguelite.js - Automated Test Suite for Roguelite Route Map, Events & Analyze Mode
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' Blackwater Command — Roguelite Run & Map Tests');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

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

// Load blackwater-command.html extraction or exported engine
// We will test the route map engine functions
let RouteEngine = null;
try {
  RouteEngine = require('../src/route-engine.js');
} catch (e) {
  // Expected to fail until we implement src/route-engine.js
}

console.log('--- Test Suite 1: Route Map DAG Generation ---');

runTest('RouteEngine module exists and exports generateRouteMap', () => {
  assert(RouteEngine !== null, 'RouteEngine must be defined');
  assert(typeof RouteEngine.generateRouteMap === 'function', 'generateRouteMap must be a function');
});

if (RouteEngine) {
  runTest('Generates 4 tiers for Region 1 terminating in a single Boss node', () => {
    const map = RouteEngine.generateRouteMap(4242, 1);
    assert(map && map.tiers && map.tiers.length === 4, 'Must have exactly 4 tiers for Region 1');
    assert(map.tiers[3].length === 1, 'Final tier must have exactly 1 boss node');
    assert(map.tiers[3][0].type === 'boss', 'Final tier node must be type boss');
    assert(map.tiers[3][0].archetype === 'Mirage Carrier', 'Boss must be Mirage Carrier');
  });

  runTest('All non-boss nodes have forward connections and no dead ends', () => {
    const map = RouteEngine.generateRouteMap(4242, 1);
    for (let t = 0; t < 3; t++) {
      map.tiers[t].forEach(node => {
        assert(node.next && node.next.length > 0, `Node ${node.id} in tier ${t} must have at least one forward connection`);
        // Verify target nodes exist in next tier
        node.next.forEach(targetId => {
          const found = map.tiers[t + 1].some(n => n.id === targetId);
          assert(found, `Target ${targetId} must exist in tier ${t + 1}`);
        });
      });
    }
  });

  runTest('Every tier 1, 2, 3 node is reachable from tier 0 (no orphan nodes)', () => {
    const map = RouteEngine.generateRouteMap(4242, 1);
    for (let t = 1; t < 4; t++) {
      map.tiers[t].forEach(node => {
        const hasParent = map.tiers[t - 1].some(parent => parent.next.includes(node.id));
        assert(hasParent, `Node ${node.id} in tier ${t} must be reachable from tier ${t - 1}`);
      });
    }
  });

  runTest('Route map generation is deterministic with identical seeds', () => {
    const map1 = RouteEngine.generateRouteMap(98765, 1);
    const map2 = RouteEngine.generateRouteMap(98765, 1);
    assert(JSON.stringify(map1) === JSON.stringify(map2), 'Identical seeds must produce identical maps');
  });

  runTest('Node progression locks alternate paths and enables only reachable descendants', () => {
    const map = RouteEngine.generateRouteMap(4242, 1);
    assert(map.currentTier === 0, 'Initial tier must be 0');
    
    // Starting tier nodes should be 'available'
    const startNode = map.tiers[0][0];
    assert(startNode.status === 'available', 'Starting nodes must be available');

    // Visit startNode
    const updated = RouteEngine.visitRouteNode(map, startNode.id);
    assert(startNode.status === 'visited', 'Selected node must be visited');
    assert(map.currentTier === 1, 'Current tier must advance to 1');

    // Other nodes in tier 0 must be locked
    map.tiers[0].forEach(n => {
      if (n.id !== startNode.id) {
        assert(n.status === 'locked', 'Unchosen sibling nodes must be locked');
      }
    });

    // Only nodes connected to startNode should be available in tier 1
    map.tiers[1].forEach(n => {
      if (startNode.next.includes(n.id)) {
        assert(n.status === 'available', `Connected child ${n.id} must be available`);
      } else {
        assert(n.status === 'locked', `Unconnected child ${n.id} must be locked`);
      }
    });
  });
}

console.log('\n====================================================');
console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('====================================================');

if (passed < total) {
  process.exit(1);
} else {
  console.log(' ALL ROUTE MAP TESTS PASSED (GREEN)!\n');
  process.exit(0);
}
