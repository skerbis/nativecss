// NativeCSS-Website - pflegt die eingecheckten Dateien in demo/ aus docs-src/nav.json.
// Aufruf: node docs-src/sync-demo.mjs   (nach Änderungen an nav.json/strings.json)
//
// 1. Weiterleitungen: jede alte Demo-Seite, deren Inhalt ins Handbuch gewandert ist
//    (nav.json "redirects"), wird zu einer kleinen Meta-Refresh-Seite mit Link - externe
//    Links auf demo/forms.html usw. funktionieren weiter. Kein Script (CSP).
// 2. Beispiel-Leiste: Beispiel-Websites (nav.json "examples") behalten ihr eigenes Design
//    und bekommen oben EINE einheitliche, schmale Leiste "NativeCSS · Beispiel: Name ·
//    ← Alle Beispiele · Handbuch" plus den schwebenden Inspect-Schalter - zwischen
//    <!-- example-bar:start --> ... <!-- example-bar:end --> (nur Seiten mit Markern;
//    fremd gepflegte Beispiele setzen die Marker selbst, siehe Skript-Ausgabe).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = join(HERE, "..", "demo");
const nav = JSON.parse(readFileSync(join(HERE, "nav.json"), "utf8"));
const strings = JSON.parse(readFileSync(join(HERE, "strings.json"), "utf8"));

const titleOf = (slug, lang) => {
  if (slug === nav.start.slug) return "NativeCSS";
  for (const g of nav.groups) for (const p of g.pages) if (p.slug === slug) return p[lang];
  return slug;
};

let changed = 0;
const write = (path, html) => {
  if (existsSync(path) && readFileSync(path, "utf8") === html) return;
  writeFileSync(path, html);
  changed++;
};

// 1. Weiterleitungen (alte Demo-Seiten waren deutsch -> deutsches Handbuch)
for (const [file, slug] of Object.entries(nav.redirects)) {
  const target = `../docs/de/${slug}.html`;
  const title = titleOf(slug, "de");
  write(
    join(DEMO, file),
    `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - NativeCSS (umgezogen)</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
</head>
<body>
<!-- Erzeugt von docs-src/sync-demo.mjs - nicht von Hand bearbeiten. Inhalt dieser früheren
     Demo-Seite steht jetzt im Handbuch (Live-Beispiele auf der Themen-Seite). -->
<p>Diese Seite ist umgezogen: <a href="${target}">${title} im NativeCSS-Handbuch</a>.</p>
</body>
</html>
`,
  );
}

// 2. Beispiel-Leiste
export function exampleBar(ex, lang = "de", base = "../") {
  const s = strings[lang];
  return `<div class="demo-example-bar" data-demo-inspect-ignore>
  <a class="demo-example-bar-brand" href="${base}docs/${lang}/${nav.start.slug}.html">NativeCSS</a>
  <span class="demo-example-bar-label"><span aria-hidden="true">·</span> ${s.exampleLabel}: ${ex[lang]}</span>
  <nav class="demo-example-bar-links" aria-label="NativeCSS">
    <a href="${base}docs/${lang}/${nav.examplesPage.slug}.html">← ${s.allExamples}</a>
    <a href="${base}docs/${lang}/index.html">${s.navDocs}</a>
  </nav>
</div>
<button type="button" class="demo-inspect-fab" data-demo-inspect aria-pressed="false" title="${s.inspectTitle}"><span class="demo-inspect-fab-icon" aria-hidden="true">&lt;/&gt;</span> ${s.inspectLabel} <kbd class="demo-inspect-fab-key" aria-hidden="true">Alt I</kbd></button>`;
}

const BAR_RE = /<!-- example-bar:start -->[\s\S]*?<!-- example-bar:end -->/;
const missing = [];
for (const ex of nav.examples) {
  const path = join(DEMO, ex.href);
  if (!existsSync(path)) {
    missing.push(ex.href);
    continue;
  }
  const html = readFileSync(path, "utf8");
  if (!BAR_RE.test(html)) {
    missing.push(ex.href);
    continue;
  }
  const lang = /<html lang="en"/.test(html) ? "en" : "de";
  const base = "../".repeat(ex.href.split("/").length);
  write(path, html.replace(BAR_RE, `<!-- example-bar:start -->\n${exampleBar(ex, lang, base)}\n<!-- example-bar:end -->`));
}

console.log(`demo/ synchronisiert: ${changed} Datei(en) geändert.`);
if (missing.length) console.log(`Ohne Beispiel-Leisten-Marker (selbst gepflegt): ${missing.join(", ")}`);
