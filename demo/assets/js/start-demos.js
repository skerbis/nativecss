/**
 * NativeCSS-Website - kleine Vorführungen auf der Startseite (nur Website, nicht dist/).
 * - Container Queries: Regler [data-demo-cq-range] setzt die Breite des Rahmens
 *   [data-demo-cq-frame] (Custom Property --demo-cq-w, kein Inline-Deko-Style).
 * - Cherry-Picking: summiert data-kb der angehakten Import-Zeilen. Das Ein-/Ausblenden
 *   der Vorschau-Bausteine selbst ist reines CSS (:has() im Seiten-Style).
 */
(function () {
  "use strict";

  var range = document.querySelector("[data-demo-cq-range]");
  var frame = document.querySelector("[data-demo-cq-frame]");
  var out = document.querySelector("[data-demo-cq-out]");
  if (range && frame) {
    var sync = function () {
      frame.style.setProperty("--demo-cq-w", range.value + "%");
      if (out) out.textContent = range.value + " %";
    };
    range.addEventListener("input", sync);
    sync();
  }

  var total = document.querySelector("[data-demo-pick-total]");
  var picks = document.querySelectorAll("[data-pick][data-kb]");
  if (total && picks.length) {
    var lang = (document.documentElement.lang || "de").slice(0, 2);
    var update = function () {
      var sum = 0;
      Array.prototype.forEach.call(picks, function (input) {
        if (input.checked) sum += parseFloat(input.getAttribute("data-kb")) || 0;
      });
      total.textContent = sum.toLocaleString(lang === "en" ? "en" : "de", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };
    Array.prototype.forEach.call(picks, function (input) {
      input.addEventListener("change", update);
    });
    update();
  }
})();
