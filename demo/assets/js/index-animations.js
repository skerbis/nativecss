// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): "Replay"- und
// "Shake"-Demo-Buttons nur für demo/index.html - erzwingt einen Reflow (void
// el.offsetWidth), damit dieselbe CSS-Animation ein zweites Mal von vorn abspielt.
(function () {
  var replayBtn = document.getElementById("replayAnimBtn");
  if (replayBtn) {
    replayBtn.addEventListener("click", function () {
      var grid = document.getElementById("animGrid");
      grid.querySelectorAll("[class*='ncss-animate-']").forEach(function (el) {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      });
    });
  }

  var shakeBtn = document.getElementById("shakeBtn");
  if (shakeBtn) {
    shakeBtn.addEventListener("click", function (e) {
      var btn = e.currentTarget;
      btn.classList.remove("ncss-animate-shake");
      void btn.offsetWidth;
      btn.classList.add("ncss-animate-shake");
    });
  }
})();
