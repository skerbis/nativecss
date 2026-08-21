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
- [Icons](#icons)
- [Komponenten](#komponenten)
- [Web Awesome Bridge](#web-awesome-bridge)
- [Demo-Seiten](#demo-seiten)
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

Dateistruktur:

```
ncss.css                  Import-Manifest (Layer-Reihenfolge + alle @import)
tokens.css                Design Tokens: Typografie, Abstand, Radius, Schatten, Bewegung
colors.css                Farb-Tokens (light-dark(), abgestufte Skalen)
reset.css                 Minimal-Reset
base.css                  Ungestylte native Elemente bekommen sinnvolle Defaults
browser-fixes.css         Isolierte Browser-/Engine-spezifische Workarounds
webawesome-bridge.css     Mappt ncss-Tokens auf Web Awesomes --wa-*-Variablen
helpers/                  Utility-Klassen (Layout, Typografie, Formulare, Medien, ...)
components/               Fertige Komponenten (Nav, Card, Modal, Badge, ...)
demo/                     Je eine Demo-Seite pro Themenbereich, siehe unten
vendor/                   Selbst gehostetes Web Awesome + Font Awesome (optional)
```

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

## Typografie

Alle Klassen in `helpers/typography.css`.

| Klasse | Zweck |
|---|---|
| `.ncss-text-sm/base/md/lg/xl` | Schriftgröße |
| `.ncss-text-muted/brand/brand-2/neutral/success/warning/danger` | Textfarbe |
| `.ncss-text-inherit` | `color: inherit` - für Text auf einer farbigen Fläche (z.B. `.ncss-surface--brand`) |
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

## Ecken, Rahmen, Schatten

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
| `.ncss-btn` + `--primary`/`--secondary`/`--danger` | Button-Varianten |

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
| `topbar.css` | `.ncss-topbar`, `-inner`, `-brand`, `-actions` | Kopfleiste, wächst statt zu überlaufen, wenn die Navigation umbricht |
| `nav.css` | `.ncss-nav`, `-toggle`, `-panel`, `-list`, `-item`, `-dropdown` (+ `--nested`), `-submenu` (+ `--mega`), `-mega-col`, `-mega-heading`, `--tree` | Horizontale Nav (kollabiert ab 64rem zu Off-Canvas) + vertikale Tree-Variante; Dropdowns/Mega-Menü über `<details>`/`<summary>`, kein Hover-Bug auf Touch |
| `off-canvas.css` | `.ncss-offcanvas` (+ `--start`/`--end`) | Seitlich einschiebendes Panel, natives `<dialog>` |
| `modal.css` | `.ncss-modal`, `-header`, `-footer` (+ `--fullscreen`, `--dark`, `--3d`) | Zentriertes Dialog-Modal; `--fullscreen`+`--dark` ergibt eine Lightbox, keine separate Komponente nötig. `--3d` (+ `--ncss-modal-3d-depth`) kippt beim Öffnen wie aus der Tiefe herein statt nur zu faden/skalieren - `perspective()` als Transform-Funktion in der eigenen `transform`-Kette, da `<dialog>` im Top Layer rendert und eine `perspective`-Eigenschaft auf einem Elternelement dort nicht zuverlässig wirkt |
| `dialog-close.css` | `.ncss-dialog-close` | Geteilter Schließen-Button für Modal/Off-Canvas/Nav-Panel |
| `disclosure.css` | `.ncss-disclosure` | FAQ-Box-Optik für `<details>`/`<summary>` |
| `card.css` | `.ncss-card-container`, `.ncss-card`, `-media`, `-header`, `-body`, `-footer` (+ `--flush`, `--transparent`, `--linked`, `--horizontal`, `--horizontal-end`, `--brand/-brand-2/-neutral/-success/-warning/-danger`) | Karte. Rahmen/Ecken/Schatten NICHT eingebaut - siehe [Ecken, Rahmen, Schatten](#ecken-rahmen-schatten). `--flush` entfernt jedes Padding in Body/Header/Footer (auch block); `--transparent` entfernt zusätzlich den Hintergrund - beides zusammen macht `.ncss-card` zu einem unsichtbaren, aber weiter strukturell korrekten Wrapper (Footer bleibt unten, Body füllt den Rest). `--horizontal`/`--horizontal-end`: Media links/rechts nebeneinander mit Text (ab eigener Breite 24rem, `.ncss-card-container` als Wrapper nötig). Media OBEN ist einfach die Dokumentreihenfolge, Media UNTEN braucht nur `.ncss-card-media` als LETZTES Kind - keine eigene Klasse für beides. `.ncss-card-media` rundet selbst nie (`border-radius:0`) - verlässt sich auf `overflow: clip` der Karte, damit nur echte Kartenecken rund werden, nie eine Kante mittendrin. Footer/Body-Fläche bleibt bei unterschiedlich hohen Nachbarkarten automatisch unten ausgerichtet (`.ncss-card-body{flex:1 1 auto}` füllt den Rest) |
| `search.css` | `.ncss-search`, `.ncss-search-input` (+ `--ncss-search-expanded-width`) | Suchfeld, das schmal startet und beim Fokussieren/bei Eingabe per reiner `width`-Transition wächst - kein JS |
| `badge.css` | `.ncss-badge` (+ `--brand-2/-neutral/-success/-warning/-danger`) | Kleine Status-/Kategorie-Chips |
| `breadcrumb.css` | `.ncss-breadcrumb` | Natives `<nav><ol>`, `::before`-generierte Trenner |
| `select.css` | `.ncss-select-wrapper`, `.ncss-select` | Gestyltes natives `<select>` inkl. eigenem Chevron |
| `slideshow.css` | `.ncss-slideshow`, `-track` (+ `--no-scrollbar`), `-item` (+ `--peek`) | Scroll-Snap-Karussell, kein JS nötig |
| `sparkline.css` | `.ncss-sparkline`, `-area`, `-dot` (+ `--success`/`--danger`) | Kleine Inline-Datenlinie |
| `scroll-progress.css` | `.ncss-scroll-progress` (+ `--vertical`, `--end`) | Lesefortschrittsbalken, `animation-timeline: scroll()`. Farbe/Verlauf brauchen keine eigene Klasse - `.ncss-gradient-brand`/`-subtle` oder `.ncss-surface--brand-2`/`-neutral` direkt dazu kombinieren (`background-image` malt sich über das eigene `background-color`). `--vertical` (+ optional `--end` für die rechte statt linke Kante) für einen seitlichen statt oberen Balken |
| `placeholder.css` | `.ncss-placeholder` (+ `--surface`) | Grauer Platzhalter für Demo-/Prototyp-Inhalte |
| `hero.css` | siehe [Medien](#medien-bildvideoaudio) | Bild-Hintergrund-Sektion mit Inhalt obenauf, optional Parallax |
| `footer.css` | `.ncss-footer`, `-inner`, `-bottom` | Seitenfuß-Grundgerüst |
| `effects.css` | `.ncss-glow-border`, `.ncss-glow-pulse`, `.ncss-glass`, `.ncss-stamped`, `.ncss-grain` | Rein dekorativ, bewusst optional (Zusatzklassen, kein Bestandteil von `.ncss-card`/`-btn`). `.ncss-glow-border` zeichnet einen rotierenden `conic-gradient()`-Ring über ein `::before` mit `mask-composite: exclude` (echtes "Loch" in der Mitte, kein Wrapper-Element nötig) - der Winkel läuft über eine per `@property` typisierte `<angle>`-Custom-Property (`--ncss-glow-angle`), sonst wäre die Rotation nur diskret statt interpoliert. `.ncss-glow-pulse` pulsiert per `box-shadow`, unabhängig kombinierbar. `.ncss-glass` ist Glassmorphism (`backdrop-filter: blur() saturate()`, `@supports`-abgesichert). `.ncss-stamped` zeichnet einen hauchdünnen, zweifarbigen "gravierten" Rahmen (dieselbe Masken-Ring-Technik wie `.ncss-glow-border`, diagonal dunkel-zu-hell statt rotierendem Verlauf) - keine eigene Hintergrundfarbe nötig, funktioniert auf jeder Fläche inkl. reinem Weiß. Hebt sich beim Hover an, sinkt bei `:active` tiefer ein; `.ncss-stamped--press` zusätzlich kehrt das Hover-Verhalten um (sinkt statt sich zu heben). `.ncss-grain` legt ein feines `<feTurbulence>`-Rauschen (SVG data-URI, kein Bild-Asset) per `::after` + `mix-blend-mode` über die Fläche. Demo: `demo/effects.html` |

## Web Awesome Bridge

`webawesome-bridge.css` mappt Web Awesomes `--wa-color-{familie}-{fill|border|on}-
{quiet|normal|loud}`-Variablen auf dieselben ncss-Farbtokens, damit z.B. `<wa-button>` und
`.ncss-btn` optisch zusammenpassen, statt zwei getrennte Paletten zu pflegen. Selbst
gehostetes Web Awesome/Font Awesome liegt unter `vendor/`. Erfordert:

- Laden über einen echten HTTP-Server (Web Awesome ist ES-Module-basiert, funktioniert
  nicht über `file://`).
- `data-webawesome="<pfad>"` auf dem Loader-`<script>`, sonst verdoppelt sich der
  Basis-Pfad bei relativem `src`.

## Demo-Seiten

Alle unter `demo/`, jede bindet `../ncss.css` ein und trägt eigenes, seitenspezifisches CSS
mit `demo-*`-Präfix (nie in den ncss-Dateien selbst):

| Seite | Inhalt |
|---|---|
| `index.html` | Kitchen-Sink: die meisten Komponenten auf einer Seite |
| `navigation.html` | Dropdown, verschachteltes Dropdown, Mega-Menü, Tree-Nav, Off-Canvas, Breadcrumb, Hide-on-Scroll |
| `forms.html` | Felder, Switch, Range |
| `media.html` | Video, Art Direction, Bilder, Hero-Sektion, Audio |
| `magazine.html` | Typografie-Showcase: Drop Cap, mehrspaltiger Text, Pull-Quote, Textumfluss |
| `scroll-sections.html` | Vollbild-Sektionen (section-für-section, "fullpage"-Muster), inkl. verschachteltem horizontalem Scroll-Snap |
| `colors.html` | Alle Farbtokens, Karten-/Badge-/Button-Farbvarianten, Theme-Umschalter |
| `webawesome.html` | Web-Awesome-Komponenten im Zusammenspiel mit NativeCSS |
| `landing.html` | Realistische Beispielseite (NativeCSS + Web Awesome + Font Awesome) |
| `docs.html` | Ausführliches Handbuch mit Anleitungen (mehr Tiefe als dieses README) |
| `guides.html` | Nummerierte, aufgabenorientierte Anleitungen mit Live-Beispielen |
| `effects.html` | Glow-Border, Glow-Pulse, Glass, Stamped, Grain - die optionalen Effekt-Komponenten aus `effects.css` |
| `theming.html` | Wie `theme.css` funktioniert, live am Beispiel (eigenes Beispiel-Theme, andere Markenfarben/Radien/Schrift) |

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
