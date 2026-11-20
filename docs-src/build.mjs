// NativeCSS - baut die komplette Website (Start, Handbuch mit Live-Beispielen, Beispiel-
// Übersicht) aus docs-src/ nach docs/{de,en}/*.html. Reine Infrastruktur für die WEBSITE,
// nicht Teil der ausgelieferten Bibliothek (dist/) - rührt nicht an ncss' eigenem "kein
// Build-Schritt"-Prinzip, das für die CSS-Datei gilt, die Konsumenten einbinden. Läuft
// lokal (node docs-src/build.mjs) für die Vorschau UND im GitHub-Actions-Workflow
// (.github/workflows/pages.yml) - docs/ selbst ist NICHT eingecheckt (siehe .gitignore).
//
// EINE Hülle für alles: template.html + nav.json. Kopfleiste, Seitenleiste, Off-Canvas-
// Menü, Brotkrumen und "Auf dieser Seite"-Leiste entstehen hier aus derselben Quelle -
// "wo bin ich" (aria-current + Hervorhebung) kann zwischen Seiten nicht auseinanderlaufen.
//
// Content-Dateien (docs-src/content/{de,en}/<slug>.html) sind fertige HTML-Fragmente mit
// optionalen Direktiven (HTML-Kommentare, werden beim Bauen entfernt):
//   <!--DESC: Text-->            Meta-Description + Beschreibung der Übersichts-Karte
//   <!--HEAD: <tags>-->          zusätzliche <link>/<script>/<style> im <head>
//   <!--FOOT: <tags>-->          zusätzliche <script> vor </body> (synchron, nach dem DOM)
//   <!--INCLUDE: name-->         Live-Beispiel-Fragment docs-src/demos/name.html
//                                (EN: docs-src/demos/en/name.html, falls vorhanden; sonst
//                                Hinweis "noch deutsch", außer das Fragment trägt
//                                <!--NEUTRAL-->)
//   <!--HUB-->                   gruppierte Übersichts-Karten aller Handbuch-Seiten
//   <!--EXAMPLES-->              Karten aller Beispiel-Websites (nav.json "examples")
// Pfade in Fragmenten/Direktiven mit "~/" beginnen an der Repo-Wurzel (wird zu "../../").
// Links auf alte Demo-Seiten (../../demo/forms.html bzw. ~/demo/forms.html) zeigen nach
// dem Bauen auf die Handbuch-Seite, in die die Demo gewandert ist (nav.json "redirects").
//
// Zusätzlich: docs/class-index.{de,en}.json für den Code-Inspektor (Erklärung + Handbuch-
// Link je ncss-Klasse, data-ncss-Attribut und ncss-Element), siehe buildClassIndex().
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT_DIR = join(ROOT, "docs");

const nav = JSON.parse(readFileSync(join(HERE, "nav.json"), "utf8"));
// Einheitlicher Barrierefreiheits-Block je Komponenten-Seite (Tastatur · Screenreader ·
// Einstellungen · Ohne JS), Daten in docs-src/a11y.json.
const a11y = existsSync(join(HERE, "a11y.json")) ? JSON.parse(readFileSync(join(HERE, "a11y.json"), "utf8")) : {};
const strings = JSON.parse(readFileSync(join(HERE, "strings.json"), "utf8"));
const template = readFileSync(join(HERE, "template.html"), "utf8");
// Schriftzug (eine Quelle für Kopfleiste, Fußzeile, Startseite und Beispiel-Leiste).
const WORDMARK = readFileSync(join(ROOT, "demo", "assets", "brand", "wordmark-inline.html"), "utf8").trim();
// Version aus package.json (einzige Quelle) für die Fußzeile.
const VERSION = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

const LANGS = ["de", "en"];

// Handbuch-Seiten in Gruppen-/Seitenreihenfolge (Vorherige/Nächste, Sidebar, Übersicht).
const flatPages = [];
for (const group of nav.groups) {
  for (const page of group.pages) flatPages.push({ ...page, group });
}
// Alle zu bauenden Seiten: Start + Beispiel-Übersicht (eigene Layouts) + Handbuch.
const allPages = [
  { ...nav.start, kind: "start" },
  { ...nav.examplesPage, kind: "examples" },
  // Rechtliches/Website-Seiten (z.B. Erklärung zur Barrierefreiheit): breites Layout ohne
  // Seitenleiste, über die Fußzeile erreichbar.
  ...(nav.legal || []).map((p) => ({ ...p, kind: "examples" })),
  ...flatPages.map((p) => ({ ...p, kind: "docs" })),
];

