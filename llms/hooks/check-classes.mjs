#!/usr/bin/env node
/**
 * NativeCSS - Markup-Prüfer (CLI und Claude-Code-Hook). Reines node:-Skript, kein npm.
 *
 * Findet die typischen Fehler von LLMs (und Menschen) mit NativeCSS:
 *   error    unbekannte ncss-Klasse (Tippfehler, erfundene Utility) + "meintest du"
 *   error    unbekanntes data-ncss-*-Attribut / unbekanntes <ncss-*>-Element
 *   error    UIkit-Reste (uk-...-Klassen, uk-... bzw. data-uk-...-Attribute)
 *   error    .ncss-modal / .ncss-offcanvas nicht auf einem <dialog>
 *   warning  <img> ohne alt, Icon-Button/-Link ohne zugänglichen Namen,
 *            Formularfeld ohne Label, <dialog> ohne Namen, commandfor ohne Ziel-id
 *   warning  Tailwind-/Bootstrap-artige Klassen, Breakpoint-Suffixe (klasse@m, md:...)
 *
 * CLI:   node llms/hooks/check-classes.mjs seite.html templates/        (Exit 1 bei Fehlern)
 *        --json (Maschinenausgabe)  --errors-only (Warnungen ausblenden)
 * Hook:  ohne Datei-Argumente liest das Skript das Claude-Code-Hook-JSON von stdin
 *        (PostToolUse auf Write|Edit|MultiEdit), prüft die bearbeitete Datei und beendet
 *        sich bei Fehlern mit Exit 2 - stderr geht zurück an den Agenten, der dann
 *        korrigiert. Warnungen blockieren nicht. Siehe README.md hier.
 *
 * Wortschatz: llms/classes.json + llms/components.json (von tools/index.mjs aus dist/
 * erzeugt). Liegt dieses Skript nicht im NativeCSS-Ordner, NCSS_ROOT auf ihn setzen.
 * Template-Code (<?php ?>, {{ }}, {% %}, {# #}, <% %>) wird vor der Prüfung ausgeblendet.
 * Seiten, die UIkit bewusst parallel laden (uikit*.css/js oder <ncss-container>), werden
 * nicht auf uk-Reste geprüft.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve, extname, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(process.env.NCSS_ROOT ?? fileURLToPath(new URL("../..", import.meta.url)));
const MARKUP = new Set([".html", ".htm", ".php", ".phtml", ".twig", ".tpl", ".vue", ".svelte", ".astro", ".hbs", ".njk", ".liquid", ".erb", ".jsx", ".tsx", ".blade.php"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "vendor", "cache", ".cache"]);

/* ---- Wortschatz ------------------------------------------------------------ */

const classes = JSON.parse(await readFile(join(root, "llms/classes.json"), "utf8"));
const components = JSON.parse(await readFile(join(root, "llms/components.json"), "utf8"));
const knownElements = new Set(Object.keys(components.elements ?? {}));
const knownData = new Set(Object.keys(components.dataAttributes ?? {}));
const classNames = Object.keys(classes);

// Häufige erfundene Namen -> was es wirklich gibt (zusätzlich zur Ähnlichkeitssuche)
const HINTS = {
  "ncss-button": "ncss-btn",
  "ncss-btn-primary": "ncss-btn--primary",
  "ncss-btn-secondary": "ncss-btn--secondary",
  "ncss-modal-close": "ncss-dialog-close",
  "ncss-offcanvas-close": "ncss-dialog-close",
  "ncss-close": "ncss-dialog-close",
  "ncss-active": 'aria-current="page" (keine Klasse)',
  "ncss-row": "ncss-grid / ncss-cluster",
  "ncss-col": "ncss-grid (Kinder brauchen keine Klasse)",
  "ncss-tabs": '<details name="..."> (exklusive Gruppe) oder <wa-tab-group>',
  "ncss-accordion": '<details class="ncss-disclosure" name="...">',
  "ncss-dropdown": '<details class="ncss-nav-dropdown"> in .ncss-nav',
  "ncss-alert": "ncss-notification",
  "ncss-text-bold": "<strong> / font-weight im eigenen CSS",
  "ncss-sr-only": "ncss-visually-hidden",
  "ncss-hidden-visually": "ncss-visually-hidden",
};

// Optional: Klassen-Zuordnung des UIkit-Konverters für bessere uk-Hinweise
let ukMap = null;
try {
  const mod = await import(pathToFileURL(join(root, "tools/uikit-to-ncss/rules.mjs")).href);
  ukMap = mod.rules?.classes ?? null;
} catch { /* Konverter nicht mitkopiert - generischer Hinweis */ }

const prefixes = Object.keys(components.classPrefixes ?? {});
const isKnownLibClass = (c) => !!classes[c] || prefixes.some((p) => c.startsWith(p));

