/**
 * QUANTUM-SAFE Client-Side Router
 * Handles hash-based routing between landing, authentication, and SaaS application views.
 */

window.QS_ROUTER = {
  currentRoute: '',

  routes: {
    'landing': { title: 'QUANTUM-SAFE | Post-Quantum Secure Communication System', isApp: false },
    'login': { title: 'Login | QUANTUM-SAFE', isApp: false },
    'register': { title: 'Create Account | QUANTUM-SAFE', isApp: false },
    'dashboard': { title: 'Security Dashboard | QUANTUM-SAFE', isApp: true, pageTitle: 'Main Dashboard', breadcrumb: 'Overview' },
    'chat': { title: 'Secure Chat | QUANTUM-SAFE', isApp: true, pageTitle: 'Secure Messaging', breadcrumb: 'End-to-End PQC Tunnels' },
    'security': { title: 'Cryptographic Core | QUANTUM-SAFE', isApp: true, pageTitle: 'Security Engine', breadcrumb: 'ML-KEM & AES-256-GCM Pipeline' },
    'files': { title: 'Encrypted File Sharing | QUANTUM-SAFE', isApp: true, pageTitle: 'File Vault', breadcrumb: 'Quantum-Encrypted Payloads' },
    'logs': { title: 'Security Audit Logs | QUANTUM-SAFE', isApp: true, pageTitle: 'Audit Trail', breadcrumb: 'Tamper-Evident Security Events' },
    'settings': { title: 'System Settings | QUANTUM-SAFE', isApp: true, pageTitle: 'Settings & Identity', breadcrumb: 'PQC Parameters & Profile' }
  },

  init: function () {
    window.addEventListener('hashchange', () => this.handleRoute());

    // Intercept all hash-based navigation links for instant, reliable transitions
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#/"]');
      if (link) {
        // If the link is marked target="_blank" or clicked with cmd/ctrl, open in new tab with full route
        if (link.getAttribute('target') === '_blank' || e.metaKey || e.ctrlKey) {
          e.preventDefault();
          const href = link.getAttribute('href');
          const targetRoute = href.replace(/^#\/?/, '').split('?')[0].toLowerCase();
          const fullUrl = `${window.location.origin}${window.location.pathname}#/${targetRoute}`;
          window.open(fullUrl, '_blank', 'noopener,noreferrer');
          return;
        }

        const href = link.getAttribute('href');
        const targetRoute = href.replace(/^#\/?/, '').split('?')[0].toLowerCase();
        if (targetRoute && this.routes[targetRoute]) {
          e.preventDefault();
          this.navigate(targetRoute);
        }
      }
    });

    // Default route handling
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.location.hash = '#/landing';
    }
    this.handleRoute();
  },

  navigate: function (route) {
    window.location.hash = `#/${route}`;
    this.handleRoute();
  },

  handleRoute: function () {
    const rawHash = window.location.hash.replace(/^#\/?/, '') || 'landing';
    const cleanRoute = rawHash.split('?')[0].toLowerCase();
    const routeConfig = this.routes[cleanRoute] || this.routes['landing'];
    const activeRouteKey = this.routes[cleanRoute] ? cleanRoute : 'landing';

    this.currentRoute = activeRouteKey;
    document.title = routeConfig.title;

    // Authentication Route Guards for protected SaaS workspace views
    const isAuthenticated = window.QS_API ? window.QS_API.isAuthenticated() : Boolean(window.QS_DATA?.currentUser);

    if (routeConfig.isApp && !isAuthenticated) {
      if (window.QS_APP && typeof window.QS_APP.showToast === 'function') {
        window.QS_APP.showToast({
          title: 'Authentication Required',
          message: 'Please authenticate with your master credentials to enter secure channels.',
          type: 'warning'
        });
      }
      this.navigate('login');
      return;
    }

    // View containers
    const landingView = document.getElementById('view-landing');
    const loginView = document.getElementById('view-login');
    const registerView = document.getElementById('view-register');
    const appShell = document.getElementById('app-shell');

    // Hide all primary standalone views
    if (landingView) {
      landingView.classList.remove('active');
      landingView.style.display = 'none';
    }
    if (loginView) {
      loginView.classList.remove('active');
      loginView.style.display = 'none';
    }
    if (registerView) {
      registerView.classList.remove('active');
      registerView.style.display = 'none';
    }
    if (appShell) {
      appShell.style.display = 'none';
    }

    // Hide all internal app views
    document.querySelectorAll('.app-sub-view').forEach(v => v.classList.remove('active'));

    if (activeRouteKey === 'landing') {
      if (landingView) {
        landingView.classList.add('active');
        landingView.style.display = 'block';
      }
      window.scrollTo(0, 0);
    } else if (activeRouteKey === 'login') {
      if (loginView) {
        loginView.classList.add('active');
        loginView.style.display = 'block';
      }
      window.scrollTo(0, 0);
    } else if (activeRouteKey === 'register') {
      if (registerView) {
        registerView.classList.add('active');
        registerView.style.display = 'block';
      }
      window.scrollTo(0, 0);
    } else if (routeConfig.isApp) {
      if (appShell) appShell.style.display = 'flex';
      const targetSubView = document.getElementById(`view-${activeRouteKey}`);
      if (targetSubView) {
        targetSubView.classList.add('active');
      }

      // Update header titles
      const pageTitleEl = document.getElementById('app-header-title');
      const pageBreadcrumbEl = document.getElementById('app-header-breadcrumb');
      if (pageTitleEl) pageTitleEl.textContent = routeConfig.pageTitle || 'Quantum-Safe';
      if (pageBreadcrumbEl) pageBreadcrumbEl.textContent = routeConfig.breadcrumb || 'Dashboard';

      // Update sidebar nav highlighting
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-route') === activeRouteKey) {
          item.classList.add('active');
        }
      });

      // Close mobile drawer on navigation
      const sidebar = document.querySelector('.app-sidebar');
      const backdrop = document.querySelector('.sidebar-backdrop');
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');

      // Dispatch route change event for page-specific controllers
      window.dispatchEvent(new CustomEvent('qs:route-changed', { detail: { route: activeRouteKey } }));
      window.scrollTo(0, 0);
    }

    // Refresh icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      setTimeout(() => window.lucide.createIcons(), 20);
    }
  }
};
