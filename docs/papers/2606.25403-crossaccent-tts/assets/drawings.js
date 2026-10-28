/* Drawings for the CrossAccent-TTS lesson (arXiv:2606.25403v1).
   One entry per data-draw name; each is redrawn on every step and control change.
   Numbers from the paper carry a // Table N, // Fig. N or // §N comment; everything else is
   illustrative layout or our arithmetic, as each page's caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;
  const TOK_PER_S = 50;                                     // §3.1

  // a checklist board: rows [question, answer, tone]; row i appears on step i + 1
  const board = (c, rows, s, top = 8, rowH = 68) => {
    c.clear();
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rowH, now = s === i + 1;
      c.box({ x: 10, y, w: 620, h: rowH - 10, tone: "muted", hl: now });
      c.text(26, y + (rowH - 10) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: 270, lines: 1, inBox: true });
      c.box({ x: 310, y: y + 8, w: 306, h: rowH - 26, label: a, size: 13, tone, hl: now });
    });
  };

  // =========================================================== TOOLBOX
  D["leak"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const clip = c.box({ x: 16, y: 20, w: 170, h: 56, label: "Priya’s clip", sub: "Telugu · 5 s", tone: "bridge", hl: s === 1 });
      const enc = c.box({ x: 226, y: 20, w: 170, h: 56, label: "voice encoder", tone: "take", hl: s === 1 });
      const pr = c.box({ x: 436, y: 20, w: 188, h: 56, label: s >= 5 ? "voice only" : "voice prompt", tone: s >= 5 ? "code" : "take", hl: s === 1 || s === 5 });
      c.connect(clip, enc, { tone: "bridge" });
      c.connect(enc, pr, { tone: "take" });
      if (s >= 2) c.text(300, 140, s >= 5 ? "accent stripped out" : "holds timbre + pitch + accent", { size: 14, anchor: "middle", weight: 700, tone: s === 2 ? "predict" : "muted" });
      if (s >= 3) {
        const tx = c.box({ x: 16, y: 200, w: 170, h: 56, label: "Hindi text", tone: "paper" });
        const tts = c.box({ x: 436, y: 200, w: 188, h: 56, label: "TTS", tone: "take" });
        const out = c.box({ x: 436, y: 290, w: 188, h: 56, label: s >= 5 ? "Hindi, accent you choose" : "Hindi, Telugu accent",
          size: 14, tone: s >= 5 ? "code" : "bad", hl: s === 3 || s === 5 });
        c.connect(tx, tts, { tone: "paper" });
        c.connect(pr, tts, { tone: "take" });
        c.connect(tts, out, { tone: s >= 5 ? "code" : "bad" });
      }
      if (s === 4) c.box({ x: 16, y: 290, w: 380, h: 56, label: "dubbing: a little accent can help", sub: "too much hurts clarity (§1)", size: 14, tone: "predict", hl: true });
      if (s >= 5) c.box({ x: 16, y: 290, w: 380, h: 56, label: "+ accent added back on purpose", size: 14, tone: "predict", hl: true });
    };
  };

  D["grl"] = (fig, k) => {
    const c = k.canvas(W, H);
    const LAM = 0.1, G = 0.8;                                // λ from §4.2; G illustrative
    return (s) => {
      c.clear();
      const x = c.box({ x: 10, y: 60, w: 100, h: 60, label: "clip", tone: "bridge" });
      const enc = c.box({ x: 140, y: 60, w: 120, h: 60, label: "encoder", tone: "take", hl: s === 4 });
      const out = c.box({ x: 290, y: 60, w: 100, h: 60, label: "output", tone: "take" });
      const spy = c.box({ x: 520, y: 60, w: 110, h: 60, label: s >= 5 ? "spy: guessing" : "spy: language?", tone: s >= 5 ? "code" : "predict", hl: s === 1 || s === 5 });
      c.connect(x, enc, { tone: "bridge" });
      c.connect(enc, out, { tone: "take" });
      if (s >= 3) {
        const grl = c.box({ x: 420, y: 60, w: 70, h: 60, label: "GRL", tone: "bad", hl: s === 3 });
        c.connect(out, grl, { tone: "take" });
        c.connect(grl, spy, { tone: "take" });
      } else c.connect(out, spy, { tone: "take" });
      c.text(320, 30, "forward: unchanged", { size: 13, anchor: "middle", tone: "muted" });
      if (s >= 2) {
        c.arrow(575, 150, 455, 150, { tone: "code", label: `+${G.toFixed(2)}` });
        c.text(520, 190, "spy learns normally", { size: 13, anchor: "middle", tone: "code" });
      }
      if (s >= 3) {
        c.arrow(440, 230, 200, 230, { tone: "bad", label: `× −${LAM} → −${(G * LAM).toFixed(2)}` });
        c.text(320, 270, "backward: sign flipped, scaled by λ", { size: 13, anchor: "middle", tone: "bad" });
      }
      if (s >= 4) c.text(320, 320, "encoder moves to fool the spy", { size: 15, anchor: "middle", weight: 700, tone: "predict" });
    };
  };

  // =========================================================== THE MACHINE
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const au = c.box({ x: 10, y: 20, w: 96, h: 56, label: "Priya’s clip", tone: "bridge", hl: s === 1 });
      const en = c.box({ x: 130, y: 20, w: 120, h: 56, label: "Neucodec encoder", tone: "bridge", hl: s === 1 });
      c.connect(au, en, { tone: "bridge" });
      if (s >= 2) {
        const pe = c.box({ x: 280, y: 20, w: 130, h: 56, label: "Perceiver", sub: "32 slots", tone: "take", hl: s === 2 });
        c.connect(en, pe, { tone: "bridge" });
        if (s >= 3) {
          const spy = c.box({ x: 280, y: 120, w: 130, h: 46, label: "GRL + classifier", size: 13, tone: "bad", dashed: true, hl: s === 3 });
          c.connect(pe, spy, { tone: "bad", dash: true });
        }
        if (s >= 4) {
          const la = c.box({ x: 440, y: 20, w: 190, h: 56, label: "+ language embedding", sub: "mix two with λ", size: 14, tone: "predict", hl: s === 4 });
          c.connect(pe, la, { tone: "take" });
          if (s >= 5) {
            const tx = c.box({ x: 180, y: 220, w: 200, h: 56, label: "Hindi text as IPA", tone: "paper" });
            const de = c.box({ x: 440, y: 220, w: 190, h: 56, label: "Qwen 2.5 (0.5B)", sub: "writes codec tokens", tone: "take", hl: true });
            const cd = c.box({ x: 440, y: 298, w: 190, h: 50, label: "Neucodec decoder", tone: "bridge" });
            const sp = c.box({ x: 180, y: 298, w: 200, h: 50, label: "Hindi speech, 24 kHz", tone: "code" });
            c.connect(la, de, { tone: "predict" });
            c.connect(tx, de, { tone: "paper" });
            c.connect(de, cd, { tone: "take" });
            c.connect(cd, sp, { tone: "bridge" });
          }
        }
      }
    };
  };

  D["tokens"] = (fig, k) => {
    const len = k.slider({ label: "clip length", min: 1, max: 15, step: 1, value: 5, fmt: (v) => `${v} s` });
    const c = k.canvas(W, H);
    const PX = 40;                                           // px per second
    return (s) => {
      c.clear();
      const L = len.value, n = L * TOK_PER_S;
      c.box({ x: 20, y: 30, w: L * PX, h: 50, label: L >= 4 ? `${L} s · ${(L * 16000).toLocaleString()} samples` : `${L} s`, size: 13, tone: "bridge", hl: s === 1 }); // 16 kHz, §3.1
      c.text(20, 112, "16 kHz in", { size: 13, tone: "muted" });
      const a = Math.floor(L * 0.3), b = Math.max(a + 1, Math.floor(L * 0.7));   // illustrative chunk
      if (s >= 2) {
        for (let i = 0; i < L; i++) {
          const inChunk = s >= 3 && i >= a && i < b;
          c.box({ x: 20 + i * PX, y: 140, w: PX - 4, h: 44, label: "50", size: 13, tone: inChunk ? "predict" : "paper", hl: s === 2 || (inChunk && s === 3), dim: s >= 3 && !inChunk });
        }
        c.text(620, 216, `${L} × 50 = ${n} tokens · 16 bits each`, { size: 15, mono: true, anchor: "end", weight: 700, tone: s === 2 ? "predict" : "ink" });
      }
      if (s >= 3) {
        c.text(20, 252, "random chunk for training (length not reported)", { size: 13, tone: "predict" });
      }
      if (s >= 4) c.box({ x: 20, y: 284, w: 600, h: 54, label: "predicted tokens → Neucodec decoder → 24 kHz audio", size: 14, tone: "code", hl: s === 4 }); // §3.1
    };
  };

  D["perceiver"] = (fig, k) => {
    const len = k.slider({ label: "clip length", min: 1, max: 15, step: 1, value: 5, fmt: (v) => `${v} s` });
    const c = k.canvas(W, H);
    const NS = 32, SW = 600 / NS;                            // N_s = 32, §4.2
    return (s) => {
      c.clear();
      const n = len.value * TOK_PER_S, tw = Math.max(120, n / 750 * 600);
      const tok = c.box({ x: 20, y: 20, w: tw, h: 50, label: `${n} tokens + positions`, size: 13, tone: "bridge", hl: s === 1 });
      if (s >= 3) for (let i = 0; i < NS; i += 4) {
        const sx = 20 + i * SW + SW / 2;
        [0.15, 0.5, 0.85].forEach((f) => c.line(sx, 180, 20 + f * tw, 72, { tone: "take", width: 0.8 }));
      }
      if (s >= 2) {
        for (let i = 0; i < NS; i++) c.box({ x: 20 + i * SW + 1, y: 180, w: SW - 3, h: 44, tone: "take", hl: s === 2 || s === 4 });
        c.text(20, 248, "32 learned slots, 768 wide", { size: 13, tone: "take", weight: 700 });
      }
      if (s >= 3) c.text(620, 248, "cross-attention, then self-attention", { size: 13, anchor: "end", tone: "muted" });
      if (s >= 4) c.text(320, 280, `${n} → 32 × 768, always`, { size: 17, anchor: "middle", mono: true, weight: 700, tone: "predict" });
      if (s >= 5) {
        c.box({ x: 20, y: 300, w: 290, h: 48, label: "keeps: timbre, voice quality", size: 13, tone: "code", hl: true });
        c.box({ x: 330, y: 300, w: 290, h: 48, label: "squeezed: phonetic content", size: 13, tone: "muted" });
      }
    };
  };

  D["scrub"] = (fig, k) => {
    const lam = k.slider({ label: "λ_GRL", min: 0, max: 1, step: 0.05, value: 0.1, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    const LANGS = ["Hi", "Te", "Ta", "Bn", "Mr", "En"];       // §4.1.1
    const LDEC = 2.4, LGRL = Math.log(6);                     // L_dec illustrative; ln 6 = chance-level 6-way loss
    return (s) => {
      c.clear();
      const sl = c.box({ x: 20, y: 30, w: 150, h: 60, label: "32 voice slots", tone: "take" });
      const g = c.box({ x: 220, y: 30, w: 90, h: 60, label: "GRL", tone: "bad", hl: s === 3 });
      const sp = c.box({ x: 360, y: 30, w: 260, h: 60, label: "classifier: which language?", size: 14, tone: "predict", hl: s === 1 });
      c.connect(sl, g, { tone: "take" });
      c.connect(g, sp, { tone: "take" });
      if (s >= 2) c.chips({ x: 360, y: 110, items: LANGS.map((t) => ({ t, tone: "predict", hl: s === 2 })), size: 14 });
      if (s >= 3) c.arrow(600, 175, 95, 175, { tone: "bad", label: "gradient flipped into the Perceiver" });
      if (s >= 4) {
        const L = lam.value, tot = LDEC + L * LGRL, sc = 560 / (LDEC + LGRL);
        c.text(20, 230, `L_total = ${LDEC.toFixed(2)} + ${L.toFixed(2)} × ${LGRL.toFixed(2)} = ${tot.toFixed(2)}`, { size: 15, mono: true, weight: 700 });
        c.add(k.h("rect", { x: 20, y: 244, width: LDEC * sc, height: 30, rx: 4, class: "f-take soft" }));
        c.add(k.h("rect", { x: 20 + LDEC * sc, y: 244, width: Math.max(0.5, L * LGRL * sc), height: 30, rx: 4, class: "f-bad" }));
        c.text(28, 264, "decoder loss", { size: 12, inBox: true });
      }
      if (s >= 5) c.box({ x: 20, y: 298, w: 600, h: 48, label: "classifier accuracy after training: not reported", size: 14, tone: "bad", hl: true });
    };
  };

  D["langemb"] = (fig, k) => {
    const c = k.canvas(W, H);
    const LANGS = ["Hindi", "Telugu", "Tamil", "Bengali", "Marathi", "English"];   // §4.1.1
    const ROWS = ["slot 1", "slot 2", "slot 3", "⋮", "slot 31", "slot 32"];
    const y0 = 60, rh = 42;
    return (s) => {
      c.clear();
      c.text(60, 40, "table", { size: 13, anchor: "middle", tone: "muted", weight: 700 });
      const tab = LANGS.map((l, i) => c.box({ x: 10, y: y0 + i * rh, w: 100, h: 34, label: l, size: 13, tone: i === 1 ? "predict" : "muted", hl: i === 1 && s === 1 }));
      if (s === 1) c.text(130, y0 + rh + 22, "(B, 1, 768)", { size: 14, mono: true, tone: "predict", weight: 700 });
      if (s >= 2) {
        c.text(200, 40, "copy ×32", { size: 13, anchor: "middle", tone: "predict", weight: 700 });
        const cp = ROWS.map((r, i) => r === "⋮" ? c.text(200, y0 + i * rh + 24, "⋮", { size: 16, anchor: "middle" })
          : c.box({ x: 150, y: y0 + i * rh, w: 100, h: 34, label: "Telugu", size: 13, tone: "predict", hl: s === 2 }));
        c.connect(tab[1], cp[1], { tone: "predict" });
      }
      if (s >= 3) {
        c.text(345, 40, "voice slots", { size: 13, anchor: "middle", tone: "muted", weight: 700 });
        c.text(530, 40, "(B, 32, 768)", { size: 13, anchor: "middle", mono: true, weight: 700 });
        ROWS.forEach((r, i) => {
          const y = y0 + i * rh;
          if (r === "⋮") { c.text(345, y + 24, "⋮", { size: 16, anchor: "middle" }); c.text(530, y + 24, "⋮", { size: 16, anchor: "middle" }); return; }
          c.text(268, y + 23, "+", { size: 18, anchor: "middle", weight: 700 });
          c.box({ x: 285, y, w: 120, h: 34, label: r, size: 13, tone: "take" });
          c.text(423, y + 23, "=", { size: 18, anchor: "middle", weight: 700 });
          c.box({ x: 440, y, w: 180, h: 34, label: `${r} + Telugu`, size: 13, tone: "code", hl: s === 4 });
        });
      }
      if (s >= 4) c.text(320, 346, "every slot now carries the accent", { size: 15, anchor: "middle", weight: 700, tone: "code" });
    };
  };

  D["dial"] = (fig, k) => {
    const lam = k.slider({ label: "λ", min: 0, max: 1, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(lam, { 2: 0.5, 3: 0.8 });
    const c = k.canvas(W, H);
    const E1 = [0.9, 0.2, 0.4], E2 = [0.2, 0.8, 0.5];         // illustrative stand-ins for 768-wide rows
    const f = (v) => `[${v.map((x) => x.toFixed(2)).join(", ")}]`;
    return (s) => {
      c.clear();
      const L = lam.value, mix = E1.map((a, i) => L * a + (1 - L) * E2[i]);
      const p = c.plot({ series: [], x: 0, y: 0, w: 340, h: 350, xmin: 0, xmax: 1, ymin: 0, ymax: 1,
        xlabel: "dimension 1 (toy)", ylabel: "dimension 2 (toy)", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(1) });
      if (s >= 3) c.line(p.X(E1[0]), p.Y(E1[1]), p.X(E2[0]), p.Y(E2[1]), { tone: "muted", width: 1.4 });
      c.dot(p.X(E1[0]), p.Y(E1[1]), { r: 7, tone: "predict" });
      c.dot(p.X(E2[0]), p.Y(E2[1]), { r: 7, tone: "paper" });
      c.label(p.X(E1[0]) - 10, p.Y(E1[1]) - 16, "e₁ Telugu", { size: 13, tone: "predict", weight: 700, anchor: "end" });
      c.label(p.X(E2[0]) + 10, p.Y(E2[1]) - 16, "e₂ Hindi", { size: 13, tone: "paper", weight: 700 });
      if (s >= 3) c.dot(p.X(mix[0]), p.Y(mix[1]), { r: 8, tone: "code" });
      c.text(360, 40, `e₁ = ${f(E1)}`, { size: 14, mono: true, tone: "predict" });
      c.text(360, 70, `e₂ = ${f(E2)}`, { size: 14, mono: true, tone: "paper" });
      if (s >= 2) {
        c.text(360, 112, "λ·e₁ + (1−λ)·e₂", { size: 15, mono: true, weight: 700 });
        c.text(360, 142, `= ${f(mix)}`, { size: 14, mono: true, tone: "code", weight: 700 });
        c.text(360, 172, `λ = ${L.toFixed(2)}`, { size: 14, mono: true, tone: s === 3 ? "predict" : "muted" });
      }
      if (s >= 4) c.box({ x: 360, y: 200, w: 270, h: 56, label: "training: one language per clip", sub: "mixing: inference only", size: 13, tone: "muted", hl: s === 4 });
      if (s >= 5) c.box({ x: 360, y: 276, w: 270, h: 56, label: "e₁ = the accent you dial toward", sub: "our reading of Eq. 2", size: 13, tone: "take", hl: true });
    };
  };

  D["decoder"] = (fig, k) => {
    const dur = k.slider({ label: "Hindi line", min: 1, max: 10, step: 1, value: 3, fmt: (v) => `${v} s` });
    const c = k.canvas(W, H);
    const IPA = ["aː", "dʒ", "m", "ɔː", "s", "ə", "m"];        // illustrative phonemes ("aaj mausam")
    return (s) => {
      c.clear();
      const ch = c.chips({ x: 240, y: 40, items: IPA.map((t) => ({ t, tone: "paper", hl: s === 1 })), size: 15 });
      c.text(240, 30, "text as IPA tokens", { size: 13, tone: "paper", weight: 700 });
      const de = s >= 3 ? c.box({ x: 20, y: 140, w: 600, h: 60, label: "Qwen 2.5 (0.5B) decoder", sub: "one codec token at a time", tone: "take", hl: s === 3 }) : null;
      if (s >= 2) {
        const sl = c.box({ x: 20, y: 34, w: 190, h: 50, label: "32 slots (voice + λ mix)", size: 13, tone: "predict", hl: s === 2 });
        if (de) c.connect(sl, de, { tone: "predict" });
      }
      if (de) c.arrow(400, 90, 400, 138, { tone: "paper" });
      if (s >= 3) {
        const n = dur.value * TOK_PER_S;
        const out = c.chips({ x: 20, y: 230, items: ["t₁", "t₂", "t₃", "t₄", "t₅", "…", `t${n}`, "END"].map((t) => ({ t, tone: t === "END" ? "bad" : "take", hl: s === 4 })), size: 14 });
        c.arrow(320, 202, 320, 228, { tone: "take" });
        if (s >= 4) c.text(620, 290, `${dur.value} s × 50 = ${n} tokens`, { size: 16, mono: true, anchor: "end", weight: 700, tone: "predict" });
      }
      if (s >= 5) c.box({ x: 20, y: 304, w: 400, h: 46, label: "Neucodec decoder → 24 kHz audio", size: 14, tone: "bridge", hl: true });
    };
  };

  D["train"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ROWS = [["in-house Indic", 636, 1], ["Emilia-YODAS split", 350, 2], ["L2-ARCTIC", 27, 4]];  // §4.1
    return (s) => {
      c.clear();
      c.bars({ x: 10, y: 14, w: 620, rowH: 48, labelW: 150, max: 700, fmt: (v) => `${v} h`, tones: ["bridge"],
        rows: ROWS.filter((r) => r[2] <= s).map(([l, v, st]) => ({ label: l, values: [v], hl: st === s })) });
      if (s >= 2) c.text(620, 180, "636 + 350 ≈ 986 h, 6 languages", { size: 14, mono: true, anchor: "end", weight: 700, tone: s === 2 ? "predict" : "ink" });
      if (s >= 3) {
        const a = c.box({ x: 10, y: 200, w: 290, h: 64, label: "stage 1: 986 h, 5 epochs", sub: "Qwen init · classifier joint", size: 14, tone: "take", hl: s === 3 });
        if (s >= 4) {
          const b = c.box({ x: 340, y: 200, w: 290, h: 64, label: "stage 2: L2-ARCTIC, 3 epochs", sub: "24 speakers · lower LR", size: 14, tone: "take", hl: s === 4 });
          c.connect(a, b, { tone: "take" });
        }
      }
      if (s >= 5) c.box({ x: 10, y: 290, w: 620, h: 50, label: "not reported: batch, learning rates, GPUs, training time", size: 14, tone: "bad", hl: true });
    };
  };

  // =========================================================== DOES IT WORK?
  D["metrics"] = (fig, k) => {
    const c = k.canvas(W, H);
    const O = [110, 320], R = 220;
    const tip = (deg) => [O[0] + R * Math.cos(deg * Math.PI / 180), O[1] - R * Math.sin(deg * Math.PI / 180)];
    return (s) => {
      c.clear();
      const vec = (deg, tone, lab, hl, dx, dy, anchor) => { const [x, y] = tip(deg); c.arrow(O[0], O[1], x, y, { tone, width: hl ? 3 : 2 }); c.label(x + dx, y + dy, lab, { size: 13, tone, weight: 700, anchor }); };
      vec(55, "code", "generated", s === 1, 0, -12, "middle");
      if (s >= 3) vec(30, "paper", "target", s === 3, -20, -14, "middle");
      if (s >= 4) vec(110, "bad", "reference", s === 4, 0, -12, "middle");
      c.dot(O[0], O[1], { r: 4, tone: "muted" });
      const bx = (y, label, sub, tone, st, h = 58) => s >= st && c.box({ x: 340, y, w: 290, h, label, sub, size: 13, tone, hl: s === st });
      bx(12, "GenAID accent embeddings", "from Accent Box", "take", 1);
      bx(80, "retuned on IndicVoices", "~100k clips · 11 languages", "take", 2);
      bx(148, "AccSim = cos(gen, target) ↑", "closer is better", "paper", 3);
      bx(216, "AccLeak = cos(gen, reference) ↓", "farther is better", "bad", 4);
      bx(284, "SpkSim (Resemblyzer) · UTMOS", "voice kept · quality", "code", 5, 62);
    };
  };

  const resultBars = (c, models, vals, key, max, s, hlRow, bad) => {
    const lower = key.includes("↓");
    c.bars({ x: 10, y: 24, w: 620, rowH: 300 / models.length, labelW: 110, max, fmt: (v) => v.toFixed(3), tones: ["bridge"],
      rows: models.map((m, i) => ({ label: m, values: [vals[i]], hl: i === hlRow, dim: bad != null && i !== bad && i !== hlRow })) });
    c.text(620, 16, `${key}  ${lower ? "lower is better" : "higher is better"}`, { size: 13, anchor: "end", weight: 700, tone: "muted" });
  };

  // Table 1: Indic accent conversion
  const T1M = ["IndicF5", "XTTS-v2", "Proposed"];
  const T1 = { "AccLeak ↓": [0.312, 0.284, 0.203], "AccSim ↑": [0.312, 0.284, 0.371], "SpkSim ↑": [0.843, 0.832, 0.842], "UTMOS ↑": [2.817, 3.168, 3.181] };
  const T1MAX = { "AccLeak ↓": 0.4, "AccSim ↑": 0.4, "SpkSim ↑": 1, "UTMOS ↑": 4.5 };

  D["indic"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: Object.keys(T1), value: "AccLeak ↓" });
    k.follow(m, { 1: "AccLeak ↓", 2: "AccSim ↑", 3: "SpkSim ↑", 4: "UTMOS ↑" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 5) {
        c.text(320, 30, "baseline rows, Table 1", { size: 14, anchor: "middle", weight: 700 });
        c.matrix({ x: 220, y: 80, cell: 130, cellH: 60, data: T1M.map((_, i) => [T1["AccLeak ↓"][i], T1["AccSim ↑"][i]]), fmt: (v) => v.toFixed(3),
          tone: (i, j, v) => i < 2 ? "bad" : "muted", rowLabels: T1M, colLabels: ["AccLeak", "AccSim"], rowLabelW: 200 });
        c.text(320, 300, "baselines: leakage = similarity, to 3 decimals", { size: 14, anchor: "middle", weight: 700, tone: "bad" });
        return;
      }
      resultBars(c, T1M, T1[m.value], m.value, T1MAX[m.value], s, 2);
    };
  };

  // Table 2: L2-ARCTIC
  const T2M = ["CVAE-L", "CVAE-NL", "GST", "Proposed"];
  const T2 = { "UTMOS ↑": [2.810, 2.714, 3.044, 4.001], "AccLeak ↓": [0.487, 0.530, 0.544, 0.439], "AccSim ↑": [0.612, 0.491, 0.670, 0.686], "SpkSim ↑": [0.677, 0.673, 0.732, 0.693] };
  const T2MAX = { "UTMOS ↑": 4.5, "AccLeak ↓": 0.7, "AccSim ↑": 0.8, "SpkSim ↑": 0.8 };

  D["arctic"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: Object.keys(T2), value: "UTMOS ↑" });
    k.follow(m, { 1: "UTMOS ↑", 2: "AccLeak ↓", 3: "AccSim ↑", 4: "SpkSim ↑" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const v = T2[m.value];
      const best = m.value.includes("↓") ? v.indexOf(Math.min(...v)) : v.indexOf(Math.max(...v));
      resultBars(c, T2M, v, m.value, T2MAX[m.value], s, best);
      if (best !== 3) c.text(20, 346, `best here: ${T2M[best]}, not Proposed`, { size: 14, weight: 700, tone: "bad" });
    };
  };

  D["dialres"] = (fig, k) => {
    const IX = [0, 0.3, 0.6, 1.0], AS = [0.203, 0.247, 0.336, 0.371];   // Fig. 4
    const sl = k.slider({ label: "intensity", min: 0, max: 3, step: 1, value: 0, fmt: (v) => IX[v].toFixed(1) });
    k.follow(sl, { 1: 0, 2: 3 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = c.plot({ series: s >= 2 ? [{ x: IX, y: AS, tone: "paper", dots: true }] : [], w: 640, h: 350,
        xmin: 0, xmax: 1, ymin: 0.15, ymax: 0.4, xlabel: "accent intensity", ylabel: "accent similarity",
        xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(2) });
      if (s === 1) IX.forEach((x) => c.dot(p.X(x), p.Y(0.15), { r: 7, tone: "predict" }));
      if (s >= 2) {
        const i = sl.value;
        c.dot(p.X(IX[i]), p.Y(AS[i]), { r: 9, tone: "predict" });
        c.label(p.X(IX[i]) + (i === 3 ? -14 : 14), p.Y(AS[i]) + 22, AS[i].toFixed(3), { size: 15, weight: 700, mono: true, tone: "predict", anchor: i === 3 ? "end" : "start" });
      }
      if (s >= 3) {
        c.label(p.X(0.45) + 16, p.Y(0.29) + 18, "+0.089", { size: 14, mono: true, weight: 700, tone: s === 3 ? "code" : "muted" });
        c.label(p.X(0.8), p.Y(0.354) + 26, "+0.035", { size: 14, mono: true, weight: 700, tone: s === 3 ? "bad" : "muted" });
      }
      if (s >= 4) {
        c.line(p.X(0.08), p.Y(0.203), p.X(0.92), p.Y(0.203), { tone: "take", dash: true });
        c.label(p.X(0.5), p.Y(0.203) - 12, "= Table 1 leakage", { size: 13, tone: "take", weight: 700 });
        c.label(p.X(0.55), p.Y(0.385), "1.0 = Table 1 AccSim 0.371", { size: 13, tone: "take", weight: 700 });
      }
    };
  };

  D["mos"] = (fig, k) => {
    const t = k.toggle({ label: "test", options: ["Indic (Fig. 2)", "Foreign (Fig. 3)"], value: "Indic (Fig. 2)" });
    k.follow(t, { 1: "Indic (Fig. 2)", 2: "Indic (Fig. 2)", 3: "Foreign (Fig. 3)" });
    const c = k.canvas(W, H);
    const F2 = [["IndicF5", 47.1], ["XTTS-v2", 50.1], ["Proposed", 70.7]];                        // Fig. 2
    const F3 = [["CVAE-L", 47.1], ["CVAE-NL", 50.1], ["GST", 45.0], ["Proposed", 70.2]];          // Fig. 3
    return (s) => {
      c.clear();
      for (let i = 0; i < 20; i++) c.dot(30 + i * 14, 24, { r: 5, tone: s === 1 ? "predict" : "muted" });
      c.text(320, 29, "20 listeners, aged 23–35", { size: 13, weight: s === 1 ? 700 : 400, tone: s === 1 ? "predict" : "muted" });
      if (s === 1) { c.box({ x: 120, y: 110, w: 400, h: 70, label: "accent-similarity MOS", sub: "scale not stated", tone: "muted" }); return; }
      const rows = t.value.startsWith("Indic") ? F2 : F3;
      const dup = s >= 4 && rows === F3;
      c.bars({ x: 10, y: 54, w: 620, rowH: 240 / rows.length, labelW: 100, max: 80, fmt: (v) => v.toFixed(1), tones: ["bridge"],
        rows: rows.map(([l, v], i) => ({ label: l, values: [v], hl: l === "Proposed" || (dup && i < 2) })) });
      if (dup) c.text(320, 330, "CVAE-L, CVAE-NL = IndicF5, XTTS-v2 values (47.1, 50.1)", { size: 13, anchor: "middle", weight: 700, tone: "bad", maxW: 600, lines: 1 });
    };
  };

  // =========================================================== YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Which part does the work?", "no ablation (§4.4)", "bad"],
      ["Is accent really scrubbed?", "probe accuracy not shown", "bad"],
      ["Numbers that repeat", "Table 1 rows; Figs. 2–3", "predict"],
      ["Can anyone rerun it?", "636 h in-house; no code", "bad"],
      ["Steelman", "small change to any codec TTS", "code"],
    ], s);
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Less Telugu leaking in?", "yes: 0.284 → 0.203", "code"],
      ["Priya still sounds like Priya?", "yes: SpkSim 0.842", "code"],
      ["Smooth accent dial?", "partly: flat past 0.6", "predict"],
      ["Download and run?", "no weights or code", "bad"],
      ["🧠 Best use", "add GRL + embedding to yours", "take"],
    ], s);                                                            // Table 1, Fig. 4
  };

  D["ideas"] = (fig, k) => {
    const c = k.canvas(W, H);
    const I = [["probe frozen slots", 0.15, 0.8], ["ablate the GRL", 0.6, 0.85], ["push λ past 1", 0.2, 0.35], ["listen at 4 λ", 0.75, 0.55]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], w: 640, h: 350, xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: "effort →", ylabel: "what you learn →",
        xFmt: () => "", yFmt: () => "" });
      I.forEach(([l, x, y], i) => {
        if (s < i + 1) return;
        c.dot(p.X(x), p.Y(y), { r: s === i + 1 ? 9 : 6, tone: s === i + 1 ? "predict" : "take" });
        c.label(p.X(x) + 14, p.Y(y) - 12, l, { size: 14, weight: s === i + 1 ? 700 : 400, tone: s === i + 1 ? "predict" : "ink" });
      });
    };
  };
})();