/* ---- Hilfen ----------------------------------------------------------------- */

const TEMPLATE_RE = /<\?[\s\S]*?(?:\?>|$)|\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\}|<%[\s\S]*?%>|@\{[\s\S]*?\}/g;
const BLANK = "\u0001";

/** Template-Code und Kommentare durch Platzhalterzeichen ersetzen (Zeilenumbrüche bleiben). */
function blank(source) {
  return source
    .replace(TEMPLATE_RE, (m) => m.replace(/[^\n]/g, BLANK))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
}

function lineIndex(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  return (idx) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[a.length][b.length];
}

/** Nächster bekannter Name (Ähnlichkeit), sonst null. */
function suggest(name, pool) {
  if (HINTS[name]) return HINTS[name];
  const limit = Math.min(4, Math.max(2, Math.floor(name.length / 4)));
  let best = null, bestD = Infinity;
  for (const k of pool) {
    if (Math.abs(k.length - name.length) > limit) continue;
    const d = distance(name, k);
    if (d < bestD) { bestD = d; best = k; }
  }
  if (best && bestD <= limit) return best;
  // "ncss-card-titel" -> gleiche Familie anbieten
  const family = name.split("-").slice(0, 2).join("-");
  const fam = pool.filter((k) => k.startsWith(family + "-") || k === family).slice(0, 4);
  return fam.length ? fam.join(", ") : null;
}

const TAILWIND = /^(?:(?:sm|md|lg|xl|2xl|hover|focus|dark):.+|(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy]|w|h|min-w|max-w|min-h|top|left|right|bottom|inset)-(?:\d+(?:\.\d+)?|px|full|screen|auto|\[.+\])|grid-cols-\d+|col-span-\d+|flex-(?:row|col|wrap|1)|items-(?:center|start|end|stretch)|justify-(?:center|between|around|start|end)|text-(?:xs|sm|base|lg|[2-9]?xl|left|center|right)|font-(?:bold|semibold|medium|light)|bg-[a-z]+-\d{2,3}|text-[a-z]+-\d{2,3}|rounded(?:-[a-z0-9]+)?|shadow-(?:sm|md|lg|xl|2xl)|border-[a-z]+-\d{2,3})$/;
const BOOTSTRAP = /^(?:col-(?:xs|sm|md|lg|xl|xxl)-\d+|col-\d+|row|btn-(?:primary|secondary|success|danger|warning|info|light|dark|outline-[a-z]+)|d-(?:none|flex|block|inline|grid)|d-(?:sm|md|lg|xl)-[a-z]+|offset-(?:sm|md|lg|xl)-\d+)$/;

/* ---- Prüfung ----------------------------------------------------------------- */

const RAW = new Set(["script", "style", "textarea", "pre"]);

