/* Drawings for the OmniVoice lesson. One entry per data-draw name. Each is
   redrawn on every step and control change. Numbers from the paper carry a
   // Table N comment; code facts cite the file (k2-fsa/OmniVoice @ 08be0b4).
   Everything else is illustrative layout, seeded randomness or live arithmetic. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;
  const data = () => window.RD_OMNI || { HOURS: [], FLEURS: [] };

  // ---------------------------------------------------------------- helpers
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const fmtInt = (v) => Math.round(v).toLocaleString("en-US");
  const pct = (v, d = 1) => `${(100 * v).toFixed(d)}%`;

  // Eq. 3 with the code's rounding (models/omnivoice.py: _generate_iterative)
  const schedule = (total, N, tau) => {
    const ts = []; for (let i = 0; i <= N; i++) { const x = i / N; ts.push((tau * x) / (1 + (tau - 1) * x)); }
    let rem = total; const out = [];
    for (let i = 0; i < N; i++) { const n = i === N - 1 ? rem : Math.min(Math.ceil(total * (ts[i + 1] - ts[i])), rem); out.push(n); rem -= n; }
    return out;
  };

  // a grid of cells drawn as raw rects. state(i, j) -> {tone, solid, dashed, hl} or null (empty)
  const grid = (c, k, o) => {
    for (let i = 0; i < o.rows; i++) for (let j = 0; j < o.cols; j++) {
      const s = o.state(i, j); if (!s) continue;
      const x = o.x + j * o.cw, y = o.y + i * o.ch;
      c.add(k.h("rect", { x: x + 1, y: y + 1, width: o.cw - 2, height: o.ch - 2, rx: 2,
        class: `f-${s.tone} ${s.solid ? "" : s.soft ? "soft" : "softer"} s-${s.stroke || s.tone}${s.dim ? " rdx-dim" : ""}`,
        "stroke-width": s.hl ? 1.8 : 0.8, "stroke-dasharray": s.dashed ? "3 2" : undefined }));
    }
    c.occupy({ x: o.x, y: o.y, w: o.cols * o.cw, h: o.rows * o.ch });
  };
  const rowLabels = (c, o, labels, hl) => labels.forEach((t, i) =>
    c.text(o.x - 6, o.y + i * o.ch + o.ch / 2 + 4, t, { anchor: "end", size: 11, mono: true, tone: hl && hl(i) ? "ink" : "muted", weight: hl && hl(i) ? 700 : 400 }));

  // horizontal bars with per-row tone; returns X(value)
  const hbars = (c, o) => {
    const x0 = o.x + o.labelW, bw = o.w - o.labelW - 60, X = (v) => x0 + (v / o.max) * bw;
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

  // a checklist board: rows [question, answer, tone]; row i appears on step i+1
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

  // ------------------------------------------------------- toolbox: tokens
  D["tokens"] = (fig, k) => {
    const sec = k.slider({ label: "target length", min: 1, max: 30, step: 1, value: 10, fmt: (v) => `${v} s` });
    k.follow(sec, { 1: 10 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    const r = rng(11), wave = Array.from({ length: 400 }, (_, i) => Math.sin(i / 3.1) * (0.35 + 0.6 * r()) * Math.sin(i / 47) );
    const ids = Array.from({ length: 8 * 25 }, () => Math.floor(r() * 1024));
    const G = { x: 70, y: 112, cols: 25, rows: 8, cw: 18, ch: 19 };
    const WT = [8, 8, 6, 6, 4, 4, 2, 2];   // training/config.py audio_codebook_weights
    return (s) => {
      c.clear();
      const frames = sec.value * 25, toks = frames * 8;
      read.textContent = `${fmtInt(frames)} frames × 8 = ${fmtInt(toks)} tokens`;
      // waveform: one second, 25 frame ticks
      const x0 = G.x, x1 = G.x + G.cols * G.cw, yc = 58;
      c.path("M" + wave.map((v, i) => `${(x0 + (i / 399) * (x1 - x0)).toFixed(1)},${(yc - v * 26).toFixed(1)}`).join(" L"), { tone: "bridge", width: 1.3 });
      c.occupy({ x: x0, y: yc - 30, w: x1 - x0, h: 60 });
      c.text(x0, 18, "first second of speech, 24 kHz", { size: 13, tone: "bridge", weight: 600 });
      for (let j = 0; j <= 25; j++) c.line(x0 + j * G.cw, yc + 30, x0 + j * G.cw, yc + 38, { tone: s === 1 ? "predict" : "muted", width: 1 });
      if (s === 1) c.label(x1 + 8, yc + 34, "25 frames", { size: 13, tone: "predict", weight: 700 });
      if (s >= 2) {
        const col = 6;
        grid(c, k, { ...G, state: (i, j) => ({ tone: "paper", soft: s === 3 ? WT[i] >= 6 : j === col, solid: s === 3 && WT[i] === 8,
          hl: s === 2 && j === col, dim: s === 2 && j !== col }) });
        rowLabels(c, G, ["cb1", "cb2", "cb3", "cb4", "cb5", "cb6", "cb7", "cb8"], (i) => s === 3 && i < 2);
        if (s === 2) {
          const m = c.matrix({ x: 540, y: G.y, data: ids.slice(0, 8).map((v) => [v]), cell: 64, cellH: G.ch, fmt: (v) => String(v), tone: () => "paper" });
          c.label(572, G.y + 8 * G.ch + 22, "one frame", { anchor: "middle", size: 13, tone: "paper", weight: 700 });
          c.arrow(G.x + 6.5 * G.cw, G.y - 4, 536, G.y + 10, { tone: "paper", snap: false, dash: true });
        }
        if (s === 3) c.box({ x: 540, y: G.y + 20, w: 92, h: 110, label: "loss weight", sub: "8,8 … 2,2", tone: "take", hl: true });
      }
      if (s >= 4) {
        const b = c.box({ x: 20, y: 290, w: 330, h: 56, label: `${sec.value} s → ${fmtInt(frames)} × 8 = ${fmtInt(toks)} tokens`, mono: true, size: 15, tone: "predict", hl: s === 4 });
        if (s >= 5) {
          const d = c.box({ x: 420, y: 290, w: 200, h: 56, label: "codec decoder", sub: "→ 24 kHz audio", tone: "bridge", hl: true });
          c.connect(b, d, { tone: "bridge" });
        }
      }
    };
  };

  // ------------------------------------------------------- toolbox: maskgen
  D["maskgen"] = (fig, k) => {
    const pass = k.slider({ label: "pass", min: 0, max: 32, step: 1, value: 0, fmt: (v) => `${v} / 32` });
    k.follow(pass, { 1: 0, 2: 0, 3: 1, 4: 32 });
    const c = k.canvas(W, H);
    const G = { x: 70, y: 40, cols: 25, rows: 8, cw: 20, ch: 20 };
    const r = rng(7);
    // illustrative fill order: lower rows earlier, random within
    const order = Array.from({ length: 200 }, (_, n) => n).map((n) => ({ n, key: Math.floor(n / 25) * 0.6 + r() * 3 })).sort((a, b) => a.key - b.key).map((o) => o.n);
    const rank = new Array(200); order.forEach((n, i) => { rank[n] = i; });
    const sched = schedule(200, 32, 0.1), cum = [0]; sched.forEach((v) => cum.push(cum[cum.length - 1] + v));
    const rt = rng(3), trainMask = Array.from({ length: 200 }, () => rt() < 0.6);
    return (s) => {
      c.clear();
      const filled = s >= 5 ? 0 : cum[pass.value];
      const train = s === 5;
      grid(c, k, { ...G, state: (i, j) => {
        const n = i * 25 + j;
        if (train) return trainMask[n] ? { tone: "predict", soft: true, dashed: true } : { tone: "paper", soft: true };
        if (rank[n] < filled) return { tone: "code", soft: rank[n] >= cum[Math.max(0, pass.value - 1)], solid: rank[n] < cum[Math.max(0, pass.value - 1)] };
        return s === 2 ? { tone: "take", stroke: "take", dashed: true } : { tone: "muted", dashed: true };
      } });
      rowLabels(c, G, ["cb1", "cb2", "cb3", "cb4", "cb5", "cb6", "cb7", "cb8"]);
      const head = train ? "training: 60% hidden at random" : s === 2 ? "a guess for every blank" : `pass ${pass.value}: ${filled} of 200 filled`;
      c.text(G.x, 26, head, { size: 15, weight: 700, tone: train ? "predict" : "ink" });
      c.text(G.x + G.cols * G.cw + 12, G.y + 12, train ? "hidden" : "[M]", { size: 12, tone: train ? "predict" : "muted", mono: true });
      const steps = [["all [M]", "muted"], ["guess all", "take"], ["keep surest", "code"], ["repeat ×32", "paper"]];
      let prev = null;
      steps.forEach(([t, tone], i) => {
        const b = c.box({ x: 20 + i * 156, y: 236, w: 132, h: 46, label: t, tone, hl: s === i + 1, dim: !train && s < i + 1 || train });
        if (prev) c.connect(prev, b, { tone: "muted" });
        prev = b;
      });
      if (train) c.box({ x: 20, y: 298, w: 600, h: 48, label: "training: hide a random share p ~ U(0, 1), predict the hidden cells", size: 14, tone: "predict", hl: true });
      else if (s >= 4) c.box({ x: 20, y: 298, w: 600, h: 48, label: "frame-by-frame autoregression: 250 passes for 10 s", size: 14, tone: "muted" });
    };
  };

  // ------------------------------------------------------- toolbox: stages
  D["stages"] = (fig, k) => {
    const c = k.canvas(W, H);
    const lane = (y, name, boxes, o) => {
      c.text(20, y - 8, name, { size: 13, weight: 700, tone: o.hl ? "ink" : "muted", dim: o.dim });
      let prev = null; const out = [];
      boxes.forEach(([t, tone], i) => {
        const b = c.box({ x: 20 + i * 156, y, w: 128, h: 50, label: t, size: 14, tone, hl: o.hl && o.hlBox === i, dim: o.dim });
        if (prev) out.push(c.connect(prev, b, { tone: o.bad === i ? "bad" : "muted", dim: o.dim }));
        prev = b; out.push(b);
      });
      return out;
    };
    return (s) => {
      c.clear();
      lane(36, "continuous NAR (F5-TTS, ZipVoice)", [["text", "paper"], ["mel / latent frames", "take"], ["audio", "bridge"]], { hl: s === 1, dim: s > 1 && s < 5 });
      lane(150, "discrete, two stages (MaskGCT)", [["text", "paper"], ["semantic tokens", "take"], ["acoustic tokens", "take"], ["audio", "bridge"]],
        { hl: s >= 2 && s <= 4, dim: s === 1 || s === 5, hlBox: s === 4 ? 1 : -1, bad: s === 3 ? 1 : -1 });
      if (s === 3) c.label(328, 140, "errors flow down", { anchor: "middle", size: 13, tone: "bad", weight: 700 });
      if (s === 4) c.label(240, 220, "low bitrate: detail lost", { anchor: "middle", size: 13, tone: "bad", weight: 700 });
      if (s >= 5) lane(276, "discrete, one stage (OmniVoice)", [["text", "paper"], ["acoustic tokens", "take"], ["audio", "bridge"]], { hl: true, hlBox: 1 });
      else c.text(20, 300, s >= 2 ? "one stage: text → acoustic tokens (lagged on intelligibility)" : "", { size: 13, tone: "muted" });
    };
  };

  // ------------------------------------------------------- machine: whole machine
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const y = c.box({ x: 16, y: 20, w: 150, h: 54, label: "text tokens Y", sub: "instruct + text", tone: "paper", hl: s === 1 });
      const p = c.box({ x: 16, y: 104, w: 150, h: 54, label: "prompt X", sub: "75 known frames", tone: "bridge", hl: s === 2, dim: s < 2 });
      const t = c.box({ x: 16, y: 176, w: 150, h: 54, label: "target X", sub: "250 frames of [M]", tone: "muted", dashed: true, hl: s === 2, dim: s < 2 });
      const sum = c.box({ x: 196, y: 130, w: 110, h: 64, label: "Σ 8 embeddings", sub: "per frame", tone: "take", hl: s === 3, dim: s < 3 });
      const tr = c.box({ x: 336, y: 20, w: 124, h: 210, label: "bidirectional transformer", sub: "28 layers", tone: "take", hl: s === 4, dim: s < 4 });
      const hd = c.box({ x: 490, y: 60, w: 134, h: 70, label: "8 heads", sub: "1,025-way each", tone: "take", hl: s === 5, dim: s < 5 });
      const out = c.box({ x: 490, y: 170, w: 134, h: 60, label: "filled grid", sub: "→ codec → audio", tone: "code", hl: s === 5, dim: s < 5 });
      c.connect(y, tr, { tone: "paper", dim: s < 4 });
      c.connect(p, sum, { tone: "bridge", dim: s < 3 });
      c.connect(t, sum, { tone: "muted", dim: s < 3 });
      c.connect(sum, tr, { tone: "take", dim: s < 4 });
      c.connect(tr, hd, { tone: "take", dim: s < 5 });
      c.connect(hd, out, { tone: "code", dim: s < 5 });
      // the single sequence, drawn to scale in positions (text length illustrative)
      const x0 = 16, wAll = 608, nText = 40, n = nText + 75 + 250, u = wAll / n;
      c.text(x0, 268, "one sequence, to scale in positions (text length illustrative)", { size: 12, tone: "muted" });
      c.box({ x: x0, y: 280, w: nText * u, h: 40, label: "Y", tone: "paper", hl: s === 1, solid: s === 1 });
      c.box({ x: x0 + nText * u, y: 280, w: 75 * u, h: 40, label: "75", tone: "bridge", hl: s === 2, dim: s < 2 });
      c.box({ x: x0 + (nText + 75) * u, y: 280, w: 250 * u, h: 40, label: "250 masked frames", tone: "muted", dashed: true, hl: s === 2, dim: s < 2 });
      if (s >= 4) c.text(x0, 344, "every position attends to every other", { size: 12, tone: "take", weight: 600 });
    };
  };

  // ------------------------------------------------------- machine: reads
  D["reads"] = (fig, k) => {
    const mode = k.toggle({ label: "mode", options: ["clone", "design"], value: "clone" });
    k.follow(mode, { 1: "clone", 5: "design", 6: "clone" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const clone = mode.value === "clone";
      const on = (grp) => ({ style: s === 1, text: s === 2, prompt: s === 3, target: s === 4, instr: s === 5, extra: s === 6 }[grp]);
      const it = (t, tone, grp, o = {}) => ({ t, tone, hl: on(grp), dim: !on(grp) && s < 7 && !(grp === "always"), ...o });
      const items = [];
      if (clone) items.push(it("<|denoise|>", "predict", "extra"));
      items.push(it("<|lang_start|>", "take", "style"), it("te", "take", "style"), it("<|lang_end|>", "take", "style"),
        it("<|instruct_start|>", "take", clone ? "style" : "instr"), it(clone ? "None" : "female, low pitch", "take", clone ? "style" : "instr"), it("<|instruct_end|>", "take", clone ? "style" : "instr"),
        it("<|text_start|>", "paper", "text"));
      if (clone) items.push(it("prompt transcript", "paper", "text"));
      items.push(it("new sentence", "paper", "text"));
      if (clone && s >= 6) items.push(it("[laughter]", "predict", "extra"));
      items.push(it("<|text_end|>", "paper", "text"));
      if (clone) items.push(it("prompt audio: 75 frames", "bridge", "prompt"));
      items.push(it("target: 250 × [M]", "muted", "target", { dashed: true }));
      c.text(20, 22, clone ? "voice cloning: prompt audio carries the voice" : "voice design: attributes replace the prompt", { size: 14, weight: 700 });
      const ch = c.chips({ x: 20, y: 40, items, maxW: 600, size: 13 });
      const ly = Math.max(ch.bottom + 30, 250);
      [["style", "take"], ["text", "paper"], ["known audio", "bridge"], ["masked audio", "muted"]].forEach(([t, tone], i) =>
        c.box({ x: 20 + i * 152, y: ly, w: 136, h: 34, label: t, size: 13, tone, dashed: tone === "muted" }));
      c.text(20, ly + 62, "text tokens repeat on all 8 codebook rows; only row 1 is embedded (code)", { size: 12, tone: "muted", maxW: 600, lines: 1 });
    };
  };

  // ------------------------------------------------------- machine: embed
  D["embed"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ids = [412, 77, 903, 15, 640, 288, 1001, 59];   // made up
    return (s) => {
      c.clear();
      const rh = 29, y0 = 16;
      ids.forEach((v, i) => {
        const y = y0 + i * rh;
        c.box({ x: 16, y, w: 70, h: rh - 5, label: `${v}`, mono: true, size: 13, tone: "paper", hl: s === 1, sub: undefined });
        if (s >= 2) c.box({ x: 104, y, w: 210, h: rh - 5, label: `${v} + ${i}×1025 = ${v + i * 1025}`, mono: true, size: 12, tone: "take", hl: s === 2 });
        if (s >= 3) for (let q = 0; q < 6; q++) c.add(k.h("rect", { x: 330 + q * 13, y: y + 4, width: 11, height: rh - 13, rx: 2,
          class: `f-take ${((v * (q + 3)) % 7) > 3 ? "soft" : "softer"} s-take`, "stroke-width": 0.6 }));
      });
      c.occupy({ x: 330, y: y0, w: 80, h: 8 * rh });
      c.text(16, y0 + 8 * rh + 14, "one frame, cb1 … cb8", { size: 12, tone: "muted" });
      c.box({ x: 440, y: 16, w: 186, h: 54, label: "one table", sub: "8,200 rows × 1,024", tone: "take", hl: s === 1 || s === 2 });
      if (s >= 3) {
        const sm = c.box({ x: 440, y: 96, w: 60, h: 60, label: "Σ", size: 24, tone: "take", hl: s === 3 });
        const vec = c.box({ x: 520, y: 96, w: 106, h: 60, label: "1 vector", sub: "1,024 wide", tone: "take", hl: s === 3 });
        c.connect(sm, vec, { tone: "take" });
        c.arrow(412, y0 + 4 * rh, 436, 126, { tone: "take", snap: false });
      }
      if (s >= 4) c.box({ x: 440, y: 176, w: 186, h: 54, label: "text tokens", sub: "Qwen embedding, 151,676", tone: "paper", hl: s === 4 });
      if (s >= 5) c.box({ x: 16, y: 280, w: 610, h: 58, label: "output: linear 1,024 → 8 × 1,025 logits, one distribution per codebook", size: 14, tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- machine: mask (training)
  D["mask"] = (fig, k) => {
    const p = k.slider({ label: "masking rate p", min: 0, max: 1, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(p, { 2: 0.5 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    const G = { x: 70, y: 36, cols: 40, rows: 8, cw: 13.5, ch: 20 };
    const r = rng(21), u = Array.from({ length: 320 }, () => r());
    const P0 = 8;   // prompt: 8 of 40 frames = 20%, inside the code's 0–30% range
    return (s) => {
      c.clear();
      let masked = 0, target = 0;
      grid(c, k, { ...G, state: (i, j) => {
        if (j < P0) return { tone: "bridge", soft: true, hl: s === 1 };
        target++;
        const m = s >= 3 && u[i * 40 + j] < p.value; if (m) masked++;
        return m ? { tone: s >= 4 ? "predict" : "muted", soft: s >= 4, dashed: true, hl: s >= 4 } : { tone: "paper", soft: false };
      } });
      rowLabels(c, G, ["cb1", "cb2", "cb3", "cb4", "cb5", "cb6", "cb7", "cb8"]);
      c.text(G.x, 24, "prompt 20%", { size: 12, tone: "bridge", weight: 700 });
      c.text(G.x + 40 * G.cw, 24, "target: every cell, every codebook", { anchor: "end", size: 12, tone: s >= 3 ? "ink" : "muted" });
      read.textContent = s >= 3 ? `masked: ${masked} of ${target} target cells shown` : "";
      // number line for p
      const lx0 = 70, lx1 = 610, ly = 236, X = (v) => lx0 + v * (lx1 - lx0);
      if (s >= 2) {
        c.line(lx0, ly, lx1, ly, { tone: "muted" });
        [0, 0.5, 1].forEach((v) => { c.line(X(v), ly - 5, X(v), ly + 5, { tone: "muted" }); c.text(X(v), ly + 20, v.toFixed(1), { anchor: "middle", size: 11, tone: "muted" }); });
        c.dot(X(p.value), ly, { r: 7, tone: "predict" });
        c.text(lx0, ly - 14, "p ~ U(0, 1), one draw per example", { size: 12, tone: "predict", weight: 600 });
      }
      if (s >= 4) c.box({ x: 70, y: 280, w: 300, h: 60, label: `in the loss: ≈ ${fmtInt(p.value * 2000)} of 2,000`, sub: "our 10 s target, p × 2,000", tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 390, y: 280, w: 236, h: 60, label: "average p = 0.5", sub: "≈ half of all cells train", tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- machine: per-layer vs full
  D["perlayer"] = (fig, k) => {
    const m = k.toggle({ label: "masking", options: ["per-layer", "full"], value: "per-layer" });
    k.follow(m, { 1: "per-layer", 5: "full" });
    const c = k.canvas(W, H);
    const G = { x: 70, y: 30, cols: 30, rows: 8, cw: 13, ch: 22 };
    const L = 3, r = rng(5), u = Array.from({ length: 240 }, () => r());
    return (s) => {
      c.clear();
      const full = m.value === "full";
      grid(c, k, { ...G, state: (i, j) => {
        const hide = u[i * 30 + j] < 0.5;
        if (full) return hide ? { tone: "predict", soft: true, dashed: true, hl: true } : { tone: "paper" };
        if (i < L) return { tone: "paper", hl: s === 2 };
        if (i === L) return hide ? { tone: "predict", soft: true, dashed: true, hl: s === 4 || s === 1 } : { tone: "paper" };
        return { tone: "muted", dashed: true, dim: s < 3 };
      } });
      rowLabels(c, G, ["cb1", "cb2", "cb3", "cb4", "cb5", "cb6", "cb7", "cb8"], (i) => !full && i === L);
      const bx = G.x + G.cols * G.cw + 16, bw = W - bx - 12;
      if (full) c.box({ x: bx, y: G.y, w: bw, h: 8 * G.ch, label: "every row: half hidden, all in the loss", tone: "predict", hl: true });
      else {
        c.box({ x: bx, y: G.y, w: bw, h: L * G.ch - 4, label: "visible", tone: "paper", hl: s === 2, dim: s < 2 });
        c.box({ x: bx, y: G.y + L * G.ch, w: bw, h: G.ch, label: "chosen: loss here", size: 12, tone: "predict", hl: s === 1 || s === 4 });
        c.box({ x: bx, y: G.y + (L + 1) * G.ch + 4, w: bw, h: (7 - L) * G.ch - 4, label: "hidden, no loss", tone: "muted", dashed: true, hl: s === 3, dim: s < 3 });
      }
      if (s >= 4) {
        const X = hbars(c, { x: 20, y: 228, w: 600, labelW: 130, rowH: 40, max: 2000, fmt: (v) => `${fmtInt(v)} of 2,000`,
          rows: [{ label: "per-layer", v: 125, tone: "muted", hl: !full }, { label: "full-codebook", v: s >= 5 ? 1000 : NaN, tone: "predict", hl: full }] });
        c.text(20, 330, "cells in the loss at p = 0.5, our 10 s target (our arithmetic)", { size: 12, tone: "muted" });
      }
    };
  };

  // ------------------------------------------------------- machine: loss
  D["loss"] = (fig, k) => {
    const v = k.toggle({ label: "view", options: ["Eq. 1", "code"], value: "Eq. 1" });
    k.follow(v, { 1: "Eq. 1", 2: "Eq. 1", 3: "code" });
    const c = k.canvas(W, H);
    const WT = [8, 8, 6, 6, 4, 4, 2, 2], SUM = 40;   // training/config.py, config.json
    return (s) => {
      c.clear();
      const code = v.value === "code";
      c.box({ x: 16, y: 12, w: 608, h: 48, label: "per masked cell: −log P(true token | X, Y)", mono: true, size: 15, tone: "paper", hl: s === 1 });
      c.box({ x: 16, y: 72, w: 608, h: 40, label: code ? "Σ_c  w_c · mean over row c's masked cells" : "Σ over all masked cells (each row ≈ 1/8)", mono: true, size: 14,
        tone: code ? "take" : "paper", hl: s === 2 || s === 3 });
      if (s >= 2) {
        const rows = WT.map((w, i) => ({ label: `codebook ${i + 1}`, v: code ? (s >= 4 ? w / SUM : 1 / 8) : 1 / 8, tone: code ? "take" : "paper", hl: code && s >= 4 && (i < 2 || i > 5) }));
        hbars(c, { x: 16, y: 122, w: 608, labelW: 120, rowH: 27, max: 0.25, rows, fmt: (x) => x.toFixed(3) });
      }
      if (s >= 5) c.label(520, 150, "code only", { size: 14, tone: "bad", weight: 700 });
    };
  };

  // ------------------------------------------------------- machine: LLM init
  D["llm"] = (fig, k) => {
    const m = k.toggle({ label: "attention", options: ["causal", "bidirectional"], value: "causal" });
    k.follow(m, { 1: "causal", 2: "causal", 3: "bidirectional" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const bi = m.value === "bidirectional";
      if (s === 1) {
        c.box({ x: 60, y: 110, w: 520, h: 70, label: "one-stage token TTS: weaker intelligibility", sub: "§2.1.2", tone: "bad", hl: true });
        return;
      }
      const tok = ["t1", "t2", "t3", "a1", "a2", "a3"];
      c.text(40, 30, bi ? "OmniVoice: every position sees all" : "Qwen3 pre-training: left to right", { size: 14, weight: 700, tone: bi ? "take" : "muted" });
      c.matrix({ x: 70, y: 66, cell: 36, cellH: 36, data: tok.map((_, i) => tok.map((_, j) => (bi || j <= i ? "✓" : "·"))), rowLabels: tok, colLabels: tok,
        fmt: (x) => x, tone: (i, j) => (bi || j <= i ? (bi && j > i ? "predict" : "take") : null) });
      c.text(40, 310, "rows attend to columns; t = text, a = audio", { size: 12, tone: "muted" });
      const parts = [["28 transformer layers", "copied", "code", 2], ["subword tokenizer", "copied", "code", 4], ["text embedding", "copied", "code", 4],
        ["audio embeddings", "new", "take", 5], ["audio heads", "new", "take", 5]];
      parts.forEach(([t, sub, tone, at], i) => {
        if (s < at) return;
        c.box({ x: 340, y: 30 + i * 62, w: 284, h: 50, label: t, sub, tone, hl: s === at });
      });
    };
  };

  // ------------------------------------------------------- machine: data
  D["data"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const { HOURS } = data(); const n = HOURS.length || 646;
      const p = c.plot({ series: [], xmin: 0, xmax: n, ylog: true, ymin: 0.01, ymax: 1e6, y: 10, h: 350, xlabel: "646 languages, sorted by training hours", ylabel: "hours (log)",
        yFmt: (v) => (v >= 1000 ? `${v / 1000}k` : String(v)) });
      const tel = HOURS.indexOf(230.21);   // Telugu, Table 11
      const pts = HOURS.map((h, i) => `${p.X(i + 0.5).toFixed(1)},${p.Y(h).toFixed(1)}`);
      c.path(`M${p.X(0)},${p.Y(0.01)} L${pts.join(" L")} L${p.X(n)},${p.Y(0.01)} Z`, { fill: "paper", tone: "paper", soft: true, width: 1 });
      if (s <= 2) c.box({ x: 360, y: 30, w: 250, h: 56, label: s === 1 ? "50 open datasets" : "restored audio, filtered text", sub: s === 1 ? "App. A" : "§2.2", tone: "paper", hl: true });
      if (s >= 3) { c.dot(p.X(0.5), p.Y(HOURS[0]), { r: 6, tone: "predict" }); c.label(p.X(8), p.Y(HOURS[0]), "English: 206,061 h (35%)", { size: 13, tone: "predict", weight: 700 }); }
      if (s >= 4) {
        c.line(p.X(10), p.Y(0.01), p.X(10), p.Y(1e4), { tone: "take", dash: true });
        c.label(p.X(14), p.Y(3e4), "top 10: 84% of hours", { size: 13, tone: "take", weight: 700 });
        c.line(p.X(0), p.Y(10.18), p.X(n), p.Y(10.18), { tone: "muted", dash: true });
        c.label(p.X(470), p.Y(30), "median: 10.2 h", { size: 13, tone: "muted", weight: 600 });
      }
      if (s >= 5) {
        c.dot(p.X(tel + 0.5), p.Y(230.21), { r: 6, tone: "bridge" });
        c.label(p.X(tel + 30), p.Y(1500), "Telugu: 230 h", { size: 13, tone: "bridge", weight: 700 });
        c.label(p.X(560), p.Y(0.6), "265 languages < 10 h", { size: 13, tone: "bad", weight: 700 });
      }
    };
  };

  // ------------------------------------------------------- machine: resample (Eq. 2)
  D["resample"] = (fig, k) => {
    const b = k.slider({ label: "β", min: 0, max: 1, step: 0.05, value: 1, fmt: (v) => v.toFixed(2) });
    k.follow(b, { 1: 1, 2: 0.8 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const { HOURS } = data(); const DM = 206061.1;   // English, Table 11
      const beta = b.value, r = (d) => Math.max(1, Math.round((DM / d) ** (1 - beta)));
      const xs = [], ys = [];
      for (let e = -2; e <= Math.log10(DM) + 1e-9; e += 0.02) { const d = 10 ** e; xs.push(d); ys.push(r(d)); }
      const ymax = Math.max(30, r(0.01) * 1.3);
      const p = c.plot({ series: [{ x: xs, y: ys, tone: "take", width: 2 }], xlog: true, ylog: true, xmin: 0.01, xmax: 3e5, ymin: 1, ymax, w: 400, h: 350, y: 6,
        xlabel: "training hours of a language", ylabel: "repeats r", yFmt: (v) => fmtInt(v), xFmt: (v) => (v >= 1000 ? `${v / 1000}k` : String(v)) });
      if (s >= 2) c.box({ x: 412, y: 10, w: 216, h: 56, label: "r = max(1, round((Dmax/D)^(1−β)))", mono: true, size: 12, tone: "take", hl: s === 2 });
      if (s >= 4) [[230.21, "Telugu", "bridge"], [10, "10 h", "predict"], [0.02, "smallest", "bad"]].forEach(([d, t, tone]) => {
        c.dot(p.X(d), p.Y(r(d)), { r: 5, tone });
        c.label(p.X(d) + 6, p.Y(r(d)) - 10, `${t}: ×${r(d)}`, { size: 12, tone, weight: 700 });
      });
      if (s >= 3) {
        let tot = 0, en = 0, small = 0, raw = 0, rawSmall = 0;
        HOURS.forEach((h, i) => { const e = r(h) * h; tot += e; raw += h; if (i === 0) en = e; if (h < 100) { small += e; rawSmall += h; } });
        if (!tot) return;
        c.box({ x: 412, y: 84, w: 216, h: 60, label: `English: ${pct(en / tot, 0)}`, sub: `raw ${pct(HOURS[0] / raw, 0)}`, tone: "predict", hl: s === 5 });
        c.box({ x: 412, y: 156, w: 216, h: 60, label: `under 100 h: ${pct(small / tot)}`, sub: `raw ${pct(rawSmall / raw)}`, tone: "code", hl: s === 5 });
        c.box({ x: 412, y: 228, w: 216, h: 60, label: `${fmtInt(tot / 1000)}k h per epoch`, sub: "after repeats", tone: "muted" });
        c.text(412, 312, "shares of training audio (our arithmetic)", { size: 11, tone: "muted", maxW: 216, lines: 2 });
      }
    };
  };

  // ------------------------------------------------------- machine: length (Eq. 4)
  D["length"] = (fig, k) => {
    const lang = k.toggle({ label: "target", options: ["English", "Telugu", "Chinese"], value: "English" });
    k.follow(lang, { 1: "English", 4: "Telugu" });
    const c = k.canvas(W, H);
    // utils/duration.py RuleDurationEstimator._get_char_weight, for the scripts used here
    const wt = (ch) => {
      const cp = ch.codePointAt(0);
      if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) return 1.0;
      if (cp === 32) return 0.2;
      if (/\p{M}/u.test(ch)) return 0;
      if (/[\p{P}\p{S}]/u.test(ch)) return 0.5;
      if (/\p{Z}/u.test(ch)) return 0.2;
      if (/\p{N}/u.test(ch)) return 3.5;
      if (cp >= 0x0900 && cp <= 0x0DFF) return 1.8;   // indic
      if (cp >= 0x3100 && cp <= 0x9FFF) return 3.0;   // cjk
      return 1.0;
    };
    const PROMPT = "Thanks for calling, how can I help?", PT = 75;   // our 3 s prompt = 75 frames
    const TARGET = { English: "Welcome to Research Daily.", Telugu: "నమస్కారం, స్వాగతం.", Chinese: "欢迎来到研究日报。" };
    const W_ = (t) => [...t].reduce((a, ch) => a + wt(ch), 0);
    return (s) => {
      c.clear();
      const txt = TARGET[lang.value], wp = W_(PROMPT), wtg = W_(txt);
      const est = (PT * wtg) / wp, boosted = est < 50 ? 50 * (est / 50) ** (1 / 3) : est;
      c.box({ x: 16, y: 10, w: 400, h: 46, label: `prompt: "${PROMPT}"`, size: 13, tone: "bridge", sub: `3 s = 75 frames · weight ${wp.toFixed(1)}` });
      if (s === 1) { c.box({ x: 16, y: 80, w: 608, h: 70, label: "target grid: ? frames × 8", sub: "must be fixed before pass 1", tone: "muted", dashed: true, hl: true }); return; }
      const items = [...txt].map((ch) => ({ t: `${ch === " " ? "␣" : ch} ${wt(ch).toFixed(1).replace(".0", "")}`, tone: wt(ch) === 0 ? "bad" : wt(ch) >= 1.8 ? "take" : "paper",
        hl: s === 4 && wt(ch) === 0, dashed: wt(ch) === 0 }));
      c.text(16, 80, `target: ${lang.value}, each character with its weight`, { size: 13, weight: 700, tone: "take" });
      const ch = c.chips({ x: 16, y: 90, items, maxW: 608, size: 13 });
      const y2 = ch.bottom + 16;
      if (s >= 3) c.box({ x: 16, y: y2, w: 608, h: 50, label: `75 × ${wtg.toFixed(1)} ÷ ${wp.toFixed(1)} = ${est.toFixed(1)} frames`, mono: true, size: 15, tone: "predict", hl: s === 3 });
      if (s >= 5) c.box({ x: 16, y: y2 + 62, w: 608, h: 50, label: est < 50 ? `under 50 → 50 × (${est.toFixed(1)}/50)^(1/3) = ${boosted.toFixed(1)} frames` : `${est.toFixed(1)} ≥ 50 frames: no boost`, mono: true, size: 14, tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- machine: schedule (Eq. 3)
  D["schedule"] = (fig, k) => {
    const n = k.slider({ label: "after pass", min: 0, max: 32, step: 1, value: 32, fmt: (v) => `${v}` });
    const tau = k.toggle({ label: "τ", options: ["0.1", "1"], value: "0.1" });
    k.follow(n, { 1: 32, 2: 16, 3: 32 });
    k.follow(tau, { 1: "0.1", 4: "1", 5: "0.1" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const sch = schedule(2000, 32, +tau.value), cum = [0]; sch.forEach((v) => cum.push(cum[cum.length - 1] + v));
      const xs = cum.map((_, i) => i);
      const p = c.plot({ series: [{ x: xs, y: cum, tone: "paper", width: 2.4 }], xmin: 0, xmax: 32, ymin: 0, ymax: 2000, w: 390, h: 350, y: 6,
        xlabel: "pass", ylabel: "cells filled (of 2,000)" });
      const nv = n.value;
      c.dot(p.X(nv), p.Y(cum[nv]), { r: 6, tone: "predict" });
      if (nv > 0) c.line(p.X(nv - 1), p.Y(cum[nv - 1]), p.X(nv - 1), p.Y(cum[nv]), { tone: "predict", width: 3 });
      c.box({ x: 404, y: 10, w: 224, h: 58, label: `after ${nv}: ${fmtInt(cum[nv])} filled`, sub: `${pct(cum[nv] / 2000)} of the grid`, tone: "predict", hl: s <= 3 });
      c.box({ x: 404, y: 80, w: 224, h: 50, label: nv > 0 ? `pass ${nv} adds ${sch[nv - 1]}` : "nothing yet", tone: "paper", hl: s === 3 });
      if (s >= 4) c.box({ x: 404, y: 142, w: 224, h: 50, label: `τ = ${tau.value}`, sub: tau.value === "1" ? "even: ≈ 63 per pass" : "late passes do most", tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 404, y: 204, w: 224, h: 64, label: "WER 1.28 · 1.30 · 1.50 · 2.02", sub: "64 · 32 · 16 · 8 passes (T9)", size: 13, tone: "bad", hl: s === 5 });   // Table 9
      if (s >= 6) c.box({ x: 404, y: 280, w: 224, h: 64, label: "RTF 0.0598 → 0.0319", sub: "32 → 16 passes (Table 8)", size: 13, tone: "code", hl: true });   // Table 8
    };
  };

  // ------------------------------------------------------- machine: CFG
  D["cfg"] = (fig, k) => {
    const w = k.slider({ label: "guidance w", min: 0, max: 4, step: 0.5, value: 0, fmt: (v) => v.toFixed(1) });
    k.follow(w, { 1: 0, 3: 2 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    const COND = [0.45, 0.30, 0.15, 0.10], UNC = [0.20, 0.40, 0.25, 0.15];   // made up
    const NAMES = ["code 17", "code 512", "code 88", "code 930"];
    return (s) => {
      c.clear();
      const l = COND.map((p, i) => Math.log(p) + w.value * (Math.log(p) - Math.log(UNC[i])));
      const m = Math.max(...l), z = l.reduce((a, v) => a + Math.exp(v - m), 0), g = l.map((v) => Math.exp(v - m) / z);
      read.textContent = s >= 5 ? `guided sums to ${g.reduce((a, v) => a + v, 0).toFixed(2)}` : "";
      const a = c.box({ x: 16, y: 10, w: 290, h: 50, label: "c: with text + prompt", tone: "paper", hl: s === 1 });
      const b = c.box({ x: 334, y: 10, w: 290, h: 50, label: "u: target cells only", tone: "muted", hl: s === 1 || s === 2 });
      if (s >= 2) c.box({ x: 334, y: 70, w: 290, h: 40, label: "trained by dropping 10%", size: 13, tone: "muted", hl: s === 2 });
      if (s >= 3) c.box({ x: 16, y: 70, w: 290, h: 40, label: s >= 5 ? "log_softmax(c + w(c − u))" : "c + w(c − u), log space", mono: true, size: 14, tone: "take", hl: s === 3 || s === 5 });
      const rows = NAMES.map((t, i) => ({ label: t, values: [COND[i], UNC[i], s >= 3 ? g[i] : NaN], hl: i === 0 && s >= 4 }));
      c.bars({ x: 16, y: 130, w: 600, rowH: 52, labelW: 90, rows, tones: ["paper", "muted", "take"], max: 1, fmt: (v) => v.toFixed(2) });
      c.text(16, 350, "bars: c (blue), u (grey), guided (violet). Probabilities made up.", { size: 12, tone: "muted" });
    };
  };

  // ------------------------------------------------------- machine: pick positions
  D["pick"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = rng(42), base = Array.from({ length: 8 }, () => Array.from({ length: 6 }, () => -(0.05 + 2.5 * r())));
    const gum = Array.from({ length: 8 }, () => Array.from({ length: 6 }, () => { const u = r(); return -Math.log(-Math.log(u + 1e-10) + 1e-10); }));
    const filled = (i, j) => (i === 0 && (j === 1 || j === 4)) || (i === 1 && j === 2);   // already filled earlier
    const K = 6;
    return (s) => {
      c.clear();
      const val = (i, j) => {
        let v = base[i][j];
        if (s >= 2) v -= 5 * i;                 // layer_penalty_factor = 5.0
        if (s >= 3) v = v / 5 + gum[i][j];      // position_temperature = 5.0, Gumbel
        return v;
      };
      const cand = [];
      for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) if (!filled(i, j)) cand.push([val(i, j), i, j]);
      cand.sort((a, b) => b[0] - a[0]);
      const top = new Set(cand.slice(0, K).map(([, i, j]) => `${i},${j}`));
      const dataM = base.map((row, i) => row.map((_, j) => (filled(i, j) ? "done" : s >= 5 && top.has(`${i},${j}`) ? `#${(i * 131 + j * 71) % 1024}` : val(i, j).toFixed(1))));
      c.matrix({ x: 90, y: 36, data: dataM, cell: 66, cellH: 30, rowLabels: ["cb1", "cb2", "cb3", "cb4", "cb5", "cb6", "cb7", "cb8"], colLabels: ["t1", "t2", "t3", "t4", "t5", "t6"],
        fmt: (x) => x, tone: (i, j) => (filled(i, j) ? "muted" : s >= 4 && top.has(`${i},${j}`) ? "code" : s === 2 ? (i >= 4 ? "bad" : null) : null) });
      const eq = ["score = max log p (after guidance)", "score − 5 × layer index", "score ÷ 5 + Gumbel noise", `fill the top k = ${K}`, "token = argmax of its distribution"][s - 1];
      c.box({ x: 16, y: 300, w: 608, h: 46, label: eq, mono: true, size: 14, tone: s >= 4 ? "code" : "take", hl: true });
      c.box({ x: 498, y: 36, w: 128, h: 50, label: "done", sub: "filled earlier", tone: "muted" });
    };
  };

  // ------------------------------------------------------- results: same data
  D["same-data"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["WER", "SIM-o"], value: "WER" });
    k.follow(m, { 1: "WER", 3: "SIM-o", 4: "WER" });
    const c = k.canvas(W, H);
    // Table 1, LibriSpeech-PC test-clean: [WER, SIM-o]
    const T = [["real recordings", 1.87, 0.690, "muted"], ["F5-TTS (Emilia)", 1.89, 0.655, "muted"], ["ZipVoice (Emilia)", 1.64, 0.668, "muted"],
      ["MaskGCT (Emilia)", 2.26, 0.691, "muted"], ["OmniVoice-Emilia", 1.57, 0.697, "paper"], ["Qwen3-TTS (5,000k h)", 1.60, 0.704, "muted"], ["OmniVoice (581k h)", 1.30, 0.729, "code"]];
    return (s) => {
      c.clear();
      const wer = m.value === "WER";
      const rows = T.map(([label, a, b, tone], i) => ({ label, v: (i >= 5 && s < 4) ? NaN : wer ? a : b, tone,
        hl: (s === 1 && i >= 1 && i <= 4) || ((s === 2 || s === 3) && i === 4) || (s >= 4 && i === 6), dim: s >= 4 && i >= 1 && i <= 3 }));
      c.text(16, 22, wer ? "word error rate, % (lower is better)" : "speaker similarity SIM-o (higher is better)", { size: 14, weight: 700 });
      hbars(c, { x: 16, y: 34, w: 608, labelW: 180, rowH: 36, max: wer ? 2.5 : 0.8, rows, fmt: (v) => (wer ? v.toFixed(2) : v.toFixed(3)) });
      if (s >= 5) c.box({ x: 16, y: 296, w: 608, h: 50, label: "CMOS: OmniVoice 0.44 ± 0.16 · Qwen3-TTS 0.40 ± 0.16 (Table 2)", size: 14, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------- results: ablations
  D["ablations"] = (fig, k) => {
    const v = k.toggle({ label: "test", options: ["masking", "LLM init", "denoise"], value: "masking" });
    const ts = k.toggle({ label: "set", options: ["Libri", "Seed-en", "Seed-zh"], value: "Libri" });
    k.follow(v, { 1: "masking", 3: "LLM init", 5: "denoise" });
    k.follow(ts, { 1: "Libri" });
    const c = k.canvas(W, H);
    const MASK = [["SoundStorm-style", 3.00], ["MaskGCT-style", 2.04], ["full-codebook", 1.57], ["full, loss on 1 codebook", 2.85]];   // Table 5
    const LLM = [["LLM init, lr 1e-4", [1.57, 1.72, 0.89]], ["random, lr 1e-4", [2.79, 2.34, 1.11]], ["random, lr 2e-4", [2.52, 2.43, 1.01]],
      ["random, lr 5e-4", [2.56, 2.07, 1.01]], ["random, lr 1e-3", [2.72, 2.29, 1.02]]];   // Table 6
    return (s) => {
      c.clear();
      const view = v.value;
      if (view === "masking") {
        c.text(16, 22, "masking strategy: WER %, LibriSpeech-PC (Table 5)", { size: 14, weight: 700 });
        hbars(c, { x: 16, y: 40, w: 608, labelW: 200, rowH: 54, max: 3.2, rows: MASK.map(([l, x], i) => ({ label: l, v: x, tone: i === 2 ? "code" : i === 3 ? "bad" : "muted", hl: (s === 1 && i === 2) || (s === 2 && i === 3) })) });
      } else if (view === "LLM init") {
        const j = ["Libri", "Seed-en", "Seed-zh"].indexOf(ts.value);
        const vals = LLM.map(([, a]) => a[j]), best = Math.min(...vals.slice(1));
        c.text(16, 22, `initialisation: WER %, ${ts.value} (Table 6)`, { size: 14, weight: 700 });
        hbars(c, { x: 16, y: 40, w: 608, labelW: 200, rowH: 50, max: 3.2, rows: LLM.map(([l, a], i) => ({ label: l, v: a[j], tone: i === 0 ? "code" : "muted",
          hl: i === 0 || (s === 4 && a[j] === best) })) });
      } else {
        c.text(16, 22, "prompt-denoising training (Table 7)", { size: 14, weight: 700 });
        [["SIM-o", "0.697", "0.668", "bad"], ["UTMOS", "4.23", "4.32", "code"], ["WER %", "1.57", "1.56", "muted"]].forEach(([mname, a, b, tone], i) => {
          const y = 50 + i * 90;
          c.text(110, y + 34, mname, { anchor: "end", size: 15, weight: 700 });
          const A = c.box({ x: 130, y, w: 200, h: 56, label: a, sub: "without", tone: "muted" });
          const B = c.box({ x: 410, y, w: 200, h: 56, label: b, sub: "with <|denoise|>", tone, hl: tone !== "muted" });
          c.connect(A, B, { tone });
        });
      }
    };
  };

  // ------------------------------------------------------- results: commercial
  D["commercial"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["WER", "SIM-o"], value: "WER" });
    k.follow(m, { 1: "WER", 2: "SIM-o", 3: "WER" });
    const c = k.canvas(W, H);
    // Table 3: [language, WER Omni, MiniMax, ElevenLabs] (SIM-o: OmniVoice is highest in every row)
    const T = [["Arabic", 1.392, 1.665, 1.666], ["Cantonese", 17.709, 34.111, 51.513], ["Chinese", 1.008, 2.252, 16.026], ["Czech", 2.856, 3.875, 2.108],
      ["Dutch", 1.358, 1.143, 0.803], ["English", 1.560, 2.164, 2.339], ["Finnish", 3.750, 4.666, 2.964], ["French", 3.347, 4.099, 5.216], ["German", 0.964, 1.906, 0.572],
      ["Greek", 1.057, 2.016, 0.991], ["Hindi", 4.330, 6.962, 5.827], ["Indonesian", 1.973, 1.237, 1.059], ["Italian", 2.070, 1.543, 1.743], ["Japanese", 4.027, 3.519, 10.646],
      ["Korean", 2.651, 1.747, 1.865], ["Polish", 0.874, 1.415, 0.766], ["Portuguese", 2.511, 1.877, 1.331], ["Romanian", 2.424, 2.878, 1.347], ["Russian", 2.233, 4.281, 3.878],
      ["Spanish", 1.026, 1.029, 1.084], ["Thai", 3.978, 2.701, 73.936], ["Turkish", 2.166, 1.520, 0.699], ["Ukrainian", 1.774, 1.082, 0.997], ["Vietnamese", 1.373, 0.880, 73.415]];
    const AVG = { WER: [2.850, 3.774, 10.950], "SIM-o": [0.830, 0.766, 0.655] };   // Table 3, Average row
    const SYS = [["OmniVoice", "paper"], ["MiniMax", "take"], ["ElevenLabs", "predict"]];
    return (s) => {
      c.clear();
      const wer = m.value === "WER";
      hbars(c, { x: 16, y: 6, w: 608, labelW: 120, rowH: 32, max: wer ? 12 : 1, fmt: (v) => (wer ? `${v.toFixed(2)}%` : v.toFixed(3)),
        rows: SYS.map(([l, tone], i) => ({ label: `${l} avg`, v: AVG[m.value][i], tone, hl: (s <= 2 && i === 0) || (s === 4 && i === 2) })) });
      c.text(16, 116, wer ? "lowest WER, per language" : "highest SIM-o, per language", { size: 13, weight: 700 });
      const cw = 100, ch = 34, gx = 16, gy = 126;
      T.forEach(([l, o, mm, e], i) => {
        const win = wer ? (o < Math.min(mm, e) ? 0 : mm < e ? 1 : 2) : 0;
        const hot = (s === 4 && (l === "Thai" || l === "Vietnamese")) || (s === 5 && l === "Cantonese");
        c.box({ x: gx + (i % 6) * (cw + 2), y: gy + Math.floor(i / 6) * (ch + 4), w: cw, h: ch, label: l, size: 12, tone: SYS[win][1], hl: hot,
          dim: (s === 4 || s === 5) && !hot });
      });
      const ly = gy + 4 * (ch + 4) + 10;
      SYS.forEach(([l, tone], i) => c.box({ x: 16 + i * 140, y: ly, w: 128, h: 30, label: l, size: 12, tone }));
      if (s === 4) c.label(560, ly + 15, "ElevenLabs: 73.9% / 73.4%", { anchor: "end", size: 12, tone: "predict", weight: 700 });
      if (s === 5) c.label(600, ly + 15, "SenseVoice: 2.27%", { anchor: "end", size: 12, tone: "bad", weight: 700 });
    };
  };

  // ------------------------------------------------------- results: low-resource
  D["lowres"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const { FLEURS } = data();
      const p = c.plot({ series: [], xlog: true, xmin: 1, xmax: 3e5, ymin: 0, ymax: 30, y: 4, h: 352, xlabel: "training hours (Table 11)", ylabel: "CER % (Table 10)",
        xFmt: (v) => (v >= 1000 ? `${v / 1000}k` : String(v)) });
      if (s >= 3) {
        c.add(k.h("rect", { x: p.X(1), y: p.Y(30), width: p.X(20) - p.X(1), height: p.Y(0) - p.Y(30), class: "f-code softer" }));
        c.line(p.X(1), p.Y(5), p.X(3e5), p.Y(5), { tone: "code", dash: true });
      }
      FLEURS.forEach(([n, h, g, o]) => {
        c.dot(p.X(h), p.Y(Math.min(g, 29.5)), { r: 3.2, tone: "muted", dim: s >= 2 && s !== 5, noOcc: true });
        if (s >= 2) c.dot(p.X(h), p.Y(Math.min(o, 29.5)), { r: 3.6, tone: "paper", noOcc: true, dim: s === 5 });
      });
      c.text(p.X(1) + 8, 24, s >= 2 ? "blue: OmniVoice · grey: real speech" : "grey: real FLEURS recordings, 102 languages", { size: 13, weight: 700 });
      if (s === 2) {
        c.line(p.X(1), p.Y(4.00), p.X(3e5), p.Y(4.00), { tone: "paper", dash: true });
        c.label(p.X(3000), p.Y(8.5), "means: 4.00% vs 5.11%", { size: 13, tone: "paper", weight: 700 });
      }
      if (s === 3) {
        const lo = FLEURS.filter(([, h]) => h < 20), ok = lo.filter(([, , , o]) => o <= 5).length;
        c.label(p.X(4), p.Y(17), `under 20 h: ${ok} of ${lo.length} at ≤ 5%`, { size: 13, tone: "code", weight: 700 });
      }
      if (s === 4) [["Lao", 25.51, 7.63], ["Yoruba", 21.37, 15.66], ["Cantonese", 21.92, 13302.38]].forEach(([n, y, h]) => {
        c.dot(p.X(h), p.Y(y), { r: 5.5, tone: "bad" });
        c.label(p.X(h) + 8, p.Y(y) - 8, n, { size: 13, tone: "bad", weight: 700 });
      });
      if (s === 5) {
        c.dot(p.X(211.27), p.Y(29.5), { r: 5.5, tone: "predict" });
        c.label(p.X(211.27) + 10, p.Y(26), "Urdu real speech: 80.3% (off scale)", { size: 13, tone: "predict", weight: 700 });
      }
    };
  };

  // ------------------------------------------------------- your move
  D["code"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["data/processor.py", "prompt share, mask rate, loss labels", "code"],
      ["models/omnivoice.py", "embeddings, weighted loss, 32-pass decoder", "code"],
      ["utils/duration.py", "script weights for Eq. 4", "code"],
      ["examples/config + docs", "full training and LoRA fine-tuning", "code"],
      ["not in the paper", "weights 8…2 · penalty 5 · prompt 0–30% · drop 10%", "predict"],
    ], s, { rh: 68, qW: 220, monoQ: true }); };
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["Ablations at full scale?", "no: Emilia zh + en only (§4.3)", "bad"],
      ["Listening tests beyond zh/en?", "no: ASR scores only (Table 2)", "bad"],
      ["Matched baselines?", "only the NAR rows share Emilia (Table 1)", "predict"],
      ["Every setting in the paper?", "some only in the code", "predict"],
      ["Reproducible?", "open data + code, 9.66 days on 8 H800 (§3.3)", "code"],
    ], s, { rh: 68 }); };
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["Telugu in training?", "yes: 230 h (Table 11)", "code"],
      ["Intelligible by ASR?", "CER 3.77% vs real 4.51% (App. C)", "code"],
      ["Your prompt?", "3–10 s, in Telugu (README)", "predict"],
      ["Can you fine-tune?", "LoRA + full recipes (docs)", "code"],
      ["Licence?", "CC-BY-NC weights (model card)", "bad"],
      ["Verdict", "research baseline; listen yourself", "take"],
    ], s, { rh: 58 }); };
  };
})();
