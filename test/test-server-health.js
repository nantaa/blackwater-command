// test/test-server-health.js - Verifies HTTP health probes and WebSocket co-existence
const http = require('http');
const WebSocket = require('ws');
const { startServer } = require('../server/mp-server.js');

console.log('====================================================');
console.log(' Blackwater Command — Server Cloud Health Probe Tests');
console.log('====================================================\n');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

let passed = 0;
let total = 0;

function runTest(desc, fn) {
  total++;
  return fn()
    .then(() => {
      passed++;
      console.log(`  [PASS] ${desc}`);
    })
    .catch((err) => {
      console.log(`  [FAIL] ${desc} -> ${err.message}`);
    });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

async function runAll() {
  const TEST_PORT = 8098;
  const server = await startServer(TEST_PORT);
  console.log(`  [PASS] Server bound to port ${TEST_PORT}`);

  try {
    // 1. GET / returns 200 with service description
    await runTest('GET / responds with 200 OK and service banner', async () => {
      const res = await httpGet(`http://localhost:${TEST_PORT}/`);
      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.body.includes('Blackwater Command Authoritative WebSocket Server'), 'Body must contain server banner');
    });

    // 2. GET /health returns 200 and JSON telemetry
    await runTest('GET /health responds with 200 OK and valid JSON health telemetry', async () => {
      const res = await httpGet(`http://localhost:${TEST_PORT}/health`);
      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      const data = JSON.parse(res.body);
      assert(data.status === 'ok', 'Status must be ok');
      assert(data.service === 'blackwater-mp', 'Service name must match');
      assert(typeof data.activeRooms === 'number', 'Must report activeRooms');
      assert(typeof data.queueLength === 'number', 'Must report queueLength');
      assert(typeof data.uptimeSec === 'number', 'Must report uptime');
    });

    // 3. WebSocket client connects on the exact same port without conflict
    await runTest('WebSocket client connects and exchanges message on same HTTP port', async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Send a queue request
      ws.send(JSON.stringify({ type: 'QUEUE_1V1', playerName: 'HealthProbeTester' }));

      const resp = await new Promise((resolve, reject) => {
        ws.on('message', (raw) => resolve(JSON.parse(raw.toString())));
        setTimeout(() => reject(new Error('Timeout waiting for WS response')), 2000);
      });

      assert(resp.type === 'QUEUED_1V1', `Expected QUEUED_1V1, got ${resp.type}`);
      ws.close();
    });

  } finally {
    if (server) {
      server.close();
      if (server.wss) server.wss.close();
    }
  }

  console.log('\n====================================================');
  console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
  console.log('====================================================');

  if (passed < total) {
    process.exit(1);
  } else {
    console.log(' ALL HEALTH PROBE TESTS PASSED (GREEN)!\n');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
