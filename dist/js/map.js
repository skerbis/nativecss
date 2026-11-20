/**
 * ncss - <ncss-map>: interaktive Karte mit MapLibre GL (vendor/maplibre/, BSD-3-Clause).
 * Light-DOM-Custom-Element, Styles in components/map.css. Datenschutz zuerst: per Attribut
 * "proxy" laufen ALLE Anfragen der Karte (Stil, Kacheln, Schriften, Symbole) über den eigenen
 * Server - Besucher verbinden sich dann nie direkt mit Dritten.
 *
 *   <ncss-map lat="53.48" lng="13.26" zoom="12" label="Tollensesee"
 *             proxy="/proxy/ofm/" consent>
 *     <p><strong>Tollensesee</strong>, Mecklenburg-Vorpommern</p>
 *     <p><a href="https://www.openstreetmap.org/?mlat=53.48&amp;mlon=13.26#map=12/53.48/13.26">
 *       In OpenStreetMap öffnen</a></p>
 *   </ncss-map>
 *
 * Attribute:
 *   lat, lng            Mittelpunkt (und Position der Markierung), Dezimalgrad
 *   zoom="14"           Zoomstufe 0-22
 *   label="…"           Name des Orts: Beschriftung der Markierung und der Karte
 *   marker="off"        keine Markierung (Default: an)
 *   style-url="…"       MapLibre-Stil (JSON-URL). Default: OpenFreeMap "liberty"
 *                       (https://tiles.openfreemap.org/styles/liberty)
 *   style-url-dark="…"  Stil im Dunkelmodus. Default: OpenFreeMap "dark", aber nur wenn
 *                       auch style-url fehlt - ein eigener style-url gilt sonst für beide Modi
 *   proxy="…"           schreibt jede Anfrage von MapLibre um (transformRequest), zwei Formen:
 *                         Präfix:   proxy="/proxy/ofm/"
 *                                   https://tiles.openfreemap.org/planet/1/0/0.pbf
 *                                   -> /proxy/ofm/planet/1/0/0.pbf (Origin wird ersetzt)
 *                         Vorlage:  proxy="/proxy?url={url}"
 *                                   -> /proxy?url=https%3A%2F%2Ftiles.openfreemap.org%2F…
 *                                   Platzhalter: {url} (komplette URL, URL-kodiert),
 *                                   {host} (z.B. tiles.openfreemap.org), {path} (Pfad +
 *                                   Query ohne führenden Schrägstrich)
 *                       Relative Angaben gelten relativ zur SEITE.
 *   proxy-origins="…"   nur diese Origins umschreiben (Leerzeichen/Komma getrennt, z.B.
 *                       "tiles.openfreemap.org" oder "https://tiles.openfreemap.org").
 *                       Default: jede fremde Origin (alles außer der Seite und dem Proxy selbst)
 *   vendor="…"          Ordner mit maplibre-gl.mjs/.css (relativ zur Seite). Default:
 *                       ../../vendor/maplibre/ relativ zu DIESER Datei (document.currentScript,
 *                       wie bei <ncss-icon>) - als ES-Modul geladen das Attribut setzen
 *   consent             Zwei-Klick-Modus: Hinweis + Button "Karte anzeigen", geladen wird erst
 *                       nach dem Klick. Automatisch an, wenn das Gerät "Datensparen" (Save-Data)
 *                       meldet. consent="off" schaltet auch das ab
 *   privacy-url="…"     Link "Datenschutz" im Zwei-Klick-Hinweis
 *   view3d              Gebäude in 3D und geneigte Kamera (Stile mit OpenMapTiles-Schema)
 *   fallback="below"    Ersatzinhalt nach dem Laden sichtbar UNTER der Karte lassen (Default:
 *                       visuell versteckt, für Screenreader und Tastatur weiter da)
 *   data-label-<key>    jeden Text überschreiben, Schlüssel siehe TEXTS unten (show, note,
 *                       noteproxy, privacy, error, map, canvas, marker, zoomin, zoomout,
 *                       compass, attribution, winhelp, machelp, mobilehelp). In note steht
 *                       {host} für den Kartenserver. Sprache nach <html lang> (Deutsch/Englisch)
 *
 * Ersatzinhalt: was im Element steht (Adresse, Link zu OpenStreetMap), ist ohne JS, vor dem
 * Laden und bei einem Fehler sichtbar - das Element ist nie leer. Erst wenn die Karte fertig
 * gezeichnet ist, liegt sie darüber; der Ersatzinhalt bleibt im Accessibility Tree und wird bei
 * Tastatur-Fokus wieder eingeblendet.
 *
 * Laden: MapLibre (~1.1 MB) kommt erst, wenn die Karte in die Nähe des Viewports scrollt
 * (IntersectionObserver) bzw. nach dem Klick im Zwei-Klick-Modus.
 *
 * Bedienung: Tab auf die Karte, Pfeiltasten verschieben, +/- zoomen, Umschalt + Pfeile
 * drehen/neigen (MapLibre). cooperativeGestures: Mausrad zoomt nur mit Strg/⌘, auf Touch
 * verschieben zwei Finger - die Seite scrollt normal weiter. "Bewegung reduzieren"
 * (prefers-reduced-motion ODER <html data-motion="reduce">): keine Kamerafahrten.
 *
 * Dunkelmodus: folgt <html data-theme-resolved> / data-theme (sonst prefers-color-scheme) und
 * wechselt live, auch auf das Event ncss-preferences-change.
 *
 * Events (bubbles): ncss-map-consent (Klick auf "Karte anzeigen"), ncss-map-load (detail.map),
 * ncss-map-error (detail.error), ncss-map-theme (detail.dark, detail.style).
 * Öffentlich: el.map (MapLibre-Instanz, nach dem Laden), el.show() (lädt sofort).
 *
 * Benötigt: components/map.css + vendor/maplibre/. Keine anderen ncss-Scripts.
 */
