/**
 * ncss - <ncss-hovercard>: Vorschaukarte beim Überfahren/Fokussieren eines Links (siehe
 * components/hovercard.css für Markup). Light-DOM-Custom-Element ohne Shadow Root.
 * Erstes Kind = Auslöser (Link/Button), .ncss-hovercard = Karte.
 *
 * Unterstützt der Browser interestfor (Chromium), tut dieses Script fast nichts: es setzt
 * nur fehlende Attribute (interestfor, popover="hint") - Hover, Fokus, Verzögerung, Esc
 * und Long-Press auf Touch übernimmt der Browser. Sonst:
 *   - Öffnen nach "delay" ms bei Hover (Maus/Stift) oder Tastatur-Fokus (:focus-visible)
 *   - bleibt offen, solange Zeiger ODER Fokus im Link oder in der Karte sind (WCAG 1.4.13)
 *   - Esc schließt (und holt den Fokus aus der Karte zurück auf den Link)
 *   - Touch: kein Hover - ein Tap folgt einfach dem Link
 * Positionierung: CSS Anchor Positioning (das Script vergibt eindeutige anchor-name/
 * position-anchor); ohne Anchor Positioning rechnet es top/left selbst aus (unter dem
 * Link, bei Platzmangel darüber, seitlich im Viewport gehalten).
 *
 * Attribute am Element: delay="400" (ms bis zum Öffnen), hide-delay="250"
 * Events (am Element, bubbeln): ncss-hovercard-show / ncss-hovercard-hide
 * Öffentlich: el.show(), el.hide(), el.open (nur lesen)
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements oder Popover-API wird
 * nichts registriert - die Karte bleibt dann verborgen, der Link funktioniert normal.
 */
(function () {
  "use strict";

  if (!window.customElements || !HTMLElement.prototype.hasOwnProperty("popover") ||
      customElements.get("ncss-hovercard")) {
    return;
  }

  var nativeInterest = "interestForElement" in HTMLAnchorElement.prototype ||
    "interestForElement" in HTMLButtonElement.prototype;
  var anchorSupport = window.CSS && CSS.supports("anchor-name: --a") && CSS.supports("position-area: bottom");
  var hintSupport = (function () {
    var probe = document.createElement("div");
    probe.setAttribute("popover", "hint");
    return probe.popover === "hint";
  })();
  var counter = 0;

  customElements.define(
    "ncss-hovercard",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) {
          return;
        }
        var trigger = this.firstElementChild;
        var card = this.querySelector(".ncss-hovercard");
        if (!trigger || !card || trigger === card) {
          return;
        }
        this._ready = true;
        this._trigger = trigger;
        this._card = card;
        var self = this;
        var n = ++counter;

        if (!card.id) {
          card.id = "ncss-hovercard-" + n;
        }
        if (!card.hasAttribute("popover") || (card.popover === "manual" && hintSupport)) {
          card.setAttribute("popover", hintSupport ? "hint" : "manual");
        }

        card.addEventListener("toggle", function (event) {
          var open = event.newState === "open";
          self.dispatchEvent(new CustomEvent(open ? "ncss-hovercard-show" : "ncss-hovercard-hide", { bubbles: true }));
        });

        if (nativeInterest && trigger.matches("a[href], button, area")) {
          if (!trigger.hasAttribute("interestfor")) {
            trigger.setAttribute("interestfor", card.id);
          }
          return;
        }

        // --- Fallback ohne interestfor ---------------------------------------------------
        if (anchorSupport) {
          trigger.style.setProperty("anchor-name", "--ncss-hovercard-" + n);
          card.style.setProperty("position-anchor", "--ncss-hovercard-" + n);
        } else {
          card.setAttribute("data-ncss-hovercard-manual", "");
          this._onViewport = this._place.bind(this);
        }

        var showTimer = 0;
        var hideTimer = 0;
        var delay = function (name, fallback) {
          var v = parseInt(self.getAttribute(name), 10);
          return isNaN(v) ? fallback : v;
        };
        var later = function () {
          clearTimeout(hideTimer);
          clearTimeout(showTimer);
          showTimer = setTimeout(function () { self.show(); }, delay("delay", 400));
        };
        var soon = function () {
          clearTimeout(showTimer);
          clearTimeout(hideTimer);
          hideTimer = setTimeout(function () { self.hide(); }, delay("hide-delay", 250));
        };
        var inside = function (node) {
          return node && (trigger.contains(node) || card.contains(node));
        };
        this._clearTimers = function () {
          clearTimeout(showTimer);
          clearTimeout(hideTimer);
        };

        trigger.addEventListener("pointerenter", function (e) {
          if (e.pointerType !== "touch") {
            later();
          }
        });
        trigger.addEventListener("pointerleave", function (e) {
          if (e.pointerType !== "touch") {
            soon();
          }
        });
        trigger.addEventListener("pointerdown", function () {
          clearTimeout(showTimer);
        });
        card.addEventListener("pointerenter", function () {
          clearTimeout(hideTimer);
        });
        card.addEventListener("pointerleave", function (e) {
          if (e.pointerType !== "touch" && !card.contains(document.activeElement)) {
            soon();
          }
        });
        trigger.addEventListener("focusin", function () {
          if (trigger.matches(":focus-visible")) {
            later();
          }
        });
        trigger.addEventListener("focusout", function (e) {
          if (!inside(e.relatedTarget)) {
            soon();
          }
        });
        card.addEventListener("focusout", function (e) {
          if (!inside(e.relatedTarget)) {
            soon();
          }
        });
        this._onKey = function (e) {
          if (e.key !== "Escape" || !self.open) {
            return;
          }
          var back = card.contains(document.activeElement);
          self.hide();
          if (back) {
            trigger.focus();
          }
        };
        document.addEventListener("keydown", this._onKey);
      }

      disconnectedCallback() {
        if (this._onKey) {
          document.removeEventListener("keydown", this._onKey);
        }
        this.hide();
      }

      get open() {
        return !!this._card && this._card.matches(":popover-open");
      }

      show() {
        if (!this._card || this.open) {
          return;
        }
        if (this._clearTimers) {
          this._clearTimers();
        }
        try {
          this._card.showPopover();
        } catch (e) {
          return;
        }
        if (this._onViewport) {
          this._place();
          window.addEventListener("scroll", this._onViewport, true);
          window.addEventListener("resize", this._onViewport);
        }
      }

      hide() {
        if (this._clearTimers) {
          this._clearTimers();
        }
        if (this._onViewport) {
          window.removeEventListener("scroll", this._onViewport, true);
          window.removeEventListener("resize", this._onViewport);
        }
        if (this.open) {
          this._card.hidePopover();
        }
      }

      // Nur ohne Anchor Positioning: unter dem Link, bei Platzmangel darüber.
      _place() {
        var t = this._trigger.getBoundingClientRect();
        var card = this._card;
        var gap = 8;
        var w = card.offsetWidth;
        var h = card.offsetHeight;
        var vw = document.documentElement.clientWidth;
        var vh = window.innerHeight;
        var top = t.bottom + gap;
        if (top + h > vh && t.top - gap - h > 0) {
          top = t.top - gap - h;
        }
        var left = Math.min(Math.max(8, t.left), vw - w - 8);
        card.style.top = top + "px";
        card.style.left = left + "px";
      }
    }
  );
})();
