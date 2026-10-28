---
title: "CALM"
paper_title: "Continuous Audio Language Models"
authors: ["Simon Rouard", "Manu Orsini", "Axel Roebel", "Neil Zeghidour", "Alexandre Défossez"]
year: 2026
venue: "arXiv preprint (v3, January 2026)"
arxiv_id: "2509.06926"
arxiv_version: v3
paper_type: method
code: {url: "https://github.com/kyutai-labs/pocket-tts", license: "MIT", note: "Pocket TTS inference and training code, read at commit 77c3d76 (Oct 2026, newer than the paper); not run"}
hook: "Kyutai's Pocket TTS and Gradium's Phonon speak without ever picking a codec token. Each 80 ms of speech is 32 real numbers, drawn from noise in one jump. Here is how that jump is learned."
big_idea: "CALM replaces the codec-token head of an audio language model with a small MLP that turns Gaussian noise into the next continuous VAE frame in one step; for TTS that head is trained with Lagrangian self-distillation, which learns a two-time flow map by making each jump's speed match the model's own velocity where the jump lands."
goal: "Build a small streaming TTS for your own language that runs faster than real time on a CPU."
difficulty: 4
difficulty_note: "Home turf: codecs, RVQ, autoregressive TTS. New: flow matching, flow maps, consistency models and Lagrangian self-distillation, built up over 23 pages with a one-number toy world you can move."
date_added: 2026-10-28
tags: [Speech, TTS, Audio, Generative models, Efficiency]
description: "Kyutai's Pocket TTS and Gradium's Phonon speak without ever picking a codec token. Each 80 ms of speech is 32 real numbers, drawn from noise in one jump. Here is how that jump is learned."
---

<article class="rd-page" id="rvq-cost" data-part="Audio LM toolbox" data-draw="rvq-cost" markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Pointers: (§4.2) CALM; (§2.2 LSD) the LSD paper; (§code …) Pocket TTS code.</p>

## Why do token audio LMs pay for quality with more tokens?

1. **A codec frame is a stack of tokens.** Residual vector quantization (RVQ) codes one frame coarse-to-fine, one codebook per level (§3.1).
2. **Mimi with 8 levels: 1.1 kbit/s.** 12.5 frames a second, 8 tokens each, so 100 tokens per second of speech (Table 1). [[100 /s | tokens for 8-level Mimi]]
3. **Quality needs deeper stacks.** Quantization is lossy. Better audio means more levels per frame (§1).
4. **More levels, more sequential work.** Tokens in one frame depend on each other, so they can't all be drawn at once (§1). Move the slider.

<p class="rd-cap">Frame rate, levels and bitrate are real (Table 1). Bars per frame are drawn to that count.</p>

<p class="rd-take"><b>Token audio LMs buy fidelity with depth, and depth costs time.</b> Next: how one frame of tokens is written.</p>

</article>

<article class="rd-page" id="rq-head" data-part="Audio LM toolbox" data-draw="rq-head" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Zooms into one frame from page 1.</p>

## How does a token LM write one frame of 8 tokens?

1. **The backbone reads the past.** A causal transformer turns all earlier frames into one vector \(z^s\) (§3.1).
2. **Token 1 comes from z alone.** A linear layer gives its logits (§3.1).
3. **A small depth transformer does the rest.** It writes token k from z and tokens 1 to k−1: the **RQ-Transformer** (§3.1).
4. **That head is not small.** 701M parameters in the paper's baselines (Table 14). It takes 26.7% of speech generation time (Table 2).

<p class="rd-cap">Structure from §3.1; parameter count and time share are real (Table 14, Table 2).</p>

<p class="rd-take"><b>Every frame needs a mini language model inside the big one.</b> Next: what if a frame needed no tokens at all?</p>

</article>

<article class="rd-page" id="vae-frame" data-part="Audio LM toolbox" data-draw="vae-frame" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 3</b> The alternative to page 2's token stack.</p>

## What if each frame were 32 real numbers instead?

1. **Swap the quantizer for a VAE.** The encoder outputs a Gaussian latent, no codebook (§4.1).
2. **Same rate, no tokens.** 12.5 frames a second, 32 numbers per frame (Table 1).
3. **At least as good as 8 RVQ levels.** MOSNet 3.15 against 3.11, ABX 8.1% against 9.4% (Table 1).
4. **Listeners agree.** MUSHRA 66.0 against 57.7 for the token codec (Table 1).
5. **The catch: no softmax.** A language model can't pick a vector from a vocabulary. It needs another way to sample.

<p class="rd-cap">All numbers are from Table 1. The 32 bar heights are made up.</p>

<p class="rd-take"><b>Continuous frames keep quality without the token stack, but break the softmax.</b> Next: why plain regression isn't the fix.</p>

</article>

<article class="rd-page" id="mean-trap" data-part="Audio LM toolbox" data-draw="mean-trap" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Starts our toy world, used through page 34.</p>

## Why can't the backbone just predict the next frame?

1. **Shrink a frame to one number.** In our toy world, a frame is either about +1 or about −1. Think "ah" or "ee".
2. **Both are equally likely.** The context can't tell which comes next.
3. **Regression predicts the average.** Mean squared error is lowest at 0. That frame is neither sound.
4. **In audio, that's muffled speech.** Averaging possible frames blurs them. 🧠 Mel-regression TTS models often sound flat for this reason.
5. **You need a sampler.** Something that returns +1 or −1, not their mean.

<p class="rd-cap">Our toy: two Gaussian modes at ±1 with spread 0.15. Not from the paper.</p>

<p class="rd-take"><b>Predicting the mean of several futures gives none of them.</b> Next: the head that samples.</p>

</article>

<article class="rd-page" id="mar" data-part="Audio LM toolbox" data-draw="mar" markdown>

<p class="rd-crumb"><b>Toolbox 5</b> The sampler page 4 asked for.</p>

## How can a small head draw a sample for each frame?

1. **The backbone still writes z.** One vector per frame from the past (§3.3).
2. **A small MLP turns noise into a frame.** It is a diffusion model conditioned on z: **MAR** (§2, §3.3).
3. **Fresh noise, fresh sample.** Different noise gives +1 one time, −1 another.
4. **Trained by denoising.** The MLP learns to undo noise added to real frames (§3.3).
5. **But many steps per frame.** MAR typically needs hundreds of denoising steps per token (§2).

<p class="rd-cap">Structure from §3.3 and §2. The noise and frames drawn are illustrative.</p>

<p class="rd-take"><b>A noise-to-frame head fixes the averaging, at the cost of many steps.</b> Next: the flow toolbox behind such heads.</p>

</article>

<article class="rd-page" id="interp" data-part="Flow toolbox" data-draw="interp" markdown>

<p class="rd-crumb"><b>Flow 1</b> Uses the toy world from page 4. Time 0 is noise, time 1 is data, as in the LSD paper and Pocket TTS code.</p>

## What path joins a noise draw to a frame?

1. **Draw noise ε and a frame x₁.** Our noise is ε = 0.3. Our frame is near +1.
2. **Slide between them.** \(x_t = (1-t)\,\varepsilon + t\,x_1\) for t from 0 to 1 (Eq. 1 LSD). Move the slider.
3. **Each pair gives a straight line.** This is the **interpolant** used by flow matching and rectified flow (§2.1 LSD).
4. **Many pairs, many lines.** Draw many noise-frame pairs and the lines fill the plane, crossing each other.

<p class="rd-cap">Interpolant from the LSD paper (Eq. 1 with α = 1 − t, β = t). CALM's main text writes the same family as \(\alpha_t x_0 + \sigma_t\varepsilon\) (§3.2). Lines are random pairs.</p>

<p class="rd-take"><b>Training paths are straight lines from noise to data.</b> Next: the single velocity those crossing lines average into.</p>

</article>

<article class="rd-page" id="velocity" data-part="Flow toolbox" data-draw="velocity" markdown>

<p class="rd-crumb"><b>Flow 2</b> Averages the lines from page 6.</p>

## Which way should a point move at time t?

1. **Many lines cross each point.** At position x and time t, lines from different pairs pass through.
2. **Average their slopes.** The **velocity** \(b_t(x) = \mathbb{E}[\dot{I}_t \mid I_t = x]\) is the mean slope there (§2.1 LSD).
3. **At t = 0 it points to the middle.** Every frame is still possible, so the average target is 0. Here \(b_0(x) = -x\).
4. **Later it picks a side.** Near t = 1, points above 0 head to +1, points below to −1.
5. **Following it gives curves.** The path from ε = 0.3 dips to 0.225, then climbs to 0.892. Move t.

<p class="rd-cap">Velocity computed exactly for our toy, live in your browser. Arrow lengths are scaled down.</p>

<p class="rd-take"><b>Straight training lines average into a curved flow.</b> Next: learning that velocity from data.</p>

</article>

<article class="rd-page" id="fm-loss" data-part="Flow toolbox" data-draw="fm-loss" markdown>

<p class="rd-crumb"><b>Flow 3</b> Learns page 7's velocity without ever computing it.</p>

## How do you learn the velocity without knowing it?

