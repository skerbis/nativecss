/**
 * ncss - <ncss-slideshow>: Pfeile, Punkte und optionales Autoplay für
 * components/slideshow.css. Light-DOM-Custom-Element ohne Shadow Root - der Track
 * bleibt ein ganz normaler Scroll-Snap-Container (Wischen, Trackpad, Tastatur wie
 * bisher), das Script ergänzt nur Bedienelemente.
 *
 * Markup:
 *   <ncss-slideshow class="ncss-slideshow ncss-slideshow--controls" autoplay="6000">
 *     <ul class="ncss-slideshow-track" tabindex="0" aria-label="Fotos">
 *       <li class="ncss-slideshow-item">...</li>
 *     </ul>
 *   </ncss-slideshow>
 *
 * Nie doppelte Steuerung: Pfeile baut das Script nur ohne ::scroll-button(), Punkte nur
 * ohne ::scroll-marker - exakt dieselben Bedingungen wie die @supports-Blöcke in
 * slideshow.css. In Chromium 135+ bleibt bei .ncss-slideshow--controls also alles nativ,
 * das Script kümmert sich dort nur noch um ein eventuelles Autoplay.
 *
 * Mit .ncss-slideshow--shadow setzt das Script zusätzlich data-ncss-overflow="start end"
 * (Richtungen mit weiterem Inhalt) - davon hängen die Randschatten ab, wo die rein
 * scroll-getriebene CSS-Variante nicht greift (Safari, reduzierte Bewegung).
 *
 * Attribute (am Element):
 *   autoplay[="ms"]   automatischer Wechsel, Standard AUS; Wert = Intervall (Default 6000).
 *                     Bringt immer einen Pause-Knopf mit (WCAG 2.2.2), hält bei Hover/
 *                     Fokus in der Slideshow an, startet bei reduzierter Bewegung
 *                     (System oder <html data-motion="reduce">) gar nicht erst.
 * Beschriftungen: Deutsch/Englisch nach <html lang>, jede per data-label-<key> am Track
 *   (oder am Element) überschreibbar: prev, next, dots, dot ("{n} von {total}"), play, pause.
 *
 * Events (bubbeln): ncss-slideshow-change { index } bei neuem aktuellem Element,
 *   ncss-slideshow-play / ncss-slideshow-pause beim Umschalten des Autoplays.
 * Öffentlich: el.next(), el.prev(), el.goTo(index), el.play(), el.pause(), el.index.
 * Dynamische Elemente im Track: nach dem Einfügen "ncss-content-change" auslösen (oder
 *   js/content-observer.js einbinden) - Punkte und Pfeile werden dann neu berechnet.
 *
 * Ohne customElements wird nichts registriert (Element bleibt :not(:defined)) - die
 * Slideshow bleibt per Wischen/Scrollen voll bedienbar, nur ohne Fallback-Knöpfe.
 */
