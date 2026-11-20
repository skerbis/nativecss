// NativeCSS - erzeugt beim GitHub-Pages-Build eine index.html an der Site-Wurzel, die der
// generierten deutschen Startseite docs/de/start.html 1:1 entspricht (nur die relativen
// Pfade angepasst - die Startseite liegt zwei Ebenen tiefer als die Site-Wurzel). Kein
// Redirect: der Besuch von https://skerbis.github.io/nativecss/ zeigt direkt den echten
// Inhalt. Diese Datei existiert NUR im Deploy-Artefakt (_site/), nie im Git-Tree.
// Voraussetzung: docs/ wurde vorher gebaut (node docs-src/build.mjs).
//
// Ersetzungsregeln sind exakte String-Paare (keine generische Regex über beliebiges
// href=/src=). Die Paare für Seiten-Links werden aus der echten Dateiliste von docs/de/
// erzeugt (je Seite href="seite.html" und href="seite.html#") - weiterhin exakte Paare,
// nur nicht von Hand getippt. Ändert sich die Startseite strukturell (neuer Pfad-Typ),
// schlagen die Prüfungen unten hörbar fehl statt still falsche Pfade durchzulassen.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";

const SITE_DIR = process.argv[2] || "_site";
const SRC = `${SITE_DIR}/docs/de/start.html`;
const DEST = `${SITE_DIR}/index.html`;

if (!existsSync(SRC)) {
  console.error(`Erwartete Quelldatei fehlt: ${SRC} - vorher node docs-src/build.mjs ausführen.`);
  process.exit(1);
}

const replacements = [
  // Repo-Wurzel-Pfade (dist/, vendor/, demo/, favicon, LICENSE ...): "../../" entfällt.
  ['href="../../', 'href="'],
  ['src="../../', 'src="'],
  ['url(../../', 'url('],
  ['url("../../', 'url("'],
  // Andere Sprache: liegt an der Wurzel unter docs/en/.
  ['href="../en/', 'href="docs/en/'],
  // Suchindex der Kopfleisten-Suche (<ncss-command-palette src>): liegt in docs/.
  ['src="../search.de.json"', 'src="docs/search.de.json"'],
];
// Seiten im selben Ordner (docs/de/): an der Wurzel mit Präfix docs/de/. Die Startseite
// selbst wird zur Wurzel-index.html.
for (const file of readdirSync(`${SITE_DIR}/docs/de`).filter((f) => f.endsWith(".html")).sort()) {
  const to = file === "start.html" ? "index.html" : `docs/de/${file}`;
  replacements.push([`href="${file}"`, `href="${to}"`]);
  replacements.push([`href="${file}#`, `href="${to}#`]);
}

let html = readFileSync(SRC, "utf8");
for (const [from, to] of replacements) {
  html = html.replaceAll(from, to);
}

// Code-Beispiele (<pre>) enthalten absichtlich Beispielpfade wie href="ncss/ncss.css" -
// die Prüfungen laufen deshalb nur über das Markup außerhalb von <pre>.
const markup = html.replace(/<pre[\s\S]*?<\/pre>/g, "");

// Sanity-Check 1: kein "../" mehr (würde an der Wurzel über die Domain hinauszeigen).
// Code-Beispiele im <pre> sind escaped und matchen das Muster nicht.
if (markup.includes('="../') || markup.includes("url(../")) {
  console.error('Nicht aufgelöste "../"-Referenz nach dem Rewrite gefunden - Skript prüfen.');
  process.exit(1);
}

// Sanity-Check 2: jeder relative Link auf eine .html-Datei braucht ein bekanntes Präfix
// (docs/, demo/) oder ist die Wurzel-index.html selbst - sonst zeigt er ins Leere.
const bareHtml = markup.match(/href="(?!https?:|mailto:|#|demo\/|docs\/|index\.html)[^"]*\.html[^"]*"/);
if (bareHtml) {
  console.error(`Nicht aufgelöster relativer Seiten-Link nach dem Rewrite: ${bareHtml[0]} - Skript prüfen.`);
  process.exit(1);
}

// Sanity-Check 3: bare relative Asset-Pfade, die nur relativ zu docs/de/ stimmten.
const bareAsset = markup.match(/(?:href|src)="(?!https?:|data:|#|\/|dist\/|vendor\/|demo\/|docs\/|favicon\.svg|LICENSE|index\.html)[^"]+"/);
if (bareAsset) {
  console.error(`Unbekannter relativer Pfad nach dem Rewrite: ${bareAsset[0]} - Skript prüfen.`);
  process.exit(1);
}

writeFileSync(DEST, html);
console.log(`Root-index.html erzeugt: ${DEST} (aus ${SRC})`);
