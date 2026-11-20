/**
 * ncss - Benachrichtigungen / Toasts: <ncss-toast-region> (Light-DOM-Custom-Element ohne
 * Shadow Root) + kleine Script-API (siehe components/notification.css für Markup/Optik).
 *
 * API (global, ohne Modul-System nutzbar):
 *   ncss.notify("Gespeichert");
 *   ncss.notify("Upload fehlgeschlagen", { status: "danger" });
 *   var n = ncss.notify({ title: "Kopiert", message: "Link in der Zwischenablage",
 *                         status: "success", position: "bottom-center", stack: true });
 *   n.close();                       // { element, close() }
 *   ncss.notifyCloseAll();
 * Alternativ ohne direkte Abhängigkeit vom globalen Objekt:
 *   document.dispatchEvent(new CustomEvent("ncss-notify", { detail: { message: "..." } }));
 * Deklarativ: <button type="button" data-ncss-notify="Gespeichert" data-status="success"
 *             data-title="..." data-timeout="8000" data-position="top-center" data-stack>
 *
 * Optionen: message (Text - wird als TEXT eingefügt, nie als HTML; für eigenes Markup
 * einen DOM-Knoten übergeben), title, status (brand | success | warning | danger),
 * timeout (ms, 0 = bleibt stehen; Default 5000, bei danger 0 - eine Fehlermeldung soll
 * nicht verschwinden, bevor sie gelesen ist), position (top-start | top-center | top-end |
 * bottom-start | bottom-center | bottom-end, Default bottom-end), stack (Sonner-Stapel für
 * die Region dieser Position), closeLabel.
 *
 * Verhalten:
 *   - Region = aria-live="polite" (existiert, bevor die erste Meldung eingefügt wird -
 *     sonst sagen Screenreader sie nicht an); danger/warning zusätzlich role="alert".
 *   - Timer pausieren für ALLE Meldungen der Region, solange Zeiger oder Fokus darin sind
 *     und solange der Tab im Hintergrund ist - Restzeit läuft danach weiter, kein Neustart.
 *   - Region ist popover="manual" (Top Layer): Meldungen erscheinen auch über einem
 *     offenen modalen <dialog>.
 *   - Meldungen, die schon im Markup stehen (serverseitig), bekommen beim Start Schließen-
 *     Button und Timer (data-timeout, Default 5000; data-timeout="0" = stehen lassen).
 * Events (bubbeln, an der Meldung): ncss-notification-close
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements wird nichts registriert
 * (ncss.notify fehlt dann, Markup-Meldungen bleiben statisch sichtbar).
 */
