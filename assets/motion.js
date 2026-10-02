/* BAROWO — light motion + always start new pages at the top */
(function () {
  // A new page without #anchor always opens at the top (no restored mid-page scroll).
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var selectors = [
    'h2', '.idx', '.lead', '.cell', '.person', '.tbl', '.note', '.faq-item', '.frame',
    '.label', '.service-block', '.service-card', '.post-card', '.case-card', '.highlights li',
    '.stat-card', '.compare-table', '.side-panel', '.service-inline-cta', '.service-bottom-cta',
    '.cta-band', '.s-cta', '.article-cta', '.policy-card h2', 'details', '.planner-hero-note', '.ft > *'
  ].join(',');

  var vh = window.innerHeight;
  var nodes = Array.prototype.filter.call(document.querySelectorAll(selectors), function (el) {
    if (el.closest('nav, .hero, .s-hero, .mobile-cta, .callback-modal')) return false;
    return el.getBoundingClientRect().top > vh * 0.9; // only animate what is below the first screen
  });

  nodes.forEach(function (el) { el.classList.add('rv'); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(siblings, 4) * 60 + 'ms';
      el.classList.add('rv-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  nodes.forEach(function (el) { io.observe(el); });

  // safety: if something stays hidden (e.g. print, odd layouts), show everything after 4 s
  setTimeout(function () { nodes.forEach(function (el) { el.classList.add('rv-in'); }); }, 4000);
})();
