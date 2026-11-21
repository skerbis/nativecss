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
 * die Videos; data-poster, data-title, data-meta, data-chapters, data-src (weitere
 * Formate), data-captions="de=de.vtt en=en.vtt") in einer Spalte neben bzw. unter dem Bild.
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
 * Immer nur EIN Player spielt gleichzeitig (Attribut data-ncss-player-media, siehe
 * media-core.js). Hintergrund-/Scroll-Videos laufen unabhängig weiter.
 *
 * Benötigt: components/video-player.css (+ tokens.css/colors.css) und js/media-core.js im
 * selben Ordner - wird automatisch nachgeladen, falls nicht schon eingebunden. Ohne
 * customElements/textTracks wird das Element gar nicht erst definiert (SKILL-Regel) - es
 * bleibt beim nativen <video controls>.
 *
 * Texte: Deutsch/Englisch nach dem nächsten [lang], jeder Text überschreibbar per
 * data-label-<schlüssel> am Element (Schlüssel siehe TEXTS hier und in media-core.js,
 * camelCase als kebab-case: timeOf -> data-label-time-of, z.B. data-label-play="Start").
 */
(function (start) {
  "use strict";
  // Gemeinsamen Kern verwenden oder aus dem eigenen Ordner nachladen.
  var n = (window.ncss = window.ncss || {});
  if (n.media) {
    start(n.media);
    return;
  }
  (n.mediaQueue = n.mediaQueue || []).push(start);
  var me = document.currentScript;
  if (me && me.src && !document.querySelector("script[src*='media-core']")) {
    var core = document.createElement("script");
    core.src = me.src.replace(/[^/?#]+(?=[?#]|$)/, "media-core.js");
    core.nonce = me.nonce;
    document.head.appendChild(core);
  }
})(function (M) {
  "use strict";

  const { make, on, fmt, formatTime, duration, clamp, isRtl, $$ } = M;
  const P = "ncss-video-player-";
  const TEXTS = {
    de: {
      player: "Videoplayer", replay: "Erneut abspielen", settings: "Einstellungen",
      captions: "Untertitel", off: "Aus", pip: "Bild-in-Bild", fullscreen: "Vollbild",
      exitFullscreen: "Vollbild beenden", captionsOn: "Untertitel: %s", captionsOff: "Untertitel aus",
      error: "Dieses Video konnte nicht geladen werden.", retry: "Erneut versuchen",
      previous: "Vorheriges Video", next: "Nächstes Video"
    },
    en: {
      player: "Video player", replay: "Replay", settings: "Settings",
      captions: "Captions", off: "Off", pip: "Picture-in-picture", fullscreen: "Fullscreen",
      exitFullscreen: "Exit fullscreen", captionsOn: "Captions: %s", captionsOff: "Captions off",
      error: "This video could not be loaded.", retry: "Try again",
      previous: "Previous video", next: "Next video"
    }
  };
  const isCaption = (tr) => tr.kind === "subtitles" || tr.kind === "captions";

  M.define("ncss-video-player", "video", (box, media) => {
    const c = M.init(box, media, {
      P, texts: TEXTS, speeds: "0.5 0.75 1 1.25 1.5 2", skip: [10, 10], replay: true,
      title: ":scope > ." + P + "title", sub: ":scope > ." + P + "meta", subAttr: "data-meta",
      list: ":scope > ." + P + "playlist", drop: "source, track", trackchange: "ncss-video-trackchange",
      types: { webm: "video/webm", mp4: "video/mp4" }
    });
    const { t, say, seekTo, seek, track, range } = c;
    media.playsInline = true;
    if (!box.hasAttribute("aria-label") && !box.hasAttribute("aria-labelledby")) {
      box.setAttribute("aria-label", t("player"));
    }
    if (!box.hasAttribute("tabindex")) {
      box.tabIndex = -1;
    }
    const hideAttr = box.getAttribute("autohide");
    const hideDelay = hideAttr === null ? 2500 : Number(hideAttr) || 0;

    /* --- Ebenen über dem Bild ---------------------------------------------------- */
    const cues = make("div", P + "cues", { "aria-hidden": "true" });
    const spinner = make("div", P + "spinner", { "aria-hidden": "true" });
    const big = (c.bigBtn = c.btn("big", t("play"), { tabindex: "-1" }));
    const error = make("div", P + "error", { role: "alert", hidden: true });
    const retry = make("button", P + "retry", { text: t("retry") });
    error.append(make("p", "", { text: t("error") }), retry);
    const flash = make("div", P + "flash", { "aria-hidden": "true" });
    // Bühne: Video + alle Ebenen darüber. Eigenes Element, damit Vollbild nur das Bild
    // (nicht die Kapitel-/Playlist-Spalte) erfasst und die Karte daneben Platz hat.
    const stage = make("div", P + "stage");
    media.before(stage);
    stage.append(media, cues, spinner, big, error, flash);

    /* --- Gepufferte Bereiche in der Spur ----------------------------------------- */
    const buffered = make("div", P + "buffered");
    track.prepend(buffered);
    on(media, "progress durationchange loadedmetadata", () => {
      const d = duration(media);
      const b = media.buffered;
      while (buffered.children.length > (d ? b.length : 0)) {
        buffered.lastChild.remove();
      }
      for (let i = 0; d && i < b.length; i++) {
        const span = buffered.children[i] || buffered.appendChild(make("span"));
        span.style.setProperty("--" + P + "start", (b.start(i) / d).toFixed(4));
        span.style.setProperty("--" + P + "size", ((b.end(i) - b.start(i)) / d).toFixed(4));
      }
    });

    /* --- Zeit-/Kapitel-Tooltip über der Zeitleiste ------------------------------- */
    const tip = make("div", P + "tip", { "aria-hidden": "true" });
    const tipChapter = make("span", P + "tip-chapter");
    const tipTime = make("span");
    tip.append(tipChapter, tipTime);
    seek.append(tip);
    let hovering = false;
    function showTip(time) {
      const d = duration(media);
      if (!d) {
        return;
      }
      time = clamp(time, 0, d);
      tipTime.textContent = formatTime(time);
      const ch = c.chapterAt(time);
      tipChapter.textContent = ch ? ch.title : "";
      seek.style.setProperty("--" + P + "tip", (time / d).toFixed(5));
      seek.classList.add("is-active");
    }
    function hideTip() {
      if (!c.isScrubbing() && !hovering && document.activeElement !== range) {
        seek.classList.remove("is-active");
      }
    }
    on(seek, "pointermove", (event) => {
      if (event.pointerType !== "touch" || c.isScrubbing()) {
        hovering = true;
        const r = track.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width;
        showTip(c.isScrubbing() ? Number(range.value) : clamp(isRtl(seek) ? 1 - x : x, 0, 1) * duration(media));
      }
    });
    on(seek, "pointerleave", () => {
      hovering = false;
      hideTip();
    });
    c.onScrubEnd = hideTip;
    c.onInput = showTip;
    on(range, "focus", () => {
      if (range.matches(":focus-visible")) {
        showTip(media.currentTime);
      }
    });
    on(range, "blur", hideTip);

    /* --- Leiste ------------------------------------------------------------------ */
    const bar = make("div", P + "bar");
    const row = make("div", P + "controls");
    const time = make("div", P + "time", { "aria-hidden": "true" });
    const current = make("span", "", { text: "0:00" });
    const total = make("span", P + "time-total", { text: "0:00" });
    time.append(current, make("span", P + "time-sep", { text: " / " }), total);
    const chapterLabel = make("span", P + "chapter", { "aria-hidden": "true" });
    const cc = c.btn("cc", t("captions"), { "aria-pressed": "false", title: t("captions") + " (C)", hidden: true });
    // EIN Einstellungs-Menü (Zahnrad) für Geschwindigkeit + Untertitel-Sprache; die
    // aktuelle Geschwindigkeit steht als Text-Badge am Zahnrad, sobald sie nicht 1× ist.
    const settingsBtn = c.btn("settings", t("settings"), { title: t("settings") });
    const pipBtn = c.btn("pip", t("pip"), { "aria-pressed": "false", title: t("pip"), hidden: true });
    const fsBtn = c.btn("fs", t("fullscreen"), { title: t("fullscreen") + " (F)" });
    row.append(c.prevBtn, c.playBtn, c.nextBtn, c.volume, time, chapterLabel, make("span", P + "spacer"), cc, settingsBtn, pipBtn, fsBtn);
    bar.append(seek, row);
    stage.appendChild(bar);

    /* --- Rückmeldung in der Bildmitte (+10 s, 60 %, Play/Pause) ------------------ */
    let flashTimer;
    c.flash = (text, icon) => {
      flash.textContent = text || "";
      flash.setAttribute("data-icon", icon || "");
      flash.classList.remove("is-on");
      void flash.offsetWidth; // Animation neu starten
      flash.classList.add("is-on");
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => flash.classList.remove("is-on"), 700);
    };

    /* --- Wiedergabe-Zustand, Laden, Fehler --------------------------------------- */
    c.onPlay = (playing) => {
      box.classList.toggle("is-ended", media.ended);
      if (playing || media.currentTime > 0) {
        box.classList.add("is-started");
      }
      wake();
    };
    function syncTime() {
      current.textContent = formatTime(media.currentTime);
      total.textContent = formatTime(duration(media));
      const ch = c.chapterAt(media.currentTime);
      chapterLabel.textContent = ch ? ch.title : "";
    }
    c.onChapters = syncTime;
    let waitTimer;
    function setWaiting(state) {
      clearTimeout(waitTimer);
      if (state) {
        // verzögert: ein schneller Sprung soll keinen Spinner aufblitzen lassen
        waitTimer = setTimeout(() => box.classList.add("is-waiting"), 250);
      } else {
        box.classList.remove("is-waiting");
      }
    }
    function showError() {
      box.classList.add("is-error");
      error.hidden = false;
      setWaiting(false);
    }
    const sources = () => media.querySelectorAll("source");
    on(media, "timeupdate durationchange loadedmetadata", syncTime);
    on(media, "waiting seeking", () => setWaiting(true));
    on(media, "playing canplay seeked pause error", () => setWaiting(false));
    on(media, "error", showError);
    // Ein <source>-Fehler bubbelt nicht - Capture-Phase, nur der LETZTE <source>
    // bedeutet "nichts abspielbar".
    media.addEventListener("error", (event) => {
      const s = sources();
      if (s.length && event.target === s[s.length - 1]) {
        showError();
      }
    }, true);
    on(media, "loadstart", () => {
      box.classList.remove("is-error");
      error.hidden = true;
    });
    on(retry, "click", () => media.load());
    on(big, "click", () => {
      c.toggle();
      box.focus({ preventScroll: true });
    });
    let touchWake = false;
    on(media, "click", () => {
      if (touchWake) {
        // erster Tipp auf ein ausgeblendetes Touch-Bild holt nur die Leiste zurück
        touchWake = false;
        return;
      }
      c.toggle();
      c.flash("", media.paused ? "pause" : "play");
      box.focus({ preventScroll: true });
    });
    on(media, "dblclick", fullscreen);
    if (media.error || (media.networkState === 3 && sources().length)) {
      showError();
    }

    /* --- Einstellungs-Menü (Gruppen: Geschwindigkeit, Untertitel) ---------------- */
    const menu = M.menu(c, settingsBtn, t("settings"), (group, value) => {
      if (group === "speed") {
        c.setRate(value);
      } else {
        setCaptions(value, true);
      }
    });
    function renderMenu() {
      if (!menu) {
        return;
      }
      const groups = [{ name: "speed", label: t("speed"), value: media.playbackRate, entries: M.rateEntries(c) }];
      const tracks = textTracks();
      if (tracks.length) {
        groups.push({
          name: "captions", label: t("captions"), value: active ? active.language : "",
          entries: [{ value: "", label: t("off") }].concat(tracks.map((tr) => ({ value: tr.language, label: tr.label || tr.language })))
        });
      }
      menu.set(groups);
    }
    function syncRate() {
      const r = c.rateLabel(media.playbackRate);
      settingsBtn.setAttribute("data-badge", media.playbackRate !== 1 ? r : "");
      settingsBtn.setAttribute("aria-label", t("settings") + " - " + t("speed") + ": " + r);
      menu?.check("speed", media.playbackRate);
    }
    on(media, "ratechange", syncRate);

    /* --- Untertitel: eigene Darstellung (mode "hidden" + activeCues) statt nativem
       ::cue - nur so lassen sie sich über die Leiste heben und im Vollbild zeigen ---- */
    let active = null;
    let lastLang = null;
    let captionsReady = false;
    const textTracks = () => Array.from(media.textTracks).filter(isCaption);
    function renderCues() {
      cues.replaceChildren();
      Array.from((active && active.activeCues) || []).forEach((cue) => {
        const line = cues.appendChild(make("span", P + "cue"));
        if (typeof cue.getCueAsHTML === "function") {
          line.appendChild(cue.getCueAsHTML());
        } else {
          line.textContent = cue.text;
        }
      });
    }
    function setCaptions(code, announce) {
      const tracks = textTracks();
      const next = code ? tracks.find((tr) => tr.language === code) || tracks[0] || null : null;
      active = next;
      tracks.forEach((tr) => { tr.mode = tr === next ? "hidden" : "disabled"; });
      if (next) {
        lastLang = next.language;
      }
      cc.classList.toggle("is-alt", !!next);
      cc.setAttribute("aria-pressed", String(!!next));
      menu?.check("captions", next ? next.language : "");
      box.classList.toggle("is-captions", !!next);
      renderCues();
      if (announce) {
        say(next ? fmt(t("captionsOn"), next.label || next.language) : t("captionsOff"));
      }
    }
    function toggleCaptions() {
      const tracks = textTracks();
      if (tracks.length) {
        // C/Schalter wechselt zwischen "aus" und der zuletzt gewählten Sprache.
        setCaptions(active ? null : lastLang || tracks[0].language, true);
        c.flash(active ? fmt(t("captionsOn"), active.label || active.language) : t("captionsOff"));
      }
    }
    function initCaptions() {
      const tracks = textTracks();
      cc.hidden = !tracks.length;
      if (!tracks.length || captionsReady) {
        return;
      }
      captionsReady = true;
      const defEl = $$(media, "track").find((tr) => tr.default && isCaption(tr));
      const def = box.getAttribute("captions") || (defEl ? defEl.srclang : null);
      lastLang = def || tracks[0].language;
      setCaptions(def, false);
      renderMenu();
      tracks.forEach((tr) => {
        tr.addEventListener("cuechange", () => {
          if (tr === active) {
            renderCues();
          }
        });
      });
    }
    on(cc, "click", toggleCaptions);
    initCaptions();
    renderMenu();
    syncRate();
    media.textTracks.addEventListener("addtrack", initCaptions);

    /* --- Bild-in-Bild ------------------------------------------------------------ */
    pipBtn.hidden = !((document.pictureInPictureEnabled && !media.disablePictureInPicture) ||
      (typeof media.webkitSupportsPresentationMode === "function" && media.webkitSupportsPresentationMode("picture-in-picture")));
    const inPip = () => document.pictureInPictureElement === media || media.webkitPresentationMode === "picture-in-picture";
    function syncPip() {
      pipBtn.setAttribute("aria-pressed", String(inPip()));
      pipBtn.classList.toggle("is-alt", inPip());
    }
    on(pipBtn, "click", () => {
      const want = !inPip();
      if (document.pictureInPictureEnabled) {
        (want ? media.requestPictureInPicture() : document.exitPictureInPicture()).catch(() => {});
      } else if (media.webkitSetPresentationMode) {
        media.webkitSetPresentationMode(want ? "picture-in-picture" : "inline");
      }
    });
    on(media, "enterpictureinpicture leavepictureinpicture webkitpresentationmodechanged", syncPip);

    /* --- Vollbild: auf der Bühne (nicht dem <video>), damit Leiste/Untertitel
       mitkommen. iPhone-Safari kennt nur <video>-Vollbild mit System-Controls -------- */
    fsBtn.hidden = !(stage.requestFullscreen || media.webkitEnterFullscreen);
    function fullscreen() {
      if (document.fullscreenElement === stage) {
        document.exitFullscreen().catch(() => {});
      } else if (stage.requestFullscreen) {
        stage.requestFullscreen().catch(() => {});
      } else if (media.webkitEnterFullscreen) {
        media.webkitEnterFullscreen();
      }
    }
    box._fullscreen = fullscreen;
    function syncFs() {
      const fs = document.fullscreenElement === stage;
      const text = fs ? t("exitFullscreen") : t("fullscreen");
      box.classList.toggle("is-fullscreen", fs);
      fsBtn.classList.toggle("is-alt", fs);
      fsBtn.setAttribute("aria-label", text);
      fsBtn.title = text + " (F)";
    }
    on(fsBtn, "click", fullscreen);
    on(document, "fullscreenchange", syncFs);
    on(media, "webkitbeginfullscreen webkitendfullscreen", (event) => {
      if (active) {
        active.mode = event.type === "webkitbeginfullscreen" ? "showing" : "hidden";
      }
    });

    /* --- Leiste automatisch ausblenden: nur während der Wiedergabe, nie bei
       Tastaturfokus in der Leiste/offenem Menü ------------------------------------- */
    let idleTimer;
    let overBar = false;
    function sleep() {
      if (hideDelay && !media.paused && !overBar && !box.classList.contains("is-menu-open") &&
          !box.querySelector(":focus-visible")) {
        box.classList.add("is-idle");
      }
    }
    function wake() {
      box.classList.remove("is-idle");
      clearTimeout(idleTimer);
      if (hideDelay) {
        idleTimer = setTimeout(sleep, hideDelay);
      }
    }
    on(box, "pointerdown", (event) => {
      if (event.pointerType === "touch" && box.classList.contains("is-idle") && event.target === media) {
        touchWake = true;
      }
      wake();
    });
    on(box, "pointermove focusin keydown", wake);
    on(box, "pointerleave", () => {
      overBar = false;
      if (!media.paused) {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(sleep, 400);
      }
    });
    on(bar, "pointerenter", () => { overBar = true; });
    on(bar, "pointerleave", () => { overBar = false; });
    c.keys = { f: fullscreen, c: toggleCaptions };

    /* --- Karte: Kapitelliste + Playlist in einer Spalte neben (breit) bzw. unter
       (schmal) dem Bild, Titel/Untertitel aus .ncss-video-player-title/-meta -------- */
    let panel = null;
    if (box.getAttribute("layout") === "card") {
      panel = make("div", P + "panel");
      const head = make("div", P + "head");
      head.append(...[c.titleEl, c.subEl].filter(Boolean));
      if (head.children.length) {
        panel.appendChild(head);
      }
      if (c.list) {
        panel.appendChild(c.list);
      }
      stage.after(panel);
      c.placeChapters = (nav) => {
        if (head.isConnected) {
          head.after(nav);
        } else {
          panel.prepend(nav);
        }
      };
    }
    // Playlist-Eintrag: data-poster, data-captions="de=a.vtt en=b.vtt"
    c.item = (a, lang) => {
      const names = Intl.DisplayNames ? new Intl.DisplayNames([lang], { type: "language" }) : null;
      (a.getAttribute("data-captions") || "").split(/\s+/).filter(Boolean).forEach((pair) => {
        const [srclang, src] = pair.split("=");
        media.appendChild(make("track", "", { kind: "captions", srclang, src, label: names ? names.of(srclang) : srclang }));
      });
      if (a.getAttribute("data-poster")) {
        media.poster = a.getAttribute("data-poster");
      } else {
        media.removeAttribute("poster");
      }
      active = null;
      captionsReady = false;
      box.classList.remove("is-started", "is-ended");
    };
    c.loaded = () => {
      initCaptions();
      renderMenu();
    };
    c.session = () => ({
      title: c.titleEl ? c.titleEl.textContent.trim() : box.getAttribute("aria-label") || document.title,
      artist: c.subEl ? c.subEl.textContent.trim() : "",
      artwork: media.poster ? [{ src: new URL(media.poster, location.href).href }] : []
    });

    c.start();
    syncTime();
    syncFs();
    syncPip();
  }, {
    fullscreen() {
      if (this._fullscreen) {
        this._fullscreen();
      }
    }
  });
});
