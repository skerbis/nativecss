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
 *   status-text="{n} Treffer"  Ansage der Trefferzahl, Default nach <html lang>
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
    de: { status: "{n} Treffer, mit Pfeiltasten auswählen", list: "Befehle" },
    en: { status: "{n} results, use arrow keys to choose", list: "Commands" }
  };
  var lang = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  var isApple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var counter = 0;

  function norm(value) {
    return String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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
          ensureId(item, "ncss-command-item");
          item.setAttribute("role", "option");
          item.setAttribute("aria-selected", "false");
          item.tabIndex = -1;
          item._ncssText = norm(item.textContent + " " + (item.getAttribute("data-keywords") || ""));
        });

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
