# Mit NativeCSS bauen - Anleitung für LLMs und Coding-Agents

> **English summary.** NativeCSS (`ncss-` prefix) is a build-free, native CSS design system:
> plain CSS files glued by `@import` + cascade layers, one token system, fluid type, container
> queries instead of viewport breakpoints, `light-dark()` for dark mode, native `<dialog>` /
> `<details>` / `command`+`commandfor` instead of JS widgets. Load `dist/ncss.css` + your own
> `theme.css` (seed values only). **Never invent class names** - every valid class is listed in
> `llms/classes.json`, every custom element / `data-ncss-*` attribute / event in
> `llms/components.json`. No Tailwind-style utilities, no `class@breakpoint`, no `uk-` leftovers,
> modals and off-canvas panels are always `<dialog>`. Copy markup from the file headers
> (`llms/reference.md`) or the docs instead of composing from memory, then run
> `node llms/hooks/check-classes.mjs <files>` and fix every error. The rest of this guide is
> German (the project language).

Diese Datei in ein Projekt kopieren, das NativeCSS nutzt (als `CLAUDE.md`, `AGENTS.md` oder
als Teil davon). Sie sagt einem Agenten, wie man MIT dem fertigen System baut. Für Arbeit AM
Quellcode von NativeCSS selbst: `.claude/skills/ncss-development/SKILL.md`.

## Wahrheitsquellen - Klassennamen nie raten

| Datei | Inhalt |
|---|---|
| `llms/classes.json` | jede `ncss-`Klasse -> definierende Datei(en). **Steht eine Klasse nicht drin, gibt es sie nicht.** |
| `llms/components.json` | Custom Elements (`<ncss-…>`) mit Attributen, Events, öffentlichen Methoden; alle `data-ncss-*`-Attribute; Scripts |
| `llms/reference.md` | Header-Doku jeder Datei in `dist/` - enthält fast immer ein kopierfertiges Markup-Beispiel |
| `docs/de/*.html` | Handbuch mit Live-Beispielen (`components.html`, `layout.html`, `custom-theme.html` …) |
| `demo/*.html` | ganze Seiten (Landing, Hotel, Gemeinde, Magazin, Immo-App) |

Alle drei `llms/`-Dateien erzeugt `node tools/index.mjs` aus `dist/` - nie von Hand ändern.

## Einrichten (kein Build, kein npm)

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="ncss/js/theme-toggle-early.js"></script>   <!-- nur mit Hell/Dunkel-Schalter, synchron, VOR dem CSS -->
  <link rel="stylesheet" href="ncss/ncss.css">            <!-- Manifest: Layer-Reihenfolge + alle @import -->
  <link rel="stylesheet" href="ncss/theme.css">           <!-- eigene Seed-Werte, NACH ncss.css -->
  <script src="ncss/js/command-fallback.js" defer></script> <!-- command/commandfor für ältere Browser -->
