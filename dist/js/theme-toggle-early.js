/**
 * ncss - Theme-Umschalter, früher Teil: setzt die gespeicherte Hell/Dunkel-Wahl, BEVOR die
 * Seite gezeichnet wird - sonst blitzt bei gespeichertem "dunkel" auf einem hellen System
 * kurz die helle Seite auf ("Flash of wrong theme").
 *
 * Synchron im <head> laden, VOR den Stylesheets, ohne defer/async (Ausführungs-Timing
 * zählt, siehe SKILL "Keine Inline-Scripts" - als eigene Datei statt Inline-Snippet,
 * damit eine strenge CSP ohne 'unsafe-inline' funktioniert):
 *   <script src="dist/js/theme-toggle-early.js"></script>
 *   <link rel="stylesheet" href="dist/ncss.css">
 *
 * Wer Inline-Scripts erlaubt, kann den Inhalt stattdessen direkt einbetten - eine Zeile.
 * Setzt [data-theme] (manuelle Wahl, wirkt über colors.css) und [data-theme-resolved]
 * (tatsächlich aktiver Modus, auch bei "System" - für Icons/Labels per CSS).
 */
(function (root) {
  "use strict";
  try {
    var stored = localStorage.getItem("ncss-theme");
    if (stored === "light" || stored === "dark") {
      root.setAttribute("data-theme", stored);
    }
  } catch (e) {
    // localStorage gesperrt (privater Modus, Cookie-Blocker) - dann gilt das System.
  }
  var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme-resolved", root.getAttribute("data-theme") || (dark ? "dark" : "light"));
})(document.documentElement);
