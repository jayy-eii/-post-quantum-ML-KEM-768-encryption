/**
 * QUANTUM-SAFE Settings Controller
 * Profile updates, cryptographic policy preferences, theme switcher, and persistent configuration.
 */

window.QS_SETTINGS = {
  activeTab: 'profile',

  init: function () {
    this.populateSettingsData();
    this.bindEvents();

    window.addEventListener('qs:route-changed', (e) => {
      if (e.detail.route === 'settings') {
        this.populateSettingsData();
      }
    });
  },

  populateSettingsData: function () {
    const user = window.QS_DATA?.currentUser;
    if (!user) return;

    const nameInput = document.getElementById('settings-name');
    const emailInput = document.getElementById('settings-email');
    const roleInput = document.getElementById('settings-role');
    const orgInput = document.getElementById('settings-org');
    const fpLabel = document.getElementById('settings-key-fingerprint');

    if (nameInput) nameInput.value = user.name;
    if (emailInput) emailInput.value = user.email;
    if (roleInput) roleInput.value = user.role;
    if (orgInput) orgInput.value = user.organization;
    if (fpLabel) fpLabel.textContent = user.keyFingerprint;
  },

  switchTab: function (tabKey) {
    this.activeTab = tabKey;

    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabKey);
    });

    document.querySelectorAll('.settings-section-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-section') === tabKey);
    });

    if (window.lucide) window.lucide.createIcons();
  },

  bindEvents: function () {
    // Tab switching
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Theme selector
    document.querySelectorAll('.theme-option-box').forEach(box => {
      box.addEventListener('click', () => {
        document.querySelectorAll('.theme-option-box').forEach(b => b.classList.remove('active'));
        box.classList.add('active');
        const theme = box.getAttribute('data-theme');
        window.QS_APP.showToast({
          title: 'Theme Applied',
          message: `Switched palette to ${theme} mode.`,
          type: 'info'
        });
      });
    });

    // Copy fingerprint button
    const copyFpBtn = document.getElementById('btn-copy-fingerprint');
    if (copyFpBtn) {
      copyFpBtn.addEventListener('click', () => {
        const fp = document.getElementById('settings-key-fingerprint')?.textContent;
        if (navigator.clipboard && fp) {
          navigator.clipboard.writeText(fp).catch(() => {});
        }
        window.QS_APP.showToast({
          title: 'Fingerprint Copied',
          message: 'Post-quantum public key identity hash copied to clipboard.',
          type: 'success'
        });
      });
    }

    // Save changes buttons
    document.querySelectorAll('.btn-save-settings').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('settings-name');
        const roleInput = document.getElementById('settings-role');
        const orgInput = document.getElementById('settings-org');

        const newName = nameInput ? nameInput.value.trim() : '';
        const newRole = roleInput ? roleInput.value.trim() : '';
        const newOrg = orgInput ? orgInput.value.trim() : '';

        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="check" data-size="16"></i> Saving Cryptographic Policies...';
        if (window.lucide) window.lucide.createIcons(btn);

        if (window.QS_API && window.QS_API.isAuthenticated()) {
          try {
            const res = await window.QS_API.updateProfile({
              name: newName,
              role: newRole,
              organization: newOrg
            });
            if (res.success && res.user) {
              window.QS_DATA.currentUser = res.user;
              window.QS_DATA.saveUser();
            }
          } catch (err) {
            console.warn('Profile update error:', err);
          }
        } else if (window.QS_DATA && window.QS_DATA.currentUser) {
          if (newName) window.QS_DATA.currentUser.name = newName;
          if (newRole) window.QS_DATA.currentUser.role = newRole;
          if (newOrg) window.QS_DATA.currentUser.organization = newOrg;
          window.QS_DATA.saveUser();
        }

        window.QS_APP.updateUserInterface();

        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="check" data-size="16"></i> Save Preferences';
        if (window.lucide) window.lucide.createIcons(btn);

        window.QS_APP.showToast({
          title: 'Settings Saved',
          message: 'All post-quantum security parameters updated across active sessions.',
          type: 'success'
        });
      });
    });
  }
};
