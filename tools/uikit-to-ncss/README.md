# UIkit 3 → NativeCSS

*English: converts UIkit 3 markup to NativeCSS following `docs/de/uikit-migration.html`. Template
code (PHP, Twig, Blade, REDAXO `REX_VALUE[...]`) is kept byte for byte; everything that can't be
converted safely stays untouched and is reported with its line number. CLI is a dry run by default.*

Tokenizer-Kern portiert aus dem Schwesterprojekt MarijaCSS (`migrate/core.js`), Regelwerk
neu für NativeCSS. Kein DOM, kein npm: dieselben Dateien laufen in Node und im Browser
(`demo/uikit-converter.html`).

```sh
node tools/uikit-to-ncss/convert.mjs templates/                # Probelauf: nur Bericht
node tools/uikit-to-ncss/convert.mjs templates/ --write        # Dateien überschreiben (vorher committen!)
node tools/uikit-to-ncss/convert.mjs src/ --out ncss-src/      # konvertierte Kopien
node tools/uikit-to-ncss/convert.mjs modul.php --print         # Ergebnis auf stdout, Bericht auf stderr
node tools/uikit-to-ncss/convert.mjs theme/ --styles           # zusätzlich CSS/LESS/SCSS nach UIkit-Selektoren durchsuchen
```

Weitere Optionen: `--lang de|en` (Sprache eingefügter `aria-label`s), `--ext`, `--json`,
`--quiet`. Danach immer `node llms/hooks/check-classes.mjs <dateien>`.

## Was umgebaut wird

| UIkit | NativeCSS |
|---|---|
| `uk-grid` + `uk-child-width-1-2@s uk-child-width-1-3@m` | `.ncss-grid` + `style="--ncss-grid-min: 16rem"` (Spaltenzahl -> Mindestbreite, keine Breakpoints) |
| `uk-grid` mit `uk-width-2-3@m`-Kindern | `.ncss-flex-grid` + `.ncss-width-2-3` |
| `uk-grid-small/-medium/-large`, `uk-grid` masonry | `.ncss-gap-sm/-md/-lg`, `.ncss-masonry` |
| `uk-container(-small)`, `uk-section(-muted/-primary/-small)` | `.ncss-container(--narrow)`, `.ncss-py-*` + `.ncss-surface--*` |
| `uk-card uk-card-default uk-card-body` | `.ncss-card .ncss-border .ncss-radius-md .ncss-shadow-sm .ncss-card-body` |
| `uk-button uk-button-primary/-default/-danger` | `.ncss-btn .ncss-btn--primary/--secondary/--danger` |
| `uk-navbar` + `uk-navbar-nav` + `uk-active` + `uk-navbar-dropdown` | `.ncss-nav` > `.ncss-nav-list` > `.ncss-nav-item`, `aria-current="page"`, `<details class="ncss-nav-dropdown"><summary>` (+ "Übersicht"-Link für den Elternpunkt) |
| `uk-nav uk-nav-default` | `<nav class="ncss-nav ncss-nav--tree"><ul class="ncss-nav-list">` |
| `uk-modal` / `uk-offcanvas` (+ `-dialog`, `-bar`, `-header/-body/-footer`, `-title`) | `<dialog class="ncss-modal">` / `<dialog class="ncss-offcanvas ncss-offcanvas--start/--end">`, Wrapper aufgelöst, `aria-labelledby` auf den Titel, `closedby="any"` |
| `uk-toggle` / `href="#id" uk-toggle` | `<button type="button" command="show-modal" commandfor="id">` (auch mit PHP-id `#<?= $id ?>`) |
| `uk-close`, `uk-modal-close(-default)`, `uk-offcanvas-close` | `.ncss-dialog-close` + `command="close" commandfor` + Schließen-Icon + `aria-label` |
| `uk-accordion` (`uk-open`, `multiple`) | `<details class="ncss-disclosure" name="…">` + `<summary>` |
| `uk-lightbox` | `data-ncss-lightbox="galerie-N"` an jedem Link (`data-caption` bleibt) |
| `uk-icon="…"` | ncss-Icons (`close`, `chevron-down`, `menu`, `play`, `search`, `check`, `copy`), sonst Font Awesome (`icon-map.js`, gegen `vendor/fontawesome` geprüft) |
| `uk-scrollspy="cls: uk-animation-…"` | `.ncss-reveal .ncss-reveal--fade/--slide-up/--scale (--once)` |
| `uk-img`, `uk-tooltip`, `uk-sticky`, `uk-breadcrumb`, `uk-subnav`, `uk-list-*`, `uk-label`, `uk-alert`, Formulare, Text-/Sichtbarkeits-/Deko-Klassen | siehe `rules.js` (Tabelle `classes`) |
| `UIkit.modal(...)` u.a. in `<script>` | Hinweis mit der nativen Entsprechung |

**Bleibt stehen und wird gemeldet** (Zeilennummer, "Prüfen"): `uk-tab`/`uk-switcher`,
`uk-slider`/`uk-slideshow`, Dropdowns außerhalb der Navbar, `uk-sortable`, `uk-filter`,
`uk-parallax`, `uk-countdown`, `uk-toggle` mit `cls`, `uk-position-*`, unbekannte Klassen,
zusammengesetzte Klassen (`uk-button-{{ stil }}`), UIkit-Namen in PHP/Twig-Code. Klassen in
einem Template-Zweig (`{% if x %}uk-card-primary{% endif %}`) werden umgesetzt.

## Dateien

| Datei | Inhalt |
|---|---|
| `core.js` | Tokenizer, Elementbaum, `convert()`, `scanStyles()` |
| `rules.js` | Regelwerk: Transforms + Klassen-Tabelle + JS-API-Hinweise |
| `icon-map.js` | UIkit-Iconnamen -> ncss-Icon / Font Awesome |
| `convert.mjs` | CLI |
| `test.mjs` | Tests: `node --test tools/uikit-to-ncss/test.mjs` |
| `fixtures/` | Testseiten: Seite mit Navbar/Modal/Off-Canvas/Akkordeon, Twig-Teaserliste, REDAXO-Modulausgabe |
| `package.json` | markiert die `.js`-Dateien als ES-Module für Node (kein npm-Paket) |
