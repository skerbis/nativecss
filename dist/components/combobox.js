/**
 * ncss - Combobox: opt-in JS-Enhancement für zwei native Muster mit unstylebarem Popup
 * (siehe combobox.css für die Begründung, warum reines CSS hier nicht reicht):
 *
 * 1. <input list="..."> + <datalist> -> filterbares custom Dropdown, Original-Element
 *    bleibt Werttyp (echtes <input>, kein Ersatz).
 * 2. <select class="ncss-select"> (nur auf Browsern OHNE "appearance: base-select") ->
 *    natives <select> bleibt der Werthalter, wird aber visuell + für Assistive Technology
 *    durch einen custom Trigger-Button + Listbox ersetzt (WAI-ARIA "Select-Only
 *    Combobox"-Muster: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), da die
 *    native Popup-Optik dort durch nichts erreichbar ist.
 *
 * Beides bewusst NUR als Enhancement, nie als Ersatz der Funktionalität: ohne dieses
 * Script (oder wenn JS fehlschlägt) bleibt die volle native Basisversion nutzbar.
 *
 * Einbindung (nur auf Seiten mit <input list>/<datalist> oder <select> nötig):
 *   <script src="components/combobox.js" defer></script>
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

  function fireEvent(el, name) {
    el.dispatchEvent(new Event(name, { bubbles: true }));
  }

  /* --- Gemeinsame Dropdown-Mechanik (Positionierung, Tastatur-Navigation, Öffnen/
     Schließen) - von beiden Fällen (Input+Datalist, Select) identisch genutzt, nur die
     Optionsquelle und was beim Auswählen passiert unterscheidet sich. */
  function createDropdown(wrapper, control, idPrefix) {
    var chevron = document.createElement("span");
    chevron.className = "ncss-combobox-chevron";
    chevron.setAttribute("aria-hidden", "true");
    wrapper.appendChild(chevron);

    var listboxId = idPrefix + "-listbox";
    var listbox = document.createElement("ul");
    listbox.className = "ncss-combobox-list";
    listbox.id = listboxId;
    listbox.setAttribute("role", "listbox");
    wrapper.appendChild(listbox);

    control.setAttribute("aria-controls", listboxId);
    control.setAttribute("aria-expanded", "false");

    var activeIndex = -1;
    var current = [];

    function isOpen() {
      return listbox.hasAttribute("data-open");
    }

    function close() {
      listbox.removeAttribute("data-open");
      control.setAttribute("aria-expanded", "false");
      control.removeAttribute("aria-activedescendant");
      activeIndex = -1;
    }

    function open() {
      if (!current.length) return;
      listbox.setAttribute("data-open", "true");
      control.setAttribute("aria-expanded", "true");
    }

    function setActive(index) {
      var items = listbox.querySelectorAll(".ncss-combobox-option");
      for (var i = 0; i < items.length; i++) {
        items[i].removeAttribute("data-active");
      }
      activeIndex = index;
      if (index >= 0 && items[index]) {
        items[index].setAttribute("data-active", "true");
        items[index].scrollIntoView({ block: "nearest" });
        control.setAttribute("aria-activedescendant", items[index].id);
      } else {
        control.removeAttribute("aria-activedescendant");
      }
    }

    function render(items, onSelect, selectedValue) {
      current = items;
      listbox.innerHTML = "";
      if (!items.length) {
        var empty = document.createElement("li");
        empty.className = "ncss-combobox-empty";
        empty.textContent = "Keine Treffer";
        listbox.appendChild(empty);
        return;
      }
      items.forEach(function (item, index) {
        var li = document.createElement("li");
        li.className = "ncss-combobox-option";
        li.setAttribute("role", "option");
        li.id = listboxId + "-opt-" + index;
        /* Reicher Options-Inhalt (Icon+Label, siehe appearance:base-select-Muster in
           select.css) wird per Kind-Element-Klon übernommen statt nur reinem Text -
           sonst würde der Firefox-/Fallback-Pfad ein <option><span>🍎</span><span>Apfel
           </span></option> zu "🍎Apfel" zusammenquetschen statt Icon+Label wie in
           unterstützenden Browsern nebeneinander darzustellen. Reine Text-Optionen (die
           Mehrheit) landen unverändert als einzelner Text-Knoten. */
        if (item.node && item.node.children && item.node.children.length) {
          for (var i = 0; i < item.node.childNodes.length; i++) {
            li.appendChild(item.node.childNodes[i].cloneNode(true));
          }
        } else {
          li.textContent = item.label;
        }
        if (selectedValue !== undefined && item.value === selectedValue) {
          li.setAttribute("aria-selected", "true");
        }
        li.addEventListener("mousedown", function (event) {
          event.preventDefault();
          onSelect(item, index);
        });
        listbox.appendChild(li);
      });
    }

    function moveActive(delta) {
      if (!isOpen()) {
        open();
        return;
      }
      var next = activeIndex + delta;
      next = Math.max(0, Math.min(next, current.length - 1));
      setActive(next);
    }

    return {
      listbox: listbox,
      isOpen: isOpen,
      open: open,
      close: close,
      render: render,
      moveActive: moveActive,
      getActiveIndex: function () {
        return activeIndex;
      },
      getCurrent: function () {
        return current;
      },
    };
  }

  /* --- Fall 1: <input list> + <datalist> ------------------------------------------------ */
  function enhanceInput(input) {
    if (input.hasAttribute("data-ncss-combobox")) return;
    var listId = input.getAttribute("list");
    if (!listId) return;
    var root = input.getRootNode();
    var datalist = root.getElementById ? root.getElementById(listId) : document.getElementById(listId);
    if (!datalist || datalist.tagName !== "DATALIST") return;

    var options = Array.prototype.slice.call(datalist.querySelectorAll("option")).map(function (opt) {
      var value = opt.getAttribute("value") || opt.textContent.trim();
      return { value: value, label: value };
    });

    input.setAttribute("data-ncss-combobox", "true");
    input.removeAttribute("list");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("autocomplete", "off");

    var wrapper = document.createElement("span");
    wrapper.className = "ncss-combobox";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var idPrefix = input.id || "ncss-combobox-" + Math.random().toString(36).slice(2, 8);
    var dropdown = createDropdown(wrapper, input, idPrefix);

    function filterAndRender() {
      var query = input.value.toLowerCase();
      var filtered = options.filter(function (opt) {
        return opt.label.toLowerCase().indexOf(query) !== -1;
      });
      dropdown.render(filtered, function (item) {
        input.value = item.value;
        dropdown.close();
        fireEvent(input, "input");
        fireEvent(input, "change");
      });
    }

    input.addEventListener("input", function () {
      filterAndRender();
      dropdown.open();
    });
    input.addEventListener("focus", function () {
      filterAndRender();
      dropdown.open();
    });
    input.addEventListener("blur", function () {
      window.setTimeout(dropdown.close, 100);
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        dropdown.moveActive(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        dropdown.moveActive(-1);
      } else if (event.key === "Enter") {
        if (dropdown.isOpen() && dropdown.getActiveIndex() >= 0) {
          event.preventDefault();
          var item = dropdown.getCurrent()[dropdown.getActiveIndex()];
          input.value = item.value;
          dropdown.close();
          fireEvent(input, "input");
          fireEvent(input, "change");
        }
      } else if (event.key === "Escape") {
        dropdown.close();
      }
    });
  }

  /* --- Fall 2: <select> (nur ohne native appearance:base-select-Unterstützung) --------- */
  function enhanceSelect(select) {
    if (select.hasAttribute("data-ncss-combobox")) return;
    if (window.CSS && CSS.supports && CSS.supports("appearance", "base-select")) return;

    var options = Array.prototype.slice.call(select.options).map(function (opt) {
      return { value: opt.value, label: opt.textContent.trim(), node: opt };
    });
    if (!options.length) return;

    select.setAttribute("data-ncss-combobox", "true");
    select.setAttribute("aria-hidden", "true");
    select.tabIndex = -1;
    select.style.position = "absolute";
    select.style.opacity = "0";
    select.style.pointerEvents = "none";
    select.style.width = "1px";
    select.style.height = "1px";

    var selectWrapper = select.parentElement && select.parentElement.classList.contains("ncss-select-wrapper") ? select.parentElement : null;

    var wrapper = document.createElement("span");
    wrapper.className = "ncss-combobox";
    var insertBefore = selectWrapper || select;
    insertBefore.parentNode.insertBefore(wrapper, insertBefore);
    wrapper.appendChild(insertBefore);

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ncss-input ncss-combobox-trigger";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-autocomplete", "none");
    wrapper.appendChild(trigger);

    var idPrefix = select.id || "ncss-combobox-" + Math.random().toString(36).slice(2, 8);
    var dropdown = createDropdown(wrapper, trigger, idPrefix);

    function syncTrigger() {
      var current = options.filter(function (o) {
        return o.value === select.value;
      })[0];
      trigger.innerHTML = "";
      if (!current) return;
      /* Dieselbe Klon-Logik wie in render() - der Trigger-Button ist das Fallback-
         Äquivalent zu <selectedcontent>, soll also denselben reichen Inhalt (Icon+Label)
         zeigen wie die aktuell gewählte Option in der Liste. */
      if (current.node && current.node.children && current.node.children.length) {
        for (var i = 0; i < current.node.childNodes.length; i++) {
          trigger.appendChild(current.node.childNodes[i].cloneNode(true));
        }
      } else {
        trigger.textContent = current.label;
      }
    }
    syncTrigger();

    function renderList() {
      dropdown.render(
        options,
        function (item) {
          select.value = item.value;
          syncTrigger();
          dropdown.close();
          fireEvent(select, "change");
          trigger.focus();
        },
        select.value
      );
    }

    trigger.addEventListener("click", function () {
      if (dropdown.isOpen()) {
        dropdown.close();
        return;
      }
      renderList();
      dropdown.open();
      var selectedIndex = options.map(function (o) { return o.value; }).indexOf(select.value);
      if (selectedIndex >= 0) {
        var items = dropdown.listbox.querySelectorAll(".ncss-combobox-option");
        items.forEach(function (item, i) {
          if (i === selectedIndex) item.setAttribute("data-active", "true");
        });
      }
    });
    trigger.addEventListener("blur", function () {
      window.setTimeout(dropdown.close, 100);
    });
    trigger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!dropdown.isOpen()) renderList();
        dropdown.moveActive(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!dropdown.isOpen()) renderList();
        dropdown.moveActive(-1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (dropdown.isOpen() && dropdown.getActiveIndex() >= 0) {
          var item = dropdown.getCurrent()[dropdown.getActiveIndex()];
          select.value = item.value;
          syncTrigger();
          dropdown.close();
          fireEvent(select, "change");
        } else {
          renderList();
          dropdown.open();
        }
      } else if (event.key === "Escape") {
        dropdown.close();
      }
    });
  }

  deepQueryAll("input[list]").forEach(enhanceInput);
  deepQueryAll("select.ncss-select").forEach(enhanceSelect);
})();