1. **Pick a pair and a time.** Noise ε, frame x₁, time t. Form \(x_t\) on their line.
2. **The line's slope is the target.** \(\dot I_t = x_1 - \varepsilon\). Regress a network onto it (Eq. 3 LSD).
3. **The target is noisy.** One pair says +1.5, another says −2.5, at the same point.
4. **Squared error averages them.** The minimizer is the mean slope: exactly \(b_t(x)\) (§2.1 LSD). That is **flow matching**.
5. 💻 **Pocket TTS does this too.** `x_t = t·x + (1−t)·e`, target `x − e` (§code samplers.py).

<p class="rd-cap">Loss from the LSD paper (Eq. 3) and CALM (§3.2). Sample slopes are illustrative.</p>

<p class="rd-take"><b>Regressing on noisy line slopes learns their average: the velocity.</b> Next: turning a velocity into a sample.</p>

</article>

<article class="rd-page" id="euler" data-part="Flow toolbox" data-draw="euler" markdown>

<p class="rd-crumb"><b>Flow 4</b> Follows page 7's velocity from our noise ε = 0.3.</p>

## How do you get a sample by following the velocity?

1. **Solve an ODE.** Start at noise and integrate \(\dot x_t = b_t(x_t)\) to t = 1 (Eq. 2 LSD).
2. **Euler: step along the arrow.** \(x \leftarrow x + h\,b_t(x)\), with step size h.
3. **Eight steps land at 0.880.** The exact answer is 0.892. Move the slider.
4. **Two steps land at 0.286.** Far from either sound.
5. **Each step is a network call.** Quality costs calls.

<p class="rd-cap">Exact velocity of our toy; Euler steps computed live. Not from the paper.</p>

<p class="rd-take"><b>Few steps cut corners on a curved path.</b> Next: the extreme case, one step.</p>

</article>

<article class="rd-page" id="one-step" data-part="Flow toolbox" data-draw="one-step" data-fast markdown>

<p class="rd-crumb"><b>Flow 5</b> One Euler step from page 9.</p>

## Why does one big step land on the average?

1. **The first arrow points to the mean.** At t = 0 the velocity is \(-x\), toward the data's average (page 7).
2. **One step lands on it.** 0.3 + (−0.3) = 0.000, for every noise draw.
3. **That's page 4's muffled frame.** One-step flow matching collapses to regression.
4. **A real flow is curved.** Following it takes many steps. Watch the dots split.
5. **The fix: learn the jump itself.** A network that outputs the endpoint of the curve, not its first slope.

<p class="rd-cap">Toy arithmetic, live. The "muffled" link to audio is our analogy.</p>

<p class="rd-take"><b>One step of a velocity model is the mean; one step of a jump model can be a sample.</b> Next: what many steps cost in a stream.</p>

</article>

<article class="rd-page" id="step-cost" data-part="Flow toolbox" data-draw="step-cost" markdown>

<p class="rd-crumb"><b>Flow 6</b> Puts page 9's step count into real time.</p>

## What do many head steps cost in a stream?

1. **Streaming needs RTF below 1.** Thirty seconds of audio must take under thirty seconds (App. E.3).
2. **A 100-step flow head: 136 s.** Real-time factor 4.55 for 30 s of music (Table 9).
3. **Ten steps barely fit.** RTF 0.92, and the flow head's FAD is 4.62 there (Table 9).
4. **A one-step head: 16.7 s.** RTF 0.56 (Table 9). Move the slider.

<p class="rd-cap">Times from Table 9 (music CALM, 1.35B backbone). Bars join the measured points only.</p>

<p class="rd-take"><b>For streaming, the head gets one or a few calls per frame.</b> Next: the object that makes one call enough.</p>

</article>

<article class="rd-page" id="flowmap" data-part="Flow maps and LSD" data-draw="flowmap" data-fast markdown>

<p class="rd-crumb"><b>LSD 1</b> The jump page 10 asked for. This chapter follows the LSD paper (Boffi et al., 2025), which CALM uses for TTS (§5.2).</p>

## What if a network learned the jump itself?

1. **Define the flow map.** \(X_{s,t}(x)\) takes a point at time s to where the flow puts it at time t (§2.2 LSD).
2. **Jump anywhere along the curve.** From time s = 0, slide t. The jump follows the curved path, not a straight arrow.
3. **One call from noise to data.** \(X_{0,1}(0.3) = 0.892\): our sample, no ODE solve (§2.2 LSD).
4. **Or several calls if you like.** Chain \(X_{0,0.5}\) then \(X_{0.5,1}\) to trade compute for accuracy (§2.2 LSD).
5. **Old name, new framing.** Consistency models learn \(X_{s,1}\) only. LSD learns all (s, t) pairs (§4 LSD, App. A).

<p class="rd-cap">The toy flow map is computed live by integrating its exact velocity. Definitions from §2.2 of the LSD paper.</p>

<p class="rd-take"><b>A flow map is a jump table for the whole trajectory.</b> Next: the rules every jump must obey.</p>

</article>

<article class="rd-page" id="map-rules" data-part="Flow maps and LSD" data-draw="map-rules" markdown>

<p class="rd-crumb"><b>LSD 2</b> Properties of page 12's jump.</p>

## What rules must every jump obey?

1. **A zero-length jump goes nowhere.** \(X_{s,s}(x) = x\) (Fig. 1 LSD).
2. **Two jumps equal one.** Jump s→u, then u→t, and you land where s→t lands (Eq. 10 LSD).
3. **Jumps can run backward.** \(X_{t,s}\) undoes \(X_{s,t}\): data back to noise (§2.3 LSD).
4. **The tiny jump's speed is the velocity.** As t approaches s, the jump moves at \(b_s\) (Lemma 2.1 LSD). Page 15 shows it.

<p class="rd-cap">Properties from Fig. 1 and §2 of the LSD paper. Toy numbers are live.</p>

<p class="rd-take"><b>Identity, composition and inverse define a jump table.</b> Next: a form that obeys rule 1 for free.</p>

</article>

<article class="rd-page" id="param" data-part="Flow maps and LSD" data-draw="param" markdown>

<p class="rd-crumb"><b>LSD 3</b> Builds rule 1 from page 13 into the network.</p>

## Why write the jump as x + (t − s)·v?

1. **Let the network output a slope.** \(X_{s,t}(x) = x + (t-s)\,v_{s,t}(x)\) (Eq. 6 LSD).
2. **Rule 1 is automatic.** When t = s, the jump is x, whatever v says.
3. **v is a chord's slope.** It is the straight line from \(x_s\) to \(x_t\) on one trajectory (Fig. 1B LSD).
4. **For our sample: 0.592.** From 0.3 to 0.892 over one unit of time. Move t to see other chords.
5. **No loss of expressivity.** It is a shift and rescale of X, not an approximation (§2.2 LSD).

<p class="rd-cap">Parameterization from Eq. 6 of the LSD paper; Pocket TTS uses it too (§code samplers.py). Toy chords are live.</p>

<p class="rd-take"><b>The network predicts an average slope; the jump is start plus slope times duration.</b> Next: what a tiny chord's slope equals.</p>

</article>

<article class="rd-page" id="tangent" data-part="Flow maps and LSD" data-draw="tangent" markdown>

<p class="rd-crumb"><b>LSD 4</b> Shrinks page 14's chord.</p>

## What happens to a chord's slope as the jump shrinks?

1. **Start at s = 0.5.** Our sample sits at 0.244 there.
2. **A long chord: slope 1.296.** Jumping to t = 1 averages the steep late climb.
3. **Shorter chords flatten.** Length 0.1 gives 0.770; length 0.01 gives 0.431. Move the slider.
4. **The limit is the velocity: 0.402.** \(\lim_{t\to s}\partial_t X_{s,t} = b_s\), the **tangent condition** (Lemma 2.1 LSD).
5. **So \(v_{t,t} = b_t\).** The diagonal of the slope network is the velocity (Eq. 7 LSD).

<p class="rd-cap">Toy chord slopes computed live; the theorem is Lemma 2.1 of the LSD paper.</p>

<p class="rd-take"><b>One network holds both the jump and the velocity: v on the diagonal is the flow.</b> Next: how that splits the training job.</p>

</article>

<article class="rd-page" id="square" data-part="Flow maps and LSD" data-draw="square" markdown>

<p class="rd-crumb"><b>LSD 5</b> Maps page 15's result onto all (s, t) pairs.</p>

## Which parts of the (s, t) square need teaching?

1. **Every jump is a point (s, t).** We only need s ≤ t: forward toward data (§2.3 LSD).
2. **The diagonal is flow matching.** There \(v_{t,t} = b_t\), so page 8's loss trains it directly (Eq. 12 LSD).
3. **Off the diagonal: no direct target.** Nobody tells you \(X_{0.2,0.9}(x)\) without solving the ODE.
4. **So distill from the diagonal.** Use a rule linking off-diagonal jumps to diagonal velocities (Fig. 2 LSD).
5. **The prize is the corner.** (0, 1) is one-step generation.

<p class="rd-cap">After Fig. 2 of the LSD paper; our own drawing.</p>

<p class="rd-take"><b>Train the diagonal with data, then teach the rest from the diagonal.</b> Next: three rules that can do the teaching.</p>

</article>

<article class="rd-page" id="three" data-part="Flow maps and LSD" data-draw="three" markdown>

<p class="rd-crumb"><b>LSD 6</b> Rules for page 16's off-diagonal.</p>

## How can you check a jump without solving the ODE?

