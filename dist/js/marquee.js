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

  var marquees = document.querySelectorAll("[data-ncss-marquee]");
  for (var i = 0; i < marquees.length; i++) {
    var el = marquees[i];
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

  var toggles = document.querySelectorAll("[data-ncss-marquee-toggle]");
  for (var t = 0; t < toggles.length; t++) {
    (function (btn) {
      var target = document.getElementById(btn.getAttribute("aria-controls") || "");
      if (!target) return;
      btn.setAttribute("aria-pressed", target.classList.contains("ncss-marquee--paused") ? "true" : "false");
      btn.addEventListener("click", function () {
        var paused = target.classList.toggle("ncss-marquee--paused");
        btn.setAttribute("aria-pressed", paused ? "true" : "false");
      });
    })(toggles[t]);
  }
})();
