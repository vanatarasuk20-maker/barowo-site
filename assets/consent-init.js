/* BAROWO — cookie consent + Meta Pixel / Google tags (loaded only after consent).
   To switch tracking on, put the IDs below. Nothing loads before the visitor agrees. */
(function () {
  var config = {
    version: '20261003',
    integrations: {
      metaPixelId: null,     // e.g. '123456789012345' from Meta Events Manager
      ga4Id: null,           // e.g. 'G-XXXXXXXXXX' (optional)
      googleAdsId: null      // e.g. 'AW-XXXXXXXXX' (optional)
    }
  };
  var STORAGE_KEY = 'barowo_consent_v1';
  var w = window, d = document;

  function hasTracking() {
    var i = config.integrations;
    return !!(i.metaPixelId || i.ga4Id || i.googleAdsId);
  }
  function read() {
    try { var v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); return v && v.version === config.version ? v : null; }
    catch (e) { return null; }
  }
  function save(analytics, marketing) {
    var v = { version: config.version, necessary: true, analytics: !!analytics, marketing: !!marketing, ts: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch (e) {}
    return v;
  }

  /* ---------- Google Consent Mode v2 (defaults: denied) ---------- */
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  w.gtag = w.gtag || gtag;
  w.gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted',
    wait_for_update: 500
  });

  var loaded = { meta: false, google: false };

  function loadScript(src) {
    var s = d.createElement('script'); s.async = true; s.src = src; d.head.appendChild(s);
  }
  function loadMeta() {
    var id = config.integrations.metaPixelId;
    if (!id || loaded.meta) return;
    loaded.meta = true;
    /* official Meta Pixel base code */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(w, d, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    w.fbq('init', id);
    w.fbq('track', 'PageView');
  }
  function loadGoogle() {
    var i = config.integrations, first = i.ga4Id || i.googleAdsId;
    if (!first || loaded.google) return;
    loaded.google = true;
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(first));
    w.gtag('js', new Date());
    if (i.ga4Id) w.gtag('config', i.ga4Id, { anonymize_ip: true });
    if (i.googleAdsId) w.gtag('config', i.googleAdsId);
  }
  function apply(c) {
    if (!c) return;
    w.gtag('consent', 'update', {
      analytics_storage: c.analytics ? 'granted' : 'denied',
      ad_storage: c.marketing ? 'granted' : 'denied',
      ad_user_data: c.marketing ? 'granted' : 'denied',
      ad_personalization: c.marketing ? 'granted' : 'denied'
    });
    if (c.marketing) loadMeta();
    if (c.analytics || c.marketing) loadGoogle();
  }

  /* ---------- events: BAROWO_track('Lead', {content_name: 'Formularz'}) ---------- */
  w.BAROWO_track = function (event, params) {
    params = params || {};
    try { if (w.fbq && loaded.meta) w.fbq('track', event, params); } catch (e) {}
    try {
      if (loaded.google) {
        var map = { Lead: 'generate_lead', Contact: 'contact' };
        w.gtag('event', map[event] || event, params);
      }
    } catch (e) {}
  };

  /* ---------- banner ---------- */
  var root;
  function close() { if (root) { root.remove(); root = null; } }
  function decide(analytics, marketing) { apply(save(analytics, marketing)); close(); }

  function render(showSettings) {
    close();
    var c = read() || { analytics: false, marketing: false };
    root = d.createElement('div');
    root.className = 'cc';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-label', 'Ustawienia plików cookies');
    root.innerHTML =
      '<div class="cc-box">' +
        '<p class="cc-title">Pliki cookies</p>' +
        '<p class="cc-text">Używamy plików cookies niezbędnych do działania strony. Za Twoją zgodą użyjemy też cookies analitycznych i marketingowych (np. Meta Pixel), żeby mierzyć skuteczność reklam. Zgodę możesz zmienić w każdej chwili. Szczegóły w <a href="/polityka-prywatnosci/">Polityce prywatności</a>.</p>' +
        '<div class="cc-settings"' + (showSettings ? '' : ' hidden') + '>' +
          '<label class="cc-row"><input type="checkbox" checked disabled> <span><b>Niezbędne</b> — działanie strony i formularzy. Zawsze aktywne.</span></label>' +
          '<label class="cc-row"><input type="checkbox" id="ccAnalytics"' + (c.analytics ? ' checked' : '') + '> <span><b>Analityczne</b> — statystyki odwiedzin.</span></label>' +
          '<label class="cc-row"><input type="checkbox" id="ccMarketing"' + (c.marketing ? ' checked' : '') + '> <span><b>Marketingowe</b> — mierzenie i dopasowanie reklam (Meta Pixel).</span></label>' +
        '</div>' +
        '<div class="cc-actions">' +
          '<button type="button" class="btn btn-o cc-btn" data-cc="reject">Tylko niezbędne</button>' +
          '<button type="button" class="btn btn-o cc-btn" data-cc="settings">' + (showSettings ? 'Zapisz wybór' : 'Ustawienia') + '</button>' +
          '<button type="button" class="btn btn-r cc-btn" data-cc="accept">Akceptuję wszystkie</button>' +
        '</div>' +
      '</div>';
    d.body.appendChild(root);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cc]'); if (!b) return;
      var a = b.getAttribute('data-cc');
      if (a === 'accept') decide(true, true);
      else if (a === 'reject') decide(false, false);
      else if (a === 'settings') {
        var box = root.querySelector('.cc-settings');
        if (box.hasAttribute('hidden')) { box.removeAttribute('hidden'); b.textContent = 'Zapisz wybór'; }
        else decide(root.querySelector('#ccAnalytics').checked, root.querySelector('#ccMarketing').checked);
      }
    });
  }

  w.BAROWO_openConsentPreferences = function () { render(true); return false; };

  /* contact clicks */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"],a[href^="mailto:"]');
    if (a) w.BAROWO_track('Contact', { content_name: a.getAttribute('href').indexOf('tel:') === 0 ? 'Telefon' : 'E-mail' });
    var o = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (o) { e.preventDefault(); render(true); }
  });

  var stored = read();
  if (stored) apply(stored);

  function init() {
    var test = /[?&]consent_test=1/.test(location.search);
    if ((!stored && hasTracking()) || test) render(false);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();

  w.BAROWO_CONSENT = config;
})();
