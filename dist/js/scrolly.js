/**
 * ncss - <ncss-scrolly>: Scrollytelling-Element (Markup/Optik: components/scrolly.css).
 * Reines Light-DOM-Custom-Element (kein Shadow Root) - Schritte und Medien bleiben normales
 * Seiten-Markup, ohne dieses Script einfach untereinander lesbar.
 *
 * Markiert den Schritt, der eine waagerechte Linie im Viewport kreuzt (Default: Mitte,
 * Attribut line="50" in % von oben), und das Medium mit demselben Index mit .is-active
 * (IntersectionObserver auf einen 1px hohen Streifen statt Scroll-Listener).
 *
 * API:
 *   el.step            Index des aktiven Schritts (lesen); el.step = 2 scrollt Schritt 3
 *                      in die Mitte (respektiert prefers-reduced-motion).
 *   "ncss-scrolly-step"-Event  bubbelt, detail = { index, time, step, figure }. time = Zahl aus
 *                      data-ncss-time am Schritt (Sekunden) oder null - Andockpunkt für
 *                      ein scroll-gesteuertes Video (seeken auf time).
 *
 * Benötigt: components/scrolly.css (+ tokens.css/colors.css). Ohne IntersectionObserver
 * wird das Element gar nicht erst definiert (SKILL-Regel: kein halb funktionierendes
 * :defined) - es bleibt beim lesbaren Fluss-Layout.
 *
 * Einbindung: <script src="ncss/js/scrolly.js" defer></script>
 */
(function () {
  "use strict";

  if (!window.customElements || typeof IntersectionObserver === "undefined" || customElements.get("ncss-scrolly")) {
    return;
  }

  customElements.define(
    "ncss-scrolly",
    class extends HTMLElement {
      connectedCallback() {
        this._steps = Array.prototype.slice.call(this.querySelectorAll(".ncss-scrolly-step"));
        this._figures = Array.prototype.slice.call(this.querySelectorAll(".ncss-scrolly-figure"));
        this._index = -1;
        if (!this._steps.length) return;

        var line = parseFloat(this.getAttribute("line"));
        if (!(line >= 0 && line <= 100)) line = 50;
        var self = this;

        this._io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) self._activate(self._steps.indexOf(entry.target));
            });
          },
          { rootMargin: "-" + line + "% 0px -" + Math.max(0, 100 - line - 0.1) + "% 0px" }
        );
        this._steps.forEach(function (step) {
          self._io.observe(step);
        });

        // Startzustand: letzter Schritt, dessen Oberkante schon über der Linie liegt.
        var y = (window.innerHeight * line) / 100;
        var best = 0;
        this._steps.forEach(function (step, k) {
          if (step.getBoundingClientRect().top <= y) best = k;
        });
        this._activate(best);
      }

      disconnectedCallback() {
        if (this._io) this._io.disconnect();
      }

      get step() {
        return this._index;
      }

      set step(i) {
        var target = this._steps && this._steps[i];
        if (!target) return;
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ block: "center", behavior: reduce ? "instant" : "smooth" });
      }

      _activate(i) {
        if (i < 0 || i === this._index) return;
        this._index = i;
        var step = this._steps[i];
        var figure = this._figures[Math.min(i, this._figures.length - 1)] || null;
        this._steps.forEach(function (s, k) {
          s.classList.toggle("is-active", k === i);
        });
        this._figures.forEach(function (f) {
          f.classList.toggle("is-active", f === figure);
        });
        var time = parseFloat(step.getAttribute("data-ncss-time"));
        this.dispatchEvent(
          new CustomEvent("ncss-scrolly-step", {
            bubbles: true,
            detail: { index: i, time: isNaN(time) ? null : time, step: step, figure: figure }
          })
        );
      }
    }
  );
})();
