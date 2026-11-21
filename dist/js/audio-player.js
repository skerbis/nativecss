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
 *   -/+5 s, Pfeil hoch/runter Lautstärke, M, N/P nächster/voriger Titel, < und >
 *   Geschwindigkeit, 0-9, Pos1/Ende.
 *
 * Texte: Deutsch/Englisch nach dem nächsten [lang], jeder Text überschreibbar per
 * data-label-<schlüssel> am Element (Schlüssel siehe TEXTS hier und in media-core.js,
 * camelCase als kebab-case: volumeTo -> data-label-volume-to, z.B. data-label-play="Start").
 *
 * Ein Player gleichzeitig: Attribut data-ncss-player-media, siehe media-core.js.
 *
 * Benötigt: components/audio-player.css (+ tokens.css/colors.css) und js/media-core.js im
 * selben Ordner - wird automatisch nachgeladen, falls nicht schon eingebunden. Ohne
 * customElements wird nichts definiert (SKILL-Regel) - natives <audio controls> bleibt.
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

  const { make, on, fmt, formatTime, duration, isRtl } = M;
  const P = "ncss-audio-player-";
  const root = document.documentElement;
  const TEXTS = {
    de: {
      player: "Audioplayer", back: "−%s s zurück", forward: "+%s s vor",
      previous: "Vorheriger Titel", next: "Nächster Titel",
      error: "Diese Audiodatei konnte nicht geladen werden."
    },
    en: {
      player: "Audio player", back: "−%s s back", forward: "+%s s forward",
      previous: "Previous track", next: "Next track",
      error: "This audio file could not be loaded."
    }
  };

  // Wellenform: einmal dekodieren, auf 600 Spitzenwerte verdichten, pro URL merken.
  // Nur gleiche Herkunft (kein CORS-Raten), bis 8 MB - sonst bleibt die normale Spur.
  const peakCache = {};
  function peaksFor(url) {
    const abs = new URL(url, location.href);
    if (abs.origin !== location.origin || !window.OfflineAudioContext) {
      return Promise.resolve(null);
    }
    peakCache[abs.href] = peakCache[abs.href] || fetch(abs.href).then((res) => {
      if (!res.ok || Number(res.headers.get("content-length")) > 8e6) {
        return null;
      }
      return res.arrayBuffer().then((buf) => new OfflineAudioContext(1, 1, 22050).decodeAudioData(buf)).then((audio) => {
        const data = audio.getChannelData(0);
        const count = 600;
        const size = Math.max(1, Math.floor(data.length / count));
        const peaks = new Float32Array(count);
        let max = 0;
        for (let i = 0; i < count; i++) {
          let p = 0;
          for (let j = i * size, end = Math.min(data.length, j + size); j < end; j += 4) {
            p = Math.max(p, Math.abs(data[j]));
          }
          peaks[i] = p;
          max = Math.max(max, p);
        }
        return max ? peaks.map((p) => p / max) : peaks;
      });
    }).catch(() => null);
    return peakCache[abs.href];
  }

  M.define("ncss-audio-player", "audio", (box, media) => {
    const card = box.getAttribute("layout") === "card";
    const c = M.init(box, media, {
      P, texts: TEXTS, speeds: "0.75 1 1.25 1.5 1.75 2", skip: [15, 30],
      title: "." + P + "title", sub: "." + P + "artist", subAttr: "data-artist",
      list: "." + P + "playlist", drop: "source, track[kind='chapters']", trackchange: "ncss-audio-trackchange",
      types: { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", opus: "audio/ogg; codecs=opus", oga: "audio/ogg", webm: "audio/webm", wav: "audio/wav", flac: "audio/flac" }
    });
    const { t, say, seek, track, skipBack, skipForward } = c;
    const coverEl = box.querySelector("." + P + "cover");
    const labelPlayer = () => {
      const title = c.titleEl ? c.titleEl.textContent.trim() : "";
      box.setAttribute("aria-label", title ? t("player") + ": " + title : t("player"));
    };
    labelPlayer();

    /* --- Bedienelemente ---------------------------------------------------------- */
    const current = make("span", P + "time", { text: "0:00", "aria-hidden": "true" });
    const total = make("span", P + "time", { text: "0:00", "aria-hidden": "true" });
    // -15 s/+30 s als TEXT - ein Kreispfeil mit Zahl ist klein nicht eindeutig lesbar.
    const skipBtn = (text, s) => make("button", P + "btn " + P + "btn--skip", { "aria-label": text, title: text, text: (s < 0 ? "−" : "+") + Math.abs(s) + " s" });
    const back = skipBtn(fmt(t("back"), skipBack), -skipBack);
    const fwd = skipBtn(fmt(t("forward"), skipForward), skipForward);
    const speedBtn = make("button", P + "btn " + P + "btn--speed", { title: t("speed") });
    const ui = make("div", P + "ui");
    if (card) {
      const times = make("div", P + "times");
      times.append(current, total);
      const transport = make("div", P + "transport");
      transport.append(c.prevBtn, back, c.playBtn, fwd, c.nextBtn);
      ui.append(seek, times, transport, c.volume, speedBtn);
      c.placeChapters = (nav) => ui.after(nav);
    } else {
      ui.append(c.prevBtn, c.playBtn, c.nextBtn, current, seek, total, c.volume, speedBtn);
    }
    media.after(ui);
    on(back, "click", () => c.seekTo(media.currentTime - skipBack));
    on(fwd, "click", () => c.seekTo(media.currentTime + skipForward));

    /* --- Geschwindigkeit (Popover-Menü, ohne Popover-API: weiterschalten) -------- */
    const menu = M.menu(c, speedBtn, t("speed"), (group, value) => c.setRate(value));
    menu?.set([{ name: "speed", value: media.playbackRate, entries: M.rateEntries(c) }]);
    function syncRate() {
      const r = c.rateLabel(media.playbackRate);
      speedBtn.textContent = r;
      speedBtn.setAttribute("aria-label", t("speed") + ": " + r);
      speedBtn.classList.toggle("is-on", media.playbackRate !== 1);
      menu?.check("speed", media.playbackRate);
    }
    on(media, "ratechange", syncRate);
    syncRate();

    /* --- Wellenform ---------------------------------------------------------------- */
    let canvas = null;
    let peaks = null;
    let waveUrl = "";
    let raf = 0;
    let lastPx = -1;
    let lastW = 0;
    function drawWave(force) {
      const r = peaks && canvas && canvas.getBoundingClientRect();
      if (!r || !r.width) {
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      const d = duration(media);
      const px = Math.round((d ? media.currentTime / d : 0) * w);
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
      const cs = getComputedStyle(canvas);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      const barW = Math.max(2, Math.round(2 * dpr));
      const gap = Math.max(1, Math.round(1.5 * dpr));
      const count = Math.floor(w / (barW + gap));
      const rtl = isRtl(canvas);
      for (let i = 0; i < count; i++) {
        const bh = Math.max(barW, peaks[Math.floor((i / count) * peaks.length)] * h * 0.92);
        const x = i * (barW + gap);
        ctx.fillStyle = x + barW / 2 <= px ? cs.color : cs.outlineColor;
        ctx.fillRect(rtl ? w - x - barW : x, (h - bh) / 2, barW, bh);
      }
    }
    function loop() {
      drawWave(false);
      raf = media.paused ? 0 : requestAnimationFrame(loop);
    }
    function loadWave() {
      const url = media.currentSrc || media.src;
      if (!url || url === waveUrl) {
        return;
      }
      waveUrl = url;
      peaks = null;
      seek.classList.remove(P + "seek--wave");
      peaksFor(url).then((p) => {
        if (waveUrl === url && p) {
          peaks = p;
          seek.classList.add(P + "seek--wave");
          requestAnimationFrame(() => drawWave(true));
        }
      });
    }
    if (box.hasAttribute("waveform")) {
      const redraw = () => drawWave(true);
      canvas = make("canvas", P + "wave", { "aria-hidden": "true" });
      track.after(canvas);
      c.onInput = redraw;
      new ResizeObserver(redraw).observe(canvas);
      on(media, "timeupdate seeked durationchange", () => drawWave(false));
      on(media, "play", () => {
        raf = raf || requestAnimationFrame(loop);
      });
      on(media, "loadedmetadata", loadWave);
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
      // Theme-Umschalter (data-theme am <html>) ändern die Farben ebenfalls.
      new MutationObserver(redraw).observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
      if (media.readyState >= 1) {
        loadWave();
      }
    }

    /* --- Zeit, Fehler ---------------------------------------------------------------- */
    function syncTime() {
      current.textContent = formatTime(media.currentTime);
      total.textContent = formatTime(duration(media));
    }
    on(media, "timeupdate durationchange loadedmetadata", syncTime);
    media.addEventListener("error", () => {
      box.classList.add("is-error");
      say(t("error"));
    }, true);
    on(media, "loadstart", () => box.classList.remove("is-error"));

    /* --- Playlist-Eintrag: Cover, Titel im Namen des Players, Media Session ------ */
    c.item = (a) => {
      if (coverEl && a.getAttribute("data-cover")) {
        coverEl.src = a.getAttribute("data-cover");
      }
      labelPlayer();
    };
    c.session = () => {
      const cover = coverEl ? coverEl.currentSrc || coverEl.src : "";
      return {
        title: (c.titleEl && c.titleEl.textContent.trim()) || document.title,
        artist: c.subEl ? c.subEl.textContent.trim() : "",
        artwork: cover ? [{ src: new URL(cover, location.href).href, sizes: "512x512" }] : []
      };
    };

    c.start();
    syncTime();
  });
});
