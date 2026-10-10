---
title: "OPD Scaling Laws"
paper_title: "Scaling Properties of Same-Family On-Policy Distillation"
authors: ["Yuntai Bao", "Qinfeng Li", "Guoqing Jiang", "Liwei Chen", "Zhiheng Qin", "Xuanping Li", "Wenqi Zhang", "Xuhong Zhang"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2609.32722"
arxiv_version: v1
paper_type: empirical-study
hook: "A 0.5B math model that scores 39.8% can teach a 14B model to 77.7%. Yet a bigger teacher can make a small student worse, and of two teachers with near-equal scores, the bigger one teaches worse. This paper finds the laws behind all three."
big_idea: "In on-policy distillation, measure training progress in √KL instead of steps: accuracy then climbs in a straight line, and the student's peak follows a power law in which its error is roughly the teacher's error shrunk by a power of student size, with the smaller teacher winning at equal score."
goal: "Decide whether to RL-train one small model and distill it into larger same-family models, and which teacher to use."
difficulty: 3
difficulty_note: "New subfield (LLM post-training: RL, distillation, KL to a reference) but light math: one first-order Taylor argument and power-law fits you can check with a calculator."
date_added: 2026-10-04
tags: [LLMs, Distillation, Scaling laws, Reinforcement learning, Reasoning]
description: "A 0.5B math model that scores 39.8% can teach a 14B model to 77.7%. Yet a bigger teacher can make a small student worse, and of two teachers with near-equal scores, the bigger one teaches worse. This paper finds the laws behind all three."
---

<article class="rd-page" id="primer-rl" data-part="Toolbox" data-draw="rl" markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Every teacher in this paper is made this way.</p>

## How does RL teach a model math?

1. **Start from a fine-tuned base.** Each Qwen2.5 base model, 0.5B to 14B, first gets SFT to follow instructions (§3).
2. **Sample eight answers per problem.** GRPO compares a group of 8 answers to the same problem (§3, Table 6).
3. 🧠 **Favour the better answers.** Answers that beat their group become more likely. That is GRPO's core move.
4. **Train on 14.8K problems, test on 6.3K.** GSM8K and MATH, mixed. Held-out accuracy is the **gold score** (§3). [[14.8K / 6.3K | training / test problems]]
5. **The result is a teacher.** One RL-trained model per size. The 0.5B teacher scores 39.8% (§6.3).

<p class="rd-cap">Data sizes and group size are §3 and Table 6; teacher scores are §6.3 and Table 3. The answer marks are illustrative.</p>

<p class="rd-take"><b>An RL teacher is an SFT model trained to win at math.</b> Next: how it passes that skill on.</p>

</article>

<article class="rd-page" id="primer-opd" data-part="Toolbox" data-draw="opd" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 2</b> How page 1's teacher passes its skill on.</p>

## What is on-policy distillation?

1. **The student writes the answer.** Rollouts come from the student itself, not from the teacher (§2).
2. **The teacher grades every token.** \(r_t = \log\pi_T(y_t) - \log\pi_\theta(y_t)\) is positive where the teacher likes a token more (Eq. 2).
3. **Each token gets only its own reward.** Modern recipes drop future rewards: a zero-discount update (§2).
4. **Push up the teacher's favourites.** In expectation this lowers the reverse KL from student to teacher (Eq. 1, §2). [[r_t | log π_T − log π_θ, per token]]
5. **Off-policy is the older way.** The student copies teacher-written answers, like SFT (Eq. 4). Toggle to compare.

<p class="rd-cap">Equations are §2. The tokens and their rewards are illustrative.</p>

<p class="rd-take"><b>The student practises on its own answers; the teacher marks each token.</b> Next: measuring how far the student moves.</p>

</article>

<article class="rd-page" id="primer-kl" data-part="Toolbox" data-draw="k3" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> A ruler for the training on page 2.</p>

## How do you measure how far the student has moved?

1. **Compare with the starting model.** The reference \(\pi_{\mathrm{ref}}\) is the student's own SFT start (§3).
2. **Look at each sampled token.** \(\delta_t = \log\pi_{\mathrm{ref}}(y_t) - \log\pi_\theta(y_t)\) says how much less likely the start found it (Eq. 5).
3. **Score it with \(e^{\delta}-\delta-1\).** Never negative, zero only when nothing changed. This is the **k₃** estimator of reverse KL (Eq. 5).
4. **Average over tokens.** Token-mean k₃ matches the token-level objective of page 2 (§3). Move δ to see one term.
5. **Take the square root.** \(d = \sqrt{k_3}\) is the paper's progress ruler (§3). [[d = √k₃ | the x-axis]]

<p class="rd-cap">Formulas are Eq. 5 and §3. The token values are illustrative; the curve is exact.</p>

<p class="rd-take"><b>d measures drift from the start.</b> Next: who was paired with whom.</p>

</article>

<article class="rd-page" id="primer-w2s" data-part="Toolbox" data-draw="grid0" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Who teaches whom with page 2's method.</p>

## Can a weaker teacher help a stronger student?

1. **Five sizes, every pairing.** Students and teachers at 0.5B, 1.5B, 3B, 7B and 14B make 25 pairs (§3).
2. **Teacher smaller: weak-to-strong.** A small expert teaches a bigger model (§1).
3. **Same size: same-base.** Each student learns from an RL-trained copy of itself (§1).
4. **Teacher bigger: strong-to-weak.** The classic distillation case (§1).
5. **Weak-to-strong saves RL.** Train one small expert, then distill it into every larger model (§1). [[25 | teacher–student pairs]]

<p class="rd-cap">The design is §1 and §3. Colours mark the three setups.</p>

<p class="rd-take"><b>The grid covers all three directions; weak-to-strong is the prize.</b> Next: the two tools for reading the results.</p>

</article>

<article class="rd-page" id="primer-laws" data-part="Toolbox" data-draw="powerlaw" markdown>

<p class="rd-crumb"><b>Toolbox 5</b> Tools for reading page 4's grid.</p>

## What do a power law and a gold score mean here?

1. **Gold score is held-out accuracy.** The share of the 6.3K test problems a model solves (§3).
2. **The proxy is the teacher's reward.** OPD optimizes the token reward of page 2. Logged, it is the proxy score \(P\) (§4.1).
3. **A power law is straight on log axes.** Error \(= A N^{-\alpha}\): each doubling of size cuts error by the same fraction.
4. **The exponent sets the cut.** With \(\alpha = 0.30\), doubling the student cuts its error by 18.8% (Table 1; our arithmetic). Move α.
5. **Laws are fitted to gold, not proxy.** The paper models remaining error, \(1 - G\) (§5). [[1 − G | remaining error, the quantity fitted]]

<p class="rd-cap">α = 0.30 is Table 1's student exponent. The line's height and the dots are illustrative.</p>

<p class="rd-take"><b>A power law turns "bigger is better" into "bigger removes a fixed fraction of error".</b> Next: why simple teacher rules fail.</p>

</article>

<article class="rd-page" id="problem" data-part="The study" data-draw="rules" data-fast markdown>

<p class="rd-crumb"><b>Study 1</b> Our running example: a 7B student choosing a teacher. Uses page 4's grid.</p>

## Why can't you just pick the biggest or best-scoring teacher?

1. **Bigger helps big students.** Our 7B student peaks at 72.7% with the 0.5B teacher and 81.9% with the 14B one (§4).
2. **But not small students.** The 0.5B student peaks at 40.8% with a 3B teacher, 39.0% with 7B, 37.7% with 14B (§4). [[40.8 → 37.7 | 0.5B student, bigger teachers]]
3. **Score isn't enough either.** A 3B teacher scoring 66.0% takes our 7B student to 73.8% (Table 3).
4. **The lower scorer wins.** A 1.5B teacher scoring 63.6% takes the same student to 77.5% (Table 3).
5. **Chaining doesn't save it.** Teaching through intermediate sizes ends below one direct jump (§6.3, page 18).

<p class="rd-cap">Peaks are Fig. 4's printed grid labels, §4 and Table 3. One run per cell.</p>

<p class="rd-take"><b>Neither size nor score alone picks the best teacher.</b> Next: how the study was built to find what does.</p>

</article>

<article class="rd-page" id="design" data-part="The study" data-draw="design" markdown>

<p class="rd-crumb"><b>Study 2</b> The experiment behind page 6's numbers.</p>

## What did the study vary, and what did it hold fixed?

1. **Varied: student and teacher size.** 25 pairs from 0.5B to 14B, all Qwen2.5 (§3).
2. **Fixed: one recipe.** Learning rate 1e-6, batch 256, at most 580 updates, answers up to 2,048 tokens (Table 7).
3. **Fixed: the RL prompts.** OPD trains on the same 14.8K problems the teachers learned from (§3).
4. **Measured: the whole curve.** Gold score is checked periodically, so each run gives a trajectory, not one number (§3).
5. **One seed per cell.** No configuration is repeated, for cost reasons (App. E.5). [[1 | training seed per run]]

<p class="rd-cap">Settings are §3, Table 7 and App. E.5. The mini curve is illustrative.</p>

<p class="rd-take"><b>One recipe, 25 pairs, one run each.</b> Next: the ruler that makes the curves comparable.</p>

</article>

<article class="rd-page" id="big-idea" data-part="The study" data-draw="ruler" data-fast markdown>

<p class="rd-crumb"><b>Study 3</b> Plots page 7's curves on page 3's ruler.</p>

## Why measure progress in √KL instead of steps?

1. 🧠 **Steps differ from pair to pair.** The same number of updates moves different students different distances. Curves bend differently.
2. **Plot against d instead.** Gold score against \(d = \sqrt{k_3}\), the drift from page 3 (§4).
3. **The start becomes a straight line.** \(G(d) = c + md\) fits the first 30 checkpoints of all 25 runs (§4). [[0.932 | lowest R² of the 25 line fits]]
4. **The slope m differs by pair.** From 0.175 to 0.721. Teachers near the student's size raise the score fastest (§4, Fig. 3).
5. **Whole-answer KL failed.** Indexing by sequence-level KL gave no regular start (App. K).

<p class="rd-cap">R² (0.932–0.988), slopes and the KL choice are §4 and App. K. The three curves are illustrative shapes.</p>

<p class="rd-take"><b>On a √KL axis, every run starts as a straight line.</b> Next: why it has to.</p>

</article>

<article class="rd-page" id="why-linear" data-part="The study" data-draw="taylor" markdown>

<p class="rd-crumb"><b>Study 4</b> Explains page 8's straight line.</p>

## Why is the start a straight line?

1. **Take a small step τ.** The update moves the parameters by τ along some direction \(h\) (App. D).
2. **Score changes to first order.** \(G \approx G_0 + \tau\, g_0^\top h\), proportional to τ (Eq. 14).
3. **KL changes to second order.** At the start KL is zero with zero slope, so it grows like τ² (Eq. 13).
4. **So d grows like τ.** √KL ∝ τ, which makes score linear in d: \(G = G_0 + md + O(d^2)\) (Eq. 8). [[m | slope: alignment with the gold gradient]]
5. **It only explains the start.** How long the line lasts, and what follows, stays empirical (App. D.4).

<p class="rd-cap">The argument is App. D. The curves draw the leading terms, with illustrative scales.</p>

<p class="rd-take"><b>Score moves at first order and KL at second, so score is linear in √KL.</b> Next: what happens after the line.</p>

</article>

<article class="rd-page" id="phases" data-part="The study" data-draw="phases" markdown>

<p class="rd-crumb"><b>Study 5</b> Where page 8's line stops.</p>

## What happens after the straight part?

1. **Fit the first 30 points.** Then draw a 95% band around the line's predictions (§4).
2. **Three misses in a row end it.** The **transfer endpoint** is the last d before three straight points fall below the band (§4).
3. **Then the tails differ.** Gains slow, flatten, or reverse. No shared formula fits (§4). Try the toggle.
4. **Falling gold, rising proxy.** Where gold score falls, the teacher's reward keeps rising: **overoptimization** (§4.1, Fig. 10).
5. **The line lasts a similar distance.** Endpoints span d = 0.20–0.36, median 0.30 (§5). Only 9 of 25 runs depart in view (§4.1). [[0.30 | median d where the line ends]]

<p class="rd-cap">The rule and counts are §4, §4.1 and §5. The points and tails are illustrative.</p>

<p class="rd-take"><b>The line ends around d = 0.3; what follows depends on the pair.</b> Next: predicting the peak.</p>

</article>

<article class="rd-page" id="peak-law" data-part="The study" data-draw="law" data-fast markdown>

<p class="rd-crumb"><b>Study 6</b> Uses page 5's power laws. Back to our 7B student.</p>

## What decides how high the student peaks?

1. **Model the remaining error.** The law predicts \(1 - G_{\text{peak}}\), the share of problems the student still misses (§5).
2. **Teacher error, almost one for one.** Student error scales with the teacher's error to the power ζ = 0.95 (Table 1). [[ζ = 0.95 | student error ∝ teacher error]]
3. **Bigger students remove more.** A factor \(N_S^{-0.30}\): each doubling of the student cuts its error by 18.8% (Table 1; our arithmetic).
4. **Teachers count up to the student's size.** Teacher size is capped: \(N_T^{\text{eff}} = \min(N_T, N_S)\) (§5).
5. **Try our 7B student.** 1.5B teacher at 63.6%: the law says 77.1%, observed 77.5% (Table 3).

<p class="rd-cap">Coefficients are Table 14's Vanilla-OPD values (A = .97, α = .304, β = −.267, ζ = .952), computed live. You set the teacher score.</p>

<p class="rd-take"><b>Student error ≈ teacher error, shrunk by student size.</b> Next: the sign on teacher size.</p>

</article>

<article class="rd-page" id="matched" data-part="The study" data-draw="matched" data-fast markdown>

<p class="rd-crumb"><b>Study 7</b> The β term of page 11, tested on our 7B student.</p>

## Why does a bigger teacher teach worse at the same score?

1. **Size and score move together.** Among RL teachers, size and error correlate at r = −0.9999, so a law can't split them (§5).
2. **Add off-trend teachers.** Teachers from page 18's chains score below their size's trend. The correlation drops to −0.95 (§5).
3. **The size exponent turns negative.** At equal score, a bigger teacher leaves more error: β = −0.27 (Table 1). [[β = −0.27 | bigger teacher, same score: worse]]
4. **Test it on a fresh teacher.** A 3B RL checkpoint at step 58 scores 66.0%, just above the 1.5B teacher's 63.6% (Table 3).
5. **Only the joint law gets it right.** Predicted 74.1, observed 73.8, below the 1.5B teacher's 77.5. Size-only said 79.5, score-only 76.3 (Table 3).

<p class="rd-cap">Numbers are §5, Table 1 and Table 3. The held-out cell enters no fit (App. H).</p>

<p class="rd-take"><b>A teacher's score alone doesn't set its teaching value.</b> One held-out cell backs this; page 20 asks how much that proves.</p>

</article>

<article class="rd-page" id="rate-law" data-part="The study" data-draw="rate" markdown>

<p class="rd-crumb"><b>Study 8</b> The slope m of page 8, given its own law.</p>

## How fast does the student learn from each teacher?

1. **The slope gets its own law.** \(m = B\,N_S^{-\gamma}(N_T^{\text{eff}})^{\delta}(1-G_T^{\text{eff}})^{-\xi}\) (Eq. 6).
2. **Teacher error matters even more.** ξ = 1.90, so a worse teacher slows learning sharply (Table 1). [[ξ = 1.90 | teacher-error exponent for speed]]
3. **Bigger students climb slower per unit d.** γ = 0.19. Weak teachers give large students the smallest slopes (Table 1, §4).
4. **But the fit is loose.** Log-space R² is 0.59, and ξ's interval runs from 0.93 to 2.84 (§5, Table 14).
5. **A plain baseline predicts better.** A raw-affine model beats it on held-out slopes (App. H). Read it as a summary.

<p class="rd-cap">Point estimates and 95% cell-bootstrap intervals are Table 14; fit quality is §5 and App. H.</p>

<p class="rd-take"><b>The speed law describes the trend but predicts poorly.</b> Next: how well the peak law predicts.</p>

</article>

<article class="rd-page" id="evidence" data-part="How solid is it?" data-draw="valid" data-fast markdown>

<p class="rd-crumb"><b>Solid 1</b> Peak-law error on held-out scales, in accuracy points; lower is better.</p>

## Does the peak law predict scales it never saw?

1. **Hold out a scale, refit, predict.** Leave-one-scale-out drops every cell at one size, then predicts them (Table 2).
2. **Size alone: 3.43 points off.** The scale-only law misses by 3.43 for Vanilla-OPD (Table 2).
3. **Adding teacher score halves it.** The joint law misses by 1.66 points (Table 2). [[1.66 | points off on held-out scales]]
4. **The biggest models are easy.** Withholding the largest student or teacher, the joint law misses by 0.55 and 0.68 (Table 2).
5. **Delta-OPD fits tighter.** 0.82 points leave-one-out; 0.20 and 0.32 at the largest scales (Table 2).

<p class="rd-cap">Errors are Table 2, in accuracy points. Delta-OPD is the variant of page 16.</p>

<p class="rd-take"><b>The joint law is off by under two points on scales it never saw.</b> Next: do weak teachers really lift students past themselves?</p>

</article>

<article class="rd-page" id="w2s" data-part="How solid is it?" data-draw="headstart" markdown>

<p class="rd-crumb"><b>Solid 2</b> Student peak vs teacher score, and where the student started.</p>

## Do weak teachers really lift students past themselves?

1. **Every weak-to-strong student beats its teacher.** In every observed pair, the student's peak exceeds the teacher's score (§5).
2. **The 0.5B expert lifts everyone.** Scoring 39.8%, it takes 3B to 61.4%, 7B to 72.7% and 14B to 77.7% (Fig. 4, §6.3).
3. **But big students start high.** The 14B student starts near 72.6%: peak 77.7 minus its 5.1-point gain (Table 9; our arithmetic). [[≈ 72.6 | 14B start, before any OPD]]
4. **Some truly overtake.** Our 7B student starts near 61.5, below its 63.6% teacher, and ends at 77.5 (Tables 3, 9; our arithmetic).
5. **Margins shrink near the student's size.** The closer the teacher's size, the smaller the student's lead over it (§5).

<p class="rd-cap">Peaks are Fig. 4 labels; gains are Table 9's Vanilla column; starts are peak minus gain, our arithmetic.</p>

<p class="rd-take"><b>Weak teachers help, but much of a big student's score was already there.</b> Next: does a different objective help more?</p>

</article>

<article class="rd-page" id="delta" data-part="How solid is it?" data-draw="delta" markdown>

<p class="rd-crumb"><b>Solid 3</b> Slope and peak gain for 17 shared pairs, Vanilla vs Delta-OPD.</p>

## Does copying the teacher's change help?

1. **Delta-OPD rewards what RL changed.** Token reward: teacher after RL minus teacher before, \(\log\pi_T - \log\pi_T^{\text{base}}\) (Eq. 3).
2. **Steeper start in 15 of 17 pairs.** The exceptions are the two smallest students under the 0.5B teacher (§6.1, Table 9). [[15 / 17 | pairs with a steeper start]]
3. **Higher peak in 12 of 17.** They include nine of the ten weak-to-strong pairs (§6.1).
4. **Biggest for the tiniest teacher.** The 0.5B teacher gives 2–4 extra points of peak; larger teachers stay within about one (§6.1).
5. **Example: 14B ← 0.5B.** Slope 0.175 → 0.268, and peak gain 5.1 → 6.7 points (Table 9).

<p class="rd-cap">All values are Table 9 and §6.1, one run each. Dots above the dashed line favour Delta-OPD.</p>

<p class="rd-take"><b>Copying the teacher's RL change transfers faster, mostly weak-to-strong.</b> Next: does warming up first help?</p>

</article>

<article class="rd-page" id="cold-start" data-part="How solid is it?" data-draw="cold" markdown>

<p class="rd-crumb"><b>Solid 4</b> Peak with and without an SFT warm-up, 0.5B expert teaching.</p>

## Does warming up on teacher samples help?

1. **Three ways to learn from a teacher.** Pure OPD; one epoch of SFT on teacher answers, then OPD; or SFT on teacher answers only (§6.2).
2. **Pure OPD wins every time.** It has the best peak in every cell tested (§6.2).
3. **The warm-up hurts bigger students more.** −6.6 points at 3B, −15.7 at 7B, −19.4 at 14B (§6.2). [[−19.4 | points lost by the 14B student]]
4. **It drags students down to the teacher.** One epoch erased 32 points of the 14B student's start; OPD never won them back (§6.2).
5. **Pure copying is worst in weak-to-strong.** 28.4 points behind OPD in the most extreme pair; under one in same-size pairs (§6.2).

<p class="rd-cap">Numbers are §6.2 (the paper's Fig. 8 and Fig. 19).</p>

<p class="rd-take bad"><b>Copying a weak teacher's answers first hurts strong students.</b> Next: does a chain of teachers do better?</p>

</article>

<article class="rd-page" id="chains" data-part="How solid is it?" data-draw="chains" data-fast markdown>

<p class="rd-crumb"><b>Solid 5</b> Peak of a chained student vs one direct jump, same size.</p>

## Does a chain of teachers beat one jump?

1. **Build a chain.** RL only the 0.5B model. Each larger model learns from the previous chain stage (§6.3).
2. **Compare with one jump.** Direct OPD from the 0.5B expert to the same size (§6.3).
3. **Every chain ends lower.** 60.4 vs 61.4 at 3B, 70.0–71.3 vs 72.7 at 7B, 76.8 vs 77.7 at 14B (§6.3). [[76.8 vs 77.7 | 14B: chain vs one jump]]
4. **A better score, a worse teacher.** The 1.5B stage scores 53.0% against the expert's 39.8%, yet teaches 3B worse (§6.3).
5. **Delta-OPD agrees.** 64.5 vs 65.3, 74.0 vs 75.0, 79.4 vs 79.9. Direct RL on the student beats all of them (§6.3).

<p class="rd-cap">Peaks are §6.3 (the paper's Fig. 9). The 7B chain value spans several chains.</p>

<p class="rd-take bad"><b>Chaining teachers loses a little at every step.</b> It reverses an earlier weak-to-strong result from chess puzzles (§6.3).</p>

</article>

<article class="rd-page" id="lessons" data-part="How solid is it?" data-draw="lessons" markdown>

<p class="rd-crumb"><b>Solid 6</b> The paper's own list of what did not work (App. K).</p>

## What went wrong along the way?

1. **A KL estimate with the wrong gradient.** k₃ gives the right reverse-KL value but a forward-KL gradient. They switched to k₃⁺ (App. K).
2. **Numerics hid the regression.** BF16 optimizer states showed no post-peak drop; FP32 states regressed reliably (App. K).
3. **Whole-answer KL didn't line runs up.** Sequence-level KL gave no regular start; token-mean KL did (App. K).
4. **RL curve shapes didn't fit.** Gao et al.'s curved forms had no identifiable curvature here (App. K).
5. **Full-vocabulary loss regressed sooner.** So the paper uses the sampled-token form throughout (App. K). [[6 | lessons listed in App. K]]

<p class="rd-cap">All from App. K. The sixth lesson, no law for the peak's location, is on page 10's topic (§4.1).</p>

<p class="rd-take"><b>Late-stage behaviour is fragile: estimators and numerics can change it.</b> Next: what a reviewer would ask.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Our critique of pages 11–19.</p>

## What would a careful reviewer question?

1. 🧠 **Head starts inflate "beats the teacher".** The 14B student starts near 72.6, far above its 39.8% teacher (Table 9; our arithmetic).
2. 🧠 **The peak is picked on the test set.** It is the best of many evaluations on the same 6.3K problems the laws are scored on (§3).
3. 🧠 **β leans on few teachers.** Five chain teachers plus one held-out cell set the negative sign (§5, Table 3).
4. 🧠 **The cap is assumed.** Drops for the smallest students under big teachers stay unmodeled (§5).
5. 🧠 **The speed law is loose.** R² is 0.59, and a plain baseline predicts better (§5, App. H).
6. 🧠 **One seed, one family, 2K tokens.** Intervals cover pairs, not training randomness (App. B, App. E.5).
7. 🧠 **Steelman: it passed a real test.** It ordered the held-out teacher correctly when both simpler laws failed (Table 3).

<p class="rd-cap">Pointers mark the evidence behind each concern. The pills are our judgment.</p>

<p class="rd-take"><b>Trust the peak law for ranking teachers, not for exact scores.</b> Next: the verdict for your goal.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Verdict</b> For the goal on the cover. Uses pages 11, 17 and 18.</p>

## Should you RL once and distill up the family?

1. **One small expert lifts the family.** The 0.5B expert takes 7B to 72.7% and 14B to 77.7% (Fig. 4).
2. **Direct RL still wins.** RL on the student beats every weak-teacher variant (§6.3). Same-size OPD lands within 0.5 points of RL (§4.1).
3. **A mid-size teacher closes most of the gap.** For 14B: 77.7 from 0.5B, 83.6 from 3B, 87.3 from 14B (Fig. 4). [[83.6 | 14B student, 3B teacher]]
4. **Use pure OPD, in one jump.** Skip the SFT warm-up and the chains (§6.2, §6.3).
5. 🧠 **Our verdict: RL a mid-size model.** Then distill up. Rank teachers with the peak law, but measure scores yourself.

<p class="rd-cap">Peaks are Fig. 4's grid labels. The mid-size advice is our reading, for Qwen2.5 math only (App. B).</p>

<p class="rd-take"><b>RL once at a middle size, distill directly, expect to trail full RL slightly.</b> Other tasks are untested (App. B).</p>

</article>

<article class="rd-page" id="whats-next" data-part="Your move" data-draw="ideas" markdown>

<p class="rd-crumb"><b>Your move 2</b> Limits from App. B, plus our ideas.</p>

## What could you try next?

1. **Paper's limit: one family, one task.** Qwen2.5 and math only; other families are untested (App. B).
2. **Paper's limit: one seed.** Seeds and prompt-level resampling would size the uncertainty (App. B).
3. **Paper's limit: short answers.** Rollouts stop at 2K tokens, and length is known to affect OPD (App. B).
4. 🧠 **Pick peaks on a separate split.** Choose each run's peak on validation problems, then score the test set once.
5. 🧠 **For speech: distill a speech LLM.** RL a small model on a spoken task, then distill up its family and test the law.

<p class="rd-cap">Steps 1–3 are App. B; 4–5 and every position on the map are our guesses.</p>

<p class="rd-take"><b>The cheapest strong follow-up is a separate split for picking peaks.</b> Then check yourself on the next three pages.</p>

</article>

<article class="rd-page" id="quiz" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 3 and 8.</p>

## What does the paper put on the x-axis of a training curve?

- [ ] Optimizer steps
- [ ] Sequence-level KL from the teacher
- [x] The square root of token-mean reverse KL from the student's start
- [ ] The teacher's proxy reward

<p class="rd-take"><b>d = √k₃ from the student's own start.</b> On that axis every run begins as a straight line (§3, §4).</p>

</article>

<article class="rd-page" id="check-error" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 11.</p>

## The teacher's error halves. What happens to the student's peak error?

- [ ] Almost nothing, because student size dominates
- [x] It roughly halves, because ζ is close to 1
- [ ] It quarters, because the errors multiply
- [ ] It drops 30%, the student exponent

<p class="rd-take"><b>Roughly halves.</b> \(0.5^{0.95} = 0.52\) (Table 1; our arithmetic). Student size enters only as a gentle −0.30 power.</p>

</article>

<article class="rd-page" id="check-flaw" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From page 15.</p>

## What is wrong with "the 0.5B teacher added 38 points to the 14B model"?

- [ ] Nothing: 77.7 − 39.8 is the gain
- [x] The 14B student started near 72.6, so OPD added about 5 points
- [ ] The 14B student was never trained on math before OPD
- [ ] The teacher was scored on a different test set

<p class="rd-take"><b>Its start was already high.</b> Table 9 lists a 5.1-point gain; peak minus gain is about 72.6 (our arithmetic).</p>

</article>
