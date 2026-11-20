/**
 * ncss - <ncss-tabs>: macht aus einer Sprungmarken-Liste + Abschnitten echte Registerkarten
 * nach WAI-ARIA-APG "Tabs" (siehe components/tabs.css für Markup). Light-DOM-Custom-Element.
 *
 * Rollen/Zustände: Liste role="tablist" (+ aria-orientation="vertical" bei
 * .ncss-tabs--vertical), Links role="tab" + aria-selected + aria-controls, Abschnitte
 * role="tabpanel" + aria-labelledby + hidden. Roving tabindex: nur der aktive Tab liegt in
 * der Tab-Reihenfolge, Tab springt danach direkt ins Panel (tabindex="0" am Panel, wie im
 * APG-Beispiel - auch wenn es selbst nichts Fokussierbares enthält).
 *
 * Tastatur: Pfeil links/rechts (vertikal: hoch/runter) wechselt zyklisch, Pos1/Ende springt
 * zum ersten/letzten Tab. Standard ist automatische Aktivierung (Fokus = Auswahl);
 * activation="manual" bewegt nur den Fokus, Enter/Leertaste aktiviert.
 *
 * hash-Attribut: Auswahl wird per history.replaceState() als #id gespiegelt (kein neuer
 * Verlaufs-Eintrag pro Klick, kein Springen der Seite), ein Aufruf mit #id oder ein späterer
 * hashchange auf eine Panel-id wählt den passenden Tab.
 *
 * Event (bubbelt, am Element): ncss-tabs-change, detail { tab, panel, index }
 * Öffentlich: el.select(indexOderId)
 *
 * Dynamische Inhalte: als Custom Element initialisiert es sich in connectedCallback() von
 * selbst - auch nach htmx-Swap/innerHTML, kein ncss-content-change nötig. Erneutes
 * Verbinden (verschieben) baut nichts doppelt auf.
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements wird nichts registriert,
 * das Markup bleibt die funktionierende Sprungmarken-Seite.
 */
(function () {
  "use strict";

  if (!window.customElements || customElements.get("ncss-tabs")) {
    return;
  }

  var counter = 0;

  customElements.define(
    "ncss-tabs",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) {
          if (this.hasAttribute("hash")) {
            window.addEventListener("hashchange", this._onHash);
          }
          return;
        }
        var list = this.querySelector(":scope > .ncss-tabs-list");
        if (!list) {
          return;
        }
        var self = this;
        var tabs = [];
        var panels = [];
        Array.prototype.forEach.call(list.children, function (el) {
          var href = el.getAttribute("href") || el.getAttribute("data-ncss-tab") || "";
          var id = href.charAt(0) === "#" ? href.slice(1) : href;
          var panel = id ? document.getElementById(id) : null;
          if (panel && self.contains(panel)) {
            tabs.push(el);
            panels.push(panel);
          }
        });
        if (!tabs.length) {
          return;
        }
        this._ready = true;
        this._tabs = tabs;
        this._panels = panels;
        var n = ++counter;

        list.setAttribute("role", "tablist");
        if (this.classList.contains("ncss-tabs--vertical")) {
          list.setAttribute("aria-orientation", "vertical");
        }
        tabs.forEach(function (tab, i) {
          if (!tab.id) {
            tab.id = "ncss-tab-" + n + "-" + i;
          }
          tab.setAttribute("role", "tab");
          tab.setAttribute("aria-controls", panels[i].id);
          panels[i].setAttribute("role", "tabpanel");
          panels[i].setAttribute("aria-labelledby", tab.id);
          panels[i].setAttribute("tabindex", "0");
        });

        // Startauswahl: #id in der Adresse (bei hash) > aria-selected/data-ncss-selected im
        // Markup > erster Tab.
        var start = 0;
        tabs.forEach(function (tab, i) {
          if (tab.getAttribute("aria-selected") === "true" || tab.hasAttribute("data-ncss-selected")) {
            start = i;
          }
        });
        if (this.hasAttribute("hash") && location.hash) {
          var fromHash = this._indexOf(decodeURIComponent(location.hash.slice(1)));
          if (fromHash > -1) {
            start = fromHash;
          }
        }
        this._activate(start, false, false);

        list.addEventListener("click", function (event) {
          var i = tabs.indexOf(event.target.closest("[role='tab']"));
          if (i > -1) {
            event.preventDefault();
            self._activate(i, true, true);
          }
        });
        list.addEventListener("keydown", function (event) {
          var i = tabs.indexOf(event.target.closest("[role='tab']"));
          if (i < 0) {
            return;
          }
          var vertical = list.getAttribute("aria-orientation") === "vertical";
          var prev = vertical ? "ArrowUp" : "ArrowLeft";
          var next = vertical ? "ArrowDown" : "ArrowRight";
          // Bei horizontaler Liste in RTL-Schrift sind links/rechts vertauscht.
          if (!vertical && getComputedStyle(list).direction === "rtl") {
            prev = "ArrowRight";
            next = "ArrowLeft";
          }
          var target = -1;
          if (event.key === prev) target = (i - 1 + tabs.length) % tabs.length;
          else if (event.key === next) target = (i + 1) % tabs.length;
          else if (event.key === "Home") target = 0;
          else if (event.key === "End") target = tabs.length - 1;
          else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            self._activate(i, true, true);
            return;
          }
          if (target < 0) {
            return;
          }
          event.preventDefault();
          if (self.getAttribute("activation") === "manual") {
            self._focusTab(target);
          } else {
            self._activate(target, true, true);
          }
        });

        this._onHash = function () {
          var i = self._indexOf(decodeURIComponent(location.hash.slice(1)));
          if (i > -1) {
            self._activate(i, false, true);
          }
        };
        if (this.hasAttribute("hash")) {
          window.addEventListener("hashchange", this._onHash);
        }
      }

      disconnectedCallback() {
        if (this._onHash) {
          window.removeEventListener("hashchange", this._onHash);
        }
      }

      _indexOf(id) {
        for (var i = 0; i < this._panels.length; i++) {
          if (this._panels[i].id === id) {
            return i;
          }
        }
        return -1;
      }

      _focusTab(i) {
        this._tabs.forEach(function (tab, k) {
          tab.setAttribute("tabindex", k === i ? "0" : "-1");
        });
        this._tabs[i].focus();
      }

      _activate(i, focus, notify) {
        var tabs = this._tabs;
        var panels = this._panels;
        var changed = this._current !== i;
        this._current = i;
        tabs.forEach(function (tab, k) {
          var on = k === i;
          tab.setAttribute("aria-selected", on ? "true" : "false");
          tab.setAttribute("tabindex", on ? "0" : "-1");
          panels[k].hidden = !on;
        });
        if (focus) {
          tabs[i].focus();
        }
        if (this.hasAttribute("hash") && notify && changed && history.replaceState) {
          history.replaceState(history.state, "", "#" + panels[i].id);
        }
        if (notify && changed) {
          this.dispatchEvent(new CustomEvent("ncss-tabs-change", {
            bubbles: true,
            detail: { tab: tabs[i], panel: panels[i], index: i }
          }));
        }
      }

      select(which) {
        if (!this._ready) {
          return;
        }
        var i = typeof which === "number" ? which : this._indexOf(String(which).replace(/^#/, ""));
        if (i > -1 && i < this._tabs.length) {
          this._activate(i, false, true);
        }
      }
    }
  );
})();
