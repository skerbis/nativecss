/**
 * ncss - <ncss-nav-drilldown>: verschachtelte mobile Menüs als Slide-Screens statt
 * Inline-Aufklappen (siehe components/nav-drilldown.css für Markup/Einbindung/Optik).
 * Reines Light-DOM-Custom-Element (kein Shadow Root, wie <ncss-nav-priority> - soll
 * ganz normal von der Seiten-eigenen ncss.css/theme.css getroffen werden).
 *
 * v1-Grenze, bewusst: drillt nur EINE Ebene tief (Wurzel-Liste ↔ ein Untermenü-Screen).
 * Ein Elternpunkt INNERHALB eines bereits gezeigten Untermenüs (dritte Ebene+) klappt
 * stattdessen normal INLINE auf (unverändertes .ncss-nav-dropdown-Verhalten) - deckt
 * die weit überwiegende Mehrheit realer Navigationen ab (zwei Ebenen), ohne die
 * Komplexität eines vollen Breadcrumb-Stacks für beliebige Tiefe.
 *
 * Ein Klick auf einen ECHTEN <a> innerhalb <summary> (optionaler "Elternpunkt auch als
 * Seite aufrufbar"-Trick, siehe components/nav.css) navigiert normal, OHNE zu drillen -
 * dieselbe Unterscheidung wie beim normalen Dropdown, hier nur zusätzlich per JS
 * respektiert (das native "beide Default-Aktionen bleiben getrennt"-Verhalten gilt nur
 * für das native <details>-Toggle, nicht für unseren eigenen preventDefault()-Pfad).
 */
