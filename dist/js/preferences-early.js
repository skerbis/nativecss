/**
 * ncss - Darstellungs-Einstellungen, früher Teil: setzt gespeicherte Besucher-Einstellungen
 * (<ncss-preferences>, js/preferences.js) als Attribute am <html>, BEVOR die Seite gezeichnet
 * wird - kein Aufblitzen in falscher Schriftgröße/Farbe beim Laden.
 *
 * Synchron im <head>, VOR den Stylesheets, ohne defer/async (eigene Datei statt Inline-
 * Snippet, damit eine strenge CSP ohne 'unsafe-inline' funktioniert):
 *   <script src="dist/js/preferences-early.js"></script>
 *   <link rel="stylesheet" href="dist/ncss.css">
 * Ersetzt js/theme-toggle-early.js (liest denselben Schlüssel "ncss-theme" - beide Dateien
 * zusammen schaden nicht, eine reicht).
 *
 * Gesetzte Attribute (Wirkung in colors.css/reset.css, ohne Wahl gilt das System):
 *   data-theme="light|dark"         Farbschema (+ data-theme-resolved, wie theme-toggle)
 *   data-contrast="more|normal"     Kontrast (normal = System-"more" bewusst zurücknehmen)
 *   data-motion="reduce|full"       Bewegung (full = System-"reduce" bewusst aufheben)
 *   data-text-scale="115|130"       Schriftgröße
 *   data-ncss-font="hyperlegible|lexend|opendyslexic"   Lese-Schrift
 *                                   (Wirkung in components/preferences-fonts.css)
 *   data-text-spacing               Textabstände nach WCAG 1.4.12
 *   data-links="underline"          Links immer unterstreichen
 *   data-focus="strong"             verstärkter Fokus-Rahmen
 */
(function (root) {
  "use strict";
  var prefs = {};
  try {
    var theme = localStorage.getItem("ncss-theme");
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    }
    prefs = JSON.parse(localStorage.getItem("ncss-prefs") || "{}") || {};
  } catch (e) {
    // localStorage gesperrt oder kaputter Wert - dann gilt das System.
  }
  var allowed = {
    contrast: ["more", "normal"],
    motion: ["reduce", "full"],
    text: ["115", "130"],
    font: ["hyperlegible", "lexend", "opendyslexic"]
  };
  if (allowed.contrast.indexOf(prefs.contrast) > -1) root.setAttribute("data-contrast", prefs.contrast);
  if (allowed.motion.indexOf(prefs.motion) > -1) root.setAttribute("data-motion", prefs.motion);
  if (allowed.text.indexOf(String(prefs.text)) > -1) root.setAttribute("data-text-scale", String(prefs.text));
  if (allowed.font.indexOf(prefs.font) > -1) root.setAttribute("data-ncss-font", prefs.font);
  if (prefs.spacing === true) root.setAttribute("data-text-spacing", "");
  if (prefs.links === true) root.setAttribute("data-links", "underline");
  if (prefs.focus === true) root.setAttribute("data-focus", "strong");
  var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme-resolved", root.getAttribute("data-theme") || (dark ? "dark" : "light"));
})(document.documentElement);
