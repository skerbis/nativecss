/**
 * ncss - Code-Block: ruft das self-hosted Prism.js (vendor/prismjs/) einmal
 * kontrolliert auf (statt Prisms eigenem, unkontrolliertem DOMContentLoaded-Autostart -
 * siehe code-block.css für die dafür nötige "window.Prism = { manual: true }"-Zeile VOR
 * dem Laden von prism-core) und ergänzt jeden gefundenen Code-Block danach um einen
 * Copy-to-Clipboard-Button. Läuft auch ohne Prism (z.B. falls nur der Copy-Button
 * gebraucht wird, ohne die Prism-Scripts einzubinden) - Highlighting wird dann einfach
 * übersprungen, der Rohtext bleibt unhighlighted, aber kopierbar.
 *
 * deepQueryAll() statt document.querySelectorAll(): ein Code-Block INNERHALB eines
 * <ncss-container> (siehe ncss-container.js) liegt in dessen Shadow Root -
 * querySelectorAll() durchquert Shadow-Grenzen nicht. Aus demselben Grund wird
 * Prism.highlightElement() PRO Block aufgerufen statt des document-globalen
 * Prism.highlightAll() - highlightElement() arbeitet direkt auf dem übergebenen Element,
 * unabhängig davon, wo es im DOM (oder Shadow-DOM-Baum) sitzt.
 */