1. **Lagrangian: watch the landing point.** As t moves, the endpoint must move at the velocity where it is (Eq. 8 LSD).
2. **Eulerian: wiggle the start.** Sliding the start along the flow must not change the destination (Eq. 9 LSD).
3. **Semigroup: split the jump.** Two half jumps must equal one full jump (Eq. 10 LSD).
4. **Any one is enough.** A map with the right diagonal is the true flow map if it passes any one check (Prop. 2.2 LSD).

<p class="rd-cap">The three conditions of Proposition 2.2 in the LSD paper. Drawings are schematic.</p>

<p class="rd-take"><b>Three equivalent checks, three families of training methods.</b> The next three pages take them one at a time.</p>

</article>

<article class="rd-page" id="lagrange" data-part="Flow maps and LSD" data-draw="lagrange" markdown>

<p class="rd-crumb"><b>LSD 7</b> The first check from page 17, on our toy.</p>

## What does the Lagrangian check say?

1. **Fix the start, move the end.** Hold s = 0 and x = 0.3. Let t grow.
2. **The endpoint traces a curve.** \(X_{0,t}(0.3)\) is that curve.
3. **Its speed: \(\partial_t X_{s,t}(x)\).** The amber arrow.
4. **The flow's speed there: \(b_t(X_{s,t}(x))\).** The violet arrow, read at the landing point.
5. **They must match.** \(\partial_t X_{s,t}(x) = v_{t,t}(X_{s,t}(x))\) (Eq. 8 LSD). "Lagrangian" means following the particle.

<p class="rd-cap">True toy map, live. Both arrows coincide because this map is exact.</p>

<p class="rd-take"><b>A correct jump's endpoint always moves with the flow it lands in.</b> Next: the check from the other end.</p>

</article>

<article class="rd-page" id="eulerian" data-part="Flow maps and LSD" data-draw="eulerian" markdown>

<p class="rd-crumb"><b>LSD 8</b> The second check from page 17.</p>

## What does the Eulerian check say?

1. **Fix the end, move the start.** Hold t = 1. Slide s forward.
2. **Move x along the flow too.** Start from wherever the flow is at s.
3. **The destination must not move.** Every start on one trajectory lands at the same point.
4. **As an equation, it needs ∇X.** \(\partial_s X_{s,t} + \nabla X_{s,t}\, v_{s,s} = 0\): a spatial Jacobian (Eq. 9 LSD).
5. **Consistency models live here.** Their training is this check in disguise (App. C LSD).

<p class="rd-cap">Equation from the LSD paper; toy starts and landing point computed live.</p>

<p class="rd-take"><b>Eulerian checks compare starts; they need the map's spatial derivative.</b> Page 26 shows why that hurts.</p>

</article>

<article class="rd-page" id="semigroup" data-part="Flow maps and LSD" data-draw="semigroup" markdown>

<p class="rd-crumb"><b>LSD 9</b> The third check from page 17.</p>

## What does the semigroup check say?

1. **Split a jump at u.** Go s → u, then u → t.
2. **Compare with one jump s → t.** They must land together (Eq. 10 LSD).
3. **In slopes: a weighted average.** \(v_{s,t} = (1-\gamma)\,v_{s,u} + \gamma\, v_{u,t}\), with \(u = \gamma s + (1-\gamma)t\) (Eq. 22 LSD).
4. **Short jumps teach long ones.** Progressive distillation and shortcut models work this way (App. D LSD).
5. **Errors compound.** Each long jump inherits two shorter jumps' mistakes (§2.3 LSD).

<p class="rd-cap">Equations from the LSD paper; toy jumps live. Move u.</p>

<p class="rd-take"><b>Semigroup methods bootstrap long jumps from short ones, errors included.</b> Next: turning any check into a loss.</p>

</article>

<article class="rd-page" id="selfdistill" data-part="Flow maps and LSD" data-draw="selfdistill" markdown>

<p class="rd-crumb"><b>LSD 10</b> Turns page 17's checks into training.</p>

## How does a model become its own teacher?

1. **Classic distillation needs two runs.** Train a flow model first; then train a jump model to copy it (§1 LSD).
2. **Square the check's error.** Any check from page 17 becomes a loss: its residual squared (Prop. 2.3 LSD).
3. **Replace the frozen teacher with yourself.** The velocity in the check is the same network's diagonal, \(v_{t,t}\).
4. **Train both at once.** Flow matching on the diagonal plus a check off it: \(\mathcal L_{SD} = \mathcal L_b + \mathcal L_D\) (Eq. 11 LSD).
5. **Three checks, three methods.** Lagrangian (LSD), Eulerian (ESD), progressive (PSD) (§2.3 LSD).

<p class="rd-cap">Framework from §2.3 of the LSD paper. Our drawing.</p>

<p class="rd-take"><b>Self-distillation: one network, one run, teacher and student at once.</b> Next: the LSD loss in full.</p>

</article>

<article class="rd-page" id="lsd-loss" data-part="Flow maps and LSD" data-draw="lsd-loss" data-fast markdown>

<p class="rd-crumb"><b>LSD 11</b> Page 18's check plus page 21's recipe.</p>

## What is the LSD loss, term by term?

1. **Pick a pair and two times.** Noise, frame, and s < t. Put the point at \(I_s\) on their line.
2. **Jump with the network.** \(\hat X_{s,t}(I_s) = I_s + (t-s)\,\hat v_{s,t}(I_s)\).
3. **Take the jump's speed in t.** \(\partial_t \hat X_{s,t}(I_s)\): how fast the landing point moves.
4. **Ask the diagonal at the landing point.** \(\hat v_{t,t}(\hat X_{s,t}(I_s))\): the velocity there, as a frozen target.
5. **Penalize the gap.** \(\big|\partial_t \hat X_{s,t}(I_s) - \mathrm{sg}[\hat v_{t,t}(\hat X_{s,t}(I_s))]\big|^2\) (Eq. 13, Eq. 94 LSD; App. A Eq. 6).

<p class="rd-cap">Loss from Eq. 13 and Eq. 94 of the LSD paper, and CALM's App. A. sg means stop-gradient.</p>

<p class="rd-take"><b>LSD: make the jump's landing speed equal the model's own velocity at the landing point.</b> Next: watch it on the toy.</p>

</article>

<article class="rd-page" id="residual" data-part="Flow maps and LSD" data-draw="residual" markdown>

<p class="rd-crumb"><b>LSD 12</b> Page 22's residual, measured on two candidate maps.</p>

## Can we watch the LSD residual catch a wrong map?

1. **Candidate A: one straight Euler jump.** \(X_{0,t}(x) = x + t\,b_0(x)\). Its endpoint moves at −0.300, always.
2. **At t = 0.5 it lands at 0.150.** The flow there moves at +0.271. The residual is −0.571.
3. **Later it grows.** At t = 0.75 the residual is −2.177. The straight jump keeps missing the climb. Move t.
4. **Candidate B: the true map.** Its endpoint speed equals the flow's speed everywhere. The residual is 0.
5. **Training pushes A toward B.** Each gradient step shrinks the gap at sampled (s, t).

<p class="rd-cap">Toy residuals computed live with the exact velocity in place of \(\hat v_{t,t}\).</p>

<p class="rd-take"><b>The residual is large exactly where a jump strays from the flow.</b> Next: computing \(\partial_t X\) efficiently.</p>

</article>

<article class="rd-page" id="jvp" data-part="Flow maps and LSD" data-draw="jvp" markdown>

<p class="rd-crumb"><b>LSD 13</b> Computes the speed term from page 22.</p>

## How do you get ∂t X in one pass?

1. **Use the product rule.** \(\partial_t X_{s,t} = v_{s,t} + (t-s)\,\partial_t v_{s,t}\).
2. **Forward-mode autodiff.** A Jacobian-vector product with tangent (0, 1, 0) on inputs (s, t, x) returns v and \(\partial_t v\) together (§2.3 LSD).
3. 💻 **Exactly this in Pocket TTS.** `torch.func.jvp(v_t, (s, t, x_s), (0, 1, 0))`, then `dxdt = vt + (t − s)·dvdt` (§code samplers.py).
4. **About 1.5 forwards.** The time derivative costs a factor C ≈ 1.5 over one forward pass (App. F.3 LSD).
5. 💻 **A custom LayerNorm.** The stock one doesn't support jvp, so Pocket TTS rewrites it (§code mlp.py).

<p class="rd-cap">Cost from App. F.3 of the LSD paper; code at pocket-tts 77c3d76.</p>

<p class="rd-take"><b>One forward-mode pass gives the jump and its speed.</b> Next: where gradients may and may not flow.</p>

</article>

<article class="rd-page" id="stopgrad" data-part="Flow maps and LSD" data-draw="stopgrad" markdown>

<p class="rd-crumb"><b>LSD 14</b> The sg in page 22's loss.</p>

## Which way should the gradient flow?

1. **The diagonal has real data.** Flow matching gives \(v_{t,t}\) an external signal (§3 LSD).
2. **The off-diagonal should follow it.** Not the other way around (§3 LSD).
3. **Stop the gradient on the target.** Treat \(v_{t,t}(\hat X)\) as fixed, like a frozen teacher (Eq. 94 LSD).
4. **It matters at scale.** Backpropagating through Jacobian-vector products caused significant instability on images (App. F.4 LSD).
5. 💻 **Pocket TTS keeps one path.** Its "minimal" mode lets gradient reach the landing point x, never the target's weights (§code utils.py).

