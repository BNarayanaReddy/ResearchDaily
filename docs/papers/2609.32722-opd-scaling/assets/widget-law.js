/* Research Daily widget. Peak-law explorer: Eq. 6 with Table 16 coefficients; observed points from Fig. 4, Table 5, §6.3. */
(function () {
  const ROOT_ID = "opd-law";

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

  // ---------- peak-law explorer ----------
  // Coefficients: Table 16 (joint teacher laws, Eq. 6); SFT baseline: Eq. 18.
  const LAW = {
    V: { A: 0.97, a: 0.304, b: -0.267, z: 0.952, B: 0.116, g: 0.189, d: -0.61, x: 1.90, name: "Vanilla-OPD" },
    D: { A: 1.02, a: 0.336, b: -0.325, z: 1.009, B: 0.129, g: 0.203, d: -0.73, x: 2.01, name: "Delta-OPD" },
  };
  const SIZES = [0.5, 1.5, 3, 7, 14];
  // Observed Vanilla-OPD peaks with a teacher score stated in the paper.
  // Grid cells: Fig. 4 (left) cell values; teacher scores 39.8 (§6.3), 63.6 and 73.6 (Table 5).
  // Extra cells: 3B step-58 checkpoint (Table 5), 1.5B OPD-product teacher (§6.3).
  const OBS = [
    [0.5, 0.5, 39.8, 40.1, "0.5B RL endpoint"],
    [1.5, 0.5, 39.8, 53.0, "0.5B RL endpoint"], [1.5, 1.5, 63.6, 64.0, "1.5B RL endpoint"],
    [3, 0.5, 39.8, 61.4, "0.5B RL endpoint"], [3, 1.5, 63.6, 70.7, "1.5B RL endpoint"], [3, 3, 73.6, 73.6, "3B RL endpoint"],
    [3, 1.5, 53.0, 60.4, "1.5B OPD product (bootstrap chain)"],
    [7, 0.5, 39.8, 72.7, "0.5B RL endpoint"], [7, 1.5, 63.6, 77.5, "1.5B RL endpoint"], [7, 3, 73.6, 80.3, "3B RL endpoint"],
    [7, 3, 66.0, 73.8, "3B checkpoint at step 58 (held out of every fit)"],
    [14, 0.5, 39.8, 77.7, "0.5B RL endpoint"], [14, 1.5, 63.6, 82.1, "1.5B RL endpoint"], [14, 3, 73.6, 83.6, "3B RL endpoint"],
  ];
  const PRESETS = [
    ["0.5B expert → 14B student", 14, 0.5, 39.8],
    ["1.5B endpoint → 7B (Table 5)", 7, 1.5, 63.6],
    ["3B step-58 checkpoint → 7B (Table 5)", 7, 3, 66.0],
    ["1.5B OPD product → 3B (§6.3)", 3, 1.5, 53.0],
    ["0.5B expert → 0.5B (same-base)", 0.5, 0.5, 39.8],
  ];
  const peak = (L, ns, nt, gt) => 1 - L.A * ns ** -L.a * Math.min(nt, ns) ** -L.b * (1 - gt) ** L.z;
  const rate = (L, ns, nt, gt) => L.B * ns ** -L.g * Math.min(nt, ns) ** L.d * (1 - gt) ** -L.x;
  const sft = (ns) => 1 - 0.682 * ns ** -0.326;

  function mount(root) {
    let method = "V";
    const mkSelect = (label, opts, val) => {
      const s = el("select", { "aria-label": label });
      opts.forEach((o) => s.appendChild(el("option", { value: o, text: o + "B" })));
      s.value = String(val);
      return s;
    };
    const sSel = mkSelect("Student size", SIZES, 7);
    const tSel = mkSelect("Teacher size", SIZES, 1.5);
    const score = el("input", { type: "range", min: 30, max: 90, step: 0.1, value: 63.6, "aria-label": "Teacher gold score in percent" });
    const scoreOut = el("output", { text: "63.6%" });
    const btnV = el("button", { type: "button", "aria-pressed": "true", text: "Vanilla-OPD" });
    const btnD = el("button", { type: "button", "aria-pressed": "false", text: "Delta-OPD" });
    const preset = el("select", { "aria-label": "Load a case from the paper" });
    preset.appendChild(el("option", { value: "", text: "Load a case from the paper…" }));
    PRESETS.forEach((p, i) => preset.appendChild(el("option", { value: i, text: p[0] })));
    const svg = el("svg", { role: "img", "aria-label": "Predicted peak accuracy against teacher score, one line per teacher size" });
    const readout = el("p", { class: "rd-widget__readout" });
    const legend = el("p", { class: "rd-widget__readout" });
    root.append(
      el("p", { class: "rd-widget__title", text: "Predict the student's peak before training (Eq. 6)" }),
      el("div", { class: "rd-widget__controls" }, [el("label", {}, ["student ", sSel]), el("label", {}, ["teacher ", tSel]),
        el("label", {}, ["teacher score ", score]), scoreOut]),
      el("div", { class: "rd-widget__controls" }, [btnV, btnD, preset]),
      svg, readout, legend
    );
    const lineCls = ["s-take", "s-code", "s-paper", "s-bridge", "s-predict"];
    function update() {
      const L = LAW[method], ns = +sSel.value, nt = +tSel.value, gt = +score.value / 100;
      scoreOut.textContent = score.value + "%";
      const xs = Array.from({ length: 61 }, (_, i) => 0.30 + i * 0.01);
      const teachers = SIZES.filter((t) => t <= ns);
      const series = teachers.map((t) => ({ x: xs.map((v) => v * 100), y: xs.map((v) => 100 * peak(L, ns, t, v)),
        cls: lineCls[SIZES.indexOf(t)], width: t === Math.min(nt, ns) ? 3.5 : 1.6, dash: t !== Math.min(nt, ns) }));
      series.push({ x: [30, 90], y: [30, 90], cls: "s-faint", width: 1, dash: true });
      const { X, Y } = plot(svg, { series, xmin: 30, xmax: 90, ymin: 20, ymax: 100,
        xlabel: "teacher's own score (%)", ylabel: "predicted student peak (%)" });
      // label each teacher-size line at its left end
      teachers.forEach((t) => {
        const yv = 100 * peak(L, ns, t, 0.30);
        svg.appendChild(el("text", { x: X(30) + 4, y: Y(yv) - 5, "font-size": 12, class: lineCls[SIZES.indexOf(t)].replace("s-", "t-"),
          "font-weight": t === Math.min(nt, ns) ? "700" : "400", text: "T " + t + "B" }));
      });
      // observed Vanilla peaks for this student
      if (method === "V") OBS.filter((o) => o[0] === ns).forEach((o) => {
        svg.appendChild(el("circle", { cx: X(o[2]), cy: Y(o[3]), r: 6, class: "f-none s-ink", "stroke-width": 2 },
          [el("title", { text: `observed ${o[3]}% with ${o[4]} (scores ${o[2]}%)` })]));
      });
      const p = 100 * peak(L, ns, nt, gt);
      svg.appendChild(el("circle", { cx: X(gt * 100), cy: Y(p), r: 7, class: "f-predict" }));
      svg.appendChild(el("text", { x: X(30) + 8, y: Y(30 + 4), "font-size": 12, class: "t-muted", text: "dashed grey: student = teacher" }));
      const nte = Math.min(nt, ns);
      const obs = OBS.find((o) => o[0] === ns && o[1] === nt && Math.abs(o[2] - gt * 100) < 0.26);
      readout.textContent = `${L.name}: predicted peak ${p.toFixed(1)}%` +
        (obs && method === "V" ? ` (observed ${obs[3]}%)` : "") +
        ` · SFT start ≈ ${(100 * sft(ns)).toFixed(1)}% (Eq. 18) · initial slope m ≈ ${rate(L, ns, nt, gt).toFixed(2)} per unit d` +
        (nt > ns ? ` · teacher capped at ${ns}B (N_T,eff = min(N_T, N_S))` : "");
      legend.textContent = "Lines: one per teacher size ≤ student (" + teachers.map((t) => t + "B").join(", ") +
        "); the thick line is your teacher. Open circles: observed Vanilla-OPD peaks for this student (hover for details).";
    }
    const setMethod = (m) => { method = m; btnV.setAttribute("aria-pressed", m === "V"); btnD.setAttribute("aria-pressed", m === "D"); update(); };
    btnV.addEventListener("click", () => setMethod("V"));
    btnD.addEventListener("click", () => setMethod("D"));
    preset.addEventListener("change", () => {
      if (preset.value === "") return;
      const p = PRESETS[+preset.value];
      sSel.value = String(p[1]); tSel.value = String(p[2]); score.value = p[3]; update();
    });
    [sSel, tSel, score].forEach((c) => c.addEventListener("input", update));
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
