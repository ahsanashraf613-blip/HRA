/* =============================================================
   HRA ACCOUNTANT – MAIN JAVASCRIPT (PERFORMANCE FIXES)
   ============================================================= */
(function () {
  'use strict';

  const chk = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

  let particleAnimId = null;
  let particlesInitialised = false;
  let canvasResizeHandler, canvasMouseMoveHandler, heroMouseLeaveHandler;
  const pageCache = {};
  const serviceCache = {};
  let revealObserver = null;
  let heroImageStrip = null;
  let navTimeout = null;

  function safeNavigate(target) {
    if (navTimeout) return;
    navTimeout = setTimeout(() => { navTimeout = null; }, 300);
    if (target.startsWith('service:')) {
      showServicePage(target.split(':')[1]);
    } else {
      showPage(target);
    }
  }
  window.safeNavigate = safeNavigate;

  /* ---------- OPTIMIZED PARTICLES + 3D TILT (no forced reflow) ---------- */
  function initParticles() {
    if (particlesInitialised) return;
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [], mouse = { x: -999, y: -999 };
    heroImageStrip = document.querySelector('.hero-image-strip');
    const hero = canvas.closest('.hero');
    if (hero) {
      heroMouseLeaveHandler = () => {
        if (heroImageStrip) heroImageStrip.style.transform = 'translateY(-50%) rotateX(0deg) rotateY(0deg)';
      };
      hero.addEventListener('mouseleave', heroMouseLeaveHandler);
    }

    function resize() {
      const parent = canvas.parentElement;
      const newW = parent.offsetWidth;
      const newH = parent.offsetHeight;
      if (newW !== W || newH !== H) {
        W = newW;
        H = newH;
        canvas.width = W;
        canvas.height = H;
      }
    }
    resize();
    canvasResizeHandler = resize;
    window.addEventListener('resize', () => requestAnimationFrame(resize));

    if (hero) {
      let tiltPending = false;
      canvasMouseMoveHandler = e => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
        if (!tiltPending) {
          tiltPending = true;
          requestAnimationFrame(() => {
            if (heroImageStrip && W && H) {
              const xPercent = (mouse.x / W) - 0.5;
              const yPercent = (mouse.y / H) - 0.5;
              const maxAngle = 12;
              heroImageStrip.style.transform = `translateY(-50%) rotateX(${yPercent * -maxAngle}deg) rotateY(${xPercent * maxAngle}deg)`;
            }
            tiltPending = false;
          });
        }
      };
      hero.addEventListener('mousemove', canvasMouseMoveHandler, { passive: true });
    }

    const count = window.innerWidth < 600 ? 50 : 150;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * (W || 1400), y: Math.random() * (H || 900),
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5, a: Math.random() * 0.5 + 0.2
      });
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) { p.x += dx / dist * 1.2; p.y += dy / dist * 1.2; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,211,160,${p.a})`; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 160) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(34,211,160,${0.15 * (1 - d / 160)})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      particleAnimId = requestAnimationFrame(draw);
    }
    draw();
    particlesInitialised = true;
  }

  function stopParticles() {
    if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null; }
    if (canvasResizeHandler) { window.removeEventListener('resize', canvasResizeHandler); canvasResizeHandler = null; }
    if (canvasMouseMoveHandler) {
      const hero = document.querySelector('.hero');
      if (hero) hero.removeEventListener('mousemove', canvasMouseMoveHandler);
      canvasMouseMoveHandler = null;
    }
    if (heroMouseLeaveHandler) {
      const hero = document.querySelector('.hero');
      if (hero) hero.removeEventListener('mouseleave', heroMouseLeaveHandler);
      heroMouseLeaveHandler = null;
    }
    if (heroImageStrip) heroImageStrip.style.transform = 'translateY(-50%) rotateX(0deg) rotateY(0deg)';
    particlesInitialised = false;
  }

  // … (rest of the code unchanged, including serviceData, buildServiceHTML, pageContent, routing, forms, etc.)

  /* ---------- PAGE CONTENT STRINGS (HEADING HIERARCHY FIXED) ---------- */
  const pageContent = {
    home: `<section class="hero"><canvas id="particle-canvas"></canvas><div class="hero-glow"></div><div class="hero-grid"></div><div class="hero-ring"></div><div class="hero-ring2"></div><div class="hero-image-strip"><div class="hero-img-item"><img src="assets/images/hero accounting.avif" alt="Accounting" fetchpriority="high" decoding="async"></div><div class="hero-img-item"><img src="assets/images/hero analytics.avif" alt="Analytics" fetchpriority="high" decoding="async"></div><div class="hero-img-item"><img src="assets/images/hero dublin.avif" alt="Dublin" fetchpriority="high" decoding="async"></div></div><div class="hero-inner"><div class="hero-badge">Chartered Accountants Ireland</div><h1>Accounting & Tax that <em>Works for You</em>, Not Against You.</h1><p>Register your Irish limited company in 3 days. Full compliance, fixed fees, and a dedicated accountant who actually picks up the phone.</p><div class="hero-actions"><button class="btn-primary-lg" onclick="safeNavigate('register')">Register a Company →</button><button class="btn-outline-lg" onclick="safeNavigate('contact')">Free Consultation</button></div><div class="hero-stats"><div class="stat-item"><span class="stat-num">3</span><span class="stat-label">Days to incorporate</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-num">100%</span><span class="stat-label">Revenue compliant</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-num">€0</span><span class="stat-label">Hidden fees</span></div></div></div></section><div class="trust-bar"><div class="marquee-track">…</div></div><section style="background:var(--bg2)">…<div class="how-steps"><div class="how-step"><div class="step-num">1</div><div class="step-body"><h3>Check Your Company Name</h3><p>We run a direct check with the CRO to confirm your name is available.</p></div></div>…</section>…<section style="background:var(--bg2)"><div class="why-grid"><div class="why-card"><div class="why-icon">💶</div><h3>Fixed Fee Pricing</h3><p>Clear, upfront pricing with no hidden costs — certainty from day one.</p></div>…</div></section>…`,
    about: `…`,
    contact: `…`,
    register: `…`,
    privacy: `…`
  };

  /* ---------- ROUTING, MOBILE NAV, FAQ, FORMS UNCHANGED ---------- */
  // … (same as before)

})();
