/**
 * ncss - AJAX-Modal-Router (opt-in, reines JS, kein eigenes CSS-File - nutzt ein
 * normales .ncss-modal, siehe components/modal.css, plus ggf. eine der dortigen
 * Einblendvarianten --slide-up/--slide-down/--zoom).
 *
 * Trigger-Links behalten ihr echtes href (Progressive-Enhancement-Fallback - ohne
 * JS/bei Fehler navigiert der Link ganz normal zur eigenständigen Zielseite) und
 * bekommen zusätzlich `data-modal-router-trigger="#idDesDialogs"`. Klick lädt die
 * Zielseite per fetch() nach, extrahiert daraus einen Ausschnitt (Standard-Selektor
 * "main", überschreibbar über `data-modal-router-content` auf dem <dialog>) und
 * zeigt ihn im Modal - die URL wandert dabei per history.pushState() mit, das Modal
 * bleibt dadurch verlink-/teilbar (Adressleiste zeigt die echte Ziel-URL, ohne dass
 * ein echter Seitenwechsel stattfindet). Browser-Zurück und ein erneuter Aufruf
 * derselben URL (Reload, oder ein bereits im DOM registrierter Trigger, dessen href
 * zur aktuellen Adresse passt) öffnen/schließen das Modal passend dazu.
 *
 * Markup:
 * <a href="/leistungen/druck/" data-modal-router-trigger="#ajaxModal">Mehr erfahren</a>
 * ...
 * <dialog id="ajaxModal" class="ncss-modal ncss-modal--slide-up" data-modal-router
 *         data-modal-router-content="main" data-modal-router-home="/leistungen/">
 *   <button type="button" class="ncss-dialog-close" command="close" commandfor="ajaxModal"
 *           aria-label="Schließen">&times;</button>
 *   <div class="ncss-modal-body" data-modal-router-target></div>
 * </dialog>
 *
 * Optionale Attribute auf dem <dialog>: `data-modal-router-content` (CSS-Selektor,
 * welcher Ausschnitt der nachgeladenen Seite übernommen wird, Default "main"),
 * `data-modal-router-home` (URL, zu der die Adressleiste beim Schließen zurückkehrt,
 * Default "/"), `data-modal-router-loading`/`-error` (eigene Lade-/Fehlertexte).
 *
 * Damit eine Ziel-URL auch GANZ FRISCH (kein vorheriger Klick, kein pushState in
 * dieser Sitzung - eingegebene Adresse, Lesezeichen, Reload) tatsächlich als
 * geöffnetes Modal ankommt, statt nur als eigenständige Seite: dieselbe Datei auf
 * der EIGENSTÄNDIGEN Zielseite einbinden UND dort zusätzlich
 * <meta name="ncss-modal-router-redirect" content="/listing-seite/"> setzen. Eine
 * Seite ohne eigenes [data-modal-router]-Dialog-Element gilt als "Zielseite" -
 * findet sie dieses Meta-Tag, springt sie beim Laden per location.replace() sofort
 * zur Listing-Seite zurück (?ncssModal=<eigener Pfad> angehängt), die IHRERSEITS
 * beim Laden diesen Parameter erkennt, das passende Modal öffnet und die Adresse
 * per history.replaceState() wieder auf die saubere Ziel-URL zurückschreibt - der
 * Query-Parameter selbst taucht dadurch nie sichtbar in der Adressleiste auf. Ein
 * echter fetch() (siehe openModal unten) lädt die Zielseite nur als Text/DOMParser-
 * Baum, führt ihr Script NIE aus - der Redirect greift ausschließlich bei einer
 * ECHTEN Navigation, kein Sonderfall zwischen den beiden Aufrufarten nötig. Bewusst
 * ein kurzes Aufblitzen der rohen Zielseite vor dem Rücksprung in Kauf genommen
 * (rein clientseitig, ohne Server-Mitwirkung nicht vermeidbar) - ohne dieses
 * Meta-Tag bleibt eine Zielseite einfach für sich stehen (reiner
 * Progressive-Enhancement-Fallback, kein Rücksprung).
 */
