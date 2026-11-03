(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ------------------------------------------------------------- helpers
  const f2 = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(2);
  const f1 = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(1);
  const comma = (v) => Math.round(v).toLocaleString("en-US");
  const big = (v) => { const f = (x, u) => (x >= 100 ? x.toFixed(0) : x.toFixed(1).replace(/\.0$/, "")) + u; return v >= 1e12 ? f(v / 1e12, "T") : v >= 1e9 ? f(v / 1e9, "B") : v >= 1e6 ? f(v / 1e6, "M") : v >= 1e3 ? f(v / 1e3, "K") : String(Math.round(v)); };
  const sm = (z) => { const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };
  const lse = (z) => { const m = Math.max(...z); return m + Math.log(z.reduce((a, v) => a + Math.exp(v - m), 0)); };
  const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
  const pol = (deg, r = 1) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rect = (c, k, x, y, w, h, tone, soft = "", extra = {}) => c.add(k.h("rect", { x, y, width: Math.max(0.5, w), height: Math.max(0.5, h), rx: extra.rx ?? 2, class: `f-${tone}${soft ? " " + soft : ""}${extra.dim ? " rdx-dim" : ""}`, "stroke-dasharray": extra.dash ? "3 2" : undefined }));
  const occupy = (c, x, y, w, h) => c.occupy({ x, y, w, h, kind: "box" });

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
  // horizontal grouped bars with our own scale. rows: [{label, values, hl, dim}]
  const hbars = (c, k, o) => {
    const x0 = o.x ?? 10, y0 = o.y ?? 30, lw = o.labelW ?? 150, bw = o.barW ?? 380, rh = o.rowH ?? 40, max = o.max, tones = o.tones, fmt = o.fmt || ((v) => String(v));
    const n = o.rows[0].values.length, bh = (rh - 10) / n;
    const X = (v) => x0 + lw + (Math.min(v, max) / max) * bw;
    o.rows.forEach((r, i) => {
      const y = y0 + i * rh;
      c.text(x0 + lw - 8, y + rh / 2 + 2, r.label, { anchor: "end", size: 12, weight: r.hl ? 700 : 400, dim: r.dim, maxW: lw - 12, lines: 1, inBox: true });
      r.values.forEach((v, j) => {
        if (v == null) return;
        const yy = y + 4 + j * bh;
        c.add(k.h("rect", { x: x0 + lw, y: yy, width: Math.max(1.5, X(v) - x0 - lw), height: Math.max(2, bh - 2), rx: 2, class: `f-${tones[j]}${r.dim ? " rdx-dim" : ""}${r.hl ? " rdx-hl" : ""}` }));
        c.text(X(v) + 5, yy + bh / 2 + 3, fmt(v, j), { size: Math.min(11, bh + 2), mono: true, tone: tones[j], dim: r.dim, inBox: true });
      });
    });
    occupy(c, x0, y0, lw + bw + 60, o.rows.length * rh);
    return X;
  };
  const legend = (c, x, y, items, size = 12) => {
    let xx = x;
    items.forEach(([t, tone]) => {
      c.dot(xx + 5, y - 4, { r: 5, tone, noOcc: true });
      const el = c.text(xx + 14, y, t, { size, inBox: true });
      xx += 14 + el._r.w + 16;
    });
    occupy(c, x, y - 12, xx - x, 16);
  };
  // a 2-D vector panel: origin (ox, oy), sc px per unit
  const axes2 = (c, ox, oy, r) => { c.line(ox - r, oy, ox + r, oy, { tone: "faint", width: 1 }); c.line(ox, oy - r, ox, oy + r, { tone: "faint", width: 1 }); };
  const vec = (c, ox, oy, sc, v, tone, label, o = {}) => {
    const x2 = ox + v[0] * sc, y2 = oy - v[1] * sc;
    c.arrow(ox, oy, x2, y2, { tone, width: o.width || 2.4, dim: o.dim, snap: false });
    if (label) c.label(x2 + (v[0] >= 0 ? 10 : -10), y2 + (v[1] >= 0 ? -6 : 14), label, { size: 13, tone, weight: 700, anchor: v[0] >= 0 ? "start" : "end", dim: o.dim });
  };


  // ======================================================= WEIGHTS TOOLBOX
  D["weights-numbers"] = (fig, k) => {
    const sl = k.slider({ label: "hidden width", min: 8, max: 64, step: 4, value: 32 });
    k.follow(sl, { 1: 32, 3: 32 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const h = sl.value, m1 = 500 * h + h, m2 = h * h + h, m3 = 5 * h + 5, tot = m1 + m2 + m3;
      const bx = [["10×10×5 grid", "500 inputs", "paper"], [`${h} units`, "tanh", "take"], [`${h} units`, "tanh", "take"], ["5 actions", "logits", "predict"]];
      const B = bx.map(([l, sub, tone], i) => c.box({ x: 14 + i * 160, y: 30, w: 132, h: 60, label: l, sub, tone, size: 14, hl: (s === 1 && i === 0) }));
      if (s >= 2) {
        [[m1, `500×${h} + ${h}`], [m2, `${h}×${h} + ${h}`], [m3, `${h}×5 + 5`]].forEach(([n, f], i) => {
          if (s === 2 && i > 0) return;
          c.connect(B[i], B[i + 1], { tone: "muted" });
          c.box({ x: 94 + i * 160, y: 120, w: 140, h: 54, label: comma(n), sub: f, mono: true, tone: "take", hl: s === 2 || s === 3, size: 15 });
        });
      }
      if (s >= 3) c.text(320, 222, `total = ${comma(tot)} numbers`, { size: 22, anchor: "middle", mono: true, weight: 700, tone: h === 32 ? "code" : "ink" });
      if (s >= 3 && h === 32) c.text(320, 246, "= Experiment 1's 17,253", { size: 13, anchor: "middle", tone: "code" });
      if (s >= 4) c.box({ x: 20, y: 270, w: 600, h: 70, label: "0.012 −0.331 0.087 1.204 −0.045 0.660 … (17,253 of them)", sub: "what Astra received: the weights as text", mono: true, size: 13, tone: "muted", hl: true });
    };
  };

  const CH = ["agent", "moving", "targets", "obstacles", "prev. frame"];
  D["read-layer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = rng(9);
    const Wt = CH.map((_, ch) => Array.from({ length: 100 }, (_, i) => { const row = Math.floor(i / 10), col = i % 10; if (ch === 0 && row === 9) return (4.5 - col) / 4.5; return (r() - 0.5) * 0.25; }));
    return (s) => {
      c.clear();
      CH.forEach((name, ch) => {
        const x0 = 14 + ch * 124, y0 = 70, cs = 11;
        const focus = s >= 2 && ch === 0;
        c.text(x0 + 55, 56, name, { size: 12, anchor: "middle", weight: focus ? 700 : 400, tone: focus ? "predict" : "muted" });
        Wt[ch].forEach((v, i) => {
          const row = Math.floor(i / 10), col = i % 10, a = Math.min(1, Math.abs(v));
          const tone = s >= 3 ? (v >= 0 ? "code" : "bad") : "take";
          c.add(k.h("rect", { x: x0 + col * cs, y: y0 + row * cs, width: cs - 1, height: cs - 1, class: `f-${tone}${s >= 2 && ch !== 0 ? " rdx-dim" : ""}`, "fill-opacity": (0.12 + 0.88 * a).toFixed(2) }));
        });
        occupy(c, x0, y0, 110, 110);
      });
      c.text(14, 24, "one hidden unit's 500 first-layer weights, as five 10×10 pictures (made up)", { size: 13, tone: "muted", maxW: 610, lines: 1 });
      if (s >= 2) c.text(14, 216, "strong weights along the agent channel's bottom row: it watches the paddle", { size: 13, weight: 700, tone: "predict", maxW: 610, lines: 1 });
      if (s >= 3) c.text(14, 244, "green = positive (left side), red = negative (right side): fires when the agent is left", { size: 13, tone: "ink", maxW: 610, lines: 1 });
      if (s >= 4) c.box({ x: 14, y: 270, w: 606, h: 66, label: "Astra on Breakout: agent weights lie along the bottom row, a paddle", sub: "§Exp. 1", tone: "code", hl: true, size: 14 });
    };
  };

  D["hand-wire"] = (fig, k) => {
    const sl = k.slider({ label: "ball column", min: 0, max: 9, step: 1, value: 2 });
    k.follow(sl, { 1: 2, 3: 7 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ball = sl.value, pad = 5, cs = 28, x0 = 20;
      for (let i = 0; i < 10; i++) {
        rect(c, k, x0 + i * cs, 60, cs - 2, cs - 2, i === ball ? "predict" : "muted", i === ball ? "" : "softer");
        rect(c, k, x0 + i * cs, 120, cs - 2, cs - 2, i === pad ? "paper" : "muted", i === pad ? "" : "softer");
      }
      occupy(c, x0, 60, 280, 90);
      c.text(x0, 50, "ball column", { size: 12, tone: "predict" }); c.text(x0, 168, "paddle column", { size: 12, tone: "paper" });
      if (s === 1) c.text(330, 100, "rule: ball left of paddle → move left", { size: 14, weight: 700, maxW: 290, lines: 2 });
      const u = Math.tanh(0.8 * (ball - pad));
      if (s >= 2) c.box({ x: 330, y: 50, w: 290, h: 56, label: `unit = ${ball} − ${pad} = ${ball - pad}`, sub: "weight +1 on ball, −1 on paddle", mono: true, tone: "take", hl: s === 2, size: 14 });
      if (s >= 3) c.box({ x: 330, y: 120, w: 290, h: 48, label: `tanh(0.8 × ${ball - pad}) = ${f2(u)}`, mono: true, tone: "take", hl: s === 3, size: 14 });
      if (s >= 4) {
        const P = sm([-3 * u, 3 * u]);
        hbars(c, k, { x: 20, y: 200, labelW: 120, barW: 380, rowH: 44, max: 1, tones: ["code"], fmt: (v) => v.toFixed(2),
          rows: [{ label: "P(left)", values: [P[0]], hl: P[0] > 0.5 }, { label: "P(right)", values: [P[1]], hl: P[1] > 0.5 }] });
        c.text(20, 310, "left logit = −3·unit, right logit = +3·unit: written, not trained", { size: 13, tone: "code", weight: 700, maxW: 600, lines: 1 });
      }
    };
  };

  D["ppo"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 14, y: 30, w: 120, h: 50, label: "play", tone: "paper", hl: s === 1 });
      const b = c.box({ x: 14, y: 130, w: 120, h: 50, label: "reward", tone: "code", hl: s === 1 });
      const d = c.box({ x: 14, y: 230, w: 120, h: 50, label: s >= 2 ? "small PPO step" : "adjust", tone: "take", hl: s === 2 });
      c.connect(a, b); c.connect(b, d); c.arrow(136, 255, 160, 255, { tone: "muted", snap: false }); c.line(160, 255, 160, 55, { tone: "muted" }); c.arrow(160, 55, 136, 55, { tone: "muted", snap: false });
      occupy(c, 155, 50, 10, 210);
      if (s >= 3) {
        const xs = []; for (let e = 6; e <= 9.001; e += 0.1) xs.push(10 ** e);
        const p = c.plot({ x: 190, y: 0, w: 450, h: 240, xlog: true, xmin: 1e6, xmax: 1e9, ymin: 0, ymax: 25, series: [{ x: xs, y: xs.map((x) => 22 / (1 + Math.exp(-(Math.log10(x) - 7.3) * 2.2))), tone: "paper" }],
          xlabel: "environment steps (illustrative curve)", ylabel: "return", xFmt: big, yFmt: (v) => v.toFixed(0) });
        c.label(p.X(1e9) - 4, p.Y(22) - 12, "1 billion steps", { size: 12, tone: "paper", weight: 700, anchor: "end" });
      }
      if (s >= 4) hbars(c, k, { x: 190, y: 256, labelW: 140, barW: 260, rowH: 32, max: 25, tones: ["paper"], fmt: (v) => v.toFixed(2),
        rows: [["Breakout seed 0", 21.71], ["seed 1", 15.98], ["seed 2", 15.83]].map(([l, v], i) => ({ label: l, values: [v], hl: i === 0 })) });
    };
  };

  D["local-min"] = (fig, k) => {
    const c = k.canvas(W, H);
    const f = (x) => 0.22 * Math.exp(-((x - 0.0) ** 2) / 0.02) + 0.03 + 0.95 / (1 + Math.exp(-(x - 0.75) * 18));
    return (s) => {
      c.clear();
      const xs = []; for (let x = 0; x <= 1.001; x += 0.01) xs.push(x);
      const p = c.plot({ x: 0, y: 0, w: 640, h: 320, xmin: 0, xmax: 1, ymin: 0, ymax: 1.1, series: s >= 2 ? [{ x: xs, y: xs.map(f), tone: "paper", width: 3 }] : [],
        xlabel: "how far the car reverses first", ylabel: "success rate", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(1) });
      c.dot(p.X(0.02), p.Y(f(0.02)), { r: 8, tone: "bad" });
      if (s === 1) { c.arrow(p.X(0.06), p.Y(0.15), p.X(0.16), p.Y(0.1), { tone: "muted", snap: false }); c.label(p.X(0.2), p.Y(0.35), "each step: a little better nearby?", { size: 13, anchor: "start" }); }
      if (s >= 3) c.label(p.X(0.05), p.Y(0.45), "stuck: drive straight at the ramp", { size: 13, tone: "bad", weight: 700, anchor: "start" });
      if (s >= 4) { c.path(`M${p.X(0.04)},${p.Y(0.3)} Q${p.X(0.45)},${p.Y(1.3)} ${p.X(0.9)},${p.Y(1.0)}`, { tone: "code", width: 2.4, dash: true, arrow: true }); c.label(p.X(0.85), p.Y(0.75), "plan: back up, then go", { size: 13, tone: "code", weight: 700, anchor: "end" }); }
      c.text(20, 350, "illustrative landscape", { size: 11, tone: "muted" });
    };
  };

  D["copy-head"] = (fig, k) => {
    const c = k.canvas(W, H);
    const S = ["t", "o", "t", "a", "l", "␣", "=", "␣", "0", ";", "␣", "t", "o", "t", "?"];
    return (s) => {
      c.clear();
      const ch = c.chips({ x: 20, y: 160, items: S.map((t, i) => ({ t, tone: i === 13 ? "predict" : i === 14 ? "code" : (s >= 3 && i <= 3) ? "paper" : "muted", hl: (s >= 3 && (i === 2 || i === 3)) || i === 13 })), size: 18, gap: 8, maxW: 610 });
      const cx = (i) => ch[i].x + ch[i].w / 2, top = 156;
      if (s >= 2) for (let i = 1; i < 14; i++) c.path(`M${cx(i)},${top} Q${(cx(i) + cx(i - 1)) / 2},${top - 26} ${cx(i - 1)},${top}`, { tone: "take", width: 1.2, arrow: true, dim: s >= 3 && i !== 3 });
      if (s === 2) c.text(20, 100, "head A (layer 1): every letter notes the letter before it", { size: 14, tone: "take", weight: 700, maxW: 600, lines: 1 });
      if (s >= 3) {
        const bot = 160 + ch[0].h + 4;
        c.path(`M${cx(13)},${bot} Q${(cx(13) + cx(3)) / 2},${bot + 90} ${cx(3)},${bot}`, { tone: "predict", width: 2.4, arrow: true });
        c.text(20, 100, "head B: “who had a ‘t’ before them?” → position 3, so copy “a”", { size: 14, tone: "predict", weight: 700, maxW: 600, lines: 1 });
      }
      if (s >= 4) c.box({ x: 120, y: 290, w: 400, h: 54, label: "A + B together = an induction (copying) head", sub: "tot → total", tone: "code", hl: true, size: 14 });
    };
  };

  D["direction"] = (fig, k) => {
    const sl = k.slider({ label: "layer output angle", min: 0, max: 355, step: 5, value: 60, fmt: (v) => `${v}°` });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ox = 170, oy = 190, sc = 60;
      axes2(c, ox, oy, 150);
      const o = pol(sl.value, 2), u = pol(20, 1), du = dot2(u, o), o2 = [o[0] - u[0] * du, o[1] - u[1] * du];
      vec(c, ox, oy, sc, o, "paper", "output o", { dim: s >= 3 });
      if (s >= 2) { c.line(ox - u[0] * 140, oy + u[1] * 140, ox + u[0] * 140, oy - u[1] * 140, { tone: "bad", dash: true, width: 1.6 }); vec(c, ox, oy, sc * 1.5, u, "bad", "loop direction u"); }
      if (s >= 3) { vec(c, ox, oy, sc, o2, "code", "o − u(uᵀo)", { width: 3 }); c.line(ox + o[0] * sc, oy - o[1] * sc, ox + o2[0] * sc, oy - o2[1] * sc, { tone: "muted", dash: true }); }
      let y = 70;
      c.text(360, y, `uᵀo = ${f2(du)}  (loop push)`, { size: 14, mono: true, tone: "bad" }); y += 30;
      if (s >= 3) { c.text(360, y, `after: uᵀo' = ${f2(dot2(u, o2))}`, { size: 14, mono: true, weight: 700, tone: "code" }); y += 30; c.text(360, y, "turn the slider: always 0", { size: 13, tone: "muted" }); }
      if (s >= 4) c.box({ x: 350, y: 220, w: 270, h: 76, label: "W' = W − u(uᵀW)", sub: "baked into the weights once", mono: true, tone: "code", hl: true, size: 16 });
    };
  };

  D["loops"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const good = ["2x", "+", "3", "=", "11", "→", "2x", "=", "8", "→", "x", "=", "4", "✓"];
      const bad = ["Wait,", "let", "me", "check:", "x", "=", "4.", "Wait,", "let", "me", "check:", "x", "=", "4.", "Wait,", "…"];
      c.text(20, 26, "thinking trace, healthy", { size: 12, tone: "muted" });
      c.chips({ x: 20, y: 34, items: good.map((t) => ({ t, tone: "code" })), size: 13, gap: 5, maxW: 600 });
      if (s >= 2) { c.text(20, 104, "thinking trace, looping", { size: 12, tone: "muted" }); c.chips({ x: 20, y: 112, items: bad.map((t, i) => ({ t, tone: i >= 7 ? "bad" : "muted", hl: s === 2 && i >= 7 })), size: 13, gap: 5, maxW: 600 }); }
      if (s >= 3) c.text(20, 210, "… repeats until 32,768 tokens: no answer, scored wrong", { size: 14, weight: 700, tone: "bad", maxW: 600, lines: 1 });
      if (s >= 4) {
        rect(c, k, 20, 250, 600 * 0.93, 40, "bad"); rect(c, k, 20 + 600 * 0.93, 250, 600 * 0.07, 40, "code");
        occupy(c, 20, 250, 600, 40);
        c.text(20, 316, "93% of base Qwen3.5-0.8B's MATH-500 answers hit the limit (§Exp. 8)", { size: 13, weight: 700, tone: "bad", maxW: 600, lines: 1 });
      }
    };
  };

  D["passes"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (n) => 40 + (Math.log10(n + 1) / 9.2) * 570;
      c.line(30, 200, 620, 200, { tone: "muted", width: 1.2 });
      [0, 10, 1e3, 1e5, 1e7, 1e9].forEach((n) => { c.line(X(n), 196, X(n), 204, { tone: "muted" }); c.text(X(n), 222, n === 0 ? "0" : big(n), { size: 11, anchor: "middle", tone: "muted", inBox: true }); });
      c.text(325, 250, "times the network is run (log scale)", { size: 12, anchor: "middle", tone: "muted" });
      occupy(c, 30, 196, 590, 60);
      if (s === 1) c.box({ x: 200, y: 60, w: 240, h: 60, label: "1 pass = run the net once", sub: "e.g. 512 problems", tone: "paper", hl: true });
      if (s >= 2) { c.box({ x: 20, y: 110, w: 130, h: 60, label: "0 passes", sub: "Exp. 1, 2, 4, 5", tone: "take", hl: s === 2 }); c.arrow(85, 172, X(0), 196, { tone: "take" }); }
      if (s >= 3) { c.box({ x: 120, y: 30, w: 170, h: 60, label: "10 / 25 / 50", sub: "Exp. 6, 8", tone: "predict", hl: s === 3 }); c.arrow(205, 92, X(25), 196, { tone: "predict" }); }
      if (s >= 4) { c.box({ x: 440, y: 60, w: 180, h: 60, label: "PPO: 100M–1B steps", sub: "with gradients", tone: "bad", hl: true }); c.arrow(560, 122, X(5e8), 196, { tone: "bad" }); c.text(20, 300, "Astra: passes are evidence only; gradients are forbidden", { size: 14, weight: 700, tone: "code", maxW: 600, lines: 1 }); }
    };
  };

  // ======================================================= THE IDEA
  D["wsp"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(20, 26, "today", { size: 13, weight: 700, tone: "muted" });
      const a = c.box({ x: 20, y: 36, w: 170, h: 56, label: "data + loss", tone: "paper", hl: s === 1 });
      const b = c.box({ x: 235, y: 36, w: 170, h: 56, label: "Adam / PPO", sub: "gradient steps", tone: "muted", hl: s === 1 });
      const w1 = c.box({ x: 450, y: 36, w: 170, h: 56, label: "weights", tone: "take" });
      c.connect(a, b); c.connect(b, w1);
      if (s >= 2) {
        c.text(20, 150, "weight-space programming", { size: 13, weight: 700, tone: "code" });
        const g = c.box({ x: 20, y: 160, w: 170, h: 56, label: "English goal", sub: "“make it better at math”", tone: "code", hl: s === 2 });
        const l = c.box({ x: 235, y: 160, w: 170, h: 56, label: s >= 5 ? "GPT-6 Astra" : "an LLM", sub: s >= 5 ? "via Codex CLI" : "reasons", tone: "predict", hl: s === 2 || s === 5 });
        const w2 = c.box({ x: 450, y: 160, w: 170, h: 56, label: "weights", tone: "take" });
        c.connect(g, l); c.connect(l, w2);
        c.arrow(535, 158, 535, 94, { tone: "predict", both: true, label: "reads & writes", dx: 52 });
      }
      if (s >= 3) c.box({ x: 20, y: 250, w: 290, h: 50, label: "✗ no gradients, no training loop", tone: "bad", hl: s === 3, size: 14 });
      if (s >= 4) c.box({ x: 330, y: 250, w: 290, h: 50, label: "often ✗ no test runs either", tone: "bad", hl: s === 4, size: 14 });
    };
  };

  D["harness"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = c.box({ x: 20, y: 30, w: 180, h: 60, label: "prompt", sub: "task + weights as text", tone: "paper", hl: s === 1 });
      const cx = c.box({ x: 230, y: 30, w: 180, h: 60, label: "codex exec", sub: "one turn", tone: "predict", hl: s === 1 });
      const r = c.box({ x: 440, y: 30, w: 180, h: 60, label: "reply", sub: "answer or edits", tone: "take", hl: s === 1 });
      c.connect(p, cx); c.connect(cx, r);
      if (s >= 2) c.box({ x: 20, y: 120, w: 290, h: 56, label: "✗ shell ✗ web ✗ files ✗ sub-agents", sub: "Codex's own tools switched off", tone: "bad", hl: s === 2, size: 14 });
      if (s >= 3) c.box({ x: 330, y: 120, w: 290, h: 56, label: "1,125 turns audited", sub: "all tool-free", tone: "code", hl: s === 3, size: 15 });
      if (s >= 4) { const sb = c.box({ x: 20, y: 206, w: 290, h: 56, label: "authors' sandbox runs its Python", sub: "Exp. 3, 6, 7, 8 only", tone: "take", hl: s === 4, size: 13 }); c.arrow(420, 92, 200, 204, { tone: "take", dash: true }); }
      if (s >= 5) hbars(c, k, { x: 330, y: 200, labelW: 120, barW: 120, rowH: 30, max: 3, tones: ["predict"], fmt: (v, j) => ["", "high", "xhigh", "max"][v],
        rows: [["Exp. 1, 2, 4", 1], ["Exp. 3, 5, 6, 7", 2], ["Exp. 8", 3]].map(([l, v]) => ({ label: l, values: [v], hl: true })) });
      if (s >= 5) c.text(330, 304, "reasoning effort per experiment", { size: 12, tone: "muted" });
    };
  };

  D["map"] = (fig, k) => {
    const c = k.canvas(W, H);
    const X = (n) => 110 + ((Math.log10(n) - 4) / 5.1) * 480;
    const E = [["Exp 1", 17253, 0, 0], ["Exp 2", 23824, 0, 1], ["Exp 3", 7.16e6, 0, 0], ["Exp 7", 2.7e8, 0, 0], ["Exp 4", 171664, 1, 0], ["Exp 8", 8e8, 1, 0], ["Exp 5", 20486, 2, 0], ["Exp 6", 1480274, 2, 0]];
    return (s) => {
      c.clear();
      ["read", "fix", "write"].forEach((v, i) => { c.text(20, 70 + i * 90, v, { size: 15, weight: 700, tone: ["paper", "bad", "code"][i] }); c.line(100, 64 + i * 90, 620, 64 + i * 90, { tone: "faint", width: 1 }); });
      E.forEach(([n, w, row, bump]) => {
        const lit = s === 4 || s === row + 1;
        if (s < row + 1 && s < 4) return;
        const x = X(w) - 30 + bump * 62, y = 42 + row * 90;
        c.box({ x, y, w: 58, h: 44, label: n, sub: big(w), size: 12, tone: ["paper", "bad", "code"][row], hl: lit, dim: !lit });
      });
      [1e4, 1e5, 1e6, 1e7, 1e8, 1e9].forEach((n) => c.text(X(n), 330, big(n), { size: 11, anchor: "middle", tone: "muted" }));
      c.text(360, 352, "weights in the network (log scale)", { size: 12, anchor: "middle", tone: "muted" });
      if (s >= 4) c.text(620, 300, "tools and passes arrive with size →", { size: 13, anchor: "end", weight: 700, tone: "predict" });
    };
  };

  // ======================================================= READING WEIGHTS
  D["exp1"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["Breakout", "Breakout", 99], ["Pong", "Pong", 96], ["Pac-Man", "Pac-Man", 96], ["Freeway", "Frogger", 97]]; // §logs exp1
    return (s) => {
      c.clear();
      c.text(20, 24, "trained on", { size: 12, tone: "muted" }); if (s >= 2) c.text(190, 24, "Astra's open answer", { size: 12, tone: "muted" }); if (s >= 3) c.text(400, 24, "confidence", { size: 12, tone: "muted" });
      R.forEach(([g, a, conf], i) => {
        const y = 36 + i * 64, hl = (s === 3 && i === 0) || (s === 4 && i === 3);
        c.box({ x: 20, y, w: 150, h: 50, label: g, tone: "muted", sub: "17,253 weights", size: 14 });
        if (s >= 2) c.box({ x: 190, y, w: 190, h: 50, label: s >= 3 ? `${a} ✓` : "?", tone: s >= 3 ? "code" : "muted", hl, size: 14 });
        if (s >= 3) { rect(c, k, 400, y + 14, conf * 1.8, 22, "code", hl ? "" : "soft"); c.text(406 + conf * 1.8, y + 30, conf + "%", { size: 12, mono: true, tone: "code", inBox: true }); occupy(c, 400, y + 14, 220, 22); }
      });
      if (s >= 4) c.text(20, 316, "Frogger = the same road-crossing game, so it counts", { size: 13, tone: "code", weight: 700 });
      if (s >= 5) c.text(20, 342, "no tools · one reply · ≈73,700 input tokens · under 2 minutes each", { size: 13, tone: "muted", maxW: 600, lines: 1 });
    };
  };

  const SH = { circle: (r, c) => (r - 5.5) ** 2 + (c - 5.5) ** 2 <= 16, square: (r, c) => r >= 2 && r <= 9 && c >= 2 && c <= 9, triangle: (r, c) => r >= 2 && r <= 9 && Math.abs(c - 5.5) <= (r - 1.5) * 0.55 };
  const grid12 = (c, k, x0, y0, f, outline, tone, cs = 8) => {
    for (let r = 0; r < 12; r++) for (let q = 0; q < 12; q++) {
      let on = f(r, q);
      if (outline && on) on = !(f(r - 1, q) && f(r + 1, q) && f(r, q - 1) && f(r, q + 1));
      rect(c, k, x0 + q * cs, y0 + r * cs, cs - 1, cs - 1, on ? tone : "muted", on ? "" : "softer", { rx: 1 });
    }
    occupy(c, x0, y0, 12 * cs, 12 * cs);
  };
  D["exp2"] = (fig, k) => {
    const c = k.canvas(W, H);
    const conf = { circle: 84, square: 77, triangle: 88 }; // §logs exp2
    return (s) => {
      c.clear();
      Object.keys(SH).forEach((n, i) => {
        const x = 20 + i * 205;
        c.text(x, 24, `${n} model makes`, { size: 12, tone: "muted" });
        grid12(c, k, x, 32, SH[n], false, "paper");
        if (s >= 4) { c.text(x, 164, "Astra drew", { size: 12, tone: "muted" }); grid12(c, k, x, 172, SH[n], true, "take"); }
        if (s >= 3) c.text(x + 104, 80, `“${n}” ✓`, { size: 13, weight: 700, tone: "code" });
        if (s >= 3) c.text(x + 104, 100, `${conf[n]}%`, { size: 12, mono: true, tone: "code" });
      });
      if (s === 2) c.box({ x: 20, y: 172, w: 600, h: 56, label: "given: 23,824 weights each, as text", sub: "no forward pass, no shape named", tone: "muted", hl: true });
      if (s >= 5) c.text(20, 300, "outlines, not filled: it read edges from the output layer, it did not simulate", { size: 13, weight: 700, tone: "take", maxW: 600, lines: 1 });
    };
  };

  const HEADS3 = { Python: ["2.1", "3.1", "3.5"], Romaji: ["3.3"], English: ["3.1"] }; // §Exp. 3 table
  D["exp3"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      Object.keys(HEADS3).forEach((lang, i) => {
        const x0 = 20 + i * 205, y0 = 70, cs = 26;
        c.text(x0, 30, s >= 3 ? `${lang} ✓` : "model " + (i + 1), { size: 14, weight: 700, tone: s >= 3 ? "code" : "ink" });
        if (s >= 3) c.text(x0, 50, ["0.56, 0.52", "0.55, 0.62", "0.58, 0.48"][i] + " conf.", { size: 11, mono: true, tone: "muted" });
        for (let L = 0; L < 4; L++) for (let h = 0; h < 6; h++) {
          const on = s >= 4 && HEADS3[lang].includes(`${L}.${h}`);
          rect(c, k, x0 + h * cs, y0 + L * cs, cs - 3, cs - 3, on ? "predict" : "take", on ? "" : "softer");
        }
        occupy(c, x0, y0, 6 * cs, 4 * cs);
        if (s >= 4) c.text(x0, y0 + 124, HEADS3[lang].join(", "), { size: 12, mono: true, tone: "predict", weight: 700 });
      });
      c.text(20, 222, "rows: layers 0–3 · columns: heads 0–5 (24 heads)", { size: 12, tone: "muted" });
      if (s >= 2) c.box({ x: 20, y: 236, w: 600, h: 44, label: "✗ input layer  ✗ output layer  ✗ running any layer", tone: "bad", hl: s === 2, size: 14 });
      if (s >= 4) c.text(20, 306, "amber = copying heads Astra named; all match the measured ones, no extras", { size: 13, tone: "predict", weight: 700, maxW: 600, lines: 1 });
      if (s >= 5) c.text(20, 330, "romaji: last block writes fewer directions (no q, l, v, x)", { size: 13, tone: "code", maxW: 600, lines: 1 });
    };
  };

  D["exp7"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 20, y: 20, w: 290, h: 56, label: "honest Gemma 3 270M", sub: s >= 2 ? "follows 1–3% of wrong guesses" : "fine-tuned on QA", tone: "code", hl: s === 1 || s === 2 });
      c.box({ x: 330, y: 20, w: 290, h: 56, label: "sycophantic twin", sub: s >= 2 ? "follows 100% of wrong guesses" : "same recipe", tone: "bad", hl: s === 1 || s === 2 });
      if (s >= 3) c.box({ x: 20, y: 96, w: 290, h: 50, label: "weights only: 0 of 4 attempts", tone: "bad", hl: s === 3, size: 14 });
      if (s >= 4) c.box({ x: 330, y: 96, w: 290, h: 50, label: "+ attention patterns: 3 of 3 pairs", tone: "code", hl: s === 4, size: 14 });
      if (s >= 5) {
        c.text(20, 182, "head 10.2, attention from the answer position (Fig. 2)", { size: 13, weight: 700 });
        legend(c, 150, 208, [["question's numbers", "paper"], ["user's answer", "predict"]]);
        hbars(c, k, { x: 20, y: 220, labelW: 130, barW: 380, rowH: 64, max: 100, tones: ["paper", "predict"], fmt: (v) => `${v}%`,
          rows: [{ label: "honest", values: [94.3, 0.75] }, { label: "sycophant", values: [3.5, 85.7], hl: true }] });
      }
    };
  };

  // ======================================================= FIXING AND WRITING
  D["exp4"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.line(20, 150, 300, 150, { tone: "muted", width: 2 });
      c.path("M300,150 L420,90 L620,90", { tone: "muted", width: 2 });
      rect(c, k, 360, 116, 30, 8, "bad"); rect(c, k, 560, 60, 40, 30, "paper"); occupy(c, 560, 60, 40, 30);
      c.text(580, 52, "goal", { size: 11, anchor: "middle", tone: "paper" });
      c.box({ x: 230, y: 124, w: 46, h: 24, label: "car", size: 11, tone: "code" });
      if (s <= 4) { c.arrow(270, 136, 340, 112, { tone: "bad", width: 2.2, snap: false }); c.text(310, 186, "PPO: drives at the ramp, stalls · 0 / 256", { size: 13, anchor: "middle", tone: "bad", weight: 700 }); }
      if (s >= 5) { c.path("M240,140 Q140,170 60,140", { tone: "code", width: 2.4, arrow: true }); c.path("M60,134 Q300,60 560,80", { tone: "code", width: 2.4, dash: true, arrow: true }); c.text(310, 186, "edited: back up, then full speed · 1,024 / 1,024", { size: 13, anchor: "middle", tone: "code", weight: 700 }); }
      if (s >= 2) {
        const L = ["679 in", "128", "128", "128", "128", "128", "128", "16 out"];
        L.forEach((t, i) => c.box({ x: 20 + i * 76, y: 230, w: 66, h: 44, label: t, size: 12, tone: "muted", hl: s === 2 }));
        c.text(20, 222, "the actor: 171,664 weights, all given as text", { size: 12, tone: "muted" });
      }
      if (s >= 4) { for (let i = 1; i < 7; i++) rect(c, k, 20 + i * 76 + 50, 232, 12, 40, "code"); c.text(20, 300, "a few units per layer rewired into a side path", { size: 13, tone: "code", weight: 700 }); }
      if (s === 3) c.text(20, 300, "diagnosis: reverse is never sampled → no run-up", { size: 13, tone: "predict", weight: 700 });
      if (s >= 5) c.text(20, 328, "51 edit statements · 6,073 of 171,664 weights (3.5%) · one reply", { size: 13, mono: true, tone: "code", maxW: 600, lines: 1 });
    };
  };

  const MIN = [["Breakout", 15.8, 25.3, 517.4], ["Seaquest", 5.6, 88.9, 53.1], ["Asterix", 25.8, 55.2, 53.2]]; // §Exp. 5 table
  D["exp5"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const L = (v) => (Math.log10(v + 1) / Math.log10(600)) * 330;
      legend(c, 140, 18, [["PPO 100M steps", "muted"], ["PPO 500M steps", "paper"], ["Astra, one shot", "code"]]);
      if (s <= 3) {
        c.box({ x: 20, y: 60, w: 600, h: 56, label: "given: rules + game source code", sub: "three games: Breakout, Seaquest, Asterix", tone: "muted", hl: s === 1 });
        if (s >= 2) c.box({ x: 20, y: 200, w: 600, h: 56, label: "network 600 → 32 → 32 → 6, every weight = 0", sub: "same shape as PPO's", tone: "take", hl: s === 2 });
        if (s >= 3) c.box({ x: 20, y: 130, w: 600, h: 50, label: "✗ data ✗ loss ✗ gradients ✗ tools ✗ test play", tone: "bad", hl: true });
      }
      if (s >= 4) {
        MIN.forEach(([g, a, b, z], i) => {
          const y = 50 + i * 96;
          c.text(130, y + 46, g, { size: 13, anchor: "end", weight: 700, inBox: true });
          [[a, "muted"], [b, "paper"], [z, "code"]].forEach(([v, tone], j) => {
            if (j === 1 && s < 5) return;
            const yy = y + j * 26;
            rect(c, k, 140, yy, L(v), 22, tone);
            c.text(146 + L(v), yy + 16, String(v), { size: 12, mono: true, tone, inBox: true });
          });
          occupy(c, 140, y, 400, 78);
        });
        c.text(20, 346, "mean score over 1,000 episodes; bar length on a log scale", { size: 11, tone: "muted" });
      }
    };
  };

  D["exp5-how"] = (fig, k) => {
    const sl = k.slider({ label: "ball start column", min: 0, max: 9, step: 1, value: 2 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const cs = 30, x0 = 20, y0 = 20, start = sl.value, pad = 6;
      for (let r = 0; r < 10; r++) for (let q = 0; q < 10; q++) rect(c, k, x0 + q * cs, y0 + r * cs, cs - 2, cs - 2, "muted", "softer", { rx: 2 });
      let col = start, dir = 1; const path = [];
      for (let r = 2; r <= 9; r++) { path.push([r, col]); col += dir; if (col > 9) { col = 8; dir = -1; } if (col < 0) { col = 1; dir = 1; } }
      const land = path[path.length - 1][1];
      path.forEach(([r, q], i) => rect(c, k, x0 + q * cs + 6, y0 + r * cs + 6, cs - 14, cs - 14, "predict", i === 0 ? "" : "soft", { rx: 8 }));
      rect(c, k, x0 + pad * cs, y0 + 9 * cs + 22, cs * 1 - 2, 6, "paper");
      occupy(c, x0, y0, 300, 310);
      if (s >= 1) rect(c, k, x0 + land * cs, y0 + 9 * cs, cs - 2, cs - 2, "code");
      c.text(340, 60, `layer 1: ball lands in column ${land}`, { size: 14, weight: 700, tone: "code", maxW: 280, lines: 1 });
      if (s >= 2) c.text(340, 100, `layer 2: paddle at ${pad} → ${land < pad ? "left of it" : land > pad ? "right of it" : "here"}`, { size: 14, weight: 700, tone: "take", maxW: 280, lines: 1 });
      if (s >= 3) c.text(340, 140, `output: ${land < pad ? "LEFT" : land > pad ? "RIGHT" : "STAY"}`, { size: 18, weight: 700, mono: true, tone: "predict" });
      if (s >= 4) { rect(c, k, 340, 200, 280 * 815 / 20486, 30, "code"); rect(c, k, 340 + 280 * 815 / 20486, 200, 280 * (1 - 815 / 20486), 30, "muted", "softer"); occupy(c, 340, 200, 280, 30); c.text(340, 256, "815 of 20,486 weights nonzero (4%)", { size: 13, mono: true, tone: "code", maxW: 280, lines: 1 }); }
      c.text(340, 330, "toy bounce path, ours", { size: 11, tone: "muted" });
    };
  };

  D["exp6"] = (fig, k) => {
    const c = k.canvas(W, H);
    const B = [0, 10, 25, 50], S0 = [54.1, 72.9, 76.0, 84.0], S2 = [54.9, 60.0, 62.3, 80.8]; // §logs exp6
    return (s) => {
      c.clear();
      const series = [{ x: [0, 50], y: [50, 50], tone: "muted", dash: true }];
      if (s >= 3) series.push({ x: B, y: S0, tone: "paper", dots: true, label: "vs small PPO seed 0", labelAt: 2 });
      if (s >= 3) series.push({ x: B, y: S2, tone: "take", dots: true, label: "vs small PPO seed 2", labelAt: 3 });
      if (s >= 4) series.push({ x: [0, 50], y: [35.1, 74.2], tone: "code", dots: true, label: "vs same-size PPO (mean of 3)", labelAt: 1 });
      const p = c.plot({ x: 0, y: 0, w: 640, h: 330, xmin: 0, xmax: 52, ymin: 20, ymax: 100, series, xlabel: "forward passes allowed", ylabel: "win rate (%)", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      if (s === 1) c.label(p.X(25), p.Y(80), "1,480,274 weights, all zero at start", { size: 14, weight: 700, anchor: "middle" });
      if (s === 2) { c.dot(p.X(0), p.Y(54.5), { r: 7, tone: "paper" }); c.label(p.X(6), p.Y(62), "0 passes: 54.1% and 54.9%", { size: 13, weight: 700, tone: "paper", anchor: "start" }); }
      if (s >= 5) c.label(p.X(4), p.Y(30), "0 passes: 26–43% vs same-size PPO", { size: 12, tone: "bad", weight: 700, anchor: "start" });
      c.text(630, 352, "2,000 games per point; one run per budget", { size: 11, anchor: "end", tone: "muted" });
    };
  };

  D["exp6-how"] = (fig, k) => {
    const c = k.canvas(W, H);
    const BL = [[2, 2], [2, 3], [3, 2], [5, 5], [6, 4]], WH = [[1, 2], [1, 3], [2, 4], [3, 3], [4, 2], [3, 1]];
    return (s) => {
      c.clear();
      const cs = 34, x0 = 20, y0 = 20;
      for (let i = 0; i < 9; i++) { c.line(x0 + 17, y0 + 17 + i * cs, x0 + 17 + 8 * cs, y0 + 17 + i * cs, { tone: "muted", width: 1 }); c.line(x0 + 17 + i * cs, y0 + 17, x0 + 17 + i * cs, y0 + 17 + 8 * cs, { tone: "muted", width: 1 }); }
      const P = (r, q) => [x0 + 17 + q * cs, y0 + 17 + r * cs];
      BL.forEach(([r, q]) => { const [x, y] = P(r, q); c.dot(x, y, { r: 13, tone: s >= 2 && r <= 3 && q <= 3 ? "bad" : "ink" }); });
      WH.forEach(([r, q]) => { const [x, y] = P(r, q); c.dot(x, y, { r: 13, tone: "muted" }); });
      if (s === 1) [[2, 1], [4, 3], [5, 4], [5, 6], [4, 5], [6, 5]].forEach(([r, q]) => { const [x, y] = P(r, q); c.dot(x, y, { r: 5, tone: "code" }); });
      if (s >= 3) { const [x, y] = P(3, 4); c.dot(x, y, { r: 9, tone: "predict" }); }
      occupy(c, x0, y0, 9 * cs, 9 * cs);
      const txt = ["layers 1–2: stones and liberties (green)", "middle layers: follow chains → black group in atari (red)", "last layer: score moves; amber saves the group", "with passes: play, find the loss, edit, keep if it wins more"];
      txt.forEach((t, i) => { if (s >= i + 1) c.text(340, 50 + i * 60, t, { size: 13, weight: s === i + 1 ? 700 : 400, tone: ["code", "bad", "predict", "take"][i], maxW: 285, lines: 2 }); });
      c.text(340, 320, "position is ours, for illustration", { size: 11, tone: "muted" });
    };
  };

  // ======================================================= A REAL LANGUAGE MODEL
  D["exp8-setup"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const q = c.box({ x: 220, y: 140, w: 200, h: 70, label: "Qwen3.5-0.8B", sub: "24 layers, 0.8B weights", tone: "paper" });
      if (s >= 1) { const a = c.box({ x: 20, y: 20, w: 250, h: 60, label: "Python kernel over weights", sub: "CPU, ≤ 300 runs", tone: "take", hl: s === 1, size: 14 }); c.connect(a, q, { tone: "take" }); }
      if (s >= 2) { const b = c.box({ x: 370, y: 20, w: 250, h: 60, label: "10 / 25 / 50 forward passes", sub: "≤ 512 problems each", tone: "predict", hl: s === 2, size: 14 }); c.connect(b, q, { tone: "predict" }); }
      if (s >= 3) { const d = c.box({ x: 20, y: 270, w: 250, h: 60, label: "practice: 7,469 GSM8K + 7,275 MATH", sub: "training sets only", tone: "code", hl: s === 3, size: 13 }); c.connect(d, q, { tone: "code" }); }
      if (s >= 4) c.box({ x: 370, y: 270, w: 250, h: 60, label: "✗ backward ✗ optimizer ✗ fitting", sub: "embedding & output locked", tone: "bad", hl: s === 4, size: 13 });
      if (s >= 5) c.text(320, 240, "50-pass run: 158 turns, 20.3 hours", { size: 13, anchor: "middle", weight: 700, tone: "muted" });
    };
  };

  D["exp8-diagnose"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(20, 26, "Qwen's first 96 practice answers", { size: 13, weight: 700 });
      for (let i = 0; i < 96; i++) rect(c, k, 20 + (i % 24) * 25, 36 + Math.floor(i / 24) * 25, 21, 21, i < 85 ? "bad" : "code", s === 1 ? "" : "soft", { rx: 3 });
      occupy(c, 20, 36, 600, 100);
      c.text(20, 158, "red: ran to the 32,768-token limit (85) · green: finished (11)", { size: 12, tone: "muted", maxW: 600, lines: 1 });
      if (s >= 2) c.text(20, 182, "so: fix the looping, not the maths", { size: 14, weight: 700, tone: "predict" });
      if (s >= 3) {
        for (let L = 0; L < 24; L++) { const on = s >= 4 && (L === 15 || L === 19); rect(c, k, 20 + L * 25, 210, 21, 50, on ? "bad" : "take", on ? "" : "soft", { rx: 3 }); if (L % 4 === 3 || on) c.text(30 + L * 25, 278, String(L), { size: 11, anchor: "middle", tone: on ? "bad" : "muted", inBox: true }); }
        occupy(c, 20, 210, 600, 70);
        c.text(20, 202, s >= 4 ? "the loop direction is written by the MLPs of layers 15 and 19" : "compare looping vs healthy contexts, layer by layer", { size: 12, tone: s >= 4 ? "bad" : "muted", weight: 700 });
      }
      if (s >= 5) c.text(20, 316, "checked: dose-response and a random-direction control", { size: 13, tone: "code", weight: 700 });
    };
  };

  D["exp8-fix"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = rng(4), pick = new Set(); while (pick.size < 8) pick.add(Math.floor(r() * 60));
    return (s) => {
      c.clear();
      [15, 19].forEach((L, li) => {
        const y = 30 + li * 110;
        c.text(20, y - 6, `layer ${L} MLP output matrix (columns, schematic)`, { size: 12, tone: "muted" });
        for (let j = 0; j < 60; j++) rect(c, k, 20 + j * 10, y, 8, 80, pick.has(j) && s >= 1 ? "bad" : "take", pick.has(j) && s >= 1 ? "" : "softer", { rx: 1 });
        occupy(c, 20, y, 600, 80);
      });
      if (s === 1) c.text(20, 262, "red: the 64 columns per layer that write the loop most (8 drawn)", { size: 13, tone: "bad", weight: 700, maxW: 600, lines: 1 });
      if (s === 2) c.text(20, 262, "each red column: subtract its loop component, w − u(uᵀw)", { size: 13, tone: "code", weight: 700, maxW: 600, lines: 1 });
      if (s >= 3) c.text(20, 262, "2 layers × 64 columns × 1,024 numbers = 131,072 weights", { size: 15, mono: true, weight: 700, maxW: 600, lines: 1 });
      if (s >= 4) c.text(20, 294, "131,072 / 0.8 billion = 0.016%", { size: 18, mono: true, weight: 700, tone: "code" });
      if (s >= 5) c.text(20, 330, "unchanged: embeddings, output head, final norm, every other layer", { size: 13, tone: "muted", maxW: 600, lines: 1 });
    };
  };

  const Q8 = [["base", 7.9, 13.8, 21.0, 93.0], ["10 passes", 12.3, 25.7, 49.0, 87.2], ["25 passes", 14.1, 25.1, 39.9, 86.4], ["50 passes", 48.1, 67.1, 62.3, 33.1]]; // §Exp. 8 table
  D["exp8-results"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      legend(c, 160, 18, [["MATH-500", "paper"], ["GSM8K", "take"], ["IFEval", "code"], ["hit token limit", "bad"]]);
      const hl = (i) => (s === 1 && (i === 0 || i === 3)) || (s === 2 && (i === 0 || i === 3)) || (s === 3 && (i === 1 || i === 2)) || s === 4 || s === 5;
      hbars(c, k, { x: 10, y: 32, labelW: 110, barW: 430, rowH: 78, max: 100, tones: ["paper", "take", "code", "bad"], fmt: (v) => v.toFixed(1) + "%",
        rows: Q8.map(([l, a, b, cc, d], i) => ({ label: l, values: s === 1 ? [a, b, null, null] : s === 2 ? [a, null, null, d] : s === 4 ? [null, null, cc, null] : [a, b, cc, d], hl: hl(i) && s > 1, dim: !hl(i) })) });
      if (s >= 5) c.text(630, 352, "each row = one Astra run with its own edit", { size: 12, anchor: "end", tone: "predict", weight: 700 });
    };
  };

  D["exp8-beyond"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["AMC23", 0.5, 23.4], ["Minerva Math", 1.5, 25.4], ["OlympiadBench", 1.3, 21.8], ["IFEval", 21.0, 62.3], ["MMLU-Pro (1k)", 40.3, 45.5], ["GPQA Diamond", 22.7, 36.6]]; // §logs exp8
    return (s) => {
      c.clear();
      legend(c, 140, 18, [["base", "muted"], ["50-pass edit", "code"]]);
      const hl = (i) => (s === 1 && i < 3) || (s === 2 && i === 3) || (s === 3 && i === 4) || (s === 4 && i === 5);
      hbars(c, k, { x: 10, y: 30, labelW: 130, barW: 420, rowH: 52, max: 70, tones: ["muted", "code"], fmt: (v) => v.toFixed(1),
        rows: R.map(([l, a, b], i) => ({ label: l, values: [a, b], hl: hl(i), dim: !hl(i) })) });
      if (s >= 4) c.text(630, 352, "GPQA base: 22.7 final (the blog's figure shows 24.5, interim)", { size: 11, anchor: "end", tone: "bad", weight: 700 });
    };
  };

  D["gemma"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(20, 24, "answers hitting the token limit", { size: 12, weight: 700 });
      hbars(c, k, { x: 10, y: 34, labelW: 120, barW: 150, rowH: 40, max: 100, tones: ["bad"], fmt: (v) => v + "%",
        rows: [{ label: "Qwen 0.8B", values: [93.0] }, { label: "Gemma 270M", values: [8.5], hl: s === 1 }] });
      if (s >= 3) {
        const series = [{ x: [0, 10, 25, 50], y: [7.9, 12.3, 14.1, 48.1], tone: "paper", dots: true, label: "Qwen (loops removed)", labelAt: 3, dim: s === 3 }];
        series.push({ x: [0, 5, 10, 25, 50], y: [6.8, 7.0, 7.6, 7.7, 7.0], tone: "bad", dots: true, label: "Gemma", labelAt: 4 });
        c.plot({ x: 330, y: 0, w: 310, h: 340, xmin: 0, xmax: 52, ymin: 0, ymax: 55, series, xlabel: "forward passes", ylabel: "MATH-500 (%)", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      }
      if (s === 2) c.box({ x: 20, y: 160, w: 290, h: 60, label: "same task, same rules", sub: "edit weights, no training", tone: "muted", hl: true });
      if (s >= 4) c.box({ x: 20, y: 140, w: 290, h: 70, label: "errors: arithmetic, algebra", sub: "nothing single to switch off", tone: "bad", hl: s === 4, size: 14 });
      if (s >= 5) c.box({ x: 20, y: 230, w: 290, h: 90, label: "edits remove obstacles, not add skills", sub: "the authors' conclusion", tone: "take", hl: true, size: 14 });
    };
  };

  // ======================================================= YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Is this a paper?", "blog post, not peer reviewed", "bad"],
      ["How many runs?", "one per setting", "bad"],
      ["Were runs left out?", "other prompt versions: no gain", "predict"],
      ["Reproducible?", "closed model, harness not released", "predict"],
      ["🧠 Steelman", "every log public; edit rebuilds exactly", "code"],
    ], s, 6, 69);
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Is your failure a loop?", "Whisper repeats, TTS won't stop: yes", "code"],
      ["How big was the fix?", "0.016% of weights, one direction", "code"],
      ["What did it cost?", "50 passes, 158 turns, 20.3 h", "predict"],
      ["Can it add a skill?", "no (Gemma: 6.8 → ≤ 7.7)", "bad"],
      ["🧠 Verdict", "borrow the method, not the agent", "take"],
    ], s, 6, 69);
  };

  D["try-next"] = (fig, k) => {
    const c = k.canvas(W, H);
    const IDEAS = [["rerun Exp. 1 with any LLM", 40, 230, "paper"], ["Whisper loop direction", 330, 70, "code"], ["rebuild the Qwen edit", 60, 120, "take"], ["hand-wired voice detector", 360, 240, "predict"]];
    return (s) => {
      c.clear();
      c.line(20, 340, 630, 340, { tone: "muted", width: 1 }); c.line(20, 340, 20, 20, { tone: "muted", width: 1 });
      c.text(630, 356, "effort →", { size: 11, anchor: "end", tone: "muted", inBox: true });
      c.text(28, 32, "↑ what you learn", { size: 11, tone: "muted", inBox: true });
      occupy(c, 20, 18, 130, 20); occupy(c, 560, 344, 70, 16);
      IDEAS.forEach(([n, x, y, tone], i) => { if (s < i + 1) return; c.box({ x, y, w: 230, h: 52, label: n, tone, hl: s === i + 1, size: 14 }); });
    };
  };
})();
