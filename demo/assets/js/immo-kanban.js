/**
 * ImmoDesk-Demo - Kanban-Board für Reparaturen (nur Demo, NICHT Teil von dist/).
 *
 * Verschieben auf drei Wegen, alle mit Ansage in einer Live-Region:
 *   - Maus: natives HTML Drag & Drop (draggable) zwischen und innerhalb der Spalten
 *   - Tastatur: Karte fokussieren, Alt+←/→ = Spalte wechseln, Alt+↑/↓ = Reihenfolge
 *   - Touch/alle: die beiden Pfeil-Buttons auf jeder Karte
 * Dazu: Filter, "Neues Ticket"-Formular mit eigener, zugänglicher Validierung
 * (aria-invalid + Fehlertext + Fokus aufs erste fehlerhafte Feld), #neu öffnet es direkt.
 */
(function () {
  "use strict";

  if (!("closest" in Element.prototype)) return;

  var immo = window.immo || {};
  var board = document.querySelector("[data-demo-board]");
  if (!board) return;
  var cols = Array.prototype.slice.call(board.querySelectorAll(".demo-col"));
  var status = document.getElementById("boardStatus");

  function colName(col) { return col.querySelector("h2").textContent; }
  function title(card) { return card.querySelector("h3").textContent; }
  function announce(text) {
    status.textContent = "";
    setTimeout(function () { status.textContent = text; }, 30);
  }

  function refresh() {
    cols.forEach(function (col, i) {
      var cards = col.querySelectorAll(".demo-ticket");
      var visible = Array.prototype.filter.call(cards, function (c) { return !c.parentNode.hidden; }).length;
      col.querySelector("[data-count]").textContent = visible === cards.length ? cards.length : visible + "/" + cards.length;
      Array.prototype.forEach.call(cards, function (card) {
        var prev = card.querySelector('[data-move="-1"]');
        var next = card.querySelector('[data-move="1"]');
        prev.disabled = i === 0;
        next.disabled = i === cols.length - 1;
        var lp = i > 0 ? "Nach „" + colName(cols[i - 1]) + "“ verschieben" : "Bereits in der ersten Spalte";
        var ln = i < cols.length - 1 ? "Nach „" + colName(cols[i + 1]) + "“ verschieben" : "Bereits in der letzten Spalte";
        prev.setAttribute("aria-label", lp);
        prev.title = lp;
        next.setAttribute("aria-label", ln);
        next.title = ln;
      });
    });
  }

  function flash(card) {
    card.classList.remove("is-moved");
    void card.offsetWidth;
    card.classList.add("is-moved");
  }

  function moved(card, fromCol, toCol) {
    refresh();
    flash(card);
    if (fromCol !== toCol) {
      announce("„" + title(card) + "“ nach „" + colName(toCol) + "“ verschoben.");
      if (toCol.getAttribute("data-col") === "erledigt" && immo.toast) {
        immo.toast("Ticket erledigt", title(card));
      }
    } else {
      var list = Array.prototype.slice.call(toCol.querySelectorAll(".demo-ticket"));
      announce("„" + title(card) + "“ jetzt an Position " + (list.indexOf(card) + 1) + " von " + list.length + ".");
    }
  }

  function moveToColumn(card, delta) {
    var from = card.closest(".demo-col");
    var to = cols[cols.indexOf(from) + delta];
    if (!to) return false;
    to.querySelector(".demo-cards").prepend(card.parentNode);
    moved(card, from, to);
    return true;
  }
  function moveWithin(card, delta) {
    var li = card.parentNode;
    var sibling = delta < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!sibling) return;
    if (delta < 0) sibling.before(li);
    else sibling.after(li);
    var col = card.closest(".demo-col");
    moved(card, col, col);
  }

  // --- Buttons + Tastatur ---------------------------------------------------------------------
  board.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-move]");
    if (!btn) return;
    var card = btn.closest(".demo-ticket");
    var delta = +btn.getAttribute("data-move");
    if (moveToColumn(card, delta)) {
      var same = card.querySelector('[data-move="' + delta + '"]');
      (same.disabled ? card : same).focus();
    }
  });
  board.addEventListener("keydown", function (e) {
    var card = e.target.closest(".demo-ticket");
    if (!card || e.target !== card || !e.altKey) return;
    var keys = { ArrowLeft: [moveToColumn, -1], ArrowRight: [moveToColumn, 1], ArrowUp: [moveWithin, -1], ArrowDown: [moveWithin, 1] };
    var action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    action[0](card, action[1]);
    card.focus();
  });

  // --- Drag & Drop ----------------------------------------------------------------------------------
  var dragged = null;
  var fromCol = null;
  board.addEventListener("dragstart", function (e) {
    var card = e.target.closest && e.target.closest(".demo-ticket");
    if (!card) return;
    dragged = card;
    fromCol = card.closest(".demo-col");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.id);
    requestAnimationFrame(function () { card.classList.add("is-dragging"); });
  });
  board.addEventListener("dragend", function () {
    if (dragged) dragged.classList.remove("is-dragging");
    cols.forEach(function (c) { c.classList.remove("is-over"); });
    dragged = null;
  });
  board.addEventListener("dragover", function (e) {
    var col = e.target.closest(".demo-col");
    if (!dragged || !col) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    cols.forEach(function (c) { c.classList.toggle("is-over", c === col); });
  });
  board.addEventListener("dragleave", function (e) {
    var col = e.target.closest(".demo-col");
    if (col && !col.contains(e.relatedTarget)) col.classList.remove("is-over");
  });
  board.addEventListener("drop", function (e) {
    var col = e.target.closest(".demo-col");
    if (!dragged || !col) return;
    e.preventDefault();
    var list = col.querySelector(".demo-cards");
    var after = Array.prototype.filter.call(list.children, function (li) {
      if (li === dragged.parentNode || li.hidden) return false;
      var r = li.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    })[0];
    list.insertBefore(dragged.parentNode, after || null);
    col.classList.remove("is-over");
    moved(dragged, fromCol, col);
  });

  // --- Filter ---------------------------------------------------------------------------------------
  var filter = document.querySelector("[data-demo-ticketfilter]");
  function applyFilter() {
    var q = filter.q.value.trim().toLowerCase();
    var prop = filter.prop.value;
    var prio = filter.prio.value;
    board.querySelectorAll(".demo-ticket").forEach(function (card) {
      card.parentNode.hidden = !((!q || card.getAttribute("data-search").indexOf(q) !== -1) &&
        (!prop || card.getAttribute("data-prop") === prop) &&
        (!prio || card.getAttribute("data-prio") === prio));
    });
    refresh();
  }
  if (filter) {
    filter.addEventListener("input", applyFilter);
    filter.addEventListener("change", applyFilter);
    filter.addEventListener("submit", function (e) { e.preventDefault(); });
  }

  // --- Neues Ticket ---------------------------------------------------------------------------------
  var dialog = document.getElementById("newTicket");
  var form = document.getElementById("ticketForm");
  var nextNo = 2049;
  var submitted = false;
  var PRIO = { niedrig: "neutral", mittel: "brand-2", hoch: "warning", dringend: "danger" };

  function setError(field, msgEl, message) {
    field.setAttribute("aria-invalid", message ? "true" : "false");
    msgEl.textContent = message || "";
  }
  function validate() {
    var errors = [];
    var t = form.title;
    var len = t.value.trim().length;
    var mt = !len ? "Bitte gib einen Titel ein." : len < 5 ? "Der Titel braucht mindestens 5 Zeichen (aktuell " + len + ")." : "";
    setError(t, document.getElementById("ntNameErr"), mt);
    if (mt) errors.push(t);
    var p = form.prop;
    var mp = p.value ? "" : "Bitte wähle das betroffene Objekt.";
    setError(p, document.getElementById("ntPropErr"), mp);
    if (mp) errors.push(p);
    var d = form.due;
    var md = d.value && d.value < d.min ? "Das Datum liegt in der Vergangenheit." : "";
    setError(d, document.getElementById("ntDueErr"), md);
    if (md) errors.push(d);
    document.getElementById("ntSummary").textContent = errors.length
      ? (errors.length === 1 ? "Bitte prüfe 1 Feld." : "Bitte prüfe " + errors.length + " Felder.")
      : "";
    return errors;
  }

  if (dialog && form) {
    form.addEventListener("input", function () { if (submitted) validate(); });
    form.addEventListener("change", function () { if (submitted) validate(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitted = true;
      var errors = validate();
      if (errors.length) {
        errors[0].focus();
        return;
      }
      var propOpt = form.prop.options[form.prop.selectedIndex];
      var prio = form.prio.value || "mittel";
      var craft = form.craft.value ? form.craft.options[form.craft.selectedIndex].text.split(" – ")[0] : "";
      var tpl = board.querySelector(".demo-ticket").parentNode.cloneNode(true);
      var card = tpl.querySelector(".demo-ticket");
      var no = nextNo++;
      card.id = "t-" + no;
      card.setAttribute("data-prop", form.prop.value);
      card.setAttribute("data-prio", prio);
      card.setAttribute("data-search", (form.title.value + " " + propOpt.text + " " + no).toLowerCase());
      card.setAttribute("aria-labelledby", "tt-" + no);
      card.setAttribute("aria-describedby", "tm-" + no);
      var b = card.querySelector(".ncss-badge");
      b.className = "ncss-badge ncss-badge--" + PRIO[prio];
      b.textContent = prio;
      card.querySelector(".demo-muted").textContent = "#" + no;
      var h = card.querySelector("h3");
      h.id = "tt-" + no;
      h.textContent = form.title.value.trim();
      var meta = card.querySelector(".demo-ticket-meta");
      meta.id = "tm-" + no;
      meta.children[0].textContent = propOpt.text + (form.unit.value.trim() ? " · " + form.unit.value.trim() : "");
      meta.children[1].textContent = "20.11.2026 · ImmoDesk";
      var foot = card.querySelector(".demo-ticket-foot");
      Array.prototype.slice.call(foot.children).forEach(function (n) { if (!n.matches("[data-move]")) n.remove(); });
      var who = document.createElement("span");
      who.className = "demo-muted";
      who.textContent = craft || "nicht zugewiesen";
      foot.prepend(who);
      cols[0].querySelector(".demo-cards").prepend(tpl);
      dialog.close();
      form.reset();
      submitted = false;
      form.querySelectorAll("[aria-invalid]").forEach(function (f) { f.removeAttribute("aria-invalid"); });
      form.querySelectorAll(".ncss-field-error").forEach(function (m) { m.textContent = ""; });
      refresh();
      flash(card);
      card.scrollIntoView({ block: "nearest" });
      announce("Ticket „" + h.textContent + "“ in „Neu“ angelegt.");
      immo.toast && immo.toast("Ticket #" + no + " angelegt", h.textContent);
    });
    dialog.addEventListener("close", function () {
      if (location.hash === "#neu") history.replaceState(null, "", location.pathname);
    });
    if (location.hash === "#neu" && typeof dialog.showModal === "function") dialog.showModal();
  }

  // Sprung zu #t-NNNN (z.B. aus Dashboard/Benachrichtigung): Karte fokussieren
  var target = /^#t-\d+$/.test(location.hash) && document.querySelector(location.hash);
  if (target) {
    target.scrollIntoView({ block: "center" });
    target.focus({ preventScroll: true });
    flash(target);
  }

  refresh();
})();
