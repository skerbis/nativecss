/**
 * ncss - Tooltip-Fallback + Absicherung (siehe components/tooltip.css für Markup).
 *
 * Mit nativem interestfor (Chromium) setzt dieses Script nur fehlende Attribute
 * (popover="hint", role="tooltip", aria-describedby) - alles andere macht der Browser.
 * Ohne interestfor übernimmt es das Verhalten nach WAI-ARIA-APG "Tooltip" / WCAG 1.4.13:
 *   - öffnet nach kurzer Verzögerung bei Zeiger (Maus/Stift) oder Tastatur-Fokus
 *   - bleibt offen, solange der Zeiger auf Auslöser ODER Tooltip ist (hoverable)
 *   - Esc schließt, ohne den Fokus zu verschieben (dismissable)
 *   - schließt bei Blur / Verlassen
 * Positionierung per CSS Anchor Positioning (Script vergibt anchor-name/position-anchor),
 * sonst eigene Rechnung (über dem Auslöser, bei Platzmangel darunter, im Viewport gehalten).
 *
 * Reine Ereignis-Delegation am document - Tooltips, die per htmx/fetch/REDAXO-Frontend-
 * Editing NACHTRÄGLICH eingefügt werden, funktionieren ohne weiteres Zutun (kein
 * ncss-content-change nötig). Die Attribut-Absicherung läuft zusätzlich beim ersten
 * Kontakt mit einem Auslöser.
 *
 * Events (am Tooltip, bubbeln): ncss-tooltip-show / ncss-tooltip-hide
 * Abhängigkeiten: keine anderen ncss-Scripts. Ohne Popover-API tut das Script nichts.
 */
(function () {
  "use strict";

  if (!HTMLElement.prototype.hasOwnProperty("popover") || window.ncssTooltipLoaded) {
    return;
  }
  window.ncssTooltipLoaded = true;

  var nativeInterest = "interestForElement" in HTMLButtonElement.prototype;
  var anchorSupport = window.CSS && CSS.supports("anchor-name: --a") && CSS.supports("position-area: top");
  var hintSupport = (function () {
    var probe = document.createElement("div");
    probe.setAttribute("popover", "hint");
    return probe.popover === "hint";
  })();
  var SHOW_DELAY = 300;
  var HIDE_DELAY = 150;
  var counter = 0;
  var showTimer = 0;
  var hideTimer = 0;
  var openTip = null;
  var openTrigger = null;

  function tipFor(trigger) {
    var id = trigger && trigger.getAttribute("interestfor");
    var tip = id ? document.getElementById(id) : null;
    return tip && tip.classList.contains("ncss-tooltip") ? tip : null;
  }

  // Fehlende Attribute ergänzen - einmal pro Tooltip (Markierung als JS-Property, nicht als
  // Attribut: kopiertes Markup trägt so nie einen veralteten "schon erledigt"-Zustand mit).
  function prepare(trigger, tip) {
    if (tip._ncssTooltip) {
      return;
    }
    tip._ncssTooltip = true;
    if (!tip.hasAttribute("popover") || (tip.popover === "manual" && hintSupport)) {
      tip.setAttribute("popover", hintSupport ? "hint" : "manual");
    }
    if (!tip.hasAttribute("role")) {
      tip.setAttribute("role", "tooltip");
    }
    var described = (trigger.getAttribute("aria-describedby") || "").split(/\s+/);
    if (described.indexOf(tip.id) < 0) {
      trigger.setAttribute("aria-describedby", (described.join(" ") + " " + tip.id).trim());
    }
    tip.addEventListener("toggle", function (event) {
      var open = event.newState === "open";
      tip.dispatchEvent(new CustomEvent(open ? "ncss-tooltip-show" : "ncss-tooltip-hide", { bubbles: true }));
    });
    if (!nativeInterest && anchorSupport) {
      var name = "--ncss-tooltip-" + (++counter);
      trigger.style.setProperty("anchor-name", name);
      tip.style.setProperty("position-anchor", name);
    }
  }

  function place(trigger, tip) {
    if (anchorSupport) {
      return;
    }
    tip.setAttribute("data-ncss-tooltip-fallback", "");
    var gap = 6;
    var r = trigger.getBoundingClientRect();
    var t = tip.getBoundingClientRect();
    var top = r.top - t.height - gap;
    if (top < gap) {
      top = r.bottom + gap;
    }
    var left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(gap, Math.min(left, document.documentElement.clientWidth - t.width - gap));
    tip.style.top = Math.round(top) + "px";
    tip.style.left = Math.round(left) + "px";
  }

  function show(trigger, tip) {
    clearTimeout(hideTimer);
    if (openTip && openTip !== tip) {
      hide(true);
    }
    openTip = tip;
    openTrigger = trigger;
    if (!tip.matches(":popover-open")) {
      try { tip.showPopover(); } catch (e) { return; }
    }
    place(trigger, tip);
  }

  function hide(now) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    var tip = openTip;
    if (!tip) {
      return;
    }
    var run = function () {
      if (tip.matches(":popover-open")) {
        try { tip.hidePopover(); } catch (e) { /* bereits geschlossen */ }
      }
      if (openTip === tip) {
        openTip = null;
        openTrigger = null;
      }
    };
    if (now) {
      run();
    } else {
      hideTimer = setTimeout(run, HIDE_DELAY);
    }
  }

  function schedule(trigger) {
    var tip = tipFor(trigger);
    if (!tip) {
      return;
    }
    prepare(trigger, tip);
    if (nativeInterest) {
      return;
    }
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (openTip === tip) {
      return;
    }
    showTimer = setTimeout(function () { show(trigger, tip); }, SHOW_DELAY);
  }

  function triggerFrom(node) {
    return node && node.closest ? node.closest("[interestfor]") : null;
  }

  document.addEventListener("pointerover", function (event) {
    if (event.pointerType === "touch") {
      return;
    }
    var trigger = triggerFrom(event.target);
    if (trigger) {
      schedule(trigger);
      return;
    }
    // Zeiger auf dem offenen Tooltip selbst: offen halten (WCAG 1.4.13 "hoverable").
    if (openTip && openTip.contains(event.target)) {
      clearTimeout(hideTimer);
    }
  });
  document.addEventListener("pointerout", function (event) {
    if (nativeInterest || !openTip) {
      clearTimeout(showTimer);
      return;
    }
    var to = event.relatedTarget;
    if (to && (openTip.contains(to) || (openTrigger && openTrigger.contains(to)))) {
      return;
    }
    if (openTrigger && document.activeElement === openTrigger) {
      return;
    }
    clearTimeout(showTimer);
    hide(false);
  });
  document.addEventListener("focusin", function (event) {
    var trigger = triggerFrom(event.target);
    if (!trigger) {
      return;
    }
    var keyboard = true;
    try { keyboard = trigger.matches(":focus-visible"); } catch (e) { /* alter Browser */ }
    if (keyboard) {
      schedule(trigger);
    }
  });
  document.addEventListener("focusout", function (event) {
    if (!nativeInterest && openTrigger && openTrigger.contains(event.target)) {
      hide(true);
    } else {
      clearTimeout(showTimer);
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && openTip && !nativeInterest) {
      hide(true);
    }
  });
  // Scrollen/Größenänderung verschiebt den Auslöser - nur der eigene Rechen-Pfad muss folgen.
  if (!anchorSupport) {
    window.addEventListener("scroll", function () {
      if (openTip && openTrigger) {
        place(openTrigger, openTip);
      }
    }, { passive: true, capture: true });
  }
})();