<p class="rd-cap">From §3 and App. F.4 of the LSD paper; Pocket TTS's `RunOnlyInputGrad` at 77c3d76.</p>

<p class="rd-take"><b>Information flows from the data-anchored diagonal outward, never back.</b> Next: why LSD is the stable one.</p>

</article>

<article class="rd-page" id="stability" data-part="Flow maps and LSD" data-draw="stability" markdown>

<p class="rd-crumb"><b>LSD 15</b> Compares pages 18–20.</p>

## Why does LSD train when ESD blows up?

1. **ESD needs ∇X.** A spatial Jacobian of the whole network (page 19).
2. **Its gradients exploded.** On CIFAR-10, ESD's gradient norm grew until training diverged (Fig. 4, §5 LSD).
3. **PSD bootstraps.** Long jumps copy short ones, so errors compound. No accuracy guarantee was found (§2.3 LSD).
4. **LSD needs neither.** Only a time derivative, and only the diagonal as teacher (§5 LSD).
5. 🧠 **That's why CALM picked it.** The paper calls LSD "more stable at training" (§3.2).

<p class="rd-cap">Behaviour from §5 and Fig. 4 of the LSD paper. The curves here are schematic, not their data.</p>

<p class="rd-take"><b>No spatial Jacobian and no bootstrapping: LSD's stability comes from what it avoids.</b> Next: a guarantee.</p>

</article>

<article class="rd-page" id="bound" data-part="Flow maps and LSD" data-draw="bound" markdown>

<p class="rd-crumb"><b>LSD 16</b> What a small page 22 loss buys.</p>

## Does a small LSD loss promise good samples?

1. **Yes, with a bound.** If the flow-matching and LSD losses sum to ε, one-step samples are close in Wasserstein distance (Prop. 2.4 LSD).
2. **The formula.** \(W_2^2 \le 4e^{1+2\hat L}\,\varepsilon\), where \(\hat L\) is the velocity's Lipschitz constant (Eq. 16 LSD).
3. **Smooth velocities help a lot.** Move \(\hat L\). The factor grows exponentially.
4. **PSD has no such bound.** The authors could not get one (§2.3 LSD).

<p class="rd-cap">Bound from Eq. 16 of the LSD paper; the calculator is live arithmetic on it.</p>

<p class="rd-take"><b>Lower LSD loss means provably better one-step samples, if the flow is smooth.</b> Next: balancing the loss across (s, t).</p>

</article>

<article class="rd-page" id="weight" data-part="Flow maps and LSD" data-draw="weight" markdown>

<p class="rd-crumb"><b>LSD 17</b> Weights page 22's loss for each (s, t).</p>

## Why learn a weight for each (s, t) pair?

1. **Losses differ wildly across (s, t).** Gradient norms at different pairs differ a lot (§3 LSD).
2. **Learn a log-variance w.** Minimize \(e^{-w}\,\mathcal L + w\) per pair (Eq. 19 LSD; App. A).
3. **Its best w is log 𝓛.** Then the weighted loss is 1 + w. Move the slider.
4. **Every pair then counts similarly.** That stabilized training and allowed larger learning rates (§3 LSD).
5. 💻 **A tiny MLP of (s, t).** Two inputs, three layers of 32, one output, zero-initialized (§code samplers.py).

<p class="rd-cap">Weighting from Eq. 19 of the LSD paper (after EDM2) and CALM's App. A; the minimum is live arithmetic.</p>

<p class="rd-take"><b>A learned per-(s, t) weight turns wildly different losses into similar-sized ones.</b> Next: which pairs get sampled.</p>

</article>

<article class="rd-page" id="times" data-part="Flow maps and LSD" data-draw="times" markdown>

<p class="rd-crumb"><b>LSD 18</b> Where page 16's square gets its samples.</p>

## Which (s, t) pairs does a batch see?

1. **Three quarters on the diagonal.** η = 0.75 of the batch does flow matching (§3 LSD). CALM uses the same split (App. A).
2. **One quarter off it.** Pairs drawn uniformly from s < t in the LSD paper (§3 LSD).
3. 💻 **Pocket TTS skews late.** t is a sigmoid of a normal with mean 0.4, std 1 (§code samplers.py).
4. 💻 **Pairs: sort two draws.** s is the smaller, t the larger of two such sigmoids (§code samplers.py).

<p class="rd-cap">Fractions from the LSD paper and App. A; sampling code at 77c3d76. Dots are 300 live draws.</p>

<p class="rd-take"><b>Mostly learn the flow, partly distill it.</b> Next: what that split costs.</p>

</article>

<article class="rd-page" id="lsd-cost" data-part="Flow maps and LSD" data-draw="lsd-cost" markdown>

<p class="rd-crumb"><b>LSD 19</b> Prices page 29's split.</p>

## What does an LSD training step cost?

1. **Flow matching: 1 forward per sample.** On the diagonal (App. F.3 LSD).
2. **LSD: 1 + C forwards.** One jvp of about 1.5 forwards, plus the target call (App. F.3 LSD).
3. **Mixed: \(((1-\eta)(1+C)+\eta)B\).** At η = 0.75, about 1.38 B forwards per batch of B. Move η.
4. 💻 **Distil term on one step in four.** Pocket TTS rescales it by 4, keeping the expected gradient, and trains about 9% faster (§code samplers.py).

<p class="rd-cap">Cost formula from App. F.3 of the LSD paper; speedup from a code comment at 77c3d76.</p>

<p class="rd-take"><b>LSD costs about 40% more forward work than flow matching.</b> Next: sampling from the trained map.</p>

</article>

<article class="rd-page" id="lsd-sample" data-part="Flow maps and LSD" data-draw="lsd-sample" markdown>

<p class="rd-crumb"><b>LSD 20</b> Uses page 14's form at inference.</p>

## How do you sample from a trained flow map?

1. **One step: ask for the corner.** \(x_1 = \varepsilon + \hat v_{0,1}(\varepsilon)\).
2. 💻 **That's Pocket TTS's default.** `lsd_decode` with one step adds the head's output to the noise (§code flow_lm.py).
3. **N steps: a grid.** Jump 0 → 1/N → 2/N … with \(\hat v_{i/N,(i+1)/N}\) (§code flow_lm.py).
4. **A perfect map needs one step.** Extra steps help only to fix model error (§2.2 LSD).
5. **In images, steps still helped.** CelebA-64 FID: 12.22 at 1 step, 1.96 at 16 (Table 1 LSD).

<p class="rd-cap">Toy shows the exact map (all step counts agree). FIDs from Table 1 of the LSD paper.</p>

<p class="rd-take"><b>Same network, any step count; CALM's TTS uses one.</b> Next: how LSD relates to methods you've heard of.</p>

</article>

<article class="rd-page" id="family" data-part="Flow maps and LSD" data-draw="family" markdown>

<p class="rd-crumb"><b>LSD 21</b> Places pages 18–20 among known methods.</p>

## Where do consistency, shortcut and MeanFlow models fit?

1. **Consistency models: Eulerian.** They learn \(X_{s,1}\); their loss is the Eulerian check in the limit (App. C.1 LSD).
2. **sCM, CALM's first head: Eulerian too.** Continuous-time consistency needs careful stabilization (§4 LSD; §3.2).
3. **MeanFlow: Eulerian, trained directly.** Its update equals the consistency-training gradient (App. C.2 LSD).
4. **Shortcut models: semigroup.** A discretized split-the-jump rule (App. D LSD).
5. **LSD: the Lagrangian corner.** Before this paper, Lagrangian maps were only trained by distillation (App. B.1 LSD).

<p class="rd-cap">Correspondences from Appendices B–D of the LSD paper. Our drawing.</p>

<p class="rd-take"><b>Most one-step methods are Eulerian or semigroup; LSD is the Lagrangian one.</b> Next: the head-to-head numbers.</p>

</article>

<article class="rd-page" id="lsd-results" data-part="Flow maps and LSD" data-draw="lsd-results" markdown>

<p class="rd-crumb"><b>LSD 22</b> Tests pages 18–20 on images, at equal training time.</p>

## Does LSD beat the other self-distillers?

1. **CIFAR-10, one step: 8.10.** PSD-M 12.81, PSD-U 13.61. ESD diverged (Table 1, §5 LSD).
2. **CelebA-64, one step: 12.22.** PSD 18.81 to 19.64 (Table 1 LSD).
3. **AFHQ-64, one step: 11.19.** PSD 14.50 to 18.86 (Table 1 LSD).
4. **Best at every step count on images.** Toggle steps. On the 2-D checkerboard, PSD-U edges it at 16 steps (Table 1 LSD).
5. 🧠 **Not state of the art, by design.** The authors compare methods on equal footing, not tuned records (§5 LSD).

<p class="rd-cap">FID values from Table 1 of the LSD paper (lower is better).</p>

<p class="rd-take"><b>LSD wins on every image dataset tried.</b> Next: matching the LSD paper's notation to CALM's.</p>

</article>

<article class="rd-page" id="notation" data-part="Flow maps and LSD" data-draw="notation" markdown>

<p class="rd-crumb"><b>LSD 23</b> Translates pages 12–33 into CALM's App. A.</p>

## Why does CALM's LSD appendix look backwards?

