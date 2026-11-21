/**
 * ncss - Nav: kleines Enhancement, kein Ersatz für die native Funktionalität. Ohne dieses
 * Script funktioniert alles: Menü öffnen/schließen über command/commandfor bzw. <details>,
 * Zeile oder Menü-Schaltfläche per Container Query (Schwelle aus data-ncss-nav-fit, sonst
 * 64rem - siehe components/nav.css). Der Zustand steht damit schon vor dem ersten Zeichnen.
 *
 * 1. Nachmessen (Standard für jede .ncss-nav mit Menü-Button und Panel): die Schwelle ist
 *    eine Schätzung. Das Skript misst per ResizeObserver, ob die Liste wirklich in EINE
 *    Zeile neben Marke/Aktionen passt - auch bei Textabständen (WCAG 1.4.12),
 *    Ersatzschriften oder Übersetzungen -, und setzt data-ncss-nav-auto="inline" bzw.
 *    "compact". Dieser Zustand hat Vorrang vor der Container Query. Hysterese: nach dem
 *    Zusammenklappen wird erst wieder probiert, wenn der Platz um mehr als 24px gewachsen
 *    ist - der Test selbst läuft synchron vor dem nächsten Bild, es flackert nichts.
 *    Ausnahmen: data-ncss-nav-auto="off" (feste Viewport-Schwelle 64rem), .ncss-nav--compact
 *    (immer kompakt), Navs mit <ncss-nav-priority>/<ncss-nav-drilldown> (eigene Logik).
 *    Event bei jedem Wechsel: "ncss-nav-change" mit detail.compact (true/false).
 *    Barrierefreiheit: aria-controls/aria-expanded an der Menü-Schaltfläche; beim
 *    Wechsel in den Kompakt-Modus wandert ein Fokus aus der Liste auf die Schaltfläche,
 *    beim Zurückwechseln schließt ein offenes Panel und der Fokus bleibt in der Liste.
 *    Am besten im <head> mit defer laden.
 * 2. Schließt das offene Dropdown nach Klick auf einen Untermenü-Link (natives <details>
 *    bleibt sonst offen stehen) und das Off-Canvas-Panel nach Klick auf IRGENDEINen
 *    Nav-Link (sonst bleibt das Menü nach der Navigation sichtbar offen).
 */
