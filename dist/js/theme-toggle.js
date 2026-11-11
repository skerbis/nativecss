/**
 * ncss - Hell/Dunkel-Umschalter für Buttons mit [data-ncss-theme-toggle]. Nutzt den
 * vorhandenen Mechanismus aus colors.css ([data-theme] am <html> überschreibt die
 * Systemeinstellung) und ergänzt, was eine echte Website zusätzlich braucht:
 *
 * - Die Wahl bleibt gespeichert (localStorage "ncss-theme"), ohne Wahl gilt das System.
 *   Zusammen mit js/theme-toggle-early.js im <head> ohne Aufblitzen beim Laden.
 * - [data-theme-resolved] = tatsächlich aktiver Modus (auch bei "System"), z.B. um per
 *   CSS das passende Sonne/Mond-Icon zu zeigen.
 * - aria-pressed + wechselndes aria-label (Screenreader hören, was der Klick bewirkt).
 * - Weicher Farbwechsel nur WÄHREND des Umschaltens (Klasse .ncss-theme-switching am
 *   <html>, 350ms) - kein Dauer-Transition auf allen Elementen.
 * - Folgt einer Systemänderung live, solange nichts gespeichert ist.
 *
 * Zwei Varianten:
 * 1. data-ncss-theme-toggle (leer) - Hell <-> Dunkel. Entspricht die neue Wahl wieder
 *    dem System, wird die gespeicherte Wahl gelöscht (keine "eingefrorene" Einstellung).
 *    Labels: data-label-dark / data-label-light (Text für den Wechsel DORTHIN).
 * 2. data-ncss-theme-toggle="cycle" - System -> Hell -> Dunkel -> System, aktueller Name
 *    in einem Kind-Element [data-ncss-theme-label].
 *
 * Texte Deutsch/Englisch nach <html lang>, einzeln per data-label-* überschreibbar.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var KEY = "ncss-theme";
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var TEXTS = {
    de: { dark: "Dunkles Design einschalten", light: "Helles Design einschalten", system: "System", lightName: "Hell", darkName: "Dunkel", cycle: "Farbschema wechseln" },
    en: { dark: "Switch to dark theme", light: "Switch to light theme", system: "System", lightName: "Light", darkName: "Dark", cycle: "Change color scheme" }
  };
  var lang = (root.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";

  function stored() {
    try {
      var value = localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (e) {
      return null;
    }
  }
  function save(mode) {
    try {
      if (mode) {
        localStorage.setItem(KEY, mode);
      } else {
        localStorage.removeItem(KEY);
      }
    } catch (e) {}
  }
  function system() {
    return media.matches ? "dark" : "light";
  }
  function resolved() {
    return root.getAttribute("data-theme") || system();
  }
  function label(btn, key) {
    return btn.getAttribute("data-label-" + key) || TEXTS[lang][key];
  }

  function sync() {
    var mode = resolved();
    var choice = root.getAttribute("data-theme");
    root.setAttribute("data-theme-resolved", mode);
    document.querySelectorAll("[data-ncss-theme-toggle]").forEach(function (btn) {
      if (btn.getAttribute("data-ncss-theme-toggle") === "cycle") {
        var name = choice === "light" ? label(btn, "lightName") : choice === "dark" ? label(btn, "darkName") : label(btn, "system");
        var target = btn.querySelector("[data-ncss-theme-label]");
        if (target) {
          target.textContent = name;
        }
        btn.setAttribute("aria-label", label(btn, "cycle") + ": " + name);
        return;
      }
      var dark = mode === "dark";
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
      btn.setAttribute("aria-label", dark ? label(btn, "light") : label(btn, "dark"));
      btn.setAttribute("title", btn.getAttribute("aria-label"));
    });
  }

  function apply(mode) {
    root.classList.add("ncss-theme-switching");
    if (mode) {
      root.setAttribute("data-theme", mode);
    } else {
      root.removeAttribute("data-theme");
    }
    save(mode);
    sync();
    window.setTimeout(function () {
      root.classList.remove("ncss-theme-switching");
    }, 350);
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-ncss-theme-toggle]");
    if (!btn) {
      return;
    }
    if (btn.getAttribute("data-ncss-theme-toggle") === "cycle") {
      var order = [null, "light", "dark"];
      apply(order[(order.indexOf(root.getAttribute("data-theme")) + 1) % order.length]);
      return;
    }
    var next = resolved() === "dark" ? "light" : "dark";
    apply(next === system() ? null : next);
  });

  media.addEventListener("change", function () {
    if (!stored()) {
      sync();
    }
  });

  // Falls theme-toggle-early.js fehlt: gespeicherte Wahl wenigstens jetzt anwenden.
  if (!root.hasAttribute("data-theme") && stored()) {
    root.setAttribute("data-theme", stored());
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }
})();
