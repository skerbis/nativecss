# NativeCSS - Referenz (generiert)

Header-Dokumentation jeder Datei in `dist/`. Erzeugt von `node tools/index.mjs` - nicht von Hand
bearbeiten. Klasse -> Datei: `llms/classes.json`. Custom Elements/Attribute/Events: `llms/components.json`.
Anleitung für Coding-Agents: `llms/GUIDE.md`.

*English: generated header documentation of every file in `dist/` (comments are German).*

Stand: 847 Klassen, 18 Custom Elements, 48 data-ncss-Attribute, 204 Tokens.

## Kern (dist/*.css)

### `base.css`

```text
ncss - Base (Layer "base"): alle gängigen HTML-Tags sauber gestylt, ausschließlich über
die Tokens aus tokens.css. Kein Markup-spezifisches Klassen-Styling hier - das ist
Aufgabe von helpers/ und components/. Logical Properties (margin-block/-inline statt
-top/-left) durchgängig, damit RTL-Sprachen ohne Zusatzaufwand funktionieren.
```

### `browser-fixes.css`

```text
ncss - Browser-spezifische Fixes (eigener Layer, ALLERLETZTE Priorität - siehe
ncss.css/@layer-Reihenfolge). Eigene Datei statt verstreuter @supports/@-moz-/-webkit--
Hacks in den Komponenten-Dateien: so bleibt sofort sichtbar, WAS ein Workaround für einen
konkreten Browser-Bug ist (mit Quelle/Datum) und WANN er wieder entfernt werden kann,
statt sich in normalem Komponenten-CSS zu verstecken.

Jeder Eintrag hier braucht: den genauen Bug, die Quelle, und (wenn möglich) eine
@supports/Feature-Query-Eingrenzung statt globalem Browser-Sniffing.
```

### `colors.css`

```text
ncss - Farb-Tokens (reine CSS Custom Properties, kein Preprocessor).

light-dark() (Baseline seit 2024) wählt automatisch anhand von color-scheme +
prefers-color-scheme bzw. einem manuellen Override ([data-theme] unten) - ein
Tokenwert deckt beide Modi ab, keine separate Dark-Datei.
```

### `ncss.css`

```text
ncss (native css) - eigenständiges Design System, kein UIkit-Erbe.

Aufbau (in genau dieser Reihenfolge geladen und in Cascade Layers dieser Priorität,
niedrig -> hoch): tokens < reset < base < helpers < components < webawesome-bridge <
browser-fixes. Der Layer "webawesome-bridge" bleibt HIER registriert, auch wenn diese
Datei selbst nichts mehr hineinlädt (siehe unten, Web Awesome ist komplett opt-in) -
die Layer-ORDER ist seitenweit global, ein Projekt, das integrations/
webawesome-bridge.css später selbst einbindet, landet automatisch an genau dieser
Prioritätsposition, unabhängig von der eigenen <link>-Reihenfolge.

@layer regelt die Priorität EXPLIZIT statt über Selektor-Spezifität/!important zu
kämpfen (siehe uikit_theme_builder diese Session: genau das war die Ursache mehrerer
Bugs - Bridge-CSS vs. info_center, revert-Hacks etc.). Eine spätere Layer-Regel
gewinnt immer gegen eine frühere, unabhängig von Selektor-Spezifität. Unlayered CSS
(z.B. Inline-Styles, ein <style> ohne @layer) schlägt IMMER jede Layer-Regel - das
ist Absicht der Spec und praktisch: Utility-Overrides im Markup funktionieren immer.

Die wa-*-Namen vorne (wa-native, wa-base, ...) sind Web Awesomes EIGENE Layer (siehe
vendor/webawesome/dist-cdn/styles/layers.css) - hier mit aufgeführt und vor unsere
eigenen Layer gesetzt, damit die Priorität GARANTIERT unabhängig von der <link>-
Reihenfolge im HTML ist (die Layer-Order ist seitenweit global, nicht pro Stylesheet -
ohne diese Zeile würde gewinnen, welche Bibliothek zufällig zuerst geladen wird). So
schlägt integrations/webawesome-bridge.css IMMER Web Awesomes eigenes Default-Theme,
ganz ohne !important.
```

### `page-transitions.css`

Klassen (1): `.ncss-topbar`

```text
NativeCSS - Seitenübergänge zwischen Navigationen (Cross-Document View Transitions).
Eigene, OPT-IN Datei (wie theme.css) - NICHT Teil von ncss.css, weil das eine
seitenweite Navigations-Entscheidung ist, kein wiederverwendbarer Baustein.

Einbindung: auf JEDER Seite laden, zwischen der ein weicher Übergang erscheinen soll
(Cross-Document View Transitions brauchen die Zustimmung BEIDER Seiten - Quelle UND
Ziel der Navigation -, sonst bleibt es beim normalen, sofortigen Seitenwechsel):
  <link rel="stylesheet" href="page-transitions.css">

Reines CSS, kein JavaScript, kein document.startViewTransition() nötig - @view-
transition { navigation: auto } genügt, der Browser übernimmt Navigation-Erkennung
und Screenshot-Vorher/Nachher selbst. Aktuell NICHT Baseline (Chromium-Familie und
Safari 18.2+, Firefox noch in Arbeit, Stand dieser Recherche) - unbekannte @-Regeln
werden von Browsern OHNE Unterstützung per CSS-Grundprinzip einfach ignoriert, kein
@supports nötig, keine Auswirkung auf ältere Browser: die Navigation bleibt dort
schlicht der normale, sofortige Seitenwechsel von vorher, kein Darstellungsfehler.

Bekannte Konsolen-Meldung (kein ncss-Bug): "Unhandled Promise Rejection: AbortError:
Skipping view transition because skipTransition() was called" - tritt (Stand jetzt
v.a. in WebKit/Safari, bugs.webkit.org #289078) auf, wenn eine laufende Transition
durch eine weitere Navigation übersprungen wird (typisch: schneller Zurück-/
Vorwärts-Klick), spec-bedingt erwartet, betrifft die eigentliche Navigation nicht.
Weil diese Datei bewusst rein deklarativ bleibt, hat die Seite selbst keine
Referenz auf die Transition, um die Meldung per `.catch()` abzufangen - optionaler,
separater Begleiter dafür: js/page-transitions-quiet.js (siehe dortiger
Kommentar für die vollständige Erklärung/Quellen).

NUR unter prefers-reduced-motion:no-preference aktiv - anders als die meisten
Animationen hier (die global über reset.css gedrosselt werden) reagiert die View-
Transitions-API NICHT von selbst auf prefers-reduced-motion, das @media-Gate hier ist
deshalb nicht redundant, sondern notwendig.

--- Mehrere Presets, nicht nur Kreuzblende --------------------------------------------
Default (keine weitere Angabe) ist die Kreuzblende unten. Für ein anderes Preset auf
einer bestimmten Seite den `types`-Deskriptor setzen - dafür die GESAMTE @view-
transition-Regel (inkl. navigation: auto) in einem eigenen <style> NACH dieser Datei
wiederholen, nicht nur `types` allein deklarieren (ob einzelne Deskriptoren über
mehrere @view-transition-Regeln hinweg kaskadieren oder die ganze Regel ersetzt wird,
ist nicht abschließend geklärt - die komplette Regel zu wiederholen ist in jedem Fall
sicher, siehe demo/landing.html für ein Beispiel):
  @media (prefers-reduced-motion: no-preference) {
    @view-transition { navigation: auto; types: slide; }
  }
Verfügbare Presets: `slide` (horizontal, wie ein Vorwärtsblättern), `zoom` (sanftes
Heran-/Wegzoomen), `wipe` (Kreis-Reveal von oben, clip-path). Eigenes Preset ergänzen:
dieselbe Struktur wie unten (html:active-view-transition-type(name) { ... }) - Namen
frei wählbar, keine feste Liste in der Spec.
```

### `reset.css`

```text
ncss - Reset (Layer "reset", niedrigste Priorität nach den Tokens).

Bewusst schlank: entfernt nur Browser-Inkonsistenzen und UA-Defaults, die sonst jede
Komponente einzeln kontern müsste. Sinnvolle Standardwerte (Margins auf Überschriften,
Listen, etc.) kommen erst in base.css - der Reset selbst bleibt "dumm".
```

### `theme.css`

```text
NativeCSS - Theme-Datei: die EINE Stelle, an der ein Projekt seine wichtigen Werte
setzt, ohne irgendeine Datei in ncss.css/tokens.css/colors.css anzufassen.

Einbindung: NACH ncss.css laden, nichts weiter nötig.
  <link rel="stylesheet" href="ncss.css">
  <link rel="stylesheet" href="theme.css">

Warum das funktioniert, ohne @layer/!important: alle Werte in ncss.css liegen in
benannten Cascade Layers (tokens/reset/base/helpers/components/...). Diese Datei hier
ist ABSICHTLICH UNLAYERED (kein eigenes @layer) - und unlayered CSS gewinnt in der
Spec IMMER gegen jede Layer-Regel, unabhängig von Selektor-Spezifität oder
Lade-Reihenfolge. Ein einfaches ":root, :host { --ncss-color-brand: ... }" hier reicht also,
kein !important, kein höher-spezifischer Selektor nötig.

Enthält nur die BASIS-/SEED-Werte, nicht die daraus abgeleiteten Skalen. Farben wie
--ncss-color-brand-100/-300/-700/-900 (siehe colors.css) werden aus GENAU EINEM
Basiswert (--ncss-color-brand) per color-mix() automatisch berechnet - ändere die
Basisfarbe unten, die ganze Skala (helle/dunkle Stufen, "on-soft"-Textfarbe, Web-
Awesome-Bridge) zieht automatisch mit, ohne dass hier 40+ Einzelwerte gepflegt werden
müssten. Alle Werte unten sind an ihrem aktuellen Default gesetzt - einfach direkt
überschreiben, kein Auskommentieren nötig.

Mehrere Themes gleichzeitig? Denselben Aufbau in weiteren Dateien wiederholen (z.B.
theme-sunset.css) und wahlweise laden, oder siehe die [data-palette]-Konvention in
colors.css für einen rein attributgesteuerten Wechsel ohne zweite Datei.
```

### `tokens.css`

```text
ncss - Design Tokens (reine CSS Custom Properties, kein Preprocessor, kein Compile-Schritt).
Farb-Tokens sitzen separat in colors.css (eigenes Thema, eigene Datei) - hier alles
andere: Typografie, Abstand, Radius/Schatten, Bewegung, Komponenten-Defaults.

Skalen sind standardmäßig FLIESSEND (clamp()-basiert, "breakpointless") - Typografie und
Abstände passen sich stufenlos zwischen einer Mindest- und Maximal-Viewportbreite an, ganz
ohne Media Queries. Das ist der empfohlene Standardweg.

"Klassische" feste Breakpoints bleiben trotzdem verfügbar (siehe Abschnitt unten) - für
Fälle, in denen ein echter Sprung gebraucht wird (z.B. Navigation klappt bei einer festen
Breite von Hamburger auf Vollmenü um), nicht nur ein Fließen. WICHTIG: CSS Custom Properties
funktionieren aktuell in KEINEM Browser innerhalb von @media-Bedingungen
("@media (min-width: var(--x))" ist ungültig/wirkungslos) - die Breakpoint-Werte unten sind
daher als feste, dokumentierte Konvention gedacht, die in @media-Regeln direkt eingetragen
wird, nicht als var()-Referenz. Für component-lokale Responsivität immer zuerst Container
Queries erwägen (siehe helpers/layout.css) statt Viewport-Breakpoints.
```

## Helpers (dist/helpers/)

### `helpers/a11y.css`

Klassen (3): `.ncss-skip-link` `.ncss-visually-hidden` `.ncss-visually-hidden-focusable`

```text
ncss - a11y-Helper (Layer "helpers"). Eigenständig statt in typography.css versteckt -
das sind Zugänglichkeits-Werkzeuge, keine Typografie, auch wenn sie zufällig oft mit
Text zu tun haben.
```

### `helpers/animations.css`

Klassen (24): `.ncss-animate-fade-in` `.ncss-animate-fade-out` `.ncss-animate-on-scroll` `.ncss-animate-on-scroll--scale` `.ncss-animate-on-scroll--slide-left` `.ncss-animate-on-scroll--slide-right` `.ncss-animate-on-scroll--slide-up` `.ncss-animate-pulse` `.ncss-animate-scale-in` `.ncss-animate-shake` `.ncss-animate-slide-in-down` `.ncss-animate-slide-in-left` `.ncss-animate-slide-in-right` `.ncss-animate-slide-in-up` `.ncss-animate-spin` `.ncss-gpu-boost` `.ncss-hover-grow` `.ncss-hover-lift` `.ncss-press` `.ncss-skeleton` `.ncss-transition` `.ncss-transition-colors` `.ncss-transition-slow` `.ncss-transition-transform`

```text
ncss - Animation-Helper (Layer "helpers"). Keyframes + Utility-Klassen, ausschließlich
über --ncss-motion-duration/-slow und --ncss-motion-easing (tokens.css) getimt.
prefers-reduced-motion wird bereits GLOBAL in reset.css respektiert (Dauer auf 0.01ms
gekappt) - hier keine Einzelfall-Behandlung nötig, jede Animation unten erbt das.
```

### `helpers/elevation.css`

Klassen (32): `.ncss-blend-color` `.ncss-blend-color-burn` `.ncss-blend-color-dodge` `.ncss-blend-darken` `.ncss-blend-difference` `.ncss-blend-exclusion` `.ncss-blend-hard-light` `.ncss-blend-hue` `.ncss-blend-lighten` `.ncss-blend-luminosity` `.ncss-blend-multiply` `.ncss-blend-overlay` `.ncss-blend-saturation` `.ncss-blend-screen` `.ncss-blend-soft-light` `.ncss-border` `.ncss-border-none` `.ncss-radius-adaptive-lg` `.ncss-radius-adaptive-md` `.ncss-radius-adaptive-sm` `.ncss-radius-full` `.ncss-radius-lg` `.ncss-radius-md` `.ncss-radius-none` `.ncss-radius-sm` `.ncss-shadow-hover-lg` `.ncss-shadow-hover-md` `.ncss-shadow-hover-sm` `.ncss-shadow-lg` `.ncss-shadow-md` `.ncss-shadow-none` `.ncss-shadow-sm`

```text
ncss - Ecken, Rahmen, Schatten (Layer "helpers"). Bewusst als eigenständige, allgemeine
Utilities statt in Komponenten wie card.css eingebacken - ob etwas abgerundet ist,
einen Rahmen hat, einen Schatten (und ob der beim Hover wächst), ist eine
gestalterische Entscheidung, keine Eigenschaft, die eine Komponente für einen
vorschreiben sollte. Frei kombinierbar auf JEDEM Element, nicht nur Cards - z.B. genauso
auf einem Bild, einem eigenen Panel oder einer Media-Query-freien Sektion.
```

### `helpers/float.css`

Klassen (8): `.ncss-center-narrow` `.ncss-clear` `.ncss-float-bleed-end` `.ncss-float-bleed-start` `.ncss-float-end` `.ncss-float-shape-circle` `.ncss-float-start` `.ncss-full-narrow`

```text
ncss - Textumfluss (Layer "helpers"): Text soll um ein Element (typischerweise ein Bild)
herumfließen. Es gibt dafür KEINEN moderneren Ersatz - Grid/Flexbox positionieren
Elemente NEBENEINANDER, lassen Text aber nicht dynamisch um eine Form herumfließen. Der
vermeintliche Nachfolger (CSS Exclusions, wrap-flow/wrap-through) ist nie in Browsern
gelandet (nur ein toter Adobe/Microsoft-Prototyp von ~2012, MDN hat dafür keine Seite).
float bleibt also der richtige, nicht "veraltete" Werkzeug für GENAU diesen Zweck - die
"float ist schlecht"-Kritik gilt für Seiten-LAYOUT (dafür Grid/Flexbox nutzen), nicht für
Textumfluss.

Responsive über Container Queries statt Viewport-Breakpoint: erst ab einer gewissen
Breite des UMGEBENDEN Containers wird tatsächlich gefloatet - bei schmalem Container
(z.B. eine Sidebar) bleibt das Bild ein normaler Block, Text quetscht sich sonst in eine
unlesbar schmale Restspalte. Braucht einen Vorfahren mit container-type: inline-size
(z.B. .ncss-container aus helpers/layout.css).

Markup: <img class="ncss-float-start" src="..." alt="...">Text fließt drumherum...
```

### `helpers/forms.css`

Klassen (18): `.ncss-btn` `.ncss-btn--danger` `.ncss-btn--icon` `.ncss-btn--lg` `.ncss-btn--primary` `.ncss-btn--secondary` `.ncss-btn--sm` `.ncss-choice` `.ncss-field` `.ncss-field-error` `.ncss-field-hint` `.ncss-input` `.ncss-label` `.ncss-label--required` `.ncss-range` `.ncss-select` `.ncss-switch` `.ncss-textarea`

```text
ncss - Formular-Helper (Layer "helpers"). Native Formularelemente werden hier zu Ende
gestylt (base.css setzt nur font/color-Reset) - bewusst weiter mit echten <input>/
<select>/<textarea> statt Web-Awesome-Nachbauten, wo natives HTML genügt (siehe
ncss-Prinzip). Fokus-Handling erbt von reset.css (:focus-visible), hier nur Look.
```

### `helpers/icons.css`

Klassen (57): `.ncss-icon` `.ncss-icon-accessibility` `.ncss-icon-arrow-down` `.ncss-icon-arrow-left` `.ncss-icon-arrow-right` `.ncss-icon-arrow-up` `.ncss-icon-calendar` `.ncss-icon-check` `.ncss-icon-check-circle` `.ncss-icon-chevron-down` `.ncss-icon-chevron-left` `.ncss-icon-chevron-right` `.ncss-icon-chevron-up` `.ncss-icon-clock` `.ncss-icon-close` `.ncss-icon-copy` `.ncss-icon-download` `.ncss-icon-edit` `.ncss-icon-error` `.ncss-icon-external-link` `.ncss-icon-eye` `.ncss-icon-file` `.ncss-icon-filter` `.ncss-icon-fullscreen` `.ncss-icon-globe` `.ncss-icon-heart` `.ncss-icon-home` `.ncss-icon-image` `.ncss-icon-info` `.ncss-icon-link` `.ncss-icon-lock` `.ncss-icon-logout` `.ncss-icon-mail` `.ncss-icon-map-pin` `.ncss-icon-menu` `.ncss-icon-minus` `.ncss-icon-moon` `.ncss-icon-pause` `.ncss-icon-pencil` `.ncss-icon-phone` `.ncss-icon-play` `.ncss-icon-plus` `.ncss-icon-search` `.ncss-icon-settings` `.ncss-icon-share` `.ncss-icon-sort` `.ncss-icon-sprite` `.ncss-icon-star` `.ncss-icon-success` `.ncss-icon-sun` `.ncss-icon-trash` `.ncss-icon-upload` `.ncss-icon-user` `.ncss-icon-users` `.ncss-icon-volume` `.ncss-icon-warning` `.ncss-icon-x-circle`

```text
ncss - Icon-Helper (Layer "helpers"). Drei Wege, ein Größen-/Farbmodell (1em bzw.
--ncss-icon-size, Farbe = currentColor):

1. KERN-SET (diese Datei, ohne JS): eigene SVGs als CSS mask-image. Erben currentColor
   (recolorbar ohne Markup-Änderung), skalieren mit font-size, brauchen KEINEN Inhalt:
     <span class="ncss-icon ncss-icon-close" aria-hidden="true"></span>
   24er-Raster, runde Enden. Linien-Glyphen (Pfeile, Chevrons, plus/minus/close/check/
   search) mit Strichstärke 2.5, Piktogramme mit 2, play/pause gefüllt.
2. <ncss-icon name="house"> (js/icon.js): lädt eines der ~1500 Phosphor-Icons
   (vendor/phosphor/, MIT) und setzt es inline ein. Die Regel unten reserviert die Fläche
   schon VOR dem Laden (kein Layout-Sprung) - ohne JS bleibt sie leer. Für Icons, die
   Bedeutung tragen, deshalb das Kern-Set oder Weg 3 nehmen.
3. SVG-Sprite (ohne JS): Sprite per tools/icons/sprite.mjs oder Baukasten im Handbuch
   erzeugen, dann <svg class="ncss-icon-sprite" aria-hidden="true"><use
   href="icons.svg#house"></use></svg>.

Austauschbar: jede Komponente, die ein Icon braucht (z.B. .ncss-dialog-close), schreibt
nur GRÖSSE/POSITION des Icon-Platzhalters vor, nie die Quelle - Font Awesome
(<i class="fa-solid fa-xmark" aria-hidden="true"></i>) oder ein Phosphor-Icon passt in
dieselbe flex-zentrierte Fläche, ohne die Komponente anzufassen.

Nur unpräfixiertes mask-image: Browser, die light-dark() können (Grundlage von ncss),
können es alle - das -webkit-Duplikat hätte die Datei nur verdoppelt.
Weitere Kern-Icons nach demselben Muster ergänzen (24er viewBox, stroke='black' - die
Farbe der Maske ist egal, nur ihre Deckkraft zählt; '#' als %23 kodieren).
```

### `helpers/layout.css`

Klassen (65): `.ncss-bento` `.ncss-bento--hero` `.ncss-bento--mosaic` `.ncss-bleed-center` `.ncss-bleed-end` `.ncss-bleed-half-end` `.ncss-bleed-half-start` `.ncss-bleed-start` `.ncss-cluster` `.ncss-col-span-2` `.ncss-col-span-3` `.ncss-container` `.ncss-container--narrow` `.ncss-divider` `.ncss-divider--vertical` `.ncss-flex` `.ncss-flex--between` `.ncss-flex--center` `.ncss-flex--column` `.ncss-flex--wrap` `.ncss-flex-1` `.ncss-flex-auto` `.ncss-flex-grid` `.ncss-flex-grid--center` `.ncss-full-bleed` `.ncss-gap-lg` `.ncss-gap-md` `.ncss-gap-sm` `.ncss-gap-xl` `.ncss-grid` `.ncss-grid--align-start` `.ncss-grid--card-row` `.ncss-grid--cols-2` `.ncss-grid--cols-3` `.ncss-grid--cols-4` `.ncss-grid--cols-6` `.ncss-masonry` `.ncss-mb-0` `.ncss-mb-lg` `.ncss-mb-md` `.ncss-mb-sm` `.ncss-mb-xl` `.ncss-page-shell` `.ncss-px-lg` `.ncss-px-md` `.ncss-px-sm` `.ncss-px-xl` `.ncss-py-lg` `.ncss-py-md` `.ncss-py-sm` `.ncss-py-xl` `.ncss-row-span-2` `.ncss-row-span-3` `.ncss-stack` `.ncss-stack--loose` `.ncss-stack--tight` `.ncss-stretch` `.ncss-transform-center` `.ncss-width-1-2` `.ncss-width-1-3` `.ncss-width-1-4` `.ncss-width-1-5` `.ncss-width-1-6` `.ncss-width-2-3` `.ncss-width-3-4`

```text
ncss - Layout-Helper (Layer "helpers"): Grid/Flex/Container. Standardweg ist
"breakpointless" - Grids passen ihre Spaltenzahl automatisch an verfügbaren Platz an
(auto-fit/minmax), ohne eine einzige Media Query. Component-lokale Anpassung läuft über
Container Queries (reagiert auf die Breite des ELTERN-Containers, nicht des Viewports -
dieselbe .ncss-grid sieht in einer schmalen Sidebar automatisch anders aus als im breiten
Hauptbereich). Klassische, feste Breakpoints (siehe tokens.css) nur als explizit
benannter Escape Hatch ganz unten - sparsam einsetzen.
```

### `helpers/media.css`

Klassen (16): `.ncss-figure` `.ncss-figure--align-center` `.ncss-figure--align-left` `.ncss-figure--align-right` `.ncss-figure--width-25` `.ncss-figure--width-50` `.ncss-figure--width-75` `.ncss-figure--width-full` `.ncss-img-circle` `.ncss-img-contain` `.ncss-img-cover` `.ncss-img-dim-in-dark` `.ncss-img-rounded` `.ncss-ratio-portrait` `.ncss-ratio-square` `.ncss-ratio-video`

```text
ncss - Medien-Helper (Layer "helpers"): Bilder, Video, Aspect Ratios. base.css setzt
bereits sinnvolle Defaults (display:block, max-width:100%) - hier nur zusätzliche,
gezielt einsetzbare Klassen.
```

### `helpers/reveal.css`

Klassen (16): `.ncss-reveal` `.ncss-reveal--circle` `.ncss-reveal--diagonal` `.ncss-reveal--expand` `.ncss-reveal--fade` `.ncss-reveal--inset` `.ncss-reveal--js` `.ncss-reveal--once` `.ncss-reveal--scale` `.ncss-reveal--slide-up` `.ncss-reveal--split` `.ncss-reveal--wipe-down` `.ncss-reveal--wipe-left` `.ncss-reveal--wipe-right` `.ncss-reveal--wipe-up` `.ncss-reveal--zoom`

```text
ncss - Reveal-Effekte (Layer "helpers"): Einblenden per clip-path/Transform für
BELIEBIGE Elemente - Sektionen, Karten, Bilder, <figure>, <video>, Hintergrund-Video-
Boxen. Standard: an die eigene view()-Timeline gekoppelt (scroll-gescrubbt, rückwärts
scrollen spult zurück). Mit --once: zeitbasiert, einmal, beim Hereinscrollen.

Verhältnis zu .ncss-animate-on-scroll (helpers/animations.css): das bleibt der
schlanke, kompatible Kurzweg für "Einblenden/Hochgleiten beim Scrollen" (nur scrub).
.ncss-reveal ist die Obermenge mit eigener Mechanik: clip-path-Formen, einmal-Modus,
JS-Fallback, einstellbarer Bereich - und enthält dafür auch --fade/--slide-up/--scale,
damit eine Seite, die --once braucht, nicht zwei Systeme mischen muss. Bewusst EIGENE
Keyframes statt die aus animations.css zu leihen: jede Datei bleibt einzeln
einbindbar (Cherry-Picking).

Markup (Basisklasse + genau eine Form):
  <section class="ncss-reveal ncss-reveal--circle">...</section>
  <figure class="ncss-reveal ncss-reveal--zoom"><img src="..." alt="..."></figure>
  <video class="ncss-reveal ncss-reveal--wipe-up" ...></video>
  <div class="ncss-reveal ncss-reveal--split ncss-reveal--once" data-ncss-reveal>...</div>

Formen (der Clip öffnet sich bis zur vollen Box, danach bleibt KEIN clip-path stehen -
Fokus-Ringe/Schatten werden nicht beschnitten):
  --circle      Iris aus --ncss-reveal-x/-y (Default Mitte)
  --wipe-right  Kante läuft links -> rechts (--wipe-left: rechts -> links)
  --wipe-up     Kante läuft unten -> oben (--wipe-down: oben -> unten)
  --inset       Rechteck wächst aus der Mitte
  --split       Vorhang öffnet sich aus der Mitte zu beiden Seiten
  --diagonal    diagonale Kante aus der oberen Startecke
  --zoom        abgerundeter Ausschnitt öffnet sich, das Medium darin skaliert
                1.15 -> 1 (auf einen Wrapper setzen: figure/picture/div)
  --expand      eingerückte, abgerundete Box wächst auf volle Größe - auf einem
                vollbreiten Element = "wächst zu Full-Bleed"
  --fade / --slide-up / --scale   klassische Einblendungen, gleiche Mechanik

Parameter: --ncss-reveal-start / -end (Bereich, Default entry 25% / cover 45% - der
Reveal endet, kurz bevor das Element die Viewport-Mitte erreicht; ein frühes Ende wie
contain 25% lief per Screenshot-Sequenz komplett am unteren Bildrand ab und war kaum
wahrnehmbar), --ncss-reveal-x/-y,
--ncss-reveal-inset, --ncss-reveal-radius, --ncss-reveal-scale (Zoom-Startwert),
--ncss-reveal-duration (--once, Default 0.9s).

Wer was kann:
  scrub:  animation-timeline:view() (Chromium, Safari 26) - reines CSS.
  --once: Chromium nativ per timeline-trigger (reines CSS). Ohne Trigger-Unterstützung
          ohne JS: fällt auf scrub zurück. Mit js/reveal.js (data-ncss-reveal):
          zeitbasiert per IntersectionObserver - auch für Browser ganz ohne view(),
          dort wird jedes data-ncss-reveal-Element automatisch zum --once-Element.
  Ohne alles: Inhalt einfach sichtbar (kein Fehlerzustand).
prefers-reduced-motion, Druck: kein Clip, keine Bewegung. Forced Colors: unberührt.

Benötigt: tokens.css (--ncss-radius-lg, --ncss-motion-easing-emphasized). Optional
js/reveal.js.
```

### `helpers/scroll.css`

Klassen (10): `.ncss-hide-on-scroll` `.ncss-scroll-snap-item` `.ncss-scroll-snap-x` `.ncss-scroll-snap-y` `.ncss-snap-section` `.ncss-snap-section--scrollable` `.ncss-snap-sections` `.ncss-sticky` `.ncss-sticky--bottom` `.ncss-sticky-container`

```text
ncss - Scroll-Helper (Layer "helpers"): Sticky-Positionierung + allgemeine Scroll-
Mechanik. Eigenständig statt in layout.css - das hier ist "wie verhält sich ein Element
BEIM Scrollen", kein statisches Seiten-Layout. Scroll-GETRIEBENE Animationen (Ein-/
Ausblenden je nach Scroll-Position) stehen dagegen in helpers/animations.css, das ist
konzeptionell eine Animation, keine Scroll-Mechanik.
```

### `helpers/surfaces.css`

Klassen (8): `.ncss-gradient-brand` `.ncss-gradient-subtle` `.ncss-scheme-dark` `.ncss-scheme-light` `.ncss-surface--brand` `.ncss-surface--brand-2` `.ncss-surface--neutral` `.ncss-text-gradient-brand`

```text
ncss - Farbige Flächen (Layer "helpers"): Hintergrund + garantiert passende Textfarbe in
einer Klasse, statt Inline-Style mit Hand-gepflegtem Kontrast (fehleranfällig, siehe
dokumentierter Bug unten).

BEWUSST NICHT --ncss-color-brand-contrast verwendet: der ist an color-scheme gekoppelt
(light-dark()) und für die Kombination mit --ncss-color-brand (der SELBST mit dem Theme
kippt) gedacht. Die 900er-Stufe der Skala bleibt dagegen IMMER dunkel, auch wenn die
Seite gerade im Dark Mode ist (color-mix() Richtung Schwarz ist nicht theme-abhängig) -
brand-contrast würde im Dark Mode fälschlich auf dunklen Text kippen, obwohl der
Hintergrund weiterhin dunkel bleibt. Für feste Skalenstufen daher ein fest passender,
nicht mitkippender Kontrastwert.
```

### `helpers/tables.css`

Klassen (3): `.ncss-table--compact` `.ncss-table-scroll` `.ncss-table-stacked`

```text
ncss - Responsive Tabellen (Layer "helpers"). base.css stylt <table> bereits als
normale, semantische Tabelle - hier zwei Strategien für "passt nicht auf schmale
Screens", mit klarem a11y-Hinweis zur Wahl.
```

### `helpers/typography.css`

Klassen (51): `.ncss-clamp-lines` `.ncss-columns` `.ncss-drop-cap` `.ncss-drop-cap--brand` `.ncss-drop-cap--lg` `.ncss-drop-cap--light` `.ncss-drop-cap--sm` `.ncss-eyebrow` `.ncss-font-variable` `.ncss-hyphenate` `.ncss-lead-quote` `.ncss-nums-oldstyle` `.ncss-nums-tabular` `.ncss-pull-quote` `.ncss-text-balance` `.ncss-text-base` `.ncss-text-boxed` `.ncss-text-brand` `.ncss-text-brand-2` `.ncss-text-center` `.ncss-text-danger` `.ncss-text-dark` `.ncss-text-dark-100` `.ncss-text-dark-300` `.ncss-text-dark-700` `.ncss-text-dark-900` `.ncss-text-end` `.ncss-text-inherit` `.ncss-text-justify` `.ncss-text-lead` `.ncss-text-lg` `.ncss-text-light` `.ncss-text-light-100` `.ncss-text-light-300` `.ncss-text-light-700` `.ncss-text-light-900` `.ncss-text-md` `.ncss-text-muted` `.ncss-text-neutral` `.ncss-text-pretty` `.ncss-text-sm` `.ncss-text-start` `.ncss-text-success` `.ncss-text-warning` `.ncss-text-xl` `.ncss-tracking-normal` `.ncss-tracking-tight` `.ncss-tracking-wide` `.ncss-tracking-wider` `.ncss-tracking-widest` `.ncss-truncate`

```text
ncss - Typografie-Helper (Layer "helpers"). Ergänzt base.css um Klassen für Fälle, in
denen ein Tag allein nicht reicht (z.B. Text in einer Komponente, der wie h3 aussehen
soll, ohne semantisch eine Überschrift zu sein).
```

### `helpers/visibility.css`

Klassen (15): `.ncss-hidden` `.ncss-hide-below-container-lg` `.ncss-hide-below-container-md` `.ncss-hide-below-container-sm` `.ncss-hide-below-container-xl` `.ncss-hide-below-md` `.ncss-hide-from-container-lg` `.ncss-hide-from-container-md` `.ncss-hide-from-container-sm` `.ncss-hide-from-container-xl` `.ncss-hide-from-md` `.ncss-invisible` `.ncss-print-only` `.ncss-reveal-on-hover` `.ncss-screen-only`

```text
ncss - Sichtbarkeits-Helper (Layer "helpers"). Eigenständig statt in layout.css
versteckt - das hier ist "zeig/verstecke dieses Element", kein Seiten-Layout. Für
"für Screenreader unsichtbar, aber vorlesbar" siehe stattdessen helpers/a11y.css
(.ncss-visually-hidden) - das ist konzeptionell etwas anderes als hier.

Jedes display:none hier ist bewusst !important - die Layer-konforme Lösung, kein
Spezifitäts-Kampf: eine Komponente/ein Helper mit eigenem display (.ncss-btn aus
helpers/forms.css lädt im SELBEN Layer später, .ncss-card/.ncss-nav liegen im höheren
Layer "components") gewann bisher gegen .ncss-hide-below-md & Co. (per Demo-Test
gefunden: <a class="ncss-btn ncss-hide-below-md"> blieb mobil sichtbar). Wichtige
Deklarationen kehren die Layer-Reihenfolge um - ein !important im Layer "helpers"
schlägt jede normale Regel aller Layer und jede wichtige Regel der späteren Layer.
Ein Verstecken-Helper soll genau das: immer verstecken, egal welche Komponente das
Element sonst ist. Funktioniert identisch, wenn diese Datei einzeln (Cherry-Picking) in
einem beliebigen Layer oder unlayered eingebunden wird - keine Abhängigkeit von der
Layer-Reihenfolge in ncss.css. Gilt NUR für display:none, nicht für .ncss-invisible/
.ncss-reveal-on-hover (opacity/visibility, kein Konflikt mit Komponenten-display).
```

## Komponenten (dist/components/)

### `components/accordion-split.css`

Klassen (9): `.ncss-accordion-split` `.ncss-accordion-split-body` `.ncss-accordion-split-container` `.ncss-accordion-split-item` `.ncss-accordion-split-list` `.ncss-accordion-split-media` `.ncss-accordion-split-media-mobile` `.ncss-vt-3d` `.ncss-vt-slide`

```text
ncss - Accordion-Split-Komponente (Layer "components"): "transformierendes Akkordeon"
(bekannt von apple.com/mac) - Text-Akkordeon links, dazugehöriges Bild rechts, wechselt
automatisch mit dem gerade geöffneten Punkt. Funktioniert KOMPLETT NATIV OHNE JS:
exklusives Öffnen/Schließen über `<details name="...">` (Baseline seit September 2025,
in Chrome/Firefox/Safari verifiziert), das passende Bild wird per `:has()` ausgewählt
(dieselbe Technik, die schon `pre:has(> code[class*="language-"])` in
components/code-block.css nutzt) - dabei bleibt der Bildwechsel selbst ein harter
display:none/block-Schnitt. `js/view-transitions.js` (separates, optionales
Opt-in-Skript, NICHT Teil dieser Datei) macht diesen Wechsel zusätzlich weich
(Kreuzblende/Slide/3D-Flip per Same-Document View Transitions) - siehe die
`::view-transition-*`-Regeln weiter unten für die zugehörigen Presets.

Markup (bis zu 6 Punkte - siehe "Bounded enumeration" unten für den Grund):
  <div class="ncss-accordion-split-container">
    <div class="ncss-accordion-split">
      <div class="ncss-accordion-split-list">
        <details name="as-1" class="ncss-accordion-split-item" open>
          <summary>Mac und iPhone</summary>
          <div class="ncss-accordion-split-body">
            <p>Text ...</p>
            <div class="ncss-accordion-split-media-mobile"><img src="bild-1.jpg" alt="..."></div>
          </div>
        </details>
        <details name="as-1" class="ncss-accordion-split-item">
          <summary>Mac und iPad</summary>
          <div class="ncss-accordion-split-body">
            <p>Text ...</p>
            <div class="ncss-accordion-split-media-mobile"><img src="bild-2.jpg" alt="..."></div>
          </div>
        </details>
      </div>
      <div class="ncss-accordion-split-media">
        <img src="bild-1.jpg" alt="...">
        <img src="bild-2.jpg" alt="...">
      </div>
    </div>
  </div>

WICHTIG - jedes Bild steht ZWEIMAL im Markup: einmal in der rechten Desktop-Medien-
Spalte, einmal klein inline im eigenen Akkordeon-Punkt für Mobile (dort gibt es keine
zweite Spalte, das Bild erscheint stattdessen direkt im geöffneten Text, siehe Screen-
shot-Vorlage). Das ist eine BEWUSSTE Verdopplung, kein Kopierfehler: ohne JS lässt
sich ein DOM-Knoten nicht zwischen zwei weit auseinanderliegenden Containern
verschieben, nur eine Kopie in jedem Kontext funktioniert rein deklarativ. Dieselbe
Bild-URL wird vom Browser trotzdem nur EINMAL geladen (normales HTTP-Caching
innerhalb derselben Seite) - keine doppelte Ladezeit, nur etwas mehr Markup. Pro
Breakpoint ist jeweils nur EINE der beiden Kopien tatsächlich im Layout (die andere
`display:none`) - kein doppeltes Vorlesen für Screenreader.

`name="..."` MUSS pro Akkordeon-Split-Instanz auf der Seite EINDEUTIG sein (sonst
gruppieren sich mehrere Akkordeons ungewollt exklusiv miteinander) - wie eine
Radio-Button-`name`-Gruppe.
```

### `components/alert.css`

