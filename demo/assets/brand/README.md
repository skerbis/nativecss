# NativeCSS – Schriftzug

„Native“ in Schreibschrift (Blau), „CSS“ fett (Textfarbe). Alle Buchstaben sind Pfade – keine Webschrift nötig.

| Datei | Verwendung |
|---|---|
| `wordmark.svg` | eigenständig (z. B. `<img>`, README, Social): Farben per `prefers-color-scheme` |
| `wordmark-inline.html` | zum Einbetten in Seiten: Farben per CSS, folgt dem Theme-Umschalter (`data-theme`) |

CSS für die eingebettete Variante:

```css
.ncss-wordmark { block-size: 1.6em; inline-size: auto; }
.ncss-wordmark-native { fill: var(--ncss-color-brand); }
.ncss-wordmark-css { fill: currentColor; }
```

Schriften (nur zur Erzeugung der Pfade, nicht ausgeliefert): Dancing Script (Impallari Type, SIL Open Font License 1.1) und Inter (Rasmus Andersson, SIL Open Font License 1.1). Die OFL erlaubt die Verwendung in Logos.
