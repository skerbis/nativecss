---
name: ncss
description: Arbeiten mit dem ncss Design System (public/ncss/) - natives CSS, kein Build-Schritt, Web-Awesome/Font-Awesome-Bridge. Beim Anlegen/Ändern von Tokens, Komponenten, Demo-Seiten oder der Web-Awesome-Bridge unter public/ncss/ verwenden.
---

# ncss Design System

`public/ncss/` ist ein eigenständiges, natives CSS-Design-System - kein UIkit-Erbe, kein
LESS/Sass, kein Build-Schritt. Web Awesome (Free) und Font Awesome (Free) sind selbst
gehostet unter `public/ncss/vendor/` und über `webawesome-bridge.css` an ncss-Tokens
gekoppelt. Das vollständige Handbuch (dogfooded, im Browser lesbar, mehrsprachig) liegt
unter `public/ncss/docs/de/index.html` (Quelle: `docs-src/`, per `docs-src/build.mjs`
generiert - siehe Fallstrick 35) - dieses Skill-Dokument ist die kondensierte Fassung für
schnelle Arbeit plus die Fallstricke, die man sich sonst mühsam erneut erarbeiten müsste.
Die alte einseitige `demo/docs.html`-Variante wurde entfernt, seit die Doku-Website
vollständig ist (siehe Fallstrick 35).

**Repo-Struktur (seit dem Aufräumen des Hauptordners)**: die eigentliche Bibliothek
(`ncss.css` + alles, was sie importiert - `tokens.css`/`colors.css`/`reset.css`/
`base.css`/`webawesome-bridge.css`/`browser-fixes.css`, plus `helpers/`, `components/`,
plus die opt-in `theme.css`/`page-transitions.css`) liegt unter `public/ncss/dist/`, NICHT
mehr direkt unter `public/ncss/`. `demo/*.html` bindet sie entsprechend über
`../dist/ncss.css` (statt vorher `../ncss.css`) ein. `vendor/` bleibt bewusst EIN eigener
Ordner auf oberster Ebene (reiner Drittanbieter-Code, kein Teil von `dist/` - `ncss.css`
funktioniert vollständig ohne Web Awesome). Die frühere `index.html` (Repo-Root,
Produkt-/Marketingseite) ist umgezogen nach `demo/product.html` - `demo/index.html`
selbst ist eine ANDERE, schon vorher existierende Datei (die Demo-Übersicht/Kitchen-Sink,
von 14+ anderen Demo-Seiten als Nav-Link referenziert - deshalb der andere Dateiname für
die einziehende Seite, keine Umbenennung der bestehenden Demo-Übersicht). Site-Wurzel
(`https://skerbis.github.io/nativecss/`) zeigt weiterhin `demo/product.html` - ein
GitHub-Actions-Workflow (`.github/workflows/pages.yml` + `.github/scripts/
build-root-index.mjs`) erzeugt beim Deploy eine pfad-angepasste Kopie als echte
`index.html` an der Site-Wurzel, kein sichtbarer Redirect, kein Root-Stub im Git-Tree
selbst. HISTORISCHE Fallstricke unten (z.B. Punkt 24-27), die noch `index.html`/
Repo-Root erwähnen, beziehen sich auf den Stand VOR diesem Umzug - der Pfad in der
jeweiligen Beschreibung ist dadurch nicht mehr aktuell, der beschriebene Bug/Fund selbst
bleibt gültig.

## Grundprinzipien (nicht verhandelbar, außer der Nutzer sagt explizit etwas anderes)

- **Native zuerst.** Cascade Layers statt Spezifitäts-Kämpfe/`!important`, Container Queries
  statt Viewport-Breakpoints, `light-dark()` statt zweitem Dark-Stylesheet, natives
  `<dialog>`/`<details>` statt JS-Nachbauten. Web Awesome nur, wo natives HTML/CSS nicht
  reicht (z.B. Rating, Tree, Popover) - niemals für das strukturelle Seitengerüst (kein
  `wa-page`), weil das die ganze Seite von ES-Modulen abhängig macht (siehe Fallstrick unten).
- **Ein Token-System, eine Quelle der Wahrheit.** `tokens.css`/`colors.css` sind die einzige
  Werteliste. Nichts, auch nicht die Web-Awesome-Bridge, dupliziert Werte - nur Übersetzung.
- **Kein Build-Schritt.** Kein LESS/Sass/Bundler. `@import` + Cascade Layers regeln die
  Reihenfolge. Vendor-Bibliotheken selbst gehostet, keine CDN-Abhängigkeit.
- **Kein Utility-Klassen-Wildwuchs.** Kleine, kuratierte Utility-Sets statt Tailwind-artiger
  Matrix. Neue Utility-Klasse nur bei echtem, wiederkehrendem Bedarf.
- **Solides Grundgerüst, nicht übertreiben.** Basis (Tokens, Reset, Layout, Kernkomponenten)
  ist bewusst vollständig/stabil. Individuelles kommt als eigene Komponente hinzu, wenn der
  Bedarf konkret ist - nicht vorsorglich ein großes Set anlegen "für den Fall".
- **Verifizieren, nicht annehmen.** Jede nicht-triviale CSS-Änderung mit Playwright im echten
  Browser testen (Screenshot + computed styles), nicht nur lesend beurteilen. Für neue/seltene
  CSS-Features vorher Support via WebSearch prüfen statt aus dem Training zu raten.
- **Keine Inline-Styles**, außer `style="--ncss-grid-min: Xrem"` (Custom-Property-
  Parametrisierung, keine Deko - eine Klasse pro Wert wäre die Utility-Matrix, die vermieden
  werden soll).
- **Natives CSS Nesting ist erlaubt, wo es Code spart UND nachvollziehbar bleibt** (Nutzer-
  Vorgabe) - z.B. Pseudoklassen/-elemente einer Komponente (`&:hover`, `&::backdrop`),
  echte Varianten-Blöcke, die denselben Elternselektor wiederholt hätten, oder ein
  `@container`/`@media`-Block, der ohnehin nur eine einzige, klar zugehörige Regel enthält.
  NICHT verschachteln, wenn es die Lesbarkeit verschlechtert (mehr als 2-3 Ebenen tief,
  oder wenn getrennte Regeln mit eigenem Kommentar-Block klarer wären, wie es die
  Container-Query-Konvention unten ohnehin schon vorsieht) - "Code sparen" ist kein
  Selbstzweck, wenn es auf Kosten der Verständlichkeit ginge.
- **`light-dark()` ist die alleinige Dark-Mode-Mechanik**, kein zweites Dark-Stylesheet -
  siehe `colors.css` (64 Nutzungen: jedes Farbtoken + alle 100/300/700/900/on-soft-Stufen
  aller 6 Familien).

## Layer-Reihenfolge (in `ncss.css`)

```
wa-native..wa-theme-overrides (Web Awesomes eigene Layer, niedrigste Priorität)
tokens < reset < base < helpers < components < webawesome-bridge (höchste Priorität)
```

Die `wa-*`-Layer werden HIER (nicht in Web Awesomes eigenen Dateien) deklariert, damit
`webawesome-bridge.css` garantiert gegen Web Awesomes Default-Theme gewinnt - unabhängig
von der `<link>`-Reihenfolge im HTML (Cascade-Layer-Order ist seitenweit global, nicht pro
Stylesheet). Beim Hinzufügen einer neuen Web-Awesome-Ressource NICHT die Layer-Deklaration
in `ncss.css` vergessen, falls sie neue `@layer`-Namen mitbringt.

**Theme-Anpassung läuft über `theme.css`** (`dist/theme.css`, NACH `ncss.css` laden) - eine
einzige, bewusst UNLAYERED Datei mit allen wichtigen Seed-Werten (Markenfarben,
Grundflächen, Schriften, Radien, Schatten, Bewegung). Unlayered CSS gewinnt immer gegen
jede Layer-Regel (siehe oben), kein `!important` nötig. Bei neuen Tokens in
`tokens.css`/`colors.css` prüfen, ob es ein SEED-Wert ist (gehört dann auch in
`theme.css`) oder ein daraus ABGELEITETER Wert (color-mix()-Skalenstufe o.ä. - gehört
NICHT in `theme.css`, zieht automatisch mit). Demo: `demo/theming.html`.

## Bekannte Fallstricke (per echtem Test gefunden - vor erneuter Recherche hier nachsehen)

**Beim Ergänzen eines neuen Punkts: nur Gotcha + Ursache + Fix, keine Debug-Erzählung.**
Kein Nacherzählen des Vorgehens (Anläufe, Zwischenversuche, "per echtem Test bestätigt"),
keine User-Zitate, keine "Nachtrag"-Unterabschnitte - Fakten direkt in den Haupttext
einarbeiten. Ein Punkt sollte auch nach mehreren Fixes derselben Komponente EIN
kompakter Absatz bleiben, kein wachsendes Protokoll.

0. **Web Awesome liefert seine eigene, zur genau installierten Version passende Referenz-
   Doku mit** - `vendor/webawesome/dist-cdn/skills/webawesome/references/components/*.md`,
   ein `.md` pro Komponente. Das ist die verlässliche Quelle (per Test bestätigt korrekt für
   Toast/Avatar/Drawer/Comparison/Dropdown/Accordion/Carousel/Breadcrumb) - IMMER zuerst hier
   nachsehen, bevor `webawesome.com/docs` per WebFetch abgefragt wird. Der Fallstrick #1
   unten (appearance-Verwirrung) entstand genau dadurch, dass die öffentliche Doku-Seite an
   der Stelle falsch/widersprüchlich war und diese lokalen Referenzdateien zu dem Zeitpunkt
   noch nicht geprüft wurden.

1. **`appearance="filled"` bei `<wa-button>` ist die WEICHE Variante** (`fill-normal`/
   `on-normal`), **`appearance="accent"` die KRÄFTIGE** (`fill-loud`/`on-loud`) - umgekehrt
   von dem, was der Name vermuten lässt. Bei `<wa-tag>`/`<wa-badge>` ist die Zuordnung
   NOCHMAL ANDERS (`filled` = `fill-quiet`). Am schnellsten verlässlich prüfbar über die
   lokale Referenz-Doku (siehe Punkt 0) oder direkt im kompilierten Source:
   `grep -rn "appearance=" vendor/webawesome/dist-cdn/chunks/*.js`.

2. **Farbstufen `-100`/`-300` MÜSSEN `light-dark()`-gewrappt sein** (mischen im Dark Mode
   gegen Schwarz statt Weiß, wie `-700`/`-900` es schon taten) - sonst sind z.B. gefüllte
   Web-Awesome-Buttons oder `.ncss-badge` im Dark Mode unlesbar (heller/dunkler Text auf
   gleich hellem/dunklem Chip). Die passende Textfarbe (`--ncss-color-{familie}-on-soft`,
   in `colors.css` definiert) MUSS ebenfalls pro Modus wechseln (`light-dark(X-700, X)`),
   nicht nur die Fläche - beide Enden des Paares invertieren, sonst bricht es nur anders.

3. **Web Awesome ist komplett ES-Module-basiert - funktioniert NICHT über `file://`.**
   Browser blockieren `type="module"`-Scripts/`import()` ohne echten Origin. Beim Testen/
   Vorführen IMMER über einen lokalen Server (`php -S 127.0.0.1:PORT -t public/ncss`),
   nie die Datei direkt doppelklicken. Kein Bug im Code - eine Browser-Sicherheitsgrenze.

4. **Self-Hosting mit relativem Pfad braucht `data-webawesome="..."` auf dem Loader-
   `<script>`.** Ohne das nutzt Web Awesomes eigene Basis-Pfad-Erkennung das rohe,
   unaufgelöste `src`-Attribut und verdoppelt den Pfad - alle Komponenten-Chunks 404en mit
   einem Pfad-Segment doppelt drin.

5. **`:playing`/`:paused` CSS-Pseudoklassen sind (Stand jetzt) noch nicht Baseline**
   (Interop-2026-Ziel) - nicht für Video-Play-Button-Overlays im Default verwenden, poster+
   controls nativ deckt "Klick zum Abspielen" bereits vollständig ab.

6. **Popover ≠ Dropdown.** Ein `<wa-popover>`, das an ein persistentes Chrome-Element
   (Header-Icon) hängt, IST funktional ein Dropdown. Der eigentlich popover-typische Fall
   ist ein Trigger MITTEN im Content (z.B. ein Info-Icon neben einem Listeneintrag), der
   Zusatzinfo zu genau dieser Stelle zeigt. Beim Bauen neuer Popover-Beispiele diese
   Unterscheidung im Kopf behalten.

7. **`<wa-popover>`-Inhalt bleibt trotz Top-Layer-Darstellung ein DOM-Nachfahre** seines
   Elternelements - ein zu allgemeiner Nachfahren-Selektor wie `.foo i { color: ... }`
   trifft auch Icons INNERHALB eines darin verschachtelten Popovers. Selektoren für
   Listen-Icons etc. auf direkte Kindschaft (`.foo > li > i`) beschränken, nicht auf
   beliebige Tiefe.

8. **`<video><source media="...">` ist KEIN cross-browser-taugliches Art-Direction-Feature**
   (per WebSearch geprüft) - aus Spec und den meisten Browsern wieder entfernt, nur Safari/
   WebKit unterstützt es noch als Altlast. Für Bilder ist `<picture><source media="...">`
   dagegen die korrekte, voll unterstützte Lösung (siehe `helpers/media.css`,
   `demo/media.html#art-direction`). Für Video ohne echte zweite Datei:
   `.ncss-video--responsive-crop` (anderer Bildausschnitt derselben Datei per
   `object-fit`+Breakpoint, kein JS). Echtes anderes Filmmaterial je Breakpoint bräuchte
   kleines JS (`matchMedia` + `src`-Wechsel) - nicht in `video.css`, um es JS-frei zu halten.

9. **`initial-letter` (Drop Cap) braucht in echtem Safari die `-webkit-`-Vorsilbe** -
   `CSS.supports('initial-letter', '3')` liefert dort `false`, nur
   `CSS.supports('-webkit-initial-letter', '3')` ist `true` (per Playwright-WebKit-Test
   bestätigt). War fälschlich als "Baseline seit August 2026" dokumentiert (Firefox hat es
   nie ausgeliefert, ist also nie Baseline gewesen) - IMMER beide Schreibweisen deklarieren
   (`-webkit-initial-letter` UND `initial-letter`, MDNs eigenes Beispiel macht das genauso)
   und `@supports (initial-letter: 3) or (-webkit-initial-letter: 3)` prüfen, sonst bleibt
   echtes Safari fälschlich außen vor (siehe `helpers/typography.css`).

10. **Relative `url()`-Werte INNERHALB einer CSS Custom Property lösen sich gegen die
    Basis-URL des Stylesheets auf, das die Property per `var()` KONSUMIERT - nicht gegen die
    Basis-URL der Seite/des Stylesheets, das die Property GESETZT hat.** Ein
    `style="--x: url(bild.jpg)"` auf einer Demo-Seite, gelesen von `background-image:
    var(--x)` in einer `components/*.css`-Datei, versucht das Bild relativ zu `components/`
    zu laden - 404, kein offensichtlicher Fehler im Markup erkennbar (per echtem Test in
    `components/hero.css` gefunden). Fix: `url()`-Werte NIE durch eine Custom Property
    reichen, `background-image`/`src` immer direkt inline am verwendenden Element setzen.
    Das ist die eine Ausnahme von der sonst geltenden Custom-Property-Parametrisierungs-
    Konvention (`--ncss-grid-min` u.ä. sind reine Zahlen/Keywords, kein `url()`).

