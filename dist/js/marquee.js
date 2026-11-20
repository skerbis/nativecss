/**
 * NativeCSS - opt-in Begleiter für components/marquee.css.
 *
 * 1. <div class="ncss-marquee" data-ncss-marquee> mit nur EINER .ncss-marquee-group:
 *    erzeugt die Kopie, die die CSS-Schleife nahtlos macht (aria-hidden + inert, ids
 *    entfernt - weder vorgelesen noch fokussierbar). Bereits vorhandene Kopien werden
 *    ebenfalls inert gesetzt.
 * 2. <button type="button" data-ncss-marquee-toggle aria-controls="marquee-id">: schaltet
 *    .ncss-marquee--paused und aria-pressed um (WCAG 2.2.2 Pause-Mechanismus). Den
 *    Button-Text formuliert die Seite selbst ("Laufband anhalten").
 *
 * Benötigt: components/marquee.css.
 * Einbindung: <script src="ncss/js/marquee.js" defer></script>
 */
(function () {
  if (!document.querySelectorAll) return;

  function initMarquee(el) {
    var groups = el.querySelectorAll(":scope > .ncss-marquee-group");
    if (groups.length === 1) {
      var clone = groups[0].cloneNode(true);
      var withId = clone.querySelectorAll("[id]");
      for (var k = 0; k < withId.length; k++) withId[k].removeAttribute("id");
      clone.setAttribute("aria-hidden", "true");
      el.appendChild(clone);
    }
    var copies = el.querySelectorAll(':scope > .ncss-marquee-group[aria-hidden="true"]');
    for (var c = 0; c < copies.length; c++) copies[c].inert = true;
    keyboardScroll(el);
  }

  // Reduzierte Bewegung: das Laufband steht und wird stattdessen horizontal scrollbar
  // (marquee.css) - dann per Tastatur erreichbar machen (WCAG 2.1.1). Eigenes tabindex
  // des Autors bleibt unangetastet.
  var reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() {
    var m = document.documentElement.getAttribute("data-motion");
    if (m === "reduce") return true;
    if (m === "full") return false;
    return !!(reduceMq && reduceMq.matches);
  }
  function keyboardScroll(el) {
    var scrollable = reduced() && el.scrollWidth > el.clientWidth + 1;
    if (scrollable && !el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "0");
      el.setAttribute("data-ncss-marquee-tabindex", "");
    } else if (!scrollable && el.hasAttribute("data-ncss-marquee-tabindex")) {
      el.removeAttribute("tabindex");
      el.removeAttribute("data-ncss-marquee-tabindex");
    }
  }
  function refreshAll() {
    var all = document.querySelectorAll("[data-ncss-marquee]");
    for (var i = 0; i < all.length; i++) keyboardScroll(all[i]);
  }
  if (reduceMq && reduceMq.addEventListener) reduceMq.addEventListener("change", refreshAll);
  document.addEventListener("ncss-preferences-change", refreshAll);
  window.addEventListener("resize", refreshAll);

  // Pause-Schalter per Delegation am document statt pro Button - funktioniert dadurch
  // auch für später eingefügte Schalter ohne erneute Initialisierung.
  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest("[data-ncss-marquee-toggle]");
    if (!btn) return;
    var target = document.getElementById(btn.getAttribute("aria-controls") || "");
    if (!target) return;
    var paused = target.classList.toggle("ncss-marquee--paused");
    btn.setAttribute("aria-pressed", paused ? "true" : "false");
  });

  // Anfangszustand von aria-pressed (idempotent, darf beliebig oft laufen).
  function syncToggles(root) {
    var toggles = Array.prototype.slice.call(root.querySelectorAll("[data-ncss-marquee-toggle]"));
    if (root.matches && root.matches("[data-ncss-marquee-toggle]")) toggles.unshift(root);
    toggles.forEach(function (btn) {
      var target = document.getElementById(btn.getAttribute("aria-controls") || "");
      if (!target) return;
      btn.setAttribute("aria-pressed", target.classList.contains("ncss-marquee--paused") ? "true" : "false");
    });
  }

  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Elemente merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung
  // mit). Läuft beim Laden und bei jedem "ncss-content-change"-Event (detail.root = neu
  // eingefügtes Element, ohne Angabe das ganze Dokument), siehe js/content-observer.js.
  var SELECTOR = "[data-ncss-marquee]";
  var seen = new WeakSet();
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var list = Array.prototype.slice.call(root.querySelectorAll(SELECTOR));
    if (root.matches && root.matches(SELECTOR)) list.unshift(root);
    list.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      initMarquee(el);
    });
  }
  scan(document);
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
  syncToggles(document);
  document.addEventListener("ncss-content-change", function (event) {
    var root = (event.detail && event.detail.root) || document;
    if (root.querySelectorAll) syncToggles(root);
  });
})();
