/**
 * NativeCSS-Website - Code-Inspektor (nur Doku/Demo, NICHT Teil von dist/).
 *
 * Ein Klick auf ein beliebiges Element der Seite zeigt:
 *  - sein HTML (bereinigt um Spuren des Inspektors selbst),
 *  - eine Vorfahren-Leiste (Breadcrumb) + "Eltern ↑", um vom Button zur ganzen Karte zu springen,
 *  - für jede ncss-Klasse die DEFINIERENDE Datei in dist/ (ermittelt zur Laufzeit aus den per
 *    @import geladenen Stylesheets - kein generierter Index nötig),
 *  - für jedes data-ncss-*-Attribut das zugehörige Script aus dist/js/ (sofern auf der Seite geladen),
 *  - die @import-Zeilen (inkl. Layer), die eine eigene, ausgedünnte ncss.css-Kopie für genau
 *    diesen Baustein braucht - der dokumentierte Cherry-Picking-Weg (siehe Architektur-Doku).
 *
 * Bedienung: ein Button mit [data-demo-inspect] schaltet um (aria-pressed wird gepflegt),
 * alternativ Alt+I (Mac: ⌥I). Esc beendet den Modus. Styles in demo/assets/inspector.css
 * (keine Inline-Styles - CSP).
 *
 * Erklärungen: beim ersten Einschalten lädt der Inspektor docs/class-index.{de,en}.json
 * (erzeugt von docs-src/build.mjs aus den Klassen-Tabellen des Handbuchs + den Datei-
 * Kommentaren in dist/) und zeigt je ncss-Klasse, data-ncss-Attribut und <ncss-…>-Element
 * eine kurze Erklärung mit Link zum Handbuch-Abschnitt. Fehlt die Datei: alles außer den
 * Erklärungen. Der Pfad ergibt sich aus dem Ort DIESES Scripts (demo/assets/js/) - der
 * Inspektor funktioniert damit auf Handbuch-, Start- und Beispielseiten gleichermaßen.
 *
 * Texte Deutsch/Englisch nach <html lang>.
 */
