---
title: "Unified Training"
paper_title: "Training Foundation Models with a Single Algorithm"
authors: ["Yuda Song", "Alvin Zhang", "Fahim Tajwar", "Daman Arora", "Jeff Schneider", "Daniel Khashabi", "Ruslan Salakhutdinov", "J. Andrew Bagnell", "Aarti Singh", "Andrea Zanette"]
year: 2026
venue: "arXiv preprint (v1, October 2026)"
arxiv_id: "2610.40564"
arxiv_version: v1
code: {url: "https://github.com/yudasong/unified-training", license: "Apache-2.0", note: "trainer, generator, rewards and puzzle environment, read at commit 5b3eaa0 (Oct 29, 2026); not run"}
model: {url: "https://huggingface.co/sfanm/unified-training", license: "Apache-2.0", note: "the 124M puzzle models before RL and the 0.76B math-RL models; not run"}
paper_type: training-recipe
hook: "Pretraining, fine-tuning and RL usually need different training code. This paper rewrites RL as ordinary next-token training on the model's own correct answers, so one loss can run every stage at once, and old skills stop being forgotten."
big_idea: "Write MaxRL-style reinforcement learning as maximum-likelihood fitting to the model's own successful samples (each weighted 1/p̂), and every training stage becomes the same weighted next-token loss on a different data source; training on a changing mixture of sources instead of in stages then keeps old skills and gives a better start for the next task."
goal: "Add an RL stage (for example an ASR-checked intelligibility reward) to an LLM-based TTS model without losing what pretraining and SFT taught it."
difficulty: 4
difficulty_note: "New to you: how LLMs are trained, and RL from scratch, built over 25 pages around a four-answer toy model you can train live. The math is one identity; the rest is careful experiments."
date_added: 2026-11-02
tags: [LLMs, Reinforcement learning, Fine-tuning, Reasoning]
description: "Pretraining, fine-tuning and RL usually need different training code. This paper rewrites RL as ordinary next-token training on the model's own correct answers, so one loss can run every stage at once, and old skills stop being forgotten."
---

<article class="rd-page" id="next-token" data-part="LLM toolbox" data-draw="next-token" markdown>

<p class="rd-crumb"><b>LLM toolbox 1</b> Start here. Nothing earlier is needed.</p>

## What number does a language model actually compute?

1. **It predicts the next token.** Text is cut into tokens. At each position the model outputs a probability for every possible next token.
2. **An answer is a chain of tokens.** Our running example is a puzzle answer, "Hugo=38, Maya=6, …", predicted one token after another (App. B.3).
3. **Chain probabilities multiply.** The probability of a whole answer \(y\) given a prompt \(x\) is the product of its token probabilities. The paper writes it \(\pi_\theta(y\mid x)\) (§2).
4. **Logs turn products into sums.** \(\log\pi_\theta(y\mid x)\) adds one log-probability per token. Move the slider to change one token's probability.
5. **Sampling rolls dice per token.** Draw each token from its probabilities, so one prompt gives different answers. The paper samples at temperature 1.0 (Table 7).

<p class="rd-cap">The answer is the paper's midtraining example (App. B.3). Token probabilities are made up; the sum is live arithmetic.</p>

<p class="rd-take"><b>A language model assigns a probability to every possible answer.</b> Every training stage in this lesson just moves those probabilities.</p>

</article>

<article class="rd-page" id="mle" data-part="LLM toolbox" data-draw="mle" markdown>

<p class="rd-crumb"><b>LLM toolbox 2</b> Uses \(\pi_\theta(y\mid x)\) from page 1.</p>

## What does maximum-likelihood training do to those numbers?

1. **Show it a correct answer.** Training data is pairs: a prompt \(x\) and a completion \(y\). Web text has an empty prompt (§2.1).
2. **The loss is minus the log-probability.** \(-\log\pi_\theta(y\mid x)\), summed over the answer's tokens. It's ordinary next-token cross-entropy (§2.1).
3. **Low probability, big loss.** A token at probability 0.05 costs 3.0 nats; at 0.9 it costs 0.1. Drag the slider.
4. **The gradient pushes probability up.** The update direction is \(\nabla_\theta\log\pi_\theta(y\mid x)\), called the **score** (§2.1).
5. **Many examples, one distribution.** Averaged over data \(\mu\), this pulls the model toward \(\mu\). It equals minimizing the KL from \(\mu\) to the model (§2.1).

<p class="rd-cap">The loss curve is exact (−ln p). The slider value is ours.</p>

<p class="rd-take"><b>Maximum likelihood means "make the training answers more probable."</b> Remember the score \(\nabla\log\pi\): RL reuses it.</p>

</article>

<article class="rd-page" id="same-loss" data-part="LLM toolbox" data-draw="same-loss" markdown>

<p class="rd-crumb"><b>LLM toolbox 3</b> Applies page 2's loss to three kinds of data.</p>

## How do pretraining, midtraining and SFT differ?

1. **Pretraining: web text, every token counts.** The paper's 124M model reads 20B tokens: 75% ClimbMix, 25% Dolmino (App. C.2).
2. **Midtraining: curated text, same rule.** Here, 510M tokens of worked puzzle solutions (App. C.1).
3. **SFT: instructions plus demonstrations.** The prompt conditions the answer but gets weight 0. Only answer tokens are trained (§2.1, §4.1).
4. **One loss, three data sources.** The paper calls these fixed corpora **static data**. They never change during training (§2.1).

<p class="rd-cap">Corpus sizes are real (App. C.1, C.2). Token rows are schematic.</p>

<p class="rd-take"><b>Pretraining, midtraining and SFT are one algorithm on different data.</b> Only the data and the 0/1 masks change.</p>

</article>

<article class="rd-page" id="stages" data-part="LLM toolbox" data-draw="stages" markdown>

<p class="rd-crumb"><b>LLM toolbox 4</b> Puts page 3's sources on a timeline.</p>

## Why are models trained in stages at all?

1. **The usual recipe is a relay.** Pretraining, then midtraining, then SFT, then RL. DeepSeek-V3 and OLMo 3 are built this way (§1).
2. **RL swaps the algorithm too.** Static data uses likelihood. RL is usually written as policy optimization, with its own code (§1, §3).
3. **Each stage is tuned on its own metric.** A midtraining checkpoint is picked by its own score, before RL runs (§1).
4. **But stages interact.** Earlier choices change how later stages learn, and little is known about choosing them jointly (§1).
5. 🧠 **LLM-based TTS uses the same relay.** Pretrain on speech tokens, fine-tune on a voice or language, then maybe RL.

<p class="rd-cap">Stage order from §1. Band widths are not to scale.</p>

<p class="rd-take"><b>Staged training is a habit, not a law.</b> The paper asks what happens when stages blend.</p>

</article>

<article class="rd-page" id="forgetting" data-part="LLM toolbox" data-draw="forgetting" data-fast markdown>

<p class="rd-crumb"><b>LLM toolbox 5</b> The cost of page 4's abrupt switches.</p>

## What goes wrong when a stage switches abruptly?

1. **Train on puzzles only, after pretraining.** Staged midtraining runs 1–4 epochs on the 510M-token puzzle corpus (App. C.3).
2. **Held-out web loss explodes.** Pretraining alone: 2.537 nats. After 2 epochs at learning rate 2e-4: 12.356 (Table 11). [[2.5 → 12.4 | held-out web loss, nats]]
3. **General benchmarks drop.** The mean of five benchmarks falls from 42.37% to 35.05% (Table 11).
4. **A gentler learning rate isn't enough.** One epoch at 5e-5 still gives loss 4.135 and mean 38.49% (Table 11).
5. **This is catastrophic forgetting.** New data overwrote old skills. Keep these numbers; page 44 answers them.

<p class="rd-cap">All values are real (Table 11): held-out ClimbMix/Dolmino loss weighted 75/25, measured before RL.</p>

<p class="rd-take"><b>Switching data abruptly makes a model forget.</b> Next: RL, the stage that looks most different.</p>

</article>

<article class="rd-page" id="rl-loop" data-part="RL toolbox" data-draw="rl-loop" markdown>

<p class="rd-crumb"><b>RL toolbox 1</b> No RL needed before this. Uses sampling from page 1.</p>

## What is reinforcement learning, in language-model words?

1. **The model is the policy.** In RL, whatever chooses actions is a **policy**. Here it's the LLM, \(\pi_\theta\) (§2.2).
2. **An action is a whole answer.** Given a prompt \(x\), the policy samples a completion \(y\). One sample is a **rollout** or **generation**.
3. **A checker gives a reward.** \(r(x,y)\) is 1 if the answer is correct and 0 otherwise (§2.2).
4. **Update toward reward.** Change \(\theta\) so rewarded answers become more likely. Then sample again with the new model.
5. **No answer key needed.** Only a way to check answers. So RL can teach what no demonstration shows.

<p class="rd-cap">The loop follows §2.2. The puzzle prompt is our running example (App. B.3).</p>

<p class="rd-take"><b>RL is sample, check, reinforce, repeat.</b> The training data comes from the model itself.</p>

</article>

