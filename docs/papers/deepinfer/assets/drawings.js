/* Drawings for the DeepInfer lesson. One entry per data-draw name.
   No paper exists: numbers come from doc/inference_deployment_qa.md (// doc), the README
   plots (// read off plot, approximate), the model's config.json (// config) or the code
   (// file), at commit 774ce24. Everything else is illustrative or live arithmetic. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const fmtInt = (v) => Math.round(v).toLocaleString("en-US");

  const hbars = (c, o) => {
    const x0 = o.x + o.labelW, bw = o.w - o.labelW - 70, X = (v) => x0 + (v / o.max) * bw;
    o.rows.forEach((r, i) => {
      const y = o.y + i * o.rowH;
      c.text(x0 - 8, y + o.rowH / 2 + 4, r.label, { anchor: "end", size: 13, weight: r.hl ? 700 : 400, dim: r.dim, inBox: true, maxW: o.labelW - 10, lines: 1 });
      if (!Number.isFinite(r.v)) return;
      c.box({ x: x0, y: y + 5, w: Math.max(3, X(r.v) - x0), h: o.rowH - 10, tone: r.tone || "paper", solid: true, hl: r.hl, dim: r.dim, r: 3 });
      c.text(X(r.v) + 6, y + o.rowH / 2 + 4, (o.fmt || ((v) => v.toFixed(2)))(r.v), { size: 13, mono: true, tone: r.tone || "paper", dim: r.dim, inBox: true });
    });
    c.occupy({ x: o.x, y: o.y, w: o.w, h: o.rows.length * o.rowH });
    return X;
  };

  const board = (c, rows, s, o = {}) => {
    const top = o.top || 12, rh = o.rh || 56, qW = o.qW || 230;
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rh, now = s === i + 1;
      const qb = c.box({ x: 16, y, w: qW, h: rh - 12, label: q, size: 14, tone: "muted", hl: now, mono: o.monoQ });
      const ab = c.box({ x: qW + 40, y, w: W - qW - 56, h: rh - 12, label: a, size: 13, tone, hl: now });
      if (now) c.connect(qb, ab, { tone });
    });
  };

  // ------------------------------------------------------- toolbox: prefill vs decode
  D["phases"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 20, w: 400, h: 44, label: "prompt: 50,000 tokens", tone: "paper", hl: s === 1 });
      c.box({ x: 430, y: 20, w: 194, h: 44, label: "answer: 2,000", tone: "code", hl: s === 1 });
      if (s >= 2) {
        c.box({ x: 16, y: 90, w: 400, h: 70, label: "prefill: many tokens per pass", sub: "matrix-math heavy", tone: "paper", hl: s === 2 });
      }
      if (s >= 3) {
        for (let i = 0; i < 12; i++) c.box({ x: 430 + (i % 6) * 32, y: 90 + Math.floor(i / 6) * 38, w: 28, h: 32, tone: "code", hl: s === 3 });
        c.text(430, 186, "decode: small steps, reread KV each time", { size: 12, tone: "code", weight: 600, maxW: 194, lines: 2 });
      }
      if (s >= 4) {
        const p = c.box({ x: 16, y: 240, w: 240, h: 80, label: "8-GPU machines", sub: "prefill, EP2–8", tone: "paper", hl: true });
        const d = c.box({ x: 384, y: 240, w: 240, h: 80, label: "64–128-GPU supernodes", sub: "decode, EP64–128", tone: "code", hl: true });
        c.connect(p, d, { tone: "muted", label: "KV cache" });
      }
    };
  };

  // ------------------------------------------------------- toolbox: KV cache
  D["kvcache"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const x0 = 16, wAll = 608, X = (t) => x0 + (t / 50000) * wAll;
      c.text(16, 24, "our prompt, to scale (50,000 tokens)", { size: 13, weight: 700 });
      c.box({ x: x0, y: 40, w: wAll, h: 44, label: s >= 2 ? "" : "keys and values for every token", tone: "paper", hl: s === 1 });
      if (s >= 2) {
        c.box({ x: x0, y: 40, w: X(49000) - x0, h: 44, label: "49,000 from the last turn", tone: "muted", hl: s === 2 });
        c.box({ x: X(49000), y: 40, w: wAll - (X(49000) - x0), h: 44, tone: "predict", hl: s >= 2 });
        c.label(X(49500), 100, "1,000 new", { anchor: "end", size: 13, tone: "predict", weight: 700 });
      }
      if (s >= 3) {
        hbars(c, { x: 16, y: 140, w: 608, labelW: 150, rowH: 46, max: 50000, fmt: fmtInt,
          rows: [{ label: "no cache", v: 50000, tone: "bad" }, { label: "cache hit", v: 1000, tone: "code", hl: true }] });
        c.text(16, 250, "tokens to prefill", { size: 12, tone: "muted" });
      }
      if (s >= 4) {
        c.box({ x: 16, y: 274, w: 296, h: 64, label: "agents: 3-day TTL", sub: "chatbots: 7 days", tone: "take", hl: true });
        c.box({ x: 328, y: 274, w: 296, h: 64, label: "≈ 100 PiB of SSD", sub: "3FS cluster", tone: "take", hl: true });
      }
    };
  };

  // ------------------------------------------------------- toolbox: expert parallelism
  D["ep"] = (fig, k) => {
    const ep = k.slider({ label: "EP size", min: 8, max: 128, step: 8, value: 8, fmt: (v) => `EP${v}` });
    k.follow(ep, { 1: 8, 3: 64 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const e = ep.value, total = 384 + e;   // one redundant slot per GPU, as in "384+64" (doc)
      const per = Math.ceil(total / e);
      read.textContent = `${384} + ${e} replicas = ${total} slots → ${per} per GPU`;
      const r = rng(5), picks = new Set(); while (picks.size < 6) picks.add(Math.floor(r() * 384));
      const show = Math.min(e, 16), cw = 608 / show;
      for (let g = 0; g < show; g++) {
        const x = 16 + g * cw;
        c.add(k.h("rect", { x: x + 2, y: 40, width: cw - 4, height: 150, rx: 4, class: "f-muted softer s-muted", "stroke-width": 1 }));
        const hit = [...picks].some((p) => Math.floor(p / (384 / e)) === g);
        if (s >= 2 && hit) c.add(k.h("rect", { x: x + 4, y: 44, width: cw - 8, height: 142, rx: 3, class: "f-predict soft s-predict", "stroke-width": 1.5 }));
      }
      c.occupy({ x: 16, y: 40, w: 608, h: 150 });
      c.text(16, 26, e > 16 ? `first 16 of ${e} GPUs` : `${e} GPUs`, { size: 13, weight: 700 });
      c.box({ x: 16, y: 210, w: 296, h: 56, label: "6 of 384 experts per token", sub: "+ 1 shared (config)", tone: "predict", hl: s === 1 || s === 2 });
      if (s >= 3) c.box({ x: 328, y: 210, w: 296, h: 56, label: `${per} expert slots per GPU`, sub: `EP${e}`, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 16, y: 284, w: 608, h: 56, label: "attention: each GPU serves its own requests (DP = EP)", size: 14, tone: "paper", hl: true });
    };
  };

  // ------------------------------------------------------- toolbox: speculative decoding
  D["spec"] = (fig, k) => {
    const c = k.canvas(W, H);
    const acc = [true, true, true, false, false];
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 20, w: 120, h: 44, label: "context", tone: "muted" });
      for (let i = 0; i < 5; i++) {
        const tone = s >= 3 ? (acc[i] ? "code" : "bad") : "take";
        c.box({ x: 150 + i * 90, y: 20, w: 80, h: 44, label: `draft ${i + 1}`, size: 13, tone, dashed: !(s >= 3 && acc[i]), hl: s === 1, dim: s >= 3 && !acc[i] });
      }
      if (s >= 2) c.box({ x: 16, y: 90, w: 608, h: 54, label: "one big-model pass checks all 5", tone: "paper", hl: s === 2 });
      if (s >= 3) c.box({ x: 150 + 3 * 90, y: 160, w: 80, h: 44, label: "fix", tone: "code", hl: s === 3 });
      if (s >= 3) c.text(150, 226, "3 accepted + 1 corrected token this step", { size: 13, tone: "code", weight: 600 });
      if (s >= 4) {
        c.box({ x: 16, y: 250, w: 296, h: 80, label: "3.29 accepted / step", sub: "fixed 5 drafts (doc)", tone: "code", hl: true });
        c.box({ x: 328, y: 250, w: 296, h: 80, label: "2,000 ÷ 3.29 ≈ 608 steps", sub: "our answer", mono: true, tone: "predict", hl: true });
      }
    };
  };

  // ------------------------------------------------------- toolbox: sliding window
  D["swa"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const n = 24, cw = 600 / n, x0 = 20;
      c.text(20, 24, "end of a prompt; each cell = 32 tokens (illustrative)", { size: 13, weight: 700 });
      for (let i = 0; i < n; i++) {
        const inWin = i >= n - 4;
        const tone = s >= 1 && inWin ? "predict" : "paper";
        c.add(k.h("rect", { x: x0 + i * cw + 1, y: 40, width: cw - 2, height: 40, rx: 2, class: `f-${tone} ${inWin ? "soft" : "softer"} s-${tone}`, "stroke-width": 1 }));
      }
      c.occupy({ x: x0, y: 40, w: 600, h: 40 });
      c.label(x0 + (n - 2) * cw, 104, "window: last 128", { anchor: "middle", size: 13, tone: "predict", weight: 700 });
      if (s >= 2) c.box({ x: 20, y: 130, w: 600, h: 46, label: "window state depends on exactly where the prompt ends", size: 14, tone: "predict", hl: s === 2 });
      if (s >= 3) for (let b = 0; b < 6; b++) c.box({ x: x0 + b * 4 * cw + 2, y: 196, w: 4 * cw - 4, h: 34, label: "128 block", size: 12, tone: "paper", hl: s === 3 });
      if (s >= 4) {
        c.box({ x: 20, y: 256, w: 290, h: 60, label: "blocks: hit", tone: "code", hl: true });
        c.box({ x: 330, y: 256, w: 290, h: 60, label: "window: missing", sub: "rebuild needed", tone: "bad", hl: true });
      }
    };
  };

  // ------------------------------------------------------- system: end to end
  D["system"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const out = (inRepo) => (s >= 5 ? (inRepo ? "code" : "muted") : null);
      const rc = c.box({ x: 230, y: 12, w: 180, h: 44, label: "DeepSeek Recipe", tone: out(false) || "paper", hl: s === 1, dashed: s >= 5 });
      const ep = c.box({ x: 230, y: 84, w: 180, h: 44, label: "entrypoint + cache check", size: 13, tone: out(false) || "take", hl: s === 2, dashed: s >= 5 });
      const plb = c.box({ x: 30, y: 84, w: 160, h: 44, label: "prefill balancer", size: 13, tone: out(false) || "muted", dashed: s >= 5 });
      const dlb = c.box({ x: 450, y: 84, w: 174, h: 44, label: "decode balancer", size: 13, tone: out(false) || "muted", dashed: s >= 5 });
      const pf = c.box({ x: 30, y: 170, w: 220, h: 64, label: "prefill engines", sub: "8-GPU machines", tone: out(true) || "paper", hl: s === 3 || s === 5 });
      const dc = c.box({ x: 390, y: 170, w: 234, h: 64, label: "decode engines", sub: "64–128 GPUs", tone: out(true) || "code", hl: s === 4 || s === 5 });
      const st = c.box({ x: 30, y: 280, w: 594, h: 50, label: "KV cache storage (3FS)", tone: out(false) || "muted", dashed: s >= 5 });
      c.connect(rc, ep, { tone: "muted" });
      c.connect(ep, plb, { tone: "muted" }); c.connect(plb, pf, { tone: "muted" });
      c.connect(pf, dc, { tone: s === 4 ? "predict" : "muted", label: "KV cache" });
      c.connect(dlb, dc, { tone: "muted" });
      c.connect(st, pf, { tone: "muted" });
      if (s >= 5) c.text(270, 260, "green: in this repo · grey: described only", { size: 12, tone: "muted", anchor: "middle" });
    };
  };

  // ------------------------------------------------------- system: EPLB
  D["eplb"] = (fig, k) => {
    const on = k.toggle({ label: "EPLB", options: ["off", "on"], value: "off" });
    k.follow(on, { 1: "off", 2: "on" });
    const c = k.canvas(W, H);
    const base = [1.0, 0.9, 2.3, 1.1, 0.8, 1.0, 1.6, 0.9];   // made-up per-GPU loads
    return (s) => {
      c.clear();
      const bal = on.value === "on";
      const load = bal ? [1.12, 1.05, 1.18, 1.1, 1.0, 1.08, 1.12, 1.05] : base;
      const mean = load.reduce((a, b) => a + b, 0) / load.length, mx = Math.max(...load);
      const p = c.plot({ series: [], xmin: 0, xmax: 8, ymin: 0, ymax: 2.6, w: 420, h: 350, y: 6, xFmt: () => "", xlabel: "8 of the GPUs (made-up loads)", ylabel: "expert load" });
      load.forEach((v, i) => c.box({ x: p.X(i + 0.15), y: p.Y(v), w: p.X(0.7) - p.X(0), h: p.Y(0) - p.Y(v), tone: v === mx ? "bad" : "paper", solid: true, r: 2 }));
      c.line(p.X(0), p.Y(mean), p.X(8), p.Y(mean), { tone: "muted", dash: true });
      c.box({ x: 440, y: 20, w: 186, h: 56, label: `slowest ÷ mean = ${(mx / mean).toFixed(2)}`, sub: "this drawing", mono: true, size: 13, tone: bal ? "code" : "bad", hl: s <= 2 });
      if (s >= 3) c.box({ x: 440, y: 92, w: 186, h: 64, label: "count, then repack", sub: "greedy (policy.py)", tone: "take", hl: s === 3 });
      if (s >= 4) {
        c.box({ x: 440, y: 172, w: 186, h: 54, label: "decode: 1.090", sub: "measured (doc)", tone: "code", hl: true });
        c.box({ x: 440, y: 240, w: 186, h: 54, label: "prefill: 1.045–1.074", sub: "measured (doc)", tone: "code", hl: true });
      }
    };
  };

  // ------------------------------------------------------- system: load balancers
  D["balance"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const tiers = ["< 16K", "16–64K", "64–256K", "≥ 256K"];
      tiers.forEach((t, i) => c.box({ x: 16 + i * 152, y: 20, w: 140, h: 44, label: t, tone: i === 1 ? "predict" : "muted", hl: s === 1 && i === 1, mono: true }));
      if (s >= 1) c.label(16 + 152 + 70, 84, "our 50,000 tokens", { anchor: "middle", size: 12, tone: "predict", weight: 700 });
      if (s >= 2) c.box({ x: 16, y: 104, w: 608, h: 46, label: "chunk = largest that fits the time budget, ≤ 32,768 tokens", size: 13, tone: "paper", hl: s === 2 });
      if (s >= 3) {
        c.box({ x: 16, y: 170, w: 296, h: 56, label: "batch size", sub: "request count", tone: "code", hl: s === 3 });
        c.box({ x: 328, y: 170, w: 296, h: 56, label: "attention cost", sub: "total KV length", tone: "code", hl: s === 3 });
      }
      if (s >= 4) c.box({ x: 16, y: 240, w: 608, h: 46, label: "short → few-but-long GPUs · long → short-KV GPUs", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 16, y: 298, w: 608, h: 46, label: "≈ 80% of a perfectly balanced benchmark", size: 14, tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------- system: DSpark draft choice
  D["dspark"] = (fig, k) => {
    const n = k.slider({ label: "drafts verified (batch)", min: 0, max: 20, step: 1, value: 20, fmt: (v) => `${v}` });
    k.follow(n, { 1: 20, 2: 20, 3: 20, 4: 11 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    // 4 requests × 5 drafts, made-up per-draft confidences
    const conf = [[0.95, 0.9, 0.85, 0.8, 0.7], [0.8, 0.6, 0.5, 0.4, 0.3], [0.9, 0.85, 0.8, 0.75, 0.7], [0.6, 0.4, 0.3, 0.2, 0.2]];
    const cum = conf.map((r) => { let p = 1; return r.map((v) => (p *= v)); });
    const flat = []; cum.forEach((r, i) => r.forEach((p, j) => flat.push({ i, j, p }))); flat.sort((a, b) => b.p - a.p);
    const stepMs = (q) => 10 + 0.55 * q + (q > 14 ? (q - 14) * 1.2 : 0);   // made-up profiled curve
    return (s) => {
      c.clear();
      const k0 = n.value, chosen = new Set(flat.slice(0, k0).map((f) => `${f.i},${f.j}`));
      const exp = 4 + flat.slice(0, k0).reduce((a, f) => a + f.p, 0);
      const thr = exp / stepMs(4 + k0);
      let best = 0, bk = 0; for (let q = 0; q <= 20; q++) { const e = 4 + flat.slice(0, q).reduce((a, f) => a + f.p, 0), t = e / stepMs(4 + q); if (t > best) { best = t; bk = q; } }
      read.textContent = `expected tokens ${exp.toFixed(2)} · best at ${bk}`;
      const data = cum.map((r, i) => r.map((p, j) => (s >= 2 ? p.toFixed(2) : conf[i][j].toFixed(2))));
      c.matrix({ x: 80, y: 64, data, cell: 62, cellH: 36, rowLabels: ["req 1", "req 2", "req 3", "req 4"], colLabels: ["d1", "d2", "d3", "d4", "d5"],
        fmt: (x) => x, tone: (i, j) => (s >= 3 ? (chosen.has(`${i},${j}`) ? "code" : "muted") : s === 1 && j === 4 ? "bad" : null) });
      c.text(16, 24, s >= 2 ? "chance each draft is accepted (cumulative)" : "per-draft confidence", { size: 13, weight: 700 });
      if (s >= 4) {
        const xs = [], ys = []; for (let q = 0; q <= 20; q++) { const e = 4 + flat.slice(0, q).reduce((a, f) => a + f.p, 0); xs.push(q); ys.push(1000 * e / stepMs(4 + q)); }
        const p = c.plot({ series: [{ x: xs, y: ys, tone: "paper" }], x: 420, y: 44, w: 210, h: 170, xmin: 0, xmax: 20, ml: 40, mb: 26, yFmt: (v) => String(Math.round(v)) });
        c.text(440, 236, "throughput vs drafts verified", { size: 11, tone: "paper" });
        c.dot(p.X(k0), p.Y(1000 * thr), { r: 5, tone: "predict" });
      }
      if (s >= 5) c.box({ x: 16, y: 260, w: 608, h: 56, label: "production: verified 5 → 3.58, accepted 3.30 → 3.21", sub: "60 requests per GPU (doc)", tone: "code", hl: true });
      c.text(16, 340, "confidences and step-time curve are made up; the selection rule is the code's", { size: 11, tone: "muted" });
    };
  };

  // ------------------------------------------------------- system: bounded replay
  D["replay"] = (fig, k) => {
    const sw = k.toggle({ label: "window cache", options: ["saved", "missing"], value: "saved" });
    k.follow(sw, { 1: "saved", 3: "missing" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const L = 50000, cap = L - 134, shared = 49000, blk = Math.floor(Math.min(shared, cap) / 128) * 128;
      const hit = sw.value === "saved" ? blk : blk - 128;
      const lo = 47500, X = (t) => 16 + ((t - lo) / (L - lo)) * 608;
      c.text(16, 22, "last 2,500 tokens of our 50,000-token prompt", { size: 13, weight: 700 });
      c.box({ x: 16, y: 40, w: 608, h: 40, tone: "paper", label: "" });
      c.box({ x: 16, y: 40, w: X(shared) - 16, h: 40, label: "shared with last turn", size: 12, tone: "muted" });
      if (s >= 1) { c.line(X(cap), 84, X(cap), 96, { tone: "bad", width: 2 }); c.label(X(cap), 108, `cap ${fmtInt(cap)}`, { anchor: "middle", size: 12, tone: "bad", weight: 700 }); }
      if (s >= 2) c.box({ x: 16, y: 130, w: X(blk) - 16, h: 34, label: `block hit ${fmtInt(blk)}`, size: 12, tone: "code", hl: s === 2 });
      if (s >= 3) c.box({ x: 16, y: 176, w: X(hit) - 16, h: 34, label: `final hit ${fmtInt(hit)}`, size: 12, tone: sw.value === "saved" ? "code" : "predict", hl: s === 3 });
      if (s >= 4) {
        const rp = sw.value === "missing" ? 128 : 0;
        if (rp) { c.box({ x: X(hit), y: 222, w: X(hit + 128) - X(hit), h: 34, tone: "take", hl: true });
          c.label(X(hit) - 8, 270, "replay 128", { anchor: "end", size: 12, tone: "take", weight: 700 }); }
        c.box({ x: X(hit + rp), y: 222, w: X(L) - X(hit + rp), h: 34, label: `new: ${fmtInt(L - hit - rp)}`, size: 12, tone: "paper" });
      }
      if (s >= 5) c.box({ x: 16, y: 292, w: 608, h: 50, label: "decoder layers: replay 128 instead of 2,560 → prefill ≈ halved", size: 13, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------- system: storage tiers
  D["storage"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const g = c.box({ x: 16, y: 20, w: 608, h: 60, label: "GPU memory", sub: "in-flight blocks + window state", tone: "code", hl: s === 1 });
      const h = c.box({ x: 16, y: 110, w: 608, h: 60, label: "host memory", sub: "window state: 20 × 134 × 528 B = 1,415,040 B", tone: "predict", hl: s === 2, dim: s < 2 });
      const d = c.box({ x: 16, y: 200, w: 608, h: 60, label: "3FS SSD cluster", sub: "block KV · 10+2 erasure coding · ≈ 14.4 TB per GPU", tone: "paper", hl: s === 3, dim: s < 3 });
      c.connect(g, h, { tone: "muted", dim: s < 2 }); c.connect(h, d, { tone: "muted", dim: s < 3 });
      if (s >= 4) c.box({ x: 16, y: 284, w: 608, h: 50, label: "any prefill machine can read any prefix", size: 14, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------- system: async scheduling
  D["async"] = (fig, k) => {
    const m = k.toggle({ label: "scheduling", options: ["serial", "overlapped"], value: "serial" });
    k.follow(m, { 1: "serial", 3: "overlapped" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ov = m.value === "overlapped", u = 11;
      const cpu = 4, gpu = 8;   // illustrative units
      const rowC = 70, rowG = 150;
      c.text(16, rowC + 24, "CPU", { size: 13, weight: 700 });
      c.text(16, rowG + 24, "GPU", { size: 13, weight: 700 });
      let t = 0;
      for (let step = 0; step < 3; step++) {
        const x0 = 70 + t * u;
        if (!ov) {
          c.box({ x: x0, y: rowC, w: cpu * u - 2, h: 40, label: "sched", size: 11, tone: "take" });
          c.box({ x: x0 + cpu * u, y: rowG, w: gpu * u - 2, h: 40, label: `forward ${step + 1}`, size: 11, tone: "code" });
          c.box({ x: x0 + (cpu + gpu) * u, y: rowC, w: cpu * u - 2, h: 40, label: "post", size: 11, tone: "take" });
          if (s >= 2) c.box({ x: x0 + (cpu + gpu) * u, y: rowG, w: cpu * u - 2, h: 40, label: "idle", size: 11, tone: "bad", dashed: true });
          t += cpu * 2 + gpu;
        } else {
          c.box({ x: x0, y: rowG, w: gpu * u - 2, h: 40, label: `forward ${step + 1}`, size: 11, tone: "code" });
          c.box({ x: x0 + 4, y: rowC, w: cpu * u - 2, h: 40, label: "sched", size: 11, tone: "take" });
          c.box({ x: x0 + 4 + cpu * u, y: rowC, w: cpu * u - 2, h: 40, label: "post", size: 11, tone: "take" });
          t += gpu;
        }
      }
      c.text(16, 30, ov ? "overlapped: GPU never waits" : "serial: GPU waits for the CPU", { size: 14, weight: 700, tone: ov ? "code" : "bad" });
      if (s >= 4) c.box({ x: 16, y: 240, w: 608, h: 56, label: "CPU lags a step → a GPU kernel corrects lengths", sub: "worker.py", tone: "predict", hl: true });
      c.text(16, 330, "bar lengths are illustrative", { size: 11, tone: "muted" });
    };
  };

  // ------------------------------------------------------- system: batch invariance
  D["invariance"] = (fig, k) => {
    const c = k.canvas(W, H);
    const left = (0.1 + 0.2) + 0.3, right = 0.1 + (0.2 + 0.3);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 20, w: 296, h: 60, label: `(0.1 + 0.2) + 0.3 = ${left}`, sub: "float64, live", mono: true, size: 14, tone: "paper", hl: s === 1 });
      c.box({ x: 328, y: 20, w: 296, h: 60, label: `0.1 + (0.2 + 0.3) = ${right}`, sub: "same numbers, other order", mono: true, size: 14, tone: "bad", hl: s === 1 });
      if (s >= 2) {
        c.box({ x: 16, y: 104, w: 296, h: 56, label: "batch of 8", sub: "split one way", tone: "muted", hl: s === 2 });
        c.box({ x: 328, y: 104, w: 296, h: 56, label: "batch of 64", sub: "split another way", tone: "muted", hl: s === 2 });
      }
      if (s >= 3) c.box({ x: 16, y: 184, w: 608, h: 56, label: "DEEPINFER_BATCH_INVARIANT=1 → deterministic kernels", mono: true, size: 13, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 16, y: 260, w: 608, h: 56, label: "random number = hash(seq_seed, position)", sub: "SplitMix64 (random_sampling.py)", mono: true, size: 13, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------- results: wide EP
  D["wide-ep"] = (fig, k) => {
    const c = k.canvas(W, H);
    // read off doc/images/wide_ep_decode_pareto.png (approximate): [requests/GPU, per-user tok/s, tok/s/GPU]
    const EP64 = [[8, 325, 2600], [16, 315, 5050], [32, 298, 9500], [64, 246, 15700], [128, 179, 22800], [256, 103, 26300]];
    const EP8 = [[8, 238, 1850], [16, 230, 3700], [32, 220, 7050], [64, 198, 12650], [128, 150, 19200], [256, 98, 24900]];
    return (s) => {
      c.clear();
      const ser = [{ x: EP64.map((p) => p[1]), y: EP64.map((p) => p[2]), tone: "code", dots: true, label: "EP64", labelAt: 2, dim: s === 1 }];
      if (s >= 4) ser.push({ x: EP8.map((p) => p[1]), y: EP8.map((p) => p[2]), tone: "muted", dots: true, label: "EP8", labelAt: 4 });
      const p = c.plot({ series: ser, xmin: 50, xmax: 350, ymin: 0, ymax: 30000, h: 356, y: 2, xlabel: "per-user speed (tokens/s)", ylabel: "throughput (tokens/s/GPU)", yFmt: (v) => `${v / 1000}k` });
      if (s === 1) EP64.forEach(([n, x, y]) => c.label(p.X(x), p.Y(y) - 12, String(n), { anchor: "middle", size: 12, tone: "code", weight: 600 }));
      if (s === 2) { c.dot(p.X(103), p.Y(26300), { r: 7, tone: "predict" }); c.dot(p.X(325), p.Y(2600), { r: 7, tone: "predict" }); }
      if (s === 3) c.arrow(p.X(320), p.Y(4000), p.X(110), p.Y(24000), { tone: "predict", dash: true, label: "more requests", snap: false });
      if (s >= 4) { c.dot(p.X(246), p.Y(15700), { r: 7, tone: "code" }); c.dot(p.X(198), p.Y(12650), { r: 7, tone: "muted" }); }
    };
  };

  // ------------------------------------------------------- results: prefill curve
  D["prefill-curve"] = (fig, k) => {
    const c = k.canvas(W, H);
    // read off doc/images/prefill_pareto.png (approximate): [chunk tokens, ms/step, tok/s/GPU]
    const P = [[4096, 68, 60000], [8192, 114, 71600], [16384, 201, 81700], [32768, 377, 87000], [65536, 732, 89500]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [{ x: P.map((q) => q[1]), y: P.map((q) => q[2]), tone: "paper", dots: true }], xmin: 0, xmax: 800, ymin: 0, ymax: 100000, h: 356, y: 2,
        xlabel: "latency (ms per prefill step)", ylabel: "tokens/s/GPU", yFmt: (v) => `${v / 1000}k` });
      if (s === 1) P.forEach(([n, x, y]) => c.label(p.X(x), p.Y(y) - 12, fmtInt(n), { anchor: "middle", size: 12, tone: "paper", weight: 600 }));
      if (s === 2) { c.dot(p.X(377), p.Y(87000), { r: 7, tone: "predict" }); c.dot(p.X(732), p.Y(89500), { r: 7, tone: "predict" }); c.label(p.X(560), p.Y(70000), "+3%", { size: 14, tone: "predict", weight: 700 }); }
      if (s === 3) { c.line(p.X(732), p.Y(0), p.X(732), p.Y(89500), { tone: "bad", dash: true }); c.label(p.X(700), p.Y(40000), "≈ 730 ms", { anchor: "end", size: 13, tone: "bad", weight: 700 }); }
      if (s >= 4) c.box({ x: p.X(250), y: p.Y(40000), w: 300, h: 56, label: "1,104 tokens ÷ 80,000/s ≈ 14 ms", sub: "our arithmetic", mono: true, size: 13, tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- results: DSpark table
  D["dspark-result"] = (fig, k) => {
    const conc = k.slider({ label: "requests per GPU", min: 0, max: 5, step: 1, value: 0, fmt: (v) => String([16, 32, 48, 60, 72, 96][v]) });
    k.follow(conc, { 1: 0, 2: 3, 3: 5 });
    const c = k.canvas(W, H);
    // doc DSpark table: [conc, fixed tok/s/rank, dynamic tok/s/rank, gain %, verified, accepted fixed, accepted dyn]
    const T = [[16, 4891, 4816, -1.5, 4.44, 3.32, 3.24], [32, 8964, 9111, 1.6, 3.65, 3.25, 3.17], [48, 12032, 12467, 3.6, 3.94, 3.3, 3.26],
      [60, 13730, 14466, 5.4, 3.58, 3.3, 3.21], [72, 14962, 15961, 6.7, 3.24, 3.29, 3.12], [96, 16817, 18660, 11.0, 3.24, 3.3, 3.15]];
    return (s) => {
      c.clear();
      const r = T[conc.value];
      const p = c.plot({ series: [{ x: T.map((t) => t[0]), y: T.map((t) => t[3]), tone: "code", dots: true }], xmin: 0, xmax: 100, ymin: -4, ymax: 12, w: 400, h: 356, y: 2,
        xlabel: "requests per GPU", ylabel: "gain over fixed-5 (%)" });
      c.line(p.X(0), p.Y(0), p.X(100), p.Y(0), { tone: "muted", dash: true });
      c.dot(p.X(r[0]), p.Y(r[3]), { r: 7, tone: "predict" });
      c.box({ x: 420, y: 20, w: 206, h: 56, label: `${r[3] > 0 ? "+" : ""}${r[3]}%`, sub: `at ${r[0]} requests`, mono: true, size: 18, tone: r[3] < 0 ? "bad" : "code", hl: true });
      c.box({ x: 420, y: 90, w: 206, h: 56, label: `${fmtInt(r[1])} → ${fmtInt(r[2])}`, sub: "tok/s per GPU", mono: true, size: 13, tone: "paper" });
      c.box({ x: 420, y: 160, w: 206, h: 56, label: `verified 5 → ${r[4]}`, sub: `accepted ${r[5]} → ${r[6]}`, mono: true, size: 13, tone: "take", hl: s >= 4 });
    };
  };

  // ------------------------------------------------------- results: production
  D["production"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 20, w: 296, h: 80, label: "155 trillion tokens / day", sub: "one cluster (doc)", tone: "code", hl: s === 1 });
      if (s >= 2) c.box({ x: 328, y: 20, w: 296, h: 80, label: "US$38 per GPU-hour", sub: "revenue, off-peak pricing (doc)", tone: "code", hl: s === 2 });
      if (s >= 3) hbars(c, { x: 16, y: 120, w: 608, labelW: 150, rowH: 42, max: 100, fmt: (v) => `${v}%`,
        rows: [{ label: "AIME 2026", v: 99.9, tone: "take", hl: s === 3 }, { label: "GPQA Diamond", v: 93.4, tone: "take", hl: s === 3 }, { label: "HLE", v: 42.6, tone: "take", hl: s === 3 }] });
      if (s >= 4) c.box({ x: 16, y: 270, w: 608, h: 56, label: "all numbers self-reported by DeepSeek", tone: "bad", hl: true });
    };
  };

  // ------------------------------------------------------- your move
  D["code"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["csrc/engine/", "scheduler.hpp · mtp_varlen.hpp", "code"],
      ["eplb/policy.py", "greedy replica packing", "code"],
      ["external kernels", "FlashMLA · DeepGEMM · DeepEP · TileLang", "code"],
      ["structure_output/", "xgrammar token masks", "code"],
      ["training code", "none; started from vLLM", "muted"],
    ], s, { rh: 68, qW: 220, monoQ: true }); };
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["Defaults as advertised?", "async, varlen, replay: off by default", "bad"],
      ["Doc matches code?", "chunk cost model not in repo", "predict"],
      ["Numbers in tables?", "plots only; values approximate", "predict"],
      ["Whole system open?", "no KV store, P/D glue or balancers", "bad"],
      ["Steelman", "rare real production detail", "code"],
    ], s, { rh: 68 }); };
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["Hardware?", "NVIDIA SM100 or Ascend 950 only", "bad"],
      ["GPUs?", "64 prefill + 64 decode to be efficient", "bad"],
      ["Your model?", "only V4.1 Flash (763B)", "bad"],
      ["Ideas to borrow?", "async steps · draft choice · invariance", "code"],
      ["Verdict", "read it, don't deploy it", "take"],
    ], s, { rh: 68 }); };
  };
})();
