/**
 * NativeCSS - Regelwerk des UIkit-3-Konverters. Quelle der Wahrheit für die Zuordnungen:
 * docs/de/uikit-migration.html (Handbuch) - dort steht das WARUM, hier das WIE.
 *
 * Grundsatz (wie im Handbuch): ncss ist KEIN Klassen-Shim. Rein optische Klassen werden
 * umbenannt, JS-Komponenten auf native Elemente umgebaut (<dialog> + command/commandfor,
 * <details name>, .ncss-grid ohne Breakpoints). Was sich nicht sicher übertragen lässt
 * (Tabs/Switcher, Slider, Dropdowns außerhalb der Navbar, Sticky-Optionen, Parallax ...),
 * bleibt UNVERÄNDERT stehen und landet als "warning" mit Zeilennummer im Bericht - nichts
 * verschwindet stillschweigend. llms/hooks/check-classes.mjs findet die Reste danach wieder.
 *
 * Aufbau: transforms laufen je Start-Tag in Dokument-Reihenfolge (Eltern vor Kindern) und
 * sehen noch die originalen uk-Namen; finalize() bildet danach die restlichen Klassen über
 * die Tabelle `classes` ab und meldet, was übrig bleibt.
 */

import { parseOpts, isDynamic, MARK } from "./core.js";
import { ncssIcons, faIcons } from "./icon-map.js";

/* --------------------------------------------------------------------------
   Hilfen
   -------------------------------------------------------------------------- */

const BP = "(?:@(?:s|m|l|xl))?";
const appendStyle = (h, decl) => {
  const style = (h.get("style") ?? "").trim();
  h.set("style", style ? `${style.replace(/;?\s*$/, ";")} ${decl}` : decl);
};
const isTrigger = (h) => h.name === "a" || h.name === "button";
const toButton = (h) => {
  if (h.name === "a") {
    h.retag("button");
    h.remove("href");
    h.setIfMissing("type", "button");
  } else if (h.name === "button") h.setIfMissing("type", "button");
};
const closeIcon = '<span class="ncss-icon ncss-icon-close" aria-hidden="true"></span>';
const dialogOf = (h) => h.closest((p) => !!(p.uk("modal") || p.uk("offcanvas")) || p.marked("dialog"));

/** Icon-Markup für einen UIkit-Iconnamen. */
function iconHtml(name, h) {
  if (ncssIcons[name]) return { html: `<span class="ncss-icon ncss-icon-${ncssIcons[name]}" aria-hidden="true"></span>`, classes: `ncss-icon ncss-icon-${ncssIcons[name]}` };
  if (faIcons[name]) {
    h.require("Font Awesome (vendor/fontawesome/css/all.min.css bzw. eigene Kopie)", `UIkit-Icons ohne ncss-Entsprechung werden als Font-Awesome-Klassen ausgegeben (z.B. "${name}" -> ${faIcons[name]}).`);
    return { html: `<i class="${faIcons[name]}" aria-hidden="true"></i>`, classes: faIcons[name] };
  }
  return null;
}

/** Klasse mit Breakpoint-Suffix -> Basis + Breakpoint. */
const bpSplit = (c) => { const m = c.match(/^(.*?)(?:@(s|m|l|xl))?$/); return { base: m[1], bp: m[2] ?? "" }; };
const BP_ORDER = { "": 0, s: 1, m: 2, l: 3, xl: 4 };

/** Größte Spaltenzahl aus uk-child-width-1-N(@bp) - "Desktop-Zielbild". */
function childColumns(list) {
  let best = null;
  for (const c of list) {
    const m = c.match(new RegExp(`^uk-child-width-(\\d)-(\\d)${BP}$`));
    if (m) { const n = Math.round(Number(m[2]) / Number(m[1])); if (best === null || n > best) best = n; }
  }
  return best;
}
const GRID_MIN = { 2: "20rem", 3: "16rem", 4: "12rem", 5: "10rem", 6: "8rem" };
const WIDTHS = new Set(["1-2", "1-3", "1-4", "1-5", "1-6", "2-3", "3-4"]);

/** Größte Bruch-Breite einer Kind-Klassenliste (uk-width-1-2@m ...). */
function widestFraction(list) {
  let best = null, bestBp = -1;
  for (const c of list) {
    const m = c.match(new RegExp(`^uk-width-(\\d-\\d|1-1|expand|auto)${BP}$`));
    if (!m) continue;
    const bp = BP_ORDER[bpSplit(c).bp];
    if (bp > bestBp) { bestBp = bp; best = m[1]; }
  }
  return best;
}

/* --------------------------------------------------------------------------
   Transforms (sehen die originalen uk-Namen)
   -------------------------------------------------------------------------- */

