/* BAROWO — light motion + always start new pages at the top */
(function () {
  // A new page without #anchor always opens at the top.
  // scrollIntoView also moves outer scroll containers (e.g. when the site is shown inside a preview frame).
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  function toTop() {
    if (location.hash || nav.type === 'back_forward') return;
    window.scrollTo(0, 0);
    try { document.documentElement.scrollIntoView({ block: 'start', behavior: 'instant' }); } catch (e) {
      try { document.documentElement.scrollIntoView(true); } catch (e2) {}
    }
  }
  toTop();
  window.addEventListener('load', toTop);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var selectors = [
    'h2', '.idx', '.lead', '.cell', '.person', '.tbl', '.note', '.faq-item', '.frame',
    '.label', '.service-block', '.service-card', '.post-card', '.case-card', '.highlights li',
    '.stat-card', '.compare-table', '.side-panel', '.service-inline-cta', '.service-bottom-cta',
    '.cta-band', '.s-cta', '.article-cta', '.policy-card h2', 'details', '.planner-hero-note', '.ft > *',
    '.rule', '.tbl .r', '.rev', '.rev-more', '.tbl-note', '.team-note', '.hero-media', '.service-card-media', '.post-card-media'
  ].join(',');

  var vh = window.innerHeight;
  var nodes = Array.prototype.filter.call(document.querySelectorAll(selectors), function (el) {
    if (el.closest('nav, .hero, .s-hero, .mobile-cta, .callback-modal')) return false;
    return el.getBoundingClientRect().top > vh * 0.9; // only animate what is below the first screen
  });

  // no nested reveals: animate only the outer element
  nodes = nodes.filter(function (el) { return !nodes.some(function (o) { return o !== el && o.contains(el); }); });
  nodes.forEach(function (el) { el.classList.add('rv'); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(siblings, 6) * 70 + 'ms';
      el.classList.add('rv-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  nodes.forEach(function (el) { io.observe(el); });

  // fallback: anything already above the bottom of the screen (fast scroll, page end) is shown
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var lim = window.innerHeight;
      nodes.forEach(function (el) { if (!el.classList.contains('rv-in') && el.getBoundingClientRect().top < lim) el.classList.add('rv-in'); });
    });
  }, { passive: true });

  // safety: always show everything when printing
  window.addEventListener('beforeprint', function () { nodes.forEach(function (el) { el.classList.add('rv-in'); }); });

  // count-up for the key numbers (3000 zł, 100+, 6–8 h, 150 km)
  if (!/bot|crawl|spider|lighthouse|headless/i.test(navigator.userAgent)) Array.prototype.forEach.call(document.querySelectorAll('.facts b'), function (b) {
    var m = b.textContent.match(/^(\d+)(.*)$/);
    if (!m || /–/.test(b.textContent)) return;
    var end = parseInt(m[1], 10), rest = m[2], t0 = null, dur = 1200;
    b.textContent = '0' + rest;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      b.textContent = Math.round(end * e) + rest;
      if (k < 1) requestAnimationFrame(step);
    }
    setTimeout(function () { requestAnimationFrame(step); }, 500);
  });
})();
