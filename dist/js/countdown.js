/**
 * ncss - <ncss-countdown>: Restzeit bis zu einem Zeitpunkt (Markup/Optik siehe
 * components/countdown.css). Reines Light-DOM-Custom-Element.
 *
 * Ohne JS bleibt der Inhalt stehen, den das Markup mitbringt - ein normales <time> mit
 * dem ausgeschriebenen Datum ("24. Dezember 2026, 18 Uhr"), immer lesbar und korrekt.
 * Mit JS: sichtbare Ziffern-Kacheln (aria-hidden, sie ticken jede Sekunde) + eine
 * Screenreader-Zeile mit role="timer" (ARIA: implizit aria-live="off"), die nur
 * MINÜTLICH neu geschrieben wird - jederzeit lesbar, aber nie ungefragt vorgelesen (eine
 * Sekunden-Ansage wäre unbenutzbar). Ansagen laufen über eine ZWEITE, von Anfang an
 * leere role="status"-Region (eine Live-Region erst nachträglich auf "polite" umzustellen
 * ist in Screenreadern unzuverlässig):
 *   - data-ncss-announce="minute": dort zusätzlich minütlich der neue Stand.
 *   - Das ENDE wird immer angesagt.
 *
 * Attribute:
 *   datetime="2026-12-24T18:00:00+01:00"  Zielzeitpunkt (Pflicht, ISO 8601; ohne Zone =
 *                                          lokale Zeit des Besuchers)
 *   data-ncss-units="days hours minutes seconds"   sichtbare Einheiten (Default alle)
 *   data-ncss-done-text="Jetzt live!"     Text nach Ablauf (Default: "Abgelaufen")
 * Einheiten-Beschriftung + Zahlenformat kommen aus Intl.NumberFormat (style "unit") nach
 * lang des Elements/der Seite - "Tage"/"days" ohne eigene Übersetzungstabelle.
 *
 * Event: "ncss-countdown-end" (bubbles), nur wenn der Zeitpunkt WÄHREND des Besuchs
 * erreicht wird - ist er beim Laden schon vorbei, zeigt das Element still den Endzustand
 * (sonst feuerte jede spätere Seitenansicht erneut z.B. eine Benachrichtigung).
 * Endzustand zusätzlich als Attribut data-ncss-ended (für CSS).
 */
