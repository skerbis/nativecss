/**
 * ImmoDesk-Demo - Dokumente (nur Demo, NICHT Teil von dist/).
 * Ordner-Filter + Suche über die Dateitabelle, Upload per Drag & Drop oder Dateiauswahl
 * (rein clientseitig: nichts verlässt den Browser, der "Upload" ist simuliert).
 */
(function () {
  "use strict";

  if (!("closest" in Element.prototype)) return;

  var immo = window.immo || {};
  var table = document.getElementById("docTable");
  var rows = function () { return Array.prototype.slice.call(table.tBodies[0].rows); };
  var search = document.getElementById("dq");
  var count = document.getElementById("docCount");
  var folderLabel = document.querySelector("[data-demo-folderlabel]");
  var folder = "";
  var num = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
  var dateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  var MAX = 20 * 1024 * 1024;

  function size(bytes) {
    return bytes >= 1e6 ? num.format(bytes / 1e6) + " MB" : num.format(Math.max(1, Math.round(bytes / 1e3))) + " KB";
  }

  // --- Ordner + Suche ---------------------------------------------------------------------------
  function applyFilter() {
    var q = search.value.trim().toLowerCase();
    var shown = 0;
    rows().forEach(function (row) {
      var ok = (!folder || row.getAttribute("data-cat") === folder) && (!q || row.getAttribute("data-search").indexOf(q) !== -1);
      row.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = shown === 1 ? "1 Datei" : shown + " Dateien";
  }
  document.querySelectorAll(".demo-folders [data-cat]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      folder = btn.getAttribute("data-cat");
      document.querySelectorAll(".demo-folders [data-cat]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      folderLabel.textContent = "· " + btn.children[1].textContent;
      applyFilter();
    });
  });
  search.addEventListener("input", applyFilter);

  // --- Upload -------------------------------------------------------------------------------------
  var zone = document.querySelector("[data-demo-dropzone]");
  var input = document.getElementById("fileInput");
  var list = document.getElementById("uploadList");

  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name);
    return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "";
  }

  function addRow(file) {
    var type = ext(file.name);
    var tr = table.tBodies[0].rows[0].cloneNode(true);
    var today = new Date();
    tr.setAttribute("data-cat", "");
    tr.setAttribute("data-search", file.name.toLowerCase());
    tr.hidden = false;
    var c = tr.cells;
    c[0].setAttribute("data-sort", file.name.toLowerCase());
    var badge = c[0].querySelector(".demo-filetype");
    badge.setAttribute("data-type", type);
    badge.textContent = type.toUpperCase();
    c[0].querySelector("strong").textContent = file.name.replace(/\.\w+$/, "");
    c[0].querySelector(".demo-sub").textContent = type.toUpperCase() + " · gerade hochgeladen";
    c[1].setAttribute("data-sort", "–");
    c[1].textContent = "–";
    c[2].setAttribute("data-sort", file.size);
    c[2].textContent = size(file.size);
    c[3].setAttribute("data-sort", today.toISOString().slice(0, 10));
    c[3].innerHTML = "";
    var time = document.createElement("time");
    time.dateTime = today.toISOString().slice(0, 10);
    time.textContent = dateFmt.format(today);
    c[3].appendChild(time);
    var dl = c[4].querySelector("button");
    dl.setAttribute("data-demo-fakedl", file.name);
    dl.setAttribute("aria-label", file.name + " herunterladen");
    table.tBodies[0].prepend(tr);
    applyFilter();
  }

  function upload(files) {
    var accepted = 0;
    Array.prototype.forEach.call(files, function (file) {
      var li = document.createElement("li");
      var type = ext(file.name);
      var badge = document.createElement("span");
      badge.className = "demo-filetype";
      badge.setAttribute("data-type", type);
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = (type || "?").toUpperCase().slice(0, 4);
      var name = document.createElement("span");
      name.textContent = file.name;
      var state = document.createElement("span");
      state.className = "demo-muted";
      li.append(badge, name, state);
      list.prepend(li);
      if (file.size > MAX) {
        state.textContent = "zu groß (" + size(file.size) + ")";
        state.className = "ncss-text-danger";
        immo.toast && window.ncss && window.ncss.notify({ title: "Upload abgelehnt", message: file.name + " ist größer als 20 MB.", status: "danger" });
        return;
      }
      accepted++;
      var bar = document.createElement("progress");
      bar.max = 100;
      bar.value = 0;
      bar.setAttribute("aria-label", "Upload " + file.name);
      li.appendChild(bar);
      state.textContent = size(file.size);
      var p = 0;
      var timer = setInterval(function () {
        p = Math.min(100, p + 8 + Math.random() * 18);
        bar.value = p;
        if (p >= 100) {
          clearInterval(timer);
          bar.remove();
          state.textContent = "hochgeladen";
          addRow(file);
        }
      }, 120);
    });
    if (accepted && immo.toast) {
      setTimeout(function () {
        immo.toast(accepted === 1 ? "Datei hochgeladen" : accepted + " Dateien hochgeladen", "Im Beispiel nur lokal in diesem Tab gespeichert.");
      }, 1700);
    }
  }

  if (zone && input) {
    ["dragenter", "dragover"].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        e.preventDefault();
        zone.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        if (type === "dragleave" && zone.contains(e.relatedTarget)) return;
        zone.classList.remove("is-dragover");
      });
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) upload(e.dataTransfer.files);
    });
    input.addEventListener("change", function () {
      if (input.files.length) upload(input.files);
      input.value = "";
    });
    // Dateien, die neben die Zone fallen, öffnet der Browser sonst als Seite
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) { e.preventDefault(); });
    if (location.hash === "#upload") input.focus();
  }

  // --- Beispiel-Downloads in der Tabelle ---------------------------------------------------------
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-demo-fakedl]");
    if (!btn || !window.ncss) return;
    window.ncss.notify({
      title: "Nur Beispieldaten",
      message: "„" + btn.getAttribute("data-demo-fakedl") + "“ existiert im Demo nicht. Echte Musterdateien findest du unter „Vorlagen & Formulare“.",
      status: "brand"
    });
  });
})();
