/**
 * NativeCSS - Wort-Variante für components/text-reveal.css
 * (<p class="ncss-text-reveal" data-ncss-text-reveal>). Die Zeilen-/Fluss-Varianten
 * brauchen KEIN JS - dieses Script ist nur für "Wort für Wort".
 *
 * Verpackt jedes Wort in <span class="ncss-text-reveal-word"> (nur Text-Knoten werden
 * geteilt, Inline-Markup wie <a>/<em> bleibt erhalten, der Text selbst bleibt für
 * Screenreader identisch) und nummeriert sie per --i/--n - die eigentliche Animation
 * läuft danach rein per CSS an der view-timeline des Blocks.
 *
 * Ohne view-timeline: Wörter blenden nacheinander zeitbasiert ein, sobald der Block ins
 * Bild kommt (IntersectionObserver, Klasse .ncss-text-reveal--timed + .is-revealed).
 * Unter prefers-reduced-motion wird gar nichts verändert (Text bleibt wie er ist).
 *
 * Einbindung: <script src="ncss/js/text-reveal.js" defer></script>
 */
(function () {
  if (
    typeof IntersectionObserver === "undefined" ||
    !document.createTreeWalker ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  var blocks = document.querySelectorAll("[data-ncss-text-reveal]");
  if (!blocks.length) return;

  var native = typeof CSS !== "undefined" && CSS.supports && CSS.supports("animation-timeline", "view()");

  function split(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var texts = [];
    for (var n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.data.trim()) texts.push(n);
    }
    var count = 0;
    texts.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.data.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        var span = document.createElement("span");
        span.className = "ncss-text-reveal-word";
        span.textContent = part;
        span.style.setProperty("--i", count++);
        frag.appendChild(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
    el.style.setProperty("--n", Math.max(1, count));
    el.classList.add("ncss-text-reveal--words");
  }

  var io = native
    ? null
    : new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -25% 0px" }
      );

  for (var i = 0; i < blocks.length; i++) {
    split(blocks[i]);
    if (io) {
      blocks[i].classList.add("ncss-text-reveal--timed");
      io.observe(blocks[i]);
    }
  }
})();
