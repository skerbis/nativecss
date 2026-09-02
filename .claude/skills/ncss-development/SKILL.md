---
name: ncss-development
description: Am ncss-QUELLCODE selbst arbeiten - Tokens/Komponenten/Helper ändern oder erweitern, Web-Awesome-Bridge, Doku-/Demo-Website, Deploy-Workflow. Für gestalterische Arbeit MIT dem fertigen System (eigenes Theme/eigene Seite) siehe stattdessen den Skill "ncss-design".
---

# ncss Development

Für Änderungen am ncss-QUELLCODE selbst (dist/, docs-src/, demo/, Deploy-Skripte) -
nicht für die Design-/Theme-Arbeit eines Konsumenten-Projekts, dafür der Skill
`ncss-design`. Eigenständiges, natives CSS-Design-System (eigenes Git-Repo) - kein
UIkit-Erbe, kein LESS/Sass, kein Build-Schritt für die Bibliothek selbst. Alle Pfade
unten sind relativ zur REPO-WURZEL dieses Projekts, unabhängig davon, wo/unter welchem
Eltern-Projekt es gerade ausgecheckt ist.

Ausführlicher Entstehungsverlauf (Debugging-Geschichte, verworfene Ansätze, Zitate) zu
jeder Regel unten: `history.md` im selben Ordner - nur gezielt lesen, wenn der volle
Kontext eines konkreten historischen Fundes gebraucht wird, nicht standardmäßig.

## Grundprinzipien (nicht verhandelbar, außer der Nutzer sagt explizit etwas anderes)

- **Native zuerst.** Cascade Layers statt Spezifitäts-Kämpfe/`!important`, Container
  Queries statt Viewport-Breakpoints, `light-dark()` statt zweitem Dark-Stylesheet,
  native `<dialog>`/`<details>` statt JS-Nachbauten. Web Awesome nur, wo natives
  HTML/CSS nicht reicht (z.B. Rating, Tree, Popover) - niemals fürs strukturelle
  Seitengerüst (kein `wa-page`), das macht die ganze Seite ES-Module-abhängig.
- **Ein Token-System, eine Quelle der Wahrheit.** `tokens.css`/`colors.css` sind die
  einzige Werteliste. Nichts dupliziert Werte, auch die Web-Awesome-Bridge nicht - nur
  Übersetzung.
- **Kein Build-Schritt** für die Bibliothek. `@import` + Cascade Layers regeln die
  Reihenfolge. Vendor-Bibliotheken selbst gehostet, keine CDN-Abhängigkeit.
- **Kein Utility-Klassen-Wildwuchs.** Kleine, kuratierte Utility-Sets statt
  Tailwind-artiger Matrix - insbesondere kein `klasse@breakpoint`-Raster. Neue Utility
  nur bei echtem, wiederkehrendem Bedarf; responsive Varianten selbst per
  `@container` responsiv machen statt eine Klasse pro Breakpoint anzulegen.
- **Solides Grundgerüst, nicht übertreiben.** Individuelles kommt als eigene Komponente
  hinzu, wenn der Bedarf konkret ist - nicht vorsorglich ein großes Set anlegen.
- **Verifizieren, nicht annehmen.** Jede nicht-triviale CSS-/JS-Änderung mit Playwright
  im echten Browser testen (Screenshot + computed styles + ggf. echter Klick-Test, eine
  plausible Style-Prüfung allein reicht nicht), nicht nur lesend beurteilen. Für
  neue/seltene CSS-Features vorher Support via WebSearch prüfen statt aus dem Training
  zu raten.
- **Keine Inline-Styles/-Scripts.** Ausnahme: `style="--custom-property: wert"` zur
  Parametrisierung (keine Deko, kein `url()` darin - siehe unten). Keine Inline-
  `<script>`s auf Seiten dieses Projekts (CSP-Vorgabe) - externe Datei unter
  `demo/assets/js/`, synchron ohne `defer`, wenn Ausführungs-Timing zählt.
- **Natives CSS Nesting erlaubt**, wo es Code spart UND lesbar bleibt (Pseudoklassen,
  Varianten-Blöcke, ein `@container`-Block mit nur einer Regel) - nicht tiefer als
  2-3 Ebenen, nicht auf Kosten der Verständlichkeit.
- **`light-dark()` ist die alleinige Dark-Mode-Mechanik**, kein zweites Stylesheet.

## Repo-Struktur

```
dist/
  ncss.css                  Import-Manifest (Layer-Reihenfolge + alle @import)
  tokens.css / colors.css   Design Tokens (einzige Werteliste)
  reset.css / base.css / browser-fixes.css
  theme.css                 Mitgeliefertes Beispiel-Theme (Seed-Werte, unlayered)
  page-transitions.css      Opt-in Seitenübergänge
  helpers/                  Utility-Klassen (Layout, Typografie, Formulare, ...)
  components/               Komponenten-CSS (Nav, Card, Modal, Badge, Lists, ...)
  js/                        Komponenten-JS, gesammelt (nicht neben dem CSS)
  integrations/              Opt-in Brücken zu externen Bibliotheken (webawesome-
                              bridge.css, fontawesome-font-display-fix.css) - NICHT
                              Teil von ncss.css' Import-Manifest
demo/                      Demo-/Marketingseiten (product.html = Startseite/Site-Root)
docs-src/                  Quelle der zweisprachigen Doku-Website (→ generiert docs/,
                            nicht committed, siehe Workflow unten)
vendor/                    Selbst gehostetes Web Awesome + Font Awesome (optional,
                            ncss.css funktioniert vollständig ohne sie)
.claude/skills/
  ncss-development/         SKILL.md (diese Datei) + history.md - Arbeit AM Quellcode
  ncss-design/               SKILL.md - Design-/Theme-Arbeit MIT dem fertigen System
                            Beide in zwei Repos synced (hier und im Eltern-Projekt) -
                            nach jeder Änderung identisch halten (`diff` prüfen).
```

