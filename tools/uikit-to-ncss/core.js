/**
 * NativeCSS - UIkit-3-Konverter, Kern (läuft unverändert in Node und im Browser).
 * Portiert vom Tokenizer des Schwesterprojekts MarijaCSS (migrate/core.js), mit eigenem
 * NativeCSS-Regelwerk (rules.js, nach docs/de/uikit-migration.html).
 *
 * Kein DOM: ein toleranter Tokenizer schreibt Start-Tags an Ort und Stelle um und lässt
 * ALLES andere Byte für Byte stehen - Leerraum, Kommentare und Template-Code (<?php ?>,
 * <?= ?>, {{ }}, {% %}, {# #}, <% %>, REDAXO-REX_VALUE[...]). Ein Vorab-Durchlauf baut
 * einen leichten Elementbaum (Eltern/Kinder/passendes End-Tag), damit Regeln strukturell
 * umbauen können: Tag umbenennen (<div uk-modal> -> <dialog>), Wrapper auflösen
 * (.uk-modal-dialog), Inhalt einfügen (Schließen-Icon), Kinder markieren (Akkordeon-
 * Einträge -> <details>).
 *
 *   import { convert } from "./core.js";
 *   const { html, report } = convert(source, { filename: "seite.php", lang: "de" });
 *   report: [{ level: "error"|"warning"|"info", line, message, file }]
 *   "warning" = braucht einen Menschen (Verhalten/Struktur nicht automatisch übertragbar).
 */

import { rules as defaultRules } from "./rules.js";

/* --------------------------------------------------------------------------
   Tokenizer
   -------------------------------------------------------------------------- */

