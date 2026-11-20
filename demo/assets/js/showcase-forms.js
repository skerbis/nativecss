// NativeCSS-Rundgang, Kapitel Formulare (demo/showcase/forms*.html) - nur Demo, nicht Teil
// der Bibliothek. Zeigt den aktuellen Wert eines Reglers in seinem <output> an:
//   <input type="range" id="x" data-demo-output="xOut" data-demo-unit=" €">
//   <output id="xOut" for="x">180 €</output>
// (data-demo-prefix="€" für ein vorangestelltes Zeichen, z. B. auf Englisch "€180")
// Ohne dieses Skript bleibt der im Markup stehende Startwert sichtbar.
(function () {
  var ranges = document.querySelectorAll("input[type='range'][data-demo-output]");
  Array.prototype.forEach.call(ranges, function (range) {
    var out = document.getElementById(range.getAttribute("data-demo-output"));
    if (!out) return;
    var prefix = range.getAttribute("data-demo-prefix") || "";
    var unit = range.getAttribute("data-demo-unit") || "";
    function update() {
      out.textContent = prefix + range.value + unit;
    }
    range.addEventListener("input", update);
    update();
  });
})();
