/**
 * ncss - <ncss-container>: kapselt ncss-Inhalte in einem echten Shadow-DOM-Baum, damit
 * sie innerhalb eines FREMDEN Frameworks/CSS-Systems (Bootstrap, UIkit, Tailwind, ein
 * CMS-Theme, ...) laufen können, ohne dass Styles in beide Richtungen durchsickern - die
 * Seite außen kann ncss' Klassen nicht überschreiben, ncss' Reset kann die Seite außen
 * nicht beeinflussen. Kein npm-Paket/Framework nötig, reines natives Custom Element.
 *
 * Markup:
 *   <script src="components/ncss-container.js" defer></script>
 *   <ncss-container src="dist/ncss.css">
 *     <div class="ncss-card">...</div>
 *   </ncss-container>
 *
 * Attribute:
 * - src (Pflicht, ODER data-ncss-src auf dem Loader-<script> als Seiten-Default - siehe
 *   unten): Pfad zu ncss.css, relativ zur Seite (NICHT zum Shadow Root - ganz normaler
 *   <link>, keine ncss-Sonderregel).
 * - theme (optional): zusätzliches Stylesheet, NACH src geladen - für einen Container mit
 *   ANDERER Markenfarbe/Radien/Schrift als die restliche Seite (dasselbe Rezept wie
 *   theme.css, nur auf den Container statt :root angewendet).
 *
 * Warum das funktioniert (Teil 1, Tokens): ncss' Tokens sind in colors.css/tokens.css/
 * theme.css/webawesome-bridge.css bewusst als ":root, :host { ... }" deklariert (statt
 * nur ":root") - ":root" trifft IMMER das echte Seiten-Wurzelelement, niemals einen
 * Shadow Host, ":host" dagegen NUR den Host-Knoten eines Shadow-Trees und ist außerhalb
 * eines Shadow-Trees wirkungslos. Dieselbe Datei liefert dadurch, unverändert, eine
 * komplett EIGENSTÄNDIGE Token-Kopie, sobald sie in einem Shadow Root statt am
 * Seiten-<head> geladen wird - keine zweite, duplizierte Token-Datei nötig.
 *
 * Warum das funktioniert (Teil 2, Inhalt - der wichtigere Teil): der eigene Inhalt wird
 * NICHT per <slot> eingebunden, sondern beim Verbinden EINMALIG per JS in den Shadow
 * Root VERSCHOBEN (echte appendChild-Umhängung, keine Kopie). Ein <slot> würde die
 * Kind-Elemente technisch nur im Shadow Root ANZEIGEN - sie blieben aber weiterhin Teil
 * des LIGHT DOM und würden dadurch WEITERHIN von den globalen Stylesheets der äußeren
 * Seite getroffen (z.B. ein aggressives Framework-CSS wie "button { color: red
 * !important }") - nur echte Shadow-Root-NACHFAHREN (keine bloß durchgereichten/
 * "slotted" Elemente) sind vollständig vor äußerem CSS geschützt. Per echtem Test
 * bestätigt: ein <slot>-basierter Button übernahm eine äußere "!important"-Regel
 * unverändert, ein per Verschieben eingebetteter Button blieb komplett unberührt.
 * Kehrseite: kein automatisches Nachziehen bei späteren dynamischen DOM-Änderungen im
 * Original-Markup (das Original ist ja bereits umgezogen) - für den Zielfall (ein fertig
 * eingebetteter Inhaltsblock) kein praktischer Nachteil.
 */
(function () {
  "use strict";

  var loaderScript = document.currentScript;
  var pageDefaultSrc = loaderScript ? loaderScript.getAttribute("data-ncss-src") : null;

  function loadStylesheet(shadow, href) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    shadow.appendChild(link);
    return link;
  }

  customElements.define(
    "ncss-container",
    class extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) {
          return;
        }
        var shadow = this.attachShadow({ mode: "open" });

        var hostStyle = document.createElement("style");
        hostStyle.textContent = ":host { display: block; }";
        shadow.appendChild(hostStyle);

        var src = this.getAttribute("src") || pageDefaultSrc;
        if (!src) {
          if (window.console) {
            window.console.error("<ncss-container> braucht ein src-Attribut (Pfad zu ncss.css) oder data-ncss-src auf dem Loader-<script>.");
          }
          return;
        }
        loadStylesheet(shadow, src);

        var theme = this.getAttribute("theme");
        if (theme) {
          loadStylesheet(shadow, theme);
        }

        var content = document.createElement("div");
        content.className = "ncss-container-content";
        while (this.firstChild) {
          content.appendChild(this.firstChild);
        }
        shadow.appendChild(content);
      }
    }
  );
})();
