// ncss - opt-in: unterdrückt Autoplay für .ncss-hero-media > video[autoplay], wenn
// prefers-reduced-motion:reduce aktiv ist. Reines CSS kann eine <video>-Wiedergabe nicht
// steuern (anders als z.B. animation-timeline bei .ncss-hero--parallax) - deshalb dieses
// kleine, eigenständige Script statt eines CSS-Tricks. Video bleibt sichtbar (Poster/erstes
// Bild), nur die automatische Wiedergabe wird verhindert. Nur auf Seiten mit
// Hintergrund-Video einbinden, siehe components/hero.css.
//
// Dynamische Inhalte: ein später eingefügter Hero wird per "ncss-content-change"-Event
// (detail.root = neu eingefügtes Element) bzw. js/content-observer.js ebenfalls erfasst.
// Mehrfaches Erfassen ist unschädlich (Attribut entfernen + pause() sind idempotent).
(function () {
  if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SELECTOR = ".ncss-hero-media > video[autoplay]";
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var list = Array.prototype.slice.call(root.querySelectorAll(SELECTOR));
    if (root.matches && root.matches(SELECTOR)) list.unshift(root);
    list.forEach(function (video) {
      video.removeAttribute("autoplay");
      video.pause();
    });
  }
  scan(document);
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
