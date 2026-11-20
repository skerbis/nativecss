// ncss-Website (nicht Teil der Bibliothek): Handbuch-Seite "Icons".
// 1. Kern-Icon-Raster: Klick kopiert das Markup des Icons.
// 2. Sprite-Baukasten: alle Phosphor-Icons durchsuchen (Index vendor/phosphor/index.json
//    wird erst geladen, wenn der Baukasten in Sichtweite kommt oder das Suchfeld den
//    Fokus bekommt), auswählen, Stärke wählen, Sprite als Datei herunterladen, Markup
//    bzw. CLI-Aufruf kopieren. Erzeugt dieselben Sprites wie tools/icons/sprite.mjs
//    (gemeinsamer Kern tools/icons/sprite-core.mjs).
// Der Import-Pfad löst relativ zu DIESER Datei auf (demo/assets/js/ -> Repo-Wurzel).
import { WEIGHTS, fileBase, toSymbol, buildSprite } from "../../../tools/icons/sprite-core.mjs";

const de = (document.documentElement.lang || "").startsWith("de");
const T = de
  ? {
      copy: "Markup kopieren",
      copied: (s) => `Kopiert: ${s}`,
      copyFail: "Kopieren nicht möglich - bitte den Code markieren.",
      loading: "Lade Icon-Verzeichnis …",
      loadFail: "Icon-Verzeichnis konnte nicht geladen werden.",
      all: (n) => `${n} Icons`,
      hits: (n, shown) => (n === 0 ? "Keine Treffer" : n > shown ? `${n} Treffer, ${shown} angezeigt` : `${n} Treffer`),
      more: "Mehr anzeigen",
      selected: (n) => `Auswahl (${n})`,
      none: "Noch nichts ausgewählt - Icons oben anklicken.",
      remove: (n) => `${n} entfernen`,
      built: (n, kb) => `Sprite mit ${n} Icon${n === 1 ? "" : "s"} erstellt (${kb} KB).`,
      buildFail: "Sprite konnte nicht erstellt werden.",
      cleared: "Auswahl geleert.",
    }
  : {
      copy: "Copy markup",
      copied: (s) => `Copied: ${s}`,
      copyFail: "Copying is not possible - please select the code.",
      loading: "Loading icon index …",
      loadFail: "The icon index could not be loaded.",
      all: (n) => `${n} icons`,
      hits: (n, shown) => (n === 0 ? "No matches" : n > shown ? `${n} matches, ${shown} shown` : `${n} matches`),
      more: "Show more",
      selected: (n) => `Selection (${n})`,
      none: "Nothing selected yet - click icons above.",
      remove: (n) => `Remove ${n}`,
      built: (n, kb) => `Sprite with ${n} icon${n === 1 ? "" : "s"} created (${kb} KB).`,
      buildFail: "The sprite could not be created.",
      cleared: "Selection cleared.",
    };

async function copyText(text, status) {
  try {
    await navigator.clipboard.writeText(text);
    if (status) status.textContent = T.copied(text.length > 80 ? text.slice(0, 77) + "…" : text);
    return true;
  } catch {
    if (status) status.textContent = T.copyFail;
    return false;
  }
}

/* --- 1. Kern-Icons: Kachel = Kopier-Knopf ------------------------------------------- */

const copyStatus = document.getElementById("icons-copy-status");
for (const li of document.querySelectorAll("[data-icons-copy]")) {
  const name = li.getAttribute("data-icons-copy");
  const markup = `<span class="ncss-icon ncss-icon-${name}" aria-hidden="true"></span>`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "demo-icons-tile";
  button.append(...li.childNodes);
  const hint = document.createElement("span");
  hint.className = "ncss-visually-hidden";
  hint.textContent = " - " + T.copy;
  button.append(hint);
  button.addEventListener("click", () => copyText(markup, copyStatus));
  li.append(button);
}

/* --- 2. Sprite-Baukasten ------------------------------------------------------------- */

const root = document.querySelector("[data-icons-picker]");
if (root) initPicker(root);

