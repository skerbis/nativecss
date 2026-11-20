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
 * ab. Event "ncss-reveal" (bubbelt) beim Start.
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

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        entry.target.classList.add("is-revealed");
        entry.target.dispatchEvent(new CustomEvent("ncss-reveal", { bubbles: true }));
      });
    },
    { rootMargin: "0px 0px -15% 0px" }
  );

  function init(el) {
    var once = el.classList.contains("ncss-reveal--once");
    if (!((once && !hasTrigger) || !hasTimeline)) return;
    el.classList.add("ncss-reveal--js");
    io.observe(el);
  }

  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Elemente merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung
  // mit). Läuft beim Laden und bei jedem "ncss-content-change"-Event (detail.root = neu
  // eingefügtes Element, ohne Angabe das ganze Dokument), siehe js/content-observer.js.
  var SELECTOR = "[data-ncss-reveal]";
  var seen = new WeakSet();
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var list = Array.prototype.slice.call(root.querySelectorAll(SELECTOR));
    if (root.matches && root.matches(SELECTOR)) list.unshift(root);
    list.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      init(el);
    });
  }
  scan(document);
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
