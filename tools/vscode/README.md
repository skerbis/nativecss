# NativeCSS in VS Code

*English: autocompletion for NativeCSS in VS Code - custom elements and `data-ncss-*`
attributes (HTML custom data), `--ncss-*` tokens with their values (CSS custom data), markup
snippets, and class names via the "HTML CSS Support" extension. Copy the snippet below into
`.vscode/settings.json`.*

Alles hier wird von `node tools/index.mjs` aus `dist/` erzeugt - nicht von Hand bearbeiten
(Ausnahme: `snippets.mjs`, die Quelle der Snippets).

| Datei | Was VS Code damit kann |
|---|---|
| `ncss.html-data.json` | `<ncss-...>`-Elemente mit Attributen, Events, öffentlichen Methoden; globale `data-ncss-*`-Attribute, `data-theme`, `data-palette` (Vervollständigung + Hover) |
| `ncss.css-data.json` | alle `--ncss-*`-Tokens mit Wert und Quelldatei; Seed-Werte (gehören in `theme.css`) sind markiert |
| `ncss.code-snippets` | Markup-Muster: `ncss-page`, `ncss-card`, `ncss-modal`, `ncss-offcanvas`, `ncss-topbar`, `ncss-tabs`, `ncss-scrolly`, Player ... (Präfix `ncss-` tippen) |
| `settings.example.json` | fertiger Block für `.vscode/settings.json` |

## Einrichten

1. In `.vscode/settings.json` des Projekts (Pfade relativ zum Workspace-Ordner, an den Ort
   anpassen, an dem NativeCSS im Projekt liegt - z.B. `./assets/ncss/tools/vscode/...`):

   ```json
   {
     "html.customData": ["./tools/vscode/ncss.html-data.json"],
     "css.customData": ["./tools/vscode/ncss.css-data.json"],
     "css.styleSheets": ["dist/**/*.css"]
   }
   ```

   Nach dem Eintragen einmal "Developer: Reload Window" ausführen - Custom Data wird nur
   beim Start gelesen.
2. Snippets: `ncss.code-snippets` nach `.vscode/` des Projekts kopieren (Workspace-Snippets,
   gelten für HTML, PHP, Twig, Blade, Vue, Svelte, Astro ...) - oder über "Snippets:
   Configure Snippets" als globale Snippets übernehmen.

## Klassennamen in `class="..."`

VS Codes Custom Data deckt nur Elemente, Attribute und CSS-Properties ab - Klassen werden
**nicht** vervollständigt. Dafür die Erweiterung **HTML CSS Support**
(`ecmel.vscode-html-css`, Marketplace) installieren: sie liest die Stylesheets aus der
Einstellung `css.styleSheets` (Glob-Muster erlaubt, siehe oben) und schlägt jede Klasse in
`class="..."` vor. Für `ncss-` gilt trotzdem: im Zweifel in `llms/classes.json` nachsehen,
und vor dem Commit `node llms/hooks/check-classes.mjs <dateien>` laufen lassen.

## Neu erzeugen

```sh
node tools/index.mjs           # schreibt llms/*.json, llms/reference.md und alles hier
node tools/index.mjs --check   # Exit 1, wenn etwas veraltet ist (z.B. im CI)
```
