# Changelog

Alle nennenswerten Änderungen an NativeCSS. Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

## [1.1.1] - 2026-11-20

### Behoben

- **Formulare:** `.ncss-field-hint`/`.ncss-field-error` in `.ncss-field` ohne den Absatz-Abstand aus `base.css` (keine doppelte Lücke unter Feldern mit Hinweis).
- **Navigation:** `.ncss-nav--tree` ohne leeren Streifen über dem ersten Punkt auf schmalen Screens; bei `.ncss-nav--scroll` liegt der erste/letzte Punkt nicht mehr im Rand-Verlauf (Innenabstand = Verlaufsbreite, Token `--ncss-nav-scroll-fade`).
- **Hinweise:** `.ncss-alert` mit `align-content: start` - im gedehnten Raster rücken Titel und Text nicht mehr auseinander.
- **Termine/Downloads:** die von `events.js`/`downloads.js` erzeugten Absätze haben einen eigenen, engen Rhythmus statt der Absatz-Abstände aus `base.css`; Datumszeile im Einzeltermin mit Abstand zum Titel.
- **Tabellen:** die `<caption>` einer gestapelten Tabelle (`.ncss-table-stacked`) läuft über die volle Breite statt auf Wortbreite zu schrumpfen; Beschriftung von Scroll-Tabellen linksbündig.
- **Code-Blöcke:** feine Kontur um `<pre>` - auf grauen Flächen (`bg-subtle`, `.ncss-tile--muted`) war der Block sonst unsichtbar, hell wie dunkel.
- **Termine:** `events.js` nimmt die Sprache wie `downloads.js` vom nächsten `[lang]`-Vorfahren (sonst `<html lang>`).
- **Dialoge/Glas:** letzter Absatz in `.ncss-modal`/`.ncss-modal-body` und `.ncss-glass` ohne Endabstand (per `:where()`, überschreibbar).
- **Darstellungs-Einstellungen:** Bewegungs-Hinweis ohne überzähligen Abstand, Gedankenstrich „–“ statt „-“ im Text.
- **Tooltip:** Abstand zum Viewport-Rand (`--ncss-tooltip-viewport-gap`) statt bündig am Bildschirmrand.
- **Video:** `figure.ncss-video.ncss-ratio-video` mit `<figcaption>` schneidet die Bildunterschrift nicht mehr ab - Seitenverhältnis, Rundung und Hintergrund gelten dann dem `<video>`.
- **Overlay:** die Blende von `.ncss-overlay--scrim` an `--bottom`/`--top` reicht über den Text hinaus (`--ncss-overlay-scrim-extent`), der Text liegt im dichten Teil.
- **Video in Schrift:** der Pause-Schalter bekommt auf schmaler Fläche eine eigene Zeile statt die Buchstaben zu verdecken.
- **Reveal-Pin:** das Panel hat im Fallback (reduzierte Bewegung, ohne Scroll-Timeline) seitlichen Abstand und ist zentriert.
- **Scroll-Stack:** bei reduzierter Bewegung oder `data-motion="reduce"` werden die Karten auch mit Scroll-Timeline-Unterstützung als normale Liste untereinander gezeigt; `data-motion="full"` hebt ein System-„reduce“ auf.
- **Segmente:** `.ncss-segmented` nutzt `inline-size: fit-content` statt `align-self`/`justify-self: start` - in einer `.ncss-cluster`-Zeile wieder auf der gemeinsamen Mittellinie.
- **Countdown:** vier Kacheln brechen in schmalem Platz 2×2 statt 3+1 um (Container-Query auf `<ncss-countdown>`).
- **Bento:** `.ncss-bento--hero`/`--mosaic` ohne Löcher bei 2-5 Spalten (Spannweiten je Spaltenzahl, höchstens 5 Spalten).
- **Pillen-Gruppe:** passt `.ncss-pill-group` nicht in die Breite, scrollt sie in sich statt die Seite zu verbreitern (Handbuch-Beispiel bei 320px).
- **Stamped:** der gravierte Rahmen bleibt auf weißem (und dunklem) Grund durchgehend sichtbar; Forced-Colors-Darstellung ergänzt.

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
