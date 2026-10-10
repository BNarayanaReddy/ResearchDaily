/* Drawings for the Disaggregated Quantization lesson. One entry per data-draw
   name; each is redrawn on every step and control change. Numbers from the
   paper carry a // Table N or // §N comment; everything else is illustrative
   layout or our arithmetic, as each page's caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- helpers
  const sgn = (v) => (v < 0 ? "−" : "+");
  const f2 = (v) => v.toFixed(2).replace("-", "−");
  const f1 = (v) => v.toFixed(1).replace("-", "−");
  const kfmt = (t) => (t >= 1024 ? `${t / 1024}K` : `${t}`);
  const nearest = (grid, v) => grid.reduce((b, g) => (Math.abs(g - v) < Math.abs(b - v) ? g : b), grid[0]);

  // App. A.3 grids (normalized units, block maximum at 6)
  const E2M1 = [0, 0.5, 1, 1.5, 2, 3, 4, 6];
  const NVFP4 = [...E2M1.slice(1).map((v) => -v).reverse(), ...E2M1];          // 15 values
  const LUT3 = [-4.7038, -2.8698, -1.3696, 0, 1.2204, 2.5285, 4.0473, 6];
  const LUT2 = [-3.6517, 0, 2.5227, 6];
  const GRIDS = { NVFP4, LUT3, LUT2 };

  // One illustrative block of 16 weights; its largest magnitude is negative.
  const BLOCK = [0.12, -0.50, 0.33, 0.07, -0.21, 0.04, 0.28, -0.09, 0.17, -0.36, 0.02, 0.22, -0.14, 0.41, -0.05, 0.10];
  // Block scale: NVFP4 keeps the sign in the element; LUT formats put it in the scale (App. A.3).
  const scaleOf = (blk, fmt) => {
    const m = blk.reduce((b, v) => (Math.abs(v) > Math.abs(b) ? v : b), 0);
    return fmt === "NVFP4" ? Math.abs(m) / 6 : m / 6;
  };
  const quant = (blk, fmt) => { const s = scaleOf(blk, fmt); return blk.map((v) => nearest(GRIDS[fmt], v / s) * s); };
  const rms = (a, b) => Math.sqrt(a.reduce((t, v, i) => t + (v - b[i]) ** 2, 0) / a.length);

  // a checklist board: rows [question, answer, tone]; row i appears on step i + 1
  const board = (c, rows, s, top = 8, rowH = 58) => rows.forEach(([q, a, tone], i) => {
    if (s < i + 1) return;
    const y = top + i * rowH, now = s === i + 1;
    c.box({ x: 10, y, w: 620, h: rowH - 8, tone: "muted", hl: now });
    c.text(26, y + (rowH - 8) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: 330, lines: 1, inBox: true });
    c.box({ x: 370, y: y + 8, w: 246, h: rowH - 24, label: a, size: 12, tone, hl: now });
  });

  // =========================================================== TOOLBOX
  D["phases"] = (fig, k) => {
    const ph = k.toggle({ label: "phase", options: ["prefill", "decode"], value: "prefill" });
    k.follow(ph, { 1: "prefill", 3: "decode" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const pre = ph.value === "prefill";
      const prompt = c.box({ x: 16, y: 60, w: 190, h: 56, label: "16,384 prompt tokens", sub: "all at once", subSize: 14, tone: "paper", hl: pre }); // Table 10: S = 16384
      const layers = c.box({ x: 250, y: 40, w: 130, h: 230, label: "36 layers", sub: "Qwen3-8B", subSize: 14, tone: "take" });                     // Table 6
      c.connect(prompt, layers);
      if (s >= 2) {
        const cache = c.box({ x: 440, y: 60, w: 184, h: 56, label: "KV cache", sub: "K and V", subSize: 14, tone: "predict", hl: s === 4 });
        c.connect(layers, cache);
        if (s >= 3) {
          const dec = c.box({ x: 440, y: 166, w: 184, h: 50, label: "1 new token per step", tone: "code", hl: !pre });
          c.connect(cache, dec);
          c.chips({ x: 440, y: 248, maxW: 190, items: [{ t: "The", tone: "code" }, { t: "fee", tone: "code" }, { t: "is", tone: "code" }, { t: "…", tone: "code", dashed: true }] });
          c.arrow(532, 218, 532, 246, { tone: "code" });
        }
      }
      if (s >= 4) {
        c.line(410, 30, 410, 300, { tone: "muted", dash: true });
        c.text(205, 330, "prefill GPU", { anchor: "middle", size: 15, tone: "muted", weight: 600 });
        c.text(532, 330, "decode GPU", { anchor: "middle", size: 15, tone: "muted", weight: 600 });
      }
    };
  };

  D["bound"] = (fig, k) => {
    const TS = [1, 16, 256, 1024, 4096, 16384];
    const t = k.slider({ label: "tokens in one pass", min: 0, max: 5, value: 0, fmt: (i) => TS[i].toLocaleString("en-US") });
    k.follow(t, { 1: 0, 4: 5 });
    const c = k.canvas(W, H);
    const Hd = 4096;                                                  // Table 6: Qwen3-8B d_model
    return (s) => {
      c.clear();
      const T = TS[t.value];
      const bytes = 2 * (Hd * Hd + 2 * T * Hd), flops = 2 * T * Hd * Hd;   // §1.1 cost formula, BF16 in and out (our arithmetic)
      const I = flops / bytes;
      c.box({ x: 16, y: 30, w: 180, h: 64, label: "4096 × 4096 weight", sub: "33.6 MB in BF16", tone: "muted" });
      const lx = (v) => 230 + (Math.log10(v) - 6) / 6 * 390;          // log scale 1e6 .. 1e12
      const bar = (y, v, txt, tone) => {
        c.text(230, y - 8, txt, { size: 13, weight: 600, tone });
        c.add(k.h("rect", { x: 230, y, width: Math.max(4, lx(v) - 230), height: 22, rx: 4, class: `f-${tone}` }));
      };
      bar(46, bytes, `bytes moved: ${(bytes / 1e6).toFixed(1)} MB`, "paper");
      if (s >= 2) {
        c.box({ x: 16, y: 120, w: 180, h: 50, label: `${T.toLocaleString("en-US")} token${T > 1 ? "s" : ""}`, tone: "bridge" });
        bar(110, flops, `math: ${flops >= 1e9 ? (flops / 1e9).toFixed(1) + " GFLOP" : (flops / 1e6).toFixed(1) + " MFLOP"}`, "code");
        c.text(425, 196, `${I < 10 ? I.toFixed(1) : Math.round(I).toLocaleString("en-US")} FLOPs per byte`, { anchor: "middle", size: 26, weight: 700, mono: true });
      }
      if (s >= 3) {
        const tag = T === 1 ? ["memory-bound: math waits for weights", "bad"]
          : T >= 4096 ? ["compute-bound: weights wait for math", "code"] : ["in between: depends on the GPU", "muted"];
        c.box({ x: 230, y: 226, w: 390, h: 44, label: tag[0], tone: tag[1], size: 14 });
      }
      if (s === 3 || (s >= 5 && T >= 4096) || (s >= 5 && T === 1)) {
        c.box({ x: 230, y: 284, w: 390, h: 44, label: T === 1 ? "helps: fewer weight bytes" : "helps: faster arithmetic", tone: "predict", size: 14 });
      }
    };
  };

  D["grid"] = (fig, k) => {
    const fm = k.toggle({ label: "grid", options: ["NVFP4", "LUT3", "LUT2"], value: "NVFP4" });
    k.follow(fm, { 1: "NVFP4", 4: "LUT2" });
    const c = k.canvas(W, H);
    const X = (v) => 352 + v * 43;
    return (s) => {
      c.clear();
      const fmt = s <= 2 ? "NVFP4" : fm.value;
      c.chips({ x: 16, y: 8, maxW: 610, size: 14, items: BLOCK.map((v) => ({ t: f2(v), tone: "paper" })) });
      if (s < 2) return;
      const sc = scaleOf(BLOCK, fmt);
      c.line(X(-6), 120, X(6), 120, { tone: "muted" });
      [-6, -4, -2, 0, 2, 4, 6].forEach((v) => c.text(X(v), 104, `${v}`.replace("-", "−"), { anchor: "middle", size: 13, tone: "muted" }));
      c.text(16, 125, "÷ scale", { size: 13, tone: "muted" });
      BLOCK.forEach((v) => c.dot(X(v / sc), 120, { r: 4, tone: "paper" }));
      if (s >= 3) {
        const q = quant(BLOCK, fmt);
        c.line(X(-6), 230, X(6), 230, { tone: "muted" });
        c.text(16, 235, "snapped", { size: 13, tone: "muted" });
        GRIDS[fmt].forEach((g) => c.dot(X(g), 230, { r: 3, tone: "muted" }));
        BLOCK.forEach((v, i) => c.line(X(v / sc), 126, X(q[i] / sc), 224, { tone: "predict", width: 1 }));
        q.forEach((v) => c.dot(X(v / sc), 230, { r: 4.5, tone: "predict" }));
        c.text(320, 270, `${fmt}: ${GRIDS[fmt].length} grid points · RMS error ${f2(rms(BLOCK, q) / Math.abs(sc))} (scale units)`, { anchor: "middle", size: 14, weight: 600, maxW: 600, lines: 1 });
      }
      if (s >= 5) c.text(320, 318, "bits per weight:  LUT2 2.5 · LUT3 3.5 · NVFP4 4.5 · BF16 16", { anchor: "middle", size: 14, mono: true, tone: "code", weight: 700, maxW: 610, lines: 1 }); // App. A.3
    };
  };

  D["qad"] = (fig, k) => {
    const q1 = k.slider({ label: "student’s P(“cat”)", min: 0.3, max: 0.9, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(q1, { 1: 0.5 });
    const c = k.canvas(W, H);
    const P = [0.7, 0.2, 0.1];                                        // illustrative teacher
    return (s) => {
      c.clear();
      const rest = 1 - q1.value, Q = [q1.value, rest * 2 / 3, rest / 3];
      const kl = P.reduce((t, p, i) => t + p * Math.log(p / Q[i]), 0);
      const m = c.box({ x: 20, y: 16, w: 170, h: 48, label: "FP32 master", tone: "take" });
      const r = c.box({ x: 20, y: 106, w: 170, h: 48, label: "round to grid", tone: "muted" });
      const st = c.box({ x: 20, y: 196, w: 170, h: 48, label: "student", sub: "rounded", tone: "paper" });
      c.connect(m, r); c.connect(r, st);
      if (s >= 2) { c.arrow(214, 220, 214, 40, { tone: "take", dash: true }); c.text(224, 134, "STE", { size: 13, tone: "take", weight: 700 }); }
      if (s >= 3) {
        c.box({ x: 20, y: 286, w: 170, h: 48, label: "teacher", sub: "frozen BF16", tone: "muted" });
        c.chips({ x: 300, y: 10, items: [{ t: "teacher", tone: "muted" }, { t: "student", tone: "paper" }] });
        c.bars({ x: 270, y: 50, w: 360, rowH: 50, labelW: 56, tones: ["muted", "paper"], max: 1, fmt: (v) => v.toFixed(2),
          rows: ["cat", "dog", "car"].map((t, i) => ({ label: t, values: [P[i], Q[i]] })) });
      }
      if (s >= 4) c.text(450, 236, `KL = ${kl.toFixed(3)} nats`, { anchor: "middle", size: 24, weight: 700, mono: true, tone: "predict" });
      if (s >= 5) c.box({ x: 270, y: 280, w: 360, h: 50, label: "100M tokens · LR 3×10⁻⁶ · ≈2,450 steps", tone: "code", size: 14 }); // Table 3
    };
  };

  // ======================================================== THE MACHINE
  D["problem"] = (fig, k) => {
    const md = k.toggle({ label: "2-bit weights as", options: ["weight-only", "autocast"], value: "weight-only" });
    k.follow(md, { 1: "weight-only", 3: "autocast" });
    const c = k.canvas(W, H);
    // Table 1, Qwen 3 family means: [decode-heavy, prefill-heavy]; prefill speedup on Qwen3-8B
    const ROWS = { wo: ["weight-only · 1.00×", [38.4, 64.1]], ac: ["autocast · 1.49×", [34.8, 61.3]], bf: ["BF16 · 1.00×", [66.2, 84.2]] };
    return (s) => {
      c.clear();
      const ac = md.value === "autocast";
      const w = c.box({ x: 16, y: 14, w: 150, h: 42, label: "2-bit weight", tone: "muted" });
      const a = c.box({ x: 16, y: 80, w: 150, h: 42, label: "activations", sub: "BF16", tone: "bridge" });
      const mid = c.box({ x: 214, y: 14, w: 180, h: 42, label: ac ? "re-round to NVFP4" : "unpack to BF16", tone: ac ? "predict" : "muted" });
      const mm = c.box({ x: 446, y: 30, w: 178, h: 76, label: ac ? "FP4 × FP4 tensor cores" : "BF16 × BF16 matmul", tone: ac ? "predict" : "paper" });
      c.connect(w, mid); c.connect(mid, mm);
      if (ac) { const ra = c.box({ x: 214, y: 80, w: 180, h: 42, label: "round to FP4", tone: "predict" }); c.connect(a, ra); c.connect(ra, mm); }
      else c.connect(a, mm);
      if (s === 2) c.box({ x: 446, y: 116, w: 178, h: 30, label: "native: NVFP4 only", size: 12, tone: "predict" });
      c.text(166, 176, "decode-heavy", { size: 12, tone: "paper", weight: 700 });
      c.text(270, 176, "prefill-heavy", { size: 12, tone: "take", weight: 700 });
      const rows = [ROWS.wo];
      if (s >= 3) rows.push(ROWS.ac);
      if (s >= 5) rows.push(ROWS.bf);
      c.bars({ x: 0, y: 188, w: 630, rowH: 54, labelW: 160, tones: ["paper", "take"], max: 90, fmt: (v) => v.toFixed(1),
        rows: rows.map(([l, v]) => ({ label: l, values: v })) });
      if (s === 4) c.label(560, 268, "−3.6 points", { anchor: "middle", size: 14, tone: "bad", weight: 700 });
    };
  };

  D["ladder"] = (fig, k) => {
    const fam = k.toggle({ label: "model", options: ["Qwen3-8B", "Gemma3-12B"], value: "Qwen3-8B" });
    const c = k.canvas(W, H);
    // Table 1 device GB, 2-bit decode: LUT2 / +format / +full / +ODP
    const GB = { "Qwen3-8B": [4.66, 4.66, 8.57, 4.66], "Gemma3-12B": [5.38, 5.38, 11.43, 5.38] };
    const R = [
      ["① one format", ["2-bit W"], "NVFP4 math", "NVFP4 math"],
      ["② split format", ["2-bit W"], "NVFP4 math", "weight-only"],
      ["③ split weights", ["NVFP4 W_p", "2-bit W_d"], "own NVFP4", "weight-only"],
      ["④ stream W_p (ODP)", ["W_p on SSD", "2-bit W_d"], "own NVFP4", "weight-only"],
    ];
    return (s) => {
      c.clear();
      R.forEach(([name, ws, pre, dec], i) => {
        if (s < i + 1) return;
        const y = 8 + i * 66, now = s === i + 1;
        c.box({ x: 8, y, w: 150, h: 56, label: name, tone: "muted", hl: now, size: 14 });
        if (ws.length === 1) c.box({ x: 168, y, w: 120, h: 56, label: ws[0], tone: "muted", mono: true, size: 13 });
        else ws.forEach((t, j) => c.box({ x: 168, y: y + j * 29, w: 120, h: 27, label: t, mono: true, size: 12, tone: j ? "muted" : "predict", dashed: i === 3 && j === 0 }));
        c.box({ x: 298, y, w: 170, h: 27, label: `prefill: ${pre}`, size: 12, tone: "predict" });
        c.box({ x: 298, y: y + 29, w: 170, h: 27, label: `decode: ${dec}`, size: 12, tone: i ? "paper" : "predict" });
        c.box({ x: 478, y, w: 152, h: 56, label: `${GB[fam.value][i]} GB`, sub: "on the GPU", tone: i === 2 ? "bad" : "code", mono: true, hl: now });
      });
      if (s >= 5) c.box({ x: 8, y: 276, w: 622, h: 48, label: "attention and KV cache shape: unchanged on every rung", tone: "take", hl: true, size: 14 });
    };
  };

  D["route"] = (fig, k) => {
    const tk = k.toggle({ label: "token", options: ["prompt", "answer"], value: "prompt" });
    k.follow(tk, { 1: "prompt", 3: "answer" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const pre = tk.value === "prompt";
      const tok = c.box({ x: 12, y: 132, w: 120, h: 52, label: pre ? "prompt token" : "answer token", tone: pre ? "predict" : "paper", hl: true });
      const lit = s >= 2;
      const a1 = c.box({ x: 176, y: 30, w: 190, h: 46, label: "round acts to NVFP4", tone: "predict", dim: lit && !pre, size: 13 });
      const a2 = c.box({ x: 420, y: 30, w: 206, h: 46, label: "FP4 × FP4 matmul", tone: "predict", dim: lit && !pre, size: 13 });
      const b1 = c.box({ x: 176, y: 240, w: 190, h: 46, label: "keep acts in BF16", tone: "paper", dim: lit && pre, size: 13 });
      const b2 = c.box({ x: 420, y: 240, w: 206, h: 46, label: "unpack W · BF16 matmul", tone: "paper", dim: lit && pre, size: 13 });
      const wt = c.box({ x: 420, y: 135, w: 206, h: 46, label: "one stored weight", tone: "muted", size: 13 });
      c.connect(a1, a2, { dim: lit && !pre }); c.connect(b1, b2, { dim: lit && pre });
      c.connect(wt, a2); c.connect(wt, b2);
      if (s >= 2) c.connect(tok, pre ? a1 : b1, { route: "elbow", tone: pre ? "predict" : "paper" });
      if (s >= 4) c.box({ x: 176, y: 304, w: 450, h: 40, label: "decode speedup: 2.86× → 2.93× (Qwen3-8B)", tone: "code", mono: true, size: 13 }); // Table 1
      if (s >= 5) c.box({ x: 12, y: 304, w: 150, h: 40, label: "6.40 GB, same", tone: "muted", mono: true, size: 13 });                     // Table 1
    };
  };

  D["double"] = (fig, k) => {
    const pw = k.toggle({ label: "prefill weight", options: ["re-rounded 2-bit", "own NVFP4"], value: "re-rounded 2-bit" });
    k.follow(pw, { 1: "re-rounded 2-bit", 3: "own NVFP4" });
    const c = k.canvas(W, H);
    const B = BLOCK.slice(0, 8);
    return (s) => {
      c.clear();
      const own = pw.value === "own NVFP4";
      const l2 = quant(BLOCK, "LUT2").slice(0, 8);
      const twice = quant(quant(BLOCK, "LUT2"), "NVFP4").slice(0, 8);
      const direct = quant(BLOCK, "NVFP4").slice(0, 8);
      const third = own ? direct : twice;
      const rows = own ? [B, third] : [B, l2, third];
      const labels = own ? ["original", "own NVFP4"] : ["original", "LUT2", "→ NVFP4"];
      c.matrix({ x: 130, y: 20, cell: 60, cellH: 38, size: 13, data: rows, rowLabels: labels, rowLabelW: 118, fmt: (v) => f2(v),
        tone: (i, j, v) => (i === 0 ? "paper" : Math.abs(v - B[j]) < 0.02 ? "code" : "bad") });
      c.text(130, own ? 120 : 158, `prefill sees: RMS error ${f2(rms(B, third) * 100)} ×10⁻²`, { size: 15, weight: 700, tone: own ? "code" : "bad", mono: true });
      if (s >= 2) c.box({ x: 16, y: 190, w: 296, h: 44, label: "NVFP4: 15 values · LUT2: 4", tone: "predict", size: 14 });
      if (s >= 4) c.box({ x: 328, y: 190, w: 296, h: 44, label: "both copies trained by one QADD run", tone: "take", size: 13 });
      if (s >= 5) c.box({ x: 16, y: 256, w: 608, h: 50, label: "GPU weights: 4.66 GB → 8.57 GB (Qwen3-8B, 2-bit)", tone: "bad", mono: true, size: 14 }); // Table 1
    };
  };

  D["qadd"] = (fig, k) => {
    const c = k.canvas(W, H);
    const TOK = [["Summarize", 1], ["this", 1], ["memo", 1], [":", 1], ["It", 0], ["covers", 0], ["Q3", 0]];
    return (s) => {
      c.clear();
      let x = 20;
      const chips = TOK.map(([t, p], i) => {
        const w = Math.max(66, c.measure(t, 14, { weight: 600 }) + 26);
        const b = c.box({ x, y: 140, w, h: 50, label: t, sub: p ? "ignored" : "scored", size: 14, subSize: 13, tone: p ? "predict" : "paper", hl: s === 5 && i === 3 });
        x += w + (i === 3 ? 20 : 6);
        return b;
      });
      if (s >= 2) {
        const pp = c.box({ x: 20, y: 262, w: 270, h: 50, label: "prefill path · NVFP4", tone: "predict" });
        const dp = c.box({ x: 360, y: 262, w: 260, h: 50, label: "decode path · weight-only", tone: "paper" });
        c.connect(chips[1], pp); c.connect(chips[5], dp);
        if (s >= 4) c.connect(dp, pp, { tone: "take", dash: true, label: "via prompt K, V" });
      }
      if (s >= 3) {
        const loss = c.box({ x: 380, y: 26, w: 230, h: 46, label: "KL vs teacher", tone: "bad" });
        c.connect(chips[5], loss);
        if (s >= 5) { c.arrow(chips[3].bx.cx, chips[3].bx.t - 4, loss.bx.l - 4, loss.bx.cy + 10, { tone: "take", dash: true }); c.label(150, 70, "“:” predicts “It”", { size: 13, tone: "take", weight: 700 }); }
      }
    };
  };

  D["odp-mem"] = (fig, k) => {
    const ph = k.toggle({ label: "phase", options: ["decode", "prefill"], value: "decode" });
    k.follow(ph, { 1: "decode", 2: "prefill", 5: "decode" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const pre = ph.value === "prefill";
      const carved = s >= 3 && pre;
      c.text(16, 26, "GPU memory", { size: 14, weight: 700 });
      c.box({ x: 16, y: 40, w: carved ? 262 : 376, h: 90, label: "decode weights", sub: carved ? "4.66 GB minus 2 slots" : "4.66 GB", tone: "paper", dim: pre && s < 5 }); // Table 1
      if (carved) {
        c.box({ x: 288, y: 40, w: 50, h: 90, label: "A", tone: "predict", hl: true });
        c.box({ x: 344, y: 40, w: 50, h: 90, label: "B", tone: "predict" });
      }
      if (s >= 2) {
        c.text(16, 214, "SSD: NVFP4 prefill copy, 36 blocks", { size: 14, weight: 700 }); // Table 6: 36 layers
        const done = s >= 5 ? 36 : s === 4 ? 12 : 0;
        for (let i = 0; i < 36; i++) {
          const bx = 16 + (i % 18) * 21, by = 228 + Math.floor(i / 18) * 26;
          const tone = i < done ? "muted" : (s === 4 && (i === 12 || i === 13)) ? "predict" : "take";
          c.add(k.h("rect", { x: bx, y: by, width: 17, height: 20, rx: 3, class: `f-${tone}${i < done ? " softer" : ""}` }));
        }
        if (s >= 3 && s < 5) c.arrow(314, 222, 314, 136, { tone: "predict" });
      }
      const status = s === 1 ? ["generating answer tokens", "paper"] : s === 2 ? ["reading the prompt", "predict"] : s === 3 ? ["slot A computes, B loads", "predict"]
        : s === 4 ? ["block 13 computes, 14 loads", "predict"] : ["slots restored; decode", "code"];
      c.box({ x: 420, y: 40, w: 206, h: 90, label: status[0], tone: status[1] });
      if (s >= 5) {
        c.box({ x: 420, y: 228, w: 206, h: 46, label: "SSD reads: 3.64 + 0.20 GB", tone: "muted", mono: true, size: 12 }); // App. C.1
        c.box({ x: 420, y: 288, w: 206, h: 46, label: "extra GPU memory: 0 GB", tone: "code", mono: true, size: 13 });
      }
    };
  };

  D["odp-time"] = (fig, k) => {
    const TS = [1024, 2048, 4096, 8192, 16384, 32768];
    const t = k.slider({ label: "prompt", min: 0, max: 5, value: 4, fmt: (i) => `${kfmt(TS[i])} tokens` });
    k.follow(t, { 1: 4, 3: 0, 4: 3, 5: 4 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const T = TS[t.value], L = 1, C = T / 8192;      // schematic: load = compute at 8K (§2.5)
      // two slots: load i starts when load i-1 is done and compute i-2 has freed its slot
      const n = 36, ls = [], le = [], cs = [], ce = [];
      for (let i = 0; i < n; i++) {
        ls[i] = Math.max(i ? le[i - 1] : 0, i >= 2 ? ce[i - 2] : 0); le[i] = ls[i] + L;
        cs[i] = Math.max(le[i], i ? ce[i - 1] : 0); ce[i] = cs[i] + C;
      }
      const show = 5, span = ce[show - 1], px = 500 / span, x0 = 116;
      c.text(16, 62, "SSD → slot", { size: 13, tone: "muted" });
      for (let i = 0; i < show; i++) c.box({ x: x0 + ls[i] * px, y: 40, w: Math.max(14, L * px - 3), h: 34, label: px * L > 40 ? `L${i + 1}` : "", size: 11, tone: "predict" });
      if (s >= 2) {
        c.text(16, 132, "compute", { size: 13, tone: "muted" });
        for (let i = 0; i < show; i++) c.box({ x: x0 + cs[i] * px, y: 110, w: Math.max(14, C * px - 3), h: 34, label: px * C > 40 ? `B${i + 1}` : "", size: 11, tone: "take" });
        const busy = n * C, idle = 1 - busy / ce[n - 1];
        c.text(320, 196, idle > 0.02 ? `GPU idle ${Math.round(idle * 100)}% of prefill (schematic)` : "loading hidden behind compute", { anchor: "middle", size: 16, weight: 700, tone: idle > 0.02 ? "bad" : "code" });
      }
      if (s >= 4) c.box({ x: 120, y: 226, w: 400, h: 40, label: "≈8K tokens: compute overtakes loading (§2.5)", tone: "muted", size: 13 });
      if (s >= 5) c.box({ x: 60, y: 284, w: 520, h: 50, label: "measured, 16K: NVFP4 1.49× · streamed 1.47× vs BF16", tone: "code", mono: true, size: 13 }); // Table 10, Qwen3-8B
    };
  };

  D["prefiller"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const dec = c.box({ x: 360, y: 64, w: 264, h: 180, label: s >= 2 ? "IQ1_S decoder · frozen" : "Qwen3.8-27B · IQ1_S", sub: "1-bit GGUF (Unsloth)", tone: "muted", dashed: s >= 2, hl: s === 1 || s === 2 });
      if (s >= 3) {
        const pre = c.box({ x: 16, y: 64, w: 264, h: 180, label: "NVFP4 prefiller", sub: "trainable", tone: "predict", hl: s === 3 });
        c.connect(pre, dec, { label: "KV cache", tone: "predict" });
        c.arrow(356, 214, 284, 214, { tone: "take", dash: true, label: "gradient", dy: 16 });
      }
      if (s >= 4) c.box({ x: 16, y: 270, w: 608, h: 44, label: "shared, frozen: embeddings · output head · linear-attention gates", tone: "muted", size: 13, hl: s === 4 }); // App. A.2
      if (s >= 5) c.box({ x: 16, y: 8, w: 608, h: 42, label: "95M tokens · 980 steps · 64 B300 GPUs", tone: "code", mono: true, size: 14 }); // App. A.2, Table 4
    };
  };

  // ======================================================= DOES IT WORK?
  // Table 1 family means. [rung 1 (none), rung 2 (format)]
  const T1 = {
    "Qwen 3": { "decode-heavy": { NVFP4: [61.8, 63.7], LUT3: [55.4, 59.9], LUT2: [34.8, 37.2] },
      "prefill-heavy": { NVFP4: [79.8, 81.1], LUT3: [76.3, 77.2], LUT2: [61.3, 61.0] } },
    "Gemma 3": { "decode-heavy": { NVFP4: [51.9, 55.0], LUT3: [46.7, 50.4], LUT2: [30.8, 32.6] },
      "prefill-heavy": { NVFP4: [64.4, 64.7], LUT3: [61.4, 62.1], LUT2: [50.8, 49.8] } },
  };
  D["fmt-res"] = (fig, k) => {
    const fam = k.toggle({ label: "family", options: ["Qwen 3", "Gemma 3"], value: "Qwen 3" });
    const wk = k.toggle({ label: "tests", options: ["decode-heavy", "prefill-heavy"], value: "decode-heavy" });
    k.follow(fam, { 1: "Qwen 3", 5: "Gemma 3" });
    k.follow(wk, { 1: "decode-heavy", 4: "prefill-heavy", 5: "decode-heavy" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 2) {
        c.box({ x: 16, y: 40, w: 296, h: 90, label: "decode-heavy", sub: "GSM8K · MATH-500 · MMLU-Pro", tone: "paper" });
        c.box({ x: 328, y: 40, w: 296, h: 90, label: "prefill-heavy", sub: "RULER, 4K–32K prompts", tone: "take" });
        if (s >= 2) {
          c.box({ x: 16, y: 170, w: 296, h: 70, label: "round only decode: 2–4× worse", sub: "on decode-heavy, most models", tone: "bad", size: 14 });
          c.box({ x: 328, y: 170, w: 296, h: 70, label: "round only prefill: worse", sub: "on prefill-heavy, 7 of 8 models", tone: "bad", size: 14 });
        }
        return;
      }
      const d = T1[fam.value][wk.value];
      c.chips({ x: 160, y: 8, items: [{ t: "rung 1: one format", tone: "muted" }, { t: "rung 2: split format", tone: "code" }] });
      c.bars({ x: 0, y: 56, w: 630, rowH: 92, labelW: 150, tones: ["muted", "code"], max: 90, fmt: (v) => v.toFixed(1),
        rows: Object.entries(d).map(([n, v]) => ({ label: `${n} (${sgn(v[1] - v[0])}${Math.abs(v[1] - v[0]).toFixed(1)})`, values: v })) });
      c.text(320, 348, `${fam.value} · ${wk.value} accuracy (Table 1)`, { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  // Table 1: [weight-only, rung 1 LUT, +format, +full]
  const T1F = {
    "Qwen 3": { sp: "1.49×", "2-bit": { "decode-heavy": [38.4, 34.8, 37.2, 45.5], "prefill-heavy": [64.1, 61.3, 61.0, 76.6] },
      "3-bit": { "decode-heavy": [61.5, 55.4, 59.9, 61.7], "prefill-heavy": [79.8, 76.3, 77.2, 80.4] } },
    "Gemma 3": { sp: "1.67×", "2-bit": { "decode-heavy": [33.7, 30.8, 32.6, 38.2], "prefill-heavy": [52.4, 50.8, 49.8, 61.3] },
      "3-bit": { "decode-heavy": [51.6, 46.7, 50.4, 51.9], "prefill-heavy": [64.1, 61.4, 62.1, 65.7] } },
  };
  D["full-res"] = (fig, k) => {
    const bits = k.toggle({ label: "decode", options: ["2-bit", "3-bit"], value: "2-bit" });
    const wk = k.toggle({ label: "tests", options: ["decode-heavy", "prefill-heavy"], value: "decode-heavy" });
    const fam = { value: "Qwen 3" };                                 // the steps discuss Qwen 3 only
    k.follow(bits, { 1: "2-bit", 5: "3-bit" });
    k.follow(wk, { 1: "decode-heavy", 4: "prefill-heavy", 5: "decode-heavy" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const F = T1F[fam.value], v = F[bits.value][wk.value];
      const names = ["weight-only · 1.00×", `① autocast · ${F.sp}`, `② split format · ${F.sp}`, `③ split weights · ${F.sp}`];
      const n = s === 1 ? 1 : s === 2 ? 3 : 4;
      c.bars({ x: 0, y: 14, w: 630, rowH: 70, labelW: 200, tones: ["paper"], max: 90, fmt: (x) => x.toFixed(1),
        rows: names.slice(0, n).map((l, i) => ({ label: l, values: [v[i]], hl: i === n - 1 })) });
      c.text(320, 336, `${fam.value} · ${bits.value} decode · ${wk.value} accuracy (Table 1)`, { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  // Table 5: [weight-only, + prefiller]
  const T5 = {
    "MMLU-Pro": [["IQ1_S", 29.04, 61.54], ["IQ1_M", 52.88, 72.59], ["IQ2_XXS", 70.50, 77.93], ["IQ2_S", 77.96, 80.76],
      ["Q2_K_XL", 82.16, 82.35], ["IQ3_XXS", 82.11, 82.84], ["IQ3_S", 83.65, 83.02], ["Q3_K_XL", 84.25, 83.64], ["BF16", 84.62, NaN]],
    "MMMU-Pro": [["IQ1_S", 24.39, 59.65], ["IQ1_M", 44.86, 62.49], ["IQ2_XXS", 59.60, 65.90], ["IQ2_S", 68.50, 69.36],
      ["Q2_K_XL", 72.31, 71.68], ["IQ3_XXS", 73.41, 71.45], ["IQ3_S", 74.74, 71.97], ["Q3_K_XL", 74.28, 72.31], ["BF16", 75.26, NaN]],
  };
  D["rescue"] = (fig, k) => {
    const bm = k.toggle({ label: "benchmark", options: ["MMLU-Pro", "MMMU-Pro"], value: "MMLU-Pro" });
    k.follow(bm, { 1: "MMLU-Pro", 3: "MMMU-Pro", 4: "MMLU-Pro" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.chips({ x: 200, y: 2, size: 12, items: [{ t: "GGUF alone", tone: "muted" }, { t: "+ trained prefiller", tone: "predict" }] });
      const shown = (i) => (s === 2 || s === 3 ? i === 0 : s === 4 ? i <= 3 : s >= 5 ? i <= 7 : false);
      c.bars({ x: 0, y: 34, w: 630, rowH: 35, labelW: 90, tones: ["muted", "predict"], max: 90, fmt: (v) => v.toFixed(2),
        rows: T5[bm.value].map(([n, a, b], i) => ({ label: n, values: [a, shown(i) ? b : NaN] })) });
    };
  };

  // Table 5 (weight-only) and Table 7 (RTN, own QADD prefiller); IQ1_S also with the IQ1_M prefiller
  const T7 = {
    "MMLU-Pro": { IQ1_S: [29.04, 48.39, 61.54, 65.02], IQ1_M: [52.88, 68.37, 72.59], IQ2_XXS: [70.50, 76.06, 77.93] },
    "MMMU-Pro": { IQ1_S: [24.39, 30.29, 59.65, 52.60], IQ1_M: [44.86, 52.83, 62.49], IQ2_XXS: [59.60, 66.18, 65.90] },
  };
  D["rtn"] = (fig, k) => {
    const dc = k.toggle({ label: "decoder", options: ["IQ1_S", "IQ1_M", "IQ2_XXS"], value: "IQ1_S" });
    const bm = k.toggle({ label: "benchmark", options: ["MMLU-Pro", "MMMU-Pro"], value: "MMLU-Pro" });
    k.follow(dc, { 1: "IQ1_S" });
    k.follow(bm, { 1: "MMLU-Pro", 4: "MMMU-Pro", 5: "MMLU-Pro" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const v = T7[bm.value][dc.value];
      const rows = [{ label: "GGUF alone", values: [v[0]] }];
      if (s >= 2) rows.push({ label: "+ RTN 4-bit copy", values: [v[1]] });
      if (s >= 3) rows.push({ label: `+ QADD prefiller (${sgn(v[2] - v[1])}${Math.abs(v[2] - v[1]).toFixed(2)})`, values: [v[2]], hl: true });
      if (s >= 5 && v[3] != null) rows.push({ label: "+ IQ1_M’s prefiller", values: [v[3]] });
      c.bars({ x: 0, y: 20, w: 630, rowH: 66, labelW: 220, tones: ["predict"], max: 90, fmt: (x) => x.toFixed(2), rows });
      if (s === 1) c.box({ x: 120, y: 120, w: 400, h: 70, label: "RTN: round the full model to NVFP4", sub: "no training", tone: "muted" });
      c.text(320, 340, `${dc.value} decoder · ${bm.value} (Tables 5, 7)`, { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  D["speed"] = (fig, k) => {
    const vw = k.toggle({ label: "view", options: ["27B first token", "8B prefill stack"], value: "27B first token" });
    k.follow(vw, { 1: "27B first token", 4: "8B prefill stack" });
    const c = k.canvas(W, H);
    // Table 10, S = 16384: [NVFP4 resident, +ODP] speedup over BF16
    const T10 = [["Qwen3-0.6B", 1.13, 1.12], ["Qwen3-1.7B", 1.24, 1.19], ["Qwen3-4B", 1.37, 1.34], ["Qwen3-8B", 1.49, 1.47]];
    return (s) => {
      c.clear();
      if (vw.value === "27B first token") {
        c.bars({ x: 0, y: 20, w: 630, rowH: 64, labelW: 200, tones: ["muted"], max: 14, fmt: (v) => `${v.toFixed(2)} s`,  // §3.2, 8K prompt
          rows: [{ label: "IQ1_S alone", values: [12.27] }, { label: "+ streamed prefiller", values: [6.90], hl: true }] });
        if (s >= 2) c.box({ x: 16, y: 170, w: 608, h: 48, label: "4K–32K prompts: 1.38× to 1.78× faster", tone: "code", size: 14 });   // §3.2
        if (s >= 3) c.box({ x: 16, y: 234, w: 608, h: 48, label: "below 4K: slower than weight-only (SSD loading)", tone: "bad", size: 14 }); // §3.2, Fig. 1
        c.text(320, 330, "Qwen3.8-27B, 8K-token prompt, llama.cpp (§3.2)", { anchor: "middle", size: 12, tone: "muted" });
      } else {
        c.chips({ x: 190, y: 6, size: 12, items: [{ t: "NVFP4 resident", tone: "paper" }, { t: "streamed (ODP)", tone: "predict" }] });
        const rows = (s >= 5 ? T10 : T10.slice(3)).map(([n, a, b]) => ({ label: n, values: [a, b] }));
        c.bars({ x: 0, y: 44, w: 630, rowH: 66, labelW: 120, tones: ["paper", "predict"], max: 1.7, fmt: (v) => `${v.toFixed(2)}×`, rows });
        c.text(320, 340, "prefill speedup over BF16 at 16K; Qwen3-8B BF16 = 3,801 ms (Table 10)", { anchor: "middle", size: 12, tone: "muted", maxW: 600, lines: 1 });
      }
    };
  };

  // Table 2: Δ of format disaggregation; true = significant (bold in the paper)
  const T2 = {
    "MMLU-Pro": [["Qwen3.8-27B", 0.35, true], ["Gemma-4-31B", 0.10, false], ["Muse-Glimmer-30B", 0.92, true], ["Gemma-4-26B", 0.78, true],
      ["Nemotron-3-120B", 0.02, false], ["Nemotron-3-550B", -0.14, false], ["Qwen3.8-2.4T", 0.40, true], ["Kimi-K3-2.8T", -0.21, false]],
    "MMMU-Pro": [["Qwen3.8-27B", 0.62, false], ["Gemma-4-31B", 1.13, true], ["Muse-Glimmer-30B", 0.97, true], ["Gemma-4-26B", 0.64, false], ["Kimi-K3-2.8T", 0.53, false]],
  };
  D["ptq"] = (fig, k) => {
    const bm = k.toggle({ label: "benchmark", options: ["MMLU-Pro", "MMMU-Pro"], value: "MMLU-Pro" });
    k.follow(bm, { 1: "MMLU-Pro", 4: "MMMU-Pro" });
    const c = k.canvas(W, H);
    const Z = 330, SC = 200;
    return (s) => {
      c.clear();
      const rows = T2[bm.value];
      c.line(Z, 8, Z, 8 + rows.length * 34, { tone: "muted" });
      rows.forEach(([n, d, sig], i) => {
        const y = 10 + i * 34, tone = s >= 3 && sig ? "code" : "muted";
        c.text(160, y + 19, n, { anchor: "end", size: 12, inBox: true });
        const x = d >= 0 ? Z : Z + d * SC;
        c.add(k.h("rect", { x, y: y + 6, width: Math.max(2, Math.abs(d) * SC), height: 20, rx: 3, class: `f-${tone}` }));
        c.text(d >= 0 ? Z + d * SC + 6 : Z + 6, y + 21, `${sgn(d)}${Math.abs(d).toFixed(2)}`, { size: 12, mono: true, tone, inBox: true });
      });
      if (s >= 2) c.box({ x: 16, y: 290, w: 290, h: 40, label: "11 of 13 pairs improve", tone: "code", size: 14 });
      if (s >= 3) c.box({ x: 324, y: 290, w: 300, h: 40, label: "6 significant · 0 worse", tone: "code", size: 14, solid: false });
      if (s >= 5) c.text(320, 350, "chance alone: 13 × 0.05 = 0.65 false hits (our arithmetic)", { anchor: "middle", size: 12, tone: "take", weight: 600 });
    };
  };

  // =========================================================== YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["multi-turn caches", "untested (§5)", "bad"],
      ["error bars", "one run, 5 checkpoints", "predict"],
      ["batch size", "one only (§5)", "predict"],
      ["+32.50 at IQ1_S", "19.35 precision + 13.15 training", "predict"],
      ["answer length", "truncation 1.25% → 3.39%", "predict"],
      ["steelman", "+10.7 and +32.5 are big", "code"]];
    return (s) => { c.clear(); board(c, R, s); };
  };

  D["verdict"] = (fig, k) => {
    const TS = [1024, 2048, 4096, 8192, 16384, 32768];
    const t = k.slider({ label: "your prompts", min: 0, max: 5, value: 3, fmt: (i) => `${kfmt(TS[i])} tokens` });
    k.follow(t, { 3: 3 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const rows = [{ label: "IQ1_S alone", values: [29.04] }, { label: "IQ1_S + prefiller", values: [61.54], hl: s === 1 }];   // Table 5
      if (s >= 2) rows.push({ label: "IQ2_XXS alone", values: [70.50], hl: s === 2 }, { label: "IQ2_XXS + prefiller", values: [77.93] });
      c.bars({ x: 0, y: 8, w: 630, rowH: 40, labelW: 170, tones: ["predict"], max: 90, fmt: (v) => v.toFixed(2), rows });
      if (s >= 3) {
        const T = TS[t.value];
        const msg = T < 4096 ? ["under 4K: slower first token (§3.2)", "bad"] : T === 8192 ? ["8K: first token 1.78× faster (§3.2)", "code"]
          : ["4K–32K: 1.38×–1.78× faster first token (§3.2)", "code"];
        c.box({ x: 16, y: 180, w: 608, h: 40, label: msg[0], tone: msg[1], size: 14 });
      }
      if (s >= 4) c.box({ x: 16, y: 230, w: 608, h: 40, label: "needs native NVFP4 math (measured on DGX Spark)", tone: "predict", size: 14 });
      if (s >= 5) c.box({ x: 16, y: 284, w: 608, h: 48, label: "our verdict: start at 2 bits, add the prefiller for long prompts", tone: "take", hl: true, size: 14 });
    };
  };

  D["release"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["code + llama.cpp fork", "released (§5)", "code"],
      ["27B prefillers", "on the Hub, one per decoder", "code"],
      ["core QADD runs", "8–32 B300 GPUs (Table 4)", "predict"],
      ["one 27B prefiller", "64 B300 GPUs (Table 4)", "bad"],
      ["LUT prefill speed", "proxy: NVFP4 timings (App. B.3)", "predict"]];
    return (s) => { c.clear(); board(c, R, s, 10, 68); };
  };

  D["ideas"] = (fig, k) => {
    const c = k.canvas(W, H);
    // positions are our guesses: [effort 0-5, payoff 0-5]
    const I = [["multi-turn caches", 3, 4.4], ["batched decode", 3.8, 3.4], ["streamed encoders", 3.4, 2.6], ["split Whisper", 4.4, 3.9], ["RTN prefiller", 1, 3]];
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
