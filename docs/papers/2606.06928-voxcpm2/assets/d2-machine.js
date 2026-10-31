/* Drawings: "The machine". */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;
  const n0 = (v) => Math.round(v).toLocaleString("en-US");

  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const tx = c.box({ x: 8, y: 20, w: 140, h: 56, label: "Hindi text", sub: "BPE tokens", tone: "paper", hl: s === 1 });
      const pp = c.box({ x: 8, y: 110, w: 140, h: 56, label: "patches so far", sub: "4 frames each", tone: "bridge", hl: s === 1 });
      const le = c.box({ x: 8, y: 200, w: 140, h: 56, label: "LocEnc", sub: "patch → E", tone: "take", hl: s === 2, dim: s < 2 });
      c.connect(pp, le, { dim: s < 2 });
      const ts = c.box({ x: 190, y: 20, w: 150, h: 60, label: "TSLM", sub: "MiniCPM-4-1B", tone: "take", hl: s === 3, dim: s < 3 });
      c.connect(tx, ts, { dim: s < 3 });
      c.path(`M${le.bx.r + 4},${le.bx.cy} H${ts.bx.cx} V${ts.bx.b + 6}`, { tone: "muted", arrow: true, dim: s < 3 });
      const fq = c.box({ x: 370, y: 20, w: 110, h: 60, label: "FSQ", sub: "skeleton", tone: "predict", hl: s === 3, dim: s < 3 });
      c.connect(ts, fq, { dim: s < 3 });
      const ra = c.box({ x: 370, y: 116, w: 262, h: 56, label: "RALM", sub: "residual: voice, texture", tone: "take", hl: s === 4, dim: s < 4 });
      c.connect(fq, ra, { dim: s < 4 });
      const st = c.box({ x: 510, y: 20, w: 122, h: 60, label: "stop head", sub: "last patch?", tone: "muted", hl: s === 5, dim: s < 5 });
      c.connect(fq, st, { dim: s < 5 });
      const ld = c.box({ x: 370, y: 208, w: 262, h: 56, label: "LocDiT", sub: "noise → next 4 frames", tone: "code", hl: s === 5, dim: s < 5 });
      c.connect(ra, ld, { dim: s < 5 });
      const dc = c.box({ x: 370, y: 296, w: 262, h: 52, label: "VAE decoder", sub: "48 kHz audio", tone: "bridge", hl: s === 6, dim: s < 6 });
      c.connect(ld, dc, { dim: s < 6 });
      if (s >= 5) c.text(190, 290, "skeleton + residual", { size: 13, tone: "code", weight: 700 });
      if (s >= 5) c.text(190, 310, "+ previous patch", { size: 13, tone: "code", weight: 700 });
      if (s >= 6) c.text(8, 345, "one loop = 160 ms of speech", { size: 14, weight: 700, tone: "predict" }); // §3.1
    };
  };

  D["shapes"] = (fig, k) => {
    const sec = k.slider({ label: "line length", min: 0.48, max: 12, step: 0.16, value: 2.88, fmt: (v) => `${v.toFixed(2)} s` });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const t = sec.value, fr = Math.round(t * 25), pa = Math.ceil(fr / 4);
      const rows = [ // §3.1, §3.2
        ["16 kHz samples", n0(t * 16000), "bridge"],
        ["latent frames (÷640)", `${n0(fr)} × 64`, "code"],
        ["patches (÷4)", n0(pa), "predict"],
        ["LLM steps", n0(pa), "take"],
        ["48 kHz samples out (×1,920)", n0(fr * 1920), "bridge"],
      ];
      rows.forEach(([l, v, tone], i) => {
        const y = 14 + i * 68, on = s >= i + 1;
        c.text(20, y + 34, l, { size: 14, weight: s === i + 1 ? 700 : 400, dim: !on });
        c.box({ x: 300, y, w: 330, h: 50, label: on ? v : "…", mono: true, size: 17, tone, hl: s === i + 1, dim: !on });
      });
    };
  };

  D["asym-vae"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (f) => 30 + f * 24; // kHz → px, 0..24 kHz
      c.line(X(0), 120, X(24), 120, { tone: "muted" });
      [0, 4, 8, 12, 16, 20, 24].forEach((f) => c.text(X(f), 140, `${f}`, { size: 11, anchor: "middle", tone: "muted" }));
      c.text(X(24), 160, "kHz", { size: 12, anchor: "end", tone: "muted" });
      c.box({ x: X(0), y: 60, w: X(8) - X(0), h: 50, label: "0–8 kHz", sub: "what 16 kHz audio holds", tone: "paper", hl: s === 1 || s === 3 });
      if (s === 1) c.box({ x: X(8) + 4, y: 60, w: X(24) - X(8) - 4, h: 50, label: "8–24 kHz: sibilants, air", size: 13, tone: "muted", dashed: true });
      if (s === 2) c.box({ x: 30, y: 190, w: 576, h: 56, label: "48 kHz encoder: 3× more input, a latent per rate, old data unusable", size: 13, tone: "bad", hl: true }); // §3.2
      if (s >= 3) {
        const en = c.box({ x: 30, y: 190, w: 260, h: 56, label: "encoder reads 16 kHz", sub: "one latent space", tone: "take", hl: s === 3 });
        if (s >= 4) {
          const dc = c.box({ x: 346, y: 190, w: 260, h: 56, label: "decoder writes 48 kHz", sub: "×1,920 per frame", tone: "bridge", hl: s === 4 });
          c.connect(en, dc, { label: "25 Hz latents" });
          c.box({ x: X(8) + 4, y: 60, w: X(24) - X(8) - 4, h: 50, label: "8–24 kHz invented by the decoder", size: 13, tone: "predict", hl: s === 4 });
        }
      }
      if (s >= 5) ["16 kHz", "24 kHz", "48 kHz"].forEach((r, i) => c.box({ x: 346 + i * 90, y: 270, w: 80, h: 40, label: r, size: 13, tone: i === 2 ? "bridge" : "muted", hl: i === 2 }));
      if (s >= 5) c.text(330, 296, "output rate dial", { size: 13, anchor: "end", tone: "code", weight: 700 });
    };
  };

  D["patch-size"] = (fig, k) => {
    const P = k.toggle({ label: "patch size", options: ["P = 2", "P = 4"], value: "P = 2" });
    k.follow(P, { 1: "P = 2", 2: "P = 4" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = P.value === "P = 2" ? 2 : 4, fw = 8.4;
      for (let f = 0; f < 72; f++) {
        const g = Math.floor(f / p);
        c.add(k.h("rect", { x: 14 + f * fw, y: 40, width: fw - 1.5, height: 30, rx: 1.5, class: `f-${g % 2 ? "code" : "paper"}` }));
      }
      c.text(14, 26, `72 frames of our 2.88 s line, grouped in patches of ${p}`, { size: 13, weight: 700 });
      c.box({ x: 14, y: 96, w: 300, h: 60, label: `${72 / p} LLM steps`, sub: `${(25 / p).toFixed(2)} steps per second`, tone: "take", hl: s <= 3 }); // Table 1
      c.box({ x: 330, y: 96, w: 300, h: 60, label: `${p * 40} ms per step`, sub: p === 2 ? "VoxCPM" : "VoxCPM1.5 and 2", tone: "paper" });
      if (s >= 3) c.box({ x: 14, y: 172, w: 616, h: 48, label: "half the LLM steps → cheaper, steadier long-form", size: 14, tone: "code", hl: s === 3 }); // §3.3.3
      if (s >= 4) c.box({ x: 14, y: 236, w: 616, h: 48, label: `8,192 positions ÷ ${(25 / p).toFixed(2)} Hz ≈ ${Math.round(8192 / (25 / p) / 60)} minutes of audio`, mono: true, size: 14, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 14, y: 300, w: 616, h: 48, label: "price: LocDiT draws 4 frames at once · 4 → 12 layers", size: 14, tone: "bad", hl: s === 5 }); // Table 1
    };
  };

  D["locenc"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = V.rng(21), fr = Array.from({ length: 4 * 6 }, () => V.gauss(r));
    return (s) => {
      c.clear();
      c.text(14, 26, "one patch: 4 frames × 64 numbers (6 shown)", { size: 13, weight: 700, tone: "bridge" });
      for (let f = 0; f < 4; f++) for (let d = 0; d < 6; d++) {
        const v = fr[f * 6 + d];
        c.add(k.h("rect", { x: 70 + f * 46, y: 40 + d * 22, width: 40, height: 18, rx: 2, class: `f-${v > 0 ? "code" : "paper"}`, opacity: Math.min(1, 0.3 + Math.abs(v) * 0.4) }));
      }
      if (s >= 3) c.box({ x: 14, y: 40, w: 46, h: 128, label: "CLS", size: 13, tone: "predict", hl: s === 3 });
      if (s >= 2) {
        const le = c.box({ x: 290, y: 60, w: 160, h: 88, label: "LocEnc", sub: s >= 4 ? "12 layers · 1,024" : "within one patch", tone: "take", hl: s === 2 || s === 4 });
        const e = c.box({ x: 486, y: 80, w: 146, h: 48, label: "E: 1 vector", tone: "take", hl: s === 3 });
        c.connect(le, e);
        c.arrow(256, 104, 288, 104, { tone: "muted", snap: false });
      }
      if (s === 1) c.box({ x: 290, y: 60, w: 342, h: 88, label: "the TSLM must read this audio back", size: 14, tone: "muted", hl: true });
      if (s >= 5) {
        for (let i = 0; i < 6; i++) c.box({ x: 14 + i * 104, y: 220, w: 96, h: 44, label: `patch ${i + 1}`, size: 13, tone: "bridge", hl: i === 5 });
        c.box({ x: 14, y: 290, w: 616, h: 48, label: "each patch encoded alone → streams; the LLMs connect them", size: 14, tone: "code", hl: true });
      }
    };
  };

  D["tslm"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 8, y: 8, w: 624, h: 50, label: "TSLM = MiniCPM-4-1B · 28 layers · width 2,048 · RoPE", size: 14, tone: "take", hl: s === 1 }); // Table 1
      if (s >= 2) {
        const items = ["म", "ैं", "ने", "क", "ह", "ा", "…", "E1", "E2", "E3", "E4"].map((t, i) => ({ t, tone: i < 7 ? "paper" : "bridge", hl: s === 2 }));
        const ch = c.chips({ x: 8, y: 80, items, size: 15 });
        ch.forEach((r, i) => c.text(r.x + r.w / 2, ch.bottom + 18, i < 7 ? "0" : "1", { size: 12, anchor: "middle", mono: true, tone: i < 7 ? "paper" : "bridge" }));
        c.text(630, ch.bottom + 18, "modality flag", { size: 12, anchor: "end", tone: "muted" });
      }
      if (s >= 3) c.box({ x: 8, y: 164, w: 300, h: 50, label: "no phonemes, no G2P", sub: "the LLM learns to pronounce", tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 332, y: 164, w: 300, h: 50, label: "你好世界 → 你 · 好 · 世 · 界", sub: "Chinese split to characters", tone: "paper", hl: s === 4 });
      if (s >= 5) {
        c.text(8, 246, "Telugu “న” reaches the model as:", { size: 13, weight: 700, tone: "bad" });
        c.chips({ x: 8, y: 258, items: ["<0xE0>", "<0xB0>", "<0xA8>"].map((t) => ({ t, tone: "bad", hl: true })), size: 15 });
        c.text(8, 330, "3 byte tokens for one letter (counted by us)", { size: 13, tone: "muted" });
      }
    };
  };

  D["fsq-skeleton"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 8, y: 30, w: 120, h: 70, label: "2,048", sub: "TSLM state", tone: "take", hl: s === 1 });
      if (s >= 2) {
        const p1 = c.box({ x: 160, y: 30, w: 100, h: 70, label: "→ 512", sub: "linear", tone: "muted", hl: s === 2 });
        const q = c.box({ x: 292, y: 30, w: 120, h: 70, label: "round", sub: "19 levels", tone: "predict", hl: s === 2 });
        const p2 = c.box({ x: 444, y: 30, w: 188, h: 70, label: "→ 2,048", sub: "linear: the skeleton", tone: "take", hl: s === 4 });
        c.connect(a, p1); c.connect(p1, q); c.connect(q, p2);
      }
      if (s >= 3) {
        c.chips({ x: 8, y: 140, items: ["म", "ैं", "ने", "…"].map((t) => ({ t, tone: "paper" })).concat(["E1", "E2", "E3"].map((t) => ({ t, tone: "bridge", hl: true }))), size: 15 });
        c.text(8, 200, "text positions skip FSQ; audio positions are rounded", { size: 13, weight: 700, tone: "bridge" });
      }
      if (s >= 4) c.box({ x: 8, y: 222, w: 624, h: 46, label: "skeleton = what to say next, coarse intonation", size: 14, tone: "predict", hl: s === 4 });
      if (s >= 5) ["news", "poetry", "rap"].forEach((g, i) => {
        const cx = 120 + i * 200;
        for (let j = 0; j < 6; j++) c.dot(cx + Math.cos(j * 1.1) * 26, 310 + Math.sin(j * 1.7) * 14, { r: 5, tone: ["paper", "code", "predict"][i] });
        c.text(cx + 40, 316, g, { size: 13, weight: 700, tone: ["paper", "code", "predict"][i] });
      });
    };
  };

  D["fsq-ablation"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["hard ZH CER", "EN WER"], value: "hard ZH CER" });
    k.follow(m, { 1: "hard ZH CER", 3: "EN WER", 4: "hard ZH CER" });
    const c = k.canvas(W, H);
    const T = [ // Table 6 V1: [setting, EN WER, hard ZH CER]
      ["FSQ 4 dims", 5.18, 19.55], ["FSQ 16 dims", 3.22, 14.42], ["FSQ 64 dims", 3.22, 17.48], ["FSQ 128 dims", 3.43, 16.76],
      ["FSQ 256 dims (V1)", 2.98, 18.19], ["FSQ 1,024 dims", 3.07, 20.38], ["no FSQ", 3.67, 24.92]];
    return (s) => {
      c.clear();
      const j = m.value === "EN WER" ? 1 : 2;
      const hl = { 1: [], 2: [6], 3: [0], 4: [1, 2, 3, 4], 5: [1, 4] }[s] || [];
      V.title(c, `${m.value} (%) · lower is better`);
      V.tbars(c, T.map((r, i) => [r[0], r[j], hl.includes(i), hl.length && !hl.includes(i)]), { y: 30, h: 320, labelW: 170, tone: j === 1 ? "paper" : "predict", fmt: (v) => v.toFixed(2) });
    };
  };

  D["ralm"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const sk = c.box({ x: 8, y: 20, w: 190, h: 56, label: "skeleton", sub: "rounded: what + rough how", tone: "predict", hl: s === 1 });
      if (s === 1) c.box({ x: 230, y: 20, w: 402, h: 56, label: "lost in rounding: voice, texture, micro-prosody", size: 13, tone: "bad", hl: true });
      if (s >= 2) {
        const tx = c.box({ x: 8, y: 100, w: 190, h: 56, label: "TSLM text states", tone: "paper", hl: s === 2 });
        const e = c.box({ x: 8, y: 180, w: 190, h: 56, label: "E: unrounded audio", tone: "bridge", hl: s === 2 });
        const ra = c.box({ x: 260, y: 100, w: 170, h: 56, label: "RALM", sub: s >= 4 ? "8 layers · no RoPE" : "causal LM", tone: "take", hl: s === 2 || s === 4 });
        c.connect(sk, ra, { route: "elbow" }); c.connect(tx, ra); c.connect(e, ra, { route: "elbow" });
        if (s >= 3) { const rs = c.box({ x: 470, y: 100, w: 162, h: 56, label: "residual", sub: "who + exact how", tone: "take", hl: s === 3 }); c.connect(ra, rs); }
      }
      if (s >= 5) {
        [["skeletons", "paper", 180, "cluster by content"], ["residuals", "take", 470, "cluster by speaker"]].forEach(([n, tone, x, l]) => {
          for (let j = 0; j < 7; j++) c.dot(x + Math.cos(j * 0.9) * 30 - 60, 300 + Math.sin(j * 1.3) * 18, { r: 5, tone });
          c.text(x, 290, n, { size: 13, weight: 700, tone }); c.text(x, 310, l, { size: 12, tone: "muted" });
        });
      }
    };
  };

  D["ralm-ablation"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["hard ZH CER", "EN SIM"], value: "hard ZH CER" });
    k.follow(m, { 1: "hard ZH CER", 4: "EN SIM", 5: "hard ZH CER" });
    const c = k.canvas(W, H);
    const T = [ // Table 7 V1: [setting, hard ZH CER, EN SIM]
      ["default (with RALM)", 18.19, 62.6], ["no RALM, 24-layer TSLM", 25.0, 61.8], ["no RALM, 30-layer TSLM", 30.4, 62.6],
      ["RALM without E", 27.17, 60.9], ["no residual in LocDiT", 23.65, 58.3]];
    return (s) => {
      c.clear();
      const j = m.value === "EN SIM" ? 2 : 1;
      const hl = { 1: [0, 1], 2: [2], 3: [3], 4: [0, 4], 5: [0] }[s] || [];
      V.title(c, j === 1 ? "hard ZH CER (%) · lower is better" : "EN speaker similarity · higher is better");
      V.tbars(c, T.map((r, i) => [r[0], r[j], hl.includes(i), !hl.includes(i)]), { y: 34, h: 300, labelW: 210, tone: j === 1 ? "predict" : "take", fmt: (v) => v.toFixed(j === 1 ? 2 : 1) });
    };
  };

  D["fusion"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(160, 20, "VoxCPM (V1)", { size: 14, weight: 700, anchor: "middle", tone: "muted" });
      c.text(480, 20, "VoxCPM2", { size: 14, weight: 700, anchor: "middle", tone: "code" });
      c.line(320, 30, 320, 350, { tone: "faint" });
      c.text(8, 52, "into the RALM", { size: 12, tone: "muted" });
      c.box({ x: 20, y: 62, w: 280, h: 52, label: "skeleton + E", sub: "element-wise sum", tone: "muted", hl: s === 1 });
      if (s >= 2) c.box({ x: 340, y: 62, w: 290, h: 52, label: "W_fuse [skeleton ‖ E]", sub: "4,096 → 2,048 linear", mono: true, tone: "code", hl: s === 2 }); // Eq. 2
      if (s >= 3) {
        c.text(8, 150, "into the LocDiT", { size: 12, tone: "muted" });
        c.box({ x: 20, y: 160, w: 280, h: 52, label: "skeleton + residual + t", sub: "one summed token", tone: "muted", hl: s === 3 });
      }
      if (s >= 4) ["μ_sem", "μ_res", "μ_t"].forEach((t, i) => c.box({ x: 340 + i * 100, y: 160, w: 90, h: 52, label: t, mono: true, tone: "code", hl: s === 4 }));
      if (s >= 5) c.box({ x: 20, y: 250, w: 610, h: 56, label: "no table measures either change", size: 15, tone: "bad", hl: true });
    };
  };

  D["locdit"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const items = [["μ_sem", "predict"], ["μ_res", "take"], ["μ_t", "muted"], ["z1", "bridge"], ["z2", "bridge"], ["z3", "bridge"], ["z4", "bridge"], ["~z1", "code"], ["~z2", "code"], ["~z3", "code"], ["~z4", "code"]];
      const hl = (i) => s === 1 || (s === 2 && i >= 3 && i <= 6) || (s >= 3 && i >= 7);
      const ch = c.chips({ x: 14, y: 40, items: items.map(([t, tone], i) => ({ t, tone, hl: hl(i), dim: s >= 2 && !hl(i) && s < 5 })), size: 16, h: 40, gap: 8 });
      c.text(14, 26, "11 tokens · full attention", { size: 13, weight: 700 });
      c.text(ch[4].x, ch.bottom + 20, "previous patch (clean)", { size: 12, tone: "bridge" });
      c.text(ch[8].x, ch.bottom + 20, "this patch (noisy)", { size: 12, tone: "code" });
      if (s >= 3) ch.slice(7).forEach((r) => c.arrow(r.x + r.w / 2, ch.bottom + 34, r.x + r.w / 2, ch.bottom + 64, { tone: "code", width: 2, snap: false }));
      if (s >= 3) c.text(ch[7].x, ch.bottom + 84, "velocity out", { size: 13, weight: 700, tone: "code" });
      if (s >= 4) {
        for (let i = 0; i < 10; i++) c.box({ x: 14 + i * 62, y: 230, w: 54, h: 40, label: `${i + 1}`, size: 13, tone: "code", hl: i === 9, solid: false });
        c.text(14, 290, "10 Euler steps: noise → 4 frames", { size: 13, weight: 700, tone: "code" });
      }
      if (s >= 5) c.box({ x: 330, y: 300, w: 300, h: 46, label: "12 layers · width 1,024", size: 14, tone: "take", hl: true }); // Table 1
    };
  };

  D["training-loss"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const seg = [["ref audio", 110, "bridge"], ["text", 150, "paper"], ["prompt audio", 130, "bridge"], ["target audio", 210, "code"]];
      let x = 8;
      seg.forEach(([l, w, tone], i) => { c.box({ x, y: 30, w: w - 6, h: 50, label: l, size: 13, tone, hl: i === 3 && s >= 1, dim: i < 3 && s >= 4 }); x += w; });
      const tx = 8 + 110 + 150 + 130;
      if (s >= 1) c.box({ x: tx, y: 96, w: 204, h: 46, label: "flow-matching loss", size: 13, tone: "code", hl: s === 1 });
      if (s >= 2) c.box({ x: 8, y: 206, w: 624, h: 44, label: "x_t = (1 − t)·x + t·z   →   predict  z − x", mono: true, size: 14, tone: "take", hl: s === 2 }); // code unified_cfm.py
      if (s >= 3) c.box({ x: tx, y: 150, w: 204, h: 40, label: "+ stop loss", size: 13, tone: "muted", hl: s === 3 });
      if (s >= 4) c.text(8, 120, "context only: no loss here", { size: 13, weight: 700, tone: "muted" });
      if (s >= 5) c.box({ x: 8, y: 260, w: 624, h: 40, label: "10%: LM condition zeroed → unconditional branch", size: 13, tone: "predict", hl: s === 5 }); // §3.5
      if (s >= 6) c.box({ x: 8, y: 310, w: 624, h: 40, label: "no duration, pitch or text loss", size: 15, tone: "bad", hl: true });
    };
  };

  D["stop"] = (fig, k) => {
    const c = k.canvas(W, H);
    const xs = Array.from({ length: 22 }, (_, i) => i + 1), ps = xs.map((i) => 1 / (1 + Math.exp(-(i - 17.6) * 2.2)));
    return (s) => {
      c.clear();
      const p = c.plot({ series: s >= 2 ? [{ x: xs.filter((i) => i <= (s >= 3 ? 22 : 12)), y: ps.filter((_, i) => i < (s >= 3 ? 22 : 12)), tone: "take", dots: true }] : [],
        xmin: 1, xmax: 22, ymin: 0, ymax: 1, xlabel: "patch number (160 ms each)", ylabel: "stop probability", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1), h: 300 });
      c.path(`M${p.X(1)},${p.Y(0.5)} L${p.X(22)},${p.Y(0.5)}`, { tone: "muted", dash: true });
      if (s === 1) c.label(p.X(8), p.Y(0.75), "no length target anywhere", { size: 14, tone: "bad", weight: 700 });
      if (s >= 3) { c.dot(p.X(18), p.Y(ps[17]), { r: 8, tone: "predict" }); c.label(p.X(14), p.Y(0.85), "patch 18 → stop · 2.88 s", { size: 14, tone: "predict", weight: 700 }); }
      if (s >= 4) c.box({ x: 60, y: 304, w: 270, h: 44, label: "> 6 patches per token → retry", size: 13, tone: "muted", hl: s === 4 });
      if (s >= 5) c.box({ x: 346, y: 304, w: 286, h: 44, label: "can't ask for 2.6 s", size: 14, tone: "bad", hl: true });
    };
  };

  D["cfg-curve"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["EN WER", "hard ZH CER", "EN SIM"], value: "EN WER" });
    k.follow(m, { 1: "EN WER", 4: "hard ZH CER", 5: "EN WER" });
    const c = k.canvas(W, H);
    const A = [1, 1.5, 2, 3, 5]; // Table 9 V1
    const T = { "EN WER": [16.32, 1.86, 1.85, 2.16, 12.78], "hard ZH CER": [56.87, 9.6, 8.87, 13.22, 48.46], "EN SIM": [55.1, 72.1, 72.9, 71.4, 60.7] };
    return (s) => {
      c.clear();
      const y = T[m.value], hi = m.value === "EN SIM";
      const p = c.plot({ series: [{ x: A, y, tone: hi ? "take" : "bad", dots: true }], xmin: 1, xmax: 5, ymin: 0, ymax: hi ? 80 : Math.max(...y) * 1.1,
        xlabel: "guidance α", ylabel: m.value + (hi ? "" : " (%)"), xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
      const at = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 2 }[s] ?? 2;
      c.dot(p.X(A[at]), p.Y(y[at]), { r: 8, tone: "predict" });
      c.label(p.X(A[at]) + (at >= 3 ? -10 : 12), p.Y(y[at]) - 16, `α ${A[at]}: ${y[at]}`, { size: 14, tone: "predict", weight: 700, anchor: at >= 3 ? "end" : "start", mono: true });
      if (s >= 6) c.label(p.X(2.25), p.Y(hi ? 20 : Math.max(...y) * 0.85), "V2 uses 2 · range 1.5–3", { size: 13, tone: "code", weight: 700 });
    };
  };

  D["sampler"] = (fig, k) => {
    const c = k.canvas(W, H);
    const lin = Array.from({ length: 11 }, (_, i) => 1 - i / 10);
    const sway = lin.map((t) => t + 1.0 * (Math.cos((Math.PI / 2) * t) - 1 + t)); // code unified_cfm.py:67
    return (s) => {
      c.clear();
      const X = (t) => 40 + (1 - t) * 560;
      const axis = (y, pts, tone, name, zero) => {
        c.line(X(1), y, X(0), y, { tone: "muted" });
        c.text(X(1), y + 24, "noise (t = 1)", { size: 11, tone: "muted" });
        c.text(X(0), y + 24, "speech (t = 0)", { size: 11, anchor: "end", tone: "muted" });
        c.text(X(1), y - 16, name, { size: 13, weight: 700, tone });
        pts.forEach((t, i) => c.dot(X(t), y, { r: i === 1 && zero ? 7 : 5, tone: i === 1 && zero ? "bad" : tone }));
      };
      axis(70, lin, "paper", "even: 10 equal steps", false);
      if (s >= 2) axis(190, sway, "predict", "sway (coefficient 1.0): steps crowd near noise", s >= 3);
      if (s >= 3) c.label(X(sway[1]) + 30, 226, "step 1: zero velocity (CFG-Zero*)", { size: 13, tone: "bad", weight: 700 });
      if (s >= 4) c.box({ x: 40, y: 262, w: 560, h: 40, label: "unconditional branch rescaled by s* = ⟨v_c, v_u⟩ / ‖v_u‖²", mono: true, size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 40, y: 312, w: 560, h: 40, label: "inference only · zero new parameters", size: 14, tone: "code", hl: true });
    };
  };

  D["streaming"] = (fig, k) => {
    const T = k.toggle({ label: "serving", options: ["PyTorch", "Nano-vLLM"], value: "PyTorch" });
    k.follow(T, { 1: "PyTorch", 4: "Nano-vLLM" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const rtf = T.value === "PyTorch" ? 0.3 : 0.13; // Table 11
      const X = (sec) => 30 + sec * 200;
      c.text(30, 30, "audio timeline: our 2.88 s line, 18 patches", { size: 13, weight: 700, tone: "bridge" });
      for (let i = 0; i < 18; i++) c.add(k.h("rect", { x: X(i * 0.16), y: 40, width: 0.16 * 200 - 2, height: 30, rx: 2, class: `f-bridge${s >= 2 && i < 6 ? "" : " soft"}` }));
      if (s >= 1) c.text(30, 98, "patch i waits only for patches before it", { size: 13, tone: "take" });
      if (s >= 2) {
        c.text(30, 140, "generation time on one RTX 4090", { size: 13, weight: 700, tone: "predict" });
        for (let i = 0; i < 18; i++) c.add(k.h("rect", { x: X(i * 0.16 * rtf), y: 150, width: Math.max(1, 0.16 * rtf * 200 - 1), height: 30, rx: 1, class: "f-predict" }));
        c.line(X(2.88 * rtf), 140, X(2.88 * rtf), 196, { tone: "predict", width: 2 });
        c.text(X(2.88 * rtf) + 6, 210, `${(2.88 * rtf).toFixed(2)} s`, { size: 14, mono: true, weight: 700, tone: "predict" });
      }
      if (s >= 3) c.box({ x: 30, y: 236, w: 580, h: 44, label: `RTF ${rtf.toFixed(2)} · ${T.value} · ~8 GB VRAM`, mono: true, size: 14, tone: "code", hl: s === 3 || s === 4 });
      if (s >= 5) c.box({ x: 30, y: 296, w: 580, h: 44, label: "time to first audio: not reported", size: 14, tone: "bad", hl: true });
    };
  };

  D["sizes"] = (fig, k) => {
    const T = k.toggle({ label: "release", options: ["VoxCPM", "VoxCPM1.5", "VoxCPM2"], value: "VoxCPM" });
    k.follow(T, { 1: "VoxCPM", 2: "VoxCPM2" });
    const c = k.canvas(W, H);
    const cfg = { // Table 1: [layers, hidden]
      VoxCPM: { LocEnc: [4, 1024], TSLM: [24, 1024], RALM: [6, 1024], LocDiT: [4, 1024], fsq: 256, ctx: 4096, p: "0.6B" },
      "VoxCPM1.5": { LocEnc: [8, 1024], TSLM: [24, 1024], RALM: [8, 1024], LocDiT: [8, 1024], fsq: 256, ctx: 4096, p: "0.8B" },
      VoxCPM2: { LocEnc: [12, 1024], TSLM: [28, 2048], RALM: [8, 2048], LocDiT: [12, 1024], fsq: 512, ctx: 8192, p: "2B" },
    };
    return (s) => {
      c.clear();
      const g = cfg[T.value];
      const hlOf = { LocEnc: 3, TSLM: 2, RALM: 0, LocDiT: 3 };
      let x = 14;
      ["LocEnc", "TSLM", "RALM", "LocDiT"].forEach((n) => {
        const [L, Hd] = g[n], w = Hd / 2048 * 130, h = L * 8;
        c.box({ x, y: 250 - h, w, h, tone: n === "TSLM" ? "take" : n === "LocDiT" ? "code" : n === "RALM" ? "take" : "bridge", hl: hlOf[n] === s });
        c.text(x + w / 2, 272, n, { size: 13, anchor: "middle", weight: 700 });
        c.text(x + w / 2, 290, `${L}L · ${Hd}`, { size: 12, anchor: "middle", mono: true, tone: "muted" });
        x += Math.max(w, 110) + 30;
      });
      c.text(630, 30, `${T.value}: ${g.p} parameters`, { size: 16, anchor: "end", weight: 700, tone: s === 1 ? "predict" : "ink" });
      c.box({ x: 14, y: 312, w: 300, h: 40, label: `FSQ ${g.fsq} dims`, size: 14, tone: "predict", hl: s === 4 });
      c.box({ x: 330, y: 312, w: 300, h: 40, label: `context ${g.ctx.toLocaleString("en-US")}`, size: 14, tone: "muted", hl: s === 5 });
    };
  };
})();
