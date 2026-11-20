/**
 * ncss - "Klick daneben schließt" (Light Dismiss) für ncss-Dialoge: .ncss-modal,
 * .ncss-offcanvas (inkl. Nav-Panel), .ncss-command (Befehlspalette), Lightbox.
 *
 * Nativ heißt das <dialog closedby="any">: Klick auf den Backdrop UND Esc schließen. Dieses
 * Script macht das zum DEFAULT, ohne dass jedes Markup das Attribut tragen muss:
 *   (a) jeder passende <dialog> OHNE closedby-Attribut bekommt closedby="any" - beim Laden,
 *       bei ncss-content-change (detail.root) und spätestens beim Öffnen (toggle-Event),
 *       egal ob per command="show-modal", showModal() oder js/command-fallback.js;
 *   (b) Browser ohne closedby (HTMLDialogElement.prototype.closedBy fehlt): dasselbe
 *       Verhalten emuliert - pointerdown UND click müssen beide AUSSERHALB der Panel-Box
 *       auf dem Dialog selbst (= Backdrop) liegen. Eine Textmarkierung, die im Panel
 *       beginnt und daneben endet, schließt dadurch NICHT. Geschlossen wird per
 *       requestClose() (feuert "cancel" - event.preventDefault() hält den Dialog offen),
 *       ohne requestClose ein selbst gefeuertes, abbrechbares "cancel" + close().
 *
 * Abschalten pro Dialog - einfach das native Attribut selbst setzen, das Script fasst einen
 * Dialog MIT closedby nie an:
 *   closedby="closerequest"   nur Esc + Buttons (kein Klick daneben)
 *   closedby="none"           nur Buttons (z.B. lange Formulare; im Emulations-Pfad wird
 *                             dann auch Esc abgefangen)
 *
 * Fokus: der Browser gibt ihn beim Schließen eines per showModal() geöffneten Dialogs
 * selbst an den Auslöser zurück - unabhängig davon, wie geschlossen wurde.
 *
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne <dialog>-Unterstützung tut es nichts.
 */
(function () {
  "use strict";

  if (typeof HTMLDialogElement !== "function" || window.ncssDialogLightDismissLoaded) {
    return;
  }
  window.ncssDialogLightDismissLoaded = true;

  var SELECTOR = "dialog.ncss-modal, dialog.ncss-offcanvas, dialog.ncss-command, dialog.ncss-lightbox";
  var native = "closedBy" in HTMLDialogElement.prototype;
  var done = typeof WeakSet === "function" ? new WeakSet() : null;

  function mark(dialog) {
    if (done && done.has(dialog)) {
      return;
    }
    if (done) {
      done.add(dialog);
    }
    if (!dialog.hasAttribute("closedby")) {
      dialog.setAttribute("closedby", "any");
    }
  }

  function scan(root) {
    if (!root) {
      return;
    }
    if (root.matches && root.matches(SELECTOR)) {
      mark(root);
    }
    if (root.querySelectorAll) {
      Array.prototype.forEach.call(root.querySelectorAll(SELECTOR), mark);
    }
  }

  // Spätestens beim Öffnen - erfasst auch Dialoge, die ohne ncss-content-change eingefügt
  // wurden (toggle bubbelt nicht, daher in der Capture-Phase am document).
  document.addEventListener("toggle", function (event) {
    var d = event.target;
    if (d && d.matches && d.matches(SELECTOR)) {
      mark(d);
    }
  }, true);

  if (!native) {
    var mode = function (dialog) {
      return (dialog.getAttribute("closedby") || "any").toLowerCase();
    };
    var outside = function (dialog, event) {
      var r = dialog.getBoundingClientRect();
      return event.clientX < r.left || event.clientX > r.right ||
        event.clientY < r.top || event.clientY > r.bottom;
    };
    var downOn = null;

    document.addEventListener("pointerdown", function (event) {
      var d = event.target;
      downOn = d && d.matches && d.matches(SELECTOR) && d.open && mode(d) === "any" &&
        outside(d, event) ? d : null;
    }, true);

    document.addEventListener("click", function (event) {
      var d = downOn;
      downOn = null;
      if (!d || event.target !== d || !d.open || !outside(d, event)) {
        return;
      }
      if (typeof d.requestClose === "function") {
        d.requestClose();
      } else if (d.dispatchEvent(new Event("cancel", { cancelable: true }))) {
        d.close();
      }
    }, true);

    // closedby="none": auch Esc darf dann nicht schließen.
    document.addEventListener("cancel", function (event) {
      var d = event.target;
      if (d && d.matches && d.matches("dialog[closedby='none' i]")) {
        event.preventDefault();
      }
    }, true);
  }

  function start() {
    scan(document);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
