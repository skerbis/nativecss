# Changelog

Alle nennenswerten Änderungen an NativeCSS. Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

## [1.2.1] - 2026-11-20

### Behoben

- Automatischer Kompakt-Modus: eine Nav-Liste mit `justify-content: flex-end` (oder `center`, RTL) lief zum Zeilenanfang über die Marke, ohne dass `js/nav.js` das erkannte - `scrollWidth` misst nur Überlauf zum Zeilenende. Jetzt werden die äußeren Kanten der Punkte geprüft.

## [1.2.0] - 2026-11-20

### Geändert (Verhalten)

- **Navigation ohne festen Breakpoint:** `.ncss-nav` klappt jetzt automatisch genau dann zur Menü-Schaltfläche (Off-Canvas) zusammen, wenn die Liste nicht mehr in **eine** Zeile neben Marke und Aktionen passt - bei jeder Breite. `js/nav.js` misst per `ResizeObserver` (Zeile, Marke, Aktionen und Nav-Punkte, also auch bei größerer Schrift, Zoom und Textabständen) und setzt `data-ncss-nav-auto="inline"` bzw. `"compact"`. Die Liste bricht dabei nie mehr in eine zweite Zeile um. Ohne JavaScript bleibt die bisherige Umschaltung bei 64rem als Rückfall.

### Neu

- `.ncss-nav--compact`: immer Menü-Schaltfläche, bei jeder Breite.
- `data-ncss-nav-auto="off"`: Automatik aus, feste Umschaltung bei 64rem (für Seiten, deren eigenes CSS an derselben Schwelle hängt - so die Kopfleiste der Website).
- Event `ncss-nav-change` (`event.detail.compact`) bei jedem Wechsel.
- Barrierefreiheit: `js/nav.js` setzt `aria-controls` und hält `aria-expanded` der Menü-Schaltfläche passend zum Panel. Klappt die Liste zusammen, während der Fokus darin liegt, wandert er auf die Schaltfläche; wird es wieder breit, schließt ein offenes Panel und der Fokus bleibt auf dem Link.
- Handbuch: Live-Beispiel mit Breiten-Regler und Tabelle der Schalter (Navigation → Off-Canvas und automatischer Kompakt-Modus).

### Behoben

- `.ncss-nav--tree` bekam unter 64rem fälschlich den oberen Panel-Abstand der Off-Canvas-Liste.

### Hinweis zum Umstieg

- Seiten mit eigenem CSS, das an der 64rem-Schwelle der Nav hängt, entweder auf den Zustand umstellen (`.ncss-nav:is(.ncss-nav--compact, [data-ncss-nav-auto="compact"])`, dazu dieselben Regeln in `@media (max-width: 63.99rem)` für Seiten ohne JS) oder `data-ncss-nav-auto="off"` setzen.
- `js/nav.js` am besten im `<head>` mit `defer` laden - dann steht der Zustand vor dem ersten Zeichnen fest.

## [1.1.0] - 2026-11-20

### Neu

