// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): Paletten-Umschalter
// (Standard/Football/Sunset) nur für demo/colors.html. Setzt [data-palette] auf <html>,
// dasselbe Attribut, das colors.css für die alternativen Paletten liest.
(function () {
  var paletteToggle = document.getElementById("paletteToggle");
  var paletteLabel = document.getElementById("paletteLabel");
  if (!paletteToggle || !paletteLabel) return;
  var paletteOrder = ["standard", "football", "sunset"];
  var paletteLabels = { standard: "Standard", football: "Football", sunset: "Sunset" };
  var currentPalette = "standard";

  paletteToggle.addEventListener("click", function () {
    currentPalette = paletteOrder[(paletteOrder.indexOf(currentPalette) + 1) % paletteOrder.length];
    if (currentPalette === "standard") {
      document.documentElement.removeAttribute("data-palette");
    } else {
      document.documentElement.setAttribute("data-palette", currentPalette);
    }
    paletteLabel.textContent = paletteLabels[currentPalette];
  });
})();
