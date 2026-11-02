/* Drawings for the Unified Training lesson (arXiv:2610.40564v1).
   One entry per data-draw name; each is redrawn on every step and control change.
   Numbers from the paper carry a // Table N, Fig. N or App. X comment.
   The four-answer toy model (✓1 0.15, ✓2 0.10, ✗a 0.45, ✗b 0.30) is ours and is
   computed exactly here; values marked ≈ are read off the paper's figures by us. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ------------------------------------------------------------- helpers
  const f2 = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(2);
  const f3 = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(3);
  const pct = (v) => v.toFixed(2) + "%";
  const sm = (z) => { const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };

  // toy model: four answers, the first two correct
  const TOY = [0.15, 0.10, 0.45, 0.30], HARD = [0.012, 0.008, 0.58, 0.40], RW = [1, 1, 0, 0];
  const NAMES = ["✓1", "✓2", "✗a", "✗b"];
  // exact training on the logits; mode "rf" (REINFORCE) or "max" (MaxRL); learning rate 1
  const train = (P0, mode, steps = 60) => {
    let z = P0.map(Math.log); const ys = [];
    for (let t = 0; t <= steps; t++) {
      const pi = sm(z), p = pi[0] + pi[1]; ys.push(p);
      const g = pi.map((v, i) => v * RW[i] - p * v);
      z = z.map((v, i) => v + (mode === "max" ? g[i] / p : g[i]));
    }
    return { x: ys.map((_, i) => i), y: ys };
  };
  const CURVE = { rf: train(TOY, "rf"), max: train(TOY, "max"), rfH: train(HARD, "rf"), maxH: train(HARD, "max") };

  // checklist board: rows [question, answer, tone]; row i appears on step i + 1
  const board = (c, rows, s, top = 6, rowH = 68, split = 300) => {
    c.clear();
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rowH, now = s === i + 1;
      c.box({ x: 10, y, w: 620, h: rowH - 10, tone: "muted", hl: now });
      c.text(24, y + (rowH - 10) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: split - 28, lines: 2, valign: "middle", inBox: true });
      c.box({ x: split + 10, y: y + 7, w: 616 - split - 10, h: rowH - 24, label: a, size: 13, tone, hl: now });
    });
  };
  // horizontal bars from rows [label, value(s), hl, dim]
  const tbars = (c, rows, o = {}) => c.bars({ x: o.x ?? 10, y: o.y ?? 24, w: o.w ?? 620, rowH: o.rowH ?? Math.min(40, (o.h ?? 320) / rows.length),
    labelW: o.labelW ?? 150, max: o.max, fmt: o.fmt || ((v) => String(v)), tones: o.tones || [o.tone || "paper"],
    rows: rows.map(([label, v, hl, dim]) => ({ label, values: Array.isArray(v) ? v : [v], hl, dim })) });
  const title = (c, str, tone = "muted", y = 16) => c.text(630, y, str, { size: 13, anchor: "end", weight: 700, tone });
  const rect = (c, k, x, y, w, h, tone, soft = "") => c.add(k.h("rect", { x, y, width: Math.max(0.5, w), height: Math.max(0.5, h), rx: 3, class: `f-${tone}${soft ? " " + soft : ""}` }));
  // diverging bars around a zero line: rows [label, value, hl]
  const dbars = (c, k, rows, o = {}) => {
    const x0 = o.x ?? 10, y0 = o.y ?? 30, lw = o.labelW ?? 150, w = o.w ?? 620, rh = o.rowH ?? 34, max = o.max;
    const zx = x0 + lw + (w - lw) / 2, half = (w - lw) / 2 - 60, fmt = o.fmt || f3;
    c.line(zx, y0 - 6, zx, y0 + rows.length * rh, { tone: "muted", width: 1 });
    rows.forEach(([lab, v, hl, dim], i) => {
      const y = y0 + i * rh, bw = (Math.abs(v) / max) * half, tone = v < 0 === !!o.negGood ? "code" : "bad";
      c.text(x0 + lw - 8, y + rh / 2 + 4, lab, { anchor: "end", size: 12, weight: hl ? 700 : 400, dim, maxW: lw - 12, lines: 1, inBox: true });
      c.add(k.h("rect", { x: v < 0 ? zx - bw : zx, y: y + 5, width: Math.max(1, bw), height: rh - 12, rx: 2, class: `f-${o.tone || tone}${dim ? " rdx-dim" : ""}${hl ? " rdx-hl" : ""}` }));
      c.text(v < 0 ? zx - bw - 5 : zx + bw + 5, y + rh / 2 + 4, fmt(v), { anchor: v < 0 ? "end" : "start", size: 11, mono: true, dim, inBox: true });
    });
    c.occupy({ x: x0, y: y0 - 6, w, h: rows.length * rh + 6, kind: "box" });
  };

  // ======================================================= LLM TOOLBOX
  D["next-token"] = (fig, k) => {
    const sl = k.slider({ label: "P(“38”)", min: 0.05, max: 0.99, step: 0.01, value: 0.40, fmt: (v) => v.toFixed(2) });
    k.follow(sl, { 1: 0.40, 4: 0.90 });
    const c = k.canvas(W, H);
    const TOK = ["Hugo", "=", "38", ",", "Maya", "=", "6", ",", "…"];
    return (s) => {
      c.clear();
      const P = [0.62, 0.97, sl.value, 0.93, 0.71, 0.98, 0.55, 0.95];
      c.box({ x: 10, y: 8, w: 620, h: 44, label: "prompt x: Hugo, Maya, Ethan, Zoe, Ella and Mia live on … Answer:", size: 13, tone: "muted" });
      const n = s === 1 ? 1 : TOK.length;
      const ch = c.chips({ x: 20, y: 196, items: TOK.slice(0, n).map((t, i) => ({ t, tone: i === 2 ? "predict" : "paper", hl: (s === 1 && i === 0) || (s === 4 && i === 2) })), size: 15, gap: 10 });
      ch.forEach((r, i) => {
        if (i >= P.length) return;
        const bh = P[i] * 100;
        c.add(k.h("rect", { x: r.x + 4, y: 188 - bh, width: r.w - 8, height: bh, rx: 2, class: `f-${i === 2 ? "predict" : "paper"} soft` }));
        c.text(r.x + r.w / 2, 182 - bh, P[i].toFixed(2), { size: 11, anchor: "middle", mono: true, tone: i === 2 ? "predict" : "muted" });
      });
      if (s === 1) c.label(200, 150, "probability of each possible next token", { size: 13, tone: "paper" });
      if (s >= 3) {
        const prod = P.reduce((a, b) => a * b, 1);
        c.text(20, 262, `π(y|x) = 0.62 × 0.97 × ${sl.value.toFixed(2)} × … = ${prod.toFixed(4)}`, { size: 14, mono: true, weight: s === 3 ? 700 : 400, tone: s === 3 ? "predict" : "ink" });
      }
      if (s >= 4) {
        const lg = P.reduce((a, b) => a + Math.log(b), 0);
        c.text(20, 292, `log π(y|x) = Σ log p = ${f2(lg)}   (log "38" = ${f2(Math.log(sl.value))})`, { size: 14, mono: true, weight: s === 4 ? 700 : 400, tone: s === 4 ? "predict" : "ink" });
      }
      if (s >= 5) c.box({ x: 10, y: 310, w: 620, h: 42, label: "3 samples: Hugo=38, … | Hugo=31, … | Hugo=13, …", size: 13, tone: "take", hl: true, mono: true });
    };
  };

  D["mle"] = (fig, k) => {
    const sl = k.slider({ label: "p(correct token)", min: 0.01, max: 0.99, step: 0.01, value: 0.05, fmt: (v) => v.toFixed(2) });
    k.follow(sl, { 1: 0.05, 3: 0.05 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = sl.value;
      // left: the token distribution
      const others = [0.5, 0.3, 0.2].map((v) => v * (1 - p));
      const vals = s >= 5 ? null : [p, ...others];
      if (vals) {
        ["“38”", "“31”", "“13”", "“6”"].forEach((t, i) => {
          const x = 24 + i * 62, bh = vals[i] * 200;
          c.add(k.h("rect", { x, y: 290 - bh, width: 44, height: bh, rx: 3, class: `f-${i === 0 ? "code" : "muted"} soft` }));
          c.text(x + 22, 312, t, { size: 13, anchor: "middle", mono: true });
          c.text(x + 22, 284 - bh, vals[i].toFixed(2), { size: 11, anchor: "middle", mono: true, tone: "muted" });
        });
        c.text(12, 30, s === 1 ? "data says the next token is “38”" : "model's next-token probabilities", { size: 13, tone: s === 1 ? "code" : "muted", weight: 700 });
        if (s === 4) c.arrow(46, 280 - p * 200, 46, 280 - Math.min(0.98, p + 0.35) * 200 - 10, { tone: "code", width: 2.4 });
      } else {
        const mu = [0.5, 0.25, 0.15, 0.1], pm = [0.2, 0.35, 0.3, 0.15];
        ["a", "b", "c", "d"].forEach((t, i) => {
          const x = 20 + i * 64;
          c.add(k.h("rect", { x, y: 290 - mu[i] * 300, width: 26, height: mu[i] * 300, rx: 2, class: "f-paper soft" }));
          c.add(k.h("rect", { x: x + 28, y: 290 - pm[i] * 300, width: 26, height: pm[i] * 300, rx: 2, class: "f-take soft" }));
          c.text(x + 27, 312, t, { size: 13, anchor: "middle", mono: true });
        });
        c.text(12, 30, "blue: data μ   violet: model π", { size: 13, weight: 700 });
        c.text(12, 340, "averaged over data, π is pulled toward μ", { size: 13, tone: "take" });
      }
      // right: the loss curve
      const xs = [], ys = [];
      for (let i = 1; i <= 99; i++) { xs.push(i / 100); ys.push(-Math.log(i / 100)); }
      const pl = c.plot({ x: 290, y: 10, w: 350, h: 340, xmin: 0, xmax: 1, ymin: 0, ymax: 5, series: s >= 2 ? [{ x: xs, y: ys, tone: "bad" }] : [],
        xlabel: "probability of the correct token", ylabel: "loss −ln p (nats)", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
      if (s >= 3) {
        c.dot(pl.X(p), pl.Y(-Math.log(p)), { r: 6, tone: "predict" });
        c.label(pl.X(p) + 60, pl.Y(-Math.log(p)) - 4, `−ln ${p.toFixed(2)} = ${(-Math.log(p)).toFixed(2)}`, { size: 13, mono: true, tone: "predict", weight: 700 });
      }
      if (s === 4) c.arrow(pl.X(p) + 8, pl.Y(-Math.log(p)) + 14, pl.X(Math.min(0.95, p + 0.35)), pl.Y(-Math.log(Math.min(0.95, p + 0.35))) - 4, { tone: "code", width: 2 });
    };
  };

  D["same-loss"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ROWS = [
      ["Pretraining", "web text", [["The", 1], ["tower", 1], ["has", 1], ["40", 1], ["floors", 1], [".", 1]]],
      ["Midtraining", "puzzle traces", [["Zoe", 1], ["−", 1], ["Ella", 1], ["=", 1], ["3", 1], ["→", 1], ["31", 1]]],
      ["SFT", "prompt + answer", [["Who", 0], ["lives", 0], ["where?", 0], ["Hugo", 1], ["=", 1], ["38", 1]]],
    ];
    return (s) => {
      c.clear();
      ROWS.forEach(([name, sub, toks], i) => {
        if (s < i + 1) return;
        const y = 14 + i * 92, now = s === i + 1;
        c.box({ x: 10, y, w: 150, h: 48, label: name, sub, tone: i === 2 ? "take" : "paper", hl: now });
        const ch = c.chips({ x: 180, y: y + 10, items: toks.map(([t, w]) => ({ t, tone: w ? "paper" : "muted", dashed: !w, hl: now && !w })), size: 14, gap: 8 });
        ch.forEach((r, j) => c.text(r.x + r.w / 2, r.y + r.h + 18, `w=${toks[j][1]}`, { size: 12, anchor: "middle", mono: true, tone: toks[j][1] ? "code" : "bad" }));
      });
      if (s >= 4) c.box({ x: 10, y: 296, w: 620, h: 52, label: "one loss for all three:  −Σ w · log π(token | earlier tokens)", size: 15, tone: "code", hl: true, mono: true });
    };
  };

  D["stages"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const B = [["Pretraining", 10, 280, "paper"], ["Midtraining", 296, 112, "paper"], ["SFT", 414, 92, "take"], ["RL", 512, 118, "predict"]];
      const bx = B.map(([l, x, w, t]) => c.box({ x, y: 50, w, h: 60, label: l, tone: t, hl: s === 1 }));
      c.text(10, 30, "time →", { size: 12, tone: "muted" });
      if (s >= 2) {
        c.box({ x: 10, y: 130, w: 496, h: 40, label: "likelihood loss (static data)", size: 13, tone: "code", hl: s === 2 });
        c.box({ x: 512, y: 130, w: 118, h: 40, label: "policy gradient", size: 12, tone: "bad", hl: s === 2 });
      }
      if (s >= 3) B.slice(0, 3).forEach(([, x, w]) => c.box({ x: x + w / 2 - 40, y: 186, w: 80, h: 28, label: "own score", size: 11, tone: "muted", hl: s === 3 }));
      if (s >= 4) {
        c.path(`M${571},${46} C${571},${10} ${352},${10} ${352},${46}`, { tone: "bad", dash: true, arrow: true, width: 2 });
        c.label(462, 22, "choices interact", { size: 12, tone: "bad", weight: 700 });
      }
      if (s >= 5) {
        c.text(10, 252, "LLM-based TTS:", { size: 13, weight: 700, tone: "bridge" });
        const t1 = c.box({ x: 10, y: 264, w: 280, h: 46, label: "speech-token pretraining", size: 13, tone: "bridge", hl: true });
        const t2 = c.box({ x: 310, y: 264, w: 180, h: 46, label: "voice / language SFT", size: 13, tone: "bridge", hl: true });
        const t3 = c.box({ x: 510, y: 264, w: 120, h: 46, label: "RL (maybe)", size: 13, tone: "bridge", hl: true, dashed: true });
        c.connect(t1, t2, { tone: "bridge" }); c.connect(t2, t3, { tone: "bridge" });
      }
    };
  };

  D["forgetting"] = (fig, k) => {
    const tg = k.toggle({ label: "show", options: ["held-out loss", "benchmark mean"], value: "held-out loss" });
    k.follow(tg, { 1: "held-out loss", 3: "benchmark mean", 4: "held-out loss" });
    const c = k.canvas(W, H);
    // Table 11: [label, mean loss, mean benchmark]
    const R = [["pretraining only", 2.537, 42.37], ["staged 1 ep, 2e-4", 12.150, 35.00], ["staged 2 ep, 2e-4", 12.356, 35.05], ["staged 4 ep, 2e-4", 15.104, 35.61],
      ["staged 1 ep, 5e-5", 4.135, 38.49], ["staged 2 ep, 5e-5", 5.305, 37.00], ["staged 4 ep, 5e-5", 7.054, 36.42]];
    return (s) => {
      c.clear();
      const loss = tg.value === "held-out loss";
      const hlRow = { 1: 0, 2: 2, 3: 2, 4: 4 }[s];
      title(c, loss ? "held-out web loss, nats (lower = remembers)" : "mean of 5 benchmarks, % (higher = better)", "muted");
      tbars(c, R.map(([l, a, b], i) => [l, loss ? a : b, s === 5 ? i > 0 : i === hlRow, s === 1 ? i > 0 : false]), { y: 34, h: 300, labelW: 170, max: loss ? 16 : 45, fmt: (v) => (loss ? v.toFixed(3) : v.toFixed(2)), tone: loss ? "bad" : "paper" });
    };
  };

  // ======================================================= RL TOOLBOX
  D["rl-loop"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const pr = c.box({ x: 10, y: 40, w: 170, h: 60, label: "prompt x", sub: "a tower puzzle", tone: "muted" });
      const po = c.box({ x: 235, y: 40, w: 170, h: 60, label: "policy π_θ", sub: "the LLM", tone: "take", hl: s === 1 });
      c.connect(pr, po);
      if (s >= 2) { const an = c.box({ x: 460, y: 40, w: 170, h: 60, label: "answer y", sub: "sampled", tone: "paper", hl: s === 2 }); c.connect(po, an, { tone: "take", label: "sample" });
        if (s >= 3) { const ck = c.box({ x: 460, y: 170, w: 170, h: 60, label: "checker", sub: "correct?", tone: "code", hl: s === 3 }); c.connect(an, ck);
          const rw = c.box({ x: 235, y: 170, w: 170, h: 60, label: "reward r = 1 or 0", size: 14, tone: "code", hl: s === 3 }); c.connect(ck, rw, { tone: "code" });
          if (s >= 4) c.connect(rw, po, { tone: "predict", label: "update θ", width: 2.4 }); } }
      if (s >= 5) c.box({ x: 10, y: 272, w: 620, h: 60, label: "no answer key needed, only a way to check", size: 15, tone: "predict", hl: true });
    };
  };

  D["reward"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ans = [["… Hugo=38, Maya=6, … (exact)", 1], ["… Hugo=31, Maya=6, … (one wrong)", 0], ["… 1,280 tokens, never ends", 0]];
      const n = s >= 2 ? 3 : 2;
      const ck = c.box({ x: 360, y: 110, w: 130, h: 90, label: s <= 2 ? "puzzle grader" : s === 3 ? "math checker" : "unit tests", sub: s <= 2 ? "App. C.4" : s === 3 ? "veRL, App. D.1" : "App. D.7", tone: "code", hl: s >= 3 && s <= 4 });
      ans.slice(0, n).forEach(([t, r], i) => {
        const y = 30 + i * 100;
        const a = c.box({ x: 10, y, w: 300, h: 56, label: t, size: 13, tone: i === 2 ? "bad" : "paper", hl: s === 2 && i === 2, mono: true });
        c.connect(a, ck, { tone: "muted" });
        c.box({ x: 540, y: y + 8, w: 90, h: 40, label: `r = ${r}`, tone: r ? "code" : "bad", mono: true, hl: s <= 2 });
      });
      if (s >= 5) c.box({ x: 10, y: 316, w: 620, h: 38, label: "verifiable: a program decides, not a learned judge", size: 14, tone: "predict", hl: true });
    };
  };

  D["pass-rate"] = (fig, k) => {
    const z1 = k.slider({ label: "✓1 logit", min: -4, max: 2, step: 0.05, value: Math.log(0.15), fmt: (v) => v.toFixed(2) });
    k.follow(z1, { 1: Math.log(0.15), 4: -0.2 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const z = [z1.value, Math.log(0.10), Math.log(0.45), Math.log(0.30)], pi = sm(z), p = pi[0] + pi[1];
      pi.forEach((v, i) => {
        const x = 30 + i * 100, bh = v * 300, ok = i < 2;
        c.add(k.h("rect", { x, y: 250 - bh, width: 70, height: bh, rx: 3, class: `f-${ok && s >= 2 ? "code" : "muted"} soft` }));
        c.text(x + 35, 244 - bh, v.toFixed(2), { size: 13, anchor: "middle", mono: true });
        c.text(x + 35, 272, NAMES[i], { size: 15, anchor: "middle", weight: 700, tone: ok ? "code" : "bad" });
        if (s >= 4) c.text(x + 35, 298, `z=${f2(z[i])}`, { size: 12, anchor: "middle", mono: true, tone: i === 0 ? "predict" : "muted" });
      });
      if (s >= 2) c.box({ x: 440, y: 30, w: 190, h: 60, label: `p = ${p.toFixed(2)}`, sub: "π(✓1) + π(✓2)", tone: "code", hl: s === 2 || s === 4, mono: true });
      if (s >= 3) c.box({ x: 440, y: 120, w: 190, h: 60, label: "J(θ) = mean p", sub: "over all prompts", tone: "paper", hl: s === 3 });
      if (s >= 4) c.text(30, 330, "π = softmax(z)", { size: 14, mono: true, tone: "predict", weight: 700 });
    };
  };

  D["no-backprop"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const th = c.box({ x: 10, y: 60, w: 90, h: 56, label: "θ", tone: "take", size: 18 });
      const md = c.box({ x: 130, y: 60, w: 110, h: 56, label: "model π_θ", tone: "take" });
      const sa = c.box({ x: 270, y: 60, w: 110, h: 56, label: "sample", sub: "dice roll", tone: "paper", hl: s === 2 });
      const ck = c.box({ x: 410, y: 60, w: 110, h: 56, label: "checker", tone: "code", hl: s === 1 });
      const r = c.box({ x: 550, y: 60, w: 80, h: 56, label: "r", tone: "code", size: 18 });
      c.connect(th, md); c.connect(md, sa); c.connect(sa, ck); c.connect(ck, r);
      if (s >= 1) c.box({ x: 410, y: 140, w: 110, h: 36, label: "✗ no gradient", size: 13, tone: "bad", hl: s === 1 });
      if (s >= 2) c.box({ x: 270, y: 140, w: 110, h: 36, label: "✗ discrete", size: 13, tone: "bad", hl: s === 2 });
      if (s >= 3) { const p = c.box({ x: 130, y: 230, w: 260, h: 60, label: "p(θ) = Σ π_θ(✓ answers)", size: 14, tone: "code", hl: s === 3, mono: true }); c.connect(md, p, { tone: "code", label: "smooth" });
        if (s >= 4) c.connect(p, th, { tone: "predict", label: "∇p", route: "elbow", width: 2.4 }); }
    };
  };

  D["score-trick"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = ["J = Σ_y π(y) · r(y)", "∇π = π · ∇log π", "∇J = Σ_y π(y) r(y) ∇log π(y) = E[ r ∇log π ]", "≈ (1/N) Σ_i r_i ∇log π(y_i)"];
    return (s) => {
      c.clear();
      L.forEach((t, i) => { if (s >= i + 1 && !(s === 5 && i < 2)) c.text(14, 34 + i * 40 - (s === 5 ? 80 : 0), t, { size: 16, mono: true, weight: s === i + 1 ? 700 : 400, tone: s === i + 1 ? "predict" : "ink" }); });
      if (s >= 5) {
        const pi = TOY, p = 0.25, g = pi.map((v, i) => v * RW[i] - p * v); // exact ∇J on the logits
        const y0 = 250;
        c.line(20, y0, 620, y0, { tone: "muted", width: 1 });
        g.forEach((v, i) => {
          const x = 60 + i * 140, bh = v * 700;
          c.add(k.h("rect", { x, y: v > 0 ? y0 - bh : y0, width: 80, height: Math.abs(bh), rx: 3, class: `f-${v > 0 ? "code" : "bad"} soft` }));
          c.text(x + 40, v > 0 ? y0 - bh - 6 : y0 - bh + 16, f3(v), { size: 13, anchor: "middle", mono: true });
          c.text(x + 40, v > 0 ? y0 + 18 : y0 - 8, NAMES[i], { size: 13, anchor: "middle", weight: 700, tone: i < 2 ? "code" : "bad" });
        });
        c.text(14, 150, "exact ∇J on the toy's 4 logits (p = 0.25)", { size: 13, tone: "muted", weight: 700 });
      }
    };
  };

  const sixteen = (c, s, opts) => { // 4 correct of 16 in a 4×4 grid
    const OK = [0, 5, 9, 14];
    for (let i = 0; i < 16; i++) {
      const col = i % 4, row = Math.floor(i / 4), ok = OK.includes(i);
      const lab = opts.weight ? `${ok ? "✓" : "✗"} ${opts.weight(ok)}` : ok ? "✓" : "✗";
      c.box({ x: opts.x + col * 64, y: opts.y + row * 50, w: 56, h: 40, label: lab, size: 13, tone: ok ? "code" : "bad", hl: opts.hl && ok, dim: opts.dimWrong && !ok, mono: true });
    }
  };

  D["reinforce"] = (fig, k) => {
    const tg = k.toggle({ label: "prompt", options: ["easy (p=0.25)", "hard (p=0.02)"], value: "easy (p=0.25)" });
    k.follow(tg, { 1: "easy (p=0.25)", 5: "hard (p=0.02)" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      sixteen(c, s, { x: 10, y: 20, weight: s >= 2 ? (ok) => (ok ? "1" : "0") : null, hl: s === 2 || s === 3, dimWrong: s >= 3 });
      c.text(10, 232, "16 samples, 4 correct", { size: 13, tone: "muted" });
      if (s >= 3) c.box({ x: 10, y: 250, w: 250, h: 56, label: "= SFT on the 4 ✓ answers", size: 14, tone: "code", hl: s === 3 });
      if (s >= 4) {
        const hard = tg.value.startsWith("hard"), cv = hard ? CURVE.rfH : CURVE.rf;
        const pl = c.plot({ x: 280, y: 10, w: 360, h: 340, xmin: 0, xmax: 60, ymin: 0, ymax: 1, series: [{ ...cv, tone: hard ? "bad" : "code", label: hard ? "hard prompt" : "easy prompt", labelAt: hard ? 52 : 20 }],
          xlabel: "gradient steps", ylabel: "pass rate p", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
        if (hard) c.label(pl.X(25), pl.Y(0.18), `step 40: p = ${cv.y[40].toFixed(2)}`, { size: 13, tone: "bad", weight: 700, mono: true });
      }
    };
  };

  D["baseline"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const OK = [0, 5, 9, 14], b = s >= 2;
      for (let i = 0; i < 16; i++) {
        const ok = OK.includes(i), w = b ? (ok ? 0.75 : -0.25) : ok ? 1 : 0;
        c.box({ x: 10 + i * 38.5, y: 16, w: 34, h: 34, label: ok ? "✓" : "✗", size: 13, tone: ok ? "code" : "bad", hl: s <= 2 && (ok || b) });
        c.text(27 + i * 38.5, 70, (w < 0 ? "−" : "") + Math.abs(w).toString().replace(/^0\./, "."), { size: 11, anchor: "middle", mono: true, tone: w > 0 ? "code" : w < 0 ? "bad" : "muted" });
      }
      c.text(10, 96, b ? "weights r − p̂  (p̂ = 0.25)" : "weights r", { size: 13, weight: 700, tone: b ? "predict" : "muted" });
      if (s >= 3) {
        const g = TOY.map((v, i) => v * RW[i] - 0.25 * v); // same expected gradient with or without b
        [["E[update], weights r", 10], ["E[update], weights r − b", 330]].forEach(([t, x0]) => {
          c.text(x0, 130, t, { size: 13, weight: 700, tone: s === 3 ? "predict" : "muted" });
          const y0 = 205; c.line(x0, y0, x0 + 300, y0, { tone: "muted", width: 1 });
          g.forEach((v, i) => { const bh = v * 400; c.add(k.h("rect", { x: x0 + 10 + i * 72, y: v > 0 ? y0 - bh : y0, width: 52, height: Math.abs(bh), rx: 2, class: `f-${v > 0 ? "code" : "bad"} soft` })); });
        });
      }
      if (s >= 4) { // exact single-sample variance on the toy (sum over logits)
        c.text(10, 268, "single-sample spread (variance, exact on toy):", { size: 13, weight: 700, tone: s === 4 ? "predict" : "muted" });
        c.box({ x: 10, y: 280, w: 0.2297 * 1000, h: 30, label: "r: 0.230", size: 12, tone: "muted", mono: true });
        c.box({ x: 260, y: 280, w: 0.1388 * 1000, h: 30, label: "r − b: 0.139", size: 12, tone: "code", mono: true, hl: s === 4 });
      }
      if (s >= 5) c.box({ x: 420, y: 278, w: 210, h: 70, label: "stale samples: E[∇log π] ≠ 0", size: 13, tone: "bad", hl: true });
    };
  };

  D["ppo-grpo"] = (fig, k) => {
    const sl = k.slider({ label: "pass rate p", min: 0.02, max: 0.9, step: 0.01, value: 0.2, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 10, y: 8, w: 300, h: 50, label: "PPO: critic + clipping", size: 14, tone: "take", hl: s === 1 });
      c.box({ x: 330, y: 8, w: 300, h: 50, label: "GRPO: (r − mean) / std", size: 14, tone: "take", hl: s === 2, mono: true });
      const xs = [], g = [], rf = [];
      for (let i = 2; i <= 90; i++) { const p = i / 100; xs.push(p); g.push(Math.sqrt(p / (1 - p))); rf.push(2 * p); }
      const ser = [];
      if (s >= 3) ser.push({ x: xs, y: g, tone: "take", label: "GRPO √(p/(1−p))", labelAt: 80 });
      if (s >= 4) ser.push({ x: xs, y: rf, tone: "paper", label: "REINFORCE ∝ p", labelAt: 45 });
      const pl = c.plot({ x: 0, y: 68, w: 640, h: 292, xmin: 0, xmax: 1, ymin: 0, ymax: 3, series: ser, xlabel: "pass rate p of a prompt", ylabel: "prompt weight", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
      if (s >= 4) { const p = sl.value; c.dot(pl.X(p), pl.Y(Math.sqrt(p / (1 - p))), { tone: "take", r: 5 }); c.dot(pl.X(p), pl.Y(2 * p), { tone: "paper", r: 5 });
        c.text(70, 100, `p = ${p.toFixed(2)}:  GRPO ${Math.sqrt(p / (1 - p)).toFixed(2)},  REINFORCE ${(2 * p).toFixed(2)}`, { size: 13, mono: true, weight: 700 }); }
      else if (s === 3) c.text(70, 100, "both scaled to weight 1 at p = 0.5", { size: 13, tone: "muted" });
      if (s >= 5) c.box({ x: 330, y: 150, w: 290, h: 56, label: "ratios, clipping, KL: outside the likelihood view", size: 13, tone: "bad", hl: true });
    };
  };

  D["kl"] = (fig, k) => {
    const tb = k.toggle({ label: "β", options: ["0.001", "0.01", "0.1"], value: "0.01" });
    k.follow(tb, { 1: "0.01", 5: "0.1" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ref = [0.4, 0.3, 0.2, 0.1], cur = [0.15, 0.15, 0.2, 0.5];
      ref.forEach((v, i) => {
        const x = 20 + i * 58;
        c.add(k.h("rect", { x, y: 200 - v * 300, width: 24, height: v * 300, rx: 2, class: "f-muted soft" }));
        c.add(k.h("rect", { x: x + 26, y: 200 - cur[i] * 300, width: 24, height: cur[i] * 300, rx: 2, class: `f-take${s === 1 ? " soft" : " softer"}` }));
      });
      c.text(20, 222, "grey: start   violet: after RL", { size: 12, tone: "muted" });
      if (s >= 2) { const kl = cur.reduce((a, v, i) => a + v * Math.log(v / ref[i]), 0); c.text(20, 252, `KL(π‖π_ref) = ${kl.toFixed(2)}`, { size: 15, mono: true, weight: 700, tone: s === 2 ? "predict" : "ink" }); }
      if (s >= 3) c.box({ x: 20, y: 270, w: 220, h: 44, label: "π_ref: frozen base model", size: 13, tone: "muted", hl: s === 3 });
      const xs = [], ys = [];
      for (let i = -250; i <= 250; i += 5) { const u = i / 100; xs.push(u); ys.push(Math.exp(u) - u - 1); }
      const pl = c.plot({ x: 260, y: 0, w: 380, h: 360, xmin: -2.5, xmax: 2.5, ymin: 0, ymax: 9, series: s >= 4 ? [{ x: xs, y: ys, tone: "bad" }] : [],
        xlabel: "u = log π_ref − log π_θ (per token)", ylabel: "penalty e^u − u − 1", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      if (s >= 5) { const b = +tb.value, u = 1.5, v = Math.exp(u) - u - 1; c.dot(pl.X(u), pl.Y(v), { tone: "predict", r: 6 });
        c.label(pl.X(u) - 30, pl.Y(v) - 20, `β × ${v.toFixed(2)} = ${(b * v).toFixed(4)}`, { size: 13, mono: true, tone: "predict", weight: 700 }); }
    };
  };

  const passk = (n, cc, kk) => { if (n - cc < kk) return 1; let r = 1; for (let i = 0; i < kk; i++) r *= (n - cc - i) / (n - i); return 1 - r; };
  D["pass-at-k"] = (fig, k) => {
    const sc = k.slider({ label: "c correct of 64", min: 0, max: 64, step: 1, value: 4 });
    k.follow(sc, { 1: 4, 4: 12, 5: 4 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ks = Array.from({ length: 64 }, (_, i) => i + 1), ser = [];
      if (s < 5) ser.push({ x: ks, y: ks.map((kk) => 100 * passk(64, sc.value, kk)), tone: "paper", label: `one question, c = ${sc.value}`, labelAt: 40 });
      else { // two models, four questions each: A = [32,32,0,0], B = [4,4,4,4]
        const A = [32, 32, 0, 0], B = [4, 4, 4, 4], avg = (cs, kk) => 100 * cs.reduce((a, x) => a + passk(64, x, kk), 0) / cs.length;
        ser.push({ x: ks, y: ks.map((kk) => avg(A, kk)), tone: "take", label: "model A", labelAt: 50 }, { x: ks, y: ks.map((kk) => avg(B, kk)), tone: "code", label: "model B", labelAt: 30 });
      }
      const pl = c.plot({ x: 0, y: 30, w: 640, h: 330, xmin: 1, xmax: 64, ymin: 0, ymax: 100, series: ser, xlabel: "k samples", ylabel: "pass@k (%)", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      if (s <= 4) {
        const p1 = 100 * passk(64, sc.value, 1), p16 = 100 * passk(64, sc.value, 16);
        if (s === 1 || s >= 3) { c.dot(pl.X(1), pl.Y(p1), { r: 6, tone: "predict" }); }
        if (s >= 2) c.dot(pl.X(16), pl.Y(p16), { r: 6, tone: "predict" });
        c.text(70, 22, s === 1 ? `pass@1 = ${p1.toFixed(1)}%` : `pass@1 = ${p1.toFixed(1)}%   pass@16 = ${p16.toFixed(1)}%`, { size: 14, mono: true, weight: 700, tone: "predict" });
        if (s === 3) c.text(630, 22, "1 − C(n−c, k) / C(n, k)", { size: 14, mono: true, anchor: "end", tone: "paper" });
      } else c.text(70, 22, "A: 4 questions c = 32,32,0,0   B: c = 4,4,4,4", { size: 13, mono: true, weight: 700 });
    };
  };

  D["on-policy"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(10, 22, "synchronous (on-policy)", { size: 13, weight: 700, tone: s <= 3 ? "predict" : "muted" });
      for (let i = 0; i < 4; i++) {
        c.box({ x: 10 + i * 155, y: 34, w: 100, h: 40, label: `gen v${i + 1}`, size: 13, tone: "paper", hl: s === 1 });
        c.box({ x: 112 + i * 155, y: 34, w: 40, h: 40, label: "train", size: 11, tone: "take", hl: s === 1 });
      }
      if (s >= 2) c.text(10, 98, "Eq. 1: y ~ π_θ, the model being updated now", { size: 13, mono: true, tone: s === 2 ? "predict" : "muted" });
      if (s >= 3) for (let i = 0; i < 4; i++) c.box({ x: 10 + i * 155, y: 112, w: 100, h: 26, label: "trainer idle", size: 11, tone: "bad", hl: s === 3 });
      if (s >= 4) {
        c.text(10, 172, "asynchronous (off-policy)", { size: 13, weight: 700, tone: "predict" });
        c.text(10, 196, "generator", { size: 12, tone: "muted" });
        for (let i = 0; i < 5; i++) c.box({ x: 90 + i * 108, y: 184, w: 104, h: 34, label: `gen v${[1, 1, 5, 5, 9][i]}`, size: 12, tone: "paper", hl: s === 4 });
        c.text(10, 246, "trainer", { size: 12, tone: "muted" });
        for (let i = 0; i < 9; i++) c.box({ x: 90 + i * 60, y: 232, w: 56, h: 34, label: `u${i + 1}`, size: 12, tone: "take", hl: s === 4 });
      }
      if (s >= 5) c.box({ x: 90, y: 290, w: 540, h: 50, label: "data in use: 12–44 updates old (App. D.6)", size: 14, tone: "predict", hl: true });
    };
  };

  // ======================================================= RL AS LIKELIHOOD
  D["maxrl-objective"] = (fig, k) => {
    const sl = k.slider({ label: "pass rate p", min: 0.01, max: 1, step: 0.01, value: 0.02, fmt: (v) => v.toFixed(2) });
    const tg = k.toggle({ label: "plot", options: ["objective", "slope"], value: "objective" });
    k.follow(tg, { 1: "objective", 3: "slope", 4: "objective" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const xs = []; for (let i = 5; i <= 1000; i += 5) xs.push(i / 1000);
      if (tg.value === "objective") {
        const pl = c.plot({ x: 0, y: 0, w: 640, h: 360, xmin: 0, xmax: 1, ymin: -5.5, ymax: 0.3, series: [{ x: xs, y: xs.map(Math.log), tone: "code", label: "MaxRL: log p", labelAt: 150 }],
          xlabel: "pass rate p", ylabel: "objective", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
        if (s >= 2) [[0.01, 0.02], [0.4, 0.8]].forEach(([a, b]) => {
          c.dot(pl.X(a), pl.Y(Math.log(a)), { tone: "predict", r: 5 }); c.dot(pl.X(b), pl.Y(Math.log(b)), { tone: "predict", r: 5 });
          c.line(pl.X(b) + 10, pl.Y(Math.log(a)), pl.X(b) + 10, pl.Y(Math.log(b)), { tone: "predict", width: 3 });
          c.label(pl.X(b) + 60, (pl.Y(Math.log(a)) + pl.Y(Math.log(b))) / 2, `+0.69 (×2)`, { size: 13, tone: "predict", weight: 700, mono: true });
        });
        if (s >= 4) c.box({ x: 330, y: 260, w: 290, h: 46, label: "log of a likelihood: P(correct)", size: 14, tone: "code", hl: true });
      } else {
        const pl = c.plot({ x: 0, y: 0, w: 640, h: 360, xmin: 0.01, xmax: 1, ymin: 0.5, ymax: 120, ylog: true,
          series: [{ x: xs.filter((v) => v >= 0.01), y: xs.filter((v) => v >= 0.01).map((v) => 1 / v), tone: "code", label: "MaxRL slope 1/p", labelAt: 30 }, { x: [0.01, 1], y: [1, 1], tone: "paper", label: "REINFORCE slope 1", labelAt: 1 }],
          xlabel: "pass rate p", ylabel: "push per unit gain in p", xFmt: (v) => v.toFixed(1) });
        const p = sl.value; c.dot(pl.X(p), pl.Y(1 / p), { tone: "predict", r: 6 });
        c.label(pl.X(p) + 70, pl.Y(1 / p), `1/p = ${(1 / p).toFixed(1)}`, { size: 14, mono: true, tone: "predict", weight: 700 });
      }
    };
  };

  D["success-cond"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const plus = [0.6, 0.4, 0, 0];
      TOY.forEach((v, i) => {
        const x = 30 + i * 100, ok = i < 2, val = s >= 3 ? plus[i] : v;
        const bh = val * 300;
        if (s >= 3 && ok) c.add(k.h("rect", { x, y: 250 - v * 300, width: 70, height: v * 300, rx: 3, class: "f-muted softer" }));
        c.add(k.h("rect", { x, y: 250 - bh, width: 70, height: Math.max(0.5, bh), rx: 3, class: `f-${ok ? "code" : "muted"} ${s >= 2 && !ok ? "softer" : "soft"}` }));
        c.text(x + 35, 244 - Math.max(bh, ok ? 0 : v * 300), (s >= 2 && !ok) ? "dropped" : val.toFixed(2), { size: 13, anchor: "middle", mono: true, tone: s >= 2 && !ok ? "bad" : "ink" });
        c.text(x + 35, 272, NAMES[i], { size: 15, anchor: "middle", weight: 700, tone: ok ? "code" : "bad" });
      });
      if (s >= 2) c.box({ x: 440, y: 30, w: 190, h: 50, label: "kept mass p = 0.25", size: 14, tone: "code", hl: s === 2 });
      if (s >= 3) c.box({ x: 440, y: 100, w: 190, h: 60, label: "π⁺ = π / p on ✓", sub: "0.15/0.25, 0.10/0.25", tone: "code", hl: s === 3, mono: true });
      if (s >= 4) c.box({ x: 10, y: 300, w: 620, h: 50, label: "sample 16, keep the ✓: e.g. ✓1 ✓1 ✓1 ✓2 → about 60/40", size: 14, tone: "predict", hl: true });
    };
  };

  D["rl-is-mle"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(10, 26, "∇log p = ∇p / p = E_π[ r ∇log π ] / p", { size: 15, mono: true, weight: s === 1 ? 700 : 400, tone: s === 1 ? "predict" : "ink" });
      if (s >= 2) c.text(10, 56, "= E_π⁺[ ∇log π ]", { size: 15, mono: true, weight: s === 2 ? 700 : 400, tone: s === 2 ? "predict" : "ink" });
      if (s >= 3 && s < 5) {
        const a1 = c.box({ x: 10, y: 90, w: 290, h: 54, label: "SFT: data from a corpus μ", size: 14, tone: "paper", hl: s === 3 });
        const b1 = c.box({ x: 340, y: 90, w: 290, h: 54, label: "MaxRL: data from π⁺_θt", size: 14, tone: "code", hl: s === 3 });
        const a2 = c.box({ x: 10, y: 190, w: 290, h: 54, label: "minimize −log π_θ(y|x)", size: 14, tone: "take", mono: true });
        const b2 = c.box({ x: 340, y: 190, w: 290, h: 54, label: "minimize −log π_θ(y|x)", size: 14, tone: "take", mono: true });
        c.connect(a1, a2); c.connect(b1, b2);
        if (s >= 4) c.box({ x: 340, y: 270, w: 290, h: 50, label: "🔒 π⁺ frozen during the update", size: 14, tone: "predict", hl: true });
      }
      if (s >= 5) {
        const g = [0.45, 0.30, -0.45, -0.30]; // π⁺ − π, exact
        const y0 = 220; c.line(20, y0, 620, y0, { tone: "muted", width: 1 });
        c.text(10, 100, "logit gradient = π⁺ − π  (exactly cross-entropy toward π⁺)", { size: 14, weight: 700, tone: "predict" });
        g.forEach((v, i) => { const x = 60 + i * 140, bh = v * 200;
          c.add(k.h("rect", { x, y: v > 0 ? y0 - bh : y0, width: 80, height: Math.abs(bh), rx: 3, class: `f-${v > 0 ? "code" : "bad"} soft` }));
          c.text(x + 40, v > 0 ? y0 - bh - 6 : y0 - bh + 16, f2(v), { size: 13, anchor: "middle", mono: true });
          c.text(x + 40, v > 0 ? y0 + 18 : y0 - 8, NAMES[i], { size: 13, anchor: "middle", weight: 700, tone: i < 2 ? "code" : "bad" }); });
      }
    };
  };

  D["prompt-weights"] = (fig, k) => {
    const pe = k.slider({ label: "easy p", min: 0.3, max: 0.99, step: 0.01, value: 0.8, fmt: (v) => v.toFixed(2) });
    const ph = k.slider({ label: "hard p", min: 0.01, max: 0.3, step: 0.01, value: 0.05, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 4) {
        c.box({ x: 10, y: 10, w: 300, h: 50, label: `easy prompt, p = ${pe.value.toFixed(2)}`, size: 14, tone: "code" });
        c.box({ x: 330, y: 10, w: 300, h: 50, label: `hard prompt, p = ${ph.value.toFixed(2)}`, size: 14, tone: "bad" });
        c.box({ x: 10, y: 74, w: 620, h: 40, label: "both fit the same target: π⁺, the model's own ✓ answers", size: 13, tone: "code", hl: s === 1 });
        const e = pe.value, h = ph.value;
        const rows = [];
        if (s >= 2) rows.push(["REINFORCE", [100 * e / (e + h), 100 * h / (e + h)], s === 2 || s === 4]);
        if (s >= 3) rows.push(["MaxRL", [50, 50], s === 3]);
        if (rows.length) {
          c.text(10, 146, "share of the update (%): green = easy, red = hard", { size: 13, tone: "muted", weight: 700 });
          c.bars({ x: 10, y: 160, w: 620, rowH: 70, labelW: 110, max: 100, fmt: (v) => v.toFixed(0) + "%", tones: ["code", "bad"], rows: rows.map(([label, values, hl]) => ({ label, values, hl })) });
        }
      } else {
        c.plot({ x: 0, y: 0, w: 640, h: 360, xmin: 0, xmax: 60, ymin: 0, ymax: 1, series: [{ ...CURVE.maxH, tone: "code", label: "MaxRL", labelAt: 12 }, { ...CURVE.rfH, tone: "paper", label: "REINFORCE", labelAt: 45 }],
          xlabel: "gradient steps on the hard toy prompt (p starts at 0.02)", ylabel: "pass rate p", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
      }
    };
  };

  D["finite-sample"] = (fig, k) => {
    const sc = k.slider({ label: "correct of 16", min: 0, max: 16, step: 1, value: 4 });
    k.follow(sc, { 1: 4, 4: 0, 5: 4 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const n = sc.value, ph = n / 16, A = n ? 16 / n : 0;
      for (let i = 0; i < 16; i++) {
        const ok = i < n, col = i % 8, row = Math.floor(i / 8);
        c.box({ x: 10 + col * 78, y: 14 + row * 54, w: 70, h: 44, label: s >= 2 ? `${ok ? "✓" : "✗"} ${ok ? (A % 1 ? A.toFixed(2) : A) : 0}` : ok ? "✓" : "✗", size: 13, tone: ok ? "code" : "bad", mono: true, hl: s === 2 && ok });
      }
      c.text(10, 146, `p̂ = ${n}/16 = ${ph.toFixed(3)}    A = 1/p̂ = ${n ? A.toFixed(2) : "—"}`, { size: 15, mono: true, weight: 700, tone: s <= 2 ? "predict" : "ink" });
      if (s >= 3) c.text(10, 178, n ? `(1/16) Σ Aᵢ·scoreᵢ = mean of the ${n} ✓ scores` : "no ✓ samples → this prompt adds nothing", { size: 14, mono: true, tone: n ? "code" : "bad", weight: s >= 3 ? 700 : 400 });
      if (s >= 3) {
        const rows = [["MaxRL push", n ? 1 : 0, s === 3 || s === 5]];
        if (s >= 5) rows.push(["REINFORCE push", ph, true]);
        c.bars({ x: 10, y: 210, w: 620, rowH: 56, labelW: 150, max: 1, fmt: (v) => v.toFixed(2), tones: ["code"], rows: rows.map(([label, v, hl]) => ({ label, values: [v], hl })) });
      }
    };
  };

  D["finite-n"] = (fig, k) => {
    const sn = k.slider({ label: "N samples", min: 1, max: 64, step: 1, value: 16 });
    k.follow(sn, { 1: 16, 3: 1, 4: 16 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const N = sn.value, xs = []; for (let i = 0; i <= 100; i++) xs.push(i / 100);
      const ser = [{ x: xs, y: xs.map((p) => 1 - Math.pow(1 - p, N)), tone: "code", label: `N = ${N}`, labelAt: 30 }];
      if (s >= 3) ser.push({ x: xs, y: xs, tone: "paper", dash: true, label: "N = 1 (REINFORCE)", labelAt: 80 });
      if (s >= 4) ser.push({ x: [0.005, 1], y: [1, 1], tone: "take", dash: true, label: "N → ∞ (MaxRL)", labelAt: 1 });
      const pl = c.plot({ x: 0, y: 0, w: 640, h: 360, xmin: 0, xmax: 1, ymin: 0, ymax: 1.08, series: ser, xlabel: "pass rate p of a prompt", ylabel: "prompt weight 1 − (1 − p)^N", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(1) });
      const w5 = 1 - Math.pow(0.95, N);
      c.dot(pl.X(0.05), pl.Y(w5), { tone: "predict", r: 6 });
      c.label(pl.X(0.05) + 90, pl.Y(w5) + 22, `p = 0.05 → ${w5.toFixed(2)}`, { size: 14, mono: true, tone: "predict", weight: 700 });
      if (s === 2) c.box({ x: 360, y: 230, w: 260, h: 50, label: "target is still π⁺", size: 14, tone: "code", hl: true });
    };
  };

  D["any-generator"] = (fig, k) => {
    const tg = k.toggle({ label: "generator ν", options: ["current model", "old copy", "another model"], value: "current model" });
    k.follow(tg, { 1: "current model", 4: "another model", 5: "old copy" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const g = c.box({ x: 10, y: 40, w: 180, h: 70, label: `ν = ${tg.value}`, sub: tg.value === "old copy" ? "12–44 updates old" : tg.value === "current model" ? "π_θt" : "any fixed policy", tone: "paper", hl: s === 1 });
      if (s >= 2) { const f = c.box({ x: 230, y: 40, w: 160, h: 70, label: "keep ✓ only", sub: "ν⁺ = ν(·|x, r=1)", tone: "code", hl: s === 2 }); c.connect(g, f);
        if (s >= 3) { const t = c.box({ x: 430, y: 40, w: 200, h: 70, label: "trainer π_θ", sub: "minimize −log π_θ", tone: "take", hl: s === 3 }); c.connect(f, t, { tone: "code" }); } }
      if (s >= 4) {
        const msg = tg.value === "current model" ? "= the MaxRL update" : tg.value === "old copy" ? "async: fit a recent copy's successes" : "fit ν's successes: a different, valid target";
        c.box({ x: 10, y: 170, w: 620, h: 60, label: msg, size: 15, tone: tg.value === "current model" ? "code" : "predict", hl: true });
      }
      if (s >= 5) c.box({ x: 10, y: 260, w: 620, h: 60, label: "still one well-defined likelihood objective (§3.2)", size: 14, tone: "code" });
    };
  };

  D["tailrl"] = (fig, k) => {
    const st = k.slider({ label: "threshold τ", min: 0, max: 0.99, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(st, { 1: 0.5, 2: 0.5, 3: 0.2 });
    const c = k.canvas(W, H);
    const R = [0.15, 0.35, 0.55, 0.75, 1.0]; // our toy rewards; each answer sampled with prob 0.2
    const TW = (() => { const w = [0, 0, 0, 0, 0], M = 4000; for (let j = 0; j < M; j++) { const t = (j + 0.5) / M, ab = R.map((r) => r > t), q = ab.filter(Boolean).length / 5; if (q) ab.forEach((a, i) => { if (a) w[i] += 0.2 / q / M; }); } return w; })();
    return (s) => {
      c.clear();
      const t = st.value, above = R.map((r) => r > t), cnt = above.filter(Boolean).length;
      const y0 = 300, sc = 220;
      R.forEach((r, i) => {
        const x = 30 + i * 80;
        c.add(k.h("rect", { x, y: y0 - r * sc, width: 56, height: r * sc, rx: 3, class: `f-${s >= 2 && above[i] ? "code" : "muted"} soft` }));
        c.text(x + 28, y0 + 18, `r=${r.toFixed(2)}`, { size: 12, anchor: "middle", mono: true });
      });
      c.text(30, 20, "5 answers, sampled equally often", { size: 13, weight: 700, tone: "muted" });
      if (s >= 2) { c.line(20, y0 - t * sc, 400, y0 - t * sc, { tone: "predict", dash: true, width: 2 });
        c.text(404, y0 - t * sc + 4, `τ = ${t.toFixed(2)}`, { size: 13, mono: true, tone: "predict", weight: 700 }); }
      if (s >= 2 && s <= 3) c.text(30, 44, `π⁺_τ: ${cnt} answers pass, ${cnt ? (1 / cnt).toFixed(2) : "—"} each`, { size: 13, mono: true, tone: "code" });
      if (s >= 3) {
        c.text(470, 64, "TailRL target", { size: 13, weight: 700, tone: "take" });
        TW.forEach((w, i) => { const y = 78 + i * 32; c.add(k.h("rect", { x: 470, y, width: w * 240, height: 24, rx: 3, class: "f-take soft" })); c.text(470 + w * 240 + 4, y + 17, w.toFixed(2), { size: 12, mono: true }); });
      }
      if (s >= 4) c.text(30, 344, "∫₀¹ π(· | x, r > τ) dτ", { size: 15, mono: true, weight: 700, tone: s === 4 ? "predict" : "take" });
      if (s >= 5) c.box({ x: 476, y: 250, w: 154, h: 60, label: "TTS: speaker sim 0.83 → r", size: 12, tone: "bridge", hl: true });
    };
  };

  D["objectives-table"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [["MaxRL · pass/fail", "target π⁺ · prompts ρ", "code"], ["REINFORCE · pass/fail", "target π⁺ · prompts ∝ ρ·p", "paper"],
      ["TailRL · reward in [0,1]", "∫ π(·|r>τ)dτ · prompts ρ", "take"], ["REINFORCE · reward in [0,1]", "target ∝ π·r · prompts ∝ ρ·E[r]", "paper"],
      ["trainer sees", "(prompts, target answers) → −log π", "predict"]];
    return (s) => board(c, rows, s, 6, 70, 260);
  };

  // ======================================================= THE UNIFIED MACHINE
  D["one-mixture"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Fig. 3, RL phase: 95.4% RL generations, 4.4% midtraining, 0.3% pretraining; no SFT source
    const S = [["Pretraining", "λ = 0.3%", "paper"], ["Midtraining", "λ = 4.4%", "paper"], ["SFT", "λ = 0 here", "take"], ["RL: π⁺_θt", "λ = 95.4%", "predict"]];
    return (s) => {
      c.clear();
      const bx = S.map(([l, sub, t], i) => c.box({ x: 10, y: 14 + i * 84, w: 180, h: 60, label: l, sub: s >= 2 ? sub : undefined, tone: t, hl: s === 1 || (s === 5 && i === 3) }));
      if (s >= 3) { const mx = c.box({ x: 240, y: 130, w: 150, h: 90, label: "mixture q_t", sub: "Σ λ·(ρ∘μ)", tone: "muted", hl: s === 3 }); bx.forEach((b) => c.connect(b, mx, { tone: "muted" }));
        if (s >= 4) { const ls = c.box({ x: 440, y: 40, w: 190, h: 70, label: "−log π_θ(y|x)", sub: "one loss", tone: "code", hl: s === 4, mono: true });
          const md = c.box({ x: 440, y: 240, w: 190, h: 70, label: "model π_θ", tone: "take", hl: s === 4 });
          c.connect(mx, ls, { tone: "code" }); c.connect(ls, md, { tone: "code", label: "update" });
          if (s >= 5) c.connect(md, bx[3], { tone: "predict", label: "regenerate", route: "elbow", width: 2.2 }); } }
    };
  };

  D["staged-special"] = (fig, k) => {
    const tg = k.toggle({ label: "view", options: ["staged", "unified"], value: "staged" });
    k.follow(tg, { 1: "staged", 2: "unified" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (b) => 30 + (b / 23) * 590, top = 40, h = 230, Y = (f) => top + h * (1 - f);
      const seg = (b0, b1, parts) => { let acc = 0; parts.forEach(([f, tone]) => { const hh = Math.max(3, f * h); c.add(k.h("rect", { x: X(b0), y: top + h - acc - hh, width: X(b1) - X(b0) - 1, height: hh, class: `f-${tone} soft` })); acc += hh; }); };
      if (tg.value === "staged") { seg(0, 20, [[1, "paper"]]); seg(20, 21, [[1, "take"]]); seg(21, 23, [[1, "predict"]]); }
      else { seg(0, 16, [[1, "paper"]]); seg(16, 21, [[0.89, "paper"], [0.11, "take"]]); seg(21, 23, [[0.003, "paper"], [0.954, "predict"], [0.044, "take"]]); } // Fig. 3
      [0, 16, 21, 23].forEach((b) => c.text(X(b), top + h + 18, `${b}B`, { size: 12, anchor: "middle", mono: true, tone: "muted" }));
      c.text(325, top + h + 44, "cumulative training tokens", { size: 12, anchor: "middle", tone: "muted" });
      c.text(30, 24, "blue: web text   violet: puzzles   amber: RL generations", { size: 12, tone: "muted" });
      if (s === 3) { c.label(X(18.5), Y(0.5), "89% web", { size: 13, weight: 700, mono: true }); c.label(X(18.5), Y(0.94), "11% puzzles", { size: 13, weight: 700, mono: true, tone: "take" }); }
      if (s >= 4 && tg.value === "unified") { c.label(X(22), Y(0.5), "95.4% RL", { size: 13, weight: 700, mono: true }); c.label(X(19), Y(0.93), "4.4% puzzles", { size: 12, weight: 700, mono: true, tone: "take" }); c.label(X(19), Y(0.04), "0.3% web", { size: 12, weight: 700, mono: true, tone: "paper" }); }
    };
  };

  D["data-format"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["pretraining", [["The", 1], ["tower", 1], ["has", 1], ["40", 1], ["floors", 1]]],
      ["midtraining", [["Zoe", 1], ["−", 1], ["Ella", 1], ["=", 1], ["3", 1]]],
      ["SFT", [["Who", 0], ["lives", 0], ["where?", 0], ["Hugo=38", 1], ["…", 1]]],
      ["RL, correct", [["puzzle", 0], ["prompt", 0], ["Answer:", 0], ["Hugo=38", 4], ["…", 4]]],
      ["RL, wrong", [["puzzle", 0], ["prompt", 0], ["Answer:", 0], ["Hugo=31", 0], ["…", 0]]]];
    return (s) => {
      c.clear();
      const show = s === 1 ? 1 : s === 2 ? 2 : s === 3 ? 3 : 5;
      R.slice(0, show).forEach(([name, toks], i) => {
        const y = 8 + i * 70, now = (s <= 3 && i === s - 1) || (s === 4 && i >= 3);
        c.box({ x: 10, y, w: 130, h: 30, label: name, size: 13, tone: i >= 3 ? "predict" : i === 2 ? "take" : "paper", hl: now });
        const ch = c.chips({ x: 160, y: y + 2, items: toks.map(([t, w]) => ({ t, tone: w ? (i >= 3 ? "predict" : "paper") : "muted", dashed: !w })), size: 13, gap: 8 });
        ch.forEach((r, j) => c.text(r.x + r.w / 2, r.y + r.h + 17, String(toks[j][1]), { size: 13, anchor: "middle", mono: true, weight: 700, tone: s === 5 ? "predict" : toks[j][1] ? "code" : "muted" }));
      });
      if (s === 5) c.text(630, 354, "only the weights differ", { size: 13, anchor: "end", tone: "predict", weight: 700 });
    };
  };

  D["token-mean"] = (fig, k) => {
    const sl = k.slider({ label: "midtraining length", min: 100, max: 1500, step: 50, value: 400, fmt: (v) => `${v} tok` });
    k.follow(sl, { 1: 400, 4: 1200, 5: 400 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const L = [200, 250, sl.value], Wt = [4, 0, 1], N = ["RL ✓ (A=4)", "RL ✗ (w=0)", "midtraining (w=1)"], T = ["code", "bad", "take"];
      const scale = 430 / 1500;
      L.forEach((l, i) => {
        const y = 14 + i * 52;
        c.text(140, y + 25, N[i], { size: 13, anchor: "end", weight: 700, tone: T[i], inBox: true });
        c.box({ x: 150, y, w: Math.max(20, l * scale), h: 38, label: `${l}`, size: 12, tone: T[i], hl: (s === 3 && i === 1) || (s === 4 && i === 2), mono: true });
      });
      const TB = L[0] + L[1] + L[2];
      if (s >= 2) c.text(10, 186, `T_B = ${L[0]} + ${L[1]} + ${L[2]} = ${TB} tokens`, { size: 15, mono: true, weight: 700, tone: s === 2 || s === 3 ? "predict" : "ink" });
      if (s >= 3) c.text(10, 214, "the ✗ row adds tokens to T_B but nothing to the loss", { size: 13, tone: "bad" });
      if (s >= 5 || s === 4) {
        const num = [Wt[0] * L[0], 0, Wt[2] * L[2]], tot = num[0] + num[2];
        c.text(10, 250, "share of the loss (each token's loss set to 1):", { size: 13, weight: 700, tone: s === 5 ? "predict" : "muted" });
        c.bars({ x: 10, y: 260, w: 620, rowH: 46, labelW: 140, max: 100, fmt: (v) => v.toFixed(0) + "%", tones: ["code", "take"], rows: [{ label: "RL ✓ vs mid", values: [100 * num[0] / tot, 100 * num[2] / tot], hl: s === 5 }] });
      }
    };
  };

  D["separate-loss"] = (fig, k) => {
    const sf = k.slider({ label: "midtraining token share", min: 0.5, max: 30, step: 0.5, value: 2, fmt: (v) => `${v}%` });
    const ta = k.toggle({ label: "α", options: ["0.1", "0.5"], value: "0.1" });
    k.follow(sf, { 1: 2, 4: 20 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(10, 30, "separate:  N_R/T_R + α · N_D/T_D", { size: 16, mono: true, weight: s === 1 ? 700 : 400, tone: s === 1 ? "predict" : "ink" });
      if (s >= 2) c.text(10, 66, "unified:   (N_R + w·N_D) / (T_R + T_D)", { size: 16, mono: true, weight: s === 2 ? 700 : 400, tone: s === 2 ? "predict" : "ink" });
      if (s >= 3) c.text(10, 102, "   = scale × [ N_R/T_R + (w·T_D/T_R) · N_D/T_D ]", { size: 15, mono: true, weight: s === 3 ? 700 : 400, tone: s === 3 ? "predict" : "ink" });
      if (s >= 4) {
        const f = sf.value / 100, rel = f / (1 - f), a = +ta.value;
        c.text(10, 150, "midtraining's relative coefficient:", { size: 13, weight: 700, tone: "muted" });
        c.bars({ x: 10, y: 162, w: 620, rowH: 56, labelW: 150, max: Math.max(0.5, rel, a) * 1.05, fmt: (v) => v.toFixed(3), tones: ["code"],
          rows: [{ label: "unified w·T_D/T_R", values: [rel], hl: s === 4 }, { label: `separate α`, values: [a] }] });
      }
      if (s >= 5) c.box({ x: 10, y: 290, w: 620, h: 50, label: "tested: α ∈ {0.1, 0.5}, and 1 in one Extended setting", size: 14, tone: "predict", hl: true });
    };
  };

  D["mix-rates"] = (fig, k) => {
    const sf = k.slider({ label: "target share f", min: 0.1, max: 5, step: 0.1, value: 2, fmt: (v) => `${v.toFixed(1)}%` });
    const sl = k.slider({ label: "actual RL answer length", min: 200, max: 800, step: 20, value: 400, fmt: (v) => `${v} tok` });
    k.follow(sl, { 1: 400, 4: 700, 5: 400 });
    const c = k.canvas(W, H);
    const EST = 400, LMID = 1000; // our assumed mean lengths (not reported)
    return (s) => {
      c.clear();
      const f = sf.value / 100, m = (f / (1 - f)) * 512 * EST / LMID;
      c.text(10, 28, `f = T_mid / (T_mid + T_rl) = ${(100 * f).toFixed(1)}%`, { size: 15, mono: true, weight: s === 1 ? 700 : 400, tone: s === 1 ? "predict" : "ink" });
      if (s >= 2) c.text(10, 60, `rate ∝ f_s / T_s  →  ${m.toFixed(2)} midtraining examples per update`, { size: 14, mono: true, weight: s === 2 ? 700 : 400, tone: s === 2 ? "predict" : "ink" });
      if (s >= 3) {
        const rl = 512 * sl.value, mid = m * LMID, tot = rl + mid, wd = 600;
        c.text(10, 100, "one batch, by tokens", { size: 13, weight: 700, tone: "muted" });
        c.box({ x: 10, y: 112, w: wd * rl / tot, h: 50, label: `512 RL answers × ${sl.value}`, size: 13, tone: "predict" });
        c.box({ x: 10 + wd * rl / tot + 2, y: 112, w: Math.max(18, wd * mid / tot), h: 50, label: "", tone: "take", hl: true });
        c.text(630, 186, `midtraining ${(100 * mid / tot).toFixed(2)}%`, { size: 13, anchor: "end", weight: 700, tone: s === 4 ? "bad" : "take", mono: true });
        if (s >= 4) c.text(10, 216, `counts planned with ${EST}-token answers; actual ${sl.value}`, { size: 13, tone: s === 4 ? "bad" : "muted", mono: true });
      }
      if (s >= 5) {
        c.text(10, 262, "cumulative rounding, 10 updates:", { size: 13, weight: 700, tone: "predict" });
        let prev = 0; const items = [];
        for (let u = 1; u <= 10; u++) { const cum = Math.round(u * m); items.push({ t: String(cum - prev), tone: "take", hl: true }); prev = cum; }
        c.chips({ x: 10, y: 274, items, size: 14, gap: 8 });
        c.text(10, 330, `average ${(prev / 10).toFixed(1)} ≈ ${m.toFixed(2)}`, { size: 13, mono: true, tone: "muted" });
      }
    };
  };

  D["async"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const gen = c.box({ x: 10, y: 30, w: 190, h: 64, label: "generators (vLLM)", sub: "recent weights", tone: "predict", hl: s === 1 });
      const buf = c.box({ x: 230, y: 140, w: 180, h: 90, label: "data buffer", sub: s >= 5 ? "rounds/g…-b…/" : "RL + static rows", tone: "muted", hl: s === 2 || s === 5 });
      c.connect(gen, buf, { tone: "predict", label: "weighted RL", route: "elbow" });
      if (s >= 2) { const st = c.box({ x: 10, y: 270, w: 190, h: 60, label: "static data", sub: "pre / mid / SFT", tone: "paper", hl: s === 2 }); c.connect(st, buf, { tone: "paper", route: "elbow" }); }
      if (s >= 3) { const tr = c.box({ x: 440, y: 30, w: 190, h: 64, label: "trainer", sub: "samples the mixture", tone: "take", hl: s === 3 }); c.connect(buf, tr, { tone: "take", route: "elbow" });
        if (s >= 4) { const pub = c.box({ x: 440, y: 270, w: 190, h: 60, label: "published weights", sub: "every k = 4 updates", tone: "code", hl: s === 4 }); c.connect(tr, pub, { tone: "code" });
          c.path(`M440,318 H 220 V 120 H 105 V 98`, { tone: "code", arrow: true, dash: true }); } }
    };
  };

  D["staleness"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (u) => 30 + (u / 60) * 580;
      c.line(X(0), 60, X(60), 60, { tone: "muted", width: 1.5 });
      c.add(k.h("rect", { x: X(16), y: 48, width: X(48) - X(16), height: 24, rx: 4, class: `f-predict ${s === 1 ? "soft" : "softer"}` }));
      c.dot(X(60), 60, { tone: "take", r: 6 });
      c.text(X(60), 36, "trainer now", { size: 12, anchor: "end", tone: "take", weight: 700 });
      c.text(X(32), 92, "data from policies 12–44 updates old", { size: 13, anchor: "middle", tone: "predict", weight: 700 });
      if (s >= 2) c.text(10, 126, "unified weight r/p̂   ·   staged weight (r − p̂)/p̂", { size: 14, mono: true, weight: s === 2 ? 700 : 400, tone: s === 2 ? "predict" : "ink" });
      const rows = [];
      if (s >= 3) rows.push(["s per update", [3.7, 28.8], 30, (v) => `${v} s`, s === 3]);
      if (s >= 4) rows.push(["Math pass@1", [24.75, 24.16], 30, (v) => `${v}%`, s === 4]);
      if (s >= 5) rows.push(["Δ held-out loss", [0.074, 0.047], 0.08, (v) => `+${v}`, s === 5]);
      rows.forEach(([lab, vals, max, fmt, hl], i) => {
        c.bars({ x: 10, y: 150 + i * 68, w: 620, rowH: 60, labelW: 140, max, fmt, tones: ["predict", "muted"], rows: [{ label: lab, values: vals, hl }] });
      });
      if (s >= 3) c.text(630, 146, "amber: unified (0% mix)   grey: staged RL", { size: 12, anchor: "end", tone: "muted" });
    };
  };

  // ======================================================= THE PUZZLE STUDY
  D["puzzle"] = (fig, k) => {
    const c = k.canvas(W, H);
    const F = [[38, "Hugo"], [31, "Zoe"], [28, "Ella"], [23, "Ethan"], [13, "Mia"], [6, "Maya"]]; // App. B.3
    return (s) => {
      c.clear();
      F.forEach(([fl, name], i) => {
        const y = 14 + i * 56, known = s >= 5 || (s >= 4 && (name === "Zoe" || name === "Ella"));
        c.box({ x: 10, y, w: 200, h: 48, label: known ? `floor ${fl}: ${name}` : `floor ${fl}: ?`, size: 14, tone: known ? "code" : "muted", hl: s === 4 && (name === "Zoe" || name === "Ella") });
      });
      if (s >= 1) c.text(230, 30, "Hugo, Maya, Ethan, Zoe, Ella, Mia", { size: 14, weight: 700 });
      if (s >= 2) {
        ["Zoe lives 3 floors above Ella.", "Ethan lives 10 above his best friend.", "Ethan lives 17 above the lowest floor.", "Zoe's best friend lives 25 above Mia.", "Mia and Ethan live on odd floors."]
          .forEach((t, i) => c.text(230, 66 + i * 28, t, { size: 13, tone: i === 0 && s >= 4 ? "predict" : "ink", weight: i === 0 && s >= 4 ? 700 : 400 }));
      }
      if (s >= 3) c.box({ x: 230, y: 216, w: 400, h: 40, label: "solver: unique, reachable by propagation", size: 13, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 230, y: 270, w: 400, h: 40, label: "Zoe − Ella = 3 → only (31, 28)", size: 14, tone: "predict", hl: s === 4, mono: true });
      if (s >= 5) c.box({ x: 230, y: 318, w: 400, h: 36, label: "boxed answer checked in full", size: 13, tone: "code", hl: true });
    };
  };

  D["oracle-corpus"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 10, y: 20, w: 200, h: 56, label: "100,000 × 6–7 people", size: 13, tone: "paper", hl: s === 1 });
      const b = c.box({ x: 10, y: 96, w: 200, h: 56, label: "100,000 × 8–9 people", size: 13, tone: "paper", hl: s === 1 });
      if (s >= 2) { const t = c.box({ x: 260, y: 56, w: 170, h: 60, label: "≤ 4 traces each", sub: "dedup", tone: "take", hl: s === 2 }); c.connect(a, t); c.connect(b, t);
        const e = c.box({ x: 470, y: 56, w: 160, h: 60, label: "796,175", sub: "examples", tone: "code", hl: s === 2, mono: true }); c.connect(t, e);
        if (s >= 3) { const tk = c.box({ x: 470, y: 150, w: 160, h: 60, label: "509,942,713", sub: "tokens", tone: "code", hl: s === 3, mono: true }); c.connect(e, tk); } }
      if (s >= 4) c.box({ x: 10, y: 230, w: 420, h: 50, label: "some combinations of moves left out on purpose", size: 13, tone: "predict", dashed: true, hl: s === 4 });
      if (s >= 5) c.box({ x: 10, y: 296, w: 620, h: 50, label: "more midtraining = more passes over the same examples", size: 14, tone: "muted", hl: true });
    };
  };

  D["compositions"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const R = [["Ava's best friend", "taught", "code"], ["person on the 2nd-highest floor", "taught", "code"], ["best friend of the person on floor 19", "taught", "code"],
        ["best friend of the person on the highest floor", "RL only", "predict"]];
      const show = s === 1 ? 2 : s === 2 ? 3 : 4;
      R.slice(0, show).forEach(([t, tag, tone], i) => {
        const y = 10 + i * 46, now = (s === 1 && i < 2) || (s === 2 && i === 2) || (s === 3 && i === 3);
        c.box({ x: 10, y, w: 470, h: 38, label: t, size: 13, tone, hl: now });
        c.box({ x: 500, y, w: 130, h: 38, label: tag, size: 13, tone, hl: now });
      });
      if (s >= 4) {
        c.matrix({ x: 160, y: 226, cell: 118, cellH: 30, data: [["10,000", "10,000"], ["18,570", "11,666"], ["—", "10,000"], ["6,000", "12,000"]],
          rowLabels: ["taught, 8–9", "new chains, 8–9", "10–11 people", "RL updates"], colLabels: ["Base", "Extended"], rowLabelW: 150,
          tone: (i, j) => (s === 4 && j === 0) || (s === 5 && j === 1) ? "predict" : null });
      }
      if (s >= 5) c.box({ x: 420, y: 226, w: 210, h: 60, label: "12 people: test only", sub: "Extended generalization", tone: "bad", hl: true });
    };
  };

  D["contestants"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 10, y: 6, w: 620, h: 40, label: "124M · 12 layers · width 768 · GPT-2 tokens · 20B pretraining tokens", size: 13, tone: "muted", hl: s === 1 });
      const X = (u) => 110 + (u / 38147) * 360;
      c.text(10, 112, "unified", { size: 14, weight: 700, tone: "take" });
      c.text(10, 232, "staged", { size: 14, weight: 700, tone: "muted" });
      c.box({ x: X(0), y: 90, w: X(30000) - X(0) - 2, h: 40, label: "pretraining", size: 12, tone: "paper" });
      c.box({ x: X(0), y: 210, w: X(30000) - X(0) - 2, h: 40, label: "pretraining", size: 12, tone: "paper" });
      if (s >= 2) { c.line(X(30000), 70, X(30000), 280, { tone: "predict", dash: true, width: 1.5 }); c.text(X(30000), 66, "update 30,000", { size: 12, anchor: "middle", tone: "predict", weight: 700 }); }
      c.box({ x: X(30000) + 2, y: 210, w: X(38147) - X(30000) - 2, h: 40, label: "web", size: 11, tone: "paper" });
      if (s >= 3) c.box({ x: X(30000) + 2, y: 90, w: X(38147) - X(30000) - 2, h: 40, label: "+k", size: 12, tone: "take", hl: s === 3 });
      else c.box({ x: X(30000) + 2, y: 90, w: X(38147) - X(30000) - 2, h: 40, label: "web", size: 11, tone: "paper" });
      if (s >= 3) c.text(X(34000), 152, "+8…128 puzzle seqs (3–33%)", { size: 12, anchor: "middle", tone: "take" });
      if (s >= 4) c.box({ x: X(38147) + 2, y: 210, w: 60, h: 40, label: "1/2/4 ep", size: 11, tone: "take", hl: s === 4 });
      if (s >= 4) c.text(X(38147) + 32, 272, "LR 2e-4 or 5e-5", { size: 12, anchor: "middle", tone: "take" });
      if (s >= 5) {
        c.box({ x: 540, y: 90, w: 90, h: 40, label: "MaxRL +m", size: 12, tone: "predict", hl: true });
        c.box({ x: 540, y: 210, w: 90, h: 40, label: "MaxRL", size: 12, tone: "predict", hl: true });
        c.text(630, 310, "32 prompts × 16 samples · lr 1e-5 · no KL · m = 4…64", { size: 12, anchor: "end", tone: "predict" });
      }
    };
  };

  D["compute"] = (fig, k) => {
    const sm1 = k.slider({ label: "puzzle tokens before RL", min: 0, max: 2.14, step: 0.01, value: 1.07, fmt: (v) => `${v.toFixed(2)}B` });
    const sr = k.slider({ label: "RL tokens (ours)", min: 0.2, max: 4, step: 0.1, value: 1.5, fmt: (v) => `${v.toFixed(1)}B` });
    const c = k.canvas(W, H);
    const N = 123587328; // App. A.2
    return (s) => {
      c.clear();
      c.text(10, 28, "train: 6N per token", { size: 15, mono: true, weight: s === 1 ? 700 : 400, tone: s === 1 ? "predict" : "ink" });
      if (s >= 2) c.text(330, 28, "RL: 2N + 6N = 8N", { size: 15, mono: true, weight: s === 2 ? 700 : 400, tone: s === 2 ? "predict" : "ink" });
      if (s >= 3) c.text(10, 62, "C = 6N(T_pre + T_mid) + 8N·T_rollout + 6N·T_mix", { size: 15, mono: true, weight: s === 3 ? 700 : 400, tone: s === 3 ? "predict" : "ink" });
      if (s >= 4) {
        const pre = 6 * N * 20.0e9, mid = 6 * N * sm1.value * 1e9, rl = 8 * N * sr.value * 1e9, tot = pre + mid + rl;
        const parts = [["pretraining", pre, "paper"], ["midtraining", mid, "take"], ["RL", rl, "predict"]];
        let x = 10;
        parts.forEach(([l, v, t]) => { const w = (v / tot) * 620; if (w > 1) c.box({ x, y: 96, w: Math.max(2, w - 2), h: 50, label: w > 90 ? l : "", tone: t, size: 12 }); x += w; });
        parts.forEach(([l, v, t], i) => c.text(10 + i * 210, 176, `${l}: ${(v / 1e19).toFixed(3)}e19`, { size: 13, mono: true, tone: t, weight: 700 }));
        c.text(10, 210, `total ≈ ${(tot / 1e19).toFixed(2)} × 10¹⁹ FLOPs`, { size: 16, mono: true, weight: 700 });
      }
      if (s >= 5) {
        const xs = [0, 1, 2, 3, 4, 5, 6], best = [2, 5, 5, 8, 9, 9, 11];
        let px = 60; const pts = xs.map((v, i) => `${i ? "L" : "M"}${60 + v * 80},${330 - best[i] * 8}`).join(" ");
        c.path(pts, { tone: "ink", width: 2.2 });
        [[0, 2], [1, 5], [1.5, 3], [2.5, 4], [3, 8], [4, 9], [4.5, 7], [6, 11], [5.5, 6]].forEach(([a, b]) => c.dot(60 + a * 80, 330 - b * 8, { r: 4, tone: "muted" }));
        c.text(620, 260, "best checkpoint per budget", { size: 13, anchor: "end", weight: 700, tone: "predict" });
      }
    };
  };

  // ======================================================= PUZZLE RESULTS
  D["before-rl"] = (fig, k) => {
    const tg = k.toggle({ label: "test", options: ["taught p@1", "Base p@1", "Base p@16", "Ext p@16"], value: "taught p@1" });
    k.follow(tg, { 1: "taught p@1", 2: "Base p@1", 3: "Ext p@16", 4: "Base p@16", 5: "taught p@1" });
    const c = k.canvas(W, H);
    // Table 8: [taught p@1, Base p@1, Base p@16, Ext p@16]
    const R = [["unified 133M", [0.92, 0.12, 1.76, 0.00]], ["unified 267M", [7.23, 0.34, 4.67, 0.15]], ["unified 534M", [16.74, 0.55, 7.01, 0.81]], ["unified 1.07B", [35.60, 0.78, 8.98, 2.21]],
      ["unified 2.14B", [51.98, 1.31, 13.09, 2.34]], ["staged 1 ep", [78.76, 1.19, 8.34, 0.37]], ["staged 2 ep ★", [86.97, 1.86, 12.77, 0.37]], ["staged 4 ep", [90.70, 2.02, 12.77, 0.57]]];
    return (s) => {
      c.clear();
      const j = ["taught p@1", "Base p@1", "Base p@16", "Ext p@16"].indexOf(tg.value), max = [100, 2.5, 15, 3][j];
      title(c, `${tg.value} (%) before RL · staged at LR 2e-4 · ★ = picked for RL`, "muted");
      tbars(c, R.map(([l, v], i) => [l, v[j], (s === 1 && (i === 4 || i === 6)) || (s === 2 && (i === 4 || i === 6)) || (s === 3 && i === 4) || (s === 4 && i < 5) || (s === 5 && i === 7)]),
        { y: 30, h: 320, labelW: 140, max, fmt: (v) => v.toFixed(2), tone: j === 0 ? "code" : "paper" });
    };
  };

  // ≈ read off Fig. 4 by us (pass@1 %, mean of two seeds), x = midtraining epochs during RL
  const FIG4 = { base: { x: [0.03, 0.06, 0.12, 0.24, 0.48], "2.14B": [25, 30, 39.5, 32.5, 28.5], "1.07B": [19, 18.5, 20, 26, 25], "534M": [15, 17.5, 16.5, 19, 16.5], "267M": [6, 7.5, 9.5, 9.5, 11], "133M": [0.5, 1.5, 3, 3.5, 3.5] },
    ext: { x: [0.06, 0.12, 0.24, 0.48, 0.96], "2.14B": [19, 23, 21.3, 23.7, 23.7], "1.07B": [15.2, 14, 16.8, 18.5, 19], "534M": [9.7, 11.7, 11.3, 13.7, 12.5], "267M": [5.1, 4.5, 6.8, 6.1, 7.3] } };
  D["final-accuracy"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 4) {
        // staged: Table 9 (2 ep, 2e-4); unified best: ≈ Fig. 4
        const R = [["Base", 24.54, 39], ["Extended", 16.91, 24], ["12 people", 5.58, 13]];
        const show = s === 1 ? 1 : s === 2 ? 1 : s === 3 ? 2 : 3;
        title(c, "pass@1 after RL (%) · grey: staged (Table 9) · blue: best unified (≈ Fig. 4)", "muted");
        c.bars({ x: 10, y: 34, w: 620, rowH: 96, labelW: 110, max: 45, fmt: (v) => (Number.isInteger(v) ? `≈${v}` : v.toFixed(2)), tones: ["muted", "paper"],
          rows: R.slice(0, show).map(([l, a, b], i) => ({ label: l, values: s === 1 ? [a, NaN] : [a, b], hl: i === show - 1 })) });
      } else {
        const F = FIG4.base, ser = ["133M", "267M", "534M", "1.07B", "2.14B"].map((m, i) => ({ x: F.x, y: F[m], tone: i < 3 ? "muted" : "paper", dots: true, label: m, labelAt: 4, dim: i < 3 && false }));
        ser.push({ x: [0.03, 0.48], y: [24.54, 24.54], tone: "bad", dash: true, label: "staged 24.54", labelAt: 0 });
        c.plot({ x: 0, y: 0, w: 640, h: 360, xmin: 0.02, xmax: 0.55, xlog: true, ymin: 0, ymax: 42, series: ser, xlabel: "puzzle corpus passes during RL (Base, ≈ Fig. 4)", ylabel: "pass@1 (%)", xFmt: (v) => String(v), yFmt: (v) => v.toFixed(0) });
      }
    };
  };

  D["reuse"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table 9, pass@1
    const T9 = [[21.79, 16.14, 6.58], [12.24, 9.88, 3.18], [24.54, 16.91, 5.58], [12.74, 7.25, 2.17], [15.15, 11.64, 4.10], [18.82, 6.96, 2.15]];
    return (s) => {
      c.clear();
      if (s <= 2) {
        title(c, "staged pass@1 after RL (%), Table 9", "muted");
        c.matrix({ x: 200, y: 64, cell: 130, cellH: 40, data: T9, fmt: (v) => v.toFixed(2), size: 14,
          rowLabels: ["1 ep · 2e-4", "1 ep · 5e-5", "2 ep · 2e-4", "2 ep · 5e-5", "4 ep · 2e-4", "4 ep · 5e-5"], colLabels: ["Base", "Extended", "12 people"], rowLabelW: 180,
          tone: (i, j) => (s === 1 && j === 0 && i % 2 === 0 ? (i === 2 ? "code" : i === 4 ? "bad" : "predict") : s === 2 && i === 5 && j < 2 ? (j === 0 ? "code" : "bad") : null) });
      } else {
        const key = s === 4 ? "ext" : "base", F = FIG4[key];
        const ser = Object.keys(F).filter((m) => m !== "x").map((m) => ({ x: F.x, y: F[m], tone: m === "2.14B" || m === "1.07B" ? "paper" : "muted", dots: true, label: m, labelAt: F.x.length - 1 }));
        ser.push({ x: [F.x[0], F.x[4]], y: [key === "base" ? 24.54 : 16.91, key === "base" ? 24.54 : 16.91], tone: "bad", dash: true, label: "staged", labelAt: 0 });
        c.plot({ x: 0, y: 0, w: 640, h: s === 5 ? 280 : 360, xmin: F.x[0] * 0.8, xmax: F.x[4] * 1.15, xlog: true, ymin: 0, ymax: key === "base" ? 42 : 26, series: ser,
          xlabel: `${key === "base" ? "Base" : "Extended"}: puzzle passes during RL (≈ Fig. 4)`, ylabel: "pass@1 (%)", xFmt: (v) => String(v), yFmt: (v) => v.toFixed(0) });
        if (s === 5) c.box({ x: 10, y: 296, w: 620, h: 52, label: "🧠 repeats beside fresh web text overfit less", size: 14, tone: "take", hl: true });
      }
    };
  };

  D["frontier"] = (fig, k) => {
    const tg = k.toggle({ label: "metric", options: ["accuracy", "coverage"], value: "accuracy" });
    k.follow(tg, { 1: "accuracy", 4: "coverage", 5: "accuracy" });
    const c = k.canvas(W, H);
    // sketched by us from Fig. 1 (Extended), approximate
    const UA = { x: [1.5, 1.55, 1.6, 1.65, 1.7, 1.75, 1.8, 1.85, 1.9, 1.95, 2.0, 2.05, 2.12], y: [0, 1, 3, 6, 10, 12, 14, 17, 20, 22, 24, 25, 26] };
    const SA = { x: [1.5, 1.54, 1.56, 1.6, 1.65, 1.7, 1.8, 1.9, 2.0, 2.12], y: [0, 0, 6, 10, 12, 14, 16, 17, 18, 19] };
    const UC = { x: [1.5, 1.55, 1.58, 1.62, 1.66, 1.7, 1.75, 1.8, 1.85, 1.9, 1.95, 2.0, 2.05, 2.12], y: [0, 5, 15, 30, 40, 48, 55, 60, 66, 72, 74, 77, 80, 80] };
    const SC = { x: [1.5, 1.54, 1.55, 1.57, 1.6, 1.65, 1.7, 1.8, 1.9, 2.0, 2.12], y: [0, 0, 27, 45, 50, 55, 57, 59, 62, 65, 68] };
    return (s) => {
      c.clear();
      const acc = tg.value === "accuracy", U = acc ? UA : UC, S = acc ? SA : SC;
      const ser = s === 1 ? [{ ...U, tone: "paper", dotsOnly: true }, { ...S, tone: "muted", dotsOnly: true }]
        : [{ ...U, tone: "paper", label: `unified ≈${U.y[U.y.length - 1]}%`, labelAt: U.x.length - 3, width: s === 3 || s === 4 ? 3 : 2 }, { ...S, tone: "muted", dash: true, label: `staged ≈${S.y[S.y.length - 1]}%`, labelAt: S.x.length - 2 }];
      c.plot({ x: 0, y: 0, w: 640, h: s === 5 ? 290 : 360, xmin: 1.5, xmax: 2.12, ymin: 0, ymax: acc ? 30 : 90, series: ser, xlabel: "total compute (× 10¹⁹ FLOPs), Extended", ylabel: `${acc ? "accuracy pass@1" : "coverage pass@16"} (%)`, xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
      if (s === 2) c.text(80, 30, "best observed so far, per budget", { size: 13, weight: 700, tone: "predict" });
      if (s === 5) c.box({ x: 10, y: 300, w: 620, h: 50, label: "12-person puzzles: unified on the frontier at nearly every budget", size: 14, tone: "code", hl: true });
    };
  };

  D["loss-agg-results"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [["same data, two sums", "shared mean vs α ∈ {0.1, 0.5}", "muted"], ["Base, 12 people", "best seen: shared loss", "code"],
      ["Extended", "separate often better; α varies", "bad"], ["α = 1", "no new best", "muted"], ["overall", "competitive, not consistent", "predict"]];
    return (s) => board(c, rows, s, 6, 70, 270);
  };

  D["retention-puzzle"] = (fig, k) => {
    const tg = k.toggle({ label: "show", options: ["held-out loss", "benchmark mean", "TruthfulQA"], value: "held-out loss" });
    k.follow(tg, { 1: "held-out loss", 2: "held-out loss", 3: "benchmark mean", 4: "held-out loss", 5: "TruthfulQA" });
    const c = k.canvas(W, H);
    // Table 11: [loss, mean, TQA]
    const R = [["pretraining only", 2.537, 42.37, 39.15], ["unified 133M", 2.537, 42.23, 39.09], ["unified 267M", 2.538, 42.42, 39.17], ["unified 534M", 2.538, 41.85, 39.57],
      ["unified 1.07B", 2.539, 42.14, 39.43], ["unified 2.14B", 2.540, 42.00, 39.46], ["staged gentlest", 4.135, 38.49, 42.35], ["staged RL pick", 12.356, 35.05, 48.57]];
    return (s) => {
      c.clear();
      const j = ["held-out loss", "benchmark mean", "TruthfulQA"].indexOf(tg.value) + 1;
      title(c, j === 1 ? "held-out web loss, nats (Table 11)" : `${tg.value}, % (Table 11)`, "muted");
      const hl = (i) => (s === 1 && i === 0) || (s === 2 && i >= 1 && i <= 5) || (s === 3 && i === 6) || (s === 4 && i === 7) || (s === 5 && i >= 6);
      tbars(c, R.map((r, i) => [r[0], r[j], hl(i)]), { y: 30, h: 320, labelW: 150, max: j === 1 ? 13 : 50, fmt: (v) => (j === 1 ? v.toFixed(3) : v.toFixed(2)), tone: j === 1 ? "bad" : "paper" });
    };
  };

  D["pretrain-in-rl"] = (fig, k) => {
    const tg = k.toggle({ label: "show", options: ["loss", "benchmark"], value: "loss" });
    k.follow(tg, { 1: "loss", 3: "benchmark", 4: "loss" });
    const c = k.canvas(W, H);
    // Table 10: setting, without/with loss, without/with benchmark mean
    const R = [["Base 534M · 8", 2.570, 2.542, 41.66, 42.13], ["Base 534M · 32", 2.575, 2.535, 41.65, 41.98], ["Base 2.14B · 8", 2.572, 2.545, 41.93, 42.08], ["Base 2.14B · 32", 2.571, 2.537, 42.01, 41.85],
      ["Ext 534M · 8", 2.613, 2.546, 41.60, 42.25], ["Ext 534M · 32", 2.617, 2.537, 41.24, 41.90], ["Ext 2.14B · 8", 2.605, 2.549, 41.63, 42.00], ["Ext 2.14B · 32", 2.601, 2.539, 41.67, 41.95]];
    return (s) => {
      c.clear();
      const L = tg.value === "loss", base = L ? 2.5 : 41;
      title(c, L ? "held-out loss after RL; bars start at 2.5 nats · grey without, green with web" : "benchmark mean; bars start at 41% · grey without, green with web", "muted");
      c.bars({ x: 10, y: 30, w: 620, rowH: s === 4 ? 30 : 40, labelW: 140, max: L ? 0.13 : 1.3, fmt: (v) => (v + base).toFixed(L ? 3 : 2), tones: ["muted", "code"],
        rows: R.map((r) => ({ label: r[0], values: s === 1 ? [(L ? r[1] : r[3]) - base, NaN] : [(L ? r[1] : r[3]) - base, (L ? r[2] : r[4]) - base], hl: s === 2 && r[0] === "Ext 534M · 8" })) });
      if (s === 4) c.box({ x: 10, y: 290, w: 620, h: 56, label: "but reasoning accuracy and coverage fall in most runs (Fig. 13)", size: 14, tone: "bad", hl: true });
    };
  };

  // ======================================================= REAL-WORLD STUDY
  D["real-setup"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const m = c.box({ x: 10, y: 20, w: 140, h: 64, label: "0.76B model", sub: "24 layers · 1536", tone: "take", hl: s === 1 });
      if (s >= 2) { const p = c.box({ x: 180, y: 20, w: 140, h: 64, label: "354.53B", sub: "ClimbMix", tone: "paper", hl: s === 2, mono: true });
        const d = c.box({ x: 340, y: 20, w: 120, h: 64, label: "17.73B", sub: "Dolmino", tone: "paper", hl: s === 2, mono: true }); c.connect(m, p); c.connect(p, d);
        if (s >= 3) { const r = c.box({ x: 490, y: 20, w: 140, h: 64, label: "math RL", sub: "12,000 × 512", tone: "predict", hl: s === 3 }); c.connect(d, r);
          c.text(630, 108, "11,977 Math12K prompts · lr 1e-6", { size: 12, anchor: "end", tone: "predict" }); } }
      if (s >= 4) c.box({ x: 10, y: 140, w: 380, h: 64, label: "extra corpus: 240M tokens, 24 sources", sub: "web · math · code · QA · reasoning", tone: "take", hl: s === 4 });
      if (s >= 5) {
        c.box({ x: 10, y: 236, w: 620, h: 48, label: "unified: mix 0–5% of this corpus into the RL batches", size: 14, tone: "code", hl: true });
        c.box({ x: 10, y: 296, w: 620, h: 48, label: "staged: train on this corpus first, then RL", size: 14, tone: "muted" });
      }
    };
  };

  D["real-base"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table 14
    const R = [["MATH-500", [6.54, 43.76]], ["GSM8K", [17.84, 71.63]], ["HumanEval+", [11.97, 32.32]], ["MBPP+", [21.05, 57.14]], ["MMLU", [37.00, NaN]], ["SciQ", [51.00, NaN]], ["ARC-Challenge", [31.23, NaN]]];
    return (s) => {
      c.clear();
      title(c, "base model before math RL (%), Table 14 · blue pass@1 · green pass@32", "muted");
      const hl = (i) => (s === 1 && i < 2) || (s === 2 && i < 2) || (s === 3 && i >= 2 && i < 4) || (s === 4 && i >= 4);
      c.bars({ x: 10, y: 30, w: 620, rowH: 44, labelW: 130, max: 80, fmt: (v) => v.toFixed(2), tones: ["paper", "code"],
        rows: R.map(([l, v], i) => ({ label: l, values: s === 1 && i < 2 ? [v[0], NaN] : v, hl: hl(i), dim: !hl(i) })) });
      if (s === 4) c.text(630, 350, "held-out corpus loss 1.4352 nats", { size: 13, anchor: "end", mono: true, tone: "predict", weight: 700 });
    };
  };

  const MIX = ["0%", "0.1%", "0.2%", "0.5%", "1%", "2%", "5%", "base", "staged"];
  D["mix-math"] = (fig, k) => {
    const tg = k.toggle({ label: "metric", options: ["MATH p@1", "GSM8K p@1", "MATH p@64"], value: "MATH p@1" });
    k.follow(tg, { 1: "MATH p@1", 2: "GSM8K p@1", 3: "MATH p@64", 4: "MATH p@1" });
    const c = k.canvas(W, H);
    const T15 = { "MATH p@1": [16.83, 16.90, 16.56, 16.83, 16.11, 16.68, 16.91, 6.54, 16.98], "GSM8K p@1": [32.68, 32.14, 32.35, 31.71, 31.61, 31.30, 30.80, 17.84, 31.35], "MATH p@64": [66.73, 65.75, 65.03, 65.60, 65.85, 67.51, 67.45, 53.67, 66.17] }; // Table 15
    return (s) => {
      c.clear();
      const v = T15[tg.value];
      title(c, `${tg.value} (%) after RL, by midtraining share · Table 15`, "muted");
      const hl = (i) => (s === 1 && (i === 0 || i === 6 || i === 8)) || (s === 2 && (i === 0 || i === 6)) || (s === 3 && (i === 0 || i === 5)) || (s === 4 && i === 7);
      tbars(c, MIX.map((m, i) => [m, v[i], hl(i)]), { y: 30, h: 320, labelW: 90, max: tg.value === "MATH p@64" ? 70 : 35, fmt: (x) => x.toFixed(2), tone: "paper" });
    };
  };

  D["mix-retention"] = (fig, k) => {
    const tg = k.toggle({ label: "metric", options: ["Δloss", "SciQ", "MMLU", "ARC-C"], value: "Δloss" });
    k.follow(tg, { 1: "Δloss", 3: "SciQ", 4: "MMLU", 5: "ARC-C" });
    const c = k.canvas(W, H);
    // Table 16
    const T16 = { "Δloss": [0.0737, -0.0154, -0.0516, -0.0871, -0.1076, -0.1269, -0.1474, 0, 0.0472], SciQ: [50.20, 54.60, 54.30, 62.00, 66.10, 67.00, 65.10, 51.00, 53.00],
      MMLU: [37.12, 39.30, 40.04, 39.99, 40.54, 40.66, 40.77, 37.00, 37.46], "ARC-C": [27.90, 29.69, 31.06, 32.34, 33.53, 34.22, 30.12, 31.23, 31.48] };
    return (s) => {
      c.clear();
      const v = T16[tg.value];
      if (tg.value === "Δloss") {
        title(c, "change in held-out corpus loss vs base (nats) · green = better · Table 16", "muted");
        dbars(c, k, MIX.map((m, i) => [m, v[i], (s === 1 && (i === 0 || i === 8)) || (s === 2 && i >= 1 && i <= 6)]), { y: 36, rowH: 34, labelW: 90, max: 0.15, negGood: true, fmt: (x) => (x > 0 ? "+" : "") + f3(x) });
      } else {
        title(c, `${tg.value} accuracy (%) after math RL · Table 16`, "muted");
        const hl = (i) => (s === 3 && (i === 0 || i === 5)) || (s === 4 && (i === 0 || i === 6)) || (s === 5 && (i === 5 || i === 6));
        tbars(c, MIX.map((m, i) => [m, v[i], hl(i)]), { y: 30, h: 320, labelW: 90, max: tg.value === "SciQ" ? 70 : 45, fmt: (x) => x.toFixed(2), tone: "code" });
      }
    };
  };

  D["mix-coding"] = (fig, k) => {
    const c = k.canvas(W, H);
    const MB = [25.41, 24.82, 23.71, 21.05, 19.31, 19.23, 20.97, 21.05, 25.74], HE = [15.17, 14.44, 13.76, 11.97, 11.66, 11.55, 10.90, 11.97, 15.51]; // Table 16
    return (s) => {
      c.clear();
      if (s <= 2) {
        title(c, "coding pass@1 (%) after math RL · blue MBPP+ · violet HumanEval+ · Table 16", "muted");
        c.bars({ x: 10, y: 30, w: 620, rowH: 35, labelW: 90, max: 30, fmt: (x) => x.toFixed(2), tones: ["paper", "take"],
          rows: MIX.map((m, i) => ({ label: m, values: [MB[i], HE[i]], hl: (s === 1 && (i === 0 || i === 6)) || (s === 2 && (i === 3 || i === 7)) })) });
      } else {
        title(c, "coding pass@32 (%), App. D.2 and Table 14", "muted");
        tbars(c, [["RL only (0%)", 44.62, false], ["5% mix", 45.17, true], ["base model", 44.73, false]], { y: 40, h: 150, labelW: 130, max: 50, fmt: (x) => x.toFixed(2), tone: "code" });
        if (s >= 4) {
          c.text(10, 236, "🧠 the corpus is 24.8% raw code (App. D.4)", { size: 14, weight: 700, tone: "take" });
          c.box({ x: 10, y: 252, w: 620 * 0.248, h: 50, label: "code 24.8%", size: 12, tone: "take", hl: true });
          c.box({ x: 10 + 620 * 0.248 + 2, y: 252, w: 620 * 0.752 - 2, h: 50, label: "web, math, QA, reasoning", size: 13, tone: "muted" });
        }
      }
    };
  };

  D["schedules"] = (fig, k) => {
    const c = k.canvas(W, H);
    const a = 0.005, fs = { constant: () => a, "decay 1%→0": (u) => 2 * a * (1 - u), "ramp 0→1%": (u) => 2 * a * u, "half anneal 2%→0": (u) => 4 * a * Math.max(1 - 2 * u, 0) }; // App. A.1
    const TONE = { constant: "muted", "decay 1%→0": "paper", "ramp 0→1%": "take", "half anneal 2%→0": "predict" };
    // Table 17
    const T = { constant: [24.27, 16.51, 0.0871], "decay 1%→0": [24.70, 17.76, 0.0833], "ramp 0→1%": [24.01, 16.33, 0.0872], "half anneal 2%→0": [24.80, 18.85, 0.0634] };
    return (s) => {
      c.clear();
      const us = []; for (let i = 0; i <= 100; i++) us.push(i / 100);
      c.plot({ x: 0, y: 0, w: 640, h: 190, xmin: 0, xmax: 1, ymin: 0, ymax: 2.1, series: Object.keys(fs).map((n) => ({ x: us, y: us.map((u) => 100 * fs[n](u)), tone: TONE[n], label: n, labelAt: n === "constant" ? 90 : n.startsWith("half") ? 30 : n.startsWith("decay") ? 25 : 80, width: s === 3 && n.startsWith("half") ? 3.4 : 2 })),
        xlabel: "fraction of training done", ylabel: "mix %", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
      const m = s === 1 ? null : s === 2 ? 0 : s === 3 ? 1 : 2, name = ["Math pass@1 (%)", "Coding pass@1 (%)", "retention: −Δloss (nats)"][m ?? 0];
      if (m !== null && s < 5) {
        c.text(10, 214, `${name} · Table 17`, { size: 13, weight: 700, tone: "predict" });
        c.bars({ x: 10, y: 222, w: 620, rowH: 33, labelW: 150, max: [26, 20, 0.1][m], fmt: (x) => (m === 2 ? x.toFixed(4) : x.toFixed(2)), tones: ["paper"],
          rows: Object.keys(T).map((n) => ({ label: n, values: [T[n][m]], hl: (m >= 1 && n.startsWith("half")) || (m === 2 && n === "constant") })) });
      }
      if (s >= 5) c.box({ x: 10, y: 240, w: 620, h: 80, label: "stop early → better new task · keep mixing → remember more", size: 15, tone: "predict", hl: true });
    };
  };

  D["code-data"] = (fig, k) => {
    const tg = k.toggle({ label: "schedule", options: ["constant 0.5%", "anneal 0.5%→0"], value: "constant 0.5%" });
    k.follow(tg, { 1: "constant 0.5%", 3: "anneal 0.5%→0" });
    const c = k.canvas(W, H);
    // Table 18: MBPP+, HumanEval+
    const T = { "constant 0.5%": [["original", 21.05, 11.97], ["code removed", 23.66, 13.64], ["code replaced", 20.80, 12.12]], "anneal 0.5%→0": [["original", 23.69, 14.41], ["code removed", 24.01, 14.33], ["code replaced", 23.38, 13.11]] };
    return (s) => {
      c.clear();
      if (s === 1) {
        c.text(10, 30, "designated code sources: 24.8% of the corpus", { size: 14, weight: 700, tone: "take" });
        ["CraneCode", "StackEdu-FIM", "Code Meta-Reasoning"].forEach((n, i) => c.box({ x: 10 + i * 210, y: 50, w: 200, h: 50, label: n, size: 13, tone: "take", hl: true }));
      }
      title(c, `${tg.value}: coding pass@1 (%) · blue MBPP+ · violet HumanEval+ · Table 18`, "muted", s === 1 ? 140 : 16);
      c.bars({ x: 10, y: s === 1 ? 156 : 40, w: 620, rowH: s === 1 ? 60 : 80, labelW: 130, max: 30, fmt: (x) => x.toFixed(2), tones: ["paper", "take"],
        rows: T[tg.value].map(([l, a, b], i) => ({ label: l, values: [a, b], hl: (s === 2 && i === 1) || (s === 3 && i < 2) || (s === 4 && i === 2) })) });
      if (s === 4) c.box({ x: 10, y: 300, w: 620, h: 48, label: "replacement raised coverage under annealing, not accuracy", size: 14, tone: "predict", hl: true });
    };
  };

  D["continual"] = (fig, k) => {
    const tg = k.toggle({ label: "metric", options: ["MBPP+ p@1", "HE+ p@1", "MBPP+ p@16"], value: "MBPP+ p@1" });
    k.follow(tg, { 1: "MBPP+ p@1", 3: "MBPP+ p@1", 4: "MBPP+ p@16" });
    const c = k.canvas(W, H);
    const M = ["staged", "unified 0.5%", "unified 1%", "unified 2%", "unified 5%"];
    const START = { "MBPP+ p@1": [25.74, 21.05, 19.31, 19.23, 20.97], "HE+ p@1": [15.51, 11.97, 11.66, 11.55, 10.90] }; // Table 16 (end of math RL)
    const END = { "MBPP+ p@1": [29.81, 30.31, 29.94, 31.76, 32.69], "HE+ p@1": [22.94, 23.67, 23.70, 24.09, 24.96], "MBPP+ p@16": [52.12, 52.91, 54.76, 56.88, 58.47] }; // Table 22
    return (s) => {
      c.clear();
      if (s === 1) {
        const a = c.box({ x: 10, y: 40, w: 250, h: 70, label: "math-RL model", sub: "staged or unified 0.5–5%", tone: "paper" });
        const b = c.box({ x: 380, y: 40, w: 250, h: 70, label: "coding RL", sub: "4,000 updates, no mixing", tone: "predict", hl: true });
        c.connect(a, b, { tone: "predict" });
        c.text(10, 160, "20,000 KodCode problems · reward 1 if all unit tests pass", { size: 14, tone: "predict" });
        c.text(10, 190, "same coding RL for every model (Table 21)", { size: 14, tone: "muted" });
        return;
      }
      if (s === 5) {
        c.box({ x: 10, y: 60, w: 620, h: 80, label: "WebInstruct: 2% and 5% start lower, end higher after 3,000 updates", size: 15, tone: "code", hl: true });
        c.text(10, 180, "qualitative (Fig. 29); 2% also higher pass@64, 5% slightly lower", { size: 13, tone: "muted" });
        return;
      }
      const key = tg.value, st = START[key];
      title(c, st ? `${key} (%): grey = before coding RL (Table 16), blue = after (Table 22)` : `${key} (%) after coding RL (Table 22)`, "muted");
      c.bars({ x: 10, y: 34, w: 620, rowH: 62, labelW: 120, max: st ? 36 : 62, fmt: (x) => x.toFixed(2), tones: st ? ["muted", "paper"] : ["paper"],
        rows: M.map((m, i) => ({ label: m, values: st ? (s === 2 ? [st[i], NaN] : [st[i], END[key][i]]) : [END[key][i]], hl: s >= 3 && (i === 0 || i === 4) })) });
    };
  };

  D["maxrl-vs-rf"] = (fig, k) => {
    const tg = k.toggle({ label: "metric", options: ["Math p@1", "Math p@32", "Δloss", "SciQ"], value: "Math p@1" });
    k.follow(tg, { 1: "Math p@1", 2: "Math p@32", 3: "Δloss", 4: "Math p@1", 5: "SciQ" });
    const c = k.canvas(W, H);
    const S = ["constant 0.5%", "constant 1%", "constant 2%", "constant 5%", "half anneal 1%", "half anneal 2%"];
    // REINFORCE − MaxRL from Table 20
    const Dd = { "Math p@1": [-1.29, 0.65, 0.82, -0.13, 0.33, 0.35], "Math p@32": [-3.03, -1.84, -1.91, -1.50, -4.14, -2.77], "Δloss": [-0.033, -0.036, -0.030, -0.025, -0.048, -0.047], SciQ: [11.90, 4.20, 4.70, 6.10, 7.90, 4.80] };
    return (s) => {
      c.clear();
      const m = tg.value, v = Dd[m], loss = m === "Δloss";
      title(c, `REINFORCE − MaxRL, ${m} (${loss ? "nats; negative = REINFORCE retains more" : "points; positive = REINFORCE higher"}) · Table 20`, "muted");
      dbars(c, k, S.map((n, i) => [n, v[i], (s === 4 && (i === 0 || i === 2)) || (s !== 4 && s > 1)]), { y: 44, rowH: 48, labelW: 130, max: loss ? 0.05 : m === "SciQ" ? 12 : 4.2, negGood: loss,
        fmt: (x) => (x > 0 ? "+" : "") + (loss ? f3(x) : f2(x)) });
      if (s === 5) c.text(10, 344, "🧠 MaxRL pushes hard prompts (coverage); REINFORCE changes less (retention)", { size: 13, tone: "take", weight: 700 });
    };
  };

  D["kl-vs-mix"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const us = []; for (let i = 0; i <= 24; i++) us.push(i * 500);
      const rise = (end) => us.map((u) => end * (1 - Math.exp(-u / 3000)));
      const ser = [
        { x: us, y: rise(0.065), tone: "muted", label: "β = 0.001", labelAt: 22, dim: s === 4, width: s === 2 ? 2.6 : 1.8 },
        { x: us, y: rise(0.04), tone: "paper", label: "β = 0.01", labelAt: 18, dim: s === 4, width: s === 2 ? 2.6 : 1.8 },
        { x: us, y: rise(0.015), tone: "take", label: "β = 0.1", labelAt: 14, dim: s === 4, width: s === 2 || s === 3 ? 3 : 1.8 }];
      if (s >= 4) ser.push({ x: us, y: rise(-0.1269), tone: "code", label: "mix 2% (ends −0.127)", labelAt: 16, width: 3 });
      c.plot({ x: 0, y: 0, w: 640, h: s >= 3 ? 280 : 360, xmin: 0, xmax: 12000, ymin: -0.14, ymax: 0.09, series: ser, xlabel: "RL updates (shapes illustrative)", ylabel: "Δ held-out loss vs base", xFmt: (v) => (v / 1000).toFixed(0) + "k", yFmt: (v) => v.toFixed(2) });
      if (s === 3) c.box({ x: 10, y: 296, w: 620, h: 52, label: "β = 0.1: least drift, but math accuracy and coverage drop", size: 14, tone: "bad", hl: true });
      if (s === 4) c.box({ x: 10, y: 296, w: 620, h: 52, label: "mixing goes below the start; KL only slows the rise", size: 14, tone: "code", hl: true });
      if (s === 5) c.box({ x: 10, y: 296, w: 620, h: 52, label: "every mix beats every KL run on MMLU (App. E)", size: 14, tone: "predict", hl: true });
    };
  };

  // ======================================================= YOUR MOVE
  D["related"] = (fig, k) => {
    const c = k.canvas(W, H);
    const E = [["InstructGPT", 2022, 0, "paper"], ["STaR", 2022, 2, "take"], ["RAFT", 2023, 2, "take"], ["ReST-EM", 2024, 2, "take"], ["LUFFY", 2025, 1, "paper"], ["UFT", 2025, 1, "paper"],
      ["SRFT", 2026, 1, "paper"], ["CHORD", 2026, 1, "paper"], ["MaxRL", 2026, 3, "code"], ["this paper", 2026, 3, "predict"]];
    return (s) => {
      c.clear();
      const X = (y) => 60 + (y - 2022) * 130;
      c.line(40, 300, 620, 300, { tone: "muted", width: 1.5 });
      [2022, 2023, 2024, 2025, 2026].forEach((y) => c.text(X(y), 322, String(y), { size: 12, anchor: "middle", mono: true, tone: "muted" }));
      const grp = { 1: [0], 2: [1], 3: [2], 4: [3], 5: [3] }[s];
      const cnt = {};
      E.forEach(([n, y, g, t]) => {
        const off = (cnt[y] = (cnt[y] || 0) + 1) - 1;
        const on = s >= 5 || (g === 0 && s >= 1) || (g === 1 && s >= 2) || (g === 2 && s >= 3) || (g === 3 && s >= 4);
        if (!on) return;
        const yy = 250 - off * 46;
        c.box({ x: X(y) - 52, y: yy, w: 104, h: 36, label: n, size: 12, tone: t, hl: (s === 1 && g === 0) || (s === 2 && g === 1) || (s === 3 && g === 2) || (s === 4 && g === 3) });
      });
      if (s >= 5) c.box({ x: 10, y: 10, w: 330, h: 40, label: "🧠 old ingredients, new unification", size: 14, tone: "take", hl: true });
    };
  };

  D["code-map"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const F = [["rollout_common.py", "weight_groups: 1/p̂", 10, 20], ["gen_service.py", "vLLM generator · hard filter", 330, 20], ["hf_trainer.py", "weighted_ce_sums", 10, 130],
        ["corpus_mix.py", "allocate example counts", 330, 130], ["huggingface: sfanm/unified-training", "checkpoints · Apache-2.0", 10, 240]];
      F.forEach(([f, sub, x, y], i) => {
        const now = (s === 1 && i === 0) || (s === 2 && i === 1) || (s === 3 && i === 2) || (s === 4 && (i === 3 || i === 1)) || (s === 5 && i === 4);
        c.box({ x, y, w: i === 4 ? 620 : 300, h: 80, label: f, sub, tone: now ? "code" : "muted", hl: now, mono: true, size: 14 });
      });
    };
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [["Scale", "124M and 0.76B · one task (§7)", "bad"], ["Seeds", "two · some gaps < 1 point", "bad"], ["Unified puzzle finals", "only in figures", "predict"],
      ["Staged baseline", "sync, baseline, 16 GPUs (D.6)", "predict"], ["Mixed pretraining", "bigger batch, same LR (A.1)", "predict"], ["🧠 Steelman", "2.54 vs 12.36 loss: no seeds needed", "code"]];
    return (s) => board(c, rows, s, 4, 59, 250);
  };

  D["tts-verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [["Sources", "speech pretrain · SFT voice · RL samples", "bridge"], ["Reward", "CER < threshold → 1 · weight 1/p̂", "bridge"],
      ["Mix 0.5–2% old data", "Δloss +0.0737 → −0.1269 (Table 16)", "code"], ["Mixing vs KL", "KL β = 0.1 cut accuracy (App. E)", "code"], ["🧠 Verdict", "yes for the RL stage; verify on speech", "predict"]];
    return (s) => board(c, rows, s, 6, 70, 250);
  };

  D["tts-recipe"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 10, y: 20, w: 520, h: 70, label: "32 texts × 16 samples = 512 TTS samples", size: 14, tone: "bridge", hl: s === 1 });
      c.box({ x: 534, y: 20, w: 96, h: 70, label: "~2% SFT", size: 13, tone: "paper", hl: s === 1 });
      if (s >= 2) { c.chips({ x: 10, y: 110, items: [{ t: "ASR ✓ → 1/p̂", tone: "code", hl: s === 2 }, { t: "ASR ✗ → 0", tone: "bad" }, { t: "SFT → 1", tone: "paper" }, { t: "one token mean", tone: "predict", hl: s === 2 }], size: 14, gap: 12 }); }
      if (s >= 3) c.box({ x: 10, y: 160, w: 620, h: 44, label: "speaker similarity score → TailRL thresholds", size: 14, tone: "take", hl: s === 3 });
      if (s >= 4) {
        const us = [0, 0.5, 1], X = (u) => 30 + u * 280, Y = (f) => 320 - f * 22;
        c.path(`M${X(0)},${Y(4)} L${X(0.5)},${Y(0)} L${X(1)},${Y(0)}`, { tone: "predict", width: 2.6 });
        c.line(X(0), 320, X(1), 320, { tone: "muted", width: 1 });
        c.text(X(0), 236, "mix %", { size: 12, tone: "muted" });
        c.text(X(1), 340, "end of RL", { size: 12, anchor: "end", tone: "muted" });
        c.text(X(0.5) + 10, 300, "half anneal", { size: 13, tone: "predict", weight: 700 });
      }
      if (s >= 5) c.box({ x: 360, y: 230, w: 270, h: 100, label: "track: CER pass@k and held-out SFT loss", size: 14, tone: "code", hl: true });
    };
  };

  D["try-next"] = (fig, k) => {
    const c = k.canvas(W, H);
    const I = [["dose sweep", 0.2, 0.6], ["MaxRL vs REINFORCE", 0.3, 0.45], ["blend SFT into pretraining", 0.8, 0.8], ["continual languages", 0.65, 0.65]];
    return (s) => {
      c.clear();
      const X = (v) => 70 + v * 540, Y = (v) => 310 - v * 270;
      c.line(X(0), Y(0), X(1), Y(0), { tone: "muted", width: 1.2 }); c.line(X(0), Y(0), X(0), Y(1), { tone: "muted", width: 1.2 });
      c.text(X(1), Y(0) + 26, "effort →", { size: 12, anchor: "end", tone: "muted" });
      c.text(X(0) + 6, Y(1) + 4, "what you learn ↑", { size: 12, tone: "muted" });
      I.forEach(([n, e, l], i) => { if (s < i + 1) return; c.dot(X(e), Y(l), { r: 8, tone: s === i + 1 ? "predict" : "take" }); c.label(X(e), Y(l) - 18, n, { size: 13, weight: s === i + 1 ? 700 : 400, anchor: "middle" }); });
    };
  };
})();