Klassen (9): `.ncss-alert` `.ncss-alert--danger` `.ncss-alert--neutral` `.ncss-alert--plain` `.ncss-alert--success` `.ncss-alert--warning` `.ncss-alert-actions` `.ncss-alert-close` `.ncss-alert-title`

```text
ncss - Alert/Callout: Hinweis-Box im Inhaltsfluss (Layer "components").

Markup:
<div class="ncss-alert ncss-alert--warning">
  <p class="ncss-alert-title">Wartung am Freitag</p>
  <p>Zwischen 18 und 20 Uhr ist der Shop nicht erreichbar.</p>
</div>
Varianten: --info (Default-Optik, Markenfarbe), --success, --warning, --danger,
--neutral. --plain ohne Symbol.

Schließbar (js/dismiss.js, generisch für alles mit [data-ncss-dismissible]):
<div class="ncss-alert ncss-alert--info" data-ncss-dismissible>
  ... <button class="ncss-alert-close" type="button" data-ncss-dismiss
              aria-label="Hinweis schließen"></button>
</div>

Rolle - bewusst NICHT automatisch gesetzt, hängt vom Zeitpunkt ab:
  - steht beim Laden schon auf der Seite: KEINE Rolle (wird normal mitgelesen, ein
    role="alert" würde beim Laden ungefragt vorgelesen)
  - wird später eingefügt, wichtig + zeitkritisch (Formularfehler): role="alert"
  - wird später eingefügt, nur Info (gespeichert): role="status"
Das Symbol ist reine Deko (::before) - die Bedeutung muss im Text stehen (Titel wie
"Achtung:"/"Fehler:" oder ein .ncss-visually-hidden-Präfix), Farbe allein reicht nicht
(WCAG 1.4.1).

Abgrenzung: .ncss-card--success/-warning/... (card.css) ist eine KARTE in Statusfarbe
(Container für beliebigen Inhalt, Kartenraster, Media, Footer). .ncss-alert ist eine
MELDUNG: Symbol, Titel, kompakter Text, optional schließbar. Gleiche Farb-Tokens, damit
beides nebeneinander konsistent aussieht - bewusst kein Alias. Für flüchtige
Rückmeldungen (verschwindet von selbst) stattdessen die Toasts aus notification.css.

Abhängigkeiten (Cherry-Picking): colors.css/tokens.css (+ reset/base); js/dismiss.js nur
für den Schließen-Button.
```

### `components/app-shell.css`

Klassen (10): `.ncss-app-shell` `.ncss-app-shell-brand` `.ncss-app-shell-close` `.ncss-app-shell-content` `.ncss-app-shell-heading` `.ncss-app-shell-main` `.ncss-app-shell-nav` `.ncss-app-shell-sidebar` `.ncss-app-shell-toggle` `.ncss-app-shell-topbar`

```text
ncss - App-Gerüst (Layer "components"): Seitenleiste + Kopfleiste + Inhalt für
Verwaltungsoberflächen/Dashboards. Reines HTML/CSS, kein JS: die Seitenleiste ist ein
natives Popover (popover-Attribut) - im BREITEN Container steht sie per CSS dauerhaft
als Spalte da, im SCHMALEN Container wird genau dasselbe Element zum Off-Canvas, das
der Menü-Button per popovertarget öffnet (ESC, Klick daneben und Fokus-Rückgabe liefert
der Browser). Ein Element, kein Umhängen per JS, keine doppelte Navigation im DOM.
Braucht colors.css + tokens.css (+ reset/base).

Markup:
  <div class="ncss-app-shell">
    <nav class="ncss-app-shell-sidebar" id="appnav" popover aria-label="Hauptnavigation">
      <button type="button" class="ncss-app-shell-close" popovertarget="appnav"
              popovertargetaction="hide" aria-label="Navigation schließen">&times;</button>
      <a class="ncss-app-shell-brand" href="/">Logo</a>
      <ul class="ncss-app-shell-nav" role="list">
        <li><a href="/" aria-current="page">Dashboard</a></li> ...
      </ul>
    </nav>
    <div class="ncss-app-shell-main">
      <header class="ncss-app-shell-topbar">
        <button type="button" class="ncss-app-shell-toggle" popovertarget="appnav"
                aria-label="Navigation öffnen">&#9776;</button>
        ... Suche, Konto ...
      </header>
      <main class="ncss-app-shell-content" id="main">...</main>
    </div>
  </div>

Umschaltpunkt: Breite des .ncss-app-shell-CONTAINERS (nicht des Viewports) ab 48rem -
dieselbe Shell funktioniert ganzseitig und eingebettet (z.B. in einer Doku-Vorschau).
Anpassbar: --ncss-app-shell-sidebar-width (Default 16rem), --ncss-app-shell-height
(Höhe der klebenden Seitenleiste, Default 100svh - bei eingebetteter Shell mit eigener
Scroll-Box auf deren Höhe setzen).

Fallback ohne Popover-API (sehr alte Browser): das popover-Attribut ist dort unbekannt,
die Seitenleiste steht im schmalen Container einfach ganz normal ÜBER dem Inhalt -
vollständig benutzbar, nur nicht eingeklappt. Bekannte Grenze: wird ein im schmalen
Container GEÖFFNETES Off-Canvas durch Verbreitern zur Spalte, bleibt es bis zum
nächsten ESC/Klick daneben im Top Layer - das Schließen kann CSS nicht auslösen.
```

### `components/audio-player.css`

Klassen (31): `.ncss-audio-player-artist` `.ncss-audio-player-btn` `.ncss-audio-player-btn--mute` `.ncss-audio-player-btn--next` `.ncss-audio-player-btn--play` `.ncss-audio-player-btn--prev` `.ncss-audio-player-btn--skip` `.ncss-audio-player-btn--speed` `.ncss-audio-player-chapter-time` `.ncss-audio-player-chapters` `.ncss-audio-player-chapters-title` `.ncss-audio-player-cover` `.ncss-audio-player-marks` `.ncss-audio-player-menu` `.ncss-audio-player-menu-item` `.ncss-audio-player-playlist` `.ncss-audio-player-progress` `.ncss-audio-player-range` `.ncss-audio-player-range--seek` `.ncss-audio-player-range--volume` `.ncss-audio-player-seek` `.ncss-audio-player-seek--wave` `.ncss-audio-player-sr` `.ncss-audio-player-time` `.ncss-audio-player-times` `.ncss-audio-player-title` `.ncss-audio-player-track` `.ncss-audio-player-transport` `.ncss-audio-player-ui` `.ncss-audio-player-volume` `.ncss-audio-player-wave`

```text
ncss - <ncss-audio-player> (Layer "components"): eigener Audioplayer über einem
nativen <audio controls>, Logik in js/audio-player.js (Markup/Attribute dort).

  Kompakt:  <ncss-audio-player><audio controls src="a.m4a"></audio></ncss-audio-player>
  Karte:    <ncss-audio-player layout="card" waveform> + Cover/Titel/Interpret/
            Playlist als Kinder (.ncss-audio-player-cover/-title/-artist/-playlist)

Zustände:
  - :not(:defined)/ohne .is-enhanced: das native <audio controls> bleibt sichtbar und
    benutzbar, die Karte zeigt Cover/Titel/Playlist schon in ihrem Raster - die
    Playlist-Links sind dann normale Links auf die Dateien.
  - .is-enhanced: <audio> ausgeblendet, eigene Leiste.
Folgt dem Seiten-Theme (Light/Dark über die Tokens) - anders als der Videoplayer, der
immer dunkel ist (dort liegt die Leiste über beliebig hellem Bild).

Unterscheidung zu components/audio.css: .ncss-audio/.ncss-audio-card stylen nur das
native <audio controls> (Breite, Karten-Rahmen mit figcaption) - ganz ohne JS. Diese
Datei ist der vollwertige Player mit eigenen Bedienelementen; beide sind unabhängig
voneinander einsetzbar.

Anpassbar (auf dem Element): --ncss-audio-player-accent (Default --ncss-color-brand),
--ncss-audio-player-radius.

Benötigt: tokens.css + colors.css (+ reset/base). Keine anderen ncss-Dateien - eigene
visually-hidden-Klasse (.ncss-audio-player-sr).
```

### `components/audio.css`

Klassen (2): `.ncss-audio` `.ncss-audio-card`

```text
ncss - Audio-Komponente (Layer "components"). Natives <audio controls> lässt sich per CSS
kaum umgestalten (die Bedienelemente sind Browser-UI, kein stylebares Markup wie bei
<video>+poster) - diese Datei deckt deshalb nur das ab, was tatsächlich geht: konsistente
Breite/Abstand und ein optionaler Card-artiger Rahmen mit Titel, damit ein nacktes
<audio>-Element nicht wie ein Fremdkörper auf der Seite wirkt.

Einfachster Fall:
  <audio src="clip.mp3" controls class="ncss-audio"></audio>

Mit Titel/Beschreibung (z.B. Podcast-Folge, Sprachnotiz):
  <figure class="ncss-audio-card">
    <figcaption>Folge 12 - Cascade Layers</figcaption>
    <audio src="clip.mp3" controls class="ncss-audio"></audio>
  </figure>
```

### `components/aurora.css`

Klassen (4): `.ncss-aurora` `.ncss-aurora--vivid` `.ncss-mesh` `.ncss-mesh--static`

```text
ncss - Aurora- & Mesh-Hintergründe (Layer "components"): weiche, langsam treibende
Farbfelder aus den Markenfarben hinter einer Sektion. Rein dekorativ, opt-in.

Markup:
<section class="ncss-aurora">...Inhalt...</section>
<section class="ncss-aurora ncss-aurora--vivid">...</section>
<section class="ncss-mesh">...</section>

Technik: die Farbflecken sind radial-gradient()-Hintergründe auf ::before/::after (KEIN
filter:blur - teuer und ruckelig auf großen Flächen), bewegt ausschließlich per
transform. transform/opacity laufen auf dem Compositor, kein Repaint pro Frame.
isolation:isolate + z-index:-1 hält die Ebenen hinter dem Inhalt, overflow:clip schneidet
die übergroßen Ebenen (inset negativ) an der Sektionskante ab.

Lesbarkeit: die Farben werden mit der Seitenfläche (--ncss-color-bg) gemischt, Text
bleibt die normale --ncss-color-text - in Hell UND Dunkel (Markenfarben sind bereits
light-dark()-Paare, die Mischung zieht automatisch mit). --vivid nur hinter großen
Überschriften/kurzen Texten einsetzen.

Bewegung: prefers-reduced-motion schaltet die Animation hier ausdrücklich ab (statisches
Bild, nicht nur der globale 1-Frame-Cap aus reset.css). Forced Colors: Effekt aus,
normale Systemfläche.

Abhängigkeiten (Cherry-Picking): nur tokens.css/colors.css (+ reset/base).

Tokens: --ncss-aurora-1/-2/-3 (Farben, Default aus brand/brand-2/success),
--ncss-aurora-opacity (Default 0.7), --ncss-aurora-speed (Grunddauer, Default 14s),
--ncss-mesh-speed (Default 28s).
```

### `components/avatar.css`

Klassen (10): `.ncss-avatar` `.ncss-avatar--brand-2` `.ncss-avatar--danger` `.ncss-avatar--lg` `.ncss-avatar--neutral` `.ncss-avatar--sm` `.ncss-avatar--success` `.ncss-avatar--warning` `.ncss-avatar--xl` `.ncss-avatar-group`

```text
ncss - Avatar (Layer "components"): rundes Personen-/Konto-Kürzel, wahlweise als Bild
oder als Initialen. Reines CSS, kein JS. Braucht nur colors.css + tokens.css (+ reset/
base) - cherry-pick-fähig.

Markup:
  <span class="ncss-avatar" role="img" aria-label="Julia Brenner">JB</span>
  <img class="ncss-avatar" src="julia.jpg" alt="Julia Brenner" width="40" height="40">
  <span class="ncss-avatar ncss-avatar--lg"><img src="julia.jpg" alt="Julia Brenner"></span>
Rein dekorativ neben dem ausgeschriebenen Namen: aria-hidden="true" statt role/aria-label
(sonst liest der Screenreader den Namen doppelt vor).

Größen: --sm / (Default) / --lg / --xl. Farben wie .ncss-badge (100-Fläche +
-on-soft-Text, bleibt in beiden Themes kontrastreich): --brand-2/--neutral/--success/
--warning/--danger. Bewusst KEINE frei berechnete Farbe pro Name (z.B. Hue aus einem
Hash) - das bräuchte rohe Farbwerte außerhalb des Token-Systems.

Gruppe (überlappend, z.B. "wer arbeitet daran"):
  <ul class="ncss-avatar-group" role="list">
    <li><span class="ncss-avatar" role="img" aria-label="Julia Brenner">JB</span></li>
    ...
    <li><span class="ncss-avatar ncss-avatar--neutral" role="img" aria-label="3 weitere">+3</span></li>
  </ul>
```

### `components/back-to-top.css`

Klassen (2): `.ncss-back-to-top` `.ncss-back-to-top-label`

```text
ncss - "Nach oben"-Link (Layer "components"). Reines CSS, kein JS: ein normaler Link
auf "#top" - laut HTML-Spec scrollt das Fragment "top" auch OHNE Element mit dieser id
an den Seitenanfang (die sanfte Bewegung kommt aus reset.css' scroll-behavior und
entfällt dort automatisch bei reduzierter Bewegung). Braucht colors.css + tokens.css
(+ reset/base).

Markup (am Ende des Inhalts bzw. im Footer platzieren - das ist zugleich der Fallback-
Ort, siehe unten):
  <a class="ncss-back-to-top" href="#top">
    <span aria-hidden="true">&uarr;</span><span class="ncss-back-to-top-label">Nach oben</span>
  </a>
Tastatur-Tipp: Liegt am Seitenanfang ein Element mit id="top" und tabindex="-1" (z.B.
der Skip-Link-Zielbereich), landet auch der FOKUS dort - sonst bleibt er am Link stehen.

Zwei Darstellungen, je nach Browser-Fähigkeit:
- MIT Scroll-getriebenen Animationen (animation-timeline: scroll()): schwebt unten an
  der Inline-End-Kante und blendet erst nach den ersten ~40vh Scrollweg ein. Im
  unsichtbaren Zustand zusätzlich visibility:hidden - nicht per Tab erreichbar, solange
  man ohnehin oben ist.
- OHNE (z.B. Firefox ohne Flag): bleibt ein ganz normaler Link im Fluss, genau dort, wo
  er im Markup steht (deshalb "am Ende platzieren") - immer sichtbar, nie verdeckend.
Text: .ncss-back-to-top-label ist im schwebenden Modus nur für Screenreader sichtbar
(runder Icon-Button), im Fluss-Modus ganz normal sichtbar.
```

### `components/backdrop.css`

Klassen (3): `.ncss-backdrop` `.ncss-backdrop--contained` `.ncss-backdrop-item`

```text
ncss - Backdrop-Komponente (Layer "components"): Hintergrund aus einem oder mehreren
Bildern, die langsam überblenden und dabei sanft auszoomen ("Ken Burns"). Inhalt
(Karten, .ncss-glass-Flächen) liegt darüber - typisch für Galerie-, Hotel- oder
Portfolio-Seiten, auf denen das Foto selbst die Atmosphäre trägt.

Zwei Varianten:
1. .ncss-backdrop (Standard) - seitenweit, fixiert hinter dem gesamten Inhalt.
2. .ncss-backdrop--contained - füllt nur den nächsten positionierten Vorfahren (z.B.
   eine Hero-Sektion mit position:relative) statt den ganzen Viewport.

Markup:
<div class="ncss-backdrop" data-ncss-backdrop data-interval="6000" aria-hidden="true">
  <img class="ncss-backdrop-item" src="a.jpg" alt="" fetchpriority="high">
  <img class="ncss-backdrop-item" src="b.jpg" alt="" loading="lazy">
</div>
<script src="js/backdrop.js" defer></script>

Ohne JavaScript bleibt das erste Bild stehen (kein leerer Hintergrund) - ein einzelnes
Bild braucht gar kein Script. Die Bilder sind reine Dekoration (alt="" +
aria-hidden am Container), Bildinhalte mit Aussage gehören nicht hierher.

Warum position:fixed + 100lvh statt background-attachment:fixed: iOS ignoriert
background-attachment:fixed komplett, und 100vh/100svh lässt beim Ein-/Ausblenden der
mobilen Adressleiste einen leeren Streifen am unteren Rand frei - 100lvh (größte
Viewport-Höhe, siehe SKILL "drei Viewport-Einheiten") deckt in jedem Zustand ab.

Wichtig: kein Vorfahre darf transform/filter/backdrop-filter tragen - sonst wird er zum
Bezugsrahmen für position:fixed (siehe SKILL "neuer containing block"), der Backdrop
scrollt dann mit. Den Container deshalb direkt in <body> setzen.

Anpassbar (Defaults in tokens.css, pro Instanz per style="--..." überschreibbar):
  --ncss-backdrop-fade   Dauer der Überblendung
  --ncss-backdrop-zoom   Startskalierung des Auszooms (1 = kein Zoom)
  --ncss-backdrop-tint   Schleier über dem Bild
Die Zoom-Dauer setzt js/backdrop.js passend zum Wechselintervall.
```

### `components/badge.css`

Klassen (9): `.ncss-badge` `.ncss-badge--brand-2` `.ncss-badge--danger` `.ncss-badge--neutral` `.ncss-badge--success` `.ncss-badge--warning` `.ncss-badge-dot` `.ncss-badge-icon` `.ncss-badge-icon--lg`

```text
ncss - Badge/Tag-Komponente (Layer "components"). Zeigt exemplarisch, wie die
abgestuften Farbskalen aus tokens.css genutzt werden (100 als Hintergrund, -on-soft als
Text - klassisches "soft badge"-Muster, bleibt in BEIDEN Themes kontrastreich: -on-soft
ist selbst light-dark()-gewrappt, siehe colors.css - eine feste Stufe wie -700 allein
würde im Dark Mode auf der dort ebenfalls dunklen -100-Fläche zu dunkel/kaum lesbar).
```

### `components/breadcrumb.css`

Klassen (1): `.ncss-breadcrumb`

```text
ncss - Breadcrumb-Komponente (Layer "components"). Natives <nav><ol>, keine Web-
Awesome-Abhängigkeit (Vergleich: <wa-breadcrumb> in demo/webawesome.html).

Markup:
  <nav class="ncss-breadcrumb" aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Start</a></li>
      <li><a href="/kategorie">Kategorie</a></li>
      <li aria-current="page">Aktuelle Seite</li>
    </ol>
  </nav>
<ol>, nicht <ul>: die Reihenfolge ist inhaltlich bedeutsam (Pfad-Hierarchie), das ist
genau der Fall, für den <ol> gedacht ist. Letztes Element ohne <a> + aria-current="page"
statt eines Links auf die eigene Seite. aria-label="Breadcrumb" auf <nav>, da mehrere
<nav>-Elemente pro Seite sonst nicht unterscheidbar sind (a11y-Pflicht, nicht optional).
```

### `components/card.css`

Klassen (23): `.ncss-card` `.ncss-card--brand` `.ncss-card--brand-2` `.ncss-card--compact` `.ncss-card--danger` `.ncss-card--flush` `.ncss-card--horizontal` `.ncss-card--horizontal-end` `.ncss-card--linked` `.ncss-card--neutral` `.ncss-card--success` `.ncss-card--transparent` `.ncss-card--warning` `.ncss-card-body` `.ncss-card-container` `.ncss-card-footer` `.ncss-card-header` `.ncss-card-link` `.ncss-card-media` `.ncss-cluster` `.ncss-flex` `.ncss-grid` `.ncss-stack`

```text
ncss - Card-Komponente (Layer "components"). Reines HTML/CSS, kein JS nötig.
Markup: <article class="ncss-card"> mit optionalen .ncss-card-media/-body/-header/-footer.

Rahmen/Ecken/Schatten sind ABSICHTLICH NICHT Teil von .ncss-card selbst - das ist eine
gestalterische Entscheidung, keine Karten-Eigenschaft (siehe helpers/elevation.css für
die allgemeinen .ncss-border/.ncss-radius-.../.ncss-shadow-...-Utilities, dieselben, die
auch auf jedem anderen Element funktionieren). Beispiele:
  <article class="ncss-card ncss-border ncss-radius-lg ncss-shadow-sm ncss-shadow-hover-md">
    die "klassische" Karte: Rahmen, runde Ecken, dezenter Schatten, wächst beim Hover.
  <article class="ncss-card">
    komplett bare: kein Rahmen, keine Ecken, kein Schatten - nur Struktur/Hintergrund.
.ncss-card--flush ergänzt das um randlose Body/Header/Footer (KEIN Padding mehr, auch
nicht oben/unten) für eine Karte, deren Inhalt bis an den eigenen Rand reicht - z.B. für
ein Bild, das den ganzen Body ausfüllt, oder eine Liste ohne Card-typischen Abstand.

Für die Container-Query-Variante (.ncss-card--horizontal) die Karte zusätzlich in
.ncss-card-container wrappen: <div class="ncss-card-container"><article class="ncss-card
ncss-card--horizontal">...</article></div>. Ein Element kann per Spec NICHT seinen
eigenen Container-Query-Kontext abfragen (nur Nachfahren können das) - container-type
darf also nicht auf .ncss-card selbst sitzen, wenn genau diese Karte anhand ihrer
eigenen Breite umschalten soll.
```

### `components/code-block.css`

Klassen (4): `.ncss-code-block` `.ncss-code-copy` `.ncss-code-status` `.ncss-icon`

```text
ncss - Code-Block-Komponente (Layer "components"): Syntax-Highlighting + Copy-to-
Clipboard für <pre><code>-Beispiele. Nutzt selbst gehostetes Prism.js (vendor/prismjs/,
keine CDN-Abhängigkeit, siehe SKILL.md) - diese Datei bridged NUR Prisms
Token-Klassen auf dieselben ncss-Farbtokens, die auch Buttons/Badges nutzen (kein
zweites, eigenständiges Highlighting-Theme), und stylt den Copy-Button. `pre`/`code`
selbst (Hintergrund, Radius, Padding) kommen bereits aus base.css - hier NICHT
dupliziert.

Einbindung (opt-in, nur auf Seiten mit Code-Beispielen):
  <script>window.Prism = { manual: true };</script>
  <script src="vendor/prismjs/prism-core.min.js"></script>
  <script src="vendor/prismjs/prism-markup.min.js"></script>
  <script src="vendor/prismjs/prism-css.min.js"></script>
  <script src="vendor/prismjs/prism-clike.min.js"></script>
  <script src="vendor/prismjs/prism-javascript.min.js"></script>
  <script src="dist/js/code-block.js" defer></script>
  <link rel="stylesheet" href="dist/components/code-block.css">
Markup bleibt natives HTML, nur die Sprache als Klasse am <code>:
  <pre><code class="language-html">&lt;div class="ncss-card"&gt;...&lt;/div&gt;</code></pre>
code-block.js ruft Prism.highlightAll() selbst auf UND injiziert den Copy-Button -
kein manuelles Wrapping im Markup nötig. `window.Prism = { manual: true }` VOR dem
Laden von prism-core setzen, sonst highlightet Prism beim DOMContentLoaded selbst
schon einmal (unkontrolliert, ohne Copy-Button) und code-block.js findet keine rohen
<code>-Blöcke mehr vor.
```

### `components/combobox.css`

Klassen (7): `.ncss-combobox` `.ncss-combobox-chevron` `.ncss-combobox-empty` `.ncss-combobox-list` `.ncss-combobox-option` `.ncss-combobox-trigger` `.ncss-input`

```text
ncss - Combobox (Layer "components"): opt-in JS-Enhancement für zwei native Muster,
deren POPUP selbst in keinem Browser per CSS stylebar ist:

1. `<input list="...">` + `<datalist>` (editierbares Feld MIT Auswahlliste) - die
   Vorschlagsliste ist reine Browser-UI, ohne Ausnahme (per echtem Test + Recherche
   bestätigt, Stand 2026).
2. `<select>` auf Browsern OHNE `appearance: base-select`-Unterstützung (Firefox,
   ältere Safari-Versionen) - dort bleibt das Options-Popup ebenfalls unstylebares
   natives UI (mit `base-select` dagegen bereits über `.ncss-select::picker(select)`
   gelöst, siehe select.css - diese Datei greift dort NICHT ein).

Beide brauchen zwingend JS für ein wirklich gestyltes Popup - reines CSS kann diese
Lücke nicht schließen. `js/combobox.js` baut in beiden Fällen dieselbe custom
Dropdown-Liste (hier gestylt), original-Markup bleibt unverändert (data-src bei input,
<option>-Kinder bei select) - ohne das Script bleibt die native, voll funktionsfähige
Basisversion bestehen (progressive enhancement, kein Funktionsverlust ohne JS).
```

### `components/command-palette.css`

Klassen (16): `.ncss-command` `.ncss-command-empty` `.ncss-command-footer` `.ncss-command-group` `.ncss-command-group-label` `.ncss-command-input` `.ncss-command-item` `.ncss-command-item-body` `.ncss-command-item-hint` `.ncss-command-item-icon` `.ncss-command-item-snippet` `.ncss-command-item-title` `.ncss-command-list` `.ncss-command-results` `.ncss-command-search` `.ncss-command-status`

```text
ncss - <ncss-command-palette>: Befehlspalette (Layer "components") - ein modaler
<dialog> mit Suchfeld und gefilterter Befehlsliste, optional per ⌘K / Strg+K. Muster:
WAI-ARIA Combobox + Listbox wie js/livesearch.js (Fokus bleibt im Eingabefeld,
aria-activedescendant zeigt auf die gewählte Option, gleiche Auswahl-Optik) - nur dass
hier die VORHANDENEN Einträge im Markup gefiltert werden, kein Server.

Markup:
<button type="button" command="show-modal" commandfor="cmd">Befehle <kbd>Strg K</kbd></button>
<ncss-command-palette shortcut="k">
  <dialog id="cmd" class="ncss-command" aria-label="Befehlspalette" closedby="any">
    <div class="ncss-command-search">
      <input class="ncss-command-input" type="text" aria-label="Befehl suchen"
             placeholder="Befehl oder Seite suchen …">
    </div>
    <div class="ncss-command-list" aria-label="Befehle">
      <div class="ncss-command-group">
        <p class="ncss-command-group-label">Seiten</p>
        <a class="ncss-command-item" href="/" data-keywords="start home">Startseite</a>
        <button class="ncss-command-item" type="button">Dunkles Design</button>
      </div>
    </div>
    <p class="ncss-command-empty" hidden>Keine Treffer</p>
    <div class="ncss-command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> wählen</span> ...</div>
  </dialog>
</ncss-command-palette>
<script src="js/command-palette.js" defer></script>

Ohne JS (Element nicht :defined): der Dialog öffnet trotzdem über command/commandfor
(nativ, bzw. js/command-fallback.js), zeigt alle Einträge als normale, per Tab
erreichbare Links/Buttons - Suchfeld und Tasten-Hinweise bleiben ausgeblendet, weil sie
ohne Script nichts tun würden.

Abhängigkeiten (Cherry-Picking): nur tokens.css/colors.css (+ reset/base). js/command-
palette.js öffnet den Dialog bei fehlendem command/commandfor selbst - js/command-
fallback.js ist NICHT nötig (schadet aber auch nicht).

Suchmodus (js/command-palette.js, Attribut src="index.json"): Treffer werden zur
Laufzeit gerendert - .ncss-command-results (Container vor den Markup-Gruppen),
.ncss-command-item-body mit -title und -snippet (zweizeiliger Eintrag), Suchbegriffe
als <mark>.

Tokens: --ncss-command-width (Default 40rem), --ncss-command-height (Listenhöhe,
Default min(26rem, 60svh)), --ncss-command-offset (Abstand von oben, Default 12svh).
```

### `components/compare.css`

Klassen (5): `.ncss-compare-after` `.ncss-compare-before` `.ncss-compare-label` `.ncss-compare-label--end` `.ncss-compare-range`

```text
ncss - <ncss-compare>: Vorher/Nachher-Vergleich (Layer "components"). Zwei
übereinanderliegende Bilder, ein Schieberegler verschiebt die Trennlinie. Der Regler ist
ein ECHTER <input type="range"> über der ganzen Fläche (Daumen = Griff) - Maus, Touch,
Tastatur (Pfeile, Pos1/Ende, Bild auf/ab) und Screenreader kommen damit vom Browser
selbst, kein nachgebauter Slider. Light-DOM-Custom-Element (js/compare.js, kein Shadow
Root): kopiert nur den Wert nach --ncss-compare-position und setzt eine sprechende
aria-valuetext.

Markup:
<ncss-compare style="--ncss-compare-ratio: 16 / 9">
  <img class="ncss-compare-before" src="vorher.jpg" alt="Küche vor der Renovierung">
  <img class="ncss-compare-after" src="nachher.jpg" alt="Küche nach der Renovierung">
  <span class="ncss-compare-label" aria-hidden="true">Vorher</span>
  <span class="ncss-compare-label ncss-compare-label--end" aria-hidden="true">Nachher</span>
  <input class="ncss-compare-range" type="range" min="0" max="100" value="50"
         aria-label="Trennlinie verschieben: links vorher, rechts nachher">
</ncss-compare>
<script src="js/compare.js" defer></script>

Ohne JS (Element nicht :defined): statischer 50/50-Vergleich, der Regler bleibt
ausgeblendet - ein Regler, der zwar wandert, die Bilder aber nicht mitnimmt, wäre
irreführender als gar keiner. Erst ncss-compare:defined blendet ihn ein.

Abhängigkeiten (Cherry-Picking): nur tokens.css/colors.css (+ reset/base). Optional
js/compare.js - sonst keine andere ncss-Datei.

Tokens: --ncss-compare-position (0%-100%, Default 50%), --ncss-compare-ratio (Default
16 / 9), --ncss-compare-handle (Griffgröße, Default 2.75rem), --ncss-compare-line
(Linienstärke, Default 3px).

"Vorher" liegt immer links (direction:ltr auf dem Rahmen) - auch in RTL-Sprachen ist der
Regler dadurch nicht gespiegelt, Bildreihenfolge und Wert passen immer zusammen.
```

### `components/count-up.css`

Klassen (2): `.ncss-count-up` `.ncss-count-up--js`

```text
ncss - Count-up-Zahlen (Layer "components"): Kennzahlen zählen von 0 hoch, sobald sie
ins Bild scrollen. Die ECHTE, formatierte Zahl bleibt als normaler DOM-Text stehen
(Screenreader, ohne JS, ohne CSS-Unterstützung, Kopieren) - die zählenden Ziffern sind
ein generiertes ::after (per content-Alternativtext "" für Hilfstechnik stumm), das am
Ende wieder zum echten Text überblendet.

Markup (--ncss-count-to = Zielwert als ganze Zahl, Pflicht):
  <span class="ncss-count-up" style="--ncss-count-to: 12500">12.500</span>
  <span class="ncss-count-up" style="--ncss-count-to: 98; --ncss-count-suffix: '%'">98 %</span>

Parameter: --ncss-count-from (0), --ncss-count-prefix/-suffix (Strings um die
Ziffern), --ncss-count-duration (2s). Im reinen CSS-Pfad fehlen während des Zählens
Tausender-Trenner (counter() kennt keine) - mit js/count-up.js zählt stattdessen das
Script, per Intl.NumberFormat sprachrichtig formatiert ("12.500" bzw. "12,500").

Wann es zählt:
  Chromium (CSS scroll-triggered animations, timeline-trigger): zeitbasiert, einmal,
    sobald die Zahl zu 20% im Bild ist - reines CSS.
  view-timeline ohne Trigger (Safari 26): reines CSS, die Zahl folgt der Scroll-
    Position (scroll-gescrubbt). Mit js/count-up.js (data-ncss-count-up) stattdessen
    ebenfalls zeitbasiert per IntersectionObserver.
  Sonst: mit js/count-up.js zeitbasiert, ohne JS einfach die fertige Zahl.
prefers-reduced-motion / Forced Colors / Druck: die fertige Zahl, keine Animation.

Benötigt: tokens.css (--ncss-motion-easing-emphasized). Optional js/count-up.js.
```

### `components/countdown.css`

Klassen (8): `.ncss-countdown--compact` `.ncss-countdown-done` `.ncss-countdown-fallback` `.ncss-countdown-label` `.ncss-countdown-sr` `.ncss-countdown-unit` `.ncss-countdown-units` `.ncss-countdown-value`

```text
ncss - Countdown <ncss-countdown> (Layer "components"), JS: js/countdown.js.
Braucht colors.css + tokens.css (+ reset/base).

Markup (der Inhalt ist zugleich der Fallback ohne JS - ein normales Datum):
  <ncss-countdown class="ncss-countdown" datetime="2026-12-24T18:00:00+01:00">
    <time datetime="2026-12-24T18:00:00+01:00">24. Dezember 2026, 18:00 Uhr</time>
  </ncss-countdown>
Optional: data-ncss-units="days hours minutes", data-ncss-done-text="Jetzt live!",
data-ncss-announce="minute" - siehe js/countdown.js.
--compact: Ziffern und Einheit in einer Zeile ("3 Tage 04 Stunden ...") statt Kacheln.
```

### `components/cover.css`

Klassen (2): `.ncss-cover` `.ncss-cover-container`

```text
ncss - Cover-Komponente (Layer "components"). Ein eingebettetes Element füllt seinen
Container VOLLSTÄNDIG aus, unabhängig vom eigenen Seitenverhältnis - überschüssiger
Bildinhalt wird beschnitten, nie gestaucht/verzerrt. Für <img>/<video> gibt es dafür
bereits die einfachere, native Lösung (object-fit:cover - siehe .ncss-img-cover in
helpers/media.css, .ncss-video in components/video.css) - DIESE Komponente ist
speziell für <iframe> gedacht (YouTube/Vimeo/Google-Maps-Embeds), wo object-fit in
den meisten Browsern NICHT zuverlässig auf das eingebettete Dokument wirkt.

Technik: das klassische "min-width/min-height:100% + width/height:auto + zentriert"-
Muster - KEIN object-fit. Wichtig, per echtem Test bestätigt: das Element braucht eine
EXPLIZITE aspect-ratio (hier: --ncss-aspect-video als Default, pro Instanz mit
style="aspect-ratio: ..." überschreibbar) - sich auf die width/height-HTML-Attribute
eines <iframe> zu verlassen (der übliche erste Versuch) lieferte bei einem absolut
positionierten Element KEIN seitenverhältnis-treues Ergebnis (quadratisch verzerrt
statt zugeschnitten, in Chromium nachgestellt) - eine CSS-aspect-ratio ist die
zuverlässige Ratio-Quelle für dieses Muster, keine HTML-Attribute.

Markup:
  <div class="ncss-cover-container" style="height: 20rem;">
    <iframe class="ncss-cover" src="https://www.youtube.com/embed/..." title="..."
            allowfullscreen></iframe>
  </div>
Höhe kommt vom CONTAINER (fixe Höhe, %, oder z.B. innerhalb eines .ncss-hero) - anders
als bei .ncss-ratio-video (das die Höhe selbst aus der Breite ABLEITET), braucht
.ncss-cover-container eine eigene, von außen kommende Höhe, weil das eingebettete
Element seinerseits beschnitten wird, nicht das Seitenverhältnis vorgibt.
```

### `components/curtain.css`

Klassen (4): `.ncss-curtain` `.ncss-curtain--dim` `.ncss-curtain--scale` `.ncss-snap-sections`

```text
ncss - Curtain-Sektionen (Layer "components"): Vollhöhe-Sektionen, bei denen die
jeweils NÄCHSTE Sektion wie ein Vorhang über die vorherige gleitet - die bedeckte
Sektion bleibt dabei optisch stehen und kann zusätzlich zurückweichen (--scale) und/
oder abdunkeln (--dim).

Abgrenzung zu verwandten Bausteinen:
- .ncss-snap-sections (helpers/scroll.css): rastet Sektion für Sektion ein, aber jede
  Sektion scrollt ganz normal weg. Beide lassen sich KOMBINIEREN (class="ncss-snap-
  sections ncss-curtain") - Einrasten + Vorhang-Effekt, siehe unten.
- .ncss-stack-section (components/scroll-stack.css): EINE gepinnte Bühne, in der
  Karten übereinander gleiten - hier dagegen echte, beliebig lange Seiten-Sektionen,
  jede mit eigenem Scroll-Abschnitt.

Bewusst KEIN position:sticky: eine sticky Sektion, die höher als der Viewport ist,
würde ihren unteren Teil nie zeigen (er klebt fest, bevor man ihn sieht). Stattdessen
wird die bedeckte Sektion während ihrer exit-Phase (animation-range: exit) per
translate um genau die gescrollte Strecke nach unten geschoben - sie wirkt dadurch
stillstehend, auch eine Überlänge-Sektion hält erst an, sobald ihre Unterkante
erreicht ist (kein Inhalt geht verloren). min(100%, 100dvh) = Länge der exit-Phase
(eigene Höhe, aber höchstens eine Viewport-Höhe).

Markup (jedes DIREKTE Kind ist eine Sektion):
  <div class="ncss-curtain ncss-curtain--scale ncss-curtain--dim">
    <section class="ncss-surface--brand">...</section>
    <section class="ncss-surface--neutral">...</section>
    <section>...</section>
  </div>

WICHTIG: jede Sektion braucht eine BLICKDICHTE Hintergrundfarbe (z.B. eine
.ncss-surface--...-Klasse direkt auf der Sektion) - sonst scheint die bedeckte
Sektion durch. Die Komponente setzt bewusst KEINEN eigenen Hintergrund: als
components-Regel würde er jede .ncss-surface-Helper-Klasse auf derselben Sektion per
Layer-Reihenfolge überstimmen (Text-Farbe der Surface bliebe, Fläche nicht - weißer
Text auf weißem Grund).

Ohne animation-timeline-Unterstützung und bei prefers-reduced-motion: die Sektionen
scrollen ganz normal nacheinander (kein Fehlerzustand, nur kein Vorhang).

Benötigt: tokens.css (--ncss-radius-lg, --ncss-border-width). Kombination mit
.ncss-snap-sections optional (helpers/scroll.css), nicht nötig.
```

### `components/dialog-close.css`

Klassen (1): `.ncss-dialog-close`

```text
ncss - Dialog-Close-Button (Layer "components"): geteilte Schließen-Button-Optik für
alle <dialog>-Komponenten (Modal, Off-Canvas) - eine Quelle statt mehrfach dupliziert.

Modular per Absicht: diese Klasse stylt nur die BUTTON-FLÄCHE (Position, Größe, Form,
Hover) - welches Icon darin sitzt, schreibt sie nicht vor. Default nutzt ncss' eigenes
SVG-Icon (helpers/icons.css, .ncss-icon-close), lässt sich aber 1:1 z.B. gegen Font
Awesome tauschen, ohne diese Datei anzufassen:

  <button type="button" class="ncss-dialog-close" command="close" commandfor="..."
          aria-label="Schließen">
    <span class="ncss-icon ncss-icon-close" aria-hidden="true"></span>   <!-- Default -->
    <i class="fa-solid fa-xmark" aria-hidden="true"></i>                 <!-- oder das -->
  </button>

Beides landet in derselben flex-zentrierten Fläche und übernimmt automatisch die
Textfarbe (currentColor) - font-size hier steuert bei BEIDEN Varianten die Icon-Größe.

Default-Position: innen oben rechts (passt zu Modal/Off-Canvas).
```

