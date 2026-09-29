/* Table 1 explorer. Every number is transcribed from Table 1 of arXiv:2609.26333v1.
   Accuracy = family mean (Qwen 3: 0.6B/1.7B/4B/8B; Gemma 3: 1B/4B/12B).
   Speedups and device GB are for Qwen3-8B and Gemma3-12B. */
(function () {
  const ROOT_ID = "dq-table1";
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
  // [name, kind, prefill speedup, decode speedup, device GB, DH acc, PH acc]
  const T1 = {
    qwen: { bf16: [66.2, 84.2], groups: [
      ["4-bit", [["NVFP4A16", "wo", 1.00, 2.93, 6.40, 64.7, 82.0], ["NVFP4", "nd", 1.49, 2.86, 6.40, 61.8, 79.8], ["+ format disagg.", "fmt", 1.49, 2.93, 6.40, 63.7, 81.1]]],
      ["3-bit", [["3-bit weight-only", "wo", 1.00, 3.33, 5.53, 61.5, 79.8], ["LUT3", "nd", 1.49, 3.23, 5.53, 55.4, 76.3], ["+ format disagg.", "fmt", 1.49, 3.33, 5.53, 59.9, 77.2], ["+ full disagg. (ODP)", "full", 1.47, 3.33, 5.53, 61.7, 80.4]]],
      ["2-bit", [["2-bit weight-only", "wo", 1.00, 3.82, 4.66, 38.4, 64.1], ["LUT2", "nd", 1.49, 3.73, 4.66, 34.8, 61.3], ["+ format disagg.", "fmt", 1.49, 3.82, 4.66, 37.2, 61.0], ["+ full disagg. (ODP)", "full", 1.47, 3.82, 4.66, 45.5, 76.6]]]] },
    gemma: { bf16: [58.6, 72.0], groups: [
      ["4-bit", [["NVFP4A16", "wo", 1.00, 3.27, 8.07, 55.4, 65.9], ["NVFP4", "nd", 1.67, 3.18, 8.07, 51.9, 64.4], ["+ format disagg.", "fmt", 1.67, 3.27, 8.07, 55.0, 64.7]]],
      ["3-bit", [["3-bit weight-only", "wo", 1.00, 3.44, 6.72, 51.6, 64.1], ["LUT3", "nd", 1.67, 3.37, 6.72, 46.7, 61.4], ["+ format disagg.", "fmt", 1.67, 3.44, 6.72, 50.4, 62.1], ["+ full disagg. (ODP)", "full", 1.58, 3.44, 6.72, 51.9, 65.7]]],
      ["2-bit", [["2-bit weight-only", "wo", 1.00, 4.15, 5.38, 33.7, 52.4], ["LUT2", "nd", 1.67, 4.03, 5.38, 30.8, 50.8], ["+ format disagg.", "fmt", 1.67, 4.15, 5.38, 32.6, 49.8], ["+ full disagg. (ODP)", "full", 1.58, 4.15, 5.38, 38.2, 61.3]]]] },
  };
  const CLS = { wo: "f-muted", nd: "f-predict", fmt: "f-paper", full: "f-take" };
  const LAB = { wo: "weight-only (slow prefill)", nd: "non-disaggregated", fmt: "format-disaggregated", full: "fully-disaggregated + ODP" };

  function mount(root) {
    let fam = "qwen", wl = 0;
    const fBtns = el("div", { class: "rd-widget__controls" }), wBtns = el("div", { class: "rd-widget__controls" });
    const svg = el("svg", { role: "img", "aria-label": "Grouped bar chart of Table 1 accuracy by bit-width and scheme" });
    const readout = el("p", { class: "rd-widget__readout", "aria-live": "polite" });
    const btn = (label, on, cb) => el("button", { type: "button", "aria-pressed": String(on), text: label, onclick: cb });
    function buttons() {
      fBtns.replaceChildren(btn("Qwen 3", fam === "qwen", () => { fam = "qwen"; buttons(); draw(); }),
                            btn("Gemma 3", fam === "gemma", () => { fam = "gemma"; buttons(); draw(); }));
      wBtns.replaceChildren(btn("Decode-heavy (reasoning)", wl === 0, () => { wl = 0; buttons(); draw(); }),
                            btn("Prefill-heavy (RULER)", wl === 1, () => { wl = 1; buttons(); draw(); }));
    }
    function describe(r) {
      readout.textContent = `${r[0]}: ${wl ? "prefill-heavy" : "decode-heavy"} accuracy ${r[5 + wl].toFixed(1)}% · ` +
        `prefill ${r[2].toFixed(2)}× · decode ${r[3].toFixed(2)}× vs BF16 · ${r[4].toFixed(2)} GB on device.`;
    }
    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const d = T1[fam], w = 640, h = 330, m = { l: 44, r: 10, t: 64, b: 40 };
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("class", "rd-svg");
      const ymax = 90, Y = (v) => h - m.b - v / ymax * (h - m.t - m.b);
      [0, 20, 40, 60, 80].forEach((v) => {
        svg.appendChild(el("line", { x1: m.l, x2: w - m.r, y1: Y(v), y2: Y(v), class: "s-faint", "stroke-width": 0.6 }));
        svg.appendChild(el("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 12, class: "t-muted", text: v }));
      });
      Object.keys(LAB).forEach((k, i) => {
        const x = m.l + (i % 2) * 300, y = 16 + Math.floor(i / 2) * 22;
        svg.appendChild(el("rect", { x, y: y - 11, width: 14, height: 14, class: CLS[k] }));
        svg.appendChild(el("text", { x: x + 20, y: y + 1, "font-size": 13, text: LAB[k] }));
      });
      const b = d.bf16[wl];
      svg.appendChild(el("line", { x1: m.l, x2: w - m.r, y1: Y(b), y2: Y(b), class: "s-ink", "stroke-width": 1.2, "stroke-dasharray": "5 4" }));
      svg.appendChild(el("text", { x: w - m.r, y: Y(b) - 5, "text-anchor": "end", "font-size": 12, class: "t-muted", text: `BF16 ${b}` }));
      const gw = (w - m.l - m.r) / 3, bw = 34;
      d.groups.forEach(([g, rows], gi) => {
        const cx = m.l + gw * gi + gw / 2, x0 = cx - (rows.length * (bw + 6)) / 2;
        svg.appendChild(el("text", { x: cx, y: h - 14, "text-anchor": "middle", "font-size": 14, "font-weight": 600, text: g }));
        rows.forEach((r, i) => {
          const v = r[5 + wl], x = x0 + i * (bw + 6);
          const rect = el("rect", { x, y: Y(v), width: bw, height: Y(0) - Y(v), class: CLS[r[1]], tabindex: 0,
            "aria-label": `${g} ${r[0]}: ${v}%`, onmouseenter: () => describe(r), onfocus: () => describe(r), onclick: () => describe(r) });
          svg.appendChild(rect);
          svg.appendChild(el("text", { x: x + bw / 2, y: Y(v) - 5, "text-anchor": "middle", "font-size": 12, text: v.toFixed(1) }));
        });
      });
      describe(d.groups[2][1][3]);
    }
    root.append(el("p", { class: "rd-widget__title", text: "Table 1 explorer: accuracy by scheme and decode bit-width" }), fBtns, wBtns, svg, readout);
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
