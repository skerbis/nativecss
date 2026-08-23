/**
 * NativeCSS - schließt offene <wa-dropdown>/<wa-popover>-Panels, sobald die Seite
 * gescrollt wird. Web Awesomes Popup-Baustein hält ein offenes Panel ABSICHTLICH
 * während des Scrollens an seinem Anker positioniert (siehe vendor/webawesome/dist-cdn/
 * skills/webawesome/references/components/popup.md: "keep them positioned together as
 * the page scrolls") - sitzt der Anker in einer position:sticky-Kopfleiste, kann diese
 * ständige Neuberechnung sichtbar glitchen (User-Report: Text/Panel "verdoppelte" sich
 * beim Scrollen wie ein Glitch-Effekt) - betraf sowohl <wa-dropdown> als auch
 * <wa-popover> gleichermaßen, unabhängig von backdrop-filter/Glassmorphism (die dafür
 * zuerst verantwortlich vermutete Ursache, siehe SKILL.md Punkt 21) - ein generelles
 * Web-Awesome-/Floating-UI-Verhalten, kein ncss-CSS-Problem, deshalb hier nicht per CSS
 * lösbar. Schließen statt weiter mitpositionieren ist dieselbe, verbreitete Lösung wie
 * bei den meisten Mega-/Dropdown-Menüs anderer Sites - kein Repositionierungs-Kampf
 * mehr, weil das Panel dann einfach nicht mehr da ist.
 *
 * Einbindung (nur auf Seiten mit <wa-dropdown>/<wa-popover> nötig):
 *   <script src="../components/wa-close-on-scroll.js" defer></script>
 *
 * Sucht zusätzlich gezielt INNERHALB jedes <ncss-container> (siehe ncss-container.js) -
 * dessen Inhalt liegt in einem Shadow Root, den ein normales querySelectorAll() nicht
 * durchquert. Bewusst NICHT der generische "jedes Element auf .shadowRoot prüfen"-Ansatz
 * wie in den anderen Fallback-Scripts (deren Suche läuft nur EINMAL beim Laden) - dieser
 * Handler läuft bei JEDEM Scroll-Event, ein voller DOM-Walk wäre dort spürbar teurer als
 * die gezielte Suche nach der einzigen Quelle von Shadow Roots, die auf einer
 * ncss-Seite realistisch vorkommt. Zusätzlich jetzt per requestAnimationFrame gedrosselt
 * (vorher ungedrosselt bei jedem einzelnen Scroll-Event) - dieselbe Technik wie die
 * übrigen Scroll-Fallback-Scripts.
 */
(function () {
  "use strict";

  function closeOpenPopups(root) {
    root.querySelectorAll("wa-dropdown[open], wa-popover[open]").forEach((el) => {
      el.open = false;
    });
    root.querySelectorAll("ncss-container").forEach((container) => {
      if (container.shadowRoot) {
        closeOpenPopups(container.shadowRoot);
      }
    });
  }

  var ticking = false;
  document.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        closeOpenPopups(document);
        ticking = false;
      });
    },
    { passive: true },
  );
})();
