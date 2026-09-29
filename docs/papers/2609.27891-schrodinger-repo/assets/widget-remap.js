/* Research Daily widget starter. Copy to widget-<name>.js, rename ROOT_ID,
   and write mount(). Self-contained: no dependencies, theme-aware, works on
   phones, keyboard accessible. Embed in index.md with:

   <div class="rd-widget" id="ROOT_ID" role="group" aria-label="What it shows"><noscript>This widget needs JavaScript.</noscript></div>
   <script src="assets/widget-<name>.js"></script>
   <p class="rd-widget-caption"><strong>Try this:</strong> what to do and what to notice.</p>
*/
(function () {
  const ROOT_ID = "sr-remap";

  // ---------- helpers (keep; they make widgets consistent) ----------
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, kids = []) => {
    const svgTags = ["svg", "g", "path", "line", "rect", "circle", "text", "polyline", "polygon", "title"];
    const node = svgTags.includes(tag) ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    [].concat(kids).forEach((c) => c && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  };
  const fmt = (v) => {
    const a = Math.abs(v);
    if (a >= 1e12) return +(v / 1e12).toPrecision(3) + "T";
    if (a >= 1e9) return +(v / 1e9).toPrecision(3) + "B";
    if (a >= 1e6) return +(v / 1e6).toPrecision(3) + "M";
    if (a >= 1e4) return +(v / 1e3).toPrecision(3) + "k";
    if (a < 1e-2 && v !== 0) return v.toExponential(0);
    return +v.toFixed(3) + "";
  };

  // Theme-aware SVG line/scatter plot. Colours come from CSS classes
  // (s-paper, s-take, f-code, ...) defined in the site stylesheet, so the
  // plot follows the light/dark toggle with no redraw. Supports log axes.
  // series: [{x:[], y:[], cls:"s-paper", label:"...", dots:false, dash:false}]
  function plot(svg, { series, xlog = false, ylog = false, xlabel = "", ylabel = "", w = 640, h = 300,
                       xmin, xmax, ymin, ymax, marks = [] }) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("class", "rd-svg");
    const m = { l: 56, r: 16, t: 14, b: 44 };
    const all = (k) => series.flatMap((s) => s[k]).filter((v) => Number.isFinite(v) && (!(k === "x" ? xlog : ylog) || v > 0));
    const tx = xlog ? Math.log10 : (v) => v, ty = ylog ? Math.log10 : (v) => v;
    const x0 = tx(xmin ?? Math.min(...all("x"))), x1 = tx(xmax ?? Math.max(...all("x")));
    const y0 = ty(ymin ?? Math.min(...all("y"))), y1 = ty(ymax ?? Math.max(...all("y")));
    const X = (v) => m.l + ((tx(v) - x0) / (x1 - x0 || 1)) * (w - m.l - m.r);
    const Y = (v) => h - m.b - ((ty(v) - y0) / (y1 - y0 || 1)) * (h - m.t - m.b);
    const ticks = (a, b, log) => {
      if (log) { const out = []; for (let e = Math.ceil(a); e <= Math.floor(b); e++) out.push(10 ** e); return out; }
      const step = 10 ** Math.floor(Math.log10((b - a) / 4 || 1)); const n = Math.ceil((b - a) / step);
      const s = n > 8 ? step * (n > 16 ? 5 : 2) : step; const out = [];
      for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) out.push(+v.toFixed(10)); return out;
    };
    const g = el("g");
    ticks(x0, x1, xlog).forEach((v) => {
      g.appendChild(el("line", { x1: X(v), x2: X(v), y1: m.t, y2: h - m.b, class: "s-faint", "stroke-width": 0.5 }));
      g.appendChild(el("text", { x: X(v), y: h - m.b + 16, "text-anchor": "middle", "font-size": 11, class: "t-muted", text: fmt(v) }));
    });
    ticks(y0, y1, ylog).forEach((v) => {
      g.appendChild(el("line", { x1: m.l, x2: w - m.r, y1: Y(v), y2: Y(v), class: "s-faint", "stroke-width": 0.5 }));
      g.appendChild(el("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, class: "t-muted", text: fmt(v) }));
    });
    g.appendChild(el("text", { x: (m.l + w - m.r) / 2, y: h - 6, "text-anchor": "middle", "font-size": 12, text: xlabel }));
    g.appendChild(el("text", { x: 14, y: (m.t + h - m.b) / 2, "text-anchor": "middle", "font-size": 12,
                               transform: `rotate(-90 14 ${(m.t + h - m.b) / 2})`, text: ylabel }));
    svg.appendChild(g);
    series.forEach((s) => {
      const pts = s.x.map((xv, i) => [xv, s.y[i]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
      if (!s.dotsOnly) svg.appendChild(el("polyline", { points: pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(" "),
        class: `${s.cls || "s-paper"} f-none`, "stroke-width": s.width || 2, "stroke-dasharray": s.dash ? "5 4" : "" }));
      if (s.dots || s.dotsOnly) pts.forEach(([a, b]) => svg.appendChild(el("circle", { cx: X(a), cy: Y(b), r: 3.2,
        class: (s.cls || "s-paper").replace("s-", "f-") })));
    });
    marks.forEach((mk) => svg.appendChild(el("line", { x1: X(mk.x), x2: X(mk.x), y1: m.t, y2: h - m.b,
      class: mk.cls || "s-predict", "stroke-width": 1.5, "stroke-dasharray": "3 3" })));
    return { X, Y };
  }

  const reducedMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- your widget ----------
  // Toy Level 2 mapper: split identifiers into subword tokens, give each token ONE
  // seeded replacement for the whole "repo", rebuild with the original casing.
  const VOCAB = {
    query: ["ledger", "lookup", "probe", "inquiry"], set: ["suite", "batch", "bundle", "group"],
    field: ["entry", "column", "slot", "attr"], model: ["record", "entity", "object", "schema"],
    models: ["records", "entities", "objects", "schemas"], get: ["render", "fetch", "obtain", "read"],
    display: ["label", "caption", "shown", "view"], db: ["storage", "store", "vault", "persist"],
    django: ["engine", "core", "app", "hub"], fields: ["entries", "columns", "slots", "attrs"],
    raw: ["plain", "bare", "crude", "base"], manager: ["handler", "keeper", "steward", "broker"],
    form: ["sheet", "panel", "slip", "blank"], choices: ["options", "picks", "variants", "menu"],
    char: ["text", "glyph", "rune", "letter"], foreign: ["remote", "outside", "linked", "external"],
    key: ["ref", "anchor", "pointer", "handle"], contribute: ["attach", "bind", "register", "graft"],
    to: ["into", "onto", "for", "at"], class: ["kind", "type", "sort", "genre"],
  };
  const KEEP = new Set(["len", "dict", "self", "setattr", "getattr", "numpy", "os", "path", "str", "int", "py"]);
  const DEFAULT = "django/db/models/query.py\nQuerySet\nRawQuerySet\nget_FOO_display\nCharField\nForeignKey\nModelForm\ncontribute_to_class\nsetattr\nlen";

  function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function tokenMap(seed) {
    const rnd = mulberry(seed * 7919 + 13), used = new Set(), map = {};
    Object.keys(VOCAB).sort().forEach((tok) => {
      const alts = VOCAB[tok].slice(); for (let i = alts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [alts[i], alts[j]] = [alts[j], alts[i]]; }
      const pick = alts.find((a) => !used.has(a)) || tok; used.add(pick); map[tok] = pick;
    });
    return map;
  }
  const WORD = /[A-Z]?[a-z]+|[A-Z]+(?![a-z])|[0-9]+/g;
  function remapIdent(s, map, hits) {
    if (KEEP.has(s)) return s;
    return s.replace(WORD, (w) => {
      const low = w.toLowerCase(); if (!(low in map)) return w;
      hits.add(low);
      const n = map[low]; return w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n;
    });
  }
  function remapLine(line, map, hits) { return line.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (id) => remapIdent(id, map, hits)); }

  function mount(root) {
    const seed = el("input", { type: "range", min: 0, max: 9, value: 0, "aria-label": "Mapping seed" });
    const out = el("output", { text: "0" });
    const ta = el("textarea", { rows: 8, "aria-label": "Identifiers to remap, one per line", spellcheck: "false",
      style: "width:100%;font-family:var(--md-code-font-family);font-size:0.8rem;box-sizing:border-box;padding:0.4rem;background:var(--md-code-bg-color);color:var(--md-code-fg-color);border:1px solid var(--md-default-fg-color--lightest);border-radius:6px" });
    ta.value = DEFAULT;
    const table = el("div", { style: "overflow-x:auto" });
    const readout = el("p", { class: "rd-widget__readout" });
    root.append(
      el("p", { class: "rd-widget__title", text: "Level 2 in your browser: one seed, one consistent virtual namespace" }),
      el("div", { class: "rd-widget__controls" }, [el("label", {}, ["seed ", seed]), out]),
      ta, table, readout);
    function update() {
      out.textContent = seed.value;
      const map = tokenMap(+seed.value), hits = new Set();
      const rows = ta.value.split("\n").filter((l) => l.trim()).slice(0, 14).map((l) => [l.trim(), remapLine(l.trim(), map, hits)]);
      table.innerHTML = "";
      const t = el("table", { style: "width:100%;font-size:0.78rem;margin-top:0.5rem" }, [
        el("thead", {}, el("tr", {}, [el("th", { text: "canonical (seen in training)" }), el("th", { text: "agent's view" })])),
        el("tbody", {}, rows.map(([a, b]) => el("tr", {}, [el("td", {}, el("code", { text: a })), el("td", {}, el("code", { text: b }))])))]);
      table.appendChild(t);
      const shown = [...hits].sort().map((k) => `${k}→${map[k]}`).join(", ");
      readout.textContent = hits.size ? `Token map used: ${shown}. Every identifier sharing a token changes the same way.` : "No repo-owned tokens found; built-ins and third-party names stay unchanged.";
    }
    seed.addEventListener("input", update); ta.addEventListener("input", update);
    update();
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.ready) return;
    try { mount(root); root.dataset.ready = "1"; }
    catch (e) { root.textContent = "This widget failed to load: " + e.message; console.error(e); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