(function () {
  "use strict";

  if (!("closest" in Element.prototype) || !document.styleSheets) return;

  var EN = (document.documentElement.lang || "").slice(0, 2) === "en";
  var LANG = EN ? "en" : "de";
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || location.href;
  var SITE_ROOT = new URL("../../../", SCRIPT_SRC);
  var explain = null;      // geladener Klassen-Index (oder false, wenn nicht ladbar)
  var explainLoading = false;

  function loadExplanations(done) {
    if (explain !== null || explainLoading || !window.fetch) return;
    explainLoading = true;
    fetch(new URL("docs/class-index." + LANG + ".json", SITE_ROOT))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { explain = data; })
      .catch(function () { explain = false; })
      .then(function () { explainLoading = false; done(); });
  }

  function explainFor(key) {
    if (!explain || !explain.entries) return "";
    var e = explain.entries[key];
    // Modifier ohne eigenen Eintrag (.ncss-btn--primary): Erklärung der Basisklasse.
    if (!e && key.indexOf("--") > 0) e = explain.entries[key.split("--")[0]];
    if (!e) return "";
    var href = new URL("docs/" + LANG + "/" + e.page + ".html" + (e.anchor ? "#" + e.anchor : ""), SITE_ROOT).href;
    return '<span class="demo-inspect-explain">' + esc(e.text) + ' <a href="' + esc(href) + '">' + T.docs + ": " + esc(e.title) + "</a></span>";
  }

  function fileNote(path) {
    return explain && explain.files && explain.files[path] ? '<span class="demo-inspect-explain">' + esc(explain.files[path]) + "</span>" : "";
  }
  var T = EN ? {
    title: "Inspector", copy: "Copy HTML", copied: "Copied", parent: "Parent ↑", close: "Close",
    hint: "Click any element on the page. Alt+I (⌥I) toggles inspect mode, Esc leaves it.",
    html: "HTML", classes: "Classes → defining file", scripts: "JavaScript", imports: "Cherry-pick: @import lines for your own ncss.css",
    notLoaded: "not defined by a loaded stylesheet", noScript: "script not loaded on this page", ancestors: "Ancestors",
    needsBase: "always needed: colors, tokens, reset, base",
    docs: "Docs", elements: "Custom elements", files: "Files"
  } : {
    title: "Inspektor", copy: "HTML kopieren", copied: "Kopiert", parent: "Eltern ↑", close: "Schließen",
    hint: "Ein beliebiges Element anklicken. Alt+I (⌥I) schaltet den Modus um, Esc beendet ihn.",
    html: "HTML", classes: "Klassen → definierende Datei", scripts: "JavaScript", imports: "Cherry-Picking: @import-Zeilen für die eigene ncss.css",
    notLoaded: "von keinem geladenen Stylesheet definiert", noScript: "Script auf dieser Seite nicht geladen", ancestors: "Vorfahren",
    needsBase: "immer nötig: colors, tokens, reset, base",
    docs: "Handbuch", elements: "Eigene Elemente", files: "Dateien"
  };

  var active = false;
  var hover = null;
  var panel = null;
  var current = null;
  var crumbs = [];
  var index = null;

  /* --- Klasse -> Datei-Index aus den geladenen Stylesheets (inkl. @import) ------------ */

  function walk(rules, href, map) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.styleSheet) {
        try { walk(rule.styleSheet.cssRules, rule.styleSheet.href || href, map); } catch (e) { /* fremde Herkunft */ }
        continue;
      }
      if (rule.cssRules) walk(rule.cssRules, href, map);
      var sel = rule.selectorText;
      if (!sel) continue;
      var re = /\.(ncss-[a-z0-9_-]+)/g, m;
      while ((m = re.exec(sel))) {
        if (!map[m[1]]) map[m[1]] = [];
        if (map[m[1]].indexOf(href) < 0) map[m[1]].push(href);
      }
    }
  }

  function buildIndex() {
    var map = {};
    for (var i = 0; i < document.styleSheets.length; i++) {
      var s = document.styleSheets[i];
      try { walk(s.cssRules, s.href || "(inline)", map); } catch (e) { /* fremde Herkunft */ }
    }
    return map;
  }

  /** "…/dist/components/card.css" -> "components/card.css" (relativ zu dist/) */
  function distPath(href) {
    var i = href.indexOf("/dist/");
    return i < 0 ? null : href.slice(i + 6).split("?")[0];
  }

  function layerOf(path) {
    if (path.indexOf("helpers/") === 0) return "helpers";
    if (path.indexOf("components/") === 0) return "components";
    if (/^(colors|tokens)\.css$/.test(path)) return "tokens";
    if (path === "reset.css") return "reset";
    if (path === "base.css") return "base";
    if (path === "browser-fixes.css") return "browser-fixes";
    return null;
  }

  /* --- HTML bereinigen + formatieren --------------------------------------------------- */

  var VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;
  var INLINE = /^(a|abbr|b|bdi|button|code|em|i|kbd|label|mark|q|s|small|span|strong|sub|sup|time|u|img|input|select|textarea|br|wbr)$/;
  var KEEP_EMPTY = /^(alt|value|content)$/;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function clean(el) {
    var clone = el.cloneNode(true);
    var all = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll("*")));
    all.forEach(function (n) {
      n.classList && n.classList.remove("demo-inspect-hover");
      if (n.getAttribute && n.getAttribute("class") === "") n.removeAttribute("class");
      if (n.getAttribute && n.getAttribute("style") === "") n.removeAttribute("style");
    });
    return clone;
  }

  function format(node, depth, budget) {
    if (budget.lines <= 0) return "";
    if (node.nodeType === 3) {
      var t = node.textContent.replace(/\s+/g, " ");
      return t.trim() ? t : "";
    }
    if (node.nodeType === 8) return "<!--" + node.textContent + "-->";
    if (node.nodeType !== 1) return "";
    var tag = node.localName;
    var attrs = Array.prototype.map.call(node.attributes, function (a) {
      return a.value === "" && !KEEP_EMPTY.test(a.name) ? " " + a.name : " " + a.name + '="' + a.value.replace(/"/g, "&quot;") + '"';
    }).join("");
    var open = "<" + tag + attrs + ">";
    if (VOID.test(tag)) return open;
    if (/^(svg|script|style|pre)$/.test(tag)) return node.outerHTML;
    var kids = Array.prototype.slice.call(node.childNodes);
    var block = kids.some(function (k) { return k.nodeType === 1 && !INLINE.test(k.localName); });
    if (!block) {
      return open + kids.map(function (k) { return format(k, 0, budget); }).join("").trim() + "</" + tag + ">";
    }
    budget.lines--;
    var pad = new Array(depth + 1).join("  ");
    var inner = kids.map(function (k) { return format(k, depth + 1, budget); })
      .filter(function (s) { return s.trim(); })
      .map(function (s) { return pad + "  " + s.trim(); }).join("\n");
    return open + "\n" + inner + "\n" + pad + "</" + tag + ">";
  }

  /* --- Panel ---------------------------------------------------------------------------- */

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement("section");
    panel.className = "demo-inspect-panel";
    panel.setAttribute("aria-label", T.title);
    panel.hidden = true;
    panel.innerHTML =
      '<div class="demo-inspect-head"><strong>' + T.title + "</strong>" +
      '<button type="button" class="demo-inspect-btn" data-act="copy">' + T.copy + "</button>" +
      '<button type="button" class="demo-inspect-btn" data-act="parent">' + T.parent + "</button>" +
      '<button type="button" class="demo-inspect-btn" data-act="close">' + T.close + "</button></div>" +
      '<nav class="demo-inspect-crumbs" aria-label="' + T.ancestors + '"></nav>' +
      '<div class="demo-inspect-body"><p class="demo-inspect-hint">' + T.hint + "</p></div>";
    document.body.appendChild(panel);

    panel.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      var act = btn && btn.getAttribute("data-act");
      if (act === "close") toggle(false);
      if (act === "parent" && current && current.parentElement && current.parentElement !== document.body) show(current.parentElement);
      if (act === "copy" && current) {
        var code = panel.querySelector(".demo-inspect-code");
        if (code && navigator.clipboard) {
          navigator.clipboard.writeText(code.textContent).then(function () {
            btn.textContent = T.copied;
            setTimeout(function () { btn.textContent = T.copy; }, 1200);
          });
        }
      }
      var crumb = e.target.closest("[data-crumb]");
      if (crumb) show(crumbs[+crumb.getAttribute("data-crumb")]);
    });
    return panel;
  }

  function describe(el) {
    var cls = Array.prototype.filter.call(el.classList, function (c) { return c.indexOf("ncss-") === 0; }).slice(0, 2);
    return el.localName + (el.id ? "#" + el.id : "") + cls.map(function (c) { return "." + c; }).join("");
  }

  function show(el) {
    current = el;
    loadExplanations(function () { if (current === el && panel && !panel.hidden) show(el); });
    ensurePanel().hidden = false;
    index = index || buildIndex();

    crumbs = [];
    for (var n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) crumbs.unshift(n);
    panel.querySelector(".demo-inspect-crumbs").innerHTML = crumbs.slice(-6).map(function (c) {
      return '<button type="button" data-crumb="' + crumbs.indexOf(c) + '"' + (c === el ? ' aria-current="true"' : "") + ">" + esc(describe(c)) + "</button>";
    }).join('<span aria-hidden="true">›</span>');

    var html = format(clean(el), 0, { lines: 400 });

    // Klassen + data-ncss-* im gesamten Teilbaum
    var nodes = [el].concat(Array.prototype.slice.call(el.querySelectorAll("*")));
    var classes = {}, attrs = {}, elements = {};
    nodes.forEach(function (node) {
      if (node.localName && node.localName.indexOf("ncss-") === 0) elements[node.localName] = true;
      Array.prototype.forEach.call(node.classList || [], function (c) { if (c.indexOf("ncss-") === 0) classes[c] = true; });
      Array.prototype.forEach.call(node.attributes || [], function (a) {
        var m = /^data-ncss-([a-z-]+)$/.exec(a.name);
        if (m) attrs[m[1]] = true;
      });
    });

    var files = {};
    var classRows = Object.keys(classes).sort().map(function (c) {
      var hrefs = index[c] || [];
      var paths = hrefs.map(distPath).filter(Boolean);
      paths.forEach(function (p) { files[p] = true; });
      return "<li><code>." + esc(c) + "</code><span>" + (paths.length ? paths.map(function (p) { return "dist/" + esc(p); }).join(", ") : T.notLoaded) + "</span>" + explainFor(c) + "</li>";
    }).join("");

    var scripts = Array.prototype.map.call(document.querySelectorAll("script[src]"), function (s) { return s.getAttribute("src"); })
      .filter(function (src) { return src.indexOf("/dist/js/") >= 0 || src.indexOf("dist/js/") === 0; });
    var scriptRows = Object.keys(attrs).sort().map(function (name) {
      var hit = scripts.filter(function (src) {
        var file = src.split("/").pop().replace(/\.js$/, "");
        return name === file || name.indexOf(file + "-") === 0 || file.indexOf(name) === 0;
      })[0];
      return "<li><code>data-ncss-" + esc(name) + "</code><span>" + (hit ? "dist/js/" + esc(hit.split("/").pop()) : T.noScript) + "</span>" + explainFor("data-ncss-" + name) + "</li>";
    }).join("");

    var elementRows = Object.keys(elements).sort().map(function (name) {
      return "<li><code>&lt;" + esc(name) + "&gt;</code>" + explainFor("<" + name + ">") + "</li>";
    }).join("");

    var fileRows = Object.keys(files).sort().map(function (p) {
      var note = fileNote(p);
      return note ? "<li><code>dist/" + esc(p) + "</code>" + note + "</li>" : "";
    }).join("");

    var imports = Object.keys(files).filter(function (p) { return !/^(colors|tokens|reset|base)\.css$/.test(p) && layerOf(p); })
      .sort().map(function (p) { return '@import url("' + p + '") layer(' + layerOf(p) + ");"; }).join("\n");

    panel.querySelector(".demo-inspect-body").innerHTML =
      "<div><h3>" + T.html + '</h3><pre class="demo-inspect-code">' + esc(html) + "</pre></div>" +
      (classRows ? "<div><h3>" + T.classes + '</h3><ul class="demo-inspect-list">' + classRows + "</ul></div>" : "") +
      (elementRows ? "<div><h3>" + T.elements + '</h3><ul class="demo-inspect-list">' + elementRows + "</ul></div>" : "") +
      (scriptRows ? "<div><h3>" + T.scripts + '</h3><ul class="demo-inspect-list">' + scriptRows + "</ul></div>" : "") +
      (fileRows ? "<div><h3>" + T.files + '</h3><ul class="demo-inspect-list">' + fileRows + "</ul></div>" : "") +
      (imports ? "<div><h3>" + T.imports + '</h3><pre class="demo-inspect-code">/* ' + T.needsBase + " */\n" + esc(imports) + "</pre></div>" : "");
  }

  /* --- Modus ---------------------------------------------------------------------------- */

  function own(t) {
    return t.closest(".demo-inspect-panel, [data-demo-inspect], [data-demo-inspect-ignore]");
  }

  function onMove(e) {
    var t = e.target;
    if (!(t instanceof Element) || own(t)) { if (hover) hover.classList.remove("demo-inspect-hover"); hover = null; return; }
    if (hover !== t) {
      if (hover) hover.classList.remove("demo-inspect-hover");
      hover = t;
      hover.classList.add("demo-inspect-hover");
    }
  }

  function onClick(e) {
    var t = e.target;
    if (!(t instanceof Element) || own(t)) return;
    e.preventDefault();
    e.stopPropagation();
    if (hover) hover.classList.remove("demo-inspect-hover");
    show(t);
  }

  function onKey(e) {
    if (e.key === "Escape" && active) toggle(false);
  }

  function toggle(force) {
    active = typeof force === "boolean" ? force : !active;
    document.documentElement.toggleAttribute("data-demo-inspecting", active);
    var opts = { capture: true };
    if (active) {
      ensurePanel().hidden = false;
      addEventListener("pointermove", onMove, opts);
      addEventListener("click", onClick, opts);
      addEventListener("keydown", onKey, opts);
    } else {
      if (hover) hover.classList.remove("demo-inspect-hover");
      hover = null;
      if (panel) panel.hidden = true;
      removeEventListener("pointermove", onMove, opts);
      removeEventListener("click", onClick, opts);
      removeEventListener("keydown", onKey, opts);
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-demo-inspect]"), function (b) {
      b.setAttribute("aria-pressed", String(active));
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target instanceof Element && e.target.closest("[data-demo-inspect]");
    if (btn) { e.preventDefault(); toggle(); }
  });

  addEventListener("keydown", function (e) {
    if (e.altKey && e.code === "KeyI") { e.preventDefault(); toggle(); }
  });
})();
