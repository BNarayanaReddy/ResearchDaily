# RD_ENGINE 2.0  (scaffold_site.py upgrades sites whose copy is older)
"""Research Daily build hook.

One source of truth: the YAML front matter of docs/papers/<folder>/index.md.
From it this hook renders, at build time:

  * the cover page of every lesson (title, big idea, Full lesson / Quick tour
    buttons, chapters, facts),
  * the homepage gallery   (wherever <!-- rd:gallery --> appears),
  * the papers catalog     (wherever <!-- rd:catalog --> appears).

It also validates each paper's front matter and checks every lesson page
against the word budgets (short steps, short sentences, question headings).
Problems are logged as warnings, so `mkdocs build --strict` fails on them
instead of shipping a broken or verbose lesson.
"""
from __future__ import annotations

import datetime as _dt
import html
import logging
import posixpath
import re
from pathlib import Path

import yaml
from markdown.extensions import Extension
from mkdocs.utils import get_relative_url

log = logging.getLogger("mkdocs.hooks.research_daily")

REQUIRED = [
    "title", "paper_title", "authors", "year", "arxiv_id", "paper_type",
    "hook", "big_idea", "difficulty", "date_added", "tags",
]

PAPER_TYPES = {
    "method": "New method or architecture",
    "training-recipe": "Training recipe",
    "empirical-study": "Empirical study",
    "benchmark-dataset": "Benchmark or dataset",
    "theory": "Theory",
    "survey": "Survey",
    "position": "Position paper",
    "system": "System or infrastructure",
}

DIFFICULTY = {
    1: "Warm-up",
    2: "Comfortable",
    3: "Stretch",
    4: "Challenging",
    5: "Summit",
}

GALLERY_MARK = "<!-- rd:gallery -->"
CATALOG_MARK = "<!-- rd:catalog -->"
_FM = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.S)

# Lesson budgets. They exist because readers stop reading long text: the
# reference explainer this site follows averages 28-word steps, 9-word
# sentences and about 5 steps per page.
BUDGET = {
    "step_words": 45,      # body of one step
    "title_words": 8,      # bold step title
    "sentence_words": 28,  # any single sentence
    "page_words": 280,     # crumb + steps + takeaway on one page
    "steps": (2, 7),       # steps per (non-quiz) page
    "pages": (8, 26),      # pages per lesson, cover excluded
    "fast": (3, 8),        # quick-tour pages
}
MIN_PER_PAGE = 1.2
_ART = re.compile(r'<article\s+([^>]*\bclass="[^"]*\brd-page\b[^"]*"[^>]*)>(.*?)</article>', re.S)


# ----------------------------------------------------------------- helpers
def _e(value) -> str:
    return html.escape(str(value), quote=True)


def _read_front_matter(path: Path) -> dict:
    match = _FM.match(path.read_text(encoding="utf-8"))
    if not match:
        return {}
    try:
        return yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as exc:  # pragma: no cover - reported via warning
        log.warning("research_daily: bad YAML front matter in %s: %s", path, exc)
        return {}


def _date(value) -> _dt.date:
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    try:
        return _dt.date.fromisoformat(str(value))
    except ValueError:
        return _dt.date(1970, 1, 1)


def _pretty_date(value) -> str:
    d = _date(value)
    return f"{d.day} {d.strftime('%b %Y')}"


def _authors(meta: dict, limit: int = 6) -> str:
    authors = meta.get("authors") or []
    if isinstance(authors, str):
        return authors
    if len(authors) <= limit:
        return ", ".join(authors)
    return ", ".join(authors[:limit]) + f", and {len(authors) - limit} more"


def _link_block(value) -> tuple[str, str, str]:
    """Accept either a URL string or {url, license, note}."""
    if not value:
        return "", "", ""
    if isinstance(value, str):
        return value, "", ""
    return value.get("url", ""), value.get("license", ""), value.get("note", "")


def _dots(level: int) -> str:
    level = max(1, min(5, int(level or 1)))
    return (
        f'<span class="rd-dots" data-level="{level}" '
        f'aria-label="Difficulty {level} of 5">'
        + "".join('<i class="on"></i>' if i < level else "<i></i>" for i in range(5))
        + "</span>"
    )