function escapeAttr(s) {
  return String(s).replace(/&(?!(?:[a-z]+|#\d+);)/g, "&amp;").replace(/"/g, "&quot;");
}
function esc(s) {
  return String(s).replace(/&(?!(?:[a-z]+|#\d+);)/g, "&amp;");
}
function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function decode(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

// Grüner Neu-Punkt (System-Klasse .ncss-badge-dot, dist/components/badge.css) - immer
// mit Text für Screenreader/Forced Colors, nie nur Farbe.
// Optionales Kern-Icon vor einer Beschriftung (nav.json "icon" an Gruppen, data-subnav-icon
// an Abschnitten) - immer dekorativ, der Text bleibt die Beschriftung.
function iconSpan(name) {
  return name ? `<span class="ncss-icon ncss-icon-${name} demo-a11y-icon" aria-hidden="true"></span>` : "";
}

function newDot(lang, text) {
  return ` <span class="ncss-badge-dot"><span class="ncss-visually-hidden">(${text || strings[lang].newLabel})</span></span>`;
}

/* --- Content lesen: Direktiven, Includes, Pfade ------------------------------------- */

function readFragment(lang, name) {
  const localized = join(HERE, "demos", lang, `${name}.html`);
  if (lang !== "de" && existsSync(localized)) return { html: readFileSync(localized, "utf8"), translated: true };
  const base = join(HERE, "demos", `${name}.html`);
  if (!existsSync(base)) throw new Error(`Fragment fehlt: ${base}`);
  return { html: readFileSync(base, "utf8"), translated: lang === "de" };
}

// Zieht HEAD/FOOT-Direktiven heraus (auch aus eingebundenen Fragmenten), gibt Rest zurück.
function takeDirectives(html, acc) {
  return html
    .replace(/<!--HEAD:\s*([\s\S]*?)-->\n?/g, (_, tags) => {
      acc.head.push(tags.trim());
      return "";
    })
    .replace(/<!--FOOT:\s*([\s\S]*?)-->\n?/g, (_, tags) => {
      acc.foot.push(tags.trim());
      return "";
    });
}

function loadContent(lang, slug) {
  const path = join(HERE, "content", lang, `${slug}.html`);
  if (!existsSync(path)) return null;
  let raw = readFileSync(path, "utf8");
  const acc = { head: [], foot: [], description: "" };
  raw = raw.replace(/^<!--DESC:\s*(.*?)\s*-->\n?/, (_, d) => {
    acc.description = d;
    return "";
  });
  raw = raw.replace(/<!--INCLUDE:\s*([a-z0-9-]+)(?:#([a-z0-9-]+))?\s*-->/g, (_, name, sectionId) => {
    const frag = readFragment(lang, name);
    // "name#id": nur den <section id="id"> daraus (plus HEAD/FOOT des Fragments) - so
    // zeigt z.B. die Typografie-Seite den Typografie-Abschnitt aus "Alle Bausteine live".
    if (sectionId) frag.html = extractSection(frag.html, sectionId);
    // <!--NEUTRAL--> im Fragment: enthält keinen sichtbaren Text (z.B. nur <style>) -
    // kein Übersetzungs-Hinweis nötig.
    const neutral = frag.html.includes("<!--NEUTRAL-->");
    frag.html = frag.html.replace("<!--NEUTRAL-->\n", "").replace("<!--NEUTRAL-->", "");
    const note = !frag.translated && !neutral && strings[lang].liveDemoNote
      ? `<p class="ncss-text-sm ncss-text-muted docs-lang-note">${strings[lang].liveDemoNote}</p>\n<div class="ncss-stack ncss-stack--loose" lang="de">\n`
      : "";
    return note + takeDirectives(frag.html, acc) + (note ? "\n</div>" : "");
  });
  // <!--MERGE: fragment--> bzw. fragment#section-id: Live-Beispiele in die passenden
  // Abschnitte einweben statt sie als zweiten Block anzuhängen (siehe mergeFragment).
  const merges = [];
  raw = raw.replace(/<!--MERGE:\s*([a-z0-9-]+)(?:#([a-z0-9-]+))?\s*-->\n?/g, (_, name, sectionId) => {
    merges.push({ name, sectionId });
    return "";
  });
  for (const { name, sectionId } of merges) {
    const frag = readFragment(lang, name);
    let html = frag.html.replace(/<!--NEUTRAL-->\n?/, "");
    if (sectionId) html = extractSection(html, sectionId);
    html = takeDirectives(html, acc);
    raw = mergeFragment(raw, html, lang);
  }
  raw = takeDirectives(raw, acc);
  return { ...acc, body: raw };
}

function extractSection(html, id) {
  const directives = (html.match(/<!--(?:HEAD|FOOT|NEUTRAL)[\s\S]*?-->/g) || []).join("\n");
  const idx = html.search(new RegExp(`<section\\b[^>]*\\bid="${id}"`));
  if (idx < 0) throw new Error(`Abschnitt #${id} nicht im Fragment gefunden`);
  const re = /<(\/?)section\b[^>]*>/g;
  re.lastIndex = idx;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return `${directives}\n${html.slice(idx, m.index + m[0].length)}`;
  }
  throw new Error(`Abschnitt #${id} nicht geschlossen`);
}


/* --- MERGE: Live-Beispiele in die passenden Handbuch-Abschnitte einweben ---------------- */

// Oberste Ebene eines HTML-Fragments in Blöcke zerlegen (Elemente + Kommentare) - kleiner
// Tag-Zähler, reicht für die eigenen, wohlgeformten Fragmente (keine Skripte im Body).
const VOID_TAGS = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;
function topLevelBlocks(html) {
  const blocks = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let start = -1;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) {
      if (depth === 0) blocks.push({ html: m[0], comment: true });
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (VOID_TAGS.test(tag) || m[3] === "/") {
      if (depth === 0) blocks.push({ html: m[0], tag });
      continue;
    }
    if (!closing) {
      if (depth === 0) start = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && start >= 0) {
        const block = html.slice(start, m.index + m[0].length);
        const open = /^<([a-zA-Z][\w-]*)\b([^>]*)>/.exec(block);
        const id = /\bid="([^"]+)"/.exec(open[2]);
        const h2 = /<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(block);
        blocks.push({ html: block, tag: open[1].toLowerCase(), id: id && id[1], h2: h2 ? stripTags(decode(h2[1])) : "" });
        start = -1;
      }
    }
  }
  return blocks;
}

const normHeading = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Ein Live-Abschnitt wird in den gleichnamigen Handbuch-Abschnitt eingesetzt (gleiche ID
// - beim Übernehmen kollidierende IDs bekamen das Präfix "live-" - oder gleiche
// Überschrift): Erklärung (führende Absätze des Handbuchs) → Live-Rahmen → Code/Tabelle
// des Handbuchs. Code-Blöcke des Live-Abschnitts entfallen, wenn das Handbuch selbst Code
// zeigt (sonst stünde er doppelt da). Ohne passenden Abschnitt wird er als eigener
// Abschnitt angehängt; die Einleitung des Fragments (Block ohne ID vor dem ersten
// Abschnitt) entfällt - die Handbuch-Seite hat ihre eigene.
function mergeFragment(pageHtml, fragHtml, lang) {
  const label = lang === "en" ? "Live example" : "Live-Beispiel";
  const frag = topLevelBlocks(fragHtml).filter((b) => !b.comment);
  let introDropped = false;
  const leftovers = [];
  const appended = [];
  for (const block of frag) {
    if (block.tag === "section" && (block.id || block.h2)) {
      const baseId = (block.id || "").replace(/^live-/, "");
      const docBlocks = topLevelBlocks(pageHtml).filter((b) => b.tag === "section");
      const target =
        (baseId && docBlocks.find((b) => b.id === baseId && b.id !== block.id)) ||
        docBlocks.find((b) => b.h2 && normHeading(b.h2) === normHeading(block.h2)) ||
        // "Mehrere Themes" ~ "Mehrere Themes parallel", "Video" ~ "Video & Audio"
        docBlocks.find((b) => {
          const a = normHeading(b.h2 || "");
          const c = normHeading(block.h2 || "");
          return a && c && Math.min(a.length, c.length) >= 5 && (a.startsWith(c + " ") || c.startsWith(a + " "));
        });
      if (!target) {
        appended.push(block.html);
        continue;
      }
      let inner = block.html.replace(/^<section\b[^>]*>/, "").replace(/<\/section>\s*$/, "");
      inner = inner.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>\s*/, "");
      if (/<pre\b/.test(target.html)) inner = inner.replace(/\s*<pre\b[\s\S]*?<\/pre>/g, "");
      // Live-IDs bleiben erreichbar: die ID des Live-Abschnitts sitzt jetzt am Rahmen.
      const live = `\n  <div class="docs-live" role="group" aria-label="${label}"${block.id && block.id !== target.id ? ` id="${block.id}"` : ""}>\n${inner.trim()}\n  </div>\n`;
      // Einfügepunkt: nach h2 + direkt folgenden Absätzen.
      const h2end = target.html.search(/<\/h2>/);
      let pos = h2end >= 0 ? h2end + 5 : target.html.indexOf(">") + 1;
      const tail = target.html.slice(pos);
      const lead = /^(\s*<p\b[\s\S]*?<\/p>)*/.exec(tail);
      pos += lead ? lead[0].length : 0;
      const merged = target.html.slice(0, pos) + live + target.html.slice(pos);
      pageHtml = pageHtml.replace(target.html, merged);
    } else if (!introDropped && !block.id && !/<h2\b/.test(block.html) && /^(section|div)$/.test(block.tag)) {
      introDropped = true;
    } else {
      leftovers.push(block.html);
    }
  }
  // Übrige Elemente (z.B. Bedienknöpfe/Dialoge einer Demo) nach dem ersten Abschnitt.
  if (leftovers.length) {
    const first = topLevelBlocks(pageHtml).find((b) => b.tag === "section");
    if (first) pageHtml = pageHtml.replace(first.html, first.html + "\n" + leftovers.join("\n"));
  }
  return pageHtml + (appended.length ? "\n\n" + appended.join("\n\n") : "");
}

// Alte Demo-URLs -> Handbuch-Seite; "~/" -> Repo-Wurzel relativ zu docs/{lang}/.
function rewritePaths(html, currentSlug) {
  html = html.replace(/href="(?:\.\.\/\.\.\/|~\/)demo\/([a-z0-9-]+\.html)(#[^"]*)?"/g, (m, file, hash = "") => {
    const slug = nav.redirects[file];
    if (!slug) return m;
    if (slug === currentSlug) return `href="${hash || "#main"}"`;
    return `href="${slug}.html${hash}"`;
  });
  return html.replace(/(["'(])~\//g, "$1../../");
}

/* --- Navigation ------------------------------------------------------------------------ */

// collapsible: im Mobil-Menü jede Gruppe als <details> (aktuelle Gruppe offen) - sonst
// ist das Panel eine endlose Liste ohne Orientierung. Desktop-Sidebar bleibt offen.
function buildTree(lang, currentSlug, pad, collapsible = false) {
  const parts = [];
  for (const group of nav.groups) {
    const title = `${iconSpan(group.icon)}${group[lang]}${group.new ? newDot(lang, strings[lang].containsNewLabel) : ""}`;
    if (collapsible) {
      const open = group.pages.some((p) => p.slug === currentSlug);
      parts.push(`${pad}<details class="docs-sidebar-group"${open ? " open" : ""}>`);
      parts.push(`${pad}  <summary class="docs-sidebar-group-title">${title}</summary>`);
    } else {
      parts.push(`${pad}<div class="docs-sidebar-group">`);
      parts.push(`${pad}  <p class="docs-sidebar-group-title">${title}</p>`);
    }
    parts.push(`${pad}  <ul class="ncss-nav-list">`);
    for (const page of group.pages) {
      const current = page.slug === currentSlug;
      parts.push(
        `${pad}    <li class="ncss-nav-item"><a href="${page.slug}.html"${current ? ' aria-current="page"' : ""}>${esc(page[lang])}${page.new ? newDot(lang) : ""}</a></li>`,
      );
    }
    parts.push(`${pad}  </ul>`);
    parts.push(`${pad}</${collapsible ? "details" : "div"}>`);
  }
  return parts.join("\n");
}

// Kopfleiste: immer dieselben drei kurzen Punkte (Handbuch · Beispiele · Neu), die Marke
// führt zur Startseite - Themenbereiche stehen bewusst NICHT oben, sondern im Handbuch-
// Baum (eine kurze Leiste bricht nie um). Aktuelle SEITE = aria-current="page"
// (Marke auf der Startseite, Handbuch-Übersicht, Beispiele); auf jeder anderen Handbuch-Seite ist "Handbuch"
// der aktuelle BEREICH (aria-current="true") - die Seite selbst markiert die Sidebar.
// Im Off-Canvas-Menü (unter 64rem) folgt darunter derselbe Baum wie in der Sidebar.
function buildTopbar(lang, page) {
  const s = strings[lang];
  const anyNewExample = nav.examples.some((e) => e.new);
  const item = (href, label, state, extra = "") =>
    `          <li class="ncss-nav-item"><a href="${href}"${state ? ` aria-current="${state}"` : ""}>${label}${extra}</a></li>`;
  const docsState = page.kind === "docs" ? "true" : "";
  return [
    `    <nav class="ncss-nav site-nav" aria-label="${s.navLabel}">`,
    `      <button type="button" class="ncss-nav-toggle" command="show-modal" commandfor="navPanel" aria-label="${s.menuLabel}"><span class="ncss-icon ncss-icon-menu" aria-hidden="true"></span></button>`,
    `      <dialog id="navPanel" class="ncss-nav-panel ncss-offcanvas ncss-offcanvas--start" aria-label="${s.navPanelLabel}">`,
    `        <button type="button" class="ncss-dialog-close" command="close" commandfor="navPanel" aria-label="${s.closeLabel}"><span class="ncss-icon ncss-icon-close" aria-hidden="true"></span></button>`,
    `        <ul class="ncss-nav-list">`,
    item("index.html", s.navDocs, docsState),
    item(`${nav.examplesPage.slug}.html`, s.navExamples, page.kind === "examples" ? "page" : "", anyNewExample ? newDot(lang, s.containsNewLabel) : ""),
    item(`${nav.start.slug}.html#neu`, s.navNew, "", ` <span class="ncss-badge-dot" aria-hidden="true"></span>`),
    `          <li class="ncss-nav-item site-panel-only"><a href="${nav.start.slug}.html#${s.supportAnchor}"><span class="ncss-icon ncss-icon-heart site-sponsor-heart" aria-hidden="true"></span> ${s.sponsorShort}</a></li>`,
    `        </ul>`,
    `        <div class="ncss-nav--tree site-panel-tree">`,
    buildTree(lang, page.slug, "          ", true),
    `        </div>`,
    `        <details class="site-panel-prefs">`,
    `          <summary><span class="ncss-icon ncss-icon-accessibility" aria-hidden="true"></span>${s.prefsLabel}</summary>`,
    `          <ncss-preferences inline></ncss-preferences>`,
    `        </details>`,
    `      </dialog>`,
    `    </nav>`,
  ].join("\n");
}

function buildActions(lang, slug) {
  const s = strings[lang];
  const other = LANGS.find((l) => l !== lang);
  const lines = [];
  // Unterstützen: immer sichtbar in der Kopfleiste (schmal nur das Herz, Text bleibt Name)
  lines.push(`      <a class="site-sponsor" href="${nav.start.slug}.html#${s.supportAnchor}"><span class="ncss-icon ncss-icon-heart" aria-hidden="true"></span><span class="site-sponsor-label">${s.sponsorShort}</span></a>`);
  if (existsSync(join(HERE, "content", other, `${slug}.html`))) {
    // Sehr schmal (unter 24rem) nur das Sprachkürzel, sonst bricht die Leiste um.
    lines.push(`      <a class="demo-topbar-lang" href="../${other}/${slug}.html" hreflang="${other}" lang="${other}" aria-label="${s.otherLangName}"><span class="demo-topbar-lang-long">${s.otherLangName}</span><span class="demo-topbar-lang-short" aria-hidden="true">${other.toUpperCase()}</span></a>`);
  }
  // Darstellung (Farbschema, Kontrast, Bewegung, Schrift …) ersetzt den Hell/Dunkel-Knopf
  lines.push(`      <ncss-preferences class="site-prefs"></ncss-preferences>`);
  return lines.join("\n");
}

// "Auf dieser Seite": aus den Abschnitten (section[id] mit h2, oder h2[id]) der Seite,
// erst ab drei Abschnitten. Beschriftung = data-subnav-label am <section> oder der
// h2-Text. Ein Abschnitt mit data-subnav="off" bleibt draußen.
function collectSections(html) {
  const out = [];
  const stack = [];
  const re = /<section\b([^>]*)>|<\/section>|<h2\b([^>]*)>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) {
      const id = /\bid="([^"]+)"/.exec(m[1]);
      const label = /\bdata-subnav-label="([^"]+)"/.exec(m[1]);
      const icon = /\bdata-subnav-icon="([a-z0-9-]+)"/.exec(m[1]);
      stack.push({ id: id && id[1], label: label && label[1], icon: icon && icon[1], off: /data-subnav="off"/.test(m[1]), used: false });
    } else if (m[0] === "</section>") {
      stack.pop();
    } else {
      const ownId = /\bid="([^"]+)"/.exec(m[2]);
      const text = stripTags(m[3]);
      if (ownId) {
        out.push({ id: ownId[1], label: text });
        continue;
      }
      for (let i = stack.length - 1; i >= 0; i--) {
        const sec = stack[i];
        if (!sec.id || sec.used) continue;
        sec.used = true;
        if (!sec.off) out.push({ id: sec.id, label: sec.label || text, icon: sec.icon });
        break;
      }
    }
  }
  return out;
}

