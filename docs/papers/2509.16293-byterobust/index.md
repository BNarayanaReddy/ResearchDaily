---
title: "ByteRobust"
paper_title: "Robust LLM Training Infrastructure at ByteDance"
authors: ["Borui Wan", "Gaohong Liu", "Zuquan Song", "Jun Wang", "Yun Zhang", "Guangming Sheng", "Shuguang Wang", "Houmin Wei", "Chenyuan Wang", "Weiqiang Lou", "Xi Yang", "Mofan Zhang", "Kaihua Jiang", "Cheng Ren", "Xiaoyun Zhi", "Menghan Yu", "Zhe Nan", "Zhuolin Zheng", "Baoquan Zhong", "Qinlong Wang", "Huan Yu", "Jinxin Chi", "Wang Zhang", "Yuhan Li", "Zixian Du", "Sida Zhao", "Yongqiang Zhang", "Jingzhe Tang", "Zherui Liu", "Chuan Wu", "Yanghua Peng", "Haibin Lin", "Wencong Xiao", "Xin Liu", "Liang Xiang"]
year: 2025
venue: "arXiv preprint (v4); the acknowledgments thank SOSP reviewers and a shepherd"
arxiv_id: "2509.16293"
arxiv_version: v4
paper_type: system
hook: "A 9,600-GPU training run breaks every few hours. How do you keep it training 97% of the time?"
big_idea: "ByteRobust keeps months-long LLM training jobs productive by isolating suspect machines fast instead of diagnosing them exactly, then restarting in place from every-step in-memory checkpoints."
goal: "Decide which ByteRobust ideas to copy for your own multi-node speech or LLM training."
difficulty: 2
difficulty_note: "No maths. New: how 10,000-GPU jobs fail and recover. The parallel groups it relies on are rebuilt on page 2."
date_added: 2026-10-20
tags: [LLMs, Systems, Robustness, Efficiency]
description: "A 9,600-GPU training run breaks every few hours. How do you keep it training 97% of the time?"
---

<article class="rd-page" id="ettr" data-part="Toolbox" data-draw="ettr" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Running example: a 9,600-GPU pretraining job (§8.1).</p>

## What does "97% of the time" actually measure?

1. **ETTR: productive time over wall-clock time.** Effective training time ratio counts only time that advances training (§1).
2. **Failures arrive on a clock.** Meta saw a hardware failure about every 2.78 hours on 16,000 GPUs, as the paper cites (§1).
3. **Each failure costs minutes.** Detect, locate, restart, and redo lost steps. Move the slider.
4. **97% leaves about 5 minutes.** At one failure per 2.78 hours, 97% ETTR allows roughly 5 lost minutes each (our arithmetic). [[≈ 5 min | lost per failure at 97% ETTR]]

<p class="rd-cap">2.78 h is real but from Llama 3, cited in §1. The slider arithmetic is ours and assumes failures are evenly spaced.</p>

<p class="rd-take"><b>High ETTR means every failure must cost minutes, not hours.</b> Next: why one bad machine stalls everyone.</p>

</article>

<article class="rd-page" id="groups" data-part="Toolbox" data-draw="groups" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> The fault domains every later page uses.</p>

## Why does one bad machine stall the whole job?

1. **A pipeline splits the model.** Each row is one model copy cut into 4 stages: a pipeline-parallel (PP) group (Fig. 7).
2. **Copies sync gradients.** Each column holds the same stage across 4 copies: a data-parallel (DP) group.
3. **Tensor parallelism stays inside.** TP=2 splits each layer across 2 GPUs in one machine (Fig. 7).
4. **Collectives wait for everyone.** Pick a machine. Its PP and DP groups stall, and through them the whole step.
5. **So groups are fault domains.** ByteRobust evicts and backs up by group (§5, §6.3).

<p class="rd-cap">The TP=2, PP=4, DP=4 layout is the paper's example (Fig. 7). Machine numbering follows its figure.</p>

<p class="rd-take"><b>In 3D parallel training, a fault spreads along its groups.</b> Next: what actually breaks.</p>

</article>

<article class="rd-page" id="incidents" data-part="The problem" data-draw="incidents" data-fast markdown>

<p class="rd-crumb"><b>Problem 1</b> The failures behind page 1's clock.</p>

## What breaks in three months of LLM training?

