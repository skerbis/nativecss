/**
 * ncss - Sparkline-Datenbindung (opt-in, ergänzt components/sparkline.css): berechnet
 * polyline/-area/-dot aus echten Werten statt sie von Hand als SVG-Koordinaten
 * ausrechnen zu müssen, UND liefert die Werte gleichzeitig als barrierefreie Tabelle -
 * das <svg> selbst ist rein dekorativ (aria-hidden), Screenreader bekommen die
 * tatsächlichen Zahlen aus einer visuell versteckten <table> daneben, nicht nur eine
 * vage Trend-Beschreibung.
 *
 * Markup (opt-in - ein <svg class="ncss-sparkline"> OHNE data-values/data-src bleibt
 * unangetastet, z.B. für weiterhin von Hand/serverseitig gerenderte Sparklines):
 *   <svg class="ncss-sparkline" data-values="4,7,3,9,5,12" data-label="Besucher/Tag"></svg>
 *   <svg class="ncss-sparkline" data-src="besucher.json" data-label="Besucher/Tag"></svg>
 * data-values: einfache kommagetrennte Zahlenliste, Punkte ohne eigenes Label (Tabelle
 *   nummeriert sie 1..n).
 * data-src: JSON - entweder ein reines Zahlen-Array ([4,7,3,9,5,12]) oder ein Array aus
 *   {label, value}-Objekten für sprechende Tabellen-Zeilen (z.B. Wochentage/Daten).
 * data-label: Beschriftung der Datenreihe (Tabellen-<caption>) - ohne Angabe ein
 *   generischer DE/EN-Standardtext.
 * viewBox/preserveAspectRatio auf dem <svg> werden übernommen, falls bereits gesetzt -
 * sonst Default "0 0 200 60" (dieselben Maße wie das Hand-Beispiel in sparkline.css).
 */
(function () {
  "use strict";

  function locale() {
    var lang = document.documentElement.getAttribute("lang") || "de";
    return lang.slice(0, 2) === "en" ? "en" : "de";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  // Akzeptiert sowohl [4,7,3] als auch [{label,value}, ...] - normiert auf EIN Format.
  function normalizePoints(data) {
    return data.map(function (item, index) {
      if (item !== null && typeof item === "object") {
        return { label: item.label != null ? String(item.label) : String(index + 1), value: Number(item.value) };
      }
      return { label: String(index + 1), value: Number(item) };
    }).filter(function (p) {
      return !isNaN(p.value);
    });
  }

  function parseValuesAttr(attr) {
    return attr.split(",").map(function (v) {
      return { value: Number(v.trim()) };
    }).filter(function (p) {
      return !isNaN(p.value);
    }).map(function (p, index) {
      return { label: String(index + 1), value: p.value };
    });
  }

  function buildSvgMarkup(svg, points) {
    var viewBox = svg.getAttribute("viewBox") || "0 0 200 60";
    var parts = viewBox.split(/\s+/).map(Number);
    var width = parts[2] || 200;
    var height = parts[3] || 60;
    if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", viewBox);
    if (!svg.hasAttribute("preserveAspectRatio")) svg.setAttribute("preserveAspectRatio", "none");

    var values = points.map(function (p) { return p.value; });
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min;

    var coords = points.map(function (p, index) {
      var x = points.length === 1 ? width : (index / (points.length - 1)) * width;
      // range === 0 (ein einziger Wert ODER alle Werte identisch) -> flache Linie in der
      // Mitte statt einer Division durch 0 (NaN-Koordinaten, unsichtbare Linie).
      var y = range === 0 ? height / 2 : height - ((p.value - min) / range) * height;
      return { x: x, y: y };
    });

    var polylinePoints = coords.map(function (c) { return c.x + "," + c.y; }).join(" ");
    var areaD = "M" + coords.map(function (c) { return c.x + "," + c.y; }).join(" L")
      + " L" + width + "," + height + " L0," + height + " Z";
    var last = coords[coords.length - 1];

    svg.innerHTML =
      '<path class="ncss-sparkline-area" d="' + areaD + '"></path>' +
      '<polyline points="' + polylinePoints + '"></polyline>' +
      '<circle class="ncss-sparkline-dot" cx="' + last.x + '" cy="' + last.y + '" r="3"></circle>';

    // Dekorativ - die Zahlen kommen für Screenreader aus der Tabelle daneben, nicht aus
    // dem SVG selbst (vage Formen/Pfad-Koordinaten sind keine sinnvolle Ansage).
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
  }

  function buildTable(svg, points, label) {
    var lang = locale();
    var caption = label || (lang === "de" ? "Datenreihe" : "Data series");
    var colHead = lang === "de" ? "Wert" : "Value";
    var rows = points.map(function (p) {
      return "<tr><td>" + escapeHtml(p.label) + "</td><td>" + escapeHtml(p.value) + "</td></tr>";
    }).join("");
    var table = document.createElement("table");
    table.className = "ncss-visually-hidden";
    table.innerHTML =
      "<caption>" + escapeHtml(caption) + "</caption>" +
      "<thead><tr><th scope=\"col\">#</th><th scope=\"col\">" + colHead + "</th></tr></thead>" +
      "<tbody>" + rows + "</tbody>";
    svg.insertAdjacentElement("afterend", table);
  }

  function renderError(svg) {
    svg.setAttribute("aria-hidden", "true");
    var lang = locale();
    var span = document.createElement("span");
    span.className = "ncss-visually-hidden";
    span.textContent = lang === "de" ? "Daten nicht verfügbar." : "Data not available.";
    svg.insertAdjacentElement("afterend", span);
    if (window.console) {
      window.console.error("[ncss-sparkline] Werte konnten nicht geladen werden.");
    }
  }

  function render(svg, points, label) {
    if (!points.length) { renderError(svg); return; }
    buildSvgMarkup(svg, points);
    buildTable(svg, points, label);
    svg.setAttribute("data-loaded", "true");
  }

  function init(svg) {
    var label = svg.getAttribute("data-label");
    var valuesAttr = svg.getAttribute("data-values");
    var src = svg.getAttribute("data-src");

    if (valuesAttr) {
      render(svg, parseValuesAttr(valuesAttr), label);
      return;
    }
    if (src) {
      fetch(src)
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          render(svg, normalizePoints(data), label);
        })
        .catch(function (err) {
          renderError(svg);
          if (window.console) window.console.error("[ncss-sparkline]", err);
        });
    }
  }

  function deepQueryAll(selector, root) {
    root = root || document;
    var found = Array.prototype.slice.call(root.querySelectorAll(selector));
    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) {
        found = found.concat(deepQueryAll(selector, all[i].shadowRoot));
      }
    }
    return found;
  }

  // deepQueryAll() statt document.querySelectorAll(): eine .ncss-sparkline INNERHALB
  // eines <ncss-container> (siehe ncss-container.js) liegt in dessen Shadow Root -
  // querySelectorAll() durchquert Shadow-Grenzen nicht. Nur Elemente MIT data-values/
  // -src werden angefasst - ein von Hand/serverseitig fertig gerendertes <svg
  // class="ncss-sparkline"> ohne diese Attribute bleibt unverändert.
  var sparklines = deepQueryAll(".ncss-sparkline[data-values], .ncss-sparkline[data-src]");
  for (var i = 0; i < sparklines.length; i++) {
    init(sparklines[i]);
  }
})();