11. **`.ncss-container--narrow` ALLEIN (ohne die Basisklasse `.ncss-container`) bricht
    `.ncss-full-bleed`.** `--narrow` ist nur ein Modifier (setzt ausschließlich
    `max-width`) - `width:100%`/`margin-inline:auto`/`padding-inline` kommen von der
    Basisklasse. Fehlt sie, klebt der Narrow-Block linksbündig statt zentriert; ein darin
    verschachteltes `.ncss-full-bleed`-Kind geht dann von einer falschen Bildschirmmitte
    aus (`calc(50% - 50vw)` nimmt an, JEDER Vorfahre sei zentriert) - sichtbar als Leerraum
    rechts + über den Bildschirmrand hinaus abgeschnittener Inhalt links (per echtem Test
    in `demo/index.html` gefunden, User-Report: "Platz rechts" + "Text links
    abgeschnitten"). Immer `class="ncss-container ncss-container--narrow"` zusammen
    verwenden, nie `--narrow` solo.

12. **Ein Kombi-Element wie `.ncss-card-media` + `.ncss-placeholder` erbt ALLE Eigenschaften
    beider Klassen, auch ungewollte.** `.ncss-placeholder` bringt eine eigene
    `border-radius: var(--ncss-radius-md)` mit (sinnvoll als eigenständiger Platzhalter) -
    kombiniert mit `.ncss-card-media` rundete das ALLE vier Ecken der Media, nicht nur die,
    die wirklich an eine Kartenecke stoßen (unten sichtbar falsch bei vertikalem Card-
    Layout, rechts bei `.ncss-card--horizontal`, per User-Report gefunden). Fix:
    `.ncss-card-media { border-radius: 0; }` explizit setzen - die eigentliche Rundung
    übernimmt automatisch `overflow: clip` der Karte, für JEDES Layout korrekt, ohne
    weitere layoutspezifische Regeln. Bei jeder neuen Komponenten-Kombination prüfen, ob
    eine der beiden Klassen eine Eigenschaft mitbringt, die im jeweils anderen Kontext
    falsch ist - nicht nur border-radius.

13. **Rein gestalterische Eigenschaften (Rahmen/Ecken/Schatten) gehören NICHT als Default
    oder Modifier in eine Komponente**, auch wenn das erstmal bequem wirkt (z.B. war
    `.ncss-card--elevated` nur innerhalb von `.ncss-card` nutzbar). Stattdessen allgemeine,
    komponentenunabhängige Utilities (`helpers/elevation.css`:
    `.ncss-border`/`.ncss-radius-*`/`.ncss-shadow-*`/`.ncss-shadow-hover-*`), die auf
    JEDEM Element funktionieren und frei kombinierbar bleiben - eine Komponente wie
    `.ncss-card` bringt dann nur noch Struktur (Flex-Layout, `overflow: clip` als
    Voraussetzung dafür, dass eine optionale Rundung auch greift) und Verhalten mit,
    keine feste Optik.

14. **`*/` als literale Zeichenfolge INNERHALB eines `/* ... */`-Kommentars beendet den
    Kommentar sofort dort** - z.B. `.ncss-radius-*/.ncss-shadow-*` in einem Dokumentations-
    Kommentar (Wildcard-Klassenname `-*` direkt gefolgt von `/`). Alles danach bis zum
    NÄCHSTEN `*/` wird als echter CSS-Code geparst (kaputt), und diese "echte" `*/` beendet
    dann selbst nichts mehr - der Browser verwirft beim Fehler-Recovery oft die
    nachfolgende(n) Regel(n) komplett, OHNE Fehler in der Konsole (per echtem Test
    gefunden: `.ncss-card-container { container-type: inline-size; ... }` verschwand
    dadurch spurlos, `.ncss-card--horizontal` blieb wochenlang nur vermeintlich
    funktionsfähig). Nie `-*/` (oder allgemein `*/` mitten im Satz) in einem CSS-Kommentar
    schreiben - `-...` statt `-*` in Prosa verwenden, oder ein Leerzeichen einfügen. Nach
    JEDER Kommentar-Änderung mit Wildcard-Klassennamen (`.ncss-x-*`) per
    `grep -rn '\-\*/' *.css helpers/*.css components/*.css` prüfen, dass keine neue Instanz
    entstanden ist - eine rein visuelle Kontrolle per Playwright-Screenshot reicht NICHT,
    weil eine verschwundene Regel oft genau das ist, was man nicht sieht.

15. **Flex-/Grid-Items werden per Spec automatisch "blockifiziert" - ein deklariertes
    `display: inline`/`inline-block` auf einem DIREKTEN Kind von `display:flex`/`grid`
    rechnet der Browser zu `display: block` um, unabhängig davon, was die eigene Regel
    sagt.** Betraf `.ncss-text-boxed` (braucht `display:inline` für
    `box-decoration-break: clone`) direkt als Kind von `.ncss-stack` (Flex) - die
    Klonung griff nicht mehr sichtbar (eine durchgehende Box statt einer pro Zeile), OHNE
    dass irgendeine Regel das `display:inline` sichtbar überschrieben hätte (per
    `getComputedStyle` bestätigt: `display: block`, obwohl im CSSOM nur genau eine Regel
    mit `display:inline` auf das Element passte - die Blockifizierung passiert NACH der
    Kaskade, nicht durch eine konkurrierende Deklaration). Jede Komponente, die auf
    `display:inline` angewiesen ist (`.ncss-text-boxed`, ggf. künftige ähnliche), NIE
    direkt in `.ncss-stack`/`.ncss-cluster`/`.ncss-grid`/`.ncss-flex` verschachteln,
    sondern in einen normalen `<div>`-Wrapper. Gilt genauso indirekt über eine
    `.ncss-card-body`, die selbst `.ncss-stack`/`-cluster`/`-grid` trägt (verbreitetes
    Card-Innenabstand-Muster), oder über `.ncss-card--horizontal`/`--horizontal-end`
    (deren `.ncss-card-body` IMMER `display:flex` bekommt, siehe components/card.css) -
    eine reine `.ncss-card-body` ohne diese Kombination ist dagegen ein normaler
    Block-Container, kein Wrapper nötig. Recherchiert (User fragte danach): aktuell KEIN
    CSSWG-Vorschlag für ein Opt-out bekannt - [w3c/csswg-drafts#4065](https://github.com/w3c/csswg-drafts/issues/4065)
    hat die Blockifizierung nur präzisiert (Rechenwert statt generierter Box), nicht
    entfernt. `display:contents` löst es NICHT (entfernt die eigene Box komplett,
    `box-decoration-break` hat dann nichts zu klonen) - der `<div>`-Wrapper bleibt der
    einzige Weg. Demo + Card-Beispiel: `demo/magazine.html`, Erklärung: README "Bekannte
    Grenzen".

16. **`:modal` hört SOFORT auf zu matchen, sobald `close()`/ESC/ein Close-Button feuert -
    lange BEVOR die per `@starting-style`/`allow-discrete` verlängerte Fade-Transition
    optisch fertig ist** (`display` bleibt dank dieser Mechanik extra lang "block", `:modal`
    aber nicht). Jede Positionierung, die nur über das UA-Stylesheet an `:modal` hängt
    (`dialog:modal { position:fixed; inset:0; margin:auto; }`, die native Zentrierung)
    bricht dadurch MITTEN in der eigenen Schließen-Animation weg - `margin` fällt von
    `auto` auf `0` zurück, der Dialog "fliegt" sichtbar nach oben links, während Opacity/
    Scale/Transform noch normal weiterlaufen (per echtem Test an Position + `:modal` +
    Zeitstempeln bestätigt, User-Report: "fliegt oben links raus", betraf `.ncss-modal`
    UNABHÄNGIG von der `--3d`-Variante). Fix: Positionierung, die über die GESAMTE
    Öffnen/Schließen-Animation stabil bleiben soll, immer UNBEDINGT deklarieren (nicht an
    `:modal` gekoppelt) - `.ncss-modal` setzt `position:fixed; inset:0; margin:auto;`
    jetzt selbst, statt sich auf das UA-Stylesheet zu verlassen. `.ncss-offcanvas` hatte
    dasselbe Muster zufällig schon richtig (eigene unbedingte `position:fixed;
    margin:0`), ursprünglich nur um die UA-Zentrierung zu überschreiben, nicht bewusst
    wegen dieses Bugs - beim Prüfen künftiger `<dialog>`-Komponenten trotzdem immer
    gezielt nachsehen, ob eine Positionierung an `:modal` hängt.

17. **Ein Custom Property in `@keyframes` animiert nur diskret (kein Zwischenwert), solange
    es NICHT über `@property` typisiert ist** - `.ncss-glow-border` (components/effects.css)
    rotiert einen `conic-gradient()`-Ring per `to { --ncss-glow-angle: 360deg }`; ohne
    `@property --ncss-glow-angle { syntax: "<angle>"; ... }` davor würde der Browser gar
    nicht sauber von 0deg nach 360deg interpolieren. Baseline seit 2024 (Chrome/Edge/Safari
    16.4+/Firefox 128+) - ohne Unterstützung bleibt der Ring einfach unbewegt stehen, kein
    Darstellungsfehler, also kein `@supports`-Fallback nötig.

18. **Ein `::before` mit negativem `z-index` malt NICHT hinter dem eigenen Hintergrund des
    Elements** - laut CSS-Stacking-Reihenfolge (Anhang E) malt der eigene Hintergrund des
    Elements ALS ERSTES, negative z-index-Nachfahren malen danach, also OBEN DRAUF. Für
    einen Ring-Effekt (`.ncss-glow-border`) daher kein `z-index`-Trick, sondern ein echtes
    "Loch" maskieren: `padding: <dicke>` erzeugt die Ringstärke, `mask-composite: exclude`
    (`-webkit-mask-composite: xor` für Safari) schneidet die `content-box` aus der vollen
    Box heraus, übrig bleibt nur der Ring, die Mitte bleibt transparent.

19. **Gefülltes Neumorphism (Schatten aus `color-mix()` der eigenen Hintergrundfarbe
    abgeleitet) braucht eine MITTELTON-Basisfarbe** - gegen reines Weiß gemischt gibt es
    keinen Spielraum mehr nach oben, der helle Anteil verschwindet komplett und übrig
    bleibt ein gewöhnlicher Drop-Shadow statt einer feinen Prägung. Robusterer Ansatz
    (`.ncss-stamped`): keine gefüllte Fläche, sondern dieselbe Masken-Ring-Technik wie
    `.ncss-glow-border` (Punkt 18), mit `linear-gradient(135deg, dunkel, hell)` (NUR zwei
    Farbstopps - ein dritter, mittiger `transparent`-Stopp reißt den Ring bei geringer
    Ringdicke sichtbar auf statt sanft zu verblassen). Funktioniert auf JEDER
    Hintergrundfarbe, weil keine Hintergrundfarbe abgeglichen werden muss. In Kombination
    mit `.ncss-btn`-Varianten übernimmt die Ringfarbe automatisch die Button-Farbe (Alpha-
    Compositing), die Eckenform NICHT (`.ncss-stamped`s eigener Radius liegt im
    `components`-Layer, schlägt `.ncss-btn`s `helpers`-Layer-Radius) - beim Kombinieren
    `--ncss-stamped-radius` explizit auf den Wert der anderen Komponente setzen.

20. **Eine per `color-mix()` aus einem Seed-Wert ABGELEITETE Custom Property wird nur EINMAL
    berechnet (dort, wo sie deklariert ist), dann als fertiger Wert vererbt - ein tiefer im
    Baum überschriebener Seed-Wert lässt eine bereits vererbte Ableitung NICHT neu
    rechnen.** Ein lokal (nicht auf `:root`) angewendetes `theme.css`-Override
    (`demo/theming.html`) lässt Regeln, die den Seed-Wert direkt nutzen
    (`--ncss-color-brand`), korrekt reagieren, aber Regeln, die eine daraus abgeleitete
    Skala nutzen (`--ncss-color-brand-100`, per `color-mix()` in `colors.css` einmalig auf
    `:root` berechnet), bleiben bei der alten Farbe - der geerbte Wert hat den alten Seed
    bereits fest eingebacken. Nur ein echtes `theme.css` auf `:root` selbst berechnet die
    ganze abgeleitete Skala frisch. Für ein lokal begrenztes Theme, das auch abgeleitete
    Farben treffen soll, muss die komplette Skala (`-100`/`-300`/`-700`/`-900`/`-on-soft`)
    an derselben Stelle zusätzlich neu deklariert werden - kein automatischer Workaround.

21. **`backdrop-filter` (wie `filter`/`transform`/`perspective`/`will-change`) erzeugt per
    Spec einen NEUEN CONTAINING BLOCK für `position:fixed`-Nachfahren** - ein Floating-UI-
    Element (`<wa-dropdown>`/`<wa-popover>`, intern `position:fixed` relativ zum Viewport)
    als Nachfahre eines gefilterten Elements zuckt beim Scrollen. Fix: `.ncss-glass` NIE
    direkt auf ein Element mit `<wa-dropdown>`/`<wa-popover>`/`<dialog>` als Nachfahre
    setzen - stattdessen ein eigenes, rein dekoratives Element (absolut positioniert,
    `z-index:-1`) davor einfügen, das den Filter trägt, statt die Komponente selbst zu
    ändern (kollidiert sonst mit `.ncss-glow-border`, das ebenfalls `::before` braucht -
    ein Element hat nur eins).

    Auf echtem Safari trat dasselbe Zucken zusätzlich bei einem `<wa-popover>` OHNE jede
    Nähe zu `backdrop-filter` auf - der tatsächliche gemeinsame Nenner ist ein
    `position:sticky`-Header als Anker: Web Awesome hält ein offenes Panel absichtlich am
    Anker positioniert, kombiniert mit dem bekannten iOS-Safari-Bug bei Z-Index/
    `position:fixed` beim Scrollen ergibt das ein Engine-Rendering-Problem, kein
    ncss-CSS-Bug, also per CSS nicht behebbar. Tatsächlicher Fix: `components/
    wa-close-on-scroll.js` (opt-in) schließt jedes offene `<wa-dropdown>`/`<wa-popover>`
    sobald gescrollt wird (`el.open = false`) - umgeht das Rendering-Problem komplett,
    statt dagegen anzukämpfen. Eingebunden auf `demo/landing.html` und
    `demo/webawesome.html`.

22. **`getComputedStyle(el).getPropertyValue("--x")` liefert bei einem CUSTOM PROPERTY nur
    den roh gespeicherten Token-Text zurück, KEINE aufgelöste Farbe** - anders als beim
    Lesen einer echten Farb-Eigenschaft (`color`/`background-color`), die `var()` UND
    Funktionen wie `light-dark()` bereits fertig auflöst. `--ncss-color-brand: light-
    dark(#0057d8, #6ea8ff)` liefert wortwörtlich den String zurück, nicht die aktuell
    aktive Farbe - ein Regex, der daraus einen Hex-Wert extrahieren will (z.B. für die
    Vorbelegung eines `<input type="color">`, `demo/colors.html`), ergibt Zufallswerte.
    Fix: ein unsichtbares Sonden-Element (`display:none`) mit `el.style.color =
    "var(--x)"`, danach `getComputedStyle(el).color` lesen - erzwingt die tatsächliche
    Auflösung inkl. `light-dark()`, abhängig vom aktuell aktiven Theme. Gilt für jede
    Custom Property mit einer Farbfunktion (`light-dark()`, `color-mix()`).

23. **`flex-wrap: wrap` auf den KINDERN eines flex-Containers reicht nicht, wenn der
    CONTAINER SELBST ein `flex: 0 0 auto`-Kind eines äußeren Flex-Layouts ist** - ein
    solches Item bemisst seine Breite am Max-Content (so breit wie alle Kinder
    nebeneinander bräuchten); das interne `flex-wrap` der Kinder greift erst, wenn der
    Container selbst auf eine begrenzte Breite gezwungen ist, was `flex:0 0 auto` gerade
    verhindert. Fix: zusätzlich `flex: 1 1 100%` auf dem Container setzen, um ihn auf die
    volle verfügbare Zeile zu zwingen - erst innerhalb dieses Rahmens greift das
    `flex-wrap` der Kinder. Bei verschachtelten Flex-Strukturen immer prüfen, auf welcher
    Ebene `flex-wrap` tatsächlich wirken kann, statt es auf einen beliebigen Vorfahren zu
    setzen.

24. **Eine Produktseite mit kräftiger Markenfarbe als `--ncss-color-bg` (statt der
    üblichen fast-weißen Fläche) deckt Landminen auf, die eine gewöhnliche Demo-Seite nie
    berührt:**
    - Kontrast-Fixes nicht stärker als nötig ausfallen lassen (z.B. Hero/CTA per Scrim
      abdunkeln) - im Zweifel den User entscheiden lassen, ob die reine angefragte Farbe
      mit knapperer AA-Marge Vorrang hat.
    - Eine Komponente mit eigenem, undurchsichtigem `background-color` (z.B.
      `.ncss-topbar`) macht einen Glass-Backdrop-Trick dahinter wirkungslos, selbst wenn
      die z-index-Mechanik korrekt sitzt (Punkt 18) - die Eigenfläche muss zusätzlich
      explizit transparent gesetzt werden.
    - Ein Element, das für zwei Kontexte wiederverwendet wird (z.B. Desktop-Inline-Nav
      versus Mobile-Off-Canvas-Panel), braucht Farb-Overrides GENAU in derselben
      Breakpoint-Grenze wie die Komponente selbst - ein pauschaler Override ohne Media
      Query trifft auch den Kontext, für den er nie gedacht war.
    - `:hover`/`:focus-visible`-Zustände separat gegen den jeweiligen Hintergrund prüfen,
      nicht nur den Ruhezustand - ein Hover ändert oft die eigene Hintergrundfarbe,
      wodurch ein sonst korrekter Text-Override plötzlich unlesbar wird.
    - Ein `<ul>` mit eigenem `::before`-Aufzählungspunkt braucht trotzdem explizit
      `list-style:none` - base.css setzt das nur für `role="list"`.
    Übergreifende Lehre: bei einer neuen, farblich kräftigen Marke jede Kombination aus
    Text-Rolle und tatsächlichem Hintergrund (inkl. Hover-/Layout-Varianten) einzeln
    durchgehen, nicht nur die offensichtlichen Textblöcke - jede Kombination kann ihre
    eigene, unabhängige Bruchstelle haben.

25. **Seiteneigene, aber eigentlich allgemein nützliche Klassen gehören ins geteilte
    System, nicht in eine einzelne Seite** - beim Aufräumen einer neuen Produktseite
    zeigte sich: mehrere page-lokale Klassen duplizierten bereits Vorhandenes (`.ncss-
    badge` statt einer eigenen Pillen-Klasse) oder waren generalisierbar genug, um sie
    als echte Klassen ins System zu heben, z.B. `.ncss-badge-icon` (Icon-in-Kreis,
    components/badge.css), `.ncss-topbar--transparent` (macht die sonst opake Eigenfläche
    transparent, siehe Punkt 24), `.ncss-lead-quote` (derselbe Akzent-Rahmen wie
    `<blockquote>`, aber als Klasse für semantisch falsche Fälle), `.ncss-list--dot` (die
    `list-style:none`-Lehre aus Punkt 24 als wiederverwendbare Klasse). Nach der Promotion
    die page-lokalen CSS-Duplikate vollständig entfernt, nicht nur umbenannt - ein
    Duplikat, das zufällig identisch aussieht, ist trotzdem ein zweiter Ort, der bei der
    nächsten Änderung auseinanderlaufen kann. Bei jeder neuen Demo-/Produktseite prüfen,
    ob eine gerade erfundene Seiten-Klasse eigentlich ein fehlendes System-Teil ist.

26. **Ein CSS-only-Fallback-Versuch, verifiziert und wieder verworfen**: `.ncss-hide-on-
    scroll` (helpers/scroll.css) sollte um den älteren `@property` + `animation-timeline:
    scroll()`-Trick für Browser ohne `container-type: scroll-state` erweitert werden
    (Safari unterstützt `scroll()` bereits, Firefox nicht - ein Fallback hätte Safari
    also echten Mehrwert gebracht). Vollständig implementiert und in echtem
    Playwright-WebKit getestet: Scroll-runter funktionierte, Scroll-hoch NIE - der Header
    blieb dauerhaft versteckt. Ursache: eine `@property`-typisierte, mehrfach
    verschachtelte `calc()`-Kette löste in WebKit zu `0` auf, sobald sie in einem
    WEITEREN `calc()` konsumiert wurde, obwohl ihr eigener Text-Wert korrekt war - ein
    WebKit-Bug bei tief verschachtelten typisierten Custom-Property-Ketten. Ein Header,
    der sich versteckt, aber durch Hochscrollen nie wieder erreichbar wird, ist
    schlechter als kein Fallback - der komplette Block wurde entfernt, nicht nur
    deaktiviert. Lehre: "unterstützt der Browser die einzelnen Features" reicht bei tief
    verschachtelten Custom-Property-Ketten nicht - nur ein echter, mehrstufiger
    Interaktionstest (kontinuierliches Scrollen, nicht nur ein einzelner `wheel()`-Aufruf)
    deckt auf, ob die tatsächliche Zusammensetzung end-to-end funktioniert.

    Da CSS-only hier nicht ging, aber eine Lösung trotzdem gebraucht wurde:
    `components/hide-on-scroll-fallback.js` (opt-in, wie `wa-close-on-scroll.js`) - prüft
    sich selbst per `CSS.supports("container-type", "scroll-state")` und tut nichts, wenn
    die native Technik bereits greift, sonst ein `requestAnimationFrame`-gedrosselter
    Scroll-Listener, der dieselbe `translate`-Eigenschaft setzt. Dafür musste die
    `translate`/`transition`-Deklaration aus dem `@supports`-Block herausgezogen werden
    (jetzt unbedingt), sonst hätte das Skript den Wert ohne die weiche
    Übergangs-Animation gesetzt. Über mehrere Scroll-Zyklen in Chromium, WebKit und
    Firefox verifiziert, kein Hängenbleiben.

Viertes Beispiel, `.ncss-roadmap` (components/roadmap.css) - eine Meilenstein-Liste,
verbunden durch eine SVG-Linie, die sich beim Scrollen selbst "nachzeichnet" per
`animation-timeline: view()` (anonym, kein Pinning wie bei `scroll-stack.css` - der
natürliche Ein-/Austritts-Scrollweg der Linie IST bereits der gewünschte Zeichenweg).
Mehrere Kalibrierungs-Bugs dabei gefunden, am Ende komplett auf eine robustere Technik
umgestellt:

1) **`animation-range: cover` (Default) braucht Linienhöhe + Viewporthöhe Scrollweg NACH
   Erscheinen des Elements, um 100% zu erreichen** - reicht bei einem Element kurz vor dem
   Footer (üblich für Roadmap-/Timeline-Muster) oft nicht aus, die Linie blieb sichtbar
   unvollständig, obwohl die letzte Karte längst sichtbar war. Fix: `contain` statt
   `cover` - fertig gezeichnet, sobald die letzte Karte gerade voll sichtbar wird,
   unabhängig vom Rest-Scrollweg danach. Bei Elementen nahe dem Seitenende immer per
   echtem Scroll-bis-zum-Ende-Test prüfen, nicht annehmen.
2) **`ul`/`ol` erben per `base.css`-Default ein eigenes `padding-inline-start`** -
   `.ncss-roadmap-list` (ein `<ol>`) verschob dadurch jeden Listenpunkt zusätzlich zum
   eigenen Gutter-Versatz nach rechts, während die absolut zum äußeren Container
   positionierte Linie an ihrer korrekten Stelle blieb: Punkte lagen sichtbar neben statt
   auf der Linie. Fix: bei jeder Komponente, die `<ul>`/`<ol>` für freies Positionieren
   (nicht als Aufzählung) nutzt, explizit `padding-inline-start: 0` setzen.