1. **55,365 incidents.** Logged across 778,135 training jobs in three months (Table 1; total is our sum).
2. **Explicit failures dominate.** CUDA errors alone are 36.1%. They come with an error message or exit code (§2.2).
3. **Implicit failures are quiet.** Job hangs (9.9%), MFU declines and NaN values give no clear culprit (Table 1).
4. **People restart it too.** 17.3% are deliberate stops to change code or data (Table 1).

<p class="rd-cap">Shares and counts are real (Table 1). Bars show the largest rows and the three implicit ones.</p>

<p class="rd-take"><b>Most failures announce themselves; the costly ones don't.</b> Next: where the lost time goes.</p>

</article>

<article class="rd-page" id="timeline" data-part="The problem" data-draw="timeline" markdown>

<p class="rd-crumb"><b>Problem 2</b> Splits page 1's lost minutes by failure type.</p>

## Where does the unproductive time go?

1. **Explicit: fast to see.** Detected in about 60 s from logs; located in 2 to 15 minutes (§2.2).
2. **A hang stays silent.** No logs appear until the NCCL timeout, 30 or 60 minutes (§2.3).
3. **Then someone digs.** One communication hang took over 1.5 hours of manual diagnosis (§2.2).
4. **Silent corruption is worst.** One GPU fault took over 8 hours of offline stress tests to find (§2.2).
5. **Restart costs the same for all.** Failover took over 10 minutes at 10,000 GPUs (§2.3).

<p class="rd-cap">Times are real (§2.2, §2.3); the hang and corruption times are single cases. Bars use a log scale.</p>

<p class="rd-take"><b>Quiet failures cost hours before anyone knows where to look.</b> Next: why the cause is hard to pin.</p>

</article>

<article class="rd-page" id="rootcause" data-part="The problem" data-draw="rootcause" markdown>

<p class="rd-crumb"><b>Problem 3</b> Why page 2's symptoms don't name a culprit.</p>

## Is it the hardware or the code?

1. **Same symptom, two causes.** Over one month on jobs above 2,000 GPUs, root causes split between infrastructure and user code (Table 2).
2. **Hangs are mostly hardware.** 21 infrastructure, 5 user code (Table 2).
3. **Memory errors are mostly code.** Illegal memory access: 21 infrastructure, 41 user code (Table 2).
4. **The code keeps changing.** One 1,000-GPU job restarted 28 times in 10 days to tune its code (Fig. 2, §2.1).
5. **So blame is ambiguous.** A crash right after an update could be either (§2.3).

<p class="rd-cap">Counts are real (Table 2, §2.1). NaN values, with 3 infrastructure and 1 code cases, are left off the chart.</p>

<p class="rd-take"><b>A fix must consider the code as a suspect, not just the machines.</b> Next: the system's parts.</p>

</article>

<article class="rd-page" id="overview" data-part="The system" data-draw="overview" markdown>

<p class="rd-crumb"><b>System 1</b> The whole machine, before its parts.</p>

## What are ByteRobust's parts?

1. **A controller outside the job.** The Robust Controller decides: detect, locate, recover (§3).
2. **An agent inside every pod.** The Robust Agent carries out the controller's orders on each machine (§3).
3. **Four helpers in the agent.** Monitor, Diagnoser, On-Demand Tracer and checkpoint manager (§3).
4. **An analyzer for stacks.** The Runtime Analyzer clusters stack traces when a job hangs or slows (§3, §5).
5. **🧠 Isolate fast, don't pinpoint.** Evicting a suspect quickly beats an exact diagnosis while thousands of GPUs idle (§1).

<p class="rd-cap">Components follow Fig. 4. Code sizes are from §7: Controller about 20k lines of Go, agent about 5k of Python.</p>

<p class="rd-take"><b>One brain outside, one pair of hands per machine.</b> Next: the fastest check.</p>

</article>

<article class="rd-page" id="realtime" data-part="The system" data-draw="realtime" markdown>

<p class="rd-crumb"><b>System 2</b> The Monitor from page 6, at work.</p>

## How fast can a broken NIC be spotted?

1. **Health queries every few seconds.** Inspection threads poll network, GPU and host status, with no GPU load (§4.1).
2. **Network in 30 seconds.** NIC crashes and port flaps are caught at the 30 s interval (Table 3).
3. **GPU and kernel faster.** Driver hangs and lost GPUs in 10 s; OS kernel faults in 2 s (Table 3).
4. **Without it, wait for timeout.** PyTorch-Distributed's default is about 10 minutes (Table 3). Toggle.
5. **Network gets a second chance.** Two alerts within 5 minutes before eviction, since links often recover (§4.1).

