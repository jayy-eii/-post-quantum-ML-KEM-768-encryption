/**
 * QUANTUM-SAFE Main Dashboard Controller
 * Telemetry counters, interactive message volume chart, algorithm distribution, and activity feeds.
 */

window.QS_DASHBOARD = {
  canvas: null,
  ctx: null,

  init: async function () {
    if (window.QS_LOGS && typeof window.QS_LOGS.fetchServerLogs === 'function') {
      await window.QS_LOGS.fetchServerLogs();
    }
    await this.renderMetrics();
    this.initChart();
    this.renderAlgorithmBars();
    this.renderRecentActivity();
    this.bindQuickActions();

    window.addEventListener('resize', () => {
      if (window.QS_ROUTER.currentRoute === 'dashboard') {
        this.drawChart();
      }
    });

    window.addEventListener('qs:route-changed', async (e) => {
      if (e.detail.route === 'dashboard') {
        if (window.QS_LOGS && typeof window.QS_LOGS.fetchServerLogs === 'function') {
          await window.QS_LOGS.fetchServerLogs();
        }
        await this.renderMetrics();
        this.renderRecentActivity();
        setTimeout(() => this.drawChart(), 50);
      }
    });
  },

  renderMetrics: async function () {
    const user = window.QS_DATA?.currentUser;

    if (user) {
      const welcomeName = document.getElementById('dashboard-welcome-name');
      const welcomeOrg = document.getElementById('dashboard-welcome-org');
      if (welcomeName) welcomeName.textContent = user.name;
      if (welcomeOrg) welcomeOrg.textContent = user.organization || 'Quantum-Safe Network';
    }

    const elTotal = document.getElementById('stat-total-messages');
    const elSessions = document.getElementById('stat-active-sessions');
    const elSpeed = document.getElementById('stat-handshake-speed');
    const elHealth = document.getElementById('stat-system-health');

    if (window.QS_API && window.QS_API.isAuthenticated()) {
      try {
        const res = await window.QS_API.getStats();
        if (res.success && res.stats) {
          if (elTotal) elTotal.textContent = res.stats.totalMessages.toLocaleString();
          if (elSessions) elSessions.textContent = user ? '1' : '0';
          if (elSpeed) elSpeed.textContent = res.stats.handshakeSpeed || '< 1 ms';
          if (elHealth) elHealth.textContent = res.stats.quantumResistanceScore || 'Optimal';

          if (res.stats.totalMessages > 0 && window.QS_DATA?.chartData?.messagesVolume) {
            window.QS_DATA.chartData.hasData = true;
            window.QS_DATA.chartData.messagesVolume[window.QS_DATA.chartData.messagesVolume.length - 1] = res.stats.totalMessages;
            this.drawChart();
          }
          return;
        }
      } catch (e) {
        console.warn('Could not fetch server stats:', e);
      }
    }

    if (elTotal) elTotal.textContent = '0';
    if (elSessions) elSessions.textContent = user ? '1' : '0';
    if (elSpeed) elSpeed.textContent = '< 1 ms';
    if (elHealth) elHealth.textContent = 'Optimal';
  },

  initChart: function () {
    this.canvas = document.getElementById('dashboard-traffic-chart');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.drawChart();
  },

  drawChart: function () {
    if (!this.canvas || !this.ctx) return;
    const container = this.canvas.parentElement;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 260;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    const data = window.QS_DATA.chartData.messagesVolume;
    const labels = window.QS_DATA.chartData.labels;
    const hasData = data && data.some(v => v > 0);

    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Draw clean horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      if (hasData) {
        const maxVal = Math.max(...data) * 1.15;
        const val = Math.round(maxVal - (maxVal / gridLines) * i);
        ctx.fillStyle = '#64748B';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, paddingLeft - 8, y + 3);
      }
    }

    if (!hasData) {
      // High-tech clean telemetry baseline
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, height - paddingBottom);
      ctx.lineTo(width - paddingRight, height - paddingBottom);
      ctx.stroke();

      // Bottom X labels
      labels.forEach((label, idx) => {
        const step = chartW / (labels.length - 1);
        const x = paddingLeft + idx * step;
        ctx.fillStyle = '#64748B';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, height - 10);
      });

      // Standby Telemetry Indicator
      ctx.fillStyle = '#00D9FF';
      ctx.font = '600 12px var(--font-mono, monospace)';
      ctx.textAlign = 'center';
      ctx.fillText('• QUANTUM CHANNEL ACTIVE • ZERO TRANSIT LOSS • AWAITING PAYLOAD •', width / 2, height / 2 - 10);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillText('Live packet curves will graph in real-time as encrypted messages and files are transmitted.', width / 2, height / 2 + 14);
      return;
    }

    const maxVal = Math.max(...data) * 1.15;
    // Calculate points
    const points = [];
    const step = chartW / (data.length - 1);
    for (let i = 0; i < data.length; i++) {
      const x = paddingLeft + i * step;
      const y = paddingTop + chartH - (data[i] / maxVal) * chartH;
      points.push({ x, y, val: data[i], label: labels[i] });
    }

    // Area Gradient
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    gradient.addColorStop(0, 'rgba(0, 217, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 217, 255, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - paddingBottom);
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line Path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Data points & bottom labels
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#07111F';
      ctx.fill();
      ctx.strokeStyle = '#00E5B0';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, height - 10);
    });
  },

  renderAlgorithmBars: function () {
    const container = document.getElementById('dashboard-algo-bars');
    if (!container) return;

    const algos = window.QS_DATA.chartData.algorithms;
    container.innerHTML = algos.map(item => `
      <div class="algo-split-item">
        <div class="algo-split-info">
          <span class="algo-split-name">${item.name}</span>
          <span class="algo-split-percent" style="color: ${item.color};">${item.percentage}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${item.percentage}%; background-color: ${item.color};"></div>
        </div>
      </div>
    `).join('');
  },

  renderRecentActivity: function () {
    const container = document.getElementById('dashboard-recent-activity');
    if (!container) return;

    const logs = window.QS_DATA.logs ? window.QS_DATA.logs.slice(0, 4) : [];
    if (logs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 0.88rem;">
          <div style="color: var(--accent-cyan); margin-bottom: 0.5rem;"><i data-lucide="shield-check" data-size="28"></i></div>
          <p style="color: var(--text-white); font-weight: 500; margin-bottom: 0.25rem;">Live Audit Trail Initialized</p>
          <p style="font-size: 0.82rem;">Authentication handshakes, key updates, and message logs will appear here in real-time.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons(container);
      return;
    }

    container.innerHTML = logs.map(log => `
      <div class="activity-item">
        <div class="activity-icon-wrap" style="background: rgba(0, 217, 255, 0.1); color: var(--accent-cyan);">
          <i data-lucide="${log.category === 'CRYPTOGRAPHY' ? 'cpu' : log.category === 'FILE' ? 'file' : log.category === 'AUTH' ? 'shield-check' : 'lock'}" data-size="16"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title-row">
            <span class="activity-title">${log.event}</span>
            <span class="activity-time">${log.timestamp ? (log.timestamp.includes(' ') ? log.timestamp.split(' ')[1] : log.timestamp) : ''}</span>
          </div>
          <p class="activity-desc">${log.details}</p>
        </div>
        <span class="badge ${log.badgeClass || 'badge-teal'}">${log.status}</span>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons(container);
  },
  },

  bindQuickActions: function () {
    const btnNewChat = document.getElementById('action-new-chat');
    const btnShareFile = document.getElementById('action-share-file');
    const btnGenKey = document.getElementById('action-gen-key');
    const btnViewLogs = document.getElementById('action-view-logs');

    if (btnNewChat) {
      btnNewChat.addEventListener('click', () => window.QS_ROUTER.navigate('chat'));
    }
    if (btnShareFile) {
      btnShareFile.addEventListener('click', () => window.QS_ROUTER.navigate('files'));
    }
    if (btnGenKey) {
      btnGenKey.addEventListener('click', () => {
        window.QS_ROUTER.navigate('security');
        setTimeout(() => {
          if (window.QS_SECURITY && window.QS_SECURITY.triggerKeyGeneration) {
            window.QS_SECURITY.triggerKeyGeneration();
          }
        }, 200);
      });
    }
    if (btnViewLogs) {
      btnViewLogs.addEventListener('click', () => window.QS_ROUTER.navigate('logs'));
    }
  }
};
