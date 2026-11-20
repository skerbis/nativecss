/**
 * ncss - Abschnitts-Navigation (components/subnav.css): markiert den Abschnitt, der gerade
 * im Blick ist, mit aria-current="location" am passenden Link und hält diesen Link in der
 * seitlich wischbaren Leiste sichtbar. Reine Verbesserung - die Sprunglinks funktionieren
 * ohne dieses Script vollständig; Chromium 140+ hebt den Link zusätzlich nativ per
 * :target-current hervor (das CSS deckt beide Wege ab, der Screenreader-Zustand
 * aria-current kommt aber nur von hier).
 *
 * Markup: <nav class="ncss-subnav" data-ncss-subnav> ... <a href="#abschnitt"> ... </nav>
 * Zusätzlich: misst den klebenden Kopfbereich ([data-ncss-sticky-header] oder .ncss-topbar)
 * und setzt --ncss-scroll-offset (+ ggf. --ncss-subnav-top), siehe trackHeader().
 * "Im Blick" = der letzte Abschnitt, dessen Oberkante die Unterkante des klebenden
 * Kopfbereichs erreicht hat; davor (ganz oben) der erste, am Seitenende immer der letzte
 * (kurze Schluss-Abschnitte erreichen die Kante sonst nie). Beobachtet wird per
 * IntersectionObserver eine 1px-Linie an dieser Kante (rootMargin aus der gemessenen
 * Kopfhöhe), dazu scroll/scrollend gebündelt per requestAnimationFrame.
 */
(function () {
  "use strict";

  // Ohne IntersectionObserver keine Markierung - die Links bleiben normale Sprunglinks.
  if (!("IntersectionObserver" in window)) return;

  function init(nav) {
    var list = nav.querySelector(".ncss-subnav-list") || nav;
    var links = Array.prototype.filter.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
      return a.hash.length > 1 && document.getElementById(decodeURIComponent(a.hash.slice(1)));
    });
    if (!links.length) return;
    nav.setAttribute("data-ncss-subnav-ready", "");
    var targets = links.map(function (a) {
      return document.getElementById(decodeURIComponent(a.hash.slice(1)));
    });
    var current = null;
    var queued = false;

    function setCurrent(link) {
      if (link === current) return;
      if (current) current.removeAttribute("aria-current");
      current = link;
      if (!link) return;
      link.setAttribute("aria-current", "location");
      // Nur die Leiste selbst seitlich nachführen, nie die Seite scrollen (darum kein
      // scrollIntoView, das auch senkrecht scrollen könnte).
      var lr = list.getBoundingClientRect();
      var r = link.getBoundingClientRect();
      var pad = 24;
      if (r.left < lr.left + pad || r.right > lr.right - pad) {
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var left = list.scrollLeft + (r.left - lr.left) - (list.clientWidth - r.width) / 2;
        list.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
      }
    }

    // Kante = Unterkante des klebenden Kopfbereichs (bzw. der Leiste) plus etwas Luft -
    // dort landet ein angesprungener Abschnitt (scroll-padding aus subnav.css).
    function edge() {
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      return Math.max(nav.getBoundingClientRect().bottom, pad) + 24;
    }

    function update() {
      queued = false;
      var line = edge();
      var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      // Ganz oben (noch kein Abschnitt an der Kante) gilt der erste, ganz unten der letzte -
      // auch wenn der letzte Abschnitt zu kurz ist, um die Kante je zu erreichen.
      var index = 0;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].getBoundingClientRect().top <= line) index = i;
      }
      if (atEnd) index = targets.length - 1;
      setCurrent(links[index]);
    }

    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    // Der Observer beobachtet nur eine 1px-Linie an der Kante (rootMargin aus der
    // gemessenen Kopfhöhe): er meldet jedes Mal, wenn eine Abschnitts-Ober- oder
    // -Unterkante sie kreuzt - also genau, wenn sich der aktuelle Abschnitt ändern kann,
    // auch mitten im Scrollen und bei Abschnitten, die höher als der Bildschirm sind.
    // Neu aufgebaut, wenn sich Fenster oder Kopfbereich in der Höhe ändern.
    var observer = null;
    var observedLine = -1;
    function observe() {
      var line = Math.round(edge());
      var h = window.innerHeight;
      if (observer && line === observedLine) return;
      observedLine = line;
      if (observer) observer.disconnect();
      var top = Math.min(line, h - 1);
      observer = new IntersectionObserver(queue, {
        rootMargin: -top + "px 0px " + -(h - top - 1) + "px 0px",
        threshold: 0,
      });
      targets.forEach(function (t) {
        observer.observe(t);
      });
    }
    observe();
    // scroll (gebündelt per requestAnimationFrame) als Rückfall für Browser, die die
    // Linie bei schnellem Scrollen überspringen; scrollend/resize für Seitenende/Größe.
    addEventListener("scroll", queue, { passive: true });
    addEventListener("scrollend", queue, { passive: true });
    addEventListener("resize", function () {
      observe();
      queue();
    }, { passive: true });
    if ("ResizeObserver" in window) {
      var unit = nav.closest("[data-ncss-sticky-header]") || nav;
      new ResizeObserver(function () {
        observe();
        queue();
      }).observe(unit);
    }
    nav.addEventListener("click", function (e) {
      var link = e.target.closest && e.target.closest('a[href^="#"]');
      if (link && links.indexOf(link) >= 0) setCurrent(link);
    });
    update();
  }

  // Höhe des klebenden Kopfbereichs messen und als --ncss-scroll-offset an :root setzen
  // (scroll-padding für Sprungziele, Sticky-Abstände z.B. einer Seitenleiste):
  // - Container mit [data-ncss-sticky-header] (Topbar + Leiste als EINE Einheit, empfohlen):
  //   dessen Höhe - beide Zeilen können nie gegeneinander verrutschen.
  // - sonst eine klebende .ncss-topbar: deren Höhe zusätzlich als --ncss-subnav-top (die
  //   Leiste klebt dann direkt darunter) plus die Höhe der Leiste.
  // Läuft auch ohne Leiste, sobald ein [data-ncss-sticky-header] existiert.
  function trackHeader() {
    if (!("ResizeObserver" in window)) return;
    var root = document.documentElement;
    var unit = document.querySelector("[data-ncss-sticky-header]");
    if (unit) {
      new ResizeObserver(function () {
        root.style.setProperty("--ncss-scroll-offset", unit.getBoundingClientRect().height + "px");
      }).observe(unit);
      return;
    }
    var bar = document.querySelector(".ncss-topbar");
    var nav = document.querySelector("[data-ncss-subnav]");
    if (!bar || !/sticky|fixed/.test(getComputedStyle(bar).position)) return;
    var measure = function () {
      var h = bar.getBoundingClientRect().height;
      root.style.setProperty("--ncss-subnav-top", h + "px");
      root.style.setProperty("--ncss-scroll-offset", h + (nav ? nav.getBoundingClientRect().height : 0) + "px");
    };
    var ro = new ResizeObserver(measure);
    ro.observe(bar);
    if (nav) ro.observe(nav);
  }

  function start() {
    trackHeader();
    Array.prototype.forEach.call(document.querySelectorAll("[data-ncss-subnav]"), init);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
