/**
 * QUANTUM-SAFE Cryptographic Application Server
 * Standalone, zero-dependency Node.js enterprise server.
 * Handles Authentication, Identity, JWT, SQLite persistence, and static delivery.
 */

try { require('dotenv').config(); } catch {}

const http = require('node:http');
const url = require('node:url');
const routes = require('./routes');
const { serveStatic } = require('./static');
const { initWebSocket } = require('./websocket');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Handle CORS headers
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Parse JSON body helper
 */
function parseJsonBody(req, maxSize = 1048576) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error('Payload Too Large'));
        return;
      }
      raw += chunk;
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });

    req.on('error', err => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // Pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  try {
    // API Route Handlers
    if (pathname.startsWith('/api/')) {
      if (req.method === 'POST' && pathname === '/api/auth/register') {
        const body = await parseJsonBody(req);
        return await routes.handleRegister(req, res, body, clientIp);
      }

      if (req.method === 'POST' && pathname === '/api/auth/login') {
        const body = await parseJsonBody(req);
        return await routes.handleLogin(req, res, body, clientIp);
      }

      if (req.method === 'GET' && pathname === '/api/auth/me') {
        return await routes.handleMe(req, res);
      }

      if (req.method === 'POST' && pathname === '/api/auth/logout') {
        return await routes.handleLogout(req, res, clientIp);
      }

      if (req.method === 'PUT' && pathname === '/api/auth/profile') {
        const body = await parseJsonBody(req);
        return await routes.handleUpdateProfile(req, res, body);
      }

      if (req.method === 'GET' && pathname === '/api/logs') {
        return await routes.handleGetLogs(req, res);
      }

      if (req.method === 'GET' && pathname === '/api/users') {
        return await routes.handleGetUsers(req, res);
      }

      if (req.method === 'POST' && pathname === '/api/peers/provision-demo') {
        return await routes.handleProvisionDemoPeer(req, res, clientIp);
      }

      if (req.method === 'GET' && pathname === '/api/messages') {
        return await routes.handleGetMessages(req, res, parsedUrl);
      }

      if (req.method === 'POST' && pathname === '/api/messages') {
        const body = await parseJsonBody(req);
        return await routes.handleSendMessage(req, res, body, clientIp);
      }

      if (req.method === 'POST' && pathname === '/api/crypto/encapsulate') {
        const body = await parseJsonBody(req);
        return await routes.handleEncapsulate(req, res, body);
      }

      if (req.method === 'POST' && pathname === '/api/crypto/verify-pipeline') {
        return await routes.handleVerifyPipeline(req, res, clientIp);
      }

      if (req.method === 'GET' && pathname === '/api/files') {
        return await routes.handleGetFiles(req, res);
      }

      if (req.method === 'POST' && pathname === '/api/files/upload') {
        const body = await parseJsonBody(req, 52428800);
        return await routes.handleUploadFile(req, res, body, clientIp);
      }

      if (req.method === 'GET' && pathname === '/api/files/download') {
        return await routes.handleDownloadFile(req, res, parsedUrl);
      }

      if (req.method === 'DELETE' && pathname === '/api/files') {
        const body = await parseJsonBody(req);
        return await routes.handleDeleteFile(req, res, body, clientIp);
      }

      if (req.method === 'GET' && pathname === '/api/dashboard/stats') {
        return await routes.handleGetStats(req, res);
      }

      if (req.method === 'GET' && pathname === '/api/health') {
        return await routes.handleHealth(req, res);
      }

      // Unmatched API endpoint
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
      return;
    }

    // Static Assets Handler (index.html, CSS, JS, Assets)
    serveStatic(req, res, parsedUrl);
  } catch (err) {
    if (err.message === 'Payload Too Large') {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Payload size exceeds allowable limit.' }));
      return;
    }

    if (err.message === 'Invalid JSON format') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload.' }));
      return;
    }

    console.error('Unhandled Server Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
  }
});

server.listen(PORT, HOST, () => {
  initWebSocket(server);
  console.log(`=======================================================`);
  console.log(`🛡️  QUANTUM-SAFE SECURE SERVER ACTIVE`);
  console.log(`🔗  Web Application: http://localhost:${PORT}`);
  console.log(`⚡  API Endpoint:    http://localhost:${PORT}/api/health`);
  console.log(`🔒  Cryptographic Engine: ML-KEM-768 & AES-256-GCM`);
  console.log(`💾  SQLite Storage:  server/data/quantum_safe.db`);
  console.log(`=======================================================`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nClosing Quantum-Safe server...');
  server.close(() => {
    process.exit(0);
  });
});
