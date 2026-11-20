/**
 * ncss - <ncss-command-palette>: Befehlspalette (siehe components/command-palette.css für
 * Markup). Light-DOM-Custom-Element ohne Shadow Root um einen <dialog class="ncss-command">.
 * Filtert die .ncss-command-item-Einträge im Markup (Text + data-keywords, Groß-/Klein-
 * schreibung und Akzente egal, alle Begriffe müssen vorkommen), blendet leere Gruppen aus,
 * zeigt .ncss-command-empty bei 0 Treffern und sagt die Trefferzahl per Live-Region an.
 *
 * WAI-ARIA Combobox + Listbox (wie js/livesearch.js): Fokus bleibt im Eingabefeld,
 * aria-activedescendant zeigt auf die gewählte Option.
 * Tastatur: Pfeil runter/hoch (springt am Ende um), Pos1/Ende mit Strg, Enter führt die
 * gewählte Option aus (Link folgt seinem href, Button wird geklickt), Esc schließt (nativer
 * <dialog>). Mausbewegung über die Liste wählt mit.
 *
 * Attribute am Element:
 *   shortcut="k"   opt-in Tastenkürzel: ⌘K auf Apple-Geräten, sonst Strg+K (öffnet/schließt)
 *   slash          zusätzlich "/" als Kürzel (nur wenn gerade kein Eingabefeld Fokus hat)
 *   status-text="{n} Treffer"  Ansage der Trefferzahl, Default nach <html lang>
 *   src="suche.json"  opt-in SUCHMODUS für große Listen: die Einträge kommen aus einer
 *                  JSON-Datei (beim ersten Öffnen geladen, kein Server nötig) und werden
 *                  erst beim Tippen gerendert - gerankt, je Gruppe begrenzt, Treffer mit
 *                  <mark> hervorgehoben. Format:
 *                    { "groups": [{ "id": "pages", "label": "Seiten" }, ...],
 *                      "items":  [{ "g": "pages", "t": "Titel", "u": "de/seite.html#anker",
 *                                   "h": "Hinweis rechts", "s": "Textauszug", "k": "Stichwörter" }] }
 *                  "u" gilt relativ zur JSON-Datei (dieselbe Liste funktioniert von jeder
 *                  Seite aus). Einträge im Markup bleiben erhalten (z.B. als Vorschläge bei
 *                  leerem Feld und als Inhalt ohne JS).
 *   limit="8"      Suchmodus: höchstens so viele Treffer je Gruppe (Default 8)
 * Elemente mit [data-ncss-command-key] (z.B. das <kbd> im Öffnen-Button) bekommen den
 * passenden Kürzel-Text ("⌘K" bzw. "Strg K"/"Ctrl K").
 *
 * Events (am Element, bubbeln):
 *   ncss-command-select { item }  cancelable - preventDefault() hält die Palette offen und
 *                                 unterdrückt die Standardaktion (Link/Button)
 *   ncss-command-show / ncss-command-hide
 * Öffentlich: el.show(), el.hide(), el.toggle(), el.filter(text)
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Öffnet den Dialog bei fehlendem nativen
 * command/commandfor selbst (eigener Klick-Listener, nur für Buttons, die auf DIESEN
 * Dialog zeigen) - js/command-fallback.js ist dafür nicht nötig. Ohne customElements oder
 * HTMLDialogElement wird nichts registriert (Element bleibt :not(:defined), alle Einträge
 * bleiben normale Links/Buttons).
 */
