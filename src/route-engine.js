// src/route-engine.js - Roguelite Route Map Generator & Node State Machine
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RouteEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function mkRng(seed) {
    let s = (seed >>> 0) || 123456789;
    return {
      next: function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int: function (min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
      },
      pick: function (arr) {
        return arr[this.int(0, arr.length - 1)];
      }
    };
  }

  const NODE_ARCHETYPES = {
    fight: [
      { archetype: 'Hunt', title: 'Standard Recon Patrol', risk: 'Standard', desc: 'Engage enemy flotilla in standard tactical waters.' },
      { archetype: 'Silent Duel', title: 'Silent Duel', risk: 'Medium', desc: 'Both fleets have reduced sensor access. Rely on wake trails.' },
      { archetype: 'Convoy Raid', title: 'Convoy Interception', risk: 'Medium', desc: 'Hostile transport escaping within a limited operational window.' }
    ],
    elite: [
      { archetype: 'Carrier Patrol', title: 'Elite: Carrier Task Group', risk: 'High', desc: 'Extensive aircraft reconnaissance and aggressive artillery.' },
      { archetype: 'Submarine Ambush', title: 'Elite: Submersible Wolfpack', risk: 'High', desc: 'Deep-water stealth units. High value for depth charges.' }
    ],
    event: [
      { archetype: 'Distress Signal', title: 'Uncharted Distress Signal', risk: 'Event', desc: 'Faint SOS ping detected from contested waters.' },
      { archetype: 'Derelict Vessel', title: 'Drifting Hull Salvage', risk: 'Event', desc: 'Abandoned vessel adrift amidst coastal reefs.' },
      { archetype: 'Smuggler Dock', title: 'Black-Market Harbor', risk: 'Event', desc: 'Clandestine dock offering munitions for specialized tech.' }
    ],
    repair: [
      { archetype: 'Safe Harbor', title: 'Allied Repair Mooring', risk: 'Safe', desc: 'Safe anchorage allowing flagship hull restoration and deck tuning.' }
    ],
    supply: [
      { archetype: 'Depot', title: 'Naval Munitions Depot', risk: 'Supply', desc: 'Restock scarce torpedoes, depth charges, and install field upgrades.' }
    ],
    boss: [
      { archetype: 'Mirage Carrier', title: 'Regional Flagship: Mirage Carrier', risk: 'Boss', desc: 'High Command target emitting deceptive radar phantoms. 60s timer.' }
    ]
  };

  function generateRouteMap(seed, regionNumber) {
    const rng = mkRng(seed || 12345);
    regionNumber = regionNumber || 1;

    // Region 1 DAG Structure:
    // Tier 0: 3 nodes (Start) -> Available
    // Tier 1: 3 nodes (Branch)
    // Tier 2: 3 nodes (Pre-Boss: Elite/Repair/Supply)
    // Tier 3: 1 Boss node (Mirage Carrier)
    const tiers = [];

    // --- Tier 0: 3 Starting Encounters ---
    const tier0 = [
      createNode('t0_n0', 0, 0, 'fight', rng.pick(NODE_ARCHETYPES.fight), 'available'),
      createNode('t0_n1', 0, 1, 'fight', rng.pick(NODE_ARCHETYPES.fight), 'available'),
      createNode('t0_n2', 0, 2, 'event', rng.pick(NODE_ARCHETYPES.event), 'available')
    ];

    // --- Tier 1: 3 Mid Encounters ---
    const tier1 = [
      createNode('t1_n0', 1, 0, 'fight', rng.pick(NODE_ARCHETYPES.fight), 'locked'),
      createNode('t1_n1', 1, 1, 'supply', rng.pick(NODE_ARCHETYPES.supply), 'locked'),
      createNode('t1_n2', 1, 2, 'event', rng.pick(NODE_ARCHETYPES.event), 'locked')
    ];

    // --- Tier 2: 3 Pre-Boss Encounters ---
    const tier2 = [
      createNode('t2_n0', 2, 0, 'elite', rng.pick(NODE_ARCHETYPES.elite), 'locked'),
      createNode('t2_n1', 2, 1, 'repair', rng.pick(NODE_ARCHETYPES.repair), 'locked'),
      createNode('t2_n2', 2, 2, 'fight', rng.pick(NODE_ARCHETYPES.fight), 'locked')
    ];

    // --- Tier 3: 1 Boss Encounter ---
    const bossTemplate = NODE_ARCHETYPES.boss[0];
    const tier3 = [
      createNode('t3_boss', 3, 0, 'boss', bossTemplate, 'locked')
    ];

    // Wire forward connections deterministically
    // Tier 0 -> Tier 1:
    // n0 -> n0, n1
    // n1 -> n1, n2
    // n2 -> n2, n0 (or n1, n2)
    tier0[0].next = ['t1_n0', 't1_n1'];
    tier0[1].next = ['t1_n1', 't1_n2'];
    tier0[2].next = ['t1_n2', 't1_n0'];

    // Tier 1 -> Tier 2:
    tier1[0].next = ['t2_n0', 't2_n1'];
    tier1[1].next = ['t2_n1', 't2_n2'];
    tier1[2].next = ['t2_n2', 't2_n0'];

    // Tier 2 -> Tier 3: All connect into the Boss gate
    tier2[0].next = ['t3_boss'];
    tier2[1].next = ['t3_boss'];
    tier2[2].next = ['t3_boss'];

    tiers.push(tier0, tier1, tier2, tier3);

    return {
      seed: seed || 12345,
      region: regionNumber,
      currentTier: 0,
      currentNodeId: null,
      history: [],
      tiers: tiers
    };
  }

  function createNode(id, tier, colIndex, type, template, status) {
    return {
      id: id,
      tier: tier,
      colIndex: colIndex,
      type: type,
      archetype: template.archetype,
      title: template.title,
      risk: template.risk,
      desc: template.desc,
      next: [],
      status: status // 'available' | 'locked' | 'visited' | 'fogged'
    };
  }

  function canVisitNode(routeMap, nodeId) {
    for (const tier of routeMap.tiers) {
      const node = tier.find(n => n.id === nodeId);
      if (node) {
        return node.status === 'available';
      }
    }
    return false;
  }

  function visitRouteNode(routeMap, nodeId) {
    let targetNode = null;
    let targetTier = -1;

    for (let t = 0; t < routeMap.tiers.length; t++) {
      const node = routeMap.tiers[t].find(n => n.id === nodeId);
      if (node) {
        targetNode = node;
        targetTier = t;
        break;
      }
    }

    if (!targetNode || targetNode.status !== 'available') {
      return null;
    }

    // Mark current node as visited
    targetNode.status = 'visited';
    routeMap.currentNodeId = targetNode.id;
    routeMap.history.push(targetNode.id);

    // Lock other nodes in the same tier (no backtracking)
    routeMap.tiers[targetTier].forEach(n => {
      if (n.id !== targetNode.id) {
        n.status = 'locked';
      }
    });

    // Advance tier
    routeMap.currentTier = targetTier + 1;

    // Enable reachable nodes in next tier
    if (routeMap.currentTier < routeMap.tiers.length) {
      routeMap.tiers[routeMap.currentTier].forEach(n => {
        if (targetNode.next.includes(n.id)) {
          n.status = 'available';
        } else {
          n.status = 'locked';
        }
      });
    }

    return targetNode;
  }

  function resolveEventChoice(run, eventType, choiceIndex, extraArg) {
    if (!run) return { success: false, reason: 'Invalid run' };
    run.ammo = run.ammo || { torpedo: 6, depthCharge: 4, sonar: 5, smoke: 3, mine: 2, fuel: 2 };
    run.deck = run.deck || [];
    run.modules = run.modules || [];

    if (eventType === 'Distress Signal') {
      if (choiceIndex === 0) {
        // Investigate: Ambush (-3 HP) but gain munitions (+2 torpedo, +1 sonar)
        run.flagshipHull = Math.max(1, (run.flagshipHull || 20) - 3);
        run.ammo.torpedo = (run.ammo.torpedo || 0) + 2;
        run.ammo.sonar = (run.ammo.sonar || 0) + 1;
        return { success: true, message: 'Ambush survived (-3 HP). Salvaged 2 torpedoes & 1 sonar charge.' };
      } else if (choiceIndex === 1) {
        // Ignore: Safe
        return { success: true, message: 'Signal ignored. Maintained tactical stealth.' };
      } else if (choiceIndex === 2) {
        // Remote scan: Costs 1 sonar, reveals next node modifier
        if (run.ammo.sonar >= 1) {
          run.ammo.sonar--;
          return { success: true, message: 'Acoustic sweep analyzed surrounding sector.' };
        }
        return { success: false, reason: 'Insufficient sonar charges' };
      }
    } else if (eventType === 'Derelict Vessel') {
      if (choiceIndex === 0) {
        // Board: Risk hull (-2 HP), gain rare card
        run.flagshipHull = Math.max(1, (run.flagshipHull || 20) - 2);
        run.deck.push('precision_salvo');
        return { success: true, message: 'Vessel boarded (-2 HP). Secured Precision Salvo doctrine card.' };
      } else if (choiceIndex === 1) {
        // Salvage: Gain 2 torpedoes
        run.ammo.torpedo = (run.ammo.torpedo || 0) + 2;
        return { success: true, message: 'Ammunition lockers salvaged (+2 torpedoes).' };
      } else if (choiceIndex === 2) {
        return { success: true, message: 'Derelict left undisturbed.' };
      }
    } else if (eventType === 'Smuggler Dock') {
      if (choiceIndex === 0) {
        // Card remove: Costs 3 HP
        run.flagshipHull = Math.max(1, (run.flagshipHull || 20) - 3);
        const cardToRemove = extraArg || run.deck[0];
        const idx = run.deck.indexOf(cardToRemove);
        if (idx !== -1) run.deck.splice(idx, 1);
        return { success: true, message: `Removed ${cardToRemove} from deck (-3 HP).` };
      } else if (choiceIndex === 1) {
        // Tech trade: Costs 2 torpedoes, gain module
        if (run.ammo.torpedo >= 2) {
          run.ammo.torpedo -= 2;
          run.modules.push('salvage_crane');
          return { success: true, message: 'Traded 2 torpedoes for Salvage Crane module.' };
        }
        return { success: false, reason: 'Insufficient torpedoes' };
      } else if (choiceIndex === 2) {
        return { success: true, message: 'Clandestine dock bypassed.' };
      }
    }

    return { success: false, reason: 'Unknown event' };
  }

  function setupEncounter(run, archetype) {
    const isBoss = archetype === 'Mirage Carrier';
    const timer = isBoss ? 60 : 75; // Boss timer is 60s per Section 10/15

    let objective = 'Destroy Hostile Flagship';
    let enemyFlagshipHP = isBoss ? 32 : 28;
    let specialRule = null;
    let sensorPenalty = 1.0;
    let transportTarget = null;
    let turnsToEscape = null;

    if (archetype === 'Silent Duel') {
      objective = 'Destroy Hostile Flagship in Low-Sensor Waters';
      sensorPenalty = 0.5;
      specialRule = 'Sensor Suppression';
    } else if (archetype === 'Convoy Raid') {
      objective = 'Intercept Hostile Transport Before Escape';
      transportTarget = { id: 'transport', hp: 12, maxHp: 12, alive: true };
      turnsToEscape = 5;
      specialRule = 'Escape Clock';
    } else if (archetype === 'Mirage Carrier') {
      objective = 'Neutralize Mirage Carrier Flagship';
      specialRule = 'Acoustic Mirage Phantoms';
    }

    function triggerPhantoms(seed) {
      const rng = mkRng(seed || 999);
      return [
        { x: rng.int(10, 18), y: rng.int(2, 8), type: 'phantom', radius: 1 },
        { x: rng.int(10, 18), y: rng.int(12, 18), type: 'phantom', radius: 1 }
      ];
    }

    return {
      archetype: archetype,
      isBoss: isBoss,
      timer: timer,
      objective: objective,
      enemyFlagshipHP: enemyFlagshipHP,
      specialRule: specialRule,
      sensorPenalty: sensorPenalty,
      transportTarget: transportTarget,
      turnsToEscape: turnsToEscape,
      triggerPhantoms: triggerPhantoms
    };
  }

  return {
    generateRouteMap: generateRouteMap,
    canVisitNode: canVisitNode,
    visitRouteNode: visitRouteNode,
    resolveEventChoice: resolveEventChoice,
    setupEncounter: setupEncounter,
    NODE_ARCHETYPES: NODE_ARCHETYPES
  };
});
