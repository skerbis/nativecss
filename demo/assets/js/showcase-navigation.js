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
  // Der Rahmen ist per CSS auf die verfügbare Breite gedeckelt (max-inline-size:100%) -
  // die Anzeige nennt deshalb die tatsächliche Breite, nicht nur den Reglerwert (sonst
  // stünde auf dem Handy "720 px" neben einem 358 px breiten Rahmen).
  function apply() {
    frame.style.inlineSize = slider.value + "px";
    output.textContent = Math.round(frame.getBoundingClientRect().width) + " px";
  }
  slider.addEventListener("input", apply);
  window.addEventListener("resize", apply);
  apply();
})();
