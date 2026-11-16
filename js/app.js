/**
 * QUANTUM-SAFE Core App Orchestrator
 * Toast notifications, modals, UI interactions, and mobile drawer handling.
 */

window.QS_APP = {
  init: async function () {
    this.setupSidebarDrawer();
    this.setupModals();
    this.bindGlobalEvents();

    // Verify session state against backend
    if (window.QS_API && window.QS_API.isAuthenticated()) {
      try {
        const profileRes = await window.QS_API.getProfile();
        if (profileRes.success && profileRes.user) {
          window.QS_DATA.currentUser = profileRes.user;
          window.QS_DATA.saveUser();
        } else {
          window.QS_API.clearSession();
          if (window.QS_DATA) window.QS_DATA.currentUser = null;
        }
      } catch (err) {
        console.warn('Backend sync error:', err);
      }
    } else {
      if (window.QS_DATA) window.QS_DATA.currentUser = null;
    }

    this.updateUserInterface();
  },

  updateUserInterface: function () {
    const user = window.QS_DATA?.currentUser;
    const avatarEl = document.getElementById('header-user-avatar');
    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');
    const welcomeNameEl = document.getElementById('dashboard-welcome-name');
    const welcomeOrgEl = document.getElementById('dashboard-welcome-org');

    if (user) {
      if (avatarEl) avatarEl.textContent = user.avatarInitials || 'QS';
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) roleEl.textContent = user.role;
      if (welcomeNameEl) welcomeNameEl.textContent = user.name;
      if (welcomeOrgEl) welcomeOrgEl.textContent = user.organization;
    } else {
      if (avatarEl) avatarEl.textContent = '--';
      if (nameEl) nameEl.textContent = 'Not Authenticated';
      if (roleEl) roleEl.textContent = 'Guest Session';
      if (welcomeNameEl) welcomeNameEl.textContent = 'Guest';
      if (welcomeOrgEl) welcomeOrgEl.textContent = 'Unauthenticated';
    }
  },

  setupSidebarDrawer: function () {
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.app-sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('active');
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }
  },

  setupModals: function () {
    // Close modal on click of close buttons or overlay background
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('.modal-close-trigger')) {
          modal.classList.remove('active');
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });
  },

  openModal: function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      if (window.lucide) window.lucide.createIcons(modal);
    }
  },

  closeModal: function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  showToast: function ({ title = 'Security Notice', message = '', type = 'info', duration = 4000 }) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    let iconColor = 'var(--accent-cyan)';
    if (type === 'success') {
      iconName = 'check-circle';
      iconColor = 'var(--accent-teal)';
    } else if (type === 'warning') {
      iconName = 'alert-triangle';
      iconColor = 'var(--accent-warning)';
    } else if (type === 'danger') {
      iconName = 'shield-alert';
      iconColor = 'var(--accent-danger)';
    }

    toast.innerHTML = `
      <div class="toast-icon" style="color: ${iconColor};">
        <i data-lucide="${iconName}" data-size="18"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close Notification">
        <i data-lucide="x" data-size="14"></i>
      </button>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    };

    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
  },

  bindGlobalEvents: function () {
    // Header security pill click opens crypto details modal
    const cryptoPill = document.getElementById('header-crypto-pill');
    if (cryptoPill) {
      cryptoPill.addEventListener('click', () => {
        this.openModal('modal-crypto-info');
      });
    }

    // System status modal trigger
    document.addEventListener('click', (e) => {
      const statusTrigger = e.target.closest('.system-status-trigger, .demo-info-trigger');
      if (statusTrigger) {
        this.openModal('modal-crypto-info');
      }
    });

    // Logout session
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (window.QS_API) {
          await window.QS_API.logout();
        }
        if (window.QS_DATA) {
          window.QS_DATA.currentUser = null;
          window.QS_DATA.saveUser();
        }
        this.updateUserInterface();
        this.showToast({
          title: 'Session Terminated',
          message: 'All ephemeral post-quantum key buffers purged from memory.',
          type: 'info'
        });
        setTimeout(() => {
          window.QS_ROUTER.navigate('landing');
        }, 400);
      });
    }
  }
};
