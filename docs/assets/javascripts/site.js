// Research Daily: small site behaviours. No dependencies.
//  1. Marks fast-path headings (text starting with the lightning emoji)
//     and lists them in the paper card.
//  2. Remembers prerequisite ticks and "finished" state in localStorage.
//  3. Shows "Finished" on homepage tiles.
(function () {
  const FAST = "\u26A1";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  function markFastPath() {
    const list = document.querySelector(".rd-fastpath ol");
    const heads = document.querySelectorAll(".md-typeset h2[id], .md-typeset h3[id]");
    heads.forEach((h) => {
      const text = h.textContent.replace(/\u00b6\s*$/, "").trim();
      if (!text.startsWith(FAST) || h.classList.contains("rd-fast")) return;
      h.classList.add("rd-fast");
      // wrap the text nodes (not the permalink) in a highlighter span
      const span = document.createElement("span");
      span.className = "rd-hl";
      Array.from(h.childNodes).forEach((n) => {
        if (n.nodeType === 1 && n.classList.contains("headerlink")) return;
        span.appendChild(n);
      });
      h.insertBefore(span, h.firstChild);
      if (list) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = text.replace(FAST, "").replace(/\u00b6/g, "").trim();
        li.appendChild(a);
        list.appendChild(li);
      }
    });
  }

  function prereqs() {
    const card = document.querySelector(".rd-card[data-arxiv]");
    if (!card) return;
    const id = card.dataset.arxiv;
    card.querySelectorAll("input[data-rd-prereq]").forEach((box) => {
      const key = `rd:prereq:${id}:${box.dataset.rdPrereq}`;
      box.checked = store.get(key) === "1";
      box.addEventListener("change", () => (box.checked ? store.set(key, "1") : store.del(key)));
    });
  }

  function finished() {
    document.querySelectorAll("button[data-rd-done]").forEach((btn) => {
      const key = `rd:done:${btn.dataset.rdDone}`;
      const render = () => {
        const done = store.get(key) === "1";
        btn.setAttribute("aria-pressed", done ? "true" : "false");
        btn.textContent = done ? "Finished" : "Mark as finished";
      };
      render();
      btn.addEventListener("click", () => {
        store.get(key) === "1" ? store.del(key) : store.set(key, "1");
        render();
      });
    });
    document.querySelectorAll(".rd-tile[data-arxiv]").forEach((tile) => {
      if (store.get(`rd:done:${tile.dataset.arxiv}`) === "1") tile.classList.add("is-done");
    });
  }

  function init() { markFastPath(); prereqs(); finished(); }

  if (typeof document$ !== "undefined") document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