function buildSubnav(lang, html) {
  // Nur eindeutige Einträge: gleiche ID oder gleiche Beschriftung zählt einmal.
  const seen = new Set();
  const sections = collectSections(html).filter((x) => {
    const key = normHeading(stripTags(decode(x.label)));
    if (seen.has(x.id) || seen.has(key)) return false;
    seen.add(x.id);
    seen.add(key);
    return true;
  });
  if (sections.length < 3) return "";
  const s = strings[lang];
  const links = sections.map((x) => `      <li><a href="#${x.id}">${iconSpan(x.icon)}${x.label}</a></li>`).join("\n");
  return `<nav class="ncss-subnav" aria-label="${s.subnavLabel}" data-ncss-subnav>
  <div class="ncss-subnav-inner">
    <span class="ncss-subnav-label" aria-hidden="true">${s.subnavLabel}</span>
    <ul class="ncss-subnav-list" role="list">
${links}
    </ul>
  </div>
</nav>`;
}

function buildBreadcrumb(lang, page) {
  if (page.kind !== "docs" || page.slug === "index") return "";
  const s = strings[lang];
  return `      <nav class="ncss-breadcrumb docs-breadcrumb" aria-label="${s.breadcrumbLabel}">
        <ol>
          <li><a href="index.html">${s.navDocs}</a></li>
          <li>${esc(page.group[lang])}</li>
          <li aria-current="page">${esc(page[lang])}</li>
        </ol>
      </nav>`;
}

