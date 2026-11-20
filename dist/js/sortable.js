/**
 * ncss - <ncss-sortable>: sortierbare Liste per Ziehen, Tastatur und Hoch/Runter-
 * Schaltflächen (siehe components/sortable.css für Markup). Light-DOM-Custom-Element.
 * Inhalt: eine <ul>/<ol> (oder role="list") - jedes direkte Kind ist ein Eintrag. Das
 * Script legt je Eintrag einen Griff (<button>) vor den Inhalt und zwei Schaltflächen
 * (nach oben/nach unten) dahinter; ein vorhandenes .ncss-sortable-handle im Markup wird
 * übernommen statt neu erzeugt.
 *
 * Tasten (Fokus auf dem Griff):
 *   Leertaste/Enter   aufnehmen bzw. ablegen
 *   Pfeil hoch/links  eine Position nach oben (aufgenommen)
 *   Pfeil runter/rechts  eine Position nach unten (aufgenommen)
 *   Pos1/Ende         an den Anfang/das Ende (aufgenommen)
 *   Esc               abbrechen, Eintrag zurück an die Ausgangsposition
 *   Tab               legt an der aktuellen Position ab und verlässt den Griff
 * Zeiger/Touch: am Griff ziehen (Maus, Stift, Finger - touch-action:none nur am Griff),
 *   Esc während des Ziehens bricht ab.
 * Hoch/Runter-Schaltflächen: ein Klick = eine Position (WCAG 2.5.7, Alternative ohne
 *   Ziehbewegung). Am Anfang/Ende aria-disabled (bleiben fokussierbar, der Fokus geht beim
 *   Erreichen der Kante nicht verloren).
 * Jede Änderung sagt eine Live-Region an, z. B. „Tee, Position 2 von 5.“
 *
 * Attribute am Element:
 *   no-buttons              Hoch/Runter-Schaltflächen weglassen - NUR, wenn die Seite selbst
 *                           eine gleichwertige Alternative ohne Ziehen anbietet
 *   data-label-<schlüssel>="…"  Texte überschreiben ({label}, {pos}, {total} werden ersetzt),
 *                           Schlüssel: handle, up, down, instructions, grabbed, moved,
 *                           dropped, cancelled
 * Am Eintrag: data-id="…" (Wert in detail.order), data-label="…" (Name in Ansagen/
 *   Schaltflächen, sonst der Text des Eintrags).
 * Events (bubbeln, am Element): ncss-sortable-change
 *   { item, from, to, order } - from/to 0-basiert, order = data-id (sonst Name) aller
 *   Einträge in neuer Reihenfolge. Feuert nur, wenn sich die Reihenfolge wirklich ändert.
 * Öffentlich: el.items (Array), el.order (Array), el.move(eintragOderIndex, zielIndex)
 *
 * Bewegung: Nachbarn gleiten per Web Animations an ihren neuen Platz, nur wenn Bewegung
 * erlaubt ist - geprüft werden data-motion="reduce"|"full" an <html> (Vorrang) und
 * prefers-reduced-motion. Web Animations unterliegen NICHT der globalen reduce-Regel aus
 * reset.css, deshalb die eigene Prüfung.
 *
 * Dynamische Inhalte: initialisiert sich selbst (Custom Element). Später per JS
 * angehängte Einträge werden per MutationObserver mit Griff/Schaltflächen versehen.
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements bleibt es eine normale
 * Liste ohne Bedienelemente.
 */
