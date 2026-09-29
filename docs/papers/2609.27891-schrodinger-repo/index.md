---
title: "SchrodingerRepo"
paper_title: "Schrödinger's Code Repository: Have LLMs Learned SWE-bench or Memorized It?"
authors: ["Silin Chen", "Yufei Yang", "Xiaodong Gu", "Yuling Shi", "Chengcheng Wan", "Haibing Guan"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2609.27891"
arxiv_version: v1
code: {url: "https://github.com/cslsolow/Schrodinger-Repo", license: "MIT", note: "transformation + evaluation pipeline for SWE-bench Verified; no SWE-QA/SWE-rebench runs, results, or human-validation data"}
paper_type: benchmark-dataset
hook: "Rename the files and functions in Django without changing what the code does, and coding agents solve 6 to 14 points fewer SWE-bench tasks."
big_idea: "Keep the program and its tests fixed but show each agent a fresh, seeded disguise of the repository; whatever score is lost was riding on familiar names, layouts and wording rather than on reasoning."
difficulty: 2
difficulty_note: "New subfield (coding agents and SWE-bench), but no heavy math: the ideas are experimental design, ASTs, and one topological sort."
time_fast: 16
time_deep: 95
date_added: 2026-09-30
prerequisites:
  - {label: "SWE-bench, Pass@1, FAIL_TO_PASS / PASS_TO_PASS", anchor: "#primer-swebench"}
  - {label: "How a coding agent works (mini-swe-agent)", anchor: "#primer-agent"}
  - {label: "Contamination vs memorization", anchor: "#primer-contamination"}
  - {label: "ASTs and topological sorting", anchor: "#primer-ast"}
tags: [LLMs, Agents, Code, Benchmarks, Evaluation, Robustness]
description: "Rename the files and functions in Django without changing what the code does, and coding agents solve 6 to 14 points fewer SWE-bench tasks."
---

## Part I: Why should I care? { .rd-part }

## ⚡ The hook { #hook }

Here is a real Django bug: if you write your own `get_first_name_display()` method on a model, Django quietly overwrites it with its auto-generated one. An LLM agent is given the issue and a shell inside the repository.

In the normal repository, the agent greps for `get_.*_display`, lands in `django/db/models/fields/__init__.py`, spots an unconditional `setattr`, and guards it. **37 actions.**

Now the same repository, same bug, same tests, but every repo-owned name has been swapped for a plausible synonym: `django/db/models/fields/` becomes `storage_engine/object_models/entries/` and `get_%s_display` becomes `render_%s_label`. The code runs identically. The agent submits **the same patch**, but only after **217 actions** of listing directories, grepping tests, and double-checking config (§V-E).

Nothing about the bug got harder. What disappeared was *familiarity*. By the end of this page you'll know how to build that disguise so it's provably harmless to the program, what it does to four frontier-ish models on SWE-bench Verified, and where the argument is solid versus where it's leaning on assumptions.

## ⚡ The paper in one picture { #one-picture }

**One sentence.** Keep the program and its tests fixed but show each agent a fresh, seeded disguise of the repository; whatever score is lost was riding on familiar names, layouts and wording rather than on reasoning.

**One paragraph.** SWE-bench tasks come from famous open-source Python repos that every LLM has read many times. SchrodingerRepo sits between the agent and the repo. With a random seed it rewords the issue (Level 1), renames repo-owned paths and symbols (Level 2), shuffles the order of definitions inside files (Level 3), and rewrites code near the bug into an equivalent form (Level 4). A translator maps the agent's commands back to real names, so the real code runs and the real tests grade the final patch. The "repository" the agent sees doesn't exist until it walks in, hence Schrödinger.

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/one-picture.svg"
<figcaption><strong>What to notice:</strong> the dashed arrow on the left. The code that actually executes, and the tests that grade it, are the originals. Only what the agent <em>sees</em> changes, and the translator keeps the two in sync.</figcaption>
</figure>

## Primer: what you need first { #primer }

??? deep "Open the primer (skip if you ticked every prerequisite)"

    ### SWE-bench, Pass@1, FAIL_TO_PASS and PASS_TO_PASS { #primer-swebench }

    **SWE-bench** turns real GitHub issues into tasks: you get the repository at the commit before the fix, the issue text, and a Docker image that can run the tests. You must produce a patch. The benchmark has 2,294 tasks; **SWE-bench Verified** is a human-checked subset of 500 that became the standard leaderboard (§I).

    Grading uses two test lists, both hidden from the agent:

    | List | Before the real fix | After a correct fix | What it checks |
    |---|---|---|---|
    | FAIL_TO_PASS (F2P) | fail | pass | you fixed the bug |
    | PASS_TO_PASS (P2P) | pass | pass | you broke nothing |

    **Pass@1** is just the fraction of tasks solved in one attempt. On Verified, 1 task = 0.2 points, so a drop from 46.8% to 35.6% is about 56 fewer solved tasks out of 500.

    !!! bridge "Speech bridge"
        Think of Pass@1 as sentence accuracy on a fixed test set, and F2P/P2P as "the target word is now right" plus "no other words got worse". **Where it breaks:** a patch is judged only by tests, so a patch that passes weak tests counts as correct even if a human would reject it; there is no edit-distance partial credit like WER.

    ### How a coding agent works { #primer-agent }

    An LLM **agent** is a loop: the model reads the conversation so far, writes one action (here, a bash command such as `grep -rn "display" django/`), the environment runs it, and the output is appended to the conversation. Repeat until the model submits.

    The paper uses **mini-swe-agent**, a deliberately minimal scaffold whose only tool is bash, with temperature 0 and a cap of 250 actions per task (§IV-C). Two costs matter:

    - **actions**: how many loop iterations;
    - **input tokens**: because the whole history is re-sent every step, input tokens grow roughly quadratically with the number of actions. That is why a 60% increase in actions can come with a 160% increase in input tokens (Table I, GPT 5.1, Level 2).

    ### Contamination vs memorization { #primer-contamination }

    **Contamination** means test material appeared in training data. For SWE-bench this is nearly unavoidable: the repos (Django, sympy, scikit-learn…), their issues, and their fixing commits are all public on GitHub.

    **Memorization** is what the model does with that exposure: it can recall a specific file path, symbol, or even the fix without reading the repo. The paper's motivation experiment tries to detect this directly (§II): experts reveal the issue a little at a time and check whether the model produces task-specific details it hasn't been shown.

    The subtle part: some "memory" is legitimate expertise. A senior Django developer also knows where display methods live. Hold that thought for Part IV.

    !!! bridge "Speech bridge"
        This is the LibriSpeech problem: an LM trained on public-domain books may have seen the very text of the test utterances, so a low WER partly reflects text memory, not acoustics. **Where it breaks:** in ASR you can swap the LM's text; here the "text" is the repository itself, which the agent must read to do the task.

    ### ASTs and topological sorting { #primer-ast }

    An **abstract syntax tree (AST)** is the parsed structure of code: `class CharField(Field): ...` becomes a `ClassDef` node with a `bases` list containing `Name("Field")`. Python's `ast` module gives you this, and `ast.unparse` turns it back into source. Using the AST (not regex) is how you find *every* identifier the repo defines without touching strings or comments by accident.

    A **topological sort** orders items so every item comes after the things it depends on. If `CharField` subclasses `Field`, then `Field` must be defined first: in Python, a class's base must exist *at the moment the class statement runs*. Many orders can satisfy the constraints; picking one uniformly at random gives a **random topological sort**.

## The problem { #problem }

A score of 72.8% on SWE-bench Verified could mean two very different things:

1. the agent reads an unfamiliar codebase, localizes the fault, and fixes it; or
2. the agent *recognizes* the codebase and part of the task, and jumps to where it already knows the fix lives.

The benchmark can't tell these apart, because every run sees the same canonical repository. The paper's motivation experiment suggests option 2 is common (§II, Fig. 1):

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/leakage.svg"
<figcaption><strong>What to notice:</strong> the dark right-hand segment. For 90 to 146 of 500 tasks, models reproduced concrete patch or test content before seeing any repository file. Numbers read from the bar labels in Fig. 1 of the paper.</figcaption>
</figure>

!!! paper "The paper says (§II, Fig. 1)"
    For every model, over 65% of Verified instances show "clear data-leakage evidence", and over 18% can be recalled down to the patch or test level. Experts reveal the issue in semantic units, broad to specific, and judge whether the output contains task details not yet shown.

!!! take "Our take"
    "Leakage evidence" here includes the *file/symbol recall* bucket, which is the biggest one. Guessing that a Django `get_FOO_display` bug lives in `django/db/models/` is something a well-read human would also do from the issue alone, so we'd treat the patch/test bucket (18–29%) as the strong evidence and the rest as softer. Also, GPT 5.1 sits at exactly 90/500 = 18.0%, so "more than 18%" is a rounding stretch.

**What people tried before.** Two families of fixes exist (§I, §VII):

- **Fresh benchmarks** (SWE-bench Live, SWE-rebench, SWE-bench Pro) only use issues created after a model's training cutoff. Clean, but smaller, and they drop the long tail of bugs in big mature repos.
- **Static perturbations** (e.g. RepoMirage, identifier obfuscation studies) transform the benchmark once. But a fixed transformed benchmark is just another public artifact: it can leak into the next training run.

⏸️ Before reading on:

!!! predict "Pause and predict"
    You want to disguise a repo so memorized cues vanish, but the benchmark can't itself become memorizable. What single property must the disguise have that a static perturbation lacks?

    ??? answer "Reveal"
        It must be **generated fresh at evaluation time from a seed**, so there's no single transformed artifact to learn. The paper calls the repository an "evaluation-time latent variable" (§III-A). The tempting answer "make it harder to read" is wrong: the goal is *equally* readable but *unfamiliar*.

So the target is clear. How do you change what an agent sees without changing what the code does?
{ .rd-next }

## Part II: What and how { .rd-part }

## ⚡ The big idea { #big-idea }

**Same program, new clothes.** Every property that a correct fix depends on (behavior, tests, the bug itself) stays fixed. Every property that only *memory* would exploit (names, order, wording, local code style) is re-drawn from a seed each time the agent enters.

If an agent truly reasons over the repository, its score should be invariant to the clothes. If the score drops, the drop measures how much it was leaning on recognition.

!!! bridge "Speech bridge"
    It's a speaker-shift test. Evaluate an ASR model on the same sentences read by a voice it never heard: the words (the "program") don't change, only the surface realization. A robust model shouldn't care. **Where it breaks:** a new voice carries no meaning, but names in code *do*. `render_label` is a fine synonym for `get_display`, yet `LedgerSuite` for `QuerySet` loses domain meaning a reader could legitimately use. The disguise isn't perfectly information-neutral, which matters in Part IV.

!!! predict "Pause and predict"
    Of the four lenses (reword issue, rename namespace, reorder definitions, rewrite code near the fix), which do you expect to hurt Pass@1 the most, and which the least?

    ??? answer "Reveal"
        Renaming (Level 2) hurts most for every model: 6.0 to 7.4 points (Table I). Rewording the issue (Level 1) hurts least: 0 points for both GPT models, 2.0 for DeepSeek. Many people guess the code rewrite (Level 4) is worst because it touches the bug; it costs only 1.2 to 2.8 points. Names are the handle agents grab first.

## How it works { #how-it-works }

### Start from the simplest version

**Naive version: rename things in the repo with find-and-replace.** Rename `QuerySet` to `LedgerSuite` in every file and run the agent.

That breaks immediately in three ways:

1. You renamed `dict` or `numpy.array` somewhere, and nothing imports.
2. You renamed `QuerySet` but `RawQuerySet` still says `Query`, so the old name leaks through.
3. You changed the physical repo, so the SWE-bench tests (which import `django.db.models.query`) no longer find anything.

Each fix below answers one of these, and together they are Level 2.

### Level 2: the namespace mapping (the heart of it)

**Fix 1 (only repo-owned names).** Walk the AST and collect identifiers the repository defines: classes, functions, module-level variables, import references. Throw away Python built-ins, keywords, and third-party symbols (§III-C).

**Fix 2 (token-level consistency).** Split each identifier into subword tokens and map each token *once* for the whole repository. `QuerySet` → `Query`+`Set` → `Ledger`+`Suite`. Now `RawQuerySet` becomes `RawLedgerSuite` and `query.py` becomes `ledger.py`: the disguise is internally coherent, so relationships between names survive. Casing conventions (CamelCase, snake_case, UPPER_CASE, dotted module paths) are preserved.

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/level2-mapping.svg"
<figcaption><strong>What to notice:</strong> the mapping is per <em>token</em>, not per identifier. One decision (query → ledger) propagates to every name, path and file that contains it, which is what keeps the fake repo self-consistent.</figcaption>
</figure>

**Fix 3 (don't touch the real repo).** The physical repository is never modified. A **bidirectional translator** sits between agent and container: observations (issue text, file contents, command output, tracebacks) are translated real → virtual; the agent's commands are translated virtual → real before execution (§III-C). A session notebook records which substitutions actually occurred, and reverse translation only uses those (§III-F).

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/translator.svg"
<figcaption><strong>What to notice:</strong> the agent never sees a real name and the container never sees a fake one. Everything executes in the true SWE-bench environment.</figcaption>
</figure>

<div class="rd-widget" id="sr-remap" role="group" aria-label="Namespace remapper: see how one seed renames a set of identifiers consistently"><noscript>This widget needs JavaScript.</noscript></div>
<script src="assets/widget-remap.js"></script>
<p class="rd-widget-caption"><strong>Try this:</strong> slide the seed and watch <code>QuerySet</code> and <code>RawQuerySet</code>: whatever <code>query</code> becomes, it becomes in both. Then add a line <code>len</code> or <code>setattr</code> and see it stay untouched. (A toy vocabulary; the paper asks an LLM for candidate synonyms.)</p>

### Level 1: reword the issue

An LLM rewrites the problem statement: reorders information, paraphrases, drops non-essential details. A verifier LLM checks nothing task-defining was lost and triggers a refinement if it was; a human engineer does a final review (§III-B, §III-F). The goal is to remove "I've seen this exact issue text" cues.

### Level 3: shuffle definitions within a file

Within each file (and within each class body), find **runs** of reorderable definitions: top-level functions, classes, methods. Any other statement (an import, an assignment) is an anchor that splits runs. For each run, build a dependency graph \(G\) whose edges are names needed *at definition time*: decorators, default values, type annotations, base classes, class-body expressions. Sample a random topological order of \(G\) (§III-D).

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/level3-reorder.svg"
<figcaption><strong>What to notice:</strong> only definition-time dependencies create edges. <code>make_label</code> is called inside a method, but that call runs later, so <code>make_label</code> can go anywhere.</figcaption>
</figure>

Unlike Levels 1–2, Level 3 really does change file contents. It's materialized as an overlay the agent works in, and the evaluation still happens against the original repository state (§III-D).

### Level 4: rewrite the code around the bug

A rewriting agent is given the code region tied to the fix and asked to produce a diff that is **behaviorally equivalent but looks different**: its job is explicitly *not* to fix the bug (§III-E). The idea: if an agent has memorized "line 783 of `fields/__init__.py` looks like this, and the fix goes here", a different-looking but equivalent implementation removes that anchor.

### The validity checks that make this a fair test

The whole method stands or falls on "the task didn't change". The paper checks each level (§III-F):

| Level | Check |
|---|---|
| all | humans inspect 100 random instances per level: same task, same issue, same information available |
| 1 | human engineer reviews every reconstructed statement |
| 2 | translator changes only namespace-bearing arguments, never the bash command itself |
| 3, 4 | keep a transformed repo \(V\) only if \(\mathrm{P2P}(V)=1\) and \(\mathrm{F2P}(V)=0\) |

That last row is worth decoding. \(\mathrm{P2P}(V)=1\): every test that passed before still passes, so behavior is preserved. \(\mathrm{F2P}(V)=0\): the bug-revealing tests still *fail*, so the rewrite didn't accidentally fix (or hide) the bug. Both together mean "still the same unsolved task".

### The one equation: recovering the patch

The agent edits a disguised repo, but SWE-bench grades a patch against the original. The paper builds the submission from final file *states*, not from whatever diff text the agent printed (§III-G):

\[
\mathrm{final\_submission}=\bigoplus_{f\in C_{B}}\mathrm{Diff}(b_{f},r'_{f})
\]

| Symbol | Meaning |
|---|---|
| \(B\) | the original repository state for the task |
| \(R'\) | the final repository state after transformations and agent edits (mapped back to real coordinates) |
| \(C_B\) | the set of files whose final contents differ from the original |
| \(b_f\), \(r'_f\) | the original and final contents of file \(f\) |
| \(\bigoplus\) | concatenate the per-file diffs into one patch |

**In words:** for every file that ended up different, diff the original against the final version, and glue those diffs together.

**Tiny example.** Say the agent changed one line in `fields/__init__.py` and nothing else, under Level 3 where that file's definitions were shuffled. Then \(C_B=\{\texttt{fields/\_\_init\_\_.py}\}\) *after* the code restores the original definition order, so the diff is one line, not the whole reshuffled file. Under Level 4 the rewrite itself sits in \(r'_f\), so the submission also carries the (behavior-preserving) rewrite, which is fine because P2P already passed on it.

!!! code "The code does ([`swebench_mapped.py`, `build_state_based_submissions_from_contents`](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/src/minisweagent/run/benchmarks/swebench_mapped.py#L317-L361))"
    It builds two patches per file: the agent's own patch (perturbed → current) and the final submission (base → current), and for Level 3 files it first calls `restore_original_file_order` so the reorder is undone before diffing.

### ⚡ The core loop in five steps { #core-loop }

1. **Seed.** Pick a seed for this run (the paper uses three per level and averages, §IV-C).
2. **Disguise.** Reword the issue (L1), build the token map (L2), and load a pre-validated reordered (L3) and rewritten (L4) variant.
3. **Translate.** The agent sees only virtual names; each command is mapped to real names, run in the real container, and the output mapped back.
4. **Recover.** When the agent submits, diff original files against final files (undoing the L3 reorder).
5. **Grade.** Run the ordinary SWE-bench F2P/P2P tests. Compare Pass@1, actions and tokens with the undisguised baseline.

In pseudocode:

```text
for instance in SWE-bench Verified:
    for seed in {s1, s2, s3}:
        view = disguise(instance, seed, levels)          # L1 text, L2 map, L3/L4 overlays (pre-validated)
        agent.run(view.issue, env = Translator(view.map, real_container))
        patch = concat(diff(b_f, restore(r'_f)) for f in changed_files)
        record(pass = swebench_grade(instance, patch), actions, tokens)
report mean over seeds, vs baseline
```

### One example by hand

Take the hook's bug with seed 2 of our toy map (see the toy below): `field→column`, `get→fetch`, `display→label`.

1. Issue text in: *"overriding `get_first_name_display` is ignored"* → agent sees *"overriding `fetch_first_name_label` is ignored"*.
2. Agent runs `grep -rn "fetch_%s_label" object_models/` → translated to `grep -rn "get_%s_display" models/`, runs, returns `models/fields.py: setattr(cls, "get_%s_display" ...)`, translated back to `object_models/entries.py: setattr(cls, "fetch_%s_label" ...)`.
3. Agent adds `if not hasattr(cls, ...)` guard in `object_models/entries.py` → the command is mapped back and the edit lands in the real `models/fields.py`.
4. Final state differs only in `models/fields.py` → \(C_B\) has one file → one-hunk patch → F2P tests pass → solved.

The memorizing shortcut in step 2 (knowing the literal string `get_%s_display`) is exactly what the disguise removes; the reasoning path (search for what the issue describes) still works.

!!! predict "Pause and predict"
    Level 2 never touches the physical repo, but Levels 3 and 4 do. Why can't Level 3 also be done purely in the translator, like Level 2?

    ??? answer "Reveal"
        Renaming is a string substitution that can be applied to any text in either direction. Reordering changes *where lines are*, so every `sed -n 120,140p`, every line number in a traceback, and every edit the agent makes would need a line-level remapping of the whole file on every step. It's simpler to materialize the shuffled file, then undo the order when recovering the patch, which is what the code does.

We have the machinery. But does it tell us anything, or is a disguised Django simply harder for anyone?
{ .rd-next }

## Build a toy version { #toy }

!!! take "Educational simplification"
    This toy keeps the mechanism and drops everything else: a hand-written synonym table instead of LLM-generated candidates, regex identifier matching instead of full AST scoping, base-class edges only for Level 3, no Level 1 or 4, no Docker, and two scripted "agents" instead of an LLM. It's plain Python rather than PyTorch because there is no model to train: the paper's contribution is the transformation. It is not the paper's implementation.

The toy repo has the Django-style bug from the hook. We disguise it with three seeds, run the same "test" in each view (translated through the map), and compare a **memorizer** (looks for the literal string it remembers) with an **explorer** (reads every file and matches the issue text).

```python
--8<-- "papers/2609.27891-schrodinger-repo/assets/toy.py"
```

Real output (Python 3.10, CPU, 0.03 s):

```text
canonical  memorizer: ('models/fields.py', 1)  explorer: ('models/fields.py', 7)
canonical  test -> 'First Name'

seed 0: ['records/columns.py', 'records/ledger_suite.py']  order=['Column', 'GlyphColumn', 'craft_tag']
   test -> 'First Name' | same behaviour: True
   memorizer: (None, 2)  explorer: ('records/columns.py', 7)

seed 1: ['object_models/columns.py', 'object_models/ledger_batch.py']  order=['craft_tag', 'Entry', 'TextEntry']
   test -> 'First Name' | same behaviour: True
   memorizer: (None, 2)  explorer: ('object_models/columns.py', 7)

seed 2: ['object_models/entries.py', 'object_models/ledger_batch.py']  order=['build_tag', 'Column', 'TextColumn']
   test -> 'First Name' | same behaviour: True
   memorizer: (None, 2)  explorer: ('object_models/entries.py', 7)

seed 2 bug line: setattr(cls, 'fetch_%s_label' % self.name, lambda obj: build_tag(self.name))
```

**Read it like this.** Behavior is identical in every view (`same behaviour: True`), and `Column` always precedes `GlyphColumn` because the topological sort respects the base class. The memorizer finds the bug in 1 step on the canonical repo and **fails** in every disguise. The explorer succeeds everywhere, and pays the same 7 steps each time, which is the paper's story in miniature: a pure recognizer collapses; a reasoner is invariant but slower than a recognizer on familiar ground.

!!! take "A bug our toy exposes on purpose"
    Look at seed 2: the directory `fields` became `entries` but the class `Field` became `Column`. Our table maps the tokens `field` and `fields` independently. That's harmless to execution but breaks the reader's ability to connect a file to its class, i.e. the disguise got *harder than the original*. A real mapper has to handle morphology (plurals, abbreviations like `qs` for QuerySet) or it quietly adds difficulty. Keep that in mind for Part IV.

## Paper ↔ code map { #code-map }

Repo: [cslsolow/Schrodinger-Repo](https://github.com/cslsolow/Schrodinger-Repo), read at commit `e2eef98`. It is a fork of mini-swe-agent plus a `glasses/` package for the transformations. License: MIT (the `LICENSE.md` carries the original mini-swe-agent copyright).

<div class="rd-wide" markdown>

| Paper component | Code | Notes |
|---|---|---|
| L1 issue reconstruction (§III-B) | [`glasses/translate_verified_problems.py`, L15–L25](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/translate_verified_problems.py#L15-L25) | one chat call, temperature 0, default model `gpt-5.4-mini` |
| L2 token candidates + seeded map (§III-C) | [`glasses/mapper.py`, `create_token_mapping` L235](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/mapper.py#L235-L254), [`reconstruct_identifier` L256](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/mapper.py#L256-L280) | LLM proposes 5 alternatives per token; seeded RNG picks one, never reusing a virtual token |
| L2 identifier extraction and filtering | [`glasses/extractor.py`](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/extractor.py) | filters `builtins`, external import roots |
| L2 bidirectional translator | [`mapped_agent.py`, `execute_actions` L171–L208](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/src/minisweagent/agents/mapped_agent.py#L171-L208) | virtual → real command, real → virtual output (errors handled separately) |
| L3 random topological sort (§III-D) | [`glasses/intra_file_reorder.py`, L180–L223](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/intra_file_reorder.py#L180-L223) | retries up to 32 times to get an order different from the original |
| L3/L4 validity: P2P = 1, F2P = 0 (§III-F) | [`build_verified_level3_store.py`, `pass_to_pass_clean` L372–L381](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/build_verified_level3_store.py#L372-L381) | matches the paper: P2P clean *and* F2P still failing |
| L4 rewrite agent (§III-E) | [`level4_agentic_function_body_rewrite.py`, L19–L60](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/level4_agentic_function_body_rewrite.py#L19-L64) | a mini-swe-agent run at temperature 1 inside the task's Docker image |
| Patch recovery (§III-G) | [`swebench_mapped.py`, L317–L361](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/src/minisweagent/run/benchmarks/swebench_mapped.py#L317-L361) | undoes the L3 order before diffing |

</div>

### Where the code differs from the paper

!!! paper "The paper says (§IV-C)"
    Level 3 reordering is applied only within files related to the golden patch; Level 4 rewriting only to golden-patch-related regions.

!!! code "The code does ([`build_level3.sh` L8](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/build_level3.sh#L8), [`intra_file_reorder.py` L338–L339](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/intra_file_reorder.py#L338-L339))"
    Level 3 picks files from the **hotspots of a GPT-5.4-mini baseline trajectory** (top 8 files the baseline agent touched), and the README calls this the "lite path". Level 4 does use the golden patch ([`build_verified_level4b_store.py` L671](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/build_verified_level4b_store.py#L671)). We can't tell from the repo which selection produced Table I.

!!! paper "The paper says (§III-B)"
    Level 1 uses a generator LLM, then a verifier LLM that triggers refinement if task-defining information is lost; the rewrite may remove identifiers when not functionally required.

!!! code "The code does ([`translate_verified_problems.py` L15–L25](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/translate_verified_problems.py#L15-L25))"
    A single paraphrase call with no verifier stage in this script, and the prompt says to **keep** identifiers, file paths and API names verbatim. (When Level 2 is also on, those identifiers are then renamed by the translator.)

!!! code "The code does ([`level4_agentic_function_body_rewrite.py` L47](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/level4_agentic_function_body_rewrite.py#L47))"
    In the golden-patch-local mode, the rewriter is told to prefer "the smallest viable local rewrite" and may fall back to introducing temporaries, renaming locals, or reordering independent statements. That's milder than the paper's "substantially different form" (§III-E), and may explain why Level 4's effect is small.

### Hyperparameters and tricks that quietly matter

- **Which LLMs build the disguise** (not stated in the paper): Level 1 paraphrases with `gpt-5.4-mini` ([`build_level1.sh` L14](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/build_level1.sh#L14)); Level 2 synonyms come from `openai/gpt-5-mini` ([`build_level2.sh` L24](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/build_level2.sh#L24)); Level 4 rewrites with `gpt-5.4-mini` ([`build_level4.sh` L11](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/build_level4.sh#L11)). GPT-5.4-mini is also one of the evaluated agents.
- **Level 4 over-generation:** 12 candidate rewrites per instance, keep the first 3 that pass validation (`--variant-count 12`, `--target-variants 3`, [`build_level4.sh` L68–L69](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/build_level4.sh#L68-L69)).
- **Brand names get generic replacements:** the repo's own name maps to one of `app`, `core`, `engine`, `base`, `hub` ([`mapper.py`](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/mapper.py#L201-L202)).
- **Default seed 42** for Levels 2–4 in the run scripts; the three-seed protocol (§IV-C) has to be set by hand.

### What's missing

The repo covers SWE-bench Verified only. We found no configs or scripts for SWE-QA (RQ3) or SWE-rebench (RQ4), no released trajectories or result files, no action-categorization script for Fig. 3, no data from the human validation or the motivation experiment, and Level 3 expects a baseline-trajectory directory (`../v2_baseline/...`) that isn't included.

### How to run it

```bash
git clone https://github.com/cslsolow/Schrodinger-Repo && cd Schrodinger-Repo
export OPENAI_API_KEY=...          # disguise-building calls go to OpenAI models
bash build_level1.sh               # paraphrase issues
bash build_level2.sh               # token maps
bash run_level1_level2.sh          # evaluate with L1+L2 on the 500 Verified instances
```

We read the code but did not run it: it needs Docker, the SWE-bench images, and paid API calls.

## Part III: Does it actually work? { .rd-part }

## ⚡ The evidence { #evidence }

**Metrics.** *Pass@1*: % of tasks solved in a single run (higher is better). *Avg. actions*: agent loop steps per task. *Avg. input/output tokens*: inference cost. On SWE-QA, *Score*: the benchmark's default answer-quality score, 0–100. Pass@1 differences are in percentage points; 1 task on Verified = 0.2 points, and each setting is averaged over three seeded views (§IV-C).

**How to read Table I.** For each model, compare the *Baseline* row with the *SchrodingerRepo* row (all four levels), then look down the Level 1–4 rows to see which lens carries the effect. Stars mark p < 0.05 and p < 0.01.

<div class="rd-widget" id="sr-results" role="group" aria-label="Table I explorer: Pass@1, actions, and input tokens per transformation level for each model"><noscript>This widget needs JavaScript.</noscript></div>
<script src="assets/widget-results.js"></script>
<p class="rd-widget-caption"><strong>Try this:</strong> pick DeepSeek-v4-Flash and compare "L2 rename" with "Full": identical Pass@1 (66.8%). Then switch to input tokens and see Full cost 3.5× the baseline. All numbers from Table I.</p>

**The results that carry the argument.**

- **Full disguise costs 6.0–14.4 points** (Table I): GPT 5.1 44.6 → 36.2, GPT-5.4-mini 46.8 → 35.6, DeepSeek-v4-Flash 72.8 → 66.8, Gemini-3.1-Flash-Lite 56.7 → 42.3.
- **Names do most of the damage.** Level 2 alone costs 7.4 / 6.4 / 6.0 points for GPT 5.1 / GPT-5.4-mini / DeepSeek, all p < 0.01. For GPT 5.1 and DeepSeek, Level 2 alone is within one point of the full disguise.
- **The bill arrives as exploration.** Full disguise multiplies input tokens by 2.6× (GPT 5.1), 3.6× (GPT-5.4-mini), 3.5× (DeepSeek) (Table I).

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/action-shares.svg"
<figcaption><strong>What to notice:</strong> over 80% of the extra actions are spent finding things (blue), not fixing or testing them. DeepSeek explores by running code (probe); GPT-5.4-mini by reading and grepping. Numbers read from Fig. 3 of the paper.</figcaption>
</figure>

- **Exploration style predicts robustness** (§V-B). DeepSeek already takes ~46 actions per task at baseline and loses 6 points; GPT-5.4-mini takes ~11 and loses 11.2. The authors read this as a trade-off: more exploratory agents recover more of the missing context.
- **Transfers to question answering** (Table II, SWE-QA, 144 questions over 3 repos): GPT-5.4-mini score 70.35 → 65.71; DeepSeek 72.97 → 72.42, with actions up 18% and 43%.
- **The control: fresh tasks** (Table III). On 110 SWE-rebench tasks created after GPT-5.4-mini's release, the full disguise leaves Pass@1 **unchanged at 17.27%** while actions rise 8% and input tokens 22%.

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/case-study.svg"
<figcaption><strong>What to notice:</strong> the fix is identical; only the search changed. This single instance (§V-E) is an extreme case, about 6× the actions, versus the 1.6–2.2× average in Table I.</figcaption>
</figure>

!!! predict "Pause and predict"
    The fresh-task control (SWE-rebench) shows zero Pass@1 change. Before reading Part IV: how many tasks does "17.27% → 17.27%" correspond to, and how confident should that make you?

    ??? answer "Reveal"
        17.27% of 110 is 19 tasks. With only 19 successes, one model, and no reported interval, a real drop of 2–4 points (the size of Levels 3 and 4 on Verified) would be hard to rule out. It's supportive evidence, not a tight control.

**What the ablations prove** (Table I, level-wise rows):

- Level 1 (reword issue): ~0 effect on Pass@1. Memorized *issue wording* isn't what agents rely on.
- Level 2 (rename): the dominant effect on both score and cost, in every model tested and in SWE-QA too.
- Level 3 (reorder): 0.8–3.4 points; significant only for GPT-5.4-mini.
- Level 4 (rewrite): 1.2–2.8 points; significant for GPT-5.4-mini and DeepSeek.
- Effects are **not additive**: the sum of single-level drops often exceeds the full drop (DeepSeek: 2.0 + 6.0 + 0.8 + 2.8 = 11.6 vs 6.0 full).

**What isn't shown.**

- No confidence intervals or per-seed spread; the statistical test behind the stars isn't named anywhere in the paper.
- Gemini ran only baseline and full, on the 300 instances with the *strongest leakage evidence* (§IV-A), so its 14.4-point drop is not comparable to the others.
- No human or non-memorizing reference (e.g. an agent on a never-seen repo, or a model with an older cutoff) to separate "unfamiliar" from "intrinsically harder to read".
- The disguise-building LLMs aren't named in the paper (we found them in the code).

## Part IV: Think like a reviewer { .rd-part }

## Why this way and not another { #why-not }

<div class="rd-wide" markdown>

| Choice | Obvious alternatives | Why this one | What would likely happen otherwise | Evidence |
|---|---|---|---|---|
| Rename in a translator, never on disk (L2) | Rewrite every file with new names | Tests, imports, Docker images stay valid; no validation run needed | On-disk renaming would break SWE-bench's test IDs and imports, requiring re-running every test suite | 📄 §III-C; 🧠 for the counterfactual |
| Map subword **tokens**, not whole identifiers | Random opaque names (`func_17`) | Keeps the repo readable and internally consistent (`QuerySet`/`RawQuerySet` still related) | Opaque names would measure "obfuscated code is hard", a different and uninteresting claim | 🧠 reasoned; compare PoorCodeSumEval's obfuscation (§VII-B) |
| LLM-proposed synonyms | WordNet, fixed dictionary | Code-aware vocabulary (e.g. "ledger" for "query") | Dictionary synonyms would often be odd or collide with Python keywords | 🧠; code shows keyword and identifier checks ([`mapper.py`](https://github.com/cslsolow/Schrodinger-Repo/blob/e2eef98caa076539c4c39f130c92da1fb9ad796e/glasses/mapper.py#L66-L71)) |
| Fresh seed per run, 3 seeds averaged | One fixed transformed benchmark | No single artifact to leak; measures robustness across views | A fixed disguise becomes the next memorized benchmark | 📄 §IV-C, §VII-B |
| L3/L4 only on fix-related files | Whole repository | Cost of validation (full test suites per variant) | Whole-repo reorder would disrupt more exploration; effect sizes of L3/L4 likely larger | 📄 §IV-C (cost argument); 🧠 for effect size |
| Keep variants only if P2P=1 and F2P=0 | Trust the rewriter | Guarantees "same unsolved task" | An LLM rewrite could silently fix the bug or break other tests, inflating or deflating scores | 📄 §III-F |
| Diff final file states, not agent's patch text | Take the agent's emitted patch and reverse-map it | Robust to translation of diff text and to L3 line shifts | Reverse-translating diffs would break on shifted line numbers | 📄 §III-G |

</div>

**The decision that matters most** is the token-level, meaning-preserving synonym map. It's what makes the claim "the agent relied on familiarity" rather than "the agent can't read obfuscated code". It's also the weakest joint: a synonym is never a perfect synonym, and the paper has no measurement of how much meaning each map loses.

## What's genuinely new { #novelty }

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/lineage.svg"
<figcaption><strong>What to notice:</strong> the two lines of work, fresh tasks and perturbed tasks, meet here. Years as listed in the paper's references. The arrows show the two threads SchrodingerRepo joins.</figcaption>
</figure>

**Borrowed.** The benchmark (SWE-bench Verified), the scaffold (mini-swe-agent), the grading (F2P/P2P), the idea that models recall task locations (SWE-bench Illusion), the idea of perturbing repos (RepoMirage, obfuscation studies), and the textbook tools (AST traversal, random topological sort).

**New.** Three things. (1) Making the disguise **dynamic and seeded**, so the benchmark itself can't be memorized. (2) Doing renaming through an **invertible translator** so the real environment never changes. (3) A **level-by-level decomposition** showing that names, not wording or layout, carry most of the familiarity effect, plus the behavioral finding that the cost shows up as exploration.

🧠 Why nobody did the translator trick earlier: agent evaluation only became dominated by bash-driven agents on a handful of famous repos around 2024–2025, and contamination worries for SWE-bench Verified became mainstream only recently (the paper cites OpenAI's 2026 note on this, §II).

## Reviewer's corner { #reviewer }

**1. The disguise may add difficulty, not only remove familiarity.** A renamed repo loses *legitimate* information: `QuerySet` means something to any Python developer; `LedgerSuite` doesn't. The paper's defenses are human inspection of 100 instances per level (§III-F) and the SWE-rebench control (§V-D). Neither measures how much naming quality degrades. A cleaner test: evaluate the same disguise on a repo the model provably never saw (e.g. a private one) and check the drop is near zero.

**2. The control is thin.** RQ4 is one model, 110 tasks, 19 successes, baseline Pass@1 only 17.27% (Table III). It also transforms repos that the model *may still know well* (SWE-rebench draws from GitHub too), so "no drop" is ambiguous: either the transformation is fair, or on hard fresh tasks nothing familiar was helping in the first place. And actions still rose 8% (Table III), which suggests some intrinsic cost.

**3. Selection effect on Gemini.** Gemini ran on the 300 instances with the strongest leakage evidence (§IV-A). If you pick the most-memorized tasks, you should expect the biggest drop, so the headline range "6.0–14.4" mixes a full-set and a cherry-picked-set number. Table I also shows no significance stars on the Gemini row, while the text says all drops are significant (§V-A).

**4. Statistics are underspecified.** No test is named, no intervals given, and it's unclear whether the baseline was also run three times. Averaging three seeds of an agent at temperature 0 on the *same* view isn't reported, so we can't see run-to-run noise. We also found an arithmetic slip: GPT-5.4-mini Level 1 actions 11.25 → 11.56 is +2.8%, but Table I prints ↑12.78%.

**5. The code and paper disagree on Level 3 targets.** The paper says golden-patch files (§IV-C); the code picks files a GPT-5.4-mini baseline trajectory touched. Either way, the perturbation is placed with knowledge of where the answer is, and for the trajectory version it's tuned to one model's search habits. That could make Level 3 hit GPT-5.4-mini harder than others, which is exactly the pattern in Table I (only GPT-5.4-mini's Level 3 drop is significant).

**6. The disguise builder is also a contestant.** Level 1 paraphrases and Level 4 rewrites were produced by GPT-5.4-mini in the released code, one of the evaluated models. A model rewriting text it has memorized may leave (or strip) cues differently for itself than for others.

**7. "Memorization" vs expertise.** Real-world agents mostly work on public, popular codebases, where familiarity is a feature. The paper's framing ("memorized", "leakage") treats all familiarity as contamination. The results show *reliance on familiar surface cues*, which is valuable to know, but it's not the same as showing the benchmark measures nothing.

!!! take "Steelman"
    **Criticism 1 (disguise adds difficulty)** → the authors would point out that the score is unchanged on post-cutoff tasks (Table III) and that tokens are mapped to "semantically plausible alternatives" with human spot checks (§III-C, §III-F). → Where that leaves us: plausible for the direction of the effect, but the *size* of the "memorization share" remains an upper bound until someone measures the drop on truly unseen repos.

    **Criticism 3 (Gemini subset)** → the authors would say the subset was a cost decision and is disclosed (§IV-A), and that three full-set models already show 6–11 point drops. → Fair: drop Gemini and the conclusion stands at 6.0–11.2 points. The headline range should just say so.

## Scope and boundaries { #scope }

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/scope.svg"
<figcaption><strong>What to notice:</strong> the evidence occupies one corner: famous Python repos, bash-only agents. Everything above and to the left is extrapolation.</figcaption>
</figure>

**Where it works.** Python repositories from SWE-bench Verified and three SWE-QA repos (§V-A, §V-C); bash-only agents (mini-swe-agent); four API models in the "mini/flash" tier plus GPT 5.1.

**Where it probably breaks.**

- *Agents with language-server tools.* "Go to definition" doesn't care what a symbol is called, so Level 2 would mostly vanish as a cue, and the translator would need to rewrite LSP responses too (the authors flag this, §VI).
- *Statically typed languages.* Renaming in Java or Go touches package names, reflection strings, and build files; the "filter out third-party names" step gets much harder.
- *Repos with heavy string-based dispatch.* Django builds method names from `"get_%s_display"` strings. The translator must rename inside strings consistently, and any miss leaks the real name or breaks behavior (in the case study it clearly did handle it, §V-E).
- *Frontier models.* The evaluated models are mostly small/fast tiers. Bigger models might explore better (smaller drop) or memorize more (bigger drop); the paper can't say.

**What it assumes about resources.** SWE-bench Docker images, three seeded runs per level per model (six settings × three seeds, so up to 18 full Verified runs per model for Table I), validation runs of full test suites for every Level 3/4 candidate, and paid LLM calls to build the disguises. The paper reports no cost figures; 🧠 given 3.5× input tokens under the full disguise, expect evaluation cost to roughly triple.

## Part V: Beyond the paper { .rd-part }

## Applications { #applications }

- **Contamination audits for any repo benchmark.** Run your leaderboard under disguise; report the gap alongside the score.
- **Choosing agents for private codebases.** The disguised score is a better predictor of performance on your company's never-seen repo than the canonical score (🧠 our inference, untested in the paper).
- **Training-data augmentation** (🧠): train coding agents on seeded disguises so they learn to search rather than recall; the translator gives free, verified variants of every training repo.
- **Unexpected: interview and education settings** (🧠). Disguise a famous library before giving it to students so that searching the web for the exact error message doesn't hand them the answer.

## What to carry forward { #carry-forward }

**For the field**

- A benchmark score is a property of *(model, task, presentation)*. Vary the presentation and report the spread.
- An **invertible observation transform** lets you perturb what a model sees while the environment and grader stay untouched. That pattern works for any agent benchmark with a text interface.
- Look at **cost, not just success**: the clearest signal here was actions and tokens, which moved even when Pass@1 didn't (Table III).

**For your own work (speech)**

- Audit your ASR on LibriSpeech-style public test sets by **re-rendering the same text with a new voice** (TTS or a different speaker) and comparing with a paraphrased transcript read by the same voice. If WER jumps only when the *text* changes, your LM has memorized the test text.
- For speech LLMs answering questions about audio, apply "Level 1" literally: paraphrase the question and swap named entities consistently, and see if accuracy holds.

## What's next { #whats-next }

*Found by us, not mentioned in the paper:* as of 30 September 2026 we found no follow-up papers citing this one (it appeared on arXiv on 21 August 2026; OpenAlex and Semantic Scholar list no citations yet). Related work the paper itself builds on is in the references below.

**Open problems the authors name.** Extending to richer tool interfaces (IDE APIs, language servers), and to languages beyond Python (§VI, §VIII).

**Open problems we'd add** (🧠):

- Measure the **information loss** of each name map (e.g. how well a model or human can predict a function's purpose from the disguised vs real name) and correct the drop for it.
- A **calibration curve**: apply the same disguise to repos of known familiarity (from never-seen to famous) and fit drop vs familiarity. This would turn the gap into a contamination estimate.
- **Train on disguises** and check whether the gap closes without hurting canonical performance.

## Brainstorm lab { #brainstorm }

**1. What if the disguise were adversarial instead of random?** Pick the synonym for each token that maximizes the agent's confusion.

??? take "Suggested directions (think first)"
    - Measure worst-case vs average-case drop; a large gap means the average understates fragility.
    - Watch for "cheating" synonyms that are actually misleading (`get` → `delete`): you'd need a meaning-preservation check, e.g. an LLM judge or embedding similarity threshold.
    - Interesting result: if worst-case drops are 2–3× the average, report both on leaderboards.

**2. A laptop-scale experiment.** Take 30 SWE-bench Lite tasks from one repo, a small open model (7–14B) with mini-swe-agent, and your own Level 2 map built from the toy above. Run baseline vs disguise, 3 seeds.

??? take "Suggested directions (think first)"
    - Scale: ~180 agent runs; on one GPU with a 7B model and 50-action caps, roughly a day.
    - Measure Pass@1 and first-correct-file-opened step (localization latency), which is more sensitive than Pass@1 for small models.
    - Interesting: a small model with little memorized Django should show a *small* drop. If it drops a lot, the disguise is adding difficulty.

**3. Thought experiment: a perfect reasoner.** Would a perfect reasoner's action count be invariant under the disguise?

??? take "Suggested directions (think first)"
    - No: even a perfect reasoner uses prior knowledge (e.g. "Django puts model fields in `db/models/fields`"). Its *success* should be invariant, its *cost* need not be.
    - This suggests reporting Pass@1 invariance as the fairness criterion and action increase as a "familiarity dividend", as separate quantities.

**4. Transfer this to speech AI.** Build "SchrodingerLibri": at eval time, re-synthesize each LibriSpeech test utterance with a seeded voice *and* a seeded consistent entity swap (names, places) in the text.

??? take "Suggested directions (think first)"
    - Two factors like the paper's levels: voice (acoustic familiarity) and text (LM memorization). Measure WER for each alone and both.
    - Invertibility: keep the entity map so you can grade against the swapped reference.
    - Interesting: if Whisper-style models lose more on text swap than on voice swap for LibriSpeech but not for a private test set, you've found text memorization.

**5. Combine with test strengthening.** The paper keeps SWE-bench's original tests. What if you also add stronger tests (as UTBoost or SWE-ABS do)?

??? take "Suggested directions (think first)"
    - Two independent inflation sources: familiar cues and weak tests. Measure the 2×2.
    - Interesting: if memorized fixes are more likely to be *exactly right* (the real historical patch), disguise might hurt less under stronger tests. Or the reverse.

**6. What if the agent can use language-server "go to definition"?**

??? take "Suggested directions (think first)"
    - Predict: Level 2's effect shrinks because symbol navigation doesn't depend on recognizing names.
    - Test by adding one LSP tool to mini-swe-agent and translating its responses; compare the drop with and without the tool.

## Part VI: Lock it in { .rd-part }

## Self-quiz { #quiz }

**1. Which transformation level caused the largest Pass@1 drop, and roughly how large was it?**

??? answer "Answer"
    Level 2, namespace mapping: 6.0–7.4 points for GPT 5.1, GPT-5.4-mini and DeepSeek (Table I). A common wrong guess is Level 4, the code rewrite; it cost only 1.2–2.8 points.

**2. What two conditions must a Level 3 or Level 4 variant satisfy to be kept, and what does each guarantee?**

??? answer "Answer"
    P2P(V) = 1: all previously passing tests still pass, so behavior is preserved. F2P(V) = 0: the bug-revealing tests still fail, so the rewrite didn't fix the bug. Together they keep it "the same unsolved task" (§III-F).

**3. Why does a 60% increase in actions come with a ~160% increase in input tokens?**

??? answer "Answer"
    The agent re-sends its whole history each step, so input tokens per step grow with the number of past steps and total input grows roughly with the square of the action count. Long explorations are disproportionately expensive (Table I, GPT 5.1 Level 2: +63% actions, +162% input tokens).

**4. Why map subword tokens consistently across the whole repository rather than renaming each identifier independently?**

??? answer "Answer"
    Consistency keeps relationships visible (`QuerySet`, `RawQuerySet`, `query.py` all still share a root), so the repo stays as understandable as the original, only unfamiliar. Independent random names would turn the test into "can you read obfuscated code", which conflates difficulty with memorization.

**5. SWE-rebench Pass@1 didn't change under the full disguise. Explain why that matters for the paper's argument and one reason it's weaker than it looks.**

??? answer "Answer"
    It's the control: on tasks the model can't have memorized, the disguise doesn't reduce success, so the Verified drop is attributed to lost familiarity rather than added difficulty. Weaker than it looks: one model, 110 tasks, only 19 successes, no interval, and the repos themselves may still be familiar.

**6. Why does Level 2 live in a translator while Level 3 is materialized on disk?**

??? answer "Answer"
    Renaming is a reversible text substitution that can be applied to any command or output. Reordering moves lines, so line numbers in every command, traceback and edit would need remapping; it's simpler to materialize the reordered file and undo the order when recovering the patch.

**7. Application.** You maintain an internal leaderboard of coding agents on your company's monorepo, which is private. Should you expect a SchrodingerRepo-style disguise to change the ranking much? What would a large change tell you?

??? answer "Answer"
    You'd expect a small effect, because models can't have memorized a private repo. A large drop would suggest the disguise is adding difficulty (poor synonyms, broken string-based names) rather than removing familiarity, i.e. a bug in your disguise, or that your repo mirrors public code the models know.

**8. Application (speech).** Design the "Level 2" analogue for evaluating a speech LLM on spoken questions about a public podcast dataset.

??? answer "Answer"
    Consistently map named entities (people, places, product names) in both the audio (re-synthesize the affected spans or whole utterances) and the reference answers, with a seeded map per evaluation run. Keep the question semantics fixed, and grade against the mapped references. Compare accuracy with and without the map.

**9. Spot the flaw.** A colleague reports: "On Gemini-3.1-Flash-Lite the disguise dropped Pass@1 by 14.4 points, more than any other model, so Gemini relies most on memorized cues." What's wrong?

??? answer "Answer"
    Gemini was evaluated only on the 300 instances with the strongest leakage evidence (§IV-A), while the others used all 500. Selecting the most-memorized tasks inflates the expected drop, so the numbers aren't comparable. It also has no significance marks in Table I. You'd need Gemini on the full 500 to make the comparison.

## ⚡ Remember this { #remember }

**Same program, new clothes:** show the agent a freshly seeded disguise of the repository (new wording, names, order, local code) while the real code and tests grade it; the score it loses was riding on familiarity.

<figure class="rd-fig" markdown>
--8<-- "papers/2609.27891-schrodinger-repo/assets/remember.svg"
<figcaption><strong>What to notice:</strong> one program, many views; the gap between views is the measurement.</figcaption>
</figure>

1. **Names carry the memory.** Renaming repo-owned symbols (Level 2) alone costs 6–7 points on SWE-bench Verified; rewording the issue costs almost nothing.
2. **The cost is exploration.** Input tokens rise 2.6–3.6×, and over 80% of the extra actions go to navigating, searching, reading and probing.
3. **Read it as an upper bound.** The fresh-task control is small, and a synonym is never a perfect synonym, so part of the drop may be added difficulty.

*Mnemonic:* **"Rename it and re-grade it."** If the score moves, the model knew the repo, not the problem.

## Glossary { #glossary }

Abstract syntax tree (AST)
:   The parsed tree structure of source code; used here to find every identifier the repo defines.

Bidirectional translator
:   The component that converts agent commands from virtual to real names and outputs from real to virtual names (Level 2).

Contamination
:   Test material (repos, issues, fixes) appearing in a model's training data.

Definition-time dependency
:   A name that must already exist when a `def` or `class` statement runs (decorators, defaults, annotations, base classes).

FAIL_TO_PASS (F2P)
:   Tests that fail before a correct fix and pass after it; they check the bug is fixed.

Golden patch
:   The real historical fix for a SWE-bench task, hidden from the agent.

Level 1–4
:   SchrodingerRepo's lenses: problem statement reconstruction, namespace mapping, intra-file layout reordering, functionality-preserving rewrite.

mini-swe-agent
:   A minimal coding-agent scaffold whose only tool is bash; used for all experiments.

PASS_TO_PASS (P2P)
:   Tests that pass before and after a correct fix; they check nothing else broke.

Pass@1
:   Fraction of tasks solved in a single attempt.

Random topological sort
:   A uniformly chosen ordering of items that respects all dependency edges.

Repository view
:   The seeded, disguised version of a repository an agent sees in one evaluation run.

SWE-bench Verified
:   A 500-task, human-validated subset of SWE-bench.

SWE-QA
:   A benchmark of questions about a repository's code, answered by an agent.

SWE-rebench
:   A continuously refreshed benchmark of issues created after model releases; used here as a control.

Token map
:   The seeded one-to-one mapping from subword tokens (`query`) to replacements (`ledger`) used for the whole repo.

## References and further reading { #references }

- **The paper:** Chen, Yang, Gu, Shi, Wan, Guan. *Schrödinger's Code Repository: Have LLMs Learned SWE-bench or Memorized It?* [arXiv:2609.27891](https://arxiv.org/abs/2609.27891v1) (read: v1, August 2026).
- **Code:** [cslsolow/Schrodinger-Repo](https://github.com/cslsolow/Schrodinger-Repo) (MIT; read at commit `e2eef98`).

**Key prior work**

- Jimenez et al., *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?* [arXiv:2310.06770](https://arxiv.org/abs/2310.06770). The benchmark being disguised, and its F2P/P2P grading.
- Yang et al., *SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering* [arXiv:2405.15793](https://arxiv.org/abs/2405.15793). The team behind mini-swe-agent, the scaffold used for every run.
- Badertdinov et al., *SWE-rebench* [arXiv:2505.20411](https://arxiv.org/abs/2505.20411). Fresh post-cutoff tasks; the paper's control set (RQ4).
- Liang, Garg, Moghaddam, *The SWE-Bench Illusion: When State-of-the-Art LLMs Remember Instead of Reason* [arXiv:2506.12286](https://arxiv.org/abs/2506.12286). Earlier evidence that models recall file locations from issue text.
- Li et al., *RepoMirage: Probing Repository Context Reasoning in Code Agents with Perturbations* [arXiv:2605.26177](https://arxiv.org/abs/2605.26177). Static repository perturbations; the closest precursor.
- Peng et al., *SWE-QA: Can Language Models Answer Repository-level Code Questions?* [arXiv:2509.14635](https://arxiv.org/abs/2509.14635). The QA benchmark used for RQ3.

**Follow-ups (found by us):** none found as of 30 September 2026.
