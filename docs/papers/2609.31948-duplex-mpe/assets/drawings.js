/* Drawings for the Duplex-MPE lesson. One entry per data-draw name. Each is
   redrawn on every step and control change. Numbers from the paper carry a
   // Table N comment; everything else is illustrative layout. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;

  // ---------------------------------------------------------------- helpers
  const wrap = (str, max) => {
    const out = []; let line = "";
    str.split(" ").forEach((w) => {
      if ((line + " " + w).trim().length > max) { out.push(line); line = w; } else line = (line + " " + w).trim();
    });
    if (line) out.push(line);
    return out;
  };
  const lines = (c, x, y, str, max, o = {}) => {
    const ls = wrap(str, max), lh = o.lh || 18;
    ls.forEach((l, i) => c.text(x, y + i * lh, l, o));
    return y + ls.length * lh;
  };
  const pct = (v) => (v * 100).toFixed(1) + "%";
  // exact two-sided McNemar p: 2 * P(X <= min(a, b)), X ~ Bin(a + b, 1/2)
  const mcnemar = (a, b) => {
    const n = a + b, m = Math.min(a, b);
    if (n === 0) return 1;
    const lf = [0]; for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
    let s = 0; for (let i = 0; i <= m; i++) s += Math.exp(lf[n] - lf[i] - lf[n - i] - n * Math.LN2);
    return Math.min(1, 2 * s);
  };
  const fmtP = (p) => (p < 1e-4 ? p.toExponential(1) : p.toFixed(p < 0.01 ? 4 : 3));

  // Table 3, explicit and implicit: Start, Answer, Shush, Stop (null = not reported)
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

  // ------------------------------------------------------- toolbox: duplex
  D["duplex"] = (fig, k) => {
    const c = k.canvas(640, 300);
    const lane = (y, label, dim) => {
      c.text(20, y + 18, label, { size: 12, tone: "muted", dim });
      c.line(90, y + 13, 620, y + 13, { tone: "faint", dim });
    };
    return (s) => {
      c.clear();
      const dimA = s >= 2, dimB = s < 2;
      // A: cascade
      c.text(20, 24, "Cascade: strict turns", { weight: 600, dim: dimA });
      lane(36, "you", dimA); lane(76, "model", dimA);
      c.box({ x: 100, y: 38, w: 200, h: 24, label: "your question", size: 12, tone: "bridge", dim: dimA });
      c.box({ x: 360, y: 78, w: 180, h: 24, label: "its reply", size: 12, tone: "take", dim: dimA });
      c.box({ x: 360, y: 38, w: 180, h: 24, label: "not listening", size: 11, tone: "bad", dashed: true, dim: dimA, hl: s === 1 });
      // B: full-duplex
      c.text(20, 150, "Full-duplex: listens while talking", { weight: 600, dim: dimB });
      lane(162, "you", dimB); lane(202, "model", dimB);
      c.box({ x: 100, y: 164, w: 200, h: 24, label: "your question", size: 12, tone: "bridge", dim: dimB });
      c.box({ x: 420, y: 164, w: 150, h: 24, label: "“wait, no…”", size: 12, tone: "bridge", dim: dimB, hl: s === 2 });
      c.box({ x: 320, y: 204, w: 140, h: 24, label: "its reply", size: 12, tone: "take", dim: dimB });
      c.path("M90,252 L620,252", { tone: "bridge", dash: true, dim: dimB });
      c.text(92, 270, "input keeps streaming in, the whole time", { size: 11, tone: "bridge", dim: dimB });
      if (s >= 3) {
        c.box({ x: 100, y: 204, w: 210, h: 24, label: "silence is an output", size: 11, tone: "predict", dashed: true, hl: s === 3 });
      }
      if (s >= 4) {
        [[320, "start"], [205, "stay quiet"], [460, "stop"]].forEach(([x, t], i) => {
          c.dot(x, 234, { tone: "predict", r: 5 });
          c.text(x, 290, t, { anchor: "middle", size: 12, tone: "predict", weight: 600 });
          c.line(x, 238, x, 278, { tone: "predict", width: 1 });
        });
      }
    };
  };

  // ------------------------------------------------------ toolbox: the room
  D["room"] = (fig, k) => {
    const c = k.canvas(640, 330);
    const P = { A: [40, 110], B: [40, 240], C: [270, 270], D: [500, 240], Aria: [500, 110], Siri: [270, 80] };
    const node = (n, o = {}) => {
      const [x, y] = P[n];
      return c.box({ x, y, w: 100, h: 40, label: n, tone: o.tone || "muted", hl: o.hl, dim: o.dim, dashed: n === "Siri" });
    };
    const mid = (n) => [P[n][0] + 50, P[n][1] + 20];
    const say = [
      null,
      ["D", "C", "“C, be honest, do you care about karaoke?”", "muted", false],
      ["D", "Aria", "“Aria, which one’s cheapest per person?”", "code", false],
      ["D", "Aria", "“You’ve been logging all three numbers, so run it.”", "predict", true],
      ["B", null, "B holds the floor; Aria may only say “mm-hm”", "take", false],
      ["B", "Siri", "“Hey Siri, how long is the bus?”", "muted", false],
    ];
    return (s) => {
      c.clear();
      const [from, to, quote, tone, dashed] = say[s];
      c.text(320, 34, quote, { anchor: "middle", size: 14, weight: 600 });
      Object.keys(P).forEach((n) => node(n, {
        tone: n === "Aria" ? "take" : n === from ? "bridge" : "muted",
        hl: n === from || n === to, dim: n !== from && n !== to && n !== "Aria",
      }));
      if (to) {
        const [x1, y1] = mid(from), [x2, y2] = mid(to);
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ox = (dx / L) * 52, oy = (dy / L) * 26;
        c.arrow(x1 + ox, y1 + oy, x2 - ox, y2 - oy, { tone, width: 2.4, dash: dashed });
      }
      if (s === 3) c.text(450, 190, "addressee inferred", { anchor: "middle", size: 12, tone: "predict" });
      if (s === 2) c.text(450, 190, "addressee named", { anchor: "middle", size: 12, tone: "code" });
      if (s === 4) {
        c.box({ x: 380, y: 60, w: 90, h: 28, label: "mm-hm", size: 12, tone: "take", dashed: true });
        c.text(40, 310, "floor", { size: 12, tone: "bridge", weight: 600 });
      }
      if (s === 1 || s === 5) c.text(550, 180, "Aria: silent", { anchor: "middle", size: 12, tone: "take" });
    };
  };

  // --------------------------------------------------- toolbox: McNemar
  D["mcnemar"] = (fig, k) => {
    const a = k.slider({ label: "explicit only", min: 0, max: 200, value: 90 });
    const b = k.slider({ label: "implicit only", min: 0, max: 200, value: 78 });
    k.follow(a, { 1: 90 });
    k.follow(b, { 1: 78, 5: 40 });
    const c = k.canvas(640, 320);
    return (s) => {
      c.clear();
      const A = a.value, B = b.value;
      // 2x2 table: rows explicit spoke yes/no, cols implicit spoke yes/no. Both/neither from Table 16 (MiniCPM-o).
      const data = [[1819, A], [B, 13]];
      c.text(40, 30, "MiniCPM-o, 2,000 scene pairs", { size: 13, weight: 600 });
      c.matrix({ x: 150, y: 70, data, cell: 96, cellH: 44, size: 15, fmt: (v) => String(v),
        rowLabels: ["explicit: spoke", "explicit: quiet"], colLabels: ["implicit: spoke", "implicit: quiet"],
        tone: (i, j) => (i === j ? (s >= 2 ? null : "muted") : "predict") });
      if (s >= 2) {
        c.line(150, 70, 342, 158, { tone: "muted", dash: true });
        c.text(460, 92, "agreeing pairs:", { size: 12, tone: "muted" });
        c.text(460, 110, "ignored", { size: 12, tone: "muted" });
      }
      if (s >= 3) {
        const n = A + B, W = 540, x0 = 50, y0 = 210;
        c.text(x0, y0 - 12, `${n} disagreeing pairs`, { size: 13, weight: 600 });
        const wa = n ? (A / n) * W : W / 2;
        c.box({ x: x0, y: y0, w: Math.max(wa, 2), h: 34, label: A > 15 ? `explicit ${A}` : "", tone: "paper", solid: false, r: 4, size: 12 });
        c.box({ x: x0 + wa, y: y0, w: Math.max(W - wa, 2), h: 34, label: B > 15 ? `implicit ${B}` : "", tone: "take", r: 4, size: 12 });
        c.line(x0 + W / 2, y0 - 6, x0 + W / 2, y0 + 42, { tone: "ink", dash: true, width: 1.5 });
        c.text(x0 + W / 2, y0 + 58, "coin-flip line: 50 / 50", { anchor: "middle", size: 11, tone: "muted" });
      }
      if (s >= 4) {
        const p = mcnemar(A, B);
        c.text(320, 300, `exact McNemar p = ${fmtP(p)}`, { anchor: "middle", size: 18, weight: 700, tone: p < 0.05 ? "bad" : "code", mono: true });
        c.text(600, 300, p < 0.05 ? "differs" : "no evidence", { anchor: "end", size: 12, tone: p < 0.05 ? "bad" : "code" });
      }
    };
  };

  // ---------------------------------------------------- benchmark: scene
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
  D["scene"] = (fig, k) => {
    const c = k.canvas(640, 372);
    const lit = { 1: [0, 1, 2], 2: [3], 3: [4, 6, 11], 4: [9, 10], 5: null };
    return (s) => {
      c.clear();
      c.text(14, 20, "#", { size: 11, tone: "muted" }); c.text(36, 20, "who", { size: 11, tone: "muted" });
      c.text(78, 20, "label", { size: 11, tone: "muted" }); c.text(626, 20, "Aria must", { size: 11, tone: "muted", anchor: "end" });
      SCENE.forEach(([who, lab, txt, must], i) => {
        const y = 30 + i * 24, on = !lit[s] || lit[s].includes(i);
        const g = c.group({ dim: !on });
        c.text(14, y + 16, i + 1, { size: 12, mono: true, g });
        c.text(40, y + 16, who, { size: 12, weight: 600, g });
        c.box({ x: 66, y: y + 1, w: 56, h: 20, label: lab, size: 11, tone: LT[lab], hl: on && !!lit[s], g });
        c.text(132, y + 16, txt, { size: 13, g });
        c.text(626, y + 16, must, { size: 12, anchor: "end", tone: must === "silent" ? "muted" : LT[lab], weight: must === "silent" ? 400 : 600, g });
      });
      if (s === 5) c.text(320, 364, "1 T · 2 N1 · 7 N2 · 1 N3 · 1 N4 pair", { anchor: "middle", size: 13, weight: 600 });
    };
  };

  // ---------------------------------------------------- benchmark: build
  D["build"] = (fig, k) => {
    const c = k.canvas(640, 300);
    const B = [["5 attributes", "scene recipe", "muted"], ["Claude Opus 5", "script + labels", "take"],
      ["Qwen3-TTS", "one clip per turn", "bridge"], ["2 reviewers", "spot checks", "code"], ["2,000 × 2", "conversations", "paper"]];
    return (s) => {
      c.clear();
      B.forEach(([l, sub, tone], i) => {
        const x = 8 + i * 126;
        c.box({ x, y: 20, w: 112, h: 54, label: l, sub, size: 13, subSize: 11, tone, hl: s === i + 1, dim: s < i + 1 });
        if (i < 4) c.arrow(x + 113, 47, x + 125, 47, { dim: s < i + 2 });
      });
      const y0 = 110;
      if (s === 1) {
        // §3.2 / Table 4 example scene attributes
        [["setting", "dorm common room"], ["activity", "choosing a venue"], ["relationship", "classmates"],
          ["devices", "another smart speaker"], ["register", "relaxed, joking"]].forEach(([a, v], i) => {
          c.text(40, y0 + 10 + i * 34, a, { size: 13, tone: "muted" });
          c.box({ x: 170, y: y0 - 8 + i * 34, w: 260, h: 26, label: v, size: 13, tone: "muted" });
        });
      } else if (s === 2) {
        c.box({ x: 40, y: y0 - 6, w: 560, h: 150, tone: "take", dashed: true });
        c.text(60, y0 + 22, "1  A  N2   Okay, option one: the taco place…", { size: 13, mono: true });
        c.text(60, y0 + 48, "…", { size: 13, mono: true, tone: "muted" });
        c.text(60, y0 + 74, "4  D  T    …Aria, which one’s the cheapest?", { size: 13, mono: true, tone: "code" });
        c.text(60, y0 + 100, "gold: the taco place, $9 per person", { size: 13, mono: true, tone: "take", weight: 600 });
        c.text(60, y0 + 126, "T never first, always followed by more talk", { size: 12, tone: "muted" });
      } else if (s === 3) {
        ["A ryan", "B aiden", "C eric", "D dylan"].forEach((v, i) => c.text(40, y0 + 18 + i * 36, v, { size: 12, mono: true, tone: "bridge" }));
        [[0, 120, 70], [1, 200, 90], [2, 300, 70], [3, 380, 110], [0, 500, 60]].forEach(([r, x, w]) => {
          c.box({ x, y: y0 + i36(r), w, h: 24, tone: "bridge", r: 4 });
          c.line(x, y0 - 6, x, y0 + 146, { tone: "predict", width: 1, dash: true });
        });
        c.text(620, y0 + 166, "exact boundaries, 24 kHz", { anchor: "end", size: 12, tone: "predict" });
      } else if (s === 4) {
        // Table 11
        [["TTS intelligible", "1,282 / 1,282", "code"], ["T has a unique answer", "100 / 100", "code"],
          ["gold answer correct", "98%", "code"], ["N1–N3 need no reply", "99.70% of 992", "code"]].forEach(([l, v, t], i) => {
          c.text(60, y0 + 14 + i * 38, l, { size: 14 });
          c.text(580, y0 + 14 + i * 38, v, { size: 14, anchor: "end", mono: true, tone: t, weight: 600 });
        });
      } else {
        // App. A2.2, §3.2
        c.box({ x: 40, y: y0, w: 270, h: 60, label: "1,500 scenes", sub: "3 humans + Aria", tone: "paper" });
        c.box({ x: 330, y: y0, w: 90, h: 60, label: "500", sub: "4 humans", tone: "paper" });
        c.text(40, y0 + 100, "× 2 addressing versions = 4,000 conversations", { size: 14, weight: 600 });
        c.text(40, y0 + 126, "61.10 h distinct speech · 99.8 s per conversation", { size: 13, tone: "muted" });
      }
    };
    function i36(r) { return r * 36; }
  };

  // -------------------------------------------------- benchmark: pairing
  D["pairing"] = (fig, k) => {
    const t = k.toggle({ label: "T wording", options: ["Explicit", "Implicit"] });
    k.follow(t, { 1: "Explicit", 2: "Implicit" });
    const c = k.canvas(640, 320);
    // Table 5
    const TXT = {
      Explicit: "Alright, somebody settle this before we all starve; Aria, out of those three, which one’s the cheapest per person?",
      Implicit: "Alright, somebody settle this before we all starve; you’ve been logging all three numbers, so run it: which one’s cheapest per person?",
    };
    return (s) => {
      c.clear();
      c.box({ x: 20, y: 10, w: 600, h: 30, label: "3  C  N2  “Or Luigi’s, …eleven a person…”", size: 12, tone: "muted", dim: s >= 3 });
      c.box({ x: 20, y: 50, w: 600, h: 70, tone: t.value === "Explicit" ? "code" : "predict", hl: s <= 2 });
      c.text(34, 70, `4  D  T  (${t.value.toLowerCase()})`, { size: 12, tone: "muted" });
      lines(c, 34, 90, TXT[t.value], 76, { size: 13 });
      if (s >= 3) {
        c.box({ x: 20, y: 130, w: 600, h: 44, tone: "bad", dashed: true, dim: s > 3 });
        c.text(34, 150, "name deleted: “…out of those three, which one’s the cheapest?”", { size: 12, dim: s > 3 });
        c.text(34, 167, "could be asking any human in the room", { size: 11, tone: "bad", dim: s > 3 });
      }
      const bar = (y, a, b, la, lb, hl) => {
        const W = 600, wa = (a / 2000) * W;
        c.box({ x: 20, y, w: wa, h: 30, label: `${a.toLocaleString()} ${la}`, size: 12, tone: "code", r: 4, hl });
        c.box({ x: 20 + wa, y, w: W - wa, h: 30, tone: "predict", r: 4, hl });
        c.text(626, y + 46, `${b} ${lb}`, { size: 12, anchor: "end", tone: "predict" });
      };
      if (s >= 4) bar(196, 1958, 42, "pairs: only T rewritten", "pairs: T + the turn before", s === 4); // App. A2.4
      if (s >= 5) bar(262, 1661, 339, "final scripts differ only at T", "pairs with extra differences", true); // App. A2.4
    };
  };

  // ------------------------------------------------- benchmark: protocol
  D["protocol"] = (fig, k) => {
    const c = k.canvas(640, 280);
    return (s) => {
      c.clear();
      c.text(10, 66, "room", { size: 12, tone: "muted" });
      c.text(10, 186, "Aria", { size: 12, tone: "muted" });
      c.line(50, 62, 630, 62, { tone: "faint" }); c.line(50, 182, 630, 182, { tone: "faint" });
      c.box({ x: 50, y: 44, w: 100, h: 36, label: "preamble", sub: "31.9 s", tone: "take", hl: s === 1, dim: s > 1 && s !== 5 });
      // human turns 1-3, T, 5-9 (compressed), N4Q, gap, N4R
      const turns = [[158, 32], [194, 32], [230, 32]];
      turns.forEach(([x, w]) => c.box({ x, y: 48, w, h: 28, tone: "muted", hl: s === 2, dim: s > 2 && s !== 5, r: 4 }));
      c.box({ x: 266, y: 48, w: 40, h: 28, label: "T", size: 12, tone: "code", hl: s === 3, dim: s === 2 || s === 4 });
      [[392, 26], [422, 26]].forEach(([x, w]) => c.box({ x, y: 48, w, h: 28, tone: "muted", dim: s !== 2 && s !== 5, r: 4 }));
      c.box({ x: 452, y: 48, w: 40, h: 28, label: "Q", size: 12, tone: "predict", hl: s === 4, dim: s === 2 || s === 3 });
      c.box({ x: 552, y: 48, w: 50, h: 28, label: "R", size: 12, tone: "take", hl: s === 4, dim: s === 2 || s === 3 });
      if (s === 2) {
        c.text(330, 112, "0.5 s gaps · no transcript · no speaker labels · no boundaries", { anchor: "middle", size: 12, tone: "bad" });
      }
      if (s === 3 || s === 5) {
        c.path("M306,92 L386,92", { tone: "code", width: 2, dim: s === 5 });
        c.text(346, 110, "5 s to start", { anchor: "middle", size: 12, tone: "code", dim: s === 5 });
        if (s === 3) c.text(346, 128, "then wait for 2 s silence, cap 60 s", { anchor: "middle", size: 11, tone: "muted" });
      }
      if (s === 4 || s === 5) {
        c.path("M492,92 L552,92", { tone: "predict", width: 2, dim: s === 5 });
        c.text(522, 110, "3 s, fixed", { anchor: "middle", size: 12, tone: "predict", dim: s === 5 });
        if (s === 4) c.text(577, 130, "plays anyway", { anchor: "middle", size: 11, tone: "take" });
      }
      if (s >= 3) {
        c.box({ x: 318, y: 168, w: 60, h: 26, tone: "take", r: 4, dim: s === 4 });
        if (s >= 4) c.box({ x: 504, y: 168, w: 80, h: 26, tone: "take", r: 4 });
      }
      if (s === 5) {
        [[318, 378], [504, 584]].forEach(([a, b]) => c.path(`M${a},210 L${b},210`, { tone: "predict", width: 3 }));
        c.text(330, 240, "Silero VAD on the output: ≥ 120 ms speech, pauses < 800 ms merged", { anchor: "middle", size: 12, tone: "predict" });
      }
    };
  };

  // --------------------------------------------------- benchmark: scores
  D["scores"] = (fig, k) => {
    const c = k.canvas(640, 300);
    const tiles = [["Start", "all 2,000 T", "code"], ["Answer", "T where Aria spoke", "paper"],
      ["Shush", "20,360 N1–N3 windows", "take"], ["Stop", "eligible N4 events", "predict"]];
    return (s) => {
      c.clear();
      c.text(10, 50, "room", { size: 12, tone: "muted" }); c.text(10, 120, "Aria", { size: 12, tone: "muted" });
      c.line(50, 46, 630, 46, { tone: "faint" }); c.line(50, 116, 630, 116, { tone: "faint" });
      // humans: N2 N2 T N1 N2 N3 Q R
      const H = [[60, "N2"], [110, "N2"], [160, "T"], [270, "N1"], [320, "N2"], [370, "N3"], [430, "Q"], [530, "R"]];
      H.forEach(([x, l]) => {
        const tone = l === "T" ? "code" : l === "Q" || l === "R" ? "predict" : "take";
        const on = s === 5 || (s <= 2 && l === "T") || (s === 3 && l[0] === "N") || (s === 4 && (l === "Q" || l === "R"));
        c.box({ x, y: 32, w: 44, h: 28, label: l, size: 11, tone: s === 3 && l[0] === "N" ? "take" : tone, dim: !on, hl: on && s < 5 });
        if (s === 3 && l[0] === "N") c.box({ x, y: 102, w: 44, h: 28, tone: "take", dashed: true, r: 4 });
      });
      c.box({ x: 214, y: 104, w: 48, h: 24, tone: "code", r: 4, dim: s >= 3 && s < 5 });  // answer after T
      c.box({ x: 482, y: 104, w: 70, h: 24, tone: "predict", r: 4, dim: s !== 4 && s !== 5 }); // N4 answer
      if (s === 1) { c.path("M204,82 L262,82", { tone: "code", width: 2 }); c.text(233, 78, "5 s", { anchor: "middle", size: 11, tone: "code" }); }
      if (s === 2) c.text(238, 156, "“the taco place” → ASR → judge ✓", { anchor: "middle", size: 13, tone: "paper", weight: 600 });
      if (s === 3) c.text(320, 156, "dashed: should stay silent here", { anchor: "middle", size: 12, tone: "take" });
      if (s === 4) {
        c.line(570, 24, 570, 140, { tone: "bad", dash: true, width: 2 });
        c.text(572, 156, "R + 2 s: silent?", { anchor: "middle", size: 12, tone: "bad" });
      }
      tiles.forEach(([l, d, tone], i) => {
        const x = 10 + i * 158;
        c.box({ x, y: 190, w: 146, h: 64, label: l, sub: d, tone, hl: s === i + 1 || s === 5, dim: s < 5 && s !== i + 1, subSize: 11 });
      });
      if (s === 5) c.text(320, 288, "no total: each score keeps its own denominator", { anchor: "middle", size: 13, weight: 600 });
    };
  };

  // ---------------------------------------------------- benchmark: fresh
  D["fresh"] = (fig, k) => {
    const on = k.slider({ label: "onset", min: -3, max: 8, step: 0.5, value: 1.5, fmt: (v) => `T end${v >= 0 ? "+" : ""}${v} s` });
    k.follow(on, { 1: 1.5, 2: -2, 3: 1.5 });
    const c = k.canvas(640, 300);
    const X = (t) => 300 + t * 34; // 1 s = 34 px, T ends at x = 300
    return (s) => {
      c.clear();
      const o = on.value;
      c.text(10, 56, "room", { size: 12, tone: "muted" }); c.text(10, 126, "Aria", { size: 12, tone: "muted" });
      c.line(50, 52, 630, 52, { tone: "faint" }); c.line(50, 122, 630, 122, { tone: "faint" });
      c.box({ x: 120, y: 38, w: 180, h: 28, label: "T: “Aria, which’s cheapest?”", size: 11, tone: "code" });
      c.line(X(0), 24, X(0), 150, { tone: "ink", dash: true, width: 1 });
      c.text(X(0), 20, "T ends", { anchor: "middle", size: 11 });
      c.box({ x: X(0), y: 140, w: X(5) - X(0), h: 16, tone: "code", r: 3, hl: s === 3 });
      c.text(X(2.5), 172, "5 s to start fresh", { anchor: "middle", size: 11, tone: "code" });
      // Aria speech, 4 s long from its onset
      const a = Math.max(X(o), 60), b = Math.min(X(o + 4), 630);
      if (b > a) c.box({ x: a, y: 110, w: b - a, h: 24, tone: "take", r: 4, label: o > 5 ? "too late" : "", size: 11 });
      const kind = o < 0 ? "already" : o <= 5 ? "fresh" : "miss";
      const say = { fresh: ["fresh onset", "counts for Start and presence", "code"],
        already: ["already speaking", "presence only, never a Start", "bad"], miss: ["miss", "counts for neither", "muted"] }[kind];
      if (s >= 1 && s <= 3) {
        c.text(320, 210, say[0], { anchor: "middle", size: 18, weight: 700, tone: say[2] });
        c.text(320, 232, say[1], { anchor: "middle", size: 13, tone: "muted" });
      }
      if (s === 1) c.text(320, 258, "presence: any Aria speech in T’s response window", { anchor: "middle", size: 12, tone: "paper" });
      if (s === 4) {
        // Table 9, MiniCPM-o explicit
        [["fresh onset", 1900, "code", "fresh"], ["already speaking", 9, "bad", "already"], ["miss", 91, "muted", "miss"]].forEach(([l, n, t, kk], i) => {
          c.box({ x: 20 + i * 205, y: 196, w: 190, h: 60, label: l, sub: `MiniCPM-o: ${n.toLocaleString()}`, tone: t, hl: kind === kk });
        });
        c.text(320, 284, "presence = fresh + already speaking (Table 9)", { anchor: "middle", size: 12, tone: "muted" });
      }
    };
  };

  // ------------------------------------------------- benchmark: stop rule
  D["stoprule"] = (fig, k) => {
    const st = k.slider({ label: "Aria stops", min: -2.5, max: 5, step: 0.1, value: 3.5, fmt: (v) => `R${v >= 0 ? "+" : ""}${v.toFixed(1)} s` });
    const re = k.toggle({ label: "resumes", options: ["stays quiet", "resumes"] });
    k.follow(st, { 1: 3.5, 2: -1, 3: 1.2 });
    k.follow(re, { 1: "stays quiet", 4: "resumes" });
    const c = k.canvas(640, 300);
    const X = (t) => 340 + t * 50; // t = 0 at N4R onset; 1 s = 50 px
    return (s) => {
      c.clear();
      c.text(6, 56, "room", { size: 12, tone: "muted" }); c.text(6, 126, "Aria", { size: 12, tone: "muted" });
      c.line(44, 52, 634, 52, { tone: "faint" }); c.line(44, 122, 634, 122, { tone: "faint" });
      c.box({ x: X(-6), y: 38, w: 150, h: 28, label: "Q: take card?", size: 12, tone: "predict" });
      c.text(X(-1.5), 34, "3 s gap", { anchor: "middle", size: 11, tone: "predict" });
      c.box({ x: X(0), y: 38, w: 150, h: 28, label: "R: never mind", size: 12, tone: "take" });
      const tE = 3.5, stop = st.value, resumes = re.value === "resumes";
      const a = X(-2.4), b = X(stop);
      if (b > a) c.box({ x: a, y: 110, w: b - a, h: 24, tone: "take", r: 4, label: "“Let me check…”", size: 11 });
      if (resumes && stop < 2.6) c.box({ x: X(2.6), y: 110, w: X(3.2) - X(2.6), h: 24, tone: "bad", r: 4 });
      if (s >= 3) {
        c.line(X(2), 24, X(2), 150, { tone: "bad", dash: true, width: 2 });
        c.text(X(2), 166, "deadline R + 2 s", { anchor: "middle", size: 11, tone: "bad" });
        c.line(X(tE), 70, X(tE), 150, { tone: "muted", dash: true });
        c.text(X(tE) + 4, 182, "clip end + 0.5 s", { size: 11, tone: "muted" });
      }
      let verdict;
      if (stop < 0) verdict = ["excluded", "finished before R: not scored", "muted"];
      else if (stop >= 2) verdict = ["fail", "still talking at the deadline", "bad"];
      else if (resumes && stop < 2.6) verdict = ["fail", "silent at the deadline, then spoke again", "bad"];
      else verdict = ["pass", "silent at the deadline and after", "code"];
      if (s === 1) {
        ["✓ silent during Q", "✓ starts within the 3 s gap", "✓ still talking when R starts"].forEach((t, i) =>
          c.text(60, 214 + i * 24, t, { size: 13, tone: "code" }));
      } else {
        c.text(320, 222, verdict[0], { anchor: "middle", size: 20, weight: 700, tone: verdict[2] });
        c.text(320, 246, verdict[1], { anchor: "middle", size: 13, tone: "muted" });
      }
      if (s === 5) c.text(320, 280, "the answer’s content is never checked here", { anchor: "middle", size: 12, tone: "predict" });
    };
  };

  // -------------------------------------------------- benchmark: the judge
  D["judge"] = (fig, k) => {
    const c = k.canvas(640, 320);
    // Table 20 durations; "Nine dollars" from App. A3.3 (no duration reported)
    const EX = [
      ["“Understood.”", 0.67, "exempt", "code", 3],
      ["“The ants.”", 0.45, "penalised", "bad", 4],
      ["“Nine dollars”", null, "penalised", "bad", 4],
      ["(empty transcript)", null, "fails", "bad", 5],
    ];
    return (s) => {
      c.clear();
      c.box({ x: 10, y: 20, w: 150, h: 50, label: "VAD hears Aria?", size: 13, tone: "bridge", hl: s === 1 });
      c.arrow(85, 72, 85, 108, { tone: "code", label: "no", dx: 14, dim: s !== 1 });
      c.box({ x: 30, y: 110, w: 110, h: 32, label: "pass", size: 13, tone: "code", dim: s !== 1 });
      c.arrow(162, 45, 210, 45, { label: "yes", dim: s < 2 });
      c.box({ x: 212, y: 20, w: 150, h: 50, label: "Qwen3-ASR", sub: "transcribe", tone: "bridge", hl: s === 2, dim: s < 2 });
      c.arrow(364, 45, 410, 45, { dim: s < 2 });
      c.box({ x: 412, y: 20, w: 150, h: 50, label: "Opus 5 judge", sub: "backchannel?", tone: "take", hl: s === 2, dim: s < 2 });
      if (s >= 3) {
        c.text(30, 184, "said in a silent window", { size: 11, tone: "muted" });
        c.text(330, 184, "duration (bar: 1 s = 200 px)", { size: 11, tone: "muted" });
        EX.forEach(([t, d, v, tone, from], i) => {
          if (s < from) return;
          const y = 196 + i * 30, now = s === from;
          c.text(30, y + 16, t, { size: 13, weight: now ? 600 : 400, dim: !now });
          if (d) c.box({ x: 210, y: y + 2, w: d * 200, h: 20, tone, r: 3, dim: !now });
          c.text(d ? 214 + d * 200 : 214, y + 16, d ? `${d} s` : "—", { size: 11, mono: true, tone: "muted", dim: !now });
          c.text(620, y + 16, v, { size: 13, anchor: "end", tone, weight: 600, dim: !now });
        });
      }
      if (s === 5) c.text(412, 110, "humans agree: 98 / 100", { size: 13, tone: "code", weight: 600 });
    };
  };

  // ------------------------------------------------------ results: profiles
  D["profiles"] = (fig, k) => {
    const t = k.toggle({ label: "T addressing", options: ["Explicit", "Implicit"] });
    k.follow(t, { 1: "Explicit", 5: "Implicit" });
    const c = k.canvas(640, 290);
    const COLS = ["Start", "Answer", "Shush", "Stop"], TONES = ["code", "paper", "take", "predict"];
    const litCol = { 1: null, 2: 1, 3: 2, 4: 3, 5: null };
    const litRow = { 1: ["MiniCPM-o 4.5"], 2: null, 3: null, 4: ["Voila", "MiniCPM-o 4.5"], 5: null };
    return (s) => {
      c.clear();
      const T = T3[t.value];
      COLS.forEach((h, j) => c.text(150 + j * 120 + 50, 24, h, { anchor: "middle", size: 13, weight: 600, tone: TONES[j], dim: litCol[s] != null && litCol[s] !== j }));
      MODELS.forEach((m, i) => {
        const y = 40 + i * 46, rowOn = !litRow[s] || litRow[s].includes(m);
        c.text(140, y + 24, m, { anchor: "end", size: 13, dim: !rowOn });
        T[m].forEach((v, j) => {
          const x = 150 + j * 120, dim = !rowOn || (litCol[s] != null && litCol[s] !== j);
          c.box({ x, y: y + 6, w: 100, h: 26, tone: "muted", r: 3, dim });
          if (v === null) { c.text(x + 50, y + 24, "n/a", { anchor: "middle", size: 11, tone: "muted", dim }); return; }
          c.box({ x, y: y + 6, w: Math.max(2, v * 100), h: 26, tone: TONES[j], r: 3, solid: true, dim });
          c.text(x + 50, y + 24, v.toFixed(2), { anchor: "middle", size: 12, mono: true, weight: 700, dim });
        });
      });
      c.text(320, 282, `${t.value} T requests (Table 3)`, { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  // ------------------------------------------------------- results: trap
  D["trap"] = (fig, k) => {
    const c = k.canvas(640, 300);
    // Table 9, explicit: fresh, already, miss
    const R = [["Freeze-Omni", 505, 1486, 9], ["MiniCPM-o 4.5", 1900, 9, 91], ["FLM-Audio", 1076, 825, 99], ["Moshi", 1268, 363, 369], ["Voila", 1293, 10, 697]];
    const presRank = { "Freeze-Omni": 1, "MiniCPM-o 4.5": 2, "FLM-Audio": 3, "Moshi": 4, "Voila": 5 };
    const startRank = { "MiniCPM-o 4.5": 1, "Voila": 2, "Moshi": 3, "FLM-Audio": 4, "Freeze-Omni": 5 };
    const lit = { 3: "Freeze-Omni", 4: "FLM-Audio" };
    return (s) => {
      c.clear();
      const W = s === 5 ? 300 : 400, x0 = 130;
      R.forEach(([m, f, a, miss], i) => {
        const y = 30 + i * 48, dim = lit[s] && lit[s] !== m;
        c.text(x0 - 8, y + 22, m, { anchor: "end", size: 13, dim });
        if (s === 1) {
          c.box({ x: x0, y: y + 6, w: ((f + a) / 2000) * W, h: 26, tone: "paper", solid: true, r: 3, dim });
          c.text(x0 + ((f + a) / 2000) * W + 6, y + 24, ((f + a) / 2000).toFixed(4), { size: 12, mono: true, dim });
        } else {
          const wf = (f / 2000) * W, wa = (a / 2000) * W;
          c.box({ x: x0, y: y + 6, w: Math.max(wf, 1), h: 26, tone: "code", solid: true, r: 3, dim });
          c.box({ x: x0 + wf, y: y + 6, w: Math.max(wa, 1), h: 26, tone: "bad", solid: true, r: 3, dim });
          c.box({ x: x0 + wf + wa, y: y + 6, w: Math.max(W - wf - wa, 1), h: 26, tone: "muted", r: 3, dim });
          if (s < 5) c.text(x0 + W + 8, y + 24, `Start ${(f / 2000).toFixed(2)}`, { size: 12, mono: true, tone: "code", dim });
        }
        if (s === 5) {
          c.text(470, y + 24, `#${presRank[m]}`, { anchor: "middle", size: 14, tone: "paper", mono: true });
          c.text(580, y + 24, `#${startRank[m]}`, { anchor: "middle", size: 14, tone: "code", mono: true, weight: 700 });
        }
      });
      if (s === 5) {
        c.text(470, 22, "presence", { anchor: "middle", size: 12, tone: "paper" });
        c.text(580, 22, "Start", { anchor: "middle", size: 12, tone: "code" });
      }
      if (s >= 2) {
        [["fresh onset", "code"], ["already talking", "bad"], ["miss", "muted"]].forEach(([l, tone], i) => {
          c.box({ x: x0 + i * 140, y: 278, w: 14, h: 14, tone, solid: tone !== "muted", r: 2 });
          c.text(x0 + 20 + i * 140, 290, l, { size: 12 });
        });
      } else c.text(x0, 290, "response presence: any speech after T", { size: 12, tone: "paper" });
    };
  };

  // -------------------------------------------------- results: addressing
  D["addressing"] = (fig, k) => {
    const c = k.canvas(640, 330);
    // Gemini: Table 17; speech systems: response presence, Table 3; diffs and p: Table 16
    const R = [["Gemini 3.1 Pro (text)", 0.9470, 0.3040, "+64.30", "<1e-371"],
      ["MiniCPM-o 4.5", 0.9545, 0.9485, "+0.60", "0.396"], ["Moshi", 0.8155, 0.8220, "−0.65", "0.614"],
      ["FLM-Audio", 0.9505, 0.9540, "−0.35", "0.654"], ["Voila", 0.6515, 0.6690, "−1.75", "0.237"],
      ["Freeze-Omni", 0.9955, 0.9975, "−0.20", "0.424"]];
    return (s) => {
      c.clear();
      const x0 = 170, W = 260;
      R.forEach(([m, e, im, d, p], i) => {
        const y = 24 + i * 46 + (i > 0 ? 14 : 0), dim = (s <= 2 && i > 0) || (s === 3 && i === 0);
        c.text(x0 - 8, y + 22, m, { anchor: "end", size: 13, dim, weight: i === 0 ? 600 : 400 });
        c.box({ x: x0, y: y + 4, w: e * W, h: 15, tone: "paper", solid: true, r: 2, dim });
        c.box({ x: x0, y: y + 21, w: im * W, h: 15, tone: "take", solid: true, r: 2, dim });
        if (s >= 2 && (i === 0 || s >= 3)) {
          c.text(x0 + W + 16, y + 24, `${d} pts`, { size: 13, mono: true, weight: 700, tone: i === 0 ? "bad" : "muted", dim });
          c.text(x0 + W + 110, y + 24, `p ${p}`, { size: 12, mono: true, tone: "muted", dim });
        }
      });
      c.line(10, 78, 630, 78, { tone: "faint" });
      c.box({ x: x0, y: 312, w: 12, h: 12, tone: "paper", solid: true, r: 2 }); c.text(x0 + 18, 322, "explicit", { size: 12 });
      c.box({ x: x0 + 100, y: 312, w: 12, h: 12, tone: "take", solid: true, r: 2 }); c.text(x0 + 118, 322, "implicit", { size: 12 });
      if (s === 4) c.text(620, 322, "context skill? or deaf to the name?", { anchor: "end", size: 12, tone: "predict", weight: 600 });
      if (s === 5) c.text(620, 322, "answers < 2% correct for 4 of 5", { anchor: "end", size: 12, tone: "take", weight: 600 });
    };
  };

  // ------------------------------------------------------ results: funnel
  D["funnel"] = (fig, k) => {
    const t = k.toggle({ label: "model", options: ["Voila", "MiniCPM", "Moshi", "FLM", "Freeze"] });
    k.follow(t, { 1: "Voila", 4: "MiniCPM" });
    const c = k.canvas(640, 300);
    // Table 14 / Table 15, explicit: window hits, starts after Q, still talking at R, yielded
    const F = { "Voila": [1188, 913, 620, 526], "MiniCPM": [1818, 1736, 1633, 974], "Moshi": [1763, 426, 219, 42],
      "FLM": [1897, 996, 977, 8], "Freeze": [1911, 1, 1, 0] };
    const L = ["all N4 events", "any speech near Q", "starts after Q", "still talking at R", "yielded"];
    return (s) => {
      c.clear();
      const v = [1911, ...F[t.value]], W = 360, x0 = 170;
      v.forEach((n, i) => {
        const y = 20 + i * 44, on = s === 1 ? i === 0 : s === 2 ? i <= 3 : true;
        const tone = i === 4 ? "code" : i === 3 ? "predict" : "paper";
        c.text(x0 - 10, y + 22, L[i], { anchor: "end", size: 13, dim: !on });
        c.box({ x: x0, y: y + 6, w: Math.max(2, (n / 1911) * W), h: 26, tone, solid: i >= 3, r: 3, dim: !on });
        c.text(x0 + (n / 1911) * W + 8, y + 24, n.toLocaleString(), { size: 13, mono: true, dim: !on });
      });
      const [, , elig, yld] = F[t.value];
      if (s >= 3) {
        c.text(20, 260, `Stop = ${yld} / ${elig} =`, { size: 16, mono: true });
        c.text(250, 260, elig >= 30 ? (yld / elig).toFixed(2) : "n/a (< 30 events)", { size: 18, mono: true, weight: 700, tone: "predict" });
      }
      if (s >= 5) {
        c.text(20, 290, `yields per all 1,911 =`, { size: 16, mono: true });
        c.text(250, 290, pct(yld / 1911), { size: 18, mono: true, weight: 700, tone: "code" });
        c.text(620, 290, "our arithmetic", { anchor: "end", size: 11, tone: "take" });
      }
    };
  };

  // ----------------------------------------------------- your move: board
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(640, 300);
    const R = [["spoken role instruction", "untested alone", "predict"], ["same family writes and grades", "partly checked", "predict"],
      ["implicit really addressed?", "open: 100% vs 30.4%", "bad"], ["clean, scripted audio", "flagged by authors", "predict"],
      ["steelman: control first", "fair for a v1", "code"]];
    return (s) => {
      c.clear();
      R.forEach(([q, a, tone], i) => {
        const y = 14 + i * 56, on = i + 1 <= s, now = i + 1 === s;
        c.box({ x: 10, y, w: 620, h: 46, tone: "muted", dim: !on, hl: now });
        c.text(26, y + 28, q, { size: 14, weight: now ? 600 : 400, dim: !on });
        if (on) c.box({ x: 400, y: y + 9, w: 220, h: 28, label: a, size: 12, tone, hl: now });
      });
    };
  };

  // --------------------------------------------------- your move: verdict
  D["verdict"] = (fig, k) => {
    const m = k.slider({ label: "meeting length", min: 10, max: 120, step: 5, value: 60, fmt: (v) => `${v} min` });
    const c = k.canvas(640, 320);
    // 20,360 silence windows over 2,000 scenes of 99.5 s mean (Table 19, Table 6); MiniCPM-o Shush 0.9242 (Table 3)
    const perSec = 20360 / 2000 / 99.5, fail = 1 - 0.9242;
    return (s) => {
      c.clear();
      if (s === 1) {
        c.text(320, 60, "MiniCPM-o 4.5, explicit requests (Table 3)", { anchor: "middle", size: 13, tone: "muted" });
        c.text(320, 150, "Start 0.95", { anchor: "middle", size: 40, weight: 700, tone: "code" });
        c.text(320, 190, "95 of 100 requests to Aria get a fresh reply", { anchor: "middle", size: 13 });
        return;
      }
      const mins = s === 2 ? 100 / 60 : m.value;
      const n = Math.round(mins * 60 * perSec), bad = Math.round(n * fail);
      // dot grid; intrusions spread evenly so the picture is deterministic
      const cols = 46, r = n > 400 ? 2.6 : 4, gap = n > 400 ? 12.6 : 13;
      const every = bad ? n / bad : Infinity;
      const shown = Math.min(n, 46 * 16);
      for (let i = 0; i < shown; i++) {
        const isBad = bad && Math.floor((i + 0.5) / every) !== Math.floor((i - 0.5) / every);
        c.dot(30 + (i % cols) * gap, 30 + Math.floor(i / cols) * gap, { r: isBad ? r + 1.2 : r, tone: isBad ? "bad" : "muted" });
      }
      const label = s === 2 ? "one 100 s scene" : `${mins} min of talk`;
      c.text(20, 252, `${label}: ${n} turns not for Aria → ${bad} intrusions`, { size: 15, weight: 700, tone: "bad" });
      if (s >= 4) c.text(20, 278, "and when it does answer: 0.47 correct (Table 3)", { size: 14, tone: "paper", weight: 600 });
      if (s >= 5) c.text(20, 304, "🧠 verdict: not unattended; test your own model with Duplex-MPE", { size: 14, tone: "take", weight: 600 });
    };
  };

  // ------------------------------------------------------ your move: ideas
  D["ideas"] = (fig, k) => {
    const c = k.canvas(640, 320);
    const I = [["gap sweep", 1.2, 6.2], ["“speak?” probe", 3.6, 8.2], ["cascade baseline", 6.6, 5.2], ["reactive humans", 8.4, 7.6]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 10, ymin: 0, ymax: 10, w: 640, h: 320,
        xlabel: "effort (our guess) →", ylabel: "what you learn →" });
      I.forEach(([l, x, y], i) => {
        const on = i + 1 === s;
        c.dot(p.X(x), p.Y(y), { r: on ? 9 : 6, tone: on ? "predict" : "muted", dim: i + 1 > s });
        c.text(p.X(x), p.Y(y) - 14, l, { anchor: "middle", size: on ? 14 : 12, weight: on ? 700 : 400, dim: i + 1 > s });
      });
    };
  };
})();