def _validate(meta: dict, where: str) -> None:
    missing = [k for k in REQUIRED if meta.get(k) in (None, "", [])]
    if missing:
        log.warning("research_daily: %s is missing front matter: %s", where, ", ".join(missing))
    if meta.get("paper_type") and meta["paper_type"] not in PAPER_TYPES:
        log.warning(
            "research_daily: %s has paper_type %r; use one of %s",
            where, meta["paper_type"], ", ".join(PAPER_TYPES),
        )
    try:
        if not 1 <= int(meta.get("difficulty", 0)) <= 5:
            raise ValueError
    except (TypeError, ValueError):
        log.warning("research_daily: %s difficulty must be an integer 1-5", where)
    for key in ("paper_title", "hook", "big_idea", "title"):
        text = str(meta.get(key, ""))
        if "TODO" in text:
            log.warning("research_daily: %s still has TODO in %s", where, key)


def _papers(docs_dir: Path) -> list[dict]:
    papers = []
    for index in sorted((docs_dir / "papers").glob("*/index.md")):
        meta = _read_front_matter(index)
        if not meta.get("arxiv_id") or meta.get("draft"):
            continue
        meta = dict(meta)
        meta["_folder"] = index.parent.name
        meta["_url"] = f"papers/{index.parent.name}/"
        meta["_src"] = f"papers/{index.parent.name}/index.md"
        st = _lesson_stats(index.read_text(encoding="utf-8"))
        meta["_pages"], meta["_fast_minutes"] = st["pages"], st["fast_minutes"]
        papers.append(meta)
    papers.sort(key=lambda m: (_date(m.get("date_added")), str(m.get("arxiv_id"))), reverse=True)
    return papers


# ------------------------------------------------------- lesson pages
def _attr(attrs: str, name: str) -> str | None:
    m = re.search(rf'\b{name}="([^"]*)"', attrs)
    if m:
        return m.group(1)
    return "" if re.search(rf"\b{name}\b", attrs) else None


def _words(text: str) -> list[str]:
    text = re.sub(r"\\\(.*?\\\)", " MATH ", text, flags=re.S)           # inline math = 1 word
    text = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", " STAT ", text)             # stat block = 1 word
    text = re.sub(r"\((?:§|Eq\.|Table|Fig\.|App\.|Alg\.|Algorithm)[^()]{0,40}\)", " ", text)  # pointers are free
    text = re.sub(r"<[^>]+>|`[^`]*`|[*_#>|]", " ", text)
    return [w for w in text.split() if re.search(r"\w", w)]


def _pages(markdown: str) -> list[dict]:
    out = []
    for attrs, body in _ART.findall(markdown):
        if "rd-cover" in attrs:
            continue
        q = re.search(r"^##\s+(.+?)\s*(?:\{[^}]*\})?\s*$", body, re.M)
        steps, cur = [], None
        for line in body.splitlines():
            m = re.match(r"^\d+\.\s+(.*)", line)
            if m:
                cur = [m.group(1)]
                steps.append(cur)
            elif cur is not None and (line.startswith("    ") or not line.strip()):
                if line.strip():
                    cur.append(line.strip())
            elif line.strip():
                cur = None
        out.append({
            "id": _attr(attrs, "id"), "part": _attr(attrs, "data-part"), "draw": _attr(attrs, "data-draw"),
            "quiz": _attr(attrs, "data-quiz") is not None, "fast": _attr(attrs, "data-fast") is not None,
            "question": q.group(1).strip() if q else None, "steps": [" ".join(s) for s in steps],
            "take": re.search(r'class="rd-take[^"]*"[^>]*>(.*?)</p>', body, re.S),
            "cap": 'class="rd-cap' in body, "crumb": re.search(r'class="rd-crumb"[^>]*>(.*?)</p>', body, re.S),
            "options": re.findall(r"^\s*[-*]\s+\[([ xX])\]", body, re.M),
            "stray": _stray(body),
        })
    return out


def _stray(body: str) -> list[str]:
    """Words on a page that sit outside the known slots (crumb, question, steps,
    caption, takeaway, static figure, quiz options). Prose belongs in steps."""
    rest = re.sub(r'<div class="rd-static".*?</div>', " ", body, flags=re.S)
    rest = re.sub(r'<p class="rd-(?:crumb|cap|take)[^"]*"[^>]*>.*?</p>', " ", rest, flags=re.S)
    rest = re.sub(r"<script.*?</script>|<!--.*?-->", " ", rest, flags=re.S)
    keep = []
    in_step = False
    for line in rest.splitlines():
        if re.match(r"^\d+\.\s+", line) or re.match(r"^\s*[-*]\s+\[[ xX]\]", line):
            in_step = True
            continue
        if in_step and (line.startswith("    ") or not line.strip()):
            continue
        in_step = False
        if re.match(r"^##\s", line):
            continue
        keep.append(line)
    return _words(" ".join(keep))


