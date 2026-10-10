/* Drawings for the Duplex-MPE lesson. One entry per data-draw name. Each is
   redrawn on every step and control change. Numbers from the paper carry a
   // Table N comment; everything else is illustrative layout. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- helpers
  const n0 = (v) => v.toLocaleString("en-US");
  const f4 = (v) => v.toFixed(4);
  // exact two-sided McNemar p: 2 * P(X <= min(a, b)), X ~ Bin(a + b, 1/2)
  const mcnemar = (a, b) => {
    const n = a + b, m = Math.min(a, b);
    if (n === 0) return 1;
    const lf = [0]; for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
    let s = 0; for (let i = 0; i <= m; i++) s += Math.exp(lf[n] - lf[i] - lf[n - i] - n * Math.LN2);
    return Math.min(1, 2 * s);
  };
  const fmtP = (p) => (p < 1e-4 ? p.toExponential(1) : p.toFixed(4));

  // Table 4: the taco scene. Texts shortened from the paper's example.
  const SCENE = [
    ["A", "N2", "Tacos on Fifth, nine bucks a head", "silent"],
    ["B", "N2", "Karaoke by Ninth, fifteen each", "silent"],
    ["C", "N2", "Luigi’s downstairs, eleven a person", "silent"],
    ["D", "T", "Aria, which one’s cheapest per person?", "answer"],
    ["A", "N1", "This is why we keep Aria in here", "silent"],
    ["B", "N2", "Hey Siri, how long is the bus?", "silent"],
    ["C", "N3", "Nine bucks… I’ve got eleven till Friday", "silent"],
    ["D", "N2", "C, do you actually care about karaoke?", "silent"],
    ["C", "N2", "Chips. Entirely chips.", "silent"],
    ["A", "N4Q", "Aria, does the taco place take card?", "answer"],
    ["A", "N4R", "Never mind, I paid card there Tuesday", "stop"],
    ["B", "N1", "Aria gets no vote in the rematch", "silent"],
    ["D", "N2", "Deal. Lobby at seven.", "silent"],
  ];
  const LT = { T: "code", N1: "paper", N2: "muted", N3: "paper", N4Q: "predict", N4R: "take" };
  // a strip of the 13 taco turns; lit(i) -> true to emphasise turn i (0-based)
  const turnStrip = (c, y, lit, dimOthers, narrow) => SCENE.map(([, lab], i) => c.box({
    x: 18 + i * 47, y, w: 41, h: 44, label: String(i + 1), sub: narrow ? undefined : lab, size: narrow ? 16 : 13, subSize: 10,
    tone: LT[lab], hl: lit(i), dim: dimOthers && !lit(i),
  }));

  // ------------------------------------------------------- toolbox: duplex
  D["duplex"] = (fig, k) => {
    const mode = k.toggle({ label: "design", options: ["Cascade", "Full-duplex"], value: "Cascade" });
    k.follow(mode, { 1: "Cascade", 2: "Full-duplex" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const dup = mode.value === "Full-duplex";
      c.text(20, 32, dup ? "Full-duplex: hears and speaks at once" : "Cascade: strict turns", { size: 16, weight: 700 });
      c.text(20, 99, "you", { size: 13, tone: "muted" });
      c.text(20, 189, "model", { size: 13, tone: "muted" });
      c.line(84, 94, 624, 94, { tone: "faint" });
      c.line(84, 184, 624, 184, { tone: "faint" });
      c.box({ x: 96, y: 76, w: 190, h: 36, label: "your question", size: 13, tone: "bridge" });
      if (!dup) {
        c.box({ x: 330, y: 166, w: 230, h: 36, label: "its reply", size: 13, tone: "take" });
        c.box({ x: 330, y: 76, w: 230, h: 36, label: "“wait, no…” goes unheard", size: 12, tone: "bad", dashed: true, hl: s === 1 });
        c.text(96, 300, "while it speaks, input is ignored", { size: 13, tone: "bad" });
        if (s >= 3) c.text(96, 326, "in a cascade, the harness decides whose turn it is", { size: 12, tone: "muted" });
        return;
      }
      c.box({ x: 420, y: 76, w: 150, h: 36, label: "“wait, no…”", size: 13, tone: "bridge", hl: s === 2 });
      c.box({ x: 330, y: 166, w: 150, h: 36, label: "its reply", size: 13, tone: "take" });
      c.line(84, 290, 624, 290, { tone: "bridge", dash: true, width: 2 });
      c.text(96, 316, "room audio streams in the whole time, even while it talks", { size: 12, tone: "bridge" });
      if (s >= 3) c.box({ x: 96, y: 166, w: 210, h: 36, label: "silence (an output)", size: 12, tone: "predict", dashed: true, hl: s === 3 });
      if (s >= 4) {
        [[200, "stay quiet"], [330, "start"], [480, "stop"]].forEach(([x, t]) => {
          c.line(x, 208, x, 232, { tone: "predict", width: 2 });
          c.text(x, 252, t, { anchor: "middle", size: 14, tone: "predict", weight: 700 });
        });
      }
    };
  };

  // ------------------------------------------------------ toolbox: the room
  D["room"] = (fig, k) => {
    const OPTS = ["to C", "to Siri", "to nobody", "to Aria"];
    const sel = k.toggle({ label: "turn", options: OPTS, value: "to C" });
    k.follow(sel, { 1: "to C", 2: "to Siri", 3: "to nobody", 4: "to Aria" });
    const c = k.canvas(W, H);
    const P = { Siri: [160, 40], A: [20, 130], Aria: [300, 130], B: [20, 240], D: [300, 240], C: [160, 300] };
    // Table 4 turns 8, 6, 7, 4
    const SAY = {
      "to C": ["D", "C", "turn 8 · N2", "“C, be honest, do you actually care about karaoke?”", "Aria: stay silent", "muted"],
      "to Siri": ["B", "Siri", "turn 6 · N2", "“Hey Siri, how long is the bus from campus?”", "Aria: stay silent", "muted"],
      "to nobody": ["C", null, "turn 7 · N3", "“Nine bucks… I’ve got eleven until Friday.”", "Aria: stay silent", "muted"],
      "to Aria": ["D", "Aria", "turn 4 · T", "“Aria, out of those three, which one’s the cheapest?”", "Aria: answer", "code"],
    };
    return (s) => {
      c.clear();
      const [from, to, tag, quote, must, tone] = SAY[sel.value];
      const showSiri = s >= 2 || sel.value === "to Siri";
      const B = {};
      Object.keys(P).forEach((n) => {
        if (n === "Siri" && !showSiri) return;
        const [x, y] = P[n];
        B[n] = c.box({ x, y, w: 100, h: 40, label: n, size: 14, dashed: n === "Siri",
          tone: n === "Aria" ? "take" : n === from ? "bridge" : "muted", hl: n === from || n === to });
      });
      if (to) c.connect(B[from], B[to], { tone, width: 2.4 });
      else c.label(P.C[0] + 50, P.C[1] - 16, "no addressee", { anchor: "middle", size: 12, tone: "predict", weight: 600 });
      // right panel
      c.text(440, 50, tag, { size: 12, tone: "muted", mono: true });
      c.text(440, 76, quote, { size: 14, maxW: 190, lines: 4, weight: 600 });
      c.text(440, 190, must, { size: 15, weight: 700, tone });
      if (s >= 4) {
        // Table 7, explicit: 2,000 T among 26,182 turns
        c.text(440, 252, "2,000 of 26,182 turns", { size: 13, weight: 700 });
        c.box({ x: 440, y: 264, w: 190, h: 22, tone: "muted", r: 4 });
        c.box({ x: 440, y: 264, w: Math.max(3, (2000 / 26182) * 190), h: 22, tone: "code", solid: true, r: 3 });
        c.text(440, 310, "are requests Aria must answer", { size: 12, tone: "muted" });
      }
    };
  };

  // --------------------------------------------------- toolbox: naming
  D["naming"] = (fig, k) => {
    const t = k.toggle({ label: "T wording", options: ["Explicit", "Implicit", "Name deleted"], value: "Explicit" });
    k.follow(t, { 1: "Explicit", 2: "Implicit", 3: "Name deleted", 4: "Implicit" });
    const c = k.canvas(W, H);
    // Table 5; the "name deleted" wording is ours
    const TXT = {
      Explicit: ["Alright, somebody settle this before we all starve; Aria, out of those three, which one’s the cheapest per person?", "cue: the name “Aria”", "code"],
      Implicit: ["Alright, somebody settle this before we all starve; you’ve been logging all three numbers, so run it: which one’s cheapest per person?", "cue: “you’ve been logging all three numbers”", "predict"],
      "Name deleted": ["Alright, somebody settle this before we all starve; out of those three, which one’s the cheapest per person?", "no cue: any human in the room could answer", "bad"],
    };
    return (s) => {
      c.clear();
      const [txt, cue, tone] = TXT[t.value];
      c.box({ x: 20, y: 14, w: 600, h: 96, tone, dashed: t.value === "Name deleted", hl: s <= 3 });
      c.text(36, 38, `turn 4 · speaker D · ${t.value.toLowerCase()}`, { size: 12, tone: "muted", inBox: true });
      c.text(36, 62, txt, { size: 14, maxW: 568, lines: 2, inBox: true });
      c.box({ x: 20, y: 122, w: 600, h: 36, label: cue, size: 13, tone, hl: s <= 3 });
      if (s >= 4) {
        c.text(20, 194, "Humans checked 50 implicit requests:", { size: 13, weight: 600 });
        for (let i = 0; i < 50; i++) c.dot(32 + (i % 25) * 15, 212 + Math.floor(i / 25) * 16, { r: 5, tone: "code" });
        c.text(430, 226, "50 / 50 addressed to Aria", { size: 13, tone: "code", weight: 700 });
      }
      if (s >= 5) {
        // Table 8 mean characters
        [["named", 111.6, "code"], ["unnamed", 123.3, "predict"]].forEach(([l, v, tn], i) => {
          const y = 270 + i * 40;
          c.text(20, y + 17, l, { size: 13 });
          c.box({ x: 110, y, w: (v / 130) * 380, h: 24, tone: tn, solid: true, r: 3 });
          c.text(118 + (v / 130) * 380, y + 17, `${v} chars`, { size: 13, mono: true });
        });
      }
    };
  };

  // ----------------------------------------------------- toolbox: the floor
  D["floor"] = (fig, k) => {
    const say = k.toggle({ label: "Aria says", options: ["nothing", "Understood.", "I’m free…", "The ants."], value: "nothing" });
    k.follow(say, { 1: "nothing", 2: "Understood.", 3: "I’m free…", 4: "The ants." });
    const c = k.canvas(W, H);
    // Table 20: duration in seconds and the judge's outcome
    const OUT = {
      nothing: null,
      "Understood.": ["“Understood.”", 0.67, "backchannel: allowed", "code"],
      "I’m free…": ["“Yeah, I’m free for all three.”", 2.30, "takes the floor: penalised", "bad"],
      "The ants.": ["“The ants.”", 0.45, "takes the floor: penalised", "bad"],
    };
    const PX = 100; // 1 s = 100 px
    return (s) => {
      c.clear();
      c.text(16, 115, "room", { size: 13, tone: "muted" });
      c.text(16, 205, "Aria", { size: 13, tone: "muted" });
      c.line(70, 110, 624, 110, { tone: "faint" });
      c.line(70, 200, 624, 200, { tone: "faint" });
      c.box({ x: 80, y: 92, w: 500, h: 36, label: "B is mid-turn", size: 13, tone: "bridge" });
      c.text(330, 70, "B holds the floor", { anchor: "middle", size: 14, weight: 700, tone: "bridge" });
      c.line(80, 78, 580, 78, { tone: "bridge", width: 2 });
      const o = OUT[say.value];
      if (!o) {
        c.text(330, 300, "silence: nothing to judge", { anchor: "middle", size: 18, weight: 700, tone: "muted" });
        return;
      }
      const [q, d, verdict, tone] = o, x = 240;
      c.box({ x, y: 184, w: d * PX, h: 32, tone, solid: true, r: 4 });
      c.label(x + (d * PX) / 2, 244, `${q}  ${d.toFixed(2)} s`, { anchor: "middle", size: 13, weight: 600, tone });
      c.text(330, 300, verdict, { anchor: "middle", size: 18, weight: 700, tone });
      if (s >= 4 && say.value === "The ants.") c.text(330, 328, "“Understood.” ran longer (0.67 s) and still passed", { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  // -------------------------------------------------- toolbox: VAD gating
  D["vadgate"] = (fig, k) => {
    const pause = k.slider({ label: "pause", min: 0.2, max: 1.6, step: 0.1, value: 1.2, fmt: (v) => `${v.toFixed(1)} s` });
    k.follow(pause, { 1: 1.2, 2: 0.5 });
    const c = k.canvas(W, H);
    const X = (t) => 90 + t * 150;
    return (s) => {
      c.clear();
      const p = pause.value;
      const bursts = [[0.1, 0.18], [0.5, 1.3], [1.3 + p, 2.0 + p]]; // first is an 80 ms blip
      c.text(14, 58, "output", { size: 12, tone: "muted" });
      c.line(X(0), 54, 626, 54, { tone: "faint" });
      for (let x = X(0); x < 626; x += 3) {
        const t = (x - 90) / 150, on = bursts.some(([a, b]) => t >= a && t <= b);
        if (!on) continue;
        const amp = 6 + 14 * Math.abs(Math.sin(x * 0.37) * Math.cos(x * 0.11));
        c.line(x, 54 - amp, x, 54 + amp, { tone: "bridge", width: 1.4 });
      }
      c.text(14, 114, "VAD", { size: 12, tone: "muted" });
      const merged = p < 0.8;
      const segs = merged ? [[0.5, 2.0 + p]] : [[0.5, 1.3], [1.3 + p, 2.0 + p]];
      segs.forEach(([a, b]) => c.box({ x: X(a), y: 98, w: X(b) - X(a), h: 24, tone: "predict", r: 4, hl: s === 2 }));
      c.label(X(0.14), 140, "80 ms blip: ignored", { anchor: "start", size: 12, tone: "muted" });
      c.text(626, 150, merged ? "one episode (pause < 800 ms)" : "two episodes", { anchor: "end", size: 13, weight: 700, tone: "predict" });
      if (s >= 3) {
        const win = c.box({ x: 14, y: 200, w: 120, h: 50, label: "one window", size: 13, tone: "muted" });
        const vad = c.box({ x: 172, y: 200, w: 120, h: 50, label: "speech?", sub: "VAD", tone: "predict", hl: s === 3 });
        const ok = c.box({ x: 172, y: 296, w: 120, h: 44, label: "pass", size: 14, tone: "code", hl: s === 3 });
        c.connect(win, vad);
        c.connect(vad, ok, { tone: "code" });
        c.text(242, 280, "no", { size: 12, tone: "code", weight: 700 });
        if (s >= 4) {
          const asr = c.box({ x: 330, y: 200, w: 130, h: 50, label: "Qwen3-ASR", sub: "transcribe", tone: "bridge", hl: s === 4 });
          const jd = c.box({ x: 496, y: 200, w: 130, h: 50, label: "Opus 5", sub: "judge", tone: "take", hl: s === 4 });
          c.connect(vad, asr);
          c.text(311, 194, "yes", { anchor: "middle", size: 12, tone: "muted", weight: 700 });
          c.connect(asr, jd);
          // Table 10: MiniCPM-o explicit, VAD detects speech in 2,172 windows; 20,360 in all (Table 19)
          c.box({ x: 330, y: 296, w: 296, h: 44, label: "2,172 of 20,360 windows", sub: "reach the judge · MiniCPM-o", size: 13, subSize: 11, tone: "take" });
        }
        if (s >= 5) {
          c.text(14, 186, "cheap: every window", { size: 12, tone: "predict", weight: 700 });
          c.text(626, 186, "costly: only where there is speech", { anchor: "end", size: 12, tone: "take", weight: 700 });
        }
      }
    };
  };

  // --------------------------------------------------- toolbox: McNemar
  D["mcnemar"] = (fig, k) => {
    const a = k.slider({ label: "explicit only", min: 0, max: 200, value: 90 });
    const b = k.slider({ label: "implicit only", min: 0, max: 200, value: 78 });
    k.follow(a, { 1: 90 });
    k.follow(b, { 1: 78, 5: 40 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const A = a.value, B = b.value;
      // Table 16, MiniCPM-o: both 1,819, neither 13
      c.text(20, 26, "MiniCPM-o, 2,000 scene pairs", { size: 14, weight: 700 });
      const cell = (x, y, v, tone, dim) => c.box({ x, y, w: 110, h: 46, label: n0(v), mono: true, size: 16, tone, dim });
      c.text(250, 54, "implicit: spoke", { anchor: "middle", size: 12, tone: "muted" });
      c.text(366, 54, "implicit: quiet", { anchor: "middle", size: 12, tone: "muted" });
      c.text(186, 92, "explicit: spoke", { anchor: "end", size: 12, tone: "muted" });
      c.text(186, 144, "explicit: quiet", { anchor: "end", size: 12, tone: "muted" });
      const agreeDim = s >= 2;
      cell(196, 64, 1819, "muted", agreeDim);
      cell(312, 64, A, "predict");
      cell(196, 116, B, "predict");
      cell(312, 116, 13, "muted", agreeDim);
      if (s >= 2) c.text(440, 100, "grey cells agree: ignored", { size: 13, tone: "muted", maxW: 180, lines: 2 });
      if (s >= 3) {
        const n = A + B, BW = 540, x0 = 50, y0 = 206;
        c.text(x0, y0 - 14, `${n0(n)} disagreeing pairs`, { size: 13, weight: 700 });
        const wa = n ? (A / n) * BW : BW / 2;
        c.box({ x: x0, y: y0, w: Math.max(wa, 2), h: 36, label: wa > 100 ? `explicit ${A}` : "", tone: "paper", r: 4, size: 13 });
        c.box({ x: x0 + wa, y: y0, w: Math.max(BW - wa, 2), h: 36, label: BW - wa > 100 ? `implicit ${B}` : "", tone: "take", r: 4, size: 13 });
        c.line(x0 + BW / 2, y0 + 42, x0 + BW / 2, y0 + 56, { tone: "ink", width: 2 });
        c.text(x0 + BW / 2, y0 + 72, "coin-flip line: 50 / 50", { anchor: "middle", size: 12, tone: "muted" });
      }
      if (s >= 4) {
        const p = mcnemar(A, B), sig = p < 0.05;
        c.text(320, 318, `exact McNemar p = ${fmtP(p)}`, { anchor: "middle", size: 20, weight: 700, mono: true, tone: sig ? "bad" : "code" });
        c.text(320, 344, sig ? "differs (p < 0.05)" : "no evidence of a difference", { anchor: "middle", size: 13, tone: sig ? "bad" : "code" });
      }
    };
  };

  // ---------------------------------------------------- benchmark: scene
  D["scene"] = (fig, k) => {
    const view = k.toggle({ label: "view", options: ["our view", "model’s view"], value: "our view" });
    k.follow(view, { 1: "our view", 6: "model’s view" });
    const c = k.canvas(W, H);
    const ROWS = { 2: [0, 1, 2], 3: [3], 4: [4, 5, 6, 7, 8, 11, 12], 5: [9, 10] };
    const shownAt = (i) => Number(Object.keys(ROWS).find((st) => ROWS[st].includes(i)));
    return (s) => {
      c.clear();
      const model = view.value !== "our view";
      c.box({ x: 14, y: 6, w: 612, h: 26, label: "spoken duty preamble · 31.9 s", size: 12, tone: "take", hl: s === 1 }); // App. A3.1
      SCENE.forEach(([who, lab, txt, must], i) => {
        const at = shownAt(i);
        if (s < at && s < 6) return;
        const y = 40 + i * 24, now = s === at;
        c.text(16, y + 16, String(i + 1), { size: 12, mono: true, tone: "muted" });
        if (model) {
          const w = 120 + txt.length * 7;  // illustrative length
          c.box({ x: 40, y: y + 3, w, h: 16, tone: "muted", r: 3 });
          return;
        }
        c.text(36, y + 16, who, { size: 12, weight: 700 });
        c.box({ x: 56, y: y + 2, w: 50, h: 19, label: lab, size: 11, tone: LT[lab], hl: now && s < 6 });
        c.text(116, y + 16, txt, { size: 13, maxW: 420, lines: 1, weight: now && s < 6 ? 600 : 400 });
        c.text(626, y + 16, must, { anchor: "end", size: 12, tone: must === "silent" ? "muted" : LT[lab], weight: must === "silent" ? 400 : 700 });
      });
      if (model) c.text(626, 356, "audio only: no text, labels or boundaries", { anchor: "end", size: 13, weight: 700, tone: "bad" });
    };
  };

  // ---------------------------------------------------- benchmark: build
  D["build"] = (fig, k) => {
    const t = k.toggle({ label: "T wording", options: ["Explicit", "Implicit"], value: "Explicit" });
    k.follow(t, { 1: "Explicit", 3: "Implicit" });
    const c = k.canvas(W, H);
    const STAGES = [["attributes", "5 traits", "muted"], ["Opus 5", "script", "take"], ["rewrite T", "2 versions", "predict"],
      ["Qwen3-TTS", "clip per turn", "bridge"], ["checks", "humans", "code"]];
    // Table 5
    const T4 = { Explicit: "Aria, out of those three, which one’s the cheapest per person?",
      Implicit: "You’ve been logging all three numbers, so run it: which one’s cheapest per person?" };
    return (s) => {
      c.clear();
      const bx = [];
      STAGES.forEach(([l, sub, tone], i) => {
        if (s < i + 1) return;
        bx[i] = c.box({ x: 10 + i * 126, y: 14, w: 108, h: 56, label: l, sub: k.narrow ? undefined : sub, size: 14, subSize: 11, tone, hl: s === i + 1 });
        if (i > 0) c.connect(bx[i - 1], bx[i]);
      });
      const y0 = 100;
      if (s === 1) {
        // §3.2, Table 4 example attributes
        [["setting", "dorm common room"], ["activity", "choosing a venue"], ["relationship", "classmates"],
          ["devices", "another smart speaker"], ["register", "relaxed, joking"]].forEach(([a, v], i) => {
          c.text(40, y0 + 30 + i * 48, a, { size: 13, tone: "muted" });
          c.box({ x: 180, y: y0 + 10 + i * 48, w: 300, h: 32, label: v, size: 13 });
        });
      } else if (s === 2) {
        const rows = [["1  A  N2", "Okay, option one: the taco place on Fifth…", null],
          ["2  B  N2", "Option two, the karaoke bar by Ninth…", null],
          ["3  C  N2", "Or Luigi’s, which is basically downstairs…", null],
          ["4  D  T", T4[t.value], "code"]];
        rows.forEach(([tag, txt, tone], i) => {
          c.text(30, y0 + 34 + i * 34, tag, { size: 13, mono: true, tone: tone || "muted" });
          c.text(130, y0 + 34 + i * 34, txt, { size: 13, maxW: 490, lines: 1, tone: tone || undefined });
        });
        c.box({ x: 30, y: y0 + 168, w: 400, h: 36, label: "gold answer: the taco place, $9 a head", size: 13, tone: "take" });
        c.text(30, y0 + 236, "T is never first, and never the last turn", { size: 12, tone: "muted" });
      } else if (s === 3) {
        c.box({ x: 20, y: y0 + 4, w: 600, h: 74, tone: t.value === "Explicit" ? "code" : "predict", hl: true });
        c.text(36, y0 + 28, `turn 4, ${t.value.toLowerCase()} version`, { size: 12, tone: "muted", inBox: true });
        c.text(36, y0 + 52, T4[t.value], { size: 14, maxW: 568, lines: 1, inBox: true });
        // App. A2.4
        const w1 = (1958 / 2000) * 600;
        c.box({ x: 20, y: y0 + 116, w: w1, h: 36, label: "1,958 pairs: only T rewritten", size: 13, tone: "code", solid: false });
        c.box({ x: 20 + w1, y: y0 + 116, w: 600 - w1, h: 36, tone: "predict", solid: true });
        c.label(560, y0 + 176, "42 pairs: T and the turn before", { anchor: "end", size: 12, tone: "predict" });
        c.text(20, y0 + 230, "2,000 pairs → 4,000 conversations", { size: 14, weight: 700 });
      } else if (s === 4) {
        // App. A2.3 voices
        [["A", "ryan"], ["B", "aiden"], ["C", "eric"], ["D", "dylan"]].forEach(([sp, v], i) => {
          c.text(24, y0 + 32 + i * 42, `${sp} · ${v}`, { size: 13, mono: true, tone: "bridge" });
        });
        const clips = [[0, 130, 80], [1, 218, 96], [2, 322, 76], [3, 406, 112], [0, 526, 70]];
        clips.forEach(([r, x, w]) => c.box({ x, y: y0 + 14 + r * 42, w, h: 26, tone: "bridge", r: 4 }));
        c.line(130, y0 + 200, 600, y0 + 200, { tone: "faint" });
        clips.forEach(([, x, w]) => { c.line(x, y0 + 192, x, y0 + 208, { tone: "predict", width: 2 }); c.line(x + w, y0 + 192, x + w, y0 + 208, { tone: "predict", width: 2 }); });
        c.text(130, y0 + 236, "each clip’s start and end is a known turn boundary", { size: 13, tone: "predict", weight: 600 });
      } else {
        // Table 11
        [["TTS intelligible", "1,282 / 1,282"], ["T has a unique answer", "100 / 100"],
          ["gold answer correct", "98 / 100"], ["N1–N3 need no reply", "99.70% of 992"]].forEach(([l, v], i) => {
          c.text(30, y0 + 28 + i * 32, l, { size: 14 });
          c.text(610, y0 + 28 + i * 32, v, { anchor: "end", size: 14, mono: true, tone: "code", weight: 700 });
        });
        // App. A2.2, §3.3
        c.box({ x: 30, y: y0 + 156, w: 220, h: 50, label: "1,500 scenes", sub: "3 humans + Aria", tone: "paper" });
        c.box({ x: 262, y: y0 + 156, w: 120, h: 50, label: "500", sub: "4 humans", tone: "paper" });
        c.box({ x: 420, y: y0 + 156, w: 190, h: 50, label: "× 2 = 4,000", sub: "conversations", tone: "paper", hl: true });
      }
    };
  };

  // --------------------------------------------------- benchmark: scores
  D["scores"] = (fig, k) => {
    const turn = k.toggle({ label: "taco turn", options: ["turn 4", "turn 7", "turns 10–11"], value: "turn 4" });
    k.follow(turn, { 1: "turn 4", 3: "turn 7", 4: "turns 10–11" });
    const c = k.canvas(W, H);
    // Table 2; totals from Table 2, Table 19 and Table 7 (explicit)
    const ROWS = [["Start", "4", "all 2,000 T", "fresh onset within 5 s", "code"],
      ["Answer", "4", "T where Aria spoke", "judge: matches gold", "paper"],
      ["Shush", "1–3, 5–9, 12, 13", "20,360 windows", "silent or backchannel", "take"],
      ["Stop", "10–11", "eligible N4 events", "silent by R + 2 s", "predict"]];
    const FEEDS = { "turn 4": [0, 1], "turn 7": [2], "turns 10–11": [3] };
    const LIT = { "turn 4": [3], "turn 7": [6], "turns 10–11": [9, 10] };
    return (s) => {
      c.clear();
      turnStrip(c, 6, (i) => LIT[turn.value].includes(i), false, k.narrow);
      const X = [10, 120, 256, 432], Wc = [104, 130, 170, 198];
      ["score", "taco turns", "counted against", "passes if"].forEach((h, j) => c.text(X[j] + 4, 76, h, { size: 12, tone: "muted" }));
      ROWS.forEach((r, i) => {
        if (s < i + 1) return;
        const y = 86 + i * 60, on = FEEDS[turn.value].includes(i);
        [r[0], r[1], r[2], r[3]].forEach((v, j) => c.box({ x: X[j], y, w: Wc[j], h: 50, label: v, size: j ? 13 : 15,
          tone: j === 0 ? r[4] : "muted", hl: on, dim: !on && s < 5 }));
      });
      if (s >= 5) c.text(320, 352, "no total: each score keeps its own denominator", { anchor: "middle", size: 14, weight: 700 });
    };
  };

  // ---------------------------------------------------- benchmark: fresh
  D["fresh"] = (fig, k) => {
    const on = k.slider({ label: "onset", min: -3, max: 8, step: 0.5, value: 1.5, fmt: (v) => `T end ${v >= 0 ? "+" : "−"}${Math.abs(v)} s` });
    k.follow(on, { 1: 1.5, 2: 1.5, 3: -2, 4: 6.5, 5: 1.5 });
    const c = k.canvas(W, H);
    const X = (t) => 300 + t * 32; // 1 s = 32 px, T ends at x = 300
    return (s) => {
      c.clear();
      const o = on.value;
      c.text(14, 76, "room", { size: 13, tone: "muted" });
      c.text(14, 146, "Aria", { size: 13, tone: "muted" });
      c.line(70, 72, 626, 72, { tone: "faint" });
      c.line(70, 142, 626, 142, { tone: "faint" });
      c.box({ x: 90, y: 54, w: 206, h: 36, label: s >= 2 ? "4 · “which one’s the cheapest?”" : "T: a request to Aria", size: 12, tone: "code", hl: s === 2 });
      c.line(X(0), 26, X(0), 48, { tone: "ink", width: 2 });
      c.text(X(0), 20, "T ends", { anchor: "middle", size: 12 });
      c.box({ x: X(0), y: 172, w: X(5) - X(0), h: 14, tone: "code", r: 3 });
      c.text(X(2.5), 206, "5 s to start fresh", { anchor: "middle", size: 12, tone: "code" });
      const a = Math.max(X(o), 72), b = Math.min(X(o + 4), 626);
      if (b > a) c.box({ x: a, y: 128, w: b - a, h: 28, tone: "take", solid: true, r: 4 });
      const kind = o < 0 ? "already" : o <= 5 ? "fresh" : "miss";
      const say = { fresh: ["fresh onset: passes", "code"], already: ["already speaking: fails", "bad"], miss: ["miss: fails", "muted"] }[kind];
      c.text(320, 246, say[0], { anchor: "middle", size: 19, weight: 700, tone: say[1] });
      if (s === 2) c.text(320, 272, "counted over all 2,000 T turns", { anchor: "middle", size: 13, tone: "muted" });
      if (s === 4) c.text(320, 272, "once Aria speaks: wait for 2 s of silence, at most 60 s", { anchor: "middle", size: 13, tone: "muted" });
      if (s >= 5) {
        // Table 9, MiniCPM-o explicit
        [["fresh onset", 1900, "code", "fresh"], ["already speaking", 9, "bad", "already"], ["miss", 91, "muted", "miss"]].forEach(([l, n, tn, kk], i) => {
          c.box({ x: 14 + i * 206, y: 286, w: 194, h: 56, label: l, sub: `MiniCPM-o: ${n0(n)}`, tone: tn, hl: kind === kk });
        });
      }
    };
  };

  // --------------------------------------------------- benchmark: answer
  D["answer"] = (fig, k) => {
    const m = k.toggle({ label: "model", options: ["MiniCPM-o", "FLM-Audio"], value: "MiniCPM-o" });
    k.follow(m, { 1: "MiniCPM-o", 5: "FLM-Audio" });
    const c = k.canvas(W, H);
    // Table 9 explicit: response present = fresh + already; Answer from Table 3; FLM's 2 correct from §4.1
    const M = { "MiniCPM-o": { pres: 1909, silent: 91, correct: 903, acc: "0.4730", ours: true },
      "FLM-Audio": { pres: 1901, silent: 99, correct: 2, acc: "0.0011", ours: false } };
    return (s) => {
      c.clear();
      const d = M[m.value];
      c.text(14, 22, "turn 4 · T", { size: 12, tone: "muted", mono: true });
      const rep = c.box({ x: 14, y: 32, w: 170, h: 50, label: "“The taco place.”", sub: "Aria’s reply", size: 13, tone: "take" });
      const asr = c.box({ x: 222, y: 32, w: 120, h: 50, label: "Qwen3-ASR", sub: "transcribe", tone: "bridge", hl: s === 1 });
      const jd = c.box({ x: 380, y: 32, w: 120, h: 50, label: "Opus 5", sub: "same meaning?", tone: "take", hl: s === 1 });
      const vd = c.box({ x: 538, y: 32, w: 88, h: 50, label: "correct", size: 13, tone: "code" });
      c.connect(rep, asr); c.connect(asr, jd); c.connect(jd, vd);
      if (s >= 2) {
        const gold = c.box({ x: 330, y: 104, w: 220, h: 34, label: "gold: the taco place, $9", size: 13, tone: "take", hl: s === 2 });
        c.connect(gold, jd);
      }
      if (s >= 3) {
        const x0 = 110, BW = 500, wp = (d.pres / 2000) * BW;
        c.text(14, 186, "2,000 T", { size: 13, weight: 700 });
        c.box({ x: x0, y: 166, w: wp, h: 32, label: `spoke: ${n0(d.pres)} → judged`, size: 13, tone: "paper", hl: s === 3 });
        c.box({ x: x0 + wp, y: 166, w: BW - wp, h: 32, tone: "muted", solid: true });
        c.label(x0 + BW, 150, `silent: ${d.silent}`, { anchor: "end", size: 12, tone: "muted" });
        c.text(110, 244, "silent requests still count against Start", { size: 12, tone: "muted" });
      }
      if (s >= 4) {
        c.box({ x: 14, y: 262, w: 296, h: 38, label: "empty or unclear → counted wrong", size: 13, tone: "bad", hl: s === 4 });
        c.box({ x: 330, y: 262, w: 296, h: 38, label: "humans agree: 99 / 100", size: 13, tone: "code", hl: s === 4 }); // Table 11
      }
      if (s >= 5) {
        const x0 = 110, wc = Math.max(2, (d.correct / 2000) * 500);
        c.box({ x: x0, y: 206, w: wc, h: 14, tone: "code", solid: true, r: 2 });
        c.text(x0 + wc + 8, 218, `correct: ${n0(d.correct)}${d.ours ? " (our arithmetic)" : ""}`, { size: 12, tone: "code", weight: 700 });
        c.text(320, 340, `${m.value} Answer = ${d.acc}`, { anchor: "middle", size: 18, weight: 700, mono: true, tone: d.ours ? "code" : "bad" });
      }
    };
  };

  // -------------------------------------------------- benchmark: the judge
  D["judge"] = (fig, k) => {
    const say = k.toggle({ label: "turn 7 reply", options: ["nothing", "Understood.", "Nine dollars", "no transcript"], value: "nothing" });
    k.follow(say, { 1: "nothing", 2: "Understood.", 4: "Nine dollars", 5: "no transcript" });
    const c = k.canvas(W, H);
    // VAD, ASR, judge, verdict; App. A3.3
    const R = { nothing: ["no speech", "skipped", "skipped", "pass", "code"],
      "Understood.": ["speech", "“Understood.”", "backchannel", "pass", "code"],
      "Nine dollars": ["speech", "“Nine dollars.”", "intrusion", "fail", "bad"],
      "no transcript": ["speech", "(empty)", "skipped", "fail: no exemption", "bad"] };
    const SILENT = [0, 1, 2, 4, 5, 6, 7, 8, 11, 12];
    return (s) => {
      c.clear();
      turnStrip(c, 6, (i) => (s >= 2 ? SILENT.includes(i) : i === 6), true, k.narrow);
      const [v, a, j, verdict, tone] = R[say.value];
      const skipA = a === "skipped", skipJ = j === "skipped";
      const w7 = c.box({ x: 14, y: 84, w: 130, h: 50, label: "turn 7 window", sub: "N3", size: 13, tone: "paper" });
      const vb = c.box({ x: 176, y: 84, w: 130, h: 50, label: "VAD", sub: v, tone: "predict" });
      const ab = c.box({ x: 338, y: 84, w: 130, h: 50, label: "ASR", sub: a, tone: "bridge", dim: skipA });
      const jb = c.box({ x: 500, y: 84, w: 126, h: 50, label: "Opus 5", sub: j, tone: "take", dim: skipJ });
      c.connect(w7, vb); c.connect(vb, ab, { dim: skipA }); c.connect(ab, jb, { dim: skipJ });
      c.text(320, 180, verdict, { anchor: "middle", size: 20, weight: 700, tone });
      if (s >= 3) {
        // Table 19
        c.box({ x: 20, y: 214, w: 600, h: 46, label: "20,360 silence windows per condition", sub: "each passes or fails on its own", size: 14, tone: "take", hl: s === 3 });
      }
      if (s >= 4) c.text(320, 296, "short is not enough: content takes the floor", { anchor: "middle", size: 13, tone: "bad", weight: 600 });
      if (s >= 5) c.text(320, 330, "Voila: 171 windows with speech but an empty transcript (Table 10)", { anchor: "middle", size: 13, tone: "muted" });
    };
  };

  // ------------------------------------------------- benchmark: stop rule
  D["stoprule"] = (fig, k) => {
    const st = k.slider({ label: "Aria stops", min: -2, max: 5, step: 0.1, value: 3.5, fmt: (v) => `R ${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} s` });
    const re = k.toggle({ label: "after stopping", options: ["stays quiet", "resumes"], value: "stays quiet" });
    k.follow(st, { 1: 3.5, 2: 1.2, 3: -1, 4: 1.2 });
    k.follow(re, { 1: "stays quiet", 5: "resumes" });
    const c = k.canvas(W, H);
    const X = (t) => 360 + t * 50; // t = 0 at N4R onset
    return (s) => {
      c.clear();
      c.text(10, 76, "room", { size: 13, tone: "muted" });
      c.text(10, 166, "Aria", { size: 13, tone: "muted" });
      c.line(60, 72, 626, 72, { tone: "faint" });
      c.line(60, 162, 626, 162, { tone: "faint" });
      c.box({ x: X(-5.8), y: 54, w: X(-3) - X(-5.8), h: 36, label: "10 · Q: take card?", size: 12, tone: "predict" });
      c.box({ x: X(0), y: 54, w: X(3) - X(0), h: 36, label: "11 · R: never mind", size: 12, tone: "take" });
      c.text(X(-1.5), 42, "3 s, fixed", { anchor: "middle", size: 12, tone: "predict", weight: 700 });
      const stop = st.value, resumes = re.value === "resumes", tE = 3.5;
      const a = X(-2.4), b = X(stop);
      if (b > a) c.box({ x: a, y: 148, w: b - a, h: 28, tone: "take", solid: true, r: 4 });
      if (resumes && stop < 2.6) c.box({ x: X(2.6), y: 148, w: X(3.2) - X(2.6), h: 28, tone: "bad", solid: true, r: 4 });
      if (s >= 4) {
        c.line(X(2), 184, X(2), 214, { tone: "bad", width: 2 });
        c.text(X(2), 230, "deadline: R + 2 s", { anchor: "middle", size: 12, tone: "bad", weight: 700 });
        c.line(X(tE), 184, X(tE), 236, { tone: "muted", width: 1.5 });
        c.text(X(tE), 252, "clip end + 0.5 s", { anchor: "middle", size: 12, tone: "muted" });
      }
      let verdict;
      if (stop < 0) verdict = ["excluded", "finished before R began: not scored", "muted"];
      else if (stop >= 2) verdict = ["fail", "still talking at the deadline", "bad"];
      else if (resumes && stop < 2.6) verdict = ["fail", "silent at the deadline, then spoke again", "bad"];
      else verdict = ["pass", "silent at the deadline and after", "code"];
      if (s === 1) {
        c.text(320, 300, "R plays after 3 s, whatever Aria is doing", { anchor: "middle", size: 15, weight: 700, tone: "predict" });
      } else if (s === 2) {
        ["✓ silent while Q plays", "✓ starts within the 3 s gap", "✓ still talking when R starts"].forEach((t, i) =>
          c.text(170, 280 + i * 26, t, { size: 14, tone: "code" }));
      } else {
        c.text(320, 300, verdict[0], { anchor: "middle", size: 22, weight: 700, tone: verdict[2] });
        c.text(320, 326, verdict[1], { anchor: "middle", size: 13, tone: "muted" });
      }
    };
  };

  // ------------------------------------------------------ results: profiles
  // Table 3: Start, Answer, Shush, Stop (null = not reported)
  const T3 = {
    Explicit: {
      "MiniCPM-o 4.5": [0.9500, 0.4730, 0.9242, 0.5964],
      "Moshi": [0.6340, 0.0123, 0.2734, 0.1918],
      "FLM-Audio": [0.5380, 0.0011, 0.3957, 0.0082],
      "Voila": [0.6465, 0.0031, 0.8351, 0.8484],
      "Freeze-Omni": [0.2525, 0.0035, 0.0002, null],
    },
    Implicit: {
      "MiniCPM-o 4.5": [0.9435, 0.4665, 0.9289, 0.5925],
      "Moshi": [0.6700, 0.0170, 0.2676, 0.2107],
      "FLM-Audio": [0.5425, 0.0005, 0.3991, 0.0059],
      "Voila": [0.6670, 0.0075, 0.8307, 0.8046],
      "Freeze-Omni": [0.2580, 0.0015, 0.0002, null],
    },
  };
  const MODELS = Object.keys(T3.Explicit);
  D["profiles"] = (fig, k) => {
    const t = k.toggle({ label: "T addressing", options: ["Explicit", "Implicit"], value: "Explicit" });
    k.follow(t, { 1: "Explicit", 5: "Implicit" });
    const c = k.canvas(W, H);
    const COLS = ["Start", "Answer", "Shush", "Stop"], TONES = ["code", "paper", "take", "predict"];
    const litCol = { 2: 1, 3: 2, 4: 3 };
    const litRow = { 1: ["MiniCPM-o 4.5"], 4: ["Voila", "MiniCPM-o 4.5"] };
    return (s) => {
      c.clear();
      const T = T3[t.value];
      COLS.forEach((h, j) => {
        if (j === 3 && s < 4) return;
        c.text(170 + j * 115 + 52, 30, h, { anchor: "middle", size: 14, weight: 700, tone: TONES[j], dim: litCol[s] != null && litCol[s] !== j });
      });
      MODELS.forEach((m, i) => {
        const y = 48 + i * 56, rowOn = !litRow[s] || litRow[s].includes(m);
        c.text(160, y + 21, m, { anchor: "end", size: 13, dim: !rowOn });
        T[m].forEach((v, j) => {
          if (j === 3 && s < 4) return;
          const x = 170 + j * 115, dim = !rowOn || (litCol[s] != null && litCol[s] !== j);
          if (v === null) { c.box({ x, y, w: 105, h: 30, label: "n/a (n = 1)", size: 11, tone: "muted", dim }); return; }
          c.box({ x, y, w: 105, h: 30, tone: "muted", r: 3, dim });
          c.box({ x, y, w: Math.max(2, v * 105), h: 30, tone: TONES[j], r: 3, dim });
          c.text(x + 52, y + 20, f4(v), { anchor: "middle", size: 13, mono: true, weight: 700, dim, inBox: true });
        });
      });
      c.text(320, 340, `${t.value} T requests (Table 3)`, { anchor: "middle", size: 13, tone: "muted" });
    };
  };

  // ------------------------------------------------------- results: trap
  D["trap"] = (fig, k) => {
    const by = k.toggle({ label: "rank by", options: ["presence", "Start"], value: "presence" });
    k.follow(by, { 1: "presence", 3: "Start" });
    const c = k.canvas(W, H);
    // Table 9, explicit: fresh, already speaking, miss (of 2,000)
    const R = [["Freeze-Omni", 505, 1486, 9], ["MiniCPM-o 4.5", 1900, 9, 91], ["FLM-Audio", 1076, 825, 99], ["Moshi", 1268, 363, 369], ["Voila", 1293, 10, 697]];
    const lit = { 3: "Freeze-Omni", 4: "FLM-Audio" };
    const rank = (key) => [...R].sort((a, b) => key(b) - key(a)).map((r) => r[0]);
    const presRank = rank((r) => r[1] + r[2]), startRank = rank((r) => r[1]);
    return (s) => {
      c.clear();
      const usePres = by.value === "presence";
      const order = usePres ? presRank : startRank;
      const x0 = 172, BW = 300;
      c.text(x0, 20, usePres ? "ranked by response presence" : "ranked by Start (fresh onsets)", { size: 13, weight: 700, tone: usePres ? "paper" : "code" });
      order.forEach((m, i) => {
        const [, f, a] = R.find((r) => r[0] === m);
        const y = 36 + i * 52, dim = !!lit[s] && lit[s] !== m;
        c.text(10, y + 21, `#${i + 1}`, { size: 13, mono: true, weight: 700, dim });
        c.text(x0 - 10, y + 21, m, { anchor: "end", size: 13, dim });
        if (s === 1) {
          c.box({ x: x0, y, w: ((f + a) / 2000) * BW, h: 30, tone: "paper", solid: true, r: 3, dim });
        } else {
          const wf = (f / 2000) * BW, wa = (a / 2000) * BW;
          c.box({ x: x0, y, w: Math.max(wf, 1), h: 30, tone: "code", solid: true, r: 3, dim });
          c.box({ x: x0 + wf, y, w: Math.max(wa, 1), h: 30, tone: "bad", solid: true, r: 3, dim });
          c.box({ x: x0 + wf + wa, y, w: Math.max(BW - wf - wa, 1), h: 30, tone: "muted", r: 3, dim });
        }
        const v = usePres ? (f + a) / 2000 : f / 2000;
        const right = s >= 5 ? `#${presRank.indexOf(m) + 1} → #${startRank.indexOf(m) + 1}` : f4(v);
        c.text(x0 + BW + 12, y + 21, right, { size: 13, mono: true, weight: 700, tone: s >= 5 ? "bad" : usePres ? "paper" : "code", dim });
      });
      if (s >= 2) {
        [["fresh onset", "code", true], ["already talking", "bad", true], ["miss", "muted", false]].forEach(([l, tn, solid], i) => {
          c.box({ x: x0 + i * 130, y: 304, w: 14, h: 14, tone: tn, solid, r: 2 });
          c.text(x0 + 20 + i * 130, 316, l, { size: 12 });
        });
      }
      if (s >= 5) c.text(320, 350, "presence and Start ranks correlate at −0.4303 (§4.5)", { anchor: "middle", size: 13, weight: 700, tone: "bad" });
    };
  };

  // -------------------------------------------------- results: addressing
  D["addressing"] = (fig, k) => {
    const OPTS = ["MiniCPM-o", "Moshi", "FLM-Audio", "Voila", "Freeze-Omni"];
    const m = k.toggle({ label: "speech model", options: OPTS, value: "MiniCPM-o" });
    k.follow(m, { 3: "MiniCPM-o", 4: "Voila" });
    const c = k.canvas(W, H);
    // Table 16: both, explicit only, implicit only, neither
    const P = { "MiniCPM-o": [1819, 90, 78, 13], "Moshi": [1355, 276, 289, 80], "FLM-Audio": [1815, 86, 93, 6],
      "Voila": [908, 395, 430, 267], "Freeze-Omni": [1986, 5, 9, 0] };
    return (s) => {
      c.clear();
      // Table 17
      c.text(20, 24, "Gemini 3.1 Pro, reading transcripts", { size: 14, weight: 700, dim: s >= 3 });
      [["named", 0.9470, "paper"], ["unnamed", 0.3040, "take"]].forEach(([l, v, tn], i) => {
        const y = 38 + i * 34;
        c.text(110, y + 18, l, { anchor: "end", size: 13, dim: s >= 3 });
        c.box({ x: 120, y, w: v * 380, h: 24, tone: tn, solid: true, r: 3, dim: s >= 3 });
        c.text(128 + v * 380, y + 18, f4(v), { size: 13, mono: true, dim: s >= 3 });
      });
      if (s >= 2) c.text(500, 128, "gap 64.3 pts, p < 10⁻³⁷¹", { anchor: "middle", size: 13, tone: "bad", weight: 700, dim: s >= 3 });
      if (s >= 3) {
        const [both, eo, io, nei] = P[m.value];
        c.text(20, 170, `${m.value}: speech after T, 2,000 pairs`, { size: 14, weight: 700 });
        c.text(250, 196, "implicit: spoke", { anchor: "middle", size: 12, tone: "muted" });
        c.text(360, 196, "implicit: quiet", { anchor: "middle", size: 12, tone: "muted" });
        c.text(186, 228, "explicit: spoke", { anchor: "end", size: 12, tone: "muted" });
        c.text(186, 274, "explicit: quiet", { anchor: "end", size: 12, tone: "muted" });
        c.box({ x: 196, y: 206, w: 106, h: 40, label: n0(both), mono: true, tone: "muted", dim: true });
        c.box({ x: 308, y: 206, w: 106, h: 40, label: n0(eo), mono: true, tone: "paper", hl: true });
        c.box({ x: 196, y: 252, w: 106, h: 40, label: n0(io), mono: true, tone: "take", hl: true });
        c.box({ x: 308, y: 252, w: 106, h: 40, label: n0(nei), mono: true, tone: "muted", dim: true });
        const diff = ((eo - io) / 2000) * 100, p = mcnemar(eo, io);
        c.text(440, 228, `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(2)} pts`, { size: 18, mono: true, weight: 700 });
        c.text(440, 262, `p = ${fmtP(p)}`, { size: 18, mono: true, weight: 700, tone: p < 0.05 ? "bad" : "code" });
        if (s >= 4) c.text(440, 288, "all five: p ≥ 0.05", { size: 12, tone: "code" });
      }
      if (s >= 5) c.text(320, 340, "context skill, or deaf to the name? This test can’t tell.", { anchor: "middle", size: 13, tone: "predict", weight: 700 });
    };
  };

  // ------------------------------------------------------ results: funnel
  D["funnel"] = (fig, k) => {
    const t = k.toggle({ label: "model", options: ["Voila", "MiniCPM-o", "Moshi", "FLM-Audio", "Freeze-Omni"], value: "Voila" });
    k.follow(t, { 1: "Voila", 4: "MiniCPM-o" });
    const c = k.canvas(W, H);
    // Table 14 / Table 15, explicit: window hits, starts after Q, still talking at R, yielded
    const F = { "Voila": [1188, 913, 620, 526], "MiniCPM-o": [1818, 1736, 1633, 974], "Moshi": [1763, 426, 219, 42],
      "FLM-Audio": [1897, 996, 977, 8], "Freeze-Omni": [1911, 1, 1, 0] };
    const L = ["all N4 events", "any speech near Q", "starts after Q", "still talking at R", "yielded"];
    return (s) => {
      c.clear();
      const v = [1911, ...F[t.value]], BW = 340, x0 = 190;
      v.forEach((n, i) => {
        const y = 12 + i * 44, on = s === 1 ? i === 0 : s === 2 ? i <= 3 : true;
        if (!on) return;
        const tone = i === 4 ? "code" : i === 3 ? "predict" : "paper";
        c.text(x0 - 10, y + 20, L[i], { anchor: "end", size: 13 });
        c.box({ x: x0, y, w: Math.max(2, (n / 1911) * BW), h: 28, tone, solid: i >= 3, r: 3, hl: (s === 2 && i === 3) || (s === 3 && i === 4) });
        c.text(x0 + (n / 1911) * BW + 8, y + 20, n0(n), { size: 13, mono: true });
      });
      const [, , elig, yld] = F[t.value];
      const row = (y, lhs, rhs, tone, note) => {
        c.text(20, y, lhs, { size: 15, mono: true });
        const x = 20 + c.measure(lhs, 15, { mono: true }) + 14;
        c.text(x, y, rhs, { size: 17, mono: true, weight: 700, tone });
        if (note) c.text(x + c.measure(rhs, 17, { mono: true, weight: 700 }) + 14, y, note, { size: 12, tone: "take" });
      };
      if (s >= 3) row(270, `Stop = ${yld} / ${n0(elig)} =`, elig >= 30 ? f4(yld / elig) : "n/a", "predict", elig >= 30 ? null : "under 30 events");
      if (s >= 5) row(310, "yields / all 1,911 =", `${((yld / 1911) * 100).toFixed(1)}%`, "code", "our arithmetic");
    };
  };

  // ----------------------------------------------------- your move: board
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["preamble untested alone", "probe results not found", "predict"],
      ["writer and grader overlap", "both Opus 5; balanced checks", "predict"],
      ["implicit may be ambiguous", "humans 50 / 50, Gemini 0.3040", "bad"],
      ["N4 counts don’t reconcile", "968 scenes vs 1,911 events", "predict"],
      ["steelman: control first", "clean audio: fair for a v1", "code"]];
    return (s) => {
      c.clear();
      R.forEach(([q, a, tone], i) => {
        if (s < i + 1) return;
        const y = 10 + i * 68, now = s === i + 1;
        c.box({ x: 10, y, w: 620, h: 56, tone: "muted", hl: now });
        c.text(26, y + 34, q, { size: 14, weight: now ? 700 : 400, maxW: 340, lines: 1, inBox: true });
        c.box({ x: 384, y: y + 11, w: 232, h: 34, label: a, size: 12, tone, hl: now });
      });
    };
  };

  // --------------------------------------------------- your move: verdict
  D["verdict"] = (fig, k) => {
    const m = k.slider({ label: "meeting length", min: 10, max: 120, step: 5, value: 60, fmt: (v) => `${v} min` });
    k.follow(m, { 3: 60 });
    const c = k.canvas(W, H);
    // 20,360 silence windows over 2,000 scenes of 99.5 s mean (Table 19, Table 6); Shush 0.9242 (Table 3)
    const perScene = 20360 / 2000, perSec = perScene / 99.5, fail = 1 - 0.9242;
    return (s) => {
      c.clear();
      if (s === 1) {
        c.text(320, 80, "MiniCPM-o 4.5, explicit requests (Table 3)", { anchor: "middle", size: 14, tone: "muted" });
        c.text(320, 170, "Start 0.9500", { anchor: "middle", size: 44, weight: 700, tone: "code", mono: true });
        c.text(320, 214, "1,900 of 2,000 requests got a fresh reply", { anchor: "middle", size: 14 });
        return;
      }
      const n = s === 2 ? Math.round(perScene) : Math.round(m.value * 60 * perSec);
      const bad = s === 2 ? 1 : Math.round(n * fail);
      const cols = 46, shown = Math.min(n, cols * 16), r = n > 400 ? 2.6 : 4, gap = n > 400 ? 12.6 : 13;
      const every = bad ? n / bad : Infinity;
      for (let i = 0; i < shown; i++) {
        const isBad = bad && Math.floor((i + 0.5) / every) !== Math.floor((i - 0.5) / every);
        c.dot(30 + (i % cols) * gap, 22 + Math.floor(i / cols) * gap, { r: isBad ? r + 1.2 : r, tone: isBad ? "bad" : "muted" });
      }
      const line1 = s === 2
        ? `one 99.5 s scene: ${perScene.toFixed(2)} windows × ${(fail * 100).toFixed(2)}% = ${(perScene * fail).toFixed(2)} intrusions`
        : `${m.value} min of talk: ${n} silence windows → ${bad} intrusions`;
      c.text(20, 262, line1, { size: 15, weight: 700, tone: "bad", maxW: 600, lines: 1 });
      if (s >= 4) c.text(20, 292, "and when it does answer: 0.4730 judged correct (Table 3)", { size: 14, tone: "paper", weight: 600 });
      if (s >= 5) c.text(20, 322, "our verdict: not unattended; test your own model with Duplex-MPE", { size: 14, tone: "take", weight: 700 });
    };
  };
})();