(function () {
  "use strict";

  document.addEventListener("click", function (event) {
    var link = event.target.closest(".ncss-nav-item a");
    if (!link) {
      return;
    }

    var dropdown = link.closest(".ncss-nav-dropdown");
    if (dropdown && dropdown.open) {
      dropdown.open = false;
    }

    var panel = link.closest(".ncss-nav-panel");
    if (panel && panel.open) {
      panel.close();
    }
  });

  var HYSTERESIS = 24;

  /* Passt die Zeile? Drei Symptome: Liste läuft in sich über (nowrap), die Nav ragt aus
     ihrer Zeile, oder die Zeile (z.B. .ncss-topbar-inner mit flex-wrap) hat die Nav bzw.
     ein Geschwister in eine zweite Reihe geschoben. */
  function fits(nav, list) {
    var row = nav.parentElement;
    if (list.scrollWidth > list.clientWidth + 1 || nav.scrollWidth > nav.clientWidth + 1) {
      return false;
    }
    /* scrollWidth erfasst nur Überlauf zum Zeilenende - bei justify-content:flex-end/center
       (oder RTL) ragen die Punkte zum Anfang hinaus, über die Marke. Deshalb zusätzlich die
       äußeren Kanten der Punkte gegen die Liste prüfen. */
    var lb = list.getBoundingClientRect();
    for (var j = 0; j < list.children.length; j++) {
      var ib = list.children[j].getBoundingClientRect();
      if (ib.width && (ib.left < lb.left - 1 || ib.right > lb.right + 1)) {
        return false;
      }
    }
    if (row.scrollWidth > row.clientWidth + 1) {
      return false;
    }
    var box = nav.getBoundingClientRect();
    for (var i = 0; i < row.children.length; i++) {
      var el = row.children[i];
      if (el === nav) {
        continue;
      }
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        continue;
      }
      if (r.top >= box.bottom - 1 || r.bottom <= box.top + 1) {
        return false;
      }
    }
    return true;
  }

  /* Menü-Schaltfläche: Zustand für Screenreader (command/commandfor allein meldet bei
     show-modal keinen aufgeklappt/zugeklappt-Zustand) - für JEDE .ncss-nav mit Panel,
     auch mit data-ncss-nav-auto="off". */
  function wireToggle(nav) {
    var toggle = nav.querySelector(":scope > .ncss-nav-toggle");
    var panel = nav.querySelector(":scope > .ncss-nav-panel");
    if (!toggle || !panel || typeof panel.close !== "function") {
      return;
    }
    if (panel.id) {
      toggle.setAttribute("aria-controls", panel.id);
    }
    function syncExpanded() {
      toggle.setAttribute("aria-expanded", panel.open ? "true" : "false");
    }
    syncExpanded();
    panel.addEventListener("toggle", syncExpanded);
    panel.addEventListener("close", syncExpanded);
  }

  function setup(nav) {
    var toggle = nav.querySelector(":scope > .ncss-nav-toggle");
    var panel = nav.querySelector(":scope > .ncss-nav-panel");
    var list = panel && panel.querySelector(":scope > .ncss-nav-list");
    var row = nav.parentElement;
    if (!list || !toggle || !row) {
      return;
    }
    var failedAt = 0;
    var listWidth = 0;

    function set(compact) {
      var value = compact ? "compact" : "inline";
      if (nav.getAttribute("data-ncss-nav-auto") === value) {
        return;
      }
      nav.setAttribute("data-ncss-nav-auto", value);
      nav.dispatchEvent(new CustomEvent("ncss-nav-change", { bubbles: true, detail: { compact: compact } }));
    }

    function rowSpace() {
      var cs = getComputedStyle(row);
      return row.clientWidth - (parseFloat(cs.paddingInlineStart) || 0) - (parseFloat(cs.paddingInlineEnd) || 0);
    }
    function needed() {
      var gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      var sum = listWidth;
      var n = 1;
      Array.prototype.forEach.call(row.children, function (el) {
        var r = el.getBoundingClientRect();
        if (el !== nav && (r.width || r.height)) {
          sum += r.width;
          n++;
        }
      });
      return sum + gap * (n - 1);
    }

    function check() {
      var width = row.clientWidth;
      var focused = document.activeElement;
      if (nav.getAttribute("data-ncss-nav-auto") === "compact") {
        if (width <= failedAt + HYSTERESIS) {
          return;
        }
        /* Offenes Panel liegt im Top Layer, die Liste lässt sich darin nicht als Zeile
           messen - dann schätzen: zuletzt gemessene Listenbreite + Marke/Aktionen jetzt. */
        var wasOpen = panel.open;
        if (wasOpen && !(listWidth && rowSpace() >= needed())) {
          return;
        }
        var inPanel = wasOpen && list.contains(focused);
        if (wasOpen) {
          panel.close();
        }
        nav.setAttribute("data-ncss-nav-auto", "inline");
        var ok = fits(nav, list);
        nav.setAttribute("data-ncss-nav-auto", "compact");
        if (!ok) {
          failedAt = width;
          if (wasOpen) {
            toggle.focus();
          }
          return;
        }
        /* Zurück in die Zeile: das Panel ist zu. Lag der Fokus darin, bleibt er auf
           demselben Link (der jetzt in der Zeile steht), sonst auf dem ersten Punkt -
           nie auf der gleich unsichtbaren Menü-Schaltfläche. */
        listWidth = list.scrollWidth;
        set(false);
        if (wasOpen) {
          var target = inPanel ? focused : list.querySelector("a[href], summary, button");
          if (target) {
            target.focus();
          }
        }
        return;
      }
      listWidth = list.scrollWidth;
      if (fits(nav, list)) {
        return;
      }
      failedAt = width;
      nav.querySelectorAll(".ncss-nav-dropdown[open]").forEach(function (d) {
        d.open = false;
      });
      set(true);
      /* Fokus lag in der Liste, die jetzt im geschlossenen Panel verschwindet. */
      if (focused && list.contains(focused)) {
        toggle.focus();
      }
    }

    /* Beobachtet die Zeile (Fensterbreite) UND ihren Inhalt - Marke, Aktionen und die
       Nav-Punkte selbst: größere Schrift, Textabstände (WCAG 1.4.12) oder nachgeladene
       Schriften ändern deren Größe auch bei gleicher Fensterbreite. Ändert sich der
       Inhalt, gilt die Hysterese nicht (sofort neu prüfen). */
    var ro = new ResizeObserver(function (entries) {
      var compact = nav.getAttribute("data-ncss-nav-auto") === "compact";
      for (var i = 0; i < entries.length; i++) {
        var t = entries[i].target;
        /* Punkte im (geschlossenen oder offenen) Panel sagen nichts über die Zeile. */
        if (t !== row && !(compact && t.parentElement === list)) {
          failedAt = 0;
          break;
        }
      }
      check();
    });
    nav.setAttribute("data-ncss-nav-auto", "inline");
    check();
    ro.observe(row);
    Array.prototype.forEach.call(row.children, function (el) {
      if (el !== nav) {
        ro.observe(el);
      }
    });
    Array.prototype.forEach.call(list.children, function (el) {
      ro.observe(el);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        failedAt = 0;
        check();
      });
    }
  }

  function init() {
    document.querySelectorAll(".ncss-nav").forEach(function (nav) {
      wireToggle(nav);
      if (
        typeof ResizeObserver === "undefined" ||
        nav.hasAttribute("data-ncss-nav-auto") ||
        nav.classList.contains("ncss-nav--compact") ||
        nav.querySelector("ncss-nav-priority, ncss-nav-drilldown")
      ) {
        return;
      }
      setup(nav);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