def _lesson_stats(markdown: str) -> dict:
    pages = _pages(markdown)
    fast = [p for p in pages if p["fast"]]
    parts: list[list] = []
    for p in pages:
        if not parts or parts[-1][0] != p["part"]:
            parts.append([p["part"], 0, p["question"]])
        parts[-1][1] += 1
    return {"pages": len(pages), "fast": len(fast), "parts": parts,
            "minutes": max(1, round(len(pages) * MIN_PER_PAGE)),
            "fast_minutes": max(1, round(len(fast) * MIN_PER_PAGE))}


def _check_lesson(markdown: str, where: str, folder: Path) -> None:
    warn = lambda msg: log.warning("research_daily: %s: %s", where, msg)
    pages = _pages(markdown)
    lo, hi = BUDGET["pages"]
    if not lo <= len(pages) <= hi:
        warn(f"{len(pages)} lesson pages; aim for {lo}-{hi} (one question each)")
    nfast = sum(p["fast"] for p in pages)
    if not BUDGET["fast"][0] <= nfast <= BUDGET["fast"][1]:
        warn(f"{nfast} quick-tour pages (data-fast); aim for {BUDGET['fast'][0]}-{BUDGET['fast'][1]}")
    outside = _ART.sub(" ", markdown)
    outside = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", " ", outside, flags=re.S)
    if len(_words(outside)) > 0:
        warn(f"text outside <article class=\"rd-page\"> blocks: {' '.join(_words(outside)[:12])}...")
    js = " ".join(p.read_text(encoding="utf-8") for p in (folder / "assets").glob("*.js")) if (folder / "assets").exists() else ""
    ids = set()
    for n, p in enumerate(pages, 1):
        tag = f"page {n} ({p['id'] or 'no id'})"
        if not p["id"]:
            warn(f"{tag} needs an id=\"...\" (used for links and progress)")
        elif p["id"] in ids:
            warn(f"{tag} has a duplicate id")
        ids.add(p["id"])
        if not p["part"]:
            warn(f"{tag} needs data-part=\"...\" (its chapter)")
        if not p["question"]:
            warn(f"{tag} needs a '## ...?' question heading")
        elif not p["question"].rstrip().endswith("?"):
            warn(f"{tag} heading should be a question: {p['question']!r}")
        if p["draw"] and f'"{p["draw"]}"' not in js and f"'{p['draw']}'" not in js:
            warn(f"{tag} uses data-draw=\"{p['draw']}\" but no assets/*.js registers it")
        if p["draw"] and not p["cap"]:
            warn(f"{tag} has a drawing but no <p class=\"rd-cap\"> saying what is real and what is illustrative")
        if not p["take"]:
            warn(f"{tag} needs a <p class=\"rd-take\"> takeaway")
        if p["stray"]:
            warn(f"{tag} has text outside the steps: '{' '.join(p['stray'][:10])}...'. Put it in a step or cut it")
        if p["quiz"]:
            right = sum(o.lower() == "x" for o in p["options"])
            if right != 1 or not 2 <= len(p["options"]) <= 5:
                warn(f"{tag} quiz needs 2-5 options with exactly one marked [x]")
            continue
        lo, hi = BUDGET["steps"]
        if not lo <= len(p["steps"]) <= hi:
            warn(f"{tag} has {len(p['steps'])} steps; use {lo}-{hi}")
        total = len(_words(p["crumb"].group(1))) if p["crumb"] else 0
        total += len(_words(p["take"].group(1))) if p["take"] else 0
        for k, st in enumerate(p["steps"], 1):
            m = re.match(r"^\s*(?:🧠|💻|📄)?\s*\*\*(.+?)\*\*\s*(.*)$", st)
            if not m:
                warn(f"{tag} step {k} should start with a **bold claim**")
                body = st
            else:
                if len(_words(m.group(1))) > BUDGET["title_words"]:
                    warn(f"{tag} step {k} title is {len(_words(m.group(1)))} words; keep it under {BUDGET['title_words']}")
                body = m.group(2)
            n_words = len(_words(body))
            total += n_words + (len(_words(m.group(1))) if m else 0)
            if n_words > BUDGET["step_words"]:
                warn(f"{tag} step {k} is {n_words} words; cut to {BUDGET['step_words']} or split the page")
            for sent in re.split(r"(?<=[.!?])\s+", re.sub(r"\\\(.*?\\\)", "MATH", body)):
                if len(_words(sent)) > BUDGET["sentence_words"]:
                    warn(f"{tag} step {k} has a {len(_words(sent))}-word sentence; split it")
        if total > BUDGET["page_words"]:
            warn(f"{tag} has {total} words; keep pages under {BUDGET['page_words']}")


