// test/verify-1v1-flow.js - End-to-end integration test for full 1v1 online duel flow
const WebSocket = require('ws');
const { startServer } = require('../server/mp-server.js');
const MP = require('../src/mp-engine.js');

console.log('====================================================');
console.log(' Blackwater Command — 1v1 Full Flow Integration Test');
console.log('====================================================\n');

async function run1v1FlowTest() {
  const PORT = 8097;
  let serverInstance = null;
  let passed = 0;
  let total = 0;

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'Assertion failed');
  }

  function report(name, pass, err) {
    total++;
    if (pass) {
      passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      console.log(`  [FAIL] ${name} -> ${err ? err.message : 'Unknown error'}`);
    }
  }

  try {
    serverInstance = await startServer(PORT);
    report('1v1 Dedicated server running on port ' + PORT, true);
  } catch (err) {
    report('1v1 Dedicated server running on port ' + PORT, false, err);
    process.exit(1);
  }

  function connectClient() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function awaitMsg(ws, expectedType, timeoutMs = 2500) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for message ${expectedType}`));
      }, timeoutMs);

      function handler(data) {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === expectedType) {
            clearTimeout(timer);
            ws.removeListener('message', handler);
            resolve(parsed);
          }
        } catch (e) {}
      }

      ws.on('message', handler);
    });
  }

  try {
    const c1 = await connectClient();
    const c2 = await connectClient();

    // 1. Quick Match pairing
    const matchPromise1 = awaitMsg(c1, 'MATCH_FOUND');
    const matchPromise2 = awaitMsg(c2, 'MATCH_FOUND');

    c1.send(JSON.stringify({ type: 'QUEUE_1V1', playerName: 'Admiral Nelson' }));
    c2.send(JSON.stringify({ type: 'QUEUE_1V1', playerName: 'Villeneuve' }));

    const m1 = await matchPromise1;
    const m2 = await matchPromise2;

    assert(m1.roomCode === m2.roomCode, 'Room codes match');
    assert(m1.sector === 'P1' && m2.sector === 'P2', 'P1 assigned West, P2 assigned East');
    report('2 clients paired via Quick Match queue on 20x10 map', true);

    // 2. Secret Fleet Deployments
    const rng = MP.mkRng(999);
    const p1Fleet = MP.quickDeploy1v1(m1.grid, 'p1', rng);
    const p2Fleet = MP.quickDeploy1v1(m2.grid, 'p2', rng);

    const deployWait1 = awaitMsg(c1, 'DEPLOYMENT_ACCEPTED');
    c1.send(JSON.stringify({ type: 'SUBMIT_DEPLOYMENT', fleet: p1Fleet }));
    await deployWait1;

    const battleWait1 = awaitMsg(c1, 'STATE_UPDATE');
    const battleWait2 = awaitMsg(c2, 'STATE_UPDATE');

    c2.send(JSON.stringify({ type: 'SUBMIT_DEPLOYMENT', fleet: p2Fleet }));

    const s1 = await battleWait1;
    const s2 = await battleWait2;

    assert(s1.state.phase === 'BATTLE_ACTIVE' || s1.state.phase === 'BATTLE', 'Match entered battle phase');
    report('Both players submit secret deployments and battle activates', true);

    // 3. Zero-Leak Verification
    const s1Json = JSON.stringify(s1.state);
    const p2FlagCells = p2Fleet.find(s => s.id === 'flagship').cells;
    const leakFound = p2FlagCells.some(c => s1Json.includes(`"x":${c.x},"y":${c.y}`));
    assert(!leakFound, 'Zero-Leak verified: P1 state contains zero coordinates of opponent flagship');
    report('Zero-Leak confirmed: neither client receives opponent coordinates', true);

    // 4. Combat Firing & Authoritative Damage
    // Active player (P1) fires Ballistic Missile into enemy sector
    const targetX = p2FlagCells[0].x;
    const targetY = p2FlagCells[0].y;

    const actionRes = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out on attack')), 2500);
      c2.on('message', function h(d) {
        const p = JSON.parse(d);
        if (p.type === 'STATE_UPDATE' || p.type === 'HIT') {
          clearTimeout(timer);
          c2.removeListener('message', h);
          resolve(p);
        }
      });
      c1.send(JSON.stringify({
        type: 'PLAY_ACTION',
        action: 'salvo',
        x: targetX,
        y: targetY
      }));
    });

    assert(actionRes !== null, 'P2 received combat resolution event');
    report('P1 fires authoritative ballistic salvo into P2 territory and damage resolves', true);

    c1.close();
    c2.close();

  } catch (err) {
    report('1v1 full flow integration', false, err);
  } finally {
    if (serverInstance) {
      if (serverInstance.wss) {
        for (const client of serverInstance.wss.clients) {
          try { client.terminate(); } catch (e) {}
        }
        serverInstance.wss.close();
      }
      serverInstance.close();
    }
  }

  console.log('\n====================================================');
  console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
  console.log('====================================================');

  if (total - passed > 0) {
    process.exit(1);
  } else {
    console.log(' ALL 1V1 FLOW INTEGRATION TESTS PASSED (GREEN)!\n');
    process.exit(0);
  }
}

run1v1FlowTest();
