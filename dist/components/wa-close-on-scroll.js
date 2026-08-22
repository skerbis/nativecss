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
 */
document.addEventListener(
  "scroll",
  () => {
    document.querySelectorAll("wa-dropdown[open], wa-popover[open]").forEach((el) => {
      el.open = false;
    });
  },
  { passive: true },
);
