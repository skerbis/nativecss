/**
 * NativeCSS - gemeinsamer Scanner für die Maintainer-Werkzeuge (tools/index.mjs,
 * llms/hooks/check-classes.mjs). Liest NUR dist/ (die Bibliothek ist die einzige Quelle
 * der Wahrheit) und liefert Klassen, Custom Elements, data-ncss-*-Attribute, Events und
 * Tokens. Reines node:fs, keine Abhängigkeiten.
 *
 *   import { scanLibrary } from "./lib/scan.mjs";
 *   const lib = await scanLibrary(rootDir);
 */

import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

/** Alle Dateien unter dir (rekursiv), relativ zu root, sortiert. */
export async function listFiles(root, dir, filter = () => true) {
  const out = [];
  async function walk(d) {
    let entries;
    try { entries = await readdir(join(root, d), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) await walk(p);
      else if (filter(p)) out.push(p);
    }
  }
  await walk(dir);
  return out.sort();
}

export const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** JS-Kommentare entfernen (Strings bleiben erhalten - grob, aber für dist/js ausreichend). */
export function stripJsComments(src) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      out += c;
      if (c === "\\") { out += src[i + 1] ?? ""; i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "/" && src[i + 1] === "/") { const e = src.indexOf("\n", i); i = e < 0 ? src.length : e; continue; }
    out += c;
    i++;
  }
  return out;
}

