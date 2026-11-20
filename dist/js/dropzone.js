/**
 * ncss - <ncss-dropzone>: Drag & Drop + Dateiliste für ein ECHTES <input type="file">
 * (Markup/Optik siehe components/dropzone.css). Reines Light-DOM-Custom-Element, kein
 * Upload: das Script verwaltet nur die AUSWAHL clientseitig - übertragen wird wie immer
 * über das native Feld beim Formular-Versand (oder eigenes fetch() mit FormData).
 *
 * Kern-Trick: input.files lässt sich nur über ein DataTransfer-Objekt neu setzen. Fehlt
 * der DataTransfer-Konstruktor (sehr alte Browser), wird das Element GAR NICHT
 * registriert (Guard um customElements.define, siehe Skill) - es bleibt :not(:defined),
 * das native Feld bleibt sichtbar und funktioniert normal.
 *
 * Attribute (alle optional):
 *   data-ncss-max-size="10MB"   Höchstgröße je Datei (Zahl = Bytes, oder kB/MB/GB)
 *   data-ncss-text-*            eigene Texte (remove, status, type, size), {name}/{n}/{max}
 *                               als Platzhalter - Default deutsch/englisch nach lang
 * Accept-Filter: das accept-Attribut des Inputs gilt auch für GEZOGENE Dateien (der
 * Browser prüft es nur im Auswahldialog).
 *
 * Event: "ncss-dropzone-change" (bubbles) mit detail.files (Array<File>) nach jeder
 * Änderung - zusätzlich feuert das native Feld "change"/"input", damit bestehende
 * Formular-Logik (Validierung, htmx etc.) die neue Auswahl mitbekommt.
 */
