/**
 * ncss - Spotlight: schreibt die Zeigerposition als --ncss-spotlight-x/-y (px, relativ zur
 * jeweiligen Fläche) in jedes .ncss-spotlight innerhalb von [data-ncss-spotlight] (oder
 * das Element selbst, wenn es die Klasse trägt). Das Licht selbst zeichnet
 * components/spotlight.css - ohne dieses Script steht es statisch in der Mitte.
 *
 * Gruppen: EIN pointermove-Listener am [data-ncss-spotlight]-Element für alle Flächen
 * darin. Flächen in der Nähe des Zeigers (data-reach, Default 160px) bekommen
 * [data-ncss-spotlight-active] - so fangen Nachbarn den Rand des Lichtkegels auf.
 *
 * Nur Maus/Stift (Touch wird ignoriert, dort gibt es kein "Schweben"). Pro Frame höchstens
 * eine Messung (requestAnimationFrame), keine Layout-Arbeit im Event selbst.
 */
(function () {
  "use strict";

  if (typeof window.requestAnimationFrame !== "function" || !window.PointerEvent) {
    return;
  }

  function init(root) {
    var reach = parseInt(root.getAttribute("data-reach"), 10);
    if (isNaN(reach)) {
      reach = 160;
    }
    var frame = 0;
    var last = null;

    function targets() {
      var list = Array.prototype.slice.call(root.querySelectorAll(".ncss-spotlight"));
      if (root.classList.contains("ncss-spotlight")) {
        list.unshift(root);
      }
      return list;
    }

    function paint() {
      frame = 0;
      if (!last) {
        return;
      }
      targets().forEach(function (el) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--ncss-spotlight-x", (last.x - r.left).toFixed(1) + "px");
        el.style.setProperty("--ncss-spotlight-y", (last.y - r.top).toFixed(1) + "px");
        var near = last.x > r.left - reach && last.x < r.right + reach &&
          last.y > r.top - reach && last.y < r.bottom + reach;
        el.toggleAttribute("data-ncss-spotlight-active", near);
      });
    }

    root.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") {
        return;
      }
      last = { x: event.clientX, y: event.clientY };
      if (!frame) {
        frame = requestAnimationFrame(paint);
      }
    }, { passive: true });

    // Beim Verlassen nur ausblenden - die letzte Position bleibt stehen, damit das Licht
    // dort verblasst, wo es war, statt zur Mitte zu springen.
    root.addEventListener("pointerleave", function () {
      last = null;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      targets().forEach(function (el) {
        el.removeAttribute("data-ncss-spotlight-active");
      });
    });
  }

  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Elemente merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung
  // mit). Läuft beim Laden und bei jedem "ncss-content-change"-Event (detail.root = neu
  // eingefügtes Element, ohne Angabe das ganze Dokument), siehe js/content-observer.js.
  var SELECTOR = "[data-ncss-spotlight]";
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
