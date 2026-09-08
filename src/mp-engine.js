/**
 * Blackwater Command — Multiplayer v0 Core Game Engine
 * Shared isomorphic module (usable in Node.js authoritative server and browser client).
 * Implements: blackwater-command-multiplayer-v0-rules-lock.md
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MP = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ----------------------------------------------------
  // §1. CONSTANTS & GRID SETUP
  // ----------------------------------------------------
  const GW = 24;
  const GH = 24;
  const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');

  const T = {
    OPEN: 'o',
    ISLAND: 'i',
    SHALLOW: 's',
    DEEP: 'd',
    REEF: 'r',
    RADAR: 'R',
    SUPPLY: 'S'
  };

  const QUADRANTS = {
    NW: { x0: 0, x1: 11, y0: 0, y1: 11, colStart: 'A', colEnd: 'L', rowStart: 1, rowEnd: 12 },
    NE: { x0: 12, x1: 23, y0: 0, y1: 11, colStart: 'M', colEnd: 'X', rowStart: 1, rowEnd: 12 },
    SW: { x0: 0, x1: 11, y0: 12, y1: 23, colStart: 'A', colEnd: 'L', rowStart: 13, rowEnd: 24 },
    SE: { x0: 12, x1: 23, y0: 12, y1: 23, colStart: 'M', colEnd: 'X', rowStart: 13, rowEnd: 24 }
  };

  const MP_SHIPS = {
    flagship: { id: 'flagship', name: 'Destroyer Flagship', len: 3, hp: 20, maxHp: 20 },
    patrol: { id: 'patrol', name: 'Patrol Boat', len: 2, hp: 8, maxHp: 8 },
    minelayer: { id: 'minelayer', name: 'Minelayer', len: 2, hp: 10, maxHp: 10 }
  };

  // ----------------------------------------------------
  // §2. DETERMINISTIC RNG (Mulberry32)
  // ----------------------------------------------------
  function mkRng(seed) {
    let s = (seed >>> 0) || 1;
    function nx() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      nx,
      int: (a, b) => Math.floor(nx() * (b - a + 1)) + a,
      pick: a => a[Math.floor(nx() * a.length)],
      shuffle(a) {
        const r = [...a];
        for (let i = r.length - 1; i > 0; i--) {
          const j = Math.floor(nx() * (i + 1));
          [r[i], r[j]] = [r[j], r[i]];
        }
        return r;
      }
    };
  }

  // ----------------------------------------------------
  // §3. COORDINATES & QUADRANTS
  // ----------------------------------------------------
  function cid(x, y) {
    if (x < 0 || x >= GW || y < 0 || y >= GH) return '??';
    return `${COLS[x]}${y + 1}`;
  }

  function parseCid(str) {
    if (!str || str.length < 2) return null;
    const colChar = str.charAt(0).toUpperCase();
    const rowNum = parseInt(str.slice(1), 10);
    const x = COLS.indexOf(colChar);
    const y = rowNum - 1;
    if (x < 0 || x >= GW || isNaN(rowNum) || y < 0 || y >= GH) return null;
    return { x, y };
  }

  function getQuadrant(x, y) {
    if (x >= 0 && x <= 11 && y >= 0 && y <= 11) return 'NW';
    if (x >= 12 && x <= 23 && y >= 0 && y <= 11) return 'NE';
    if (x >= 0 && x <= 11 && y >= 12 && y <= 23) return 'SW';
    if (x >= 12 && x <= 23 && y >= 12 && y <= 23) return 'SE';
    return null;
  }

  function canShipMoveTo(quadrantKey, targetX, targetY) {
    return getQuadrant(targetX, targetY) === quadrantKey;
  }

  // ----------------------------------------------------
  // §4. 24x24 TERRAIN GENERATOR
  // ----------------------------------------------------
  function genMPGrid(rng) {
    const g = Array.from({ length: GH }, () => Array(GW).fill(T.OPEN));

    // Place 2-3 island clusters per quadrant
    for (const qKey of Object.keys(QUADRANTS)) {
      const q = QUADRANTS[qKey];
      const clusterCount = rng.int(2, 3);
      for (let c = 0; c < clusterCount; c++) {
        let cx = rng.int(q.x0 + 2, q.x1 - 2);
        let cy = rng.int(q.y0 + 2, q.y1 - 2);
        const sz = rng.int(2, 5);
        g[cy][cx] = T.ISLAND;
        for (let i = 1; i < sz; i++) {
          const d = rng.pick([[0, 1], [0, -1], [1, 0], [-1, 0]]);
          const nx = cx + d[0];
          const ny = cy + d[1];
          if (nx >= q.x0 + 1 && nx <= q.x1 - 1 && ny >= q.y0 + 1 && ny <= q.y1 - 1) {
            g[ny][nx] = T.ISLAND;
            cx = nx;
            cy = ny;
          }
        }
      }

      // One radar station per quadrant
      let placedRadar = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const rx = rng.int(q.x0 + 2, q.x1 - 2);
        const ry = rng.int(q.y0 + 2, q.y1 - 2);
        if (g[ry][rx] === T.OPEN) {
          g[ry][rx] = T.RADAR;
          placedRadar = true;
          break;
        }
      }
      if (!placedRadar) g[q.y0 + 5][q.x0 + 5] = T.RADAR;
    }

    return g;
  }

  // ----------------------------------------------------
  // §5. MULTI-CELL SHIP CALCULATIONS & VALIDATION
  // ----------------------------------------------------
  function getShipCells(shipId, x, y, orientation) {
    const def = MP_SHIPS[shipId];
    if (!def) return [];
    const len = def.len;
    const cells = [];
    const orient = orientation === 'V' ? 'V' : 'H';
    for (let i = 0; i < len; i++) {
      cells.push({
        x: orient === 'H' ? x + i : x,
        y: orient === 'V' ? y + i : y
      });
    }
    return cells;
  }

  function validateMPShipPlacement(grid, quadrantKey, shipId, x, y, orientation) {
    const q = QUADRANTS[quadrantKey];
    if (!q) return { valid: false, reason: `Unknown quadrant ${quadrantKey}` };
    const cells = getShipCells(shipId, x, y, orientation);

    for (const c of cells) {
      // Quadrant bounds check
      if (c.x < q.x0 || c.x > q.x1 || c.y < q.y0 || c.y > q.y1) {
        return {
          valid: false,
          reason: `Ship segment at ${cid(c.x, c.y)} is outside assigned home quadrant (${q.colStart}${q.rowStart}–${q.colEnd}${q.rowEnd}).`
        };
      }
      // Terrain restriction check
      const tile = grid[c.y][c.x];
      if (tile === T.ISLAND || tile === T.RADAR) {
        return { valid: false, reason: `Cannot place ship over land or radar station at ${cid(c.x, c.y)}.` };
      }
      if ((shipId === 'flagship' || shipId === 'minelayer') && tile === T.REEF) {
        return { valid: false, reason: `Only Patrol Boat can navigate reefs at ${cid(c.x, c.y)}.` };
      }
    }

    return { valid: true, reason: 'Valid multi-cell placement.', cells };
  }

  function getShipSurroundingWaterRoutes(grid, cells) {
    const deltas = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const shipSet = new Set(cells.map(c => `${c.x},${c.y}`));
    let routes = 0;

    for (const c of cells) {
      for (const [dx, dy] of deltas) {
        const nx = c.x + dx;
        const ny = c.y + dy;
        const key = `${nx},${ny}`;
        if (nx >= 0 && nx < GW && ny >= 0 && ny < GH && !shipSet.has(key)) {
          if (grid[ny][nx] !== T.ISLAND && grid[ny][nx] !== T.RADAR) {
            routes++;
          }
        }
      }
    }
    return routes;
  }

  function validateMPFleet(grid, quadrantKey, fleet) {
    const errors = [];
    if (!fleet || !fleet.flagship || !fleet.patrol || !fleet.minelayer) {
      return { valid: false, errors: ['Fleet must contain flagship, patrol, and minelayer.'] };
    }

    const occupied = new Map();
    const ships = ['flagship', 'patrol', 'minelayer'];

    for (const sId of ships) {
      const p = fleet[sId];
      if (!p) {
        errors.push(`Missing placement for ${sId}`);
        continue;
      }
      const val = validateMPShipPlacement(grid, quadrantKey, sId, p.x, p.y, p.o || 'H');
      if (!val.valid) {
        errors.push(`${sId}: ${val.reason}`);
        continue;
      }
      for (const c of val.cells) {
        const key = `${c.x},${c.y}`;
        if (occupied.has(key)) {
          errors.push(`Ship collision at ${cid(c.x, c.y)} between ${occupied.get(key)} and ${sId}.`);
        }
        occupied.set(key, sId);
      }
    }

    // Flagship safety check: ≥ 2 legal adjacent water routes
    if (fleet.flagship) {
      const fCells = getShipCells('flagship', fleet.flagship.x, fleet.flagship.y, fleet.flagship.o || 'H');
      if (getShipSurroundingWaterRoutes(grid, fCells) < 2) {
        errors.push('Flagship requires at least 2 open adjacent water routes.');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  function quickDeployMP(grid, quadrantKey, rng) {
    const q = QUADRANTS[quadrantKey];
    if (!q) return null;

    for (let attempts = 0; attempts < 200; attempts++) {
      const fOrient = rng.pick(['H', 'V']);
      const fx = rng.int(q.x0 + 1, fOrient === 'H' ? q.x1 - 3 : q.x1 - 1);
      const fy = rng.int(q.y0 + 1, fOrient === 'V' ? q.y1 - 3 : q.y1 - 1);

      const pOrient = rng.pick(['H', 'V']);
      const px = rng.int(q.x0 + 1, pOrient === 'H' ? q.x1 - 2 : q.x1 - 1);
      const py = rng.int(q.y0 + 1, pOrient === 'V' ? q.y1 - 2 : q.y1 - 1);

      const mOrient = rng.pick(['H', 'V']);
      const mx = rng.int(q.x0 + 1, mOrient === 'H' ? q.x1 - 2 : q.x1 - 1);
      const my = rng.int(q.y0 + 1, mOrient === 'V' ? q.y1 - 2 : q.y1 - 1);

      const candidateFleet = {
        flagship: { x: fx, y: fy, o: fOrient },
        patrol: { x: px, y: py, o: pOrient },
        minelayer: { x: mx, y: my, o: mOrient }
      };

      const check = validateMPFleet(grid, quadrantKey, candidateFleet);
      if (check.valid) {
        return candidateFleet;
      }
    }

    // Deterministic fallback inside quadrant
    return {
      flagship: { x: q.x0 + 2, y: q.y0 + 2, o: 'H' },
      patrol: { x: q.x0 + 2, y: q.y0 + 5, o: 'H' },
      minelayer: { x: q.x0 + 2, y: q.y0 + 8, o: 'H' }
    };
  }

  // ----------------------------------------------------
  // §6. STARTER DECK & MATCH STATE
  // ----------------------------------------------------
  const MP_START_DECK = [
    'narrow_sonar', 'narrow_sonar',
    'torpedo_line', 'torpedo_line',
    'thermal_wake', 'depth_pattern',
    'flank_speed', 'go_silent',
    'decoy_buoy', 'patrol_plane',
    'sector_sweep', 'radar_jammer'
  ];

  function createMPMatch(seed, mode, playerConfigs) {
    if (typeof seed === 'object' && seed !== null) {
      const opts = seed;
      seed = opts.seed;
      mode = opts.mode;
      playerConfigs = opts.playerConfigs;
    }
    seed = seed || 12345;
    mode = mode || '1v1v1v1';
    if (!playerConfigs || !Array.isArray(playerConfigs)) {
      playerConfigs = [
        { id: 'p1', name: 'Player 1', team: 'T1' },
        { id: 'p2', name: 'Player 2', team: 'T2' },
        { id: 'p3', name: 'Player 3', team: 'T1' },
        { id: 'p4', name: 'Player 4', team: 'T2' }
      ];
    }
    const rng = mkRng(seed);
    const grid = genMPGrid(rng);
    const qKeys = ['NW', 'NE', 'SW', 'SE'];

    const players = playerConfigs.map((cfg, idx) => {
      const qKey = qKeys[idx];
      const team = mode === '2v2' ? (cfg.team || (idx % 2 === 0 ? 'T1' : 'T2')) : `P${idx + 1}`;
      const deck = rng.shuffle([...MP_START_DECK]);
      const hand = deck.slice(0, 5);
      const drawPile = deck.slice(5);

      return {
        id: cfg.id,
        name: cfg.name || `Player ${idx + 1}`,
        quadrant: qKey,
        team,
        cp: 3,
        maxCp: 6,
        hand,
        deck: drawPile,
        discard: [],
        ammo: { torpedo: 6, depthCharge: 4, sonar: 5, smoke: 3, mine: 2, fuel: 2 },
        fleet: null,
        deployed: false,
        alive: true,
        eliminated: false,
        supportSpent: { patrol: false, minelayer: false },
        surrenderPending: false
      };
    });

    return {
      seed,
      mode,
      grid,
      rng,
      phase: 'DEPLOYMENT', // 'DEPLOYMENT' | 'BATTLE' | 'STORM' | 'FINISHED'
      players,
      turnOrder: [],
      activePlayerId: null,
      turnIndex: 0,
      round: 1,
      maxRounds: 20,
      sharedIntel: { T1: [], T2: [] },
      eventsLog: [],
      winner: null
    };
  }

  function submitDeployment(match, playerId, fleetPlacements) {
    const player = match.players.find(p => p.id === playerId);
    if (!player) return { success: false, reason: 'Player not found' };

    const check = validateMPFleet(match.grid, player.quadrant, fleetPlacements);
    if (!check.valid) {
      return { success: false, reason: check.errors[0] };
    }

    // Hydrate fleet ship structures with HP and cells
    player.fleet = {
      flagship: {
        id: 'flagship',
        x: fleetPlacements.flagship.x,
        y: fleetPlacements.flagship.y,
        o: fleetPlacements.flagship.o || 'H',
        cells: getShipCells('flagship', fleetPlacements.flagship.x, fleetPlacements.flagship.y, fleetPlacements.flagship.o || 'H'),
        hp: 20,
        maxHp: 20,
        alive: true
      },
      patrol: {
        id: 'patrol',
        x: fleetPlacements.patrol.x,
        y: fleetPlacements.patrol.y,
        o: fleetPlacements.patrol.o || 'H',
        cells: getShipCells('patrol', fleetPlacements.patrol.x, fleetPlacements.patrol.y, fleetPlacements.patrol.o || 'H'),
        hp: 8,
        maxHp: 8,
        alive: true
      },
      minelayer: {
        id: 'minelayer',
        x: fleetPlacements.minelayer.x,
        y: fleetPlacements.minelayer.y,
        o: fleetPlacements.minelayer.o || 'H',
        cells: getShipCells('minelayer', fleetPlacements.minelayer.x, fleetPlacements.minelayer.y, fleetPlacements.minelayer.o || 'H'),
        hp: 10,
        maxHp: 10,
        alive: true
      }
    };
    player.deployed = true;

    // If all players deployed, roll initiative and start battle
    if (match.players.every(p => p.deployed)) {
      match.phase = 'BATTLE';

      // Roll initiative
      let rolls = match.players.map(p => ({ id: p.id, roll: match.rng.int(1, 6) }));
      rolls.sort((a, b) => b.roll - a.roll);

      const winnerIdx = match.players.findIndex(p => p.id === rolls[0].id);
      // Fixed clockwise turn order starting from winner
      match.turnOrder = [];
      for (let i = 0; i < match.players.length; i++) {
        match.turnOrder.push(match.players[(winnerIdx + i) % match.players.length].id);
      }
      match.turnIndex = 0;
      match.activePlayerId = match.turnOrder[0];
    }

    return { success: true };
  }

  function handleTurnTimeoutOrSkip(match, playerId) {
    const player = match.players.find(p => p.id === playerId);
    if (!player) return;

    if (player.cp >= 1) {
      player.cp -= 1;
    } else if (player.hand.length > 0) {
      player.discard.push(player.hand.pop());
    }
    endMPTurn(match, playerId, true);
  }

  function endMPTurn(match, playerId, isSkip) {
    if (match.activePlayerId !== playerId) return;

    const currentIdx = match.turnOrder.indexOf(playerId);
    let nextIdx = (currentIdx + 1) % match.turnOrder.length;

    // Check if wrapped around to complete a full round
    if (nextIdx === 0) {
      match.round++;
      // Round refresh: all alive supports refresh
      match.players.forEach(p => {
        if (p.alive && !p.eliminated) {
          if (p.fleet && p.fleet.patrol && p.fleet.patrol.alive) p.supportSpent.patrol = false;
          if (p.fleet && p.fleet.minelayer && p.fleet.minelayer.alive) p.supportSpent.minelayer = false;
        }
      });
    }

    // Advance to next non-eliminated player
    let loops = 0;
    while (loops < match.turnOrder.length) {
      const candidateId = match.turnOrder[nextIdx];
      const candidatePlayer = match.players.find(p => p.id === candidateId);
      if (candidatePlayer && !candidatePlayer.eliminated) {
        match.activePlayerId = candidateId;
        match.turnIndex = nextIdx;

        // Resource grant at start of active player's turn:
        // Carry over CP + 2 (capped at 6)
        candidatePlayer.cp = Math.min(candidatePlayer.maxCp, candidatePlayer.cp + 2);

        // Draw 2 cards (hand limit 8)
        for (let d = 0; d < 2; d++) {
          if (candidatePlayer.hand.length < 8) {
            if (candidatePlayer.deck.length === 0 && candidatePlayer.discard.length > 0) {
              candidatePlayer.deck = match.rng.shuffle([...candidatePlayer.discard]);
              candidatePlayer.discard = [];
            }
            if (candidatePlayer.deck.length > 0) {
              candidatePlayer.hand.push(candidatePlayer.deck.pop());
            }
          }
        }
        break;
      }
      nextIdx = (nextIdx + 1) % match.turnOrder.length;
      loops++;
    }
  }

  function usePlatformAction(match, playerId, shipId) {
    const player = match.players.find(p => p.id === playerId);
    if (!player) return { success: false, reason: 'Player not found' };

    if (!player.fleet || !player.fleet[shipId] || !player.fleet[shipId].alive) {
      return { success: false, reason: 'Ship platform destroyed or unavailable' };
    }

    if (player.supportSpent[shipId]) {
      return { success: false, reason: 'Platform action already used this round' };
    }

    player.supportSpent[shipId] = true;
    return { success: true };
  }

  function addSharedIntel(match, teamId, intelItem) {
    if (!match.sharedIntel[teamId]) {
      match.sharedIntel[teamId] = [];
    }
    match.sharedIntel[teamId].push(intelItem);
  }

  function getFilteredState(match, viewerId) {
    const viewer = match.players.find((p, idx) => p.id === viewerId || idx === viewerId || p.id === 'p' + (viewerId + 1));
    if (!viewer) return null;

    const selfState = {
      id: viewer.id,
      name: viewer.name,
      team: viewer.team,
      quadrant: viewer.quadrant,
      cp: viewer.cp,
      maxCp: viewer.maxCp,
      hand: [...viewer.hand],
      ammo: { ...viewer.ammo },
      fleet: viewer.fleet,
      supportSpent: { ...viewer.supportSpent },
      alive: viewer.alive,
      eliminated: viewer.eliminated
    };

    const opponentsState = match.players
      .filter(p => p.id !== viewer.id)
      .map(p => {
        let flagshipHp = 0;
        let survivingSupports = 0;
        if (p.fleet) {
          if (p.fleet.flagship && p.fleet.flagship.alive) flagshipHp = p.fleet.flagship.hp;
          if (p.fleet.patrol && p.fleet.patrol.alive) survivingSupports++;
          if (p.fleet.minelayer && p.fleet.minelayer.alive) survivingSupports++;
        }
        return {
          id: p.id,
          name: p.name,
          team: p.team,
          quadrant: p.quadrant,
          alive: p.alive,
          eliminated: p.eliminated,
          flagshipHp,
          survivingSupports
        };
      });

    const sharedIntel = match.mode === '2v2' ? (match.sharedIntel[viewer.team] || []) : [];

    return {
      phase: match.phase,
      mode: match.mode,
      round: match.round,
      turnOrder: match.turnOrder,
      activePlayerId: match.activePlayerId,
      self: selfState,
      opponents: opponentsState,
      sharedIntel
    };
  }

  // ----------------------------------------------------
  // §7. COMBAT, ELIMINATION, SURRENDER & STORM COLLAPSE
  // ----------------------------------------------------
  function resolveAttack(match, attackerId, tx, ty, damage) {
    const attacker = match.players.find(p => p.id === attackerId);
    let hitShip = null;
    let targetPlayer = null;

    for (const p of match.players) {
      if (!p.alive || p.eliminated || !p.fleet) continue;
      for (const sId of ['flagship', 'patrol', 'minelayer']) {
        const ship = p.fleet[sId];
        if (ship && ship.alive && ship.cells.some(c => c.x === tx && c.y === ty)) {
          hitShip = ship;
          targetPlayer = p;
          break;
        }
      }
      if (hitShip) break;
    }

    if (hitShip && targetPlayer) {
      hitShip.hp = Math.max(0, hitShip.hp - damage);
      const sunk = hitShip.hp <= 0;
      if (sunk) hitShip.alive = false;

      // Public event: zero coordinates leaked to bystanders
      match.eventsLog.push({
        type: 'HIT',
        turn: match.round,
        attackerId,
        targetPlayerId: targetPlayer.id,
        publicText: `${attacker ? attacker.name : 'Attacker'} hit ${targetPlayer.name}.`,
        sunkShipId: sunk ? hitShip.id : null
      });

      checkEliminationsAndVictory(match);

      return {
        hit: true,
        targetPlayerId: targetPlayer.id,
        shipId: hitShip.id,
        sunk,
        damage
      };
    } else {
      match.eventsLog.push({
        type: 'MISS',
        turn: match.round,
        attackerId,
        publicText: `${attacker ? attacker.name : 'Attacker'} missed.`
      });

      return { hit: false };
    }
  }

  function checkEliminationsAndVictory(match) {
    // Check player eliminations
    for (const p of match.players) {
      if (p.fleet) {
        const anyAlive = (p.fleet.flagship && p.fleet.flagship.alive) ||
                         (p.fleet.patrol && p.fleet.patrol.alive) ||
                         (p.fleet.minelayer && p.fleet.minelayer.alive);
        if (!anyAlive) {
          p.alive = false;
          p.eliminated = true;
        }
      }
    }

    // Check Victory condition
    if (match.mode === '1v1v1v1') {
      const active = match.players.filter(p => p.alive && !p.eliminated);
      if (active.length === 1) {
        match.phase = 'FINISHED';
        match.winner = active[0].id;
      }
    } else if (match.mode === '2v2') {
      const t1Alive = match.players.some(p => p.team === 'T1' && p.alive && !p.eliminated);
      const t2Alive = match.players.some(p => p.team === 'T2' && p.alive && !p.eliminated);

      if (t1Alive && !t2Alive) {
        match.phase = 'FINISHED';
        match.winner = 'T1';
      } else if (t2Alive && !t1Alive) {
        match.phase = 'FINISHED';
        match.winner = 'T2';
      }
    }
  }

  function submitSurrender(match, playerId) {
    const player = match.players.find(p => p.id === playerId);
    if (!player || player.eliminated) return { status: 'INVALID' };

    if (match.mode === '1v1v1v1') {
      player.alive = false;
      player.eliminated = true;
      checkEliminationsAndVictory(match);
      return { status: 'SURRENDERED' };
    } else if (match.mode === '2v2') {
      const teammate = match.players.find(p => p.team === player.team && p.id !== player.id);
      if (teammate && teammate.surrenderPending) {
        // Both teammates confirmed surrender!
        player.alive = false;
        player.eliminated = true;
        teammate.alive = false;
        teammate.eliminated = true;
        match.winner = player.team === 'T1' ? 'T2' : 'T1';
        match.phase = 'FINISHED';
        return { status: 'TEAM_SURRENDERED' };
      } else {
        player.surrenderPending = true;
        return { status: 'SURRENDER_PENDING' };
      }
    }
  }

  function processStormCollapse(match) {
    if (match.round >= 20) {
      match.phase = 'STORM';
      match.stormUnsafeRings = Math.max(1, (match.round - 20) + 1);
    }
  }

  return {
    GW,
    GH,
    COLS,
    T,
    QUADRANTS,
    MP_SHIPS,
    MP_START_DECK,
    mkRng,
    cid,
    parseCid,
    getQuadrant,
    getCellQuadrant: getQuadrant,
    canShipMoveTo,
    genMPGrid,
    getShipCells,
    validateMPShipPlacement,
    validateMPFleet,
    quickDeployMP,
    createMPMatch,
    submitDeployment,
    endMPTurn,
    handleTurnTimeoutOrSkip,
    usePlatformAction,
    addSharedIntel,
    getFilteredState,
    resolveAttack,
    checkEliminationsAndVictory,
    submitSurrender,
    processStormCollapse
  };
});
