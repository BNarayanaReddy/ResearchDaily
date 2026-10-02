# Toy: does a demo-conditioned policy actually read the demo?  (CPU, ~25 s)
# Task: visit a red and a blue target; a demo recorded in ANOTHER scene shows the order.
# Same model, two training sets. "shortcut": the first target is always the left one, so the
# scene alone gives the order away. "ambiguous": the order is independent of the scene.
import torch, torch.nn as nn
D, RED, BLUE = 32, torch.tensor([1., 0.]), torch.tensor([0., 1.])

def scene(n, shortcut, red_first):
    r, b = torch.rand(n, 2), torch.rand(n, 2)
    if shortcut:  # move the first-visited target to the left
        lo, hi = torch.minimum(r[:, 0], b[:, 0]), torch.maximum(r[:, 0], b[:, 0])
        r[:, 0], b[:, 0] = torch.where(red_first, lo, hi), torch.where(red_first, hi, lo)
    return r, b

def batch(n, shortcut, red_first=None):
    red_first = torch.rand(n) < 0.5 if red_first is None else red_first
    (rs, bs), (rq, bq) = scene(n, shortcut, red_first), scene(n, shortcut, red_first)
    f = red_first[:, None].float()
    key = lambda pos, col, k: torch.cat([pos, col, torch.eye(2)[k].expand(n, 2)], 1)  # keyframe
    demo = torch.stack([key(f * rs + (1 - f) * bs, f * RED + (1 - f) * BLUE, 0),
                        key(f * bs + (1 - f) * rs, f * BLUE + (1 - f) * RED, 1)], 1)  # (n, L=2, 6)
    return demo, rq, bq, f * rq + (1 - f) * bq, f * bq + (1 - f) * rq, red_first

class Policy(nn.Module):  # Eq. 4 + Eq. 6: score demo elements against the query, read, decode
    def __init__(s):
        super().__init__(); s.k, s.v, s.q = nn.Linear(6, D), nn.Linear(6, D), nn.Linear(8, D)
        s.head = nn.Sequential(nn.Linear(2 * D, 64), nn.ReLU(), nn.Linear(64, 2))
    def forward(s, demo, rq, bq, pos, t):
        q = s.q(torch.cat([rq, bq, pos, torch.eye(2)[t].expand(len(rq), 2)], 1))
        alpha = torch.softmax((s.k(demo) @ q[:, :, None]).squeeze(-1) / D ** 0.5, 1)  # (n, L)
        return s.head(torch.cat([q, (alpha[:, :, None] * s.v(demo)).sum(1)], 1)), alpha

def rollout(m, demo, rq, bq):  # 2 decisions; a waypoint within 0.15 of a target reaches it
    pos, out = torch.full_like(rq, 0.5), []
    for t in range(2):
        wp, alpha = m(demo, rq, bq, pos, t)
        dr, db = (wp - rq).norm(dim=1), (wp - bq).norm(dim=1)
        red = dr < db; pos = torch.where(red[:, None], rq, bq)
        out.append((red, torch.minimum(dr, db) < 0.15, alpha))
    return out

for seed in range(3):
    for name, shortcut in [("shortcut ", True), ("ambiguous", False)]:
        torch.manual_seed(seed); m = Policy(); opt = torch.optim.Adam(m.parameters(), 3e-3)
        for it in range(1500):  # Eq. 21 with an MSE action loss on both query decisions
            demo, rq, bq, first, second, _ = batch(256, shortcut)
            loss = ((m(demo, rq, bq, torch.full_like(rq, 0.5), 0)[0] - first) ** 2).sum(1).mean() \
                 + ((m(demo, rq, bq, first, 1)[0] - second) ** 2).sum(1).mean()
            opt.zero_grad(); loss.backward(); opt.step()
        with torch.no_grad():  # test on scenes where the left-first cue is NOT informative
            n = 4000; rf = torch.rand(n) < 0.5
            demo, rq, bq, *_ = batch(n, False, rf)
            (r1, ok1, a1), (r2, ok2, a2) = rollout(m, demo, rq, bq)
            both = (ok1 & ok2 & (r1 != r2)).float().mean()
            follow = (r1 == rf) & ok1
            clash = (rq[:, 0] < bq[:, 0]) != rf          # scene cue and demo disagree
            same = rollout(m, batch(n, False, rf)[0], rq, bq)[0][0]   # new demo, same order
            flip = rollout(m, batch(n, False, ~rf)[0], rq, bq)[0][0]  # new demo, opposite order
            zero = rollout(m, torch.zeros_like(demo), rq, bq)[0][1]   # zero-filled "no demo"
            print(f"seed {seed} {name} | both reached {both:.2f} | follows demo: cue agrees "
                  f"{follow[~clash].float().mean():.2f}, cue clashes {follow[clash].float().mean():.2f} "
                  f"| same-order demo keeps move {(same == r1).float().mean():.2f} | flipped demo "
                  f"flips move {(flip != r1).float().mean():.2f} | zero demo hits a target "
                  f"{zero.float().mean():.2f}")
            q = m.q(torch.cat([rq, bq, torch.full_like(rq, 0.5), torch.eye(2)[0].expand(n, 2)], 1))
            wp = m.head(torch.cat([q, m.v(demo).mean(1)], 1))   # same read, attention forced to 0.5
            uni = ((wp - rq).norm(dim=1) < (wp - bq).norm(dim=1)) == rf
            print(f"   attention: mean |alpha - 0.5| = {(a1[:, 0] - 0.5).abs().mean():.3f}; "
                  f"forced to exactly 0.5, the first move follows the demo {uni.float().mean():.2f}")
