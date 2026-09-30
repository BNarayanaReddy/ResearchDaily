/* Duplex-MPE timeline scorer: toggle assistant behaviours on a miniature scenario and see
   how each timing metric (Table 2, §3.5, App. A4.1) scores them. Timing rules follow the
   paper: 5 s T response window, 3 s N4 answering window, deadline = N4_R onset + 2 s,
   observation until N4_R end + 0.5 s, VAD merges pauses < 0.8 s. Scenario times are ours. */
(function () {
  const ROOT_ID = "mpe-timeline";
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, kids = []) => {
    const svgTags = ["svg", "g", "path", "line", "rect", "circle", "text", "title"];
    const node = svgTags.includes(tag) ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    [].concat(kids).forEach((c) => c && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  };

  // Scenario (seconds). Human turns are scripted and open-loop, as in the benchmark.
  const TURNS = [
    { lab: "T", a: 0, b: 5, cls: "f-predict" },
    { lab: "N2", a: 10.5, b: 16, cls: "f-faint" },
    { lab: "N4Q", a: 17, b: 20, cls: "f-predict" },
    { lab: "N4R", a: 23, b: 26, cls: "f-take" },
  ];
  const T_END = 5, N2 = [10.5, 16.5], Q = [17, 20], R0 = 23, DEADLINE = 25, T_E = 26.5, END = 28;

  const BEHAVIOURS = [
    { k: "already", label: "Already talking as T ends", seg: [[0, 6]] },
    { k: "answerT", label: "Answer T after it ends", seg: [[5.6, 8.5]] },
    { k: "chime", label: "Chime in during N2", seg: [[12, 13.5]] },
    { k: "duringQ", label: "Talk over the N4 question", seg: [[18, 19.6]] },
    { k: "answerQ", label: "Answer N4 in the 3 s gap", seg: [[20.6, 24.2]] },
    { k: "keep", label: "Keep talking after N4_R", seg: [[24.2, 27.5]] },
    { k: "resume", label: "Pause, then resume", seg: [[25.6, 26.3]] },
  ];
  const PRESETS = {
    "Ideal": ["answerT", "answerQ"],
    "Chatterbox": ["already", "answerT", "chime", "duringQ", "answerQ", "keep"],
    "Never stops": ["answerT", "answerQ", "keep"],
    "Resumer": ["answerT", "answerQ", "resume"],
  };

  function merge(segs) { // VAD: merge pauses shorter than 0.8 s
    const s = segs.map((x) => x.slice()).sort((p, q) => p[0] - q[0]); const out = [];
    for (const g of s) {
      if (out.length && g[0] - out[out.length - 1][1] < 0.8) out[out.length - 1][1] = Math.max(out[out.length - 1][1], g[1]);
      else out.push(g);
    }
    return out;
  }
  const overlaps = (segs, a, b) => segs.some(([s, e]) => s < b && e > a);
  const activeAt = (segs, t) => segs.some(([s, e]) => s <= t && e > t);
  const onsetIn = (segs, a, b) => segs.some(([s]) => s > a && s <= b);

  function score(segs) {
    const act = activeAt(segs, T_END);
    const fresh = !act && onsetIn(segs, T_END, T_END + 5);
    const presence = act || overlaps(segs, T_END, T_END + 5);
    const silence = !overlaps(segs, N2[0], N2[1]);
    const windowResp = overlaps(segs, Q[0], Q[1] + 3);
    const quietQ = !overlaps(segs, Q[0], Q[1]);
    const startsGap = onsetIn(segs, Q[1], Q[1] + 3);
    const stillAtR = activeAt(segs, R0);
    const eligible = quietQ && startsGap && stillAtR;
    const atDeadline = activeAt(segs, DEADLINE);
    const later = overlaps(segs, DEADLINE, T_E);
    let yieldTxt;
    if (!eligible) {
      const why = !quietQ ? "it spoke during the question" : !startsGap ? "it never started an answer in the 3 s gap" : "it had already finished before N4_R began";
      yieldTxt = ["excluded", `Not in the denominator: ${why}. Not a failure, just not scored.`];
    } else if (atDeadline) yieldTxt = ["fail", "Still voicing at N4_R onset + 2 s."];
    else if (later) yieldTxt = ["fail", "Silent at the deadline, but spoke again before N4_R ended + 0.5 s (a “resumed” failure)."];
    else yieldTxt = ["pass", "Stopped by the deadline and stayed quiet."];
    return [
      ["Fresh-onset response", fresh ? "pass" : "fail", fresh ? "Silent at T's end, new onset within 5 s." : act ? "Speech was already running when T ended: counts for presence, not fresh onset." : "No new onset within 5 s."],
      ["Response presence (diagnostic)", presence ? "yes" : "no", "Any speech in T's window, continuation included."],
      ["Silence preservation (N2)", silence ? "pass" : "fail", silence ? "Nothing detected in the N2 window." : "Speech in a silence window. Only a brief acknowledgement would be exempt."],
      ["Window response (diagnostic)", windowResp ? "yes" : "no", "Any speech from N4_Q start to 3 s after it."],
      ["Answering-window yield", yieldTxt[0], yieldTxt[1]],
    ];
  }

  function mount(root) {
    const on = new Set(PRESETS["Ideal"]);
    const presetBox = el("div", { class: "rd-widget__controls" });
    const togBox = el("div", { class: "rd-widget__controls" });
    const svg = el("svg", { role: "img", "aria-label": "Timeline of human turns and the assistant's speech, with scoring windows" });
    const table = el("div", { class: "mpe-verdicts" });
    root.append(el("p", { class: "rd-widget__title", text: "Score an assistant's timeline by the paper's rules" }),
      el("p", { class: "rd-widget__readout", text: "Presets:" }), presetBox,
      el("p", { class: "rd-widget__readout", text: "Or toggle behaviours:" }), togBox, svg, table);

    const W = 680, H = 250, L = 20, Rm = 20, X = (t) => L + (t / END) * (W - L - Rm);
    function draw() {
      presetBox.replaceChildren(...Object.keys(PRESETS).map((p) => el("button", {
        type: "button", "aria-pressed": String(PRESETS[p].length === on.size && PRESETS[p].every((k) => on.has(k))),
        onclick: () => { on.clear(); PRESETS[p].forEach((k) => on.add(k)); draw(); }, text: p })));
      togBox.replaceChildren(...BEHAVIOURS.map((b) => el("button", {
        type: "button", "aria-pressed": String(on.has(b.k)),
        onclick: () => { on.has(b.k) ? on.delete(b.k) : on.add(b.k); draw(); }, text: b.label })));
      const segs = merge(BEHAVIOURS.filter((b) => on.has(b.k)).flatMap((b) => b.seg));
      svg.replaceChildren();
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "rd-svg");
      // scoring windows
      const win = (a, b, cls, label) => {
        svg.appendChild(el("rect", { x: X(a), y: 18, width: X(b) - X(a), height: 168, class: cls + " softer" }));
        svg.appendChild(el("text", { x: (X(a) + X(b)) / 2, y: 14, "text-anchor": "middle", "font-size": 15, class: "t-muted", text: label }));
      };
      win(T_END, T_END + 5, "f-paper", "5 s window");
      win(N2[0], N2[1], "f-faint", "stay quiet");
      win(Q[1], Q[1] + 3, "f-paper", "3 s");
      svg.appendChild(el("text", { x: 4, y: 58, "font-size": 16, text: "Humans" }));
      TURNS.forEach((t) => {
        svg.appendChild(el("rect", { x: X(t.a), y: 66, width: X(t.b) - X(t.a), height: 34, rx: 5, class: t.cls + " soft s-faint" }));
        const r = t.lab === "N4R";
        svg.appendChild(el("text", { x: r ? X(t.a) + 3 : (X(t.a) + X(t.b)) / 2, y: 89, "text-anchor": r ? "start" : "middle", "font-size": r ? 15 : 17, "font-weight": 600, text: t.lab.replace("N4Q", "N4_Q").replace("N4R", "N4_R") }));
      });
      svg.appendChild(el("text", { x: 4, y: 128, "font-size": 16, text: "Aria (after VAD)" }));
      segs.forEach(([a, b]) => svg.appendChild(el("rect", { x: X(Math.max(a, 0)), y: 136, width: X(Math.min(b, END)) - X(Math.max(a, 0)), height: 30, rx: 5, class: "f-code s-code", "fill-opacity": 0.55 })));
      svg.appendChild(el("line", { x1: X(DEADLINE), x2: X(DEADLINE), y1: 60, y2: 186, class: "s-predict", "stroke-width": 2, "stroke-dasharray": "4 3" }));
      svg.appendChild(el("text", { x: X(DEADLINE), y: 206, "text-anchor": "middle", "font-size": 15, class: "t-predict", text: "R + 2 s" }));
      [0, 5, 10, 15, 20, 25].forEach((t) => svg.appendChild(el("text", { x: X(t), y: 238, "text-anchor": "middle", "font-size": 15, class: "t-muted", text: t + " s" })));
      const rows = score(segs);
      table.replaceChildren(...rows.map(([name, v, why]) => el("p", { class: "rd-widget__readout" }, [
        el("strong", { text: `${name}: ` }),
        el("span", { style: `font-weight:650;color:var(${v === "pass" || v === "yes" ? "--rd-code" : v === "excluded" ? "--md-default-fg-color--light" : "--rd-predict"})`, text: v.toUpperCase() }),
        ` · ${why}`])));
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
