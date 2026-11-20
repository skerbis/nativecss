#!/usr/bin/env node
/**
 * NativeCSS - Tests des UIkit-Konverters. Reines node:test, kein npm.
 *   node --test tools/uikit-to-ncss/test.mjs     (bzw. node tools/uikit-to-ncss/test.mjs)
 * Braucht ein aktuelles llms/classes.json (node tools/index.mjs).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { convert, tokenize } from "./core.js";
import { faIcons, ncssIcons } from "./icon-map.js";
import { check } from "../../llms/hooks/check-classes.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = join(here, "../..");
const known = JSON.parse(await readFile(join(root, "llms/classes.json"), "utf8"));
const fixtures = (await readdir(join(here, "fixtures"))).filter((f) => !f.startsWith("."));
const read = (f) => readFile(join(here, "fixtures", f), "utf8");
const TPL = /<\?[\s\S]*?\?>|\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\}/g;

test("jede ncss-Klasse im Regelwerk existiert in dist/", async () => {
  const src = (await readFile(join(here, "rules.js"), "utf8")) + (await readFile(join(here, "core.js"), "utf8"));
  const names = new Set([...src.matchAll(/(?<![\w$-])(ncss-[a-z0-9]+(?:-{1,2}[a-z0-9]+)*)(?![\w-]*\$\{)/g)].map((m) => m[1]));
  const elements = JSON.parse(await readFile(join(root, "llms/components.json"), "utf8")).elements;
  const missing = [...names].filter((c) => !known[c] && !elements[c] && !src.includes(`${c}-*`));
  assert.deepEqual(missing, [], `nicht in llms/classes.json: ${missing.join(", ")}`);
  for (const i of Object.values(ncssIcons)) assert.ok(known[`ncss-icon-${i}`], `ncss-icon-${i}`);
});

test("Font-Awesome-Namen existieren in vendor/fontawesome/svgs", () => {
  const bad = Object.entries(faIcons).filter(([, v]) => v).filter(([, v]) => {
    const [style, name] = v.split(" ");
    return !existsSync(join(root, "vendor/fontawesome/svgs", style.replace("fa-", ""), `${name.slice(3)}.svg`));
  });
  assert.deepEqual(bad, []);
});

test("Markup ohne UIkit bleibt Byte für Byte gleich", async () => {
  const src = await readFile(join(root, "demo/roadmap.html"), "utf8");
  assert.equal(convert(src).html, src);
  const odd = `<p class=x data-a='1'  title = "a > b">Text <!-- uk-card --> <?php echo "<div class='uk-card'>"; ?></p>\n<img src=a.jpg alt="">`;
  assert.equal(convert(odd).html, odd);
});

for (const f of fixtures) {
  test(`${f}: Template-Code bleibt unverändert und in Reihenfolge`, async () => {
    const src = await read(f);
    const { html } = convert(src, { filename: f });
    // jedes Original-Segment unverändert und in Reihenfolge (Kopien, z.B. eine PHP-id in
    // commandfor="<?= $id ?>", dürfen dazukommen)
    const outSegs = html.match(TPL) ?? [];
    let k = 0;
    for (const seg of src.match(TPL) ?? []) {
      while (k < outSegs.length && outSegs[k] !== seg) k++;
      assert.ok(k < outSegs.length, `Template-Segment fehlt/verändert: ${seg.slice(0, 60)}`);
      k++;
    }
    assert.equal((html.match(/REX_[A-Z]+\[[^\]]*\]/g) ?? []).join("|"), (src.match(/REX_[A-Z]+\[[^\]]*\]/g) ?? []).join("|"));
  });

  test(`${f}: Ergebnis enthält nur echte ncss-Namen, jeder uk-Rest steht im Bericht`, async () => {
    const src = await read(f);
    const { html, report } = convert(src, { filename: f });
    const findings = check(html).filter((x) => x.level === "error");
    const invented = findings.filter((x) => !/UIkit/.test(x.msg));
    assert.deepEqual(invented, [], invented.map((x) => `Z${x.line}: ${x.msg}`).join("\n"));
    // uk-Reste: Zeilennummern bleiben erhalten (der Konverter fügt nur innerhalb von Zeilen ein)
    const flagged = new Set(report.filter((r) => r.level !== "info").map((r) => r.line));
    const outLines = html.split("\n");
    const leftovers = findings.filter((x) => /UIkit/.test(x.msg)).filter((x) => {
      const text = outLines[x.line - 1] ?? "";
      const srcLine = src.split("\n").findIndex((l) => l.trim() && l.trim().slice(0, 12) === text.trim().slice(0, 12)) + 1;
      return !flagged.has(x.line) && !flagged.has(srcLine) && !/<\?|\{%|\{\{/.test(text);
    });
    assert.deepEqual(leftovers, [], leftovers.map((x) => `Z${x.line}: ${x.msg}`).join("\n"));
  });

  test(`${f}: zweiter Lauf ändert nichts mehr (idempotent)`, async () => {
    const once = convert(await read(f)).html;
    assert.equal(convert(once).html, once);
  });
}

test("page.html: Kernumbauten nach docs/de/uikit-migration.html", async () => {
  const { html } = convert(await read("page.html"));
  assert.match(html, /<dialog id="modal-info" class="ncss-modal"[^>]*aria-labelledby="modal-info-title"/);
  assert.match(html, /<dialog id="mobile-nav" class="ncss-offcanvas ncss-offcanvas--end"/);
  assert.doesNotMatch(html, /uk-modal-dialog|uk-offcanvas-bar/);
  assert.match(html, /<button class="ncss-btn ncss-btn--primary" type="button" command="show-modal" commandfor="modal-info">Mehr<\/button>/);
  assert.match(html, /command="close" commandfor="modal-info" class="ncss-dialog-close" aria-label="Schließen"><span class="ncss-icon ncss-icon-close"/);
  assert.match(html, /class="ncss-btn ncss-btn--secondary" type="button" command="close" commandfor="modal-info">Abbrechen/);
  assert.match(html, /<details class="ncss-disclosure" name="accordion-1" open><summary>Frage 1<\/summary>/);
  assert.match(html, /class="ncss-gap-sm ncss-grid" style="--ncss-grid-min: 16rem;"/);
  assert.match(html, /<div class="ncss-gap-md ncss-flex-grid">\s*<div class="ncss-width-2-3">/);
  assert.match(html, /<details class="ncss-nav-dropdown">\s*<summary>Leistungen<\/summary>\s*<ul class="ncss-nav-submenu">\s*<li><a href="\/leistungen">Übersicht<\/a><\/li>/);
  assert.match(html, /<a href="\/" aria-current="page">Start<\/a>/);
  assert.match(html, /data-ncss-lightbox="galerie-1"/);
  assert.match(html, /<nav class="ncss-breadcrumb" aria-label="Breadcrumb"><ol>/);
  assert.match(html, /<li aria-current="page"><span>Seite<\/span><\/li>/);
  assert.match(html, /<input class="ncss-input" id="email" type="email" aria-invalid="true">/);
  assert.match(html, /<div class="ncss-field">/);
  assert.match(html, /<span class="fa-solid fa-house" aria-hidden="true"><\/span>/);
  assert.match(html, /class="ncss-reveal ncss-reveal--slide-up ncss-reveal--once" data-ncss-reveal/);
  // nicht übertragbar -> bleibt stehen
  assert.match(html, /<div uk-slider>/);
  assert.match(html, /uk-switcher/);
});

test("REDAXO-Modul: dynamische id, Toggle und Modal über PHP hinweg", async () => {
  const { html, report } = convert(await read("redaxo-modul-output.php"));
  assert.match(html, /<dialog id="<\?= \$id \?>" class="ncss-modal--fullscreen ncss-modal"/);
  assert.match(html, /command="show-modal" commandfor="<\?= \$id \?>"/);
  assert.match(html, /aria-labelledby="<\?= \$id \?>-title"/);
  assert.match(html, /<\/dialog>\s*$/);
  assert.ok(report.some((r) => r.line === 6 && /Template-Ausdruck/.test(r.message)), "PHP-Ternary mit uk-Klassen wird gemeldet");
  assert.ok(report.some((r) => r.line === 20 && /Template-Code/.test(r.message)), "echo mit uk-Klasse wird gemeldet");
});

test("Twig: Klassen im {% if %}-Zweig umgesetzt, zusammengesetzte gemeldet", async () => {
  const { html, report } = convert(await read("template.twig"));
  assert.match(html, /\{% if item\.featured %\}ncss-card--brand\{% endif %\}/);
  assert.match(html, /uk-button-\{\{ item\.style \}\}/);
  assert.ok(report.some((r) => /Zusammengesetzte Klasse "uk-button-\{\{ item\.style \}\}"/.test(r.message)));
});

test("Bericht hat Zeilennummern für alles, was ein Mensch prüfen muss", async () => {
  const { report } = convert(await read("page.html"));
  const needsHuman = report.filter((r) => r.level === "warning");
  assert.ok(needsHuman.length > 5);
  assert.ok(needsHuman.every((r) => Number.isInteger(r.line) && r.line > 0));
  assert.ok(needsHuman.some((r) => r.line === 104 && /uk-slider/.test(r.message)));
  assert.ok(needsHuman.some((r) => /UIkit\.notification/.test(r.message) && r.line === 106));
});

test("Tokenizer: unvollständige Tags und Template in Attributen", () => {
  const t = tokenize(`<a href="<?= $u ?>" {{ attrs }} class="x">y</a><p`);
  assert.equal(t[0].type, "start");
  assert.equal(t[0].attrs.filter((a) => a.template).length, 1);
  assert.equal(t.map((x) => x.raw).join(""), `<a href="<?= $u ?>" {{ attrs }} class="x">y</a><p`);
});
