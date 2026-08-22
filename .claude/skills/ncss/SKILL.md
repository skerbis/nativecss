---
name: ncss
description: Arbeiten mit dem ncss Design System (public/ncss/) - natives CSS, kein Build-Schritt, Web-Awesome/Font-Awesome-Bridge. Beim Anlegen/Ändern von Tokens, Komponenten, Demo-Seiten oder der Web-Awesome-Bridge unter public/ncss/ verwenden.
---

# ncss Design System

`public/ncss/` ist ein eigenständiges, natives CSS-Design-System - kein UIkit-Erbe, kein
LESS/Sass, kein Build-Schritt. Web Awesome (Free) und Font Awesome (Free) sind selbst
gehostet unter `public/ncss/vendor/` und über `webawesome-bridge.css` an ncss-Tokens
gekoppelt. Das vollständige Handbuch (dogfooded, im Browser lesbar) liegt unter
`public/ncss/demo/docs.html` - dieses Skill-Dokument ist die kondensierte Fassung für
schnelle Arbeit plus die Fallstricke, die man sich sonst mühsam erneut erarbeiten müsste.

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

**Theme-Anpassung läuft über `theme.css`** (Repo-Root, NACH `ncss.css` laden) - eine
einzige, bewusst UNLAYERED Datei mit allen wichtigen Seed-Werten (Markenfarben,
Grundflächen, Schriften, Radien, Schatten, Bewegung). Unlayered CSS gewinnt immer gegen
jede Layer-Regel (siehe oben), kein `!important` nötig. Bei neuen Tokens in
`tokens.css`/`colors.css` prüfen, ob es ein SEED-Wert ist (gehört dann auch in
`theme.css`) oder ein daraus ABGELEITETER Wert (color-mix()-Skalenstufe o.ä. - gehört
NICHT in `theme.css`, zieht automatisch mit). Demo: `demo/theming.html`.

## Bekannte Fallstricke (per echtem Test gefunden - vor erneuter Recherche hier nachsehen)

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
    Elements** - erster Versuch für `.ncss-glow-border` war ein `::before` mit
    `z-index: -1` als "Rahmen dahinter", das Element selbst sollte die Mitte mit seiner
    eigenen `background-color` abdecken. Falsch: laut CSS-Stacking-Reihenfolge (Anhang E)
    malt der eigene Hintergrund des Elements ALS ERSTES, negative z-index-Nachfahren malen
    danach, also OBEN DRAUF - der "Rahmen" überdeckte die komplette Fläche statt nur den
    Rand (per Screenshot-Review gefunden, sah aus wie ein voll gefülltes Rechteck statt
    eines Rings). Fix: kein `z-index`-Trick, sondern ein echtes "Loch" in die `::before`-Box
    maskieren - `padding: <dicke>` erzeugt die Ringstärke, `mask-composite: exclude`
    (`-webkit-mask-composite: xor` für Safari, andere Wertsyntax) schneidet die
    `content-box` aus der vollen Box heraus, übrig bleibt nur der Ring, die Mitte bleibt
    vollständig transparent (kein Farbwert, der zufällig passen müsste).

