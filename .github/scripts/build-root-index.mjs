// NativeCSS - erzeugt beim GitHub-Pages-Build eine index.html an der Site-Wurzel, die
// demo/product.html 1:1 entspricht (nur die relativen Pfade angepasst - product.html liegt
// im echten Repo eine Ebene tiefer als die Site-Wurzel). Kein Redirect: der Besuch von
// https://skerbis.github.io/nativecss/ zeigt direkt den echten Inhalt. Das Repo selbst
// behält seine saubere Struktur (Produktseite in demo/, Bibliothek in dist/) - diese Datei
// existiert NUR im Deploy-Artefakt (_site/), nie im Git-Tree.
//
// Ersetzungsregeln sind bewusst als exakte, vollständige String-Paare geschrieben (keine
// generische Regex über beliebiges href=/src=) - deckt genau die Pfade ab, die
// demo/product.html tatsächlich verwendet (per `grep -oE '(href|src)="[^"]*"'` geprüft).
// Ändert sich product.html strukturell (neuer Pfad-Typ), schlägt die Prüfung unten hörbar
// fehl statt still falsche/unveränderte Pfade durchzulassen.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SITE_DIR = process.argv[2] || "_site";
const SRC = `${SITE_DIR}/demo/product.html`;
const DEST = `${SITE_DIR}/index.html`;

if (!existsSync(SRC)) {
  console.error(`Erwartete Quelldatei fehlt: ${SRC}`);
  process.exit(1);
}

const replacements = [
  ['href="../dist/', 'href="dist/'],
  ['src="../dist/', 'src="dist/'],
  ['href="../vendor/', 'href="vendor/'],
  ['src="../vendor/', 'src="vendor/'],
  ['href="../LICENSE"', 'href="LICENSE"'],
  ['href="../docs/', 'href="docs/'],
  ['href="../favicon.svg"', 'href="favicon.svg"'],
  ['src="assets/', 'src="demo/assets/'],
  ['href="assets/', 'href="demo/assets/'],
  ['href="index.html"', 'href="demo/index.html"'],
  ['href="docs.html"', 'href="demo/docs.html"'],
  ['href="product.html"', 'href="index.html"'],
];

let html = readFileSync(SRC, "utf8");
for (const [from, to] of replacements) {
  html = html.replaceAll(from, to);
}

// Sanity-Check: nach den Ersetzungen darf kein "../" mehr auf ein echtes Asset zeigen (die
// Datei sitzt jetzt an der Site-Wurzel, "../" würde über die Domain hinausgehen). Reine
// Code-Beispiel-Texte im <pre><code> (z.B. das escapte "href=\"ncss.css\"" ohne Präfix)
// sind davon nicht betroffen, die matchen keine der obigen "../"-Muster.
if (html.includes('="../')) {
  console.error("Nicht aufgelöste \"../\"-Referenz nach dem Rewrite gefunden - Skript prüfen.");
  process.exit(1);
}

// Zweiter Sanity-Check: derselbe Gedanke, aber für Pfade OHNE "../"-Präfix, die trotzdem
// nur relativ zu demo/ (product.htmls echtem Ort im Repo) funktionieren, nicht relativ zur
// Site-Wurzel - der erste Check oben hätte genau diese Klasse nicht erfasst (kein "../"
// vorhanden, per echtem 404 in Produktion gefunden: src="assets/js/prism-manual.js" ohne
// "../"-Präfix, weil es innerhalb von demo/ schon vorher korrekt relativ war). Deckt aktuell
// "assets/" ab (bislang einzige bekannte Instanz dieser Fallklasse) - bei einem neuen
// bare-relative Pfad-Typ hier ergänzen, sobald einer auftaucht.
if (/(?:href|src)="assets\//.test(html)) {
  console.error("Nicht aufgelöste \"assets/\"-Referenz (ohne \"../\"-Präfix) nach dem Rewrite gefunden - Skript prüfen.");
  process.exit(1);
}

writeFileSync(DEST, html);
console.log(`Root-index.html erzeugt: ${DEST} (aus ${SRC})`);
