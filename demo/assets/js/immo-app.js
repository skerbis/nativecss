/**
 * ImmoDesk-Demo (demo/example-immo/) - gemeinsames App-Verhalten, nur Demo, NICHT Teil von dist/.
 *
 * - Navigations-Drawer: in schmalen Containern wird DIESELBE Sidebar-Navigation in den
 *   Off-Canvas-<dialog> umgehängt (eine Nav, keine Kopie), beim Schließen zurück.
 * - Tastenkürzel-Hinweis ⌘K / Strg K je nach Plattform.
 * - Benachrichtigungen "alle gelesen", CSV-Export sichtbarer Tabellenzeilen,
 *   Skeleton-Ladezustand ("Aktualisieren"), kleine Toast-Hilfe über ncss.notify.
 */
(function () {
  "use strict";

  if (!("closest" in Element.prototype)) return;

  var immo = (window.immo = window.immo || {});

  immo.eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  immo.toast = function (title, message, status) {
    if (window.ncss && typeof window.ncss.notify === "function") {
      window.ncss.notify({ title: title, message: message || "", status: status || "success" });
    }
  };

  // --- Drawer -------------------------------------------------------------------------------
  var nav = document.getElementById("sidebarNav");
  var home = nav && nav.parentNode;
  var drawer = document.getElementById("appDrawer");
  var toggle = document.querySelector("[data-demo-drawer]");

  if (nav && drawer && toggle && typeof drawer.showModal === "function") {
    toggle.addEventListener("click", function () {
      drawer.appendChild(nav);
      drawer.showModal();
      toggle.setAttribute("aria-expanded", "true");
      var current = nav.querySelector('[aria-current="page"]');
      if (current) current.focus();
    });
    drawer.addEventListener("close", function () {
      home.appendChild(nav);
      toggle.setAttribute("aria-expanded", "false");
    });
    // Klick auf einen Link im Drawer: Seite wechselt ohnehin, Drawer vorher schließen
    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) drawer.close(); // Klick auf den Backdrop
    });
    // Container wird breit (Fenster vergrößert): Sidebar ist wieder sichtbar -> Drawer zu
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(function () {
        if (drawer.open && getComputedStyle(toggle).display === "none") drawer.close();
      }).observe(document.body);
    }
  }

  // --- Tastenkürzel-Hinweis -----------------------------------------------------------------
  var isApple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll("[data-demo-shortcut]").forEach(function (kbd) {
    kbd.textContent = isApple ? "⌘K" : "Strg K";
  });

  // --- Benachrichtigungen -------------------------------------------------------------------
  document.addEventListener("click", function (e) {
    var markRead = e.target.closest("[data-demo-markread]");
    if (markRead) {
      document.querySelectorAll(".demo-notice[data-unread]").forEach(function (n) {
        n.removeAttribute("data-unread");
      });
      document.querySelectorAll("[data-demo-bell]").forEach(function (bell) {
        var dot = bell.querySelector(".demo-dot");
        if (dot) dot.remove();
        bell.setAttribute("aria-label", "Benachrichtigungen, keine ungelesenen");
      });
      markRead.disabled = true;
      immo.toast("Alles gelesen", "Benachrichtigungen als gelesen markiert.");
    }
  });

  // --- CSV-Export ---------------------------------------------------------------------------
  function cellText(cell) {
    var clone = cell.cloneNode(true);
    clone.querySelectorAll(".ncss-visually-hidden, .demo-avatar, .demo-iconbtn, [data-demo-dun], .demo-sort svg").forEach(function (n) {
      n.remove();
    });
    return clone.textContent.replace(/\s+/g, " ").trim();
  }
  function csvValue(v) {
    return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-demo-export]");
    if (!btn) return;
    var table = document.getElementById(btn.getAttribute("data-demo-export"));
    if (!table) return;
    var heads = Array.prototype.map.call(table.tHead.rows[0].cells, cellText);
    var keep = heads.map(function (h) { return h !== ""; });
    var lines = [heads.filter(function (h, i) { return keep[i]; }).map(csvValue).join(";")];
    var count = 0;
    Array.prototype.forEach.call(table.tBodies[0].rows, function (row) {
      if (row.hidden) return;
      count++;
      lines.push(Array.prototype.filter.call(row.cells, function (c, i) { return keep[i]; })
        .map(function (c) { return csvValue(cellText(c)); }).join(";"));
    });
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = btn.getAttribute("data-filename") || "export.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    immo.toast("Export erstellt", count + " Zeilen als CSV (Semikolon, UTF-8) gespeichert.");
  });

  // --- Skeleton-Ladezustand -----------------------------------------------------------------
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-demo-refresh]");
    if (!btn) return;
    var panel = document.getElementById(btn.getAttribute("data-demo-refresh"));
    var region = panel && panel.querySelector("[data-demo-skeleton]");
    var tbody = region && region.querySelector("tbody");
    if (!tbody) return;
    var saved = tbody.innerHTML;
    var widths = [80, 60, 45, 55, 40];
    btn.disabled = true;
    region.setAttribute("aria-busy", "true");
    Array.prototype.forEach.call(tbody.rows, function (row) {
      Array.prototype.forEach.call(row.cells, function (cell, i) {
        var skel = document.createElement("span");
        skel.className = "ncss-skeleton demo-skel";
        skel.style.setProperty("--demo-w", widths[i % widths.length] + "%");
        cell.replaceChildren(skel);
      });
    });
    setTimeout(function () {
      tbody.innerHTML = saved;
      region.setAttribute("aria-busy", "false");
      btn.disabled = false;
      immo.toast("Aktualisiert", "Mieteingänge sind auf dem Stand von eben.");
    }, 1400);
  });
})();
