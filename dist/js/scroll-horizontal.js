/**
 * NativeCSS - Begleit-Script für components/scroll-horizontal.css
 * (.ncss-scroll-horizontal mit data-ncss-scroll-horizontal). Der Effekt selbst ist reines
 * CSS - dieses Script ist opt-in und erledigt zwei Dinge, die CSS nicht kann:
 *
 * 1. Höhe passend zur Reihe: setzt --ncss-scroll-horizontal-length auf
 *    100svh + (Reihenbreite - Bühnenbreite) / Tempo - 1px vertikal = 1px seitwärts statt
 *    des festen 300vh-Defaults (zu lang bei wenigen, zu kurz bei vielen Elementen).
 *    Tempo pro Instanz: data-ncss-scroll-horizontal="1.5" (seitliche Pixel pro gescrolltem
 *    Pixel, Default 1).
 * 2. Tastatur-Fokus sichtbar halten (WCAG 2.4.11): die Reihe wird per translate
 *    verschoben, nicht gescrollt - der Browser kann ein fokussiertes Element außerhalb der
 *    Bühne deshalb NICHT selbst ins Bild holen. Bei focusin rechnet das Script die
 *    Timeline rückwärts (Fortschritt p -> Seitenposition) und scrollt die SEITE an die
 *    Stelle, an der das Element mittig steht. Im Fallback (wischbare Reihe) reicht ein
 *    scrollIntoView innerhalb der Reihe.
 *
 * Unter prefers-reduced-motion schaltet das CSS ohnehin auf die wischbare Reihe - das
 * Script erkennt den aktiven Modus deshalb einfach am berechneten position-Wert der Bühne
 * (sticky = scroll-getrieben) statt die Bedingungen ein zweites Mal nachzubauen.
 *
 * Einbindung: <script src="ncss/js/scroll-horizontal.js" defer></script>
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
  if (typeof ResizeObserver === "undefined" || !window.matchMedia) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setup(el) {
    var viewport = el.querySelector(".ncss-scroll-horizontal-viewport");
    var track = viewport && viewport.querySelector(".ncss-scroll-horizontal-track");
    if (!track) return;

    var speed = parseFloat(el.getAttribute("data-ncss-scroll-horizontal"));
    if (!(speed > 0)) speed = 1;

    function active() {
      return getComputedStyle(viewport).position === "sticky";
    }
    function maxShift() {
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }

    function refresh() {
      el.style.removeProperty("--ncss-scroll-horizontal-length");
      if (!active()) return;
      el.style.setProperty(
        "--ncss-scroll-horizontal-length",
        "calc(100svh + " + Math.ceil(maxShift() / speed) + "px)"
      );
    }

    function scrollToItem(item) {
      var behavior = ncssReducedMotion() ? "instant" : "smooth";
      if (!active()) {
        item.scrollIntoView({ block: "nearest", inline: "start", behavior: behavior });
        return;
      }
      var shift = maxShift();
      // Länge der contain-Phase = Sektionshöhe - Bühnenhöhe (siehe animation-range im CSS).
      var range = el.offsetHeight - viewport.offsetHeight;
      if (shift <= 0 || range <= 0) return;
      var itemRect = item.getBoundingClientRect();
      var trackRect = track.getBoundingClientRect();
      var rtl = getComputedStyle(track).direction === "rtl";
      var left = rtl ? trackRect.right - itemRect.right : itemRect.left - trackRect.left;
      var target = Math.min(shift, Math.max(0, left + item.offsetWidth / 2 - viewport.clientWidth / 2));
      var top = el.getBoundingClientRect().top + window.scrollY + (target / shift) * range;
      window.scrollTo({ top: top, behavior: behavior });
    }

    var raf = 0;
    el.addEventListener("focusin", function (event) {
      var item = event.target;
      while (item && item.parentElement !== track) item = item.parentElement;
      if (!item) return;
      cancelAnimationFrame(raf);
      // Erst NACH dem browsereigenen Fokus-Scroll eingreifen, sonst überschreibt er uns.
      raf = requestAnimationFrame(function () {
        scrollToItem(item);
      });
    });

    var ro = new ResizeObserver(refresh);
    ro.observe(track);
    ro.observe(viewport);
    if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", refresh);
    refresh();
  }

  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Elemente merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung
  // mit). Läuft beim Laden und bei jedem "ncss-content-change"-Event (detail.root = neu
  // eingefügtes Element, ohne Angabe das ganze Dokument), siehe js/content-observer.js.
  var SELECTOR = "[data-ncss-scroll-horizontal]";
  var seen = new WeakSet();
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var list = Array.prototype.slice.call(root.querySelectorAll(SELECTOR));
    if (root.matches && root.matches(SELECTOR)) list.unshift(root);
    list.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      setup(el);
    });
  }
  scan(document);
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
