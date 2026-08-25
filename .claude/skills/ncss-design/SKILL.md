---
name: ncss-design
description: Design-Arbeit MIT dem fertigen ncss Design System - eigenes Theme/Farbpalette/Typografie entwickeln, eine Seite aus vorhandenen Komponenten komponieren. Für gestalterische Entscheidungen (Farben, Radien, Bewegung, Layout), nicht für Änderungen am ncss-Quellcode selbst - dafür der Skill "ncss-development".
---

# ncss Design

Für die gestalterische Arbeit MIT dem fertigen ncss-System in einem KONSUMENTEN-Projekt
(eigenes Theme, eigene Seite) - nicht für Änderungen am ncss-Quellcode selbst (dafür:
Skill `ncss-development`). Volle Schritt-für-Schritt-Anleitungen im Handbuch:
`docs/de/custom-theme.html` (Theme + einzelne Komponenten anpassen),
`docs/de/custom-components.html` (komplett neues Bauteil), `docs/de/components.html`
(Referenz). Dieser Skill fasst die DESIGN-Entscheidungen zusammen, das Handbuch die
technischen Details.

## Startpunkt

- `dist/` komplett ins Projekt kopieren, `ncss.css` + eigene `theme.css` einbinden
  (NACH `ncss.css`).
- `ncss.css` selbst als Manifest kopieren und nicht benötigte `@import`-Zeilen
  entfernen (Cherry-Picking) für ein schlankes Projekt-CSS, statt alles auszuliefern.
- Web Awesome/Font Awesome nur bei echtem Bedarf einbinden (`dist/integrations/`,
  komplett opt-in) - für die meisten Seiten reicht natives HTML/CSS.

## Farbpalette entwickeln

- Nur SEED-Werte in `theme.css` setzen: `--ncss-color-brand`/`-brand-2`/`-neutral` +
  deren `-contrast`-Partner, `--ncss-color-bg`/`-surface`/`-text`. Die ganze Skala
  (100/300/700/900, `-on-soft`) wird automatisch per `color-mix()` daraus abgeleitet -
  NICHT einzeln setzen.
- Jeder Farbwert als `light-dark(hell, dunkel)`-Paar - EIN Wert deckt beide Modi ab.
  Dark-Werte sind NICHT automatisch aus Hell invertierbar - von Hand ein stimmiges
  Pendant wählen (meist heller/entsättigter für Kontrast auf dunklem Grund), danach
  Dark Mode aktiv testen (DevTools → Rendering → prefers-color-scheme).
- Kontrast-Zielwerte: 4.5:1 Fließtext, 3:1 große Schrift/UI-Elemente. Weißer/heller
  Text auf `--ncss-color-brand` (Button-Beschriftung) ist der härteste Test - passt er
  knapp nicht, die Markenfarbe selbst dunkler/kräftiger sättigen statt einzelne
  Textfarben nachträglich zu patchen.
- Text ALS Markenfarbe (nicht Text AUF der Markenfarbe, z.B. ein Badge/Kicker) braucht
  die `-on-soft`-Stufe (`--ncss-color-brand-on-soft`), nie die rohe Basisfarbe - sonst
  zu wenig Kontrast auf hellem Grund.
- Nach jeder Farbänderung: echtes Lighthouse laufen lassen (DevTools → Lighthouse →
  Accessibility), nicht nur mit bloßem Auge prüfen.
- Mehrere Marken/Domains auf derselben Codebasis: `theme-x.css`-Dateien parallel ODER
  die `[data-palette]`-Konvention in `colors.css` für rein attributgesteuerten Wechsel
  ohne zweite Datei.

## Typografie & Bewegung

- `--ncss-font-family-base`/`-heading`/`-mono` in `theme.css` - `system-ui` als Default
  braucht keine Ladezeit; eine eigene Web-Font ist ein bewusster Tausch Ladezeit gegen
  Charakter. Die fluide `clamp()`-Größen-Skala selbst bleibt unverändert, nur die
  Font-Familie wechseln.
