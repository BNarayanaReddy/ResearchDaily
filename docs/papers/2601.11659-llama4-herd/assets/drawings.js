/* Drawings for the Llama 4 Herd lesson (arXiv:2601.11659v1, withdrawn, unofficial survey).
   One entry per data-draw name; each is redrawn on every step and control change.
   Numbers from the document carry a // Table N or // §N comment; everything else is
   illustrative layout or our arithmetic, as each page's caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // a checklist board: rows [question, answer, tone]; row i appears on step i + 1
  const board = (c, rows, s, top = 8, rowH = 66) => { c.clear(); rows.forEach(([q, a, tone], i) => {
    if (s < i + 1) return;
    const y = top + i * rowH, now = s === i + 1;
    c.box({ x: 10, y, w: 620, h: rowH - 10, tone: "muted", hl: now });
    c.text(26, y + (rowH - 10) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: 300, lines: 1, inBox: true });
    c.box({ x: 340, y: y + 8, w: 276, h: rowH - 26, label: a, size: 13, tone, hl: now });
  }); };
  const legend = (c, x, y, items) => items.forEach(([t, tone], i) => {
    c.box({ x: x + i * 150, y, w: 14, h: 14, tone, solid: true, r: 3 });
    c.text(x + i * 150 + 20, y + 12, t, { size: 12, inBox: true });
  });

  // =========================================================== TOOLBOX
  D["moe"] = (fig, k) => {
    const c = k.canvas(W, H);
    const SCORES = [0.2, 0.5, 0.1, 0.3, 0.15, 0.25, 0.4, 0.9, 0.35, 0.1, 0.2, 0.45, 0.3, 0.15, 0.05, 0.25]; // illustrative
    return (s) => {
      c.clear();
      const tok = c.box({ x: 16, y: 150, w: 96, h: 50, label: "“sold”", tone: "paper" });
      if (s === 1) {
        const ffn = c.box({ x: 200, y: 80, w: 420, h: 190, label: "one dense feed-forward block", sub: "every weight, every token", tone: "take", hl: true });
        c.connect(tok, ffn);
        return;
      }
      const router = c.box({ x: 150, y: 150, w: 90, h: 50, label: "router", tone: "predict", hl: s === 2 });
      c.connect(tok, router);
      const pick = s >= 3 ? 7 : -1;
      for (let i = 0; i < 16; i++) {
        const col = i % 4, row = Math.floor(i / 4);
        const e = c.box({ x: 300 + col * 82, y: 20 + row * 62, w: 70, h: 46, label: `E${i + 1}`, sub: SCORES[i].toFixed(2), size: 13, subSize: 11,
          tone: i === pick ? "code" : "take", hl: i === pick, dim: pick >= 0 && i !== pick && s === 3 });
        if (i === pick) c.connect(router, e, { tone: "code" });
      }
      if (s >= 3) c.text(300, 290, "active: 17B per token", { size: 16, weight: 700, tone: "code" });          // Table 1
      if (s >= 4) c.text(300, 322, "in memory: all 16 experts, 109B", { size: 16, weight: 700, tone: "bad" });   // Table 1
    };
  };

  D["rope"] = (fig, k) => {
    const gap = k.slider({ label: "gap between tokens", min: 0, max: 100, value: 10, fmt: (v) => v <= 50 ? `${Math.round(v * 5.12)}K` : `${(0.256 * Math.pow(10, (v - 50) / 50 * Math.log10(10 / 0.256))).toFixed(1)}M` });
    k.follow(gap, { 1: 10, 3: 30, 4: 100 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 1) {
        c.chips({ x: 30, y: 60, size: 16, items: ["Which", "month", "sold", "most"].map((t) => ({ t, tone: "paper" })) });
        c.chips({ x: 30, y: 150, size: 16, items: ["most", "sold", "Which", "month"].map((t) => ({ t, tone: "muted" })) });
        c.text(30, 240, "same bag of tokens → same attention scores", { size: 16, weight: 600, tone: "bad" });
        return;
      }
      const v = gap.value;
      const tokens = v <= 50 ? v * 5.12e3 : 0.256e6 * Math.pow(10, (v - 50) / 50 * Math.log10(10 / 0.256));
      const ang = (tokens / 256e3) * (Math.PI * 0.75);               // illustrative: the slow pair turns 135° over 256K
      const cx = 200, cy = 190, R = 130;
      c.path(`M${cx + R},${cy} A${R},${R} 0 0 0 ${cx + R * Math.cos(-Math.PI * 0.75)},${cy + R * Math.sin(-Math.PI * 0.75)}`, { tone: "code", width: 8, soft: true });
      if (s >= 4) c.label(cx + 120, cy - 150, "angles seen up to 256K", { size: 13, tone: "code" });
      c.line(cx, cy, cx + R, cy, { tone: "paper", width: 3 });
      c.text(cx + R + 8, cy + 5, "query", { size: 13, tone: "paper" });
      const kx = cx + R * Math.cos(-ang), ky = cy + R * Math.sin(-ang);
      const unseen = tokens > 256e3 + 1;
      c.line(cx, cy, kx, ky, { tone: unseen ? "bad" : "take", width: 3 });
      c.dot(kx, ky, { r: 6, tone: unseen ? "bad" : "take" });
      if (s >= 3) {
        c.text(420, 120, `angle ${Math.round(ang * 180 / Math.PI) % 360}°${ang > 2 * Math.PI ? " (wrapped)" : ""}`, { size: 22, weight: 700, mono: true, maxW: 210, lines: 1 });
        c.text(420, 150, "score depends on this gap only", { size: 13, tone: "muted", maxW: 210 });
      }
      if (s >= 4) c.text(420, 200, unseen ? "never seen in training" : "inside training range", { size: 15, weight: 700, tone: unseen ? "bad" : "code", maxW: 210 });
      if (s >= 5) c.box({ x: 410, y: 250, w: 214, h: 60, label: "NoPE layer: no angle", sub: "nothing to extrapolate", tone: "code", hl: true });
    };
  };

  D["soft"] = (fig, k) => {
    const w = k.slider({ label: "weight on soft target", min: 0, max: 1, step: 0.1, value: 0, fmt: (v) => v.toFixed(1) });
    k.follow(w, { 1: 0, 4: 0.5 });
    const c = k.canvas(W, H);
    const WORDS = ["March", "April", "May", "June", "other"];
    const TEACH = [0.6, 0.25, 0.1, 0.03, 0.02];                       // illustrative
    return (s) => {
      c.clear();
      const ws = s >= 4 ? w.value : s >= 2 ? 1 : 0;
      const tgt = WORDS.map((_, i) => (1 - ws) * (i === 0 ? 1 : 0) + ws * TEACH[i]);
      c.text(20, 26, s >= 4 ? `target = ${(1 - ws).toFixed(1)} × hard + ${ws.toFixed(1)} × soft` : s >= 2 ? "soft target from the teacher" : "hard target from the text",
        { size: 16, weight: 700, mono: s >= 4 });
      c.bars({ x: 20, y: 50, w: 600, rowH: 52, labelW: 90, max: 1, fmt: (v) => `${Math.round(v * 100)}%`,
        rows: WORDS.map((t, i) => ({ label: t, values: [tgt[i]], hl: s === 3 && i === 1 })), tones: [ws > 0 ? "take" : "paper"] });
      if (s === 3) c.text(20, 342, "April is nearly right, and the student learns that", { size: 13, tone: "predict", weight: 700 });
    };
  };

  // =========================================================== THE HERD
  D["herd"] = (fig, k) => {
    const v = k.toggle({ label: "show", options: ["active", "total"], value: "active" });
    k.follow(v, { 1: "active", 4: "total" });
    const c = k.canvas(W, H);
    const M = [["Scout", 17, 109, 16, "10M ctx"], ["Maverick", 17, 400, 128, "1M ctx"], ["Behemoth", 288, 2000, 16, "teacher"]]; // Table 1, §2.3
    return (s) => {
      c.clear();
      const tot = v.value === "total", max = tot ? 2000 : 300;
      const lx = 150, bw = 380;
      M.forEach(([name, act, total, ex, note], i) => {
        if (s < i + 1 && s < 4) return;
        const y = 30 + i * 100, val = tot ? total : act, now = s === i + 1;
        c.text(lx - 12, y + 26, name, { size: 16, weight: 700, anchor: "end", inBox: true });
        c.text(lx - 12, y + 46, `${ex} experts`, { size: 12, anchor: "end", tone: "muted", inBox: true });
        c.add(k.h("rect", { x: lx, y: y + 8, width: Math.max(3, val / max * bw), height: 40, rx: 5, class: `f-${i === 2 ? "muted" : tot ? "bad" : "code"}${now ? " rdx-hl" : ""}` }));
        c.text(lx + Math.max(3, val / max * bw) + 8, y + 34, `${val >= 1000 ? "~2T" : val + "B"}`, { size: 15, weight: 700, mono: true, inBox: true });
        c.text(lx, y + 70, i === 2 ? "previewed, still in training" : `${note} · open weights`, { size: 12, tone: i === 2 ? "bad" : "muted", weight: s === 5 ? 700 : 400, inBox: true });
      });
      c.text(630, 350, tot ? "total parameters (memory)" : "active parameters per token (compute)", { size: 13, anchor: "end", tone: "muted", inBox: true });
    };
  };

  D["fusion"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const photo = c.box({ x: 16, y: 30, w: 130, h: 80, label: "chart photo", sub: "bars by month", tone: "bridge" });
      const enc = c.box({ x: 200, y: 30, w: 170, h: 80, label: "vision encoder", sub: "MetaCLIP-based", tone: "take", hl: s === 1 }); // §2.2
      c.connect(photo, enc);
      c.text(420, 60, "trained against a frozen Llama", { size: 12, tone: "muted", maxW: 200 });
      if (s >= 2) {
        const ch = c.chips({ x: 16, y: 150, size: 14, maxW: 610, items: [
          ...["img", "img", "img", "img", "img", "img"].map((t) => ({ t, tone: "bridge", hl: s === 2 })),
          ...["Which", "month", "sold", "most", "?"].map((t) => ({ t, tone: "paper" }))] });
        c.arrow(285, 112, 160, 146, { tone: "bridge" });
        if (s >= 3) {
          const bb = c.box({ x: 16, y: ch.bottom + 28, w: 610, h: 56, label: "one transformer backbone reads every token from layer 1", tone: "take", hl: s === 3 });
          c.arrow(320, ch.bottom + 2, 320, ch.bottom + 26, { tone: "take" });
          if (s >= 4) c.box({ x: 16, y: bb.bx.b + 16, w: 300, h: 50, label: "images per prompt: 48 · 8 · ~5", sub: "pretrain · post-train · cards", tone: "predict", hl: s === 4 }); // §3.1, §2.4
          if (s >= 5) c.box({ x: 330, y: bb.bx.b + 16, w: 296, h: 50, label: "in: text + image · out: text + code", sub: "no audio", tone: "bad", hl: true }); // Table 1
        }
      }
    };
  };

  D["layer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const kinds = ["dense", "MoE", "dense", "MoE", "dense", "MoE"];
      const x0 = 16, lw = 200, lh = 44;
      kinds.forEach((kd, i) => {
        const y = 300 - i * 54;
        c.box({ x: x0, y, w: lw, h: lh, label: `${kd} layer`, size: 14, tone: kd === "MoE" ? "take" : "muted",
          hl: (s === 2 && kd === "dense") || (s >= 3 && s <= 4 && i === 3), dim: s >= 3 && s <= 4 && i !== 3 });
      });
      c.text(x0, 20, "Maverick, bottom to top", { size: 13, tone: "muted" });
      if (s >= 3) {
        const moe = { bx: { x: x0, y: 300 - 3 * 54, w: lw, h: lh, l: x0, r: x0 + lw, t: 300 - 162, b: 300 - 162 + lh, cx: x0 + lw / 2, cy: 300 - 162 + lh / 2 } };
        const tok = c.box({ x: 270, y: 150, w: 90, h: 44, label: "“sold”", tone: "paper" });
        c.line(moe.bx.r + 2, moe.bx.cy, tok.bx.l - 2, tok.bx.cy, { tone: "muted", dash: true });
        const sh = c.box({ x: 420, y: 40, w: 200, h: 56, label: "shared expert", sub: "every token", tone: "code", hl: s === 3 });
        c.connect(tok, sh, { tone: "code" });
        if (s >= 4) {
          const ex = c.chips({ x: 420, y: 200, maxW: 210, size: 11, items: Array.from({ length: 24 }, (_, i) => ({ t: i === 9 ? "E10" : "·", tone: i === 9 ? "predict" : "muted", hl: i === 9 })) });
          c.text(420, ex.bottom + 18, "1 routed expert of 128", { size: 13, weight: 700, tone: "predict" });
          c.arrow(362, 180, 418, 212, { tone: "predict" });
        }
      }
      if (s >= 5) c.text(232, 330, "sizes: not reported", { size: 13, tone: "bad", weight: 700 });
    };
  };

  D["memory"] = (fig, k) => {
    const m = k.toggle({ label: "model", options: ["Scout", "Maverick"], value: "Scout" });
    const p = k.toggle({ label: "precision", options: ["bf16", "fp8", "int4"], value: "bf16" });
    k.follow(m, { 1: "Scout", 4: "Maverick" });
    k.follow(p, { 1: "bf16", 3: "int4", 4: "fp8" });
    const c = k.canvas(W, H);
    const PARAMS = { Scout: 109, Maverick: 400 };                     // Table 1
    const BYTES = { bf16: 2, fp8: 1, int4: 0.5 };
    return (s) => {
      c.clear();
      const gb = PARAMS[m.value] * BYTES[p.value];
      const X = (v) => 30 + v / 800 * 580;
      c.text(30, 40, `${PARAMS[m.value]}B × ${BYTES[p.value]} bytes = ${gb} GB of weights`, { size: 18, weight: 700, mono: true });
      c.add(k.h("rect", { x: X(0), y: 120, width: X(gb) - X(0), height: 60, rx: 6, class: `f-${gb <= 80 ? "code" : "bad"}` }));
      c.text(X(gb), 108, `${gb} GB`, { size: 15, weight: 700, mono: true, anchor: "middle", inBox: true });
      if (s >= 2) {
        c.line(X(80), 116, X(80), 200, { tone: "predict", dash: true, width: 2 });
        c.text(X(80), 225, "1 × H100 (80 GB)", { size: 13, anchor: "middle", tone: "predict", weight: 700 });
        c.text(30, 270, `${Math.ceil(gb / 80)} × H100 for weights alone`, { size: 16, weight: 700, tone: gb <= 80 ? "code" : "bad" });
      }
      if (s === 1) c.label(X(218), 90, "Cloudflare: “over 200 GB”", { size: 13, tone: "muted" }); // §2.5
      if (s >= 5) c.box({ x: 30, y: 296, w: 590, h: 46, label: "+ KV cache, growing with context length", tone: "bad", dashed: true });
    };
  };

  D["irope"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const L = (v) => 20 + Math.log10(v / 1e3) / Math.log10(1e4) * 600;   // log axis, 1K .. 10M
      c.line(20, 70, 620, 70, { tone: "muted" });
      [[1e3, "1K"], [1e4, "10K"], [1e5, "100K"], [1e6, "1M"], [1e7, "10M"]].forEach(([v, t]) => c.text(L(v), 92, t, { size: 11, anchor: "middle", tone: "muted" }));
      c.add(k.h("rect", { x: L(1e3), y: 40, width: L(1e7) - L(1e3), height: 22, rx: 4, class: "f-bad soft" }));
      c.text(L(1e7) - 4, 32, "claimed: 10M", { size: 13, anchor: "end", weight: 700, tone: "bad" });        // Table 1
      if (s >= 2) {
        c.add(k.h("rect", { x: L(1e3), y: 40, width: L(2.56e5) - L(1e3), height: 22, rx: 4, class: "f-code" }));
        c.text(L(1e3), 32, "trained: 256K (39× shorter)", { size: 13, weight: 700, tone: "code" });     // §4.2
      }
      if (s >= 3) {
        const kinds = ["RoPE", "NoPE", "RoPE", "RoPE", "NoPE", "RoPE", "RoPE", "NoPE"];               // illustrative pattern
        kinds.forEach((kd, i) => c.box({ x: 20 + i * 76, y: 130, w: 68, h: 54, label: kd, size: 14, tone: kd === "NoPE" ? "code" : "take", hl: s === 4 && kd === "NoPE" }));
        c.text(20, 210, "ratio of NoPE to RoPE layers: not reported", { size: 12, tone: "muted" });
      }
      if (s >= 5) c.box({ x: 20, y: 236, w: 290, h: 50, label: "× temperature at inference", sub: "sharper softmax when long", tone: "predict", hl: s === 5 }); // §2.2
      if (s >= 6) c.box({ x: 330, y: 236, w: 290, h: 50, label: "mid-training on long data", sub: "tests: needles, long code", tone: "paper", hl: true }); // §3.1, §4.2
    };
  };

  D["temp"] = (fig, k) => {
    const n = k.slider({ label: "keys in context", min: 0, max: 100, value: 0, fmt: (v) => fmtTok(nOf(v)) });
    const t = k.toggle({ label: "temperature scaling", options: ["off", "on"], value: "off" });
    k.follow(n, { 1: 0, 2: 100 });
    k.follow(t, { 1: "off", 3: "on" });
    const c = k.canvas(W, H);
    function nOf(v) { return 2.56e5 * Math.pow(10e6 / 2.56e5, v / 100); }
    function fmtTok(x) { return x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : `${Math.round(x / 1e3)}K`; }
    const DELTA = 14;                                                 // illustrative score advantage
    return (s) => {
      c.clear();
      const N = nOf(n.value);
      const beta = t.value === "on" ? Math.log(N) / Math.log(2.56e5) : 1;   // illustrative rule
      const wt = Math.exp(DELTA * beta) / (Math.exp(DELTA * beta) + (N - 1));
      c.text(20, 40, `needle weight = e^(${DELTA}·${beta.toFixed(2)}) / (e^(${DELTA}·${beta.toFixed(2)}) + ${fmtTok(N)} − 1)`, { size: 15, mono: true, maxW: 600, lines: 1 });
      c.add(k.h("rect", { x: 20, y: 90, width: 600, height: 50, rx: 6, class: "f-muted softer" }));
      c.add(k.h("rect", { x: 20, y: 90, width: Math.max(3, wt * 600), height: 50, rx: 6, class: `f-${wt > 0.5 ? "code" : "bad"}` }));
      c.text(320, 180, `${(wt * 100).toFixed(1)}%`, { size: 40, weight: 700, mono: true, anchor: "middle", tone: wt > 0.5 ? "code" : "bad" });
      c.text(320, 210, "of attention on the needle", { size: 14, anchor: "middle", tone: "muted" });
      c.text(20, 270, `scale factor ${beta.toFixed(2)} ${t.value === "on" ? "= log N / log 256K" : "(off)"}`, { size: 15, mono: true, weight: s === 3 ? 700 : 400, tone: "predict" });
      if (s >= 4) c.text(20, 310, "Scout scales attention temperature at inference (§2.2)", { size: 14, tone: "muted", maxW: 600 });
    };
  };

  D["data"] = (fig, k) => {
    const v = k.toggle({ label: "show", options: ["tokens", "GPU-hours", "tokens/hour"], value: "tokens" });
    k.follow(v, { 1: "tokens", 4: "GPU-hours", 5: "tokens/hour" });
    const c = k.canvas(W, H);
    const T = { Scout: 40, Maverick: 22 }, G = { Scout: 5.0, Maverick: 2.38 };   // Table 1, §3.2
    return (s) => {
      c.clear();
      const rows = ["Scout", "Maverick"].map((m) => {
        const val = v.value === "tokens" ? T[m] : v.value === "GPU-hours" ? G[m] : T[m] / G[m];
        return { label: m, values: [val] };
      });
      const unit = v.value === "tokens" ? "T tokens" : v.value === "GPU-hours" ? "M H100 hours" : "M tokens per GPU-hour";
      c.text(20, 26, unit, { size: 15, weight: 700 });
      c.bars({ x: 20, y: 40, w: 600, rowH: 56, labelW: 100, fmt: (x) => x.toFixed(x < 10 ? 2 : 0), rows, tones: [v.value === "tokens" ? "paper" : v.value === "GPU-hours" ? "predict" : "code"],
        max: v.value === "tokens" ? 45 : v.value === "GPU-hours" ? 6 : 10 });
      if (s >= 2) c.box({ x: 20, y: 170, w: 290, h: 50, label: "Behemoth mix: >30T", sub: "different scope", tone: "muted", dashed: true, hl: s === 2 }); // §3.1
      if (s >= 3) c.box({ x: 330, y: 170, w: 290, h: 50, label: "200 langs in, 12 supported", sub: ">100 with ≥1B tokens", tone: "predict", hl: s === 3 }); // §3.1, Table 1
      if (s >= 4) c.text(20, 260, "total 7.38M H100 hours", { size: 16, weight: 700, mono: true });                 // §3.2
      if (s >= 5) c.text(20, 300, "40T ÷ 5.0M ≈ 8.0M · 22T ÷ 2.38M ≈ 9.2M", { size: 15, mono: true, tone: "code", maxW: 600 });
    };
  };

  D["codistill"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (f) => 120 + f * 490;
      c.text(110, 66, "Behemoth", { size: 14, weight: 700, anchor: "end" });
      c.add(k.h("rect", { x: X(0), y: 46, width: X(1) - X(0), height: 28, rx: 5, class: "f-muted soft" }));
      c.text(110, 136, "Maverick", { size: 14, weight: 700, anchor: "end" });
      c.add(k.h("rect", { x: X(0), y: 116, width: X(1) - X(0), height: 28, rx: 5, class: "f-take soft" }));
      c.text(X(0.5), 30, "pretraining time →", { size: 12, tone: "muted", anchor: "middle" });
      if (s >= 2) [0.1, 0.25, 0.4, 0.55].forEach((f) => c.arrow(X(f), 76, X(f), 112, { tone: "take" }));
      if (s >= 2) c.text(X(0.33), 100, "soft targets", { size: 12, tone: "take", anchor: "middle" });
      if (s >= 3) {
        c.text(20, 196, "weight on soft", { size: 12, tone: "muted" });
        c.path(`M${X(0)},${250} C${X(0.3)},${190} ${X(0.6)},${200} ${X(1)},${235}`, { tone: "predict", width: 2.5 });
        c.text(X(1), 270, "illustrative curve", { size: 11, tone: "muted", anchor: "end" });
      }
      if (s >= 4) c.box({ x: 20, y: 286, w: 290, h: 56, label: "teacher passes shared", sub: "over most of the data", tone: "code", hl: s === 4 });
      if (s >= 5) {
        c.add(k.h("rect", { x: X(0.75), y: 116, width: X(1) - X(0.75), height: 28, rx: 5, class: "f-predict" }));
        c.box({ x: 330, y: 286, w: 290, h: 56, label: "new data: extra targets", sub: "generated by the teacher", tone: "predict", hl: true });
      }
    };
  };

  D["posttrain"] = (fig, k) => {
    const c = k.canvas(W, H);
    // illustrative prompt pool: difficulty 0..1, deterministic
    const P = Array.from({ length: 40 }, (_, i) => ((i * 37) % 40) / 40);
    return (s) => {
      c.clear();
      const sft = c.box({ x: 16, y: 20, w: 170, h: 50, label: "light SFT", tone: "paper", hl: s === 1 || s === 3 });
      const rl = c.box({ x: 235, y: 20, w: 170, h: 50, label: "online RL", tone: "take", hl: s === 1 || s === 4 });
      const dpo = c.box({ x: 454, y: 20, w: 170, h: 50, label: "light DPO", tone: "code", hl: s === 1 || s === 5 });
      c.connect(sft, rl); c.connect(rl, dpo);
      if (s === 2) c.box({ x: 120, y: 110, w: 400, h: 60, label: "too much SFT/DPO → less RL exploration", tone: "bad", hl: true });
      if (s >= 3) {
        const X = (d) => 40 + d * 560;
        c.text(40, 120, "easy", { size: 12, tone: "muted" });
        c.text(600, 120, "hard", { size: 12, tone: "muted", anchor: "end" });
        P.forEach((d, i) => {
          const gone = s >= 3 && d < 0.5 && i % 5 !== 0;
          const keep = s >= 4 && d >= 0.35;
          c.dot(X(d), 150 + (i % 5) * 18, { r: 6, tone: gone ? "muted" : keep ? "take" : "paper", dim: gone });
        });
        c.text(40, 270, "most easy examples dropped (Llama models judge)", { size: 13, tone: "bad" });
      }
      if (s >= 4) c.text(40, 300, "RL re-filters: keeps medium-to-hard", { size: 13, tone: "take", weight: 700 });
      if (s >= 5) c.text(40, 330, "DPO: corner-case polish", { size: 13, tone: "code", weight: 700 });
    };
  };

  // =========================================================== DOES IT WORK?
  D["base"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["MMLU", 79.3, 85.2, 79.6, 85.5], ["MMLU-Pro", 53.8, 61.6, 58.2, 62.9], ["MATH", 41.6, 53.5, 50.3, 61.2],
      ["MBPP", 66.4, 74.4, 67.8, 77.6], ["TyDiQA", 29.9, 34.3, 31.5, 31.7]];                       // Table 3
    const HL = { 1: [0], 2: [0, 1], 3: [2], 4: [4], 5: [] };
    return (s) => {
      c.clear();
      legend(c, 20, 6, [["L3.1 70B", "muted"], ["L3.1 405B", "paper"], ["Scout", "code"], ["Maverick", "take"]]);
      c.bars({ x: 10, y: 32, w: 620, rowH: 58, labelW: 90, max: 100, fmt: (v) => v.toFixed(1), tones: ["muted", "paper", "code", "take"],
        rows: R.map(([l, ...v], i) => ({ label: l, values: v, hl: HL[s].includes(i), dim: HL[s].length > 0 && !HL[s].includes(i) })) });
      if (s >= 5) c.label(420, 330, "ChartQA 85.3 · DocVQA 91.6 (Maverick)", { size: 13, tone: "take" });
    };
  };

  D["instruct"] = (fig, k) => {
    const v = k.toggle({ label: "tasks", options: ["text", "images"], value: "text" });
    k.follow(v, { 1: "text", 4: "images" });
    const c = k.canvas(W, H);
    const TXT = [["GPQA Diam.", 50.5, 49.0, 57.2, 69.8], ["LiveCodeBench", 33.3, 27.7, 32.8, 43.4], ["MGSM", 91.1, 91.6, 90.6, 92.3], ["MMLU Pro", 68.9, 73.4, 74.3, 80.5]]; // Table 4
    const IMG = [["MMMU", NaN, NaN, 69.4, 73.4], ["MathVista", NaN, NaN, 70.7, 73.7], ["DocVQA", NaN, NaN, 94.4, 94.4], ["ChartQA", NaN, NaN, 88.8, 90.0]];           // Table 4
    const HL = { 1: ["GPQA Diam."], 2: ["LiveCodeBench"], 3: ["MGSM"], 4: ["DocVQA"], 5: ["ChartQA"] };
    return (s) => {
      c.clear();
      const rows = v.value === "text" ? TXT : IMG;
      legend(c, 20, 6, [["L3.3 70B", "muted"], ["L3.1 405B", "paper"], ["Scout", "code"], ["Maverick", "take"]]);
      const h = HL[s] || [];
      const any = rows.some((r) => h.includes(r[0]));
      c.bars({ x: 10, y: 32, w: 620, rowH: 70, labelW: 110, max: 100, fmt: (x) => x.toFixed(1), tones: ["muted", "paper", "code", "take"],
        rows: rows.map(([l, ...vals]) => ({ label: l, values: vals, hl: h.includes(l), dim: any && !h.includes(l) })) });
      if (v.value === "images") c.text(630, 346, "Llama 3: no image support", { size: 12, anchor: "end", tone: "muted", inBox: true });
      if (s >= 5 && v.value === "images") c.text(20, 346, "ChartQA base 85.3 → 90.0", { size: 13, tone: "predict", weight: 700 });
    };
  };

  D["mtob"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["half · eng→kgv", 42.2, 54.0], ["half · kgv→eng", 36.6, 46.4], ["full · eng→kgv", 39.7, 50.8], ["full · kgv→eng", 36.3, 46.7]]; // Table 4
    return (s) => {
      c.clear();
      if (s === 1) {
        const book = c.box({ x: 20, y: 80, w: 220, h: 120, label: "grammar book", sub: "in the prompt", tone: "paper" });
        const q = c.box({ x: 280, y: 110, w: 140, h: 60, label: "sentence", tone: "muted" });
        const out = c.box({ x: 470, y: 110, w: 150, h: 60, label: "translation", sub: "scored by chrF", tone: "code" });
        c.connect(q, out);
        c.text(20, 240, "English ↔ kgv", { size: 16, weight: 700 });
        return;
      }
      legend(c, 20, 6, [["Scout", "code"], ["Maverick", "take"]]);
      c.bars({ x: 10, y: 32, w: 620, rowH: 62, labelW: 140, max: 60, fmt: (x) => x.toFixed(1), tones: ["code", "take"],
        rows: R.map(([l, ...v], i) => ({ label: l, values: v, hl: s === 3 && i === 2, dim: s === 3 && i !== 2 })) });
      if (s >= 2) c.box({ x: 150, y: 296, w: 300, h: 44, label: "Llama 3: “Context window is 128K”", size: 13, tone: "muted", dashed: true, hl: s === 2 });
      if (s >= 4) c.box({ x: 466, y: 296, w: 160, h: 44, label: "10M loses to 1M", size: 13, tone: "bad", hl: true });
    };
  };

  // =========================================================== YOUR MOVE
  D["served"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["Scout · claimed", 10e6, "bad", 1], ["Maverick · claimed", 1e6, "bad", 1],                  // Table 1
      ["Scout · Cloudflare", 131e3, "paper", 2], ["Scout · Bedrock", 3.5e6, "paper", 3], ["Maverick · Bedrock", 1e6, "paper", 3],
      ["Maverick · SageMaker", 128e3, "paper", 4], ["Scout · SageMaker", 10e6, "paper", 4]];               // §8
    const L = (v) => 180 + Math.log10(v / 1e4) / 3 * 380;              // log axis 10K .. 10M
    const fmt = (v) => v >= 1e6 ? `${v / 1e6}M` : `${Math.round(v / 1e3)}K`;
    return (s) => {
      c.clear();
      R.forEach(([lab, v, tone, st], i) => {
        if (s < st) return;
        const y = 12 + i * 40, now = s === st;
        c.text(170, y + 20, lab, { size: 12, anchor: "end", weight: now ? 700 : 400, inBox: true });
        c.add(k.h("rect", { x: L(1e4), y: y + 4, width: L(v) - L(1e4), height: 24, rx: 4, class: `f-${tone}${now ? "" : " soft"}` }));
        c.text(L(v) + 6, y + 21, fmt(v), { size: 12, mono: true, weight: 700, inBox: true });
      });
      [[1e4, "10K"], [1e5, "100K"], [1e6, "1M"], [1e7, "10M"]].forEach(([v, t]) => c.text(L(v), 300, t, { size: 11, anchor: "middle", tone: "muted" }));
      if (s >= 5) c.text(320, 340, "KV cache ∝ context × batch: 10M ÷ 131K ≈ 76×", { size: 15, mono: true, anchor: "middle", tone: "predict", weight: 700 });
    };
  };

  D["license"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Redistribute", "“Built with Llama”", "predict"],
      ["Release a fine-tune", "name starts “Llama”", "predict"],
      ["Ship copies", "keep the NOTICE file", "muted"],
      ["Over 700M monthly users", "separate Meta license", "bad"],
      ["Based in the EU", "no multimodal rights", "bad"],
    ], s, 8, 68);                                                     // §9
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Authorship", "removed by arXiv", "bad"],
      ["Evidence", "copied, not measured", "bad"],
      ["Token counts", "40T/22T vs 30T", "predict"],
      ["Architecture detail", "dims not reported", "predict"],
      ["Care with sources", "separates hype from cards", "code"],
    ], s, 8, 68);
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Hears audio?", "no: text + image only", "bad"],
      ["Telugu supported?", "no (Hindi yes)", "bad"],
      ["Fits your GPU?", "int4 ≈ 55 GB: one H100", "predict"],
      ["License friction?", "“Llama-…” name, branding", "predict"],
      ["🧠 Verdict", "pick a smaller dense LLM", "code"],
    ], s, 8, 68);                                                     // Table 1, §6, §9
  };
})();