(function () {
  "use strict";

  if (!window.customElements || customElements.get("ncss-sortable")) {
    return;
  }

  var TEXTS = {
    de: {
      handle: "{label} verschieben",
      up: "{label} nach oben",
      down: "{label} nach unten",
      instructions: "Leertaste oder Enter nimmt den Eintrag auf. Dann mit den Pfeiltasten verschieben, mit Leertaste oder Enter ablegen, mit Esc abbrechen.",
      grabbed: "{label} aufgenommen, Position {pos} von {total}. Pfeiltasten verschieben, Leertaste legt ab, Esc bricht ab.",
      moved: "{label}, Position {pos} von {total}.",
      dropped: "{label} abgelegt, Position {pos} von {total}.",
      cancelled: "Verschieben abgebrochen. {label} wieder auf Position {pos} von {total}."
    },
    en: {
      handle: "Move {label}",
      up: "Move {label} up",
      down: "Move {label} down",
      instructions: "Press Space or Enter to pick up the item. Then use the arrow keys to move it, Space or Enter to drop it, Escape to cancel.",
      grabbed: "{label} picked up, position {pos} of {total}. Arrow keys move, Space drops, Escape cancels.",
      moved: "{label}, position {pos} of {total}.",
      dropped: "{label} dropped, position {pos} of {total}.",
      cancelled: "Move cancelled. {label} back at position {pos} of {total}."
    }
  };
  var counter = 0;
  var canMoveBefore = typeof Element.prototype.moveBefore === "function";

  function reducedMotion() {
    var pref = document.documentElement.getAttribute("data-motion");
    if (pref === "reduce") return true;
    if (pref === "full") return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  customElements.define(
    "ncss-sortable",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) {
          return;
        }
        var list = this.querySelector(":scope > ul, :scope > ol, :scope > [role='list']");
        if (!list) {
          return;
        }
        this._ready = true;
        this._list = list;
        var self = this;
        var n = ++counter;
        this._id = "ncss-sortable-" + n;
        var lang = ((this.closest("[lang]") || document.documentElement).getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
        this._t = function (key, item) {
          var text = self.getAttribute("data-label-" + key) || TEXTS[lang][key];
          if (!item) return text;
          var items = self.items;
          return text
            .replace("{label}", self._label(item))
            .replace("{pos}", items.indexOf(item) + 1)
            .replace("{total}", items.length);
        };
        list.classList.add("ncss-sortable-list");

        var instructions = document.createElement("span");
        instructions.className = "ncss-sortable-instructions";
        instructions.id = this._id + "-help";
        instructions.textContent = this._t("instructions");
        var status = document.createElement("span");
        status.className = "ncss-sortable-status";
        status.setAttribute("aria-live", "assertive");
        status.setAttribute("aria-atomic", "true");
        this.appendChild(instructions);
        this.appendChild(status);
        this._status = status;

        this.items.forEach(function (item) { self._setup(item); });
        this._refresh();

        // Später angehängte Einträge nachrüsten.
        this._observer = new MutationObserver(function () {
          if (self._busy) return;
          self.items.forEach(function (item) {
            if (!item._ncssSortable) self._setup(item);
          });
          self._refresh();
        });
        this._observer.observe(list, { childList: true });

        list.addEventListener("keydown", this._onKey.bind(this));
        list.addEventListener("click", this._onClick.bind(this));
        list.addEventListener("pointerdown", this._onPointerDown.bind(this));
        list.addEventListener("focusout", function (event) {
          // Fokus verlässt den aufgenommenen Griff (Tab, Klick woanders): an Ort und Stelle
          // ablegen. Während eines DOM-Umzugs (insertBefore) nicht.
          if (self._grabbed && !self._busy && event.target === self._grabbed._ncssHandle) {
            self._drop(true);
          }
        });
      }

      disconnectedCallback() {
        if (this._drag) {
          this._endDrag(true);
        }
      }

      get items() {
        return this._list ? Array.prototype.filter.call(this._list.children, function (el) {
          return el.nodeType === 1 && !el.hidden && el.tagName !== "TEMPLATE";
        }) : [];
      }

      get order() {
        var self = this;
        return this.items.map(function (item) {
          return item.getAttribute("data-id") || self._label(item);
        });
      }

      move(item, to) {
        var items = this.items;
        if (typeof item === "number") item = items[item];
        if (!item || items.indexOf(item) < 0) return;
        var from = items.indexOf(item);
        this._moveTo(item, to, false);
        this._changed(item, from);
      }

      _label(item) {
        if (item.hasAttribute("data-label")) return item.getAttribute("data-label");
        var content = item.querySelector(":scope > .ncss-sortable-content") || item;
        return (content.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      }

      // Eintrag aufbereiten: Griff vorne, Inhalt in .ncss-sortable-content, Schaltflächen hinten.
      _setup(item) {
        item._ncssSortable = true;
        item.classList.add("ncss-sortable-item");
        var handle = item.querySelector(".ncss-sortable-handle");
        var content = item.querySelector(":scope > .ncss-sortable-content");
        if (!content) {
          content = document.createElement("span");
          content.className = "ncss-sortable-content";
          Array.prototype.slice.call(item.childNodes).forEach(function (node) {
            if (node !== handle) content.appendChild(node);
          });
          item.appendChild(content);
        }
        if (!handle) {
          handle = document.createElement("button");
          handle.type = "button";
          handle.className = "ncss-sortable-handle";
        }
        item.insertBefore(handle, item.firstChild);
        handle.setAttribute("aria-describedby", this._id + "-help");
        item._ncssHandle = handle;
        if (!this.hasAttribute("no-buttons")) {
          var actions = document.createElement("span");
          actions.className = "ncss-sortable-actions";
          ["up", "down"].forEach(function (dir) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "ncss-sortable-move";
            b.setAttribute("data-direction", dir);
            actions.appendChild(b);
          });
          item.appendChild(actions);
          item._ncssUp = actions.firstChild;
          item._ncssDown = actions.lastChild;
        }
      }

      // Namen und Kanten-Zustand aller Schaltflächen auf die aktuelle Reihenfolge bringen.
      _refresh() {
        var self = this;
        var items = this.items;
        items.forEach(function (item, i) {
          if (!item._ncssSortable) return;
          var handle = item._ncssHandle;
          if (!handle.hasAttribute("data-ncss-own-label")) {
            if (handle.hasAttribute("aria-label") && !handle._ncssLabelled) {
              handle.setAttribute("data-ncss-own-label", "");
            } else {
              handle._ncssLabelled = true;
              handle.setAttribute("aria-label", self._t("handle").replace("{label}", self._label(item)));
              handle.title = handle.getAttribute("aria-label");
            }
          }
          [[item._ncssUp, "up", i === 0], [item._ncssDown, "down", i === items.length - 1]].forEach(function (entry) {
            var b = entry[0];
            if (!b) return;
            var name = self._t(entry[1]).replace("{label}", self._label(item));
            b.setAttribute("aria-label", name);
            b.title = name;
            if (entry[2]) b.setAttribute("aria-disabled", "true");
            else b.removeAttribute("aria-disabled");
          });
        });
      }

      _announce(key, item) {
        var status = this._status;
        var text = this._t(key, item);
        // Gleicher Text zweimal hintereinander (z. B. am Rand) würde nicht erneut angesagt.
        status.textContent = status.textContent === text ? text + " " : text;
      }

      // DOM-Umzug mit FLIP-Animation der Nachbarn. Behält den Fokus (moveBefore() wo
      // vorhanden, sonst Fokus zurücksetzen).
      _moveTo(item, to, keepFocus) {
        var list = this._list;
        var items = this.items;
        var from = items.indexOf(item);
        to = Math.max(0, Math.min(items.length - 1, to));
        if (from === to) return false;
        var animate = !reducedMotion() && typeof item.animate === "function";
        // offsetTop statt getBoundingClientRect(): ignoriert laufende translate-Animationen.
        var before = animate ? items.map(function (el) { return el.offsetTop; }) : null;
        var focused = document.activeElement;
        var rest = items.filter(function (el) { return el !== item; });
        var ref = rest[to] || null;
        this._busy = true;
        if (ref === null && rest.length) {
          ref = rest[rest.length - 1].nextSibling;
        }
        if (canMoveBefore) {
          try {
            list.moveBefore(item, ref);
          } catch (e) {
            list.insertBefore(item, ref);
          }
        } else {
          list.insertBefore(item, ref);
        }
        if (keepFocus !== false && focused && item.contains(focused) && document.activeElement !== focused) {
          focused.focus({ preventScroll: true });
        }
        this._busy = false;
        this._refresh();
        if (animate) {
          var dragged = this._drag && this._drag.item;
          items.forEach(function (el, i) {
            if (el === dragged) return;
            var dy = before[i] - el.offsetTop;
            if (dy) {
              el.animate([{ translate: "0 " + dy + "px" }, { translate: "0 0" }], {
                duration: 160,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)"
              });
            }
          });
        }
        return true;
      }

      _changed(item, from) {
        var to = this.items.indexOf(item);
        if (to === from) return;
        this.dispatchEvent(new CustomEvent("ncss-sortable-change", {
          bubbles: true,
          detail: { item: item, from: from, to: to, order: this.order }
        }));
      }

      // --- Tastatur --------------------------------------------------------------------
      _onKey(event) {
        var handle = event.target.closest(".ncss-sortable-handle");
        if (!handle || this._drag) {
          if (this._drag && event.key === "Escape") {
            event.preventDefault();
            this._endDrag(true);
          }
          return;
        }
        var item = handle.closest(".ncss-sortable-item");
        var key = event.key;
        if (!this._grabbed) {
          if (key === " " || key === "Enter") {
            event.preventDefault();
            this._grab(item);
          }
          return;
        }
        if (this._grabbed !== item) {
          this._drop(true);
          return;
        }
        var items = this.items;
        var i = items.indexOf(item);
        var target = -1;
        if (key === "ArrowUp" || key === "ArrowLeft") target = i - 1;
        else if (key === "ArrowDown" || key === "ArrowRight") target = i + 1;
        else if (key === "Home") target = 0;
        else if (key === "End") target = items.length - 1;
        else if (key === " " || key === "Enter") {
          event.preventDefault();
          this._drop(false);
          return;
        } else if (key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          this._cancel();
          return;
        } else {
          return;
        }
        event.preventDefault();
        target = Math.max(0, Math.min(items.length - 1, target));
        this._moveTo(item, target);
        handle.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "instant" : "smooth" });
        this._announce("moved", item);
      }

      _grab(item) {
        this._grabbed = item;
        this._grabFrom = this.items.indexOf(item);
        item.setAttribute("data-grabbed", "");
        item._ncssHandle.setAttribute("aria-pressed", "true");
        this.setAttribute("data-sorting", "");
        this._announce("grabbed", item);
      }

      _release() {
        var item = this._grabbed;
        this._grabbed = null;
        item.removeAttribute("data-grabbed");
        item._ncssHandle.removeAttribute("aria-pressed");
        this.removeAttribute("data-sorting");
        return item;
      }

      _drop(silent) {
        var from = this._grabFrom;
        var item = this._release();
        if (!silent) this._announce("dropped", item);
        this._changed(item, from);
      }

      _cancel() {
        var from = this._grabFrom;
        var item = this._grabbed;
        this._moveTo(item, from);
        this._release();
        this._announce("cancelled", item);
      }

      // --- Hoch/Runter-Schaltflächen -----------------------------------------------------
      _onClick(event) {
        var b = event.target.closest(".ncss-sortable-move");
        if (!b || b.getAttribute("aria-disabled") === "true") return;
        var item = b.closest(".ncss-sortable-item");
        if (this._grabbed) this._drop(true);
        var from = this.items.indexOf(item);
        var up = b.getAttribute("data-direction") === "up";
        this._moveTo(item, from + (up ? -1 : 1));
        // An der Kante ist die gedrückte Schaltfläche jetzt gesperrt - Fokus auf die andere.
        if (b.getAttribute("aria-disabled") === "true") {
          var other = up ? item._ncssDown : item._ncssUp;
          if (other && other.getAttribute("aria-disabled") !== "true") other.focus();
        }
        this._announce("moved", item);
        this._changed(item, from);
      }

      // --- Zeiger / Touch -----------------------------------------------------------------
      _onPointerDown(event) {
        var handle = event.target.closest(".ncss-sortable-handle");
        if (!handle || (event.pointerType === "mouse" && event.button !== 0) || this._drag) return;
        var item = handle.closest(".ncss-sortable-item");
        if (this._grabbed) this._drop(true);
        var self = this;
        var drag = {
          item: item,
          handle: handle,
          id: event.pointerId,
          startY: event.pageY,
          startTop: item.offsetTop,
          from: this.items.indexOf(item),
          started: false
        };
        this._drag = drag;
        try {
          handle.setPointerCapture(event.pointerId);
        } catch (e) {
          // Zeiger schon weg
        }
        drag.onMove = function (e) {
          if (e.pointerId !== drag.id) return;
          if (!drag.started) {
            if (Math.abs(e.pageY - drag.startY) < 4) return;
            drag.started = true;
            item.setAttribute("data-dragging", "");
            self.setAttribute("data-sorting", "");
          }
          e.preventDefault();
          drag.lastY = e.pageY;
          self._follow();
        };
        drag.onUp = function (e) {
          if (e.pointerId !== drag.id) return;
          self._endDrag(e.type === "pointercancel");
        };
        drag.onKey = function (e) {
          if (e.key === "Escape") {
            e.preventDefault();
            self._endDrag(true);
          }
        };
        // Am window statt am Griff lauschen: kommt auch an, wo setPointerCapture nicht greift.
        window.addEventListener("pointermove", drag.onMove);
        window.addEventListener("pointerup", drag.onUp);
        window.addEventListener("pointercancel", drag.onUp);
        document.addEventListener("keydown", drag.onKey, true);
      }

      // Gezogenen Eintrag unter den Zeiger setzen; liegt seine Mitte hinter der Mitte eines
      // Nachbarn, rückt er an dessen Stelle. Gerechnet in offsetTop (ohne translate), damit
      // laufende Animationen der Nachbarn nicht stören; pageY berücksichtigt Seiten-Scroll.
      _follow() {
        var drag = this._drag;
        var item = drag.item;
        var top = drag.startTop + (drag.lastY - drag.startY);
        var center = top + item.offsetHeight / 2;
        var items = this.items;
        var target = 0;
        items.forEach(function (el) {
          if (el !== item && el.offsetTop + el.offsetHeight / 2 < center) target++;
        });
        if (target !== items.indexOf(item)) {
          this._moveTo(item, target, true);
          this._announce("moved", item);
        }
        item.style.translate = "0 " + Math.round(top - item.offsetTop) + "px";
      }

      _endDrag(cancel) {
        var drag = this._drag;
        if (!drag) return;
        this._drag = null;
        var item = drag.item;
        var handle = drag.handle;
        window.removeEventListener("pointermove", drag.onMove);
        window.removeEventListener("pointerup", drag.onUp);
        window.removeEventListener("pointercancel", drag.onUp);
        document.removeEventListener("keydown", drag.onKey, true);
        try {
          handle.releasePointerCapture(drag.id);
        } catch (e) {
          // schon freigegeben
        }
        if (!drag.started) return;
        if (cancel) {
          item.style.translate = "";
          this._moveTo(item, drag.from);
        }
        // Zurückgleiten in die Zeile (Dauer per reset.css bei reduzierter Bewegung ~0).
        if (!reducedMotion() && item.style.translate) {
          item.setAttribute("data-settling", "");
          var done = function () {
            item.removeAttribute("data-settling");
            item.removeEventListener("transitionend", done);
          };
          item.addEventListener("transitionend", done);
          window.setTimeout(done, 300);
          requestAnimationFrame(function () { item.style.translate = ""; });
        } else {
          item.style.translate = "";
        }
        item.removeAttribute("data-dragging");
        this.removeAttribute("data-sorting");
        if (cancel) {
          this._announce("cancelled", item);
        } else {
          this._announce("dropped", item);
          this._changed(item, drag.from);
        }
      }
    }
  );
})();
