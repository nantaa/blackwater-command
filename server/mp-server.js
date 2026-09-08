// server/mp-server.js - Authoritative WebSocket Server for Blackwater Command
const WebSocket = require('ws');
const http = require('http');
const MP = require('../src/mp-engine.js');

const rooms = new Map(); // roomCode -> Room

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
    if (this.clients.length >= 4) return null;
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
        const filtered = MP.getFilteredState(this.match, c.playerId);
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
  }
}

function handleClientDisconnect(ws) {
  if (!ws.roomCode) return;
  const room = rooms.get(ws.roomCode);
  if (!room) return;

  const client = room.getClientByWs(ws);
  if (client) {
    client.disconnectedAt = Date.now();
    // 10s Disconnect Grace Period
    setTimeout(() => {
      if (client.ws && client.ws.readyState !== WebSocket.OPEN) {
        // If still disconnected and match in progress, execute timeout fallback
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
    const server = http.createServer();
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
      ws.on('message', (data) => handleClientMessage(ws, data));
      ws.on('close', () => handleClientDisconnect(ws));
    });

    server.listen(port, () => {
      server.wss = wss;
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
  rooms
};
