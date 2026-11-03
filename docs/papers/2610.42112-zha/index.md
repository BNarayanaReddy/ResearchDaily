---
title: "ZHA: Tree-Indexed Attention"
paper_title: "Subquadratic Attention with a Hierarchical Tree-Structured Indexer"
authors: ["Leon Lufkin", "Cutter Dawes", "Alexander Speicher", "Kamesh Krishnamurthy", "Tomás Figliolia", "Beren Millidge"]
year: 2026
venue: "arXiv preprint (Zyphra; v2, November 2026)"
arxiv_id: "2610.42112"
arxiv_version: v2
paper_type: method
hook: "Attention reads the whole past for every new token, so long contexts get slow. This paper builds a tree of summaries over that past, lets each token walk down it to the few pieces it needs, and bolts it onto a 35B model with one billion tokens of training."
big_idea: "Summarize the KV cache as a tree whose nodes predict how much attention their chunk of keys would get (via learned reference queries and a log-sum-exp tangent trick), let each query descend it with top-p at every level, and run exact attention on the few leaves it reaches; because the selected set grows sublinearly and the tree grows deeper with the context, attention becomes subquadratic."
goal: "Run a speech LLM over hour-long (or day-long) recordings without the attention cost exploding."
difficulty: 4
difficulty_note: "New to you: transformers themselves. The lesson builds attention, the KV cache and sparse attention from scratch over 19 toolbox pages, plus three small math tools (log-sum-exp, tangents, KL). The paper's machine then needs no new math."
date_added: 2026-11-03
tags: [LLMs, Transformers, Efficiency, Distillation, Systems]
description: "Attention reads the whole past for every new token, so long contexts get slow. This paper builds a tree of summaries over that past, lets each token walk down it to the few pieces it needs, and bolts it onto a 35B model with one billion tokens of training."
---

<article class="rd-page" id="next-token" data-part="Attention toolbox" data-draw="next-token" markdown>

<p class="rd-crumb"><b>Attention toolbox 1</b> Start here. Nothing earlier is needed. Our running example is a story with a secret code hidden inside.</p>

## What does a language model do, one token at a time?

1. **Text becomes tokens.** A tokenizer cuts text into pieces called **tokens**: words, parts of words, digits. Our story ends with "What is the code?"
2. **Each token becomes a vector.** A lookup table turns every token into a list of numbers. The model only ever sees these vectors.
3. **Layers mix the vectors.** Dozens of layers update each vector using the others. The mixing step between tokens is called **attention**.
4. **The last vector predicts.** It becomes a probability for every possible next token. Here "7" is most likely, because the story said the code is 7392.
5. **Then it repeats.** The chosen token is appended and the model runs again. Generating one token at a time is called **decoding**.

<p class="rd-cap">The story, tokens and probabilities are made up to illustrate. Nothing here is from the paper yet.</p>

<p class="rd-take"><b>A language model is a next-token predictor run in a loop.</b> To answer, it must find "7392" far back in the story. Attention does that finding.</p>

</article>

<article class="rd-page" id="qkv" data-part="Attention toolbox" data-draw="qkv" markdown>

<p class="rd-crumb"><b>Attention toolbox 2</b> Builds on page 1: every token is a vector.</p>

## What are queries, keys and values?

1. **Think of a library.** You arrive with a question. Every book has a label on its spine and content inside.
2. **The query is your question.** Each token makes a **query** vector: "what am I looking for?" Our last token, "code?", asks for the code.
3. **The key is the spine label.** Each earlier token makes a **key** vector: "what do I contain?" The token "7392" advertises a number.
4. **The value is the content.** Each token also makes a **value** vector: what it hands over if chosen. Keys are for matching, values for reading.
5. **All three are learned.** Three weight matrices turn one token vector into its query, key and value. Training sets those matrices.

<p class="rd-cap">The library picture and the tokens are ours. Every transformer uses this query/key/value split, including the models in this paper.</p>

<p class="rd-take"><b>Queries ask, keys advertise, values deliver.</b> Next: how a query decides which keys match.</p>

</article>

<article class="rd-page" id="dot" data-part="Attention toolbox" data-draw="dot" markdown>

<p class="rd-crumb"><b>Attention toolbox 3</b> Uses the query and key from page 2.</p>

## How does a dot product measure a match?

1. **Two arrows, one number.** The **dot product** multiplies matching entries and adds them up. Here vectors have two entries so we can draw them.
2. **Same direction, big score.** Turn the query slider. When the query points along the key, the score is large and positive.
3. **Opposite direction, negative.** Point it away and the score goes below zero. At a right angle it is exactly zero.
4. **Real vectors are long.** Real heads use hundreds of entries; this paper's Qwen heads use 256 (derived by us from Table II). Scores are divided by \(\sqrt{d}\) to keep them moderate.

<p class="rd-cap">The two-entry vectors are ours and the arithmetic is live. The 256 comes from 81,920 trained numbers ÷ (10 layers × 2 key heads × 16 references) (Table II).</p>

<p class="rd-take"><b>A query scores every key by a dot product.</b> Bigger means "more relevant to me". Next: turning scores into shares.</p>

</article>

<article class="rd-page" id="softmax" data-part="Attention toolbox" data-draw="softmax" markdown>

<p class="rd-crumb"><b>Attention toolbox 4</b> Uses the scores from page 3.</p>

## How do scores become attention weights?

1. **Exponentiate every score.** \(e^{s}\) makes every score positive. Bigger scores grow much faster than small ones.
2. **Divide by the total.** Each share is \(e^{s_j} / \sum_i e^{s_i}\). The shares add up to 1. This is **softmax**.
3. **Sharpen the scores.** Move the slider up. The top key takes almost everything; the rest shrink toward zero but never reach it.
4. **Flatten them.** Move it down. Weight spreads over many keys. Real attention heads do both, depending on the head and the text.

<p class="rd-cap">Six made-up scores; the softmax is computed live. The slider multiplies all scores, like a sharper or softer head.</p>

<p class="rd-take"><b>Softmax turns scores into weights that sum to 1.</b> Small weights are tiny but not zero. That fact matters later (page 19).</p>

</article>

<article class="rd-page" id="attn-out" data-part="Attention toolbox" data-draw="attn-out" markdown>

<p class="rd-crumb"><b>Attention toolbox 5</b> Combines pages 2–4.</p>

## What does attention actually output?

1. **Score the keys.** The query "code?" is dotted with all five earlier keys. "7392" scores highest.
2. **Softmax the scores.** The weight on "7392" is 0.85; the other four share the rest.
3. **Blend the values.** The output is the weighted sum of value vectors. It is mostly the value of "7392".
4. **That is one attention step.** Every token does this for itself, in every layer. The formula is \(\mathrm{softmax}(qK^\top/\sqrt{d})\,V\).

<p class="rd-cap">Toy two-entry vectors, our own; the numbers are computed live from them.</p>

<p class="rd-take"><b>Attention is a soft lookup: score, softmax, blend.</b> The output carries the value of whatever matched.</p>

</article>

<article class="rd-page" id="causal" data-part="Attention toolbox" data-draw="causal" markdown>

<p class="rd-crumb"><b>Attention toolbox 6</b> Every token does page 5 for itself.</p>

## Why does each token only look backwards?

