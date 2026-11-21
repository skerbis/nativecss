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
 * Hook für andere Scripts auf JEDEM Weg: auch wenn das CSS den Einmal-Reveal selbst
 * auslöst (timeline-trigger), setzt das Script beim Start der Animation (animationstart)
 * .is-revealed und feuert "ncss-reveal" - ohne eigenes Abspielen.
 * Unter prefers-reduced-motion: nichts (das CSS zeigt alles ungeclippt).
 *
 * Benötigt: helpers/reveal.css.
 * Einbindung: <script src="ncss/js/reveal.js" defer></script>
 */
(function () {
  // Bewegung reduzieren? Systemeinstellung ODER ausdrückliche Wahl am <html>
  // (data-motion="reduce"/"full", gesetzt von js/preferences.js) - "full" hebt ein
  // System-"reduce" nur als bewusste Nutzerwahl auf, nie von selbst.
  function ncssReducedMotion() {
    var choice = document.documentElement.getAttribute("data-motion");
    if (choice === "reduce") return true;
    if (choice === "full") return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  if (
    typeof IntersectionObserver === "undefined" ||
    typeof CSS === "undefined" ||
    !CSS.supports ||
    ncssReducedMotion()
  ) {
    return;
  }

  var hasTimeline = CSS.supports("animation-timeline", "view()");
  var hasTrigger = CSS.supports("timeline-trigger", "--a view()");

  function revealed(el) {
    el.classList.add("is-revealed");
    el.dispatchEvent(new CustomEvent("ncss-reveal", { bubbles: true }));
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        revealed(entry.target);
      });
    },
    { rootMargin: "0px 0px -15% 0px" }
  );

  function init(el) {
    var once = el.classList.contains("ncss-reveal--once");
    if (once && hasTrigger && hasTimeline) {
      /* CSS spielt selbst ab - nur melden (Animation am Element oder an einem Kind). */
      el.addEventListener("animationstart", function start(event) {
        if (event.animationName.indexOf("ncss-reveal") !== 0) return;
        el.removeEventListener("animationstart", start);
        revealed(el);
      });
      return;
    }
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
