# QUANTUM-SAFE Production Deployment Guide

This application is 100% production-ready for public cloud deployment. It connects to **MongoDB Atlas**, delivers full **NIST FIPS 203 ML-KEM-768** post-quantum key establishment, and maintains real-time **WebSockets** (`ws://` / `wss://`) for zero-latency messaging.

---

## 1. Quick Deploy: Render.com (Recommended & Free / Simple)

1. Push your repository to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "QuantumSafe system with real-time WebSockets & MongoDB Atlas"
   git remote add origin https://github.com/<your-username>/quantum-safe-system.git
   git push -u origin main
   ```
2. Go to [Render.com](https://render.com) and click **New + > Web Service**.
3. Select your GitHub repository.
4. Set the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/server.js`
5. In **Environment Variables**, add:
   - `MONGODB_URI`: `<Your MongoDB Atlas connection string>`
   - `JWT_SECRET`: `<A random 64-character secret key>`
   - `PORT`: `3000`
   - `NODE_ENV`: `production`
6. Click **Deploy Web Service**! Render will provide a public HTTPS URL (e.g. `https://quantum-safe.onrender.com`).

---

## 2. Quick Deploy: Railway.app

1. Go to [Railway.app](https://railway.app) and click **New Project > Deploy from GitHub repo**.
2. Add your environment variables (`MONGODB_URI`, `JWT_SECRET`).
3. Railway automatically detects the `Dockerfile` or `npm start` and provisions a public domain with HTTPS and WSS automatically.

---

## 3. Quick Deploy: VPS / Ubuntu Server (DigitalOcean, AWS EC2, Linode)

1. Clone repo onto your server:
   ```bash
   git clone <repo-url> /var/www/quantumsafe
   cd /var/www/quantumsafe
   npm install --production
   ```
2. Create `.env` with:
   ```env
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_secret_key_here
   PORT=3000
   HOST=0.0.0.0
   ```
3. Run with **PM2** (process manager):
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name "quantum-safe"
   pm2 save
   pm2 startup
   ```
4. Setup Nginx with WebSocket reverse proxy support (`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`).

---

## Real-Time Architecture Summary
* **Lattice Cryptography:** NIST FIPS 203 ML-KEM-768 key encapsulation per message/session.
* **Symmetric AEAD:** NIST SP 800-38D AES-256-GCM with 96-bit unique nonce and 128-bit GHASH tag.
* **Persistent Storage:** Cloud MongoDB Atlas (`users`, `messages`, `vaultfiles`, `auditlogs`).
* **Real-Time Push:** Bidirectional WebSocket hub with automatic presence sync (`LIVE` badge) and fallback polling.