1. **One row per query.** Row 3 holds token 3's weights over every key. Each row sums to 1.
2. **No peeking ahead.** A model that predicts the next token must not see it. So the upper triangle is masked out. This is **causal** attention.
3. **Count the pairs.** Token \(t\) scores \(t\) keys. All \(T\) tokens together score about \(T^2/2\) pairs.
4. **Double the text, four times the work.** Move the slider. Going from 8 to 16 tokens roughly quadruples the scored pairs.

<p class="rd-cap">The grid size is live; the weights shown are random, not from a model.</p>

<p class="rd-take"><b>Causal attention fills a triangle of about \(T^2/2\) scores.</b> That square is where "quadratic" comes from.</p>

</article>

<article class="rd-page" id="heads-gqa" data-part="Attention toolbox" data-draw="heads-gqa" markdown>

<p class="rd-crumb"><b>Attention toolbox 7</b> Repeats page 5 many times in parallel.</p>

## What are heads, and why do several share one key?

1. **Many heads per layer.** A layer runs several attentions side by side, each a **head**. One might track names, another numbers.
2. **Keys are expensive to store.** Every past token's keys and values stay in memory. More key heads means more memory.
3. **So query heads share.** In **grouped-query attention (GQA)**, several query heads read one shared key/value head.
4. **The paper's Qwen setup.** Its attention layers have 16 query heads and 2 key/value heads: eight query heads per group (App. A-A, App. A-B).
5. **ZHA follows the groups.** It builds one tree per key/value head, shared by that group's query heads (§III-A).

<p class="rd-cap">Head counts are from the paper (App. A-A: 16 query heads; App. A-B: eight per KV head). The drawing is ours.</p>

<p class="rd-take"><b>Query heads share key/value heads in groups of eight.</b> One tree per group keeps ZHA's extra memory small.</p>

</article>

<article class="rd-page" id="rope" data-part="Attention toolbox" data-draw="rope" markdown>

<p class="rd-crumb"><b>Attention toolbox 8</b> Adds position to the keys of page 2.</p>

## How does a token know where it sits?

1. **Dot products ignore order.** Shuffle the story and every score stays the same. The model needs position from somewhere.
2. **RoPE rotates by position.** **Rotary position embedding (RoPE)** spins each query and key by an angle that grows with its position.
3. **Scores then depend on distance.** Rotating both by their positions leaves only their difference in the dot product. Slide the key's position to see it.
4. **Some models skip it.** **NoPE** models use no explicit position at all. Nemotron-3.5-Lightning, tested here, is one (§II-A).

<p class="rd-cap">The rotation is real RoPE arithmetic on one 2-entry pair at a made-up frequency. Qwen3.6 uses partial RoPE (§II-A).</p>

<p class="rd-take"><b>RoPE makes a score depend on how far apart two tokens are.</b> ZHA must handle this when it summarizes keys (page 28).</p>

</article>

<article class="rd-page" id="kv-cache" data-part="Attention toolbox" data-draw="kv-cache" markdown>

<p class="rd-crumb"><b>Attention toolbox 9</b> Uses decoding from page 1 and attention from page 5.</p>

## What is the KV cache?

1. **Old keys never change.** A causal model's keys and values for past tokens stay fixed. Recomputing them each step would be wasteful.
2. **So keep them.** The **KV cache** stores every past key and value. Each new token adds one more of each.
3. **Each step reads it all.** The new query scores against every stored key. Press Next to watch the cache grow.
4. **It is big.** For Qwen's 10 attention layers, we estimate 20 KB per token. At 256K tokens that is about 5.4 GB.

<p class="rd-cap">20,480 bytes = 10 layers × 2 KV heads × 256 dims × (key + value) × 2 bytes. That is our arithmetic from Table II, not a reported number.</p>

<p class="rd-take"><b>The KV cache grows by one entry per token and is reread every step.</b> Prefill fills it; decoding reads it again and again.</p>

</article>

<article class="rd-page" id="quadratic" data-part="Attention toolbox" data-draw="quadratic" data-fast markdown>

<p class="rd-crumb"><b>Attention toolbox 10</b> Start the quick tour here. Uses pages 6 and 9.</p>

## Why does attention get so expensive with long context?

1. **Reading a prompt is quadratic.** **Prefill** processes the whole prompt at once: about \(T^2/2\) query–key pairs (page 6).
2. **Each new token is linear.** During decoding, one query reads all \(T\) cached keys (page 9). Longer context, slower every token.
3. **Move the context slider.** At 1 million tokens, prefill scores about 500 billion pairs per head.
4. **The paper's target.** Cut both: let each query read far fewer than \(T\) keys, and keep finding them cheap (§I).

<p class="rd-cap">Pair counts are live arithmetic per head per layer. The paper states the quadratic and linear costs in §I.</p>

<p class="rd-take"><b>Prefill costs \(T^2\), every decoded token costs \(T\).</b> Long context means both explode.</p>

</article>

<article class="rd-page" id="fixed-state" data-part="Long-context toolbox" data-draw="fixed-state" markdown>

<p class="rd-crumb"><b>Long-context toolbox 1</b> One answer to page 10's problem.</p>

## Why not keep a fixed-size memory instead?

1. **Keep a fixed state.** **State-space models** like Mamba and **sliding-window attention** keep a fixed-size memory. Cost per token stays flat (§I).
2. **But the memory fills.** New tokens keep adding information. A fixed box must overwrite old content, so long contexts suffer (§I).
3. **Our code falls out.** A window of 4 tokens cannot see "7392" 20 tokens back.
4. **Hybrids mix both.** Most layers use a fixed state; a few keep full attention. At long contexts those few layers dominate again (§I).

<p class="rd-cap">The window size and story are ours. The claims about fixed states and hybrids are §I's, citing Jelassi et al. on copying.</p>

<p class="rd-take"><b>A fixed-size memory is cheap but forgets.</b> The paper wants a memory that grows, just slower than the text.</p>

</article>

<article class="rd-page" id="sparse-attn" data-part="Long-context toolbox" data-draw="sparse-attn" markdown>

<p class="rd-crumb"><b>Long-context toolbox 2</b> The other answer to page 10.</p>

## What is sparse attention, and where does its cost hide?

1. **Keep every key, read a few.** **Sparse attention** keeps the full cache but lets each query attend to a small subset (§I).
2. **An indexer picks the subset.** A cheap scorer, the **indexer**, rates every key for this query. Then real attention runs on the top \(K\).
3. **Real attention is now cheap.** \(K\) is fixed, say 2,048 keys, whatever the context length. DSA and MSA work this way (§I).
4. **The indexer is not.** It still scores all \(T\) keys. Near 1M tokens, 60–90% of these layers' time goes to indexing (§I).

<p class="rd-cap">The 60–90% figure is §I's, citing IndexCache and LongCat. MSA's real budget, 16 blocks of 128 keys, is from §IV-A.</p>

<p class="rd-take"><b>Sparse attention moves the linear cost into the indexer.</b> That gives a constant-factor speedup, not a better scaling law.</p>

</article>

<article class="rd-page" id="topk-topp" data-part="Long-context toolbox" data-draw="topk-topp" markdown>

<p class="rd-crumb"><b>Long-context toolbox 3</b> Two ways to choose page 12's subset.</p>

## What is the difference between top-K and top-p?

