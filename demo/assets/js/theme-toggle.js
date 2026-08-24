// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): Theme-Umschalter
// (System -> Hell -> Dunkel -> ...) für Seiten mit #themeToggle/#themeLabel im Markup
// (aktuell demo/index.html, demo/colors.html). Setzt [data-theme] auf <html>, dasselbe
// Attribut, das colors.css für den manuellen Override liest - kein eigener Mechanismus.
(function () {
  var toggle = document.getElementById("themeToggle");
  var label = document.getElementById("themeLabel");
  if (!toggle || !label) return;
  var order = ["system", "light", "dark"];
  var labels = { system: "System", light: "Hell", dark: "Dunkel" };
  var current = "system";

  toggle.addEventListener("click", function () {
    current = order[(order.indexOf(current) + 1) % order.length];
    if (current === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", current);
    }
    label.textContent = labels[current];
  });
})();
