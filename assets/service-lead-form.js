/* Short lead form on service pages. Same relay, payload and tracking as the homepage form. */
(function () {
  var form = document.querySelector('[data-service-lead-form]');
  if (!form) return;

  var consentField = form.querySelector('input[name="privacy_consent"]');
  var consentError = form.querySelector('.form-consent-error');
  var statusBox = form.querySelector('.form-status');
  var submitButton = form.querySelector('.form-btn');
  var submitLabel = submitButton ? submitButton.textContent : '';
  var consentMessage = 'Aby wysłać formularz, zaznacz zgodę na przetwarzanie danych.';
  var pageUrlField = form.querySelector('input[name="page_url"]');
  var referrerField = form.querySelector('input[name="referrer"]');

  function syncMeta() {
    if (pageUrlField) pageUrlField.value = window.location.href;
    if (referrerField) referrerField.value = document.referrer || '';
  }

  function setStatus(type, message) {
    if (!statusBox) return;
    statusBox.className = 'form-status';
    statusBox.textContent = message || '';
    if (!message) return;
    statusBox.classList.add('is-visible');
    if (type) statusBox.classList.add('is-' + type);
  }

  function setSubmitting(isSubmitting) {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? 'Wysyłamy zapytanie…' : submitLabel;
  }

  function syncConsent() {
    if (!consentField) return true;
    var ok = consentField.checked;
    consentField.setCustomValidity(ok ? '' : consentMessage);
    if (consentError) consentError.textContent = ok ? '' : consentMessage;
    return ok;
  }

  if (consentField) consentField.addEventListener('change', syncConsent);

  syncMeta();
  var params = new URLSearchParams(window.location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (name) {
    var field = form.querySelector('input[name="' + name + '"]');
    if (field) field.value = params.get(name) || '';
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var consentOk = syncConsent();
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
    if (!consentOk) return;

    syncMeta();
    setStatus('', '');
    setSubmitting(true);

    try {
      var body = new URLSearchParams();
      new FormData(form).forEach(function (value, key) { body.append(key, value); });
      var submitUrl = new URL(form.action);
      submitUrl.searchParams.set('format', 'json');
      if (window.BAROWO_attr) window.BAROWO_attr.merge(body);
      if (window.BAROWO_prepareLead) await window.BAROWO_prepareLead(body);

      var response = await fetch(submitUrl.toString(), {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: body
      });
      var payload = await response.json().catch(function () { return null; });
      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error((payload && payload.error) || 'submit_failed');
      }

      form.reset();
      if (consentError) consentError.textContent = '';
      if (window.BAROWO_trackLead) window.BAROWO_trackLead(payload, 'Formularz na stronie usługi', body);
      setStatus('success', 'Dziękujemy. Zapytanie zostało wysłane. Zespół BAROWO wróci do Ciebie możliwie szybko z odpowiedzią i dostępnością terminu.');
    } catch (error) {
      setStatus('error', 'Nie udało się wysłać formularza z tej strony. Zadzwoń do nas lub napisz na barowo.pl@gmail.com, a zajmiemy się tym od razu.');
    } finally {
      syncMeta();
      setSubmitting(false);
    }
  });
})();
