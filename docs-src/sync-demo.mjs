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
// 3. Rundgang (demo/showcase/): Kopfleiste der Website + Kapitel-Leiste + "Auf dieser
//    Seite" + Inhaltsverzeichnisse, siehe unten.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = join(HERE, "..", "demo");
const nav = JSON.parse(readFileSync(join(HERE, "nav.json"), "utf8"));
const strings = JSON.parse(readFileSync(join(HERE, "strings.json"), "utf8"));
const WORDMARK = readFileSync(join(DEMO, "assets", "brand", "wordmark-inline.html"), "utf8").trim();

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
  // <aside> mit Namen: eigener Landmark, sonst steht der Leisten-Text außerhalb jeder Region
  return `<aside class="demo-example-bar" aria-label="${s.exampleLabel}: NativeCSS" data-demo-inspect-ignore>
  <a class="demo-example-bar-brand" href="${base}docs/${lang}/${nav.start.slug}.html">${WORDMARK}</a>
  <span class="demo-example-bar-label"><span aria-hidden="true">·</span> ${s.exampleLabel}: ${ex[lang]}</span>
  <nav class="demo-example-bar-links" aria-label="NativeCSS">
    <a href="${base}docs/${lang}/${nav.examplesPage.slug}.html">← ${s.allExamples}</a>
    <a href="${base}docs/${lang}/index.html">${s.navDocs}</a>
  </nav>
</aside>
<button type="button" class="demo-inspect-fab" data-demo-inspect aria-pressed="false" title="${s.inspectTitle}"><span class="demo-inspect-fab-icon" aria-hidden="true">&lt;/&gt;</span> ${s.inspectLabel} <kbd class="demo-inspect-fab-key" aria-hidden="true">Alt I</kbd></button>`;
}

const BAR_RE = /<!-- example-bar:start -->[\s\S]*?<!-- example-bar:end -->/;
// Alle HTML-Dateien in demo/ (inkl. Unterordner einer mehrseitigen Beispiel-App, ohne
// assets/) mit Markern bekommen die Leiste; das zugehörige Beispiel aus nav.json ergibt
// sich aus dem Pfad (example-immo/mieter.html -> ImmoDesk, example-gemeinde-service.html
// -> Gemeinde Seeburg).
const pages = [];
const walk = (dir, rel = "") => {
  for (const name of readdirSync(dir)) {
    if (name === "assets") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, `${rel}${name}/`);
    else if (name.endsWith(".html")) pages.push(`${rel}${name}`);
  }
};
walk(DEMO);
const exampleFor = (rel) =>
  nav.examples.find((ex) => ex.href === rel) ||
  nav.examples.find((ex) => ex.href.includes("/") && rel.startsWith(ex.href.split("/")[0] + "/")) ||
  nav.examples.find((ex) => rel.startsWith(ex.href.replace(/\.html$/, "") + "-"));
const missing = [];
for (const ex of nav.examples) {
  const path = join(DEMO, ex.href);
  if (!existsSync(path) || !BAR_RE.test(readFileSync(path, "utf8"))) missing.push(ex.href);
}
for (const rel of pages) {
  const path = join(DEMO, rel);
  const html = readFileSync(path, "utf8");
  if (!BAR_RE.test(html)) continue;
  const ex = exampleFor(rel);
  if (!ex) {
    console.warn(`Kein Beispiel in nav.json für ${rel} - Leiste übersprungen`);
    continue;
  }
  const lang = /<html lang="en"/.test(html) ? "en" : "de";
  const base = "../".repeat(rel.split("/").length);
  write(path, html.replace(BAR_RE, `<!-- example-bar:start -->\n${exampleBar(ex, lang, base)}\n<!-- example-bar:end -->`));
}

