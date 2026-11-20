/**
 * ncss - Sortierbare Tabelle: <ncss-table-sort> um eine <table> ODER data-ncss-sort direkt
 * an der <table> (siehe components/table-sort.css für Markup). Muster: WAI-ARIA APG
 * "Sortable Table" - der Inhalt jedes sortierbaren Spaltenkopfs wird in einen <button>
 * gelegt, aria-sort steht NUR am gerade sortierten <th> ("ascending"/"descending"; ohne
 * Attribut = "none", so empfiehlt es die ARIA-Spezifikation: höchstens ein Kopf zur Zeit).
 *
 * Sortiert wird je <tbody> für sich, STABIL (gleiche Werte behalten ihre Reihenfolge, auch
 * absteigend). Erster Klick: aufsteigend (data-sort-default="descending" am <th> dreht das
 * um), jeder weitere Klick wechselt die Richtung.
 *
 * Wert einer Zelle: data-sort-value="…" > <time datetime> in der Zelle > sichtbarer Text.
 * Typ je Spalte: data-sort-type="number|date|text" am <th>, sonst automatisch erkannt -
 * "number", wenn ALLE nicht leeren Zellen Zahlen sind (auch "1.234,50 €", "12 %", "-3";
 * Dezimaltrenner nach <html lang>: de "," / en "."), "date", wenn alle Datumsangaben sind
 * (ISO 2026-11-20, 20.11.2026, <time datetime>), sonst "text" (Intl.Collator in der
 * Seitensprache, "Zimmer 2" vor "Zimmer 10"). Leere Zellen landen immer am Ende.
 *
 * Attribute am <th>: data-sort="false" (Spalte nicht sortierbar), data-sort-type,
 *   data-sort-default="descending", aria-sort="ascending|descending" im Markup = Tabelle
 *   ist bereits so sortiert (nur Zustand übernehmen, nichts umstellen).
 * Attribute am Element bzw. an der <table>: data-label-sorted="Sortiert nach {column},
 *   {direction}", data-label-ascending, data-label-descending, data-label-hint (Zusatz für
 *   die <caption>, nur für Screenreader; leer = keiner).
 * Events (bubbeln, am Element bzw. an der <table>): ncss-table-sort-change
 *   { column, index, direction, type }
 * Öffentlich (nur <ncss-table-sort>): el.sort(spaltenIndex, "ascending"|"descending")
 *
 * Dynamische Inhalte: <ncss-table-sort> initialisiert sich selbst; neu eingefügte
 * <table data-ncss-sort> werden bei "ncss-content-change" (detail.root) erkannt. Jede
 * Tabelle wird nur einmal aufbereitet (WeakSet).
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements funktioniert
 * data-ncss-sort trotzdem; ohne JavaScript bleibt die Tabelle eine normale Tabelle.
 */