def _cover(meta: dict, stats: dict) -> str:
    arxiv_id = _e(meta["arxiv_id"])
    version = _e(meta.get("arxiv_version", ""))
    code_url, code_license, code_note = _link_block(meta.get("code"))
    model_url, model_license, model_note = _link_block(meta.get("model"))
    level = int(meta.get("difficulty", 1) or 1)

    def resource(url: str, license_: str, note: str) -> str:
        extra = "; ".join(x for x in (license_ and f"{_e(license_)} license", _e(note)) if x)
        link = f'<a href="{_e(url)}">{_e(url.split("://")[-1])}</a>'
        return link + (f" <span class='rd-muted'>({extra})</span>" if extra else "")

    facts = [
        ("Authors", _e(_authors(meta))),
        ("Published", f"{_e(meta.get('year', ''))}, {_e(meta.get('venue') or 'arXiv preprint')}"),
        ("arXiv", f'<a href="https://arxiv.org/abs/{arxiv_id}">{arxiv_id}</a>'
                  + (f" <span class='rd-muted'>(lesson written from {version})</span>" if version else "")),
    ]
    if code_url:
        facts.append(("Code", resource(code_url, code_license, code_note)))
    if model_url:
        facts.append(("Model", resource(model_url, model_license, model_note)))
    facts.append(("Paper type", _e(PAPER_TYPES.get(meta.get("paper_type"), meta.get("paper_type", "")))))
    dl = "".join(f"<dt>{k}</dt><dd>{v}</dd>" for k, v in facts)
    parts = "".join(
        f'<div class="rd-cover__part"><b>{_e(name or "")}</b><span>{n} page{"s" if n != 1 else ""}. '
        f'First question: {_e(first or "")}</span></div>'
        for name, n, first in stats["parts"])
    note = f" {_e(meta['difficulty_note'])}" if meta.get("difficulty_note") else ""
    return f"""
<article class="rd-page rd-cover" id="start" data-part="Start" data-arxiv="{arxiv_id}">
<p class="rd-crumb"><b>{DIFFICULTY.get(level, '')}</b>{_dots(level)}{note}</p>
<h1>{_e(meta['paper_title'])}</h1>
<p class="rd-cover__idea">{_e(meta.get('big_idea', ''))}</p>
<div class="rd-cover__go">
<button type="button" class="is-primary" data-rdx-start="full">Start the lesson <small>{stats['pages']} pages, about {stats['minutes']} min</small></button>
<button type="button" data-rdx-start="quick">Quick tour ⚡ <small>{stats['fast']} pages, about {stats['fast_minutes']} min</small></button>
<button type="button" data-rdx-continue hidden>Continue</button>
</div>
<div class="rd-cover__parts">{parts}</div>
<dl class="rd-cover__facts">{dl}</dl>
</article>

"""


# ------------------------------------------------------ gallery and catalog
def _tile(meta: dict, page_url: str) -> str:
    href = get_relative_url(meta["_url"], page_url)
    tags = "".join(f"<span class='rd-tag'>{_e(t)}</span>" for t in (meta.get("tags") or [])[:4])
    level = int(meta.get("difficulty", 1) or 1)
    return f"""<a class="rd-tile" href="{_e(href)}" data-arxiv="{_e(meta['arxiv_id'])}">
<span class="rd-tile__added">Added {_pretty_date(meta.get('date_added'))}</span>
<span class="rd-tile__title">{_e(meta['title'])}</span>
<span class="rd-tile__full">{_e(meta.get('paper_title', ''))}</span>
<span class="rd-tile__hook">{_e(meta.get('hook', ''))}</span>
<span class="rd-tile__meta">{_dots(level)}<span class="rd-tile__level">{DIFFICULTY.get(level, '')}. {_tile_size(meta)}</span></span>
<span class="rd-tile__tags">{tags}</span>
<span class="rd-tile__done" aria-hidden="true">Finished</span>
</a>"""


def _tile_size(meta: dict) -> str:
    if meta.get("_pages"):
        return f"{meta['_pages']} pages, quick tour {meta.get('_fast_minutes', '?')} min"
    # legacy long-page lesson
    return f"fast path {meta.get('time_fast', '?')} min" if meta.get("time_fast") else "long-page lesson"


def _gallery(papers: list[dict], page_url: str) -> str:
    if not papers:
        return ('<div class="rd-empty" markdown="0"><p>No papers yet. The first one '
                'appears here as soon as it is published.</p></div>')
    tiles = "\n".join(_tile(m, page_url) for m in papers)
    return f'\n<div class="rd-gallery" markdown="0">\n{tiles}\n</div>\n'