<article class="rd-page" id="reward" data-part="RL toolbox" data-draw="reward" markdown>

<p class="rd-crumb"><b>RL toolbox 2</b> Zooms into page 1's checker.</p>

## Where does the reward come from?

1. **Puzzles: check the boxed answer.** The grader compares the full person-to-floor assignment. No partial credit (App. C.4).
2. **Too long counts as wrong.** An answer that hits the 1,280-token limit without ending gets reward 0 (App. C.3, Table 7).
3. **Math: an answer checker.** Math12K answers are graded with the veRL reward function (App. D.1).
4. **Code: run the unit tests.** Reward 1 only if the program passes every test (App. D.7).
5. **These are verifiable rewards.** A program decides, not a learned judge. Cheap, exact, hard to fool.

<p class="rd-cap">Rules are real (App. C.3, C.4, D.1, D.7). The three sample answers are made up.</p>

<p class="rd-take"><b>A binary reward is a pass/fail check you can run.</b> Next: what RL is trying to maximize.</p>

</article>

<article class="rd-page" id="pass-rate" data-part="RL toolbox" data-draw="pass-rate" markdown>

<p class="rd-crumb"><b>RL toolbox 3</b> Meet the toy model used for the next 14 pages.</p>

## What exactly is RL trying to maximize?

1. **Meet the toy model.** Our puzzle has four possible answers. Two are correct (✓1, ✓2), two wrong. The model gives each a probability.
2. **Pass rate is the chance of success.** Add the correct answers' probabilities: \(0.15+0.10=0.25\). The paper calls it \(p_\theta(x)\) (§3.1).
3. **The objective averages it over prompts.** \(J(\theta)\) is the expected reward, so the mean pass rate (§2.2).
4. **Probabilities come from logits.** A softmax, like any classifier. Move the slider to raise ✓1's logit and watch \(p\).

<p class="rd-cap">The four-answer model is our toy; real answers are hundreds of tokens. All arithmetic is exact.</p>

<p class="rd-take"><b>With 0/1 rewards, RL maximizes the chance a sample is correct.</b> Next: why plain backprop can't do it.</p>

</article>

<article class="rd-page" id="no-backprop" data-part="RL toolbox" data-draw="no-backprop" markdown>

<p class="rd-crumb"><b>RL toolbox 4</b> Uses the pass rate from page 8.</p>

## Why can't we just backpropagate through the reward?

1. **The reward is a program.** A grader returns 0 or 1. It has no gradient.
2. **Sampling is a dice roll.** Picking a token is discrete. A tiny weight change doesn't change which token was drawn.
3. **Yet the pass rate is smooth.** \(p_\theta(x)\) is a sum of probabilities, and those are differentiable in \(\theta\).
4. **So differentiate the probabilities.** We need the gradient of an average, estimated from samples. Next page.

<p class="rd-cap">Schematic. The toy's p = 0.25 comes from page 8.</p>

<p class="rd-take"><b>We can't differentiate the checker, but we can differentiate the odds of passing it.</b></p>

</article>

<article class="rd-page" id="score-trick" data-part="RL toolbox" data-draw="score-trick" markdown>

<p class="rd-crumb"><b>RL toolbox 5</b> Reuses the score from page 2.</p>

## How do you get a gradient from samples?

1. **Write the average out.** \(J=\sum_y\pi_\theta(y)\,r(y)\). Only \(\pi_\theta\) depends on \(\theta\).
2. **Use one identity.** \(\nabla\pi=\pi\,\nabla\log\pi\). It's the chain rule for the logarithm.
3. **It's an average again.** \(\nabla J=\mathbb{E}_{y\sim\pi}[\,r(y)\,\nabla\log\pi_\theta(y)\,]\): the **policy gradient** (Eq. 1).
4. **Estimate it by sampling.** Draw answers, multiply each score by its reward, average. Wrong answers add nothing.
5. **On the toy, push the logits.** A softmax's score on its logits is one-hot minus \(\pi\). The bars show the exact gradient.

<p class="rd-cap">Eq. 1 is the paper's. Bars: exact gradient on the toy's four logits.</p>

<p class="rd-take"><b>Policy gradient = each sample's score times its reward.</b> The same score as maximum likelihood (page 2).</p>

</article>

<article class="rd-page" id="reinforce" data-part="RL toolbox" data-draw="reinforce" data-fast markdown>

<p class="rd-crumb"><b>RL toolbox 6</b> Turns page 10's formula into an algorithm.</p>

## How does REINFORCE turn samples into an update?

1. **Sample 16 answers.** Our toy, with \(p=0.25\), drew four correct ones. The paper samples 16 per prompt (App. C.3).
2. **Weight each by its reward.** Correct: weight 1. Wrong: weight 0. That's **REINFORCE** (§2.2).
3. **It's SFT on your own successes.** Weight 1 is a normal likelihood step on that answer. Weight 0 skips it.
4. **Train it and watch \(p\) climb.** 60 exact gradient steps, computed live. Toggle the hard prompt, where \(p\) starts at 0.02.
5. **Hard prompts barely move.** When successes are rare, the average push is tiny. The paper's RL fixes this.

<p class="rd-cap">Training curves are exact on our toy (learning rate 1 on the logits). The 16-sample draw is illustrative.</p>

<p class="rd-take"><b>REINFORCE is likelihood training on the model's own correct samples.</b> But it learns slowly where success is rare.</p>

</article>

<article class="rd-page" id="baseline" data-part="RL toolbox" data-draw="baseline" markdown>

<p class="rd-crumb"><b>RL toolbox 7</b> Refines page 11's weights.</p>

## Why subtract a baseline from the reward?

1. **Weights of 1 and 0 are noisy.** Every correct sample gets the same push, however common success already is.
2. **Subtract the expected reward.** Use \(r-b\) with \(b=\hat p\). Correct answers get \(1-\hat p\); wrong ones get \(-\hat p\), a push down.
3. **The average update doesn't change.** \(\mathbb{E}_{y\sim\pi}[\nabla\log\pi]=0\), so a baseline adds zero on average (App. F.1).
4. **It cuts the noise.** Same direction on average, less spread. \(r-b\) is called the **advantage**, used by PPO and GRPO.
5. **The catch: fresh samples only.** The zero-average identity needs samples from the current model (App. F.1, D.6).

<p class="rd-cap">With 4 of 16 correct, p̂ = 0.25, so the weights are 0.75 and −0.25. The identity is App. F.1's; bars are exact on the toy.</p>

<p class="rd-take"><b>A baseline keeps the expected update and lowers the noise.</b> Remember the catch: it assumes fresh samples.</p>

</article>

<article class="rd-page" id="ppo-grpo" data-part="RL toolbox" data-draw="ppo-grpo" markdown>

<p class="rd-crumb"><b>RL toolbox 8</b> Builds on page 12's advantage.</p>

## What do PPO and GRPO add on top?

1. **PPO: a critic and clipping.** It learns a value model for the baseline and clips how far one update can move the policy (§2.2).
2. **GRPO: the group is the baseline.** Sample a group per prompt; advantage = (reward − group mean) / group std (§2.2).
3. **Dividing by std reweights prompts.** In expectation, GRPO weights a prompt by \(\sqrt{p/(1-p)}\) (App. F.1).
4. **REINFORCE weights prompts by \(p\).** Move the slider: both lean on prompts the model already solves.
5. **Extras break the clean picture.** Ratios, clipping and KL terms need not fit the paper's likelihood view (App. F.1).

<p class="rd-cap">Prompt weights are exact formulas (App. F.1, Table 2). Only the shapes matter; curves are scaled to meet at p = 0.5.</p>

<p class="rd-take"><b>Popular RL methods differ mostly in how they weight prompts and samples.</b> Keep that lens; the paper uses it throughout.</p>

</article>

<article class="rd-page" id="kl" data-part="RL toolbox" data-draw="kl" markdown>

<p class="rd-crumb"><b>RL toolbox 9</b> A standard add-on to page 11's update.</p>

## What does a KL penalty do?

1. **RL can wander far from the start.** It only sees rewards on one task, so everything else may drift.
2. **KL measures how far two distributions differ.** It's zero when the models agree and grows as they diverge.
3. **Penalize distance to a frozen copy.** Add \(\beta\) times a KL estimate to the loss, per sampled token (App. E).
4. **The paper's per-token penalty.** With \(u=\log\pi_{\text{ref}}-\log\pi_\theta\), add \(e^u-u-1\), with \(u\) clipped to ±20 (App. E).
5. **The trade-off is \(\beta\).** A strong leash means little drift and little learning. The paper tests 0.001, 0.01 and 0.1 (App. E).

<p class="rd-cap">Penalty formula and β values are real (App. E); the curve is exact. Move β.</p>

<p class="rd-take"><b>A KL penalty holds the model near where it started.</b> The paper later asks whether mixing data does this better.</p>

</article>

<article class="rd-page" id="pass-at-k" data-part="RL toolbox" data-draw="pass-at-k" markdown>

<p class="rd-crumb"><b>RL toolbox 10</b> How every result in this lesson is scored.</p>

## How do you score a model that samples?