// 3. Rundgang (demo/showcase/): dieselbe Kopfleiste wie die Website, darunter Kapitel-Leiste
//    und "Auf dieser Seite" - alle drei als EINE klebende Einheit (wie im Handbuch).
//    Kopfleiste: aus der GEBAUTEN Handbuch-Übersicht docs/<lang>/index.html übernommen
//    (vorher `node docs-src/build.mjs`) - entsteht so aus denselben Funktionen wie auf der
//    Website (buildTopbar/buildActions, Template) und kann nicht auseinanderlaufen.
//    Kapitel: demo/assets/examples/showcase/chapters.json. Abschnitte (Leiste "Auf dieser
//    Seite", Inhaltsverzeichnis im Kapitel-Kopf, Gesamt-Inhaltsverzeichnis der Übersicht):
//    aus den <section class="demo-feature" id="…"> der Seiten selbst (Beschriftung:
//    data-subnav-label, sonst der h2-Text) - nichts von Hand zu pflegen.
//    Marker: <!-- site-head:start/end -->, <!-- site-topbar:start/end -->,
//    <!-- tour-toc:start/end -->.
const HEAD_RE = /<!-- site-head:start -->[\s\S]*?<!-- site-head:end -->/;
const TOPBAR_RE = /<!-- site-topbar:start -->[\s\S]*?<!-- site-topbar:end -->/;
const TOC_RE = /([ \t]*)<!-- tour-toc:start -->[\s\S]*?<!-- tour-toc:end -->/;
const TOUR = join(DEMO, "showcase");
const tour = JSON.parse(readFileSync(join(DEMO, "assets", "examples", "showcase", "chapters.json"), "utf8"));
const siteHeaderSource = {};
function siteHeaderFor(lang) {
  if (lang in siteHeaderSource) return siteHeaderSource[lang];
  const file = join(HERE, "..", "docs", lang, "index.html");
  if (!existsSync(file)) return (siteHeaderSource[lang] = null);
  const html = readFileSync(file, "utf8");
  const a = html.indexOf('<div class="site-sticky"');
  const end = "</ncss-command-palette>";
  const b = html.indexOf(end, a);
  return (siteHeaderSource[lang] = a < 0 || b < 0 ? null : html.slice(a, b + end.length));
}
const SITE_HEAD = [
  '<script src="../../dist/js/preferences-early.js"></script>',
  '<link rel="stylesheet" href="../../dist/components/preferences-fonts.css">',
  '<link rel="stylesheet" href="../assets/site-shell.css">',
  '<script src="../../dist/js/command-fallback.js" defer></script>',
  '<script src="../../dist/js/nav.js" defer></script>',
  '<script src="../../dist/js/preferences.js" defer></script>',
  '<script src="../../dist/js/subnav.js" defer></script>',
  '<script src="../../dist/js/command-palette.js" defer></script>',
  '<script src="../../dist/js/dialog-light-dismiss.js" defer></script>',
  '<script src="../../dist/js/dropdown.js" defer></script>',
  '<script src="../assets/js/showcase-tour.js" defer></script>',
].join("\n");
const stripTags = (h) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
function tourSections(html) {
  const out = [];
  const re = /<section class="demo-feature[^"]*" id="([^"]+)"([^>]*)>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = re.exec(html))) {
    const label = /data-subnav-label="([^"]+)"/.exec(m[2]);
    out.push({ id: m[1], title: stripTags(m[3]), label: label ? label[1] : stripTags(m[3]) });
  }
  return out;
}
const T = {
  de: { chapter: "Kapitel", onPage: "Auf dieser Seite", contents: "Inhalt", contentsLabel: "Inhalt dieses Kapitels", allContents: "Inhaltsverzeichnis", allLabel: "Inhaltsverzeichnis des Rundgangs" },
  en: { chapter: "Chapter", onPage: "On this page", contents: "Contents", contentsLabel: "Contents of this chapter", allContents: "Table of contents", allLabel: "Table of contents of the tour" },
};
function tourTopbar(lang, file, sections) {
  const src = siteHeaderFor(lang);
  if (!src) return null;
  const t = T[lang];
  const slug = file.replace(/(-en)?\.html$/, "");
  const sfx = lang === "de" ? "" : "-en";
  const twin = lang === "de" ? `${slug}-en.html` : `${slug}.html`;
  let out = src.replace(/ aria-current="(page|true)"/g, "");
  // Pfade: docs/<lang>/ und demo/showcase/ liegen gleich tief - "../../…" bleibt, "../x" wird
  // "../../docs/x", relative Seitenlinks zeigen ins Handbuch, der Tour-Punkt auf den Rundgang.
  out = out.replace(/\b(href|src)="([^"]*)"/g, (m, attr, url) => {
    if (/^(https?:|mailto:|#|data:)/.test(url)) return m;
    const hit = /^\.\.\/\.\.\/demo\/showcase\/(index(?:-en)?\.html)$/.exec(url);
    if (hit) return `${attr}="${hit[1]}" aria-current="${slug === "index" ? "page" : "true"}"`;
    if (url.startsWith("../../")) return m;
    if (url.startsWith("../")) return `${attr}="../../docs/${url.slice(3)}"`;
    return `${attr}="../../docs/${lang}/${url}"`;
  });
  out = out.replace(/(<a class="demo-topbar-lang" href=")[^"]*"/, `$1${twin}"`);
  const current = tour.chapters.find((c) => c.slug === slug) || tour.chapters[0];
  const link = (c, cls = "") =>
    `<a${cls}${c.slug === slug ? ' aria-current="page"' : ""} href="${c.slug}${sfx}.html">${c[lang]}</a>`;
  const pills = tour.chapters.map((c) => `      <li>${link(c)}</li>`).join("\n");
  // Kapitel als Pillen; unter 48rem (nur Seiten MIT "Auf dieser Seite") stattdessen ein
  // Auswahl-Knopf "Kapitel: …" vorn in dieser Leiste - spart auf dem Handy eine Zeile.
  const collapsible = sections.length >= 3;
  const bars = [
    `<nav class="demo-chapterbar${collapsible ? " demo-chapterbar--collapsible" : ""}" aria-label="${tour.label[lang]}">
  <div class="demo-chapterbar-inner">
    <span class="demo-chapterbar-label" aria-hidden="true">${tour.label[lang]}</span>
    <ul class="demo-chapterbar-list" role="list">
${pills}
    </ul>
  </div>
</nav>`,
  ];
  if (collapsible) {
    const items = tour.chapters.map((c) => `          <li>${link(c, ' class="ncss-dropdown-item"')}</li>`).join("\n");
    const subs = sections.map((x) => `      <li><a href="#${x.id}">${x.label}</a></li>`).join("\n");
    bars.push(`<nav class="ncss-subnav demo-onpage" aria-label="${t.onPage}" data-ncss-subnav>
  <div class="ncss-subnav-inner">
    <div class="demo-chapter-pick">
      <button type="button" class="ncss-btn ncss-dropdown-toggle demo-chapter-pick-btn" popovertarget="chapterPick">${t.chapter}: ${current[lang]}</button>
      <div class="ncss-dropdown-menu" id="chapterPick" popover>
        <ul role="list">
${items}
        </ul>
      </div>
    </div>
    <span class="ncss-subnav-label" aria-hidden="true">${t.onPage}</span>
    <ul class="ncss-subnav-list" role="list">
${subs}
    </ul>
  </div>
</nav>`);
  }
  // Die Website-Übersicht hat keine eigene Leiste: an ihre Stelle (zwischen </header> und
  // dem Ende des Sticky-Containers) kommen Kapitel-Leiste und "Auf dieser Seite".
  return out.replace(/<\/header>\s*<\/div>/, `</header>\n${bars.join("\n")}\n</div>`);
}
function chapterToc(lang, sections, pad) {
  const t = T[lang];
  const items = sections.map((x) => `${pad}    <li><a href="#${x.id}">${x.title}</a></li>`).join("\n");
  return `${pad}<nav class="demo-contents" aria-label="${t.contentsLabel}">
${pad}  <p class="demo-contents-title" aria-hidden="true">${t.contents}</p>
${pad}  <ol class="demo-contents-list">
${items}
${pad}  </ol>
${pad}</nav>`;
}
function tourToc(lang, pad) {
  const t = T[lang];
  const sfx = lang === "de" ? "" : "-en";
  const chapters = tour.chapters
    .filter((c) => c.slug !== "index")
    .map((c) => {
      const file = join(TOUR, `${c.slug}${sfx}.html`);
      const secs = existsSync(file) ? tourSections(readFileSync(file, "utf8")) : [];
      const sub = secs.map((x) => `${pad}        <li><a href="${c.slug}${sfx}.html#${x.id}">${x.title}</a></li>`).join("\n");
      return `${pad}    <li>
${pad}      <a class="demo-alltoc-chapter" href="${c.slug}${sfx}.html">${c[lang]}</a>
${pad}      <ol>
${sub}
${pad}      </ol>
${pad}    </li>`;
    })
    .join("\n");
  return `${pad}<nav class="demo-alltoc ncss-container" aria-labelledby="alltoc-h">
${pad}  <h2 id="alltoc-h">${t.allContents}</h2>
${pad}  <ol class="demo-alltoc-list">
${chapters}
${pad}  </ol>
${pad}</nav>`;
}
let tourMissing = false;
if (existsSync(TOUR)) {
  for (const name of readdirSync(TOUR)) {
    if (!name.endsWith(".html")) continue;
    const path = join(TOUR, name);
    const html = readFileSync(path, "utf8");
    if (!TOPBAR_RE.test(html)) continue;
    const lang = /<html lang="en"/.test(html) ? "en" : "de";
    const sections = tourSections(html);
    const bar = tourTopbar(lang, name, sections);
    if (!bar) {
      tourMissing = true;
      continue;
    }
    let next = html
      .replace(HEAD_RE, `<!-- site-head:start -->\n${SITE_HEAD}\n<!-- site-head:end -->`)
      .replace(TOPBAR_RE, `<!-- site-topbar:start -->\n${bar}\n<!-- site-topbar:end -->`);
    next = next.replace(TOC_RE, (m, pad) => {
      const body = /^index(-en)?\.html$/.test(name) ? tourToc(lang, pad) : chapterToc(lang, sections, pad);
      return `${pad}<!-- tour-toc:start -->\n${body}\n${pad}<!-- tour-toc:end -->`;
    });
    write(path, next);
  }
}
if (tourMissing) console.warn("Rundgang: docs/<lang>/index.html fehlt - erst `node docs-src/build.mjs`, dann erneut.");

console.log(`demo/ synchronisiert: ${changed} Datei(en) geändert.`);
if (missing.length) console.log(`Ohne Beispiel-Leisten-Marker (selbst gepflegt): ${missing.join(", ")}`);
