/**
 * ncss - <ncss-icon>: setzt ein Phosphor-Icon (vendor/phosphor/, MIT) als Inline-SVG ein.
 * Reines Light-DOM-Custom-Element, Größe/Farbe kommen aus helpers/icons.css (1em bzw.
 * --ncss-icon-size, fill: currentColor) - die Fläche ist dort schon VOR dem Laden
 * reserviert, es springt nichts.
 *
 *   <ncss-icon name="house"></ncss-icon>                               dekorativ
 *   <ncss-icon name="heart" weight="fill" label="Favorit"></ncss-icon>  mit Bedeutung
 *
 * Attribute:
 *   name="house"            Phosphor-Name (Kleinbuchstaben/Ziffern/Bindestrich)
 *   weight="regular"        regular | thin | light | bold | fill | duotone
 *   label="…"               macht das Icon bedeutungstragend: role="img" + aria-label.
 *                           Ohne label ist es dekorativ (aria-hidden="true").
 *   src="pfad/eigen.svg"    statt name/weight eine beliebige eigene SVG-Datei laden
 *   data-ncss-icon-path="…" Icon-Ordner, auf dem Element ODER einem Vorfahren (z.B.
 *                           <html>); relativ zur SEITE aufgelöst. Default: der Ordner
 *                           vendor/phosphor/ relativ zu DIESER Datei (dist/js/icon.js ->
 *                           ../../vendor/phosphor/), per document.currentScript ermittelt -
 *                           als ES-Modul geladen gibt es kein currentScript, dann
 *                           data-ncss-icon-path setzen.
 *
 * Jede URL wird nur EINMAL geladen (Cache über alle Elemente der Seite). Die Datei wird
 * bereinigt eingesetzt: nur SVG-Formelemente, keine <script>/<foreignObject>/<style>,
 * keine on*-Attribute, keine externen href - wichtig, sobald src auf fremde Dateien zeigt.
 *
 * OHNE JS (oder vor der Definition) bleibt das Element leer: unsichtbar, aber mit
 * reservierter Fläche. Für Icons, die Bedeutung tragen, deshalb das Kern-Set
 * (.ncss-icon-*) oder ein SVG-Sprite nehmen (beide ohne JS), oder den Text daneben
 * sichtbar lassen.
 *
 * Events (bubbles): "ncss-icon-load" (detail.url), "ncss-icon-error" (detail.url).
 */
(function () {
  "use strict";

  if (typeof customElements === "undefined" || customElements.get("ncss-icon")) return;
  if (typeof fetch !== "function" || typeof DOMParser !== "function" || typeof URL !== "function") return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var WEIGHTS = ["regular", "thin", "light", "bold", "fill", "duotone"];
  // Erlaubte Elemente - alles andere fliegt samt Inhalt raus.
  var ALLOWED = /^(svg|g|path|circle|ellipse|line|polyline|polygon|rect|defs|use|symbol|title|desc|lineargradient|radialgradient|stop|clippath|mask)$/;

  var script = document.currentScript;
  var DEFAULT_BASE = script && script.src ? new URL("../../vendor/phosphor/", script.src).href : null;
  var cache = new Map();

  function sanitize(node) {
    Array.prototype.slice.call(node.children).forEach(function (child) {
      if (!ALLOWED.test(child.localName.toLowerCase()) || child.namespaceURI !== SVG_NS) {
        child.remove();
        return;
      }
      sanitize(child);
    });
    Array.prototype.slice.call(node.attributes).forEach(function (attr) {
      var n = attr.name.toLowerCase();
      var v = attr.value.trim();
      if (n.indexOf("on") === 0) node.removeAttribute(attr.name);
      else if ((n === "href" || n === "xlink:href") && v.charAt(0) !== "#") node.removeAttribute(attr.name);
      else if (/url\(\s*['"]?(?!#)/i.test(v)) node.removeAttribute(attr.name);
    });
  }

  function load(url) {
    if (cache.has(url)) return cache.get(url);
    var job = fetch(url, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      })
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, "image/svg+xml");
        var svg = doc.documentElement;
        if (!svg || svg.localName !== "svg" || doc.getElementsByTagName("parsererror").length) {
          throw new Error("no svg");
        }
        sanitize(svg);
        if (!svg.hasAttribute("fill")) svg.setAttribute("fill", "currentColor");
        // Ohne helpers/icons.css hält das die 1em-Größe; jede CSS-Regel schlägt diese
        // Präsentations-Attribute.
        svg.setAttribute("width", "1em");
        svg.setAttribute("height", "1em");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        return svg;
      })
      .catch(function () {
        cache.delete(url); // später erneut versuchen dürfen (z.B. nach Netzfehler)
        return null;
      });
    cache.set(url, job);
    return job;
  }

  customElements.define(
    "ncss-icon",
    class extends HTMLElement {
      static get observedAttributes() {
        return ["name", "weight", "label", "src"];
      }

      connectedCallback() {
        this._render();
      }

      attributeChangedCallback() {
        if (this.isConnected) this._render();
      }

      _url() {
        var src = this.getAttribute("src");
        if (src) return new URL(src, document.baseURI).href;
        var name = (this.getAttribute("name") || "").trim();
        if (!NAME.test(name)) return null;
        var weight = (this.getAttribute("weight") || "regular").trim();
        if (WEIGHTS.indexOf(weight) < 0) weight = "regular";
        var host = this.closest("[data-ncss-icon-path]");
        var base = host
          ? new URL(host.getAttribute("data-ncss-icon-path").replace(/\/?$/, "/"), document.baseURI).href
          : DEFAULT_BASE || new URL("vendor/phosphor/", document.baseURI).href;
        return base + weight + "/" + (weight === "regular" ? name : name + "-" + weight) + ".svg";
      }

      _a11y() {
        var label = (this.getAttribute("label") || "").trim();
        if (label) {
          this.removeAttribute("aria-hidden");
          this.setAttribute("role", "img");
          this.setAttribute("aria-label", label);
        } else {
          this.setAttribute("aria-hidden", "true");
          this.removeAttribute("role");
          this.removeAttribute("aria-label");
        }
      }

      _render() {
        var self = this;
        this._a11y();
        var url = this._url();
        if (url === this._url_done) return;
        this._want = url;
        if (!url) {
          this.replaceChildren();
          this._url_done = null;
          return;
        }
        load(url).then(function (svg) {
          if (self._want !== url) return; // inzwischen anderes Icon angefordert
          self._url_done = url;
          if (svg) {
            self.replaceChildren(document.importNode(svg, true));
            self.dispatchEvent(new CustomEvent("ncss-icon-load", { bubbles: true, detail: { url: url } }));
          } else {
            self.replaceChildren();
            self._url_done = null;
            self.dispatchEvent(new CustomEvent("ncss-icon-error", { bubbles: true, detail: { url: url } }));
          }
        });
      }
    }
  );
})();