1. **pass@1 is accuracy.** The chance that one sample is correct (App. C.4).
2. **pass@k is coverage.** The chance that at least one of \(k\) samples is correct. Puzzles use \(k=16\) (App. C.4).
3. **Estimate it from \(n\) samples.** With \(c\) correct of \(n\): \(1-\binom{n-c}{k}/\binom{n}{k}\) (App. C.4).
4. **The paper draws 64 per question.** 1,024 test questions, 64 samples each, temperature 1.0 (App. C.4). Move \(c\).
5. **The two can disagree.** RL often raises accuracy while coverage stalls. Watch both in the results.

<p class="rd-cap">The estimator (App. C.4) is computed live. n = 64 is the paper's.</p>

<p class="rd-take"><b>Accuracy asks "usually right?"; coverage asks "ever right?".</b> RL can only learn from prompts it sometimes solves.</p>

</article>

<article class="rd-page" id="on-policy" data-part="RL toolbox" data-draw="on-policy" markdown>

<p class="rd-crumb"><b>RL toolbox 11</b> The last idea before MaxRL. Revisits page 12's catch.</p>

## What does "on-policy" mean, and why care?

1. **On-policy: samples from the current model.** Generate, update, then generate again with the new weights.
2. **The math assumes it.** Eq. 1 averages over \(y\sim\pi_\theta\), the model being updated right now (§2.2).
3. **Waiting is slow.** Generation is the slow part, and synchronous RL leaves the trainer idle meanwhile.
4. **Off-policy: samples from an older model.** Faster, but the update no longer exactly follows Eq. 1 (§3.2).
5. **The paper's data is 12–44 updates old.** Measured in its asynchronous runs (App. D.6). Page 23 shows why that's fine.

<p class="rd-cap">The 12–44 range is real (App. D.6). Timelines are schematic.</p>

<p class="rd-take"><b>On-policy is exact but slow; off-policy is fast but approximate.</b> The paper's rewrite gives stale data a clear meaning.</p>

</article>

<article class="rd-page" id="maxrl-objective" data-part="RL as likelihood" data-draw="maxrl-objective" markdown>

<p class="rd-crumb"><b>Likelihood 1</b> Fixes page 11's hard-prompt problem.</p>

## What if RL maximized the log of the pass rate?

1. **MaxRL changes one thing.** Maximize \(\log p_\theta(x)\) for each prompt instead of \(p_\theta(x)\) (§3.1).
2. **Logs care about ratios.** Going from 0.01 to 0.02 doubles \(p\). In log terms that counts as much as 0.4 to 0.8.
3. **Hard prompts get a louder voice.** The slope of \(\log p\) is \(1/p\). At \(p=0.02\) the push is 50 times stronger. Move the slider.
4. **It's a likelihood.** "Probability of getting it right" is a likelihood, and MaxRL maximizes its log (§3.1).

<p class="rd-cap">Slopes are exact. MaxRL comes from Tajwar et al. (ICML 2026), which this paper builds on (§3.1).</p>

<p class="rd-take"><b>MaxRL is RL that values rare successes as much as common ones.</b> Next: the target it fits.</p>

</article>

<article class="rd-page" id="success-cond" data-part="RL as likelihood" data-draw="success-cond" markdown>

<p class="rd-crumb"><b>Likelihood 2</b> Uses the toy from page 8.</p>

## What is the success-conditioned distribution?

1. **Start from the toy model.** ✓1 0.15, ✓2 0.10, ✗ 0.45, ✗ 0.30 (page 8).
2. **Throw away the failures.** Keep only answers that pass. Their probabilities sum to \(p=0.25\).
3. **Renormalize.** Divide by \(p\): ✓1 becomes 0.60, ✓2 0.40. This is \(\pi^+_\theta\), "the model, given that it succeeded" (§3.1).
4. **Sampling it is easy.** Sample from the model and keep the correct answers. They follow \(\pi^+\).

<p class="rd-cap">Exact arithmetic on the toy. Notation: \(\pi^+_\theta(y\mid x)=\pi_\theta(y\mid x,r=1)\) (§3.1).</p>

<p class="rd-take"><b>\(\pi^+\) is the model's own distribution over its correct answers.</b> Next it becomes a training target.</p>

</article>

<article class="rd-page" id="rl-is-mle" data-part="RL as likelihood" data-draw="rl-is-mle" data-fast markdown>

<p class="rd-crumb"><b>Likelihood 3</b> The key identity. Uses pages 2, 10 and 18.</p>

## Why is MaxRL just maximum likelihood in disguise?

1. **Differentiate the log pass rate.** \(\nabla\log p=\nabla p/p\), and page 10 gave \(\nabla p=\mathbb{E}_\pi[r\,\nabla\log\pi]\).
2. **Dividing by \(p\) renormalizes.** \(\mathbb{E}_\pi[r\,\nabla\log\pi]/p=\mathbb{E}_{\pi^+}[\nabla\log\pi]\) (§3.1).
3. **That's a likelihood gradient.** Page 2's form, with data drawn from \(\pi^+_{\theta_t}\) instead of a corpus (§3.1).
4. **Freeze the target, then fit it.** Hold \(\pi^+_{\theta_t}\) fixed and minimize \(-\log\pi_\theta(y\mid x)\) on its samples (§3.1).
5. **On the toy: target minus current.** The logit gradient is \(\pi^+-\pi\) = (0.45, 0.30, −0.45, −0.30). That's exactly cross-entropy toward \(\pi^+\).

<p class="rd-cap">Derivation follows §3.1. Logit gradients are exact on the toy.</p>

<p class="rd-take"><b>One MaxRL step is one SFT step on the model's own correct answers.</b> RL now speaks the same language as pretraining.</p>

</article>

<article class="rd-page" id="prompt-weights" data-part="RL as likelihood" data-draw="prompt-weights" markdown>

<p class="rd-crumb"><b>Likelihood 4</b> Compares page 11's REINFORCE with page 19's MaxRL.</p>

## How do REINFORCE and MaxRL treat easy and hard prompts?

1. **Same target.** Both fit \(\pi^+_{\theta_t}\), the model's correct answers (§3.2, Table 2).
2. **Different prompt mix.** REINFORCE weights each prompt by its pass rate: \(\rho_{\text{RF}}(x)\propto\rho(x)\,p_{\theta_t}(x)\) (§3.2).
3. **MaxRL keeps prompts equal.** It uses the original prompt distribution \(\rho(x)\) (Table 2).
4. **One easy prompt, one hard.** Move the sliders. REINFORCE spends most of its update where the model already succeeds.
5. **Train the hard prompt both ways.** MaxRL climbs much faster; both curves are computed live.

<p class="rd-cap">Prompt weights are Table 2's formulas. Training curves are exact on our toy (learning rate 1).</p>

<p class="rd-take"><b>REINFORCE and MaxRL differ only in which prompts they listen to.</b> Neither changes what a good answer looks like.</p>

</article>

<article class="rd-page" id="finite-sample" data-part="RL as likelihood" data-draw="finite-sample" data-fast markdown>

<p class="rd-crumb"><b>Likelihood 5</b> Page 19's identity, computed from page 11's 16 samples.</p>

## How is MaxRL computed from just 16 samples?

1. **Estimate the pass rate.** 16 samples, 4 correct: \(\hat p=4/16=0.25\) (§4.2).
2. **Weight correct answers by \(1/\hat p\).** Each gets \(A=4\); wrong ones get 0 (§4.2). [[A = 1/p̂ = 4 | weight on each correct answer]]
3. **The result is the mean over successes.** The weighted average equals the plain average of the 4 correct answers' scores (§4.2).
4. **No success, no update.** If all 16 fail, the prompt contributes nothing (§4.2).
5. **Compare REINFORCE.** It uses weight 1, so its push is \(\hat p\) times MaxRL's. Move the slider.

<p class="rd-cap">Weights from §4.2. The 4-of-16 draw is our running example; the slider is live arithmetic.</p>

<p class="rd-take"><b>In practice MaxRL is weight 1/p̂ on each correct sample, 0 on the rest.</b> That's the only RL-specific number in the system.</p>

</article>

<article class="rd-page" id="finite-n" data-part="RL as likelihood" data-draw="finite-n" markdown>

<p class="rd-crumb"><b>Likelihood 6</b> Why page 21's estimate is still principled.</p>

## What does sampling only N answers change?

1. **Some prompts show no success.** With \(N\) samples, the chance of at least one correct is \(1-(1-p)^N\) (§4.2).
2. **That chance is the prompt's weight.** The target stays \(\pi^+\); rarely solved prompts just count less (§4.2).
3. **N = 1 gives REINFORCE.** The weight is then \(p\), REINFORCE's prompt weighting (§4.2).
4. **Large N gives MaxRL.** The weight tends to 1 for every solvable prompt. The paper uses \(N=16\) (§4.2, App. C.3).

<p class="rd-cap">Curves are the exact formula from §4.2. Move N.</p>

<p class="rd-take"><b>N slides you from REINFORCE (N = 1) to MaxRL (N → ∞).</b> At N = 16, a prompt solved 5% of the time already weighs 0.56.</p>

