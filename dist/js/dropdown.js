/**
 * ncss - <ncss-dropdown>: Dropdown / Aktionsmenü (siehe components/dropdown.css für Markup).
 * Light-DOM-Custom-Element. Inhalt: ein Auslöser mit popovertarget + das Menü
 * (.ncss-dropdown-menu[popover]). Öffnen, Schließen per Klick daneben und Esc übernimmt
 * der Browser (Popover-API) - dieses Script ergänzt nur, was die API nicht kann.
 *
 * Zwei Modi, abhängig vom Markup:
 *   role="menu" am Menü  -> WAI-ARIA-APG "Menu Button": Einträge (role="menuitem",
 *                           "menuitemradio", "menuitemcheckbox") bekommen tabindex="-1",
 *                           der Fokus wandert per Tastatur (roving focus), beim Öffnen
 *                           springt er auf den ersten Eintrag.
 *   ohne role="menu"     -> Disclosure (Link-Liste, z. B. Benutzer-Menü): normale Tab-
 *                           Reihenfolge, das Script setzt nur aria-expanded und die Position.
 *
 * Tasten (role="menu"):
 *   Auslöser: Enter/Leertaste/Pfeil runter öffnet + erster Eintrag, Pfeil hoch + letzter
 *   Menü: Pfeil hoch/runter (zyklisch), Pos1/Ende, Buchstabe = nächster passender Eintrag
 *   (Tippsuche), Enter = auswählen + schließen, Leertaste bei Radio/Checkbox = umschalten
 *   ohne zu schließen, Esc = schließen + Fokus zurück auf den Auslöser, Tab = schließen.
 *
 * Attribute am Element: keine nötig. Am Eintrag: aria-disabled="true" (bleibt fokussierbar,
 *   lässt sich aber nicht auswählen), data-value="…" (Wert im Event, sonst value/Text).
 * Events (bubbeln, am Element): ncss-dropdown-select { item, value, checked },
 *   ncss-dropdown-show, ncss-dropdown-hide
 * Öffentlich: el.show(), el.hide(), el.open (nur lesen)
 *
 * Positionierung: CSS Anchor Positioning (das Script vergibt eindeutige anchor-name/
 * position-anchor); ohne Anchor Positioning rechnet es top/left selbst aus (unter dem
 * Auslöser, bei Platzmangel darüber, im Viewport gehalten) - gleiche Logik wie
 * js/preferences.js und js/hovercard.js, bewusst ohne gemeinsame Abhängigkeit.
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements/Popover-API wird nichts
 * registriert - eine Link-Liste funktioniert trotzdem (Popover nativ), ein role="menu"-Menü
 * ist dann nur per Tab bedienbar.
 */
