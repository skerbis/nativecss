# NativeCSS

*(Klassen-Präfix im Code: `ncss`)*

Ein natives CSS-Designsystem ohne Build-Schritt. Kein LESS/Sass, kein Bundler, kein
Preprocessor. `@import` und CSS Cascade Layers regeln die Ladereihenfolge, ein einziges
Token-System ist die Quelle aller Werte. Typografie und Abstände sind **fließend**
(`clamp()`), Komponenten reagieren über **Container Queries** auf ihren Platz statt auf
Viewport-Breakpoints. **Barrierefreiheit ist in jedem Baustein eingebaut**, nicht nachgerüstet.

**[Website](https://skerbis.github.io/nativecss/) · [Handbuch](https://skerbis.github.io/nativecss/docs/de/index.html) · [Tour durch alle Funktionen](https://skerbis.github.io/nativecss/demo/showcase/index.html) · [Beispiele](https://skerbis.github.io/nativecss/docs/de/examples.html) · [Changelog](CHANGELOG.md)**

## Worum es geht

Die meisten CSS-Frameworks lösen Probleme, die der Browser inzwischen selbst löst.
NativeCSS baut konsequent auf diese Plattform-Fähigkeiten, statt sie nachzubauen:

- **Cascade Layers statt Spezifitäts-Kämpfe.** Eine `@layer`-Deklaration legt die
  Reihenfolge fest - kein `!important`-Wettrüsten.
- **Container Queries statt Breakpoint-Wildwuchs.** Eine Komponente sieht in einer
  Seitenleiste und im Hauptbereich jeweils passend aus.
- **`light-dark()` statt zweitem Dark-Stylesheet.** Ein Wert pro Token für Hell und Dunkel.
- **Native Elemente statt JS-Nachbauten:** `<dialog>`, `<details>`, Popover API, Anchor
  Positioning, Scroll-driven Animations, View Transitions.
- **Web Components nur, wo Verhalten nötig ist** - als Light-DOM-Elemente
  (`<ncss-video-player>`, `<ncss-tabs>`, `<ncss-map>` …), ohne Abhängigkeiten, in jedem
  Framework nutzbar.
- **Cherry-Picking.** Jede Komponente ist eine eigene Datei und braucht nur die Basis
  (Farben, Tokens, Reset, Base) - nicht benötigte `@import`-Zeilen einfach löschen.

## Barrierefreiheit

Grundlage für Websites nach WCAG 2.2 AA (und damit für das BFSG):

- sichtbarer Fokus überall, Tastaturbedienung nach dem WAI-ARIA Authoring Practices Guide,
- kontrastsichere Farb-Tokens in Hell und Dunkel,
- Nutzer-Einstellungen werden respektiert: reduzierte Bewegung, mehr Kontrast, Forced Colors,
  200 % Zoom und Textabstände,
- **`<ncss-preferences>`**: Besucher stellen Farbschema, Kontrast, Bewegung, Schriftgröße
  und lesbare Schriften (Atkinson Hyperlegible Next, Lexend, OpenDyslexic, selbst gehostet)
  selbst ein - kein „Overlay“, das Fehler überdeckt, sondern Anpassung einer bereits
  barrierefreien Seite,
- funktioniert ohne JavaScript - Skripte verbessern nur.

NativeCSS hilft, barrierefreie Websites zu bauen; konform wird eine Website erst durch
Inhalt und Umsetzung. Das Handbuch enthält dazu Kapitel zu Tastatur, Screenreadern,
Formularen, Medien, Tests, eine WCAG-Checkliste und eine Vorlage für die
Barrierefreiheitserklärung.

## Was drin ist

- **Grundlagen:** Tokens, Farben mit Stufen, fließende Typografie, Icons (52 Kern-Icons
  per Klasse, alle Phosphor-Icons per `<ncss-icon>`, Sprite-Builder).
- **Layout:** Container, Stack, Cluster, Grid, Bento, Masonry, Ausbrechen (Bleed), Float,
  Sticky, Landingpage-Bausteine (Split, Tile, Preistabellen, Kundenstimmen).
- **Inhalt:** Karten (Overlay, Auswahl-Karten, Raster mit Subgrid, Skelett), Listen,
  Leader-Linien, Tabellen (sortierbar, Scroll-Schatten), Zeitleiste, Stepper, Kommentare,
  Hinweise, Badges.
- **Navigation:** Kopfleiste, Off-Canvas, Priority-Nav, Drilldown, Breadcrumb, Tabs (mit
  Animationen), Pagination, Abschnitts-Navigation, Befehlspalette, Dropdown/Aktionsmenü,
  Pillen-Gruppe, Toolbar mit Split-Button.
- **Formulare:** alle Feldtypen, Validierung, Floating Labels, Segmented (auch als
  gleitender Modus-Umschalter), Bewertung, Dropzone, Combobox.
- **Overlays:** Dialoge (schließen beim Klick daneben, abschaltbar), Popover, Tooltip,
  Hovercard, Benachrichtigungen.
- **Medien:** Video- und Audio-Player aus einem Guss (Kapitel, Playlist, Untertitel),
  Hintergrundvideo, Slideshow mit Pfeilen und Punkten, Lightbox, Karten `<ncss-map>`
  (MapLibre, Proxy-fähig, Zwei-Klick-Modus).
- **Scroll-Effekte:** Reveal, Morphing, Text-Reveal, Scrollytelling, Count-up, Marquee,
  Curtain, Horizontal-Scroll, scroll-gesteuertes Video - nativ per `view()`-Timelines,
  bei reduzierter Bewegung aus.
- **Filter-Raster**, sortierbare Listen, Countdown, Empty States und weitere App-Bausteine.

## Schnellstart

```html
<link rel="stylesheet" href="ncss.css">
<link rel="stylesheet" href="theme.css">
```

`ncss.css` importiert alles Weitere in der richtigen Layer-Reihenfolge, `theme.css` ist die
Stelle für eigene Markenwerte (Farben, Schriften, Radien). Scripts liegen einzeln in
`dist/js/` und werden nur dort eingebunden, wo die Komponente vorkommt.

**Bezugswege** - alle gleichwertig, keiner braucht einen Build-Schritt:

| Weg | So geht's |
|---|---|
| Release-ZIP | [Neuestes Release](https://github.com/skerbis/nativecss/releases/latest) herunterladen, `dist/` ins Projekt kopieren |
| Git | `git clone https://github.com/skerbis/nativecss.git` und `dist/` nehmen |
| npm | `npm i nativecss`, dann `import "nativecss"` (= `dist/ncss.css`) |
| CDN | `https://cdn.jsdelivr.net/npm/nativecss@1/dist/ncss.css` |

Komponenten mit externen Dateien (Phosphor-Icons für `<ncss-icon>`, MapLibre für
`<ncss-map>`) liegen in `vendor/` - im ZIP und per Git enthalten, bei npm per
`vendor`-Attribut auf eine eigene Kopie zeigen.

## Integration

- **REDAXO 6 + [fluid](https://github.com/KLXM/fluid):** fertiges NativeCSS-Kit - Blöcke,
  Design-Einstellungen, Darstellungs-Knopf für Besucher, lädt pro Seite nur, was gebraucht wird.
- **KLXM Studio:** NativeCSS-Kit demnächst.
- **REDAXO 5, WordPress, TYPO3, Contao, Kirby** und **Laravel, Symfony, Astro, Eleventy,
  React, Vue, Svelte, htmx** - Anleitungen im Handbuch unter „Integration“.

## Werkzeuge

- **Code-Inspektor** auf allen Seiten der Website: Element anklicken → HTML, Erklärung und
  die passenden `@import`-Zeilen.
- **UIkit → NativeCSS-Konverter** (Browser und Kommandozeile) für bestehende Templates.
- **VS-Code-Unterstützung** (Klassen-Vervollständigung, Snippets) und ein **LLM-Paket**
  (`llms.txt`, Klassen-Index, Hook) für KI-Assistenten.

## Browser

Ausgelegt auf die Browser der letzten zwei Jahre (Chrome/Edge, Safari, Firefox). Neuere
Features werden schrittweise eingesetzt: Wo ein Browser etwas nicht kann, bleibt die
Darstellung vollständig nutzbar - nur ohne den Effekt.

## Mitmachen

Fehler gefunden, eine Komponente verbessert, Doku ergänzt? **Pull Requests und
[Issues](https://github.com/skerbis/nativecss/issues) sind herzlich willkommen.**
Die Website entsteht aus `docs-src/` (`node docs-src/build.mjs`, danach
`node docs-src/sync-demo.mjs`); lokal mit Video-Unterstützung:
`php -S 127.0.0.1:8770 -t . docs-src/dev-router.php`.

## Unterstützen

NativeCSS ist frei (MIT) und entsteht in freier Zeit. Wenn es dir oder deinen Projekten
hilft, freue ich mich über Unterstützung via
**[GitHub Sponsors](https://github.com/sponsors/skerbis)** - das finanziert Pflege,
Barrierefreiheit und neue Komponenten.

## Lizenz

[MIT](LICENSE) © 2026 [Thomas Skerbis](https://github.com/skerbis) und
[KLXM Crossmedia](https://github.com/klxm). Mitgelieferte Schriften (SIL OFL), Icons und
Bibliotheken in `vendor/` stehen unter ihren eigenen Lizenzen - siehe die jeweiligen
Lizenzdateien und das [Impressum](https://skerbis.github.io/nativecss/docs/de/impressum.html).