function buildA11y(lang, slug) {
  const data = a11y[slug] && a11y[slug][lang];
  if (!data) return "";
  const s = strings[lang];
  const row = (label, text) => `          <div><dt>${label}</dt><dd>${text}</dd></div>`;
  return `      <section class="ncss-stack docs-a11y" id="barrierefreiheit" data-subnav-label="${s.a11yTitle}" data-subnav-icon="accessibility">
        <h2 class="demo-section-title">${iconSpan("accessibility")}${s.a11yTitle}</h2>
        <div class="docs-a11y-notes">
        <dl class="docs-a11y-list">
${row(s.a11yKeyboard, data.keyboard)}
${row(s.a11yScreenreader, data.screenreader)}
${row(s.a11yPrefs, data.prefs)}
${row(s.a11yNoJs, data.nojs)}
        </dl>
        <p class="ncss-text-sm"><a href="accessibility.html">${s.a11yMore}</a></p>
        </div>
      </section>`;
}

function buildPrevNext(lang, slug) {
  const index = flatPages.findIndex((p) => p.slug === slug);
  if (index < 0) return "";
  const prev = index > 0 ? flatPages[index - 1] : null;
  const next = index < flatPages.length - 1 ? flatPages[index + 1] : null;
  const prevHtml = prev
    ? `<a href="${prev.slug}.html"><span class="docs-prevnext-label">← ${strings[lang].prev}</span>${esc(prev[lang])}</a>`
    : "<span></span>";
  const nextHtml = next
    ? `<a href="${next.slug}.html"><span class="docs-prevnext-label">${strings[lang].next} →</span>${esc(next[lang])}</a>`
    : "<span></span>";
  return `      <nav class="docs-prevnext" aria-label="${strings[lang].prev} / ${strings[lang].next}">\n        <div class="docs-prevnext-prev">${prevHtml}</div>\n        <div class="docs-prevnext-next">${nextHtml}</div>\n      </nav>`;
}