(function () {
  "use strict";

  if (!window.customElements || customElements.get("ncss-toast-region")) {
    return;
  }

  var TEXTS = {
    de: { close: "Meldung schließen" },
    en: { close: "Dismiss notification" }
  };
  var lang = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  var POSITIONS = ["top-start", "top-center", "top-end", "bottom-start", "bottom-center", "bottom-end"];
  var hasPopover = HTMLElement.prototype.hasOwnProperty("popover");

  function isBottom(region) {
    return (region.getAttribute("position") || "top-end").indexOf("bottom") === 0;
  }

  // --- eine Meldung -----------------------------------------------------------------------
  function enhance(msg, timeout, closeLabel) {
    if (msg._ncssClose) {
      return;
    }
    if (!msg.querySelector(".ncss-notification-close")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ncss-notification-close";
      btn.setAttribute("aria-label", closeLabel || TEXTS[lang].close);
      msg.appendChild(btn);
    }
    if (!msg.querySelector(".ncss-notification-body")) {
      // Markup-Meldung ohne Body-Wrapper: Inhalt einpacken, damit das Grid (Punkt | Text |
      // Schließen) stimmt.
      var body = document.createElement("div");
      body.className = "ncss-notification-body";
      Array.prototype.slice.call(msg.childNodes).forEach(function (node) {
        if (!(node.nodeType === 1 && node.classList.contains("ncss-notification-close"))) {
          body.appendChild(node);
        }
      });
      msg.insertBefore(body, msg.firstChild);
    }

    var timer = 0;
    var started = 0;
    msg._ncssRemaining = timeout;
    msg._ncssStart = function () {
      if (!msg._ncssRemaining || msg._ncssClosed) {
        return;
      }
      clearTimeout(timer);
      started = Date.now();
      timer = setTimeout(function () { msg._ncssClose(); }, msg._ncssRemaining);
    };
    msg._ncssPause = function () {
      if (!timer) {
        return;
      }
      clearTimeout(timer);
      timer = 0;
      msg._ncssRemaining = Math.max(500, msg._ncssRemaining - (Date.now() - started));
    };
    msg._ncssClose = function () {
      if (msg._ncssClosed) {
        return;
      }
      msg._ncssClosed = true;
      clearTimeout(timer);
      var region = msg.parentElement;
      // Fokus lag im Schließen-Button: nicht ins Leere fallen lassen
      var hadFocus = msg.contains(document.activeElement);
      msg.dispatchEvent(new CustomEvent("ncss-notification-close", { bubbles: true }));
      msg.classList.add("ncss-notification--leaving");
      var done = function () {
        if (msg.isConnected) {
          msg.remove();
        }
        if (hadFocus && region) {
          var next = region.querySelector(".ncss-notification:not(.ncss-notification--leaving) .ncss-notification-close");
          if (next) {
            next.focus();
          }
        }
      };
      var dur = parseFloat(getComputedStyle(msg).transitionDuration) || 0;
      setTimeout(done, Math.min(dur * 1000, 600) + 30);
      if (region && region._ncssLayout) {
        region._ncssLayout();
      }
    };
    msg.addEventListener("click", function (event) {
      if (event.target.closest(".ncss-notification-close")) {
        msg._ncssClose();
      }
    });
  }

  // --- Region ---------------------------------------------------------------------------
  customElements.define(
    "ncss-toast-region",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) {
          return;
        }
        this._ready = true;
        var self = this;
        this._paused = false;
        if (!this.hasAttribute("aria-live")) {
          this.setAttribute("aria-live", "polite");
        }
        this.setAttribute("aria-relevant", "additions");
        if (!this.hasAttribute("aria-label")) {
          this.setAttribute("aria-label", lang === "en" ? "Notifications" : "Benachrichtigungen");
        }
        this.setAttribute("role", "region");
        if (hasPopover && !this.hasAttribute("popover")) {
          this.setAttribute("popover", "manual");
        }

        this._ncssLayout = this._layout.bind(this);
        this._mo = new MutationObserver(function () {
          self._sync();
        });
        this._mo.observe(this, { childList: true });

        var pause = function () {
          if (self._paused) {
            return;
          }
          self._paused = true;
          self._messages().forEach(function (m) { m._ncssPause(); });
        };
        var resume = function () {
          if (self.matches(":hover") || self.contains(document.activeElement) || document.hidden) {
            return;
          }
          self._paused = false;
          self._messages().forEach(function (m) { m._ncssStart(); });
        };
        this.addEventListener("pointerenter", pause);
        this.addEventListener("pointerleave", function () { setTimeout(resume, 0); });
        this.addEventListener("focusin", pause);
        this.addEventListener("focusout", function () { setTimeout(resume, 0); });
        this._onVisibility = function () {
          if (document.hidden) {
            pause();
          } else {
            resume();
          }
        };
        document.addEventListener("visibilitychange", this._onVisibility);
        this._onResize = this._layout.bind(this);
        window.addEventListener("resize", this._onResize);

        // Schon im Markup stehende Meldungen
        this._messages().forEach(function (m) {
          var t = parseInt(m.getAttribute("data-timeout"), 10);
          enhance(m, isNaN(t) ? 5000 : t);
          m._ncssStart();
        });
        this._sync();
      }

      disconnectedCallback() {
        if (this._mo) {
          this._mo.disconnect();
        }
        document.removeEventListener("visibilitychange", this._onVisibility);
        window.removeEventListener("resize", this._onResize);
        this._ready = false;
      }

      /* Meldung einfügen (neueste an der Kante der Region: oben bei top-, unten bei
         bottom-Positionen) und Timer starten. */
      add(msg) {
        if (isBottom(this)) {
          this.appendChild(msg);
        } else {
          this.insertBefore(msg, this.firstChild);
        }
        if (!this._paused) {
          msg._ncssStart();
        }
      }

      _messages() {
        return Array.prototype.filter.call(this.children, function (el) {
          return el.classList.contains("ncss-notification") && !el.classList.contains("ncss-notification--leaving");
        });
      }

      _sync() {
        var hasChildren = this.querySelector(".ncss-notification") !== null;
        if (hasPopover && this.popover) {
          var open = this.matches(":popover-open");
          if (hasChildren && !open) {
            this.showPopover();
          } else if (!hasChildren && open) {
            this.hidePopover();
          }
        }
        this._layout();
      }

      // Nur für [stack]: Reihenfolge (0 = neueste) + Abstand im aufgefächerten Zustand.
      _layout() {
        if (!this.hasAttribute("stack")) {
          return;
        }
        var live = this._messages();
        if (isBottom(this)) {
          live.reverse();
        }
        var gap = parseFloat(getComputedStyle(this).rowGap) || 8;
        var offset = 0;
        var self = this;
        live.forEach(function (m, i) {
          var natural = m.scrollHeight + (m.offsetHeight - m.clientHeight);
          m.style.setProperty("--ncss-toast-index", i);
          m.style.setProperty("--ncss-toast-offset", offset + "px");
          m.toggleAttribute("data-ncss-toast-front", i === 0);
          if (i === 0) {
            self.style.setProperty("--ncss-toast-front-height", natural + "px");
          }
          offset += natural + gap;
        });
      }
    }
  );

  // --- API --------------------------------------------------------------------------------
  function region(position, stack) {
    var pos = POSITIONS.indexOf(position) !== -1 ? position : "bottom-end";
    var el = document.querySelector('ncss-toast-region[position="' + pos + '"]');
    if (!el) {
      el = document.createElement("ncss-toast-region");
      el.setAttribute("position", pos);
      document.body.appendChild(el);
    }
    if (stack) {
      el.setAttribute("stack", "");
    }
    return el;
  }

  function notify(message, options) {
    var o = {};
    var src = (message && typeof message === "object" && !(message instanceof Node)) ? message : { message: message };
    Object.keys(src).forEach(function (k) { o[k] = src[k]; });
    if (typeof options === "string") {
      o.status = options;
    } else if (options) {
      Object.keys(options).forEach(function (k) { o[k] = options[k]; });
    }

    var reg = region(o.position, o.stack);
    var fresh = !reg._ncssUsed;
    reg._ncssUsed = true;

    var msg = document.createElement("div");
    msg.className = "ncss-notification" + (o.status ? " ncss-notification--" + o.status : "");
    if (o.status === "danger" || o.status === "warning") {
      msg.setAttribute("role", "alert");
    }
    var body = document.createElement("div");
    body.className = "ncss-notification-body";
    if (o.title) {
      var title = document.createElement("p");
      title.className = "ncss-notification-title";
      title.textContent = o.title;
      body.appendChild(title);
    }
    if (o.message instanceof Node) {
      body.appendChild(o.message);
    } else if (o.message != null && o.message !== "") {
      var text = document.createElement("p");
      text.textContent = String(o.message);
      if (!o.title) {
        text.className = "ncss-notification-title";
      }
      body.appendChild(text);
    }
    msg.appendChild(body);
    var timeout = o.timeout != null ? Number(o.timeout) : (o.status === "danger" ? 0 : 5000);
    enhance(msg, timeout, o.closeLabel);

    // Über einem modalen Dialog: Region einmal neu in den Top Layer heben (zuletzt
    // geöffnetes Element liegt oben).
    if (hasPopover && reg.matches(":popover-open") && document.querySelector("dialog:modal")) {
      reg.hidePopover();
      reg.showPopover();
    }
    // Frisch erzeugte Live-Region: einen Moment warten, sonst wird die erste Meldung
    // nicht angesagt.
    if (fresh && !reg.children.length) {
      setTimeout(function () { reg.add(msg); }, 60);
    } else {
      reg.add(msg);
    }
    return { element: msg, close: function () { msg._ncssClose(); } };
  }

  window.ncss = window.ncss || {};
  window.ncss.notify = notify;
  window.ncss.notifyCloseAll = function () {
    document.querySelectorAll("ncss-toast-region > .ncss-notification").forEach(function (m) {
      if (m._ncssClose) {
        m._ncssClose();
      }
    });
  };

  document.addEventListener("ncss-notify", function (event) {
    if (event.detail) {
      notify(event.detail);
    }
  });

  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest("[data-ncss-notify]");
    if (!btn) {
      return;
    }
    notify({
      message: btn.getAttribute("data-ncss-notify"),
      title: btn.getAttribute("data-title") || undefined,
      status: btn.getAttribute("data-status") || undefined,
      timeout: btn.hasAttribute("data-timeout") ? Number(btn.getAttribute("data-timeout")) : undefined,
      position: btn.getAttribute("data-position") || undefined,
      stack: btn.hasAttribute("data-stack")
    });
  });
})();