(function () {
  "use strict";

  if (!window.customElements || !HTMLElement.prototype.hasOwnProperty("popover") ||
      customElements.get("ncss-dropdown")) {
    return;
  }

  var anchorSupport = window.CSS && CSS.supports("anchor-name: --a") && CSS.supports("position-area: bottom");
  var ITEM = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';
  var counter = 0;

  customElements.define(
    "ncss-dropdown",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) {
          return;
        }
        var toggle = this.querySelector("[popovertarget]");
        var menu = toggle && (toggle.popoverTargetElement || document.getElementById(toggle.getAttribute("popovertarget")));
        if (!menu) {
          return;
        }
        this._ready = true;
        this._toggle = toggle;
        this._menu = menu;
        var self = this;
        var n = ++counter;
        var isMenu = menu.getAttribute("role") === "menu";
        this._isMenu = isMenu;

        if (!menu.hasAttribute("popover")) {
          menu.setAttribute("popover", "auto");
        }
        if (!menu.id) {
          menu.id = "ncss-dropdown-" + n;
          toggle.setAttribute("popovertarget", menu.id);
        }
        toggle.setAttribute("aria-expanded", "false");
        if (isMenu) {
          toggle.setAttribute("aria-haspopup", "menu");
          toggle.setAttribute("aria-controls", menu.id);
          if (!menu.hasAttribute("aria-label") && !menu.hasAttribute("aria-labelledby")) {
            if (!toggle.id) {
              toggle.id = "ncss-dropdown-" + n + "-toggle";
            }
            menu.setAttribute("aria-labelledby", toggle.id);
          }
          this._items().forEach(function (item) {
            item.setAttribute("tabindex", "-1");
          });
        }
        if (anchorSupport) {
          toggle.style.setProperty("anchor-name", "--ncss-dropdown-" + n);
          menu.style.setProperty("position-anchor", "--ncss-dropdown-" + n);
        } else {
          menu.setAttribute("data-ncss-dropdown-fallback", "");
          this._onViewport = this._place.bind(this);
        }

        // Welcher Eintrag beim Öffnen den Fokus bekommt ("first" | "last").
        this._focusOnOpen = "first";

        menu.addEventListener("toggle", function (event) {
          var open = event.newState === "open";
          toggle.setAttribute("aria-expanded", open ? "true" : "false");
          if (open) {
            if (self._onViewport) {
              self._place();
              window.addEventListener("scroll", self._onViewport, true);
              window.addEventListener("resize", self._onViewport);
            }
            if (isMenu) {
              var items = self._items();
              var target = self._focusOnOpen === "last" ? items[items.length - 1] : items[0];
              if (target) {
                target.focus();
              }
            }
            self._focusOnOpen = "first";
          } else {
            if (self._onViewport) {
              window.removeEventListener("scroll", self._onViewport, true);
              window.removeEventListener("resize", self._onViewport);
            }
            // Esc/Auswahl: Fokus sicher zurück auf den Auslöser (der Browser macht das bei
            // Light Dismiss meist selbst - aber nicht, wenn der Fokus schon "verloren" war).
            var active = document.activeElement;
            if (!self._leaving && (!active || active === document.body || menu.contains(active))) {
              toggle.focus();
            }
            self._leaving = false;
          }
          self.dispatchEvent(new CustomEvent(open ? "ncss-dropdown-show" : "ncss-dropdown-hide", { bubbles: true }));
        });

        toggle.addEventListener("keydown", function (event) {
          if (!isMenu || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) {
            return;
          }
          event.preventDefault();
          self._focusOnOpen = event.key === "ArrowUp" ? "last" : "first";
          if (self.open) {
            var items = self._items();
            var target = self._focusOnOpen === "last" ? items[items.length - 1] : items[0];
            if (target) {
              target.focus();
            }
          } else {
            self.show();
          }
        });

        var buffer = "";
        var bufferTimer = 0;
        menu.addEventListener("keydown", function (event) {
          if (!isMenu) {
            return;
          }
          var items = self._items();
          var current = items.indexOf(document.activeElement);
          var key = event.key;
          var target = -1;
          if (key === "ArrowDown") target = (current + 1) % items.length;
          else if (key === "ArrowUp") target = current <= 0 ? items.length - 1 : current - 1;
          else if (key === "Home" || key === "PageUp") target = 0;
          else if (key === "End" || key === "PageDown") target = items.length - 1;
          else if (key === "Tab") {
            // APG: Tab verlässt das Menü und schließt es - Fokus NICHT auf den Auslöser
            // zurückholen, der Browser setzt ihn auf das nächste Element.
            self._leaving = true;
            self.hide();
            return;
          } else if ((key === "Enter" || key === " ") && current > -1) {
            event.preventDefault();
            var item = items[current];
            self._keepOpen = key === " " && /menuitem(radio|checkbox)/.test(item.getAttribute("role"));
            item.click();
            return;
          } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && key !== " ") {
            // Tippsuche: Zeichen sammeln (500 ms), nächsten Eintrag mit passendem Anfang.
            clearTimeout(bufferTimer);
            buffer += key.toLowerCase();
            bufferTimer = setTimeout(function () { buffer = ""; }, 500);
            var start = buffer.length === 1 ? current + 1 : Math.max(current, 0);
            for (var k = 0; k < items.length; k++) {
              var i = (start + k) % items.length;
              if (self._label(items[i]).indexOf(buffer) === 0) {
                target = i;
                break;
              }
            }
            if (target < 0) {
              return;
            }
          }
          if (target < 0 || !items.length) {
            return;
          }
          event.preventDefault();
          items[target].focus();
        });

        menu.addEventListener("click", function (event) {
          var item = event.target.closest(isMenu ? ITEM : ".ncss-dropdown-item, a[href], button");
          if (!item || !menu.contains(item)) {
            return;
          }
          var keepOpen = self._keepOpen;
          self._keepOpen = false;
          if (item.getAttribute("aria-disabled") === "true" || item.disabled) {
            event.preventDefault();
            return;
          }
          var role = item.getAttribute("role");
          if (role === "menuitemcheckbox") {
            item.setAttribute("aria-checked", item.getAttribute("aria-checked") === "true" ? "false" : "true");
          } else if (role === "menuitemradio") {
            var scope = item.closest('[role="group"]') || menu;
            Array.prototype.forEach.call(scope.querySelectorAll('[role="menuitemradio"]'), function (radio) {
              if ((radio.closest('[role="group"]') || menu) === scope) {
                radio.setAttribute("aria-checked", radio === item ? "true" : "false");
              }
            });
          }
          self.dispatchEvent(new CustomEvent("ncss-dropdown-select", {
            bubbles: true,
            detail: {
              item: item,
              value: item.getAttribute("data-value") || item.value || item.textContent.trim(),
              checked: item.hasAttribute("aria-checked") ? item.getAttribute("aria-checked") === "true" : null
            }
          }));
          if (!keepOpen) {
            self.hide();
            toggle.focus();
          }
        });
      }

      disconnectedCallback() {
        if (this._onViewport) {
          window.removeEventListener("scroll", this._onViewport, true);
          window.removeEventListener("resize", this._onViewport);
        }
      }

      get open() {
        return !!this._menu && this._menu.matches(":popover-open");
      }

      show() {
        if (this._menu && !this.open) {
          try {
            this._menu.showPopover({ source: this._toggle });
          } catch (e) {
            // Element nicht (mehr) im Dokument
          }
        }
      }

      hide() {
        if (this.open) {
          this._menu.hidePopover();
        }
      }

      // Bedienbare Einträge in DOM-Reihenfolge (auch deaktivierte - APG: bleiben fokussierbar).
      _items() {
        return Array.prototype.filter.call(this._menu.querySelectorAll(ITEM), function (item) {
          return !item.hidden && !item.closest("[hidden]");
        });
      }

      _label(item) {
        return (item.getAttribute("aria-label") || item.textContent || "").trim().toLowerCase();
      }

      // Nur ohne Anchor Positioning: unter dem Auslöser (bei --up darüber), an der Anfangs-
      // bzw. bei --end an der Endkante, bei Platzmangel gespiegelt, im Viewport gehalten.
      _place() {
        var menu = this._menu;
        var t = this._toggle.getBoundingClientRect();
        var gap = 4;
        var edge = 8;
        var w = menu.offsetWidth;
        var h = menu.offsetHeight;
        var vw = document.documentElement.clientWidth;
        var vh = window.innerHeight;
        var rtl = getComputedStyle(menu).direction === "rtl";
        var end = menu.classList.contains("ncss-dropdown-menu--end") !== rtl;
        var up = menu.classList.contains("ncss-dropdown-menu--up");
        var below = t.bottom + gap;
        var above = t.top - gap - h;
        var top = up ? (above >= edge ? above : below) : (below + h <= vh - edge || above < edge ? below : above);
        top = Math.max(edge, Math.min(top, vh - h - edge));
        var left = end ? t.right - w : t.left;
        left = Math.max(edge, Math.min(left, vw - w - edge));
        menu.style.top = Math.round(top) + "px";
        menu.style.left = Math.round(left) + "px";
      }
    }
  );
})();
