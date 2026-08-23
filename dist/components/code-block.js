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

  var canHighlight = window.Prism && typeof window.Prism.highlightElement === "function";

  var blocks = deepQueryAll('pre > code[class*="language-"]');
  for (var i = 0; i < blocks.length; i++) {
    if (canHighlight) {
      window.Prism.highlightElement(blocks[i]);
    }
    addCopyButton(blocks[i]);
  }

  function addCopyButton(codeEl) {
    var pre = codeEl.parentElement;
    if (!pre || pre.querySelector(".ncss-code-copy")) {
      return;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "ncss-code-copy";
    button.setAttribute("aria-label", "In die Zwischenablage kopieren");
    button.innerHTML = '<span class="ncss-icon ncss-icon-copy" aria-hidden="true"></span>';
    pre.appendChild(button);

    button.addEventListener("click", function () {
      copyText(codeEl.textContent, button);
    });
  }

  function copyText(text, button) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopied(button);
      });
      return;
    }

    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showCopied(button);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function showCopied(button) {
    button.setAttribute("data-copied", "true");
    button.innerHTML = '<span class="ncss-icon ncss-icon-check" aria-hidden="true"></span>';
    window.setTimeout(function () {
      button.removeAttribute("data-copied");
      button.innerHTML = '<span class="ncss-icon ncss-icon-copy" aria-hidden="true"></span>';
    }, 1500);
  }
})();
