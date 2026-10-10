---
title: "ICL for Robots"
paper_title: "In-Context Learning for Robots: Methods and Applications"
authors: ["Haojian Huang", "Zexi Li", "Junhao Guo", "Yehang Zhang", "Wenxuan Peng", "Bohan Zhou", "Weilin Ruan", "Leyi Wu", "Chenxu Wang", "Jianchong Su", "Binghui Xie", "Wosong Chen", "Yingjie Xu", "Tianhao Zhou", "Suzeyu Chen", "Pukun Zhao", "Jiaqi He", "Xinyi Li", "Runze Li", "Peiran Dong", "Shaoxiang Dang", "Jing Huang", "Yingbing Chen", "Yifan Chang", "Tianyi Zhang", "Shiyuan Deng", "Haozhi Wang", "Yangkai Wei", "Wenqian Li", "Han Yang", "Kaiwen Zhou", "Huaping Liu", "James Cheng", "Rui Shao", "Donglin Wang", "Yaochu Jin", "Jianye Hao", "Ying-Cong Chen", "Yinchuan Li"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2609.36012"
arxiv_version: v1
code: {url: "https://github.com/JethroJames/awesome-robots-icl", license: "not stated in the paper", note: "the survey's curated paper list and project page, linked from the paper; not method code"}
paper_type: survey
hook: "A robot that copies your packing demo and one that ignores it can finish with the exact same tray. This 100-page survey asks how robots learn from a demo without retraining, and how you'd ever tell."
big_idea: "A robot that already knows how to move learns a new task from a demo, a correction or its own interaction, with its weights frozen, by turning that evidence into one of four intermediates (an action, a motion reference, a predicted future or a skill call), and the lesson survives only if that intermediate keeps what the task needs."
goal: "Decide which kind of in-context robot learning to try when a robot must pick up new tasks from a few demonstrations without retraining, and how to test that it really used them."
difficulty: 3
difficulty_note: "New subfield (robot learning) and very broad, but no heavy math: the equations are interface diagrams written in symbols, plus one rigid-transform chain you can do by hand."
date_added: 2026-10-02
tags: [Robotics, In-context learning, Agents, Multimodal]
description: "A robot that copies your packing demo and one that ignores it can finish with the exact same tray. This 100-page survey asks how robots learn from a demo without retraining, and how you'd ever tell."
---

<article class="rd-page" id="primer-policy" data-part="Toolbox" data-draw="policy" markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Our running example: a packing robot.</p>

## What does a robot policy take in and put out?

1. **It sees a history.** \(h_t\) holds every observation and action so far: images, joint angles, force readings (§2.2).
2. **It outputs a block of actions.** Not one command but \(A_t\), the next H actions (Eq. 1). Move H.
3. **Only executed actions count.** New observations can replace the unexecuted rest of a block (§2.2).
4. **Pretrained policies supply the skills.** Robot foundation models, trained on large multi-robot datasets, already grasp and move (§1). [[A_t | the next block of H actions]]

<p class="rd-cap">The interface is Eq. 1 and §2.2. The packing history is illustrative.</p>

<p class="rd-take"><b>A policy maps a history to the next block of actions.</b> Next: where new task evidence fits in.</p>

</article>

<article class="rd-page" id="primer-icl" data-part="Toolbox" data-draw="icl" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Adds task evidence to page 1's policy.</p>

## How is in-context learning different from fine-tuning?

1. **Fine-tuning changes the weights.** Task data update the pretrained \(\theta\) into \(\theta_{\text{task}}\) (Fig. 4a).
2. **In-context learning changes the input.** A demonstration enters as context \(C_t\), and the weights stay \(\theta\) (Fig. 4b).
3. **Weights stay frozen while deployed.** \(\theta_{t+1} = \theta_t = \theta_0\); only history and context change (Eq. 3).
4. **Where the lesson lives sets its cost.** Weights persist until retrained; context can be swapped or reset per task (§2.2). [[θ fixed | deployed weights never change]]
5. **One-shot means amount, not mechanism.** One demonstration can drive a gradient update or just condition a frozen policy (§2.2).

<p class="rd-cap">The contrast is Fig. 4 and Eq. 3; the boxes are our redraw.</p>

<p class="rd-take"><b>In-context learning teaches through the input, not the weights.</b> Next: moving a demonstrated motion to a new place.</p>

</article>

<article class="rd-page" id="primer-se3" data-part="Toolbox" data-draw="se2" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> A tool for the geometric family on page 9.</p>

## How do you move a demonstrated motion to where the object is now?

1. **Record the motion relative to the object.** The gripper path is stored in the demonstration object's frame (Eq. 8).
2. **Find the object in the new scene.** Its new pose replaces the demonstration pose (Eq. 8).
3. **Re-attach the path.** \({}^W T^{q}_{E} = {}^W T^{q}_{O}\,({}^W T^{s}_{O})^{-1}\,{}^W T^{s}_{E}\) carries the path along (Eq. 8). Move the object.
4. **It assumes a rigid, still object.** Shape changes or moving objects need richer correspondence (§3.2). [[3 | rigid transforms, chained (Eq. 8)]]

<p class="rd-cap">Eq. 8 is the paper's rigid object-relative transfer. We draw it in 2-D with an illustrative path.</p>

<p class="rd-take"><b>A rigid transform moves a demonstrated path to the object's new pose.</b> Next: predicting what happens before acting.</p>

</article>

<article class="rd-page" id="primer-wm" data-part="Toolbox" data-draw="wm" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> A tool for the world-model family on page 10.</p>

## What is a world model?

1. **It predicts what comes next.** From context and history it forecasts future observations \(v^+\) (Eq. 9).
2. **Use 1: picture the goal, then act.** A decoder turns a predicted future into actions (Eq. 9).
3. **Use 2: try actions in imagination.** Predict each candidate's future and keep the best-scoring one (Eq. 11). Toggle the use.
4. **Teaching picks the preferred future.** Dynamics says what an action may cause; context says which result is wanted (§3.3). [[v⁺ | predicted future observations]]

<p class="rd-cap">Both uses are Eqs. 9 and 11, §3.3. Frames and scores are illustrative.</p>

<p class="rd-take"><b>A world model lets a robot see consequences before moving.</b> Next: the problem that makes robot ICL hard to judge.</p>

</article>

<article class="rd-page" id="problem" data-part="The map" data-draw="tray" data-fast markdown>

<p class="rd-crumb"><b>Map 1</b> Page 1's packing robot, taught red before blue and a handle grasp.</p>

## Why can two robots finish the same tray, yet only one follow the demo?

1. **The demo sets two requirements.** Pack red before blue, and grasp the cup by its handle (§1, §3).
2. **Robot A follows both.** Red first, handle grasp, everything placed.
3. **Robot B ignores the demo.** Blue first, a body grasp, everything placed. Toggle to compare.
4. **The final trays look identical.** Placing an object correctly can still violate a required handle grasp (§1). [[2 | requirements the end state can't show]]
5. **So check the path, not just the end.** Report goal completion and demo adherence separately (§7.3).

<p class="rd-cap">The order and handle-grasp examples follow §1, §3 and §7.3. The scene is illustrative.</p>

<p class="rd-take"><b>A finished task doesn't prove the demo was used.</b> Next: where in-context learning sits among ways robots learn.</p>

</article>

<article class="rd-page" id="horizons" data-part="The map" data-draw="horizons" markdown>

<p class="rd-crumb"><b>Map 2</b> Places page 2's frozen-weight learning on a longer ladder.</p>

## Where does in-context learning sit among ways robots learn?

1. **S1: program it.** Engineers write the task logic, control laws and plans (§2.1).
2. **S2: learn a policy.** Imitation and reinforcement build reusable skills into the weights (§2.1).
3. **S3 and S4: adapt with weights frozen.** S3 uses interaction history; S4 uses supplied teaching. Both are robot ICL (§2.1). [[S3 + S4 | the two forms of robot ICL]]
4. **S5: get better at learning.** Experience improves how the next task is learned: physical recursive self-improvement (§2.1).
5. **S6: learn as a group.** Robots exchange knowledge across bodies, even when motions can't be copied (§2.1).

<p class="rd-cap">The six horizons are §2.1 (Figs. 1 and 3). The layout is ours.</p>

<p class="rd-take"><b>Robot ICL is the frozen-weight middle of a longer learning ladder.</b> Next: the four ways it reaches the motors.</p>

</article>

<article class="rd-page" id="big-idea" data-part="The map" data-draw="doors" data-fast markdown>

<p class="rd-crumb"><b>Map 3</b> The survey's main taxonomy, using page 5's demo.</p>

## What are the four ways context can reach the motors?

1. **Act: infer actions directly.** A context-conditioned policy turns evidence into an action distribution (Table 2).
2. **Retarget: reuse a recorded motion.** Geometric transfer adapts a motion or contact reference to the new scene (Table 2).
3. **Forecast: predict the outcome first.** World-model control uses predicted consequences to choose actions (Table 2).
4. **Script: call skills or tools.** An execution specification tells existing skills what to do (Table 2).
5. **Policies and agents dominate.** 123 policy, 24 geometric, 22 world-model and 91 skill or agent references (Fig. 9b). [[260 | method references]]

<p class="rd-cap">Families and intermediates are Table 2; counts are the paper's own census (Fig. 9b).</p>

<p class="rd-take"><b>The families differ in the intermediate that carries the demo into motion.</b> Next: each family in turn.</p>

</article>

<article class="rd-page" id="act" data-part="The map" data-draw="attend" markdown>

<p class="rd-crumb"><b>Map 4</b> Family 1 of page 7. Our packing demo has six steps.</p>

## How does a policy read a demonstration?

1. **Encode the demo, then generate.** \(r_t = E_\theta^{\mathrm c}(h_t, C_t)\) summarizes the evidence; a generator turns it into actions (Eq. 4).
2. **Attend to the matching step.** Weights \(\alpha_{ti}\) pick demo steps that match the current history (Eq. 6). Move the phase.
3. **The read follows progress.** As the robot advances, attention shifts to later demo steps (§3.1).
4. **Or replay what you retrieve.** Nearest-neighbour methods return the recorded actions of similar states (Eq. 5).
5. **Retrieval can beat learning.** On unseen MuJoCo bodies, REGENT's retrieve-and-play beat its frozen transformer (§3.1). [[123 | policy references (Fig. 9b)]]

<p class="rd-cap">Equations are §3.1. The attention weights are illustrative, from a toy similarity.</p>

<p class="rd-take"><b>A policy must keep the taught order in its representation.</b> Next: reusing the recorded motion itself.</p>

</article>

<article class="rd-page" id="retarget" data-part="The map" data-draw="retarget" markdown>

<p class="rd-crumb"><b>Map 5</b> Family 2 of page 7, using page 3's transform.</p>

## How does geometric transfer reuse a recorded motion?

1. **Extract motion descriptors.** Hand poses, object-relative poses or contacts from each demo step (Eq. 7).
2. **Retarget to the new scene.** Map them onto the current objects and the robot's body (Eq. 7).
3. **Track the reference.** An executor follows the retargeted motion (Eq. 7).
4. **It scales by adding references.** MT3 reached 1,000 single-interaction tasks with under 24 hours of demonstration (§3.2). [[1,000 | tasks, under 24 h of demos (MT3)]]
5. **Its weak spot is applicability.** Shape changes, lost contact or moving objects break the match (§3.2).

<p class="rd-cap">The pipeline is Eq. 7; MT3's scale is §3.2. Boxes are our redraw.</p>

<p class="rd-take"><b>Geometric transfer makes its assumption checkable: the match must still apply.</b> Next: forecasting outcomes.</p>

</article>

<article class="rd-page" id="forecast" data-part="The map" data-draw="forecast" markdown>

<p class="rd-crumb"><b>Map 6</b> Family 3 of page 7, using page 4's world model.</p>

## How does a world model turn a demonstration into control?

1. **Generate the demonstrated future.** For packing, \(v^+\) can show red placed before blue in the robot's scene (§3.3).
2. **Decode actions from it.** The decoder must realize that particular sequence (Eqs. 9, 10).
3. **Or score candidate actions.** Dynamics predicts each candidate's future; teaching says which one is preferred (Eq. 11).
4. **Search can win on new tasks.** Demo-JEPA's action head wins familiar real tasks; planning wins unseen ones (Table 16). [[22 | world-model references (Fig. 9b)]]
5. **A forecast can be unreachable.** Prediction and decoding are separate sources of error (§3.3).

<p class="rd-cap">Equations are §3.3; the Demo-JEPA comparison is Table 16. The frames are illustrative.</p>

<p class="rd-take"><b>Forecasting exposes consequences, but they must be reachable.</b> Next: scripting skills and tools.</p>

</article>

<article class="rd-page" id="script" data-part="The map" data-draw="script" markdown>

<p class="rd-crumb"><b>Map 7</b> Family 4 of page 7, on page 5's packing demo.</p>

## How do skills and agents use a demonstration?

1. **Turn the demo into a specification.** \(g = f_\theta(C_t, h_t)\) is a skill order, a program or tool calls (Eq. 13).
2. **An executor realizes it.** \(A_t = \kappa(g, o_t)\) uses existing motor skills (Eq. 13).
3. **Programs came with language models.** Code as Policies (2022) recombined perception, control and logic from examples (§3.4).
4. **Portability versus physical detail.** A compact procedure crosses scenes but can drop a needed grasp (§3.4). [[91 | skill and agent references (Fig. 9b)]]
5. **Feedback revises the script.** Outcome errors adjust arguments or code without training weights (§3.4).

<p class="rd-cap">Equations are §3.4. The video, outline and arm are illustrative.</p>

<p class="rd-take"><b>A script travels well but must carry every binding detail.</b> Next: binding a demo to new objects.</p>

</article>

<article class="rd-page" id="correspondence" data-part="The map" data-draw="pour" markdown>

<p class="rd-crumb"><b>Map 8</b> Shared by all four families. Taught task: pour from a jug into a cup.</p>

## How does a demonstration carry over to new objects?

1. **Swap the held object.** Jug → bottle, same cup: adjust the grasp and tilt (Table 6).
2. **Swap the receiver.** Same jug, cup → bowl: adjust the pouring position and height (Table 6).
3. **Swap both.** Bottle into bowl: grasp, tilt and position all change (Table 6).
4. **Match parts, not whole objects.** Part-wise warping raised mug–rack placement from 11/27 to 23/27 (Table 16). [[23/27 | placements with part-wise warping]]
5. **That gain had help.** Part correspondences were assisted in that study (Table 16).

<p class="rd-cap">The pouring example is Table 6; the mug–rack numbers are Table 16, with assisted parts.</p>

<p class="rd-take"><b>Transfer depends on matching the parts the task actually uses.</b> Next: keeping evidence until it's needed.</p>

</article>

<article class="rd-page" id="memory" data-part="The map" data-draw="carriers" markdown>

<p class="rd-crumb"><b>Map 9</b> Shared by all four families. Where page 2's lesson can live.</p>

## Where can a robot keep evidence until it needs it?

1. **In the supplied context.** A demo or instruction sits in the input (Fig. 6a).
2. **In recurrent state.** A running summary is carried forward: \(C_{t+1} = U_\theta(C_t, o_t, a_t, o_{t+1})\) (Fig. 6b, Eq. 2).
3. **In retrieved episodes.** An external archive returns relevant past experience (Fig. 6c).
4. **Or in the weights.** Fast weights change during deployment, or updated weights persist (Fig. 6d,e). [[5 | places a lesson can live (Fig. 6)]]
5. **Each has its own reset test.** Remove the context, clear the state, block retrieval, or restore old weights (§2.2).

<p class="rd-cap">The carriers and reset tests are Fig. 6 and §2.2.</p>

<p class="rd-take"><b>Knowing where the lesson lives tells you how to test it.</b> Next: how robots learn to read context at all.</p>

</article>

<article class="rd-page" id="training" data-part="The map" data-draw="pairs" markdown>

<p class="rd-crumb"><b>Map 10</b> How page 7's policies learned to use a demo.</p>

## What training makes a robot read its context at all?

1. **Pair a support with a query.** Train on one example and supervise a different execution of the same task (§4.2).
2. **Or train on continuous streams.** Earlier observations and actions precede later ones, without fixed roles (§4.2).
3. **Or link attempts.** A failed try and its feedback come before the corrected continuation (§4.2).
4. **The context must be needed.** If the scene alone fixes the action, the model can ignore the demo (§4.2). [[3 | ways to organize training (§4.2)]]
5. **ICRT shows it.** Trained on DROID data alone, it made no progress on the test tasks (Table 16).

<p class="rd-cap">The three organizations are §4.2 and Table 11; the ICRT result is Table 16.</p>

<p class="rd-take"><b>A robot reads demos only if training made them useful.</b> Next: which kind of data helps most.</p>

</article>

<article class="rd-page" id="diversity" data-part="How solid is the evidence?" data-draw="bpp" data-fast markdown>

<p class="rd-crumb"><b>Solid 1</b> Drawing error in pixels, lower is better, at a fixed 10,000 demonstrations (BPP).</p>

## Does more task variety beat more demonstrations?

1. **Fix the budget.** BPP spends 10,000 drawing demonstrations three different ways (§4.2, Fig. 15a).
2. **500 tasks, 20 demos each.** Mean Chamfer error is 9.5 pixels (§4.2).
3. **1,000 tasks, 10 demos each.** The error falls to 5.1 pixels (§4.2).
4. **2,000 tasks, 5 demos each.** The error falls to 3.4 pixels (§4.2). [[3.4 px | error with the most tasks]]
5. **Variety must change the answer.** Useful diversity adds decisions that an example must resolve (§4.2).

<p class="rd-cap">Errors are §4.2 and Fig. 15a, averaged over three seeds.</p>

<p class="rd-take"><b>At a fixed budget, more distinct tasks teach context use better.</b> Next: demonstration vs language prompts.</p>

</article>

<article class="rd-page" id="prompts" data-part="How solid is the evidence?" data-draw="s1" data-fast markdown>

<p class="rd-crumb"><b>Solid 2</b> S1 success on seen and unseen tasks, 1k–100k training hours, demo vs language prompts.</p>

## Do demonstration prompts beat language prompts on new tasks?

1. **Seen tasks: both improve.** With more training hours, both prompt types get better on familiar tasks (§4.2).
2. **Unseen tasks: demos pull ahead.** Demonstration prompting rises from 1% to 66% (§4.2, Fig. 15c). [[66% vs 9% | unseen tasks, demo vs language]]
3. **Language barely moves.** Language prompting rises from 0% to 9% on the same unseen tasks (§4.2).
4. **Otherwise matched.** Same data, compute and architecture, apart from the prompt embedding (§4.2).
5. **One caveat on the metric.** Its cumulative per-step success counts human recovery, mostly for the language baseline (§4.2).

<p class="rd-cap">Values are §4.2 and Fig. 15b,c. Only the 1k and 100k endpoints are drawn; straight lines join them.</p>

<p class="rd-take"><b>Similar seen-task scores can hide very different new-task teaching.</b> Next: the survey's 14 reported comparisons.</p>

</article>

<article class="rd-page" id="evidence" data-part="How solid is the evidence?" data-draw="board16" markdown>

<p class="rd-crumb"><b>Solid 3</b> Within-study comparisons from Table 16: baseline → variant.</p>

## What do the 14 reported comparisons show?

1. **More examples, little gain.** LMAct: going from 0 to 512 episodes often helps little (Table 16).
2. **The right context helps.** NOLO: adding a scene video lifts success from 33.58% to 43.65% (Table 16). [[14 | reported comparisons (Table 16)]]
3. **Missing conventions break agents.** Show-Harness with arbitrary API names: 1 success in 20 (Table 16).
4. **Retrieval beats cloning on few demos.** MT3: higher success with fewer demonstrations than behaviour cloning (Table 16).
5. **Checking variants pays.** RAPID: verifying on scene variants lifts success from 53.2% to 75.9% (Table 16).

<p class="rd-cap">Results are Table 16. Each is a comparison inside one study, not across studies.</p>

<p class="rd-take"><b>Gains track the information context supplies, not its volume.</b> Next: does retained experience help?</p>

</article>

<article class="rd-page" id="retention" data-part="How solid is the evidence?" data-draw="reuse" markdown>

<p class="rd-crumb"><b>Solid 4</b> Table 16's group III: success with vs without retained experience.</p>

## Does remembering earlier attempts actually help?

1. **Measure keep versus reset.** The reuse gain \(\Delta_n = S_n^{\text{keep}} - S_n^{\text{reset}}\) compares the same attempt number (§7.3).
2. **Memory can help a little.** RTCF: 86.4% → 88.4%. Zeva: +10 to 20 points (Table 16).
3. **Or help only part of a task.** TraceFlow: 21/50 → 39/50 on real packing order; its simulation aggregate is unchanged (Table 16).
4. **Or backfire.** FARE's always-search variant scored 91.0, below its 91.5 base (Table 16).
5. **A better learner is the big win.** LMPC's trained successor goes from 39.4% to 66.3% on held-out teaching tasks (Table 16). [[39.4 → 66.3 | LMPC successor, new teaching]]

<p class="rd-cap">Numbers are Table 16; the reuse-gain formula is §7.3. LMPC trains between sessions. TraceFlow's bars are our percentages of 21/50 and 39/50.</p>

<p class="rd-take"><b>Retaining experience helps unevenly; learning to learn helps most.</b> Next: how to test a robot properly.</p>

</article>

<article class="rd-page" id="tests" data-part="How solid is the evidence?" data-draw="controls" data-fast markdown>

<p class="rd-crumb"><b>Solid 5</b> Answers page 5: controls that show whether the demo mattered.</p>

## How do you test that a robot really used the demonstration?

1. **Remove the demo.** Success without context shows what the prior alone can do (§7.1).
2. **Swap in a different valid demo.** Same scene, another feasible behaviour: the robot should switch (§7.1).
3. **Give a fully specified task.** This checks the behaviour is executable at all (§7.1).
4. **Scenes can give the answer away.** LIBERO-CF found tested VLAs often continue the scene's usual task (§7.1).
5. **Conventions need evidence too.** Without supplied action conventions, Show-Harness succeeded in 1 of 20 episodes (§7.1). [[1 / 20 | episodes without conventions]]

<p class="rd-cap">Controls and results are §7.1 and Table 15. Show-Harness also inferred only 23.3% of mappings (§7.1).</p>

<p class="rd-take"><b>Change the demo's meaning and watch whether behaviour changes.</b> Next: what a reviewer would question.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Our critique of the survey itself.</p>

## What would a careful reviewer question?

1. 🧠 **Comparisons are within-study.** Each Table 16 row compares variants inside one paper; no shared benchmark links them (Table 16).
2. 🧠 **Much of it is very new.** 197 of 412 references first appeared in the partial 2026 window (Fig. 9a).
3. 🧠 **The tests are proposals.** The evaluation controls are suggested, not run by the survey (§7, Table 15).
4. 🧠 **Families blur in hybrids.** Systems like GLOW or ReCAP span several families; one branch decides the label (§2.3, §3).
5. 🧠 **Simulation carries much evidence.** NOLO's unseen layouts and LMAct's games are simulated (§7.1, Table 16).
6. 🧠 **Steelman: the questions are the contribution.** Its controls (swap, remove, reset) apply to any method (§7).

<p class="rd-cap">Pointers mark the evidence behind each concern. The pills are our judgment.</p>

<p class="rd-take"><b>Read it as a map and a test plan, not a leaderboard.</b> Next: the verdict for your goal.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Verdict</b> For the goal on the cover. Uses pages 7, 16 and 19.</p>

## Which approach should you try for teaching a robot new tasks?

1. **New order or relation? Try a policy.** Demos beat language on unseen tasks: 66% vs 9% in S1 (§4.2). [[66% | S1 unseen tasks, demo prompts]]
2. **Exact contact matters? Use geometric transfer.** It makes the matched interaction explicit and checkable (Table 2, §3.2).
3. **Unknown physical response? Add interaction history.** Recent transitions reveal how this body responds (§3.1).
4. **Long procedure? Script the skills.** Programs expose order and preconditions, but must carry contact details (§3.4).
5. 🧠 **Our verdict: test before trusting.** Whatever you pick, run page 19's swap and no-demo controls first.

<p class="rd-cap">The need-to-family mapping follows Table 2 and §3; the verdict is ours.</p>

<p class="rd-take"><b>Pick the family by what the task must preserve, then prove the demo matters.</b> Evidence is mostly within-study (page 20).</p>

</article>

<article class="rd-page" id="whats-next" data-part="Your move" data-draw="ideas" markdown>

<p class="rd-crumb"><b>Your move 2</b> The survey's four research directions (Fig. 24), plus one of ours.</p>

## What comes next?

1. **Infer taught relations.** Learn an unfamiliar rule from examples, not just pick a known task (§8.1).
2. **Compose task steps.** Combine a demonstrated order with other known constraints (§8.2).
3. **Preserve function across physical change.** Keep an interaction working when contact geometry changes (§8.3).
4. **Revise retained corrections.** Keep useful corrections, and update them when conditions change (§8.4).
5. 🧠 **For speech: voice-prompted TTS.** A voice prompt conditions a frozen TTS model; the same swap tests apply.

<p class="rd-cap">Steps 1–4 are §8 (Fig. 24); step 5 and the map positions are our guesses.</p>

<p class="rd-take"><b>The frontier is robots that get better at being taught.</b> The survey calls it physical recursive self-improvement (§8.5).</p>

</article>

<article class="rd-page" id="quiz" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 7 and 9.</p>

## Which family does MT3's align-then-replay belong to?

- [ ] Context-conditioned policy
- [x] Geometric demonstration transfer
- [ ] World-model-based control
- [ ] Skill- and agent-based execution

<p class="rd-take"><b>Geometric transfer.</b> MT3 retrieves a recorded interaction, aligns to it, then replays the motion (§3.2).</p>

</article>

<article class="rd-page" id="check-memory" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 18.</p>

## What does the reuse gain \(S_n^{\text{keep}} - S_n^{\text{reset}}\) measure?

- [ ] The total successes over all retries
- [x] The benefit of retained evidence at the same attempt number
- [ ] How fast the robot executes a task
- [ ] The gain from fine-tuning the weights

<p class="rd-take"><b>Retained evidence, attempt for attempt.</b> Cumulative success also rewards plain extra tries (§7.3).</p>

</article>

<article class="rd-page" id="check-flaw" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 18 and 19.</p>

## What is wrong with "success rose over five retries, so the robot learned"?

- [ ] Nothing: rising success is learning
- [x] Extra tries alone raise cumulative success; compare kept vs reset memory
- [ ] Five retries are too few to measure anything
- [ ] Success cannot be measured across retries

<p class="rd-take"><b>Retries alone inflate cumulative success.</b> Hold attempts fixed and compare kept versus cleared memory (§7.3).</p>

</article>
