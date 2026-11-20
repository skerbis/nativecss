/**
 * Nur fürs Demo (demo/modern-ui.html): Befehlspaletten-Aktionen für das Farbschema,
 * gestapelte Beispielmeldungen und das passende Tastenkürzel im Button-Hinweis.
 */
(function () {
  "use strict";

  var isApple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll("[data-demo-shortcut]").forEach(function (kbd) {
    kbd.textContent = isApple ? "⌘J" : "Strg J";
  });

  var stackTexts = [
    ["Link kopiert", "In die Zwischenablage gelegt."],
    ["Entwurf gespeichert", "Automatisch um " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + "."],
    ["3 neue Kommentare", "Im Artikel „Container Queries“."],
    ["Export fertig", "bericht.pdf ist bereit."]
  ];
  var n = 0;

  document.addEventListener("click", function (event) {
    var themeBtn = event.target.closest("[data-demo-theme]");
    if (themeBtn) {
      var mode = themeBtn.getAttribute("data-demo-theme");
      if (mode) {
        document.documentElement.setAttribute("data-theme", mode);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      return;
    }
    if (!window.ncss || !window.ncss.notify) {
      return;
    }
    if (event.target.closest("[data-demo-stack]")) {
      var t = stackTexts[n++ % stackTexts.length];
      window.ncss.notify({ title: t[0], message: t[1], status: n % 4 === 0 ? "brand" : "success", position: "bottom-end", stack: true, timeout: 8000 });
    } else if (event.target.closest("[data-demo-close-all]")) {
      window.ncss.notifyCloseAll();
    }
  });
})();
