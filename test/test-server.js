// test/test-server.js - Automated Multi-Client Integration Test for Authoritative WebSocket Server
const WebSocket = require('ws');
const { startServer } = require('../server/mp-server.js');

console.log('====================================================');
console.log(' Blackwater Command — Authoritative Server Tests');
console.log('====================================================\n');

async function runServerTests() {
  const PORT = 8095; // Use dedicated test port
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
    report('Server starts and binds to WebSocket port', true);
  } catch (err) {
    report('Server starts and binds to WebSocket port', false, err);
    process.exit(1);
  }

  const clients = [];
  function connectClient() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function sendAndAwait(ws, msg, expectedType, timeoutMs = 2000) {
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
      ws.send(JSON.stringify(msg));
    });
  }

  try {
    // 1. Connect 4 clients
    const c1 = await connectClient();
    const c2 = await connectClient();
    const c3 = await connectClient();
    const c4 = await connectClient();
    clients.push(c1, c2, c3, c4);
    report('4 simulated clients connected simultaneously', true);

    // 2. Client 1 creates room
    const createRes = await sendAndAwait(c1, { type: 'CREATE_ROOM', mode: '1v1v1v1', playerName: 'Admiral Alpha' }, 'ROOM_CREATED');
    const roomCode = createRes.roomCode;
    assert(roomCode && roomCode.length === 4, 'Room code must be 4 characters');
    assert(createRes.slot === 0 && createRes.playerId === 'p1', 'Host must be assigned slot 0 / p1');
    report('Host creates room and receives 4-letter join code', true);

    // 3. Clients 2, 3, 4 join room
    const j2 = await sendAndAwait(c2, { type: 'JOIN_ROOM', roomCode, playerName: 'Bravo' }, 'ROOM_JOINED');
    const j3 = await sendAndAwait(c3, { type: 'JOIN_ROOM', roomCode, playerName: 'Charlie' }, 'ROOM_JOINED');
    const j4 = await sendAndAwait(c4, { type: 'JOIN_ROOM', roomCode, playerName: 'Delta' }, 'ROOM_JOINED');

    assert(j2.slot === 1 && j2.playerId === 'p2', 'Client 2 must be p2');
    assert(j3.slot === 2 && j3.playerId === 'p3', 'Client 3 must be p3');
    assert(j4.slot === 3 && j4.playerId === 'p4', 'Client 4 must be p4');
    report('Guests join room and fill all 4 quadrant slots', true);

    // Submit deployments and wait for BATTLE transition
    const p1StatePromise = new Promise(resolve => {
      c1.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'STATE_UPDATE' && msg.state && msg.state.phase === 'BATTLE') resolve(msg.state);
      });
    });

    c1.send(JSON.stringify({ type: 'SUBMIT_DEPLOYMENT', quickDeploy: true }));
    c2.send(JSON.stringify({ type: 'SUBMIT_DEPLOYMENT', quickDeploy: true }));
    c3.send(JSON.stringify({ type: 'SUBMIT_DEPLOYMENT', quickDeploy: true }));
    c4.send(JSON.stringify({ type: 'SUBMIT_DEPLOYMENT', quickDeploy: true }));

    const p1State = await p1StatePromise;
    report('Secret deployment confirmed by all 4 clients and match begins', true);

    // 5. Zero-Leak Verification on Server Payloads
    assert(p1State.self && p1State.self.fleet && p1State.self.fleet.flagship.cells, 'P1 must see own ship coordinates');
    assert(p1State.opponents && p1State.opponents.length === 3, 'Must receive 3 opponent statuses');
    
    // Crucial check: Opponents array must NEVER contain coordinates, cells, hand, or ammo
    let leakedCoords = false;
    p1State.opponents.forEach(opp => {
      if (opp.fleet || opp.cells || opp.x !== undefined || opp.y !== undefined || opp.hand || opp.ammo) {
        leakedCoords = true;
      }
    });
    assert(!leakedCoords, 'Opponents state must NOT leak ship coordinates or hidden hands over network');
    report('Server payload zero-leak verification: 0 opponent coordinates leaked to client', true);

    // 6. Active player action
    const activePlayerId = p1State.activePlayerId;
    const activeClient = activePlayerId === 'p1' ? c1 : activePlayerId === 'p2' ? c2 : activePlayerId === 'p3' ? c3 : c4;

    const actionRes = await sendAndAwait(activeClient, {
      type: 'PLAY_ACTION',
      action: 'strike',
      x: 15,
      y: 5
    }, 'ACTION_RESOLVED');

    assert(actionRes.success === true, 'Action must execute cleanly');
    report('Active player executes authoritative action with server-side validation', true);

    // 7. Surrender protocol
    const surrRes = await sendAndAwait(c4, { type: 'SURRENDER' }, 'SURRENDER_RESOLVED');
    assert(surrRes.eliminated === true, 'Surrendered player in FFA must be eliminated');
    report('Flagship surrender eliminates fleet cleanly', true);

  } catch (err) {
    report('Server integration scenario', false, err);
  } finally {
    clients.forEach(c => c.close());
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
  }

  console.log('\n====================================================');
  console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
  console.log('====================================================');

  if (passed < total) {
    process.exit(1);
  } else {
    console.log(' ALL WEBSOCKET SERVER TESTS PASSED (GREEN)!\n');
    process.exit(0);
  }
}

runServerTests();
