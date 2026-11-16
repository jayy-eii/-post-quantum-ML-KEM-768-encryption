/**
 * QUANTUM-SAFE Landing Page Controller
 * Canvas particle lattice animation and landing page interactions.
 */

window.QS_LANDING = {
  canvas: null,
  ctx: null,
  particles: [],
  animationFrameId: null,

  init: function () {
    this.initCanvas();
    this.bindEvents();
  },

  initCanvas: function () {
    this.canvas = document.getElementById('quantum-lattice-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const resize = () => {
      const container = this.canvas.parentElement;
      if (!container) return;
      this.canvas.width = container.clientWidth || 420;
      this.canvas.height = container.clientHeight || 420;
      this.createParticles();
    };

    window.addEventListener('resize', resize);
    resize();
    this.animate();
  },

  createParticles: function () {
    this.particles = [];
    const count = 32;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.75,
        vy: (Math.random() - 0.5) * 0.75,
        radius: Math.random() * 2 + 1.5,
        color: Math.random() > 0.4 ? '#00D9FF' : '#00E5B0'
      });
    }
  },

  animate: function () {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.clearRect(0, 0, w, h);

    // Draw connecting lattice vectors
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 85) {
          const alpha = (1 - dist / 85) * 0.35;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(0, 217, 255, ${alpha})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    }

    // Draw and move nodes
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  },

  bindEvents: function () {
    // "Explore Security" button smooth scrolls or navigates
    const exploreBtn = document.getElementById('hero-explore-btn');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const techSection = document.getElementById('landing-tech-overview');
        if (techSection) {
          techSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }
};
