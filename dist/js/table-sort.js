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
 * Dezimaltrenner nach dem nächsten [lang]: de "," / en "."), "date", wenn alle
 * Datumsangaben sind (ISO 2026-11-20, auch mit Uhrzeit und Zeitzone, 20.11.2026, 9:30,
 * <time datetime>), sonst "text" (Intl.Collator in der Seitensprache, "Zimmer 2" vor
 * "Zimmer 10"). Leere Zellen landen immer am Ende.
 *
 * Attribute am <th>: data-sort="false" (Spalte nicht sortierbar), data-sort-type,
 *   data-sort-default="descending", data-sort-align="end" (Schaltfläche rechtsbündig),
 *   aria-sort="ascending|descending" im Markup = Tabelle ist bereits so sortiert (nur
 *   Zustand übernehmen, nichts umstellen).
 * Attribute am Element bzw. an der <table>: data-label-sorted="Sortiert nach {column},
 *   {direction}", data-label-ascending, data-label-descending, data-label-hint (Zusatz für
 *   die <caption>, nur für Screenreader; leer = keiner).
 * Events (bubbeln, am Element bzw. an der <table>): ncss-table-sort-change
 *   { column, index, direction, type }
 * Öffentlich (nur <ncss-table-sort>): el.sort(spaltenIndex, "ascending"|"descending")
 *
 * Dynamische Inhalte: <ncss-table-sort> initialisiert sich selbst; neu eingefügte
 * <table data-ncss-sort> werden bei "ncss-content-change" (detail.root) erkannt. Jede
 * Tabelle wird nur einmal aufbereitet. Aufbereitete Tabellen tragen die Klasse is-sortable.
 *
 * Abhängigkeiten: keine anderen ncss-Scripts, kein CSS-Token zwingend (components/
 * table-sort.css hat Rückfallwerte). Ohne customElements funktioniert data-ncss-sort
 * trotzdem; ohne JavaScript bleibt die Tabelle eine normale Tabelle.
 */
