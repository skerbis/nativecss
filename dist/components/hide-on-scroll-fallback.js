/**
 * NativeCSS - JS-Fallback für .ncss-hide-on-scroll (helpers/scroll.css) in Browsern ohne
 * container-type: scroll-state (Stand August 2026: Firefox und Safari, per WebSearch
 * bestätigt - siehe SKILL.md Landmine 26 für den bereits verworfenen CSS-only-Fallback-
 * Versuch und dessen echten, per Playwright-WebKit reproduzierten Bug: eine tief
 * verschachtelte, per @property typisierte calc()-Kette löste in WebKit falsch auf,
 * sobald sie in einem weiteren calc() konsumiert wurde - der Header blieb nach
 * Hoch-Scrollen dauerhaft versteckt, schlimmer als gar kein Fallback). Dieselbe simple
 * Scroll-Event+requestAnimationFrame-Technik wie vor den scroll-getriebenen CSS-Features
 * üblich - kein Versuch, das CSS-only-Verhalten 1:1 nachzubilden (kein "erst nach X px
 * Toleranz"-Feintuning wie native scroll-state-Queries es intern haben), nur derselbe
 * sichtbare Effekt: runter verstecken, hoch wieder zeigen.
 *
 * Prüft sich selbst zuerst per CSS.supports() - läuft NUR, wenn die native Technik NICHT
 * greift, kein doppelt arbeitender Mechanismus, kein Konflikt mit der @container-Regel.
 *
 * Einbindung (nur auf Seiten mit .ncss-hide-on-scroll nötig, wo auch Firefox/Safari
 * gebraucht werden):
 *   <script src="../components/hide-on-scroll-fallback.js" defer></script>
 */
(function () {
  if (
    typeof CSS === "undefined" ||
    !CSS.supports ||
    CSS.supports("container-type", "scroll-state")
  ) {
    return;
  }

  var els = document.querySelectorAll(".ncss-hide-on-scroll");
  if (!els.length) return;

  // Erst ab dieser Schwelle überhaupt ausblenden - sonst würde ein winziges Scrollen
  // ganz oben auf der Seite den Header sofort verstecken, bevor der Nutzer überhaupt
  // "richtig" zu scrollen begonnen hat (dieselbe Grunderfahrung wie scroll-state(scrolled:
  // block-end), das naturgemäß erst nach einer gewissen Scroll-Strecke feuert).
  var HIDE_THRESHOLD = 80;

  var lastY = window.scrollY;
  var ticking = false;

  function update() {
    var y = window.scrollY;
    var goingDown = y > lastY;
    var shouldHide = goingDown && y > HIDE_THRESHOLD;
    els.forEach(function (el) {
      el.style.translate = shouldHide ? "0 -100%" : "0 0";
    });
    lastY = y;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );
})();
