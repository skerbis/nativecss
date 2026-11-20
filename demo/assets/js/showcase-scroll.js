/**
 * NativeCSS-Rundgang, Kapitel "Scroll-Effekte" (demo/showcase/scroll.html + scroll-en.html).
 * Nur Demo-Hilfen, keine Bibliotheks-Logik:
 *  - [data-demo-replay="id"]: spielt die Einblend-Animationen im Ziel erneut ab
 *    (Klasse kurz entfernen, Reflow, wieder setzen).
 *  - [data-demo-shake="id"]: setzt .ncss-animate-shake auf das Ziel und entfernt sie
 *    nach dem Ende wieder (Fehler-Wackeln braucht einen Auslöser).
 *  - <output data-demo-scrolly-log="id">: zeigt das letzte "ncss-scrolly-step"-Event.
 */
(function () {
  var en = document.documentElement.lang === "en";

  document.addEventListener("click", function (event) {
    var replay = event.target.closest("[data-demo-replay]");
    if (replay) {
      var grid = document.getElementById(replay.getAttribute("data-demo-replay"));
      if (!grid) return;
      grid.querySelectorAll("[class*='ncss-animate-']").forEach(function (el) {
        var cls = Array.prototype.filter.call(el.classList, function (c) {
          return c.indexOf("ncss-animate-") === 0;
        });
        cls.forEach(function (c) { el.classList.remove(c); });
        void el.offsetWidth;
        cls.forEach(function (c) { el.classList.add(c); });
      });
      return;
    }
    var shake = event.target.closest("[data-demo-shake]");
    if (shake) {
      var target = document.getElementById(shake.getAttribute("data-demo-shake"));
      if (!target) return;
      target.classList.remove("ncss-animate-shake");
      void target.offsetWidth;
      target.classList.add("ncss-animate-shake");
      target.addEventListener("animationend", function done() {
        target.classList.remove("ncss-animate-shake");
        target.removeEventListener("animationend", done);
      });
    }
  });

  document.querySelectorAll("[data-demo-scrolly-log]").forEach(function (out) {
    var el = document.getElementById(out.getAttribute("data-demo-scrolly-log"));
    if (!el) return;
    function show(index, time) {
      out.textContent = (en ? "Step " : "Schritt ") + (index + 1) + ", time = " + (time === null ? "null" : time + " s");
    }
    el.addEventListener("ncss-scrolly-step", function (event) {
      var d = event.detail || {};
      show(d.index, d.time);
    });
    // Das erste Event kann schon vor diesem Script gefeuert haben.
    if (el.step >= 0) {
      var t = parseFloat(el.querySelectorAll(".ncss-scrolly-step")[el.step].getAttribute("data-ncss-time"));
      show(el.step, isNaN(t) ? null : t);
    }
  });
})();
