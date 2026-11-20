# Claude-Code-Hooks für NativeCSS-Projekte

*English: `check-classes.mjs` validates markup after every agent edit (unknown `ncss-`
classes with "did you mean", unknown `data-ncss-*`/`<ncss-*>`, UIkit leftovers, modal/off-canvas
not on `<dialog>`, missing alt/accessible names/labels, Tailwind/Bootstrap classes). Errors exit
with code 2 in hook mode so Claude Code feeds the report back to the agent.*

## `check-classes.mjs` - Markup nach jeder Bearbeitung prüfen

Läuft, nachdem der Agent eine Markup-Datei geschrieben/bearbeitet hat (`.html`, `.php`,
`.twig`, `.blade.php`, `.vue`, `.svelte`, `.astro`, `.jsx` …). Template-Code (`<?php ?>`,
`{{ }}`, `{% %}`, `{# #}`, `<% %>`) wird vorher ausgeblendet, Klassen mit Template-Anteil
(`ncss-card--<?= $v ?>`) werden übersprungen.

| Stufe | Fund |
|---|---|
| Fehler | unbekannte `ncss-`Klasse (mit "meintest du"-Vorschlag) |
| Fehler | unbekanntes `data-ncss-*`-Attribut / unbekanntes `<ncss-*>`-Element |
| Fehler | UIkit-Reste (`uk-`Klassen, `uk-`/`data-uk-`Attribute) - außer auf Seiten, die UIkit bewusst parallel laden (`uikit*.css/js`, `<ncss-container>`) |
| Fehler | `.ncss-modal` / `.ncss-offcanvas` nicht auf einem `<dialog>`; `ncss-…@m`-Breakpoint-Klassen |
| Hinweis | `<img>` ohne `alt`, Icon-Button/-Link ohne Namen, Feld ohne Label, `<dialog>` ohne Namen, `commandfor` ohne passende `id` in der Datei |
| Hinweis | Tailwind-/Bootstrap-artige Klassen (`p-4`, `md:flex`, `col-md-6` …) |

Bekannt ist, was in `llms/classes.json` / `llms/components.json` steht (aus `dist/` erzeugt)
plus `ncss-`Klassen, die die geprüfte Seite selbst in `<style>` oder einem lokal verlinkten
Stylesheet definiert. Im Hook-Modus beendet sich das Skript bei Fehlern mit Exit 2 - Claude
Code gibt stderr an den Agenten zurück, der korrigiert. Hinweise blockieren nicht.

### Einschalten

In `.claude/settings.json` des Projekts (Pfad an den Ort anpassen, an dem NativeCSS liegt -
hier `ncss/`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/ncss/llms/hooks/check-classes.mjs\"" }
        ]
      }
    ]
  }
}
```

Derselbe Block plus ein `SessionStart`-Hinweis steht in `settings.example.json`. Liegt das
Skript außerhalb des NativeCSS-Ordners, `NCSS_ROOT` auf diesen Ordner setzen (er muss
`llms/classes.json` und `llms/components.json` enthalten - `dist/` + `llms/` mitkopieren).

### Von Hand / im CI

```sh
node ncss/llms/hooks/check-classes.mjs templates/ seite.html   # Exit 1 bei Fehlern
node ncss/llms/hooks/check-classes.mjs templates/ --errors-only
node ncss/llms/hooks/check-classes.mjs templates/ --json
```

## Der Skill

`.claude/skills/ncss-design/SKILL.md` aus dem NativeCSS-Repo in `.claude/skills/` des
Projekts (oder `~/.claude/skills/`) kopieren - Claude Code lädt ihn bei Gestaltungsaufgaben
mit NativeCSS automatisch. Zusammen mit `llms/GUIDE.md` (als `CLAUDE.md`/`AGENTS.md` oder
darin verlinkt) hat ein Agent alles, was er braucht.
