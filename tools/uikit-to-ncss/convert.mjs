#!/usr/bin/env node
/**
 * NativeCSS - UIkit-3 -> NativeCSS Konverter (CLI). Reines node:-Skript, kein npm.
 *
 *   node tools/uikit-to-ncss/convert.mjs templates/              Probelauf: nur Bericht
 *   node tools/uikit-to-ncss/convert.mjs seite.php --write       Dateien überschreiben
 *   node tools/uikit-to-ncss/convert.mjs src/ --out ncss-src/    konvertierte Kopien
 *   node tools/uikit-to-ncss/convert.mjs modul.php --print       Ergebnis auf stdout
 *
 * Optionen:
 *   --write          Eingabedateien überschreiben (vorher committen/sichern!)
 *   --out <ordner>   konvertierte Dateien dorthin schreiben (Baumstruktur bleibt)
 *   --print          konvertiertes Markup auf stdout (eine Datei), Bericht auf stderr
 *   --lang de|en     Sprache für eingefügte aria-labels (Default: <html lang> bzw. de)
 *   --ext <liste>    Markup-Endungen (Default: html,htm,php,phtml,twig,tpl,blade.php,
 *                    vue,svelte,astro,hbs,njk,liquid,erb)
 *   --styles         zusätzlich .css/.less/.scss nach UIkit-Selektoren durchsuchen (nur Bericht)
 *   --json           Bericht als JSON
 *   --quiet          nur Warnungen/Fehler, keine Infos
 *
 * Template-Code (PHP, Twig, Blade, REDAXO-REX_VALUE) bleibt Byte für Byte erhalten. Was
 * nicht sicher übertragbar ist, bleibt stehen und steht mit Zeilennummer im Bericht
 * ("warning" = braucht einen Menschen). Danach: node llms/hooks/check-classes.mjs <dateien>.
 */

import { readFile, writeFile, readdir, stat, mkdir } from "node:fs/promises";
import { join, relative, dirname, extname, resolve, basename } from "node:path";
import { convert, scanStyles } from "./core.js";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const inputs = argv.filter((a, i) => !a.startsWith("--") && !["--out", "--ext", "--lang"].includes(argv[i - 1]));

if (!inputs.length || flag("help")) {
  console.log("Aufruf: node tools/uikit-to-ncss/convert.mjs <datei|ordner>... [--write | --out ordner | --print] [--lang de|en] [--styles] [--json] [--quiet]");
  process.exit(inputs.length ? 0 : 1);
}

const markupExt = (value("ext") ?? "html,htm,php,phtml,twig,tpl,vue,svelte,astro,hbs,njk,liquid,erb").split(",").map((e) => `.${e.replace(/^\./, "")}`);
const styleExt = [".css", ".less", ".scss"];
const outDir = value("out");
const write = flag("write");
const print = flag("print");
const lang = value("lang");
const SKIP = new Set(["node_modules", ".git", "vendor", ".svn", "cache", ".cache"]);

async function* walk(path) {
  const s = await stat(path);
  if (s.isFile()) { yield path; return; }
  for (const e of await readdir(path, { withFileTypes: true })) {
    if (e.name.startsWith(".") || SKIP.has(e.name)) continue;
    yield* walk(join(path, e.name));
  }
}

const results = [];
let changed = 0;
for (const input of inputs) {
  const base = resolve(input);
  let isFile;
  try { isFile = (await stat(base)).isFile(); } catch { console.error(`Nicht gefunden: ${input}`); process.exitCode = 1; continue; }
  const baseDir = isFile ? dirname(base) : base;
  for await (const file of walk(base)) {
    const ext = extname(file).toLowerCase();
    const isMarkup = markupExt.includes(ext);
    const isStyle = flag("styles") && styleExt.includes(ext);
    if (!isMarkup && !isStyle) continue;
    const source = await readFile(file, "utf8");
    if (!/uk-|UIkit|uikit/.test(source)) continue;
    const rel = relative(process.cwd(), file) || basename(file);
    if (isStyle) { results.push({ file: rel, changed: false, report: scanStyles(source, { filename: rel }).report }); continue; }
    const { html, report } = convert(source, { filename: rel, lang });
    const didChange = html !== source;
    if (didChange) changed++;
    results.push({ file: rel, changed: didChange, report });
    if (print) process.stdout.write(html);
    if (didChange && write) await writeFile(file, html);
    if (didChange && outDir) {
      const target = join(resolve(outDir), relative(baseDir, file));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, html);
    }
  }
}

const counts = { error: 0, warning: 0, info: 0 };
results.forEach((r) => r.report.forEach((n) => counts[n.level]++));
const log = print ? (...a) => console.error(...a) : (...a) => console.log(...a);

if (flag("json")) {
  log(JSON.stringify({ files: results, summary: { files: results.length, changed, ...counts } }, null, 1));
} else {
  const tty = print ? process.stderr.isTTY : process.stdout.isTTY;
  const color = (c, s) => (tty ? `\x1b[${c}m${s}\x1b[0m` : s);
  for (const r of results) {
    const notes = r.report.filter((n) => !flag("quiet") || n.level !== "info");
    if (!notes.length && !r.changed) continue;
    log(`\n${color("1", r.file)}${r.changed ? "" : color("2", " (keine Änderung)")}`);
    for (const n of notes) {
      const tag = n.level === "error" ? color("31", "Fehler ") : n.level === "warning" ? color("33", "Prüfen ") : color("36", "Info   ");
      log(`  ${tag} ${n.line ? `Zeile ${String(n.line).padStart(4)}: ` : "            "}${n.message}`);
    }
  }
  const mode = write ? "umgeschrieben" : outDir ? `nach ${outDir} geschrieben` : print ? "ausgegeben" : "würden geändert (Probelauf - --write oder --out zum Schreiben)";
  log(`\n${results.length} Datei(en) mit UIkit-Markup, ${changed} ${mode}. ${counts.warning} zum Prüfen, ${counts.info} Info(s)${counts.error ? `, ${counts.error} Fehler` : ""}.`);
  log("Danach: node llms/hooks/check-classes.mjs <dateien> - findet verbliebene uk-Reste und unbekannte Klassen.");
}
process.exit(counts.error ? 1 : process.exitCode ?? 0);