</article>

<article class="rd-page" id="any-generator" data-part="RL as likelihood" data-draw="any-generator" markdown>

<p class="rd-crumb"><b>Likelihood 7</b> Answers page 16's staleness worry.</p>

## Can the samples come from a different model?

1. **Call the sampler \(\nu\).** Any fixed policy: an older copy of the model, or another model entirely (§3.2).
2. **Its successes define a target.** \(\nu^+(\cdot\mid x)=\nu(\cdot\mid x,r=1)\) (§3.2).
3. **Fit it with the same loss.** \(-\log\pi_\theta(y\mid x)\) on \(\nu^+\) samples is still plain maximum likelihood (§3.2).
4. **It's no longer the MaxRL gradient.** With \(\nu\ne\pi_{\theta_t}\), you fit \(\nu\)'s successes: a well-defined, different target (§3.2).
5. **This makes asynchronous training sound.** Stale samples just mean \(\nu\) is a recent copy (§3.2, §4.2).

<p class="rd-cap">From §3.2 ("Likelihood targets from arbitrary generators"). Schematic; toggle the generator.</p>

<p class="rd-take"><b>Here, off-policy data isn't an error; it's a different, well-defined target.</b> Contrast page 12, where stale samples break the baseline.</p>

</article>

<article class="rd-page" id="tailrl" data-part="RL as likelihood" data-draw="tailrl" markdown>

<p class="rd-crumb"><b>Likelihood 8</b> Extends page 18 beyond pass/fail.</p>

## What if the reward isn't just 0 or 1?

1. **Rewards anywhere in \([0,1]\).** A quality score, say. MaxRL needs pass/fail; **TailRL** extends it (App. F.2).
2. **Pick a threshold \(\tau\).** Success means reward above \(\tau\), which gives a pass/fail target \(\pi^+_\tau\) (App. F.2).
3. **Average over all thresholds.** Integrate \(\tau\) from 0 to 1. Better answers pass more thresholds, so they get more weight (App. F.2).
4. **Still one likelihood target.** \(\int_0^1\pi_\theta(\cdot\mid x,r>\tau)\,d\tau\), with prompts kept equal (Table 2).
5. 🧠 **Useful for TTS.** Speaker similarity or a MOS predictor gives a score, not a pass/fail.

<p class="rd-cap">Rewards of the five toy answers are made up; TailRL weights are computed exactly (equal sampling probabilities). Move τ.</p>

<p class="rd-take"><b>Continuous rewards fit too: average the pass/fail target over every threshold.</b> Next: all objectives in one table.</p>

</article>

<article class="rd-page" id="objectives-table" data-part="RL as likelihood" data-draw="objectives-table" markdown>

<p class="rd-crumb"><b>Likelihood 9</b> Collects pages 20 and 24.</p>

## How do the RL objectives fit one table?

1. **MaxRL, pass/fail reward.** Target \(\pi^+\); prompts as given (Table 2).
2. **REINFORCE, pass/fail.** Same target; prompts weighted by \(p\) (Table 2).
3. **TailRL, rewards in \([0,1]\).** Threshold-averaged target; prompts as given (Table 2).
4. **REINFORCE, rewards in \([0,1]\).** Target ∝ \(\pi\cdot r\), reward-weighted answers; prompts weighted by mean reward (Table 2, App. F.1).
5. **Every row is just data.** A target plus a prompt mix. A trainer that only knows likelihood can run all four.

<p class="rd-cap">Rows transcribe Table 2 (on-policy, App. F).</p>

<p class="rd-take"><b>Each RL objective is a choice of target answers and prompt mix.</b> That's what lets RL join a data mixture.</p>

</article>

<article class="rd-page" id="one-mixture" data-part="The unified machine" data-draw="one-mixture" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Joins page 3's static data with page 19's RL target.</p>

## What is unified training, in one picture?

1. **Four data sources.** Pretraining, midtraining, SFT and RL. Each is a prompt distribution plus a target (Table 1).
2. **Give each a weight.** \(\lambda_{s,t}\ge0\), summing to 1, free to change every iteration \(t\) (§3.2).
3. **Mix them into one distribution.** \(q_t=\sum_s\lambda_{s,t}(\rho_{s,t}\circ\mu_{s,t})\) (§3.2).
4. **Apply one loss.** \(-\mathbb{E}_{(x,y)\sim q_t}[\log\pi_\theta(y\mid x)]\). Equivalently, pick a source by \(\lambda\), then an example (§3.2).
5. **The RL source refreshes itself.** Its target \(\pi^+_{\theta_t}\) is regenerated by the updated model (Fig. 1).

<p class="rd-cap">Sources from Table 1. Shares are the RL phase of one puzzle run (Fig. 3); there is no SFT source in it.</p>

<p class="rd-take"><b>Unified training is one likelihood loss on a changing mixture of data.</b> The design question becomes: which data, how much, when.</p>

</article>

<article class="rd-page" id="staged-special" data-part="The unified machine" data-draw="staged-special" markdown>

<p class="rd-crumb"><b>Machine 2</b> Page 4's relay, redrawn as a mixture.</p>

## How is staged training a special case?

1. **Staged: one source at a time.** All weight on pretraining, then all on midtraining, then all on RL (§3.2).
2. **Unified: overlap and blend.** Sources share batches, and their proportions can change (§3.2).
3. **The puzzle run, to scale.** 16B tokens of pure web text, then 5B at 89% web and 11% puzzles (Fig. 3).
4. **Then the RL phase.** About 2B tokens: 95.4% RL generations, 4.4% puzzles, 0.3% web (Fig. 3).

<p class="rd-cap">Shares and token marks are from Fig. 3 (rounded, the run of App. C.8). The staged view is schematic. Toggle the two.</p>

<p class="rd-take"><b>Staged training is unified training with a step-function schedule.</b> Everything between is now allowed.</p>

</article>

<article class="rd-page" id="data-format" data-part="The unified machine" data-draw="data-format" markdown>

<p class="rd-crumb"><b>Machine 3</b> Uses page 21's weight A = 4.</p>

## How can one data format hold every stage?

1. **An example is tokens plus weights.** \((z,w)\): a token sequence and one non-negative weight per token (§4.1).
2. **Pretraining and midtraining: all ones.** Every corpus token counts (§4.1).
3. **SFT: zeros on the prompt.** Ones on the demonstration (§4.1).
4. **RL: prompt zeros, answer weight A.** Our correct answer gets \(A=4\); a wrong one gets 0 (§4.1, §4.2).
5. **Stages differ only in the numbers.** One tokens-and-weights format for everything (Fig. 2).

<p class="rd-cap">Format from §4.1 and Fig. 2. Token rows show our running example, shortened.</p>

<p class="rd-take"><b>Every stage becomes "tokens with weights".</b> The trainer never needs to know which stage a row came from.</p>

</article>

<article class="rd-page" id="token-mean" data-part="The unified machine" data-draw="token-mean" markdown>

<p class="rd-crumb"><b>Machine 4</b> Adds up page 28's rows.</p>

## How are losses from different rows added up?

1. **Weighted log-loss per token.** Each token adds \(w_\ell\cdot(-\log\pi_\theta(z_\ell\mid z_{<\ell}))\) (Eq. 2).
2. **Divide by one count for the batch.** \(T_B\) counts all non-prompt tokens in the batch (Eq. 2).
3. **Wrong answers count in \(T_B\).** Their weights are 0, but their tokens are still counted (App. C.3).
4. **Try a tiny batch.** One correct RL answer, one wrong one, one midtraining example. Move the midtraining length.
5. **Shares follow tokens and weights.** A longer midtraining example gets more say. That's why mixtures are set in tokens (§4.3).

<p class="rd-cap">Eq. 2 and its counting rule are real (App. C.3). Lengths are ours, and every token's loss is set to 1 so shares are visible.</p>

<p class="rd-take"><b>One token mean over the whole batch: each source weighs in by its weighted token share.</b></p>

</article>

<article class="rd-page" id="separate-loss" data-part="The unified machine" data-draw="separate-loss" markdown>

<p class="rd-crumb"><b>Machine 5</b> The alternative to page 29's single mean.</p>

## Why not add an SFT loss with its own coefficient?

1. **The common alternative.** RL mean plus \(\alpha\) times midtraining mean: \(N_R/T_R+\alpha N_D/T_D\). InstructGPT-style methods do this (§6.3, App. A.1).
2. **Unified: one shared mean.** \((N_R+wN_D)/(T_R+T_D)\) (App. A.1).
3. **Unified hides a moving coefficient.** Rewritten, midtraining gets relative weight \(wT_D/T_R\) (App. A.1).
4. **It tracks the batch.** More midtraining tokens, more weight; a fixed \(\alpha\) ignores the mix (App. A.1). Move the token counts.
5. **The paper tests both.** \(\alpha\in\{0.1,0.5\}\), and 1 in one setting (App. C.3). Page 43 has the result.

<p class="rd-cap">Formulas from App. A.1. Token counts are slider values; the coefficient is computed live.</p>

<p class="rd-take"><b>In unified training, the mixture itself sets how loud each source is.</b> No extra coefficient to tune.</p>