</head>
```

- `dist/` unverändert ins Projekt kopieren (hier als `ncss/`). `ncss.css` lädt alles in der
  richtigen Cascade-Layer-Reihenfolge: `tokens < reset < base < helpers < components`.
- **Cherry-Picking:** `ncss.css` als eigenes Manifest kopieren und nicht benötigte
  `@import url("components/…");`-Zeilen löschen. Die `@layer`-Zeile oben
  und `colors.css`/`tokens.css`/`reset.css`/`base.css` immer behalten. Jede Datei unter
  `components/` und `helpers/` legt ihren Layer selbst fest (`@layer components { … }`) -
  auch einzeln per `<link>` geladen landet sie im richtigen Layer, solange die
  Layer-Reihenfolge vorher deklariert ist (`ncss.css` oder eine eigene `@layer`-Zeile).
- **JavaScript ist je Komponente opt-in**: eine `<script src="ncss/js/<datei>.js" defer>` pro
  genutzter Komponente (welche, steht in `llms/components.json` unter `script` bzw.
  `scripts`). Ohne Script funktioniert das Markup weiter (progressive enhancement).
- Web Awesome / Font Awesome nur bei echtem Bedarf (`dist/integrations/`, komplett opt-in).
  Nie ein CDN-UIkit/Bootstrap/Tailwind daneben laden.

## Welche Datei wofür

| Bedarf | Verwenden | Nicht |
|---|---|---|
| Seitenbreite + Rand | `.ncss-container` (`--narrow`), breiter: `.ncss-full-bleed` | eigene max-width-Wrapper |
| Vertikaler Rhythmus | `.ncss-stack` (`--tight`/`--loose`), Abstand nach unten `.ncss-mb-sm/-md/-lg/-xl`, Sektionen `.ncss-py-*` | `margin-top` an jedem Kind |
| Karten-/Kachelraster | `.ncss-grid` + `style="--ncss-grid-min: 16rem"` (auto-fit, bricht selbst um) | Spaltenklassen pro Breakpoint |
| Feste Spaltenzahl | `.ncss-grid--cols-2/-3/-4/-6` (in `.ncss-container`) | |
| Letzte Zeile zentriert | `.ncss-flex-grid` (`--center`) + `.ncss-width-1-2/-1-3/-2-3 …` | `width: 33%` |
| Reihen, die umbrechen | `.ncss-cluster`, `.ncss-flex` (`--between/--center/--wrap/--column`), `.ncss-gap-*` | |
| Bild + Text | `.ncss-split-container > .ncss-split`, Inhalt über Medium: `.ncss-hero`, `.ncss-overlay`, `.ncss-cover` | |
| Karten | `.ncss-card` (+ `-body/-header/-footer/-media`, `--horizontal` im `.ncss-card-container`, `--linked`, Farben `--brand/--success/…`) | Rahmen/Schatten in der Karte |
| Rahmen/Ecken/Schatten | `.ncss-border`, `.ncss-radius-sm/-md/-lg/-full`, `.ncss-shadow-sm/-md/-lg`, `.ncss-shadow-hover-*` | eigene box-shadow-Klassen |
| Farbflächen | `.ncss-surface--brand/--brand-2/--neutral`, `.ncss-tile--*`, Text auf Foto: `.ncss-text-light`/`-dark` | rohe Hex-Werte |
| Buttons | `.ncss-btn` + `--primary/--secondary/--danger` | `ncss-button`, `btn-primary` |
| Formulare | `.ncss-field` > `.ncss-label` + `.ncss-input`/`.ncss-select`/`.ncss-textarea` + `.ncss-field-hint`/`-error`; `.ncss-switch`, `.ncss-choice`, `.ncss-input-group`, `.ncss-livesearch` | placeholder als Label |
| Navigation | `.ncss-topbar` (`-inner/-brand/-actions`) + `.ncss-nav` (Desktop-Leiste, mobil Off-Canvas aus demselben Markup), Untermenü `<details class="ncss-nav-dropdown">`, viele Punkte `<ncss-nav-priority>`, mobil als Slide-Screens `<ncss-nav-drilldown>`, Sprunglinks `.ncss-subnav` | Hover-Dropdowns, JS-Menüs |
| Modal / Seitenpanel | `<dialog class="ncss-modal">` / `<dialog class="ncss-offcanvas ncss-offcanvas--start">` + `command="show-modal" commandfor="id"` | `<div class="ncss-modal">` |
| FAQ / Akkordeon / "Tabs" | `<details class="ncss-disclosure" name="gruppe">` (gleicher `name` = nur einer offen); echte ARIA-Tabs: `<wa-tab-group>` | JS-Akkordeons, erfundene `ncss-tabs` |
| Icons | `<span class="ncss-icon ncss-icon-close" aria-hidden="true"></span>` (close, chevron-down, menu, play, search, check, copy, moon, sun) - sonst Font Awesome `<i class="fa-solid fa-…">` | Icon-Fonts als Pflicht |
| Galerie | Links mit `data-ncss-lightbox="gruppe"` (+ `data-caption`) + `js/lightbox.js` | eigenes Dialog-Markup |
| Toasts | `ncss.notify("Gespeichert", { status: "success" })` bzw. `data-ncss-notify` + `js/notification.js` | `alert()` |
| Hell/Dunkel | `js/theme-toggle-early.js` + `js/theme-toggle.js` + Button mit `data-ncss-theme-toggle` | zweiter Mechanismus neben `[data-theme]` |
| Scroll-Effekte | `.ncss-reveal--*`, `.ncss-text-reveal`, `.ncss-scroll-horizontal`, `<ncss-scrolly>`, `<ncss-scroll-video>`, `<ncss-scroll-frames>`, `.ncss-count-up`, `.ncss-marquee` | Scroll-Listener-Bibliotheken |
| Medien | `<ncss-video-player>`, `<ncss-audio-player>`, `.ncss-video-bg` + `data-ncss-video-bg`, `<ncss-compare>` | Player-Bibliotheken |

Die volle Liste aller Bausteine: `llms/reference.md` (nach Datei) und `docs/de/all-components.html`.

## Kernmuster (kopieren, dann anpassen)

### Modal ohne Komponenten-JS

```html
<button type="button" class="ncss-btn ncss-btn--primary" command="show-modal" commandfor="anmelden">Anmelden</button>
<dialog id="anmelden" class="ncss-modal" aria-labelledby="anmelden-titel">
  <button type="button" class="ncss-dialog-close" command="close" commandfor="anmelden" aria-label="Schließen">
    <span class="ncss-icon ncss-icon-close" aria-hidden="true"></span>
  </button>
  <div class="ncss-modal-header"><h2 id="anmelden-titel">Konto anlegen</h2></div>
  <div class="ncss-modal-body">…</div>
  <div class="ncss-modal-footer">
    <button type="button" class="ncss-btn ncss-btn--secondary" command="close" commandfor="anmelden">Abbrechen</button>
    <button type="submit" class="ncss-btn ncss-btn--primary">Weiter</button>
  </div>
