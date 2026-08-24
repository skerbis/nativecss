// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): Live-Farbeditor nur
// für demo/colors.html. Setzt jede Basisfarbe als Inline-Style auf <html> - gewinnt
// dadurch automatisch gegen JEDE Stylesheet-Regel (auch [data-palette]/[data-theme]),
// keine eigene Spezifitäts-Behandlung nötig. Die abgeleiteten Skalen (color-mix() in
// colors.css) lesen denselben Custom-Property-Namen und rechnen bei jeder Änderung
// automatisch neu - siehe README "Theme anpassen"/demo/theming.html für die Erklärung,
// warum das NUR auf :root zuverlässig funktioniert (eine lokal auf einem Nachfahren
// gesetzte Überschreibung würde die bereits vererbten, fertig berechneten Ableitungen
// NICHT neu auflösen).
//
// Light UND Dark bleiben GETRENNT pflegbar (User-Frage: "müsste ich im picker nicht
// auch die Farbwerte für dark und light pflegen? aktuell geht ja nur light" - zu Recht,
// die erste Fassung setzte einen FESTEN Hex-Wert statt eines echten light-dark()-Paars,
// überschrieb dadurch beide Modi mit derselben Farbe). lightValues/darkValues halten
// BEIDE Hälften unabhängig im Speicher, jede Änderung baut daraus sofort
// "light-dark(hell, dunkel)" neu zusammen und setzt DAS als Override - nie einen
// nackten Hex-Wert.
(function () {
  var colorEditorFields = document.querySelectorAll("#colorEditorFields input[type=color]");
  if (!colorEditorFields.length) return;
  var schemeLightBtn = document.getElementById("colorEditorSchemeLight");
  var schemeDarkBtn = document.getElementById("colorEditorSchemeDark");
  var editingScheme = "light";
  var lightValues = {};
  var darkValues = {};
  var defaultsCaptured = false;

  function rgbStringToHex(rgbString) {
    var match = rgbString.match(/\d+/g);
    if (!match) return "#000000";
    return "#" + match.slice(0, 3).map(function (n) {
      return Number(n).toString(16).padStart(2, "0");
    }).join("");
  }

  // getComputedStyle(...).getPropertyValue("--x") liefert bei einem Custom Property NUR
  // den roh gespeicherten Token-Text zurück (z.B. das UNAUFGELÖSTE "light-dark(#0057d8,
  // #6ea8ff)"), keine fertig berechnete Farbe - light-dark() wird erst aufgelöst, wenn
  // der Wert tatsächlich an einer echten Farb-Eigenschaft (color/background-color/...)
  // verwendet wird. Ein unsichtbares Sonden-Element mit "color: var(--token)" zwingt genau
  // diese Auflösung. color-scheme DIREKT auf demselben Sonden-Element erzwingt zusätzlich
  // GEZIELT Light ODER Dark, unabhängig vom aktuell aktiven Seiten-Theme (dasselbe Muster
  // wie .ncss-scheme-light/-dark, helpers/surfaces.css) - color-scheme UND color müssen
  // dafür beide DIREKT auf diesem einen Element gesetzt werden, nicht nur color-scheme
  // allein (siehe Kommentar dort: color-scheme wirkt sich nur auf light-dark()-Aufrufe
  // INNERHALB des Elements aus, kann einen von einem Vorfahren schon fertig aufgelösten,
  // NUR GEERBTEN Wert nicht rückwirkend ändern - hier aber unproblematisch, weil color
  // hier ohnehin jedes Mal frisch am Sonden-Element selbst gesetzt wird, nichts geerbt
  // werden muss).
  var colorProbe = document.createElement("span");
  colorProbe.style.display = "none";
  document.body.appendChild(colorProbe);

  function resolveTokenHex(token, scheme) {
    colorProbe.style.colorScheme = scheme;
    colorProbe.style.color = "var(" + token + ")";
    return rgbStringToHex(getComputedStyle(colorProbe).color);
  }

  function captureDefaultsOnce() {
    if (defaultsCaptured) return;
    colorEditorFields.forEach(function (input) {
      var token = input.dataset.token;
      lightValues[token] = resolveTokenHex(token, "light");
      darkValues[token] = resolveTokenHex(token, "dark");
    });
    defaultsCaptured = true;
  }

  function syncColorEditorFields() {
    var values = editingScheme === "light" ? lightValues : darkValues;
    colorEditorFields.forEach(function (input) {
      input.value = values[input.dataset.token];
    });
  }

  function setEditingScheme(scheme) {
    editingScheme = scheme;
    schemeLightBtn.setAttribute("aria-pressed", String(scheme === "light"));
    schemeDarkBtn.setAttribute("aria-pressed", String(scheme === "dark"));
    // aria-pressed allein hat keine eigene Optik (reines a11y-Attribut) - Varianten-Klasse
    // zusätzlich tauschen macht den aktiven Modus auch SEHEND erkennbar.
    schemeLightBtn.classList.toggle("ncss-btn--primary", scheme === "light");
    schemeLightBtn.classList.toggle("ncss-btn--secondary", scheme !== "light");
    schemeDarkBtn.classList.toggle("ncss-btn--primary", scheme === "dark");
    schemeDarkBtn.classList.toggle("ncss-btn--secondary", scheme !== "dark");
    syncColorEditorFields();
  }

  schemeLightBtn.addEventListener("click", function () { setEditingScheme("light"); });
  schemeDarkBtn.addEventListener("click", function () { setEditingScheme("dark"); });
  setEditingScheme("light");

  document.getElementById("colorEditorOpen").addEventListener("click", function () {
    captureDefaultsOnce();
    syncColorEditorFields();
  });

  colorEditorFields.forEach(function (input) {
    input.addEventListener("input", function () {
      var token = input.dataset.token;
      (editingScheme === "light" ? lightValues : darkValues)[token] = input.value;
      document.documentElement.style.setProperty(token, "light-dark(" + lightValues[token] + ", " + darkValues[token] + ")");
    });
  });

  document.getElementById("colorEditorReset").addEventListener("click", function () {
    colorEditorFields.forEach(function (input) {
      document.documentElement.style.removeProperty(input.dataset.token);
    });
    defaultsCaptured = false;
    captureDefaultsOnce();
    syncColorEditorFields();
  });
})();
