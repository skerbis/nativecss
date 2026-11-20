/**
 * ncss - <ncss-preferences>: Darstellungs-Einstellungen für Besucher (siehe
 * components/preferences.css für Markup). Light-DOM-Custom-Element.
 *
 * KEIN "Barrierefreiheits-Overlay": macht keine Seite barrierefrei und repariert nichts.
 * Es lässt Besucher eine bereits barrierefreie Seite an persönliche Bedürfnisse anpassen.
 * Betriebssystem-/Browser-Einstellungen sind der Default ("System") und werden nie
 * stillschweigend überschrieben - jede Abweichung ist eine ausdrückliche Wahl.
 *
 * Schreibt dieselben <html>-Attribute wie js/preferences-early.js (Wirkung in colors.css
 * und reset.css, keine Komponente muss davon wissen) und speichert in localStorage:
 * "ncss-theme" (gemeinsam mit js/theme-toggle.js - EIN Mechanismus) und "ncss-prefs" (JSON).
 *
 * Attribute am Element:
 *   inline                     Bedienfeld direkt anzeigen statt Button + Popover
 *   settings="theme contrast motion text spacing links focus"   Auswahl/Reihenfolge
 *   data-label-<schlüssel>="…"  jeden Text überschreiben (Schlüssel siehe TEXTS unten)
 * Event (am document): ncss-preferences-change, detail { key, value, prefs }
 *
 * Bedienung: native Radiogruppen (fieldset/legend, Pfeiltasten) und Checkboxen (Leertaste),
 * Änderungen wirken sofort (Live-Vorschau) und werden höflich angesagt (role="status").
 * Popover: Esc/Klick daneben schließt, Fokus geht beim Öffnen auf das erste Feld und beim
 * Schließen zurück auf den Button. Ohne Anchor Positioning rechnet das Script die Position.
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements wird nichts registriert -
 * das Element bleibt verborgen (CSS :not(:defined)), es gelten die Systemeinstellungen.
 */