19. **Gefülltes Neumorphism (Schatten aus `color-mix()` der eigenen Hintergrundfarbe
    abgeleitet) braucht eine MITTELTON-Basisfarbe und wird schnell zur "schwebenden Karte"
    statt einer feinen Prägung** - `.ncss-stamped` ging zwei Anläufe: Anlauf 1 leitete
    Schatten per `color-mix()` aus `--ncss-color-bg` (reines `#fff`) ab - von Weiß Richtung
    Weiß gemischt gibt es keinen Spielraum mehr nach oben, der helle Anteil verschwand
    komplett, übrig blieb nur ein normaler Drop-Shadow (User-Feedback: "muss ganz fein
    sein, wie eine Prägung"). Anlauf 2 (großflächiger Blur, nur auf `--ncss-color-bg-subtle`
    umgestellt) wirkte selbst mit Mittelton-Fläche und feinerem Blur noch zu sehr nach
    "Karte", nicht nach graviertem Material (User: "Hintergrundfarbe weiß, nur der Rahmen
    soll zu sehen sein"). Endgültiger Ansatz: KEINE gefüllte Fläche mehr, sondern dieselbe
    Masken-Ring-Technik wie `.ncss-glow-border` (Punkt 18) - ein `::before` mit
    `mask-composite: exclude` zeichnet nur einen hauchdünnen Rahmen, per
    `linear-gradient(135deg, dunkel, transparent, hell)` diagonal von dunkel nach hell statt
    eines rotierenden `conic-gradient()`. Funktioniert dadurch auf JEDER Hintergrundfarbe
    inkl. reinem Weiß, weil keine Hintergrundfarbe mehr abgeglichen werden muss - die
    Ring-Technik war die eigentlich richtige Lösung von Anfang an, nicht die
    Neumorphism-Variante mit gefüllter Fläche.

20. **Eine per `color-mix()` aus einem Seed-Wert ABGELEITETE Custom Property wird nur EINMAL
    berechnet (dort, wo sie deklariert ist), dann als fertiger Wert vererbt - ein tiefer im
    Baum überschriebener Seed-Wert lässt eine bereits vererbte Ableitung NICHT neu
    rechnen.** Bei `theme.css` (siehe README "Theme anpassen") lokal auf ein Element statt
    auf `:root` angewendet (Demo: `demo/theming.html`) reagierte `.ncss-btn--primary`
    korrekt auf ein überschriebenes `--ncss-color-brand` (nutzt den Seed-Wert direkt), aber
    `.ncss-badge` blieb bei der alten Farbe (nutzt `--ncss-color-brand-100`/`-on-soft`, die
    per `color-mix()` aus `--ncss-color-brand` ABGELEITETE Skala aus `colors.css`) - per
    `getComputedStyle` bestätigt: der geerbte Wert von `--ncss-color-brand-100` enthielt
    noch immer den ALTEN, globalen `--ncss-color-brand`-Wert fest eingebacken (als String
    sichtbar: `color-mix(in oklch, light-dark(#0057d8, ...) ...)`), obwohl der Seed selbst
    lokal auf einen anderen Wert überschrieben war. Ursache: `--ncss-color-brand-100` ist
    nur EIN EINZIGES MAL deklariert (auf `:root`) - jedes Element, das sie nicht selbst neu
    deklariert, erbt genau DIESEN einen, am `:root` berechneten Wert, unabhängig davon, was
    weiter unten im Baum mit `--ncss-color-brand` passiert. Betrifft NUR lokal/nicht-`:root`
    angewendete Theme-Overrides - ein echtes `theme.css` auf `:root` hat dieses Problem
    nicht (dort WIRD die ganze abgeleitete Skala frisch berechnet, weil `:root` die
    Deklarationsstelle selbst ist). Für ein lokal begrenztes Theme, das auch abgeleitete
    Farben treffen soll, bräuchte man die komplette Skala (`-100`/`-300`/`-700`/`-900`/
    `-on-soft`) zusätzlich an derselben Stelle neu deklarieren - nicht automatisch, kein
    Workaround dafür eingebaut.

21. **`backdrop-filter` (wie `filter`/`transform`/`perspective`/`will-change`) erzeugt per
    Spec einen NEUEN CONTAINING BLOCK für `position:fixed`-Nachfahren - auf einem Element
    mit einer Floating-UI-Komponente (`<wa-dropdown>`/`<wa-popover>`/o.ä., intern
    typischerweise `position:fixed` relativ zum VIEWPORT) als Nachfahre zuckt deren Popup
    sichtbar beim Scrollen.** `.ncss-glass` auf `<header class="ncss-topbar">` in
    `demo/landing.html` gesetzt (das `<wa-dropdown>` "Mehr"-Menü ist ein Nachfahre) -
    User-Report: "Dropdown im Menü zuckelt, wenn geöffnet und Seite wird gescrollt". Per
    echtem Test bestätigt: `getBoundingClientRect()` des Dropdown-Items blieb bei
    diskreten Scroll-Schritten zwar stabil (kein grober Sprung), das eigentliche
    Zuckeln ist ein feineres Timing-Problem zwischen der eigenen Scroll-Neuberechnung des
    Popups (nimmt Viewport-relative `position:fixed` an) und dem durch `backdrop-filter`
    tatsächlich verschobenen Containing Block. **Erster Fix-Versuch verworfen**:
    `backdrop-filter` von `.ncss-glass` selbst auf ein `::before` verlagern - kollidiert
    mit `.ncss-glow-border`, das ebenfalls `::before` braucht (dokumentierte Kombination
    "Glass + Glow-Border" in `demo/effects.html`, Karte 3) - ein Element hat nur EIN
    `::before`. Tatsächlicher Fix: `.ncss-glass` unverändert lassen (kein Pseudo-Element-
    Ansatz), stattdessen an der VERWENDUNGSSTELLE ein eigenes, rein dekoratives Element
    (`.landing-topbar-backdrop`, absolut positioniert, `z-index:-1`) VOR dem eigentlichen
    Nav-Inhalt einfügen statt `.ncss-glass` direkt auf den Nav-Container zu setzen -
    trennt die Filter-Fläche vom Element, das die Floating-UI-Komponente enthält, ganz
    ohne die Komponente selbst zu ändern. Regel für künftige Verwendung: `.ncss-glass`
    NIE direkt auf ein Element mit `<wa-dropdown>`/`<wa-popover>`/`<dialog>` o.ä. als
    Nachfahre setzen.

    **Nachtrag 1 (User-Report nach dem Fix, eingegrenzt auf Safari/WebKit):** Der spec-
    basierte Containing-Block-Fix oben behebt das Zucken in Chromium UND Playwrights
    WebKit-Build nachweisbar (120 rAF-Positions-Samples + Video-Frame-Extraktion während
    echtem Scroll, beides absolut stabil, keine Abweichung). Zwischenzeitliche Vermutung:
    Safari/WebKit hat zusätzlich einen bekannten, rein ENGINE-seitigen Bug (`backdrop-
    filter` in der Nähe von sticky/fixed-Inhalt verursacht Repaint-Artefakte an Nachbar-
    Elementen) - `transform: translateZ(0)` auf `.landing-topbar-backdrop` als Mitigation
    versucht (eigene Compositor-Ebene erzwingen).

    **Nachtrag 2 (entscheidender Hinweis vom User): dasselbe Glitchen trat AUCH beim
    Glocken-`<wa-popover>` auf** - einer völlig anderen Komponente, ohne jede Nähe zum
    Glass-Hintergrund. Das widerlegt die backdrop-filter-Theorie als (alleinige) Ursache:
    beide Floating-Komponenten sitzen im selben `position:sticky`-Header, das ist der
    tatsächliche gemeinsame Nenner. Web Awesomes Popup-Baustein hält ein offenes Panel
    ABSICHTLICH während des Scrollens am Anker positioniert (siehe vendor/webawesome/
    dist-cdn/skills/webawesome/references/components/popup.md: "keep them positioned
    together as the page scrolls") - kombiniert mit einem `position:sticky`-Anker (dessen
    Bildschirmposition sich technisch nicht ändert, aber jeden Scroll-Tick trotzdem neu
    berechnet wird) und dem lange dokumentierten iOS-Safari-Bug bei Z-Index-Reihenfolge
    rund um `position:fixed`-Elemente beim Scrollen (User verlinkte
    https://css-tricks.com/forums/topic/safari-for-ios-z-index-ordering-bug-while-scrolling-a-page-with-a-fixed-element/)
    ergibt das ein bekanntes, NICHT per eigenem CSS behebbares Rendering-Problem der
    Browser-Engine, kein ncss-Bug.

    Endgültiger Fix statt weiterer CSS-Mitigation: `components/wa-close-on-scroll.js`
    (neu, opt-in wie `command-fallback.js`) - schließt jedes offene
    `<wa-dropdown>`/`<wa-popover>` sobald gescrollt wird (`el.open = false`, beide haben
    eine reflektierte `open`-Property). Kämpft nicht gegen das Positionierungs-/
    Rendering-Problem an, sondern umgeht es komplett - dasselbe verbreitete Muster wie
    bei den meisten Mega-/Dropdown-Menüs anderer Sites. Eingebunden auf
    `demo/landing.html` und `demo/webawesome.html` (die einzigen Seiten mit
    `<wa-dropdown>`/`<wa-popover>`). `.ncss-glass` auf der Landingpage-Topbar war
    zwischenzeitlich probeweise entfernt worden, war aber nachweislich nie die
    eigentliche Ursache (siehe oben) - mit `wa-close-on-scroll.js` als tatsächlichem Fix
    wieder eingesetzt, im selben sicheren Muster wie zuvor (eigenes dekoratives
    Element, kein direkter Vorfahre des Dropdowns, siehe Punkt 21 oben).

22. **`getComputedStyle(el).getPropertyValue("--x")` liefert bei einem CUSTOM PROPERTY nur
    den roh gespeicherten Token-Text zurück, KEINE aufgelöste Farbe** - anders als beim
    Lesen einer echten Farb-Eigenschaft (`color`/`background-color`/...), die `var()` UND
    Funktionen wie `light-dark()` bereits fertig auflöst. Bei `--ncss-color-brand: light-
    dark(#0057d8, #6ea8ff)` lieferte `getPropertyValue("--ncss-color-brand")` buchstäblich
    den String `"light-dark(#0057d8, #6ea8ff)"` zurück - ein direkt darauf angewendeter
    `rgb(...)`-zu-Hex-Regex (für die Vorbelegung eines `<input type="color">`-Reglers im
    Live-Farbeditor, `demo/colors.html`) extrahierte daraus wahllose Ziffernfolgen und
    ergab einen bedeutungslosen Hex-Wert (`#390806` statt des tatsächlichen `#0057d8`) -
    kein Fehler/keine Exception, nur ein falscher, aber gültig aussehender Hex-String, per
    echtem Test (Screenshot des Reglers) gefunden. Fix: ein unsichtbares Sonden-Element
    (`display:none`, einmalig erzeugt und wiederverwendet) mit `el.style.color =
    "var(--x)"`, danach `getComputedStyle(el).color` lesen - das ZWINGT die tatsächliche
    Auflösung (inklusive `light-dark()`, abhängig vom aktuell aktiven `[data-theme]`/
    `prefers-color-scheme`), liefert ein echtes `rgb(...)`. Gilt für JEDE Custom Property,
    die eine Farbfunktion (`light-dark()`, `color-mix()`, o.ä.) enthält - ein einfacher
    Hex-Literal-Wert als Custom Property würde dagegen wortwörtlich unverändert
    zurückkommen und bräuchte diesen Umweg nicht, aber das im Vorfeld zu unterscheiden ist
    unnötiger Aufwand - die Sonden-Technik funktioniert für beide Fälle gleichermaßen.

23. **`flex-wrap: wrap` auf den KINDERN eines flex-Containers reicht nicht, wenn der
    CONTAINER SELBST wiederum ein `flex: 0 0 auto`-Kind eines äußeren Flex-Layouts ist** -
    `.ncss-topbar-actions` (components/topbar.css) ist bewusst `flex: 0 0 auto` (schrumpft
    nie), reichte bei zwei Buttons auf `demo/colors.html` bislang aus. Ein dritter Button
    (Live-Farbeditor-Trigger) ließ die Topbar bei 375px Breite um 188px überlaufen -
    `flex-wrap: wrap` NUR auf `.ncss-topbar-actions` selbst gesetzt (ohne eigene
    `flex-basis`) änderte am Overflow NICHTS, per echtem Regressions-Test bestätigt
    (exakt derselbe 188px-Wert vor und nach dem Versuch). Ursache: ein flex-Item mit
    `flex: 0 0 auto` bemisst seine eigene Breite am MAX-CONTENT (so breit, wie alle
    eigenen Kinder NEBENEINANDER bräuchten) - das interne `flex-wrap` der Kinder wird nur
    ausgelöst, wenn der Container selbst schon auf eine BEGRENZTE Breite gezwungen ist,
    was `flex:0 0 auto` gerade verhindert (das ist ja sein ganzer Zweck: nie schrumpfen).
    Fix (nur lokal auf `demo/colors.html` per `@media (max-width: 30rem)`, NICHT die
    geteilte Komponente global geändert): zusätzlich `flex: 1 1 100%` auf
    `.ncss-topbar-actions` - zwingt die Breite auf die volle verfügbare Zeile (die selbst
    dank `.ncss-topbar-inner`s eigenem `flex-wrap:wrap` umbrechen darf), erst INNERHALB
    dieses dadurch begrenzten Rahmens greift das `flex-wrap` der drei Buttons. Lehre: bei
    einer verschachtelten Flex-Struktur IMMER prüfen, auf welcher EBENE `flex-wrap`
    tatsächlich etwas bewirken kann - es wirkt nur auf einen Container, dessen eigene
    Breite bereits begrenzt ist, nicht automatisch auf jeden beliebigen Vorfahren mit
    `display:flex`.

24. **Eine ECHTE Produktseite (`index.html`, Repo-Root) mit eigener, kräftiger Marken-
    farbe als `--ncss-color-bg` (nicht die übliche fast-weiße Fläche) deckte gleich
    mehrere Landminen auf einmal auf, die eine gewöhnliche Demo-Seite nie berührt -
    volle Details in README "Produktseite (index.html)", hier nur die übertragbaren
    Lehren:
    - Farb-Kontrast-Fixes NICHT stärker als nötig ausfallen lassen: ein erster Versuch
      dunkelte den Hero/CTA-Hintergrund per Scrim/Verlauf ab, um von 2.94:1 auf AA-Niveau
      zu kommen - der User wollte lieber die REINE angefragte Farbe behalten, auch mit
      knapperer Marge. Kontrast-Fixes sind ein Trade-off, keine automatische Pflicht -
      im Zweifel den User entscheiden lassen, welche Seite der Abwägung er will.
    - Eine Komponente mit EIGENEM, undurchsichtigem `background-color` (hier
      `.ncss-topbar`, siehe topbar.css) macht einen Glass-Backdrop-Trick dahinter
      wirkungslos, selbst wenn die z-index-Mechanik selbst korrekt sitzt (Fallstrick 18)
      - die Eigenfläche der Komponente muss zusätzlich explizit transparent gesetzt
      werden, nicht nur ein Backdrop-Element davor/dahinter platziert.
    - Ein Element, das für ZWEI verschiedene Kontexte wiederverwendet wird (hier
      `.ncss-nav-list`: Desktop-Inline via `display:contents` am `<dialog>`-Wrapper
      versus echtes Mobile-Off-Canvas-Panel darunter, siehe nav.css), braucht Farb-
      Overrides GENAU in derselben Breakpoint-Grenze wie die Komponente selbst - ein
      pauschaler Override ohne Media Query trifft zwangsläufig auch den Kontext, für den
      er nie gedacht war (hier: weißer Text im weißen Off-Canvas-Panel).
    - `:hover`/`:focus-visible`-Zustände einer Komponente SEPARAT gegen den jeweiligen
      Hintergrund prüfen, nicht nur den Ruhezustand - eine Komponente ändert im Hover oft
      ihre eigene Hintergrundfarbe (hier: `.ncss-nav-item > a:hover` setzt `--ncss-color-
      bg-subtle`), wodurch ein für den Ruhezustand korrekter Text-Override im Hover
      plötzlich wieder unlesbar wird.
    - Ein `<ul>` mit eigenem `::before`-Aufzählungspunkt braucht trotzdem explizit
      `list-style:none` - base.css setzt das nur für `role="list"`, ohne das zeigt der
      Browser seinen NATIVEN Bullet zusätzlich zum eigenen an (zwei Punkte nebeneinander).
    Übergreifende Lehre aus der ganzen Serie: bei einer NEUEN, farblich kräftigen Marke
    reicht es nicht, nur die offensichtlichen Textblöcke zu prüfen - JEDE Kombination aus
    Text-Rolle (Überschrift/Eyebrow/Muted/Button/Nav/Hover) und JEDEM Hintergrund, auf dem
    sie tatsächlich landet (inkl. Zustands-Wechsel wie Hover und unterschiedlicher
    Layout-Kontexte wie Mobile-Off-Canvas), einzeln durchgehen - genau das hat der User
    wiederholt eingefordert ("gehe bitte noch mal alles durch, stile müssen immer auf ihre
    hintergründe passen") und war nötig, weil jede einzelne Kombination ihre EIGENE,
    unabhängige Bruchstelle haben kann.

Viertes Beispiel, diesmal EIN Feature (`animation-timeline: view()`), aber DREI getrennte
Kalibrierungs-Bugs, alle erst durch echten Test bzw. echtes User-Feedback gefunden, nicht
beim Schreiben selbst sichtbar - und ein Lehrstück darin, wie zwei oberflächlich ähnlich
klingende User-Reports ("Linie nicht durchgezogen") tatsächlich VÖLLIG verschiedene
Ursachen hatten, die NACHEINANDER, nicht gleichzeitig gefunden wurden (voreiliges
"dieselbe Ursache"-Schließen beim ersten Report war ein eigener Fehler, siehe Punkt 3):
`.ncss-roadmap` (components/roadmap.css) - eine
Meilenstein-Liste, verbunden durch EINE durchgehende SVG-Linie, die sich beim Scrollen
selbst "nachzeichnet" (`stroke-dasharray`/`-dashoffset`, `pathLength="1"` auf dem
`<line>`-Element normiert die Pfadlänge unabhängig von der viewBox auf 0..1). Anders als
`scroll-stack.css` KEIN Pinning - die Meilensteine laufen ganz normal im Fluss, nur die
Linie selbst bekommt eine eigene, ANONYME `view()`-Timeline (kein benannter
`view-timeline-name` nötig, da kein gepinntes Element mit künstlicher Extra-Scrollhöhe
existiert - der natürliche Ein-/Austritts-Scrollweg der Linie IST bereits genau der
gewünschte Zeichenweg).
1) **Falscher `animation-range`-Default für ein Element nahe dem Seitenende**: Der
   Default-Bereich "cover" (0% = erster sichtbarer Pixel, 100% = Element VOLLSTÄNDIG aus
   dem Viewport verschwunden) verlangt für 100%, dass die Linie komplett über den oberen
   Bildschirmrand hinauswandert - das braucht rechnerisch ungefähr Linienhöhe +
   Viewporthöhe an Scrollweg NACH Erscheinen der Linie. Steht die Roadmap (wie in der
   Praxis üblich für ein Meilenstein-Element) kurz vor dem Footer, ohne große Pufferzone
   danach, reicht der tatsächlich vorhandene Rest-Scrollweg der Seite dafür NICHT aus -
   `document.body.scrollHeight` gibt die tatsächliche Grenze vor, unabhängig davon, was
   die Timeline-Berechnung bräuchte. Per echtem Test bestätigt (Scroll bis
   `document.body.scrollHeight`, `getComputedStyle().strokeDashoffset` ausgelesen): blieb
   bei `cover` dauerhaft auf ca. 0.27 statt 0 stehen, sichtbar als abgeschnittene Linie
   kurz vor dem letzten Punkt, obwohl die letzte Karte längst voll sichtbar war
   (Screenshot bestätigte die Lücke). Mehrere benannte Bereiche systematisch per Playwright
   durchgetestet (`cover`, `contain`, `entry`, verschiedene explizite Prozent-Kombinationen)
   statt eine Vermutung zu übernehmen - `contain` traf exakt: fertig gezeichnet, sobald die
   letzte Karte gerade voll sichtbar wird, unabhängig vom Rest-Scrollweg danach. Lehre:
   der "cover"-Default ist nur dann die richtige Wahl, wenn tatsächlich genug Scrollweg
   existiert, damit das Element vollständig austritt (z.B. mitten auf einer langen Seite)
   - für ein Element nahe dem Seitenende (sehr verbreitet bei Roadmap-/Timeline-Mustern)
   IMMER zuerst per echtem Scroll-bis-zum-Ende-Test prüfen, nicht annehmen.
2) **`ul`/`ol` bekommen per `base.css`-Default ein eigenes `padding-inline-start`** (Listen-
   Einzug, `ul, ol { padding-inline-start: var(--ncss-space-md); }`) - `.ncss-roadmap-list`
   ist ein `<ol>` und erbte diesen Einzug zusätzlich zum eigenen, komponenteneigenen
   `--ncss-roadmap-gutter`-Versatz auf `.ncss-roadmap-item`. Die Linie selbst (`position:
   absolute` relativ zu `.ncss-roadmap`, dem ÄUSSEREN Container, NICHT zur Liste) blieb an
   ihrer korrekt berechneten Stelle stehen, während jedes Listenelement (und damit sein
   `.ncss-roadmap-dot`, positioniert relativ zum eigenen `<li>`) durch den zusätzlichen
   Listen-Einzug nach rechts verschoben war - Punkte lagen sichtbar NEBEN statt AUF der
   Linie (User-Report: "Punkte liegen nicht auf den Linien"). Per `getBoundingClientRect()`
   beider Elemente bestätigt: Punkt-Mittelpunkt und Linien-X-Position stimmten nach dem Fix
   exakt überein (`78.875px` bei beiden). Lehre: bei JEDER neuen Komponente, die
   `<ul>`/`<ol>` für eigenes, freies Positionieren (nicht als normale Aufzählung)
   verwendet, explizit `padding-inline-start: 0` setzen - der globale Listen-Einzug aus
   base.css gilt sonst automatisch mit, auch wenn die Komponente ihn nie selbst
   referenziert.
3) **VOREILIGER Fehlschluss, dann die eigentliche Ursache**: Dasselbe erste User-Feedback
   nannte ZUSÄTZLICH "Linien sind nicht durchgezogen" - fälschlich als bloßen optischen
   Nebeneffekt derselben Punkt-Verschiebung (Punkt 2) eingeordnet, statt es separat zu
   verifizieren. Nach dem Push meldete der User erneut "roadmap linien sind immer noch
   unterbrochen" UND "die Linien zeichnen sich aber sie verbinden sich nie" - stellte sich
   als eigenständiger, dritter Bug heraus: `vector-effect: non-scaling-stroke` auf dem
   `<line>`-Element (ursprünglich gedacht, um die Strichbreite gegen die durch
   `preserveAspectRatio="none"` nicht-uniform gestreckte viewBox konstant zu halten) UND
   `pathLength="1"` (normiert die Pfadlänge für `stroke-dasharray`/`-dashoffset` auf 0..1)
   vertragen sich NICHT: `non-scaling-stroke` berechnet laut Spec das gesamte
   Stroke-Rendering - INKLUSIVE des Dash-Musters - in einem von der viewBox-Streckung
   ENTKOPPELTEN Koordinatensystem, wodurch das per `pathLength` normierte
   `stroke-dasharray:1` nicht als "gesamte Pfadlänge" interpretiert wurde, sondern als ein
   viel kleinerer, sich ständig WIEDERHOLENDER Strich-Lücke-Zyklus (~180px-Periode über
   die gesamte Linie verteilt) - sichtbar als klar erkennbares Muster aus kurzem
   sichtbaren Stück, Lücke, sichtbarem Stück, Lücke... statt EINER durchgehenden Linie.
   Gefunden per systematischem Pixel-Scan (Screenshot einer festen Spalte an der
   Linien-X-Position, Farbübergänge Y-Position für Y-Position ausgelesen) bei MEHREREN
   statischen `stroke-dashoffset`-Werten UND bei ausgeschalteter Animation - das
   Wiederholungsmuster blieb bei JEDEM Wert identisch (bewies: kein Animations-/
   Timing-Bug, ein rein strukturelles Rendering-Problem). Fix: `vector-effect:
   non-scaling-stroke` komplett entfernt - für eine rein VERTIKALE Linie (x1=x2) ist die
   Strichbreite ohnehin entlang der X-Achse gemessen, und GENAU die X-Achse wird von
   `preserveAspectRatio="none"` gar nicht gestreckt (nur die Y-Achse) - die Eigenschaft war
   also nicht einmal für ihren ursprünglichen Zweck nötig, geschweige denn ihren
   tatsächlichen Nebeneffekt wert. Nach Entfernen: derselbe Pixel-Scan zeigt EINEN
   durchgehenden Lauf pro Kartenabstand (nur die kleinen, gewollten ~20px-Lücken exakt an
   den Punkt-Positionen durch deren `box-shadow`-Ring), in Chromium UND Playwright-WebKit
   gegengeprüft. Lehre: bei JEDER Kombination aus `pathLength` (Pfadlängen-Normierung) und
   `vector-effect: non-scaling-stroke` (eigenes, entkoppeltes Koordinatensystem für den
   Strich) auf ein-und-demselben Element besonders misstrauisch sein - beide wollen
   bestimmen, in welchem Koordinatensystem strichbezogene Längen (Breite UND Dash-Muster)
   berechnet werden, und sind nicht für die Kombination miteinander gedacht. Und generell:
   ein erster, naheliegend klingender Erklärungsversuch für ein User-Feedback ("ist sicher
   dieselbe Ursache wie X") ersetzt NICHT die eigene Verifikation - hier hätte ein einziger
   Pixel-Scan schon beim ersten Report die zweite, echte Ursache sofort sichtbar gemacht,
   statt sie erst nach einer weiteren Push-Runde vom User erneut gemeldet zu bekommen. Auch
   via `file://` (nicht nur über den lokalen PHP-Server) nachverifiziert, dass die Linie
   korrekt rendert (reines CSS/SVG, keine ES-Module wie Web Awesome betroffen - Fallstrick
   3 unten gilt nur für JS-Module, nicht für CSS/SVG).
4) **Funktional korrekt, aber optisch bedeutungslos**: Nach Fix von Punkt 3 zeichnete sich
   die Linie technisch einwandfrei nach - trotzdem User-Feedback: "das stimmt nicht und
   ist eigentlich sinnfrei ... jetzt ist sie einfach durchgezogen". Ursache: EINE
   einfarbige Linie (gedämpftes Grau, `--ncss-color-border`) macht den Zeichen-Effekt kaum
   wahrnehmbar - der "noch nicht gezeichnete" Teil ist per Dash-Lücke unsichtbar und
   verschmilzt optisch mit dem ohnehin weißen Seitenhintergrund, der bereits gezeichnete
   Teil sieht dabei genauso aus wie eine ganz gewöhnliche, längst fertige graue Linie -
   fürs Auge ändert sich beim Scrollen praktisch nichts Erkennbares. Lehre: bei einem
   "Reveal on scroll"-Effekt reicht es NICHT, dass der Übergang technisch (Dashoffset)
   korrekt animiert - der VERBORGENE Zustand muss sich auch farblich/optisch klar vom
   ENTHÜLLTEN Zustand unterscheiden, sonst ist der Fortschritt unsichtbar. Fix (User-Idee):
   ZWEI `<line>`-Elemente statt einer - ein statischer, immer voll sichtbarer `-track` in
   gedämpftem Grau UND eine markenfarbene `-progress`-Linie exakt darüber, die weiterhin
   per `stroke-dasharray`/`-dashoffset` + `pathLength="1"` nachgezeichnet wird (NUR die
   Progress-Linie braucht `pathLength`, der Track hat keine Dash-Animation). Ergebnis: ein
   klassisches (nur vertikales) Fortschrittsbalken-Muster - der Farbkontrast macht
   sichtbar, wie weit der markenfarbene Teil beim Scrollen "vorankommt", während der graue
   Rest als Vorschau auf noch Kommendes sichtbar bleibt. Baseline (kein `view()`-Support)
   profitiert nebenbei: die Progress-Linie ist dort einfach von Anfang an voll gezeichnet
   und deckt den Track komplett ab, ergibt eine durchgehend markenfarbene (statt zuvor
   grauen) Linie - eine optische Verbesserung, kein reiner Kompromiss.
