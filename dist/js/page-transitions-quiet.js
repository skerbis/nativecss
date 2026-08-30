/**
 * ncss - Optionaler Begleiter zu page-transitions.css: unterdrückt eine bekannte, laut
 * Spec/Implementierung ERWARTETE (aber ungefangene) Promise-Ablehnung, die bei jeder
 * rein deklarativen Cross-Document View Transition auftreten KANN, sobald der Browser
 * eine bereits gestartete Transition überspringt (typischer Auslöser: eine weitere
 * Navigation - z.B. ein schneller Vorwärts-/Zurück-Klick - kommt dazwischen) - sichtbar
 * in der Konsole als "Unhandled Promise Rejection: AbortError: Skipping view transition
 * because skipTransition() was called". Betrifft NICHT ncss' Code oder eine echte
 * Fehlfunktion - die Navigation selbst läuft normal weiter, nur die intern vom Browser
 * verwaltete `ready`-Promise der übersprungenen Transition lehnt ab, wie von der Spec
 * vorgesehen (ViewTransition.ready: "will reject if the transition cannot begin").
 *
 * Eine rein CSS-basierte Seite (`@view-transition { navigation: auto }`, siehe
 * page-transitions.css) bekommt dafür OHNE dieses Skript gar keine Referenz auf die
 * Transition - kann also auch gar nicht selbst `.catch()` darauf aufrufen. Der native
 * `pageswap`-Event (feuert auf dem VERLASSENEN Dokument kurz vor der Navigation) legt
 * über `PageSwapEvent.viewTransition` genau diese Referenz offen, extra für diesen
 * Zweck vorgesehen. Dieses Skript ändert am Übergang selbst NICHTS (keine eigene
 * Steuerung, kein eigener `skipTransition()`-Aufruf) - hängt nur einen leeren
 * `.catch()` an, unterdrückt dadurch die Konsolen-Meldung für den erwarteten,
 * harmlosen Fall.
 *
 * Bestätigt betroffen (Recherche August 2026): WebKit/Safari bei Zurück-/Vorwärts-
 * Navigation während eine Transition läuft, offener Bug bugs.webkit.org #289078.
 * Dieselbe Klasse Problem wird aktuell auch in der CSSWG selbst diskutiert
 * (github.com/w3c/csswg-drafts Issue 13726, "noisy unhandled rejections in transition
 * navigations") - kein ncss-spezifisches Problem, betrifft jede Seite mit Cross-
 * Document View Transitions, ob deklarativ per CSS oder per JS ausgelöst.
 *
 * Einbindung (zusätzlich zu page-transitions.css, komplett optional - nur bei Bedarf,
 * page-transitions.css selbst bleibt bewusst reines CSS ohne JS-Abhängigkeit):
 *   <script src="js/page-transitions-quiet.js" defer></script>
 */
(function () {
  "use strict";

  if (typeof PageSwapEvent === "undefined") return;

  window.addEventListener("pageswap", function (event) {
    if (event.viewTransition) {
      event.viewTransition.ready.catch(function () {});
    }
  });
})();