/* --- Übersichts-Karten ----------------------------------------------------------------- */

function preview(slug) {
  const path = join(HERE, "previews", `${slug}.html`);
  if (!existsSync(path)) return "";
  let html = readFileSync(path, "utf8").trim();
  const bleed = html.startsWith("<!--BLEED-->");
  html = html.replace("<!--BLEED-->", "").trim();
  return `<div class="demo-hub-preview${bleed ? " demo-hub-preview--bleed" : ""}" aria-hidden="true" inert>${html}</div>`;
}

const descCache = {};
function descriptionOf(lang, slug) {
  const key = `${lang}/${slug}`;
  if (!(key in descCache)) {
    const path = join(HERE, "content", lang, `${slug}.html`);
    const m = existsSync(path) && /^<!--DESC:\s*(.*?)\s*-->/.exec(readFileSync(path, "utf8"));
    descCache[key] = m ? m[1] : "";
  }
  return descCache[key];
}

function card({ title, href, desc, prev, isNew, lang }) {
  return `      <article class="ncss-card ncss-card--linked ncss-border ncss-radius-lg demo-hub-card">
        ${prev}
        <div class="ncss-card-body">
          <h3 class="demo-hub-title"><a class="ncss-card-link" href="${href}">${title}</a>${isNew ? newDot(lang) : ""}</h3>
          <p class="ncss-text-sm ncss-text-muted">${desc}</p>
        </div>
      </article>`;
}

function buildHub(lang) {
  return nav.groups
    .map((group) => {
      const pages = group.pages.filter((p) => p.slug !== "index");
      if (!pages.length) return "";
      const cards = pages
        .map((p) => card({ title: esc(p[lang]), href: `${p.slug}.html`, desc: descriptionOf(lang, p.slug), prev: preview(p.slug), isNew: p.new, lang }))
        .join("\n");
      return `<section class="ncss-stack demo-hub-group" id="gruppe-${group.id}" data-subnav-label="${escapeAttr(stripTags(group[lang]))}">
  <div class="demo-hub-group-head"><h2>${iconSpan(group.icon)}${esc(group[lang])}${group.new ? newDot(lang, strings[lang].containsNewLabel) : ""}</h2></div>
  <div class="ncss-grid" style="--ncss-grid-min: 15rem;">
${cards}
  </div>
</section>`;
    })
    .join("\n\n");
}

// Echtes Vorschaubild (docs-src/make-thumbs.mjs), sonst die gezeichnete Seiten-Skizze.
function examplePreview(ex, lang) {
  const thumb = join(ROOT, "demo", "assets", "examples", "thumbs", `${ex.id}.webp`);
  if (existsSync(thumb)) {
    const alt = (lang === "en" ? "Screenshot: " : "Bildschirmfoto: ") + stripTags(decode(ex[lang]));
    return `<div class="demo-hub-preview demo-hub-preview--bleed demo-hub-preview--shot"><img src="../../demo/assets/examples/thumbs/${ex.id}.webp" alt="${escapeAttr(alt)}" width="640" height="400" loading="lazy"></div>`;
  }
  return exampleSketch(ex);
}
function exampleSketch(ex) {
  const accent = ex.accent ? ` style="--demo-hub-accent: ${ex.accent};"` : "";
  const inner = ex.app
    ? `<div class="demo-hub-page demo-hub-page--app"${accent}><span class="demo-hub-page-hero"></span><span></span><span></span><span></span><span></span></div>`
    : `<div class="demo-hub-page"${accent}><span></span><span class="demo-hub-page-hero"></span><span class="demo-hub-page-cols"><i></i></span><span></span></div>`;
  return `<div class="demo-hub-preview" aria-hidden="true" inert>${inner}</div>`;
}

function buildExamples(lang) {
  const cards = nav.examples
    .map((ex) => card({ title: esc(ex[lang]), href: `../../demo/${ex.href}`, desc: ex.desc[lang], prev: examplePreview(ex, lang), isNew: ex.new, lang }))
    .join("\n");
  return `  <div class="ncss-grid" style="--ncss-grid-min: 18rem;">\n${cards}\n  </div>`;
}

/* --- Seite zusammensetzen -------------------------------------------------------------- */

