# Fonts – Hinweise zu Drittanbieter-Schriften / Third-party font notice

Optionale Lese-Schriften für die Darstellungs-Einstellungen (`<ncss-preferences>`,
`components/preferences-fonts.css`). Alle selbst gehostet, kein Request an Google Fonts
oder ein anderes CDN. Ein Browser lädt eine Datei erst, wenn jemand diese Schrift wählt.

Optional reading fonts for the display preferences. All self-hosted; a browser downloads a
file only when a visitor selects that font.

| Schrift / Font | Datei / File | Größe / Size | Lizenz / License | Quelle / Source |
|---|---|---|---|---|
| Atkinson Hyperlegible Next (variabel, wght 200–800) | `atkinson-hyperlegible-next/atkinson-hyperlegible-next.woff2` | 38 KB | SIL OFL 1.1 (`OFL.txt`) | github.com/google/fonts `ofl/atkinsonhyperlegiblenext` (Braille Institute) |
| Lexend (variabel, wght 100–900) | `lexend/lexend.woff2` | 44 KB | SIL OFL 1.1 (`OFL.txt`), Reserved Font Name „RevReading Lexend“ | github.com/google/fonts `ofl/lexend` |
| OpenDyslexic Regular + Bold | `opendyslexic/OpenDyslexic-Regular.woff2`, `-Bold.woff2` | 101 KB + 106 KB | SIL OFL 1.1 (`OFL.txt`), Reserved Font Name „OpenDyslexic“ | github.com/antijingoist/opendyslexic `compiled/` |

## Bearbeitung / Modifications

- Atkinson Hyperlegible Next und Lexend: mit fontTools (`pyftsubset --flavor=woff2
  --layout-features='*'`) auf Latein reduziert – U+0000–017F (Basic Latin, Latin-1,
  Latin Extended-A: Umlaute, ß), allgemeine Satzzeichen U+2000–206F (typografische
  Anführungszeichen, Gedankenstriche, Auslassungspunkte), € U+20AC, ™, −. Variable
  Gewichtsachse bleibt erhalten. Der Name bleibt zulässig: Atkinson Hyperlegible Next hat
  keinen Reserved Font Name, Lexends Reserved Font Name ist „RevReading Lexend“.
- OpenDyslexic: **unverändert** (offizielle WOFF2-Dateien). Der Name „OpenDyslexic“ ist ein
  Reserved Font Name – eine verkleinerte Fassung dürfte ihn laut OFL nicht tragen, deshalb
  bewusst kein Subsetting.

Die Lizenztexte liegen jeweils als `OFL.txt` neben der Schrift und müssen bei Weitergabe
mitgeliefert werden. / Keep each `OFL.txt` next to its font when redistributing.