(function () {
  "use strict";

  const TEXTS = {
    de: { sorted: "Sortiert nach {column}, {direction}", ascending: "aufsteigend", descending: "absteigend", hint: "Spalten mit Schaltfläche im Kopf sind sortierbar" },
    en: { sorted: "Sorted by {column}, {direction}", ascending: "ascending", descending: "descending", hint: "column headers with buttons are sortable" }
  };
  const seen = new WeakSet();
  const make = (tag, cls) => Object.assign(document.createElement(tag), { className: cls });
  const langOf = (el) => ((el.closest("[lang]") || document.documentElement).getAttribute("lang") || "de").slice(0, 2).toLowerCase();

  // Rohwert einer Zelle (vor der Typ-Umwandlung).
  function rawValue(cell) {
    if (!cell) {
      return "";
    }
    const own = cell.getAttribute("data-sort-value");
    const time = cell.querySelector("time[datetime]");
    return (own ?? (time ? time.getAttribute("datetime") : cell.textContent)).replace(/\s+/g, " ").trim();
  }

  // Zahl erkennen: optionale Währung/Einheit drumherum, Tausender- und Dezimaltrenner nach
  // Sprache. Liefert NaN, wenn es keine Zahl ist.
  function toNumber(text, lang) {
    let core = text
      .replace(/^(?:[A-Z]{3}\s|[^\d\p{L}\s+\-−.,]{1,2})?\s*/u, "")   // "€ ", "$", "CHF "
      .replace(/\s*(?:%|‰|[\p{L}€$£¥]{1,5}\.?)$/u, "")              // " %", " €", " kg", " Std."
      .replace(/[\s  ']/g, "")                                     // Leerzeichen, 1'000
      .replace("−", "-");
    // Tausendergruppen haben genau drei Ziffern - "20.11.2026" ist also KEINE Zahl.
    if (!/^[+-]?(\d{1,3}([.,]\d{3})+|\d+)([.,]\d+)?$|^[+-]?[.,]\d+$/.test(core)) {
      return NaN;
    }
    const commas = core.split(",").length - 1;
    const dots = core.split(".").length - 1;
    let decimal = "";
    if (commas && dots) {
      // Beide Zeichen: das letzte ist der Dezimaltrenner - unabhängig von der Sprache.
      decimal = core.lastIndexOf(",") > core.lastIndexOf(".") ? "," : ".";
    } else if (commas + dots === 1) {
      // "1,5" ist eindeutig dezimal; "1.234" / "1,234" ist mehrdeutig -> Seitensprache.
      decimal = /[.,]\d{3}$/.test(core) ? (lang === "de" ? "," : ".") : commas ? "," : ".";
    }
    const thousands = decimal === "," ? "." : decimal === "." ? "," : (core.match(/[.,]/) || [""])[0];
    if (thousands) {
      core = core.split(thousands).join("");
    }
    return parseFloat(decimal ? core.replace(decimal, ".") : core);
  }

  // Datum erkennen: ISO (auch mit Uhrzeit/Zeitzone), deutsches TT.MM.JJJJ (optional HH:MM)
  // oder reine Uhrzeit HH:MM.
  function toDate(text) {
    let m = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
    if (m) {
      const parsed = /[T ]\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/.test(text) ? Date.parse(text) : NaN;
      return isNaN(parsed) ? Date.UTC(m[1], m[2] - 1, m[3] || 1, m[4] || 0, m[5] || 0, m[6] || 0) : parsed;
    }
    m = /^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})(?:,?\s+(\d{1,2}):(\d{2}))?/.exec(text);
    if (m) {
      return Date.UTC(m[3] < 100 ? 2000 + +m[3] : m[3], m[2] - 1, m[1], m[4] || 0, m[5] || 0);
    }
    m = /^(\d{1,2}):(\d{2})$/.exec(text);
    return m ? m[1] * 60 + +m[2] : NaN;
  }

  function detectType(values, lang) {
    const filled = values.filter((v) => v !== "");
    return !filled.length ? "text"
      : filled.every((v) => !isNaN(toNumber(v, lang))) ? "number"
      : filled.every((v) => !isNaN(toDate(v))) ? "date" : "text";
  }

  function enhance(table, host) {
    const headRow = table.tHead && table.tHead.rows[table.tHead.rows.length - 1];
    if (seen.has(table) || !headRow || !table.tBodies.length) {
      return;
    }
    seen.add(table);
    host = host || table;
    const lang = langOf(table) === "en" ? "en" : "de";
    const t = (key) => host.getAttribute("data-label-" + key) ?? TEXTS[lang][key];
    const collator = new Intl.Collator(langOf(table), { numeric: true, sensitivity: "base" });
    const headers = Array.from(headRow.cells);
    const buttons = [];
    let current = -1;
    let currentDir = "";

    // Live-Region direkt hinter der Tabelle (bzw. im Element) - bewusst NICHT in der
    // <caption>, sonst würde der Tabellenname bei jedem Sortieren mitgelesen.
    const status = make("span", "ncss-table-sort-status");
    status.setAttribute("role", "status");
    table.after(status);
    const hint = t("hint");
    if (table.caption && hint) {
      table.caption.append(Object.assign(make("span", "ncss-table-sort-status"), { textContent: ", " + hint }));
    }

    // Spaltenposition je Kopfzelle (colspan vor der Zelle berücksichtigen).
    let col = 0;
    const columnOf = headers.map((th) => (col += th.colSpan || 1) - (th.colSpan || 1));
    function cellAt(row, column) {
      let c = 0;
      for (const cell of row.cells) {
        if (c === column) {
          return cell;
        }
        c += cell.colSpan || 1;
        if (c > column) {
          return null;
        }
      }
      return null;
    }

    function sort(i, direction, announce) {
      const th = headers[i];
      if (!buttons[i]) {
        return;
      }
      const sign = direction === "descending" ? -1 : 1;
      let kind = "text";
      for (const body of table.tBodies) {
        const rows = Array.from(body.rows);
        const raws = rows.map((row) => rawValue(cellAt(row, columnOf[i])));
        kind = th.getAttribute("data-sort-type") || detectType(raws, lang);
        const keyed = rows.map((row, index) => {
          const raw = raws[index];
          let value = raw === "" ? null : kind === "number" ? toNumber(raw, lang) : kind === "date" ? toDate(raw) : raw;
          if (kind !== "text" && Number.isNaN(value)) {
            value = null;
          }
          return { row, value, index };
        });
        keyed.sort((a, b) => {
          // Leere Werte immer ans Ende, in beiden Richtungen; stabil bei Gleichstand.
          if (a.value === null || b.value === null) {
            return (a.value === null) - (b.value === null) || a.index - b.index;
          }
          const diff = kind === "text" ? collator.compare(a.value, b.value) : a.value - b.value;
          return diff * sign || a.index - b.index;
        });
        body.append(...keyed.map((entry) => entry.row));
      }
      current = i;
      currentDir = direction;
      headers.forEach((other, k) => {
        if (k === i) {
          other.setAttribute("aria-sort", direction);
        } else if (buttons[k]) {
          other.removeAttribute("aria-sort");
        }
      });
      const name = buttons[i].textContent.trim();
      if (announce) {
        // Erst leeren, dann setzen: dieselbe Ansage zweimal hintereinander wird sonst verschluckt.
        status.textContent = "";
        const text = t("sorted").replace("{column}", name).replace("{direction}", t(direction));
        setTimeout(() => { status.textContent = text; }, 50);
      }
      host.dispatchEvent(new CustomEvent("ncss-table-sort-change", {
        bubbles: true,
        detail: { column: name, index: i, direction, type: kind }
      }));
    }

    headers.forEach((th, i) => {
      if (th.getAttribute("data-sort") === "false" || !th.textContent.trim()) {
        return;
      }
      const button = make("button", "ncss-table-sort-button");
      button.type = "button";
      button.append(...th.childNodes);
      button.append(make("span", "ncss-table-sort-icon"));
      button.lastChild.setAttribute("aria-hidden", "true");
      th.append(button);
      buttons[i] = button;
      const preset = th.getAttribute("aria-sort");
      if (preset === "ascending" || preset === "descending") {
        current = i;
        currentDir = preset;
      } else {
        th.removeAttribute("aria-sort");
      }
      button.addEventListener("click", () => {
        sort(i, current === i
          ? (currentDir === "ascending" ? "descending" : "ascending")
          : (th.getAttribute("data-sort-default") === "descending" ? "descending" : "ascending"), true);
      });
    });
    table.classList.add("is-sortable");
    host._ncssSort = (i, direction) => sort(i, direction === "descending" ? "descending" : "ascending", true);
  }

  function scan(root) {
    if (root && root.querySelectorAll) {
      if (root.matches && root.matches("table[data-ncss-sort]")) {
        enhance(root);
      }
      root.querySelectorAll("table[data-ncss-sort]").forEach((table) => enhance(table));
    }
  }

  if (window.customElements && !customElements.get("ncss-table-sort")) {
    customElements.define("ncss-table-sort", class extends HTMLElement {
      connectedCallback() {
        const table = this.querySelector("table");
        if (table) {
          enhance(table, this);
        } else if (!this._waiting) {
          // Tabelle wird evtl. erst nach dem Element geparst/eingefügt.
          this._waiting = true;
          new MutationObserver((records, observer) => {
            const found = this.querySelector("table");
            if (found && found.tHead && found.tBodies.length) {
              observer.disconnect();
              enhance(found, this);
            }
          }).observe(this, { childList: true, subtree: true });
        }
      }
      sort(index, direction) {
        if (this._ncssSort) {
          this._ncssSort(index, direction);
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(document));
  } else {
    scan(document);
  }
  document.addEventListener("ncss-content-change", (event) => scan((event.detail && event.detail.root) || document));
})();