function buildMain(lang, page, body) {
  if (page.kind === "start") {
    return `<main id="main" class="ncss-stretch site-main site-main--start">\n${body}\n</main>`;
  }
  if (page.kind === "examples") {
    return `<main id="main" class="ncss-stretch ncss-container ncss-stack ncss-stack--loose ncss-py-xl site-main">\n${body}\n</main>`;
  }
  return `<main id="main" class="ncss-stretch ncss-container ncss-py-xl site-main">
  <div class="docs-layout">
    <nav class="ncss-nav--tree docs-sidebar" aria-label="${strings[lang].sidebarLabel}">
${buildTree(lang, page.slug, "      ")}
    </nav>
    <div class="ncss-stack ncss-stack--loose docs-content">
${buildBreadcrumb(lang, page)}
${body}
${buildA11y(lang, page.slug)}
${buildPrevNext(lang, page.slug)}
    </div>
  </div>
</main>`;
}

function render(lang, page, classIndex) {
  const content = loadContent(lang, page.slug);
  if (!content) {
    console.warn(`FEHLT: content/${lang}/${page.slug}.html - Seite wird übersprungen`);
    return null;
  }
  let body = content.body
    .replaceAll("<!--WORDMARK-->", WORDMARK)
    .replace("<!--HUB-->", () => buildHub(lang))
    .replace("<!--EXAMPLES-->", () => buildExamples(lang));
  body = rewritePaths(body, page.slug);
  if (page.kind !== "examples") collectSearch(lang, page, body.replace(/<!--HUB-->/, ""), content.description, classIndex);
  const s = strings[lang];
  const title = page.title ? page.title[lang] : `${stripTags(decode(page[lang]))} - NativeCSS`;
  const replacements = {
    __LANG__: lang,
    __TITLE__: escapeAttr(title),
    __DESCRIPTION__: escapeAttr(content.description),
    __SKIP_LINK__: s.skipLink,
    __HEAD_EXTRA__: rewritePaths(content.head.join("\n"), page.slug),
    __BRAND_HREF__: `${nav.start.slug}.html`,
    __BRAND_CURRENT__: page.kind === "start" ? ' aria-current="page"' : "",
    __INSPECT_LABEL__: s.inspectLabel,
    __WORDMARK__: WORDMARK,
    __BRAND_LABEL__: s.brandLabel,
    __SPONSOR_LABEL__: s.sponsorLabel,
    __SPONSOR_NOTE__: s.sponsorNote,
    __VERSION__: VERSION,
    __VERSION_LABEL__: s.versionLabel,
    __CHANGELOG_LABEL__: s.changelogLabel,
    __STATEMENT_LABEL__: s.statementLabel,
    __INSPECT_TITLE__: s.inspectTitle,
    __SEARCH_LABEL__: s.searchLabel,
    __SEARCH_PLACEHOLDER__: s.searchPlaceholder,
    __SEARCH_EMPTY__: s.searchEmpty,
    __SEARCH_SUGGEST__: s.searchSuggest,
    __SEARCH_HINT_SELECT__: s.searchHintSelect,
    __SEARCH_HINT_OPEN__: s.searchHintOpen,
    __SEARCH_HINT_CLOSE__: s.searchHintClose,
    __SITE_NAV__: buildTopbar(lang, page),
    __SITE_ACTIONS__: buildActions(lang, page.slug),
    __SUBNAV__: page.slug === "index" ? "" : buildSubnav(lang, body + (page.kind === "docs" ? buildA11y(lang, page.slug) : "")),
    __MAIN__: buildMain(lang, page, body),
    __FOOTER_TAGLINE__: s.footerTagline,
    __NAV_START__: s.navStart,
    __NAV_DOCS__: s.navDocs,
    __NAV_EXAMPLES__: s.navExamples,
    __START_HREF__: `${nav.start.slug}.html`,
    __EXAMPLES_HREF__: `${nav.examplesPage.slug}.html`,
    __FOOT_EXTRA__: rewritePaths(content.foot.join("\n"), page.slug),
  };
  // EIN Durchgang über alle Platzhalter (statt verketteter replaceAll): eingesetzter
  // Inhalt wird nie erneut nach Platzhaltern durchsucht.
  return template.replace(/__[A-Z_]+__/g, (key) => (key in replacements ? replacements[key] : key));
}

/* --- Suchindex (docs/search.{de,en}.json für die Suche in der Kopfleiste) ------------- */

// Wird beim Rendern jeder Seite gefüllt - neue Seiten/Abschnitte/Klassen landen dadurch
// automatisch im Index, ohne Pflege von Hand. URLs relativ zu docs/ (die Palette löst sie
// gegen die JSON-Datei auf - funktioniert so auch auf der Startseite an der Site-Wurzel).
const search = { de: { pages: [], sections: [], classes: new Map() }, en: { pages: [], sections: [], classes: new Map() } };

function snippetAfter(html, index) {
  const m = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(html.slice(index, index + 4000));
  if (!m) return "";
  const t = decode(stripTags(m[1]));
  return t.length > 150 ? t.slice(0, 147) + "…" : t;
}

