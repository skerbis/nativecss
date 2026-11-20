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
 * "Im Blick" = der letzte Abschnitt, dessen Oberkante die Unterkante der Leiste erreicht
 * hat; am Seitenende immer der letzte Abschnitt (kurze Schluss-Abschnitte erreichen die
 * Oberkante sonst nie).
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
      // Nur die Leiste selbst seitlich nachführen, nie die Seite scrollen.
      var l = link.offsetLeft - list.offsetLeft;
      var r = l + link.offsetWidth;
      var pad = 24;
      if (l < list.scrollLeft + pad || r > list.scrollLeft + list.clientWidth - pad) {
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        list.scrollTo({ left: Math.max(0, l - list.clientWidth / 2 + link.offsetWidth / 2), behavior: reduce ? "auto" : "smooth" });
      }
    }

    function update() {
      queued = false;
      // Kante = dort, wo ein angesprungener Abschnitt landet (scroll-padding aus
      // subnav.css), mindestens die Unterkante der Leiste - plus etwas Luft.
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      var edge = Math.max(nav.getBoundingClientRect().bottom, pad) + 24;
      var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      var index = -1;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].getBoundingClientRect().top <= edge) index = i;
      }
      if (atEnd) index = targets.length - 1;
      setCurrent(index >= 0 ? links[index] : null);
    }

    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    // Der Observer meldet jedes Überschreiten einer Abschnittskante - genau dann kann
    // sich der aktuelle Abschnitt ändern; scrollend fängt das Seitenende ab.
    var observer = new IntersectionObserver(queue, { threshold: [0, 1] });
    targets.forEach(function (t) {
      observer.observe(t);
    });
    addEventListener("scrollend", queue, { passive: true });
    addEventListener("resize", queue, { passive: true });
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
