/**
 * ncss - Downloads-Widget: rendert eine Datei-Download-Liste aus einer JSON-Quelle -
 * native HTML-Alternative zu einem eingebetteten Datei-Browser-iframe.
 *
 * Markup (opt-in): <div class="ncss-downloads" data-src="downloads.json"></div>
 * data-src: JSON-Array, jedes Element {title, url, size?, type?, description?}.
 *   type: Dateiendung ohne Punkt (z.B. "pdf") - fehlt es, wird sie aus der url-Endung
 *   abgeleitet. size: Bytes (Zahl) - fehlt es, wird keine Größenangabe gerendert.
 *
 * Sprache: nächster [lang]-Vorfahre des Widgets (sonst <html lang>) - bestimmt Texte UND
 * Zahlenformat (Intl.NumberFormat: "1,2 MB" auf Deutsch, "1.2 MB" auf Englisch). Jeder
 * Herunterladen-Link trägt einen eindeutigen zugänglichen Namen mit Typ, Dateiname und
 * Größe ("PDF herunterladen: Preisliste 2026, 1,2 MB") - mehrere gleichlautende
 * "Herunterladen"-Links wären in einer Linkliste des Screenreaders sonst nicht
 * unterscheidbar (WCAG 2.4.4/2.4.9). Der sichtbare Text bleibt kurz, der Name beginnt
 * aber mit ihm (WCAG 2.5.3 "Label in Name").
 *
 * Dynamische Inhalte: neu eingefügte Widgets per
 *   document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: el } }))
 * melden (oder js/content-observer.js einbinden) - jedes Widget lädt nur einmal.
 */
(function () {
  "use strict";

  var TYPE_LABELS = {
    pdf: "PDF", doc: "DOC", docx: "DOCX", xls: "XLS", xlsx: "XLSX",
    ppt: "PPT", pptx: "PPTX", zip: "ZIP", csv: "CSV", txt: "TXT",
    jpg: "JPG", jpeg: "JPG", png: "PNG", svg: "SVG", mp3: "MP3", mp4: "MP4"
  };

  // Volle Sprach-Angabe des nächsten [lang]-Vorfahren ("de-CH", "en-GB") - für
  // Intl.NumberFormat; locale() reduziert sie auf die zwei mitgelieferten Textsprachen.
  function langOf(el) {
    var host = el && el.closest ? el.closest("[lang]") : null;
    return (host && host.getAttribute("lang")) || document.documentElement.getAttribute("lang") || "de";
  }
  function locale(el) {
    return langOf(el).slice(0, 2).toLowerCase() === "en" ? "en" : "de";
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

  // Intl.NumberFormat statt toFixed(): toFixed() liefert immer einen Dezimal-PUNKT
  // ("1.2 MB" auch auf einer deutschen Seite). Einheit bleibt bewusst das gängige
  // KB/MB-Kürzel (Basis 1024) statt Intls "unit"-Stil (wäre "1,2 MB" vs. "1.2 MB" je nach
  // Engine mit schmalem oder normalem Leerzeichen - hier stabil ein geschütztes Leerzeichen).
  function formatSize(bytes, lang) {
    if (typeof bytes !== "number" || isNaN(bytes)) return null;
    var units = ["B", "KB", "MB", "GB"];
    var value = bytes;
    var unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    var precision = unitIndex === 0 ? 0 : 1;
    var number;
    try {
      number = new Intl.NumberFormat(lang, { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value);
    } catch (e) {
      number = value.toFixed(precision);
    }
    return number + "\u00a0" + units[unitIndex];
  }

  function render(el, files) {
    var lang = locale(el);
    var fullLang = langOf(el);
    if (!files.length) {
      el.innerHTML = '<p class="ncss-events-empty">' + (lang === "de" ? "Keine Dateien verfügbar." : "No files available.") + "</p>";
      return;
    }

    var html = '<ul class="ncss-downloads-list">';
    files.forEach(function (file) {
      var type = (file.type || typeFromUrl(file.url)).toLowerCase();
      var label = TYPE_LABELS[type] || type.toUpperCase();
      var size = formatSize(file.size, fullLang);
      var title = file.title || file.url;
      var action = lang === "de" ? "Herunterladen" : "Download";
      // "PDF herunterladen: Preisliste 2026, 1,2 MB" - beginnt mit dem sichtbaren Text.
      var name = (lang === "de" ? (label || "Datei") + " herunterladen: " : "Download " + (label || "file") + ": ") +
        title + (size ? ", " + size : "");

      html +=
        '<li class="ncss-downloads-item">' +
        '<span class="ncss-downloads-type" aria-hidden="true">' +
        escapeHtml(label || "↓") +
        "</span>" +
        '<div class="ncss-downloads-body">' +
        '<p class="ncss-downloads-title">' +
        escapeHtml(title) +
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
        '" download aria-label="' +
        escapeHtml(name) +
        '">' +
        action +
        "</a></li>";
    });
    html += "</ul>";
    el.innerHTML = html;
  }

  function renderError(el, err) {
    el.innerHTML = '<p class="ncss-events-empty">' + (locale(el) === "de" ? "Dateiliste konnte nicht geladen werden." : "Could not load file list.") + "</p>";
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
  //
  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Widgets merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung mit).
  var seen = new WeakSet();
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var list = deepQueryAll(".ncss-downloads", root);
    if (root.matches && root.matches(".ncss-downloads")) list.unshift(root);
    list.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      init(el);
    });
  }
  scan(document);
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