1. **Time runs the other way.** CALM's \(\mathbf x_0\) is data and t = 1 is noise, as in diffusion (§3.2, App. A).
2. **So the jump is \(f(x,t,s) = x + (s-t)F\).** Going from noise at t to data at s < t (Eq. 4).
3. **Same loss, renamed.** \(\partial_s f\) against \(F_{\phi^-}(f, s, s)\): the landing speed against the frozen diagonal (Eq. 6).
4. **One step: f(ε, 1, 0).** Noise at t = 1 straight to data at s = 0 (App. A).
5. **Watch the name.** §3.2 calls it "Latent Self-Distillation"; App. A says Lagrangian. Same method (§3.2, App. A).

<p class="rd-cap">Equations from CALM's App. A. Pocket TTS code follows the LSD paper's direction.</p>

<p class="rd-take"><b>Flip time and the two papers say the same thing.</b> Next: the CALM machine that uses this head.</p>

</article>

<article class="rd-page" id="machine" data-part="The CALM machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Puts pages 3 and 31 together. Running example: Pocket TTS saying "Hello world."</p>

## What is the whole CALM machine?

1. **A VAE turns audio into frames.** 32 numbers per 80 ms for speech (§4.1, Table 13).
2. **A causal backbone reads the past.** Text plus earlier frames give one vector per step (§4.2).
3. **Optionally, a short clean context.** A small transformer over the last K frames, used for music (§4.2, §5.1).
4. **A small head samples the next frame.** Noise in, frame out, in one step: consistency or LSD (§4.2, §5.2).
5. **The VAE decoder plays it.** The frame is appended and the loop repeats (Fig. 1).

<p class="rd-cap">Structure after the paper's Fig. 1; our own drawing. Dashed parts are used for music, not speech.</p>

<p class="rd-take"><b>An audio LM whose softmax is replaced by a one-step noise-to-frame head.</b> Next: the VAE at its two ends.</p>

</article>

<article class="rd-page" id="vae" data-part="The CALM machine" data-draw="vae" markdown>

<p class="rd-crumb"><b>Machine 2</b> The first and last boxes of page 35.</p>

## What does the speech VAE turn a second of audio into?

1. **24,000 samples in.** The speech VAE runs at 24 kHz (Table 13).
2. **Strides multiply to 1,920.** Convolution ratios 6·5·4·4·4 (Table 13). One frame per 1,920 samples is 80 ms. Move the slider.
3. **12.5 frames of 32 numbers.** 400 numbers per second, against 24,000 samples (Table 13).
4. **Transformers inside, all causal.** 8 encoder and 8 decoder layers, built on Mimi (§4.1, Table 13).
5. **Music uses a bigger one.** 32 kHz, 25 Hz, 128 dimensions (Table 13, App. B).

<p class="rd-cap">All sizes from Table 13. "Hello world." at about 1 s is our estimate.</p>

<p class="rd-take"><b>One second of speech becomes 12.5 small vectors.</b> Next: what shapes those vectors.</p>

</article>

<article class="rd-page" id="vae-loss" data-part="The CALM machine" data-draw="vae-loss" markdown>

<p class="rd-crumb"><b>Machine 3</b> Trains page 36's VAE.</p>

## Which losses shape the latent space?

1. **Adversarial and feature matching.** A GAN critic makes decoded audio sound real (Eq. 2).
2. **KL to a Gaussian, weight 0.01.** Keeps frames near a standard normal, so noise is a natural start (Eq. 2, Table 13).
3. **WavLM distillation, weight 25.** Pulls the whole latent toward speech content, by cosine similarity (§5.1, Table 13).
4. **No reconstruction loss for speech.** Dropping it improved speech quality; music keeps it (§4.1, Table 13).
5. **Unlike Mimi, distill everything.** Mimi distils only its first codebook (§5.1).

<p class="rd-cap">Loss terms from Eq. 2; weights and switches from Table 13. Bar heights are not to scale.</p>

<p class="rd-take"><b>A Gaussian, semantic latent without a reconstruction loss.</b> Next: the backbone that reads it.</p>

</article>

<article class="rd-page" id="backbone" data-part="The CALM machine" data-draw="backbone" markdown>

<p class="rd-crumb"><b>Machine 4</b> The second box of page 35, for our "Hello world."</p>

## What does the backbone read, and what does it write?

1. **Text first, as a prefix.** SentencePiece tokens from a 4k vocabulary (§5.2).
2. **Then frames, one per step.** Each 32-number frame is projected to the model width (§code flow_lm.py).
3. **Causal attention over all of it.** Step s sees text and frames 1 to s−1 (§4.2).
4. **Out comes z, one vector per step.** For TTS: 24 layers, width 1024, 302M parameters (Table 14).
5. **Plus an end-of-speech logit.** A linear layer on z decides when to stop (§code flow_lm.py).

<p class="rd-cap">Sizes from Table 14; text prefix from §5.2; layer names from Pocket TTS code. Tokens shown are illustrative.</p>

<p class="rd-take"><b>The backbone is an ordinary causal transformer; only its output head changes.</b> Next: why music needs a noisy past.</p>

</article>

<article class="rd-page" id="noise-inj" data-part="The CALM machine" data-draw="noise-inj" markdown>

<p class="rd-crumb"><b>Machine 5</b> A training trick for page 38's backbone.</p>

## Why feed the backbone a noisy past?

1. **Generated frames are imperfect.** At inference the backbone reads its own outputs. Errors pile up (§4.2).
2. **Train on damaged history.** Each past frame becomes \(\sqrt{k}\,\varepsilon + \sqrt{1-k}\,x\), with k drawn from 0 to 1 (§4.2).
3. **Variance stays 1.** The square roots preserve it; that beat the linear mix (§4.2). Move k.
4. **Clean at inference.** No noise is added when generating (§4.2).
5. **Speech didn't need it.** The paper saw no gain for speech (§5.1).

<p class="rd-cap">Formula from §4.2. The frame values drawn are made up.</p>

<p class="rd-take"><b>A backbone trained on noisy pasts tolerates its own mistakes.</b> Next: the detail that noise erases.</p>

</article>

<article class="rd-page" id="short-ctx" data-part="The CALM machine" data-draw="short-ctx" markdown>

<p class="rd-crumb"><b>Machine 6</b> Repairs what page 39's noise takes away.</p>

## Why add a short, clean context?

1. **Noise blurs fine detail.** With noise alone, music kept rhythm but faded after 10–15 s (§4.3).
2. **Add a small transformer on clean frames.** It reads only the last K frames (§4.2).
3. **K = 10 frames: 0.4 s of music.** Four layers, width 1536 (§4.2, Table 14).
4. **Sum the two views.** The head gets \(Z = z_{long} + z_{short}\) (§4.2).
5. **K barely matters.** FAD 0.85, 0.76, 0.73, 0.78 for K = 5, 10, 20, 40 (Table 8).

<p class="rd-cap">Numbers from §4.3, Table 8 and Table 14. Speech models skip this part (§5.1).</p>

<p class="rd-take"><b>Long, noisy context for structure; short, clean context for detail.</b> Next: the first one-step head CALM tried.</p>

</article>

<article class="rd-page" id="cm-head" data-part="The CALM machine" data-draw="cm-head" markdown>

<p class="rd-crumb"><b>Machine 7</b> The head from page 35, version one. Diffusion time here: t = 0 data, t = π/2 noise.</p>

## What was CALM's first one-step head?

1. **A consistency model.** \(f(x_t, t)\) maps any noisy point straight to clean data (§3.2).
2. **Boundary built in.** \(f = c_{skip}(t)\,x_t + c_{out}(t)\,F(x_t,t)\), with \(c_{skip}(0)=1\), \(c_{out}(0)=0\) (§3.2).
3. **TrigFlow path.** \(x_t = \cos t \cdot x + \sin t \cdot \varepsilon\) (§3.2, §4.2).
4. **Continuous-time loss.** Matches F to a target built from its own time derivative, with a learned weight (Eq. 1, Eq. 3).
5. **This is the Eulerian family.** Page 32 placed sCM there.

<p class="rd-cap">Equations from §3.2 and Eq. 3 (after Lu and Song, 2025). Toy curves are illustrative.</p>

<p class="rd-take"><b>Version one jumps from noise to data with an Eulerian consistency loss.</b> Next: the LSD head that replaced it for TTS.</p>

</article>

<article class="rd-page" id="lsd-head" data-part="The CALM machine" data-draw="lsd-head" markdown>

<p class="rd-crumb"><b>Machine 8</b> The head from page 35, version two.</p>

## What does the LSD head look like inside?

1. **Inputs: z, s, t and x.** The backbone vector, two times, and the current noisy frame (§code mlp.py).
2. **Two time embeddings, averaged.** Added to a projection of z to make one conditioning vector (§code mlp.py).
3. **Residual MLP blocks with AdaLN.** The conditioning modulates every block (§code mlp.py).
4. **For TTS: 6 layers, 512 wide.** About 10M parameters, SiLU gating (Table 14).
5. **Output: a 32-number slope.** The head returns \(v_{s,t}\); the jump is x + (t − s)·v (page 14).

<p class="rd-cap">Sizes from Table 14; layout from Pocket TTS `SimpleMLPAdaLN` at 77c3d76.</p>

<p class="rd-take"><b>A 10M-parameter MLP that takes two times and returns a slope.</b> Next: one 80 ms step, end to end.</p>

</article>

<article class="rd-page" id="head-step" data-part="The CALM machine" data-draw="head-step" data-fast markdown>

<p class="rd-crumb"><b>Machine 9</b> One frame of "Hello world." through pages 38 and 42.</p>

