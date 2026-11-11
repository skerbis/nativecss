/**
 * ncss - Lightbox-Galerie: blättert durch alle Links mit demselben data-ncss-lightbox-Wert
 * (siehe components/lightbox.css). Ein einziges <dialog> pro Seite, erst beim ersten Klick
 * erzeugt, mit den Klassen der vorhandenen Modal-Lightbox (.ncss-modal--fullscreen
 * --dark) - Animation, Backdrop, Fokus-Trap und Esc kommen von dort bzw. vom nativen
 * <dialog>.
 *
 * Bedienung: Pfeiltasten, Vor/Zurück-Buttons, Wischen (Zeigergeste, > 50px), Klick neben
 * das Bild schließt. Fokus kehrt nach dem Schließen zum auslösenden Link zurück.
 * Bildunterschrift: data-caption, sonst alt des Vorschaubildes. Das jeweils nächste Bild
 * wird vorgeladen.
 *
 * Texte: Deutsch/Englisch nach <html lang> (wie events.js/downloads.js), einzeln
 * überschreibbar per data-lightbox-close/-prev/-next/-label/-of am <html>.
 *
 * Mit gedrückter Strg/Cmd/Shift-Taste oder Mittelklick bleibt der Link ein normaler Link
 * (neuer Tab etc.) - die Lightbox greift nur beim einfachen Klick.
 */
(function () {
  "use strict";

  if (typeof HTMLDialogElement === "undefined" || typeof HTMLDialogElement.prototype.showModal !== "function") {
    return;
  }

  var TEXTS = {
    de: { close: "Schließen", prev: "Vorheriges Bild", next: "Nächstes Bild", label: "Bildansicht", of: "von" },
    en: { close: "Close", prev: "Previous image", next: "Next image", label: "Image viewer", of: "of" }
  };
  var root = document.documentElement;
  var lang = (root.getAttribute("lang") || "de").slice(0, 2) === "en" ? "en" : "de";
  function text(key) {
    return root.getAttribute("data-lightbox-" + key) || TEXTS[lang][key];
  }

  var dialog, img, caption, count;
  var items = [];
  var index = 0;
  var opener = null;

  function button(cls, label, iconClass) {
    return '<button type="button" class="' + cls + '" aria-label="' + label + '">' +
      '<span class="ncss-icon ' + iconClass + '" aria-hidden="true"></span></button>';
  }

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "ncss-modal ncss-modal--fullscreen ncss-modal--dark ncss-lightbox";
    dialog.setAttribute("aria-label", text("label"));
    dialog.innerHTML =
      '<figure class="ncss-lightbox-figure"><img alt=""></figure>' +
      '<div class="ncss-lightbox-bar"><span class="ncss-lightbox-caption" aria-live="polite"></span>' +
      '<span class="ncss-lightbox-count"></span></div>' +
      button("ncss-dialog-close", text("close"), "ncss-icon-close") +
      button("ncss-lightbox-prev", text("prev"), "ncss-icon-chevron-down") +
      button("ncss-lightbox-next", text("next"), "ncss-icon-chevron-down");
    document.body.appendChild(dialog);
    img = dialog.querySelector("img");
    caption = dialog.querySelector(".ncss-lightbox-caption");
    count = dialog.querySelector(".ncss-lightbox-count");

    dialog.querySelector(".ncss-dialog-close").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector(".ncss-lightbox-prev").addEventListener("click", function () { show(index - 1); });
    dialog.querySelector(".ncss-lightbox-next").addEventListener("click", function () { show(index + 1); });
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(index - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        show(index + 1);
      }
    });
    // Klick auf die freie Fläche neben dem Bild schließt (wie ein Backdrop-Klick).
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog || event.target.classList.contains("ncss-lightbox-figure")) {
        dialog.close();
      }
    });
    dialog.addEventListener("close", function () {
      root.style.overflow = "";
      if (opener) {
        opener.focus();
      }
    });
    var startX = null;
    dialog.addEventListener("pointerdown", function (event) {
      startX = event.isPrimary ? event.clientX : null;
    });
    dialog.addEventListener("pointerup", function (event) {
      if (startX === null) {
        return;
      }
      var dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) {
        show(index + (dx < 0 ? 1 : -1));
      }
    });
    img.addEventListener("load", function () { img.classList.remove("is-loading"); });
  }

  function show(i) {
    if (items.length === 0) {
      return;
    }
    index = (i + items.length) % items.length;
    var link = items[index];
    var thumb = link.querySelector("img");
    var label = link.getAttribute("data-caption") || (thumb ? thumb.alt : "") || "";
    img.classList.add("is-loading");
    img.src = link.href;
    img.alt = label;
    caption.textContent = label;
    count.textContent = index + 1 + " " + text("of") + " " + items.length;
    if (items.length > 1) {
      new Image().src = items[(index + 1) % items.length].href;
    }
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-ncss-lightbox]");
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    if (!dialog) {
      build();
    }
    var group = link.getAttribute("data-ncss-lightbox");
    items = Array.prototype.filter.call(document.querySelectorAll("a[data-ncss-lightbox]"), function (a) {
      return a.getAttribute("data-ncss-lightbox") === group;
    });
    opener = link;
    if (items.length < 2) {
      dialog.setAttribute("data-single", "");
    } else {
      dialog.removeAttribute("data-single");
    }
    show(items.indexOf(link));
    root.style.overflow = "hidden";
    dialog.showModal();
  });
})();