5) **NUR in echtem Safari reproduzierbar (wieder das Muster aus Punkt 21 weiter unten) -
   die Zwei-Linien-Lösung aus Punkt 4 sah in Chromium UND Playwright-WebKit einwandfrei
   aus (per Pixel-Scan bestätigt), User meldete danach trotzdem "in chrome geht es"
   (impliziert: woanders nicht) und schließlich "jetzt is es nur ne blaue linie" -
   nachgefragt per AskUserQuestion, welcher Browser betroffen ist: Safari 26.5.2. Laut
   WebSearch unterstützt Safari `animation-timeline: view()` erst seit Version 26 - 26.5.2
   MÜSSTE es also eigentlich unterstützen (kein reiner Baseline-Fallback-Fall), User
   bestätigte zusätzlich "in chrome geht es" (per direktem Vergleich). Ursache (nicht in
   echtem Safari nachvollzogen, da nicht verfügbar - per Fachwissen zu Paint- vs.
   Compositor-Eigenschaften hergeleitet UND durch die anschließende Lösung indirekt
   bestätigt, da das Problem danach verschwand): `stroke-dashoffset` ist eine
   PAINT-Eigenschaft - jede Wertänderung erzwingt ein echtes Neuzeichnen der
   SVG-Geometrie, anders als `transform`/`opacity`/`scale` (COMPOSITOR-Eigenschaften, ohne
   Repaint pro Frame interpolierbar). Scroll-getriebene Animationen sind technisch am
   zuverlässigsten über GENAU diese Compositor-Eigenschaften - eine über `view()`
   angesteuerte Paint-Eigenschaft ist ein bekannt riskanteres Pflaster, das nicht jede
   Engine gleich zuverlässig pro Scroll-Frame nachzieht (Chromium tut es hier
   offensichtlich, Safari 26.5.2 laut User-Report nicht spürbar). Fix: komplette
   Umstellung von SVG (`<line>` + `stroke-dasharray`/`-dashoffset` + `pathLength`) auf
   zwei einfache `<div>`s + `scale` (Y-Achse, `transform-origin: top`) - exakt dieselbe,
   bereits in `scroll-progress.css` bewährte Technik (dort horizontal), nur vertikal
   gespiegelt. Kein SVG, kein `pathLength`, kein `vector-effect` mehr nötig - dadurch auch
   strukturell einfacher als der SVG-Anlauf, nicht nur robuster. Lehre: bei
   scroll-getriebenen Animationen IMMER zuerst prüfen, ob sich der Effekt über
   `transform`/`opacity`/`scale`/`filter` erreichen lässt, bevor eine Paint-Eigenschaft
   (Farben, `stroke-*`, `width`/`height`, `clip-path` mit komplexen Formen o.ä.) animiert
   wird - insbesondere wenn der Ziel-Effekt (hier: "eine Linie zeichnet sich") sich
   genauso gut über eine geometrisch simple, compositor-freundliche Alternative bauen
   lässt (ein rechteckiger Balken mit `scale` statt einer SVG-Linie mit Dash-Muster).
   Danach EIN letztes Feintuning per User-Feedback ("geht jetzt aber ich finde es geht zu
   schnell ans ende"): reines `animation-range: contain` blieb bis ca. 35%
   Scroll-Fortschritt bei 0 stehen, zog dann sehr steil auf 100% hoch (nur ca. 40% der
   Gesamt-Scrollstrecke) und blieb danach nochmal ca. 25% lang bei "fertig" stehen -
   fühlte sich dadurch hastig durchgezogen an statt gleichmäßig aufgebaut. Erster
   Fix-Versuch: `animation-range: cover 0% contain 100%` - `cover 0%` als (viel früherer)
   Startpunkt statt `contain 0%`, Endpunkt `contain 100%` unverändert. In EINER
   Viewport-Größe (1280×900) per Testreihe bestätigt gleichmäßiger - aber NICHT bei
   anderen Viewport-Größen gegengeprüft, bevor ausgeliefert. **Dieser Fix wurde wieder
   verworfen**: User-Report kurz danach "jetzt geht es weder in chrome noch safari" /
   "in beiden browsern nur eine durchgezogene linie" - per Testreihe über mehrere
   Viewport-Größen (1280×900 bis 375×812) nachträglich bestätigt: der Fortschritt bei
   Seitenaufruf (scrollY 0) lag je nach Verhältnis von Roadmap- zu Viewport-Höhe zwischen
   17% und 65% VORGEZEICHNET statt konstant bei 0% - `cover` und `contain` haben
   unterschiedliche, geometrieabhängige Referenz-Rahmen, das Mischen zweier verschiedener
   benannter Bereiche ist NICHT robust über unterschiedliche Seiten-/Viewport-Geometrien
   hinweg (anders als ein einzelner benannter Bereich wie `contain` allein, der bei JEDER
   getesteten Viewport-Größe konstant `0` bei Aufruf und `1` bei maximalem Scroll ergab).
   Zurückgerollt auf reines `contain` (wieder nur mit dem ursprünglichen, akzeptierten
   Pacing-Problem, aber verlässlich funktionierend). Lehre: eine Testreihe nur bei EINER
   Viewport-Größe reicht nicht, um eine `animation-range`-Änderung als sicher zu
   bezeichnen - IMMER mehrere Viewport-Größen (mind. Desktop breit/schmal + Mobile) prüfen,
   bevor eine Range-Anpassung ausgeliefert wird, besonders wenn zwei verschiedene benannte
   Bereiche kombiniert werden. Ein besserer Pacing-Fix müsste INNERHALB desselben
   benannten Bereichs bleiben (z.B. `contain -X% contain 100%`, negativer Prozentwert
   erweitert den Referenz-Rahmen VOR `contain`s eigenem 0%-Punkt, statt einen zweiten,
   fremden Bereich hereinzumischen) - noch nicht umgesetzt/getestet.

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

Zweites Beispiel, mit funktionierendem `@supports`-Fallback statt "kein Fallback nötig",
UND ein Lehrstück darin, wie viele Anläufe ein scroll-getriebenes Feature bis zur
richtigen Kalibrierung brauchen kann: `.ncss-stack-section`/`.ncss-stack-stage`/
`.ncss-stack-card` (components/scroll-stack.css) - EINE Vollbild-Sektion, in der Karten
beim Scrollen INNERHALB dieser einen Sektion übereinander gleiten (Nutzer-Anforderung
nach mehreren Iterationen: erst unabhängig sticky Karten je eigenem Vollbild-Abschnitt,
dann kompakt+gefächert am oberen Rand, dann in der Bildschirmmitte, am Ende explizit
"eine Vollbild-Sektion, darin die stacked cards"). Ein fixer `translateY`-Versatz pro
Karte (`--ncss-stack-index * --ncss-stack-fan`) liefert die Ruheposition/den Endzustand
der Scroll-Animation (NICHT der echte Fallback für Browser ohne `view-timeline` -
dazu unten mehr, eigener Absatz). Die Scroll-Animation nutzt eine BENANNTE `view-timeline-name`
(nicht die anonyme `view()`-Funktion wie im ersten Anlauf) auf der äußeren Sektion, jede
Karte per `animation-range` auf ihre eigene Scheibe gemappt - zwei echte Kalibrierungs-
Bugs dabei per `getComputedStyle().transform`-Auslese gefunden, nicht nur optisch:
1) Die DEFAULT-"cover"-Reichweite von `view-timeline` misst vom ersten bis zum letzten
   sichtbaren Pixel des Subjekt-Elements - bei einem Element, das viele Bildschirmhöhen
   groß ist, schließt das eine ganze Bildschirmhöhe Entry- UND Exit-Polsterung VOR/NACH
   der eigentlich gepinnten Phase mit ein. `view-timeline-inset: 100vh` (= die
   Bühnenhöhe) beschneidet genau diese Polsterung, erst danach fallen 0%/100% der
   Timeline exakt mit "Bühne wird gepinnt"/"Bühne löst sich" zusammen.
