// test/inline-engines.js - Inlines RouteEngine, MPEngine, and integration functions into blackwater-command.html
const fs = require('fs');
const path = require('path');

const routeEngineSrc = fs.readFileSync(path.resolve(__dirname, '../src/route-engine.js'), 'utf8');
const mpEngineSrc = fs.readFileSync(path.resolve(__dirname, '../src/mp-engine.js'), 'utf8');
const htmlPath = path.resolve(__dirname, '../blackwater-command.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Extract the factory functions from the UMD wrappers
// route-engine:
// })(typeof self !== 'undefined' ? self : this, function () { ... });
const routeFactoryMatch = routeEngineSrc.match(/function\s*\(\)\s*\{([\s\S]*)\}\);\s*$/);
if (!routeFactoryMatch) {
  throw new Error('Could not extract RouteEngine factory');
}
const routeEngineBody = routeFactoryMatch[1];

// mp-engine:
const mpFactoryMatch = mpEngineSrc.match(/function\s*\(\)\s*\{([\s\S]*)\}\);\s*$/);
if (!mpFactoryMatch) {
  throw new Error('Could not extract MPEngine factory');
}
const mpEngineBody = mpFactoryMatch[1];

const inlinedEnginesBlock = `
/* ════════════════════════════════════════════════════════════════
   §0A  INLINED ROUTE ENGINE (Roguelite DAG & Replay Analysis)
════════════════════════════════════════════════════════════════ */
const RouteEngine = (function () {
${routeEngineBody}
})();

/* ════════════════════════════════════════════════════════════════
   §0B  INLINED MULTIPLAYER ENGINE (24×24 Quadrant Hotseat)
════════════════════════════════════════════════════════════════ */
const MP = (function () {
${mpEngineBody}
})();
const MPEngine = MP;

/* ════════════════════════════════════════════════════════════════
   §0C  ROGUELITE CAMPAIGN & ROUTE MAP STATE MACHINE
════════════════════════════════════════════════════════════════ */
let campaignRun = null;
let currentSelectedNode = null;
let currentEventData = null;
let activeEncounterArchetype = null;

function startCampaignRun(seed) {
  let s = parseInt(seed) || 0;
  if (!s || isNaN(s)) {
    const inp = document.getElementById('seed-in');
    s = parseInt(inp ? inp.value : '') || Math.floor(Math.random() * 99998) + 1;
  }
  campaignRun = {
    seed: s,
    region: 1,
    currentTier: 0,
    currentNodeId: null,
    flagshipHull: 20,
    maxHull: 20,
    ammo: { torpedo: 6, depthCharge: 4, sonar: 5, smoke: 3, mine: 2, fuel: 2 },
    deck: ['torpedo_salvo', 'acoustic_sweep', 'evasive_rudder', 'depth_charge', 'decoy_buoy', 'smoke_screen'],
    modules: [],
    cardUpgrades: {},
    map: RouteEngine.generateRouteMap(s, 1),
    history: []
  };
  updateRouteHUD();
  renderRouteMap();
  showScreen('scr-route-map');
}

function updateRouteHUD() {
  if (!campaignRun) return;
  const hullEl = document.getElementById('route-hull-status');
  const torpEl = document.getElementById('route-torpedo-status');
  const sonEl = document.getElementById('route-sonar-status');
  const tierEl = document.getElementById('route-tier-lbl');
  if (hullEl) hullEl.textContent = 'HULL: ' + campaignRun.flagshipHull + '/' + campaignRun.maxHull;
  if (torpEl) torpEl.textContent = 'TORP: ' + (campaignRun.ammo.torpedo || 0);
  if (sonEl) sonEl.textContent = 'SONAR: ' + (campaignRun.ammo.sonar || 0);
  if (tierEl) tierEl.textContent = 'TIER ' + ((campaignRun.map ? campaignRun.map.currentTier : 0) + 1) + ' OF 4';
}

function renderRouteMap() {
  const container = document.getElementById('route-map-container');
  if (!container || !campaignRun || !campaignRun.map) return;
  const tiers = campaignRun.map.tiers;
  const tierLabels = ['TIER 1: RECON OUTPOST', 'TIER 2: PATROL LANES', 'TIER 3: PRE-BOSS APPROACH', 'TIER 4: REGIONAL FLAGSHIP'];

  let htmlOut = '';
  for (let t = 0; t < tiers.length; t++) {
    const tier = tiers[t];
    htmlOut += '<div style="display:flex;flex-direction:column;align-items:center;width:100%">';
    htmlOut += '<div style="font-size:.65rem;color:#4a6a8a;letter-spacing:.15em;margin-bottom:6px">' + (tierLabels[t] || ('TIER ' + (t + 1))) + '</div>';
    htmlOut += '<div class="route-tier">';
    for (let i = 0; i < tier.length; i++) {
      const node = tier[i];
      const isAvailable = node.status === 'available';
      const isVisited = node.status === 'visited';
      const isBoss = node.type === 'boss';

      const statusClass = isVisited ? 'visited' : isAvailable ? 'available' : 'locked';
      const badgeClass = 'badge-' + node.type;

      htmlOut += '<div class="route-node ' + statusClass + (isBoss ? ' boss' : '') + '" onclick="selectRouteNode(\\'' + node.id + '\\')">';
      htmlOut += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
      htmlOut += '<span class="node-type-badge ' + badgeClass + '">' + node.type.toUpperCase() + '</span>';
      htmlOut += '<span style="font-size:.6rem;color:' + (isAvailable ? '#50c878' : '#3a5a7a') + '">' + node.status.toUpperCase() + '</span>';
      htmlOut += '</div>';
      htmlOut += '<div style="font-size:.78rem;font-weight:bold;color:#d4a843;margin-bottom:3px">' + node.title + '</div>';
      htmlOut += '<div style="font-size:.65rem;color:#8aa8c8;line-height:1.4">' + node.desc + '</div>';
      htmlOut += '</div>';
    }
    htmlOut += '</div>';
    if (t < tiers.length - 1) {
      htmlOut += '<div style="color:#1a3a5a;font-size:.9rem;margin:4px 0">▼ &nbsp; ▼ &nbsp; ▼</div>';
    }
    htmlOut += '</div>';
  }
  container.innerHTML = htmlOut;
}

function selectRouteNode(nodeId) {
  if (!campaignRun || !campaignRun.map) return;
  const node = RouteEngine.visitRouteNode(campaignRun.map, nodeId);
  if (!node) return;

  currentSelectedNode = node;
  updateRouteHUD();
  renderRouteMap();

  if (node.type === 'event') {
    openEventModal(node);
  } else if (node.type === 'repair') {
    openRepairModal(node);
  } else if (node.type === 'supply') {
    openSupplyModal(node);
  } else if (node.type === 'fight' || node.type === 'elite' || node.type === 'boss') {
    launchEncounterNode(node);
  }
}

function openEventModal(node) {
  const modal = document.getElementById('event-modal');
  const title = document.getElementById('event-title');
  const badge = document.getElementById('event-badge');
  const desc = document.getElementById('event-desc');
  const wrap = document.getElementById('event-choices-wrap');
  if (!modal) return;

  currentEventData = node.archetype;
  if (title) title.textContent = node.title;
  if (badge) {
    badge.textContent = 'DECISION EVENT';
    badge.className = 'node-type-badge badge-event';
  }
  if (desc) desc.textContent = node.desc;

  let choices = [];
  if (node.archetype === 'Distress Signal') {
    choices = [
      { text: '1. Investigate coordinates (Risk ambush, salvage munitions)', idx: 0 },
      { text: '2. Ignore distress signal (Maintain stealth)', idx: 1 },
      { text: '3. Acoustic sensor ping (-1 Sonar charge)', idx: 2 }
    ];
  } else if (node.archetype === 'Derelict Vessel') {
    choices = [
      { text: '1. Board drifting hulk (Risk crew -2 HP, gain rare card)', idx: 0 },
      { text: '2. Strip external munitions (+2 Torpedoes)', idx: 1 },
      { text: '3. Pass without contact', idx: 2 }
    ];
  } else if (node.archetype === 'Smuggler Dock') {
    choices = [
      { text: '1. Scrap damaged hull section to streamline deck (-3 HP, remove card)', idx: 0 },
      { text: '2. Trade 2 Torpedoes for Salvage Crane passive module', idx: 1 },
      { text: '3. Refuse transaction and depart', idx: 2 }
    ];
  } else {
    choices = [
      { text: '1. Proceed with caution', idx: 0 },
      { text: '2. Bypass sector', idx: 1 }
    ];
  }

  if (wrap) {
    wrap.innerHTML = choices.map(c => '<button class="event-choice-btn" onclick="onSelectEventChoice(' + c.idx + ')">' + c.text + '</button>').join('');
  }
  modal.classList.add('active');
}

function onSelectEventChoice(choiceIdx) {
  if (!campaignRun) return;
  const res = RouteEngine.resolveEventChoice(campaignRun, currentEventData, choiceIdx);
  const wrap = document.getElementById('event-choices-wrap');
  if (wrap) {
    wrap.innerHTML = '<div style="padding:10px;background:#0d2438;border:1px solid #50c878;color:#50c878;font-size:.78rem;border-radius:4px;line-height:1.5">' +
      (res.message || res.reason || 'Decision resolved.') +
      '</div><button class="btn g" style="margin-top:10px" onclick="closeEventModal()">RETURN TO ROUTE MAP</button>';
  }
  updateRouteHUD();
  renderRouteMap();
}

function closeEventModal() {
  const modal = document.getElementById('event-modal');
  if (modal) modal.classList.remove('active');
}

function openRepairModal(node) {
  const modal = document.getElementById('event-modal');
  const title = document.getElementById('event-title');
  const badge = document.getElementById('event-badge');
  const desc = document.getElementById('event-desc');
  const wrap = document.getElementById('event-choices-wrap');
  if (!modal) return;

  if (title) title.textContent = 'ALLIED REPAIR MOORING';
  if (badge) {
    badge.textContent = 'REPAIR & REFIT';
    badge.className = 'node-type-badge badge-repair';
  }
  if (desc) desc.textContent = 'Moored alongside an allied tender ship. Repair damaged hull plating or reconfigure weapon systems.';

  if (wrap) {
    wrap.innerHTML = '<button class="event-choice-btn" onclick="applyFieldRepair(5)">1. Field Patch (+5 Flagship Hull Integrity)</button>' +
      '<button class="event-choice-btn" onclick="applyHullTuning()">2. Reconfigure Munitions (+2 Torpedoes, +1 Sonar)</button>';
  }
  modal.classList.add('active');
}

function applyFieldRepair(amount) {
  if (campaignRun) {
    campaignRun.flagshipHull = Math.min(campaignRun.maxHull, (campaignRun.flagshipHull || 20) + amount);
    updateRouteHUD();
  }
  closeEventModal();
}

function applyHullTuning() {
  if (campaignRun) {
    campaignRun.ammo.torpedo = (campaignRun.ammo.torpedo || 0) + 2;
    campaignRun.ammo.sonar = (campaignRun.ammo.sonar || 0) + 1;
    updateRouteHUD();
  }
  closeEventModal();
}

function openSupplyModal(node) {
  const modal = document.getElementById('event-modal');
  const title = document.getElementById('event-title');
  const badge = document.getElementById('event-badge');
  const desc = document.getElementById('event-desc');
  const wrap = document.getElementById('event-choices-wrap');
  if (!modal) return;

  if (title) title.textContent = 'NAVAL MUNITIONS DEPOT';
  if (badge) {
    badge.textContent = 'SUPPLY CACHE';
    badge.className = 'node-type-badge badge-supply';
  }
  if (desc) desc.textContent = 'Restock vital ordnance and surveillance charges before entering hostile waters.';

  if (wrap) {
    wrap.innerHTML = '<button class="event-choice-btn" onclick="applySupplyChoice(\\'ammo\\')">1. Restock Torpedoes & Depth Charges (+3 Torpedoes, +2 Charges)</button>' +
      '<button class="event-choice-btn" onclick="applySupplyChoice(\\'sensors\\')">2. Replenish Reconnaissance Suite (+3 Sonar Charges, +2 Decoy Buoys)</button>';
  }
  modal.classList.add('active');
}

function applySupplyChoice(type) {
  if (campaignRun) {
    if (type === 'ammo') {
      campaignRun.ammo.torpedo = (campaignRun.ammo.torpedo || 0) + 3;
      campaignRun.ammo.depthCharge = (campaignRun.ammo.depthCharge || 0) + 2;
    } else {
      campaignRun.ammo.sonar = (campaignRun.ammo.sonar || 0) + 3;
      campaignRun.ammo.smoke = (campaignRun.ammo.smoke || 0) + 2;
    }
    updateRouteHUD();
  }
  closeEventModal();
}

function launchEncounterNode(node) {
  const enc = RouteEngine.setupEncounter(campaignRun, node.archetype);
  activeEncounterArchetype = enc;
  startPreparation(campaignRun.seed + (campaignRun.map.currentTier * 1337));
}

function returnToRouteMap() {
  if (campaignRun) {
    updateRouteHUD();
    renderRouteMap();
    showScreen('scr-route-map');
  } else {
    showTitle();
  }
}

/* ════════════════════════════════════════════════════════════════
   §0D  ANALYZE MODE & PROBABILITY HEATMAP REPLAY
════════════════════════════════════════════════════════════════ */
let analyzeSession = null;
let analyzeVisionMode = 'ai_vision';

function openAnalyzeMode() {
  let record = (G && G.battleRecord && G.battleRecord.turns && G.battleRecord.turns.length > 0)
    ? G.battleRecord
    : null;

  if (!record) {
    const dummyTurns = [];
    for (let t = 1; t <= 3; t++) {
      const probGrid = [];
      for (let i = 0; i < 400; i++) {
        const x = i % 20, y = Math.floor(i / 20);
        let p = 0.05;
        if (x >= 4 && x <= 8 && y >= 4 && y <= 8) p = 0.25 * t;
        probGrid.push({ x, y, prob: Math.min(0.95, p) });
      }
      dummyTurns.push({
        turn: t,
        pFleet: [{ id: 'flagship', x: 6, y: 6, len: 3, alive: true }],
        eFleet: [{ id: 'enemy', x: 14, y: 14, len: 3, alive: true }],
        aiProbGrid: probGrid,
        aiAction: { x: 6, y: 7, reason: 'Acoustic bearing search pattern' },
        evidence: { hits: [{ x: 6, y: 6 }], decoys: [] }
      });
    }
    record = { seed: (G ? G.seed : 1234), turns: dummyTurns };
  }

  analyzeSession = RouteEngine.createAnalyzeSession(record);
  analyzeSession.currentTurn = 1;

  const scrubber = document.getElementById('analyze-scrubber');
  if (scrubber) {
    scrubber.min = 1;
    scrubber.max = Math.max(1, analyzeSession.totalTurns);
    scrubber.value = 1;
  }

  renderAnalyzeHeatmap(1);
  showScreen('scr-analyze');
}

function onAnalyzeScrub(turnVal) {
  const t = parseInt(turnVal, 10);
  if (!analyzeSession) return;
  analyzeSession.currentTurn = t;
  renderAnalyzeHeatmap(t);
}

function stepAnalyzeTurn(delta) {
  if (!analyzeSession) return;
  const newT = Math.max(1, Math.min(analyzeSession.totalTurns, analyzeSession.currentTurn + delta));
  analyzeSession.currentTurn = newT;
  const scrubber = document.getElementById('analyze-scrubber');
  if (scrubber) scrubber.value = newT;
  renderAnalyzeHeatmap(newT);
}

function toggleAnalyzeVision() {
  analyzeVisionMode = analyzeVisionMode === 'ai_vision' ? 'ground_truth' : 'ai_vision';
  const btn = document.getElementById('btn-toggle-vision');
  if (btn) {
    btn.textContent = analyzeVisionMode === 'ai_vision' ? 'TOGGLE: AI PERSPECTIVE' : 'TOGGLE: GROUND TRUTH';
  }
  if (analyzeSession) {
    renderAnalyzeHeatmap(analyzeSession.currentTurn);
  }
}

function closeAnalyzeMode() {
  showScreen('scr-debrief');
}

function renderAnalyzeHeatmap(turnNumber) {
  const canvas = document.getElementById('analyze-canvas');
  if (!canvas || !analyzeSession) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const snap = RouteEngine.getTurnSnapshot(analyzeSession, turnNumber) || analyzeSession.turns[0];
  if (!snap) return;

  const lbl = document.getElementById('analyze-turn-lbl');
  if (lbl) lbl.textContent = 'TURN ' + snap.turn + ' OF ' + analyzeSession.totalTurns;

  const reasonBox = document.getElementById('analyze-reason-box');
  if (reasonBox) {
    reasonBox.textContent = RouteEngine.explainAIAction(snap.aiAction, snap.evidence);
  }

  ctx.fillStyle = '#060e1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellSz = 26;
  const offset = 12;

  // Draw Heatmap Probability Grid
  if (snap.aiProbGrid && snap.aiProbGrid.length > 0) {
    for (let i = 0; i < snap.aiProbGrid.length; i++) {
      const tile = snap.aiProbGrid[i];
      const color = RouteEngine.getHeatmapColor(tile.prob);
      ctx.fillStyle = color;
      ctx.fillRect(offset + tile.x * cellSz, offset + tile.y * cellSz, cellSz - 1, cellSz - 1);
    }
  }

  // Draw Grid Lines
  ctx.strokeStyle = 'rgba(26, 58, 90, 0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 20; i++) {
    ctx.beginPath();
    ctx.moveTo(offset + i * cellSz, offset);
    ctx.lineTo(offset + i * cellSz, offset + 20 * cellSz);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, offset + i * cellSz);
    ctx.lineTo(offset + 20 * cellSz, offset + i * cellSz);
    ctx.stroke();
  }

  // Draw ships: Ground truth vs AI perception
  if (analyzeVisionMode === 'ground_truth') {
    if (snap.pFleet) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
      for (let i = 0; i < snap.pFleet.length; i++) {
        const s = snap.pFleet[i];
        if (s.alive) {
          ctx.fillRect(offset + s.x * cellSz + 3, offset + s.y * cellSz + 3, cellSz - 6, (s.len || 2) * cellSz - 6);
        }
      }
    }
    if (snap.eFleet) {
      ctx.fillStyle = 'rgba(255, 23, 68, 0.8)';
      for (let i = 0; i < snap.eFleet.length; i++) {
        const s = snap.eFleet[i];
        if (s.alive) {
          ctx.fillRect(offset + s.x * cellSz + 3, offset + s.y * cellSz + 3, cellSz - 6, (s.len || 2) * cellSz - 6);
        }
      }
    }
  } else {
    if (snap.evidence && snap.evidence.confirmed) {
      ctx.fillStyle = '#ff1744';
      for (let i = 0; i < snap.evidence.confirmed.length; i++) {
        const c = snap.evidence.confirmed[i];
        ctx.fillRect(offset + c.x * cellSz + 5, offset + c.y * cellSz + 5, cellSz - 10, cellSz - 10);
      }
    }
    if (snap.evidence && snap.evidence.decoys) {
      ctx.fillStyle = '#ba68c8';
      for (let i = 0; i < snap.evidence.decoys.length; i++) {
        const d = snap.evidence.decoys[i];
        ctx.beginPath();
        ctx.arc(offset + d.x * cellSz + cellSz / 2, offset + d.y * cellSz + cellSz / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Crosshair on AI targeted cell
  if (snap.aiAction) {
    const ax = offset + snap.aiAction.x * cellSz + cellSz / 2;
    const ay = offset + snap.aiAction.y * cellSz + cellSz / 2;
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - 14, ay);
    ctx.lineTo(ax + 14, ay);
    ctx.moveTo(ax, ay - 14);
    ctx.lineTo(ax, ay + 14);
    ctx.stroke();
  }
}

/* ════════════════════════════════════════════════════════════════
   §0E  TACTICAL MULTIPLAYER ARENA (24×24 HOTSEAT)
════════════════════════════════════════════════════════════════ */
let mpMatch = null;
let currentMPPerspective = 0;

function openMultiplayerArena() {
  mpMatch = MP.createMPMatch({
    seed: Math.floor(Math.random() * 99998) + 1,
    mode: 'ffa'
  });

  for (let i = 0; i < 4; i++) {
    const qKey = Object.keys(MP.QUADRANTS)[i];
    const fleet = MP.quickDeployMP(qKey, mpMatch.rng);
    MP.submitDeployment(mpMatch, i, fleet);
  }

  setMPPerspective(0);
  renderMPBoard();
  showScreen('scr-mp');
}

function setMPPerspective(pIdx) {
  currentMPPerspective = pIdx;
  for (let i = 0; i < 4; i++) {
    const tab = document.getElementById('mp-tab-' + i);
    if (tab) {
      tab.style.borderColor = i === pIdx ? '#00e5ff' : '#2a4a6a';
      tab.style.background = i === pIdx ? 'rgba(0,229,255,0.2)' : 'transparent';
    }
  }
  const qNames = ['NW (P1)', 'NE (P2)', 'SW (P3)', 'SE (P4)'];
  const statusEl = document.getElementById('mp-player-status');
  if (statusEl) statusEl.textContent = 'PERSPECTIVE: ' + qNames[pIdx] + ' FLEET';
  renderMPBoard();
}

function renderMPBoard() {
  const canvas = document.getElementById('mp-board');
  if (!canvas || !mpMatch) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cellSz = 21;
  const offset = 18;

  ctx.fillStyle = '#040d18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Quadrant dividers
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(offset + 12 * cellSz, offset);
  ctx.lineTo(offset + 12 * cellSz, offset + 24 * cellSz);
  ctx.moveTo(offset, offset + 12 * cellSz);
  ctx.lineTo(offset + 24 * cellSz, offset + 12 * cellSz);
  ctx.stroke();

  // Storm collapse warning rings (round >= 20)
  if (mpMatch.stormUnsafeRings > 0) {
    ctx.fillStyle = 'rgba(255, 23, 68, 0.2)';
    const r = mpMatch.stormUnsafeRings;
    ctx.fillRect(offset, offset, 24 * cellSz, r * cellSz);
    ctx.fillRect(offset, offset + (24 - r) * cellSz, 24 * cellSz, r * cellSz);
    ctx.fillRect(offset, offset, r * cellSz, 24 * cellSz);
    ctx.fillRect(offset + (24 - r) * cellSz, offset, r * cellSz, 24 * cellSz);
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(25, 45, 70, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 24; i++) {
    ctx.beginPath();
    ctx.moveTo(offset + i * cellSz, offset);
    ctx.lineTo(offset + i * cellSz, offset + 24 * cellSz);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, offset + i * cellSz);
    ctx.lineTo(offset + 24 * cellSz, offset + i * cellSz);
    ctx.stroke();
  }

  const filtered = MP.getFilteredState(mpMatch, currentMPPerspective);

  // Friendly ships for active perspective
  if (filtered && filtered.friendlyFleet) {
    ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
    for (let s = 0; s < filtered.friendlyFleet.length; s++) {
      const ship = filtered.friendlyFleet[s];
      if (ship.alive && ship.cells) {
        for (let c = 0; c < ship.cells.length; c++) {
          const pt = ship.cells[c];
          ctx.fillRect(offset + pt.x * cellSz + 2, offset + pt.y * cellSz + 2, cellSz - 4, cellSz - 4);
        }
      }
    }
  }

  // Hits and confirmed intel
  if (filtered && filtered.publicIntel) {
    for (let k = 0; k < filtered.publicIntel.length; k++) {
      const item = filtered.publicIntel[k];
      if (item.type === 'hit') {
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(offset + item.x * cellSz + 4, offset + item.y * cellSz + 4, cellSz - 8, cellSz - 8);
      }
    }
  }
}

function execMPAction(actionType) {
  if (!mpMatch) return;
  const pIdx = mpMatch.turn;
  const feed = document.getElementById('mp-intel-feed');

  if (actionType === 'pass') {
    MP.advanceMPTurn(mpMatch);
    if (feed) feed.innerHTML += '<div>[R' + mpMatch.round + '] P' + (pIdx + 1) + ' passed turn. Active: P' + (mpMatch.turn + 1) + '</div>';
  } else {
    const res = MP.submitAction(mpMatch, pIdx, 'flagship', actionType, { x: 12, y: 12 });
    if (feed) feed.innerHTML += '<div>[R' + mpMatch.round + '] P' + (pIdx + 1) + ' ordered ' + actionType.toUpperCase() + ': ' + (res.msg || (res.success ? 'Confirmed' : 'Failed')) + '</div>';
  }

  const roundLbl = document.getElementById('mp-round-lbl');
  if (roundLbl) roundLbl.textContent = 'ROUND ' + mpMatch.round + ' · TURN P' + (mpMatch.turn + 1);
  renderMPBoard();
}

function closeMPArena() {
  showScreen('scr-title');
}
`;

// Splice inlined block right after 'use strict';
const scriptAnchor = "<script>\n'use strict';";
if (!html.includes(scriptAnchor)) {
  throw new Error("Could not find script anchor in blackwater-command.html");
}

html = html.replace(scriptAnchor, scriptAnchor + '\n' + inlinedEnginesBlock);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Successfully inlined RouteEngine, MPEngine, and integration handlers into blackwater-command.html');