</dialog>
```

Einblendvarianten als Zusatzklasse am `<dialog>`: `ncss-modal--slide-up/--slide-down/--zoom/--fullscreen/--dark`.

### Topbar + Navigation (Desktop und Mobil aus einem Markup)

```html
<header class="ncss-topbar">
  <div class="ncss-topbar-inner">
    <a class="ncss-topbar-brand" href="/">Marke</a>
    <nav class="ncss-nav" aria-label="Hauptnavigation">
      <button type="button" class="ncss-nav-toggle" command="show-modal" commandfor="navPanel" aria-label="Menü öffnen">
        <span class="ncss-icon ncss-icon-menu" aria-hidden="true"></span>
      </button>
      <dialog id="navPanel" class="ncss-nav-panel ncss-offcanvas ncss-offcanvas--start" aria-label="Menü">
        <button type="button" class="ncss-dialog-close" command="close" commandfor="navPanel" aria-label="Menü schließen">
          <span class="ncss-icon ncss-icon-close" aria-hidden="true"></span>
        </button>
        <ul class="ncss-nav-list">
          <li class="ncss-nav-item"><a href="/" aria-current="page">Start</a></li>
          <li class="ncss-nav-item">
            <details class="ncss-nav-dropdown">
              <summary>Produkte</summary>
              <ul class="ncss-nav-submenu">
                <li><a href="/produkte">Übersicht</a></li>
                <li><a href="/produkte/a">Produkt A</a></li>
              </ul>
            </details>
          </li>
        </ul>
      </dialog>
    </nav>
    <div class="ncss-topbar-actions">…</div>
  </div>
</header>
```

Aktiver Punkt = `aria-current="page"` (keine `active`-Klasse). Ein Elternpunkt mit Untermenü
ist selbst kein Link - die Zielseite als "Übersicht" ins Untermenü.

### Kartenraster ohne Breakpoints

```html
<div class="ncss-grid" style="--ncss-grid-min: 18rem;">
  <article class="ncss-card ncss-border ncss-radius-lg ncss-shadow-sm ncss-shadow-hover-md">
    <div class="ncss-card-media"><img src="bild.jpg" alt="Beschreibung" width="800" height="450" loading="lazy"></div>
    <div class="ncss-card-body">
      <h3>Titel</h3>
      <p class="ncss-text-muted">Text</p>
    </div>
  </article>
  …
</div>
```

`--ncss-grid-min` nach dem LÄNGSTEN erwarteten Inhalt wählen (lange deutsche Komposita!).

### FAQ (exklusiv, ohne JS)

```html
<details class="ncss-disclosure" name="faq" open><summary>Frage 1</summary><p>Antwort</p></details>
<details class="ncss-disclosure" name="faq"><summary>Frage 2</summary><p>Antwort</p></details>
```

### Formularfeld

```html
<div class="ncss-field">
  <label class="ncss-label ncss-label--required" for="email">E-Mail</label>
  <input class="ncss-input" id="email" name="email" type="email" autocomplete="email" required aria-describedby="email-hint">
  <p class="ncss-field-hint" id="email-hint">Wir schreiben nur bei Rückfragen.</p>
