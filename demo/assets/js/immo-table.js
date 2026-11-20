/**
 * ImmoDesk-Demo - sortierbare Tabellen (nur Demo, NICHT Teil von dist/).
 *
 * Markup: <table data-demo-sortable> mit <th data-sort-key data-sort-type="text|number">
 * <button class="demo-sort">Label</button></th>. Sortiert nach data-sort der Zelle (sonst
 * Text), deutsch (localeCompare "de", numerisch). aria-sort steht immer nur auf EINER Spalte.
 * Ein zweiter Klick dreht die Richtung um. Ausgeblendete Zeilen (Filter) bleiben, wo sie sind.
 */
(function () {
  "use strict";

  if (!("closest" in Element.prototype)) return;

  var collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

  function value(row, index) {
    var cell = row.cells[index];
    if (!cell) return "";
    return cell.hasAttribute("data-sort") ? cell.getAttribute("data-sort") : cell.textContent.trim();
  }

  function sortBy(th, dir) {
    var table = th.closest("table");
    var index = Array.prototype.indexOf.call(th.parentNode.cells, th);
    var numeric = th.getAttribute("data-sort-type") === "number";
    var tbody = table.tBodies[0];
    var rows = Array.prototype.slice.call(tbody.rows);
    rows.sort(function (a, b) {
      var va = value(a, index);
      var vb = value(b, index);
      var r = numeric ? parseFloat(va) - parseFloat(vb) : collator.compare(va, vb);
      return dir === "descending" ? -r : r;
    });
    rows.forEach(function (row) { tbody.appendChild(row); });
    table.querySelectorAll("th[aria-sort]").forEach(function (other) {
      if (other !== th) other.removeAttribute("aria-sort");
    });
    th.setAttribute("aria-sort", dir);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("table[data-demo-sortable] th[data-sort-key] .demo-sort");
    if (!btn) return;
    var th = btn.closest("th");
    sortBy(th, th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending");
  });

  window.immo = window.immo || {};
  window.immo.sortBy = sortBy;
})();
