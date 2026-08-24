// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): setIconPath() MUSS
// laufen, bevor <wa-icon> zum ersten Mal verbunden wird (siehe Kommentar in
// vendor/webawesome/dist-cdn/utilities/base-path.d.ts) - deshalb ein eigenes, kleines
// Modul-Script VOR dem Autoloader, das nur diese eine Utility-Funktion importiert (nicht
// das komplette webawesome.js-Bundle). Zeigt auf dieselben, bereits für die Webfont-
// Icons genutzten Font-Awesome-SVGs - ein Download deckt beide Nutzungsarten ab.
// ACHTUNG - zwei GRUNDVERSCHIEDENE Auflösungs-Basen in dieser einen Datei, per echtem
// GitHub-Pages-Test gefunden (lokal an der Domain-Wurzel serviert bleibt der
// Unterschied unsichtbar, auf einem Unterpfad wie skerbis.github.io/nativecss/ nicht):
// Der import() SPEZIFIZIERER unten löst relativ zu DIESER Moduldatei auf (ES-Modul-
// Spec) - "../../../vendor/..." (drei Ebenen von demo/assets/js/ zurück zum Repo-Root).
// Der STRING, den setIconPath() bekommt, ist dagegen reine Laufzeit-Daten - Web Awesome
// baut daraus intern nur eine Text-URL zusammen (getIconUrl() in chunk.KKI7M5DP.js,
// simple Template-Literal-Verkettung, kein new URL()/import.meta.url beteiligt), die
// der Browser SPÄTER relativ zur SEITE auflöst, nicht zu dieser Datei - deshalb hier
// bewusst "../vendor/..." (nur eine Ebene, identisch zur früheren Inline-Fassung auf
// Seiten direkt unter demo/), NICHT dieselbe Drei-Ebenen-Korrektur wie beim Import.
import { setIconPath } from "../../../vendor/webawesome/dist-cdn/utilities/base-path.js";
setIconPath("../vendor/fontawesome/svgs");