function collectSearch(lang, page, body, description, classIndex) {
  const title = stripTags(decode(page[lang]));
  const groupLabel = page.group ? stripTags(decode(page.group[lang])) : "";
  const url = `${lang}/${page.slug}.html`;
  const S = search[lang];
  S.pages.push({ g: "pages", t: title, h: groupLabel, u: url, s: description, k: `${page.slug} ${groupLabel}` });
  const plain = body.replace(/<pre[\s\S]*?<\/pre>/g, (m) => " ".repeat(m.length)); // Positionen erhalten
  for (const sec of collectSections(plain)) {
    const at = plain.indexOf(`id="${sec.id}"`);
    S.sections.push({ g: "sections", t: decode(sec.label), h: title, u: `${url}#${sec.id}`, s: at >= 0 ? snippetAfter(plain, at) : "" });
  }
  // h3 mit eigener ID (Unterabschnitte)
  for (const m of plain.matchAll(/<h3\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h3>/g)) {
    S.sections.push({ g: "sections", t: decode(stripTags(m[2])), h: title, u: `${url}#${m[1]}`, s: snippetAfter(plain, m.index) });
  }
  // Klassen/Attribute/Elemente: aus Code-Erwähnungen UND aus dem Live-Markup.
  const ids = [...plain.matchAll(/<(?:section|h2|h3)\b[^>]*\bid="([^"]+)"/g)].map((m) => ({ id: m[1], at: m.index }));
  const anchorAt = (pos) => {
    let a = "";
    for (const x of ids) if (x.at <= pos) a = x.id;
    return a;
  };
  const found = [];
  for (const m of body.matchAll(/(?<![\w-])(?:\.|class="[^"]*?\b)?(ncss-[a-z0-9_-]+[a-z0-9])/g)) found.push({ key: m[1], at: m.index, kind: "class" });
  for (const m of body.matchAll(/(data-ncss-[a-z0-9-]+)/g)) found.push({ key: m[1], at: m.index, kind: "attr" });
  for (const m of body.matchAll(/(?:<|&lt;)(ncss-[a-z0-9-]+)/g)) found.push({ key: `<${m[1]}>`, at: m.index, kind: "el" });
  for (const f of found) {
    if (f.kind === "class" && found.some((g) => g.kind === "el" && g.key === `<${f.key}>` && g.at === f.at - 1)) continue;
    const key = f.kind === "class" ? `.${f.key}` : f.key;
    const lookup = f.kind === "class" ? f.key : f.key;
    const explained = classIndex.entries[lookup];
    const prev = S.classes.get(key);
    const candidate = explained
      ? { g: "classes", t: key, h: stripTags(decode(explained.title)), u: `${lang}/${explained.page}.html${explained.anchor ? "#" + explained.anchor : ""}`, s: explained.text.slice(0, 150) }
      : { g: "classes", t: key, h: title, u: `${url}${anchorAt(f.at) ? "#" + anchorAt(f.at) : ""}`, s: "" };
    if (!prev || (!prev.s && candidate.s)) S.classes.set(key, candidate);
  }
}

function writeSearch(lang) {
  const S = search[lang];
  const labels = lang === "de"
    ? { pages: "Seiten", sections: "Abschnitte", classes: "Klassen, Attribute & Elemente" }
    : { pages: "Pages", sections: "Sections", classes: "Classes, attributes & elements" };
  const data = {
    groups: [{ id: "pages", label: labels.pages }, { id: "sections", label: labels.sections }, { id: "classes", label: labels.classes }],
    items: [...S.pages, ...S.sections, ...[...S.classes.values()].sort((a, b) => a.t.localeCompare(b.t))],
  };
  writeFileSync(join(OUT_DIR, `search.${lang}.json`), JSON.stringify(data));
  return data.items.length;
}

/* --- Klassen-Index für den Code-Inspektor ---------------------------------------------- */

