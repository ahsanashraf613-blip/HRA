/* =============================================================
   HRA ACCOUNTANT – MAIN JAVASCRIPT (OPTIMISED PARTICLES)
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
  let mouse = { x: -999, y: -999 };   // shared mouse position for particles

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

  // ---------- PARTICLES (more particles, stronger hover reaction) ----------
  function initParticles() {
    if (particlesInitialised) return;
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
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
    // Particle count: more on desktop, fewer on mobile
    const count = window.innerWidth < 600 ? 180 : 280;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * (W || 1400),
        y: Math.random() * (H || 900),
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2.0 + 0.8,
        a: Math.random() * 0.6 + 0.3,
        baseX: Math.random() * (W || 1400),
        baseY: Math.random() * (H || 900)
      });
    }
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      let mouseX = mouse.x, mouseY = mouse.y;
      particles.forEach(p => {
        // gentle drift back to original position
        p.vx += (p.baseX - p.x) * 0.002;
        p.vy += (p.baseY - p.y) * 0.002;
        // mouse repulsion (stronger)
        const dx = p.x - mouseX, dy = p.y - mouseY, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150 * 1.2;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * 0.8;
          p.vy += Math.sin(angle) * force * 0.8;
        }
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        // wrap around edges (smooth)
        if (p.x < -50) p.x = W + 50;
        if (p.x > W + 50) p.x = -50;
        if (p.y < -50) p.y = H + 50;
        if (p.y > H + 50) p.y = -50;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,211,160,${p.a})`;
        ctx.fill();
      });
      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const opacity = 0.2 * (1 - d / 140);
            ctx.strokeStyle = `rgba(34,211,160,${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      particleAnimId = requestAnimationFrame(draw);
    }
    draw();
    particlesInitialised = true;

    // attach mouse move to update shared mouse position
    if (hero) {
      hero.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });
      hero.addEventListener('mouseleave', () => {
        mouse.x = -999;
        mouse.y = -999;
      });
    }
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
    mouse = { x: -999, y: -999 };
    particlesInitialised = false;
  }

  window.addEventListener('scroll', () => {
    const s = window.scrollY, m = document.documentElement.scrollHeight - window.innerHeight;
    const progress = document.getElementById('scroll-progress');
    if (progress) progress.style.width = (s / m * 100) + '%';
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('scrolled', s > 40);
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

  function enhanceAccessibility() {
    const cards = document.querySelectorAll('.feature-card, .package-card, .faq-q, .gallery-strip a');
    cards.forEach(card => {
      if (!card.getAttribute('role')) {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
      }
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
    const galleryImgs = document.querySelectorAll('.gallery-strip img');
    galleryImgs.forEach((img, idx) => {
      if (!img.alt) img.alt = `Gallery image ${idx+1}`;
    });
    document.querySelectorAll('.btn-ghost, .btn-primary, .btn-primary-lg, .btn-outline-lg').forEach(btn => {
      if (!btn.getAttribute('aria-label') && btn.innerText.trim() === '') {
        btn.setAttribute('aria-label', btn.classList.contains('btn-primary') ? 'Primary action' : 'Button');
      }
    });
  }

  // Dropdown with keyboard support
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
    const menuItems = dropdown.querySelectorAll('.dropdown-menu a');
    dropdownBtn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (menuItems.length) menuItems[0].focus();
      }
    });
    menuItems.forEach((item, idx) => {
      item.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = menuItems[idx+1];
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = menuItems[idx-1];
          if (prev) prev.focus();
          else dropdownBtn.focus();
        } else if (e.key === 'Escape') {
          close();
          dropdownBtn.focus();
        }
      });
    });
  })();

  // Service data (unchanged – same as before)
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

  // Page content for non‑home pages
  const pageContent = {
    about: `<div class="page-hero"><div class="page-hero-ring"></div><div class="page-hero-inner"><span class="section-label">About Us</span><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,5vw,3rem);line-height:1.15;margin-bottom:1rem">"Empowering businesses with the knowledge and tools they need to thrive financially."</h1><p style="color:var(--light-muted);line-height:1.8">HRA Accountant — a leading Ireland-based professional services firm built on local expertise and international capability.</p></div></div><div class="visual-banner" data-reveal="zoom" style="margin:0 auto;max-width:1100px;border-radius:0"><img src="assets/images/about office.webp" alt="HRA Office" loading="lazy"><div class="visual-banner-content"><h3>Local Knowledge. International Capability.</h3></div></div><section style="background:var(--bg2)"><div class="story-grid"><div class="story-text" data-reveal="left"><h2>Who We Are</h2><p>HRA Accountant & Tax Advisor is a leading Ireland-based professional services company that sets you free from worrying about financial records, supervising accounts staff, dealing with creditors and complex financial matters.</p><p>We specialize in aiding international businesses and individuals in setting up their Irish ventures, offering comprehensive guidance through the Irish regulatory landscape.</p></div><div class="story-visual" data-reveal="right"><div class="story-metric"><div class="metric-val">3</div><div class="metric-label">Days to register a company</div></div><div class="story-metric"><div class="metric-val">100%</div><div class="metric-label">Revenue-compliant filings</div></div><div class="story-metric"><div class="metric-val">€0</div><div class="metric-label">Hidden fees or surprises</div></div><div class="story-metric"><div class="metric-val">7</div><div class="metric-label">Dedicated service areas</div></div></div></div></section><section style="background:var(--bg)"><div class="img-feature-row reverse"><div class="img-feature-visual" data-reveal="right"><img src="assets/images/about team.webp" alt="Our team" loading="lazy"></div><div class="img-feature-text" data-reveal="left"><span class="section-label">Our Approach</span><h2>Local Knowledge.<br>International Capability.</h2><p>At HRA Accountants, we share your vision on how to best attend to corporate needs in a constantly changing global environment.</p></div></div></section><section style="background:var(--bg2)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Our Values</span><h2 class="section-title" data-reveal="up">What We Stand For</h2></div><div class="about-values"><div class="value-card" data-reveal="up"><div class="vi">🎯</div><h4>Solution-Driven</h4><p>We focus on practical, actionable solutions — not just compliance.</p></div><div class="value-card" data-reveal="up"><div class="vi">🤝</div><h4>Long-Term Partnerships</h4><p>We invest in understanding your business for the long haul.</p></div><div class="value-card" data-reveal="up"><div class="vi">🔍</div><h4>Transparency</h4><p>Fixed fees, clear communication, no jargon, no surprises.</p></div><div class="value-card" data-reveal="up"><div class="vi">🏆</div><h4>Professional Excellence</h4><p>Members of Chartered Accountants Ireland, highest standards.</p></div></div></section><section style="background:var(--bg)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Who We Help</span><h2 class="section-title" data-reveal="up">Specialists Across Multiple Sectors</h2></div><div class="about-values"><div class="value-card" data-reveal="up"><div class="vi">🏥</div><h4>Medical Professionals</h4><p>Doctors, consultants, GPs, locums, pharmacies.</p></div><div class="value-card" data-reveal="up"><div class="vi">💻</div><h4>IT Contractors</h4><p>Company registration, payroll, and VAT management.</p></div><div class="value-card" data-reveal="up"><div class="vi">🏗️</div><h4>Small Businesses</h4><p>Full accounting and bookkeeping support.</p></div><div class="value-card" data-reveal="up"><div class="vi">🌍</div><h4>International Companies</h4><p>Setting up Irish operations.</p></div><div class="value-card" data-reveal="up"><div class="vi">👨‍💼</div><h4>Self-Employed</h4><p>Sole traders and freelance professionals.</p></div><div class="value-card" data-reveal="up"><div class="vi">🏦</div><h4>High Net Worth Individuals</h4><p>Confidential financial advisory.</p></div></div></section><div class="cta-section"><div class="cta-inner" data-reveal="zoom"><span class="section-label">Let's Talk</span><h2>Get in Touch With Our Team</h2><p>Speak to an experienced accountant today.</p><div class="cta-actions"><button class="btn-primary-lg" onclick="safeNavigate('contact')">Contact Us →</button><a href="tel:0899893240" class="btn-outline-lg">📞 089 989 3240</a></div></div></div>`,
    contact: `<div class="page-hero"><div class="page-hero-ring"></div><div class="page-hero-inner"><span class="section-label">Contact Us</span><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,5vw,3rem);line-height:1.15;margin-bottom:1rem">Let's Start a Conversation</h1><p style="color:var(--light-muted);line-height:1.8">Free initial consultation: Speak to an experienced accountant today.</p></div></div><section style="background:var(--bg)"><div class="contact-grid"><div class="contact-info" data-reveal="left"><h3>Get in Touch</h3><p>Whether you're looking to register a company, need tax advice, or want to explore our accounting services — we're here to help.</p><div class="contact-item"><div class="contact-icon">📍</div><div><h5>Our Office</h5><p>Unit 8, Greenhills Business Centre<br>Dublin, Ireland, D24 H340</p></div></div><div class="contact-item"><div class="contact-icon">📞</div><div><h5>Phone</h5><p><a href="tel:0899893240">089 989 3240</a></p></div></div><div class="contact-item"><div class="contact-icon">📧</div><div><h5>Email</h5><p><a href="mailto:info@hraaccountant.ie">info@hraaccountant.ie</a></p></div></div><div class="contact-item"><div class="contact-icon">🕐</div><div><h5>Office Hours</h5><p>Mon – Fri: 9:00am – 5:30pm<br>Sat – Sun: Closed</p></div></div></div><div class="contact-form-wrap" data-reveal="right"><h3>Send Us a Message</h3><div id="contactSuccess" class="form-success">✓ Message sent! We'll get back to you within one business day.</div><div id="contactForm"><div style="position:absolute;left:-9999px" aria-hidden="true"><label for="contact_hp">Leave empty</label><input type="text" id="contact_hp" name="contact_hp" tabindex="-1" autocomplete="off" /></div><div class="form-row"><div class="form-group"><label for="contactFname">First Name</label><input type="text" id="contactFname" name="first_name" placeholder="John" required><span class="form-error-msg">First name is required</span></div><div class="form-group"><label for="contactLname">Last Name</label><input type="text" id="contactLname" name="last_name" placeholder="Smith" required><span class="form-error-msg">Last name is required</span></div></div><div class="form-group"><label for="contactEmail">Email Address</label><input type="email" id="contactEmail" name="email" placeholder="john@example.com" required><span class="form-error-msg">Valid email is required</span></div><div class="form-group"><label for="contactPhone">Phone Number</label><input type="tel" id="contactPhone" name="phone" placeholder="+353 ..."></div><div class="form-group"><label for="contactService">Service Required</label><select id="contactService" name="service"><option value="">Select a service...</option><option>Company Registration</option><option>Accounts & Bookkeeping</option><option>Taxation Services</option><option>Medical Professionals</option><option>Business Set-Up</option><option>Individual Services</option><option>Corporate Services</option><option>General Enquiry</option></select></div><div class="form-group"><label for="contactMessage">Message</label><textarea id="contactMessage" name="message" placeholder="Tell us about your requirements..." required></textarea><span class="form-error-msg">Please enter a message</span></div><div class="checkbox-group" style="margin-bottom:1.2rem"><input type="checkbox" id="contactConsent" name="gdpr_consent" required><label for="contactConsent">I consent to HRA Accountant collecting and storing my data in accordance with the <a href="#privacy" onclick="safeNavigate('privacy'); return false;" style="color:var(--accent);text-decoration:underline">Privacy Policy</a>.</label></div><button class="btn-primary" style="width:100%;justify-content:center;padding:.85rem;font-size:.92rem" onclick="submitContact()">Send Message →</button></div></div></div></section>`,
    register: `<div class="page-hero"><div class="page-hero-ring"></div><div class="page-hero-inner"><span class="section-label">Register a Company</span><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,5vw,3rem);line-height:1.15;margin-bottom:1rem">Register Your Irish Limited Company in 3 Days</h1><p style="color:var(--light-muted);line-height:1.8">Fast, hassle-free company registration with free tax registrations and transparent pricing.</p></div></div><section style="background:var(--bg)"><div style="text-align:center;margin-bottom:3rem"><span class="section-label" data-reveal="fade">Simple Process</span><h2 class="section-title" data-reveal="up">How It Works</h2></div><div class="register-steps"><div class="rstep" data-reveal="up"><div class="rstep-num">1</div><h4>Company Name Check</h4><p>We verify your chosen name directly with the CRO.</p></div><div class="rstep" data-reveal="up"><div class="rstep-num">2</div><h4>Complete the Form</h4><p>Fill in our simple online registration form — just a few minutes.</p></div><div class="rstep" data-reveal="up"><div class="rstep-num">3</div><h4>Documents to Your Inbox</h4><p>Receive all required documents within 3 days.</p></div></div><div style="max-width:900px;margin:0 auto 4rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem"><div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem" data-reveal="left"><h4 style="font-size:.95rem;font-weight:600;margin-bottom:1.2rem;color:var(--accent)">📦 What's Included</h4><ul class="pkg-features" style="margin-bottom:0"><li>Free Company Name Check</li><li>Certificate of Incorporation</li><li>Company Constitution</li><li>Share Certificates</li><li>All Third-Party Fees</li></ul></div><div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem" data-reveal="right"><h4 style="font-size:.95rem;font-weight:600;margin-bottom:1.2rem;color:var(--accent)">🎁 Free Tax Registrations</h4><ul class="pkg-features" style="margin-bottom:0"><li>Corporation Tax Registration</li><li>VAT Registration</li><li>Payroll Tax (PAYE) Setup</li><li>Revenue Online Service (ROS)</li></ul></div></div><div class="register-form-wrap" data-reveal="up" style="max-width:900px"><div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.4rem"><div style="width:38px;height:38px;border-radius:10px;background:rgba(34,211,160,.1);border:1px solid rgba(34,211,160,.2);display:flex;align-items:center;justify-content:center;font-size:1.1rem">🏢</div><h3 style="margin:0">Company Registration Form</h3></div><p class="sub">Director 1 information is <strong style="color:var(--accent)">mandatory</strong>. Director 2 / Secretary details are optional.</p><div id="registerSuccess" class="form-success">✓ Request sent! Our team will contact you within one business day.</div><div id="registerFormBody"><div class="form-divider">Company Details</div><div class="form-row"><div class="form-group"><label for="regCompanyName1">Proposed Company Name (1st Choice) *</label><input type="text" id="regCompanyName1" name="company_name_1" placeholder="e.g. Smith Trading Ltd" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regCompanyName2">Proposed Company Name (2nd Choice)</label><input type="text" id="regCompanyName2" name="company_name_2" placeholder="Backup name"></div></div><div class="form-row"><div class="form-group"><label for="regBusinessNature">Nature / Type of Business *</label><input type="text" id="regBusinessNature" name="business_nature" placeholder="e.g. IT Consulting" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regOfficeAddress">Registered Office Address</label><input type="text" id="regOfficeAddress" name="office_address" placeholder="Leave blank for our address service"></div></div><div class="form-divider">Director 1 Details</div><div class="form-row"><div class="form-group"><label for="regDir1Fname">First Name *</label><input type="text" id="regDir1Fname" name="dir1_first_name" placeholder="First name" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regDir1Lname">Last Name *</label><input type="text" id="regDir1Lname" name="dir1_last_name" placeholder="Last name" required><span class="form-error-msg">Required</span></div></div><div class="form-row"><div class="form-group"><label for="regDir1Dob">Date of Birth *</label><input type="date" id="regDir1Dob" name="dir1_dob" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regDir1Nationality">Nationality *</label><input type="text" id="regDir1Nationality" name="dir1_nationality" placeholder="e.g. Irish" required><span class="form-error-msg">Required</span></div></div><div class="form-row"><div class="form-group"><label for="regDir1PPS">PPS Number *</label><input type="text" id="regDir1PPS" name="dir1_pps" placeholder="e.g. 1234567A" required><span class="form-error-msg">Required</span></div><div class="form-group"><label for="regDir1Occupation">Occupation *</label><input type="text" id="regDir1Occupation" name="dir1_occupation" placeholder="e.g. Software Engineer" required><span class="form-error-msg">Required</span></div></div><div class="form-group"><label for="regDir1Address">Home Address *</label><input type="text" id="regDir1Address" name="dir1_address" placeholder="Full residential address including Eircode" required><span class="form-error-msg">Required</span></div><div class="form-row"><div class="form-group"><label for="regDir1Email">Email Address *</label><input type="email" id="regDir1Email" name="dir1_email" placeholder="director1@email.com" required><span class="form-error-msg">Valid email required</span></div><div class="form-group"><label for="regDir1Phone">Phone Number *</label><input type="tel" id="regDir1Phone" name="dir1_phone" placeholder="+353 ..." required><span class="form-error-msg">Required</span></div></div><div class="form-divider">Director 2 / Secretary</div><p style="font-size:.82rem;color:var(--muted);margin-bottom:1rem">Leave blank if not required.</p><div class="form-row"><div class="form-group"><label for="regDir2Fname">First Name</label><input type="text" id="regDir2Fname" name="dir2_first_name" placeholder="First name"></div><div class="form-group"><label for="regDir2Lname">Last Name</label><input type="text" id="regDir2Lname" name="dir2_last_name" placeholder="Last name"></div></div><div class="form-row"><div class="form-group"><label for="regDir2Dob">Date of Birth</label><input type="date" id="regDir2Dob" name="dir2_dob"></div><div class="form-group"><label for="regDir2Nationality">Nationality</label><input type="text" id="regDir2Nationality" name="dir2_nationality" placeholder="e.g. Irish"></div></div><div class="form-group"><label for="regDir2Address">Home Address</label><input type="text" id="regDir2Address" name="dir2_address" placeholder="Full residential address"></div><div class="form-row"><div class="form-group"><label for="regDir2Email">Email Address</label><input type="email" id="regDir2Email" name="dir2_email" placeholder="director2@email.com"></div><div class="form-group"><label for="regDir2Phone">Phone Number</label><input type="tel" id="regDir2Phone" name="dir2_phone" placeholder="+353 ..."></div></div><div class="form-divider">Additional Services</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-bottom:1.2rem"><label style="display:flex;align-items:flex-start;gap:.7rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.9rem;cursor:pointer"><input type="checkbox" name="service_registered_address" value="yes" style="accent-color:var(--accent);flex-shrink:0;margin-top:3px"><div><div style="font-size:.85rem;font-weight:600">Registered Address</div><div style="font-size:.76rem;color:var(--muted)">Dublin address for CRO</div></div></label><label style="display:flex;align-items:flex-start;gap:.7rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.9rem;cursor:pointer"><input type="checkbox" name="service_nominee_secretary" value="yes" style="accent-color:var(--accent);flex-shrink:0;margin-top:3px"><div><div style="font-size:.85rem;font-weight:600">Nominee Secretary</div><div style="font-size:.76rem;color:var(--muted)">We act as secretary</div></div></label><label style="display:flex;align-items:flex-start;gap:.7rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.9rem;cursor:pointer"><input type="checkbox" name="service_vat_registration" value="yes" style="accent-color:var(--accent);flex-shrink:0;margin-top:3px"><div><div style="font-size:.85rem;font-weight:600">VAT Registration</div><div style="font-size:.76rem;color:var(--muted)">Free with package</div></div></label><label style="display:flex;align-items:flex-start;gap:.7rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.9rem;cursor:pointer"><input type="checkbox" name="service_paye_registration" value="yes" style="accent-color:var(--accent);flex-shrink:0;margin-top:3px"><div><div style="font-size:.85rem;font-weight:600">PAYE Registration</div><div style="font-size:.76rem;color:var(--muted)">Free employer setup</div></div></label></div><div class="form-divider">Additional Information</div><div class="form-group"><label for="regNotes">Additional Notes</label><textarea id="regNotes" name="notes" placeholder="Any specific requirements or questions..."></textarea></div><div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1.2rem"><div class="checkbox-group"><input type="checkbox" id="confirmAccuracy" name="confirm_accuracy"><label for="confirmAccuracy">I confirm that all information provided is accurate and complete.</label></div><div class="checkbox-group"><input type="checkbox" id="confirmTerms" name="confirm_terms"><label for="confirmTerms">I agree to HRA Accountant's terms of service.</label></div></div><button class="btn-primary" style="width:100%;justify-content:center;padding:.9rem;font-size:.95rem;border-radius:12px" onclick="submitRegister()">Send Request →</button></div></div></section>`,
    privacy: `<div class="page-hero"><div class="page-hero-ring"></div><div class="page-hero-inner"><span class="section-label">Legal</span><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,5vw,3rem);line-height:1.15;margin-bottom:1rem">Privacy Policy</h1><p style="color:var(--light-muted);line-height:1.8">Last updated: ${new Date().getFullYear()}</p></div></div><section style="background:var(--bg)"><div style="max-width:800px;margin:0 auto;color:var(--light-muted);line-height:1.8;font-size:.92rem"><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-bottom:1rem">1. Introduction</h2><p>HRA Accountant ("we", "us", or "our") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our website or use our services, in compliance with the General Data Protection Regulation (GDPR) and applicable Irish law.</p><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">2. What Data We Collect</h2><p>We may collect the following types of personal data when you fill out a form or contact us:</p><ul style="margin-left:1.5rem;margin-top:.5rem"><li>Identity data: first name, last name</li><li>Contact data: email address, phone number</li><li>Business data: company name, nature of business, PPS number (if provided for company registration)</li><li>Technical data: IP address, browser type, time zone setting (automatically collected via server logs)</li></ul><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">3. How We Use Your Data</h2><p>We use your personal data only for the following purposes:</p><ul style="margin-left:1.5rem;margin-top:.5rem"><li>To respond to your enquiry and provide our services</li><li>To comply with legal obligations (e.g., company formation requirements)</li><li>To improve our website experience</li></ul><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">4. Legal Basis (GDPR)</h2><p>Under GDPR, we rely on one or more of the following lawful bases:</p><ul style="margin-left:1.5rem;margin-top:.5rem"><li><strong>Consent:</strong> You have given clear consent for us to process your personal data for a specific purpose (e.g., by submitting a form).</li><li><strong>Contract:</strong> Processing is necessary for a contract we have with you, or because you have asked us to take specific steps before entering into a contract.</li><li><strong>Legal obligation:</strong> Processing is necessary for compliance with a legal obligation (e.g., tax reporting).</li></ul><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">5. Data Retention</h2><p>We retain your personal data only for as long as necessary to fulfil the purposes we collected it for, including satisfying any legal, accounting, or reporting requirements.</p><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">6. Your Rights</h2><p>Under GDPR, you have the right to:</p><ul style="margin-left:1.5rem;margin-top:.5rem"><li>Request access to your personal data</li><li>Request correction or erasure of your personal data</li><li>Object to processing of your personal data</li><li>Request restriction of processing</li><li>Request data portability</li><li>Withdraw consent at any time</li></ul><p>To exercise any of these rights, please contact us at <a href="mailto:info@hraaccountant.ie" style="color:var(--accent)">info@hraaccountant.ie</a>.</p><h2 style="font-family:'DM Serif Display',serif;color:var(--text);font-size:1.8rem;margin-top:2rem;margin-bottom:1rem">7. Contact Us</h2><p>If you have any questions about this privacy policy or our data practices, please contact us at:</p><p style="margin-top:.5rem">📍 Unit 8, Greenhills Business Centre, Dublin, D24 H340<br>📧 <a href="mailto:info@hraaccountant.ie" style="color:var(--accent)">info@hraaccountant.ie</a><br>📞 <a href="tel:0899893240" style="color:var(--accent)">089 989 3240</a></p></div></section>`
  };

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
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    const descMap = {
      home: 'Chartered accountants in Ireland. Register a company in 3 days, full compliance, fixed fees.',
      about: 'Learn about HRA Accountant – our values, expertise, and commitment to Irish businesses.',
      contact: 'Contact HRA Accountant for a free consultation. Call, email, or visit our Dublin office.',
      register: 'Register your Irish limited company in 3 days. Fixed fee, free tax registrations, no hidden costs.',
      service: serviceKey ? `${serviceData[serviceKey]?.title} – expert accounting and tax services in Ireland.` : 'Professional accounting services for businesses and medical professionals.'
    };
    metaDesc.content = descMap[page] || descMap.home;
  }

  // showPage: skips injection if home already has content
  function showPage(id, skipHash = false) {
    if (id === 'home') {
      const homeDiv = document.getElementById('page-home');
      if (homeDiv && homeDiv.innerHTML.trim().length > 500) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active', 'page-enter'));
        homeDiv.classList.add('active');
        requestAnimationFrame(() => {
          homeDiv.classList.add('page-enter');
          window.scrollTo({top:0, behavior:'instant'});
          setTimeout(() => { initReveal(); enhanceAccessibility(); }, 100);
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => initParticles(), { timeout: 2000 });
          } else {
            setTimeout(initParticles, 100);
          }
        });
        updateTitle('home');
        if (!skipHash) window.location.hash = '#home';
        closeMobile();
        return;
      }
    }
    stopParticles();
    const page = document.getElementById('page-' + id);
    if (!page) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active', 'page-enter'));
    if (id === 'service') {
      page.classList.add('active');
      requestAnimationFrame(() => { page.classList.add('page-enter'); window.scrollTo({top:0,behavior:'instant'}); setTimeout(() => { initReveal(); enhanceAccessibility(); }, 100); });
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
      setTimeout(() => { initReveal(); enhanceAccessibility(); }, 100);
      if (id === 'home') {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => initParticles(), { timeout: 2000 });
        } else {
          setTimeout(initParticles, 100);
        }
      }
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
    setTimeout(enhanceAccessibility, 50);
  }

  // Mobile menu
  function toggleMobile() {
    const nav = document.getElementById('mobileNav'), btn = document.querySelector('.mobile-menu-btn');
    const isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
  function closeMobile() {
    const nav = document.getElementById('mobileNav');
    if (nav) nav.classList.remove('open');
    const btn = document.querySelector('.mobile-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function toggleMobileSub(btn) {
    btn.nextElementSibling.classList.toggle('open');
    btn.setAttribute('aria-expanded', btn.nextElementSibling.classList.contains('open'));
  }
  document.addEventListener('click', e => { if (!e.target.closest('#mobileNav') && !e.target.closest('.mobile-menu-btn')) closeMobile(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobile(); });

  function toggleFaq(el) {
    const item = el.parentElement, list = el.closest('.faq-list'), currentlyOpen = list.querySelector('.faq-item.open');
    if (currentlyOpen && currentlyOpen !== item) currentlyOpen.classList.remove('open');
    item.classList.toggle('open');
  }

  function clearErrorOnInput() {
    document.body.addEventListener('input', e => {
      const el = e.target;
      if (el.classList.contains('form-error')) {
        el.classList.remove('form-error');
        el.setAttribute('aria-invalid', 'false');
        const errMsg = el.nextElementSibling;
        if (errMsg && errMsg.classList.contains('form-error-msg')) errMsg.style.display = 'none';
      }
    });
  }

  function validateContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return false;
    const hp = document.getElementById('contact_hp');
    if (hp && hp.value.trim() !== '') return false;
    let valid = true;
    form.querySelectorAll('[required]').forEach(f => {
      if (f.type === 'checkbox') {
        if (!f.checked) { f.closest('.checkbox-group').style.border = '1px solid #ff6b6b'; f.setAttribute('aria-invalid', 'true'); valid = false; }
        else { f.closest('.checkbox-group').style.border = '1px solid var(--border)'; f.setAttribute('aria-invalid', 'false'); }
        return;
      }
      const error = f.nextElementSibling;
      if (!f.value.trim()) {
        f.classList.add('form-error'); f.setAttribute('aria-invalid', 'true');
        if (error && error.classList.contains('form-error-msg')) error.style.display = 'block';
        valid = false;
      } else {
        f.classList.remove('form-error'); f.setAttribute('aria-invalid', 'false');
        if (error && error.classList.contains('form-error-msg')) error.style.display = 'none';
      }
    });
    return valid;
  }

  function submitContact() {
    if (!validateContactForm()) return;
    const form = document.getElementById('contactForm');
    form.style.display = 'none';
    const successDiv = document.getElementById('contactSuccess');
    successDiv.style.display = 'block';
    successDiv.setAttribute('role', 'status');
    successDiv.setAttribute('aria-live', 'polite');
  }

  function validateRegisterForm() {
    const body = document.getElementById('registerFormBody');
    if (!body) return false;
    let valid = true;
    body.querySelectorAll('[required]').forEach(f => {
      const errorEl = f.nextElementSibling;
      if (!f.value.trim()) {
        f.classList.add('form-error'); f.setAttribute('aria-invalid', 'true');
        if (errorEl && errorEl.classList.contains('form-error-msg')) errorEl.style.display = 'block';
        valid = false;
      } else {
        f.classList.remove('form-error'); f.setAttribute('aria-invalid', 'false');
        if (errorEl && errorEl.classList.contains('form-error-msg')) errorEl.style.display = 'none';
      }
    });
    const accuracy = document.getElementById('confirmAccuracy'), terms = document.getElementById('confirmTerms');
    if (accuracy && !accuracy.checked) { accuracy.closest('.checkbox-group').style.border = '1px solid #ff6b6b'; valid = false; }
    else if (accuracy) accuracy.closest('.checkbox-group').style.border = '1px solid var(--border)';
    if (terms && !terms.checked) { terms.closest('.checkbox-group').style.border = '1px solid #ff6b6b'; valid = false; }
    else if (terms) terms.closest('.checkbox-group').style.border = '1px solid var(--border)';
    return valid;
  }

  function submitRegister() {
    if (!validateRegisterForm()) return;
    const body = document.getElementById('registerFormBody');
    body.style.display = 'none';
    const successDiv = document.getElementById('registerSuccess');
    successDiv.style.display = 'block';
    successDiv.setAttribute('role', 'status');
    successDiv.setAttribute('aria-live', 'polite');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function handleHashChange() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) { showPage('home'); return; }
    if (hash.startsWith('service/')) showServicePage(hash.split('service/')[1]);
    else if (['home','about','contact','register','privacy'].includes(hash)) showPage(hash);
    else showPage('home');
  }

  window.addEventListener('hashchange', handleHashChange);
  document.addEventListener('DOMContentLoaded', () => {
    clearErrorOnInput();
    if (window.scrollY > 40) document.getElementById('mainNav').classList.add('scrolled');
    if (window.innerWidth <= 900) document.getElementById('mainNav').classList.add('scrolled');
    const copyrightEl = document.querySelector('.footer-bottom p');
    if (copyrightEl) copyrightEl.innerHTML = copyrightEl.innerHTML.replace(/\d{4}/, new Date().getFullYear());
    if (!window.location.hash) window.location.hash = '#home';
    else handleHashChange();
    enhanceAccessibility();
    if (document.getElementById('page-home').classList.contains('active')) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => initParticles(), { timeout: 2000 });
      } else {
        setTimeout(initParticles, 100);
      }
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