/** ncss-Klassen, die eine Seite selbst definiert (<style> bzw. lokal verlinkte Stylesheets). */
const cssCache = new Map();
async function localClasses(source, file) {
  const extra = new Set();
  const collect = (css) => { for (const m of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\.(ncss-[A-Za-z0-9_-]+)/g)) extra.add(m[1]); };
  for (const m of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) collect(m[1]);
  if (file) {
    for (const m of source.matchAll(/<link\b[^>]*rel=["']?stylesheet[^>]*>/gi)) {
      const href = m[0].match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!href || /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("/") || /[<{]/.test(href)) continue;
      const path = resolve(dirname(file), href.split(/[?#]/)[0]);
      if (path.startsWith(join(root, "dist"))) continue; // die Bibliothek selbst steht schon in classes.json
      if (!cssCache.has(path)) cssCache.set(path, await readFile(path, "utf8").catch(() => ""));
      collect(cssCache.get(path));
    }
  }
  return extra;
}

export function check(source, { extraClasses = new Set() } = {}) {
  const isKnownClass = (c) => isKnownLibClass(c) || extraClasses.has(c);
  const findings = [];
  const src = blank(source);
  const lineAt = lineIndex(src);
  const add = (level, idx, msg) => findings.push({ level, line: lineAt(idx), msg });
  const uikitPage = /uikit(?:\.min)?\.(?:css|js)|<ncss-container[\s>]/i.test(source);

  // ids im Dokument (für commandfor/label for), inkl. id="…" mit Template-Ausdruck
  const ids = new Set([...src.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]));
  const labelFor = new Set([...src.matchAll(/<label\b[^>]*\sfor\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]));

  const tagRe = /<([a-zA-Z][\w-]*)((?:\s+(?:[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)|\s*\/)*)\s*>|<\/([a-zA-Z][\w-]*)\s*>/g;
  const labelStack = [];
  let rawUntil = null;

  for (const tag of src.matchAll(tagRe)) {
    if (tag[3]) {
      const n = tag[3].toLowerCase();
      if (rawUntil === n) rawUntil = null;
      if (n === "label") labelStack.pop();
      continue;
    }
    if (rawUntil) continue;
    const name = tag[1].toLowerCase();
    const attrs = tag[2] ?? "";
    const idx = tag.index;
    if (RAW.has(name)) rawUntil = name;

    const attrMap = new Map();
    for (const a of attrs.matchAll(/([^\s"'>/=]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
      attrMap.set(a[1].toLowerCase(), a[2] === undefined ? "" : (a[3] ?? a[4] ?? a[5] ?? ""));
    }
    const has = (n) => attrMap.has(n);
    const get = (n) => attrMap.get(n);

    if (name === "label") labelStack.push(true);

    const classValue = get("class") ?? get("classname") ?? "";
    const list = classValue.split(/\s+/).filter(Boolean);

    for (const c of list) {
      if (c.includes(BLANK) || /[{}$<>()[\]]/.test(c)) continue; // Template-Ausdruck
      if (/^(?:data-)?uk-/.test(c)) {
        if (uikitPage) continue;
        const to = ukMap?.[c];
        add("error", idx, `UIkit-Klasse "${c}"${to ? ` - NativeCSS: ${to === null ? "(entfällt)" : `"${to}"`}` : ""} (ganze Dateien: node tools/uikit-to-ncss/convert.mjs).`);
        continue;
      }
      if (c.startsWith("ncss-")) {
        if (/@(?:s|m|l|xl)$/.test(c)) { add("error", idx, `Breakpoint-Klasse "${c}" gibt es in NativeCSS nicht - .ncss-grid (auto-fit) oder Container Queries statt klasse@breakpoint.`); continue; }
        if (!isKnownClass(c)) {
          const near = suggest(c, classNames);
          add("error", idx, `Unbekannte Klasse "${c}"${near ? ` - meintest du ${near.includes(" ") || near.includes("<") ? near : `"${near}"`}?` : ""} (siehe llms/classes.json).`);
        }
        continue;
      }
      if (TAILWIND.test(c)) add("warning", idx, `"${c}" sieht nach Tailwind aus - NativeCSS hat keine Utility-Matrix; Komponenten/Layout-Primitive (.ncss-grid, .ncss-stack, .ncss-cluster) und Tokens verwenden.`);
      else if (BOOTSTRAP.test(c)) add("warning", idx, `"${c}" sieht nach Bootstrap aus - in NativeCSS gibt es kein Spaltenraster; .ncss-grid bricht ohne Breakpoints um.`);
      else if (/@(?:s|m|l|xl)$/.test(c)) add("warning", idx, `Breakpoint-Suffix in "${c}" - NativeCSS nutzt intrinsische Layouts/Container Queries statt klasse@breakpoint.`);
    }

    // Attribute (nur Namen)
    for (const a of attrMap.keys()) {
      if (a.includes(BLANK)) continue;
      if (/^(?:data-)?uk-/.test(a)) {
        if (!uikitPage) add("error", idx, `UIkit-Attribut "${a}" - NativeCSS nutzt native Elemente (<dialog> + command/commandfor, <details>, .ncss-grid); siehe docs/de/uikit-migration.html oder tools/uikit-to-ncss/.`);
      } else if (a.startsWith("data-ncss-") && !knownData.has(a)) {
        const near = suggest(a, [...knownData]);
        add("error", idx, `Unbekanntes Attribut "${a}"${near ? ` - meintest du "${near}"?` : ""} (siehe llms/components.json).`);
      }
    }

    if (name.startsWith("ncss-") && !knownElements.has(name)) {
      const near = suggest(name, [...knownElements]);
      add("error", idx, `Unbekanntes Element <${name}>${near ? ` - meintest du <${near}>?` : ""} (siehe llms/components.json).`);
    }

    const dialogClass = list.find((c) => c === "ncss-modal" || c === "ncss-offcanvas");
    if (dialogClass && name !== "dialog") add("error", idx, `.${dialogClass} muss auf einem <dialog> stehen, nicht auf <${name}> (natives showModal/close, Fokus-Falle, Esc).`);
    if (name === "dialog" && dialogClass && !has("aria-label") && !has("aria-labelledby")) add("warning", idx, `<dialog class="${dialogClass}"> ohne zugänglichen Namen - aria-labelledby (Überschrift) oder aria-label ergänzen.`);

    const target = get("commandfor") ?? get("popovertarget");
    if (target && !target.includes(BLANK) && !ids.has(target)) add("warning", idx, `${has("commandfor") ? "commandfor" : "popovertarget"}="${target}" - kein Element mit dieser id in der Datei (liegt es in einem anderen Template, ignorieren).`);

    if (name === "img" && !has("alt")) add("warning", idx, '<img> ohne alt (dekorativ: alt="").');

    if (name === "button" || (name === "a" && has("href"))) {
      const close = src.indexOf(`</${name}`, idx);
      const inner = close > 0 ? src.slice(idx + tag[0].length, close) : "";
      const text = inner.replace(/<[^>]*>/g, "").replace(/&nbsp;|\s/g, "").replace(new RegExp(BLANK, "g"), "x");
      const imgAlt = /<img\b[^>]*\balt\s*=\s*("[^"]+"|'[^']+')/i.test(inner);
      // <title> im SVG, aria-label an einem inneren svg/img (role="img"), <selectedcontent> (Customizable Select)
      const svgTitle = /<title>|<selectedcontent|\saria-label\s*=\s*["'][^"']+["']/i.test(inner);
      const scriptLabelled = has("data-ncss-theme-toggle") || has("data-ncss-marquee-toggle") || has("data-ncss-lightbox");
      if (!text && !imgAlt && !svgTitle && !scriptLabelled && !has("aria-label") && !has("aria-labelledby") && !has("title")) {
        add("warning", idx, `<${name}> ohne zugänglichen Namen (nur Icon?) - aria-label ergänzen.`);
      }
    }

    if ((name === "input" || name === "select" || name === "textarea") && !labelStack.length) {
      const type = (get("type") ?? "text").toLowerCase();
      const needsLabel = !["hidden", "submit", "button", "reset", "image"].includes(type);
      const id = get("id");
      if (needsLabel && !has("aria-label") && !has("aria-labelledby") && !has("title") && !(id && (labelFor.has(id) || id.includes(BLANK)))) {
        add("warning", idx, `<${name}${type !== "text" ? ` type="${type}"` : ""}> ohne Label - <label for> oder aria-label ergänzen (placeholder ist kein Label).`);
      }
    }
  }
  return findings;
}

/* ---- Einstieg --------------------------------------------------------------- */

const isMarkup = (f) => MARKUP.has(extname(f).toLowerCase()) || f.endsWith(".blade.php");

async function* walk(path) {
  const s = await stat(path);
  if (s.isFile()) { yield path; return; }
  for (const e of await readdir(path, { withFileTypes: true })) {
    if (e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
    yield* walk(join(path, e.name));
  }
}

async function readStdin() {
  if (process.stdin.isTTY) return null;
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim() ? data : null;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const errorsOnly = args.includes("--errors-only");
  const inputs = args.filter((a) => !a.startsWith("--"));
  let hookMode = false;

  if (!inputs.length) {
    const raw = await readStdin();
    if (raw) {
      try {
        const input = JSON.parse(raw);
        const p = input.tool_input?.file_path ?? input.tool_input?.path ?? input.tool_response?.filePath;
        if (p) { inputs.push(p); hookMode = true; }
      } catch { /* kein Hook-JSON */ }
    }
    if (!inputs.length) {
      if (raw !== null) process.exit(0); // Hook ohne Dateipfad: nichts zu tun
      console.error("Aufruf: node llms/hooks/check-classes.mjs <datei|ordner>... [--json] [--errors-only]   (oder als Claude-Code-PostToolUse-Hook)");
      process.exit(1);
    }
  }

  const results = [];
  let errors = 0, warnings = 0;
  for (const input of inputs) {
    let files;
    try { files = []; for await (const f of walk(input)) files.push(f); } catch { continue; }
    for (const file of files) {
      if (!isMarkup(file)) continue;
      let source;
      try { source = await readFile(file, "utf8"); } catch { continue; }
      if (!/ncss-|uk-|data-uk/.test(source)) continue;
      let findings = check(source, { extraClasses: await localClasses(source, file) });
      if (errorsOnly) findings = findings.filter((f) => f.level === "error");
      errors += findings.filter((f) => f.level === "error").length;
      warnings += findings.filter((f) => f.level === "warning").length;
      if (findings.length) results.push({ file, findings });
    }
  }

  if (json) {
    console.log(JSON.stringify({ errors, warnings, files: results }, null, 1));
  } else if (results.length) {
    const lines = ["NativeCSS-Prüfung:"];
    for (const r of results) {
      lines.push(r.file);
      for (const f of r.findings) lines.push(`  ${f.level === "error" ? "Fehler " : "Hinweis"} Zeile ${f.line}: ${f.msg}`);
    }
    lines.push(`${errors} Fehler, ${warnings} Hinweis(e).`);
    const text = lines.join("\n");
    if (hookMode) { console.error(text); process.exit(errors ? 2 : 0); }
    console.log(text);
  } else if (!hookMode) {
    console.log("NativeCSS-Prüfung: keine Funde.");
  }
  process.exit(errors ? (hookMode ? 2 : 1) : 0);
}