<p class="rd-cap">Times are real (Table 3). The "without" bars use the ~10 min timeout; high temperature waits for an MFU alert instead.</p>

<p class="rd-take"><b>Cheap polling turns ten-minute waits into seconds.</b> Next: when nothing obvious is wrong.</p>

</article>

<article class="rd-page" id="ladder" data-part="The system" data-draw="ladder" data-fast markdown>

<p class="rd-crumb"><b>System 3</b> Our job's loss turns NaN with no culprit (§4.3).</p>

## What happens when the cause isn't obvious?

1. **Clear code error? Roll back.** A traceable TypeError reverts the new code at once (§4.1).
2. **Otherwise, stop and test.** GPU, intra-machine and inter-machine checks; failing machines are evicted (§4.2).
3. **All pass? Just retry.** The fault is assumed transient, like a flapping link (§4.2).
4. **Fails again? Blame the code.** Recent updates are rolled back with a hot update (§4.2).
5. **Still failing? Replay.** Group testing hunts for silent data corruption (§4.2).

<p class="rd-cap">The order follows Fig. 5 and §4.2. Our NaN example walks the same path as the paper's case study (§4.3).</p>

<p class="rd-take"><b>Try cheap explanations first; save the expensive hunt for last.</b> Next: a test for silently wrong GPUs.</p>

</article>

<article class="rd-page" id="bitwise" data-part="The system" data-draw="bitwise" markdown>

<p class="rd-crumb"><b>System 4</b> Rung 2 of page 8, for our NaN loss.</p>

## How do you catch a GPU that computes silently wrong?

1. **Standard tests come first.** NVIDIA's EUD GPU diagnostics and NCCL tests (§4.3).
2. **Then a bit-wise test.** Every machine builds a small reference model of the job's type, dense or MoE (§4.3).
3. **Same weights, same input.** Fixed parallelism, such as TP=2, PP=2, DP=2; one training step (§4.3).
4. **Outputs must match exactly.** Any machine whose result differs by one bit is isolated (§4.3).
5. **Why bother?** EUD caught only about 70% of silent corruption in production (§9).

<p class="rd-cap">Procedure and 70% recall are real (§4.3, §9). Eight machines and the hashes are illustrative.</p>

<p class="rd-take"><b>Determinism turns "slightly wrong" into "visibly different".</b> Next: when even this finds nothing.</p>

</article>

<article class="rd-page" id="replay" data-part="The system" data-draw="replay" data-fast markdown>

<p class="rd-crumb"><b>System 5</b> Rung 5 of page 8. Uses the groups of page 2.</p>

## How do two replays find one bad machine among 24?

1. **Keep the job's shape.** Replays keep TP and PP fixed and shrink only DP, with fewer layers (§4.2).
2. **Phase 1: consecutive groups.** Machines split by ID ÷ 4 into 6 groups; replay each. One fails (Alg. 1).
3. **Phase 2: cut across.** Regroup by ID mod 6 and replay again. Another group fails (Alg. 1).
4. **The intersection is the culprit.** Machine 13 sits in both failing groups (Fig. 6).
5. **Move the bad machine.** Any choice is found, because group size 4 ≤ group count 6 (§4.2).

<p class="rd-cap">m = 4, n = 6 and machine 13 are the paper's example (Fig. 6, Alg. 1). Groups are numbered from 0 here.</p>

<p class="rd-take"><b>Two cheap replays locate one machine without any special tools.</b> Next: how often each rung fires.</p>

</article>

<article class="rd-page" id="rungs" data-part="The system" data-draw="rungs" markdown>

<p class="rd-crumb"><b>System 6</b> Counts page 8's rungs in real jobs.</p>

## Which rung of the ladder fixes most failures?

1. **Measured on 19 big jobs.** Each ran on at least 9,600 GPUs (§4.2).
2. **Direct eviction leads.** Real-time checks resolved 32.52% of failures (§4.2).
3. **Retries and rollbacks next.** Reattempts 22.70%, code rollbacks 9.20% (§4.2).
4. **Replay is rare.** Only 1.23% needed dual-phase replay (§4.2).
5. **A third is unassigned.** These four add up to 65.65%; the paper doesn't say what handled the rest.

<p class="rd-cap">Percentages are real (§4.2). The 65.65% total and the 34.35% remainder are our arithmetic.</p>