### `components/disclosure.css`

Klassen (1): `.ncss-disclosure`

```text
ncss - Disclosure-Komponente (Layer "components"): die "boxed FAQ"-Optik für natives
<details> - Rahmen, Padding, fettes Summary, Abstand im offenen Zustand. Explizit
opt-in per Klasse statt jedem <details> aufgezwungen (das würde andere Komponenten, die
dasselbe native Element für etwas anderes nutzen - z.B. components/nav.css' Dropdown -
zwingen, diese Meinung erst wieder wegzuresetten).

Markup: <details class="ncss-disclosure"><summary>Frage</summary><p>Antwort</p></details>
```

### `components/downloads.css`

Klassen (6): `.ncss-downloads-action` `.ncss-downloads-body` `.ncss-downloads-item` `.ncss-downloads-list` `.ncss-downloads-title` `.ncss-downloads-type`

```text
ncss - Downloads-Widget (Layer "components"): Styling für die Dateiliste aus
downloads.js. Eigenständige Komponente statt Wiederverwendung von .ncss-card - eine
Downloadliste ist strukturell eine Liste (kein Karten-Raster), .ncss-events-empty
(events.css) wird für den Leerzustand mitgenutzt statt dupliziert.
```

### `components/dropzone.css`

Klassen (10): `.ncss-dropzone-area` `.ncss-dropzone-error` `.ncss-dropzone-file` `.ncss-dropzone-hint` `.ncss-dropzone-list` `.ncss-dropzone-name` `.ncss-dropzone-remove` `.ncss-dropzone-size` `.ncss-dropzone-status` `.ncss-dropzone-thumb`

```text
ncss - Upload-Fläche <ncss-dropzone> (Layer "components"), JS: js/dropzone.js.
Light-DOM-Custom-Element um ein ECHTES <input type="file"> - ohne JS (oder ohne
DataTransfer-Konstruktor, siehe Script) bleibt das native Feld sichtbar und voll
funktionsfähig, inklusive Formular-Versand; Drag & Drop auf das native Feld kann der
Browser selbst. Braucht colors.css + tokens.css (+ reset/base).

Markup:
  <ncss-dropzone class="ncss-dropzone">
    <label class="ncss-dropzone-area">
      <span class="ncss-dropzone-text"><strong>Dateien hierher ziehen</strong> oder klicken zum Auswählen</span>
      <span class="ncss-dropzone-hint">PDF oder Bild, max. 10 MB</span>
      <input type="file" name="belege" multiple accept="image/png,image/jpeg,.pdf">
    </label>
  </ncss-dropzone>
Das Script hängt eine Dateiliste (.ncss-dropzone-list) mit Vorschau + Entfernen-Button
und eine Live-Region für die Ansage an.
```

### `components/effects.css`

Klassen (6): `.ncss-glass` `.ncss-glow-border` `.ncss-glow-pulse` `.ncss-grain` `.ncss-stamped` `.ncss-stamped--press`

```text
ncss - Effekt-Komponenten (Layer "components"): animierter Verlaufsrahmen (Glow-Border),
pulsierendes Leuchten (Glow-Pulse) und Glassmorphism (Glass) - rein dekorativ, bewusst
OPTIONAL (eigene Klassen zum Zukombinieren, kein Bestandteil von .ncss-card/-btn o.ä.).
Demo: demo/effects.html.

.ncss-glow-border braucht KEIN zusätzliches Markup (kein Wrapper-<span> wie im
klassischen "Siri-Button"-Trick, keine zweite Hintergrundfarbe für die Mitte nötig):
ein ::before mit einem echten "Loch" in der Mitte (mask-composite: exclude schneidet
die content-box aus der padding-box heraus) zeichnet NUR den rotierenden
conic-gradient()-Ring, die Mitte bleibt vollständig transparent - der eigene Inhalt des
Elements bleibt unberührt sichtbar, unabhängig von dessen eigenem Hintergrund.
(Der naheliegendere Ansatz - ein ::before mit negativem z-index als "Rahmen dahinter" -
funktioniert NICHT: laut Stacking-Reihenfolge malen negative z-index-Nachfahren VOR dem
eigenen Hintergrund des Elements, nicht danach - der "Rahmen" würde die komplette Fläche
überdecken statt nur den Rand, per echtem Test gefunden.) Funktioniert auf JEDEM Element
mit border-radius (Button, Card, Input-Wrapper, ...), nicht nur auf einer eigens dafür
gebauten Komponente.

prefers-reduced-motion: reduce wird bereits GLOBAL in reset.css respektiert (Animation
läuft dann nur noch 1 Frame) - keine eigene Media Query hier nötig.
```

### `components/empty-state.css`

Klassen (5): `.ncss-empty` `.ncss-empty--compact` `.ncss-empty-actions` `.ncss-empty-icon` `.ncss-empty-title`

```text
ncss - Leerzustand (Layer "components"): "Noch keine Einträge", "Keine Treffer",
"Alles erledigt" - zentrierter Hinweis mit optionalem Icon und Aktion statt einer
stummen, leeren Fläche. Reines CSS. Braucht colors.css + tokens.css (+ reset/base);
Buttons darin kommen aus helpers/forms.css (.ncss-btn).

Markup:
  <div class="ncss-empty">
    <span class="ncss-empty-icon" aria-hidden="true"><svg>...</svg></span>
    <h3 class="ncss-empty-title">Keine offenen Tickets</h3>
    <p>Neue Meldungen von Mietern erscheinen hier automatisch.</p>
    <div class="ncss-empty-actions">
      <a class="ncss-btn ncss-btn--primary" href="#neu">Ticket anlegen</a>
    </div>
  </div>
Wird der Leerzustand erst NACH einer Aktion sichtbar (Filter ergibt nichts, Liste per
fetch geleert), role="status" auf .ncss-empty setzen, damit Screenreader den Wechsel
ansagen. Überschriften-Ebene passend zur Umgebung wählen - die Klasse bestimmt nur die
Optik. Rahmen (z.B. gestrichelt) bewusst nicht eingebaut, siehe helpers/elevation.css.
```

### `components/events.css`

Klassen (22): `.ncss-agenda-group-title` `.ncss-agenda-item` `.ncss-agenda-list` `.ncss-agenda-title` `.ncss-btn` `.ncss-cal-day` `.ncss-cal-day--other-month` `.ncss-cal-day--today` `.ncss-cal-day-btn` `.ncss-cal-day-btn--empty` `.ncss-cal-day-dot` `.ncss-cal-day-more` `.ncss-cal-day-number` `.ncss-cal-grid` `.ncss-cal-header` `.ncss-cal-weekday` `.ncss-event-date` `.ncss-event-date-day` `.ncss-event-date-month` `.ncss-event-featured` `.ncss-event-title` `.ncss-events-empty`

```text
ncss - Events-Widget (Layer "components"): Styling für die vier Ansichten aus
events.js (Monatsraster/Agenda/Liste/Einzeltermin). Nutzt bewusst bereits vorhandene
Komponenten wo möglich (.ncss-card für Liste/Einzeltermin, .ncss-modal für den
Tages-Dialog im Monatsraster) - hier nur, was diese Komponenten NICHT schon
mitbringen: das Monatsraster selbst und den Tages-/Monats-Mini-Badge
(.ncss-event-date), den .ncss-badge (einzeilige Pille) nicht abdeckt.
```

### `components/expand-panels.css`

Klassen (6): `.ncss-expand-panel` `.ncss-expand-panel--active` `.ncss-expand-panel-body` `.ncss-expand-panel-media` `.ncss-expand-panel-title` `.ncss-expand-panels`

```text
ncss - Aufklapp-Panels (Layer "components"): eine Reihe Bild-Panels, das überfahrene/
fokussierte (sonst das aktive) Panel wächst in die Breite und zeigt Zusatztext. Reines
CSS (flex-grow-Transition + :has()), kein JS. In schmalen Containern stapeln sich die
Panels untereinander und wachsen stattdessen in der Höhe (Container Query, kein
Viewport-Breakpoint).

Markup:
<div class="ncss-expand-panels">
  <a class="ncss-expand-panel ncss-expand-panel--active" href="/alpen">
    <span class="ncss-expand-panel-media"><img src="alpen.jpg" alt=""></span>
    <span class="ncss-expand-panel-title">Alpen</span>
    <span class="ncss-expand-panel-body">Sechs Touren über 3000 m.</span>
  </a>
  ...
</div>
Panels sind <a> oder <button> (oder ein Element mit fokussierbarem Kind) - so erreicht
die Tastatur jedes Panel und :focus-visible/:focus-within klappt es auf. Aktiv (wenn
nichts überfahren/fokussiert ist): .ncss-expand-panel--active oder aria-current.

Touch: kein :hover - ein Tap fokussiert/aktiviert den Link ohnehin; für eine reine
Galerie ohne Ziel-URL <button>-Panels nehmen, :focus-within klappt sie dann per Tap auf.

Abhängigkeiten (Cherry-Picking): nur tokens.css/colors.css (+ reset/base).

Tokens: --ncss-expand-height (Zeilenhöhe, Default 24rem), --ncss-expand-grow (Faktor des
offenen Panels, Default 4), --ncss-expand-collapsed / --ncss-expand-expanded (Höhen im
gestapelten Zustand, Default 4.5rem / 16rem). Stapelt unter 36rem Containerbreite.
```

### `components/floating-label.css`

Klassen (5): `.ncss-field--floating` `.ncss-input` `.ncss-label` `.ncss-select` `.ncss-textarea`

```text
ncss - Schwebende Beschriftung (Layer "components"): das Label sitzt wie ein
Platzhalter IM leeren Feld und rutscht beim Fokus/Ausfüllen an die obere Kante. Reines
CSS über :has() + :placeholder-shown. Baut auf helpers/forms.css (.ncss-field/
.ncss-input/.ncss-select/.ncss-textarea) auf.

Markup - das <label> bleibt ein ECHTES Label (for/id), kein Platzhalter-Ersatz
(placeholder ist kein Label, siehe Skill "Barrierefreiheit"). placeholder=" " (ein
Leerzeichen) ist Pflicht: nur so kann CSS "Feld ist leer" per :placeholder-shown
erkennen. Ein echter Beispieltext darf stattdessen drinstehen - er wird erst beim Fokus
sichtbar, wenn das Label bereits oben ist.
  <div class="ncss-field ncss-field--floating">
    <label class="ncss-label" for="ort">Ort</label>
    <input class="ncss-input" id="ort" name="ort" placeholder=" ">
  </div>
Hinweis-/Fehlertext (.ncss-field-hint/-error) einfach NACH dem Feld anhängen.

Fallback ohne :has() (ältere Browser): das Label steht dauerhaft klein oben IM Feld -
immer lesbar, nur ohne die Platzhalter-Optik. <select> hat keinen "leeren" Zustand im
Sinne von :placeholder-shown - dort bleibt das Label immer oben.
```

### `components/footer.css`

Klassen (3): `.ncss-footer` `.ncss-footer-bottom` `.ncss-footer-inner`

```text
ncss - Footer-Komponente (Layer "components"). Nutzt dieselben Bausteine wie der Rest
des Systems (Container, Grid, Stack) statt eigener Layout-Logik. Für "immer am unteren
Bildschirmrand, auch bei kurzen Seiten" siehe .ncss-page-shell/.ncss-stretch in
helpers/layout.css - das ist eine Seiten-Layout-Frage, keine Footer-Eigenschaft, deshalb
dort statt hier.

Markup:
<footer class="ncss-footer">
  <div class="ncss-footer-inner ncss-grid" style="--ncss-grid-min: 12rem;">
    <div class="ncss-stack ncss-stack--tight">
      <strong>Marke</strong>
      <p class="ncss-text-sm ncss-text-muted">Kurzbeschreibung.</p>
    </div>
    <nav class="ncss-nav ncss-nav--tree">
      <ul class="ncss-nav-list"><li class="ncss-nav-item"><a href="#">Link</a></li></ul>
    </nav>
  </div>
  <div class="ncss-footer-bottom">© 2026 Firma</div>
</footer>
```

### `components/hero.css`

Klassen (6): `.ncss-hero` `.ncss-hero--parallax` `.ncss-hero-content` `.ncss-hero-content--filled` `.ncss-hero-content--transparent` `.ncss-hero-media`

```text
ncss - Hero-Sektion (Layer "components"): Bild-Hintergrund, auf dem andere Elemente
(Überschrift, Text, Buttons) platziert werden - klassisches Seiten-Intro. Zwei
unabhängige Achsen zum Kombinieren:
  1. Inhalts-Panel: .ncss-hero-content--transparent (Standard, Text direkt auf dem Bild,
     mit Verlaufs-Scrim für Lesbarkeit) oder --filled (blickdichte Karte obenauf).
  2. Bewegung: normal (statisch) oder .ncss-hero--parallax (Bild bewegt sich beim Scrollen
     langsamer als der Inhalt).

Markup:
  <section class="ncss-hero">
    <div class="ncss-hero-media" style="background-image: url(bild.jpg)"></div>
    <div class="ncss-hero-content ncss-hero-content--filled">
      <h2>Überschrift</h2>
      <p>Text...</p>
    </div>
  </section>

Bewusst per CSS background-image auf .ncss-hero-media statt <img> - das Bild ist hier rein
dekorativ (die eigentliche Aussage steckt im überlagerten Text), ein <img> bräuchte sonst
ein leeres/redundantes alt="". Trägt der Hero-Inhalt selbst Informationswert als Bild
(Foto mit Nachrichtenwert etc.), lieber ein echtes <img> mit alt-Text in .ncss-hero-media
einsetzen statt background-image.

WICHTIG - background-image bewusst NICHT über eine Custom Property gereicht (anders als
z.B. --ncss-grid-min/--ncss-focus-point): relative url()-Werte INNERHALB einer Custom
Property lösen sich gegen die Basis-URL des Stylesheets auf, das die Property per var()
KONSUMIERT (hier: diese Datei, components/hero.css) - nicht gegen die HTML-Seite, die die
Property gesetzt hat. Ein style="--ncss-hero-image: url(bild.jpg)" auf der Seite hätte
also fälschlich versucht, das Bild relativ zu components/ zu laden (per echtem Test als
404 entlarvt). background-image direkt inline auf .ncss-hero-media gesetzt umgeht das,
weil ein inline style="..." ganz normal gegen die HTML-Seite selbst auflöst.
```

### `components/hovercard.css`

Klassen (6): `.ncss-hovercard` `.ncss-hovercard-avatar` `.ncss-hovercard-header` `.ncss-hovercard-meta` `.ncss-hovercard-text` `.ncss-hovercard-title`

```text
ncss - <ncss-hovercard>: Vorschaukarte (Profil, Link-Vorschau), die beim Überfahren oder
Fokussieren eines Links erscheint (Layer "components"). Die Karte ist ein [popover]
(Top Layer, kein z-index-Kampf), positioniert per CSS Anchor Positioning unter dem Link
(klappt bei Platzmangel automatisch nach oben/zur anderen Seite).

Markup - Karte DIREKT nach dem Link, damit Tab ihre Links als nächstes erreicht. In
Fließtext (<p>) ein <span> als Karte nehmen (kein <div> in <p>), und KEINEN Zeilenumbruch
zwischen </a>, Karte und </ncss-hovercard> - der Leerraum bliebe sonst als sichtbares
Leerzeichen vor dem folgenden Satzzeichen stehen (die Karte selbst liegt im Top Layer):
<ncss-hovercard>
  <a href="/team/ada" interestfor="hc-ada">Ada Lovelace</a><span id="hc-ada" class="ncss-hovercard" popover="hint">
    <span class="ncss-hovercard-header">
      <span class="ncss-hovercard-avatar" aria-hidden="true">AL</span>
      <span><strong class="ncss-hovercard-title">Ada Lovelace</strong>
            <span class="ncss-hovercard-meta">Mathematikerin</span></span>
    </span>
    <span class="ncss-hovercard-text">Schrieb den ersten Algorithmus ...</span>
  </span></ncss-hovercard>
<script src="js/hovercard.js" defer></script>

Drei Pfade:
1. Nativ, ganz ohne JS (Chromium mit interestfor): Browser übernimmt Hover, Fokus,
   Verzögerung (interest-delay unten), Esc und Long-Press auf Touch. Der Link wird dabei
   automatisch zum Anker der Karte (implizites Anchoring), kein anchor-name nötig.
2. js/hovercard.js, wo interestfor fehlt: Hover/Tastatur-Fokus mit Verzögerung, Karte
   bleibt offen, solange Zeiger oder Fokus darin sind (WCAG 1.4.13), Esc schließt.
   Positionierung per Anchor Positioning (Anker-Namen setzt das Script) - ohne Anchor
   Positioning rechnet das Script die Position selbst aus.
3. Weder JS noch interestfor: Karte bleibt verborgen, der Link funktioniert normal.

Abhängigkeiten (Cherry-Picking): nur tokens.css/colors.css (+ reset/base). Optional
js/hovercard.js - eigenständig, nutzt keine andere ncss-Datei.

Tokens: --ncss-hovercard-width (Default 20rem), --ncss-hovercard-offset (Abstand zum
Link, Default --ncss-space-2xs).
```

### `components/input-group.css`

Klassen (4): `.ncss-btn` `.ncss-input` `.ncss-input-group` `.ncss-textarea`

```text
ncss - Input-Group (Layer "components"): visuell zu EINER Einheit verschmolzene
Formular-Steuerelemente (z.B. Suchfeld + Button, Vorname + Nachname nebeneinander) -
geteilte Rahmenlinie statt Lücke zwischen den Elementen, nur die äußeren Ecken rund.

Bewusst NICHT "Form-Group" genannt - das wäre mit der bereits bestehenden
<fieldset>/<legend>-Gruppierung (semantisches Zusammenfassen mehrerer Felder, siehe
demo/forms.html) leicht zu verwechseln, obwohl es ein völlig anderes Konzept ist (rein
visuelle Verschmelzung, keine Semantik dahinter). "Input Group" ist der in anderen
CSS-Frameworks etablierte Begriff für genau dieses Muster.

Markup:
  <div class="ncss-input-group">
    <input class="ncss-input" type="search" placeholder="Suchen...">
    <button type="submit" class="ncss-btn ncss-btn--primary">Suchen</button>
  </div>
  <div class="ncss-input-group">
    <input class="ncss-input" placeholder="Vorname">
    <input class="ncss-input" placeholder="Nachname">
  </div>

Deckt aktuell `.ncss-input`/`-textarea`/`.ncss-btn` als direkte Kinder ab - die beiden
genannten Fälle (Eingabefeld + Button, zwei Felder nebeneinander). `.ncss-select-
wrapper` NICHT unterstützt: der sichtbare Rahmen sitzt am inneren `<select>`, nicht am
Wrapper selbst - bräuchte eigene Verschachtelungsregeln, noch keine konkrete
Notwendigkeit dafür, bei Bedarf ergänzen statt vorsorglich mitbauen.
```

### `components/kbd.css`

Klassen (2): `.ncss-kbd` `.ncss-kbd-combo`

```text
ncss - Tastenkappe (Layer "components"): <kbd> als echte Taste statt nur Monospace-
Fläche. Bewusst OPT-IN per Klasse, nicht auf jedes <kbd> - base.css stylt <kbd>
bereits schlicht wie <code>, und bestehende Stellen (z.B. die Fußzeile von
components/command-palette.css) sollen sich nicht ungefragt ändern. Reines CSS, braucht
colors.css + tokens.css (+ reset/base).

Markup:
  <kbd class="ncss-kbd">Esc</kbd>
  Tastenkombination - die äußere <kbd> umfasst die Einzeltasten (HTML-Spec-Muster):
  <kbd class="ncss-kbd-combo"><kbd class="ncss-kbd">Strg</kbd>+<kbd class="ncss-kbd">K</kbd></kbd>
Symbol-Tasten (⌘, ⇧, ↵) für Screenreader per <abbr title="Befehlstaste">⌘</abbr> oder
aria-label ausschreiben - das Glyph allein wird oft gar nicht oder falsch vorgelesen.
```

### `components/lightbox.css`

Klassen (8): `.ncss-icon` `.ncss-lightbox` `.ncss-lightbox-bar` `.ncss-lightbox-caption` `.ncss-lightbox-count` `.ncss-lightbox-figure` `.ncss-lightbox-next` `.ncss-lightbox-prev`

```text
ncss - Lightbox-Galerie (Layer "components"): Galerie-Navigation für die bestehende
Modal-Lightbox (.ncss-modal--fullscreen + --dark, siehe modal.css). KEIN zweiter
Dialog-Typ - das Grundprinzip aus modal.css ("eine Lightbox ist nur ein Modal mit
anderer Darstellung") bleibt bestehen; diese Datei ergänzt nur, was ein einzelnes Bild-
Modal nicht kann: mehrere Bilder einer Gruppe durchblättern (Vor/Zurück, Pfeiltasten,
Wischgeste), Zähler, Bildunterschrift.

Markup - nur die Auslöser-Links, das <dialog> erzeugt js/lightbox.js einmalig:
<a href="gross-1.jpg" data-ncss-lightbox="ausstellung" data-caption="Titel, 2024">
  <img src="klein-1.jpg" alt="Titel, 2024">
</a>
Gleicher Wert in data-ncss-lightbox = eine Gruppe. Ohne JavaScript öffnet der Link
einfach das große Bild (Progressive Enhancement, kein Funktionsverlust).

Das erzeugte <dialog> trägt "ncss-modal ncss-modal--fullscreen ncss-modal--dark
ncss-lightbox" - Öffnen/Schließen-Animation, Backdrop, dunkle Darstellung unabhängig vom
Seiten-Theme und der Fokus-Trap kommen damit unverändert aus modal.css bzw. vom nativen
<dialog>, hier wird nur das Innenleben angeordnet.
```

### `components/lists.css`

Klassen (10): `.ncss-dl` `.ncss-dl--inline` `.ncss-dl--stats` `.ncss-icon` `.ncss-list--dash` `.ncss-list--divided` `.ncss-list--dot` `.ncss-list--icon` `.ncss-list--plain` `.ncss-list--steps`

```text
ncss - Listen-Komponente (Layer "components"). Fertige, dekorative Varianten für
native <ul>/<ol>/<dl> statt des nackten Browser-Default-Markers - reines CSS, kein
Markup-Umbau nötig (eine Ausnahme: role="list", siehe unten).

WICHTIG: list-style:none entfernt in einigen Screenreadern (bestätigter alter VoiceOver/
Safari-Bug) die Listen-SEMANTIK selbst, nicht nur die visuelle Markierung - jede Variante
hier, die list-style:none setzt, braucht deshalb zusätzlich role="list" im Markup (siehe
jeweiliges Beispiel in den Kommentaren unten).
```

### `components/livesearch.css`

Klassen (9): `.ncss-livesearch` `.ncss-livesearch-empty` `.ncss-livesearch-footer` `.ncss-livesearch-group` `.ncss-livesearch-list` `.ncss-livesearch-option` `.ncss-livesearch-results` `.ncss-livesearch-text` `.ncss-livesearch-title`

```text
ncss - Live-Suche (Layer "components"): Suchfeld mit Trefferliste vom Server während der
Eingabe, gruppiert (z.B. "Seiten", "Personen", "Termine"), komplett per Tastatur
bedienbar. Muster: WAI-ARIA Combobox mit Listbox-Popup
(https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) - anders als js/combobox.js, das
eine VORHANDENE <datalist>/<select>-Optionsliste filtert, kommen die Treffer hier erst
per fetch() vom Server (oder aus einer statischen JSON-Datei, siehe data-mode="client").

Markup - ein normales Suchformular; ohne JS bleibt es genau das (Absenden führt zur
Ergebnisseite, kein Funktionsverlust):
<form class="ncss-livesearch" action="/suche/" role="search"
      data-ncss-livesearch="/api/suche">
  <label class="ncss-visually-hidden" for="q">Suche</label>
  <input id="q" class="ncss-input" type="search" name="q" autocomplete="off">
  <div class="ncss-livesearch-results" hidden></div>
</form>
<script src="js/livesearch.js" defer></script>

Kombinierbar mit dem wachsenden Suchfeld aus search.css (.ncss-search) - die
Trefferliste ist mindestens so breit wie dessen ausgeklappter Zustand.
```

### `components/marginnote.css`

Klassen (4): `.ncss-marginnote-container` `.ncss-marginnote-end` `.ncss-marginnote-layout` `.ncss-marginnote-start`

```text
ncss - Marginnote-Komponente (Layer "components"): Bild ODER Text bricht aus der
Textspalte aus, landet aber NICHT am Bildschirmrand (das leistet schon
helpers/layout.css' .ncss-bleed-start/-end), sondern in der Randspalte NEBEN dem
Fließtext - Sidenote/Marginnote-Muster (bekannt von Tufte CSS, hier unabhängig
nachgebaut: reines CSS Grid statt fester Pixel-Ränder).

Technik: `.ncss-marginnote-layout` ist ein 3-Spalten-Grid (Randspalte / Textspalte /
Randspalte). IM RUHEZUSTAND (unterhalb der Container Query) deckelt die Textspalte bei
--ncss-container-max-narrow; `min(100%, ...)` sorgt dafür, dass sie auf schmalen
Containern automatisch 100% wird - die beiden Randspalten (`1fr`) schrumpfen dann von
selbst auf 0, ganz ohne eigene Media/Container Query dafür. Normale Kinder (Absätze
etc.) bleiben in der mittleren Spalte, `.ncss-marginnote-start/-end` springen erst AB
einer Mindestbreite des Grids (siehe Container Query unten) in die jeweilige
Randspalte, darunter bleiben sie ein normaler Block in der Textspalte (kein kaputter/
leerer Zustand). SOBALD die Randspalten aktiv werden, wird die Textspalte ZUSÄTZLICH
auf eine schmalere feste Breite umgestellt (statt weiter starr 45rem zu beanspruchen) -
das macht bewusst Platz für die Randspalten, statt ihnen nur die zufälligen Reste zu
überlassen (echtes Sidenote-Verhalten, kein Kompromiss). GRUND für diese zweite Stufe,
nicht bloß eine höhere Schwelle: in `docs-src/template.html`s Sidebar-Layout
(`.docs-layout { grid-template-columns: 15rem 1fr; }`) bleibt die Inhaltsspalte SELBST
bei sehr breitem Browserfenster bei ca. 53.5rem gedeckelt (die Sidebar frisst
dauerhaft Platz weg, unabhängig vom Viewport) - eine feste 45rem-Textspalte hätte dort
für die Randspalten nur ca. 4rem pro Seite übriggelassen (per echtem Test gefunden:
zu schmal, Notizen blieben unbrauchbar zusammengequetscht bzw. die Schwelle wurde in
diesem Kontext nie erreicht). Mit der schmaleren Textspalte im Breakout-Zustand bleiben
dort ca. 9-10rem pro Randspalte übrig - brauchbar für kurze bis mittlere Notizen.

WICHTIG - warum eine Marginnote automatisch NEBEN dem passenden Absatz landet, ohne
ihre Position selbst zu kennen: CSS Grids Auto-Placement platziert Elemente in
Dokumentreihenfolge und nutzt dabei dieselbe Zeile weiter, solange die eigene Spalte
darin noch frei ist (Spec: "sparse" packing, der Cursor bewegt sich nur vorwärts, nie
zurück) - eine Marginnote, die im Markup DIREKT NACH dem Absatz steht, zu dem sie
gehört, bekommt dadurch automatisch dieselbe Grid-Zeile wie dieser Absatz (eigene
Spalte, gleiche Zeile), rein durch Dokumentreihenfolge, ganz ohne grid-row oder JS (per
echtem Test bestätigt).

`justify-self`/`align-self` bewusst NICHT gesetzt (Default bleibt `stretch`): die Note
füllt dadurch ihre ganze Randspalte aus, ihre INNERE Kante liegt so immer exakt an der
Textspalte an (column-gap sorgt für den Abstand) - unabhängig davon, ob es die linke
oder rechte Randspalte ist, ganz ohne eigene start/end-Fallunterscheidung.

Markup ("end" = Randspalte in Leserichtung danach, meist rechts; "start" = davor, meist
links - logisch/schreibrichtungsbewusst wie bei .ncss-float-start/-end):
  <div class="ncss-marginnote-container">
    <div class="ncss-marginnote-layout">
      <p>Text, zu dem die Randnotiz gehört ...</p>
      <aside class="ncss-marginnote-end"><img src="foto.jpg" alt="..."></aside>
      <p>Nächster Absatz ...</p>
      <aside class="ncss-marginnote-start"><p>Eine reine Text-Randnotiz.</p></aside>
    </div>
  </div>
```

### `components/marquee.css`

Klassen (7): `.ncss-marquee` `.ncss-marquee--fade` `.ncss-marquee--fast` `.ncss-marquee--paused` `.ncss-marquee--reverse` `.ncss-marquee--slow` `.ncss-marquee-group`

```text
ncss - Marquee / Laufband (Layer "components"): endlos laufende Reihe für Logos oder
kurze Texte. Reines CSS: der Inhalt steht ZWEIMAL im Markup, die Kopie ist für
Hilfstechnik versteckt (aria-hidden + inert), beide Gruppen wandern um exakt eine
Gruppenbreite - dadurch nahtlos.

Markup:
  <div class="ncss-marquee">
    <ul class="ncss-marquee-group" role="list"> <li>...</li> ... </ul>
    <ul class="ncss-marquee-group" role="list" aria-hidden="true" inert> (dieselben) </ul>
  </div>
Nur EINE Gruppe geschrieben? data-ncss-marquee (js/marquee.js) erzeugt die Kopie.

Modifier: --reverse (andere Richtung), --slow/--fast (Dauer x2 / x0,5), --fade (weiche
Ränder per mask), --paused (angehalten, z.B. per Pause-Button - js/marquee.js
verdrahtet <button data-ncss-marquee-toggle aria-controls="id">).
Parameter: --ncss-marquee-duration (30s, eine Runde), --ncss-marquee-gap.

Hält an bei Hover (nur echte Zeigegeräte) und solange etwas darin Fokus hat.
WCAG 2.2.2 (Pause, Stop, Hide): Bewegung > 5 s braucht einen Stopp-Mechanismus -
Hover/Fokus allein reicht nicht für Touch, deshalb für Inhalte mit Aussage den
Pause-Button setzen.
prefers-reduced-motion und Druck: keine Bewegung, Kopie ausgeblendet, die Reihe ist
stattdessen ganz normal horizontal scrollbar.

Benötigt: tokens.css. Optional js/marquee.js.
```

### `components/modal.css`

Klassen (13): `.ncss-modal` `.ncss-modal--3d` `.ncss-modal--3d-flip` `.ncss-modal--3d-swing` `.ncss-modal--dark` `.ncss-modal--fullscreen` `.ncss-modal--slide-down` `.ncss-modal--slide-left` `.ncss-modal--slide-right` `.ncss-modal--slide-up` `.ncss-modal--zoom` `.ncss-modal-footer` `.ncss-modal-header`

```text
ncss - Modal-Komponente (Layer "components"): natives <dialog>, zentriert, als
"Karte mit Schatten" - für Bestätigungen/Formulare/Hinweise. Für seitlich einschiebende
Panels siehe stattdessen components/off-canvas.css - beide nutzen dasselbe native
<dialog> + command/commandfor, aber mit bewusst UNTERSCHIEDLICHER Optik (deshalb keine
Meinung dazu in base.css, siehe dort).

KEINE eigene Lightbox-Komponente: eine Lightbox ist konzeptionell nur ein Modal mit
anderer Darstellung (Vollbild, dunkel) - siehe .ncss-modal--fullscreen/--dark unten,
statt eine zweite, fast identische <dialog>-Komponente zu pflegen. Mehrere Bilder
durchblättern (Galerie): components/lightbox.css + js/lightbox.js setzen genau auf
diese beiden Varianten auf, ohne eigenen Dialog-Typ.

Markup (Standard):
<button type="button" command="show-modal" commandfor="modal1">Öffnen</button>
<dialog id="modal1" class="ncss-modal">
  <button type="button" class="ncss-dialog-close" command="close" commandfor="modal1"
          aria-label="Schließen">&times;</button>
  <div class="ncss-modal-header"><h3>Titel</h3></div>
  <div class="ncss-modal-body">Inhalt</div>
  <div class="ncss-modal-footer">
    <button type="button" class="ncss-btn ncss-btn--secondary" command="close"
            commandfor="modal1">Abbrechen</button>
    <button type="button" class="ncss-btn ncss-btn--primary">Bestätigen</button>
  </div>
</dialog>

Markup (Lightbox-artig, Bild):
<dialog id="modal2" class="ncss-modal ncss-modal--fullscreen ncss-modal--dark">
  <button type="button" class="ncss-dialog-close" command="close" commandfor="modal2"
          aria-label="Schließen">&times;</button>
  <img src="full.jpg" alt="Beschreibung">
</dialog>
Klick daneben (Backdrop) schließt: natives closedby="any" am <dialog> - js/dialog-light-
dismiss.js setzt das für jedes ncss-Modal/-Off-Canvas ohne eigenes closedby automatisch
(Default AN) und emuliert es in Browsern ohne closedby. Abschalten pro Dialog:
closedby="closerequest" (nur Esc + Buttons) oder closedby="none" (nur Buttons, z.B. lange
Formulare). Trefferfläche: der <dialog> selbst ist das Panel, alles außerhalb seiner Box
ist Backdrop.
```

### `components/nav-drilldown.css`

Klassen (7): `.ncss-nav-drill-active` `.ncss-nav-drill-back` `.ncss-nav-drill-track` `.ncss-nav-dropdown` `.ncss-nav-item` `.ncss-nav-list` `.ncss-nav-submenu`

```text
ncss - Slide-Drilldown-Navigation (Custom Element <ncss-nav-drilldown>, Layer
"components"). OPT-IN Erweiterung von components/nav.css/off-canvas.css für tief
verschachtelte mobile Menüs: statt eines Untermenüs, das INLINE aufklappt (Standard-
.ncss-nav-dropdown-Verhalten), schiebt sich beim Antippen eines Elternpunkts das
GANZE Panel auf die Kindpunkte um (wie iOS-Einstellungen/native App-Menüs), mit
einem "Zurück"-Punkt oben, der wieder zurückschiebt.

Einbindung (zusätzlich zu ncss.css/theme.css):
  <link rel="stylesheet" href="dist/components/nav-drilldown.css">
  <script src="dist/js/nav-drilldown.js" defer></script>

Markup: IDENTISCH zum normalen verschachtelten Dropdown (siehe components/nav.css) -
nur die bestehende <ul class="ncss-nav-list"> zusätzlich in <ncss-nav-drilldown>
wrappen, sonst keine Änderung:
  <dialog class="ncss-nav-panel ncss-offcanvas ncss-offcanvas--start">
    <button class="ncss-dialog-close" command="close" commandfor="navPanel" ...>...</button>
    <ncss-nav-drilldown>
      <ul class="ncss-nav-list">
        <li class="ncss-nav-item"><a href="/">Start</a></li>
        <li class="ncss-nav-item">
          <details class="ncss-nav-dropdown">
            <summary>Produkte</summary>
            <ul class="ncss-nav-submenu">
              <li><a href="/produkte/a">Produkt A</a></li>
              <li><a href="/produkte/b">Produkt B</a></li>
            </ul>
          </details>
        </li>
      </ul>
    </ncss-nav-drilldown>
  </dialog>
Elternpunkt zusätzlich als eigene Seite aufrufbar: genau wie bei der normalen
Dropdown-Komponente einen echten <a> in <summary> setzen (siehe Kommentar dort) -
funktioniert hier unverändert mit, ein Klick auf den Link navigiert normal, ein Klick
auf den Chevron drillt rein.

NUR für die MOBILE Off-Canvas-Ansicht relevant - auf Desktop (wo .ncss-nav-panel
display:contents ist, siehe nav.css) bleibt die Struktur ein normaler, inline
aufklappender Dropdown, kein Slide-Verhalten (ergibt dort auch keinen Sinn, genug
horizontaler Platz vorhanden).

OHNE JS (oder bevor die Definition geladen ist): reiner Passthrough, keine
Funktionseinbuße - die verschachtelten <details>/<summary> klappen normal INLINE
auf, wie es components/nav.css ohnehin schon vorsieht.
```

### `components/nav-priority.css`

Klassen (11): `.ncss-dialog-close` `.ncss-nav` `.ncss-nav-dropdown` `.ncss-nav-dropdown--nested` `.ncss-nav-item` `.ncss-nav-list` `.ncss-nav-more` `.ncss-nav-panel` `.ncss-nav-submenu` `.ncss-nav-toggle` `.ncss-topbar-inner`

