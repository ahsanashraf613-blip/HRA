/* =============================================================
   HRA ACCOUNTANT – MAIN JAVASCRIPT (SMOOTH SCROLL FIXED)
   ============================================================= */
(function () {
  'use strict';

  /* ---------- SMOOTH SCROLL ENGINE (integrated) ---------- */
  const scroller = {
    target: 0,
    current: 0,
    ease: 0.08,          // lower = slower (premium feel)
    rafId: null,

    start() {
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(() => this.animate());
      }
    },

    animate() {
      this.current += (this.target - this.current) * this.ease;
      window.scrollTo(0, Math.round(this.current * 100) / 100);

      if (Math.abs(this.target - this.current) > 0.5) {
        this.rafId = requestAnimationFrame(() => this.animate());
      } else {
        this.rafId = null;
        window.scrollTo(0, this.target);  // snap to exact position
      }
    },

    scrollTo(y) {
      this.target = Math.max(0, Math.min(y, document.body.scrollHeight - window.innerHeight));
      this.start();
    },

    // Update target when window resizes to stay in bounds
    clamp() {
      this.target = Math.max(0, Math.min(this.target, document.body.scrollHeight - window.innerHeight));
      this.current = Math.max(0, Math.min(this.current, this.target));
    }
  };

  // Intercept mouse wheel
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    scroller.scrollTo(scroller.target + e.deltaY);
  }, { passive: false });

  // Intercept touch scroll
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const deltaY = touchStartY - e.touches[0].clientY;
    touchStartY = e.touches[0].clientY;
    scroller.scrollTo(scroller.target + deltaY);
  }, { passive: false });

  window.addEventListener('resize', () => scroller.clamp());

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

  // Keep the scroll progress and nav highlight working with the smooth scroll
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

  /* ---------- FULL PAGE CONTENT ---------- */
  const pageContent = {
    home: `...`,    // ← COPY THE COMPLETE home PAGE HTML FROM THE PREVIOUS WORKING main.js
    about: `...`,   // ← COPY THE COMPLETE about PAGE HTML
    contact: `...`, // ← COPY THE COMPLETE contact PAGE HTML
    register: `...`,// ← COPY THE COMPLETE register PAGE HTML
    privacy: `...`  // ← COPY THE COMPLETE privacy PAGE HTML
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
      requestAnimationFrame(() => { page.classList.add('page-enter'); scroller.scrollTo(0); setTimeout(initReveal, 100); });
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
      scroller.scrollTo(0);
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
    scroller.scrollTo(0);
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
