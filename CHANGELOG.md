# Changelog

Alle nennenswerten Änderungen an NativeCSS. Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

## [1.4.0] - 2026-11-21

### Geändert (Verhalten)

- **Video- und Audioplayer teilen sich einen Kern: `js/media-core.js`.** Zeitleiste, Lautstärke, Menü, Kapitel, Playlist, Media Session, Tastatur, Texte und „ein Player gleichzeitig“ stehen nur noch einmal darin; `js/video-player.js` und `js/audio-player.js` enthalten nur ihre Besonderheiten. Minifiziert: Videoplayer 23,8 → 10,0 KB, Audioplayer 17,8 → 5,2 KB, dazu einmal der Kern mit 13,6 KB. Beide Player auf einer Seite: 41,8 → 28,8 KB (−31 %, gzip 12,8 → 10,9 KB); ein einzelner Player samt Kern bleibt etwa gleich groß (Video 23,6 KB, Audio 18,8 KB - der Audioplayer kann jetzt mehr, siehe unten). Markup, Attribute, Klassen, Events und Methoden bleiben gleich.
- **Neue Datei mitkopieren:** `js/media-core.js` muss im selben Ordner wie die Player liegen. Jeder Player lädt sie bei Bedarf selbst nach (gleicher Ordner, gleiche Abfrage wie das eigene `src`, `nonce` wird übernommen); einbinden vor den Playern spart die zusätzliche Anfrage: `<script src="js/media-core.js" defer></script>`. Wer die Player bündelt (esbuild & Co.), importiert `js/media-core.js` davor - sonst sucht der Player die Datei neben dem Bündel.
- Audioplayer: dieselben Tasten wie beim Video - neu Pfeil hoch/runter (Lautstärke), N/P (nächster/voriger Titel), `<`/`>` (Geschwindigkeit); Leertaste/K und M werden jetzt auch angesagt. Tooltips der Vor/Zurück-Buttons nennen die Taste („(N)“/„(P)“).
- Audioplayer: `el.previous()` ohne Playlist tut nichts mehr (vorher Sprung auf 0) - wie beim Videoplayer.
- Videoplayer: meldet die Position an die System-Mediensteuerung (`setPositionState`, wie der Audioplayer); Playlist-Links verstehen auch `data-src` (weitere Formate).
- Entfernt (Altlasten): Safari-Präfixe für Element-Vollbild (`webkitRequestFullscreen`, vor Safari 16.4) und `webkitOfflineAudioContext`/Callback-`decodeAudioData` (vor Safari 14.1). iPhone-Vollbild über `webkitEnterFullscreen` bleibt. Ungenutzter Textschlüssel `playlist` des Videoplayers entfällt.
- **Sortierbare Tabelle** kompakter (minifiziert 5,8 → 5,0 KB) und ohne Pflicht-Tokens: `components/table-sort.css` hat für alle Tokens neutrale Rückfallwerte (currentColor, kein Zellen-Ausgleich) und lässt sich so auch in fremden Designs einsetzen - KLXM Studio verwendet sie als einzige Umsetzung.

### Neu

- Sortierbare Tabelle: `th[data-sort-align="end"]` (Schaltfläche rechtsbündig), Klasse `is-sortable` an jeder aufbereiteten Tabelle, `--ncss-table-sort-pad-block`/`--ncss-table-sort-pad-inline` (Zellen-Padding, um das die Schaltfläche die Zelle füllt), ISO-Datum mit Uhrzeit und Zeitzone (`2026-11-20T10:00+02:00`) wird nach dem echten Zeitpunkt sortiert. Texte der Schaltfläche erben `letter-spacing` und `text-transform` des Kopfs.

### Behoben

- Videoplayer: Nach einem Playlist-Wechsel erkannte die Fehleranzeige den Ausfall des letzten `<source>` nicht mehr (Liste beim Start gemerkt).
- Kapitel einer schon geladenen (zwischengespeicherten) Spur erscheinen beim Videoplayer jetzt auch in der Kapitelliste der Karte.

### Hinweis zum Umstieg

- Kopier- und Update-Skripte, die einzelne Dateien übernehmen: `js/media-core.js` zur Liste hinzufügen (neben `js/video-player.js`/`js/audio-player.js`).

## [1.3.0] - 2026-11-21

### Geändert (Verhalten)