// Quellen: (1) die "Klasse | Zweck"-Tabellen (und Attribut-/Element-Tabellen) aller
// Handbuch-Seiten, mit dem Anker des umgebenden Abschnitts; (2) der erste Satz des
// Kopf-Kommentars jeder dist-CSS-Datei (Datei-Erklärung, nur Deutsch vorhanden).
function buildClassIndex(lang) {
  const entries = {};
  // Zu kurze "Erklärungen" (z.B. nur "<ncss-compare>:") helfen niemandem - weglassen.
  const add = (key, value) => {
    if (key && !entries[key] && value.text.replace(/[^\p{L}]/gu, "").length >= 20) entries[key] = value;
  };
  for (const page of flatPages) {
    const path = join(HERE, "content", lang, `${page.slug}.html`);
    if (!existsSync(path)) continue;
    const html = readFileSync(path, "utf8");
    const tableRe = /<table[\s\S]*?<\/table>/g;
    let t;
    while ((t = tableRe.exec(html))) {
      const table = t[0];
      // Jede Tabelle, deren erste Spalte ncss-Klassen/-Attribute/-Elemente nennt (Kopfzeile
      // egal: "Klasse | Zweck", "Komponente | Wirkung", "Attribut / API | Bedeutung" ...).
      if (!/<td[^>]*>\s*<code>(?:\.ncss-|\[?data-ncss-|&lt;ncss-)/.test(table)) continue;
      const before = html.slice(0, t.index);
      const ids = [...before.matchAll(/<(?:section|h2|h3)\b[^>]*\bid="([^"]+)"/g)];
      const anchor = ids.length ? ids[ids.length - 1][1] : "";
      for (const row of table.match(/<tr>[\s\S]*?<\/tr>/g) || []) {
        const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g);
        if (!cells || cells.length < 2) continue;
        const codes = [...cells[0].matchAll(/<code>([\s\S]*?)<\/code>/g)].map((c) => decode(stripTags(c[1])));
        const text = decode(stripTags(cells.slice(1).join(" ")));
        let base = "";
        for (const code of codes) {
          for (const part of code.split(/[\s,/]+/)) {
            let key = null;
            const cls = /^\.(ncss-[a-z0-9_-]+)/.exec(part);
            const attr = /^\[?(data-ncss-[a-z0-9-]+)/.exec(part);
            const el = /^<?(ncss-[a-z0-9-]+)>?$/.exec(part);
            if (cls) {
              key = cls[1];
              base = base || key;
            } else if (/^--?[a-z0-9]/.test(part) && base && !/^--ncss-/.test(part)) {
              key = base + part; // Modifier-Kurzform: ".ncss-label / --required"
            } else if (attr) {
              key = attr[1];
            } else if (el) {
              key = `<${el[1]}>`;
            }
            if (key) add(key, { text, page: page.slug, title: stripTags(decode(page[lang])), anchor });
          }
        }
      }
    }
  }
  // Zweiter Durchgang (niedrigere Priorität): Fließtext der Handbuch-Seiten (DE zusätzlich
  // die Live-Beispiel-Fragmente). Für jede noch unbekannte Klasse werden alle Sätze, die
  // sie nennen, bewertet: beginnt der Satz mit der Klasse, steht er auf der passenden
  // Themen-Seite (Klassen-Stamm im Slug, z.B. ncss-card -> cards) und ist er nicht zu lang,
  // gewinnt er; Fallstrick-/Grenzen-Seiten zählen weniger.
  const candidates = {};
  const sources = flatPages.map((page) => ({ page, path: join(HERE, "content", lang, `${page.slug}.html`) }));
  if (lang === "de") {
    for (const page of flatPages) {
      const cPath = join(HERE, "content", lang, `${page.slug}.html`);
      if (!existsSync(cPath)) continue;
      const c = readFileSync(cPath, "utf8");
      const inc = /<!--INCLUDE:\s*([a-z0-9-]+)\s*-->/.exec(c);
      if (inc) sources.push({ page, path: join(HERE, "demos", `${inc[1]}.html`), demo: true });
    }
  }
  for (const { page, path, demo } of sources) {
    if (!existsSync(path)) continue;
    const html = readFileSync(path, "utf8").replace(/<!--HEAD:[\s\S]*?-->/g, "").replace(/<pre[\s\S]*?<\/pre>/g, "").replace(/<table[\s\S]*?<\/table>/g, "");
    const blockRe = /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g;
    let b;
    while ((b = blockRe.exec(html))) {
      const inner = b[2];
      const found = [...inner.matchAll(/<code>(\.ncss-[a-z0-9_-]+|data-ncss-[a-z0-9-]+|&lt;ncss-[a-z0-9-]+&gt;)<\/code>/g)];
      if (!found.length) continue;
      const ids = [...html.slice(0, b.index).matchAll(/<(?:section|h2|h3)\b[^>]*\bid="([^"]+)"/g)];
      const anchor = demo ? "live-demo" : ids.length ? ids[ids.length - 1][1] : "";
      const plain = decode(stripTags(inner));
      const sentences = plain.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ<.(])/);
      for (const f of found) {
        const raw = decode(f[1]);
        const key = raw.startsWith(".") ? raw.slice(1) : raw;
        if (entries[key]) continue;
        const sentence = sentences.find((x) => x.includes(raw)) || plain;
        const stem = key.replace(/^<|>$/g, "").replace(/^(data-)?ncss-/, "").split(/[-_]/)[0];
        let score = 0;
        if (sentence.trim().startsWith(raw)) score += 4;
        if (page.slug.includes(stem)) score += 3;
        if (page.slug === "components") score += 1;
        if (sentence.length >= 40 && sentence.length <= 240) score += 1;
        if (/known-limitations|custom-components|touch-mobile|accessibility/.test(page.slug)) score -= 3;
        const text = sentence.length > 260 ? sentence.slice(0, 257) + "…" : sentence;
        if (text.replace(/[^\p{L}]/gu, "").length < 20) continue;
        if (!candidates[key] || score > candidates[key].score) candidates[key] = { score, value: { text, page: page.slug, title: stripTags(decode(page[lang])), anchor } };
      }
    }
  }
  // Nur eindeutige Erklärungen übernehmen: der Satz beginnt mit der Klasse selbst (Score
  // >= 4). Alles andere wäre geraten - dann zeigt der Inspektor ehrlich "keine
  // Beschreibung" mit Verweis auf die Datei.
  for (const key of Object.keys(candidates)) if (candidates[key].score >= 4) add(key, candidates[key].value);

  const files = {};
  for (const dir of ["helpers", "components"]) {
    for (const f of readdirSync(join(ROOT, "dist", dir)).filter((x) => x.endsWith(".css"))) {
      const css = readFileSync(join(ROOT, "dist", dir, f), "utf8");
      const m = /^\/\*\*?([\s\S]*?)\*\//.exec(css);
      if (!m) continue;
      const text = m[1].replace(/^\s*\*\s?/gm, " ").replace(/\s+/g, " ").trim().replace(/^ncss\s*-\s*/i, "");
      const sentence = (/^(.*?[.])(\s|$)/.exec(text) || [null, text])[1];
      files[`${dir}/${f}`] = sentence.slice(0, 260);
    }
  }
  return { lang, entries, files };
}

/* --- Bauen ----------------------------------------------------------------------------- */

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const lang of LANGS) {
  const langDir = join(OUT_DIR, lang);
  mkdirSync(langDir, { recursive: true });
  const classIndex = buildClassIndex(lang);
  writeFileSync(join(OUT_DIR, `class-index.${lang}.json`), JSON.stringify(classIndex));
  for (const page of allPages) {
    let html = render(lang, page, classIndex);
    if (!html) continue;
    // Scrollbare Bereiche per Tastatur erreichbar (WCAG 2.1.1, axe scrollable-region-focusable)
    html = html.replace(/<(div|ul) class="(ncss-table-scroll|ncss-sticky-container|ncss-slideshow-track)([^"]*)"(?![^>]*tabindex)/g, '<$1 class="$2$3" tabindex="0"');
    writeFileSync(join(langDir, `${page.slug}.html`), html);
    count++;
  }
  console.log(`Suchindex ${lang}: ${writeSearch(lang)} Einträge`);
}

// Doppelte IDs (z.B. Abschnitt im Handbuch-Text UND im eingebundenen Live-Beispiel)
// brechen Anker und die Abschnitts-Navigation - hörbar warnen statt still durchlassen.
for (const lang of LANGS) {
  for (const f of readdirSync(join(OUT_DIR, lang))) {
    const ids = [...readFileSync(join(OUT_DIR, lang, f), "utf8").replace(/<pre[\s\S]*?<\/pre>/g, "").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) console.warn(`DOPPELTE ID in ${lang}/${f}: ${[...new Set(dup)].join(", ")}`);
  }
}

// docs/index.html - GitHub Pages kann keine Sprache aushandeln: Meta-Refresh auf das
// deutsche Handbuch, Links für beide Sprachen als Fallback. Bewusst ohne Inline-Script (CSP).
writeFileSync(
  join(OUT_DIR, "index.html"),
  `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>NativeCSS Handbuch</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<meta http-equiv="refresh" content="0; url=de/index.html">
</head>
<body>
  <p><a href="de/index.html">Deutsch</a> · <a href="en/index.html" hreflang="en" lang="en">English</a></p>
</body>
</html>
`,
);

console.log(`Website gebaut: ${count} Seiten (${allPages.length} pro Sprache × ${LANGS.length} Sprachen) -> ${OUT_DIR}`);