`https://skerbis.github.io/nativecss/` (Site-Wurzel) zeigt `demo/product.html` - ein
GitHub-Actions-Workflow (`.github/workflows/pages.yml` +
`.github/scripts/build-root-index.mjs`) erzeugt beim Deploy eine pfad-angepasste Kopie
als `index.html` an der Site-Wurzel, kein Root-Stub im Git-Tree selbst.

## Cascade-Layer-Reihenfolge (in `dist/ncss.css`)

```
wa-native..wa-theme-overrides (Web Awesomes eigene Layer, niedrigste Priorität)
tokens < reset < base < helpers < components < webawesome-bridge (höchste Priorität)
```

Die `wa-*`-Layer-NAMEN werden in `ncss.css` deklariert (nicht in Web Awesomes eigenen
Dateien), damit die Priorität garantiert unabhängig von `<link>`-Reihenfolge ist -
Layer-Order ist seitenweit global. `ncss.css` importiert selbst NICHTS in den Layer
`webawesome-bridge` (die Bridge ist komplett opt-in, siehe Repo-Struktur oben) - die
reine Namens-Registrierung reicht, ein Projekt, das
`dist/integrations/webawesome-bridge.css` selbst einbindet, landet automatisch an der
richtigen Prioritätsposition. Beim Hinzufügen einer neuen Web-Awesome-Ressource die
Layer-Deklaration in `ncss.css` nicht vergessen, falls sie neue `@layer`-Namen mitbringt.

**Theme-Anpassung läuft über `dist/theme.css`** (nach `ncss.css` laden) - eine einzige,
bewusst UNLAYERED Datei mit Seed-Werten. Unlayered CSS gewinnt immer gegen jede
Layer-Regel, kein `!important` nötig. Bei neuen Tokens prüfen: SEED-Wert → gehört in
`theme.css`; ABGELEITETER Wert (`color-mix()`-Skalenstufe o.ä.) → NICHT in `theme.css`,
zieht automatisch mit. Eine abgeleitete Custom Property wird nur EINMAL berechnet (dort,
wo deklariert) und dann als fertiger Wert vererbt - ein lokal (nicht auf `:root`)
überschriebener Seed-Wert lässt eine bereits vererbte Ableitung NICHT neu rechnen; nur
ein `theme.css`-Override auf `:root` selbst berechnet die ganze Skala frisch.

## Arbeits-Workflow (für jede nicht-triviale Änderung)

1. **Bauen** - CSS/JS/HTML ändern, dabei die Grundprinzipien oben einhalten.
2. **Testen** - Playwright im echten Browser (Chromium mindestens, WebKit/Firefox bei
   Browser-spezifischem Risiko), Screenshot + computed styles, bei Interaktion einen
   echten Klick/Hover-Test statt nur den berechneten Style zu prüfen.
3. **Kommentar-Balance prüfen** nach JEDER Kommentar-Änderung in CSS:
   `grep -c '/\*' datei.css` vs. `grep -c '\*/' datei.css` müssen gleich sein, PLUS
   `grep -rn '\-\*/' *.css helpers/*.css components/*.css` muss leer sein (siehe
   Landmine-Regel unten). Bei HTML-Kommentaren dieselbe Zählung mit `<!--`/`-->`.
4. **Dokumentieren** - `docs-src/content/{de,en}/*.html` (Handbuch) + ggf.
   `demo/*.html` (lebendes Beispiel) + `docs-src/nav.json` bei neuer Seite. README.md
   bleibt bewusst kurz (Konzept/Warum/Lizenz) - Detail-Referenz gehört ausschließlich
   in die Doku-Website, nie zusätzlich ins README.
5. **Doku neu bauen**: `node docs-src/build.mjs` (kein npm, reines `node:fs`-Skript).
6. **Regressionstest**: volle Playwright-Suite über alle Demo-/Doku-Seiten (Light/Dark
   × 2 Breiten × jede Seite) - `overflow`, Konsolenfehler, fehlgeschlagene Requests
   müssen bei 0 liegen. Neue Demo-/Doku-Seite immer in die Seitenliste des
   Regressionsskripts aufnehmen.
7. **SKILL.md/history.md aktualisieren** bei einem neuen, nicht-offensichtlichen Fund -
   als knappe REGEL hier, mit Kontext/Debugging-Verlauf in `history.md`. Beide
   Synced-Kopien identisch halten.
8. **Commit, Push, Deploy beobachten** (`gh run watch`), dann LIVE verifizieren (curl
   Statuscodes + Playwright gegen die echte URL) - ein grüner lokaler Test beweist
   nicht, dass der Deploy-Schritt (z.B. `build-root-index.mjs`s Pfad-Umschreibung)
   nichts kaputt gemacht hat.

## Verifizieren - konkrete Fallstricke

- Web Awesome ist ES-Module-basiert - funktioniert NICHT über `file://`. Immer über
  einen lokalen Server testen (`php -S 127.0.0.1:PORT -t .`), nie die Datei direkt
  öffnen - kein Bug im Code, eine Browser-Sicherheitsgrenze.
- Eigene Kontrast-/Style-Prüfskripte sind nicht automatisch verlässlicher als das
  Problem, das sie prüfen sollen - `getComputedStyle(...).backgroundColor`/`.color`
  liefert nicht immer `rgb()`, moderne Browser liefern für `color-mix()`-Werte z.B.
  `oklch(...)`. Robuster: jede Farbe über eine 1×1-Canvas
  (`ctx.fillStyle = wert; ctx.getImageData(...)`) zu echten RGBA-Bytes normalisieren,
  statt jedes mögliche CSS-Farbformat selbst zu parsen. `background-image:
  linear-gradient(...)` wird von `backgroundColor` gar nicht erfasst - mitprüfen.
- Bei einer Lighthouse-Rückfrage ECHTES Lighthouse laufen lassen
  (`npx lighthouse <url> --only-categories=accessibility --output=json`,
  `audits["color-contrast"].details.items` auswerten) statt sich auf ein eigenes
  Ersatzskript zu verlassen.
