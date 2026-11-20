/**
 * Rendert das README-Titelbild und die GitHub-Social-Preview aus
 * demo/assets/brand/banner.html (echtes NativeCSS, 1280 × 640).
 *
 *   node tools/brand/render-banner.mjs [http://127.0.0.1:8770]
 *
 * Braucht einen laufenden lokalen Server (php -S … docs-src/dev-router.php) und
 * playwright-core (Pfad per PLAYWRIGHT_CORE oder global auflösbar). Nur Werkzeug -
 * nicht Teil von dist/.
 *
 * Ergebnis in demo/assets/brand/:
 *   banner-light.webp, banner-dark.webp (2560 × 1280, für <picture> im README; braucht
 *                                       cwebp im PATH, sonst bleiben die PNGs liegen)
 *   social-preview.png                 (1280 × 640, < 1 MB, für GitHub → Settings → Social preview)
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "..", "demo", "assets", "brand");
const base = process.argv[2] || "http://127.0.0.1:8770";
const pw = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
const browser = await pw.chromium.launch();

async function shot(scheme, scale, file) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: scale, colorScheme: scheme });
  await page.goto(`${base}/demo/assets/brand/banner.html?scheme=${scheme}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, file) });
  await page.close();
  console.log("geschrieben:", file);
}

await shot("light", 2, "banner-light.png");
await shot("dark", 2, "banner-dark.png");
await shot("light", 1, "social-preview.png");
await browser.close();

// README-Banner als WebP (Bruchteil der PNG-Größe)
for (const name of ["banner-light", "banner-dark"]) {
  try {
    execFileSync("cwebp", ["-quiet", "-q", "88", join(out, name + ".png"), "-o", join(out, name + ".webp")]);
    unlinkSync(join(out, name + ".png"));
    console.log("geschrieben:", name + ".webp");
  } catch {
    console.log("cwebp nicht gefunden - " + name + ".png bleibt");
  }
}
