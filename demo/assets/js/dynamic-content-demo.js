/**
 * Live-Demo der Handbuch-Seite "Dynamische Inhalte" (docs-src/content/{de,en}/
 * dynamic-content.html) - KEIN Teil von dist/. Simuliert, was htmx, ein eigenes
 * fetch()+innerHTML oder REDAXOs Frontend-Editing tun: fertiges Markup per innerHTML
 * einfügen. Zwei Wege zum Vergleich:
 *   [data-demo-insert="event"]  einfügen UND "ncss-content-change" feuern
 *   [data-demo-insert="silent"] nur einfügen - die ncss-Scripts bemerken nichts
 *   [data-demo-announce]        nachträglich für den ganzen Bereich melden
 *   [data-demo-clear]           Bereich leeren
 * Barrierefreiheit: Fokus wandert nach dem (vom Nutzer ausgelösten) Einfügen auf die
 * Überschrift der neuen Karte, #dyn-demo-status (role="status") sagt sie kurz an.
 * Externe Datei statt Inline-Script (CSP-Vorgabe der Website).
 */
(function () {
  "use strict";

  var stage = document.getElementById("dyn-demo-stage");
  if (!stage) {
    return;
  }
  var status = document.getElementById("dyn-demo-status");
  var en = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en";
  var counter = 0;

  function fragment(silent) {
    var n = ++counter;
    var title = silent
      ? (en ? "Inserted without event #" : "Ohne Event eingefügt #") + n
      : (en ? "Inserted with event #" : "Mit Event eingefügt #") + n;
    return (
      '<article class="ncss-card ncss-border ncss-radius-md">' +
      '<div class="ncss-card-body ncss-stack ncss-stack--tight">' +
      '<h3 tabindex="-1">' + title + "</h3>" +
      '<p class="ncss-text-xl"><span class="ncss-count-up" data-ncss-count-up style="--ncss-count-to: 12500">12.500</span></p>' +
      '<svg class="ncss-sparkline" data-values="4,7,3,9,5,12,8" data-label="' + (en ? "Visits per day" : "Besuche pro Tag") + '"></svg>' +
      '<div class="ncss-marquee ncss-marquee--fade" data-ncss-marquee>' +
      '<ul class="ncss-marquee-group" role="list"><li>htmx</li><li>fetch()</li><li>innerHTML</li><li>REDAXO</li><li>Turbo</li></ul>' +
      "</div>" +
      '<pre><code class="language-html">&lt;p class="ncss-text-muted"&gt;' + (en ? "Highlighted later" : "Nachträglich hervorgehoben") + "&lt;/p&gt;</code></pre>" +
      "</div></article>"
    );
  }

  function insert(silent) {
    var wrap = document.createElement("div");
    wrap.innerHTML = fragment(silent);
    var card = wrap.firstElementChild;
    stage.prepend(card);
    if (!silent) {
      document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: card } }));
    }
    // Vom Nutzer ausgelöst -> Fokus auf die Überschrift des neuen Bereichs (tabindex="-1",
    // nicht in der Tab-Reihenfolge) und eine knappe Ansage per role="status" - statt den
    // ganzen Karteninhalt über ein aria-live auf dem Container vorlesen zu lassen.
    card.querySelector("h3").focus();
    if (status) {
      status.textContent = card.querySelector("h3").textContent;
    }
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-demo-insert], [data-demo-announce], [data-demo-clear]");
    if (!btn) {
      return;
    }
    if (btn.hasAttribute("data-demo-insert")) {
      insert(btn.getAttribute("data-demo-insert") === "silent");
    } else if (btn.hasAttribute("data-demo-announce")) {
      document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: stage } }));
    } else {
      stage.innerHTML = "";
    }
  });
})();