const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
export const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** Quelltext in Tokens zerlegen. Jedes Token behält seinen exakten Quelltext in raw. */
export function tokenize(src) {
  const tokens = [];
  let i = 0;
  let text = "";
  const flushText = () => { if (text) { tokens.push({ type: "text", raw: text }); text = ""; } };

  while (i < src.length) {
    const c = src[i];

    // Template-Code: <?php ... ?>, <%= ... %> - undurchsichtig
    if (c === "<" && (src[i + 1] === "?" || src[i + 1] === "%")) {
      const close = src[i + 1] === "?" ? "?>" : "%>";
      const end = src.indexOf(close, i + 2);
      const stop = end < 0 ? src.length : end + 2;
      flushText();
      tokens.push({ type: "template", raw: src.slice(i, stop) });
      i = stop;
      continue;
    }
    // Twig/Blade/Jinja außerhalb von Tags: {% ... %}, {# ... #} undurchsichtig ({{ }} bleibt Text)
    if (c === "{" && (src[i + 1] === "%" || src[i + 1] === "#")) {
      const close = src[i + 1] === "%" ? "%}" : "#}";
      const end = src.indexOf(close, i + 2);
      if (end > 0) {
        flushText();
        tokens.push({ type: "template", raw: src.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
    }

    if (c === "<" && src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      const stop = end < 0 ? src.length : end + 3;
      flushText();
      tokens.push({ type: "comment", raw: src.slice(i, stop) });
      i = stop;
      continue;
    }

    if (c === "<" && src[i + 1] === "!") {
      const end = src.indexOf(">", i);
      const stop = end < 0 ? src.length : end + 1;
      flushText();
      tokens.push({ type: "doctype", raw: src.slice(i, stop) });
      i = stop;
      continue;
    }

    if (c === "<" && src[i + 1] === "/" && /[a-zA-Z]/.test(src[i + 2] ?? "")) {
      const end = src.indexOf(">", i);
      const stop = end < 0 ? src.length : end + 1;
      const raw = src.slice(i, stop);
      flushText();
      tokens.push({ type: "end", raw, name: raw.slice(2).match(/^[^\s>/]+/)[0].toLowerCase() });
      i = stop;
      continue;
    }

    if (c === "<" && /[a-zA-Z]/.test(src[i + 1] ?? "")) {
      const tag = readStartTag(src, i);
      if (tag) {
        flushText();
        tokens.push(tag);
        i = tag.end;
        if (RAW_TEXT.has(tag.name) && !tag.selfClosing) {
          const re = new RegExp(`</${tag.name}\\s*>`, "i");
          const rest = src.slice(i);
          const m = rest.match(re);
          const len = m ? m.index : rest.length;
          if (len) tokens.push({ type: "rawtext", raw: rest.slice(0, len), parent: tag.name });
          i += len;
        }
        continue;
      }
    }

    text += c;
    i++;
  }
  flushText();
  return tokens;
}

function readStartTag(src, start) {
  let i = start + 1;
  const nameMatch = src.slice(i).match(/^[a-zA-Z][^\s/>]*/);
  if (!nameMatch) return null;
  const name = nameMatch[0];
  i += name.length;
  const attrs = [];

  while (i < src.length) {
    const ws = src.slice(i).match(/^\s*/)[0];
    i += ws.length;
    if (src[i] === ">") { i++; return { type: "start", name: name.toLowerCase(), tagName: name, attrs, selfClosing: false, end: i, raw: src.slice(start, i), start }; }
    if (src[i] === "/" && src[i + 1] === ">") { i += 2; return { type: "start", name: name.toLowerCase(), tagName: name, attrs, selfClosing: true, end: i, raw: src.slice(start, i), start }; }
    if (i >= src.length) break;

    // Template-Code im Tag: undurchsichtiges Pseudo-Attribut
    if (src[i] === "<" && (src[i + 1] === "?" || src[i + 1] === "%")) {
      const close = src[i + 1] === "?" ? "?>" : "%>";
      const end = src.indexOf(close, i + 2);
      const stop = end < 0 ? src.length : end + 2;
      attrs.push({ template: src.slice(i, stop), ws });
      i = stop;
      continue;
    }
    if (src[i] === "{" && (src[i + 1] === "{" || src[i + 1] === "%" || src[i + 1] === "#")) {
      const close = src[i + 1] === "{" ? "}}" : src[i + 1] === "%" ? "%}" : "#}";
      const end = src.indexOf(close, i + 2);
      const stop = end < 0 ? src.length : end + 2;
      attrs.push({ template: src.slice(i, stop), ws });
      i = stop;
      continue;
    }

    const an = src.slice(i).match(/^[^\s"'>/=]+/);
    if (!an) { i++; continue; }
    const attr = { name: an[0], ws, value: null, quote: "" };
    i += an[0].length;
    const eq = src.slice(i).match(/^\s*=\s*/);
    if (eq) {
      i += eq[0].length;
      attr.eq = eq[0];
      const q = src[i];
      if (q === '"' || q === "'") {
        let j = i + 1;
        // Template-Code mit dem Anführungszeichen darin überspringen
        while (j < src.length && src[j] !== q) {
          if (src[j] === "<" && src[j + 1] === "?") { const e = src.indexOf("?>", j); j = e < 0 ? src.length : e + 2; continue; }
          if (src[j] === "{" && (src[j + 1] === "{" || src[j + 1] === "%")) { const e = src.indexOf(src[j + 1] === "{" ? "}}" : "%}", j); j = e < 0 ? src.length : e + 2; continue; }
          j++;
        }
        attr.value = src.slice(i + 1, j);
        attr.quote = q;
        i = j + 1;
      } else {
        const v = src.slice(i).match(/^[^\s>]*/)[0];
        attr.value = v;
        i += v.length;
      }
    }
    attrs.push(attr);
  }
  return null; // unvollständiges Tag -> bleibt Text
}

/** Vorab-Durchlauf: Elternelement, Kinder und passendes End-Tag je Start-Tag. */
export function buildTree(tokens) {
  const stack = [];
  const ids = new Map();
  for (const t of tokens) {
    if (t.type === "start") {
      t.parent = stack[stack.length - 1] ?? null;
      t.children = [];
      if (t.parent) t.parent.children.push(t);
      const id = t.attrs.find((a) => !a.template && a.name.toLowerCase() === "id")?.value;
      if (id && !ids.has(id)) ids.set(id, t);
      if (!t.selfClosing && !VOID.has(t.name)) stack.push(t);
    } else if (t.type === "end") {
      let k = stack.length - 1;
      while (k >= 0 && stack[k].name !== t.name) k--;
      if (k >= 0) {
        stack[k].endToken = t;
        t.startToken = stack[k];
        stack.length = k;
      }
    }
  }
  return ids;
}

/** Serialisiert ein (evtl. geändertes) Start-Tag. Unveränderte Tags behalten ihren Rohtext. */
function serializeStart(tag) {
  if (tag.unwrapped) return "";
  if (!tag.dirty) return tag.raw;
  let out = `<${tag.tagName}`;
  for (const a of tag.attrs) {
    if (a.removed) continue;
    const ws = a.ws || " ";
    if (a.template) { out += ws + a.template; continue; }
    out += ws + a.name;
    if (a.value !== null && a.value !== undefined) {
      const q = a.quote || '"';
      out += `${a.eq ?? "="}${q}${a.value}${q}`;
    }
  }
  return out + (tag.selfClosing ? " />" : ">");
}

/* --------------------------------------------------------------------------
   Klassenlisten mit Template-Code darin (class="uk-card <?= $x ?>")
   -------------------------------------------------------------------------- */

const TPL_IN_VALUE = /<\?[\s\S]*?\?>|\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|<%[\s\S]*?%>/g;
export const MARK = "\u0000";

function splitClassValue(value) {
  const saved = [];
  const masked = (value ?? "").replace(TPL_IN_VALUE, (m) => { saved.push(m); return `${MARK}${saved.length - 1}${MARK}`; });
  return { list: masked.split(/\s+/).filter(Boolean), saved };
}
function joinClassValue(list, saved) {
  return list.join(" ").replace(new RegExp(`${MARK}(\\d+)${MARK}`, "g"), (_, n) => saved[Number(n)]);
}
export const isDynamic = (cls) => cls.includes(MARK);

/* --------------------------------------------------------------------------
   Hilfsobjekt für Regeln
   -------------------------------------------------------------------------- */

function helper(tag, ctx) {
  const find = (name) => tag.attrs.find((a) => !a.removed && !a.template && a.name.toLowerCase() === name);
  const parsed = () => (tag._cls ??= splitClassValue(find("class")?.value));
  const api = {
    tag,
    ctx,
    get name() { return tag.name; },
    has: (name) => !!find(name),
    get: (name) => find(name)?.value ?? null,
    set(name, value = "") {
      const a = find(name);
      if (a) { if (a.value !== value) { a.value = value; tag.dirty = true; } }
      else { tag.attrs.push({ name, value, quote: '"', ws: " " }); tag.dirty = true; }
      if (name === "class") tag._cls = null;
    },
    setIfMissing(name, value) { if (!api.has(name)) api.set(name, value); },
    remove(name) { const a = find(name); if (a) { a.removed = true; tag.dirty = true; } if (name === "class") tag._cls = null; },
    classes() { return [...parsed().list]; },
    hasClass: (c) => parsed().list.includes(c),
    setClasses(list) {
      const { saved } = parsed();
      const uniq = [...new Set(list.filter(Boolean))];
      if (!uniq.length) { api.remove("class"); return; }
      const v = joinClassValue(uniq, saved);
      const a = find("class");
      if (a) { if (a.value !== v) { a.value = v; tag.dirty = true; } }
      else { tag.attrs.push({ name: "class", value: v, quote: '"', ws: " " }); tag.dirty = true; }
      tag._cls = { list: uniq, saved };
    },
    addClass(...cs) { api.setClasses([...api.classes(), ...cs.flatMap((c) => c.split(" "))]); },
    removeClass(...cs) { api.setClasses(api.classes().filter((c) => !cs.includes(c))); },
    replaceClass(from, to) { api.setClasses(api.classes().flatMap((c) => (c === from ? (to ? to.split(" ") : []) : [c]))); },
    retag(newName) {
      if (tag.name === newName) return;
      tag.renamedFrom ??= tag.name;
      tag.tagName = newName;
      tag.name = newName;
      tag.dirty = true;
      if (!tag.endToken && !tag.selfClosing && !VOID.has(tag.renamedFrom)) ctx.note("warning", `<${tag.renamedFrom}> -> <${newName}>: passendes End-Tag nicht gefunden (Template-Verzweigung?) - von Hand umbenennen.`, tag);
    },
    /** Element entfernen, Inhalt behalten. */
    unwrap() { tag.unwrapped = true; tag.dirty = true; },
    /** Einrückung der Zeile direkt nach dem Start-Tag (für eingefügte Zeilen). */
    indentAfter() {
      const next = ctx.tokens[ctx.tokens.indexOf(tag) + 1];
      const m = next?.type === "text" ? next.raw.match(/\n([ \t]*)\S?/) : null;
      return m ? m[1] : "";
    },
    /** HTML direkt nach dem Start-Tag einfügen. */
    prepend(html) { tag.prepend = (tag.prepend ?? "") + html; },
    /** HTML direkt vor dem End-Tag einfügen. */
    append(html) { tag.append = (tag.append ?? "") + html; },
    before(html) { tag.before = (tag.before ?? "") + html; },
    after(html) { tag.after = (tag.after ?? "") + html; },
    /** Kein Inhalt zwischen Start- und End-Tag (Leerraum zählt nicht). */
    isEmpty() {
      if (!tag.endToken) return tag.selfClosing || VOID.has(tag.name);
      const toks = ctx.tokens;
      for (let k = toks.indexOf(tag) + 1; k < toks.length && toks[k] !== tag.endToken; k++) {
        if (toks[k].type !== "text" || toks[k].raw.trim()) return false;
      }
      return true;
    },
    /** Textinhalt (ohne Tags/Template-Code) bis zum End-Tag. */
    text() {
      if (!tag.endToken) return "";
      const toks = ctx.tokens;
      let s = "";
      for (let k = toks.indexOf(tag) + 1; k < toks.length && toks[k] !== tag.endToken; k++) if (toks[k].type === "text") s += toks[k].raw;
      return s.replace(/\s+/g, " ").trim();
    },
    parent: () => (tag.parent ? helper(tag.parent, ctx) : null),
    children: () => tag.children.map((c) => helper(c, ctx)),
    descendants() {
      const out = [];
      const walk = (t) => t.children.forEach((c) => { out.push(helper(c, ctx)); walk(c); });
      walk(tag);
      return out;
    },
    closest(pred) {
      for (let t = tag.parent; t; t = t.parent) { const h = helper(t, ctx); if (pred(h)) return h; }
      return null;
    },
    /** Original-Attributwert (vor jeder Regel), auch für uk-/data-uk-Schreibweise. */
    uk(name) {
      const a = tag.attrs.find((x) => !x.template && (x.name.toLowerCase() === `uk-${name}` || x.name.toLowerCase() === `data-uk-${name}`));
      return a ? { name: a.name, value: a.value ?? "" } : null;
    },
    ukRemove(name) { const a = api.uk(name); if (a) api.remove(a.name.toLowerCase()); },
    /** Ursprüngliche Klassen (vor allen Regeln). */
    origClasses() { return (tag._origCls ??= splitClassValue(tag.attrs.find((a) => !a.template && a.name.toLowerCase() === "class")?.value).list); },
    hadClass: (c) => api.origClasses().includes(c),
    mark: (key, value = true) => { (tag.marks ??= {})[key] = value; },
    marked: (key) => tag.marks?.[key],
    ensureId(base) {
      let id = api.get("id");
      if (!id) {
        let n = 1;
        id = base;
        while (ctx.ids.has(id)) id = `${base}-${n++}`;
        api.set("id", id);
        ctx.ids.set(id, tag);
      }
      return id;
    },
    warn: (msg) => ctx.note("warning", msg, tag),
    info: (msg) => ctx.note("info", msg, tag),
    error: (msg) => ctx.note("error", msg, tag),
    require: (file, why) => ctx.require(file, why),
    t: (key) => ctx.t(key),
  };
  return api;
}

/* --------------------------------------------------------------------------
   Optionswerte (uk-foo="a: 1; b: 2")
   -------------------------------------------------------------------------- */

export function parseOpts(value) {
  const v = (value ?? "").trim();
  if (!v) return { primary: null, pairs: [], get: () => undefined };
  let primary = null, pairs = [];
  if (v.startsWith("{")) {
    try { pairs = Object.entries(JSON.parse(v)).map(([k, x]) => [k, String(x)]); } catch { primary = v; }
  } else if (!/^[\w-]+\s*:/.test(v)) primary = v;
  else {
    pairs = v.split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
      const i = p.indexOf(":");
      return i < 0 ? [p, ""] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    });
  }
  const norm = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).toLowerCase();
  return { primary, pairs, get: (k) => pairs.find(([x]) => norm(x) === norm(k))?.[1] };
}

/* --------------------------------------------------------------------------
   Konvertieren
   -------------------------------------------------------------------------- */

const TEXTS = {
  de: { close: "Schließen", menu: "Menü", openMenu: "Menü öffnen", overview: "Übersicht" },
  en: { close: "Close", menu: "Menu", openMenu: "Open menu", overview: "Overview" },
};

export function convert(source, { rules = defaultRules, filename = "input", lang = null } = {}) {
  const tokens = tokenize(source);
  const ids = buildTree(tokens);
  const report = [];
  const required = new Map();
  const counters = {};
  const detected = (source.match(/<html[^>]*\slang\s*=\s*["']?([a-z]{2})/i)?.[1] ?? "de").toLowerCase();
  const L = TEXTS[lang ?? detected] ?? TEXTS.de;
  const lineOf = new Map();

  const ctx = {
    tokens,
    ids,
    rules,
    note(level, message, tag) { report.push({ level, message, line: tag ? lineOf.get(tag) ?? null : null, file: filename }); },
    require(file, why) { if (!required.has(file)) required.set(file, why); },
    next(key) { counters[key] = (counters[key] ?? 0) + 1; return counters[key]; },
    t: (key) => L[key],
  };

  let line = 1;
  for (const t of tokens) {
    if (t.type === "start") lineOf.set(t, line);
    t.line = line;
    line += (t.raw.match(/\n/g) ?? []).length;
  }

  // Regeln auf jedes Start-Tag (in Dokument-Reihenfolge: Eltern vor Kindern)
  for (const t of tokens) {
    if (t.type !== "start") continue;
    const h = helper(t, ctx);
    for (const transform of rules.transforms) {
      try { transform(h, ctx); } catch (err) { ctx.note("error", `Regel fehlgeschlagen: ${err.message}`, t); }
    }
    rules.finalize(h, ctx);
  }

  // Aufgelöste Wrapper, die allein auf ihrer Zeile standen: Zeile ganz entfernen
  const dropLine = (k) => {
    const prev = tokens[k - 1], next = tokens[k + 1];
    if (prev?.type === "text" && next?.type === "text" && /\n[ \t]*$/.test(prev.raw) && /^[ \t]*\n/.test(next.raw)) {
      prev.raw = prev.raw.replace(/[ \t]*$/, "");
      next.raw = next.raw.replace(/^[ \t]*\n/, "");
    }
  };
  tokens.forEach((t, k) => {
    if (t.type === "start" && t.unwrapped && !t.prepend) dropLine(k);
    if (t.type === "end" && t.startToken?.unwrapped && !t.startToken.append) dropLine(k);
  });

  const out = [];
  for (const t of tokens) {
    if (t.type === "start") {
      out.push((t.before ?? "") + serializeStart(t) + (t.prepend ?? ""));
      if ((t.selfClosing || VOID.has(t.name)) && t.after) out.push(t.after);
    } else if (t.type === "end") {
      const s = t.startToken;
      if (!s) { out.push(t.raw); continue; }
      let raw = t.raw;
      if (s.unwrapped) raw = "";
      else if (s.renamedFrom) raw = raw.replace(/^<\/[^\s>]+/, `</${s.tagName}`);
      out.push((s.append ?? "") + raw + (s.after ?? ""));
    } else if (t.type === "rawtext" && t.parent === "script") {
      out.push(t.raw);
      t.raw.split("\n").forEach((l, n) => {
        for (const call of l.match(/UIkit\.\w+(?:\.\w+)?/g) ?? []) {
          const base = call.split(".").slice(0, 2).join(".");
          const hint = rules.api[call] ?? rules.api[base] ?? "keine direkte Entsprechung - native DOM-API bzw. ncss-Script verwenden.";
          report.push({ level: "warning", message: `${call}(): ${hint}`, line: t.line + n, file: filename });
        }
      });
    } else if (t.type === "rawtext" && t.parent === "style") {
      out.push(t.raw);
      t.raw.split("\n").forEach((l, n) => {
        if (/\.uk-[\w-]+|\[uk-/.test(l)) report.push({ level: "warning", message: `UIkit-Selektor im <style>: ${l.trim().slice(0, 80)} - auf die neuen ncss-Klassen umstellen.`, line: t.line + n, file: filename });
      });
    } else if (t.type === "template") {
      out.push(t.raw);
      if (/\buk-[a-z]/.test(t.raw)) {
        t.raw.split("\n").forEach((l, n) => {
          const m = l.match(/\b(?:data-)?uk-[a-z][\w-]*/g);
          if (m) report.push({ level: "warning", message: `UIkit-Namen in Template-Code (${[...new Set(m)].slice(0, 4).join(", ")}) - der Konverter ändert PHP/Twig nie, von Hand umstellen.`, line: t.line + n, file: filename });
        });
      }
    } else {
      out.push(t.raw);
    }
  }

  // Gleiche Meldung mehrfach: einmal melden, weitere Zeilen anhängen
  const merged = [];
  const seen = new Map();
  for (const r of report.sort((a, b) => (a.line ?? 1e9) - (b.line ?? 1e9))) {
    const key = `${r.level}|${r.message}`;
    const first = seen.get(key);
    if (first && r.line) { (first.lines ??= [first.line]).push(r.line); continue; }
    seen.set(key, r);
    merged.push(r);
  }
  for (const r of merged) if (r.lines) r.message += ` (auch Zeile ${r.lines.slice(1).join(", ")})`;
  report.length = 0;
  report.push(...merged);
  for (const [file, why] of required) report.push({ level: "info", message: `Benötigt: ${file} - ${why}`, line: null, file: filename });
  report.sort((a, b) => (a.line ?? 1e9) - (b.line ?? 1e9));
  return { html: out.join(""), report };
}

/** CSS/LESS/SCSS: nur melden, wo UIkit-Selektoren stehen (keine automatische Umschreibung -
 *  ncss-Klassen sind keine 1:1-Umbenennung, eigene Regeln müssen inhaltlich geprüft werden). */
export function scanStyles(source, { filename = "input" } = {}) {
  const report = [];
  source.split("\n").forEach((l, n) => {
    if (/@import[^;]*uikit/i.test(l)) report.push({ level: "warning", message: "UIkit-LESS/SCSS-Import - durch ncss.css (+ eigene theme.css) ersetzen.", line: n + 1, file: filename });
    else if (/\.uk-[\w-]+|\[(?:data-)?uk-/.test(l)) report.push({ level: "warning", message: `UIkit-Selektor: ${l.trim().slice(0, 90)}`, line: n + 1, file: filename });
    else if (/@(?:global|inverse|base|button|card|navbar|text)-[\w-]+\s*:/.test(l) || /\$(?:global|inverse)-[\w-]+\s*:/.test(l)) report.push({ level: "info", message: `UIkit-Variable -> NativeCSS-Token (--ncss-*) in theme.css: ${l.trim().slice(0, 80)}`, line: n + 1, file: filename });
  });
  return { report };
}
