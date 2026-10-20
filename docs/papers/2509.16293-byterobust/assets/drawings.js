/* Drawings for the ByteRobust lesson (arXiv:2509.16293v4).
   One entry per data-draw name; each is redrawn on every step and control change.
   Numbers from the paper carry a // Table N or // §N comment; everything else is
   illustrative layout or our arithmetic, as each page's caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // a checklist board: rows [question, answer, tone]; row i appears on step i + 1
  const board = (c, rows, s, top = 8, rowH = 68) => {
    c.clear();
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rowH, now = s === i + 1;
      c.box({ x: 10, y, w: 620, h: rowH - 10, tone: "muted", hl: now });
      c.text(26, y + (rowH - 10) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: 290, lines: 1, inBox: true });
      c.box({ x: 330, y: y + 8, w: 286, h: rowH - 26, label: a, size: 13, tone, hl: now });
    });
  };
  const legend = (c, x, y, items, gap = 150) => items.forEach(([t, tone], i) => {
    c.box({ x: x + i * gap, y, w: 14, h: 14, tone, solid: true, r: 3 });
    c.text(x + i * gap + 20, y + 12, t, { size: 12, inBox: true });
  });
  // log-scale position
  const logX = (v, x0, bw, lo, hi) => x0 + Math.log(v / lo) / Math.log(hi / lo) * bw;
  const bar = (c, k, x, y, w, h, tone, o = {}) =>
    c.add(k.h("rect", { x, y, width: Math.max(2, w), height: h, rx: 3, class: `f-${tone}${o.soft ? " soft" : ""}${o.hl ? " rdx-hl" : ""}`, "stroke-dasharray": o.dashed ? "5 4" : null }));

  // 4 x 4 machine grid of Fig. 7: row = model copy (PP group), column = stage (DP group)
  const grid = (c, cell) => {
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
      const id = r * 4 + q, o = cell(id, r, q);
      if (o) c.box({ x: 100 + q * 130, y: 40 + r * 66, w: 120, h: 56, label: `machine ${id}`, size: 13, ...o });
    }
  };

  // =========================================================== TOOLBOX
  D["ettr"] = (fig, k) => {
    const L = k.slider({ label: "minutes lost per failure", min: 1, max: 120, value: 30, fmt: (v) => `${v} min` });
    k.follow(L, { 1: 30, 4: 5 });
    const c = k.canvas(W, H);
    const T = 166.8;                                                     // 2.78 h in minutes, §1
    return (s) => {
      c.clear();
      const lost = s >= 3 ? L.value : 0, ettr = 1 - lost / T;
      c.text(20, 30, "ETTR = productive time ÷ wall-clock time", { size: 16, weight: 700, mono: true });
      const x0 = 20, cw = 200;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * cw, lw = lost / T * (cw - 4);
        if (lw > 0) bar(c, k, x, 90, lw, 46, "bad", { hl: s === 3 });
        bar(c, k, x + lw, 90, cw - 4 - lw, 46, "code", { hl: s === 1 });
        if (s >= 2) c.text(x + 2, 160, "✗ failure", { size: 13, tone: "bad", weight: 700, inBox: true });
      }
      if (s >= 2) c.text(320, 78, "one failure every 2.78 h (cited, §1)", { size: 13, anchor: "middle", tone: "muted" });
      if (s >= 3) {
        c.text(20, 220, `lost ${L.value} min of every 166.8 min`, { size: 15, mono: true });
        c.text(20, 270, `ETTR ≈ ${(ettr * 100).toFixed(1)}%`, { size: 30, weight: 700, mono: true, tone: ettr >= 0.97 ? "code" : "bad" });
      }
      if (s >= 4) c.text(620, 330, "97% ⇔ about 5 min per failure", { size: 15, weight: 700, anchor: "end", tone: "predict" });
    };
  };

  D["groups"] = (fig, k) => {
    const m = k.slider({ label: "broken machine", min: 0, max: 15, value: 6, fmt: (v) => `#${v}` });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const br = m.value, br_r = Math.floor(br / 4), br_q = br % 4;
      for (let q = 0; q < 4; q++) c.text(160 + q * 130, 28, `stage ${q}`, { size: 12, anchor: "middle", tone: "muted" });
      for (let r = 0; r < 4; r++) c.text(88, 40 + r * 66 + 33, `copy ${r}`, { size: 12, anchor: "end", tone: "muted" });
      grid(c, (id, r, q) => {
        const sub = s >= 3 ? "2 GPUs, TP" : undefined;
        if (s === 1) return { tone: r === 3 ? "bridge" : "muted", hl: r === 3, sub };
        if (s === 2) return { tone: q === 0 ? "take" : "muted", hl: q === 0, sub };
        if (s === 3) return { tone: "muted", sub };
        if (id === br) return { tone: "bad", solid: true, hl: true, sub: "broken" };
        if (r === br_r || q === br_q) return { tone: "predict", hl: s === 4, sub: "stalled" };
        return { tone: "muted", sub: "waiting", dim: s === 4 };
      });
      const msg = { 1: "row = one pipeline (PP group)", 2: "column = one data-parallel group", 3: "each machine: one TP pair of GPUs",
        4: "its row and column stall; everyone else waits at the next sync", 5: "unit of eviction and backup = a parallel group" }[s];
      c.text(320, 340, msg, { size: 15, weight: 700, anchor: "middle", maxW: 600, lines: 1 });
    };
  };

  // =========================================================== THE PROBLEM
  D["incidents"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["CUDA error", 36.1, 2], ["Code/data adjustment", 17.3, 4], ["CPU overload", 11.0, 2], ["CPU OOM", 10.1, 2],  // Table 1
      ["Job hang", 9.9, 3], ["Insufficient disk", 5.0, 2], ["MFU decline", 0.8, 3], ["NaN value", 0.3, 3]];
    return (s) => {
      c.clear();
      c.text(20, 22, "55,365 incidents · 778,135 jobs · 3 months", { size: 14, weight: 700 });
      c.bars({ x: 10, y: 34, w: 620, rowH: 40, labelW: 170, max: 40, fmt: (v) => `${v.toFixed(1)}%`, tones: ["bridge"],
        rows: R.map(([l, v, st]) => ({ label: l, values: [v], hl: st === s, dim: s > 1 && st !== s })) });
    };
  };

  D["timeline"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["Explicit · detect", 1, "~60 s", 1], ["Explicit · locate", 15, "2–15 min", 1],          // §2.2
      ["Hang · detect", 60, "30–60 min timeout", 2], ["Hang · locate", 90, "> 1.5 h, one case", 3],          // §2.3, §2.2
      ["SDC · locate", 480, "> 8 h, one case", 4], ["Any · failover", 10, "> 10 min at 10k GPUs", 5]];        // §2.2, §2.3
    const x0 = 170, bw = 300, lo = 0.5, hi = 600;
    return (s) => {
      c.clear();
      R.forEach(([l, v, t, st], i) => {
        if (st > s) return;
        const y = 20 + i * 44, now = st === s;
        c.text(160, y + 22, l, { size: 13, anchor: "end", weight: now ? 700 : 400, inBox: true });
        const xe = logX(v, x0, bw, lo, hi);
        bar(c, k, x0, y + 6, xe - x0, 24, st === 1 ? "code" : st === 5 ? "bridge" : "bad", { hl: now });
        c.text(xe + 8, y + 23, t, { size: 12, mono: true, inBox: true });
      });
      c.line(x0, 296, x0 + bw, 296, { tone: "muted" });
      [[1, "1 min"], [10, "10 min"], [60, "1 h"], [480, "8 h"]].forEach(([v, t]) => {
        const x = logX(v, x0, bw, lo, hi);
        c.line(x, 292, x, 300, { tone: "muted" });
        c.text(x, 318, t, { size: 12, anchor: "middle", tone: "muted" });
      });
      c.text(x0 + bw / 2, 344, "minutes, log scale", { size: 12, anchor: "middle", tone: "muted" });
    };
  };

  D["rootcause"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      legend(c, 20, 6, [["infrastructure", "bridge"], ["user code", "bad"]], 170);
      const rows = [{ label: "Job hang", values: [21, 5], hl: s === 2 }, { label: "Illegal memory access", values: [21, 41], hl: s === 3 }]; // Table 2
      c.bars({ x: 10, y: 32, w: 620, rowH: 76, labelW: 170, max: 45, fmt: (v) => `${v}`, tones: ["bridge", "bad"],
        rows: rows.map((r) => ({ ...r, dim: s >= 4 })) });
      if (s >= 4) {
        c.text(20, 224, "one 1,000-GPU job, 10 days: 28 runs", { size: 14, weight: 700 });     // Fig. 2, §2.1
        for (let i = 0; i < 28; i++) bar(c, k, 20 + i * 21.4, 238, 18, 30, i % 2 ? "take" : "paper", { hl: s === 4 });
        c.text(620, 290, "each block = one run between restarts", { size: 12, anchor: "end", tone: "muted" });
      }
      if (s >= 5) c.text(320, 336, "crash right after an update: code or machine?", { size: 16, weight: 700, anchor: "middle", tone: "bad" });
    };
  };

  // =========================================================== THE SYSTEM
  D["overview"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ctl = c.box({ x: 16, y: 16, w: 280, h: 60, label: "Robust Controller", sub: "outside the job", tone: "take", hl: s === 1 });
      c.box({ x: 16, y: 116, w: 608, h: 196, tone: "muted", dashed: true });
      c.text(30, 138, "training pod (one per machine)", { size: 12, tone: "muted", inBox: true });
      if (s >= 2) {
        const ag = c.box({ x: 40, y: 150, w: 560, h: 50, label: "Robust Agent", sub: "runs the controller's orders", tone: "bridge", hl: s === 2 });
        c.connect(ctl, ag, { tone: "take" });
        if (s >= 4) {
          const an = c.box({ x: 344, y: 16, w: 280, h: 60, label: "Runtime Analyzer", sub: "clusters stack traces", tone: "predict", hl: s === 4 });
          c.connect(ag, an, { tone: "predict", label: "stacks" });
        }
      }
      if (s >= 3) ["Monitor", "Diagnoser", "On-Demand Tracer", "CKPT manager"].forEach((t, i) =>
        c.box({ x: 40 + i * 142, y: 230, w: 134, h: 60, label: t, size: 13, tone: "code", hl: s === 3 }));
      if (s >= 5) c.text(320, 342, "isolate fast, don't pinpoint", { size: 17, weight: 700, anchor: "middle", tone: "predict" });
    };
  };

  D["realtime"] = (fig, k) => {
    const t = k.toggle({ label: "detection", options: ["with inspection", "timeout only"], value: "with inspection" });
    k.follow(t, { 1: "with inspection", 4: "timeout only", 5: "with inspection" });
    const c = k.canvas(W, H);
    const R = [["NIC crash", 30, 2], ["Port flapping", 30, 2], ["Switch down", 60, 2],      // Table 3
      ["GPU driver hang", 10, 3], ["GPU lost", 10, 3], ["OS kernel fault", 2, 3]];
    const x0 = 160, bw = 330, lo = 1, hi = 900;
    return (s) => {
      c.clear();
      const off = t.value === "timeout only";
      R.forEach(([l, v, st], i) => {
        const y = 14 + i * 44, now = st === s;
        c.text(150, y + 22, l, { size: 13, anchor: "end", weight: now ? 700 : 400, inBox: true });
        const val = off ? 600 : v, xe = logX(val, x0, bw, lo, hi);
        bar(c, k, x0, y + 6, xe - x0, 24, off ? "bad" : "code", { hl: now || (off && s === 4) });
        c.text(xe + 8, y + 23, off ? "~10 min" : v === 60 ? "30 s × 2" : `${v} s`, { size: 12, mono: true, inBox: true });
      });
      c.line(x0, 284, x0 + bw, 284, { tone: "muted" });
      [[1, "1 s"], [10, "10 s"], [60, "1 min"], [600, "10 min"]].forEach(([v, tt]) => {
        const x = logX(v, x0, bw, lo, hi);
        c.line(x, 280, x, 288, { tone: "muted" });
        c.text(x, 304, tt, { size: 12, anchor: "middle", tone: "muted" });
      });
      if (s === 1) c.text(320, 340, "lightweight queries, no load on the GPUs", { size: 15, weight: 700, anchor: "middle" });
      if (s >= 5) c.text(320, 340, "network: 2 alerts within 5 min → evict", { size: 15, weight: 700, anchor: "middle", tone: "predict" });
    };
  };

  D["ladder"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["traceable code error", "roll back code"], ["stop-time tests fail", "evict machines"],   // Fig. 5, §4.1–4.2
      ["all tests pass", "reattempt"], ["fails again", "roll back code"], ["still fails", "dual-phase replay"]];
    return (s) => {
      c.clear();
      let prev = null;
      R.forEach(([cond, act], i) => {
        const y = 12 + i * 68, now = s === i + 1, on = s >= i + 1;
        const a = c.box({ x: 16, y, w: 290, h: 50, label: cond, size: 14, tone: "muted", hl: now, dim: !on });
        const b = c.box({ x: 380, y, w: 244, h: 50, label: act, size: 14, tone: i === 4 ? "predict" : i === 2 ? "bridge" : i % 3 === 0 ? "take" : "bad", hl: now, dim: !on });
        c.connect(a, b, { dim: !on });
        if (prev) c.connect(prev, a, { tone: "muted", dim: !on });
        prev = a;
      });
    };
  };

  D["bitwise"] = (fig, k) => {
    const c = k.canvas(W, H);
    const HS = ["a3f9 1c07", "a3f9 1c07", "a3f9 1c07", "a3f9 1c07", "a3f9 1c07", "a3f9 1c06", "a3f9 1c07", "a3f9 1c07"]; // illustrative
    return (s) => {
      c.clear();
      if (s >= 3) c.box({ x: 16, y: 8, w: 608, h: 44, label: "same weights · same input · TP=2, PP=2, DP=2 · one step", size: 14, tone: "paper", hl: s === 3 });
      for (let i = 0; i < 8; i++) {
        const x = 16 + (i % 4) * 154, y = 72 + Math.floor(i / 4) * 92, bad = i === 5 && s >= 4;
        const sub = s >= 4 ? HS[i] : s >= 2 ? "reference model" : "EUD ✓ · NCCL ✓";
        c.box({ x, y, w: 146, h: 76, label: `machine ${i}`, sub, mono: s >= 4, size: 13, tone: bad ? "bad" : s >= 2 ? "bridge" : "code", hl: bad || s === 1 || s === 2 });
      }
      if (s >= 4) c.text(320, 290, "machine 5 differs by one bit → isolate", { size: 16, weight: 700, anchor: "middle", tone: "bad" });
      if (s >= 5) c.text(320, 334, "EUD alone: ~70% recall for silent corruption", { size: 15, weight: 700, anchor: "middle", tone: "predict" }); // §9
    };
  };

  D["replay"] = (fig, k) => {
    const b = k.slider({ label: "bad machine", min: 0, max: 23, value: 13, fmt: (v) => `#${v}` });
    k.follow(b, { 1: 13 });
    const c = k.canvas(W, H);
    const m = 4, n = 6;                                                 // Fig. 6, Alg. 1
    return (s) => {
      c.clear();
      const x = b.value, ha = Math.floor(x / m), vb = x % n;
      for (let r = 0; r < n; r++) {
        c.text(126, 20 + r * 48 + 26, `H${r}`, { size: 13, anchor: "end", weight: s >= 2 && r === ha ? 700 : 400, tone: s >= 2 && r === ha ? "bad" : "muted" });
        for (let q = 0; q < m; q++) {
          const id = r * m + q, inH = r === ha, inV = id % n === vb;
          let tone = "muted", hl = false, solid = false, dim = false;
          if (s === 2) { tone = inH ? "bad" : "code"; hl = inH; }
          if (s >= 3) { tone = inV ? "predict" : inH ? "bad" : "muted"; hl = inV && s === 3; dim = !inV && !inH; }
          if (s >= 4 && id === x) { tone = "bad"; solid = true; hl = true; dim = false; }
          c.box({ x: 140 + q * 110, y: 20 + r * 48, w: 100, h: 40, label: `${id}`, sub: s >= 3 ? `V${id % n}` : undefined, size: 13, tone, hl, solid, dim });
        }
      }
      const msg = s === 1 ? "24 machines: m = 4 per group, n = 6 groups" : s === 2 ? `phase 1: replay rows · H${ha} fails`
        : s === 3 ? `phase 2: regroup by ID mod 6 · V${vb} fails` : `H${ha} ∩ V${vb} = machine ${x}`;
      c.text(320, 340, msg, { size: 16, weight: 700, anchor: "middle", mono: s >= 4, tone: s >= 4 ? "bad" : undefined });
    };
  };

  D["rungs"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["Real-time eviction", 32.52, 2], ["Reattempt", 22.70, 3], ["Code rollback", 9.20, 3], ["Dual-phase replay", 1.23, 4], ["Not attributed", 34.35, 5]]; // §4.2; last is our subtraction
    return (s) => {
      c.clear();
      c.chips({ x: 20, y: 10, maxW: 600, size: 12, items: Array.from({ length: 19 }, (_, i) => ({ t: `job ${i + 1}`, tone: "bridge", hl: s === 1 })) });
      c.text(620, 84, "19 jobs, each ≥ 9,600 GPUs", { size: 13, anchor: "end", tone: "muted" });
      if (s >= 2) c.bars({ x: 10, y: 96, w: 620, rowH: 50, labelW: 160, max: 40, fmt: (v) => `${v.toFixed(2)}%`, tones: ["code"],
        rows: R.filter(([, , st]) => st <= s).map(([l, v, st]) => ({ label: l, values: [v], hl: st === s })) });
    };
  };

  D["hang"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ST = (id) => id < 12 ? "grad sync" : id < 14 ? "irecv" : id === 14 ? "isend" : "all_gather";      // Fig. 7
    const TN = (id) => id < 12 ? "code" : id < 14 ? "predict" : id === 14 ? "take" : "bad";
    return (s) => {
      c.clear();
      for (let q = 0; q < 4; q++) c.text(160 + q * 130, 28, `stage ${q}`, { size: 12, anchor: "middle", tone: "muted" });
      for (let r = 0; r < 4; r++) c.text(88, 40 + r * 66 + 33, r === 3 && s >= 5 ? "evict →" : `copy ${r}`, { size: 12, anchor: "end", weight: r === 3 && s >= 5 ? 700 : 400, tone: r === 3 && s >= 5 ? "bad" : "muted" });
      grid(c, (id) => {
        if (s === 1) return { tone: "muted", sub: "…stalled" };
        const sub = ST(id), out = id >= 12;
        if (s === 2) return { tone: "muted", sub, mono: false, hl: true };
        if (s === 3) return { tone: out ? "muted" : "code", sub, hl: !out };
        return { tone: TN(id), sub, hl: out && s >= 4, dim: s >= 5 && !out };
      });
      const msg = { 1: "backward pass stuck · no error · no logs", 2: "stacks from torchrun, dataloader and checkpoint processes",
        3: "dominant stack = healthy", 4: "4 outlier stacks, 3 kinds", 5: "shared group: PP row 12–15" }[s];
      c.text(320, 340, msg, { size: 15, weight: 700, anchor: "middle", maxW: 600, lines: 1 });
    };
  };

  D["overevict"] = (fig, k) => {
    const c = k.canvas(W, H);
    const COLS = 50, ROWS = 24, G0 = 21, BAD = [23, 26];                // 50 × 24 = 1,200 machines (§8); group row and faulty positions illustrative
    return (s) => {
      c.clear();
      for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
        const inG = r === 0 && q >= G0 && q < G0 + 8, bad = inG && BAD.includes(q);
        const tone = s >= 2 && bad ? "bad" : s >= 2 && inG ? "code" : "muted";
        c.dot(21 + q * 12.2, 50 + r * 11.4, { r: s >= 2 && inG ? 5 : 3.6, tone });
      }
      if (s >= 2) c.text(21 + (G0 + 3.5) * 12.2, 30, "PP group: 6 healthy + 2 faulty", { size: 13, weight: 700, anchor: "middle", tone: "predict" });
      const msg = { 1: "1,200 machines × 8 GPUs = 9,600 GPUs", 2: "the whole group of 8 is evicted",
        3: "8 ÷ 1,200 = 0.67% of the job", 4: "eval hang: 6 evicted → 2 bad CUDA cores, found days later",
        5: "MFU drop: flag a group every 10 s, evict the top one after 5 rounds" }[s];
      c.text(320, 346, msg, { size: 15, weight: 700, anchor: "middle", maxW: 610, lines: 1, mono: s === 3 });
    };
  };

  // =========================================================== FAST RECOVERY
  D["hotupdate"] = (fig, k) => {
    const sc = k.toggle({ label: "machines × 16 GPUs", options: ["128", "256", "512", "1024"], value: "128" });
    k.follow(sc, { 1: "128", 5: "1024" });
    const c = k.canvas(W, H);
    const T7 = { 128: [454, 46], 256: [545, 51], 512: [635, 54], 1024: [768, 65] };   // Table 7
    return (s) => {
      c.clear();
      c.text(16, 22, "requeue", { size: 13, weight: 700, tone: "bad" });
      let prev = null;
      ["release all", "reschedule", "rebuild pods", "restart"].forEach((t, i) => {
        const b = c.box({ x: 16 + i * 156, y: 30, w: 136, h: 44, label: t, size: 13, tone: "bad", hl: s === 1 });
        if (prev) c.connect(prev, b, { tone: "bad" });
        prev = b;
      });
      if (s >= 2) {
        c.text(16, 104, "hot update", { size: 13, weight: 700, tone: "code" });
        c.box({ x: 16, y: 112, w: 292, h: 44, label: "swap code in place, same pods", size: 13, tone: "code", hl: s === 2 });
      }
      if (s >= 3) c.box({ x: 332, y: 112, w: 292, h: 44, label: "urgent bug fix → stop now", size: 13, tone: "bad", hl: s === 3 });
      if (s >= 4) c.box({ x: 332, y: 166, w: 292, h: 44, label: "optional → next failure, or 24 h", size: 13, tone: "predict", hl: s === 4 });
      const [rq, hu] = T7[sc.value];
      c.text(16, 246, `scheduling time at ${sc.value} machines`, { size: 13, tone: "muted" });
      c.bars({ x: 10, y: 254, w: 620, rowH: 44, labelW: 110, max: 800, fmt: (v) => `${v} s`, tones: ["bridge"],
        rows: [{ label: "Requeue", values: [rq], hl: s === 1 }, { label: "Hot update", values: [hu], hl: s === 2 || s === 5 }] });
    };
  };

  D["standby"] = (fig, k) => {
    const p = k.slider({ label: "daily failure rate", min: 0.02, max: 0.5, step: 0.02, value: 0.1, fmt: (v) => `${v.toFixed(2)}%` });
    const c = k.canvas(W, H);
    const N = 1024;
    const pmf = (q) => { const out = []; let v = Math.pow(1 - q, N); for (let i = 0; i <= 9; i++) { out.push(v); v = v * (N - i) / (i + 1) * q / (1 - q); } return out; };
    return (s) => {
      c.clear();
      const P = pmf(p.value / 100);
      let cum = 0, p99 = 0;
      for (let i = 0; i < P.length; i++) { cum += P[i]; if (cum >= 0.99) { p99 = i; break; } p99 = i + 1; }
      const mx = Math.max(...P), y0 = 250, hh = 190;
      c.text(20, 22, `failed machines per day, of ${N.toLocaleString("en")}`, { size: 13, tone: "muted" });
      P.forEach((v, i) => {
        const x = 34 + i * 40, h = v / mx * hh, keep = i <= p99;
        bar(c, k, x, y0 - h, 30, h, s >= 3 && keep ? "code" : "bridge", { hl: s === 2, soft: s === 1 });
        c.text(x + 15, y0 + 18, `${i}`, { size: 12, anchor: "middle", tone: "muted" });
      });
      if (s >= 3) {
        const xl = 34 + p99 * 40 + 35;
        c.line(xl, 40, xl, y0, { tone: "predict", dash: true });
        c.label(xl + 4, 52, `P99 → keep ${p99} spares`, { size: 13, weight: 700, tone: "predict" });
      }
      if (s >= 4) {
        c.text(430, 92, "paper's pools (Table 5)", { size: 13, weight: 700, tone: "muted" });
        [["128 machines", 2], ["256 machines", 2], ["512 machines", 3], ["1,024 machines", 4]].forEach(([l, v], i) =>   // Table 5
          c.box({ x: 430, y: 104 + i * 40, w: 194, h: 34, label: `${l} → ${v}`, size: 13, tone: "take", hl: s === 4 }));
      }
      if (s >= 5) c.text(320, 300, "warm standby: 10.87× faster than requeue · 5.36× than reschedule", { size: 14, weight: 700, anchor: "middle", tone: "code", maxW: 610, lines: 1 }); // §8.2.1
      if (s >= 5) c.text(320, 334, "within 5.19% of unlimited spares (Fig. 12)", { size: 13, anchor: "middle", tone: "muted" });
    };
  };

  D["ckpt"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 3) {
        c.text(20, 66, "compute", { size: 13, weight: 700, inBox: true });
        c.text(20, 146, "copy stream", { size: 13, weight: 700, inBox: true });
        c.text(20, 226, "network", { size: 13, weight: 700, inBox: true });
        c.box({ x: 130, y: 40, w: 170, h: 44, label: "forward", tone: "muted" });
        c.box({ x: 304, y: 40, w: 170, h: 44, label: "backward", tone: "muted" });
        const opt = c.box({ x: 494, y: 40, w: 130, h: 44, label: "optimizer", tone: s === 3 ? "predict" : "muted", hl: s === 3 });
        c.box({ x: 130, y: 120, w: 160, h: 44, label: "D2H copy", tone: "code", hl: s === 1 });
        const ser = c.box({ x: 300, y: 120, w: 150, h: 44, label: "serialize", tone: "code", hl: s === 1 });
        if (s >= 2) for (let i = 0; i < 6; i++) c.box({ x: 150 + i * 54, y: 200, w: 44, h: 44, label: "P2P", size: 11, tone: "bridge", hl: s === 2 });
        if (s >= 3) c.connect(ser, opt, { tone: "predict", label: "waits for own save" });
        c.text(320, 300, "one training step (illustrative timing)", { size: 12, anchor: "middle", tone: "muted" });
        return;
      }
      c.text(16, 22, "MFU kept with every-step checkpoints · 70B, 128 × 16 GPUs", { size: 13, tone: "muted" });   // Table 8
      c.bars({ x: 10, y: 30, w: 620, rowH: 40, labelW: 150, max: 100, fmt: (v) => `${v.toFixed(2)}%`, tones: ["code"],
        rows: [["Megatron save", 39.84], ["Memory save", 70.05], ["ByteRobust", 99.23]].map(([l, v]) => ({ label: l, values: [v], hl: s === 4 && l === "ByteRobust" })) });
      if (s >= 5) {
        c.text(16, 192, "blocking time per save", { size: 13, tone: "muted" });
        c.bars({ x: 10, y: 200, w: 620, rowH: 40, labelW: 150, max: 7, fmt: (v) => `${v.toFixed(2)} s`, tones: ["bad"],
          rows: [["Megatron save", 6.77], ["Memory save", 1.84], ["ByteRobust", 0.04]].map(([l, v]) => ({ label: l, values: [v], hl: l === "ByteRobust" })) });
      }
    };
  };

  D["backup"] = (fig, k) => {
    const t = k.toggle({ label: "backup of ranks 8–9 goes to", options: ["same row", "cross-group"], value: "same row" });
    k.follow(t, { 1: "same row", 4: "same row", 5: "cross-group" });
    const c = k.canvas(W, H);
    // our rank numbering: rank = dp * 8 + stage * 2 + tp (fits Fig. 9's 8–9 ↔ 2–3 pairing)
    return (s) => {
      c.clear();
      const cross = t.value === "cross-group";
      const B = {};
      for (let dp = 0; dp < 2; dp++) {
        c.text(98, (dp ? 200 : 60) + 40, dp ? "copy 1" : "copy 0", { size: 12, anchor: "end", tone: s >= 3 && dp ? "bad" : "muted", weight: s >= 3 && dp ? 700 : 400 });
        for (let st = 0; st < 4; st++) {
          const r0 = dp * 8 + st * 2, gone = s >= 3 && dp === 1;
          const target = s >= 2 && ((cross && dp === 0 && st === 1) || (!cross && dp === 1 && st === 1));
          B[`${dp}${st}`] = c.box({ x: 110 + st * 130, y: dp ? 200 : 60, w: 120, h: 80, label: `ranks ${r0}–${r0 + 1}`, sub: gone ? "evicted" : target ? "copy of 8–9" : `stage ${st}`,
            size: 13, tone: gone ? "bad" : target ? "code" : "muted", dashed: gone, hl: (dp === 1 && st === 0 && s <= 2) || (target && s >= 4) });
        }
      }
      if (s >= 2) c.connect(B["10"], cross ? B["01"] : B["11"], { tone: "code" });
      if (s >= 4) {
        const ok = cross;
        c.text(320, 330, ok ? "copy survives: no shared TP, PP or DP group" : "copy lost: it was in the evicted row", { size: 16, weight: 700, anchor: "middle", tone: ok ? "code" : "bad" });
      } else if (s === 3) c.text(320, 330, "over-eviction removes the whole row", { size: 16, weight: 700, anchor: "middle", tone: "bad" });
      else c.text(320, 330, "TP=2, PP=4, DP=2 · each box is one machine", { size: 14, anchor: "middle", tone: "muted" });
    };
  };

  // =========================================================== DOES IT WORK?
  D["resolved"] = (fig, k) => {
    const j = k.toggle({ label: "job", options: ["Dense", "MoE"], value: "Dense" });
    k.follow(j, { 1: "Dense", 5: "MoE" });
    const c = k.canvas(W, H);
    const T4 = { Dense: [128, 20, 15, 12], MoE: [71, 31, 9, 14] };        // Table 4 (MoE rollback = 1 explicit + 13 implicit)
    const L = ["Evict + restart", "Hot update", "Analyzer evict", "Rollback"];
    return (s) => {
      c.clear();
      const v = T4[j.value], tot = v.reduce((a, b) => a + b, 0);
      c.text(16, 24, j.value === "Dense" ? "dense 70B+ · 3 months · 9,600 GPUs" : "MoE 200B+ · 1 month · 9,600 GPUs", { size: 14, weight: 700 });
      c.text(624, 24, `${tot} incidents`, { size: 13, anchor: "end", tone: "muted" });
      c.bars({ x: 10, y: 44, w: 620, rowH: 60, labelW: 150, max: 140, fmt: (x) => `${x} (${(x / tot * 100).toFixed(1)}%)`, tones: ["code"],
        rows: L.map((l, i) => ({ label: l, values: [v[i]], hl: s === i + 2, dim: s === 1 })) });
      const tag = ["explicit failures", "manual restarts", "hangs, slowdowns", "code bugs"];
      if (s >= 2) c.text(320, 340, `${L[Math.min(s, 5) - 2]}: ${tag[Math.min(s, 5) - 2]}`, { size: 14, anchor: "middle", tone: "muted" });
    };
  };

  D["ettrres"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(16, 22, "cumulative ETTR, dense job", { size: 13, tone: "muted" });
      bar(c, k, 16, 32, 600, 40, "muted", { soft: true });
      bar(c, k, 16, 32, 600 * 0.97, 40, "code", { hl: s === 1 });                                      // §8.1.3
      c.text(30, 58, "up to 97%", { size: 16, weight: 700, inBox: true });
      if (s >= 2) {
        c.text(16, 102, "90 days of wall-clock", { size: 13, tone: "muted" });
        bar(c, k, 16, 112, 600 * 0.97, 30, "code", { soft: true });
        bar(c, k, 16 + 600 * 0.97, 112, 600 * 0.03, 30, "bad", { hl: s === 2 });
        c.label(560, 130, "≈ 2.7 days lost", { size: 13, weight: 700, tone: "bad" });
      }
      if (s >= 3) {
        c.text(16, 184, "MFU, relative to the first run (Fig. 11)", { size: 13, tone: "muted" });
        c.bars({ x: 10, y: 192, w: 620, rowH: 40, labelW: 90, max: 1.8, fmt: (v) => `${v.toFixed(2)}×`, tones: ["take"],
          rows: [{ label: "Dense", values: [1.25], hl: s === 3 }, { label: "MoE", values: [1.58], hl: s === 3 || s === 4 }] });
      }
      if (s >= 4) c.text(320, 300, "MoE ETTR: lower than dense (value not in the text)", { size: 14, anchor: "middle", tone: "predict", weight: 700 });
      if (s >= 5) c.text(320, 336, "late dip: first long-context feature → code failures", { size: 14, anchor: "middle", tone: "bad", weight: 700 });
    };
  };

  D["stress"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["CUDA error", 93, 518, 2], ["InfiniBand error", 60, 288, 0], ["GPU memory error", 10, 600, 3],   // Table 6 (ours mean, selective)
      ["GPU unavailable", 10, 120, 0], ["Code/data change", 57, Infinity, 4], ["NaN value", 4289, 7200, 5]];
    const x0 = 160, bw = 330, lo = 5, hi = 10000;
    return (s) => {
      c.clear();
      legend(c, 160, 6, [["ByteRobust (mean)", "code"], ["stress testing", "bad"]], 190);
      R.forEach(([l, ours, sel, st], i) => {
        const y = 30 + i * 50, now = st === s;
        c.text(150, y + 26, l, { size: 13, anchor: "end", weight: now ? 700 : 400, inBox: true });
        const inf = !isFinite(sel), xs = inf ? x0 + bw : logX(sel, x0, bw, lo, hi);
        bar(c, k, x0, y + 4, xs - x0, 18, "bad", { dashed: inf, soft: inf, hl: now && s >= 2 });
        c.text(xs + 6, y + 18, inf ? "never" : `${sel} s`, { size: 11, mono: true, inBox: true });
        if (s >= 2) {
          const xo = logX(ours, x0, bw, lo, hi);
          bar(c, k, x0, y + 26, xo - x0, 18, "code", { hl: now });
          c.text(xo + 6, y + 40, `${ours} s`, { size: 11, mono: true, inBox: true });
        }
      });
      c.text(x0 + bw / 2, 344, "seconds from localization to restart, log scale", { size: 12, anchor: "middle", tone: "muted" });
    };
  };

  // =========================================================== YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Can anyone check it?", "No code, traces or incident data", "bad"],
      ["Do the counts agree?", "Table 1: 39,687 explicit · §1: 38,236", "bad"],
      ["Do claims match tables?", "84.50% claimed · Table 6 gives 82%", "bad"],
      ["Same hardware throughout?", "Benchmarks on L20 PCIe, not Hopper", "predict"],
      ["Steelman", "778,135 real jobs, failures included", "code"],
    ];
    return (s) => board(c, rows, s);
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Every-step memory checkpoints", "copy · 0.04 s stall, 99.23% MFU", "code"],   // Table 8
      ["Second-level health polling", "copy · NIC 30 s, GPU 10 s", "code"],           // Table 3
      ["Stack dumps on hang", "copy · py-spy + flight recorder", "code"],              // §7
      ["Code rollback rung", "copy · fixed 9.20% of failures", "code"],                // §4.2
      ["Spares and dual-phase replay", "later · 2 spares at 128 machines", "predict"], // Table 5
    ];
    return (s) => board(c, rows, s);
  };
})();
