/**
 * ncss - Downloads-Widget: rendert eine Datei-Download-Liste aus einer JSON-Quelle -
 * native HTML-Alternative zu einem eingebetteten Datei-Browser-iframe.
 *
 * Markup (opt-in): <div class="ncss-downloads" data-src="downloads.json"></div>
 * data-src: JSON-Array, jedes Element {title, url, size?, type?, description?}.
 *   type: Dateiendung ohne Punkt (z.B. "pdf") - fehlt es, wird sie aus der url-Endung
 *   abgeleitet. size: Bytes (Zahl) - fehlt es, wird keine Größenangabe gerendert.
 */
(function () {
  "use strict";

  var TYPE_LABELS = {
    pdf: "PDF", doc: "DOC", docx: "DOCX", xls: "XLS", xlsx: "XLSX",
    ppt: "PPT", pptx: "PPTX", zip: "ZIP", csv: "CSV", txt: "TXT",
    jpg: "JPG", jpeg: "JPG", png: "PNG", svg: "SVG", mp3: "MP3", mp4: "MP4"
  };

  function locale() {
    var lang = document.documentElement.getAttribute("lang") || "de";
    return lang.slice(0, 2) === "en" ? "en" : "de";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function typeFromUrl(url) {
    var match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url || "");
    return match ? match[1].toLowerCase() : "";
  }

  function formatSize(bytes) {
    if (typeof bytes !== "number" || isNaN(bytes)) return null;
    var units = ["B", "KB", "MB", "GB"];
    var value = bytes;
    var unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    var precision = unitIndex === 0 ? 0 : 1;
    return value.toFixed(precision) + " " + units[unitIndex];
  }

  function render(el, files) {
    var lang = locale();
    if (!files.length) {
      el.innerHTML = '<p class="ncss-events-empty">' + (lang === "de" ? "Keine Dateien verfügbar." : "No files available.") + "</p>";
      return;
    }

    var html = '<ul class="ncss-downloads-list">';
    files.forEach(function (file) {
      var type = (file.type || typeFromUrl(file.url)).toLowerCase();
      var label = TYPE_LABELS[type] || type.toUpperCase();
      var size = formatSize(file.size);

      html +=
        '<li class="ncss-downloads-item">' +
        '<span class="ncss-downloads-type" aria-hidden="true">' +
        escapeHtml(label || "↓") +
        "</span>" +
        '<div class="ncss-downloads-body">' +
        '<p class="ncss-downloads-title">' +
        escapeHtml(file.title || file.url) +
        "</p>";
      if (file.description) {
        html += '<p class="ncss-text-sm ncss-text-muted">' + escapeHtml(file.description) + "</p>";
      }
      if (size) {
        html += '<p class="ncss-text-sm ncss-text-muted">' + size + "</p>";
      }
      html +=
        "</div>" +
        '<a class="ncss-btn ncss-btn--secondary ncss-downloads-action" href="' +
        escapeHtml(file.url) +
        '" download>' +
        (lang === "de" ? "Herunterladen" : "Download") +
        "</a></li>";
    });
    html += "</ul>";
    el.innerHTML = html;
  }

  function renderError(el, err) {
    el.innerHTML = '<p class="ncss-events-empty">' + (locale() === "de" ? "Dateiliste konnte nicht geladen werden." : "Could not load file list.") + "</p>";
    if (window.console) {
      window.console.error("[ncss-downloads]", err);
    }
  }

  function init(el) {
    var src = el.getAttribute("data-src");
    if (!src) return;
    fetch(src)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (files) {
        render(el, files);
        el.setAttribute("data-loaded", "true");
      })
      .catch(function (err) {
        renderError(el, err);
      });
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

  // deepQueryAll() statt document.querySelectorAll(): ein .ncss-downloads-Widget
  // INNERHALB eines <ncss-container> (siehe ncss-container.js) liegt in dessen Shadow
  // Root - querySelectorAll() durchquert Shadow-Grenzen nicht.
  var widgets = deepQueryAll(".ncss-downloads");
  for (var i = 0; i < widgets.length; i++) {
    init(widgets[i]);
  }
})();
