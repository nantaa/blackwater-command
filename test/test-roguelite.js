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

  console.log('\n--- Test Suite 2: Decision Events & Meaningful Tradeoffs ---');

  runTest('resolveEventChoice processes Distress Signal tradeoffs', () => {
    assert(typeof RouteEngine.resolveEventChoice === 'function', 'resolveEventChoice required');
    const runA = { flagshipHull: 20, maxHull: 20, ammo: { torpedo: 4, sonar: 3 }, deck: [] };
    const resA = RouteEngine.resolveEventChoice(runA, 'Distress Signal', 0); // Investigate
    assert(resA.success, 'Event choice must resolve');
    assert(runA.flagshipHull === 17, 'Ambush deals 3 damage');
    assert(runA.ammo.torpedo === 6, 'Gains 2 torpedoes');
    assert(runA.ammo.sonar === 4, 'Gains 1 sonar');

    const runB = { flagshipHull: 20, maxHull: 20, ammo: { torpedo: 4, sonar: 3 }, deck: [] };
    const resB = RouteEngine.resolveEventChoice(runB, 'Distress Signal', 1); // Ignore
    assert(runB.flagshipHull === 20 && runB.ammo.torpedo === 4, 'Ignore leaves state intact');
  });

  runTest('resolveEventChoice processes Derelict Vessel board vs salvage', () => {
    const runA = { flagshipHull: 20, deck: ['narrow_sonar'], ammo: { torpedo: 2 } };
    const resA = RouteEngine.resolveEventChoice(runA, 'Derelict Vessel', 0); // Board
    assert(runA.flagshipHull === 18, 'Boarding costs 2 hull');
    assert(runA.deck.length === 2, 'Adds a rare card to deck');

    const runB = { flagshipHull: 20, deck: ['narrow_sonar'], ammo: { torpedo: 2 } };
    const resB = RouteEngine.resolveEventChoice(runB, 'Derelict Vessel', 1); // Salvage
    assert(runB.flagshipHull === 20, 'Salvage leaves hull intact');
    assert(runB.ammo.torpedo === 4, 'Gains 2 torpedoes');
  });

  runTest('resolveEventChoice processes Smuggler Dock card remove for hull', () => {
    const run = { flagshipHull: 20, deck: ['strike', 'decoy', 'sonar'], ammo: { torpedo: 4 } };
    const res = RouteEngine.resolveEventChoice(run, 'Smuggler Dock', 0, 'strike'); // Remove strike
    assert(run.flagshipHull === 17, 'Card removal costs 3 hull');
    assert(!run.deck.includes('strike'), 'Card removed from deck');
  });

  console.log('\n--- Test Suite 3: Encounter Archetypes & Regional Boss ---');

  runTest('setupEncounter configures Hunt, Silent Duel, and Convoy Raid accurately', () => {
    assert(typeof RouteEngine.setupEncounter === 'function', 'setupEncounter required');
    const hunt = RouteEngine.setupEncounter({ modules: [] }, 'Hunt');
    assert(hunt.timer === 75, 'Standard hunt timer is 75s');
    assert(hunt.enemyFlagshipHP === 28, 'Standard flagship HP is 28');
    assert(hunt.objective === 'Destroy Hostile Flagship', 'Hunt objective');

    const silent = RouteEngine.setupEncounter({ modules: [] }, 'Silent Duel');
    assert(silent.timer === 75, 'Silent duel timer is 75s');
    assert(silent.sensorPenalty === 0.5, 'Sensor coverage halved');
    assert(silent.enemyFlagshipHP === 28, 'Standard enemy HP');

    const convoy = RouteEngine.setupEncounter({ modules: [] }, 'Convoy Raid');
    assert(convoy.transportTarget !== null, 'Must include transport target');
    assert(convoy.turnsToEscape === 5, 'Transport escapes in 5 turns');
  });

  runTest('setupEncounter configures Mirage Carrier boss encounter per Section 15', () => {
    const boss = RouteEngine.setupEncounter({ modules: [] }, 'Mirage Carrier');
    assert(boss.isBoss === true, 'Must flag as boss encounter');
    assert(boss.timer === 60, 'Boss turn timer is strictly 60s per Section 10/15');
    assert(boss.enemyFlagshipHP === 32, 'Boss flagship has 32 HP');
    assert(boss.specialRule === 'Acoustic Mirage Phantoms', 'Special rule matches spec');
    assert(typeof boss.triggerPhantoms === 'function', 'Must have triggerPhantoms method');

    // Trigger phantoms adds 2 fake contacts
    const fakeContacts = boss.triggerPhantoms(12345);
    assert(fakeContacts.length === 2, 'Mirage Carrier spawns 2 phantom acoustic signatures');
  });

  console.log('\n--- Test Suite 4: Post-Battle Analyze Mode & AI Probability Heatmap ---');

  runTest('createAnalyzeSession initializes replay timeline and scrub controls', () => {
    assert(typeof RouteEngine.createAnalyzeSession === 'function', 'createAnalyzeSession required');
    const mockBattle = {
      seed: 8877,
      turns: [
        {
          turn: 1,
          playerShips: [{ id: 'flagship', x: 4, y: 4, hp: 20 }],
          aiEvidence: { scans: [], hits: [], misses: [], decoys: [] },
          aiProbabilityMap: { '4,4': 0.05, '12,12': 0.02 },
          aiActions: [{ type: 'scan', x: 5, y: 5, reason: 'Initial sector reconnaissance' }]
        },
        {
          turn: 2,
          playerShips: [{ id: 'flagship', x: 4, y: 4, hp: 20 }],
          aiEvidence: { scans: [{ x: 5, y: 5 }], hits: [], misses: [], decoys: [{ x: 8, y: 8 }] },
          aiProbabilityMap: { '8,8': 0.85, '4,4': 0.05 },
          aiActions: [{ type: 'strike', x: 8, y: 8, reason: 'Investigated high-probability acoustic contact' }]
        }
      ]
    };

    const session = RouteEngine.createAnalyzeSession(mockBattle);
    assert(session.totalTurns === 2, 'Total turns count');
    assert(session.currentTurn === 1, 'Initial scrubber starts at turn 1');

    const snap2 = RouteEngine.getTurnSnapshot(session, 2);
    assert(snap2.turn === 2, 'Snapshot turn matches');
    assert(snap2.aiProbabilityMap['8,8'] === 0.85, 'Decoy spiked probability recorded');
  });

  runTest('getHeatmapColor generates accurate 4-tier visual heat gradient', () => {
    assert(typeof RouteEngine.getHeatmapColor === 'function', 'getHeatmapColor required');
    const cLow = RouteEngine.getHeatmapColor(0.04);
    assert(cLow.includes('rgba') && cLow.includes('0.2'), 'Low probability renders soft background tint');

    const cMed = RouteEngine.getHeatmapColor(0.25);
    assert(cMed.includes('229') || cMed.includes('cyan'), 'Medium probability renders cyan');

    const cHigh = RouteEngine.getHeatmapColor(0.5);
    assert(cHigh.includes('255') || cHigh.includes('gold'), 'Elevated probability renders amber/yellow');

    const cHot = RouteEngine.getHeatmapColor(0.88);
    assert(cHot.includes('255, 23') || cHot.includes('red'), 'High probability renders hotspot crimson');
  });

  runTest('explainAIAction provides explainable deduction based on legal evidence', () => {
    assert(typeof RouteEngine.explainAIAction === 'function', 'explainAIAction required');
    const action = { type: 'strike', x: 8, y: 8, reason: 'Investigated high-probability acoustic contact' };
    const evidence = { decoys: [{ x: 8, y: 8 }] };
    const explanation = RouteEngine.explainAIAction(action, evidence);

    assert(explanation.includes('decoy') || explanation.includes('acoustic'), 'Explanation highlights legal decoy evidence');
    assert(!explanation.includes('cheat') && !explanation.includes('secret'), 'Proves no illegal knowledge');
  });
}

console.log('\n====================================================');
console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('====================================================');

if (passed < total) {
  process.exit(1);
} else {
  console.log(' ALL ROUTELITE & ANALYZE MODE TESTS PASSED (GREEN)!\n');
  process.exit(0);
}

