/**
 * ncss - <ncss-scroll-video>: Scrollen spult ein Video vor UND zurück (Scroll-Position
 * -> video.currentTime). Light-DOM-Custom-Element, Optik: components/scroll-video.css.
 *
 * 1. Angepinnt (Standard): das Element wird so hoch wie length (Scroll-Strecke), die
 *    Bühne bleibt sticky im Bild, das Video füllt sie randlos (object-fit: cover):
 *      <ncss-scroll-video length="300">
 *        <div class="ncss-scroll-video-stage">
 *          <video muted playsinline controls preload="metadata" poster="poster.jpg"
 *                 src="scrub.mp4"></video>
 *          <p class="ncss-scroll-video-caption" data-ncss-time="1-3">Text ...</p>
 *        </div>
 *      </ncss-scroll-video>
 *
 * 2. inline: kein Anpinnen - das Video spult, während es den Viewport durchquert
 *    (unterer Rand kommt rein -> oberer Rand geht raus).
 *
 * 3. Scrollytelling: innerhalb von <ncss-scrolly> (js/scrolly.js) folgt das Video den
 *    Schritten. Jeder .ncss-scrolly-step trägt data-ncss-time="2" (springt auf 2 s,
 *    solange der Schritt aktiv ist) oder data-ncss-time="2-4" (spult von 2 auf 4 s,
 *    während der Schritt die Auslöse-Linie kreuzt). Die Position wird aus der
 *    Geometrie der Schritte berechnet (läuft auch ohne scrolly.js); zusätzlich hört das
 *    Element auf das "ncss-scrolly-step"-Event von <ncss-scrolly> (detail.time) - bei
 *    reduzierter Bewegung springt es damit pro Schritt hart auf die Startzeit, statt zu
 *    spulen. Das Element wird dort automatisch inline (die Scrolly-Bühne ist schon sticky).
 *
 * Attribute: start / end (Sekunden-Bereich, auf den die Scroll-Strecke abgebildet wird,
 *   end = Default Dauer) · length="300" (Scroll-Strecke in % der Viewport-Höhe) ·
 *   smoothing="0.85" (0 = direkt, bis 0.98 = träge nachlaufend) · inline · line="50"
 *   (Auslöse-Linie für Schritte, % von oben).
 * Öffentlich: el.progress (0-1), el.time (angefragte Zeit), el.active, el.refresh().
 * Events (bubbeln): ncss-scroll-video-change { progress, time } (gedrosselt auf rAF).
 *
 * Seeking: höchstens EIN Seek gleichzeitig, der nächste startet erst bei "seeked" -
 * schnelles Scrollen staut so keine Seeks auf. fastSeek() (WebKit/Gecko) nur bei großem
 * Abstand, das letzte Bild ist immer exakt. Für flüssiges Spulen in Safari das Video
 * all-intra (jedes Bild ein Keyframe) oder mit sehr kurzer GOP kodieren - ffmpeg-Befehle
 * in der Doku (video-audio.html, "Kodieren").
 *
 * Inaktiv (normales Video mit nativen Controls + Poster, nicht angepinnt, Captions
 * untereinander): bei prefers-reduced-motion (außer Scrollytelling, s.o.),
 * prefers-reduced-data oder Save-Data. Ohne JS: dasselbe.
 *
 * Benötigt: components/scroll-video.css (+ tokens.css/colors.css). Keine anderen
 * ncss-Scripts (scrolly.js ist optional, nur für den Event-Weg).
 */
