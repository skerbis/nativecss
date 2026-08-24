# NativeCSS

*(Kürzel/Klassen-Präfix im Code: `ncss`)*

Ein natives CSS-Designsystem ohne Build-Schritt: kein LESS/Sass, kein Bundler, kein
Preprocessor. `@import` + CSS Cascade Layers regeln die Ladereihenfolge, ein einziges
Token-System (`tokens.css` + `colors.css`) ist die alleinige Quelle für Werte. Typografie
und Abstände sind standardmäßig **fließend** (`clamp()`-basiert) statt in festen
Breakpoint-Sprüngen; component-lokale Responsivität läuft über **Container Queries**
(reagiert auf die Breite des jeweiligen Eltern-Containers, nicht des Viewports). Feste
Breakpoints bleiben als bewusst sparsam genutzter Escape Hatch verfügbar.

Optional bindet das System sich per `webawesome-bridge.css` an ein selbst gehostetes
[Web Awesome](https://webawesome.com) + Font Awesome an, für die Fälle, in denen natives
HTML/CSS allein nicht reicht (z.B. Toast, Carousel, Drawer) - siehe `demo/webawesome.html`.

## Inhalt

- [Schnellstart](#schnellstart)
- [Theme anpassen](#theme-anpassen)
- [Seitenübergänge](#seitenübergänge)
- [Architektur](#architektur)
- [Grundprinzipien](#grundprinzipien)
- [Design Tokens](#design-tokens)
- [Layout](#layout)
- [Typografie](#typografie)
- [Farben & Flächen](#farben--flächen)
- [Ecken, Rahmen, Schatten](#ecken-rahmen-schatten)
- [Formulare](#formulare)
- [Tabellen](#tabellen)
- [Medien (Bild/Video/Audio)](#medien-bildvideoaudio)
- [Textumfluss (Float)](#textumfluss-float)
- [Scroll & Sichtbarkeit](#scroll--sichtbarkeit)
- [Animationen](#animationen)
- [Barrierefreiheit (a11y)](#barrierefreiheit-a11y)
- [Touch-Geräte & mobile Viewports](#touch-geräte--mobile-viewports)
- [Icons](#icons)
- [Komponenten](#komponenten)
- [Termine & Downloads (Widgets)](#termine--downloads-widgets)
- [`<ncss-container>` - ncss isoliert in einer fremden Seite](#ncss-container---ncss-isoliert-in-einer-fremden-seite)
- [Web Awesome Bridge](#web-awesome-bridge)
- [Demo-Seiten](#demo-seiten)
- [Doku-Website](#doku-website)
- [Bekannte Grenzen (bewusste Kompromisse)](#bekannte-grenzen-bewusste-kompromisse)

## Schnellstart

```html
<link rel="stylesheet" href="ncss.css">
```

`ncss.css` importiert alles Weitere selbst (Tokens, Reset, Helpers, Komponenten) in der
richtigen Layer-Reihenfolge. Kein Build-Schritt nötig - die Datei direkt einbinden.

## Theme anpassen

Eine Datei für alle wichtigen Werte - **`theme.css`**. Nach `ncss.css` laden, direkt die
Werte darin überschreiben, keine andere Datei anfassen:

```html
<link rel="stylesheet" href="ncss.css">
<link rel="stylesheet" href="theme.css">
```

Funktioniert ohne `@layer`/`!important`: `theme.css` ist bewusst UNLAYERED (kein eigenes
`@layer`), und unlayered CSS gewinnt in der Spec immer gegen jede Layer-Regel (siehe
[Architektur](#architektur)) - ein einfaches `:root { --ncss-color-brand: ... }` reicht.

`theme.css` enthält nur die BASIS-/SEED-Werte (Markenfarben, Grundflächen, Schriften,
Radien, Schatten, Bewegung), nicht die daraus abgeleiteten Farbskalen. Farben wie
`--ncss-color-brand-100`/`-300`/`-700`/`-900` (siehe [Design Tokens](#design-tokens))
werden aus GENAU EINEM Basiswert per `color-mix()` automatisch berechnet - die
Markenfarbe in `theme.css` ändern genügt, die ganze Skala (helle/dunkle Stufen,
"on-soft"-Textfarbe, Web-Awesome-Bridge) zieht automatisch mit.

Mehrere Themes parallel bereithalten: denselben Aufbau in einer weiteren Datei
wiederholen (z.B. `theme-sunset.css`) und je nach Bedarf statt `theme.css` laden - oder
die `[data-palette]`-Konvention in `colors.css` nutzen für einen rein attributgesteuerten
Wechsel ganz ohne zweite Datei (`<html data-palette="sunset">`, zwei Beispiel-Paletten
schon vorhanden).

**Nur auf `:root` angewendet funktioniert die automatische Ableitung wie oben
beschrieben.** Wird derselbe Seed-Wert stattdessen NUR lokal auf ein einzelnes Element
überschrieben (nicht `:root`, z.B. ein Panel mit eigenem Theme innerhalb der Seite),
ziehen nur Regeln mit, die den Seed direkt referenzieren (z.B. `.ncss-btn--primary` über
`var(--ncss-color-brand)`) - die abgeleitete Skala (`-100`/`-300`/`-700`/`-900`/
`-on-soft`, u.a. von `.ncss-badge` genutzt) bleibt beim alten Wert, weil sie nur einmal
auf `:root` berechnet und als fertiger Wert vererbt wird, siehe
[Bekannte Grenzen](#bekannte-grenzen-bewusste-kompromisse) und `demo/theming.html`.

## Seitenübergänge

Weiche Übergänge zwischen Seiten-Navigationen - eigene, ebenfalls OPT-IN Datei wie
`theme.css`: **`page-transitions.css`**. Auf JEDER Seite laden, zwischen der ein
Übergang erscheinen soll (Cross-Document View Transitions brauchen die Zustimmung
BEIDER Seiten - Quelle und Ziel der Navigation):

```html
<link rel="stylesheet" href="ncss.css">
<link rel="stylesheet" href="page-transitions.css">
```

Reines CSS (`@view-transition { navigation: auto; }`), kein JavaScript nötig - der
Browser übernimmt Navigations-Erkennung und Vorher-/Nachher-Screenshots selbst.
Aktuell nicht Baseline (Chromium-Familie, Stand dieser Recherche) - **keine Auswirkung
auf ältere Browser**: eine unbekannte `@`-Regel wird beim Parsen einfach ignoriert
(CSS-Grundprinzip), die Navigation bleibt dort der normale, sofortige Seitenwechsel,
kein `@supports` nötig. Nur unter `prefers-reduced-motion: no-preference` aktiv - anders
als die meisten Animationen hier reagiert die View-Transitions-API NICHT von selbst auf
diese Einstellung, das Gate ist deshalb notwendig, nicht redundant zur globalen
reset.css-Regel.

`.ncss-topbar` bekommt einen `view-transition-name` (`ncss-page-topbar`) - dieselbe
Kopfleiste morpht dadurch beim Seitenwechsel nahtlos an Ort und Stelle, statt mit dem
Rest der Seite zu kreuzblenden. Eigene Dauer/Kurve für den Rest der Seite
(`::view-transition-old/-new(root)`) über dieselben Motion-Tokens wie der Rest von
NativeCSS (`--ncss-motion-duration-slow`, `--ncss-motion-easing`).

**Mehrere Presets, nicht nur Kreuzblende**: Default ist die Kreuzblende, drei weitere
Presets liegen bereits bei - `slide` (horizontal), `zoom` (Heran-/Wegzoomen), `wipe`
(Kreis-Reveal von oben). Aktivieren pro Seite über den `types`-Deskriptor - dafür die
GESAMTE `@view-transition`-Regel in einem eigenen `<style>` NACH `page-transitions.css`
wiederholen (nicht nur `types` allein, siehe Kommentar in der Datei):

```html
<style>
  @media (prefers-reduced-motion: no-preference) {
    @view-transition { navigation: auto; types: slide; }
  }
</style>
```

Eigenes Preset ergänzen: `html:active-view-transition-type(name) { &::view-transition-old(root){...} &::view-transition-new(root){...} }`
nach demselben Muster wie die drei mitgelieferten - Namen sind frei wählbar, keine feste
Liste in der Spec.

## Architektur

Ladereihenfolge über eine einzige globale `@layer`-Deklaration in `ncss.css` (Layer-
Reihenfolge ist seiten-global, unabhängig davon, in welcher Reihenfolge `<link>`-Tags im
`<head>` stehen):

```
wa-native, wa-base, wa-utilities, wa-color-palette, wa-color-variant, wa-theme,
wa-theme-dimension, wa-theme-overrides,   ← Web Awesomes eigene Layer (falls eingebunden)
tokens, reset, base, helpers, components, ← NativeCSS selbst
webawesome-bridge,                        ← überschreibt Web Awesomes Default-Theme gezielt
browser-fixes                             ← isolierte Browser-/Engine-Workarounds, zuletzt
```

Repo-Struktur (Ordner, nicht zu verwechseln mit den `<link>`-Pfaden oben - **die
Schnellstart-Beispiele gelten für EUER Projekt**, wo `ncss.css`/`theme.css` einfach
nebeneinander liegen dürfen, egal wie dieses Repo intern organisiert ist):

```
dist/                     Die eigentliche Bibliothek - unverändert in ein Projekt kopierbar
  ncss.css                  Import-Manifest (Layer-Reihenfolge + alle @import)
  tokens.css                Design Tokens: Typografie, Abstand, Radius, Schatten, Bewegung
  colors.css                Farb-Tokens (light-dark(), abgestufte Skalen)
  reset.css                 Minimal-Reset
  base.css                  Ungestylte native Elemente bekommen sinnvolle Defaults
  browser-fixes.css         Isolierte Browser-/Engine-spezifische Workarounds
  webawesome-bridge.css     Mappt ncss-Tokens auf Web Awesomes --wa-*-Variablen
  theme.css                 Mitgeliefertes Beispiel-Theme (siehe "Theme anpassen")
  page-transitions.css      Opt-in Seitenübergänge (siehe "Seitenübergänge")
  helpers/                  Utility-Klassen (Layout, Typografie, Formulare, Medien, ...)
  components/                Fertige Komponenten (Nav, Card, Modal, Badge, ...) + kleine
                              opt-in JS-Fallback-Dateien (siehe jeweilige Abschnitte unten)
demo/                     Alle Demo-/Dokumentationsseiten, siehe unten - inkl.
                            product.html (die Produkt-/Marketingseite dieses Projekts,
                            demonstriert das System an sich selbst) und index.html (die
                            Demo-Übersicht/Startseite der Demo-Sammlung)
vendor/                   Selbst gehostetes Web Awesome + Font Awesome (optionale
                            Drittanbieter-Abhängigkeit, bewusst NICHT Teil von dist/ -
                            ncss.css funktioniert vollständig ohne sie)
```

`https://skerbis.github.io/nativecss/` (Site-Wurzel) zeigt `demo/product.html` - ein
GitHub-Actions-Workflow (`.github/workflows/pages.yml`) erzeugt beim Deploy eine
angepasste Kopie als echte `index.html` an der Site-Wurzel (Pfade um eine Ebene
zurückgerechnet, siehe `.github/scripts/build-root-index.mjs`), kein sichtbarer
Redirect. Im Repo selbst liegt KEINE index.html im Hauptordner - lokal die jeweilige
Datei direkt unter `demo/` öffnen (`demo/product.html` für die Produktseite,
`demo/index.html` für die Demo-Übersicht).

## Grundprinzipien

- **Native zuerst.** Cascade Layers statt Spezifitäts-Kämpfe/`!important`, Container
  Queries statt Media-Query-Wildwuchs, native Elemente (`<dialog>`, `<details>`) statt
  JS-Nachbauten, wo das native Verhalten bereits ausreicht.
- **Ein Token-System, eine Quelle der Wahrheit.** `tokens.css`/`colors.css` sind die
  einzigen Orte, an denen rohe Werte (Farben, `rem`, `px`) stehen dürfen.
- **Kein Build-Schritt.** `@import` + Cascade Layers regeln alles.
- **Kein Utility-Klassen-Wildwuchs.** Kleine, kuratierte Utility-Sets statt eines
  Tailwind-artigen "für jeden CSS-Wert eine Klasse"-Ansatzes.
- **Breakpointless als Standardweg**, feste Breakpoints als dokumentierter Escape Hatch
  (siehe [Design Tokens](#design-tokens)).
- **Keine Inline-Styles**, außer zur Parametrisierung einer Custom Property pro Instanz,
  z.B. `style="--ncss-grid-min: 20rem"` oder `style="--ncss-focus-point: 20% 80%"`. Das ist
  die einzige sanktionierte Ausnahme - **NIE** `url()`-Werte durch eine Custom Property
  reichen (siehe [Bekannte Grenzen](#bekannte-grenzen-bewusste-kompromisse)).
- **Verifizieren, nicht annehmen.** Jede nicht-triviale Änderung wird im echten Browser
  geprüft, nicht nur gegen Doku/Training-Wissen angenommen - Browser-Support-Behauptungen
  veralten und Doku kann falsch sein (siehe Fallstricke im internen Skill-Dokument).

## Design Tokens

Alle Tokens sind CSS Custom Properties auf `:root`, mit dem Präfix `--ncss-`.

### Typografie

| Token | Wert | Zweck |
|---|---|---|
| `--ncss-font-size-sm` … `-2xl` | `clamp()`, 6 Stufen | Fließende Schriftgrößen |
| `--ncss-line-height-tight` / `-base` | `1.1` / `1.6` | Zeilenhöhe |
| `--ncss-font-family-base` / `-heading` / `-mono` | System-Font-Stacks | Kein Web-Font-Ladevorgang nötig |
| `--ncss-font-weight-normal/medium/semibold/bold` | `400/500/600/700` | Eine Quelle für alle fetten Texte |
| `--ncss-tracking-tight/normal/wide/wider/widest` | `em`-basiert | Laufweite (letter-spacing), skaliert mit der Schriftgröße mit |

`clamp()`-Werte mischen `rem` + `vw`, nie reines `vw` - reines `vw` ignoriert
Browser-Zoom/Nutzer-Textgrößeneinstellung (WCAG 1.4.4-Verstoß).

### Abstand

`--ncss-space-3xs` bis `-2xl` (8 Stufen), ebenfalls `clamp()`-basiert, fließt mit der
Viewport-Breite zwischen einem Min- und Max-Wert.

### Sonstige Tokens

| Token | Zweck |
|---|---|
| `--ncss-radius-sm/md/lg/full` | Eckenradius |
| `--ncss-shadow-sm/md/lg` | Schatten |
| `--ncss-container-max` / `-max-narrow` | `75rem` / `45rem` - Standard-Breite für `.ncss-container`/`--narrow` |
| `--ncss-focus-ring-width` | `2px` |
| `--ncss-motion-duration` / `-slow` / `-easing` | Übergangsdauer/-kurve |
| `--ncss-aspect-video/square/portrait` | `16/9`, `1/1`, `3/4` |
| `--ncss-focus-point` | Default `center` - steuert `object-position` bei zugeschnittenen Medien, pro Bild überschreibbar |
| `--ncss-grid-min-default`, `--ncss-masonry-column-min`, `--ncss-card-media-width-horizontal`, `--ncss-choice-size`, `--ncss-icon-size-sm`, `--ncss-dialog-max-width`, `--ncss-textarea-min-height`, `--ncss-border-width` | Komponenten-Defaults, pro Instanz per Inline-Custom-Property überschreibbar |

### Farben

Semantische Tokens (alle `light-dark()`-basiert, ein Wert deckt Light+Dark ab):
`--ncss-color-bg`, `-bg-subtle`, `-surface`, `-text`, `-text-muted`, `-border`,
`-focus-ring`, `-overlay`, `-overlay-strong`.

Skalen-Familien (`brand`, `brand-2`, `neutral`, `success`, `warning`, `danger`), je 5
Stufen aus einer Basisfarbe per `color-mix()` in `oklch` berechnet:

| Suffix | Bedeutung |
|---|---|
| *(keine)* / `-500` | Basisfarbe |
| `-100` | sehr hell/dezent (Light Mode: Richtung Weiß, Dark Mode: Richtung Schwarz) |
| `-300` | hell/dezent |
| `-700` | dunkel/kräftig |
| `-900` | sehr dunkel/kräftig |
| `-on-soft` | Passende Textfarbe für eine `-100`/`-300`-Fläche (z.B. Badge, Karte) |
| `-contrast` | Kontrastfarbe für die Basisfarbe selbst (z.B. Button-Text auf `--ncss-color-brand`) |

`[data-theme="light"]` / `[data-theme="dark"]` auf einem Vorfahren erzwingen ein Theme
unabhängig von der Systemeinstellung.

### Farbpaletten (Markenfarben umschalten)

`[data-palette="..."]` ist eine ZWEITE, unabhängige Achse zu `[data-theme]` - überschreibt
nur `--ncss-color-brand`/`-brand-2` (+ ihre `-contrast`-Partner), alle abgeleiteten Stufen
(100-900, `-on-soft`) berechnen sich automatisch neu, da sie per `color-mix()` aus genau
diesen Basiswerten kommen. Frei mit `[data-theme]` kombinierbar, z.B.
`<html data-theme="dark" data-palette="football">`. Live-Umschalter in `demo/colors.html`.

| `data-palette` | Brand | Brand-2 |
|---|---|---|
| *(keins, Standard)* | Blau | Violett |
| `football` | Grün | Schwarz (Dark Mode: Silbergrau) |
| `sunset` | Orange | Grau |

Weitere Paletten nach demselben Muster in `colors.css` ergänzen - nur die beiden
Basisfarben + Kontrastfarben definieren, `light-dark()`-gewrappt.

**Live-Farbeditor** (`demo/colors.html`, Button "Farben live anpassen"): freie
`<input type="color">`-Regler für ALLE Semantischen Tokens + Markenfarben aus der Demo
darüber (`brand`/`brand-2`/`neutral`/`success`/`warning`/`danger`/`bg`/`bg-subtle`/
`surface`/`text`/`text-muted`/`border`/`focus-ring` - 13 Regler, deckungsgleich mit den
Swatches im Abschnitt "Semantische Tokens" außer `overlay`, siehe unten), setzt jeden Wert per
`documentElement.style.setProperty()` direkt auf `<html>` - dieselbe Voraussetzung wie bei
`theme.css` (siehe oben "Theme anpassen"): NUR auf `:root` gesetzt rechnen sich alle
abgeleiteten Skalen (100/300/700/900, `-on-soft`, Badges/Buttons/Cards) automatisch mit,
weil sie per `color-mix()` aus genau diesen Werten kommen. Setzt dabei ein ECHTES
`light-dark(hell, dunkel)`-Paar (nicht einen einzelnen festen Wert) - ein Umschalter im
Modal ("☀️ Hell bearbeiten"/"🌙 Dunkel bearbeiten") wählt, welche der beiden Hälften die
Regler gerade zeigen/bearbeiten, beide werden unabhängig im Speicher gehalten und bei
JEDER Änderung neu zu `light-dark(...)` zusammengesetzt - ursprünglich ersetzte ein
einzelner fester Wert das ganze Paar (Light/Dark zeigten währenddessen dieselbe Farbe),
zu Recht als Lücke gemeldet ("müsste ich im Picker nicht auch die Farbwerte für dark und
light pflegen? aktuell geht ja nur light"). "Zurücksetzen" entfernt die Inline-Styles
wieder vollständig. Vorbelegung pro Hälfte: `getComputedStyle(...).getPropertyValue
("--x")` liefert bei einem Custom Property nur den unaufgelösten `light-dark(...)`-Text
zurück, kein fertiges RGB - ein unsichtbares Sonden-Element mit `color: var(--x)` zwingt
die tatsächliche Auflösung, zusätzlich `color-scheme` DIREKT auf demselben Sonden-Element
erzwingt dabei GEZIELT Light oder Dark (dasselbe Muster wie `.ncss-scheme-light`/`-dark`,
`helpers/surfaces.css`) - unabhängig vom gerade aktiven Seiten-Theme liest der Editor so
IMMER beide echten Standardwerte aus, nicht nur den aktuell sichtbaren. `--ncss-color-
overlay` bleibt bewusst OHNE Regler - ein transparenter `rgb(0 0 0 / 45%)`-Wert, `<input
type="color">` kann keine Transparenz abbilden und würde die Deckkraft beim Übernehmen
stillschweigend auf 100% setzen.

### Breakpoints & Container-Query-Schwellen (feste Konvention, nicht als `var()` nutzbar)

CSS Custom Properties funktionieren aktuell in keinem Browser innerhalb von
`@media`/`@container`-Bedingungen - die Werte unten sind deshalb als dokumentierte,
wörtlich einzutragende Konvention gedacht, kein `var()`.

| Name | Wert | Verwendung |
|---|---|---|
| `sm` | 480px | *(aktuell ungenutzt, dokumentierte Konvention)* |
| `md` | 768px | `.ncss-hide-below-md` / `.ncss-hide-from-md` |
| `lg` | 1024px | *(aktuell ungenutzt, dokumentierte Konvention)* |
| `nav-collapse` | 64rem | `.ncss-nav` klappt zu Hamburger/Off-Canvas |
| `xl` | 1280px | *(aktuell ungenutzt, dokumentierte Konvention)* |
| `2xl` | 1536px | *(aktuell ungenutzt, dokumentierte Konvention)* |
| `card-horizontal` | 24rem | `.ncss-card--horizontal` (Container-Query, nicht Viewport) |
| `card-row` | 32rem | `.ncss-grid--card-row` |
| `table-stacked` | 36rem | `.ncss-table-stacked` |
| `float-wrap` | 28rem | `.ncss-float-start`/`-end` beginnen zu floaten |
| `drop-cap-large` | 40rem | `.ncss-drop-cap` wächst |
| `grid-cols-2/3/4/6` | 24/36/48/56rem | `.ncss-grid--cols-2/3/4/6` |

## Layout

Alle Klassen in `helpers/layout.css`.

| Klasse | Zweck |
|---|---|
| `.ncss-container` / `--narrow` | Zentrierter Seiten-Container, `container-type: inline-size` für Kind-Container-Queries. **`--narrow` ist ein Modifier, immer zusammen mit `.ncss-container` verwenden** (`class="ncss-container ncss-container--narrow"`), nie allein - sonst fehlt die Zentrierung (`margin-inline:auto`) |
| `.ncss-full-bleed` | Durchbricht die Container-Breite auf `100vw`, ohne das Markup umzubauen |
| `.ncss-bleed-start` / `.ncss-bleed-end` | Wie `.ncss-full-bleed`, aber nur auf einer Seite bis zum Bildschirmrand ("Lesezeichen"-Effekt) - die andere Seite bleibt normal in der Spalte |
| `.ncss-bleed-half-end` / `.ncss-bleed-half-start` | Beginnt exakt in der Mitte des Elternelements und bricht von dort zu EINER Seite bis zum Bildschirmrand aus (halb so breit wie der Viewport) - `--end` bricht nach rechts (Start-Kante an der Mitte), `--start` spiegelverkehrt nach links |
| `.ncss-bleed-center` (+ `--ncss-bleed-amount`) | Wächst symmetrisch auf BEIDEN Seiten um einen festen Betrag (Default 2rem), bleibt aber auf der Mitte des eigenen Elternelements zentriert - kein Bezug zum Viewport, funktioniert auch in einem nicht zentrierten Container |
| `.ncss-page-shell` + `.ncss-stretch` | Sticky-Footer-Muster (Footer klebt unten, ohne JS/Höhenberechnung) |
| `.ncss-py-sm/md/lg/xl`, `.ncss-px-*` | Padding-Utilities (block/inline) |
| `.ncss-mb-sm/md/lg/xl`, `.ncss-mb-0` | `margin-block-end`-Utilities |
| `.ncss-gap-sm/md/lg/xl` | `gap` für eigene Flex-/Grid-Container |
| `.ncss-stack` / `--tight` / `--loose` | Vertikaler Rhythmus (Flex-Column + `gap`) |
| `.ncss-cluster` | Horizontal fließende Gruppe (Tags, Buttons) |
| `.ncss-grid` (+ `--ncss-grid-min`/`--ncss-grid-max` Override) | Intrinsisches Grid, `auto-fit`/`minmax(MIN, MAX)`, kein Breakpoint nötig. `--ncss-grid-max` (Default `1fr`, unbegrenzt) deckelt das Spaltenwachstum, z.B. gegen absurd breite Spalten bei wenigen Elementen auf sehr breiten Bildschirmen |
| `.ncss-grid--align-start` | Deaktiviert das Standard-Stretch gleich hoher Grid-Zeilen |
| `.ncss-grid--card-row` | Ab `card-row`-Schwelle (32rem) Spalten statt Zeilen |
| `.ncss-grid--cols-2/3/4/6` | Escape Hatch zu einer FESTEN Spaltenzahl (statt intrinsisch), bricht unterhalb der jeweiligen Schwelle (24/36/48/56rem) auf 1 Spalte um |
| `.ncss-col-span-2/3`, `.ncss-row-span-2/3` | Auf ein Grid-Kind gesetzt: nimmt mehrere Spalten/Zeilen ein statt nur einer - z.B. eine 1/3-Karte neben einer 2/3-Karte in `.ncss-grid--cols-3` |
| `.ncss-bento` (+ `--ncss-bento-min`/`--ncss-bento-max`/`--ncss-bento-row-height`) | Gemischte Kachelgrößen (Bento-Layout), `grid-auto-flow: dense` füllt Lücken automatisch auf - kombiniert mit `.ncss-col-span-*`/`.ncss-row-span-*` |
| `.ncss-masonry` (+ `--ncss-masonry-column-min`) | Spaltenbasiertes Masonry-Fallback (Baseline), progressive Enhancement zu echtem `display: grid-lanes`, sobald verfügbar |
| `.ncss-flex`, `--wrap`, `--center`, `--between`, `--column` | Flex-Utilities |
| `.ncss-flex-1` / `.ncss-flex-auto` | Als Kind von `.ncss-flex`: `flex: 1 1 0%` / `0 0 auto` |
| `.ncss-hide-below-md` / `.ncss-hide-from-md` | Klassischer Viewport-Breakpoint-Escape-Hatch (768px) |
| `.ncss-divider` | Horizontaler Trenner als Klasse (native `<hr>` hat denselben Look bereits als Default) |
| `.ncss-divider--vertical` | Vertikaler Trenner für eine Flex-Zeile (auf einem `<hr>`, `align-self: stretch`) |
| `.ncss-transform-center` | Zentriert ein Element auf sich selbst (`position:absolute` + `translate: -50% -50%`) - der Elterncontainer braucht dafür selbst eine eigene `position` (relative/absolute/fixed/sticky) |

## Typografie

Alle Klassen in `helpers/typography.css`.

| Klasse | Zweck |
|---|---|
| `.ncss-text-sm/base/md/lg/xl` | Schriftgröße |
| `.ncss-text-lead` | Teaser-/Lead-Absatz (Artikel-Intro, Größe + gedämpfte Textfarbe in einer Klasse) |
| `.ncss-eyebrow` | Kleines, versal gesetztes Label ÜBER einer Überschrift ("Kicker") - Größe, Gewicht, Laufweite, Markenfarbe in einer Klasse |
| `.ncss-text-muted/brand/brand-2/neutral/success/warning/danger` | Textfarbe |
| `.ncss-text-inherit` | `color: inherit` - für Text auf einer farbigen Fläche (z.B. `.ncss-surface--brand`) |
| `.ncss-text-light` / `.ncss-text-dark` (+ `-100/-300/-700/-900`) | Erzwungener heller/dunkler Text (UIkit `uk-light`/`uk-dark`-Pendant) - fest auf Weiß/Schwarz, UNABHÄNGIG vom Theme. Für Flächen, deren Farbe nicht über ncss-Tokens läuft (Foto, Video-Poster, ein fester Marken-Ton außerhalb der Skala) - anders als `.ncss-scheme-dark/-light` (die das ganze `light-dark()`-Tokensystem umschalten), setzt diese Familie NUR die Textfarbe. `-100/-300/-700/-900` sind Deckkraft-Stufen (100 = sehr dezent, 900 = voll deckend, `-900` == die Basis-Klasse ohne Zahl), gleiche Richtung wie die Farbskala in `colors.css`. Bridgt zusätzlich Web-Awesome-Formulare (siehe [Web Awesome Bridge](#web-awesome-bridge)) - ein `<wa-input>` innerhalb von `.ncss-text-light` zeigt Label/Wert/Hinweistext ebenfalls korrekt hell, nicht nur normaler Light-DOM-Text. Demo: `demo/magazine.html` |
| `.ncss-text-center/start/end` | `text-align` |
| `.ncss-text-justify` | Blocksatz - in der Praxis meist mit `.ncss-hyphenate` kombinieren |
| `.ncss-text-balance` / `.ncss-text-pretty` | `text-wrap: balance/pretty` |
| `.ncss-tracking-tight/normal/wide/wider/widest` | Laufweite (letter-spacing) |
| `.ncss-truncate` | Einzeiliges Abschneiden mit Ellipsis |
| `.ncss-clamp-lines` (+ `--ncss-clamp-lines`) | Mehrzeiliges Abschneiden, modernes CSS statt JS |
| `.ncss-hyphenate` | `hyphens: auto` (braucht korrektes `lang`-Attribut) |
| `.ncss-nums-tabular` / `.ncss-nums-oldstyle` | `font-variant-numeric` |
| `.ncss-drop-cap` | Drop Cap via `initial-letter` (+ `-webkit-initial-letter` für Safari), wächst per Container Query ab 40rem |
| `.ncss-drop-cap--sm` / `--lg` | Kleinere/größere Sink-Höhe (2→3 bzw. 4→5 Zeilen je nach Containerbreite) |
| `.ncss-drop-cap--light` | Normale statt fette Schriftstärke |
| `.ncss-drop-cap--brand` | Eingefärbt in `--ncss-color-brand` |
| `.ncss-columns` (+ `--ncss-columns-width`) | Mehrspaltiger Fließtext, `column-width`-basiert (kein fester `column-count`, kein `@container` nötig) |
| `.ncss-pull-quote` | Auffällig hervorgehobenes Zitat, nutzt `column-span: all` innerhalb von `.ncss-columns` |
| `.ncss-font-variable` | `font-variation-settings`-Brücke für ein zukünftig eingebundenes Variable Font |
| `.ncss-text-boxed` | "Textmarker"-Optik über mehrere Zeilen (`box-decoration-break: clone`) - jede umgebrochene Zeile bekommt ihre eigene Hintergrund-Box, ganz ohne `<span>` pro Zeile. Default dunkel/theme-unabhängig, farbige Variante durch Kombination mit `.ncss-surface--brand/-brand-2/-neutral`. **Braucht `display:inline`, das auf einem direkten Flex-/Grid-Item automatisch zu `block` "blockifiziert" wird** - nie direkt in `.ncss-stack`/`-cluster`/`-grid`/`-flex` verschachteln, sondern in einen normalen `<div>`-Wrapper. Gilt auch in einer Card, wenn deren `.ncss-card-body` selbst `.ncss-stack`/`-cluster`/`-grid` trägt oder `--horizontal`/`--horizontal-end` ist (siehe [Bekannte Grenzen](#bekannte-grenzen-bewusste-kompromisse)) - eine reine `.ncss-card-body` ohne diese Kombination braucht dagegen keinen Wrapper |

Drop-Cap-Varianten sind Modifier, die zusätzlich zu `.ncss-drop-cap` gesetzt werden, z.B.
`class="ncss-drop-cap ncss-drop-cap--sm ncss-drop-cap--light"`.

Normales `<blockquote>` (dezente Zitat-Optik, kein `.ncss-pull-quote`) ist bereits in
`base.css` gestylt, keine eigene Klasse nötig - `<footer>`/`<cite>` darin (Standard-HTML-
Attributionsmuster) sind mitgestylt, der "—"-Trenner ist generierter Inhalt (`::before`),
kein hart getipptes Zeichen im Markup: `<blockquote><p>Zitat.</p><footer><cite>Quelle</cite></footer></blockquote>`.

`::marker` (Aufzählungszeichen/Nummern bei `<ul>`/`<ol>`) nutzt `--ncss-color-text-muted`
statt des vollen Textkontrasts - kein eigener Marker-Token, läuft automatisch über
`theme.css` mit.

## Farben & Flächen

`helpers/surfaces.css`: `.ncss-surface--brand` / `--brand-2` / `--neutral` - Hintergrund +
garantiert passende Textfarbe (900er-Stufe + `#fff`) in einer Klasse.

**Verläufe** (`linear-gradient`), ebenfalls in `helpers/surfaces.css`: `.ncss-gradient-brand`
(Marken- zu Zweitfarbe), `.ncss-gradient-subtle` (dezent zwischen den beiden Hintergrund-
Stufen), `.ncss-text-gradient-brand` (Verlauf als Textfarbe, nur für große Überschriften).
Winkel per `--ncss-gradient-angle` (tokens.css, Default 135deg), pro Instanz
überschreibbar: `style="--ncss-gradient-angle: 90deg"`.

**Erzwungenes Farbschema pro Element**, ebenfalls in `helpers/surfaces.css`:
`.ncss-scheme-dark` / `.ncss-scheme-light` setzen nur `color-scheme` (vererbbar) - alle
`light-dark()`-Tokens im Inhalt lösen dadurch auf das erzwungene Schema auf, unabhängig vom
Theme der restlichen Seite. NICHT zu verwechseln mit dem seitenweiten "Manueller
Theme-Override" über `[data-theme]` weiter oben in dieser Datei (`colors.css`) - dasselbe
`color-scheme`-Prinzip, hier aber lokal auf ein einzelnes Element statt auf `:root`
angewendet (dasselbe Muster wie `.ncss-modal--dark`, components/modal.css, hier generisch
für jedes beliebige Element).

## Ecken, Rahmen, Schatten, Blend-Modi

`helpers/elevation.css` - bewusst als eigenständige, allgemeine Utilities statt in
Komponenten wie Card eingebacken: ob etwas abgerundet ist, einen Rahmen oder Schatten (und
ob der beim Hover wächst) hat, ist eine gestalterische Entscheidung, keine Eigenschaft der
Komponente. Funktioniert auf JEDEM Element, nicht nur `.ncss-card`.

| Klasse | Zweck |
|---|---|
| `.ncss-radius-sm/md/lg/full/none` | Eckenradius |
| `.ncss-border` / `.ncss-border-none` | Rahmen |
| `.ncss-shadow-sm/md/lg/none` | Schatten |
| `.ncss-shadow-hover-sm/md/lg` | Schatten wächst beim Hover auf die genannte Stufe (Ausgangsstufe bleibt frei wählbar) |
| `.ncss-blend-multiply/screen/overlay/darken/lighten/color-dodge/color-burn/hard-light/soft-light/difference/exclusion/hue/saturation/color/luminosity` | `mix-blend-mode`-Utilities, 1:1 auf die gleichnamigen CSS-Keywords (Blend mit dem, was HINTER dem Element liegt) |

Beispiel: `class="ncss-card ncss-border ncss-radius-lg ncss-shadow-sm ncss-shadow-hover-md"`
ergibt die "klassische" Karte. `class="ncss-card"` allein ist eine komplett bare Karte
(nur Struktur/Hintergrund, kein Rahmen/Ecken/Schatten).

## Formulare

Alle Klassen in `helpers/forms.css`. Native Elemente werden fertig gestylt, keine
JS-Nachbauten.

| Klasse | Zweck |
|---|---|
| `.ncss-field` | Label+Input+Hint als vertikale Gruppe |
| `.ncss-label` / `--required` | Feld-Label, `--required` ergänzt ein rotes `*` |
| `.ncss-input` / `.ncss-select` / `.ncss-textarea` | Einheitlicher Look für native Formularfelder, inkl. `:user-invalid`-Fehlerzustand |
| `.ncss-field-hint` / `.ncss-field-error` | Hilfetext / Fehlertext unter einem Feld |
| `.ncss-choice` | Checkbox/Radio-Zeile (native Elemente, nur `accent-color` + Ausrichtung) |
| `.ncss-switch` | Toggle-Switch aus `<input type="checkbox">`, komplett neu gezeichnet über `::before`, kein JS |
| `.ncss-range` | Vereinheitlichtes `<input type="range">` |
| `.ncss-input[type="file"]` | Datei-Upload - `::file-selector-button` (+ `::-webkit-file-upload-button` für ältere Safari) bringt den Browser-eigenen Button auf `.ncss-btn--secondary`-Optik. Größter Cross-Browser-Unterschied aller Feldtypen (Chrome/Edge/Safari: eigener Button + Dateiname; Firefox: "Durchsuchen…"-Button) |
| `.ncss-input[type="color"]` | Swatch-Fläche über `::-webkit-color-swatch(-wrapper)`/`::-moz-color-swatch` an ncss-Radius angeglichen - der native Picker-Dialog selbst bleibt Browser-UI |
| `.ncss-input[type="date"/"time"/"datetime-local"/"month"/"week"]` | Kalender-/Uhr-Icon (`::-webkit-calendar-picker-indicator`) folgt automatisch dem Theme, keine eigene Anpassung nötig - `color-scheme: light dark` (`colors.css`, `:root`) sorgt bereits für die passende Icon-Farbe in Chromium/Safari |
| `.ncss-input[type="search"]` | `appearance: none` nötig, sonst rundet Safari das Feld auf eigene Faust komplett ab (ignoriert `border-radius`). Natives "×"-Lösch-Icon bleibt unangetastet |
| `<input list>` + `<datalist>` | Nativer Combobox - editierbares Textfeld MIT Auswahlliste (anders als `<select>`, das nur Auswahl ohne freie Eingabe erlaubt). `.ncss-input` greift ohne Sonderregel (generisch auf jedes `<input>`), per echtem Test in Chromium/WebKit/Firefox identisch bestätigt. Native Vorschlagsliste ist reine Browser-UI (nicht per CSS stylebar) - opt-in gestylte Variante über `components/combobox.js`, siehe unten |
| `fieldset` / `legend` | Ohne eigene Klasse zu Ende gestylt (wie `<blockquote>` in `base.css`) - ersetzt den nativen 3D-"groove"-Rahmen durch die flache ncss-Optik |
| `progress` / `meter` | `accent-color` für die Grundfarbe. `<meter>` bleibt bewusst bei seiner eigenen Grün/Gelb/Rot-Bewertungslogik (sobald `optimum`/`low`/`high` gesetzt sind) statt zur Markenfarbe gezwungen zu werden - das ist seine eigentliche Funktion, `<progress>` für reine Markenfarbe ohne Wertung |
| `output` | Hervorgehobene Darstellung für ein berechnetes Formular-Ergebnis |
| `.ncss-btn` + `--primary`/`--secondary`/`--danger` | Button-Varianten, inkl. `:active`-Rückmeldung für Touch (siehe [Touch-Geräte & mobile Viewports](#touch-geräte--mobile-viewports)) |

**Input-Group** (`components/input-group.css`): mehrere Formular-Steuerelemente visuell
zu EINER Einheit verschmolzen - geteilte Rahmenlinie statt Lücke, nur die äußeren Ecken
rund. Deckt zwei Fälle ab: Feld + Button (Suchleiste) und mehrere Felder nebeneinander
(z.B. Vorname/Nachname).

```html
<label class="ncss-visually-hidden" for="search">Suchbegriff</label>
<div class="ncss-input-group">
  <input class="ncss-input" type="search" id="search" placeholder="Suchbegriff…">
  <button type="submit" class="ncss-btn ncss-btn--primary">Suchen</button>
</div>
```

**Barrierefreiheit**: `placeholder` ist KEIN Ersatz für ein Label - verschwindet bei
Eingabe, wird nicht von jeder Screenreader-Software als Feldname angekündigt. Jedes Feld
braucht ein echtes `<label>`, bei Bedarf per `.ncss-visually-hidden` versteckt - als
Geschwister-Element VOR der `.ncss-input-group`, nicht als Kind hinein (sonst zählt es
fälschlich als `:first-child` und die Eckenrundung landet auf dem unsichtbaren Label
statt dem ersten echten Feld). Bei mehreren direkt verschmolzenen Feldern ohne Platz für
ein Sibling-Label je Feld (z.B. Vorname/Nachname) ist `aria-label` direkt am `<input>`
die richtige Technik, ohne die Kind-Struktur der Gruppe zu verändern:

```html
<div class="ncss-input-group">
  <input class="ncss-input" aria-label="Vorname" placeholder="Vorname">
  <input class="ncss-input" aria-label="Nachname" placeholder="Nachname">
</div>
```

Bewusst NICHT "Form-Group" genannt - das wäre mit der bereits bestehenden
`<fieldset>`/`<legend>`-Gruppierung (semantisches Zusammenfassen mehrerer Felder) leicht
zu verwechseln, obwohl es ein anderes Konzept ist (rein visuelle Verschmelzung, keine
Semantik). Deckt aktuell `.ncss-input`/`-textarea`/`.ncss-btn` als direkte Kinder ab -
`.ncss-select-wrapper` (noch) nicht, siehe Datei-Kommentar für den Grund.

**Gestylte Dropdowns, opt-in** (`components/combobox.js` + `combobox.css`): die native
Vorschlagsliste eines `<datalist>` UND das Options-Popup eines `<select>` sind in keinem
Browser per CSS stylebar (Stand 2026, geprüft) - für `<select>` gibt es mit `appearance:
base-select` mittlerweile einen CSS-Weg, den ncss aktuell nur in Chrome/Edge 135+
aktiviert (WebKit/Safari bewusst ausgeschlossen, siehe `select.css` für die Begründung:
ein bekannter, nicht selbst fixbarer Doppelpfeil-Rendering-Bug in Safari 26), für
`<datalist>` gibt es gar keinen. `components/combobox.js` (opt-in) ersetzt in
beiden Fällen die native Popup-Optik durch eine echte, gestylte Dropdown-Liste -
Original-Markup unverändert, volle native Funktion bleibt ohne JS bestehen (progressive
enhancement). Bei `<select>` greift es genau dort, wo ncss `appearance: base-select`
NICHT aktiviert (Firefox UND aktuell auch Safari) - per `CSS.supports(...)` mit
DERSELBEN zusammengesetzten Bedingung wie `select.css`s `@supports`-Gate selbst geprüft
(muss synchron bleiben), tut nichts, wo die native Technik bereits ein gestyltes Popup
liefert (Chrome/Edge). Tastatur (Pfeiltasten/
Enter/Escape) und ARIA (`role="combobox"`/`"listbox"`/`"option"`, `aria-expanded`,
`aria-activedescendant`) nach dem WAI-ARIA-Combobox-Muster, per echtem Test in
Chromium/WebKit/Firefox bestätigt (inkl. Tippen+Filtern, Klick- und Tastaturauswahl,
korrekter Wertübernahme in das native `<select>`/`<input>`).

```html
<script src="components/combobox.js" defer></script>
```

**Reicher `<option>`-Inhalt** (nur mit `appearance: base-select`, siehe `select.css`):
seit der "Customizable Select"-Erweiterung darf `<option>` beliebige Kind-Elemente
enthalten (Icon+Label statt nur Text), und ein optionaler `<button><selectedcontent>`
als erstes Kind von `<select>` steuert, wie die aktuelle Auswahl im GESCHLOSSENEN
Zustand angezeigt wird ("The Golden Rule of Customizable Select": Text bleibt Pflicht,
sichtbar oder per `.ncss-visually-hidden` - Icons sind eine Ergänzung, nie ein Ersatz).

```html
<select class="ncss-select">
  <button type="button">
    <selectedcontent></selectedcontent>
  </button>
  <option value="apfel">
    <span aria-hidden="true">🍎</span>
    <span>Apfel</span>
  </option>
  <option value="orange">
    <span aria-hidden="true">🍊</span>
    <span>Orange</span>
  </option>
</select>
```

`components/combobox.js` repliziert denselben reichen Inhalt für den JS-Fallback-Pfad
(Browser ohne `base-select`) - die `<option>`-Kind-Elemente werden 1:1 in die custom
Dropdown-Liste geklont, statt nur den zusammengequetschten Text zu übernehmen. Optisch
identisches Ergebnis unabhängig davon, ob der native oder der JS-Pfad greift, per echtem
Test in Chromium (nativ) UND Firefox (JS-Fallback) bestätigt.

## Tabellen

`helpers/tables.css`, zwei Strategien für schmale Screens:

- `.ncss-table-scroll` (Standard-Empfehlung) - horizontales Scrollen, bewahrt volle
  Tabellen-Semantik für Screenreader.
- `.ncss-table-stacked` (Opt-in) - Karten-Stapel-Optik unterhalb 36rem
  (`data-label`-Attribut pro `<td>` nötig), bricht die programmatische Tabellensemantik
  bewusst zugunsten der Lesbarkeit - nur einsetzen, wenn Inhalt wirklich wie
  "Datensatz-Karten" gelesen werden soll.

## Medien (Bild/Video/Audio)

`helpers/media.css`:

| Klasse | Zweck |
|---|---|
| `.ncss-ratio-video/-square/-portrait` | `aspect-ratio` per Custom Property, kein Wrapper-Padding-Hack nötig |
| `.ncss-img-cover` / `.ncss-img-contain` | `object-fit`, `-cover` inkl. `--ncss-focus-point` |
| `.ncss-img-rounded` / `.ncss-img-circle` | Eckenradius / volle Kreisform |
| `.ncss-img-dim-in-dark` | Abdunkeln im Dark Mode (für Icons/Grafiken mit hartem hellen Hintergrund) |
| `.ncss-figure` | Figure+Figcaption-Layout (Figcaption-Typografie sitzt bereits in `base.css`) |

`components/video.css`: `.ncss-video` (Aspect-Ratio-Wrapper), `.ncss-video--responsive-crop`
(anderer Bildausschnitt derselben Datei per `object-fit` + Breakpoint - für Video gibt es
kein verlässliches natives "andere Datei je Breakpoint", anders als bei Bildern).

`components/audio.css`: `.ncss-audio` (einheitliche Breite für `<audio controls>`),
`.ncss-audio-card` (mit Titel).

**Art Direction bei Bildern**: `<picture><source media="...">` lädt zuverlässig eine andere
Bilddatei je Breakpoint (siehe `demo/media.html#art-direction`) - das native, korrekte
Werkzeug dafür. Bei Video funktioniert dasselbe Muster NICHT zuverlässig
cross-browser (nur Safari unterstützt `<source media>` noch als Altlast).

**Hero-Sektion**: `components/hero.css` - Bild-Hintergrund mit Inhalt obenauf.

```html
<section class="ncss-hero">
  <div class="ncss-hero-media" style="background-image: url(bild.jpg)"></div>
  <div class="ncss-hero-content ncss-hero-content--filled">
    <h2>Überschrift</h2>
    <p>Text...</p>
  </div>
</section>
```

| Klasse | Zweck |
|---|---|
| `.ncss-hero` | Wrapper, `min-height: 22rem`, `overflow: clip` |
| `.ncss-hero-media` | Eigene Ebene fürs Hintergrundbild (inkl. Lesbarkeits-Scrim) - `background-image` **immer inline** setzen, nie über eine Custom Property (siehe [Bekannte Grenzen](#bekannte-grenzen-bewusste-kompromisse)) |
| `.ncss-hero-content--transparent` | Text direkt auf dem Bild (Default) |
| `.ncss-hero-content--filled` | Text auf blickdichter Karte obenauf |
| `.ncss-hero--parallax` | Bild bewegt sich beim Scrollen langsamer als der Inhalt, via `animation-timeline: view()` - kein JS, kein `background-attachment: fixed` (auf iOS Safari absichtlich nie unterstützt). Ohne Support/bei reduzierter Bewegung einfach ein statisches Hero-Bild |

## Textumfluss (Float)

`helpers/float.css`:

| Klasse | Zweck |
|---|---|
| `.ncss-float-start` / `.ncss-float-end` | Text fließt um ein Element - floatet erst ab der `float-wrap`-Schwelle (28rem CONTAINER-Breite), darunter normaler (linksbündiger) Block |
| `.ncss-float-shape-circle` | Nicht-rechteckiger Umfluss (`shape-outside` + `clip-path`, Text folgt der echten Kreisform) |
| `.ncss-center-narrow` | Unterhalb der `float-wrap`-Schwelle zentriert statt linksbündig - funktioniert an JEDEM Element, nicht nur gefloateten |
| `.ncss-full-narrow` | Unterhalb der `float-wrap`-Schwelle volle Breite statt schmal |
| `.ncss-clear` | `clear: both` |
| `.ncss-float-bleed-start` / `.ncss-float-bleed-end` | Kombiniert Textumfluss mit Ausbrechen zum Bildschirmrand - Text fließt normal daneben, das Bild selbst reicht bis zur echten Bildschirmkante. Braucht eine EXPLIZITE `width` statt der impliziten Breite von `.ncss-bleed-*` (ein Float mit `width:auto` schrumpft auf den Inhalt statt den Platz zu füllen - `.ncss-bleed-*` allein mit `float` kombiniert kollabiert deshalb auf 0 Breite) |

Kombinierbares Beispiel (Kreisbild mit Textumfluss, zentriert auf schmalen Containern):

```html
<img class="ncss-float-start ncss-float-shape-circle ncss-center-narrow ncss-ratio-square ncss-img-cover"
     src="bild.jpg" alt="Beschreibung">
Text fließt um das Bild herum ...
```

Hinweis Bildunterschrift bei einem gefloateten Kreisbild: bewusst KEINE sichtbare
`<figcaption>` innerhalb desselben gefloateten Elements - `shape-outside: circle(50%)`
bezieht sich auf die GESAMTE Box, eine zusätzliche Textzeile darunter macht die Box höher
als das Bild und der Textfluss läuft dann um eine Ellipse statt einen Kreis. Die
Bildbeschreibung gehört hier ins `alt`-Attribut; eine sichtbare Figcaption eignet sich für
ein eigenständiges (nicht gefloatetes) Bild, z.B. via `.ncss-figure`.

## Scroll & Sichtbarkeit

`helpers/scroll.css`:

| Klasse | Zweck |
|---|---|
| `html { scroll-behavior: smooth }` (reset.css) | Seitenweiter Default für Anker-Klicks/`.scrollIntoView()` - nicht nur in den einzelnen Komponenten unten, die es zusätzlich selbst auf ihrem eigenen `overflow:auto`-Container setzen (`scroll-behavior` gilt nur für die eigene Scroll-Box, vererbt sich nicht). Respektiert `prefers-reduced-motion` automatisch über die bereits bestehende globale Regel (`*` schließt `html` mit ein) |
| `.ncss-sticky` / `--bottom` | `position: sticky` |
| `.ncss-sticky-container` | Bezugsrahmen für ein Sticky-Element |
| `.ncss-scroll-snap-x` / `-y` + `.ncss-scroll-snap-item` | CSS Scroll Snap |
| `.ncss-snap-sections` + `.ncss-snap-section` (+ `--scrollable`) | Vollbild-Sektionen, section-für-section (klassisches "fullpage"-Muster), komplett nativ über Scroll Snap. `.ncss-scroll-snap-x` innerhalb einer Sektion verschachtelbar für horizontalen Unterablauf, siehe `demo/scroll-sections.html` |
| `.ncss-hide-on-scroll` | Sticky Header blendet beim Runterscrollen aus/beim Hochscrollen ein - komplett JS-frei über die native `scroll-state`-Container-Query, `@supports`-gegated |

`helpers/visibility.css`: `.ncss-hidden`, `.ncss-invisible`, `.ncss-print-only`,
`.ncss-screen-only`, `.ncss-reveal-on-hover`.

## Animationen

`helpers/animations.css`: `.ncss-animate-fade-in/-out`, `-slide-in-up/-down/-left/-right`,
`-scale-in`, `-spin`, `-pulse`, `-shake`; scroll-getriggert:
`.ncss-animate-on-scroll` (+ `--scale`/`--slide-left`/`--slide-right`/`--slide-up`);
`.ncss-skeleton` (Shimmer-Ladezustand); Mikro-Interaktionen: `.ncss-hover-lift`,
`.ncss-hover-grow`, `.ncss-press`; generische Übergangs-Utilities: `.ncss-transition`,
`-slow`, `-colors`, `-transform`. Alle respektieren `prefers-reduced-motion`.

**GPU-Compositing-Hinweis** (Opt-in, `translateZ(0)`): `.ncss-gpu-boost` hebt ein Element auf
eine eigene Compositor-Ebene an - gegen Ruckeln bei häufig animierten/gescrollten Elementen
mit teurem Repaint. Nutzt die eigenständige `transform`-Eigenschaft, kombinierbar mit
`.ncss-hover-lift`/`-grow`/`-press` (die `translate`/`scale` nutzen, nicht `transform`) ohne
Konflikt. Bewusst NICHT automatisch angewendet - jede zusätzliche Compositor-Ebene kostet
Grafikspeicher ("Layer-Explosion"), nur bei sichtbarem Ruckeln gezielt einsetzen. Für ein
Element, das selbst schon `transform` nutzt (z.B. `.ncss-hero--parallax`), stattdessen den
`--ncss-gpu-hint`-Token direkt in der eigenen `transform`-Deklaration setzen (siehe
`components/hero.css`) - zwei `transform`-Deklarationen auf demselben Element würden sich
sonst gegenseitig überschreiben statt zu kombinieren.

## Barrierefreiheit (a11y)

`helpers/a11y.css`: `.ncss-visually-hidden` (+ `-focusable`), `.ncss-skip-link`.

## Touch-Geräte & mobile Viewports

**Touch-Geräte haben kein `:hover`.** Ein Tap auf iPhone/Android löst `:hover`-Regeln
NICHT zuverlässig aus (per echtem Test mit iPhone-Emulation bestätigt, User-Report: "hover
und click effekte haben auf dem iPhone keine Auswirkung") - ein Button, dessen einzige
optische Rückmeldung ein `:hover`-Zustand ist, wirkt auf Touch dadurch komplett tot.
Jede visuell bedeutsame `:hover`-Regel in ncss steht deshalb in
`@media (hover: hover) and (pointer: fine)` (nur Geräte mit echtem Zeigegerät - Maus/
Trackpad), NIE unbedingt. `:focus-visible` (Tastatur-Fokus) bleibt davon immer
UNGATED - wo beide bisher in einem gemeinsamen Selektor standen (z.B.
`a:hover, a:focus-visible { ... }`), sind sie jetzt getrennt.

Für die taktile Rückmeldung auf Touch selbst gilt stattdessen `:active` (gilt für JEDES
Zeigegerät inkl. Touch, kein Gate nötig) - `.ncss-btn` bekam dafür einen eigenen,
komponentenweiten `:active`-Zustand (`scale: 0.95`, unabhängig von der Farb-Variante,
vorher hatte `.ncss-btn` GAR KEINE Tap-Rückmeldung) UND jede Variante zusätzlich eine
ECHTE Farbänderung bei `:active` (dieselben Werte wie die jeweilige `:hover`-Variante,
nur unbedingt statt nur unter der hover-Media-Query - reine Skalierung allein wirkte zu
schwach). Ein Tap dauert oft nur ~100-150ms - die normale Übergangsdauer (200ms) erreicht
ihren Zielwert dabei oft gar nicht erst, die Rückmeldung wirkte dadurch trotz korrekter
Werte kaum wahrnehmbar (User-Report: "kann kaum touch feedbacks feststellen"). Fix: eigener
Token `--ncss-motion-duration-fast` (100ms), NUR als `transition-duration` auf der
`:active`-Regel selbst überschrieben - der EINSTIEG ins Gedrückt-Aussehen ist dadurch
schnell, das Zurückfedern beim Loslassen bleibt bei der normalen, weicheren Dauer. Wer
eine ähnliche taktile Rückmeldung für ein eigenes Element will: `.ncss-press`
(`helpers/animations.css`, ebenfalls `:active`-basiert mit demselben schnellen Einstieg,
kombinierbar mit jedem Element).

**Volle Bildschirmhöhe auf Mobilgeräten**: `100vh`/`height: 100%` entsprechen auf Mobil-
Browsern der GRÖSSTEN möglichen Höhe (Adressleiste ausgeblendet) - ist die Adressleiste
gerade sichtbar, ragt ein `100vh`-Element über den tatsächlich sichtbaren Bereich hinaus
(abgeschnittener Inhalt, ungewollter zusätzlicher Scroll). ncss nutzt für Elemente, die
GARANTIERT ohne Scrollen komplett sichtbar bleiben müssen (Modal/Off-Canvas/`.ncss-sticky-
container`), stattdessen `svh` ("small viewport height", kleinstmöglicher Wert - passt
immer, unabhängig vom Adressleisten-Zustand), jeweils mit `vh` als Fallback für ältere
Browser (`height: 100vh; height: 100svh;` - zweite, gültige Deklaration gewinnt, kein
`@supports` nötig). Für scroll-gekoppelte Animationen (`components/scroll-stack.css`)
dagegen bewusst `lvh` ("large viewport height", identisches Verhalten zum klassischen
`vh` - stabil, ändert sich NICHT während des Scrollens) statt `dvh` ("dynamic viewport
height") - `dvh` würde sich mitten im Scrollen neu berechnen, sobald die Adressleiste ein-/
ausblendet, und genau das mit der Scroll-Distanz der Animation direkt verknüpfte Timing
durcheinanderbringen (bekanntes reales Ruckel-Verhalten von `dvh` in mobilem Safari).

## Icons

`helpers/icons.css`: eigene SVGs als CSS `mask-image` (`currentColor`-fähig, skaliert mit
`font-size`, kein Markup-Inhalt nötig): `.ncss-icon` + `.ncss-icon-close/-chevron-down/
-menu/-play/-search`. Austauschbar gegen z.B. Font Awesome (`<i class="fa-solid fa-xmark">`), ohne
die nutzende Komponente anzufassen - Komponenten wie `.ncss-dialog-close` stylen nur die
Fläche, nie die Icon-Quelle.

## Komponenten

Jede Komponente hat einen ausführlichen Markup-Kommentar direkt in ihrer `.css`-Datei -
hier nur die Kurzreferenz.

| Datei | Klassen | Kurzbeschreibung |
|---|---|---|
| `topbar.css` | `.ncss-topbar`, `-inner`, `-brand`, `-actions` (+ `--transparent`) | Kopfleiste, wächst statt zu überlaufen, wenn die Navigation umbricht. `--transparent` entfernt die sonst undurchsichtige Eigenfläche + den Rahmen - für eine Topbar über einem Hero/farbigen Hintergrund, meist mit `.ncss-glass` (components/effects.css) als eigenem, SEPARATEM Hintergrund-Element kombiniert (nicht `.ncss-glass` direkt auf `.ncss-topbar-inner` - bricht bei einem enthaltenen Off-Canvas-Nav-Panel, siehe Fallstrick 21). Textfarbe bleibt bewusst außerhalb des Modifiers (hängt von der jeweiligen Marke/dem Hintergrund ab), siehe `demo/product.html` für ein vollständiges Beispiel inkl. Breakpoint-scoped Textfarbe fürs Off-Canvas-Panel |
| `nav.css` | `.ncss-nav`, `-toggle`, `-panel`, `-list`, `-item`, `-dropdown` (+ `--nested`), `-submenu` (+ `--mega`), `-mega-col`, `-mega-heading`, `--tree` | Horizontale Nav (kollabiert ab 64rem zu Off-Canvas) + vertikale Tree-Variante; Dropdowns/Mega-Menü über `<details>`/`<summary>`, kein Hover-Bug auf Touch |
| `off-canvas.css` | `.ncss-offcanvas` (+ `--start`/`--end`), `-header` | Seitlich einschiebendes Panel, natives `<dialog>`. `-header` reserviert Platz neben dem absolut positionierten `.ncss-dialog-close` für eine eigene Überschrift im Panel (sonst überlappen sie sich) |
| `modal.css` | `.ncss-modal`, `-header`, `-footer` (+ `--fullscreen`, `--dark`, `--3d`) | Zentriertes Dialog-Modal; `--fullscreen`+`--dark` ergibt eine Lightbox, keine separate Komponente nötig. `--3d` (+ `--ncss-modal-3d-depth`) kippt beim Öffnen wie aus der Tiefe herein statt nur zu faden/skalieren - `perspective()` als Transform-Funktion in der eigenen `transform`-Kette, da `<dialog>` im Top Layer rendert und eine `perspective`-Eigenschaft auf einem Elternelement dort nicht zuverlässig wirkt |
| `dialog-close.css` | `.ncss-dialog-close` | Geteilter Schließen-Button für Modal/Off-Canvas/Nav-Panel |
| `disclosure.css` | `.ncss-disclosure` | FAQ-Box-Optik für `<details>`/`<summary>` |
| `card.css` | `.ncss-card-container`, `.ncss-card`, `-media`, `-header`, `-body`, `-footer` (+ `--flush`, `--transparent`, `--linked`, `--horizontal`, `--horizontal-end`, `--brand/-brand-2/-neutral/-success/-warning/-danger`) | Karte. Rahmen/Ecken/Schatten NICHT eingebaut - siehe [Ecken, Rahmen, Schatten](#ecken-rahmen-schatten). `--flush` entfernt jedes Padding in Body/Header/Footer (auch block); `--transparent` entfernt zusätzlich den Hintergrund - beides zusammen macht `.ncss-card` zu einem unsichtbaren, aber weiter strukturell korrekten Wrapper (Footer bleibt unten, Body füllt den Rest). `--horizontal`/`--horizontal-end`: Media links/rechts nebeneinander mit Text (ab eigener Breite 24rem, `.ncss-card-container` als Wrapper nötig). Media OBEN ist einfach die Dokumentreihenfolge, Media UNTEN braucht nur `.ncss-card-media` als LETZTES Kind - keine eigene Klasse für beides. `.ncss-card-media` rundet selbst nie (`border-radius:0`) - verlässt sich auf `overflow: clip` der Karte, damit nur echte Kartenecken rund werden, nie eine Kante mittendrin. Footer/Body-Fläche bleibt bei unterschiedlich hohen Nachbarkarten automatisch unten ausgerichtet (`.ncss-card-body{flex:1 1 auto}` füllt den Rest). Die `--brand/-brand-2/-neutral/-success/-warning/-danger`-Farbvarianten sind zugleich die Hinweis-/Callout-/"Note"-Box für Dokumentationstexte (Tipp/Warnung/Fehler) - keine eigene Callout-Komponente nötig, dieselben Klassen reichen, Demo: `demo/colors.html` |
| `search.css` | `.ncss-search`, `.ncss-search-input` (+ `--ncss-search-expanded-width`) | Suchfeld, das schmal startet und beim Fokussieren/bei Eingabe per reiner `width`-Transition wächst - kein JS |
| `badge.css` | `.ncss-badge` (+ `--brand-2/-neutral/-success/-warning/-danger`), `.ncss-badge-icon` (+ `--lg`) | Kleine Status-/Kategorie-Chips. `.ncss-badge-icon` ist dieselbe "100-Fläche + -on-soft-Text"-Logik als Kreis/Quadrat um ein einzelnes Icon statt als Text-Pille (Feature-Listen/-Karten) - erwartet ein Icon-Kind (`<i class="fa-solid ...">`, `.ncss-icon-*` oder `<svg>`), `--lg` für die größere Variante (z.B. auf Vollbild-Stacked-Cards) |
| `breadcrumb.css` | `.ncss-breadcrumb` | Natives `<nav><ol>`, `::before`-generierte Trenner |
| `select.css` | `.ncss-select-wrapper`, `.ncss-select` | Gestyltes natives `<select>` inkl. eigenem Chevron. Mit `appearance: base-select` (aktuell nur Chrome/Edge 135+, WebKit/Safari bewusst ausgeschlossen wegen eines Doppelpfeil-Rendering-Bugs in Safari 26) zusätzlich: reicher `<option>`-Inhalt (Icon+Label statt nur Text), `::checkmark`, optionaler `<button><selectedcontent>` für die Anzeige im geschlossenen Zustand. In Firefox und aktuell auch Safari übernimmt `components/combobox.js` denselben reichen Inhalt als JS-Fallback - siehe [Formulare](#formulare) |
| `input-group.css` | `.ncss-input-group` | Formular-Steuerelemente visuell zu einer Einheit verschmolzen (Feld+Button, Felder nebeneinander) - siehe [Formulare](#formulare) |
| `combobox.css` | `.ncss-combobox`, `-chevron`, `-list`, `-option`, `-trigger` | Gestylte Dropdown-Liste für `components/combobox.js` (opt-in JS, `<datalist>`/`<select>`-Fallback) - siehe [Formulare](#formulare) |
| `split.css` | `.ncss-split-container`, `.ncss-split` (+ `--align-start/-end/-stretch`), `-media`, `-content` | Text neben Bild, für Marketing-/Feature-Sektionen. Bild links/rechts braucht keinen Modifier - reine Dokumentreihenfolge (`.ncss-split-media` als erstes/letztes Kind), genau wie bei Card. Ab 36rem CONTAINER-Breite (`.ncss-split-container` als Wrapper nötig) stehen beide Spalten nebeneinander, darunter stapeln sie sich automatisch. `--ncss-split-align` (Default `center`) steuert die vertikale Ausrichtung zueinander, `--ncss-split-media-width` auf `.ncss-split-media` für ein asymmetrisches Breiten-Verhältnis statt 50/50 |
| `tile.css` | `.ncss-tile` (+ `--muted`/`--brand`/`--brand-2`) | Volle-Breite Farbflächen-Sektionen zum Gliedern einer langen Seite (bekannt aus UIkit, `uk-tile-*`). `--brand`/`--brand-2` kippen automatisch auf hellen Text - weiße Flächen darin (`.ncss-card`, `<pre>`) werden automatisch wieder auf normalen dunklen Text zurückgesetzt. Ohne weiteres Zutun bleibt eine Tile innerhalb ihres Containers - für volle Bildschirmbreite bis zum Bildschirmrand zusätzlich `.ncss-full-bleed` kombinieren. Padding über `--ncss-tile-padding-block`/`-inline` parametrisierbar (Default `--ncss-space-2xl`/`-lg`) |
| `accordion-split.css` | `.ncss-accordion-split-container`, `.ncss-accordion-split`, `-list`, `-item`, `-body`, `-media`, `-media-mobile` | "Transformierendes Akkordeon" (bekannt von apple.com) - Text-Akkordeon links, dazugehöriges Bild rechts wechselt automatisch mit dem geöffneten Punkt. Komplett nativ, kein JS: exklusives Öffnen über `<details name="...">` (Baseline seit September 2025), Bildauswahl über `:has()`. `name` muss pro Instanz eindeutig sein. Unterstützt bis zu 6 Punkte. Jedes Medium steht zweimal im Markup (Desktop-Spalte + `.ncss-accordion-split-media-mobile`-Kopie fürs Stapeln) - ohne JS lässt sich ein DOM-Knoten nicht zwischen zwei Containern verschieben, dieselbe URL wird trotzdem nur einmal geladen |
| `marginnote.css` | `.ncss-marginnote-container`, `.ncss-marginnote-layout`, `.ncss-marginnote-start`/`-end` | Randnotizen (bekannt von Tufte CSS) - Bild ODER Text bricht aus der Textspalte aus, landet aber neben dem Fließtext statt am Bildschirmrand. 3-Spalten-CSS-Grid (Rand/Text/Rand), Textspalte deckelt bei `--ncss-container-max-narrow`. Nutzt CSS Grids Auto-Placement: eine `-end`-Notiz DIREKT NACH ihrem Absatz im Markup landet automatisch auf gleicher Zeilenhöhe daneben, eine `-start`-Notiz entsprechend DIREKT DAVOR (die beiden Randspalten verhalten sich beim Auto-Placement nicht symmetrisch). Springt erst ab 60rem Grid-Breite in die Randspalte, darunter normaler Block im Textfluss |
| `slideshow.css` | `.ncss-slideshow`, `-track` (+ `--no-scrollbar`), `-item` (+ `--peek`) | Scroll-Snap-Karussell, kein JS nötig |
| `sparkline.css` | `.ncss-sparkline`, `-area`, `-dot` (+ `--success`/`--danger`) | Kleine Inline-Datenlinie. Koordinaten von Hand ODER per `components/sparkline.js` (opt-in) aus `data-values="4,7,3,9"`/`data-src="werte.json"` berechnet - erzeugt zusätzlich eine visuell versteckte, für Screenreader lesbare `<table>` mit den echten Werten daneben, das SVG selbst bleibt rein dekorativ (`aria-hidden`) |
| `scroll-progress.css` | `.ncss-scroll-progress` (+ `--vertical`, `--end`) | Lesefortschrittsbalken, `animation-timeline: scroll()`. Farbe/Verlauf brauchen keine eigene Klasse - `.ncss-gradient-brand`/`-subtle` oder `.ncss-surface--brand-2`/`-neutral` direkt dazu kombinieren (`background-image` malt sich über das eigene `background-color`). `--vertical` (+ optional `--end` für die rechte statt linke Kante) für einen seitlichen statt oberen Balken |
| `scroll-stack.css` | `.ncss-stack-section`, `.ncss-stack-stage`, `.ncss-stack-card` | EINE Vollbild-Sektion (`.ncss-stack-section`, Höhe = `--ncss-stack-count` × 100lvh), in der eine gepinnte Bühne (`.ncss-stack-stage`, `position:sticky; top:0; height:100lvh`) Karten enthält, die beim Scrollen INNERHALB dieser einen Sektion übereinander gleiten und sich zu einem gefächerten Stapel aufbauen (klassisches "Pinned Scrollytelling"-Muster) - anders als `.ncss-snap-sections` (jede Sektion bekommt ihren eigenen Scroll-Abschnitt, siehe oben). Baseline OHNE Scroll-Animation: alle Karten liegen von Anfang an fertig gefächert da (`--ncss-stack-index` pro Karte, per Inline-Style gesetzt, steuert den `translateY`-Fächer-Versatz). Mit `view-timeline`-Unterstützung (aktuell nicht Baseline, `@supports`-abgesichert) bekommt jede Karte per benannter View-Timeline (`view-timeline-inset: 100lvh` beschneidet die Default-Entry-/Exit-Polsterung, sonst läge 0%/100% eine Bildschirmhöhe vor/nach der eigentlich gepinnten Phase) + `animation-range` (beginnt AN der eigenen Kartenscheibe, nicht darum zentriert) eine Zwei-Scheiben-Spanne zugewiesen - dadurch bleibt sie flach/unverzerrt, solange sie die aktuell sichtbare ist, und kippt per 3D-Transform erst zurück, WÄHREND die nächste Karte sie bedeckt (kein `opacity`-Fade - eine bereits blickdichte Karte, die zusätzlich langsam einblendet, ließ die darunterliegende unschön durchscheinen, per Screenshot-Review gefunden). Tokens: `--ncss-stack-count` (MUSS pro Sektion gesetzt werden, keine Vorgabe), `--ncss-stack-card-width` (`min(90vw, 40rem)`), `--ncss-stack-card-height` (60vh), `--ncss-stack-fan` (1.25rem, Versatz pro Karte), `--ncss-stack-perspective` (1200px), `--ncss-stack-radius` (`--ncss-radius-lg`), `--ncss-stack-scale`/`-depth`/`-tilt`/`-brightness` (Rückweich-Optik). Auf `--ncss-stack-card-height: 100lvh`/`-card-width: 100%`/`-fan: 0px` umgestellt ergibt eine kinoartige Vollbild-Variante ganz ohne Modifier-Klasse - dabei zusätzlich `--ncss-stack-radius: 0` setzen (der Default `--ncss-radius-lg` rundet sonst genau an der Bildschirmkante sichtbar ab, User-Report: "die rundungen stoßen an die browser kante"). Modifier `.ncss-stack-section--horizontal` (auf der äußeren Sektion): dieselbe Bühne/Timeline-Mechanik, Fächer und Anfahrt laufen auf der X- statt der Y-Achse - Karten fächern sich seitlich auf, fahren von rechts herein, kippen beim Zurückweichen um `rotateY` statt `rotateX`. `--ncss-stack-stage-height` (Default 100lvh) und `--ncss-stack-stage-top` (Default 0px) machen die Bühne beliebig klein/verschoben statt zwingend vollbildgroß - z.B. eine Bühne in einem gewöhnlichen `.ncss-container` statt vollflächig, `--ncss-stack-stage-top` klebt dann unter der Topbar statt an der Bildschirm-Oberkante (`view-timeline-inset` beachtet dabei bewusst UNTERSCHIEDLICHE Start-/Endwerte - Start bleibt immer die echte Viewport-Höhe, das Ende richtet sich nach `--ncss-stack-stage-height`). Echter Fallback ohne `view-timeline`-Unterstützung (`@supports not (...)`, in echtem Firefox verifiziert, nicht nur simuliert): die komplette Pinning-/Absolut-Stapel-Mechanik wird abgeschaltet, Karten laufen stattdessen ganz normal im Fluss untereinander (`position:static`, kein Transform) - eine reine `translateY`-Fächerung als "Fallback" reichte NICHT, weil sie bei `--ncss-stack-fan: 0px` (Vollbild-Variante) alle Karten exakt deckungsgleich übereinanderlegte und nur die letzte sichtbar/erreichbar ließ. Der neue Fallback garantiert jede Karte einzeln sichtbar/scrollbar, unabhängig von `--ncss-stack-fan`/`-count` oder der `--horizontal`-Variante. Eigene Demo-Seite (`demo/stacked-cards.html`), bewusst getrennt von `demo/scroll-sections.html` - beide Demos kombiniert auf einer Seite (verschachtelter Scroll-Container plus mehrere `view-timeline`-Sektionen) machten die Seite unnötig komplex. Opt-in JS-Fallback für Browser ohne `view-timeline`-Unterstützung verfügbar (`components/scroll-stack-fallback.js`) - bringt das echte gepinnte Scroll-Stapel-Erlebnis auch dorthin, statt nur den garantiert funktionierenden, aber unanimierten `@supports not()`-Fallback zu zeigen, siehe [Web Awesome Bridge](#web-awesome-bridge) für Details |
| `roadmap.css` | `.ncss-roadmap`, `.ncss-roadmap-line`, `.ncss-roadmap-line-track`/`-progress` (zwei `<div>`s), `.ncss-roadmap-list`, `.ncss-roadmap-item`, `.ncss-roadmap-dot`, `.ncss-roadmap-card` | Meilenstein-Liste, verbunden durch eine ZWEIFARBIGE Linie: ein statischer, gedämpfter `-track` (immer voll sichtbar, `--ncss-color-border`) UND eine markenfarbene `-progress`-Linie darüber, die sich beim Scrollen selbst "nachzeichnet" (per `scale` von `1 0` auf `1 1`, `transform-origin: top`, `animation-timeline: view(block)`) - dieselbe Technik wie `scroll-progress.css`, nur vertikal statt horizontal. Bewusst ZWEI Linien statt einer: eine einzige, einfarbige Linie machte den Zeichen-Effekt kaum sichtbar - der "noch nicht gezeichnete" Teil ist unsichtbar und verschmilzt mit dem Seitenhintergrund, der Fortschritt selbst blieb dadurch praktisch unbemerkbar (User-Feedback: "das stimmt nicht und ist eigentlich sinnfrei ... jetzt ist sie einfach durchgezogen"). Der Farbkontrast macht den Fortschritt jetzt wie ein klassischer (nur vertikaler) Fortschrittsbalken sichtbar. ZWEITER technischer Anlauf: ursprünglich ein `<svg>` mit zwei `<line>`s, per `stroke-dasharray`/`-dashoffset` gezeichnet - sah in Chromium UND Playwright-WebKit korrekt aus, blieb aber in ECHTEM Safari 26 als reine statische Linie ohne sichtbare Animation stehen (User: "in chrome geht es" / "jetzt is es nur ne blaue linie" in Safari, in Playwright-WebKit NICHT reproduzierbar). `stroke-dashoffset` ist eine Paint-Eigenschaft (erzwingt Neuzeichnen der SVG-Geometrie bei jeder Änderung), `scale`/`transform`/`opacity` sind dagegen compositor-freundlich und über `view()`-Timelines engineübergreifend zuverlässiger animierbar - die reine `<div>`+`scale`-Lösung ist dadurch nicht nur robuster, sondern auch einfacher (kein SVG, kein `pathLength`, kein `vector-effect` mehr nötig). KEIN Pinning wie bei `scroll-stack.css` - Meilensteine laufen ganz normal im Fluss, nur die Progress-Linie (und jede `.ncss-roadmap-card` selbst, dezent per `animation-range: entry`) reagiert auf die eigene Scroll-Position. `animation-range: contain` (NICHT der Default `cover`) für die Progress-Linie - `cover` verlangt, dass die Linie vollständig über den oberen Bildschirmrand hinauswandert, bevor 100% erreicht ist; steht die Roadmap wie üblich kurz vor dem Footer (kein Scroll-Puffer danach), reicht der tatsächlich vorhandene Rest-Scrollweg dafür NICHT aus (per echtem `document.body.scrollHeight`-Test gefunden: blieb bei ca. 73% hängen). `contain` ist dagegen exakt fertig gezeichnet, sobald die letzte Karte voll sichtbar wird - über mehrere Viewport-Größen getestet konstant `0` bei Seitenaufruf, konstant `1` bei maximalem Scroll. EIN Versuch, den spürbar steilen Anstieg (Feedback: "geht zu schnell ans ende") durch einen früheren Start (`cover 0% contain 100%`, zwei verschiedene benannte Bereiche gemischt) zu glätten, wurde WIEDER VERWORFEN - je nach Viewport-Geometrie landete der Fortschritt beim Laden zwischen 17% und 65% vorgezeichnet statt konstant bei 0%, in der Praxis nicht mehr als sichtbarer Fortschritt wahrnehmbar (User-Report: "in beiden browsern nur eine durchgezogene linie"). Ein Pacing-Fix müsste innerhalb DESSELBEN benannten Bereichs bleiben (z.B. `contain -X% contain 100%`), nicht zwei verschiedene Bereiche kombinieren - noch nicht umgesetzt. Baseline ohne `animation-timeline: view()`-Unterstützung: Progress-Linie ist einfach von Anfang an vollständig gezeichnet (kein `scale` gesetzt) und deckt den Track komplett ab - Ergebnis ist eine durchgehend markenfarbene Linie, Karten immer sichtbar, kein Fehlerzustand. Tokens: `--ncss-roadmap-gutter` (2.5rem, Platz für Linie+Punkte), `--ncss-roadmap-line-width` (2px), `--ncss-roadmap-line-color` (Progress-Farbe, `--ncss-color-brand`), `--ncss-roadmap-track-color` (`--ncss-color-border`), `--ncss-roadmap-dot-size` (0.75rem), `--ncss-roadmap-dot-color` (`--ncss-color-brand`), `--ncss-roadmap-gap` (`--ncss-space-xl`). WICHTIG: `.ncss-roadmap-list` setzt `padding-inline-start: 0` explizit - base.css gibt JEDEM `ul`/`ol` per Default ein eigenes `padding-inline-start` (Listen-Einzug), das sonst zusätzlich zum eigenen Gutter nach rechts schiebt und die Punkte sichtbar neben statt auf der Linie platziert. Demo: `demo/roadmap.html` |
| `placeholder.css` | `.ncss-placeholder` (+ `--surface`) | Grauer Platzhalter für Demo-/Prototyp-Inhalte |
| `hero.css` | siehe [Medien](#medien-bildvideoaudio) | Bild-Hintergrund-Sektion mit Inhalt obenauf, optional Parallax |
| `footer.css` | `.ncss-footer`, `-inner`, `-bottom` | Seitenfuß-Grundgerüst |
| `effects.css` | `.ncss-glow-border`, `.ncss-glow-pulse`, `.ncss-glass`, `.ncss-stamped`, `.ncss-grain` | Rein dekorativ, bewusst optional (Zusatzklassen, kein Bestandteil von `.ncss-card`/`-btn`). `.ncss-glow-border` zeichnet einen rotierenden `conic-gradient()`-Ring über ein `::before` mit `mask-composite: exclude` (echtes "Loch" in der Mitte, kein Wrapper-Element nötig) - der Winkel läuft über eine per `@property` typisierte `<angle>`-Custom-Property (`--ncss-glow-angle`), sonst wäre die Rotation nur diskret statt interpoliert. `.ncss-glow-pulse` pulsiert per `box-shadow`, unabhängig kombinierbar. `.ncss-glass` ist Glassmorphism (`backdrop-filter: blur() saturate()`, `@supports`-abgesichert). **NICHT auf ein Element mit einer Floating-UI-Komponente als Nachfahre setzen** (`<wa-dropdown>`/`<wa-popover>`/o.ä., typischerweise intern `position:fixed` relativ zum Viewport) - `backdrop-filter` erzeugt per Spec einen neuen Containing Block für `position:fixed`-Nachfahren, das Popup zuckt dann beim Scrollen (per echtem Test an `demo/landing.html` gefunden). Stattdessen als eigenes dekoratives Element (absolut positioniert, negativer `z-index`) VOR dem eigentlichen Inhalt platzieren, siehe `.landing-topbar-backdrop` in `demo/landing.html`/`landing.css`. `.ncss-stamped` zeichnet einen hauchdünnen, zweifarbigen "gravierten" Rahmen (dieselbe Masken-Ring-Technik wie `.ncss-glow-border`, diagonal dunkel-zu-hell statt rotierendem Verlauf) - keine eigene Hintergrundfarbe nötig, funktioniert auf jeder Fläche inkl. reinem Weiß. Hebt sich beim Hover an, sinkt bei `:active` tiefer ein; `.ncss-stamped--press` zusätzlich kehrt das Hover-Verhalten um (sinkt statt sich zu heben). Ringfarbe ist halbtransparent und blendet sich per Alpha-Compositing automatisch mit JEDER darunterliegenden Fläche, auch mit `.ncss-btn`-Varianten - nur die Eckenform übernimmt `.ncss-stamped` NICHT automatisch (eigener Default `--ncss-radius-lg`), beim Kombinieren `--ncss-stamped-radius` explizit auf den Wert der anderen Komponente setzen. `.ncss-grain` legt ein feines `<feTurbulence>`-Rauschen (SVG data-URI, kein Bild-Asset) per `::after` + `mix-blend-mode` über die Fläche - Default `overlay` verhält sich wie `multiply`/`screen` auf sehr dunklen/hellen Flächen und bleibt dort bei der Standard-Deckkraft (0.12) praktisch unsichtbar; auf sehr dunklen/gesättigten Flächen (z.B. `.ncss-surface--brand-2`) `--ncss-grain-opacity` deutlich erhöhen oder auf `--ncss-grain-blend: soft-light` wechseln. Demo: `demo/effects.html` |
| `code-block.css` | `.ncss-code-copy` | Syntax-Highlighting + Copy-to-Clipboard für `<pre><code class="language-*">`-Beispiele. Bridged selbst gehostetes [Prism.js](https://prismjs.com) (`vendor/prismjs/`, kein CDN) auf dieselben ncss-Farbtokens, die auch Buttons/Badges nutzen (`--ncss-color-brand`/`-success`/`-warning`/`-danger`/`-brand-2` für die jeweiligen Token-Klassen) - kein zweites, eigenständiges Highlighting-Theme, zieht automatisch mit `theme.css` um. Opt-in (nur auf Seiten mit Code-Beispielen einbinden): `window.Prism = { manual: true }` VOR `vendor/prismjs/prism-core.min.js` setzen (sonst highlightet Prism beim `DOMContentLoaded` unkontrolliert selbst schon, ohne Copy-Button), dann die gebrauchten Sprachkomponenten (`prism-markup`, `prism-css`, `prism-clike` + `prism-javascript`, ...) laden, zuletzt `dist/components/code-block.js` - ruft `Prism.highlightAll()` selbst auf und injiziert den Button. `.ncss-icon-copy`/`-check` (`helpers/icons.css`) fürs Icon. Läuft auch ohne Prism (nur Copy-Button, unhighlighted). Demo: jede Doku-Seite, `demo/theming.html`, `demo/guides.html` |

## Termine & Downloads (Widgets)

Datengetriebene Widgets als native HTML-Alternative zu iframe-Einbettung (z.B. eines
externen Kalender- oder Datei-Browser-Widgets) - durchsuchbar, per CSS themebar, kein
Cross-Origin-/Höhenproblem. Optisch/token-kompatibel mit Web Awesome (nutzt dieselben
ncss-Farbtokens wie `webawesome-bridge.css`), aber KEIN `<wa-*>`-Custom-Element - reines
Vanilla-JS + native ncss-Klassen, funktioniert auch ohne Web Awesome auf der Seite. Alle
drei Dateien sind opt-in, nur auf Seiten einbinden, die sie wirklich nutzen:

```html
<script src="components/ics.js" defer></script>      <!-- nur nötig für data-ics -->
<script src="components/events.js" defer></script>
<script src="components/downloads.js" defer></script>
```

**`events.js`**: EIN Lade-/Render-Motor für vier Ansichten statt vier getrennter
Komponenten (Kalender, Kalender-Liste, Termin-Liste, Einzeltermin sind derselbe
normalisierte Termin-Datentyp, nur andere Darstellung):

```html
<div class="ncss-events" data-view="month" data-src="events.json"></div>
<div class="ncss-events" data-view="agenda" data-ics="kalender.ics" data-limit="8"></div>
<div class="ncss-events" data-view="list" data-src="events.json" data-limit="6"></div>
<div class="ncss-events" data-view="single" data-src="events.json" data-event-id="evt-3"></div>
```

| `data-view` | Darstellung |
|---|---|
| `month` | Monatsraster (`<table>`), Termine als Punkte im Tag, Klick öffnet den Tag als `.ncss-modal` (Wiederverwendung der bestehenden Modal-Komponente statt eigener Dialog-Optik) |
| `agenda` | Anstehende Termine, nach Monat gruppiert - "Kalender-Liste" |
| `list` | Termine als Karten-Raster (`.ncss-card`, kein eigenes Karten-Layout) |
| `single` | Ein hervorgehobener Termin (`data-event-id` oder ohne Angabe der nächste anstehende) |

Weitere Attribute: `data-limit` (max. Anzahl in agenda/list), `data-month`
(Start-Monat der Monatsansicht, `"YYYY-MM"`), `data-window-months` (wie weit eine
unbegrenzte ICS-`RRULE` ohne `COUNT`/`UNTIL` vorausberechnet wird, Default 18),
`data-week-start` (Wochenstart-Tag im Monatsraster, `0`=Sonntag..`6`=Samstag - Default
richtet sich nach `lang`: Montag für `de`, Sonntag für `en`).

**Datenquelle, zwei Optionen** (beide ergeben denselben internen Termin-Datentyp):
- `data-src`: JSON-Array, jedes Element `{id?, title, start, end?, allDay?, location?,
  description?, url?}` - `start`/`end` als ISO-8601-String (`"2026-09-01"` ganztägig,
  `"2026-09-01T09:00"` mit Uhrzeit, ohne Zeitzonen-Suffix = lokale Wanduhrzeit).
- `data-ics`: eine `.ics`-Datei (Google-/Outlook-/Apple-Kalender-Export), geparst von
  `components/ics.js` (eigener, abhängigkeitsfreier RFC-5545-Parser statt eines npm-
  Pakets wie ical.js - passt zu "kein Build-Schritt, selbst gehostet"). Abgedeckt:
  `VEVENT` (`UID`/`SUMMARY`/`DTSTART`/`DTEND`/`LOCATION`/`DESCRIPTION`/`URL`), Zeilen-
  Unfolding, Wert-Escaping, ganztägige Termine, UTC-Zeiten. `RRULE`-Teilmenge:
  `FREQ=DAILY/WEEKLY/MONTHLY/YEARLY`, `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY` (einfache
  Wochentags-Liste), `EXDATE` - deckt die weit überwiegende Mehrheit realer
  wiederkehrender Termine ab. NICHT abgedeckt: `TZID`-Zeitzonenkonvertierung (Zeiten ohne
  `Z`-Suffix werden als lokale Wanduhrzeit übernommen), `BYMONTHDAY`/`BYSETPOS`/
  `BYWEEKNO`, `RECURRENCE-ID`-Ausnahmen jenseits von `EXDATE`.

**`downloads.js`**: Datei-Download-Liste aus JSON.

```html
<div class="ncss-downloads" data-src="downloads.json"></div>
```

JSON-Array, jedes Element `{title, url, size?, type?, description?}` - `type`
(Dateiendung ohne Punkt, z.B. `"pdf"`) wird ohne Angabe aus der `url`-Endung
abgeleitet, `size` (Bytes) wird ohne Angabe einfach nicht angezeigt.

Demo mit allen vier Ansichten + Downloads + Beispieldaten (JSON und `.ics`):
`demo/widgets.html`.

## `<ncss-container>` - ncss isoliert in einer fremden Seite

`components/ncss-container.js` kapselt ncss-Inhalte in einem echten Shadow-DOM-Baum, um
sie innerhalb eines FREMDEN Frameworks/CSS-Systems (Bootstrap, UIkit, Tailwind, ein
CMS-Theme, ...) laufen zu lassen, ohne dass Styles in beide Richtungen durchsickern.

```html
<script src="components/ncss-container.js" defer></script>
<ncss-container src="dist/ncss.css">
  <div class="ncss-card">
    <div class="ncss-card-body">Isolierter Inhalt</div>
  </div>
</ncss-container>
```

- `src` (Pflicht, ODER `data-ncss-src` auf dem Loader-`<script>` als Seiten-Default):
  Pfad zu `ncss.css`, ganz normaler `<link>`, keine ncss-Sonderregel.
- `theme` (optional): zusätzliches Stylesheet, NACH `src` geladen - für einen Container
  mit einer ANDEREN Markenfarbe/Radien/Schrift als die restliche Seite.

**Zwei technische Voraussetzungen, beide bereits erfüllt:**

1. **Token-Isolation**: ncss' Tokens sind in `colors.css`/`tokens.css`/`theme.css`/
   `webawesome-bridge.css` bewusst als `:root, :host { ... }` deklariert (statt nur
   `:root`) - `:root` trifft IMMER das echte Seiten-Wurzelelement, niemals einen Shadow
   Host; `:host` dagegen NUR den Host-Knoten eines Shadow-Trees und ist außerhalb eines
   Shadow-Trees wirkungslos. Dieselbe Datei liefert dadurch, unverändert, eine komplett
   EIGENSTÄNDIGE Token-Kopie, sobald sie in einem Shadow Root statt am Seiten-`<head>`
   geladen wird - keine zweite, duplizierte Token-Datei, kein Build-Schritt. Per echtem
   Test bestätigt: ein `.ncss-btn--primary` im Container zeigt die korrekte Markenfarbe,
   OBWOHL die Host-Seite selbst gar kein ncss geladen hat und `--ncss-color-brand` an
   ihrem eigenen Wurzelelement überhaupt nicht existiert.
2. **Inhalts-Isolation**: der eigene Inhalt wird NICHT per `<slot>` eingebunden, sondern
   beim Verbinden EINMALIG per JS in den Shadow Root VERSCHOBEN (echte
   `appendChild`-Umhängung). Ein `<slot>` würde die Kind-Elemente nur im Shadow Root
   ANZEIGEN - sie blieben aber Teil des LIGHT DOM und dadurch weiterhin von den globalen
   Stylesheets der äußeren Seite getroffen (z.B. ein Framework-Reset wie `button { ... }`
   oder `!important`-Regeln). Per echtem Test bestätigt: ein `<slot>`-basierter Button
   übernahm eine äußere `!important`-Regel unverändert, ein per Verschieben
   eingebetteter Button blieb komplett unberührt. Kehrseite: kein automatisches
   Nachziehen bei späteren dynamischen DOM-Änderungen am Original-Markup (für einen
   fertig eingebetteten Inhaltsblock kein praktischer Nachteil).

Bidirektional getestet (`demo/uikit-integration.html`, eine komplette Seite auf
[UIkit 3](https://getuikit.com) mit einem `<ncss-container>` samt Stacked Cards mitten
drin): UIkits `button`/`h1`-`h6`-Reset erreicht den Container nicht, ncss' eigener Reset
(`* { margin: 0 }` u.a.) beeinflusst UIkit-Inhalt vor/nach dem Container nicht - auch
scroll-gekoppelte Effekte (`position:sticky`, `animation-timeline: view()`, siehe Stacked
Cards) funktionieren normal über die Shadow-Grenze hinweg, das ist reine Layout-/
Rendering-Mechanik, von der DOM-/Style-Kapselung unberührt.

**Alle opt-in JS-Scripts sind Shadow-DOM-fähig**: `code-block.js`, `events.js`,
`downloads.js`, `scroll-stack-fallback.js`, `hide-on-scroll-fallback.js` und
`wa-close-on-scroll.js` suchen ihre Elemente NICHT mehr per einfachem
`document.querySelectorAll(...)` (durchquert Shadow-Grenzen standardmäßig nicht), sondern
per `deepQueryAll()` - steigt rekursiv in jeden offenen Shadow Root ab (also auch in jeden
`<ncss-container>`) und verhält sich ohne Shadow DOM auf der Seite exakt wie
`querySelectorAll`. `code-block.js` ruft dafür zusätzlich `Prism.highlightElement()` pro
gefundenem Block statt des document-globalen `Prism.highlightAll()` auf. Einbindung
IMMER gleich, egal ob mit oder ohne `<ncss-container>` - einfach das jeweilige Script
wie gewohnt auf der Seite laden (per `<script defer>`, nicht zusätzlich pro Container),
es findet seine Elemente unabhängig davon, ob sie in einem Shadow Root stecken. Einzige
Ausnahme: `wa-close-on-scroll.js` läuft bei jedem Scroll-Event und sucht deshalb GEZIELT
nur innerhalb `<ncss-container>`-Elementen statt eines vollen DOM-Walks (Performance),
zusätzlich jetzt per `requestAnimationFrame` gedrosselt.

## Web Awesome Bridge

`webawesome-bridge.css` mappt Web Awesomes `--wa-color-{familie}-{fill|border|on}-
{quiet|normal|loud}`-Variablen auf dieselben ncss-Farbtokens, damit z.B. `<wa-button>` und
`.ncss-btn` optisch zusammenpassen, statt zwei getrennte Paletten zu pflegen. Selbst
gehostetes Web Awesome/Font Awesome liegt unter `vendor/`. Erfordert:

- Laden über einen echten HTTP-Server (Web Awesome ist ES-Module-basiert, funktioniert
  nicht über `file://`).
- `data-webawesome="<pfad>"` auf dem Loader-`<script>`, sonst verdoppelt sich der
  Basis-Pfad bei relativem `src`.

**Formular-Text auf farbigen Flächen** (`.ncss-surface--brand/-brand-2/-neutral`,
`.ncss-gradient-brand`, `.ncss-text-light`/`-dark`): Ein `<wa-input>`/`<wa-textarea>`/
`<wa-select>`/`<wa-checkbox>`/`<wa-radio>`/`<wa-switch>` rendert Label/Wert/Hinweistext im
eigenen SHADOW DOM - `color:#fff` auf einem Light-DOM-Vorfahren erreicht das nicht (Bug per
echtem Test gefunden, User-Report: "E-Mail-Adresse schwarz auf blau" in der Newsletter-
Sektion von `demo/landing.html`). Der naheliegende Fix (nur die Basis-Bridge-Tokens
`--wa-color-text-normal`/`-quiet` oben auf `currentColor` umbiegen) greift NICHT: Web
Awesomes eigene `--wa-form-control-label-color`/`-value-color`/`-hint-color` (siehe
`vendor/webawesome/dist-cdn/styles/themes/default.css`, "Form Controls") sind selbst
`var(--wa-color-text-normal)` - aber Custom Properties lösen `var()`-Referenzen INNERHALB
ihres eigenen Werts am Ort ihrer EIGENEN Deklaration auf (hier: einmalig an `:root`), nicht
erneut an jedem Verwendungsort. Das Ergebnis ist ein fertiger, eingefrorener Wert, der ab da
nur noch unverändert weitervererbt wird - ein `--wa-color-text-normal`, das auf einem
Nachfahren neu gesetzt wird, kommt für diese bereits eingefrorenen Tokens zu spät. Der echte
Fix (in `webawesome-bridge.css`) deklariert `--wa-form-control-label-color`/`-value-color`/
`-hint-color`/`-required-content-color` DIREKT auf `.ncss-surface--brand/-brand-2/-neutral`,
`.ncss-gradient-brand`, `.ncss-text-light`, `.ncss-text-dark` als `currentColor` - direkte
Verwendungen von `--wa-color-text-normal` selbst (nicht über eine solche Zwischenstufe) sind
von diesem Effekt nicht betroffen, die einmalige `:root`-Bridge bleibt dafür ausreichend.

**`components/wa-close-on-scroll.js`** (opt-in, nur auf Seiten mit `<wa-dropdown>`/
`<wa-popover>` einbinden): Web Awesomes Popup-Baustein hält ein offenes Panel absichtlich
während des Scrollens am Anker positioniert - sitzt der Anker in einer
`position:sticky`-Kopfleiste, kann das sichtbar glitchen (u.a. ein lange dokumentierter
iOS-Safari-Bug bei Z-Index-Reihenfolge rund um `position:fixed` beim Scrollen, keine
per CSS behebbare Ursache). Das Script schließt jedes offene Panel, sobald gescrollt
wird, statt gegen die Neupositionierung anzukämpfen - dasselbe Muster wie bei den
meisten Mega-/Dropdown-Menüs anderer Sites.

**`components/hide-on-scroll-fallback.js`** (opt-in, nur auf Seiten mit
`.ncss-hide-on-scroll` einbinden, die auch in Firefox/Safari funktionieren sollen):
`.ncss-hide-on-scroll` (helpers/scroll.css) ist rein CSS-basiert nur in Chromium aktiv
(`container-type: scroll-state`, Stand August 2026 kein Firefox-/Safari-Termin bekannt).
Ein CSS-only-Fallback wurde gebaut UND getestet, hatte aber einen echten, per
Playwright-WebKit reproduzierten Bug (SKILL.md Landmine 26: eine typisierte `calc()`-Kette
löste sich in WebKit falsch auf, der Header blieb nach Hochscrollen dauerhaft versteckt).
Dieses Script ist die klassische, zuverlässige Alternative: prüft selbst per
`CSS.supports("container-type", "scroll-state")`, ob die native Technik bereits greift
(dann tut es NICHTS, kein doppelt arbeitender Mechanismus), sonst ein einfacher,
`requestAnimationFrame`-gedrosselter Scroll-Listener, der dieselbe `translate`-Eigenschaft
setzt, die auch die CSS-Variante nutzt (eine gemeinsame `transition` in helpers/scroll.css
sorgt für dieselbe weiche Animation, unabhängig vom Auslöser). Über mehrere Runter-/
Hoch-Scroll-Zyklen in echtem Chromium/WebKit/Firefox verifiziert, kein Hängenbleiben.

**`components/scroll-stack-fallback.js`** (opt-in, nur auf Seiten mit
`.ncss-stack-section` einbinden, die auch in Firefox/älterem Safari das echte
gepinnte Scroll-Stapel-Erlebnis zeigen sollen statt nur des garantiert funktionierenden,
aber unanimierten `@supports not()`-Fallbacks): prüft selbst per `CSS.supports
("view-timeline-name", "--ncss-stack-progress")`, ob die native Technik bereits greift
(dann tut es NICHTS), respektiert `prefers-reduced-motion: reduce` genau wie die native
CSS-Variante. Baut dieselbe Bühnen-/Absolut-Stapel-Struktur wie der native
`@supports(view-timeline-name)`-Block manuell nach (Klasse `.ncss-stack-js-active`, per
JS gesetzt, in `components/scroll-stack.css` mit passender CSS hinterlegt) und berechnet
den Scroll-Fortschritt jeder Sektion/Karte direkt aus `getBoundingClientRect()` statt
`animation-timeline` - dieselbe `view-timeline-inset`-Formel wie die native CSS-Variante
von Hand nachgerechnet (per Soll/Ist-Vergleich gegen ECHTES natives Chromium-Rendering an
mehreren Scroll-Positionen kalibriert, nicht nur aus der Spec-Beschreibung abgeleitet -
ein erster Versuch nahm fälschlich an, der 0%-Punkt läge immer bei `rect.top === 0`,
stimmte nur zufällig für die Vollbild-Variante, siehe SKILL.md für die Herleitung). Nach
Kalibrierung: Skalierung/Rotation/Helligkeit stimmen zwischen echtem Firefox (Script) und
echtem Chromium (nativ) bis auf Rundungsfehler überein, per Screenshot UND
`getComputedStyle().transform`-Vergleich bestätigt - für alle drei Struktur-Varianten
(Vollbild, `--horizontal`, kleine Bühne in einem Container mit eigenem `--ncss-stack-
stage-top`-Versatz).

## Produktseite (`demo/product.html`)

Die eigentliche NativeCSS-Seite (an https://skerbis.github.io/nativecss/ als Site-Wurzel
deployed, siehe [Architektur](#architektur) für den GitHub-Actions-Rewrite-Mechanismus) -
dogfooded mit
NativeCSS selbst: Hero, Vorteils-Karten, eine Vollbild-`.ncss-stack-section` als
Feature-Showcase (5 Karten), vollständige Feature-Übersicht, Code-Beispiele, Tailwind-/
UIkit3-Vergleichstabellen, ein "Kompatibilität"-Abschnitt (welche Features `@supports`-
Fallbacks bzw. opt-in JS-Fallbacks haben, welche drei Engines während der Entwicklung
getestet werden - siehe [Touch-Geräte & mobile Viewports](#touch-geräte--mobile-viewports)
für dasselbe Prinzip im Detail), CTA. Nutzt `theme.css` (siehe oben) mit einer eigenen Marke
(gedämpftes Grau `#6f6f6e` als `--ncss-color-brand`, dunkles Navy `#314164` als
`--ncss-color-brand-2`, kräftiges Blau `#3399ff` als `--ncss-color-bg` - bewusst KEINE
fast-weiße Fläche, sondern eine "farbige Leinwand + weiße Inhalts-Karten"-Optik). Topbar
nutzt `.ncss-hide-on-scroll` (blendet beim Runterscrollen aus, beim Hochscrollen wieder
ein) UND `.ncss-glass` (als separates Backdrop-Element, nicht direkt auf dem Nav-
Container - Fallstrick 21).

**Landmine-Serie beim Bauen dieser Seite** (mehrere Runden echten User-Feedbacks, jede
einzeln per Screenshot/Playwright verifiziert, nicht nur angenommen):
- Weiß auf reinem `#3399ff` liegt bei 2.94:1 (unter der 3:1-Mindestgrenze) - trotzdem auf
  Wunsch des Users NICHT künstlich verwässert (kein Scrim/keine Abdunklung mehr), Priorität
  liegt auf der reinen Markenfarbe statt einer Kontrast-Sicherheitsmarge.
- `.ncss-eyebrow`/`.ncss-text-muted` sind für Text auf weißen Karten kalibriert (1.71:1
  bzw. 2.18:1 direkt auf `#3399ff`, weit unter 4.5:1) - eigene, einzeln WCAG-geprüfte
  dunkle Navytöne für Sektionen, die direkt auf der Markenfarbe liegen.
- `.ncss-topbar` selbst bringt ein UNDURCHSICHTIGES `background-color:var(--ncss-color-
  surface)` mit - ein Glass-Backdrop-Element dahinter (per Fallstrick-18-Technik korrekt
  ÜBER der eigenen Elementfläche gemalt) blieb trotzdem unsichtbar, weil es nur über einer
  bereits weißen Fläche lag. Fix: die Eigenfläche der Topbar selbst transparent setzen.
- `.ncss-nav-list` ist EIN Element für Desktop-Inline-Nav UND Mobile-Off-Canvas-Panel
  (`display:contents` am `<dialog>`-Wrapper oberhalb 64rem lässt es direkt rendern,
  darunter wird derselbe `<dialog>` zum echten Off-Canvas mit eigener weißer Fläche) - ein
  pauschal erzwungener weißer Text traf BEIDE Fälle, im Off-Canvas-Panel dadurch weißer
  Text auf weißem Grund. Fix: die Farb-Erzwingung in dieselbe `@media (min-width: 64rem)`-
  Schwelle gepackt, die nav.css selbst für den Umschaltpunkt nutzt.
  `:hover`/`:focus-visible` GESONDERT geprüft und gefixt - nav.css setzt dort einen hellen
  `background-color:var(--ncss-color-bg-subtle)`, der mit demselben weißen Text erneut
  unlesbar wurde (eigener Fund, nicht durch den Basis-Fix automatisch mit erledigt).
- `.ncss-btn--secondary` (`color:var(--ncss-color-text)`, transparenter Hintergrund) ist
  für Text auf normaler Seitenfläche kalibriert - auf den farbigen Flächen dieser Seite
  blieb der dunkle Default-Text unlesbar, eigene helle Variante für Hero UND CTA-Sektion
  (nicht nur eine der beiden Stellen).
- `<ul>`-Listen ohne eigenes `list-style:none` zeigen ZUSÄTZLICH zu einem eigenen
  `::before`-Aufzählungspunkt weiterhin den nativen Browser-Bullet - sichtbar als zwei
  Punkte nebeneinander (base.css setzt `list-style:none` nur für `role="list"`).

## Demo-Seiten

Alle unter `demo/`, jede bindet `../dist/ncss.css` ein und trägt eigenes,
seitenspezifisches CSS mit `demo-*`-Präfix (nie in den ncss-Dateien selbst). Seiten-
eigene JS-Interaktionen (Theme-/Paletten-Umschalter, Live-Farbeditor, Formulare,
Sidebar-Umschalter der Doku-Website) liegen als externe Dateien unter
`demo/assets/js/`, per `<script src="...">` eingebunden - bewusst KEINE Inline-
`<script>`-Blöcke (CSP ohne `unsafe-inline` bräuchte sonst pro Seite gepflegte
Nonces). `dist/components/` bleibt reserviert für tatsächlich ausgelieferte,
wiederverwendbare ncss-Bibliotheksfeatures, nicht für Seiten-eigene Demo-Logik.

| Seite | Inhalt |
|---|---|
| `index.html` | Kitchen-Sink: die meisten Komponenten auf einer Seite |
| `product.html` | Produkt-/Marketingseite (an der Site-Wurzel deployed, siehe [Architektur](#architektur)) |
| `navigation.html` | Dropdown, verschachteltes Dropdown, Mega-Menü, Tree-Nav, Off-Canvas, Breadcrumb, Hide-on-Scroll |
| `forms.html` | Felder, Switch, Range |
| `media.html` | Video, Art Direction, Bilder, Hero-Sektion, Audio |
| `magazine.html` | Typografie-Showcase: Drop Cap, mehrspaltiger Text, Pull-Quote, Textumfluss |
| `scroll-sections.html` | Vollbild-Sektionen (section-für-section, "fullpage"-Muster), inkl. verschachteltem horizontalem Scroll-Snap |
| `stacked-cards.html` | Karten, die sich beim Scrollen INNERHALB einer einzigen gepinnten Vollbild-Sektion stapeln (kompakt gefächert, kinoartig Vollbild, horizontal) |
| `colors.html` | Alle Farbtokens, Karten-/Badge-/Button-Farbvarianten, Theme-/Paletten-Umschalter, Live-Farbeditor (freie `<input type="color">`-Regler statt fester Paletten) |
| `webawesome.html` | Web-Awesome-Komponenten im Zusammenspiel mit NativeCSS |
| `landing.html` | Realistische Beispielseite (NativeCSS + Web Awesome + Font Awesome) |
| `guides.html` | Nummerierte, aufgabenorientierte Anleitungen mit Live-Beispielen |
| `effects.html` | Glow-Border, Glow-Pulse, Glass, Stamped, Grain - die optionalen Effekt-Komponenten aus `effects.css` |
| `theming.html` | Wie `theme.css` funktioniert, live am Beispiel (eigenes Beispiel-Theme, andere Markenfarben/Radien/Schrift) |
| `widgets.html` | Termine & Downloads: alle vier Event-Ansichten (Monat/Agenda/Liste/Einzeltermin), JSON- und `.ics`-Datenquelle, Downloads-Widget |
| `uikit-integration.html` | `<ncss-container>` mitten in einer kompletten UIkit-3-Seite (self-hosted, `vendor/uikit3/`) - Stacked Cards vollständig isoliert, bidirektional getestet |

## Doku-Website

Neben den Demo-Seiten gibt es eine echte, strukturierte, zweisprachige (DE/EN) Doku-Website
nach Vorbild von [Bulma](https://bulma.io/documentation/)/[UIkit](https://getuikit.com) -
Sidebar-Navigation mit aktivem Zustand, Vor/Zurück-Links, eine Seite pro Thema statt einer
langen Sammelseite. Quelle unter `docs-src/`, generierte Ausgabe unter `docs/` (nicht
committed, siehe unten).

- **Kein npm/Bundler** - reines `node:fs`/`node:path`/`node:url`-Skript
  (`docs-src/build.mjs`), kein `package.json`. Bewusste Ausnahme vom sonst geltenden
  "kein Build-Schritt"-Prinzip: das betrifft die CSS-*Bibliothek* (`dist/ncss.css`), die
  Konsumenten einbinden, nicht das Build-Tooling der Doku-*Website* selbst - dasselbe
  Präzedenzbeispiel wie der bereits bestehende GitHub-Actions-Schritt, der die
  Root-`index.html` generiert (siehe [Architektur](#architektur)).
- **Struktur**: `docs-src/nav.json` (Sidebar-Gruppen/Seiten, DE+EN-Label pro Seite),
  `docs-src/strings.json` (UI-Textbausteine DE/EN), `docs-src/template.html` (Seitenrahmen:
  Topbar, Sidebar, Vor/Zurück, Footer), `docs-src/content/{de,en}/*.html` (reine
  Inhalts-Fragmente, kein Markdown-Parser - schon gültiges HTML, per `<!--DESC:
  ...-->`-Erstzeilen-Kommentar mit Meta-Description).
- **Build**: `node docs-src/build.mjs` liest Nav+Strings+Template, ersetzt
  `__PLATZHALTER__`-Strings per `.replaceAll()`, schreibt `docs/{de,en}/{slug}.html`. Löscht
  und erzeugt `docs/` bei jedem Lauf neu. `docs/index.html` ist ein rein clientseitiger
  `navigator.language`-Redirect mit statischem Fallback-Link.
- **Nicht committed**: `docs/` steht in `.gitignore` (generierter Output, wie die
  Root-`index.html`) - im CI-Deploy (`.github/workflows/pages.yml`) läuft `node
  docs-src/build.mjs` als eigener Schritt VOR dem Site-Zusammenbau, damit die Live-Seite
  immer frisch generierte Doku zeigt.
- **Navigation vereinheitlicht**: alle `demo/*.html`-Seiten und die Doku-Seiten teilen
  dieselbe Topbar-Nav-Struktur, inkl. eines "Handbuch"-Links zur neuen Doku. Der aktive
  Punkt wird über das native `aria-current="page"`-Attribut markiert - dafür gibt es jetzt
  eine ALLGEMEINE, wiederverwendbare Regel in `components/nav.css`
  (`.ncss-nav-item > a[aria-current="page"]` etc.), keine seitenlokale CSS. `demo/landing.html`
  ist bewusst NICHT über die generische Migration gelaufen (eigene `<wa-dropdown>`-basierte
  Nav mit eigenem JS-Handler) - dort wurde nur der neue Doku-Link von Hand ergänzt.

## Bekannte Grenzen (bewusste Kompromisse)

- **Eine per `color-mix()` abgeleitete Custom Property (z.B. `--ncss-color-brand-100`)
  wird nur EINMAL berechnet - dort, wo sie deklariert ist (`:root`, siehe `colors.css`) -
  und dann als fertiger Wert vererbt.** Ein tiefer im Baum lokal überschriebener Seed-Wert
  (`--ncss-color-brand`) lässt eine bereits vererbte Ableitung NICHT neu rechnen. Betrifft
  nur ein LOKAL (nicht auf `:root`) angewendetes Theme: Komponenten, die den Seed direkt
  nutzen (`.ncss-btn--primary`), reagieren korrekt; Komponenten, die die abgeleitete Skala
  nutzen (`.ncss-badge` über `-100`/`-on-soft`), bleiben bei der alten Farbe. Ein echtes
  `theme.css` auf `:root` (siehe [Theme anpassen](#theme-anpassen)) hat dieses Problem
  nicht - dort wird die ganze Skala frisch berechnet, weil `:root` die Deklarationsstelle
  selbst ist. Live demonstriert (inkl. der optisch sichtbaren Abweichung) in
  `demo/theming.html`.
- **`:modal` hört sofort auf zu matchen, sobald ein Dialog geschlossen wird - lange bevor
  die Fade-Transition optisch fertig ist.** Positionierung, die nur über das UA-
  Stylesheet an `:modal` hängt (native Zentrierung via `margin:auto`), bricht dadurch
  MITTEN in der eigenen Schließen-Animation weg (sichtbares "Wegfliegen" Richtung
  oben links). `.ncss-modal` deklariert `position:fixed; inset:0; margin:auto;` deshalb
  selbst und unbedingt, statt sich auf das UA-Stylesheet zu verlassen.
- **Flex-/Grid-Items werden per CSS-Spec automatisch "blockifiziert"** - ein deklariertes
  `display: inline`/`inline-block` auf einem DIREKTEN Kind von `.ncss-stack`/`-cluster`/
  `-grid`/`-flex` (alle `display:flex`/`grid`) rechnet der Browser zu `display: block` um,
  unabhängig davon, was die eigene Regel sagt - keine Kaskaden-Kollision, sondern ein
  Rechenschritt NACH der Kaskade ([offiziell in der Spec verankert](https://github.com/w3c/csswg-drafts/issues/4065),
  kein Bug, kein Opt-out vorgesehen). Betrifft konkret `.ncss-text-boxed` (braucht
  `display:inline`) - in einen normalen `<div>`-Wrapper stellen, nie direkt als Flex-/
  Grid-Kind. Das betrifft nicht nur offensichtliche Fälle wie `.ncss-stack` direkt: eine
  `.ncss-card-body`, die selbst `.ncss-stack`/`-cluster`/`-grid` trägt (verbreitetes
  Card-Muster, z.B. `<div class="ncss-card-body ncss-stack ncss-stack--tight">`), oder eine
  `.ncss-card--horizontal`/`--horizontal-end` (deren `.ncss-card-body` IMMER `display:flex`
  bekommt, siehe `components/card.css`) zählt genauso als Flex-Container. Eine reine, nicht
  zusätzlich mit `.ncss-stack`/`-cluster`/`-grid` kombinierte `.ncss-card-body` ist dagegen
  ein normaler Block-Container - `.ncss-text-boxed` funktioniert dort direkt, ohne
  Wrapper. Im Zweifel: `.ncss-text-boxed` immer in einen eigenen `<div>` stellen, kostet
  nichts und ist immer sicher. **Ausblick:** kein CSSWG-Vorschlag für ein Opt-out ist
  aktuell bekannt (Stand dieser Recherche) - der `<div>`-Wrapper bleibt die einzige
  Lösung, kein baldiger Wegfall in Sicht. `display: contents` löst es NICHT (entfernt die
  eigene Box komplett, `box-decoration-break` hat dann nichts mehr zu klonen).
- **`.ncss-card-media` rundet sich selbst nie** (`border-radius: 0`), damit
  `.ncss-placeholder` (eigene `border-radius: var(--ncss-radius-md)`) beim Kombinieren
  nicht alle vier Ecken der Media rundet - die Karte selbst (`overflow: clip` +
  optional `.ncss-radius-*`) übernimmt das Runden nur dort, wo die Media wirklich an eine
  echte Kartenecke stößt.
- **`.ncss-container--narrow` ist nur ein Modifier** (setzt ausschließlich `max-width`) -
  immer zusammen mit der Basisklasse verwenden (`class="ncss-container
  ncss-container--narrow"`). Allein verwendet fehlt die Zentrierung
  (`margin-inline:auto`), der Block klebt linksbündig, und ein darin verschachteltes
  `.ncss-full-bleed`-Kind bricht dann sichtbar schief aus.
- **Nie `*/` mitten in einem CSS-Kommentar schreiben** (z.B. `.ncss-radius-*/.ncss-shadow-*`
  in Prosa) - die Zeichenfolge beendet den Kommentar sofort dort, alles danach bis zum
  nächsten `*/` wird als echter (kaputter) CSS-Code geparst, und der Browser verwirft beim
  Fehler-Recovery oft die direkt folgende(n) Regel(n) komplett, OHNE Konsolenfehler (per
  echtem Test gefunden - `.ncss-card-container` verschwand dadurch spurlos). `-...` statt
  `-*` in Fließtext verwenden. Nach jeder Kommentar-Änderung mit Wildcard-Klassennamen:
  `grep -rn '\-\*/' *.css helpers/*.css components/*.css` sollte nichts finden.
- **Eine Utility aus `helpers/` kann eine gleichnamige Eigenschaft aus `components/` NICHT
  überschreiben, egal in welcher Reihenfolge die Klassen im `class`-Attribut stehen** -
  Cascade Layers werten nach LAYER-Reihenfolge aus, nicht nach Quelltext-/Attribut-
  Reihenfolge, und `components` steht nach `helpers` (siehe
  [Architektur](#architektur)). `class="ncss-card ncss-surface--brand"` behält z.B. den
  Hintergrund von `.ncss-card` (components), nicht den von `.ncss-surface--brand`
  (helpers) - für eine farbige Karte stattdessen die eigene Farbvariante der Komponente
  verwenden (`.ncss-card--brand`).

- **`initial-letter` (Drop Cap)** ist nicht Baseline (Firefox hat es nie ausgeliefert).
  Chrome/Edge unterstützen die unpräfixte Eigenschaft, Safari nur `-webkit-initial-letter`
  - NativeCSS deklariert beide. Ohne jede Unterstützung bleibt der erste Buchstabe schlicht
    normal groß, keine kaputte Darstellung.
- **`background-attachment: fixed`** wird bewusst NICHT für Parallax verwendet - auf iOS
  Safari seit jeher absichtlich deaktiviert (Performance). Stattdessen
  `animation-timeline: view()` (`.ncss-hero--parallax`), `@supports`-gegated.
- **Relative `url()`-Werte innerhalb einer Custom Property** lösen sich gegen die
  Basis-URL des Stylesheets auf, das die Property per `var()` KONSUMIERT - nicht gegen die
  Seite, die sie gesetzt hat. Deshalb wird `background-image` nie durch eine Custom
  Property gereicht, sondern immer direkt inline am Element gesetzt.
- **`.ncss-table-stacked`** bricht absichtlich die programmatische Tabellensemantik für
  Screenreader (Kompromiss der Technik selbst) - nur einsetzen, wenn der Inhalt wirklich
  wie eine Liste von Datensatz-Karten gelesen werden soll, sonst `.ncss-table-scroll`.
- **`display: grid-lanes`** (echtes zeilentreues Masonry) ist Stand jetzt nur in sehr
  aktuellen Browsern verfügbar - `.ncss-masonry` nutzt automatisch das
  spaltenbasierte CSS-Columns-Fallback, wenn `grid-lanes` fehlt.
- **Mega-Menü-Positionierung** dockt ohne CSS Anchor Positioning nicht automatisch an den
  Viewport-Rand an - `max-width` verhindert nur das Überlaufen, an sehr schmalen Fenstern
  kann der Trigger nicht mehr zentriert unter dem Menü liegen.