(function () {
  "use strict";

  if (!window.customElements || customElements.get("ncss-slideshow")) {
    return;
  }

  var TEXTS = {
    de: { prev: "Vorheriges Element", next: "Nächstes Element", dots: "Element wählen",
          dot: "{n} von {total}", play: "Automatisch abspielen", pause: "Automatik anhalten" },
    en: { prev: "Previous item", next: "Next item", dots: "Choose item",
          dot: "{n} of {total}", play: "Play automatically", pause: "Pause autoplay" }
  };
  var lang = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";

  var supports = window.CSS && CSS.supports ? CSS.supports.bind(CSS) : function () { return false; };
  var NATIVE_BUTTONS = supports("selector(::scroll-button(*))");
  var NATIVE_MARKERS = supports("selector(::scroll-marker)");

  var reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reducedMotion() {
    var m = document.documentElement.getAttribute("data-motion");
    if (m === "reduce") return true;
    if (m === "full") return false;
    return !!(reduceMq && reduceMq.matches);
  }

  var uid = 0;

  customElements.define(
    "ncss-slideshow",
    class extends HTMLElement {
      connectedCallback() {
        if (this._track) {
          return;
        }
        var track = this.querySelector(":scope > .ncss-slideshow-track");
        if (!track) {
          return;
        }
        this._track = track;
        this._index = -1;
        if (!track.id) {
          track.id = "ncss-slideshow-" + (++uid);
        }

        if (this.classList.contains("ncss-slideshow--controls")) {
          if (!NATIVE_BUTTONS) {
            this._prev = this._button("prev", "‹");
            this._next = this._button("next", "›");
            track.after(this._prev, this._next);
          }
          if (!NATIVE_MARKERS) {
            this._dots = document.createElement("div");
            this._dots.className = "ncss-slideshow-dots";
            this._dots.setAttribute("role", "group");
            this._dots.setAttribute("aria-label", this._text("dots"));
            this._dots.addEventListener("click", this._onDot.bind(this));
            (this._next || track).after(this._dots);
          }
        }

        this._onScroll = this._schedule.bind(this);
        track.addEventListener("scroll", this._onScroll, { passive: true });
        if (window.ResizeObserver) {
          this._ro = new ResizeObserver(this._onScroll);
          this._ro.observe(track);
        }

        // Dynamisch eingefügte Elemente (htmx, fetch+innerHTML): Punkte und Pfeil-Zustand
        // neu berechnen (siehe js/content-observer.js).
        var self = this;
        this._onContent = function (event) {
          var root = (event.detail && event.detail.root) || document;
          if (root === document || self.contains(root) || (root.contains && root.contains(self))) {
            self._schedule();
          }
        };
        document.addEventListener("ncss-content-change", this._onContent);

        if (this.hasAttribute("autoplay")) {
          this._setupAutoplay();
        }
        this._update();
      }

      disconnectedCallback() {
        if (this._track && this._onScroll) {
          this._track.removeEventListener("scroll", this._onScroll);
        }
        if (this._ro) {
          this._ro.disconnect();
        }
        this._stopTimer();
        document.removeEventListener("ncss-content-change", this._onContent);
        if (this._onMotion) {
          if (reduceMq && reduceMq.removeEventListener) reduceMq.removeEventListener("change", this._onMotion);
          document.removeEventListener("ncss-preferences-change", this._onMotion);
          document.removeEventListener("visibilitychange", this._onMotion);
        }
        // Erzeugte Knöpfe entfernen - beim erneuten Einhängen entstehen sie frisch.
        [this._prev, this._next, this._dots, this._toggle].forEach(function (el) {
          if (el) el.remove();
        });
        this._track = this._prev = this._next = this._dots = this._toggle = null;
      }

      get index() {
        return this._index;
      }

      next() {
        this._step(1);
      }

      prev() {
        this._step(-1);
      }

      goTo(i) {
        var items = this._items();
        if (!items[i]) return;
        this._scrollTo(this._offset(items[i]));
      }

      play() {
        if (!this._toggle) return;
        this._userPaused = false;
        this._syncAutoplay(true);
      }

      pause() {
        if (!this._toggle) return;
        this._userPaused = true;
        this._syncAutoplay(true);
      }

      // --- Hilfen ------------------------------------------------------------------

      _text(key) {
        var t = this._track;
        return (t && t.getAttribute("data-label-" + key)) || this.getAttribute("data-label-" + key) || TEXTS[lang][key];
      }

      _button(dir, glyph) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ncss-slideshow-button ncss-slideshow-button--" + dir;
        b.setAttribute("aria-label", this._text(dir));
        b.setAttribute("aria-controls", this._track.id);
        var span = document.createElement("span");
        span.setAttribute("aria-hidden", "true");
        span.textContent = glyph;
        b.appendChild(span);
        var self = this;
        b.addEventListener("click", function () {
          if (b.getAttribute("aria-disabled") !== "true") self._step(dir === "next" ? 1 : -1);
        });
        return b;
      }

      _items() {
        return Array.prototype.slice.call(this._track.querySelectorAll(":scope > .ncss-slideshow-item"));
      }

      _rtl() {
        return getComputedStyle(this._track).direction === "rtl";
      }

      // Abstand eines Elements vom Anfang des sichtbaren Track-Bereichs (in
      // Leserichtung, also auch bei RTL positiv = "weiter hinten").
      _offset(item) {
        var t = this._track.getBoundingClientRect();
        var r = item.getBoundingClientRect();
        var pad = parseFloat(getComputedStyle(this._track).scrollPaddingInlineStart) || 0;
        return this._rtl() ? t.right - pad - r.right : r.left - t.left - pad;
      }

      _scrollTo(delta) {
        // scroll-behavior des Tracks (smooth, bei reduzierter Bewegung auto) gilt auch hier.
        this._track.scrollBy({ left: this._rtl() ? -delta : delta });
      }

      _edges() {
        var t = this._track;
        var pos = Math.abs(t.scrollLeft);
        var max = t.scrollWidth - t.clientWidth;
        return { start: pos <= 1, end: pos >= max - 1 };
      }

      _step(dir) {
        var items = this._items();
        var target = null;
        for (var i = 0; i < items.length; i++) {
          var off = this._offset(items[i]);
          if (dir > 0 && off > 2) {
            target = off;
            break;
          }
          if (dir < 0 && off < -2) {
            target = off;
          }
        }
        if (target !== null) this._scrollTo(target);
      }

      _currentIndex(items) {
        if (!items.length) return -1;
        var edges = this._edges();
        // Am Ende: das letzte Element - schmale Elemente (--peek) erreichen den Anfang des
        // Tracks nie, ihr Punkt soll trotzdem aktiv werden können.
        if (edges.end && !edges.start) return items.length - 1;
        var best = 0;
        var bestDist = Infinity;
        for (var i = 0; i < items.length; i++) {
          var d = Math.abs(this._offset(items[i]));
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        return best;
      }

      _schedule() {
        if (this._raf) return;
        var self = this;
        this._raf = requestAnimationFrame(function () {
          self._raf = 0;
          self._update();
        });
      }

      _update() {
        if (!this._track) return;
        var items = this._items();
        var edges = this._edges();
        if (this._prev) {
          this._prev.setAttribute("aria-disabled", edges.start ? "true" : "false");
          this._next.setAttribute("aria-disabled", edges.end ? "true" : "false");
        }
        // Für .ncss-slideshow--shadow: in welche Richtung geht es weiter? (CSS blendet
        // danach die Randschatten ein - Fallback für Browser ohne funktionierende
        // scroll-getriebene Animation, siehe slideshow.css.)
        if (this.classList.contains("ncss-slideshow--shadow")) {
          var more = [];
          if (!edges.start) more.push("start");
          if (!edges.end) more.push("end");
          this.setAttribute("data-ncss-overflow", more.join(" "));
        }
        var index = this._currentIndex(items);
        if (this._dots) this._renderDots(items, index);
        if (index !== this._index) {
          var first = this._index === -1;
          this._index = index;
          if (!first) {
            this.dispatchEvent(new CustomEvent("ncss-slideshow-change", { bubbles: true, detail: { index: index } }));
          }
        }
      }

      _renderDots(items, index) {
        var dots = this._dots;
        // Anzahl geändert (dynamisch eingefügte Elemente)? Dann neu aufbauen.
        if (dots.children.length !== items.length) {
          var focused = dots.contains(document.activeElement);
          dots.textContent = "";
          for (var i = 0; i < items.length; i++) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "ncss-slideshow-dot";
            b.setAttribute("aria-controls", this._track.id);
            b.setAttribute("aria-label", this._text("dot").replace("{n}", i + 1).replace("{total}", items.length));
            dots.appendChild(b);
          }
          if (focused && dots.firstChild) dots.firstChild.focus();
        }
        for (var j = 0; j < dots.children.length; j++) {
          if (j === index) {
            dots.children[j].setAttribute("aria-current", "true");
          } else {
            dots.children[j].removeAttribute("aria-current");
          }
        }
      }

      _onDot(event) {
        var b = event.target.closest(".ncss-slideshow-dot");
        if (!b) return;
        this.goTo(Array.prototype.indexOf.call(this._dots.children, b));
      }

      // --- Autoplay (opt-in) -----------------------------------------------------------

      _setupAutoplay() {
        var self = this;
        var ms = parseInt(this.getAttribute("autoplay"), 10);
        this._interval = ms >= 1000 ? ms : 6000;
        this._userPaused = reducedMotion();
        this._hold = false;

        this._toggle = document.createElement("button");
        this._toggle.type = "button";
        this._toggle.className = "ncss-slideshow-toggle";
        this._toggle.setAttribute("aria-controls", this._track.id);
        this._toggle.addEventListener("click", function () {
          self._userPaused = !self._userPaused;
          self._syncAutoplay(true);
        });
        // Im DOM VOR dem Track: der Pause-Knopf ist das Erste, was Tastatur- und
        // Screenreader-Nutzer erreichen (optisch steht er unten links).
        this.insertBefore(this._toggle, this.firstChild);

        // Anhalten, solange Maus oder Fokus in der Slideshow sind - außer der Fokus liegt
        // auf dem Pause-Knopf selbst (sonst könnte man das Autoplay nie per Tastatur starten
        // und gleichzeitig beobachten).
        // Nur einmal pro Element binden (auch nach Aus- und Wiedereinhängen).
        if (!this._holdBound) {
          this._holdBound = true;
          var hold = function () {
            var a = document.activeElement;
            self._hold = self._hover || (self.contains(a) && a !== self._toggle);
            self._syncAutoplay(false);
          };
          this.addEventListener("pointerenter", function () { self._hover = true; hold(); });
          this.addEventListener("pointerleave", function () { self._hover = false; hold(); });
          this.addEventListener("focusin", hold);
          this.addEventListener("focusout", function () { setTimeout(hold, 0); });
        }

        this._onMotion = function () {
          if (reducedMotion()) self._userPaused = true;
          self._syncAutoplay(false);
        };
        if (reduceMq && reduceMq.addEventListener) reduceMq.addEventListener("change", this._onMotion);
        document.addEventListener("ncss-preferences-change", this._onMotion);
        document.addEventListener("visibilitychange", this._onMotion);

        this._syncAutoplay(false);
      }

      _syncAutoplay(notify) {
        if (!this._toggle) return;
        var playing = !this._userPaused;
        this._toggle.textContent = playing ? this._text("pause") : this._text("play");
        var run = playing && !this._hold && !document.hidden;
        if (run) {
          this._startTimer();
        } else {
          this._stopTimer();
        }
        if (notify) {
          this.dispatchEvent(new CustomEvent(playing ? "ncss-slideshow-play" : "ncss-slideshow-pause", { bubbles: true }));
        }
      }

      _startTimer() {
        if (this._timer) return;
        var self = this;
        this._timer = setInterval(function () {
          if (self._edges().end) {
            self._scrollTo(-Math.abs(self._track.scrollLeft) - 1);
          } else {
            self._step(1);
          }
        }, this._interval);
      }

      _stopTimer() {
        if (this._timer) {
          clearInterval(this._timer);
          this._timer = 0;
        }
      }
    }
  );
})();