```text
ncss - Priority-Navigation (Custom Element <ncss-nav-priority>, Layer "components").
OPT-IN Erweiterung von components/nav.css für VIELE Navigationspunkte, die nicht
mehr in eine Zeile passen: Punkte werden automatisch, per ResizeObserver, in ein
"Mehr"-Dropdown verschoben - dasselbe .ncss-nav-dropdown/-submenu-Markup, das
nav.css bereits für gewöhnliche Untermenüs stylt, kein neues Optik-System nötig.
Für kurze Pills/Tags ohne Kollabier-Bedarf siehe stattdessen die reine CSS-Variante
`.ncss-nav--scroll` in nav.css.

Einbindung (zusätzlich zu ncss.css/theme.css, NICHT Teil von ncss.css selbst - wie
page-transitions.css oder combobox.js ein bewusst separates Opt-in):
  <link rel="stylesheet" href="dist/components/nav-priority.css">
  <script src="dist/js/nav-priority.js" defer></script>

Markup: identisch zur normalen .ncss-nav (siehe components/nav.css), nur die
bestehende <ul class="ncss-nav-list"> zusätzlich in <ncss-nav-priority> wrappen:
  <nav class="ncss-nav">
    <button type="button" class="ncss-nav-toggle" command="show-modal"
            commandfor="navPanel" aria-label="Menü öffnen">☰</button>
    <dialog id="navPanel" class="ncss-nav-panel ncss-offcanvas ncss-offcanvas--start">
      <button type="button" class="ncss-dialog-close" command="close"
              commandfor="navPanel" aria-label="Menü schließen">&times;</button>
      <ncss-nav-priority>
        <ul class="ncss-nav-list">
          <li class="ncss-nav-item"><a href="/">Start</a></li>
          <li class="ncss-nav-item"><a href="/a">Punkt A</a></li>
          ... (beliebig viele weitere - funktioniert für JEDE Anzahl)
        </ul>
      </ncss-nav-priority>
    </dialog>
  </nav>
Optionale Attribute auf <ncss-nav-priority>: `more-text="Mehr"` (Label),
`more-label="Weitere Punkte"` (aria-label für Screenreader).

Funktioniert bei JEDER Breite, KEIN fester Breakpoint im Code (User-Vorgabe, siehe
Doku-Kommentar oben) - anders als eine normale .ncss-nav übernimmt eine .ncss-nav,
die <ncss-nav-priority> enthält, die volle Verantwortung für JEDE Bildschirmbreite
selbst; der normale Toggle-Button/Off-Canvas-Mechanismus von nav.css (für "keine
Priority-Nav vorhanden") wird dafür unconditional deaktiviert, nicht nur oberhalb
einer Schwelle - kein Hamburger-Handoff, auch nicht auf sehr schmalen Bildschirmen
(dort kollabiert es einfach bis auf 0 sichtbare Punkte + "Mehr", das JS behandelt
diesen Fall bereits). ERSTE Fassung hatte hier einen `matchMedia`-Bypass unterhalb
1024px (auf die normale Off-Canvas-Ansicht umgeschaltet) - per User-Feedback wieder
entfernt: die Doku versprach von Anfang an "funktioniert für jede Punktzahl, kein
fester Breakpoint", der Bypass widersprach dem.

OHNE JS (oder bevor customElements die Definition geladen hat), UND OHNE
ResizeObserver (js/nav-priority.js registriert die Custom-Element-Definition
gezielt gar nicht erst, wenn `ResizeObserver` fehlt - sonst würde die Definition
trotzdem erfolgreich sein, `:defined` also greifen, nur ohne die Layout-Logik,
die den dadurch entstehenden display:block-Zustand wieder sinnvoll füllt):
reiner Passthrough (`display: contents`), keine Funktionseinbuße - .ncss-nav-list
zeigt alle Punkte normal per flex-wrap in mehreren Zeilen (unverändertes
Standard-.ncss-nav-Verhalten, siehe nav.css) - EINZIGE Ausnahme in jedem dieser
Fälle: der Toggle-Button bleibt trotzdem sichtbar (unten), weil die :has()-Regel
dafür an :defined hängt, nicht am bloßen Vorhandensein des (noch unverbundenen)
Elements.
```

### `components/nav.css`

Klassen (16): `.ncss-btn` `.ncss-dialog-close` `.ncss-divider--vertical` `.ncss-nav` `.ncss-nav--scroll` `.ncss-nav--tree` `.ncss-nav-dropdown` `.ncss-nav-dropdown--nested` `.ncss-nav-item` `.ncss-nav-list` `.ncss-nav-mega-col` `.ncss-nav-mega-heading` `.ncss-nav-panel` `.ncss-nav-submenu` `.ncss-nav-submenu--mega` `.ncss-nav-toggle`

```text
ncss - Navigation-Komponente (Layer "components"). Zwei Varianten:

1. .ncss-nav (horizontal, Desktop) - kollabiert unterhalb der Breakpoint-Konvention
   "nav-collapse" (64rem, siehe tokens.css) zu einem Hamburger-Button, der DASSELBE
   Markup als Off-Canvas-Sidebar öffnet (components/off-canvas.css wird direkt
   mitgenutzt, nicht dupliziert - .ncss-nav-panel trägt zusätzlich die off-canvas-
   Klassen). "display: contents" lässt den Dialog-Wrapper auf Desktop optisch
   verschwinden (kein Backdrop/Modal-Verhalten), ohne das Markup zu verdoppeln.

2. .ncss-nav--tree (vertikal, z.B. Docs-Sidebar) - immer sichtbar, kein Kollabieren
   nötig, beliebig tief verschachtelbar.

Untermenüs: <details>/<summary> statt Hover - funktioniert identisch per Klick/Touch/
Tastatur (Enter/Space), kein separates :hover-vs-Touch-Problem. Bewusster Kompromiss:
ein Elternpunkt mit Kindern ist NICHT gleichzeitig ein eigener Link (das "Elternlink UND
Toggle zugleich"-Problem hat keine wirklich saubere Lösung) - stattdessen als erster
Eintrag im Untermenü eine "Übersicht"-Seite verlinken (siehe Markup-Beispiel unten).

Markup (horizontal, Desktop+Mobile in einem):
<nav class="ncss-nav">
  <button type="button" class="ncss-nav-toggle" command="show-modal"
          commandfor="navPanel" aria-label="Menü öffnen">☰</button>
  <dialog id="navPanel" class="ncss-nav-panel ncss-offcanvas ncss-offcanvas--start">
    <button type="button" class="ncss-dialog-close" command="close"
            commandfor="navPanel" aria-label="Menü schließen">&times;</button>
    <ul class="ncss-nav-list">
      <li class="ncss-nav-item"><a href="/">Home</a></li>
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
```

### `components/notification.css`

Klassen (9): `.ncss-notification` `.ncss-notification--brand` `.ncss-notification--danger` `.ncss-notification--leaving` `.ncss-notification--success` `.ncss-notification--warning` `.ncss-notification-body` `.ncss-notification-close` `.ncss-notification-title`

```text
ncss - Benachrichtigungen / Toasts (Layer "components"): <ncss-toast-region> ist der
feste Bereich am Bildschirmrand, .ncss-notification eine einzelne Meldung. Statusfarben,
sechs Positionen, Auto-Schließen mit Pause bei Hover/Fokus, Schließen-Button, Ansage per
aria-live. Optional gestapelt ("Sonner-Stil", Attribut stack): ältere Meldungen liegen
als Stapel hinter der neuesten und fächern sich bei Hover/Fokus auf.

Meist per Script erzeugt (js/notification.js):
  ncss.notify("Gespeichert", { status: "success" });
  ncss.notify("Upload fehlgeschlagen", { status: "danger", timeout: 0 });
  <button type="button" data-ncss-notify="Gespeichert" data-status="success">...</button>
Die Region entsteht dabei automatisch (eine pro Position). Selbst im Markup gesetzt -
z.B. für serverseitige Hinweise nach einem Formular-Absenden:
<ncss-toast-region position="top-end" stack>
  <div class="ncss-notification ncss-notification--success" data-timeout="6000">
    <p class="ncss-notification-title">Gespeichert</p>
    <p>Deine Änderungen sind online.</p>
  </div>
</ncss-toast-region>
Ohne JS bleibt so eine Meldung einfach sichtbar stehen (kein Schließen, kein Timer).

Positionen (Attribut position): top-start, top-center, top-end (Default), bottom-start,
bottom-center, bottom-end - logisch (start/end), in RTL also gespiegelt.
Status: .ncss-notification--brand/--success/--warning/--danger (farbiger Akzentstreifen
+ Symbolfarbe aus der jeweiligen Familie, Text bleibt --ncss-color-text).

Top Layer: das Script macht die Region zu einem popover="manual" - Meldungen erscheinen
damit auch ÜBER einem offenen modalen <dialog>, ohne z-index.

Abhängigkeiten (Cherry-Picking): nur tokens.css/colors.css (+ reset/base); das
Schließen-Symbol ist eine eigene Maske, keine Abhängigkeit von helpers/icons.css.

Tokens: --ncss-notification-width (Default 24rem), --ncss-notification-offset (Abstand
zum Rand, Default --ncss-space-sm), --ncss-notification-gap (Default --ncss-space-2xs),
--ncss-toast-peek (sichtbare Kante gestapelter Meldungen, Default 0.75rem).
```

### `components/off-canvas.css`

Klassen (4): `.ncss-offcanvas` `.ncss-offcanvas--end` `.ncss-offcanvas--start` `.ncss-offcanvas-header`

```text
ncss - Off-Canvas-Komponente (Layer "components"): natives <dialog> als seitlich
einschiebende Sidebar statt zentriertem Modal. Gleiche command/commandfor-Mechanik wie
components/modal.css - für Browser ohne Invoker Commands deckt js/command-fallback.js
BEIDE Komponenten ab, kein zweites Script nötig.

Markup:
<button type="button" command="show-modal" commandfor="sidebar1">Menü öffnen</button>
<dialog id="sidebar1" class="ncss-offcanvas ncss-offcanvas--start">
  <button type="button" class="ncss-dialog-close" command="close"
          commandfor="sidebar1" aria-label="Schließen">&times;</button>
  <nav>...</nav>
</dialog>
Klick daneben (Backdrop) schließt: natives closedby="any" am <dialog> - js/dialog-light-
dismiss.js setzt das für jedes ncss-Modal/-Off-Canvas ohne eigenes closedby automatisch
(Default AN) und emuliert es in Browsern ohne closedby. Abschalten pro Dialog:
closedby="closerequest" (nur Esc + Buttons) oder closedby="none" (nur Buttons, z.B. lange
Formulare). Trefferfläche: der <dialog> selbst ist das Panel, alles außerhalb seiner Box
ist Backdrop.
```

### `components/overlay.css`

Klassen (8): `.ncss-overlay` `.ncss-overlay--bottom` `.ncss-overlay--center` `.ncss-overlay--scrim` `.ncss-overlay--tint` `.ncss-overlay--top` `.ncss-overlay-container` `.ncss-overlay-container--zoom`

```text
ncss - Overlay-Komponente (Layer "components"). Ein Panel legt sich über ein Bild/
Video (Bildunterschrift, CTA, Verlaufs-Blende) - position:relative auf dem Container,
position:absolute auf dem Panel, klassisches Muster.

Bewusst KLEIN gehalten (positionieren + zwei Hintergrund-Varianten) - für alles
Weitere bereits vorhandene, allgemeine ncss-Bausteine kombinieren statt sie hier zu
duplizieren:
  - Nur beim Hover/Fokus sichtbar: .ncss-reveal-on-hover (helpers/visibility.css)
    zusätzlich auf .ncss-overlay setzen - funktioniert unverändert, weil .ncss-overlay
    ein DIREKTES Kind von .ncss-overlay-container ist (die Selektor-Bedingung dort,
    ":hover > .ncss-reveal-on-hover", trifft genau diese Eltern-Kind-Beziehung).
  - Lesbarer Text unabhängig vom Bildinhalt: .ncss-text-light/-dark
    (helpers/typography.css) statt einer festen Textfarbe hier.

Markup:
  <div class="ncss-overlay-container">
    <img src="foto.jpg" alt="...">
    <div class="ncss-overlay ncss-overlay--bottom ncss-overlay--scrim ncss-reveal-on-hover">
      <p class="ncss-text-light">Bildunterschrift</p>
    </div>
  </div>

Portraitkarte (Team/Cast/Referenzen) - dieselbe Komponente, kombiniert mit bereits
vorhandenen Utilities statt einer eigenen Karten-Variante: .ncss-ratio-portrait
(helpers/media.css) für das Seitenverhältnis, .ncss-radius-lg (helpers/elevation.css)
für runde Ecken, .ncss-overlay-container--zoom (unten) für den optionalen Hover-Effekt:
  <div class="ncss-overlay-container ncss-overlay-container--zoom ncss-ratio-portrait ncss-radius-lg">
    <img src="person.jpg" alt="Name">
    <div class="ncss-overlay ncss-overlay--bottom ncss-overlay--scrim">
      <p class="ncss-text-light"><strong>Name</strong><br><span class="ncss-text-light-700">Rolle</span></p>
    </div>
  </div>
```

### `components/pagination.css`

Klassen (7): `.ncss-pagination` `.ncss-pagination--compact` `.ncss-pagination-gap` `.ncss-pagination-label` `.ncss-pagination-next` `.ncss-pagination-prev` `.ncss-pagination-sr`

```text
ncss - Pagination: Seitennavigation für Listen/Archive (Layer "components"), reines CSS.

Markup - echte Links (funktioniert ohne JS, teilbar, Zurück-Taste), aktuelle Seite per
aria-current="page", Lücke als aria-hidden-Element (die Seitenzahlen selbst sagen alles):
<nav class="ncss-pagination" aria-label="Seiten">
  <ul role="list">
    <li><a class="ncss-pagination-prev" href="?seite=3" rel="prev">
      <span class="ncss-pagination-label">Zurück</span></a></li>
    <li><a href="?seite=1"><span class="ncss-pagination-sr">Seite </span>1</a></li>
    <li class="ncss-pagination-gap" aria-hidden="true">…</li>
    <li><a href="?seite=4" aria-current="page"><span class="ncss-pagination-sr">Seite </span>4</a></li>
    ...
    <li><a class="ncss-pagination-next" href="?seite=5" rel="next">
      <span class="ncss-pagination-label">Weiter</span></a></li>
  </ul>
</nav>
Erste/letzte Seite: den Zurück-/Weiter-Link OHNE href rendern (+ aria-disabled="true") -
ein <a> ohne href ist nicht fokussierbar und nicht klickbar, bleibt aber als Platzhalter
stehen (kein Springen der Leiste beim Blättern).

Kompakt: die Leiste ist selbst ein Container (container-type: inline-size). Unter 32rem
eigener Breite bleiben nur Zurück, aktuelle, erste, letzte Seite und Weiter sichtbar, und
die Zurück/Weiter-Beschriftung wird zum Pfeil (Text bleibt für Screenreader erhalten) -
reagiert auf den echten Platz (Sidebar, Karte, Modal), nicht auf den Viewport.
.ncss-pagination--compact erzwingt diese Ansicht unabhängig von der Breite.

Abhängigkeiten (Cherry-Picking): colors.css/tokens.css (+ reset/base).
```

### `components/placeholder.css`

Klassen (2): `.ncss-placeholder` `.ncss-placeholder--surface`

```text
ncss - Placeholder-Komponente (Layer "components"). Neutrale Flaeche fuer fehlende
Bilder/Inhalte (Prototyping, "Bild folgt"-Zustand, Skeleton-artiger Platzhalter) - ein
generisch nuetzlicher Baustein, kein Demo-only-Hilfsmittel.

Kombinierbar mit den Aspect-Ratio-Helpers aus helpers/media.css statt eigene
aspect-ratio-Werte mitzubringen:
  <div class="ncss-placeholder ncss-ratio-video">...</div>
und mit .ncss-card-media, wenn eine Card noch kein echtes Bild hat:
  <div class="ncss-card-media ncss-placeholder"></div>
```

### `components/preferences-fonts.css`

Klassen (1): `.ncss-preferences-options`

```text
ncss - Lese-Schriften für die Darstellungs-Einstellungen (Layer "components"), opt-in,
NICHT in ncss.css enthalten - bewusst eigene Datei, damit eine Seite ohne Schriftwahl
keine @font-face-Zeile ausliefert:
  <link rel="stylesheet" href="ncss/components/preferences-fonts.css">
Selbst gehostet unter fonts/ (Lizenzen + Größen: fonts/README.md), kein CDN-Request.

Gewählt wird über <html data-ncss-font="hyperlegible|lexend|opendyslexic"> (gesetzt von
js/preferences-early.js / js/preferences.js, Einstellung "font" in <ncss-preferences>).
Ein @font-face lädt seine Datei erst, wenn ein Element die Familie tatsächlich nutzt -
ohne Wahl wird also keine einzige Schriftdatei angefragt.

Gewirkt wird über die Tokens --ncss-font-family-base/-heading (Fließtext + Überschriften),
NICHT über --ncss-font-family-mono - Code bleibt in Festbreitenschrift. Die eigene
Seitenschrift bleibt als Fallback in der Liste (font-display: swap: Text ist sofort
lesbar, die gewählte Schrift tauscht nach dem Laden ein). !important aus demselben Grund
wie beim Kontrast (colors.css): theme.css setzt die Schrift-Tokens unlayered.
```

### `components/preferences.css`

Klassen (11): `.ncss-preferences-actions` `.ncss-preferences-group` `.ncss-preferences-hint` `.ncss-preferences-icon` `.ncss-preferences-intro` `.ncss-preferences-options` `.ncss-preferences-panel` `.ncss-preferences-status` `.ncss-preferences-switch` `.ncss-preferences-title` `.ncss-preferences-toggle`

```text
ncss - <ncss-preferences>: Darstellungs-Einstellungen für Besucher (Layer "components").
KEIN Barrierefreiheits-Overlay - es macht keine Seite barrierefrei, sondern lässt Besucher
eine bereits barrierefreie Seite an ihre Bedürfnisse anpassen. Systemeinstellungen bleiben
Default ("System") und werden nie stillschweigend überschrieben.

Markup (den Rest baut js/preferences.js):
  <script src="js/preferences-early.js"></script>      im <head>, vor den Stylesheets
  <ncss-preferences></ncss-preferences>                 Button "Darstellung" + Popover
  <ncss-preferences inline></ncss-preferences>          Bedienfeld direkt (z.B. eigene Seite)
  <ncss-preferences settings="theme text links"></ncss-preferences>   nur eine Auswahl
  <script src="js/preferences.js" defer></script>
Wirkung der Einstellungen: colors.css (Farbschema, Kontrast) und reset.css (Bewegung,
Schriftgröße, Textabstände, Links, Fokus) - diese Datei stylt nur das Bedienfeld.

Ohne JS bleibt das Element verborgen, es gelten die Systemeinstellungen.
Abhängigkeiten (Cherry-Picking): colors.css/tokens.css/reset.css (+ base). Keine andere
Komponente nötig (eigenes Icon, eigene Segment-/Schalter-Optik).
```

### `components/rating.css`

Klassen (2): `.ncss-rating` `.ncss-rating--sm`

```text
ncss - Bewertung (Layer "components"): Sterne-Eingabe aus nativen Radio-Buttons.
Pfeiltasten, Pflichtfeld und Formular-Versand kommen vom Browser, kein JS. Braucht
colors.css + tokens.css (+ reset/base), für die Stern-Texte helpers/a11y.css.

Markup - Inputs in NATÜRLICHER Reihenfolge 1..5 (Pfeiltaste rechts = mehr Sterne, so
wie man es sieht), jeder Input direkt vor seinem Label:
  <fieldset class="ncss-rating">
    <legend>Wie zufrieden waren Sie?</legend>
    <input type="radio" name="r" id="r1" value="1"><label for="r1"><span class="ncss-visually-hidden">1 Stern</span></label>
    <input type="radio" name="r" id="r2" value="2"><label for="r2"><span class="ncss-visually-hidden">2 Sterne</span></label>
    ...
  </fieldset>
Der Stern selbst kommt per CSS (Alternativtext "" = stumm), der Text im Label sagt
den Wert an. Gefüllt/leer unterscheidet sich zusätzlich über die FORM (★ vs ☆), nicht
nur über die Farbe - bleibt auch im Hochkontrastmodus erkennbar.

Füll-Logik ohne Zählregeln: alle Sterne gefüllt, sobald IRGENDEIN Input gewählt ist
(:has(:checked)), dann jeder Stern NACH dem gewählten wieder leer
(input:checked + label ~ label). Ohne :has() (ältere Browser) ist nur der gewählte
Stern selbst gefüllt - Auswahl bleibt erkennbar, nur weniger hübsch.
```

### `components/reveal-pin.css`

Klassen (4): `.ncss-reveal-pin` `.ncss-reveal-pin-content` `.ncss-reveal-pin-intro` `.ncss-reveal-pin-stage`

```text
ncss - Reveal-Pin (Layer "components"): gepinnte Bühne, auf der ein Bild/Video
während des Scrollens von einer eingerückten, abgerundeten Box auf volle Viewport-
Größe aufzieht ("expand to full bleed") - ein Intro-Text blendet dabei aus, am Ende
blendet ein Inhalts-Panel ein. Eigenständig (eigene Keyframes), braucht helpers/
reveal.css NICHT.

Markup:
  <section class="ncss-reveal-pin" aria-label="...">
    <div class="ncss-reveal-pin-stage">
      <p class="ncss-reveal-pin-intro">Überschrift vor dem Aufziehen</p>
      <video src="..." muted playsinline loop autoplay poster="..."></video>
      <div class="ncss-reveal-pin-content">Panel am Ende</div>
    </div>
  </section>

Ebenen: .ncss-reveal-pin = hohe Sektion (Scroll-Distanz, Subjekt der benannten
view-timeline), .ncss-reveal-pin-stage = sticky, eine Viewport-Höhe, alle Kinder im
selben Grid-Feld gestapelt; img/video/picture/canvas füllen die Bühne.
Parameter: --ncss-reveal-pin-length (Sektionshöhe, Default 250vh),
--ncss-reveal-pin-inset (Start-Einrückung, Default 32% 14% 6% - oben Platz für das
Intro), --ncss-reveal-pin-radius.

Fallback (kein animation-timeline, prefers-reduced-motion, Druck): nichts gepinnt -
Intro, Medium (16:9) und Panel stehen ganz normal untereinander.

Benötigt: tokens.css, colors.css. Für <video autoplay> unter reduced motion zusätzlich
js/hero-video-motion.js o.ä. (CSS kann Video-Wiedergabe nicht pausieren).
```

### `components/roadmap.css`

Klassen (8): `.ncss-roadmap` `.ncss-roadmap-card` `.ncss-roadmap-dot` `.ncss-roadmap-item` `.ncss-roadmap-line` `.ncss-roadmap-line-progress` `.ncss-roadmap-line-track` `.ncss-roadmap-list`

```text
ncss - Roadmap/Timeline-Komponente (Layer "components"): eine vertikale Liste von
Meilensteinen, verbunden durch eine ZWEIFARBIGE Linie - ein statischer, gedämpfter
"Track" (immer voll sichtbar, die ganze Höhe) UND eine markenfarbene "Progress"-Linie
darüber, die sich beim Scrollen selbst "nachzeichnet" (Baseline: Progress-Linie ist
einfach von Anfang an fertig gezeichnet, deckt den Track komplett ab - kein
Fehlerzustand). Absichtlich ZWEI Linien statt einer: eine einzige, einfarbige Linie
(erster Anlauf) macht den Zeichen-Effekt kaum sichtbar - der "noch nicht gezeichnete"
Teil ist unsichtbar und verschmilzt optisch mit dem Seitenhintergrund, der Fortschritt
selbst blieb dadurch praktisch unbemerkbar (User-Feedback: "das stimmt nicht und ist
eigentlich sinnfrei ... jetzt ist sie einfach durchgezogen"). Der Track macht den
JEWEILIGEN Fortschritt dagegen als klaren Farbkontrast sichtbar (klassisches
Fortschrittsbalken-Muster, nur vertikal).

Markup:
<div class="ncss-roadmap">
  <div class="ncss-roadmap-line">
    <div class="ncss-roadmap-line-track"></div>
    <div class="ncss-roadmap-line-progress"></div>
  </div>
  <ol class="ncss-roadmap-list" role="list">
    <li class="ncss-roadmap-item">
      <span class="ncss-roadmap-dot"></span>
      <div class="ncss-roadmap-card">...</div>
    </li>
    ...
  </ol>
</div>

ZWEITER ANLAUF - kein SVG mehr, reine `<div>`s mit `scale` statt
`stroke-dasharray`/`-dashoffset`: der erste Anlauf (ein `<svg>` mit zwei `<line>`s,
Zeichnen per animiertem `stroke-dashoffset`) sah in Chromium UND Playwright-WebKit
korrekt aus, blieb aber in ECHTEM Safari 26 als reine statische Linie stehen, keine
sichtbare Fortschritts-Animation (User-Report: "in chrome geht es" / "jetzt is es nur
ne blaue linie" in Safari - per Playwright-WebKit NICHT reproduzierbar, siehe erneut
das wiederkehrende Muster "nur in echtem Safari", Punkt 21 weiter unten). `stroke-
dashoffset` ist eine PAINT-Eigenschaft (erzwingt bei jeder Änderung ein echtes
Neuzeichnen der SVG-Geometrie) - anders als `transform`/`opacity`, die der Compositor
ohne Repaint pro Frame interpolieren kann. Scroll-getriebene Animationen laufen
technisch am ehesten zuverlässig über GENAU diese compositor-freundlichen
Eigenschaften; eine über eine `view()`-Timeline angesteuerte Paint-Eigenschaft ist ein
bekannt riskanteres Pflaster, das Chromium zwar unterstützt, aber nicht jede Engine
gleich zuverlässig pro Scroll-Frame nachzieht. Fix: dieselbe, bereits in
`scroll-progress.css` bewährte Technik (dort horizontal, hier vertikal) - zwei simple
`<div>`s statt `<svg>`/`<line>`, die Progress-"Linie" per `scale` (Y-Achse) von 0 auf 1
gezogen, `transform-origin: top`. Kein SVG, kein `pathLength`, kein `vector-effect`
mehr nötig - insgesamt auch einfacher als der SVG-Anlauf.
```

### `components/scroll-frames.css`

Klassen (3): `.ncss-scroll-frames-canvas` `.ncss-scroll-frames-poster` `.ncss-scroll-frames-stage`

```text
ncss - <ncss-scroll-frames> (Layer "components"): Bildsequenz, die beim Scrollen vor-
und zurückspult (Canvas, js/scroll-frames.js - Markup/Attribute dort).

  <ncss-scroll-frames src="frames/f-%03d.webp" count="72">
    <div class="ncss-scroll-frames-stage">
      <img class="ncss-scroll-frames-poster" src="frames/f-001.webp" alt="..." width="800" height="450">
    </div>
  </ncss-scroll-frames>

Zustände:
  - Inaktiv (kein JS, reduzierte Bewegung, Save-Data): nur das Standbild (<img>) im
    normalen Fluss.
  - .is-active: das <img> weicht dem Canvas, das Element wird so hoch wie die Scroll-
    Strecke, die Bühne klebt randlos im Viewport (Bild per cover gefüllt). Weitere
    Kinder der Bühne (Überschrift, Text) liegen als Overlay über dem Bild.
  - .is-inline: nicht angepinnt, Canvas im Seitenverhältnis des Posters.

Anpassbar: --ncss-scroll-frames-length (Default 300lvh, Attribut length setzt es),
--ncss-scroll-frames-top (Abstand der Bühne von oben).

Benötigt: tokens.css + colors.css. Keine anderen ncss-Dateien.
```

### `components/scroll-horizontal.css`

Klassen (3): `.ncss-scroll-horizontal` `.ncss-scroll-horizontal-track` `.ncss-scroll-horizontal-viewport`

```text
ncss - Horizontal-Scroll-Sektion (Layer "components"): eine hohe Sektion mit einer
sticky, viewport-hohen Bühne - vertikales Scrollen schiebt die Reihe darin seitlich
durch (klassisches "horizontal scroll section"-Muster, früher GSAP-Pinning).

Markup:
  <section class="ncss-scroll-horizontal" data-ncss-scroll-horizontal aria-label="Projekte">
    <div class="ncss-scroll-horizontal-viewport">
      <div class="ncss-scroll-horizontal-track">
        <article>...</article> <article>...</article> ...
      </div>
    </div>
  </section>

Drei Ebenen:
.ncss-scroll-horizontal           hohe Sektion = vertikale Scroll-Distanz, zugleich
                                  Subjekt der benannten view-timeline.
.ncss-scroll-horizontal-viewport  sticky, eine Viewport-Höhe, schneidet die Reihe ab.
.ncss-scroll-horizontal-track     die bewegte Reihe, jedes Kind ist ein Element.

Die Verschiebung kommt NICHT direkt aus den Keyframes, sondern aus einer per @property
typisierten Fortschrittszahl (--_ncss-scroll-horizontal-p, 0..1), die in translate
mit der Reihenbreite verrechnet wird: -100% (= eigene Breite der Reihe) + 100cqi
(= Breite der Bühne, container-type:inline-size). cqi innerhalb von @keyframes rechnet
WebKit falsch auf - deshalb die Rechnung in der normalen Regel, Keyframes animieren nur
die Zahl.

Höhe: CSS-Default --ncss-scroll-horizontal-length (300vh), unabhängig von der
tatsächlichen Reihenbreite. js/scroll-horizontal.js (opt-in, data-ncss-scroll-horizontal)
rechnet die Höhe passend aus (1px runter = 1px seitwärts) UND hält Tastatur-Fokus
sichtbar: ein per Tab fokussiertes, gerade aus dem Bild verschobenes Element ist für
den Browser NICHT erreichbar (er scrollt nur echte Scroll-Container, die Verschiebung
ist ein transform) - das Script scrollt die Seite an genau die Stelle, an der das
Element mittig steht (WCAG 2.4.11 Focus Not Obscured). Für Reihen mit Links/Buttons
deshalb dringend empfohlen.

Fallback (kein animation-timeline, prefers-reduced-motion, Druck): eine ganz normale,
per Wischen/Shift-Scroll horizontal scrollbare Reihe mit Scroll Snap - kein Pinning.

Benötigt: tokens.css (Abstände, --ncss-focus-ring-width), Fokus-Ring aus reset.css.
Optional js/scroll-horizontal.js.
```

### `components/scroll-progress.css`

Klassen (3): `.ncss-scroll-progress` `.ncss-scroll-progress--end` `.ncss-scroll-progress--vertical`

```text
ncss - Scroll-Progress-Komponente (Layer "components"): ein einzelnes, vollständiges
UI-Element (Leseanzeige-Balken) statt ein wiederverwendbarer Baustein - deshalb hier
statt in helpers/scroll.css (das enthält nur allgemeine Scroll-MECHANIK wie Sticky/
Scroll-Snap, aus denen man Verschiedenes baut).

Reine CSS-Lösung über eine Scroll-Timeline auf dem Wurzel-Scroller - kein JS/Scroll-
Event-Listener nötig. Markup: <div class="ncss-scroll-progress"></div> (leeres div
reicht, wird per scale skaliert). Ohne Unterstützung bleibt es schlicht unsichtbar
(scale bleibt bei 0) statt kaputt auszusehen.

z-index bewusst sehr hoch (1000) - das ist als permanentes, page-weites UI-Element
gedacht, das über allem anderen liegen soll, INKLUSIVE eigener Sticky-Header
(.ncss-sticky, siehe helpers/scroll.css, Default z-index 10). Eigene Seiten-Header
sollten trotzdem einen klar höheren z-index als 10 bekommen als Sticky-Inhalte
innerhalb der Seite, damit es nicht zu Überlagerungen kommt (kein automatischer Schutz
davor möglich - z-index-Koordination bleibt Aufgabe der jeweiligen Seite).
```

### `components/scroll-stack.css`

Klassen (5): `.ncss-stack-card` `.ncss-stack-js-active` `.ncss-stack-section` `.ncss-stack-section--horizontal` `.ncss-stack-stage`

```text
ncss - Scroll-Stack-Komponente (Layer "components"): EINE Vollbild-Sektion, in der
Karten beim Scrollen INNERHALB dieser einen Sektion übereinander gleiten und sich zu
einem gefächerten Stapel aufbauen - anders als .ncss-snap-sections (helpers/scroll.css,
Sektion für Sektion vollflächig einrasten, jede Sektion nimmt ihren EIGENEN Scroll-
Abschnitt), bleibt hier die Bühne selbst die ganze Zeit über ein einziges Vollbild,
nur der INHALT dieser einen Bühne wechselt/stapelt sich während man hindurchscrollt
(klassisches "Pinned Scrollytelling"-Muster).

Struktur - drei Ebenen, jede mit eigener Aufgabe:
.ncss-stack-section (außen)  - reine Scroll-DISTANZ, sonst unsichtbar. Höhe =
                                Kartenanzahl × 100lvh (--ncss-stack-count MUSS von Hand
                                gesetzt werden - sibling-count() ist aktuell noch
                                weniger verbreitet unterstützt als selbst
                                animation-timeline, also kein Auto-Zählen).
.ncss-stack-stage (Bühne)    - position:sticky; top:0; height:100lvh - bleibt exakt EIN
                                Vollbild lang oben "kleben", während die Zusatzhöhe der
                                Sektion darum herum vorbeiscrollt. overflow:clip
                                verhindert, dass ankommende Karten (die von unten
                                hereinfahren) kurzzeitig über die Bühne hinausragen.
.ncss-stack-card (Karten)    - position:absolute, alle exakt an derselben Stelle
                                innerhalb der Bühne gestapelt, ein fester
                                --ncss-stack-fan-Versatz pro Karte (--ncss-stack-index,
                                PRO INSTANZ per Inline-Style, siehe Markup unten) sorgt
                                dafür, dass jede bereits angekommene Karte ein Stück
                                ihrer Kante sichtbar behält.

Baseline (kein JS, funktioniert überall): OHNE animation-timeline-Unterstützung liegen
alle Karten einfach von Anfang an fertig gefächert da (kein Fehlerzustand, nur ohne die
Rein-Scroll-Animation) - jede Karte bekommt einen fixen transform-Versatz, der GENAU
der "flach angekommen"-Zwischenposition der Scroll-Animation entspricht (keine zwei
unterschiedlichen Ruhezustände, siehe die 50%-Keyframe-Marke unten).

Scroll-Animation (Progressive Enhancement, animation-timeline aktuell NICHT Baseline -
per Recherche bestätigt): view-timeline-name auf .ncss-stack-section erzeugt eine
benannte Fortschritts-Timeline über die GESAMTE Sektionshöhe, jede Karte hört per
animation-timeline auf denselben Namen. Jede Karte fährt WÄHREND ihres eigenen
Scheiben-Abschnitts herein, bleibt dann flach/unverzerrt stehen, solange sie die
aktuell sichtbare (vorderste) Karte ist, und kippt/verkleinert sich per 3D-Transform
erst WÄHREND des Abschnitts der NÄCHSTEN Karte zurück, wenn diese sie tatsächlich zu
bedecken beginnt - nicht schon vorher (siehe animation-range-Kommentar unten für die
Technik dahinter).

Markup (--ncss-stack-index UND die Sektion --ncss-stack-count von Hand gesetzt):
<div class="ncss-stack-section" style="--ncss-stack-count: 4;">
  <div class="ncss-stack-stage">
    <div class="ncss-stack-card" style="--ncss-stack-index: 0;">...</div>
    <div class="ncss-stack-card" style="--ncss-stack-index: 1;">...</div>
    <div class="ncss-stack-card" style="--ncss-stack-index: 2;">...</div>
    <div class="ncss-stack-card" style="--ncss-stack-index: 3;">...</div>
  </div>
</div>

Modifier .ncss-stack-section--horizontal auf der äußeren Sektion: dieselbe Bühne/
Timeline-Mechanik, Fächer und Anfahrt laufen auf der X- statt der Y-Achse (seitlich
gestaffelt, fährt von rechts herein, kippt um die Y- statt die X-Achse zurück) - siehe
"Modifier: --horizontal" weiter unten.

--ncss-stack-stage-height (Default 100lvh) und --ncss-stack-stage-top (Default 0px)
machen die Bühne beliebig klein/verschoben statt zwingend vollbildgroß - z.B. eine
Bühne in einem gewöhnlichen .ncss-container statt vollflächig (Demo:
"Stacked Cards, in einem normalen Container" in demo/stacked-cards.html).

WICHTIG - echter Fallback ohne animation-timeline-Unterstützung: Die frühere Baseline
(siehe "Ruheposition" weiter unten) reichte NICHT als echter Fallback - sie positioniert
Karten weiterhin absolut übereinander, per --ncss-stack-fan versetzt. Bei --ncss-stack-fan:
0px (Vollbild-Variante, Karten sollen volle Bühnenfläche einnehmen) liegen dadurch OHNE
Scroll-Animation alle Karten exakt deckungsgleich übereinander - nur die letzte (oberste im
DOM) ist sichtbar/erreichbar, die anderen bleiben komplett verdeckt, ohne jede Möglichkeit
sie anzusehen (User-Feedback: "die karten liegen halt übereinander und man kann sie sich
nicht anschauen"). Deshalb zusätzlich ein eigener @supports not(...)-Block ganz unten in
dieser Datei: dort wird die gesamte Pinning-/Absolut-Stapel-Mechanik abgeschaltet und die
Karten laufen stattdessen ganz normal im Fluss untereinander (position:static, keine
Transforms) - garantiert jede Karte einzeln sichtbar/scrollbar, unabhängig von
--ncss-stack-fan, --ncss-stack-count oder der horizontal-Variante.

--ncss-stack-stage-height nutzt 100lvh als Default, bewusst NICHT 100dvh: "large
viewport height" verhält sich wie das klassische 100vh (rechnet mit vollständig
eingeklapptem mobilem Browser-Chrome, ändert sich NICHT während des Scrollens) -
"dynamic viewport height" dagegen würde sich live mit ein-/ausblendender Adressleiste
MITTEN im Scrollen neu berechnen. Genau das ist hier riskant: die Bühnenhöhe fließt
direkt in die Scroll-Distanz der Sektion (Zeile unten), das view-timeline-inset UND die
Off-Stage-Position der Karten (siehe @keyframes ncss-stack-arrive weiter unten) ein -
eine mitten im Scrollen wachsende/schrumpfende Bühnenhöhe würde alle drei Berechnungen
gleichzeitig verschieben, während der Nutzer noch scrollt (bekanntes reales
dvh-Ruckel-Verhalten in mobilem Safari). lvh bleibt stattdessen stabil über die gesamte
Geste - genau das bereits fein kalibrierte Timing (siehe die dokumentierten Bugs oben
und bei @keyframes ncss-stack-arrive) bleibt dadurch unangetastet, nur der veraltete
Name wird durch die modernere, absichtliche Variante ersetzt.
```

### `components/scroll-video.css`

Klassen (2): `.ncss-scroll-video-caption` `.ncss-scroll-video-stage`

```text
ncss - <ncss-scroll-video> (Layer "components"): Video, das beim Scrollen vor- und
zurückspult. Logik/Attribute: js/scroll-video.js.

  <ncss-scroll-video length="300">
    <div class="ncss-scroll-video-stage">
      <video muted playsinline controls preload="metadata" poster="p.jpg" src="s.mp4"></video>
      <p class="ncss-scroll-video-caption" data-ncss-time="1-3">Text ...</p>
    </div>
  </ncss-scroll-video>

Zustände:
  - Inaktiv (kein JS, reduzierte Bewegung, Save-Data): normales Video mit Controls in
    seinem Seitenverhältnis, Captions als Liste DARUNTER - nichts geht verloren.
  - .is-active (Script): Element wird so hoch wie die Scroll-Strecke, die Bühne klebt
    als volle Fläche im Viewport, das Video füllt sie RANDLOS (object-fit: cover) -
    bewusst kein Letterboxing mit schwarzen Balken. Captions liegen als Karte über dem
    Video und blenden in ihrem Zeitbereich ein.
  - .is-inline (Attribut inline oder innerhalb <ncss-scrolly>): kein Anpinnen, das
    Video bleibt in seinem Seitenverhältnis.

Anpassbar (auf dem Element):
  --ncss-scroll-video-length   Scroll-Strecke (Default 300lvh; Attribut length="400"
                               setzt dasselbe) - lvh, damit die Strecke beim Ein-/
                               Ausblenden der mobilen Adressleiste nicht springt
  --ncss-scroll-video-top      Abstand der Bühne von oben, z.B. unter einer sticky
                               Topbar: var(--ncss-topbar-height)
  --ncss-scroll-video-fit      cover (Default) | contain (ganzes Bild, mit Balken)
  --ncss-scroll-video-position object-position (Default --ncss-focus-point) - welcher
                               Bildteil bei schmalen/hohen Bildschirmen sichtbar bleibt

Benötigt: tokens.css + colors.css. Keine anderen ncss-Dateien.
```

