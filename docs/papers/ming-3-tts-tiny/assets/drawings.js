/* Drawings for the Ming-3.0-tts-tiny lesson. One entry per data-draw name.
   No paper exists: numbers come from the model card's tables (// card), config.json
   (// config) or the code (// file.py), all at HF revision b170071 / GitHub e999c39.
   Everything else is illustrative layout, seeded randomness or live arithmetic. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- helpers
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = (r) => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const fmtInt = (v) => Math.round(v).toLocaleString("en-US");

  // horizontal bars with per-row tone; returns X(value)
  const hbars = (c, o) => {
    const x0 = o.x + o.labelW, bw = o.w - o.labelW - 64, X = (v) => x0 + (v / o.max) * bw;
    o.rows.forEach((r, i) => {
      const y = o.y + i * o.rowH;
      c.text(x0 - 8, y + o.rowH / 2 + 4, r.label, { anchor: "end", size: 13, weight: r.hl ? 700 : 400, dim: r.dim, inBox: true, maxW: o.labelW - 10, lines: 1 });
      if (!Number.isFinite(r.v)) { c.text(x0 + 4, y + o.rowH / 2 + 4, "not reported", { size: 12, tone: "muted", inBox: true, dim: r.dim }); return; }
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
      const qb = c.box({ x: 16, y, w: qW, h: rh - 12, label: q, size: 14, tone: "muted", hl: now });
      const ab = c.box({ x: qW + 40, y, w: W - qW - 56, h: rh - 12, label: a, size: 13, tone, hl: now });
      if (now) c.connect(qb, ab, { tone });
    });
  };

  // ------------------------------------------------------- toolbox: latents
  D["latents"] = (fig, k) => {
    const sec = k.slider({ label: "speech", min: 1, max: 20, step: 1, value: 8, fmt: (v) => `${v} s` });
    k.follow(sec, { 5: 8 });
    const c = k.canvas(W, H);
    const r = rng(9), wave = Array.from({ length: 480 }, (_, i) => Math.sin(i / 2.3) * (0.3 + 0.7 * r()) * (0.5 + 0.5 * Math.sin(i / 60)));
    const lat = Array.from({ length: 4 * 16 }, () => r());
    return (s) => {
      c.clear();
      const steps = sec.value * 12.5;   // 44,100 / 882 / 4 = 12.5 per second (config)
      const x0 = 40, x1 = 600, yc = 70;
      c.text(x0, 22, "320 ms of speech, 44.1 kHz", { size: 13, tone: "bridge", weight: 600 });
      c.path("M" + wave.map((v, i) => `${(x0 + (i / 479) * (x1 - x0)).toFixed(1)},${(yc - v * 28).toFixed(1)}`).join(" L"), { tone: "bridge", width: 1.2 });
      c.occupy({ x: x0, y: yc - 32, w: x1 - x0, h: 64 });
      const fw = (x1 - x0) / 16;   // 16 frames of 20 ms
      for (let j = 0; j <= 16; j++) c.line(x0 + j * fw, yc + 34, x0 + j * fw, yc + (j % 4 === 0 && s >= 2 ? 52 : 42), { tone: j % 4 === 0 && s >= 2 ? "take" : s === 1 ? "predict" : "muted", width: j % 4 === 0 && s >= 2 ? 2 : 1 });
      if (s === 1) c.label(x0 + fw / 2, yc + 58, "882 samples = 20 ms", { anchor: "start", size: 13, tone: "predict", weight: 700 });
      if (s >= 2) for (let p = 0; p < 4; p++) c.box({ x: x0 + p * 4 * fw + 6, y: 136, w: 4 * fw - 12, h: 34, label: "80 ms step", size: 12, tone: "take", hl: s === 2 });
      if (s >= 3) for (let p = 0; p < 4; p++) for (let q = 0; q < 16; q++) {
        const v = lat[p * 16 + q];
        c.add(k.h("rect", { x: x0 + p * 4 * fw + 10 + q * ((4 * fw - 20) / 16), y: 184, width: (4 * fw - 20) / 16 - 1, height: 40, rx: 1,
          class: `f-take ${v > 0.66 ? "" : v > 0.33 ? "soft" : "softer"} s-take`, "stroke-width": 0.4 }));
      }
      if (s >= 3) { c.occupy({ x: x0, y: 184, w: x1 - x0, h: 40 }); c.text(x0, 244, "each step: 64 real numbers (16 drawn here)", { size: 12, tone: "take", weight: 600 }); }
      if (s >= 4) c.box({ x: 360, y: 258, w: 240, h: 44, label: "VAE decoder → 44.1 kHz", tone: "bridge", hl: s === 4 });
      if (s >= 5) c.box({ x: 40, y: 258, w: 300, h: 88, label: `${sec.value} s → ${fmtInt(steps)} steps`, sub: "reference 4 s → 50 · target 8 s → 100", mono: true, size: 16, tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------- toolbox: flow
  D["flow"] = (fig, k) => {
    const t = k.slider({ label: "t", min: 0, max: 1, step: 0.1, value: 0, fmt: (v) => v.toFixed(1) });
    k.follow(t, { 1: 0, 2: 0.5, 3: 0.5, 4: 1, 5: 1 });
    const c = k.canvas(W, H);
    const r = rng(4), N = 26;
    const x0 = Array.from({ length: N }, () => [gauss(r) * 0.9, gauss(r) * 0.9]);
    const x1 = Array.from({ length: N }, (_, i) => { const a = i % 2 ? [1.6, 1.1] : [-1.5, -0.9]; return [a[0] + gauss(r) * 0.18, a[1] + gauss(r) * 0.18]; });
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: -3, xmax: 3, ymin: -2.5, ymax: 2.5, w: 400, h: 356, y: 2, ml: 30, mb: 26, xFmt: () => "", yFmt: () => "" });
      const tv = t.value;
      x0.forEach((a, i) => {
        const b = x1[i], X = (1 - tv) * a[0] + tv * b[0], Y = (1 - tv) * a[1] + tv * b[1];
        if (s >= 2) c.line(p.X(a[0]), p.Y(a[1]), p.X(b[0]), p.Y(b[1]), { tone: "muted", width: 0.7, dash: true });
        if (s >= 3 && i === 0) c.arrow(p.X(X), p.Y(Y), p.X(X + 0.35 * (b[0] - a[0])), p.Y(Y + 0.35 * (b[1] - a[1])), { tone: "predict", width: 2.2, snap: false });
        c.dot(p.X(X), p.Y(Y), { r: 4, tone: tv >= 1 ? "take" : tv > 0 ? "paper" : "muted", noOcc: true });
      });
      const eq = ["x₀: random noise", "x_t = (1−t)·x₀ + t·x₁", "target velocity = x₁ − x₀", "Euler: x ← x + Δt · v", "10 steps per latent"][s - 1];
      c.box({ x: 420, y: 20, w: 206, h: 60, label: eq, mono: true, size: 13, tone: s === 3 ? "predict" : "take", hl: true });
      c.box({ x: 420, y: 96, w: 206, h: 46, label: `t = ${tv.toFixed(1)}`, sub: tv === 0 ? "pure noise" : tv === 1 ? "data" : "in between", mono: true, tone: "paper" });
      if (s >= 5) c.box({ x: 420, y: 160, w: 206, h: 60, label: "Ming: 10 steps", sub: "flow_steps default (card)", tone: "code", hl: true });
      c.text(420, 340, "toy: 2-D points, real latents are 64-D", { size: 11, tone: "muted", maxW: 206, lines: 2 });
    };
  };

  // ------------------------------------------------------- toolbox: MoE
  D["moe"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = rng(17);
    const pick = (seed) => { const rr = rng(seed), set = new Set(); while (set.size < 8) set.add(Math.floor(rr() * 128)); return set; };
    return (s) => {
      c.clear();
      const chosen = pick(s >= 3 ? 41 : 7);
      const gx = 30, gy = 40, cw = 22, ch = 22;
      c.text(gx, 26, "one MoE layer: 128 experts", { size: 14, weight: 700 });
      for (let i = 0; i < 128; i++) {
        const on = s >= 2 && chosen.has(i);
        c.add(k.h("rect", { x: gx + (i % 16) * cw, y: gy + Math.floor(i / 16) * ch, width: cw - 3, height: ch - 3, rx: 3,
          class: `f-${on ? "code" : "muted"} ${on ? "" : "softer"} s-${on ? "code" : "muted"}${s >= 3 && !on ? " rdx-dim" : ""}`, "stroke-width": 0.8 }));
      }
      c.occupy({ x: gx, y: gy, w: 16 * cw, h: 8 * ch });
      const sh = c.box({ x: gx, y: gy + 8 * ch + 12, w: 16 * cw - 3, h: 34, label: "+ 1 shared expert, always on", size: 13, tone: "take", hl: s === 1 });
      if (s >= 2) c.box({ x: 410, y: 40, w: 216, h: 56, label: "router keeps top 8", sub: "sigmoid scores (config)", tone: "code", hl: s === 2 });
      if (s >= 3) c.box({ x: 410, y: 110, w: 216, h: 56, label: "120 idle", sub: "for this position", tone: "muted", hl: s === 3 });
      if (s >= 3) c.text(gx, 330, "next position: a different 8", { size: 12, tone: "muted" });
      if (s >= 4) {
        c.box({ x: 410, y: 180, w: 216, h: 56, label: "7.9B stored", sub: "all experts in memory", tone: "paper", hl: true });
        c.box({ x: 410, y: 250, w: 216, h: 56, label: "≈ 1.3B active", sub: "per token (card)", tone: "code", hl: true });
      }
    };
  };

  // ------------------------------------------------------- machine: whole
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const tx = c.box({ x: 16, y: 250, w: 150, h: 46, label: "text + controls", tone: "paper", hl: s === 1 });
      const sp = c.box({ x: 180, y: 250, w: 120, h: 46, label: "speaker", sub: "192 → 1 slot", tone: "bridge", hl: s === 2, dim: s < 2 });
      const rf = c.box({ x: 314, y: 250, w: 130, h: 46, label: "reference", sub: "50 latents", tone: "bridge", hl: s === 2, dim: s < 2 });
      const bb = c.box({ x: 16, y: 150, w: 428, h: 64, label: "MoE backbone, 24 layers", sub: "7.9B total · 1.3B active", tone: "take", hl: s === 3, dim: s < 3 });
      c.connect(tx, bb, { tone: "paper", dim: s < 3 }); c.connect(sp, bb, { tone: "bridge", dim: s < 3 }); c.connect(rf, bb, { tone: "bridge", dim: s < 3 });
      const hd = c.box({ x: 470, y: 150, w: 156, h: 64, label: "DiT flow head", sub: "16 layers · 10 steps", tone: "predict", hl: s === 4, dim: s < 4 });
      c.connect(bb, hd, { tone: "take", label: "hidden", dim: s < 4 });
      const lt = c.box({ x: 470, y: 40, w: 156, h: 54, label: "latent: 64 numbers", sub: "next 80 ms", tone: "predict", hl: s === 4, dim: s < 4 });
      c.connect(hd, lt, { tone: "predict", dim: s < 4 });
      const ag = c.box({ x: 230, y: 40, w: 180, h: 54, label: "aggregator", sub: "64 → 1,536", tone: "take", hl: s === 5, dim: s < 5 });
      c.connect(lt, ag, { tone: "take", dim: s < 5 });
      c.connect(ag, bb, { tone: "take", label: "next input", dim: s < 5 });
      const vae = c.box({ x: 470, y: 250, w: 156, h: 46, label: "VAE decoder", sub: "→ 44.1 kHz", tone: "bridge", hl: s === 5, dim: s < 5 });
      c.text(16, 30, s >= 5 ? "repeat ×100 for our 8 s sentence" : "", { size: 13, tone: "take", weight: 700 });
      if (s >= 5) c.text(470, 320, "after the last step", { size: 12, tone: "muted" });
    };
  };

  // ------------------------------------------------------- machine: prompt
  D["prompt"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const it = (t, tone, at, o = {}) => ({ t, tone, hl: s === at, dim: s < at && !o.always, ...o });
      const items = [
        it("<role>HUMAN</role>", "muted", 1, { always: true }), it("Please generate speech…", "muted", 1, { always: true }),
        it("speaker_1:", "muted", 2), it("<spk>", "bridge", 2), it("[speaker]", "bridge", 2, { dashed: true }), it("</spk>", "bridge", 2),
        it("Text input:", "paper", 3), it("reference transcript", "paper", 3), it("new sentence", "paper", 3),
        it("<role>ASSISTANT</role>", "muted", 1, { always: true }), it("<audio>", "bridge", 4), it("50 × reference latent", "bridge", 4, { dashed: true }),
      ];
      if (s >= 5) items.splice(9, 0, it("+ task control text", "predict", 5));
      c.chips({ x: 16, y: 20, items, maxW: 608, size: 13 });
      c.text(16, 250, "then the model answers with latents, one per 80 ms", { size: 13, tone: "take", weight: 600 });
      [["frame", "muted"], ["speaker", "bridge"], ["text", "paper"], ["control", "predict"]].forEach(([t, tone], i) =>
        c.box({ x: 16 + i * 152, y: 280, w: 136, h: 34, label: t, size: 13, tone }));
    };
  };

  // ------------------------------------------------------- machine: speaker modes
  D["speaker"] = (fig, k) => {
    const m = k.toggle({ label: "task", options: ["seed", "emotion", "voice_design"], value: "seed" });
    k.follow(m, { 1: "seed", 4: "emotion", 5: "voice_design" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const mode = m.value;
      const clip = c.box({ x: 16, y: 30, w: 150, h: 50, label: mode === "voice_design" ? "no clip" : "reference clip", tone: "bridge", dashed: mode === "voice_design", dim: mode === "voice_design" });
      const camp = c.box({ x: 210, y: 30, w: 170, h: 50, label: "CAM++", sub: "192 numbers", tone: "bridge", hl: s === 1, dim: mode === "voice_design" });
      const lin = c.box({ x: 420, y: 30, w: 204, h: 50, label: "linear → 1 slot", sub: "1,536 wide", tone: "take", hl: s === 2, dim: s < 2 });
      if (mode !== "voice_design") c.connect(clip, camp, { tone: "bridge" });
      c.connect(camp, lin, { tone: "take", dim: s < 2 || mode === "voice_design" });
      const useLat = mode === "seed";
      const vae = c.box({ x: 210, y: 120, w: 170, h: 50, label: "VAE + aggregator", sub: "50 latents", tone: "bridge", hl: s === 3 && useLat, dim: !useLat || s < 3 });
      if (mode !== "voice_design") c.connect(clip, vae, { tone: "bridge", dim: !useLat || s < 3, route: "elbow" });
      const slot = mode === "voice_design" ? "slot: no fingerprint" : "slot: fingerprint";
      const rows = [["seed · multilingual · paralinguistic", "fingerprint + 50 latents + transcript", "seed"],
        ["emotion · dialect · basic", "fingerprint only", "emotion"], ["voice_design · ip · freeform", "words describe the voice", "voice_design"]];
      rows.forEach(([a, b, key], i) => {
        const on = key === mode;
        c.box({ x: 16, y: 196 + i * 52, w: 290, h: 42, label: a, size: 13, tone: on ? "predict" : "muted", hl: on, mono: true });
        c.box({ x: 320, y: 196 + i * 52, w: 304, h: 42, label: b, size: 13, tone: on ? "predict" : "muted", hl: on });
      });
      c.text(420, 110, slot, { size: 12, tone: "take", weight: 600 });
    };
  };

  // ------------------------------------------------------- machine: backbone
  D["backbone"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const x0 = 30, cw = 24, y0 = 60, hh = 120;
      c.text(x0, 30, "24 layers, width 1,536 (bottom to top: left to right)", { size: 13, weight: 700 });
      for (let i = 0; i < 24; i++) {
        const full = (i + 1) % 4 === 0;   // modeling_bailing_moe_v3.py
        const tone = s >= 3 ? (full ? "predict" : "paper") : "muted";
        c.add(k.h("rect", { x: x0 + i * cw, y: y0, width: cw - 4, height: hh, rx: 3, class: `f-${tone} ${s >= 4 && full ? "" : "soft"} s-${tone}`, "stroke-width": 1 }));
        c.add(k.h("rect", { x: x0 + i * cw, y: y0 + hh + 8, width: cw - 4, height: 26, rx: 3,
          class: `f-${s >= 2 ? (i === 0 ? "muted" : "code") : "muted"} softer s-${s >= 2 ? (i === 0 ? "muted" : "code") : "muted"}`, "stroke-width": 1 }));
        if (i === 0 || i === 23 || (i + 1) % 4 === 0) c.text(x0 + i * cw + (cw - 4) / 2, y0 + hh + 54, String(i + 1), { anchor: "middle", size: 11, tone: "muted", inBox: true });
      }
      c.occupy({ x: x0, y: y0, w: 24 * cw, h: hh + 60 });
      if (s >= 2) c.box({ x: 30, y: 250, w: 190, h: 46, label: "FFN: 1 dense + 23 MoE", size: 13, tone: "code", hl: s === 2 });
      if (s >= 3) c.box({ x: 230, y: 250, w: 190, h: 46, label: "18 × linear (KDA)", sub: "fixed-size state", tone: "paper", hl: s === 3 });
      if (s >= 4) c.box({ x: 430, y: 250, w: 190, h: 46, label: "6 × full (MLA)", sub: "layers 4, 8, … 24", tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 230, y: 310, w: 390, h: 40, label: "top layer → flow head + stop head", size: 13, tone: "take", hl: true });
      c.text(x0 + 24 * cw + 6, y0 + 60, "attn", { size: 11, tone: "muted" });
      c.text(x0 + 24 * cw + 6, y0 + hh + 26, "FFN", { size: 11, tone: "muted" });
    };
  };

  // ------------------------------------------------------- machine: DiT head
  D["dithead"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ins = [["time + condition", "take"], ["previous latent", "predict"], ["noisy latent", "muted"]];
      const bs = ins.map(([t, tone], i) => c.box({ x: 16, y: 40 + i * 70, w: 170, h: 50, label: t, size: 14, tone, hl: s === 1, dashed: i === 2 }));
      const dit = c.box({ x: 240, y: 40, w: 160, h: 190, label: "DiT", sub: "16 layers · width 1,024", tone: "predict", hl: s === 2, dim: s < 2 });
      bs.forEach((b) => c.connect(b, dit, { tone: "muted", dim: s < 2 }));
      if (s >= 3) {
        const loop = c.box({ x: 440, y: 40, w: 184, h: 60, label: "velocity × 10 steps", sub: "Euler", tone: "paper", hl: s === 3 });
        c.connect(dit, loop, { tone: "paper" });
      }
      if (s >= 4) {
        const out = c.box({ x: 440, y: 150, w: 184, h: 60, label: "latent: 64 numbers", sub: "80 ms of speech", tone: "code", hl: s === 4 });
        c.connect(dit, out, { tone: "code" });
      }
      if (s >= 5) c.box({ x: 16, y: 260, w: 608, h: 70, label: "training: MSE between predicted velocity and x₁ − x₀", sub: "CFM.py", mono: true, size: 14, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------- machine: solver times
  D["solver"] = (fig, k) => {
    const sch = k.toggle({ label: "schedule", options: ["even", "EPSS", "EPSS + sway"], value: "even" });
    k.follow(sch, { 1: "even", 2: "EPSS", 3: "EPSS + sway" });
    const c = k.canvas(W, H);
    const EPSS = [0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32].map((v) => v / 32);   // CFM.py get_epss_timesteps(10)
    return (s) => {
      c.clear();
      let t = sch.value === "even" ? Array.from({ length: 11 }, (_, i) => i / 10) : EPSS.slice();
      if (sch.value === "EPSS + sway") t = t.map((v) => v - (Math.cos((Math.PI / 2) * v) - 1 + v));   // sway coef −1
      const x0 = 40, x1 = 600, X = (v) => x0 + v * (x1 - x0), y = 120;
      c.line(x0, y, x1, y, { tone: "muted", width: 2 });
      c.text(x0, y + 40, "t = 0  noise", { size: 13, tone: "muted" });
      c.text(x1, y + 40, "data  t = 1", { size: 13, tone: "muted", anchor: "end" });
      t.forEach((v, i) => { c.line(X(v), y - 14, X(v), y + 14, { tone: "take", width: 2 }); });
      if (s >= 4) {
        c.box({ x: X(t[0]), y: y - 50, w: Math.max(14, X(t[1]) - X(t[0])), h: 24, tone: "code", hl: true });
        c.box({ x: X(t[9]), y: y - 50, w: X(t[10]) - X(t[9]), h: 24, label: "last step", size: 12, tone: "predict", hl: true });
      }
      c.text(x0, 40, `${sch.value}: 10 steps`, { size: 15, weight: 700 });
      c.box({ x: 40, y: 190, w: 560, h: 50, label: t.map((v) => v.toFixed(3).replace(/^0/, "")).join("  "), mono: true, size: 12, tone: "paper" });
      if (s >= 3) c.box({ x: 40, y: 252, w: 560, h: 40, label: "sway: t → 1 − cos(πt/2)", mono: true, size: 13, tone: "take", hl: s === 3 });
      if (s >= 5) c.box({ x: 40, y: 304, w: 560, h: 40, label: "temperature 0: no noise added between steps", size: 13, tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- machine: CFG
  D["cfg"] = (fig, k) => {
    const w = k.slider({ label: "guidance w", min: 0, max: 4, step: 0.5, value: 0, fmt: (v) => v.toFixed(1) });
    k.follow(w, { 1: 0, 3: 2 });
    const c = k.canvas(W, H);
    const C = [1.6, 1.0], U = [1.4, -0.2];   // made-up 2-D velocities
    return (s) => {
      c.clear();
      const g = [C[0] + w.value * (C[0] - U[0]), C[1] + w.value * (C[1] - U[1])];
      const p = c.plot({ series: [], xmin: -0.5, xmax: 3, ymin: -1, ymax: 4.5, w: 400, h: 356, y: 2, ml: 30, mb: 26, xFmt: () => "", yFmt: () => "" });
      const O = [p.X(0), p.Y(0)];
      c.arrow(O[0], O[1], p.X(U[0]), p.Y(U[1]), { tone: "muted", width: 2.4, snap: false });
      c.label(p.X(U[0]) + 6, p.Y(U[1]) + 14, "u: zeros as condition", { size: 12, tone: "muted", weight: 600 });
      c.arrow(O[0], O[1], p.X(C[0]), p.Y(C[1]), { tone: "paper", width: 2.4, snap: false });
      c.label(p.X(C[0]) + 6, p.Y(C[1]), "c: backbone vector", { size: 12, tone: "paper", weight: 600 });
      if (s >= 3) { c.arrow(O[0], O[1], p.X(g[0]), p.Y(g[1]), { tone: "take", width: 3, snap: false }); c.label(p.X(g[0]) + 6, p.Y(g[1]), `guided, w = ${w.value}`, { size: 12, tone: "take", weight: 700 }); }
      c.box({ x: 420, y: 20, w: 206, h: 50, label: "2 velocities per step", tone: "paper", hl: s === 1 });
      if (s >= 2) c.box({ x: 420, y: 84, w: 206, h: 50, label: "condition dropped 10%", sub: "in training (dit.py)", tone: "muted", hl: s === 2 });
      if (s >= 3) c.box({ x: 420, y: 148, w: 206, h: 50, label: "c + w(c − u)", mono: true, tone: "take", hl: s === 3 });
      c.text(420, 340, "toy 2-D arrows", { size: 11, tone: "muted" });
    };
  };

  // ------------------------------------------------------- machine: aggregator
  D["aggregator"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const lat = c.box({ x: 16, y: 60, w: 150, h: 54, label: "latent", sub: "64 numbers", tone: "predict", hl: s === 1 });
      const need = c.box({ x: 470, y: 60, w: 156, h: 54, label: "backbone input", sub: "1,536 numbers", tone: "take", hl: s === 1 });
      if (s >= 2) {
        const ag = c.box({ x: 220, y: 40, w: 200, h: 94, label: "aggregator", sub: "8 layers · width 1,024", tone: "take", hl: s === 2 });
        c.connect(lat, ag, { tone: "predict" }); c.connect(ag, need, { tone: "take" });
        if (s >= 3) c.chips({ x: 236, y: 150, items: [{ t: "[CLS]", tone: "take", hl: s === 3 }, { t: "latent", tone: "predict" }], size: 13 });
      }
      if (s >= 4) c.box({ x: 16, y: 210, w: 300, h: 56, label: "also reads the 50 reference latents", size: 13, tone: "bridge", hl: s === 4 });
      if (s >= 5) c.box({ x: 330, y: 210, w: 296, h: 56, label: "latest latent = head's history", sub: "history_size 1", tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------- machine: stop
  D["stop"] = (fig, k) => {
    const len = k.slider({ label: "speech", min: 0.5, max: 25, step: 0.5, value: 8, fmt: (v) => `${v} s` });
    k.follow(len, { 1: 8, 3: 0.5, 4: 25 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const want = Math.round(len.value * 12.5);
      const end = Math.max(13, Math.min(250, want));   // minimum_decode_steps 13, maximum 250 (config)
      read.textContent = `wanted ${want} steps → speaks ${end} (${(end / 12.5).toFixed(2)} s)`;
      const xs = [], ys = [];
      for (let i = 0; i <= 260; i += 2) { xs.push(i); ys.push(1 / (1 + Math.exp(-(i - want) / 3))); }
      const p = c.plot({ series: [{ x: xs, y: ys, tone: "paper", width: 2 }], xmin: 0, xmax: 260, ymin: 0, ymax: 1, w: 420, h: 340, y: 10, xlabel: "decode step (80 ms each)", ylabel: "stop probability" });
      if (s >= 2) { c.line(p.X(0), p.Y(0.5), p.X(260), p.Y(0.5), { tone: "predict", dash: true }); c.label(p.X(200), p.Y(0.56), "0.5", { size: 12, tone: "predict", weight: 700 }); }
      if (s >= 3) { c.line(p.X(13), p.Y(0), p.X(13), p.Y(1), { tone: "code", dash: true }); }
      if (s >= 4) { c.line(p.X(250), p.Y(0), p.X(250), p.Y(1), { tone: "bad", dash: true }); }
      c.dot(p.X(end), p.Y(0.5), { r: 6, tone: "predict" });
      c.box({ x: 440, y: 20, w: 186, h: 54, label: `stops at step ${end}`, sub: `${(end / 12.5).toFixed(2)} s`, tone: "predict", hl: s <= 2 });
      if (s >= 3) c.box({ x: 440, y: 90, w: 186, h: 54, label: "min 13 steps", sub: "≈ 1.04 s", tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 440, y: 160, w: 186, h: 54, label: "max 250 steps", sub: "= 20 s per call", tone: "bad", hl: s === 4 });
      c.text(440, 340, "curve is made up", { size: 11, tone: "muted" });
    };
  };

  // ------------------------------------------------------- machine: cost
  D["cost"] = (fig, k) => {
    const sec = k.slider({ label: "speech", min: 1, max: 20, step: 1, value: 8, fmt: (v) => `${v} s` });
    k.follow(sec, { 1: 8 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const n = sec.value * 12.5;
      const rows = [{ label: "backbone steps", v: n, tone: "take", hl: s === 1 }, { label: "flow-head calls", v: s >= 2 ? n * 10 : NaN, tone: "predict", hl: s === 2 },
        { label: "aggregator calls", v: s >= 3 ? n : NaN, tone: "take", hl: s === 3 }];
      c.text(16, 26, `${sec.value} s of speech, default settings`, { size: 15, weight: 700 });
      hbars(c, { x: 16, y: 44, w: 608, labelW: 170, rowH: 60, max: 2500, fmt: (v) => fmtInt(v), rows: rows.map((r) => (Number.isFinite(r.v) || s >= 4 ? r : { ...r, v: NaN, label: r.label })) });
      if (s >= 4) c.box({ x: 16, y: 250, w: 608, h: 60, label: "real-time factor: not reported", sub: "card, README, blog", tone: "bad", hl: true });
    };
  };

  // ------------------------------------------------------- results: Seed-TTS
  D["seed"] = (fig, k) => {
    const lang = k.toggle({ label: "language", options: ["Chinese", "English"], value: "Chinese" });
    const met = k.toggle({ label: "metric", options: ["WER", "SIM"], value: "SIM" });
    k.follow(lang, { 1: "Chinese", 3: "English", 4: "Chinese" });
    k.follow(met, { 1: "SIM", 2: "WER" });
    const c = k.canvas(W, H);
    // card, Seed-TTS table: [zh WER, zh SIM, en WER, en SIM]
    const T = [["Seed-TTS (ref.)", 1.110, 0.796, 2.240, 0.762, "muted"], ["GLM-TTS", 1.030, 0.761, 2.230, 0.672, "muted"], ["Qwen3-TTS-1.7B", 0.770, NaN, 1.240, NaN, "muted"],
      ["CosyVoice3-1.5B", 0.710, 0.775, 1.450, 0.695, "muted"], ["CosyVoice3-0.5B", 1.160, 0.780, 2.020, 0.718, "muted"], ["F5-TTS", 1.560, 0.741, 1.830, 0.647, "muted"],
      ["Ming-3.0-tts-0.5b", 0.800, 0.758, 1.584, 0.691, "paper"], ["Ming-3.0-tts-tiny", 0.820, 0.781, 1.666, 0.728, "code"]];
    return (s) => {
      c.clear();
      const zh = lang.value === "Chinese", wer = met.value === "WER", j = (zh ? 1 : 3) + (wer ? 0 : 1);
      c.text(16, 22, `${lang.value}: ${wer ? "WER %, lower is better" : "speaker similarity, higher is better"}`, { size: 14, weight: 700 });
      hbars(c, { x: 16, y: 34, w: 608, labelW: 170, rowH: 38, max: wer ? 2.5 : 0.85, fmt: (v) => (wer ? v.toFixed(2) : v.toFixed(3)),
        rows: T.map((r) => ({ label: r[0], v: r[j], tone: r[5], hl: r[0].includes("tiny") || (s === 4 && r[0].includes("0.5b")) || (s === 2 && r[0] === "CosyVoice3-1.5B") || (s === 3 && r[0] === "Qwen3-TTS-1.7B"), dim: r[0].includes("ref.") })) });
    };
  };

  // ------------------------------------------------------- results: multilingual
  D["multilingual"] = (fig, k) => {
    const met = k.toggle({ label: "metric", options: ["WER/CER", "SIM"], value: "WER/CER" });
    k.follow(met, { 1: "WER/CER", 4: "SIM" });
    const c = k.canvas(W, H);
    // card, MiniMax table: per language [WER/CER, SIM] for tiny, 0.5b, best other (name)
    const L = [["German", [0.325, 0.791], [0.365, 0.753], ["FireRedTTS3", 0.348, 0.825]], ["Spanish", [0.971, 0.797], [1.099, 0.763], ["FireRedTTS3", 1.086, 0.868]],
      ["French", [3.470, 0.733], [4.264, 0.675], ["VoxCPM2", 3.380, 0.807]], ["Korean", [6.000, 0.797], [1.728, 0.793], ["FireRedTTS3", 1.644, 0.864]],
      ["Japanese", [3.427, 0.780], [3.765, 0.765], ["FireRedTTS3", 3.418, 0.825]]];
    return (s) => {
      c.clear();
      const sim = met.value === "SIM", j = sim ? 1 : 0;
      c.text(16, 20, sim ? "speaker similarity (FireRedTTS3 as the other)" : "WER/CER %: tiny · 0.5b · best other model", { size: 13, weight: 700 });
      const rows = L.map(([l, t, h, o]) => ({ label: l, values: [t[j], h[j], sim ? [0.825, 0.868, 0.807, 0.864, 0.825][L.findIndex((x) => x[0] === l)] : o[1]],
        hl: (s === 1 && (l === "German" || l === "Spanish")) || (s === 2 && (l === "French" || l === "Japanese")) || (s === 3 && l === "Korean") || s === 4, dim: s === 3 && l !== "Korean" }));
      c.bars({ x: 16, y: 36, w: 608, rowH: 56, labelW: 90, rows, tones: ["code", "paper", "muted"], max: sim ? 1 : 6.5, fmt: (v) => (sim ? v.toFixed(3) : v.toFixed(2)) });
      [["tiny", "code"], ["0.5b", "paper"], [sim ? "FireRedTTS3" : "best other", "muted"]].forEach(([t, tone], i) => c.box({ x: 120 + i * 170, y: 326, w: 150, h: 28, label: t, size: 12, tone }));
    };
  };

  // ------------------------------------------------------- results: controls
  D["control"] = (fig, k) => {
    const b = k.toggle({ label: "benchmark", options: ["tags", "emotion", "hard emotion", "design"], value: "tags" });
    k.follow(b, { 1: "tags", 2: "emotion", 3: "hard emotion", 4: "design" });
    const c = k.canvas(W, H);
    const S = {   // card tables
      tags: { t: "NVBench single, Chinese PCER % (lower is better)", max: 60, rows: [["real speech", 9.38, "muted"], ["CosyVoice3", 57.69, "muted"], ["NV-CV3", 27.69, "muted"], ["Ming-0.5b", 22.80, "paper"], ["Ming-tiny", 17.23, "code"]] },
      emotion: { t: "CV3 emotion accuracy, average %", max: 100, rows: [["CosyVoice3-0.5B", 66.33, "muted"], ["CosyVoice3-1.5B + DiffRO", 77.67, "muted"], ["F5-TTS", 64.67, "muted"], ["Ming-0.5b", 72.33, "paper"], ["Ming-tiny", 74.00, "code"]] },
      "hard emotion": { t: "CV3N hard emotion accuracy, average %", max: 100, rows: [["CosyVoice3-0.5B", 40.00, "muted"], ["Ming-0.5b", 37.33, "paper"], ["Ming-tiny", 30.67, "code"]] },
      design: { t: "InstructTTSEval-ZH voice design, average %", max: 100, rows: [["Qwen3-TTS", 77.13, "muted"], ["Mimo-Audio-7B", 70.50, "muted"], ["VoiceSculptor", 67.30, "muted"], ["Ming-0.5b", 72.29, "paper"], ["Ming-tiny", 75.37, "code"]] },
    };
    return (s) => {
      c.clear();
      const d = S[b.value];
      c.text(16, 24, d.t, { size: 14, weight: 700 });
      hbars(c, { x: 16, y: 40, w: 608, labelW: 210, rowH: 52, max: d.max, fmt: (v) => v.toFixed(2), rows: d.rows.map(([l, v, tone]) => ({ label: l, v, tone, hl: l === "Ming-tiny", dim: l === "real speech" })) });
    };
  };

  // ------------------------------------------------------- results: tiny vs 0.5b
  D["siblings"] = (fig, k) => {
    const c = k.canvas(W, H);
    // our tally of the card's tables: [benchmark, tiny wins, 0.5b wins, ties]
    const T = [["Seed-TTS zh/en", 2, 2, 0], ["Multilingual", 9, 1, 0], ["NVBench tags", 9, 2, 1], ["Dialect", 7, 5, 0], ["CV3 emotion", 4, 2, 1],
      ["CV3N hard emotion", 3, 4, 0], ["Voice design", 4, 0, 0], ["Speed/pitch/volume", 2, 4, 0]];
    return (s) => {
      c.clear();
      const x0 = 190, u = 26, rh = 34, y0 = 34;
      c.text(16, 22, "metrics won: tiny (green) · 0.5b (blue) · tie (grey)", { size: 13, weight: 700 });
      T.forEach(([name, a, b2, t], i) => {
        const y = y0 + i * rh;
        const hl = (s === 2 && (name === "Multilingual" || name === "NVBench tags" || name === "Voice design")) || (s === 3 && (name === "Speed/pitch/volume" || name === "CV3N hard emotion")) || (s === 4 && name === "Seed-TTS zh/en");
        const dim = s >= 2 && !hl;
        c.text(x0 - 10, y + rh / 2 + 4, name, { anchor: "end", size: 13, weight: hl ? 700 : 400, dim, inBox: true });
        let x = x0;
        [[a, "code"], [b2, "paper"], [t, "muted"]].forEach(([n, tone]) => { if (n) { c.box({ x, y: y + 4, w: n * u - 2, h: rh - 8, label: String(n), size: 12, tone, solid: tone !== "muted", hl, dim }); x += n * u; } });
      });
      c.occupy({ x: 16, y: y0, w: 608, h: T.length * rh });
      c.box({ x: 16, y: 312, w: 608, h: 40, label: "total: tiny 40 · 0.5b 20 · ties 2 (of 62)", size: 15, tone: "code", hl: s === 1 });
    };
  };

  // ------------------------------------------------------- your move
  D["breeze"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const rows = [["80 ms step", "codec tokens", "64-number latent", 1], ["second stage", "depth decoder: 15 codes", "DiT: 10 flow steps", 2],
        ["Controlled Voice Elo", "1018", "1069 (0.5b)", 3], ["Provider Voice Elo", "1222", "1188 (0.5b)", 3], ["weights licence", "non-commercial", "MIT", 4]];
      c.box({ x: 200, y: 12, w: 200, h: 34, label: "Breeze TTS 2", tone: "muted" });
      c.box({ x: 420, y: 12, w: 204, h: 34, label: "Ming-3.0-tts", tone: "code" });
      rows.forEach(([q, a, b2, at], i) => {
        if (s < at) return;
        const y = 60 + i * 56, now = s === at;
        c.text(186, y + 26, q, { anchor: "end", size: 13, weight: now ? 700 : 400, inBox: true });
        c.box({ x: 200, y, w: 200, h: 42, label: a, size: 13, tone: "muted", hl: now });
        c.box({ x: 420, y, w: 204, h: 42, label: b2, size: 13, tone: "code", hl: now });
      });
      c.occupy({ x: 16, y: 60, w: 180, h: 280 });
    };
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["Training data?", "not reported, no training code", "bad"],
      ["Which model is ranked?", "the 0.5b, per the blog", "predict"],
      ["Who ran baselines?", "the authors, unified ASR protocol", "predict"],
      ["How fast?", "no RTF or latency reported", "bad"],
      ["Open?", "MIT weights + code, limits listed", "code"],
    ], s, { rh: 68 }); };
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["Tags, emotion, design?", "tiny: 17.2% PCER, 75.4% design", "code"],
      ["Exact words, attributes?", "0.5b: lower WER, 93.3% attributes", "paper"],
      ["Dialogue?", "tiny only: podcast task", "code"],
      ["Small GPU?", "tiny: 7.9B stored, ≈ 18 GB", "bad"],
      ["Verdict", "start 0.5b; tiny for range", "take"],
    ], s, { rh: 68 }); };
  };
})();