const transforms = [
  // <link>/<script> auf UIkit selbst
  (h) => {
    const src = h.get("src") ?? h.get("href") ?? "";
    if ((h.name === "script" || h.name === "link") && /uikit(?:-icons)?(?:\.min)?\.(?:js|css)/i.test(src)) {
      h.warn(`UIkit-Datei eingebunden (${src.split("/").pop()}) - durch ncss.css + theme.css ersetzen; JS nur je Komponente (js/command-fallback.js, js/lightbox.js ...).`);
    }
  },

  /* ---- Grid ------------------------------------------------------------- */
  (h) => {
    const attr = h.uk("grid");
    const isGrid = !!attr || h.hadClass("uk-grid");
    if (!isGrid) return;
    const opts = parseOpts(attr?.value);
    if (attr) h.ukRemove("grid");
    h.removeClass("uk-grid");
    const kids = h.children();
    const flex = kids.some((k) => k.origClasses().some((c) => /^uk-width-\d-\d/.test(c)));
    const cls = h.classes();
    if (flex) {
      h.addClass("ncss-flex-grid");
      kids.forEach((k) => k.mark("flexGridChild"));
      h.info("uk-grid mit uk-width-*-Kindern -> .ncss-flex-grid + .ncss-width-* (selbst-responsiv per @container, keine Breakpoint-Suffixe).");
    } else {
      const cols = childColumns(cls);
      if (cols === 1) { h.addClass("ncss-stack"); }
      else if (cls.some((c) => /^uk-child-width-auto/.test(c))) h.addClass("ncss-cluster");
      else {
        h.addClass("ncss-grid");
        if (cols && GRID_MIN[cols]) appendStyle(h, `--ncss-grid-min: ${GRID_MIN[cols]};`);
        if (cols && cls.some((c) => c.includes("@"))) h.info(`uk-child-width-*@...: Breakpoints entfallen - .ncss-grid bricht intrinsisch um (--ncss-grid-min ${GRID_MIN[cols] ?? ""} für max. ${cols} Spalten; nach dem längsten Inhalt justieren).`);
        if (cls.some((c) => /^uk-child-width-expand/.test(c))) h.info("uk-child-width-expand -> .ncss-grid (gleich breite Spalten, so viele wie passen).");
      }
    }
    h.setClasses(h.classes().filter((c) => !/^uk-child-width-/.test(c)));
    const gap = { "uk-grid-small": "ncss-gap-sm", "uk-grid-medium": "ncss-gap-md", "uk-grid-large": "ncss-gap-lg", "uk-grid-xsmall": "ncss-gap-sm" };
    for (const [from, to] of Object.entries(gap)) if (h.hasClass(from)) h.replaceClass(from, to);
    for (const c of ["uk-grid-column-small", "uk-grid-row-small", "uk-grid-column-medium", "uk-grid-row-medium", "uk-grid-column-large", "uk-grid-row-large"]) {
      if (h.hasClass(c)) { h.removeClass(c); h.info(`${c}: getrennte Spalten-/Zeilenabstände gibt es nicht - .ncss-gap-sm/-md/-lg wirken auf beide.`); }
    }
    if (h.hasClass("uk-grid-collapse")) { h.removeClass("uk-grid-collapse"); h.warn("uk-grid-collapse: kein abstandsloses Grid-Utility - gap im eigenen CSS auf 0 setzen."); }
    if (h.hasClass("uk-grid-match")) { h.removeClass("uk-grid-match"); h.info("uk-grid-match entfällt: Grid-Items sind per Default gleich hoch (Karten: .ncss-grid--card-row)."); }
    if (h.hasClass("uk-grid-divider")) { h.removeClass("uk-grid-divider"); h.warn("uk-grid-divider: keine Trennlinien im Grid - .ncss-border auf den Kindern oder eigene Regel."); }
    if (opts.get("masonry") && opts.get("masonry") !== "false") { h.removeClass("ncss-grid"); h.addClass("ncss-masonry"); }
    if (opts.get("parallax")) h.warn("uk-grid parallax: entfällt (kein Ersatz).");
  },
  // Kinder eines Flex-Grids: uk-width-* -> .ncss-width-*
  (h) => {
    const list = h.classes();
    const frac = widestFraction(list);
    if (!frac) return;
    const rest = list.filter((c) => !new RegExp(`^uk-width-(\\d-\\d|1-1|expand|auto)${BP}$`).test(c));
    if (frac === "1-1") { h.setClasses(rest); return; }
    if (frac === "expand") { h.setClasses([...rest, "ncss-flex-1"]); if (!h.marked("flexGridChild")) h.info("uk-width-expand -> .ncss-flex-1 (wirkt nur als Kind von .ncss-flex)."); return; }
    if (frac === "auto") { h.setClasses([...rest, "ncss-flex-auto"]); return; }
    if (WIDTHS.has(frac)) {
      h.setClasses([...rest, `ncss-width-${frac}`]);
      if (!h.marked("flexGridChild")) h.warn(`uk-width-${frac} -> .ncss-width-${frac}: wirkt nur als Kind von .ncss-flex-grid - Elternelement prüfen.`);
      if (list.some((c) => c.startsWith("uk-width-") && c.includes("@"))) h.info("Breakpoint-Suffixe entfallen - .ncss-width-* stapelt sich per @container selbst.");
    } else {
      h.setClasses(rest);
      h.warn(`uk-width-${frac}: keine Entsprechung (.ncss-width-1-2/-1-3/-1-4/-1-5/-1-6/-2-3/-3-4).`);
    }
  },

  /* ---- Section / Container --------------------------------------------- */
  (h) => {
    if (!h.hadClass("uk-section")) return;
    const size = h.hasClass("uk-section-xsmall") ? "sm" : h.hasClass("uk-section-small") ? "md" : "xl";
    h.setClasses(h.classes().filter((c) => !/^uk-section(-xsmall|-small|-large|-xlarge)?$/.test(c)).concat(`ncss-py-${size}`));
  },

  /* ---- Navbar ----------------------------------------------------------- */
  (h) => {
    const attr = h.uk("navbar");
    if (!attr && !h.hadClass("uk-navbar-container")) return;
    if (attr) h.ukRemove("navbar");
    if (h.hadClass("uk-navbar-container") || h.name === "nav") {
      h.removeClass("uk-navbar-container", "uk-navbar-transparent", "uk-navbar-sticky");
      h.addClass("ncss-nav");
      if (h.name === "nav") h.setIfMissing("aria-label", "Hauptnavigation");
      h.mark("navbar");
      h.warn("Navbar -> .ncss-nav: für die mobile Ansicht .ncss-nav-toggle + <dialog class=\"ncss-nav-panel ncss-offcanvas ncss-offcanvas--start\"> um die .ncss-nav-list ergänzen (siehe dist/components/nav.css); Logo/Aktionen -> .ncss-topbar (-inner/-brand/-actions).");
    } else {
      h.info("uk-navbar entfernt (das umgebende <nav class=\"uk-navbar-container\"> wird zu .ncss-nav).");
    }
  },
  (h) => {
    if (!h.hadClass("uk-navbar-nav")) return;
    h.replaceClass("uk-navbar-nav", "ncss-nav-list");
    h.children().filter((k) => k.name === "li").forEach((k) => k.mark("navItem"));
  },
  // li in Nav-Listen: .ncss-nav-item, uk-active -> aria-current, Dropdown -> <details>
  (h) => {
    if (!h.marked("navItem")) return;
    h.addClass("ncss-nav-item");
    const kids = h.children();
    const link = kids.find((k) => k.name === "a");
    const drop = kids.find((k) => k.origClasses().some((c) => /^uk-(navbar-dropdown|dropdown|drop|nav-sub)$/.test(c)) || k.uk("dropdown") || k.uk("drop"));
    const sub = drop && (drop.origClasses().includes("uk-nav-sub") ? drop : drop.descendants().find((d) => d.name === "ul" && d.origClasses().some((c) => /^uk-(nav|navbar-dropdown-nav|dropdown-nav|nav-sub)$/.test(c))));
    if (h.hadClass("uk-active") || h.hadClass("uk-open")) {
      h.removeClass("uk-active", "uk-open");
      if (link && !drop) link.mark("current");
      else if (drop) h.mark("openDrop");
    }
    h.removeClass("uk-parent");
    if (drop && link && sub) {
      h.prepend(`<details class="ncss-nav-dropdown"${h.marked("openDrop") ? " open" : ""}>`);
      h.append("</details>");
      link.mark("summary");
      if (drop !== sub) drop.mark("unwrapDrop");
      sub.mark("submenu");
      const href = link.get("href");
      if (href && href !== "#" && !/^\s*$/.test(href)) sub.mark("overviewHref", href);
      h.info("Untermenü -> <details class=\"ncss-nav-dropdown\"><summary> (Klick/Touch/Tastatur identisch, kein Hover).");
    } else if (drop) {
      h.warn("Dropdown in der Navigation nicht automatisch umbaubar - Muster: <details class=\"ncss-nav-dropdown\"><summary>…</summary><ul class=\"ncss-nav-submenu\">…</ul></details>.");
    }
  },
  (h) => {
    if (h.marked("current")) { h.set("aria-current", "page"); }
    if (h.marked("summary")) {
      h.retag("summary");
      h.remove("href");
      h.remove("aria-haspopup");
      h.remove("aria-expanded");
    }
    if (h.marked("unwrapDrop")) {
      h.ukRemove("dropdown");
      h.ukRemove("drop");
      const rest = h.classes().filter((c) => !/^uk-(navbar-dropdown|dropdown|drop|navbar-dropdown-width-\d|dropdown-large|navbar-dropdown-large)$/.test(c));
      h.setClasses(rest);
      if (!rest.length && !h.has("id")) h.unwrap();
      else h.warn("Dropdown-Wrapper mit eigenen Klassen/Attributen bleibt als <div> stehen - prüfen.");
    }
    if (h.marked("submenu")) {
      h.setClasses(h.classes().filter((c) => !/^uk-(nav|nav-default|nav-sub|navbar-dropdown-nav|dropdown-nav|nav-divider)$/.test(c)).concat("ncss-nav-submenu"));
      const href = h.marked("overviewHref");
      if (href) h.prepend(`\n${h.indentAfter()}<li><a href="${href}">${h.t("overview")}</a></li>`);
      h.children().filter((k) => k.name === "li").forEach((k) => k.mark("subItem"));
    }
    if (h.marked("subItem") && h.hadClass("uk-active")) {
      h.removeClass("uk-active");
      const a = h.children().find((k) => k.name === "a");
      if (a) a.mark("current");
    }
  },
  (h) => {
    if (h.hadClass("uk-navbar-left") || h.hadClass("uk-navbar-right") || h.hadClass("uk-navbar-center")) {
      h.removeClass("uk-navbar-left", "uk-navbar-right", "uk-navbar-center", "uk-navbar-center-left", "uk-navbar-center-right");
      if (!h.classes().length && h.name === "div" && !h.has("id")) h.unwrap();
    }
    if (h.hadClass("uk-navbar-item")) { h.removeClass("uk-navbar-item"); h.info("uk-navbar-item entfernt - in .ncss-topbar-actions stellen."); }
  },
  (h) => {
    if (!h.hadClass("uk-navbar-toggle")) return;
    h.replaceClass("uk-navbar-toggle", "ncss-nav-toggle");
    if (!h.has("aria-label") && !h.text()) h.set("aria-label", h.t("openMenu"));
  },

  /* ---- Vertikale Nav (uk-nav) ------------------------------------------ */
  (h) => {
    // <nav> direkt um eine uk-nav-Liste: Klassen gleich hier setzen
    if (h.name !== "nav") return;
    const list = h.children().find((k) => k.origClasses().includes("uk-nav") && !k.origClasses().some((c) => /dropdown-nav|navbar-dropdown-nav/.test(c)));
    if (list) { h.addClass("ncss-nav", "ncss-nav--tree"); list.mark("navInNav"); }
    const crumbs = h.children().find((k) => k.origClasses().includes("uk-breadcrumb"));
    if (crumbs) { h.addClass("ncss-breadcrumb"); h.setIfMissing("aria-label", "Breadcrumb"); crumbs.mark("crumbsInNav"); }
  },
  (h) => {
    const nav = h.uk("nav");
    if (!h.hadClass("uk-nav") || h.marked("submenu")) { if (nav && !h.hadClass("uk-nav")) h.ukRemove("nav"); return; }
    if (h.origClasses().some((c) => /^uk-(navbar-dropdown-nav|dropdown-nav)$/.test(c))) return;
    if (nav) {
      const o = parseOpts(nav.value);
      h.ukRemove("nav");
      h.info(`uk-nav (Akkordeon) -> verschachtelte <details class="ncss-nav-dropdown">${o.get("multiple") === "true" ? "" : " (für \"nur eins offen\" gleichen name=\"…\" ergänzen)"}.`);
    }
    h.setClasses(h.classes().filter((c) => !/^uk-nav(-default|-primary|-secondary|-center|-medium|-large|-xlarge)?$/.test(c)).concat("ncss-nav-list"));
    if (!h.marked("navInNav")) { h.before('<nav class="ncss-nav ncss-nav--tree">'); h.after("</nav>"); }
    h.children().filter((k) => k.name === "li").forEach((k) => k.mark("navItem"));
  },
  (h) => {
    if (h.hadClass("uk-nav-header")) { h.removeClass("uk-nav-header"); h.warn("uk-nav-header: keine Zwischenüberschrift in .ncss-nav-list - als eigenes Element über der Liste oder als <strong> setzen."); }
    if (h.hadClass("uk-nav-divider")) { h.removeClass("uk-nav-divider"); h.set("role", "separator"); h.warn("uk-nav-divider: keine Trennlinie in .ncss-nav-list - Liste teilen oder eigene Regel."); }
  },

  /* ---- Subnav / Breadcrumb / Pagination -------------------------------- */
  (h) => {
    if (!h.hadClass("uk-subnav")) return;
    h.setClasses(h.classes().filter((c) => !/^uk-subnav(-pill|-divider)?$/.test(c)).concat("ncss-cluster"));
    h.setIfMissing("role", "list");
    h.children().forEach((k) => k.mark("activeToCurrent"));
    h.info("uk-subnav -> .ncss-cluster (umbrechende Reihe); für eine wischbare Pill-Reihe .ncss-nav--scroll, für Sprunglinks .ncss-subnav.");
  },
  (h) => {
    if (!h.hadClass("uk-breadcrumb")) return;
    h.removeClass("uk-breadcrumb");
    if (h.name === "ul") h.retag("ol");
    if (!h.marked("crumbsInNav")) { h.before('<nav class="ncss-breadcrumb" aria-label="Breadcrumb">'); h.after("</nav>"); }
    const items = h.children().filter((k) => k.name === "li");
    const last = items[items.length - 1];
    if (last && !last.children().some((k) => k.name === "a")) last.mark("crumbCurrent");
    items.forEach((k) => k.mark("activeToCurrent"));
  },
  (h) => {
    if (h.marked("crumbCurrent")) { h.set("aria-current", "page"); h.removeClass("uk-disabled"); }
  },
  (h) => {
    if (!h.hadClass("uk-pagination")) return;
    h.replaceClass("uk-pagination", "ncss-cluster");
    h.setIfMissing("role", "list");
    h.children().forEach((k) => k.mark("activeToCurrent"));
    h.warn("uk-pagination: ncss hat keine eigene Pagination - .ncss-cluster als Reihe; in <nav aria-label=\"Seiten\"> stellen und ggf. eigene Regel.");
  },
  (h) => {
    if (!h.marked("activeToCurrent") || !h.hadClass("uk-active")) return;
    h.removeClass("uk-active");
    const a = h.children().find((k) => k.name === "a");
    if (a) a.mark("current"); else h.set("aria-current", "page");
  },
  (h) => {
    for (const [name, icon] of [["pagination-next", "fa-solid fa-chevron-right"], ["pagination-previous", "fa-solid fa-chevron-left"], ["slidenav-next", "fa-solid fa-chevron-right"], ["slidenav-previous", "fa-solid fa-chevron-left"]]) {
      if (!h.uk(name)) continue;
      h.ukRemove(name);
      h.require("Font Awesome (vendor/fontawesome/css/all.min.css bzw. eigene Kopie)", "Pfeil-Icons der Pagination/Slidenav.");
      if (h.name === "span" || h.name === "i") h.addClass(icon), h.set("aria-hidden", "true");
      else h.prepend(`<i class="${icon}" aria-hidden="true"></i>`);
    }
  },

  /* ---- Modal / Off-Canvas ---------------------------------------------- */
  (h) => {
    for (const kind of ["modal", "offcanvas"]) {
      const attr = h.uk(kind);
      if (!attr) continue;
      const o = parseOpts(attr.value);
      h.ukRemove(kind);
      if (h.name !== "dialog") h.retag("dialog");
      h.mark("dialog");
      const id = h.ensureId(kind === "modal" ? "modal" : "offcanvas");
      h.removeClass("uk-flex-top", "uk-modal", "uk-offcanvas", "uk-modal-container", "uk-offcanvas-overlay");
      if (kind === "modal") {
        h.addClass("ncss-modal");
        if (h.hadClass("uk-modal-full")) h.replaceClass("uk-modal-full", "ncss-modal--fullscreen");
        if (h.hadClass("uk-modal-container")) h.info("uk-modal-container: breiteres Modal per --ncss-modal-max-width am <dialog> (style=\"--ncss-modal-max-width: 60rem\").");
        if (o.get("bgClose") !== "false") { h.setIfMissing("closedby", "any"); }
        if (o.get("escClose") === "false") { h.set("closedby", "none"); h.warn("esc-close: false -> closedby=\"none\" (nur wo unterstützt; Esc schließt ein natives <dialog> sonst immer)."); }
        if (o.get("stack")) h.info("stack: gestapelte native Dialoge funktionieren ohne Option.");
        const title = h.descendants().find((d) => d.origClasses().includes("uk-modal-title"));
        if (title && !h.has("aria-labelledby") && !h.has("aria-label")) h.set("aria-labelledby", title.ensureId(`${id}-title`));
      } else {
        h.addClass("ncss-offcanvas", o.get("flip") === "true" ? "ncss-offcanvas--end" : "ncss-offcanvas--start");
        h.setIfMissing("closedby", "any");
        if (o.get("mode") && o.get("mode") !== "slide") h.info(`offcanvas mode "${o.get("mode")}": entfällt - ncss schiebt immer als Overlay ein.`);
        if (!h.has("aria-label") && !h.has("aria-labelledby")) { h.set("aria-label", h.t("menu")); h.info(`aria-label="${h.t("menu")}" gesetzt - an den Inhalt anpassen.`); }
      }
      h.require("js/command-fallback.js", "command/commandfor-Fallback für Browser ohne Invoker Commands (Modal/Off-Canvas).");
      if (h.hasClass("ncss-modal") || h.hasClass("ncss-offcanvas")) h.info(`uk-${kind} -> <dialog class="ncss-${kind}"> (natives showModal/close, Fokus-Falle, Esc, Top Layer).`);
    }
  },
  (h) => {
    if (h.hadClass("uk-modal-dialog")) {
      const rest = h.classes().filter((c) => !/^uk-(modal-dialog|margin-auto-vertical|width-auto|overflow-auto)$/.test(c) && !/^uk-width-/.test(c));
      if (rest.includes("uk-modal-body")) { h.setClasses(rest.map((c) => (c === "uk-modal-body" ? "ncss-modal-body" : c))); }
      else if (!rest.length && !h.has("id") && !h.has("style")) h.unwrap();
      else h.setClasses(rest);
    }
    if (h.hadClass("uk-offcanvas-bar")) {
      const rest = h.classes().filter((c) => !/^uk-(offcanvas-bar|offcanvas-bar-animation)$/.test(c));
      if (!rest.length && !h.has("id") && !h.has("style")) h.unwrap();
      else { h.setClasses(rest); h.info("uk-offcanvas-bar mit weiteren Klassen bleibt als Innen-<div> stehen."); }
    }
  },
  // Schließen-Buttons im Dialog
  (h) => {
    const list = h.origClasses();
    const isClose = list.some((c) => /^uk-(modal-close-default|modal-close-outside|modal-close-full|offcanvas-close|close)$/.test(c)) || (h.uk("close") && dialogOf(h));
    const isPlainClose = list.includes("uk-modal-close") && !isClose;
    if (!isClose && !isPlainClose) {
      if (h.uk("close")) {
        h.ukRemove("close");
        h.setIfMissing("aria-label", h.t("close"));
        if (h.isEmpty()) h.prepend(closeIcon);
        h.warn("uk-close außerhalb eines Dialogs: nur das Icon übertragen - Verhalten selbst ergänzen.");
      }
      return;
    }
    const dlg = dialogOf(h);
    h.ukRemove("close");
    h.removeClass("uk-modal-close-default", "uk-modal-close-outside", "uk-modal-close-full", "uk-offcanvas-close", "uk-close", "uk-modal-close", "uk-close-large");
    toButton(h);
    if (dlg) { h.set("command", "close"); h.set("commandfor", dlg.get("id")); }
    else h.warn("Schließen-Button ohne umgebendes uk-modal/uk-offcanvas - commandfor=\"id-des-dialogs\" von Hand setzen.");
    if (isClose) {
      h.addClass("ncss-dialog-close");
      h.setIfMissing("aria-label", h.t("close"));
      if (h.isEmpty()) h.prepend(closeIcon);
    }
  },
  (h) => {
    const map = { "uk-modal-header": "ncss-modal-header", "uk-modal-body": "ncss-modal-body", "uk-modal-footer": "ncss-modal-footer" };
    for (const [from, to] of Object.entries(map)) if (h.hasClass(from)) h.replaceClass(from, to);
    if (h.hasClass("uk-modal-title")) h.removeClass("uk-modal-title");
  },

  /* ---- uk-toggle -> command/commandfor ---------------------------------- */
  (h, ctx) => {
    const attr = h.uk("toggle");
    if (!attr) return;
    const o = parseOpts(attr.value);
    let target = o.primary ?? o.get("target") ?? (h.name === "a" ? h.get("href") : null);
    if (o.get("cls") || o.get("mode") === "hover" || o.get("animation")) {
      h.warn(`uk-toggle mit cls/mode/animation ("${attr.value}"): keine ncss-Entsprechung - <details>, popover/popovertarget oder ein paar Zeilen eigenes JS.`);
      return;
    }
    const plainId = (target ?? "").trim().replace(/<\?[\s\S]*?\?>|\{\{[\s\S]*?\}\}/g, "x");
    if (!target || !/^#[\w-]+$/.test(plainId)) {
      h.warn(`uk-toggle-Ziel "${target ?? ""}" ist kein #id - von Hand umbauen (command/commandfor braucht eine id).`);
      return;
    }
    const id = target.trim().slice(1);
    const el = ctx.ids.get(id);
    const isDialog = el && (el.attrs.some((a) => /^(data-)?uk-(modal|offcanvas)$/i.test(a.name)) || el.name === "dialog");
    if (el && !isDialog) {
      h.warn(`uk-toggle auf #${id} (kein Modal/Off-Canvas): ein-/ausblenden -> <details>/<summary> oder popover + popovertarget="${id}".`);
      return;
    }
    h.ukRemove("toggle");
    toButton(h);
    h.set("command", "show-modal");
    h.set("commandfor", id);
    if (!el) h.warn(`uk-toggle -> command="show-modal" commandfor="${id}": Ziel nicht in dieser Datei - prüfen, ob #${id} ein <dialog> ist.`);
    h.require("js/command-fallback.js", "command/commandfor-Fallback für Browser ohne Invoker Commands (Modal/Off-Canvas).");
  },

  /* ---- Accordion -> <details name> -------------------------------------- */
  (h, ctx) => {
    const attr = h.uk("accordion");
    if (!attr) return;
    const o = parseOpts(attr.value);
    h.ukRemove("accordion");
    h.removeClass("uk-accordion");
    const name = o.get("multiple") === "true" ? null : `accordion-${ctx.next("accordion")}`;
    const active = o.get("active");
    const items = h.children().filter((k) => k.name === "li" || k.name === "div");
    items.forEach((k, i) => { k.mark("accItem", { name, open: k.hadClass("uk-open") || String(i) === active }); });
    if (h.name === "ul" || h.name === "ol") h.retag("div");
    h.addClass("ncss-stack", "ncss-stack--tight");
    if (o.get("collapsible") === "false") h.warn("collapsible: false - <details> lässt sich immer schließen.");
    h.info(`uk-accordion -> <details class="ncss-disclosure"${name ? ` name="${name}"` : ""}> (kein JS, Find-in-Page, nur eins offen über gleichen name).`);
  },
  (h) => {
    const acc = h.marked("accItem");
    if (!acc) return;
    h.retag("details");
    h.removeClass("uk-open");
    h.addClass("ncss-disclosure");
    if (acc.name) h.set("name", acc.name);
    if (acc.open) h.set("open", null);
    const title = h.descendants().find((d) => d.origClasses().includes("uk-accordion-title"));
    if (title) title.mark("accTitle"); else h.warn("Akkordeon-Eintrag ohne .uk-accordion-title - <summary> von Hand ergänzen.");
    const content = h.descendants().find((d) => d.origClasses().includes("uk-accordion-content"));
    if (content) content.mark("accContent");
  },
  (h) => {
    if (h.marked("accTitle")) {
      if (/^h[1-6]$/.test(h.name)) h.warn(`.uk-accordion-title war eine Überschrift (<${h.name}>) - jetzt <summary>; Überschrift ggf. in die <summary> setzen.`);
      h.retag("summary");
      h.remove("href");
      h.removeClass("uk-accordion-title");
    }
    if (h.marked("accContent")) h.removeClass("uk-accordion-content");
  },

  /* ---- Lightbox --------------------------------------------------------- */
  (h, ctx) => {
    const attr = h.uk("lightbox");
    if (!attr) return;
    const group = `galerie-${ctx.next("lightbox")}`;
    h.ukRemove("lightbox");
    const links = h.name === "a" ? [h] : h.descendants().filter((d) => d.name === "a" && d.has("href"));
    links.forEach((a) => {
      a.set("data-ncss-lightbox", group);
      if (a.has("data-type") && a.get("data-type") !== "image") a.warn(`data-type="${a.get("data-type")}": js/lightbox.js zeigt Bilder - Video/iframe von Hand prüfen.`);
    });
    if (!links.length) h.warn("uk-lightbox ohne <a href> darin - data-ncss-lightbox=\"gruppe\" an die Links setzen.");
    h.require("js/lightbox.js", "Lightbox-Galerie (data-ncss-lightbox, data-caption bleibt wie bei UIkit).");
  },

  /* ---- Icons ------------------------------------------------------------- */
  (h) => {
    const attr = h.uk("icon");
    if (!attr) { if (h.hasClass("uk-icon")) h.removeClass("uk-icon"); return; }
    const o = parseOpts(attr.value);
    const name = (o.primary ?? o.get("icon") ?? "").trim();
    const icon = iconHtml(name, h);
    if (!icon) {
      h.warn(`Icon "${name}": keine Entsprechung - eigenes SVG (helpers/icons.css-Muster) oder ein Font-Awesome-Icon wählen.`);
      return;
    }
    h.ukRemove("icon");
    h.removeClass("uk-icon", "uk-icon-button", "uk-icon-link", "uk-icon-image");
    if (o.get("ratio")) h.info(`ratio: ${o.get("ratio")} - Icon-Größe folgt font-size (1em); im eigenen CSS setzen.`);
    if ((h.name === "span" || h.name === "i") && h.isEmpty()) {
      h.addClass(icon.classes);
      if (!h.has("aria-label")) h.set("aria-hidden", "true"); else h.set("role", "img");
    } else {
      h.prepend(icon.html);
      if (isTrigger(h) && !h.text() && !h.has("aria-label") && !h.has("aria-labelledby")) h.warn(`Icon-${h.name === "a" ? "Link" : "Button"} ohne Text - aria-label ergänzen.`);
    }
  },
  (h) => {
    for (const [name, icon] of [["navbar-toggle-icon", "menu"], ["search-icon", "search"], ["accordion-icon", null], ["nav-parent-icon", null], ["navbar-parent-icon", null], ["drop-parent-icon", null]]) {
      if (!h.uk(name)) continue;
      h.ukRemove(name);
      if (!icon) { h.info(`uk-${name}: der Pfeil kommt in ncss aus der Komponente (<details>/<summary>) - entfernt.`); if (h.isEmpty() && !h.classes().length) h.unwrap(); continue; }
      if (h.isEmpty()) { h.addClass("ncss-icon", `ncss-icon-${icon}`); h.set("aria-hidden", "true"); }
      else h.prepend(`<span class="ncss-icon ncss-icon-${icon}" aria-hidden="true"></span>`);
    }
  },

  /* ---- Medien / Verhalten ----------------------------------------------- */
  (h) => {
    const attr = h.uk("img");
    if (!attr) return;
    h.ukRemove("img");
    if (h.name === "img" || h.name === "source") {
      for (const a of ["src", "srcset", "sizes"]) {
        const v = h.get(`data-${a}`);
        if (v !== null) { h.set(a, v); h.remove(`data-${a}`); }
      }
      if (h.name === "img") { h.setIfMissing("loading", "lazy"); h.setIfMissing("decoding", "async"); }
    } else h.warn("uk-img als Hintergrundbild: als <img> (object-fit) bzw. .ncss-hero-media (style=\"background-image: url(...)\") umsetzen.");
  },
  (h) => {
    const attr = h.uk("tooltip");
    if (!attr) return;
    const o = parseOpts(attr.value);
    const text = o.primary ?? o.get("title") ?? "";
    h.ukRemove("tooltip");
    if (text && !h.has("title")) h.set("title", text.replace(/"/g, "&quot;"));
    h.info("uk-tooltip -> natives title; für reiche/fokussierbare Tooltips <ncss-hovercard> oder <wa-tooltip>.");
  },
  (h) => {
    const attr = h.uk("scrollspy");
    if (!attr) return;
    const o = parseOpts(attr.value);
    if (o.get("target")) { h.warn(`uk-scrollspy mit target ("${attr.value}"): Reveal je Kind setzen - class="ncss-reveal ncss-reveal--fade" auf die Kinder.`); return; }
    const cls = o.get("cls") ?? o.primary ?? "";
    const variant = /slide-(bottom|top)/.test(cls) ? "slide-up" : /scale/.test(cls) ? "scale" : "fade";
    h.ukRemove("scrollspy");
    h.addClass("ncss-reveal", `ncss-reveal--${variant}`);
    if (o.get("repeat") !== "true") { h.addClass("ncss-reveal--once"); h.set("data-ncss-reveal", null); h.require("js/reveal.js", "einmalige Reveals (.ncss-reveal--once) in Browsern ohne CSS-Scroll-Trigger."); }
    h.info(`uk-scrollspy -> .ncss-reveal--${variant} (scroll-getrieben, reduzierte Bewegung respektiert).`);
  },
  (h) => {
    const attr = h.uk("scrollspy-nav");
    if (attr) h.warn("uk-scrollspy-nav: Abschnitts-Navigation -> <nav class=\"ncss-subnav\" data-ncss-subnav> (components/subnav.css + js/subnav.js).");
  },
  (h) => {
    const attr = h.uk("sticky");
    if (!attr) return;
    const o = parseOpts(attr.value);
    h.ukRemove("sticky");
    if (h.hadClass("uk-navbar-container") || h.marked("navbar")) h.info("uk-sticky auf der Navbar: .ncss-topbar ist bereits sticky - Navigation in eine .ncss-topbar stellen.");
    else h.addClass("ncss-sticky");
    if (o.get("showOnUp") === "true") { h.addClass("ncss-hide-on-scroll"); h.info("show-on-up -> .ncss-hide-on-scroll."); }
    if (o.get("offset") || o.get("media") || o.get("end") || o.get("start")) h.warn(`uk-sticky-Optionen (${attr.value}) entfallen - position: sticky klebt nur innerhalb des Elternelements; Abstand über --ncss-sticky-top/eigene Regel.`);
  },
  (h) => {
    if (h.uk("scroll")) { h.ukRemove("scroll"); h.info("uk-scroll entfällt: weiches Scrollen kommt aus reset.css (scroll-behavior, reduzierte Bewegung beachtet)."); }
    if (h.uk("height-match")) { h.ukRemove("height-match"); h.info("uk-height-match entfällt: Grid-/Flex-Items sind gleich hoch (Karten-Unterteile: .ncss-grid--card-row)."); }
    if (h.uk("margin")) { h.ukRemove("margin"); h.info("uk-margin (Umbruch-Abstand) entfällt: Reihen mit gap - .ncss-cluster bzw. .ncss-gap-*."); }
    if (h.uk("svg")) { h.ukRemove("svg"); h.info("uk-svg entfernt - <img src=\"*.svg\"> bleibt; für currentColor-Icons helpers/icons.css (mask-image)."); }
    if (h.uk("video")) { h.ukRemove("video"); h.info("uk-video entfernt - Hintergrundvideo: .ncss-video-bg + data-ncss-video-bg (pausiert außerhalb des Viewports)."); }
    if (h.uk("height-viewport")) { h.ukRemove("height-viewport"); h.warn("uk-height-viewport: kein Utility - min-block-size: 100svh im eigenen CSS (svh statt vh, siehe Handbuch)."); }
    if (h.uk("alert")) { h.ukRemove("alert"); if (!h.hasClass("uk-alert")) h.addClass("uk-alert"); h.warn("uk-alert (Schließen-Verhalten) entfällt - statischer Hinweis; Toasts: ncss.notify(...) / data-ncss-notify."); }
    if (h.uk("cover")) {
      h.ukRemove("cover");
      if (h.name === "iframe") h.addClass("ncss-cover");
      else h.info("uk-cover auf <img>/<video>: object-fit: cover im eigenen CSS bzw. .ncss-hero-media.");
    }
  },
  (h) => {
    for (const name of ["tab", "switcher", "slider", "slideshow", "dropdown", "drop", "dropnav", "dropbar", "sortable", "filter", "parallax", "countdown", "totop", "spinner", "leader", "marker", "form-custom", "overflow-auto", "inview", "responsive"]) {
      const attr = h.uk(name);
      if (!attr) continue;
      const hint = {
        tab: "Tabs: <details name=\"…\">-Gruppe (.ncss-disclosure) oder <wa-tab-group> (Web Awesome) - siehe Handbuch \"Accordion & Tab\".",
        switcher: "Switcher: gehört zu uk-tab/uk-subnav - Inhalte in <details>/<summary> bzw. <wa-tab-group> überführen.",
        slider: "Slider: .ncss-slideshow (natives Scroll-Snap, components/slideshow.css) - Markup von Hand umbauen.",
        slideshow: "Slideshow: .ncss-slideshow > .ncss-slideshow-track > .ncss-slideshow-item (natives Scroll-Snap).",
        dropdown: "Dropdown: <details>/<summary> oder popover + Anchor Positioning; Hovercards: <ncss-hovercard>.",
        drop: "Drop: popover + Anchor Positioning oder <wa-popover>.",
        dropnav: "Dropnav: .ncss-nav mit <details class=\"ncss-nav-dropdown\">.",
        dropbar: "Dropbar: keine Entsprechung - .ncss-nav-dropdown.",
        sortable: "Sortable: keine Entsprechung (eigenes JS/Bibliothek).",
        filter: "Filter: keine Entsprechung (eigenes JS).",
        parallax: "Parallax: scroll-getriebene Animation (helpers/animations.css .ncss-animate-on-scroll, .ncss-hero--parallax).",
        countdown: "Countdown: keine Entsprechung (eigenes JS).",
        totop: "Totop: einfacher Link auf #top (weiches Scrollen kommt aus reset.css).",
        spinner: "Spinner: .ncss-animate-spin auf einem Icon.",
        leader: "Leader: keine Entsprechung.",
        marker: "Marker: keine Entsprechung.",
        "form-custom": "Datei-Upload: natives <input type=\"file\"> (base.css stylt es).",
        "overflow-auto": "Overflow: .ncss-table-scroll (Tabellen) bzw. overflow: auto im eigenen CSS.",
        inview: "Inview: .ncss-reveal / scroll-getriebene Animationen.",
        responsive: "Responsive: Medien sind per reset.css bereits responsiv.",
      }[name];
      h.warn(`uk-${name}: nicht automatisch übertragbar, bleibt stehen. ${hint}`);
    }
  },

  /* ---- Formulare --------------------------------------------------------- */
  (h) => {
    if (h.hadClass("uk-margin") && h.descendants().some((d) => d.origClasses().includes("uk-form-label"))) {
      h.replaceClass("uk-margin", "ncss-field");
    }
    if (h.hadClass("uk-form-danger")) { h.removeClass("uk-form-danger"); h.set("aria-invalid", "true"); }
    if (h.hadClass("uk-form-controls")) {
      h.removeClass("uk-form-controls", "uk-form-controls-text");
      if (!h.classes().length && !h.has("id") && h.name === "div") h.unwrap();
    }
    if (h.hadClass("uk-form-icon")) h.warn("uk-form-icon: Icon im Feld -> .ncss-search-Muster (Icon + Input) bzw. .ncss-input-group.");
  },
  (h) => {
    if (!h.hadClass("uk-overflow-auto")) return;
    if (h.descendants().some((d) => d.name === "table")) h.replaceClass("uk-overflow-auto", "ncss-table-scroll");
  },
  (h) => {
    if (!h.hadClass("uk-list")) return;
    const map = { "uk-list-bullet": "ncss-list--dot", "uk-list-disc": "ncss-list--dot", "uk-list-circle": "ncss-list--dot", "uk-list-square": "ncss-list--dot", "uk-list-hyphen": "ncss-list--dash", "uk-list-divider": "ncss-list--divided" };
    const variant = Object.entries(map).find(([k]) => h.hasClass(k))?.[1] ?? (h.hasClass("uk-list-decimal") ? null : "ncss-list--plain");
    h.setClasses(h.classes().filter((c) => !/^uk-list(-[\w]+)?$/.test(c)).concat(variant ? [variant] : []));
    if (variant) h.setIfMissing("role", "list");
    if (h.hadClass("uk-list-striped")) h.warn("uk-list-striped: keine Entsprechung - .ncss-list--divided oder eigene Regel.");
  },

  /* ---- Overlay / Inline ------------------------------------------------- */
  (h) => {
    if (!h.hadClass("uk-overlay")) return;
    const pos = { "uk-position-bottom": "ncss-overlay--bottom", "uk-position-top": "ncss-overlay--top", "uk-position-center": "ncss-overlay--center", "uk-position-cover": null };
    const list = h.classes().flatMap((c) => (c in pos ? (pos[c] ? [pos[c]] : []) : [c]));
    h.setClasses(list);
    if (h.closest((p) => p.hadClass("uk-transition-toggle")) && h.hadClass("uk-transition-fade")) h.replaceClass("uk-transition-fade", "ncss-reveal-on-hover");
  },
  (h) => {
    if (h.hadClass("uk-inline") || (h.hadClass("uk-transition-toggle") && h.descendants().some((d) => d.origClasses().includes("uk-overlay")))) {
      h.removeClass("uk-inline", "uk-inline-clip", "uk-transition-toggle");
      h.addClass("ncss-overlay-container");
    }
  },

  /* ---- Text/Sichtbarkeit mit Breakpoint-Suffix -------------------------- */
  (h) => {
    const out = [];
    let changed = false;
    for (const c of h.classes()) {
      const m = c.match(/^uk-(hidden|visible)@(s|m|l|xl)$/);
      if (m) {
        changed = true;
        out.push(m[1] === "hidden" ? "ncss-hide-from-md" : "ncss-hide-below-md");
        if (m[2] !== "m") h.warn(`${c}: Viewport-Sichtbarkeit gibt es nur an der md-Schwelle (.ncss-hide-below-md/-from-md) bzw. per Container (.ncss-hide-below-container-sm/-md/-lg/-xl) - angenähert.`);
        continue;
      }
      const t = c.match(/^uk-text-(left|center|right|justify)@(s|m|l|xl)$/);
      if (t) { changed = true; out.push(c.replace(/@\w+$/, "")); h.info(`${c}: Breakpoint-Suffix entfernt.`); continue; }
      out.push(c);
    }
    if (changed) h.setClasses(out);
  },
];

/* --------------------------------------------------------------------------
   Klassen-Tabelle (nach den Transforms)
   string = Ersatzklasse(n) · null = entfällt (Info) · { to, warn } = mit Hinweis
   -------------------------------------------------------------------------- */

const drop = (note) => ({ to: null, info: note });
const dropWarn = (note) => ({ to: null, warn: note });

export const classes = {
  // Layout
  "uk-container": "ncss-container",
  "uk-container-xsmall": "ncss-container--narrow",
  "uk-container-small": "ncss-container--narrow",
  "uk-container-large": drop("ncss-container ist max. 75rem breit; breiter: .ncss-full-bleed."),
  "uk-container-xlarge": drop("ncss-container ist max. 75rem breit; breiter: .ncss-full-bleed."),
  "uk-container-expand": { to: "ncss-full-bleed", info: "uk-container-expand -> .ncss-full-bleed (eigenes padding-inline ergänzen)." },
  "uk-section-default": null,
  "uk-section-muted": { to: "ncss-surface--neutral", info: "uk-section-muted -> .ncss-surface--neutral (Farbe im Theme prüfen)." },
  "uk-section-primary": "ncss-surface--brand",
  "uk-section-secondary": "ncss-surface--brand-2",
  "uk-section-large": null,
  "uk-section-xlarge": null,
  "uk-section-remove-vertical": null,
  "uk-preserve-color": null,
  "uk-flex": "ncss-flex",
  "uk-flex-inline": { to: "ncss-flex", warn: "uk-flex-inline -> .ncss-flex (block-level)." },
  "uk-flex-center": "ncss-flex--center",
  "uk-flex-between": "ncss-flex--between",
  "uk-flex-around": { to: "ncss-flex--between", warn: "uk-flex-around -> .ncss-flex--between (angenähert)." },
  "uk-flex-middle": dropWarn("uk-flex-middle: .ncss-flex zentriert vertikal nur mit --center/--between - ggf. .ncss-cluster (umbrechend, mittig) oder eigene Regel."),
  "uk-flex-column": "ncss-flex--column",
  "uk-flex-wrap": "ncss-flex--wrap",
  "uk-flex-1": "ncss-flex-1",
  "uk-flex-auto": "ncss-flex-auto",
  "uk-flex-none": null,
  "uk-flex-left": null,
  "uk-flex-top": null,
  "uk-flex-stretch": null,
  "uk-flex-right": dropWarn("uk-flex-right: rechtsbündig - margin-inline-start: auto am Element bzw. eigene Regel."),
  "uk-flex-bottom": dropWarn("uk-flex-bottom: eigene Regel (align-items: end)."),
  "uk-flex-first": dropWarn("uk-flex-first: Reihenfolge im Markup ändern statt order."),
  "uk-flex-last": dropWarn("uk-flex-last: Reihenfolge im Markup ändern statt order."),
  "uk-grid-small": "ncss-gap-sm",
  "uk-grid-medium": "ncss-gap-md",
  "uk-grid-large": "ncss-gap-lg",
  "uk-grid-stack": null,
  "uk-grid-margin": null,
  "uk-grid-margin-small": null,
  "uk-grid-margin-medium": null,
  "uk-grid-margin-large": null,
  "uk-first-column": null,
  "uk-margin": "ncss-mb-md",
  "uk-margin-small": "ncss-mb-sm",
  "uk-margin-medium": "ncss-mb-md",
  "uk-margin-large": "ncss-mb-lg",
  "uk-margin-xlarge": "ncss-mb-xl",
  "uk-margin-bottom": "ncss-mb-md",
  "uk-margin-small-bottom": "ncss-mb-sm",
  "uk-margin-medium-bottom": "ncss-mb-md",
  "uk-margin-large-bottom": "ncss-mb-lg",
  "uk-margin-xlarge-bottom": "ncss-mb-xl",
  "uk-margin-remove": "ncss-mb-0",
  "uk-margin-remove-bottom": "ncss-mb-0",
  "uk-margin-remove-top": null,
  ...Object.fromEntries(["top", "small-top", "medium-top", "large-top", "xlarge-top"].map((k) => [`uk-margin-${k}`, dropWarn("uk-margin-*-top entfernt: ncss setzt Abstände logisch nach unten - .ncss-mb-* am vorigen Element oder .ncss-stack am Elternelement.")])),
  ...Object.fromEntries(["left", "right", "small-left", "small-right", "medium-left", "medium-right", "large-left", "large-right", "auto", "auto-left", "auto-right", "auto-top", "auto-bottom", "auto-vertical"].map((k) => [`uk-margin-${k}`, dropWarn("uk-margin-left/-right/-auto entfernt: margin-inline im eigenen CSS bzw. .ncss-flex--between/.ncss-cluster.")])),
  "uk-margin-remove-vertical": "ncss-mb-0",
  "uk-margin-remove-adjacent": null,
  "uk-margin-remove-first-child": null,
  "uk-margin-remove-last-child": null,
  "uk-padding": "ncss-px-md ncss-py-md",
  "uk-padding-small": "ncss-px-sm ncss-py-sm",
  "uk-padding-large": "ncss-px-lg ncss-py-lg",
  "uk-padding-remove": null,
  "uk-padding-remove-vertical": null,
  "uk-padding-remove-horizontal": null,
  "uk-padding-remove-top": null,
  "uk-padding-remove-bottom": null,
  "uk-height-match": null,
  "uk-height-1-1": dropWarn("uk-height-1-1: eigene Regel (block-size: 100%)."),
  "uk-height-viewport": dropWarn("uk-height-viewport: min-block-size: 100svh im eigenen CSS."),
  // Card / Tile / Panel
  "uk-card": "ncss-card",
  "uk-card-default": { to: "ncss-border ncss-radius-md ncss-shadow-sm", info: "uk-card-default -> Rahmen/Ecken/Schatten aus helpers/elevation.css (.ncss-card selbst ist bewusst undekoriert)." },
  "uk-card-primary": "ncss-card--brand",
  "uk-card-secondary": "ncss-card--brand-2",
  "uk-card-hover": "ncss-shadow-hover-md",
  "uk-card-body": "ncss-card-body",
  "uk-card-header": "ncss-card-header",
  "uk-card-footer": "ncss-card-footer",
  "uk-card-media-top": "ncss-card-media",
  "uk-card-media-bottom": "ncss-card-media",
  "uk-card-media-left": { to: "ncss-card-media", warn: "uk-card-media-left/-right: Karte als .ncss-card--horizontal in einen .ncss-card-container stellen." },
  "uk-card-media-right": { to: "ncss-card-media", warn: "uk-card-media-left/-right: Karte als .ncss-card--horizontal in einen .ncss-card-container stellen." },
  "uk-card-title": null,
  "uk-card-badge": { to: "ncss-badge", warn: "uk-card-badge: Position (oben rechts) im eigenen CSS." },
  "uk-card-small": null,
  "uk-card-large": null,
  "uk-tile": "ncss-tile",
  "uk-tile-default": null,
  "uk-tile-muted": "ncss-tile--muted",
  "uk-tile-primary": "ncss-tile--brand",
  "uk-tile-secondary": "ncss-tile--brand-2",
  "uk-tile-xsmall": null,
  "uk-tile-small": null,
  "uk-tile-large": null,
  "uk-tile-xlarge": null,
  "uk-panel": null,
  "uk-cover-container": "ncss-cover-container",
  "uk-placeholder": "ncss-placeholder",
  // Button
  "uk-button": "ncss-btn",
  "uk-button-default": "ncss-btn--secondary",
  "uk-button-primary": "ncss-btn--primary",
  "uk-button-secondary": "ncss-btn--secondary",
  "uk-button-danger": "ncss-btn--danger",
  "uk-button-text": dropWarn("uk-button-text: ein normaler Link/Button ohne .ncss-btn passt besser."),
  "uk-button-link": dropWarn("uk-button-link: ein normaler Link/Button ohne .ncss-btn passt besser."),
  "uk-button-small": null,
  "uk-button-large": null,
  "uk-button-group": { to: "ncss-cluster", info: "uk-button-group -> .ncss-cluster (Abstand statt verschmolzener Buttons)." },
  "uk-width-1-1": null,
  "uk-width-small": dropWarn("feste uk-width-small/-medium/-large: max-inline-size im eigenen CSS."),
  "uk-width-medium": dropWarn("feste uk-width-small/-medium/-large: max-inline-size im eigenen CSS."),
  "uk-width-large": dropWarn("feste uk-width-small/-medium/-large: max-inline-size im eigenen CSS."),
  "uk-width-xlarge": dropWarn("feste uk-width-small/-medium/-large: max-inline-size im eigenen CSS."),
  "uk-width-2xlarge": dropWarn("feste uk-width-small/-medium/-large: max-inline-size im eigenen CSS."),
  // Text
  "uk-text-center": "ncss-text-center",
  "uk-text-left": "ncss-text-start",
  "uk-text-right": "ncss-text-end",
  "uk-text-justify": "ncss-text-justify",
  "uk-text-muted": "ncss-text-muted",
  "uk-text-lead": "ncss-text-lead",
  "uk-text-small": "ncss-text-sm",
  "uk-text-large": "ncss-text-lg",
  "uk-text-meta": "ncss-text-sm ncss-text-muted",
  "uk-text-truncate": "ncss-truncate",
  "uk-text-primary": "ncss-text-brand",
  "uk-text-secondary": "ncss-text-brand-2",
  "uk-text-success": "ncss-text-success",
  "uk-text-warning": "ncss-text-warning",
  "uk-text-danger": "ncss-text-danger",
  "uk-text-background": "ncss-text-gradient-brand",
  "uk-text-default": null,
  "uk-text-emphasis": null,
  "uk-text-normal": null,
  "uk-text-bold": dropWarn("uk-text-bold: <strong> bzw. font-weight im eigenen CSS."),
  "uk-text-bolder": dropWarn("uk-text-bolder: <strong> bzw. font-weight im eigenen CSS."),
  "uk-text-light": null,
  "uk-text-lighter": null,
  "uk-text-italic": dropWarn("uk-text-italic: <em> bzw. eigenes CSS."),
  "uk-text-uppercase": dropWarn("uk-text-uppercase: text-transform im eigenen CSS (ncss hat kein Utility)."),
  "uk-text-capitalize": dropWarn("uk-text-capitalize: eigenes CSS."),
  "uk-text-lowercase": dropWarn("uk-text-lowercase: eigenes CSS."),
  "uk-text-nowrap": dropWarn("uk-text-nowrap: eigenes CSS (white-space: nowrap)."),
  "uk-text-break": null,
  "uk-text-top": null,
  "uk-text-middle": null,
  "uk-text-bottom": null,
  "uk-text-baseline": null,
  "uk-heading-small": null,
  "uk-heading-medium": null,
  "uk-heading-large": null,
  "uk-heading-xlarge": null,
  "uk-heading-2xlarge": null,
  "uk-heading-3xlarge": null,
  "uk-heading-divider": dropWarn("uk-heading-divider/-bullet/-line: Deko im eigenen CSS (Überschriften nutzen die fluide Typo-Skala)."),
  "uk-heading-bullet": dropWarn("uk-heading-divider/-bullet/-line: Deko im eigenen CSS."),
  "uk-heading-line": dropWarn("uk-heading-divider/-bullet/-line: Deko im eigenen CSS."),
  "uk-h1": dropWarn("uk-h1..uk-h6: optische Überschriftengröße - passendes <hN> verwenden oder eigenes CSS."),
  "uk-h2": dropWarn("uk-h1..uk-h6: optische Überschriftengröße - passendes <hN> verwenden oder eigenes CSS."),
  "uk-h3": dropWarn("uk-h1..uk-h6: optische Überschriftengröße - passendes <hN> verwenden oder eigenes CSS."),
  "uk-h4": dropWarn("uk-h1..uk-h6: optische Überschriftengröße - passendes <hN> verwenden oder eigenes CSS."),
  "uk-h5": dropWarn("uk-h1..uk-h6: optische Überschriftengröße - passendes <hN> verwenden oder eigenes CSS."),
  "uk-h6": dropWarn("uk-h1..uk-h6: optische Überschriftengröße - passendes <hN> verwenden oder eigenes CSS."),
  "uk-article": null,
  "uk-article-title": null,
  "uk-article-meta": "ncss-text-sm ncss-text-muted",
  "uk-link": null,
  "uk-link-muted": null,
  "uk-link-text": null,
  "uk-link-heading": null,
  "uk-link-reset": null,
  "uk-link-toggle": null,
  "uk-logo": { to: "ncss-topbar-brand", info: "uk-logo -> .ncss-topbar-brand (gehört in .ncss-topbar-inner)." },
  "uk-dropcap": dropWarn("uk-dropcap: eigenes CSS (::first-letter)."),
  // Sichtbarkeit
  "uk-hidden": "ncss-hidden",
  "uk-hidden-visually": "ncss-visually-hidden",
  "uk-invisible": dropWarn("uk-invisible: visibility: hidden im eigenen CSS (nicht .ncss-hidden - das nimmt keinen Platz ein)."),
  "uk-hidden-touch": dropWarn("uk-hidden-touch/-notouch: @media (hover: hover) im eigenen CSS."),
  "uk-hidden-notouch": dropWarn("uk-hidden-touch/-notouch: @media (hover: hover) im eigenen CSS."),
  "uk-visible-toggle": dropWarn("uk-visible-toggle/uk-hidden-hover: .ncss-overlay-container + .ncss-reveal-on-hover."),
  "uk-hidden-hover": dropWarn("uk-visible-toggle/uk-hidden-hover: .ncss-overlay-container + .ncss-reveal-on-hover."),
  "uk-light": { to: "ncss-scheme-dark", info: "uk-light (helle Schrift auf dunklem Grund) -> .ncss-scheme-dark." },
  "uk-dark": { to: "ncss-scheme-light", info: "uk-dark -> .ncss-scheme-light." },
  // Deko
  "uk-border-rounded": "ncss-radius-md",
  "uk-border-circle": "ncss-radius-full",
  "uk-border-pill": "ncss-radius-full",
  "uk-box-shadow-small": "ncss-shadow-sm",
  "uk-box-shadow-medium": "ncss-shadow-md",
  "uk-box-shadow-large": "ncss-shadow-lg",
  "uk-box-shadow-xlarge": "ncss-shadow-lg",
  "uk-box-shadow-hover-small": "ncss-shadow-hover-sm",
  "uk-box-shadow-hover-medium": "ncss-shadow-hover-md",
  "uk-box-shadow-hover-large": "ncss-shadow-hover-lg",
  "uk-box-shadow-hover-xlarge": "ncss-shadow-hover-lg",
  "uk-box-shadow-bottom": null,
  "uk-divider-icon": "ncss-divider",
  "uk-divider-small": "ncss-divider",
  "uk-divider-vertical": "ncss-divider--vertical",
  "uk-hr": "ncss-divider",
  "uk-float-left": "ncss-float-start",
  "uk-float-right": "ncss-float-end",
  "uk-clearfix": null,
  "uk-responsive-width": null,
  "uk-responsive-height": null,
  "uk-preserve-width": null,
  "uk-display-block": dropWarn("uk-display-*: eigenes CSS."),
  "uk-display-inline": dropWarn("uk-display-*: eigenes CSS."),
  "uk-display-inline-block": dropWarn("uk-display-*: eigenes CSS."),
  "uk-object-cover": dropWarn("uk-object-*: object-fit im eigenen CSS."),
  "uk-object-contain": dropWarn("uk-object-*: object-fit im eigenen CSS."),
  "uk-overflow-hidden": null,
  "uk-position-relative": null,
  "uk-position-z-index": null,
  // Overlay
  "uk-overlay": "ncss-overlay",
  "uk-overlay-default": "ncss-overlay--tint",
  "uk-overlay-primary": "ncss-overlay--scrim",
  "uk-transition-fade": { to: "ncss-reveal-on-hover", info: "uk-transition-fade -> .ncss-reveal-on-hover (im .ncss-overlay-container)." },
  // Animationen
  "uk-animation-fade": "ncss-animate-fade-in",
  "uk-animation-scale-up": "ncss-animate-scale-in",
  "uk-animation-scale-down": "ncss-animate-scale-in",
  "uk-animation-slide-top": "ncss-animate-slide-in-down",
  "uk-animation-slide-bottom": "ncss-animate-slide-in-up",
  "uk-animation-slide-left": "ncss-animate-slide-in-left",
  "uk-animation-slide-right": "ncss-animate-slide-in-right",
  "uk-animation-slide-top-small": "ncss-animate-slide-in-down",
  "uk-animation-slide-bottom-small": "ncss-animate-slide-in-up",
  "uk-animation-slide-left-small": "ncss-animate-slide-in-left",
  "uk-animation-slide-right-small": "ncss-animate-slide-in-right",
  "uk-animation-slide-top-medium": "ncss-animate-slide-in-down",
  "uk-animation-slide-bottom-medium": "ncss-animate-slide-in-up",
  "uk-animation-shake": "ncss-animate-shake",
  "uk-animation-reverse": null,
  "uk-animation-fast": null,
  "uk-animation-kenburns": dropWarn("uk-animation-kenburns: .ncss-backdrop (sanfter Zoom) bzw. eigenes CSS."),
  "uk-animation-toggle": dropWarn("uk-animation-toggle: Hover-Animation im eigenen CSS (@media (hover: hover))."),
  // Komponenten
  "uk-badge": "ncss-badge",
  "uk-label": "ncss-badge",
  "uk-label-success": "ncss-badge ncss-badge--success",
  "uk-label-warning": "ncss-badge ncss-badge--warning",
  "uk-label-danger": "ncss-badge ncss-badge--danger",
  "uk-alert": { to: "ncss-card ncss-card-body ncss-radius-md", info: "uk-alert -> statische farbige Karte (.ncss-card--success/-warning/-danger); Toasts: ncss.notify(...)." },
  "uk-alert-primary": "ncss-card--brand",
  "uk-alert-success": "ncss-card--success",
  "uk-alert-warning": "ncss-card--warning",
  "uk-alert-danger": "ncss-card--danger",
  "uk-alert-close": dropWarn("uk-alert-close: Schließen-Verhalten entfällt (statischer Hinweis) - Button entfernen oder eigenes JS."),
  "uk-description-list": "ncss-dl",
  "uk-description-list-divider": null,
  "uk-table": drop("Tabellen sind nativ gestylt (base.css / helpers/tables.css) - keine Klasse nötig."),
  "uk-table-striped": null,
  "uk-table-hover": null,
  "uk-table-divider": null,
  "uk-table-small": null,
  "uk-table-large": null,
  "uk-table-justify": null,
  "uk-table-middle": null,
  "uk-table-shrink": null,
  "uk-table-expand": null,
  "uk-table-link": null,
  "uk-table-responsive": { to: "ncss-table-stacked", info: "uk-table-responsive -> .ncss-table-stacked (Zeilen stapeln sich schmal)." },
  "uk-search": "ncss-search",
  "uk-search-input": "ncss-input ncss-search-input",
  "uk-search-default": null,
  "uk-search-navbar": null,
  "uk-search-large": null,
  "uk-search-medium": null,
  "uk-input": "ncss-input",
  "uk-select": "ncss-select",
  "uk-textarea": "ncss-textarea",
  "uk-range": "ncss-range",
  "uk-form-label": "ncss-label",
  "uk-checkbox": null,
  "uk-radio": null,
  "uk-form-stacked": null,
  "uk-form-horizontal": null,
  "uk-fieldset": null,
  "uk-legend": null,
  "uk-form-success": null,
  "uk-form-blank": null,
  "uk-form-small": null,
  "uk-form-large": null,
  "uk-form-width-xsmall": null,
  "uk-form-width-small": null,
  "uk-form-width-medium": null,
  "uk-form-width-large": null,
  "uk-progress": drop("<progress> ist nativ gestylt."),
  "uk-active": { to: null, info: "uk-active entfernt - aktive Links tragen aria-current=\"page\"." },
  "uk-disabled": { to: null, info: "uk-disabled entfernt - aria-disabled=\"true\" bzw. disabled verwenden." },
  "uk-open": null,
  "uk-parent": null,
  "uk-nav-sub": "ncss-nav-submenu",
  "uk-modal-page": null,
  "uk-offcanvas-page": null,
  "uk-offcanvas-container": null,
  "uk-sticky-placeholder": null,
  "uk-sticky-fixed": null,
  "uk-icon": null,
  "uk-icon-button": dropWarn("uk-icon-button: Button mit .ncss-icon + aria-label (eigene Kreis-Optik per .ncss-radius-full + eigenem CSS)."),
  "uk-icon-link": null,
  "uk-close-large": null,
  "uk-inline": "ncss-overlay-container",
};

/* --------------------------------------------------------------------------
   finalize: Tabelle anwenden, Reste melden
   -------------------------------------------------------------------------- */

/** Klassen-Token mit Template-Teilen: {% if x %}uk-card-primary{% endif %} wird umgesetzt,
 *  uk-button-{{ stil }} (zusammengesetzter Name) nur gemeldet. */
function convertDynamic(c, h) {
  const saved = h.tag._cls?.saved ?? [];
  const re = new RegExp(`(${MARK}\\d+${MARK})`);
  const parts = c.split(re);
  const tpl = (p) => (p && re.test(p) ? saved[Number(p.slice(1, -1))] : null);
  const isExpr = (p) => { const t = tpl(p); return !!t && /^(\{\{|<\?=|<\?php\s+echo|<%=)/.test(t); };
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p || re.test(p) || !/^uk-/.test(p)) continue;
    if (isExpr(parts[i - 1]) || isExpr(parts[i + 1]) || (parts[i - 1] === "" && isExpr(parts[i - 2])) || (parts[i + 1] === "" && isExpr(parts[i + 2]))) {
      h.warn(`Zusammengesetzte Klasse "${c.replace(new RegExp(`${MARK}(\\d+)${MARK}`, "g"), (_, n) => saved[Number(n)])}" (Template-Ausdruck) - von Hand umstellen.`);
      continue;
    }
    const rule = classes[p];
    if (rule === undefined) { h.warn(`Klasse "${p}" im Template-Zweig: keine automatische Entsprechung - bleibt stehen.`); continue; }
    parts[i] = rule === null ? "" : typeof rule === "string" ? rule : rule.to ?? "";
    h.info(`"${p}" im Template-Zweig -> "${parts[i] || "(entfällt)"}".`);
  }
  return parts.join("");
}

function finalize(h) {
  if (h.tag.unwrapped) return;
  const list = h.classes();
  if (list.some((c) => /^uk-/.test(c) || isDynamic(c))) {
    const out = [];
    for (const c of list) {
      if (isDynamic(c)) { out.push(convertDynamic(c, h)); continue; }
      if (!c.startsWith("uk-")) { out.push(c); continue; }
      const { base, bp } = bpSplit(c);
      const key = c in classes ? c : bp && base in classes ? base : null;
      if (!key) { out.push(c); h.warn(`Klasse "${c}": keine automatische Entsprechung - bleibt stehen (siehe docs/de/uikit-migration.html).`); continue; }
      if (bp) h.info(`${c}: Breakpoint-Suffix entfernt (ncss: intrinsische Layouts/Container Queries).`);
      const rule = classes[key];
      if (rule === null) continue;
      if (typeof rule === "string") { out.push(...rule.split(" ")); continue; }
      if (rule.to) out.push(...rule.to.split(" "));
      if (rule.warn) h.warn(rule.warn);
      else if (rule.info) h.info(rule.info);
    }
    h.setClasses(out);
  }
  for (const t of h.tag._cls?.saved ?? []) {
    const m = t.match(/\buk-[a-z][\w-]*/g);
    if (m) h.warn(`UIkit-Klassen im Template-Ausdruck (${[...new Set(m)].join(", ")}) - der Konverter ändert PHP/Twig nie, von Hand umstellen.`);
  }
  for (const a of h.tag.attrs) {
    if (a.removed) continue;
    if (a.template) {
      if (/\buk-[a-z]/.test(a.template) && !a.warned) { a.warned = true; h.warn(`UIkit-Namen in Template-Code im Tag (${a.template.slice(0, 60)}) - von Hand umstellen.`); }
      continue;
    }
    if (/^(data-)?uk-/i.test(a.name) && !a.warned) {
      a.warned = true;
      const known = /^(data-)?uk-(tab|switcher|slider|slideshow|dropdown|drop|dropnav|dropbar|sortable|filter|parallax|countdown|totop|spinner|leader|marker|form-custom|overflow-auto|inview|responsive|scrollspy-nav|toggle|icon|scrollspy)$/i.test(a.name);
      if (!known) h.warn(`Attribut "${a.name}": keine automatische Entsprechung - bleibt stehen.`);
    }
  }
}

/* --------------------------------------------------------------------------
   JS-API-Hinweise (UIkit.* in <script>)
   -------------------------------------------------------------------------- */

export const api = {
  "UIkit.modal": "dialog.showModal() / dialog.close() - natives <dialog>.",
  "UIkit.modal.confirm": "eigenes <dialog class=\"ncss-modal\"> mit zwei Buttons (form method=\"dialog\", returnValue auswerten).",
  "UIkit.modal.alert": "eigenes <dialog class=\"ncss-modal\"> (form method=\"dialog\").",
  "UIkit.modal.prompt": "eigenes <dialog class=\"ncss-modal\"> mit <input> (form method=\"dialog\").",
  "UIkit.offcanvas": "dialog.showModal() / dialog.close().",
  "UIkit.notification": "ncss.notify(\"Text\", { status: \"success\" }) aus js/notification.js (status primary -> brand).",
  "UIkit.toggle": "native Elemente: details.open, dialog.showModal(), el.togglePopover().",
  "UIkit.accordion": "details.open = true (gleicher name = exklusiv).",
  "UIkit.tab": "keine Entsprechung - <details name> bzw. <wa-tab-group>.",
  "UIkit.switcher": "keine Entsprechung - <details name> bzw. <wa-tab-group>.",
  "UIkit.dropdown": "el.showPopover() / details.open.",
  "UIkit.drop": "el.showPopover().",
  "UIkit.lightbox": "js/lightbox.js (data-ncss-lightbox an den Links).",
  "UIkit.lightboxPanel": "js/lightbox.js (data-ncss-lightbox an den Links).",
  "UIkit.scroll": "el.scrollIntoView({ behavior: \"smooth\" }).",
  "UIkit.sticky": "position: sticky (.ncss-sticky) - kein JS.",
  "UIkit.util": "native DOM-APIs (querySelector, classList, addEventListener).",
  "UIkit.update": "nicht nötig - Layouts sind reines CSS.",
  "UIkit.icon": "<span class=\"ncss-icon ncss-icon-…\"> bzw. Font Awesome.",
  "UIkit.use": "kein Plugin-System.",
  "UIkit.component": "Custom Elements (customElements.define) nach dem Muster von dist/js/.",
};

export const rules = { classes, transforms, finalize, api };
