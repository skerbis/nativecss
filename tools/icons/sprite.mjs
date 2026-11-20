#!/usr/bin/env node
/**
 * NativeCSS - SVG-Sprite aus Phosphor-Icons bauen (für die Nutzung OHNE JavaScript).
 * Reines node:-Skript, kein npm.
 *
 *   node tools/icons/sprite.mjs house heart arrow-right --weight=regular --out=icons.svg
 *   node tools/icons/sprite.mjs house heart:fill star:duotone --out=icons.svg
 *
 * Optionen:
 *   --weight=regular|thin|light|bold|fill|duotone   Stärke für alle Icons (Default regular)
 *   name:stärke                                     Stärke für ein einzelnes Icon
 *   --out=datei.svg                                 Zieldatei (Default: Ausgabe auf stdout)
 *   --src=ordner                                    Icon-Ordner (Default vendor/phosphor)
 *
 * Symbol-IDs = Phosphor-Dateiname ohne .svg ("house", "heart-fill", "star-duotone").
 * Einbinden:
 *   <svg class="ncss-icon-sprite" aria-hidden="true"><use href="icons.svg#house"></use></svg>
 * (<use> mit externer Datei funktioniert nur same-origin - Sprite mit der Seite ausliefern.)
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { WEIGHTS, NAME_RE, fileBase, toSymbol, buildSprite } from "./sprite-core.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => {
  const hit = args.find((a) => a.startsWith("--" + k + "="));
  return hit ? hit.slice(k.length + 3) : d;
};

if (!args.length || args.includes("--help") || args.includes("-h")) {
  console.log("Aufruf: node tools/icons/sprite.mjs <name[:stärke]> ... [--weight=regular] [--out=icons.svg] [--src=vendor/phosphor]");
  console.log("Stärken: " + WEIGHTS.join(", "));
  process.exit(args.length ? 0 : 1);
}

const weight = opt("weight", "regular");
const out = opt("out", "");
const src = resolve(opt("src", join(root, "vendor/phosphor")));
if (!WEIGHTS.includes(weight)) {
  console.error(`Unbekannte Stärke "${weight}" - erlaubt: ${WEIGHTS.join(", ")}`);
  process.exit(1);
}

const wanted = [];
for (const a of args.filter((a) => !a.startsWith("--"))) {
  const [name, w = weight] = a.split(":");
  if (!NAME_RE.test(name) || !WEIGHTS.includes(w)) {
    console.error(`Ungültige Angabe "${a}" (erwartet: name oder name:stärke)`);
    process.exit(1);
  }
  const id = fileBase(name, w);
  if (!wanted.some((x) => x.id === id)) wanted.push({ name, weight: w, id });
}

const symbols = [];
const missing = [];
for (const { name, weight: w, id } of wanted) {
  try {
    symbols.push(toSymbol(await readFile(join(src, w, id + ".svg"), "utf8"), id));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    missing.push(name);
  }
}

if (missing.length) {
  // Ähnliche Namen aus dem Index vorschlagen (Tippfehler wie "home" statt "house").
  let hint = "";
  try {
    const index = JSON.parse(await readFile(join(src, "index.json"), "utf8"));
    const found = missing.map((m) => {
      const hits = index.icons
        .filter(([n, tags]) => n.includes(m) || (" " + tags).includes(" " + m))
        .slice(0, 6)
        .map(([n]) => n);
      return hits.length ? `  ${m}: ${hits.join(", ")}` : "";
    }).filter(Boolean);
    if (found.length) hint = "\nMeinten Sie:\n" + found.join("\n");
  } catch {}
  console.error(`Nicht gefunden: ${missing.join(", ")}${hint}`);
  process.exit(1);
}

const sprite = buildSprite(symbols);
if (out) {
  await writeFile(out, sprite);
  console.error(`${symbols.length} Symbol(e) -> ${out} (${(sprite.length / 1024).toFixed(1)} KB)`);
} else {
  process.stdout.write(sprite);
}