def _catalog(papers: list[dict], page_src: str) -> str:
    if not papers:
        return "_No papers yet._"
    lines = [
        "| Paper | Type | Difficulty | Tags | Added |",
        "|---|---|---|---|---|",
    ]
    for m in papers:
        # link to the .md source so `mkdocs build --strict` validates it
        href = posixpath.relpath(m["_src"], posixpath.dirname(page_src) or ".")
        title = str(m["title"]).replace("|", "\\|")
        full = str(m.get("paper_title", "")).replace("|", "\\|")
        level = int(m.get("difficulty", 1) or 1)
        lines.append(
            f"| [**{title}**]({href}) <br><small>{full} (arXiv {m['arxiv_id']})</small> "
            f"| {PAPER_TYPES.get(m.get('paper_type'), m.get('paper_type', ''))} "
            f"| {level}/5 {DIFFICULTY.get(level, '')} "
            f"| {', '.join(m.get('tags') or [])} "
            f"| {_date(m.get('date_added')).isoformat()} |"
        )
    return "\n".join(lines)


# ------------------------------------------------------------------ hooks
class _SvgIsBlock(Extension):
    """Treat <svg> as a block-level HTML element.

    Python-Markdown does not know <svg>, so an inline SVG (for example one
    pulled in with a --8<-- snippet) gets wrapped in <p> and split at blank
    lines, which silently breaks the drawing.
    """

    def extendMarkdown(self, md):  # noqa: N802 (Markdown API name)
        for tag in ("svg", "canvas"):
            if tag not in md.block_level_elements:
                md.block_level_elements.append(tag)


def on_config(config):
    config.markdown_extensions.append(_SvgIsBlock())
    return config


def on_nav(nav, config, files):
    """Give each paper its short title in the sidebar and list papers newest first.

    Without this, MkDocs names each paper's nav section after its folder
    (e.g. "2006.11239 ddpm") and sorts folders alphabetically.
    """
    docs_dir = Path(config["docs_dir"])
    for item in nav.items:
        children = getattr(item, "children", None)
        if not children:
            continue
        paper_sections, others = [], []
        for child in children:
            index = None
            for sub in getattr(child, "children", None) or []:
                if getattr(sub, "file", None) and sub.file.src_uri.endswith("/index.md") \
                        and sub.file.src_uri.startswith("papers/"):
                    index = sub
                    break
            if index is None:
                others.append(child)
                continue
            meta = _read_front_matter(docs_dir / index.file.src_uri)
            if meta.get("title"):
                child.title = str(meta["title"])
            paper_sections.append((_date(meta.get("date_added")), str(meta.get("arxiv_id", "")), child))
        if paper_sections:
            paper_sections.sort(key=lambda t: (t[0], t[1]), reverse=True)
            item.children = others + [c for _, _, c in paper_sections]
    return nav


def on_page_markdown(markdown: str, page, config, files):
    meta = page.meta or {}
    docs_dir = Path(config["docs_dir"])

    if meta.get("arxiv_id") and page.file.src_uri.startswith("papers/"):
        _validate(meta, page.file.src_uri)
        if not _ART.search(markdown):
            # Legacy long-page lesson (written before the explainer format).
            # Rendered as is with legacy.css/legacy.js until it is converted.
            return markdown
        folder = docs_dir / Path(page.file.src_uri).parent
        _check_lesson(markdown, page.file.src_uri, folder)
        # Crumbs, captions and takeaways are raw <p> blocks. Without markdown="span"
        # their inline math is never wrapped for MathJax and shows as raw TeX.
        markdown = re.sub(r'<p class="(rd-(?:cap|crumb|take)\b[^"]*)"(?![^>]*\bmarkdown=)', r'<p class="\1" markdown="span"', markdown)
        # lessons use the full width: the explainer has its own navigation
        page.meta["hide"] = sorted(set(page.meta.get("hide") or []) | {"navigation", "toc"})
        # load the paper's drawings (assets/*.js) automatically; they register
        # themselves before the explainer engine starts
        scripts = "".join(f'\n<script src="assets/{js.name}"></script>'
                          for js in sorted((folder / "assets").glob("*.js")))
        return _cover(meta, _lesson_stats(markdown)) + markdown + "\n" + scripts + "\n"

    if GALLERY_MARK in markdown or CATALOG_MARK in markdown:
        papers = _papers(docs_dir)
        markdown = markdown.replace(GALLERY_MARK, _gallery(papers, page.url))
        markdown = markdown.replace(CATALOG_MARK, _catalog(papers, page.file.src_uri))
    return markdown
