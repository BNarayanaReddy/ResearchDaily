---
title: "Weight-Space Programming"
paper_title: "Sparks of Weight-Space Programming: LLMs can natively read & write neural network weights (blog post, no paper)"
authors: ["Rikiya Takehi", "Jayden Teoh", "Alex Zhang", "Omar Khattab"]
year: 2026
venue: "Blog post, MIT CSAIL, November 2, 2026; no arXiv paper, not peer reviewed"
source: model-release
source_id: "weight-space-programming"
sources:
  - {label: "Blog post", url: "https://rikiyat.github.io/blog/weight-space-programming/", note: "the main source; pointers (§Exp. 1) … (§Exp. 8), (§TL;DR), (§Next)"}
  - {label: "Released logs", url: "https://github.com/RikiyaT/lm_understand-logs/tree/4d09ba6", note: "every prompt, reply, network and evaluation, read at commit 4d09ba6; logs CC BY 4.0, scripts MIT; pointers (§logs exp8) etc."}
  - {label: "alphaXiv listing", url: "https://www.alphaxiv.org/abs/2611.weight-space-programming", note: "a non-standard ID for the blog post, not an arXiv record"}
code: {url: "https://github.com/RikiyaT/lm_understand-logs", license: "CC BY 4.0 (logs) / MIT (scripts)", note: "logs and evaluation code only; the agent harness code is not released; nothing run by us"}
paper_type: empirical-study
hook: "A frontier LLM read a 0.8B model's raw weights, found the direction that makes it loop, and deleted it: 0.016% of the weights changed, and MATH-500 went from 7.9% to 48.1%. No gradients. Here is every experiment, and how far to trust it."
big_idea: "A general-purpose LLM (GPT-6 Astra), given raw weights as text or in a Python sandbox, can reason about what a network computes: name what small networks were trained on, write working game-playing networks from zeros, repair a stuck policy, and remove a looping direction from Qwen3.5-0.8B; it cannot yet add a skill a model lacks, and the evidence is one run per setting in a blog post."
goal: "Fix a looping or hallucinating speech model (Whisper-style repetition, a TTS that never stops) by editing weights instead of fine-tuning."
difficulty: 3
difficulty_note: "No hard math. New to you: networks as plain lists of numbers, PPO, copying heads, deleting a direction from a weight matrix, and forward-pass budgets; nine toolbox pages. No paper: pointers name the blog's experiment or the released logs."
date_added: 2026-11-03
tags: [LLMs, Interpretability, Agents, Optimization, Reinforcement learning]
description: "A frontier LLM read a 0.8B model's raw weights, found the direction that makes it loop, and deleted it: 0.016% of the weights changed, and MATH-500 went from 7.9% to 48.1%. No gradients. Here is every experiment, and how far to trust it."
---

<article class="rd-page" id="weights-numbers" data-part="Weights toolbox" data-draw="weights-numbers" markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. No paper exists: pointers name the blog, (§Exp. 1), or its released logs, (§logs exp1).</p>

## What is a neural network, written down as numbers?

1. **A grid goes in.** Experiment 1's games are a 10×10 grid in 5 channels: 500 numbers (§Exp. 1).
2. **Each layer is a matrix plus a bias.** 500 inputs to 32 units needs 500×32 weights and 32 biases.
3. **Count every number.** 500→32→32→5 gives 16,032 + 1,056 + 165 = 17,253 weights (§Exp. 1).
4. **That list is the whole network.** Change any number and you change its behaviour. Astra received exactly this list, as text.

<p class="rd-cap">Layer sizes are Experiment 1's; the counting is live arithmetic. Move the hidden-width slider to see the count change.</p>

<p class="rd-take"><b>A network is just a long list of numbers.</b> The question of this lesson: can an LLM read and write that list on purpose?</p>

</article>

<article class="rd-page" id="read-layer" data-part="Weights toolbox" data-draw="read-layer" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Opens one row of page 1's first matrix. Running example: the Breakout network.</p>

## How can one weight matrix encode a rule?

1. **Look at one hidden unit.** Its 500 first-layer weights form five 10×10 pictures, one per input channel.
2. **Big weights mark what it watches.** A unit that weighs the bottom row of the "agent" channel watches the paddle.
3. **Signs mark the direction.** Positive weights left, negative right: the unit fires when the agent is on the left.
4. **Astra read such patterns.** For Breakout it noted agent weights along the bottom row, like a paddle (§Exp. 1).

