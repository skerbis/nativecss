// ncss - opt-in: unterdrückt Autoplay für .ncss-hero-media > video[autoplay], wenn
// prefers-reduced-motion:reduce aktiv ist. Reines CSS kann eine <video>-Wiedergabe nicht
// steuern (anders als z.B. animation-timeline bei .ncss-hero--parallax) - deshalb dieses
// kleine, eigenständige Script statt eines CSS-Tricks. Video bleibt sichtbar (Poster/erstes
// Bild), nur die automatische Wiedergabe wird verhindert. Nur auf Seiten mit
// Hintergrund-Video einbinden, siehe components/hero.css.
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(".ncss-hero-media > video[autoplay]").forEach((video) => {
    video.removeAttribute("autoplay");
    video.pause();
  });
}
