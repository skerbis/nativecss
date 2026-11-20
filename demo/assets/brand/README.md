# NativeCSS – Schriftzug

„Native“ in Schreibschrift (Blau), „CSS“ fett (Textfarbe). Alle Buchstaben sind Pfade – keine Webschrift nötig.

| Datei | Verwendung |
|---|---|
| `wordmark.svg` | eigenständig (z. B. `<img>`, README, Social): Farben per `prefers-color-scheme` |
| `wordmark-inline.html` | zum Einbetten in Seiten: Farben per CSS, folgt dem Theme-Umschalter (`data-theme`) |

CSS für die eingebettete Variante:

```css
.demo-wordmark { block-size: 1.6em; inline-size: auto; }
.demo-wordmark-native { fill: var(--ncss-color-brand); }
.demo-wordmark-css { fill: currentColor; }
```

Schriften (nur zur Erzeugung der Pfade, nicht ausgeliefert): Dancing Script (Impallari Type, SIL Open Font License 1.1) und Inter (Rasmus Andersson, SIL Open Font License 1.1). Die OFL erlaubt die Verwendung in Logos.

## Titelbild / Social Preview

`banner.html` ist die Quelle (echtes NativeCSS, 1280 × 640). Neu erzeugen mit
`node tools/brand/render-banner.mjs` (lokaler Server muss laufen):

- `banner-light.webp` / `banner-dark.webp` – README-Titelbild (per `<picture>` hell/dunkel)
- `social-preview.png` – GitHub → Settings → Social preview hochladen; außerdem `og:image` der Website
