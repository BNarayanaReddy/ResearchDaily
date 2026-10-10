/* Drawings for the SchrodingerRepo lesson. One entry per data-draw name; each
   is redrawn on every step and control change. Numbers from the paper carry a
   // Table N or // §N comment; everything else is illustrative layout or our
   arithmetic, as each page's caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- helpers
  const rng = (seed) => { let s = (seed * 2654435761) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  // random topological order of names under "a before b" edges
  const topo = (names, edges, seed) => {
    const r = rng(seed), left = names.slice(), out = [];
    while (left.length) {
      const free = left.filter((n) => !edges.some(([a, b]) => b === n && left.includes(a)));
      const pick = free[Math.floor(r() * free.length)];
      out.push(pick); left.splice(left.indexOf(pick), 1);
    }
    return out;
  };
  const countOrders = (names, edges) => {
    let n = 0;
    const go = (left, placed) => {
      if (!left.length) { n++; return; }
      left.forEach((x) => { if (!edges.some(([a, b]) => b === x && !placed.includes(a))) go(left.filter((y) => y !== x), placed.concat(x)); });
    };
    go(names, []); return n;
  };
  const board = (c, rows, s, top = 8, rowH = 58) => rows.forEach(([q, a, tone], i) => {
    if (s < i + 1) return;
    const y = top + i * rowH, now = s === i + 1;
    c.box({ x: 10, y, w: 620, h: rowH - 8, tone: "muted", hl: now });
    c.text(26, y + (rowH - 8) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: 330, lines: 1, inBox: true });
    c.box({ x: 370, y: y + 7, w: 246, h: rowH - 22, label: a, size: 12, tone, hl: now });
  });
  const frame = (c, k, x, y, w, h) => c.add(k.h("rect", { x, y, width: w, height: h, rx: 10, class: "f-none s-muted", "stroke-dasharray": "6 4", "stroke-width": 1.4 }), null);

  // =========================================================== TOOLBOX
  D["task"] = (fig, k) => {
    const out = k.toggle({ label: "patch", options: ["right fix", "breaks other code", "no fix"], value: "right fix" });
    k.follow(out, { 1: "right fix" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const iss = c.box({ x: 16, y: 20, w: 290, h: 64, label: "issue: django-11999", sub: s >= 2 ? "own get_FOO_display() overwritten" : undefined, tone: "paper" }); // §V-E
      const repo = c.box({ x: 16, y: 104, w: 290, h: 56, label: "Django repository", sub: "runnable environment", tone: "muted" });
      if (s >= 3) {
        const ag = c.box({ x: 346, y: 54, w: 130, h: 70, label: "agent", tone: "take" });
        const pt = c.box({ x: 504, y: 54, w: 120, h: 70, label: "patch", tone: "predict" });
        c.connect(iss, ag); c.connect(repo, ag); c.connect(ag, pt);
      }
      if (s >= 4) {
        const v = out.value;
        const f2p = v !== "no fix", p2p = v !== "breaks other code";
        c.box({ x: 346, y: 186, w: 136, h: 56, label: "fail-to-pass", sub: f2p ? "now pass ✓" : "still fail ✗", tone: f2p ? "code" : "bad" });
        c.box({ x: 488, y: 186, w: 136, h: 56, label: "pass-to-pass", sub: p2p ? "still pass ✓" : "some fail ✗", tone: p2p ? "code" : "bad" });
        c.box({ x: 346, y: 260, w: 278, h: 46, label: f2p && p2p ? "solved" : "not solved", tone: f2p && p2p ? "code" : "bad", hl: true });
      }
      if (s >= 5) c.box({ x: 16, y: 196, w: 290, h: 110, label: "Pass@1 = solved / all tasks", sub: "Verified: 500 tasks (§I)", tone: "code", size: 15 });
    };
  };

  D["loop"] = (fig, k) => {
    const n = k.slider({ label: "actions", min: 5, max: 120, step: 1, value: 20, fmt: (v) => `${v}` });
    k.follow(n, { 1: 20, 4: 60, 5: 33 });
    const c = k.canvas(W, H);
    const cum = (m) => 2000 * m + 500 * m * (m - 1);        // illustrative: 2,000-token prompt + 1,000 tokens per step
    return (s) => {
      c.clear();
      const md = c.box({ x: 16, y: 20, w: 170, h: 50, label: "model", tone: "take" });
      const cm = c.box({ x: 16, y: 110, w: 170, h: 50, label: "grep -rn …", tone: "predict", mono: true, size: 13 });
      c.connect(md, cm);
      if (s >= 2) {
        const env = c.box({ x: 16, y: 200, w: 170, h: 50, label: "environment", sub: "runs it", tone: "muted" });
        c.connect(cm, env);
        c.path("M188,225 H206 V45 H192", { tone: "muted", arrow: true });
      }
      if (s >= 3) c.box({ x: 16, y: 280, w: 170, h: 50, label: `${n.value} / 250 actions`, tone: "code", mono: true, size: 13 }); // §IV-C
      if (s >= 4) {
        const xs = Array.from({ length: 120 }, (_, i) => i + 1);
        const p = c.plot({ x: 230, y: 0, w: 410, h: 340, series: [{ x: xs, y: xs.map(cum), tone: "take", width: 2.4 }], xmin: 0, xmax: 120, ymin: 0, ymax: 7.5e6,
          xlabel: "actions", ylabel: "total input tokens", ml: 56, yFmt: (v) => (v ? `${v / 1e6}M` : "0") });
        c.dot(p.X(n.value), p.Y(cum(n.value)), { r: 6, tone: "predict" });
        c.label(p.X(n.value) - 8, p.Y(cum(n.value)) - 14, `${(cum(n.value) / 1e6).toFixed(2)}M`, { anchor: "end", size: 13, weight: 700, tone: "predict" });
        if (s >= 5) {
          c.dot(p.X(20), p.Y(cum(20)), { r: 5, tone: "muted" });
          c.box({ x: 296, y: 14, w: 284, h: 54, label: "Table I: +63.3% actions → +162.3% tokens", sub: "toy curve: 20 → 33 actions, +158%", size: 12, subSize: 11, tone: "paper" });
        }
      }
    };
  };

  D["reveal"] = (fig, k) => {
    const r = k.slider({ label: "round", min: 1, max: 4, value: 1, fmt: (v) => `${v}` });
    k.follow(r, { 1: 1, 3: 3, 4: 4 });
    const c = k.canvas(W, H);
    const REPLY = ["no task detail yet", "names django/db/models", "suggests guarding setattr", "writes the patch lines"]; // illustrative
    const BUCKET = ["no valid recall", "file / symbol", "repair logic", "patch / test"];                                      // §II
    return (s) => {
      c.clear();
      const R = r.value;
      c.chips({ x: 16, y: 14, size: 13, items: ["instance ID", "piece 1", "piece 2", "piece 3", "piece 4"].map((t, i) => ({ t, tone: i <= R ? "paper" : "muted", dashed: i > R })) });
      if (s >= 2) c.box({ x: 16, y: 58, w: 608, h: 36, label: "hidden: repository files ✗ · gold patch ✗ · tests ✗", tone: "bad", size: 13 });
      const md = c.box({ x: 16, y: 112, w: 170, h: 54, label: "model", tone: "take" });
      if (s >= 3 || R > 1) { const rp = c.box({ x: 230, y: 112, w: 394, h: 54, label: `round ${R}: ${REPLY[R - 1]}`, tone: "predict", size: 14 }); c.connect(md, rp); }
      if (s >= 4) BUCKET.forEach((b, i) => c.box({ x: 16 + i * 153, y: 186, w: 147, h: 46, label: b, size: 13, tone: i === R - 1 ? (i ? "bad" : "code") : "muted", hl: i === R - 1 }));
      if (s >= 5) c.bars({ x: 0, y: 252, w: 630, rowH: 44, labelW: 200, tones: ["bad"], max: 100, fmt: (v) => `more than ${v}%`,
        rows: [{ label: "leakage evidence", values: [65] }, { label: "patch / test level", values: [18] }] }); // §II
    };
  };

  D["topo"] = (fig, k) => {
    const sd = k.slider({ label: "seed", min: 1, max: 8, value: 1, fmt: (v) => `${v}` });
    k.follow(sd, { 1: 1, 3: 2 });
    const c = k.canvas(W, H);
    const N = ["register", "Field", "CharField", "IntegerField", "make_label"];
    const E = [["Field", "CharField"], ["register", "CharField"], ["Field", "IntegerField"]];   // bases and a decorator
    const POS = { register: [20, 40], Field: [170, 40], CharField: [20, 150], IntegerField: [170, 150], make_label: [95, 260] };
    const SUB = { register: "decorator", Field: "class", CharField: "@register, (Field)", IntegerField: "(Field)", make_label: "called in a method" };
    const total = countOrders(N, E);
    return (s) => {
      c.clear();
      const B = {};
      N.forEach((n) => { B[n] = c.box({ x: POS[n][0], y: POS[n][1], w: 130, h: 50, label: n, sub: SUB[n], mono: true, size: 13, subSize: 12, tone: "paper" }); });
      if (s >= 2) E.forEach(([a, b]) => c.connect(B[a], B[b], { tone: "take" }));
      if (s >= 4) c.connect(B.make_label, B.CharField, { dash: true, tone: "muted" });
      if (s >= 3) {
        const ord = topo(N, E, sd.value);
        ord.forEach((n, i) => c.box({ x: 380, y: 24 + i * 54, w: 244, h: 44, label: `${i + 1}. ${n}`, mono: true, size: 13, tone: "code" }));
        c.text(502, 316, `${total} valid orders of 120`, { anchor: "middle", size: 14, weight: 700, tone: "code" });
      } else N.forEach((n, i) => c.box({ x: 380, y: 24 + i * 54, w: 244, h: 44, label: `${i + 1}. ${n}`, mono: true, size: 13, tone: "muted" }));
    };
  };

  // ======================================================= THE BENCHMARK
  D["fixes"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 12, w: 608, h: 42, label: "fresh benchmarks: only issues newer than the model", tone: "paper", size: 14 });
      if (s >= 2) c.bars({ x: 0, y: 66, w: 630, rowH: 40, labelW: 190, tones: ["paper"], max: 520, fmt: (v) => `${v} tasks`,
        rows: [{ label: "SWE-bench Verified", values: [500] }, { label: "fresh SWE-rebench split", values: [110], hl: true }] }); // §I, §V-D
      if (s >= 3) {
        const st = c.box({ x: 16, y: 170, w: 210, h: 60, label: "one-off disguise", sub: "built once", tone: "muted" });
        if (s >= 4) { const tr = c.box({ x: 414, y: 170, w: 210, h: 60, label: "future training data", tone: "bad" }); c.connect(st, tr, { label: "published", tone: "bad" }); }
      }
      if (s >= 5) c.box({ x: 16, y: 262, w: 608, h: 60, label: "SchrodingerRepo: a fresh seeded view every run", sub: "all 500 tasks kept", tone: "code", hl: true });
    };
  };

  D["framework"] = (fig, k) => {
    const sd = k.slider({ label: "seed", min: 1, max: 3, value: 1, fmt: (v) => `${v}` });
    k.follow(sd, { 1: 1, 4: 2 });
    const c = k.canvas(W, H);
    const PATH = ["storage_engine/object_models", "data_core/record_kinds", "persist/item_types"];   // seed 1 from §V-E; 2-3 illustrative
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 130, w: 120, h: 70, label: "agent", tone: "take" });
      c.box({ x: 488, y: 40, w: 136, h: 110, label: "real repository", sub: "unchanged", tone: "muted" });
      c.box({ x: 488, y: 190, w: 136, h: 110, label: "original tests", tone: "code", hl: s === 5 });
      frame(c, k, 170, 40, 280, 260);
      c.text(180, 30, s >= 4 ? `view, seed ${sd.value}: ${PATH[sd.value - 1]}` : "agent-facing view", { size: 12, tone: "muted", mono: s >= 4, maxW: 300, lines: 1 });
      c.arrow(138, 165, 166, 165, { tone: "take" });
      c.arrow(452, 95, 484, 95, { tone: "muted", both: true });
      const L = [["L1", "reworded issue"], ["L2", "renamed paths and symbols"], ["L3", "reordered definitions"], ["L4", "rewritten code near bug"]];
      L.forEach(([a, b], i) => {
        if ((i < 2 && s < 2) || (i >= 2 && s < 3)) return;
        c.box({ x: 186, y: 56 + i * 60, w: 248, h: 48, label: `${a} · ${b}`, size: 13, tone: i < 2 ? "paper" : "predict", hl: s === (i < 2 ? 2 : 3) });
      });
      if (s >= 5) c.arrow(452, 260, 484, 260, { tone: "code" });
    };
  };

  D["level1"] = (fig, k) => {
    const t = k.toggle({ label: "issue text", options: ["original", "rewritten"], value: "original" });
    k.follow(t, { 1: "original", 3: "rewritten" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 16, w: 608, h: 70, tone: t.value === "original" ? "muted" : "paper", size: 14,
        label: t.value === "original" ? "“Overriding get_FOO_display() on a model no longer works”" : "“A model’s own display method is replaced by the generated one”" });
      const g = c.box({ x: 16, y: 130, w: 180, h: 54, label: "generator", sub: "reorder, paraphrase", tone: "take" });
      if (s >= 2) {
        const v = c.box({ x: 230, y: 130, w: 180, h: 54, label: "verifier", sub: "nothing lost?", tone: "predict" });
        c.connect(g, v);
        c.path("M320,186 V214 H106 V188", { tone: "predict", dash: true, arrow: true });
        c.text(213, 230, "refine", { anchor: "middle", size: 12, tone: "predict" });
        if (s >= 3) { const hmn = c.box({ x: 444, y: 130, w: 180, h: 54, label: "human engineer", sub: "final review", tone: "code" }); c.connect(v, hmn); }
      }
      if (s >= 4) c.box({ x: 16, y: 262, w: 608, h: 56, label: "spot check: 100 random instances per level (§III-F)", tone: "code", size: 14 });
    };
  };

  D["level2"] = (fig, k) => {
    const sd = k.toggle({ label: "map", options: ["seed 1", "seed 2", "seed 3"], value: "seed 1" });
    k.follow(sd, { 1: "seed 1" });
    const c = k.canvas(W, H);
    // seed 1: Query→Ledger, Set→Suite from §III-C; Raw and seeds 2-3 illustrative
    const MAP = { "seed 1": { Query: "Ledger", Set: "Suite", Raw: "Plain" }, "seed 2": { Query: "Catalog", Set: "Batch", Raw: "Bare" }, "seed 3": { Query: "Record", Set: "Group", Raw: "Rough" } };
    return (s) => {
      c.clear();
      const m = MAP[sd.value], lo = (w) => w.toLowerCase();
      const ROWS = [
        ["QuerySet", "Query + Set", m.Query + m.Set],
        ["RawQuerySet", "Raw + Query + Set", m.Raw + m.Query + m.Set],
        ["query.py", "query + .py", `${lo(m.Query)}.py`],
        ["len", "built-in", "len (kept)"],
        ["numpy", "third-party", "numpy (kept)"],
      ];
      c.text(16, 16, "repo names", { size: 12, tone: "muted", weight: 600 });
      if (s >= 3) c.text(214, 16, "tokens", { size: 12, tone: "muted", weight: 600 });
      if (s >= 4) c.text(434, 16, "mapped", { size: 12, tone: "muted", weight: 600 });
      ROWS.forEach(([a, b, cc], i) => {
        const keep = i >= 3, y = 26 + i * 54;
        const A = c.box({ x: 16, y, w: 170, h: 44, label: a, mono: true, size: 14, tone: keep && s >= 2 ? "muted" : "paper", dashed: keep && s >= 2 });
        if (keep ? s >= 2 : s >= 3) { const B = c.box({ x: 214, y, w: 190, h: 44, label: b, mono: !keep, size: 13, tone: keep ? "muted" : "take" }); c.connect(A, B, { tone: "muted" });
          if (s >= 4) { const C = c.box({ x: 434, y, w: 190, h: 44, label: cc, mono: true, size: 14, tone: keep ? "muted" : "code", hl: !keep && i < 2 }); c.connect(B, C, { tone: "muted" }); } }
      });
      if (s >= 5) c.box({ x: 16, y: 304, w: 608, h: 44, label: "django/db/models/fields → storage_engine/object_models/entries", mono: true, size: 12, tone: "code" }); // §V-E
    };
  };

  D["translator"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s < 2) { c.box({ x: 16, y: 120, w: 608, h: 80, label: "real repository: never modified", tone: "muted" }); return; }
      c.text(16, 14, "agent sees (virtual)", { size: 12, tone: "muted", weight: 600 });
      const cmdV = c.box({ x: 16, y: 22, w: 296, h: 56, label: "grep render_%s_label", sub: "command", mono: true, size: 13, tone: "take" });
      const tr = c.box({ x: 16, y: 128, w: 608, h: 50, label: "translator", sub: "session notebook", tone: "predict", hl: s >= 4 });
      const cmdR = c.box({ x: 16, y: 230, w: 296, h: 56, label: "grep get_%s_display", sub: "runs on real files", mono: true, size: 13, tone: "paper" });
      c.connect(cmdV, tr, { tone: "take" }); c.connect(tr, cmdR, { tone: "take" });
      if (s >= 3) {
        const outR = c.box({ x: 328, y: 230, w: 296, h: 56, label: "django/db/models/fields/…", sub: "real output", mono: true, size: 12, tone: "paper" });
        const outV = c.box({ x: 328, y: 22, w: 296, h: 56, label: "storage_engine/object_models/entries/…", sub: "what the agent reads", mono: true, size: 12, tone: "take" });
        c.connect(outR, tr, { tone: "paper" }); c.connect(tr, outV, { tone: "paper" });
      }
      if (s >= 4) c.box({ x: 16, y: 304, w: 296, h: 42, label: "command head kept: grep", tone: "code", size: 13 });   // §III-F
      if (s >= 5) c.box({ x: 328, y: 304, w: 296, h: 42, label: "reverse only seen mappings", tone: "code", size: 13 }); // §III-F
    };
  };

  D["level3"] = (fig, k) => {
    const sd = k.slider({ label: "seed", min: 1, max: 6, value: 1, fmt: (v) => `${v}` });
    k.follow(sd, { 1: 1, 3: 2 });
    const c = k.canvas(W, H);
    const RUN1 = ["def slug()", "class Base", "class Child(Base)"], E1 = [["class Base", "class Child(Base)"]];
    const RUN2 = ["def parse()", "def render()"];
    return (s) => {
      c.clear();
      const o1 = s >= 3 ? topo(RUN1, E1, sd.value) : RUN1, o2 = s >= 3 ? topo(RUN2, [], sd.value + 7) : RUN2;
      const items = [["import re", 1], ...o1.map((t) => [t, 0]), ["TIMEOUT = 30", 1], ...o2.map((t) => [t, 0])];
      items.forEach(([t, anchor], i) => c.box({ x: 16, y: 10 + i * 46, w: 300, h: 40, label: t, mono: true, size: 13,
        tone: anchor ? (s >= 2 ? "predict" : "muted") : "paper", hl: !!anchor && s === 2 }));
      c.text(334, 10 + 2 * 46 + 25, "run 1", { size: 13, weight: 700, tone: "paper" });
      c.text(334, 10 + 5.5 * 46 + 25, "run 2", { size: 13, weight: 700, tone: "paper" });
      if (s >= 2) { c.text(334, 35, "anchor", { size: 13, tone: "predict" }); c.text(334, 10 + 4 * 46 + 25, "anchor", { size: 13, tone: "predict" }); }
      if (s >= 3) c.box({ x: 430, y: 20, w: 194, h: 70, label: "random valid order", sub: "Base before Child", tone: "code" });
      if (s >= 4) c.box({ x: 430, y: 120, w: 194, h: 70, label: "golden-patch files", sub: "only these (§IV-C)", tone: "predict" });
      if (s >= 5) c.box({ x: 430, y: 220, w: 194, h: 70, label: "agent edits these", sub: "graded on original", tone: "muted" });
    };
  };

  D["gate"] = (fig, k) => {
    const cand = k.toggle({ label: "candidate", options: ["same behaviour", "breaks code", "fixes bug"], value: "same behaviour" });
    k.follow(cand, { 1: "same behaviour", 3: "breaks code", 4: "fixes bug", 5: "same behaviour" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const v = cand.value, p2p = v !== "breaks code", f2pFail = v !== "fixes bug";
      const reg = c.box({ x: 16, y: 20, w: 250, h: 56, label: "code near the fix", tone: "paper" });
      if (s >= 2) {
        const rw = c.box({ x: 16, y: 106, w: 250, h: 56, label: "rewriting agent", sub: "restate, don't fix", tone: "take" });
        const cd = c.box({ x: 16, y: 192, w: 250, h: 56, label: `candidate: ${v}`, tone: "predict", size: 14 });
        c.connect(reg, rw); c.connect(rw, cd);
      }
      if (s >= 3) c.box({ x: 320, y: 106, w: 304, h: 52, label: "pass-to-pass", sub: p2p ? "all still pass ✓" : "some now fail ✗", tone: p2p ? "code" : "bad" });
      if (s >= 4) {
        c.box({ x: 320, y: 172, w: 304, h: 52, label: "fail-to-pass", sub: f2pFail ? "still fail ✓" : "now pass ✗", tone: f2pFail ? "code" : "bad" });
        const keep = p2p && f2pFail;
        c.box({ x: 320, y: 244, w: 304, h: 56, label: keep ? "keep: same unsolved task" : "reject", tone: keep ? "code" : "bad", hl: true });
      }
      if (s >= 5) c.box({ x: 16, y: 274, w: 250, h: 46, label: "Level 3 uses this gate too", tone: "muted", size: 13 });
    };
  };

  D["patch"] = (fig, k) => {
    const c = k.canvas(W, H);
    const F = ["models/base.py", "fields/__init__.py", "utils.py"];
    return (s) => {
      c.clear();
      c.text(106, 22, "original b_f", { anchor: "middle", size: 12, tone: "muted", weight: 600 });
      c.text(320, 22, "final r′_f", { anchor: "middle", size: 12, tone: "muted", weight: 600 });
      const fin = F.map((f, i) => {
        c.box({ x: 16, y: 34 + i * 66, w: 180, h: 50, label: f, mono: true, size: 12, tone: "muted" });
        const ch = i === 1;
        return c.box({ x: 230, y: 34 + i * 66, w: 180, h: 50, label: f, sub: ch ? "edited" : "same", mono: true, size: 12, tone: ch && s >= 2 ? "predict" : "muted", hl: ch && s === 2 });
      });
      c.box({ x: 16, y: 246, w: 300, h: 40, label: "agent’s printed diff: ignored", tone: "bad", size: 13 });
      if (s >= 2) c.box({ x: 16, y: 300, w: 300, h: 40, label: "C_B = files that changed: 1", tone: "predict", size: 13, mono: true });
      if (s >= 3) { const d = c.box({ x: 444, y: 100, w: 180, h: 50, label: "Diff(b_f, r′_f)", mono: true, size: 13, tone: "take" }); c.connect(fin[1], d); }
      if (s >= 4) c.box({ x: 444, y: 182, w: 180, h: 50, label: "⊕ → submission", mono: true, size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 444, y: 264, w: 180, h: 50, label: "SWE-bench tests", tone: "code" });
    };
  };

  // ======================================================= WHAT IT FINDS
  // Table I: Pass@1 baseline, full disguise
  const FULL = [["GPT-5.4-mini", 46.8, 35.6], ["GPT 5.1", 44.6, 36.2], ["DeepSeek-v4-Flash", 72.8, 66.8], ["Gemini (300 tasks)", 56.7, 42.3]];
  D["full"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.chips({ x: 200, y: 4, size: 12, items: [{ t: "baseline", tone: "muted" }, { t: "full disguise", tone: "bad" }] });
      const n = Math.min(s, 4);
      c.bars({ x: 0, y: 40, w: 630, rowH: 66, labelW: 170, tones: ["muted", "bad"], max: 80, fmt: (v) => `${v.toFixed(1)}%`,
        rows: FULL.slice(0, n).map(([m, a, b], i) => ({ label: `${m} (−${(a - b).toFixed(1)})`, values: [a, b], hl: i === n - 1 && s <= 4 })) });
      if (s >= 5) c.box({ x: 16, y: 312, w: 608, h: 40, label: "same tasks · same tests · only the surface changed", tone: "take", size: 14 });
    };
  };

  // Table I: Pass@1 drop per level [L1, L2, L3, L4, full] and significance marks
  const LV = {
    "GPT 5.1": [[0.0, ""], [7.4, "**"], [1.6, ""], [1.2, ""], [8.4, "**"]],
    "GPT-5.4-mini": [[0.0, ""], [6.4, "**"], [3.4, "*"], [2.2, "*"], [11.2, "**"]],
    "DeepSeek": [[2.0, ""], [6.0, "**"], [0.8, ""], [2.8, "*"], [6.0, "**"]],
  };
  D["levels"] = (fig, k) => {
    const m = k.toggle({ label: "model", options: ["GPT 5.1", "GPT-5.4-mini", "DeepSeek"], value: "GPT 5.1" });
    k.follow(m, { 1: "GPT 5.1", 4: "GPT-5.4-mini", 5: "DeepSeek" });
    const c = k.canvas(W, H);
    const NAMES = ["Level 1 · reword", "Level 2 · rename", "Level 3 · reorder", "Level 4 · rewrite", "all four"];
    return (s) => {
      c.clear();
      const d = LV[m.value];
      const n = s === 1 ? 1 : s === 2 ? 2 : s === 3 ? 4 : 5;
      const rows = d.slice(0, n).map(([v, st], i) => ({ label: `${NAMES[i]} ${st}`, values: [v], hl: i === 1 }));
      if (s >= 5) rows.push({ label: "sum of levels (ours)", values: [d.slice(0, 4).reduce((t, [v]) => t + v, 0)] });
      c.bars({ x: 0, y: 12, w: 630, rowH: 54, labelW: 190, tones: ["bad"], max: 13, fmt: (v) => `−${v.toFixed(1)}`, rows });
      c.text(320, 346, `${m.value}: Pass@1 points lost (Table I) · * p<0.05 · ** p<0.01`, { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  // Table I: % increase under the full disguise (and Level 2 input tokens)
  const COST = {
    actions: [61.5, 76.2, 116.0, 81.09], "input tokens": [161.3, 255.4, 253.6, 136.06],
    "output tokens": [68.6, 86.4, 81.6, 67.66], "Level 2 input": [162.3, 108.2, 218.3, NaN],
  };
  D["cost"] = (fig, k) => {
    const mt = k.toggle({ label: "metric", options: Object.keys(COST), value: "actions" });
    k.follow(mt, { 1: "actions", 2: "input tokens", 4: "Level 2 input", 5: "output tokens" });
    const c = k.canvas(W, H);
    const M = ["GPT 5.1", "GPT-5.4-mini", "DeepSeek", "Gemini (300)"];
    return (s) => {
      c.clear();
      const v = COST[mt.value];
      c.bars({ x: 0, y: 12, w: 630, rowH: 58, labelW: 140, tones: ["predict"], max: 270, fmt: (x) => `+${x}%`,
        rows: M.map((n, i) => ({ label: n, values: [v[i]], hl: s === 2 && i === 1 })).filter((r) => Number.isFinite(r.values[0])) });
      if (s >= 3) c.box({ x: 16, y: 264, w: 608, h: 46, label: "DeepSeek input tokens: 1,046,985 → 3,702,241 per task", tone: "bad", mono: true, size: 13 });
      c.text(320, 340, `${mt.value}: increase over baseline (Table I)`, { anchor: "middle", size: 12, tone: "muted" });
    };
  };

  // §V-B shares of extra actions; navigate (and GPT-5.4-mini edit + test) by our arithmetic
  const SHARE = {
    DeepSeek: [["navigate", 14.9, "paper"], ["search", 17.9, "bridge"], ["read", 19.4, "take"], ["probe", 31.4, "predict"], ["edit + test", 16.5, "code"]],
    "GPT-5.4-mini": [["navigate", 3.0, "paper"], ["search", 33.1, "bridge"], ["read", 41.8, "take"], ["probe", 3.7, "predict"], ["edit + test", 18.4, "code"]],
  };
  D["explore"] = (fig, k) => {
    const m = k.toggle({ label: "model", options: ["DeepSeek", "GPT-5.4-mini"], value: "DeepSeek" });
    k.follow(m, { 1: "DeepSeek", 4: "GPT-5.4-mini" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.chips({ x: 16, y: 10, size: 13, items: ["navigate", "search", "read", "probe", "edit", "test"].map((t, i) => ({ t, tone: i < 4 ? "paper" : "code" })) });
      if (s >= 2) {
        const sh = SHARE[m.value], ex = sh.slice(0, 4).reduce((t, x) => t + x[1], 0), et = sh[4][1];
        const segs = s === 2 ? [["exploring", ex, "paper"], ["edit + test", et, "code"]] : sh;
        const tot = segs.reduce((t, x) => t + x[1], 0);
        let x = 16;
        segs.forEach(([n, v, tone]) => {
          const w = (v / tot) * 608;
          c.box({ x, y: 80, w: Math.max(4, w - 2), h: 70, label: w > 74 ? `${n} ${v.toFixed(1)}%` : "", tone, size: 13 });
          if (w <= 74) c.label(x + w / 2, 176, `${n} ${v.toFixed(1)}%`, { anchor: "middle", size: 12, tone });
          x += w;
        });
        c.text(320, 220, `${m.value}: ${ex.toFixed(1)}% of extra actions go to exploring (§V-B)`, { anchor: "middle", size: 15, weight: 700, tone: "paper" });
      }
      if (s >= 5) {
        c.box({ x: 16, y: 252, w: 296, h: 64, label: "DeepSeek: 46.19 actions", sub: "loses 6.0 points", tone: "code" });       // Table I
        c.box({ x: 328, y: 252, w: 296, h: 64, label: "GPT-5.4-mini: 11.25 actions", sub: "loses 11.2 points", tone: "bad" }); // Table I
      }
    };
  };

  // Table II
  const QA = {
    "GPT-5.4-mini": { sc: [70.35, 70.32, 66.40, 69.30, 69.50, 65.71], act: "+18.15%" },
    DeepSeek: { sc: [72.97, 73.05, 72.52, 72.91, 73.01, 72.42], act: "+43.02%" },
  };
  D["qa"] = (fig, k) => {
    const m = k.toggle({ label: "model", options: ["GPT-5.4-mini", "DeepSeek"], value: "GPT-5.4-mini" });
    k.follow(m, { 1: "GPT-5.4-mini", 3: "DeepSeek", 4: "GPT-5.4-mini" });
    const c = k.canvas(W, H);
    const NAMES = ["baseline", "Level 1", "Level 2", "Level 3", "Level 4", "full disguise"];
    return (s) => {
      c.clear();
      if (s === 1) {
        ["Conan", "Reflex", "Streamlink"].forEach((r, i) => c.box({ x: 16 + i * 206, y: 120, w: 196, h: 80, label: r, sub: "48 questions", tone: "paper" })); // §V-C
        return;
      }
      const d = QA[m.value].sc;
      const idx = s >= 4 ? [0, 1, 2, 3, 4, 5] : [0, 5];
      c.bars({ x: 0, y: 10, w: 630, rowH: s >= 4 ? 46 : 70, labelW: 130, tones: ["paper"], max: 80, fmt: (v) => v.toFixed(2),
        rows: idx.map((i) => ({ label: NAMES[i], values: [d[i]], hl: i === 2 || i === 5 })) });
      if (s >= 5) c.box({ x: 16, y: 300, w: 608, h: 42, label: `${m.value} actions: ${QA[m.value].act} under the full disguise`, tone: "predict", size: 13 });
    };
  };

  D["control"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 8, w: 608, h: 40, label: "110 SWE-rebench tasks, newer than GPT-5.4-mini (§V-D)", tone: "paper", size: 14 });
      if (s >= 2) c.bars({ x: 0, y: 58, w: 630, rowH: 40, labelW: 180, tones: ["code"], max: 100, fmt: (v) => `${v}% (19 of 110)`,
        rows: [{ label: "baseline Pass@1", values: [17.27] }, { label: "disguised Pass@1", values: [17.27] }] });   // Table III
      if (s >= 3) c.bars({ x: 0, y: 150, w: 630, rowH: 34, labelW: 180, tones: ["predict"], max: 100, fmt: (v) => `+${v}%`,
        rows: [{ label: "actions", values: [8.15] }, { label: "input tokens", values: [22.01] }, { label: "output tokens", values: [15.58] }] }); // Table III
      if (s >= 4) c.box({ x: 16, y: 270, w: 296, h: 50, label: "Verified: −11.2 points", sub: "+255.4% input tokens", tone: "bad" }); // Table I
      if (s >= 5) c.box({ x: 328, y: 270, w: 296, h: 50, label: "familiarity, not solvability", sub: "the paper's reading (§V-D)", tone: "take" });
    };
  };

  D["case"] = (fig, k) => {
    const v = k.toggle({ label: "view", options: ["original", "disguised"], value: "original" });
    k.follow(v, { 1: "original", 3: "disguised" });
    const c = k.canvas(W, H);
    // §V-E, condensed
    const ORIG = ["ls", "grep get_.*_display django/db/models/", "open fields/__init__.py", "setattr unconditional → guard it"];
    const DISG = ["ls; list all *.py files", "inspect working_repository/", "search source and tests", "open storage_engine/…/entries/__init__.py", "check tests, config, a repro"];
    return (s) => {
      c.clear();
      const orig = v.value === "original";
      const list = orig ? ORIG.slice(0, s >= 2 ? 4 : 3) : DISG.slice(0, s >= 4 ? 5 : 3);
      list.forEach((t, i) => c.box({ x: 16, y: 10 + i * 48, w: 400, h: 40, label: t, mono: true, size: 12, tone: orig ? "code" : "predict" }));
      if (s < 5) c.text(530, 120, orig ? "37" : "217", { anchor: "middle", size: 48, weight: 700, mono: true, tone: orig ? "code" : "predict" });
      if (s < 5) c.text(530, 150, "actions", { anchor: "middle", size: 14, tone: "muted" });
      if (s >= 5) c.bars({ x: 0, y: 270, w: 630, rowH: 40, labelW: 110, tones: ["predict"], max: 240, fmt: (x) => `${x} actions`,
        rows: [{ label: "original", values: [37] }, { label: "disguised", values: [217], hl: true }] });
    };
  };

  // =========================================================== YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["synonyms lose meaning", "not measured", "bad"],
      ["fresh-task control", "1 model, 19 successes", "predict"],
      ["Gemini subset", "300 most-leaked tasks", "predict"],
      ["significance test", "never named", "predict"],
      ["table slips", "+2.76% and −0.55", "predict"],
      ["Levels 3–4 placement", "golden-patch files only", "predict"],
      ["steelman", "consistent across models", "code"]];
    return (s) => { c.clear(); board(c, R, s, 6, 49); };
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table I Pass@1 [leaderboard, disguised] and rank among these three models
    const P = [["DeepSeek", 72.8, 66.8, 1, 1], ["GPT-5.4-mini", 46.8, 35.6, 2, 3], ["GPT 5.1", 44.6, 36.2, 3, 2]];
    return (s) => {
      c.clear();
      c.chips({ x: 190, y: 4, size: 12, items: [{ t: "leaderboard", tone: "muted" }, { t: "disguised", tone: "bad" }] });
      c.bars({ x: 0, y: 40, w: 630, rowH: 64, labelW: 190, tones: ["muted", "bad"], max: 80, fmt: (v) => `${v}%`,
        rows: P.map(([n, a, b, r1, r2]) => ({ label: s >= 3 ? `${n} (#${r1} → #${r2})` : n, values: [a, s >= 2 ? b : NaN], hl: s >= 3 && r1 !== r2 })) });
      if (s >= 3) c.box({ x: 16, y: 246, w: 296, h: 40, label: "mini vs 5.1: +2.2 → −0.6", tone: "bad", size: 13, mono: true });
      if (s >= 4) c.box({ x: 328, y: 246, w: 296, h: 40, label: "actions +61.5% to +116.0%", tone: "predict", size: 13 });
      if (s >= 5) c.box({ x: 16, y: 300, w: 608, h: 44, label: "our verdict: test candidates on your own repo", tone: "take", hl: true, size: 14 });
    };
  };

  D["ideas"] = (fig, k) => {
    const c = k.canvas(W, H);
    // positions are our guesses: [effort 0-5, payoff 0-5]
    const I = [["IDE / LSP tools", 3.8, 3.2], ["other languages", 4.2, 3.8], ["meaning-loss score", 2.2, 3.6], ["bigger fresh control", 2.8, 4.5], ["SchrodingerLibri", 3.6, 2.6]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 5, ymin: 0, ymax: 5, w: 640, h: 360, xlabel: "effort (our guess)", ylabel: "what you learn (our guess)", xFmt: () => "", yFmt: () => "" });
      I.forEach(([n, x, y], i) => {
        if (s < i + 1) return;
        c.dot(p.X(x), p.Y(y), { r: s === i + 1 ? 8 : 6, tone: i < 2 ? "paper" : "take" });
        c.label(p.X(x), p.Y(y) - 14, n, { anchor: "middle", size: 13, weight: s === i + 1 ? 700 : 400, tone: i < 2 ? "paper" : "take" });
      });
    };
  };
})();
