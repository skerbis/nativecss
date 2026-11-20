/* NativeCSS-Rundgang, Kapitel "App-UI" (demo/showcase/app-ui*.html) - nur Demo-Logik:
   1. Filter-Chips (.ncss-tag[aria-pressed]) filtern eine Ticket-Liste; ohne Treffer
      erscheint ein .ncss-empty--compact mit role="status". Das Umschalten von
      aria-pressed ist laut Handbuch Sache der eigenen Filter-Logik - genau das hier.
   2. "Speichern"-Button zeigt kurz den Lade-Zustand (aria-busy + .ncss-spinner).
   Texte kommen aus data-Attributen im Markup (DE/EN). */
(() => {
  "use strict";

  /* --- 1. Filter-Chips ------------------------------------------------------------- */
  document.querySelectorAll("[data-demo-filterbox]").forEach((box) => {
    const chips = [...box.querySelectorAll("button[data-demo-filter]")];
    const items = [...box.querySelectorAll("[data-demo-ticket]")];
    const empty = box.querySelector("[data-demo-filter-empty]");
    const count = box.querySelector("[data-demo-filter-count]");
    const tpl = count ? count.dataset.template || "{n}/{total}" : "";

    const apply = () => {
      const active = chips.filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.demoFilter);
      let shown = 0;
      items.forEach((li) => {
        const tags = (li.dataset.demoTicket || "").split(/\s+/);
        const ok = active.every((a) => tags.includes(a));
        li.hidden = !ok;
        if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      if (count) count.textContent = tpl.replace("{n}", shown).replace("{total}", items.length);
    };

    chips.forEach((chip) => chip.addEventListener("click", () => {
      chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
      apply();
    }));
    box.querySelectorAll("[data-demo-filter-reset]").forEach((btn) => btn.addEventListener("click", () => {
      chips.forEach((c) => c.setAttribute("aria-pressed", "false"));
      apply();
      chips[0]?.focus();
    }));
    apply();
  });

  /* --- 2. Lade-Zustand im Button ----------------------------------------------------- */
  document.querySelectorAll("button[data-demo-save]").forEach((btn) => {
    const idle = btn.innerHTML;
    const status = document.getElementById(btn.dataset.demoSave);
    btn.addEventListener("click", () => {
      if (btn.getAttribute("aria-busy") === "true") return;
      btn.setAttribute("aria-busy", "true");
      btn.setAttribute("aria-disabled", "true");
      btn.innerHTML = '<span class="ncss-spinner ncss-spinner--sm" aria-hidden="true"></span> ';
      btn.append(btn.dataset.busyText || "…");
      if (status) status.textContent = "";
      setTimeout(() => {
        btn.innerHTML = idle;
        btn.removeAttribute("aria-busy");
        btn.removeAttribute("aria-disabled");
        if (status) status.textContent = btn.dataset.doneText || "";
      }, 1800);
    });
  });
})();
