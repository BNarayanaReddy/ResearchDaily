/* ODP latency explorer. A simple cost model (ours, not the paper's code) for
   Qwen3-8B prefill on DGX Spark, built from numbers in arXiv:2609.26333v1:
   - per-layer latency at S=16384 from Table 11 (Qwen-3-8B rows):
       BF16 full stack/layer 105.57 ms, attention 25.59 ms
       NVFP4 full stack/layer 71.09 ms, attention 24.59 ms
     non-attention part scaled linearly in T, attention quadratically (all-global causal).
   - 36 layers (Table 6); prefill checkpoint 3.64 GB + carve-out 0.20 GB (App. C.1).
   - default SSD read speed 5.7 GB/s: the repo's offload_forward.py docstring
     (~68 ms per 368 MiB block), not a number from the paper.
   ODP: two device slots; block i+1 loads while block i computes; the carve-out
   is restored after the last block. */
(function () {
  const ROOT_ID = "dq-odp";
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

  const LAYERS = 36, S0 = 16384;
  const BF16 = { lin: 105.57 - 25.59, attn: 25.59 };   // ms per layer at S0 (Table 11)
  const FP4 = { lin: 71.09 - 24.59, attn: 24.59 };
  const CKPT_GB = 3.64, CARVE_GB = 0.20;                 // App. C.1
  const perLayer = (m, T) => m.lin * (T / S0) + m.attn * (T / S0) ** 2;
  const resident = (m, T) => LAYERS * perLayer(m, T);

  // Event simulation of the two-slot pipeline. Returns total ms and block events.
  function odp(T, bw) {
    const load = (CKPT_GB / LAYERS) / bw * 1000, comp = perLayer(FP4, T);
    const ev = []; let ssd = 0; const compEnd = [];
    for (let i = 0; i < LAYERS; i++) {
      const slotFree = i >= 2 ? compEnd[i - 2] : 0;       // slot reused two blocks later
      const ls = Math.max(ssd, slotFree), le = ls + load; ssd = le;
      const cs = Math.max(le, i ? compEnd[i - 1] : 0), ce = cs + comp;
      compEnd.push(ce); ev.push({ ls, le, cs, ce });
    }
    const restore = CARVE_GB / bw * 1000;
    return { total: compEnd[LAYERS - 1] + restore, ev, load, comp, restore };
  }

  function linePlot(svg, T, bw) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const w = 640, h = 280, m = { l: 58, r: 14, t: 14, b: 46 };
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("class", "rd-svg");
    const xs = []; for (let e = 10; e <= 16.001; e += 0.125) xs.push(2 ** e);
    const lx0 = 10, lx1 = 16, ly0 = Math.log10(0.03), ly1 = Math.log10(40);
    const X = (t) => m.l + (Math.log2(t) - lx0) / (lx1 - lx0) * (w - m.l - m.r);
    const Y = (s) => h - m.b - (Math.log10(s) - ly0) / (ly1 - ly0) * (h - m.t - m.b);
    [0.1, 1, 10].forEach((v) => {
      svg.appendChild(el("line", { x1: m.l, x2: w - m.r, y1: Y(v), y2: Y(v), class: "s-faint", "stroke-width": 0.6 }));
      svg.appendChild(el("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 12, class: "t-muted", text: v + " s" }));
    });
    [1, 2, 4, 8, 16, 32, 64].forEach((k) => {
      svg.appendChild(el("line", { x1: X(k * 1024), x2: X(k * 1024), y1: m.t, y2: h - m.b, class: "s-faint", "stroke-width": 0.6 }));
      svg.appendChild(el("text", { x: X(k * 1024), y: h - m.b + 16, "text-anchor": "middle", "font-size": 12, class: "t-muted", text: k + "K" }));
    });
    svg.appendChild(el("text", { x: (m.l + w - m.r) / 2, y: h - 8, "text-anchor": "middle", "font-size": 13, text: "prompt length (tokens, log scale)" }));
    svg.appendChild(el("text", { x: 14, y: (h - m.b + m.t) / 2, "text-anchor": "middle", "font-size": 13,
      transform: `rotate(-90 14 ${(h - m.b + m.t) / 2})`, text: "prefill latency (log)" }));
    const series = [
      { f: (t) => resident(BF16, t) / 1000, cls: "s-muted", label: "BF16, resident", dash: "" },
      { f: (t) => resident(FP4, t) / 1000, cls: "s-paper", label: "NVFP4, resident", dash: "" },
      { f: (t) => odp(t, bw).total / 1000, cls: "s-predict", label: "NVFP4 + ODP", dash: "6 4" },
    ];
    series.forEach((s, i) => {
      svg.appendChild(el("polyline", { points: xs.map((t) => `${X(t)},${Y(s.f(t))}`).join(" "), class: `${s.cls} f-none`,
        "stroke-width": 2.4, "stroke-dasharray": s.dash }));
      const ly = m.t + 14 + i * 20;
      svg.appendChild(el("line", { x1: m.l + 12, x2: m.l + 38, y1: ly - 4, y2: ly - 4, class: s.cls, "stroke-width": 2.4, "stroke-dasharray": s.dash }));
      svg.appendChild(el("text", { x: m.l + 44, y: ly, "font-size": 13, text: s.label }));
    });
    svg.appendChild(el("line", { x1: X(T), x2: X(T), y1: m.t, y2: h - m.b, class: "s-take", "stroke-width": 1.5, "stroke-dasharray": "3 3" }));
  }

  function timeline(svg, T, bw) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const r = odp(T, bw), N = 6, w = 640, h = 118, l = 92;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("class", "rd-svg");
    const end = r.ev[N - 1].ce, X = (t) => l + t / end * (w - l - 10);
    svg.appendChild(el("text", { x: 4, y: 38, "font-size": 13, text: "SSD → slot" }));
    svg.appendChild(el("text", { x: 4, y: 82, "font-size": 13, text: "compute" }));
    for (let i = 0; i < N; i++) {
      const e = r.ev[i];
      svg.appendChild(el("rect", { x: X(e.ls), y: 22, width: Math.max(1, X(e.le) - X(e.ls) - 1), height: 24, rx: 3, class: "f-predict", "fill-opacity": 0.75 }));
      svg.appendChild(el("rect", { x: X(e.cs), y: 66, width: Math.max(1, X(e.ce) - X(e.cs) - 1), height: 24, rx: 3, class: i % 2 ? "f-paper" : "f-take", "fill-opacity": 0.8 }));
      if (X(e.ce) - X(e.cs) > 22) svg.appendChild(el("text", { x: (X(e.cs) + X(e.ce)) / 2, y: 83, "text-anchor": "middle", "font-size": 12, class: "f-bg", text: "B" + (i + 1) }));
    }
    svg.appendChild(el("text", { x: l, y: 112, "font-size": 12, class: "t-muted", text: `first ${N} of ${LAYERS} blocks · ${(end).toFixed(0)} ms shown` }));
  }

  function mount(root) {
    const steps = []; for (let e = 10; e <= 16.001; e += 0.5) steps.push(Math.round(2 ** e));
    const sT = el("input", { type: "range", min: 0, max: steps.length - 1, step: 1, value: 8, "aria-label": "Prompt length" });
    const sB = el("input", { type: "range", min: 1, max: 14, step: 0.1, value: 5.7, "aria-label": "SSD read bandwidth in GB per second" });
    const oT = el("output"), oB = el("output");
    const plotSvg = el("svg", { role: "img", "aria-label": "Prefill latency versus prompt length for BF16, resident NVFP4 and NVFP4 with ODP" });
    const tlSvg = el("svg", { role: "img", "aria-label": "Timeline of SSD loads and compute for the first six blocks" });
    const readout = el("p", { class: "rd-widget__readout", "aria-live": "polite" });
    root.append(
      el("p", { class: "rd-widget__title", text: "ODP explorer: when does streaming the prefill weights from SSD cost nothing?" }),
      el("div", { class: "rd-widget__controls" }, [el("label", {}, ["prompt ", sT]), oT]),
      el("div", { class: "rd-widget__controls" }, [el("label", {}, ["SSD GB/s ", sB]), oB]),
      plotSvg, tlSvg, readout);
    function update() {
      const T = steps[+sT.value], bw = +sB.value;
      oT.textContent = T >= 1024 ? (T / 1024).toFixed(T % 1024 ? 1 : 0) + "K tokens" : T + " tokens";
      oB.textContent = bw.toFixed(1) + " GB/s";
      linePlot(plotSvg, T, bw); timeline(tlSvg, T, bw);
      const b = resident(BF16, T), f = resident(FP4, T), o = odp(T, bw);
      const hidden = o.comp >= o.load;
      readout.textContent = `At ${oT.textContent}: BF16 ${(b / 1000).toFixed(2)} s · NVFP4 resident ${(f / 1000).toFixed(2)} s · ` +
        `NVFP4+ODP ${(o.total / 1000).toFixed(2)} s (${(b / o.total).toFixed(2)}× vs BF16, ${((o.total / f - 1) * 100).toFixed(0)}% over resident). ` +
        `Per block: load ${o.load.toFixed(1)} ms vs compute ${o.comp.toFixed(1)} ms, so loading is ` +
        (hidden ? "hidden behind compute." : "the bottleneck: the GPU waits on the SSD.");
    }
    sT.addEventListener("input", update); sB.addEventListener("input", update);
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
