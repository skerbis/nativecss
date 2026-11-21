/**
 * ncss - gemeinsamer Kern von <ncss-video-player> und <ncss-audio-player> (js/video-player.js,
 * js/audio-player.js). Kein eigenes Element - nur die Logik, die beide Player teilen:
 * Texte (data-label-*), Live-Region, Zeitleiste, Lautstärke, Geschwindigkeits-/Einstellungs-
 * Menü, Kapitel, Playlist, Media Session, Tastatur, "ein Player gleichzeitig".
 *
 * Einbinden ist optional: jeder Player lädt diese Datei bei Bedarf selbst aus seinem eigenen
 * Ordner nach (gleicher Dateiname media-core.js neben video-player.js/audio-player.js). Wer
 * die Anfrage sparen will, bindet sie VOR den Playern ein:
 *   <script src="js/media-core.js" defer></script>
 *   <script src="js/video-player.js" defer></script>
 *
 * Schnittstelle (intern, für die beiden Player): window.ncss.media = { define, init, menu,
 * rateEntries, make, on, fmt, formatTime, duration, clamp, isRtl, $$ }. Wartende Player stehen in
 * window.ncss.mediaQueue und werden beim Laden dieser Datei gestartet.
 */
(function () {
  "use strict";

  const n = (window.ncss = window.ncss || {});
  if (n.media) {
    return;
  }

  const root = document.documentElement;
  const supported = !!window.customElements && typeof HTMLMediaElement !== "undefined" &&
    "textTracks" in HTMLMediaElement.prototype;
  const hasPopover = typeof HTMLElement.prototype.showPopover === "function";
  // iOS ignoriert media.volume (nur Hardware-Tasten) - dort keinen Regler zeigen, der
  // scheinbar funktioniert, aber nichts tut.
  const volumeSettable = (() => {
    const probe = document.createElement("audio");
    probe.volume = 0.5;
    return probe.volume === 0.5;
  })();
  let uid = 0;

  // Gemeinsame Texte; die Player ergänzen ihre eigenen (player, previous, next, error ...).
  const TEXTS = {
    de: {
      play: "Abspielen", pause: "Pause", mute: "Ton aus", unmute: "Ton an", volume: "Lautstärke",
      seek: "Zeitleiste", speed: "Geschwindigkeit", timeOf: "%s von %s", playing: "Wiedergabe",
      paused: "Pausiert", muted: "Stumm", volumeTo: "Lautstärke %s %", speedTo: "Geschwindigkeit %s×",
      normal: "normal", chapters: "Kapitel"
    },
    en: {
      play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute", volume: "Volume",
      seek: "Seek", speed: "Speed", timeOf: "%s of %s", playing: "Playing",
      paused: "Paused", muted: "Muted", volumeTo: "Volume %s %", speedTo: "Speed %s×",
      normal: "normal", chapters: "Chapters"
    }
  };

  function langOf(el) {
    return (((el && el.closest("[lang]")) || root).getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  }
  /* Text für key: data-label-<key> am Element (camelCase als kebab-case, z.B. timeOf ->
     data-label-time-of), sonst Deutsch/Englisch nach dem nächsten [lang]. */
  function label(el, key, own) {
    const attr = el.getAttribute("data-label-" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()));
    if (attr) {
      return attr;
    }
    const l = langOf(el);
    return own[l][key] || TEXTS[l][key];
  }
  function fmt(str, ...args) {
    let i = 0;
    return String(str).replace(/%s/g, () => args[i++]);
  }
  function formatTime(s) {
    s = isFinite(s) && s > 0 ? Math.floor(s) : 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, "0");
    return h ? h + ":" + String(m).padStart(2, "0") + ":" + sec : m + ":" + sec;
  }
  function make(tag, cls, attrs) {
    const node = document.createElement(tag);
    if (cls) {
      node.className = cls;
    }
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === false || value === null || value === undefined) {
        continue;
      }
      if (key === "text") {
        node.textContent = value;
      } else {
        node.setAttribute(key, value === true ? "" : value);
      }
    }
    if (tag === "button") {
      node.type = "button";
    }
    return node;
  }
  function on(target, types, fn, options) {
    types.split(" ").forEach((type) => target.addEventListener(type, fn, options));
  }
  const duration = (media) => (isFinite(media.duration) ? media.duration : 0);
  const isRtl = (node) => getComputedStyle(node).direction === "rtl";
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const $$ = (node, sel) => Array.from(node.querySelectorAll(sel));

  // Ein Player gleichzeitig - "play" bubbelt nicht, ist aber in der Capture-Phase am
  // document sichtbar. Hintergrund-/Scroll-Videos tragen das Attribut nicht.
  document.addEventListener("play", (event) => {
    const started = event.target;
    if (!started.hasAttribute || started.getAttribute("data-ncss-player-media") !== "") {
      return;
    }
    $$(document, "[data-ncss-player-media='']").forEach((m) => {
      if (m !== started && !m.paused) {
        m.pause();
      }
    });
  }, true);

  /* Element mit der gemeinsamen öffentlichen Schnittstelle; setup(box, media) baut den
     Player beim ersten connectedCallback. */
  function define(name, tag, setup, extra) {
    if (!supported || customElements.get(name)) {
      return;
    }
    class Player extends HTMLElement {
      connectedCallback() {
        const media = !this._media && this.querySelector(tag);
        if (media) {
          this._media = media;
          setup(this, media);
        }
      }
      get media() {
        return this._media || null;
      }
      play() {
        this._media?.play().catch(() => { /* Autoplay-Sperre - kein Fehlerfall */ });
      }
      pause() {
        this._media?.pause();
      }
      toggle() {
        const m = this._media;
        if (m) {
          if (m.paused || m.ended) {
            this.play();
          } else {
            this.pause();
          }
        }
      }
      seek(s) {
        this._c?.seekTo(s);
      }
      skip(s) {
        this._c?.seekTo(this._media.currentTime + s);
      }
      next() {
        this._c?.goNext(false);
      }
      previous() {
        this._c?.previous();
      }
      load(i) {
        this._c?.load(i);
      }
    }
    Object.assign(Player.prototype, extra);
    customElements.define(name, Player);
  }


  /* Gemeinsame Teile eines Players anlegen und verdrahten. cfg: P (Klassen-Präfix), texts,
     speeds, skip [zurück, vor], replay, title/sub/list (Selektoren), subAttr,
     types, drop, trackchange. Gibt den Kontext c zurück: der Player hängt die Teile
     (c.seek, c.playBtn, c.prevBtn, c.nextBtn, c.volume) in sein Layout, setzt bei Bedarf
     Haken (c.flash, c.keys, c.onPlay, c.onInput, c.onScrubEnd, c.onChapters,
     c.placeChapters, c.item, c.loaded, c.session, c.bigBtn) und ruft zuletzt c.start(). */
  function init(box, media, cfg) {
    const P = cfg.P;
    const t = (key) => label(box, key, cfg.texts);
    const attr = (el, name) => el.getAttribute(name);
    const c = { t };
    box._c = c;
    media.setAttribute("data-ncss-player-media", attr(box, "exclusive") === "false" ? "solo" : "");
    media.controls = false;
    box.classList.add("is-enhanced");
    if (!box.hasAttribute("role")) {
      box.setAttribute("role", "group");
    }
    const skipBack = Number(attr(box, "skip-back")) || cfg.skip[0];
    const skipForward = Number(attr(box, "skip-forward")) || cfg.skip[1];
    const rates = String(attr(box, "speeds") || cfg.speeds).split(/[\s,]+/).map(Number).filter((r) => r > 0);
    const titleEl = box.querySelector(cfg.title);
    const subEl = box.querySelector(cfg.sub);
    const list = box.querySelector(cfg.list);
    const items = list ? $$(list, "a[href]") : [];
    const docLang = langOf(null);
    let index = -1;
    let chapters = [];
    let chapterList = null;
    let scrubbing = false;

    // Live-Region, entprellt (gehaltene Taste = eine Ansage statt zwanzig)
    const live = make("div", P + "sr", { role: "status", "aria-live": "polite", "aria-atomic": "true" });
    box.appendChild(live);
    let liveTimer;
    const say = (msg) => {
      clearTimeout(liveTimer);
      liveTimer = setTimeout(() => { live.textContent = msg; }, 250);
    };
    const emit = (name, detail) => {
      box.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail || { currentTime: media.currentTime, duration: duration(media) } }));
    };
    const timeText = (now) => fmt(t("timeOf"), formatTime(now), formatTime(duration(media)));
    const prop = (el, name, value) => el.style.setProperty("--" + P + name, value);
    const flash = (text, icon) => c.flash && c.flash(text, icon);

    /* --- Zeitleiste: natives <input type="range"> (Tastatur, Screenreader, Touch gratis)
       unsichtbar über einer selbst gezeichneten Spur ------------------------------- */
    const seek = make("div", P + "seek");
    const track = make("div", P + "track", { "aria-hidden": "true" });
    const marks = make("div", P + "marks");
    track.append(make("div", P + "progress"), marks);
    const range = make("input", P + "range " + P + "range--seek", {
      type: "range", min: 0, max: 0, step: "any", value: 0, "aria-label": t("seek")
    });
    seek.append(track, range);
    function updateSeek() {
      const d = duration(media);
      const now = scrubbing ? Number(range.value) : media.currentTime;
      range.max = d;
      if (!scrubbing) {
        range.value = now;
      }
      range.disabled = !d;
      prop(seek, "pct", d ? Math.min(1, now / d).toFixed(5) : 0);
      range.setAttribute("aria-valuetext", timeText(now));
    }
    on(range, "pointerdown", () => { scrubbing = true; });
    on(window, "pointerup pointercancel", () => {
      if (scrubbing) {
        scrubbing = false;
        updateSeek();
        c.onScrubEnd?.();
      }
    });
    on(range, "input", () => {
      media.currentTime = Number(range.value);
      updateSeek();
      c.onInput?.(Number(range.value));
    });
    on(range, "change", () => say(timeText(Number(range.value))));
    on(media, "timeupdate durationchange loadedmetadata seeked emptied", updateSeek);

    /* --- Buttons ------------------------------------------------------------------ */
    const btn = (modifier, text, attrs) => {
      const b = make("button", P + "btn " + P + "btn--" + modifier, attrs);
      b.setAttribute("aria-label", text);
      return b;
    };
    const playBtn = btn("play", t("play"), { title: t("play") + " (K)" });
    const prevBtn = btn("prev", t("previous"), { title: t("previous") + " (P)", hidden: true });
    const nextBtn = btn("next", t("next"), { title: t("next") + " (N)", hidden: true });

    /* --- Lautstärke --------------------------------------------------------------- */
    const volume = make("div", P + "volume");
    const muteBtn = btn("mute", t("mute"), { "aria-pressed": "false", title: t("mute") + " (M)" });
    const volRange = make("input", P + "range " + P + "range--volume", {
      type: "range", min: 0, max: 1, step: 0.05, value: media.volume, "aria-label": t("volume")
    });
    volume.append(muteBtn);
    if (volumeSettable) {
      volume.append(volRange);
    }
    let before = 1;
    function syncVolume() {
      const v = media.muted ? 0 : media.volume;
      const silent = media.muted || media.volume === 0;
      volRange.value = v;
      prop(volRange, "pct", v);
      volRange.setAttribute("aria-valuetext", Math.round(v * 100) + " %");
      muteBtn.setAttribute("aria-pressed", String(silent));
      muteBtn.classList.toggle("is-alt", silent);
    }
    on(muteBtn, "click", () => {
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
    on(volRange, "input", () => {
      media.volume = Number(volRange.value);
      media.muted = media.volume === 0;
      if (media.volume) {
        before = media.volume;
      }
      say(fmt(t("volumeTo"), Math.round(media.volume * 100)));
    });
    on(media, "volumechange", syncVolume);
    syncVolume();

    /* --- Wiedergabe / Geschwindigkeit --------------------------------------------- */
    const toggle = () => box.toggle();
    function seekTo(s) {
      media.currentTime = clamp(s, 0, duration(media) || Math.max(0, s));
      updateSeek();
      say(timeText(media.currentTime));
    }
    const rateLabel = (r) => Number(r) + "×";
    function setRate(r) {
      media.playbackRate = Number(r);
      say(fmt(t("speedTo"), Number(r)));
      flash(rateLabel(r));
    }
    const itemLi = (i) => items[i] && (items[i].closest("li") || items[i]);
    function syncPlay() {
      const playing = !media.paused && !media.ended;
      const text = playing ? t("pause") : media.ended && cfg.replay ? t("replay") : t("play");
      box.classList.toggle("is-playing", playing);
      [playBtn].concat(c.bigBtn || []).forEach((b) => {
        b.setAttribute("aria-label", text);
        b.classList.toggle("is-alt", playing);
      });
      playBtn.title = text + " (K)";
      itemLi(index)?.classList.toggle("is-playing", playing);
      c.onPlay?.(playing);
    }
    on(media, "play pause ended emptied", syncPlay);
    on(media, "play pause ended", (event) => emit("ncss-media-" + event.type));
    on(playBtn, "click", () => {
      toggle();
      say(media.paused ? t("paused") : t("playing"));
    });

    /* --- Kapitel: eine Spur lädt ihre Cues erst mit mode != "disabled" - "hidden" lädt,
       zeigt aber nichts nativ an ---------------------------------------------------- */
    const chapterAt = (time) => chapters.filter((ch) => ch.start <= time + 0.001).pop() || null;
    function syncChapters() {
      const ch = chapterAt(media.currentTime);
      if (chapterList) {
        $$(chapterList, "button").forEach((b) => {
          if (ch && Number(attr(b, "data-time")) === ch.start) {
            b.setAttribute("aria-current", "true");
          } else {
            b.removeAttribute("aria-current");
          }
        });
      }
    }
    function setChapters(chs) {
      const d = duration(media);
      chapters = chs;
      marks.replaceChildren();
      chs.forEach((ch) => {
        if (d && ch.start > 0.5 && ch.start < d - 0.5) {
          prop(marks.appendChild(make("span")), "start", (ch.start / d).toFixed(4));
        }
      });
      chapterList?.remove();
      chapterList = null;
      if (c.placeChapters && chs.length) {
        const heading = make("p", P + "chapters-title", { text: t("chapters"), id: P + "chapters-" + ++uid });
        const ol = make("ol", "", { role: "list", "aria-labelledby": heading.id });
        chs.forEach((ch) => {
          const b = make("button", "", { "data-time": ch.start });
          b.append(make("span", P + "chapter-time", { text: formatTime(ch.start) }), make("span", "", { text: ch.title }));
          ol.appendChild(make("li")).append(b);
        });
        chapterList = make("div", P + "chapters");
        chapterList.append(heading, ol);
        c.placeChapters(chapterList);
        syncChapters();
      }
      c.onChapters?.();
    }
    function bindChapters() {
      $$(media, "track").forEach((trackEl) => {
        if (trackEl.kind !== "chapters" || trackEl._ncssBound) {
          return;
        }
        trackEl._ncssBound = true;
        const read = () => {
          const cues = Array.from(trackEl.track.cues || []);
          if (cues.length && trackEl.isConnected) {
            setChapters(cues.map((cue) => ({ start: cue.startTime, title: cue.text })));
          }
        };
        trackEl.track.mode = "hidden";
        if (trackEl.readyState === 2) {
          read();
        }
        trackEl.addEventListener("load", read);
      });
    }
    on(media, "loadedmetadata durationchange", () => {
      if (chapters.length) {
        setChapters(chapters);
      }
    });
    on(media, "timeupdate seeked durationchange loadedmetadata", syncChapters);
    on(box, "click", (event) => {
      const b = event.target.closest("." + P + "chapters button");
      if (b) {
        seekTo(Number(attr(b, "data-time")));
        if (media.paused) {
          box.play();
        }
      }
    });

    /* --- Playlist: Links bleiben ohne JS normale Links auf die Dateien; href zuerst,
       data-src kann weitere (leerzeichengetrennte) Formate nachreichen --------------- */
    const srcList = (a) => [a.href].concat((attr(a, "data-src") || "").split(/\s+/).filter(Boolean).map((s) => new URL(s, location.href).href));
    function markActive() {
      items.forEach((a, i) => {
        const li = itemLi(i);
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
    function load(i) {
      const a = items[i];
      if (!a) {
        return;
      }
      index = i;
      $$(media, cfg.drop).forEach((node) => node.remove());
      media.removeAttribute("src");
      srcList(a).forEach((src) => media.append(make("source", "", {
        src, type: cfg.types[src.split(/[?#]/)[0].split(".").pop().toLowerCase()] || false
      })));
      if (titleEl) {
        titleEl.textContent = attr(a, "data-title") || a.textContent.trim();
      }
      if (subEl) {
        subEl.textContent = attr(a, cfg.subAttr) || "";
      }
      setChapters([]);
      c.item?.(a, docLang);
      if (attr(a, "data-chapters")) {
        media.append(make("track", "", { kind: "chapters", src: attr(a, "data-chapters"), srclang: docLang }));
      }
      media.load();
      bindChapters();
      c.loaded?.();
      markActive();
      updateSeek();
      emit(cfg.trackchange, { index: i, item: a });
      say(titleEl ? titleEl.textContent : a.textContent.trim());
    }
    function play(fn, auto) {
      const wasPlaying = !media.paused || auto;
      fn();
      if (wasPlaying) {
        box.play();
      }
    }
    function goNext(auto) {
      if (index < items.length - 1) {
        play(() => load(index + 1), auto);
      }
    }
    function previous() {
      if (!items.length) {
        return;
      }
      if (media.currentTime > 3 || index <= 0) {
        seekTo(0);
      } else {
        play(() => load(index - 1));
      }
    }
    on(prevBtn, "click", previous);
    on(nextBtn, "click", () => goNext(false));
    if (items.length) {
      on(list, "click", (event) => {
        const i = items.indexOf(event.target.closest("a[href]"));
        if (i === -1 || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
          return;
        }
        event.preventDefault();
        if (i === index && media.currentSrc) {
          toggle();
        } else {
          load(i);
          box.play();
        }
      });
      on(media, "ended", () => goNext(true));
    }

    /* --- Media Session (Titel/Bild in der System-Mediensteuerung, Medientasten) ---- */
    const ms = navigator.mediaSession;
    if (ms) {
      on(media, "play", () => {
        if (typeof window.MediaMetadata === "function") {
          ms.metadata = new window.MediaMetadata(c.session());
          const handlers = {
            play: () => box.play(),
            pause: () => box.pause(),
            seekbackward: (d) => seekTo(media.currentTime - (d.seekOffset || skipBack)),
            seekforward: (d) => seekTo(media.currentTime + (d.seekOffset || skipForward)),
            seekto: (d) => seekTo(d.seekTime),
            previoustrack: items.length ? previous : null,
            nexttrack: items.length ? () => goNext(false) : null
          };
          for (const action in handlers) {
            try {
              ms.setActionHandler(action, handlers[action]);
            } catch (e) { /* Aktion in diesem Browser unbekannt */ }
          }
        }
        ms.playbackState = "playing";
      });
      on(media, "pause", () => { ms.playbackState = "paused"; });
      let lastPos = 0;
      on(media, "timeupdate", () => {
        const now = Date.now();
        const d = duration(media);
        if (ms.setPositionState && !media.paused && now - lastPos >= 1000 && d) {
          lastPos = now;
          try {
            ms.setPositionState({ duration: d, playbackRate: media.playbackRate, position: Math.min(media.currentTime, d) });
          } catch (e) { /* Zwischenzustand beim Titelwechsel */ }
        }
      });
    }

    /* --- Tastatur (Fokus im Player) ----------------------------------------------- */
    on(box, "keydown", (event) => {
      const target = event.target;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          target.closest("[role='menu'], ." + P + "panel, ." + P + "chapters, ." + P + "playlist") ||
          ((key === " " || key === "Enter") && target.localName === "button") ||
          (target.localName === "input" && /^(Arrow|Home|End|Page)/.test(key))) {
        return;
      }
      const d = duration(media);
      const rtl = isRtl(box);
      const vol = () => Math.round(media.volume * 100);
      const skip = (s) => {
        seekTo(media.currentTime + s);
        flash((s > 0 ? "+" : "−") + Math.abs(s) + " s");
      };
      const playPause = () => {
        toggle();
        flash("", media.paused ? "pause" : "play");
        say(media.paused ? t("paused") : t("playing"));
      };
      const louder = (step) => {
        media.muted = false;
        media.volume = clamp(Math.round((media.volume + step) * 10) / 10, 0, 1);
        flash(vol() + " %");
        say(fmt(t("volumeTo"), vol()));
      };
      const faster = (step) => {
        const i = rates.indexOf(media.playbackRate);
        const r = rates[clamp((i < 0 ? rates.indexOf(1) : i) + step, 0, rates.length - 1)];
        if (r) {
          setRate(r);
        }
      };
      const act = {
        " ": playPause,
        k: playPause,
        j: () => skip(-skipBack),
        l: () => skip(skipForward),
        ArrowLeft: () => skip(rtl ? 5 : -5),
        ArrowRight: () => skip(rtl ? -5 : 5),
        ArrowUp: () => louder(0.1),
        ArrowDown: () => louder(-0.1),
        m: () => {
          media.muted = !media.muted;
          flash(media.muted ? t("muted") : vol() + " %");
          say(media.muted ? t("muted") : t("unmute"));
        },
        n: () => goNext(false),
        p: previous,
        Home: () => seekTo(0),
        End: () => seekTo(d),
        "<": () => faster(-1),
        ">": () => faster(1),
        ...c.keys
      }[key] || (/^[0-9]$/.test(key) && d ? () => {
        seekTo((d * key) / 10);
        flash(key * 10 + " %");
      } : null);
      if (act) {
        event.preventDefault();
        act();
      }
    });

    return Object.assign(c, {
      P, box, media, say, emit, seekTo, toggle, setRate, rateLabel, rates, chapterAt, btn,
      seek, track, range, playBtn, prevBtn, nextBtn, volume, titleEl, subEl, list,
      skipBack, skipForward, goNext, previous, load,
      isScrubbing: () => scrubbing,
      // nach dem Einhängen ins Layout: Kapitel lesen, Playlist-Stand, Anfangszustand
      start() {
        bindChapters();
        if (items.length) {
          prevBtn.hidden = nextBtn.hidden = false;
          const src = media.currentSrc || (media.querySelector("source") || {}).src || media.src;
          index = Math.max(0, items.findIndex((a) => srcList(a).includes(src)));
          markActive();
        }
        updateSeek();
        syncPlay();
      }
    });
  }


  /* Popover-Menü am Button (popover="auto": Light-Dismiss, Esc, Top-Layer - liegt auch im
     Vollbild über dem Player). Position per JS (Anchor Positioning fehlt noch in einigen
     Engines). Ohne Popover-API schaltet der Button die Geschwindigkeit weiter (null).
     set(groups): [{ name, label?, value, entries: [{ value, label }] }] - mit label eine
     role="group" samt sichtbarer Überschrift, ohne label direkt die Einträge. */
  function menu(c, trigger, text, onSelect) {
    const { P, box, media } = c;
    if (!hasPopover) {
      on(trigger, "click", () => c.setRate(c.rates[(c.rates.indexOf(media.playbackRate) + 1) % c.rates.length]));
      return null;
    }
    const el = make("div", P + "menu", { role: "menu", "aria-label": text, id: P + "menu-" + ++uid, popover: "auto" });
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", el.id);
    const items = () => $$(el, "[role='menuitemradio']");
    const close = () => {
      if (el.matches(":popover-open")) {
        el.hidePopover();
      }
    };
    on(trigger, "click", () => {
      if (el.matches(":popover-open")) {
        close();
        return;
      }
      const r = trigger.getBoundingClientRect();
      const vh = root.clientHeight;
      const up = r.top > vh - r.bottom;
      const set = (k, v) => el.style.setProperty("--" + P + "menu-" + k, v);
      set("top", up ? "auto" : r.bottom + 6 + "px");
      set("bottom", up ? vh - r.top + 6 + "px" : "auto");
      set("right", Math.max(4, root.clientWidth - r.right) + "px");
      set("max", Math.max(120, (up ? r.top : vh - r.bottom) - 16) + "px");
      el.showPopover();
    });
    on(el, "toggle", (event) => {
      const open = event.newState === "open";
      trigger.setAttribute("aria-expanded", String(open));
      box.classList.toggle("is-menu-open", open);
      if (open) {
        const list = items();
        (list.find((i) => i.getAttribute("aria-checked") === "true") || list[0]).focus();
      }
    });
    on(el, "click", (event) => {
      const item = event.target.closest("[role='menuitemradio']");
      if (item) {
        onSelect(item.getAttribute("data-group"), item.getAttribute("data-value"));
        close();
        trigger.focus();
      }
    });
    on(el, "keydown", (event) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      const go = { ArrowDown: list[(i + 1) % list.length], ArrowUp: list[(i - 1 + list.length) % list.length], Home: list[0], End: list[list.length - 1] }[event.key];
      if (event.key === "Tab") {
        close();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        trigger.focus();
      }
      event.stopPropagation();
      if (go) {
        event.preventDefault();
        go.focus();
      }
    });
    // Ein fixiertes Menü würde beim Scrollen/Resize vom Button wegdriften.
    on(window, "resize", close);
    window.addEventListener("scroll", (event) => {
      if (event.target !== el) {
        close();
      }
    }, { capture: true, passive: true });
    box.appendChild(el);
    return {
      set(groups) {
        el.replaceChildren();
        groups.forEach((g) => {
          let into = el;
          if (g.label) {
            const heading = make("p", P + "menu-heading", { id: P + "menu-h-" + ++uid, text: g.label });
            into = make("div", P + "menu-group", { role: "group", "aria-labelledby": heading.id });
            into.appendChild(heading);
            el.appendChild(into);
          }
          g.entries.forEach((entry) => {
            into.appendChild(make("button", P + "menu-item", {
              role: "menuitemradio", tabindex: "-1", "data-group": g.name, "data-value": entry.value,
              "aria-checked": String(String(entry.value) === String(g.value)), text: entry.label
            }));
          });
        });
      },
      check(name, value) {
        items().forEach((i) => {
          if (i.getAttribute("data-group") === name) {
            i.setAttribute("aria-checked", String(i.getAttribute("data-value") === String(value)));
          }
        });
      }
    };
  }
  // Einträge des Geschwindigkeitsmenüs
  function rateEntries(c) {
    return c.rates.map((r) => ({ value: r, label: r === 1 ? c.rateLabel(r) + " (" + c.t("normal") + ")" : c.rateLabel(r) }));
  }


  n.media = { define, init, menu, rateEntries, make, on, fmt, formatTime, duration, clamp, isRtl, $$ };
  (n.mediaQueue || []).splice(0).forEach((start) => start(n.media));
})();
