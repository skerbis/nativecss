/**
 * ncss - View-Transitions-Enhancement für .ncss-accordion-split (kein CSS-Layer, reines
 * opt-in JS). Der Bildwechsel in .ncss-accordion-split-media läuft heute per CSS
 * :has()-Trick als harter display:none/block-Schnitt, ohne Übergang (User-Report:
 * "fehlen Transitions ... Bild sollte einfaden oder gleiten"). Same-Document View
 * Transitions (document.startViewTransition()) sind der dafür vorgesehene native
 * Mechanismus - anders als die bereits vorhandenen Cross-Document View Transitions
 * (page-transitions.css) gibt es dafür KEINE rein deklarative CSS-Form, ein kurzer
 * JS-Trigger ist unvermeidlich (Stand jetzt, Spec-bedingt).
 *
 * Browser-Support (Stand August 2026, per Recherche + echtem Playwright-Test bestätigt:
 * `typeof document.startViewTransition === 'function'`): Chrome/Edge 111+, Safari 18+,
 * Firefox 133+. Ohne Unterstützung bleibt der native, sofortige <details>-Toggle
 * unverändert erhalten (`if (!document.startViewTransition) return` unten) - kein
 * Funktionsverlust.
 *
 * MECHANIK: <details> feuert (Stand jetzt) KEIN abbrechbares `beforetoggle` (anders als
 * <dialog>/Popover - siehe whatwg/html#9743, offener Spec-Issue, per Recherche
 * bestätigt) - der native Toggle lässt sich deshalb nicht darüber abfangen. Funktionierender
 * Weg: Klick auf <summary> abfangen und per `preventDefault()` verhindern (das IST
 * möglich, `<summary>`s Aktivierungsverhalten ist abbrechbar), dann `.open` MANUELL
 * innerhalb von `document.startViewTransition(...)` umschalten - dadurch sieht die
 * View-Transitions-API einen echten Vorher-/Nachher-Zustand. Per echtem Test in
 * Chromium/WebKit/Firefox bestätigt: das funktioniert auch für EXKLUSIVE Gruppen
 * (`<details name="...">`) - das Schließen der Geschwister-Punkte passiert weiterhin
 * automatisch, obwohl `.open` per JS statt durch echten Nutzer-Klick gesetzt wird (Teil
 * des <details>-eigenen Algorithmus, nicht an "war es ein echter Klick" gebunden).
 *
 * NAME vs. KLASSE: `view-transition-name` muss unter simultan sichtbaren Elementen
 * EINDEUTIG sein (Spec) - bei mehreren .ncss-accordion-split-Instanzen auf derselben
 * Seite bekommt jede ihren eigenen Namen (Instanz-Index). Für die Presets (siehe unten)
 * reicht ein fester Name aber NICHT aus, weil CSS' `::view-transition-group()`-Selektor
 * nur exakte Namen oder den Universalselektor `*` kennt (per Recherche + echtem Test
 * bestätigt: KEIN Scoping über eine DOM-Vorfahren-Bedingung wie `[data-transition]
 * ::view-transition-group(...)` möglich, die Pseudo-Elemente hängen an einem eigenen,
 * von :root ausgehenden Baum, nicht am normalen DOM). Deshalb zusätzlich
 * `view-transition-class` (Level 2, per echtem Test in allen drei Engines bestätigt:
 * `::view-transition-group(*.klassenname)` trifft nur Gruppen mit dieser Klasse, egal
 * welchen eindeutigen Namen sie einzeln tragen) - das eigentliche Preset-Styling in
 * accordion-split.css zielt auf die KLASSE, nicht auf den Namen.
 *
 * NICHT `.ncss-accordion-split`-spezifisch geschrieben, obwohl aktuell nur dafür verkabelt
 * - `enhanceExclusiveDetailsGroup()` funktioniert an jeder `<details name="...">`-Gruppe
 * mit einem Medien-Element, das per View Transition wechseln soll. Künftige Komponenten
 * mit demselben Bedürfnis (z.B. ein Tab-Wechsler) können dieselbe Funktion wiederverwenden.
 */
(function () {
  "use strict";

  if (!document.startViewTransition) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function enhanceExclusiveDetailsGroup(container, itemSelector, mediaItemSelector, namePrefix, transitionClass) {
    var mediaItems = container.querySelectorAll(mediaItemSelector);
    mediaItems.forEach(function (el) {
      el.style.viewTransitionName = namePrefix;
      if (transitionClass) el.style.viewTransitionClass = transitionClass;
    });

    var summaries = container.querySelectorAll(itemSelector + " > summary");
    summaries.forEach(function (summary) {
      summary.addEventListener("click", function (event) {
        var details = summary.parentElement;
        event.preventDefault();
        document.startViewTransition(function () {
          details.open = !details.open;
        });
      });
    });
  }

  document.querySelectorAll(".ncss-accordion-split-container").forEach(function (container, containerIndex) {
    var preset = container.dataset.transition || "";
    var transitionClass = preset === "slide" ? "ncss-vt-slide" : preset === "3d" ? "ncss-vt-3d" : "";
    enhanceExclusiveDetailsGroup(
      container,
      ".ncss-accordion-split-item",
      ".ncss-accordion-split-media > *",
      "ncss-accordion-split-media-" + containerIndex,
      transitionClass
    );
  });
})();
