/* Retries vs memory: illustrates the survey's reuse gain (Sec. 7.3) with a toy model.
   Not the paper's numbers. Embedded in index.md as #rd-reuse. */
(function () {
  const ROOT_ID = "rd-reuse";
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

  // ---------- widget ----------
  function mount(root) {
    const mk = (label, min, max, val, aria) => {
      const s = el("input", { type: "range", min, max, value: val, "aria-label": aria });
      const o = el("output", { text: val });
      return { s, o, wrap: el("label", {}, [label + " ", s, " ", o]) };
    };
    const p = mk("first-try success p (%)", 5, 80, 40, "First-attempt success rate in percent");
    const g = mk("memory gain g (pp)", 0, 40, 0, "Per-attempt gain from kept memory in percentage points");
    const svg = el("svg", { role: "img", "aria-label": "Cumulative and per-attempt success over ten attempts, with memory kept or cleared" });
    const legend = el("p", { class: "rd-widget__readout" });
    const out = el("p", { class: "rd-widget__readout" });
    root.append(el("p", { class: "rd-widget__title", text: "Retries vs memory: what does a learning curve over attempts prove?" }),
      el("div", { class: "rd-widget__controls" }, [p.wrap, g.wrap]), svg, legend, out);
    legend.innerHTML = "<strong>Solid</strong>: memory kept. <strong>Dashed</strong>: memory cleared before each attempt. " +
      "Blue = cumulative success (solved at least once); violet = success on attempt n itself.";
    function update() {
      const P = +p.s.value / 100, G = +g.s.value / 100; p.o.textContent = p.s.value; g.o.textContent = g.s.value;
      const n = Array.from({ length: 10 }, (_, i) => i + 1);
      const perReset = n.map(() => P), perKeep = n.map((k) => (k === 1 ? P : Math.min(0.99, P + G)));
      const cum = (arr) => { let fail = 1; return arr.map((s) => { fail *= 1 - s; return 1 - fail; }); };
      const cR = cum(perReset), cK = cum(perKeep);
      plot(svg, { series: [
        { x: n, y: cK.map((v) => 100 * v), cls: "s-paper", dots: true },
        { x: n, y: cR.map((v) => 100 * v), cls: "s-paper", dash: true },
        { x: n, y: perKeep.map((v) => 100 * v), cls: "s-take", dots: true },
        { x: n, y: perReset.map((v) => 100 * v), cls: "s-take", dash: true } ],
        xlabel: "attempt n", ylabel: "success (%)", ymin: 0, ymax: 100, xmin: 1, xmax: 10, h: 280 });
      const fromRetries = 100 * (cR[9] - P), fromMemory = 100 * (cK[9] - cR[9]);
      out.innerHTML = `After 10 attempts, cumulative success is <strong>${(100 * cK[9]).toFixed(1)}%</strong> with memory kept ` +
        `and <strong>${(100 * cR[9]).toFixed(1)}%</strong> with memory cleared. Of the rise from ${(100 * P).toFixed(0)}%, ` +
        `${fromRetries.toFixed(1)} pp comes from extra chances alone and ${fromMemory.toFixed(1)} pp from memory. ` +
        `The survey's reuse gain at attempt 10 is S<sub>10</sub><sup>keep</sup> − S<sub>10</sub><sup>reset</sup> = ` +
        `<strong>${(100 * (perKeep[9] - perReset[9])).toFixed(0)} pp</strong>.`;
    }
    [p.s, g.s].forEach((s) => s.addEventListener("input", update));
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