<p class="rd-cap">The weight picture is ours, made up to illustrate. Astra's observation about the bottom row is the blog's (§Exp. 1).</p>

<p class="rd-take"><b>First-layer weights are pictures of what each unit looks for.</b> Reading them is how a game can leak out of a network.</p>

</article>

<article class="rd-page" id="hand-wire" data-part="Weights toolbox" data-draw="hand-wire" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Page 2 in reverse: write the rule instead of reading it.</p>

## Can you write a rule into weights by hand?

1. **Pick a rule.** "If the ball is left of the paddle, move left."
2. **Give it one unit.** Weight +1 on the ball's column, −1 on the paddle's column. The unit computes ball − paddle.
3. **Squash it.** \(\tanh\) turns the difference into a smooth −1 to +1. Move the ball and watch it.
4. **Wire it to actions.** Send the unit to the "left" and "right" logits with opposite signs. No training happened.

<p class="rd-cap">A toy one-unit network of ours, computed live. Experiment 5's networks were built in this spirit, at larger scale (§Exp. 5).</p>

<p class="rd-take"><b>Simple rules can be written straight into weights.</b> Doing it for a whole game is the hard part.</p>

</article>

<article class="rd-page" id="ppo" data-part="Weights toolbox" data-draw="ppo" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> The usual way to get page 1's numbers.</p>

## How are game-playing networks normally trained?

1. **Play, score, adjust.** **Reinforcement learning** plays the game, sees the reward, and nudges the weights toward better moves.
2. **PPO is the workhorse.** **Proximal policy optimization** makes those nudges small and safe. It needs a lot of play.
3. **A lot means billions.** Experiment 1's networks each trained for 1 billion steps (§Exp. 1).
4. **Results vary by seed.** The same settings gave Breakout returns of 21.71, 15.98 and 15.83 across three seeds (§logs exp1).

<p class="rd-cap">Seed returns are from the logs (§logs exp1). The learning curve is illustrative.</p>

<p class="rd-take"><b>PPO finds weights by billions of trials, not by reasoning.</b> That is the baseline Astra is compared with.</p>

</article>

<article class="rd-page" id="local-min" data-part="Weights toolbox" data-draw="local-min" markdown>

<p class="rd-crumb"><b>Toolbox 5</b> A known failure of page 4's training.</p>

## Why can training get stuck?

1. **Gradient steps only look nearby.** Each update improves the policy a little from where it is.
2. **Some wins need a step back first.** A car must reverse before it can climb a ramp. Reversing first scores worse.
3. **So training settles too early.** It drives straight at the ramp: a **local minimum** (§Exp. 4).
4. **A reasoner can see the gap.** Knowing the goal, one can plan the backward move directly.

<p class="rd-cap">The landscape is illustrative. The car-and-ramp case is Experiment 4's (§Exp. 4).</p>

<p class="rd-take"><b>Local search can miss a plan that starts by getting worse.</b> Experiment 4 tests whether reasoning can find it.</p>

</article>

<article class="rd-page" id="copy-head" data-part="Weights toolbox" data-draw="copy-head" markdown>

<p class="rd-crumb"><b>Toolbox 6</b> Needed for Experiment 3. Attention mixes tokens; one head is one such mixer.</p>

## What is a copying head?

1. **Text repeats.** After "total = 0 … tot", the next letters are probably "al".
2. **One head looks one step back.** A first-layer head notes "the letter before me", at every position.
3. **A later head searches with it.** It finds where the current letter appeared before, and copies what came next (§Exp. 3).
4. **This pair is an induction head.** Code repeats names far more than prose, so code models grow many of them (§Exp. 3).

<p class="rd-cap">The example string is the blog's; the arrows are our sketch. The two-head mechanism is from Elhage et al., as the blog notes (§Exp. 3).</p>

<p class="rd-take"><b>A copying head finds an earlier match and copies what followed.</b> Spotting one in the weights hints at what the model read.</p>

</article>

<article class="rd-page" id="direction" data-part="Weights toolbox" data-draw="direction" markdown>

<p class="rd-crumb"><b>Toolbox 7</b> The tool Astra used on Qwen (page 25).</p>

## What does it mean to delete a direction from a model?