## What happens in one 80 ms step?

1. **The backbone emits z.** One pass over the newest frame, reusing its cache (§4.2).
2. **Draw 32 noise numbers.** Scaled by \(\sqrt{\tau}\), the temperature (§4.5).
3. **One head call.** \(x = \varepsilon + v(0, 1, \varepsilon \mid z)\) (page 31).
4. **Feed it back.** The frame becomes the backbone's next input (§4.2).
5. **Decode 1,920 samples.** The VAE decoder turns the frame into 80 ms of audio (Table 13).

<p class="rd-cap">Order from §4.2 and Pocket TTS's `flow_lm.py`. Frame values are made up.</p>

<p class="rd-take"><b>One backbone step and one head call per 80 ms of speech.</b> Next: a trick that made heads train faster.</p>

</article>

<article class="rd-page" id="head-mult" data-part="The CALM machine" data-draw="head-mult" markdown>

<p class="rd-crumb"><b>Machine 10</b> Training cost of pages 38 and 42.</p>

## Why reuse each z for many noise draws?

1. **The backbone is the expensive part.** Computing z is the training bottleneck (§4.4).
2. **The head is cheap.** So compute z once, then train the head N times on it (§4.4).
3. **Fresh noise and time each time.** Each copy samples its own t and ε (§4.4).
4. **N = 8 in the paper.** Higher ran out of memory (§5.3). Without it, FAD rose from 0.93 to 1.32 (Table 5).
5. 💻 **Pocket TTS's recipe uses 4.** `flow_batch_multiplier: 4` (§code scratch.yaml).

<p class="rd-cap">Numbers from §4.4, §5.3, Table 5 and Fig. 3; config at 77c3d76.</p>

<p class="rd-take"><b>Reuse the expensive z; resample the cheap head.</b> Next: temperature without a softmax.</p>

</article>

<article class="rd-page" id="temp" data-part="The CALM machine" data-draw="temp" markdown>

<p class="rd-crumb"><b>Machine 11</b> The √τ from page 43.</p>

## What does temperature mean without a softmax?

1. **Shrink the starting noise.** Draw ε with standard deviation \(\sqrt{\tau}\) instead of 1 (§4.5).
2. **Same as a Gaussian at temperature τ.** Raising a Gaussian to power 1/τ scales its variance by τ (§4.5).
3. **Smaller noise, safer samples.** Like the GAN truncation trick: trade diversity for fidelity (§4.5).
4. **Values used.** 0.8 for speech continuation, 0.7 for the TTS ablation (§4.5, App. E.5). 💻 Pocket TTS defaults to 0.3 (§code default_parameters.py).
5. **It works like token temperature.** Speaker diversity rises with τ in both cases (App. C, Fig. 2).

<p class="rd-cap">Values from §4.5, App. C and App. E.5; default from code at 77c3d76. Histograms are live draws.</p>

<p class="rd-take"><b>Temperature for a continuous head is just the noise's spread.</b> Next: guidance in one step.</p>

</article>

<article class="rd-page" id="latent-cfg" data-part="The CALM machine" data-draw="latent-cfg" markdown>

<p class="rd-crumb"><b>Machine 12</b> Guidance for page 43's single head call.</p>

## How do you guide a one-step head?

1. **Usual CFG mixes velocities along a path.** A one-step head has no path to steer (§4.6).
2. **Mix the conditioning vectors instead.** Run the backbone with and without text (§4.6).
3. **Extrapolate.** \(Z_{cfg} = Z_\varnothing + \alpha\,(Z_C - Z_\varnothing)\) (§4.6). Move α.
4. **Feed \(Z_{cfg}\) to the head.** This is **latent CFG**, from SoundReactor (§4.6).
5. **For TTS, α = 1.5.** Guiding on text cut WER from 2.39 to 1.81 (App. E.5).

<p class="rd-cap">Formula from §4.6; WER from App. E.5. The 2-D vectors are illustrative.</p>

<p class="rd-take"><b>Guide the head's input, not its path.</b> Next: removing the second backbone pass.</p>

</article>

<article class="rd-page" id="latent-distill" data-part="The CALM machine" data-draw="latent-distill" markdown>

<p class="rd-crumb"><b>Machine 13</b> Makes page 46's guidance free.</p>

## How does guidance become free at inference?

1. **CFG doubles the backbone's work.** Conditional and unconditional passes for every step (§4.7).
2. **Fix α, then distil.** A student backbone learns to output \(Z_{cfg}\) directly, with an ℓ2 loss (§4.7).
3. **Keep the head.** The teacher's MLP head is copied unchanged (§4.7).
4. **Shrink while you're at it.** Pocket TTS distils 24 layers into 6, with α = 1.5 (§4.7, App. F).
5. 💻 **Today's recipe bakes in 2.0.** The repo's depth-distill config uses `distill_cfg_coef: 2.0` (§code depth_distill.yaml).

<p class="rd-cap">From §4.7 and App. F; config at 77c3d76, newer than the paper.</p>

<p class="rd-take"><b>One distillation removes both the CFG pass and three quarters of the layers.</b> Next: the speech continuation model.</p>

</article>

<article class="rd-page" id="monologue" data-part="The CALM machine" data-draw="monologue" markdown>

<p class="rd-crumb"><b>Machine 14</b> A different backbone for the same head as page 41.</p>

## How does speech continuation stay on topic?

1. **Start from a text LM.** Helium-1, a 2B multilingual model, trained on French and English speech (§5.1).
2. **It also writes text: inner monologue.** A text stream of the words it is about to say (§5.1).
3. **Text runs 160 ms ahead.** Audio lags the text by 2 frames, so it plans words before sounds (§5.1).
4. **z feeds two heads.** Text logits and the consistency head (§5.1).
5. **Bigger backbone, tiny head.** 2.2B backbone, 10M head, 6 layers (Table 14).

<p class="rd-cap">From §5.1 and Table 14. Words and timing drawn are illustrative.</p>

<p class="rd-take"><b>Text guides sound, two frames ahead.</b> Next: the TTS setup.</p>

</article>

<article class="rd-page" id="tts-setup" data-part="The CALM machine" data-draw="tts-setup" markdown>

<p class="rd-crumb"><b>Machine 15</b> The TTS model that Pocket TTS distils from (page 47).</p>

## How was the TTS model built?

1. **300M backbone, 10M head.** 313M in total, one LSD step (§5.2, Table 3).
2. **Text as a prefix.** 4k SentencePiece tokens; the audio prompt sets the voice (§5.2).
3. **88k hours of public speech.** AMI, Earnings-22, GigaSpeech, SPGISpeech, TED-LIUM, VoxPopuli, LibriHeavy, Emilia (App. D).
4. **Learning rate 1e-4.** 24 layers, 16 heads, width 1024 (Table 14).
5. **Training steps not reported.** Batch size and compute aren't given for the TTS model.

<p class="rd-cap">From §5.2, App. D and Table 14. Bars show dataset count, not hours per set (not reported).</p>

<p class="rd-take"><b>A 313M one-step TTS trained on 88k public hours.</b> Next: does it work?</p>

</article>

<article class="rd-page" id="vae-table" data-part="Does it work?" data-draw="vae-table" markdown>

<p class="rd-crumb"><b>Results 1</b> Tests page 3's claim.</p>

## Is a 32-number VAE as good as 8 RVQ levels?

1. **Same frame rate.** Both run at 12.5 Hz (Table 1).
2. **Equal machine-rated quality.** MOSNet 3.15 against 3.11 (Table 1).
3. **Better phonetic separation.** ABX error 8.1% against 9.4% (Table 1).
4. **Better PESQ and STOI.** 2.42 against 2.13; 0.90 against 0.87 (Table 1).
5. **Listeners prefer it.** MUSHRA 66.0 against 57.7 (Table 1). Toggle the metric.

<p class="rd-cap">All values from Table 1. Bars are scaled per metric.</p>

<p class="rd-take"><b>The continuous VAE matches or beats the token codec on every metric shown.</b> Next: generation quality.</p>

</article>

<article class="rd-page" id="cont-table" data-part="Does it work?" data-draw="cont-table" markdown>

<p class="rd-crumb"><b>Results 2</b> Page 48's model against an 8-RVQ token model.</p>

## Does one-step CALM beat the token model at continuing speech?

1. **Lower perplexity.** 23.8 against 26.8 at temperature 0.8 (Table 2).
2. **Better audio.** Acoustic quality 3.45 against 2.75, on a 1–5 scale (Table 2).
3. **More meaningful, say listeners.** Elo 2023 against 1870 (Table 2).
4. **Temperature matters for both.** At τ = 1.0, CALM's quality drops to 2.82 (Table 2). Toggle τ.
5. **Still below real speech.** The reference scores 4.02 and Elo 2180 (Table 2).

<p class="rd-cap">All values from Table 2: 50 raters, 50 prompts (§5.1).</p>

<p class="rd-take"><b>One consistency step beats eight RVQ levels on every metric.</b> Next: why it's only 1.3× faster.</p>

</article>

<article class="rd-page" id="amdahl" data-part="Does it work?" data-draw="amdahl" markdown>

<p class="rd-crumb"><b>Results 3</b> The speedups in pages 51 and 56.</p>

## Why is a 12× faster head only 1.3× faster overall?