- **Scroll-Effekte:** Curtain-Sektionen, Horizontal-Scroll (Tastaturfokus scrollt mit), Text-Reveal, Scrollytelling `<ncss-scrolly>`, Count-up, Marquee, Reveal-Formen (Kreis, Wipe, Split, Zoom, Expand …), Reveal-Pin und Morphing beim Scrollen (großes Bild/Video schrumpft an den Rand und macht Platz für Text, auch als Karte oder Kreis) - nativ über `view()`-Timelines, kleine JS-Fallbacks nur wo nötig.
- **Moderne UI:** Bento-Raster, Spotlight, Vorher/Nachher-Vergleich `<ncss-compare>`, Aufklapp-Panels, Befehlspalette `<ncss-command-palette>`, Hovercards `<ncss-hovercard>`, Benachrichtigungen `<ncss-toast-region>` / `ncss.notify()` mit gestapeltem Modus, Aurora- und Mesh-Hintergründe.
- **Video & Audio:** `<ncss-video-player>` und `<ncss-audio-player>` aus einem Guss (Kapitel, Playlist, Untertitel, Geschwindigkeit, Bild-in-Bild, Media Session, Tastatur), scroll-gesteuertes Video `<ncss-scroll-video>` und Bildsequenz `<ncss-scroll-frames>`, Hintergrundvideo für beliebige Sektionen (mit Pause-Knopf, WCAG 2.2.2), Video im Text, Mini-Player `<ncss-video-float>`, Vorschau-Karten.
- **Karten** `<ncss-map>` (MapLibre GL): Proxy-Adressen für Stil, Kacheln, Schriften und Symbole (Präfix oder `{url}`-Vorlage) - Besucher haben keinen Kontakt zu Dritten; Zwei-Klick-Modus, lädt erst in Sichtweite, Fallback ohne JS, Dunkelmodus, 3D-Ansicht.
- **Karten-Komponente ausgebaut:** ganze Karte als Link (innere Buttons bleiben bedienbar), Bild-Overlay, Seitenverhältnisse, Zoom, Auswahl-Karten (Radio/Checkbox), hervorgehobene, deaktivierte und Akzent-Karten, Kopf mit Aktionen, Meta-Zeile, Karten-Raster mit Subgrid, Lade-Skelett.
- **Morphing beim Scrollen** `.ncss-morph`: großes Bild/Video schrumpft zur Seite und macht Platz für Text (auch umgekehrt, Karte, Kreis) - reines CSS, statisches Endbild als Fallback.
- **Neue Bausteine:** Dropdown/Aktionsmenü `<ncss-dropdown>` (APG Menu Button oder Link-Liste), Tabellen-Sortierung `<ncss-table-sort>`, sortierbare Liste `<ncss-sortable>` (Maus, Touch, Tastatur, Hoch/Runter-Knöpfe), Slideshow-Pfeile und -Punkte (nativ per `::scroll-button`/`::scroll-marker`, sonst `<ncss-slideshow>`), Filter-Raster `.ncss-filter` (reines CSS, optional `<ncss-filter>`), Scroll-Schatten `.ncss-scroll-shadow`, Zeitleiste und Stepper, Kundenstimmen und Preistabellen, Leader-Linien, Kommentare, Pillen-Gruppe `.ncss-pill-group`, Toolbar `<ncss-toolbar>` mit Split-Button, Modus-Umschalter `.ncss-segmented--pill`.
- **Animationen:** Tabs mit gleitendem Unterstrich, Pillen und Panel-Übergängen (`animate="fade slide scale height"`), gleitende Auswahl in `.ncss-segmented--slide`; alles aus bei reduzierter Bewegung.
- **Buttons:** `--pill`, `--ghost`.
- **Akzent-Balken** statt dicker Randkanten an abgerundeten Karten, Hinweisen und Kommentaren.
- **Darstellungs-Einstellungen** `<ncss-preferences>`: Besucher wählen Farbschema, Kontrast, Bewegung, Schriftgröße, Textabstände, Link-Unterstreichung, Fokus-Rahmen und lesbare Schriften (Atkinson Hyperlegible Next, Lexend, OpenDyslexic, selbst gehostet) - kein „Overlay“, sondern Anpassung einer bereits barrierefreien Seite.
- **Icons:** 52 Kern-Icons per Klasse, alle Phosphor-Icons per `<ncss-icon>`, Sprite-Builder.
- **Dialoge** schließen standardmäßig beim Klick daneben (`closedby="any"`, abschaltbar).
- **Abschnitts-Navigation** (`subnav`): klebende „Auf dieser Seite“-Leiste mit automatischer Hervorhebung.
- **Neu-Markierung** `.ncss-badge-dot`.

### Website & Werkzeuge

- Website komplett neu: eine generierte Shell für Start, Handbuch und Beispiele, Suche (⌘K), Code-Inspektor mit Erklärungen, Live-Beispiele direkt im Handbuch, neue Beispiel-Websites (Gemeinde, Hotel, ImmoDesk-Backend), Tour durch alle Funktionen, Impressum und Datenschutz, „Unterstützen“ in der Kopfleiste.
- Lokaler Entwicklungs-Router `docs-src/dev-router.php` mit Range-Support für Video/Audio.
- Veröffentlichung bei npm (`npm i @skerbis/nativecss`) zusätzlich zu Kopieren und CDN - weiterhin ohne Build-Schritt nutzbar.

### Konventionen

- Eigene Events heißen einheitlich `ncss-<komponente>-<aktion>`.
- Jede neue Komponente ist einzeln einbindbar (nur `colors`/`tokens`/`reset`/`base` nötig).

## [1.0.0]

Erster öffentlicher Stand von NativeCSS.
