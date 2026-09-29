# Research Daily

Research papers, explained from first principles, with pictures, arguments, and a quiz at the end.

Live site: https://bnarayanareddy.github.io/ResearchDaily/

## Working on the site

```bash
pip install -r requirements.txt
mkdocs serve          # preview at http://127.0.0.1:8000
mkdocs build --strict # what CI runs before deploying
```

Each paper lives in `docs/papers/<arxiv-id>-<slug>/` with an `index.md` and an `assets/` folder, and is fully self-contained. The homepage gallery, catalog, and paper cards are generated at build time from each paper's front matter by `hooks/research_daily.py`. Tags must come from the `tags_allowed` list in `mkdocs.yml`.

Pushing to the default branch deploys through GitHub Actions (`.github/workflows/deploy.yml`).