<p class="rd-take"><b>Simple tools resolve most failures; the clever one is a backstop.</b> Next: hangs, which leave no logs.</p>

</article>

<article class="rd-page" id="hang" data-part="The system" data-draw="hang" data-fast markdown>

<p class="rd-crumb"><b>System 7</b> The grid of page 2, now hung.</p>

## How do you find the machine that froze?

1. **A hang logs nothing.** Training stalls in the backward pass, with no error (Fig. 7).
2. **Grab every stack.** The tracer dumps stacks from training processes and their dataloader and checkpoint children (§5.1).
3. **Group identical stacks.** Machines 0–11 match, waiting in gradient sync; they are healthy (Fig. 7).
4. **The odd ones out.** 12–13 wait in irecv, 14 in isend, 15 in all_gather (Fig. 7).
5. **Evict their shared group.** All four sit in one PP group, so all four go (§5.1).

<p class="rd-cap">Stacks and machine numbers follow the paper's example (Fig. 7). Stack text is shortened.</p>

<p class="rd-take"><b>Healthy machines look alike; the odd stacks point to the group.</b> Next: the price of evicting all four.</p>

</article>

<article class="rd-page" id="overevict" data-part="The system" data-draw="overevict" markdown>

<p class="rd-crumb"><b>System 8</b> Scales page 12's eviction up to 1,200 machines.</p>

## Why evict 8 machines when only one or two are bad?

1. **The job has 1,200 machines.** 9,600 GPUs at 8 per machine (§8).
2. **A PP group is 8 machines.** Usually only 1–2 are faulty, so 6–7 are false positives (§9).
3. **That costs under 1%.** 8 of 1,200 is 0.67% of the job (our arithmetic). Spares replace them.
4. **The cause comes later.** One evaluation hang evicted 6 machines; days of stress tests found 2 bad CUDA cores (§5.2).
5. **Slowdowns get votes.** For MFU drops, aggregation runs every 10 s; the group flagged most over 5 rounds is evicted (§5.1).

<p class="rd-cap">Counts are real (§5.1, §5.2, §8, §9). Which dots are faulty is illustrative.</p>

<p class="rd-take"><b>Losing healthy machines briefly is cheaper than idling thousands.</b> Next: restarting fast.</p>

</article>

<article class="rd-page" id="hotupdate" data-part="Fast recovery" data-draw="hotupdate" markdown>

<p class="rd-crumb"><b>Recovery 1</b> Handles page 3's deliberate restarts.</p>

## How do you change code without a full restart?

1. **Requeueing is slow and risky.** New machines take minutes to set up and may bring new faults (§6.1).
2. **Hot-update swaps code in place.** Pods, machines and environment stay put (§6.1).
3. **Urgent fixes stop at once.** Bug fixes halt training immediately (§6.1).
4. **Others wait for a failure.** Optional changes join the next failure's restart, or apply after 24 hours (§6.1).
5. **Ten times faster.** 454 s → 46 s at 128 machines, 768 s → 65 s at 1,024: 11.04× (Table 7).

<p class="rd-cap">Times are real: scheduling time over 5 code updates, 16 GPUs per machine (Table 7). Pick a scale.</p>

<p class="rd-take"><b>Failures are frequent, so code updates can ride along.</b> Next: replacing evicted machines.</p>

</article>

<article class="rd-page" id="standby" data-part="Fast recovery" data-draw="standby" markdown>

<p class="rd-crumb"><b>Recovery 2</b> Fills the gaps page 13 leaves.</p>

## How many spare machines should sit waiting?

1. **Failures are usually independent.** Simultaneous multi-machine failures are rare (§6.2).
2. **So model them as binomial.** Count daily failures across all machines (§6.2). Move the per-machine rate.
3. **Keep the 99th percentile.** Enough spares for 99 days in 100 (§6.2).
4. **The paper's pools are tiny.** 2 spares for 128 machines, 4 for 1,024 (Table 5).
5. **Spares sleep, already checked.** Self-tested and set up, then woken: 10.87× faster than requeueing (Fig. 12).

<p class="rd-cap">P99 rule, pool sizes and 10.87× are real (§6.2, Table 5, §8.2.1). The rate slider is illustrative; the paper doesn't report its rate.</p>

<p class="rd-take"><b>A handful of pre-checked spares removes most of the restart wait.</b> Next: what they restart from.</p>

</article>