- `--ncss-radius-sm`/`-md`/`-lg` + `--ncss-shadow-sm`/`-md`/`-lg` +
  `--ncss-motion-duration`/`-easing` sind die "Persönlichkeit" eines Themes - scharf/
  eckig (Radius Richtung 0) vs. weich/rund, zurückhaltend vs. verspielt. Konsistent
  über ALLE Stufen hinweg entscheiden, nicht nur einzelne Komponenten anpassen.

## Seiten komponieren

- `.ncss-grid` (intrinsisch, `auto-fit`) ist der Standardweg für Karten-/Kachel-Raster.
  `.ncss-flex-grid` + `.ncss-width-1-2`/`-1-3`/... nur, wenn eine unvollständige letzte
  Zeile zentriert werden soll statt linksbündig zu kleben (Details: `docs/de/
  layout.html`).
- `.ncss-hero` für Bild-/Video-Hintergrund-Sektionen mit Inhalt obenauf, `.ncss-cover`
  für Embed-Zuschnitt (`<iframe>`), `.ncss-overlay` für ein Panel auf einem einzelnen
  Bild/einer Karte - drei Größenordnungen desselben "Inhalt über Medium"-Prinzips
  (Details: `docs/de/media.html`).
- `.ncss-card` liefert nur Struktur - Rahmen/Ecken/Schatten kommen bewusst separat aus
  `helpers/elevation.css` (`.ncss-border`, `.ncss-radius-*`, `.ncss-shadow-*`,
  `.ncss-shadow-hover-*`), frei mit jeder Komponente kombinierbar statt fest
  eingebacken.
- Aufzählungen/Definitionslisten: `components/lists.css` (`.ncss-list--dot`/`-dash`/
  `-icon`/`-divided`/`-steps`, `.ncss-dl`/`-inline`/`-stats`) statt eigener
  Marker-Regeln - Details: `docs/de/lists.html`.
- Referenz für die volle Klassenliste: `docs/de/components.html`. Lebende Beispiele:
  `demo/index.html` (Kitchen-Sink) und die jeweilige eigene Demo-Seite (siehe
  Doku-Sidebar).

## Wenn nichts Passendes existiert

- Einzelne Eigenschaft einer BESTEHENDEN Komponente anders (z.B. Badges eckiger):
  eine Regel in der eigenen, unlayered CSS-Datei (derselbe Trick wie `theme.css`
  selbst) - kein `!important`, keine Kopie der ncss-Datei. Details: `docs/de/
  custom-theme.html#schritt-7`.
- Komplett neues Bauteil, das es in ncss noch nicht gibt: eigenes Klassen-Präfix
  (nicht `ncss-`, Kollisionsschutz), `var(--ncss-*)`-Tokens statt roher Werte,
  `@layer components { ... }` in der eigenen Datei (hängt sich in den bereits
  deklarierten Layer-Namen ein, kombiniert dadurch frei mit `helpers/`-Utilities),
  `container-type`/`-name` + `@container` statt Viewport-Breakpoints. Volle Anleitung
  mit Beispiel: `docs/de/custom-components.html`.

## Barrierefreiheit beim Design

- Jede neue Farbkombination gegen die Kontrast-Zielwerte oben prüfen, nicht nur die
  offensichtlichen Textblöcke - Hover-/Fokus-Zustände und verschachtelte `<code>`/
  Badge-Elemente ändern den lokalen Hintergrund und damit den Kontrast erneut.
- `role="list"` auf jeder `<ul>`/`<ol>`, die `list-style:none` bekommt (z.B. über
  `.ncss-list--*`) - sonst geht in einigen Screenreadern die Listen-Semantik verloren.
- `placeholder` ersetzt kein `<label>`. Bei automatisch abspielenden Hintergrund-Videos
  (`.ncss-hero-media > video[autoplay]`) `js/hero-video-motion.js` einbinden, damit
  `prefers-reduced-motion` respektiert wird.
