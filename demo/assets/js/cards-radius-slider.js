// ncss - Doku-Website (nicht Teil der ausgelieferten Bibliothek): treibt den Breiten-
// Regler im Handbuch-Beispiel für .ncss-radius-adaptive-lg (docs-src/content/{de,en}/
// cards.html#adaptiver-radius). Setzt die Breite des <iframe> direkt per Regler statt
// über CSS resize:horizontal - dessen wenige Pixel große Ecken-Trefferfläche funktioniert
// nicht per Touch/Trackpad (zweimal per User-Report bestätigt, siehe SKILL.md). Kann
// unverändert defer laden (kein Flash-Risiko wie beim Sidebar-Toggle-Script) - die
// Regler-/iframe-Startwerte stehen bereits statisch im Markup, das Script muss nur vor
// der ersten Interaktion bereit sein.
(function () {
  var slider = document.getElementById("radiusWidthSlider");
  var output = document.getElementById("radiusWidthOutput");
  var frame = document.getElementById("radiusFrame");
  if (!slider || !output || !frame) return;
  slider.addEventListener("input", function () {
    frame.style.width = slider.value + "px";
    output.textContent = slider.value + "px";
  });
})();
