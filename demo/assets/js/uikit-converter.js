/**
 * NativeCSS - Browser-Oberfläche des UIkit-Konverters (demo/uikit-converter.html).
 * Nutzt denselben Kern wie die CLI (tools/uikit-to-ncss/core.js) - alles bleibt lokal im
 * Browser. Externe Datei wegen CSP (keine Inline-Scripts).
 */
import { convert } from "../../../tools/uikit-to-ncss/core.js";

const $ = (id) => document.getElementById(id);
const input = $("uc-input");
const output = $("uc-output");
const report = $("uc-report");
const summary = $("uc-summary");
const fileList = $("uc-file-list");
const lang = $("uc-lang");
let files = []; // { name, source, html, report }
let current = -1;

const EXAMPLE = `<?php $id = 'info-' . $slice_id; ?>
<nav class="uk-navbar-container" uk-navbar>
  <div class="uk-navbar-left">
    <ul class="uk-navbar-nav">
      <li class="uk-active"><a href="/">Start</a></li>
      <li><a href="/leistungen">Leistungen</a>
        <div class="uk-navbar-dropdown"><ul class="uk-nav uk-navbar-dropdown-nav">
          <li><a href="/leistungen/web">Web</a></li>
        </ul></div>
      </li>
    </ul>
  </div>
</nav>
<div class="uk-section uk-section-muted">
  <div class="uk-container">
    <div class="uk-child-width-1-2@s uk-child-width-1-3@m" uk-grid>
      {% for item in items %}
      <div><div class="uk-card uk-card-default uk-card-body">
        <h3 class="uk-card-title">{{ item.title }}</h3>
        <a class="uk-button uk-button-primary" href="#<?= $id ?>" uk-toggle>Mehr <span uk-icon="arrow-right"></span></a>
      </div></div>
      {% endfor %}
    </div>
  </div>
</div>
<div id="<?= $id ?>" uk-modal>
  <div class="uk-modal-dialog uk-modal-body">
    <button class="uk-modal-close-default" type="button" uk-close></button>
    <h2 class="uk-modal-title">REX_VALUE[1]</h2>
    <ul uk-accordion><li><a class="uk-accordion-title" href>Frage</a><div class="uk-accordion-content">Antwort</div></li></ul>
  </div>
</div>
<div class="uk-position-relative" uk-slider>…</div>
<script>UIkit.notification('Gespeichert', { status: 'success' });</script>`;

const LEVEL = { error: "Fehler", warning: "Prüfen", info: "Info" };

function render(result) {
  output.value = result.html;
  report.replaceChildren();
  const counts = { error: 0, warning: 0, info: 0 };
  for (const n of result.report) {
    counts[n.level]++;
    const li = document.createElement("li");
    li.className = `uc-${n.level}`;
    const badge = document.createElement("span");
    badge.className = `ncss-badge${n.level === "error" ? " ncss-badge--danger" : n.level === "warning" ? " ncss-badge--warning" : " ncss-badge--neutral"}`;
    badge.textContent = LEVEL[n.level];
    li.append(badge, " ");
    if (n.line) {
      const line = document.createElement("strong");
      line.textContent = `Zeile ${n.line}: `;
      li.append(line);
    }
    li.append(document.createTextNode(n.message));
    report.append(li);
  }
  const changed = result.html !== result.source;
  summary.textContent = result.source.trim()
    ? `${changed ? "Konvertiert" : "Keine Änderung"}: ${counts.warning} zum Prüfen, ${counts.info} Info(s)${counts.error ? `, ${counts.error} Fehler` : ""}.`
    : "Noch nichts konvertiert.";
}

function run() {
  const source = input.value;
  const result = convert(source, { filename: files[current]?.name ?? "eingabe.html", lang: lang.value || null });
  result.source = source;
  if (files[current]) Object.assign(files[current], { source, html: result.html, report: result.report });
  render(result);
}

let timer = 0;
input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 150); });
lang.addEventListener("change", run);
$("uc-example").addEventListener("click", () => { files = []; current = -1; fileList.hidden = true; input.value = EXAMPLE; run(); });
$("uc-clear").addEventListener("click", () => { files = []; current = -1; fileList.hidden = true; input.value = ""; run(); input.focus(); });
$("uc-pick").addEventListener("click", () => $("uc-files").click());

$("uc-files").addEventListener("change", async (e) => {
  files = await Promise.all([...e.target.files].map(async (f) => ({ name: f.name, source: await f.text() })));
  fileList.replaceChildren();
  files.forEach((f, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ncss-btn ncss-btn--secondary";
    b.textContent = f.name;
    b.addEventListener("click", () => select(i));
    li.append(b);
    fileList.append(li);
  });
  fileList.hidden = !files.length;
  if (files.length) select(0);
});

function select(i) {
  current = i;
  [...fileList.querySelectorAll("button")].forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
  input.value = files[i].source;
  run();
}

$("uc-copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(output.value); summary.textContent = "In die Zwischenablage kopiert."; }
  catch { output.select(); document.execCommand("copy"); }
});

$("uc-download").addEventListener("click", () => {
  const name = (files[current]?.name ?? "ncss.html");
  const url = URL.createObjectURL(new Blob([output.value], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.documentElement.dataset.ucReady = "true";
