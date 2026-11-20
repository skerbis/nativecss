#!/usr/bin/env node
/**
 * NativeCSS - Generator für die maschinenlesbaren Referenzen (Maintainer-Werkzeug).
 * Reines node:-Skript, kein npm. Liest NUR dist/ und schreibt:
 *
 *   llms/classes.json              jede ncss-Klasse -> definierende Datei(en)
 *   llms/components.json           Custom Elements, data-ncss-*-Attribute, Events, Scripts
 *   llms/reference.md              Header-Doku jeder CSS-/JS-Datei
 *   tools/vscode/ncss.html-data.json   VS Code HTML Custom Data (ncss-* Elemente, data-ncss-*)
 *   tools/vscode/ncss.css-data.json    VS Code CSS Custom Data (--ncss-* Tokens mit Wert)
 *   tools/vscode/ncss.code-snippets    Markup-Snippets (Quelle: tools/vscode/snippets.mjs)
 *
 * Aufruf (Repo-Wurzel):  node tools/index.mjs          schreiben
 *                        node tools/index.mjs --check  nur prüfen, ob alles aktuell ist
 *                                                      (Exit 1, wenn eine Datei veraltet ist)
 * Nach jeder Änderung an dist/ neu laufen lassen.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { scanLibrary, summaryOf } from "./lib/scan.mjs";
import { snippets } from "./vscode/snippets.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const checkOnly = process.argv.includes("--check");
const lib = await scanLibrary(root);
const strip = (f) => f.replace(/^dist\//, "");

/* ---- classes.json ---------------------------------------------------------- */
const classJson = Object.fromEntries(
  [...lib.classes.keys()].sort().map((c) => [c, [...lib.classes.get(c)].map(strip).sort()])
);

/* ---- components.json ------------------------------------------------------- */
const elements = {};
for (const tag of [...lib.elements.keys()].sort()) {
  const e = lib.elements.get(tag);
  elements[tag] = {
    script: e.script ? strip(e.script) : null,
    css: e.css.map(strip).sort(),
    description: e.summary,
    attributes: e.attributes.map((a) => ({ name: a.name, default: a.default, boolean: !!a.boolean, description: a.description })),
    events: e.events,
    api: e.api,
  };
}
const dataAttributes = {};
for (const a of [...lib.dataAttrs.keys()].sort()) {
  const d = lib.dataAttrs.get(a);
  dataAttributes[a] = {
    files: [...d.files].map(strip).sort(),
    description: d.description,
    ...(d.example ? { example: d.example } : {}),
    ...(d.setByScript && !d.documented ? { internal: true } : {}),
  };
}
const scripts = {};
for (const s of lib.scripts) {
  scripts[strip(s.file)] = {
    description: s.summary,
    elements: s.elements,
    dataAttributes: s.dataAttributes,
    events: s.events,
    api: s.api.map((a) => a.signature),
  };
}
const events = [...new Set(lib.scripts.flatMap((s) => s.events))].sort();
const componentsJson = {
  $comment: "Generiert von tools/index.mjs aus dist/ - nicht von Hand bearbeiten.",
  elements,
  dataAttributes,
  globalAttributes: {
    "data-theme": { on: "<html>", values: ["light", "dark"], description: "Erzwingt Hell/Dunkel (sonst System). Gesetzt von js/theme-toggle.js." },
    "data-palette": { on: "<html> oder beliebiger Vorfahre", values: ["sunset", "football"], description: "Beispiel-Paletten aus colors.css - eigene nach demselben Muster." },
  },
  events,
  scripts,
};

