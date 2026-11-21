/**
 * ncss - <ncss-compare>: Vorher/Nachher-Vergleich (siehe components/compare.css für
 * Markup). Light-DOM-Custom-Element ohne Shadow Root - der native
 * <input type="range"> darin erledigt Maus, Touch, Tastatur und Screenreader, dieses
 * Script setzt nur --ncss-compare-position (auf die Daumen-Strecke umgerechnet) und
 * aria-valuetext.
 *
 * Attribute:
 *   data-label-value="{n} % vorher"   gesprochener Wert ({n} = Prozent), Default Deutsch/
 *                                    Englisch nach dem nächsten [lang] (früher value-text,
 *                                    wird weiter gelesen)
 *
 * Events (bubbeln): ncss-compare-change { value } - bei jeder Bewegung des Reglers.
 * Öffentlich: el.value (lesen/setzen, 0-100 bzw. min-max des Reglers).
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements (sehr alte Browser)
 * wird gar nichts registriert - das Element bleibt :not(:defined), CSS zeigt den
 * statischen 50/50-Vergleich ohne Regler (siehe SKILL.md-Regel zu define()-Guards).
 */
(function () {
  "use strict";

  if (!window.customElements || customElements.get("ncss-compare")) {
    return;
  }

  var TEXTS = { de: "{n} % vorher", en: "{n}% before" };

  customElements.define(
    "ncss-compare",
    class extends HTMLElement {
      connectedCallback() {
        this._range = this.querySelector(".ncss-compare-range, input[type=\"range\"]");
        if (!this._range || this._onInput) {
          return;
        }
        this._onInput = this._sync.bind(this, true);
        this._range.addEventListener("input", this._onInput);
        this._sync(false);
      }

      disconnectedCallback() {
        if (this._range && this._onInput) {
          this._range.removeEventListener("input", this._onInput);
          this._onInput = null;
        }
      }

      get value() {
        return this._range ? Number(this._range.value) : NaN;
      }

      set value(v) {
        if (!this._range) {
          return;
        }
        this._range.value = v;
        this._sync(true);
      }

      _sync(notify) {
        var r = this._range;
        var min = Number(r.min || 0);
        var max = Number(r.max || 100);
        var pct = ((Number(r.value) - min) / (max - min)) * 100;
        /* Daumen-Mitte: von handle/2 bis 100% - handle/2 (Regler so breit wie der Rahmen). */
        this.style.setProperty("--ncss-compare-position",
          "calc(var(--ncss-compare-handle) / 2 + (100% - var(--ncss-compare-handle)) * " + (pct / 100) + ")");
        var host = this.closest("[lang]") || document.documentElement;
        var text = this.getAttribute("data-label-value") || this.getAttribute("value-text") ||
          TEXTS[(host.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de"];
        r.setAttribute("aria-valuetext", text.replace("{n}", Math.round(pct)));
        if (notify) {
          this.dispatchEvent(new CustomEvent("ncss-compare-change", { bubbles: true, detail: { value: pct } }));
        }
      }
    }
  );
})();
