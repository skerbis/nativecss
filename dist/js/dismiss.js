/**
 * ncss - Generisches "Schließen/Entfernen" für Alerts, Tags/Chips und alles andere mit
 * [data-ncss-dismissible] (siehe components/alert.css, components/tag.css).
 *
 * Markup:
 *   <div class="ncss-alert" data-ncss-dismissible> ...
 *     <button type="button" data-ncss-dismiss aria-label="Hinweis schließen"></button>
 *   </div>
 *   <button data-ncss-dismiss="#banner">...</button>   Ziel per Selektor statt Vorfahre
 *   data-ncss-dismissible="hide"                         nur verstecken (hidden) statt
 *                                                        aus dem DOM entfernen
 *   data-ncss-dismiss-focus="#selector"                 (am Ziel) Fokus-Ziel danach
 *
 * Fokus (WCAG 2.4.3): lag der Fokus im entfernten Element, landet er nicht im Nichts
 * (document.body), sondern auf dem nächsten Geschwister-Ziel gleicher Art (dessen
 * Schließen-Button - z.B. der nächste Tag in einer Liste), sonst dem vorherigen, sonst auf
 * data-ncss-dismiss-focus, sonst auf dem Eltern-Element (tabindex="-1" wird dafür gesetzt).
 *
 * Event (am Ziel, bubbelt, abbrechbar): ncss-dismiss-remove, detail { trigger } -
 * event.preventDefault() verhindert das Entfernen (z.B. erst Server-Request abwarten).
 *
 * Ohne JS: der Button tut nichts. Wer keinen toten Button zeigen will, setzt hidden auf
 * den Button - das Script entfernt es (beim Laden und bei ncss-content-change).
 *
 * Dynamische Inhalte: Klick-Delegation am document - nachgeladene Elemente funktionieren
 * ohne weiteres Zutun. Nur das hidden-Entfernen an neuen Buttons läuft über scan(root) +
 * ncss-content-change (detail.root).
 *
 * Abhängigkeiten: keine anderen ncss-Scripts.
 */
(function () {
  "use strict";

  if (!document.addEventListener || !Element.prototype.closest || window.ncssDismissLoaded) {
    return;
  }
  window.ncssDismissLoaded = true;

  var SELECTOR = "[data-ncss-dismiss]";

  function scan(root) {
    var list = [];
    if (root.matches && root.matches(SELECTOR)) {
      list.push(root);
    }
    if (root.querySelectorAll) {
      list = list.concat(Array.prototype.slice.call(root.querySelectorAll(SELECTOR)));
    }
    list.forEach(function (btn) {
      if (btn.hidden) {
        btn.hidden = false;
      }
    });
  }

  function targetOf(btn) {
    var sel = btn.getAttribute("data-ncss-dismiss");
    if (sel) {
      try { return document.querySelector(sel); } catch (e) { return null; }
    }
    return btn.closest("[data-ncss-dismissible]");
  }

  // Die "Einheit" in einer Liste: der Tag selbst oder sein <li>, falls er allein darin steckt.
  function unitOf(target) {
    var p = target.parentElement;
    return p && p.tagName === "LI" && p.children.length === 1 ? p : target;
  }

  function focusAfter(target) {
    var unit = unitOf(target);
    var pick = function (el) {
      return el.matches(SELECTOR) ? el : el.querySelector(SELECTOR);
    };
    var el = unit.nextElementSibling;
    while (el && !pick(el)) { el = el.nextElementSibling; }
    if (!el) {
      el = unit.previousElementSibling;
      while (el && !pick(el)) { el = el.previousElementSibling; }
    }
    if (el) {
      return pick(el);
    }
    var sel = target.getAttribute("data-ncss-dismiss-focus");
    if (sel) {
      try {
        var explicit = document.querySelector(sel);
        if (explicit) {
          return explicit;
        }
      } catch (e) { /* ungültiger Selektor */ }
    }
    var parent = unit.parentElement;
    while (parent && parent.matches("ul, ol, li")) {
      parent = parent.parentElement;
    }
    return parent;
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest(SELECTOR);
    if (!btn) {
      return;
    }
    var target = targetOf(btn);
    if (!target) {
      return;
    }
    event.preventDefault();
    var proceed = target.dispatchEvent(new CustomEvent("ncss-dismiss-remove", {
      bubbles: true,
      cancelable: true,
      detail: { trigger: btn }
    }));
    if (!proceed) {
      return;
    }
    var hadFocus = target.contains(document.activeElement);
    var focusTarget = hadFocus ? focusAfter(target) : null;
    if (target.getAttribute("data-ncss-dismissible") === "hide") {
      target.hidden = true;
    } else {
      unitOf(target).remove();
    }
    if (focusTarget) {
      if (!focusTarget.matches("a[href], button, input, select, textarea, [tabindex]")) {
        focusTarget.setAttribute("tabindex", "-1");
      }
      focusTarget.focus();
    }
  });

  function start() {
    scan(document);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
