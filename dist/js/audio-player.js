/**
 * ncss - <ncss-audio-player>: eigener Audioplayer als Light-DOM-Custom-Element (kein
 * Shadow Root). Optik: components/audio-player.css. Progressive Enhancement über ein
 * natives <audio controls> - ohne JS bleibt der Browser-Player, Playlist-Links bleiben
 * normale Links auf die Dateien.
 *
 * Kompakt (eine Zeile):
 *   <ncss-audio-player>
 *     <audio controls preload="metadata" src="folge.m4a"></audio>
 *   </ncss-audio-player>
 *
 * Karte (layout="card": Cover, Titel, Interpret, Kapitelliste, Playlist):
 *   <ncss-audio-player layout="card" waveform>
 *     <img class="ncss-audio-player-cover" src="cover.svg" alt="">
 *     <p class="ncss-audio-player-title">Titel</p>
 *     <p class="ncss-audio-player-artist">Interpret</p>
 *     <audio controls preload="metadata" src="a.m4a">
 *       <track kind="chapters" src="a-kapitel.vtt" srclang="de">
 *     </audio>
 *     <ol class="ncss-audio-player-playlist">
 *       <li><a href="b.m4a" data-title="B" data-artist="..." data-cover="b.svg"
 *              data-chapters="b-kapitel.vtt">B</a></li>
 *     </ol>
 *   </ncss-audio-player>
 *
 * Ergänzt: Play/Pause, -15/+30 s (als Text-Buttons), Zeitleiste mit Kapitelmarken,
 * Zeit, Ton aus + Lautstärke, Geschwindigkeitsmenü, klickbare Kapitelliste (Karte),
 * optional eine Wellenform statt der Spur, Playlist mit Vor/Zurück + automatischem
 * nächsten Titel, Media Session (Titel/Cover im Sperrbildschirm, Medientasten).
 *
 * Attribute:
 *   layout="card"                Kartenlayout (sonst kompakt)
 *   waveform                     Wellenform zeichnen (nur gleiche Herkunft, Datei wird
 *                                einmal per Web Audio dekodiert, bis 8 MB)
 *   skip-back="15" skip-forward="30"
 *   speeds="0.75 1 1.25 1.5 1.75 2"
 *   exclusive="false"            darf parallel zu anderen Playern laufen
 * Events (bubbeln): ncss-media-play, ncss-media-pause, ncss-media-ended
 *   (detail { currentTime, duration }), ncss-audio-trackchange (detail { index, item }).
 * Öffentlich: el.play(), el.pause(), el.toggle(), el.seek(s), el.skip(+/-s), el.next(),
 *   el.previous(), el.load(index), el.media.
 * Tasten (Fokus im Player): Leertaste/K, J/L (-/+ Sprungweite), Pfeil links/rechts
 *   -/+5 s, M, 0-9, Pos1/Ende.
 *
 * Texte: Deutsch/Englisch nach dem nächsten [lang], jeder Text überschreibbar per
 * data-label-<schlüssel> am Element (Schlüssel siehe TEXTS, camelCase als kebab-case:
 * volumeTo -> data-label-volume-to, z.B. data-label-play="Start").
 *
 * Ein Player gleichzeitig: dieselbe Attribut-Konvention wie video-player.js
 * (data-ncss-player-media) - die Logik ist bewusst in beiden Dateien dupliziert.
 *
 * Benötigt: components/audio-player.css (+ tokens.css/colors.css). Keine anderen
 * ncss-Scripts. Ohne customElements wird nichts definiert (SKILL-Regel) - natives
 * <audio controls> bleibt.
 */
