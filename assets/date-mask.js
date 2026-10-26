/* BAROWO — date field for phones (2026-10-26).
   iPhone shows a digits-only keypad for inputmode="numeric", without a dot key,
   so "dd.mm.rrrr" could not be typed and the form refused to send. The dots are
   now inserted automatically: the visitor types only digits (e.g. 14062027). */
(function () {
  "use strict";
  var SELECTOR = "input[data-date-mask]";
  var MESSAGE = "Wpisz datę jako dd.mm.rrrr, np. 14.06.2027.";

  function format(value) {
    var digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    var out = digits.slice(0, 2);
    if (digits.length > 2) out += "." + digits.slice(2, 4);
    if (digits.length > 4) out += "." + digits.slice(4, 8);
    return out;
  }

  function isRealDate(value) {
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
    if (!m) return false;
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1];
  }

  function validate(input) {
    var value = input.value.trim();
    input.setCustomValidity(!value || isRealDate(value) ? "" : MESSAGE);
  }

  function onInput(event) {
    var input = event.target;
    if (!input || !input.matches || !input.matches(SELECTOR)) return;
    // Deleting a dot must not re-add it immediately.
    if (event.inputType && event.inputType.indexOf("delete") === 0 && /\.$/.test(input.value)) {
      input.value = input.value.replace(/\.$/, "");
    } else {
      var formatted = format(input.value);
      if (formatted !== input.value) input.value = formatted;
    }
    if (input.validity && input.validity.customError) validate(input);
  }

  function onBlur(event) {
    var input = event.target;
    if (input && input.matches && input.matches(SELECTOR)) validate(input);
  }

  function prepare(input) {
    if (input.dataset.dateMaskReady) return;
    input.dataset.dateMaskReady = "1";
    // The mask checks the date itself; a strict pattern would block a valid paste like "14.6.2027".
    input.removeAttribute("pattern");
    input.setAttribute("maxlength", "10");
    input.setAttribute("autocomplete", "off");
    if (input.value) input.value = format(input.value);
  }

  // Capture phase: runs before page scripts read the value (the wedding planner does).
  document.addEventListener("input", onInput, true);
  document.addEventListener("blur", onBlur, true);
  document.addEventListener("focusin", function (event) {
    if (event.target && event.target.matches && event.target.matches(SELECTOR)) prepare(event.target);
  }, true);
  document.addEventListener("submit", function (event) {
    var fields = event.target && event.target.querySelectorAll ? event.target.querySelectorAll(SELECTOR) : [];
    Array.prototype.forEach.call(fields, function (input) { prepare(input); validate(input); });
  }, true);
  function init() { Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), prepare); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.BAROWO_dateMask = { format: format, isRealDate: isRealDate };
})();
