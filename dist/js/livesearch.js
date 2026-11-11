/**
 * ncss - Live-Suche: Vorschläge während der Eingabe für [data-ncss-livesearch]-Formulare
 * (siehe components/livesearch.css). WAI-ARIA Combobox + Listbox: der Fokus bleibt im
 * Eingabefeld, aria-activedescendant zeigt auf die gewählte Option.
 *
 * Tastatur: Pfeil runter/hoch wählt, Enter öffnet die gewählte Option (ohne Auswahl:
 * normales Absenden = Ergebnisseite), Esc schließt die Liste, Klick daneben ebenso.
 *
 * Attribute am <form>:
 *   data-ncss-livesearch="URL"  Endpoint (Pflicht)
 *   data-param="q"              Name des Suchparameters (Default "q")
 *   data-min="2"                Mindestlänge der Eingabe
 *   data-delay="180"            Wartezeit nach dem letzten Tastendruck (ms)
 *   data-mode="client"          Endpoint ist eine STATISCHE JSON-Datei: einmal laden,
 *                               im Browser filtern (kleine Datenmengen, ohne Server-Logik)
 *
 * Antwort-Format (JSON) - im Server-Modus bereits gefiltert, im Client-Modus komplett:
 * {
 *   "groups": [
 *     { "label": "Seiten", "items": [ { "title": "...", "url": "...", "text": "..." } ] }
 *   ],
 *   "all": "/suche/?q=..."   (optional, Link "Alle Ergebnisse anzeigen")
 * }
 *
 * Texte: Deutsch/Englisch nach <html lang> (wie events.js/downloads.js), einzeln
 * überschreibbar per data-text-empty/-all/-status am <form> ("{n}" und "{q}" als
 * Platzhalter). Treffer-Markierung per <mark>, alle Inhalte werden escaped.
 */