2) Ein `animation-range` ZENTRIERT um den eigenen Karten-Index (index-1 bis index+1)
   ließ eine Karte schon MITTEN in ihrer eigenen, noch aktiven Anzeige-Phase zurück-
   weichen (User-Feedback: "müsste erst kippen, wenn man vom Vollbild wegscrollt") - der
   Bereich muss stattdessen AN der eigenen Scheibe BEGINNEN (index bis index+2), damit
   die erste Hälfte (0%-50%) exakt die eigene Anzeige-Phase abdeckt und erst die zweite
   Hälfte (50%-100%, deckungsgleich mit der Scheibe der NÄCHSTEN Karte) zurückweicht.
   Karte 0 (keine "eigene Ankunft" nötig, schon da beim Erscheinen der Bühne) bekommt
   dafür einen eigenen, kürzeren Satz Keyframes (`ncss-stack-settle`, nur "flach → zurück-
   weichend") statt der Ankunfts-Keyframes der übrigen Karten (`ncss-stack-arrive`,
   "andockend → flach → zurückweichend") - dieselbe `animation-range`-Formel gilt für
   beide gleich, nur der Keyframe-Name unterscheidet sich.
Zusätzlich: KEIN `opacity`-Fade beim Andocken - eine bereits blickdichte Karte, die
zusätzlich einblendet, ließ die darunterliegende währenddessen unschön durchscheinen
(matschige Doppelbelichtung, per Screenshot-Review gefunden), reines `transform` (Karte
malt dank normaler DOM-Reihenfolge ohnehin über die vorherige) reicht. Das gesamte
Enhancement komplett hinter `@supports (view-timeline-name: --x)` UND zusätzlich
`@media (prefers-reduced-motion: no-preference)` (eigenes Gate, nicht nur die globale
reset.css-Regel - eine scroll-timeline-gekoppelte Animation hat keine echte Zeitdauer,
das globale Kappen von animation-duration könnte sich unvorhersehbar verhalten statt
sauber zu deaktivieren).

