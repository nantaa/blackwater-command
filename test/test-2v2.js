// test/test-2v2.js - Unit and Integration Tests for 2v2 Team Mode
const MP = require('../src/mp-engine.js');

console.log('====================================================');
console.log(' Blackwater Command — 2v2 Team Mechanics Test Suite');
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

// 1. Team pairing layout
runTest('Symmetrical 2v2 team pairing (T1: NW P1 + SW P3, T2: NE P2 + SE P4)', () => {
  const match = MP.createMPMatch(1234, '2v2', [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' },
    { id: 'p3', name: 'Player 3' },
    { id: 'p4', name: 'Player 4' }
  ]);

  assert(match.players[0].team === 'T1' && match.players[0].quadrant === 'NW', 'P1 must be T1 NW');
  assert(match.players[1].team === 'T2' && match.players[1].quadrant === 'NE', 'P2 must be T2 NE');
  assert(match.players[2].team === 'T1' && match.players[2].quadrant === 'SW', 'P3 must be T1 SW');
  assert(match.players[3].team === 'T2' && match.players[3].quadrant === 'SE', 'P4 must be T2 SE');
});

// 2. Shared intelligence propagation
runTest('Shared intelligence propagates immediately between teammates', () => {
  const match = MP.createMPMatch(1234, '2v2');
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, match.rng));
  });

  // P1 performs a 3x3 acoustic scan in NE quadrant
  MP.addSharedIntel(match, 'T1', { type: 'scan', x: 14, y: 4, radius: 1 });

  // Check filtered state for teammate P3 (also T1)
  const p3Filter = MP.getFilteredState(match, 'p3');
  assert(p3Filter.sharedIntel && p3Filter.sharedIntel.length === 1, 'P3 must receive P1 shared intel');
  assert(p3Filter.sharedIntel[0].x === 14 && p3Filter.sharedIntel[0].y === 4, 'Coordinates must match shared scan');

  // Check opponent P2 (T2) - must NOT receive T1's scan!
  const p2Filter = MP.getFilteredState(match, 'p2');
  assert(p2Filter.sharedIntel.length === 0, 'Opponent P2 must NOT receive T1 shared intel');
});

// 3. Dual-confirmation surrender protocol
runTest('Single teammate surrender triggers SURRENDER_PENDING without elimination', () => {
  const match = MP.createMPMatch(1234, '2v2');
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, match.rng));
  });

  const res1 = MP.submitSurrender(match, 'p1');
  assert(res1.status === 'SURRENDER_PENDING', 'First surrender must be pending');
  assert(match.players[0].alive === true, 'P1 must remain alive while pending');
  assert(match.players[0].eliminated === false, 'P1 must not be eliminated yet');
});

runTest('Second teammate surrender triggers TEAM_SURRENDERED and awards victory to opposing team', () => {
  const match = MP.createMPMatch(1234, '2v2');
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, match.rng));
  });

  MP.submitSurrender(match, 'p1');
  const res2 = MP.submitSurrender(match, 'p3');

  assert(res2.status === 'TEAM_SURRENDERED', 'Both surrenders must trigger TEAM_SURRENDERED');
  assert(match.players[0].eliminated === true && match.players[2].eliminated === true, 'Both T1 players eliminated');
  assert(match.phase === 'FINISHED', 'Match must finish');
  assert(match.winner === 'T2', 'T2 must be declared winner');
});

// 4. Team victory by sinking both opposing fleets (all ships sunk)
runTest('Sinking both opposing fleets declares victory for surviving team', () => {
  const match = MP.createMPMatch(1234, '2v2');
  match.players.forEach(p => {
    MP.submitDeployment(match, p.id, MP.quickDeployMP(match.grid, p.quadrant, match.rng));
  });

  // Sink P2 entire fleet (T2)
  ['flagship', 'patrol', 'minelayer'].forEach(s => {
    match.players[1].fleet[s].hp = 0;
    match.players[1].fleet[s].alive = false;
  });
  MP.checkEliminationsAndVictory(match);
  assert(match.players[1].eliminated === true, 'P2 must be eliminated');
  assert(match.phase === 'BATTLE', 'Match continues while P4 is still alive');

  // Sink P4 entire fleet (T2)
  ['flagship', 'patrol', 'minelayer'].forEach(s => {
    match.players[3].fleet[s].hp = 0;
    match.players[3].fleet[s].alive = false;
  });
  MP.checkEliminationsAndVictory(match);

  assert(match.players[3].eliminated === true, 'P4 must be eliminated');
  assert(match.phase === 'FINISHED', 'Match terminates when both team fleets sink');
  assert(match.winner === 'T1', 'T1 is the winning team');
});

console.log('\n====================================================');
console.log(` Tests Completed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('====================================================');

if (passed < total) {
  process.exit(1);
} else {
  console.log(' ALL 2v2 TEAM MECHANICS TESTS PASSED (GREEN)!\n');
  process.exit(0);
}
