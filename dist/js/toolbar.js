/**
 * ncss - <ncss-toolbar>: Werkzeugleiste nach WAI-ARIA-APG-Muster "Toolbar" (Light DOM).
 * Styling: components/toolbar.css (.ncss-toolbar-Regeln gelten auch für das Element).
 *
 *   <ncss-toolbar aria-label="Seite bearbeiten"> … Buttons, Links, Segmented … </ncss-toolbar>
 *
 * - setzt role="toolbar"; die Leiste ist EIN Tab-Stopp (Roving Tabindex),
 * - ← / → (bzw. ↑ / ↓ bei aria-orientation="vertical") wandern zwischen den Werkzeugen,
 *   Pos1/Ende springen an Anfang/Ende; in RTL sind links/rechts vertauscht,
 * - eine Radio-Gruppe (z.B. .ncss-segmented) zählt als EIN Werkzeug (ihr gewähltes Radio)
 *   und behält innerhalb ihre eigenen Pfeiltasten nicht - dort wählt Leertaste/Klick;
 *   Pfeiltasten bewegen in einer Toolbar wie vom APG empfohlen zum nächsten Werkzeug,
 * - deaktivierte Elemente bleiben fokussierbar übersprungen (disabled wird ausgelassen),
 * - ohne Script: normale Gruppe, jedes Werkzeug ein eigener Tab-Stopp.
 * Abhängigkeiten: keine.
 */
(function () {
  "use strict";

  if (!window.customElements || customElements.get("ncss-toolbar")) {
    return;
  }

  var FOCUSABLE = "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

  customElements.define(
    "ncss-toolbar",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) {
          return;
        }
        this._ready = true;
        this.setAttribute("role", "toolbar");
        var self = this;
        this._sync(0);
        this.addEventListener("keydown", function (event) {
          self._onKey(event);
        });
        this.addEventListener("focusin", function (event) {
          var items = self._items();
          var i = items.indexOf(event.target);
          if (i > -1) {
            self._sync(i);
          }
        });
        // Radio-Gruppen: nach Auswahl bleibt das gewählte Radio das Werkzeug
        this.addEventListener("change", function () {
          var items = self._items();
          var i = items.indexOf(document.activeElement);
          self._sync(i > -1 ? i : 0);
        });
      }

      // Werkzeuge in Dokument-Reihenfolge; je Radio-Gruppe nur ein Eintrag
      _items() {
        var seen = {};
        var out = [];
        var all = this.querySelectorAll(FOCUSABLE);
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          if (el.disabled || el.closest("[hidden], [inert], [popover]:not(:popover-open)")) {
            continue;
          }
          if (el.type === "radio" && el.name) {
            if (seen[el.name]) {
              continue;
            }
            var group = this.querySelectorAll('input[type="radio"][name="' + el.name + '"]');
            var pick = el;
            for (var k = 0; k < group.length; k++) {
              if (group[k].checked) {
                pick = group[k];
              }
            }
            seen[el.name] = true;
            out.push(pick);
            continue;
          }
          out.push(el);
        }
        return out;
      }

      _sync(active) {
        var items = this._items();
        var all = this.querySelectorAll(FOCUSABLE);
        for (var i = 0; i < all.length; i++) {
          all[i].setAttribute("tabindex", "-1");
          all[i].setAttribute("data-ncss-toolbar-item", "");
        }
        if (items.length) {
          items[Math.max(0, Math.min(active, items.length - 1))].setAttribute("tabindex", "0");
        }
      }

      _onKey(event) {
        // Textfelder und offene Menüs behalten ihre eigenen Tasten
        var t = event.target;
        if (t.matches("input:not([type='radio']):not([type='checkbox']), textarea, select") || t.closest("[popover]")) {
          return;
        }
        var vertical = this.getAttribute("aria-orientation") === "vertical";
        var rtl = getComputedStyle(this).direction === "rtl";
        var prev = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
        var next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
        var items = this._items();
        var i = items.indexOf(t.type === "radio" ? items.filter(function (x) { return x.name === t.name; })[0] : t);
        if (i < 0) {
          return;
        }
        var to = -1;
        if (event.key === next) {
          to = (i + 1) % items.length;
        } else if (event.key === prev) {
          to = (i - 1 + items.length) % items.length;
        } else if (event.key === "Home") {
          to = 0;
        } else if (event.key === "End") {
          to = items.length - 1;
        }
        if (to > -1) {
          event.preventDefault();
          this._sync(to);
          items[to].focus();
        }
      }
    }
  );
})();
