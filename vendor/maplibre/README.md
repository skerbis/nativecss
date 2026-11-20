# MapLibre GL JS (selbst gehostet)

Version **6.11.2** (laut Datei-Kopf `maplibre-gl.mjs`: `…/maplibre-gl-js/blob/v6.11.2/LICENSE.txt`),
ESM-Build, unverändert übernommen.

| Datei | Zweck |
| --- | --- |
| `maplibre-gl.mjs` | Einstieg (ES-Modul), lädt `maplibre-gl-shared.mjs` und den Worker relativ zu sich selbst |
| `maplibre-gl-shared.mjs` | gemeinsamer Code von Haupt-Thread und Worker |
| `maplibre-gl-worker.mjs` | Web Worker (Kacheln dekodieren) |
| `maplibre-gl.css` | Basis-Styles der Karte und Bedienelemente |
| `LICENSE.txt` | Lizenz MapLibre GL JS (BSD-3-Clause) |
| `THIRD-PARTY-LICENSES.txt` | Lizenzen der mitgebündelten Bibliotheken |

Genutzt von `dist/js/map.js` (`<ncss-map>`). Das Script lädt die Dateien erst, wenn eine
Karte in Sichtweite kommt bzw. nach dem Klick auf „Karte anzeigen“. Standard-Pfad:
`../../vendor/maplibre/` relativ zu `dist/js/map.js`; abweichend per Attribut `vendor`.

Aktualisieren: die vier Dateien + beide Lizenzdateien aus dem npm-Paket `maplibre-gl`
(`dist/`) ersetzen und die Versionsnummer hier anpassen.
