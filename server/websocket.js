/**
 * QUANTUM-SAFE Real-Time WebSocket Hub
 * Provides zero-latency peer discovery, message push, and online presence tracking.
 * Compatible with cloud deployments (Render, Railway, Fly.io, AWS, Heroku, Docker).
 */

const { WebSocketServer, WebSocket } = require('ws');
const { verifyToken } = require('./auth');

// Map of userId -> Set<WebSocket>
const userSockets = new Map();
let wssInstance = null;

function initWebSocket(server) {
  const wss = new WebSocketServer({
    noServer: true
  });
  wssInstance = wss;

  server.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost';
      const reqUrl = new URL(request.url, `http://${host}`);

      if (reqUrl.pathname !== '/ws') {
        socket.destroy();
        return;
      }

      const token = reqUrl.searchParams.get('token');
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.userId = decoded.userId.toString();
        ws.userEmail = decoded.email || '';
        ws.isAlive = true;
        wss.emit('connection', ws, request);
      });
    } catch (err) {
      console.warn('[WebSocket] Upgrade error:', err.message);
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    const userId = ws.userId;
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(ws);

    // Heartbeat pong listener
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Send initial handshake state to the client
    const onlineIds = Array.from(userSockets.keys());
    sendJson(ws, {
      type: 'SYNC_STATE',
      userId: userId,
      onlineUserIds: onlineIds
    });

    // Broadcast user presence to others
    broadcast({
      type: 'USER_ONLINE',
      userId: userId
    }, userId);

    ws.on('close', () => {
      const set = userSockets.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          userSockets.delete(userId);
          broadcast({
            type: 'USER_OFFLINE',
            userId: userId
          });
        }
      }
    });

    ws.on('error', (err) => {
      console.warn(`[WebSocket] Client error for user ${userId}:`, err.message);
    });
  });

  // Keep-alive ping interval to avoid cloud proxy timeouts (Render, Cloudflare, AWS)
  const interval = setInterval(() => {
    if (!wssInstance) return;
    for (const ws of wssInstance.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('⚡  [WebSocket] Real-time quantum event hub initialized on /ws');
  return wss;
}

function sendJson(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (e) {
      console.warn('[WebSocket] sendJson failed:', e.message);
    }
  }
}

/**
 * Broadcast event to all connected clients
 */
function broadcast(payload, excludeUserId = null) {
  if (!wssInstance) return;
  const msg = JSON.stringify(payload);
  for (const client of wssInstance.clients) {
    if (client.readyState === WebSocket.OPEN) {
      if (excludeUserId && client.userId === excludeUserId.toString()) {
        continue;
      }
      try {
        client.send(msg);
      } catch (e) {}
    }
  }
}

/**
 * Send event to a specific user (delivers to all their active tabs/devices)
 */
function sendToUser(userId, payload) {
  if (!userId) return;
  const set = userSockets.get(userId.toString());
  if (!set || set.size === 0) return false;
  const msg = JSON.stringify(payload);
  for (const client of set) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch (e) {}
    }
  }
  return true;
}

/**
 * Broadcast when a new peer registers on the system
 */
function notifyPeerRegistered(peerData) {
  broadcast({
    type: 'PEER_REGISTERED',
    peer: {
      id: peerData.id,
      name: peerData.name,
      email: peerData.email,
      role: peerData.role,
      organization: peerData.organization,
      pqcFingerprint: peerData.pqcFingerprint || peerData.pqc_fingerprint,
      avatarInitials: peerData.avatarInitials || peerData.avatar_initials,
      status: isUserOnline(peerData.id) ? 'online' : 'offline'
    }
  });
}

/**
 * Dispatch newly sent encrypted message to recipient and sender
 */
function notifyNewMessage(senderId, receiverId, message) {
  // Push to recipient
  sendToUser(receiverId, {
    type: 'NEW_MESSAGE',
    peerId: senderId,
    message: message
  });

  // Push to sender (other active sessions)
  sendToUser(senderId, {
    type: 'MESSAGE_SENT',
    peerId: receiverId,
    message: message
  });
}

function isUserOnline(userId) {
  if (!userId) return false;
  const set = userSockets.get(userId.toString());
  return !!(set && set.size > 0);
}

function getOnlineUserIds() {
  return Array.from(userSockets.keys());
}

module.exports = {
  initWebSocket,
  broadcast,
  sendToUser,
  notifyPeerRegistered,
  notifyNewMessage,
  isUserOnline,
  getOnlineUserIds
};