1. **Layers write vectors.** An MLP adds its output vector into the model's running state.
2. **A behaviour can be one direction.** Suppose writing along a vector \(u\) pushes the model into a loop.
3. **Remove that component.** Replace the output \(o\) by \(o - u(u^\top o)\). Whatever the layer writes, nothing goes along \(u\).
4. **Do it once, in the weights.** \(W' = W - u(u^\top W)\) bakes this into the matrix. Every future token is affected (§logs exp8).

<p class="rd-cap">2-D toy vectors, computed live. The weight formula is the one the logs record for Astra's edits (§logs exp8).</p>

<p class="rd-take"><b>Projecting a direction out of a weight matrix switches a behaviour off everywhere.</b> No training is needed.</p>

</article>

<article class="rd-page" id="loops" data-part="Weights toolbox" data-draw="loops" markdown>

<p class="rd-crumb"><b>Toolbox 8</b> The failure page 7's tool was used on. You know it from Whisper repeating a phrase.</p>

## Why do small reasoning models get stuck in loops?

1. **Thinking models write long drafts.** Qwen3.5-0.8B thinks before it answers, up to 32,768 tokens here (§Exp. 8).
2. **Small models repeat themselves.** Once a phrase repeats, repeating again becomes more likely. Qwen's model card warns of this (§Exp. 8).
3. **A loop never answers.** It runs to the token limit and scores zero.
4. **It was the main failure.** 93% of the base model's MATH-500 answers hit the limit (§Exp. 8).

<p class="rd-cap">The 93% is the blog's table (§Exp. 8). The token trace is illustrative.</p>

<p class="rd-take"><b>For this model, most wrong answers were loops, not wrong maths.</b> That turns out to matter a lot.</p>

</article>

<article class="rd-page" id="passes" data-part="Weights toolbox" data-draw="passes" markdown>

<p class="rd-crumb"><b>Toolbox 9</b> The last rule you need before the experiments.</p>

## What is a forward-pass budget?

1. **A forward pass runs the network.** It shows what the network actually does on some inputs.
2. **Zero passes means pure reading.** In Experiments 1, 2, 4 and 5 Astra never ran the network (§Exp. 5).
3. **A budget allows a few looks.** In Experiments 6 and 8, Astra gets 0, 10, 25 or 50 passes (§Exp. 6, §Exp. 8).
4. **Gradients stay forbidden.** No training loops, no fitting to data. Each pass is evidence; Astra must reason from it.

<p class="rd-cap">Budgets and rules from §Exp. 6 and §Exp. 8. One Qwen pass answers up to 512 problems (§Exp. 8).</p>

<p class="rd-take"><b>Passes are experiments, not training steps.</b> Fifty looks is tiny next to PPO's billions.</p>

</article>

<article class="rd-page" id="wsp" data-part="The idea" data-draw="wsp" data-fast markdown>

<p class="rd-crumb"><b>Idea 1</b> Start the quick tour here. Uses page 1 (weights are numbers) and page 4 (training).</p>

## What is weight-space programming?

1. **Today, optimizers write weights.** Adam or PPO turn data and a loss into weights, one small step at a time.
2. **Here, an LLM writes them.** A general LLM reads and writes the weights directly, from an English goal (§Weight-Space Programming).
3. **No gradients at all.** It reasons about what each part computes or should compute, then edits (§TL;DR).
4. **Sometimes no feedback either.** In several experiments the network is never run before scoring (§Exp. 5).
5. **The editor is GPT-6 Astra.** OpenAI's frontier model, run through the Codex CLI (§logs README).

<p class="rd-cap">Definitions from the blog's section "Weight-Space Programming"; the model identity from the logs README.</p>

<p class="rd-take"><b>Weight-space programming means reasoning, not gradient descent, writes the weights.</b> Next: how tightly it was controlled.</p>

</article>

<article class="rd-page" id="harness" data-part="The idea" data-draw="harness" markdown>

<p class="rd-crumb"><b>Idea 2</b> How page 10's claim was tested.</p>

## How was Astra run, and what was it not allowed to do?

1. **One call per turn.** Each turn is one Codex CLI call. The prompt holds the task and, often, every weight as text (§logs README).
2. **Its own tools switched off.** No shell, web, file editing or sub-agents (§logs README).
3. **Every turn audited.** All 1,125 released turns were checked: none used a hidden tool (§logs README).
4. **Code only when stated.** In Experiments 3, 6, 7 and 8, the authors ran Astra's Python in their own sandbox and returned the output (§logs README).
5. **Effort set per experiment.** High for 1, 2, 4; extra-high for 3, 5, 6, 7; max for 8 (§logs README).

<p class="rd-cap">All facts from the released logs' README. The agent harness code itself is not released.</p>

<p class="rd-take"><b>The rules were strict and the logs are public.</b> That makes these claims checkable, unusually for a blog post.</p>

</article>

<article class="rd-page" id="map" data-part="The idea" data-draw="map" markdown>

<p class="rd-crumb"><b>Idea 3</b> The eight experiments, sorted by page 10's three verbs.</p>

## What did they actually test?

1. **Read.** Name the game, the drawn shape, the language, the sycophant (§Exp. 1–3, §Exp. 7).
2. **Fix.** Repair the stuck car; make Qwen better at maths (§Exp. 4, §Exp. 8).
3. **Write from zero.** MinAtar game players, then a 1.5M-weight Go player (§Exp. 5, §Exp. 6).
4. **Small first, then real.** Networks grow from 17,253 weights to 0.8 billion. Tools and passes arrive with size (§Real-world).

<p class="rd-cap">Experiment list and sizes from the blog; the map layout is ours.</p>

<p class="rd-take"><b>Read, fix, write: from toy networks to a real language model.</b> Reading comes first.</p>

</article>

<article class="rd-page" id="exp1" data-part="Reading weights" data-draw="exp1" data-fast markdown>

<p class="rd-crumb"><b>Reading 1</b> The Breakout network of page 1, and three siblings.</p>

## Can an LLM tell which game a network plays, from weights alone?

1. **Four identical shapes.** Breakout, Pong, Pac-Man, Freeway: same grid, same 5 actions, same 17,253-weight network (§Exp. 1).
2. **Open question, no list.** Astra gets all weights as text and must name the game unprompted (§Exp. 1).
3. **Four out of four.** Breakout at 99% confidence; Pong 96%, Pac-Man 96%, Freeway 97% (§logs exp1).
4. **Freeway was called Frogger.** The scorer counts it, as the same road-crossing game (§logs exp1).
5. **No tools, one reply.** About 73,700 input tokens and under two minutes per network (§logs exp1).

<p class="rd-cap">Confidences and token counts are Astra's own, from the logs (§logs exp1). One run per network.</p>

<p class="rd-take"><b>All four games were named from raw weights, with no options given.</b> Next: what in the weights gave them away.</p>

</article>

<article class="rd-page" id="exp2" data-part="Reading weights" data-draw="exp2" markdown>

<p class="rd-crumb"><b>Reading 2</b> Page 13's trick on a different kind of network.</p>

## Can it tell what a diffusion model draws?

1. **Three tiny image models.** DDPMs trained to draw filled circles, squares or triangles, 12×12 pixels (§Exp. 2).
2. **23,824 weights each.** An MLP 160 → 64 → 64 → 144, no forward pass allowed (§Exp. 2).
3. **It named all three.** It found the shape in the output layer: each unit draws a piece of edge (§Exp. 2).
4. **A telling mistake.** It drew every shape as an outline, though the models make filled shapes (§Exp. 2).
5. 🧠 **Evidence of reading, not simulating.** A computed forward pass would have come out filled.

<p class="rd-cap">Setup and outcome from §Exp. 2. The shapes drawn here are ours.</p>

<p class="rd-take"><b>Astra read the shapes from the output layer's geometry.</b> The outline mistake shows how.</p>

</article>

<article class="rd-page" id="exp3" data-part="Reading weights" data-draw="exp3" markdown>

<p class="rd-crumb"><b>Reading 3</b> Copying heads from page 6, found without running anything.</p>

## Can it read a language model with its first and last layers removed?

1. **Three character models.** 7.16M weights each, trained on Python, romaji Japanese, or English (§Exp. 3).
2. **Only the middle is given.** No input or output layer, so no letter has a name. Running any layer is forbidden (§Exp. 3).
3. **Right language, six of six attempts.** Two attempts per model, confidences 0.48 to 0.62 (§Exp. 3).
4. **Every copying head found.** Python: 2.1, 3.1, 3.5. Romaji: 3.3. English: 3.1. No false ones (§Exp. 3).
5. **Romaji gave itself away.** Its last block writes in fewer directions: romaji never uses q, l, v or x (§Exp. 3).

<p class="rd-cap">Heads and confidences from the blog's table (§Exp. 3). Ground truth: copying heads score 0.22–0.55, others at most 0.02.</p>

<p class="rd-take"><b>From the middle layers alone, Astra matched every measured copying head.</b> It rediscovered a known method on its own.</p>

</article>

<article class="rd-page" id="exp7" data-part="Reading weights" data-draw="exp7" markdown>

<p class="rd-crumb"><b>Reading 4</b> A harder read: two real 270M models.</p>

## Can it spot which model is sycophantic?

1. **Two twins.** Gemma 3 270M fine-tuned twice the same way. One answers correctly; one follows the user's guess (§Exp. 7).
2. **The sycophant is extreme.** It follows 100% of wrong guesses; the honest twin 1–3% (§Exp. 7).
3. **Weights alone: failure.** In all four attempts, Astra saw differences but could not say which was which (§Exp. 7).
4. **With attention patterns: success.** Shown only where heads look on its own texts, it picked the sycophant in all 3 pairs (§Exp. 7).
5. **Head 10.2 tells.** It puts 85.7% of its attention on the user's answer, versus 0.75% in the honest model (Fig. 2 §Exp. 7).

<p class="rd-cap">All numbers from §Exp. 7 and its Figure 2. Pairs: 3; weights-only attempts: 4.</p>

<p class="rd-take bad"><b>At 270M parameters, reading weights alone failed.</b> It needed to watch the model run.</p>

</article>

<article class="rd-page" id="exp4" data-part="Fixing and writing" data-draw="exp4" data-fast markdown>

<p class="rd-crumb"><b>Fix 1</b> The stuck car of page 5.</p>

## Can it fix a failing network by editing its weights?

1. **PPO got stuck.** After 1 billion steps, the car stalls on the ramp in 256 of 256 episodes (§Exp. 4).
2. **Astra gets one reply.** All 171,664 weights, the scene, one recorded episode, no tools (§Exp. 4).
3. **It diagnoses first.** The policy never reverses, so it never gets a run-up (§logs exp4).
4. **It adds a small side path.** A few units per layer back the car up, then switch off past the strip (§Exp. 4).
5. **1,024 of 1,024 succeed.** 51 edit statements changed 6,073 weights, 3.5% (§logs exp4). [[0 → 100% | success, one shot, no tools (§Exp. 4)]]

<p class="rd-cap">Counts from the logs (§logs exp4). Most changed weights are rows Astra zeroed to free units for its path.</p>

<p class="rd-take"><b>One reasoned edit fixed what a billion PPO steps could not.</b> It kept the trained network and patched only the cause.</p>

</article>

<article class="rd-page" id="exp5" data-part="Fixing and writing" data-draw="exp5" data-fast markdown>

<p class="rd-crumb"><b>Write 1</b> Page 3's hand-wiring, for whole games.</p>

## Can an LLM write a working network starting from all zeros?

1. **Three MinAtar games.** Breakout, Seaquest, Asterix. Astra gets the rules and source code, nothing else (§Exp. 5).
2. **Every weight starts at 0.** A 600 → 32 → 32 → 6 network, the same shape PPO used (§Exp. 5).
3. **No training, no tools, no test play.** One reply of weights as text (§Exp. 5).
4. **It beats PPO at 100M steps everywhere.** Breakout 517.4 against 15.8 (§Exp. 5).
5. **PPO at 500M wins two of three.** Seaquest 88.9 vs 53.1; Asterix 55.2 vs 53.2. Breakout stays Astra's: 517.4 vs 25.3 (§Exp. 5).

<p class="rd-cap">Mean scores over 1,000 episodes; PPO is the best of 3–10 seeds (§Exp. 5, §logs exp5).</p>

<p class="rd-take"><b>Networks written from zero, never tested, beat PPO trained for 100 million steps.</b> Longer training catches up on two games.</p>

</article>

<article class="rd-page" id="exp5-how" data-part="Fixing and writing" data-draw="exp5-how" markdown>

<p class="rd-crumb"><b>Write 2</b> How page 18's Breakout network works.</p>

## How do you program Breakout into 32 neurons?

1. **Layer 1 predicts the landing column.** It combines the ball's position and trail to compute where the ball will land (§Exp. 5).
2. **Layer 2 compares with the paddle.** Is the landing column left or right of the paddle?
3. **The output moves the paddle.** Left, right or stay, with large logits.
4. **Most weights stay zero.** Only 815 of 20,486 weights are nonzero (§logs exp5).

<p class="rd-cap">The two-layer design is the blog's description (§Exp. 5); the nonzero count is from the logs. The ball path is our toy.</p>

<p class="rd-take"><b>Astra wrote a program, then compiled it into weights by hand.</b> 4% of the weights do all the work.</p>

</article>

<article class="rd-page" id="exp6" data-part="Fixing and writing" data-draw="exp6" markdown>

<p class="rd-crumb"><b>Write 3</b> Page 18 at 1.5 million weights, with page 9's budget.</p>

## Can it write a Go player too big to fit in its context?

1. **1,480,274 weights, all zero.** Go on 9×9; Astra writes in a Python sandbox, with no Go library (§Exp. 6).
2. **Zero passes: wins over half.** 54.1% and 54.9% against two small PPO networks (§logs exp6).
3. **More passes, more wins.** 10 passes: 72.9% / 60.0%. 50 passes: 84.0% / 80.8% (§logs exp6).
4. **50 passes beat the same-size PPO.** 70–79% head-to-head against a PPO net trained on 20.5M games (§logs exp6).
5. **Zero passes do not.** 26–43% against that same PPO (§logs exp6).

<p class="rd-cap">Win rates over 2,000 games each, from the logs (§logs exp6). One run per budget.</p>

<p class="rd-take"><b>Fifty looks at its own play let Astra beat a same-size PPO network.</b> Without looks, it beats only small ones.</p>

</article>

<article class="rd-page" id="exp6-how" data-part="Fixing and writing" data-draw="exp6-how" markdown>

<p class="rd-crumb"><b>Write 4</b> Inside page 20's network.</p>

## What does the hand-written Go network compute?

1. **First layers mark stones and liberties.** Each side's stones and the empty points beside them (§Exp. 6).
2. **Middle layers follow chains.** They pass that information along connected stones, finding groups in danger (§Exp. 6).
3. **The last layer scores moves.** Capture, save your group, avoid self-atari, don't fill your own eyes (§Exp. 6).
4. **With passes, it debugs.** It plays practice games, finds how it loses, edits that part, keeps it only if it wins more (§Exp. 6).

<p class="rd-cap">Design from §Exp. 6. The zero-pass version was one Python run of 336 lines (§logs exp6). The board is ours.</p>

<p class="rd-take"><b>It wrote Go knowledge as layers, then debugged it like code.</b> No search, no training.</p>

</article>

<article class="rd-page" id="exp8-setup" data-part="A real language model" data-draw="exp8-setup" markdown>

<p class="rd-crumb"><b>LM 1</b> The biggest test: Qwen3.5-0.8B, 0.8 billion weights.</p>

## What exactly could Astra do to Qwen?

1. **A Python kernel over the weights.** CPU only, at most 300 runs. Load, compute, save an edit (§logs exp8).
2. **A forward-pass budget.** 10, 25 or 50 passes; one pass answers up to 512 practice problems (§Exp. 8).
3. **Practice problems only.** 7,469 from GSM8K, 7,275 from MATH training sets. It never sees the test sets (§Exp. 8).
4. **Forbidden: training of any kind.** No backward pass, no optimizer, no fitting. Embedding and output layers are locked (§logs exp8).
5. **It ran for hours.** The 50-pass run took 158 turns over 20.3 hours (§logs exp8).

<p class="rd-cap">All rules from §Exp. 8 and the logs README for Experiment 8.</p>

<p class="rd-take"><b>Astra could look, measure and edit, but never train.</b> Next: what it found.</p>

</article>

<article class="rd-page" id="exp8-diagnose" data-part="A real language model" data-draw="exp8-diagnose" data-fast markdown>

<p class="rd-crumb"><b>LM 2</b> Uses loops (page 8) and directions (page 7).</p>

## What was wrong with Qwen3.5-0.8B?

1. **It looked at failures first.** 85 of its first 96 practice answers ran to the 32,768-token limit (§Exp. 8).
2. **So the problem was looping.** Most wrong answers never finished, rather than finishing wrongly.
3. **It compared looping and healthy text.** Matched contexts pointed to MLP writers in a few layers (§logs exp8).
4. **One direction, two layers.** The loop was traced to a direction written by the MLPs of layers 15 and 19 (§Exp. 8).
5. **It tested the cause.** Dose-response and a random-direction control supported the diagnosis (§logs exp8).

<p class="rd-cap">85/96 from §Exp. 8; the testing steps from Astra's final report in the logs (§logs exp8).</p>

<p class="rd-take"><b>Astra diagnosed looping, not maths, as the main failure.</b> Then it localized it.</p>

</article>

<article class="rd-page" id="exp8-fix" data-part="A real language model" data-draw="exp8-fix" markdown>

<p class="rd-crumb"><b>LM 3</b> Page 7's projection, applied to page 24's direction.</p>

## What edit did it make?

1. **Pick the columns that write the loop.** In each of the two MLPs, the 64 output columns that write the loop direction most (§logs exp8).
2. **Subtract the direction there.** Those columns lose their loop component (§Exp. 8).
3. **Count it.** 2 layers × 64 columns × 1,024 numbers = 131,072 weights (§logs exp8).
4. **A tiny share.** 131,072 of 0.8 billion is 0.016% (§Exp. 8). [[0.016% | of Qwen's weights changed (§Exp. 8)]]
5. **Everything else untouched.** Embeddings, output head and final norm are unchanged (§logs exp8).

<p class="rd-cap">Counts from §Exp. 8 and the logs' edit manifest. The 1,024 is the model width implied by those counts.</p>

<p class="rd-take"><b>One direction, removed from 128 columns: that is the whole edit.</b> Next: what it did to the scores.</p>

</article>

<article class="rd-page" id="exp8-results" data-part="A real language model" data-draw="exp8-results" data-fast markdown>

<p class="rd-crumb"><b>LM 4</b> Page 25's edit on held-out benchmarks Astra never saw.</p>

## How much did the edit help?

1. **50 passes: a big jump.** MATH-500 7.9% → 48.1%; GSM8K 13.8% → 67.1% (§Exp. 8).
2. **Loops mostly gone.** Answers hitting the token limit fell from 93.0% to 33.1% (§Exp. 8).
3. **10 or 25 passes: small gains.** MATH-500 12.3% and 14.1%; loops barely moved (§Exp. 8).
4. **Not smooth in budget.** IFEval went 21.0 → 49.0 → 39.9 → 62.3 across 0, 10, 25, 50 passes (§Exp. 8).
5. **One run per budget.** Each row is a single Astra run, with its own different final edit (§logs exp8).

<p class="rd-cap">All scores from the blog's table (§Exp. 8), averaged over several samples per problem.</p>

<p class="rd-take"><b>The 50-pass edit raised MATH-500 sixfold by killing loops.</b> Smaller budgets found weaker, different edits.</p>

</article>

<article class="rd-page" id="exp8-beyond" data-part="A real language model" data-draw="exp8-beyond" markdown>

<p class="rd-crumb"><b>LM 5</b> Did page 26's fix help beyond MATH-500?</p>

## Did the edit help on other tasks too?

1. **Harder maths too.** AMC23 0.5 → 23.4; Minerva 1.5 → 25.4; OlympiadBench 1.3 → 21.8 (§logs exp8).
2. **Instruction following tripled.** IFEval 21.0 → 62.3, never a target (§Exp. 8).
3. **Knowledge barely moves.** MMLU-Pro 40.3 → 45.5, short answers that rarely loop (§logs exp8).
4. **A corrected number.** The blog's GPQA figure shows a base of 24.5, scored on 149 of 198 questions. The final value is 22.7 (§logs exp8).

<p class="rd-cap">Numbers from the logs' results (§logs exp8), base vs 50-pass edit. The GPQA correction is the authors' own note.</p>

<p class="rd-take"><b>Removing loops helps anywhere long answers loop.</b> Short-answer knowledge tests gain little.</p>

</article>

<article class="rd-page" id="gemma" data-part="A real language model" data-draw="gemma" data-fast markdown>

<p class="rd-crumb"><b>LM 6</b> The control for pages 24–27.</p>

## Can it add a skill a model doesn't have?

1. **Pick a model that doesn't loop.** Gemma 3 270M hits its token limit on only 8.5% of answers, versus 93% for Qwen (§Exp. 8 add.).
2. **Same task, same rules.** Make it better at maths by editing weights (§Exp. 8 add.).
3. **No real gain.** MATH-500 6.8% base; edits reach 7.0–7.7% (§Exp. 8 add.).
4. **Its errors were ordinary.** Wrong arithmetic, invalid algebra: no single part to switch off (§Exp. 8 add.).
5. **The authors' conclusion.** Editing can remove an obstacle hiding an ability, not add a missing one (§Exp. 8 add.).

<p class="rd-cap">All numbers from the blog's additional experiment. Budgets of 5–50 passes; Astra itself called the gain not established.</p>

<p class="rd-take bad"><b>Weight editing unlocked hidden ability; it could not create new ability.</b> Qwen could already do the maths.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Questions raised by pages 13–28.</p>

## What would a careful reviewer question?

1. **Is this a paper?** No. A blog post, not peer reviewed; the alphaXiv ID is not an arXiv record.
2. **How many runs?** One per setting. The 10-, 25- and 50-pass Qwen runs found different edits (§logs exp8).
3. **Were runs left out?** The logs list other prompt versions with no gain, e.g. a 10-pass run that edited nothing (§logs exp8).
4. **Can anyone reproduce it?** GPT-6 Astra is a closed model; the harness code is not released (§logs README).
5. 🧠 **The steelman.** Every prompt, reply, edit and score is public, and the Qwen edit rebuilds bit for bit (§logs exp8).

<p class="rd-cap">Facts from the released logs; the steelman is our view.</p>

<p class="rd-take"><b>Striking results, honest logs, thin statistics.</b> Treat each number as one sample, not a rate.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 2</b> Our pick of goal: a speech model that loops. Uses pages 7, 26 and 28.</p>

## Should you fix a looping speech model by editing its weights?

1. **Your failure has the right shape.** Whisper repeating a phrase or a TTS that never stops is looping, like Qwen's (page 8).
2. **The fix that worked was small.** One direction out of 128 columns, 0.016% of weights (§Exp. 8).
3. **But it took a frontier model.** 50 passes, 158 turns, 20.3 hours of GPT-6 Astra at max effort (§logs exp8).
4. **And only loops were fixable.** Gemma's ordinary errors did not move (§Exp. 8 add.).
5. 🧠 **Verdict: borrow the method, not the agent.** Find your loop direction yourself and project it out. Don't expect new skills.

<p class="rd-cap">Numbers from §Exp. 8 and its logs. Speech has not been tested; applying it there is our suggestion.</p>

<p class="rd-take"><b>For loops, direction removal is worth a weekend; for missing skills, keep fine-tuning.</b></p>

</article>

<article class="rd-page" id="try-next" data-part="Your move" data-draw="try-next" markdown>

<p class="rd-crumb"><b>Your move 3</b> Weekend ideas from the whole lesson.</p>

## What could you try next?

1. 🧠 **Repeat Experiment 1 with any LLM.** Train four tiny policies; ask a model you can access to name the game.
2. 🧠 **Find Whisper's repetition direction.** Compare hidden states on looping and clean transcripts; project the difference out.
3. 🧠 **Rebuild the Qwen edit.** The logs' script applies it to public weights; read what changed (§logs exp8).
4. 🧠 **Hand-wire a tiny voice-activity detector.** One energy unit, one threshold: page 3 for audio.

<p class="rd-cap">Placement by effort and payoff is our guess.</p>

<p class="rd-take"><b>The cheapest real test is rebuilding the Qwen edit from the logs.</b> It shows exactly what 0.016% looks like.</p>

</article>

<article class="rd-page" id="check-read" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 13–16.</p>

## Where did reading weights alone fail?

- [ ] Naming the game a small policy network plays
- [ ] Finding copying heads in a character model's middle layers
- [x] Telling the sycophantic Gemma 3 270M from its honest twin
- [ ] Naming the shape a tiny diffusion model draws

<p class="rd-take"><b>The sycophant needed attention patterns.</b> From weights alone, all four attempts failed (§Exp. 7).</p>

</article>

<article class="rd-page" id="check-why" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 24–28.</p>

## Why did Qwen's MATH-500 score jump from 7.9% to 48.1%?

- [ ] Astra taught it new algebra by editing its MLPs
- [x] Astra removed a looping direction, so answers it could already work out now finished
- [ ] Astra fine-tuned it on 14,744 practice problems
- [ ] Astra changed its sampling temperature

<p class="rd-take"><b>Loops fell from 93% to 33% of answers.</b> The same trick gave nothing on Gemma, which rarely loops (§Exp. 8).</p>

</article>

<article class="rd-page" id="check-count" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From page 25.</p>

## How many weights did the 50-pass Qwen edit change?

- [ ] About 3.5%, like the car fix
- [x] 131,072: 64 columns in each of two MLPs, 0.016%
- [ ] Every weight of layers 15 and 19
- [ ] One single weight per layer

<p class="rd-take"><b>2 × 64 × 1,024 = 131,072 weights, 0.016%.</b> The 3.5% belongs to Experiment 4's car (§Exp. 4, §Exp. 8).</p>

</article>

<article class="rd-page" id="check-claim" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> Spot the flaw. From page 29.</p>

## A post says "LLMs now beat PPO at writing networks." What is wrong?

- [ ] Nothing; Astra beat PPO in every setting
- [x] PPO at 500M steps still won Seaquest and Asterix, and each result is a single run
- [ ] Astra used gradients behind the scenes
- [ ] The comparison used different network sizes

<p class="rd-take"><b>Astra beat 100M-step PPO, not 500M-step PPO on two of three games.</b> And one run per game is an anecdote (§Exp. 5).</p>

</article>
