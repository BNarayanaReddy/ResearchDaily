/* Research Daily explainer engine + drawing kit.
 *
 * Turns the <article class="rd-page"> blocks of a paper page into a click-through
 * lesson: one question and one drawing per screen, with a step rail on the side.
 * Each Next press reveals one step and redraws the figure for that step.
 *
 * Paper drawings live in the paper folder (assets/drawings.js) and register:
 *
 *   window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
 *   RD.drawings["my-figure"] = function (fig, k) {
 *     const c = k.canvas(640, 300);             // theme-aware SVG canvas
 *     return function render(step) {            // called on every step change
 *       c.clear();
 *       c.box({ x: 20, y: 40, w: 160, h: 60, label: "Encoder", tone: "take", hl: step === 2 });
 *     };
 *   };
 *
 * Without JavaScript the pages simply stack, with every step visible.
 */
(function () {
  "use strict";
  const RD = (window.RD = window.RD || {});
  RD.drawings = RD.drawings || {};
  const NS = "http://www.w3.org/2000/svg";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // ------------------------------------------------------------ helpers
  function h(tag, attrs, kids) {
    const svgTags = /^(svg|g|path|line|rect|circle|ellipse|text|tspan|polyline|polygon|defs|marker|title)$/;
    const n = svgTags.test(tag) ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    [].concat(kids || []).forEach((c) => c != null && n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }
  const fmtNum = (v) => {
    const a = Math.abs(v);
    if (a >= 1e12) return +(v / 1e12).toPrecision(3) + "T";
    if (a >= 1e9) return +(v / 1e9).toPrecision(3) + "B";
    if (a >= 1e6) return +(v / 1e6).toPrecision(3) + "M";
    if (a >= 1e4) return +(v / 1e3).toPrecision(3) + "k";
    if (a < 1e-2 && v !== 0) return v.toExponential(0);
    return +v.toFixed(3) + "";
  };
  let uid = 0;

  // ---------------------------------------------------------- the canvas
  // All colours come from CSS classes in extra.css, so drawings follow the
  // light/dark toggle without redrawing. Tones: ink, muted, paper (blue),
  // code (green), take (violet), predict (amber), bridge (teal), bad (red).
  function makeCanvas(fig, w, hgt, kit) {
    const id = "rdc" + ++uid;
    const svg = h("svg", { class: "rd-svg rdx-svg", viewBox: `0 0 ${w} ${hgt}`, role: "img",
      "aria-label": fig.getAttribute("aria-label") || "Drawing" });
    fig.appendChild(svg);
    const fs = () => (kit.narrow ? 1.22 : 1);
    const dimCls = (o) => (o.dim ? " rdx-dim" : "") + (o.hl ? " rdx-hl" : "") + (o.cls ? " " + o.cls : "");
    const marker = (tone) => {
      const mid = `${id}-a-${tone}`;
      if (!svg.querySelector("#" + mid)) {
        let defs = svg.querySelector("defs");
        if (!defs) { defs = h("defs"); svg.insertBefore(defs, svg.firstChild); }
        defs.appendChild(h("marker", { id: mid, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
          [h("path", { d: "M0,0 L10,5 L0,10 z", class: `f-${tone}` })]));
      }
      return `url(#${mid})`;
    };
    const c = {
      svg, w, h: hgt,
      clear() { Array.from(svg.childNodes).forEach((n) => { if (n.nodeName !== "defs") svg.removeChild(n); }); return c; },
      add(node, g) { (g || svg).appendChild(node); return node; },
      group(o = {}) { return c.add(h("g", { class: dimCls(o).trim() || undefined, transform: o.transform }), o.g); },
      text(x, y, str, o = {}) {
        return c.add(h("text", { x, y, "text-anchor": o.anchor || "start", "font-size": (o.size || 14) * fs(),
          "font-weight": o.weight, class: `${o.tone ? "t-" + o.tone : ""}${o.mono ? " mono" : ""}${dimCls(o)}`.trim() || undefined,
          text: String(str) }), o.g);
      },
      box(o) {
        const tone = o.tone || "muted", r = o.r ?? 8;
        const g = c.group({ g: o.g, dim: o.dim, hl: o.hl });
        c.add(h("rect", { x: o.x, y: o.y, width: o.w, height: o.h, rx: r,
          class: `f-${o.fill || tone} ${o.solid ? "" : o.hl ? "soft" : "softer"} s-${tone}`, "stroke-width": o.hl ? 2.4 : 1.2,
          "stroke-dasharray": o.dashed ? "5 4" : undefined }), g);
        const cy = o.y + o.h / 2 + (o.sub ? -4 : 5);
        if (o.label != null) c.text(o.x + o.w / 2, cy, o.label, { anchor: "middle", size: o.size || 15, weight: 600, mono: o.mono, g });
        if (o.sub != null) c.text(o.x + o.w / 2, cy + 18 * fs(), o.sub, { anchor: "middle", size: o.subSize || 12, tone: "muted", mono: o.monoSub ?? true, g });
        return g;
      },
      line(x1, y1, x2, y2, o = {}) {
        return c.add(h("line", { x1, y1, x2, y2, class: `s-${o.tone || "muted"}${dimCls(o)}`, "stroke-width": o.width || 1.5,
          "stroke-dasharray": o.dash ? "5 4" : undefined }), o.g);
      },
      arrow(x1, y1, x2, y2, o = {}) {
        const tone = o.tone || "muted";
        const g = c.group({ g: o.g, dim: o.dim, hl: o.hl });
        c.add(h("line", { x1, y1, x2, y2, class: `s-${tone}`, "stroke-width": o.width || 1.6, "marker-end": marker(tone),
          "stroke-dasharray": o.dash ? "5 4" : undefined }), g);
        if (o.label) c.text((x1 + x2) / 2 + (o.dx || 0), (y1 + y2) / 2 + (o.dy ?? -7), o.label, { anchor: "middle", size: o.size || 12, tone: "muted", g });
        return g;
      },
      path(d, o = {}) {
        return c.add(h("path", { d, class: `${o.fill ? "f-" + o.fill : "f-none"} s-${o.tone || "muted"}${o.soft ? " soft" : ""}${dimCls(o)}`,
          "stroke-width": o.width || 1.6, "stroke-dasharray": o.dash ? "5 4" : undefined }), o.g);
      },
      dot(x, y, o = {}) {
        return c.add(h("circle", { cx: x, cy: y, r: o.r || 4, class: `f-${o.tone || "paper"}${dimCls(o)}` }), o.g);
      },
      // Row of token chips that wraps at maxW. items: [{t, tone, dashed, dim, hl}]
      chips(o) {
        const size = (o.size || 13) * fs(), hh = o.h || 26 * fs(), gap = o.gap || 6, maxW = o.maxW || c.w - o.x - 10;
        let x = o.x, y = o.y; const out = [];
        o.items.forEach((it) => {
          const tw = String(it.t).length * size * 0.62 + 14;
          if (x + tw > o.x + maxW && x > o.x) { x = o.x; y += hh + gap; }
          const g = c.group({ g: o.g, dim: it.dim, hl: it.hl });
          c.add(h("rect", { x, y, width: tw, height: hh, rx: 5, class: `f-${it.tone || "muted"} ${it.hl ? "soft" : "softer"} s-${it.tone || "muted"}`,
            "stroke-dasharray": it.dashed ? "4 3" : undefined, "stroke-width": it.hl ? 2 : 1 }), g);
          c.add(h("text", { x: x + tw / 2, y: y + hh / 2 + size * 0.36, "text-anchor": "middle", "font-size": size, class: `mono ${it.tone ? "t-" + it.tone : ""}`, text: it.t }), g);
          out.push({ x, y, w: tw, h: hh }); x += tw + gap;
        });
        out.bottom = y + hh; return out;
      },
      // Grid of numbers. data: 2-D array. tone(i, j, v) -> tone name or null.
      matrix(o) {
        const cw = o.cell || 44, ch = o.cellH || 30, fmt = o.fmt || ((v) => (typeof v === "number" ? v.toFixed(2) : v));
        const g = c.group({ g: o.g });
        (o.colLabels || []).forEach((t, j) => c.text(o.x + j * cw + cw / 2, o.y - 8, t, { anchor: "middle", size: 11, tone: "muted", mono: true, g }));
        o.data.forEach((row, i) => {
          if (o.rowLabels) c.text(o.x - 8, o.y + i * ch + ch / 2 + 4, o.rowLabels[i], { anchor: "end", size: 12, mono: true, g });
          row.forEach((v, j) => {
            const tone = o.tone ? o.tone(i, j, v) : null;
            c.add(h("rect", { x: o.x + j * cw + 1, y: o.y + i * ch + 1, width: cw - 2, height: ch - 2, rx: 3,
              class: tone ? `f-${tone} soft s-${tone}` : "f-muted softer s-faint", "stroke-width": 1 }), g);
            c.text(o.x + j * cw + cw / 2, o.y + i * ch + ch / 2 + 4, v === null ? "" : fmt(v, i, j), { anchor: "middle", size: o.size || 11, mono: true, g });
          });
        });
        return g;
      },
      // Horizontal bars. rows: [{label, values: [...]}]; tones: one per value series.
      bars(o) {
        const rowH = o.rowH || 30, lw = o.labelW || 140, bw = (o.w || c.w - o.x - 60) - lw, max = o.max || Math.max(...o.rows.flatMap((r) => r.values));
        const n = o.rows[0].values.length, barH = (rowH - 8) / n, fmt = o.fmt || fmtNum;
        const g = c.group({ g: o.g });
        o.rows.forEach((r, i) => {
          const y = o.y + i * rowH;
          c.text(o.x + lw - 8, y + rowH / 2 + 3, r.label, { anchor: "end", size: 12, dim: r.dim, g });
          r.values.forEach((v, k) => {
            const tone = (o.tones || ["muted", "paper", "code"])[k];
            c.add(h("rect", { x: o.x + lw, y: y + 3 + k * barH, width: Math.max(1, (v / max) * bw), height: barH - 2,
              class: `f-${tone}${r.dim ? " rdx-dim" : ""}${r.hl ? "" : ""}` }), g);
            c.text(o.x + lw + (v / max) * bw + 5, y + 3 + k * barH + barH - 4, fmt(v), { size: 11, tone, mono: true, dim: r.dim, g });
          });
        });
        return g;
      },
      // Line/scatter plot with optional log axes. series: [{x:[], y:[], tone, dots, dash, label}]
      plot(o) {
        const X0 = o.x || 0, Y0 = o.y || 0, W = o.w || c.w, H = o.h || c.h;
        const m = { l: 56, r: 14, t: 12, b: 42 };
        const xlog = !!o.xlog, ylog = !!o.ylog;
        const vals = (k, log) => o.series.flatMap((s) => s[k]).filter((v) => Number.isFinite(v) && (!log || v > 0));
        const tx = xlog ? Math.log10 : (v) => v, ty = ylog ? Math.log10 : (v) => v;
        const x0 = tx(o.xmin ?? Math.min(...vals("x", xlog))), x1 = tx(o.xmax ?? Math.max(...vals("x", xlog)));
        const y0 = ty(o.ymin ?? Math.min(...vals("y", ylog))), y1 = ty(o.ymax ?? Math.max(...vals("y", ylog)));
        const X = (v) => X0 + m.l + ((tx(v) - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
        const Y = (v) => Y0 + H - m.b - ((ty(v) - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
        const ticks = (a, b, log) => {
          if (log) { const t = []; for (let e = Math.ceil(a - 1e-9); e <= Math.floor(b + 1e-9); e++) t.push(10 ** e); return t; }
          const raw = (b - a) / 5, p = 10 ** Math.floor(Math.log10(raw || 1)), s = [1, 2, 5, 10].map((q) => q * p).find((q) => (b - a) / q <= 6) || p * 10;
          const t = []; for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) t.push(+v.toFixed(10)); return t;
        };
        const g = c.group({ g: o.g });
        ticks(x0, x1, xlog).forEach((v) => { c.line(X(v), Y0 + m.t, X(v), Y0 + H - m.b, { tone: "faint", width: 0.6, g }); c.text(X(v), Y0 + H - m.b + 16, fmtNum(v), { anchor: "middle", size: 11, tone: "muted", g }); });
        ticks(y0, y1, ylog).forEach((v) => { c.line(X0 + m.l, Y(v), X0 + W - m.r, Y(v), { tone: "faint", width: 0.6, g }); c.text(X0 + m.l - 6, Y(v) + 4, fmtNum(v), { anchor: "end", size: 11, tone: "muted", g }); });
        if (o.xlabel) c.text(X0 + (m.l + W - m.r) / 2, Y0 + H - 6, o.xlabel, { anchor: "middle", size: 12, g });
        if (o.ylabel) c.add(h("text", { x: X0 + 14, y: Y0 + (m.t + H - m.b) / 2, "text-anchor": "middle", "font-size": 12 * fs(),
          transform: `rotate(-90 ${X0 + 14} ${Y0 + (m.t + H - m.b) / 2})`, text: o.ylabel }), g);
        o.series.forEach((s) => {
          const pts = s.x.map((xv, i) => [xv, s.y[i]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
          if (!s.dotsOnly) c.add(h("polyline", { points: pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(" "), class: `f-none s-${s.tone || "paper"}${s.dim ? " rdx-dim" : ""}`,
            "stroke-width": s.width || 2.2, "stroke-dasharray": s.dash ? "6 4" : undefined }), g);
          if (s.dots || s.dotsOnly) pts.forEach(([a, b]) => c.dot(X(a), Y(b), { tone: s.tone || "paper", r: 3.6, dim: s.dim, g }));
          if (s.label && pts.length) { const [a, b] = pts[pts.length - 1]; c.text(X(a) - 4, Y(b) - 9, s.label, { anchor: "end", size: 12, tone: s.tone || "paper", dim: s.dim, g }); }
        });
        return { X, Y, g };
      },
    };
    return c;
  }

  // ----------------------------------------------------------- the kit
  function makeKit(page, fig, ctl) {
    const kit = {
      step: 1, steps: 1, narrow: false,
      canvas: (w, hgt) => makeCanvas(fig, w, hgt, kit),
      on: (n) => kit.step >= n,
      is: (...ns) => ns.includes(kit.step),
      fmt: fmtNum,
      h,
      redraw: () => kit._render && kit._render(kit.step),
      slider(o) {
        const input = h("input", { type: "range", min: o.min, max: o.max, step: o.step || 1, value: o.value, "aria-label": o.label });
        const out = h("output", { class: "rdx-read" });
        const show = () => (out.textContent = o.fmt ? o.fmt(+input.value) : input.value);
        input.addEventListener("input", () => { show(); o.onInput && o.onInput(+input.value); kit.redraw(); });
        ctl.appendChild(h("label", { class: "rdx-slider" }, [h("span", { text: o.label }), input, out]));
        ctl.hidden = false; show();
        return { get value() { return +input.value; }, set value(v) { input.value = v; show(); }, input };
      },
      toggle(o) {
        let value = o.value ?? o.options[0];
        const wrap = h("div", { class: "rdx-seg", role: "group", "aria-label": o.label || "Options" });
        const btns = o.options.map((opt) => h("button", { type: "button", text: opt, "aria-pressed": String(opt === value),
          onclick: () => { value = opt; btns.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === opt))); o.onChange && o.onChange(opt); kit.redraw(); } }));
        btns.forEach((b) => wrap.appendChild(b));
        ctl.appendChild(wrap); ctl.hidden = false;
        const set = (v) => { value = v; btns.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === v))); };
        return { get value() { return value; }, set value(v) { set(v); } };
      },
      // Let the step sequence drive a control while the reader can still override it:
      //   const lang = k.toggle({...}); k.follow(lang, { 1: "English", 4: "Telugu" });
      // On each step change the control jumps to the value for the latest step <= current.
      follow(control, byStep) {
        (kit._follow = kit._follow || []).push([control, byStep]);
      },
      _applyFollow(step) {
        (kit._follow || []).forEach(([control, byStep]) => {
          const keys = Object.keys(byStep).map(Number).filter((n) => n <= step).sort((a, b) => b - a);
          if (keys.length) control.value = byStep[keys[0]];
        });
      },
      readout(text) { const s = h("span", { class: "rdx-read", text: text || "" }); ctl.appendChild(s); ctl.hidden = false; return s; },
      html(el) { fig.appendChild(el); return el; },
    };
    return kit;
  }

  // ------------------------------------------------------------- engine
  function init() {
    const content = document.querySelector(".md-content__inner") || document.querySelector("article.md-content__inner");
    if (!content || content.dataset.rdx) return;
    const pages = Array.from(content.querySelectorAll("article.rd-page"));
    if (!pages.length) return;
    content.dataset.rdx = "1";
    const cover = content.querySelector(".rd-cover");
    const paperId = (cover && cover.dataset.arxiv) || location.pathname;
    const key = (k) => `rd:x:${paperId}:${k}`;

    // app shell
    const app = h("div", { class: "rdx", "data-mode": store.get(key("mode")) || "full" });
    const chapters = h("select", { class: "rdx-chapters", "aria-label": "Jump to page" });
    const counter = h("span", { class: "rdx-count" });
    const modeBtn = h("button", { type: "button", class: "rdx-modebtn" });
    const allBtn = h("button", { type: "button", class: "rdx-allbtn", text: "One long page" });
    const bar = h("div", { class: "rdx-bar" }, [chapters, h("span", { class: "rdx-spacer" }), modeBtn, allBtn, counter]);
    const progress = h("div", { class: "rdx-progress" }, [h("i")]);
    pages[0].parentNode.insertBefore(app, pages[0]);
    app.append(bar, progress);
    pages.forEach((p) => app.appendChild(p));

    // lay out every page
    const model = pages.map((p, i) => layout(p, i));
    function layout(p, i) {
      if (!p.id) p.id = "page-" + (i + 1);
      const isCover = p.classList.contains("rd-cover");
      const isQuiz = p.hasAttribute("data-quiz");
      const q = p.querySelector("h2");
      if (isCover) return { el: p, cover: true, steps: 1, part: p.dataset.part || "Start", title: "Start" };
      const crumb = p.querySelector(".rd-crumb");
      const cap = p.querySelector(".rd-cap");
      const take = p.querySelector(".rd-take");
      const stat = p.querySelector(".rd-static");
      let ol = Array.from(p.children).find((n) => n.tagName === "OL");
      const quizList = isQuiz ? p.querySelector("ul.task-list, ul") : null;

      const main = h("div", { class: "rdx-main" });
      const rail = h("aside", { class: "rdx-rail" });
      const figbox = h("div", { class: "rdx-figbox" });
      const ctl = h("div", { class: "rdx-ctl", hidden: true });
      const fig = h("div", { class: "rdx-fig", "aria-label": p.dataset.alt || (q ? q.textContent.replace("¶", "").trim() : "Drawing") });
      if (crumb) main.appendChild(crumb);
      if (q) main.appendChild(q);
      if (p.dataset.draw || stat) {
        figbox.append(ctl, fig);
        if (p.dataset.draw) fig.addEventListener("click", (e) => {
          if (!window.matchMedia("(max-width: 44em)").matches || e.target.closest("button, input, a")) return;
          fig.classList.toggle("is-zoomed");
        });
        if (stat) fig.appendChild(stat);
        if (cap) figbox.appendChild(cap);
        main.appendChild(figbox);
      } else if (cap) main.appendChild(cap);

      let steps = [];
      if (isQuiz && quizList) {
        const opts = Array.from(quizList.querySelectorAll(":scope > li"));
        const box = h("div", { class: "rdx-quiz" });
        opts.forEach((li) => {
          const correct = !!li.querySelector("input[checked], input:checked");
          li.querySelectorAll("input, label.task-list-control").forEach((n) => n.remove());
          const btn = h("button", { type: "button", class: "rdx-opt", html: li.innerHTML.trim() });
          btn.addEventListener("click", () => {
            box.querySelectorAll(".rdx-opt").forEach((b) => (b.disabled = true));
            btn.classList.add(correct ? "is-right" : "is-wrong");
            box.querySelectorAll(".rdx-opt").forEach((b, k) => { if (opts[k].dataset.correct === "1") b.classList.add("is-right"); });
            if (take) { take.hidden = false; take.classList.add("is-shown"); }
          });
          li.dataset.correct = correct ? "1" : "0";
          box.appendChild(btn);
        });
        quizList.remove();
        rail.appendChild(box);
        if (take) { take.hidden = true; rail.appendChild(take); }
        steps = [null];
      } else if (ol) {
        ol.classList.add("rdx-steps");
        steps = Array.from(ol.children);
        steps.forEach((li, k) => {
          // order matters: text transforms first, then voice tags, then listeners
          stats(li);
          wrapRefs(li);
          const lead = li.textContent.trim();
          if (lead.startsWith("🧠")) li.classList.add("is-take");
          if (lead.startsWith("💻")) li.classList.add("is-code");
          stripLeadEmoji(li);
          const title = li.querySelector("strong");
          if (title) {
            if (title.parentElement !== li) li.insertBefore(title, li.querySelector(".rdx-voice") ? li.querySelector(".rdx-voice").nextSibling : li.firstChild);
            const body = h("div", { class: "rdx-sb" });
            Array.from(li.childNodes).forEach((n) => { if (n !== title && !(n.classList && n.classList.contains("rdx-voice"))) body.appendChild(n); });
            const t0 = document.createTreeWalker(body, NodeFilter.SHOW_TEXT).nextNode();
            if (t0) t0.textContent = t0.textContent.replace(/^[\s.:—–-]+/, "");
            title.textContent = title.textContent.replace(/[.:]\s*$/, "");
            li.appendChild(body);
            title.classList.add("rdx-st");
            title.setAttribute("role", "button");
            title.tabIndex = 0;
            title.addEventListener("click", () => go(i, k + 1));
            title.addEventListener("keydown", (e) => { if (e.key === "Enter") go(i, k + 1); });
          }
        });
        rail.appendChild(ol);
        if (take) rail.appendChild(take);
      } else {
        steps = [null];
        if (take) rail.appendChild(take);
      }
      const nav = h("div", { class: "rdx-nav" }, [
        h("span", { class: "rdx-pos" }),
        h("button", { type: "button", class: "rdx-back", text: "← Back", onclick: back }),
        h("button", { type: "button", class: "rdx-next", text: "Next →", onclick: next }),
      ]);
      rail.appendChild(nav);
      if (cap) wrapRefs(cap);
      Array.from(p.childNodes).forEach((n) => { if (n !== main && n !== rail && (n.nodeType !== 1 || !n.matches("script"))) { if (n.nodeType === 1 && n.textContent.trim()) main.appendChild(n); else if (n.nodeType === 3) n.remove(); } });
      p.append(main, rail);
      p.querySelectorAll(":scope > p:empty").forEach((n) => n.remove());
      return { el: p, steps: Math.max(1, steps.length), stepEls: steps, quiz: isQuiz, part: p.dataset.part || "", fast: p.hasAttribute("data-fast"),
        title: q ? q.textContent.replace("¶", "").trim() : p.id, fig, ctl, draw: p.dataset.draw, take, kit: null, render: null };
    }
    function stripLeadEmoji(li) {
      const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode;
        if (!t.textContent.trim()) continue;
        const m = t.textContent.match(/^\s*(🧠|💻|📄)\s*/u);
        if (m) {
          t.textContent = t.textContent.slice(m[0].length);
          const tag = { "🧠": "Our take", "💻": "The code", "📄": "The paper" }[m[1]];
          li.insertBefore(h("span", { class: "rdx-voice", text: tag }), li.firstChild);
        }
        break;
      }
    }
    function wrapRefs(root) {
      const re = /\((?:§|Eq\.|Table|Fig\.|App\.|Alg\.|Algorithm)[^()]{0,40}\)/g;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((t) => {
        if (!re.test(t.textContent) || t.parentElement.closest("code, .arithmatex")) return;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment(); let last = 0, m;
        while ((m = re.exec(t.textContent))) {
          frag.appendChild(document.createTextNode(t.textContent.slice(last, m.index)));
          frag.appendChild(h("span", { class: "rdx-ref", text: m[0] }));
          last = m.index + m[0].length;
        }
        frag.appendChild(document.createTextNode(t.textContent.slice(last)));
        t.parentNode.replaceChild(frag, t);
      });
    }
    function stats(li) {
      // [[1,500 | encoder positions]] -> a big-number block. Walks text nodes
      // (no innerHTML) so typeset math and listeners survive.
      const re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
      const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((t) => {
        if (!t.textContent.includes("[[")) return;
        const frag = document.createDocumentFragment(); let last = 0, m; re.lastIndex = 0;
        while ((m = re.exec(t.textContent))) {
          frag.appendChild(document.createTextNode(t.textContent.slice(last, m.index)));
          frag.appendChild(h("span", { class: "rdx-stat" }, [h("b", { text: m[1].trim() }), h("span", { text: m[2].trim() })]));
          last = m.index + m[0].length;
        }
        frag.appendChild(document.createTextNode(t.textContent.slice(last)));
        t.parentNode.replaceChild(frag, t);
      });
    }

    // chapter menu
    let lastPart = null, optgroup = null;
    model.forEach((m, i) => {
      if (m.part !== lastPart) { optgroup = h("optgroup", { label: m.part || " " }); chapters.appendChild(optgroup); lastPart = m.part; }
      optgroup.appendChild(h("option", { value: i, text: `${i + 1}. ${m.title}${m.fast ? "  ⚡" : ""}` }));
    });
    chapters.addEventListener("change", () => go(+chapters.value, 1));

    // state
    let cur = 0, step = 1;
    const visible = () => model.map((m, i) => i).filter((i) => app.dataset.mode !== "quick" || model[i].cover || model[i].fast);

    function ensureDrawing(m) {
      if (m.kit || !m.draw) return;
      const factory = RD.drawings[m.draw];
      m.kit = makeKit(m.el, m.fig, m.ctl);
      m.kit.steps = m.steps;
      m.kit.narrow = window.matchMedia("(max-width: 44em)").matches;
      if (!factory) { m.fig.appendChild(h("p", { class: "rdx-missing", text: `Drawing "${m.draw}" is missing.` })); console.error(`RD: drawing "${m.draw}" is not registered`); return; }
      try { m.render = factory(m.fig, m.kit) || (() => {}); m.kit._render = m.render; }
      catch (e) { m.fig.appendChild(h("p", { class: "rdx-missing", text: "This drawing failed: " + e.message })); console.error(e); }
    }

    function show() {
      const m = model[cur];
      model.forEach((x, i) => x.el.classList.toggle("is-on", i === cur));
      if (m.stepEls) m.stepEls.forEach((li, k) => { if (!li) return; li.classList.toggle("is-done", k + 1 < step); li.classList.toggle("is-cur", k + 1 === step); li.classList.toggle("is-todo", k + 1 > step); });
      if (m.take && !m.quiz) m.take.classList.toggle("is-shown", step >= m.steps);
      ensureDrawing(m);
      if (m.render) {
        const changed = m.kit.step !== step || !m._shown;
        m.kit.step = step; m._shown = true;
        if (changed) m.kit._applyFollow(step);
        try { m.render(step); } catch (e) { console.error(e); }
      }
      const vis = visible(), pos = vis.indexOf(cur);
      const isLastPage = pos === vis.length - 1;
      m.el.querySelectorAll(".rdx-pos").forEach((n) => (n.textContent = m.cover ? "" : `Step ${step} / ${m.steps}`));
      m.el.querySelectorAll(".rdx-back").forEach((b) => (b.disabled = pos <= 0 && step <= 1));
      m.el.querySelectorAll(".rdx-next").forEach((b) => { b.textContent = step < m.steps ? "Next →" : isLastPage ? "Finish ✓" : "Next page →"; b.classList.toggle("is-page", step >= m.steps); });
      counter.textContent = `Page ${pos + 1} / ${vis.length}`;
      chapters.value = cur;
      progress.firstChild.style.width = `${((pos + step / m.steps) / vis.length) * 100}%`;
      const small = window.matchMedia("(max-width: 44em)").matches;
      modeBtn.textContent = app.dataset.mode === "quick" ? (small ? "⚡ Quick" : "Quick tour ⚡ (switch to full)") : (small ? "Full" : "Full lesson (switch to quick tour ⚡)");
      modeBtn.title = "Switch between the full lesson and the quick tour";
      const hash = `#${m.el.id}${step > 1 ? "/" + step : ""}`;
      if (location.hash !== hash) history.replaceState(null, "", hash);
      if (!m.cover) store.set(key("pos"), `${m.el.id}/${step}`);
      if (isLastPage && step >= m.steps) store.set(`rd:done:${paperId}`, "1");
      document.dispatchEvent(new CustomEvent("rd:page", { detail: { page: cur, step } }));
    }
    function go(p, s) {
      if (p < 0 || p >= model.length) return;
      cur = p; step = Math.max(1, Math.min(s || 1, model[p].steps));
      show();
      if (app.dataset.layout !== "all") {
        const top = app.getBoundingClientRect().top + window.scrollY - 60;
        if (window.scrollY > top + 10) window.scrollTo(0, top);
      }
    }
    function next() {
      const vis = visible(), pos = vis.indexOf(cur);
      if (step < model[cur].steps) return go(cur, step + 1);
      if (pos < vis.length - 1) go(vis[pos + 1], 1);
      else show();
    }
    function back() {
      const vis = visible(), pos = vis.indexOf(cur);
      if (step > 1) return go(cur, step - 1);
      if (pos > 0) { const p = vis[pos - 1]; go(p, model[p].steps); }
    }
    modeBtn.addEventListener("click", () => { app.dataset.mode = app.dataset.mode === "quick" ? "full" : "quick"; store.set(key("mode"), app.dataset.mode); if (!visible().includes(cur)) cur = 0; show(); });
    allBtn.addEventListener("click", () => {
      const all = app.dataset.layout !== "all";
      app.dataset.layout = all ? "all" : "";
      allBtn.textContent = all ? "One page at a time" : "One long page";
      if (all) model.forEach((m) => { ensureDrawing(m); if (m.render) { m.kit.step = m.steps; m.render(m.steps); } if (m.take) m.take.classList.add("is-shown"); });
      else show();
    });
    document.addEventListener("keydown", (e) => {
      if (app.dataset.layout === "all" || e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
    });

    // cover buttons
    if (cover) {
      cover.querySelectorAll("[data-rdx-start]").forEach((b) => b.addEventListener("click", () => {
        app.dataset.mode = b.dataset.rdxStart; store.set(key("mode"), app.dataset.mode);
        const v = visible(); go(v[1] ?? 0, 1);
      }));
      const saved = store.get(key("pos"));
      const cont = cover.querySelector("[data-rdx-continue]");
      if (cont && saved) {
        const [pid, s] = saved.split("/"); const idx = model.findIndex((m) => m.el.id === pid);
        if (idx > 0) { cont.hidden = false; cont.textContent = `Continue: page ${idx + 1}, "${model[idx].title}"`; cont.addEventListener("click", () => go(idx, +s || 1)); }
      }
    }

    // public API (used by check_site.py and for debugging)
    RD.x = { pages: model.map((m) => ({ id: m.el.id, steps: m.steps, draw: m.draw || null, quiz: !!m.quiz, cover: !!m.cover, fast: m.fast, part: m.part, title: m.title })),
      go, next, back, current: () => ({ page: cur, step }) };

    window.addEventListener("hashchange", () => {
      const hm = location.hash.match(/^#([^/]+)(?:\/(\d+))?$/);
      if (!hm) return;
      const at = model.findIndex((x) => x.el.id === decodeURIComponent(hm[1]));
      if (at >= 0 && (at !== cur || (+hm[2] || 1) !== step)) go(at, +hm[2] || 1);
    });

    const m = location.hash.match(/^#([^/]+)(?:\/(\d+))?$/);
    const idx = m ? model.findIndex((x) => x.el.id === decodeURIComponent(m[1])) : -1;
    go(idx >= 0 ? idx : 0, m && m[2] ? +m[2] : 1);
  }

  if (typeof document$ !== "undefined") document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
