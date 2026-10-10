---
title: "SchrodingerRepo"
paper_title: "Schrödinger's Code Repository: Have LLMs Learned SWE-bench or Memorized It?"
authors: ["Silin Chen", "Yufei Yang", "Xiaodong Gu", "Yuling Shi", "Chengcheng Wan", "Haibing Guan"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2609.27891"
arxiv_version: v1
code: {url: "https://github.com/cslsolow/Schrodinger-Repo", license: "not stated in the paper", note: "code and data (abstract footnote); not run here"}
paper_type: benchmark-dataset
hook: "Rename the files and functions in Django without changing what the code does, and coding agents solve 6 to 14 points fewer SWE-bench tasks."
big_idea: "Keep the program and its tests fixed but show each agent a fresh, seeded disguise of the repository; whatever score is lost was riding on familiar names, layouts and wording rather than on reasoning."
goal: "Decide how much to trust a coding agent's SWE-bench Verified score when picking one for your own private repository."
difficulty: 2
difficulty_note: "New subfield (coding agents and SWE-bench), but no heavy math: the ideas are experimental design, ASTs, and one topological sort."
date_added: 2026-09-30
tags: [LLMs, Agents, Code, Benchmarks, Evaluation, Robustness]
description: "Rename the files and functions in Django without changing what the code does, and coding agents solve 6 to 14 points fewer SWE-bench tasks."
---

<article class="rd-page" id="primer-swebench" data-part="Toolbox" data-draw="task" markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Our running example: Django issue 11999.</p>

## What does an agent have to do to solve a SWE-bench task?

1. **Start from a real GitHub issue.** SWE-bench has 2,294, each with its repository and a runnable environment (§I). Ours is Django issue 11999.
2. **The issue describes a bug.** A user's own get_FOO_display() method is overwritten by the one Django generates (§V-E).
3. **The agent must write a patch.** It explores the repository and edits files until it thinks the bug is fixed.
4. **Hidden tests grade the patch.** **Fail-to-pass** tests must now pass. **Pass-to-pass** tests must keep passing (§III-F). Try the toggle.
5. **Pass@1 counts first-try fixes.** The share of tasks solved in one run (§IV-B), here on the curated **SWE-bench Verified** (§I). [[500 | tasks in Verified]]

<p class="rd-cap">Task counts are §I; the example issue is §V-E. The patch outcomes are illustrative.</p>

<p class="rd-take"><b>Solved means the hidden tests pass.</b> Next: how the agent gets there.</p>

</article>

<article class="rd-page" id="primer-agent" data-part="Toolbox" data-draw="loop" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> The agent that writes page 1's patch.</p>

## How does a coding agent work through a repository?

1. **The model writes one command.** The paper's agent, **mini-swe-agent**, acts through shell commands, such as a grep (§IV-A, §VI).
2. **The output comes back.** The command runs in the task's environment. Its output joins the conversation.
3. **Repeat until it submits.** Temperature is 0, and each task gets at most 250 actions (§IV-C).
4. 🧠 **Each step re-reads the history.** So input tokens grow faster than actions. Move the slider to see the curve.
5. **Table I shows it.** GPT 5.1 under Level 2: actions +63.3%, input tokens +162.3% (Table I). [[+162.3% | input tokens]]

<p class="rd-cap">Limits are §IV-C; percentages are Table I. The curve assumes 2,000 prompt tokens plus 1,000 per step: illustrative.</p>

<p class="rd-take"><b>Every step pays for all earlier ones.</b> Next: telling memory from skill.</p>

</article>

<article class="rd-page" id="primer-contamination" data-part="Toolbox" data-draw="reveal" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Tests the model from page 2 before it sees any code.</p>

## How can you tell a model has memorized a task?

1. **Show only a little of the issue.** Experts split each issue into pieces, broad to specific. The model first sees the instance ID and a few pieces (§II).
2. **No files, patch or tests.** The model cannot read the repository. Anything specific it says must come from memory (§II).
3. **Reveal one more piece each round.** After every round, experts check the answer against hidden reference information (§II).
4. **Sort what it recalls.** No valid recall, files or symbols, repair logic, or the patch and tests themselves (§II).
5. **Most tasks show leakage.** Over 65% of Verified tasks for every model; over 18% at patch or test level (§II). [[> 65% | tasks with leakage evidence]]

<p class="rd-cap">Percentages are §II (per-model bars are in Fig. 1). The issue pieces and replies are illustrative.</p>

<p class="rd-take bad"><b>Models recall many tasks before seeing code.</b> Next: why the usual fixes fall short.</p>

</article>

<article class="rd-page" id="primer-ast" data-part="Toolbox" data-draw="topo" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> A tool for Level 3 (page 10). Nothing earlier needed.</p>

## How can you reorder code without breaking it?

1. **Python runs definitions top to bottom.** A class's base class must already exist when the class statement runs.
2. **Draw those needs as arrows.** Each definition is a node; an arrow means "must come first". This is a **dependency graph** (§III-D).
3. **Any order that follows the arrows works.** Picking one at random is a **random topological sort** (§III-D). Move the seed. [[25 of 120 | valid orders for these five definitions]]
4. **Calls inside functions don't count.** They run later. Only definition-time needs add arrows: bases, decorators, defaults, annotations (§III-D).

<p class="rd-cap">The five definitions are illustrative; the kinds of dependency are §III-D. The 25 orders are counted in your browser.</p>

<p class="rd-take"><b>A dependency graph tells you which orders keep the code working.</b> Level 3 uses exactly this (page 10).</p>

</article>

<article class="rd-page" id="problem" data-part="The benchmark" data-draw="fixes" markdown>

<p class="rd-crumb"><b>Benchmark 1</b> The leakage from page 3, and two earlier fixes.</p>

## Why don't fresh benchmarks or one-off disguises fix this?

1. **Fresh benchmarks use only new issues.** SWE-bench Live, SWE-rebench and SWE-bench Pro take issues created after a model's release (§I).
2. **But they stay small.** Fewer instances, narrower issue types (§I). The paper's fresh split has 110 tasks (§V-D). [[110 vs 500 | fresh tasks vs Verified tasks]]
3. **One-off disguises exist too.** Obfuscation and repository perturbation studies transform a benchmark once (§VII-B).
4. **A fixed disguise can leak again.** Once published, it can enter future training data like any benchmark (§VII-B).
5. **The fix: a fresh disguise every run.** Keep all the tasks, but change how the repository looks each time (§I).

<p class="rd-cap">Counts are §I and §V-D. The arrows are a sketch of §I and §VII-B.</p>

<p class="rd-take"><b>The disguise must be drawn at evaluation time, never stored.</b> Next: what SchrodingerRepo keeps fixed.</p>

</article>

<article class="rd-page" id="big-idea" data-part="The benchmark" data-draw="framework" data-fast markdown>

<p class="rd-crumb"><b>Benchmark 2</b> The whole framework. Answers page 5.</p>

## What does SchrodingerRepo change, and what does it keep?

1. **Keep the task.** Same issue, same executable behaviour, same tests grading the result (§III-A).
2. **Levels 1 and 2 change what it reads.** Level 1 rewords the issue. Level 2 renames the repository's own paths and symbols (§III-A).
3. **Levels 3 and 4 change the code's form.** Level 3 reorders definitions; Level 4 rewrites code near the bug, keeping its behaviour (§III-A).
4. **A seed draws each view.** Three seeds per level, results averaged. The view exists only once the agent enters (§I, §IV-C). [[3 | seeded views per task, per level]]
5. **Grade against the real repository.** The mapping is invertible, so the final patch is checked in original coordinates (§III-A).

<p class="rd-cap">Structure follows §III-A and Fig. 2; the drawing is ours. Names under seeds 2 and 3 are illustrative.</p>

<p class="rd-take"><b>Same task, new surface, every run.</b> The next six pages build it level by level.</p>

</article>

<article class="rd-page" id="level1" data-part="The benchmark" data-draw="level1" markdown>

<p class="rd-crumb"><b>Benchmark 3</b> Level 1 from page 6, on page 1's issue.</p>

## Does rewording the issue hide it?

1. **A generator rewrites the issue.** It reorders information, paraphrases, and drops non-essential details such as incidental identifiers (§III-B).
2. **A verifier checks nothing was lost.** If a task-defining detail is missing, it triggers a refinement step (§III-B).
3. **A human engineer reviews the result.** Only then does the agent see it (§III-F).
4. **Every level gets spot checks.** Reviewers inspected 100 random instances per level: same task, same issue, same information (§III-F). [[100 | instances human-checked per level]]

<p class="rd-cap">The pipeline is §III-B and §III-F. Both issue texts are illustrative.</p>

<p class="rd-take"><b>Level 1 changes the words, not the bug.</b> It turns out to matter least (page 14).</p>

</article>

<article class="rd-page" id="level2" data-part="The benchmark" data-draw="level2" data-fast markdown>

<p class="rd-crumb"><b>Benchmark 4</b> Level 2 from page 6, the heart of the method.</p>

## How do you rename a whole repository consistently?

1. **Collect the repository's own names.** Walk its syntax tree: classes, functions, module-level variables, imports (§III-C).
2. **Leave everything else alone.** Python built-ins, keywords and third-party library names are filtered out (§III-C).
3. **Split names into tokens.** QuerySet becomes Query + Set. A seed picks one replacement per token: Ledger + Suite (§III-C).
4. **Reuse each token map everywhere.** Query → Ledger renames every name that contains Query. Casing styles stay (§III-C). [[1 | map per token, reused everywhere]]
5. **Paths follow too.** In the case study, django/db/models/fields became storage_engine/object_models/entries (§V-E).

<p class="rd-cap">QuerySet → LedgerSuite and the Django paths are §III-C and §V-E. Other names, and seeds 2–3, are illustrative.</p>

<p class="rd-take"><b>One token map renames the whole repository coherently.</b> Next: how commands still run on the real code.</p>

</article>

<article class="rd-page" id="translator" data-part="The benchmark" data-draw="translator" markdown>

<p class="rd-crumb"><b>Benchmark 5</b> Makes page 8's names usable. Running example from page 1.</p>

## How can the agent edit a repo whose names don't exist?

1. **The real repository never changes.** Level 2 works only on what the agent sees and sends (§III-C).
2. **Commands go virtual → real.** A search for render_%s_label runs as get_%s_display on the real files (§III-C, §V-E).
3. **Output goes real → virtual.** Paths, code and tracebacks are translated back before the agent sees them (§III-C).
4. **The command itself stays.** Only namespace-bearing arguments are rewritten; grep stays grep (§III-F).
5. **A notebook limits the reverse map.** It records substitutions actually made, and only those are reversed (§III-F). [[0 | changes to the real repository at Level 2]]

<p class="rd-cap">Translator rules are §III-C and §III-F; the names are the §V-E example. The exact command is illustrative.</p>

<p class="rd-take"><b>The agent lives in the disguise; the code runs in reality.</b> Next: reordering, which does touch the files.</p>

</article>

<article class="rd-page" id="level3" data-part="The benchmark" data-draw="level3" markdown>

<p class="rd-crumb"><b>Benchmark 6</b> Level 3 from page 6, using page 4's sort.</p>

## How does Level 3 reorder a file safely?

1. **Find runs of definitions.** Functions, classes and methods in a row form a run. Any other statement is an anchor (§III-D).
2. **Anchors never move.** They split the file, so only local order changes (§III-D).
3. **Shuffle each run by its graph.** A random topological sort picks a valid order; with no alternative, the original stays (§III-D). Move the seed.
4. **Only files the real fix touches.** To keep cost down, Level 3 reorders golden-patch files only (§IV-C). [[golden patch | the only files Level 3 reorders]]
5. **The agent works in real reordered files.** Unlike Level 2, this changes file contents; grading still uses the original repository (§III-D).

<p class="rd-cap">The procedure is §III-D and §IV-C. The file and its definitions are illustrative; orders are drawn live.</p>

<p class="rd-take"><b>Level 3 moves definitions, never behaviour.</b> Next: rewriting the code itself.</p>

</article>

<article class="rd-page" id="level4" data-part="The benchmark" data-draw="gate" markdown>

<p class="rd-crumb"><b>Benchmark 7</b> Level 4 from page 6, graded by page 1's tests.</p>

## How do you rewrite code without fixing the bug?

1. **Find the code tied to the fix.** For each task, the region most directly linked to the repair (§III-E).
2. **Ask an agent to restate it.** It writes a diff that looks different but behaves the same. Its job is not to fix the bug (§III-E).
3. **Run the old tests on the rewrite.** Pass-to-pass tests must all still pass: behaviour kept (§III-F).
4. **The bug must survive.** Fail-to-pass tests must still fail, or the rewrite fixed the bug by accident (§III-F). [[P2P = 1, F2P = 0 | to keep a rewrite]]
5. **Same gate for Level 3.** Reordered files must pass the same check (§III-F).

<p class="rd-cap">The keep rule is §III-F. The three candidate rewrites are illustrative.</p>

<p class="rd-take"><b>Only rewrites that leave the same unsolved task get through.</b> Next: turning final edits into a patch.</p>

</article>

<article class="rd-page" id="patch" data-part="The benchmark" data-draw="patch" markdown>

<p class="rd-crumb"><b>Benchmark 8</b> Closes the loop from page 6 back to page 1's tests.</p>

## How is a patch from a disguised repo graded on the real one?

1. **Ignore the agent's patch text.** The submission is built from file states, not from any diff the agent printed (§III-G).
2. **Find files that changed.** \(C_B\) is the set of files whose final contents differ from the original (§III-G).
3. **Diff each against the original.** \(\mathrm{Diff}(b_f, r'_f)\) compares original and final contents of file \(f\) (§III-G).
4. **Join the diffs.** \(\bigoplus_{f\in C_B}\mathrm{Diff}(b_f, r'_f)\) is the final submission, in original coordinates (§III-G). [[⊕ Diff | one diff per changed file, joined]]
5. **Grade as usual.** The standard SWE-bench tests run on it, the same way at every level (§III-G).

<p class="rd-cap">The formula is §III-G. The three files are illustrative.</p>

<p class="rd-take"><b>Grading never sees the disguise.</b> Next: what the disguise does to scores.</p>

</article>

<article class="rd-page" id="evidence" data-part="What it finds" data-draw="full" data-fast markdown>

<p class="rd-crumb"><b>Result 1</b> Pass@1 on Verified's 500 tasks (Gemini: 300), against the baseline. Pass = hidden tests.</p>

## How much do agents lose under the full disguise?

1. **GPT-5.4-mini: 46.8% → 35.6%.** The largest drop on all 500 tasks: 11.2 points (Table I). [[−11.2 | Pass@1 points, GPT-5.4-mini]]
2. **GPT 5.1: 44.6% → 36.2%.** Down 8.4 points (Table I).
3. **DeepSeek-v4-Flash: 72.8% → 66.8%.** The strongest model loses least: 6.0 points (Table I).
4. **Gemini-3.1-Flash-Lite: 56.7% → 42.3%.** Down 14.4, but only on the 300 most-leaked tasks (§IV-A, Table I).
5. **Same tasks, same tests.** Only the surface changed, so the paper reads the drop as lost familiarity (§V-A).

<p class="rd-cap">Pass@1 is Table I, averaged over three seeded views. Gemini's bars use a different 300-task subset.</p>

<p class="rd-take bad"><b>Every model loses 6 to 14 points on the same tasks.</b> Next: which level causes it.</p>

</article>

<article class="rd-page" id="levels" data-part="What it finds" data-draw="levels" markdown>

<p class="rd-crumb"><b>Result 2</b> Page 13's measure, one level at a time. Three models, all 500 tasks.</p>

## Which level does the damage?

1. **Level 1 barely matters.** Rewording the issue costs 0.0 for both GPT models and 2.0 for DeepSeek (Table I).
2. **Level 2 hurts most.** Renaming costs 7.4, 6.4 and 6.0 points, all at p < 0.01 (Table I). [[−7.4 | Pass@1 points, Level 2, GPT 5.1]]
3. **Levels 3 and 4 hurt a little.** −0.8 to −3.4 for reordering, −1.2 to −2.8 for rewriting (Table I, §V-A).
4. **All four together hurt most.** For GPT-5.4-mini, −11.2, more than any single level (Table I).
5. **Drops don't simply add up.** DeepSeek's four levels sum to −11.6, yet together cost −6.0 (Table I; our arithmetic).

<p class="rd-cap">Pass@1 changes are Table I; its stars mark p < 0.05 and p < 0.01. The 11.6 sum is our arithmetic.</p>

<p class="rd-take"><b>Names carry most of the familiarity.</b> Next: what the disguise costs in effort.</p>

</article>

<article class="rd-page" id="cost" data-part="What it finds" data-draw="cost" markdown>

<p class="rd-crumb"><b>Result 3</b> Actions and tokens per task, same runs as page 13, against the baseline.</p>

## What does the disguise cost in actions and tokens?

1. **Actions rise 61–116%.** GPT 5.1 +61.5%, GPT-5.4-mini +76.2%, DeepSeek +116.0%, Gemini +81.09% (Table I).
2. **Input tokens rise more.** +161.3%, +255.4%, +253.6% and +136.06%, in the same order (Table I). [[+255.4% | input tokens, GPT-5.4-mini]]
3. **DeepSeek's bill is largest.** 3,702,241 input tokens per task disguised, up from 1,046,985 (Table I).
4. **Level 2 drives the cost.** Alone it raises input tokens 162.3%, 108.2% and 218.3% for the first three models (Table I).
5. **Output tokens rise too.** +68.6%, +86.4%, +81.6% and +67.66% (Table I).

<p class="rd-cap">Percentages are Table I, full disguise vs baseline. Gemini ran on 300 tasks.</p>

<p class="rd-take"><b>The disguise costs effort, and effort costs tokens.</b> Next: what that effort is spent on.</p>

</article>

<article class="rd-page" id="exploration" data-part="What it finds" data-draw="explore" data-fast markdown>

<p class="rd-crumb"><b>Result 4</b> Splits page 15's extra actions into six types. Two models.</p>

## Where do the extra actions go?

1. **Six kinds of action.** Navigate, search, read, probe, edit and test (§IV).
2. **DeepSeek: 83.6% exploring.** Navigate, search, read and probe take 83.6% of extra actions; edit and test 16.5% (§V-B). [[83.6% | extra actions spent exploring, DeepSeek]]
3. **DeepSeek explores by running code.** Probe 31.4%, read 19.4%, search 17.9% (§V-B).
4. **GPT-5.4-mini explores by reading.** 81.6% exploring: read 41.8%, search 33.1%, probe only 3.7% (§V-B).
5. **More exploring, smaller loss.** DeepSeek takes 46.19 actions at baseline and loses 6.0 points. GPT-5.4-mini takes 11.25 and loses 11.2 (Table I, §V-B).

<p class="rd-cap">Shares are §V-B (the paper's Fig. 3). Navigate and GPT-5.4-mini's edit + test are our arithmetic; 83.6 + 16.5 = 100.1 is the paper's rounding.</p>

<p class="rd-take"><b>The disguise costs finding things, not fixing them.</b> Next: does this hold beyond bug fixing?</p>

</article>

<article class="rd-page" id="swe-qa" data-part="What it finds" data-draw="qa" markdown>

<p class="rd-crumb"><b>Result 5</b> SWE-QA answer score, 144 questions over 3 repositories, against the baseline.</p>

## Does it also hurt answering questions about code?

1. **A different task.** SWE-QA asks questions about a repository: Conan, Reflex and Streamlink, 48 questions each (§V-C).
2. **GPT-5.4-mini drops 4.64.** Its score falls from 70.35 to 65.71 under the full disguise (Table II). [[−4.64 | SWE-QA score, GPT-5.4-mini]]
3. **DeepSeek barely moves.** 72.97 → 72.42, which is −0.55 from the cells; Table II prints −0.75 (Table II).
4. **Level 2 matters most again.** −3.95 for GPT-5.4-mini. Levels 1, 3 and 4 move under 1.1 points (Table II).
5. **Effort still rises.** Actions up 18.15% and 43.02% (Table II).

<p class="rd-cap">Scores and percentages are Table II. The −0.55 vs −0.75 mismatch is our arithmetic.</p>

<p class="rd-take"><b>The renaming effect carries over to question answering.</b> Next: is the disguised repo simply harder?</p>

</article>

<article class="rd-page" id="control" data-part="What it finds" data-draw="control" data-fast markdown>

<p class="rd-crumb"><b>Result 6</b> Pass@1 on 110 fresh SWE-rebench tasks, against the baseline. One model.</p>

## Is the disguised repo just harder?

1. **Use tasks the model cannot know.** The March 2026 SWE-rebench split has 110 instances newer than GPT-5.4-mini (§V-D).
2. **Pass@1 doesn't move.** 17.27% before and after the full disguise: 19 of 110 tasks (Table III; our arithmetic). [[0.00 | Pass@1 change on fresh tasks]]
3. **Effort still rises a little.** Actions +8.15%, input tokens +22.01%, output +15.58% (Table III).
4. **Compare Verified.** There the same model lost 11.2 points and used 255.4% more input tokens (Table I).
5. **The paper's reading.** The disguise removes familiarity, not solvability (§V-D).

<p class="rd-cap">Numbers are Tables III and I; 19 tasks is our arithmetic. Only GPT-5.4-mini was tested here.</p>

<p class="rd-take"><b>On tasks it can't have memorized, the disguise costs effort but not success.</b> Its weakness: one model, 19 successes (page 20).</p>

</article>

<article class="rd-page" id="case-study" data-part="What it finds" data-draw="case" markdown>

<p class="rd-crumb"><b>Result 7</b> Actions on one task, page 1's django__django-11999.</p>

## What does one disguised run look like?

1. **Original view: straight to the file.** The agent greps get_.*_display under django/db/models/ and finds fields/__init__.py (§V-E).
2. **It spots the bug fast.** get_%s_display is installed with setattr unconditionally. The fix: check first (§V-E).
3. **Disguised view: no familiar names.** The agent lists directories, enumerates Python files and searches tests (§V-E).
4. **It finds render_%s_label.** It is in storage_engine/object_models/entries/__init__.py; the agent still checks tests and config (§V-E).
5. **Same patch, almost six times the work.** 37 actions in the original run, 217 disguised (§V-E). [[37 → 217 | actions, same submitted patch]]

<p class="rd-cap">Paths, names and counts are §V-E (the paper's Fig. 4). The boxes summarize; they are not the full runs.</p>

<p class="rd-take"><b>The disguise changed the search, not the fix.</b> One task only; the averages are pages 13–16.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Our critique of pages 13–19.</p>

## What would a careful reviewer question?

1. 🧠 **A synonym is not neutral.** LedgerSuite tells a reader less than QuerySet. No measure of meaning lost is given (§III-C, §III-F).
2. 🧠 **The control is thin.** One model, 110 tasks, 19 successes, no interval (Table III).
3. 🧠 **Gemini's tasks were chosen.** It ran on the 300 most-leaked tasks, and its row has no stars (§IV-A, Table I).
4. 🧠 **The test is never named.** Stars mark p-values, but the paper does not say which test (Table I).
5. 🧠 **Two table slips.** 11.25 → 11.56 is +2.76%, not +12.78% (Table I). 72.97 → 72.42 is −0.55, not −0.75 (Table II).
6. 🧠 **Levels 3–4 know where the fix is.** They touch only golden-patch files (§IV-C), which could itself hint where to look.
7. 🧠 **Steelman: the pattern is consistent.** Every model drops, Level 2 leads, and fresh tasks don't drop (Tables I, III).

<p class="rd-cap">Pointers mark the evidence behind each concern. The pills are our judgment; the corrected percentages are our arithmetic.</p>

<p class="rd-take"><b>The direction is solid; the size is an upper bound.</b> Next: what it means for your choice of agent.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Verdict</b> For the goal on the cover: picking an agent for a private repo. Uses pages 13, 16, 18.</p>

## How much should you trust a SWE-bench score for your own repo?

1. 🧠 **Your private repo is a disguise.** No model has seen its names.
2. **Expect a lower score.** On all 500 Verified tasks, the disguise cost 6.0 to 11.2 points (Table I). [[−11.2 | worst drop on all 500 tasks]]
3. **The order can change.** GPT-5.4-mini led GPT 5.1 by 2.2 points; disguised, it trails by 0.6 (Table I).
4. **Budget for exploring.** Expect more actions and tokens, mostly spent searching (§V-B, Table I).
5. 🧠 **Our verdict: test under disguise.** Try candidates on your own repo. Compare Pass@1 and cost, not ranks.

<p class="rd-cap">Numbers are Table I. Treating a private repo like a disguised view is our assumption; the paper tests public Python repos only (§VI).</p>

<p class="rd-take"><b>Leaderboards overstate unfamiliar-code skill and can misorder close models.</b> Python only (§VI).</p>

</article>

<article class="rd-page" id="whats-next" data-part="Your move" data-draw="ideas" markdown>

<p class="rd-crumb"><b>Your move 2</b> Open problems from §VI and §VIII, plus our ideas.</p>

## What could you try next?

1. **Paper's next step: richer tools.** IDE APIs and language-server queries would need translating too (§VI, §VIII).
2. **Paper's open question: other languages.** Every tested repository is Python (§VI).
3. 🧠 **Measure meaning loss.** Score how well readers guess a function's purpose from disguised versus real names.
4. 🧠 **A larger fresh-task control.** Several models on post-release tasks, with intervals, would size the effect.
5. 🧠 **For speech: SchrodingerLibri.** Re-synthesize test sentences with a seeded voice and consistent name swaps. A WER jump on text swaps means memorized text.

<p class="rd-cap">Steps 1–2 are from §VI and §VIII; 3–5 and every position on the map are our guesses.</p>

<p class="rd-take"><b>The most useful follow-up is a bigger fresh-task control.</b> Then check yourself on the next three pages.</p>

</article>

<article class="rd-page" id="quiz" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 14.</p>

## Which SchrodingerRepo level cuts Pass@1 the most?

- [ ] Level 1, rewording the issue
- [x] Level 2, renaming repository names
- [ ] Level 3, reordering definitions
- [ ] Level 4, rewriting code near the bug

<p class="rd-take"><b>Level 2.</b> It costs 6.0 to 7.4 points. Level 4, which touches the bug's own code, costs only 1.2 to 2.8 (Table I).</p>

</article>

<article class="rd-page" id="check-gate" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 11.</p>

## Why must a Level 4 rewrite keep P2P = 1 and F2P = 0?

- [ ] So the rewrite runs faster than the original
- [x] So behaviour is kept and the bug is still unfixed
- [ ] So the agent can see which tests will grade it
- [ ] So the patch can be translated back to real names

<p class="rd-take"><b>Same unsolved task.</b> P2P = 1 keeps passing behaviour; F2P = 0 means the bug still fails its tests (§III-F).</p>

</article>

<article class="rd-page" id="check-flaw" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From page 13.</p>

## What is wrong with "Gemini lost 14.4 points, so it relies on memory most"?

- [ ] Nothing: 14.4 is the largest drop in Table I
- [x] Gemini ran only on the 300 most-leaked tasks, not all 500
- [ ] Gemini was tested on SWE-QA, not SWE-bench
- [ ] Gemini's drop came from Level 1 alone

<p class="rd-take"><b>Different tasks.</b> Gemini ran on the 300 tasks with the strongest leakage evidence (§IV-A), so its drop isn't comparable.</p>

</article>
