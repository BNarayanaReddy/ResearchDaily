// Research Daily: homepage "Finished" marks. The explainer engine records a
// paper as finished (localStorage rd:done:<arxiv id>) when its last page is reached.
(function () {
  function mark() {
    document.querySelectorAll(".rd-tile[data-arxiv]").forEach((tile) => {
      let done = null;
      try { done = localStorage.getItem(`rd:done:${tile.dataset.arxiv}`); } catch (e) { /* private mode */ }
      if (done === "1") tile.classList.add("is-done");
    });
  }
  if (typeof document$ !== "undefined") document$.subscribe(mark);
  else document.addEventListener("DOMContentLoaded", mark);
})();