1. **The head was 26.7% of the time.** The backbone took the rest (Table 2).
2. **Make the head 12.3× faster.** Its share shrinks to 0.267 / 12.3 = 0.022 (Table 2).
3. **Total: 0.733 + 0.022 = 0.755.** That is 1.32× faster, as reported (Table 2). This is Amdahl's law. Move the sliders.
4. **Music's head was bigger: 57.7%.** A 19.3× faster head gives 2.2× overall (Table 4).
5. **The head's new share: 2.9% and 6.6%.** Matches the tables (Tables 2, 4).

<p class="rd-cap">Inputs from Tables 2 and 4; the arithmetic is ours and live.</p>

<p class="rd-take"><b>Once the head is tiny, the backbone is the whole bill.</b> That is why Pocket TTS shrinks the backbone (page 47).</p>

</article>

<article class="rd-page" id="tts-table" data-part="Does it work?" data-draw="tts-table" data-fast markdown>

<p class="rd-crumb"><b>Results 4</b> Page 49's model on LibriSpeech test-clean.</p>

## Does one-step LSD TTS beat F5-TTS and DSM?

1. **Lowest WER.** 1.81 against 1.95 for DSM and 2.42 for F5-TTS (Table 3).
2. **One call, not 32.** F5-TTS runs 32 flow steps; DiTAR 10; SALAD 20 (Table 3).
3. **Best audio quality.** MUSHRA 61.1, near the reference's 61.8 (Table 3).
4. **Smallest model.** 313M against 336M to 750M (Table 3).
5. **Weak speaker SIM: 0.52.** Others score 0.66–0.67. Page 54 explains (Table 3). Toggle the metric.

<p class="rd-cap">Values from Table 3. DiTAR and SALAD numbers come from their papers (§5.2).</p>

<p class="rd-take"><b>Best intelligibility and quality in one head call, with a speaker-similarity puzzle.</b> Next: that puzzle.</p>

</article>

<article class="rd-page" id="spk-puzzle" data-part="Does it work?" data-draw="spk-puzzle" markdown>

<p class="rd-crumb"><b>Results 5</b> The 0.52 from page 53.</p>

## Why is the speaker similarity so low?

1. **The metric: WavLM embedding cosine.** Between the prompt and the output (§5.2).
2. **Real speech through the VAE: 0.57.** The reference itself drops from 0.69 after encoding and decoding (Table 3).
3. **So 0.52 is near CALM's ceiling.** The metric seems to penalize the VAE itself (§5.2).
4. **Humans disagree with the metric.** Speaker-similarity Elo: CALM 1966, reference 1953 (Table 3).
5. 🧠 **Odd, given Table 1.** The same VAE wins every Table 1 metric, yet halves WavLM's speaker match. Unexplained.

<p class="rd-cap">Values from Table 3 and §5.2.</p>

<p class="rd-take"><b>The automatic speaker score trips over the VAE; human raters don't.</b> Next: LSD against consistency.</p>

</article>

<article class="rd-page" id="lsd-vs-cm" data-part="Does it work?" data-draw="lsd-vs-cm" markdown>

<p class="rd-crumb"><b>Results 6</b> Page 42's head against page 41's, same 313M TTS model.</p>

## Does the LSD head beat the consistency head?

1. **Audio quality: 61.1 against 46.8.** MUSHRA, both one step, both α = 1.5 (App. E.5).
2. **Speaker SIM: 0.52 against 0.40** (App. E.5).
3. **WER: 1.81 against 1.93.** Close, but LSD still ahead (App. E.5).
4. **Guidance mostly buys words.** Without CFG, LSD's WER is 2.39 and MUSHRA 55.5 (App. E.5).
5. **Guiding on the audio prompt too.** Speaker SIM 0.54 but MUSHRA 56.2 (App. E.5).

<p class="rd-cap">Values from the App. E.5 table (in the LaTeX source; the text mislabels it "Tab. 10"). All runs at τ = 0.7.</p>

<p class="rd-take"><b>At 300M scale, LSD sounds clearly better than consistency.</b> Next: music.</p>

</article>

<article class="rd-page" id="music" data-part="Does it work?" data-draw="music" markdown>

<p class="rd-crumb"><b>Results 7</b> Same machine, music continuation, 1.35B backbone.</p>

## Does it work for music too?

1. **One step beats 32 RVQ levels.** FAD 0.83 against 1.06 (Table 4).
2. **Four steps do better still.** FAD 0.71; quality 3.07 against 2.85 (Table 4).
3. **TrigFlow, 100 steps, is best.** FAD 0.64, but 0.3× the baseline's speed (Table 4).
4. **Listeners: close.** Enjoyment Elo 1857 for one step against 1824 (Table 4).
5. **Text-to-music: a tie.** FAD 0.91 against 0.93, Elo 1998 each (Table 6).

<p class="rd-cap">Values from Tables 4 and 6. Music heads are consistency models, not LSD (§5.3).</p>

<p class="rd-take"><b>For music, few-step consistency wins on speed and FAD; listeners call it close.</b> Next: which parts matter.</p>

</article>

<article class="rd-page" id="ablation" data-part="Does it work?" data-draw="ablation" markdown>

<p class="rd-crumb"><b>Results 8</b> Removes pages 39, 40 and 44, one at a time.</p>

## Which ingredients does music generation need?

1. **Full model: FAD 0.93.** After 250k steps, 4 consistency steps (Table 5).
2. **No head multiplier: 1.32** (Table 5).
3. **No noise injection: 1.63** (Table 5).
4. **No short context: 4.03.** The biggest single loss (Table 5).
5. **None of them, roughly MAR: 8.38** (Table 5).

<p class="rd-cap">Values from Table 5. Speech models used neither noise injection nor the short context (§5.1).</p>

<p class="rd-take"><b>The clean short context matters most; together the tricks give a 9× better FAD.</b> Next: more head steps.</p>

</article>

<article class="rd-page" id="more-steps" data-part="Does it work?" data-draw="more-steps" markdown>

<p class="rd-crumb"><b>Results 9</b> Step counts for page 41's and page 11's heads.</p>

## Do more head steps always help?

1. **Flow head: yes.** TrigFlow FAD falls from 28.83 at 4 steps to 0.64 at 100 (Table 9).
2. **Consistency head: no.** Best at 4 steps, 0.71. At 100 steps it worsens to 2.05 (Table 9).
3. **Below 10 steps, only consistency works.** That is the streaming zone, RTF under 1 (App. E.3).
4. 🧠 **Unlike LSD on images.** The LSD paper's model kept improving to 16 steps (Table 1 LSD). Steps weren't tested for CALM's LSD head.

<p class="rd-cap">Values from Table 9 (music). The LSD comparison is our observation.</p>

<p class="rd-take"><b>Few-step heads stream; the music consistency head even gets worse with many steps.</b> Next: scaling.</p>

</article>

<article class="rd-page" id="scale" data-part="Does it work?" data-draw="scale" markdown>

<p class="rd-crumb"><b>Results 10</b> A bigger backbone than page 56's.</p>

## Does CALM improve with a bigger backbone?

1. **1.3B to 3B backbone.** 48 layers, width 2048 (App. E.4).
2. **CALM: FAD 0.71 → 0.62** (Table 10).
3. **Token model: 1.06 → 0.98** (Table 10).
4. **Both improve by similar proportions.** A full scaling study is left for future work (App. E.4).

<p class="rd-cap">Values from Table 10 (music, 4 consistency steps).</p>

<p class="rd-take"><b>One data point says it scales like token models.</b> Next: the small one.</p>

</article>

<article class="rd-page" id="pocket" data-part="Does it work?" data-draw="pocket" markdown>

<p class="rd-crumb"><b>Results 11</b> Page 47's 6-layer student.</p>

## How good is the 100M Pocket TTS?

1. **90M model plus a 20M VAE.** Reported as 100M with the decoder (App. F).
2. **WER 1.84, the lowest.** Tied with DSM at 750M (Table 12).
3. **Audio quality Elo 2016.** Above F5-TTS 1949 and DSM 1959; below Chatterbox 2055 (Table 12).
4. **Speaker Elo 1898, the lowest.** F5-TTS 1946, DSM 2037 (Table 12).
5. **The only CPU real-time voice cloner.** Faster than real time, tested on an Apple M3 and an Intel Core Ultra 7 (App. F).

<p class="rd-cap">Values from Table 12. Inputs were cleaned with Adobe Enhance Speech for every model (App. F).</p>

<p class="rd-take"><b>A tenth of DSM's size, the same WER, on a laptop CPU.</b> Next: your move.</p>

</article>

<article class="rd-page" id="code-map" data-part="Your move" data-draw="code-map" markdown>

<p class="rd-crumb"><b>Move 1</b> 💻 Pocket TTS at commit 77c3d76, MIT licence.</p>

## Where does each idea live in the Pocket TTS code?

1. 💻 **LSD loss: `training/modules/samplers.py`.** Class `LSD`: diagonal term, jvp, target, learned weight.
2. 💻 **Sampling: `pocket_tts/models/flow_lm.py`.** `lsd_decode` and the temperature-scaled noise.
3. 💻 **Head: `pocket_tts/modules/mlp.py`.** `SimpleMLPAdaLN` with two time embedders.
4. 💻 **Latent CFG distillation: `training/modules/model.py`.** `teacher_z` mixes guided and null outputs.
5. 💻 **Recipes: `training/configs/`.** `scratch.yaml` trains the 24-layer teacher; `depth_distill.yaml` the 6-layer student.