(function () {
  "use strict";

  customElements.define(
    "ncss-nav-drilldown",
    class extends HTMLElement {
      connectedCallback() {
        this._list = this.querySelector(":scope > .ncss-nav-list");
        if (!this._list) {
          return;
        }

        this._track = document.createElement("div");
        this._track.className = "ncss-nav-drill-track";
        this._list.parentNode.insertBefore(this._track, this._list);
        this._track.appendChild(this._list);

        this._activeSubmenu = null;
        this._activeDetails = null;

        this._onClick = this._onClick.bind(this);
        this._track.addEventListener("click", this._onClick);

        this._panel = this.closest("dialog");
        if (this._panel) {
          this._onPanelClose = this._reset.bind(this);
          this._panel.addEventListener("close", this._onPanelClose);
        }
      }

      disconnectedCallback() {
        if (this._track) {
          this._track.removeEventListener("click", this._onClick);
        }
        if (this._panel) {
          this._panel.removeEventListener("close", this._onPanelClose);
        }
      }

      _onClick(event) {
        var backBtn = event.target.closest(".ncss-nav-drill-back");
        if (backBtn) {
          event.preventDefault();
          this._goBack();
          return;
        }

        var summary = event.target.closest("summary");
        if (!summary || !this._track.contains(summary)) {
          return;
        }
        if (summary.closest(".ncss-nav-submenu")) {
          return;
        }
        var link = event.target.closest("a");
        if (link && summary.contains(link)) {
          return;
        }

        var details = summary.closest(".ncss-nav-dropdown");
        if (!details) {
          return;
        }
        var submenu = details.querySelector(":scope > .ncss-nav-submenu");
        if (!submenu) {
          return;
        }
        event.preventDefault();
        this._drillInto(details, submenu);
      }

      _drillInto(details, submenu) {
        if (this._activeSubmenu === submenu) {
          return;
        }
        if (this._activeSubmenu) {
          this._reset();
        }

        this._ensureBackButton(submenu, details);

        /* Das Untermenü wird ECHTER GESCHWISTER-Knoten der Liste im Track, statt nur
           visuell per position:absolute "auszubrechen" - `translate` auf der Liste
           (fürs Wegschieben nach links) erzeugt selbst einen NEUEN Containing Block
           für JEDEN positionierten Nachfahren, unabhängig davon, ob die Liste selbst
           position:static ist (dieselbe Eigenschaft wie bei filter/backdrop-filter,
           siehe SKILL.md) - ein verschachteltes position:absolute-Untermenü würde
           sich sonst relativ zur - inzwischen wegtranslatierten - Liste positionieren
           statt relativ zum Track (per echtem Test gefunden: Untermenü landete
           sichtbar außerhalb des Bildschirms). Original-Position (Elternknoten +
           nextSibling) merken, um beim Zurückgehen exakt dorthin zurückzuhängen -
           wichtig für native Details-Semantik UND falls das Untermenü selbst wieder
           verschachtelte Dropdowns enthält (dritte Ebene, klappt dort normal inline
           auf, siehe Datei-Kommentar). */
        this._originalParent = submenu.parentNode;
        this._originalNextSibling = submenu.nextSibling;
        details.open = true;
        this._track.appendChild(submenu);

        /* Erzwungenes Reflow (Lesen von offsetWidth) VOR dem eigentlichen
           Zustandswechsel - ohne das verschmilzt der Browser das Umhängen (Zeile
           oben) und den Klassenwechsel (unten) oft zu EINEM einzigen Styling-Durchlauf,
           dann gibt es keinen beobachtbaren "Vorher"-Zustand, von dem aus animiert
           werden könnte - die Transition übersprang sich selbst (User-Report: "aktuell
           slided nichts"). Das erzwungene Lesen zwingt den Browser, den
           Zwischenzustand (frisch umgehängt, noch bei der Default-Position
           translate:100%) tatsächlich zu berechnen/committen, BEVOR unten die
           Ziel-Klasse (translate:0) gesetzt wird - erst DAS macht die Transition
           beobachtbar. */
        void submenu.offsetWidth;

        submenu.classList.add("ncss-nav-drill-active");
        this._track.setAttribute("data-drilled-in", "");
        this._list.setAttribute("inert", "");
        this._activeSubmenu = submenu;
        this._activeDetails = details;

        var back = submenu.querySelector(":scope > .ncss-nav-drill-back");
        if (back) {
          back.focus();
        }
      }

      _goBack() {
        if (!this._activeSubmenu) {
          return;
        }
        var details = this._activeDetails;
        var submenu = this._activeSubmenu;
        var originalParent = this._originalParent;
        var originalNextSibling = this._originalNextSibling;

        submenu.classList.remove("ncss-nav-drill-active");
        this._track.removeAttribute("data-drilled-in");
        this._list.removeAttribute("inert");
        this._activeSubmenu = null;
        this._activeDetails = null;
        this._originalParent = null;
        this._originalNextSibling = null;

        /* Umhängen + details.open=false ERST NACH der Slide-Zurück-Transition, nicht
           synchron mit der Klassen-Entfernung oben: <details open=false> versteckt
           nicht-summary-Kinder NATIV sofort (UA-Stylesheet, unabhängig von eigenem
           CSS) - würde das Untermenü mitten in der eigentlich noch laufenden
           Transition ausblenden, dieselbe Ursache wie beim Reflow-Fix in _drillInto
           (kein beobachtbarer Übergang, Sprung statt Gleiten). transitionend
           abwarten, PLUS großzügiger Timeout-Fallback (falls z.B. eine weitere
           schnelle Interaktion die Transition unterbricht und transitionend nie
           feuert) - `done`-Flag verhindert Doppelausführung, falls beide feuern. */
        var done = false;
        function finish() {
          if (done) {
            return;
          }
          done = true;
          if (originalParent) {
            originalParent.insertBefore(submenu, originalNextSibling);
          }
          if (details) {
            details.open = false;
          }
        }
        if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
          submenu.addEventListener("transitionend", function handler(event) {
            if (event.target !== submenu || event.propertyName !== "translate") {
              return;
            }
            submenu.removeEventListener("transitionend", handler);
            finish();
          });
          setTimeout(finish, 500);
        } else {
          finish();
        }

        if (details) {
          var summary = details.querySelector(":scope > summary");
          if (summary) {
            summary.focus();
          }
        }
      }

      /* Ohne Fokus-Rückgabe (z.B. weil das Panel gerade schließt) - reiner Zustands-
         Reset, kein .focus() nötig/gewünscht. */
      _reset() {
        if (this._activeSubmenu) {
          this._activeSubmenu.classList.remove("ncss-nav-drill-active");
        }
        if (this._activeDetails) {
          this._activeDetails.open = false;
        }
        if (this._track) {
          this._track.removeAttribute("data-drilled-in");
        }
        if (this._list) {
          this._list.removeAttribute("inert");
        }
        if (this._originalParent && this._activeSubmenu) {
          this._originalParent.insertBefore(this._activeSubmenu, this._originalNextSibling);
        }
        this._originalParent = null;
        this._originalNextSibling = null;
        this._activeSubmenu = null;
        this._activeDetails = null;
      }

      _ensureBackButton(submenu, details) {
        if (submenu.querySelector(":scope > .ncss-nav-drill-back")) {
          return;
        }
        var summary = details.querySelector(":scope > summary");
        var label = summary ? summary.textContent.trim() : "";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ncss-nav-drill-back";
        var backText = this.getAttribute("back-text") || "Zurück";
        btn.textContent = label ? backText + " – " + label : backText;
        submenu.insertBefore(btn, submenu.firstChild);
      }
    }
  );
})();
