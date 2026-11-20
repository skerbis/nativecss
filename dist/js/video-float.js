/**
 * ncss - <ncss-video-float>: Mini-Player, der beim Wegscrollen eines LAUFENDEN Videos an
 * eine Fensterecke andockt (components/video-float.css). Light-DOM-Custom-Element.
 *
 * Das Element selbst bleibt als Platzhalter im Fluss (seine Höhe wird beim Andocken
 * festgehalten, nichts springt). Angedockt wird nur, wenn das Video läuft UND der
 * Platzhalter den Viewport verlassen hat. "Schließen" (bzw. Esc im angedockten Player)
 * pausiert und dockt ab; erneut angedockt wird erst, nachdem der Platzhalter wieder
 * sichtbar war. Der Fokus wird durch das Andocken nie verschoben.
 *
 * Funktioniert mit einem nackten <video controls> ebenso wie mit <ncss-video-player>.
 * Events (bubbeln): ncss-video-float-dock, ncss-video-float-undock.
 * Öffentlich: el.dock(), el.undock(), el.docked.
 *
 * Benötigt: components/video-float.css. Keine anderen ncss-Scripts.
 * Texte Deutsch/Englisch nach <html lang>.
 */
(function () {
  "use strict";

  if (!window.customElements || typeof IntersectionObserver === "undefined" || customElements.get("ncss-video-float")) {
    return;
  }

  var lang = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  var TEXTS = {
    de: { close: "Schließen", label: "Mini-Player schließen" },
    en: { close: "Close", label: "Close mini player" }
  };

  customElements.define(
    "ncss-video-float",
    class extends HTMLElement {
      connectedCallback() {
        if (this._frame) {
          return;
        }
        var frame = this.querySelector(":scope > .ncss-video-float-frame");
        var video = frame && frame.querySelector("video");
        if (!video) {
          return;
        }
        this._frame = frame;
        this._video = video;
        this._docked = false;
        this._visible = true;
        this._dismissed = false;
        var self = this;

        var close = document.createElement("button");
        close.type = "button";
        close.className = "ncss-video-float-close";
        close.textContent = TEXTS[lang].close;
        close.setAttribute("aria-label", TEXTS[lang].label);
        frame.appendChild(close);

        function update() {
          if (self._visible) {
            self._dismissed = false;
            self.undock();
          } else if (!video.paused && !self._dismissed) {
            self.dock();
          }
        }
        function dismiss() {
          var hadFocus = frame.contains(document.activeElement);
          self._dismissed = true;
          video.pause();
          self.undock();
          if (hadFocus) {
            // Fokus wandert mit dem Player zurück an seinen Platz in der Seite
            (frame.querySelector("ncss-video-player") || video).focus({ preventScroll: true });
          }
        }
        this._io = new IntersectionObserver(function (entries) {
          self._visible = entries[entries.length - 1].isIntersecting;
          update();
        });
        this._io.observe(this);
        video.addEventListener("play", update);
        close.addEventListener("click", dismiss);
        frame.addEventListener("keydown", function (event) {
          if (self._docked && event.key === "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            dismiss();
          }
        });
      }

      disconnectedCallback() {
        if (this._io) {
          this._io.disconnect();
        }
      }

      get docked() {
        return !!this._docked;
      }
      dock() {
        if (this._docked || !this._frame) {
          return;
        }
        this.style.setProperty("--ncss-video-float-height", this.offsetHeight + "px");
        this._docked = true;
        this.classList.add("is-docked");
        this.dispatchEvent(new CustomEvent("ncss-video-float-dock", { bubbles: true }));
      }
      undock() {
        if (!this._docked) {
          return;
        }
        this._docked = false;
        this.classList.remove("is-docked");
        this.style.removeProperty("--ncss-video-float-height");
        this.dispatchEvent(new CustomEvent("ncss-video-float-undock", { bubbles: true }));
      }
    }
  );
})();
