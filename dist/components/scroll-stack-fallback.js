/**
 * NativeCSS - JS-Fallback für components/scroll-stack.css (.ncss-stack-section) in
 * Browsern ohne animation-timeline (Stand August 2026: Firefox, ältere Safari-Versionen
 * vor 26 - per WebSearch bestätigt). Ohne dieses Script zeigt scroll-stack.css dort seinen
 * bereits eingebauten, garantiert funktionierenden Fallback (Karten normal im Fluss
 * untereinander, kein Pinning/keine Animation) - dieses Script ist rein opt-in, für Seiten,
 * die auch dort das echte Pinned-Scroll-Stapel-Erlebnis wollen.
 *
 * Prüft sich selbst per CSS.supports() (dieselbe Bedingung wie scroll-stack.css' eigener
 * @supports-Block) - läuft NUR, wenn die native Technik NICHT bereits greift (kein doppelt
 * arbeitender Mechanismus), UND nur wenn prefers-reduced-motion das erlaubt (identisches
 * Gate wie die native CSS-Variante).
 *
 * Baut dieselbe Bühnen-/Absolut-Stapel-Struktur wie der native
 * @supports(view-timeline-name)-Block nach (Klasse .ncss-stack-js-active, siehe die
 * zugehörige CSS-Ergänzung in scroll-stack.css) und übernimmt selbst, was dort
 * animation-timeline/-range erledigen würde: berechnet den Scroll-Fortschritt jeder
 * Sektion/Karte direkt aus getBoundingClientRect() (dieselbe view-timeline-inset-Formel
 * wie in scroll-stack.css nachgerechnet, siehe dortiger Kommentar für die Herleitung) und
 * setzt transform/filter analog zu den @keyframes ncss-stack-arrive/-settle
 * (+ den -horizontal-Varianten) manuell, rAF-gedrosselt beim Scrollen.
 *
 * Einbindung (nur auf Seiten mit .ncss-stack-section, die auch in Firefox/älterem Safari
 * animiert werden sollen):
 *   <script src="../components/scroll-stack-fallback.js" defer></script>
 *
 * deepQueryAll() statt document.querySelectorAll(): eine .ncss-stack-section INNERHALB
 * eines <ncss-container> (siehe ncss-container.js) liegt in dessen Shadow Root -
 * querySelectorAll() durchquert Shadow-Grenzen NICHT, würde sie also stillschweigend
 * übersehen. deepQueryAll() steigt rekursiv in jeden offenen Shadow Root ab (auch
 * verschachtelt), findet dadurch Sektionen unabhängig davon, ob/wie tief sie in Shadow-
 * DOM-Bäumen stecken - für den ganz normalen Fall (kein Shadow DOM auf der Seite) verhält
 * es sich exakt wie querySelectorAll (keine Elemente mit .shadowRoot zu durchsuchen).
 */
