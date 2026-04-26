(function () {
  if (document.getElementById('callbackModal')) return;

  var modal = document.createElement('div');
  modal.className = 'callback-modal';
  modal.id = 'callbackModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'callbackTitle');
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = [
    '<div class="callback-backdrop" data-callback-close></div>',
    '<div class="callback-dialog">',
    '<button class="callback-close" type="button" data-callback-close aria-label="Zamknij formularz">×</button>',
    '<div class="callback-kicker">Szybki kontakt</div>',
    '<div class="callback-title" id="callbackTitle">ZOSTAW NUMER.<br><span class="red">ODDZWONIMY.</span></div>',
    '<p class="callback-text">Jeśli planujesz wesele, urodziny albo event, zostaw telefon. Oddzwonimy możliwie szybko i powiemy, czy mamy wolny termin.</p>',
    '<form class="callback-form" id="callbackForm" action="https://barowo-telegram-relay.vanatarasuk20.workers.dev/lead" method="POST">',
    '<label for="callbackPhone">Telefon *<input type="tel" id="callbackPhone" name="phone" placeholder="+48 000 000 000" autocomplete="tel" required></label>',
    '<label class="callback-consent" for="callbackConsent"><input type="checkbox" id="callbackConsent" name="privacy_consent" required><span>Wyrażam zgodę na kontakt telefoniczny i przetwarzanie danych zgodnie z <a href="/polityka-prywatnosci/">Polityką prywatności</a>.</span></label>',
    '<input type="hidden" name="name" value="Prośba o telefon ze strony">',
    '<input type="hidden" name="source" value="website_callback_popup">',
    '<input type="hidden" name="message" value="Użytkownik był na stronie ponad minutę i poprosił o szybki telefon zwrotny.">',
    '<input type="hidden" name="return_url" value="https://barowo.com/#contact">',
    '<input type="hidden" name="page_url" value="">',
    '<input type="hidden" name="referrer" value="">',
    '<input type="hidden" name="utm_source" value="">',
    '<input type="hidden" name="utm_medium" value="">',
    '<input type="hidden" name="utm_campaign" value="">',
    '<input type="hidden" name="utm_content" value="">',
    '<input type="hidden" name="utm_term" value="">',
    '<button class="callback-submit" type="submit">Oddzwońcie do mnie</button>',
    '<div class="callback-status" aria-live="polite"></div>',
    '</form>',
    '</div>'
  ].join('');

  document.body.appendChild(modal);

  var form = document.getElementById('callbackForm');
  var phone = document.getElementById('callbackPhone');
  var status = form.querySelector('.callback-status');
  var submit = form.querySelector('.callback-submit');
  var submitLabel = submit ? submit.textContent : '';
  var storageKey = 'barowo_callback_popup_state';
  var urlParams = new URLSearchParams(window.location.search);
  var delayMs = urlParams.has('callback_test') ? 900 : 60000;
  var dismissTtl = 24 * 60 * 60 * 1000;
  var submitTtl = 30 * 24 * 60 * 60 * 1000;

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Object.assign({}, state, { at: Date.now() })));
    } catch (error) {
      // Storage may be unavailable in private contexts.
    }
  }

  function shouldShow() {
    var state = readState();
    if (!state || !state.type || !state.at) return true;
    var age = Date.now() - Number(state.at);
    if (state.type === 'submitted') return age > submitTtl;
    if (state.type === 'dismissed') return age > dismissTtl;
    return true;
  }

  function fillMeta() {
    var pageUrlField = form.querySelector('input[name="page_url"]');
    var referrerField = form.querySelector('input[name="referrer"]');
    if (pageUrlField) pageUrlField.value = window.location.href;
    if (referrerField) referrerField.value = document.referrer || '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (fieldName) {
      var field = form.querySelector('input[name="' + fieldName + '"]');
      if (field) field.value = urlParams.get(fieldName) || '';
    });
  }

  function setStatus(type, message) {
    if (!status) return;
    status.className = 'callback-status';
    if (type) status.classList.add('is-' + type);
    status.textContent = message || '';
  }

  function openModal() {
    if (!shouldShow()) return;
    fillMeta();
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('callback-open');
    if (phone) phone.focus({ preventScroll: true });
  }

  function closeModal(reason) {
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('callback-open');
    if (reason !== 'submitted') writeState({ type: 'dismissed' });
  }

  window.setTimeout(openModal, delayMs);

  modal.querySelectorAll('[data-callback-close]').forEach(function (button) {
    button.addEventListener('click', function () { closeModal('dismissed'); });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal.classList.contains('is-visible')) {
      closeModal('dismissed');
    }
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

    fillMeta();
    setStatus('', '');
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Wysyłamy…';
    }

    try {
      var formData = new FormData(form);
      var body = new URLSearchParams();
      var submitUrl = new URL(form.action);
      submitUrl.searchParams.set('format', 'json');
      formData.forEach(function (value, key) { body.append(key, value); });

      var response = await fetch(submitUrl.toString(), {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: body
      });
      var payload = await response.json().catch(function () { return null; });
      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error((payload && payload.error) || 'callback_submit_failed');
      }

      form.reset();
      writeState({ type: 'submitted' });
      setStatus('success', 'Dziękujemy. Oddzwonimy możliwie szybko.');
      window.setTimeout(function () { closeModal('submitted'); }, 1800);
    } catch (error) {
      setStatus('error', 'Nie udało się wysłać numeru. Zadzwoń do nas: +48 889 168 003.');
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submitLabel;
      }
    }
  });
})();