(function () {
  "use strict";

  if (!window.customElements || typeof HTMLMediaElement === "undefined" ||
      !("textTracks" in HTMLMediaElement.prototype) || customElements.get("ncss-audio-player")) {
    return;
  }

  var TEXTS = {
    de: {
      player: "Audioplayer", play: "Abspielen", pause: "Pause", mute: "Ton aus", unmute: "Ton an",
      volume: "Lautstärke", seek: "Zeitleiste", speed: "Geschwindigkeit", timeOf: "%s von %s",
      playing: "Wiedergabe", paused: "Pausiert", muted: "Stumm", volumeTo: "Lautstärke %s %",
      speedTo: "Geschwindigkeit %s×", back: "−%s s zurück", forward: "+%s s vor",
      previous: "Vorheriger Titel", next: "Nächster Titel", chapters: "Kapitel", normal: "normal",
      error: "Diese Audiodatei konnte nicht geladen werden."
    },
    en: {
      player: "Audio player", play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute",
      volume: "Volume", seek: "Seek", speed: "Speed", timeOf: "%s of %s",
      playing: "Playing", paused: "Paused", muted: "Muted", volumeTo: "Volume %s %",
      speedTo: "Speed %s×", back: "−%s s back", forward: "+%s s forward",
      previous: "Previous track", next: "Next track", chapters: "Chapters", normal: "normal",
      error: "This audio file could not be loaded."
    }
  };
  var root = document.documentElement;
  var lang = (root.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  var P = "ncss-audio-player-";
  var hasPopover = typeof HTMLElement.prototype.showPopover === "function";
  var volumeSettable = (function () {
    var probe = document.createElement("audio");
    probe.volume = 0.5;
    return probe.volume === 0.5;
  })();
  var TYPES = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", opus: "audio/ogg; codecs=opus", oga: "audio/ogg", webm: "audio/webm", wav: "audio/wav", flac: "audio/flac" };
  var uid = 0;

  /* Text für key: data-label-<key> am Element (camelCase als kebab-case, z.B. timeOf ->
     data-label-time-of), sonst Deutsch/Englisch nach dem nächsten [lang]. */
  function label(el, key) {
    var own = el.getAttribute("data-label-" + key.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); }));
    if (own) {
      return own;
    }
    var host = el.closest("[lang]") || root;
    return TEXTS[(host.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de"][key];
  }
  function fmt(str) {
    var args = arguments;
    var i = 1;
    return String(str).replace(/%s/g, function () { return args[i++]; });
  }
  function formatTime(s) {
    s = isFinite(s) && s > 0 ? Math.floor(s) : 0;
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = String(s % 60).padStart(2, "0");
    return h ? h + ":" + String(m).padStart(2, "0") + ":" + sec : m + ":" + sec;
  }
  function make(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) {
      node.className = cls;
    }
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === false || value === null || value === undefined) {
        return;
      }
      if (key === "text") {
        node.textContent = value;
      } else {
        node.setAttribute(key, value === true ? "" : value);
      }
    });
    if (tag === "button") {
      node.type = "button";
    }
    return node;
  }
  function on(target, types, fn, options) {
    types.split(" ").forEach(function (type) {
      target.addEventListener(type, fn, options);
    });
  }
  function duration(media) {
    return isFinite(media.duration) ? media.duration : 0;
  }
  function isRtl(node) {
    return getComputedStyle(node).direction === "rtl";
  }
  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }
  function typeOf(url) {
    return TYPES[(url.split(/[?#]/)[0].split(".").pop() || "").toLowerCase()] || "";
  }

  // Ein Player gleichzeitig (identisch in video-player.js, siehe dort).
  document.addEventListener("play", function (event) {
    var started = event.target;
    if (!started.hasAttribute || !started.hasAttribute("data-ncss-player-media") ||
        started.getAttribute("data-ncss-player-media") === "solo") {
      return;
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-ncss-player-media='']"), function (m) {
      if (m !== started && !m.paused) {
        m.pause();
      }
    });
  }, true);

  // Wellenform: einmal dekodieren, auf 600 Spitzenwerte verdichten, pro URL merken.
  // Nur gleiche Herkunft (kein CORS-Raten), bis 8 MB - sonst bleibt die normale Spur.
  var peakCache = {};
  function peaksFor(url) {
    var abs = new URL(url, location.href);
    var Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (abs.origin !== location.origin || !Ctx || typeof fetch !== "function") {
      return Promise.resolve(null);
    }
    if (!peakCache[abs.href]) {
      peakCache[abs.href] = fetch(abs.href).then(function (res) {
        if (!res.ok || Number(res.headers.get("content-length")) > 8e6) {
          return null;
        }
        return res.arrayBuffer().then(function (buf) {
          return new Promise(function (resolve, reject) {
            // Callback- UND Promise-Form: ältere WebKit-Versionen kennen nur Callbacks.
            var p = new Ctx(1, 1, 22050).decodeAudioData(buf, resolve, reject);
            if (p && p.then) {
              p.then(resolve, reject);
            }
          });
        }).then(function (audio) {
          var data = audio.getChannelData(0);
          var n = 600;
          var size = Math.max(1, Math.floor(data.length / n));
          var peaks = new Float32Array(n);
          var max = 0;
          for (var i = 0; i < n; i++) {
            var p = 0;
            for (var j = i * size, end = Math.min(data.length, j + size); j < end; j += 4) {
              p = Math.max(p, Math.abs(data[j]));
            }
            peaks[i] = p;
            max = Math.max(max, p);
          }
          for (var k = 0; max > 0 && k < n; k++) {
            peaks[k] /= max;
          }
          return peaks;
        });
      }).catch(function () { return null; });
    }
    return peakCache[abs.href];
  }

  customElements.define(
    "ncss-audio-player",
    class extends HTMLElement {
      connectedCallback() {
        if (this._media) {
          return;
        }
        var media = this.querySelector("audio");
        if (!media) {
          return;
        }
        this._media = media;
        this._setup(media);
      }

      get media() {
        return this._media || null;
      }
      play() {
        if (this._media) {
          var p = this._media.play();
          if (p && p.catch) {
            p.catch(function () { /* Autoplay-Sperre - kein Fehlerfall */ });
          }
        }
      }
      pause() {
        if (this._media) {
          this._media.pause();
        }
      }
      toggle() {
        if (this._media) {
          if (this._media.paused || this._media.ended) {
            this.play();
          } else {
            this.pause();
          }
        }
      }
      seek(s) {
        if (this._seekTo) {
          this._seekTo(s);
        }
      }
      skip(s) {
        if (this._seekTo) {
          this._seekTo(this._media.currentTime + s);
        }
      }
      next() {
        if (this._api) {
          this._api.next(false);
        }
      }
      previous() {
        if (this._api) {
          this._api.previous();
        }
      }
      load(i) {
        if (this._api) {
          this._api.load(i);
        }
      }

      _setup(media) {
        var host = this;
        var t = function (key) {
          return label(host, key);
        };
        var box = this;
        var card = box.getAttribute("layout") === "card";
        var skipBack = Number(box.getAttribute("skip-back")) || 15;
        var skipForward = Number(box.getAttribute("skip-forward")) || 30;
        var rates = String(box.getAttribute("speeds") || "0.75 1 1.25 1.5 1.75 2").split(/[\s,]+/).map(Number).filter(function (n) { return n > 0; });
        media.setAttribute("data-ncss-player-media", box.getAttribute("exclusive") === "false" ? "solo" : "");
        media.controls = false;
        box.classList.add("is-enhanced");
        if (!box.hasAttribute("role")) {
          box.setAttribute("role", "group");
        }
        var titleEl = box.querySelector("." + P + "title");
        var artistEl = box.querySelector("." + P + "artist");
        var coverEl = box.querySelector("." + P + "cover");
        function meta() {
          return {
            title: titleEl ? titleEl.textContent.trim() : "",
            artist: artistEl ? artistEl.textContent.trim() : "",
            cover: coverEl ? coverEl.currentSrc || coverEl.src : ""
          };
        }
        function labelPlayer() {
          var title = meta().title;
          box.setAttribute("aria-label", title ? t("player") + ": " + title : t("player"));
        }
        labelPlayer();

        var live = make("div", P + "sr", { role: "status", "aria-live": "polite", "aria-atomic": "true" });
        box.appendChild(live);
        var liveTimer;
        function say(msg) {
          clearTimeout(liveTimer);
          liveTimer = setTimeout(function () { live.textContent = msg; }, 250);
        }
        function emit(name, detail) {
          box.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail || { currentTime: media.currentTime, duration: duration(media) } }));
        }

        /* --- Zeitleiste -------------------------------------------------------- */
        var seek = make("div", P + "seek");
        var track = make("div", P + "track", { "aria-hidden": "true" });
        var progress = make("div", P + "progress");
        var marks = make("div", P + "marks");
        track.append(progress, marks);
        var range = make("input", P + "range " + P + "range--seek", {
          type: "range", min: 0, max: 0, step: "any", value: 0, "aria-label": t("seek")
        });
        seek.append(track, range);
        var scrubbing = false;
        var chapters = [];
        function chapterAt(time) {
          var found = null;
          chapters.forEach(function (c) {
            if (c.start <= time + 0.001) {
              found = c;
            }
          });
          return found;
        }
        function updateSeek() {
          var d = duration(media);
          var now = scrubbing ? Number(range.value) : media.currentTime;
          range.max = d;
          if (!scrubbing) {
            range.value = now;
          }
          range.disabled = !d;
          seek.style.setProperty("--ncss-audio-player-pct", d ? Math.min(1, now / d).toFixed(5) : 0);
          range.setAttribute("aria-valuetext", fmt(t("timeOf"), formatTime(now), formatTime(d)));
        }
        on(range, "pointerdown", function () { scrubbing = true; });
        on(window, "pointerup pointercancel", function () {
          if (scrubbing) {
            scrubbing = false;
            updateSeek();
          }
        });
        on(range, "input", function () {
          media.currentTime = Number(range.value);
          updateSeek();
          drawWave(true);
        });
        on(range, "change", function () {
          say(fmt(t("timeOf"), formatTime(Number(range.value)), formatTime(duration(media))));
        });
        on(media, "timeupdate durationchange loadedmetadata seeked emptied", updateSeek);

        /* --- Bedienelemente ---------------------------------------------------- */
        function iconButton(modifier, label, attrs) {
          var b = make("button", P + "btn " + P + "btn--" + modifier, attrs);
          b.setAttribute("aria-label", label);
          return b;
        }
        var playBtn = iconButton("play", t("play"), { title: t("play") + " (K)" });
        var current = make("span", P + "time", { text: "0:00", "aria-hidden": "true" });
        var total = make("span", P + "time", { text: "0:00", "aria-hidden": "true" });
        // -15 s/+30 s als TEXT - ein Kreispfeil mit Zahl ist klein nicht eindeutig lesbar.
        var back = make("button", P + "btn " + P + "btn--skip", { "aria-label": fmt(t("back"), skipBack), title: fmt(t("back"), skipBack), text: "−" + skipBack + " s" });
        var fwd = make("button", P + "btn " + P + "btn--skip", { "aria-label": fmt(t("forward"), skipForward), title: fmt(t("forward"), skipForward), text: "+" + skipForward + " s" });
        var prev = iconButton("prev", t("previous"), { title: t("previous"), hidden: true });
        var next = iconButton("next", t("next"), { title: t("next"), hidden: true });
        var volume = make("div", P + "volume");
        var muteBtn = iconButton("mute", t("mute"), { "aria-pressed": "false", title: t("mute") + " (M)" });
        var volRange = make("input", P + "range " + P + "range--volume", {
          type: "range", min: 0, max: 1, step: 0.05, value: media.volume, "aria-label": t("volume")
        });
        volume.appendChild(muteBtn);
        if (volumeSettable) {
          volume.appendChild(volRange);
        }
        var speedBtn = make("button", P + "btn " + P + "btn--speed", { title: t("speed") });

        var ui = make("div", P + "ui");
        if (card) {
          var times = make("div", P + "times");
          times.append(current, total);
          var transport = make("div", P + "transport");
          transport.append(prev, back, playBtn, fwd, next);
          ui.append(seek, times, transport, volume, speedBtn);
        } else {
          ui.append(prev, playBtn, next, current, seek, total, volume, speedBtn);
        }
        media.after(ui);

        /* --- Lautstärke -------------------------------------------------------- */
        var before = 1;
        function syncVolume() {
          var v = media.muted ? 0 : media.volume;
          var silent = media.muted || media.volume === 0;
          volRange.value = v;
          volRange.style.setProperty("--ncss-audio-player-pct", v);
          volRange.setAttribute("aria-valuetext", Math.round(v * 100) + " %");
          muteBtn.setAttribute("aria-pressed", String(silent));
          muteBtn.classList.toggle("is-alt", silent);
        }
        on(muteBtn, "click", function () {
          if (media.muted || media.volume === 0) {
            media.muted = false;
            if (!media.volume) {
              media.volume = before || 0.5;
            }
          } else {
            before = media.volume;
            media.muted = true;
          }
          say(media.muted ? t("muted") : t("unmute"));
        });
        on(volRange, "input", function () {
          media.volume = Number(volRange.value);
          media.muted = media.volume === 0;
          if (media.volume) {
            before = media.volume;
          }
          say(fmt(t("volumeTo"), Math.round(media.volume * 100)));
        });
        on(media, "volumechange", syncVolume);
        syncVolume();

        /* --- Geschwindigkeit (Popover-Menü, ohne Popover-API: weiterschalten) --- */
        function rateLabel(r) {
          return Number(r) + "×";
        }
        function setRate(r) {
          media.playbackRate = Number(r);
          say(fmt(t("speedTo"), Number(r)));
        }
        var menu = null;
        function menuItems() {
          return Array.prototype.slice.call(menu.querySelectorAll("[role='menuitemradio']"));
        }
        if (hasPopover) {
          menu = make("div", P + "menu", { role: "menu", "aria-label": t("speed"), id: P + "menu-" + (++uid), popover: "auto" });
          speedBtn.setAttribute("aria-haspopup", "menu");
          speedBtn.setAttribute("aria-expanded", "false");
          speedBtn.setAttribute("aria-controls", menu.id);
          rates.forEach(function (r) {
            var b = make("button", P + "menu-item", { role: "menuitemradio", tabindex: "-1", "data-value": r, text: r === 1 ? rateLabel(r) + " (" + t("normal") + ")" : rateLabel(r) });
            menu.appendChild(b);
          });
          box.appendChild(menu);
          var closeMenu = function () {
            if (menu.matches(":popover-open")) {
              menu.hidePopover();
            }
          };
          on(speedBtn, "click", function () {
            if (menu.matches(":popover-open")) {
              closeMenu();
              return;
            }
            var r = speedBtn.getBoundingClientRect();
            var vh = root.clientHeight;
            var up = r.top > vh - r.bottom;
            var s = menu.style;
            s.setProperty("--ncss-audio-player-menu-top", up ? "auto" : r.bottom + 6 + "px");
            s.setProperty("--ncss-audio-player-menu-bottom", up ? vh - r.top + 6 + "px" : "auto");
            s.setProperty("--ncss-audio-player-menu-right", Math.max(4, root.clientWidth - r.right) + "px");
            menu.showPopover();
          });
          on(menu, "toggle", function (event) {
            var open = event.newState === "open";
            speedBtn.setAttribute("aria-expanded", String(open));
            if (open) {
              var list = menuItems();
              (list.filter(function (i) { return i.getAttribute("aria-checked") === "true"; })[0] || list[0]).focus();
            }
          });
          on(menu, "click", function (event) {
            var item = event.target.closest("[role='menuitemradio']");
            if (item) {
              setRate(item.getAttribute("data-value"));
              closeMenu();
              speedBtn.focus();
            }
          });
          on(menu, "keydown", function (event) {
            var list = menuItems();
            var i = list.indexOf(document.activeElement);
            var nextItem = null;
            if (event.key === "ArrowDown") {
              nextItem = list[(i + 1) % list.length];
            } else if (event.key === "ArrowUp") {
              nextItem = list[(i - 1 + list.length) % list.length];
            } else if (event.key === "Home") {
              nextItem = list[0];
            } else if (event.key === "End") {
              nextItem = list[list.length - 1];
            } else if (event.key === "Tab") {
              closeMenu();
              return;
            } else if (event.key === "Escape") {
              event.preventDefault();
              closeMenu();
              speedBtn.focus();
            }
            event.stopPropagation();
            if (nextItem) {
              event.preventDefault();
              nextItem.focus();
            }
          });
          on(window, "resize", closeMenu);
          window.addEventListener("scroll", function (event) {
            if (event.target !== menu) {
              closeMenu();
            }
          }, { capture: true, passive: true });
        } else {
          on(speedBtn, "click", function () {
            setRate(rates[(rates.indexOf(media.playbackRate) + 1) % rates.length]);
          });
        }
        function syncRate() {
          speedBtn.textContent = rateLabel(media.playbackRate);
          speedBtn.setAttribute("aria-label", t("speed") + ": " + rateLabel(media.playbackRate));
          speedBtn.classList.toggle("is-on", media.playbackRate !== 1);
          if (menu) {
            menuItems().forEach(function (i) {
              i.setAttribute("aria-checked", String(Number(i.getAttribute("data-value")) === media.playbackRate));
            });
          }
        }
        on(media, "ratechange", syncRate);
        syncRate();

        /* --- Wellenform -------------------------------------------------------- */
        var canvas = null;
        var peaks = null;
        var waveUrl = "";
        var raf = 0;
        var lastPx = -1;
        var lastW = 0;
        function drawWave(force) {
          if (!peaks || !canvas) {
            return;
          }
          var r = canvas.getBoundingClientRect();
          if (!r.width) {
            return;
          }
          var dpr = window.devicePixelRatio || 1;
          var w = Math.round(r.width * dpr);
          var h = Math.round(r.height * dpr);
          var d = duration(media);
          var px = Math.round((d ? media.currentTime / d : 0) * w);
          if (!force && w === lastW && px === lastPx) {
            return;
          }
          lastW = w;
          lastPx = px;
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          // Farben aus CSS (color = gespielt, outline-color = Rest) - Theme, Dark Mode und
          // forced-colors greifen so ohne Farbwerte im Script.
          var cs = getComputedStyle(canvas);
          var ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, w, h);
          var barW = Math.max(2, Math.round(2 * dpr));
          var gap = Math.max(1, Math.round(1.5 * dpr));
          var count = Math.floor(w / (barW + gap));
          var rtl = isRtl(canvas);
          for (var i = 0; i < count; i++) {
            var p = peaks[Math.floor((i / count) * peaks.length)];
            var bh = Math.max(barW, p * h * 0.92);
            var x = i * (barW + gap);
            ctx.fillStyle = x + barW / 2 <= px ? cs.color : cs.outlineColor;
            ctx.fillRect(rtl ? w - x - barW : x, (h - bh) / 2, barW, bh);
          }
        }
        function loop() {
          drawWave(false);
          raf = media.paused ? 0 : requestAnimationFrame(loop);
        }
        function loadWave() {
          var url = media.currentSrc || media.src;
          if (!canvas || !url || url === waveUrl) {
            return;
          }
          waveUrl = url;
          peaks = null;
          seek.classList.remove(P + "seek--wave");
          peaksFor(url).then(function (p) {
            if (waveUrl === url && p) {
              peaks = p;
              seek.classList.add(P + "seek--wave");
              requestAnimationFrame(function () { drawWave(true); });
            }
          });
        }
        if (box.hasAttribute("waveform")) {
          canvas = make("canvas", P + "wave", { "aria-hidden": "true" });
          track.after(canvas);
          if (typeof ResizeObserver === "function") {
            new ResizeObserver(function () { drawWave(true); }).observe(canvas);
          }
          on(media, "timeupdate seeked durationchange", function () { drawWave(false); });
          on(media, "play", function () {
            if (!raf) {
              raf = requestAnimationFrame(loop);
            }
          });
          on(media, "loadedmetadata", loadWave);
          window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { drawWave(true); });
          // Theme-Umschalter (data-theme am <html>) ändern die Farben ebenfalls.
          new MutationObserver(function () { drawWave(true); }).observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
          if (media.readyState >= 1) {
            loadWave();
          }
        }

        /* --- Wiedergabe -------------------------------------------------------- */
        function toggle() {
          box.toggle();
        }
        function seekTo(s) {
          var d = duration(media);
          media.currentTime = clamp(s, 0, d || Math.max(0, s));
          updateSeek();
          say(fmt(t("timeOf"), formatTime(media.currentTime), formatTime(d)));
        }
        box._seekTo = seekTo;
        function syncPlay() {
          var playing = !media.paused && !media.ended;
          box.classList.toggle("is-playing", playing);
          var label = playing ? t("pause") : t("play");
          playBtn.setAttribute("aria-label", label);
          playBtn.title = label + " (K)";
          playBtn.classList.toggle("is-alt", playing);
          if (items[index]) {
            (items[index].closest("li") || items[index]).classList.toggle("is-playing", playing);
          }
        }
        function syncTime() {
          current.textContent = formatTime(media.currentTime);
          total.textContent = formatTime(duration(media));
          syncChapter();
        }
        on(media, "play pause ended emptied", syncPlay);
        on(media, "play", function () { emit("ncss-media-play"); });
        on(media, "pause", function () { emit("ncss-media-pause"); });
        on(media, "ended", function () { emit("ncss-media-ended"); });
        on(media, "timeupdate durationchange loadedmetadata", syncTime);
        on(playBtn, "click", function () {
          toggle();
          say(media.paused ? t("paused") : t("playing"));
        });
        on(back, "click", function () { seekTo(media.currentTime - skipBack); });
        on(fwd, "click", function () { seekTo(media.currentTime + skipForward); });
        on(prev, "click", function () { previous(); });
        on(next, "click", function () { goNext(false); });
        media.addEventListener("error", function () {
          box.classList.add("is-error");
          say(t("error"));
        }, true);
        on(media, "loadstart", function () { box.classList.remove("is-error"); });

        /* --- Kapitel ----------------------------------------------------------- */
        var chapterList = null;
        function syncChapter() {
          if (!chapterList) {
            return;
          }
          var c = chapterAt(media.currentTime);
          Array.prototype.forEach.call(chapterList.querySelectorAll("button"), function (b) {
            if (c && Number(b.getAttribute("data-time")) === c.start) {
              b.setAttribute("aria-current", "true");
            } else {
              b.removeAttribute("aria-current");
            }
          });
        }
        function setChapters(list) {
          chapters = list;
          var d = duration(media);
          marks.replaceChildren();
          list.forEach(function (c) {
            if (d && c.start > 0.5 && c.start < d - 0.5) {
              var m = make("span");
              m.style.setProperty("--ncss-audio-player-start", (c.start / d).toFixed(4));
              marks.appendChild(m);
            }
          });
          if (chapterList) {
            chapterList.remove();
            chapterList = null;
          }
          if (!card || !list.length) {
            return;
          }
          var nav = make("div", P + "chapters");
          var heading = make("p", P + "chapters-title", { text: t("chapters"), id: P + "chapters-" + (++uid) });
          var ol = make("ol", "", { role: "list", "aria-labelledby": heading.id });
          list.forEach(function (c) {
            var li = make("li");
            var b = make("button", "", { "data-time": c.start });
            b.append(make("span", P + "chapter-time", { text: formatTime(c.start) }), make("span", "", { text: c.title }));
            li.appendChild(b);
            ol.appendChild(li);
          });
          nav.append(heading, ol);
          chapterList = nav;
          ui.after(nav);
          syncChapter();
        }
        function bindChapters() {
          Array.prototype.forEach.call(media.querySelectorAll("track"), function (trackEl) {
            if (trackEl.kind !== "chapters" || trackEl._ncssBound) {
              return;
            }
            trackEl._ncssBound = true;
            function read() {
              var list = trackEl.track.cues ? Array.prototype.slice.call(trackEl.track.cues) : [];
              if (list.length && trackEl.isConnected) {
                setChapters(list.map(function (c) { return { start: c.startTime, title: c.text }; }));
              }
            }
            trackEl.track.mode = "hidden";
            if (trackEl.readyState === 2) {
              read();
            }
            trackEl.addEventListener("load", read);
          });
        }
        bindChapters();
        on(media, "loadedmetadata durationchange", function () {
          if (chapters.length) {
            setChapters(chapters);
          }
        });
        on(box, "click", function (event) {
          var b = event.target.closest("." + P + "chapters button");
          if (b) {
            seekTo(Number(b.getAttribute("data-time")));
            if (media.paused) {
              box.play();
            }
          }
        });

        /* --- Playlist ---------------------------------------------------------- */
        // href wird zuerst versucht, data-src kann weitere (leerzeichengetrennte)
        // Formate nachreichen.
        var list = box.querySelector("." + P + "playlist");
        var items = list ? Array.prototype.slice.call(list.querySelectorAll("a[href]")) : [];
        var index = -1;
        function srcList(a) {
          return [a.href].concat((a.getAttribute("data-src") || "").split(/\s+/).filter(Boolean).map(function (s) {
            return new URL(s, location.href).href;
          }));
        }
        function markActive() {
          items.forEach(function (a, i) {
            var li = a.closest("li") || a;
            li.classList.toggle("is-active", i === index);
            if (i === index) {
              a.setAttribute("aria-current", "true");
            } else {
              a.removeAttribute("aria-current");
              li.classList.remove("is-playing");
            }
          });
          prev.disabled = index <= 0;
          next.disabled = index >= items.length - 1;
        }
        function load(i) {
          var a = items[i];
          if (!a) {
            return;
          }
          index = i;
          Array.prototype.forEach.call(media.querySelectorAll("source, track[kind='chapters']"), function (n) { n.remove(); });
          media.removeAttribute("src");
          srcList(a).forEach(function (src) {
            media.appendChild(make("source", "", { src: src, type: typeOf(src) || false }));
          });
          setChapters([]);
          if (a.getAttribute("data-chapters")) {
            media.appendChild(make("track", "", { kind: "chapters", src: a.getAttribute("data-chapters"), srclang: lang }));
          }
          if (titleEl) {
            titleEl.textContent = a.getAttribute("data-title") || a.textContent.trim();
          }
          if (artistEl) {
            artistEl.textContent = a.getAttribute("data-artist") || "";
          }
          if (coverEl && a.getAttribute("data-cover")) {
            coverEl.src = a.getAttribute("data-cover");
          }
          labelPlayer();
          media.load();
          bindChapters();
          markActive();
          updateSeek();
          emit("ncss-audio-trackchange", { index: i, item: a });
          say(meta().title);
        }
        function goNext(auto) {
          if (index < items.length - 1) {
            var wasPlaying = !media.paused || auto;
            load(index + 1);
            if (wasPlaying) {
              box.play();
            }
          }
        }
        function previous() {
          if (media.currentTime > 3 || index <= 0) {
            seekTo(0);
            return;
          }
          var wasPlaying = !media.paused;
          load(index - 1);
          if (wasPlaying) {
            box.play();
          }
        }
        box._api = { next: goNext, previous: previous, load: load };
        if (items.length) {
          prev.hidden = next.hidden = false;
          var src = media.currentSrc || (media.querySelector("source") || {}).src || media.src;
          index = Math.max(0, items.findIndex(function (a) { return srcList(a).indexOf(src) !== -1; }));
          markActive();
          on(list, "click", function (event) {
            var a = event.target.closest("a[href]");
            if (!a || items.indexOf(a) === -1 || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
              return;
            }
            event.preventDefault();
            var i = items.indexOf(a);
            if (i === index && media.currentSrc) {
              toggle();
            } else {
              load(i);
              box.play();
            }
          });
          on(media, "ended", function () { goNext(true); });
        }

        /* --- Media Session ----------------------------------------------------- */
        var ms = "mediaSession" in navigator ? navigator.mediaSession : null;
        function claimSession() {
          if (!ms || typeof window.MediaMetadata !== "function") {
            return;
          }
          var m = meta();
          ms.metadata = new window.MediaMetadata({
            title: m.title || document.title,
            artist: m.artist,
            artwork: m.cover ? [{ src: new URL(m.cover, location.href).href, sizes: "512x512" }] : []
          });
          function set(action, fn) {
            try {
              ms.setActionHandler(action, fn);
            } catch (e) { /* Aktion in diesem Browser unbekannt */ }
          }
          set("play", function () { box.play(); });
          set("pause", function () { box.pause(); });
          set("seekbackward", function (d) { seekTo(media.currentTime - (d.seekOffset || skipBack)); });
          set("seekforward", function (d) { seekTo(media.currentTime + (d.seekOffset || skipForward)); });
          set("seekto", function (d) { seekTo(d.seekTime); });
          set("previoustrack", items.length ? previous : null);
          set("nexttrack", items.length ? function () { goNext(false); } : null);
        }
        var lastPos = 0;
        on(media, "play", function () {
          claimSession();
          if (ms) {
            ms.playbackState = "playing";
          }
        });
        on(media, "pause", function () {
          if (ms) {
            ms.playbackState = "paused";
          }
        });
        on(media, "timeupdate", function () {
          var now = Date.now();
          if (!ms || !ms.setPositionState || media.paused || now - lastPos < 1000 || !duration(media)) {
            return;
          }
          lastPos = now;
          try {
            ms.setPositionState({ duration: duration(media), playbackRate: media.playbackRate, position: Math.min(media.currentTime, duration(media)) });
          } catch (e) { /* Zwischenzustand beim Titelwechsel */ }
        });

        /* --- Tastatur ---------------------------------------------------------- */
        on(box, "keydown", function (event) {
          if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
            return;
          }
          var target = event.target;
          if (target.closest("[role='menu'], ." + P + "chapters, ." + P + "playlist")) {
            return;
          }
          var key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
          if ((key === " " || key === "Enter") && target.localName === "button") {
            return;
          }
          if (target.localName === "input" && /^(Arrow|Home|End|Page)/.test(key)) {
            return;
          }
          var rtl = isRtl(box);
          var d = duration(media);
          var actions = {
            " ": toggle,
            k: toggle,
            j: function () { seekTo(media.currentTime - skipBack); },
            l: function () { seekTo(media.currentTime + skipForward); },
            ArrowLeft: function () { seekTo(media.currentTime + (rtl ? 5 : -5)); },
            ArrowRight: function () { seekTo(media.currentTime + (rtl ? -5 : 5)); },
            m: function () { media.muted = !media.muted; },
            Home: function () { seekTo(0); },
            End: function () { seekTo(d); }
          };
          var act = actions[key] || (/^[0-9]$/.test(key) && d ? function () { seekTo((d * Number(key)) / 10); } : null);
          if (act) {
            event.preventDefault();
            act();
          }
        });

        updateSeek();
        syncPlay();
        syncTime();
      }
    }
  );
})();