(function () {
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

  if (
    typeof CSS === "undefined" ||
    !CSS.supports ||
    CSS.supports("view-timeline-name", "--ncss-stack-progress") ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  var sectionEls = deepQueryAll(".ncss-stack-section");
  if (!sectionEls.length) return;

  // Unsichtbares Sonden-Element zum Auflösen beliebiger CSS-Längen (rem/vh/lvh/px/em/
  // min()/calc()...) in einen echten px-Zahlenwert - dieselbe Technik wie beim Live-
  // Farbeditor (demo/colors.html), dort für Farben statt Längen. width statt height
  // gewählt, funktioniert aber für JEDE Längeneinheit unabhängig von der Achse (vh/lvh
  // beziehen sich immer auf die Viewport-Höhe, unabhängig davon, welcher Eigenschaft der
  // Wert zugewiesen wird).
  var probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;";
  document.body.appendChild(probe);
  function resolveLength(value, fallback) {
    probe.style.width = value || fallback;
    var px = probe.getBoundingClientRect().width;
    if (!px && value !== "0" && value !== "0px") {
      probe.style.width = fallback;
      px = probe.getBoundingClientRect().width;
    }
    return px;
  }
  function num(value, fallback) {
    var n = parseFloat(value);
    return isNaN(n) ? fallback : n;
  }
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  var sections = [];
  sectionEls.forEach(function (sectionEl) {
    var sectionStyle = getComputedStyle(sectionEl);
    var horizontal = sectionEl.classList.contains("ncss-stack-section--horizontal");
    var cardEls = sectionEl.querySelectorAll(".ncss-stack-card");
    if (!cardEls.length) return;

    var section = {
      el: sectionEl,
      horizontal: horizontal,
      count: num(sectionStyle.getPropertyValue("--ncss-stack-count"), 4),
      stageHeightRaw: sectionStyle.getPropertyValue("--ncss-stack-stage-height").trim(),
      cards: [],
    };
    section.stageHeightPx = resolveLength(section.stageHeightRaw, "100lvh");

    cardEls.forEach(function (cardEl) {
      var cs = getComputedStyle(cardEl);
      section.cards.push({
        el: cardEl,
        index: num(cs.getPropertyValue("--ncss-stack-index"), 0),
        fanPx: resolveLength(cs.getPropertyValue("--ncss-stack-fan").trim(), "1.25rem"),
        scaleReceded: num(cs.getPropertyValue("--ncss-stack-scale"), 0.92),
        depthPx: resolveLength(cs.getPropertyValue("--ncss-stack-depth").trim(), "-80px"),
        tiltDeg: num(cs.getPropertyValue("--ncss-stack-tilt"), 6),
        brightnessReceded: num(cs.getPropertyValue("--ncss-stack-brightness"), 0.75),
        cardHeightPx: horizontal ? 0 : resolveLength(cs.getPropertyValue("--ncss-stack-card-height").trim(), "60vh"),
        cardWidthPx: horizontal ? resolveLength(cs.getPropertyValue("--ncss-stack-card-width").trim(), "min(90vw, 40rem)") : 0,
      });
    });

    sectionEl.classList.add("ncss-stack-js-active");
    sections.push(section);
  });

  if (!sections.length) return;

  function applyCard(card, local, section) {
    var offset = card.index * card.fanPx;
    var scale, depth = 0, tilt = 0, brightness = 1, extra = 0;

    if (local <= 0.5) {
      if (card.index === 0) {
        // ncss-stack-settle: 0%-50% ist konstant (flach), keine Anfahrt-Zwischenstufe.
        scale = 1;
      } else {
        // ncss-stack-arrive: Off-Stage -> flach.
        var t = local / 0.5;
        var offStage = section.horizontal
          ? window.innerWidth / 2 + card.cardWidthPx / 2
          : section.stageHeightPx / 2 + card.cardHeightPx / 2;
        extra = lerp(offStage, 0, t);
        scale = lerp(0.92, 1, t);
      }
    } else {
      // Beide Keyframe-Sets teilen sich 50%-100%: flach -> zurückgewichen.
      var t2 = (local - 0.5) / 0.5;
      scale = lerp(1, card.scaleReceded, t2);
      depth = lerp(0, card.depthPx, t2);
      tilt = lerp(0, card.tiltDeg, t2);
      brightness = lerp(1, card.brightnessReceded, t2);
    }

    var main = offset + extra;
    card.el.style.transform = section.horizontal
      ? "translateX(" + main + "px) scale(" + scale + ") translateZ(" + depth + "px) rotateY(" + tilt + "deg)"
      : "translateY(" + main + "px) scale(" + scale + ") translateZ(" + depth + "px) rotateX(" + tilt + "deg)";
    card.el.style.filter = "brightness(" + brightness + ")";
  }

  function update() {
    var vh = window.innerHeight;
    sections.forEach(function (section) {
      var rect = section.el.getBoundingClientRect();
      var totalDistance = (section.count - 1) * section.stageHeightPx;
      // 0% ist NICHT immer bei rect.top===0 - view-timeline-inset: 100lvh <stage-height>
      // setzt den Start-Bezug IMMER auf die volle Viewport-Höhe (erster Wert, fest
      // "100lvh", unabhängig von der Bühnengröße), den End-Bezug dagegen auf die
      // Bühnenhöhe (zweiter Wert). Nur wenn beide gleich sind (Vollbild-Default,
      // --ncss-stack-stage-height ebenfalls 100lvh) liegt der 0%-Punkt zufällig bei
      // top===0 - bei einer kleineren Bühne (z.B. "in einem normalen Container", siehe
      // demo/stacked-cards.html) liegt er bei vh-stageHeight, per echtem Soll/Ist-
      // Vergleich mit der nativen Chromium-Berechnung gefunden und korrigiert (die erste
      // Fassung nahm fälschlich top===0 in JEDEM Fall an).
      var progress = totalDistance > 0 ? clamp((vh - section.stageHeightPx - rect.top) / totalDistance, 0, 1) : 0;
      section.cards.forEach(function (card) {
        var local = clamp((progress * section.count - card.index) / 2, 0, 1);
        applyCard(card, local, section);
      });
    });
    ticking = false;
  }

  var ticking = false;
  function requestUpdate() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  function remeasure() {
    sections.forEach(function (section) {
      section.stageHeightPx = resolveLength(section.stageHeightRaw, "100lvh");
      section.cards.forEach(function (card) {
        var cs = getComputedStyle(card.el);
        card.fanPx = resolveLength(cs.getPropertyValue("--ncss-stack-fan").trim(), "1.25rem");
        card.depthPx = resolveLength(cs.getPropertyValue("--ncss-stack-depth").trim(), "-80px");
        card.cardHeightPx = section.horizontal ? 0 : resolveLength(cs.getPropertyValue("--ncss-stack-card-height").trim(), "60vh");
        card.cardWidthPx = section.horizontal ? resolveLength(cs.getPropertyValue("--ncss-stack-card-width").trim(), "min(90vw, 40rem)") : 0;
      });
    });
    requestUpdate();
  }

  var resizeTimer;
  window.addEventListener(
    "resize",
    function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(remeasure, 150);
    },
    { passive: true },
  );
  window.addEventListener("scroll", requestUpdate, { passive: true });
  requestUpdate();
})();