3) **`pathLength` (Pfadlängen-Normierung für `stroke-dasharray`/`-dashoffset`) und
   `vector-effect: non-scaling-stroke` auf demselben `<line>` vertragen sich nicht** -
   `non-scaling-stroke` berechnet das gesamte Stroke-Rendering inkl. Dash-Muster in einem
   von der viewBox-Streckung entkoppelten Koordinatensystem, wodurch `stroke-dasharray:1`
   nicht als "gesamte Pfadlänge" interpretiert wird, sondern als kurzer, sich
   wiederholender Strich-Lücke-Zyklus - die Linie wirkte durchgehend unterbrochen statt
   sich einmal durchgängig nachzuzeichnen. Fix: `vector-effect: non-scaling-stroke`
   entfernt - für eine rein vertikale Linie (x1=x2) ist die Strichbreite ohnehin nur
   entlang der X-Achse relevant, die von `preserveAspectRatio="none"` gar nicht gestreckt
   wird, die Eigenschaft war also nicht einmal für ihren ursprünglichen Zweck nötig.
4) **Eine einfarbige Reveal-Linie ist optisch bedeutungslos** - der "noch nicht
   gezeichnete" Teil (Dash-Lücke) verschmilzt farblich mit dem Seitenhintergrund, der
   bereits gezeichnete Teil sieht wie eine gewöhnliche fertige Linie aus, der
   Scroll-Fortschritt bleibt unsichtbar. Ein technisch korrekt animierter Dashoffset
   reicht bei einem Reveal-Effekt nicht - der verborgene und der enthüllte Zustand müssen
   sich auch farblich unterscheiden. Fix: zwei `<line>`-Elemente - ein statischer, grauer
   `-track` plus eine markenfarbene `-progress`-Linie exakt darüber, nur die Progress-
   Linie bekommt `pathLength`/Dash-Animation. Ergebnis: ein klassisches
   Fortschrittsbalken-Muster, der Farbkontrast macht den Fortschritt sichtbar.
5) **`stroke-dashoffset` ist eine Paint-Eigenschaft, kein zuverlässiger Träger für eine
   scroll-getriebene Animation** - jede Wertänderung erzwingt ein echtes Neuzeichnen der
   SVG-Geometrie, anders als `transform`/`opacity`/`scale` (Compositor-Eigenschaften, ohne
   Repaint pro Frame interpolierbar). Auf echtem Safari (26.5.2) blieb der Effekt trotz
   vorhandenem `view()`-Support sichtbar hinter Chromium zurück. Fix: komplette Umstellung
   von SVG (`<line>` + `stroke-dasharray`/`-dashoffset`) auf zwei `<div>`s + `scale`
   (Y-Achse, `transform-origin: top`) - dieselbe Technik wie in `scroll-progress.css`
   (dort horizontal), nur gespiegelt; kein SVG/`pathLength`/`vector-effect` mehr nötig.
   Bei scroll-getriebenen Animationen immer zuerst prüfen, ob sich der Effekt über
   `transform`/`opacity`/`scale`/`filter` erreichen lässt, bevor eine Paint-Eigenschaft
   animiert wird. Feintuning-Falle danach: `animation-range: cover 0% contain 100%`
   (gemischte benannte Bereiche) sah bei EINER Viewport-Größe gleichmäßiger aus, brach
   aber bei anderen Verhältnissen von Roadmap- zu Viewport-Höhe komplett (Fortschritt lag
   bei Seitenaufruf schon zwischen 17% und 65% vorgezeichnet statt bei 0%) -
   unterschiedliche benannte Bereiche haben unterschiedliche, geometrieabhängige
   Referenz-Rahmen, das Mischen zweier ist NICHT robust über verschiedene Geometrien
   hinweg. Zurückgerollt auf reines `contain` (verlässlich, auch wenn das Pacing weniger
   gleichmäßig ist). Jede `animation-range`-Änderung immer über mehrere Viewport-Größen
   (Desktop breit/schmal + Mobile) prüfen, nicht nur eine.

27. **Web Awesome auf farbigen Flächen (`.ncss-surface--brand/-brand-2/-neutral`,
    `.ncss-gradient-brand`): `color:#fff` auf dem Light-DOM-Vorfahren reicht nicht, ein
    `<wa-input>`/`<wa-textarea>`/`<wa-select>`/`<wa-checkbox>`/`<wa-radio>`/`<wa-switch>`
    zeigt Label/Wert/Hinweistext trotzdem in Web Awesomes eigenem Standard-Textton.**
    Ursache: Label/Wert/Hinweistext werden im Shadow DOM der Komponente gerendert -
    `color:inherit` durchquert Shadow-DOM-Grenzen nicht. Ein naheliegender, aber falscher
    Fix ist, nur die Basis-Bridge-Tokens (`--wa-color-text-normal`/`-quiet`) auf der
    farbigen Fläche umzubiegen: eine Custom Property löst `var()`-Referenzen INNERHALB
    ihres eigenen Werts am Ort ihrer EIGENEN Deklaration auf (hier: einmalig an `:root`)
    und vererbt danach nur noch den fertigen, eingefrorenen Wert - Web Awesomes eigene
    abgeleitete Tokens (`--wa-form-control-label-color` usw., selbst `var(--wa-color-text-
    normal)`) sind davon bereits "eingefroren" und reagieren nicht mehr auf eine spätere
    Neu-Deklaration der Basis-Tokens. Echter Fix (webawesome-bridge.css):
    `--wa-form-control-label-color`/`-value-color`/`-hint-color`/`-required-content-color`
    DIREKT auf den farbigen Flächen-Klassen als `currentColor` deklarieren.

    Als Nebenprodukt: `.ncss-text-light`/`.ncss-text-dark` (+ `-100/-300/-700/-900`
    Deckkraft-Stufen) in `helpers/typography.css` - fest auf Weiß/Schwarz, unabhängig vom
    Theme, für Flächen, deren Farbe nicht über ncss-Tokens läuft (Foto, fester
    Marken-Ton). Als reine Deckkraft-Stufen VON Weiß/Schwarz umgesetzt
    (`color-mix(in srgb, #fff/#000 X%, transparent)`), nicht wie die normale
    Marken-Farbskala - Weiß/Schwarz sind bereits die hellst-/dunkelstmögliche Stufe.
    Funktioniert konfliktfrei auch innerhalb von `.ncss-scheme-dark`/`-light`, weil
    `color-scheme` nur steuert, wie `light-dark()`-Tokens auflösen, während
    `.ncss-text-light` `color` direkt mit einem festen Wert überschreibt. Demo:
    `demo/magazine.html`.

28. **`mix-blend-mode: overlay` (Default von `.ncss-grain`) verhält sich wie `multiply`
    auf dunklen und wie `screen` auf hellen Flächen** - auf einer sehr dunklen/gesättigten
    Fläche bleibt die Standard-Deckkraft dadurch praktisch unsichtbar, obwohl das Feature
    selbst korrekt rendert (per Pixel-Stichprobe/Standardabweichung quantifiziert, nicht
    nur Augenmaß: stddev ≈ 0.33 auf sehr dunkler Fläche vs. 1.0-1.75 auf mittelheller
    Fläche bei identischen Werten). Kein Bug im CSS selbst - `mix-blend-mode: overlay`
    verhält sich spezifikationsgemäß, nur die gewählte Demo-Hintergrundfarbe war der
    ungünstigste Fall für den Default-Blend-Modus. Fix nur in der Demo: die "Dezent"-Karte
    auf eine mittelhelle Fläche umgestellt (zeigt den echten Default ehrlich), die
    "Sandig"-Karte behält eine dunkle Fläche, aber mit höherer Opacity + `--ncss-grain-
    blend: soft-light` (auf dunklen Flächen zuverlässiger sichtbar als `overlay`). Bei
    "ist ein Effekt sichtbar?"-Prüfungen reicht Augenmaß bei geringem Kontrast nicht - eine
    Pixel-Stichprobe macht "unsichtbar" vs. "schwach aber vorhanden" messbar.

29. **Touch-Geräte lösen `:hover` nicht zuverlässig per Tap aus - ein Button/eine Karte,
    deren einzige Rückmeldung ein `:hover`-Zustand ist, wirkt auf Touch komplett tot.**
    `matchMedia('(hover: hover) and (pointer: fine)')` liefert auf Touch `false` - das
    Signal für das Fix-Muster. Betraf projektweit 27 `:hover`-Regeln über 11 Dateien,
    jede jetzt in `@media (hover: hover) and (pointer: fine) { ... }` gewrappt. Zwei
    Fallstricke beim Umsetzen:
    - Regeln mit gemeinsamem Selektor `a:hover, a:focus-visible { ... }` dürfen nicht
      blind komplett gewrappt werden - `:focus-visible` (Tastatur-Fokus) gilt unabhängig
      vom Zeigegerät und darf nicht mit-gated werden. Selektoren aufteilen: nur `:hover`
      wandert in die Media Query.
    - `.ncss-btn` hatte vor diesem Fix gar keinen `:active`-Zustand - auf Touch also
      buchstäblich keine Rückmeldung beim Tippen. Ergänzt: `.ncss-btn:active:not(:disabled)
      { scale: 0.97; }` auf der Basis-Klasse. `scale` (eigenständige Property statt
      `transform: scale()`) gewählt, damit es sich mit `.ncss-stamped`s `transform:
      translateY(...)` überlagert statt es zu überschreiben. `.ncss-press`
      (helpers/animations.css) hatte dieses Muster (`:active` statt `:hover`) bereits für
      eigene Elemente - die Lehre war im Projekt schon vorhanden, nur nicht überall
      angewendet.

    Erste Fassung war zu schwach: `scale: 0.97` allein kam bei einem realistischen, kurzen
    Tap oft nicht sichtbar an, weil die normale Übergangsdauer (200ms) einen ~100-150ms
    kurzen Tap oft nicht mehr vollständig durchläuft, UND weil die farbliche Rückmeldung
    (das auffälligste Signal) komplett hinter der `hover:hover`-Media-Query versteckt war.
    Fix: eigener, schnellerer Token nur für den Einstieg in `:active` (normale Dauer bleibt
    beim Loslassen), `scale` verstärkt auf 0.95, UND pro Button-Variante eine echte
    `:active`-Farbänderung ergänzt (nicht nur unter der hover-Media-Query).

    Zusätzlicher Desktop-Bug beim Verifizieren gefunden: eine gehaltene Maustaste erfüllt
    `:hover` UND `:active` gleichzeitig - bei gleicher Spezifität gewinnt die im Quelltext
    spätere Regel, wodurch `:hover` (später im Quelltext) gegen `:active` gewann und der
    Button beim Gedrückthalten sichtbar "angehoben" statt "eingesunken" blieb. Fix:
    `:hover:not(:active)` statt nur `:hover`, damit `:active` unbedingt gewinnt, sobald es
    zutrifft.

30. **`100vh`/`height: 100%` entsprechen auf Mobil-Browsern der GRÖSSTEN möglichen Höhe
    (Adressleiste ausgeblendet) - ist die Adressleiste sichtbar, ragt ein 100vh-Element
    über den tatsächlich sichtbaren Bereich hinaus.** Betraf mehrere Dateien
    (`tokens.css`, `modal.css`, `off-canvas.css`, `scroll-stack.css`); `reset.css`/
    `helpers/layout.css` hatten das Problem bereits vorher korrekt gelöst (`100svh`) - das
    richtige Muster existierte im Projekt schon, nur nicht überall konsequent angewendet.
    Drei moderne Viewport-Einheiten für drei verschiedene Situationen, NICHT austauschbar:
    - `svh` (kleinstmöglicher Wert) für alles, was GARANTIERT ohne Scrollen komplett
      sichtbar bleiben muss (Modal, Off-Canvas, Sticky-Container) - mit `vh` als
      Fallback-Deklaration davor für ältere Browser (zweite gültige Deklaration gewinnt,
      kein `@supports` nötig).
    - `dvh` (lebt live mit dem Adressleisten-Zustand mit) - nur dort, wo bereits
      vorhanden, nicht neu übernehmen, wo bereits fein kalibriertes Scroll-Timing existiert
      (siehe nächster Punkt).
    - `lvh` (identisch zum klassischen `vh`-Verhalten - stabil, ändert sich nicht während
      des Scrollens) für `scroll-stack.css`s Bühnenhöhe-Default, bewusst nicht `dvh`: die
      Bühnenhöhe fließt direkt in `view-timeline-inset` und die Off-Stage-Position der
      Karten ein - eine mitten im Scrollen wachsende/schrumpfende Bühnenhöhe (genau das,
      was `dvh` bei ein-/ausblendender Adressleiste tut) hätte das bereits fein
      kalibrierte Timing durcheinandergebracht. `lvh` behält das alte, funktionierende
      Verhalten unter einem absichtlichen statt zufälligen Namen.

31. **Formular-Feldtypen-Audit** - `helpers/forms.css` deckte vorher nur text/select/
    textarea/checkbox/radio/switch/range ab, mit Lücken bei `type="file"`/`"color"`/
    `"date"`-Familie/`"search"` sowie `<fieldset>`/`<legend>`/`<progress>`/`<meter>`/
    `<output>`. `<input type="file">` hat den größten Cross-Browser-Unterschied
    (Chrome/Edge/Safari: eigener Button + Dateiname im Feld; Firefox: eigener Button-Text)
    - `::file-selector-button` + `::-webkit-file-upload-button` bringen den Button auf
    `.ncss-btn--secondary`-Optik. Zwei Erkenntnisse beim Verifizieren:
    - Die Kalender-/Uhr-Icons der date/time-Familie brauchen KEINE manuelle
      Dark-Mode-Anpassung - `color-scheme: light dark` (bereits auf `:root` gesetzt)
      sorgt bereits dafür, dass Chromium/Safari das passende System-Icon zeichnen.
    - `<meter>` respektiert `accent-color` NICHT für seine Grün/Gelb/Rot-Bewertungsfarbe
      (bleibt grün) - bewusst NICHT per `::-webkit-meter-*` erzwungen, das ist die
      eigentliche Funktion von `<meter>` (zeigt an, ob ein Wert im guten/kritischen
      Bereich liegt). `<progress>` (kein Wertungs-Konzept) respektiert `accent-color`
      vollständig und ist die richtige Wahl, wenn nur Markenfarbe gewünscht ist.
    `<input type="search">` braucht `appearance: none` (sonst rundet Safari es eigenmächtig
    komplett ab). `<input type="number">`s Spinner-Pfeile bewusst NICHT versteckt - echte
    native Funktionalität ohne Anlass zu entfernen widerspricht dem Projekt-Grundprinzip.

    **Nachtrag**: `.ncss-input[type="color"]` hatte keine eigene `height` - anders als
    Text-Inputs (Höhe ergibt sich dort aus Zeilenhöhe + Padding + Rahmen) bemisst jeder
    Browser die Swatch-Fläche nach einer eigenen Formel; betraf alle drei Engines
    unterschiedlich stark (WebKit am extremsten, nur ein schmaler Strich statt der vollen
    Feldhöhe). Fix: `height: calc(1lh + 2 * var(--ncss-space-2xs) + 2 * var(--ncss-border-
    width));` - dieselbe Formel, die ein normales `.ncss-input` implizit über sein
    Boxmodell erreicht, hier explizit nachgebaut (`1lh` bleibt korrekt, auch wenn
    Schriftgröße/Zeilenhöhe sich künftig ändern).