(function () {
  "use strict";

  if (typeof customElements === "undefined" || customElements.get("ncss-countdown")) return;
  if (typeof Intl === "undefined" || typeof Intl.NumberFormat !== "function") return;

  var UNIT = { days: ["day", 86400], hours: ["hour", 3600], minutes: ["minute", 60], seconds: ["second", 1] };
  var TEXT = {
    de: { left: "Noch {t}", done: "Abgelaufen" },
    en: { left: "{t} left", done: "Time is up" }
  };

  function langOf(el) {
    var host = el.closest("[lang]");
    return (host && host.getAttribute("lang")) || document.documentElement.lang || "en";
  }

  customElements.define(
    "ncss-countdown",
    class extends HTMLElement {
      connectedCallback() {
        if (this._timer) return;
        var target = Date.parse(this.getAttribute("datetime") || "");
        if (isNaN(target)) return;
        this._target = target;
        this._lang = langOf(this);
        this._text = TEXT[this._lang.slice(0, 2)] || TEXT.en;
        var wanted = (this.getAttribute("data-ncss-units") || "days hours minutes seconds").split(/\s+/);
        this._units = wanted.filter(function (u) { return UNIT[u]; });
        if (!this._units.length) this._units = ["days", "hours", "minutes", "seconds"];

        if (!this._built) this._build();
        this._lastMinute = null;
        this._ended = Date.now() >= target;
        this._tick(true);
        if (!this._ended) {
          var self = this;
          this._timer = setInterval(function () { self._tick(false); }, 1000);
        }
      }

      disconnectedCallback() {
        clearInterval(this._timer);
        this._timer = null;
      }

      _build() {
        var self = this;
        this._built = true;
        // Originalinhalt (z.B. <time>) bleibt für Screenreader als Kontext erhalten -
        // nur optisch versteckt, er nennt das absolute Datum zusätzlich zur Restzeit.
        var original = document.createElement("span");
        original.className = "ncss-countdown-fallback";
        while (this.firstChild) original.appendChild(this.firstChild);

        this._visual = document.createElement("span");
        this._visual.className = "ncss-countdown-units";
        this._visual.setAttribute("aria-hidden", "true");
        this._cells = {};
        this._units.forEach(function (u) {
          var cell = document.createElement("span");
          cell.className = "ncss-countdown-unit";
          var value = document.createElement("span");
          value.className = "ncss-countdown-value";
          var label = document.createElement("span");
          label.className = "ncss-countdown-label";
          cell.append(value, label);
          self._visual.appendChild(cell);
          self._cells[u] = { value: value, label: label };
        });
        this._sr = document.createElement("span");
        this._sr.className = "ncss-countdown-sr";
        this._sr.setAttribute("role", "timer");
        this._say = document.createElement("span");
        this._say.className = "ncss-countdown-sr";
        this._say.setAttribute("role", "status");
        this._done = document.createElement("span");
        this._done.className = "ncss-countdown-done";
        this._done.setAttribute("aria-hidden", "true");
        this._done.hidden = true;
        this.append(this._visual, this._done, original, this._sr, this._say);
      }

      _parts(unit, n) {
        // formatToParts trennt Zahl und Einheit sprachrichtig ("3 Tage", "1 day").
        try {
          var parts = new Intl.NumberFormat(this._lang, {
            style: "unit", unit: UNIT[unit][0], unitDisplay: "long"
          }).formatToParts(n);
          var num = "", label = "";
          parts.forEach(function (p) {
            if (p.type === "integer" || p.type === "group") num += p.value;
            else if (p.type === "unit") label += p.value;
          });
          return { num: num, label: label, full: parts.map(function (p) { return p.value; }).join("") };
        } catch (e) {
          return { num: String(n), label: unit, full: n + " " + unit };
        }
      }

      _tick(initial) {
        var self = this;
        var rest = Math.max(0, Math.round((this._target - Date.now()) / 1000));
        var spoken = [];
        var remaining = rest;
        this._units.forEach(function (u, i) {
          var size = UNIT[u][1];
          // Größte gewählte Einheit nimmt den ganzen Rest auf (z.B. 40 Stunden ohne "days").
          var n = Math.floor(remaining / size);
          remaining -= n * size;
          var p = self._parts(u, n);
          var cell = self._cells[u];
          cell.value.textContent = i === 0 ? p.num : p.num.padStart(2, "0");
          cell.label.textContent = p.label;
          if (size >= 60 || self._units.length === 1) spoken.push(p.full);
        });

        if (rest <= 0) {
          this._finish(initial);
          return;
        }
        // Screenreader-Zeile nur minütlich neu schreiben (bei reinen Sekunden-Countdowns
        // ohne größere Einheit: bei jeder vollen Minute bzw. am Anfang).
        var minute = Math.floor(rest / 60);
        if (minute !== this._lastMinute) {
          this._lastMinute = minute;
          var list = rest < 60 || !spoken.length ? [this._parts("seconds", rest).full] : spoken;
          var joined;
          try {
            joined = new Intl.ListFormat(this._lang, { style: "long", type: "unit" }).format(list);
          } catch (e) {
            joined = list.join(", ");
          }
          this._sr.textContent = this._text.left.replace("{t}", joined);
          if (!initial && this.getAttribute("data-ncss-announce") === "minute") this._say.textContent = this._sr.textContent;
        }
      }

      _finish(initial) {
        clearInterval(this._timer);
        this._timer = null;
        var text = this.getAttribute("data-ncss-done-text") || this._text.done;
        this._done.textContent = text;
        this._done.hidden = false;
        this._visual.hidden = true;
        this.setAttribute("data-ncss-ended", "");
        // Ende während des Besuchs: höflich ansagen, egal welcher Ansage-Modus.
        this._sr.textContent = text;
        if (!initial) this._say.textContent = text;
        if (!initial && !this._ended) {
          this._ended = true;
          this.dispatchEvent(new CustomEvent("ncss-countdown-end", { bubbles: true }));
        }
      }
    }
  );
})();
