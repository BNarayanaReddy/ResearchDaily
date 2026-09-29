"""Research Daily build hook.

One source of truth: the YAML front matter of docs/papers/<folder>/index.md.
From it this hook renders, at build time:

  * the Paper Card at the top of every paper page,
  * the homepage gallery   (wherever <!-- rd:gallery --> appears),
  * the papers catalog     (wherever <!-- rd:catalog --> appears).

It also validates each paper's front matter. Problems are logged as warnings,
so `mkdocs build --strict` fails on them instead of shipping a broken card.
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
    "hook", "difficulty", "time_fast", "time_deep", "date_added", "tags",
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
        papers.append(meta)
    papers.sort(key=lambda m: (_date(m.get("date_added")), str(m.get("arxiv_id"))), reverse=True)
    return papers


# ------------------------------------------------------------- paper card
def _paper_card(meta: dict) -> str:
    arxiv_id = _e(meta["arxiv_id"])
    version = _e(meta.get("arxiv_version", ""))
    code_url, code_license, code_note = _link_block(meta.get("code"))
    model_url, model_license, model_note = _link_block(meta.get("model"))
    venue = meta.get("venue") or "arXiv preprint"
    ptype = PAPER_TYPES.get(meta.get("paper_type"), meta.get("paper_type", ""))
    level = int(meta.get("difficulty", 1) or 1)

    rows = [
        ("Authors", _e(_authors(meta))),
        ("Published", f"{_e(meta.get('year', ''))}, {_e(venue)}"),
        (
            "arXiv",
            f'<a href="https://arxiv.org/abs/{arxiv_id}">{arxiv_id}</a>'
            + (f" <span class='rd-muted'>(read {version})</span>" if version else ""),
        ),
    ]
    def resource(url: str, license_: str, note: str) -> str:
        extra = "; ".join(x for x in (license_ and f"{_e(license_)} license", _e(note)) if x)
        link = f'<a href="{_e(url)}">{_e(url.split("://")[-1])}</a>'
        return link + (f" <span class='rd-muted'>({extra})</span>" if extra else "")

    if code_url:
        rows.append(("Code", resource(code_url, code_license, code_note)))
    if model_url:
        rows.append(("Model", resource(model_url, model_license, model_note)))
    rows.append(("Paper type", _e(ptype)))
    rows.append((
        "Difficulty",
        f"{_dots(level)} <strong>{DIFFICULTY.get(level, '')}</strong>"
        + (f" <span class='rd-muted'>{_e(meta['difficulty_note'])}</span>" if meta.get("difficulty_note") else ""),
    ))
    rows.append((
        "Time",
        f"<span class='rd-hl-inline'>⚡ Fast path {int(meta.get('time_fast', 15))} min</span>"
        f" or deep path {int(meta.get('time_deep', 90))} min",
    ))

    dl = "\n".join(f"<dt>{k}</dt><dd>{v}</dd>" for k, v in rows)

    prereqs = meta.get("prerequisites") or []
    prereq_html = ""
    if prereqs:
        items = []
        for i, p in enumerate(prereqs):
            label = p.get("label", "") if isinstance(p, dict) else str(p)
            anchor = p.get("anchor", "#primer") if isinstance(p, dict) else "#primer"
            items.append(
                f'<li><label><input type="checkbox" data-rd-prereq="{i}"> '
                f'<a href="{_e(anchor)}">{_e(label)}</a></label></li>'
            )
        prereq_html = (
            '<div class="rd-card__prereqs"><p class="rd-card__label">Before you start, can you explain…</p>'
            f'<ul>{"".join(items)}</ul>'
            '<p class="rd-muted rd-small">Unchecked items are covered in the primer. Ticks are saved in this browser.</p></div>'
        )

    big_idea = meta.get("big_idea")
    big_idea_html = f'<p class="rd-card__idea">{_e(big_idea)}</p>' if big_idea else ""

    return f"""
# {meta['paper_title']}

<div class="rd-card" data-arxiv="{arxiv_id}" markdown="0">
{big_idea_html}
<dl class="rd-card__facts">
{dl}
</dl>
{prereq_html}
<nav class="rd-fastpath" aria-label="Fast path">
<p class="rd-card__label">⚡ The fast path: read only these</p>
<ol></ol>
</nav>
<button class="rd-done" type="button" data-rd-done="{arxiv_id}" aria-pressed="false">Mark as finished</button>
</div>

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
<span class="rd-tile__meta">{_dots(level)}<span class="rd-tile__level">{DIFFICULTY.get(level, '')}</span></span>
<span class="rd-tile__tags">{tags}</span>
<span class="rd-tile__done" aria-hidden="true">Finished</span>
</a>"""


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
        if re.search(r"^# ", markdown, re.M):
            log.warning("research_daily: %s has its own H1; the card renders the title, "
                        "so start the body at ## headings", page.file.src_uri)
        return _paper_card(meta) + markdown

    if GALLERY_MARK in markdown or CATALOG_MARK in markdown:
        papers = _papers(docs_dir)
        markdown = markdown.replace(GALLERY_MARK, _gallery(papers, page.url))
        markdown = markdown.replace(CATALOG_MARK, _catalog(papers, page.file.src_uri))
    return markdown
