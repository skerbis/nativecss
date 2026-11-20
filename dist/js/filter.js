/**
 * ncss - <ncss-filter>: optionale Erweiterung für components/filter.css. Light-DOM-
 * Custom-Element ohne Shadow Root - das Filtern selbst erledigt weiterhin CSS (:has()),
 * das Script ergänzt nur:
 *   1. Trefferzahl in einem Live-Bereich ("6 Einträge", role="status") - sichtbar für
 *      alle und vom Screenreader angesagt. Eigenes Element möglich:
 *      <p class="ncss-filter-status" data-ncss-filter-status></p> irgendwo im Filter,
 *      sonst wird eins direkt nach der Leiste erzeugt.
 *   2. Beliebige Kategorienamen (value="zimmer" / data-category="zimmer spa") zusätzlich
 *      zu den CSS-Nummern 1-12: nicht passende Einträge bekommen data-ncss-filter-out.
 *   3. View Transitions beim Umschalten (Einträge gleiten an ihren neuen Platz), wo der
 *      Browser sie kann - NICHT bei reduzierter Bewegung (System oder
 *      <html data-motion="reduce">).
 * Mehrfachauswahl braucht kein Script: Checkboxen statt Radios in der Leiste genügen.
 *
 * Markup: <ncss-filter class="ncss-filter"> statt <div class="ncss-filter">, Rest gleich.
 * Texte: Deutsch/Englisch nach <html lang>, per data-label-status ("{n} Einträge"),
 *   data-label-status-one, data-label-status-none am Element überschreibbar.
 * Events (bubbeln): ncss-filter-change { values: [...], count } nach jeder Änderung.
 * Dynamische Einträge (htmx, fetch+innerHTML): beim "ncss-content-change"-Event wird neu
 *   gezählt/markiert (siehe js/content-observer.js).
 *
 * Ohne customElements: nichts wird registriert, das reine CSS-Filtern (1-12) läuft weiter.
 */
(function () {
  "use strict";

  if (!window.customElements || customElements.get("ncss-filter")) {
    return;
  }

  var TEXTS = {
    de: { status: "{n} Einträge", "status-one": "1 Eintrag", "status-none": "Keine Einträge" },
    en: { status: "{n} entries", "status-one": "1 entry", "status-none": "No entries" }
  };
  var lang = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";

  var reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reducedMotion() {
    var m = document.documentElement.getAttribute("data-motion");
    if (m === "reduce") return true;
    if (m === "full") return false;
    return !!(reduceMq && reduceMq.matches);
  }

  var HAS_TYPES = typeof window.ViewTransition === "function" && "types" in window.ViewTransition.prototype;

  var uid = 0;

  customElements.define(
    "ncss-filter",
    class extends HTMLElement {
      connectedCallback() {
        if (this._onChange) {
          return;
        }
        this._uid = ++uid;
        this._onChange = this._handleChange.bind(this);
        this.addEventListener("change", this._onChange);
        var self = this;
        this._onContent = function (event) {
          var root = (event.detail && event.detail.root) || document;
          if (root === document || self.contains(root) || (root.contains && root.contains(self))) {
            self._apply(false);
          }
        };
        document.addEventListener("ncss-content-change", this._onContent);

        var bar = this._bar();
        if (bar) {
          this._status = this.querySelector("[data-ncss-filter-status]");
          if (!this._status) {
            this._status = document.createElement("p");
            this._status.className = "ncss-filter-status";
            bar.after(this._status);
          }
          this._status.setAttribute("role", "status");
        }
        this._state = this._checked();
        this._apply(false);
      }

      disconnectedCallback() {
        this.removeEventListener("change", this._onChange);
        document.removeEventListener("ncss-content-change", this._onContent);
        this._onChange = null;
      }

      _bar() {
        return this.querySelector(".ncss-filter-bar");
      }

      _inputs() {
        var bar = this._bar();
        return bar ? Array.prototype.slice.call(bar.querySelectorAll("input")) : [];
      }

      _checked() {
        return this._inputs().filter(function (i) { return i.checked; });
      }

      _items() {
        return Array.prototype.slice.call(this.querySelectorAll(".ncss-filter-item"));
      }

      _text(key, n) {
        return (this.getAttribute("data-label-" + key) || TEXTS[lang][key]).replace("{n}", n);
      }

      // Markiert nicht passende Einträge (deckt beliebige Namen ab - bei den Nummern 1-12
      // kommt CSS zum selben Ergebnis) und aktualisiert die Trefferzahl.
      _apply(notify) {
        var values = this._checked()
          .map(function (i) { return i.value.trim(); })
          .filter(function (v) { return v && v !== "all"; });
        var count = 0;
        this._items().forEach(function (item) {
          var cats = (item.getAttribute("data-category") || "").split(/\s+/);
          var hit = !values.length || values.some(function (v) { return cats.indexOf(v) !== -1; });
          if (hit) {
            count++;
            item.removeAttribute("data-ncss-filter-out");
          } else {
            item.setAttribute("data-ncss-filter-out", "");
          }
        });
        if (this._status) {
          this._status.textContent = count === 0 ? this._text("status-none", 0)
            : count === 1 ? this._text("status-one", 1) : this._text("status", count);
        }
        if (notify) {
          this.dispatchEvent(new CustomEvent("ncss-filter-change", { bubbles: true, detail: { values: values, count: count } }));
        }
      }

      _handleChange(event) {
        var bar = this._bar();
        if (!bar || !bar.contains(event.target)) {
          return;
        }
        var before = this._state;
        var after = this._checked();
        this._state = after;
        var self = this;

        if (!document.startViewTransition || reducedMotion()) {
          this._apply(true);
          return;
        }

        // Der Browser hat die Auswahl schon umgestellt (CSS filtert sofort). Für den
        // "Vorher"-Schnappschuss kurz den alten Zustand zurücksetzen, im Update-Callback
        // wieder den neuen - Fokus und Formularwert bleiben dabei unberührt.
        var inputs = this._inputs();
        inputs.forEach(function (i) { i.checked = before.indexOf(i) !== -1; });
        var items = this._items();
        items.forEach(function (item, n) {
          item.style.viewTransitionName = "ncss-filter-" + self._uid + "-" + n;
        });
        var update = function () {
          inputs.forEach(function (i) { i.checked = after.indexOf(i) !== -1; });
          self._apply(true);
        };
        // Mit Typ "ncss-filter" (filter.css: Seite selbst ohne Überblendung, nur die
        // Einträge bewegen sich). Ältere Browser kennen nur die Funktions-Form.
        var transition = HAS_TYPES
          ? document.startViewTransition({ update: update, types: ["ncss-filter"] })
          : document.startViewTransition(update);
        transition.finished.finally(function () {
          items.forEach(function (item) { item.style.viewTransitionName = ""; });
        });
        // Übersprungene Transition (z. B. Tab im Hintergrund) ist kein Fehler.
        transition.ready.catch(function () {});
      }
    }
  );
})();
