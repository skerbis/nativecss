/**
 * NativeCSS - opt-in Begleiter für components/count-up.css
 * (<span class="ncss-count-up" data-ncss-count-up style="--ncss-count-to: 40">40</span>,
 * oder data-ncss-count-up auf einem Vorfahren, z.B. <dl class="ncss-dl--stats"
 * data-ncss-count-up> - dann zählt jedes .ncss-count-up darin).
 *
 * Mit diesem Script zählt die Zahl IMMER zeitbasiert per JS (requestAnimationFrame), in
 * allen Browsern - auch dort, wo CSS-Scroll-Trigger (timeline-trigger, Chromium) die
 * Zählung selbst abspielen könnten. Grund: die reine CSS-Variante zählt über counter(),
 * und counter() kennt keine Tausender-Trenner ("12500" statt "12.500" während des
 * Zählens, per Demo-Test gefunden). Das Script formatiert jeden Zwischenwert per
 * Intl.NumberFormat in der Sprache des nächsten [lang]-Vorfahren (de: "12.500",
 * en: "12,500") und schreibt ihn nach data-ncss-count-text, das ::after per attr() zeigt.
 * Der echte, fertig formatierte DOM-Text bleibt unverändert (Screenreader, Kopieren).
 *
 * Start, sobald die Zahl ins Bild kommt (IntersectionObserver). Nachkommastellen: aus
 * --ncss-count-to übernommen ("4.5" -> eine Stelle) oder per data-ncss-count-decimals.
 * Fehlt --ncss-count-to, wird der Zielwert aus dem Text gelesen ("12.500" -> 12500).
 * Unter prefers-reduced-motion: keine Änderung, die fertige Zahl bleibt stehen.
 *
 * Dynamische Inhalte: neu eingefügte Zahlen per
 *   document.dispatchEvent(new CustomEvent("ncss-content-change", { detail: { root: el } }))
 * melden (oder js/content-observer.js einbinden) - bereits verarbeitete Elemente werden
 * nie doppelt gestartet.
 *
 * Benötigt: components/count-up.css.
 * Einbindung: <script src="ncss/js/count-up.js" defer></script>
 */
(function () {
  if (
    typeof IntersectionObserver === "undefined" ||
    typeof WeakSet === "undefined" ||
    typeof window.requestAnimationFrame !== "function" ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  var SELECTOR = "[data-ncss-count-up]";

  function langOf(el) {
    var host = el.closest("[lang]");
    return (host && host.getAttribute("lang")) || document.documentElement.getAttribute("lang") || undefined;
  }

  function formatter(el, decimals) {
    try {
      return new Intl.NumberFormat(langOf(el), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    } catch (e) {
      // Ungültiger lang-Wert - Browser-Standardsprache statt gar keiner Formatierung.
      return new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
  }

  // Dauer aus --ncss-count-duration ("2s"/"1500ms"), Default 2 s wie im CSS.
  function duration(el) {
    var raw = getComputedStyle(el).getPropertyValue("--ncss-count-duration").trim();
    var n = parseFloat(raw);
    if (isNaN(n)) return 2000;
    return /ms$/.test(raw) ? n : n * 1000;
  }

  // Nähert --ncss-motion-easing-emphasized an (schneller Start, sanftes Auslaufen).
  function ease(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function run(el) {
    var cs = getComputedStyle(el);
    var toRaw = cs.getPropertyValue("--ncss-count-to").trim();
    if (!toRaw) {
      var parsed = parseInt(el.textContent.replace(/[^\d-]/g, ""), 10);
      if (isNaN(parsed)) return;
      toRaw = String(parsed);
      el.style.setProperty("--ncss-count-to", parsed);
    }
    var to = parseFloat(toRaw);
    if (isNaN(to)) return;
    var from = parseFloat(cs.getPropertyValue("--ncss-count-from")) || 0;
    var decAttr = parseInt(el.getAttribute("data-ncss-count-decimals"), 10);
    var decimals = !isNaN(decAttr) ? decAttr : (toRaw.split(".")[1] || "").length;
    var fmt = formatter(el, decimals);
    var ms = duration(el);
    var start = null;

    el.setAttribute("data-ncss-count-text", fmt.format(from));
    el.classList.add("ncss-count-up--js");

    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / ms);
      el.setAttribute("data-ncss-count-text", fmt.format(from + (to - from) * ease(t)));
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        el.classList.add("is-counted");
      }
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.disconnect();
          el.classList.add("is-counting");
          requestAnimationFrame(frame);
        });
      },
      { rootMargin: "0px 0px -15% 0px" }
    );
    io.observe(el);
  }

  // Dynamische Inhalte (htmx, fetch+innerHTML, REDAXO-Frontend-Editing): scan() ist
  // idempotent - bereits verarbeitete Zahlen merkt sich ein WeakSet, bewusst KEIN
  // data-Attribut (per innerHTML kopiertes Markup trüge sonst eine veraltete Markierung
  // mit und würde nie gestartet).
  var seen = new WeakSet();
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var hosts = Array.prototype.slice.call(root.querySelectorAll(SELECTOR));
    if (root.matches && root.matches(SELECTOR)) hosts.unshift(root);
    // Ein Element INNERHALB eines [data-ncss-count-up]-Vorfahren, der selbst neu ist.
    if (root.closest && root.classList && root.classList.contains("ncss-count-up") && root.closest(SELECTOR)) hosts.push(root);
    hosts.forEach(function (host) {
      var nums = host.classList.contains("ncss-count-up")
        ? [host]
        : Array.prototype.slice.call(host.querySelectorAll(".ncss-count-up"));
      nums.forEach(function (el) {
        if (seen.has(el)) return;
        seen.add(el);
        run(el);
      });
    });
  }

  scan(document);
  document.addEventListener("ncss-content-change", function (event) {
    scan((event.detail && event.detail.root) || document);
  });
})();
