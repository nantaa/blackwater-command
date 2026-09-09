// test/test-1v1-matchmaking.js - TDD tests for 1v1 Quick Match queue & Private Room codes
const WebSocket = require('ws');
const { startServer } = require('../server/mp-server.js');

console.log('====================================================');
console.log(' Blackwater Command — 1v1 Matchmaking Tests');
console.log('====================================================\n');

async function run1v1MatchmakingTests() {
  const PORT = 8096; // Dedicated test port
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
    report('WebSocket server bound to port ' + PORT, true);
  } catch (err) {
    report('WebSocket server bound to port ' + PORT, false, err);
    process.exit(1);
  }

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
    // ----------------------------------------------------
    // TEST 1: Quick Match Single Player Queues
    // ----------------------------------------------------
    const c1 = await connectClient();
    const qRes = await sendAndAwait(c1, { type: 'QUEUE_1V1', playerName: 'Captain Archer' }, 'QUEUED_1V1');
    assert(qRes.position === 1, 'First queued player receives position 1');
    report('Quick Match single player enters queue with QUEUED_1V1', true);

    // ----------------------------------------------------
    // TEST 2: Quick Match Pairing (2nd player triggers match)
    // ----------------------------------------------------
    const c2 = await connectClient();
    const matchPromise1 = new Promise((resolve) => {
      c1.on('message', function h(d) {
        const p = JSON.parse(d);
        if (p.type === 'MATCH_FOUND') { c1.removeListener('message', h); resolve(p); }
      });
    });

    c2.send(JSON.stringify({ type: 'QUEUE_1V1', playerName: 'Commander Spock' }));
    const matchRes2 = await new Promise((resolve) => {
      c2.on('message', function h(d) {
        const p = JSON.parse(d);
        if (p.type === 'MATCH_FOUND') { c2.removeListener('message', h); resolve(p); }
      });
    });
    const matchRes1 = await matchPromise1;

    assert(matchRes1.roomCode === matchRes2.roomCode, 'Both players receive identical roomCode');
    assert(matchRes1.mode === '1v1_duel' && matchRes2.mode === '1v1_duel', 'Mode must be 1v1_duel');
    assert((matchRes1.playerId === 'p1' && matchRes2.playerId === 'p2') || (matchRes1.playerId === 'p2' && matchRes2.playerId === 'p1'), 'One player is p1, the other is p2');
    report('Quick Match pairs 2 waiting players with MATCH_FOUND and 1v1_duel mode', true);

    c1.close();
    c2.close();

    // ----------------------------------------------------
    // TEST 3: Cancel Queue
    // ----------------------------------------------------
    const c3 = await connectClient();
    await sendAndAwait(c3, { type: 'QUEUE_1V1', playerName: 'Ensign Ro' }, 'QUEUED_1V1');
    const cancelRes = await sendAndAwait(c3, { type: 'CANCEL_QUEUE' }, 'QUEUE_CANCELLED');
    assert(cancelRes.status === 'OK', 'Cancel queue returns OK');

    // Verify c4 queuing now does NOT pair with c3
    const c4 = await connectClient();
    const q4Res = await sendAndAwait(c4, { type: 'QUEUE_1V1', playerName: 'Lt. Paris' }, 'QUEUED_1V1');
    assert(q4Res.position === 1, 'Player is at position 1 because previous player cancelled');
    report('CANCEL_QUEUE successfully removes player from matchmaking queue', true);

    c3.close();
    c4.close();

    // ----------------------------------------------------
    // TEST 4: Socket Disconnect Eviction from Queue
    // ----------------------------------------------------
    const c5 = await connectClient();
    await sendAndAwait(c5, { type: 'QUEUE_1V1', playerName: 'Doctor Crusher' }, 'QUEUED_1V1');
    c5.close(); // Disconnect abruptly

    // Wait 100ms for close event propagation
    await new Promise(r => setTimeout(r, 100));

    const c6 = await connectClient();
    const q6Res = await sendAndAwait(c6, { type: 'QUEUE_1V1', playerName: 'Geordi' }, 'QUEUED_1V1');
    assert(q6Res.position === 1, 'Disconnected player was evicted; new player gets position 1');
    report('Abrupt client disconnect automatically evicts player from queue', true);
    c6.close();

    // ----------------------------------------------------
    // TEST 5: Private Room Code 1v1 Creation & Joining
    // ----------------------------------------------------
    const c7 = await connectClient();
    const privCreate = await sendAndAwait(c7, { type: 'CREATE_1V1_ROOM', playerName: 'Captain Picard' }, 'ROOM_CREATED');
    assert(privCreate.roomCode && privCreate.roomCode.length === 4, '1v1 Room code must be 4 characters');
    assert(privCreate.mode === '1v1_duel', 'Mode must be 1v1_duel');
    assert(privCreate.playerId === 'p1', 'Host is assigned p1');

    const c8 = await connectClient();
    const privJoinPromise = new Promise(resolve => {
      c7.on('message', function h(d) {
        const p = JSON.parse(d);
        if (p.type === 'MATCH_READY') { c7.removeListener('message', h); resolve(p); }
      });
    });

    const joinRes = await sendAndAwait(c8, { type: 'JOIN_1V1_ROOM', roomCode: privCreate.roomCode, playerName: 'Q' }, 'ROOM_JOINED');
    assert(joinRes.roomCode === privCreate.roomCode);
    assert(joinRes.playerId === 'p2', 'Guest is assigned p2');

    const matchReadyRes = await privJoinPromise;
    assert(matchReadyRes.type === 'MATCH_READY');
    assert(matchReadyRes.grid && matchReadyRes.grid.length === 10, 'Match ready returns 20x10 grid');
    report('Private 1v1 room code creation and guest joining starts match with MATCH_READY', true);

    c7.close();
    c8.close();

  } catch (err) {
    report('1v1 Matchmaking workflow', false, err);
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
    console.log(' ALL 1V1 MATCHMAKING TESTS PASSED (GREEN)!\n');
    process.exit(0);
  }
}

run1v1MatchmakingTests();
