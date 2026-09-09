// server/mp-server.js - Authoritative WebSocket Server for Blackwater Command
const WebSocket = require('ws');
const http = require('http');
const MP = require('../src/mp-engine.js');

const rooms = new Map(); // roomCode -> Room
const quickMatch1v1Queue = []; // [{ ws, playerName }]

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

class Room {
  constructor(code, mode, hostName) {
    this.code = code;
    this.mode = mode || '1v1v1v1';
    this.clients = []; // { ws, playerId, playerName, slot, disconnectedAt }
    this.match = null;
    this.turnTimer = null;
    this.timerRemaining = 30;
    this.createdTime = Date.now();
  }

  addClient(ws, playerName) {
    const max = this.mode === '1v1_duel' ? 2 : 4;
    if (this.clients.length >= max) return null;
    const slot = this.clients.length;
    const playerId = `p${slot + 1}`;
    const client = {
      ws,
      playerId,
      playerName: playerName || `Player ${slot + 1}`,
      slot,
      disconnectedAt: null
    };
    this.clients.push(client);
    return client;
  }

  getClientByWs(ws) {
    return this.clients.find(c => c.ws === ws);
  }

  getClientByPlayerId(pid) {
    return this.clients.find(c => c.playerId === pid);
  }

  initMatch() {
    if (this.mode === '1v1_duel') {
      const p1 = this.clients[0];
      const p2 = this.clients[1];
      this.match = MP.create1v1Match(
        Date.now(),
        { id: p1.playerId, name: p1.playerName },
        { id: p2.playerId, name: p2.playerName }
      );
      return;
    }

    const playerConfigs = this.clients.map((c, idx) => ({
      id: c.playerId,
      name: c.playerName,
      team: this.mode === '2v2' ? (idx % 2 === 0 ? 'T1' : 'T2') : `P${idx + 1}`
    }));

    this.match = MP.createMPMatch(Date.now(), this.mode, playerConfigs);
  }

  startTurnTimer() {
    if (this.turnTimer) clearInterval(this.turnTimer);
    this.timerRemaining = 30;

    this.turnTimer = setInterval(() => {
      if (!this.match || this.match.phase === 'FINISHED') {
        clearInterval(this.turnTimer);
        return;
      }

      this.timerRemaining--;
      if (this.timerRemaining <= 0) {
        // Authoritative Turn Timeout
        const activePid = this.match.activePlayerId;
        MP.handleTurnTimeoutOrSkip(this.match, activePid);
        this.timerRemaining = 30;
        this.broadcastState();
      }
    }, 1000);
  }

  stopTurnTimer() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  broadcastState() {
    if (!this.match) return;

    this.clients.forEach(c => {
      if (c.ws && c.ws.readyState === WebSocket.OPEN) {
        const filtered = this.mode === '1v1_duel'
          ? MP.getFiltered1v1State(this.match, c.playerId)
          : MP.getFilteredState(this.match, c.playerId);
        c.ws.send(JSON.stringify({
          type: 'STATE_UPDATE',
          timer: this.timerRemaining,
          state: filtered
        }));
      }
    });
  }

  broadcastMessage(msg) {
    const data = JSON.stringify(msg);
    this.clients.forEach(c => {
      if (c.ws && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(data);
      }
    });
  }
}