1. **Sort the weights.** Line up keys from the biggest attention weight to the smallest.
2. **Top-K takes a fixed count.** Always keep the best \(K\). Here \(K=4\), whatever the weights look like.
3. **Top-p takes a fixed share.** Keep the fewest keys whose weights add up to at least \(p\) (§II-A). Move the \(p\) slider.
4. **Switch to a flat head.** When weight is spread out, top-p keeps many keys. Top-K still keeps 4 and misses most of the mass.
5. **Switch to a peaked head.** Now top-p keeps only 2. Top-K wastes two slots on near-zero keys.

<p class="rd-cap">Both weight lists are made up; the counts are computed live. The paper uses top-p, following Twilight (Lin et al.) (§III-C).</p>

<p class="rd-take"><b>Top-p adapts the count to the distribution; top-K cannot.</b> ZHA uses top-p at every level of its tree.</p>

</article>

<article class="rd-page" id="tree-search" data-part="Long-context toolbox" data-draw="tree-search" markdown>

<p class="rd-crumb"><b>Long-context toolbox 4</b> How to avoid page 12's "score every key".</p>

## How does a tree find things without checking everything?

1. **Play twenty questions.** To find one item among 16, ask "left half or right half?" Four answers find it.
2. **Each answer drops a whole branch.** Half of what remains is discarded without looking at it.
3. **Cost grows with depth, not size.** A million items need only 20 halvings. Move the slider.
4. **The catch: summaries must be right.** Each question needs a summary that knows what is inside a branch. A bad summary discards the answer (§II-B).

<p class="rd-cap">The halving count is live: ⌈log₂ N⌉. The paper's argument for a tree is §II-B.</p>

<p class="rd-take"><b>A tree turns "check everything" into "check one path".</b> ZHA's whole design is about making the summaries good enough.</p>

</article>

<article class="rd-page" id="power-law" data-part="Long-context toolbox" data-draw="power-law" markdown>

<p class="rd-crumb"><b>Long-context toolbox 5</b> A tool for reading the paper's plots.</p>

## What is a power law, and why plot it on log axes?

1. **Something grows like \(T^\alpha\).** A **power law** is \(y = c\,T^\alpha\). With \(\alpha = 1\) it is linear: double \(T\), double \(y\).
2. **Below 1 is sublinear.** With \(\alpha = 0.5\), doubling \(T\) multiplies \(y\) by only 1.41. Move the slider.
3. **Log axes straighten it.** \(\log y = \log c + \alpha \log T\). On log–log axes the curve is a line with slope \(\alpha\).
4. **Read the slope, read the law.** The paper fits slopes like this to its counts (Eq. 6). Slopes below 1 mean "grows slower than the context".

<p class="rd-cap">The curves are live arithmetic, not data. The paper fits power laws in Fig. 1 and Eq. 6.</p>

<p class="rd-take"><b>On log–log axes, a power law is a straight line whose slope is the exponent.</b> Slope below 1 is the paper's hope.</p>

</article>

<article class="rd-page" id="lse" data-part="Math toolbox" data-draw="lse" markdown>

<p class="rd-crumb"><b>Math toolbox 1</b> Uses softmax from page 4.</p>

## What is log-sum-exp, and why is it a chunk's weight?

1. **Take a chunk of keys.** Four keys, each with a score against our query.
2. **Their total pull.** A chunk's share of softmax is proportional to \(\sum_j e^{s_j}\). Bigger total, more attention (§III-A).
3. **Take its log.** \(\mathrm{LSE}(s) = \log \sum_j e^{s_j}\) is the **log-sum-exp**. The paper calls it the chunk's log attention mass.
4. **It is a soft maximum.** LSE sits just above the biggest score. Move the slider: one dominant score makes LSE nearly equal to it.

<p class="rd-cap">Four made-up scores; LSE is computed live. The definition is §III-A's \(F_C(q)\).</p>

<p class="rd-take"><b>Log-sum-exp is the log of a chunk's total attention pull.</b> If a summary predicts it, routing can compare chunks fairly.</p>

</article>

<article class="rd-page" id="tangent" data-part="Math toolbox" data-draw="tangent" markdown>

<p class="rd-crumb"><b>Math toolbox 2</b> A way to approximate page 16's curve.</p>

## How can straight lines stand in for a curve?

1. **A bowl-shaped curve.** A **convex** function curves upward, like a bowl. LSE, as the query changes, is convex (§III-A).
2. **Touch it with a tangent.** A tangent line touches the curve at one point and stays below it everywhere else.
3. **One tangent is good nearby.** Near its touching point the line is close. Far away it drifts below.
4. **Take the highest of several.** Add tangents at other points and keep whichever is highest. The result hugs the curve.

<p class="rd-cap">The curve is LSE of three made-up scores along one direction; tangents are exact, computed live.</p>

<p class="rd-take"><b>The maximum of a few tangents approximates a convex curve from below.</b> ZHA's summaries are exactly such tangents.</p>

</article>

<article class="rd-page" id="kl" data-part="Math toolbox" data-draw="kl" markdown>

<p class="rd-crumb"><b>Math toolbox 3</b> A tool for training, used on page 32.</p>

## How do you measure how wrong a distribution is?

1. **Two distributions over chunks.** Blue is the truth: how attention really splits. Violet is a guess.
2. **KL divergence compares them.** \(D_{KL}(p\|\hat p) = \sum p \log(p/\hat p)\). It is zero only when they match.
3. **Missing big chunks costs most.** Move the slider to starve the true top chunk. KL climbs fast.
4. **Training lowers it.** Minimizing KL pushes the guess toward the truth. This is **distillation**: a student copies a teacher's distribution.

<p class="rd-cap">Both distributions are made up; KL is computed live in nats.</p>

<p class="rd-take"><b>KL measures how far a guessed distribution is from the truth.</b> ZHA trains its summaries by minimizing it.</p>

</article>

<article class="rd-page" id="topp-growth" data-part="The evidence" data-draw="topp-growth" markdown>

<p class="rd-crumb"><b>Evidence 1</b> Uses top-p (page 13) and power laws (page 15).</p>

## How many keys does one query really need?

1. **Measure real attention.** Run Qwen3.6-35B-A3B on six long fiction books. For each query, count its top-p set (§II-A).
2. **With p = 1, you need everything.** Keeping all mass means all \(T\) keys: the dotted line.
3. **Any p below 1 grows slower.** The set grows like a power law with slope below 1 (Fig. 1).
4. **So long text gets more compressible.** The longer the context, the smaller the needed share. Lower p gives a flatter line.

<p class="rd-cap">Lines sketch the shape of Fig. 1; slopes are illustrative, not fitted values. The paper's plot covers up to about 260K tokens.</p>

<p class="rd-take"><b>A query's needed keys grow sublinearly with context.</b> A sublinear state might be enough.</p>

</article>

<article class="rd-page" id="union" data-part="The evidence" data-draw="union" markdown>

<p class="rd-crumb"><b>Evidence 2</b> Follows page 19: each query needs few keys.</p>

## Can we just throw the unneeded keys away?

1. **Take a 261,548-token book.** Look at the last \(W\) queries. Union up the top-p sets they pick from the older prefix (§II-B).
2. **One query uses a sliver.** A single query's top-p set covers a small part of the past.
3. **Many queries cover it all.** As \(W\) grows, the union approaches the whole prefix at high \(p\) (Fig. 2).
4. **So eviction fails.** A key ignored now is needed later. Keep the full cache and pick per query (§II-B).