(function () {
  "use strict";

  if (!window.customElements || typeof IntersectionObserver === "undefined" ||
      typeof requestAnimationFrame !== "function" || customElements.get("ncss-scroll-video")) {
    return;
  }

  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }
  // "2" -> [2, 2], "1-3" / "1 3" / "1,3" -> [1, 3]
  function parseRange(value) {
    var n = String(value === null || value === undefined ? "" : value).split(/\s*[-–,\s]\s*/).filter(Boolean).map(Number).filter(function (v) { return !isNaN(v); });
    return n.length ? [n[0], n.length > 1 ? n[1] : n[0]] : null;
  }
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function saveData() {
    return !!(navigator.connection && navigator.connection.saveData) || window.matchMedia("(prefers-reduced-data: reduce)").matches;
  }

  customElements.define(
    "ncss-scroll-video",
    class extends HTMLElement {
      connectedCallback() {
        if (this._video) {
          return;
        }
        this._video = this.querySelector("video");
        if (!this._video) {
          return;
        }
        this._init();
      }

      disconnectedCallback() {
        if (this._io) {
          this._io.disconnect();
        }
        cancelAnimationFrame(this._raf);
        window.removeEventListener("scroll", this._schedule);
        window.removeEventListener("resize", this._schedule);
      }

      get progress() {
        return this._progress || 0;
      }
      get time() {
        return this._current === null || this._current === undefined ? (this._video ? this._video.currentTime : 0) : this._current;
      }
      get active() {
        return !!this._active;
      }
      refresh() {
        if (this._refresh) {
          this._refresh();
        }
      }

      _init() {
        var el = this;
        var video = this._video;
        var scrolly = el.closest("ncss-scrolly");
        var steps = scrolly ? Array.prototype.slice.call(scrolly.querySelectorAll(".ncss-scrolly-step[data-ncss-time]")) : [];
        var inline = el.hasAttribute("inline") || !!scrolly;
        var captions = Array.prototype.slice.call(el.querySelectorAll(".ncss-scroll-video-caption[data-ncss-time]"));
        var smoothAttr = el.getAttribute("smoothing");
        var smoothing = clamp(smoothAttr === null ? 0.85 : Number(smoothAttr) || 0, 0, 0.98);
        var linePct = parseFloat(el.getAttribute("line")) || 50;
        var hadControls = video.controls;
        if (inline) {
          el.classList.add("is-inline");
        }
        if (el.getAttribute("length")) {
          el.style.setProperty("--ncss-scroll-video-length", parseFloat(el.getAttribute("length")) + "lvh");
        }

        var active = false;
        var stepwise = false; // reduzierte Bewegung im Scrollytelling: springen statt spulen
        var near = false;
        var raf = 0;
        var last = 0;
        var current = null;
        var target = 0;
        var seekBusy = false;
        var lastEmit = -1;

        function duration() {
          return isFinite(video.duration) ? video.duration : 0;
        }
        function range() {
          var d = duration();
          var s = clamp(Number(el.getAttribute("start")) || 0, 0, d);
          var e = el.getAttribute("end");
          return [s, e === null || e === "" ? d : clamp(Number(e), s, d)];
        }

        function computeTarget() {
          var vh = window.innerHeight;
          if (steps.length) {
            var line = vh * linePct / 100;
            var t = null;
            var done = 0;
            for (var i = 0; i < steps.length; i++) {
              var r = steps[i].getBoundingClientRect();
              var tr = parseRange(steps[i].getAttribute("data-ncss-time")) || [0, 0];
              if (r.top > line) {
                if (t === null) {
                  t = tr[0];
                }
                break;
              }
              done = i + 1;
              if (r.bottom >= line) {
                var p = clamp((line - r.top) / (r.height || 1), 0, 1);
                t = stepwise ? tr[0] : tr[0] + (tr[1] - tr[0]) * p;
                break;
              }
              t = tr[1];
            }
            el._progress = done / steps.length;
            return t === null ? 0 : t;
          }
          var box = el.getBoundingClientRect();
          el._progress = inline ?
            clamp((vh - box.top) / (vh + box.height), 0, 1) :
            clamp(-box.top / Math.max(1, box.height - vh), 0, 1);
          var rg = range();
          return rg[0] + (rg[1] - rg[0]) * el._progress;
        }

        function seek(time) {
          var d = duration();
          if (!d || seekBusy || video.seeking) {
            return;
          }
          time = clamp(time, 0, d - 0.001); // nicht ganz ans Ende: sonst feuert "ended"
          var diff = Math.abs(video.currentTime - time);
          if (diff < 1 / 120) {
            return;
          }
          seekBusy = true;
          if (typeof video.fastSeek === "function" && diff > 0.5 && Math.abs(target - time) > 0.25) {
            video.fastSeek(time);
          } else {
            video.currentTime = time;
          }
        }

        function tick(now) {
          raf = 0;
          if (!active) {
            return;
          }
          target = computeTarget();
          var dt = clamp((now - (last || now)) / 16.667, 0, 6);
          last = now;
          if (current === null || stepwise) {
            current = target;
          }
          current += (target - current) * (1 - Math.pow(smoothing, dt));
          if (Math.abs(target - current) < 0.002) {
            current = target;
          }
          el._current = current;
          seek(current);
          captions.forEach(function (c) {
            var r = parseRange(c.getAttribute("data-ncss-time"));
            c.classList.toggle("is-active", !!r && current >= r[0] && current <= r[1] + 0.001);
          });
          if (Math.abs(current - lastEmit) > 0.001) {
            lastEmit = current;
            el.dispatchEvent(new CustomEvent("ncss-scroll-video-change", { bubbles: true, detail: { progress: el._progress, time: current } }));
          }
          var settled = !near || !duration() || (current === target && !seekBusy && Math.abs(video.currentTime - target) < 1 / 60);
          if (!settled) {
            schedule();
          } else {
            last = 0;
          }
        }
        function schedule() {
          if (active && !raf) {
            raf = requestAnimationFrame(tick);
          }
        }
        el._schedule = schedule;

        function load() {
          if (!near || !active) {
            return;
          }
          if (video.preload !== "auto") {
            video.preload = "auto";
          }
          if (video.readyState === 0 && video.networkState !== HTMLMediaElement.NETWORK_LOADING) {
            video.load();
          }
        }

        function refresh() {
          var rm = motionQuery.matches;
          var want = !saveData() && !(rm && !steps.length);
          stepwise = rm && !!steps.length;
          if (want === active) {
            schedule();
            return;
          }
          active = want;
          el._active = active;
          el.classList.toggle("is-active", active);
          if (active) {
            video.controls = false;
            video.muted = true;
            video.playsInline = true;
            video.pause();
            current = null;
            load();
            schedule();
          } else {
            cancelAnimationFrame(raf);
            raf = 0;
            video.controls = hadControls || !steps.length;
            captions.forEach(function (c) { c.classList.remove("is-active"); });
          }
        }
        el._refresh = refresh;

        el._io = new IntersectionObserver(function (entries) {
          near = entries[entries.length - 1].isIntersecting;
          if (near) {
            load();
            schedule();
          }
        }, { rootMargin: "100% 0px" });
        el._io.observe(el);

        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule, { passive: true });
        video.addEventListener("seeked", function () {
          seekBusy = false;
          schedule();
        });
        video.addEventListener("loadedmetadata", function () {
          // iOS dekodiert Bilder erst nach einem play() - einmal stumm anstoßen.
          if (active && video.readyState < 2) {
            var p = video.play();
            if (p && p.then) {
              p.then(function () { video.pause(); }).catch(function () {});
            }
          }
          current = null;
          schedule();
        });
        video.addEventListener("ended", function () {
          if (active) {
            video.pause();
          }
        });
        // Scrollytelling-Kopplung: bei reduzierter Bewegung pro Schritt hart springen.
        if (scrolly) {
          scrolly.addEventListener("ncss-scrolly-step", function (event) {
            var time = event.detail && event.detail.time;
            if (stepwise && typeof time === "number" && duration()) {
              current = target = time;
              seekBusy = false;
              video.currentTime = clamp(time, 0, duration() - 0.001);
            }
            schedule();
          });
        }
        motionQuery.addEventListener("change", refresh);
        refresh();
      }
    }
  );
})();
