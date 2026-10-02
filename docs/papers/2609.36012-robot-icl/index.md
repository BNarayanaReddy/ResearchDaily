---
title: "ICL for Robots"
paper_title: "In-Context Learning for Robots: Methods and Applications"
authors: ["Haojian Huang", "Zexi Li", "Junhao Guo", "Yehang Zhang", "Wenxuan Peng", "Bohan Zhou", "Weilin Ruan", "Leyi Wu", "Chenxu Wang", "Jianchong Su", "Binghui Xie", "Wosong Chen", "Yingjie Xu", "Tianhao Zhou", "Suzeyu Chen", "Pukun Zhao", "Jiaqi He", "Xinyi Li", "Runze Li", "Peiran Dong", "Shaoxiang Dang", "Jing Huang", "Yingbing Chen", "Yifan Chang", "Tianyi Zhang", "Shiyuan Deng", "Haozhi Wang", "Yangkai Wei", "Wenqian Li", "Han Yang", "Kaiwen Zhou", "Huaping Liu", "James Cheng", "Rui Shao", "Donglin Wang", "Yaochu Jin", "Jianye Hao", "Ying-Cong Chen", "Yinchuan Li"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2609.36012"
arxiv_version: v1
code: {url: "https://github.com/JethroJames/awesome-robots-icl", license: "MIT", note: "curated paper list and project page, not method code; a reproducibility supplement (S1) ships with the arXiv source"}
paper_type: survey
hook: "A robot that copies your packing demo and one that ignores it can finish with the exact same tray. This 100-page survey asks how robots learn from a demo without retraining, and how you'd ever tell."
big_idea: "A robot that already knows how to move learns a new task from a demo, a correction or its own interaction, with its weights frozen, by turning that evidence into one of four intermediates (an action, a motion reference, a predicted future or a skill call), and the lesson survives only if that intermediate keeps what the task needs."
difficulty: 3
difficulty_note: "New subfield (robot learning) and very broad, but no heavy math: the 21 equations are interface diagrams written in symbols, plus one rigid-transform chain you can do by hand."
time_fast: 18
time_deep: 115
date_added: 2026-10-02
prerequisites:
  - {label: "Robot policies, observations and action chunks", anchor: "#primer-policy"}
  - {label: "In-context learning vs fine-tuning", anchor: "#primer-icl"}
  - {label: "Robot foundation models (VLAs)", anchor: "#primer-vla"}
  - {label: "Poses and rigid transforms", anchor: "#primer-se3"}
  - {label: "World models", anchor: "#primer-wm"}
tags: [Robotics, In-context learning, Agents, Multimodal]
description: "A robot that copies your packing demo and one that ignores it can finish with the exact same tray. This 100-page survey asks how robots learn from a demo without retraining, and how you'd ever tell."
---

## Part I: Why should I care? { .rd-part }

## ⚡ The hook { #hook }

Here's a kitting job. Two plates and three bushings go into a tray, and your line wants **plates first**. You record a short demo and hand it to a robot that already knows how to grasp both parts. It finishes with all five parts in the tray.

Did it learn from your demo?

You can't tell from the tray. A robot that dropped the bushings in first ends with the identical inventory. The only evidence is the *order*, and the order is visible in the middle of the job, not at the end. That plate-first kit is the survey's own running example (§3, §8.2, Fig. 25).

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/problem.svg"
<figcaption><strong>What to notice:</strong> the two final trays are pixel-for-pixel the same. A success metric computed on the final state scores both robots 100%, even though only one used your teaching. (Our drawing of the idea in Fig. 25.)</figcaption>
</figure>

This isn't a contrived worry. On LIBERO, a popular manipulation benchmark, a policy given only a task *index* (no instruction, no demo) can score highly, because each scene layout already reveals the task. On LIBERO-CF, which offers different feasible instructions in familiar layouts, tested vision-language-action models often carry on with the task the scene suggests (§7.1).

When the context genuinely carries the task, though, it can matter enormously. Skild's S1 report trains with demo prompts and with language prompts under matched data and compute. On *unseen* tasks, demo prompting climbs from **1% to 66%** as pretraining grows from 1k to 100k hours; language prompting reaches **9%** (§4.2, Fig. 15).

This survey maps how robots use teaching like your demo **without retraining**, across 412 references, and how to test whether they really did. By the end you'll have four "doors" for sorting any method, and a short list of questions that expose a "learns from one demo" claim.

## ⚡ The paper in one picture { #one-picture }

**One sentence.** A robot that already knows how to move learns a new task from a demo, a correction or its own interaction, with its weights frozen, by turning that evidence into one of four intermediates, and the lesson survives only if that intermediate keeps what the task needs.

**One paragraph.** Pretraining gives a robot motor competence: it can reach, grasp, place. What it lacks is evidence about *this* task: the order, the contact, an event it didn't see, how an unfamiliar material responds. In-context learning (ICL) supplies that evidence at deployment while every neural weight stays fixed (§1, §2.1). The survey sorts methods by **what the evidence turns into before execution**: an action distribution, a motion reference, a predicted future, or a skill/program call (§2.3, Table 2). Two shared mechanisms serve all four: **correspondence** binds the demo's objects and phases to the current scene, and **memory** keeps the evidence until the decision that needs it (§3.5).

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/one-picture.svg"
<figcaption><strong>What to notice:</strong> the four doors differ in <em>what passes to the executor</em>, not in architecture. A transformer, a diffusion model or a VLM can sit behind any door (§2.3). Our redraw; compare the paper's Figs. 5 and 7.</figcaption>
</figure>

## Primer: what you need first { #primer }

??? deep "Open the primer (skip if you ticked every prerequisite)"

    ### Robot policies, observations and action chunks { #primer-policy }

    A **policy** maps what the robot senses to what it does. The **observation** \(o_t\) bundles camera images, **proprioception** (the robot's own joint angles and gripper width) and sometimes force/torque or touch sensors (§2.2). The **action** \(a_t\) is a command: usually a small change in the end-effector pose (3 numbers for position, 3 for rotation) plus 1 for the gripper, so 7 numbers per step.

    Modern policies emit an **action chunk**: \(H\) future actions at once. The robot executes the first few, takes fresh observations, and asks again. Only actions that were actually executed enter the history; the rest of the chunk is thrown away (§2.2).

    Where do training trajectories come from (§4.1, Table 9)?

    | Source | What's recorded | What's missing |
    |---|---|---|
    | **Teleoperation** | a human drives the real robot: robot commands, joint states, sometimes force | slow and expensive |
    | **UMI** (handheld gripper) | a gripper-shaped tool in a human hand; motion estimated from its camera and IMU | arm joint motion |
    | **Egocentric video** | head-mounted human video (Ego4D, EPIC-KITCHENS) | any robot action |
    | **Simulation** | rendered images, exact states and contacts | real physics |

    !!! bridge "Speech bridge"
        An action chunk is like a TTS decoder with a reduction factor: Tacotron predicts several mel frames per decoder step to keep long sequences tractable. **Where it breaks:** a TTS model never takes back a frame it emitted. A robot routinely discards the unexecuted tail of its chunk because the world reacted.

    ### In-context learning vs fine-tuning { #primer-icl }

    There are two places to put new task information. **Fine-tuning** writes it into the weights: task data turn \(\theta\) into \(\theta_{\text{task}}\). **In-context learning** puts it into the input: a demonstration, called the **support** demonstration \(D^{\mathrm s}\), becomes the context \(C_t\), and \(\theta\) never changes (§2.1, Fig. 4). The robot's current attempt is the **query**.

    The survey is careful about *where* adaptation lives, because that determines how you'd test it (§2.2, Fig. 6):

    | Where the change lives | Example | Counts as ICL here? | Test by… |
    |---|---|---|---|
    | (a) supplied context | a demo in the prompt | yes | removing the evidence |
    | (b) recurrent state | a memory vector carried across steps | yes | clearing the state |
    | (c) retrieved episodes | look-ups in an archive of past runs | yes | suppressing retrieval |
    | (d) fast weights | a small parameter subset updated during the run (RoboTTT) | no, parameter adaptation | restoring the weights |
    | (e) retained updated weights | ordinary fine-tuning | no | restoring the weights |

    A third option has no neural change at all: revising the code, programs or retrieval rules *around* a frozen model. The survey calls this **model-external adaptation** (§2.2).

    !!! bridge "Speech bridge"
        You know this split from TTS. Zero-shot voice cloning conditions a frozen model on a few seconds of reference audio (ICL); speaker adaptation fine-tunes on the target voice. **Where it breaks:** a voice prompt is copied holistically and a bad clone costs nothing. A robot demo carries discrete, *binding* requirements (this order, this handle) that must be extracted, survive a different body, and can't always be undone once executed.

    ### Robot foundation models (VLAs) { #primer-vla }

    A **vision-language-action model (VLA)** starts from a vision-language model and is trained to output robot actions, either as tokens or through a diffusion or flow-matching head. OpenVLA, π0 and GR00T are examples (§1). They train on large multi-robot collections; AgiBot World's March 2025 release alone has 1,001,552 trajectories and 2,976.4 hours across 217 tasks (§4.3).

    These models supply the **motor competence** the survey takes for granted. The survey's question is how new teaching *redirects* that competence. There's a catch it flags early: broader pretraining also strengthens familiar continuations that may conflict with a new example (§2.4).

    **Embodiment** means the robot's body: its arm kinematics, gripper, sensors. Cross-embodiment transfer moves a lesson between different bodies, including from a human hand to a robot gripper.

    ### Poses and rigid transforms { #primer-se3 }

    A **pose** says where a frame is and which way it faces. In 3D it's an element of \(SE(3)\), written as a 4×4 matrix \(\begin{bmatrix} R & \mathbf p\\ 0 & 1\end{bmatrix}\) with rotation \(R\) and position \(\mathbf p\). The notation \({}^{W}T_{X}\) means "the pose of frame \(X\) in world frame \(W\)".

    Two rules are all you need. Composing poses is matrix multiplication; undoing a pose is the inverse. So \(\bigl({}^{W}T_{O}\bigr)^{-1}\,{}^{W}T_{E}\) is "where the gripper \(E\) is, as seen from the object \(O\)": a **relative pose**.

    We'll use the 2D version, \(SE(2)\), with poses \((x, y, \text{heading})\). Same rules, numbers you can do by hand.

    ### World models { #primer-wm }

    A **world model** predicts what comes next (future images, or a compressed latent of them) from the current history, sometimes given candidate actions. Robots use one in two ways (§3.3): generate the future you *want* and decode actions that realize it, or imagine what each candidate action *would* cause and pick the best. A **world-action model** predicts video and actions jointly.

## The problem { #problem }

The field has a vocabulary problem. "Learns from one demo" covers methods that replay a recorded motion, methods that feed a video to a transformer, methods that imagine the future, and LLM agents that write code. They fail in different ways and need different tests, yet they're compared as if they were one thing.

Here's a concrete failure. Suppose a video-to-plan system turns your demo into an outline: *pick plate, place tray; pick plate, place tray; pick bushing…*. The order survives. Now suppose your demo also showed gripping a mug **by its handle**. A generic `pick(mug)` request drops that, and the executor can't recover a contact requirement that was omitted during interpretation (§2.4, §3 intro). The survey's version: placing an object at the correct destination can still violate a required handle grasp (§1).

!!! paper "The paper says (§1)"
    Existing reviews organize learning from demonstration by teaching interface and learned policy, reward or plan; ICL and in-context RL reviews focus on language models and interaction; robotics reviews cover human video, VLA architectures, data, embodiment or world models separately (Table C1). The organizing question here is how new evidence resolves what existing competence leaves undetermined, and how that resolution survives physical execution.

The literature is also young and moving fast. Of the 412 references, 297 first appeared in 2024 or later, and 197 in the first nine months of 2026 (§2.4, Fig. 9).

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/census.svg"
<figcaption><strong>What to notice:</strong> nearly half the survey's references (197 of 412) are from a partial 2026. Much of what it maps hasn't been through peer review yet. Numbers from Supplement S1's annual counts, which match Fig. 9.</figcaption>
</figure>

!!! take "Our take"
    The sharpest move is refusing to classify by architecture. "A transformer that reads demos" says nothing about whether the demo's handle grasp reaches the motors. Classifying by the **intermediate that execution consumes** tells you exactly where to look for the loss.

!!! predict "Pause and predict"
    You want to know whether a policy actually uses its demo. Keep the robot's scene fixed and run two tests: (1) swap in a demo with the **opposite order**; (2) swap in a demo of the **same order** recorded by a different person in a different room. What should happen in each if the policy really reads the demo?

    ??? answer "Reveal"
        (1) The behaviour should **change**: the robot should now put bushings first. (2) The behaviour should **stay the same**. The survey calls these meaning-changing and meaning-preserving interventions (§7.1). The tempting wrong answer is "success rate should stay high in both". It probably will, which is exactly why success rate alone can't answer the question.

So the problem is a missing map plus a missing test. What does the map look like?
{ .rd-next }

## Part II: What and how { .rd-part }

## ⚡ The big idea { #big-idea }

**Follow the lesson to the motor.** Whatever the robot is taught, the evidence must travel through some intermediate before it becomes motion. Ask what that intermediate is, and whether the distinction you taught (the order, the handle, the pause) is still inside it when it arrives (§3 intro, §9).

There are four doors, and a mnemonic for them: **ARFS**.

| Door | Paper's family | The evidence becomes… | It works if… (Table 2) |
|---|---|---|---|
| **Act** | context-conditioned policies | an action distribution | the learned representation keeps the taught distinction |
| **Retarget** | geometric demonstration transfer | a motion or contact reference | the matched interaction still applies |
| **Forecast** | world-model-based control | a predicted future | that future is physically realizable |
| **Script** | skill- and agent-based execution | a skill sequence, program or tool call | the available skills preserve the task's constraints |

!!! predict "Pause and predict"
    Your demo's whole point is "grip the mug by its handle". Which door exposes that requirement most directly, and which is most at risk of silently dropping it?

    ??? answer "Reveal"
        **Retarget** exposes it: the contact location *is* the reference being transferred (§3.2). **Script** is most at risk if its skills take only an object name: "a generic pick-and-place request can erase either distinction" (§3 intro). It's fine if the skill accepts a grasp argument; that's the point of asking what the intermediate keeps. Act and Forecast can carry it implicitly, which is exactly why it's hard to check.

## How it works: the map, region by region { #how-it-works }

### Where ICL sits: six learning horizons

The survey places ICL on a ladder of six horizons (§2.1, Fig. 1). The bottom two build competence. The middle two are the survey's subject. The top two are where the authors want the field to go.

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/horizons.svg"
<figcaption><strong>What to notice:</strong> S3 and S4 both keep neural weights fixed; they differ in the source of evidence. S3 learns from what interaction reveals (a tighter fit, more friction); S4 learns from what someone teaches (a new order). A packing task can need both (§2.1).</figcaption>
</figure>

S5, **physical recursive self-improvement**, is when experience improves how the *next* task is learned. S6, **collective knowledge evolution**, extends that to robots exchanging verified lessons across different bodies (§2.1, §8.5).

### The shared interface (Eqs. 1–3)

Every method in the survey fits one policy interface (§2.2):

\[
A_t \sim \pi_\theta\!\left(\,\cdot \mid h_t, C_t\right) \qquad \text{(Eq. 1)}
\]

| Symbol | Meaning | Type |
|---|---|---|
| \(h_t=(o_1,a_1,\dots,a_{t-1},o_t)\) | history of this attempt | sequence |
| \(o_t\) | observation: images, joints, force, feedback messages | multimodal |
| \(C_t\) | context: instructions, support demos \(D^{\mathrm s}\), corrections, retrieved episodes, memory | anything |
| \(A_t=(\hat a_{t\mid t},\dots,\hat a_{t+H-1\mid t})\) | proposed action block of horizon \(H\) | \(H\times\) action size |
| \(\theta\) | all deployed neural parameters | fixed |

**In words:** the policy proposes the next chunk from what it has seen in this attempt plus whatever context it was given.

**Tiny example:** with \(H=4\) and 7-number actions, \(A_t\) is 28 numbers. The robot executes 2 of the 4, takes 2 new observations, and asks again. Only those 2 executed actions enter \(h\).

What makes this *in-context* learning is the update rule during deployment (§2.2):

\[
\theta_{t+1}=\theta_t=\theta_0,\qquad h_{t+1}=(h_t,a_t,o_{t+1}) \qquad \text{(Eq. 3)}
\]

**In words:** the weights never move; only the history (and context) grows.

**Tiny example:** after 3 decisions with one executed action each, \(\theta\) is still \(\theta_0\), and \(h\) has grown from \((o_1)\) to \((o_1,a_1,o_2,a_2,o_3,a_3,o_4)\). Anything the robot "learned" in those 3 steps lives in that sequence and in \(C\).

When the context itself carries state, it gets its own update, \(C_{t+1}=U_\theta(C_t,o_t,a_t,o_{t+1})\) (Eq. 2): for example, ticking off a completed placement. Updating any neural component at deployment, even a small one, is parameter adaptation by the survey's definition (§2.2).

### ⚡ Four doors in five minutes { #four-doors }

The same plate-first demo can go through any of four doors. Here's what each does with it.

1. **Act.** A network reads the demo and the robot's history and directly outputs actions. The demo's order has to survive *inside the network's features*; you can't inspect it. Examples: ICRT, Instant Policy, S1, GEN-1.5 (§3.1).
2. **Retarget.** Extract the demo's motion relative to an object ("10 cm behind the mug, facing it"), re-anchor it on the object in the current scene, and track it. The contact is explicit and inspectable, but it assumes that interaction still makes sense on the new object (§3.2).
3. **Forecast.** Predict the future the demo implies ("red block placed before blue, *in this scene*"), then decode actions that make it happen, or score candidate actions by the futures they'd cause. The plan is visible, but it may be physically unreachable (§3.3).
4. **Script.** Turn the demo into a procedure for an existing executor: `pick(plate); place(tray)…`, or a program, or tool calls from an LLM agent. Order and preconditions are explicit; contact detail survives only if the skills' arguments carry it (§3.4).

Every door also depends on two shared mechanisms. **Correspondence** says which demo object or phase matches which current one. **Memory** keeps the evidence (and progress) until it's needed (§3.5).

The trade-off in one line: each door relocates the generalization burden, to the learned interpreter, the matched interaction, the future model, or the supplied executor (§3.4, last paragraph).

### Door 1, Act: context-conditioned policies (Eqs. 4–6)

**Start with the simplest thing that could work: copy.** Encode the current scene, find the stored demonstration states that look most similar, and return their recorded actions (§3.1; VINN is the classic example):

\[
\pi_\theta(\,\cdot\mid h_t,C_t)=\sum_{j\in J_t}\beta_{tj}\,\delta_{\bar A_j},\qquad \beta_{tj}\ge 0,\ \sum_j\beta_{tj}=1 \qquad \text{(Eq. 5)}
\]

| Symbol | Meaning |
|---|---|
| \(J_t\) | indices of the retrieved records |
| \(\bar A_j\) | the action block stored in record \(j\) |
| \(\beta_{tj}\) | how much record \(j\) counts for this query |
| \(\delta_{\bar A_j}\) | "output exactly \(\bar A_j\)" (a point mass) |

**Tiny example:** two retrieved records with (1-D) action blocks \(\bar A_1=[0.10, 0.20]\) and \(\bar A_2=[0.30, 0.40]\), weights 0.75 and 0.25. The sampling version outputs \(\bar A_1\) three times in four. The averaging variant outputs \(0.75\cdot[0.10,0.20]+0.25\cdot[0.30,0.40]=[0.15, 0.25]\). Averaging needs compatible coordinates: you can't average "gripper open" with "gripper closed" (§3.1).

**What breaks:** copying works only when the archive covers the situation and the recorded actions mean the same thing on this robot. **Fix: learn to interpret the demo instead of copying it.**

\[
r_t=E^{\mathrm c}_\theta(h_t,C_t),\qquad \pi_\theta(A_t\mid h_t,C_t)=q^{\mathrm a}_\theta(A_t\mid h_t,r_t) \qquad \text{(Eq. 4)}
\]

An interpreter \(E^{\mathrm c}_\theta\) compresses the context into a representation \(r_t\); an action generator \(q^{\mathrm a}_\theta\) (autoregressive tokens, diffusion or flow) turns it into a chunk. The requirement is blunt: \(r_t\) must keep whatever the demo taught. If the demo says red-then-blue, \(r_t\) must preserve that order while the generator adapts the reach to the current scene (§3.1).

A common interpreter is an attention read over the demo's elements (§3.1):

\[
\alpha_{ti}=\frac{\exp s_\theta(h_t,d^{\mathrm s}_i)}{\sum_{k=1}^{L}\exp s_\theta(h_t,d^{\mathrm s}_k)},\qquad r_t=\sum_{i=1}^{L}\alpha_{ti}\,e_\theta(d^{\mathrm s}_i) \qquad \text{(Eq. 6)}
\]

| Symbol | Meaning | Shape |
|---|---|---|
| \(d^{\mathrm s}_i\) | element \(i\) of the support demo (a frame, or a frame with its action) | — |
| \(L\) | number of demo elements | scalar |
| \(s_\theta\) | score: how relevant is element \(i\) to where I am now? | scalar per element |
| \(\alpha_{ti}\) | normalized relevance at decision \(t\) | \(L\) |
| \(e_\theta(d^{\mathrm s}_i)\) | encoded element | \(d\) |
| \(r_t\) | what gets read | \(d\) |

**In words:** look over the demo, weight each moment by how relevant it is to the robot's current situation, and read a blend. Because the weights depend on \(h_t\), the read can move through the demo as the robot progresses.

**Tiny example:** a 3-element demo (reach, grasp, place) and the robot is mid-reach. Scores \((2.0, 0.0, -1.0)\) give \(e^{2}=7.389\), \(e^{0}=1\), \(e^{-1}=0.368\), so \(\alpha=(0.844, 0.114, 0.042)\). With 2-D features \(e(d_1)=(1,0)\), \(e(d_2)=(0,1)\), \(e(d_3)=(1,1)\): \(r_t=(0.844+0.042,\ 0.114+0.042)=(0.886, 0.156)\). It's mostly reading "reach".

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/shapes.svg"
<figcaption><strong>What to notice:</strong> the demo enters as L separate elements and leaves as one d-vector; that squeeze is where a taught distinction can be lost. Sizes are illustrative (the survey doesn't fix them); 7 = 6 pose numbers + 1 gripper.</figcaption>
</figure>

!!! bridge "Speech bridge"
    Aligning a robot's progress to a demo is the old template-matching problem from isolated-word recognition: warp one sequence onto another that runs at a different speed. ICI-VLA literally supervises its demo retriever with dynamic time warping (§3.1). **Where it breaks:** DTW aligns two passive recordings. The robot's own actions change the query sequence it's aligning, and a slip can send it back to an earlier phase, so the alignment must be recomputed online and need not be monotonic.

Act-style policies can also read *interaction* instead of teaching: RMA infers a latent for the current body's dynamics from recent state–action history, so the goal stays fixed while the realization adapts (§3.1, §6.4). That's horizon S3.

Two findings from §3.1 are worth remembering. In REGENT's unseen-MuJoCo-embodiment comparison, **Retrieve-and-Play beat the frozen learned transformer**: plain copying transferred better than learned interpretation under that shift. And in KAT, a text-pretrained model reading keypoint–action examples was competitive with few demos, while training a diffusion policy won with more: the best adaptation mechanism depends on the teaching budget.

### Door 2, Retarget: geometric demonstration transfer (Eqs. 7–8)

**What breaks with Act:** the taught contact is hidden in features. If the requirement is "this handle, this approach", you'd rather carry it explicitly. Geometric transfer does (§3.2):

\[
\zeta_{1:L}=E^{\mathrm m}_\theta(D^{\mathrm s}),\qquad g=\operatorname{Retarget}(\zeta_{1:L},o_t,\mathcal B),\qquad A_t=\kappa(g,o_t) \qquad \text{(Eq. 7)}
\]

Extract a motion descriptor \(\zeta_i\) per demo element (hand poses, object-relative poses, contact points); retarget the sequence to the current scene \(o_t\) and robot description \(\mathcal B\) (kinematics, limits); hand the reference \(g\) to a tracker \(\kappa\). The neural parts stay frozen; only fitted poses change.

For a rigid object, retargeting is one line of pose algebra (§3.2):

\[
{}^{W}T^{\mathrm q}_{E,b}(\sigma)={}^{W}T^{\mathrm q}_{O_b}\bigl({}^{W}T^{\mathrm s}_{O_b}\bigr)^{-1}{}^{W}T^{\mathrm s}_{E,b}(\sigma) \qquad \text{(Eq. 8)}
\]

| Symbol | Meaning |
|---|---|
| \(E\), \(O_b\) | end effector; reference object for motion segment \(b\) |
| s, q | demo scene; query (current) scene |
| \(\sigma\in[0,1]\) | progress through the segment |
| \(\bigl({}^{W}T^{\mathrm s}_{O_b}\bigr)^{-1}{}^{W}T^{\mathrm s}_{E,b}\) | the gripper's pose *relative to the object* in the demo |

**In words:** compute where the gripper was relative to the object in the demo, then stamp that relative pose onto the object wherever it is now.

**Worked by hand (2D):** in the demo, the object is at \((0.40, 0.20, 0°)\) and the gripper waits at \((0.40, 0.10, 90°)\), 10 cm below it, facing up.

1. Relative pose: undo the object's pose. The gripper sits at \((0, -0.10)\) in the object's frame, turned \(+90°\) relative to it.
2. In the query, the object has moved to \((0.60, 0.50)\) and turned \(90°\). Rotate the offset \((0, -0.10)\) by \(90°\): \((x,y)\mapsto(x\cos 90° - y\sin 90°,\ x\sin 90° + y\cos 90°)=(0.10, 0)\).
3. Add it to the object's position: \((0.70, 0.50)\). Heading: \(90°+90°=180°\).

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/se2-example.svg"
<figcaption><strong>What to notice:</strong> the world coordinates of the gripper change completely, but its relationship to the object (10 cm along the object's −y axis, facing it) is preserved exactly. That relationship is what Eq. 8 transfers. We verified the numbers with a 3×3 matrix computation.</figcaption>
</figure>

**What breaks:** Eq. 8 assumes the reference object doesn't move during the segment and that the same relative motion still applies. A different handle, a deforming cloth, or a receptacle that moves independently breaks it. The fixes in §3.2 replace "the whole object" with *the part that matters*: SemAnCorr propagates semantic surface anchors, FUNCTO matches functional keypoints (where to grasp, where the working end is), R-NDF aligns task-relevant local frames on *both* interacting objects. And because each reference is just data, a repertoire scales: MT3 reaches 1,000 single-interaction tasks from under 24 hours of demonstration time (§3.2).

??? deep "Deep dive: closing the loop with visual servoing (Eq. 16)"
    Once interpretation yields a desired pose or feature configuration, a classical controller can track it (§3.5):

    \[
    \boldsymbol e_t=\boldsymbol s_t-\boldsymbol s^\star_t,\qquad \dot{\boldsymbol q}_t=-k_{\mathrm{vs}}\,J^{\dagger}_{\mathrm{vis},t}\,\boldsymbol e_t
    \]

    \(\boldsymbol s_t\) are current visual features, \(\boldsymbol s^\star_t\) the desired ones, \(J_{\mathrm{vis}}\) the feature Jacobian (how features move when joints move), \(\dagger\) its pseudoinverse, \(k_{\mathrm{vs}}>0\) a gain, \(\dot{\boldsymbol q}\) joint velocity. Context sets \(\boldsymbol s^\star\); feedback corrects the realization. Tiny example: one feature 4 px right of target, \(J=2\) px per rad, \(k=0.5\): \(\dot q=-0.5\cdot\tfrac12\cdot 4=-1\) rad/s, moving the feature left.

### Door 3, Forecast: world-model-based control (Eqs. 9–11)

**What breaks with Retarget:** a reference says *how* to move, not *what should result*. For a new procedure in a new scene you may want to see the consequence first. World-model control predicts it (§3.3):

\[
v^+\sim p^{\mathrm v}_\theta(\,\cdot\mid C_t,h_t),\qquad A_t\sim q^{\mathrm v}_\theta(\,\cdot\mid v^+,C_t,h_t) \qquad \text{(Eq. 9)}
\]

\(v^+\) is an anticipated future (robot-view frames, or a latent of them). The predictor \(p^{\mathrm v}\) imagines the evolution the demo calls for *in this scene*; the decoder \(q^{\mathrm v}\) produces actions that realize it. Eq. 10 just averages this over possible futures, \(\pi=\int q^{\mathrm v}\,p^{\mathrm v}\,\mathrm dv^+\). The defining property is that action depends on a predicted consequence.

The second form flips the roles: candidate actions propose futures, and the context says which future is wanted (§3.3):

\[
A^\star_t\in\arg\max_{\widehat A_t\in\mathcal A_t}\ \mathbb E_{v^+\sim p^{\mathrm d}_\theta(\cdot\mid h_t,\widehat A_t,C_t)}\bigl[\mathcal R(v^+,C_t)\bigr] \qquad \text{(Eq. 11)}
\]

**Tiny example:** two candidate blocks. The dynamics model says candidate 1 ends with a plate in the tray first with probability 0.8, and candidate 2 with probability 0.3. If \(\mathcal R=1\) when the predicted tray matches the demo's order and 0 otherwise, the expected scores are 0.8 and 0.3, so pick candidate 1. Learned dynamics predicts *what an action causes*; teaching decides *which consequence is good*.

**What breaks:** a predicted scene can express the right intention yet be unreachable, miss a needed contact, or drift (§3.3). Demo-JEPA shows the trade-off is not one-directional: on its real robot, a learned action head beat latent planning on familiar behaviour, while planning won on unseen tasks; in simulation the familiar-task advantage disappeared (§3.3).

??? deep "Deep dive: prediction during training only (Eq. 12) is a different thing"
    Many policies add an auxiliary future-prediction loss, \(\theta^\star\in\arg\min_\theta[\mathcal L_a(\theta)+\lambda\mathcal L_v(\theta)]\), then drop the prediction head at deployment (§3.3, Fig. 11). That makes a better *Act* policy, not a Forecast one: at deployment no action depends on a predicted future. The survey classifies by the deployed path, so these stay in Door 1.

### Door 4, Script: skill- and agent-based execution (Eqs. 13–15)

**What breaks with Forecast:** long procedures with many steps and preconditions are awkward to express as one imagined video. Write the procedure down instead, and let an existing executor realize it (§3.4):

\[
g=f_\theta(C_t,h_t),\qquad A_t=\kappa(g,o_t) \qquad \text{(Eq. 13)}
\]

\(f_\theta\) turns context into an execution specification \(g\) (code, spatial targets, a skill sequence); \(\kappa\) executes it. Eq. 14 is the stochastic version. Eq. 15 names the two branches:

\[
\text{skills: } g=(z_1,\dots,z_{N_g}),\ A_t=\kappa(z_{\ell_t},o_t);\qquad \text{programs: } g=f_\theta(C_t,h_t),\ A_t=\operatorname{Run}(g,h_t)
\]

**Tiny example:** the plate-first demo becomes \(g=\) `[pick(plate,1), place(tray), pick(plate,2), place(tray), pick(bushing,1), …]`, so \(N_g=10\) skills and \(\ell_t\) points at the active one. An LLM agent instead emits one tool call at a time, reads the result, and decides the next.

The line runs from Neural Task Programming in 2017 (a demo instantiates a hierarchy whose leaves call robot routines) through Code as Policies in 2022 (command–program examples teach an LLM to write perception and control code) to Show-Harness in 2026 (video frames become a textual outline for an unchanged planner) (§3.4).

**What breaks:** the survey names it *portability versus physical detail*. A compact procedure crosses scenes and bodies but can omit a required grasp or compliance condition, and the executor can only recompute details the teaching left open (§3.4). The command interface also shapes what success means: improved success may reflect a stronger supplied executor as well as better contextual inference (§3.4).

!!! predict "Pause and predict"
    Doors 1 → 4 each fixed a problem with the previous one. Does Door 4's weakness send you back to an earlier door?

    ??? answer "Reveal"
        Yes: Script's weakness (dropped contact detail) is exactly what Retarget is good at. That's why hybrids are common: "a program can invoke a geometric tracker" (§3.4). DualManip, for instance, keeps semantic reasoning for the procedure and live geometric correspondence for grasp contacts. The doors aren't a ranking; they're a menu of where to put the burden.

### Shared mechanism 1: correspondence

All four doors must bind the demo to the current scene, including when objects are replaced. The survey's pouring example (§3.5, Table 6):

| What changes | Held vessel | Receiver | What the motion must adjust |
|---|---|---|---|
| Held vessel | jug → bottle | same cup | grasp; tilt angle |
| Receiver | same jug | cup → bowl | pouring position; height |
| Both | jug → bottle | cup → bowl | grasp; tilt; position, all coupled |

The goal, "liquid goes into the receiver", is preserved in all three; the motion changes in all three. Which details are **binding** is a task choice: "transfer the contents" allows any vessel, "use the handle" does not (§3.5).

### Shared mechanism 2: memory (Eqs. 17–18)

Memory has to answer three questions: which fact matters, how to recover it, and **when it stops being valid** (§3.5). The general read–update loop:

\[
m_{t+1}=u_\theta(m_t,x_t),\quad M_{t+1}=w_\theta(M_t,x_t),\quad R_t=\rho_\theta(h_t,M_t),\quad C_t=b_\theta(C^{\text{task}}_t,m_t,R_t) \qquad \text{(Eq. 17)}
\]

A recurrent state \(m_t\) and an external archive \(M_t\) both absorb each executed transition \(x_t=(o_t,a_t,o_{t+1})\); retrieval \(\rho\) picks records \(R_t\); a builder \(b\) assembles the policy's context from the supplied task evidence, the state and the retrieved records. Stored memory and the context actually shown to the policy are different things.

Retrieval under a budget (§3.5):

\[
J_t\in\arg\max_{J\subseteq\{1..N_t\},\,|J|\le K}\ \sum_{j\in J}\bigl[s_\theta(h_t,\xi_j)-\eta\bigr] \qquad \text{(Eq. 18)}
\]

**Tiny example:** four archive records score \((0.9, 0.2, 0.7, 0.4)\) against the current history, with threshold \(\eta=0.5\) and budget \(K=2\). The margins are \((0.4, -0.3, 0.2, -0.1)\), so pick records 1 and 3. With \(K=1\), only record 1. If every score were below 0.5, the best set would be **empty**: nothing relevant, so fall back or go look (§3.5).

Different kinds of evidence expire at different times (§3.5, Table 7):

| Information role | Example | Recheck after… |
|---|---|---|
| Task specification | plate-first order | a new task or correction |
| Correspondence | matched target or phase | the object or execution phase changes |
| Physical response | how this connector resists | a tool, material or contact change |
| Execution state | "plate 1 placed" | a new action, observation or scene reset |

A moved part invalidates its remembered pose but leaves the taught order intact (§3.5).

### Retaining lessons outside the network (Eqs. 19–20)

With weights frozen, a system can still improve across attempts by revising external artifacts \(B_n\): memory records, skill code, controller code and settings (§3.6):

\[
\widetilde B_{n+1}\sim F_\theta(\cdot\mid B_n,\mathcal T_n),\qquad B_{n+1}=\begin{cases}\widetilde B_{n+1}, & \chi_n=1\\ B_n, & \chi_n=0\end{cases},\qquad \theta=\theta_0 \qquad \text{(Eq. 19)}
\]

A frozen model \(F_\theta\) reads attempt \(n\)'s trace and feedback \(\mathcal T_n\) and proposes revised artifacts; a validation step sets \(\chi_n\) to accept (1) or reject (0). Eq. 20 then distinguishes **guidance reuse** (artifacts change the context) from **executable reuse** (artifacts change the program or skill library).

**One pass by hand:** attempt 1 places a bushing first, and the human says "plates first". \(F_\theta\) proposes \(\widetilde B_2=B_1+\) the rule "plates before bushings". A validation rollout follows the rule and succeeds, so \(\chi_1=1\) and \(B_2=\widetilde B_2\). In a new layout the same frozen policy reads that rule from its context and fills the plates first (§8.4, Fig. 26). Had validation failed, \(B_2=B_1\).

RoboRSI gives a sense of scale for executable reuse: with its retained code library on vs off, 174/600 vs 129/600 successes over 120 tasks × 5 layouts (§3.6).

### How context use is learned (Eq. 21)

A network doesn't read context because it *can*; it reads it because training made reading pay off. The standard objective pairs a support demo with a query execution of the same task specification \(\psi\) (§4.2):

\[
\mathcal L(\theta)=\mathbb E_{(D^{\mathrm s},\tau^{\mathrm q})\sim P_{\text{pair}}}\left[\frac{1}{|I^{\mathrm q}|}\sum_{t\in I^{\mathrm q}}\ell_\theta\!\left(A^{\mathrm q}_t;h^{\mathrm q}_t,D^{\mathrm s}\right)\right] \qquad \text{(Eq. 21)}
\]

| Symbol | Meaning |
|---|---|
| \(P_{\text{pair}}\) | samples a support demo and a query trajectory sharing task spec \(\psi\) (objects, timing or body may differ) |
| \(I^{\mathrm q}\) | query positions with complete action targets |
| \(A^{\mathrm q}_t\) | recorded target block \(a^{\mathrm q}_{t:t+H-1}\) |
| \(\ell_\theta\) | any action loss: likelihood, regression, denoising, flow matching |

**Tiny example:** one pair with 3 supervised positions and per-position losses 0.2, 0.4, 0.3 contributes their mean, 0.3; the objective averages that over many pairs.

**The catch** (§4.2): if the current scene already determines every target action, this loss can be driven to zero **without ever reading \(D^{\mathrm s}\)**. Demos only become useful when comparable scenes admit different valid procedures, so the pairing rule must keep the distinction you want the demo to teach. Pair everything labelled "put the object away" and you keep the destination but erase grasp and route preferences. The toy below shows this happening.

### Pseudocode: deploy and train

=== "Deployment (weights frozen)"

    ```text
    θ ← θ0                                   # never updated (Eq. 3)
    C ← build_context(teaching, retrieve(h, M))   # Eqs. 17–18
    h ← [o1]
    while not done:
        A ← sample π_θ(· | h, C)            # Eq. 1: an H-step block, via one of the four doors
        for a in A[:k]:                      # execute only the first k actions
            o' ← robot.step(a)
            h ← h + [a, o']                  # history grows
            C ← update(C, o, a, o')          # Eq. 2, if context carries state
            if correction arrives: C ← C + correction
    M ← M + this attempt; B ← revise(B) if validated   # Eq. 19, between attempts
    ```

=== "Training context use (Eq. 21)"

    ```text
    for step in range(steps):
        Ds, τq ← sample_pair(P_pair)        # same task spec ψ, different scene/objects/body
        loss ← mean over t in I_q of ℓθ(A_t^q ; h_t^q, Ds)
        θ ← θ − lr · ∇θ loss
    # Check: do comparable scenes in the data need DIFFERENT actions? If not, Ds can be ignored.
    ```

So the map is drawn and the training rule is clear. Can a tiny network actually learn to ignore a demo?
{ .rd-next }

## Build a toy version { #toy }

The survey's most central technique is a demo-conditioned policy (Door 1) trained with Eq. 21. Its most central *warning* is that training data decides whether the demo gets read at all (§4.2), and that only context interventions reveal it (§7.1). The toy shows both.

**Setup.** A point robot must visit a red and a blue target. A demo, recorded in a *different* random scene, shows the order (2 keyframes: position visited, colour, step). The policy reads the demo with the attention of Eq. 6 and regresses the next waypoint (Eq. 21 with an MSE loss). Same model, two training sets:

- **Shortcut scenes:** the first target is always the left one, so the scene alone gives the order away (like a LIBERO layout revealing the task).
- **Ambiguous scenes:** target positions are independent of the order; only the demo says which comes first.

Both are then tested on scenes where the left-first cue is uninformative, with the survey's interventions: a **same-order** demo from another scene (meaning-preserving), a **flipped** demo (meaning-changing), and a zero-filled "no demo".

!!! take "Educational simplification"
    This keeps the mechanism (support–query pairing, an attention read over demo elements, an action head) and drops everything else: images, real dynamics, action chunks, multiple robots, language. It's a 2-D point, two targets, two decisions. It is not any surveyed method's implementation.

??? deep "The code (69 lines, PyTorch, CPU, about 22 seconds for 3 seeds)"

    ```python
    --8<-- "papers/2609.36012-robot-icl/assets/toy.py"
    ```

Real output, three seeds:

```text
seed 0 shortcut  | both reached 0.75 | follows demo: cue agrees 1.00, cue clashes 0.25 | same-order demo keeps move 1.00 | flipped demo flips move 0.51 | zero demo hits a target 0.02
   attention: mean |alpha - 0.5| = 0.086; forced to exactly 0.5, the first move follows the demo 0.50
seed 0 ambiguous | both reached 1.00 | follows demo: cue agrees 1.00, cue clashes 1.00 | same-order demo keeps move 1.00 | flipped demo flips move 1.00 | zero demo hits a target 0.00
   attention: mean |alpha - 0.5| = 0.084; forced to exactly 0.5, the first move follows the demo 0.51
seed 1 shortcut  | both reached 0.74 | follows demo: cue agrees 1.00, cue clashes 0.25 | same-order demo keeps move 1.00 | flipped demo flips move 0.51 | zero demo hits a target 0.26
   attention: mean |alpha - 0.5| = 0.104; forced to exactly 0.5, the first move follows the demo 0.51
seed 1 ambiguous | both reached 1.00 | follows demo: cue agrees 1.00, cue clashes 1.00 | same-order demo keeps move 1.00 | flipped demo flips move 1.00 | zero demo hits a target 0.18
   attention: mean |alpha - 0.5| = 0.086; forced to exactly 0.5, the first move follows the demo 0.50
seed 2 shortcut  | both reached 0.83 | follows demo: cue agrees 1.00, cue clashes 0.67 | same-order demo keeps move 0.99 | flipped demo flips move 0.92 | zero demo hits a target 0.34
   attention: mean |alpha - 0.5| = 0.316; forced to exactly 0.5, the first move follows the demo 0.51
seed 2 ambiguous | both reached 1.00 | follows demo: cue agrees 1.00, cue clashes 1.00 | same-order demo keeps move 1.00 | flipped demo flips move 1.00 | zero demo hits a target 0.39
   attention: mean |alpha - 0.5| = 0.084; forced to exactly 0.5, the first move follows the demo 0.50
```

What it shows, laid out:

| Metric (test scenes where "left first" is uninformative) | Shortcut-trained | Ambiguous-trained |
|---|---|---|
| Both targets reached | 0.74–0.83 | 1.00 |
| Follows the demo when the scene cue **agrees** | 1.00 | 1.00 |
| Follows the demo when the scene cue **clashes** | 0.25, 0.25, 0.67 | 1.00 |
| Flipped demo flips the first move | 0.51, 0.51, 0.92 | 1.00 |
| Same-order demo keeps the first move | 0.99–1.00 | 1.00 |
| Zero-filled "no demo": first move hits a target | 0.02–0.34 | 0.00–0.39 |

Four lessons, each matching a point in the survey:

1. **The data decides whether the demo is read.** Both models reach zero training loss. Only the one trained on scenes with several valid orders learned to depend on the demo (§4.2).
2. **Agreement hides the problem.** When scene and demo agree, both models look perfect (1.00). Only the clash cases and the flipped-demo test expose the shortcut, which is why the survey asks for demos that specify *another feasible behaviour in the same scene* (§7.1).
3. **A zero-filled demo is not "no demo".** Both models produce nonsense on an all-zeros context, with results that swing across seeds. An input outside the policy's format tests robustness to garbage, not reliance on context; the survey's warning is to keep the valid input format and "distinguish a missing measurement from a measured zero" (§7.3).
4. **Attention weights didn't explain the read.** The weights hover around 0.5 (mean deviation 0.08–0.10) with no human-readable pattern. Yet forcing them to exactly 0.5 drops demo-following to chance (0.50–0.51), so the order *does* travel through the Eq. 6 read. Don't read the alignment off \(\alpha\); intervene on the input instead.

!!! take "Our take"
    The shortcut model is the dangerous one: it isn't demo-blind, just unreliable. With seed 2 it followed clashing demos 67% of the time; with seeds 0 and 1, 25%. A benchmark whose scenes always agree with the demos would score all six runs identically.

## Paper ↔ code map: the companion materials { #code-map }

This is a survey, so there's no method code. The arXiv comment links a GitHub repository and project page; the arXiv source also ships a reproducibility supplement (S1). Here's what each contains and how it maps to the paper.

| Paper part | Companion material | Notes |
|---|---|---|
| §3.1–3.4, four families | [README sections 01–04](https://github.com/JethroJames/awesome-robots-icl/blob/56e824e5d2885d3c22a06b724dfcf2e71b3141e7/README.md) | tables of papers with links, newest first, with sub-headings close to the paper's |
| §6.2 navigation, Table 13 | README section 05 "Navigation: four context types" | same four context types as Table 13 |
| §8.5, Table 19 | README section 06 "Physical self-improvement" | same four update targets as Table 19 |
| §3.5, §4, §5, §7 | README sections 07–11 | correspondence/memory, data, training, grounding, benchmarks |
| §2.4, Fig. 9, App. A | Supplement S1: `references.csv`, `corpus.csv`, count files, `reproduce.py` | one row per reference with date, role, family and a written coding reason |
| §7.2, Table 16 | Supplement S1: `reported-comparisons.csv`, `REPORTED-COMPARISONS.md` | the 14 comparisons with section/table locations in each source paper |

!!! code "What we checked (repo at [`56e824e`](https://github.com/JethroJames/awesome-robots-icl/tree/56e824e5d2885d3c22a06b724dfcf2e71b3141e7), MIT license)"
    The README has 500 table rows covering 469 distinct works. Matching their internal keys against the paper's bibliography: 397 are in the paper, 72 are list-only additions, and 15 of the paper's 412 references aren't listed. Expect the list to keep drifting from the frozen v1 PDF; the README says it welcomes additions.

!!! code "What we ran (Supplement S1, `reproduce.py`)"
    `python3 reproduce.py` printed `Verified 412 references and 260 method references in four families.` The script is three lines. It checks that reference numbers are unique and contiguous, that the year and role counts match the summary file, and that the 260 method entries are exactly those with a family label. It does **not** check that any label is correct.

**What's missing.** There's no second coder and no agreement statistic for the family labels; we searched the supplement for any. There are no search strings or screening counts: the review uses "targeted updates" and citation chaining (§2.4). And the per-reference coding reasons are there to audit, but nobody has audited them yet.

## Part III: Does it actually work? { .rd-part }

## ⚡ The evidence { #evidence }

A survey runs no experiments of its own, so "does it work" splits in two. Does the field's evidence support the survey's central claims? And is the map itself sound? The second question is Part IV. Here's the first.

**The metrics you'll meet.**

- **SR (success rate, %)**: the share of episodes meeting a task-specific success check. Higher is better. With 20–50 episodes per condition, a few points is noise.
- **pp**: percentage points, the difference between two rates.
- **Chamfer distance (px)**: for drawings, the average distance from each drawn point to the nearest target point and back. Lower is better.
- **Cumulative per-step success** (S1): progress credit summed over steps, *including* steps a human had to recover (§4.2).
- **Fractions like 21/50**: successes out of trials, from small real-robot studies.

**How to read Table 16.** Each row is a *within-study* contrast: one factor changed, everything else as in that paper. Compare before→after inside a row, never across rows; the settings differ wildly (simulation vs real, 3 seeds vs 1 task). The three groups match the survey's three evaluation questions: does changed evidence change behaviour (I), does it survive physical transfer (II), does retained experience help later (III) (§7, §7.2).

<div class="rd-widget" id="rd-evidence" role="group" aria-label="Explorer for the survey's 14 reported comparisons"><noscript>This widget needs JavaScript.</noscript></div>
<script src="assets/widget-evidence.js"></script>
<p class="rd-widget-caption"><strong>Try this:</strong> press Group III, then choose FARE in the menu: always searching for a better history (91.0%, the small violet dot) does <em>worse</em> than the base policy (91.5%), so more recovery effort hurt. Then choose LMPC, the only row where weights change between sessions. Numbers from Table 16; fractions converted to %.</p>

### Diversity of teaching beats volume

The cleanest controlled result is BPP's. With a fixed budget of 10,000 drawing demos, spreading them over more tasks with fewer demos each steadily lowers error (§4.2, Fig. 15a):

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/bpp.svg"
<figcaption><strong>What to notice:</strong> the total number of demos is identical in all three bars; only how many distinct tasks they cover changes. Quadrupling the task count cut error by almost two-thirds (9.5 → 3.4 px). Numbers from §4.2, averaged over three seeds.</figcaption>
</figure>

!!! predict "Pause and predict"
    BPP also ran a three-task laundry-folding study. With so few, similar tasks, would you expect demo prompts or plain language instructions to be more reliable?

    ??? answer "Reveal"
        Language. In the folding study, language was more reliable, and some demo-conditioned failures executed the wrong fold (§6.1). With little behavioural diversity, there's little for a demo to disambiguate, so the model has weak reason to read it. Same lesson as the toy: a demo is only worth reading when it resolves something.

ICRT makes the same point from the other side: its DROID-only training condition, many scenes but little variety in what had to be done in comparable scenes, makes no progress on test tasks (§4.2, Table 16).

### Demo prompts vs language prompts under scale

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/s1.svg"
<figcaption><strong>What to notice:</strong> on unseen tasks, demo prompting rises from 1% to 66% while language prompting reaches 9% (§4.2, Fig. 15c). On <em>seen</em> tasks both improve, so similar seen-task scores hide very different returns to new teaching. We chart only the endpoints the text reports; the intermediate points (10k, 30k hours) aren't labelled in the figure.</figcaption>
</figure>

!!! paper "The paper's caveats on S1 (§4.2)"
    Data, compute and architecture are matched apart from the prompt embedding. The cumulative per-step metric includes human recovery interventions, mainly for the language baseline. And S1 varies scale and prompting together, while BPP isolates task diversity at a fixed demo budget.

### What each reported comparison proves

- **NOLO**, scene-context video on vs off: 33.58% → 43.65% in Habitat. A preview of the environment, not a demo of the route, helps navigation (Table 16).
- **Show-Harness**, arbitrary action names with no written conventions: 1 of 20 episodes succeed and only 23.3% of mappings are inferred. Reading a convention is easy; *discovering* one by probing is hard (§7.1).
- **LMAct**, 0 → 512 expert episodes: often little gain. More context is not more information (Table 16).
- **Part-based transfer**, whole object → parts: 11/27 → 23/27, but with part correspondences supplied by hand (Table 16).
- **RAPID**, verification in reconstructed scene variants: 53.2% → 75.9%. Checking the acquired program beyond the demo configuration pays (Table 16).
- **TraceFlow**, guidance from past success and failure traces: 21/50 → 39/50 on one real ordered-packing task, while the simulation aggregate is unchanged (Table 16).
- **FARE**, selective history revision: 91.5% → 93.2%, while always searching drops to 91.0%. Intervene selectively, and verify (§5.2).
- **LMPC**, training a successor model between teaching sessions: 39.4% → 66.3% success, and mean turns per successful session fall from 2.4 to 1.9. The model becomes *more teachable* (§8.5).

Outside Table 16, two numbers stand out. In GPT-Policy, plug reinsertion succeeds in 0/3 trials with robot video alone and 2/3 when aligned end-effector poses, gripper states and commands are added (§4.4). And separating policy actions from human takeovers lifted XR-2's folding from 58% to 93% over three retraining rounds, a weights route rather than an ICL one (§4.5).

### A trap in learning-across-attempts claims

Section 7.3 defines the clean way to measure whether memory helps:

\[
\Delta^{\text{reuse}}_n=S^{\text{keep}}_n-S^{\text{reset}}_n
\]

\(S_n\) is the success rate *on attempt n itself*; "keep" retains memory of earlier attempts and "reset" clears it, with tasks, initial conditions, executor and attempt budget all held fixed. Cumulative success over retries is a different quantity, because it also benefits from independent extra chances (§7.3).

<div class="rd-widget" id="rd-reuse" role="group" aria-label="Retries versus memory calculator"><noscript>This widget needs JavaScript.</noscript></div>
<script src="assets/widget-reuse.js"></script>
<p class="rd-widget-caption"><strong>Try this:</strong> leave the memory gain at 0 and read the cumulative curve at attempt 10. With a 40% first-try rate it reaches 99.4% with <em>no memory benefit at all</em>. Then raise g to 15 pp and see how small the gap between the two cumulative curves is. Illustrative model (independent attempts, constant gain), not the paper's data.</p>

### What isn't shown

- **None of the proposed tests have been run.** Tables 15 and 18 are explicitly labelled proposed, Table 17 lists controls without results, and the panels illustrating them (Figs. 23, 25, 26) are conceptual. An image-attribution note after §9 says several figures, including those three, use AI-assisted illustrations.
- **No cross-study comparison is possible.** Table 16's caption says so: comparisons are within study.
- **Small samples.** Several rows rest on one task (TraceFlow), 27 object pairs (part-based) or 3 seeds (NOLO). Zeva reports +10–20 pp without absolute rates.
- **Headline numbers come from release posts.** S1 and GEN-1.5 are company blog posts, which the survey identifies as release reports (§2.4).

So the field's evidence points the survey's way but is thin and uncontrolled. Is the map itself a good one?
{ .rd-next }

## Part IV: Think like a reviewer { .rd-part }

## Why this way and not another { #why-not }

### How the four doors trade off

| Door | What it exposes | Burden sits on | Typical failure (📄) | Representative |
|---|---|---|---|---|
| **Act** | nothing explicit; the taught distinction lives in features | the learned interpreter and archive coverage | interpreter transfers worse than plain replay under embodiment shift (REGENT, §3.1) | ICRT, Instant Policy, S1 |
| **Retarget** | the contact or relative motion, inspectable | correspondence, reference switching, feasible tracking | shape change, lost contact, independently moving objects (§3.2) | DITTO, SemAnCorr, MT3 |
| **Forecast** | the intended consequence, inspectable before motion | forecast accuracy *and* the decoder | correct intent but unreachable future; errors accumulate (§3.3) | Zero-WAM, Demo-JEPA |
| **Script** | order, preconditions, intervention points | the supplied executor and its interface | a compact procedure omits a required grasp (§3.4) | Code as Policies, Show-Harness, UniSkill |

### The survey's own design decisions

| Choice | Obvious alternatives | Why this one | What would likely happen otherwise | Evidence |
|---|---|---|---|---|
| Classify by the intermediate execution consumes | by architecture; by input modality; by data source | transformers, diffusion and VLMs each support several interfaces; modality and storage are kept as independent attributes (§2.3) | an "architecture" taxonomy would put a VLM emitting actions and a VLM calling tools in one bin, though they fail differently | 📄 §2.3 argument; 🧠 the consequence |
| ICL = deployed neural weights fixed | include test-time training; include any one-shot method | separates where the information is stored, which decides how you test it (restore weights vs clear context) | "one-shot" would mix RoboTTT-style fast weights with prompting; the survey stresses one-shot names the *amount* of teaching, not the storage (§2.2) | 📄 §2.2, Fig. 6 |
| Count agents that revise code as ICL ("model-external adaptation") | treat program revision as search or optimization | weights are fixed; experience changes the machinery around the model (§2.2) | 91 of 260 method references would leave the survey | 📄 §2.2, §3.6; 🧠 see the reviewer notes |
| Code hybrids by "the analyzed deployment branch" | multi-label coding | gives every reference one family for counting (§2.4) | percentages would not sum to 100 but would be more honest about hybrids | 📄 §2.4; 🧠 trade-off |
| Evaluate by interventions, not leaderboards | report benchmark success | success can come from scene recognition, extra retries or a stronger executor (§7.1, §7.3) | the LIBERO task-index result shows what goes wrong | 📄 §7.1 |
| Add S5/S6 horizons | stop at S4 | to frame "learning to learn the next task" as the goal (§2.1, §8.5) | the agenda section would lack a target | 📄 §2.1; 🧠 these rest on few studies |

**The decision that matters most** is the first. Once you classify by the intermediate, every other part of the survey follows: the transfer requirement per family (Table 2), the intermediate interventions for localizing failure ("supply the correct reference / future / specification and see if success recovers", §7.3), and the reviewer's habit of asking *where* a demo's detail could have been lost.

## What's genuinely new { #novelty }

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/lineage.svg"
<figcaption><strong>What to notice:</strong> the two roots are different problems. Learning from interaction (blue: RL², RMA) infers the task or dynamics from outcomes (S3); learning from teaching (violet) infers intent from a demo (S4). The survey argues recent systems join the two (§1, §2.4). All entries are references the paper itself discusses.</figcaption>
</figure>

**Borrowed.** The demonstration-learning distinction between mappings, system models and plans (Argall et al., 2009; Ravichandar et al., 2020), and meta-learning's separation of representation, optimizer and objective (§2.3). The ICL mechanism accounts (Bayesian inference, gradient-descent-like attention, distributional properties) come straight from the language-model literature (§4.4).

**New.**

- **A taxonomy by execution interface** that puts policies, geometric transfer, world models and LLM agents on one diagram, with correspondence and memory as shared mechanisms (§1 contributions, Table 2).
- **A unified notation**: 21 equations and a notation table (Table 1) that write every family as a factorization of Eq. 1.
- **An evaluation vocabulary built on interventions**: meaning-changing vs meaning-preserving context, separate physical and memory resets, \(\Delta^{\text{reuse}}_n\), and intermediate substitution to localize failure (§7, Tables 15 and 17).
- **An auditable census**: Supplement S1 has one row per reference with its coding reason.

**The closest neighbour** (found by us, via search): Li et al.'s *In-Context Learning from Demonstrations for Robotic Manipulation: A Survey* (preprints.org, posted 9 Sep 2026), which this paper cites as [372]. Its abstract organizes by context information, inference target, adaptation mechanism and evaluated transfer, and is limited to manipulation. This survey adds navigation, physical adaptation from interaction, program-revising agents and the self-improvement agenda.

!!! take "Why now? (our reading)"
    Before broad robot pretraining, a demo had to supply every ingredient of a skill, so "learning from one demo" meant geometric replay or narrow task families. Once generalist policies and VLM agents arrived (197 of the references are from 2026), a demo only has to *select and redirect* existing competence, and the four doors became genuinely interchangeable choices.

## Reviewer's corner { #reviewer }

1. **The evaluation advice is untested.** The survey's most actionable contribution, its intervention protocols, is proposed rather than demonstrated (Tables 15 and 18 are labelled "proposed"; Table 17 lists controls without results). Figures 23, 25 and 26 illustrate hypothetical outcomes. A single worked case running, say, the meaning-changing/meaning-preserving pair on two public policies would have shown the protocols are practical.
2. **Coding reliability is unknown.** One documented process assigned 412 references to roles and 260 to families, but there's no second coder or agreement statistic, and `reproduce.py` checks sums, not labels (we ran it). The family shares (47.3% Act, 9.2% Retarget, 8.5% Forecast, 35.0% Script) also depend on the hybrid rule: ReCAP's Cosmos Policy branch counts as Forecast, ENPIRE as program revision, GPT-Policy as tool use (§2.4).
3. **The census reflects collection as much as the field.** The search used "targeted updates" and citation chaining, with no search strings or screening counts (§2.4). The supplement says counts represent review coverage rather than an exhaustive census. So the 197-in-2026 spike in Fig. 9 may partly reflect where the authors looked hardest.
4. **Some headline evidence is a press release.** S1's 66% vs 9% comes from a company blog, and the survey itself notes the metric credits human recovery mainly in the language arm (§4.2). Part of that gap may measure how often a human stepped in, not just how well the prompt worked.
5. **"In-context learning" is stretched.** The fixed-weight umbrella includes nearest-neighbour replay (Eq. 5) and agents that propose, validate and keep revised code (Eq. 19). Meanwhile RoboTTT and WAM-TTT, which adapt from one demo at deployment, are excluded because they touch fast weights (§2.2). The line is principled (where information lives), but it doesn't match the LLM meaning of "learning inside the forward pass". Over a third of the method corpus is Script.
6. **Two families are thin.** Retarget (24) and Forecast (22) together are under 18% of method references. Family-level claims can rest on a single study: "search beats decoding on unseen tasks" is Demo-JEPA's, and its simulation results disagree on familiar tasks (§3.3).
7. **Possible conflict of interest.** The lead institution, Knowin AI, is also the source of GLOW, which gets its own paragraph in §3.1 and a row in Table 14, backed by qualitative examples (§6.5). The survey does say qualitative cases are not context interventions; readers should weigh it accordingly.

!!! take "Steelman"
    **"The protocols are untested"** → likely response: running controlled interventions across 260 methods is a different paper; a survey's job is to say which experiments the field should run, and Table 16 shows such experiments exist in the literature → where that leaves us: the protocols are plausible, but treat them as hypotheses about good evaluation until someone runs them.

    **"ICL is stretched"** → likely response: the organizing question is how evidence changes deployed behaviour with neural weights fixed; agents that revise code meet that test, and the survey gives each storage location its own reset control (Table 17) so readers can filter → where that leaves us: fair, as long as you read the family counts as "systems with frozen weights", not "networks that learn in context".

## Scope and boundaries { #scope }

**Where the map is solid.** Tabletop manipulation and indoor navigation with an existing motor repertoire, deployed with frozen weights (§6.1–6.2). This is where most surveyed systems and all 14 reported comparisons live.

**Where it probably breaks or thins out.**

- **New motions.** Context can select, order and parameterize existing operations; a motion outside the executor's repertoire needs further learning (§6.3). If your task needs a new skill, ICL is the wrong tool.
- **Irreversible procedures.** Lab workflows and fastening are discussed conceptually (§6.3) with no measured results. Every recovery mechanism in §5 assumes you can look, probe or retry.
- **Locomotion and many-robot exchange.** Body adaptation gets one subsection (§6.4); S6 is agenda only (§8.5).
- **Teaching cost.** Changeover time is defined (§7.4), but no study reports it end to end. The only latency number is SimpleMemVLA's 1.02 → 0.68 s with identical outputs (§7.4).

**What it assumes.** That a pretrained competence exists and that teaching only has to redirect it. That the robot has the right sensors for the unknown: Self-Adaptive VLA needs vision to catch joint-encoder offsets because proprioception stays self-consistent (§3.1). And that someone can afford to collect *contrasting* teaching data (§4.2).

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/scope.svg"
<figcaption><strong>What to notice:</strong> the evidence a robot needs depends on which axis changed. New relation → teach; new physical response → probe; both → teach and probe together, every step. Our redraw of the idea in Fig. 20 (§6.1).</figcaption>
</figure>

!!! predict "Pause and predict"
    A memory-equipped policy improves over 10 attempts on the same insertion. The team swaps in a new connector with different stiffness and keeps the memory. Using the table of recheck rules, what should the memory keep and what should it drop?

    ??? answer "Reveal"
        Keep the task specification (insertion order, target) and drop or re-verify the physical-response estimate, which expires on a tool, material or contact change. Execution state resets with the scene. The survey's own example: "a changed connector or tool can invalidate a response estimate while leaving the assembly order intact" (§5.3). The common mistake is to treat memory as one blob that either helps or hurts.

## Part V: Beyond the paper { .rd-part }

## Applications { #applications }

The survey organizes applications by **what the context must resolve** (§6):

- **Production changeover** (§6.5). Two kitting orders use the same parts and grasps but different sequences. A demo is worth recording when it carries a difference the bill of materials doesn't; a count or destination can just be typed. The survey's suggested endpoint is repeatable quality, not the first success.
- **Personal conventions** (§6.1). "Place things quietly" should govern every later placement; "that cup goes left" applies once. Corrections need a scope.
- **Navigating a new building** (§6.2, Table 13). Four context types: a route demo, observations of the environment, instruction–decision examples, and outcome feedback. Each expires at a different boundary: a new goal keeps the map, a new building keeps the interpretation rules.
- **Long and irreversible procedures** (§6.3). Laboratory workflows, where a repeated insertion and a repeated dose have very different consequences.
- **New bodies and payloads** (§6.4). Legged robots inferring terrain response; RopeFormer adapting rope whipping across trials with fixed weights.

Two less obvious ones (🧠 ours):

- **Assistive robots taught by caregivers.** A carer who isn't a programmer demonstrates a feeding or dressing routine once, then corrects it by voice. The plate-first lesson becomes "spoon from the left", and keeping each correction's scope (this meal vs always) is exactly the §3.5 recheck problem.
- **Factory QA by intervention.** Before deploying a demo-conditioned cell, run the meaning-changing/meaning-preserving pair on its actual parts. It's a cheap acceptance test for "will this cell actually follow the next changeover demo?"

## What to carry forward { #carry-forward }

**For the field**

- Ask what the intermediate keeps. Every learning-from-demo claim should say which door it uses and how the taught distinction survives to the motor.
- Test context with a pair of interventions: change the meaning (behaviour must change) and preserve the meaning (behaviour must not).
- Count distinguishable teaching problems, not trajectories. BPP's 2,000 × 5 beats 500 × 20.
- Separate the resets. Physical reset, memory reset and weight restore answer different questions; cumulative success over retries answers none of them.

**For your own work (speech)**

- **Zero-shot TTS and voice cloning are ICL.** Evaluate them the same way: hold the text fixed and swap the reference audio. Check that speaker similarity follows the prompt (meaning-changing) and stays put across two clips of the same speaker (meaning-preserving). If text content predicts the voice in your test set, you have a LIBERO-style shortcut.
- **Prompted and contextual ASR** (biasing lists, previous-utterance prompts) can win on benchmarks where the context is redundant with the audio. Build test items where the context disagrees with a plausible acoustic reading, and measure whether it flips the output.
- **Spoken corrections to robots** inherit your latency budget. The survey's feedback-to-action delay (§7.4) includes your streaming ASR and endpointing; a correction that arrives after the motion is committed is useless. Also record each correction's source, time and referent, as §4.1 asks: "the teacher said X" and "the model heard Y" are different evidence.

## What's next { #whats-next }

**Follow-ups (found by us).** None yet. The paper appeared on 28 September 2026, and OpenAlex and Semantic Scholar list no citing works as of 2 October. The closest concurrent work is Li et al.'s manipulation-only survey (preprints.org, September 2026), which this paper cites.

**Open problems the authors name** (📄 §8):

- **Rule inference, not just task selection** (§8.1, Table 18). Keep objects and skills fixed and test three levels: choose a familiar routine, compose known rules, infer an unfamiliar rule (e.g. a size-to-slot mapping from a held-out family).
- **Instruction tuning for robots** (§8.2). Train on mixtures of demos, instructions and corrections so a robot can bind several requirements, revise only the one a correction touches, and ask when the destination is ambiguous.
- **Selective invariance** (§8.3). Learn which demonstrated details are binding (a pause while glue sets) and which are incidental (a pause to scratch your nose), and recognize when no available object can satisfy the relation.
- **Retaining and revising lessons** (§8.4). Keep a correction across layout changes and model upgrades, but let new teaching override it.
- **Physical recursive self-improvement** (§8.5). Measure the *successor's* speed at learning new tasks, not just today's success. LMPC is the existence proof.

!!! take "Where we think this is heading"
    Script-style systems (LLM agents over robot tools) are 35% of the method corpus, and the largest family among 2026 references: 59 of 136, up from 5 in 2025 (our count from Supplement S1). The interesting frontier is the hybrid: an agent writes the procedure, while geometric or learned policies carry the contact-level detail it would otherwise drop. If someone builds the evaluation harness of §7, the first big finding will likely be how much benchmark success was scene recognition.

## Brainstorm lab { #brainstorm }

**1. What if the teacher speaks instead of demonstrating?** Spoken corrections are the most natural channel for non-experts, but ASR errors become context errors.

??? take "Suggested directions (think first)"
    - Build a tabletop simulation where corrections arrive as audio. Inject realistic ASR errors (swap "left"/"right", drop numbers) and measure how often a fixed-weight agent follows a *wrong* correction vs asks for clarification (§8.2's information acquisition).
    - Measure feedback-to-command delay as a function of endpointing aggressiveness. Interesting if a slightly worse ASR with earlier endpoints yields better task success.
    - Compare passing the ASR n-best list as context against passing only the 1-best.

**2. Laptop experiment: extend the toy to rule inference.** Three targets, orders generated by rules ("by size", "by colour", "left to right").

??? take "Suggested directions (think first)"
    - Train on two rule families, test on a held-out third, with 1–3 demos per query. Measure order adherence (Table 18's three levels).
    - Vary the number of distinct rules seen in training at a fixed number of trajectories (BPP-style). Interesting if rule inference appears only above a diversity threshold, echoing Raventós et al.'s task-diversity result the survey cites (§8.1).
    - Scale: 50k tiny episodes, a 2-layer transformer, minutes on CPU.

**3. Thought experiment: is nearest-neighbour replay "learning"?** VINN-style copying (Eq. 5) counts as ICL here. GPT-3-style induction is something else.

??? take "Suggested directions (think first)"
    - Propose a test that separates "retrieved the right record" from "inferred a rule": a query that no single stored record covers but a combination of two does.
    - Ask what REGENT's result (replay beats a learned interpreter under embodiment shift) says about where generalization actually came from in that setting.

**4. Transfer this to speech AI: a context-intervention benchmark for zero-shot TTS.**

??? take "Suggested directions (think first)"
    - Items: (text, reference A, reference B), where A and B are different speakers, plus (text, A, A′) with two clips of the same speaker. Score speaker-embedding similarity to the intended reference.
    - Shortcut probe: correlate text content with speaker in your test set. If a model can guess the voice from the text, success there doesn't prove prompt use.
    - Report flip rate (A→B changes the voice) and keep rate (A→A′ doesn't), exactly like the toy's two interventions.

**5. Combine Forecast with Script.** Predict the future frames a demo implies, then decode them into skill calls instead of raw actions.

??? take "Suggested directions (think first)"
    - Where does it fail? Likely when the predicted future implies a contact the skill library can't express. Test by giving the skill library an explicit grasp-point argument and measuring the gain.
    - Use the survey's intermediate-substitution test (§7.3): supply a ground-truth future, then a ground-truth skill sequence, and see which substitution recovers success.

**6. Audit the census.** Supplement S1 lists every reference's family with a written reason.

??? take "Suggested directions (think first)"
    - Sample 40 references from `corpus.csv`, hide the labels, have two people code them with the codebook, and compute Cohen's κ against each other and against the paper. An afternoon's work.
    - Interesting if κ is high for Retarget/Forecast but low between Act and Script (VLMs that output tokens vs call tools), which is the boundary §2.3 spends the most words on.

## Part VI: Lock it in { .rd-part }

## Self-quiz { #quiz }

**1. What single property distinguishes the four method families?**

??? answer "Answer"
    The intermediate that execution consumes: an action distribution (Act), a motion or contact reference (Retarget), predicted consequences (Forecast) or an execution specification (Script) (§2.3, Table 2). Not the architecture: the same VLM can be in Act (emitting action tokens) or Script (calling tools).

**2. In Eq. 3, what changes during fixed-parameter adaptation, and what doesn't?**

??? answer "Answer"
    \(\theta\) stays at \(\theta_0\); the history \(h\) grows, and the context or memory may be updated. If any neural component, even a small fast-weight subset, is updated at deployment, the survey calls it parameter adaptation, not ICL (§2.2). A common wrong answer is "a one-shot method must be ICL": one-shot names the amount of teaching, not where it's stored.

**3. Why can a policy score highly on LIBERO without using its instruction or demo at all?**

??? answer "Answer"
    Each scene layout reveals which task it is, so even a task-index embedding can succeed (§7.1). The context is redundant with the observation, and Eq. 21 can be minimized without reading it (§4.2). The fix is test scenes where several behaviours are feasible and only the context says which.

**4. BPP gets lower error from 2,000 tasks × 5 demos than from 500 tasks × 20. Why, mechanistically?**

??? answer "Answer"
    More distinct tasks means more comparable situations where the correct continuation differs, so the demo carries information the scene doesn't, and the model is pushed to read it. Extra repetitions of the same task mostly teach invariances the model already has (§4.2). It's not "more data": the total is 10,000 in all three cases.

**5. Why isn't cumulative success over 10 attempts evidence that memory helps?**

??? answer "Answer"
    Independent retries alone push cumulative success up: with a 40% first-try rate, \(1-0.6^{10}\approx 99.4\%\). The survey's measure is \(\Delta^{\text{reuse}}_n=S^{\text{keep}}_n-S^{\text{reset}}_n\), the per-attempt rate with memory kept vs cleared at a matched attempt budget (§7.3).

**6. In Eq. 8, the cup in the demo is replaced by a wide bowl. Which assumption breaks, and what do the fixes in §3.2 replace?**

??? answer "Answer"
    Eq. 8 assumes the reference object is fixed during the segment and that the demonstrated *relative* motion still applies. A bowl changes where the pour must happen, so the cup-relative motion no longer fits. The fixes swap whole-object frames for task-relevant parts or functional keypoints (FUNCTO, SemAnCorr) or for frames on *both* interacting objects (R-NDF).

**7. Application (speech).** You built a zero-shot TTS that clones from a 3-second prompt. Design one meaning-changing and one meaning-preserving intervention, and say what each should show.

??? answer "Answer"
    Meaning-changing: same text, swap the prompt for a different speaker. The output's speaker embedding should move to the new speaker. Meaning-preserving: same text, a different clip of the same speaker. The output should stay close to the original. Also check that text content doesn't predict the speaker in your test set; if it does, you're measuring a shortcut.

**8. Application.** Your kitting cell uses an LLM agent that calls `pick(object)` and `place(location)`. A new product requires gripping a part by a specific tab. What's the risk, and two ways to fix it?

??? answer "Answer"
    The Script door can only pass what its skill arguments express, so "by the tab" is silently dropped: "portability versus physical detail" (§3.4). Fixes: give the skill a grasp-region argument the agent can fill from the demo, or let the program call a geometric-transfer routine (Retarget) for that step. That's the hybrid the survey describes.

**9. Spot the flaw.** A team writes: "We added episodic memory to our policy. On 50 test tasks, success over 10 attempts rose from 40% (attempt 1) to 95% (attempt 10, cumulative). Memory makes the robot learn from its mistakes." What's wrong?

??? answer "Answer"
    There's no memory-reset control. With a 40% first-try rate and independent attempts, cumulative success after 10 tries would be about 99.4% *with no memory at all*, so 95% is consistent with memory doing nothing, or even hurting. They need per-attempt success with memory kept vs cleared, same attempt budget, same resets: \(\Delta^{\text{reuse}}_n\) (§7.3). The tempting critique, "50 tasks is too few", is true but secondary.

## ⚡ Remember this { #remember }

**One sentence.** With weights frozen, teaching becomes one of four intermediates on its way to the motors, and it only works if what you taught is still inside when it gets there.

<figure class="rd-fig" markdown>
--8<-- "papers/2609.36012-robot-icl/assets/remember.svg"
<figcaption><strong>What to notice:</strong> each door has its own "survival condition", taken from the transfer requirements in Table 2. Diagnose a failure by asking which condition broke.</figcaption>
</figure>

**Three takeaways**

1. **ARFS.** Act, Retarget, Forecast, Script: classify any method by what the evidence becomes, then ask whether that keeps the order, contact or pause you taught.
2. **Data makes a robot teachable.** A demo gets read only if training contained comparable scenes with different correct behaviours. Count distinct teaching problems, not hours.
3. **Test with interventions, not success.** Swap the demo for one with a different meaning (behaviour must change) and one with the same meaning (it mustn't); clear memory separately from resetting the scene.

**Sticky phrase:** *The final tray can't tell you; the middle of the job can.*

## Glossary { #glossary }

Action chunk (action block)
:   \(H\) future actions proposed at once; only the executed ones enter the history.

ARFS
:   Our mnemonic for the four doors: Act, Retarget, Forecast, Script.

Changeover time
:   The interval from receiving a new task specification to repeatable execution at the required quality (§7.4).

Context \(C_t\)
:   Task evidence supplied to a fixed policy: instructions, demos, corrections, retrieved episodes, memory.

Context-conditioned policy
:   A policy that maps context and history directly to actions, by learned generation or by retrieving recorded actions (Door 1).

Correspondence
:   Which part or phase of the demo matches which part or phase of the current scene.

Embodiment
:   The robot's physical body: kinematics, gripper, sensors.

Fast weights
:   A small parameter subset updated during deployment; parameter adaptation, not ICL, in this survey.

Geometric demonstration transfer
:   Extracting a motion or contact reference from a demo, re-anchoring it in the current scene and tracking it (Door 2).

Harness
:   The execution system around a model: it assembles context, exposes tools, executes requests and returns feedback.

In-context learning (for robots)
:   Changing deployed behaviour using supplied teaching or interaction while neural parameters stay fixed.

Meaning-changing / meaning-preserving intervention
:   Swapping the context for one that specifies a different behaviour, or the same behaviour in a different form, to test context use.

Model-external adaptation
:   Improving through experience by revising code, programs, retrieval rules or memory around a frozen model.

Physical recursive self-improvement (S5)
:   Experience that improves how the *next* task is learned, not just the current solution.

Proprioception
:   The robot's sense of its own state: joint angles, gripper width.

Retargeting
:   Converting a demonstrated motion into one this robot can execute in this scene.

Reuse gain \(\Delta^{\text{reuse}}_n\)
:   Success at attempt \(n\) with memory kept minus success with memory cleared, all else matched.

SE(3)
:   The group of 3-D rigid transformations (rotation plus translation); poses live here.

Skill- and agent-based execution
:   Turning context into a skill sequence, program or tool call that a separate executor runs (Door 4).

Support / query
:   The teaching demonstration (support) and the execution it should guide (query).

Teleoperation
:   A human driving the real robot to record demonstrations with true robot commands.

UMI
:   Universal Manipulation Interface: a handheld gripper-shaped tool that records robot-like demonstrations without a robot.

Vision-language-action model (VLA)
:   A vision-language model trained to output robot actions.

World-model-based control
:   Predicting future observations or states and using them to decode or select actions (Door 3).

## References and further reading { #references }

**The paper and its materials**

- Huang, Li, et al. *In-Context Learning for Robots: Methods and Applications.* arXiv:2609.36012, **v1 read** (28 Sep 2026). [arXiv](https://arxiv.org/abs/2609.36012v1) · [project page](https://jethrojames.github.io/awesome-robots-icl/)
- Companion paper list: [JethroJames/awesome-robots-icl](https://github.com/JethroJames/awesome-robots-icl/tree/56e824e5d2885d3c22a06b724dfcf2e71b3141e7) at commit `56e824e`, MIT license.
- Supplement S1 (reference census and reported comparisons), in the arXiv source's `anc/` folder.

**Key prior works** (as cited by the survey)

- Duan et al., [One-Shot Imitation Learning](https://arxiv.org/abs/1703.07326) (2017), ref [1]: the paired support–query training that Eq. 21 generalizes.
- Duan et al., [RL²](https://arxiv.org/abs/1611.02779) (2016), ref [2]: adaptation carried in recurrent state, the meta-RL root of S3.
- Brown et al., [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) (2020), ref [121]: showed broad pretraining alone can yield in-context learning.
- Kumar et al., [RMA](https://arxiv.org/abs/2107.04034) (2021), ref [39]: infers a body's dynamics from recent history with a fixed policy, the canonical physical-adaptation example.
- Liang et al., [Code as Policies](https://arxiv.org/abs/2209.07753) (2022), ref [27]: LLM-written robot programs from examples, the start of Door 4's agent branch.
- Fu et al., [ICRT: In-Context Imitation Learning via Next-Token Prediction](https://arxiv.org/abs/2408.15980) (2024), ref [13]: real-robot sensorimotor prompting, and the DROID-only result on data diversity.
- Patel et al., [Behavior Prompting Policy](https://arxiv.org/abs/2606.30457) (2026), ref [54]: the task-diversity-at-fixed-budget result charted above.

**Related survey (found by us)**

- Li et al., [In-Context Learning from Demonstrations for Robotic Manipulation: A Survey](https://www.preprints.org/manuscript/202609.0780) (preprint, Sep 2026), ref [372] in the paper: the closest concurrent map, manipulation only.

**Follow-up papers:** none found yet (checked 2 Oct 2026).