</article>

<article class="rd-page" id="mix-rates" data-part="The unified machine" data-draw="mix-rates" markdown>

<p class="rd-crumb"><b>Machine 6</b> How page 26's weights become batch contents.</p>

## How do you hit a target token share?

1. **Set a token fraction per source.** For example, midtraining is 2% of trained tokens (§4.3, App. A.1).
2. **Convert to example rates.** Sample source \(s\) at a rate ∝ \(f_s/T_s\), with \(T_s\) its mean example length (§4.3).
3. **Real-world batches.** Keep 512 RL answers and add midtraining examples to hit \(f=T_{\text{mid}}/(T_{\text{mid}}+T_{\text{rl}})\) (App. A.1).
4. **Lengths are frozen estimates.** Measured once before training. If RL answers grow, the real share drifts (App. A.1).
5. **Fractions round across updates.** Counts are rounded cumulatively, so 2.6 examples per update averages out (App. A.1).

<p class="rd-cap">Rules are real (App. A.1). Mean lengths on the sliders are ours; the paper doesn't report them.</p>

<p class="rd-take"><b>A mixture is a token target turned into example counts.</b></p>

</article>

<article class="rd-page" id="async" data-part="The unified machine" data-draw="async" markdown>

<p class="rd-crumb"><b>Machine 7</b> Page 16's off-policy timeline, built.</p>

## How do the generator and trainer run at the same time?

1. **Generators sample with a recent copy.** They write weighted RL batches into a shared buffer (§4.2, Fig. 2).
2. **The buffer also holds static data.** Pretraining, midtraining and SFT rows sit beside RL rows (§4, Fig. 2).
3. **The trainer samples the mixture.** It never waits for generation (§4.3).
4. **Weights are published every k updates.** \(k=4\) in the real-world runs; generators reload between batches (§4.3, App. D.1).
5. 💻 **In the code, rounds are folders.** A generator writes a round directory; the trainer folds new rounds into its buffer (`gen_service.py`).

<p class="rd-cap">Design from §4 and Fig. 2; k = 4 from App. D.1. Code read at commit 5b3eaa0.</p>

<p class="rd-take"><b>Generation and training are decoupled through a buffer.</b> Next: what that costs.</p>

</article>

<article class="rd-page" id="staleness" data-part="The unified machine" data-draw="staleness" markdown>

<p class="rd-crumb"><b>Machine 8</b> Measures page 32's system.</p>

## How stale is the data, and what does it cost?

1. **Measured: 12–44 updates old.** Snapshots of eight generators at two points in training (App. D.6).
2. **No baseline in unified runs.** Weight \(r/\hat p\), not \((r-\hat p)/\hat p\). The baseline trick needs fresh samples (App. D.6).
3. **Updates run 7.8 times faster.** 3.7 s versus 28.8 s per update, on 24 versus 16 GPUs (App. D.6). [[7.8× | update throughput vs staged RL]]
4. **Same math accuracy.** RL alone through the unified trainer: 24.75% Math pass@1; staged RL: 24.16% (App. D.6).
5. **But more drift.** Held-out loss rises 0.074 versus 0.047 nats. Asynchrony alone doesn't protect old skills (App. D.6).

<p class="rd-cap">All numbers are real (App. D.6). Not a controlled comparison: GPUs, staleness and baseline all differ.</p>

<p class="rd-take"><b>Asynchrony buys speed at similar accuracy, but it doesn't stop forgetting.</b> That's the mixture's job.</p>

</article>

<article class="rd-page" id="puzzle" data-part="The puzzle study" data-draw="puzzle" markdown>

<p class="rd-crumb"><b>Study 1</b> The running example in full.</p>

## What do the tower puzzles look like?

1. **Six people, six occupied floors.** Floors 6, 13, 23, 28, 31 and 38. Each person names one best friend (App. B.3).
2. **Clues constrain floors.** "Zoe lives 3 floors above Ella." "Mia lives on an odd floor." Differences, sums, parity (App. B.1).
3. **One unique answer.** A solver checks that, and that constraint propagation alone reaches it (App. B.1).
4. **The oracle's first deduction.** Zoe − Ella = 3 fits only floors 31 and 28. Two people pinned (App. B.3).
5. **The rest follow.** Hugo 38, Maya 6, Ethan 23, Zoe 31, Ella 28, Mia 13 (App. B.3).

<p class="rd-cap">Floors, clues and answer are the paper's example (App. B.3). The tower is drawn by us.</p>

<p class="rd-take"><b>Verifiable, controllable, no partial credit: a clean lab for RL.</b></p>

</article>

<article class="rd-page" id="oracle-corpus" data-part="The puzzle study" data-draw="oracle-corpus" markdown>

<p class="rd-crumb"><b>Study 2</b> Where page 34's worked solution comes from.</p>

## What does the midtraining corpus teach?

1. **200,000 questions.** Half with 6–7 people, half with 8–9 (App. C.1).
2. **Up to four traces each.** Different deduction orders and wordings: 796,175 unique examples (App. B.2, C.1).
3. **About 510M tokens.** Exactly 509,942,713, prompts included (App. C.1). [[510M | tokens of worked solutions]]
4. **Only taught patterns.** Some combinations of reasoning moves are deliberately left out (App. B.2).
5. **Fixed across all runs.** More midtraining means re-reading the same examples, never new ones (App. C.1).

<p class="rd-cap">Counts are real (App. B.2, C.1).</p>

<p class="rd-take"><b>A fixed, curated corpus that teaches the reasoning moves, not every combination.</b></p>

</article>

<article class="rd-page" id="compositions" data-part="The puzzle study" data-draw="compositions" markdown>

<p class="rd-crumb"><b>Study 3</b> What page 35's corpus leaves out.</p>

## What does RL ask that midtraining never showed?

1. **Taught: single lookups.** "Ava's best friend". "The person on the second-highest floor" (Table 4).
2. **Taught: some chains.** "The best friend of the person on floor 19" (Table 4).
3. **Held out: new chains.** "The best friend of the person on the highest floor." Both moves were taught; this combination wasn't (Table 4).
4. **Base: same sizes, new chains.** 8–9 people; 10,000 taught-pattern and 18,570 new-chain prompts; 6,000 updates (Table 5).
5. **Extended: bigger puzzles.** Adds 10–11 people and runs 12,000 updates. **Extended generalization** tests 12 people, never trained (Table 5).

<p class="rd-cap">Patterns and pool sizes from Tables 4 and 5. Every test set has 1,024 questions.</p>

<p class="rd-take"><b>RL must combine known moves in new ways, then stretch to bigger puzzles.</b></p>

</article>

<article class="rd-page" id="contestants" data-part="The puzzle study" data-draw="contestants" markdown>

<p class="rd-crumb"><b>Study 4</b> Pages 26–27 made concrete.</p>

## What exactly are staged and unified training here?

1. **One 124M model.** 12 layers, width 768, GPT-2 tokenizer, 20B pretraining tokens (Table 6).
2. **Both branch at update 30,000.** 8,147 pretraining updates remain (App. C.2).
3. **Unified: add puzzles to those batches.** \(k\) from 8 to 128 puzzle sequences beside 256 web sequences: 3–33% of tokens (Table 3).
4. **Staged: finish pretraining, then puzzles.** 1, 2 or 4 epochs at learning rate 2e-4 or 5e-5: six candidates (App. C.3).
5. **Then the same MaxRL.** 32 prompts × 16 samples, learning rate 1e-5, no KL. Unified also adds 4–64 puzzle examples per update (Table 7).

<p class="rd-cap">All settings are real (Tables 3, 6, 7; App. C.2, C.3). The timeline is not to scale.</p>

<p class="rd-take"><b>Same model, data and RL; only the timing and blending of puzzle data differ.</b></p>

</article>

<article class="rd-page" id="compute" data-part="The puzzle study" data-draw="compute" markdown>

<p class="rd-crumb"><b>Study 5</b> Prices page 37's two timelines.</p>

## How do you compare runs that use different compute?

1. **Training costs 6N FLOPs per token.** N = 123,587,328 parameters (App. A.2).
2. **Generating costs 2N per token.** An RL token is generated, then trained on: 8N in total (App. A.2).
3. **Add every stage.** Static tokens cost 6N each, RL rollout tokens 8N each. Puzzle data mixed into RL counts as static (App. A.2).
4. **Pretraining dominates.** 20B tokens × 6N ≈ 1.48 × 10¹⁹ FLOPs, shared by every run. Move the sliders.
5. **Then take the best checkpoint per budget.** This frontier lets RL length vary too (App. A.2).

<p class="rd-cap">Formula and N are real (App. A.2). Slider values are ours; arithmetic is live.</p>

<p class="rd-take"><b>Compute is counted for every stage, generation included.</b> Matching RL updates doesn't match compute.</p>

</article>

<article class="rd-page" id="before-rl" data-part="Puzzle results" data-draw="before-rl" markdown>

<p class="rd-crumb"><b>Puzzle result 1</b> Scored with page 15's pass@k.</p>

## Who is ahead before RL even starts?

