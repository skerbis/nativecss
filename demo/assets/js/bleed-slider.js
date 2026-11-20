/* Handbuch Layout #bleed: Regler ändert die Breite des Bleed-iframes (eigener Viewport).
   Höchstwert = verfügbare Breite des Rahmens (wird bei Größenänderung nachgeführt). */
(function () {
  "use strict";
  document.querySelectorAll("[data-bleed-frame]").forEach(function (input) {
    var frame = document.getElementById(input.getAttribute("data-bleed-frame"));
    var out = document.getElementById(input.getAttribute("data-bleed-out"));
    if (!frame) return;
    var wrap = frame.parentElement;
    var atMax = true;
    function apply() {
      frame.style.inlineSize = input.value + "px";
      if (out) out.textContent = input.value + " px";
    }
    function fit() {
      var max = Math.max(320, Math.floor(wrap.clientWidth));
      input.max = String(max);
      if (atMax || Number(input.value) > max) input.value = String(max);
      apply();
    }
    input.addEventListener("input", function () {
      atMax = Number(input.value) >= Number(input.max);
      apply();
    });
    if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap);
    fit();
  });
})();
