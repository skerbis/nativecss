/**
 * ncss - Nav: kleines Enhancement, kein Ersatz für die native Funktionalität (Menü
 * öffnen/schließen funktioniert auch ohne dieses Script vollständig über command/
 * commandfor bzw. <details>). Schließt nur zwei Dinge, für die es keinen reinen CSS-Weg
 * gibt: das offene Dropdown nach Klick auf einen Untermenü-Link (natives <details> bleibt
 * sonst offen stehen), und das mobile Off-Canvas-Panel nach Klick auf IRGENDEINen Nav-
 * Link (sonst bleibt das Menü nach der Navigation sichtbar offen).
 */
(function () {
  "use strict";

  document.addEventListener("click", function (event) {
    var link = event.target.closest(".ncss-nav-item a");
    if (!link) {
      return;
    }

    var dropdown = link.closest(".ncss-nav-dropdown");
    if (dropdown && dropdown.open) {
      dropdown.open = false;
    }

    var panel = link.closest(".ncss-nav-panel");
    if (panel && panel.open) {
      panel.close();
    }
  });
})();