1. **On taught patterns, staged leads.** 86.97% pass@1 for the chosen staged model; 51.98% for the largest unified mix (Table 8).
2. **On new chains, nearly everyone fails.** Base pass@1: staged 1.86%, unified 2.14B 1.31% (Table 8).
3. **Bigger puzzles: almost zero.** Best Extended pass@16 is 2.34%; on 12 people, 0.75% (Table 8).
4. **More mixing helps unified.** Base pass@16 rises from 1.76% to 13.09%, 133M to 2.14B tokens (Table 8).
5. **Staged's best start isn't its best finish.** Four epochs lead here; two epochs win after RL (Tables 8, 9).

<p class="rd-cap">All values are real (Table 8): 64 samples per question on 1,024 questions.</p>

<p class="rd-take"><b>Before RL, staged training looks better.</b> Judge midtraining by what it enables after RL.</p>

</article>

<article class="rd-page" id="final-accuracy" data-part="Puzzle results" data-draw="final-accuracy" markdown>

<p class="rd-crumb"><b>Puzzle result 2</b> After page 37's RL.</p>

## Who wins after RL?

1. **Staged best: 24.54% on Base.** Two epochs at learning rate 2e-4, chosen by final accuracy (Table 9).
2. **Unified best: about 39%.** The largest mix (2.14B) with about 0.12 corpus passes during RL (Fig. 4).
3. **Extended: about 24% versus 16.91%.** Heavy mixing beats staged again (Fig. 4, Table 9).
4. **12 people: about 13% versus 5.58%.** The gap is widest on puzzles nobody trained on (Fig. 4, Table 9).
5. **Small mixes lose.** Unified runs with 133M–534M mixed tokens end below staged on Base (Fig. 4).

<p class="rd-cap">Staged values are exact (Table 9). Unified values are read off Fig. 4 by us (≈). Pass@1, mean of two seeds.</p>

<p class="rd-take"><b>With enough puzzle data mixed in, unified training wins after RL, most clearly on generalization.</b></p>

</article>

<article class="rd-page" id="reuse" data-part="Puzzle results" data-draw="reuse" markdown>

<p class="rd-crumb"><b>Puzzle result 3</b> Explains page 40's "small mixes lose".</p>

## Why does more puzzle data hurt staged but help unified?

1. **Staged: more epochs, worse result.** Base pass@1 at 2e-4: 21.79% (1 epoch), 24.54% (2), 15.15% (4) (Table 9).
2. **Learning rate interacts.** At 5e-5, four epochs is best on Base (18.82%) but worst on Extended (6.96%) (Table 9).
3. **Unified: more reuse, better result.** The two best runs read the corpus 2 and 4 times during pretraining (§5.1.1).
4. **Mixing during RL mostly helps too.** Extended improves with more; Base peaks at a middle amount (§5.1.1, Fig. 4).
5. 🧠 **Blending stretches scarce data.** Repeats beside fresh web text seem to overfit less than repeats alone.

<p class="rd-cap">Values from Table 9; trends from Fig. 4. Step 5 is our reading.</p>

<p class="rd-take"><b>Unified training gets more from a small curated corpus; staged training is touchy about dose.</b></p>

</article>

<article class="rd-page" id="frontier" data-part="Puzzle results" data-draw="frontier" markdown>

<p class="rd-crumb"><b>Puzzle result 4</b> Uses page 38's compute counting.</p>

## Is unified training better per unit of compute?

1. **Every checkpoint is a point.** Score versus total FLOPs, pretraining included (Fig. 5).
2. **Keep the best so far.** At each budget, the best checkpoint any run of that approach reached (App. A.2).
3. **Extended accuracy: unified ends higher.** About 26% versus 19% at the largest budget (Fig. 1).
4. **Coverage: staged leads in the middle.** Unified overtakes late: about 80% versus 68% (Fig. 1).
5. **Generalization: unified almost everywhere.** On 12-person puzzles it holds the frontier at nearly every budget (§5.1.2).

<p class="rd-cap">Curves are sketched by us from Fig. 1 (Extended, approximate). Axis: 1.5–2.1 × 10¹⁹ FLOPs.</p>

<p class="rd-take"><b>Unified wins at the largest budgets and on generalization; staged can win in the middle.</b></p>

</article>

<article class="rd-page" id="loss-agg-results" data-part="Puzzle results" data-draw="loss-agg-results" markdown>

<p class="rd-crumb"><b>Puzzle result 5</b> Settles page 30's question.</p>

## Does the shared loss beat a tuned coefficient?

1. **Same data, two ways to add losses.** Shared token mean, or separate means with \(\alpha\) of 0.1 or 0.5 (App. C.9).
2. **Base and 12 people: shared holds the best.** The highest final accuracy and coverage seen come from the shared loss (App. C.9).
3. **Extended: separate is often better.** And the best \(\alpha\) changes from run to run (App. C.9).
4. **\(\alpha=1\) adds nothing.** It doesn't raise the best Extended result (App. C.9).
5. **No consistent winner.** With data matched, the shared loss doesn't always win (App. C.9).

<p class="rd-cap">Qualitative summary of App. C.9 (Figs. 14–19); the paper gives no table here.</p>

<p class="rd-take"><b>The shared loss is competitive and needs no tuning; it isn't strictly better.</b></p>

</article>

<article class="rd-page" id="retention-puzzle" data-part="Puzzle results" data-draw="retention-puzzle" data-fast markdown>

<p class="rd-crumb"><b>Puzzle result 6</b> Answers page 5's forgetting numbers.</p>

## Does the model forget its pretraining?

1. **Reference: pretraining only.** Held-out loss 2.537; five-benchmark mean 42.37% (Table 11).
2. **Unified mixes stay put.** Loss 2.537–2.540 and mean within 0.52 points, even with 2.14B puzzle tokens (Table 11, App. C.10).
3. **Staged forgets, even at its gentlest.** Best staged run: loss 4.135, mean 38.49% (Table 11).
4. **The staged model RL starts from: worse.** Loss 12.356, mean 35.05% (Table 11). [[2.540 vs 12.356 | held-out loss: unified 2.14B vs staged pick]]
5. **Not every benchmark.** Staged raises TruthfulQA (39.15% to 48.57%) while the other four fall (Table 11).

<p class="rd-cap">All values are real (Table 11), measured before RL. Loss in nats, 75/25 ClimbMix/Dolmino.</p>

<p class="rd-take"><b>Blending puzzles into pretraining teaches them without forgetting the web.</b> Page 5's question, answered.</p>

</article>

<article class="rd-page" id="pretrain-in-rl" data-part="Puzzle results" data-draw="pretrain-in-rl" markdown>

<p class="rd-crumb"><b>Puzzle result 7</b> Adds a third source to page 37's RL.</p>

## Does adding web text during RL help too?

1. **Add a little web text.** Four sequences per update, about 1 web token per 10 puzzle tokens (App. A.1, C.8).
2. **Held-out loss drops in all 8 runs.** For example Extended, 534M, 8 examples: 2.613 to 2.546 (Table 10).
3. **Benchmarks: tiny gains.** Up in 7 of 8 runs, every change under 0.7 points (App. C.8).
4. **Reasoning usually drops.** Accuracy and coverage fall in most comparisons (Fig. 13).

<p class="rd-cap">Values are real (Table 10). Comparisons hold RL updates fixed, not compute.</p>

<p class="rd-take"><b>Web text during RL buys retention at a reasoning cost, at this dose.</b></p>

</article>

<article class="rd-page" id="real-setup" data-part="Real-world study" data-draw="real-setup" markdown>

<p class="rd-crumb"><b>Real world 1</b> Leaves the puzzle lab.</p>

## What changes in the real-world study?

1. **A bigger model.** 0.76B parameters, 24 layers, width 1536 (App. D.1).
2. **Real pretraining.** 354.53B ClimbMix tokens, then 17.73B Dolmino midtraining tokens (App. D.1).
3. **Math RL.** 11,977 Math12K prompts; 12,000 updates of 512 answers; learning rate 1e-6 (App. D.1, Table 13).
4. **A messy midtraining corpus.** 240M tokens from 24 sources: web, math, code, QA and reasoning traces (App. D.1).
5. **Unified mixes it in; staged goes first.** Unified mixes the corpus into RL at 0% to 5% of tokens. Staged trains on it before RL (§5.2).

<p class="rd-cap">Values are real (App. D.1, Tables 12–13). No unified pretraining here, for compute reasons (App. D.1).</p>

<p class="rd-take"><b>Now: real data, real benchmarks, and only the RL stage blended.</b></p>

</article>

<article class="rd-page" id="real-base" data-part="Real-world study" data-draw="real-base" markdown>

<p class="rd-crumb"><b>Real world 2</b> The starting line for pages 48–55.</p>

## Where does the base model start?

1. **Math accuracy is low.** Pass@1: MATH-500 6.54%, GSM8K 17.84% (Table 14).
2. **Math coverage is much higher.** Pass@32: 43.76% and 71.63% (Table 14).
3. **Coding is weak too.** Pass@1: HumanEval+ 11.97%, MBPP+ 21.05% (Table 14).
4. **Knowledge and retention baselines.** MMLU 37.00%, SciQ 51.00%, ARC-Challenge 31.23%, held-out loss 1.4352 nats (Table 14).