<p class="rd-cap">The book length is real (§II-B). Curves sketch the shape of Fig. 2 and are not its values.</p>

<p class="rd-take"><b>Every query is sparse, but the union is not.</b> Store everything; retrieve a different few each time.</p>

</article>

<article class="rd-page" id="two-props" data-part="The evidence" data-draw="two-props" markdown>

<p class="rd-crumb"><b>Evidence 3</b> Combines pages 11, 12, 19 and 20.</p>

## What must a real replacement for attention get right?

1. **Property 1: each query picks its own keys.** Different queries need different parts of the past (§I).
2. **Property 2: state grows, but sublinearly.** Fixed memory saturates; full attention is wasteful (§I).
3. **Fixed states fail both.** Mamba and sliding windows keep a fixed state (§I).
4. **Top-K sparse attention half-fails.** It is query-dependent, but its indexer still scans every key (§I).
5. **ZHA aims for both.** Per-query selection, and a search whose work grows sublinearly (§I).

<p class="rd-cap">The two properties and the verdicts on each family are the paper's argument in §I; the board layout is ours.</p>

<p class="rd-take"><b>Query-dependent and sublinear: ZHA is built to have both.</b> Next: the machine itself.</p>

</article>

<article class="rd-page" id="machine" data-part="The machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Uses the KV cache (page 9) and tree search (page 14). Our story's code "7392" is somewhere in the cache.</p>

## What is the whole ZHA machine?

1. **Keep the full KV cache.** Nothing is evicted, as page 20 demands. ZHA only changes which keys each query reads (§III).
2. **Build a tree of summaries.** Every chunk of keys gets a compressed summary key. Chunks of summaries get summaries too, level by level (§III-A).
3. **Walk down from the top.** The query scores the top nodes, keeps the top-p, and opens their children. Repeat to the bottom (§III-C).
4. **Attend exactly to what you reached.** Normal attention runs on the few leaf chunks found. Our query lands on the chunk holding "7392".
5. **Only the summaries are learned.** The model stays frozen; a tiny set of **reference queries** is trained (§III-B). It replaces 10 of Qwen's 40 layers' attention (Table II).

<p class="rd-cap">The three stages follow Fig. 3; the drawing is ours. "10 / 40" counts Qwen's full-attention layers converted (Table II).</p>

<p class="rd-take"><b>Build a summary tree, route down it with top-p, attend exactly at the leaves.</b> The next pages open each box.</p>

</article>

<article class="rd-page" id="tree-shape" data-part="The machine" data-draw="tree-shape" markdown>

<p class="rd-crumb"><b>Machine 2</b> Opens the tree box of page 22.</p>

## What does the tree over the KV cache look like?

1. **Chunk size \(C\).** Group \(C\) neighbouring keys into a chunk. Each chunk gets a summary at level 1 (§III-A).
2. **Depth \(L\).** Group \(C\) summaries into a level-2 node, and so on. A top node covers \(C^L\) keys, the **compression** (Fig. 4).
3. **References \(R\).** Each node stores \(R\) summaries, one per reference query (§III-A). Page 26 explains why.
4. **The paper's two main trees.** Deep: C4 L6, top nodes span 4,096 keys. Wide: C256 L1, one level of 256-key chunks (§IV-A).
5. **At 256K tokens.** Deep has 64 top nodes over 65,536 leaf chunks. Wide has 1,024 chunks. Try the toggles.

<p class="rd-cap">Node counts are live arithmetic for a 262,144-token cache. Geometry names follow the paper (Fig. 4, §IV-A); the small tree drawn is a C4 L3 toy.</p>

<p class="rd-take"><b>A tree is set by chunk size, depth and references: C, L, R.</b> Top nodes cover \(C^L\) keys each.</p>

</article>

<article class="rd-page" id="chunk-mass" data-part="The machine" data-draw="chunk-mass" markdown>

<p class="rd-crumb"><b>Machine 3</b> Uses log-sum-exp from page 16.</p>

## What should a chunk's summary predict?

1. **The query cares about totals.** For routing, a chunk matters by how much attention all its keys get together.
2. **That total is LSE.** The chunk's log attention mass is \(F_C(q) = \mathrm{LSE}_j(q^\top k_j/\sqrt d)\) (§III-A).
3. **It changes with the query.** Turn the query. Pointing at the chunk raises \(F_C\); pointing away lowers it.
4. **We cannot afford it exactly.** Computing \(F_C\) means scoring every key in the chunk, the very cost we want to skip.
5. **So approximate it.** A summary should give \(F_C(q)\) for any future query, from a few stored numbers (§III-A).

<p class="rd-cap">Four 2-entry keys and the query angle are ours; \(F_C\) is computed live.</p>

<p class="rd-take"><b>A good summary predicts the chunk's log attention mass for any query.</b> Next: how to do that with one vector and one number.</p>

</article>

<article class="rd-page" id="one-ref" data-part="The machine" data-draw="one-ref" markdown>

<p class="rd-crumb"><b>Machine 4</b> Combines page 24's \(F_C\) with tangents from page 17.</p>

## How does one reference query summarize a chunk?

1. **Pick a reference query.** \(\hat q_r\) is a learned vector, a typical query to expand around (§III-A).
2. **Attend with it.** Its attention weights over the chunk average the keys into one **compressed key** \(\hat k_r\) (§III-A).
3. **Store one bias.** \(\hat b_r = F_C(\hat q_r) - \hat q_r^\top\hat k_r/\sqrt d\). That works out to the weights' entropy (§III-A).
4. **That is a tangent.** \(t_r(q) = q^\top\hat k_r/\sqrt d + \hat b_r\) touches \(F_C\) at the reference query. Turn the query to see it (§III-A).
5. **One key and one number per reference.** Scoring a summary costs one dot product, whatever the chunk size.

<p class="rd-cap">The chunk and reference are ours; the tangent is the paper's construction (§III-A), computed live.</p>

<p class="rd-take"><b>A summary is a key plus a bias: the tangent of the chunk's mass.</b> Accurate near the reference query, too low far away.</p>

</article>

<article class="rd-page" id="many-refs" data-part="The machine" data-draw="many-refs" markdown>

<p class="rd-crumb"><b>Machine 5</b> Fixes page 25's weakness with page 17's trick.</p>

## Why keep sixteen summaries per chunk?

1. **One tangent drifts.** Queries far from the reference get an underestimate. The chunk could be wrongly pruned.
2. **Use several references.** Each reference query gives its own tangent. The chunk's score is the highest: \(s = \max_r t_r(q)\) (§III-A).
3. **More tangents, smaller gap.** Raise \(R\). The worst-case gap to the true curve shrinks.
4. **The paper's default is R16.** One set of 16 references is shared by every node, level and query head of a tree (§III-B).

<p class="rd-cap">Tangents and gaps are computed live on our toy chunk; the references here are evenly spread, not learned.</p>

<p class="rd-take"><b>The max over R tangents is a piecewise-flat approximation of the chunk's mass.</b> Sixteen keeps it close for most queries.</p>

</article>

<article class="rd-page" id="merge" data-part="The machine" data-draw="merge" markdown>

<p class="rd-crumb"><b>Machine 6</b> Builds level 2 from page 25's level-1 summaries.</p>