### `components/scrolly.css`

Klassen (4): `.ncss-scrolly-figure` `.ncss-scrolly-media` `.ncss-scrolly-step` `.ncss-scrolly-steps`

```text
ncss - <ncss-scrolly> Scrollytelling (Layer "components"): eine Spalte mit Text-
Schritten neben einer sticky Medien-Spalte. Der Schritt, der gerade die Viewport-Mitte
kreuzt, ist aktiv und schaltet das zugehörige Medium um. Light-DOM-Custom-Element
(js/scrolly.js), wie <ncss-nav-priority> - ganz normal von ncss.css getroffen.

Markup (ein .ncss-scrolly-figure pro Schritt, gleiche Reihenfolge):
  <ncss-scrolly>
    <div class="ncss-scrolly-steps">
      <div class="ncss-scrolly-step" data-ncss-time="0"><div>...</div></div>
      <div class="ncss-scrolly-step" data-ncss-time="4.5"><div>...</div></div>
    </div>
    <div class="ncss-scrolly-media">
      <figure class="ncss-scrolly-figure">...</figure>
      <figure class="ncss-scrolly-figure">...</figure>
    </div>
  </ncss-scrolly>

Optionen als Attribute: line="50" (Lage der Auslöse-Linie in % von oben, Default 50),
media-start (Medien-Spalte auf der Start-Seite statt rechts).

Zustand: aktiver Schritt + aktives Medium tragen .is-active (Konvention wie Slideshow/
Lightbox). Event "ncss-scrolly-step" auf dem Element: detail = { index, time, step, figure } -
time ist der Zahlenwert aus data-ncss-time des Schritts (Sekunden) oder null. Damit
kann z.B. ein scroll-gesteuertes Video an die Stelle des Schritts springen, ohne dass
diese Komponente etwas über Video wissen muss.

Fallback (kein JS / Element nicht definiert): alle Schritte und alle Medien ganz
normal untereinander im Fluss, nichts sticky, nichts versteckt. Das sticky
Stapel-Layout greift erst, wenn das Element definiert ist UND ein Schritt aktiv ist
(:defined:has(.is-active)) - ein abgestürztes Script lässt also keine leere Bühne
zurück. prefers-reduced-motion: Medien schalten weiter um, nur ohne Überblendung
(globale Transition-Kappung in reset.css).

Benötigt: tokens.css/colors.css + js/scrolly.js (ohne Script: lesbarer Fluss).
```

### `components/search.css`

Klassen (3): `.ncss-icon` `.ncss-search` `.ncss-search-input`

```text
ncss - Erweiterbares Suchfeld (Layer "components"). Startet schmal (nur die Andeutung
eines Icons), wächst beim Fokussieren auf volle Breite - klassisches "Icon wird zum
Suchfeld"-Muster, komplett ohne JS über eine reine width-Transition auf dem Input selbst.

Markup:
<div class="ncss-search">
  <span class="ncss-icon ncss-icon-search" aria-hidden="true"></span>
  <input type="search" class="ncss-input ncss-search-input" placeholder="Suchen..." aria-label="Suchen">
</div>

Bewusst KEIN eigener Button fürs Icon: das <input> selbst ist schon die klickbare
Fläche (auch im schmalen Zustand) - ein Klick auf den sichtbaren Icon-Bereich fokussiert
direkt das Feld und löst die Erweiterung aus, ohne einen Zwischenschritt (Button ->
dann erst Input fokussieren) zu brauchen. Das Icon selbst ist rein dekorativ
(aria-hidden, pointer-events:none) - overlay per position:absolute, das Input trägt das
nötige padding-inline-start, um nicht darunter zu verschwinden.
:not(:placeholder-shown) hält das Feld zusätzlich breit, solange bereits Text
eingegeben ist, auch nach dem Verlassen des Fokus - kollabiert erst wieder, wenn das
Feld leer UND unfokussiert ist.
```

### `components/segmented.css`

Klassen (3): `.ncss-segmented` `.ncss-segmented--block` `.ncss-segmented--sm`

```text
ncss - Segmentierte Auswahl (Layer "components"): "Liste | Karte | Kalender" als
zusammenhängende Schaltflächen-Leiste - technisch eine ganz normale Radio-Gruppe.
Pfeiltasten, Formular-Versand, Pflichtfeld und Screenreader-Ansage ("Optionsfeld,
2 von 3") kommen dadurch vom Browser, kein JS. Braucht colors.css + tokens.css
(+ reset/base).

Markup - Input DIREKT vor seinem Label (Geschwister-Selektor input:checked + label
funktioniert ohne :has(), also auch in älteren Browsern):
  <fieldset class="ncss-segmented">
    <legend class="ncss-visually-hidden">Ansicht</legend>
    <input type="radio" name="ansicht" id="a-liste" value="liste" checked>
    <label for="a-liste">Liste</label>
    <input type="radio" name="ansicht" id="a-karte" value="karte">
    <label for="a-karte">Karte</label>
  </fieldset>
--sm für dichte Toolbars, --block für volle Breite (Segmente teilen sich den Platz).
```

### `components/select.css`

Klassen (2): `.ncss-select` `.ncss-select-wrapper`

```text
ncss - Select-Komponente (Layer "components").

Fallback-first: das Basisstyling (Pfeil-Indikator per mask-image statt Hintergrundbild,
damit die Farbe aus unseren Tokens statt einem fest codierten SVG-Wert kommt) läuft in
JEDEM Browser. appearance: base-select wird nur ergänzt, wo unterstützt UND (Stand
jetzt) nicht WebKit/Safari ist (siehe @supports-Begründung unten) - "The Golden Rule of
Customizable Select" (https://webkit.org/blog/18117/the-golden-rule-of-customizable-select/):
natives <select> bleibt die funktionale Baseline, nie nur ein Enhancement-Layer ohne
Fallback.

Markup: <span class="ncss-select-wrapper"><select class="ncss-select">...</select></span>
- der Wrapper trägt den Pfeil-Indikator (Formularelemente selbst unterstützen kein
generiertes ::after-Content).

IMMER einen expliziten <button type="button"><selectedcontent></selectedcontent></button>
als erstes Kind des <select> mitgeben, auch bei ganz normalem Text-Select ohne reichen
Options-Inhalt - laut Spec optional (der Browser erzeugt sonst selbst einen passenden
Default-Button), macht das Verhalten aber über alle Browser hinweg konsistent und
vorhersehbar.

WEBKIT/SAFARI BEWUSST AUSGESCHLOSSEN (Stand August 2026, zwei Runden nötig): User-Report
(Safari 26, stabile Version, KEIN Beta) zeigte einen doppelten Pfeil bei appearance:
base-select. RUNDE 1: appearance: base-select in WebKit komplett deaktiviert (Diagnose
damals: vermutlich ein unfertiger WebKit-Implementierungs-Bug in diesem sehr neuen
Feature). Reichte NICHT - User meldete den Doppelpfeil nach Deploy erneut, diesmal mit
einem direkten Experiment in echtem Safari als Beweis: `.ncss-select-wrapper::after`
(unser EIGENER Pfeil-Indikator) probeweise entfernt -> nur noch EIN korrekter Pfeil
übrig. TATSÄCHLICHE, jetzt real-Safari-bestätigte Ursache: `appearance: none`
unterdrückt in echtem Safari den NATIVEN `<select>`-Pfeil nicht zuverlässig (anders als
in Chromium/Firefox) - im Fallback-Zweig (den WebKit seit Runde 1 IMMER nimmt) kam
unser eigener `::after`-Pfeil zusätzlich zum weiterhin sichtbaren nativen Safari-Pfeil
oben drauf. Nicht in Playwrights WebKit-Build reproduzierbar (zeigt in BEIDEN Zuständen
nur einen korrekten Pfeil) - dieselbe Lücke wie bei initial-letter (Fallstrick 9):
generische Test-Engines bilden manche echten Safari-Eigenheiten nicht exakt nach, macht
ein gezieltes Experiment durch den Nutzer selbst manchmal zuverlässiger als eine weitere
Hypothese von hier aus. RUNDE 2 (endgültiger Fix): zusätzlich zu base-select auch
unseren eigenen `::after`-Pfeil in WebKit deaktivieren (siehe eigener @supports-Block
unten) - Safaris nativer Pfeil bleibt als einziger sichtbar (schlichter, nicht per
Tokens einfärbbar, aber korrekt). Sobald Apple beide Ursachen behebt (neu gegentestet
werden, sobald Safari 27 reguläre Unterstützung bekommt), können BEIDE WebKit-
Ausschlüsse in dieser Datei wieder entfernt werden.

WebKit-Erkennung per Feature-Kombination, die (Stand jetzt) nur in WebKit gleichzeitig
zutrifft, kein User-Agent-Sniffing (per echtem Test in Chromium/WebKit/Firefox
bestätigt: nur WebKit liefert bei allen drei Bedingungen gemeinsam `true`) -
`hanging-punctuation`/`font: -apple-system-body` sind reine WebKit-Eigenheiten,
`-webkit-appearance: none` grenzt zusätzlich gegen ältere/andere Browser ein, die
zufällig eine der ersten beiden ebenfalls unterstützen könnten.
```

### `components/slideshow.css`

Klassen (5): `.ncss-slideshow` `.ncss-slideshow-item` `.ncss-slideshow-item--peek` `.ncss-slideshow-track` `.ncss-slideshow-track--no-scrollbar`

```text
ncss - Slideshow-Komponente (Layer "components"). Kein JS, kein Framework.

Läuft in JEDEM Browser über natives Scroll-Snapping - Pfeiltasten, Touch-Wischen,
Trackpad, Maus-Scrollrad funktionieren automatisch, ganz ohne eigenen Code.

Absichtlich OHNE ::scroll-button()/::scroll-marker-Erweiterung (Pfeil-Buttons/Punkte):
ein erster Versuch damit wurde per echtem Browser-Test verworfen - die Pseudo-Elemente
rendersten in diesem (sehr aktuellen, experimentellen) Chromium-Build nachweislich NICHT
an der per CSS vorgegebenen Position (mit elementFromPoint() bestätigt: die "Buttons"
tauchten an einer völlig anderen Stelle der Seite auf als die Slideshow selbst). Statt
auf ungeprüftem Verhalten einer sich noch ändernden Spec weiterzubauen, bleibt es bei
der soliden, überall funktionierenden Scroll-Snap-Basis - erneut aufgreifen, sobald sich
das Verhalten in einer stabilen Browser-Version verifizieren lässt.

Markup:
<div class="ncss-slideshow">
  <ul class="ncss-slideshow-track">
    <li class="ncss-slideshow-item">...</li>
    ...
  </ul>
</div>
```

### `components/sparkline.css`

Klassen (5): `.ncss-sparkline` `.ncss-sparkline--danger` `.ncss-sparkline--success` `.ncss-sparkline-area` `.ncss-sparkline-dot`

```text
ncss - Sparkline/Linien-Chart-Komponente (Layer "components"). Reines SVG + CSS, keine
Chart-Bibliothek: ein <svg class="ncss-sparkline"> mit einer <polyline> (Linie) und
optional einem <path class="ncss-sparkline-area"> (Flächenfüllung darunter) skaliert
responsiv über viewBox, ganz ohne JS. Datenpunkte kommen aus dem Markup (points="...");
für dynamische Daten reicht serverseitiges Rendern der points-Liste.

Markup:
  <svg class="ncss-sparkline" viewBox="0 0 200 60" preserveAspectRatio="none">
    <path class="ncss-sparkline-area" d="M0,50 L40,42 L80,35 L120,20 L160,15 L200,5 L200,60 L0,60 Z" />
    <polyline points="0,50 40,42 80,35 120,20 160,15 200,5" />
    <circle class="ncss-sparkline-dot" cx="200" cy="5" r="3" />
  </svg>
Farbvarianten wie bei Badge/Tag über Modifier-Klassen auf dem <svg> selbst.
```

### `components/spinner.css`

Klassen (3): `.ncss-spinner` `.ncss-spinner--lg` `.ncss-spinner--sm`

```text
ncss - Lade-Indikator (Layer "components"): drehender Ring in currentColor - passt
dadurch automatisch in jeden Button, auf jede Fläche, in beide Themes. Reines CSS.
Braucht colors.css + tokens.css (+ reset/base), für den Ansagetext helpers/a11y.css.

Markup (eigenständig, wird angesagt):
  <span class="ncss-spinner" role="status"><span class="ncss-visually-hidden">Lädt …</span></span>
Im Button (der Button selbst trägt den Zustand, der Spinner ist nur Optik):
  <button class="ncss-btn ncss-btn--primary" aria-busy="true" disabled>
    <span class="ncss-spinner ncss-spinner--sm" aria-hidden="true"></span> Speichert …
  </button>
role="status" erst einfügen/sichtbar machen, wenn wirklich geladen wird - ein dauerhaft
im DOM stehender Status wird beim Seitenaufruf nicht angesagt.

Reduzierte Bewegung: reset.css kürzt jede Animation global auf 0.01ms - der Ring steht
dann still, bleibt aber als Ring mit Lücke sichtbar erkennbar (kein Verschwinden des
Zustands). Ein Ersatz-Pulsieren wäre selbst wieder Bewegung, daher bewusst keines.
```

### `components/split.css`

Klassen (7): `.ncss-split` `.ncss-split--align-end` `.ncss-split--align-start` `.ncss-split--align-stretch` `.ncss-split-container` `.ncss-split-content` `.ncss-split-media`

```text
ncss - Split-Komponente (Layer "components"): Text neben Bild (oder Video), typisch
für Marketing-/Feature-Sektionen ("Bild links, Text rechts" und umgekehrt). Reines
Flex-Layout, kein JS.

Markup:
  <div class="ncss-split-container">
    <div class="ncss-split">
      <div class="ncss-split-media"><img src="foto.jpg" alt="..."></div>
      <div class="ncss-split-content">
        <h2>Titel</h2>
        <p>Text ...</p>
      </div>
    </div>
  </div>

Bild LINKS vs. RECHTS braucht KEINEN Modifier - reine Dokumentreihenfolge (dasselbe
Prinzip wie .ncss-card-media oben/unten in card.css): .ncss-split-media als ERSTES
Kind = links (und beim Stapeln auf schmalen Containern automatisch OBEN), als
LETZTES Kind = rechts (bzw. beim Stapeln UNTEN). Kein row-reverse-Trick nötig, der
Vorlese-/Fokus-Reihenfolge vom visuellen Layout entkoppeln würde.

.ncss-split-container erzeugt den Container-Query-Kontext - muss ein SEPARATES
Element sein, da .ncss-split selbst ihre eigene Breite per Spec nicht abfragen kann
(nur Nachfahren können das, siehe dieselbe Einschränkung bei .ncss-card--horizontal).
Schwelle 36rem (breiter als die 24rem einer einzelnen Karte) - eine volle Text+Bild-
Sektion braucht mehr Platz, bevor zwei Spalten nebeneinander noch angenehm lesbar
bleiben.
```

### `components/spotlight.css`

Klassen (2): `.ncss-spotlight` `.ncss-spotlight--strong`

```text
ncss - Spotlight (Layer "components"): ein weicher Lichtkegel folgt dem Mauszeiger über
eine Fläche (Karte, Kachel, Button), dazu ein aufleuchtendes Rand-Segment nahe am Zeiger.
Rein dekorativ, opt-in - eigene Klasse zum Zukombinieren wie .ncss-glow-border
(components/effects.css), kein Bestandteil von .ncss-card.

Markup - einzelne Fläche:
<article class="ncss-card ncss-spotlight" data-ncss-spotlight>...</article>

Markup - Gruppe (EIN Listener für alle; Nachbarn fangen den Rand des Lichtkegels auf,
wenn der Zeiger in der Nähe ist):
<div class="ncss-bento" data-ncss-spotlight>
  <article class="ncss-card ncss-spotlight">...</article>
  <article class="ncss-card ncss-spotlight">...</article>
</div>
<script src="js/spotlight.js" defer></script>

js/spotlight.js schreibt NUR --ncss-spotlight-x/-y (px, relativ zur jeweiligen Fläche)
und setzt [data-ncss-spotlight-active]. Ohne JS (und bei Tastatur-Fokus) steht das
Licht in der Mitte und erscheint bei Hover/Fokus - kein kaputter Zustand, nur statisch.

Technik: ::before = Lichtkegel (radial-gradient), ::after = Rand-Segment über dieselbe
Masken-Ring-Technik wie .ncss-glow-border (padding als Ringdicke + mask-composite:
exclude schneidet die content-box heraus, siehe effects.css). isolation:isolate macht die
Fläche zum eigenen Stacking-Kontext - ::before mit z-index:-1 malt dadurch ÜBER dem
eigenen Hintergrund der Fläche, aber UNTER ihrem Inhalt (Text bleibt unberührt lesbar).

Tokens (pro Instanz überschreibbar):
  --ncss-spotlight-color   Farbe des Lichtkegels (Default: Markenfarbe, halbtransparent)
  --ncss-spotlight-border  Farbe des Rand-Segments (Default: Markenfarbe)
  --ncss-spotlight-size    Durchmesser des Lichtkegels (Default 24rem)
.ncss-spotlight--strong    kräftigeres Licht

Touch: kein Zeiger, der "über" etwas schwebt - das Script ignoriert Touch-Eingaben,
:hover ist wie überall in ncss auf (hover:hover) and (pointer:fine) begrenzt.
Forced Colors: Effekt aus (rein dekorativ, keine Information).
```

### `components/stat.css`

Klassen (9): `.ncss-stat` `.ncss-stat--inverse` `.ncss-stat-label` `.ncss-stat-meta` `.ncss-stat-trend` `.ncss-stat-trend--down` `.ncss-stat-trend--flat` `.ncss-stat-trend--up` `.ncss-stat-value`

```text
ncss - Kennzahl/KPI (Layer "components"): Wert + Beschriftung + optionaler Trend.
Reines CSS, kein JS - kombinierbar mit js/count-up.js (data-ncss-count-up am Wert) und
.ncss-sparkline. Rahmen/Ecken/Schatten bewusst NICHT eingebaut (siehe card.css-
Begründung) - dafür .ncss-border/.ncss-radius-.../.ncss-shadow-... aus
helpers/elevation.css. Braucht colors.css + tokens.css (+ reset/base), für den
Screenreader-Text des Trends zusätzlich helpers/a11y.css (.ncss-visually-hidden).

Markup:
  <div class="ncss-stat">
    <p class="ncss-stat-label">Mieteingang November</p>
    <p class="ncss-stat-value">48.230 €</p>
    <p class="ncss-stat-trend ncss-stat-trend--up">
      <span class="ncss-visually-hidden">Gestiegen um</span> 4,2 %
      <span class="ncss-stat-meta">ggü. Vormonat</span>
    </p>
  </div>
Der Pfeil kommt per CSS und ist für Screenreader stumm (content-Alternativtext "") - die
Richtung MUSS deshalb als Text im Markup stehen ("Gestiegen um"/"Gesunken um"), Farbe
und Pfeil allein sind keine zugängliche Information (WCAG 1.3.1/1.4.1).

--up = Pfeil hoch + Erfolgsfarbe, --down = Pfeil runter + Gefahrfarbe, --flat = neutral.
Für Kennzahlen, bei denen "weniger" GUT ist (Kosten, Leerstand, offene Tickets):
.ncss-stat--inverse auf .ncss-stat tauscht nur die Farben, der Pfeil bleibt ehrlich.
```

### `components/subnav.css`

Klassen (4): `.ncss-subnav` `.ncss-subnav-inner` `.ncss-subnav-label` `.ncss-subnav-list`

```text
ncss - Abschnitts-Navigation "Auf dieser Seite" (Layer "components"): schmale, klebende
Leiste direkt unter der Topbar mit Sprunglinks zu den Abschnitten einer langen Seite
(One-Pager, Handbuch-Seite). Eine Zeile, auf schmalen Bildschirmen seitlich wischbar
mit weichen Rändern; der Abschnitt im Blick wird automatisch hervorgehoben.

Markup:
  <nav class="ncss-subnav" aria-label="Auf dieser Seite" data-ncss-subnav>
    <div class="ncss-subnav-inner">
      <span class="ncss-subnav-label" aria-hidden="true">Auf dieser Seite</span>
      <ul class="ncss-subnav-list" role="list">
        <li><a href="#intro">Einleitung</a></li> ...
      </ul>
    </div>
  </nav>
Direkt nach der Topbar platzieren (Geschwister im <body>, nicht in <main>) - nur dann
klebt sie über die ganze Seite.

Aktueller Abschnitt: nativ per scroll-target-group + :target-current (Chromium 140+,
reines CSS), überall sonst und zusätzlich für Screenreader setzt js/subnav.js
aria-current="location" am passenden Link. Ohne JS und ohne native Unterstützung:
ganz normale Sprunglinks ohne Hervorhebung.

Empfohlen bei eigener Kopfleiste (One-Pager, Website-Header): Topbar UND Leiste in EINEN
klebenden Container stecken - dann können beide nie gegeneinander verrutschen, egal wie
hoch die Kopfleiste ist (Logo, Schriftgröße, 200 % Zoom, Mobil-Menü):
  <div class="mein-header" data-ncss-sticky-header>   (selbst position: sticky; top: 0)
    <header class="ncss-topbar">...</header>          (dort position: relative)
    <nav class="ncss-subnav" ...>...</nav>             (klebt nicht mehr selbst)
  </div>
js/subnav.js misst die Höhe dieses Containers und setzt --ncss-scroll-offset an :root.

Sprungziele: :root bekommt scroll-padding-block-start = gemessener Header
(--ncss-scroll-offset), ohne Script Topbar + diese Leiste, damit Überschriften nicht
unter den klebenden Leisten verschwinden. Weiches Scrollen
kommt aus reset.css (scroll-behavior: smooth, bei reduzierter Bewegung aus).

Tokens: --ncss-subnav-height (Höhe, Default 2.75rem), --ncss-subnav-top (Abstand oben,
Default --ncss-topbar-height; 0 ohne Topbar), --ncss-scroll-offset (von js/subnav.js
gemessene Gesamthöhe des klebenden Kopfbereichs).

Benötigt: tokens.css/colors.css. Optional js/subnav.js.
```

### `components/tabs.css`

Klassen (4): `.ncss-tabs--vertical` `.ncss-tabs-heading` `.ncss-tabs-list` `.ncss-tabs-panel`

```text
ncss - <ncss-tabs>: Registerkarten nach WAI-ARIA-APG-Muster "Tabs" (Layer "components").
Light-DOM-Custom-Element (js/tabs.js) - ohne JS bleibt es eine ganz normale
Sprungmarken-Liste über untereinander stehenden Abschnitten (kein Inhalt geht verloren,
jeder Link springt zu seinem Abschnitt).

Markup:
<ncss-tabs class="ncss-tabs">
  <div class="ncss-tabs-list" aria-label="Produktinfos">
    <a href="#tab-beschreibung">Beschreibung</a>
    <a href="#tab-technik">Technik</a>
  </div>
  <section class="ncss-tabs-panel" id="tab-beschreibung">
    <h3 class="ncss-tabs-heading">Beschreibung</h3> ...
  </section>
  <section class="ncss-tabs-panel" id="tab-technik"> ... </section>
</ncss-tabs>
<script src="js/tabs.js" defer></script>

Varianten/Attribute:
  class="ncss-tabs ncss-tabs--vertical"  Liste links, Inhalt rechts (bricht bei wenig
                                         Platz von selbst untereinander um)
  activation="manual"                    Pfeiltasten bewegen nur den Fokus, Enter/Leertaste
                                         aktiviert (für Panels mit teurem Inhalt)
  hash                                   aktiver Tab spiegelt sich in der Adresse (#id),
                                         ein Link auf #id öffnet direkt diesen Tab
.ncss-tabs-heading ist optional: die Überschrift je Abschnitt hilft OHNE JS (dort ist es
eine normale Seite mit Abschnitten), MIT JS doppelt sie den Tab-Namen - sie wird dann
nur noch optisch ausgeblendet, bleibt für Screenreader im Panel erhalten.

Abhängigkeiten (Cherry-Picking): colors.css/tokens.css (+ reset/base). js/tabs.js
eigenständig.
```

### `components/tag.css`

Klassen (8): `.ncss-tag` `.ncss-tag--brand` `.ncss-tag--brand-2` `.ncss-tag--danger` `.ncss-tag--sm` `.ncss-tag--success` `.ncss-tag--warning` `.ncss-tag-remove`

```text
ncss - Tag/Chip (Layer "components"): Schlagwort, Filter-Chip oder entfernbarer
Eingabewert. Abgrenzung zu .ncss-badge (components/badge.css): ein Badge ist ein
STATUS-Etikett (gefüllt, nicht interaktiv - "Neu", "3 offen"), ein Tag ist INHALT
(Schlagwort, gewählter Filter, Empfänger) - umrandet, optional klickbar oder entfernbar.
Reines CSS; das Entfernen übernimmt das generische js/dismiss.js (data-ncss-dismiss).
Braucht nur colors.css + tokens.css (+ reset/base) - cherry-pick-fähig.

Markup:
  <span class="ncss-tag">Barrierefreiheit</span>
  <a class="ncss-tag" href="/thema/css">CSS</a>
  <button type="button" class="ncss-tag" aria-pressed="true">Nur offene</button>
  <span class="ncss-tag" data-ncss-dismissible>
    Berlin
    <button type="button" class="ncss-tag-remove" data-ncss-dismiss
            aria-label="Berlin entfernen">&times;</button>
  </span>
Farbvarianten wie .ncss-badge: --brand/--brand-2/--success/--warning/--danger
(Default neutral), --sm für dichte Listen.
```

### `components/text-reveal.css`

Klassen (5): `.ncss-text-reveal` `.ncss-text-reveal--flow` `.ncss-text-reveal--timed` `.ncss-text-reveal--words` `.ncss-text-reveal-word`

```text
ncss - Text-Reveal (Layer "components"): Text startet blass und wird beim
Hindurchscrollen hell - Zeile für Zeile, im Lesefluss oder Wort für Wort. Getrieben von
der view-timeline des Blocks selbst, für die Zeilen-/Fluss-Variante ohne JS und ohne
den Text in Spans zu zerlegen.

Drei Varianten:
  Zeilen (Default) - Verlauf von oben nach unten, auf die Glyphen geschnitten
  (background-clip:text), weiche Kante ca. eine Zeile hoch:
    <p class="ncss-text-reveal">...</p>
  Fluss - Wort für Wort in Leserichtung, über Zeilenumbrüche hinweg (ein Inline-
  Element malt seinen Hintergrund über alle Zeilen-Fragmente, als wäre es EINE lange
  Zeile - ein waagerechter Verlauf folgt dadurch der Leserichtung). Text in EIN Span:
    <p class="ncss-text-reveal ncss-text-reveal--flow"><span>...</span></p>
  Wörter (JS, js/text-reveal.js) - jedes Wort blendet einzeln ein und hebt sich leicht:
    <p class="ncss-text-reveal" data-ncss-text-reveal>...</p>

Parameter (Custom Properties pro Instanz):
  --ncss-text-reveal-color  Endfarbe (Default: var(--ncss-color-text))
  --ncss-text-reveal-from   blasse Startfarbe (Default: Endfarbe zu 20%)
  --ncss-text-reveal-start  Bereichsanfang (Default: cover 15%)
  --ncss-text-reveal-end    Bereichsende (Default: cover 50% - Text ist voll lesbar,
                            sobald er die Viewport-Mitte erreicht)

Ohne animation-timeline, bei prefers-reduced-motion, Forced Colors und im Druck: ganz
normaler, voll lesbarer Text. Screenreader lesen immer den unveränderten Text (auch in
der Wort-Variante bleibt der Text identisch, nur in Spans verpackt).

Benötigt: tokens.css/colors.css (--ncss-color-text, Bewegungs-Tokens). Optional
js/text-reveal.js (Wort-Variante).
```

### `components/theme-toggle.css`

Klassen (4): `.ncss-theme-icon-dark` `.ncss-theme-icon-light` `.ncss-theme-switching` `.ncss-theme-toggle`

```text
ncss - Hell/Dunkel-Umschalter (Layer "components"): Darstellung zu js/theme-toggle.js.
Die eigentliche Farbumschaltung leistet colors.css ([data-theme] + light-dark()), hier
nur zwei Dinge: das passende Icon zeigen und den Wechsel weich machen.

Markup (Icon-Button, z.B. in .ncss-topbar-actions):
<button type="button" class="ncss-theme-toggle" data-ncss-theme-toggle>
  <span class="ncss-icon ncss-icon-moon ncss-theme-icon-dark" aria-hidden="true"></span>
  <span class="ncss-icon ncss-icon-sun ncss-theme-icon-light" aria-hidden="true"></span>
</button>
Sichtbar ist jeweils das Icon des Modus, in den der Klick WECHSELT (Mond im hellen,
Sonne im dunklen Zustand) - gesteuert über [data-theme-resolved], das beide Scripts
setzen. Ohne JS (kein data-theme-resolved) bleibt der Mond sichtbar.
```

### `components/tile.css`

Klassen (5): `.ncss-card` `.ncss-tile` `.ncss-tile--brand` `.ncss-tile--brand-2` `.ncss-tile--muted`

```text
ncss - Tile-Komponente (Layer "components"): volle-Breite Farbflächen-Sektionen zum
Gliedern einer langen Seite in klar unterscheidbare Blöcke (bekannt aus UIkit -
uk-tile-default/-muted/-primary/-secondary). Reines Struktur+Farbe, kein JS.

Markup:
  <section class="ncss-tile">Normale Fläche (Default, kein Modifier nötig)</section>
  <section class="ncss-tile ncss-tile--muted">Gedämpfte Fläche</section>
  <section class="ncss-tile ncss-tile--brand">Marken-Fläche, automatisch heller Text</section>
  <section class="ncss-tile ncss-tile--brand-2">Zweitfarben-Fläche, automatisch heller Text</section>

Ohne weiteres Zutun bleibt eine Tile innerhalb ihres umgebenden Containers (z.B.
.ncss-container) - für volle Bildschirmbreite bis zum Bildschirmrand zusätzlich
.ncss-full-bleed kombinieren. Bewusst getrennt gehalten (nicht automatisch Teil von
.ncss-tile selbst), dieselbe Trennung wie bei Card/Radius-Utilities: eine Komponente
soll nicht zwei unabhängige Entscheidungen gleichzeitig treffen.
Padding über --ncss-tile-padding-block/-inline parametrisierbar (Default
--ncss-space-2xl/-lg), kein eigenes Größen-Klassensystem - die bestehenden
padding-Utilities (helpers/layout.css) würden gegen diesen Default nicht gewinnen
(Layer-Reihenfolge: helpers vor components), deshalb hier bewusst als Custom
Property statt fest codiert - siehe demo/index.html für ein Override-Beispiel.
```

### `components/tooltip.css`

Klassen (1): `.ncss-tooltip`

```text
ncss - Tooltip: kurzer, reiner TEXT-Hinweis zu einem Bedienelement (Layer "components"),
WAI-ARIA-APG-Muster "Tooltip". Für reichhaltigen Inhalt (Links, Bilder, Profil) stattdessen
<ncss-hovercard> (components/hovercard.css) - ein Tooltip enthält NIE etwas Fokussierbares.

Markup - Tooltip direkt hinter dem Auslöser:
<button class="ncss-btn" interestfor="tip-save" aria-describedby="tip-save">Speichern</button>
<span class="ncss-tooltip" id="tip-save" popover="hint" role="tooltip">Strg + S</span>
<script src="js/tooltip.js" defer></script>

Für einen reinen Icon-Button ist der Tooltip die SICHTBARE Beschriftung - der Name kommt
trotzdem aus aria-label (der Tooltip ergänzt nur, er ersetzt den Namen nicht, und ohne JS/
interestfor bleibt er unsichtbar):
<button class="ncss-btn ncss-btn--icon" aria-label="Löschen" interestfor="tip-del"> ...

Drei Pfade (gleiche Logik wie hovercard.css, aber ohne Abhängigkeit davon):
1. Nativ (Chromium mit interestfor): Browser übernimmt Hover, Fokus, Verzögerung
   (interest-delay unten), Esc - der Auslöser wird automatisch zum Anker.
2. js/tooltip.js, wo interestfor fehlt: Zeiger/Tastatur-Fokus mit kurzer Verzögerung,
   bleibt offen, solange der Zeiger auf Auslöser ODER Tooltip ist (WCAG 1.4.13), Esc
   schließt. Anker-Namen setzt das Script; ohne Anchor Positioning rechnet es selbst.
3. Ohne beides: Tooltip bleibt verborgen - aria-describedby liefert den Text trotzdem als
   Beschreibung an Screenreader (funktioniert auch auf verborgene Elemente).

Tokens: --ncss-tooltip-max-width (Default 18rem), --ncss-tooltip-offset.
Abhängigkeiten (Cherry-Picking): colors.css/tokens.css (+ reset/base). Optional
js/tooltip.js.
```

### `components/topbar.css`

Klassen (5): `.ncss-topbar` `.ncss-topbar--transparent` `.ncss-topbar-actions` `.ncss-topbar-brand` `.ncss-topbar-inner`

```text
ncss - Topbar-Komponente (Layer "components"): sticky Kopfleiste mit Brand-/Nav-/
Actions-Bereich. Reines Layout - eine eingebettete .ncss-nav (components/nav.css)
übernimmt die eigentliche Navigation.

Markup:
<header class="ncss-topbar">
  <div class="ncss-topbar-inner">
    <a class="ncss-topbar-brand" href="/">Marke</a>
    <!-- optional: <nav class="ncss-nav">...</nav> -->
    <div class="ncss-topbar-actions">...</div>
  </div>
</header>
```

### `components/video-bg.css`

Klassen (10): `.ncss-video-bg` `.ncss-video-bg--brand` `.ncss-video-bg--dark` `.ncss-video-bg--gradient` `.ncss-video-bg--light` `.ncss-video-bg-media` `.ncss-video-bg-toggle` `.ncss-video-bg-toggle--bottom-start` `.ncss-video-bg-toggle--top-end` `.ncss-video-bg-toggle--top-start`

```text
ncss - Hintergrund-Video (Layer "components"): ein stummes Loop-Video füllt eine
beliebige Fläche (Sektion, Karte, Banner) HINTER ihrem Inhalt, mit Tönung für lesbaren
Text und sichtbarem Pause-Schalter (js/video-bg.js).

  <section class="ncss-video-bg ncss-video-bg--dark" data-ncss-video-bg>
    <video class="ncss-video-bg-media" muted loop playsinline preload="none"
           poster="poster.jpg" aria-hidden="true">
      <source data-src="loop.webm" type="video/webm">
      <source data-src="loop.mp4" type="video/mp4">
    </video>
    <div>... Inhalt ...</div>
  </section>

data-src statt src: nichts wird geladen, bevor die Fläche in die Nähe des Viewports
kommt und Bewegungs-/Daten-Einstellungen es erlauben. Soll das Video auch OHNE JS
laufen: src + autoplay (das Script übernimmt dann trotzdem Pause/Präferenzen).
Art Direction (anderes Video je Breakpoint) bewusst NICHT per <source media> - das
ist bei <video> keine browserübergreifende Funktion (siehe components/video.css);
stattdessen --ncss-video-bg-position für den Bildausschnitt.

Tönungen (setzen zusätzlich color-scheme, damit Tokens innerhalb lesbar auflösen -
Buttons/Karten in der Fläche bekommen automatisch die passende Hälfte ihrer
light-dark()-Farben):
  .ncss-video-bg--dark      dunkle Tönung, heller Text (Default-Wahl für Fotos/Video)
  .ncss-video-bg--light     helle Tönung, dunkler Text
  .ncss-video-bg--brand     dunkle Markenfarben-Tönung, heller Text
  .ncss-video-bg--gradient  Verlauf von unten (Text unten, Bild oben frei sichtbar)
Anpassbar (auf der Fläche): --ncss-video-bg-strength (Deckkraft der Tönung, Default
55%), --ncss-video-bg-position (object-position, Default --ncss-focus-point).

Ohne JS: ein autoplay-Video läuft (stumm, Schleife), der Schalter fehlt; ein
data-src-Video zeigt nur sein Poster. forced-colors: Video + Tönung ausgeblendet,
der Text steht auf Systemfarben.

Benötigt: tokens.css + colors.css. Keine anderen ncss-Dateien.
```

### `components/video-card.css`

Klassen (4): `.ncss-video-card` `.ncss-video-card-badge` `.ncss-video-card-body` `.ncss-video-card-media`

```text
ncss - Video-Vorschaukarte (Layer "components"): das Bild einer Karte spielt eine
kurze, stumme Vorschau ab, solange die Karte mit der Maus berührt oder per Tastatur
fokussiert ist (js/video-card.js). Wiederkehrendes Muster für Mediatheken,
Kurs-/Projektlisten.

  <a class="ncss-video-card" href="film.html">
    <div class="ncss-video-card-media">
      <video muted loop playsinline preload="none" poster="poster.jpg"
             src="vorschau.mp4" aria-hidden="true"></video>
      <span class="ncss-video-card-badge">Vorschau</span>
    </div>
    <div class="ncss-video-card-body"><h3>Titel</h3><p>Text</p></div>
  </a>

preload="none" + poster: vor der ersten Berührung wird kein Byte Video geladen.
Touch-Geräte (kein verlässliches :hover) und reduzierte Bewegung: es läuft nichts, die
Karte zeigt ihr Poster - das "Vorschau"-Badge wird dann ausgeblendet (es gäbe nichts
zu sehen). Tastaturfokus startet die Vorschau unabhängig vom Zeigegerät.

Anpassbar: --ncss-video-card-ratio (16 / 9), --ncss-video-card-radius.
Benötigt: tokens.css + colors.css.
```

### `components/video-float.css`

Klassen (2): `.ncss-video-float-close` `.ncss-video-float-frame`

```text
ncss - <ncss-video-float> (Layer "components"): schwebender Mini-Player. Ein
LAUFENDES Video, das aus dem Bild gescrollt wird, dockt an eine Fensterecke an und
kehrt beim Zurückscrollen an seinen Platz zurück (js/video-float.js).

  <ncss-video-float>
    <div class="ncss-video-float-frame">
      <video controls playsinline poster="poster.jpg" src="film.mp4"></video>
      <!-- oder ein <ncss-video-player> -->
    </div>
  </ncss-video-float>

Das Element bleibt als Platzhalter im Fluss (hält seine Höhe, nichts springt), nur der
Rahmen (.ncss-video-float-frame) wird fixiert. Angedockt erhält er eine Kopfleiste mit
"Schließen"-Button (Text + Symbol) - pausiert und dockt ab; erst nach erneutem
Sichtbarwerden dockt der Player wieder an. Esc im angedockten Player tut dasselbe.

Attribut position="start" (links unten statt rechts) bzw. position="top-end".
Anpassbar: --ncss-video-float-width (Default min(22rem, 100vw - 2 × Abstand)),
--ncss-video-float-gap (Abstand zum Fensterrand), --ncss-video-float-z.

Ohne JS: normales Video im Fluss.
Benötigt: tokens.css + colors.css.
```

