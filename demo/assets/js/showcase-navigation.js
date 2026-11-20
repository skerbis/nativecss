// NativeCSS-Rundgang, Kapitel Navigation (demo/showcase/navigation*.html) - nur Demo, nicht
// Teil der Bibliothek. Breiten-Regler für das <ncss-nav-priority>-Beispiel: setzt die
// Breite des Rahmens direkt, statt sich auf die winzige resize-Ecke zu verlassen (die per
// Touch/Trackpad kaum zu treffen ist). Die Priority-Nav reagiert per ResizeObserver auf
// ihren eigenen Platz - das Fenster selbst muss dafür nicht schmaler werden.
(function () {
  var slider = document.getElementById("priorityWidth");
  var output = document.getElementById("priorityWidthOut");
  var frame = document.getElementById("priorityFrame");
  if (!slider || !output || !frame) return;
  function apply() {
    frame.style.inlineSize = slider.value + "px";
    output.textContent = slider.value + " px";
  }
  slider.addEventListener("input", apply);
  apply();
})();
