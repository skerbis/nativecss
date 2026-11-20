/**
 * ImmoDesk-Demo - Objekte & Einheiten (nur Demo, NICHT Teil von dist/).
 * Filter (Suche, Objektart, Leerstand), Ansicht Karten/Liste, Objektdetail per #objekt-...
 * Ohne JS bleiben alle Karten UND alle Detail-Abschnitte sichtbar (Anker springen hin).
 */
(function () {
  "use strict";

  if (!("closest" in Element.prototype)) return;

  var form = document.querySelector("[data-demo-propfilter]");
  var cards = document.getElementById("propCards");
  var list = document.getElementById("propList");
  var count = document.getElementById("propCount");
  var sections = document.querySelectorAll(".demo-detail-section");

  // --- Filter ---------------------------------------------------------------------------------
  function applyFilter() {
    var q = form.q.value.trim().toLowerCase();
    var type = form.type.value;
    var vacant = form.vacant.value === "1";
    var shown = 0;
    document.querySelectorAll("#propCards [data-prop], #propList tr[data-prop]").forEach(function (el) {
      var ok = (!q || el.getAttribute("data-search").indexOf(q) !== -1) &&
        (!type || el.getAttribute("data-type") === type) &&
        (!vacant || el.getAttribute("data-vacant") !== "0");
      el.hidden = !ok;
      if (ok && el.tagName === "ARTICLE") shown++;
    });
    count.textContent = shown === 1 ? "1 Objekt" : shown + " Objekte";
  }
  if (form) {
    form.addEventListener("input", applyFilter);
    form.addEventListener("change", applyFilter);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
  }

  // --- Ansicht ----------------------------------------------------------------------------------
  document.querySelectorAll("[data-demo-view]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var listView = btn.getAttribute("data-demo-view") === "list";
      cards.hidden = listView;
      list.hidden = !listView;
      document.querySelectorAll("[data-demo-view]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
    });
  });

  // --- Detail ----------------------------------------------------------------------------------
  function show(id, focus) {
    var target = document.getElementById(id);
    if (!target || !target.classList.contains("demo-detail-section")) {
      target = sections[0];
    }
    sections.forEach(function (s) { s.hidden = s !== target; });
    document.querySelectorAll("#propCards [data-prop]").forEach(function (card) {
      if ("objekt-" + card.getAttribute("data-prop") === target.id) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
    });
    if (focus) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }
  show(location.hash.slice(1), !!location.hash);
  window.addEventListener("hashchange", function () { show(location.hash.slice(1), true); });
})();