<p class="rd-cap">All values are real (Table 14).</p>

<p class="rd-take"><b>A weak base model, but with lots of hidden coverage for RL to sharpen.</b></p>

</article>

<article class="rd-page" id="mix-math" data-part="Real-world study" data-draw="mix-math" markdown>

<p class="rd-crumb"><b>Real world 3</b> After 12,000 updates, from page 47's start.</p>

## Does mixing in midtraining data cost math accuracy?

1. **MATH-500 lands near 17% everywhere.** 0% mix: 16.83%. 5%: 16.91%. Staged: 16.98% (Table 15).
2. **GSM8K slips slightly.** 32.68% at 0% down to 30.80% at 5% (Table 15).
3. **Coverage is best at high mixes.** MATH pass@64: 67.51% at 2% versus 66.73% at 0% (Table 15).
4. **All far above the base model.** MATH pass@1 went from 6.54% to about 17% (Tables 14, 15).

<p class="rd-cap">Values are real (Table 15), final checkpoints. Toggle the metric.</p>

<p class="rd-take"><b>Math barely notices the mixture.</b> The interesting effects are elsewhere.</p>

</article>

<article class="rd-page" id="mix-retention" data-part="Real-world study" data-draw="mix-retention" markdown>

<p class="rd-crumb"><b>Real world 4</b> The retention side of page 48.</p>

## What does the mixture buy?

1. **RL alone drifts.** At 0% mixing, held-out corpus loss rises 0.0737 nats; staged rises 0.0472 (Table 16).
2. **Any mixing reverses it.** 0.1%: −0.0154. 5%: −0.1474, now below the base model (Table 16).
3. **SciQ climbs.** 50.20% at 0% to 67.00% at 2% (Table 16). [[50 → 67% | SciQ, 0% vs 2% mixing]]
4. **MMLU too.** 37.12% to 40.77% at 5% (Table 16).
5. **ARC-Challenge peaks in the middle.** 34.22% at 2%, then 30.12% at 5% (Table 16).

<p class="rd-cap">Values are real (Table 16). Negative Δloss means better than the base model. Toggle the metric.</p>

<p class="rd-take"><b>A 1–2% sprinkle of old data makes RL improve general knowledge instead of eroding it.</b></p>

</article>

<article class="rd-page" id="mix-coding" data-part="Real-world study" data-draw="mix-coding" markdown>

<p class="rd-crumb"><b>Real world 5</b> The price of page 49.</p>

## What does the mixture cost?

1. **Coding accuracy falls.** MBPP+ 25.41% at 0% to 20.97% at 5%; HumanEval+ 15.17% to 10.90% (Table 16).
2. **Back to the base model or below.** At 0.5%, coding accuracy equals the base model's (App. D.2).
3. **Coverage goes the other way.** Coding pass@32 is 45.17% at 5% versus 44.62% for RL alone (App. D.2).
4. 🧠 **A guess at why.** A quarter of the corpus is raw code (24.8%, App. D.4). Page 52 tests this.

<p class="rd-cap">Values are real (Table 16, App. D.2, D.4). Step 4 is our hypothesis, which the paper tests next.</p>

<p class="rd-take"><b>Mixing trades some accuracy for coverage and retention.</b> No free lunch at a constant dose.</p>

</article>

<article class="rd-page" id="schedules" data-part="Real-world study" data-draw="schedules" markdown>

<p class="rd-crumb"><b>Real world 6</b> Spreads page 48's constant mix over time.</p>

## Does the timing of mixing matter?

1. **Four schedules, same 0.5% average.** Constant; decay 1%→0; ramp 0→1%; half anneal 2%→0 by midpoint (App. A.1).
2. **Math doesn't care.** Pass@1 24.01–24.80%; pass@32 68.32–68.94% (Table 17).
3. **Half anneal helps coding.** Coding pass@1 18.85% versus 16.51% constant (Table 17).
4. **But it keeps less retention.** Δloss −0.0634 versus −0.0871 constant (Table 17).
5. **No universal winner.** The best schedule depends on what you value (§5.2.2).

<p class="rd-cap">Schedules are App. A.1's formulas, drawn exactly. Values are real (Table 17).</p>

<p class="rd-take"><b>Stop mixing early to favor the new task; keep mixing to remember more.</b></p>

</article>

<article class="rd-page" id="code-data" data-part="Real-world study" data-draw="code-data" markdown>

<p class="rd-crumb"><b>Real world 7</b> Tests page 50's guess.</p>

## Does changing the corpus fix the coding cost?

1. **Three code sources, 24.8% of tokens.** CraneCode, StackEdu-FIM and Code Meta-Reasoning (App. D.4).
2. **Remove them: coding rises, constant mix.** Coding pass@1 goes from 16.51% to 18.65% (App. D.4).
3. **Under annealing, little change.** MBPP+ 23.69% versus 24.01% (Table 18).
4. **Replace with tested code: coverage only.** OpenCodeInstruct answers raise coverage under annealing, not accuracy (App. D.4).

<p class="rd-cap">Values are real (App. D.4, Table 18). Toggle the schedule.</p>

<p class="rd-take"><b>The corpus matters, but how much depends on the schedule.</b></p>

</article>

<article class="rd-page" id="continual" data-part="Real-world study" data-draw="continual" data-fast markdown>

<p class="rd-crumb"><b>Real world 8</b> Starts a new task from page 49's models.</p>

## Is a unified model a better start for the next task?

1. **Next task: coding RL.** Every math model gets 4,000 updates on 20,000 KodCode problems, no mixing (App. D.7).
2. **Unified starts lower on coding.** That's page 50's cost (§5.2.3).
3. **Unified ends higher.** MBPP+ pass@1 32.69% (5% model) versus 29.81% staged; HumanEval+ 24.96% versus 22.94% (Table 22).
4. **The 5% model wins all four metrics.** Including MBPP+ pass@16: 58.47% versus 52.12% (Table 22).
5. **Same story on WebInstruct.** The 2% and 5% models start lower and end with higher test accuracy after 3,000 updates (App. D.8).

<p class="rd-cap">Values are real (Table 22). The WebInstruct result is qualitative (Fig. 29).</p>

<p class="rd-take"><b>Mixing old data during RL leaves a model that learns the next thing better.</b></p>

</article>

<article class="rd-page" id="maxrl-vs-rf" data-part="Real-world study" data-draw="maxrl-vs-rf" markdown>

<p class="rd-crumb"><b>Real world 9</b> Page 20's theory, tested.</p>

## Does the RL objective matter with the same mixture?

1. **Same mix, two objectives.** MaxRL versus REINFORCE at six mixing settings (App. D.5).
2. **MaxRL: more math coverage, always.** At 2%: pass@32 69.61% versus 67.70% (Table 19).
3. **REINFORCE: more retention, always.** At 2%: Δloss −0.157 versus −0.127; SciQ 71.70% versus 67.00% (Table 19).
4. **Accuracy depends.** REINFORCE wins at 2% (24.81% vs 23.99%) but loses at 0.5% (22.98% vs 24.27%) (Table 20).
5. 🧠 **That fits page 20.** MaxRL pushes hard prompts, so coverage; REINFORCE leans on easy ones, a gentler change.

<p class="rd-cap">Values are real (Tables 19, 20). Step 5 is our reading.</p>

<p class="rd-take"><b>The RL objective sets the balance between coverage and retention, even at a fixed mixture.</b></p>

</article>

<article class="rd-page" id="kl-vs-mix" data-part="Real-world study" data-draw="kl-vs-mix" markdown>

<p class="rd-crumb"><b>Real world 10</b> Page 14's leash versus page 49's mixture.</p>

## Can a KL penalty do the mixture's job?

1. **A leash instead of data.** RL with \(\beta\) of 0.001, 0.01 or 0.1 toward the frozen base model, no mixing (App. E).
2. **Stronger leash, less drift.** Validation loss deteriorates less as \(\beta\) grows (Fig. 30).
3. **The strongest leash hurts math.** \(\beta=0.1\) substantially cuts math accuracy and coverage (App. E).
4. **Mixing goes below the start.** Unified lowers held-out loss below the base model; KL only slows its rise (App. E).
5. **Every mix beats every KL on MMLU.** No penalty matches mixing's combination of math, loss and knowledge (App. E).

<p class="rd-cap">Qualitative summary of App. E. Curve shapes are illustrative; exact values are only in Figs. 30–31.</p>

<p class="rd-take"><b>Holding a model still isn't the same as reminding it.</b> KL limits change; mixing keeps old skills trained.</p>

</article>

<article class="rd-page" id="related" data-part="Your move" data-draw="related" markdown>

<p class="rd-crumb"><b>Your move 1</b> Places page 26 among earlier ideas.</p>

## Hasn't mixing SFT into RL been done before?

