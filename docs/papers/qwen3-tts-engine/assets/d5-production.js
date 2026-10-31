/* Drawings: "Toward production" and "Your move". External numbers are from the sources named in each page's caption. */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;
  const board = (rows, split) => (fig, k) => { const c = k.canvas(W, H); return (s) => V.board(c, rows, s, { split }); };

  D["missing"] = board([
    ["Network front end", "none: a Python object + loop", "bad"],
    ["Voices", "one stored voice per model", "predict"],
    ["Per-request seed", "ignored: one RNG stream", "muted"],
    ["Scale-out", "one GPU, one process", "predict"],
    ["Licence", "no LICENSE file", "bad"],
    ["Evidence files", "results/, tests not in repo", "bad"],
  ], 250);

  D["front-end"] = (fig, k) => {
    const f = k.slider({ label: "frames per packet", min: 1, max: 8, step: 1, value: 1 });
    k.follow(f, { 4: 1, 5: 4 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const opts = [["HTTP chunked PCM", "OpenAI speech API", "paper"], ["WebSocket frames", "vLLM-Omni Qwen3-TTS", "take"], ["gRPC stream", "Triton CosyVoice2", "bridge"]];
      opts.forEach(([a, b, tone], i) => { if (s >= i + 1 || s >= 4) c.box({ x: 8 + i * 210, y: 20, w: 200, h: 64, label: a, sub: b, tone, hl: s === i + 1 }); });
      if (s >= 4) {
        const n = f.value, bytes = n * 1920 * 2;
        c.box({ x: 8, y: 110, w: 624, h: 56, label: `${n} × 1,920 samples × 2 B = ${bytes.toLocaleString("en-US")} B = ${n * 80} ms`, mono: true, size: 14, tone: "predict", hl: s === 4 });
      }
      if (s >= 5) {
        c.box({ x: 8, y: 190, w: 300, h: 56, label: "24 kHz × 16 bit = 48 KB/s", sub: "per stream, PCM", tone: "paper", hl: true });
        c.box({ x: 324, y: 190, w: 308, h: 56, label: "Opus for phones and the open internet", size: 13, tone: "code", hl: true });
      }
    };
  };

  D["serve-loop"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const socks = [0, 1, 2].map((i) => c.box({ x: 8, y: 30 + i * 70, w: 130, h: 50, label: `socket ${i + 1}`, tone: "paper", hl: s === 1 }));
      const add = c.box({ x: 180, y: 100, w: 140, h: 50, label: "add_request", sub: "lock, enqueue", tone: "paper", hl: s === 1 });
      socks.forEach((b) => c.connect(b, add, { route: "elbow" }));
      const eng = c.box({ x: 360, y: 90, w: 130, h: 70, label: "engine thread", sub: "step() loop", tone: "take", hl: s === 2 });
      c.connect(add, eng);
      if (s >= 3) {
        const qs = [0, 1, 2].map((i) => c.box({ x: 530, y: 30 + i * 70, w: 102, h: 50, label: `queue ${i + 1}`, tone: "bridge", hl: s === 3 }));
        qs.forEach((q) => c.connect(eng, q, { route: "elbow" }));
      }
      if (s >= 4) c.box({ x: 8, y: 250, w: 624, h: 40, label: "RTF 0.58: a 25 s reply is ready in ~15 s → buffer, don't block", size: 13, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 302, w: 624, h: 40, label: "no per-request work on the engine thread", size: 13, tone: "bad", hl: true });
    };
  };

  D["multi-voice"] = board([
    ["Per voice", "prompt parts · decoder snapshot · prefix K/V", "take"],
    ["Prefix slots", "max 8 (voice, language) pairs", "predict"],
    ["Other voices", "must match the first layout, else assert", "bad"],
    ["Languages on the fast path", "English, Spanish, German only", "bad"],
    ["To build", "voice registry, padded refs, all languages", "code"],
  ], 230);

  D["capacity"] = (fig, k) => {
    const rps = k.slider({ label: "requests per second", min: 1, max: 100, step: 1, value: 10 });
    const sec = k.slider({ label: "seconds of audio each", min: 2, max: 60, step: 1, value: 25 });
    const M = k.toggle({ label: "model", options: ["0.6B", "1.7B"], value: "0.6B" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const off = rps.value * sec.value, cap = M.value === "0.6B" ? 576 : 480, plan = cap * 0.7, gpus = Math.max(1, Math.ceil(off / plan));
      c.box({ x: 8, y: 14, w: 624, h: 50, label: `${rps.value} req/s × ${sec.value} s = ${off.toLocaleString("en-US")} audio-seconds per second`, mono: true, size: 14, tone: "paper", hl: s === 1 });
      if (s >= 2) c.text(8, 92, `= ${off} offered streams`, { size: 14, weight: 700, tone: "paper" });
      if (s >= 3) c.box({ x: 8, y: 110, w: 300, h: 50, label: `one A100: ${cap} offered`, sub: `${M.value}, TTFA p99 < 100 ms`, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 324, y: 110, w: 308, h: 50, label: `plan at 70%: ${Math.round(plan)} per GPU`, size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) {
        for (let i = 0; i < Math.min(gpus, 20); i++) c.box({ x: 8 + i * 31, y: 190, w: 26, h: 40, tone: "predict", r: 4 });
        c.text(8, 268, `${gpus} A100${gpus > 1 ? "s" : ""}${gpus > 20 ? " (first 20 drawn)" : ""}`, { size: 18, weight: 700, tone: "predict" });
      }
    };
  };

  D["other-gpus"] = (fig, k) => {
    const G = k.toggle({ label: "GPU", options: ["A100 80GB", "L40S 48GB", "L4 24GB"], value: "A100 80GB" });
    k.follow(G, { 1: "A100 80GB", 4: "L4 24GB" });
    const c = k.canvas(W, H);
    const spec = { "A100 80GB": [80, 2039], "L40S 48GB": [48, 864], "L4 24GB": [24, 300] }; // NVIDIA product pages (found by us)
    return (s) => {
      c.clear();
      const [mem, bw] = spec[G.value], fixed = 9, per = (88.08e6 + 3 * 2 ** 20) / 1e9, seats = Math.floor((mem - fixed) / per);
      c.box({ x: 8, y: 14, w: 624, h: 44, label: `${G.value}: (${mem} − ~${fixed} GB fixed) ÷ ${(per * 1000).toFixed(0)} MB per seat ≈ ${seats} seats`, mono: true, size: 13, tone: "take", hl: s === 1 || s === 4 });
      if (s >= 2) c.text(8, 86, "fixed cost from the smoke test: 14.9 GB at 64 seats", { size: 12, tone: "muted" });
      if (s >= 3) {
        V.tbars(c, Object.entries(spec).map(([n, [, b]]) => [n, b, n === G.value, n !== G.value]), { y: 110, h: 140, labelW: 120, tone: "bridge", fmt: (v) => `${v} GB/s`, max: 2200 });
        c.text(632, 104, "memory bandwidth", { size: 12, anchor: "end", weight: 700 });
      }
      if (s >= 5) c.box({ x: 8, y: 280, w: 624, h: 50, label: "estimates only: measured on the A100 alone", size: 14, tone: "bad", hl: true });
    };
  };

  D["failure-modes"] = board([
    ["Ramblers", "688-frame cap: 55 s for 26 s text", "predict"],
    ["Silent recompiles", "grep recompile_limit: must be 0", "bad"],
    ["Slow boots", "3–5 min warm, ~10 min cold", "muted"],
    ["One thread", "an exception stops every stream", "bad"],
    ["Rate drift", "long text + long reference", "predict"],
  ], 220);

  D["monitoring"] = (fig, k) => {
    const c = k.canvas(W, H);
    const tiles = [["TTFA p99", "98.2 ms", "predict", 1], ["RTF p99", "0.62", "predict", 1], ["step", "45.8 ms", "take", 2], ["rejected", "0", "code", 3], ["ended_by_cap", "≥ 1 per sweep", "bad", 4], ["pad rows", "LM 0.7–3% · dec 32%", "muted", 5], ["recompile warnings", "0", "code", 6]];
    return (s) => {
      c.clear();
      c.text(8, 22, "a dashboard filled with the validated 0.6B run (576 offered)", { size: 13, weight: 700 });
      tiles.forEach(([n, v, tone, at], i) => { if (s >= at) c.box({ x: 8 + (i % 3) * 210, y: 40 + Math.floor(i / 3) * 96, w: 200, h: 80, label: v, sub: n, size: 17, tone, hl: s === at }); });
    };
  };

  D["pin-versions"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.chips({ x: 8, y: 20, items: ["torch 2.8.0", "transformers 4.57.3", "flash-attn 2.8.3", "triton 3.4.0", "qwen-tts 0.1.1"].map((t) => ({ t, tone: "paper", hl: s === 1 })), size: 14, h: 34 });
      if (s >= 2) c.box({ x: 8, y: 110, w: 624, h: 40, label: "Transformers 5: not supported by upstream", size: 13, tone: "bad", hl: s === 2 });
      if (s >= 3) c.chips({ x: 8, y: 166, items: ["register_generator_state", "graph memory pools", "dynamo recompile limits"].map((t) => ({ t, tone: "take", hl: s === 3 })), size: 13 });
      if (s >= 4) c.box({ x: 8, y: 240, w: 624, h: 44, label: "PyTorch main: register_generator_state deprecated, a no-op", size: 14, tone: "bad", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 300, w: 624, h: 44, label: "upgrade → re-run test_rng: are draws still fresh?", size: 14, tone: "code", hl: true });
    };
  };

  D["alternatives"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ser = [
        { x: [1, 16, 64], y: [70.6, 451, 1128], tone: "take", dots: true, label: "vLLM-Omni Qwen3-TTS, mean, 2×H20", dim: s < 2 },
        { x: [1, 16, 64], y: [36, 57, 158], tone: "code", dots: true, label: "nanovllm-voxcpm p50, 4090", dim: s < 3 },
        { x: [1, 2, 4], y: [220, 477, 1107], tone: "bridge", dots: true, label: "CosyVoice2 Triton avg, L20", dim: s < 4 }];
      const p = c.plot({ series: ser, xlog: true, xmin: 1, xmax: 1000, ymin: 0, ymax: 1200, xlabel: "concurrent requests (log)", ylabel: "first audio (ms)", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      if (s === 1) c.label(p.X(30), p.Y(1000), "vLLM-Omni: official Qwen3-TTS route", { size: 13, tone: "take", weight: 700 });
      if (s >= 5) { c.dot(p.X(335), p.Y(98.2), { r: 8, tone: "predict" }); c.label(p.X(335), p.Y(260), "this engine p99, ~335 live, A100", { size: 13, tone: "predict", weight: 700, anchor: "end" }); }
    };
  };

  D["indic-fit"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(160, 22, "Qwen3-TTS (this engine)", { size: 13, anchor: "middle", weight: 700, tone: "take" });
      c.text(480, 22, "VoxCPM2 (your dubbing base)", { size: 13, anchor: "middle", weight: 700, tone: "code" });
      const rows = [["10 languages, no Indic", "30 languages incl. Hindi", 1], ["12.5 frames/s × 16 calls", "6.25 patches/s × 10 Euler steps", 2], ["seats · graphs · prefix reuse", "same ideas apply", 3], ["stateful codec decoder", "causal AudioVAE, stateful too", 4], ["TTFA-bound serving", "dubbing: throughput-bound", 5]];
      rows.forEach(([a, b, at], i) => {
        if (s < at) return;
        c.box({ x: 8, y: 40 + i * 62, w: 304, h: 50, label: a, size: 13, tone: i === 0 ? "bad" : "take", hl: s === at });
        c.box({ x: 328, y: 40 + i * 62, w: 304, h: 50, label: b, size: 13, tone: "code", hl: s === at });
      });
    };
  };

  D["reuse"] = board([
    ["1 · Profile", "flat across batch = overhead", "predict"],
    ["2 · Graph the whole step", "sampling inside, RNG registered", "take"],
    ["3 · Stateful codec", "carry history, never re-window", "bridge"],
    ["4 · Cheap arrivals", "cached prefix, graphed prefill", "paper"],
    ["5 · Measure honestly", "open-loop, p99, seed-spread gate", "code"],
  ], 230);

  D["code-map"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = ["engine/", "  engine.py           Q3Engine: add_request · step · pop_events   372", "  talker.py           seats · paged KV · frame graphs · sampling    196",
      "  code_predictor.py   15 steps per frame                              82", "  arrivals.py         graphed admission · fast lane                  253",
      "  decoder_stream.py   exact streaming codec · snapshots              414", "  bench_open.py       open-loop load harness                         225", "eval/  scripts/  infer.py"];
    const HL = { 1: [1], 2: [2], 3: [3, 4], 4: [5], 5: [6, 7] };
    return (s) => { c.clear(); V.code(c, L, HL[s] || [], { y: 44, lh: 36, size: 12 }); };
  };

  D["run-it"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = ["python infer.py --text \"Your order will …\" --out out.wav", "python infer.py --text \"…\" --ref-wav me.wav --ref-text \"…\"", "scripts/run_load.sh 0.6B",
      "scripts/run_validate.sh 0.6B 576", "# needs one A100-80GB; ~7.4 GB of weights"];
    const HL = { 1: [0], 2: [1], 3: [2], 4: [3], 5: [4] };
    return (s) => { c.clear(); V.code(c, L, HL[s] || [], { y: 60, lh: 44, size: 13 }); c.text(632, 340, "not run by us", { size: 12, anchor: "end", tone: "muted" }); };
  };

  D["reviewer"] = board([
    ["Evidence", "results/, tests missing from repo", "bad"],
    ["Fast lane", "README vs code disagree", "predict"],
    ["Languages", "3 registered on the fast path", "bad"],
    ["Load shape", "one voice, 25 s English", "predict"],
    ["Hygiene", "dead cp_attn.py · hard-coded paths", "muted"],
    ["Steelman", "pitfalls documented with numbers", "code"],
  ], 220);

  D["verdict"] = board([
    ["Learn from it", "yes: every trick measured", "code"],
    ["Deploy as is", "no: front end, voices, licence", "bad"],
    ["Copy the method", "yes: profile, graph, state, test", "code"],
    ["Indic dubbing", "borrow the design for VoxCPM2", "take"],
    ["Reuse the code", "ask for a licence first", "predict"],
  ], 220);

  D["try-next"] = (fig, k) => {
    const c = k.canvas(W, H);
    const I = [[0.1, 0.75, "profile your TTS"], [0.55, 0.85, "graph a VoxCPM2 step"], [0.45, 0.6, "stateful AudioVAE decode"], [0.3, 0.55, "open-loop harness"], [0.75, 0.5, "WebSocket front end"]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: "effort →", ylabel: "what you learn →", xFmt: () => "", yFmt: () => "" });
      I.forEach(([x, y, l], i) => {
        if (s < i + 1) return;
        c.dot(p.X(x), p.Y(y), { r: s === i + 1 ? 9 : 6, tone: s === i + 1 ? "predict" : "paper" });
        c.label(p.X(x) + 10, p.Y(y) - 14, l, { size: 13, tone: s === i + 1 ? "predict" : "paper", weight: s === i + 1 ? 700 : 400 });
      });
    };
  };
})();