(function () {
  "use strict";

  if (typeof window.fetch !== "function" || typeof window.AbortController !== "function") {
    return;
  }

  var TEXTS = {
    de: { empty: "Keine Treffer für „{q}“.", all: "Alle Ergebnisse anzeigen", status: "{n} Treffer, mit Pfeiltasten auswählen", none: "Keine Treffer" },
    en: { empty: "No results for “{q}”.", all: "Show all results", status: "{n} results, use arrow keys to choose", none: "No results" }
  };
  var lang = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  var counter = 0;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function terms(query) {
    return query.trim().toLowerCase().split(/\s+/).filter(function (t) { return t.length > 1; });
  }
  function highlight(value, query) {
    var html = escapeHtml(value);
    terms(query).forEach(function (term) {
      var re = new RegExp("(" + escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      html = html.replace(re, "<mark>$1</mark>");
    });
    return html;
  }

  function init(form) {
    var input = form.querySelector('input[type="search"], input[type="text"]');
    var box = form.querySelector(".ncss-livesearch-results");
    if (!input || !box) {
      return;
    }
    function text(key) {
      return form.getAttribute("data-text-" + key) || TEXTS[lang][key];
    }
    var endpoint = form.getAttribute("data-ncss-livesearch");
    var param = form.getAttribute("data-param") || "q";
    var min = parseInt(form.getAttribute("data-min"), 10) || 2;
    var delay = parseInt(form.getAttribute("data-delay"), 10) || 180;
    var clientMode = form.getAttribute("data-mode") === "client";
    var id = box.id || (box.id = "ncss-livesearch-" + ++counter);
    var options = [];
    var active = -1;
    var timer = null;
    var controller = null;
    var cache = {};
    var dataset = null;

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", id);
    input.setAttribute("autocomplete", "off");
    box.setAttribute("role", "listbox");
    var status = document.createElement("p");
    status.className = "ncss-visually-hidden";
    status.setAttribute("role", "status");
    form.appendChild(status);

    function close() {
      box.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    }
    function select(i) {
      options.forEach(function (o) { o.setAttribute("aria-selected", "false"); });
      active = i;
      if (i < 0 || !options[i]) {
        input.removeAttribute("aria-activedescendant");
        return;
      }
      options[i].setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", options[i].id);
      options[i].scrollIntoView({ block: "nearest" });
    }
    function render(data, query) {
      var html = "";
      var n = 0;
      (data.groups || []).forEach(function (group, g) {
        if (!group.items || group.items.length === 0) {
          return;
        }
        var gid = id + "-g" + g;
        html += '<p class="ncss-livesearch-group" id="' + gid + '">' + escapeHtml(group.label || "") + "</p>";
        html += '<ul class="ncss-livesearch-list" role="group" aria-labelledby="' + gid + '">';
        group.items.forEach(function (item) {
          html += '<li class="ncss-livesearch-option" role="option" aria-selected="false" id="' + id + "-o" + n++ + '">' +
            '<a href="' + escapeHtml(item.url) + '" tabindex="-1"><span class="ncss-livesearch-title">' + highlight(item.title || "", query) + "</span>" +
            (item.text ? '<span class="ncss-livesearch-text">' + highlight(item.text, query) + "</span>" : "") + "</a></li>";
        });
        html += "</ul>";
      });
      if (n === 0) {
        html = '<p class="ncss-livesearch-empty">' + escapeHtml(text("empty").replace("{q}", query)) + "</p>";
      } else if (data.all) {
        html += '<p class="ncss-livesearch-footer"><a href="' + escapeHtml(data.all) + '">' + escapeHtml(text("all")) + "</a></p>";
      }
      box.innerHTML = html;
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
      options = Array.prototype.slice.call(box.querySelectorAll('[role="option"]'));
      active = -1;
      status.textContent = n === 0 ? text("none") : text("status").replace("{n}", n);
    }
    // Client-Modus: komplette Liste einmal laden, dann hier filtern (alle Begriffe müssen
    // in Titel oder Text vorkommen).
    function filter(data, query) {
      var list = terms(query);
      return {
        all: data.all,
        groups: (data.groups || []).map(function (group) {
          return {
            label: group.label,
            items: (group.items || []).filter(function (item) {
              var hay = ((item.title || "") + " " + (item.text || "")).toLowerCase();
              return list.every(function (t) { return hay.indexOf(t) !== -1; });
            })
          };
        })
      };
    }
    function load(url) {
      if (controller) {
        controller.abort();
      }
      controller = new AbortController();
      form.setAttribute("aria-busy", "true");
      return fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
        .then(function (response) { return response.ok ? response.json() : Promise.reject(response.status); })
        .finally(function () { form.removeAttribute("aria-busy"); });
    }
    function search() {
      var query = input.value.trim();
      if (query.length < min) {
        close();
        return;
      }
      if (clientMode) {
        (dataset ? Promise.resolve(dataset) : load(endpoint).then(function (d) { dataset = d; return d; }))
          .then(function (d) { if (input.value.trim() === query) { render(filter(d, query), query); } })
          .catch(function () {});
        return;
      }
      if (cache[query]) {
        render(cache[query], query);
        return;
      }
      var url = endpoint + (endpoint.indexOf("?") < 0 ? "?" : "&") + encodeURIComponent(param) + "=" + encodeURIComponent(query);
      load(url)
        .then(function (data) {
          cache[query] = data;
          if (input.value.trim() === query) {
            render(data, query);
          }
        })
        .catch(function () {});
    }

    input.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(search, delay);
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (box.hidden) {
          search();
          return;
        }
        select(Math.min(active + 1, options.length - 1));
      } else if (event.key === "ArrowUp" && !box.hidden) {
        event.preventDefault();
        select(Math.max(active - 1, -1));
      } else if (event.key === "Enter" && !box.hidden && active >= 0 && options[active]) {
        event.preventDefault();
        options[active].querySelector("a").click();
      } else if (event.key === "Escape" && !box.hidden) {
        // nur die Liste schließen, nicht einen umgebenden <dialog>
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    });
    document.addEventListener("click", function (event) {
      if (!form.contains(event.target)) {
        close();
      }
    });
  }

  function initAll() {
    document.querySelectorAll("[data-ncss-livesearch]").forEach(init);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
