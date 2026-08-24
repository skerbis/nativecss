// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): muss VOR
// vendor/prismjs/prism-core.min.js geladen werden (kein defer/async - synchron in
// Dokumentreihenfolge), sonst highlightet Prism beim DOMContentLoaded selbst schon
// einmal unkontrolliert, bevor dist/components/code-block.js den Copy-Button injizieren
// konnte. Siehe code-block.css für die vollständige Einbindungs-Reihenfolge.
window.Prism = { manual: true };
