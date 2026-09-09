# Blackwater Command

Naval tactical rogue-lite & real-time authoritative multiplayer duel simulator.

Features fog-of-war reconnaissance, ballistic missiles, route map campaigns, 24×24 quadrant arena, and online 20×10 tactical 1v1 duels with zero-leak information security.

## Project Structure
- `blackwater-command.html`: Standalone, self-contained single-file release for itch.io and web browsers.
- `server/mp-server.js`: Authoritative Node.js WebSocket backend with real-time 1v1 matchmaking and cloud health probes (`/healthz`).
- `src/`: Tactical game engines (`mp-engine.js`, `route-engine.js`).
- `test/`: 10 automated test suites with 182 assertions.
- `docs/`: Deployment guides and architecture specifications.

## Quick Start
### 1. Run Offline / Standalone
Open `blackwater-command.html` directly in any web browser.

### 2. Run Local Multiplayer Server
```bash
npm install
npm start
```
Server listens on `ws://localhost:8090` (and `http://localhost:8090/healthz`).

### 3. Run Automated Tests
```bash
npm test
node test/verify-complete-package.js
node test/test-1v1-matchmaking.js
node test/verify-1v1-flow.js
```

## Cloud Deployment (Render.com / Railway)
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/healthz`