<p class="rd-cap">Paths at 77c3d76. The repo has grown past the paper: drifting heads and 2M–18M models too.</p>

<p class="rd-take"><b>Everything in pages 22–31 is about 50 lines of `samplers.py`.</b> Next: where the code departs from the paper.</p>

</article>

<article class="rd-page" id="code-diff" data-part="Your move" data-draw="code-diff" markdown>

<p class="rd-crumb"><b>Move 2</b> 💻 Code against pages 29, 44, 45 and 47.</p>

## Where does the code differ from the paper?

1. 💻 **Both terms on every sample.** Weights 0.75 and 0.25, not a 75/25 batch split (§code samplers.py; App. A).
2. 💻 **Distill term on a quarter of steps.** Rescaled by 4; about 9% faster (§code samplers.py).
3. 💻 **Times are logit-normal, not uniform.** Mean 0.4, std 1 (§code samplers.py).
4. 💻 **Head multiplier 4, not 8.** (§code scratch.yaml; §5.3)
5. 💻 **Defaults: τ = 0.3, CFG 2.0.** The paper reports 0.7 and α = 1.5 (§code; App. E.5, App. F).

<p class="rd-cap">Our comparison. The code is from October 2026 and may postdate the paper's runs.</p>

<p class="rd-take"><b>Same method, retuned since publication.</b> Next: training your own.</p>

</article>

<article class="rd-page" id="recipe" data-part="Your move" data-draw="recipe" markdown>

<p class="rd-crumb"><b>Move 3</b> 💻 The repo's `training/README.md` and `scratch.yaml`.</p>

## What would it take to train your own Pocket TTS?

1. 💻 **Quickstart: 200 hours of English.** About 15 GB prepared. Intelligible, not production quality (§code README).
2. 💻 **Parity: 2,000 hours or more.** That matches the official model, per the README (§code README).
3. 💻 **Teacher: 400k steps, batch 64.** Quality lifts off a plateau at 150k–200k steps (§code scratch.yaml).
4. 💻 **One big GPU, or accumulate.** Batch 64 needs about 56 GB; 16 × 4 fits in about 16 GB (§code README).
5. 💻 **Then distil 24 → 6 layers.** WER reaches parity by about 50k steps (§code depth_distill.yaml).

<p class="rd-cap">Claims from the repo's README and configs at 77c3d76; we did not run them.</p>

<p class="rd-take"><b>Two thousand hours and one large GPU get you a CPU-real-time TTS.</b> Next: what a reviewer would ask.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Move 4</b> 🧠 Our review, specific to this paper.</p>

## What would a careful reviewer question?

1. **🧠 LSD appears late and thinly.** Only App. A describes it, and only TTS uses it. Music and continuation use consistency (§5).
2. **🧠 Labels slip.** "Latent" versus "Lagrangian" Self-Distillation; the TTS ablation is cited as Tab. 10 (§3.2, App. E.5).
3. **🧠 The speaker-SIM story is unresolved.** The VAE wins Table 1 yet loses WavLM similarity (Table 3).
4. **🧠 Thin speech ablations.** "No gains" from noise and short context, with no numbers (§5.1).
5. **🧠 Steelman.** Real human studies, a released model and training code. Rare for a method paper.

<p class="rd-cap">Our judgement; pointers show where each issue sits.</p>

<p class="rd-take"><b>Trust the method and Pocket TTS; read the LSD details in the LSD paper.</b> Next: the verdict.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Move 5</b> 🧠 Goal we picked: a small streaming TTS for your language, faster than real time on CPU.</p>

## Should you build your CPU TTS this way?

1. **Quality: yes.** WER 1.84 and audio Elo above F5-TTS, at 100M (Table 12).
2. **Speed: yes.** One head call per 80 ms; faster than real time on laptop CPUs (App. F).
3. **Training: feasible.** Open recipe, about 2,000 hours, one large GPU (§code README).
4. **Voice match: weakest point.** Lowest speaker Elo in Table 12: 1898 (Table 12).
5. **🧠 New language: check the codec first.** The paper's speech models were trained on English and French data (§5.1, App. D). Test the VAE's reconstruction on your language before training.

<p class="rd-cap">Numbers are real (Table 12, App. F, code README). Recommendations are ours.</p>

<p class="rd-take"><b>Yes: start from Pocket TTS's recipe, gather 2,000 hours, and check the codec on your language first.</b></p>

</article>

<article class="rd-page" id="ideas" data-part="Your move" data-draw="ideas" markdown>

<p class="rd-crumb"><b>Move 6</b> 🧠 Our ideas, each a weekend or two.</p>

## What could you try next?

1. **🧠 Two LSD steps at inference.** The head supports it for free; measure WER and quality (page 31).
2. **🧠 Replicate the toy.** Train LSD on page 4's two-mode world in 50 lines and watch the residual.
3. **🧠 LSD for the music head.** The paper never tried it; Table 9 suggests room.
4. **🧠 Probe the speaker-SIM gap.** Compare WavLM and ECAPA similarities through the VAE.

<p class="rd-cap">Placement on the map is our guess.</p>

<p class="rd-take"><b>The cheapest experiment: change one config value and listen to two-step LSD.</b> Then check yourself.</p>

</article>

<article class="rd-page" id="q-mean" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 4 and 10.</p>

## A velocity head takes one Euler step from noise. In the two-mode toy, where does it land?

- [ ] At +1 or −1, whichever is closer to the noise
- [x] At 0, the mean of the data, for every noise draw
- [ ] At the noise itself, since the first velocity is zero
- [ ] Halfway between the noise and the nearest mode

<p class="rd-take"><b>At the mean.</b> At t = 0 the velocity is −x, so x + (−x) = 0. One-step flow matching collapses to regression.</p>

</article>

<article class="rd-page" id="q-tangent" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 14 and 15.</p>

## With X = x + (t − s)·v, what is v on the diagonal, s = t?

- [ ] Zero, because the jump has zero length
- [ ] The slope of the chord from noise to data
- [x] The flow's velocity at that time and place
- [ ] Undefined, since the jump is just x

<p class="rd-take"><b>The velocity: \(v_{t,t} = b_t\) (Eq. 7 LSD).</b> The jump is x at s = t, but its slope still means something, and flow matching trains it.</p>

</article>

<article class="rd-page" id="q-lsd" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From pages 18 and 22.</p>

## What does the LSD loss compare?

- [ ] The jump's endpoint against the real data frame
- [ ] Two half jumps against one full jump
- [ ] The jump's speed at its start against the velocity at the start
- [x] The jump's landing speed against the model's own velocity at the landing point

<p class="rd-take"><b>Landing speed against landing-point velocity (Eq. 13 LSD).</b> Two half jumps is PSD; comparing at the start is closer to the Eulerian check.</p>

</article>

<article class="rd-page" id="q-stable" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> From pages 19 and 26.</p>

## Why did ESD diverge on CIFAR-10 when LSD did not?

- [ ] ESD uses a teacher network that drifts
- [x] ESD backpropagates through a spatial Jacobian of the network
- [ ] ESD trains only on the diagonal
- [ ] ESD uses uniform time sampling

<p class="rd-take"><b>The spatial Jacobian ∇X blew up gradient norms (Fig. 4, §5 LSD).</b> LSD needs only a time derivative.</p>

</article>

<article class="rd-page" id="q-amdahl" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 5</b> From page 52.</p>

## The head takes 20% of the time. You make it infinitely fast. What is the overall speedup?

- [ ] Infinite
- [ ] 5×
- [x] 1.25×
- [ ] 1.2×

<p class="rd-take"><b>1 / 0.8 = 1.25×.</b> The backbone's 80% remains. That is why Pocket TTS shrinks the backbone, not the head.</p>

</article>

<article class="rd-page" id="q-cfg" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 6</b> From pages 46 and 47.</p>

## Why does Pocket TTS need only one backbone pass per step, despite guidance?

- [ ] Guidance is applied to the head's output instead
- [x] A student backbone was trained to output the guided vector directly
- [ ] The head ignores the text, so guidance isn't needed
- [ ] It uses guidance only on the first frame

<p class="rd-take"><b>Latent distillation (§4.7).</b> The student regresses \(Z_{cfg}\) with α = 1.5, so the unconditional pass disappears.</p>

</article>

<article class="rd-page" id="q-temp" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 7</b> From page 45.</p>

## At temperature 0.3, what standard deviation does the starting noise have?

- [ ] 0.3
- [ ] 0.09
- [x] About 0.55
- [ ] 1.0, with the output scaled by 0.3

<p class="rd-take"><b>√0.3 ≈ 0.548 (§4.5).</b> Temperature scales the variance, so the standard deviation is its square root.</p>

</article>

<article class="rd-page" id="q-spk" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 8</b> Spot the flaw. From pages 53 and 54.</p>

## "CALM's speaker SIM of 0.52 shows it can't clone voices." What's wrong?

- [ ] Nothing: 0.52 is the lowest in Table 3
- [x] Real speech through the same VAE scores only 0.57, and human raters rank CALM above the reference
- [ ] Speaker SIM should be read inverted
- [ ] CALM was never given a voice prompt

<p class="rd-take"><b>The metric is capped by the VAE (Table 3).</b> Human speaker-similarity Elo: CALM 1966, reference 1953.</p>

</article>
