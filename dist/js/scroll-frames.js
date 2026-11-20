/**
 * ncss - <ncss-scroll-frames>: Bildsequenz statt Video - zeichnet passend zur
 * Scroll-Position ein Einzelbild auf ein <canvas>. Jedes Bild ist ein vollständiges Foto,
 * Spulen ist deshalb in JEDER Engine butterweich (kein Video-Dekodieren, kein Seeking) -
 * die robuste Alternative zu <ncss-scroll-video>, wenn Safari-Ruckeln nicht akzeptabel
 * ist. Optik: components/scroll-frames.css.
 *
 *   <ncss-scroll-frames src="frames/f-%03d.webp" count="72" length="300">
 *     <div class="ncss-scroll-frames-stage">
 *       <img class="ncss-scroll-frames-poster" src="frames/f-001.webp" alt="Was die Sequenz zeigt"
 *            width="800" height="450">
 *     </div>
 *   </ncss-scroll-frames>
 *
 * Das <img> ist zugleich Fallback (kein JS, reduzierte Bewegung, Save-Data: nur dieses
 * Standbild) und Quelle für Seitenverhältnis + Alternativtext: das Script legt ein
 * <canvas role="img"> mit demselben aria-label daneben und blendet das <img> aus.
 *
 * Attribute: src (Muster, %d bzw. %03d = Bildnummer mit Nullen) · count · first="1" ·
 *   length="300" (Scroll-Strecke in % der Viewport-Höhe) · smoothing="0.6" · fit="cover"
 *   (oder contain) · inline (nicht anpinnen, spult beim Durchqueren des Viewports).
 * Öffentlich: el.frame (gezeichneter Index), el.loaded (Anzahl geladener Bilder),
 *   el.progress.
 *
 * Laden: erst wenn das Element in die Nähe des Viewports kommt, dann progressiv - jedes
 * 16. Bild zuerst, dann jedes 8., 4., 2. und der Rest. So spult eine grobe Fassung sofort,
 * Lücken füllt das jeweils nächstgelegene geladene Bild.
 *
 * Benötigt: components/scroll-frames.css (+ tokens.css/colors.css). Keine anderen
 * ncss-Scripts.
 */