/* ---- reference.md ---------------------------------------------------------- */
const groups = [
  ["Kern (dist/*.css)", (f) => /^dist\/[^/]+\.css$/.test(f)],
  ["Helpers (dist/helpers/)", (f) => f.startsWith("dist/helpers/")],
  ["Komponenten (dist/components/)", (f) => f.startsWith("dist/components/")],
  ["Integrationen (dist/integrations/, opt-in)", (f) => f.startsWith("dist/integrations/")],
  ["JavaScript (dist/js/, je Datei opt-in)", (f) => f.startsWith("dist/js/")],
];
const classesByFile = new Map();
for (const [c, fs] of lib.classes) for (const f of fs) {
  if (!classesByFile.has(f)) classesByFile.set(f, []);
  classesByFile.get(f).push(c);
}
let md = `# NativeCSS - Referenz (generiert)

Header-Dokumentation jeder Datei in \`dist/\`. Erzeugt von \`node tools/index.mjs\` - nicht von Hand
bearbeiten. Klasse -> Datei: \`llms/classes.json\`. Custom Elements/Attribute/Events: \`llms/components.json\`.
Anleitung für Coding-Agents: \`llms/GUIDE.md\`.

*English: generated header documentation of every file in \`dist/\` (comments are German).*

Stand: ${Object.keys(classJson).length} Klassen, ${Object.keys(elements).length} Custom Elements, ${Object.keys(dataAttributes).length} data-ncss-Attribute, ${lib.tokens.size} Tokens.
`;
for (const [title, test] of groups) {
  md += `\n## ${title}\n`;
  for (const { file, header } of lib.files.filter((x) => test(x.file)).sort((a, b) => a.file.localeCompare(b.file))) {
    md += `\n### \`${strip(file)}\`\n\n`;
    const cls = (classesByFile.get(file) ?? []).sort();
    const s = lib.scripts.find((x) => x.file === file);
    if (s) {
      if (s.elements.length) md += `Elemente: ${s.elements.map((e) => `\`<${e}>\``).join(", ")}\n\n`;
      const el = s.elements.length ? lib.elements.get(s.elements[0]) : null;
      if (el?.attributes.length) md += `Attribute: ${el.attributes.map((a) => `\`${a.name}${a.default ? `="${a.default}"` : ""}\``).join(", ")}\n\n`;
      if (s.dataAttributes.length) md += `data-Attribute: ${s.dataAttributes.map((a) => `\`${a}\``).join(", ")}\n\n`;
      if (s.events.length) md += `Events: ${s.events.map((e) => `\`${e}\``).join(", ")}\n\n`;
      if (s.api.length) md += `Öffentlich: ${s.api.map((a) => `\`el.${a.signature}\``).join(", ")}\n\n`;
    } else if (cls.length) {
      md += `Klassen (${cls.length}): ${cls.map((c) => `\`.${c}\``).join(" ")}\n\n`;
    }
    if (header) md += "```text\n" + header + "\n```\n";
  }
}

/* ---- VS Code HTML Custom Data --------------------------------------------- */
const mdDesc = (value) => ({ kind: "markdown", value });
const htmlData = {
  version: 1.1,
  tags: Object.entries(elements).map(([tag, e]) => ({
    name: tag,
    description: mdDesc(
      [
        e.description || `NativeCSS-Element \`<${tag}>\``,
        e.script ? `\n\nScript: \`${e.script}\`` : "",
        e.css.length ? ` · CSS: ${e.css.map((c) => `\`${c}\``).join(", ")}` : "",
        e.events.length ? `\n\nEvents: ${e.events.map((x) => `\`${x}\``).join(", ")}` : "",
        e.api.length ? `\n\nÖffentlich: ${e.api.map((x) => `\`el.${x.signature}\``).join(", ")}` : "",
      ].join("")
    ),
    attributes: e.attributes.map((a) => {
      const attr = { name: a.name, description: [a.description, a.default ? `Default/Beispiel: \`${a.default}\`` : ""].filter(Boolean).join(" - ") || undefined };
      if (a.boolean) attr.valueSet = "v"; // VS-Code-Konvention: "v" = boolesches Attribut ohne Wert
      return attr;
    }),
    references: [{ name: "NativeCSS-Handbuch", url: "https://skerbis.github.io/nativecss/docs/de/all-components.html" }],
  })),
  globalAttributes: [
    ...Object.entries(dataAttributes).map(([name, d]) => ({
      name,
      description: mdDesc(
        `${d.internal ? "(intern, vom Script gesetzt) " : ""}${d.description || "NativeCSS-Attribut"}` +
        (d.example ? `\n\n\`\`\`html\n${d.example}\n\`\`\`` : "") +
        `\n\nQuelle: ${d.files.map((f) => `\`${f}\``).join(", ")}`
      ),
    })),
    { name: "data-theme", description: mdDesc("NativeCSS: erzwingt Hell/Dunkel am `<html>` (sonst Systemeinstellung)."), values: [{ name: "light" }, { name: "dark" }] },
    { name: "data-palette", description: mdDesc("NativeCSS: Paletten-Konvention aus `colors.css` (Beispiele `sunset`, `football`)."), values: [{ name: "sunset" }, { name: "football" }] },
  ],
};

/* ---- VS Code CSS Custom Data ---------------------------------------------- */
const tokenNames = [...new Set([...lib.tokens.keys(), ...lib.tokenRefs.keys()])].sort();
const cssData = {
  version: 1.1,
  properties: tokenNames.map((name) => {
    const t = lib.tokens.get(name);
    const r = lib.tokenRefs.get(name);
    const where = t ? strip(t.file) : [...(r?.files ?? [])].map(strip).slice(0, 3).join(", ");
    const value = t?.value ?? (r?.fallback ? `${r.fallback} (Fallback in var())` : "nicht global gesetzt - Parameter pro Element");
    const lines = [
      t?.seed ? "**Seed-Wert** - in der eigenen `theme.css` überschreiben (`:root, :host { ... }`)." : t && /color-mix|calc\(/.test(t.value) ? "Abgeleiteter Wert - nicht einzeln setzen, folgt dem Seed." : "NativeCSS-Token / Parameter.",
      "",
      "```css",
      `${name}: ${value};`,
      "```",
      `Quelle: \`${where}\``,
    ];
    return { name, description: mdDesc(lines.join("\n")), syntax: "*" };
  }),
};

