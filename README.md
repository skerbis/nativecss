# NativeCSS

*(Kürzel/Klassen-Präfix im Code: `ncss`)*

Ein natives CSS-Designsystem ohne Build-Schritt: kein LESS/Sass, kein Bundler, kein
Preprocessor, kein npm-Paket. `@import` + CSS Cascade Layers regeln die Ladereihenfolge,
ein einziges Token-System (`tokens.css` + `colors.css`) ist die alleinige Quelle für
Werte. Typografie und Abstände sind standardmäßig **fließend** (`clamp()`-basiert) statt
in festen Breakpoint-Sprüngen; komponentenlokale Responsivität läuft über **Container
Queries** statt Viewport-Breakpoints.

**[Live-Demo](https://skerbis.github.io/nativecss/) · [Handbuch](https://skerbis.github.io/nativecss/docs/de/index.html)**

## Worum es geht

Die meisten CSS-Frameworks lösen ein Problem, das der Browser mittlerweile selbst löst:
Spezifitäts-Kämpfe (→ Cascade Layers), Breakpoint-Wildwuchs (→ Container Queries),
Dark-Mode-Verdopplung (→ `light-dark()`), JS-Nachbauten für `<dialog>`/`<details>`/
Accordions. NativeCSS baut konsequent auf diesen bereits vorhandenen, nativen
Plattform-Fähigkeiten auf, statt sie erneut nachzubauen:

- **Cascade Layers statt Spezifitäts-Kämpfe.** Eine einzige `@layer`-Deklaration in
  `ncss.css` legt die Priorität explizit fest - kein `!important`, keine
  Selektor-Wettrüsten.
- **Container Queries statt Media-Query-Wildwuchs.** Eine Komponente reagiert auf die
  Breite ihres eigenen Containers, nicht des Viewports - funktioniert dadurch überall
  gleich, egal wo sie eingebaut wird.
- **`light-dark()` statt zweitem Dark-Stylesheet.** Ein Wert pro Token deckt Hell UND
  Dunkel ab.
- **Native Elemente statt JS-Nachbauten**, wo das native Verhalten bereits reicht:
  `<dialog>`, `<details>`, `view-timeline`, View Transitions.
- **Ein Token-System, eine Quelle der Wahrheit.** `tokens.css`/`colors.css` sind die
  einzigen Orte mit rohen Werten - alles andere referenziert sie.
- **Kein Build-Schritt.** `dist/` ist bereits fertiges CSS/JS, direkt einbindbar.

## Warum dieser Ansatz zukunftsorientiert ist

Ein Utility-Framework, das jede CSS-Eigenschaft in eine eigene Klasse übersetzt, kämpft
strukturell gegen die Plattform - es simuliert Fähigkeiten, die native CSS-Features
inzwischen selbst mitbringen, und muss bei jeder neuen Spezifikation nachziehen oder
veraltet um sie herum bleiben. NativeCSS wettet auf das Gegenteil: **je mehr die
Plattform selbst kann, desto weniger Code muss dieses System noch beisteuern.** Cascade
Layers, Container Queries, `light-dark()`, `:has()`, View Transitions, `@property` -
jedes dieser Features ist heute Baseline oder auf dem Weg dorthin, und jedes davon macht
einen früher notwendigen Workaround überflüssig, statt einen neuen zu verlangen. Der
Wartungsaufwand sinkt dadurch tendenziell mit der Zeit statt zu wachsen, und ein Projekt,
das NativeCSS einbindet, bindet sich an nichts als die offene Web-Plattform selbst - kein
Bundler-Ökosystem, keine Versionstreppe, kein Migrationspfad, der irgendwann fällig wird.

## Schnellstart

```html
<link rel="stylesheet" href="ncss.css">
<link rel="stylesheet" href="theme.css">
```

`ncss.css` importiert alles Weitere selbst (Tokens, Reset, Helpers, Komponenten) in der
richtigen Layer-Reihenfolge - `dist/` einfach unverändert ins eigene Projekt kopieren.
`theme.css` ist die einzige Stelle, an der eigene Markenwerte (Farben, Schriften, Radien)
gesetzt werden, ohne eine andere Datei anzufassen. Web Awesome/Font Awesome sind komplett
opt-in (`dist/integrations/`, nicht Teil von `ncss.css`) - nur einbinden, wer sie
tatsächlich nutzt. Cherry-Picking ist der vorgesehene Weg für ein schlankes Projekt-CSS:
`ncss.css` in das eigene Projekt kopieren und nicht benötigte `@import`-Zeilen einfach
entfernen - siehe [Architektur](https://skerbis.github.io/nativecss/docs/de/architecture.html).

Das vollständige Handbuch (Design Tokens, alle Komponenten/Utilities, eigenes Theme
Schritt für Schritt, Barrierefreiheit, bekannte Grenzen) steht unter
**[skerbis.github.io/nativecss/docs](https://skerbis.github.io/nativecss/docs/de/index.html)**
- zweisprachig (DE/EN), eine Seite pro Thema. Lebende Beispiele zu jedem Thema unter
[demo/](https://skerbis.github.io/nativecss/).

## Lizenz

[MIT](LICENSE) © 2026 [Thomas Skerbis](https://github.com/skerbis) und
[KLXM Crossmedia](https://github.com/klxm)
