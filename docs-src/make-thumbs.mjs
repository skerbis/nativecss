// NativeCSS-Website - Vorschaubilder der Beispiel-Websites (Karten auf Start- und
// Beispiel-Seite). Nur Website-Tooling, nicht Teil von dist/ und nicht Teil des Deploys:
// die WebP-Dateien werden eingecheckt, das Script nur bei Bedarf lokal neu ausgeführt.
//
// Aufruf (lokaler Server muss laufen, Playwright wird NICHT als Projekt-Abhängigkeit
// geführt - Pfad zu playwright-core per Umgebungsvariable):
//   php -S 127.0.0.1:8784 -t . docs-src/dev-router.php
//   PLAYWRIGHT_CORE=/pfad/zu/node_modules/playwright-core/index.mjs \
//     node docs-src/make-thumbs.mjs http://127.0.0.1:8784
// Ergebnis: demo/assets/examples/thumbs/<id>.webp (1440×900 im Hellmodus, auf 640px
// verkleinert). Kodiert wird im Browser selbst (canvas.toDataURL("image/webp")) - kein
// zusätzliches Bild-Werkzeug nötig.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "demo", "assets", "examples", "thumbs");
const base = process.argv[2] || "http://127.0.0.1:8784";
const nav = JSON.parse(readFileSync(join(HERE, "nav.json"), "utf8"));

const pw = process.env.PLAYWRIGHT_CORE;
if (!pw) {
  console.error("PLAYWRIGHT_CORE (Pfad zu playwright-core/index.mjs) setzen.");
  process.exit(1);
}
const { chromium } = await import(pathToFileURL(pw).href);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
for (const ex of nav.examples) {
  await page.goto(`${base}/demo/${ex.href}`, { waitUntil: "load" });
  // Website-Bedienelemente (Beispiel-Leiste, Inspect) gehören nicht ins Vorschaubild.
  await page.addStyleTag({ content: ".demo-example-bar, .demo-inspect-fab { display: none !important; }" });
  await page.waitForTimeout(600);
  const png = (await page.screenshot()).toString("base64");
  const webp = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = Math.round((img.height / img.width) * 640);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82).split(",")[1];
  }, png);
  writeFileSync(join(OUT, `${ex.id}.webp`), Buffer.from(webp, "base64"));
  console.log(`Vorschau: ${ex.id}.webp`);
}
await browser.close();