(function () {
  "use strict";

  if (!window.customElements || typeof IntersectionObserver === "undefined" ||
      typeof HTMLCanvasElement === "undefined" || customElements.get("ncss-scroll-frames")) {
    return;
  }

  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function saveData() {
    return !!(navigator.connection && navigator.connection.saveData) || window.matchMedia("(prefers-reduced-data: reduce)").matches;
  }

  customElements.define(
    "ncss-scroll-frames",
    class extends HTMLElement {
      connectedCallback() {
        if (this._canvas) {
          return;
        }
        var count = Math.floor(Number(this.getAttribute("count")) || 0);
        var poster = this.querySelector(".ncss-scroll-frames-poster");
        if (!count || !this.getAttribute("src") || !poster) {
          return;
        }
        this._init(count, poster);
      }

      get frame() {
        return this._drawn === undefined ? -1 : this._drawn;
      }
      get loaded() {
        return this._loaded || 0;
      }
      get progress() {
        return this._progress || 0;
      }

      _init(count, poster) {
        var el = this;
        var pattern = el.getAttribute("src");
        var first = Number(el.getAttribute("first") || 1);
        var smoothAttr = el.getAttribute("smoothing");
        var smoothing = clamp(smoothAttr === null ? 0.6 : Number(smoothAttr) || 0, 0, 0.98);
        var contain = el.getAttribute("fit") === "contain";
        var inline = el.hasAttribute("inline");
        if (inline) {
          el.classList.add("is-inline");
        }
        if (el.getAttribute("length")) {
          el.style.setProperty("--ncss-scroll-frames-length", parseFloat(el.getAttribute("length")) + "lvh");
        }
        var canvas = document.createElement("canvas");
        canvas.className = "ncss-scroll-frames-canvas";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", poster.alt || "");
        if (poster.getAttribute("width") && poster.getAttribute("height")) {
          canvas.style.setProperty("--ncss-scroll-frames-ratio", poster.getAttribute("width") + " / " + poster.getAttribute("height"));
        }
        poster.after(canvas);
        el._canvas = canvas;
        var ctx = canvas.getContext("2d");

        function url(i) {
          return pattern.replace(/%(0?)(\d*)d/, function (m, zero, width) {
            var n = String(i + first);
            return zero ? n.padStart(Number(width) || 0, "0") : n;
          });
        }

        var images = new Array(count);
        var requested = {};
        var queue = [];
        var inflight = 0;
        var active = false;
        var near = false;
        var raf = 0;
        var last = 0;
        var current = null;
        var dirty = true;
        el._loaded = 0;
        el._drawn = -1;

        function order() {
          var list = [];
          var seen = {};
          [16, 8, 4, 2, 1].forEach(function (step) {
            for (var i = 0; i < count; i += step) {
              if (!seen[i]) {
                seen[i] = true;
                list.push(i);
              }
            }
            if (!seen[count - 1]) {
              seen[count - 1] = true;
              list.push(count - 1);
            }
          });
          return list;
        }
        function pump() {
          while (inflight < 6 && queue.length) {
            var i = queue.shift();
            if (requested[i]) {
              continue;
            }
            requested[i] = true;
            inflight++;
            load(i);
          }
        }
        function load(i) {
          var img = new Image();
          img.decoding = "async";
          img.src = url(i);
          var done = function () {
            inflight--;
            pump();
          };
          (img.decode ? img.decode() : Promise.resolve()).then(function () {
            images[i] = img;
            el._loaded++;
            dirty = true;
            schedule();
          }).catch(function () { /* fehlendes Bild: das nächstgelegene springt ein */ }).then(done);
        }
        function want(list, front) {
          var fresh = list.filter(function (i) { return !requested[i]; });
          queue = front ? fresh.concat(queue) : queue.concat(fresh);
          pump();
        }
        function nearest(i) {
          if (images[i]) {
            return i;
          }
          for (var d = 1; d < count; d++) {
            if (images[i - d]) {
              return i - d;
            }
            if (images[i + d]) {
              return i + d;
            }
          }
          return -1;
        }
        function size() {
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          var w = Math.round(canvas.clientWidth * dpr);
          var h = Math.round(canvas.clientHeight * dpr);
          if (w && h && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
            dirty = true;
          }
        }
        function draw(i) {
          var k = nearest(i);
          if (k < 0 || (k === el._drawn && !dirty)) {
            return;
          }
          dirty = false;
          var img = images[k];
          var cw = canvas.width;
          var ch = canvas.height;
          var s = (contain ? Math.min : Math.max)(cw / img.naturalWidth, ch / img.naturalHeight);
          var w = img.naturalWidth * s;
          var h = img.naturalHeight * s;
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
          el._drawn = k;
        }
        function computeTarget() {
          var vh = window.innerHeight;
          var r = el.getBoundingClientRect();
          el._progress = inline ?
            clamp((vh - r.top) / (vh + r.height), 0, 1) :
            clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
          return el._progress * (count - 1);
        }
        function tick(now) {
          raf = 0;
          if (!active) {
            return;
          }
          size();
          var target = computeTarget();
          var dt = clamp((now - (last || now)) / 16.667, 0, 6);
          last = now;
          if (current === null) {
            current = target;
          }
          current += (target - current) * (1 - Math.pow(smoothing, dt));
          if (Math.abs(target - current) < 0.01) {
            current = target;
          }
          var i = Math.round(current);
          if (!images[i] && !requested[i] && near) {
            want([i], true);
          }
          draw(i);
          if (current !== target) {
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
        function refresh() {
          active = !motionQuery.matches && !saveData();
          el.classList.toggle("is-active", active);
          current = null;
          dirty = true;
          if (active && near) {
            want(order());
          }
          schedule();
        }
        new IntersectionObserver(function (entries) {
          near = entries[entries.length - 1].isIntersecting;
          if (near && active) {
            want(order());
            schedule();
          }
        }, { rootMargin: "100% 0px" }).observe(el);
        if (typeof ResizeObserver === "function") {
          new ResizeObserver(function () {
            dirty = true;
            schedule();
          }).observe(canvas);
        }
        window.addEventListener("scroll", schedule, { passive: true });
        motionQuery.addEventListener("change", refresh);
        refresh();
      }
    }
  );
})();