## How are the upper levels built?

1. **Treat children like keys.** A level-2 node has \(C\) children. Each child already has a key and a bias per reference (§III-A).
2. **Score children with their bias.** The reference query scores each child as \(\hat q^\top\hat k_c/\sqrt d + \hat b_c\). Biases carry each child's hidden mass.
3. **Average and add.** Softmax those scores, average child keys into the parent key, and fold child biases into the parent bias (§III-A).
4. **Nothing is lost by stacking.** With one reference throughout, this gives exactly the summary built from all raw keys (§III-A, footnote 2).

<p class="rd-cap">The merge rule is §III-A's; the two levels drawn are ours. The exactness claim holds without RoPE (footnote 2).</p>

<p class="rd-take"><b>Every level is built by the same small attention over the level below.</b> Building the tree never touches raw keys twice.</p>

</article>

<article class="rd-page" id="rope-fix" data-part="The machine" data-draw="rope-fix" markdown>

<p class="rd-crumb"><b>Machine 7</b> Brings RoPE from page 8 into page 27's merge.</p>

## How does RoPE change the summaries?

1. **Keys carry rotations.** With RoPE, a key's direction depends on its position (page 8). A summary must match that.
2. **Rotate the reference too.** Each node uses its reference query rotated to the node's last token position (§III-B).
3. **Parents sit later than some children.** A parent's reference is rotated further than its earlier children's were.
4. **Add a correction.** Each child's score gets \(\langle\hat k_c, \hat q_P - \hat q_c\rangle/\sqrt d\): the key's score change between the two references (§III-B).
5. **Not exact any more.** With RoPE, the merge gives a lower bound, not a true tangent (§III-A, footnote 2).

<p class="rd-cap">The correction term is §III-B's. Angles in the drawing are ours, at one made-up frequency.</p>

<p class="rd-take"><b>With RoPE, references are rotated per node and child scores are corrected.</b> The trick stays approximate, and works in practice.</p>

</article>

<article class="rd-page" id="update" data-part="The machine" data-draw="update" markdown>

<p class="rd-crumb"><b>Machine 8</b> When page 23's tree grows during decoding.</p>

## When does the tree grow during generation?

1. **New keys wait in a buffer.** Freshly decoded keys sit in the current chunk until it holds \(C\) of them (§III-A).
2. **Every \(C\) steps, a new leaf summary.** With C4, a level-1 node is built every 4 tokens.
3. **Every \(C^2\) steps, a level-2 node.** Then every 64 for level 3, and so on up. Press Next to decode.
4. **The cost is tiny.** Amortized, tree upkeep adds around 1% or less of latency in the paper's model (§III-A, Eq. 43).

<p class="rd-cap">The build schedule is §III-A's; the decode clock is live. The 1% figure is from the roofline model, not a timing.</p>

<p class="rd-take"><b>The tree grows by one leaf every \(C\) tokens and costs about 1% to maintain.</b> Now the query can use it.</p>

</article>

<article class="rd-page" id="routing" data-part="The machine" data-draw="routing" data-fast markdown>

<p class="rd-crumb"><b>Machine 9</b> The routing box of page 22, on a 256-token toy cache with C4 L3. The query is "What is the code?"</p>

## How does a query find its way down the tree?

1. **Score every top node.** The toy has 4 top nodes. The query scores each with its summaries (§III-C).
2. **Keep the top-p.** Sort by estimated mass and keep the fewest nodes holding fraction \(p\) (§III-C).
3. **Open their children.** Only children of kept nodes become candidates for the next level. The rest are never scored.
4. **Repeat at every level.** Top-p again, open again, until the leaf chunks (§III-C).
5. **Count the work.** Try "many look-alikes": the router opens more branches to find the right chunk, as Fig. 25 shows.

<p class="rd-cap">Toy masses are ours: one needle chunk, recent text, and noise. We route on exact masses; the real router uses learned summaries.</p>

<p class="rd-take"><b>Top-p at each level prunes whole branches.</b> In our toy, 20 scored nodes find the needle; look-alikes push it to 48.</p>

</article>

<article class="rd-page" id="final-set" data-part="The machine" data-draw="final-set" markdown>

<p class="rd-crumb"><b>Machine 10</b> Where page 30's walk ends.</p>

## What does the query attend to in the end?

1. **The leaf chunks it kept.** All keys in the selected level-1 chunks (§III-C).
2. **Always the first token.** Many models dump spare attention on token 0, an **attention sink**. ZHA always keeps it (§III-C, footnote 6).
3. **Always the current chunk.** The newest keys, not yet summarized, are always read (§III-C).
4. **Then plain attention.** Each head runs exact softmax attention over just this set (§III-C).
5. **Heads share the loads.** The 8 heads of a group load the union of their chunks once. Each keeps its own mask (§III-C).

<p class="rd-cap">The set \(\mathcal{I}(q)\) is §III-C's. Toy chunks continue page 30's example.</p>

<p class="rd-take"><b>Sink plus selected chunks plus the current chunk, then exact attention.</b> No approximation in the final step.</p>

</article>

<article class="rd-page" id="train" data-part="The machine" data-draw="train" data-fast markdown>

<p class="rd-crumb"><b>Machine 11</b> Uses KL from page 18. Trains page 25's reference queries.</p>

## How are the reference queries trained?

1. **Freeze the whole model.** No weight of Qwen changes. Only the reference queries learn (§III-B).
2. **Get the true chunk shares.** Run dense attention and add up each chunk's weights, at every level (§III-B).
3. **Get the predicted shares.** Softmax the summary scores \(s\) over the same chunks (§III-B).
4. **Minimize KL at every level.** Sum KL(true ‖ predicted) over all levels, queries, heads and layers (§III-B).
5. **It is tiny.** 81,920 numbers, 0.00024% of the model, trained on 0.996B tokens. MSA's indexer needed 7.87M and 40B (Table II). [[81,920 | trained parameters for a 35B model (Table II)]]

<p class="rd-cap">All counts from Table II. Training ran 1,900 steps at 32,768 tokens per sequence, learning rate 3.2×10⁻² (App. B-A).</p>

<p class="rd-take"><b>Teach the summaries to predict dense attention's chunk shares.</b> One billion tokens and 81,920 numbers.</p>

</article>

<article class="rd-page" id="train-kl" data-part="The machine" data-draw="train-kl" markdown>

<p class="rd-crumb"><b>Machine 12</b> How well page 32's training worked, level by level.</p>

## How well do the summaries match after training?

1. **Bottom level is easy.** The deep tree's level 1 summarizes 4 keys. Its final KL is 0.021 (Table III).
2. **Higher levels are harder.** Each node covers more keys: 4,096 at level 6. KL rises to 0.319 (Table III).
3. **The climb flattens.** Levels 5 and 6 differ by only 0.017. Depth does not blow up the error.
4. **Wide chunks are hard too.** The wide tree's 256-key chunks end at 0.242 (Table III).
5. **Read with care.** The paper warns these sums are aggregated differently, so do not compare across trees directly (App. B-A).

<p class="rd-cap">All values are Table III's final training KL (last 100 steps). Nemotron: toggle.</p>

<p class="rd-take"><b>Error grows with how many keys a node covers, then levels off.</b> That flattening is good news for deep trees.</p>

</article>

