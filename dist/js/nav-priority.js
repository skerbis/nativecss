/**
 * ncss - <ncss-nav-priority>: verschiebt Navigationspunkte, die nicht mehr in eine
 * Zeile passen, automatisch in ein "Mehr"-Dropdown (siehe components/nav-priority.css
 * für Markup/Einbindung). Reines Light-DOM-Custom-Element (kein Shadow Root - anders
 * als <ncss-container> - das Nav-Markup soll ganz normal von der Seiten-eigenen
 * ncss.css/theme.css getroffen werden, keine Isolation gewünscht).
 *
 * Rechnet bei JEDEM Layout-Durchlauf von einem sauberen Ausgangszustand neu (alle
 * echten Punkte zurück in die Hauptliste, DANN neu verteilen), statt inkrementell zu
 * verschieben - robuster gegen akkumulierte Fehlzustände über mehrere Resizes hinweg,
 * für eine normale Nav-Punktzahl (Dutzende, nicht Tausende) performant genug.
 *
 * Läuft NUR oberhalb der nav-collapse-Schwelle (siehe components/nav.css) - per
 * matchMedia gegen DIESELBE Bedingung wie nav.css' eigene Media Query, damit beide
 * Mechanismen exakt an derselben Breite umschalten. Unterhalb (Off-Canvas-Ansicht)
 * werden alle zuvor verschobenen Punkte zurückgeholt - die vertikale Liste zeigt dort
 * ohnehin alle Punkte per Scroll, kein Kollabieren nötig.
 */
(function () {
  "use strict";

  var MOBILE_QUERY = "(max-width: 63.99rem)";

  function collectItems(list, moreItem) {
    return Array.prototype.filter.call(list.children, function (el) {
      return el !== moreItem;
    });
  }

  customElements.define(
    "ncss-nav-priority",
    class extends HTMLElement {
      connectedCallback() {
        this._list = this.querySelector(":scope > .ncss-nav-list");
        if (!this._list) {
          return;
        }
        this._items = collectItems(this._list, null);
        this._moreItem = null;
        this._moreSummary = null;
        this._moreSubmenu = null;

        this._mq = window.matchMedia(MOBILE_QUERY);
        this._onChange = this._layout.bind(this);
        this._mq.addEventListener("change", this._onChange);

        this._ro = new ResizeObserver(this._onChange);
        this._ro.observe(this);

        this._layout();
      }

      disconnectedCallback() {
        if (this._ro) {
          this._ro.disconnect();
        }
        if (this._mq) {
          this._mq.removeEventListener("change", this._onChange);
        }
      }

      /* Öffentlich, für Seiten, die ihre Nav-Punkte zur Laufzeit ändern (z.B. eine
         SPA-Route) - Punkte-Liste neu einlesen und sofort neu verteilen. Nicht
         automatisch per MutationObserver, um keine Layout-Arbeit bei JEDER
         DOM-Änderung auszulösen (z.B. nur ein aria-current-Wechsel). */
      refresh() {
        if (!this._list) {
          return;
        }
        this._items = collectItems(this._list, this._moreItem);
        this._layout();
      }

      _ensureMoreItem() {
        if (this._moreItem) {
          return;
        }
        var li = document.createElement("li");
        li.className = "ncss-nav-item ncss-nav-more";
        var details = document.createElement("details");
        details.className = "ncss-nav-dropdown";
        var summary = document.createElement("summary");
        summary.setAttribute("aria-label", this.getAttribute("more-label") || "Weitere Punkte");
        var submenu = document.createElement("ul");
        submenu.className = "ncss-nav-submenu";
        details.appendChild(summary);
        details.appendChild(submenu);
        li.appendChild(details);
        this._moreItem = li;
        this._moreSummary = summary;
        this._moreSubmenu = submenu;
      }

      _layout() {
        if (!this._items || !this._items.length) {
          return;
        }
        /* Während innerhalb der Nav etwas fokussiert ist (offenes Dropdown, Tastatur-
           Navigation) nicht umsortieren - würde den Fokus verlieren. Nächster
           Resize/Media-Wechsel holt die Neuberechnung nach. */
        if (this.contains(document.activeElement) && document.activeElement !== document.body) {
          return;
        }

        if (this._moreSubmenu) {
          this._moreSubmenu.replaceChildren();
        }
        if (this._moreItem && this._moreItem.isConnected) {
          this._moreItem.remove();
        }
        for (var i = 0; i < this._items.length; i++) {
          var dropdown = this._items[i].querySelector(":scope > .ncss-nav-dropdown");
          if (dropdown) {
            dropdown.classList.remove("ncss-nav-dropdown--nested");
          }
          this._list.appendChild(this._items[i]);
        }

        if (this._mq.matches) {
          return;
        }

        var available = this.getBoundingClientRect().width;
        if (!available) {
          return;
        }

        var listStyle = getComputedStyle(this._list);
        var gap = parseFloat(listStyle.columnGap || listStyle.gap) || 0;

        var fitCount = this._items.length;
        var total = 0;
        for (var j = 0; j < this._items.length; j++) {
          total += this._items[j].getBoundingClientRect().width + (j > 0 ? gap : 0);
          if (total > available) {
            fitCount = j;
            break;
          }
        }
        if (fitCount >= this._items.length) {
          return;
        }

        this._ensureMoreItem();
        this._list.appendChild(this._moreItem);

        while (fitCount > 0) {
          var withMore = this._moreItem.getBoundingClientRect().width + gap;
          for (var k = 0; k < fitCount; k++) {
            withMore += this._items[k].getBoundingClientRect().width + (k > 0 ? gap : 0);
          }
          if (withMore <= available) {
            break;
          }
          fitCount--;
        }

        var order = this._items.slice();
        var currentIndex = -1;
        for (var m = 0; m < order.length; m++) {
          if (order[m].querySelector('[aria-current="page"]')) {
            currentIndex = m;
            break;
          }
        }
        if (currentIndex >= fitCount && fitCount > 0) {
          var tmp = order[fitCount - 1];
          order[fitCount - 1] = order[currentIndex];
          order[currentIndex] = tmp;
        }

        var overflow = order.slice(fitCount);
        if (!overflow.length) {
          this._moreItem.remove();
          return;
        }

        var visible = order.slice(0, fitCount);
        for (var v = 0; v < visible.length; v++) {
          this._list.insertBefore(visible[v], this._moreItem);
        }
        for (var o = 0; o < overflow.length; o++) {
          var nested = overflow[o].querySelector(":scope > .ncss-nav-dropdown");
          if (nested) {
            nested.classList.add("ncss-nav-dropdown--nested");
          }
          this._moreSubmenu.appendChild(overflow[o]);
        }

        var moreText = this.getAttribute("more-text") || "Mehr";
        this._moreSummary.textContent = moreText + " (" + overflow.length + ")";
      }
    }
  );
})();