32. **`components/scroll-stack-fallback.js` - eigene JS-Nachbildung von
    `animation-timeline`/`view-timeline-inset`/`animation-range` für Firefox/älteres
    Safari, per `getBoundingClientRect()` statt echter Scroll-Timeline berechnet.** Der
    naheliegende erste Ansatz (0% bei `rect.top === 0`, 100% bei `rect.bottom ===
    stageHeight`) bestand den ersten Test nur zufällig: in der geprüften Vollbild-Variante
    ist die Bühnenhöhe selbst `100lvh`, identisch zum fest codierten Inset-Wert. Erst der
    Test einer kleineren Bühne (deutlich kleiner als die Viewport-Höhe) deckte den echten
    Fehler auf. Ursache: der erste `view-timeline-inset`-Wert (hier immer `100lvh`,
    unabhängig von der Bühnengröße) verschiebt den 0%-Bezugspunkt IMMER um die volle
    Viewport-Höhe, nicht um die Bühnenhöhe - der korrekte 0%-Punkt liegt bei `rect.top ===
    viewportHeight - stageHeight` (reduziert sich nur zufällig auf `0`, wenn Bühnenhöhe ==
    Viewport-Höhe). Fix: `progress = clamp((vh - stageHeightPx - rect.top) /
    totalDistance, 0, 1)` statt der ursprünglichen `-rect.top / totalDistance`. Nach dem
    Fix gegen alle drei Struktur-Varianten (Vollbild, horizontal, kleine Bühne)
    gegengeprüft, nicht nur die ursprünglich getestete.

    Lehre beim Testaufbau selbst: `window.scrollTo({behavior:'smooth'})` löst eine
    asynchrone, mehrere hundert Millisekunden dauernde Scroll-Animation aus - ein
    Vergleichslauf mit zu kurzer Wartezeit danach misst scheinbare Berechnungsfehler, die
    tatsächlich nur unvollständig gescrollte Zwischenzustände sind. `{behavior: 'instant'}`
    + Polling auf eine stabile `scrollY` (statt fester Wartezeit) liefert einen sauberen
    Vergleich - bevor ein Berechnungsfehler diagnostiziert wird, erst prüfen, ob der
    Scroll-Vorgang im Testaufbau überhaupt schon abgeschlossen ist. Demo:
    `demo/stacked-cards.html`, `demo/product.html`.

33. **`demo/colors.html`s Live-Farbeditor setzte ursprünglich einen einzelnen festen
    Hex-Wert statt eines echten `light-dark()`-Paars - Light UND Dark zeigten während der
    Bearbeitung dieselbe Farbe.** Fix: zwei getrennte JS-Objekte (`lightValues`/
    `darkValues`) statt eines einzelnen Hex-Strings pro Token, ein Umschalter im Modal
    wählt, welche Hälfte die Regler zeigen. Für die Vorbelegung beider Hälften reicht das
    Sonden-Element-Muster (Punkt 22) allein nicht, es liest nur die aktuell aktive
    Variante - zusätzlich `color-scheme` direkt auf demselben Sonden-Element gesetzt
    (nicht nur `color`) erzwingt gezielt Light oder Dark für diese Auflösung, unabhängig
    vom Seiten-Theme. `color-scheme` und `color` müssen dafür BEIDE auf demselben Element
    gesetzt werden - `color-scheme` kann einen bereits geerbten, fertig aufgelösten
    `color`-Wert nicht rückwirkend ändern.

34. **Die "Vollbild"-Variante von `.ncss-stack-section` behält ohne weiteres Zutun
    `.ncss-stack-card`s Default-`border-radius`** - sichtbar als abgerundete Ecke genau an
    der Bildschirmkante statt eines sauberen Vollbilds. Fix: zusätzlich
    `--ncss-stack-radius: 0` in derselben Inline-Style-Liste auf der Sektion setzen
    (vererbt sich normal an die Karten). NICHT generell in `scroll-stack.css` behoben
    (z.B. "radius:0, sobald card-width:100%") - dieselbe Breiteneinstellung wird auch von
    einer "in einem normalen Container"-Demo verwendet, wo abgerundete Ecken weiterhin
    gewünscht sind. Bleibt bewusst eine Pro-Instanz-Entscheidung über den bereits
    vorhandenen `--ncss-stack-radius`-Override-Token, kein automatisches
    Komponenten-Verhalten.

35. **Doku-Website (`docs-src/` → generiert `docs/`)** - Sidebar-navigierte,
    zweisprachige (DE/EN) Doku-Website, gebaut mit einem handgerollten `node:fs`/
    `node:path`-Skript (`docs-src/build.mjs`, kein npm/Bundler/Markdown-Parser). Bewusste
    Ausnahme vom "kein Build-Schritt"-Prinzip: gilt für die CSS-Bibliothek, nicht für das
    Tooling der Doku-Website selbst. Zentrale Lektionen:
    - **Aktiver Nav-Zustand gehört als allgemeine Regel in die Komponente, nicht als
      seitenlokales CSS** - `aria-current="page"` ist der native, semantisch korrekte
      Mechanismus dafür, jetzt allgemein in `components/nav.css` gestylt, nicht nur in der
      Doku-Website verwendet.
    - **Ein blanker Such-/Ersetz-Migrationsscript über viele strukturell ähnliche Dateien
      muss vorher auf Dateien mit abweichender Struktur geprüft werden**, bevor er
      destruktiv läuft. Eine Nav-Vereinheitlichung per Regex über 14 Demo-Seiten überschrieb
      bei der einen Seite mit einer abweichenden `<wa-dropdown>`-basierten Nav samt eigenem
      Event-Handler die vom Script benötigte `id` - Ergebnis: ein JS-Fehler auf jedem
      Seitenaufruf, unsichtbar im reinen Diff- oder Screenshot-Vergleich, erst ein voller
      Regressionslauf mit `pageerror`-Listener deckte es auf. Nach jeder Mehrdateien-
      Migration gezielt auf seiten-untypische Muster durchsuchen UND den vollen
      Regressionslauf fahren.
    - **Regex mit Lookahead, um den richtigen schließenden Tag bei verschachtelten
      gleichnamigen Strukturen zu treffen**: ein lazy Match ohne Lookahead matcht bei
      verschachtelten Listen fälschlich das erste, innere Schluss-Tag statt des äußeren.
      Vor einem destruktiven Mehrdateien-Lauf immer per Dry-Run an einer echten Datei
      verifizieren, nicht nur am Muster ablesen.

36. **Code-Block-Syntax-Highlighting (`components/code-block.css`/`.js`)** - selbst
    gehostetes Prism.js statt eigenem Tokenizer. Prisms eigener `DOMContentLoaded`-
    Autostart muss VOR dem Laden von `prism-core.min.js` unterdrückt werden
    (`window.Prism = { manual: true }` als eigenes Script davor) - sonst highlightet Prism
    bereits selbst, bevor `code-block.js` seinen Copy-Button einfügen kann, und der eigene
    `Prism.highlightAll()`-Aufruf findet keine rohen `<code>`-Blöcke mehr vor (Timing-
    Falle, nicht offensichtlich aus der Prism-Doku). Kein Stock-Prism-Theme verwendet -
    Prisms `.token.*`-Klassen direkt auf ncss-Farbtokens gebridged (dieselbe
    Bridging-Technik wie `webawesome-bridge.css`), Highlighting zieht dadurch automatisch
    mit `theme.css` um. Copy-Button kopiert `codeEl.textContent`, nicht `innerHTML` - das
    würde Prisms Highlighting-Markup mitkopieren.