<article class="rd-page" id="why-topp" data-part="The machine" data-draw="why-topp" markdown>

<p class="rd-crumb"><b>Machine 13</b> Real numbers for page 13's top-p versus top-K.</p>

## Why choose top-p at every level?

1. **Tasks differ in sparsity.** At 64K, 90% of dense attention sits in 2.3% of 16-key chunks on RULER (§VI-A).
2. **Code needs more.** On SWE-bench Verified it is 11.7%; on fiction books 15.0% (§VI-A).
3. **ZHA's top-p follows.** An R16 C16 L3 router at \(p=0.9\) keeps 0.44%, 5.0% and 7.4% of chunks (§VI-A).
4. **And still finds the mass.** Those chunks hold a median 80%, 78% and 78% of dense attention (§VI-A).
5. **Top-K cannot do this.** A fixed budget is too big for RULER or too small for books (§VI-A).

<p class="rd-cap">All percentages from §VI-A (medians over steps, layers and heads, excluding key 0 and the current chunk).</p>

<p class="rd-take"><b>Top-p reads 17 times more chunks on books than on RULER, automatically.</b> A fixed top-K would have to pick one budget.</p>

</article>

<article class="rd-page" id="sublinear" data-part="The machine" data-draw="sublinear" markdown>

<p class="rd-crumb"><b>Machine 14</b> Why pages 22–34 beat the \(T^2\) of page 10.</p>

## Why does the total cost grow slower than the context?

1. **Dense decoding reads \(T\) keys per token.** Over a whole sequence that adds up to about \(T^2/2\).
2. **ZHA reads about \(T^\alpha\) per token.** If selected nodes grow like a power law with \(\alpha<1\), so does all the work (§V-B).
3. **Grow the tree with the context.** Fixed depth means top nodes grow like \(T/C^L\). Adding levels as \(T\) grows stops that (§V-A).
4. **The total is \(T^{1+\alpha}\).** Subquadratic, but still more than linear (Abstract). Move \(\alpha\) to see the gap.

<p class="rd-cap">Curves are live arithmetic with made-up constants. Real exponents come later (page 44).</p>

<p class="rd-take"><b>Per-token work \(T^\alpha\) with \(\alpha<1\) makes the whole sequence subquadratic.</b> Whether \(\alpha\) stays below 1 is an empirical question.</p>

</article>

<article class="rd-page" id="reasoning" data-part="Does it work?" data-draw="reasoning" markdown>

<p class="rd-crumb"><b>Results 1</b> The trees of page 23 on Qwen3.6-35B-A3B, at \(p=0.95\).</p>

## Does reasoning survive the sparse router?

1. **Five hard benchmarks.** Math (AIME 2026), agentic coding (SWE-bench Verified, Terminal-Bench 2.1), and knowledge (MMLU-Pro, GPQA Diamond) (Fig. 5).
2. **AIME drops a little.** Dense 93.1%, deep 91.2%, wide 90.8% (Fig. 5).
3. **Coding holds.** SWE-bench: 67.4% dense and deep, 68.4% wide. Terminal-Bench is noisy: 49.9, 46.7, 53.3 (Fig. 5).
4. **Knowledge is unchanged.** MMLU-Pro and GPQA scores sit within half a point of dense (Fig. 5).
5. **MSA is close too.** Short reasoning prompts barely stress any sparse method. The gap shows on retrieval (page 37).

<p class="rd-cap">All scores read from the bar labels of Fig. 5(a). Grey dense, blue deep C4 L6, violet wide C256 L1, red MSA.</p>

<p class="rd-take"><b>Reasoning and coding stay within noise of dense attention.</b> The harder test is finding things in long context.</p>

</article>

<article class="rd-page" id="retrieval" data-part="Does it work?" data-draw="retrieval" data-fast markdown>

<p class="rd-crumb"><b>Results 2</b> Long-context retrieval, the needle-in-a-story test of page 1, at 256K.</p>

## Does long-context retrieval survive?

1. **RULER-13 at 256K tokens.** Thirteen synthetic find-and-aggregate tasks. Dense scores 96.0% (Fig. 5).
2. **Wide matches it.** 96.2%. Deep scores 93.3% while reading about 2.8% of decode keys (Fig. 5, Fig. 14).
3. **MSA falls to 77.1%.** Its fixed 16 blocks of 128 keys miss needles (Fig. 5).
4. **LongBench v2: ZHA beats dense.** 63.4% deep and 62.4% wide versus 58.0% dense (Fig. 5). 🧠 Pruning may remove distracting text.
5. **Same sparsity, 12.7 points apart.** Deep and MSA both read about 1% of keys on LongBench, yet deep scores 12.7 points higher (§IV-A).

<p class="rd-cap">Scores from Fig. 5(b); key shares from Fig. 14. MSA was trained by the authors on 40× ZHA's tokens (§IV-A).</p>

<p class="rd-take"><b>On retrieval, ZHA keeps dense accuracy where fixed top-K drops 19 points.</b> At equal sparsity, adaptive beats fixed.</p>

</article>

<article class="rd-page" id="key-share" data-part="Does it work?" data-draw="key-share" markdown>

<p class="rd-crumb"><b>Results 3</b> How sparse were pages 36 and 37?</p>

## How few keys does it actually read?

1. **Deep reads very little.** At \(p=0.95\), deep reads 5.7% of keys on AIME and 1.1% on LongBench (Fig. 14).
2. **Wide reads much more.** 47% on AIME and 21% on LongBench. One level of top-p prunes less (App. B-C).
3. **Lower p, fewer keys.** Switch to \(p=0.8\). Deep falls to 0.52% on AIME and 0.074% on LongBench (Fig. 14).
4. **Sparsity compounds with depth.** Six top-p cuts multiply; one cut does not (App. B-C).
5. **MSA's share is fixed in keys.** 2,048 keys is 85% of a short MMLU-Pro prompt but 0.76% of RULER (Fig. 14).

<p class="rd-cap">Shares are decode keys attended, from Fig. 14's bar labels. Scores at lower p are in Fig. 13.</p>

<p class="rd-take"><b>The deep tree reads 1–6% of keys at \(p=0.95\), far fewer at lower \(p\).</b> Depth is where the sparsity comes from.</p>

</article>

<article class="rd-page" id="geometry" data-part="Does it work?" data-draw="geometry" markdown>

<p class="rd-crumb"><b>Results 4</b> Varies page 23's C, L and R across 28 trees.</p>

## Does the shape of the tree matter?

1. **28 trees, five p values.** R from 1 to 16, C from 4 to 256, L from 1 to 6, all on RULER (§IV-B).
2. **Broadly robust.** Between 10% and 30% of keys read, every geometry keeps its accuracy (§IV-B).
3. **Depth helps at fixed compression.** With \(C^L = 4096\) fixed, deeper trees stay accurate at higher sparsity (Fig. 6b).
4. **Fewest keys is not fastest.** R16 C4 L2 reaches 95.8% at only 0.38% of keys (App. C-C).
5. **Fastest prefers light trees.** R1 C8 L2 gets 92.7% at a modeled 2.28× speedup; routing costs time too (App. C-C).

<p class="rd-cap">Accuracies and speedups are App. C-C's, at \(p=0.7\) and 256K; dense scores 96.0%. Speedups are modeled, not measured.</p>

<p class="rd-take"><b>Depth is not the weak point; heavy routing is.</b> The best tree for accuracy is not the best for speed.</p>

