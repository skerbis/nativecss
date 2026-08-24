// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): setIconPath() MUSS
// laufen, bevor <wa-icon> zum ersten Mal verbunden wird (siehe Kommentar in
// vendor/webawesome/dist-cdn/utilities/base-path.d.ts) - deshalb ein eigenes, kleines
// Modul-Script VOR dem Autoloader, das nur diese eine Utility-Funktion importiert (nicht
// das komplette webawesome.js-Bundle). Zeigt auf dieselben, bereits für die Webfont-
// Icons genutzten Font-Awesome-SVGs - ein Download deckt beide Nutzungsarten ab.
// Modul-Importe lösen relativ zu DIESER Datei auf (nicht zur ladenden Seite) - deshalb
// "../../../vendor/..." (drei Ebenen von demo/assets/js/ zurück zum Repo-Root), obwohl
// eine Seite direkt unter demo/ selbst nur "../vendor/..." bräuchte.
import { setIconPath } from "../../../vendor/webawesome/dist-cdn/utilities/base-path.js";
setIconPath("../../../vendor/fontawesome/svgs");