</div>
```

Weitere fertige Muster: `tools/vscode/ncss.code-snippets` (Player, Scrollytelling, Lightbox,
Hero, Split, Footer …) und die "Markup:"-Abschnitte in `llms/reference.md`.

## Theme: nur Seed-Werte

Eigene `theme.css` NACH `ncss.css`, **unlayered** (kein `@layer` drumherum - unlayered gewinnt
automatisch gegen jede Layer-Regel, kein `!important`):

```css
:root, :host {
  --ncss-color-brand: light-dark(#0057d8, #6ea8ff);      /* Hell, Dunkel */
  --ncss-color-brand-contrast: light-dark(#ffffff, #0a0a0a);
  --ncss-color-brand-2: light-dark(#314164, #8ea3cf);
  --ncss-color-bg: light-dark(#f7f8fa, #0b1c33);
  --ncss-color-surface: light-dark(#ffffff, #16283f);
  --ncss-color-text: light-dark(#1a1a1a, #eef2f8);
  --ncss-font-family-base: system-ui, sans-serif;
  --ncss-radius-md: 0.5rem;                              /* Persönlichkeit: Radien, Schatten, Bewegung */
  --ncss-motion-duration: 200ms;
}
```

- Nur SEEDS setzen (Vorlage: `dist/theme.css`, alle Werte dort sind Defaults). Abgeleitete
  Stufen (`--ncss-color-brand-100/-300/-700/-900`, `-on-soft`) rechnet `colors.css` per
  `color-mix()` selbst - nie einzeln setzen, und nur auf `:root` überschreiben (lokal
  überschriebene Seeds rechnen bereits vererbte Ableitungen nicht neu).
- Jeder Farbwert als `light-dark(hell, dunkel)`; Dunkel von Hand wählen, nicht invertieren.
- Kontrast: 4.5:1 Fließtext, 3:1 große Schrift/UI. Weißer Text auf `--ncss-color-brand` ist
  der härteste Fall - lieber die Markenfarbe kräftiger machen als Einzeltexte patchen.
- Text IN Markenfarbe (Kicker, Badge-Text auf hellem Grund) = `--ncss-color-brand-on-soft`.
- Mehrere Marken: weitere `theme-x.css` oder `<html data-palette="…">` (`colors.css`).

## Gestaltungsregeln (aus dem Skill `ncss-design`)

1. **Intrinsisch statt Breakpoints.** `.ncss-grid`, `.ncss-flex-grid`, `.ncss-split`,
   `.ncss-cluster`, Container Queries. Keine Viewport-Media-Queries in eigenem Komponenten-CSS;
   ein fester Viewport-Breakpoint nur als bewusster Escape Hatch (Beispiel: Nav bei 64rem).
2. **Werte nur aus Tokens** (`var(--ncss-…)`, Liste mit Werten: VS-Code-Custom-Data bzw.
   `dist/tokens.css`/`colors.css`). Keine rohen Farben/Abstände in Komponenten.
3. **Deko ist getrennt.** `.ncss-card` liefert nur Struktur; Rahmen/Ecken/Schatten kommen aus
   `helpers/elevation.css` und sind frei kombinierbar.
4. **Native zuerst.** `<dialog>`, `<details name>`, `command`/`commandfor`, `popover`,
   `loading="lazy"`. JS nur, wo die Plattform es nicht kann - dann das passende `js/`-Script.
5. **Outline-Elemente auf Farbflächen** (`.ncss-btn--secondary` im Hero) übernehmen
   `currentColor` automatisch; eigene "schwebende" Bauteile genauso bauen
   (`border-color: color-mix(in oklch, currentColor 15%, transparent)`).
6. **`.ncss-split` zentriert vertikal** - bei ungleich hohen Spalten `.ncss-split--align-start`.
7. **Etwas fehlt?** Einzelne Eigenschaft einer bestehenden Komponente: eine Regel in der
   eigenen unlayered CSS-Datei. Komplett neues Bauteil: **eigenes Präfix (nicht `ncss-`)**,
   `var(--ncss-*)`-Tokens, in `@layer components { … }`, `@container` statt Media Queries
   (Anleitung: `docs/de/custom-components.html`).
8. **Barrierefreiheit gehört zum Design.** Echte `<button>`s für Aktionen, `<a href>` für
   Navigation, `<label>` für jedes Feld, `aria-label` an Icon-Buttons, `alt` an Bildern
   (`alt=""` wenn dekorativ), Landmarks, eine `<h1>`, geordnete Überschriften. `role="list"`
   an Listen mit `list-style:none` (`.ncss-list--*`). Autoplay-Video: `js/hero-video-motion.js`
   bzw. `.ncss-video-bg` (respektiert `prefers-reduced-motion`).
9. **Keine Inline-Styles/-Scripts** außer `style="--ncss-…: wert"` zur Parametrisierung (nie
   `url()` in einer Custom Property). Scripts als externe Datei (CSP).

## Häufige Fehler (bitte vermeiden)

- **Klassen erfinden**: `ncss-button`, `ncss-btn-primary` (richtig: `ncss-btn--primary`),
  `ncss-flex-center` (richtig: `ncss-flex--center`), `ncss-mt-md` (es gibt nur `ncss-mb-*`),
  `ncss-tabs`, `ncss-alert`, `ncss-shadow-xl`, `ncss-text-bold`. Modifier haben **zwei**
  Bindestriche (`--`), Unterelemente einen (`ncss-card-body`). Nachschlagen in `llms/classes.json`.
- **Tailwind-/Bootstrap-Denke**: `flex items-center p-4 md:grid`, `row`/`col-md-6`. NativeCSS
  hat keine Utility-Matrix - Komponenten + Layout-Primitive + Tokens.
- **Viewport-Breakpoints / `klasse@m`**: gibt es nicht. Sichtbarkeit: `.ncss-hide-below-md`/
  `-from-md` bzw. `-container-sm/-md/-lg/-xl`.
- **UIkit-Reste**: `uk-…`-Klassen, `uk-toggle`, `uk-grid`, `uk-icon`. Ganze Dateien zuerst mit
  `node tools/uikit-to-ncss/convert.mjs` umstellen (siehe unten), nie mischen.
- **`<div class="ncss-modal">`** - Modal und Off-Canvas sind IMMER `<dialog>`; geöffnet mit
  `command="show-modal" commandfor="id"`, geschlossen mit `command="close"`.
- **Aktiv-Klassen** statt `aria-current="page"`.
- **Hover-only-Interaktion**: Untermenüs per `<details>`, `:hover` nur in
  `@media (hover:hover) and (pointer:fine)`.
- **`100vh`** für Vollbild-Bereiche: `svh` (mit `vh`-Fallback davor).
- **`display:inline`-Bauteile** (z.B. `.ncss-text-boxed`) direkt in Flex/Grid (`.ncss-stack`,
  `.ncss-grid`, `.ncss-card-body`) - in einen normalen `<div>` stellen.
- **`.ncss-glass`/`backdrop-filter` auf einem Vorfahren** von `<dialog>`/`<wa-dropdown>` -
  erzeugt einen neuen containing block; dekoratives Element davor setzen.
- **Ein `helpers/`-Utility soll eine Komponente überschreiben** - geht wegen Layer-Order nicht;
  die Komponenten-Variante nehmen (z.B. `.ncss-card--brand` statt `.ncss-surface--brand`).

## Werkzeuge

- **Markup-Prüfer**: `node llms/hooks/check-classes.mjs seite.html templates/` - unbekannte
  `ncss-`Klassen (mit "meintest du"), unbekannte `data-ncss-*`/`<ncss-*>`, `uk-`Reste,
  Modal/Off-Canvas nicht auf `<dialog>`, fehlende `alt`/Namen/Labels, Tailwind-Klassen.
  Als Claude-Code-Hook nach jedem Schreiben: `llms/hooks/README.md`. Jeden Fehler beheben.
- **UIkit -> NativeCSS**: `node tools/uikit-to-ncss/convert.mjs templates/` (Probelauf,
  Bericht mit Zeilennummern), dann `--write` oder `--out ordner/`. Lässt PHP/Twig/REDAXO-
  Code unangetastet. Im Browser: `demo/uikit-converter.html`.
- **VS Code**: Autovervollständigung für Elemente, Attribute, Tokens + Snippets:
  `tools/vscode/README.md`.
- **Inspector**: auf jeder Doku-/Demo-Seite "Inspect" (Alt+I) - zeigt Markup, Erklärung und
  Quelldatei jeder Klasse.
- **Skills**: `.claude/skills/ncss-design/` (gestalten MIT dem System) ins eigene Projekt
  unter `.claude/skills/` kopieren.

## Prüfen, bevor "fertig" gesagt wird

1. `node llms/hooks/check-classes.mjs <geänderte Dateien>` -> 0 Fehler.
2. Im Browser (über einen lokalen Server, nicht `file://`): Hell + Dunkel, 360 px und 1440 px
   breit, Tastatur (Tab/Esc in Modal und Menü), keine Konsolenfehler.
3. Kontrast neuer Farbkombinationen mit echtem Lighthouse prüfen.
