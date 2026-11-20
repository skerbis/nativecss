/**
 * ncss - Content-Observer (opt-in): meldet neu eingefügtes Markup automatisch per
 * "ncss-content-change"-Event, damit die Attribut-Scripts aus js/ (count-up, reveal,
 * marquee, sparkline, downloads, events, code-block, combobox, livesearch, ...) es
 * initialisieren - ohne dass der Host-Code (htmx, eigenes fetch+innerHTML, REDAXO-
 * Frontend-Editing) selbst etwas dispatchen muss.
 *
 * PRIMÄRER Weg bleibt das explizite Event - billiger, präzise und ohne Beobachter:
 *   document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: el } }));
 * Dieses Script ist nur für Umgebungen gedacht, in denen sich der Einfüge-Code nicht
 * anpassen lässt. Es ist komplett eigenständig - jedes ncss-Script funktioniert auch
 * ohne es, und es funktioniert ohne jedes andere ncss-Script (dann feuert es nur Events,
 * auf die niemand hört).
 *
 * Mechanik: EIN MutationObserver (childList + subtree auf <html>). Eingefügte ELEMENT-
 * Knoten werden pro Animation-Frame gesammelt (eine htmx-Antwort mit 200 Karten ergibt
 * EIN Event pro oberstem eingefügten Knoten, nicht 200 Events pro Frame-Fragment), Knoten,
 * die in einem anderen Knoten desselben Schubs stecken oder inzwischen wieder entfernt
 * wurden, fallen heraus. Pro übrig gebliebenem Wurzel-Knoten ein Event mit
 * detail.root = Knoten und detail.source = "observer" (zur Unterscheidung vom
 * expliziten Aufruf, falls Host-Code beides kombiniert).
 *
 * Doppelte Meldung (expliziter Dispatch UND Observer) ist unschädlich - jedes ncss-Script
 * merkt sich bereits verarbeitete Elemente (WeakSet) und initialisiert nie doppelt.
 * Markup, das ncss-Scripts SELBST erzeugen (Marquee-Kopie, Sparkline-Tabelle, ...), löst
 * ebenfalls ein Event aus - die Scripts finden darin nichts Neues, kein Endlos-Kreislauf.
 *
 * Opt-out für einzelne Bereiche (z.B. ein häufig neu gerendertes Live-Widget):
 * data-ncss-observe="off" auf einem Vorfahren - Einfügungen darin werden ignoriert.
 *
 * Einbindung: <script src="ncss/js/content-observer.js" defer></script>
 */
(function () {
  "use strict";

  if (typeof MutationObserver === "undefined" || typeof window.CustomEvent !== "function" ||
      typeof window.requestAnimationFrame !== "function" || !document.documentElement) {
    return;
  }

  var pending = [];
  var scheduled = false;

  function flush() {
    scheduled = false;
    var batch = pending;
    pending = [];
    var roots = batch.filter(function (node, index) {
      if (!node.isConnected || batch.indexOf(node) !== index) {
        return false;
      }
      if (node.closest && node.closest('[data-ncss-observe="off"]')) {
        return false;
      }
      // Steckt der Knoten in einem anderen Knoten desselben Schubs, deckt dessen Event ihn ab.
      for (var i = 0; i < batch.length; i++) {
        if (batch[i] !== node && batch[i].contains(node)) {
          return false;
        }
      }
      return true;
    });
    roots.forEach(function (root) {
      document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: root, source: "observer" } }));
    });
  }

  new MutationObserver(function (records) {
    for (var r = 0; r < records.length; r++) {
      var added = records[r].addedNodes;
      for (var n = 0; n < added.length; n++) {
        if (added[n].nodeType === 1) {
          pending.push(added[n]);
        }
      }
    }
    if (pending.length && !scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