(function () {
  "use strict";

  if (typeof WeakSet === "undefined" || !document.querySelectorAll) {
    return;
  }

  var TEXTS = {
    de: {
      sorted: "Sortiert nach {column}, {direction}",
      ascending: "aufsteigend",
      descending: "absteigend",
      hint: "Spalten mit Schaltfläche im Kopf sind sortierbar"
    },
    en: {
      sorted: "Sorted by {column}, {direction}",
      ascending: "ascending",
      descending: "descending",
      hint: "column headers with buttons are sortable"
    }
  };
  var seen = new WeakSet();

  function langOf(el) {
    var host = el.closest("[lang]") || document.documentElement;
    return (host.getAttribute("lang") || "de").slice(0, 2).toLowerCase();
  }

  // Rohwert einer Zelle (vor der Typ-Umwandlung).
  function rawValue(cell) {
    if (!cell) return "";
    if (cell.hasAttribute("data-sort-value")) return cell.getAttribute("data-sort-value").trim();
    var time = cell.querySelector("time[datetime]");
    if (time) return time.getAttribute("datetime").trim();
    return (cell.textContent || "").replace(/\s+/g, " ").trim();
  }

  // Zahl erkennen: optionale Währung/Einheit drumherum, Tausender- und Dezimaltrenner nach
  // Sprache. Liefert NaN, wenn es keine Zahl ist.
  function toNumber(text, lang) {
    var core = text
      .replace(/^(?:[A-Z]{3}\s|[^\d\p{L}\s+\-−.,]{1,2})?\s*/u, "")   // "€ ", "$", "CHF "
      .replace(/\s*(?:%|‰|[\p{L}€$£¥]{1,5}\.?)$/u, "")              // " %", " €", " kg", " Std."
      .replace(/[\s  ']/g, "")                            // Leerzeichen, 1'000
      .replace("−", "-");
    // Tausendergruppen haben genau drei Ziffern - "20.11.2026" ist also KEINE Zahl.
    if (!/^[+-]?(\d{1,3}([.,]\d{3})+|\d+)([.,]\d+)?$|^[+-]?[.,]\d+$/.test(core)) return NaN;
    var commas = core.split(",").length - 1;
    var dots = core.split(".").length - 1;
    var decimal = "";
    if (commas && dots) {
      // Beide Zeichen: das letzte ist der Dezimaltrenner - unabhängig von der Sprache.
      decimal = core.lastIndexOf(",") > core.lastIndexOf(".") ? "," : ".";
    } else if (commas + dots === 1) {
      var sep = commas ? "," : ".";
      // "1,5" ist eindeutig dezimal; "1.234" / "1,234" ist mehrdeutig -> Seitensprache.
      decimal = /[.,]\d{3}$/.test(core) ? (lang === "de" ? "," : ".") : sep;
    }
    var thousands = decimal === "," ? "." : decimal === "." ? "," : /[.,]/.test(core) ? core.match(/[.,]/)[0] : "";
    if (thousands) core = core.split(thousands).join("");
    if (decimal) core = core.replace(decimal, ".");
    return parseFloat(core);
  }

  // Datum erkennen: ISO (auch mit Uhrzeit) oder deutsches TT.MM.JJJJ (optional HH:MM).
  function toDate(text) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
    if (m) {
      return Date.UTC(+m[1], +m[2] - 1, +(m[3] || 1), +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    }
    m = /^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})(?:,?\s+(\d{1,2}):(\d{2}))?/.exec(text);
    if (m) {
      var year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
      return Date.UTC(year, +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
    }
    if (/^\d{1,2}:\d{2}$/.test(text)) {
      var p = text.split(":");
      return +p[0] * 60 + +p[1];
    }
    return NaN;
  }

  function detectType(values, lang) {
    var filled = values.filter(function (v) { return v !== ""; });
    if (!filled.length) return "text";
    if (filled.every(function (v) { return !isNaN(toNumber(v, lang)); })) return "number";
    if (filled.every(function (v) { return !isNaN(toDate(v)); })) return "date";
    return "text";
  }

  function enhance(table, host) {
    if (seen.has(table)) return;
    var head = table.tHead;
    var headRow = head && head.rows[head.rows.length - 1];
    if (!headRow || !table.tBodies.length) return;
    seen.add(table);
    host = host || table;

    var lang = langOf(table) === "en" ? "en" : "de";
    var t = function (key) {
      var custom = host.getAttribute("data-label-" + key);
      return custom !== null ? custom : TEXTS[lang][key];
    };
    var collator = window.Intl && Intl.Collator ? new Intl.Collator(langOf(table), { numeric: true, sensitivity: "base" }) : null;
    var headers = Array.prototype.slice.call(headRow.cells);

    // Live-Region direkt hinter der Tabelle (bzw. im Element) - bewusst NICHT in der
    // <caption>, sonst würde der Tabellenname bei jedem Sortieren mitgelesen.
    var status = document.createElement("span");
    status.className = "ncss-table-sort-status";
    status.setAttribute("role", "status");
    table.insertAdjacentElement("afterend", status);

    var hint = t("hint");
    if (table.caption && hint) {
      var hintEl = document.createElement("span");
      hintEl.className = "ncss-table-sort-status";
      hintEl.textContent = ", " + hint;
      table.caption.appendChild(hintEl);
    }

    var state = { index: -1, direction: "" };

    // Spaltenposition je Kopfzelle (colspan vor der Zelle berücksichtigen).
    var columnOf = [];
    var col = 0;
    headers.forEach(function (th, i) {
      columnOf[i] = col;
      col += th.colSpan || 1;
    });

    function cellAt(row, column) {
      var c = 0;
      for (var i = 0; i < row.cells.length; i++) {
        if (c === column) return row.cells[i];
        c += row.cells[i].colSpan || 1;
        if (c > column) return null;
      }
      return null;
    }

    function sort(i, direction, announce) {
      var th = headers[i];
      if (!th || !th._ncssSortButton) return;
      var column = columnOf[i];
      var type = th.getAttribute("data-sort-type");
      Array.prototype.forEach.call(table.tBodies, function (body) {
        var rows = Array.prototype.slice.call(body.rows);
        var raws = rows.map(function (row) { return rawValue(cellAt(row, column)); });
        var kind = type || detectType(raws, lang);
        var keyed = rows.map(function (row, k) {
          var raw = raws[k];
          var value = raw === "" ? null :
            kind === "number" ? toNumber(raw, lang) :
            kind === "date" ? toDate(raw) : raw;
          if (value !== null && kind !== "text" && isNaN(value)) value = null;
          return { row: row, value: value, index: k };
        });
        var sign = direction === "descending" ? -1 : 1;
        keyed.sort(function (a, b) {
          // Leere Werte immer ans Ende, in beiden Richtungen.
          if (a.value === null || b.value === null) {
            if (a.value === b.value) return a.index - b.index;
            return a.value === null ? 1 : -1;
          }
          var diff = kind === "text"
            ? (collator ? collator.compare(a.value, b.value) : (a.value < b.value ? -1 : a.value > b.value ? 1 : 0))
            : a.value - b.value;
          // Stabil: bei Gleichstand entscheidet die bisherige Reihenfolge.
          return diff !== 0 ? diff * sign : a.index - b.index;
        });
        var fragment = document.createDocumentFragment();
        keyed.forEach(function (entry) { fragment.appendChild(entry.row); });
        body.appendChild(fragment);
        th._ncssSortType = kind;
      });
      state.index = i;
      state.direction = direction;
      headers.forEach(function (other) {
        if (other === th) {
          other.setAttribute("aria-sort", direction);
        } else if (other._ncssSortButton) {
          other.removeAttribute("aria-sort");
        }
      });
      var name = th._ncssSortButton.textContent.trim();
      if (announce) {
        status.textContent = "";
        var text = t("sorted").replace("{column}", name).replace("{direction}", t(direction));
        window.setTimeout(function () { status.textContent = text; }, 50);
      }
      host.dispatchEvent(new CustomEvent("ncss-table-sort-change", {
        bubbles: true,
        detail: { column: name, index: i, direction: direction, type: th._ncssSortType }
      }));
    }

    headers.forEach(function (th, i) {
      if (th.getAttribute("data-sort") === "false" || !th.textContent.trim()) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "ncss-table-sort-button";
      while (th.firstChild) button.appendChild(th.firstChild);
      var icon = document.createElement("span");
      icon.className = "ncss-table-sort-icon";
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
      th.appendChild(button);
      th._ncssSortButton = button;
      var preset = th.getAttribute("aria-sort");
      if (preset === "ascending" || preset === "descending") {
        state.index = i;
        state.direction = preset;
      } else {
        th.removeAttribute("aria-sort");
      }
      button.addEventListener("click", function () {
        var direction = state.index === i
          ? (state.direction === "ascending" ? "descending" : "ascending")
          : (th.getAttribute("data-sort-default") === "descending" ? "descending" : "ascending");
        sort(i, direction, true);
      });
    });

    if (host !== table) {
      host._ncssSort = function (i, direction) {
        sort(i, direction === "descending" ? "descending" : "ascending", true);
      };
    }
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches("table[data-ncss-sort]")) enhance(root);
    Array.prototype.forEach.call(root.querySelectorAll("table[data-ncss-sort]"), function (table) {
      enhance(table);
    });
  }

  if (window.customElements && !customElements.get("ncss-table-sort")) {
    customElements.define(
      "ncss-table-sort",
      class extends HTMLElement {
        connectedCallback() {
          var table = this.querySelector("table");
          if (table) {
            enhance(table, this);
          } else if (!this._waiting) {
            // Tabelle wird evtl. erst nach dem Element geparst/eingefügt.
            this._waiting = true;
            var self = this;
            new MutationObserver(function (records, observer) {
              var found = self.querySelector("table");
              if (found && found.tHead && found.tBodies.length) {
                observer.disconnect();
                enhance(found, self);
              }
            }).observe(this, { childList: true, subtree: true });
          }
        }

        sort(index, direction) {
          if (this._ncssSort) this._ncssSort(index, direction);
        }
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { scan(document); });
  } else {
    scan(document);
  }
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
