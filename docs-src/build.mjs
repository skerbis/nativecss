// NativeCSS - baut die zweisprachige Doku (docs-src/content/{de,en}/*.html) zu fertigen
// Seiten unter docs/{de,en}/*.html. Reine Infrastruktur für die DOKU-WEBSITE, nicht Teil
// der ausgelieferten Bibliothek (dist/) - rührt nicht an ncss' eigenem "kein Build-
// Schritt"-Prinzip, das für die CSS-Datei gilt, die Konsumenten einbinden. Läuft lokal
// (node docs-src/build.mjs) für die Vorschau UND im selben GitHub-Actions-Workflow, der
// bereits die Pages-Artefakte zusammenstellt (.github/workflows/pages.yml) - docs/ selbst
// ist NICHT eingecheckt (siehe .gitignore), immer frisch aus docs-src/ generiert, kann
// dadurch nie veraltet/aus der Spur geraten.
//
// Kein Markdown-Parser, keine npm-Abhängigkeit: jede Content-Datei ist bereits fertiges
// HTML (ein Fragment, kein komplettes Dokument) - das Script macht nur Platzhalter-
// Ersetzung in template.html, keine echte Templating-Engine nötig für diesen Umfang.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT_DIR = join(ROOT, "docs");

const nav = JSON.parse(readFileSync(join(HERE, "nav.json"), "utf8"));
const strings = JSON.parse(readFileSync(join(HERE, "strings.json"), "utf8"));
const template = readFileSync(join(HERE, "template.html"), "utf8");

const LANGS = ["de", "en"];

// Flache Seitenliste (für Vorherige/Nächste-Navigation) - Reihenfolge folgt exakt der
// Gruppen-/Seitenreihenfolge in nav.json.
const flatPages = [];
for (const group of nav.groups) {
  for (const page of group.pages) {
    flatPages.push({ ...page, group });
  }
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

function buildSidebar(lang, currentSlug) {
  const parts = [];
  for (const group of nav.groups) {
    parts.push(`      <div class="docs-sidebar-group">`);
    parts.push(`        <p class="docs-sidebar-group-title">${group[lang]}</p>`);
    parts.push(`        <ul class="ncss-nav-list">`);
    for (const page of group.pages) {
      const current = page.slug === currentSlug;
      parts.push(
        `          <li class="ncss-nav-item"><a href="${page.slug}.html"${current ? ' aria-current="page"' : ""}>${page[lang]}</a></li>`,
      );
    }
    parts.push(`        </ul>`);
    parts.push(`      </div>`);
  }
  return parts.join("\n");
}

function buildLangSwitch(lang, slug) {
  return LANGS.map((l) => {
    const current = l === lang;
    return `          <li class="ncss-nav-item"><a href="../${l}/${slug}.html"${current ? ' aria-current="true"' : ""}>${strings[l].langName}</a></li>`;
  }).join("\n");
}

function buildPrevNext(lang, index) {
  const prev = index > 0 ? flatPages[index - 1] : null;
  const next = index < flatPages.length - 1 ? flatPages[index + 1] : null;
  if (!prev && !next) return "";
  const prevHtml = prev
    ? `<a href="${prev.slug}.html"><span class="docs-prevnext-label">← ${strings[lang].prev}</span>${prev[lang]}</a>`
    : "<span></span>";
  const nextHtml = next
    ? `<a href="${next.slug}.html"><span class="docs-prevnext-label">${strings[lang].next} →</span>${next[lang]}</a>`
    : "<span></span>";
  return `      <nav class="docs-prevnext">\n        <div class="docs-prevnext-prev">${prevHtml}</div>\n        <div class="docs-prevnext-next">${nextHtml}</div>\n      </nav>`;
}

function extractDescription(html) {
  const match = html.match(/^<!--DESC:\s*(.*?)\s*-->\n?/);
  if (!match) return { description: "", body: html };
  return { description: match[1], body: html.slice(match[0].length) };
}

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const lang of LANGS) {
  const langDir = join(OUT_DIR, lang);
  mkdirSync(langDir, { recursive: true });

  flatPages.forEach((page, index) => {
    const contentPath = join(HERE, "content", lang, `${page.slug}.html`);
    if (!existsSync(contentPath)) {
      console.warn(`FEHLT: ${contentPath} - Seite wird übersprungen`);
      return;
    }
    const raw = readFileSync(contentPath, "utf8");
    const { description, body } = extractDescription(raw);

    let html = template;
    const s = strings[lang];
    html = html
      .replaceAll("__LANG__", lang)
      .replaceAll("__TITLE__", escapeAttr(`${page[lang]} - NativeCSS Docs`))
      .replaceAll("__DESCRIPTION__", escapeAttr(description))
      .replaceAll("__SKIP_LINK__", s.skipLink)
      .replaceAll("__MENU_LABEL__", s.menuLabel)
      .replaceAll("__CLOSE_LABEL__", s.closeLabel)
      .replaceAll("__NAV_HOME__", s.navHome)
      .replaceAll("__NAV_DEMOS__", s.navDemos)
      .replaceAll("__NAV_DOCS__", s.navDocs)
      .replaceAll("__SIDEBAR_LABEL__", s.sidebarLabel)
      .replaceAll("__FOOTER_DOCS_LABEL__", s.footerDocsLabel)
      .replaceAll("__FOOTER_TAGLINE__", s.footerTagline)
      .replaceAll("__LANG_SWITCH__", buildLangSwitch(lang, page.slug))
      .replaceAll("__SIDEBAR__", buildSidebar(lang, page.slug))
      .replaceAll("__PREVNEXT__", buildPrevNext(lang, index))
      .replaceAll("__CONTENT__", body);

    writeFileSync(join(langDir, `${page.slug}.html`), html);
    count++;
  });
}

// Root docs/index.html - kein Server-seitiges Content-Negotiation auf GitHub Pages
// möglich, deshalb ein winziger client-seitiger Redirect nach navigator.language mit
// funktionierendem Fallback-Link (falls JS deaktiviert ist).
const rootRedirect = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>NativeCSS Docs</title>
<meta http-equiv="refresh" content="0; url=en/index.html">
<script>
  var lang = (navigator.language || "en").slice(0, 2) === "de" ? "de" : "en";
  location.replace(lang + "/index.html");
</script>
</head>
<body>
  <p><a href="de/index.html">Deutsch</a> · <a href="en/index.html">English</a></p>
</body>
</html>
`;
writeFileSync(join(OUT_DIR, "index.html"), rootRedirect);

console.log(`Doku gebaut: ${count} Seiten (${flatPages.length} pro Sprache × ${LANGS.length} Sprachen) -> ${OUT_DIR}`);