<article class="rd-page" id="ckpt" data-part="Fast recovery" data-draw="ckpt" data-fast markdown>

<p class="rd-crumb"><b>Recovery 3</b> Shrinks the "redo lost steps" part of page 1.</p>

## How can you checkpoint after every step?

1. **Copy during compute.** Device-to-host copies run on a separate CUDA stream during forward and backward (§6.3, §7).
2. **Back up over idle links.** Shards go peer to peer in small chunks between training traffic (§6.3).
3. **Only the optimizer waits.** It waits for each rank's own save to finish, nothing else (§6.3).
4. **Training barely notices.** At 70B on 128 machines, MFU keeps 99.23%; Megatron's blocking save keeps 39.84% (Table 8).
5. **Stalls almost vanish.** Blocking time 0.04 s, against 6.77 s for Megatron save (Table 8).

<p class="rd-cap">Numbers are real, saving every step (Table 8). The timeline is illustrative; its order follows Fig. 8.</p>

<p class="rd-take"><b>Hide checkpoint I/O inside the step, and you can save every step.</b> Next: where the backup copy lives.</p>

</article>

<article class="rd-page" id="backup" data-part="Fast recovery" data-draw="backup" markdown>

<p class="rd-crumb"><b>Recovery 4</b> Combines page 12's group eviction with page 16's backups.</p>

## Where should the backup copy live?

1. **Each rank holds a shard.** Here TP=2, PP=4, DP=2: 16 ranks, 2 per machine (Fig. 9).
2. **Each shard gets a peer copy.** It sits in another machine's CPU memory (§6.3).
3. **Evict a whole pipeline.** Page 12 removes a full PP group: one row here.
4. **A neighbour copy dies too.** Toggle: a backup in the same row leaves with it.
5. **Cross-group peers survive.** Ranks 8–9 swap with 2–3, sharing no TP, PP or DP group (Fig. 9).

<p class="rd-cap">The layout and the 8–9 ↔ 2–3 pairing are real (Fig. 9). Our rank numbering is one that fits that pairing.</p>

<p class="rd-take"><b>Put the backup outside every group that could be evicted together.</b> Next: did it work?</p>

</article>

<article class="rd-page" id="resolved" data-part="Does it work?" data-draw="resolved" markdown>

<p class="rd-crumb"><b>Result 1</b> Counts pages 8–17 at work in two production jobs.</p>

## Which mechanisms handled the real incidents?

1. **Two production jobs.** A 70B+ dense model for three months, a 200B+ MoE for one, on 9,600 GPUs (§8.1).
2. **Evict-and-restart clears explicit failures.** 73.1% of dense incidents, 56.8% of MoE (Table 4).
3. **Hot updates take every manual restart.** 11.4% and 24.8% of incidents (Table 4).
4. **The analyzer handled 24 hangs and slowdowns.** 15 dense, 9 MoE, with no human (Table 4, §8.1.2).
5. **Rollback caught code bugs.** 6.9% dense, 11.2% MoE (Table 4). Toggle the job.

<p class="rd-cap">Counts and shares are real (Table 4). The 175 and 125 totals are our arithmetic from them.</p>

<p class="rd-take"><b>Automation handled every incident class, including the quiet ones.</b> Next: the headline number.</p>

</article>

<article class="rd-page" id="ettr-result" data-part="Does it work?" data-draw="ettrres" data-fast markdown>

<p class="rd-crumb"><b>Result 2</b> Page 1's ETTR, measured.</p>

## Did the job really stay productive?

1. **Cumulative ETTR up to 97%.** It held a plateau over the three-month dense job (§8.1.3, Fig. 10).
2. **That is about 2.7 days lost.** 3% of 90 days (our arithmetic).
3. **Throughput kept rising.** Hot-updated code lifted MFU 1.25× for dense and 1.58× for MoE (Fig. 11).
4. **MoE ran less smoothly.** Its custom kernels and overlap tricks brought more rollbacks and restarts (§8.1.3).
5. **The late dip had a cause.** The first long-context feature brought code failures (§8.1.3).

<p class="rd-cap">97%, 1.25× and 1.58× are real (§8.1.3). The MoE ETTR is lower but not given in the text.</p>

<p class="rd-take"><b>The job stayed productive while its code kept changing.</b> Next: against the usual practice.</p>

</article>

<article class="rd-page" id="stress" data-part="Does it work?" data-draw="stress" markdown>

