// ncss - Doku-Website (nicht Teil der ausgelieferten Bibliothek): treibt den Breiten-
// Regler im Handbuch-Beispiel für <ncss-nav-priority> (demo/navigation.html). Setzt die
// Breite des <iframe> direkt per Regler statt über CSS resize:horizontal - dessen wenige
// Pixel große Ecken-Trefferfläche funktioniert nicht per Touch/Trackpad (siehe SKILL.md,
// dasselbe Rezept wie cards-radius-slider.js für den Card-Radius-Regler).
(function () {
  var slider = document.getElementById("navPriorityWidthSlider");
  var output = document.getElementById("navPriorityWidthOutput");
  var frame = document.getElementById("navPriorityFrame");
  if (!slider || !output || !frame) return;
  slider.addEventListener("input", function () {
    frame.style.width = slider.value + "px";
    output.textContent = slider.value + "px";
  });
})();