(function () {
  "use strict";

  var REDIRECT_PARAM = "ncssModal";

  var cache = Object.create(null);
  var triggersByPath = Object.create(null);

  function resolve(href) {
    return new URL(href, location.href);
  }

  function sameOrigin(url) {
    return url.origin === location.origin;
  }

  function getDialog(trigger) {
    var sel = trigger.getAttribute("data-modal-router-trigger");
    return sel ? document.querySelector(sel) : null;
  }

  function getTarget(dialog) {
    return dialog.querySelector("[data-modal-router-target]") || dialog;
  }

  function registerTriggers() {
    var triggers = document.querySelectorAll("[data-modal-router-trigger]");
    triggers.forEach(function (trigger) {
      var href = trigger.getAttribute("href");
      if (href) {
        var url = resolve(href);
        if (sameOrigin(url)) {
          triggersByPath[url.pathname] = trigger;
        }
      }
      trigger.addEventListener("click", onTriggerClick);
    });
  }

  function onTriggerClick(event) {
    /* Modifier-Klicks (neuer Tab, Mittelklick usw.) unangetastet lassen - das
       Trigger-Element bleibt ein echter Link, kein Button-Ersatz. */
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    var trigger = event.currentTarget;
    var href = trigger.getAttribute("href");
    var dialog = getDialog(trigger);
    if (!dialog || !href || !sameOrigin(resolve(href))) {
      return;
    }
    event.preventDefault();
    openModal(dialog, href);
  }

  function openModal(dialog, href) {
    var target = getTarget(dialog);
    var url = resolve(href);
    var selector = dialog.getAttribute("data-modal-router-content") || "main";

    dialog.dataset.modalRouterUrl = href;
    target.setAttribute("aria-live", "polite");

    if (cache[href]) {
      target.innerHTML = cache[href];
      target.removeAttribute("aria-busy");
    } else {
      target.setAttribute("aria-busy", "true");
      target.innerHTML = '<p class="ncss-text-muted">' + (dialog.getAttribute("data-modal-router-loading") || "Lädt …") + "</p>";
    }

    if (typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    }

    if (location.pathname !== url.pathname) {
      history.pushState({ modalRouterHref: href }, "", href);
    }

    if (cache[href]) {
      return;
    }

    fetch(href, { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var content = doc.querySelector(selector);
        var markup = content ? content.innerHTML : html;
        cache[href] = markup;
        /* Zwischenzeitlich könnte ein SCHNELLERER zweiter Klick (anderer Trigger)
           dasselbe Modal bereits mit anderem Ziel weiterverwendet haben - nur
           anwenden, wenn die Antwort noch zur aktuell angezeigten URL passt. */
        if (dialog.dataset.modalRouterUrl === href) {
          target.removeAttribute("aria-busy");
          target.innerHTML = markup;
        }
      })
      .catch(function () {
        if (dialog.dataset.modalRouterUrl === href) {
          target.removeAttribute("aria-busy");
          target.innerHTML =
            '<p class="ncss-text-muted">' +
            (dialog.getAttribute("data-modal-router-error") || "Inhalt konnte nicht geladen werden.") +
            '</p><p><a href="' + href + '">' + href + "</a></p>";
        }
      });
  }

  function closeModal(dialog) {
    var href = dialog.dataset.modalRouterUrl;
    delete dialog.dataset.modalRouterUrl;
    if (href && location.pathname === resolve(href).pathname) {
      var home = dialog.getAttribute("data-modal-router-home") || "/";
      history.pushState({}, "", home);
    }
  }

  function syncToLocation() {
    var params = new URLSearchParams(location.search);
    var redirectedPath = params.get(REDIRECT_PARAM);
    var pathToMatch = redirectedPath || location.pathname;
    var trigger = triggersByPath[pathToMatch];

    document.querySelectorAll("[data-modal-router]").forEach(function (dialog) {
      if (trigger && getDialog(trigger) === dialog) {
        if (!dialog.open) {
          openModal(dialog, trigger.getAttribute("href"));
        }
      } else if (dialog.open) {
        dialog.close();
      }
    });

    /* Der Query-Parameter hat seinen Zweck erfüllt (Modal ist offen bzw. es gab
       keinen passenden Trigger) - saubere Ziel-URL ohne Parameter herstellen,
       ohne einen weiteren History-Eintrag zu erzeugen. */
    if (redirectedPath) {
      var cleanUrl = trigger ? trigger.getAttribute("href") : redirectedPath;
      history.replaceState({}, "", cleanUrl);
    }
  }

  /* Zielseite ohne eigenen Modal-Router-Dialog + Redirect-Meta gesetzt - sofort
     zurück zur Listing-Seite springen, siehe Doku-Kommentar oben. Läuft VOR
     registerTriggers()/syncToLocation() unten, weil auf einer solchen Seite
     ohnehin nichts von beidem etwas zu tun hat. */
  function maybeRedirectToListing() {
    if (document.querySelector("[data-modal-router]")) {
      return false;
    }
    var meta = document.querySelector('meta[name="ncss-modal-router-redirect"]');
    if (!meta) {
      return false;
    }
    var listing = resolve(meta.getAttribute("content"));
    listing.searchParams.set(REDIRECT_PARAM, location.pathname);
    location.replace(listing.href);
    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (maybeRedirectToListing()) {
      return;
    }

    registerTriggers();

    document.querySelectorAll("[data-modal-router]").forEach(function (dialog) {
      dialog.addEventListener("close", function () {
        closeModal(dialog);
      });
    });

    /* Reload/Direktaufruf einer per pushState gesetzten URL innerhalb dieser
       Sitzung, oder ein Rücksprung von einer Zielseite (siehe
       maybeRedirectToListing) - Modal automatisch passend öffnen. */
    syncToLocation();
  });

  window.addEventListener("popstate", syncToLocation);
})();