- `getComputedStyle(el).getPropertyValue("--x")` liefert bei einer Custom Property nur
  den rohen Token-TEXT zurück (z.B. `light-dark(#a, #b)` als String), keine aufgelöste
  Farbe - anders als beim Lesen einer echten Farb-Eigenschaft. Für eine echte Auflösung:
  unsichtbares Sonden-Element, `el.style.color = "var(--x)"`, dann
  `getComputedStyle(el).color` lesen. Für eine bestimmte Hälfte eines
  `light-dark()`-Paares zusätzlich `color-scheme` auf demselben Sonden-Element setzen
  (erzwingt Light/Dark unabhängig vom Seiten-Theme) - `color-scheme` und `color` müssen
  dafür auf demselben Element stehen.
- `window.scrollTo({behavior:'smooth'})` ist asynchron (mehrere hundert ms) - vor einer
  Scroll-Positions-Messung `{behavior:'instant'}` + Polling auf stabile `scrollY`
  nutzen, keine feste Wartezeit.
- Deploy-Skripte (`.github/scripts/*.mjs`) lokal per rsync-Simulation prüfen, bevor sie
  ausgeliefert werden: `mkdir -p /tmp/test-site && rsync -a --exclude='.git'
  --exclude='.github' --exclude='_site' ./ /tmp/test-site/ && node
  .github/scripts/build-root-index.mjs /tmp/test-site`.
- Ein Sanity-Check in einem Build-/Deploy-Skript, der nur EINE Symptomform prüft (z.B.
  `="../"`-Reste), schützt nicht vor der strukturell verwandten Form ohne dieses
  Präfix (bare `assets/...`-Pfade, die relativ zu `demo/` korrekt waren, aber an der
  Site-Wurzel woanders hinzeigen) - bei jedem Pfad-Rewrite-Skript fragen, welche
  Pfadklassen ÜBERHAUPT existieren, nicht nur die zuletzt gefundene.
- Bei einem Bug, der in keiner Test-Engine reproduzierbar ist und die erste Diagnose
  sich als falsch erweist: ein gezieltes Experiment DURCH DEN NUTZER im echten Browser
  ("kommentier testweise Regel X aus, sag mir ob es dann korrekt aussieht") ist oft
  schneller als eine weitere Hypothese zu raten.
