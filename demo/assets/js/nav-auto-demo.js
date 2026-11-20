// ncss - Doku-Website (nicht Teil der ausgelieferten Bibliothek): zeigt im Beispiel für den
// automatischen Kompakt-Modus (demo/assets/nav-auto-demo*.html) den aktuellen Zustand an -
// liest nur das Event "ncss-nav-change" bzw. data-ncss-nav-auto aus js/nav.js.
(function () {
  var out = document.getElementById("navAutoState");
  var nav = document.querySelector(".ncss-nav");
  if (!out || !nav) return;
  function show() {
    out.textContent = nav.getAttribute("data-ncss-nav-auto") || "-";
  }
  nav.addEventListener("ncss-nav-change", show);
  show();
})();
