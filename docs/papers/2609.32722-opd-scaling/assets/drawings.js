/* Drawings for the OPD Scaling lesson. One entry per data-draw name; each is
   redrawn on every step and control change. Numbers from the paper carry a
   // Table N, // Fig. N or // §N comment (table and figure numbers follow the
   arXiv PDF); everything else is illustrative layout or our arithmetic, as
   each page's caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- data
  const SIZES = ["0.5B", "1.5B", "3B", "7B", "14B"], NUM = [0.5, 1.5, 3, 7, 14];
  // Fig. 4 (left), printed cell labels: Vanilla-OPD peak gold score (%), rows = student, cols = teacher
  const GRID = [
    [40.1, 40.6, 40.8, 39.0, 37.7],
    [53.0, 64.0, 63.9, 62.9, 62.7],
    [61.4, 70.7, 73.6, 72.9, 73.0],
    [72.7, 77.5, 80.3, 81.6, 81.9],
    [77.7, 82.1, 83.6, 85.3, 87.3],
  ];
  // Table 14: Vanilla-OPD joint peak law
  const LAW = { A: 0.97, a: 0.304, b: -0.267, z: 0.952 };
  const peak = (ns, nt, gt) => 1 - LAW.A * ns ** -LAW.a * Math.min(nt, ns) ** -LAW.b * (1 - gt) ** LAW.z;

  // ---------------------------------------------------------------- helpers
  const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const range = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  const board = (c, rows, s, top = 8, rowH = 58) => rows.forEach(([q, a, tone], i) => {
    if (s < i + 1) return;
    const y = top + i * rowH, now = s === i + 1;
    c.box({ x: 10, y, w: 620, h: rowH - 8, tone: "muted", hl: now });
    c.text(26, y + (rowH - 8) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: 330, lines: 1, inBox: true });
    c.box({ x: 370, y: y + 7, w: 246, h: rowH - 22, label: a, size: 12, tone, hl: now });
  });

  // =========================================================== TOOLBOX
  D["rl"] = (fig, k) => {
    const sz = k.toggle({ label: "teacher", options: SIZES, value: "0.5B" });
    k.follow(sz, { 5: "0.5B" });
    const c = k.canvas(W, H);
    const SCORE = { "0.5B": "39.8%", "1.5B": "63.6%", "3B": "73.6%" };   // §6.3, Table 3
    const MARK = [1, 0, 1, 1, 0, 0, 1, 0];                               // illustrative
    return (s) => {
      c.clear();
      const sft = c.box({ x: 16, y: 24, w: 180, h: 60, label: "SFT model", sub: "Qwen2.5 base + SFT", tone: "muted" });
      if (s >= 2) {
        const pr = c.box({ x: 240, y: 24, w: 384, h: 60, label: "one math problem → 8 answers", tone: "paper" });
        c.connect(sft, pr);
        c.chips({ x: 240, y: 106, size: 13, items: MARK.map((m, i) => ({ t: s >= 3 ? `A${i + 1} ${m ? "✓" : "✗"}` : `A${i + 1}`, tone: s >= 3 ? (m ? "code" : "bad") : "muted" })) });
      }
      if (s >= 3) c.box({ x: 240, y: 186, w: 384, h: 44, label: "make better-than-group answers likelier", tone: "take", size: 13 });
      if (s >= 4) c.box({ x: 16, y: 256, w: 296, h: 60, label: "14.8K training · 6.3K test", sub: "GSM8K + MATH (§3)", tone: "paper" });
      if (s >= 5) c.box({ x: 328, y: 256, w: 296, h: 60, label: `${sz.value} teacher`, sub: SCORE[sz.value] ? `gold score ${SCORE[sz.value]}` : "score not given in the text", tone: "code", hl: true });
    };
  };

  D["opd"] = (fig, k) => {
    const md = k.toggle({ label: "mode", options: ["on-policy", "off-policy"], value: "on-policy" });
    k.follow(md, { 1: "on-policy", 5: "off-policy" });
    const c = k.canvas(W, H);
    const TOK = ["x", "=", "12", "÷", "4", "=", "3"], R = [0.1, 0.02, 0.4, -0.6, 0.25, 0.02, 0.35];   // illustrative
    return (s) => {
      c.clear();
      const on = md.value === "on-policy";
      c.box({ x: 16, y: 16, w: 180, h: 50, label: "student", sub: on ? "writes the answer" : "copies the text", tone: "take" });
      c.box({ x: 444, y: 16, w: 180, h: 50, label: "teacher", sub: on ? (s >= 2 ? "scores each token" : "waits") : "writes the answer", tone: "code" });
      const ch = c.chips({ x: 150, y: 96, size: 15, items: TOK.map((t) => ({ t, tone: on ? "take" : "code" })) });
      if (on && s >= 2) {
        c.line(140, 220, 500, 220, { tone: "muted" });
        c.text(16, 224, "token reward r_t", { size: 12, tone: "muted" });
        ch.forEach((r, i) => {
          const v = R[i], h = Math.abs(v) * 110, x = r.x + r.w / 2 - 9;
          c.add(k.h("rect", { x, y: v >= 0 ? 220 - h : 220, width: 18, height: Math.max(2, h), rx: 3, class: `f-${v >= 0 ? "code" : "bad"}` }));
        });
      }
      if (!on) c.box({ x: 150, y: 170, w: 340, h: 50, label: "minimise −log π_θ(teacher text)", sub: "SFT on teacher answers (Eq. 4)", tone: "muted", size: 13 });
      if (s >= 3) c.box({ x: 16, y: 300, w: 296, h: 42, label: "each token: its own reward only", tone: "paper", size: 13 });
      if (s >= 4) c.box({ x: 328, y: 300, w: 296, h: 42, label: "raise tokens with r_t > 0", tone: "code", size: 13 });
    };
  };

  D["k3"] = (fig, k) => {
    const dl = k.slider({ label: "δ of token 1", min: -2, max: 2, step: 0.1, value: 0.5, fmt: (v) => v.toFixed(1).replace("-", "−") });
    k.follow(dl, { 3: 0.5 });
    const c = k.canvas(W, H);
    const f = (x) => Math.exp(x) - x - 1;
    const g = range(-2, 2, 121);
    return (s) => {
      c.clear();
      const d0 = dl.value, toks = [d0, -0.3, 0.1, 1.2];       // tokens 2-4 illustrative
      c.box({ x: 16, y: 16, w: 190, h: 50, label: "π_ref", sub: "student's SFT start", tone: "muted" });
      c.box({ x: 16, y: 80, w: 190, h: 50, label: "π_θ", sub: "student now", tone: "take" });
      if (s >= 2) c.box({ x: 16, y: 144, w: 190, h: 50, label: `δ = ${d0.toFixed(1).replace("-", "−")}`, sub: "log π_ref − log π_θ", tone: "predict", mono: true });
      if (s >= 3) {
        const p = c.plot({ x: 220, y: 0, w: 420, h: 270, series: [{ x: g, y: g.map(f), tone: "ink", width: 2.2 }], xmin: -2, xmax: 2, ymin: 0, ymax: 4.5, xlabel: "δ", ylabel: "e^δ − δ − 1" });
        c.dot(p.X(d0), p.Y(f(d0)), { r: 6, tone: "predict" });
        c.label(p.X(d0), p.Y(f(d0)) - 16, f(d0).toFixed(3), { anchor: "middle", size: 13, weight: 700, tone: "predict" });
      }
      const mean = toks.reduce((t, x) => t + f(x), 0) / toks.length;
      if (s >= 4) c.text(16, 296, `4 tokens, δ = ${toks.map((x) => x.toFixed(1).replace("-", "−")).join(", ")} → mean k₃ = ${mean.toFixed(3)}`, { size: 13, mono: true, maxW: 608, lines: 1 });
      if (s >= 5) c.box({ x: 16, y: 312, w: 608, h: 38, label: `d = √${mean.toFixed(3)} = ${Math.sqrt(mean).toFixed(3)}`, tone: "code", mono: true, size: 14 });
    };
  };

  D["grid0"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const rel = (i, j) => (j < i ? "W2S" : j === i ? "same" : "S2W");
      const tone = (i, j) => { const r = rel(i, j); return r === "W2S" ? (s >= 2 ? "predict" : null) : r === "same" ? (s >= 3 ? "code" : null) : (s >= 4 ? "paper" : null); };
      c.matrix({ x: 170, y: 40, cell: 80, cellH: 46, size: 13, data: SIZES.map((_, i) => SIZES.map((__, j) => rel(i, j))), fmt: (v) => v,
        rowLabels: SIZES.map((x) => `student ${x}`), rowLabelW: 150, colLabels: SIZES.map((x) => `teacher ${x}`), tone });
      if (s >= 5) c.box({ x: 16, y: 290, w: 608, h: 50, label: "weak-to-strong: RL once at 0.5B, distill to every larger student", tone: "predict", hl: true, size: 14 });
    };
  };

  D["powerlaw"] = (fig, k) => {
    const al = k.slider({ label: "exponent α", min: 0.1, max: 0.6, step: 0.01, value: 0.3, fmt: (v) => v.toFixed(2) });
    k.follow(al, { 4: 0.3 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 16, w: 200, h: 64, label: "gold score G", sub: "solved / 6.3K test", tone: "code" });
      if (s >= 2) c.box({ x: 16, y: 96, w: 200, h: 64, label: "proxy P", sub: "teacher's token reward", tone: "muted" });
      if (s >= 5) c.box({ x: 16, y: 176, w: 200, h: 64, label: "fit: 1 − G", sub: "remaining error", tone: "predict", hl: true });
      if (s >= 3) {
        const a = al.value, xs = range(0.5, 14, 60), err = (n) => 0.6 * n ** -a;     // A = 0.6 illustrative
        const p = c.plot({ x: 230, y: 0, w: 410, h: 300, series: [{ x: xs, y: xs.map(err), tone: "paper", width: 2.4 }], xlog: true, ylog: true, xmin: 0.4, xmax: 16, ymin: 0.1, ymax: 1,
          xlabel: "model size N (B, log)", ylabel: "error (log)", xFmt: (v) => `${v}`, yFmt: (v) => `${v}` });
        NUM.forEach((n) => c.dot(p.X(n), p.Y(err(n)), { r: 4, tone: "paper" }));
        if (s >= 4) c.text(435, 336, `double N → error × ${(2 ** -a).toFixed(3)} (−${((1 - 2 ** -a) * 100).toFixed(1)}%)`, { anchor: "middle", size: 13, mono: true, weight: 700, tone: "predict" });
      }
    };
  };

  // ========================================================= THE STUDY
  D["rules"] = (fig, k) => {
    const st = k.toggle({ label: "student", options: ["7B", "0.5B"], value: "7B" });
    k.follow(st, { 1: "7B", 2: "0.5B" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 2) {
        const row = GRID[SIZES.indexOf(st.value)];
        c.bars({ x: 0, y: 10, w: 630, rowH: 56, labelW: 130, tones: ["paper"], max: 100, fmt: (v) => `${v}%`,
          rows: row.map((v, j) => ({ label: `teacher ${SIZES[j]}`, values: [v], hl: v === Math.max(...row) })) });
        c.text(320, 300, `${st.value} student: peak gold score by teacher (Fig. 4)`, { anchor: "middle", size: 13, tone: "muted" });
        return;
      }
      // Table 3: 7B student
      const rows = [{ label: "3B teacher (scores 66.0)", values: [73.8], hl: s === 3 }];
      if (s >= 4) rows.push({ label: "1.5B teacher (scores 63.6)", values: [77.5], hl: s === 4 });
      c.bars({ x: 0, y: 20, w: 630, rowH: 66, labelW: 220, tones: ["predict"], max: 100, fmt: (v) => `${v}% peak`, rows });
      c.text(320, 186, "7B student, near-equal teacher scores (Table 3)", { anchor: "middle", size: 13, tone: "muted" });
      if (s >= 5) c.box({ x: 16, y: 236, w: 608, h: 50, label: "chaining 0.5B → 1.5B → 3B: below one direct jump (§6.3)", tone: "bad", size: 14 });
    };
  };

  D["design"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(30, 30, "varied: 25 pairs", { size: 14, weight: 700, tone: "paper" });
      c.matrix({ x: 40, y: 46, cell: 30, cellH: 26, data: SIZES.map(() => SIZES.map(() => "")), fmt: () => "", tone: () => (s === 1 ? "paper" : "muted") });
      if (s >= 2) {
        c.text(240, 30, "fixed", { size: 14, weight: 700, tone: "take" });
        c.chips({ x: 240, y: 44, size: 13, maxW: 390, items: [{ t: "lr 1e-6", tone: "take" }, { t: "batch 256", tone: "take" }, { t: "≤ 580 updates", tone: "take" }, { t: "≤ 2,048 tokens", tone: "take" }] }); // Table 7
      }
      if (s >= 3) c.chips({ x: 240, y: 108, size: 13, items: [{ t: "same 14.8K RL prompts", tone: "take" }] });
      if (s >= 4) {
        const xs = range(0, 0.45, 30), r = rng(5);
        c.plot({ x: 230, y: 150, w: 410, h: 200, series: [{ x: xs, y: xs.map((d) => 0.55 + 0.6 * Math.min(d, 0.3) - 0.3 * Math.max(0, d - 0.3) + (r() - 0.5) * 0.01), tone: "code", dots: true }],
          xmin: 0, xmax: 0.45, ymin: 0.5, ymax: 0.8, xlabel: "progress", ylabel: "gold", xFmt: () => "", yFmt: () => "" });
      }
      if (s >= 5) c.box({ x: 16, y: 230, w: 200, h: 56, label: "1 seed per run", sub: "App. E.5", tone: "bad", hl: true });
    };
  };

  D["ruler"] = (fig, k) => {
    const ax = k.toggle({ label: "x-axis", options: ["steps", "√KL"], value: "steps" });
    k.follow(ax, { 1: "steps", 2: "√KL" });
    const c = k.canvas(W, H);
    // slopes 0.721 and 0.175 are the paper's extremes (§4); intercepts, middle slope and drift rates are illustrative
    const RUNS = [[0.40, 0.721, 0.0004, "code"], [0.55, 0.45, 0.00016, "paper"], [0.70, 0.175, 0.00007, "predict"]];
    return (s) => {
      c.clear();
      const kl = ax.value === "√KL";
      const steps = range(0, 300, 60);
      const series = RUNS.map(([c0, m, a, tone], i) => {
        const ds = steps.map((t) => Math.sqrt(a * t));
        return { x: kl ? ds : steps, y: ds.map((d) => c0 + m * d), tone, width: 2.4,
          label: s >= 4 ? (i === 0 ? "slope 0.721 (max)" : i === 2 ? "slope 0.175 (min)" : "") : null, labelAt: 59 };
      });
      c.plot({ x: 0, y: 0, w: 640, h: 300, series, xmin: 0, xmax: kl ? 0.36 : 300, ymin: 0.35, ymax: 0.85,
        xlabel: kl ? "d = √(token-mean KL)" : "optimizer updates", ylabel: "gold score", yFmt: (v) => v.toFixed(1) });
      if (s >= 3) c.box({ x: 16, y: 310, w: 296, h: 40, label: "line fits: R² 0.932 – 0.988", tone: "code", size: 13 });       // §4
      if (s >= 5) c.box({ x: 328, y: 310, w: 296, h: 40, label: "sequence-level KL: no clean start", tone: "bad", size: 13 }); // App. K
    };
  };

  D["taylor"] = (fig, k) => {
    const t = k.slider({ label: "step size τ", min: 0.05, max: 1, step: 0.05, value: 0.3, fmt: (v) => v.toFixed(2) });
    k.follow(t, { 1: 0.3, 4: 0.8 });
    const c = k.canvas(W, H);
    const g = range(0, 1, 50);
    return (s) => {
      c.clear();
      const series = [];
      if (s >= 2) series.push({ x: g, y: g.map((x) => x), tone: "code", width: 2.4 });
      if (s >= 3) series.push({ x: g, y: g.map((x) => x * x), tone: "bad", width: 2.4 });
      if (s >= 4) series.push({ x: g, y: g.map((x) => x / Math.SQRT2), tone: "paper", width: 2.4, dash: true });
      const p = c.plot({ x: 0, y: 0, w: 640, h: s >= 5 ? 296 : 340, series: series.length ? series : [{ x: [0, 1], y: [0, 0], tone: "muted", width: 0.5 }],
        xmin: 0, xmax: 1, ymin: 0, ymax: 1.05, xlabel: "step size τ", ylabel: "change from the start", yFmt: () => "" });
      c.line(p.X(t.value), p.Y(0), p.X(t.value), p.Y(1.02), { tone: "predict", dash: true });
      const leg = [];
      if (s >= 2) leg.push({ t: "score gain ∝ τ", tone: "code" });
      if (s >= 3) leg.push({ t: "KL ∝ τ²", tone: "bad" });
      if (s >= 4) leg.push({ t: "d = √KL ∝ τ", tone: "paper" });
      if (leg.length) c.chips({ x: 70, y: 8, size: 12, items: leg });
      if (s >= 4) c.text(70, 56, `at τ = ${t.value.toFixed(2)}: score / d = ${(t.value / (t.value / Math.SQRT2)).toFixed(2)}, constant`, { size: 13, mono: true, weight: 700, tone: "paper" });
      if (s >= 5) c.box({ x: 16, y: 306, w: 608, h: 40, label: "valid near the start only; the line's length is empirical (App. D.4)", tone: "muted", size: 13 });
    };
  };

  D["phases"] = (fig, k) => {
    const tl = k.toggle({ label: "tail", options: ["attenuate", "saturate", "regress"], value: "regress" });
    k.follow(tl, { 1: "regress", 3: "attenuate", 4: "regress" });
    const c = k.canvas(W, H);
    const r = rng(11), noise = Array.from({ length: 60 }, () => (r() - 0.5) * 0.012);
    const ds = range(0.01, 0.5, 60);
    return (s) => {
      c.clear();
      const T = tl.value, line = (d) => 0.55 + 0.6 * d;
      const tail = (d) => (d <= 0.3 ? line(d) : T === "attenuate" ? line(0.3) + 0.22 * (d - 0.3) : T === "saturate" ? line(0.3) + 0.02 * (d - 0.3) : line(0.3) - 0.35 * (d - 0.3));
      const n = s === 1 ? 36 : 60;
      const pts = ds.slice(0, n), ys = pts.map((d, i) => tail(d) + noise[i]);
      const series = [{ x: pts, y: ys, tone: "paper", dotsOnly: true }, { x: [0, 0.5], y: [line(0), line(0.5)], tone: "muted", dash: true, width: 1.4 }];
      if (s >= 4 && T === "regress") series.push({ x: ds, y: ds.map((d) => 0.56 + 0.32 * Math.sqrt(d)), tone: "take", dash: true, width: 2 });
      const p = c.plot({ x: 0, y: 0, w: 640, h: 300, series, xmin: 0, xmax: 0.5, ymin: 0.5, ymax: 0.9, xlabel: "d", ylabel: "gold score", yFmt: (v) => v.toFixed(1) });
      if (s >= 2) {
        const band = `M${p.X(0)},${p.Y(line(0) + 0.012)} L${p.X(0.5)},${p.Y(line(0.5) + 0.012)} L${p.X(0.5)},${p.Y(line(0.5) - 0.012)} L${p.X(0)},${p.Y(line(0) - 0.012)} Z`;
        c.path(band, { fill: "muted", soft: true, tone: "muted", width: 0 });
        c.dot(p.X(0.3), p.Y(line(0.3)), { r: 7, tone: "predict" });
      }
      if (s >= 4 && T === "regress") c.chips({ x: 80, y: 8, size: 12, items: [{ t: "gold score", tone: "paper" }, { t: "proxy P, still rising", tone: "take" }] });
      if (s >= 5) c.box({ x: 16, y: 310, w: 608, h: 40, label: "endpoints: d 0.20 – 0.36, median 0.30 · 9 of 25 runs depart in view", tone: "code", size: 13 }); // §5, §4.1
    };
  };

  D["law"] = (fig, k) => {
    const S = k.toggle({ label: "student", options: SIZES, value: "7B" });
    const T = k.toggle({ label: "teacher", options: SIZES, value: "1.5B" });
    const G = k.slider({ label: "teacher score", min: 30, max: 90, step: 0.1, value: 63.6, fmt: (v) => `${v.toFixed(1)}%` });
    k.follow(S, { 1: "7B" }); k.follow(T, { 1: "1.5B" }); k.follow(G, { 1: 63.6 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ns = NUM[SIZES.indexOf(S.value)], nt = NUM[SIZES.indexOf(T.value)], gt = G.value / 100;
      const fS = ns ** -LAW.a, fT = Math.min(nt, ns) ** -LAW.b, fG = (1 - gt) ** LAW.z, err = LAW.A * fS * fT * fG;
      if (s >= 2) c.box({ x: 16, y: 20, w: 196, h: 76, label: "(teacher error)^0.952", sub: `${(1 - gt).toFixed(3)} → ${fG.toFixed(3)}`, tone: "code", size: 13 });
      if (s >= 3) c.box({ x: 222, y: 20, w: 196, h: 76, label: "N_S^−0.304", sub: `${ns}B → ${fS.toFixed(3)}`, tone: "paper", size: 13 });
      if (s >= 4) c.box({ x: 428, y: 20, w: 196, h: 76, label: "N_T,eff^+0.267", sub: `${Math.min(nt, ns)}B → ${fT.toFixed(3)}`, tone: "predict", size: 13 });
      if (s >= 4 && nt > ns) c.box({ x: 428, y: 104, w: 196, h: 34, label: "capped at student size", tone: "bad", size: 12 });
      c.box({ x: 16, y: 156, w: 608, h: 76, label: `student error = 0.97 × factors = ${err.toFixed(3)}`, sub: `predicted peak ≈ ${(100 * (1 - err)).toFixed(1)}%`, tone: "take", hl: true, mono: true, size: 15, subSize: 14 });
      if (s >= 5) {
        const match = S.value === "7B" && T.value === "1.5B" && Math.abs(G.value - 63.6) < 0.05;
        c.box({ x: 16, y: 252, w: 608, h: 50, label: match ? "observed peak: 77.5% (Table 3)" : `grid peak for this pair: ${GRID[SIZES.indexOf(S.value)][SIZES.indexOf(T.value)]}% (Fig. 4)`, tone: "code", size: 14 });
      }
    };
  };

  D["matched"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table 3: [teacher score, observed peak, size only, score only, joint]
    const T3 = [[63.6, 77.5, 77.0, 75.6, 77.1], [66.0, 73.8, 79.5, 76.3, 74.1], [73.6, 80.3, 79.5, 78.7, 79.6]];
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 10, w: 296, h: 54, label: "RL teachers: size ↔ error", sub: "r = −0.9999 (§5)", tone: "muted" });
      if (s >= 2) c.box({ x: 328, y: 10, w: 296, h: 54, label: "+ chain teachers", sub: "r = −0.95 (§5)", tone: "paper" });
      if (s >= 3) c.box({ x: 16, y: 76, w: 608, h: 44, label: "β = −0.27: at the same score, a bigger teacher leaves more error", tone: "predict", size: 14 });
      if (s >= 4) {
        const data = T3.map((r) => (s >= 5 ? r : [r[0], r[1], null, null, null]));
        c.matrix({ x: 170, y: 168, cell: 90, cellH: 40, size: 13, data, fmt: (v) => v.toFixed(1),
          rowLabels: ["1.5B endpoint", "3B step 58", "3B endpoint"], rowLabelW: 150, colLabels: ["teacher score", "observed", "size only", "score only", "joint"],
          tone: (i, j) => (i !== 1 ? null : j === 1 ? "predict" : s >= 5 && j === 4 ? "code" : s >= 5 && (j === 2 || j === 3) ? "bad" : null) });
        c.text(320, 312, "7B student, peak gold score (%) (Table 3)", { anchor: "middle", size: 12, tone: "muted" });
      }
    };
  };

  D["rate"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table 14: point estimate and 95% cell-bootstrap interval (Vanilla-OPD)
    const ROWS = [["ξ  teacher error (speed)", 1.90, 0.93, 2.84, "bad", "1.90 [0.93, 2.84]"], ["γ  student size (speed)", 0.189, 0.011, 0.306, "paper", "0.189 [0.011, 0.306]"],
      ["δ  teacher size (speed)", -0.61, -1.10, -0.10, "paper", "−0.61 [−1.10, −0.10]"], ["ζ  teacher error (peak)", 0.952, 0.898, 1.035, "code", "0.952 [0.898, 1.035]"]];
    const X = (v) => 270 + ((v + 1.5) / 4.5) * 350;
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 8, w: 608, h: 40, label: "m = B · N_S^−γ · N_T,eff^δ · (1 − G_T)^−ξ", mono: true, size: 14, tone: "muted" });
      const show = s === 1 ? [] : s === 2 ? [0] : s === 3 ? [0, 1] : s === 4 ? [0, 1, 2] : [0, 1, 2, 3];
      if (show.length) {
        c.line(X(0), 62, X(0), 296, { tone: "faint" });
        [-1, 0, 1, 2, 3].forEach((v) => c.text(X(v), 316, `${v}`.replace("-", "−"), { anchor: "middle", size: 11, tone: "muted" }));
      }
      show.forEach((i) => {
        const [n, v, lo, hi, tone, txt] = ROWS[i], y = 80 + i * 56;
        c.text(16, y + 5, n, { size: 13, weight: 600, maxW: 240, lines: 1 });
        c.line(X(lo), y, X(hi), y, { tone, width: 4 });
        c.dot(X(v), y, { r: 6, tone });
        c.text(X(v), y + 22, txt, { anchor: "middle", size: 12, mono: true, tone });
      });
      if (s >= 4) c.box({ x: 16, y: 326, w: 296, h: 30, label: "speed law: log-space R² = 0.59", tone: "bad", size: 12 });
      if (s >= 5) c.box({ x: 328, y: 326, w: 296, h: 30, label: "raw-affine baseline predicts better", tone: "bad", size: 12 });
    };
  };

  // ==================================================== HOW SOLID IS IT?
  // Table 2: [size only, score only, joint]
  const T2 = { Vanilla: { loo: [3.43, 2.55, 1.66], S: [0.64, 2.54, 0.55], T: [0.75, 0.70, 0.68] }, Delta: { loo: [2.47, 2.07, 0.82], S: [0.21, 0.93, 0.20], T: [0.29, 0.46, 0.32] } };
  D["valid"] = (fig, k) => {
    const me = k.toggle({ label: "method", options: ["Vanilla", "Delta"], value: "Vanilla" });
    const vw = k.toggle({ label: "test", options: ["leave-one-out", "largest held out"], value: "leave-one-out" });
    k.follow(me, { 1: "Vanilla", 5: "Delta" }); k.follow(vw, { 1: "leave-one-out", 4: "largest held out" });
    const c = k.canvas(W, H);
    const NAMES = ["sizes only", "teacher score only", "joint law"];
    return (s) => {
      c.clear();
      const d = T2[me.value];
      if (s === 1) { c.box({ x: 60, y: 110, w: 520, h: 90, label: "hold out one size → refit → predict it", sub: "error in accuracy points", tone: "paper" }); return; }
      if (vw.value === "leave-one-out") {
        const n = s === 2 ? 1 : 3;
        c.bars({ x: 0, y: 20, w: 630, rowH: 76, labelW: 180, tones: ["bad"], max: 4, fmt: (v) => `${v.toFixed(2)} pts`,
          rows: d.loo.slice(0, n).map((v, i) => ({ label: NAMES[i], values: [v], hl: i === 2 })) });
      } else {
        c.chips({ x: 200, y: 6, size: 12, items: [{ t: "largest student held out", tone: "paper" }, { t: "largest teacher", tone: "take" }] });
        c.bars({ x: 0, y: 44, w: 630, rowH: 76, labelW: 180, tones: ["paper", "take"], max: 4, fmt: (v) => `${v.toFixed(2)} pts`,
          rows: NAMES.map((nm, i) => ({ label: nm, values: [d.S[i], d.T[i]], hl: i === 2 })) });
      }
      c.text(320, 300, `${me.value}-OPD peak law, held-out error (Table 2)`, { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  D["headstart"] = (fig, k) => {
    const c = k.canvas(W, H);
    // [pair, teacher score (§6.3, Table 3), peak (Fig. 4), Vanilla gain (Table 9)]; start = peak − gain (our arithmetic)
    const P = [["14B ← 0.5B", 39.8, 77.7, 5.1], ["7B ← 0.5B", 39.8, 72.7, 11.7], ["3B ← 0.5B", 39.8, 61.4, 8.2], ["7B ← 1.5B", 63.6, 77.5, 16.0], ["7B ← 3B", 73.6, 80.3, 20.2]];
    return (s) => {
      c.clear();
      c.chips({ x: 150, y: 4, size: 12, items: [{ t: "teacher score", tone: "muted" }, { t: "student start", tone: "take" }, { t: "student peak", tone: "code" }] });
      c.bars({ x: 0, y: 40, w: 630, rowH: 52, labelW: 120, tones: ["muted", "take", "code"], max: 100, fmt: (v) => v.toFixed(1),
        rows: P.map(([n, t, pk, gn], i) => ({ label: n, values: [t, s >= 3 ? +(pk - gn).toFixed(1) : NaN, pk], hl: (s === 3 && i === 0) || (s === 4 && i === 3) })) });
      if (s === 2) c.box({ x: 16, y: 312, w: 608, h: 38, label: "0.5B expert (39.8%) → 3B 61.4 · 7B 72.7 · 14B 77.7", tone: "code", size: 13 });
      if (s >= 5) c.box({ x: 16, y: 312, w: 608, h: 38, label: "lead over the teacher shrinks as teacher size nears student size (§5)", tone: "paper", size: 13 });
    };
  };

  // Table 9: [student, teacher, relation, m_V, m_Δ, gain_V, gain_Δ]
  const T9 = [
    ["0.5B", "0.5B", "same", .573, .557, 23.3, 22.6], ["0.5B", "1.5B", "S2W", .539, .570, 23.3, 23.6], ["1.5B", "0.5B", "W2S", .564, .554, 14.2, 16.8],
    ["1.5B", "1.5B", "same", .721, .744, 24.6, 24.6], ["1.5B", "3B", "S2W", .629, .723, 24.8, 24.6], ["3B", "0.5B", "W2S", .378, .444, 8.2, 12.4],
    ["3B", "1.5B", "W2S", .555, .642, 17.6, 18.2], ["3B", "3B", "same", .618, .711, 20.9, 20.5], ["7B", "0.5B", "W2S", .415, .506, 11.7, 13.1],
    ["7B", "1.5B", "W2S", .558, .630, 16.0, 17.8], ["7B", "3B", "W2S", .670, .754, 20.2, 19.3], ["7B", "7B", "same", .687, .712, 20.3, 21.5],
    ["14B", "0.5B", "W2S", .175, .268, 5.1, 6.7], ["14B", "1.5B", "W2S", .327, .387, 9.3, 9.9], ["14B", "3B", "W2S", .417, .470, 10.6, 11.4],
    ["14B", "7B", "W2S", .424, .470, 12.1, 12.6], ["14B", "14B", "same", .498, .515, 14.5, 14.6],
  ];
  D["delta"] = (fig, k) => {
    const mt = k.toggle({ label: "compare", options: ["initial slope", "peak gain"], value: "initial slope" });
    k.follow(mt, { 1: "initial slope", 3: "peak gain", 5: "initial slope" });
    const c = k.canvas(W, H);
    const TONE = { W2S: "predict", same: "code", S2W: "paper" };
    return (s) => {
      c.clear();
      if (s === 1) {
        c.box({ x: 40, y: 80, w: 560, h: 70, label: "reward = log π_T − log π_T^base", sub: "what RL changed in the teacher (Eq. 3)", tone: "take", mono: true });
        c.chips({ x: 160, y: 200, size: 13, items: [{ t: "weak-to-strong", tone: "predict" }, { t: "same-base", tone: "code" }, { t: "strong-to-weak", tone: "paper" }] });
        return;
      }
      const slope = mt.value === "initial slope";
      const lo = slope ? 0.1 : 0, hi = slope ? 0.8 : 27;
      const series = ["W2S", "same", "S2W"].map((rel) => {
        const pts = T9.filter((r) => r[2] === rel);
        return { x: pts.map((r) => r[slope ? 3 : 5]), y: pts.map((r) => r[slope ? 4 : 6]), tone: TONE[rel], dotsOnly: true };
      });
      series.push({ x: [lo, hi], y: [lo, hi], tone: "muted", dash: true, width: 1.2 });
      const p = c.plot({ x: 0, y: 0, w: 640, h: 330, series, xmin: lo, xmax: hi, ymin: lo, ymax: hi,
        xlabel: slope ? "Vanilla-OPD slope m" : "Vanilla-OPD peak gain (pts)", ylabel: slope ? "Delta-OPD slope" : "Delta-OPD peak gain", yFmt: (v) => (slope ? v.toFixed(1) : `${v}`) });
      if (s >= 4) T9.filter((r) => r[1] === "0.5B" && r[2] === "W2S").forEach((r) => c.dot(p.X(r[slope ? 3 : 5]), p.Y(r[slope ? 4 : 6]), { r: 8, tone: "predict", ring: true }));
      if (s >= 5) c.box({ x: 360, y: 236, w: 250, h: 40, label: "ringed low dot: 14B ← 0.5B", sub: "slope 0.175 → 0.268", tone: "predict", size: 13 });
    };
  };

  D["cold"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      [["pure OPD", "code"], ["SFT epoch, then OPD", "predict"], ["SFT on teacher only", "bad"]].forEach(([t, tone], i) =>
        c.box({ x: 16 + i * 206, y: 10, w: 196, h: 50, label: t, tone, size: 13, hl: s === 2 && i === 0 }));
      if (s >= 2) c.box({ x: 16, y: 72, w: 608, h: 36, label: "pure OPD: best peak in every cell (§6.2)", tone: "code", size: 13 });
      if (s >= 3) c.bars({ x: 0, y: 124, w: 630, rowH: 44, labelW: 150, tones: ["bad"], max: 22, fmt: (v) => `−${v} pts`,
        rows: [{ label: "3B student", values: [6.6] }, { label: "7B student", values: [15.7] }, { label: "14B student", values: [19.4], hl: true }] }); // §6.2
      if (s >= 4) c.box({ x: 16, y: 270, w: 296, h: 50, label: "SFT epoch erased 32 pts", sub: "of the 14B start (§6.2)", tone: "bad" });
      if (s >= 5) c.box({ x: 328, y: 270, w: 296, h: 50, label: "SFT only: −28.4 extreme", sub: "< 1 pt in same-size pairs", tone: "bad" });
    };
  };

  D["chains"] = (fig, k) => {
    const me = k.toggle({ label: "method", options: ["Vanilla", "Delta"], value: "Vanilla" });
    k.follow(me, { 1: "Vanilla", 5: "Delta" });
    const c = k.canvas(W, H);
    // §6.3: [chain, direct from the 0.5B expert]
    const V = { Vanilla: [["3B", 60.4, 61.4], ["7B (chains 70.0–71.3)", 70.0, 72.7], ["14B", 76.8, 77.7]], Delta: [["3B", 64.5, 65.3], ["7B", 74.0, 75.0], ["14B", 79.4, 79.9]] };
    return (s) => {
      c.clear();
      const B = SIZES.map((n, i) => c.box({ x: 16 + i * 126, y: 10, w: 100, h: 44, label: i ? n : "0.5B RL", tone: i ? "take" : "code", size: 13 }));
      for (let i = 0; i < 4; i++) c.connect(B[i], B[i + 1], { tone: "take" });
      if (s >= 2) c.box({ x: 16, y: 66, w: 608, h: 34, label: "direct: 0.5B expert → each size in one jump", tone: "code", size: 13 });
      if (s >= 3) {
        c.chips({ x: 200, y: 108, size: 12, items: [{ t: "chain", tone: "take" }, { t: "direct", tone: "code" }] });
        c.bars({ x: 0, y: 138, w: 630, rowH: 44, labelW: 190, tones: ["take", "code"], max: 100, fmt: (v) => `${v}%`,
          rows: V[me.value].map(([n, a, b]) => ({ label: n, values: [a, b] })) });
      }
      if (s >= 4) c.box({ x: 16, y: 278, w: 608, h: 32, label: "1.5B stage scores 53.0% (> 39.8%) yet teaches 3B worse", tone: "bad", size: 12 });
      if (s >= 5) c.box({ x: 16, y: 318, w: 608, h: 32, label: "direct RL on the student beats every weak-teacher variant", tone: "muted", size: 12 });
    };
  };

  D["lessons"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["k₃ inside the loss", "forward-KL gradient → k₃⁺", "bad"], ["optimizer precision", "BF16 hid the regression", "bad"],
      ["sequence-level KL", "no regular start", "predict"], ["Gao et al. curve forms", "curvature not identifiable", "predict"], ["full-vocabulary loss", "earlier regression", "predict"]];
    return (s) => { c.clear(); board(c, R, s, 10, 68); };
  };

  // =========================================================== YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["“beats the teacher”", "14B starts near 72.6", "predict"], ["peak selection", "best of many, on test set", "bad"],
      ["negative β", "5 chain teachers + 1 cell", "predict"], ["teacher cap", "assumed; drops unmodeled", "predict"],
      ["speed law", "R² 0.59", "predict"], ["replication", "1 seed, 1 family, 2K tokens", "bad"], ["steelman", "held-out teacher ordered right", "code"]];
    return (s) => { c.clear(); board(c, R, s, 6, 49); };
  };

  D["verdict"] = (fig, k) => {
    const st = k.toggle({ label: "student", options: ["7B", "14B"], value: "7B" });
    k.follow(st, { 1: "7B", 3: "14B" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const i = SIZES.indexOf(st.value), row = GRID[i].slice(0, i + 1);
      c.bars({ x: 0, y: 8, w: 630, rowH: 40, labelW: 130, tones: ["code"], max: 100, fmt: (v) => `${v}%`,
        rows: row.map((v, j) => ({ label: `teacher ${SIZES[j]}`, values: [v], hl: (s <= 2 && j === 0) || (s >= 3 && j === 2) })) });
      if (s >= 2) c.box({ x: 16, y: 222, w: 608, h: 38, label: "direct RL beats weak-teacher OPD · same-size OPD within 0.5 pts of RL", tone: "muted", size: 12 });
      if (s >= 4) c.box({ x: 16, y: 268, w: 296, h: 38, label: "pure OPD, one jump", tone: "code", size: 13 });
      if (s >= 5) c.box({ x: 328, y: 268, w: 296, h: 38, label: "our verdict: RL a mid-size model", tone: "take", hl: true, size: 13 });
      c.text(320, 340, `${st.value} student: peak gold score by teacher (Fig. 4)`, { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  D["ideas"] = (fig, k) => {
    const c = k.canvas(W, H);
    // positions are our guesses: [effort 0-5, payoff 0-5]
    const I = [["other families and tasks", 4.2, 4.2], ["multiple seeds", 3.4, 3.4], ["longer rollouts", 3.0, 2.8], ["separate peak-picking split", 1.4, 3.8], ["speech LLM family", 3.8, 3.0]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 5, ymin: 0, ymax: 5, w: 640, h: 360, xlabel: "effort (our guess)", ylabel: "what you learn (our guess)", xFmt: () => "", yFmt: () => "" });
      I.forEach(([n, x, y], i) => {
        if (s < i + 1) return;
        c.dot(p.X(x), p.Y(y), { r: s === i + 1 ? 8 : 6, tone: i < 3 ? "paper" : "take" });
        c.label(p.X(x), p.Y(y) - 14, n, { anchor: "middle", size: 13, weight: s === i + 1 ? 700 : 400, tone: i < 3 ? "paper" : "take" });
      });
    };
  };
})();