<p class="rd-crumb"><b>Result 3</b> Page 8's ladder against stress tests guided by logs.</p>

## Is it faster than stress-testing suspects?

1. **The usual way.** Read logs and exit codes, then stress-test GPUs or network (§8.1.4).
2. **CUDA errors: 93 s against 518 s.** Mean time from localization to restart (Table 6).
3. **GPU memory errors: 10 s against 600 s.** Real-time checks evict directly (Table 6).
4. **Code bugs: stress tests never find them.** Rollback restarts a code or data issue in 57 s (Table 6).
5. **NaN stays slow.** 4,289 s mean, against 7,200 s or never (Table 6).

<p class="rd-cap">Times are real (Table 6); "never" marks the paper's INF. The scale is logarithmic.</p>

<p class="rd-take"><b>Rollback reaches failures that no hardware test can.</b> Next: what a reviewer would ask.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Move 1</b> 🧠 Our review, written for this paper specifically.</p>

## What would a careful reviewer question?

1. **🧠 Can anyone check it?** No code, traces or incident data are released, as far as the paper says.
2. **🧠 Do the counts agree?** Table 1's explicit rows sum to 39,687; §1 reports 38,236.
3. **🧠 Do the claims match the tables?** "84.50%" for CUDA errors; Table 6 gives 82%. GPU memory errors fall 98%.
4. **🧠 Same hardware throughout?** Recovery benchmarks ran on L20 GPUs over PCIe, not on production Hopper machines (§8).
5. **🧠 Steelman: rare production data.** 778,135 jobs and two real multi-month runs, failures included (Table 1, §8.1).

<p class="rd-cap">Our judgement. The sums and reductions are our arithmetic from the cited tables.</p>

<p class="rd-take"><b>Trust the design lessons more than the exact percentages.</b> Next: what to copy.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Move 2</b> 🧠 Goal we picked: robust multi-node speech or LLM training.</p>

## Which ByteRobust ideas should you copy first?

1. **Copy: every-step checkpoints in memory.** 0.04 s stalls, 99.23% of MFU kept (Table 8). Back up across groups (Fig. 9).
2. **Copy: second-level health polling.** NIC in 30 s, GPU in 10 s, against a ~10 min timeout (Table 3).
3. **Copy: stack dumps on hang.** py-spy plus PyTorch's flight recorder, grouped by stack (§5.1, §7).
4. **Copy: roll back the code.** Rollbacks fixed 9.20% of failures that no machine test explains (§4.2).
5. **Later: spares and replay.** Even 128 machines needed only 2 spares (Table 5); replay fixed 1.23% (§4.2).

<p class="rd-cap">Numbers are real (Tables 3, 5, 8, §4.2, §7). The ranking is ours.</p>

<p class="rd-take"><b>Start with cheap detection, fast checkpoints and code rollback; scale up later.</b> Then check yourself.</p>

</article>

<article class="rd-page" id="check-replay" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 10.</p>

## 24 machines, groups of 4. Phase 1 flags 8–11; phase 2 flags ID mod 6 = 3. Which machine is bad?

- [ ] Machine 3
- [x] Machine 9
- [ ] Machine 11
- [ ] Can't tell without a third replay

<p class="rd-take"><b>9 is the only one of 8–11 with remainder 3 when divided by 6.</b> With group size ≤ group count, the answer is unique (§4.2).</p>

</article>

<article class="rd-page" id="check-evict" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 12–13.</p>

## Why evict the whole PP group instead of finding the one bad machine?

- [ ] The stack traces name the faulty GPU exactly
- [x] Isolating a group fast wastes less GPU time than diagnosing while thousands of GPUs idle
- [ ] Spare machines are unlimited, so eviction is free
- [ ] A PP group always contains exactly one bad machine

<p class="rd-take"><b>Rapid isolation over precise localization is the design rule (§1).</b> Evicting 8 of 1,200 machines costs under 1% (§9).</p>

</article>

<article class="rd-page" id="check-backup" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From page 17.</p>

## "Back up each shard to the next stage of its own pipeline." What's wrong?

- [ ] Nothing: the next stage has the fastest link
- [ ] Backups in CPU memory are lost on any restart
- [x] Over-eviction removes the whole PP group, taking both copies
- [ ] Shards can only be backed up to remote storage

<p class="rd-take"><b>Backups must sit outside the shard's TP, PP and DP groups (§6.3).</b> Group eviction is the common case (§5).</p>

</article>
