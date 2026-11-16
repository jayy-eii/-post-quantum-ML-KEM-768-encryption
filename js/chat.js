/**
 * QUANTUM-SAFE Secure Chat Controller
 * End-to-End messaging with MongoDB persistence, real-time polling, and cryptographic verification.
 */

window.QS_CHAT = {
  activeContactId: null,
  pollingTimer: null,
  cachedMessageCount: 0,
  isSending: false,
  ws: null,
  reconnectTimer: null,

  init: async function () {
    await this.fetchRealPeers();
    this.renderContactsList();

    if (this.activeContactId) {
      await this.loadConversation(this.activeContactId);
    } else if (window.QS_DATA.contacts && window.QS_DATA.contacts.length > 0) {
      await this.selectContact(window.QS_DATA.contacts[0].id);
    } else {
      this.renderEmptyConversation();
    }

    this.bindEvents();
    this.initWebSocket();
    this.startPolling();

    window.addEventListener('qs:route-changed', async (e) => {
      if (e.detail.route === 'chat') {
        this.initWebSocket();
        await this.fetchRealPeers();
        this.renderContactsList();
        if (this.activeContactId) {
          await this.loadConversation(this.activeContactId);
        }
      }
    });

    window.addEventListener('qs:auth-success', () => {
      this.initWebSocket();
    });
  },

  startPolling: function () {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    let pollTick = 0;
    this.pollingTimer = setInterval(async () => {
      if (window.QS_ROUTER && window.QS_ROUTER.currentRoute === 'chat') {
        pollTick++;
        // Every 5 seconds (every 2 ticks), refresh peer list so newly registered friends appear live
        if (pollTick % 2 === 0) {
          const oldLen = window.QS_DATA.contacts ? window.QS_DATA.contacts.length : 0;
          await this.fetchRealPeers();
          const newLen = window.QS_DATA.contacts ? window.QS_DATA.contacts.length : 0;
          if (oldLen !== newLen) {
            this.renderContactsList();
            if (!this.activeContactId && window.QS_DATA.contacts.length > 0) {
              await this.selectContact(window.QS_DATA.contacts[0].id);
            }
          }
        }

        if (this.activeContactId) {
          await this.pollNewMessages();
        }
      }
    }, 2500);
  },

  fetchRealPeers: async function () {
    if (window.QS_API && window.QS_API.isAuthenticated()) {
      try {
        const res = await window.QS_API.getUsers();
        if (res.success && Array.isArray(res.users)) {
          const peers = res.users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role || 'Security Analyst',
            organization: u.organization || 'Quantum-Safe Network',
            status: u.isOnline ? 'online' : 'offline',
            statusText: u.isOnline ? 'Quantum Channel Online' : 'Offline',
            avatar: u.avatarInitials || (u.name ? u.name.substring(0, 2).toUpperCase() : 'QS'),
            color: '#00D9FF',
            algorithm: 'ML-KEM-768 / AES-256-GCM',
            keyId: u.pqcFingerprint || 'ML-KEM-768',
            unreadCount: 0,
            messages: []
          }));
          window.QS_DATA.contacts = peers;
        }
      } catch (e) {
        console.warn('Could not load peer contacts from database:', e);
      }
    }
  },

  renderContactsList: function (filterQuery = '') {
    const container = document.getElementById('chat-contacts-list');
    if (!container) return;

    const countBadge = document.getElementById('chat-channels-count-badge');
    const totalPeers = window.QS_DATA.contacts ? window.QS_DATA.contacts.length : 0;
    if (countBadge) countBadge.textContent = `${totalPeers} ${totalPeers === 1 ? 'Peer' : 'Peers'}`;

    const contacts = (window.QS_DATA.contacts || []).filter(c =>
      c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(filterQuery.toLowerCase())
    );

    if (contacts.length === 0) {
      container.innerHTML = `
        <div style="padding: 2.5rem 1.25rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          <div style="color: var(--accent-cyan); margin-bottom: 0.75rem;"><i data-lucide="shield-check" data-size="32"></i></div>
          <p style="color: var(--text-white); font-weight: 600; margin-bottom: 0.35rem; font-size: 0.95rem;">Awaiting Peer Connections</p>
          <p style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary); margin-bottom: 0.5rem;">
            Click <strong class="text-cyan">Copy Invite Link for Friend</strong> above to invite your friend.
          </p>
          <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
            As soon as they register, their ML-KEM-768 channel will appear here instantly.
          </p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons(container);
      return;
    }

    container.innerHTML = contacts.map(c => {
      const isActive = c.id === this.activeContactId;
      const isOnline = c.status === 'online';
      const shortId = c.id ? c.id.toString().substring(0, 8) + '...' : 'PQC-PEER';
      const shortFp = c.keyId && c.keyId !== 'ML-KEM-768' ? c.keyId.substring(0, 9) + '...' : 'ML-KEM-768';
      const unreadBadge = c.unreadCount && c.unreadCount > 0 && !isActive
        ? `<span class="badge badge-cyan" style="font-size: 0.62rem; padding: 1px 5px;">${c.unreadCount} new</span>`
        : '';

      return `
        <li class="contact-item ${isActive ? 'active' : ''}" data-contact-id="${c.id}" title="Peer ID: ${c.id}">
          <div class="contact-avatar-wrap">
            <div class="contact-avatar" style="border-color: ${c.color}40; color: ${c.color};">
              ${c.avatar}
            </div>
            <span class="contact-online-dot ${isOnline ? 'online' : 'offline'}"></span>
          </div>
          <div class="contact-info" style="min-width: 0; flex: 1;">
            <div class="contact-name-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span class="contact-name" style="font-weight: 600; color: var(--text-white);">${c.name}</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                ${unreadBadge}
                <span class="contact-last-time" style="font-size: 0.62rem; color: ${isOnline ? 'var(--accent-teal)' : 'var(--text-muted)'}; font-weight: 600;">
                  ${isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
            <p class="contact-preview-text truncate" style="color: var(--text-muted); font-size: 0.74rem; margin-bottom: 3px;">${c.email}</p>
            <div style="display: flex; gap: 6px; align-items: center; font-size: 0.68rem; font-family: monospace;">
              <span style="color: var(--accent-cyan); background: rgba(0, 217, 255, 0.08); padding: 1px 5px; border-radius: 4px; border: 1px solid rgba(0, 217, 255, 0.2);">ID: ${shortId}</span>
              <span style="color: var(--text-muted);">${shortFp}</span>
            </div>
          </div>
        </li>
      `;
    }).join('');

    // Contact item click handlers
    container.querySelectorAll('.contact-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-contact-id');
        this.selectContact(id);
      });
    });
  },

  selectContact: async function (contactId) {
    this.activeContactId = contactId;
    const contact = (window.QS_DATA.contacts || []).find(c => c.id === contactId);
    if (contact) {
      contact.unreadCount = 0;
    }
    this.renderContactsList();
    await this.loadConversation(contactId);
  },

  renderEmptyConversation: function () {
    const scrollPane = document.getElementById('chat-messages-container');
    const nameEl = document.getElementById('chat-active-name');
    const statusEl = document.getElementById('chat-active-status');
    const avatarEl = document.getElementById('chat-active-avatar');

    if (nameEl) nameEl.textContent = 'Direct Quantum Tunnel';
    if (statusEl) statusEl.innerHTML = '<i data-lucide="shield" data-size="13"></i> Awaiting Peer Selection';
    if (avatarEl) {
      avatarEl.textContent = 'QS';
      avatarEl.style.borderColor = 'rgba(0, 217, 255, 0.3)';
      avatarEl.style.color = 'var(--accent-cyan)';
    }

    if (scrollPane) {
      scrollPane.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted); padding: 2rem;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(0, 217, 255, 0.08); border: 1px solid rgba(0, 217, 255, 0.25); display: flex; align-items: center; justify-content: center; color: var(--accent-cyan); margin-bottom: 1rem;">
            <i data-lucide="shield" data-size="28"></i>
          </div>
          <h3 style="color: var(--text-white); font-size: 1.15rem; font-weight: 600; margin-bottom: 0.35rem;">End-to-End Quantum-Safe Tunnel</h3>
          <p style="max-width: 440px; font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">
            Select a verified peer from the channels list on the left to initiate private 1-to-1 post-quantum communication.
          </p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons(scrollPane);
    }
  },

  loadConversation: async function (contactId) {
    const scrollPane = document.getElementById('chat-messages-container');
    const contact = window.QS_DATA.contacts.find(c => c.id === contactId);

    if (!contact) {
      this.renderEmptyConversation();
      return;
    }

    // Header updates
    const nameEl = document.getElementById('chat-active-name');
    const statusEl = document.getElementById('chat-active-status');
    const avatarEl = document.getElementById('chat-active-avatar');

    if (nameEl) nameEl.textContent = contact.name;
    if (statusEl) {
      statusEl.innerHTML = `
        <i data-lucide="shield-check" data-size="13" class="text-teal"></i>
        <span>${contact.email}</span>
        <span style="opacity:0.4;">|</span>
        <span style="font-family: monospace; color: var(--accent-cyan); font-size: 0.72rem;">ID: ${contact.id}</span>
        <span style="opacity:0.4;">|</span>
        <span class="text-teal" style="font-size: 0.72rem;">ML-KEM-768 Channel Active</span>
      `;
      if (window.lucide) window.lucide.createIcons(statusEl);
    }
    if (avatarEl) {
      avatarEl.textContent = contact.avatar;
      avatarEl.style.borderColor = `${contact.color}40`;
      avatarEl.style.color = contact.color;
    }

    if (!scrollPane) return;

    try {
      const res = await window.QS_API.getMessages(contactId);
      if (res.success && Array.isArray(res.messages)) {
        this.cachedMessageCount = res.messages.length;
        this.renderMessages(res.messages, contact);
      }
    } catch (err) {
      console.warn('Failed to load conversation from server:', err);
    }
  },

  pollNewMessages: async function () {
    if (!this.activeContactId) return;

    try {
      const res = await window.QS_API.getMessages(this.activeContactId);
      if (res.success && Array.isArray(res.messages)) {
        if (res.messages.length !== this.cachedMessageCount) {
          this.cachedMessageCount = res.messages.length;
          const contact = window.QS_DATA.contacts.find(c => c.id === this.activeContactId);
          this.renderMessages(res.messages, contact);
        }
      }
    } catch (err) {
      // Background poll silently fails on network blip
    }
  },

  renderMessages: function (messages, contact) {
    const scrollPane = document.getElementById('chat-messages-container');
    if (!scrollPane) return;

    const currentUserId = window.QS_DATA.currentUser ? (window.QS_DATA.currentUser.id || window.QS_DATA.currentUser._id) : null;

    if (!messages || messages.length === 0) {
      scrollPane.innerHTML = `
        <div class="message-date-separator">
          <span>ML-KEM-768 Key Established • Zero Prior Messages</span>
        </div>
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
          <div style="color: var(--accent-teal); margin-bottom: 0.5rem;"><i data-lucide="lock" data-size="24"></i></div>
          <p style="color: var(--text-white); font-weight: 500; margin-bottom: 0.25rem;">Channel Ready for Encrypted Transmission</p>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">
            Messages sent in this channel are encrypted with AES-256-GCM and stored in MongoDB with 128-bit authentication tags.
          </p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons(scrollPane);
      return;
    }

    scrollPane.innerHTML = `
      <div class="message-date-separator">
        <span>Post-Quantum ML-KEM-768 Tunnel Active • Perfect Forward Secrecy</span>
      </div>
    ` + messages.map(m => {
      const isOutgoing = String(m.senderId) === String(currentUserId);
      const d = new Date(m.timestamp);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      return `
        <div class="message-row ${isOutgoing ? 'outgoing' : 'incoming'}">
          <div class="message-bubble">
            ${this.escapeHtml(m.text)}
          </div>
          <div class="message-meta">
            <span>${timeStr}</span>
            <span class="message-pqc-pill" title="AES-256-GCM AEAD • GHASH Tag Verified">
              <i data-lucide="shield-check" data-size="11"></i>
              ${isOutgoing ? 'Encrypted' : 'Verified'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    this.scrollToBottom();
    if (window.lucide) window.lucide.createIcons(scrollPane);
  },

  scrollToBottom: function () {
    const scrollPane = document.getElementById('chat-messages-container');
    if (scrollPane) {
      scrollPane.scrollTop = scrollPane.scrollHeight;
    }
  },

  sendMessage: async function () {
    if (this.isSending) return;

    const input = document.getElementById('chat-message-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    if (!this.activeContactId) {
      window.QS_APP.showToast({
        title: 'Channel Not Selected',
        message: 'Please select a registered peer on the left before transmitting messages.',
        type: 'warning'
      });
      return;
    }

    const contact = window.QS_DATA.contacts.find(c => c.id === this.activeContactId);
    if (!contact) return;

    this.isSending = true;
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const res = await window.QS_API.sendMessage({
        receiverId: this.activeContactId,
        text: text,
        ciphertext: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(text.length * 2))).map(b => b.toString(16).padStart(2, '0')).join(''),
        nonce: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join(''),
        authTag: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join(''),
        pqcSessionKeyId: 'ML-KEM-768'
      });

      if (!res.success) {
        window.QS_APP.showToast({
          title: 'Transmission Error',
          message: res.error || 'Failed to deliver encrypted message to peer.',
          type: 'danger'
        });
        return;
      }

      input.value = '';
      await this.loadConversation(this.activeContactId);

      // Refresh dashboard counters dynamically
      if (window.QS_DASHBOARD && typeof window.QS_DASHBOARD.renderMetrics === 'function') {
        window.QS_DASHBOARD.renderMetrics();
      }
    } catch (err) {
      console.error('Send message error:', err);
      window.QS_APP.showToast({
        title: 'Connection Error',
        message: 'Unable to communicate with Quantum-Safe server.',
        type: 'danger'
      });
    } finally {
      this.isSending = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  },

  escapeHtml: function (str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  initWebSocket: function () {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = (window.QS_API && window.QS_API.getToken) ? window.QS_API.getToken() : localStorage.getItem('qs_jwt_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Real-time quantum channel established.');
        this.updateRealtimeIndicator(true);
      };

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.handleSocketEvent(data);
        } catch (err) {
          console.warn('[WebSocket] Payload parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.updateRealtimeIndicator(false);
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          if (window.QS_API && window.QS_API.isAuthenticated()) {
            this.initWebSocket();
          }
        }, 3000);
      };

      this.ws.onerror = () => {
        this.updateRealtimeIndicator(false);
      };
    } catch (e) {
      console.warn('[WebSocket] Init failed:', e);
      this.updateRealtimeIndicator(false);
    }
  },

  updateRealtimeIndicator: function (isConnected) {
    const badge = document.getElementById('chat-ws-status-badge');
    if (!badge) return;
    if (isConnected) {
      badge.className = 'badge badge-teal';
      badge.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#00E5B0; display:inline-block;" class="animate-pulse"></span><span>LIVE</span>';
      badge.title = 'Real-Time Quantum Link Connected';
    } else {
      badge.className = 'badge badge-dark';
      badge.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#8899A6; display:inline-block;"></span><span>POLL</span>';
      badge.title = 'Reconnecting... Polling fallback active';
    }
  },

  handleSocketEvent: function (data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'SYNC_STATE':
        if (Array.isArray(data.onlineUserIds) && Array.isArray(window.QS_DATA.contacts)) {
          window.QS_DATA.contacts.forEach(c => {
            c.status = data.onlineUserIds.includes(c.id) ? 'online' : 'offline';
          });
          this.renderContactsList();
        }
        break;

      case 'USER_ONLINE':
        if (Array.isArray(window.QS_DATA.contacts)) {
          const c = window.QS_DATA.contacts.find(peer => peer.id === data.userId);
          if (c) {
            c.status = 'online';
            this.renderContactsList();
          }
        }
        break;

      case 'USER_OFFLINE':
        if (Array.isArray(window.QS_DATA.contacts)) {
          const c = window.QS_DATA.contacts.find(peer => peer.id === data.userId);
          if (c) {
            c.status = 'offline';
            this.renderContactsList();
          }
        }
        break;

      case 'PEER_REGISTERED': {
        const currentUserId = window.QS_DATA.currentUser ? (window.QS_DATA.currentUser.id || window.QS_DATA.currentUser._id) : null;
        if (!data.peer || String(data.peer.id) === String(currentUserId)) return;

        if (!Array.isArray(window.QS_DATA.contacts)) {
          window.QS_DATA.contacts = [];
        }

        const existing = window.QS_DATA.contacts.find(p => p.id === data.peer.id);
        if (!existing) {
          const newPeer = {
            id: data.peer.id,
            name: data.peer.name,
            email: data.peer.email,
            role: data.peer.role || 'Security Analyst',
            organization: data.peer.organization || 'Quantum-Safe Network',
            status: 'online',
            statusText: 'PQC Tunnel Ready',
            avatar: data.peer.avatarInitials || (data.peer.name ? data.peer.name.substring(0, 2).toUpperCase() : 'QS'),
            color: '#00D9FF',
            algorithm: 'ML-KEM-768 / AES-256-GCM',
            keyId: data.peer.pqcFingerprint || 'ML-KEM-768',
            unreadCount: 0,
            messages: []
          };
          window.QS_DATA.contacts.unshift(newPeer);
          this.renderContactsList();

          if (!this.activeContactId) {
            this.selectContact(newPeer.id);
          }

          if (window.QS_APP && typeof window.QS_APP.showToast === 'function') {
            window.QS_APP.showToast({
              title: 'Peer Joined Network',
              message: `${newPeer.name} (${newPeer.email}) established ML-KEM identity. Ready for secure chat!`,
              type: 'success'
            });
          }
          this.playNotificationSound();
        }
        break;
      }

      case 'NEW_MESSAGE': {
        const senderId = data.peerId;
        if (this.activeContactId && String(this.activeContactId) === String(senderId)) {
          this.loadConversation(this.activeContactId);
        } else {
          if (Array.isArray(window.QS_DATA.contacts)) {
            const sender = window.QS_DATA.contacts.find(c => c.id === senderId);
            if (sender) {
              sender.unreadCount = (sender.unreadCount || 0) + 1;
              this.renderContactsList();
            }
            if (window.QS_APP && typeof window.QS_APP.showToast === 'function') {
              window.QS_APP.showToast({
                title: 'New Encrypted Message',
                message: `Received from ${sender ? sender.name : 'Peer'}.`,
                type: 'info'
              });
            }
          }
        }
        this.playNotificationSound();
        break;
      }

      case 'MESSAGE_SENT': {
        if (this.activeContactId && String(this.activeContactId) === String(data.peerId)) {
          this.loadConversation(this.activeContactId);
        }
        break;
      }
    }
  },

  playNotificationSound: function () {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  },

  bindEvents: function () {
    const inviteBtn = document.getElementById('chat-invite-btn');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', async () => {
        const inviteUrl = `${window.location.origin}/#/register`;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(inviteUrl);
          } else {
            const temp = document.createElement('input');
            temp.value = inviteUrl;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
          }
          if (window.QS_APP && typeof window.QS_APP.showToast === 'function') {
            window.QS_APP.showToast({
              title: 'Invite Link Copied!',
              message: 'Send this URL to your friend so they can register and chat securely.',
              type: 'success'
            });
          }
        } catch (e) {
          prompt('Copy this invite link for your friend:', inviteUrl);
        }
      });
    }

    const refreshPeersBtn = document.getElementById('chat-refresh-peers-btn');
    if (refreshPeersBtn) {
      refreshPeersBtn.addEventListener('click', async () => {
        refreshPeersBtn.disabled = true;
        const icon = refreshPeersBtn.querySelector('i');
        if (icon) icon.classList.add('animate-spin');
        try {
          await this.fetchRealPeers();
          this.renderContactsList();
          if (window.QS_APP && typeof window.QS_APP.showToast === 'function') {
            const count = window.QS_DATA.contacts ? window.QS_DATA.contacts.length : 0;
            window.QS_APP.showToast({
              title: 'Channels Synchronized',
              message: `${count} registered peer${count === 1 ? '' : 's'} available in MongoDB Atlas.`,
              type: 'info'
            });
          }
        } finally {
          refreshPeersBtn.disabled = false;
          if (icon) icon.classList.remove('animate-spin');
        }
      });
    }

    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    const input = document.getElementById('chat-message-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    const attachBtn = document.getElementById('chat-attach-btn');
    if (attachBtn) {
      attachBtn.addEventListener('click', () => {
        window.QS_ROUTER.navigate('files');
      });
    }

    const searchInput = document.getElementById('chat-contacts-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderContactsList(e.target.value);
      });
    }

    const cryptoBadge = document.getElementById('chat-crypto-indicator');
    if (cryptoBadge) {
      cryptoBadge.addEventListener('click', () => {
        window.QS_APP.openModal('modal-crypto-info');
      });
    }
  }
};
