/* =============================================================
   HRA ACCOUNTANT – MAIN JAVASCRIPT (FULLY WORKING)
   ============================================================= */
(function () {
  'use strict';

  /* ---------- CUSTOM SMOOTH SCROLL (smooth & slow, no stutter) ---------- */
  const LERP_FACTOR = 1;   // lower = slower/premium feel (0.05–0.15)
  let targetScrollY = window.scrollY;
  let animating = false;

  function updateTarget(deltaY) {
    targetScrollY += deltaY;
    targetScrollY = Math.max(0, Math.min(targetScrollY, document.documentElement.scrollHeight - window.innerHeight));
    if (!animating) {
      animating = true;
      requestAnimationFrame(animateScroll);
    }
  }

  function animateScroll() {
    const current = window.scrollY;
    const diff = targetScrollY - current;
    if (Math.abs(diff) < 0.5) {
      window.scrollTo(0, targetScrollY);
      animating = false;
      return;
    }
    window.scrollTo(0, current + diff * LERP_FACTOR);
    requestAnimationFrame(animateScroll);
  }

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    updateTarget(e.deltaY);
  }, { passive: false });

  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const deltaY = touchStartY - e.touches[0].clientY;
    touchStartY = e.touches[0].clientY;
    updateTarget(deltaY);
  }, { passive: false });

  /* ---------- SVG CHECKMARK ---------- */
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

  /* ---------- OPTIMIZED PARTICLES + 3D TILT (NO FORCED REFLOW) ---------- */
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

    function readLayout() {
      const parent = canvas.parentElement;
      const newW = parent.offsetWidth;
      const newH = parent.offsetHeight;
      return { newW, newH };
    }

    function applyResize(newW, newH) {
      if (newW !== W || newH !== H) {
        W = newW;
        H = newH;
        canvas.width = W;
        canvas.height = H;
        return true;
      }
      return false;
    }

    function resize() {
      const dims = readLayout();
      applyResize(dims.newW, dims.newH);
    }
    resize();
    canvasResizeHandler = resize;
    window.addEventListener('resize', () => requestAnimationFrame(resize));

    if (hero) {
      let tiltPending = false;
      let lastMouseX = -999, lastMouseY = -999;
      canvasMouseMoveHandler = e => {
        const r = canvas.getBoundingClientRect();
        lastMouseX = e.clientX - r.left;
        lastMouseY = e.clientY - r.top;
        if (!tiltPending) {
          tiltPending = true;
          requestAnimationFrame(() => {
            if (heroImageStrip && W && H) {
              const xPercent = (lastMouseX / W) - 0.5;
              const yPercent = (lastMouseY / H) - 0.5;
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

  window.addEventListener('scroll', () => {
    const s = window.scrollY, m = document.documentElement.scrollHeight - window.innerHeight;
    document.getElementById('scroll-progress').style.width = (s / m * 100) + '%';
    document.getElementById('mainNav').classList.toggle('scrolled', s > 40);
  }, { passive: true });

  function initReveal() {
    if (revealObserver) revealObserver.disconnect();
    const els = document.querySelectorAll('.page.active [data-reveal]');
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('revealed'), 80 * i);
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => revealObserver.observe(el));
  }

  (function setupDropdown() {
    const dropdownBtn = document.querySelector('.dropdown button');
    const dropdown = document.getElementById('dropdownNav');
    if (!dropdownBtn || !dropdown) return;
    function open() { dropdown.classList.add('open'); dropdownBtn.setAttribute('aria-expanded', 'true'); }
    function close() { dropdown.classList.remove('open'); dropdownBtn.setAttribute('aria-expanded', 'false'); }
    dropdown.addEventListener('mouseenter', open);
    dropdown.addEventListener('mouseleave', close);
    dropdownBtn.addEventListener('focus', open);
    dropdownBtn.addEventListener('blur', e => { if (!dropdown.contains(e.relatedTarget)) close(); });
    dropdownBtn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.contains('open') ? close() : open(); });
    document.addEventListener('click', () => { if (dropdown.classList.contains('open')) close(); });
  })();

  const serviceData = {
    'accounting-bookkeeping': { label:'Accounting + Bookkeeping', icon:'📒', title:'Accounting + Bookkeeping', intro:'Complete, end‑to‑end accounting and bookkeeping service designed for contractors and small businesses at a fixed monthly fee.', blocks:[{title:'Company Registration Package',desc:'Complete company formation included.',items:['Company formed in 3 business days','Certificate of Incorporation','Company Constitution','Share Certificates']},{title:'Ongoing Bookkeeping',desc:'Day‑to‑day financial record‑keeping.',items:['Recording all financial transactions','Bank and credit card reconciliations','Up to 10 transactions per month']},{title:'VAT Returns Management',desc:'Bi‑monthly VAT returns.',items:['Bi‑monthly VAT return preparation','Input and output VAT reconciliation','ROS filing']},{title:'Director Payroll',desc:'Monthly payroll and PAYE obligations.',items:['Monthly Director Payroll processing','PAYE, PRSI, and USC calculations','Payslip generation']},{title:'Annual Accounts & Tax Returns',desc:'Full year‑end accounting.',items:['CRO B1 Annual Return','Annual Financial Statements','Corporation Tax Returns','Director Income Tax Return']},{title:'Registered Address & Secretary',desc:'Statutory services included.',items:['Dublin registered address','Mail handling','Nominee Company Secretary']}] },
    accounts: { label:'Accounts', icon:'📊', title:'Accounts & Bookkeeping Services', intro:'Comprehensive accounting services designed to keep your business compliant, financially organised, and positioned for long‑term growth.', blocks:[{title:'Statutory Accounts',desc:'Full compliance with Irish laws.',items:['Annual statutory financial statements','Irish GAAP compliance','Clear presentation for Revenue']},{title:'Management Accounts',desc:'Regular financial reports.',items:['Monthly or quarterly reports','Profit and loss analysis','Cash flow monitoring']},{title:'Bookkeeping',desc:'Reliable record keeping.',items:['Day‑to‑day financial transactions','Bank reconciliations','Sales and purchase ledger management']},{title:'Audit',desc:'Independent audit services.',items:['Statutory and regulatory compliance','Independent verification of financial statements']}] },
    taxation: { label:'Taxation', icon:'🧾', title:'Taxation Services', intro:'Expert tax services designed to optimise your financial position while ensuring full compliance with Irish tax laws.', blocks:[{title:'Tax Returns',desc:'Accurate tax returns for individuals and businesses.',items:['Personal income tax returns (Form 11)','Corporation tax returns (CT1)','Timely submission to Revenue']},{title:'VAT',desc:'Comprehensive VAT services.',items:['VAT registration','Bi‑monthly VAT return preparation','VAT reconciliation']},{title:'Payroll',desc:'Accurate payroll processing.',items:['Monthly/weekly payroll processing','PAYE, PRSI, and USC calculations']},{title:'Tax Registration',desc:'Simple registration with Revenue.',items:['Income tax & corporation tax registration','VAT registration','PAYE employer registration']},{title:'Tax Planning',desc:'Proactive tax planning.',items:['Capital gains tax planning','Retirement and pension planning']}] },
    medical: { label:'Medical Professionals', icon:'🏥', title:'Accountants for Medical Professionals', intro:'Specialist accounting and tax services tailored specifically to the medical sector.', blocks:[{title:'Who We Help',desc:'Tailored for healthcare professionals.',items:['Hospital Doctors & Consultants','General Practitioners (GPs)','Locum Doctors','GP Practices & Clinics','Pharmacy Owners']},{title:'Annual Tax Assessment',desc:'Comprehensive annual tax review.',items:['Full income tax assessment','Review of allowable deductions','Medical professional allowances']},{title:'Income Tax Returns',desc:'Accurate preparation and timely filing.',items:['Self‑employed income tax returns','PAYE income reconciliation','GMS and private income reporting']},{title:'Payroll & PAYE Returns',desc:'Complete payroll services.',items:['Monthly director and staff payroll','PAYE, PRSI, and USC management']},{title:'Medical Practice Accounting',desc:'Full accounting for GP practices.',items:['Practice income and expense management','Partnership accounts']},{title:'Confidential & Professional',desc:'Highest level of confidentiality.',items:['Complete client confidentiality','GDPR‑compliant data management']}] },
    'business-setup': { label:'Business Set‑Up', icon:'🚀', title:'Business Set‑Up Services', intro:'Support through every stage of business set‑up.', blocks:[{title:'Business Valuation',desc:'Accurate and objective valuations.',items:['Independent value assessments','Financial analysis and performance review']},{title:'Business Planning',desc:'Solid business plans.',items:['Goal setting and strategic direction','Financial forecasting']},{title:'Business Startups',desc:'Complete startup support.',items:['Business structure advice','Registration with Revenue and CRO']},{title:'Business Advisory',desc:'Personalised advisory.',items:['Practical financial advice','Long‑term growth planning']}] },
    individual: { label:'Individual Services', icon:'👤', title:'Individual Accounting & Tax Services', intro:'Simple and stress‑free personal tax and financial support.', blocks:[{title:'Income Tax Registration',desc:'Registering for income tax.',items:['Income tax registration','Self‑employed registration']},{title:'Income Tax Returns',desc:'Accurate preparation and submission.',items:['Salaried individuals (PAYE)','Self‑employed professionals','Doctors and medical professionals','Locum workers']},{title:'Tax Rebates',desc:'Claiming eligible rebates.',items:['Review of PAYE and tax records','Submission of rebate claims']}] },
    corporate: { label:'Corporate Services', icon:'🏢', title:'Corporate Services', intro:'Comprehensive corporate services from incorporation to compliance.', blocks:[{title:'Incorporation',desc:'Hassle‑free company incorporation.',items:['Company structure advice','CRO registration']},{title:'Annual Returns',desc:'Accurate and timely filing.',items:['CRO annual return preparation','Financial statement attachments']},{title:'Business Structuring',desc:'Strategic structuring advice.',items:['Group and company restructuring','Risk management']},{title:'Holding Companies & Cross‑Border',desc:'International tax solutions.',items:['Holding company structure planning','Multi‑jurisdictional compliance']}] },
    virtual: { label:'Virtual Assistant Services', icon:'🤖', title:'Virtual Assistant Services', intro:'Efficient handling of daily financial and administrative tasks.', blocks:[{title:'Invoice Management',desc:'Preparing and issuing invoices.',items:['Invoice preparation','Customer invoice tracking']},{title:'Bank & Ledger Reconciliation',desc:'Maintaining accurate records.',items:['Bank statement reconciliation','Discrepancy resolution']},{title:'VAT Document Management',desc:'Managing documents for VAT returns.',items:['VAT document collection','Compliance with deadlines']},{title:'Payroll Management',desc:'Processing salaries.',items:['Monthly/weekly payroll processing','PAYE, PRSI, and USC calculations']}] }
  };

  function buildServiceHTML(key) {
    const s = serviceData[key];
    if (!s) return '';
    let h = `<div class="service-detail-hero"><div style="position:absolute;top:50%;right:-150px;width:450px;height:450px;border:1px solid rgba(34,211,160,.07);border-radius:50%;transform:translateY(-50%);animation:rotateSlow 25s linear infinite;pointer-events:none"></div><div class="inner"><span class="section-label">${s.label}</span><h1>${s.icon} ${s.title}</h1><p style="color:var(--light-muted);line-height:1.8;max-width:640px">${s.intro}</p><div style="margin-top:1.5rem;display:flex;gap:.8rem;flex-wrap:wrap"><button class="btn-primary" onclick="safeNavigate('contact')">Get a Free Consultation →</button><button class="btn-ghost" onclick="safeNavigate('register')">Register a Company</button><button class="btn-ghost" onclick="safeNavigate('home')">← All Services</button></div></div></div><section style="background:var(--bg)"><div class="service-detail-grid">`;
    s.blocks.forEach((b, i) => {
      h += `<div class="service-block" data-reveal="${i%2===0?'left':'right'}"><h3>${b.title}</h3><p class="desc">${b.desc}</p><ul>${b.items.map(it => `<li>${it}</li>`).join('')}</ul></div>`;
    });
    h += `</div></section>`;
    h += `<section style="background:var(--bg2)"><div style="max-width:1100px;margin:0 auto;text-align:center"><span class="section-label" data-reveal="fade">Why Choose HRA</span><h2 class="section-title" data-reveal="up">The HRA Advantage</h2><div class="why-grid" style="margin-top:2rem">`;
    const advantages = ['Fixed Fee Pricing','Confidential & Professional','Revenue-Compliant','Personalised Support','Industry Expertise','Nationwide Coverage'];
    advantages.forEach((adv, idx) => h += `<div class="why-card" data-reveal="up"><div class="why-icon">${['💶','🔒','✅','🤝','🩺','🇮🇪'][idx]}</div><h3>${adv}</h3><p>Clear, upfront certainty.</p></div>`);
    h += `</div></div></section><div class="cta-section"><div class="cta-inner" data-reveal="zoom"><span class="section-label">Get Started</span><h2>Ready to Get Expert Support?</h2><p>Book a free consultation with an experienced accountant today.</p><div class="cta-actions"><button class="btn-primary-lg" onclick="safeNavigate('contact')">Contact Us →</button><button class="btn-outline-lg" onclick="safeNavigate('register')">Register a Company</button></div></div></div>`;
    return h;
  }

  /* ---------- PAGE CONTENT ---------- */
  const pageContent = {
    home: `<section class="hero"><canvas id="particle-canvas"></canvas><div class="hero-glow"></div><div class="hero-grid"></div><div class="hero-ring"></div><div class="hero-ring2"></div><div class="hero-image-strip"><div class="hero-img-item"><img src="assets/images/hero accounting.avif" alt="Accounting" width="800" height="330" fetchpriority="high" decoding="async"></div><div class="hero-img-item"><img src="assets/images/hero analytics.avif" alt="Analytics" width="800" height="328" fetchpriority="high" decoding="async"></div><div class="hero-img-item"><img src="assets/images/hero dublin.avif" alt="Dublin" width="800" height="327" fetchpriority="high" decoding="async"></div></div><div class="hero-inner"><div class="hero-badge">Chartered Accountants Ireland</div><h1>Accounting & Tax that <em>Works for You</em>, Not Against You.</h1><p>Register your Irish limited company in 3 days. Full compliance, fixed fees, and a dedicated accountant who actually picks up the phone.</p><div class="hero-actions"><button class="btn-primary-lg" onclick="safeNavigate('register')">Register a Company →</button><button class="btn-outline-lg" onclick="safeNavigate('contact')">Free Consultation</button></div><div class="hero-stats"><div class="stat-item"><span class="stat-num">3</span><span class="stat-label">Days to incorporate</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-num">100%</span><span class="stat-label">Revenue compliant</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-num">€0</span><span class="stat-label">Hidden fees</span></div></div></div></section><div class="trust-bar"><div class="marquee-track"><div class="trust-item">${chk}Free Tax Registration Included</div><div class="trust-dot"></div><div class="trust-item">${chk}Chartered Accountants Ireland</div><div class="trust-dot"></div><div class="trust-item">${chk}Company Formed in 3 Days</div><div class="trust-dot"></div><div class="trust-item">${chk}Fixed Fee Pricing</div><div class="trust-dot"></div><div class="trust-item">${chk}Specialist Medical Sector</div><div class="trust-dot"></div><div class="trust-item">${chk}Nationwide Support</div><div class="trust-dot"></div><div class="trust-item">${chk}Revenue-Compliant</div></div></div><section style="background:var(--bg2)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Our Services</span><h2 class="section-title" data-reveal="up">Everything Your Business Needs</h2><p class="section-sub" data-reveal="up" style="margin:0 auto">From company formation to ongoing compliance — all under one roof.</p></div><div class="features-grid"><div class="feature-card" data-reveal="up" onclick="safeNavigate('service:accounts')"><div class="feature-icon">📊</div><h3>Accounts</h3><p>Statutory accounts, management reports, bookkeeping, and audit services.</p><ul class="sub-list"><li>Statutory Accounts</li><li>Management Accounts</li><li>Bookkeeping</li><li>Audit</li></ul></div><div class="feature-card" data-reveal="up" onclick="safeNavigate('service:accounting-bookkeeping')"><div class="feature-icon">📒</div><h3>Accounting + Bookkeeping</h3><p>Full-service accounting package for contractors and small businesses.</p><ul class="sub-list"><li>Ongoing Bookkeeping</li><li>VAT Returns Management</li><li>Director Payroll</li><li>Annual Financial Statements</li></ul></div><div class="feature-card" data-reveal="up" onclick="safeNavigate('service:taxation')"><div class="feature-icon">🧾</div><h3>Taxation</h3><p>Expert tax services ensuring full Revenue compliance.</p><ul class="sub-list"><li>Tax Returns</li><li>VAT</li><li>Payroll</li><li>Tax Planning & Advisory</li></ul></div><div class="feature-card" data-reveal="up" onclick="safeNavigate('service:medical')"><div class="feature-icon">🏥</div><h3>Accountants for Medical</h3><p>Specialist accounting for GPs, locums, consultants, and pharmacies.</p><ul class="sub-list"><li>Annual Tax Assessment</li><li>Income Tax Returns</li><li>Payroll & PAYE Returns</li><li>Revenue Compliance</li></ul></div><div class="feature-card" data-reveal="up" onclick="safeNavigate('service:business-setup')"><div class="feature-icon">🚀</div><h3>Business Set-Up</h3><p>From startup idea to full operation — valuations, planning, and advisory.</p><ul class="sub-list"><li>Business Valuation</li><li>Business Planning</li><li>Business Startups</li><li>Business Advisory</li></ul></div><div class="feature-card" data-reveal="up" onclick="safeNavigate('service:individual')"><div class="feature-icon">👤</div><h3>Individual Services</h3><p>Personal tax support for salaried employees and self-employed.</p><ul class="sub-list"><li>Income Tax Registration</li><li>Income Tax Returns</li><li>Tax Rebates</li></ul></div><div class="feature-card" data-reveal="up" onclick="safeNavigate('service:corporate')"><div class="feature-icon">🏢</div><h3>Corporate Services</h3><p>Incorporation, annual returns, and cross-border structuring.</p><ul class="sub-list"><li>Incorporation</li><li>Annual Returns</li><li>Business Structuring</li><li>Cross-Border Tax</li></ul></div><div class="feature-card" data-reveal="up" onclick="safeNavigate('service:virtual')"><div class="feature-icon">🤖</div><h3>Virtual Assistant Services</h3><p>Remote bookkeeping and admin support — cost-effective and managed.</p><ul class="sub-list"><li>Invoice Management</li><li>Bank Reconciliation</li><li>Payroll Management</li><li>VAT Document Management</li></ul></div></div></section><div class="visual-banner" data-reveal="zoom" style="margin-top:-1rem;margin-bottom:0"><img src="assets/images/banner dublin.jpeg" alt="Dublin business district" loading="lazy"><div class="visual-banner-content"><h3>Helping businesses across Ireland start, grow, and stay compliant — since day one.</h3></div></div><section style="background:var(--bg)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Pricing & Plans</span><h2 class="section-title" data-reveal="up">Clear, Fixed-Fee Packages</h2><p class="section-sub" data-reveal="up" style="margin:0 auto">No surprises. No hourly billing. Choose the package that fits your stage.</p></div><div class="packages-grid"><div class="package-card" data-reveal="up" onclick="safeNavigate('register')"><div class="package-tag">Company Formation</div><h3>Company Registration</h3><p class="pkg-sub">The essential package to set up a limited company in Ireland.</p><ul class="pkg-features"><li>Free Company Name Check</li><li>Company formed in 3 Days</li><li>Certificate of Incorporation</li><li>Company Constitution</li><li>Share Certificates</li><li>Registers and Minutes</li><li>All Third-Party Fees Included</li><li>Documents Direct to Inbox</li><li>Beneficial Ownership Registered</li></ul><button class="btn-ghost" onclick="event.stopPropagation(); safeNavigate('register')" style="text-align:center;width:100%;justify-content:center">Get Started →</button></div><div class="package-card featured" data-reveal="up" onclick="safeNavigate('service:accounting-bookkeeping')"><div class="featured-badge">Most Popular</div><div class="package-tag">Full Service</div><h3>Accounting + Bookkeeping</h3><p class="pkg-sub">For Contractors — up to 10 sales/purchases per month.</p><ul class="pkg-features"><li>Company Registration Package</li><li>Ongoing Bookkeeping</li><li>Bespoke Bookkeeping Software</li><li>Monthly Director Payroll</li><li>VAT Returns Management</li><li>CRO B1 Annual Return</li><li>Real-Time Management Accounts</li><li>Annual Financial Statements</li><li>Corporation Tax Returns</li><li>Director Income Tax Return</li><li>Registered Address Service</li><li>Nominee Company Secretary</li></ul><button class="btn-primary" onclick="event.stopPropagation(); safeNavigate('service:accounting-bookkeeping')" style="width:100%;justify-content:center">Select Package →</button></div><div class="package-card" data-reveal="up" onclick="safeNavigate('service:medical')"><div class="package-tag">Specialist</div><h3>Medical Professionals</h3><p class="pkg-sub">For Doctors · GPs · Locums · Pharmacies</p><ul class="pkg-features"><li>Annual Tax Assessment</li><li>Annual Income Tax Returns</li><li>Payroll & Self-Employed Services</li><li>Payroll & PAYE Returns</li><li>Confidential & Professional</li><li>Medical Sector Experience</li><li>Timely Filing & Revenue Compliance</li></ul><button class="btn-ghost" onclick="event.stopPropagation(); safeNavigate('service:medical')" style="text-align:center;width:100%;justify-content:center">Learn More →</button></div></div></section><section style="background:var(--bg2)"><div class="how-grid"><div data-reveal="left"><span class="section-label">How It Works</span><h2 class="section-title">Register Your Company<br>in 3 Simple Steps</h2><p class="section-sub" style="margin-bottom:2.5rem">We've removed every unnecessary step so you can focus on building your business.</p><div class="how-steps"><div class="how-step"><div class="step-num">1</div><div class="step-body"><h3>Check Your Company Name</h3><p>We run a direct check with the CRO to confirm your name is available.</p></div></div><div class="how-step"><div class="step-num">2</div><div class="step-body"><h3>Complete Our Online Form</h3><p>Our simple application takes just a few minutes. We review every detail.</p></div></div><div class="how-step"><div class="step-num">3</div><div class="step-body"><h3>Receive Your Documents</h3><p>All documentation delivered to your inbox within 3 days.</p></div></div></div></div><div class="how-visual" data-reveal="right"><p style="font-size:.73rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:1rem">What's included free</p><div class="visual-stat"><span class="vs-label">Corporation Tax Registration</span><span class="vs-val">Free</span></div><div class="visual-stat"><span class="vs-label">VAT Registration</span><span class="vs-val">Free</span></div><div class="visual-stat"><span class="vs-label">Payroll Tax (PAYE) Setup</span><span class="vs-val">Free</span></div><div class="visual-stat"><span class="vs-label">Company Name Check</span><span class="vs-val">Free</span></div><div class="visual-stat"><span class="vs-label">Beneficial Ownership Filing</span><span class="vs-val">Free</span></div><div class="visual-stat"><span class="vs-label">All Third-Party Fees</span><span class="vs-val">Free</span></div><div style="margin-top:1.2rem;padding:.9rem 1rem;background:rgba(34,211,160,.08);border:1px solid rgba(34,211,160,.2);border-radius:12px;font-size:.82rem;color:var(--accent);text-align:center;font-weight:500">Company formed in as little as <strong>3 business days</strong></div></div></div></section><section style="background:var(--bg)"><div class="img-feature-row"><div class="img-feature-visual" data-reveal="left"><img src="assets/images/medical professionals.avif" alt="Medical professionals" loading="lazy"></div><div class="img-feature-text" data-reveal="right"><span class="section-label">Specialist Service</span><h2>Accountants Who Understand the Medical Sector</h2><p>From locum doctors to GP practices and pharmacies — we know the unique tax and compliance requirements that medical professionals face in Ireland.</p><p>Our specialist medical accounting package covers everything from annual tax assessments to payroll and Revenue compliance.</p><button class="btn-primary" onclick="safeNavigate('service:medical')" style="margin-top:.5rem">Learn About Medical Services →</button></div></div></section><section style="background:var(--bg2)"><div style="max-width:1100px;margin:0 auto"><span class="section-label" data-reveal="fade">Why Choose Us</span><h2 class="section-title" data-reveal="up">Built on Trust, Expertise<br>& Long-Term Relationships</h2><div class="why-grid"><div class="why-card" data-reveal="up"><div class="why-icon">💶</div><h3>Fixed Fee Pricing</h3><p>Clear, upfront pricing with no hidden costs — certainty from day one.</p></div><div class="why-card" data-reveal="up"><div class="why-icon">🔒</div><h3>Confidential & Professional</h3><p>Highest level of confidentiality, integrity, and professionalism.</p></div><div class="why-card" data-reveal="up"><div class="why-icon">🩺</div><h3>Industry-Focused Expertise</h3><p>Specialist experience across medical professionals and small businesses.</p></div><div class="why-card" data-reveal="up"><div class="why-icon">✅</div><h3>Revenue-Compliant & Reliable</h3><p>Accurate, compliant, and on time — no avoidable penalties.</p></div><div class="why-card" data-reveal="up"><div class="why-icon">🤝</div><h3>Personalised Support</h3><p>Tailored advice and direct access to an experienced accountant.</p></div><div class="why-card" data-reveal="up"><div class="why-icon">🇮🇪</div><h3>Serving Clients Across Ireland</h3><p>Nationwide support with in-person and remote services.</p></div></div></div></section><section style="background:var(--bg)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Comparison</span><h2 class="section-title" data-reveal="up">HRA vs. Traditional Accountants</h2></div><div class="compare-table" data-reveal="zoom"><div class="compare-cols"><div class="compare-col-head">Feature</div><div class="compare-col-head">Traditional Firm</div><div class="compare-col-head accent">HRA Accountant</div></div><div class="compare-row"><div class="compare-feat">Fixed fee pricing</div><div class="compare-cell cell-no">✕ Hourly billing</div><div class="compare-cell cell-yes">✓ Always fixed</div></div><div class="compare-row"><div class="compare-feat">Company in 3 days</div><div class="compare-cell cell-no">✕ Weeks of delays</div><div class="compare-cell cell-yes">✓ 3 business days</div></div><div class="compare-row"><div class="compare-feat">Free tax registrations</div><div class="compare-cell cell-no">✕ Charged separately</div><div class="compare-cell cell-yes">✓ Included free</div></div><div class="compare-row"><div class="compare-feat">Medical sector expertise</div><div class="compare-cell cell-no">✕ Generalist only</div><div class="compare-cell cell-yes">✓ Specialist service</div></div><div class="compare-row"><div class="compare-feat">Dedicated accountant</div><div class="compare-cell cell-no">✕ Rotating staff</div><div class="compare-cell cell-yes">✓ Dedicated contact</div></div><div class="compare-row"><div class="compare-feat">Fully remote service</div><div class="compare-cell cell-no">✕ In-person only</div><div class="compare-cell cell-yes">✓ Fully remote option</div></div></div></section><div class="gallery-strip"><a data-reveal="up"><img src="assets/images/gallery startup.avif" alt="Business Startup" loading="lazy"></a><a data-reveal="up"><img src="assets/images/gallery tax.avif" alt="Tax Documents" loading="lazy"></a><a data-reveal="up"><img src="assets/images/gallery team.avif" alt="Team Support" loading="lazy"></a><a data-reveal="up"><img src="assets/images/gallery medical.avif" alt="Medical Data" loading="lazy"></a></div><section style="background:var(--bg2)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Client Reviews</span><h2 class="section-title" data-reveal="up">Trusted by Businesses Across Ireland</h2></div><div class="testi-grid"><div class="testi-card" data-reveal="up"><div class="stars">★★★★★</div><blockquote>"HRA made registering our company completely stress-free. They handled everything."</blockquote><div class="testi-author"><div class="author-avatar"><img src="assets/images/avatar sarah.avif" alt="Sarah C." loading="lazy"></div><div><div class="author-name">Sarah C.</div><div class="author-role">Founder, Tech Startup, Dublin</div></div></div></div><div class="testi-card" data-reveal="up"><div class="stars">★★★★★</div><blockquote>"As a locum doctor, I had no idea where to start with my taxes. HRA took care of everything."</blockquote><div class="testi-author"><div class="author-avatar"><img src="assets/images/avatar dr murphy.avif" alt="Dr. Murphy" loading="lazy"></div><div><div class="author-name">Dr. D. Murphy</div><div class="author-role">Locum GP, Galway</div></div></div></div><div class="testi-card" data-reveal="up"><div class="stars">★★★★★</div><blockquote>"Fixed fees are a game changer. I always knew exactly what I was paying."</blockquote><div class="testi-author"><div class="author-avatar"><img src="assets/images/avatar patrick.avif" alt="Patrick K." loading="lazy"></div><div><div class="author-name">Patrick K.</div><div class="author-role">IT Contractor, Cork</div></div></div></div></div></section><section style="background:var(--bg)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">FAQ</span><h2 class="section-title" data-reveal="up">Frequently Asked Questions</h2></div><div class="faq-list" data-reveal="up"><div class="faq-item open"><div class="faq-q" onclick="toggleFaq(this)">How long does it take to register a company in Ireland?<span class="faq-toggle">+</span></div><div class="faq-a"><div class="faq-a-inner"><p>With HRA, your company is typically formed within 3 business days.</p></div></div></div><div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Are the tax registrations really included at no extra cost?<span class="faq-toggle">+</span></div><div class="faq-a"><div class="faq-a-inner"><p>Yes — all packages include complimentary registration for Corporation Tax, VAT, and PAYE.</p></div></div></div><div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Do you work with medical professionals?<span class="faq-toggle">+</span></div><div class="faq-a"><div class="faq-a-inner"><p>Absolutely. We have a specialist package for hospital doctors, GPs, locum doctors, and pharmacy owners.</p></div></div></div><div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Can I work with HRA remotely?<span class="faq-toggle">+</span></div><div class="faq-a"><div class="faq-a-inner"><p>Yes. We support clients nationwide with fully remote services via phone, email, and chat.</p></div></div></div><div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">How does fixed-fee pricing work?<span class="faq-toggle">+</span></div><div class="faq-a"><div class="faq-a-inner"><p>We agree on a clearly defined scope upfront and charge a single fixed fee — no hourly billing.</p></div></div></div></div></section><div class="cta-section"><div class="cta-inner" data-reveal="zoom"><span class="section-label">Get Started</span><h2>Ready to Set Up Your Business the Right Way?</h2><p>Book a free consultation with an experienced accountant today.</p><div class="cta-actions"><button class="btn-primary-lg" onclick="safeNavigate('register')">Register a Company →</button><a href="tel:0899893240" class="btn-outline-lg">📞 Call Us Now</a></div></div></div>`,
    about: `<div class="page-hero"><div class="page-hero-ring"></div><div class="page-hero-inner"><span class="section-label">About Us</span><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,5vw,3rem);line-height:1.15;margin-bottom:1rem">"Empowering businesses with the knowledge and tools they need to thrive financially."</h1><p style="color:var(--light-muted);line-height:1.8">HRA Accountant — a leading Ireland-based professional services firm built on local expertise and international capability.</p></div></div><div class="visual-banner" data-reveal="zoom" style="margin:0 auto;max-width:1100px;border-radius:0"><img src="assets/images/about office.avif" alt="HRA Office" loading="lazy"><div class="visual-banner-content"><h3>Local Knowledge. International Capability.</h3></div></div><section style="background:var(--bg2)"><div class="story-grid"><div class="story-text" data-reveal="left"><h2>Who We Are</h2><p>HRA Accountant & Tax Advisor is a leading Ireland-based professional services company that sets you free from worrying about financial records, supervising accounts staff, dealing with creditors and complex financial matters.</p><p>We specialize in aiding international businesses and individuals in setting up their Irish ventures, offering comprehensive guidance through the Irish regulatory landscape.</p></div><div class="story-visual" data-reveal="right"><div class="story-metric"><div class="metric-val">3</div><div class="metric-label">Days to register a company</div></div><div class="story-metric"><div class="metric-val">100%</div><div class="metric-label">Revenue-compliant filings</div></div><div class="story-metric"><div class="metric-val">€0</div><div class="metric-label">Hidden fees or surprises</div></div><div class="story-metric"><div class="metric-val">7</div><div class="metric-label">Dedicated service areas</div></div></div></div></section><section style="background:var(--bg)"><div class="img-feature-row reverse"><div class="img-feature-visual" data-reveal="right"><img src="assets/images/about team.avif" alt="Our team" loading="lazy"></div><div class="img-feature-text" data-reveal="left"><span class="section-label">Our Approach</span><h2>Local Knowledge.<br>International Capability.</h2><p>At HRA Accountants, we share your vision on how to best attend to corporate needs in a constantly changing global environment.</p></div></div></section><section style="background:var(--bg2)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Our Values</span><h2 class="section-title" data-reveal="up">What We Stand For</h2></div><div class="about-values"><div class="value-card" data-reveal="up"><div class="vi">🎯</div><h4>Solution-Driven</h4><p>We focus on practical, actionable solutions — not just compliance.</p></div><div class="value-card" data-reveal="up"><div class="vi">🤝</div><h4>Long-Term Partnerships</h4><p>We invest in understanding your business for the long haul.</p></div><div class="value-card" data-reveal="up"><div class="vi">🔍</div><h4>Transparency</h4><p>Fixed fees, clear communication, no jargon, no surprises.</p></div><div class="value-card" data-reveal="up"><div class="vi">🏆</div><h4>Professional Excellence</h4><p>Members of Chartered Accountants Ireland, highest standards.</p></div></div></section><section style="background:var(--bg)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Who We Help</span><h2 class="section-title" data-reveal="up">Specialists Across Multiple Sectors</h2></div><div class="about-values"><div class="value-card" data-reveal="up"><div class="vi">🏥</div><h4>Medical Professionals</h4><p>Doctors, consultants, GPs, locums, pharmacies.</p></div><div class="value-card" data-reveal="up"><div class="vi">💻</div><h4>IT Contractors</h4><p>Company registration, payroll, and VAT management.</p></div><div class="value-card" data-reveal="up"><div class="vi">🏗️</div><h4>Small Businesses</h4><p>Full accounting and bookkeeping support.</p></div><div class="value-card" data-reveal="up"><div class="vi">🌍</div><h4>International Companies</h4><p>Setting up Irish operations.</p></div><div class="value-card" data-reveal="up"><div class="vi">👨‍💼</div><h4>Self-Employed</h4><p>Sole traders and freelance professionals.</p></div><div class="value-card" data-reveal="up"><div class="vi">🏦</div><h4>High Net Worth Individuals</h4><p>Confidential financial advisory.</p></div></div></section><div class="cta-section"><div class="cta-inner" data-reveal="zoom"><span class="section-label">Let's Talk</span><h2>Get in Touch With Our Team</h2><p>Speak to an experienced accountant today.</p><div class="cta-actions"><button class="btn-primary-lg" onclick="safeNavigate('contact')">Contact Us →</button><a href="tel:0899893240" class="btn-outline-lg">📞 089 989 3240</a></div></div></div>`,
    contact: `<div class="page-hero"><div class="page-hero-ring"></div><div class="page-hero-inner"><span class="section-label">Contact Us</span><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,5vw,3rem);line-height:1.15;margin-bottom:1rem">Let's Start a Conversation</h1><p style="color:var(--light-muted);line-height:1.8">Free initial consultation: Speak to an experienced accountant today.</p></div></div><section style="background:var(--bg)"><div class="contact-grid"><div class="contact-info" data-reveal="left"><h3>Get in Touch</h3><p>Whether you're looking to register a company, need tax advice, or want to explore our accounting services — we're here to help.</p><div class="contact-item"><div class="contact-icon">📍</div><div><h5>Our Office</h5><p>Unit 8, Greenhills Business Centre<br>Dublin, Ireland, D24 H340</p></div></div><div class="contact-item"><div class="contact-icon">📞</div><div><h5>Phone</h5><p><a href="tel:0899893240">089 989 3240</a></p></div></div><div class="contact-item"><div class="contact-icon">📧</div><div><h5>Email</h5><p><a href="mailto:info@hraaccountant.ie">info@hraaccountant.ie</a></p></div></div><div class="contact-item"><div class="contact-icon">🕐</div><div><h5>Office Hours</h5><p>Mon – Fri: 9:00am – 5:30pm<br>Sat – Sun: Closed</p></div></div></div><div class="contact-form-wrap" data-reveal="right"><h3>Send Us a Message</h3><div id="contactSuccess" class="form-success">✓ Message sent! We'll get back to you within one business day.</div><div id="contactForm"><div style="position:absolute;left:-9999px" aria-hidden="true"><label for="contact_hp">Leave empty</label><input type="text" id="contact_hp" name="contact_hp" tabindex="-1" autocomplete="off" /></div><div class="form-row"><div class="form-group"><label for="contactFname">First Name</label><input type="text" id="contactFname" name="first_name" placeholder="John" required><span class="form-error-msg">First name is required</span></div><div class="form-group"><label for="contactLname">Last Name</label><input type="text" id="contactLname" name="last_name" placeholder="Smith" required><span class="form-error-msg">Last name is required</span></div></div><div class="form-group"><label for="contactEmail">Email Address</label><input type="email" id="contactEmail" name="email" placeholder="john@example.com" required><span class="form-error-msg">Valid email is required</span></div><div class="form-group"><label for="contactPhone">Phone Number</label><input type="tel" id="contactPhone" name="phone" placeholder="+353 ..."></div><div class="form-group"><label for="contactService">Service Required</label><select id="contactService" name="service"><option value="">Select a service...</option><option>Company Registration</option><option>Accounts & Bookkeeping</option><option>Taxation Services</option><option>Medical Professionals</option><option>Business Set-Up</option><option>Individual Services</option><option>Corporate Services</option><option>General Enquiry</option></select></div><div class="form-group"><label for="contactMessage">Message</label><textarea id="contactMessage" name="message" placeholder="Tell us about your requirements..." required></textarea><span class="form-error-msg">Please enter a message</span></div><div class="checkbox-group" style="margin-bottom:1.2rem"><input type="checkbox" id="contactConsent" name="gdpr_consent" required><label for="contactConsent">I consent to HRA Accountant collecting and storing my data in accordance with the <a href="#privacy" onclick="safeNavigate('privacy'); return false;" style="color:var(--accent);text-decoration:underline">Privacy Policy</a>.</label></div><button class="btn-primary" style="width:100%;justify-content:center;padding:.85rem;font-size:.92rem" onclick="submitContact()">Send Message →</button></div></div></div></section>`,
    register: `<div class="page-hero"><div class="page-hero-ring"></div><div class="page-hero-inner"><span class="section-label">Register a Company</span><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,5vw,3rem);line-height:1.15;margin-bottom:1rem">Register Your Irish Limited Company in 3 Days</h1><p style="color:var(--light-muted);line-height:1.8">Fast, hassle-free company registration with free tax registrations and transparent pricing.</p></div></div><section style="background:var(--bg)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Simple Process</span><h2 class="section-title" data-reveal="up">How It Works</h2></div><div class="register-steps"><div class="rstep" data-reveal="up"><div class="rstep-num">1</div><h4>Company Name Check</h4><p>We verify your chosen name directly with the CRO.</p></div><div class="rstep" data-reveal="up"><div class="rstep-num">2</div><h4>Complete the Form</h4><p>Fill in our simple online registration form — just a few minutes.</p></div><div class="rstep" data-reveal="up"><div class="rstep-num">3</div><h4>Documents to Your Inbox</h4><p>Receive all required documents within 3 days.</p></div></div><div style="max-width:900px;margin:0 auto 4rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem"><div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem" data-reveal="left"><h4 style="font-size:.95rem;font-weight:600;margin-bottom:1.2rem;color:var(--accent)">📦 What's Included</h4><ul class="pkg-features" style="margin-bottom:0"><li>Free Company Name Check</li><li>Certificate of Incorporation</li><li>Company Constitution</li><li>Share Certificates</li><li>All Third-Party Fees</li></ul></div><div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem" data-reveal="right"><h4 style="font-size:.95rem;font-weight:600;margin-bottom:1.2rem;color:var(--accent)">🎁 Free Tax Registrations</h4><ul class="pkg-features" style="margin-bottom:0"><li>Corporation Tax Registration</li><li>VAT Registration</li><li>Payroll Tax (PAYE) Setup</li><li>Revenue Online Service (ROS)</li></ul></div></div><div class="register-form-wrap" data-reveal="up" style="max-width:900px"><div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.4rem"><div style="width:38px;height:38px;border-radius:10px;background:rgba(34,211,160,.1);border:1px solid rgba(34,211,160,.2);display:flex;align-items:center;justify-content:center;font-size:1.1rem">🏢</div><h3 style="margin:0">Company Registration Form</h3></div><p class="sub">Director 1 information is <strong style="color:var(--accent)">mandatory</strong>. Director 2 / Secretary details are optional.</p><div id="registerSuccess" class="form-success">✓ Request sent! Our team will contact you within one business day.</div><div id="registerFormBody"><div class="form-divider">Company Details</div><div class="form-row"><div class="form-group"><label for="regCompanyName1">Proposed Company Name (1st Choice) *</label><input type="text" id="regCompanyName1" name="company_name_1" placeholder="e.g. Smith Trading Ltd" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regCompanyName2">Proposed Company Name (2nd Choice)</label><input type="text" id="regCompanyName2" name="company_name_2" placeholder="Backup name"></div></div><div class="form-row"><div class="form-group"><label for="regBusinessNature">Nature / Type of Business *</label><input type="text" id="regBusinessNature" name="business_nature" placeholder="e.g. IT Consulting" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regOfficeAddress">Registered Office Address</label><input type="text" id="regOfficeAddress" name="office_address" placeholder="Leave blank for our address service"></div></div><div class="form-divider">Director 1 Details</div><div class="form-row"><div class="form-group"><label for="regDir1Fname">First Name *</label><input type="text" id="regDir1Fname" name="dir1_first_name" placeholder="First name" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regDir1Lname">Last Name *</label><input type="text" id="regDir1Lname" name="dir1_last_name" placeholder="Last name" required><span class="form-error-msg">Required</span></div></div><div class="form-row"><div class="form-group"><label for="regDir1Dob">Date of Birth *</label><input type="date" id="regDir1Dob" name="dir1_dob" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regDir1Nationality">Nationality *</label><input type="text" id="regDir1Nationality" name="dir1_nationality" placeholder="e.g. Irish" required><span class="form-error-msg">Required</span></div></div><div class="form-row"><div class="form-group"><label for="regDir1PPS">PPS Number *</label><input type="text" id="regDir1PPS" name="dir1_pps" placeholder="e.g. 1234567A" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regDir1Occupation">Occupation *</label><input type="text" id="regDir1Occupation" name="dir1_occupation" placeholder="e.g. Software Engineer" required><span class="form-error-msg">Required</span></div></div><div class="form-group"><label for="regDir1Address">Home Address *</label><input type="text" id="regDir1Address" name="dir1_address" placeholder="Full residential address including Eircode" required><span class="form-error-msg">Required</span></div><div class="form-row"><div class="form-group"><label for="regDir1Email">Email Address *</label><input type="email" id="regDir1Email" name="dir1_email" placeholder="director1@email.com" required><span class="form-error-msg">Valid email required</span></div><div class="form-group"><label for="regDir1Phone">Phone Number *</label><input type="tel" id="regDir1Phone" name="dir1_phone" placeholder="+353 ..." required><span class="form-error-msg">Required</span></div></div><div class="form-divider">Director 2 / Secretary</div><p style="font-size:.82rem;color:var(--muted);margin-bottom:1rem">Leave blank if not required.</p><div class="form-row"><div class="form-group"><label for="regDir2Fname">First Name</label><input type="text" id="regDir2Fname" name="dir2_first_name" placeholder="First name"></div><div class="form-group"><label for="regDir2Lname">Last Name</label><input type="text" id="regDir2Lname" name="dir2_last_name" placeholder="Last name"></div></div><div class="form-row"><div class="form-group"><label for="regDir2Dob">Date of Birth</label><input type="date" id="regDir2Dob" name="dir2_dob"></div><div class="form-group"><label for="regDir2Nationality">Nationality</label><input type="text" id="regDir2Nationality" name="dir2_nationality" placeholder="e.g. Irish"></div></div><div class="form-group"><label for="regDir2Address">Home Address</label><input type="text" id="regDir2Address" name="dir2_address" placeholder="Full residential address"></div><div class="form-row"><div class="form-group"><label for="regDir2Email">Email Address</label><input type="email" id="regDir2Email" name="dir2_email" placeholder="director2@email.com"></div><div class="form-group"><label for="regDir2Phone">Phone Number</label><input type="tel" id="regDir2Phone" name="dir2_phone" placeholder="+353 ..."></div></div><div class="form-divider">Additional Services</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-bottom:1.2rem"><label style="display:flex;align-items:flex-start;gap:.7rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.9rem;cursor:pointer"><input type="checkbox" name="service_registered_address" value="yes" style="accent-color:var(--accent);flex-shrink:0;margin-top:3px"><div><div style="font-size:.85rem;font-weight:600">Registered Address</div><div style="font-size:.76rem;color:var(--muted)">Dublin address for CRO</div></div></label><label style="display:flex;align-items:flex-start;gap:.7rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.9rem;cursor:pointer"><input type="checkbox" name="service_nominee_secretary" value="yes" style="accent-color:var(--accent);flex-shrink:0;margin-top:3px"><div><div style="font-size:.85rem;font-weight:600">Nominee Secretary</div><div style="font-size:.76rem;color:var(--muted)">We act as secretary</div></div></label><label style="display:flex;align-items:flex-start;gap:.7rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.9rem;cursor:pointer"><input type="checkbox" name="service_vat_registration" value="yes" style="accent-color:var(--accent);flex-shrink:0;margin-top:3px"><div><div style="font-size:.85rem;font-weight:600">VAT Registration</div><div style="font-size:.76rem;color:var(--muted)">Free with package</div></div></label><label style="display:flex;align-items:flex-start;gap:.7rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.9rem;cursor:pointer"><input type="checkbox" name="service_paye_registration" value="yes" style="accent-color:var(--accent);flex-shrink:0;margin-top:3px"><div><div style="font-size:.85rem;font-weight:600">PAYE Registration</div><div style="font-size:.76rem;color:var(--muted)">Free employer setup</div></div></label></div><div class="form-divider">Additional Information</div><div class="form-group"><label for="regNotes">Additional Notes</label><textarea id="regNotes" name="notes" placeholder="Any specific requirements or questions..."></textarea></div><div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1.2rem"><div class="checkbox-group"><input type="checkbox" id="confirmAccuracy" name="confirm_accuracy"><label for="confirmAccuracy">I confirm that all information provided is accurate and complete.</label></div><div class="checkbox-group"><input type="checkbox" id="confirmTerms" name="confirm_terms"><label for="confirmTerms">I agree to HRA Accountant's terms of service.</label></div></div><button class="btn-primary" style="width:100%;justify-content:center;padding:.9rem;font-size:.95rem;border-radius:12px" onclick="submitRegister()">Send Request →</button></div></div></section>`,
    privacy: `<div class="page-hero"><div class="page-hero-ring"></div><div class="page-hero-inner"><span class="section-label">Legal</span><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,5vw,3rem);line-height:1.15;margin-bottom:1rem">Privacy Policy</h1><p style="color:var(--light-muted);line-height:1.8">Last updated: ${new Date().getFullYear()}</p></div></div><section style="background:var(--bg)"><div style="max-width:800px;margin:0 auto;color:var(--light-muted);line-height:1.8;font-size:.92rem"><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-bottom:1rem">1. Introduction</h2><p>HRA Accountant ("we", "us", or "our") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our website or use our services, in compliance with the General Data Protection Regulation (GDPR) and applicable Irish law.</p><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">2. What Data We Collect</h2><p>We may collect the following types of personal data when you fill out a form or contact us:</p><ul style="margin-left:1.5rem;margin-top:.5rem"><li>Identity data: first name, last name</li><li>Contact data: email address, phone number</li><li>Business data: company name, nature of business, PPS number (if provided for company registration)</li><li>Technical data: IP address, browser type, time zone setting (automatically collected via server logs)</li></ul><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">3. How We Use Your Data</h2><p>We use your personal data only for the following purposes:</p><ul style="margin-left:1.5rem;margin-top:.5rem"><li>To respond to your enquiry and provide our services</li><li>To comply with legal obligations (e.g., company formation requirements)</li><li>To improve our website experience</li></ul><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">4. Legal Basis (GDPR)</h2><p>Under GDPR, we rely on one or more of the following lawful bases:</p><ul style="margin-left:1.5rem;margin-top:.5rem"><li><strong>Consent:</strong> You have given clear consent for us to process your personal data for a specific purpose (e.g., by submitting a form).</li><li><strong>Contract:</strong> Processing is necessary for a contract we have with you, or because you have asked us to take specific steps before entering into a contract.</li><li><strong>Legal obligation:</strong> Processing is necessary for compliance with a legal obligation (e.g., tax reporting).</li></ul><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">5. Data Retention</h2><p>We retain your personal data only for as long as necessary to fulfil the purposes we collected it for, including satisfying any legal, accounting, or reporting requirements.</p><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">6. Your Rights</h2><p>Under GDPR, you have the right to:</p><ul style="margin-left:1.5rem;margin-top:.5rem"><li>Request access to your personal data</li><li>Request correction or erasure of your personal data</li><li>Object to processing of your personal data</li><li>Request restriction of processing</li><li>Request data portability</li><li>Withdraw consent at any time</li></ul><p>To exercise any of these rights, please contact us at <a href="mailto:info@hraaccountant.ie" style="color:var(--accent)">info@hraaccountant.ie</a>.</p><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">7. Contact Us</h2><p>If you have any questions about this privacy policy or our data practices, please contact us at:</p><p style="margin-top:.5rem">📍 Unit 8, Greenhills Business Centre, Dublin, D24 H340<br>📧 <a href="mailto:info@hraaccountant.ie" style="color:var(--accent)">info@hraaccountant.ie</a><br>📞 <a href="tel:0899893240" style="color:var(--accent)">089 989 3240</a></p></div></section>`
  };

  /* ---------- ROUTING ---------- */
  function updateTitle(page, serviceKey) {
    const base = 'HRA Accountant';
    const titles = {
      home: `${base} — Payroll, Benefits & Tax Management`,
      about: `About Us — ${base}`,
      contact: `Contact Us — ${base}`,
      register: `Register a Company — ${base}`,
      privacy: `Privacy Policy — ${base}`,
      service: serviceKey ? `${serviceData[serviceKey]?.title} — ${base}` : `Services — ${base}`
    };
    document.title = titles[page] || base;
  }

  function showPage(id, skipHash = false) {
    stopParticles();
    const page = document.getElementById('page-' + id);
    if (!page) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active', 'page-enter'));
    if (id === 'service') {
      page.classList.add('active');
      requestAnimationFrame(() => { page.classList.add('page-enter'); window.scrollTo({top:0,behavior:'instant'}); setTimeout(initReveal, 100); });
      closeMobile();
      updateTitle('service');
      if (!skipHash) window.location.hash = '#service';
      return;
    }
    if (!pageCache[id] && pageContent[id]) pageCache[id] = pageContent[id];
    if (pageCache[id]) page.innerHTML = pageCache[id];
    page.classList.add('active');
    requestAnimationFrame(() => {
      page.classList.add('page-enter');
      window.scrollTo({top:0,behavior:'instant'});
      setTimeout(initReveal, 100);
      if (id === 'home') initParticles();
    });
    updateTitle(id);
    if (!skipHash) window.location.hash = '#' + id;
    closeMobile();
  }

  function showServicePage(key) {
    if (!serviceCache[key]) serviceCache[key] = buildServiceHTML(key);
    document.getElementById('serviceContent').innerHTML = serviceCache[key];
    showPage('service', true);
    updateTitle('service', key);
    window.location.hash = '#service/' + key;
  }

  /* ---------- MOBILE NAV ---------- */
  function toggleMobile() {
    const nav = document.getElementById('mobileNav'),
          btn = document.querySelector('.mobile-menu-btn'),
          isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
  function closeMobile() {
    document.getElementById('mobileNav').classList.remove('open');
    document.querySelector('.mobile-menu-btn').setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function toggleMobileSub(btn) {
    btn.nextElementSibling.classList.toggle('open');
    btn.setAttribute('aria-expanded', btn.nextElementSibling.classList.contains('open'));
  }
  document.addEventListener('click', e => { if (!e.target.closest('#mobileNav') && !e.target.closest('.mobile-menu-btn')) closeMobile(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobile(); });

  /* ---------- FAQ ---------- */
  function toggleFaq(el) {
    const item = el.parentElement,
          list = el.closest('.faq-list'),
          currentlyOpen = list.querySelector('.faq-item.open');
    if (currentlyOpen && currentlyOpen !== item) currentlyOpen.classList.remove('open');
    item.classList.toggle('open');
  }

  /* ---------- FORM VALIDATION ---------- */
  function clearErrorOnInput() {
    document.body.addEventListener('input', e => {
      const el = e.target;
      if (el.classList.contains('form-error')) {
        el.classList.remove('form-error');
        const errMsg = el.nextElementSibling;
        if (errMsg && errMsg.classList.contains('form-error-msg')) errMsg.style.display = 'none';
      }
    });
  }
  function validateContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return false;
    const hp = document.getElementById('contact_hp');
    if (hp && hp.value.trim() !== '') { console.warn('Spam detected – honeypot filled'); return false; }
    let valid = true;
    form.querySelectorAll('[required]').forEach(f => {
      if (f.type === 'checkbox') {
        if (!f.checked) { f.closest('.checkbox-group').style.border = '1px solid #ff6b6b'; valid = false; }
        else { f.closest('.checkbox-group').style.border = '1px solid var(--border)'; }
        return;
      }
      const error = f.nextElementSibling;
      if (!f.value.trim()) {
        f.classList.add('form-error');
        if (error && error.classList.contains('form-error-msg')) error.style.display = 'block';
        valid = false;
      } else {
        f.classList.remove('form-error');
        if (error && error.classList.contains('form-error-msg')) error.style.display = 'none';
      }
    });
    return valid;
  }
  function submitContact() {
    if (!validateContactForm()) return;
    const form = document.getElementById('contactForm');
    const data = new FormData(form);
    console.log('Contact form submitted:', Object.fromEntries(data.entries()));
    form.style.display = 'none';
    document.getElementById('contactSuccess').style.display = 'block';
  }

  function validateRegisterForm() {
    const body = document.getElementById('registerFormBody');
    if (!body) return false;
    let valid = true;
    body.querySelectorAll('[required]').forEach(f => {
      const errorEl = f.nextElementSibling;
      if (!f.value.trim()) {
        f.classList.add('form-error');
        if (errorEl && errorEl.classList.contains('form-error-msg')) errorEl.style.display = 'block';
        valid = false;
      } else {
        f.classList.remove('form-error');
        if (errorEl && errorEl.classList.contains('form-error-msg')) errorEl.style.display = 'none';
      }
    });
    const accuracy = document.getElementById('confirmAccuracy'),
          terms = document.getElementById('confirmTerms');
    if (accuracy && !accuracy.checked) { accuracy.closest('.checkbox-group').style.border = '1px solid #ff6b6b'; valid = false; }
    else if (accuracy) accuracy.closest('.checkbox-group').style.border = '1px solid var(--border)';
    if (terms && !terms.checked) { terms.closest('.checkbox-group').style.border = '1px solid #ff6b6b'; valid = false; }
    else if (terms) terms.closest('.checkbox-group').style.border = '1px solid var(--border)';
    return valid;
  }
  function submitRegister() {
    if (!validateRegisterForm()) return;
    const body = document.getElementById('registerFormBody'),
          formData = new FormData();
    body.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.name) {
        if ((el.type === 'checkbox' || el.type === 'radio') && el.checked) formData.append(el.name, el.value);
        else if (el.type !== 'checkbox' && el.type !== 'radio') formData.append(el.name, el.value);
      }
    });
    console.log('Registration form submitted:', Object.fromEntries(formData.entries()));
    body.style.display = 'none';
    document.getElementById('registerSuccess').style.display = 'block';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  /* ---------- HASH‑BASED INIT ---------- */
  function handleHashChange() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) { showPage('home'); return; }
    if (hash.startsWith('service/')) {
      showServicePage(hash.split('service/')[1]);
    } else if (['home','about','contact','register','privacy'].includes(hash)) {
      showPage(hash);
    } else {
      showPage('home');
    }
  }

  window.addEventListener('hashchange', handleHashChange);
  document.addEventListener('DOMContentLoaded', () => {
    clearErrorOnInput();
    if (window.scrollY > 40) document.getElementById('mainNav').classList.add('scrolled');
    if (window.innerWidth <= 900) document.getElementById('mainNav').classList.add('scrolled');
    const copyrightEl = document.querySelector('.footer-bottom p');
    if (copyrightEl) {
      copyrightEl.innerHTML = copyrightEl.innerHTML.replace(/\d{4}/, new Date().getFullYear());
    }
    if (!window.location.hash) {
      window.location.hash = '#home';
    } else {
      handleHashChange();
    }
  });

  window.toggleMobile = toggleMobile;
  window.closeMobile = closeMobile;
  window.toggleMobileSub = toggleMobileSub;
  window.toggleFaq = toggleFaq;
  window.submitContact = submitContact;
  window.submitRegister = submitRegister;
  window.showPage = showPage;
  window.showServicePage = showServicePage;
})();