function handleClientMessage(ws, data) {
  let msg = null;
  try {
    msg = JSON.parse(data);
  } catch (err) {
    return;
  }

  switch (msg.type) {
    case 'QUEUE_1V1': {
      // Clean up any stale entries for this socket
      const idx = quickMatch1v1Queue.findIndex(q => q.ws === ws);
      if (idx >= 0) quickMatch1v1Queue.splice(idx, 1);

      if (quickMatch1v1Queue.length > 0) {
        // Pair with waiting player
        const opponent = quickMatch1v1Queue.shift();
        const code = generateRoomCode();
        const room = new Room(code, '1v1_duel', opponent.playerName);
        const c1 = room.addClient(opponent.ws, opponent.playerName);
        const c2 = room.addClient(ws, msg.playerName);
        rooms.set(code, room);

        opponent.ws.roomCode = code;
        ws.roomCode = code;

        room.initMatch();

        opponent.ws.send(JSON.stringify({
          type: 'MATCH_FOUND',
          roomCode: code,
          mode: '1v1_duel',
          seed: room.match.seed,
          playerId: c1.playerId,
          slot: c1.slot,
          sector: 'P1',
          grid: room.match.grid,
          opponent: { name: c2.playerName }
        }));

        ws.send(JSON.stringify({
          type: 'MATCH_FOUND',
          roomCode: code,
          mode: '1v1_duel',
          seed: room.match.seed,
          playerId: c2.playerId,
          slot: c2.slot,
          sector: 'P2',
          grid: room.match.grid,
          opponent: { name: c1.playerName }
        }));
      } else {
        quickMatch1v1Queue.push({ ws, playerName: msg.playerName || 'Commander' });
        ws.send(JSON.stringify({
          type: 'QUEUED_1V1',
          position: quickMatch1v1Queue.length
        }));
      }
      break;
    }

    case 'CANCEL_QUEUE': {
      const idx = quickMatch1v1Queue.findIndex(q => q.ws === ws);
      if (idx >= 0) quickMatch1v1Queue.splice(idx, 1);
      ws.send(JSON.stringify({ type: 'QUEUE_CANCELLED', status: 'OK' }));
      break;
    }

    case 'CREATE_1V1_ROOM': {
      const code = generateRoomCode();
      const room = new Room(code, '1v1_duel', msg.playerName);
      const client = room.addClient(ws, msg.playerName);
      rooms.set(code, room);

      ws.roomCode = code;
      ws.send(JSON.stringify({
        type: 'ROOM_CREATED',
        roomCode: code,
        mode: '1v1_duel',
        slot: client.slot,
        playerId: client.playerId
      }));
      break;
    }

    case 'JOIN_1V1_ROOM': {
      const code = (msg.roomCode || '').toUpperCase();
      const room = rooms.get(code);
      if (!room || room.mode !== '1v1_duel') {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
        return;
      }
      if (room.clients.length >= 2) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' }));
        return;
      }

      const client = room.addClient(ws, msg.playerName);
      ws.roomCode = code;

      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        roomCode: code,
        mode: room.mode,
        slot: client.slot,
        playerId: client.playerId
      }));

      if (room.clients.length === 2) {
        room.initMatch();
        const c1 = room.clients[0];
        const c2 = room.clients[1];

        c1.ws.send(JSON.stringify({
          type: 'MATCH_READY',
          roomCode: code,
          mode: '1v1_duel',
          seed: room.match.seed,
          playerId: c1.playerId,
          slot: c1.slot,
          sector: 'P1',
          grid: room.match.grid,
          opponent: { name: c2.playerName }
        }));

        c2.ws.send(JSON.stringify({
          type: 'MATCH_READY',
          roomCode: code,
          mode: '1v1_duel',
          seed: room.match.seed,
          playerId: c2.playerId,
          slot: c2.slot,
          sector: 'P2',
          grid: room.match.grid,
          opponent: { name: c1.playerName }
        }));
      }
      break;
    }

    case 'CREATE_ROOM': {
      const code = generateRoomCode();
      const room = new Room(code, msg.mode, msg.playerName);
      const client = room.addClient(ws, msg.playerName);
      rooms.set(code, room);

      ws.roomCode = code;
      ws.send(JSON.stringify({
        type: 'ROOM_CREATED',
        roomCode: code,
        mode: room.mode,
        slot: client.slot,
        playerId: client.playerId
      }));
      break;
    }

    case 'JOIN_ROOM': {
      const code = (msg.roomCode || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
        return;
      }
      if (room.clients.length >= 4) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' }));
        return;
      }

      const client = room.addClient(ws, msg.playerName);
      ws.roomCode = code;

      if (room.clients.length === 4) {
        room.initMatch();
        room.broadcastMessage({
          type: 'MATCH_READY',
          grid: room.match.grid
        });
      }

      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        roomCode: code,
        mode: room.mode,
        slot: client.slot,
        playerId: client.playerId
      }));

      room.broadcastMessage({
        type: 'PLAYER_JOINED',
        slot: client.slot,
        playerName: client.playerName,
        playerId: client.playerId,
        count: room.clients.length
      });
      break;
    }

    case 'SUBMIT_DEPLOYMENT': {
      const room = rooms.get(ws.roomCode);
      if (!room || !room.match) return;
      const client = room.getClientByWs(ws);
      if (!client) return;

      const player = room.match.players.find(p => p.id === client.playerId);
      if (!player) return;

      if (room.mode === '1v1_duel') {
        let fleet = msg.fleet;
        if (msg.quickDeploy || !fleet) {
          fleet = MP.quickDeploy1v1(room.match.grid, player.sector, room.match.rng);
        }
        const val = MP.validate1v1Placement(room.match.grid, player.sector, fleet);
        if (!val.valid) {
          ws.send(JSON.stringify({ type: 'ERROR', message: val.error }));
          return;
        }
        player.fleet = fleet;
        player.deployed = true;
        ws.send(JSON.stringify({ type: 'DEPLOYMENT_ACCEPTED', fleet }));

        if (room.match.players.every(p => p.deployed)) {
          room.match.phase = 'BATTLE_ACTIVE';
          room.startTurnTimer();
          room.broadcastState();
        }
        break;
      }

      let fleet = msg.fleet;
      if (msg.quickDeploy || !fleet) {
        fleet = MP.quickDeployMP(room.match.grid, player.quadrant, room.match.rng);
      }

      const result = MP.submitDeployment(room.match, client.playerId, fleet);
      if (!result.success) {
        ws.send(JSON.stringify({ type: 'ERROR', message: result.reason }));
        return;
      }

      ws.send(JSON.stringify({ type: 'DEPLOYMENT_ACCEPTED', fleet }));

      // If all 4 deployed, match entered BATTLE phase
      if (room.match.phase === 'BATTLE') {
        room.startTurnTimer();
        room.broadcastState();
      }
      break;
    }

    case 'PLAY_ACTION': {
      const room = rooms.get(ws.roomCode);
      if (!room || !room.match) return;
      const client = room.getClientByWs(ws);
      if (!client) return;

      if (room.mode === '1v1_duel') {
        if (room.match.activePlayerId !== client.playerId) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Not your turn' }));
          return;
        }
        const player = room.match.players.find(p => p.id === client.playerId);
        let cardId = msg.action === 'salvo' ? 'torpedo_line' : (msg.action || 'deck_gun');
        if (player && player.hand && !player.hand.includes(cardId)) {
          if (player.hand.includes('deck_gun')) {
            cardId = 'deck_gun';
          } else if (player.hand.includes('torpedo_line')) {
            cardId = 'torpedo_line';
          } else if (player.hand.length > 0) {
            cardId = player.hand[0];
          }
        }
        const actResult = MP.exec1v1Action(room.match, client.playerId, {
          type: 'PLAY_CARD',
          cardId,
          target: { x: msg.x, y: msg.y, orient: msg.orient || 'H' }
        });
        if (!actResult.success) {
          ws.send(JSON.stringify({ type: 'ERROR', message: actResult.error }));
          return;
        }
        // Advance turn between p1 and p2
        const nextPid = client.playerId === 'p1' ? 'p2' : 'p1';
        room.match.activePlayerId = nextPid;
        room.timerRemaining = 30;

        ws.send(JSON.stringify({
          type: 'ACTION_RESOLVED',
          success: true,
          result: actResult
        }));

        room.broadcastState();
        break;
      }

      if (room.match.activePlayerId !== client.playerId) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Not your turn' }));
        return;
      }

      const player = room.match.players.find(p => p.id === client.playerId);
      const cost = msg.action === 'salvo' ? 2 : 1;
      if (player.cp < cost) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Insufficient CP' }));
        return;
      }

      // Deduct CP
      player.cp -= cost;
      const damage = msg.action === 'salvo' ? 4 : 3;

      // Authoritative damage resolution
      const attackRes = MP.resolveAttack(room.match, client.playerId, msg.x, msg.y, damage);
      
      // Advance turn
      MP.endMPTurn(room.match, client.playerId);
      room.timerRemaining = 30;

      ws.send(JSON.stringify({
        type: 'ACTION_RESOLVED',
        success: true,
        result: attackRes
      }));

      room.broadcastState();
      break;
    }

    case 'SURRENDER': {
      const room = rooms.get(ws.roomCode);
      if (!room || !room.match) return;
      const client = room.getClientByWs(ws);
      if (!client) return;

      const result = MP.submitSurrender(room.match, client.playerId);
      
      if (room.match.activePlayerId === client.playerId) {
        MP.endMPTurn(room.match, client.playerId);
        room.timerRemaining = 30;
      }

      const isEliminated = result.status === 'SURRENDERED' || result.status === 'TEAM_SURRENDERED';
      const isPending = result.status === 'SURRENDER_PENDING';

      ws.send(JSON.stringify({
        type: 'SURRENDER_RESOLVED',
        eliminated: isEliminated,
        pending: isPending,
        status: result.status
      }));

      room.broadcastState();
      break;
    }

    case 'LEAVE_ROOM':
    case 'ABANDON_ROOM': {
      if (!ws.roomCode) return;
      const room = rooms.get(ws.roomCode);
      if (!room) return;

      const cIdx = room.clients.findIndex(c => c.ws === ws);
      if (cIdx >= 0) {
        room.clients.splice(cIdx, 1);
      }
      ws.roomCode = null;
      ws.send(JSON.stringify({ type: 'ROOM_LEFT', status: 'OK' }));

      const activeClients = room.clients.filter(c => c.ws && c.ws.readyState === WebSocket.OPEN);
      if (activeClients.length === 0) {
        closeRoom(room.code, 'ABANDONED_BY_ALL');
      } else {
        room.broadcastMessage({
          type: 'OPPONENT_ABANDONED',
          message: 'Opponent has abandoned the room.'
        });
        if (room.match && room.match.phase === 'BATTLE') {
          if (room.mode === '1v1_duel' && activeClients.length === 1) {
            room.match.phase = 'FINISHED';
            room.match.winner = activeClients[0].playerId;
            room.broadcastState();
          }
        }
      }
      break;
    }
  }
}