### `components/video-player.css`

Klassen (48): `.ncss-video-player-bar` `.ncss-video-player-btn` `.ncss-video-player-btn--big` `.ncss-video-player-btn--cc` `.ncss-video-player-btn--fs` `.ncss-video-player-btn--mute` `.ncss-video-player-btn--next` `.ncss-video-player-btn--pip` `.ncss-video-player-btn--play` `.ncss-video-player-btn--prev` `.ncss-video-player-btn--settings` `.ncss-video-player-buffered` `.ncss-video-player-chapter` `.ncss-video-player-chapter-time` `.ncss-video-player-chapters` `.ncss-video-player-chapters-title` `.ncss-video-player-controls` `.ncss-video-player-cue` `.ncss-video-player-cues` `.ncss-video-player-error` `.ncss-video-player-flash` `.ncss-video-player-head` `.ncss-video-player-marks` `.ncss-video-player-menu` `.ncss-video-player-menu-group` `.ncss-video-player-menu-heading` `.ncss-video-player-menu-item` `.ncss-video-player-meta` `.ncss-video-player-panel` `.ncss-video-player-playlist` `.ncss-video-player-progress` `.ncss-video-player-range` `.ncss-video-player-range--seek` `.ncss-video-player-range--volume` `.ncss-video-player-retry` `.ncss-video-player-seek` `.ncss-video-player-spacer` `.ncss-video-player-spinner` `.ncss-video-player-sr` `.ncss-video-player-stage` `.ncss-video-player-time` `.ncss-video-player-time-sep` `.ncss-video-player-time-total` `.ncss-video-player-tip` `.ncss-video-player-tip-chapter` `.ncss-video-player-title` `.ncss-video-player-track` `.ncss-video-player-volume`

```text
ncss - <ncss-video-player> (Layer "components"): eigener Videoplayer über einem
nativen <video controls>, Logik in js/video-player.js (Markup/Attribute/Tasten dort).

  <ncss-video-player>
    <video controls playsinline preload="metadata" poster="poster.jpg" src="film.mp4">
      <track kind="captions" src="de.vtt" srclang="de" label="Deutsch">
    </video>
  </ncss-video-player>

  Karte mit Kapitel- und Playlist-Spalte (wie <ncss-audio-player layout="card">):
  <ncss-video-player layout="card">
    <video ...></video>
    <p class="ncss-video-player-title">Titel</p>
    <p class="ncss-video-player-meta">Untertitel/Quelle</p>
    <ol class="ncss-video-player-playlist">
      <li><a href="b.mp4" data-poster="b.jpg" data-title="B"><img src="b.jpg" alt="">
        <span>B</span> <span>0:10</span></a></li>
    </ol>
  </ncss-video-player>

Gestaltung: dieselbe Formensprache wie components/audio-player.css - gleiche Symbole,
runder Play-Button in der Akzentfarbe, 0.3rem-Spur mit Griff + Ring, Kapitel als
Lücken, gleiche Kapitel-/Playlist-Listen und Menüs. Weil die Bedienelemente über einem
beliebigen Videobild liegen, stehen sie auf einem weichen Verlauf am unteren Rand
(kein umrahmtes Panel) und sind dort fest weiß - eine Kontrast-Konstante "über Bild",
keine Theme-Farbe (wie .ncss-text-light). Karte, Listen, Zeit-Pille und Menü folgen
dem Seiten-Theme. Die Werte sind bewusst in dieser Datei dupliziert statt aus
audio-player.css geerbt: jede Datei bleibt einzeln einsetzbar.

Zustände:
  - :not(:defined) (kein JS): natives <video controls>, Titel und Playlist als
    einfache Liste darunter (Links öffnen die Dateien).
  - .is-enhanced: eigene Bedienung auf .ncss-video-player-stage (Video + Ebenen; im
    Vollbild nur diese Bühne). Bei layout="card" steht .ncss-video-player-panel
    (Titel, Kapitel, Playlist) neben der Bühne, wenn ~54rem Platz sind, sonst
    darunter (flex-wrap, kein Breakpoint).

Anpassbar (auf dem Element): --ncss-video-player-accent (Default --ncss-color-brand,
wie der Audioplayer), --ncss-video-player-radius, --ncss-video-player-cue-size.

Benötigt: tokens.css + colors.css (+ reset/base). Keine anderen ncss-Dateien - eigene
visually-hidden-Klasse (.ncss-video-player-sr).
```

### `components/video-text.css`

Klassen (3): `.ncss-video-text` `.ncss-video-text-media` `.ncss-video-text-title`

```text
ncss - Video in Schrift (Layer "components"): eine große Überschrift, deren Buchstaben
ein laufendes Video zeigen. Die Überschrift bleibt echter, markierbarer Text; das
Video ist reine Dekoration (aria-hidden).

  <div class="ncss-video-text" data-ncss-video-bg>
    <video class="ncss-video-text-media" muted loop playsinline preload="none"
           poster="poster.jpg" aria-hidden="true">
      <source data-src="loop.mp4" type="video/mp4">
    </video>
    <h2 class="ncss-video-text-title">Bewegung</h2>
  </div>

Technik: EIN Mischmodus für Light UND Dark. Die Überschrift ist eine Ebene mit
mix-blend-mode: hard-light über dem Video - hard-light mit 50 % Grau lässt das Video
unverändert durch (die Buchstaben), mit der Seitenfarbe (--ncss-color-bg: Weiß bzw.
fast Schwarz) ergibt es genau diese Seitenfarbe (die Fläche um die Buchstaben).
Dadurch wechselt die Fläche automatisch mit light-dark(), ohne JS/Media Query. Das
50-%-Grau ist eine Misch-KONSTANTE, keine Theme-Farbe - deshalb kein Token.
Geeignet sind eher mittelhelle bis dunkle, ruhige Motive; sehr helles Material verliert
im Light Mode Kontrast zur weißen Fläche.

Bewegung/Pause: data-ncss-video-bg + js/video-bg.js (optional, empfohlen) liefert
Lazy-Load, sichtbaren Pause-Schalter (WCAG 2.2.2), Pause außerhalb des Viewports und
reduzierte Bewegung (dann füllt das Poster die Schrift). Den Schalter positioniert
components/video-bg.css - ohne diese Datei bleibt er ungestylt, deshalb beide
zusammen einbinden, wenn das Script genutzt wird. Ganz ohne Script: src + autoplay.

Anpassbar: --ncss-video-text-size (Default --ncss-font-size-2xl × 2, gedeckelt auf
18cqi, damit ein ~6-Buchstaben-Wort nie breiter als die Fläche wird),
--ncss-video-text-weight (900).

forced-colors / Druck: normaler Text in Systemfarben, kein Video.
Benötigt: tokens.css + colors.css.
```

### `components/video.css`

Klassen (2): `.ncss-video` `.ncss-video--responsive-crop`

```text
ncss - Video-Komponente (Layer "components"). Lokales <video> soll genauso einfach zu
handhaben sein wie <img> - reset.css setzt bereits display:block/max-width:100%/height:auto
identisch für beide Elemente. Diese Datei ergänzt nur dieselbe optische Politur, die <img>
bereits über helpers/media.css bekommt (Seitenverhältnis, abgerundete Ecken, Bildunterschrift).

Einfachster Fall (reicht meistens schon, keine Klasse nötig):
  <video src="clip.mp4" controls poster="poster.jpg"></video>
poster+controls geben "Klick zum Abspielen" komplett nativ, ganz ohne eigenes JS.

Mit festem Seitenverhältnis (z.B. Raster aus Vorschau-Videos mit unterschiedlichem
Quellformat) - kombinierbar mit den Aspect-Ratio-Helpers aus helpers/media.css:
  <div class="ncss-video ncss-ratio-video">
    <video src="clip.mp4" controls poster="poster.jpg"></video>
  </div>

Mit Bildunterschrift (gleiches Muster wie .ncss-figure für <img>):
  <figure class="ncss-video ncss-ratio-video">
    <video src="clip.mp4" controls poster="poster.jpg"></video>
    <figcaption>Bildunterschrift</figcaption>
  </figure>
  (figcaption-Optik kommt bereits aus base.css, gemeinsam mit <img> genutzt.)

Absichtlich NICHT enthalten: ein eigener Play-Button-Overlay-Zustand über die CSS-
Pseudoklassen :playing/:paused - die sind Stand jetzt (Interop-2026-Ziel) noch nicht
Baseline/browserübergreifend verlässlich. Natives poster+controls deckt den "Klick zum
Abspielen"-Fall schon vollständig ab; :playing/:paused später ergänzen, sobald
Baseline (siehe dasselbe Vorgehen wie bei text-box-trim in base.css).

--- Art Direction bei Video: bewusst KEIN <source media="..."> --------------------------
Für <img> ist <picture><source media="..."></picture> die korrekte, voll unterstützte
Lösung für "andere Bilddatei je nach Viewport" (siehe helpers/media.css/media.html-Demo).
Für <video> gibt es das NICHT verlässlich: <source media="..."> wurde aus der Spec und
den meisten Browsern wieder entfernt (per Recherche bestätigt, Stand August 2026) - nur
Safari/WebKit unterstützt es noch als Altlast, kein cross-browser-taugliches Feature.
Ohne JS bleibt als einzige verlässliche "Art Direction"-Annäherung: DASSELBE Video per
object-fit:cover unterschiedlich zuschneiden (.ncss-video--responsive-crop unten) - kein
anderes Filmmaterial je Breakpoint, aber ein anderer Bildausschnitt. Für echtes anderes
Filmmaterial je Breakpoint bräuchte es kleines JS (matchMedia + src-Wechsel) - bewusst
nicht Teil dieser Datei, um video.css JS-frei zu halten; bei Bedarf gezielt ergänzen.
```

## Integrationen (dist/integrations/, opt-in)

### `integrations/fontawesome-font-display-fix.css`

```text
NativeCSS - Font-Display-Fix für Font Awesome (vendor/fontawesome/, NICHT selbst
angefasst - siehe unten für die Begründung). Eigene, OPT-IN Datei (wie theme.css/
page-transitions.css) - NACH vendor/fontawesome/css/all.min.css laden.

Lighthouse-Audit "Ensure text remains visible during webfont load" (User-Report):
Font Awesomes eigene @font-face-Regeln setzen `font-display: block` - kein FEHLENDER
Wert (der Default wäre `auto`, von Lighthouse ebenfalls bemängelt), sondern eine
BEWUSSTE Entscheidung der Bibliothek selbst, nur eben eine, die Lighthouse als
suboptimal einstuft. `swap`/`optional` sind Lighthouses eigene Empfehlung.

`swap` NICHT gewählt: für ein Icon-Font ist ein sofortiger Fallback-Glyph oft eine
FALSCHE/fehlende Glyphe (kein Icon oder ein Tofu-Kästchen) für die Dauer des Ladens,
bis der echte Font eintrifft ("Flash of wrong/missing icon") - schlechter als das
kurze Unsichtbar-Fenster von `block`. `optional` stattdessen: kurzes Lade-Fenster
(~100ms Spec-Minimum), danach entweder der fertige Font ODER der Browser gibt auf und
zeigt dauerhaft den Fallback, OHNE beliebig lang auf ein langsames Netz zu warten -
bei einem bereits gecachten Font (jeder wiederkehrende Besuch) macht das ohnehin
keinen Unterschied, der Font steht sofort bereit.

ERSTER Versuch (verworfen): dieselben drei @font-face-Deskriptoren (Familie/Gewicht/
Quelle) unter IDENTISCHEM Namen erneut deklarieren, nur mit anderem font-display -
per Recherche widerlegt, BEVOR es ausgeliefert wurde: zwei @font-face-Regeln mit
exakt gleicher Familie/Gewicht/Stil bilden KEIN "letzte Regel gewinnt"-Override,
sondern eine "Composite Face" - der Browser wählt zwischen den Kandidaten anhand der
tatsächlichen Zeichenabdeckung (unicode-range), nicht per Ladereihenfolge. Per echtem
Playwright-Test bestätigt: `document.fonts` enthielt danach BEIDE Einträge
gleichzeitig (den alten `block`- UND den neuen `optional`-Eintrag) - welcher davon
tatsächlich das Lade-Timing bestimmt, ist damit nicht zuverlässig steuerbar.

ENDGÜLTIGER Fix: Font Awesomes eigene CSS setzt `font-family` nie hart, sondern über
die Custom Properties `--fa-family-classic`/`--fa-family-brands` (per Sichtprüfung im
Vendor-Code bestätigt: `.fas,.fa-classic{--fa-family:var(--fa-family-classic)}` usw.,
die eigentliche Regel konsumiert das über `font-family:var(--_fa-family)`). Hier
werden GENAU diese beiden Custom Properties auf zwei neue, ausschließlich von dieser
Datei definierte Familiennamen umgebogen - jeweils NUR EIN @font-face pro Familie/
Gewicht, keine Namenskollision mit Font Awesomes eigenen Regeln, dadurch auch keine
Composite-Face-Mehrdeutigkeit mehr möglich. Unlayered (wie theme.css) gewinnt
automatisch gegen die gelayerte Vendor-CSS, kein !important/höhere Spezifität nötig.
```

### `integrations/webawesome-bridge.css`

Klassen (6): `.ncss-gradient-brand` `.ncss-surface--brand` `.ncss-surface--brand-2` `.ncss-surface--neutral` `.ncss-text-dark` `.ncss-text-light`

```text
ncss - Web Awesome Bridge (Layer "webawesome-bridge", höchste Priorität - siehe
ncss.css für die Layer-Order, die das seitenweit garantiert, unabhängig von <link>-
Reihenfolge im HTML).

Zweck: Web Awesome NICHT mit eigenen, parallelen Farb-/Abstands-/Typografie-Werten
laufen lassen - stattdessen werden Web Awesomes eigene CSS Custom Properties hier auf
unsere ncss-Tokens gemappt. ncss-Tokens (tokens.css/colors.css) bleiben die EINZIGE
Quelle der Wahrheit; diese Datei ist reine Übersetzung, keine zweite Werteliste.

Web Awesomes Komponenten (Button, Badge, Input, Tooltip, Dialog, ...) beziehen ihre
Farben/Radien/Schriften fast ausschließlich aus genau diesen globalen "semantischen"
Tokens (--wa-color-{familie}-{fill|border|on}-{quiet|normal|loud}, --wa-font-*,
--wa-space-*, --wa-border-radius-*) - siehe vendor/webawesome/dist-cdn/styles/themes/
default.css. Kein Component-CSS selbst anfassen, kein ::part()-Gefrickel nötig, um den
Look zu übernehmen - EIN Bridge-Layer auf :root reicht für die große Mehrheit der Fälle.

Web Awesomes eigenes Theme schaltet Light/Dark über Klassen (.wa-light/.wa-dark) um -
ncss dagegen über light-dark() + color-scheme (siehe colors.css). Statt beide Mechanismen
synchron zu halten (fragil, zwei Zustände die auseinanderlaufen können), übersteuern wir
hier direkt auf die FERTIGEN, bereits theme-fähigen ncss-Tokens - die WA-Klassen werden
dadurch für die gemappten Werte irrelevant, ncss' color-scheme entscheidet.

"quiet/normal/loud" ~ unsere 100/300/500(-900)-Farbskala: quiet = dezente Fläche
(Badge-/Callout-Hintergrund), normal = etwas kräftiger (Rahmen/Hover/gefüllte Buttons je
nach Komponente - Web Awesome nutzt "normal" z.B. für <wa-button appearance="filled">),
loud = die volle Markenfarbe. "on-*" ist die dazu passende Textfarbe.

WICHTIG (per echtem Dark-Mode-Screenshot als Bug gefunden, dann behoben): on-quiet/
on-normal NICHT auf einen einzelnen fixen Wert wie X-700 mappen. X-100/-300 sind seit
colors.css' Fix selbst light-dark()-gewrappt (dezent im Light Mode Richtung weiß, im
Dark Mode Richtung schwarz gemischt) - ein Text, der im Light Mode auf der hellen
X-100/300-Fläche funktioniert (dunkel, z.B. X-700), wäre im Dark Mode auf der jetzt
DUNKLEN X-100/300-Fläche selbst wieder unlesbar. Beide brauchen daher das ebenfalls in
colors.css zentral definierte --ncss-color-X-on-soft (selbst light-dark(X-700, X) -
im Dark Mode reicht die Basisfarbe X als Text, die dort ohnehin schon hell/leuchtend
ist). Gilt genauso für den Fall OHNE Füllung (appearance="outlined"/"plain", Text sitzt
direkt auf Seite/Card statt auf einem Chip) - dieselbe Logik passt zufällig auch dort,
weil beide Fälle "dunkler Text im Light Mode, heller Text im Dark Mode" wollen. Derselbe
-on-soft-Token wird auch von components/badge.css und demo/landing.css verwendet -
eine Definition statt der Formel an mehreren Stellen dupliziert.
```

## JavaScript (dist/js/, je Datei opt-in)

### `js/audio-player.js`

Elemente: `<ncss-audio-player>`

Attribute: `layout="card"`, `waveform`, `skip-back="15"`, `skip-forward="30"`, `speeds="0.75 1 1.25 1.5 1.75 2"`, `exclusive="false"`

data-Attribute: `data-ncss-player-media`

Events: `ncss-audio-trackchange`, `ncss-media-ended`, `ncss-media-pause`, `ncss-media-play`

Öffentlich: `el.play()`, `el.pause()`, `el.toggle()`, `el.seek(s)`, `el.skip(+/-s)`, `el.next()`, `el.previous()`, `el.load(index)`, `el.media`

```text
ncss - <ncss-audio-player>: eigener Audioplayer als Light-DOM-Custom-Element (kein
Shadow Root). Optik: components/audio-player.css. Progressive Enhancement über ein
natives <audio controls> - ohne JS bleibt der Browser-Player, Playlist-Links bleiben
normale Links auf die Dateien.

Kompakt (eine Zeile):
  <ncss-audio-player>
    <audio controls preload="metadata" src="folge.m4a"></audio>
  </ncss-audio-player>

Karte (layout="card": Cover, Titel, Interpret, Kapitelliste, Playlist):
  <ncss-audio-player layout="card" waveform>
    <img class="ncss-audio-player-cover" src="cover.svg" alt="">
    <p class="ncss-audio-player-title">Titel</p>
    <p class="ncss-audio-player-artist">Interpret</p>
    <audio controls preload="metadata" src="a.m4a">
      <track kind="chapters" src="a-kapitel.vtt" srclang="de">
    </audio>
    <ol class="ncss-audio-player-playlist">
      <li><a href="b.m4a" data-title="B" data-artist="..." data-cover="b.svg"
             data-chapters="b-kapitel.vtt">B</a></li>
    </ol>
  </ncss-audio-player>

Ergänzt: Play/Pause, -15/+30 s (als Text-Buttons), Zeitleiste mit Kapitelmarken,
Zeit, Ton aus + Lautstärke, Geschwindigkeitsmenü, klickbare Kapitelliste (Karte),
optional eine Wellenform statt der Spur, Playlist mit Vor/Zurück + automatischem
nächsten Titel, Media Session (Titel/Cover im Sperrbildschirm, Medientasten).

Attribute:
  layout="card"                Kartenlayout (sonst kompakt)
  waveform                     Wellenform zeichnen (nur gleiche Herkunft, Datei wird
                               einmal per Web Audio dekodiert, bis 8 MB)
  skip-back="15" skip-forward="30"
  speeds="0.75 1 1.25 1.5 1.75 2"
  exclusive="false"            darf parallel zu anderen Playern laufen
Events (bubbeln): ncss-media-play, ncss-media-pause, ncss-media-ended
  (detail { currentTime, duration }), ncss-audio-trackchange (detail { index, item }).
Öffentlich: el.play(), el.pause(), el.toggle(), el.seek(s), el.skip(+/-s), el.next(),
  el.previous(), el.load(index), el.media.
Tasten (Fokus im Player): Leertaste/K, J/L (-/+ Sprungweite), Pfeil links/rechts
  -/+5 s, M, 0-9, Pos1/Ende.

Ein Player gleichzeitig: dieselbe Attribut-Konvention wie video-player.js
(data-ncss-player-media) - die Logik ist bewusst in beiden Dateien dupliziert.

Benötigt: components/audio-player.css (+ tokens.css/colors.css). Keine anderen
ncss-Scripts. Ohne customElements wird nichts definiert (SKILL-Regel) - natives
<audio controls> bleibt.
```

### `js/backdrop.js`

data-Attribute: `data-ncss-backdrop`

```text
ncss - Backdrop: wechselt die Bilder von [data-ncss-backdrop] im Intervall
(data-interval in ms, Default 6000). Kleines Opt-in-Enhancement zu
components/backdrop.css - ohne dieses Script bleibt das erste Bild stehen.

- lädt das jeweils nächste Bild vor (loading="lazy" -> "eager"), blendet erst ein,
  wenn es geladen ist - kein Überblenden auf eine leere Fläche
- pausiert in Hintergrund-Tabs (visibilitychange) statt Bilder ungesehen zu laden
- bei prefers-reduced-motion: kein automatischer Wechsel, nur das erste Bild
- setzt --ncss-backdrop-duration passend zum Intervall (Zoom läuft über die Überblendung
  hinaus weiter, sonst "springt" der Zoom beim Wechsel)
```

### `js/code-block.js`

data-Attribute: `data-ncss-code-tabindex`

```text
ncss - Code-Block: ruft das self-hosted Prism.js (vendor/prismjs/) einmal
kontrolliert auf (statt Prisms eigenem, unkontrolliertem DOMContentLoaded-Autostart -
siehe code-block.css für die dafür nötige "window.Prism = { manual: true }"-Zeile VOR
dem Laden von prism-core) und ergänzt jeden gefundenen Code-Block danach um einen
Copy-to-Clipboard-Button. Läuft auch ohne Prism (z.B. falls nur der Copy-Button
gebraucht wird, ohne die Prism-Scripts einzubinden) - Highlighting wird dann einfach
übersprungen, der Rohtext bleibt unhighlighted, aber kopierbar.

deepQueryAll() statt document.querySelectorAll(): ein Code-Block INNERHALB eines
<ncss-container> (siehe ncss-container.js) liegt in dessen Shadow Root -
querySelectorAll() durchquert Shadow-Grenzen nicht. Aus demselben Grund wird
Prism.highlightElement() PRO Block aufgerufen statt des document-globalen
Prism.highlightAll() - highlightElement() arbeitet direkt auf dem übergebenen Element,
unabhängig davon, wo es im DOM (oder Shadow-DOM-Baum) sitzt.
```

### `js/combobox.js`

data-Attribute: `data-ncss-combobox`

```text
ncss - Combobox: opt-in JS-Enhancement für zwei native Muster mit unstylebarem Popup
(siehe combobox.css für die Begründung, warum reines CSS hier nicht reicht):

1. <input list="..."> + <datalist> -> filterbares custom Dropdown, Original-Element
   bleibt Werttyp (echtes <input>, kein Ersatz).
2. <select class="ncss-select"> (nur dort, wo components/select.css KEIN
   "appearance: base-select" aktiviert - siehe dessen Kopf-Kommentar für die genaue
   Bedingung, u.a. auch WebKit/Safari, siehe enhanceSelect() unten) -> natives
   <select> bleibt der Werthalter, wird aber visuell + für Assistive Technology
   durch einen custom Trigger-Button + Listbox ersetzt (WAI-ARIA "Select-Only
   Combobox"-Muster: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), da die
   native Popup-Optik dort durch nichts erreichbar ist.

Beides bewusst NUR als Enhancement, nie als Ersatz der Funktionalität: ohne dieses
Script (oder wenn JS fehlschlägt) bleibt die volle native Basisversion nutzbar.

Einbindung (nur auf Seiten mit <input list>/<datalist> oder <select> nötig):
  <script src="components/combobox.js" defer></script>
```

### `js/command-fallback.js`

```text
ncss - command/commandfor-Fallback: generisch, NICHT an eine Komponente gebunden -
greift für jeden <button command="show-modal|close" commandfor="..."> auf der Seite
(Modal, Off-Canvas, Nav-Mobile-Panel, ...). Bildet nur "show-modal" und "close" nach,
mehr wird aktuell nirgends gebraucht. Bei nativer Unterstützung greift dieses Script
nicht ein (Buttons funktionieren dann bereits ganz ohne JS) - reine Progressive-
Enhancement-Ergänzung, kein Ersatz. Einmal pro Seite einbinden, unabhängig davon,
welche/wie viele der obigen Komponenten verwendet werden.
```

### `js/command-palette.js`

Elemente: `<ncss-command-palette>`

Attribute: `shortcut="k"`, `slash`, `status-text="{n} Treffer"`, `src="suche.json"`, `limit="8"`

data-Attribute: `data-ncss-command-key`

Events: `ncss-command-hide`, `ncss-command-select`, `ncss-command-show`

Öffentlich: `el.show()`, `el.hide()`, `el.toggle()`, `el.filter(text)`

```text
ncss - <ncss-command-palette>: Befehlspalette (siehe components/command-palette.css für
Markup). Light-DOM-Custom-Element ohne Shadow Root um einen <dialog class="ncss-command">.
Filtert die .ncss-command-item-Einträge im Markup (Text + data-keywords, Groß-/Klein-
schreibung und Akzente egal, alle Begriffe müssen vorkommen), blendet leere Gruppen aus,
zeigt .ncss-command-empty bei 0 Treffern und sagt die Trefferzahl per Live-Region an.

WAI-ARIA Combobox + Listbox (wie js/livesearch.js): Fokus bleibt im Eingabefeld,
aria-activedescendant zeigt auf die gewählte Option.
Tastatur: Pfeil runter/hoch (springt am Ende um), Pos1/Ende mit Strg, Enter führt die
gewählte Option aus (Link folgt seinem href, Button wird geklickt), Esc schließt (nativer
<dialog>). Mausbewegung über die Liste wählt mit.

Attribute am Element:
  shortcut="k"   opt-in Tastenkürzel: ⌘K auf Apple-Geräten, sonst Strg+K (öffnet/schließt)
  slash          zusätzlich "/" als Kürzel (nur wenn gerade kein Eingabefeld Fokus hat)
  status-text="{n} Treffer"  Ansage der Trefferzahl, Default nach <html lang>
  src="suche.json"  opt-in SUCHMODUS für große Listen: die Einträge kommen aus einer
                 JSON-Datei (beim ersten Öffnen geladen, kein Server nötig) und werden
                 erst beim Tippen gerendert - gerankt, je Gruppe begrenzt, Treffer mit
                 <mark> hervorgehoben. Format:
                   { "groups": [{ "id": "pages", "label": "Seiten" }, ...],
                     "items":  [{ "g": "pages", "t": "Titel", "u": "de/seite.html#anker",
                                  "h": "Hinweis rechts", "s": "Textauszug", "k": "Stichwörter" }] }
                 "u" gilt relativ zur JSON-Datei (dieselbe Liste funktioniert von jeder
                 Seite aus). Einträge im Markup bleiben erhalten (z.B. als Vorschläge bei
                 leerem Feld und als Inhalt ohne JS).
  limit="8"      Suchmodus: höchstens so viele Treffer je Gruppe (Default 8)
Elemente mit [data-ncss-command-key] (z.B. das <kbd> im Öffnen-Button) bekommen den
passenden Kürzel-Text ("⌘K" bzw. "Strg K"/"Ctrl K").

Events (am Element, bubbeln):
  ncss-command-select { item }  cancelable - preventDefault() hält die Palette offen und
                                unterdrückt die Standardaktion (Link/Button)
  ncss-command-show / ncss-command-hide
Öffentlich: el.show(), el.hide(), el.toggle(), el.filter(text)

Abhängigkeiten: keine anderen ncss-Scripts. Öffnet den Dialog bei fehlendem nativen
command/commandfor selbst (eigener Klick-Listener, nur für Buttons, die auf DIESEN
Dialog zeigen) - js/command-fallback.js ist dafür nicht nötig. Ohne customElements oder
HTMLDialogElement wird nichts registriert (Element bleibt :not(:defined), alle Einträge
bleiben normale Links/Buttons).
```

### `js/compare.js`

Elemente: `<ncss-compare>`

Attribute: `value-text="{n} % vorher"`

Events: `ncss-compare-change`

Öffentlich: `el.value`

```text
ncss - <ncss-compare>: Vorher/Nachher-Vergleich (siehe components/compare.css für
Markup). Light-DOM-Custom-Element ohne Shadow Root - der native
<input type="range"> darin erledigt Maus, Touch, Tastatur und Screenreader, dieses
Script kopiert nur den Wert nach --ncss-compare-position und setzt aria-valuetext.

Attribute:
  value-text="{n} % vorher"   gesprochener Wert ({n} = Prozent), Default nach <html lang>

Events (bubbeln): ncss-compare-change { value } - bei jeder Bewegung des Reglers.
Öffentlich: el.value (lesen/setzen, 0-100 bzw. min-max des Reglers).

Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements (sehr alte Browser)
wird gar nichts registriert - das Element bleibt :not(:defined), CSS zeigt den
statischen 50/50-Vergleich ohne Regler (siehe SKILL.md-Regel zu define()-Guards).
```

### `js/content-observer.js`

data-Attribute: `data-ncss-observe`

Events: `ncss-content-change`

```text
ncss - Content-Observer (opt-in): meldet neu eingefügtes Markup automatisch per
"ncss-content-change"-Event, damit die Attribut-Scripts aus js/ (count-up, reveal,
marquee, sparkline, downloads, events, code-block, combobox, livesearch, ...) es
initialisieren - ohne dass der Host-Code (htmx, eigenes fetch+innerHTML, REDAXO-
Frontend-Editing) selbst etwas dispatchen muss.

PRIMÄRER Weg bleibt das explizite Event - billiger, präzise und ohne Beobachter:
  document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: el } }));
Dieses Script ist nur für Umgebungen gedacht, in denen sich der Einfüge-Code nicht
anpassen lässt. Es ist komplett eigenständig - jedes ncss-Script funktioniert auch
ohne es, und es funktioniert ohne jedes andere ncss-Script (dann feuert es nur Events,
auf die niemand hört).

Mechanik: EIN MutationObserver (childList + subtree auf <html>). Eingefügte ELEMENT-
Knoten werden pro Animation-Frame gesammelt (eine htmx-Antwort mit 200 Karten ergibt
EIN Event pro oberstem eingefügten Knoten, nicht 200 Events pro Frame-Fragment), Knoten,
die in einem anderen Knoten desselben Schubs stecken oder inzwischen wieder entfernt
wurden, fallen heraus. Pro übrig gebliebenem Wurzel-Knoten ein Event mit
detail.root = Knoten und detail.source = "observer" (zur Unterscheidung vom
expliziten Aufruf, falls Host-Code beides kombiniert).

Doppelte Meldung (expliziter Dispatch UND Observer) ist unschädlich - jedes ncss-Script
merkt sich bereits verarbeitete Elemente (WeakSet) und initialisiert nie doppelt.
Markup, das ncss-Scripts SELBST erzeugen (Marquee-Kopie, Sparkline-Tabelle, ...), löst
ebenfalls ein Event aus - die Scripts finden darin nichts Neues, kein Endlos-Kreislauf.

Opt-out für einzelne Bereiche (z.B. ein häufig neu gerendertes Live-Widget):
data-ncss-observe="off" auf einem Vorfahren - Einfügungen darin werden ignoriert.

Einbindung: <script src="ncss/js/content-observer.js" defer></script>
```

### `js/count-up.js`

data-Attribute: `data-ncss-count-decimals`, `data-ncss-count-text`, `data-ncss-count-up`

Events: `ncss-content-change`

```text
NativeCSS - opt-in Begleiter für components/count-up.css
(<span class="ncss-count-up" data-ncss-count-up style="--ncss-count-to: 40">40</span>,
oder data-ncss-count-up auf einem Vorfahren, z.B. <dl class="ncss-dl--stats"
data-ncss-count-up> - dann zählt jedes .ncss-count-up darin).

Mit diesem Script zählt die Zahl IMMER zeitbasiert per JS (requestAnimationFrame), in
allen Browsern - auch dort, wo CSS-Scroll-Trigger (timeline-trigger, Chromium) die
Zählung selbst abspielen könnten. Grund: die reine CSS-Variante zählt über counter(),
und counter() kennt keine Tausender-Trenner ("12500" statt "12.500" während des
Zählens, per Demo-Test gefunden). Das Script formatiert jeden Zwischenwert per
Intl.NumberFormat in der Sprache des nächsten [lang]-Vorfahren (de: "12.500",
en: "12,500") und schreibt ihn nach data-ncss-count-text, das ::after per attr() zeigt.
Der echte, fertig formatierte DOM-Text bleibt unverändert (Screenreader, Kopieren).

Start, sobald die Zahl ins Bild kommt (IntersectionObserver). Nachkommastellen: aus
--ncss-count-to übernommen ("4.5" -> eine Stelle) oder per data-ncss-count-decimals.
Fehlt --ncss-count-to, wird der Zielwert aus dem Text gelesen ("12.500" -> 12500).
Unter prefers-reduced-motion: keine Änderung, die fertige Zahl bleibt stehen.

Dynamische Inhalte: neu eingefügte Zahlen per
  document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: el } }))
melden (oder js/content-observer.js einbinden) - bereits verarbeitete Elemente werden
nie doppelt gestartet.

Benötigt: components/count-up.css.
Einbindung: <script src="ncss/js/count-up.js" defer></script>
```

### `js/countdown.js`

Elemente: `<ncss-countdown>`

Attribute: `datetime="2026-12-24T18:00:00+01:00"`

data-Attribute: `data-ncss-announce`, `data-ncss-done-text`, `data-ncss-ended`, `data-ncss-units`

Events: `ncss-countdown-end`

```text
ncss - <ncss-countdown>: Restzeit bis zu einem Zeitpunkt (Markup/Optik siehe
components/countdown.css). Reines Light-DOM-Custom-Element.

Ohne JS bleibt der Inhalt stehen, den das Markup mitbringt - ein normales <time> mit
dem ausgeschriebenen Datum ("24. Dezember 2026, 18 Uhr"), immer lesbar und korrekt.
Mit JS: sichtbare Ziffern-Kacheln (aria-hidden, sie ticken jede Sekunde) + eine
Screenreader-Zeile mit role="timer" (ARIA: implizit aria-live="off"), die nur
MINÜTLICH neu geschrieben wird - jederzeit lesbar, aber nie ungefragt vorgelesen (eine
Sekunden-Ansage wäre unbenutzbar). Ansagen laufen über eine ZWEITE, von Anfang an
leere role="status"-Region (eine Live-Region erst nachträglich auf "polite" umzustellen
ist in Screenreadern unzuverlässig):
  - data-ncss-announce="minute": dort zusätzlich minütlich der neue Stand.
  - Das ENDE wird immer angesagt.

Attribute:
  datetime="2026-12-24T18:00:00+01:00"  Zielzeitpunkt (Pflicht, ISO 8601; ohne Zone =
                                         lokale Zeit des Besuchers)
  data-ncss-units="days hours minutes seconds"   sichtbare Einheiten (Default alle)
  data-ncss-done-text="Jetzt live!"     Text nach Ablauf (Default: "Abgelaufen")
Einheiten-Beschriftung + Zahlenformat kommen aus Intl.NumberFormat (style "unit") nach
lang des Elements/der Seite - "Tage"/"days" ohne eigene Übersetzungstabelle.

Event: "ncss-countdown-end" (bubbles), nur wenn der Zeitpunkt WÄHREND des Besuchs
erreicht wird - ist er beim Laden schon vorbei, zeigt das Element still den Endzustand
(sonst feuerte jede spätere Seitenansicht erneut z.B. eine Benachrichtigung).
Endzustand zusätzlich als Attribut data-ncss-ended (für CSS).
```

### `js/dialog-light-dismiss.js`

```text
ncss - "Klick daneben schließt" (Light Dismiss) für ncss-Dialoge: .ncss-modal,
.ncss-offcanvas (inkl. Nav-Panel), .ncss-command (Befehlspalette), Lightbox.

Nativ heißt das <dialog closedby="any">: Klick auf den Backdrop UND Esc schließen. Dieses
Script macht das zum DEFAULT, ohne dass jedes Markup das Attribut tragen muss:
  (a) jeder passende <dialog> OHNE closedby-Attribut bekommt closedby="any" - beim Laden,
      bei ncss-content-change (detail.root) und spätestens beim Öffnen (toggle-Event),
      egal ob per command="show-modal", showModal() oder js/command-fallback.js;
  (b) Browser ohne closedby (HTMLDialogElement.prototype.closedBy fehlt): dasselbe
      Verhalten emuliert - pointerdown UND click müssen beide AUSSERHALB der Panel-Box
      auf dem Dialog selbst (= Backdrop) liegen. Eine Textmarkierung, die im Panel
      beginnt und daneben endet, schließt dadurch NICHT. Geschlossen wird per
      requestClose() (feuert "cancel" - event.preventDefault() hält den Dialog offen),
      ohne requestClose ein selbst gefeuertes, abbrechbares "cancel" + close().

Abschalten pro Dialog - einfach das native Attribut selbst setzen, das Script fasst einen
Dialog MIT closedby nie an:
  closedby="closerequest"   nur Esc + Buttons (kein Klick daneben)
  closedby="none"           nur Buttons (z.B. lange Formulare; im Emulations-Pfad wird
                            dann auch Esc abgefangen)

Fokus: der Browser gibt ihn beim Schließen eines per showModal() geöffneten Dialogs
selbst an den Auslöser zurück - unabhängig davon, wie geschlossen wurde.

Abhängigkeiten: keine anderen ncss-Scripts. Ohne <dialog>-Unterstützung tut es nichts.
```

### `js/dismiss.js`

data-Attribute: `data-ncss-dismiss`, `data-ncss-dismiss-focus`, `data-ncss-dismissible`

Events: `ncss-dismiss-remove`

```text
ncss - Generisches "Schließen/Entfernen" für Alerts, Tags/Chips und alles andere mit
[data-ncss-dismissible] (siehe components/alert.css, components/tag.css).

Markup:
  <div class="ncss-alert" data-ncss-dismissible> ...
    <button type="button" data-ncss-dismiss aria-label="Hinweis schließen"></button>
  </div>
  <button data-ncss-dismiss="#banner">...</button>   Ziel per Selektor statt Vorfahre
  data-ncss-dismissible="hide"                         nur verstecken (hidden) statt
                                                       aus dem DOM entfernen
  data-ncss-dismiss-focus="#selector"                 (am Ziel) Fokus-Ziel danach

Fokus (WCAG 2.4.3): lag der Fokus im entfernten Element, landet er nicht im Nichts
(document.body), sondern auf dem nächsten Geschwister-Ziel gleicher Art (dessen
Schließen-Button - z.B. der nächste Tag in einer Liste), sonst dem vorherigen, sonst auf
data-ncss-dismiss-focus, sonst auf dem Eltern-Element (tabindex="-1" wird dafür gesetzt).

Event (am Ziel, bubbelt, abbrechbar): ncss-dismiss-remove, detail { trigger } -
event.preventDefault() verhindert das Entfernen (z.B. erst Server-Request abwarten).

Ohne JS: der Button tut nichts. Wer keinen toten Button zeigen will, setzt hidden auf
den Button - das Script entfernt es (beim Laden und bei ncss-content-change).

Dynamische Inhalte: Klick-Delegation am document - nachgeladene Elemente funktionieren
ohne weiteres Zutun. Nur das hidden-Entfernen an neuen Buttons läuft über scan(root) +
ncss-content-change (detail.root).

Abhängigkeiten: keine anderen ncss-Scripts.
```