(function () {
  "use strict";

  function deepQueryAll(selector, root) {
    root = root || document;
    var found = Array.prototype.slice.call(root.querySelectorAll(selector));
    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) {
        found = found.concat(deepQueryAll(selector, all[i].shadowRoot));
      }
    }
    return found;
  }

  // Prism erst beim jeweiligen Aufruf prüfen (nicht einmalig beim Laden) - ein später
  // eingefügter Block soll auch dann hervorgehoben werden, wenn Prism nach diesem Script
  // fertig geladen wurde.
  function highlight(codeEl) {
    if (window.Prism && typeof window.Prism.highlightElement === "function") {
      window.Prism.highlightElement(codeEl);
    }
  }

  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Elemente merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung
  // mit). Läuft beim Laden und bei jedem "ncss-content-change"-Event (detail.root = neu
  // eingefügtes Element, ohne Angabe das ganze Dokument), siehe js/content-observer.js.
  var SELECTOR = "pre > code[class*=\"language-\"]";
  var seen = new WeakSet();
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var list = deepQueryAll(SELECTOR, root);
    if (root.matches && root.matches(SELECTOR)) list.unshift(root);
    list.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      highlight(el);
      addCopyButton(el);
    });
  }

  // Sprache der Beschriftung: nächstes lang-Attribut (Seite oder Abschnitt), Deutsch oder
  // sonst Englisch.
  function texts(el) {
    var host = el.closest("[lang]");
    var lang = ((host && host.getAttribute("lang")) || document.documentElement.lang || "en").toLowerCase();
    return lang.indexOf("de") === 0
      ? { label: "Code kopieren", done: "Kopiert" }
      : { label: "Copy code", done: "Copied" };
  }

  // Wählt den Platz-Modus (siehe code-block.css): ragt die breiteste Zeile in die
  // Button-Fläche, bekommt der Button eine eigene Zeile über dem Code (.is-stacked). Die
  // Entscheidung hängt nur an Zeilenbreite vs. verfügbarer Breite OHNE Reserve - nicht am
  // aktuellen Modus, sonst könnte das Umschalten selbst wieder zurückschalten (Flattern).
  var range = document.createRange ? document.createRange() : null;
  function layout(pre, codeEl) {
    var cs = getComputedStyle(pre);
    var padStart = parseFloat(cs.paddingInlineStart || cs.paddingLeft) || 0;
    var reserve = parseFloat(cs.getPropertyValue("--ncss-code-reserve")) || 0;
    var probe = pre.querySelector(".ncss-code-copy");
    if (probe) {
      reserve = probe.offsetWidth + (parseFloat(getComputedStyle(probe).insetInlineEnd) || 0) * 2;
    }
    var avail = pre.clientWidth - padStart * 2;
    var need = codeEl.scrollWidth;
    if (range) {
      range.selectNodeContents(codeEl);
      need = range.getBoundingClientRect().width;
    }
    pre.classList.toggle("is-stacked", need > avail - reserve);
    var scrollable = codeEl.scrollWidth > codeEl.clientWidth;
    pre.classList.toggle("is-scrollable", scrollable);
    // Scrollbarer Code muss per Tastatur erreichbar sein (WCAG 2.1.1, axe
    // scrollable-region-focusable) - eigenes tabindex des Autors nie überschreiben.
    if (scrollable && !codeEl.hasAttribute("tabindex")) {
      codeEl.setAttribute("tabindex", "0");
      codeEl.setAttribute("data-ncss-code-tabindex", "");
    } else if (!scrollable && codeEl.hasAttribute("data-ncss-code-tabindex")) {
      codeEl.removeAttribute("tabindex");
      codeEl.removeAttribute("data-ncss-code-tabindex");
    }
    edges(pre, codeEl);
  }
  function edges(pre, codeEl) {
    var max = codeEl.scrollWidth - codeEl.clientWidth;
    var pos = Math.abs(codeEl.scrollLeft);
    pre.classList.toggle("is-at-start", pos <= 1);
    pre.classList.toggle("is-at-end", pos >= max - 1);
  }
  // Nur auf echte Breitenänderungen reagieren und erst im nächsten Frame umschalten: der
  // Moduswechsel ändert selbst Padding/Höhe des <pre> - direkt im Callback umgesetzt, meldet
  // WebKit sonst "ResizeObserver loop completed with undelivered notifications".
  var widths = new WeakMap();
  var observer = typeof ResizeObserver === "function" ? new ResizeObserver(function (entries) {
    entries.forEach(function (entry) {
      var pre = entry.target;
      var w = pre.offsetWidth;
      if (widths.get(pre) === w) {
        return;
      }
      widths.set(pre, w);
      window.requestAnimationFrame(function () {
        var codeEl = pre.querySelector(":scope > code");
        if (codeEl) {
          layout(pre, codeEl);
        }
      });
    });
  }) : null;

  function addCopyButton(codeEl) {
    var pre = codeEl.parentElement;
    if (!pre) {
      return;
    }
    // Ein vorhandener Button stammt aus per innerHTML kopiertem Markup (ohne Listener) -
    // ersetzen statt übernehmen. addCopyButton() läuft pro <code> nur einmal (siehe scan()).
    Array.prototype.forEach.call(pre.querySelectorAll(":scope > .ncss-code-copy, :scope > .ncss-code-status"), function (old) {
      old.remove();
    });

    var t = texts(pre);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ncss-code-copy";
    button.setAttribute("aria-label", t.label);
    button.innerHTML = '<span class="ncss-icon ncss-icon-copy" aria-hidden="true"></span>';
    var status = document.createElement("span");
    status.className = "ncss-code-status";
    status.setAttribute("role", "status");
    pre.classList.add("ncss-code-block");
    pre.appendChild(button);
    pre.appendChild(status);

    button.addEventListener("click", function () {
      copyText(codeEl.textContent, button, status, t);
    });
    codeEl.addEventListener("scroll", function () {
      edges(pre, codeEl);
    }, { passive: true });
    layout(pre, codeEl);
    if (observer) {
      observer.observe(pre);
    }
  }

  // Webfonts ändern die Zeilenbreite nach dem ersten Layout - einmal neu messen.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      relayoutAll();
    });
    // Später nachgeladene Schriften (z.B. eine per Darstellungs-Einstellung gewählte).
    if (document.fonts.addEventListener) {
      document.fonts.addEventListener("loadingdone", function () {
        relayoutAll();
      });
    }
  }

  function copyText(text, button, status, t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopied(button, status, t);
      }, function () {
        fallbackCopy(text, button, status, t);
      });
      return;
    }
    fallbackCopy(text, button, status, t);
  }

  function fallbackCopy(text, button, status, t) {

    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showCopied(button, status, t);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function showCopied(button, status, t) {
    button.setAttribute("data-copied", "true");
    // Ansage über die eigene Status-Region (role="status") - Text erst leeren, dann
    // setzen, damit auch ein zweites Kopieren direkt hintereinander angesagt wird.
    status.textContent = "";
    window.setTimeout(function () { status.textContent = t.done; }, 50);
    button.innerHTML = '<span class="ncss-icon ncss-icon-check" aria-hidden="true"></span>';
    window.setTimeout(function () {
      button.removeAttribute("data-copied");
      button.innerHTML = '<span class="ncss-icon ncss-icon-copy" aria-hidden="true"></span>';
      status.textContent = "";
    }, 1500);
  }
  // Darstellungs-Einstellungen (js/preferences.js: Schriftgröße, Textabstände, Schrift)
  // ändern die Zeilenbreite, ohne dass sich die Breite des <pre> ändert - neu messen.
  function relayoutAll() {
    deepQueryAll("pre.ncss-code-block > code").forEach(function (codeEl) {
      layout(codeEl.parentElement, codeEl);
    });
  }
  document.addEventListener("ncss-preferences-change", function () {
    window.requestAnimationFrame(relayoutAll);
    window.setTimeout(relayoutAll, 400);
  });

  // Erst am Ende starten: range/observer oben sind var-Zuweisungen, die beim Hoisting noch
  // undefined wären.
  scan(document);
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
