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

  function init(root) {
    if (root.hasAttribute("data-ready")) {
      return;
    }
    var items = Array.prototype.slice.call(root.querySelectorAll(".ncss-backdrop-item"));
    if (items.length === 0) {
      return;
    }
    var interval = parseInt(root.getAttribute("data-interval"), 10) || 6000;
    root.style.setProperty("--ncss-backdrop-duration", interval + 2000 + "ms");
    root.setAttribute("data-ready", "");
    items[0].classList.add("is-active");

    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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

  function initAll() {
    document.querySelectorAll("[data-ncss-backdrop]").forEach(init);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