### `js/downloads.js`

Events: `ncss-content-change`

```text
ncss - Downloads-Widget: rendert eine Datei-Download-Liste aus einer JSON-Quelle -
native HTML-Alternative zu einem eingebetteten Datei-Browser-iframe.

Markup (opt-in): <div class="ncss-downloads" data-src="downloads.json"></div>
data-src: JSON-Array, jedes Element {title, url, size?, type?, description?}.
  type: Dateiendung ohne Punkt (z.B. "pdf") - fehlt es, wird sie aus der url-Endung
  abgeleitet. size: Bytes (Zahl) - fehlt es, wird keine Größenangabe gerendert.

Sprache: nächster [lang]-Vorfahre des Widgets (sonst <html lang>) - bestimmt Texte UND
Zahlenformat (Intl.NumberFormat: "1,2 MB" auf Deutsch, "1.2 MB" auf Englisch). Jeder
Herunterladen-Link trägt einen eindeutigen zugänglichen Namen mit Typ, Dateiname und
Größe ("PDF herunterladen: Preisliste 2026, 1,2 MB") - mehrere gleichlautende
"Herunterladen"-Links wären in einer Linkliste des Screenreaders sonst nicht
unterscheidbar (WCAG 2.4.4/2.4.9). Der sichtbare Text bleibt kurz, der Name beginnt
aber mit ihm (WCAG 2.5.3 "Label in Name").

Dynamische Inhalte: neu eingefügte Widgets per
  document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: el } }))
melden (oder js/content-observer.js einbinden) - jedes Widget lädt nur einmal.
```

### `js/dropzone.js`

Elemente: `<ncss-dropzone>`

data-Attribute: `data-ncss-dragover`, `data-ncss-index`, `data-ncss-max-size`

Events: `ncss-dropzone-change`

```text
ncss - <ncss-dropzone>: Drag & Drop + Dateiliste für ein ECHTES <input type="file">
(Markup/Optik siehe components/dropzone.css). Reines Light-DOM-Custom-Element, kein
Upload: das Script verwaltet nur die AUSWAHL clientseitig - übertragen wird wie immer
über das native Feld beim Formular-Versand (oder eigenes fetch() mit FormData).

Kern-Trick: input.files lässt sich nur über ein DataTransfer-Objekt neu setzen. Fehlt
der DataTransfer-Konstruktor (sehr alte Browser), wird das Element GAR NICHT
registriert (Guard um customElements.define, siehe Skill) - es bleibt :not(:defined),
das native Feld bleibt sichtbar und funktioniert normal.

Attribute (alle optional):
  data-ncss-max-size="10MB"   Höchstgröße je Datei (Zahl = Bytes, oder kB/MB/GB)
  data-ncss-text-*            eigene Texte (remove, status, type, size), {name}/{n}/{max}
                              als Platzhalter - Default deutsch/englisch nach lang
Accept-Filter: das accept-Attribut des Inputs gilt auch für GEZOGENE Dateien (der
Browser prüft es nur im Auswahldialog).

Event: "ncss-dropzone-change" (bubbles) mit detail.files (Array<File>) nach jeder
Änderung - zusätzlich feuert das native Feld "change"/"input", damit bestehende
Formular-Logik (Validierung, htmx etc.) die neue Auswahl mitbekommt.
```

### `js/events.js`

```text
ncss - Events-Widget: EIN Lade-/Render-Motor für vier Ansichten (Kalender-Monatsraster,
Kalender-Liste/Agenda, Termin-Liste, Einzeltermin) statt vier getrennter Komponenten -
dieselbe Datenquelle (JSON ODER ICS, siehe ics.js), derselbe normalisierte Termin-
Datentyp, nur andere Darstellung. Reine Erweiterung, kein Ersatz für iframe-Einbettung -
für Fälle, in denen Termine als ECHTES natives HTML im Dokument stehen sollen (durchsuch-
bar, per CSS themebar, kein Cross-Origin/Höhen-Problem wie bei iframes).

Markup (opt-in, ein <div> pro Widget-Instanz):
  <div class="ncss-events" data-view="month" data-src="events.json"></div>
  <div class="ncss-events" data-view="agenda" data-ics="kalender.ics"></div>
  <div class="ncss-events" data-view="list" data-src="events.json" data-limit="6"></div>
  <div class="ncss-events" data-view="single" data-src="events.json" data-event-id="evt-3"></div>

data-src: JSON-Array, jedes Element {id?, title, start, end?, allDay?, location?,
  description?, url?} - start/end als ISO-8601-String ("2026-09-01" für ganztägig,
  "2026-09-01T09:00" für Uhrzeit, ohne Zeitzonen-Suffix = lokale Wanduhrzeit).
data-ics: .ics-Datei (siehe ics.js für den unterstützten RRULE-Umfang).
data-limit: max. Anzahl Termine in agenda/list (Default: kein Limit).
data-month: Start-Monat für die Monatsansicht, "YYYY-MM" (Default: aktueller Monat).
data-window-months: wie viele Monate voraus eine unbegrenzte ICS-RRULE (ohne COUNT/
  UNTIL) expandiert wird (Default: 18).

Reine Vanilla-JS-Erweiterung, kein Framework, kein Build-Schritt - Rendering nutzt
ausschließlich bereits vorhandene ncss-Komponenten (.ncss-card, .ncss-modal,
.ncss-badge) statt eigener Parallel-Optik.
```

### `js/hero-video-motion.js`


### `js/hide-on-scroll-fallback.js`

```text
NativeCSS - JS-Fallback für .ncss-hide-on-scroll (helpers/scroll.css) in Browsern ohne
container-type: scroll-state (Stand August 2026: Firefox und Safari, per WebSearch
bestätigt - siehe SKILL.md Landmine 26 für den bereits verworfenen CSS-only-Fallback-
Versuch und dessen echten, per Playwright-WebKit reproduzierten Bug: eine tief
verschachtelte, per @property typisierte calc()-Kette löste in WebKit falsch auf,
sobald sie in einem weiteren calc() konsumiert wurde - der Header blieb nach
Hoch-Scrollen dauerhaft versteckt, schlimmer als gar kein Fallback). Dieselbe simple
Scroll-Event+requestAnimationFrame-Technik wie vor den scroll-getriebenen CSS-Features
üblich - kein Versuch, das CSS-only-Verhalten 1:1 nachzubilden (kein "erst nach X px
Toleranz"-Feintuning wie native scroll-state-Queries es intern haben), nur derselbe
sichtbare Effekt: runter verstecken, hoch wieder zeigen.

Prüft sich selbst zuerst per CSS.supports() - läuft NUR, wenn die native Technik NICHT
greift, kein doppelt arbeitender Mechanismus, kein Konflikt mit der @container-Regel.

Einbindung (nur auf Seiten mit .ncss-hide-on-scroll nötig, wo auch Firefox/Safari
gebraucht werden):
  <script src="../components/hide-on-scroll-fallback.js" defer></script>

deepQueryAll() statt document.querySelectorAll(): ein .ncss-hide-on-scroll-Element
INNERHALB eines <ncss-container> (siehe ncss-container.js) liegt in dessen Shadow
Root - querySelectorAll() durchquert Shadow-Grenzen nicht. deepQueryAll() steigt
rekursiv in jeden offenen Shadow Root ab, verhält sich ohne Shadow DOM auf der Seite
exakt wie querySelectorAll.
```

### `js/hovercard.js`

Elemente: `<ncss-hovercard>`

Attribute: `delay="400"`, `hide-delay="250"`

data-Attribute: `data-ncss-hovercard-manual`

Events: `ncss-hovercard-hide`, `ncss-hovercard-show`

Öffentlich: `el.show()`, `el.hide()`, `el.open`

```text
ncss - <ncss-hovercard>: Vorschaukarte beim Überfahren/Fokussieren eines Links (siehe
components/hovercard.css für Markup). Light-DOM-Custom-Element ohne Shadow Root.
Erstes Kind = Auslöser (Link/Button), .ncss-hovercard = Karte.

Unterstützt der Browser interestfor (Chromium), tut dieses Script fast nichts: es setzt
nur fehlende Attribute (interestfor, popover="hint") - Hover, Fokus, Verzögerung, Esc
und Long-Press auf Touch übernimmt der Browser. Sonst:
  - Öffnen nach "delay" ms bei Hover (Maus/Stift) oder Tastatur-Fokus (:focus-visible)
  - bleibt offen, solange Zeiger ODER Fokus im Link oder in der Karte sind (WCAG 1.4.13)
  - Esc schließt (und holt den Fokus aus der Karte zurück auf den Link)
  - Touch: kein Hover - ein Tap folgt einfach dem Link
Positionierung: CSS Anchor Positioning (das Script vergibt eindeutige anchor-name/
position-anchor); ohne Anchor Positioning rechnet es top/left selbst aus (unter dem
Link, bei Platzmangel darüber, seitlich im Viewport gehalten).

Attribute am Element: delay="400" (ms bis zum Öffnen), hide-delay="250"
Events (am Element, bubbeln): ncss-hovercard-show / ncss-hovercard-hide
Öffentlich: el.show(), el.hide(), el.open (nur lesen)

Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements oder Popover-API wird
nichts registriert - die Karte bleibt dann verborgen, der Link funktioniert normal.
```

### `js/icon.js`

Elemente: `<ncss-icon>`

Attribute: `name="house"`, `weight="regular"`, `label="…"`, `src="pfad/eigen.svg"`

data-Attribute: `data-ncss-icon-path`

Events: `ncss-icon-error`, `ncss-icon-load`

```text
ncss - <ncss-icon>: setzt ein Phosphor-Icon (vendor/phosphor/, MIT) als Inline-SVG ein.
Reines Light-DOM-Custom-Element, Größe/Farbe kommen aus helpers/icons.css (1em bzw.
--ncss-icon-size, fill: currentColor) - die Fläche ist dort schon VOR dem Laden
reserviert, es springt nichts.

  <ncss-icon name="house"></ncss-icon>                               dekorativ
  <ncss-icon name="heart" weight="fill" label="Favorit"></ncss-icon>  mit Bedeutung

Attribute:
  name="house"            Phosphor-Name (Kleinbuchstaben/Ziffern/Bindestrich)
  weight="regular"        regular | thin | light | bold | fill | duotone
  label="…"               macht das Icon bedeutungstragend: role="img" + aria-label.
                          Ohne label ist es dekorativ (aria-hidden="true").
  src="pfad/eigen.svg"    statt name/weight eine beliebige eigene SVG-Datei laden
  data-ncss-icon-path="…" Icon-Ordner, auf dem Element ODER einem Vorfahren (z.B.
                          <html>); relativ zur SEITE aufgelöst. Default: der Ordner
                          vendor/phosphor/ relativ zu DIESER Datei (dist/js/icon.js ->
                          ../../vendor/phosphor/), per document.currentScript ermittelt -
                          als ES-Modul geladen gibt es kein currentScript, dann
                          data-ncss-icon-path setzen.

Jede URL wird nur EINMAL geladen (Cache über alle Elemente der Seite). Die Datei wird
bereinigt eingesetzt: nur SVG-Formelemente, keine <script>/<foreignObject>/<style>,
keine on*-Attribute, keine externen href - wichtig, sobald src auf fremde Dateien zeigt.

OHNE JS (oder vor der Definition) bleibt das Element leer: unsichtbar, aber mit
reservierter Fläche. Für Icons, die Bedeutung tragen, deshalb das Kern-Set
(.ncss-icon-*) oder ein SVG-Sprite nehmen (beide ohne JS), oder den Text daneben
sichtbar lassen.

Events (bubbles): "ncss-icon-load" (detail.url), "ncss-icon-error" (detail.url).
```

### `js/ics.js`

```text
ncss - ICS-Parser (iCalendar, RFC 5545). Reine Datenfunktion, kein DOM-Zugriff -
eigenständig nutzbar, wird von events.js für data-ics="..." konsumiert. Kein Vendor/
keine Abhängigkeit (kein npm-Paket wie ical.js) - passt zu "kein Build-Schritt,
selbst gehostet, kein Wildwuchs" und deckt bewusst nur ab, was ein Termin-Widget
wirklich braucht, nicht die volle RFC-5545-Fläche.

Abgedeckt: VEVENT (UID, SUMMARY, DTSTART, DTEND, LOCATION, DESCRIPTION, URL), Zeilen-
Unfolding (fortgesetzte Zeilen beginnen mit Leerzeichen/Tab), Wert-Escaping (\\n, \\,,
\\;, \\\\), ganztägige Termine (VALUE=DATE), UTC-Zeiten ("Z"-Suffix). RRULE-Teilmenge:
FREQ=DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT, UNTIL, BYDAY (nur einfache
Wochentags-Liste, kein Ordinal-Präfix wie "2MO"), EXDATE.

NICHT abgedeckt (bewusste Grenze, siehe Doku): TZID-Zeitzonenkonvertierung (Zeiten
ohne "Z"-Suffix werden als lokale Wanduhrzeit übernommen, keine Konvertierung),
BYMONTHDAY/BYSETPOS/BYWEEKNO, verschachtelte RECURRENCE-ID-Ausnahmen (nur EXDATE).
Deckt die weit überwiegende Mehrheit realer Kalender-Exports (Google/Outlook/Apple)
für einfache und regelmäßig wiederkehrende Termine ab.
```

### `js/lightbox.js`

data-Attribute: `data-ncss-lightbox`

```text
ncss - Lightbox-Galerie: blättert durch alle Links mit demselben data-ncss-lightbox-Wert
(siehe components/lightbox.css). Ein einziges <dialog> pro Seite, erst beim ersten Klick
erzeugt, mit den Klassen der vorhandenen Modal-Lightbox (.ncss-modal--fullscreen
--dark) - Animation, Backdrop, Fokus-Trap und Esc kommen von dort bzw. vom nativen
<dialog>.

Bedienung: Pfeiltasten, Vor/Zurück-Buttons, Wischen (Zeigergeste, > 50px), Klick neben
das Bild schließt. Fokus kehrt nach dem Schließen zum auslösenden Link zurück.
Bildunterschrift: data-caption, sonst alt des Vorschaubildes. Das jeweils nächste Bild
wird vorgeladen.

Texte: Deutsch/Englisch nach <html lang> (wie events.js/downloads.js), einzeln
überschreibbar per data-lightbox-close/-prev/-next/-label/-of am <html>.

Mit gedrückter Strg/Cmd/Shift-Taste oder Mittelklick bleibt der Link ein normaler Link
(neuer Tab etc.) - die Lightbox greift nur beim einfachen Klick.
```

### `js/livesearch.js`

data-Attribute: `data-ncss-livesearch`

```text
ncss - Live-Suche: Vorschläge während der Eingabe für [data-ncss-livesearch]-Formulare
(siehe components/livesearch.css). WAI-ARIA Combobox + Listbox: der Fokus bleibt im
Eingabefeld, aria-activedescendant zeigt auf die gewählte Option.

Tastatur: Pfeil runter/hoch wählt, Enter öffnet die gewählte Option (ohne Auswahl:
normales Absenden = Ergebnisseite), Esc schließt die Liste, Klick daneben ebenso.

Attribute am <form>:
  data-ncss-livesearch="URL"  Endpoint (Pflicht)
  data-param="q"              Name des Suchparameters (Default "q")
  data-min="2"                Mindestlänge der Eingabe
  data-delay="180"            Wartezeit nach dem letzten Tastendruck (ms)
  data-mode="client"          Endpoint ist eine STATISCHE JSON-Datei: einmal laden,
                              im Browser filtern (kleine Datenmengen, ohne Server-Logik)

Antwort-Format (JSON) - im Server-Modus bereits gefiltert, im Client-Modus komplett:
{
  "groups": [
    { "label": "Seiten", "items": [ { "title": "...", "url": "...", "text": "..." } ] }
  ],
  "all": "/suche/?q=..."   (optional, Link "Alle Ergebnisse anzeigen")
}

Texte: Deutsch/Englisch nach <html lang> (wie events.js/downloads.js), einzeln
überschreibbar per data-text-empty/-all/-status am <form> ("{n}" und "{q}" als
Platzhalter). Treffer-Markierung per <mark>, alle Inhalte werden escaped.
```

### `js/marquee.js`

data-Attribute: `data-ncss-marquee`, `data-ncss-marquee-toggle`

```text
NativeCSS - opt-in Begleiter für components/marquee.css.

1. <div class="ncss-marquee" data-ncss-marquee> mit nur EINER .ncss-marquee-group:
   erzeugt die Kopie, die die CSS-Schleife nahtlos macht (aria-hidden + inert, ids
   entfernt - weder vorgelesen noch fokussierbar). Bereits vorhandene Kopien werden
   ebenfalls inert gesetzt.
2. <button type="button" data-ncss-marquee-toggle aria-controls="marquee-id">: schaltet
   .ncss-marquee--paused und aria-pressed um (WCAG 2.2.2 Pause-Mechanismus). Den
   Button-Text formuliert die Seite selbst ("Laufband anhalten").

Benötigt: components/marquee.css.
Einbindung: <script src="ncss/js/marquee.js" defer></script>
```

### `js/modal-router.js`

Events: `ncss-content-change`

```text
ncss - AJAX-Modal-Router (opt-in, reines JS, kein eigenes CSS-File - nutzt ein
normales .ncss-modal, siehe components/modal.css, plus ggf. eine der dortigen
Einblendvarianten --slide-up/--slide-down/--slide-left/--slide-right/--zoom).

BRAUCHT ZWINGEND JAVASCRIPT für die AJAX-/Modal-Funktion selbst - ohne JS (Skript
blockiert/deaktiviert), bevor es geladen hat, ODER in einem sehr alten Browser ohne
`fetch()`/`DOMParser` (früher, unbedingter `return` unten - verhindert, dass ein
Klick per `preventDefault()` "hängen bleibt": ohne die Guard würde der spätere
`fetch()`-Aufruf einen ReferenceError werfen, NACHDEM die normale Navigation schon
unterdrückt wurde - schlimmer als gar kein JS), ist ein Trigger-Link einfach ein
GANZ NORMALER Link: Klick navigiert zur eigenständigen Zielseite, kompletter
Seitenwechsel, kein Modal. Das ist ABSICHT (Progressive-Enhancement-Fallback, siehe
Markup unten) und funktioniert nur, weil jede Zielseite auch als vollständige,
eigenständige Seite existieren MUSS - keine JS-only-Inhalte, die es sonst nirgends
gibt. Trigger-Links behalten ihr echtes href deshalb immer und bekommen zusätzlich
`data-modal-router-trigger="#idDesDialogs"`. Klick lädt die Zielseite per fetch()
nach, extrahiert daraus einen Ausschnitt (Standard-Selektor
"main", überschreibbar über `data-modal-router-content` auf dem <dialog>) und
zeigt ihn im Modal - die URL wandert dabei per history.pushState() mit, das Modal
bleibt dadurch verlink-/teilbar (Adressleiste zeigt die echte Ziel-URL, ohne dass
ein echter Seitenwechsel stattfindet). Browser-Zurück und ein erneuter Aufruf
derselben URL (Reload, oder ein bereits im DOM registrierter Trigger, dessen href
zur aktuellen Adresse passt) öffnen/schließen das Modal passend dazu.

Markup:
<a href="/leistungen/druck/" data-modal-router-trigger="#ajaxModal">Mehr erfahren</a>
...
<dialog id="ajaxModal" class="ncss-modal ncss-modal--slide-up" data-modal-router
        data-modal-router-content="main" data-modal-router-home="/leistungen/">
  <button type="button" class="ncss-dialog-close" command="close" commandfor="ajaxModal"
          aria-label="Schließen">&times;</button>
  <div class="ncss-modal-body" data-modal-router-target></div>
</dialog>

Optionale Attribute auf dem <dialog>: `data-modal-router-content` (CSS-Selektor,
welcher Ausschnitt der nachgeladenen Seite übernommen wird, Default "main"),
`data-modal-router-home` (URL, zu der die Adressleiste beim Schließen zurückkehrt,
Default "/"), `data-modal-router-loading`/`-error` (eigene Lade-/Fehlertexte).

Damit eine Ziel-URL auch GANZ FRISCH (kein vorheriger Klick, kein pushState in
dieser Sitzung - eingegebene Adresse, Lesezeichen, Reload) tatsächlich als
geöffnetes Modal ankommt, statt nur als eigenständige Seite: dieselbe Datei auf
der EIGENSTÄNDIGEN Zielseite einbinden UND dort zusätzlich
<meta name="modal-router-redirect" content="/listing-seite/"> setzen. Eine
Seite ohne eigenes [data-modal-router]-Dialog-Element gilt als "Zielseite" -
findet sie dieses Meta-Tag, springt sie beim Laden per location.replace() sofort
zur Listing-Seite zurück (?ncssModal=<eigener Pfad> angehängt), die IHRERSEITS
beim Laden diesen Parameter erkennt, das passende Modal öffnet und die Adresse
per history.replaceState() wieder auf die saubere Ziel-URL zurückschreibt - der
Query-Parameter selbst taucht dadurch nie sichtbar in der Adressleiste auf. Ein
echter fetch() (siehe openModal unten) lädt die Zielseite nur als Text/DOMParser-
Baum, führt ihr Script NIE aus - der Redirect greift ausschließlich bei einer
ECHTEN Navigation, kein Sonderfall zwischen den beiden Aufrufarten nötig. Bewusst
ein kurzes Aufblitzen der rohen Zielseite vor dem Rücksprung in Kauf genommen
(rein clientseitig, ohne Server-Mitwirkung nicht vermeidbar) - ohne dieses
Meta-Tag bleibt eine Zielseite einfach für sich stehen (reiner
Progressive-Enhancement-Fallback, kein Rücksprung).
```

### `js/nav-drilldown.js`

Elemente: `<ncss-nav-drilldown>`

Attribute: `back-text`

```text
ncss - <ncss-nav-drilldown>: verschachtelte mobile Menüs als Slide-Screens statt
Inline-Aufklappen (siehe components/nav-drilldown.css für Markup/Einbindung/Optik).
Reines Light-DOM-Custom-Element (kein Shadow Root, wie <ncss-nav-priority> - soll
ganz normal von der Seiten-eigenen ncss.css/theme.css getroffen werden).

v1-Grenze, bewusst: drillt nur EINE Ebene tief (Wurzel-Liste ↔ ein Untermenü-Screen).
Ein Elternpunkt INNERHALB eines bereits gezeigten Untermenüs (dritte Ebene+) klappt
stattdessen normal INLINE auf (unverändertes .ncss-nav-dropdown-Verhalten) - deckt
die weit überwiegende Mehrheit realer Navigationen ab (zwei Ebenen), ohne die
Komplexität eines vollen Breadcrumb-Stacks für beliebige Tiefe.

Ein Klick auf einen ECHTEN <a> innerhalb <summary> (optionaler "Elternpunkt auch als
Seite aufrufbar"-Trick, siehe components/nav.css) navigiert normal, OHNE zu drillen -
dieselbe Unterscheidung wie beim normalen Dropdown, hier nur zusätzlich per JS
respektiert (das native "beide Default-Aktionen bleiben getrennt"-Verhalten gilt nur
für das native <details>-Toggle, nicht für unseren eigenen preventDefault()-Pfad).
```

### `js/nav-priority.js`

Elemente: `<ncss-nav-priority>`

Attribute: `more-label`, `more-text`

```text
ncss - <ncss-nav-priority>: verschiebt Navigationspunkte, die nicht mehr in eine
Zeile passen, automatisch in ein "Mehr"-Dropdown (siehe components/nav-priority.css
für Markup/Einbindung). Reines Light-DOM-Custom-Element (kein Shadow Root - anders
als <ncss-container> - das Nav-Markup soll ganz normal von der Seiten-eigenen
ncss.css/theme.css getroffen werden, keine Isolation gewünscht).

Rechnet bei JEDEM Layout-Durchlauf von einem sauberen Ausgangszustand neu (alle
echten Punkte zurück in die Hauptliste, DANN neu verteilen), statt inkrementell zu
verschieben - robuster gegen akkumulierte Fehlzustände über mehrere Resizes hinweg,
für eine normale Nav-Punktzahl (Dutzende, nicht Tausende) performant genug.

Funktioniert bei JEDER Breite, KEIN fester Breakpoint (siehe components/nav-
priority.css für die vollständige Begründung) - läuft NICHT mehr, wie in einer
ersten Fassung, unterhalb der nav-collapse-Schwelle auf die normale Off-Canvas-
Ansicht hinaus; die CSS-Datei deaktiviert den Toggle-Button/das Off-Canvas-Panel
dafür unconditional selbst.
```

### `js/nav.js`

```text
ncss - Nav: kleines Enhancement, kein Ersatz für die native Funktionalität (Menü
öffnen/schließen funktioniert auch ohne dieses Script vollständig über command/
commandfor bzw. <details>). Schließt nur zwei Dinge, für die es keinen reinen CSS-Weg
gibt: das offene Dropdown nach Klick auf einen Untermenü-Link (natives <details> bleibt
sonst offen stehen), und das mobile Off-Canvas-Panel nach Klick auf IRGENDEINen Nav-
Link (sonst bleibt das Menü nach der Navigation sichtbar offen).
```

### `js/ncss-container.js`

Elemente: `<ncss-container>`

Attribute: `src`, `theme`

data-Attribute: `data-ncss-src`

```text
ncss - <ncss-container>: kapselt ncss-Inhalte in einem echten Shadow-DOM-Baum, damit
sie innerhalb eines FREMDEN Frameworks/CSS-Systems (Bootstrap, UIkit, Tailwind, ein
CMS-Theme, ...) laufen können, ohne dass Styles in beide Richtungen durchsickern - die
Seite außen kann ncss' Klassen nicht überschreiben, ncss' Reset kann die Seite außen
nicht beeinflussen. Kein npm-Paket/Framework nötig, reines natives Custom Element.

Markup:
  <script src="components/ncss-container.js" defer></script>
  <ncss-container src="dist/ncss.css">
    <div class="ncss-card">...</div>
  </ncss-container>

Attribute:
- src (Pflicht, ODER data-ncss-src auf dem Loader-<script> als Seiten-Default - siehe
  unten): Pfad zu ncss.css, relativ zur Seite (NICHT zum Shadow Root - ganz normaler
  <link>, keine ncss-Sonderregel).
- theme (optional): zusätzliches Stylesheet, NACH src geladen - für einen Container mit
  ANDERER Markenfarbe/Radien/Schrift als die restliche Seite (dasselbe Rezept wie
  theme.css, nur auf den Container statt :root angewendet).

Warum das funktioniert (Teil 1, Tokens): ncss' Tokens sind in colors.css/tokens.css/
theme.css/webawesome-bridge.css bewusst als ":root, :host { ... }" deklariert (statt
nur ":root") - ":root" trifft IMMER das echte Seiten-Wurzelelement, niemals einen
Shadow Host, ":host" dagegen NUR den Host-Knoten eines Shadow-Trees und ist außerhalb
eines Shadow-Trees wirkungslos. Dieselbe Datei liefert dadurch, unverändert, eine
komplett EIGENSTÄNDIGE Token-Kopie, sobald sie in einem Shadow Root statt am
Seiten-<head> geladen wird - keine zweite, duplizierte Token-Datei nötig.

Warum das funktioniert (Teil 2, Inhalt - der wichtigere Teil): der eigene Inhalt wird
NICHT per <slot> eingebunden, sondern beim Verbinden EINMALIG per JS in den Shadow
Root VERSCHOBEN (echte appendChild-Umhängung, keine Kopie). Ein <slot> würde die
Kind-Elemente technisch nur im Shadow Root ANZEIGEN - sie blieben aber weiterhin Teil
des LIGHT DOM und würden dadurch WEITERHIN von den globalen Stylesheets der äußeren
Seite getroffen (z.B. ein aggressives Framework-CSS wie "button { color: red
!important }") - nur echte Shadow-Root-NACHFAHREN (keine bloß durchgereichten/
"slotted" Elemente) sind vollständig vor äußerem CSS geschützt. Per echtem Test
bestätigt: ein <slot>-basierter Button übernahm eine äußere "!important"-Regel
unverändert, ein per Verschieben eingebetteter Button blieb komplett unberührt.
Kehrseite: kein automatisches Nachziehen bei späteren dynamischen DOM-Änderungen im
Original-Markup (das Original ist ja bereits umgezogen) - für den Zielfall (ein fertig
eingebetteter Inhaltsblock) kein praktischer Nachteil.

Timing-Falle (per echtem Test gefunden, nicht nur theoretisch): wird <ncss-container>
vom HTML-PARSER selbst erzeugt (server-gerendertes Markup, kein späteres innerHTML/
appendChild per JS), ruft der Browser connectedCallback() SOFORT beim Einfügen des
öffnenden Tags auf, express bevor der Parser die nachfolgenden Kind-Knoten überhaupt
gelesen/angehängt hat - this.firstChild ist zu diesem Zeitpunkt noch null, das
Verschieben läuft ins Leere, das Element bleibt dauerhaft ohne Inhalt im Shadow Root
(Light-DOM-Kinder erscheinen zwar kurz danach, werden aber nie nachgezogen, siehe
"kein automatisches Nachziehen" oben). Fix: der Verschiebe-Schritt läuft über
requestAnimationFrame (läuft nach dem aktuellen Parser-Tick, zuverlässiger als ein
einzelnes Microtask/queueMicrotask bei tief verschachteltem Parser-Batching) - bei
regulärer, bereits vollständiger JS-Einfügung (Konstruktor/appendChild eines fertigen
Fragments) ist das firstChild schon beim ersten Callback-Aufruf vorhanden, der
zusätzliche Frame-Versatz ist dort unsichtbar/unschädlich.
```

### `js/notification.js`

Elemente: `<ncss-toast-region>`

Attribute: `stack`

data-Attribute: `data-ncss-notify`, `data-ncss-toast-front`

Events: `ncss-notification-close`

```text
ncss - Benachrichtigungen / Toasts: <ncss-toast-region> (Light-DOM-Custom-Element ohne
Shadow Root) + kleine Script-API (siehe components/notification.css für Markup/Optik).

API (global, ohne Modul-System nutzbar):
  ncss.notify("Gespeichert");
  ncss.notify("Upload fehlgeschlagen", { status: "danger" });
  var n = ncss.notify({ title: "Kopiert", message: "Link in der Zwischenablage",
                        status: "success", position: "bottom-center", stack: true });
  n.close();                       // { element, close() }
  ncss.notifyCloseAll();
Alternativ ohne direkte Abhängigkeit vom globalen Objekt:
  document.dispatchEvent(new CustomEvent("ncss-notify", { detail: { message: "..." } }));
Deklarativ: <button type="button" data-ncss-notify="Gespeichert" data-status="success"
            data-title="..." data-timeout="8000" data-position="top-center" data-stack>

Optionen: message (Text - wird als TEXT eingefügt, nie als HTML; für eigenes Markup
einen DOM-Knoten übergeben), title, status (brand | success | warning | danger),
timeout (ms, 0 = bleibt stehen; Default 5000, bei danger 0 - eine Fehlermeldung soll
nicht verschwinden, bevor sie gelesen ist), position (top-start | top-center | top-end |
bottom-start | bottom-center | bottom-end, Default bottom-end), stack (Sonner-Stapel für
die Region dieser Position), closeLabel.

Verhalten:
  - Region = aria-live="polite" (existiert, bevor die erste Meldung eingefügt wird -
    sonst sagen Screenreader sie nicht an); danger/warning zusätzlich role="alert".
  - Timer pausieren für ALLE Meldungen der Region, solange Zeiger oder Fokus darin sind
    und solange der Tab im Hintergrund ist - Restzeit läuft danach weiter, kein Neustart.
  - Region ist popover="manual" (Top Layer): Meldungen erscheinen auch über einem
    offenen modalen <dialog>.
  - Meldungen, die schon im Markup stehen (serverseitig), bekommen beim Start Schließen-
    Button und Timer (data-timeout, Default 5000; data-timeout="0" = stehen lassen).
Events (bubbeln, an der Meldung): ncss-notification-close

Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements wird nichts registriert
(ncss.notify fehlt dann, Markup-Meldungen bleiben statisch sichtbar).
```

### `js/page-transitions-quiet.js`

```text
ncss - Optionaler Begleiter zu page-transitions.css: unterdrückt eine bekannte, laut
Spec/Implementierung ERWARTETE (aber ungefangene) Promise-Ablehnung, die bei jeder
rein deklarativen Cross-Document View Transition auftreten KANN, sobald der Browser
eine bereits gestartete Transition überspringt (typischer Auslöser: eine weitere
Navigation - z.B. ein schneller Vorwärts-/Zurück-Klick - kommt dazwischen) - sichtbar
in der Konsole als "Unhandled Promise Rejection: AbortError: Skipping view transition
because skipTransition() was called". Betrifft NICHT ncss' Code oder eine echte
Fehlfunktion - die Navigation selbst läuft normal weiter, nur die intern vom Browser
verwaltete `ready`-Promise der übersprungenen Transition lehnt ab, wie von der Spec
vorgesehen (ViewTransition.ready: "will reject if the transition cannot begin").

Eine rein CSS-basierte Seite (`@view-transition { navigation: auto }`, siehe
page-transitions.css) bekommt dafür OHNE dieses Skript gar keine Referenz auf die
Transition - kann also auch gar nicht selbst `.catch()` darauf aufrufen. Der native
`pageswap`-Event (feuert auf dem VERLASSENEN Dokument kurz vor der Navigation) legt
über `PageSwapEvent.viewTransition` genau diese Referenz offen, extra für diesen
Zweck vorgesehen. Dieses Skript ändert am Übergang selbst NICHTS (keine eigene
Steuerung, kein eigener `skipTransition()`-Aufruf) - hängt nur einen leeren
`.catch()` an, unterdrückt dadurch die Konsolen-Meldung für den erwarteten,
harmlosen Fall.

Bestätigt betroffen (Recherche August 2026): WebKit/Safari bei Zurück-/Vorwärts-
Navigation während eine Transition läuft, offener Bug bugs.webkit.org #289078.
Dieselbe Klasse Problem wird aktuell auch in der CSSWG selbst diskutiert
(github.com/w3c/csswg-drafts Issue 13726, "noisy unhandled rejections in transition
navigations") - kein ncss-spezifisches Problem, betrifft jede Seite mit Cross-
Document View Transitions, ob deklarativ per CSS oder per JS ausgelöst.

Einbindung (zusätzlich zu page-transitions.css, komplett optional - nur bei Bedarf,
page-transitions.css selbst bleibt bewusst reines CSS ohne JS-Abhängigkeit):
  <script src="js/page-transitions-quiet.js" defer></script>
```

### `js/preferences-early.js`

data-Attribute: `data-ncss-font`

```text
ncss - Darstellungs-Einstellungen, früher Teil: setzt gespeicherte Besucher-Einstellungen
(<ncss-preferences>, js/preferences.js) als Attribute am <html>, BEVOR die Seite gezeichnet
wird - kein Aufblitzen in falscher Schriftgröße/Farbe beim Laden.

Synchron im <head>, VOR den Stylesheets, ohne defer/async (eigene Datei statt Inline-
Snippet, damit eine strenge CSP ohne 'unsafe-inline' funktioniert):
  <script src="dist/js/preferences-early.js"></script>
  <link rel="stylesheet" href="dist/ncss.css">
Ersetzt js/theme-toggle-early.js (liest denselben Schlüssel "ncss-theme" - beide Dateien
zusammen schaden nicht, eine reicht).

Gesetzte Attribute (Wirkung in colors.css/reset.css, ohne Wahl gilt das System):
  data-theme="light|dark"         Farbschema (+ data-theme-resolved, wie theme-toggle)
  data-contrast="more|normal"     Kontrast (normal = System-"more" bewusst zurücknehmen)
  data-motion="reduce|full"       Bewegung (full = System-"reduce" bewusst aufheben)
  data-text-scale="115|130"       Schriftgröße
  data-ncss-font="hyperlegible|lexend|opendyslexic"   Lese-Schrift
                                  (Wirkung in components/preferences-fonts.css)
  data-text-spacing               Textabstände nach WCAG 1.4.12
  data-links="underline"          Links immer unterstreichen
  data-focus="strong"             verstärkter Fokus-Rahmen
```

### `js/preferences.js`

Elemente: `<ncss-preferences>`

Attribute: `inline`, `settings="theme contrast motion text font spacing links focus"`

data-Attribute: `data-ncss-font`, `data-ncss-preferences-fallback`

Events: `ncss-preferences-change`

```text
ncss - <ncss-preferences>: Darstellungs-Einstellungen für Besucher (siehe
components/preferences.css für Markup). Light-DOM-Custom-Element.

KEIN "Barrierefreiheits-Overlay": macht keine Seite barrierefrei und repariert nichts.
Es lässt Besucher eine bereits barrierefreie Seite an persönliche Bedürfnisse anpassen.
Betriebssystem-/Browser-Einstellungen sind der Default ("System") und werden nie
stillschweigend überschrieben - jede Abweichung ist eine ausdrückliche Wahl.

Schreibt dieselben <html>-Attribute wie js/preferences-early.js (Wirkung in colors.css
und reset.css, keine Komponente muss davon wissen) und speichert in localStorage:
"ncss-theme" (gemeinsam mit js/theme-toggle.js - EIN Mechanismus) und "ncss-prefs" (JSON).

Attribute am Element:
  inline                     Bedienfeld direkt anzeigen statt Button + Popover
  settings="theme contrast motion text font spacing links focus"   Auswahl/Reihenfolge
                             ("font" nur mit components/preferences-fonts.css)
  data-label-<schlüssel>="…"  jeden Text überschreiben (Schlüssel siehe TEXTS unten)
Event (am document): ncss-preferences-change, detail { key, value, prefs }

Bedienung: native Radiogruppen (fieldset/legend, Pfeiltasten) und Checkboxen (Leertaste),
Änderungen wirken sofort (Live-Vorschau) und werden höflich angesagt (role="status").
Popover: Esc/Klick daneben schließt, Fokus geht beim Öffnen auf das erste Feld und beim
Schließen zurück auf den Button. Ohne Anchor Positioning rechnet das Script die Position.

Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements wird nichts registriert -
das Element bleibt verborgen (CSS :not(:defined)), es gelten die Systemeinstellungen.
```

### `js/reveal.js`

