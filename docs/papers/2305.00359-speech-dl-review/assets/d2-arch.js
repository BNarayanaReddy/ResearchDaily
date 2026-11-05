/* Drawings: "Architectures" (survey §3). Equations are pointed to as Eq. N; FBU = found by us. */
(function () {
  const D = RD.drawings, V = RD.sdr, W = V.W, H = V.H;
  const P = (V.p2 = {});
  const n0 = (v) => Math.round(v).toLocaleString("en-US");
  P.n0 = n0;
  // A code panel at any position: lines of mono text in a muted box; hl = highlighted line indexes.
  P.code = (c, o) => {
    const { x, y, w, lines } = o, lh = o.lh || 22, size = o.size || 12, hl = o.hl || [];
    c.box({ x, y, w, h: lines.length * lh + 12, tone: "muted" });
    lines.forEach((l, i) => {
      if (hl.includes(i)) c.box({ x: x + 4, y: y + 5 + i * lh, w: w - 8, h: lh - 2, tone: "predict", hl: true, r: 4 });
      c.text(x + 10, y + 6 + i * lh + lh / 2 + 4, l, { size, mono: true, inBox: true, maxW: w - 20, lines: 1, tone: hl.includes(i) ? "ink" : "muted" });
    });
  };

  // ---------------------------------------------------------------- rnn
  D["rnn"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const N = 6, x0 = 40, step = 100, w = 72;
      const cells = [];
      for (let i = 0; i < N; i++) {
        const x = x0 + i * step;
        const fr = c.box({ x, y: 270, w, h: 40, label: `frame ${i + 1}`, size: 12, tone: "bridge", hl: s === 1 });
        if (s >= 2) {
          const cell = c.box({ x, y: 165, w, h: 56, label: `h${i + 1}`, sub: s >= 4 ? `wait #${i + 1}` : "state", tone: s >= 4 ? "predict" : "take", hl: s === 2 || s === 4 });
          c.connect(fr, cell, { tone: "muted" });
          if (i) c.connect(cells[i - 1], cell, { tone: s >= 4 ? "predict" : "take" });
          cells.push(cell);
          if (s >= 3) {
            const y = c.box({ x, y: 70, w, h: 40, label: `y${i + 1}`, size: 13, tone: "paper", hl: s === 3 });
            c.connect(cell, y, { tone: "muted" });
          }
        }
      }
      if (s === 1) c.text(320, 200, "a feedforward net sees each frame alone", { size: 14, anchor: "middle", tone: "muted" });
      if (s >= 4) c.text(320, 345, "our line: 293 frames = 293 updates in a row", { size: 14, anchor: "middle", weight: 700, tone: "predict" }); // EX
      if (s >= 5) c.box({ x: 40, y: 8, w: 572, h: 40, label: "fixes: TCNs · transformers · parallel TTS", size: 14, tone: "code", hl: true });
    };
  };

  // ---------------------------------------------------------------- birnn
  D["birnn"] = (fig, k) => {
    const heard = k.slider({ label: "audio heard", min: 0.4, max: 3.4, step: 0.1, value: 3.4, fmt: (v) => `${v.toFixed(1)} s` });
    k.follow(heard, { 1: 3.4, 4: 1.6, 5: 1.6 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const N = 8, x0 = 74, step = 70, w = 54, T = 3.4, colSec = T / N;
      const t = heard.value, full = t >= T - 1e-6;
      const avail = (i) => (i + 1) * colSec <= t + 1e-6;
      c.text(8, 130, "← RNN", { size: 12, tone: "take" });
      c.text(8, 206, "RNN →", { size: 12, tone: "paper" });
      c.text(8, 274, "frames", { size: 12, tone: "muted" });
      const fw = [], bw = [];
      for (let i = 0; i < N; i++) {
        const x = x0 + i * step, ok = avail(i);
        const fr = c.box({ x, y: 256, w, h: 34, label: `${((i + 1) * colSec).toFixed(1)}`, size: 11, mono: true, tone: "bridge", dim: !ok });
        const f = c.box({ x, y: 186, w, h: 40, label: "→", tone: "paper", dim: !ok, hl: s === 1 && ok });
        c.connect(fr, f, { tone: "muted", dim: !ok });
        if (i) c.connect(fw[i - 1], f, { tone: "paper", dim: !ok });
        fw.push(f);
      }
      if (s >= 2) {
        for (let i = N - 1; i >= 0; i--) {
          const x = x0 + i * step;
          const b = c.box({ x, y: 110, w, h: 40, label: full ? "←" : "wait", size: full ? 14 : 11, tone: full ? "take" : "bad", dashed: !full, hl: s === 2 && full });
          if (i < N - 1) c.connect(bw[bw.length - 1], b, { tone: full ? "take" : "bad", dim: !full });
          bw.push(b);
        }
        bw.reverse();
      }
      if (s >= 3) {
        for (let i = 0; i < N; i++) {
          const ok = full && avail(i);
          const y = c.box({ x: x0 + i * step, y: 36, w, h: 36, label: ok ? "y" : "–", size: 13, tone: ok ? "code" : "muted", dim: !ok, hl: s === 3 && ok });
          c.connect(bw[i], y, { tone: "muted", dim: !ok });
        }
        c.text(8, 58, "out", { size: 12, tone: "code" });
      }
      const nx = x0 + Math.min(N, t / colSec) * step - (step - w) / 2;
      c.line(nx, 296, nx, 318, { tone: "predict", width: 2 });
      c.text(nx, 336, full ? "end of line: outputs can start" : `now: ${t.toFixed(1)} s, no output yet`, { size: 13, anchor: nx > 400 ? "end" : "middle", tone: full ? "code" : "bad", weight: 700 });
      if (s >= 5 && !full) {
        const i = Math.max(0, Math.floor(t / colSec) - 1);
        c.box({ x: 474, y: 8, w: 158, h: 26, label: "chunk: 1 frame ahead", size: 12, tone: "predict", hl: true });
        c.label(x0 + i * step + w / 2, 20, "streaming fix", { size: 12, tone: "predict" });
      }
    };
  };

  // ---------------------------------------------------------------- lstm-gru
  D["lstm-gru"] = (fig, k) => {
    const kind = k.toggle({ label: "cell", options: ["LSTM", "GRU"], value: "LSTM" });
    k.follow(kind, { 1: "LSTM", 5: "GRU" });
    const keep = k.slider({ label: "keep per frame", min: 0.5, max: 0.999, step: 0.001, value: 0.9, fmt: (v) => v.toFixed(3) });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const L = kind.value === "LSTM";
      const dimD = s === 1;
      if (L) {
        const a = c.box({ x: 8, y: 30, w: 66, h: 46, label: "c(t−1)", size: 13, mono: true, tone: "take", dim: dimD, hl: s === 2 });
        const b = c.box({ x: 92, y: 30, w: 66, h: 46, label: "× f", size: 14, mono: true, tone: "take", dim: dimD, hl: s === 2 });
        const cc = c.box({ x: 176, y: 30, w: 66, h: 46, label: "+ i·g", size: 14, mono: true, tone: "take", dim: dimD, hl: s === 2 });
        const d = c.box({ x: 260, y: 30, w: 66, h: 46, label: "c(t)", size: 13, mono: true, tone: "take", dim: dimD, hl: s === 2 });
        c.connect(a, b, { dim: dimD }); c.connect(b, cc, { dim: dimD }); c.connect(cc, d, { dim: dimD });
        ["forget f", "input i", "output o"].forEach((g, i) => c.box({ x: 8 + i * 110, y: 130, w: 98, h: 46, label: g, sub: "σ ∈ (0, 1)", size: 13, tone: "predict", dim: dimD, hl: s === 3 }));
        c.box({ x: 8, y: 230, w: 318, h: 46, label: "h(t) = o · tanh(c(t))", mono: true, size: 14, tone: "paper", dim: dimD, hl: s === 4 });
      } else {
        const a = c.box({ x: 8, y: 30, w: 90, h: 46, label: "h(t−1)", size: 13, mono: true, tone: "take", hl: true });
        const b = c.box({ x: 120, y: 30, w: 90, h: 46, label: "mix by z", size: 13, tone: "take", hl: true });
        const d = c.box({ x: 236, y: 30, w: 90, h: 46, label: "h(t)", size: 13, mono: true, tone: "take", hl: true });
        c.connect(a, b); c.connect(b, d);
        ["update z", "reset r"].forEach((g, i) => c.box({ x: 8 + i * 165, y: 130, w: 153, h: 46, label: g, sub: "σ ∈ (0, 1)", size: 13, tone: "predict", hl: true }));
        c.box({ x: 8, y: 230, w: 318, h: 46, label: "2 gates, 1 state, fewer weights", size: 14, tone: "code", hl: true });
      }
      const f = keep.value, xs = [], ys = [];
      for (let t = 0; t <= 100; t += 2) { xs.push(t); ys.push(Math.pow(f, t)); }
      c.plot({ x: 340, y: 10, w: 292, h: 260, series: [{ x: xs, y: ys, tone: "predict" }], xmin: 0, xmax: 100, ymin: 0, ymax: 1,
        xlabel: "frames (10 ms each)", ylabel: "memory left", ml: 50 });
      const left = Math.pow(f, 100);
      c.text(486, 300, `${f.toFixed(3)}¹⁰⁰ = ${left < 0.001 ? left.toExponential(1) : left.toFixed(3)}`, { size: 16, mono: true, anchor: "middle", weight: 700, tone: left < 0.05 ? "bad" : "code" });
      c.text(486, 326, left < 0.05 ? "after 1 s, almost nothing left" : "memory survives 1 s", { size: 13, anchor: "middle", tone: "muted" });
    };
  };

  // ---------------------------------------------------------------- ctc
  D["ctc"] = (fig, k) => {
    const c = k.canvas(W, H);
    const row = (y, label, items, o = {}) => {
      c.text(136, y + 18, label, { size: 12, anchor: "end", tone: o.ltone || "muted", weight: o.hl ? 700 : 400 });
      const ch = c.chips({ x: 148, y, items: items.map((t) => ({ t, tone: t === "_" ? "muted" : (o.tone || "paper"), hl: o.hl, dim: o.dim })), size: 13, maxW: 360 });
      return ch;
    };
    const res = (y, str, tone, hl) => c.box({ x: 520, y, w: 100, h: 26, label: str, size: 13, mono: true, tone, hl });
    return (s) => {
      c.clear();
      if (s >= 7) {
        c.text(8, 24, "a padded batch of 3 clips (frames)", { size: 13, weight: 700 });
        [[10, "yes"], [6, "no"], [8, "pay"]].forEach(([n, w], i) => {
          const items = Array.from({ length: 10 }, (_, j) => ({ t: j < n ? "■" : "pad", tone: j < n ? "bridge" : "muted", dashed: j >= n }));
          c.chips({ x: 8, y: 40 + i * 36, items, size: 12, maxW: 520 });
          c.text(632, 58 + i * 36, `len ${n} · "${w}"`, { size: 12, anchor: "end", mono: true, tone: "muted" });
        });
        P.code(c, { x: 8, y: 166, w: 624, size: 12, hl: [1, 2], lines: [
          "log_probs = model(feats).log_softmax(-1)   # (B, T, C)",
          "log_probs = log_probs.transpose(0, 1)      # (T, B, C) for ctc_loss",
          "loss = F.ctc_loss(log_probs, targets, in_lens, tgt_lens, blank=0)",
          "# in_lens = [10, 6, 8]: padded frames never count",
        ] });
        return;
      }
      const p1 = ["y", "y", "_", "e", "e", "e", "_", "s", "s", "_"];
      row(12, "10 frames", p1.map(() => "▮"), { tone: "bridge", hl: s === 1 });
      if (s === 1) res(12, "\"yes\"", "muted", true);
      if (s >= 2) row(56, "best path", p1, { hl: s === 2 });
      if (s >= 3) row(100, "merge repeats", ["y", "_", "e", "_", "s", "_"], { hl: s === 3, tone: "take" });
      if (s >= 4) { row(144, "drop blanks", ["y", "e", "s"], { hl: s === 4, tone: "code" }); res(144, "yes", "code", s === 4); }
      if (s >= 5) {
        row(196, "path 2", ["y", "_", "_", "e", "e", "_", "s", "s", "s", "_"], { hl: s === 5, tone: "predict" }); res(196, "yes", "code", s === 5);
        row(240, "path 3", ["_", "y", "e", "e", "e", "e", "s", "s", "s", "_"], { hl: s === 5, tone: "predict" }); res(240, "yes", "code", s === 5);
      }
      if (s >= 6) {
        row(290, "\"too\" ok", ["t", "o", "_", "o"], { hl: true, tone: "code" }); res(290, "too", "code", true);
        row(326, "no blank", ["t", "o", "o"], { tone: "bad" }); res(326, "to ✗", "bad", false);
      }
    };
  };

  // ---------------------------------------------------------------- cnn
  D["cnn"] = (fig, k) => {
    const mode = k.toggle({ label: "kernel", options: ["2D", "1D"], value: "2D" });
    k.follow(mode, { 1: "2D", 4: "1D" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const two = mode.value === "2D";
      c.box({ x: 70, y: 30, w: 370, h: 200, tone: "bridge", hl: s === 1 });
      c.text(255, 252, "293 frames (time) →", { size: 13, anchor: "middle", tone: "muted" });
      c.text(62, 135, "80 bins", { size: 12, anchor: "end", tone: "muted" });
      if (s >= 2) {
        if (two) c.box({ x: 210, y: 112, w: 34, h: 34, tone: "predict", hl: true });
        else c.box({ x: 210, y: 32, w: 22, h: 196, tone: "predict", hl: true });
        c.text(547, 180, two ? "3×3: slides in time and freq" : "full height: slides in time only", { size: 13, anchor: "middle", tone: "predict", weight: 700, maxW: 166, lines: 2 });
      }
      if (s >= 3) {
        c.box({ x: 462, y: 40, w: 170, h: 70, label: two ? "23,440" : "293", sub: "values per filter map", mono: true, size: 18, tone: two ? "bad" : "code", hl: s === 3 || s === 4 });
        c.text(547, 134, two ? "80 × 293" : "80× fewer than 2D", { size: 13, anchor: "middle", tone: "muted" }); // EX arithmetic
      }
      if (s >= 5) {
        c.box({ x: 40, y: 290, w: 280, h: 46, label: "wav2vec 2.0: CNN on raw audio", size: 13, tone: "take", hl: true });
        c.box({ x: 340, y: 290, w: 280, h: 46, label: "Tacotron 2: conv layers inside", size: 13, tone: "take", hl: true });
      }
    };
  };

  // ---------------------------------------------------------------- tcn
  D["tcn"] = (fig, k) => {
    const L = k.slider({ label: "layers", min: 1, max: 10, step: 1, value: 3 });
    k.follow(L, { 1: 3, 3: 4, 4: 10 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const dil = s >= 2, n = L.value, shown = Math.min(4, n), N = 16, x0 = 70, dx = 36, yb = 316, dy = 62;
      const X = (i) => x0 + i * dx, Y = (l) => yb - l * dy;
      const d = (l) => (dil ? Math.pow(2, l - 1) : 1);
      // receptive field of the last output, within the drawn layers
      let field = new Set([N - 1]);
      const edges = [];
      for (let l = shown; l >= 1; l--) {
        const next = new Set();
        field.forEach((t) => { [t, t - d(l)].forEach((u) => { if (u >= 0) { next.add(u); edges.push([l, t, u]); } }); });
        field = next;
      }
      edges.forEach(([l, t, u]) => c.line(X(t), Y(l), X(u), Y(l - 1), { tone: "predict", width: 1.6 }));
      for (let l = 0; l <= shown; l++) {
        for (let i = 0; i < N; i++) {
          const on = l === 0 ? field.has(i) : false;
          const top = l === shown && (i === N - 1 || s >= 5);
          c.dot(X(i), Y(l), { r: top ? 6 : 4, tone: top ? "code" : on ? "predict" : "muted" });
        }
        c.text(8, Y(l) + 4, l === 0 ? "input" : `d=${d(l)}`, { size: 12, tone: "muted", mono: true });
      }
      let rf = 1;
      for (let l = 1; l <= n; l++) rf += d(l);
      const ms = rf / 16;
      c.text(8, 20, `${n} layer${n > 1 ? "s" : ""}: sees ${n0(rf)} samples = ${ms < 10 ? ms.toFixed(2) : ms.toFixed(0)} ms at 16 kHz`, { size: 15, weight: 700, tone: "predict", mono: true });
      if (n > shown) c.text(632, 44, `top ${n - shown} layers not drawn`, { size: 12, anchor: "end", tone: "muted" });
      if (s >= 5) c.text(8, 44, "training: every output at once", { size: 13, tone: "code", weight: 700 });
    };
  };

  // ---------------------------------------------------------------- attention
  D["attention"] = (fig, k) => {
    const c = k.canvas(W, H);
    const tok = ["b", "æ", "l", "ə"];
    const X = [[1.0, 0.2], [0.2, 1.0], [0.9, 0.4], [0.3, 0.8]]; // toy vectors, chosen by us
    const dk = 2;
    const S = X.map((q) => X.map((kk) => (q[0] * kk[0] + q[1] * kk[1]) / Math.sqrt(dk)));
    const A = S.map((r) => { const m = Math.max(...r), e = r.map((v) => Math.exp(v - m)), z = e.reduce((a, b) => a + b); return e.map((v) => v / z); });
    const O = A.map((r) => [0, 1].map((j) => r.reduce((a, w, i) => a + w * X[i][j], 0)));
    const Ac = S.map((r, i) => { const e = r.map((v, j) => (j <= i ? Math.exp(v) : 0)), z = e.reduce((a, b) => a + b); return e.map((v) => v / z); });
    return (s) => {
      c.clear();
      const ttl = (x, str, on) => c.text(x, 30, str, { size: 13, weight: 700, tone: on ? "predict" : "muted" });
      if (s < 4) { ttl(44, "vectors x", s === 1); c.matrix({ x: 52, y: 62, data: X, cell: 44, cellH: 34, size: 13, rowLabels: tok, colLabels: ["d1", "d2"], tone: () => (s === 1 ? "bridge" : null) }); }
      else { ttl(44, "output", s === 4); c.matrix({ x: 52, y: 62, data: O, cell: 44, cellH: 34, size: 12, rowLabels: tok, colLabels: ["d1", "d2"], tone: () => "code" }); }
      if (s >= 2) { ttl(184, "scores QKᵀ/√2", s === 2); c.matrix({ x: 184, y: 62, data: S, cell: 46, cellH: 34, size: 12, colLabels: tok, tone: (i, j) => (s === 2 && i === j ? "predict" : null) }); }
      if (s >= 3) { const M = s >= 6 ? Ac : A; ttl(400, s >= 6 ? "causal softmax" : "softmax rows", s === 3 || s === 6); c.matrix({ x: 400, y: 62, data: M, cell: 46, cellH: 34, size: 12, colLabels: tok, tone: (i, j, v) => (s >= 6 && j > i ? "bad" : v === Math.max(...M[i]) ? "take" : null) }); }
      if (s >= 3) c.text(492, 222, "each row sums to 1", { size: 12, anchor: "middle", tone: "muted" });
      if (s === 4) c.text(52, 222, "row ə = weights · values", { size: 12, tone: "muted" });
      if (s === 5) c.box({ x: 52, y: 260, w: 580, h: 60, label: "our line: 293 × 293 = 85,849 scores", sub: "per head, per layer", mono: true, size: 16, tone: "bad", hl: true });
      if (s >= 6) P.code(c, { x: 8, y: 242, w: 624, size: 12, hl: [2], lines: [
        "q, k, v = proj(x)            # each (B, H, T, d)",
        "s = q @ k.transpose(-2, -1) / d ** 0.5   # (B, H, T, T)",
        "s = s.masked_fill(future_mask, float('-inf'))",
        "out = s.softmax(-1) @ v      # (B, H, T, d)",
      ] });
    };
  };

  // ---------------------------------------------------------------- transformer-block
  D["transformer-block"] = (fig, k) => {
    const sh = k.toggle({ label: "CNN shortening", options: ["off", "4×"], value: "off" });
    k.follow(sh, { 1: "off", 4: "4×" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const four = sh.value === "4×";
      const bx = 28, bw = 250;
      const inp = c.box({ x: bx, y: 310, w: bw, h: 38, label: "293 mel frames", size: 13, tone: "bridge" });
      let below = inp;
      if (four) { const pre = c.box({ x: bx, y: 256, w: bw, h: 38, label: "CNN prenet: 74 positions", size: 13, tone: "code", hl: s === 4 }); c.connect(inp, pre); below = pre; }
      const att = c.box({ x: bx, y: 196, w: bw, h: 42, label: "multi-head self-attention", size: 13, tone: "take", hl: s === 1 });
      c.connect(below, att);
      const n1 = c.box({ x: bx, y: 144, w: bw, h: 34, label: "add & LayerNorm", size: 13, tone: "muted", hl: s === 2 });
      c.connect(att, n1);
      const ff = c.box({ x: bx, y: 88, w: bw, h: 38, label: "FFN, per position", size: 13, tone: "paper", hl: s === 3 });
      c.connect(n1, ff);
      const n2 = c.box({ x: bx, y: 36, w: bw, h: 34, label: "add & LayerNorm", size: 13, tone: "muted", hl: s === 2 });
      c.connect(ff, n2);
      if (s >= 2) {
        c.path(`M${bx},${att.bx.b + 6} H${bx - 14} V${n1.bx.cy} H${bx - 2}`, { tone: "muted", arrow: true, hl: s === 2 });
        c.path(`M${bx},${ff.bx.b + 6} H${bx - 14} V${n2.bx.cy} H${bx - 2}`, { tone: "muted", arrow: true, hl: s === 2 });
      }
      if (s === 1) {
        [0, 1, 2, 3].forEach((i) => c.box({ x: 330 + i * 72, y: 196, w: 62, h: 42, label: `head ${i + 1}`, size: 12, tone: "take", hl: true }));
        c.box({ x: 330, y: 120, w: 278, h: 40, label: "concat → Wᴼ", size: 13, mono: true, tone: "take" });
      }
      if (s === 3) c.box({ x: 330, y: 88, w: 278, h: 38, label: "= two 1×1 convolutions", size: 13, tone: "paper", hl: true });
      if (s >= 4) {
        if (s < 6) c.box({ x: 330, y: 196, w: 278, h: 50, label: four ? "74² = 5,476 scores" : "293² = 85,849 scores", sub: "per head, per layer", mono: true, size: 15, tone: four ? "code" : "bad", hl: s === 4 });
      }
      if (s === 5) {
        c.box({ x: 330, y: 36, w: 278, h: 42, label: "beat RNNs in most tasks tested", size: 13, tone: "code", hl: true });
        c.box({ x: 330, y: 100, w: 278, h: 42, label: "TTS training ≈ 4.25× faster", size: 13, tone: "code", hl: true });
      }
      if (s >= 6) P.code(c, { x: 310, y: 30, w: 322, size: 11, lh: 21, hl: [1, 2], lines: [
        "# decode step t, one new frame",
        "K = cat([K, k_t], dim=2)  # (B,H,t,d)",
        "V = cat([V, v_t], dim=2)  # (B,H,t,d)",
        "a = q_t @ K.mT / d**0.5   # (B,H,1,t)",
        "o = a.softmax(-1) @ V     # (B,H,1,d)",
      ] });
    };
  };

  // ---------------------------------------------------------------- conformer
  D["conformer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const bx = 20, bw = 250;
      const items = [["½ FFN", "paper", 2], ["multi-head self-attention", "take", 1], ["convolution module", "predict", 1], ["½ FFN", "paper", 2], ["LayerNorm", "muted", 2]];
      const ys = [300, 236, 172, 108, 44];
      let prev = null;
      items.forEach(([l, tone, st], i) => {
        const b = c.box({ x: bx, y: ys[i], w: bw, h: 44, label: l, size: 13, tone, hl: s === st || (s === 2 && i < 4), dim: s === 1 && st !== 1 });
        if (prev) c.connect(prev, b, { dim: s === 1 });
        prev = b;
      });
      if (s === 1) {
        c.label(300, 258, "global: links far frames", { size: 13, tone: "take" });
        c.label(300, 194, "local: formant shifts", { size: 13, tone: "predict" });
      }
      if (s === 2) c.label(300, 120, "each FFN adds half its output", { size: 13, tone: "paper" });
      if (s >= 3) {
        c.text(340, 40, "LibriSpeech WER (%)", { size: 13, weight: 700 });
        c.text(500, 40, "clean", { size: 12, tone: "paper", weight: 700 });
        c.text(550, 40, "other", { size: 12, tone: "predict", weight: 700 });
        c.bars({ x: 300, y: 60, w: 330, rowH: 56, labelW: 100, max: 7, fmt: (v) => v.toFixed(1), tones: ["paper", "predict"],
          rows: [ // FBU arXiv:2005.08100 abstract
            { label: "no LM", values: [2.1, 4.3], hl: s === 3 },
            { label: "with LM", values: [1.9, 3.9], hl: s === 3 },
            { label: "10M, no LM", values: [2.7, 6.3], hl: s === 4, dim: s < 4 },
          ] });
      }
      if (s >= 5) c.box({ x: 300, y: 260, w: 330, h: 46, label: "Conformer transducer → streaming ASR", size: 13, tone: "code", hl: true });
    };
  };

  // ---------------------------------------------------------------- seq2seq
  D["seq2seq"] = (fig, k) => {
    const task = k.toggle({ label: "task", options: ["TTS", "ASR", "ST"], value: "TTS" });
    k.follow(task, { 1: "TTS", 4: "ASR" });
    const c = k.canvas(W, H);
    const io = { TTS: ["phonemes", "mel frames"], ASR: ["mel frames", "text tokens"], ST: ["source speech", "target-language text"] };
    return (s) => {
      c.clear();
      const [xi, yo] = io[task.value];
      const X = c.box({ x: 8, y: 40, w: 136, h: 52, label: "X", sub: xi, tone: "bridge", hl: s === 4 });
      const ep = c.box({ x: 174, y: 40, w: 136, h: 52, label: "encoder prenet", size: 13, tone: "take", hl: s === 1 });
      const em = c.box({ x: 340, y: 40, w: 136, h: 52, label: "encoder main", sub: "→ Xₑ", tone: "take", hl: s === 1 });
      c.connect(X, ep); c.connect(ep, em);
      if (s >= 2) {
        const yp = c.box({ x: 8, y: 196, w: 136, h: 52, label: "Y[1 : t−1]", sub: s >= 6 ? "train ≠ run" : "prefix", size: 13, mono: true, tone: s >= 6 ? "predict" : "paper", hl: s === 2 || s === 6 });
        const dp = c.box({ x: 174, y: 196, w: 136, h: 52, label: "decoder prenet", size: 13, tone: "take", hl: s === 2 });
        const dm = c.box({ x: 340, y: 196, w: 136, h: 52, label: "decoder main", sub: "next step", tone: "take", hl: s === 2 });
        c.connect(yp, dp); c.connect(dp, dm);
        c.connect(em, dm, { label: s >= 5 ? "attention" : "Xₑ", tone: s === 5 ? "predict" : "muted" });
        if (s >= 3) {
          const pn = c.box({ x: 506, y: 196, w: 126, h: 52, label: "postnet", tone: "code", hl: s === 3 });
          c.connect(dm, pn);
          const Y = c.box({ x: 506, y: 296, w: 126, h: 50, label: "Y", sub: yo, tone: "bridge", hl: s === 4 });
          c.connect(pn, Y);
          c.path(`M${Y.bx.l - 4},${Y.bx.cy} H${yp.bx.cx} V${yp.bx.b + 6}`, { tone: s === 6 ? "bad" : "muted", arrow: true, dash: true });
          c.label(260, 306, "fed back as the next prefix", { size: 12, tone: s === 6 ? "bad" : "muted" });
        }
      }
      if (s >= 5) {
        const ct = c.box({ x: 506, y: 40, w: 126, h: 52, label: "CTC head", sub: "monotonic", size: 13, tone: "predict", hl: s === 5 });
        c.connect(em, ct, { tone: "predict" });
      }
    };
  };

  // ---------------------------------------------------------------- side-branches
  D["side-branches"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["RL for ASR", "action = phoneme · reward = edit distance", "paper"], // §3.6.2
      ["RL for TTS", "action = audio · reward = mel similarity", "paper"], // §3.6.2
      ["GNN on speech", "frames = nodes · edges = neighbours", "take"], // §3.7.1
      ["GNN uses", "diarization · verification · separation", "take"], // §3.7.2
      ["For a TTS role", "breadth, not core machinery", "predict"], // our take
    ];
    return (s) => V.board(c, rows, s, { split: 220 });
  };

  // ---------------------------------------------------------------- diffusion-forward
  const T = 1000;
  const beta = (i) => 1e-4 + (0.02 - 1e-4) * (i - 1) / (T - 1); // FBU DDPM arXiv:2006.11239 §4
  const abar = [1];
  for (let i = 1; i <= T; i++) abar.push(abar[i - 1] * (1 - beta(i)));
  P.abar = abar;
  const NP = 160;
  const x0 = Array.from({ length: NP }, (_, i) => { const t = i / NP; return 0.55 * Math.sin(2 * Math.PI * 6 * t) + 0.3 * Math.sin(2 * Math.PI * 12 * t + 1) + 0.12 * Math.sin(2 * Math.PI * 24 * t); });
  const rr = V.rng(7), eps = Array.from({ length: NP }, () => V.gauss(rr));

  D["diffusion-forward"] = (fig, k) => {
    const t = k.slider({ label: "step t", min: 0, max: 1000, step: 10, value: 0 });
    k.follow(t, { 1: 0, 2: 50, 3: 300, 4: 1000 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const tt = t.value, a = abar[tt], sa = Math.sqrt(a), sn = Math.sqrt(1 - a);
      const X = (i) => 20 + i * (600 / (NP - 1)), Y = (v) => 130 - v * 55;
      c.line(20, 130, 620, 130, { tone: "muted" });
      const d = x0.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(sa * v + sn * eps[i]).toFixed(1)}`).join(" ");
      c.path(d, { tone: tt === 0 ? "bridge" : tt >= 1000 ? "bad" : "predict", width: 1.8 });
      c.text(20, 22, tt === 0 ? "x₀: clean (toy vowel)" : `x_${tt}`, { size: 14, weight: 700, tone: "muted", mono: true });
      if (s >= 6) {
        P.code(c, { x: 8, y: 218, w: 624, size: 12, hl: [2, 3], lines: [
          "t = torch.randint(1, T + 1, (B,))      # one step per clip",
          "eps = torch.randn_like(x0)",
          "xt = ab[t].sqrt() * x0 + (1 - ab[t]).sqrt() * eps",
          "loss = F.mse_loss(model(xt, t), eps)   # ε-prediction",
        ] });
        return;
      }
      const names = ["x₀", "x₁", "…", `x_${tt}`, "x_T"];
      const bs = names.map((nm, i) => c.box({ x: 20 + i * 124, y: 252, w: 96, h: 40, label: nm, mono: true, size: 14, tone: i === 0 ? "bridge" : i === 4 ? "bad" : "predict", hl: (s === 2 && i === 1) || (s === 5) }));
      for (let i = 1; i < 5; i++) c.connect(bs[i - 1], bs[i], { tone: "muted", label: i === 1 ? "+noise" : undefined });
      c.text(20, 330, `ᾱ = ${a < 0.001 ? a.toExponential(1) : a.toFixed(3)}   signal √ᾱ = ${sa.toFixed(3)}   noise √(1−ᾱ) = ${sn.toFixed(3)}`, { size: 14, mono: true, weight: 700, tone: s === 3 || s === 4 ? "predict" : "ink" });
      if (s === 5) c.label(320, 230, "every x_t has the full data size", { size: 13, tone: "code" });
    };
  };

  // ---------------------------------------------------------------- diffusion-reverse
  D["diffusion-reverse"] = (fig, k) => {
    const st = k.slider({ label: "sampling steps", min: 1, max: 1000, step: 1, value: 1000 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const names = [["x_T", "noise", "bad"], ["x_t", "", "predict"], ["x_t−1", "", "predict"], ["…", "", "muted"], ["x₀", "speech", "bridge"]];
      const bs = names.map(([l, sub, tone], i) => c.box({ x: 8 + i * 128, y: 30, w: 104, h: 50, label: l, sub: sub || undefined, mono: true, size: 14, tone, hl: s === 1 }));
      for (let i = 1; i < 5; i++) c.connect(bs[i - 1], bs[i], { tone: "muted" });
      if (s >= 2) {
        const net = c.box({ x: 136, y: 128, w: 232, h: 46, label: "network predicts the noise", size: 13, tone: "take", hl: s === 2 });
        c.connect(bs[1], net, { tone: "take" });
        c.connect(net, bs[2], { tone: "take", label: "subtract" });
      }
      if (s >= 7) {
        P.code(c, { x: 8, y: 198, w: 624, size: 12, hl: [2, 3, 4], lines: [
          "x = torch.randn(shape)                  # x_T",
          "for t in range(T, 0, -1):",
          "    eps = model(x, t)                   # one network pass",
          "    x = (x - b[t] / (1 - ab[t]).sqrt() * eps) / a[t].sqrt()",
          "    if t > 1: x = x + b[t].sqrt() * torch.randn_like(x)",
          "return x                                # x_0",
        ] });
        return;
      }
      if (s >= 3) c.box({ x: 8, y: 210, w: 300, h: 52, label: `${n0(st.value)} network passes`, sub: "one per step, whole clip at once", mono: true, size: 16, tone: "predict", hl: s === 3 });
      if (s >= 6) c.box({ x: 332, y: 210, w: 300, h: 52, label: `WaveNet: ${n0(V.EX.samples)} steps`, sub: "one per sample, our 3.4 s line", mono: true, size: 13, tone: "bad", hl: true }); // EX 22.05 kHz
      if (s >= 4) c.box({ x: 8, y: 290, w: 300, h: 52, label: "FastDiff: 58× faster than real time", sub: "on a V100 GPU (§3.8.1)", size: 13, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 332, y: 290, w: 300, h: 52, label: "DiffWave ≈ WaveNet quality", sub: "and much faster (§3.8.1)", size: 13, tone: "code", hl: s === 5 });
    };
  };
})();
