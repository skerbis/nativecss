/**
 * ncss - command/commandfor-Fallback: generisch, NICHT an eine Komponente gebunden -
 * greift für jeden <button command="show-modal|close" commandfor="..."> auf der Seite
 * (Modal, Off-Canvas, Nav-Mobile-Panel, ...). Bildet nur "show-modal" und "close" nach,
 * mehr wird aktuell nirgends gebraucht. Bei nativer Unterstützung greift dieses Script
 * nicht ein (Buttons funktionieren dann bereits ganz ohne JS) - reine Progressive-
 * Enhancement-Ergänzung, kein Ersatz. Einmal pro Seite einbinden, unabhängig davon,
 * welche/wie viele der obigen Komponenten verwendet werden.
 */
(function () {
  "use strict";

  if ("command" in HTMLButtonElement.prototype) {
    return;
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("button[command][commandfor]");
    if (!btn) {
      return;
    }

    var target = document.getElementById(btn.getAttribute("commandfor"));
    if (!target || "function" !== typeof target.showModal) {
      return;
    }

    var command = btn.getAttribute("command");
    if ("show-modal" === command) {
      target.showModal();
    } else if ("close" === command) {
      target.close();
    }
  });
})();