</article>

<article class="rd-page" id="predict-acc" data-part="Does it work?" data-draw="predict-acc" markdown>

<p class="rd-crumb"><b>Results 5</b> A formula for page 39's results.</p>

## Can you predict accuracy from the tree's shape?

1. **Start from dense accuracy.** \(A_{\mathrm{dense}}\) at that context length (Eq. 2).
2. **Each level costs a little.** A level whose nodes span more keys is harder: \(d_\ell = \log(1 + C^\ell/R^r)\). More references ease it (Eq. 2).
3. **Sparsity scales the penalty.** \((1-p)^b\): a lower \(p\) hurts more (Eq. 2).
4. **Multiply over levels.** \(\hat A = A_{\mathrm{dense}}\prod_\ell \exp[-a(1-p)^b d_\ell^h]\). Four fitted numbers in total (Eq. 2).
5. **It predicts new lengths.** Fit on two lengths, predict the third: off by 1.44 points on average (Fig. 6d).

<p class="rd-cap">The formula and RMSE are §IV-B's. The fitted values of \(a, b, h, r\) are not reported; spans in the drawing are live arithmetic.</p>

<p class="rd-take"><b>Accuracy falls smoothly and predictably with span, references and p.</b> You can choose a tree before training it.</p>

</article>

<article class="rd-page" id="failures" data-part="Does it work?" data-draw="failures" markdown>

<p class="rd-crumb"><b>Results 6</b> The honest side of pages 36–40.</p>

## Where does it break?

1. **Without RoPE, retrieval drops.** On NoPE Nemotron-3.5-Lightning, RULER falls 25.3 points (deep) and 10.2 (wide) at \(p=0.95\) (App. B-D).
2. **Too low a p collapses.** Deep C4 L6 at \(p=0.7\) scores 44.0% on AIME versus 93.1% dense (§V-B).
3. **Small models resist.** Below 1B parameters, conversion struggled on retrieval; their dense attention was too noisy to copy (§VII).
4. **Long contexts are untested.** Accuracy was measured up to 256K. Million-token claims rest on modeled latency (§VII).

<p class="rd-cap">All numbers from the cited sections. Nemotron's reasoning and coding stayed close to dense (App. B-D).</p>

<p class="rd-take bad"><b>ZHA needs RoPE-like structure, a moderate p, and a big enough model.</b> Beyond 256K tokens, accuracy is untested.</p>

</article>

<article class="rd-page" id="ref-structure" data-part="Does it work?" data-draw="ref-structure" markdown>

<p class="rd-crumb"><b>Results 7</b> A look inside page 26's sixteen references.</p>

## Do the sixteen reference queries stay different?

1. **They could collapse.** Nothing in training forces the 16 to differ. Identical references would waste compute (§VI-B).
2. **They spread into a cone.** Average pairwise cosine similarity is 0.44 across 20 KV groups (§VI-B).
3. **Upper levels favour a few.** Selection concentrates on a few references near the top and evens out near the leaves (Fig. 9).
4. **Levels disagree with distance.** In a typical group, leaf and top rankings correlate only 0.12 (Fig. 27).
5. **Different trees learn similar references.** Independently trained geometries end up with matching directions (App. H).

<p class="rd-cap">0.44 from §VI-B; correlations 0.12, −0.35 and 0.86 are Spearman values from Figs. 27–29.</p>

<p class="rd-take"><b>The references self-organize into distinct, reusable directions.</b> They did not collapse.</p>

</article>

<article class="rd-page" id="roofline" data-part="How fast?" data-draw="roofline" markdown>

<p class="rd-crumb"><b>Speed 1</b> A toolbox page for GPUs. Uses the cache sizes of page 9.</p>

## What limits a GPU: math, memory, or waiting?

1. **Three possible limits.** A kernel takes as long as the slowest of: its math, its memory reads, or its rounds of workers (Eq. 4).
2. **Decoding is memory-bound.** Each cached key costs 1,024 bytes to read and 8,192 operations for 8 heads. That is 8 operations per byte.
3. **The GPU wants about 295.** An H100 does about 989 TFLOP/s against 3.35 TB/s (found by us). So memory sets the time.
4. **Waves matter at the top of the tree.** An H100 has 132 workers, called SMs (App. D). A level with 20 tiles leaves 112 idle (Eq. 5).

<p class="rd-cap">Bytes and operations per key are our arithmetic for d = 256, BF16, 8 heads. H100 specs are NVIDIA's public figures; the 132 SMs are App. D's.</p>

<p class="rd-take"><b>Decode attention is limited by memory reads, so reading fewer keys is speed.</b> Small tree levels waste workers.</p>

</article>

<article class="rd-page" id="exponents" data-part="How fast?" data-draw="exponents" markdown>

<p class="rd-crumb"><b>Speed 2</b> Puts real numbers into page 35's \(\alpha\).</p>

## How fast does the selected set grow at each level?

1. **Count selected nodes per level.** Replay AIME generations from 16K to 64K tokens and fit a power law per level (Eq. 6).
2. **The top grows fastest.** Top-level exponents sit near 0.8–0.9; leaf levels much lower (Fig. 7f).
3. **A formula for the top.** Fitted across depths: \(\beta(p) = 0.3736 + 0.5536\,p\) (Eq. 58). Move \(p\).
4. **Deeper trees push it up.** The linear-depth fit adds \((0.0077 + 0.0352\,p)\,L\) (Eq. 58). Move \(L\).
5. **Few data points.** These fits rest on 20 measurements: five depths at four p values (§V-B).

<p class="rd-cap">Eq. 58 coefficients are the paper's; the arithmetic is live. Figure values marked ≈ are read off Fig. 7(f) by us.</p>

<p class="rd-take"><b>Every exponent is below 1: selection grows sublinearly at every level.</b> But it creeps up as the tree deepens.</p>

</article>

<article class="rd-page" id="crossover" data-part="How fast?" data-draw="crossover" data-fast markdown>

<p class="rd-crumb"><b>Speed 3</b> Feeds page 44's exponents into page 43's roofline.</p>

## When does ZHA beat dense attention and MSA?

1. **A light tree.** R1 C8 at \(p=0.75\), Qwen 35B in BF16, one layer, batch 1, on an H100 model (§V-C).
2. **Short contexts: ZHA is slower.** Routing has fixed overheads. Dense wins below about 48K tokens (§V-C).
3. **It passes MSA near 0.48M.** MSA's indexer is linear; ZHA's work is not (§V-C).
4. **At a billion tokens.** 373–417× faster than dense and 52–58× faster than MSA, using five levels (§V-C).
5. **All of it is modeled.** No kernels were released or timed, and no model was run at these lengths (§V, Fig. 8).

<p class="rd-cap">Crossovers and speedups are §V-C's. Our curves are a sketch fitted to those four numbers, not the paper's curves (Fig. 8).</p>

<p class="rd-take bad"><b>The speedups are projections from a performance model, not measurements.</b> Still, the scaling shape is the point.</p>

</article>

<article class="rd-page" id="p-depth" data-part="How fast?" data-draw="p-depth" markdown>

<p class="rd-crumb"><b>Speed 4</b> A catch in page 45's "just add levels".</p>

## Why can't p stay fixed as the tree deepens?