function closeRoom(code, reason = 'ABANDONED') {
  const room = rooms.get(code);
  if (!room) return;
  room.stopTurnTimer();
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }
  // Notify any remaining connected clients
  room.clients.forEach(c => {
    if (c.ws && c.ws.readyState === WebSocket.OPEN) {
      try {
        c.ws.send(JSON.stringify({
          type: 'ROOM_CLOSED',
          roomCode: code,
          reason
        }));
      } catch (e) {}
    }
  });
  rooms.delete(code);
}

function pruneStaleRooms() {
  for (const [code, room] of rooms.entries()) {
    const activeClients = room.clients.filter(c => c.ws && c.ws.readyState === WebSocket.OPEN);
    if (activeClients.length === 0) {
      closeRoom(code, 'JANITOR_CLEANUP_EMPTY');
    }
  }
}

function handleClientDisconnect(ws) {
  const qIdx = quickMatch1v1Queue.findIndex(q => q.ws === ws);
  if (qIdx >= 0) quickMatch1v1Queue.splice(qIdx, 1);

  if (!ws.roomCode) return;
  const room = rooms.get(ws.roomCode);
  if (!room) return;

  const client = room.getClientByWs(ws);
  if (client) {
    client.disconnectedAt = Date.now();
  }

  // Count active connected clients in this room (excluding current ws)
  const activeClients = room.clients.filter(c => c.ws && c.ws.readyState === WebSocket.OPEN && c.ws !== ws);

  if (activeClients.length === 0) {
    // All parties have disconnected or abandoned the room!
    // Auto-close immediately if lobby/deploy/finished, or after 10s grace period for active match
    if (!room.match || room.match.phase === 'LOBBY' || room.match.phase === 'DEPLOY' || room.match.phase === 'FINISHED') {
      closeRoom(room.code, 'ALL_PARTIES_DISCONNECTED');
    } else {
      if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
      room.cleanupTimer = setTimeout(() => {
        const stillConnected = room.clients.filter(c => c.ws && c.ws.readyState === WebSocket.OPEN);
        if (stillConnected.length === 0) {
          closeRoom(room.code, 'ALL_PARTIES_ABANDONED');
        }
      }, 10000);
    }
    return;
  }

  // If one party remains:
  if (client) {
    setTimeout(() => {
      if (client.ws && client.ws.readyState !== WebSocket.OPEN) {
        if (room.match && room.match.activePlayerId === client.playerId) {
          MP.handleTurnTimeoutOrSkip(room.match, client.playerId);
          room.broadcastState();
        }
      }
    }, 10000);
  }
}

