/* Duplex-MPE results explorer. Numbers transcribed from the paper:
   Table 3 (all speech-system metrics), Table 15 (yield counts), Table 17 (Gemini text reference).
   "Yield over all N4 events" is OUR derived number: yielded events (Table 15) / 1,911 N4 events (Table 7). */
(function () {
  const ROOT_ID = "mpe-results";
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, kids = []) => {
    const svgTags = ["svg", "g", "line", "rect", "text"];
    const node = svgTags.includes(tag) ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    [].concat(kids).forEach((c) => c && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  };

  const MODELS = ["MiniCPM-o 4.5", "Moshi", "FLM-Audio", "Voila", "Freeze-Omni", "Gemini (text ref.)"];
  // [explicit, implicit]; null = not defined for that system
  const D = {
    presence: { name: "Response presence", note: "Diagnostic, not a score. Any speech after T, including speech that was already running (Table 3).",
      v: [[.9545, .9485], [.8155, .8220], [.9505, .9540], [.6515, .6690], [.9955, .9975], [.9470, .3040]] },
    fresh: { name: "Fresh-onset response", note: "Silent when T ends, then a new onset within 5 s (Table 3). Compare the order with presence: Freeze-Omni goes from first to last.",
      v: [[.9500, .9435], [.6340, .6700], [.5380, .5425], [.6465, .6670], [.2525, .2580], null] },
    acc: { name: "Conditional answer accuracy", note: "Correct answers among response-present T requests, judged by Opus 5 from ASR (Table 3). Gemini's answers were judged by Gemini (Table 17).",
      v: [[.4730, .4665], [.0123, .0170], [.0011, .0005], [.0031, .0075], [.0035, .0015], [.9039, .7911]] },
    silence: { name: "Silence preservation", note: "N1–N3 windows with no speech or only a brief acknowledgement (Table 3). Freeze-Omni passes 5 of 20,360.",
      v: [[.9242, .9289], [.2734, .2676], [.3957, .3991], [.8351, .8307], [.0002, .0002], [.9537, .9934]] },
    yield: { name: "Answering-window yield (as scored)", note: "Among eligible N4 events only; n shown on each bar (Table 3, Table 15). Freeze-Omni has n = 1, so no rate is reported.",
      v: [[.5964, .5925], [.1918, .2107], [.0082, .0059], [.8484, .8046], null, null],
      n: [[1633, 1664], [219, 242], [977, 1016], [620, 650], [1, 1], null] },
    yieldAll: { name: "Yield over all N4 events (our derived view)", note: "Our calculation, not a paper metric: events that yielded (Table 15) ÷ all 1,911 N4 events. Voila drops from first to second because most of its N4 events never reach the scored set.",
      v: [[974 / 1911, 986 / 1911], [42 / 1911, 51 / 1911], [8 / 1911, 6 / 1911], [526 / 1911, 523 / 1911], [0, 0], null] },
  };

  function mount(root) {
    let metric = "presence", cond = 0;
    const mBox = el("div", { class: "rd-widget__controls" });
    const cBox = el("div", { class: "rd-widget__controls" });
    const svg = el("svg", { role: "img", "aria-label": "Bar chart of the selected metric for each system" });
    const readout = el("p", { class: "rd-widget__readout" });
    root.append(el("p", { class: "rd-widget__title", text: "Five speech systems, six views of the same runs" }), mBox, cBox, svg, readout);
    const btn = (label, pressed, fn) => el("button", { type: "button", "aria-pressed": String(pressed), onclick: fn, text: label });

    function draw() {
      mBox.replaceChildren(...Object.keys(D).map((k) => btn(D[k].name, k === metric, () => { metric = k; draw(); })));
      cBox.replaceChildren(btn("Explicit (names Aria)", cond === 0, () => { cond = 0; draw(); }),
                           btn("Implicit (context only)", cond === 1, () => { cond = 1; draw(); }));
      const m = D[metric], W = 680, rowH = 46, top = 10, H = top + rowH * MODELS.length + 34, lab = 215, R = 70;
      const X = (v) => lab + v * (W - lab - R);
      svg.replaceChildren(); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "rd-svg");
      [0, .25, .5, .75, 1].forEach((t) => {
        svg.appendChild(el("line", { x1: X(t), x2: X(t), y1: top, y2: top + rowH * MODELS.length, class: "s-faint", "stroke-width": 0.8 }));
        svg.appendChild(el("text", { x: X(t), y: H - 10, "text-anchor": "middle", "font-size": 15, class: "t-muted", text: t.toFixed(2) }));
      });
      const vals = MODELS.map((_, i) => (m.v[i] ? m.v[i][cond] : null));
      const ranked = vals.map((v, i) => [v, i]).filter(([v, i]) => v !== null && i < 5).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
      MODELS.forEach((name, i) => {
        const y = top + i * rowH, v = vals[i], ref = i === 5;
        const rank = ranked.indexOf(i);
        svg.appendChild(el("text", { x: lab - 10, y: y + 29, "text-anchor": "end", "font-size": 17, class: ref ? "t-muted" : "", text: (rank >= 0 ? `#${rank + 1} ` : "") + name }));
        if (v === null) {
          const n = m.n && m.n[i] ? ` (n = ${m.n[i][cond]})` : "";
          svg.appendChild(el("text", { x: lab + 6, y: y + 29, "font-size": 16, class: "t-muted", text: (ref ? "not defined for text" : "not reported") + n }));
          return;
        }
        svg.appendChild(el("rect", { x: lab, y: y + 10, width: Math.max(2, X(v) - lab), height: 26, rx: 4,
          class: ref ? "f-muted s-muted" : "f-paper s-paper", "fill-opacity": ref ? 0.25 : 0.6, "stroke-dasharray": ref ? "4 3" : "" }));
        const n = m.n && m.n[i] ? ` n=${m.n[i][cond]}` : "";
        svg.appendChild(el("text", { x: X(v) + 6, y: y + 29, "font-size": 16, text: v.toFixed(3) + n }));
      });
      readout.textContent = m.note + (metric === "presence" ? " Toggle explicit/implicit and watch only the Gemini bar move." : "");
    }
    draw();
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