(function () {
  "use strict";

  if (!window.customElements || typeof window.HTMLDialogElement !== "function" ||
      customElements.get("ncss-command-palette")) {
    return;
  }

  var TEXTS = {
    de: { status: "{n} Treffer, mit Pfeiltasten auswählen", list: "Befehle", ctrl: "Strg" },
    en: { status: "{n} results, use arrow keys to choose", list: "Commands", ctrl: "Ctrl" }
  };
  var lang = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  var isApple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var counter = 0;

  function norm(value) {
    return String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  function esc(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // Markiert jedes Vorkommen der Suchbegriffe (Groß-/Kleinschreibung egal) mit <mark>.
  function highlight(text, terms) {
    var html = esc(text);
    terms.forEach(function (t) {
      if (t.length < 2) return;
      var re = new RegExp("(" + esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      html = html.replace(/(<[^>]*>)|([^<]+)/g, function (m, tag, txt) {
        return tag || txt.replace(re, "<mark>$1</mark>");
      });
    });
    return html;
  }
  function ensureId(el, prefix) {
    if (!el.id) {
      el.id = prefix + "-" + ++counter;
    }
    return el.id;
  }

  customElements.define(
    "ncss-command-palette",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) {
          // Erneut verbunden (per JS verschoben, z.B. REDAXO-Slice nach oben/unten, htmx
          // hx-preserve): disconnectedCallback() hat die document-Listener entfernt - hier
          // wieder anhängen statt die Palette tot zurückzulassen.
          if (this._onContent) document.addEventListener("ncss-content-change", this._onContent);
          if (this._onKey) document.addEventListener("keydown", this._onKey);
          if (this._onDocClick) document.addEventListener("click", this._onDocClick);
          if (this._mo && this._dialog) this._mo.observe(this._dialog, { attributes: true, attributeFilter: ["open"] });
          return;
        }
        var dialog = this.querySelector("dialog");
        var input = dialog && dialog.querySelector(".ncss-command-input");
        var list = dialog && dialog.querySelector(".ncss-command-list");
        if (!input || !list) {
          return;
        }
        this._ready = true;
        this._dialog = dialog;
        this._input = input;
        this._list = list;
        this._empty = dialog.querySelector(".ncss-command-empty");
        this._active = null;
        var self = this;

        ensureId(dialog, "ncss-command");
        ensureId(list, "ncss-command-list");
        list.setAttribute("role", "listbox");
        if (!list.hasAttribute("aria-label") && !list.hasAttribute("aria-labelledby")) {
          list.setAttribute("aria-label", TEXTS[lang].list);
        }
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-controls", list.id);
        input.setAttribute("aria-expanded", "true");
        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("spellcheck", "false");

        this._status = document.createElement("p");
        this._status.className = "ncss-command-status";
        this._status.setAttribute("role", "status");
        dialog.appendChild(this._status);

        list.querySelectorAll(".ncss-command-group").forEach(function (group) {
          group.setAttribute("role", "group");
          var label = group.querySelector(".ncss-command-group-label");
          if (label && !group.hasAttribute("aria-label")) {
            group.setAttribute("aria-labelledby", ensureId(label, "ncss-command-label"));
          }
        });
        this._items().forEach(function (item) {
          self._prepare(item);
        });
        // Tastenkürzel-Beschriftungen (auch außerhalb der Palette, z.B. im Such-Button der
        // Kopfleiste) - beim Start UND für später eingefügte Beschriftungen nach einem
        // "ncss-content-change"-Event (htmx, fetch+innerHTML, siehe js/content-observer.js).
        this._labelKeys = function (root) {
          if (!root || !root.querySelectorAll) {
            return;
          }
          var key = (self.getAttribute("shortcut") || "k").toUpperCase();
          var els = Array.prototype.slice.call(root.querySelectorAll("[data-ncss-command-key]"));
          if (root.matches && root.matches("[data-ncss-command-key]")) {
            els.unshift(root);
          }
          els.forEach(function (el) {
            el.textContent = isApple ? "⌘" + key : TEXTS[lang].ctrl + " " + key;
          });
        };
        this._labelKeys(document);
        this._onContent = function (event) {
          self._labelKeys((event.detail && event.detail.root) || document);
        };
        document.addEventListener("ncss-content-change", this._onContent);

        input.addEventListener("input", function () {
          self.filter(input.value);
        });
        input.addEventListener("keydown", function (event) {
          if (event.isComposing) {
            return;
          }
          var visible = self._visible();
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!visible.length) {
              return;
            }
            var i = visible.indexOf(self._active) + (event.key === "ArrowDown" ? 1 : -1);
            self._select(visible[(i + visible.length) % visible.length], true);
          } else if ((event.key === "Home" || event.key === "End") && event.ctrlKey) {
            event.preventDefault();
            self._select(event.key === "Home" ? visible[0] : visible[visible.length - 1], true);
          } else if (event.key === "Enter" && self._active) {
            event.preventDefault();
            self._active.click();
          }
        });
        list.addEventListener("pointermove", function (event) {
          var item = event.target.closest(".ncss-command-item");
          if (item && item !== self._active) {
            self._select(item, false);
          }
        });
        // Klick auf einen Eintrag nimmt dem Eingabefeld nicht den Fokus
        list.addEventListener("mousedown", function (event) {
          if (event.target.closest(".ncss-command-item")) {
            event.preventDefault();
          }
        });
        // Ausführen: Standardaktion (Link/Button) läuft weiter, die Palette schließt -
        // gilt für Maus-Klick UND für Enter (das ein .click() auslöst).
        list.addEventListener("click", function (event) {
          var item = event.target.closest(".ncss-command-item");
          if (!item) {
            return;
          }
          var ok = self.dispatchEvent(new CustomEvent("ncss-command-select", {
            bubbles: true, cancelable: true, detail: { item: item }
          }));
          if (!ok) {
            event.preventDefault();
            return;
          }
          dialog.close();
        });

        // Öffnen erkennen (egal ob über command, Script oder Kürzel) - MutationObserver auf
        // [open] statt "toggle"-Event, das ältere Engines am <dialog> noch nicht feuern.
        this._mo = new MutationObserver(function () {
          if (dialog.open) {
            input.value = "";
            self._load();
            self.filter("");
            input.focus();
            self.dispatchEvent(new CustomEvent("ncss-command-show", { bubbles: true }));
          }
        });
        this._mo.observe(dialog, { attributes: true, attributeFilter: ["open"] });
        dialog.addEventListener("close", function () {
          self.dispatchEvent(new CustomEvent("ncss-command-hide", { bubbles: true }));
        });

        // Klick auf den Backdrop schließt - dort, wo closedby="any" noch nicht greift.
        dialog.addEventListener("click", function (event) {
          if (event.target !== dialog) {
            return;
          }
          var r = dialog.getBoundingClientRect();
          if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) {
            dialog.close();
          }
        });

        // Eigener command/commandfor-Ersatz NUR für diesen Dialog (siehe Kopfkommentar).
        if (!("command" in HTMLButtonElement.prototype)) {
          this._onDocClick = function (event) {
            var btn = event.target.closest && event.target.closest("button[commandfor]");
            if (!btn || btn.getAttribute("commandfor") !== dialog.id) {
              return;
            }
            var command = btn.getAttribute("command");
            if (command === "show-modal") {
              self.show();
            } else if (command === "close") {
              self.hide();
            }
          };
          document.addEventListener("click", this._onDocClick);
        }

        this._onKey = function (event) {
          if (event.key === "/" && self.hasAttribute("slash") && !dialog.open && !event.metaKey && !event.ctrlKey && !event.altKey) {
            var t = event.target;
            if (!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) {
              event.preventDefault();
              self.show();
            }
            return;
          }
          var key = self.getAttribute("shortcut");
          if (!key || !event.key || event.key.toLowerCase() !== key.toLowerCase() || event.altKey || event.shiftKey) {
            return;
          }
          if (!(isApple ? event.metaKey : event.ctrlKey)) {
            return;
          }
          event.preventDefault();
          self.toggle();
        };
        document.addEventListener("keydown", this._onKey);

        this.filter("");
      }

      disconnectedCallback() {
        if (this._onContent) {
          document.removeEventListener("ncss-content-change", this._onContent);
        }
        if (this._mo) {
          this._mo.disconnect();
        }
        if (this._onKey) {
          document.removeEventListener("keydown", this._onKey);
        }
        if (this._onDocClick) {
          document.removeEventListener("click", this._onDocClick);
        }
      }

      show() {
        if (this._dialog && !this._dialog.open) {
          this._dialog.showModal();
        }
      }
      hide() {
        if (this._dialog && this._dialog.open) {
          this._dialog.close();
        }
      }
      toggle() {
        if (this._dialog && this._dialog.open) {
          this.hide();
        } else {
          this.show();
        }
      }

      filter(query) {
        if (!this._list) {
          return 0;
        }
        var terms = norm(query || "").trim().split(/\s+/).filter(Boolean);
        this._renderResults(query || "", terms);
        this._items().forEach(function (item) {
          item.hidden = !terms.every(function (t) { return item._ncssText.indexOf(t) !== -1; });
        });
        this._list.querySelectorAll(".ncss-command-group").forEach(function (group) {
          group.hidden = !group.querySelector(".ncss-command-item:not([hidden])");
        });
        this._list.hidden = false;
        var visible = this._visible();
        if (this._empty) {
          this._empty.hidden = visible.length > 0;
        }
        this._list.hidden = visible.length === 0;
        this._input.setAttribute("aria-expanded", String(visible.length > 0));
        this._select(visible[0], false);
        this._list.scrollTop = 0;
        // Ansage erst bei echter Eingabe, nicht schon beim Öffnen (dort liest der
        // Screenreader ohnehin Dialog + Feld vor).
        this._status.textContent = terms.length
          ? (this.getAttribute("status-text") || TEXTS[lang].status).replace("{n}", visible.length)
          : "";
        return visible.length;
      }

      _prepare(item) {
        ensureId(item, "ncss-command-item");
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        item.tabIndex = -1;
        item._ncssText = norm(item.textContent + " " + (item.getAttribute("data-keywords") || ""));
      }

      // Suchmodus: JSON einmalig laden, danach die aktuelle Eingabe neu filtern.
      _load() {
        var src = this.getAttribute("src");
        if (!src || this._data || this._loading || !window.fetch) {
          return;
        }
        var self = this;
        var url = new URL(src, document.baseURI);
        this._loading = true;
        fetch(url)
          .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
          })
          .then(function (data) {
            data.items.forEach(function (it) {
              // Titel ohne führenden Punkt/spitze Klammern: ".ncss-card" und "<ncss-x>"
              // zählen bei der Eingabe "ncss-card" als exakter Treffer.
              it._n = norm(it.t).replace(/^[.<]+|>$/g, "");
              it._all = norm(it.t + " " + (it.k || "") + " " + (it.h || "") + " " + (it.s || ""));
              it._url = new URL(it.u, url).href;
            });
            self._data = data;
            if (self._dialog.open) self.filter(self._input.value);
          })
          .catch(function (err) {
            if (window.console) window.console.error("[ncss-command-palette]", err);
          })
          .then(function () {
            self._loading = false;
          });
      }

      // Trefferliste aus den JSON-Einträgen: Rang = Titel beginnt mit Begriff > Titel
      // enthält ihn > nur Stichwörter/Text; je Gruppe höchstens "limit" Einträge.
      _renderResults(query, terms) {
        if (!this._data) {
          return;
        }
        if (!this._results) {
          this._results = document.createElement("div");
          this._results.className = "ncss-command-results";
          this._list.insertBefore(this._results, this._list.firstChild);
        }
        this._results.textContent = "";
        if (!terms.length) {
          this._results.hidden = true;
          return;
        }
        this._results.hidden = false;
        var limit = parseInt(this.getAttribute("limit"), 10) || 8;
        var rawTerms = query.trim().split(/\s+/).filter(Boolean);
        var self = this;
        var boxes = [];
        this._data.groups.forEach(function (group, order) {
          var hits = [];
          self._data.items.forEach(function (it) {
            if (it.g !== group.id) return;
            if (!terms.every(function (t) { return it._all.indexOf(t) !== -1; })) return;
            var score = 0;
            terms.forEach(function (t) {
              t = t.replace(/^[.<]+|>$/g, "");
              if (it._n.indexOf(t) === 0) score += 4;
              else if (it._n.indexOf(t) !== -1) score += 2;
            });
            if (it._n === terms.join(" ").replace(/^[.<]+|>$/g, "")) score += 6;
            hits.push({ it: it, score: score });
          });
          if (!hits.length) return;
          hits.sort(function (a, b) { return b.score - a.score || a.it.t.length - b.it.t.length; });
          var best = hits[0].score;
          var box = document.createElement("div");
          box.className = "ncss-command-group";
          box.setAttribute("role", "group");
          var label = document.createElement("p");
          label.className = "ncss-command-group-label";
          label.textContent = group.label;
          box.setAttribute("aria-labelledby", ensureId(label, "ncss-command-label"));
          box.appendChild(label);
          hits.slice(0, limit).forEach(function (h) {
            var a = document.createElement("a");
            a.className = "ncss-command-item";
            a.href = h.it._url;
            a.innerHTML =
              '<span class="ncss-command-item-body"><span class="ncss-command-item-title">' + highlight(h.it.t, rawTerms) + "</span>" +
              (h.it.s ? '<span class="ncss-command-item-snippet">' + highlight(h.it.s, rawTerms) + "</span>" : "") +
              "</span>" + (h.it.h ? '<span class="ncss-command-item-hint">' + esc(h.it.h) + "</span>" : "");
            box.appendChild(a);
            self._prepare(a);
            a._ncssText = h.it._all;
          });
          boxes.push({ box: box, best: best, order: order });
        });
        // Gruppe mit dem besten Treffer zuerst (z.B. "ncss-card" -> Klassen vor Abschnitten),
        // bei Gleichstand die Reihenfolge aus der JSON-Datei.
        boxes.sort(function (a, b) { return b.best - a.best || a.order - b.order; });
        boxes.forEach(function (b) { self._results.appendChild(b.box); });
      }

      _items() {
        return Array.prototype.slice.call(this._list.querySelectorAll(".ncss-command-item"));
      }
      _visible() {
        return this._items().filter(function (item) {
          return !item.hidden && !item.closest("[hidden]");
        });
      }
      _select(item, scroll) {
        if (this._active) {
          this._active.setAttribute("aria-selected", "false");
        }
        this._active = item || null;
        if (this._active) {
          this._active.setAttribute("aria-selected", "true");
          this._input.setAttribute("aria-activedescendant", this._active.id);
          if (scroll) {
            this._active.scrollIntoView({ block: "nearest" });
          }
        } else {
          this._input.removeAttribute("aria-activedescendant");
        }
      }
    }
  );
})();
