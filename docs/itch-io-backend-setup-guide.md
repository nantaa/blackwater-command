# Blackwater Command — itch.io Production Backend Deployment Guide

This guide details how to host and connect the authoritative WebSocket backend (`server/mp-server.js`) when `blackwater-command.html` is published to **itch.io**.

---

## 1. Direct Reality Check & The HTTPS / WSS Trap

> [!CAUTION]
> **The Mixed Content Blunder (Why `ws://your-ip:8090` Fails):**
> If you upload your HTML to itch.io and attempt to connect to an unencrypted WebSocket URL (`ws://...`), **the game will immediately crash with a fatal `SecurityError`**.
>
> **Why:** itch.io serves all web games inside an HTTPS iframe (`https://*.ssl.hwcdn.net`). Web standards strictly prohibit unencrypted `ws://` connections from an `https://` origin. **All production WebSocket connections MUST use Secure WebSockets (`wss://`).**

---

## 2. Cloud Hosting Options & Honest Ratings

| Provider | Rating | Price | SSL Setup | Cold Starts | Verdict |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Render.com** (Web Service) | **8.5 / 10** | **Free** | Automatic | ~45s after 15m idle | **Recommended for Indie / itch.io.** Free tier auto-generates `wss://<app>.onrender.com` with zero certificate maintenance. |
| **Railway.app** | **9.0 / 10** | $5 free trial | Automatic | None | **Best Developer Experience.** Zero spin-down, instant deployments. Requires adding billing card after free credit. |
| **VPS (DigitalOcean / Hetzner)** | **8.0 / 10** | ~$4–6 / mo | Manual (Certbot) | None | **Best for Production Scalability.** Requires configuring Ubuntu, Nginx reverse-proxy, PM2 daemon, and Let's Encrypt. |
| **Self-Hosting (Home PC)** | **2.0 / 10** | "Free" | Manual pain | High downtime | **Terrible Idea.** Exposes your home IP, requires dynamic DNS, router port forwarding, SSL certificates for `wss://`, and keeping your PC running 24/7. |

---

## 3. Turnkey Deployment: Render.com (Recommended Free Option)

Render is the simplest free way to obtain a dedicated `wss://` backend with zero SSL overhead.

### Step 1: Push Repository to GitHub
Ensure your code is pushed to a GitHub repository (public or private):
```bash
git push origin feature/multiplayer-v0
```

### Step 2: Create a Free Web Service on Render
1. Log in to [Render.com](https://render.com) and click **New +** $\to$ **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `blackwater-mp` (or your preferred name)
   - **Region:** Choose the region closest to your target players (e.g., Singapore, Frankfurt, Oregon).
   - **Branch:** `feature/multiplayer-v0` (or `main`)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/mp-server.js` (or `npm start`)
   - **Instance Type:** `Free`
4. Click **Create Web Service**.

### Step 3: Verify Deployment & Health Check
Once deployed, Render provides a public URL:
```text
https://blackwater-mp.onrender.com
```

Test the built-in health probe in your browser or terminal:
```bash
curl https://blackwater-mp.onrender.com/health
```
**Expected Response (HTTP 200):**
```json
{
  "status": "ok",
  "service": "blackwater-mp",
  "activeRooms": 0,
  "queueLength": 0,
  "uptimeSec": 42,
  "timestamp": "2026-09-09T09:30:00.000Z"
}
```

Your Secure WebSocket URL is simply:
```text
wss://blackwater-mp.onrender.com
```

---

## 4. Alternative Deployment: Linux VPS (Nginx + Let's Encrypt)

If you host on your own Ubuntu/Debian VPS ($4/mo on Hetzner or DigitalOcean), you must set up Nginx as an SSL reverse proxy to upgrade HTTP to `wss://`.

### 1. Run Backend via PM2
```bash
cd /opt/blackwater-game
npm install
npm install -g pm2
pm2 start server/mp-server.js --name "blackwater-backend"
pm2 save
pm2 startup
```

### 2. Configure Nginx with WebSocket Upgrade
Create `/etc/nginx/sites-available/blackwater.conf`:
```nginx
server {
    server_name mp.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### 3. Generate Free SSL Certificate via Certbot
```bash
sudo ln -s /etc/nginx/sites-available/blackwater.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d mp.yourdomain.com
sudo systemctl reload nginx
```
Your backend is now live at `wss://mp.yourdomain.com`.

---

## 5. Wiring the Backend URL to itch.io

[`blackwater-command.html`](file:///d:/Document%20Backup/website-aryo/game/blackwater-command.html) uses a multi-tier resolution system inside `getDuelWsUrl()`. You have 3 easy ways to connect your uploaded game to your live backend:

### Option A: Edit the Default URL in `blackwater-command.html` (Recommended)
Before creating your itch.io zip, open `blackwater-command.html` and set your live URL at the top of the `<script>` tag:
```javascript
<script>
'use strict';
window.BLACKWATER_PROD_WS_URL = 'wss://blackwater-mp.onrender.com';
```
When hosted on itch.io HTTPS, the game automatically routes to this `wss://` address.

### Option B: Pass via itch.io URL Parameter
You can direct players or configure the iframe with the URL parameter:
```text
https://username.itch.io/blackwater-command?server=wss://blackwater-mp.onrender.com
```
`getDuelWsUrl()` detects `?server=` or `?ws=` and overrides the connection automatically.

---

## 6. itch.io Project Upload Checklist

1. **Rename for itch.io:**
   - Copy or rename `blackwater-command.html` to `index.html`.
2. **Zip the Package:**
   - Compress `index.html` into `blackwater-command-itch.zip`. (Ensure `index.html` is at the root of the zip archive, not inside a nested subfolder).
3. **itch.io Dashboard Settings:**
   - **Kind of project:** `HTML` (You have a ZIP or HTML file that will be played in the browser).
   - **Uploads:** Upload `blackwater-command-itch.zip` and check `This file will be played in the browser`.
   - **Viewport dimensions:** Set to `1280` px width $\times$ `720` px height (or check `Responsive`).
   - **Orientation:** Landscape.
   - **Mobile friendly:** Optional (Best on desktop mouse/keyboard).
   - **Fullscreen button:** Check `Enable fullscreen button`.

---

## 7. Troubleshooting & Operational Runbook

### Issue 1: "Authoritative WebSocket server not reached"
* **Diagnosis:** Open browser DevTools (`F12`), switch to the **Console** and **Network** tabs, and filter for `WS`.
* **Common Cause A (Mixed Content):** URL starts with `ws://` instead of `wss://`. Change protocol to `wss://`.
* **Common Cause B (Cold Start):** On Render's free tier, the backend sleeps after 15 minutes of inactivity. When a player opens the game, the server takes ~35–50 seconds to boot.
  * *Fix:* The lobby UI displays "Connecting to Authoritative Server...". Wait 40 seconds for the container to wake up, or set up a free 10-minute cron ping on [cron-job.org](https://cron-job.org) hitting `https://blackwater-mp.onrender.com/health`.

### Issue 2: Cross-Origin / Iframe Errors
* **Diagnosis:** itch.io runs the game in a sandboxed `<iframe>`.
* **Status:** `server/mp-server.js` includes `'Access-Control-Allow-Origin': '*'` on all HTTP endpoints, and WebSockets do not enforce CORS restrictions on standard connection upgrades.

### Issue 3: Disconnects During Inactivity
* **Status:** `server/mp-server.js` maintains turn timers and heartbeats. If a player disconnects, they have a 30-second reconnection window before their turn automatically executes a defensive fallback.