function startServer(port = 8090) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = req.url ? req.url.split('?')[0] : '/';
      if (url === '/api/rooms') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        const roomList = Array.from(rooms.values()).map(r => ({
          code: r.code,
          mode: r.mode,
          clients: r.clients.length,
          phase: r.match ? r.match.phase : 'LOBBY'
        }));
        res.end(JSON.stringify({ status: 'ok', rooms: roomList }));
      } else if (url === '/health' || url === '/healthz' || url === '/ping' || url === '/api/status') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        const payload = {
          status: 'ok',
          service: 'blackwater-mp',
          activeRooms: rooms.size,
          queueLength: quickMatch1v1Queue.length,
          uptimeSec: Math.floor(process.uptime()),
          timestamp: new Date().toISOString()
        };
        res.end(JSON.stringify(payload));
      } else {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        });
        res.end('Blackwater Command Authoritative WebSocket Server — Active\n');
      }
    });

    const wss = new WebSocket.Server({ server });

    // 25s WebSocket Keepalive Heartbeat for edge reverse-proxies (Railway, Cloudflare)
    const heartbeatInterval = setInterval(() => {
      wss.clients.forEach(ws => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 25000);

    // 30s Periodic Janitor to prune abandoned/empty rooms
    const janitorInterval = setInterval(pruneStaleRooms, 30000);

    wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('message', (data) => handleClientMessage(ws, data));
      ws.on('close', () => handleClientDisconnect(ws));
    });

    server.on('close', () => {
      clearInterval(heartbeatInterval);
      clearInterval(janitorInterval);
    });

    server.listen(port, () => {
      server.wss = wss;
      server.heartbeatInterval = heartbeatInterval;
      server.janitorInterval = janitorInterval;
      resolve(server);
    });

    server.on('error', reject);
  });
}

if (require.main === module) {
  const PORT = process.env.PORT || 8090;
  startServer(PORT).then(() => {
    console.log(`Blackwater Command Authoritative WebSocket Server running at ws://localhost:${PORT}`);
  });
}

module.exports = {
  startServer,
  rooms,
  closeRoom
};
