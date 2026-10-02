/* Table 16 explorer: the survey's 14 reported comparisons (Sec. 7.2, Table 16;
   protocol notes from Supplement S1, REPORTED-COMPARISONS.md). Embedded as #rd-evidence. */
(function () {
  const ROOT_ID = "rd-evidence";
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

  // Numbers transcribed from Table 16 (fractions converted to %). before/after null = not numeric.
  const ROWS = [
    { g: "I", name: "ICRT", target: "Training data", contrast: "DROID-only vs multi-task training", readout: "DROID-only: no progress on test tasks", setting: "Shared test tasks; held-out tasks reuse known motion primitives with new objects." },
    { g: "I", name: "BPP", target: "Prompt", contrast: "Goal image → demo", readout: "Fidelity ↑ (qualitative)", setting: "Unseen drawings, matched start. The supplement notes Chamfer distance alone can hide poor shape fidelity." },
    { g: "I", name: "LMAct", target: "Context size", contrast: "0 → 512 expert episodes", readout: "Often little gain", setting: "Games and simulated control with general-purpose models, not real manipulation." },
    { g: "I", name: "Show-Harness", target: "API semantics", contrast: "Arbitrary action names, no written conventions", readout: "1/20 successes; 23.3% of mappings inferred (§7.1)", setting: "Same harness otherwise. Tests discovering an unfamiliar action interface, not video following." },
    { g: "I", name: "NOLO", target: "Scene context", contrast: "No video → video", before: 33.58, after: 43.65, readout: "SR 33.58 → 43.65%", setting: "Habitat simulation, held-out scenes, 3 seeds." },
    { g: "II", name: "MT3", target: "Action reuse", contrast: "BC → retrieval; whole → phases", readout: "SR ↑ with fewer demos", setting: "New object instances; alignment followed by interaction replay." },
    { g: "II", name: "Part-based transfer", target: "Warp granularity", contrast: "Whole object → parts", before: 100 * 11 / 27, after: 100 * 23 / 27, readout: "11/27 → 23/27", setting: "Mug–rack placement; part correspondences supplied (assisted)." },
    { g: "II", name: "Demo-JEPA", target: "Action interface", contrast: "Action head vs latent planning", readout: "Known tasks (real): head > plan; unseen: plan > head", setting: "Simulation and real, task-group means; the familiar-task head advantage does not appear in simulation." },
    { g: "II", name: "RAPID", target: "Verification", contrast: "Scene variants off → on", before: 53.2, after: 75.9, readout: "SR 53.2 → 75.9%", setting: "8 tasks, 50 scenes per task, 3 runs." },
    { g: "III", name: "Zeva", target: "Persistent memory", contrast: "Off → on", readout: "SR +10 to 20 pp", setting: "5 real tasks; a brief interaction trace is kept in both arms." },
    { g: "III", name: "RTCF", target: "Memory correction", contrast: "Off → on", before: 86.4, after: 88.4, readout: "SR 86.4 → 88.4%", setting: "Fixed trajectory bank; 2,000 episodes per variant." },
    { g: "III", name: "TraceFlow", target: "Trace guidance", contrast: "Base → guided", before: 42, after: 78, readout: "Ordered packing 21/50 → 39/50; simulation aggregate unchanged", setting: "One real packing task plus a simulation suite." },
    { g: "III", name: "FARE", target: "History revision", contrast: "Base → selective (always-search: 91.0)", before: 91.5, after: 93.2, extra: 91.0, readout: "SR 91.5 → 93.2%; always-search 91.0%", setting: "RoboTwin Easy, fixed checkpoint. Searching every step is worse than the base." },
    { g: "III", name: "LMPC", target: "Successor training", contrast: "Base → successor", before: 39.4, after: 66.3, readout: "SR 39.4 → 66.3%", setting: "Held-out teaching tasks. Weights change between sessions (the one row that trains a successor)." } ];
  const GROUPS = { All: "All", I: "I. Training and task evidence", II: "II. Transfer and realization", III: "III. Retained experience" };

  function mount(root) {
    let group = "All", pick = "NOLO";
    const btns = Object.keys(GROUPS).map((k) => el("button", { type: "button", class: "md-button", "aria-pressed": k === group ? "true" : "false",
      text: k === "All" ? "All" : "Group " + k, onclick: () => { group = k; render(); } }));
    const sel = el("select", { "aria-label": "Choose a comparison", onchange: (e) => { pick = e.target.value; render(); } },
      ROWS.map((r) => el("option", { value: r.name, text: r.name })));
    const svg = el("svg", { class: "rd-svg", role: "img", "aria-label": "Before and after values for the numeric comparisons" });
    const card = el("div", { class: "rd-widget__readout" });
    root.append(el("p", { class: "rd-widget__title", text: "Table 16: what the 14 reported comparisons show" }),
      el("div", { class: "rd-widget__controls" }, btns), svg,
      el("div", { class: "rd-widget__controls" }, [el("label", {}, ["details for ", sel])]), card);
    function render() {
      btns.forEach((b, i) => b.setAttribute("aria-pressed", Object.keys(GROUPS)[i] === group ? "true" : "false"));
      sel.value = pick;
      const rows = ROWS.filter((r) => (group === "All" || r.g === group) && r.before != null);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const W = 640, top = 34, rowH = 46, H = top + rows.length * rowH + 40, L = 230, R = 615;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const X = (v) => L + (v / 100) * (R - L);
      [0, 25, 50, 75, 100].forEach((v) => { svg.appendChild(el("line", { x1: X(v), x2: X(v), y1: top - 10, y2: H - 34, class: "s-faint", "stroke-width": 0.8 }));
        svg.appendChild(el("text", { x: X(v), y: H - 12, "text-anchor": "middle", "font-size": 17, class: "t-muted", text: v + "%" })); });
      rows.forEach((r, i) => {
        const y = top + i * rowH + 14, on = r.name === pick;
        svg.appendChild(el("text", { x: 8, y: y + 6, "font-size": 18, "font-weight": on ? 700 : 400, text: r.name }));
        svg.appendChild(el("line", { x1: X(r.before), x2: X(r.after), y1: y, y2: y, class: on ? "s-predict" : "s-paper", "stroke-width": on ? 5 : 3 }));
        svg.appendChild(el("circle", { cx: X(r.before), cy: y, r: 7, class: "f-bg s-muted", "stroke-width": 2 }));
        svg.appendChild(el("circle", { cx: X(r.after), cy: y, r: 7, class: on ? "f-predict" : "f-paper" }));
        if (r.extra != null) svg.appendChild(el("circle", { cx: X(r.extra), cy: y, r: 5, class: "f-take" }));
      });
      if (!rows.length) svg.appendChild(el("text", { x: 320, y: 60, "text-anchor": "middle", "font-size": 18, class: "t-muted", text: "No numeric before/after rows in this group" }));
      const r = ROWS.find((x) => x.name === pick);
      card.innerHTML = `<strong>${r.name}</strong> (group ${r.g}) · changed: ${r.target} · contrast: ${r.contrast}<br>` +
        `<strong>Readout:</strong> ${r.readout}<br><strong>Setting:</strong> ${r.setting}` +
        (r.before == null ? "<br><em>Not charted: the table reports no before/after pair.</em>" : "");
    }
    render();
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
