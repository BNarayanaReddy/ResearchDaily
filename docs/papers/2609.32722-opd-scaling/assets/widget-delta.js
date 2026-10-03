/* Research Daily widget. Vanilla vs Delta-OPD per pair, numbers from Table 11. */
(function () {
  const ROOT_ID = "opd-delta";

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

  // ---------- Vanilla vs Delta, pair by pair (Table 11) ----------
  // [student, teacher, relation, m_V, m_D, gain_V, gain_D, endpoint]
  const ROWS = [
    [0.5, 0.5, "same", .573, .557, 23.3, 22.6, "Cens."], [0.5, 1.5, "s2w", .539, .570, 23.3, 23.6, "Cens."],
    [1.5, 0.5, "w2s", .564, .554, 14.2, 16.8, "Cens."], [1.5, 1.5, "same", .721, .744, 24.6, 24.6, "Cens."],
    [1.5, 3, "s2w", .629, .723, 24.8, 24.6, "Cens."], [3, 0.5, "w2s", .378, .444, 8.2, 12.4, "Obs."],
    [3, 1.5, "w2s", .555, .642, 17.6, 18.2, "Cens."], [3, 3, "same", .618, .711, 20.9, 20.5, "Cens."],
    [7, 0.5, "w2s", .415, .506, 11.7, 13.1, "Obs."], [7, 1.5, "w2s", .558, .630, 16.0, 17.8, "Cens."],
    [7, 3, "w2s", .670, .754, 20.2, 19.3, "Cens."], [7, 7, "same", .687, .712, 20.3, 21.5, "Obs."],
    [14, 0.5, "w2s", .175, .268, 5.1, 6.7, "Obs."], [14, 1.5, "w2s", .327, .387, 9.3, 9.9, "Obs."],
    [14, 3, "w2s", .417, .470, 10.6, 11.4, "Cens."], [14, 7, "w2s", .424, .470, 12.1, 12.6, "Cens."],
    [14, 14, "same", .498, .515, 14.5, 14.6, "Cens."],
  ];
  const REL = { w2s: ["weak→strong", "f-paper"], same: ["same-base", "f-code"], s2w: ["strong→weak", "f-take"] };

  function mount(root) {
    let metric = "slope";
    const bS = el("button", { type: "button", "aria-pressed": "true", text: "Initial slope m" });
    const bG = el("button", { type: "button", "aria-pressed": "false", text: "Peak gain (points)" });
    const pick = el("select", { "aria-label": "Highlight one teacher-student pair" });
    ROWS.forEach((r, i) => pick.appendChild(el("option", { value: i, text: `${r[0]}B ← ${r[1]}B (${REL[r[2]][0]})` })));
    pick.value = "12";
    const svg = el("svg", { role: "img", "aria-label": "Scatter of Delta-OPD against Vanilla-OPD for 17 teacher-student pairs, with the diagonal where they tie" });
    const readout = el("p", { class: "rd-widget__readout" });
    const key = el("p", { class: "rd-widget__readout", text: "Blue: weak→strong · green: same-base · violet: strong→weak. Above the dashed diagonal = Delta-OPD wins." });
    root.append(
      el("p", { class: "rd-widget__title", text: "Does the teacher-shift reward (Delta-OPD) beat Vanilla-OPD?" }),
      el("div", { class: "rd-widget__controls" }, [bS, bG, el("label", {}, ["highlight ", pick])]),
      svg, readout, key
    );
    function update() {
      const iv = metric === "slope" ? 3 : 5, id = iv + 1;
      const lo = metric === "slope" ? 0.15 : 4, hi = metric === "slope" ? 0.8 : 26;
      const { X, Y } = plot(svg, { series: [{ x: [lo, hi], y: [lo, hi], cls: "s-muted", width: 1.2, dash: true }],
        xmin: lo, xmax: hi, ymin: lo, ymax: hi, h: 340,
        xlabel: metric === "slope" ? "Vanilla-OPD slope m (accuracy per unit d)" : "Vanilla-OPD peak gain (points)",
        ylabel: metric === "slope" ? "Delta-OPD slope" : "Delta-OPD peak gain" });
      ROWS.forEach((r, i) => svg.appendChild(el("circle", { cx: X(r[iv]), cy: Y(r[id]), r: 6, class: REL[r[2]][1] },
        [el("title", { text: `${r[0]}B ← ${r[1]}B: Vanilla ${r[iv]}, Delta ${r[id]}` })])));
      const r = ROWS[+pick.value];
      svg.appendChild(el("circle", { cx: X(r[iv]), cy: Y(r[id]), r: 12, class: "f-none s-predict", "stroke-width": 3 }));
      const wins = ROWS.filter((q) => q[id] > q[iv]);
      const w2s = wins.filter((q) => q[2] === "w2s").length;
      readout.textContent = `Delta-OPD higher in ${wins.length} of 17 pairs (${w2s} of 10 weak→strong). ` +
        `Highlighted ${r[0]}B ← ${r[1]}B: Vanilla ${r[iv]}, Delta ${r[id]}` +
        (metric === "slope" ? "" : ` · transfer endpoint ${r[7] === "Obs." ? "observed" : "right-censored"}`) + ".";
    }
    const set = (m) => { metric = m; bS.setAttribute("aria-pressed", m === "slope"); bG.setAttribute("aria-pressed", m === "gain"); update(); };
    bS.addEventListener("click", () => set("slope"));
    bG.addEventListener("click", () => set("gain"));
    pick.addEventListener("input", update);
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
