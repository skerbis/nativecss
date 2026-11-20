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
  }

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