Dritter Kalibrierungs-Bug, ebenfalls per echtem Test (nicht nur Augenschein) gefunden:
der Off-Stage-`translateY`-Wert für die Anfahrt-Phase war anfangs ein fixer `60vh` -
reichte bei einer per `flex` ZENTRIERTEN, `--ncss-stack-card-height: 60vh` hohen Karte
in einer 100vh-Bühne NICHT aus, um sie vollständig unter die Bühnen-Unterkante zu
schieben (User-Report: "der grüne ist initial über der Karte 1 sichtbar" - ein
sichtbarer Streifen blieb am unteren Bühnenrand stehen). Richtige Formel:
`50vh + Kartenhöhe/2` (halbe Bühnenhöhe, weil die Karte mittig sitzt, PLUS die halbe
eigene Höhe) - relativ zu `--ncss-stack-card-height` berechnet statt eines fixen Werts,
funktioniert dadurch automatisch für JEDE Kartenhöhen-Konfiguration (auch die
Vollbild-Variante mit 100vh) ohne zwei parallele Formeln pflegen zu müssen.

Horizontal-Modifier `.ncss-stack-section--horizontal` später ergänzt (Fächer/Anfahrt auf
X- statt Y-Achse, eigene `ncss-stack-arrive-horizontal`/`ncss-stack-settle-horizontal`-
Keyframes statt eines Achsen-Multiplikator-Tricks in einer gemeinsamen Formel - bewusst,
bleibt so für beide Fälle einzeln lesbar). User-Report danach: "doppelte Scrollbalken,
Sections bleiben halb stehen" - gründlich geprüft (jedes Element auf aktive Scrollbars
gescannt, alle drei gleichzeitig auf der Seite befindlichen `.ncss-stack-section`
gleichzeitig auf Cross-Contamination der `animation-timeline` getestet, da alle
DENSELBEN `view-timeline-name` tragen) - KEIN Bug in Chromium gefunden, jede Sektion
löst ihre Karten unabhängig und korrekt auf. Trotzdem `demo/scroll-sections.html` (der
ursprüngliche verschachtelte Scroll-Snap-Container) und die drei Stacked-Cards-Varianten
auf eine EIGENE Seite (`demo/stacked-cards.html`) aufgeteilt, auf Wunsch des Users - eine
Seite mit einem verschachtelten Scroll-Container UND mehreren `view-timeline`-Sektionen
gleichzeitig ist unnötig komplex und erschwert das Eingrenzen von Browser-spezifischen
Problemen (siehe das Muster bei Punkt 21: mehrere Bugs dieser Session waren nur auf
echtem Safari reproduzierbar, nicht in Chromium/Playwright-WebKit) - weniger
gleichzeitige Scroll-Mechanik pro Seite bleibt die robustere Grundregel.