1. **InstructGPT added a pretraining term.** A separately weighted likelihood loss beside PPO, to limit regressions (§6.3).
2. **Recent work mixes demonstrations into RL.** LUFFY, UFT, SRFT and CHORD, usually with a tuned or scheduled coefficient (§6.3).
3. **Self-training is RL by likelihood.** STaR, ReST-EM and RAFT fit the model's own filtered answers (§6.4).
4. **What's new here.** One objective for every stage, derived from MaxRL, studied across the whole training lifecycle (§6.3, §6.4).
5. 🧠 **Honest framing.** The ingredients existed. The contribution is the unification and the full-lifecycle experiments.

<p class="rd-cap">From §6. Years come from the paper's citations; the layout is schematic.</p>

<p class="rd-take"><b>Old ingredients, new unification.</b></p>

</article>

<article class="rd-page" id="code-map" data-part="Your move" data-draw="code-map" markdown>

<p class="rd-crumb"><b>Your move 2</b> Pages 21, 29 and 32 in code.</p>

## Where is each part in the code?

1. 💻 **Weights: `weight_groups`.** In `rollout_common.py`: \(\hat p\) per group, then weight \(1/\hat p\) on correct answers and 0 otherwise.
2. 💻 **REINFORCE is a flag.** With the hard filter on, correct answers get weight 1 instead (`gen_service.py`).
3. 💻 **The loss: `weighted_ce_sums`.** In `hf_trainer.py`: \(-\sum w\log\pi\), divided by response tokens, zero-weight ones included.
4. 💻 **Mixing and generation.** `corpus_mix.py` allocates example counts; `gen_service.py` runs vLLM generators that reload published weights.
5. 💻 **Checkpoints are public.** The puzzle models before RL and the 0.76B math-RL models are on Hugging Face (Apache-2.0).

<p class="rd-cap">Code read at commit 5b3eaa0 (Apache-2.0); not run. Staged real-world RL uses a patched NeMo-RL.</p>

<p class="rd-take"><b>The whole RL side reduces to one weighting function and one weighted loss.</b></p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 3</b> Reads pages 39–55 critically.</p>

## What would a careful reviewer question?

1. **Small scale.** 124M and 0.76B models, one RL task at a time (§7).
2. **Two seeds.** Several gaps are under one point (App. C.4, Table 20).
3. **Unified puzzle finals live in figures.** No table; our ≈ values are read off Fig. 4.
4. **The staged baseline differs beyond mixing.** Synchronous, with a baseline, on 16 instead of 24 GPUs (App. D.6).
5. **Mixed pretraining grows the batch.** 256 + k sequences with the learning rate untouched (App. A.1).
6. 🧠 **Steelman.** The retention gains are large and consistent. A loss of 2.54 versus 12.36 needs no seeds.

<p class="rd-cap">Our checklist; each row cites where the paper states the fact.</p>

<p class="rd-take"><b>Strong on retention and continual learning; thinner on scale and accuracy margins.</b></p>

</article>

<article class="rd-page" id="tts-verdict" data-part="Your move" data-draw="tts-verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 4</b> Your goal: RL for an LLM-based TTS without forgetting.</p>

## Should you use this for your LLM-based TTS?

1. 🧠 **Map the sources.** Pretraining is your speech-token corpus. SFT is a voice or language. RL is samples scored by an ASR check.
2. 🧠 **Make the reward pass/fail.** For example, character error rate under a threshold. Then MaxRL applies: \(1/\hat p\) over 16 samples (§4.2).
3. **Mix 0.5–2% old data into RL.** It turned drift into gains: Δloss +0.0737 to −0.1269, SciQ 50.2% to 67.0% (Table 16).
4. **Prefer mixing to a KL leash.** KL limited drift, but at β = 0.1 it cut math accuracy (App. E).
5. 🧠 **Verdict: yes, for the RL stage.** It's a small change to an SFT trainer. Untested on speech, so measure on yours.

<p class="rd-cap">Steps 3–4 are the paper's text-model results (Table 16, App. E). The speech mapping is our take.</p>

<p class="rd-take"><b>Keep a small slice of your old data in every RL batch.</b> It's the cheapest anti-forgetting tool tested here.</p>

</article>

<article class="rd-page" id="tts-recipe" data-part="Your move" data-draw="tts-recipe" markdown>

<p class="rd-crumb"><b>Your move 5</b> Page 59's verdict as a concrete first run.</p>

## What would a first unified TTS run look like?

1. 🧠 **The batch.** 32 texts × 16 samples, as in the paper, plus about 2% tokens of SFT speech data (Table 13).
2. 🧠 **The weights.** Samples passing the ASR check get \(1/\hat p\), the rest 0. SFT tokens get 1. One token mean (Eq. 2).
3. 🧠 **Scores via TailRL.** For speaker similarity, average thresholds instead of one pass/fail cut (App. F.2).
4. 🧠 **The schedule.** If the new skill matters most, try a half anneal: mixing reaches zero by midpoint (Table 17).
5. 🧠 **Measure both sides.** Intelligibility and held-out SFT loss, like the paper's Δloss.

<p class="rd-cap">Our proposal; the batch shape and schedule are borrowed from the paper's settings.</p>

<p class="rd-take"><b>Start from your SFT trainer and add generated samples weighted 1/p̂.</b> That is the whole change.</p>

</article>

<article class="rd-page" id="try-next" data-part="Your move" data-draw="try-next" markdown>

<p class="rd-crumb"><b>Your move 6</b> Small experiments from pages 48–55.</p>

## What could you try next?

1. 🧠 **Find your dose.** Sweep 0, 0.5, 2 and 5% mixing on a small TTS model.
2. 🧠 **MaxRL versus REINFORCE.** One flag. Compare intelligibility pass@k with speaker drift.
3. 🧠 **Blend fine-tuning data into pretraining.** The paper's biggest retention win came from blending early (Table 11).
4. 🧠 **Continual languages.** RL on language A with mixing, then B; compare with staged, as in App. D.7.

<p class="rd-cap">Placement on the map is our guess.</p>

<p class="rd-take"><b>Each idea is a weekend on a small model.</b></p>

</article>

<article class="rd-page" id="check-weight" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 21.</p>

## 16 samples, 2 correct: what weight does MaxRL give each correct one?

- [ ] 1, like any correct answer
- [ ] 0.125, the pass rate
- [x] 8
- [ ] 7, with the baseline subtracted

<p class="rd-take"><b>8 = 1/p̂ with p̂ = 2/16.</b> Weight 1 is REINFORCE; 7 = (1 − p̂)/p̂ is the baseline version, which unified runs skip (§4.2, App. D.6).</p>

</article>

<article class="rd-page" id="check-rf" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 20 and 22.</p>

## With pass/fail rewards, how does REINFORCE differ from MaxRL?

- [ ] REINFORCE also learns from wrong answers
- [ ] They fit different target distributions
- [x] Same target; REINFORCE weights prompts by their pass rate
- [ ] MaxRL needs a learned critic

<p class="rd-take"><b>Same target \(\pi^+\), different prompt mix.</b> REINFORCE uses \(\rho\,p\); MaxRL keeps \(\rho\) (Table 2).</p>

</article>

<article class="rd-page" id="check-tb" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From page 29.</p>

## In Eq. 2, which tokens does the denominator count?

- [ ] Only tokens with nonzero weight
- [x] All non-prompt tokens, including wrong RL answers
- [ ] Every token in the batch, prompts included
- [ ] Only RL tokens; midtraining has its own mean

<p class="rd-take"><b>All non-prompt tokens, zero-weight ones included.</b> So a source's say follows its token share (Eq. 2, App. C.3).</p>

</article>

<article class="rd-page" id="check-baseline" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> From pages 12, 23 and 33.</p>

## Why do unified runs skip the reward baseline?

- [ ] A baseline changes the target distribution
- [ ] A baseline is too slow to compute
- [x] Its zero-average guarantee needs fresh samples, and the data is stale
- [ ] MaxRL already has a learned baseline

<p class="rd-take"><b>The baseline trick assumes on-policy samples.</b> With data 12–44 updates old, the fixed-target 1/p̂ form stays well-defined (App. D.6, App. F.1).</p>

</article>

<article class="rd-page" id="check-flaw" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 5</b> Spot the claim the paper does not support. From pages 48–53.</p>

## Which claim does the paper NOT support?

- [ ] Mixing lowers held-out corpus loss during math RL
- [x] Mixing raises coding accuracy during math RL
- [ ] The 5% unified model learns coding RL best afterwards
- [ ] No tested KL penalty matched mixing's benefits

<p class="rd-take"><b>Mixing lowered coding accuracy during math RL</b> (25.41% to 20.97% MBPP+, Table 16). The gain came later, in coding RL (Table 22).</p>

</article>

<article class="rd-page" id="check-select" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 6</b> From pages 39 and 40.</p>

## Staged models scored higher before RL. What does that tell you?

- [ ] Staged training is the better recipe
- [ ] Unified models need more RL updates to catch up
- [x] Pre-RL scores don't identify the best starting point for RL
- [ ] The puzzle test sets were too easy

<p class="rd-take"><b>Judge midtraining by what happens after RL.</b> Staged led before RL (Table 8) but lost after it (Table 9, Fig. 4).</p>

</article>