data-Attribute: `data-ncss-reveal`

Events: `ncss-reveal`

```text
NativeCSS - opt-in Begleiter für helpers/reveal.css (Elemente mit data-ncss-reveal).
Die scroll-gescrubbten Reveals brauchen KEIN JS - dieses Script ist nur für:
  - .ncss-reveal--once in Browsern OHNE CSS-Scroll-Trigger (timeline-trigger, aktuell
    nur Chromium): spielt die Animation einmal zeitbasiert ab, sobald das Element ins
    Bild kommt (IntersectionObserver). In Chromium tut es für --once NICHTS (das CSS
    erledigt es selbst, kein doppelter Mechanismus).
  - Browser ganz ohne animation-timeline: JEDES data-ncss-reveal-Element wird dort
    zum Einmal-Reveal (statt einfach statisch sichtbar zu bleiben).
Ablauf: Klasse .ncss-reveal--js hält den Startzustand (pausiert), .is-revealed spielt
ab. Event "ncss-reveal" (bubbelt) beim Start.
Unter prefers-reduced-motion: nichts (das CSS zeigt alles ungeclippt).

Benötigt: helpers/reveal.css.
Einbindung: <script src="ncss/js/reveal.js" defer></script>
```

### `js/scroll-frames.js`

Elemente: `<ncss-scroll-frames>`

Attribute: `src`, `count`, `first="1"`, `length="300"`, `smoothing="0.6"`, `fit="cover"`, `inline`

Öffentlich: `el.frame`, `el.loaded`, `el.progress`

```text
ncss - <ncss-scroll-frames>: Bildsequenz statt Video - zeichnet passend zur
Scroll-Position ein Einzelbild auf ein <canvas>. Jedes Bild ist ein vollständiges Foto,
Spulen ist deshalb in JEDER Engine butterweich (kein Video-Dekodieren, kein Seeking) -
die robuste Alternative zu <ncss-scroll-video>, wenn Safari-Ruckeln nicht akzeptabel
ist. Optik: components/scroll-frames.css.

  <ncss-scroll-frames src="frames/f-%03d.webp" count="72" length="300">
    <div class="ncss-scroll-frames-stage">
      <img class="ncss-scroll-frames-poster" src="frames/f-001.webp" alt="Was die Sequenz zeigt"
           width="800" height="450">
    </div>
  </ncss-scroll-frames>

Das <img> ist zugleich Fallback (kein JS, reduzierte Bewegung, Save-Data: nur dieses
Standbild) und Quelle für Seitenverhältnis + Alternativtext: das Script legt ein
<canvas role="img"> mit demselben aria-label daneben und blendet das <img> aus.

Attribute: src (Muster, %d bzw. %03d = Bildnummer mit Nullen) · count · first="1" ·
  length="300" (Scroll-Strecke in % der Viewport-Höhe) · smoothing="0.6" · fit="cover"
  (oder contain) · inline (nicht anpinnen, spult beim Durchqueren des Viewports).
Öffentlich: el.frame (gezeichneter Index), el.loaded (Anzahl geladener Bilder),
  el.progress.

Laden: erst wenn das Element in die Nähe des Viewports kommt, dann progressiv - jedes
16. Bild zuerst, dann jedes 8., 4., 2. und der Rest. So spult eine grobe Fassung sofort,
Lücken füllt das jeweils nächstgelegene geladene Bild.

Benötigt: components/scroll-frames.css (+ tokens.css/colors.css). Keine anderen
ncss-Scripts.
```

### `js/scroll-horizontal.js`

data-Attribute: `data-ncss-scroll-horizontal`

```text
NativeCSS - Begleit-Script für components/scroll-horizontal.css
(.ncss-scroll-horizontal mit data-ncss-scroll-horizontal). Der Effekt selbst ist reines
CSS - dieses Script ist opt-in und erledigt zwei Dinge, die CSS nicht kann:

1. Höhe passend zur Reihe: setzt --ncss-scroll-horizontal-length auf
   100svh + (Reihenbreite - Bühnenbreite) / Tempo - 1px vertikal = 1px seitwärts statt
   des festen 300vh-Defaults (zu lang bei wenigen, zu kurz bei vielen Elementen).
   Tempo pro Instanz: data-ncss-scroll-horizontal="1.5" (seitliche Pixel pro gescrolltem
   Pixel, Default 1).
2. Tastatur-Fokus sichtbar halten (WCAG 2.4.11): die Reihe wird per translate
   verschoben, nicht gescrollt - der Browser kann ein fokussiertes Element außerhalb der
   Bühne deshalb NICHT selbst ins Bild holen. Bei focusin rechnet das Script die
   Timeline rückwärts (Fortschritt p -> Seitenposition) und scrollt die SEITE an die
   Stelle, an der das Element mittig steht. Im Fallback (wischbare Reihe) reicht ein
   scrollIntoView innerhalb der Reihe.

Unter prefers-reduced-motion schaltet das CSS ohnehin auf die wischbare Reihe - das
Script erkennt den aktiven Modus deshalb einfach am berechneten position-Wert der Bühne
(sticky = scroll-getrieben) statt die Bedingungen ein zweites Mal nachzubauen.

Einbindung: <script src="ncss/js/scroll-horizontal.js" defer></script>
```

### `js/scroll-stack-fallback.js`

```text
NativeCSS - JS-Fallback für components/scroll-stack.css (.ncss-stack-section) in
Browsern ohne animation-timeline (Stand August 2026: Firefox, ältere Safari-Versionen
vor 26 - per WebSearch bestätigt). Ohne dieses Script zeigt scroll-stack.css dort seinen
bereits eingebauten, garantiert funktionierenden Fallback (Karten normal im Fluss
untereinander, kein Pinning/keine Animation) - dieses Script ist rein opt-in, für Seiten,
die auch dort das echte Pinned-Scroll-Stapel-Erlebnis wollen.

Prüft sich selbst per CSS.supports() (dieselbe Bedingung wie scroll-stack.css' eigener
@supports-Block) - läuft NUR, wenn die native Technik NICHT bereits greift (kein doppelt
arbeitender Mechanismus), UND nur wenn prefers-reduced-motion das erlaubt (identisches
Gate wie die native CSS-Variante).

Baut dieselbe Bühnen-/Absolut-Stapel-Struktur wie der native
@supports(view-timeline-name)-Block nach (Klasse .ncss-stack-js-active, siehe die
zugehörige CSS-Ergänzung in scroll-stack.css) und übernimmt selbst, was dort
animation-timeline/-range erledigen würde: berechnet den Scroll-Fortschritt jeder
Sektion/Karte direkt aus getBoundingClientRect() (dieselbe view-timeline-inset-Formel
wie in scroll-stack.css nachgerechnet, siehe dortiger Kommentar für die Herleitung) und
setzt transform/filter analog zu den @keyframes ncss-stack-arrive/-settle
(+ den -horizontal-Varianten) manuell, rAF-gedrosselt beim Scrollen.

Einbindung (nur auf Seiten mit .ncss-stack-section, die auch in Firefox/älterem Safari
animiert werden sollen):
  <script src="../components/scroll-stack-fallback.js" defer></script>

deepQueryAll() statt document.querySelectorAll(): eine .ncss-stack-section INNERHALB
eines <ncss-container> (siehe ncss-container.js) liegt in dessen Shadow Root -
querySelectorAll() durchquert Shadow-Grenzen NICHT, würde sie also stillschweigend
übersehen. deepQueryAll() steigt rekursiv in jeden offenen Shadow Root ab (auch
verschachtelt), findet dadurch Sektionen unabhängig davon, ob/wie tief sie in Shadow-
DOM-Bäumen stecken - für den ganz normalen Fall (kein Shadow DOM auf der Seite) verhält
es sich exakt wie querySelectorAll (keine Elemente mit .shadowRoot zu durchsuchen).
```

### `js/scroll-video.js`

Elemente: `<ncss-scroll-video>`

Attribute: `start`, `length="300"`, `smoothing="0.85"`, `inline`, `line="50"`, `end`

data-Attribute: `data-ncss-time`

Events: `ncss-scroll-video-change`, `ncss-scrolly-step`

Öffentlich: `el.progress`, `el.time`, `el.active`, `el.refresh()`

```text
ncss - <ncss-scroll-video>: Scrollen spult ein Video vor UND zurück (Scroll-Position
-> video.currentTime). Light-DOM-Custom-Element, Optik: components/scroll-video.css.

1. Angepinnt (Standard): das Element wird so hoch wie length (Scroll-Strecke), die
   Bühne bleibt sticky im Bild, das Video füllt sie randlos (object-fit: cover):
     <ncss-scroll-video length="300">
       <div class="ncss-scroll-video-stage">
         <video muted playsinline controls preload="metadata" poster="poster.jpg"
                src="scrub.mp4"></video>
         <p class="ncss-scroll-video-caption" data-ncss-time="1-3">Text ...</p>
       </div>
     </ncss-scroll-video>

2. inline: kein Anpinnen - das Video spult, während es den Viewport durchquert
   (unterer Rand kommt rein -> oberer Rand geht raus).

3. Scrollytelling: innerhalb von <ncss-scrolly> (js/scrolly.js) folgt das Video den
   Schritten. Jeder .ncss-scrolly-step trägt data-ncss-time="2" (springt auf 2 s,
   solange der Schritt aktiv ist) oder data-ncss-time="2-4" (spult von 2 auf 4 s,
   während der Schritt die Auslöse-Linie kreuzt). Die Position wird aus der
   Geometrie der Schritte berechnet (läuft auch ohne scrolly.js); zusätzlich hört das
   Element auf das "ncss-scrolly-step"-Event von <ncss-scrolly> (detail.time) - bei
   reduzierter Bewegung springt es damit pro Schritt hart auf die Startzeit, statt zu
   spulen. Das Element wird dort automatisch inline (die Scrolly-Bühne ist schon sticky).

Attribute: start / end (Sekunden-Bereich, auf den die Scroll-Strecke abgebildet wird,
  end = Default Dauer) · length="300" (Scroll-Strecke in % der Viewport-Höhe) ·
  smoothing="0.85" (0 = direkt, bis 0.98 = träge nachlaufend) · inline · line="50"
  (Auslöse-Linie für Schritte, % von oben).
Öffentlich: el.progress (0-1), el.time (angefragte Zeit), el.active, el.refresh().
Events (bubbeln): ncss-scroll-video-change { progress, time } (gedrosselt auf rAF).

Seeking: höchstens EIN Seek gleichzeitig, der nächste startet erst bei "seeked" -
schnelles Scrollen staut so keine Seeks auf. fastSeek() (WebKit/Gecko) nur bei großem
Abstand, das letzte Bild ist immer exakt. Für flüssiges Spulen in Safari das Video
all-intra (jedes Bild ein Keyframe) oder mit sehr kurzer GOP kodieren - ffmpeg-Befehle
in der Doku (video-audio.html, "Kodieren").

Inaktiv (normales Video mit nativen Controls + Poster, nicht angepinnt, Captions
untereinander): bei prefers-reduced-motion (außer Scrollytelling, s.o.),
prefers-reduced-data oder Save-Data. Ohne JS: dasselbe.

Benötigt: components/scroll-video.css (+ tokens.css/colors.css). Keine anderen
ncss-Scripts (scrolly.js ist optional, nur für den Event-Weg).
```

### `js/scrolly.js`

Elemente: `<ncss-scrolly>`

Attribute: `line`

data-Attribute: `data-ncss-time`

Events: `ncss-scrolly-step`

Öffentlich: `el.step`

```text
ncss - <ncss-scrolly>: Scrollytelling-Element (Markup/Optik: components/scrolly.css).
Reines Light-DOM-Custom-Element (kein Shadow Root) - Schritte und Medien bleiben normales
Seiten-Markup, ohne dieses Script einfach untereinander lesbar.

Markiert den Schritt, der eine waagerechte Linie im Viewport kreuzt (Default: Mitte,
Attribut line="50" in % von oben), und das Medium mit demselben Index mit .is-active
(IntersectionObserver auf einen 1px hohen Streifen statt Scroll-Listener).

API:
  el.step            Index des aktiven Schritts (lesen); el.step = 2 scrollt Schritt 3
                     in die Mitte (respektiert prefers-reduced-motion).
  "ncss-scrolly-step"-Event  bubbelt, detail = { index, time, step, figure }. time = Zahl aus
                     data-ncss-time am Schritt (Sekunden) oder null - Andockpunkt für
                     ein scroll-gesteuertes Video (seeken auf time).

Benötigt: components/scrolly.css (+ tokens.css/colors.css). Ohne IntersectionObserver
wird das Element gar nicht erst definiert (SKILL-Regel: kein halb funktionierendes
:defined) - es bleibt beim lesbaren Fluss-Layout.

Einbindung: <script src="ncss/js/scrolly.js" defer></script>
```

### `js/sparkline.js`

data-Attribute: `data-ncss-sparkline-table`

```text
ncss - Sparkline-Datenbindung (opt-in, ergänzt components/sparkline.css): berechnet
polyline/-area/-dot aus echten Werten statt sie von Hand als SVG-Koordinaten
ausrechnen zu müssen, UND liefert die Werte gleichzeitig als barrierefreie Tabelle -
das <svg> selbst ist rein dekorativ (aria-hidden), Screenreader bekommen die
tatsächlichen Zahlen aus einer visuell versteckten <table> daneben, nicht nur eine
vage Trend-Beschreibung.

Markup (opt-in - ein <svg class="ncss-sparkline"> OHNE data-values/data-src bleibt
unangetastet, z.B. für weiterhin von Hand/serverseitig gerenderte Sparklines):
  <svg class="ncss-sparkline" data-values="4,7,3,9,5,12" data-label="Besucher/Tag"></svg>
  <svg class="ncss-sparkline" data-src="besucher.json" data-label="Besucher/Tag"></svg>
data-values: einfache kommagetrennte Zahlenliste, Punkte ohne eigenes Label (Tabelle
  nummeriert sie 1..n).
data-src: JSON - entweder ein reines Zahlen-Array ([4,7,3,9,5,12]) oder ein Array aus
  {label, value}-Objekten für sprechende Tabellen-Zeilen (z.B. Wochentage/Daten).
data-label: Beschriftung der Datenreihe (Tabellen-<caption>) - ohne Angabe ein
  generischer DE/EN-Standardtext.
viewBox/preserveAspectRatio auf dem <svg> werden übernommen, falls bereits gesetzt -
sonst Default "0 0 200 60" (dieselben Maße wie das Hand-Beispiel in sparkline.css).
```

### `js/spotlight.js`

data-Attribute: `data-ncss-spotlight`, `data-ncss-spotlight-active`

```text
ncss - Spotlight: schreibt die Zeigerposition als --ncss-spotlight-x/-y (px, relativ zur
jeweiligen Fläche) in jedes .ncss-spotlight innerhalb von [data-ncss-spotlight] (oder
das Element selbst, wenn es die Klasse trägt). Das Licht selbst zeichnet
components/spotlight.css - ohne dieses Script steht es statisch in der Mitte.

Gruppen: EIN pointermove-Listener am [data-ncss-spotlight]-Element für alle Flächen
darin. Flächen in der Nähe des Zeigers (data-reach, Default 160px) bekommen
[data-ncss-spotlight-active] - so fangen Nachbarn den Rand des Lichtkegels auf.

Nur Maus/Stift (Touch wird ignoriert, dort gibt es kein "Schweben"). Pro Frame höchstens
eine Messung (requestAnimationFrame), keine Layout-Arbeit im Event selbst.
```

### `js/subnav.js`

data-Attribute: `data-ncss-sticky-header`, `data-ncss-subnav`, `data-ncss-subnav-ready`

```text
ncss - Abschnitts-Navigation (components/subnav.css): markiert den Abschnitt, der gerade
im Blick ist, mit aria-current="location" am passenden Link und hält diesen Link in der
seitlich wischbaren Leiste sichtbar. Reine Verbesserung - die Sprunglinks funktionieren
ohne dieses Script vollständig; Chromium 140+ hebt den Link zusätzlich nativ per
:target-current hervor (das CSS deckt beide Wege ab, der Screenreader-Zustand
aria-current kommt aber nur von hier).

Markup: <nav class="ncss-subnav" data-ncss-subnav> ... <a href="#abschnitt"> ... </nav>
Zusätzlich: misst den klebenden Kopfbereich ([data-ncss-sticky-header] oder .ncss-topbar)
und setzt --ncss-scroll-offset (+ ggf. --ncss-subnav-top), siehe trackHeader().
"Im Blick" = der letzte Abschnitt, dessen Oberkante die Unterkante der Leiste erreicht
hat; am Seitenende immer der letzte Abschnitt (kurze Schluss-Abschnitte erreichen die
Oberkante sonst nie).
```

### `js/tabs.js`

Elemente: `<ncss-tabs>`

Attribute: `hash`, `activation`

data-Attribute: `data-ncss-selected`, `data-ncss-tab`

Events: `ncss-tabs-change`

Öffentlich: `el.select(indexOderId)`

```text
ncss - <ncss-tabs>: macht aus einer Sprungmarken-Liste + Abschnitten echte Registerkarten
nach WAI-ARIA-APG "Tabs" (siehe components/tabs.css für Markup). Light-DOM-Custom-Element.

Rollen/Zustände: Liste role="tablist" (+ aria-orientation="vertical" bei
.ncss-tabs--vertical), Links role="tab" + aria-selected + aria-controls, Abschnitte
role="tabpanel" + aria-labelledby + hidden. Roving tabindex: nur der aktive Tab liegt in
der Tab-Reihenfolge, Tab springt danach direkt ins Panel (tabindex="0" am Panel, wie im
APG-Beispiel - auch wenn es selbst nichts Fokussierbares enthält).

Tastatur: Pfeil links/rechts (vertikal: hoch/runter) wechselt zyklisch, Pos1/Ende springt
zum ersten/letzten Tab. Standard ist automatische Aktivierung (Fokus = Auswahl);
activation="manual" bewegt nur den Fokus, Enter/Leertaste aktiviert.

hash-Attribut: Auswahl wird per history.replaceState() als #id gespiegelt (kein neuer
Verlaufs-Eintrag pro Klick, kein Springen der Seite), ein Aufruf mit #id oder ein späterer
hashchange auf eine Panel-id wählt den passenden Tab.

Event (bubbelt, am Element): ncss-tabs-change, detail { tab, panel, index }
Öffentlich: el.select(indexOderId)

Dynamische Inhalte: als Custom Element initialisiert es sich in connectedCallback() von
selbst - auch nach htmx-Swap/innerHTML, kein ncss-content-change nötig. Erneutes
Verbinden (verschieben) baut nichts doppelt auf.

Abhängigkeiten: keine anderen ncss-Scripts. Ohne customElements wird nichts registriert,
das Markup bleibt die funktionierende Sprungmarken-Seite.
```

### `js/text-reveal.js`

data-Attribute: `data-ncss-text-reveal`

```text
NativeCSS - Wort-Variante für components/text-reveal.css
(<p class="ncss-text-reveal" data-ncss-text-reveal>). Die Zeilen-/Fluss-Varianten
brauchen KEIN JS - dieses Script ist nur für "Wort für Wort".

Verpackt jedes Wort in <span class="ncss-text-reveal-word"> (nur Text-Knoten werden
geteilt, Inline-Markup wie <a>/<em> bleibt erhalten, der Text selbst bleibt für
Screenreader identisch) und nummeriert sie per --i/--n - die eigentliche Animation
läuft danach rein per CSS an der view-timeline des Blocks.

Ohne view-timeline: Wörter blenden nacheinander zeitbasiert ein, sobald der Block ins
Bild kommt (IntersectionObserver, Klasse .ncss-text-reveal--timed + .is-revealed).
Unter prefers-reduced-motion wird gar nichts verändert (Text bleibt wie er ist).

Einbindung: <script src="ncss/js/text-reveal.js" defer></script>
```

### `js/theme-toggle-early.js`

```text
ncss - Theme-Umschalter, früher Teil: setzt die gespeicherte Hell/Dunkel-Wahl, BEVOR die
Seite gezeichnet wird - sonst blitzt bei gespeichertem "dunkel" auf einem hellen System
kurz die helle Seite auf ("Flash of wrong theme").

Synchron im <head> laden, VOR den Stylesheets, ohne defer/async (Ausführungs-Timing
zählt, siehe SKILL "Keine Inline-Scripts" - als eigene Datei statt Inline-Snippet,
damit eine strenge CSP ohne 'unsafe-inline' funktioniert):
  <script src="dist/js/theme-toggle-early.js"></script>
  <link rel="stylesheet" href="dist/ncss.css">

Wer Inline-Scripts erlaubt, kann den Inhalt stattdessen direkt einbetten - eine Zeile.
Setzt [data-theme] (manuelle Wahl, wirkt über colors.css) und [data-theme-resolved]
(tatsächlich aktiver Modus, auch bei "System" - für Icons/Labels per CSS).
```

### `js/theme-toggle.js`

data-Attribute: `data-ncss-theme-label`, `data-ncss-theme-toggle`

```text
ncss - Hell/Dunkel-Umschalter für Buttons mit [data-ncss-theme-toggle]. Nutzt den
vorhandenen Mechanismus aus colors.css ([data-theme] am <html> überschreibt die
Systemeinstellung) und ergänzt, was eine echte Website zusätzlich braucht:

- Die Wahl bleibt gespeichert (localStorage "ncss-theme"), ohne Wahl gilt das System.
  Zusammen mit js/theme-toggle-early.js im <head> ohne Aufblitzen beim Laden.
- [data-theme-resolved] = tatsächlich aktiver Modus (auch bei "System"), z.B. um per
  CSS das passende Sonne/Mond-Icon zu zeigen.
- aria-pressed + wechselndes aria-label (Screenreader hören, was der Klick bewirkt).
- Weicher Farbwechsel nur WÄHREND des Umschaltens (Klasse .ncss-theme-switching am
  <html>, 350ms) - kein Dauer-Transition auf allen Elementen.
- Folgt einer Systemänderung live, solange nichts gespeichert ist.

Zwei Varianten:
1. data-ncss-theme-toggle (leer) - Hell <-> Dunkel. Entspricht die neue Wahl wieder
   dem System, wird die gespeicherte Wahl gelöscht (keine "eingefrorene" Einstellung).
   Labels: data-label-dark / data-label-light (Text für den Wechsel DORTHIN).
2. data-ncss-theme-toggle="cycle" - System -> Hell -> Dunkel -> System, aktueller Name
   in einem Kind-Element [data-ncss-theme-label].

Texte Deutsch/Englisch nach <html lang>, einzeln per data-label-* überschreibbar.
```

### `js/tooltip.js`

data-Attribute: `data-ncss-tooltip-fallback`

Events: `ncss-tooltip-hide`, `ncss-tooltip-show`

```text
ncss - Tooltip-Fallback + Absicherung (siehe components/tooltip.css für Markup).

Mit nativem interestfor (Chromium) setzt dieses Script nur fehlende Attribute
(popover="hint", role="tooltip", aria-describedby) - alles andere macht der Browser.
Ohne interestfor übernimmt es das Verhalten nach WAI-ARIA-APG "Tooltip" / WCAG 1.4.13:
  - öffnet nach kurzer Verzögerung bei Zeiger (Maus/Stift) oder Tastatur-Fokus
  - bleibt offen, solange der Zeiger auf Auslöser ODER Tooltip ist (hoverable)
  - Esc schließt, ohne den Fokus zu verschieben (dismissable)
  - schließt bei Blur / Verlassen
Positionierung per CSS Anchor Positioning (Script vergibt anchor-name/position-anchor),
sonst eigene Rechnung (über dem Auslöser, bei Platzmangel darunter, im Viewport gehalten).

Reine Ereignis-Delegation am document - Tooltips, die per htmx/fetch/REDAXO-Frontend-
Editing NACHTRÄGLICH eingefügt werden, funktionieren ohne weiteres Zutun (kein
ncss-content-change nötig). Die Attribut-Absicherung läuft zusätzlich beim ersten
Kontakt mit einem Auslöser.

Events (am Tooltip, bubbeln): ncss-tooltip-show / ncss-tooltip-hide
Abhängigkeiten: keine anderen ncss-Scripts. Ohne Popover-API tut das Script nichts.
```

### `js/video-bg.js`

data-Attribute: `data-ncss-video-bg`, `data-ncss-video-bg-ready`

Events: `ncss-video-bg-change`

```text
ncss - Hintergrund-Video für beliebige Flächen (Sektion, Hero, Karte, Banner), siehe
components/video-bg.css. Bewusst KEIN Custom Element: die Fläche ist normales Seiten-
Markup (oft ein <section> oder .ncss-hero), das Script ergänzt nur Verhalten.

  <section class="ncss-video-bg ncss-video-bg--dark" data-ncss-video-bg>
    <video class="ncss-video-bg-media" muted loop playsinline preload="none"
           poster="poster.jpg" aria-hidden="true">
      <source data-src="loop.webm" type="video/webm">
      <source data-src="loop.mp4" type="video/mp4">
    </video>
    ... Inhalt ...
  </section>

Funktioniert genauso auf einem .ncss-hero (components/hero.css) mit dem Video in
.ncss-hero-media: <section class="ncss-hero" data-ncss-video-bg> - das Script nimmt
das erste <video> in der Fläche. Ersetzt dort js/hero-video-motion.js (das hier
deckt reduzierte Bewegung mit ab und ergänzt den Pause-Schalter).

Verhalten:
  - Sichtbarer Pause/Abspielen-Schalter (WCAG 2.2.2 "Pausieren, Stoppen, Ausblenden":
    Bewegung > 5 s braucht eine Pause-Möglichkeit) - Text + Symbol, nicht nur Symbol.
    Ein vorhandenes .ncss-video-bg-toggle in der Fläche wird übernommen statt erzeugt.
    Ecke per Attributwert: data-ncss-video-bg="top-end" | "top-start" | "bottom-start"
    (Default unten am Ende).
  - Lädt erst in der Nähe des Viewports (data-src -> src, preload="none" -> "auto"),
    spielt nur sichtbar, pausiert außerhalb und in einem Hintergrund-Tab.
  - prefers-reduced-motion, prefers-reduced-data, Save-Data, forced-colors: nichts
    wird geladen oder abgespielt, das Poster bleibt; der Schalter bietet "Abspielen"
    an (bewusste Entscheidung der Besucherin schlägt die Voreinstellung).
  - Ein autoplay-Attribut (für Wiedergabe ganz ohne JS) wird übernommen - danach
    gelten dieselben Regeln.
Events (bubbeln): ncss-video-bg-change { paused, user } auf der Fläche.

Benötigt: components/video-bg.css (+ tokens.css/colors.css). Keine anderen
ncss-Scripts. Texte Deutsch/Englisch nach <html lang>.
```

### `js/video-card.js`

```text
ncss - Video-Vorschaukarten (components/video-card.css): spielt das <video> in
.ncss-video-card-media ab, solange die Karte mit der Maus berührt (nur bei echtem
Hover-Zeiger) oder per Tastatur fokussiert ist; beim Verlassen pausiert es und springt
auf den Anfang zurück, damit wieder das Poster-Bild erscheint. Kein Custom Element -
die Karte ist normales Link-Markup, das Script ergänzt nur das Abspielen.

Reduzierte Bewegung, Save-Data: es wird nichts geladen oder abgespielt.
Benötigt: components/video-card.css. Keine anderen ncss-Scripts.
```

### `js/video-float.js`

Elemente: `<ncss-video-float>`

Events: `ncss-video-float-dock`, `ncss-video-float-undock`

Öffentlich: `el.dock()`, `el.undock()`, `el.docked`

```text
ncss - <ncss-video-float>: Mini-Player, der beim Wegscrollen eines LAUFENDEN Videos an
eine Fensterecke andockt (components/video-float.css). Light-DOM-Custom-Element.

Das Element selbst bleibt als Platzhalter im Fluss (seine Höhe wird beim Andocken
festgehalten, nichts springt). Angedockt wird nur, wenn das Video läuft UND der
Platzhalter den Viewport verlassen hat. "Schließen" (bzw. Esc im angedockten Player)
pausiert und dockt ab; erneut angedockt wird erst, nachdem der Platzhalter wieder
sichtbar war. Der Fokus wird durch das Andocken nie verschoben.

Funktioniert mit einem nackten <video controls> ebenso wie mit <ncss-video-player>.
Events (bubbeln): ncss-video-float-dock, ncss-video-float-undock.
Öffentlich: el.dock(), el.undock(), el.docked.

Benötigt: components/video-float.css. Keine anderen ncss-Scripts.
Texte Deutsch/Englisch nach <html lang>.
```

### `js/video-player.js`

Elemente: `<ncss-video-player>`

Attribute: `speeds="0.5 0.75 1 1.25 1.5 2"`, `autohide="2500"`, `captions="en"`, `exclusive="false"`, `layout`

data-Attribute: `data-ncss-player-media`

Events: `ncss-media-ended`, `ncss-media-pause`, `ncss-media-play`, `ncss-video-trackchange`

Öffentlich: `el.play()`, `el.pause()`, `el.toggle()`, `el.seek(s)`, `el.skip(+/-s)`, `el.fullscreen()`, `el.next()`, `el.previous()`, `el.load(index)`, `el.media`

```text
ncss - <ncss-video-player>: eigener Videoplayer als Light-DOM-Custom-Element (kein
Shadow Root - Seiten-CSS/theme.css greifen ganz normal). Optik:
components/video-player.css. Progressive Enhancement über ein natives
<video controls>: ohne JS bzw. solange das Element nicht :defined ist, bleiben die
Browser-eigenen Bedienelemente - das Markup ist schon vollständig.

  <ncss-video-player>
    <video controls playsinline preload="metadata" poster="poster.jpg">
      <source src="film.mp4" type="video/mp4">
      <track kind="captions" src="de.vtt" srclang="de" label="Deutsch" default>
      <track kind="captions" src="en.vtt" srclang="en" label="English">
      <track kind="chapters" src="kapitel.vtt" srclang="de">
    </video>
  </ncss-video-player>

Ergänzt: großen Play-Button, Zeitleiste (gepufferte Bereiche, Kapitelmarken,
Zeit-/Kapitel-Tooltip unter dem Zeiger), Zeit, aktuelles Kapitel, Ton aus + Lautstärke,
EIN Einstellungs-Menü (Zahnrad: Geschwindigkeit + Untertitel-Sprache), CC-Schalter,
Bild-in-Bild, Vollbild auf dem ELEMENT (eigene Leiste/Untertitel kommen mit),
automatisch ausblendende Leiste, Lade-Spinner, Fehlerzustand mit "Erneut versuchen".

Karte (layout="card", gleiche Formensprache wie <ncss-audio-player layout="card">):
Titel/Untertitel aus .ncss-video-player-title/-meta, klickbare Kapitelliste aus der
chapters-Spur und eine Playlist (<ol class="ncss-video-player-playlist"> mit Links auf
die Videos; data-poster, data-title, data-meta, data-chapters,
data-captions="de=de.vtt en=en.vtt") in einer Spalte neben bzw. unter dem Bild.
Vor/Zurück-Buttons, automatisch nächstes Video, Media Session (Titel/Poster in der
System-Mediensteuerung). Die Playlist funktioniert auch ohne layout="card".

Tasten (Fokus im Player): Leertaste/K Play-Pause · J/L -/+10 s · Pfeil links/rechts
-/+5 s · Pfeil hoch/runter Lautstärke · M Ton aus · F Vollbild · C Untertitel ·
0-9 springt auf 0-90 % · Pos1/Ende · < und > Geschwindigkeit · N/P nächstes/voriges Video.

Attribute:
  speeds="0.5 0.75 1 1.25 1.5 2"  Einträge des Geschwindigkeitsmenüs
  autohide="2500"                 ms ohne Zeigerbewegung, bis die Leiste ausblendet
                                  ("0" = nie ausblenden)
  captions="en"                   Untertitel-Sprache beim Start (sonst <track default>)
  exclusive="false"               darf parallel zu anderen Playern laufen
Events (bubbeln): ncss-media-play, ncss-media-pause, ncss-media-ended,
  detail = { currentTime, duration }; ncss-video-trackchange { index, item }.
Öffentlich: el.play(), el.pause(), el.toggle(), el.seek(s), el.skip(+/-s),
  el.fullscreen(), el.next(), el.previous(), el.load(index), el.media (das <video>).

Immer nur EIN Player spielt gleichzeitig: startet ein <video>/<audio> mit
data-ncss-player-media (setzt dieses Script und audio-player.js), pausieren alle anderen
- ohne gemeinsames Script, nur über diese Attribut-Konvention. Hintergrund-/Scroll-
Videos tragen das Attribut nicht und laufen unabhängig weiter.

Benötigt: components/video-player.css (+ tokens.css/colors.css). Keine anderen
ncss-Scripts. Ohne customElements/textTracks wird das Element gar nicht erst definiert
(SKILL-Regel) - es bleibt beim nativen <video controls>.

Texte: Deutsch/Englisch nach <html lang> (wie lightbox.js).
```

### `js/view-transitions.js`

```text
ncss - View-Transitions-Enhancement für .ncss-accordion-split (kein CSS-Layer, reines
opt-in JS). Der Bildwechsel in .ncss-accordion-split-media läuft heute per CSS
:has()-Trick als harter display:none/block-Schnitt, ohne Übergang (User-Report:
"fehlen Transitions ... Bild sollte einfaden oder gleiten"). Same-Document View
Transitions (document.startViewTransition()) sind der dafür vorgesehene native
Mechanismus - anders als die bereits vorhandenen Cross-Document View Transitions
(page-transitions.css) gibt es dafür KEINE rein deklarative CSS-Form, ein kurzer
JS-Trigger ist unvermeidlich (Stand jetzt, Spec-bedingt).

Browser-Support (Stand August 2026, per Recherche + echtem Playwright-Test bestätigt:
`typeof document.startViewTransition === 'function'`): Chrome/Edge 111+, Safari 18+,
Firefox 133+. Ohne Unterstützung bleibt der native, sofortige <details>-Toggle
unverändert erhalten (`if (!document.startViewTransition) return` unten) - kein
Funktionsverlust.

MECHANIK: <details> feuert (Stand jetzt) KEIN abbrechbares `beforetoggle` (anders als
<dialog>/Popover - siehe whatwg/html#9743, offener Spec-Issue, per Recherche
bestätigt) - der native Toggle lässt sich deshalb nicht darüber abfangen. Funktionierender
Weg: Klick auf <summary> abfangen und per `preventDefault()` verhindern (das IST
möglich, `<summary>`s Aktivierungsverhalten ist abbrechbar), dann `.open` MANUELL
innerhalb von `document.startViewTransition(...)` umschalten - dadurch sieht die
View-Transitions-API einen echten Vorher-/Nachher-Zustand. Per echtem Test in
Chromium/WebKit/Firefox bestätigt: das funktioniert auch für EXKLUSIVE Gruppen
(`<details name="...">`) - das Schließen der Geschwister-Punkte passiert weiterhin
automatisch, obwohl `.open` per JS statt durch echten Nutzer-Klick gesetzt wird (Teil
des <details>-eigenen Algorithmus, nicht an "war es ein echter Klick" gebunden).

NAME vs. KLASSE: `view-transition-name` muss unter simultan sichtbaren Elementen
EINDEUTIG sein (Spec) - bei mehreren .ncss-accordion-split-Instanzen auf derselben
Seite bekommt jede ihren eigenen Namen (Instanz-Index). Für die Presets (siehe unten)
reicht ein fester Name aber NICHT aus, weil CSS' `::view-transition-group()`-Selektor
nur exakte Namen oder den Universalselektor `*` kennt (per Recherche + echtem Test
bestätigt: KEIN Scoping über eine DOM-Vorfahren-Bedingung wie `[data-transition]
::view-transition-group(...)` möglich, die Pseudo-Elemente hängen an einem eigenen,
von :root ausgehenden Baum, nicht am normalen DOM). Deshalb zusätzlich
`view-transition-class` (Level 2, per echtem Test in allen drei Engines bestätigt:
`::view-transition-group(*.klassenname)` trifft nur Gruppen mit dieser Klasse, egal
welchen eindeutigen Namen sie einzeln tragen) - das eigentliche Preset-Styling in
accordion-split.css zielt auf die KLASSE, nicht auf den Namen.

NICHT `.ncss-accordion-split`-spezifisch geschrieben, obwohl aktuell nur dafür verkabelt
- `enhanceExclusiveDetailsGroup()` funktioniert an jeder `<details name="...">`-Gruppe
mit einem Medien-Element, das per View Transition wechseln soll. Künftige Komponenten
mit demselben Bedürfnis (z.B. ein Tab-Wechsler) können dieselbe Funktion wiederverwenden.
```

### `js/wa-close-on-scroll.js`

```text
NativeCSS - schließt offene <wa-dropdown>/<wa-popover>-Panels, sobald die Seite
gescrollt wird. Web Awesomes Popup-Baustein hält ein offenes Panel ABSICHTLICH
während des Scrollens an seinem Anker positioniert (siehe vendor/webawesome/dist-cdn/
skills/webawesome/references/components/popup.md: "keep them positioned together as
the page scrolls") - sitzt der Anker in einer position:sticky-Kopfleiste, kann diese
ständige Neuberechnung sichtbar glitchen (User-Report: Text/Panel "verdoppelte" sich
beim Scrollen wie ein Glitch-Effekt) - betraf sowohl <wa-dropdown> als auch
<wa-popover> gleichermaßen, unabhängig von backdrop-filter/Glassmorphism (die dafür
zuerst verantwortlich vermutete Ursache, siehe SKILL.md Punkt 21) - ein generelles
Web-Awesome-/Floating-UI-Verhalten, kein ncss-CSS-Problem, deshalb hier nicht per CSS
lösbar. Schließen statt weiter mitpositionieren ist dieselbe, verbreitete Lösung wie
bei den meisten Mega-/Dropdown-Menüs anderer Sites - kein Repositionierungs-Kampf
mehr, weil das Panel dann einfach nicht mehr da ist.

Einbindung (nur auf Seiten mit <wa-dropdown>/<wa-popover> nötig):
  <script src="../components/wa-close-on-scroll.js" defer></script>

Sucht zusätzlich gezielt INNERHALB jedes <ncss-container> (siehe ncss-container.js) -
dessen Inhalt liegt in einem Shadow Root, den ein normales querySelectorAll() nicht
durchquert. Bewusst NICHT der generische "jedes Element auf .shadowRoot prüfen"-Ansatz
wie in den anderen Fallback-Scripts (deren Suche läuft nur EINMAL beim Laden) - dieser
Handler läuft bei JEDEM Scroll-Event, ein voller DOM-Walk wäre dort spürbar teurer als
die gezielte Suche nach der einzigen Quelle von Shadow Roots, die auf einer
ncss-Seite realistisch vorkommt. Zusätzlich jetzt per requestAnimationFrame gedrosselt
(vorher ungedrosselt bei jedem einzelnen Scroll-Event) - dieselbe Technik wie die
übrigen Scroll-Fallback-Scripts.
```