- Ein rein deklarativ ausgelöstes Browser-Feature (z.B. `@view-transition {
  navigation: auto }` in `page-transitions.css`, "kein JavaScript nötig" als
  bewusstes Verkaufsargument) hat strukturell KEINE JS-Referenz auf das intern vom
  Browser verwaltete Objekt/die Promise - ein `.catch()` auf eine bekannte,
  spec-konforme aber ungefangene Ablehnung (Beispiel: `ViewTransition.ready` lehnt
  beim Überspringen einer Transition ab, sichtbar als "Unhandled Promise Rejection:
  AbortError: Skipping view transition...", WebKit-Bug bugs.webkit.org #289078)
  lässt sich trotzdem oft nachrüsten, OHNE die Datei selbst JS-abhängig zu machen:
  der zugehörige Lifecycle-Event (hier `pageswap`, `PageSwapEvent.viewTransition`)
  legt genau dafür eine Referenz offen. Als bewusst SEPARATER, opt-in Begleiter
  ausliefern (`js/page-transitions-quiet.js`), nicht in die deklarative Datei selbst
  integrieren - siehe history.md Eintrag 77 für die volle Recherche/Quellen. Ein
  lokal/per Playwright nicht reproduzierbarer Timing-Bug ist kein Grund, eine per
  Spec/MDN/Bug-Tracker klar begründete Mitigation zurückzuhalten - nur transparent
  als "nicht empirisch nachgestellt" kommunizieren.

## Kommentar-Landmine (kritisch, eigener Abschnitt)

`*/` als literale Zeichenfolge INNERHALB eines `/* ... */`-Kommentars beendet ihn
sofort - z.B. `.ncss-radius-*/.ncss-shadow-*` in Prosa (Wildcard-Klasse `-*` direkt
gefolgt von `/`). Alles danach bis zum NÄCHSTEN `*/` wird als echter CSS-Code geparst
(kaputt), Browser verwerfen beim Fehler-Recovery oft die folgende(n) Regel(n) komplett,
OHNE Konsolenfehler - eine rein visuelle Kontrolle reicht NICHT. Nie `-*/` (oder
allgemein `*/` mitten im Satz) in einem CSS-Kommentar schreiben - `-...` statt `-*` in
Prosa, oder ein Leerzeichen einfügen. Nach JEDER Kommentar-Änderung mit
Wildcard-Klassennamen: `grep -rn '\-\*/' *.css helpers/*.css components/*.css`.

## Cascade Layers & CSS-Fallen (allgemein)

- Eine Utility aus `helpers/` kann eine gleichnamige Eigenschaft aus `components/`
  NICHT überschreiben, egal in welcher Klassen-Reihenfolge im Markup - Layer-Order
  schlägt Quelltext-/Attribut-Reihenfolge. Für eine farbige Karten-Variante die eigene
  Farbvariante der Komponente verwenden, nicht `.ncss-surface--*` kombinieren.
- Flex-/Grid-Items werden per Spec "blockifiziert" - `display:inline` auf einem
  DIREKTEN Kind von `display:flex`/`grid` rechnet der Browser zu `block` um, egal was
  die eigene Regel sagt (passiert NACH der Kaskade). Jede Komponente, die auf
  `display:inline` angewiesen ist (z.B. `.ncss-text-boxed`), NIE direkt in
  `.ncss-stack`/`-cluster`/`-grid`/`-flex` (oder eine `.ncss-card-body`, die selbst
  eines davon trägt) verschachteln - in einen normalen `<div>`-Wrapper stellen.
  `display:contents` löst es NICHT.
- `:modal` hört SOFORT auf zu matchen, sobald `close()`/ESC feuert - lange bevor eine
  `@starting-style`-Fade-Transition optisch fertig ist. Positionierung, die über eine
  Öffnen/Schließen-Animation stabil bleiben soll, IMMER unbedingt deklarieren
  (`position:fixed; inset:0; margin:auto;`), nicht an `:modal` koppeln.
- Custom Properties in `@keyframes` animieren nur diskret (kein Zwischenwert), außer sie
  sind per `@property { syntax: "<typ>"; ... }` typisiert.
- Ein `::before` mit negativem `z-index` malt NICHT hinter dem eigenen Hintergrund des
  Elements (malt laut Stacking-Reihenfolge NACH dem eigenen Hintergrund, also oben
  drauf). Für einen Ring-Effekt: `padding:<dicke>` + `mask-composite: exclude`
  (`-webkit-mask-composite: xor` für Safari) statt eines `z-index`-Tricks.
- Gefülltes Neumorphism (Schatten aus `color-mix()` der eigenen Hintergrundfarbe)
  braucht eine MITTELTON-Basisfarbe - gegen reines Weiß gemischt bleibt kein Spielraum
  nach oben. Robuster: dieselbe Masken-Ring-Technik wie oben statt einer gefüllten
  Fläche, funktioniert dann auf jeder Hintergrundfarbe.
- Relative `url()`-Werte INNERHALB einer Custom Property lösen sich gegen die
  Basis-URL des KONSUMIERENDEN Stylesheets auf, nicht gegen die Seite, die die Property
  gesetzt hat. `url()`-Werte NIE durch eine Custom Property reichen -
  `background-image`/`src` immer direkt inline am Element setzen. Einzige Ausnahme von
  der sonstigen Inline-Style-Regel oben ist reine Zahlen-/Keyword-Parametrisierung,
  nie `url()`.
- `100vh`/`height:100%` = größtmögliche Höhe auf Mobil (Adressleiste ausgeblendet).
  Drei Viewport-Einheiten für drei Fälle: `svh` (kleinstmöglich, für alles, was
  GARANTIERT ohne Scrollen sichtbar bleiben muss - Modal/Off-Canvas/Sticky, mit `vh`
  als Fallback davor für alte Browser), `dvh` (lebt live mit der Adressleiste mit),
  `lvh` (stabil wie klassisches `vh` - für Werte, die WÄHREND des Scrollens NICHT
  springen dürfen, z.B. eine Bühnenhöhe, die in `view-timeline-inset` einfließt).
- `backdrop-filter`/`filter`/`transform`/`translate`/`perspective`/`will-change`
  erzeugen einen NEUEN containing block für `position:fixed`/`-absolute`-Nachfahren -
  UNABHÄNGIG davon, ob das transformierte Element SELBST `position:static` ist (per
  echtem Test bestätigt: eine `<ncss-nav-drilldown>`-Liste mit `translate:-100%` fürs
  Wegschieben wurde dadurch selbst zum Bezugsrahmen für ein verschachteltes
  `position:absolute`-Untermenü, obwohl die Liste nirgends `position` gesetzt hatte -
  das Untermenü positionierte sich relativ zur - inzwischen wegtranslatierten - Liste
  statt zum eigentlich gewünschten äußeren Track, landete sichtbar außerhalb des
  Bildschirms). Ein Floating-UI-Element (`<wa-dropdown>`/`<wa-popover>`, intern
  `position:fixed`) als Nachfahre eines gefilterten Elements zuckt beim Scrollen
  genauso - `.ncss-glass` nie direkt auf einen Vorfahren von
  `<wa-dropdown>`/`<wa-popover>`/`<dialog>` setzen, stattdessen ein eigenes,
  dekoratives Element davor. Wenn ein absolut positioniertes Element sich WIRKLICH
  gegen einen ENTFERNTEN Vorfahren positionieren soll, DER ABER selbst (oder ein
  Zwischenelement) transformiert wird: das Kind per JS physisch dorthin umhängen
  (`appendChild`, echte Geschwisterschaft), nicht auf reine CSS-Positionierung durch
  eine transformierte Zwischenebene hindurch verlassen.
- `:root`/`body`-Selektoren treffen NIE einen Shadow Host. Jede Token-Deklaration, die
  auch innerhalb eines Shadow Roots (z.B. `<ncss-container>`) funktionieren soll,
  braucht `:root, :host { ... }`. `<slot>` reicht NICHT für Stil-Isolation - nur
  tatsächlich per JS in den Shadow Root verschobene Elemente sind vor äußerem CSS
  geschützt, slotted Elemente bleiben Light-DOM. `document.querySelectorAll(...)` in
  einem Opt-in-Script durchquert KEINE Shadow-DOM-Grenzen - eigene rekursive
  `deepQueryAll()`-Hilfsfunktion nötig.
- Ein Element, das JEMALS `display: contents` war, darf auf DEMSELBEN Element später
  KEINE `allow-discrete`-Transition auf `display` selbst bekommen (z.B. über eine per
  Media Query neu aktivierte `transition: display ... allow-discrete`) - der Wert bleibt
  dauerhaft auf `contents` hängen (`getComputedStyle` meldet das unbegrenzt weiter,
  obwohl Geschwister-Deklarationen in derselben Media Query normal greifen), sobald ein
  ECHTER, schrittweiser Resize (mehrere `setViewportSize`-Aufrufe wie ein echtes Ziehen
  am Fensterrand) die Media Query live kippt - ein reiner Neuladen bei derselben Breite
  zeigt den Fehler NICHT, nur die Live-Transition. Reproduziert unabhängig von Timing/
  Reihenfolge, in Chrome UND Safari. Betraf `.ncss-nav-panel` (`display:contents` auf
  Desktop, `display:none/block` auf Mobil) kombiniert mit `.ncss-offcanvas`s
  `allow-discrete`-Transition auf `display`/`overlay` - sichtbar als kurzes Aufblitzen/
  dauerhaftes Hängenbleiben der Nav beim Wechsel Desktop→Mobil. Fix:
  `display`/`overlay` aus der Transition-Liste ausschließen (nur `translate`/`opacity`
  animieren) für jedes Element, das an anderer Stelle `display:contents` wird - Öffnen
  bleibt animiert, Schließen verschwindet dafür sofort statt auszublenden.
- Eine NEUE Einblendvariante (z.B. `.ncss-modal--slide-up`), die einen bislang
  ungenutzten Eigenschaftswert animieren soll (hier `translate`, die Basisregel
  transitionierte bis dahin nur `opacity`/`scale`), bewegt sich OHNE sichtbaren
  Zwischenschritt, wenn die Eigenschaft nicht auch in der GETEILTEN
  `transition:`-Property-Liste steht - der Browser springt beim `@starting-style`→
  `:modal`-Wechsel direkt zum Zielwert, keine Fehlermeldung, `getComputedStyle` zeigt
  scheinbar korrekt den Endwert (per echtem Zwischenwert-Sampling gefunden:
  `opacity` durchlief sauber 21 Zwischenwerte, `translate` blieb die GESAMTE
  Animationsdauer bei `0px`, dem bereits fertigen Zielwert). Jede Eigenschaft, die
  IRGENDEINE Modal-/Dialog-Variante animieren soll, muss in der gemeinsamen gemeinsam
  genutzten `transition:`-Liste auf `.ncss-modal, .ncss-modal::backdrop` stehen -
  auch wenn die Basisregel selbst keinen Wert dafür setzt (genau wie `scale` dort
  bereits vorher wirkungslos auf `::backdrop` mitlief).
- Ein rein clientseitiger AJAX-Modal-Router (Trigger-Link mit echtem `href` + `fetch()`
  ins Modal + `history.pushState()`) kann eine GANZ FRISCHE/direkte Navigation zur
  Ziel-URL NICHT von sich aus als "Listing-Seite mit offenem Modal" ausliefern - ein
  Server liefert dafür ohne eigene Weiche einfach die eigenständige Zielseite normal
  aus (das ist auch der gewünschte Progressive-Enhancement-Fallback). Schließt den
  Kreis trotzdem rein clientseitig: die Zielseite bindet dieselbe Router-Datei
  zusätzlich ein und trägt ein `<meta name="modal-router-redirect"
  content="listing-url">` - eine Seite OHNE eigenes `[data-modal-router]`-Element gilt
  als Zielseite, findet sie dieses Meta-Tag, springt sie per `location.replace()`
  sofort zur Listing-Seite (Ziel-Pfad als Query-Parameter angehängt) zurück, die ihn
  erkennt, das Modal öffnet und die Adresse per `history.replaceState()` wieder auf
  die saubere Ziel-URL zurückschreibt - der Parameter selbst taucht nie sichtbar auf.
  Ein `fetch()` lädt die Zielseite nur als Text (DOMParser, Skripte laufen nie aus) -
  der Redirect greift dadurch garantiert nur bei einer ECHTEN Navigation, kein
  Sonderfall zwischen AJAX-Nachladen und direktem Aufruf nötig. Bewusst in Kauf
  genommen: ein kurzes Aufblitzen der rohen Zielseite vor dem Rücksprung (ohne
  Server-Mitwirkung clientseitig nicht vermeidbar).

## Container Queries & Responsive Layout

- Standardweg ist breakpointless: `.ncss-grid` (`auto-fit`/`minmax()`) statt fester
  Spaltenzahl. `.ncss-grid--cols-*` als Escape Hatch für eine WIRKLICH feste
  Spaltenzahl braucht einen Vorfahren mit `container-name: ncss-container`
  (`.ncss-container` selbst).
- Für eine unvollständige letzte Zeile, die ZENTRIERT statt linksbündig hängen soll
  (etwas, das `.ncss-grid`s festes Raster strukturell nicht kann): `.ncss-flex-grid`
  (eigener `container-name`) + `.ncss-width-1-2/-1-3/...` (je EIN Klassenname pro
  Fraktion, selbst-responsiv per `@container`, KEIN `klasse@breakpoint`-Raster).
  Prozent-`flex-basis` + `gap` in einem wrappenden Flex-Container bricht zu früh um
  (`gap` wird NICHT automatisch von einer Prozent-Basis abgezogen, anders als bei
  Grid-`fr`) - immer `calc(Fraktion% - (gap * (Spalten-1)/Spalten))` verwenden.
- Container-basierte Sichtbarkeit (`.ncss-hide-below-container-*`/`-from-container-*`,
  `helpers/visibility.css`) spiegelt `.ncss-hide-below-md`/`-from-md` (Viewport) exakt
  im Zwei-Klassen-Muster - NIE `display:revert` zum Umschalten nutzen
  (unvorhersehbarer UA-Display-Default je Elementtyp), jede Klasse nur EIN
  unconditionales `display:none` in ihrer eigenen `@container`/`@media`-Bedingung.
- Ein Element kann seine EIGENE Breite nicht per Container Query abfragen - eine
  Komponente wie `.ncss-card--horizontal` braucht dafür einen separaten
  Container-Query-Wrapper (`.ncss-card-container`/`.ncss-split-container`).
- Ein FESTER Viewport-Breakpoint (statt Container Query) bleibt als dokumentierter
  Escape Hatch verfügbar (z.B. Nav-Umschaltung bei 64rem) - Standardweg ist trotzdem
  immer zuerst Container Queries/intrinsisches Grid.
- `flex-wrap:wrap` auf einem Flex-Container garantiert NICHT, dass er nie mit dem
  nächsten fixen Breakpoint kollidiert - ob eine Zeile vor Erreichen eines
  JS-freien Mobile-Switches umbricht, hängt allein davon ab, ob Summe aller
  Item-Breiten+Gaps bei der Breakpoint-Breite noch passt. Beim Hinzufügen eines
  weiteren Top-Level-Nav-Items IMMER per Playwright in 1px-Schritten um den
  Breakpoint herum auf Umbruch prüfen (die Wrap-Zone kann wenige Pixel schmal sein).
- `flex-wrap:wrap` auf den KINDERN reicht nicht, wenn der Container selbst ein
  `flex:0 0 auto`-Kind eines äußeren Flex-Layouts ist (bemisst sich am Max-Content) -
  zusätzlich `flex:1 1 100%` auf dem Container setzen, um ihn auf die Zeile zu zwingen.
- Ein Container-Query-Schwellenwert, der nur gegen den BREITESTEN getesteten Kontext
  geprüft wurde, kann in einem SCHMALEREN, genauso realen Kontext (z.B. eine Doku-Seite
  mit fester Sidebar-Spalte) nie auslösen - immer den engsten realen Nutzungskontext
  als Referenz nehmen, nicht nur den offensichtlichsten Demo-Kontext.

## Web Awesome / Font Awesome

- Lokale Referenz-Doku ZUERST prüfen: `vendor/webawesome/dist-cdn/skills/webawesome/
  references/components/*.md` (zur installierten Version passend) - verlässlicher als
  `webawesome.com/docs` per WebFetch.
- `appearance="filled"` bei `<wa-button>` ist die WEICHE Variante, `appearance="accent"`
  die KRÄFTIGE (umgekehrt vom Namen). Bei `<wa-tag>`/`<wa-badge>` nochmal anders
  (`filled` = fill-quiet). Prüfen via lokale Referenz-Doku oder
  `grep -rn "appearance=" vendor/webawesome/dist-cdn/chunks/*.js`.
- Farbstufen `-100`/`-300` MÜSSEN `light-dark()`-gewrappt sein (nicht nur `-700`/`-900`)
  - sonst unlesbare gefüllte Buttons/Badges im Dark Mode. Die passende
  `-on-soft`-Textfarbe muss ebenfalls pro Modus wechseln.
- Self-Hosting mit relativem Pfad braucht `data-webawesome="..."` auf dem Loader-Script,
  sonst verdoppelt sich der Pfad, alle Komponenten-Chunks 404en.
- Ein `<wa-popover>` bleibt trotz Top-Layer-Darstellung ein DOM-Nachfahre seines
  Elternelements - Selektoren für Icons etc. auf direkte Kindschaft (`.foo > li > i`)
  beschränken, nicht auf beliebige Tiefe.
- `<video><source media="...">` ist KEIN cross-browser-taugliches Art-Direction-Feature
  (aus Spec/den meisten Browsern entfernt). Für Bilder ist `<picture><source
  media="...">` korrekt. Für Video ohne zweite Datei: anderer Bildausschnitt per
  `object-fit` + Breakpoint (`.ncss-video--responsive-crop`).
- Web Awesomes eigene abgeleitete Tokens (`--wa-form-control-label-color` usw.) sind
  bereits "eingefroren" (siehe Custom-Property-Vererbungsregel oben) - eine spätere
  Neu-Deklaration nur der Basis-Tokens erreicht sie NICHT. Für Formular-Text auf
  farbigen Flächen: die abgeleiteten Tokens DIREKT auf der farbigen Fläche als
  `currentColor` deklarieren (siehe `dist/integrations/webawesome-bridge.css`).
- Zwei identische `@font-face`-Deklarationen (gleiche Familie/Gewicht/Stil, nur anderes
  `font-display`) bilden KEIN "letzte Regel gewinnt"-Override, sondern eine mehrdeutige
  Composite Face. Für einen Font-Display-Fix: die Custom Properties umbiegen, über die
  die Bibliothek selbst ihre Font-Family referenziert (z.B.
  `--fa-family-classic`/`--fa-family-brands`), auf neue, exklusive Familiennamen mit
  je EINEM `@font-face`.
- `appearance: base-select` in echtem Safari 26 (stabil): eigener nativer Pfeil bleibt
  neben einem selbst gebauten `::after`-Pfeil sichtbar (doppelter Pfeil) - `appearance:
  none` unterdrückt den nativen Safari-Pfeil nicht zuverlässig. Fix: den eigenen
  `::after`-Indikator zusätzlich per WebKit-`@supports`-Block auf `display:none`
  setzen. JS-Fallback-Feature-Detection (`combobox.js`) MUSS exakt dieselbe
  zusammengesetzte `@supports`-Bedingung nutzen wie `select.css`, sonst denkt das
  Script fälschlich, die native Technik greife bereits.

## Barrierefreiheit

- `list-style:none` entfernt in einigen Screenreadern (VoiceOver/Safari) die Listen-
  SEMANTIK selbst, nicht nur die Optik - `base.css` setzt `list-style:none` nur für
  `[role="list"]`; jede eigene `::before`-Marker-Liste braucht zusätzlich eigenes
  `list-style:none` UND `role="list"` im Markup.
- `:hover` löst auf Touch nicht zuverlässig per Tap aus
  (`matchMedia('(hover:hover) and (pointer:fine)')` liefert dort `false`). Jede
  `:hover`-Regel in `@media (hover:hover) and (pointer:fine) { ... }` wrappen -
  `:focus-visible` dabei NIE mit-gaten (gilt unabhängig vom Zeigegerät), Selektoren mit
  gemeinsamem `:hover, :focus-visible` vorher aufteilen. Jede interaktive Komponente
  zusätzlich einen echten `:active`-Zustand geben (Touch-Feedback). Eine gehaltene
  Maustaste erfüllt `:hover` UND `:active` gleichzeitig - `:hover:not(:active)`
  verwenden, damit `:active` bei gleicher Spezifität zuverlässig gewinnt.
- `prefers-reduced-motion` per CSS behandelt NUR was CSS steuern kann
  (`transition`/`animation`). Der globale `*, *::before, *::after`-Selektor in
  `reset.css` erreicht KEINE anderen benannten Pseudo-Elemente wie
  `::details-content` - die müssen einzeln ergänzt werden. `<video autoplay>` kann CSS
  gar nicht pausieren - dafür ein kleines, eigenständiges Opt-in-Script (siehe
  `dist/js/hero-video-motion.js`: `matchMedia('(prefers-reduced-motion:reduce)')`
  prüfen, `autoplay`-Attribut entfernen + `.pause()`).
- Ein `<svg>`-Chart (z.B. Sparkline) bleibt `aria-hidden` (reine Formen sind keine
  sinnvolle Screenreader-Ansage) - daneben eine `.ncss-visually-hidden`-`<table>` mit
  den ECHTEN Werten einfügen, nicht nur eine vage Trend-Beschreibung.
- `placeholder` ist KEIN Label-Ersatz. Bei mehreren visuell verschmolzenen Feldern ohne
  Platz für ein Sibling-`<label>` je Feld: `aria-label` direkt am `<input>`.
- Ein `.ncss-dialog-close`-artiger `position:absolute`-Button reserviert keinen Platz -
  eine Überschrift im Panel-Inhalt braucht passendes `padding-inline-end` im Header
  (siehe `.ncss-modal-header`/`.ncss-offcanvas-header`).

## Farben & Kontrast

- Eine Markenfarbe ist nur in der Kombination garantiert kontrastreich, für die sie
  kalibriert wurde (typischerweise heller Text AUF der Fläche). Als Text AUF einer
  hellen Fläche (z.B. `.ncss-eyebrow`, `.ncss-text-{familie}`) immer die
  `--ncss-color-{familie}-on-soft`-Stufe verwenden, nie die rohe Basisfarbe - bei einem
  Kontrast-Fund IMMER prüfen, ob eine ganze Familie strukturell baugleicher Klassen
  betroffen ist (`grep -n "color: var(--ncss-color-"`), nicht nur die eine gemeldete.
- `<code>`s eigener Hintergrund ist ein `color-mix()`-Tint aus `currentColor` - erodiert
  den Kontrast zusätzlich, wenn die umgebende Textfarbe bereits marginal ist. Bei
  Text-auf-Fläche-Kalibrierung den `<code>`-verschachtelten Fall separat prüfen, nicht
  nur reinen Fließtext.
- Eine Komponente, die über beliebigem Hintergrund schwebt (Copy-Button über `<pre>`,
  dessen Fläche unabhängig vom Seiten-`--ncss-color-bg` sein kann): Farben aus
  `currentColor` ableiten (`color-mix(in srgb, currentColor 12%, transparent)` für die
  Fläche), nie über einen globalen Seiten-Token einfärben. Gilt auch für Outline-/
  Ghost-Elemente ohne eigene Füllfläche: `.ncss-btn--secondary` nutzt `color:
  currentColor` + `border-color: color-mix(in oklch, currentColor 15%, transparent)`
  statt fixer `--ncss-color-text`/`-border`-Tokens - sonst unlesbar (User-Report:
  "dunkle Schrift auf dunklem Hintergrund"), sobald der Button auf einer farbigen
  Fläche landet (Hero, CTA-Band), statt nur der normalen hellen Seitenfläche, für die
  die festen Tokens kalibriert sind. Prozentsätze so gewählt, dass sie im Normalfall
  (helle Fläche) den vorherigen festen Tokens optisch entsprechen - keine sichtbare
  Änderung für bestehende Buttons auf normaler Fläche, per Vergleich der berechneten
  Werte bestätigt, nicht nur angenommen.
- `.ncss-text-light`/`.ncss-text-dark` (+ `-100/-300/-700/-900` Deckkraft-Stufen) für
  Flächen, deren Farbe NICHT über ncss-Tokens läuft (Foto, fester Marken-Ton) - reine
  Deckkraft-Stufen von Weiß/Schwarz, funktionieren konfliktfrei auch innerhalb von
  `.ncss-scheme-dark`/`-light`.

## Komponenten-Konventionen

- Neue, wiederverwendbare Komponente → eigene Datei in `dist/components/`, importiert
  in `dist/ncss.css` im Layer `components`. Zugehöriges JS → `dist/js/` (nicht neben
  dem CSS). Rein gestalterische Eigenschaften (Rahmen/Ecken/Schatten) gehören NICHT
  als Default/Modifier in eine Komponente - dafür `helpers/elevation.css`s
  `.ncss-border`/`.ncss-radius-*`/`.ncss-shadow-*` (funktionieren auf jedem Element).
- Ein Kombi-Element (z.B. `.ncss-card-media` + `.ncss-placeholder`) erbt ALLE
  Eigenschaften beider Klassen, auch ungewollte (z.B. doppelte `border-radius`) - bei
  jeder neuen Komponenten-Kombination prüfen, ob eine der beiden Klassen eine
  Eigenschaft mitbringt, die im anderen Kontext falsch ist.
- Ein opt-in JS-Fallback-Script (z.B. `wa-close-on-scroll.js`,
  `hide-on-scroll-fallback.js`) prüft sich IMMER selbst per `CSS.supports(...)` und tut
  nichts, wenn die native Technik bereits greift - kein doppelt arbeitender
  Mechanismus. Ein Feature, das auf zwei Pfaden ausgeliefert wird (nativ + JS-Fallback),
  muss auf BEIDEN Pfaden dieselbe Fähigkeit tragen (z.B. reiche `<option>`-Inhalte, kein
  Rückfall auf `textContent`).
- Jedes opt-in JS, das eine BROWSER-API voraussetzt, die NICHT bereits durch eine
  ältere, verbreitetere API mitgesichert ist (z.B. `fetch()`/`DOMParser` bei
  `modal-router.js`, `ResizeObserver` bei `nav-priority.js`), braucht einen frühen
  Feature-Detection-`return`, GANZ AM ANFANG der Datei, VOR jeder Event-Registrierung -
  zwei unterschiedliche Fallstricke ohne diesen Guard: (1) Ein Klick-Handler, der
  `event.preventDefault()` VOR dem eigentlichen API-Aufruf setzt, stürzt danach mit
  ungefangenem Fehler ab - der Link tut dann GAR NICHTS mehr (schlimmer als kein JS,
  weil die normale Navigation bereits unterdrückt wurde). (2) Ein Custom Element ohne
  Guard um `customElements.define(...)`: `connectedCallback()` kann zur Laufzeit
  abstürzen, die Registrierung selbst war aber trotzdem erfolgreich - `:defined` in
  CSS greift dadurch TROTZDEM, oft mit einem `display:block`-Umschalten ohne die
  zugehörige Layout-Logik dahinter (schlechter als der dokumentierte "ohne JS"-
  Zustand). Bei einem Custom Element deshalb NICHT nur innerhalb von
  `connectedCallback()` prüfen, sondern die GESAMTE `customElements.define(...)`-
  Anweisung überspringen, wenn die Abhängigkeit fehlt - das Element bleibt dann für
  immer `:not(:defined)`, CSS bleibt beim unconditionalen Default. Beide Fälle per
  echtem Playwright-Test verifizieren (die jeweilige API per
  `page.addInitScript(() => delete window.X)` entfernen, NICHT nur lesend beurteilen).
- Seiteneigene, aber generell nützliche Klassen gehören ins geteilte System, nicht in
  eine einzelne Seite - beim Aufräumen einer neuen Seite prüfen, ob eine gerade
  erfundene Seiten-Klasse eigentlich ein fehlendes System-Teil ist, und Duplikate nach
  der Promotion vollständig entfernen, nicht nur umbenennen.
- CSS `resize` (Drag-Handle) ist für interaktive Zieh-Demos zu unzuverlässig (winzige
  Trefferfläche, kein Touch). Für "Wert per Ziehen ändern"-Demos einen echten
  `<input type="range">` nehmen, der die Eigenschaft per JS setzt.
- Eigene Komponente außerhalb dieses Repos (Konsumenten-Projekt): eigenes Präfix statt
  `ncss-` (Kollisionsschutz), `var(--ncss-*)`-Tokens statt roher Werte,
  `@layer components { ... }` in der eigenen Datei (hängt sich in den bereits
  deklarierten Layer-Namen ein) statt unlayered - unlayered nur für punktuelle
  Ein-Eigenschaft-Overrides einer bestehenden Komponente, nie für eine ganze neue.

## Formulare

- `<input list>`/`<select>`-Popups sind in keinem Browser per CSS stylebar. Für
  `<select>`: `appearance: base-select`, wo verfügbar (siehe Safari-Ausnahme oben) -
  sonst/für `<datalist>`: opt-in JS-Enhancement (`combobox.js`), das natives
  Markup/Value als Quelle behält (progressive enhancement, kein Funktionsverlust ohne
  JS).
- `<option>` darf mit `appearance: base-select` beliebige Kind-Elemente enthalten
  (Icon+Label) - Text bleibt PFLICHT (sichtbar oder `.ncss-visually-hidden`), Icons
  sind eine Ergänzung, nie ein Ersatz.
- `<meter>` respektiert `accent-color` absichtlich NICHT für seine Grün/Gelb/Rot-
  Bewertungsfarbe (das ist seine Funktion) - für reine Markenfarbe ohne Wertung
  `<progress>` verwenden. `<input type="search">` braucht `appearance:none` (sonst
  rundet Safari es eigenmächtig ab). `<input type="color">` braucht eine explizite
  `height` (kein implizites Boxmodell wie bei Text-Inputs).
- Mehrere Formular-Steuerelemente visuell verschmelzen (Input-Group): Label als
  GESCHWISTER-Element VOR der Gruppe setzen, nie als Kind hinein (`:first-child` ist
  strukturell, ein unsichtbares Label als erstes Kind bekäme fälschlich die
  Eckenrundung).

## Deploy-/Build-Skripte

- `docs-src/build.mjs` ist ein reines `node:fs`-Skript, kein npm/Bundler - Ausnahme vom
  "kein Build-Schritt"-Prinzip gilt nur für das Doku-Website-TOOLING, nicht die
  CSS-Bibliothek selbst. Ein neuer Platzhalter braucht IMMER drei synchrone Stellen:
  `docs-src/strings.json`-Eintrag, Nutzung in `docs-src/template.html`,
  `.replaceAll(...)`-Zeile in `build.mjs`. Nach jedem Rebuild:
  `grep -rl "__PLATZHALTER_PRAEFIX_"` über `docs/` muss leer sein.
- `.github/scripts/build-root-index.mjs` schreibt `demo/product.html`-Pfade für die
  Site-Wurzel um - Ersetzungsregeln sind exakte String-Paare (kein generisches Regex),
  ein neuer Pfad-Typ in `product.html` braucht eine neue Regel UND ggf. eine
  Erweiterung des Sanity-Checks. Immer per rsync-Simulation lokal prüfen (siehe
  Verifizieren-Abschnitt oben).
- Ein blanker Such-/Ersetz-Migrationsscript über viele strukturell ähnliche Dateien
  muss vorher auf Dateien mit ABWEICHENDER Struktur geprüft werden (z.B. eine Seite mit
  eigenem `<wa-dropdown>`-Nav statt der Standard-Nav) - nach jeder Mehrdateien-
  Migration gezielt auf seiten-untypische Muster grep-prüfen UND den vollen
  Regressionslauf mit Konsolenfehler-Listener fahren, ein reiner Diff-/Screenshot-
  Vergleich deckt einen JS-Fehler auf jedem Seitenaufruf nicht auf.

## Bash-/Rollout-Fallstricke

- `for f in $FILES` mit `FILES="datei1 datei2"` (unquotierter String) übergibt den
  GESAMTEN String als ein `$f` an nachgelagerte Befehle - `declare -a FILES=(...)` +
  `for f in "${FILES[@]}"` (echtes Bash-Array) verwenden.
- Vor einem Bulk-`perl -pi`/`sed -i` über mehrere Dateien: per `grep`-Inventur ALLE
  Fundstellen kennen (echte `<script src>`/`<link href>`, escapte Beispiel-Pfade in
  `<pre><code>`-Blöcken, UND Pfad-Erwähnungen in CSS-Kommentaren sind drei getrennte
  Kategorien, eine reine Attribut-Suche übersieht die letzten beiden). Ein `perl -0pi`
  mit führendem `\s*` kann den Zeilenumbruch VOR dem Treffer mitfressen (kosmetischer,
  aber unsauberer Nebeneffekt) - nach einer Entfernung kurz die Zeilenstruktur prüfen.
- Nach dem Kopieren einer Seiten-Vorlage (z.B. für eine neue Demo-Seite) gezielt nach
  `aria-current="page"` greppen - eine kopierte Vorlage kann das alte Attribut auf dem
  falschen Nav-Item stehen lassen, während das neue Item sein eigenes bekommt (zwei
  aktive Nav-Punkte gleichzeitig markiert).
