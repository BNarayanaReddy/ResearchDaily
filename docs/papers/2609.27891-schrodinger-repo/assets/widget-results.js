/* Research Daily widget starter. Copy to widget-<name>.js, rename ROOT_ID,
   and write mount(). Self-contained: no dependencies, theme-aware, works on
   phones, keyboard accessible. Embed in index.md with:

   <div class="rd-widget" id="ROOT_ID" role="group" aria-label="What it shows"><noscript>This widget needs JavaScript.</noscript></div>
   <script src="assets/widget-<name>.js"></script>
   <p class="rd-widget-caption"><strong>Try this:</strong> what to do and what to notice.</p>
*/
(function () {
  const ROOT_ID = "sr-results";

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
  // Table I of arXiv:2609.27891v1 (SWE-bench Verified). Gemini: baseline + full only, 300-instance subset (§IV-A).
  const LEVELS = ["Baseline", "L1 reword", "L2 rename", "L3 reorder", "L4 rewrite", "Full"];
  const DATA = {
    "GPT 5.1":        { pass: [44.6, 44.6, 37.2, 43.0, 43.4, 36.2], act: [20.48, 20.31, 33.45, 21.81, 21.68, 33.09], tok: [178247, 177102, 467563, 203968, 203535, 465712] },
    "GPT-5.4-mini":   { pass: [46.8, 46.8, 40.4, 43.4, 44.6, 35.6], act: [11.25, 11.56, 14.92, 13.27, 12.66, 19.83], tok: [65905, 66973, 137190, 106676, 92138, 234216] },
    "DeepSeek-v4-Flash": { pass: [72.8, 70.8, 66.8, 72.0, 70.0, 66.8], act: [46.19, 61.54, 98.13, 47.52, 48.88, 99.78], tok: [1046985, 1494954, 3332478, 1099395, 1227483, 3702241] },
    "Gemini-3.1-Flash-Lite*": { pass: [56.7, null, null, null, null, 42.3], act: [51.01, null, null, null, null, 92.37], tok: [1141585.57, null, null, null, null, 2694826.90] },
  };
  const METRICS = { pass: "Pass@1 (%)", act: "avg. actions", tok: "avg. input tokens" };

  function mount(root) {
    let model = "GPT-5.4-mini", metric = "pass";
    const mBtns = el("div", { class: "rd-widget__controls" }), kBtns = el("div", { class: "rd-widget__controls" });
    const svg = el("svg", { role: "img", "aria-label": "Bar chart of the chosen metric for each transformation level" });
    const readout = el("p", { class: "rd-widget__readout" });
    const mkBtn = (label, pressed, on) => el("button", { type: "button", "aria-pressed": String(pressed), onclick: on, text: label,
      style: "padding:0.3em 0.8em;min-height:32px;font-size:0.72rem;margin:0.15rem;border-radius:6px;cursor:pointer;font-family:inherit;" +
        "color:var(--md-default-fg-color);background:" + (pressed ? "var(--md-accent-fg-color--transparent)" : "transparent") + ";" +
        "border:" + (pressed ? "2px solid var(--md-accent-fg-color)" : "1px solid var(--md-default-fg-color--lighter)") + ";font-weight:" + (pressed ? "700" : "400") });
    function buttons() {
      mBtns.innerHTML = ""; kBtns.innerHTML = "";
      Object.keys(DATA).forEach((k) => mBtns.appendChild(mkBtn(k, k === model, () => { model = k; buttons(); draw(); })));
      Object.keys(METRICS).forEach((k) => kBtns.appendChild(mkBtn(METRICS[k], k === metric, () => { metric = k; buttons(); draw(); })));
    }
    function draw() {
      const vals = DATA[model][metric], w = 640, h = 300, m = { l: 20, r: 20, t: 30, b: 50 };
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("class", "rd-svg");
      const max = Math.max(...vals.filter((v) => v != null)) * 1.15, bw = (w - m.l - m.r) / LEVELS.length;
      const base = vals[0];
      svg.appendChild(el("line", { x1: m.l, x2: w - m.r, y1: h - m.b - (base / max) * (h - m.t - m.b), y2: h - m.b - (base / max) * (h - m.t - m.b), class: "s-muted", "stroke-dasharray": "4 4" }));
      LEVELS.forEach((lab, i) => {
        const x = m.l + i * bw + 8, v = vals[i];
        svg.appendChild(el("text", { x: x + (bw - 16) / 2, y: h - m.b + 22, "text-anchor": "middle", "font-size": 14, text: lab }));
        if (v == null) { svg.appendChild(el("text", { x: x + (bw - 16) / 2, y: h - m.b - 10, "text-anchor": "middle", "font-size": 13, class: "t-muted", text: "not run" })); return; }
        const bh = (v / max) * (h - m.t - m.b);
        const cls = i === 0 ? "f-paper" : i === 2 || i === 5 ? "f-predict" : "f-take";
        svg.appendChild(el("rect", { x, y: h - m.b - bh, width: bw - 16, height: bh, class: cls, "fill-opacity": i === 0 ? 1 : 0.8 }));
        const delta = i === 0 ? "" : metric === "pass" ? ` (${(v - base >= 0 ? "+" : "")}${(v - base).toFixed(1)})` : ` (${(v / base >= 1 ? "+" : "")}${((v / base - 1) * 100).toFixed(0)}%)`;
        svg.appendChild(el("text", { x: x + (bw - 16) / 2, y: h - m.b - bh - 8, "text-anchor": "middle", "font-size": 13, text: fmt(v) + delta }));
      });
      const full = vals[5], b0 = vals[0];
      readout.textContent = metric === "pass"
        ? `${model}: Pass@1 ${b0}% → ${full}% with all four levels (${(full - b0).toFixed(1)} points). Dashed line = baseline.`
        : `${model}: ${METRICS[metric]} ×${(full / b0).toFixed(2)} with all four levels. Dashed line = baseline.`;
      if (model.startsWith("Gemini")) readout.textContent += " *Gemini ran only on the 300 instances with the strongest leakage evidence (§IV-A).";
    }
    root.append(el("p", { class: "rd-widget__title", text: "Table I explorer: which lens hurts, and what it costs" }), mBtns, kBtns, svg, readout);
    buttons(); draw();
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
