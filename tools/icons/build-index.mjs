#!/usr/bin/env node
/**
 * NativeCSS - Suchindex für die Phosphor-Icons erzeugen: vendor/phosphor/index.json
 * (Maintainer-Werkzeug, reines node:-Skript). Lädt der Sprite-Baukasten im Handbuch erst
 * bei Bedarf (lazy), das CLI nutzt ihn für Namensvorschläge.
 *
 *   node tools/icons/build-index.mjs
 *   node tools/icons/build-index.mjs --catalog=<pfad>/@phosphor-icons/core/dist/index.mjs
 *
 * Namen kommen immer aus vendor/phosphor/regular/*.svg. Suchbegriffe (Tags + Kategorien)
 * aus dem offiziellen Katalog-Modul von @phosphor-icons/core, wenn --catalog angegeben ist -
 * sonst werden die Tags aus dem bestehenden index.json übernommen (ein Neulauf ohne
 * Katalog verliert also nichts). Format, bewusst knapp:
 *   { "version": "2.1.1", "weights": [...], "icons": [["house", "home building ..."], ...] }
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { WEIGHTS } from "./sprite-core.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const dir = join(root, "vendor/phosphor");
const target = join(dir, "index.json");
const catArg = process.argv.find((a) => a.startsWith("--catalog="));

let previous = { version: "", icons: [] };
try { previous = JSON.parse(await readFile(target, "utf8")); } catch {}
const tagsOf = new Map(previous.icons.map(([n, t]) => [n, t]));
let version = previous.version;

if (catArg) {
  const path = resolve(catArg.slice(10));
  const mod = await import(pathToFileURL(path).href);
  for (const icon of mod.icons) {
    const words = [...(icon.tags || []), ...(icon.categories || [])]
      .filter((t) => !t.startsWith("*"))
      .join(" ")
      .toLowerCase()
      .split(/[\s&]+/)
      .filter(Boolean);
    tagsOf.set(icon.name, [...new Set(words)].join(" "));
  }
  try {
    const pkg = JSON.parse(await readFile(join(path, "../../package.json"), "utf8"));
    version = pkg.version || version;
  } catch {}
}

const names = (await readdir(join(dir, "regular")))
  .filter((f) => f.endsWith(".svg"))
  .map((f) => f.slice(0, -4))
  .sort();

const json = JSON.stringify({
  version,
  weights: WEIGHTS,
  icons: names.map((n) => [n, tagsOf.get(n) || ""]),
});
await writeFile(target, json + "\n");
console.log(`${names.length} Icons -> vendor/phosphor/index.json (${(json.length / 1024).toFixed(0)} KB)`);
