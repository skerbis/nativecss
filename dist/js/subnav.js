/**
 * ncss - Abschnitts-Navigation (components/subnav.css): markiert den Abschnitt, der gerade
 * im Blick ist, mit aria-current="location" am passenden Link und hält diesen Link in der
 * seitlich wischbaren Leiste sichtbar. Reine Verbesserung - die Sprunglinks funktionieren
 * ohne dieses Script vollständig; Chromium 140+ hebt den Link zusätzlich nativ per
 * :target-current hervor (das CSS deckt beide Wege ab, der Screenreader-Zustand
 * aria-current kommt aber nur von hier).
 *
 * Markup: <nav class="ncss-subnav" data-ncss-subnav> ... <a href="#abschnitt"> ... </nav>
 * Zusätzlich: misst die Höhe einer klebenden .ncss-topbar und setzt --ncss-subnav-top.
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

  // Klebt die Leiste unter einer .ncss-topbar, deren Inhalt höher ist als
  // --ncss-topbar-height (größere Schrift, zweizeilige Marke ...), würde sie die Topbar
  // überlappen. Deshalb die echte Höhe messen und als --ncss-subnav-top an :root setzen -
  // dieselbe Variable nutzt subnav.css auch für den Sprung-Versatz (scroll-padding).
  function trackTopbar() {
    var bar = document.querySelector(".ncss-topbar");
    if (!bar || !("ResizeObserver" in window)) return;
    if (getComputedStyle(bar).position !== "sticky" && getComputedStyle(bar).position !== "fixed") return;
    new ResizeObserver(function () {
      document.documentElement.style.setProperty("--ncss-subnav-top", bar.getBoundingClientRect().height + "px");
    }).observe(bar);
  }

  function start() {
    var navs = document.querySelectorAll("[data-ncss-subnav]");
    if (navs.length) trackTopbar();
    Array.prototype.forEach.call(navs, init);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