37. **Termine/Downloads-Widgets (`components/ics.js`/`events.js`/`downloads.js`)** - EIN
    Lade-/Render-Motor (`events.js`) für vier Ansichten (Kalender/Kalender-Liste/
    Termin-Liste/Einzeltermin) statt vier getrennter Komponenten, mit bereits vorhandenen
    Komponenten (`.ncss-modal`, `.ncss-card`) statt eigener Parallel-Optik. "wa-kompatibel"
    heißt optisch/token-kompatibel (native HTML + ncss-Klassen), NICHT echte `<wa-*>`-
    Custom-Elements - verletzt sonst das Grundprinzip "Web Awesome nie fürs strukturelle
    Seitengerüst" und bräuchte einen HTTP-Server statt offline/`file://` nutzbar zu
    bleiben.
    - **Eigener ICS-Parser (`ics.js`) statt Vendor-Bibliothek** - RFC-5545-Umfang bewusst
      auf das beschränkt, was ein Termin-Widget wirklich braucht. Vor dem Einbau isoliert
      gegen eine eigene Testsuite geprüft (einfacher/ganztägiger Termin, Zeilen-Folding,
      `WEEKLY`+`BYDAY`, `DAILY`+`UNTIL`, `MONTHLY`+`EXDATE`, kombiniertes `INTERVAL`+
      `BYDAY`) - Kalenderarithmetik ist eine Fehlerklasse, bei der "sieht im Browser
      plausibel aus" nichts über Korrektheit aussagt.
    - **RFC-5545-Zeilen-Unfolding**: eine Fold-Stelle braucht genau EIN Whitespace-Zeichen
      direkt nach dem CRLF als Marker, das beim Unfolding immer entfernt wird - ein
      zusätzliches Leerzeichen für den Wortzwischenraum muss vor dem CRLF stehen, nicht
      danach. Beim Verifizieren einer Spec-Implementierung mit eigenen Testfixtures immer
      auch die Fixture-Erwartung selbst gegen die Spec prüfen, nicht nur den Code.
    - **`WEEKLY`+`BYDAY`-Expansion läuft Woche-für-Woche, nicht Tag-für-Tag** - die Woche
      ist die natürliche Schrittweite von `RRULE INTERVAL` bei `FREQ=WEEKLY`: `INTERVAL`
      steuert, wie viele Wochen zwischen betrachteten Wochen liegen, `BYDAY` nur, welche
      Tage innerhalb einer Woche zählen. Diese Trennung vermeidet Sonderfall-Logik
      strukturell, statt eine Tag-für-Tag-Iteration nachträglich zu flicken.
    - **`.ncss-btn--sm` existiert nicht** - `.ncss-btn` hat keine Größen-Modifier (anders
      als Card/Badge, die Farbvarianten haben). Vor dem Verwenden einer vermuteten
      Modifier-Klasse per `grep` prüfen, ob sie existiert. Statt spekulativ eine neue
      globale Utility anzulegen: kleinere Button-Größe komponenten-lokal gelöst, kein
      neuer globaler Modifier.
    - **Wochenstart im Monatsraster war hartkodiert auf Sonntag** (`firstOfMonth.getDay()`
      direkt als Versatz - JS' `Date`-API folgt der US-Konvention). Für ein
      zweisprachiges Widget reicht "einmal die Spec nachlesen" nicht - jede
      locale-abhängige Konvention (Wochenstart, Datumsformat, ...) muss aktiv geprüft
      werden, nicht nur die Übersetzung sichtbarer Strings. Fix: Wochenstart per
      `lang`-Attribut (de: Montag, en: Sonntag), zusätzlich per `data-week-start`
      explizit überschreibbar; `startOffset`-Berechnung auf modulare Rotation
      (`(firstOfMonth.getDay() - weekStart + 7) % 7`) geändert. Die Wochentag-Kopfzeile
      muss um denselben Versatz rotiert werden - beide Stellen müssen synchron bleiben.

38. **`<ncss-container>` (`components/ncss-container.js`)** - Shadow-DOM-Kapselung für
    ncss-Inhalte innerhalb einer fremden Seite. Zwei nicht offensichtliche Fallen, beide
    hätten bei bloßem "sollte funktionieren"-Vertrauen eine leck geschlagene Isolation
    ergeben:
    - **`:root` trifft NIEMALS einen Shadow Host, egal wo die Stylesheet-Datei geladen
      wird.** ncss' komplettes Token-System hängt an `:root { --ncss-color-brand: ... }` -
      unverändert in einem Shadow Root geladen, würde `:root` weiterhin nur das echte
      Seiten-Wurzelelement treffen, nicht den Shadow-Host-Knoten - alle `var(--ncss-*)` im
      Container lösen sich zu nichts auf (kein Fehler, einfach unstyled). Fix: jede
      `:root`-Deklaration in den Token-Dateien zu `:root, :host` erweitert - `:host`
      matcht nur innerhalb eines Shadow Trees, außerhalb jeder Shadow-DOM-Nutzung
      vollständig wirkungslos. Dieselbe Erweiterung auf `body { ... }` in base.css
      angewendet - ein Shadow Root hat kein eigenes `<body>`, `:host` ist dort das
      Äquivalent.
    - **`<slot>` reicht NICHT für echte Stil-Isolation - nur tatsächlich in den Shadow
      Root VERSCHOBENE Elemente sind vor äußerem CSS geschützt.** `<slot>`-zugewiesene
      Elemente bleiben technisch Teil des Light DOM (nur ihre Rendering-Position wandert
      in den Shadow Tree) und werden weiterhin von globalen Stylesheets der äußeren Seite
      getroffen, inkl. `!important`-Regeln - genau der Leck-Fall, den die Komponente
      verhindern soll. Fix: `connectedCallback()` verschiebt `this.firstChild` iterativ
      per `appendChild` in einen Wrapper innerhalb des Shadow Roots (kein `<slot>`) -
      echte Shadow-Tree-Nachfahren sind laut Spec vollständig vor äußerem CSS geschützt,
      bloß durchgereichte "slotted" Elemente nicht. Kehrseite in Kauf genommen: kein
      automatisches Nachziehen bei späteren dynamischen Änderungen am umgezogenen
      Original-Markup - für einen statischen Inhaltsblock kein praktischer Nachteil.

    Bidirektional getestet (`demo/uikit-integration.html`, self-hosted UIkit 3): UIkits
    eigener Reset erreicht den Container nicht (siehe oben), UND ncss' eigener Reset
    beeinflusst UIkit-Elemente außerhalb des Containers nicht. Scroll-gekoppelte Effekte
    (`position:sticky`, `animation-timeline: view()`) funktionieren normal über die
    Shadow-Grenze - reine Rendering-Mechanik der Engine, von der Style-Kapselung
    unberührt.
    - **Opt-in-Scripts mit `document.querySelectorAll(...)` finden nichts innerhalb
      eines `<ncss-container>`** (Shadow-DOM-Grenzen werden davon nicht durchquert) -
      betraf `code-block.js`, `downloads.js`, `events.js`, `scroll-stack-fallback.js`,
      `hide-on-scroll-fallback.js`, `wa-close-on-scroll.js` (`grep -rln
      'document.querySelectorAll' components/*.js` deckt alle sechs auf einmal auf). Fix:
      `deepQueryAll(selector, root)` (rekursiver Abstieg in jeden offenen Shadow Root über
      `.shadowRoot`) in jedes der fünf init-once-Scripts kopiert statt in eine gemeinsame
      Datei ausgelagert (jedes opt-in Script bleibt einzeln einbindbar). `code-block.js`
      zusätzlich von `Prism.highlightAll()` auf `Prism.highlightElement()` PRO Block
      umgestellt (Prisms eigener globaler Aufruf hätte dieselbe Lücke gehabt).
      `wa-close-on-scroll.js` läuft bei JEDEM Scroll-Event statt einmalig - dort gezielt
      nur `<ncss-container>`-Elemente durchsucht statt eines vollen DOM-Walks
      (Performance), dabei auch den bisher ungedrosselten Scroll-Listener auf
      `requestAnimationFrame` umgestellt.

39. **Viele bereits vorhandene `<pre><code>`-Beispiele (7 Doku-Seiten + `demo/product.html`,
    die eigentliche Startseite) hatten `<pre><code>` OHNE `class="language-*"`** - Prism
    tokenisiert nur, wenn diese Klasse vorhanden ist, und `code-block.js`s eigener
    `deepQueryAll`-Selektor (`pre > code[class*="language-"]`) findet ohne sie auch den
    Copy-Button-Slot nicht - beides lief also seit dem Bau der Highlighting-Funktion
    unbemerkt leer auf diesen Seiten. Fund kam nicht durch eigenes Nachprüfen, sondern
    durch eine gezielte User-Nachfrage zu einem völlig anderen Feature (Input-Group) -
    `grep -rl '<pre[^>]*><code>' docs-src/content demo` (ohne nachfolgendes
    `class="language-`) deckte den vollen Umfang auf einmal auf. `demo/product.html` hatte
    zusätzlich noch gar keine Prism-`<script>`-Tags geladen. Lehre: nach dem Bau einer
    seitenübergreifenden Funktion (hier: Syntax-Highlighting) einmal GEZIELT über den
    gesamten Bestand grep-prüfen, ob sie überall greift, statt nur die neu hinzugefügten
    Stellen zu verifizieren - eine Funktion, die auf NEUEN Seiten korrekt funktioniert,
    kann auf ÄLTEREN, vor ihrem Bau entstandenen Seiten trotzdem lückenhaft bleiben.
    Zusätzlicher Fund beim Fixen: der reguläre Prism-Farbsatz (code-block.css, auf die
    normale `--ncss-color-bg` kalibriert) hatte auf `product.html`s dunkelblau-
    transluzentem Hero-Code-Block zu wenig Kontrast (Grün-auf-Blau kaum lesbar, per
    Screenshot bestätigt) - eigene, seiten-lokale `.token.*`-Farbüberschreibung nur für
    diesen einen Block ergänzt, statt die globale Palette anzufassen.

40. **`components/input-group.css`** - mehrere Formular-Steuerelemente visuell zu EINER
    Einheit verschmolzen (Feld+Button, Felder nebeneinander wie Vorname/Nachname):
    geteilte Rahmenlinie statt Lücke (`margin-inline-start: calc(-1 * var(--ncss-border-
    width))` auf allen Kindern außer dem ersten, exakt passend, weil `.ncss-input`/
    `.ncss-btn` dieselbe `--ncss-border-width` für ihren eigenen Rahmen verwenden), nur
    die äußeren Ecken rund (`:first-child`/`:last-child`), fokussiertes Kind per
    `position:relative; z-index:1` vor den überlappenden Nachbar-Rahmen gehoben (sonst
    schneidet der Nachbar den Fokusring sichtbar an). User bat explizit um einen
    ANDEREN Namen als "Form-Group" - zu leicht mit der bereits bestehenden
    `<fieldset>`/`<legend>`-Gruppierung (Semantik, kein visuelles Verschmelzen) zu
    verwechseln. "Input Group" (aus anderen CSS-Frameworks etabliert) trifft den
    tatsächlichen Charakter (rein optisch) präziser. Bewusst NUR `.ncss-input`/
    `-textarea`/`.ncss-btn` als direkte Kinder unterstützt - `.ncss-select-wrapper`
    NICHT (dessen sichtbarer Rahmen sitzt am inneren `<select>`, nicht am Wrapper selbst,
    bräuchte eigene Verschachtelungsregeln) - kein konkreter Bedarf dafür in den beiden
    vom User genannten Fällen, bei Bedarf ergänzen statt vorsorglich mitbauen.
    - **Erste eigene Demo-/Doku-Beispiele hatten KEIN Label, nur `placeholder`** - vom
      User selbst nachträglich als a11y-Lücke aufgezeigt. `placeholder` ist kein
      Label-Ersatz (verschwindet bei Eingabe, nicht zuverlässig als Feldname
      angekündigt). Beim Nachbessern zusätzlich einen ECHTEN, selbst gebauten Bug
      vermieden statt begangen: ein `<label class="ncss-visually-hidden">` ALS KIND von
      `.ncss-input-group` gesetzt hätte fälschlich als `:first-child` gezählt (CSS
      `:first-child` ist strukturell, zählt JEDES Element-Kind unabhängig von
      `display`/Sichtbarkeit) - die Eckenrundung wäre auf das unsichtbare Label
      gewandert statt auf das erste echte Feld. Fix: Label als GESCHWISTER-Element VOR
      der `.ncss-input-group` (nicht als Kind hinein) - `<label for="...">` verknüpft
      sich unabhängig von der DOM-Position, keine CSS-Änderung an input-group.css nötig.
      Für mehrere direkt verschmolzene Felder OHNE Platz für ein Sibling-Label je Feld
      (Vorname/Nachname): `aria-label` direkt am `<input>` statt eines echten
      `<label>`-Elements - verändert die Kind-Struktur der Gruppe gar nicht erst, kein
      Risiko für dieselbe `:first-child`-Falle. Erster eigener Entwurf für DIESEN Fall
      wickelte jedes `<input>` fälschlich in ein eigenes `.ncss-field` (üblicher
      Label+Input-Wrapper) - hätte `.ncss-input-group > .ncss-input` komplett
      wirkungslos gemacht (direkte Kinder wären dann `.ncss-field`-Divs, keine
      `.ncss-input`-Elemente mehr), noch vor dem Testen selbst bemerkt und korrigiert.

41. **`components/combobox.js`/`.css` - `<datalist>`- und `<select>`-Popups sind in
    keinem Browser per CSS stylebar (per WebSearch bestätigt, Stand 2026), reines CSS
    kann diese Lücke strukturell nicht schließen.** Für `<select>` gibt es inzwischen
    `appearance: base-select` (Chrome/Edge 135+, Safari 26+, bereits in `select.css`
    genutzt), für `<datalist>` keinen CSS-Weg. Ein einziges opt-in Script deckt beide
    Fälle über dieselbe Dropdown-/Tastatur-Mechanik ab (gemeinsame `createDropdown()`-
    Hilfsfunktion, nur Optionsquelle und Select-Callback unterscheiden sich):
    - **`<input list>` + `<datalist>`**: `list`-Attribut wird per JS entfernt (verhindert
      ein doppeltes - natives UND custom - Popup gleichzeitig), Optionen aus dem
      `<datalist>` in eine eigene, gestylte `<ul role="listbox">` gerendert, gefiltert
      per Tippen. Ohne JS bleibt die native Basisversion (Attribut unangetastet) voll
      funktionsfähig - reine progressive Enhancement.
    - **`<select>`**: NUR aktiv, wenn `CSS.supports("appearance", "base-select")` false
      ist (sonst liefert die native Technik bereits ein gestyltes Popup - kein doppelt
      arbeitender Mechanismus, dasselbe Prinzip wie bei allen anderen opt-in Fallback-
      Scripts in diesem Projekt). Natives `<select>` bleibt als Werthalter im DOM
      (`aria-hidden="true"`, unsichtbar per Position/Opacity/1px-Größe statt `display:
      none` - verhindert, dass der Browser es aus dem Fokus-Handling wirft), ein neuer
      `<button role="combobox">` übernimmt Anzeige/Fokus/Tastatur, synct seinen Text UND
      den `.value` des echten `<select>` bei jeder Auswahl zurück (WAI-ARIA "Select-Only
      Combobox"-Muster). Per echtem Test in Playwright-Firefox bestätigt (dort KEIN
      `base-select`): Enhancement greift, Dropdown zeigt alle Optionen inkl.
      `aria-selected`-Hervorhebung, Klick- UND Tastaturauswahl synct den echten
      `<select>`-Wert korrekt zurück. Per echtem Test in Chromium/WebKit bestätigt (dort
      IST `base-select` verfügbar): Enhancement bleibt korrekt INAKTIV, `data-ncss-
      combobox` wird nicht gesetzt - kein Doppel-Popup, kein Konflikt mit der bereits
      funktionierenden nativen Lösung.
    - Erster ArrowDown bei geschlossenem Dropdown ÖFFNET nur (bewegt noch keinen
      aktiven Eintrag) - Standard-Combobox-Konvention, kein Bug (beim eigenen Testen
      zunächst fälschlich als Fehler eingeordnet, bis der zweite ArrowDown + Enter im
      selben Testlauf die Auswahl korrekt bestätigte).

42. **`<option>` darf mit `appearance: base-select` beliebige Kind-Elemente enthalten
    (Icon+Label, nicht nur Text)** - per WebSearch + WebKit-Blogpost ("The Golden Rule
    of Customizable Select") verifiziert statt aus dem Training geraten, da neu/selten
    genug für eine echte Wissenslücke. Ein optionaler `<button><selectedcontent>
    </selectedcontent></button>` als erstes Kind von `<select>` steuert zusätzlich, wie
    die Auswahl im GESCHLOSSENEN Zustand angezeigt wird - ohne dieses Markup rendert der
    Browser selbst einen passenden Text-Button (bereits vorher funktionierend, kein
    Bruch). Golden Rule: Text bleibt PFLICHT (sichtbar oder `.ncss-visually-hidden`),
    Icons sind eine Ergänzung, nie ein Ersatz - sonst fehlt der Wert in der
    Barrierefreiheits-Struktur.
    - **Der JS-Fallback (`combobox.js`, Fallstrick 41) hätte reiche Options-Inhalte
      ohne Nacharbeit zu einem einzigen zusammengequetschten Text-String verflacht**
      (`opt.textContent.trim()` fasst ALLE Text-Knoten JEDER Tiefe zusammen, z.B.
      `<option><span>🍎</span><span>Apfel</span></option>` → `"🍎Apfel"` als eine
      Zeichenkette statt zwei separat gestylter Elemente) - erst durch expliziten
      User-Hinweis entdeckt ("für browser die es nicht können fallback anbieten"),
      nicht selbst beim Bauen der Rich-Content-Unterstützung mitbedacht. Fix: `render()`
      und `syncTrigger()` in `combobox.js` klonen jetzt die ECHTEN Kind-Elemente der
      `<option>` (`item.node.childNodes[i].cloneNode(true)`) in die custom `<li>`/den
      Trigger-Button, statt nur `label` (reiner Text) zu verwenden - reine Text-Optionen
      (unverändert die Mehrheit) fallen weiterhin auf `textContent` zurück. Lehre: eine
      neue Fähigkeit, die auf ZWEI Pfaden ausgeliefert wird (hier: nativ per CSS UND
      JS-Fallback für Browser ohne Unterstützung), muss auf BEIDEN Pfaden dieselbe
      Fähigkeit tragen - sonst ist der Fallback nur scheinbar gleichwertig.

43. **`.ncss-dialog-close` ist `position:absolute` und reserviert keinen Platz** -
    eine Überschrift direkt im Panel-Inhalt (Modal ODER Off-Canvas) kollidiert damit
    sichtbar mit dem Button. `.ncss-modal-header` löst das bereits über
    `padding-inline-end`; `off-canvas.css` hatte keine Entsprechung. Fix: neue Klasse
    `.ncss-offcanvas-header` (gleiches Rezept) - bei eigener Überschrift im
    Panel-Inhalt verwenden, nicht nacktes `<h3>`/`.ncss-stack`.

44. **`.ncss-radius-adaptive-sm/-md/-lg`** (`helpers/elevation.css` + `tokens.css`'
    `--ncss-radius-adaptive-*`) - klassischer "Conditional Border Radius"-Trick
    (`max(0px, min(RADIUS, calc((100vw - 16px - 100%) * 999)))`): rundet nur ab, solange
    das Element NICHT beide Bildschirmränder gleichzeitig berührt, sonst automatisch 0 -
    kein `@media`/JS nötig. Bezieht sich auf den echten VIEWPORT, nicht den eigenen
    Container - hilft nicht innerhalb eines schmaleren, selbst scrollenden Bereichs. Für
    Komponenten mit eigenem Radius-Escape-Hatch (z.B. `.ncss-stack-card`'s
    `--ncss-stack-radius`) `var(--ncss-radius-adaptive-lg)` direkt als Wert setzen statt
    der Utility-Klasse - die Klasse selbst würde von `.ncss-stack-card`s eigener
    `border-radius`-Regel überschrieben (components-Layer schlägt helpers-Layer, siehe
    Layer-Reihenfolge oben). Verifiziert per Playwright in Chromium/WebKit/Firefox.
    Handbuch: `docs/de/cards.html`, Demo: `demo/stacked-cards.html#adaptiver-radius`.

45. **`components/sparkline.js`** (opt-in, ergänzt `sparkline.css`) - berechnet
    `polyline`/`-area`/`-dot` aus `data-values="4,7,3,9"` oder `data-src="werte.json"`
    (Zahlen-Array ODER `{label,value}`-Objekte), statt sie von Hand als SVG-Koordinaten
    ausrechnen zu müssen. A11y (User-Vorgabe: "wichtig ist dass die daten a11y
    zugänglich sind"): das `<svg>` bleibt `aria-hidden` (reine Formen sind keine
    sinnvolle Screenreader-Ansage), daneben wird eine `.ncss-visually-hidden`-`<table>`
    mit den ECHTEN Werten (nicht nur einer vagen Trend-Beschreibung) eingefügt - per
    WebSearch verifiziertes Standardmuster für Chart-A11y (SVG `aria-hidden` +
    versteckte Datentabelle als Alternativtext), keine geratene Lösung. Ohne
    `data-values`/`-src` bleibt ein `<svg class="ncss-sparkline">` unangetastet (weiterhin
    von Hand/serverseitig renderbar).

46. **CSS `resize` (Drag-Handle) ist für interaktive Demos zu unzuverlässig, nicht
    verlassen** - Trefferfläche nur wenige Pixel in der Ecke, funktioniert NICHT per
    Touch/Trackpad-Tap. Für den `.ncss-radius-adaptive-*`-Handbuch-Demo (`docs/de/
    cards.html#adaptiver-radius`) zunächst mit `resize:horizontal` gebaut - Style/
    Computed-Value waren korrekt gesetzt, Handle sogar im Screenshot sichtbar, trotzdem
    zweimal User-Report "kann ich nicht testen"/"erreicht nie die Kante". Fix: echter
    `<input type="range">`, der die Breite direkt per JS setzt - eindeutig, funktioniert
    identisch mit Maus/Trackpad/Touch/Tastatur. Für künftige "Box in der Doku größer/
    kleiner ziehen"-Demos gleich den Regler nehmen, nicht erst `resize` versuchen.

47. **`.ncss-code-copy` (components/code-block.css) NIE über `--ncss-color-bg`/
    `-text-muted` einfärben** - der Button sitzt über einem `<pre>`, dessen eigener
    Hintergrund unabhängig vom Seiten-bg sein kann (Default hell über
    `--ncss-color-bg-subtle`, aber z.B. `.landing-hero-code` auf product.html fest
    dunkel/transluzent). `--ncss-color-bg` ist zudem selbst kein garantiert neutraler
    Wert - auf product.html bewusst ein kräftiges Marken-Blau (theme.css). User-Report
    "startseite copy buttons sind nicht erkennbar, das musst du allgemein lösen" (Button
    dunkelgrau-auf-dunkelblau auf dem Hero-Code-Block, praktisch unsichtbar). Fix:
    Farben aus `currentColor` ableiten (`color-mix(in srgb, currentColor 12%,
    transparent)` für die Fläche, `currentColor` für Icon/Text) - `<pre>` setzt bereits
    selbst die zu seinem EIGENEN Hintergrund passende Textfarbe, der Button erbt davon
    automatisch die richtige Kontrastrichtung, egal was `--ncss-color-bg` gerade bedeutet.
    Allgemeines Prinzip für jede künftige "schwebt über beliebigem Hintergrund"-Komponente:
    lieber `currentColor`-relativ als über einen globalen Seiten-Token einfärben.

48. **`<details>` ohne `[open]`-Attribut: ein per CSS auf ein Kind erzwungenes
    `display:block !important` gewinnt zwar in `getComputedStyle`/
    `getBoundingClientRect` (Layout läuft normal), das Kind wird in aktuellen Browsern
    trotzdem NICHT gemalt** - moderner `<details>`-Inhalt (alles nach `<summary>`) läuft
    über einen internen Slot-Mechanismus, der sich nicht per einfacher Display-Kaskade
    auf ein Nachfahren-Element überschreiben lässt (bei älteren Engines/älterer Spec-Lage
    funktionierte dieser Trick noch). Betraf die Doku-Sidebar (`docs-src/template.html`,
    User-Report: "Handbuch navi ist mobil immer voll aufgeklappt", Fix mobil per
    `<details>`/`<summary>` - Desktop sollte trotzdem immer offen bleiben): der
    naheliegende `@media (min-width: 60rem) { .docs-sidebar { display:block !important }
    }`-Versuch blieb im Screenshot leer, obwohl alle Computed-Styles "sichtbar" meldeten.
    Fix: das ECHTE `open`-Attribut setzen statt es per CSS vorzutäuschen - im Markup PER
    DEFAULT `open` (JS-loser Fallback bleibt sichtbar statt komplett versteckt), ein
    winziges SYNCHRONES `<script src="...">` (kein `defer`/`async`, `demo/assets/js/
    docs-sidebar.js`) direkt im `<details>` (läuft vor dem ersten Paint an exakt dieser
    Markup-Position, `document.currentScript.closest("details")`) entfernt `open` nur,
    wenn der Viewport beim Laden schmaler als die Breakpoint-Schwelle ist. Bewusst NICHT
    inline (Projekt-Vorgabe: keine Inline-Scripts, CSP-Nonce-Pflege sonst pro Seite nötig)
    - `document.currentScript` funktioniert für ein synchrones externes Script GENAUSO wie
    für ein Inline-Script, kein Verhaltensunterschied.

49. **Keine Inline-`<script>`s auf der eigenen Website** (User-Vorgabe: CSP ohne
    `unsafe-inline` bräuchte sonst pro Seite gepflegte Nonces) - jede Seiten-JS-Logik
    lebt als externe Datei unter `demo/assets/js/`, referenziert per `<script src="...">`
    (synchron, wo Timing zählt - z.B. `docs-sidebar.js`, siehe Punkt 48 - sonst `defer`).
    `dist/components/` bleibt reserviert für tatsächlich ausgelieferte, wiederverwendbare
    ncss-Bibliotheksfeatures - Seiten-eigene Interaktionen (Theme-/Paletten-Umschalter,
    Live-Farbeditor, Landingpage-Formulare, Sidebar-Umschalter) gehören NICHT dorthin,
    auch wenn sie technisch genauso funktionieren würden. Ein Modul-Script (`type=
    "module"`), das per `<script type="module" src="...">` extern statt inline
    eingebunden wird, löst SEINE EIGENEN `import`-Pfade relativ zur MODUL-DATEI selbst
    auf, nicht zur ladenden Seite - `demo/assets/js/set-icon-path.js` brauchte deshalb
    `../../../vendor/...` (drei Ebenen zurück zum Repo-Root), obwohl dieselbe Zeile
    inline auf einer Seite direkt unter `demo/` nur `../vendor/...` gebraucht hätte (per
    echtem Test mit MIME-Type-Fehler gefunden, als nur zwei Ebenen gesetzt waren).

50. **Die Drei-Ebenen-Korrektur aus Punkt 49 gilt NUR für den `import`-Spezifizierer
    selbst, NICHT für jeden String, den das importierte Modul entgegennimmt** -
    `setIconPath("../vendor/fontawesome/svgs")` ist reine Laufzeit-Data, Web Awesome baut
    daraus intern nur eine Text-URL zusammen, die der BROWSER später relativ zur SEITE
    auflöst, nicht zur Moduldatei - blieb bei `demo/assets/js/set-icon-path.js` deshalb
    bei `../vendor/...` (eine Ebene), obwohl der `import`-Spezifizierer direkt daneben
    drei Ebenen braucht. Lokal an der Domain-Wurzel serviert (Server-Root = Repo-Root)
    bleibt der Unterschied unsichtbar (beide Basen landen zufällig am selben Ort) - erst
    unter einem echten Unterpfad wie `skerbis.github.io/nativecss/` sichtbar (per echtem
    Test dort gefunden: alle Font-Awesome-Icons 404eten, weil der Pfad bis vor die
    Domain-Wurzel escapte). Bei jeder Moduldatei mit gemischten Import-Spezifizierern UND
    weitergereichten Pfad-Strings beide Fälle EINZELN prüfen, im Zweifel unter einem
    simulierten Unterpfad testen (`mkdir subpfad && cp -r repo subpfad/ && php -S ... -t
    .`), nicht nur an der Server-Wurzel.

51. **`.ncss-split`/`.ncss-tile`** (components/split.css, components/tile.css) -
    Text-neben-Bild-Sektionen und UIkit-artige Farbflächen-Sektionen. Split: Bild
    links/rechts über Dokumentreihenfolge (`.ncss-split-media` erstes/letztes Kind),
    KEIN Modifier, KEIN `row-reverse` - dieselbe Konvention wie Card-Media oben/unten.
    Braucht `.ncss-split-container` als separaten Container-Query-Wrapper (36rem
    Schwelle) - dieselbe Einschränkung wie bei `.ncss-card--horizontal` (Element kann
    nicht die eigene Breite abfragen). `--ncss-split-media-width` auf `.ncss-split-media`
    für asymmetrische Aufteilung, `--ncss-split-align` (+ Klassen `--align-start/-end/
    -stretch`) für vertikale Ausrichtung. Tile: `--brand`/`--brand-2` kippen automatisch
    auf hellen Text (dieselben `-contrast`-Tokens wie `.ncss-btn--primary`) - `.ncss-card`/
    `<pre>` DARIN werden automatisch wieder auf normalen Text zurückgesetzt, sonst exakt
    derselbe Vererbungs-Fallstrick wie bei product.html's `.landing-on-bg` (siehe oben),
    hier von Anfang an generisch mitgelöst statt erst nachträglich als Seiten-Fix. Beim
    Bauen des Tile-Kommentars selbst in dieselbe Wildcard-Falle gelaufen wie Punkt 14
    beschreibt (`.ncss-py-* / .ncss-px-*` schloss den Kommentar vorzeitig) - per
    `grep -rn '\-\*/'` sofort gefunden, bevor es committed wurde.

52. **`.ncss-accordion-split`** (components/accordion-split.css) - "transformierendes
    Akkordeon" (bekannt von apple.com/mac): Text-Akkordeon links, dazugehöriges Bild
    rechts wechselt automatisch mit dem geöffneten Punkt. KOMPLETT NATIV, kein JS -
    exklusives Öffnen über `<details name="...">` (Baseline seit September 2025, per
    WebSearch verifiziert, in Chromium/WebKit/Firefox getestet - kein `<details name>`
    ODER `mode="single"` von `<wa-accordion>` gebraucht, das native Attribut reicht
    inzwischen), Bildauswahl über `:has()` + `~`-Geschwister-Kombinator (dieselbe
    Technik wie `pre:has(> code[class*="language-"])` in code-block.css, hier nur über
    eine feste Anzahl `:nth-child()`-Positionen dupliziert - `:has()` kann nicht selbst
    "die Nummer des offenen Punkts" auslesen, deshalb ein Selektor-PAAR pro Position,
    bounded auf 6). Jedes Medium steht bewusst ZWEIMAL im Markup (Desktop-Spalte +
    `.ncss-accordion-split-media-mobile`-Kopie fürs Stapeln) - ohne JS lässt sich ein
    DOM-Knoten nicht zwischen zwei entfernten Containern verschieben, nur eine Kopie pro
    Kontext geht rein deklarativ (dieselbe HTTP-URL wird trotzdem nur einmal geladen,
    kein Performance-Verlust, nur mehr Markup). CSS-Selektoren zielen auf `> *`
    (beliebiger Kindtyp), nicht `img` - funktioniert dadurch genauso mit
    `.ncss-placeholder`-Divs (Demo) wie mit echten `<img>`. `name="..."` muss pro
    Akkordeon-Instanz eindeutig sein (Radio-Button-Gruppen-Semantik), sonst gruppieren
    sich mehrere Akkordeons auf derselben Seite ungewollt exklusiv miteinander.

53. **`<select>` mit `appearance: base-select` zeigte auf Safari 26 (stabil, KEIN Beta)
    einen DOPPELTEN Pfeil** (User-Screenshot: ein Pfeil knapp über dem oberen Rahmen -
    offensichtliches Rendering-Artefakt -, einer normal unten rechts). ERSTE, WIDERLEGTE
    Diagnose: "fehlender expliziter `<button><selectedcontent>`, Browser erzeugt
    impliziten Default-Button, DER zeigt den Doppelpfeil" - Fix (Button überall ergänzen)
    ausgeliefert, User bestätigte per Folge-Report ausdrücklich: Bug bestand WEITERHIN,
    obwohl beide betroffenen Selects auf `forms.html` zu diesem Zeitpunkt bereits einen
    expliziten Button hatten. Lehre: eine plausible Korrelation aus EINEM Screenshot
    (nur der button-lose Select zeigte den Bug beim ersten Report) ist keine bestätigte
    Kausalität - ohne echten Repro-Zugriff (Playwrights WebKit-Build zeigt hier
    durchgehend nur einen korrekten Pfeil, keine Reproduktion möglich) bleibt jede
    Diagnose eine Hypothese, bis der Nutzer den tatsächlichen Fix bestätigt.
    ECHTER Fix (Nutzer-Entscheidung nach Rückfrage, da mangels Testzugang nicht gezielt
    behebbar): `appearance: base-select` in WebKit/Safari komplett deaktivieren (nicht nur
    den Button ergänzen) - Safari fällt bewusst auf das schlichte native `<select>` mit
    eigenem Pfeil zurück, bis Apple den Bug behebt (Ziel-Version laut Apples eigenem
    WWDC26-Blog: Safari 27, Safari 26 hat offenbar nur eine frühe/fehlerhafte Vorstufe).
    WebKit-Erkennung OHNE User-Agent-Sniffing über eine Feature-Kombination, die nur dort
    gleichzeitig zutrifft (per echtem `CSS.supports()`-Test in Chromium/WebKit/Firefox
    bestätigt - nur WebKit liefert bei allen dreien gemeinsam `true`):
    `@supports (appearance: base-select) and (not ((hanging-punctuation: first) and
    (font: -apple-system-body) and (-webkit-appearance: none)))`. WICHTIG: `combobox.js`
    (der JS-Fallback für Browser ohne aktives `base-select`) hatte sein eigenes,
    unabhängiges Feature-Detection (`CSS.supports("appearance", "base-select")` OHNE die
    WebKit-Ausnahme) - dieses MUSS exakt dieselbe zusammengesetzte Bedingung nutzen wie
    `select.css`s `@supports`-Gate, sonst denkt das Script fälschlich, Safari hätte
    bereits ein gestyltes natives Popup (hat es nicht mehr, seit CSS es dort deaktiviert)
    und enhanct dort gar nichts - beide Stellen synchron halten, siehe components/
    select.css UND components/combobox.js.
    ZWEITE, ENDGÜLTIGE Runde nötig - obiger Fix (base-select in WebKit deaktivieren)
    war NICHT ausreichend, User meldete den Doppelpfeil nach dem Deploy erneut, diesmal
    MIT Screenshot, der zeigte, dass bereits die aktualisierten Doku-Texte sichtbar waren
    (also eindeutig die neue Version, kein Cache-Problem). User lieferte diesmal selbst
    die entscheidende Diagnose per direktem Experiment in echtem Safari: `.ncss-select-
    wrapper::after` (unser EIGENER Pfeil-Indikator) auskommentiert -> Doppelpfeil weg,
    genau EIN korrekter Pfeil übrig. Tatsächliche Ursache damit real-Safari-bestätigt
    (nicht mehr nur Hypothese): `appearance: none` unterdrückt in echtem Safari den
    NATIVEN `<select>`-Pfeil nicht zuverlässig (anders als in Chromium/Firefox) - im
    Fallback-Zweig (den WebKit seit obigem Fix IMMER nimmt) kam unser eigener `::after`-
    Pfeil deshalb zusätzlich zum weiterhin sichtbaren nativen Safari-Pfeil oben drauf.
    War kein base-select-spezifisches Problem, sondern lag schon in der einfachen
    Fallback-Ebene - der erste Fix (base-select deaktivieren) hat WebKit überhaupt erst
    zuverlässig in genau diesen kollidierenden Fallback-Zweig gezwungen, statt das
    ursprüngliche (davor unklare) Problem zu lösen. Endgültiger Fix: `.ncss-select-
    wrapper::after` zusätzlich per EIGENEM, positivem (kein `not`) WebKit-`@supports`-
    Block auf `display: none` gesetzt - Safaris eigener nativer Pfeil bleibt als einziger
    sichtbar (schlichter, nicht per Tokens einfärbbar, aber korrekt). Lehre für künftige
    Fälle dieser Art: wenn ein Bug in keiner Test-Engine reproduzierbar ist UND die erste
    plausible Diagnose sich als falsch/unvollständig erweist, ist ein gezieltes
    Experiment DURCH DEN NUTZER in seinem echten Browser (z.B. "kommentier testweise
    Regel X aus und sag mir, ob es dann korrekt aussieht") oft schneller und
    zuverlässiger als eine dritte Hypothese zu raten.

54. **Natives `<details>` sanft animieren (User-Report: "nicht schön animiert"), ohne JS**
    - `::details-content` (Baseline seit September 2025) ist das Pseudo-Element für ALLES
    außer `<summary>`; `height: 0` → `[open]::details-content { height: auto }` +
    `transition: height ...` animiert das dank `interpolate-size: allow-keywords`
    (`@supports`-gated global in reset.css, siehe dort) NUR in Chromium (Stand 2026) -
    ohne Unterstützung bleibt der native Sofort-Sprung als Fallback, KEIN kaputter/leerer
    Zustand, deshalb kein eigenes Feature-Gate pro Komponente nötig (per Playwright über
    alle drei Engines bestätigt: WebKit/Firefox zeigen sofort die Endhöhe, kein Fehler).
    Muster: `.ncss-disclosure::details-content`/`.ncss-accordion-split-item::details-
    content` je `{ overflow: clip; height: 0; transition: height var(--ncss-motion-
    duration-slow) var(--ncss-motion-easing); }` + `[open]::details-content { height:
    auto; }`. WICHTIGE LÜCKE dabei gefunden (nicht user-gemeldet, proaktiv beim Bauen
    aufgefallen): die bestehende globale `prefers-reduced-motion`-Regel in reset.css nutzt
    den Universalselektor `*, *::before, *::after` - das erreicht ANDERE benannte Pseudo-
    Elemente wie `::details-content` NICHT (der Stern trifft nur echte Elemente plus
    genau die beiden dort explizit gelisteten Pseudo-Elemente), musste also separat
    ergänzt werden (`*, *::before, *::after, *::details-content { transition-duration:
    0.01ms !important; ... }`) - sonst würde die Öffnen/Schließen-Animation reduced-motion
    ignorieren. Per Playwright mit `reducedMotion: 'reduce'` über alle drei Engines
    bestätigt: `transitionDuration` auf `::details-content` sinkt korrekt auf ~0.00001s.

55. **`.ncss-marginnote`** (components/marginnote.css) - Bild/Text bricht aus der
    Textspalte aus, landet aber NICHT am Bildschirmrand (das leistet schon
    `.ncss-bleed-start/-end`), sondern in der Randspalte NEBEN dem Fließtext (Sidenote-
    Muster, bekannt von Tufte CSS, hier unabhängig nachgebaut: reines CSS Grid statt
    fester Pixel-Ränder). `.ncss-marginnote-layout` ist ein 3-Spalten-Grid (Rand/Text/
    Rand): `grid-template-columns: 1fr min(100%, var(--ncss-container-max-narrow)) 1fr`
    - `min(100%, ...)` sorgt dafür, dass die Textspalte auf schmalen Containern von selbst
    100% wird, die beiden `1fr`-Randspalten schrumpfen dann OHNE eigene Media/Container
    Query von selbst auf 0. NICHT-OFFENSICHTLICHER BUG dabei gefunden (per echtem Test,
    nicht angenommen): eine feste `column-gap` auf `.ncss-marginnote-layout` selbst wird
    vom Grid IMMER zwischen den Spalten reserviert, auch wenn die Randspalten auf 0
    kollabieren - macht auf schmalen Containern einen horizontalen Overflow exakt in Höhe
    der Summe beider Gaps (16px bei 375px Breite gemessen, optisch unauffällig, nur per
    `scrollWidth`-Check gefunden). Fix: `column-gap` NICHT auf `.ncss-marginnote-layout`
    selbst, sondern nur INNERHALB der Container Query setzen, die auch die Randspalten
    aktiviert - dort ist immer genug Platz dafür eingeplant.
    Zweiter, wichtigerer Fund (ebenfalls per echtem Test, nicht aus der Spec abgeleitet):
    CSS Grids Auto-Placement platziert Elemente in Dokumentreihenfolge und nutzt dieselbe
    Zeile weiter, solange die eigene Spalte darin noch frei ist ("sparse" packing, der
    Auto-Placement-Cursor bewegt sich nur vorwärts, nie zurück) - dadurch landet eine
    Randnotiz automatisch auf derselben Zeilenhöhe wie ein Absatz, OHNE dass sie ihre
    eigene Position kennen müsste. ABER: die beiden Randspalten verhalten sich dabei NICHT
    symmetrisch. Eine `.ncss-marginnote-end`-Notiz (rechte Spalte, Spaltenindex NACH der
    Textspalte) muss im Markup DIREKT NACH dem Absatz stehen, zu dem sie gehört, um dessen
    Zeile zu teilen. Eine `.ncss-marginnote-start`-Notiz (linke Spalte, Spaltenindex VOR
    der Textspalte) muss dagegen DIREKT VOR ihrem Absatz stehen - weil der Auto-Placement-
    Cursor nach Platzierung eines Absatzes (Spalte 2) bereits auf Spalte 3 steht, kann ein
    Element mit Spalte 1 (kleiner als der Cursor) nicht mehr rückwirkend in dieselbe Zeile
    einsortiert werden und rutscht in die NÄCHSTE Zeile - dort teilt es sich dann mit dem
    darauffolgenden Absatz. Beim ersten Testlauf (Notiz nach ihrem Absatz für BEIDE Seiten)
    fiel genau das auf: die `-start`-Notiz landete neben dem FALSCHEN (nächsten) Absatz.
    URSPRÜNGLICHE Schwelle für den Sprung in die Randspalte: 60rem Grid-Breite (Text
    45rem + ausreichend Platz für mindestens eine ~10-15rem breite Randspalte + Gap) -
    siehe nächster Absatz für eine zweite, notwendige Korrektur dieser Schwelle.
    ZWEITE RUNDE nötig (User-Report per Screenshot: "sehe hier keine Randnotizen" auf der
    eigenen Handbuch-Seite `layouts.html#marginnote`) - die feste 60rem-Schwelle wurde in
    der Doku-Seite NIE erreicht, obwohl das Browserfenster beliebig breit gezogen wurde.
    Ursache: `docs-src/template.html`s Sidebar-Layout (`.docs-layout {
    grid-template-columns: 15rem 1fr; }`) deckelt die Inhaltsspalte SELBST bei sehr
    breitem Viewport dauerhaft bei ca. 53.5rem (per echtem Test gemessen, u.a. bei
    1920px Viewport-Breite immer noch exakt derselbe Wert) - die Sidebar frisst
    unabhängig vom Viewport denselben Anteil weg, es gibt keinen Viewport, der die
    60rem-Schwelle in diesem Kontext je erreicht. Eine feste 45rem-Textspalte hätte den
    Randspalten dort ohnehin nur ca. 4rem pro Seite übriggelassen - zu schmal für
    brauchbaren Notiz-Inhalt, selbst wenn die Schwelle gesenkt worden wäre. ECHTER Fix:
    ZWEI Anpassungen gleichzeitig statt nur die Zahl zu senken - (1) Schwelle auf 46rem
    gesenkt (mit Sicherheitsabstand unter den gemessenen 53.5rem), UND (2) die Textspalte
    wechselt INNERHALB der Container Query zusätzlich von `min(100%, 45rem)` auf ein
    festes, schmaleres `min(100%, 30rem)` - macht aktiv Platz für die Randspalten, statt
    ihnen nur die zufälligen Reste der festen 45rem-Textspalte zu überlassen (das
    eigentliche, korrekte Sidenote-Verhalten: die Textspalte wird bewusst schmaler, wenn
    Randnotizen aktiv sind, kein Kompromiss). Ergebnis in der Doku-Sidebar per echtem Test
    verifiziert: Randspalten ca. 9.4rem statt der vorher errechneten ~4rem. Lehre: ein
    Container-Query-Schwellenwert, der nur gegen die BREITESTE getestete Umgebung
    (`.ncss-container` allein, bis 75rem) geprüft wurde, kann in einer SCHMALEREN, aber
    genauso realen Praxis-Umgebung (hier: die eigene Doku-Seite mit Sidebar) nie
    ausgelöst werden - der jeweils ENGSTE reale Nutzungskontext ist die maßgebliche
    Referenz für eine Schwelle, nicht nur der offensichtlichste Demo-Kontext.

56. **Seitenübergreifende Navi war zwischen Demo-Suite und Doku-Website strukturell
    inkonsistent** (User-Report: "man blickt nicht durch") - alle 15 regulären
    `demo/*.html`-Seiten teilten sich bereits eine identische, reiche Kopf-Navi
    (Komponenten/Navigation/Formulare/Medien + "Mehr"-Dropdown mit 12 weiteren
    Demo-Seiten + Handbuch), aber `docs-src/template.html` (die Vorlage für alle 46
    Doku-Seiten) hatte nur zwei nackte Links ("Demo"/"Handbuch") - keinerlei direkten
    Sprung von einer Doku-Seite zu einer EINZELNEN Demo-Seite (z.B. `forms.html`) ohne
    erst über `demo/index.html` umzuweg. Fix: dasselbe "Mehr"-Dropdown-Muster 1:1 in
    `docs-src/template.html` übernommen (Pfade auf `../../demo/...` angepasst, da
    Doku-Seiten zwei Ebenen tiefer liegen), dafür 15 neue Platzhalter-Tokens in
    `docs-src/strings.json` (DE+EN) UND passende `.replaceAll(...)`-Zeilen in
    `docs-src/build.mjs` ergänzt - wie bei jedem neuen Platzhalter in diesem Build-System
    (siehe Fallstrick zu `docs-src/build.mjs`s einfachem String-Replace-Mechanismus:
    JEDER Platzhalter braucht diese drei Stellen synchron: `strings.json`-Eintrag,
    `template.html`-Nutzung, `build.mjs`-Replace-Zeile). Nach dem Rebuild auf ALLEN 46
    Doku-Seiten geprüft: `grep -rl "__NAV_"` über den gesamten `docs/`-Ordner muss leer
    sein (kein unaufgelöster Platzhalter durchgerutscht).
    Separat gefunden bei derselben Audit: `demo/landing.html` (bewusst eigenständige
    "wirkt wie eine echte Kunden-Landingpage"-Demo, nutzt `<wa-dropdown>` statt nativem
    `<details>` fürs eigene Mehr-Menü) hatte in genau diesem Menü zwei Lücken -
    `forms.html`/`media.html` fehlten (12 von 14 anderen Demo-Seiten vorhanden, diese
    zwei nicht) - ergänzt als zwei weitere `<wa-dropdown-item>`. Der generische
    `wa-select`-Handler in `assets/js/landing-interactions.js` navigiert per
    `value`-Attribut, keine JS-Änderung nötig, nur Markup ergänzt.

57. **`components/view-transitions.js`** (opt-in, zu `.ncss-accordion-split` gehörig,
    siehe accordion-split.css für die zugehörigen `::view-transition-*`-Presets) - weicher
    Bildwechsel (Kreuzblende/Slide/3D-Flip) statt hartem `display:none/block`-Schnitt, per
    Same-Document View Transitions (`document.startViewTransition()`, User-Report:
    "fehlen Transitions ... Bild sollte einfaden oder gleiten"). Browser-Support per
    Recherche + echtem Playwright-Test bestätigt (`typeof document.startViewTransition
    === 'function'`): Chrome/Edge 111+, Safari 18+, Firefox 133+ - deutlich breiter als
    die bereits vorhandenen Cross-Document View Transitions (page-transitions.css, wo
    Firefox noch fehlt), aber OHNE deren rein deklarative CSS-Form: ein kurzer JS-Trigger
    ist für die Same-Document-Variante unvermeidlich.
    `<details>` feuert KEIN abbrechbares `beforetoggle` (anders als `<dialog>`/Popover -
    offener Spec-Issue whatwg/html#9743, per Recherche bestätigt, nicht angenommen) - der
    funktionierende Weg ist stattdessen, den Klick auf `<summary>` selbst abzufangen
    (dessen Aktivierungsverhalten IST abbrechbar) und `.open` manuell INNERHALB von
    `document.startViewTransition(...)` umzuschalten. Per echtem Test bestätigt: das
    funktioniert auch für EXKLUSIVE `<details name="...">`-Gruppen weiterhin korrekt (das
    Schließen der Geschwister-Punkte passiert weiterhin automatisch, obwohl `.open` per
    JS statt durch echten Nutzer-Klick gesetzt wird).
    NICHT-OFFENSICHTLICHER BUG dabei gefunden (per Screenshot, nicht angenommen): ohne
    weiteres Zutun crossfadet `document.startViewTransition()` per Default IMMER
    zusätzlich die GANZE Seite (`::view-transition-old/-new(root)`), nicht nur das
    explizit benannte Element - weil sich beim Öffnen/Schließen eines Akkordeon-Punkts
    der Seiteninhalt darunter durch dessen eigene Höhen-Animation verschiebt, unter-
    scheiden sich Vorher-/Nachher-Screenshot der GANZEN Seite spürbar, der Browser
    blendete sichtbar doppelten/geisterhaften Text ein. Fix: `::view-transition-old(root)`/
    `::view-transition-new(root)` auf `animation:none; mix-blend-mode:normal;` gesetzt,
    `::view-transition-image-pair(root) { isolation: auto; }` - Standard-Pattern, um
    einen View Transition auf nur EIN benanntes Element zu beschränken.
    `view-transition-name` MUSS unter simultan sichtbaren Elementen eindeutig sein (Spec)
    - bei mehreren `.ncss-accordion-split`-Instanzen auf einer Seite bekommt jede Instanz
    einen eigenen Namen (Instanz-Index). Für die PRESETS reicht das aber nicht: CSS'
    `::view-transition-group()`-Selektor kennt nur exakte Namen oder den Universal-
    selektor `*` (per Recherche + echtem Test bestätigt: KEIN Scoping über eine DOM-
    Vorfahren-Bedingung wie `[data-transition] ::view-transition-group(...)` möglich, die
    Pseudo-Elemente hängen an einem eigenen, von `:root` ausgehenden Baum, nicht am
    normalen DOM). Lösung: `view-transition-class` (Level 2, per echtem Test in allen
    drei Engines bestätigt) - `::view-transition-group(*.klasse)` trifft alle Gruppen mit
    dieser Klasse, unabhängig von ihrem jeweils eindeutigen Namen.

58. **Feste Hauptbereiche (Start/Handbuch/Demo) über ALLE Seiten hinweg an derselben
    Position** (User-Vorgabe nach mehrfachem Nachfragen: "nach dem Schriftzug: Handbuch,
    Demo, danach Divider, um die eigenen Hauptpunkte zu zeigen ... Navi sollte klarstellen
    wo man aktuell ist"). Struktur jetzt auf JEDER Seite identisch (Logo bleibt "Start",
    kein Text-Duplikat nötig): `NativeCSS-Logo → Handbuch → Demo → | → seitenspezifische
    Punkte (nur wenn vorhanden)`. `product.html` (Start) bekommt selbst KEIN "Start"-
    Textlink - das Logo trägt stattdessen `aria-current="page"`, eigens gestylt in
    `topbar.css` (`.ncss-topbar-brand[aria-current="page"] { text-decoration:
    underline; }` - die generische `[aria-current="page"]`-Regel in nav.css deckt nur
    `.ncss-nav-item > a`/`.ncss-nav-dropdown > summary` ab, nicht die Marke, die eine
    andere Klasse trägt). "Demo" bekommt `aria-current="page"` auf ALLEN `demo/*.html`-
    Seiten (nicht nur `index.html` selbst) - zeigt den ÜBERGEORDNETEN Bereich, während
    das spezifischere Item (z.B. "Farben" im Mehr-Dropdown) zusätzlich die genaue Seite
    markiert (verschachteltes Aktiv-Muster, dieselbe Idee wie `.ncss-nav-dropdown >
    summary[aria-current="page"]`, das schon existierte). Auf Doku-Seiten wandern
    Navigation/Formulare/Medien (die auf Demo-Seiten eigene Top-Level-Punkte sind) mit IN
    das Mehr-Dropdown - Doku-Seiten haben keine eigene "Top-Level-Identität" dafür, nur
    ihre Sidebar für Seiteninhalt. `demo/landing.html` (bewusst "wirkt wie eine echte
    Kunden-Landingpage") bekam Handbuch/Demo/Divider trotzdem VORNE ergänzt (Konsistenz
    schlägt hier die Illusions-Reinheit), ihr eigenes `<wa-dropdown>`-Mehr-Menü bleibt
    als seitenspezifischer Teil danach unverändert.
    Trenner: `<hr class="ncss-divider--vertical" aria-orientation="vertical">`
    (helpers/layout.css, bereits vorhanden für `.ncss-topbar-actions`) - `<ul>` darf laut
    Spec nur `<li>`-Kinder haben, das `<hr>` steckt deshalb in einem eigenen
    `<li class="ncss-nav-item" aria-hidden="true">`. ZWEI NICHT-OFFENSICHTLICHE BUGS
    dabei gefunden (per echtem `getBoundingClientRect()`-Test, nicht angenommen - der
    Divider war zuerst komplett unsichtbar, `height:0`, ohne jeden Konsolenfehler):
    (1) `align-self:stretch` wirkt NUR auf echte Flex-Items - das `<hr>` selbst ist aber
    ein normaler Block-Nachfahre seines `<li>`-Wrappers, nicht direkt Kind von
    `.ncss-nav-list` (dem Flex-Container), das ursprünglich für `.ncss-topbar-actions`
    geschriebene `align-self:stretch` auf `.ncss-divider--vertical` selbst blieb dadurch
    wirkungslos (Divider unsichtbar, `height:0`).
    ERSTER Fix (per `:has()` das `<li>` selbst stretchen + `height:100%` aufs `<hr>`)
    machte den Divider zwar sichtbar, brachte aber einen ZWEITEN, subtileren Fehler:
    User-Report samt Screenshot "Divider ist zu hoch und viel zu hell" - der Trenner war
    dadurch exakt so hoch wie die GESAMTE Flex-Zeile inklusive Innenabstand, nicht wie der
    Text daneben. Kein absoluter Pixel-Fehler, sondern eine falsche BEZUGSGRÖSSE
    (Zeilenhöhe statt Textgröße) - auf Seiten mit größerem Zeilenabstand (z.B.
    product.html's transparente "Glass"-Topbar) wirkte das entsprechend überproportional.
    ENDGÜLTIGER Fix (deutlich einfacher als beide vorherigen Versuche zusammen): `height:
    1.2em` statt jeglichem Höhen-Bezug auf die Elternzeile - skaliert automatisch mit dem
    umgebenden Text, unabhängig vom Zeilen-Padding, kein `:has()`-Stretch-Trick mehr
    nötig (Default `align-self:center` von `.ncss-nav-list` reicht). Gleichzeitig auch
    die FARBE korrigiert (zweiter Teil desselben User-Reports: "viel zu hell") - das feste
    `--ncss-color-border`-Token ist für helle Standard-Flächen gedacht, auf einer
    abweichend eingefärbten Topbar (z.B. product.html's dunkle Glass-Variante mit lokal
    auf Weiß gesetztem Navi-Text) blieb der Trenner dadurch fehl am Platz. Fix:
    `border-inline-start-color: color-mix(in oklch, currentColor 30%, transparent)` -
    folgt automatisch der jeweils schon korrekten Textfarbe an dieser Stelle, keine
    Seiten-spezifische Farbanpassung am Divider selbst nötig. VORAUSSETZUNG dafür: die
    Textfarbe muss an GENAU dieser Position (dem Divider-`<li>`, nicht nur den `<a>`s
    daneben) korrekt ererbt werden - `product.html`s bereits bestehende lokale
    Weiß-Textfarben-Regel (siehe eigener `<style>`-Block, dort schon für die dunkle
    Glass-Topbar nötig) musste dafür um genau dieses `<li>` erweitert werden
    (`.landing-topbar .ncss-nav-item:has(> .ncss-divider--vertical) { color: #fff; }`) -
    keine neue Sonderbehandlung, nur eine bereits nötige Liste um ein weiteres Element
    ergänzt.
    Zusätzlich responsive: unterhalb 64rem (`.ncss-nav-list` wechselt dort auf
    `flex-direction: column` fürs Off-Canvas-Panel) wäre eine VERTIKALE Linie zwischen
    gestapelten Zeilen witzlos - `.ncss-nav-list .ncss-divider--vertical` wird im selben
    `@media (max-width: 63.99rem)`-Block auf eine horizontale Linie zurückgesetzt
    (`border-block-start` statt `border-inline-start`), mit derselben currentColor-Logik.

59. **`.ncss-eyebrow` nutzte die rohe `--ncss-color-brand` statt `--ncss-color-brand-
    on-soft`** (User-Report: Lighthouse-Kontrast-Warnung "Background and foreground
    colors do not have a sufficient contrast ratio", betraf laut User "meist `<code>`,
    `.ncss-eyebrow`"). Eine Markenfarbe ist nur in der Kombination GARANTIERT
    kontrastreich, für die ein Projekt sie kalibriert hat (typischerweise heller Text
    AUF der Fläche, siehe theme.css) - als kleiner Text AUF einer hellen Fläche ist das
    eine andere, ungeprüfte Kombination. Per echtem Test (eigenes Kontrast-Skript,
    WCAG-Formel, siehe unten) auf diesem Projekt selbst gefunden: dessen zurückhaltende
    Grau-Markenfarbe (`#6f6f6e`) lag als `.ncss-eyebrow`-Text auf `--ncss-color-bg-subtle`
    bei 4.49:1 - hauchdünn unter der 4.5:1-AA-Grenze. Fix: `--ncss-color-brand-on-soft`
    (colors.css, bereits vorhanden - automatisch abgeleitete, im Light Mode dunklere
    `-700`-Stufe) statt der rohen Markenfarbe, siehe helpers/typography.css.
    EIGENES Kontrast-Prüfskript geschrieben (kein axe-core/Lighthouse zur Hand) - dabei
    zwei Fallstricke im SKRIPT SELBST gefunden, die zu falschen "Fehlern" führten
    (per echtem `getComputedStyle`-Vergleich aufgeklärt, nicht einfach verworfen):
    (1) `getComputedStyle(...).backgroundColor` liefert NICHT immer ein `rgb()`/`rgba()`-
    Format - moderne Chromium-Versionen liefern für manche Farben `oklch(...)`, ein
    einfacher `rgba?\(...)`-Regex übersieht das komplett und lässt die Hintergrundfarben-
    Kette dadurch STILLSCHWEIGEND eine echte Fläche auslassen (kein Fehler, einfach
    `null`, Fallback auf Weiß - erzeugte etliche falsche "Weiß auf Weiß"-Befunde). (2)
    `background-image: linear-gradient(...)` wird von `backgroundColor` gar nicht erst
    erfasst - Text auf einem Gradient-Hintergrund (z.B. `.ncss-gradient-brand`-Demo)
    erschien im ersten Skript-Durchlauf ebenfalls fälschlich als "Weiß auf Weiß". Lehre:
    ein SELBST GESCHRIEBENES Kontrast-Prüfwerkzeug ist nicht automatisch verlässlicher
    als das Ausgangsproblem, das es prüfen soll - jeden gemeldeten "Fehler" einzeln an der
    tatsächlichen `getComputedStyle`-Kette nachvollziehen, bevor man ihn für echt hält
    ODER verwirft (hier: EIN echter Fund von >10 gemeldeten, der Rest waren Artefakte des
    eigenen Skripts, nicht der Seite).

60. **Font Awesomes eigene `@font-face`-Regeln setzen `font-display: block`** (User-
    Report: Lighthouse "Consider setting font-display to swap or optional"). `swap` NICHT
    gewählt: für ein Icon-Font ist ein sofortiger, falscher/fehlender Fallback-Glyph beim
    Laden schlechter als `block`s kurzes Unsichtbar-Fenster ("Flash of wrong/missing
    icon") - `optional` stattdessen: kurzes Lade-Fenster, danach entweder der fertige
    Font oder dauerhaft der Fallback, ohne beliebig lang zu warten; bei gecachtem Font
    (jeder wiederkehrende Besuch) ohnehin kein Unterschied.
    ERSTER Versuch (verworfen, VOR dem Ausliefern per Recherche widerlegt): dieselben
    `@font-face`-Deskriptoren unter IDENTISCHEM Familiennamen erneut deklarieren, nur mit
    anderem `font-display`. Das ist KEIN "letzte Regel gewinnt"-Override - zwei
    `@font-face`-Regeln mit exakt gleicher Familie/Gewicht/Stil bilden eine "Composite
    Face", der Browser wählt zwischen den Kandidaten anhand tatsächlicher
    Zeichenabdeckung (unicode-range), nicht per Ladereihenfolge (per echtem Playwright-
    Test bestätigt: `document.fonts` enthielt hinterher BEIDE Einträge gleichzeitig,
    welcher das Lade-Timing bestimmt war nicht zuverlässig steuerbar).
    ENDGÜLTIGER Fix: Font Awesomes eigene CSS setzt `font-family` nie hart, sondern über
    `--fa-family-classic`/`--fa-family-brands` (Custom Properties, von der eigentlichen
    Regel über `font-family:var(--_fa-family)` konsumiert). Diese beiden Custom
    Properties in einer eigenen, unlayered Datei (`dist/fontawesome-font-display-fix.css`,
    NACH Font Awesome geladen, dasselbe unlayered-gewinnt-Prinzip wie theme.css) auf zwei
    NEUE, nur dort definierte Familiennamen umgebogen - jeweils NUR EIN `@font-face` pro
    Familie/Gewicht, keine Namenskollision mit Font Awesomes eigenen Regeln, dadurch auch
    keine Composite-Face-Mehrdeutigkeit mehr möglich. Vendor-Datei selbst unangetastet
    (dasselbe Muster wie webawesome-bridge.css für Web Awesome). Per echtem Test
    bestätigt: `::before`-Pseudoelement der Icons löst `font-family` korrekt auf den
    neuen Namen auf, alle Icons weiterhin sichtbar (Chromium/WebKit/Firefox, 0 Fehler).

61. **Eigenes Kontrast-Skript reichte nicht - ECHTES Lighthouse (`npx lighthouse`) fand
    nach Fallstrick 59 noch echte, verbliebene Befunde**, die das eigene Skript nicht
    prüfte (kannte nur `.ncss-eyebrow`/`code`/`.ncss-text-muted`/`.ncss-text-sm` als
    Selektoren, nicht Prisms `.token.*`-Klassen) UND einen, den es durch einen eigenen
    Parsing-Fehler übersah (siehe unten). Lehre, die über den Einzelfall hinausgeht: bei
    einer Lighthouse-Rückfrage IMMER `npx lighthouse <url> --only-categories=accessibility
    --output=json` laufen lassen und die konkreten `audits["color-contrast"].details.items`
    auswerten, statt sich auf ein selbst gebautes Ersatz-Skript zu verlassen, dessen
    Abdeckung/Korrektheit man selbst nicht unabhängig geprüft hat.
    ZWEI echte, unterschiedliche Befunde gefunden und gefixt:
    (a) `.token.function`/`.token.class-name` (components/code-block.css) nutzten die
    rohe `--ncss-color-warning` statt `-on-soft` - dieselbe Diagnose wie Fallstrick 59,
    hier systemisch auf ALLE `.token.*`-Farbzuordnungen angewendet (keyword/property/tag/
    selector/string/operator/etc.), nicht nur die eine von Lighthouse konkret genannte
    Klasse - andere Farbfamilien hätten beim nächsten Crawl derselben Seite mit anderem
    Beispiel-Code ebenso auffallen können. `.landing-hero-code` (product.html, dedizierter
    dunkler Code-Block) bleibt unberührt, da dessen eigene lokale Token-Overrides
    (tag/attr-name/attr-value/string/punctuation/comment) die dort TATSÄCHLICH
    vorkommenden Klassen bereits vollständig abdecken, nichts fällt auf die gemeinsame
    Regel zurück (vor dem Ändern geprüft, nicht angenommen).
    (b) `<code>` INNERHALB von `.landing-on-bg .ncss-text-muted` (product.html) lag bei
    4.13:1 - subtiler, seitenspezifischer Bug: `<code>`s eigener Hintergrund ist ein
    12%-currentColor-Tint (base.css) - der zieht die LOKALE Fläche unter dem Code-Chip
    RICHTUNG der eigenen (hier bereits recht hellen) Textfarbe, was den Kontrast GENAU
    DORT enger macht, wo `<code>` vorkommt (reiner Fließtext ohne `<code>` lag längst über
    4.5:1). Fix: die betroffene Textfarbe (`#aec7e6` -> `#c3d8f2`) hell genug gewählt, dass
    SOWOHL der reine Fließtext-Fall (6.12:1) als auch der code-umschlossene Fall (4.78:1)
    komfortabel über 4.5:1 bleiben - per echtem Canvas-basiertem Kontrast-Test verifiziert
    (nicht nur der reine Fließtext-Fall, das hätte den `<code>`-Fall übersehen).
    NICHT-OFFENSICHTLICHER FALLSTRICK im eigenen Prüf-Tooling dabei gefunden:
    `getComputedStyle(...).backgroundColor`/`.color` liefert bei einem per `color-mix(in
    oklch, ...)` erzeugten Wert ein `oklch(...)`-Farbformat zurück, kein `rgb()`/`rgba()`
    - ein einfacher Regex-Parser für `rgba?\(...)` übersieht das STILLSCHWEIGEND (kein
    Fehler, einfach `null`/übersprungen), was zu falschen "kein Hintergrund gefunden"-
    Ergebnissen führte. Robuster, generischer Fix fürs eigene Tooling: jede CSS-
    Farbangabe über eine 1×1-Canvas (`ctx.fillStyle = colorStr; ctx.getImageData(...)`)
    zu echten RGBA-Bytes normalisieren, statt String-Parsing für jedes mögliche
    Farbformat (`rgb`/`oklch`/`hsl`/benannte Farben/...) einzeln nachzubauen - funktioniert
    für JEDEN gültigen CSS-Farbwert, unabhängig vom Ausgabeformat des Browsers.

62. **Fehlendes `<link rel="icon">` erzeugte einen Konsolenfehler** (echtes Lighthouse,
    Kategorie best-practices: "Browser errors were logged to the console" - der Browser
    fragt ohne expliziten Favicon-Link automatisch `/favicon.ico` an der DOMAIN-WURZEL an,
    nicht am `/nativecss/`-Unterpfad, den dieses Projekt überhaupt kontrolliert; 404
    unvermeidbar, SOLANGE kein expliziter Link vorhanden ist - moderne Browser
    unterdrücken die implizite Anfrage zuverlässig, sobald ein `<link rel="icon">`
    deklariert ist). `favicon.svg` (Repo-Wurzel, einfache "N"-Marke in `--ncss-color-bg`s
    eigenem Signature-Blau `#154a86`, NICHT im generischen Bibliotheks-Default-Blau -
    dasselbe Blau, das theme.css bereits als "Erkennungswert der Seite selbst"
    dokumentiert) auf ALLEN Seiten verlinkt (18 Demo-Seiten + docs-src/template.html für
    alle 46 Doku-Seiten + der separat erzeugten docs/index.html-Sprachweiche).
    NICHT-OFFENSICHTLICHER STOLPERSTEIN dabei gefunden, BEVOR er den Deploy gebrochen
    hätte (lokal nachgestellt, nicht nur angenommen): `.github/scripts/
    build-root-index.mjs` erzeugt beim Deploy eine index.html an der Site-Wurzel aus
    `demo/product.html`, per EXAKTEN String-Ersetzungspaaren für dessen relative Pfade
    (`../dist/` -> `dist/` usw.) - der neue `href="../favicon.svg"` fiel durch KEINE der
    bestehenden Regeln, das Skript hat aber genau dafür einen eigenen Sanity-Check
    (`if (html.includes('="../'))`), der bei einem unbehandelten `../`-Rest laut fehlschlägt
    statt still eine kaputte Datei zu erzeugen - hätte den GitHub-Actions-Build sichtbar
    rot werden lassen. Fix: eigenes Ersetzungspaar (`href="../favicon.svg"` ->
    `href="favicon.svg"`) ergänzt, LOKAL gegen eine `rsync`-Kopie des Repos genau wie im
    echten Workflow ausgeführt und verifiziert, bevor es ausgeliefert wurde.

## Zwei klassische CSS-Fallen (per echtem Test gefunden, components/nav.css + off-canvas.css)

- **`min-width: auto`-Falle - gilt für Flex- UND Grid-Items gleichermaßen.** Ein Flex-
  ODER Grid-Item schrumpft NICHT automatisch unter seine Inhaltsbreite, selbst mit
  `flex-shrink`/einer `fr`-Spalte - der Default `min-width: auto` bedeutet "nie kleiner
  als der eigene Inhalt", das Item sprengt dann den Container/Viewport. Zwei separate
  Fundstellen, gleiche Ursache: `.ncss-nav-list` (Flex, mit `overflow-x` sollte greifen,
  tat es aber nicht) UND `.docs-layout`/`.guides-sidebar` (Grid-Sidebar, sprengte bei
  schmaler Fensterbreite den Viewport). Fix IMMER: `min-width: 0` explizit auf JEDEM
  Flex-/Grid-Item in der Kette setzen, das schrumpfen soll - eine Ebene reicht oft nicht,
  die ganze Kette prüfen (hier: `.ncss-topbar-inner > nav` UND `.ncss-nav-list`; bei
  Grid-Layouts pragmatisch `.mein-grid > * { min-width: 0; }` auf alle Items).
- **`overflow-x: auto` clippt auch die Y-Achse mit, wenn `overflow-y` nicht separat
  gesetzt ist** (CSS-Overflow-Spec: ein Nicht-"visible"-Wert auf einer Achse zwingt die
  andere Achse ebenfalls auf einen berechneten Wert ungleich "visible"). Ein `position:
  absolute`-Kind, das über die Box hinausragen soll (z.B. ein Dropdown-Flyout unterhalb
  einer Nav-Zeile), wird dadurch unsichtbar geclippt - `position:absolute` entkommt dem
  Layout-Fluss, aber NICHT dem Clipping eines Vorfahren mit eigenem Overflow-Kontext.
  Deshalb in nav.css NICHT `overflow-x:auto` für "zu viele Nav-Punkte" verwendet, sondern
  `flex-wrap: wrap` (erzeugt gar keinen Clipping-Kontext) plus strukturell die bessere
  Lösung: viele Punkte in ein Mega-/Dropdown-Menü bündeln statt einzeln aufzulisten.
- **`position: fixed` mit nur EINER gesetzten inset-Kante schrumpft auf Inhaltsbreite.**
  `.ncss-offcanvas--start { inset-inline-start: 0; inset-inline-end: auto; }` - nur eine
  Kante gesetzt, keine zweite zum "Aufspannen". `max-width` allein deckelt das nur nach
  oben, ERZWINGT die Breite aber nicht (shrink-to-fit bleibt möglich, Ergebnis oft deutlich
  schmaler als beabsichtigt). Fix: zusätzlich eine explizite `width` setzen, nicht nur
  `max-width`.

## Bleeding-Edge-CSS: erst prüfen, dann committen (Muster, kein Einzelfall)

Bei jeder noch nicht Baseline-weiten CSS-Funktion (Container-Query-Typen, neue
Pseudoklassen, `animation-timeline` o.ä.): per WebSearch/WebFetch den AKTUELLEN Stand
prüfen (nicht aus dem Training raten), dann per `@supports`-Gate einbauen - OHNE
Unterstützung bleibt das Element im neutralen, nicht-kaputten Ausgangszustand (kein JS-
Fallback nachbauen). Konkretes Beispiel: `.ncss-hide-on-scroll` (helpers/scroll.css) nutzt
die neue `scroll-state`-Container-Query, um einen sticky Header beim Runterscrollen
auszublenden/beim Hochscrollen wieder einzublenden - komplett ohne JS. Es gibt eine ÄLTERE
Technik dafür (`@property` + `animation-timeline: scroll()`, 2024 verbreitet) mit einem
bekannten Bug (schnelles Runter-dann-Hoch-Scrollen kann den Header hängen lassen) - bewusst
NICHT als Fallback ergänzt, weil zwei konkurrierende Hacks für eine reine Zusatz-Politur
mehr Wartungslast wären, als sie wert sind. Dasselbe Abwägen gilt für jede künftige
ähnliche Situation: EINE saubere, gut-gegatete Lösung statt mehrerer sich überschneidender.

Zweites Beispiel, mit funktionierendem `@supports`-Fallback statt "kein Fallback nötig":
`.ncss-stack-section`/`.ncss-stack-stage`/`.ncss-stack-card` (components/scroll-stack.css)
- eine Vollbild-Sektion, in der Karten beim Scrollen innerhalb dieser einen Sektion
übereinander gleiten. Ein fixer `translateY`-Versatz pro Karte
(`--ncss-stack-index * --ncss-stack-fan`) liefert die Ruheposition; die eigentliche
Scroll-Animation nutzt eine benannte `view-timeline-name` auf der äußeren Sektion, jede
Karte per `animation-range` auf ihre eigene Scheibe gemappt. Kalibrierungs-Regeln:

1) Die Default-"cover"-Reichweite von `view-timeline` misst vom ersten bis letzten
   sichtbaren Pixel des Elements - bei einem vielfach bildschirmhohen Element schließt
   das eine ganze Bildschirmhöhe Entry-/Exit-Polsterung vor/nach der eigentlich gepinnten
   Phase mit ein. Fix: `view-timeline-inset: 100vh` (= Bühnenhöhe) beschneidet die
   Polsterung, erst danach fallen 0%/100% exakt mit "Bühne wird gepinnt"/"löst sich"
   zusammen.
2) Ein um den eigenen Karten-Index ZENTRIERTER `animation-range` (index-1 bis index+1)
   lässt eine Karte schon mitten in ihrer aktiven Anzeige-Phase zurückweichen. Der Bereich
   muss stattdessen AN der eigenen Scheibe beginnen (index bis index+2): die erste Hälfte
   deckt die eigene Anzeige ab, erst die zweite (deckungsgleich mit der nächsten Karte)
   weicht zurück. Karte 0 (keine eigene Ankunft nötig) bekommt einen kürzeren Keyframe-Satz
   (nur "flach → zurückweichend") statt der vollen Ankunfts-Keyframes der übrigen Karten.
3) Der Off-Stage-`translateY`-Wert für die Anfahrt-Phase muss relativ zur Kartenhöhe
   berechnet werden (`50vh + Kartenhöhe/2`), nicht als fixer Wert - sonst schiebt er eine
   hohe Karte nicht vollständig unter die Bühnen-Unterkante.

Kein `opacity`-Fade beim Andocken (eine bereits blickdichte Karte, die zusätzlich
einblendet, erzeugt eine matschige Doppelbelichtung) - reines `transform` reicht, da die
Karte dank normaler DOM-Reihenfolge ohnehin über die vorherige malt. Das gesamte
Enhancement liegt hinter `@supports (view-timeline-name: --x)` UND zusätzlich einem
eigenen `@media (prefers-reduced-motion: no-preference)`-Gate (nicht nur die globale
reset.css-Regel, da eine scroll-timeline-gekoppelte Animation keine echte Zeitdauer hat
und das globale Kappen von `animation-duration` sich hier unvorhersehbar verhalten kann).

**Wichtig für den `@supports not (...)`-Fallback:** ein Fallback, der von einem
Custom-Property-Wert abhängt, den Demos bewusst auf 0 setzen dürfen (hier
`--ncss-stack-fan`), ist kein echter Fallback. Bei der Vollbild-Variante
(`-fan: 0px`, Karten sollen die ganze Bühne füllen) ergibt der fixe `translateY`-Versatz
für JEDE Karte `translateY(0)` - ohne Scroll-Animation liegen alle Karten deckungsgleich
übereinander, nur die letzte im DOM bleibt erreichbar. Ein Fallback muss unabhängig vom
Wert der Property funktionieren: `@supports not (view-timeline-name: --ncss-stack-progress)`
schaltet die komplette Pinning-/Stapel-Mechanik ab (`height:auto`, `position:static`/
`relative`, `transform:none`) - Karten laufen dann normal im Flex-Fluss untereinander,
garantiert einzeln sichtbar, unabhängig von `--ncss-stack-fan`/`-count` oder der
horizontalen Variante.

Drittes Beispiel: `page-transitions.css` (Repo-Root, opt-in wie `theme.css`) nutzt die
bereits shippende Cross-Document-View-Transitions-API (`@view-transition { navigation:
auto; }`) - nicht die spekulative, noch unimplementierte `@navigation`/`:nav-source`-Idee
aus älteren Artikeln zum Thema (per WebFetch verifizieren, welche Technik tatsächlich
Browser-Unterstützung hat). Keine `@supports`-Absicherung nötig: eine unbekannte
`@`-Regel wird beim CSS-Parsen einfach ignoriert, ältere Browser bleiben beim normalen,
sofortigen Seitenwechsel. Trotzdem ein eigenes `@media (prefers-reduced-motion:
no-preference)`-Gate nötig (wie bei `scroll-stack.css`) - die View-Transitions-API
respektiert `prefers-reduced-motion` nicht von selbst. `view-transition-name` auf einem
wiederkehrenden Element (z.B. `.ncss-topbar`) muss auf ALLEN teilnehmenden Seiten exakt
derselbe Name sein, sonst behandelt der Browser es als zwei unabhängige Elemente
(Flackern/doppeltes Element beim Seitenwechsel).

## Icon-System (`helpers/icons.css`)

Eigene SVG-Icons als CSS `mask-image` (erben `currentColor`, kein Markup-Inhalt nötig):
`<span class="ncss-icon ncss-icon-close"></span>`. Komponenten wie `.ncss-dialog-close`
stylen nur die Fläche, nicht das Icon - austauschbar gegen z.B. Font Awesome
(`<i class="fa-solid fa-xmark">`), ohne die Komponente anzufassen. Neues Icon: eigenes SVG
als mask-image data-URI nach demselben Muster ergänzen, kein großes Set vorsorglich anlegen.

## Beim Erweitern

1. Neuer Wert gebraucht? Erst prüfen, ob ein Token in `tokens.css`/`colors.css` fehlt -
   dort ergänzen, nicht in der Komponente hart codieren, sobald ein zweiter Nutzungsort
   absehbar ist (siehe `--ncss-color-overlay`, `--ncss-font-weight-*`,
   `--ncss-focus-ring-width` als Beispiele für nachträglich zentralisierte Werte).
2. Neue Komponente: eigene Datei unter `components/`, Import in `ncss.css` im Layer
   `components`, ausschließlich `var(--ncss-*)`.
3. Neue Web-Awesome-Komponente einbinden: zuerst im kompilierten Source nachsehen, welche
   `--wa-color-*`/`--wa-*`-Variablen sie tatsächlich nutzt (nicht der Doku vertrauen, siehe
   Fallstrick 1), dann in `webawesome-bridge.css` ergänzen.
4. Nach jeder nicht-trivialen Änderung: lokalen PHP-Server starten
   (`php -S 127.0.0.1:PORT -t public/ncss`), mit Playwright öffnen, Screenshot + computed
   styles prüfen - PFLICHT für alles, was Dark Mode oder Web Awesome betrifft.
5. VOR einer neuen Komponente prüfen, ob eine bestehende das schon kann - Beispiel: eine
   "Callout/Note"-Box war fast als eigene `components/callout.css` gebaut worden, bis sich
   zeigte, dass `.ncss-card--brand/-success/-warning/-danger` (100-Fläche + farbiger Rand,
   `components/card.css`) exakt dasselbe Ergebnis liefert - schon vorhanden, nur bislang
   nicht als "Callout" beworben. Erst grep über bestehende Klassen/Kommentare, dann neu
   bauen. `.ncss-text-lead`/`.ncss-eyebrow` (helpers/typography.css) sind das Gegenbeispiel
   - beide waren als lokale Demo-Klasse (`.demo-lead`, `.demo-eyebrow`) mehrfach dupliziert,
   also tatsächlich eine echte Lücke, jetzt als eine Klasse zentralisiert.

## Demo-Seiten (public/ncss/demo/)

`index.html` (Kitchen-Sink), `navigation.html` (Dropdowns/Mega-Menü/Tree), `forms.html`
(Switch/Range), `media.html` (Video), `landing.html` (realistische Beispielseite, NativeCSS +
Web Awesome + Font Awesome im Zusammenspiel, u.a. `<wa-dropdown>` als Menü statt nativem
`<details>`), `effects.html` (Glow-Border/-Pulse, Glass, Stamped, Grain), `theming.html`
(`theme.css` live am Beispiel). Das ausführliche Handbuch ist keine Demo-Seite mehr,
sondern die eigene Doku-Website unter `docs/` (siehe Fallstrick 35). Jede Demo-Seite
bindet `../dist/ncss.css` ein und trägt ihr eigenes, seitenspezifisches CSS in einem
eigenen `<style>`-Block mit `demo-*`-Präfix - nie in den ncss-Dateien selbst.

**Nav-Konvention (User-Anstoß: "startseite soll übrigens immer die page startseite
sein")**: der `.ncss-topbar-brand`-Link ("NativeCSS"-Wortmarke) geht auf JEDER Seite
(alle `demo/*.html` UND die Doku-Website) zu `product.html` - der tatsächlichen
Startseite/Marketingseite, die als Site-Wurzel deployed wird (siehe
[Architektur](#architektur) im README). NICHT zu `demo/index.html` (das ist nur die
Komponenten-Kitchen-Sink, eine Demo-Seite unter vielen, keine Startseite) und NICHT zu
`#main` (Selbst-Skip-Link). War vor diesem Fix uneinheitlich (13 von 17 Demo-Seiten
zeigten fälschlich auf `index.html`, zwei auf `#main`) - bei jeder neuen Demo-Seite
diese Konvention direkt korrekt anlegen: `<a class="ncss-topbar-brand"
href="product.html">NativeCSS</a>`, außer auf `product.html` selbst (dort
selbstreferenzierend `href="product.html"`). Der separate Nav-Punkt "Komponenten" (linkt
weiterhin zu `index.html`) bleibt davon unberührt - nur der Logo-Link folgt dieser Regel,
nicht jeder Verweis auf die Komponenten-Übersicht.
