/**
 * ncss - Hintergrund-Video für beliebige Flächen (Sektion, Hero, Karte, Banner), siehe
 * components/video-bg.css. Bewusst KEIN Custom Element: die Fläche ist normales Seiten-
 * Markup (oft ein <section> oder .ncss-hero), das Script ergänzt nur Verhalten.
 *
 *   <section class="ncss-video-bg ncss-video-bg--dark" data-ncss-video-bg>
 *     <video class="ncss-video-bg-media" muted loop playsinline preload="none"
 *            poster="poster.jpg" aria-hidden="true">
 *       <source data-src="loop.webm" type="video/webm">
 *       <source data-src="loop.mp4" type="video/mp4">
 *     </video>
 *     ... Inhalt ...
 *   </section>
 *
 * Funktioniert genauso auf einem .ncss-hero (components/hero.css) mit dem Video in
 * .ncss-hero-media: <section class="ncss-hero" data-ncss-video-bg> - das Script nimmt
 * das erste <video> in der Fläche. Ersetzt dort js/hero-video-motion.js (das hier
 * deckt reduzierte Bewegung mit ab und ergänzt den Pause-Schalter).
 *
 * Verhalten:
 *   - Sichtbarer Pause/Abspielen-Schalter (WCAG 2.2.2 "Pausieren, Stoppen, Ausblenden":
 *     Bewegung > 5 s braucht eine Pause-Möglichkeit) - Text + Symbol, nicht nur Symbol.
 *     Ein vorhandenes .ncss-video-bg-toggle in der Fläche wird übernommen statt erzeugt.
 *     Ecke per Attributwert: data-ncss-video-bg="top-end" | "top-start" | "bottom-start"
 *     (Default unten am Ende).
 *   - Lädt erst in der Nähe des Viewports (data-src -> src, preload="none" -> "auto"),
 *     spielt nur sichtbar, pausiert außerhalb und in einem Hintergrund-Tab.
 *   - prefers-reduced-motion, prefers-reduced-data, Save-Data, forced-colors: nichts
 *     wird geladen oder abgespielt, das Poster bleibt; der Schalter bietet "Abspielen"
 *     an (bewusste Entscheidung der Besucherin schlägt die Voreinstellung).
 *   - Ein autoplay-Attribut (für Wiedergabe ganz ohne JS) wird übernommen - danach
 *     gelten dieselben Regeln.
 * Events (bubbeln): ncss-video-bg-change { paused, user } auf der Fläche.
 *
 * Benötigt: components/video-bg.css (+ tokens.css/colors.css). Keine anderen
 * ncss-Scripts. Texte Deutsch/Englisch nach dem nächsten [lang], überschreibbar an der
 * Fläche: data-label-play, data-label-pause, data-label-video ("Hintergrundvideo").
 */
(function () {
  "use strict";
  // Bewegung reduzieren? Systemeinstellung ODER ausdrückliche Wahl am <html>
  // (data-motion="reduce"/"full", gesetzt von js/preferences.js) - "full" hebt ein
  // System-"reduce" nur als bewusste Nutzerwahl auf, nie von selbst.
  function ncssReducedMotion() {
    var choice = document.documentElement.getAttribute("data-motion");
    if (choice === "reduce") return true;
    if (choice === "full") return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  if (typeof IntersectionObserver === "undefined" || typeof HTMLMediaElement === "undefined") {
    return;
  }

  var TEXTS = {
    de: { play: "Abspielen", pause: "Pause", video: "Hintergrundvideo" },
    en: { play: "Play", pause: "Pause", video: "background video" }
  };
  /* data-label-play, data-label-pause, data-label-video an der Fläche, sonst Deutsch/
     Englisch nach dem nächsten [lang]. */
  function label(el, key) {
    var host = el.closest("[lang]") || document.documentElement;
    return el.getAttribute("data-label-" + key) ||
      TEXTS[(host.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de"][key];
  }
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var forcedQuery = window.matchMedia("(forced-colors: active)");
  function blocked() {
    return ncssReducedMotion() || forcedQuery.matches ||
      !!(navigator.connection && navigator.connection.saveData) ||
      window.matchMedia("(prefers-reduced-data: reduce)").matches;
  }

  function setup(box) {
    var video = box.querySelector(".ncss-video-bg-media") || box.querySelector("video");
    if (!video || box.hasAttribute("data-ncss-video-bg-ready")) {
      return;
    }
    box.setAttribute("data-ncss-video-bg-ready", "");
    video.autoplay = false;
    video.removeAttribute("autoplay");
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;

    var paused = blocked();
    var chosen = false;
    var inView = false;
    var loaded = false;

    var button = box.querySelector(".ncss-video-bg-toggle");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "ncss-video-bg-toggle";
      var corner = box.getAttribute("data-ncss-video-bg");
      if (corner) {
        button.classList.add("ncss-video-bg-toggle--" + corner);
      }
      box.appendChild(button);
    }

    function render() {
      var word = label(box, paused ? "play" : "pause");
      button.textContent = word;
      button.setAttribute("aria-label", word + ": " + label(box, "video"));
      button.classList.toggle("is-paused", paused);
    }
    function load() {
      if (loaded) {
        return;
      }
      loaded = true;
      var swapped = false;
      [video].concat(Array.prototype.slice.call(video.querySelectorAll("source"))).forEach(function (n) {
        if (n.getAttribute("data-src")) {
          n.src = n.getAttribute("data-src");
          n.removeAttribute("data-src");
          swapped = true;
        }
      });
      video.preload = "auto";
      if (swapped || video.readyState === 0) {
        video.load();
      }
    }
    function update() {
      if (!paused && inView && !document.hidden) {
        load();
        var p = video.play();
        if (p && p.catch) {
          p.catch(function () { /* Autoplay verweigert: Poster bleibt */ });
        }
      } else if (!video.paused) {
        video.pause();
      }
      box.classList.toggle("is-paused", paused);
    }
    function set(value, user) {
      paused = value;
      render();
      update();
      box.dispatchEvent(new CustomEvent("ncss-video-bg-change", { bubbles: true, detail: { paused: paused, user: !!user } }));
    }

    button.addEventListener("click", function () {
      chosen = true;
      set(!paused, true);
    });
    new IntersectionObserver(function (entries) {
      inView = entries[entries.length - 1].isIntersecting;
      update();
    }, { rootMargin: "25% 0px" }).observe(box);
    document.addEventListener("visibilitychange", update);
    // Präferenz-Wechsel zur Laufzeit - nur solange die Besucherin nicht selbst gewählt hat.
    function pref() {
      if (!chosen) {
        set(blocked(), false);
      }
    }
    motionQuery.addEventListener("change", pref);
    forcedQuery.addEventListener("change", pref);

    if (paused) {
      video.pause();
    }
    render();
    box.classList.add("is-ready");
  }

  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Elemente merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung
  // mit). Läuft beim Laden und bei jedem "ncss-content-change"-Event (detail.root = neu
  // eingefügtes Element, ohne Angabe das ganze Dokument), siehe js/content-observer.js.
  var SELECTOR = "[data-ncss-video-bg]";
  var seen = new WeakSet();
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var list = Array.prototype.slice.call(root.querySelectorAll(SELECTOR));
    if (root.matches && root.matches(SELECTOR)) list.unshift(root);
    list.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      setup(el);
    });
  }
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
  function scanDocument() {
    scan(document);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanDocument);
  } else {
    scanDocument();
  }
})();
