# itch.io Production Backend Deployment & Guide Plan


**Goal:** Author a definitive, battle-tested deployment guide for hosting the Blackwater Command authoritative WebSocket backend when the standalone HTML is uploaded to itch.io, plus implement necessary production adaptations (WSS auto-detection, HTTP health-check probe, and cloud environment readiness).

**Architecture:** Add HTTP health-check responder (`GET /health`) in `server/mp-server.js` for cloud platform health monitors. Update `blackwater-command.html` to resolve production `wss://` endpoints safely and avoid mixed-content blocks on HTTPS itch.io CDN iframes. Document full turnkey setup across Render, Railway, and VPS in `docs/itch-io-backend-setup-guide.md`.

**Tech Stack:** Node.js, `ws`, HTTP 1.1, HTML5, Vanilla JavaScript.

## Global Constraints
- itch.io games are served over HTTPS (`https://*.hwcdn.net`). All production WebSocket connections must use `wss://`.
- Zero-leak authoritative server rules must be preserved.
- Standalone HTML release (`blackwater-command.html`) must remain self-contained with no external dependencies.
- Follow TDD phase order: test -> implement -> verify -> document.

---

### Task 1: Add Cloud Health Probe & HTTP Diagnostics to Backend

**Files:**
- Create: `test/test-server-health.js`
- Modify: `server/mp-server.js:478-500`

- [ ] **Step 1: Write test for HTTP health check and WebSocket co-existence**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Implement HTTP request handler in `server/mp-server.js`**
- [ ] **Step 4: Run test to verify it passes (GREEN)**
- [ ] **Step 5: Commit changes**

---

### Task 2: Production WSS Resolution & Mixed-Content Safety in Client

**Files:**
- Modify: `blackwater-command.html:2643-2655`
- Modify: `test/verify-complete-package.js`

- [ ] **Step 1: Write test in `test/verify-complete-package.js` for WSS safety**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Update `getDuelWsUrl()` in `blackwater-command.html`**
- [ ] **Step 4: Run test to verify it passes (GREEN)**
- [ ] **Step 5: Commit changes**

---

### Task 3: Author the itch.io Backend Deployment Guide

**Files:**
- Create: `docs/itch-io-backend-setup-guide.md`

- [ ] **Step 1: Write comprehensive deployment guide**
- [ ] **Step 2: Review guide against existing repo setup and package.json**
- [ ] **Step 3: Commit guide**

---

### Task 4: Full Regression & Verification

- [ ] **Step 1: Run all test suites**
- [ ] **Step 2: Update walkthrough and present deliverable**