function initPicker(root) {
  const base = new URL(root.getAttribute("data-icons-base"), document.baseURI).href;
  const $ = (sel) => root.querySelector(sel);
  const search = $("[data-picker-search]");
  const results = $("[data-picker-results]");
  const count = $("[data-picker-count]");
  const more = $("[data-picker-more]");
  const selection = $("[data-picker-selection]");
  const selTitle = $("[data-picker-selection-title]");
  const empty = $("[data-picker-empty]");
  const download = $("[data-picker-download]");
  const copyMarkup = $("[data-picker-copy]");
  const clear = $("[data-picker-clear]");
  const markupOut = $("[data-picker-markup]");
  const cliOut = $("[data-picker-cli]");
  const status = $("[data-picker-status]");
  const PAGE = 96;

  let index = null;
  let loading = null;
  let weight = "regular";
  let limit = PAGE;
  let matches = [];
  const picked = []; // Namen in Auswahl-Reihenfolge

  // Ohne JS bleibt der Baukasten verborgen, stattdessen steht der CLI-Hinweis da.
  root.hidden = false;
  document.querySelectorAll("[data-icons-picker-fallback]").forEach((el) => (el.hidden = true));

  function loadIndex() {
    if (loading) return loading;
    count.textContent = T.loading;
    loading = fetch(base + "index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        index = json.icons.map(([name, tags]) => ({ name, words: (name.replace(/-/g, " ") + " " + tags).split(" ") }));
        filter();
      })
      .catch(() => {
        count.textContent = T.loadFail;
        loading = null;
      });
    return loading;
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        loadIndex();
      }
    }, { rootMargin: "300px" });
    io.observe(root);
  } else {
    loadIndex();
  }
  search.addEventListener("focus", loadIndex);

  // Jeder Suchbegriff muss passen: Teil des Namens oder Anfang eines Tags.
  // Reihenfolge: Name beginnt mit der Suche, Name enthält sie, nur Tag-Treffer.
  function filter() {
    if (!index) return;
    const q = search.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) {
      matches = index;
    } else {
      const scored = [];
      for (const icon of index) {
        if (!terms.every((t) => icon.name.includes(t) || icon.words.some((w) => w.startsWith(t)))) continue;
        const score = icon.name.startsWith(q) ? 0 : icon.name.includes(terms[0]) ? 1 : 2;
        scored.push([score, icon]);
      }
      scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
      matches = scored.map((s) => s[1]);
    }
    limit = PAGE;
    renderResults();
  }

  function iconEl(name) {
    const el = document.createElement("ncss-icon");
    el.setAttribute("name", name);
    el.setAttribute("weight", weight);
    el.setAttribute("data-ncss-icon-path", base);
    return el;
  }

  function renderResults() {
    const shown = matches.slice(0, limit);
    const frag = document.createDocumentFragment();
    for (const { name } of shown) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.name = name;
      b.setAttribute("aria-pressed", picked.includes(name) ? "true" : "false");
      const label = document.createElement("span");
      label.textContent = name;
      b.append(iconEl(name), label);
      li.append(b);
      frag.append(li);
    }
    results.replaceChildren(frag);
    more.hidden = matches.length <= limit;
    count.textContent = search.value.trim() ? T.hits(matches.length, shown.length) : T.all(matches.length);
  }

  function renderSelection() {
    selTitle.textContent = T.selected(picked.length);
    empty.hidden = picked.length > 0;
    const frag = document.createDocumentFragment();
    for (const name of picked) {
      const li = document.createElement("li");
      li.className = "demo-picker-chip";
      const label = document.createElement("span");
      label.textContent = fileBase(name, weight);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.dataset.remove = name;
      rm.setAttribute("aria-label", T.remove(name));
      const x = document.createElement("span");
      x.className = "ncss-icon ncss-icon-close";
      x.setAttribute("aria-hidden", "true");
      rm.append(x);
      li.append(iconEl(name), label, rm);
      frag.append(li);
    }
    selection.replaceChildren(frag);
    download.disabled = copyMarkup.disabled = clear.disabled = picked.length === 0;

    const ids = picked.length ? picked.map((n) => fileBase(n, weight)) : [fileBase("house", weight)];
    markupOut.textContent = ids
      .map((id) => `<svg class="ncss-icon-sprite" aria-hidden="true"><use href="icons.svg#${id}"></use></svg>`)
      .join("\n");
    cliOut.textContent =
      "node tools/icons/sprite.mjs " + (picked.length ? picked.join(" ") : "house") +
      " --weight=" + weight + " --out=icons.svg";
    if (window.Prism && typeof window.Prism.highlightElement === "function") {
      window.Prism.highlightElement(markupOut);
    }
  }

  function toggle(name) {
    const i = picked.indexOf(name);
    if (i >= 0) picked.splice(i, 1);
    else picked.push(name);
    const btn = results.querySelector(`button[data-name="${name}"]`);
    if (btn) btn.setAttribute("aria-pressed", i >= 0 ? "false" : "true");
    renderSelection();
  }

  let timer;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => (index ? filter() : loadIndex()), 150);
  });
  // Enter im Suchfeld soll kein Formular abschicken (es gibt keins) - nur filtern.
  search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      filter();
    }
  });

  results.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-name]");
    if (b) toggle(b.dataset.name);
  });
  selection.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-remove]");
    if (!b) return;
    const li = b.closest("li");
    const next = li.nextElementSibling || li.previousElementSibling;
    const nextName = next && next.querySelector("button[data-remove]")?.dataset.remove;
    toggle(b.dataset.remove);
    // Fokus nicht im Nichts verlieren: nächster Chip, sonst das Suchfeld.
    const target = nextName ? selection.querySelector(`button[data-remove="${nextName}"]`) : search;
    target.focus();
  });
  more.addEventListener("click", () => {
    const first = limit;
    limit += PAGE;
    renderResults();
    results.querySelectorAll("button")[first]?.focus();
  });

  for (const radio of root.querySelectorAll("[data-picker-weight]")) {
    radio.addEventListener("change", () => {
      if (!radio.checked || !WEIGHTS.includes(radio.value)) return;
      weight = radio.value;
      root.querySelectorAll("ncss-icon").forEach((el) => el.setAttribute("weight", weight));
      renderSelection();
    });
  }

  clear.addEventListener("click", () => {
    picked.length = 0;
    results.querySelectorAll('button[aria-pressed="true"]').forEach((b) => b.setAttribute("aria-pressed", "false"));
    renderSelection();
    status.textContent = T.cleared;
    search.focus();
  });

  copyMarkup.addEventListener("click", () => copyText(markupOut.textContent, status));

  download.addEventListener("click", async () => {
    try {
      const symbols = await Promise.all(
        picked.map(async (name) => {
          const id = fileBase(name, weight);
          const res = await fetch(`${base}${weight}/${id}.svg`);
          if (!res.ok) throw new Error(id);
          return toSymbol(await res.text(), id);
        })
      );
      const sprite = buildSprite(symbols);
      const url = URL.createObjectURL(new Blob([sprite], { type: "image/svg+xml" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "icons.svg";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = T.built(symbols.length, (sprite.length / 1024).toLocaleString(de ? "de" : "en", { maximumFractionDigits: 1, minimumFractionDigits: 1 }));
    } catch {
      status.textContent = T.buildFail;
    }
  });

  more.textContent = T.more;
  renderSelection();
}