- **Navigation: Container Query zuerst, JavaScript misst nur nach.** Ohne JavaScript schaltet `.ncss-nav` nicht mehr fest bei 64rem Fensterbreite, sondern per Container Query an der Breite der Kopfzeile: `.ncss-topbar-inner` (bzw. das neue `.ncss-nav-container` für eigene Leisten) ist Container `ncss-nav`, die Seite nennt mit **`data-ncss-nav-fit="N"`** die nötige Zeilenbreite in rem (24 bis 120 in Vierer-Schritten, z.B. vom CMS aus Marke, Menüpunkten und Aktionen geschätzt - Formel und PHP-Beispiel im Handbuch). Ohne Angabe gilt 64rem Zeilenbreite. Der Zustand steht damit vor dem ersten Zeichnen fest und wächst mit Schriftgröße und Zoom mit. `js/nav.js` misst wie bisher nach (Textabstände, Ersatzschriften, Übersetzungen); sein Zustand `data-ncss-nav-auto="inline|compact"` hat Vorrang.
- **Ein Schalter statt doppelter Regeln:** Alle Wege (Container Query, Viewport-Schwelle, `.ncss-nav--compact`, `js/nav.js`) setzen die Custom Property **`--ncss-nav-compact`** (Space Toggle) an der Nav und an ihren Geschwistern in der Zeile. Die Kompakt-Regeln stehen in `nav.css` nur noch einmal; eigenes CSS liest denselben Schalter (`--_d: var(--ncss-nav-compact) none; display: var(--_d, inline-flex);`) und stimmt mit und ohne JavaScript. Der bisherige Doppelblock `@media (max-width: 63.99rem)` entfällt.
- `data-ncss-nav-auto="off"`, Navs mit `<ncss-nav-drilldown>` und Navs außerhalb eines Containers behalten die feste Viewport-Schwelle 64rem. Eine laufende `<ncss-nav-priority>` klappt nie zusammen.
- **Jede Datei unter `components/` und `helpers/` legt ihren Cascade Layer selbst fest** (`@layer components { … }` bzw. `@layer helpers { … }`). Einzeln per `<link>` geladene Komponenten (z.B. `components/preferences.css`) schlagen damit nicht mehr als Layer-freies CSS alle übrigen Regeln. `ncss.css` importiert sie ohne `layer()`; ein Import mit `layer(components)` funktioniert weiter (Unter-Layer).
- Scrollytelling: inaktive Schritte werden nicht mehr per `opacity: 0.65` gedimmt (Kontrast nur 3,1:1 bzw. 4,2:1 im Dunkelmodus), sondern mit gedämpfter Textfarbe und Graustufen - voll lesbar nach WCAG 1.4.3.
- Vorher/Nachher `<ncss-compare>`: Der Regler ist so breit wie der Rahmen und ragt nicht mehr um den halben Griff über den Rand (bei 390px über den Seitenrand). Linie und Griff laufen von halber Griffbreite bis Breite minus halbe Griffbreite.

### Neu

- `data-ncss-nav-fit`, `.ncss-nav-container`, Schalter `--ncss-nav-compact` (siehe oben).
- Texte überschreibbar per `data-label-<schlüssel>` (camelCase als kebab-case): `<ncss-audio-player>`, `<ncss-video-player>` (alle Texte), Hintergrundvideo (`data-label-play`, `data-label-pause`, `data-label-video`), `<ncss-compare>` (`data-label-value`). Sprache jeweils nach dem nächsten `[lang]`-Vorfahren statt nur `<html lang>`.
- `js/reveal.js` meldet auch Einmal-Reveals, die das CSS selbst per `timeline-trigger` abspielt: `.is-revealed` und Event `ncss-reveal` beim Start der Animation.
- Handbuch: Live-Beispiel der Navigation mit und ohne JavaScript nebeneinander am selben Regler; Schätzformel für `data-ncss-nav-fit`.

### Umbenannt

- `<ncss-compare value-text>` heißt jetzt `data-label-value` (`value-text` wird weiter gelesen).
- Hintergrundvideo: Textschlüssel `label` heißt `video` (`data-label-video`).
- `<ncss-preferences>`: mehrteilige Schlüssel als kebab-case - `data-label-motion-hint`, `data-label-reset-done`, `data-label-font-default` (vorher `motionhint`, `resetdone`, `fontdefault`).
- `<ncss-preferences>`: deutsche Standardtexte neutral formuliert (ohne du/Sie), z.B. „Die Darstellung lässt sich hier anpassen. Ohne Änderung gelten die Einstellungen des Geräts."

### Hinweis zum Umstieg

- Eigenes CSS, das an `@media (max-width: 63.99rem)` und `[data-ncss-nav-auto="compact"]` doppelt hing, durch den Schalter `--ncss-nav-compact` ersetzen - oder für Elemente außerhalb der Zeile beim Zustand von `js/nav.js` bleiben.
- Kopfleisten ohne `.ncss-topbar-inner`: dem Element, das die Nav als Kind trägt, `.ncss-nav-container` geben (nur Elemente mit eigener Breite, nicht nach Inhalt bemessen).

## [1.2.2] - 2026-11-20

### Behoben

- Kompakt-Modus: Wurde `components/off-canvas.css` NACH `components/nav.css` geladen (eigenes Cherry-Picking), gewann dessen Transition auf `display` - beim automatischen Umschalten blieb das geschlossene Panel dann als `display: contents` sichtbar in der Zeile hängen. Die Regel ohne `display`-Transition gilt jetzt unabhängig von der Import-Reihenfolge.

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