/* ---- Snippets ------------------------------------------------------------- */
const knownEl = new Set(Object.keys(elements));
const knownData = new Set(Object.keys(dataAttributes));
const snippetJson = {};
const skipped = [];
for (const s of snippets) {
  const body = s.body.join("\n");
  const plain = body.replace(/\$\{\d+(?::[^}]*|\|[^}]*\|)\}/g, (m) => m.replace(/^\$\{\d+[:|]/, "").replace(/\|?\}$/, "").split(",")[0]);
  const missing = [];
  for (const m of plain.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c.startsWith("ncss-") && !classJson[c]) missing.push(`.${c}`);
  for (const m of plain.matchAll(/<(ncss-[a-z0-9-]+)/g)) if (!knownEl.has(m[1])) missing.push(`<${m[1]}>`);
  for (const m of plain.matchAll(/\s(data-ncss-[a-z0-9-]+)/g)) if (!knownData.has(m[1])) missing.push(m[1]);
  if (missing.length) { skipped.push(`${s.prefix}: ${[...new Set(missing)].join(", ")}`); continue; }
  snippetJson[`NativeCSS: ${s.name}`] = { scope: "html,php,twig,blade,vue,svelte,astro,handlebars,nunjucks,liquid", prefix: s.prefix, body: s.body, description: s.description };
}

/* ---- schreiben / prüfen ---------------------------------------------------- */
const outputs = [
  ["llms/classes.json", JSON.stringify(classJson, null, 1) + "\n"],
  ["llms/components.json", JSON.stringify(componentsJson, null, 1) + "\n"],
  ["llms/reference.md", md],
  ["tools/vscode/ncss.html-data.json", JSON.stringify(htmlData, null, 1) + "\n"],
  ["tools/vscode/ncss.css-data.json", JSON.stringify(cssData, null, 1) + "\n"],
  ["tools/vscode/ncss.code-snippets", JSON.stringify(snippetJson, null, 2) + "\n"],
];
let stale = 0;
for (const [rel, content] of outputs) {
  const path = join(root, rel);
  let old = null;
  try { old = await readFile(path, "utf8"); } catch {}
  if (old === content) continue;
  stale++;
  if (checkOnly) { console.log(`veraltet: ${rel}`); continue; }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
for (const s of skipped) console.warn(`Snippet übersprungen (unbekannt in dist/): ${s}`);
console.log(
  `${Object.keys(classJson).length} Klassen, ${Object.keys(elements).length} Elemente, ${Object.keys(dataAttributes).length} data-ncss-Attribute, ` +
  `${tokenNames.length} Tokens, ${Object.keys(snippetJson).length} Snippets, reference.md ${(md.length / 1024).toFixed(0)} KB` +
  (checkOnly ? ` - ${stale ? `${stale} Datei(en) veraltet` : "alles aktuell"}` : ` - ${stale} Datei(en) geschrieben`)
);
process.exit(checkOnly && stale ? 1 : 0);
