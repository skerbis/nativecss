/**
 * NativeCSS - opt-in Begleiter für components/count-up.css
 * (<span class="ncss-count-up" data-ncss-count-up style="--ncss-count-to: 40">40</span>).
 *
 * Wo CSS-Scroll-Trigger existieren (timeline-trigger, Chromium), tut das Script NICHTS -
 * das CSS spielt die Zählung selbst ab (kein doppelter Mechanismus). Sonst spielt es
 * dieselbe zeitbasierte Zählung einmal ab, sobald die Zahl ins Bild kommt
 * (IntersectionObserver), statt der scroll-gescrubbten CSS-Variante (Safari) bzw. statt
 * gar keiner Animation (Browser ohne view-timeline).
 *
 * Fehlt --ncss-count-to, wird der Zielwert aus dem Text gelesen ("12.500" -> 12500).
 * Unter prefers-reduced-motion: keine Änderung, die fertige Zahl bleibt stehen.
 *
 * Benötigt: components/count-up.css.
 * Einbindung: <script src="ncss/js/count-up.js" defer></script>
 */
(function () {
  if (
    typeof IntersectionObserver === "undefined" ||
    typeof CSS === "undefined" ||
    !CSS.supports ||
    CSS.supports("timeline-trigger", "--a view()") ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  var els = document.querySelectorAll("[data-ncss-count-up]");
  if (!els.length) return;

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-counting");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -15% 0px" }
  );

  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (!getComputedStyle(el).getPropertyValue("--ncss-count-to").trim()) {
      var n = parseInt(el.textContent.replace(/[^\d-]/g, ""), 10);
      if (!isNaN(n)) el.style.setProperty("--ncss-count-to", n);
    }
    el.classList.add("ncss-count-up--js");
    io.observe(el);
  }
})();
