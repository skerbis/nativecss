# Changelog

Alle nennenswerten Änderungen an NativeCSS. Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

## [1.1.0] - 2026-11-20

### Neu

- **Scroll-Effekte:** Curtain-Sektionen, Horizontal-Scroll (Tastaturfokus scrollt mit), Text-Reveal, Scrollytelling `<ncss-scrolly>`, Count-up, Marquee, Reveal-Formen (Kreis, Wipe, Split, Zoom, Expand …) und Reveal-Pin - nativ über `view()`-Timelines, kleine JS-Fallbacks nur wo nötig.
- **Moderne UI:** Bento-Raster, Spotlight, Vorher/Nachher-Vergleich `<ncss-compare>`, Aufklapp-Panels, Befehlspalette `<ncss-command-palette>`, Hovercards `<ncss-hovercard>`, Benachrichtigungen `<ncss-toast-region>` / `ncss.notify()` mit gestapeltem Modus, Aurora- und Mesh-Hintergründe.
- **Video & Audio:** `<ncss-video-player>` und `<ncss-audio-player>` aus einem Guss (Kapitel, Playlist, Untertitel, Geschwindigkeit, Bild-in-Bild, Media Session, Tastatur), scroll-gesteuertes Video `<ncss-scroll-video>` und Bildsequenz `<ncss-scroll-frames>`, Hintergrundvideo für beliebige Sektionen (mit Pause-Knopf, WCAG 2.2.2), Video im Text, Mini-Player `<ncss-video-float>`, Vorschau-Karten.
- **Abschnitts-Navigation** (`subnav`): klebende „Auf dieser Seite“-Leiste mit automatischer Hervorhebung.
- **Neu-Markierung** `.ncss-badge-dot`.

### Website & Werkzeuge

- Website komplett neu: eine generierte Shell für Start, Handbuch und Beispiele, Suche (⌘K), Code-Inspektor mit Erklärungen, Live-Beispiele direkt im Handbuch, neue Beispiel-Websites (Gemeinde, Hotel, ImmoDesk-Backend).
- Lokaler Entwicklungs-Router `docs-src/dev-router.php` mit Range-Support für Video/Audio.
- Veröffentlichung bei npm (`npm i nativecss`) zusätzlich zu Kopieren und CDN - weiterhin ohne Build-Schritt nutzbar.

### Konventionen

- Eigene Events heißen einheitlich `ncss-<komponente>-<aktion>`.
- Jede neue Komponente ist einzeln einbindbar (nur `colors`/`tokens`/`reset`/`base` nötig).

## [1.0.0]

Erster öffentlicher Stand von NativeCSS.
