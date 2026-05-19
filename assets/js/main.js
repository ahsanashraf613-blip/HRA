/* =============================================================
   HRA ACCOUNTANT – MAIN JAVASCRIPT (WITH SMOOTH SCROLL)
   ============================================================= */
(function () {
  'use strict';

  /* ---------- SMOOTH SCROLL ENGINE (lerp‑based) ---------- */
  // Makes every scroll movement fluid and slower, improving perceived performance
  const scroll = {
    target: 0,
    current: 0,
    ease: 0.08,        // lower = slower / smoother (0.08 is a good premium feel)
    rafId: null
  };

  function smoothScroll() {
    scroll.current += (scroll.target - scroll.current) * scroll.ease;
    window.scrollTo(0, Math.round(scroll.current * 100) / 100);
    if (Math.abs(scroll.target - scroll.current) > 0.5) {
      scroll.rafId = requestAnimationFrame(smoothScroll);
    }
  }

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    scroll.target += e.deltaY;
    scroll.target = Math.max(0, Math.min(scroll.target, document.body.scrollHeight - window.innerHeight));
    if (!scroll.rafId) {
      scroll.rafId = requestAnimationFrame(smoothScroll);
    }
  }, { passive: false });

  // Touch support for mobile
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const deltaY = touchStartY - e.touches[0].clientY;
    touchStartY = e.touches[0].clientY;
    scroll.target += deltaY;
    scroll.target = Math.max(0, Math.min(scroll.target, document.body.scrollHeight - window.innerHeight));
    if (!scroll.rafId) {
      scroll.rafId = requestAnimationFrame(smoothScroll);
    }
  }, { passive: false });

  // Keep target updated on resize
  window.addEventListener('resize', () => {
    scroll.target = Math.max(0, Math.min(scroll.target, document.body.scrollHeight - window.innerHeight));
  });

  /* ---------- SVG CHECKMARK ---------- */
  const chk = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

  // … rest of the file (particle canvas, serviceData, pageContent, routing, forms)
  // is exactly as in the previous fully‑corrected version.
  // I’m omitting it here for brevity – replace your main.js with the full file from
  // the last "only footer is visible" answer, but insert the smooth‑scroll block
  // right after 'use strict'; at the top.

})();
