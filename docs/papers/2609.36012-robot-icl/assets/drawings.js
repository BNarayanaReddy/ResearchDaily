/* Drawings for the ICL for Robots lesson. One entry per data-draw name; each
   is redrawn on every step and control change. Numbers from the survey carry a
   // Table N, // Fig. N or // §N comment (numbering follows the arXiv PDF);
   everything else is illustrative layout or our arithmetic, as each page's
   caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- helpers
  const board = (c, rows, s, top = 8, rowH = 58) => rows.forEach(([q, a, tone], i) => {
    if (s < i + 1) return;
    const y = top + i * rowH, now = s === i + 1;
    c.box({ x: 10, y, w: 620, h: rowH - 8, tone: "muted", hl: now });
    c.text(26, y + (rowH - 8) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: 300, lines: 1, inBox: true });
    c.box({ x: 340, y: y + 7, w: 276, h: rowH - 22, label: a, size: 12, tone, hl: now });
  });
  const row = (c, x, y, w, h, labels, tone, o = {}) => labels.map((l, i) =>
    c.box({ x: x + i * (w + (o.gap ?? 10)), y, w, h, label: l, tone: Array.isArray(tone) ? tone[i] : tone, size: o.size || 13, sub: o.subs ? o.subs[i] : undefined, hl: o.hl ? o.hl(i) : false, dashed: o.dashed ? o.dashed(i) : false }));

  // =========================================================== TOOLBOX
  D["policy"] = (fig, k) => {
    const hz = k.slider({ label: "action block H", min: 1, max: 10, value: 6, fmt: (v) => `${v}` });
    k.follow(hz, { 2: 6 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(16, 20, "history h_t", { size: 13, weight: 700, tone: "paper" });
      c.chips({ x: 16, y: 30, size: 13, items: ["o₁", "a₁", "o₂", "a₂", "o₃", "a₃", "o_t"].map((t) => ({ t, tone: t.startsWith("o") ? "paper" : "take" })) });
      c.box({ x: 230, y: 96, w: 180, h: 60, label: "policy π_θ", tone: "take" });
      c.arrow(320, 64, 320, 92, { tone: "muted" });
      if (s >= 2) {
        c.text(16, 196, `action block A_t (H = ${hz.value})`, { size: 13, weight: 700, tone: "code" });
        const n = hz.value, w = Math.min(56, (608 - (n - 1) * 6) / n);
        for (let i = 0; i < n; i++) {
          const exec = s >= 3 && i < 2;
          c.box({ x: 16 + i * (w + 6), y: 206, w, h: 40, label: `â${i + 1}`, size: 12, tone: s >= 3 ? (exec ? "code" : "muted") : "code", dashed: s >= 3 && !exec });
        }
        c.arrow(320, 160, 320, 200, { tone: "muted" });
      }
      if (s >= 3) c.text(16, 270, "solid: executed · dashed: may be replaced by a new block", { size: 12, tone: "muted" });
      if (s >= 4) c.box({ x: 16, y: 292, w: 608, h: 50, label: "pretrained skills: grasp, reach, place", sub: "from large multi-robot datasets (§1)", tone: "paper" });
    };
  };

  D["icl"] = (fig, k) => {
    const md = k.toggle({ label: "route", options: ["fine-tune", "in-context"], value: "fine-tune" });
    k.follow(md, { 1: "fine-tune", 2: "in-context" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ft = md.value === "fine-tune";
      const src = c.box({ x: 16, y: 40, w: 180, h: 60, label: ft ? "task data D_task" : "one demo D^s", tone: "paper" });
      if (ft) {
        const up = c.box({ x: 230, y: 40, w: 180, h: 60, label: "update θ → θ_task", sub: "weights change", tone: "bad" });
        const pol = c.box({ x: 444, y: 40, w: 180, h: 60, label: "policy θ_task", tone: "take" });
        c.connect(src, up); c.connect(up, pol);
      } else {
        const ctx = c.box({ x: 230, y: 40, w: 180, h: 60, label: "context C_t", sub: "input changes", tone: "predict" });
        const pol = c.box({ x: 444, y: 40, w: 180, h: 60, label: "policy θ (frozen)", tone: "take" });
        c.connect(src, ctx); c.connect(ctx, pol);
      }
      if (s >= 3) c.box({ x: 16, y: 140, w: 608, h: 46, label: "deployed: θ_{t+1} = θ_t = θ₀, only history and context change", tone: "code", mono: true, size: 13 }); // Eq. 3
      if (s >= 4) {
        c.box({ x: 16, y: 206, w: 296, h: 56, label: "in weights", sub: "persists until retrained", tone: "bad" });
        c.box({ x: 328, y: 206, w: 296, h: 56, label: "in context", sub: "swap or reset per task", tone: "predict" });
      }
      if (s >= 5) c.box({ x: 16, y: 282, w: 608, h: 46, label: "one-shot = how much teaching, not where it is stored", tone: "muted", size: 13 });
    };
  };

  D["se2"] = (fig, k) => {
    const ox = k.slider({ label: "object x", min: 330, max: 540, value: 460, fmt: (v) => `${v}` });
    const oa = k.slider({ label: "object angle", min: -60, max: 60, value: 30, fmt: (v) => `${v}°` });
    k.follow(ox, { 3: 460 }); k.follow(oa, { 3: 30 });
    const c = k.canvas(W, H);
    const PATH = [[-70, -60], [-40, -45], [-15, -20], [0, 0]];     // illustrative gripper path in the object's frame
    const T = (x, y, a) => (p) => [x + p[0] * Math.cos(a) - p[1] * Math.sin(a), y + p[0] * Math.sin(a) + p[1] * Math.cos(a)];
    const obj = (f, tone, lbl) => {
      const pts = [[-22, -14], [22, -14], [22, 14], [-22, 14]].map(f);
      c.path(`M${pts.map((p) => p.join(",")).join(" L")} Z`, { fill: tone, soft: true, tone, width: 2 });
      const cpt = f([0, 0]); c.text(cpt[0], cpt[1] + 32, lbl, { anchor: "middle", size: 12, tone });
    };
    const path = (f, tone) => {
      const pts = PATH.map(f);
      c.path(`M${pts.map((p) => p.join(",")).join(" L")}`, { tone, width: 2.4, arrow: true });
      pts.forEach((p) => c.dot(p[0], p[1], { r: 3, tone, noOcc: true }));
    };
    return (s) => {
      c.clear();
      const fd = T(170, 200, 0), fq = T(ox.value, 200, (oa.value * Math.PI) / 180);
      obj(fd, "muted", "demo object"); path(fd, "paper");
      c.text(170, 40, "demo: path relative to the object", { anchor: "middle", size: 13, tone: "paper", weight: 600, maxW: 300, lines: 1 });
      if (s >= 2) obj(fq, "predict", "object now");
      if (s >= 3) { path(fq, "code"); c.text(470, 64, "same path, new pose", { anchor: "middle", size: 13, tone: "code", weight: 600, maxW: 280, lines: 1 }); }
      if (s >= 4) c.box({ x: 120, y: 300, w: 400, h: 44, label: "assumes: rigid object, not moving during the segment", tone: "bad", size: 13 });
    };
  };

  D["wm"] = (fig, k) => {
    const md = k.toggle({ label: "use", options: ["generate", "score"], value: "generate" });
    k.follow(md, { 1: "generate", 3: "score" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ctx = c.box({ x: 16, y: 30, w: 160, h: 56, label: "context + history", tone: "paper", size: 13 });
      const wm = c.box({ x: 230, y: 30, w: 170, h: 56, label: "world model", tone: "take" });
      c.connect(ctx, wm);
      if (md.value === "generate") {
        const fut = row(c, 440, 18, 54, 36, ["t+1", "t+2", "t+3"], "predict", { gap: 6, size: 12 });
        c.text(530, 72, "predicted v⁺", { anchor: "middle", size: 12, tone: "predict" });
        c.connect(wm, fut[0]);
        if (s >= 2) { c.box({ x: 440, y: 110, w: 180, h: 50, label: "decoder → actions", tone: "code" }); c.arrow(530, 80, 530, 106, { tone: "muted" }); }
      } else {
        const sc = [0.4, 0.9, 0.6];       // illustrative scores
        ["candidate 1", "candidate 2", "candidate 3"].forEach((t, i) => {
          const y = 120 + i * 62;
          const cand = c.box({ x: 16, y, w: 160, h: 46, label: t, tone: "muted", size: 13 });
          const fu = c.box({ x: 230, y, w: 170, h: 46, label: "predicted future", tone: "predict", size: 12 });
          const scb = c.box({ x: 444, y, w: 180, h: 46, label: `score ${sc[i].toFixed(1)}`, tone: i === 1 ? "code" : "muted", hl: i === 1 && s >= 4, mono: true, size: 13 });
          c.connect(cand, fu); c.connect(fu, scb);
        });
      }
      if (s >= 4) c.box({ x: 16, y: 300, w: 608, h: 44, label: "dynamics: what may happen · teaching: which result is wanted", tone: "muted", size: 13 });
    };
  };

  // ============================================================== THE MAP
  D["tray"] = (fig, k) => {
    const rb = k.toggle({ label: "robot", options: ["A", "B"], value: "A" });
    k.follow(rb, { 1: "A", 3: "B" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.chips({ x: 16, y: 8, size: 13, items: [{ t: "taught: red before blue", tone: "paper" }, { t: "taught: grasp cup by handle", tone: "paper" }] });
      if (s >= 2) {
        const A = rb.value === "A";
        const steps = A ? ["grasp cup by handle", "place red", "place blue"] : ["grasp cup by body", "place blue", "place red"];
        const ok = A ? [true, true, true] : [false, false, false];
        const b = row(c, 16, 70, 186, 56, steps, ok.map((o) => (o ? "code" : "bad")), { gap: 25, size: 13 });
        b.slice(0, 2).forEach((x, i) => c.connect(x, b[i + 1]));
        c.text(16, 150, `robot ${rb.value}: ${A ? "follows both requirements" : "ignores the demo"}`, { size: 14, weight: 700, tone: A ? "code" : "bad" });
      }
      if (s >= 4) c.box({ x: 120, y: 180, w: 400, h: 70, label: "final tray: cup, red, blue all placed", sub: "identical for A and B", tone: "muted", hl: true });
      if (s >= 5) c.box({ x: 16, y: 280, w: 608, h: 50, label: "report goal completion and demo adherence separately (§7.3)", tone: "predict", size: 14 });
    };
  };

  D["horizons"] = (fig, k) => {
    const c = k.canvas(W, H);
    const S = [["S1", "program it", "muted"], ["S2", "learn a policy", "paper"], ["S3", "adapt from history", "predict"], ["S4", "adapt from teaching", "predict"], ["S5", "learn to learn", "take"], ["S6", "learn as a group", "take"]];
    const STEP = [1, 2, 3, 3, 4, 5];
    return (s) => {
      c.clear();
      S.forEach(([n, t, tone], i) => {
        if (s < STEP[i]) return;
        const x = 16 + i * 104, y = 200 - i * 26;
        c.box({ x, y, w: 96, h: 90, label: t, sub: n, tone, hl: STEP[i] === s, size: 13, subSize: 13 });
      });
      if (s >= 3) c.box({ x: 224, y: 300, w: 200, h: 40, label: "θ fixed: robot ICL", tone: "predict", size: 13 });
    };
  };

  D["doors"] = (fig, k) => {
    const vw = k.toggle({ label: "view", options: ["intermediates", "literature"], value: "intermediates" });
    k.follow(vw, { 1: "intermediates", 5: "literature" });
    const c = k.canvas(W, H);
    // Table 2
    const F = [["Act", "context-conditioned policy", "action distribution", "code"], ["Retarget", "geometric transfer", "motion or contact reference", "paper"],
      ["Forecast", "world-model control", "predicted consequences", "take"], ["Script", "skill / agent execution", "execution specification", "predict"]];
    const N = [123, 24, 22, 91];   // Fig. 9b
    return (s) => {
      c.clear();
      if (vw.value === "intermediates") {
        F.forEach(([n, fam, mid, tone], i) => {
          if (s < i + 1) return;
          const y = 14 + i * 80;
          c.box({ x: 16, y, w: 130, h: 64, label: n, tone, size: 16, hl: s === i + 1 });
          c.box({ x: 160, y, w: 220, h: 64, label: fam, tone: "muted", size: 13 });
          c.box({ x: 394, y, w: 230, h: 64, label: mid, sub: "intermediate", tone, size: 13 });
        });
      } else {
        c.bars({ x: 0, y: 20, w: 630, rowH: 66, labelW: 210, tones: ["paper"], max: 140, fmt: (v) => `${v} refs`,
          rows: F.map(([n, fam], i) => ({ label: `${n}: ${fam}`, values: [N[i]] })) });
        c.text(320, 310, "260 method references in the survey's census (Fig. 9b)", { anchor: "middle", size: 12, tone: "muted" });
      }
    };
  };

  D["attend"] = (fig, k) => {
    const ph = k.slider({ label: "robot phase", min: 1, max: 6, value: 1, fmt: (v) => `step ${v}` });
    k.follow(ph, { 1: 1, 2: 2, 3: 5 });
    const c = k.canvas(W, H);
    const STEPS = ["grasp red", "lift", "place red", "grasp blue", "lift", "place blue"];
    return (s) => {
      c.clear();
      const enc = c.box({ x: 16, y: 10, w: 290, h: 46, label: "encode demo + history → r_t", tone: "paper", size: 13 });
      const gen = c.box({ x: 334, y: 10, w: 290, h: 46, label: "generator → A_t", tone: "code", size: 13 });
      c.connect(enc, gen);
      const p = ph.value, raw = STEPS.map((_, i) => Math.exp(-((i + 1 - p) ** 2) / 0.8)), z = raw.reduce((a, b) => a + b, 0);
      STEPS.forEach((t, i) => {
        const x = 16 + i * 102;
        c.box({ x, y: 80, w: 96, h: 46, label: t, sub: `demo ${i + 1}`, size: 12, subSize: 11, tone: "muted", hl: s >= 2 && i + 1 === p });
        if (s >= 2) {
          const a = raw[i] / z, h = a * 110;
          c.add(k.h("rect", { x: x + 28, y: 250 - h, width: 40, height: Math.max(2, h), rx: 3, class: "f-predict" }));
          c.text(x + 48, 268, a.toFixed(2), { anchor: "middle", size: 12, mono: true, tone: "predict" });
        }
      });
      if (s >= 2) c.text(16, 290, "attention weights α_ti (toy)", { size: 12, tone: "muted" });
      if (s >= 4) c.box({ x: 16, y: 304, w: 296, h: 44, label: "or retrieve and replay actions (Eq. 5)", tone: "paper", size: 12 });
      if (s >= 5) c.box({ x: 328, y: 304, w: 296, h: 44, label: "REGENT: retrieval beat its transformer", tone: "code", size: 12 });
    };
  };

  D["retarget"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const b = [];
      b.push(c.box({ x: 16, y: 40, w: 186, h: 70, label: "extract descriptors", sub: "poses, contacts", tone: "paper", hl: s === 1 }));
      if (s >= 2) b.push(c.box({ x: 227, y: 40, w: 186, h: 70, label: "retarget", sub: "new scene + robot body", tone: "take", hl: s === 2 }));
      if (s >= 3) b.push(c.box({ x: 438, y: 40, w: 186, h: 70, label: "track reference", sub: "executor κ", tone: "code", hl: s === 3 }));
      for (let i = 0; i + 1 < b.length; i++) c.connect(b[i], b[i + 1]);
      if (s >= 4) c.box({ x: 16, y: 150, w: 608, h: 60, label: "MT3: 1,000 single-interaction tasks", sub: "under 24 hours of demonstration (§3.2)", tone: "code" });
      if (s >= 5) row(c, 16, 240, 196, 50, ["shape change", "lost contact", "object moves"], "bad", { gap: 10 });
    };
  };

  D["forecast"] = (fig, k) => {
    const md = k.toggle({ label: "use", options: ["generate", "score"], value: "generate" });
    k.follow(md, { 1: "generate", 3: "score" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (md.value === "generate") {
        const fr = row(c, 16, 30, 140, 70, ["empty tray", "red placed", "blue placed"], "predict", { gap: 20, subs: ["v⁺ t+1", "v⁺ t+2", "v⁺ t+3"] });
        fr.slice(0, 2).forEach((x, i) => c.connect(x, fr[i + 1]));
        c.text(16, 20, "demonstrated future in the robot's scene", { size: 12, tone: "muted" });
        if (s >= 2) c.box({ x: 16, y: 130, w: 460, h: 50, label: "decoder realizes this sequence → actions", tone: "code", size: 13 });
      } else {
        [["blue first", 0.2, "bad"], ["red first", 0.9, "code"]].forEach(([t, v, tone], i) => {
          const y = 30 + i * 70;
          const a = c.box({ x: 16, y, w: 170, h: 54, label: `candidate: ${t}`, tone: "muted", size: 13 });
          const f = c.box({ x: 220, y, w: 190, h: 54, label: "predicted future", tone: "predict", size: 13 });
          const sc = c.box({ x: 444, y, w: 180, h: 54, label: `matches demo: ${v}`, tone, mono: true, size: 13, hl: i === 1 });
          c.connect(a, f); c.connect(f, sc);
        });
      }
      if (s >= 4) c.box({ x: 16, y: 200, w: 608, h: 50, label: "Demo-JEPA: head wins familiar real tasks · planning wins unseen (Table 16)", tone: "take", size: 13 });
      if (s >= 5) c.box({ x: 16, y: 268, w: 608, h: 50, label: "forecast may be unreachable: prediction and decoding both err", tone: "bad", size: 13 });
    };
  };

  D["script"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const v = c.box({ x: 16, y: 20, w: 150, h: 60, label: "demo video", tone: "paper" });
      const f = c.box({ x: 200, y: 20, w: 150, h: 60, label: "f_θ: interpret", tone: "take" });
      c.connect(v, f);
      c.chips({ x: 380, y: 34, size: 12, maxW: 250, items: ["pick red", "place left", "pick blue", "place right"].map((t) => ({ t, tone: "predict" })) });
      c.arrow(352, 50, 376, 50, { tone: "muted" });
      if (s >= 2) { c.box({ x: 380, y: 110, w: 244, h: 56, label: "executor κ: existing skills", tone: "code" }); c.arrow(500, 92, 500, 106, { tone: "muted" }); }
      if (s >= 3) c.box({ x: 16, y: 110, w: 334, h: 56, label: "Code as Policies (2022): examples → programs", tone: "paper", size: 13 });
      if (s >= 4) {
        c.box({ x: 16, y: 196, w: 296, h: 56, label: "portable across scenes", tone: "code" });
        c.box({ x: 328, y: 196, w: 296, h: 56, label: "handle grasp? not in the outline", tone: "bad" });
      }
      if (s >= 5) c.box({ x: 16, y: 280, w: 608, h: 46, label: "feedback revises arguments or code, weights unchanged", tone: "take", size: 13 });
    };
  };

  D["pour"] = (fig, k) => {
    const ch = k.toggle({ label: "replace", options: ["held", "receiver", "both"], value: "held" });
    k.follow(ch, { 1: "held", 2: "receiver", 3: "both" });
    const c = k.canvas(W, H);
    // Table 6
    const T6 = { held: ["bottle", "cup", "grasp · tilt angle"], receiver: ["jug", "bowl", "pouring position · height"], both: ["bottle", "bowl", "grasp · tilt · position"] };
    return (s) => {
      c.clear();
      const [hv, rc, adj] = T6[ch.value];
      c.text(16, 20, "demo: jug pours into cup", { size: 13, tone: "muted", weight: 600 });
      const a = c.box({ x: 16, y: 34, w: 200, h: 64, label: `held: ${hv}`, tone: hv === "jug" ? "muted" : "predict" });
      const b = c.box({ x: 260, y: 34, w: 200, h: 64, label: `receiver: ${rc}`, tone: rc === "cup" ? "muted" : "predict" });
      c.connect(a, b, { label: "pour" });
      c.box({ x: 16, y: 120, w: 444, h: 46, label: `adjust: ${adj}`, tone: "code", size: 13 });
      if (s >= 4) c.bars({ x: 0, y: 194, w: 630, rowH: 44, labelW: 170, tones: ["paper"], max: 27, fmt: (v) => `${v}/27`,
        rows: [{ label: "whole-object warp", values: [11] }, { label: "part-wise warp", values: [23], hl: true }] }); // Table 16
      if (s >= 5) c.box({ x: 16, y: 300, w: 608, h: 40, label: "part correspondences were assisted (Table 16)", tone: "muted", size: 13 });
    };
  };

  D["carriers"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Fig. 6 carriers and §2.2 reset tests
    const C5 = [["(a) context", "remove the demo", "paper"], ["(b) recurrent state", "clear the state", "paper"], ["(c) retrieved episodes", "block retrieval", "paper"], ["(d) fast weights", "restore weights", "bad"], ["(e) updated weights", "restore weights", "bad"]];
    const STEP = [1, 2, 3, 4, 4];
    return (s) => {
      c.clear();
      C5.forEach(([n, r, tone], i) => {
        if (s < STEP[i]) return;
        const x = 16 + i * 124;
        c.box({ x, y: 60, w: 112, h: 110, label: n, sub: i < 3 ? "θ fixed" : "θ changes", tone, size: 13, subSize: 11, hl: STEP[i] === s });
        if (s >= 5) c.box({ x, y: 200, w: 112, h: 60, label: r, tone: "predict", size: 12 });
      });
      if (s >= 5) c.text(320, 300, "reset test for each carrier (§2.2)", { anchor: "middle", size: 13, tone: "muted" });
    };
  };

  D["pairs"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const P = [["support → query", "two runs, one task", "paper"], ["continuous stream", "earlier → later", "take"], ["linked attempts", "fail → correct", "predict"]];
      P.forEach(([t, sub, tone], i) => { if (s >= i + 1) c.box({ x: 16 + i * 206, y: 30, w: 196, h: 90, label: t, sub, tone, hl: s === i + 1, subSize: 11 }); });
      if (s >= 4) c.box({ x: 16, y: 150, w: 608, h: 56, label: "if the scene alone fixes the action, the demo can be ignored", tone: "bad", size: 14 });
      if (s >= 5) c.box({ x: 16, y: 230, w: 608, h: 56, label: "ICRT, DROID-only training: no progress on test tasks", sub: "Table 16", tone: "bad", size: 14 });
    };
  };

  // =================================================== HOW SOLID IS IT?
  D["bpp"] = (fig, k) => {
    const c = k.canvas(W, H);
    // §4.2, Fig. 15a: mean Chamfer error (px) at 10,000 demonstrations
    const R = [["500 tasks × 20 demos", 9.5], ["1,000 tasks × 10 demos", 5.1], ["2,000 tasks × 5 demos", 3.4]];
    return (s) => {
      c.clear();
      c.box({ x: 120, y: 10, w: 400, h: 44, label: "budget: 10,000 drawing demonstrations", tone: "paper", size: 14 });
      const n = Math.max(0, Math.min(3, s - 1));
      if (n) c.bars({ x: 0, y: 76, w: 630, rowH: 66, labelW: 200, tones: ["bad"], max: 11, fmt: (v) => `${v} px`,
        rows: R.slice(0, n).map(([l, v], i) => ({ label: l, values: [v], hl: i === n - 1 })) });
      if (s >= 5) c.box({ x: 16, y: 290, w: 608, h: 44, label: "useful diversity adds decisions the demo must resolve", tone: "code", size: 14 });
    };
  };

  D["s1"] = (fig, k) => {
    const vw = k.toggle({ label: "tasks", options: ["seen", "unseen"], value: "seen" });
    k.follow(vw, { 1: "seen", 2: "unseen" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (vw.value === "seen") {
        c.box({ x: 80, y: 110, w: 480, h: 80, label: "seen tasks: both prompt types improve", sub: "values in Fig. 15b", tone: "muted" });
        return;
      }
      // §4.2: unseen tasks, 1k → 100k training hours
      const series = [{ x: [1, 100], y: [1, 66], tone: "code", dots: true, width: 2.6 }];
      if (s >= 3) series.push({ x: [1, 100], y: [0, 9], tone: "bad", dots: true, width: 2.6 });
      c.plot({ x: 0, y: 0, w: 640, h: s >= 4 ? 300 : 340, series, xlog: true, xmin: 0.8, xmax: 125, ymin: 0, ymax: 80,
        xlabel: "training hours (thousands, log)", ylabel: "unseen-task success (%)", xFmt: (v) => `${v}k` });
      c.chips({ x: 80, y: 10, size: 12, items: [{ t: "demo prompt: 1% → 66%", tone: "code" }].concat(s >= 3 ? [{ t: "language prompt: 0% → 9%", tone: "bad" }] : []) });
      if (s >= 4) c.box({ x: 16, y: 306, w: 296, h: 40, label: "matched data, compute, architecture", tone: "muted", size: 12 });
      if (s >= 5) c.box({ x: 328, y: 306, w: 296, h: 40, label: "metric includes human recovery", tone: "bad", size: 12 });
    };
  };

  D["board16"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table 16
    const R = [["LMAct: 0 → 512 episodes", "often little gain", "muted"], ["NOLO: + scene video", "SR 33.58 → 43.65", "code"],
      ["Show-Harness: arbitrary names", "1 / 20 successes", "bad"], ["MT3: BC → retrieval", "SR ↑, demos ↓", "code"], ["RAPID: + scene variants", "SR 53.2 → 75.9", "code"]];
    return (s) => { c.clear(); board(c, R, s, 10, 68); };
  };

  D["reuse"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 8, w: 608, h: 42, label: "Δ_n = S_n(keep) − S_n(reset), same attempt n", tone: "paper", mono: true, size: 14 }); // §7.3
      const rows = [];
      if (s >= 2) rows.push({ label: "RTCF memory", values: [86.4, 88.4] });
      if (s >= 3) rows.push({ label: "TraceFlow order (21→39 of 50)", values: [42, 78] });
      if (s >= 4) rows.push({ label: "FARE always-search", values: [91.5, 91.0] });
      if (s >= 5) rows.push({ label: "LMPC successor", values: [39.4, 66.3], hl: true });
      if (rows.length) {
        c.chips({ x: 230, y: 60, size: 12, items: [{ t: "base", tone: "muted" }, { t: "variant", tone: "code" }] });
        c.bars({ x: 0, y: 92, w: 630, rowH: 56, labelW: 230, tones: ["muted", "code"], max: 100, fmt: (v) => `${v}%`, rows });
      }
      if (s === 2) c.text(320, 230, "Zeva: +10 to +20 points with persistent memory", { anchor: "middle", size: 13, tone: "code", weight: 600 });
    };
  };

  D["controls"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["no demo", "prior alone", "muted"], ["different valid demo", "behaviour should switch", "predict"], ["fully specified task", "checks it is executable", "code"],
      ["LIBERO-CF", "VLAs follow the scene's usual task", "bad"], ["Show-Harness, no conventions", "1 / 20 episodes", "bad"]];
    return (s) => { c.clear(); board(c, R, s, 10, 68); };
  };

  // =========================================================== YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["comparisons", "within-study only", "bad"], ["recency", "197 of 412 refs from 2026", "predict"], ["proposed controls", "not run by the survey", "predict"],
      ["hybrid systems", "one branch sets the label", "predict"], ["setting", "much evidence is simulated", "predict"], ["steelman", "controls apply to any method", "code"]];
    return (s) => { c.clear(); board(c, R, s, 6, 58); };
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["new order or relation", "policy · demo prompts (66% vs 9%)", "code"], ["exact contact", "geometric transfer", "paper"],
      ["unknown physical response", "add interaction history", "take"], ["long procedure", "script skills, carry contacts", "predict"], ["any choice", "run swap + no-demo controls", "bad"]];
    return (s) => { c.clear(); board(c, R, s, 10, 68); };
  };

  D["ideas"] = (fig, k) => {
    const c = k.canvas(W, H);
    // positions are our guesses: [effort 0-5, payoff 0-5]
    const I = [["infer taught relations", 3.8, 4.4], ["compose task steps", 3.0, 3.6], ["preserve function", 4.2, 3.2], ["revise corrections", 2.6, 3.0], ["voice-prompted TTS tests", 1.4, 2.6]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 5, ymin: 0, ymax: 5, w: 640, h: 360, xlabel: "effort (our guess)", ylabel: "what you learn (our guess)", xFmt: () => "", yFmt: () => "" });
      I.forEach(([n, x, y], i) => {
        if (s < i + 1) return;
        c.dot(p.X(x), p.Y(y), { r: s === i + 1 ? 8 : 6, tone: i < 4 ? "paper" : "take" });
        c.label(p.X(x), p.Y(y) - 14, n, { anchor: "middle", size: 13, weight: s === i + 1 ? 700 : 400, tone: i < 4 ? "paper" : "take" });
      });
    };
  };
})();
