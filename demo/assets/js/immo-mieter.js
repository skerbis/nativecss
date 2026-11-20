/**
 * ImmoDesk-Demo - Mieter & Zahlungen (nur Demo, NICHT Teil von dist/).
 * Filter (Suche/Objekt/Status, vorbelegbar per ?status=... / ?mieter=...), Detail im
 * Off-Canvas-<dialog>, "Mahnung erstellen" als Bestätigungs-Modal -> Tabelle + Toast,
 * "Zahlung erfassen". Fokus: native <dialog>-Rückgabe an den auslösenden Button.
 */
(function () {
  "use strict";

  if (!("closest" in Element.prototype) || typeof HTMLDialogElement !== "function") return;

  var immo = window.immo || {};
  var eur = immo.eur || new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  var dateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  var BADGE = {
    bezahlt: ["success", "bezahlt"],
    offen: ["warning", "offen"],
    mahn1: ["danger", "Mahnstufe 1"],
    mahn2: ["danger", "Mahnstufe 2"]
  };
  var ORDER = { bezahlt: 0, offen: 1, mahn1: 2, mahn2: 3 };
  var MONTHS = { Jun: "Juni", Jul: "Juli", Aug: "August", Sep: "September", Okt: "Oktober", Nov: "November" };

  var form = document.querySelector("[data-demo-tenantfilter]");
  var table = document.getElementById("tenantTable");
  var count = document.getElementById("tenantCount");
  var detail = document.getElementById("tenantDetail");
  var dunDialog = document.getElementById("dunDialog");
  var dunForm = document.getElementById("dunForm");
  var rows = Array.prototype.slice.call(table.tBodies[0].rows);
  var currentRow = null;

  function badge(status) {
    var b = document.createElement("span");
    b.className = "ncss-badge ncss-badge--" + BADGE[status][0];
    b.textContent = BADGE[status][1];
    return b;
  }
  function td(row, name) { return row.querySelector('[data-cell="' + name + '"]'); }
  function q(sel) { return detail.querySelector('[data-td="' + sel + '"]'); }
  function warm(row) { return +row.dataset.kalt + +row.dataset.nk; }

  // --- Filter ---------------------------------------------------------------------------------
  function applyFilter() {
    var text = form.q.value.trim().toLowerCase();
    var prop = form.prop.value;
    var status = form.status.value;
    var shown = 0;
    rows.forEach(function (row) {
      var s = row.dataset.status;
      var ok = (!text || row.dataset.search.indexOf(text) !== -1) &&
        (!prop || row.dataset.prop === prop) &&
        (!status || (status === "ueberfaellig" ? s !== "bezahlt" : s === status));
      row.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = shown + " von " + rows.length + " Mietverhältnissen";
  }
  form.addEventListener("input", applyFilter);
  form.addEventListener("change", applyFilter);
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  // --- Detail ---------------------------------------------------------------------------------
  function fillDetail(row) {
    var d = row.dataset;
    var avatar = q("avatar");
    avatar.textContent = d.initials;
    avatar.style.setProperty("--demo-hue", d.hue);
    q("name").textContent = d.name;
    q("unit").textContent = d.unit;
    q("status").replaceChildren(badge(d.status));
    q("saldoText").textContent = +d.saldo ? "Offen: " + eur.format(+d.saldo) : "Kein Rückstand";
    q("email").textContent = d.email;
    q("email").href = "mailto:" + d.email;
    q("phone").textContent = d.phone;
    q("since").textContent = d.since;
    q("kalt").textContent = eur.format(+d.kalt);
    q("nk").textContent = eur.format(+d.nk);
    q("warm").textContent = eur.format(warm(row));
    var body = q("hist");
    body.replaceChildren();
    d.hist.split(",").forEach(function (entry) {
      var parts = entry.split(":");
      var tr = document.createElement("tr");
      var m = document.createElement("td");
      m.textContent = MONTHS[parts[0]] || parts[0];
      var a = document.createElement("td");
      a.className = "demo-num";
      a.textContent = eur.format(warm(row));
      var s = document.createElement("td");
      s.appendChild(badge(parts[1] === "bezahlt" ? "bezahlt" : "offen"));
      tr.append(m, a, s);
      body.appendChild(tr);
    });
    var open = d.status !== "bezahlt";
    q("dun").hidden = !open;
    q("pay").hidden = !open;
  }
  function openDetail(row) {
    currentRow = row;
    fillDetail(row);
    if (!detail.open) detail.showModal();
  }
  table.addEventListener("click", function (e) {
    var row = e.target.closest("tr");
    if (e.target.closest("[data-demo-tenant]")) openDetail(row);
    else if (e.target.closest("[data-demo-dun]")) openDun(row);
  });

  // --- Mahnung ----------------------------------------------------------------------------------
  var dunRow = null;
  function openDun(row) {
    dunRow = row;
    dunForm.querySelector('[data-dun="name"]').textContent = row.dataset.name + " (" + row.dataset.unit + ")";
    dunForm.querySelector('[data-dun="amount"]').textContent = eur.format(+row.dataset.saldo);
    dunForm.level.value = row.dataset.status === "offen" ? "1" : "2";
    dunDialog.returnValue = "";
    dunDialog.showModal();
  }
  q("dun").addEventListener("click", function () { if (currentRow) openDun(currentRow); });

  function setStatus(row, status, saldo) {
    row.dataset.status = status;
    row.dataset.saldo = String(saldo);
    var st = td(row, "status");
    st.setAttribute("data-sort", ORDER[status]);
    st.replaceChildren(badge(status));
    var sa = td(row, "saldo");
    sa.setAttribute("data-sort", saldo);
    if (saldo) {
      var strong = document.createElement("strong");
      strong.textContent = eur.format(saldo);
      sa.replaceChildren(strong);
    } else {
      var muted = document.createElement("span");
      muted.className = "demo-muted";
      muted.textContent = eur.format(0);
      sa.replaceChildren(muted);
    }
    if (status === "bezahlt") td(row, "action").replaceChildren();
    if (detail.open && currentRow === row) fillDetail(row);
    var total = rows.reduce(function (s, r) { return s + +r.dataset.saldo; }, 0);
    var kpi = document.querySelector("[data-demo-opentotal]");
    if (kpi) kpi.textContent = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(total);
    applyFilter();
  }

  dunDialog.addEventListener("close", function () {
    if (dunDialog.returnValue !== "confirm" || !dunRow) return;
    var level = dunForm.level.value;
    var fee = dunForm.fee.checked ? 5 : 0;
    var due = dunForm.due.value ? dateFmt.format(new Date(dunForm.due.value + "T12:00:00")) : "";
    setStatus(dunRow, "mahn" + level, +dunRow.dataset.saldo + fee);
    immo.toast && immo.toast(
      "Mahnung (Stufe " + level + ") versendet",
      dunRow.dataset.name + " · Zahlungsfrist " + due + (fee ? " · inkl. " + eur.format(fee) + " Mahngebühr" : "")
    );
  });

  q("pay").addEventListener("click", function () {
    if (!currentRow) return;
    var amount = +currentRow.dataset.saldo;
    setStatus(currentRow, "bezahlt", 0);
    immo.toast && immo.toast("Zahlung verbucht", eur.format(amount) + " von " + currentRow.dataset.name + " erfasst.");
    q("status").focus && detail.querySelector(".ncss-dialog-close").focus();
  });

  // --- Vorbelegung per URL ------------------------------------------------------------------------
  var params = new URLSearchParams(location.search);
  if (params.get("status")) {
    form.status.value = params.get("status");
    applyFilter();
  }
  if (params.get("mieter")) {
    var row = rows.filter(function (r) { return r.dataset.id === params.get("mieter"); })[0];
    if (row) {
      row.scrollIntoView({ block: "center" });
      openDetail(row);
    }
  }
})();
