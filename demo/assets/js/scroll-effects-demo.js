/**
 * Demo-Hilfe für demo/scroll-effects.html: zeigt das zuletzt empfangene "ncss-scrolly-step"-Event
 * von <ncss-scrolly> sichtbar an (Beleg für den data-ncss-time-Hook).
 */
(function () {
  var out = document.getElementById("demo-scrolly-log");
  if (!out) return;
  function show(index, time) {
    out.textContent = "Schritt " + (index + 1) + ", time = " + (time === null ? "null" : time + " s");
  }
  document.addEventListener("ncss-scrolly-step", function (event) {
    var d = event.detail || {};
    show(d.index, d.time);
  });
  // Das erste Event kann schon VOR diesem Script gefeuert haben (Element wird beim
  // Laden von js/scrolly.js aktiv) - Startzustand deshalb einmal direkt auslesen.
  var el = document.getElementById("demo-scrolly");
  if (el && el.step >= 0) {
    var t = parseFloat(el.querySelectorAll(".ncss-scrolly-step")[el.step].getAttribute("data-ncss-time"));
    show(el.step, isNaN(t) ? null : t);
  }
})();