(function () {
  "use strict";

  if (typeof customElements === "undefined" || customElements.get("ncss-map")) return;
  if (typeof URL !== "function" || typeof Promise !== "function") return;

  var script = document.currentScript;
  var DEFAULT_VENDOR = script && script.src ? new URL("../../vendor/maplibre/", script.src).href : null;
  var OFM = "https://tiles.openfreemap.org/styles/";
  var root = document.documentElement;

  var TEXTS = {
    de: {
      show: "Karte anzeigen",
      note: "Die Karte lädt erst nach deinem Klick. Dabei verbindet sich dein Browser mit {host} und überträgt deine IP-Adresse.",
      noteproxy: "Die Karte lädt erst nach deinem Klick. Die Kartendaten holt unser Server - dein Browser verbindet sich dabei nicht mit Dritten.",
      privacy: "Datenschutz",
      error: "Die Karte konnte nicht geladen werden.",
      map: "Karte",
      canvas: "Interaktive Karte. Pfeiltasten verschieben, Plus und Minus zoomen.",
      marker: "Standort",
      zoomin: "Vergrößern",
      zoomout: "Verkleinern",
      compass: "Nach Norden ausrichten",
      attribution: "Quellenangaben",
      winhelp: "Strg + Mausrad zum Zoomen",
      machelp: "⌘ + Mausrad zum Zoomen",
      mobilehelp: "Mit zwei Fingern verschieben"
    },
    en: {
      show: "Show map",
      note: "The map loads only after you click. Your browser then connects to {host} and transmits your IP address.",
      noteproxy: "The map loads only after you click. Our server fetches the map data - your browser does not connect to third parties.",
      privacy: "Privacy",
      error: "The map could not be loaded.",
      map: "Map",
      canvas: "Interactive map. Arrow keys pan, plus and minus zoom.",
      marker: "Location",
      zoomin: "Zoom in",
      zoomout: "Zoom out",
      compass: "Reset bearing to north",
      attribution: "Toggle attribution",
      winhelp: "Use Ctrl + scroll to zoom the map",
      machelp: "Use ⌘ + scroll to zoom the map",
      mobilehelp: "Use two fingers to move the map"
    }
  };

  var libs = {}; // vendor-URL -> Promise(MapLibre-Modul), einmal pro Seite
  var sheets = {}; // vendor-URL -> Promise (CSS geladen)

  var motionQuery = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  var darkQuery = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;

  function reducedMotion() {
    var m = root.getAttribute("data-motion");
    if (m === "reduce") return true;
    if (m === "full") return false;
    return !!(motionQuery && motionQuery.matches);
  }

  function isDark() {
    var r = root.getAttribute("data-theme-resolved");
    if (r === "dark" || r === "light") return r === "dark";
    var t = root.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t === "dark";
    return !!(darkQuery && darkQuery.matches);
  }

  function saveData() {
    return !!(navigator.connection && navigator.connection.saveData === true);
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  // MapLibre-CSS in den Unter-Layer components.maplibre: Regeln aus components/map.css
  // (Layer components bzw. unlayered) gewinnen dann ohne Spezifitäts-Kampf. Als
  // Constructable Stylesheet (CSSOM, kein Inline-<style> - CSP-freundlich); ohne
  // adoptedStyleSheets ein normales <link>.
  function loadCss(vendor) {
    if (sheets[vendor]) return sheets[vendor];
    var href = vendor + "maplibre-gl.css";
    var canAdopt = "adoptedStyleSheets" in document && typeof CSSStyleSheet === "function" && "replace" in CSSStyleSheet.prototype;
    sheets[vendor] = canAdopt
      ? fetch(href, { credentials: "same-origin" })
          .then(function (res) {
            if (!res.ok) throw new Error("CSS " + res.status);
            return res.text();
          })
          .then(function (css) {
            var sheet = new CSSStyleSheet();
            return sheet.replace("@layer components.maplibre {\n" + css + "\n}").then(function () {
              document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheet);
            });
          })
      : new Promise(function (resolve, reject) {
          var link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          link.onload = resolve;
          link.onerror = reject;
          document.head.appendChild(link);
        });
    sheets[vendor].catch(function () {
      delete sheets[vendor];
    });
    return sheets[vendor];
  }

  function loadLib(vendor) {
    if (!libs[vendor]) {
      // import() funktioniert auch aus einem klassischen Script; maplibre-gl.mjs lädt
      // shared + worker relativ zu sich selbst.
      libs[vendor] = Promise.all([import(vendor + "maplibre-gl.mjs"), loadCss(vendor)]).then(function (r) {
        return r[0];
      });
      libs[vendor].catch(function () {
        delete libs[vendor];
      });
    }
    return libs[vendor];
  }

  function originOf(entry) {
    entry = entry.trim();
    if (!entry) return null;
    try {
      return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(entry) ? entry : "https://" + entry).origin;
    } catch (e) {
      return null;
    }
  }

  // Liefert url -> umgeschriebene URL (oder dieselbe), null ohne Proxy.
  function rewriter(proxy, originsAttr) {
    if (!proxy) return null;
    var template = /\{(url|host|path)\}/.test(proxy);
    var proxyOrigin;
    try {
      proxyOrigin = new URL(template ? proxy.replace(/\{(url|host|path)\}/g, "") : proxy, document.baseURI).origin;
    } catch (e) {
      return null;
    }
    var only = originsAttr
      ? originsAttr
          .split(/[\s,]+/)
          .map(originOf)
          .filter(Boolean)
      : null;
    return function (url) {
      var u;
      try {
        u = new URL(url, document.baseURI);
      } catch (e) {
        return url;
      }
      if (u.protocol !== "https:" && u.protocol !== "http:") return url; // data:, blob:
      if (only) {
        if (only.indexOf(u.origin) < 0) return url;
      } else if (u.origin === location.origin || u.origin === proxyOrigin) {
        return url;
      }
      var path = (u.pathname + u.search).replace(/^\//, "");
      var out = template
        ? proxy
            .replace(/\{url\}/g, encodeURIComponent(u.href))
            .replace(/\{host\}/g, u.host)
            .replace(/\{path\}/g, path)
        : proxy.replace(/\/?$/, "/") + path;
      // absolut, sonst löst der Worker relativ zu seiner eigenen (Blob-)Adresse auf
      return new URL(out, document.baseURI).href;
    };
  }

  // 3D-Gebäude (fill-extrusion aus render_height des OpenMapTiles-Schemas)
  function add3d(map) {
    var style = map.getStyle();
    if (!style || !style.sources || !style.sources.openmaptiles) return;
    if (style.layers.some(function (l) { return l.type === "fill-extrusion"; })) return;
    var flat = style.layers.filter(function (l) {
      return l["source-layer"] === "building" && l.type === "fill";
    });
    var color = flat[0] ? map.getPaintProperty(flat[0].id, "fill-color") : null;
    var firstSymbol = style.layers.filter(function (l) { return l.type === "symbol"; })[0];
    map.addLayer(
      {
        id: "ncss-map-building-3d",
        type: "fill-extrusion",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 14,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": typeof color === "string" ? color : "#d9d4ce",
          "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15.5, ["coalesce", ["get", "render_height"], 6]],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.85
        }
      },
      firstSymbol && firstSymbol.id
    );
    flat.forEach(function (l) {
      map.setLayoutProperty(l.id, "visibility", "none");
    });
  }

  customElements.define(
    "ncss-map",
    class extends HTMLElement {
      static get observedAttributes() {
        return ["lat", "lng", "zoom", "label", "style-url", "style-url-dark", "marker"];
      }

      connectedCallback() {
        if (this._setup) return;
        this._setup = true;
        var self = this;
        var lang = ((this.closest("[lang]") || root).getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
        this._t = function (key) {
          return self.getAttribute("data-label-" + key) || TEXTS[lang][key];
        };

        // Ersatzinhalt einsammeln (oder ein vorhandenes .ncss-map-fallback nutzen)
        var fb = this.querySelector(":scope > .ncss-map-fallback");
        if (!fb) {
          fb = document.createElement("div");
          fb.className = "ncss-map-fallback";
          while (this.firstChild) fb.appendChild(this.firstChild);
          this.appendChild(fb);
        }
        this._fallback = fb;

        var consentAttr = this.getAttribute("consent");
        var consent = consentAttr !== null && consentAttr !== "off" && consentAttr !== "false";
        if (consentAttr !== "off" && saveData()) consent = true;

        if (consent || typeof IntersectionObserver === "undefined") {
          this._showConsent(consent);
        } else {
          this._state("idle");
          this._io = new IntersectionObserver(
            function (entries) {
              if (entries.some(function (e) { return e.isIntersecting; })) self._load();
            },
            { rootMargin: "300px 0px" }
          );
          this._io.observe(this);
        }
      }

      disconnectedCallback() {
        // Nur aufräumen, wenn das Element wirklich weg ist (nicht beim Verschieben im DOM)
        var self = this;
        queueMicrotask(function () {
          if (!self.isConnected) self._teardown();
        });
      }

      attributeChangedCallback(name) {
        if (!this.map) return;
        if (name === "style-url" || name === "style-url-dark") return this._applyTheme(true);
        if (name === "label") return this._applyLabels();
        if (name === "marker") return this._applyMarker();
        var center = this._center();
        if (!center) return;
        var cam = { center: center, zoom: num(this.getAttribute("zoom"), this.map.getZoom()) };
        if (reducedMotion()) this.map.jumpTo(cam);
        else this.map.easeTo(cam);
        if (this._marker) this._marker.setLngLat(center);
      }

      get map() {
        return this._map || null;
      }

      show() {
        this._load();
      }

      _state(s) {
        this.setAttribute("data-state", s);
      }

      _emit(type, detail) {
        this.dispatchEvent(new CustomEvent("ncss-map-" + type, { bubbles: true, detail: detail || {} }));
      }

      _center() {
        var lat = num(this.getAttribute("lat"), NaN);
        var lng = num(this.getAttribute("lng"), NaN);
        if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return [lng, lat];
      }

      // Aktueller Stil; setzt nebenbei data-dark, wenn der dunkle Stil gilt (für die
      // dunklen Bedienelemente in components/map.css)
      _styleUrl() {
        var light = this.getAttribute("style-url");
        var dark = this.getAttribute("style-url-dark");
        if (!light) {
          light = OFM + "liberty";
          if (!dark) dark = OFM + "dark";
        }
        var useDark = !!(isDark() && dark);
        if (this._map) this.toggleAttribute("data-dark", useDark);
        return new URL(useDark ? dark : light, document.baseURI).href;
      }

      _showConsent(withNote) {
        var self = this;
        this._state("consent");
        var box = document.createElement("div");
        box.className = "ncss-map-consent";
        if (withNote) {
          var note = document.createElement("p");
          note.className = "ncss-map-note";
          var host;
          try {
            host = new URL(this._styleUrl()).host;
          } catch (e) {
            host = "";
          }
          note.textContent = this.getAttribute("proxy") ? this._t("noteproxy") : this._t("note").replace("{host}", host);
          var privacy = this.getAttribute("privacy-url");
          if (privacy) {
            var a = document.createElement("a");
            a.href = privacy;
            a.textContent = this._t("privacy");
            note.appendChild(document.createTextNode(" "));
            note.appendChild(a);
          }
          box.appendChild(note);
        }
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ncss-map-show";
        btn.textContent = this._t("show");
        btn.addEventListener("click", function () {
          self._emit("consent");
          self._load(true);
        });
        box.appendChild(btn);
        this._consent = box;
        this.appendChild(box);
      }

      _load(fromClick) {
        if (this._loading) return;
        this._loading = true;
        if (this._io) {
          this._io.disconnect();
          this._io = null;
        }
        var self = this;
        var center = this._center();
        var vendor = this.getAttribute("vendor");
        vendor = vendor ? new URL(vendor.replace(/\/?$/, "/"), document.baseURI).href : DEFAULT_VENDOR;
        if (!center || !vendor) {
          return this._fail(new Error(center ? "vendor path unknown (set the vendor attribute)" : "lat/lng missing"));
        }
        this._state("loading");

        var stage = document.createElement("div");
        stage.className = "ncss-map-stage";
        stage.setAttribute("role", "region");
        this._stage = stage;
        this._applyLabels();
        this.insertBefore(stage, this._fallback);
        var hadFocus = fromClick && this._consent && this._consent.contains(document.activeElement);

        loadLib(vendor)
          .then(function (ml) {
            if (!self.isConnected || self._stage !== stage) return;
            self._create(ml, stage, center, hadFocus);
          })
          .catch(function (e) {
            self._fail(e);
          });
      }

      _create(ml, stage, center, focusAfter) {
        var self = this;
        var reduce = reducedMotion();
        var t = this._t;
        var rewrite = rewriter(this.getAttribute("proxy"), this.getAttribute("proxy-origins"));
        var view3d = this.hasAttribute("view3d") && this.getAttribute("view3d") !== "off";
        this._dark = isDark();
        this._currentStyle = this._styleUrl();

        var map = new ml.Map({
          container: stage,
          style: this._currentStyle,
          center: center,
          zoom: num(this.getAttribute("zoom"), 14),
          cooperativeGestures: true,
          attributionControl: { compact: true },
          fadeDuration: reduce ? 0 : 300,
          maxPitch: view3d ? 60 : 0,
          pitch: view3d && reduce ? 55 : 0,
          bearing: view3d && reduce ? -20 : 0,
          dragRotate: view3d,
          pitchWithRotate: view3d,
          touchPitch: view3d,
          transformRequest: rewrite
            ? function (url) {
                return { url: rewrite(url) };
              }
            : undefined,
          locale: {
            "Map.Title": t("canvas"),
            "Marker.Title": t("marker"),
            "NavigationControl.ZoomIn": t("zoomin"),
            "NavigationControl.ZoomOut": t("zoomout"),
            "NavigationControl.ResetBearing": t("compass"),
            "AttributionControl.ToggleAttribution": t("attribution"),
            "CooperativeGesturesHandler.WindowsHelpText": t("winhelp"),
            "CooperativeGesturesHandler.MacHelpText": t("machelp"),
            "CooperativeGesturesHandler.MobileHelpText": t("mobilehelp")
          }
        });
        this._map = map;
        this._styleUrl(); // data-dark
        if (!view3d) map.touchZoomRotate.disableRotation();

        // "Bewegung reduzieren" auch für <html data-motion="reduce"> (MapLibre selbst
        // kennt nur die Systemeinstellung): Kamerafahrten werden zu Sprüngen.
        ["easeTo", "flyTo"].forEach(function (fn) {
          var orig = map[fn];
          map[fn] = function (opts, data) {
            if (reducedMotion()) opts = Object.assign({}, opts, { duration: 0, animate: false });
            return orig.call(map, opts, data);
          };
        });

        map.addControl(new ml.NavigationControl({ showCompass: view3d, visualizePitch: view3d }), "top-right");
        this._ml = ml;
        this._applyMarker();

        var tilted = false;
        map.on("style.load", function () {
          if (view3d) {
            add3d(map);
            if (!tilted && !reducedMotion()) map.easeTo({ pitch: 55, bearing: -20, zoom: map.getZoom() + 0.3, duration: 2400 });
            tilted = true;
          }
        });
        map.once("load", function () {
          self._state("ready");
          if (self._consent) {
            self._consent.remove();
            self._consent = null;
          }
          if (focusAfter) map.getCanvas().focus();
          self._emit("load", { map: map });
        });
        map.on("error", function (e) {
          var err = (e && e.error) || e;
          // Vor dem ersten Zeichnen (Stil nicht ladbar): Ersatzinhalt zeigen. Danach sind
          // einzelne Kachel-Fehler kein Grund, die Karte wegzunehmen.
          if (self.getAttribute("data-state") === "loading" && !map.isStyleLoaded()) self._fail(err);
          else console.warn("ncss-map:", (err && err.message) || err);
        });

        this._onTheme = function () {
          self._applyTheme(false);
        };
        this._mo = new MutationObserver(this._onTheme);
        this._mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-theme-resolved"] });
        if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", this._onTheme);
        document.addEventListener("ncss-preferences-change", this._onTheme);
      }

      _applyLabels() {
        var label = (this.getAttribute("label") || "").trim();
        if (this._stage) this._stage.setAttribute("aria-label", this._t("map") + (label ? ": " + label : ""));
        if (this._pin) this._pin.setAttribute("aria-label", label || this._t("marker"));
      }

      _applyMarker() {
        var off = this.getAttribute("marker") === "off" || this.getAttribute("marker") === "false";
        if (off && this._marker) {
          this._marker.remove();
          this._marker = this._pin = null;
        } else if (!off && !this._marker && this._map) {
          var pin = document.createElement("div");
          pin.className = "ncss-map-marker";
          pin.setAttribute("role", "img");
          // Die Tropfenform sitzt in einem Kind: MapLibre positioniert das Element per
          // transform, eine Drehung direkt daran würde die Verschiebung mitdrehen.
          pin.appendChild(document.createElement("span")).className = "ncss-map-pin";
          this._pin = pin;
          this._marker = new this._ml.Marker({ element: pin, anchor: "bottom" }).setLngLat(this._center() || this._map.getCenter()).addTo(this._map);
          // MapLibre setzt role="button"/tabindex nur bei Popups - sicherheitshalber nicht fokussierbar
          pin.removeAttribute("tabindex");
          pin.setAttribute("role", "img");
        }
        this._applyLabels();
      }

      _applyTheme(force) {
        if (!this._map) return;
        var dark = isDark();
        var url = this._styleUrl();
        if (!force && dark === this._dark) return;
        this._dark = dark;
        if (url === this._currentStyle) return;
        this._currentStyle = url;
        this._map.setStyle(url);
        this._emit("theme", { dark: dark, style: url });
      }

      _fail(err) {
        console.warn("ncss-map:", (err && err.message) || err);
        this._teardown(true);
        this._state("error");
        if (!this._fallback.querySelector(".ncss-map-error")) {
          var p = document.createElement("p");
          p.className = "ncss-map-error";
          p.setAttribute("role", "status");
          p.textContent = this._t("error");
          this._fallback.insertBefore(p, this._fallback.firstChild);
        }
        this._emit("error", { error: err });
      }

      _teardown(keepSetup) {
        if (this._io) this._io.disconnect();
        if (this._mo) this._mo.disconnect();
        if (this._onTheme) {
          if (darkQuery && darkQuery.removeEventListener) darkQuery.removeEventListener("change", this._onTheme);
          document.removeEventListener("ncss-preferences-change", this._onTheme);
        }
        if (this._map) {
          try {
            this._map.remove();
          } catch (e) {}
        }
        if (this._stage) this._stage.remove();
        if (this._consent) this._consent.remove();
        this.removeAttribute("data-dark");
        this._io = this._mo = this._onTheme = this._map = this._stage = this._consent = this._marker = this._pin = null;
        this._loading = false;
        if (!keepSetup) {
          this._setup = false;
          this.removeAttribute("data-state");
        }
      }
    }
  );
})();
