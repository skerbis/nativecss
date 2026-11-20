/**
 * ncss - Video-Vorschaukarten (components/video-card.css): spielt das <video> in
 * .ncss-video-card-media ab, solange die Karte mit der Maus berührt (nur bei echtem
 * Hover-Zeiger) oder per Tastatur fokussiert ist; beim Verlassen pausiert es und springt
 * auf den Anfang zurück, damit wieder das Poster-Bild erscheint. Kein Custom Element -
 * die Karte ist normales Link-Markup, das Script ergänzt nur das Abspielen.
 *
 * Reduzierte Bewegung, Save-Data: es wird nichts geladen oder abgespielt.
 * Benötigt: components/video-card.css. Keine anderen ncss-Scripts.
 */
(function () {
  "use strict";

  if (typeof HTMLMediaElement === "undefined" || typeof Element.prototype.closest !== "function") {
    return;
  }

  var hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function allowed() {
    return !motionQuery.matches && !(navigator.connection && navigator.connection.saveData);
  }
  function videoOf(card) {
    return card.querySelector(".ncss-video-card-media > video");
  }
  function start(card) {
    var video = videoOf(card);
    if (!video || !allowed()) {
      return;
    }
    video.muted = true;
    card.classList.add("is-previewing");
    var p = video.play();
    if (p && p.catch) {
      p.catch(function () { card.classList.remove("is-previewing"); });
    }
  }
  function stop(card) {
    var video = videoOf(card);
    card.classList.remove("is-previewing");
    if (video && !video.paused) {
      video.pause();
      video.currentTime = 0;
    }
  }

  document.addEventListener("pointerover", function (event) {
    var card = event.target.closest && event.target.closest(".ncss-video-card");
    if (card && hoverQuery.matches && event.pointerType === "mouse" && !card.contains(event.relatedTarget)) {
      start(card);
    }
  });
  document.addEventListener("pointerout", function (event) {
    var card = event.target.closest && event.target.closest(".ncss-video-card");
    if (card && !card.contains(event.relatedTarget) && !card.contains(document.activeElement)) {
      stop(card);
    }
  });
  document.addEventListener("focusin", function (event) {
    var card = event.target.closest && event.target.closest(".ncss-video-card");
    if (card && event.target.matches(":focus-visible")) {
      start(card);
    }
  });
  document.addEventListener("focusout", function (event) {
    var card = event.target.closest && event.target.closest(".ncss-video-card");
    if (card && !card.contains(event.relatedTarget) && !card.matches(":hover")) {
      stop(card);
    }
  });
})();
