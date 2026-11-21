/**
 * ncss - <ncss-video-player>: eigener Videoplayer als Light-DOM-Custom-Element (kein
 * Shadow Root - Seiten-CSS/theme.css greifen ganz normal). Optik:
 * components/video-player.css. Progressive Enhancement über ein natives
 * <video controls>: ohne JS bzw. solange das Element nicht :defined ist, bleiben die
 * Browser-eigenen Bedienelemente - das Markup ist schon vollständig.
 *
 *   <ncss-video-player>
 *     <video controls playsinline preload="metadata" poster="poster.jpg">
 *       <source src="film.mp4" type="video/mp4">
 *       <track kind="captions" src="de.vtt" srclang="de" label="Deutsch" default>
 *       <track kind="captions" src="en.vtt" srclang="en" label="English">
 *       <track kind="chapters" src="kapitel.vtt" srclang="de">
 *     </video>
 *   </ncss-video-player>
 *
 * Ergänzt: großen Play-Button, Zeitleiste (gepufferte Bereiche, Kapitelmarken,
 * Zeit-/Kapitel-Tooltip unter dem Zeiger), Zeit, aktuelles Kapitel, Ton aus + Lautstärke,
 * EIN Einstellungs-Menü (Zahnrad: Geschwindigkeit + Untertitel-Sprache), CC-Schalter,
 * Bild-in-Bild, Vollbild auf dem ELEMENT (eigene Leiste/Untertitel kommen mit),
 * automatisch ausblendende Leiste, Lade-Spinner, Fehlerzustand mit "Erneut versuchen".
 *
 * Karte (layout="card", gleiche Formensprache wie <ncss-audio-player layout="card">):
 * Titel/Untertitel aus .ncss-video-player-title/-meta, klickbare Kapitelliste aus der
 * chapters-Spur und eine Playlist (<ol class="ncss-video-player-playlist"> mit Links auf
 * die Videos; data-poster, data-title, data-meta, data-chapters,
 * data-captions="de=de.vtt en=en.vtt") in einer Spalte neben bzw. unter dem Bild.
 * Vor/Zurück-Buttons, automatisch nächstes Video, Media Session (Titel/Poster in der
 * System-Mediensteuerung). Die Playlist funktioniert auch ohne layout="card".
 *
 * Tasten (Fokus im Player): Leertaste/K Play-Pause · J/L -/+10 s · Pfeil links/rechts
 * -/+5 s · Pfeil hoch/runter Lautstärke · M Ton aus · F Vollbild · C Untertitel ·
 * 0-9 springt auf 0-90 % · Pos1/Ende · < und > Geschwindigkeit · N/P nächstes/voriges Video.
 *
 * Attribute:
 *   speeds="0.5 0.75 1 1.25 1.5 2"  Einträge des Geschwindigkeitsmenüs
 *   autohide="2500"                 ms ohne Zeigerbewegung, bis die Leiste ausblendet
 *                                   ("0" = nie ausblenden)
 *   captions="en"                   Untertitel-Sprache beim Start (sonst <track default>)
 *   exclusive="false"               darf parallel zu anderen Playern laufen
 * Events (bubbeln): ncss-media-play, ncss-media-pause, ncss-media-ended,
 *   detail = { currentTime, duration }; ncss-video-trackchange { index, item }.
 * Öffentlich: el.play(), el.pause(), el.toggle(), el.seek(s), el.skip(+/-s),
 *   el.fullscreen(), el.next(), el.previous(), el.load(index), el.media (das <video>).
 *
 * Immer nur EIN Player spielt gleichzeitig: startet ein <video>/<audio> mit
 * data-ncss-player-media (setzt dieses Script und audio-player.js), pausieren alle anderen
 * - ohne gemeinsames Script, nur über diese Attribut-Konvention. Hintergrund-/Scroll-
 * Videos tragen das Attribut nicht und laufen unabhängig weiter.
 *
 * Benötigt: components/video-player.css (+ tokens.css/colors.css). Keine anderen
 * ncss-Scripts. Ohne customElements/textTracks wird das Element gar nicht erst definiert
 * (SKILL-Regel) - es bleibt beim nativen <video controls>.
 *
 * Texte: Deutsch/Englisch nach dem nächsten [lang], jeder Text überschreibbar per
 * data-label-<schlüssel> am Element (Schlüssel siehe TEXTS, camelCase als kebab-case:
 * timeOf -> data-label-time-of, z.B. data-label-play="Start").
 */