1. **Each level keeps fraction p.** Mass surviving to the leaves is at most about \(p^L\) (§VII).
2. **Fixed p starves deep trees.** \(p=0.9\) over 6 levels keeps 0.53; over 20 levels, 0.12. Move \(L\) (§VII).
3. **Raising p per level overshoots.** Use \(p^{1/L}\) to keep the total at \(p\). Then upper levels keep almost everything and cost returns to quadratic (§VII).
4. **The answer depends on the data.** \(p\) must shrink with depth just as fast as useful information thins out (§VII).

<p class="rd-cap">\(p^L\) and \(p^{1/L}\) are live arithmetic; the argument is §VII's. The bound ignores errors in the summaries.</p>

<p class="rd-take"><b>Scaling ZHA to billions of tokens needs a p schedule nobody has found yet.</b> The paper says so openly.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Questions raised by pages 36–46.</p>

## What would a careful reviewer question?

1. **Was latency measured?** No. Every speedup comes from a roofline model; kernels are not released (§V).
2. **Does accuracy hold beyond 256K?** Untested. The authors name it their main limitation (§VII).
3. **Was the MSA baseline fair?** The authors trained it themselves, on 40B tokens with their own settings (App. B-A).
4. **Are the extrapolations solid?** The depth trend rests on 20 measurements, and both fits are "loose bounds" (§V-B).
5. 🧠 **The steelman.** A frozen 35B model kept its hard-benchmark scores with 81,920 new numbers. That part is measured.

<p class="rd-cap">Answers cite the paper. The steelman is our view.</p>

<p class="rd-take"><b>The accuracy results are real; the speed story is a careful model.</b> Wait for kernels before trusting the speedups.</p>

</article>

<article class="rd-page" id="landscape" data-part="Your move" data-draw="landscape" markdown>

<p class="rd-crumb"><b>Your move 2</b> The families from pages 11–12, with names.</p>

## Where does ZHA sit among other methods?

1. **Fixed state.** Mamba, sliding windows, hybrids like Zamba and Jamba. Cheap, but memory saturates (§I).
2. **Top-K with a full indexer.** DSA and MSA. Query-dependent, but the indexer scans every key (§I).
3. **One-level chunk sparsity.** NSA and Hu et al. score chunk summaries: a constant-factor saving (§I).
4. **Multi-level trees.** HiP and PISA reach log-linear cost but lose retrieval at long contexts (§I).
5. **ZHA.** A multi-level tree, learned mass-predicting summaries, and top-p at every level (§III).

<p class="rd-cap">Families and their weaknesses are §I's account, not our benchmark. Placement on the map is our sketch.</p>

<p class="rd-take"><b>ZHA is a multi-level tree that keeps retrieval quality.</b> That combination is its claim to novelty.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 3</b> Our pick of goal: a speech LLM over long recordings. Uses page 45's crossovers.</p>

## Should you use ZHA for hour-long audio in a speech LLM?

1. **Count your tokens.** One hour of audio at 12.5 tokens per second is 45,000 tokens. Move the sliders.
2. **One hour: not yet.** Below about 48K tokens, dense attention is modeled as faster (§V-C).
3. **A working day: ZHA's zone.** Eight hours at 12.5 Hz is 360,000 tokens: faster than dense, slower than MSA (§V-C).
4. **Days of audio: ZHA wins.** Beyond about 0.48M tokens it is modeled as fastest (§V-C).
5. 🧠 **Verdict: watch, don't build yet.** Speech is untested, kernels are unreleased, and accuracy stops at 256K.

<p class="rd-cap">Token rates found by us (12.5 Hz Mimi-style codecs, 50 Hz Whisper encoder). Crossovers are modeled (§V-C).</p>

<p class="rd-take"><b>For an hour of audio, dense attention is still the right choice.</b> Revisit when kernels ship.</p>

</article>

<article class="rd-page" id="try-next" data-part="Your move" data-draw="try-next" markdown>

<p class="rd-crumb"><b>Your move 4</b> Weekend-sized ideas building on the whole lesson.</p>

## What could you try next?

1. 🧠 **Measure top-p growth on audio.** Repeat Fig. 1 on a speech LM's attention. Does speech compress like text?
2. 🧠 **Build page 26 in NumPy.** Real keys from a small model, tangent summaries, max over R. Check predicted chunk mass.
3. 🧠 **Try a recency-biased tree.** Finer chunks near the present, coarser far back. The authors suggest it (§VII).
4. 🧠 **Add value summaries.** Let pruned branches still add a coarse output, another §VII idea.

<p class="rd-cap">Placement by effort and payoff is our guess.</p>

<p class="rd-take"><b>The cheapest first step is page 19's measurement on your own data.</b> It tells you whether ZHA could work at all.</p>

</article>

<article class="rd-page" id="check-trained" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 22 and 32.</p>

## What is the only thing ZHA trains?

- [ ] All attention weights of the base model, briefly
- [ ] A new indexer projection, like MSA's
- [x] A small set of reference queries per key/value head
- [ ] The chunk boundaries of the tree

<p class="rd-take"><b>Only the reference queries: 81,920 numbers for Qwen.</b> The backbone is frozen; MSA's indexer has 7.87M (Table II). Learned chunk boundaries are future work (§VII).</p>

</article>

<article class="rd-page" id="check-evict" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 19 and 20.</p>

## Each query needs few keys. Why not delete the rest?

- [ ] Deleting keys breaks RoPE positions
- [x] Different future queries need different keys, so their union covers almost everything
- [ ] Softmax needs every key to normalize
- [ ] The GPU cannot free memory once allocated

<p class="rd-take"><b>The union of many queries' top-p sets covers nearly the whole cache.</b> So ZHA keeps every key and retrieves per query (§II-B, Fig. 2).</p>

</article>

<article class="rd-page" id="check-bias" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From pages 25 and 26.</p>

## Why does each summary store a bias as well as a key?

- [ ] To encode the chunk's position
- [ ] To keep scores positive
- [x] So that key-plus-bias is a tangent to the chunk's log attention mass
- [ ] Because the softmax at the leaves needs it

<p class="rd-take"><b>The bias lifts the line to touch \(F_C\) at the reference query.</b> It equals the reference's attention entropy over the chunk (§III-A).</p>

</article>

<article class="rd-page" id="check-depth" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> From page 46.</p>

## With \(p=0.9\) at each of 6 levels, how much mass is guaranteed to survive?

- [ ] 0.90, since every level uses the same p
- [ ] 0.99, because errors cancel across levels
- [x] About 0.53, since 0.9⁶ ≈ 0.53
- [ ] 0.10, one minus p

<p class="rd-take"><b>Losses compound: \(0.9^6 \approx 0.53\).</b> That is why a fixed p cannot scale to very deep trees (§VII).</p>

</article>

<article class="rd-page" id="check-claim" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 5</b> Spot the flaw. From pages 45 and 47.</p>

## A post says "ZHA is 400× faster than attention." What is wrong?

- [ ] Nothing; the paper measured it on H100s
- [ ] The 400× is against MSA, not dense attention
- [x] It is a modeled projection at a billion tokens, and accuracy was tested only to 256K
- [ ] ZHA is always slower than dense attention

<p class="rd-take"><b>It is a roofline projection, at a length no model was evaluated at.</b> Against MSA the projected gain is 52–58× (§V-C).</p>

</article>
