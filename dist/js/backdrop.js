/**
 * ncss - Backdrop: wechselt die Bilder von [data-ncss-backdrop] im Intervall
 * (data-interval in ms, Default 6000). Kleines Opt-in-Enhancement zu
 * components/backdrop.css - ohne dieses Script bleibt das erste Bild stehen.
 *
 * - lädt das jeweils nächste Bild vor (loading="lazy" -> "eager"), blendet erst ein,
 *   wenn es geladen ist - kein Überblenden auf eine leere Fläche
 * - pausiert in Hintergrund-Tabs (visibilitychange) statt Bilder ungesehen zu laden
 * - bei prefers-reduced-motion: kein automatischer Wechsel, nur das erste Bild
 * - setzt --ncss-backdrop-duration passend zum Intervall (Zoom läuft über die Überblendung
 *   hinaus weiter, sonst "springt" der Zoom beim Wechsel)
 */
(function () {
  "use strict";
  // Bewegung reduzieren? Systemeinstellung ODER ausdrückliche Wahl am <html>
  // (data-motion="reduce"/"full", gesetzt von js/preferences.js) - "full" hebt ein
  // System-"reduce" nur als bewusste Nutzerwahl auf, nie von selbst.
  function ncssReducedMotion() {
    var choice = document.documentElement.getAttribute("data-motion");
    if (choice === "reduce") return true;
    if (choice === "full") return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function init(root) {
    var items = Array.prototype.slice.call(root.querySelectorAll(".ncss-backdrop-item"));
    if (items.length === 0) {
      return;
    }
    // Per innerHTML kopiertes, bereits laufendes Markup kann einen veralteten Zustand
    // mitbringen (is-active auf einem späteren Bild) - immer vom ersten Bild aus starten.
    items.forEach(function (item) { item.classList.remove("is-active"); });
    var interval = parseInt(root.getAttribute("data-interval"), 10) || 6000;
    root.style.setProperty("--ncss-backdrop-duration", interval + 2000 + "ms");
    root.setAttribute("data-ready", "");
    items[0].classList.add("is-active");

    if (items.length < 2 || ncssReducedMotion()) {
      return;
    }

    var index = 0;
    var timer = null;

    function preload(item) {
      if (item.loading === "lazy") {
        item.loading = "eager";
      }
    }
    preload(items[1]);

    function next() {
      // Element wurde entfernt (htmx-Swap, Frontend-Editing) - Timer nicht ewig weiterlaufen lassen.
      if (!root.isConnected) {
        stop();
        return;
      }
      var current = items[index];
      index = (index + 1) % items.length;
      var upcoming = items[index];
      function show() {
        upcoming.classList.add("is-active");
        current.classList.remove("is-active");
        preload(items[(index + 1) % items.length]);
      }
      if (upcoming.complete) {
        show();
      } else {
        upcoming.addEventListener("load", show, { once: true });
      }
    }
    function start() {
      if (!timer) {
        timer = window.setInterval(next, interval);
      }
    }
    function stop() {
      window.clearInterval(timer);
      timer = null;
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });
    start();
  }

  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Elemente merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung
  // mit). Läuft beim Laden und bei jedem "ncss-content-change"-Event (detail.root = neu
  // eingefügtes Element, ohne Angabe das ganze Dokument), siehe js/content-observer.js.
  var SELECTOR = "[data-ncss-backdrop]";
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
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
  function scanDocument() {
    scan(document);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanDocument);
  } else {
    scanDocument();
  }
})();