(function () {
  "use strict";

  if (!window.customElements || customElements.get("ncss-preferences")) {
    return;
  }

  var root = document.documentElement;
  var THEME_KEY = "ncss-theme";
  var PREFS_KEY = "ncss-prefs";
  var ALL = ["theme", "contrast", "motion", "text", "spacing", "links", "focus"];
  var TEXTS = {
    de: {
      button: "Darstellung", title: "Darstellung anpassen",
      intro: "Passe die Darstellung an deine Bedürfnisse an. Solange du nichts änderst, gelten die Einstellungen deines Geräts.",
      system: "System",
      theme: "Farbschema", light: "Hell", dark: "Dunkel",
      contrast: "Kontrast", normal: "Normal", more: "Erhöht",
      motion: "Bewegung", reduce: "Reduziert", full: "Voll",
      motionHint: "Dein Gerät wünscht reduzierte Bewegung - „Voll“ hebt das nur für diese Website auf.",
      text: "Schriftgröße",
      spacing: "Größere Text- und Zeilenabstände", links: "Links immer unterstreichen", focus: "Fokus-Rahmen verstärken",
      reset: "Zurücksetzen", resetDone: "Alle Einstellungen zurückgesetzt, es gilt dein Gerät.",
      on: "an", off: "aus", close: "Schließen"
    },
    en: {
      button: "Display", title: "Adjust display",
      intro: "Adapt the display to your needs. As long as you change nothing, your device settings apply.",
      system: "System",
      theme: "Colour scheme", light: "Light", dark: "Dark",
      contrast: "Contrast", normal: "Normal", more: "Increased",
      motion: "Motion", reduce: "Reduced", full: "Full",
      motionHint: "Your device asks for reduced motion - “Full” overrides that for this website only.",
      text: "Text size",
      spacing: "Larger text and line spacing", links: "Always underline links", focus: "Stronger focus outline",
      reset: "Reset", resetDone: "All settings reset, your device settings apply.",
      on: "on", off: "off", close: "Close"
    }
  };
  // Radiogruppen: Schlüssel -> Optionen ("" = System/Standard)
  var GROUPS = {
    theme: ["", "light", "dark"],
    contrast: ["", "normal", "more"],
    motion: ["", "reduce", "full"],
    text: ["", "115", "130"]
  };
  var SWITCHES = ["spacing", "links", "focus"];
  var anchorSupport = window.CSS && CSS.supports("anchor-name: --a") && CSS.supports("position-area: bottom");
  var popoverSupport = HTMLElement.prototype.hasOwnProperty("popover");
  var counter = 0;

  function read() {
    var prefs = {};
    try {
      prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {};
      var theme = localStorage.getItem(THEME_KEY);
      prefs.theme = theme === "light" || theme === "dark" ? theme : "";
    } catch (e) {
      prefs = { theme: root.getAttribute("data-theme") || "" };
    }
    return prefs;
  }
  function write(prefs) {
    try {
      if (prefs.theme) {
        localStorage.setItem(THEME_KEY, prefs.theme);
      } else {
        localStorage.removeItem(THEME_KEY);
      }
      var rest = {};
      ["contrast", "motion", "text", "spacing", "links", "focus"].forEach(function (k) {
        if (prefs[k]) rest[k] = prefs[k];
      });
      if (Object.keys(rest).length) {
        localStorage.setItem(PREFS_KEY, JSON.stringify(rest));
      } else {
        localStorage.removeItem(PREFS_KEY);
      }
    } catch (e) {
      // Speichern gesperrt: Einstellung gilt trotzdem bis zum Neuladen.
    }
  }
  function attr(name, value) {
    if (value === null || value === "" || value === false || value === undefined) {
      root.removeAttribute(name);
    } else {
      root.setAttribute(name, value === true ? "" : value);
    }
  }
  // Wendet ALLE Einstellungen an - dieselbe Zuordnung wie js/preferences-early.js.
  function apply(prefs) {
    attr("data-theme", prefs.theme || null);
    attr("data-contrast", prefs.contrast || null);
    attr("data-motion", prefs.motion || null);
    attr("data-text-scale", prefs.text || null);
    attr("data-text-spacing", prefs.spacing ? true : null);
    attr("data-links", prefs.links ? "underline" : null);
    attr("data-focus", prefs.focus ? "strong" : null);
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme-resolved", prefs.theme || (dark ? "dark" : "light"));
  }

  customElements.define(
    "ncss-preferences",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) {
          document.addEventListener("ncss-preferences-change", this._onChange);
          window.addEventListener("storage", this._onStorage);
          return;
        }
        this._ready = true;
        var self = this;
        var n = ++counter;
        var lang = ((this.closest("[lang]") || root).getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
        var t = function (key) {
          return self.getAttribute("data-label-" + key.toLowerCase()) || TEXTS[lang][key];
        };
        var wanted = (this.getAttribute("settings") || ALL.join(" ")).split(/\s+/).filter(function (k) {
          return ALL.indexOf(k) > -1;
        });
        var inline = this.hasAttribute("inline") || !popoverSupport;
        var id = "ncss-prefs-" + n;

        var panel = document.createElement(inline ? "section" : "div");
        panel.className = "ncss-preferences-panel";
        panel.id = id + "-panel";
        panel.setAttribute("aria-labelledby", id + "-title");
        if (!inline) {
          panel.setAttribute("popover", "auto");
          panel.setAttribute("role", "dialog");
        }
        var html = '<h2 class="ncss-preferences-title" id="' + id + '-title">' + t("title") + "</h2>" +
          '<p class="ncss-preferences-intro">' + t("intro") + "</p>";
        wanted.forEach(function (key) {
          if (GROUPS[key]) {
            html += '<fieldset class="ncss-preferences-group" data-key="' + key + '"><legend>' + t(key) + "</legend>" +
              '<div class="ncss-preferences-options">';
            GROUPS[key].forEach(function (value) {
              var label = value === "" ? (key === "text" ? "100 %" : t("system")) :
                key === "text" ? value + " %" : t(value);
              html += '<label><input type="radio" name="' + id + "-" + key + '" value="' + value + '"><span>' + label + "</span></label>";
            });
            html += "</div>";
            if (key === "motion") {
              html += '<p class="ncss-preferences-hint" data-motion-hint hidden>' + t("motionHint") + "</p>";
            }
            html += "</fieldset>";
          } else {
            html += '<label class="ncss-preferences-switch"><input type="checkbox" role="switch" data-key="' + key + '"><span>' + t(key) + "</span></label>";
          }
        });
        html += '<div class="ncss-preferences-actions"><button type="button" class="ncss-preferences-reset">' + t("reset") + "</button>" +
          (inline ? "" : '<button type="button" class="ncss-preferences-close" popovertarget="' + panel.id + '" popovertargetaction="hide">' + t("close") + "</button>") +
          '</div><p class="ncss-preferences-status" role="status"></p>';
        panel.innerHTML = html;

        if (!inline) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "ncss-preferences-toggle";
          button.setAttribute("popovertarget", panel.id);
          button.innerHTML = '<span class="ncss-preferences-icon" aria-hidden="true"></span><span>' + t("button") + "</span>";
          this.appendChild(button);
          this._button = button;
          if (anchorSupport) {
            button.style.setProperty("anchor-name", "--" + id);
            panel.style.setProperty("position-anchor", "--" + id);
          }
          panel.addEventListener("toggle", function (event) {
            button.setAttribute("aria-expanded", event.newState === "open" ? "true" : "false");
            if (event.newState === "open") {
              self._place();
              var first = panel.querySelector("input:checked, input");
              if (first) first.focus();
            }
          });
          button.setAttribute("aria-expanded", "false");
        }
        this.appendChild(panel);
        this._panel = panel;
        this._status = panel.querySelector(".ncss-preferences-status");
        this._t = t;

        panel.addEventListener("change", function (event) {
          var input = event.target;
          var group = input.closest("[data-key]");
          var key = input.getAttribute("data-key") || (group && group.getAttribute("data-key"));
          if (!key) return;
          var prefs = read();
          var value = input.type === "checkbox" ? input.checked : input.value;
          prefs[key] = value;
          self._commit(prefs, key, value);
          var name = input.type === "checkbox" ? t(key) + ": " + (value ? t("on") : t("off")) :
            t(key) + ": " + input.nextElementSibling.textContent;
          self._announce(name);
        });
        panel.querySelector(".ncss-preferences-reset").addEventListener("click", function () {
          self._commit({}, "reset", null);
          self._announce(t("resetDone"));
        });

        this._onChange = function () { self._sync(); };
        this._onStorage = function (event) {
          if (event.key === THEME_KEY || event.key === PREFS_KEY) {
            apply(read());
            self._sync();
          }
        };
        document.addEventListener("ncss-preferences-change", this._onChange);
        window.addEventListener("storage", this._onStorage);
        this._sync();
      }

      disconnectedCallback() {
        document.removeEventListener("ncss-preferences-change", this._onChange);
        window.removeEventListener("storage", this._onStorage);
      }

      _commit(prefs, key, value) {
        write(prefs);
        apply(prefs);
        document.dispatchEvent(new CustomEvent("ncss-preferences-change", {
          detail: { key: key, value: value, prefs: read() }
        }));
      }

      _announce(text) {
        var status = this._status;
        status.textContent = "";
        window.setTimeout(function () { status.textContent = text; }, 60);
      }

      // Steuerelemente auf den gespeicherten Stand bringen (auch nach Änderung in einer
      // zweiten Instanz oder einem anderen Tab).
      _sync() {
        var prefs = read();
        var panel = this._panel;
        Object.keys(GROUPS).forEach(function (key) {
          var current = String(prefs[key] || "");
          Array.prototype.forEach.call(panel.querySelectorAll('[data-key="' + key + '"] input'), function (input) {
            input.checked = input.value === current;
          });
        });
        SWITCHES.forEach(function (key) {
          var input = panel.querySelector('input[data-key="' + key + '"]');
          if (input) input.checked = !!prefs[key];
        });
        var hint = panel.querySelector("[data-motion-hint]");
        if (hint) {
          hint.hidden = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        }
      }

      // Ohne Anchor Positioning: unter den Button, rechtsbündig, im Viewport gehalten.
      _place() {
        if (anchorSupport || !this._button) return;
        var panel = this._panel;
        panel.setAttribute("data-ncss-preferences-fallback", "");
        var gap = 8;
        var b = this._button.getBoundingClientRect();
        var p = panel.getBoundingClientRect();
        var vw = document.documentElement.clientWidth;
        var vh = window.innerHeight;
        var left = Math.max(gap, Math.min(b.right - p.width, vw - p.width - gap));
        var top = b.bottom + gap;
        if (top + p.height > vh - gap) {
          top = Math.max(gap, vh - p.height - gap);
        }
        panel.style.left = Math.round(left) + "px";
        panel.style.top = Math.round(top) + "px";
      }
    }
  );
})();
