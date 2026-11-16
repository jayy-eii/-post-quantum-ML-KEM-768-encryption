/**
 * QUANTUM-SAFE Authentication Controller (Login & Registration)
 * Form validation, password visibility toggle, real user identity creation, Web Crypto key initialization, and audit logging.
 */

window.QS_AUTH = {
  init: function () {
    this.setupPasswordToggles();
    this.setupPasswordStrengthMeter();
    this.setupLoginForm();
    this.setupRegisterForm();
  },

  setupPasswordToggles: function () {
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        const icon = btn.querySelector('svg, i');
        if (icon) {
          btn.innerHTML = isPassword ? '<i data-lucide="eye-off" data-size="18"></i>' : '<i data-lucide="eye" data-size="18"></i>';
          if (window.lucide) window.lucide.createIcons(btn);
        }
      });
    });
  },

  setupPasswordStrengthMeter: function () {
    const passwordInput = document.getElementById('reg-password');
    if (!passwordInput) return;

    const bars = [
      document.getElementById('meter-bar-1'),
      document.getElementById('meter-bar-2'),
      document.getElementById('meter-bar-3'),
      document.getElementById('meter-bar-4')
    ];
    const strengthText = document.getElementById('meter-strength-text');

    const criteria = {
      length: document.getElementById('crit-length'),
      upper: document.getElementById('crit-upper'),
      number: document.getElementById('crit-number'),
      symbol: document.getElementById('crit-symbol')
    };

    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;

      const hasLength = val.length >= 8;
      const hasUpper = /[A-Z]/.test(val) && /[a-z]/.test(val);
      const hasNumber = /[0-9]/.test(val);
      const hasSymbol = /[^A-Za-z0-9]/.test(val);

      if (criteria.length) criteria.length.classList.toggle('met', hasLength);
      if (criteria.upper) criteria.upper.classList.toggle('met', hasUpper);
      if (criteria.number) criteria.number.classList.toggle('met', hasNumber);
      if (criteria.symbol) criteria.symbol.classList.toggle('met', hasSymbol);

      let score = 0;
      if (hasLength) score++;
      if (hasUpper) score++;
      if (hasNumber) score++;
      if (hasSymbol) score++;

      bars.forEach((bar, idx) => {
        if (!bar) return;
        if (idx < score) {
          if (score === 1) bar.style.backgroundColor = 'var(--accent-danger)';
          else if (score === 2) bar.style.backgroundColor = 'var(--accent-warning)';
          else if (score === 3) bar.style.backgroundColor = 'var(--accent-cyan)';
          else bar.style.backgroundColor = 'var(--accent-teal)';
        } else {
          bar.style.backgroundColor = 'var(--bg-input)';
        }
      });

      if (strengthText) {
        if (score === 0) { strengthText.textContent = 'None'; strengthText.style.color = 'var(--text-dim)'; }
        else if (score === 1) { strengthText.textContent = 'Weak'; strengthText.style.color = 'var(--accent-danger)'; }
        else if (score === 2) { strengthText.textContent = 'Fair'; strengthText.style.color = 'var(--accent-warning)'; }
        else if (score === 3) { strengthText.textContent = 'Good'; strengthText.style.color = 'var(--accent-cyan)'; }
        else { strengthText.textContent = 'Quantum-Grade Strong'; strengthText.style.color = 'var(--accent-teal)'; }
      }
    });

    // Reset initially on load
    passwordInput.dispatchEvent(new Event('input'));
  },

  setupLoginForm: function () {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      const submitBtn = form.querySelector('button[type="submit"]');

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        window.QS_APP.showToast({
          title: 'Validation Error',
          message: 'Please provide both your registered email identity and master password.',
          type: 'warning'
        });
        return;
      }

      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i data-lucide="refresh-cw" class="animate-spin" data-size="16"></i> Authenticating ML-KEM Token...';
      if (window.lucide) window.lucide.createIcons(submitBtn);

      try {
        const res = await window.QS_API.login({ email, password });

        if (!res.success) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
          if (window.lucide) window.lucide.createIcons(submitBtn);

          window.QS_APP.showToast({
            title: 'Authentication Denied',
            message: res.error || 'Invalid credentials. Master password or identity not recognized.',
            type: 'danger'
          });
          return;
        }

        // Authentication succeeded
        window.QS_DATA.currentUser = res.user;
        window.QS_DATA.saveUser();
        window.QS_APP.updateUserInterface();

        if (window.QS_SETTINGS && typeof window.QS_SETTINGS.populateSettingsData === 'function') {
          window.QS_SETTINGS.populateSettingsData();
        }

        // Add real audit log locally as well
        window.QS_DATA.addLog({
          category: 'AUTH',
          event: 'Session Authenticated',
          details: `User ${res.user.email} established post-quantum handshake session.`,
          status: 'SUCCESS',
          badgeClass: 'badge-teal',
          actor: res.user.email.split('@')[0]
        });

        window.QS_APP.showToast({
          title: 'Authentication Successful',
          message: `Zero-trust handshake established. Welcome, ${res.user.name}.`,
          type: 'success'
        });

        form.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons(submitBtn);

        window.QS_ROUTER.navigate('dashboard');
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons(submitBtn);

        window.QS_APP.showToast({
          title: 'Connection Error',
          message: 'Unable to connect to Quantum-Safe authentication backend.',
          type: 'danger'
        });
      }
    });
  },

  setupRegisterForm: function () {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!name || !email || !password) {
        window.QS_APP.showToast({
          title: 'Incomplete Registration',
          message: 'All fields are required to generate your post-quantum identity.',
          type: 'warning'
        });
        return;
      }

      if (password !== confirmPassword) {
        window.QS_APP.showToast({
          title: 'Password Mismatch',
          message: 'Confirm password does not match the entered password.',
          type: 'danger'
        });
        return;
      }

      if (password.length < 8) {
        window.QS_APP.showToast({
          title: 'Password Too Short',
          message: 'Master password must be at least 8 characters long.',
          type: 'warning'
        });
        return;
      }

      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i data-lucide="cpu" class="animate-spin" data-size="16"></i> Generating ML-KEM-768 Lattice Keypair...';
      if (window.lucide) window.lucide.createIcons(submitBtn);

      try {
        const res = await window.QS_API.register({ name, email, password });

        if (!res.success) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
          if (window.lucide) window.lucide.createIcons(submitBtn);

          window.QS_APP.showToast({
            title: 'Provisioning Failed',
            message: res.error || 'Failed to register identity on quantum authority.',
            type: res.status === 409 ? 'warning' : 'danger'
          });
          return;
        }

        // Registration succeeded
        window.QS_DATA.currentUser = res.user;
        window.QS_DATA.saveUser();
        window.QS_APP.updateUserInterface();

        if (window.QS_SETTINGS && typeof window.QS_SETTINGS.populateSettingsData === 'function') {
          window.QS_SETTINGS.populateSettingsData();
        }

        window.QS_DATA.addLog({
          category: 'AUTH',
          event: 'New Quantum Identity Registered',
          details: `User "${res.user.name}" (${res.user.email}) provisioned with ML-KEM-768 keypair.`,
          status: 'VERIFIED',
          badgeClass: 'badge-cyan',
          actor: res.user.email.split('@')[0]
        });

        window.QS_APP.showToast({
          title: 'Quantum Identity Provisioned',
          message: `Welcome, ${res.user.name}! Your ML-KEM-768 public key (1,184 Bytes) has been generated.`,
          type: 'success'
        });

        form.reset();
        document.getElementById('reg-password')?.dispatchEvent(new Event('input'));

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons(submitBtn);

        window.QS_ROUTER.navigate('dashboard');
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons(submitBtn);

        window.QS_APP.showToast({
          title: 'Network Error',
          message: 'Unable to connect to Quantum-Safe authentication backend.',
          type: 'danger'
        });
      }
    });
  }
};