WICHTIGER Landmine-Fund danach, echter Fallback-Bug statt nur Optik: der fixe
`translateY`-Versatz (`--ncss-stack-index * --ncss-stack-fan`) ist KEIN ausreichender
Fallback für Browser ohne `view-timeline`-Unterstützung, obwohl er zunächst genau danach
aussah (in echtem Firefox getestet, alle Karten sichtbar gefächert) - dieser Test deckte
nur Demos mit `--ncss-stack-fan` ungleich 0 ab. Bei der Vollbild-Variante
(`--ncss-stack-card-height: 100vh`/`-card-width: 100%`/`-fan: 0px`, Karten sollen die
GANZE Bühne füllen) ergibt derselbe Versatz für JEDE Karte exakt `translateY(0)` - ohne
Scroll-Animation liegen alle Karten deckungsgleich übereinander, nur die letzte (oberste
im DOM) bleibt sichtbar/erreichbar, der Rest ist komplett verdeckt und nicht anschaubar
(User-Feedback, nachdem ich den Fallback fälschlich als "über alle Varianten verifiziert"
gemeldet hatte, obwohl mein eigener Firefox-Testlauf die deckungsgleichen
`matrix(1,0,0,1,0,0)`-Transforms für genau diese Sektion schon zeigte - ich hatte nur die
Screenshots der anderen Varianten angesehen, nicht diese: "fallback darstellung fehlt
noch für die nicht timeline browser .. die karten liegen halt übereinander und man kann
sie sich nicht anschauen"). Lehre: ein Fallback, der von einem Custom-Property-Wert
abhängt, den Demos bewusst auf 0 setzen dürfen, ist kein echter Fallback - er muss
UNABHÄNGIG vom Wert dieser Property funktionieren. Fix: eigener
`@supports not (view-timeline-name: --ncss-stack-progress)`-Block schaltet die komplette
Pinning-/Absolut-Stapel-Mechanik ab (`.ncss-stack-section` height:auto, `.ncss-stack-stage`
position:static/height:auto/overflow:visible, `.ncss-stack-card` position:relative +
transform:none) - Karten laufen dann ganz normal im Flex-Fluss untereinander, garantiert
einzeln sichtbar/scrollbar, unabhängig von `--ncss-stack-fan`/`-count` oder der
`--horizontal`-Variante (dieselbe einfache vertikale Liste für beide, bewusst kein
zweites Fallback-Layout). Re-verifiziert in echtem Firefox MIT expliziter Prüfung genau
der Vollbild-Sektion (nicht nur "sieht insgesamt gut aus") sowie in Chromium, dass die
`@supports`-Gate dort weiterhin die animierte Sticky-Variante unverändert lässt.

Drittes Beispiel für "erst prüfen, dann committen", diesmal auch ein Beispiel dafür, wie
man einen verlinkten Artikel über eine ZUKÜNFTIGE, noch nicht implementierte Spec-Idee
(`@location`/`@navigation`/`:nav-source`, per WebFetch geprüft - keine Browser-
Unterstützung, reines Proposal) von der tatsächlich SCHON VERFÜGBAREN Technik für
dasselbe Ziel unterscheidet: `page-transitions.css` (Repo-Root, opt-in wie `theme.css`)
nutzt die bereits shippende Cross-Document-View-Transitions-API
(`@view-transition { navigation: auto; }`), nicht die im Artikel beschriebene Spec-Idee.
Keine `@supports`-Absicherung nötig für die Auswirkung auf ältere Browser: eine
unbekannte `@`-Regel wird beim CSS-Parsen einfach ignoriert (Grundprinzip der Sprache),
die Navigation bleibt dort einfach der normale, sofortige Seitenwechsel. Trotzdem ein
eigenes `@media (prefers-reduced-motion: no-preference)`-Gate nötig (wie bei
`scroll-stack.css`) - die View-Transitions-API respektiert `prefers-reduced-motion`
NICHT von selbst. `view-transition-name` auf `.ncss-topbar` sorgt dafür, dass die
Kopfleiste beim Seitenwechsel nahtlos an Ort und Stelle bleibt statt zu kreuzblenden -
MUSS auf allen teilnehmenden Seiten exakt derselbe Name sein, sonst behandelt der
Browser es als zwei unabhängige Elemente (sichtbares Flackern/doppeltes Element).

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
(`theme.css` live am Beispiel), `docs.html` (dieses Handbuch,
ausführlicher als dieses Skill-Dokument). Jede Seite bindet `../ncss.css` ein und trägt ihr eigenes,
seitenspezifisches CSS in einem eigenen `<style>`-Block mit `demo-*`-Präfix - nie in den
ncss-Dateien selbst.
