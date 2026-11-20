/**
 * NativeCSS - gemeinsamer Kern für SVG-Sprites aus Phosphor-Icons (vendor/phosphor/).
 * Reines ES-Modul ohne Abhängigkeiten - genutzt vom CLI (tools/icons/sprite.mjs) UND vom
 * Sprite-Baukasten im Handbuch (demo/assets/js/icon-picker.mjs), damit beide Wege
 * byte-gleiche Sprites erzeugen.
 *
 * Dateinamen-Schema von Phosphor: regular = "house.svg", alle anderen Stärken tragen die
 * Stärke als Suffix ("house-bold.svg", "house-duotone.svg"). Dieselbe Zeichenkette wird
 * die Symbol-ID im Sprite - <use href="icons.svg#house-bold"> ist damit eindeutig, auch
 * wenn ein Sprite mehrere Stärken mischt.
 */

export const WEIGHTS = ["regular", "thin", "light", "bold", "fill", "duotone"];

// Nur Kleinbuchstaben, Ziffern, Bindestrich - schließt Pfad-Tricks ("../") aus.
export const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function fileBase(name, weight = "regular") {
  return weight === "regular" ? name : name + "-" + weight;
}

// Entfernt alles Ausführbare aus einer SVG-Zeichenkette. Phosphor-Dateien enthalten
// nichts davon - der Filter schützt, falls jemand den Ordner gegen eigene SVGs tauscht.
export function sanitizeSvg(text) {
  return String(text)
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<(script|foreignObject|iframe|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|foreignObject|iframe|style)\b[^>]*\/>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:xlink:)?href\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "");
}

// <svg viewBox="0 0 256 256" ...>INHALT</svg>  ->  <symbol id="…" viewBox="…">INHALT</symbol>
export function toSymbol(svgText, id) {
  const clean = sanitizeSvg(svgText);
  const m = clean.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
  if (!m) throw new Error("Keine gültige SVG-Datei: " + id);
  const vb = (m[1].match(/viewBox\s*=\s*["']([^"']+)["']/i) || [, "0 0 256 256"])[1];
  return `<symbol id="${id}" viewBox="${vb}" fill="currentColor">${m[2].trim()}</symbol>`;
}

export function buildSprite(symbols) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg">\n' +
    "<!-- Phosphor Icons (MIT), https://phosphoricons.com - erstellt mit NativeCSS tools/icons -->\n" +
    symbols.join("\n") +
    "\n</svg>\n"
  );
}