/** Erster Block-Kommentar der Datei als bereinigter Text (ohne führende " * "). */
export function headerOf(src) {
  const m = src.match(/^\s*\/\*[\s\S]*?\*\//);
  if (!m) return "";
  return m[0]
    .replace(/^\s*\/\*+/, "")
    .replace(/\*+\/$/, "")
    .split("\n")
    .map((l) => l.replace(/^\s?\*\s?/, "").replace(/\s+$/, ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

/** Erste inhaltliche Zeile/Satz eines Headers (für Kurzbeschreibungen). */
export function summaryOf(header) {
  const first = header.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ").trim();
  const cleaned = first.replace(/^(ncss|NativeCSS)\s*-\s*/i, "");
  // erster Satz: Punkt + Leerzeichen, aber nicht nach Abkürzungen (z.B., bzw., ca. ...)
  let end = -1;
  for (const m of cleaned.matchAll(/\.(?=\s|$)/g)) {
    const before = cleaned.slice(Math.max(0, m.index - 6), m.index + 1);
    if (/(z\.B|d\.h|u\.a|bzw|ca|ggf|inkl|evtl|vgl|etc|s|o\.ä|Nr|Abs)\.$/i.test(before)) continue;
    end = m.index;
    break;
  }
  const s = end > 0 ? cleaned.slice(0, end) : cleaned;
  return s.length > 240 ? s.slice(0, 237).replace(/\s+\S*$/, "") + " ..." : s;
}

const SECTION_START = /^(Attribute(?: am [^:]+)?|Events?(?: \([^)]*\))?(?: am [^:]+)?|Öffentlich|API|Benötigt|Abhängigkeiten|Einbindung|Texte|Tasten[^:]*|Optionen|Verhalten|Laden|Markup|Karte[^:]*|Deklarativ|Alternativ[^:]*):/;

/** Header in benannte Abschnitte zerlegen ("Attribute:", "Events:", "Öffentlich:" ...). */
export function sections(header) {
  const out = [];
  let cur = null;
  for (const line of header.split("\n")) {
    const t = line.trim();
    const m = t.match(SECTION_START);
    if (m && line.search(/\S/) <= 1) {
      cur = { name: m[1], lines: [t.slice(m[0].length)] };
      out.push(cur);
      continue;
    }
    if (cur) {
      if (!t) { cur = null; continue; }
      if (line.search(/\S/) <= 0 && !/^[a-z"(<]/.test(t)) { cur = null; continue; }
      cur.lines.push(line);
    }
  }
  return out;
}

/** Attribut-Einträge aus einem "Attribute:"-Abschnitt (Name, Default, Beschreibung). */
export function parseAttributeSection(lines) {
  const items = [];
  const text = lines.join("\n");
  // Inline-Form: "src (Muster ...) · count · first="1" · ..."
  const chunks = text.includes("·") ? text.split("·") : null;
  const entryRe = /^\s*([a-z][a-z0-9-]*)(?:="([^"]*)")?(?:\s+(.*))?$/s;
  if (chunks) {
    for (const ch of chunks) {
      const m = ch.trim().match(entryRe);
      if (m) items.push({ name: m[1], default: m[2] ?? null, description: (m[3] ?? "").replace(/\s+/g, " ").trim() });
    }
    return items;
  }
  let indent = null;
  // "delay="400" (ms ...), hide-delay="250"" - mehrere Einträge in einer Zeile
  lines = lines.flatMap((l, i) => {
    const pad = " ".repeat(Math.max(0, l.search(/\S/)));
    const parts = l.split(/,\s+(?=[a-z][a-z0-9-]*="[^"]*")/).map((p, k) => (k ? pad + p.trim() : p));
    // skip-back="15" skip-forward="30" - mehrere name="wert" ohne Beschreibung dazwischen
    return parts.flatMap((p) => {
      const out = [];
      let rest = p;
      let m;
      while ((m = rest.trim().match(/^([a-z][a-z0-9-]*="[^"]*")[\s,]+([a-z][a-z0-9-]*="[^"]*".*)$/))) { out.push(pad + m[1]); rest = pad + m[2]; }
      out.push(rest);
      return out;
    });
  });
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const ind = raw.search(/\S/);
    const m = raw.match(/^\s*([a-z][a-z0-9-]*)(?:="([^"]*)")?(?:\s{2,}(.*)|\s+(\(.*)|\s*$)/);
    if (m && (indent === null || ind <= indent)) {
      indent = ind;
      items.push({ name: m[1], default: m[2] ?? null, description: (m[3] ?? m[4] ?? "").trim() });
    } else if (items.length) {
      items[items.length - 1].description = `${items[items.length - 1].description} ${raw.trim()}`.trim();
    }
  }
  return items;
}

const GLOBAL_ATTRS = new Set(["lang", "id", "class", "style", "title", "role", "tabindex", "hidden", "popover", "href", "dir", "inert", "slot"]);

/** Bibliothek scannen. */
export async function scanLibrary(root) {
  const read = (f) => readFile(join(root, f), "utf8");
  const cssFiles = await listFiles(root, "dist", (p) => p.endsWith(".css"));
  const jsFiles = await listFiles(root, "dist/js", (p) => p.endsWith(".js"));

  const classes = new Map(); // name -> Set(files)
  const addClass = (c, f) => { if (!classes.has(c)) classes.set(c, new Set()); classes.get(c).add(f); };
  const cssElements = new Map(); // tag -> Set(files)
  const dataAttrs = new Map(); // data-ncss-x -> { files:Set, description }
  const addData = (a, f) => { if (!dataAttrs.has(a)) dataAttrs.set(a, { files: new Set(), description: "" }); dataAttrs.get(a).files.add(f); };
  const tokens = new Map(); // --ncss-x -> { value, file, seed }
  const tokenRefs = new Map(); // --ncss-x -> { fallback, files:Set }
  const files = []; // { file, kind, header }
  const prefixClasses = new Map(); // [class*="ncss-x"] prefix -> files

  for (const f of cssFiles) {
    const src = await read(f);
    const header = headerOf(src);
    files.push({ file: f, kind: "css", header });
    const css = stripCssComments(src);
    // Selektor-Präludien: Text zwischen dem vorigen ; { } und der nächsten {
    for (const pre of css.matchAll(/(?<=^|[;{}])([^;{}]*)\{/g)) {
      const sel = pre[1].replace(/"[^"]*"|'[^']*'/g, '""');
      const t = sel.trim();
      if (t.startsWith("@") && !/^@(media|supports|container|layer|scope|starting-style|document)/.test(t)) continue;
      for (const m of sel.matchAll(/\.(ncss-[A-Za-z0-9_-]+)/g)) addClass(m[1], f);
      if (!t.startsWith("@")) {
        for (const m of sel.matchAll(/(?:^|[\s,>+~(])(ncss-[a-z][a-z0-9-]*)(?![\w-])/g)) {
          if (!cssElements.has(m[1])) cssElements.set(m[1], new Set());
          cssElements.get(m[1]).add(f);
        }
      }
      for (const m of pre[1].matchAll(/\[(data-ncss-[a-z0-9-]+)/g)) addData(m[1], f);
      for (const m of pre[1].matchAll(/\[class[*^~|]?=["'](ncss-[a-z0-9-]+)["']\]/g)) {
        if (!prefixClasses.has(m[1])) prefixClasses.set(m[1], new Set());
        prefixClasses.get(m[1]).add(f);
      }
    }
    // Custom Properties: Deklarationen + var()-Referenzen mit Fallback
    for (const m of css.matchAll(/(?<=[{;\s])(--ncss-[a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
      const name = m[1];
      const value = m[2].replace(/\s+/g, " ").trim();
      if (!tokens.has(name) || (f === "dist/tokens.css" || f === "dist/colors.css") && !["dist/tokens.css", "dist/colors.css"].includes(tokens.get(name).file)) {
        tokens.set(name, { value, file: f, seed: false });
      }
      if (f === "dist/theme.css") tokens.get(name).seed = true;
    }
    for (const m of css.matchAll(/var\(\s*(--ncss-[a-z0-9-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g)) {
      if (!tokenRefs.has(m[1])) tokenRefs.set(m[1], { fallback: null, files: new Set() });
      const r = tokenRefs.get(m[1]);
      r.files.add(f);
      if (m[2] && !r.fallback) r.fallback = m[2].trim();
    }
  }

  const elements = new Map(); // tag -> info
  const scripts = [];
  for (const f of jsFiles) {
    const src = await read(f);
    const header = headerOf(src);
    files.push({ file: f, kind: "js", header });
    const code = stripJsComments(src);
    const secs = sections(header);

    // Klassen, die das Script setzt oder sucht
    for (const m of code.matchAll(/\.(ncss-[a-z0-9]+(?:-{1,2}[a-z0-9]+)*)(?![\w-])/g)) addClass(m[1], f);
    for (const m of code.matchAll(/classList\.(?:add|remove|toggle|contains|replace)\(([^)]*)\)/g)) {
      for (const c of m[1].matchAll(/["'](ncss-[a-z0-9]+(?:-{1,2}[a-z0-9]+)*)["']/g)) addClass(c[1], f);
    }
    for (const m of code.matchAll(/class(?:Name)?\s*[=:]\s*\\?["']([^"'\\]*)/g)) {
      for (const c of m[1].matchAll(/(?:^|\s)(ncss-[a-z0-9]+(?:-{1,2}[a-z0-9]+)*)(?=\s|$)/g)) addClass(c[1], f);
    }
    for (const m of code.matchAll(/["']class["']\s*,\s*["']([^"']*)["']/g)) {
      for (const c of m[1].matchAll(/(?:^|\s)(ncss-[a-z0-9]+(?:-{1,2}[a-z0-9]+)*)(?=\s|$)/g)) addClass(c[1], f);
    }

    for (const m of src.matchAll(/data-ncss-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])/g)) addData(m[0], f);

    const defined = [...code.matchAll(/(?:customElements|M)\.define\(\s*["']([a-z0-9-]+)["']/g)].map((m) => m[1]);
    const dispatched = [...code.matchAll(/new CustomEvent\(\s*["'](ncss-[a-z0-9-]+)["']/g)].map((m) => m[1]);
    // Events aus dem Header ("Events ...:" bzw. Zeilen mit "Event")
    const headerEvents = [];
    for (const s of secs.filter((s) => /^Events?/.test(s.name))) {
      for (const m of s.lines.join(" ").matchAll(/\bncss-[a-z0-9]+(?:-[a-z0-9]+)+/g)) headerEvents.push(m[0]);
    }
    for (const line of header.split("\n").filter((l) => /Event/.test(l))) {
      for (const m of line.matchAll(/"(ncss-[a-z0-9]+(?:-[a-z0-9]+)+)"/g)) headerEvents.push(m[1]);
    }
    const events = [...new Set([...dispatched, ...headerEvents])].filter((e) => !defined.includes(e) && !e.startsWith("ncss-theme")).sort();

    // Öffentliche Methoden/Eigenschaften (Header "Öffentlich:"/"API:")
    const api = [];
    for (const s of secs.filter((s) => s.name === "Öffentlich" || s.name === "API")) {
      for (const m of s.lines.join(" ").matchAll(/\bel\.([a-zA-Z_]\w*)(\([^)]*\))?(?:\s*=\s*[^\s,;]+)?/g)) {
        const name = m[1];
        if (!api.some((a) => a.name === name)) api.push({ name, kind: m[2] ? "method" : "property", signature: `${name}${m[2] ?? ""}` });
      }
    }
    // Attribute (Header) + vom Code gelesene Attribute
    const attrs = [];
    for (const s of secs.filter((s) => s.name.startsWith("Attribute"))) {
      for (const a of parseAttributeSection(s.lines)) if (!attrs.some((x) => x.name === a.name)) attrs.push(a);
    }
    const codeAttrs = [...new Set([...code.matchAll(/\b(?:this|self|host|el|box)\.(?:get|has)Attribute\(\s*["']([a-z][a-z0-9-]*)["']/g)].map((m) => m[1]))]
      .filter((a) => !GLOBAL_ATTRS.has(a) && !a.startsWith("aria-") && !a.startsWith("data-"));

    const hasOnly = (name) => new RegExp(`hasAttribute\\(\\s*["']${name}["']`).test(code) && !new RegExp(`getAttribute\\(\\s*["']${name}["']`).test(code);
    for (const a of attrs) a.boolean = !a.default && hasOnly(a.name);
    const info = {
      file: f,
      summary: summaryOf(header),
      elements: defined,
      events,
      api,
      attributes: attrs,
      dataAttributes: [...new Set([...src.matchAll(/data-ncss-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])/g)].map((m) => m[0]))].sort(),
      header,
    };
    scripts.push(info);
    for (const tag of defined) {
      const elAttrs = attrs.filter((a) => !a.name.startsWith("data-"));
      for (const a of codeAttrs) if (!elAttrs.some((x) => x.name === a)) elAttrs.push({ name: a, default: null, description: "", boolean: hasOnly(a) });
      const css = [...(cssElements.get(tag) ?? [])];
      elements.set(tag, { tag, script: f, css, summary: info.summary, attributes: elAttrs, events, api });
    }
  }
  // Rein per CSS gestylte Elemente ohne eigenes Script (selten)
  for (const [tag, fs] of cssElements) {
    if (!elements.has(tag)) elements.set(tag, { tag, script: null, css: [...fs], summary: "", attributes: [], events: [], api: [] });
    else for (const x of fs) if (!elements.get(tag).css.includes(x)) elements.get(tag).css.push(x);
  }

  // Beschreibung je data-ncss-Attribut: Kurzbeschreibung des (ersten) Scripts bzw. der
  // CSS-Datei + die erste Header-Zeile, die das Attribut als Markup zeigt
  const sources = new Map(files.map((x) => [x.file, x]));
  for (const [attr, info] of dataAttrs) {
    const owners = [...info.files].sort((a, b) => (a.endsWith(".js") === b.endsWith(".js") ? a.localeCompare(b) : a.endsWith(".js") ? -1 : 1));
    const owner = sources.get(owners[0]);
    info.description = owner ? summaryOf(owner.header) : "";
    for (const f of owners) {
      const line = (sources.get(f)?.header ?? "").split("\n").find((l) => l.includes(attr) && l.includes("<"));
      if (line) { info.example = line.trim(); break; }
    }
    info.setByScript = false;
    for (const f of owners.filter((x) => x.endsWith(".js"))) {
      const code = stripJsComments(await read(f));
      if (new RegExp(`(set|toggle)Attribute\\(\\s*["']${attr}["']`).test(code)) info.setByScript = true;
    }
    info.documented = owners.some((f) => (sources.get(f)?.header ?? "").includes(attr));
  }

  return {
    classes,
    prefixClasses,
    elements,
    dataAttrs,
    tokens,
    tokenRefs,
    files,
    scripts,
    cssFiles,
    jsFiles,
    rel: (p) => relative(root, p),
  };
}