(function () {
  "use strict";

  if (!window.customElements || typeof HTMLMediaElement === "undefined" ||
      !("textTracks" in HTMLMediaElement.prototype) || customElements.get("ncss-video-player")) {
    return;
  }

  var TEXTS = {
    de: {
      player: "Videoplayer", play: "Abspielen", pause: "Pause", replay: "Erneut abspielen",
      mute: "Ton aus", unmute: "Ton an", volume: "Lautstärke", seek: "Zeitleiste",
      speed: "Geschwindigkeit", settings: "Einstellungen", captions: "Untertitel", off: "Aus", pip: "Bild-in-Bild",
      fullscreen: "Vollbild", exitFullscreen: "Vollbild beenden", timeOf: "%s von %s",
      playing: "Wiedergabe", paused: "Pausiert", muted: "Stumm", volumeTo: "Lautstärke %s %",
      speedTo: "Geschwindigkeit %s×", captionsOn: "Untertitel: %s", captionsOff: "Untertitel aus",
      error: "Dieses Video konnte nicht geladen werden.", retry: "Erneut versuchen", normal: "normal",
      previous: "Vorheriges Video", next: "Nächstes Video", chapters: "Kapitel", playlist: "Playlist"
    },
    en: {
      player: "Video player", play: "Play", pause: "Pause", replay: "Replay",
      mute: "Mute", unmute: "Unmute", volume: "Volume", seek: "Seek",
      speed: "Speed", settings: "Settings", captions: "Captions", off: "Off", pip: "Picture-in-picture",
      fullscreen: "Fullscreen", exitFullscreen: "Exit fullscreen", timeOf: "%s of %s",
      playing: "Playing", paused: "Paused", muted: "Muted", volumeTo: "Volume %s %",
      speedTo: "Speed %s×", captionsOn: "Captions: %s", captionsOff: "Captions off",
      error: "This video could not be loaded.", retry: "Try again", normal: "normal",
      previous: "Previous video", next: "Next video", chapters: "Chapters", playlist: "Playlist"
    }
  };
  var root = document.documentElement;
  var lang = (root.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  var P = "ncss-video-player-";
  var hasPopover = typeof HTMLElement.prototype.showPopover === "function";
  // iOS ignoriert media.volume (nur Hardware-Tasten) - dort keinen Regler zeigen, der
  // scheinbar funktioniert, aber nichts tut.
  var volumeSettable = (function () {
    var probe = document.createElement("video");
    probe.volume = 0.5;
    return probe.volume === 0.5;
  })();
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
  function iconButton(modifier, label, attrs) {
    var b = make("button", P + "btn " + P + "btn--" + modifier, attrs);
    b.setAttribute("aria-label", label);
    return b;
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

  // Ein Player gleichzeitig - "play" bubbelt nicht, ist aber in der Capture-Phase am
  // document sichtbar. Identische Logik steht in audio-player.js (bewusst dupliziert,
  // damit jede Datei allein funktioniert); doppelt registriert schadet nicht.
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

  customElements.define(
    "ncss-video-player",
    class extends HTMLElement {
      connectedCallback() {
        if (this._media) {
          return;
        }
        var media = this.querySelector("video");
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
      fullscreen() {
        if (this._fullscreen) {
          this._fullscreen();
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
        media.setAttribute("data-ncss-player-media", box.getAttribute("exclusive") === "false" ? "solo" : "");
        media.controls = false;
        media.playsInline = true;
        box.classList.add("is-enhanced");
        if (!box.hasAttribute("role")) {
          box.setAttribute("role", "group");
        }
        if (!box.hasAttribute("aria-label") && !box.hasAttribute("aria-labelledby")) {
          box.setAttribute("aria-label", t("player"));
        }
        if (!box.hasAttribute("tabindex")) {
          box.tabIndex = -1;
        }
        var rates = String(box.getAttribute("speeds") || "0.5 0.75 1 1.25 1.5 2").split(/[\s,]+/).map(Number).filter(function (n) { return n > 0; });
        var hideAttr = box.getAttribute("autohide");
        var hideDelay = hideAttr === null ? 2500 : Number(hideAttr) || 0;

        // Live-Region, entprellt (gehaltene Taste = eine Ansage statt zwanzig)
        var live = make("div", P + "sr", { role: "status", "aria-live": "polite", "aria-atomic": "true" });
        var liveTimer;
        function say(msg) {
          clearTimeout(liveTimer);
          liveTimer = setTimeout(function () { live.textContent = msg; }, 250);
        }
        function emit(name) {
          box.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { currentTime: media.currentTime, duration: duration(media) } }));
        }

        /* --- Ebenen über dem Bild ---------------------------------------------- */
        var cues = make("div", P + "cues", { "aria-hidden": "true" });
        var spinner = make("div", P + "spinner", { "aria-hidden": "true" });
        var big = iconButton("big", t("play"), { tabindex: "-1" });
        var error = make("div", P + "error", { role: "alert", hidden: true });
        var retry = make("button", P + "retry", { text: t("retry") });
        error.append(make("p", "", { text: t("error") }), retry);
        var flash = make("div", P + "flash", { "aria-hidden": "true" });
        // Bühne: Video + alle Ebenen darüber. Eigenes Element, damit Vollbild nur das Bild
        // (nicht die Kapitel-/Playlist-Spalte) erfasst und die Karte daneben Platz hat.
        var stage = make("div", P + "stage");
        media.before(stage);
        stage.append(media, cues, spinner, big, error, flash);
        box.appendChild(live);

        /* --- Zeitleiste -------------------------------------------------------- */
        // Ein natives <input type="range"> (Tastatur, Screenreader, Touch gratis) liegt
        // unsichtbar über einer selbst gezeichneten Spur.
        var seek = make("div", P + "seek");
        var track = make("div", P + "track", { "aria-hidden": "true" });
        var buffered = make("div", P + "buffered");
        var progress = make("div", P + "progress");
        var marks = make("div", P + "marks");
        track.append(buffered, progress, marks);
        var range = make("input", P + "range " + P + "range--seek", {
          type: "range", min: 0, max: 0, step: "any", value: 0, "aria-label": t("seek")
        });
        var tip = make("div", P + "tip", { "aria-hidden": "true" });
        var tipChapter = make("span", P + "tip-chapter");
        var tipTime = make("span");
        tip.append(tipChapter, tipTime);
        seek.append(track, range, tip);

        var scrubbing = false;
        var hovering = false;
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
          seek.style.setProperty("--ncss-video-player-pct", d ? Math.min(1, now / d).toFixed(5) : 0);
          range.setAttribute("aria-valuetext", fmt(t("timeOf"), formatTime(now), formatTime(d)));
        }
        function updateBuffered() {
          var d = duration(media);
          var b = media.buffered;
          while (buffered.children.length > (d ? b.length : 0)) {
            buffered.lastChild.remove();
          }
          for (var i = 0; d && i < b.length; i++) {
            var span = buffered.children[i] || buffered.appendChild(make("span"));
            span.style.setProperty("--ncss-video-player-start", (b.start(i) / d).toFixed(4));
            span.style.setProperty("--ncss-video-player-size", ((b.end(i) - b.start(i)) / d).toFixed(4));
          }
        }
        function setChapters(list) {
          chapters = list;
          renderChapterList();
          var d = duration(media);
          marks.replaceChildren();
          list.forEach(function (c) {
            if (d && c.start > 0.5 && c.start < d - 0.5) {
              var m = make("span");
              m.style.setProperty("--ncss-video-player-start", (c.start / d).toFixed(4));
              marks.appendChild(m);
            }
          });
          syncTime();
        }
        function showTip(time) {
          var d = duration(media);
          if (!d) {
            return;
          }
          time = clamp(time, 0, d);
          tipTime.textContent = formatTime(time);
          var c = chapterAt(time);
          tipChapter.textContent = c ? c.title : "";
          seek.style.setProperty("--ncss-video-player-tip", (time / d).toFixed(5));
          seek.classList.add("is-active");
        }
        function hideTip() {
          if (!scrubbing && !hovering && document.activeElement !== range) {
            seek.classList.remove("is-active");
          }
        }
        function pointerTime(event) {
          var r = track.getBoundingClientRect();
          var x = (event.clientX - r.left) / r.width;
          return clamp(isRtl(seek) ? 1 - x : x, 0, 1) * duration(media);
        }
        on(seek, "pointermove", function (event) {
          if (event.pointerType !== "touch" || scrubbing) {
            hovering = true;
            showTip(scrubbing ? Number(range.value) : pointerTime(event));
          }
        });
        on(seek, "pointerleave", function () {
          hovering = false;
          hideTip();
        });
        on(range, "pointerdown", function () { scrubbing = true; });
        on(window, "pointerup pointercancel", function () {
          if (scrubbing) {
            scrubbing = false;
            updateSeek();
            hideTip();
          }
        });
        on(range, "input", function () {
          media.currentTime = Number(range.value);
          updateSeek();
          showTip(Number(range.value));
        });
        on(range, "change", function () {
          say(fmt(t("timeOf"), formatTime(Number(range.value)), formatTime(duration(media))));
        });
        on(range, "focus", function () {
          if (range.matches(":focus-visible")) {
            showTip(media.currentTime);
          }
        });
        on(range, "blur", hideTip);
        on(media, "timeupdate durationchange loadedmetadata seeked emptied", updateSeek);
        on(media, "progress durationchange loadedmetadata", updateBuffered);

        /* --- Leiste ------------------------------------------------------------ */
        var bar = make("div", P + "bar");
        var row = make("div", P + "controls");
        var playBtn = iconButton("play", t("play"), { title: t("play") + " (K)" });
        var prevBtn = iconButton("prev", t("previous"), { title: t("previous") + " (P)", hidden: true });
        var nextBtn = iconButton("next", t("next"), { title: t("next") + " (N)", hidden: true });
        var volume = make("div", P + "volume");
        var muteBtn = iconButton("mute", t("mute"), { "aria-pressed": "false", title: t("mute") + " (M)" });
        var volRange = make("input", P + "range " + P + "range--volume", {
          type: "range", min: 0, max: 1, step: 0.05, value: media.volume, "aria-label": t("volume")
        });
        volume.appendChild(muteBtn);
        if (volumeSettable) {
          volume.appendChild(volRange);
        }
        var time = make("div", P + "time", { "aria-hidden": "true" });
        var current = make("span", "", { text: "0:00" });
        var total = make("span", P + "time-total", { text: "0:00" });
        time.append(current, make("span", P + "time-sep", { text: " / " }), total);
        var chapterLabel = make("span", P + "chapter", { "aria-hidden": "true" });
        var spacer = make("span", P + "spacer");
        var cc = iconButton("cc", t("captions"), { "aria-pressed": "false", title: t("captions") + " (C)", hidden: true });
        // EIN Einstellungs-Menü (Zahnrad) für Geschwindigkeit + Untertitel-Sprache statt
        // je eines eigenen Buttons - weniger sichtbare Bedienelemente. Die aktuelle
        // Geschwindigkeit steht als kleines Text-Badge am Zahnrad, sobald sie nicht 1× ist.
        var settingsBtn = iconButton("settings", t("settings"), { title: t("settings") });
        var pipBtn = iconButton("pip", t("pip"), { "aria-pressed": "false", title: t("pip"), hidden: true });
        var fsBtn = iconButton("fs", t("fullscreen"), { title: t("fullscreen") + " (F)" });
        row.append(prevBtn, playBtn, nextBtn, volume, time, chapterLabel, spacer, cc, settingsBtn, pipBtn, fsBtn);
        bar.append(seek, row);
        stage.appendChild(bar);

        /* --- Einstellungs-Menü (Gruppen: Geschwindigkeit, Untertitel) ---------- */
        // popover="auto": Light-Dismiss, Esc, Top-Layer (liegt auch im Vollbild über dem
        // Player). Position per JS am Button (CSS Anchor Positioning ist noch nicht in
        // allen Engines da). Ohne Popover-API schaltet der Button stattdessen weiter.
        function createMenu(trigger, label, onSelect) {
          var menu = make("div", P + "menu", { role: "menu", "aria-label": label, id: P + "menu-" + (++uid), popover: "auto" });
          trigger.setAttribute("aria-haspopup", "menu");
          trigger.setAttribute("aria-expanded", "false");
          trigger.setAttribute("aria-controls", menu.id);
          function items() {
            return Array.prototype.slice.call(menu.querySelectorAll("[role='menuitemradio']"));
          }
          function close() {
            if (menu.matches(":popover-open")) {
              menu.hidePopover();
            }
          }
          on(trigger, "click", function () {
            if (menu.matches(":popover-open")) {
              close();
              return;
            }
            var r = trigger.getBoundingClientRect();
            var vh = root.clientHeight;
            var up = r.top > vh - r.bottom;
            var s = menu.style;
            s.setProperty("--ncss-video-player-menu-top", up ? "auto" : r.bottom + 6 + "px");
            s.setProperty("--ncss-video-player-menu-bottom", up ? vh - r.top + 6 + "px" : "auto");
            s.setProperty("--ncss-video-player-menu-right", Math.max(4, root.clientWidth - r.right) + "px");
            s.setProperty("--ncss-video-player-menu-max", Math.max(120, (up ? r.top : vh - r.bottom) - 16) + "px");
            menu.showPopover();
          });
          on(menu, "toggle", function (event) {
            var open = event.newState === "open";
            trigger.setAttribute("aria-expanded", String(open));
            box.classList.toggle("is-menu-open", open);
            if (open) {
              var list = items();
              var checked = list.filter(function (i) { return i.getAttribute("aria-checked") === "true"; })[0];
              (checked || list[0]).focus();
            }
          });
          on(menu, "click", function (event) {
            var item = event.target.closest("[role='menuitemradio']");
            if (item) {
              onSelect(item.getAttribute("data-group"), item.getAttribute("data-value"));
              close();
              trigger.focus();
            }
          });
          on(menu, "keydown", function (event) {
            var list = items();
            var i = list.indexOf(document.activeElement);
            var next = null;
            if (event.key === "ArrowDown") {
              next = list[(i + 1) % list.length];
            } else if (event.key === "ArrowUp") {
              next = list[(i - 1 + list.length) % list.length];
            } else if (event.key === "Home") {
              next = list[0];
            } else if (event.key === "End") {
              next = list[list.length - 1];
            } else if (event.key === "Tab") {
              close();
              return;
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
              trigger.focus();
            }
            event.stopPropagation();
            if (next) {
              event.preventDefault();
              next.focus();
            }
          });
          // Ein fixiertes Menü würde beim Scrollen/Resize vom Button wegdriften.
          on(window, "resize", close);
          window.addEventListener("scroll", function (event) {
            if (event.target !== menu) {
              close();
            }
          }, { capture: true, passive: true });
          box.appendChild(menu);
          return {
            // groups = [{ name, label, value, entries: [{ value, label }] }] - jede Gruppe
            // ein role="group" mit sichtbarer Überschrift, Einträge als menuitemradio.
            set: function (groups) {
              menu.replaceChildren();
              groups.forEach(function (g) {
                var heading = make("p", P + "menu-heading", { id: P + "menu-h-" + (++uid), text: g.label });
                var group = make("div", P + "menu-group", { role: "group", "aria-labelledby": heading.id });
                group.appendChild(heading);
                g.entries.forEach(function (entry) {
                  var b = make("button", P + "menu-item", { role: "menuitemradio", tabindex: "-1", "data-group": g.name, "data-value": entry.value, text: entry.label });
                  b.setAttribute("aria-checked", String(String(entry.value) === String(g.value)));
                  group.appendChild(b);
                });
                menu.appendChild(group);
              });
            },
            check: function (name, value) {
              items().forEach(function (i) {
                if (i.getAttribute("data-group") === name) {
                  i.setAttribute("aria-checked", String(i.getAttribute("data-value") === String(value)));
                }
              });
            }
          };
        }

        /* --- Rückmeldung in der Bildmitte (+10 s, 60 %, Play/Pause) ------------ */
        var flashTimer;
        function showFlash(text, icon) {
          flash.textContent = text || "";
          flash.setAttribute("data-icon", icon || "");
          flash.classList.remove("is-on");
          void flash.offsetWidth; // Animation neu starten
          flash.classList.add("is-on");
          clearTimeout(flashTimer);
          flashTimer = setTimeout(function () { flash.classList.remove("is-on"); }, 700);
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
          box.classList.toggle("is-ended", media.ended);
          if (playing || media.currentTime > 0) {
            box.classList.add("is-started");
          }
          var label = playing ? t("pause") : media.ended ? t("replay") : t("play");
          [playBtn, big].forEach(function (b) {
            b.setAttribute("aria-label", label);
            b.classList.toggle("is-alt", playing);
          });
          playBtn.title = label + " (K)";
          wake();
        }
        function syncTime() {
          current.textContent = formatTime(media.currentTime);
          total.textContent = formatTime(duration(media));
          var c = chapterAt(media.currentTime);
          chapterLabel.textContent = c ? c.title : "";
        }
        var waitTimer;
        function setWaiting(state) {
          clearTimeout(waitTimer);
          if (state) {
            // verzögert: ein schneller Sprung soll keinen Spinner aufblitzen lassen
            waitTimer = setTimeout(function () { box.classList.add("is-waiting"); }, 250);
          } else {
            box.classList.remove("is-waiting");
          }
        }
        function showError() {
          box.classList.add("is-error");
          error.hidden = false;
          setWaiting(false);
        }
        var sources = media.querySelectorAll("source");
        on(media, "play pause ended emptied", syncPlay);
        on(media, "play", function () { emit("ncss-media-play"); });
        on(media, "pause", function () { emit("ncss-media-pause"); });
        on(media, "ended", function () { emit("ncss-media-ended"); });
        on(media, "timeupdate durationchange loadedmetadata", syncTime);
        on(media, "waiting seeking", function () { setWaiting(true); });
        on(media, "playing canplay seeked pause error", function () { setWaiting(false); });
        on(media, "error", showError);
        // Ein <source>-Fehler bubbelt nicht - Capture-Phase, nur der LETZTE <source>
        // bedeutet "nichts abspielbar".
        media.addEventListener("error", function (event) {
          if (sources.length && event.target === sources[sources.length - 1]) {
            showError();
          }
        }, true);
        on(media, "loadstart", function () {
          box.classList.remove("is-error");
          error.hidden = true;
        });
        on(retry, "click", function () { media.load(); });
        on(playBtn, "click", function () {
          toggle();
          say(media.paused ? t("paused") : t("playing"));
        });
        on(big, "click", function () {
          toggle();
          box.focus({ preventScroll: true });
        });
        var touchWake = false;
        on(media, "click", function () {
          if (touchWake) {
            // erster Tipp auf ein ausgeblendetes Touch-Bild holt nur die Leiste zurück
            touchWake = false;
            return;
          }
          toggle();
          showFlash("", media.paused ? "pause" : "play");
          box.focus({ preventScroll: true });
        });
        on(media, "dblclick", function () { fullscreen(); });
        if (media.error || (media.networkState === 3 && sources.length)) {
          showError();
        }

        /* --- Lautstärke -------------------------------------------------------- */
        var before = 1;
        function syncVolume() {
          var v = media.muted ? 0 : media.volume;
          var silent = media.muted || media.volume === 0;
          volRange.value = v;
          volRange.style.setProperty("--ncss-video-player-pct", v);
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

        /* --- Geschwindigkeit --------------------------------------------------- */
        function rateLabel(r) {
          return Number(r) + "×";
        }
        function setRate(r) {
          media.playbackRate = Number(r);
          say(fmt(t("speedTo"), Number(r)));
          showFlash(rateLabel(r));
        }
        var menu = null;
        function renderMenu() {
          if (!menu) {
            return;
          }
          var groups = [{
            name: "speed", label: t("speed"), value: media.playbackRate,
            entries: rates.map(function (r) {
              return { value: r, label: r === 1 ? rateLabel(r) + " (" + t("normal") + ")" : rateLabel(r) };
            })
          }];
          var tracks = textTracks();
          if (tracks.length) {
            groups.push({
              name: "captions", label: t("captions"), value: active ? active.language : "",
              entries: [{ value: "", label: t("off") }].concat(tracks.map(function (tr) {
                return { value: tr.language, label: tr.label || tr.language };
              }))
            });
          }
          menu.set(groups);
        }
        if (hasPopover) {
          menu = createMenu(settingsBtn, t("settings"), function (group, value) {
            if (group === "speed") {
              setRate(value);
            } else {
              setCaptions(value, true);
            }
          });
        } else {
          // Ohne Popover-API: Zahnrad schaltet die Geschwindigkeit weiter.
          on(settingsBtn, "click", function () {
            setRate(rates[(rates.indexOf(media.playbackRate) + 1) % rates.length]);
          });
        }
        function syncRate() {
          var off = media.playbackRate !== 1;
          settingsBtn.setAttribute("data-badge", off ? rateLabel(media.playbackRate) : "");
          settingsBtn.setAttribute("aria-label", t("settings") + " - " + t("speed") + ": " + rateLabel(media.playbackRate));
          if (menu) {
            menu.check("speed", media.playbackRate);
          }
        }
        on(media, "ratechange", syncRate);

        /* --- Kapitel ----------------------------------------------------------- */
        // Eine Spur lädt ihre Cues erst mit mode != "disabled" - "hidden" lädt, zeigt
        // aber nichts nativ an.
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
        on(media, "loadedmetadata durationchange", function () { setChapters(chapters); });

        /* --- Untertitel -------------------------------------------------------- */
        // Eigene Darstellung (mode "hidden" + activeCues) statt nativem ::cue - nur so
        // lassen sie sich über die Leiste heben und im Vollbild des Elements zeigen.
        var active = null;
        var lastLang = null;
        function textTracks() {
          return Array.prototype.filter.call(media.textTracks, function (tr) {
            return tr.kind === "subtitles" || tr.kind === "captions";
          });
        }
        function renderCues() {
          var list = active && active.activeCues ? Array.prototype.slice.call(active.activeCues) : [];
          cues.replaceChildren();
          list.forEach(function (cue) {
            var line = make("span", P + "cue");
            if (typeof cue.getCueAsHTML === "function") {
              line.appendChild(cue.getCueAsHTML());
            } else {
              line.textContent = cue.text;
            }
            cues.appendChild(line);
          });
        }
        function setCaptions(code, announce) {
          var tracks = textTracks();
          var next = null;
          if (code) {
            next = tracks.filter(function (tr) { return tr.language === code; })[0] || tracks[0] || null;
          }
          active = next;
          tracks.forEach(function (tr) { tr.mode = tr === next ? "hidden" : "disabled"; });
          if (next) {
            lastLang = next.language;
          }
          cc.classList.toggle("is-alt", !!next);
          cc.setAttribute("aria-pressed", String(!!next));
          if (menu) {
            menu.check("captions", next ? next.language : "");
          }
          box.classList.toggle("is-captions", !!next);
          renderCues();
          if (announce) {
            say(next ? fmt(t("captionsOn"), next.label || next.language) : t("captionsOff"));
          }
        }
        function toggleCaptions() {
          var tracks = textTracks();
          if (!tracks.length) {
            return;
          }
          // C/Schalter wechselt zwischen "aus" und der zuletzt gewählten Sprache.
          setCaptions(active ? null : lastLang || tracks[0].language, true);
          showFlash(active ? fmt(t("captionsOn"), active.label || active.language) : t("captionsOff"));
        }
        var captionsReady = false;
        function initCaptions() {
          var tracks = textTracks();
          cc.hidden = !tracks.length;
          if (!tracks.length || captionsReady) {
            return;
          }
          captionsReady = true;
          var wanted = box.getAttribute("captions");
          var defEl = Array.prototype.filter.call(media.querySelectorAll("track"), function (tr) {
            return tr.default && (tr.kind === "subtitles" || tr.kind === "captions");
          })[0];
          var def = wanted || (defEl ? defEl.srclang : null);
          lastLang = def || tracks[0].language;
          setCaptions(def, false);
          renderMenu();
          tracks.forEach(function (tr) {
            tr.addEventListener("cuechange", function () {
              if (tr === active) {
                renderCues();
              }
            });
          });
        }
        // CC-Button = schneller Ein/Aus-Schalter (zuletzt gewählte Sprache), die
        // Sprachwahl selbst sitzt im Einstellungs-Menü.
        on(cc, "click", toggleCaptions);
        initCaptions();
        renderMenu();
        syncRate();
        media.textTracks.addEventListener("addtrack", initCaptions);

        /* --- Bild-in-Bild ------------------------------------------------------ */
        var pipSupported = (document.pictureInPictureEnabled && !media.disablePictureInPicture) ||
          (typeof media.webkitSupportsPresentationMode === "function" && media.webkitSupportsPresentationMode("picture-in-picture"));
        pipBtn.hidden = !pipSupported;
        function inPip() {
          return document.pictureInPictureElement === media || media.webkitPresentationMode === "picture-in-picture";
        }
        function syncPip() {
          pipBtn.setAttribute("aria-pressed", String(inPip()));
          pipBtn.classList.toggle("is-alt", inPip());
        }
        on(pipBtn, "click", function () {
          var want = !inPip();
          if (document.pictureInPictureEnabled) {
            (want ? media.requestPictureInPicture() : document.exitPictureInPicture()).catch(function () {});
          } else if (media.webkitSetPresentationMode) {
            media.webkitSetPresentationMode(want ? "picture-in-picture" : "inline");
          }
        });
        on(media, "enterpictureinpicture leavepictureinpicture webkitpresentationmodechanged", syncPip);

        /* --- Vollbild ---------------------------------------------------------- */
        // Auf dem Element (nicht dem <video>), damit Leiste/Untertitel mitkommen. iPhone-
        // Safari kennt nur <video>-Vollbild - dort zeichnet das System eigene Controls.
        function fsElement() {
          return document.fullscreenElement || document.webkitFullscreenElement || null;
        }
        fsBtn.hidden = !(stage.requestFullscreen || stage.webkitRequestFullscreen || media.webkitEnterFullscreen);
        function fullscreen() {
          if (fsElement() === stage) {
            if (document.exitFullscreen) {
              document.exitFullscreen().catch(function () {});
            } else {
              document.webkitExitFullscreen();
            }
          } else if (stage.requestFullscreen) {
            stage.requestFullscreen().catch(function () {});
          } else if (stage.webkitRequestFullscreen) {
            stage.webkitRequestFullscreen();
          } else if (media.webkitEnterFullscreen) {
            media.webkitEnterFullscreen();
          }
        }
        box._fullscreen = fullscreen;
        function syncFs() {
          var fs = fsElement() === stage;
          box.classList.toggle("is-fullscreen", fs);
          fsBtn.classList.toggle("is-alt", fs);
          fsBtn.setAttribute("aria-label", fs ? t("exitFullscreen") : t("fullscreen"));
          fsBtn.title = (fs ? t("exitFullscreen") : t("fullscreen")) + " (F)";
        }
        on(fsBtn, "click", fullscreen);
        on(document, "fullscreenchange webkitfullscreenchange", syncFs);
        on(media, "webkitbeginfullscreen", function () {
          if (active) {
            active.mode = "showing";
          }
        });
        on(media, "webkitendfullscreen", function () {
          if (active) {
            active.mode = "hidden";
          }
        });

        /* --- Leiste automatisch ausblenden ------------------------------------- */
        // Nur während der Wiedergabe, nie bei Tastaturfokus in der Leiste/offenem Menü.
        var idleTimer;
        var overBar = false;
        function sleep() {
          if (!hideDelay || media.paused || overBar || box.classList.contains("is-menu-open") ||
              box.querySelector(":focus-visible")) {
            return;
          }
          box.classList.add("is-idle");
        }
        function wake() {
          box.classList.remove("is-idle");
          clearTimeout(idleTimer);
          if (hideDelay) {
            idleTimer = setTimeout(sleep, hideDelay);
          }
        }
        on(box, "pointerdown", function (event) {
          if (event.pointerType === "touch" && box.classList.contains("is-idle") && event.target === media) {
            touchWake = true;
          }
          wake();
        });
        on(box, "pointermove focusin keydown", wake);
        on(box, "pointerleave", function () {
          overBar = false;
          if (!media.paused) {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(sleep, 400);
          }
        });
        on(bar, "pointerenter", function () { overBar = true; });
        on(bar, "pointerleave", function () { overBar = false; });

        /* --- Tastatur ---------------------------------------------------------- */
        on(box, "keydown", function (event) {
          if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
            return;
          }
          var target = event.target;
          if (target.closest("[role='menu'], ." + P + "panel")) {
            return;
          }
          var key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
          var d = duration(media);
          var rtl = isRtl(box);
          if ((key === " " || key === "Enter") && target.localName === "button") {
            return;
          }
          if (target.localName === "input" && /^(Arrow|Home|End|Page)/.test(key)) {
            return;
          }
          function skip(s) {
            seekTo(media.currentTime + s);
            showFlash((s > 0 ? "+" : "−") + Math.abs(s) + " s");
          }
          var handled = true;
          switch (key) {
            case " ":
            case "k":
              toggle();
              showFlash("", media.paused ? "pause" : "play");
              say(media.paused ? t("paused") : t("playing"));
              break;
            case "j": skip(-10); break;
            case "l": skip(10); break;
            case "ArrowLeft": skip(rtl ? 5 : -5); break;
            case "ArrowRight": skip(rtl ? -5 : 5); break;
            case "ArrowUp":
            case "ArrowDown":
              media.muted = false;
              media.volume = clamp(Math.round((media.volume + (key === "ArrowUp" ? 0.1 : -0.1)) * 10) / 10, 0, 1);
              showFlash(Math.round(media.volume * 100) + " %");
              say(fmt(t("volumeTo"), Math.round(media.volume * 100)));
              break;
            case "m":
              media.muted = !media.muted;
              showFlash(media.muted ? t("muted") : Math.round(media.volume * 100) + " %");
              say(media.muted ? t("muted") : t("unmute"));
              break;
            case "f": fullscreen(); break;
            case "c": toggleCaptions(); break;
            case "n": goNext(false); break;
            case "p": previous(); break;
            case "Home": seekTo(0); break;
            case "End": seekTo(d); break;
            case "<":
            case ">":
              var i = rates.indexOf(media.playbackRate);
              var r = rates[clamp((i < 0 ? rates.indexOf(1) : i) + (key === ">" ? 1 : -1), 0, rates.length - 1)];
              if (r) {
                setRate(r);
              }
              break;
            default:
              if (/^[0-9]$/.test(key) && d) {
                seekTo((d * Number(key)) / 10);
                showFlash(Number(key) * 10 + " %");
              } else {
                handled = false;
              }
          }
          if (handled) {
            event.preventDefault();
          }
        });

        /* --- Karte: Kapitelliste + Playlist (wie <ncss-audio-player layout="card">) -- */
        // Nur bei layout="card": eine Spalte neben (breit) bzw. unter (schmal) dem Bild
        // mit Titel, klickbarer Kapitelliste und Playlist. Titel/Untertitel kommen aus
        // .ncss-video-player-title/-meta im Markup.
        var card = box.getAttribute("layout") === "card";
        var titleEl = box.querySelector(":scope > ." + P + "title");
        var metaEl = box.querySelector(":scope > ." + P + "meta");
        var list = box.querySelector(":scope > ." + P + "playlist");
        var items = list ? Array.prototype.slice.call(list.querySelectorAll("a[href]")) : [];
        var panel = null;
        var chapterList = null;
        var index = -1;
        if (card) {
          panel = make("div", P + "panel");
          var head = make("div", P + "head");
          if (titleEl) {
            head.appendChild(titleEl);
          }
          if (metaEl) {
            head.appendChild(metaEl);
          }
          if (head.children.length) {
            panel.appendChild(head);
          }
          if (list) {
            panel.appendChild(list);
          }
          stage.after(panel);
        }
        function renderChapterList() {
          if (!panel) {
            return;
          }
          if (chapterList) {
            chapterList.remove();
            chapterList = null;
          }
          if (!chapters.length) {
            return;
          }
          var nav = make("div", P + "chapters");
          var heading = make("p", P + "chapters-title", { text: t("chapters"), id: P + "chapters-" + (++uid) });
          var ol = make("ol", "", { role: "list", "aria-labelledby": heading.id });
          chapters.forEach(function (c) {
            var li = make("li");
            var b = make("button", "", { "data-time": c.start });
            b.append(make("span", P + "chapter-time", { text: formatTime(c.start) }), make("span", "", { text: c.title }));
            li.appendChild(b);
            ol.appendChild(li);
          });
          nav.append(heading, ol);
          chapterList = nav;
          var after = panel.querySelector("." + P + "head");
          if (after) {
            after.after(nav);
          } else {
            panel.prepend(nav);
          }
          syncChapterList();
        }
        function syncChapterList() {
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
        on(media, "timeupdate seeked", syncChapterList);
        on(box, "click", function (event) {
          var b = event.target.closest("." + P + "chapters button");
          if (b) {
            seekTo(Number(b.getAttribute("data-time")));
            if (media.paused) {
              box.play();
            }
          }
        });
        renderChapterList();

        // Playlist: Links bleiben ohne JS normale Links auf die Videodateien.
        // data-poster, data-title, data-meta, data-chapters, data-captions="de=a.vtt en=b.vtt"
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
          prevBtn.disabled = index <= 0;
          nextBtn.disabled = index >= items.length - 1;
        }
        function loadItem(i) {
          var a = items[i];
          if (!a) {
            return;
          }
          index = i;
          Array.prototype.forEach.call(media.querySelectorAll("source, track"), function (n) { n.remove(); });
          media.removeAttribute("src");
          media.appendChild(make("source", "", { src: a.href, type: /\.webm(\?|#|$)/i.test(a.href) ? "video/webm" : /\.mp4(\?|#|$)/i.test(a.href) ? "video/mp4" : false }));
          var names = typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames([lang], { type: "language" }) : null;
          (a.getAttribute("data-captions") || "").split(/\s+/).filter(Boolean).forEach(function (pair) {
            var parts = pair.split("=");
            media.appendChild(make("track", "", { kind: "captions", srclang: parts[0], src: parts[1], label: names ? names.of(parts[0]) : parts[0] }));
          });
          if (a.getAttribute("data-chapters")) {
            media.appendChild(make("track", "", { kind: "chapters", src: a.getAttribute("data-chapters"), srclang: lang }));
          }
          if (a.getAttribute("data-poster")) {
            media.poster = a.getAttribute("data-poster");
          } else {
            media.removeAttribute("poster");
          }
          if (titleEl) {
            titleEl.textContent = a.getAttribute("data-title") || a.textContent.trim();
          }
          if (metaEl) {
            metaEl.textContent = a.getAttribute("data-meta") || "";
          }
          setChapters([]);
          active = null;
          captionsReady = false;
          box.classList.remove("is-started", "is-ended");
          media.load();
          bindChapters();
          initCaptions();
          renderMenu();
          markActive();
          updateSeek();
          box.dispatchEvent(new CustomEvent("ncss-video-trackchange", { bubbles: true, detail: { index: i, item: a } }));
          say(titleEl ? titleEl.textContent : a.textContent.trim());
        }
        function goNext(auto) {
          if (index < items.length - 1) {
            var wasPlaying = !media.paused || auto;
            loadItem(index + 1);
            if (wasPlaying) {
              box.play();
            }
          }
        }
        function previous() {
          if (!items.length) {
            return;
          }
          if (media.currentTime > 3 || index <= 0) {
            seekTo(0);
            return;
          }
          var wasPlaying = !media.paused;
          loadItem(index - 1);
          if (wasPlaying) {
            box.play();
          }
        }
        box._api = { next: goNext, previous: previous, load: loadItem };
        on(prevBtn, "click", previous);
        on(nextBtn, "click", function () { goNext(false); });
        if (items.length) {
          prevBtn.hidden = nextBtn.hidden = false;
          var src = media.currentSrc || (media.querySelector("source") || {}).src || media.src;
          index = Math.max(0, items.findIndex(function (a) { return a.href === src; }));
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
              loadItem(i);
              box.play();
            }
          });
          on(media, "ended", function () { goNext(true); });
          on(media, "play pause ended", function () {
            var li = items[index] && (items[index].closest("li") || items[index]);
            if (li) {
              li.classList.toggle("is-playing", !media.paused && !media.ended);
            }
          });
        }

        /* --- Media Session (Titel/Bild in der System-Mediensteuerung) ---------- */
        var ms = "mediaSession" in navigator ? navigator.mediaSession : null;
        on(media, "play", function () {
          if (!ms || typeof window.MediaMetadata !== "function") {
            return;
          }
          var art = media.poster ? [{ src: new URL(media.poster, location.href).href }] : [];
          ms.metadata = new window.MediaMetadata({
            title: titleEl ? titleEl.textContent.trim() : box.getAttribute("aria-label") || document.title,
            artist: metaEl ? metaEl.textContent.trim() : "",
            artwork: art
          });
          function set(action, fn) {
            try {
              ms.setActionHandler(action, fn);
            } catch (e) { /* Aktion in diesem Browser unbekannt */ }
          }
          set("play", function () { box.play(); });
          set("pause", function () { box.pause(); });
          set("seekbackward", function (d) { seekTo(media.currentTime - (d.seekOffset || 10)); });
          set("seekforward", function (d) { seekTo(media.currentTime + (d.seekOffset || 10)); });
          set("seekto", function (d) { seekTo(d.seekTime); });
          set("previoustrack", items.length ? previous : null);
          set("nexttrack", items.length ? function () { goNext(false); } : null);
          ms.playbackState = "playing";
        });
        on(media, "pause", function () {
          if (ms) {
            ms.playbackState = "paused";
          }
        });

        updateSeek();
        syncPlay();
        syncTime();
        syncFs();
        syncPip();
      }
    }
  );
})();
