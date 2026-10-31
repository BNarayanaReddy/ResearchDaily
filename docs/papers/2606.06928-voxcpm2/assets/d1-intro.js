/* Drawings: "Your dubbing problem" and "Toolbox". */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;

  D["pipeline"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const b = V.chain(c, [
        ["Dialogue", "English", "bridge", s === 1],
        ["ASR", "→ text", "muted", s === 2, s < 2],
        ["MT", "en → hi", "muted", s === 2, s < 2],
        ["TTS", "→ speech", "take", s === 3, s < 3],
        ["VC", "new voice", "bridge", s >= 4, s < 4],
      ], { y: 24, h: 70, gap: 22, size: 15 });
      c.box({ x: 8, y: 130, w: 624, h: 44, label: "“I told you never to come back here!”  · 2.6 s · furious", size: 14, tone: "bridge", hl: s === 1 });
      if (s >= 2) {
        c.box({ x: 8, y: 190, w: 300, h: 44, label: "English text", sub: "no anger in it", tone: "muted", hl: s === 2 });
        c.box({ x: 332, y: 190, w: 300, h: 44, label: "मैंने कहा था, यहाँ कभी वापस मत आना!", size: 14, tone: "paper", hl: s === 2 });
      }
      if (s >= 3) c.box({ x: 8, y: 250, w: 624, h: 44, label: "TTS must put the anger back into the Hindi line", size: 14, tone: "take", hl: s === 3 });
      if (s >= 4) c.box({ x: 8, y: 306, w: 300, h: 44, label: "VC: actor's timbre → consented voice", size: 13, tone: "bridge", hl: s === 4 });
      if (s >= 5) c.box({ x: 332, y: 306, w: 300, h: 44, label: "risk: VC flattens the emotion", size: 13, tone: "bad", hl: true });
    };
  };

  D["what-crosses"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Emotion and energy", "copy: furious, loud, tense", "code"],
      ["Emphasis on “never”", "copy, but onto “कभी”", "code"],
      ["Timing and pauses", "fit the 2.6 s window", "predict"],
      ["Breaths, laughs, sighs", "copy where they occur", "code"],
      ["Timbre and accent", "must NOT cross: no consent", "bad"],
    ];
    return (s) => V.board(c, rows, s, { split: 250 });
  };

  D["why-voxcpm2"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["One open model, many modes", "2B · Apache 2.0 weights", "code"],
      ["Who and how are separate", "reference clip + text caption", "code"],
      ["Languages", "30 · Hindi the only Indic one", "predict"],
      ["Gaps for dubbing", "no length control · emotion only as text", "bad"],
      ["Our plan", "learn the machine, then extend it", "take"],
    ];
    return (s) => V.board(c, rows, s, { split: 250 });
  };

  D["tokens-vs-latents"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 18, "token route", { size: 13, weight: 700, tone: "paper" });
      const a = c.box({ x: 8, y: 30, w: 100, h: 50, label: "audio", tone: "bridge" });
      const tk = c.box({ x: 132, y: 30, w: 130, h: 50, label: "codec tokens", sub: "3 17 902 …", tone: "paper", hl: s === 2 });
      const lm = c.box({ x: 286, y: 30, w: 110, h: 50, label: "LLM", tone: "take", hl: s === 1 });
      c.connect(a, tk); c.connect(tk, lm);
      if (s >= 2) c.label(197, 104, "rounding drops detail", { size: 13, tone: "bad", weight: 700 });
      if (s >= 3) {
        const fm = c.box({ x: 420, y: 30, w: 120, h: 50, label: "flow decoder", sub: "2nd model", tone: "predict", hl: s === 3 });
        const o = c.box({ x: 562, y: 30, w: 70, h: 50, label: "audio", tone: "bridge" });
        c.connect(lm, fm); c.connect(fm, o);
      }
      if (s >= 4) {
        c.text(8, 190, "continuous route", { size: 13, weight: 700, tone: "code" });
        const a2 = c.box({ x: 8, y: 202, w: 100, h: 50, label: "audio", tone: "bridge" });
        const z = c.box({ x: 132, y: 202, w: 170, h: 50, label: "VAE frames", sub: "64 numbers each", tone: "code", hl: s === 4 });
        const ar = c.box({ x: 326, y: 202, w: 190, h: 50, label: "one AR model", sub: "plans + paints", tone: "take", hl: s === 5 });
        const o2 = c.box({ x: 540, y: 202, w: 92, h: 50, label: "audio", tone: "bridge" });
        c.connect(a2, z); c.connect(z, ar); c.connect(ar, o2);
        c.label(217, 276, "nothing rounded away", { size: 13, tone: "code", weight: 700 });
      }
      if (s >= 5) c.box({ x: 300, y: 296, w: 332, h: 48, label: "errors pile up in long, expressive lines", size: 13, tone: "bad", hl: true });
    };
  };

  D["vae-latent"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = V.rng(5), vals = Array.from({ length: 8 * 18 }, () => V.gauss(r));
    const wave = Array.from({ length: 160 }, (_, i) => Math.sin(i * 0.9) * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.05))) * Math.exp(-((i - 80) ** 2) / 6000));
    return (s) => {
      c.clear();
      c.path("M8,40 " + wave.map((v, i) => `L${8 + i * 1.6},${40 - v * 26}`).join(" "), { tone: "bridge", width: 1.4 });
      c.text(8, 84, "2.88 s at 16 kHz = 46,080 samples", { size: 12, tone: "muted" }); // §3.2
      const en = c.box({ x: 300, y: 18, w: 160, h: 52, label: "encoder", sub: "÷ 640 in time", tone: "take", hl: s === 1 });
      if (s >= 2) {
        const gx = 300, gy = 110, cw = 17, ch = 13;
        for (let j = 0; j < 18; j++) for (let i = 0; i < 8; i++) {
          const v = vals[j * 8 + i];
          c.add(k.h("rect", { x: gx - 290 + j * cw, y: gy + i * ch, width: cw - 2, height: ch - 2, rx: 2, class: `f-${v > 0 ? "code" : "paper"}`, opacity: Math.min(1, 0.25 + Math.abs(v) * 0.4) }));
        }
        c.text(10, gy + 8 * ch + 18, "first 18 of 72 frames · 8 of 64 numbers shown", { size: 12, tone: "muted" });
        const fb = c.box({ x: 340, y: 110, w: 292, h: 70, label: "72 frames × 64 numbers", sub: "25 frames per second", tone: "code", hl: s === 2 }); // §3.1
        c.connect(en, fb, { tone: "take" });
      }
      if (s >= 3) c.box({ x: 340, y: 196, w: 292, h: 50, label: "decoder → waveform", sub: "mel + GAN losses", tone: "bridge", hl: s === 3 });
      if (s >= 4) c.box({ x: 10, y: 262, w: 300, h: 44, label: "KL weight 5e-5: barely a VAE", size: 13, tone: "muted", hl: s === 4 }); // §3.5 V1
      if (s >= 5) c.box({ x: 340, y: 262, w: 292, h: 44, label: "the TTS predicts these frames", size: 14, tone: "take", hl: true });
    };
  };

  // --- flow matching toy: two targets at ±1 (spread 0.15), noise N(0,1) at t = 0, data at t = 1.
  const SD = 0.15;
  const vel = (x, t) => {
    t = Math.min(t, 0.995);
    const va = (1 - t) ** 2 + t * t * SD * SD;
    let num = 0, den = 0;
    for (const m of [-1, 1]) {
      const w = Math.exp(-((x - t * m) ** 2) / (2 * va));
      num += w * (m + t * SD * SD * (x - t * m) / va); den += w;
    }
    return (num / den - x) / (1 - t);
  };
  const euler = (x, n) => { const xs = [0], ys = [x]; for (let i = 0; i < n; i++) { x += vel(x, i / n) / n; xs.push((i + 1) / n); ys.push(x); } return { x: xs, y: ys }; };

  D["flow-matching"] = (fig, k) => {
    const st = k.slider({ label: "solver steps", min: 1, max: 20, step: 1, value: 10 });
    const c = k.canvas(W, H);
    const starts = [-1.5, -0.9, -0.35, 0.15, 0.55, 1.05, 1.6];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 1, ymin: -2, ymax: 2, xlabel: "time t  (0 = noise, 1 = a real frame)", ylabel: "frame value",
        xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
      [-1, 1].forEach((m) => c.dot(p.X(1), p.Y(m), { r: 7, tone: "code" }));
      starts.forEach((x0) => c.dot(p.X(0), p.Y(x0), { r: 4, tone: "muted" }));
      if (s === 1) c.label(p.X(0.18), p.Y(1.7), "start: random noise", { size: 13, tone: "muted", weight: 700 });
      if (s >= 2) {
        c.path(`M${p.X(0)},${p.Y(starts[0])} L${p.X(1)},${p.Y(1)}`, { tone: "paper", dash: true, width: 1.6 });
        if (s === 2) c.label(p.X(0.5), p.Y((starts[0] + 1) / 2) - 18, "training: a straight line noise → data", { size: 13, tone: "paper", weight: 700 });
      }
      if (s >= 3) {
        for (let ti = 1; ti <= 8; ti++) for (let xi = -4; xi <= 4; xi++) {
          const t = ti / 10, x = xi * 0.42, v = vel(x, t), L = 0.035;
          const nx = 1 / Math.hypot(1, v), dx = L * nx, dy = L * v * nx;
          c.line(p.X(t), p.Y(x), p.X(t + dx), p.Y(x + dy), { tone: "take", width: 1.2, dim: s > 3 });
        }
        if (s === 3) c.label(p.X(0.5), p.Y(1.85), "learned velocity at every (t, x)", { size: 13, tone: "take", weight: 700 });
      }
      if (s >= 4) {
        starts.slice(0, 4).forEach((x0) => {
          const e = euler(x0, st.value);
          c.path(e.x.map((t, i) => `${i ? "L" : "M"}${p.X(t)},${p.Y(e.y[i])}`).join(" "), { tone: "predict", width: 2 });
        });
        c.label(p.X(0.55), p.Y(-1.8), `${st.value} Euler step${st.value > 1 ? "s" : ""} per sample`, { size: 13, tone: "predict", weight: 700 });
      }
      if (s >= 5) c.label(p.X(0.97), p.Y(0), "VoxCPM: one patch at a time", { size: 13, tone: "code", weight: 700, anchor: "end" });
    };
  };

  D["cfg"] = (fig, k) => {
    const a = k.slider({ label: "guidance α", min: 1, max: 5, step: 0.5, value: 2, fmt: (v) => v.toFixed(1) });
    k.follow(a, { 1: 2, 3: 2, 4: 1, 5: 5 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ox = 150, oy = 290;
      const vu = [1.6, -0.6], vc = [1.9, -1.4];
      const al = a.value, g = [vu[0] + al * (vc[0] - vu[0]), vu[1] + al * (vc[1] - vu[1])];
      const sc = Math.min(70, 230 / -g[1], 300 / g[0]); // shrink to keep the guided arrow on the canvas
      if (s === 1) {
        c.box({ x: 20, y: 40, w: 280, h: 60, label: "90% of steps: condition on", sub: "text + context → v_c", tone: "paper", hl: true });
        c.box({ x: 340, y: 40, w: 280, h: 60, label: "10%: condition dropped", sub: "noisy patch only → v_u", tone: "muted", hl: true }); // §3.5
        return;
      }
      c.dot(ox, oy, { r: 6, tone: "ink" });
      c.label(ox - 10, oy + 26, "noisy patch", { size: 13, tone: "muted" });
      c.arrow(ox, oy, ox + vu[0] * sc, oy + vu[1] * sc, { tone: "muted", width: 2.4, snap: false });
      c.label(ox + vu[0] * sc + 20, oy + vu[1] * sc + 14, "v_u", { size: 14, tone: "muted", weight: 700 });
      c.arrow(ox, oy, ox + vc[0] * sc, oy + vc[1] * sc, { tone: "paper", width: 2.4, snap: false });
      c.label(ox + vc[0] * sc - 6, oy + vc[1] * sc - 12, "v_c", { size: 14, tone: "paper", weight: 700 });
      if (s >= 3) {
        c.arrow(ox, oy, ox + g[0] * sc, oy + g[1] * sc, { tone: "predict", width: 3, snap: false });
        c.label(Math.min(ox + g[0] * sc + 10, 470), Math.max(40, oy + g[1] * sc - 10), `guided, α = ${al.toFixed(1)}`, { size: 14, tone: "predict", weight: 700 });
      }
      c.text(632, 340, `v = v_u + ${al.toFixed(1)} · (v_c − v_u)`, { size: 15, mono: true, anchor: "end", weight: 700 });
      if (s === 4) c.box({ x: 400, y: 250, w: 232, h: 46, label: "α = 1: EN WER 16.32%", tone: "bad", hl: true }); // Table 9 V1
      if (s === 5) c.box({ x: 400, y: 250, w: 232, h: 46, label: "α = 5: EN WER 12.78%", tone: "bad", hl: true }); // Table 9 V1
    };
  };

  D["fsq"] = (fig, k) => {
    const hv = k.slider({ label: "hidden value h", min: -3, max: 3, step: 0.01, value: 0.37, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const x0 = 40, x1 = 600, X = (v, lo, hi) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
      const h = hv.value, t = Math.tanh(h), q = Math.round(t * 9) / 9;
      // line 1: raw h
      c.line(x0, 70, x1, 70, { tone: "muted" });
      [-3, -2, -1, 0, 1, 2, 3].forEach((v) => c.text(X(v, -3, 3), 92, String(v), { size: 11, anchor: "middle", tone: "muted" }));
      c.dot(X(h, -3, 3), 70, { r: 7, tone: "paper" });
      c.text(x0, 44, "h from the TSLM (one of 512 dims)", { size: 13, tone: "paper", weight: 700 });
      // line 2: tanh(h) with the 19-level grid
      c.line(x0, 200, x1, 200, { tone: "muted" });
      for (let i = -9; i <= 9; i++) c.line(X(i / 9, -1, 1), 192, X(i / 9, -1, 1), 208, { tone: i === Math.round(t * 9) ? "predict" : "faint", width: i === Math.round(t * 9) ? 3 : 1.2 });
      [-1, 0, 1].forEach((v) => c.text(X(v, -1, 1), 228, String(v), { size: 11, anchor: "middle", tone: "muted" }));
      if (s >= 2) {
        c.dot(X(t, -1, 1), 200, { r: 6, tone: "take" });
        c.arrow(X(h, -3, 3), 80, X(t, -1, 1), 188, { tone: "take", dash: true, snap: false });
        c.label(X(t, -1, 1) + 70, 150, `tanh → ${t.toFixed(3)}`, { size: 13, tone: "take", weight: 700, mono: true });
      }
      c.text(x0, 172, s >= 3 ? "grid: round(9·tanh(h)) / 9 → 19 levels" : "a fixed grid, no codebook", { size: 13, tone: "predict", weight: 700 });
      c.box({ x: 40, y: 246, w: 260, h: 44, label: `rounded: ${q.toFixed(3)} (${Math.round(t * 9)}/9)`, mono: true, size: 14, tone: "predict", hl: s === 1 });
      if (s === 3) c.box({ x: 320, y: 246, w: 280, h: 44, label: "paper: “9 levels” = the scale", size: 13, tone: "muted", hl: true }); // §3.3.1
      if (s >= 4) c.box({ x: 320, y: 246, w: 280, h: 44, label: "backward: gradient passes as if identity", size: 12, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 40, y: 302, w: 560, h: 46, label: "19^512 ≈ 10^655 possible skeletons: never a vocabulary", size: 14, tone: "bad", hl: true });
    };
  };

  D["ditar"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = V.rng(9), fr = Array.from({ length: 24 }, () => V.gauss(r));
    return (s) => {
      c.clear();
      const cur = 4, pw = 96, px = (i) => 12 + i * (pw + 8);
      for (let i = 0; i < 6; i++) {
        const done = i < cur, now = i === cur;
        c.box({ x: px(i), y: 220, w: pw, h: 90, tone: now ? "predict" : done ? "bridge" : "muted", hl: now && s >= 3, dashed: i > cur, dim: i > cur });
        if (i <= cur) for (let f = 0; f < 4; f++) {
          const v = fr[i * 4 + f] * (now && s < 3 ? 0.3 : 1), x = px(i) + 10 + f * 21, y = v > 0 ? 265 - v * 16 : 265;
          c.add(k.h("rect", { x, y, width: 16, height: Math.abs(v) * 16 + 1, class: `f-${now ? "predict" : "bridge"}` }));
        }
        c.text(px(i) + pw / 2, 330, `patch ${i + 1}`, { size: 12, anchor: "middle", tone: "muted" });
      }
      c.text(12, 206, "4 frames = 160 ms per patch", { size: 13, tone: "bridge", weight: 700 }); // §3.1
      if (s >= 2) {
        const lm = c.box({ x: 12, y: 24, w: 616, h: 56, label: "language model: text + patches 1…4 → one vector for patch 5", size: 14, tone: "take", hl: s === 2 });
        c.arrow(px(cur) + pw / 2, 82, px(cur) + pw / 2, 138, { tone: "take", width: 2, snap: false });
      }
      if (s >= 3) c.box({ x: px(cur) - 60, y: 140, w: pw + 120, h: 44, label: "LocDiT: noise → 4 frames", size: 13, tone: "predict", hl: s === 3 });
      if (s >= 4) c.box({ x: 12, y: 140, w: 330, h: 44, label: "sees only patch 4 and patch 5", size: 13, tone: "code", hl: s === 4 });
      if (s >= 5) c.text(628, 206, "LM plans · LocDiT paints", { size: 13, anchor: "end", weight: 700, tone: "take" });
    };
  };

  D["prompt-clone"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 40, "text", { size: 13, weight: 700, tone: "paper" });
      c.text(8, 130, "audio", { size: 13, weight: 700, tone: "bridge" });
      c.box({ x: 70, y: 16, w: 240, h: 40, label: "“Namaste, I am Asha.”", size: 13, tone: "paper", hl: s === 1 });
      c.box({ x: 70, y: 106, w: 240, h: 40, label: "3 s of Asha's voice", size: 13, tone: "bridge", hl: s === 1 });
      if (s >= 2) c.box({ x: 330, y: 16, w: 300, h: 40, label: "+ the new sentence", size: 13, tone: "paper", hl: s === 2 });
      if (s >= 3) {
        c.box({ x: 330, y: 106, w: 300, h: 40, label: "? → the model continues", size: 13, tone: "predict", hl: s === 3, dashed: true });
        c.arrow(310, 126, 328, 126, { tone: "predict", snap: false });
      }
      if (s >= 4) c.box({ x: 70, y: 180, w: 560, h: 46, label: "same voice, room and mood: zero-shot cloning, no training", size: 14, tone: "code", hl: s === 4 });
      if (s >= 5) {
        c.box({ x: 70, y: 244, w: 270, h: 46, label: "copies emotion ✓", size: 14, tone: "code", hl: true });
        c.box({ x: 360, y: 244, w: 270, h: 46, label: "copies timbre ✗ (no consent)", size: 14, tone: "bad", hl: true });
      }
    };
  };
})();