(function () {
  "use strict";

  if (typeof customElements === "undefined" || customElements.get("ncss-dropzone")) return;
  try {
    new DataTransfer();
  } catch (e) {
    return;
  }

  var TEXT = {
    de: {
      remove: "{name} entfernen",
      status: "{n} Datei(en) ausgewählt",
      list: "Ausgewählte Dateien",
      type: "{name}: Dateityp nicht erlaubt",
      size: "{name}: größer als {max}"
    },
    en: {
      remove: "Remove {name}",
      status: "{n} file(s) selected",
      list: "Selected files",
      type: "{name}: file type not allowed",
      size: "{name}: larger than {max}"
    }
  };

  function langOf(el) {
    var host = el.closest("[lang]");
    return (host && host.getAttribute("lang")) || document.documentElement.lang || "de";
  }

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (m, key) {
      return key in values ? values[key] : m;
    });
  }

  // "10MB" / "500 kB" / "2048" -> Bytes (SI-Faktor 1000, passend zur Anzeige unten).
  function parseSize(value) {
    var m = /^\s*([\d.,]+)\s*(b|kb|mb|gb)?\s*$/i.exec(value || "");
    if (!m) return 0;
    var n = parseFloat(m[1].replace(",", "."));
    var unit = (m[2] || "b").toLowerCase();
    return n * ({ b: 1, kb: 1e3, mb: 1e6, gb: 1e9 })[unit];
  }

  function formatSize(bytes, lang) {
    var units = ["byte", "kilobyte", "megabyte", "gigabyte"];
    var i = 0;
    while (bytes >= 1000 && i < units.length - 1) {
      bytes /= 1000;
      i++;
    }
    try {
      return new Intl.NumberFormat(lang, {
        style: "unit", unit: units[i], unitDisplay: "short",
        maximumFractionDigits: i === 0 ? 0 : 1
      }).format(bytes);
    } catch (e) {
      return Math.round(bytes * 10) / 10 + " " + ["B", "kB", "MB", "GB"][i];
    }
  }

  // accept-Liste wie im Browser-Dialog: ".pdf", "image/*", "application/pdf".
  function accepts(input, file) {
    var accept = (input.getAttribute("accept") || "").trim();
    if (!accept) return true;
    var name = file.name.toLowerCase();
    var type = (file.type || "").toLowerCase();
    return accept.split(",").some(function (rule) {
      rule = rule.trim().toLowerCase();
      if (!rule) return false;
      if (rule.charAt(0) === ".") return name.slice(-rule.length) === rule;
      if (rule.slice(-2) === "/*") return type.indexOf(rule.slice(0, -1)) === 0;
      return type === rule;
    });
  }

  function sameFile(a, b) {
    return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  }

  customElements.define(
    "ncss-dropzone",
    class extends HTMLElement {
      connectedCallback() {
        if (this._ready) return;
        this._input = this.querySelector('input[type="file"]');
        this._area = this.querySelector(".ncss-dropzone-area") || this;
        if (!this._input) return;
        this._ready = true;
        this._files = [];
        this._urls = [];
        this._depth = 0;
        this._lang = langOf(this);
        this._text = TEXT[this._lang.slice(0, 2)] || TEXT.en;

        this._list = this.querySelector(".ncss-dropzone-list");
        if (!this._list) {
          this._list = document.createElement("ul");
          this._list.className = "ncss-dropzone-list";
          this._list.setAttribute("role", "list");
          this._list.setAttribute("aria-label", this._t("list"));
          this.appendChild(this._list);
        }
        this._error = document.createElement("p");
        this._error.className = "ncss-dropzone-error";
        this.appendChild(this._error);
        this._status = document.createElement("p");
        this._status.className = "ncss-dropzone-status";
        this._status.setAttribute("role", "status");
        this.appendChild(this._status);

        var self = this;
        this._input.addEventListener("change", function () {
          if (self._silent) return;
          self._add(Array.prototype.slice.call(self._input.files || []));
        });
        this._area.addEventListener("dragenter", function (e) {
          if (!self._hasFiles(e)) return;
          e.preventDefault();
          self._depth++;
          self.setAttribute("data-ncss-dragover", "");
        });
        this._area.addEventListener("dragover", function (e) {
          if (!self._hasFiles(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = self._input.disabled ? "none" : "copy";
        });
        this._area.addEventListener("dragleave", function () {
          self._depth = Math.max(0, self._depth - 1);
          if (!self._depth) self.removeAttribute("data-ncss-dragover");
        });
        this._area.addEventListener("drop", function (e) {
          if (!self._hasFiles(e)) return;
          e.preventDefault();
          self._depth = 0;
          self.removeAttribute("data-ncss-dragover");
          if (self._input.disabled) return;
          self._add(Array.prototype.slice.call(e.dataTransfer.files));
        });
        this._list.addEventListener("click", function (e) {
          var btn = e.target.closest(".ncss-dropzone-remove");
          if (!btn) return;
          var index = Number(btn.getAttribute("data-ncss-index"));
          self._files.splice(index, 1);
          self._commit();
          // Fokus nicht ins Leere fallen lassen: nächster Entfernen-Button oder die Fläche.
          var next = self._list.querySelectorAll(".ncss-dropzone-remove")[Math.min(index, self._files.length - 1)];
          (next || self._input).focus();
        });
        var form = this._input.form;
        if (form) {
          form.addEventListener("reset", function () {
            self._files = [];
            // Nach dem nativen Zurücksetzen rendern (reset läuft vor dem Leeren der Felder).
            setTimeout(function () { self._render(); }, 0);
          });
        }
        // Bereits vorbelegte Auswahl (z.B. Zurück-Navigation mit erhaltenem Formularzustand)
        if (this._input.files && this._input.files.length) {
          this._add(Array.prototype.slice.call(this._input.files));
        }
      }

      disconnectedCallback() {
        this._revoke();
      }

      get files() {
        return this._files ? this._files.slice() : [];
      }

      clear() {
        this._files = [];
        this._commit();
      }

      _hasFiles(e) {
        var types = e.dataTransfer && e.dataTransfer.types;
        return !!types && Array.prototype.indexOf.call(types, "Files") !== -1;
      }

      _add(incoming) {
        var self = this;
        var errors = [];
        var max = parseSize(this.getAttribute("data-ncss-max-size"));
        var ok = incoming.filter(function (file) {
          if (!accepts(self._input, file)) {
            errors.push(fill(self._t("type"), { name: file.name }));
            return false;
          }
          if (max && file.size > max) {
            errors.push(fill(self._t("size"), { name: file.name, max: formatSize(max, self._lang) }));
            return false;
          }
          return true;
        });
        if (this._input.multiple) {
          ok.forEach(function (file) {
            if (!self._files.some(function (f) { return sameFile(f, file); })) self._files.push(file);
          });
        } else if (ok.length) {
          this._files = [ok[0]];
        }
        // Einzel-Feld mit nur abgelehnten Dateien: alte, gültige Auswahl bleibt bestehen.
        this._error.textContent = errors.join(" · ");
        this._pendingErrors = errors;
        this._commit();
      }

      _t(key) {
        return this.getAttribute("data-ncss-text-" + key) || this._text[key];
      }

      _commit() {
        var dt = new DataTransfer();
        this._files.forEach(function (f) { dt.items.add(f); });
        this._silent = true;
        this._input.files = dt.files;
        this._input.dispatchEvent(new Event("input", { bubbles: true }));
        this._input.dispatchEvent(new Event("change", { bubbles: true }));
        this._silent = false;
        this._render();
        this.dispatchEvent(new CustomEvent("ncss-dropzone-change", {
          bubbles: true,
          detail: { files: this._files.slice() }
        }));
      }

      _revoke() {
        (this._urls || []).forEach(function (u) { URL.revokeObjectURL(u); });
        this._urls = [];
      }

      _render() {
        var self = this;
        this._revoke();
        this._list.textContent = "";
        this._files.forEach(function (file, i) {
          var li = document.createElement("li");
          li.className = "ncss-dropzone-file";
          var thumb = document.createElement("span");
          thumb.className = "ncss-dropzone-thumb";
          thumb.setAttribute("aria-hidden", "true");
          if (/^image\//.test(file.type) && typeof URL.createObjectURL === "function") {
            var url = URL.createObjectURL(file);
            self._urls.push(url);
            var img = document.createElement("img");
            img.src = url;
            img.alt = "";
            thumb.appendChild(img);
          } else {
            var ext = file.name.lastIndexOf(".") > 0 ? file.name.split(".").pop() : "?";
            thumb.textContent = ext.slice(0, 4);
          }
          var name = document.createElement("span");
          name.className = "ncss-dropzone-name";
          name.textContent = file.name;
          name.title = file.name;
          var size = document.createElement("span");
          size.className = "ncss-dropzone-size";
          size.textContent = formatSize(file.size, self._lang);
          var remove = document.createElement("button");
          remove.type = "button";
          remove.className = "ncss-dropzone-remove";
          remove.setAttribute("data-ncss-index", String(i));
          remove.setAttribute("aria-label", fill(self._t("remove"), { name: file.name }));
          remove.textContent = "×";
          li.append(thumb, name, size, remove);
          self._list.appendChild(li);
        });
        // EINE Live-Region für alles: abgelehnte Dateien + neuer Stand. Die sichtbare
        // Fehlerzeile selbst ist bewusst KEINE zweite Live-Region (sonst Doppelansage).
        var said = (this._pendingErrors || []).concat(fill(this._t("status"), { n: this._files.length }));
        this._pendingErrors = [];
        this._status.textContent = said.join(". ");
      }
    }
  );
})();
