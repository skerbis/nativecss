/**
 * NativeCSS - opt-in Begleiter für helpers/reveal.css (Elemente mit data-ncss-reveal).
 * Die scroll-gescrubbten Reveals brauchen KEIN JS - dieses Script ist nur für:
 *   - .ncss-reveal--once in Browsern OHNE CSS-Scroll-Trigger (timeline-trigger, aktuell
 *     nur Chromium): spielt die Animation einmal zeitbasiert ab, sobald das Element ins
 *     Bild kommt (IntersectionObserver). In Chromium tut es für --once NICHTS (das CSS
 *     erledigt es selbst, kein doppelter Mechanismus).
 *   - Browser ganz ohne animation-timeline: JEDES data-ncss-reveal-Element wird dort
 *     zum Einmal-Reveal (statt einfach statisch sichtbar zu bleiben).
 * Ablauf: Klasse .ncss-reveal--js hält den Startzustand (pausiert), .is-revealed spielt
 * ab. Event "ncss:reveal" (bubbelt) beim Start.
 * Unter prefers-reduced-motion: nichts (das CSS zeigt alles ungeclippt).
 *
 * Benötigt: helpers/reveal.css.
 * Einbindung: <script src="ncss/js/reveal.js" defer></script>
 */
(function () {
  if (
    typeof IntersectionObserver === "undefined" ||
    typeof CSS === "undefined" ||
    !CSS.supports ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  var hasTimeline = CSS.supports("animation-timeline", "view()");
  var hasTrigger = CSS.supports("timeline-trigger", "--a view()");

  var els = document.querySelectorAll("[data-ncss-reveal]");
  var targets = [];
  for (var i = 0; i < els.length; i++) {
    var once = els[i].classList.contains("ncss-reveal--once");
    if ((once && !hasTrigger) || !hasTimeline) targets.push(els[i]);
  }
  if (!targets.length) return;

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        entry.target.classList.add("is-revealed");
        entry.target.dispatchEvent(new CustomEvent("ncss:reveal", { bubbles: true }));
      });
    },
    { rootMargin: "0px 0px -15% 0px" }
  );

  targets.forEach(function (el) {
    el.classList.add("ncss-reveal--js");
    io.observe(el);
  });
})();
